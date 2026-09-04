-- =============================================================================
-- GROUP MOBIL — Carteira: saldo real, depósitos com comprovativo, envio para grupos
-- Cole este script no SQL Editor do Supabase e execute por último (depois de
-- 1-supabase-payment-methods.sql e 2-supabase-groups-system.sql).
-- =============================================================================

-- 1) TIPOS ---------------------------------------------------------------------

create type public.wallet_transaction_type as enum (
  'deposito',
  'levantamento',
  'contribuicao_grupo',
  'recebimento_grupo'
);

create type public.wallet_transaction_status as enum ('pendente', 'confirmado', 'rejeitado');

-- 2) MOVIMENTOS DA CARTEIRA ------------------------------------------------------
-- O saldo NUNCA é um número guardado à parte — é sempre a soma dos movimentos
-- confirmados. Isso torna impossível o saldo "descolar" do histórico real.

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.wallet_transaction_type not null,
  amount numeric(12,2) not null, -- positivo = entra (depósito, recebimento); negativo = sai (levantamento, contribuição)
  status public.wallet_transaction_status not null default 'pendente',
  method public.payment_method_key,
  proof_url text,
  group_id uuid references public.groups(id),
  contribution_id uuid references public.contributions(id),
  note text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

comment on table public.wallet_transactions is
  'Todo o dinheiro que entra ou sai da carteira. Depósitos e levantamentos ficam "pendente" até a equipa Group Mobil confirmar o comprovativo; contribuições para grupos são confirmadas na hora, por já saírem de saldo já confirmado.';

create or replace function public.get_wallet_balance(p_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.wallet_transactions
  where user_id = p_user_id and status = 'confirmado';
$$;

-- 3) PEDIR UM DEPÓSITO (com comprovativo) -------------------------------------
--    Fica "pendente" até a equipa confirmar depois de ver o comprovativo.

create or replace function public.request_deposit(
  p_amount numeric,
  p_method public.payment_method_key,
  p_proof_url text
) returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tx public.wallet_transactions;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária.';
  end if;
  if p_amount <= 0 then
    raise exception 'O valor do depósito tem de ser maior que zero.';
  end if;
  if p_proof_url is null or p_proof_url = '' then
    raise exception 'É necessário anexar o comprovativo do depósito.';
  end if;

  insert into public.wallet_transactions (user_id, type, amount, method, proof_url, status)
  values (v_user_id, 'deposito', p_amount, p_method, p_proof_url, 'pendente')
  returning * into v_tx;

  return v_tx;
end;
$$;

-- 4) ENVIAR CONTRIBUIÇÃO DA CARTEIRA PARA UM GRUPO -----------------------------
--    Debita da carteira (que já tem de ter saldo confirmado) e confirma a
--    contribuição na hora — o dinheiro já estava validado no depósito.

create or replace function public.contribute_from_wallet(p_contribution_id uuid)
returns public.contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_contribution public.contributions;
  v_owner uuid;
  v_balance numeric;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária.';
  end if;

  select c.*, gp.user_id into v_contribution, v_owner
  from public.contributions c
  join public.group_participants gp on gp.id = c.participant_id
  where c.id = p_contribution_id
  for update of c;

  if v_owner is null or v_owner <> v_user_id then
    raise exception 'Não autorizado.';
  end if;

  if v_contribution.status = 'confirmada' then
    raise exception 'Esta contribuição já está paga.';
  end if;

  v_balance := public.get_wallet_balance(v_user_id);
  if v_balance < v_contribution.amount then
    raise exception 'Saldo insuficiente na carteira. Saldo atual: % Kz.', v_balance;
  end if;

  insert into public.wallet_transactions
    (user_id, type, amount, status, group_id, contribution_id, confirmed_at)
  values
    (v_user_id, 'contribuicao_grupo', -v_contribution.amount, 'confirmado',
     v_contribution.group_id, p_contribution_id, now());

  update public.contributions
  set status = 'confirmada', paid_at = now()
  where id = p_contribution_id
  returning * into v_contribution;

  update public.group_rounds r
  set confirmed_amount = confirmed_amount + v_contribution.amount
  where r.group_id = v_contribution.group_id and r.round_number = v_contribution.round_number;

  return v_contribution;
end;
$$;

-- 5) SEGURANÇA (RLS) -----------------------------------------------------------

alter table public.wallet_transactions enable row level security;

create policy "Cada utilizador vê os seus próprios movimentos" on public.wallet_transactions
  for select using (auth.uid() = user_id);

-- Ninguém escreve diretamente: depositar é só via request_deposit(), enviar
-- para um grupo é só via contribute_from_wallet(). Confirmar/rejeitar um
-- depósito ou levantamento é feito pela equipa a partir do SQL Editor
-- (service role), depois de ver o comprovativo:
--
--   update public.wallet_transactions
--   set status = 'confirmado', confirmed_at = now()
--   where id = '<id-do-movimento>';

revoke execute on function public.request_deposit from anon;
revoke execute on function public.contribute_from_wallet from anon;

-- 6) FICHEIROS DE COMPROVATIVO (Supabase Storage) -----------------------------
--    Cada utilizador só acede aos seus próprios comprovativos. Aceita
--    imagens (foto) ou PDF.

insert into storage.buckets (id, name, public)
values ('comprovativos', 'comprovativos', false)
on conflict (id) do nothing;

create policy "Enviar o próprio comprovativo" on storage.objects
  for insert
  with check (bucket_id = 'comprovativos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Ver o próprio comprovativo" on storage.objects
  for select
  using (bucket_id = 'comprovativos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- Fim do script. Fluxo completo:
-- 1. Utilizador deposita → anexa comprovativo → fica "pendente".
-- 2. Equipa confirma manualmente no SQL Editor (comando acima).
-- 3. Saldo da carteira sobe automaticamente (é a soma dos confirmados).
-- 4. Utilizador entra num grupo e "envia" a contribuição da carteira —
--    confirmado na hora, porque o saldo já tinha sido validado no depósito.
-- =============================================================================
