-- Tipos da carteira
do $$ begin
  create type public.wallet_transaction_type as enum ('deposito','levantamento','contribuicao_grupo','recebimento_grupo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wallet_transaction_status as enum ('pendente','confirmado','rejeitado');
exception when duplicate_object then null; end $$;

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.wallet_transaction_type not null,
  amount numeric(12,2) not null,
  status public.wallet_transaction_status not null default 'pendente',
  method public.payment_method_key,
  proof_url text,
  group_id uuid references public.groups(id),
  contribution_id uuid references public.contributions(id),
  note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists wallet_transactions_user_idx on public.wallet_transactions(user_id, created_at desc);
create index if not exists wallet_transactions_status_idx on public.wallet_transactions(status, created_at desc);

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

alter table public.wallet_transactions enable row level security;

drop policy if exists "Cada utilizador ve os seus proprios movimentos" on public.wallet_transactions;
create policy "Cada utilizador ve os seus proprios movimentos" on public.wallet_transactions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Admins veem todos os movimentos" on public.wallet_transactions;
create policy "Admins veem todos os movimentos" on public.wallet_transactions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Admins veem os dados necessarios para o painel
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins veem todas as contribuicoes" on public.contributions;
create policy "Admins veem todas as contribuicoes" on public.contributions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Saldo
create or replace function public.get_wallet_balance(p_user_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from public.wallet_transactions
  where user_id = p_user_id and status = 'confirmado';
$$;

-- Pedido de deposito
create or replace function public.request_deposit(p_amount numeric, p_method public.payment_method_key, p_proof_url text)
returns public.wallet_transactions language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_tx public.wallet_transactions;
begin
  if v_user_id is null then raise exception 'Autenticação necessária.'; end if;
  if p_amount <= 0 then raise exception 'O valor do depósito tem de ser maior que zero.'; end if;
  if p_proof_url is null or p_proof_url = '' then raise exception 'É necessário anexar o comprovativo do depósito.'; end if;
  insert into public.wallet_transactions (user_id, type, amount, method, proof_url, status)
  values (v_user_id, 'deposito', p_amount, p_method, p_proof_url, 'pendente')
  returning * into v_tx;
  return v_tx;
end; $$;

-- Pedido de saque
create or replace function public.request_withdrawal(p_amount numeric, p_method public.payment_method_key, p_note text default '')
returns public.wallet_transactions language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_tx public.wallet_transactions; v_balance numeric; v_pending numeric;
begin
  if v_user_id is null then raise exception 'Autenticação necessária.'; end if;
  if p_amount <= 0 then raise exception 'O valor do levantamento tem de ser maior que zero.'; end if;
  v_balance := public.get_wallet_balance(v_user_id);
  select coalesce(sum(abs(amount)),0) into v_pending from public.wallet_transactions
    where user_id = v_user_id and type = 'levantamento' and status = 'pendente';
  if (v_balance - v_pending) < p_amount then
    raise exception 'Saldo insuficiente. Disponível: % Kz.', (v_balance - v_pending);
  end if;
  insert into public.wallet_transactions (user_id, type, amount, method, note, status)
  values (v_user_id, 'levantamento', -p_amount, p_method, coalesce(p_note,''), 'pendente')
  returning * into v_tx;
  return v_tx;
end; $$;

-- Contribuir para um grupo usando saldo
create or replace function public.contribute_from_wallet(p_contribution_id uuid)
returns public.contributions language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_contribution public.contributions; v_owner uuid; v_balance numeric;
begin
  if v_user_id is null then raise exception 'Autenticação necessária.'; end if;
  select gp.user_id into v_owner from public.contributions c
    join public.group_participants gp on gp.id = c.participant_id where c.id = p_contribution_id;
  if v_owner is null or v_owner <> v_user_id then raise exception 'Não autorizado.'; end if;
  select * into v_contribution from public.contributions where id = p_contribution_id for update;
  if v_contribution.status = 'confirmada' then raise exception 'Esta contribuição já está paga.'; end if;
  v_balance := public.get_wallet_balance(v_user_id);
  if v_balance < v_contribution.amount then raise exception 'Saldo insuficiente na carteira.'; end if;
  insert into public.wallet_transactions (user_id, type, amount, status, group_id, contribution_id, confirmed_at)
  values (v_user_id, 'contribuicao_grupo', -v_contribution.amount, 'confirmado', v_contribution.group_id, p_contribution_id, now());
  update public.contributions set status = 'confirmada', paid_at = now() where id = p_contribution_id returning * into v_contribution;
  update public.group_rounds r set confirmed_amount = confirmed_amount + v_contribution.amount
    where r.group_id = v_contribution.group_id and r.round_number = v_contribution.round_number;
  return v_contribution;
end; $$;

-- Administracao: confirmar / rejeitar
create or replace function public.admin_review_transaction(p_transaction_id uuid, p_approve boolean, p_reason text default '')
returns public.wallet_transactions language plpgsql security definer set search_path = public as $$
declare v_tx public.wallet_transactions;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Não autorizado.'; end if;
  select * into v_tx from public.wallet_transactions where id = p_transaction_id for update;
  if v_tx.id is null then raise exception 'Movimento não encontrado.'; end if;
  if v_tx.status <> 'pendente' then raise exception 'Este movimento já foi revisto.'; end if;
  update public.wallet_transactions
  set status = case when p_approve then 'confirmado'::public.wallet_transaction_status else 'rejeitado'::public.wallet_transaction_status end,
      confirmed_at = case when p_approve then now() else null end,
      reviewed_by = auth.uid(), reviewed_at = now(), review_reason = coalesce(p_reason,'')
  where id = p_transaction_id returning * into v_tx;

  insert into public.notifications (user_id, kind, title, body)
  values (v_tx.user_id, 'wallet',
    case when p_approve then 'Movimento confirmado' else 'Movimento rejeitado' end,
    case when p_approve then 'O seu pedido de ' || v_tx.type::text || ' foi confirmado.'
         else 'O seu pedido de ' || v_tx.type::text || ' foi rejeitado. ' || coalesce(p_reason,'') end);
  return v_tx;
end; $$;

-- Resumo financeiro para administracao
create or replace function public.admin_finance_summary()
returns table (
  total_entradas numeric, total_saidas numeric, saldo_plataforma numeric,
  depositos_pendentes numeric, saques_pendentes numeric,
  n_depositos_pendentes bigint, n_saques_pendentes bigint,
  n_utilizadores bigint, total_contribuicoes_pagas numeric, n_contribuicoes_pendentes bigint
) language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(amount) from public.wallet_transactions where status='confirmado' and amount > 0),0),
    coalesce((select -sum(amount) from public.wallet_transactions where status='confirmado' and amount < 0),0),
    coalesce((select sum(amount) from public.wallet_transactions where status='confirmado'),0),
    coalesce((select sum(amount) from public.wallet_transactions where status='pendente' and type='deposito'),0),
    coalesce((select -sum(amount) from public.wallet_transactions where status='pendente' and type='levantamento'),0),
    (select count(*) from public.wallet_transactions where status='pendente' and type='deposito'),
    (select count(*) from public.wallet_transactions where status='pendente' and type='levantamento'),
    (select count(*) from public.profiles),
    coalesce((select sum(amount) from public.contributions where status='confirmada'),0),
    (select count(*) from public.contributions where status <> 'confirmada')
  where public.has_role(auth.uid(), 'admin');
$$;

revoke execute on function public.request_deposit(numeric, public.payment_method_key, text) from anon;
revoke execute on function public.request_withdrawal(numeric, public.payment_method_key, text) from anon;
revoke execute on function public.contribute_from_wallet(uuid) from anon;
revoke execute on function public.admin_review_transaction(uuid, boolean, text) from anon;
revoke execute on function public.admin_finance_summary() from anon;