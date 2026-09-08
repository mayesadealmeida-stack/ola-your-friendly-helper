-- Migration completa de planos e investimentos.
-- Executar depois das migrations base da aplicação:
-- profiles, wallet_transactions, user_roles e storage.

-- 1. Planos de investimento
create table if not exists public.investment_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text,
  entry_price numeric(14,2) not null check (entry_price > 0),
  estimated_return numeric(14,2) not null check (estimated_return >= 0),
  duration_value integer not null default 3,
  duration_unit text not null default 'meses'
    check (duration_unit in ('dias', 'meses', 'anos')),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Compatibilidade caso a tabela já exista sem as colunas de duração.
alter table public.investment_plans
  add column if not exists duration_value integer;

alter table public.investment_plans
  add column if not exists duration_unit text;

update public.investment_plans
set duration_value = coalesce(duration_value, 3),
    duration_unit = coalesce(duration_unit, 'meses');

alter table public.investment_plans
  alter column duration_value set default 3,
  alter column duration_value set not null,
  alter column duration_unit set default 'meses',
  alter column duration_unit set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'investment_plans_duration_value_check'
      and conrelid = 'public.investment_plans'::regclass
  ) then
    alter table public.investment_plans
      add constraint investment_plans_duration_value_check
      check (duration_value > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'investment_plans_duration_unit_check'
      and conrelid = 'public.investment_plans'::regclass
  ) then
    alter table public.investment_plans
      add constraint investment_plans_duration_unit_check
      check (duration_unit in ('dias', 'meses', 'anos'));
  end if;
end
$$;

grant select on public.investment_plans to anon, authenticated;
grant insert, update, delete on public.investment_plans to authenticated;
grant all on public.investment_plans to service_role;

alter table public.investment_plans enable row level security;

drop policy if exists "Ver planos publicados" on public.investment_plans;
create policy "Ver planos publicados"
on public.investment_plans
for select
to anon, authenticated
using (is_active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins criam planos" on public.investment_plans;
create policy "Admins criam planos"
on public.investment_plans
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin') and created_by = auth.uid());

drop policy if exists "Admins atualizam planos" on public.investment_plans;
create policy "Admins atualizam planos"
on public.investment_plans
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins removem planos" on public.investment_plans;
create policy "Admins removem planos"
on public.investment_plans
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- 2. Bucket das imagens dos planos
insert into storage.buckets (id, name, public)
values ('planos', 'planos', true)
on conflict (id) do update set public = true;

drop policy if exists "Qualquer pessoa vê imagens de planos" on storage.objects;
create policy "Qualquer pessoa vê imagens de planos"
on storage.objects
for select
to public
using (bucket_id = 'planos');

drop policy if exists "Admins enviam imagens de planos" on storage.objects;
create policy "Admins enviam imagens de planos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'planos' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins atualizam imagens de planos" on storage.objects;
create policy "Admins atualizam imagens de planos"
on storage.objects
for update
to authenticated
using (bucket_id = 'planos' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'planos' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins removem imagens de planos" on storage.objects;
create policy "Admins removem imagens de planos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'planos' and public.has_role(auth.uid(), 'admin'));

-- 3. Investimentos dos utilizadores
create table if not exists public.user_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.investment_plans(id) on delete restrict,
  entry_amount numeric(14,2) not null check (entry_amount > 0),
  expected_amount numeric(14,2) not null check (expected_amount >= 0),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'redeemed')),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_investments_user_idx
  on public.user_investments(user_id, created_at desc);

grant select on public.user_investments to authenticated;
grant all on public.user_investments to service_role;

alter table public.user_investments enable row level security;

drop policy if exists "Utilizadores veem os proprios investimentos"
on public.user_investments;

create policy "Utilizadores veem os proprios investimentos"
on public.user_investments
for select
to authenticated
using (auth.uid() = user_id);

-- 4. Criar um investimento
create or replace function public.create_investment(p_plan_id uuid)
returns public.user_investments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.investment_plans;
  v_balance numeric;
  v_ends_at timestamptz;
  v_investment public.user_investments;
begin
  if v_user_id is null then
    raise exception 'Sessão expirada. Entre novamente.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  select *
  into v_plan
  from public.investment_plans
  where id = p_plan_id
    and is_active = true
  for share;

  if not found then
    raise exception 'Este plano já não está disponível.';
  end if;

  select coalesce(sum(amount), 0)
  into v_balance
  from public.wallet_transactions
  where user_id = v_user_id
    and status = 'confirmado';

  if v_balance < v_plan.entry_price then
    raise exception 'Saldo insuficiente. Recarregue a carteira para investir.';
  end if;

  v_ends_at := case v_plan.duration_unit
    when 'dias' then now() + make_interval(days => v_plan.duration_value)
    when 'anos' then now() + make_interval(years => v_plan.duration_value)
    else now() + make_interval(months => v_plan.duration_value)
  end;

  insert into public.wallet_transactions (
    user_id, amount, type, status, note
  )
  values (
    v_user_id,
    -v_plan.entry_price,
    'contribuicao_grupo',
    'confirmado',
    'Investimento: ' || v_plan.name
  );

  insert into public.user_investments (
    user_id, plan_id, entry_amount, expected_amount, ends_at
  )
  values (
    v_user_id,
    v_plan.id,
    v_plan.entry_price,
    v_plan.estimated_return,
    v_ends_at
  )
  returning * into v_investment;

  return v_investment;
end;
$$;

-- 5. Resgatar um investimento terminado
create or replace function public.redeem_investment(p_investment_id uuid)
returns public.user_investments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_investment public.user_investments;
  v_plan_name text;
begin
  if v_user_id is null then
    raise exception 'Sessão expirada. Entre novamente.';
  end if;

  select *
  into v_investment
  from public.user_investments
  where id = p_investment_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Investimento não encontrado.';
  end if;

  if v_investment.status <> 'active' then
    raise exception 'Este investimento já foi resgatado.';
  end if;

  if now() < v_investment.ends_at then
    raise exception 'O prazo deste investimento ainda não terminou.';
  end if;

  select name
  into v_plan_name
  from public.investment_plans
  where id = v_investment.plan_id;

  insert into public.wallet_transactions (
    user_id, amount, type, status, note, confirmed_at
  )
  values (
    v_user_id,
    v_investment.expected_amount,
    'recebimento_grupo',
    'confirmado',
    'Resgate do investimento: ' || coalesce(v_plan_name, 'Plano'),
    now()
  );

  update public.user_investments
  set status = 'redeemed',
      redeemed_at = now()
  where id = v_investment.id
  returning * into v_investment;

  return v_investment;
end;
$$;

revoke all on function public.create_investment(uuid) from public, anon;
revoke all on function public.redeem_investment(uuid) from public, anon;
grant execute on function public.create_investment(uuid) to authenticated;
grant execute on function public.redeem_investment(uuid) to authenticated;