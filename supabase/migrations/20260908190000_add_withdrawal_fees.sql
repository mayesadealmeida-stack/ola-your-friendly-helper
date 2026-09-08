-- Taxa de saque configurável pelo administrador.

create table if not exists public.withdrawal_fee_settings (
  id boolean primary key default true check (id = true),
  fee_percent numeric(5,2) not null default 0 check (fee_percent >= 0 and fee_percent <= 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.withdrawal_fee_settings (id, fee_percent)
values (true, 0)
on conflict (id) do nothing;

alter table public.wallet_transactions
  add column if not exists requested_amount numeric(12,2),
  add column if not exists fee_amount numeric(12,2) not null default 0,
  add column if not exists fee_percent numeric(5,2) not null default 0;

update public.wallet_transactions
set requested_amount = abs(amount)
where type = 'levantamento' and requested_amount is null;

grant select on public.withdrawal_fee_settings to authenticated;
alter table public.withdrawal_fee_settings enable row level security;

drop policy if exists "Admins podem consultar a taxa de saque" on public.withdrawal_fee_settings;
create policy "Admins podem consultar a taxa de saque"
on public.withdrawal_fee_settings
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- A aplicação lê a taxa atual para mostrar uma simulação antes do pedido.
create or replace function public.get_withdrawal_fee_settings()
returns table (fee_percent numeric, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.fee_percent, s.updated_at
  from public.withdrawal_fee_settings s
  where s.id = true;
$$;

-- Só um administrador pode alterar a taxa.
create or replace function public.admin_update_withdrawal_fee(p_fee_percent numeric)
returns table (fee_percent numeric, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Não autorizado.';
  end if;

  if p_fee_percent is null or p_fee_percent < 0 or p_fee_percent > 100 then
    raise exception 'A taxa deve estar entre 0% e 100%.';
  end if;

  update public.withdrawal_fee_settings
  set fee_percent = round(p_fee_percent, 2),
      updated_at = now(),
      updated_by = auth.uid()
  where id = true;

  return query
    select s.fee_percent, s.updated_at
    from public.withdrawal_fee_settings s
    where s.id = true;
end;
$$;

-- Faturamento acumulado exclusivamente pelas taxas de saque.
create or replace function public.admin_withdrawal_fee_summary()
returns table (
  total_taxas_confirmadas numeric,
  total_taxas_pendentes numeric,
  total_taxas_geral numeric,
  total_saques_confirmados bigint,
  valor_saques_confirmados numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(coalesce(fee_amount, 0))
      from public.wallet_transactions
      where type = 'levantamento' and status = 'confirmado'
    ), 0),
    coalesce((
      select sum(coalesce(fee_amount, 0))
      from public.wallet_transactions
      where type = 'levantamento' and status = 'pendente'
    ), 0),
    coalesce((
      select sum(coalesce(fee_amount, 0))
      from public.wallet_transactions
      where type = 'levantamento' and status in ('confirmado', 'pendente')
    ), 0),
    (
      select count(*)
      from public.wallet_transactions
      where type = 'levantamento' and status = 'confirmado'
    ),
    coalesce((
      select sum(coalesce(requested_amount, abs(amount)))
      from public.wallet_transactions
      where type = 'levantamento' and status = 'confirmado'
    ), 0)
  where public.has_role(auth.uid(), 'admin');
$$;

-- A taxa fica guardada no próprio movimento para manter o histórico correto
-- mesmo que o administrador altere a percentagem mais tarde.
create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method public.payment_method_key,
  p_note text default ''
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tx public.wallet_transactions;
  v_balance numeric;
  v_pending numeric;
  v_fee_percent numeric := 0;
  v_fee_amount numeric := 0;
  v_total_debit numeric;
begin
  if v_user_id is null then raise exception 'Autenticação necessária.'; end if;
  if p_amount <= 0 then raise exception 'O valor do levantamento tem de ser maior que zero.'; end if;

  select coalesce(fee_percent, 0)
  into v_fee_percent
  from public.withdrawal_fee_settings
  where id = true;

  v_fee_amount := round(p_amount * v_fee_percent / 100, 2);
  v_total_debit := p_amount + v_fee_amount;
  v_balance := public.get_wallet_balance(v_user_id);

  select coalesce(sum(abs(amount)), 0)
  into v_pending
  from public.wallet_transactions
  where user_id = v_user_id and type = 'levantamento' and status = 'pendente';

  if (v_balance - v_pending) < v_total_debit then
    raise exception 'Saldo insuficiente para o valor e a taxa de saque. Disponível: % Kz.',
      (v_balance - v_pending);
  end if;

  insert into public.wallet_transactions (
    user_id, type, amount, requested_amount, fee_amount, fee_percent, method, note, status
  )
  values (
    v_user_id, 'levantamento', -v_total_debit, p_amount, v_fee_amount, v_fee_percent,
    p_method, coalesce(p_note, ''), 'pendente'
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

revoke execute on function public.get_withdrawal_fee_settings() from anon, public;
revoke execute on function public.admin_update_withdrawal_fee(numeric) from anon, public;
revoke execute on function public.admin_withdrawal_fee_summary() from anon, public;
revoke execute on function public.request_withdrawal(numeric, public.payment_method_key, text) from anon, public;

grant execute on function public.get_withdrawal_fee_settings() to authenticated;
grant execute on function public.admin_update_withdrawal_fee(numeric) to authenticated;
grant execute on function public.admin_withdrawal_fee_summary() to authenticated;
grant execute on function public.request_withdrawal(numeric, public.payment_method_key, text) to authenticated;