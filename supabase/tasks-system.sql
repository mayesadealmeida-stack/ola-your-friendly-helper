-- =============================================================================
-- GROUP MOBIL — Tarefas de venda
-- Cada rodada compra uma tarefa de produto, debita a carteira e bloqueia
-- o valor da compra + 9% até três rodadas serem concluídas.
-- =============================================================================

alter type public.wallet_transaction_type add value if not exists 'compra_tarefa';
alter type public.wallet_transaction_type add value if not exists 'resgate_tarefa';

create table if not exists public.task_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default 'Outros',
  price numeric(12,2) not null check (price >= 50 and price <= 5000),
  image_url text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_round smallint not null default 0 check (current_round between 0 and 3),
  rounds_required smallint not null default 3 check (rounds_required = 3),
  locked_amount numeric(12,2) not null default 0 check (locked_amount >= 0),
  reward_amount numeric(12,2) not null default 0 check (reward_amount >= 0),
  status text not null default 'active'
    check (status in ('active', 'completed', 'redeemed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  redeemed_at timestamptz
);

create unique index if not exists task_cycles_one_open_per_user
  on public.task_cycles (user_id)
  where status in ('active', 'completed');

create table if not exists public.task_orders (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.task_cycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.task_products(id) on delete restrict,
  round_number smallint not null check (round_number between 1 and 3),
  price numeric(12,2) not null check (price > 0),
  reward numeric(12,2) not null check (reward >= 0),
  created_at timestamptz not null default now(),
  unique (cycle_id, round_number)
);

alter table public.task_products enable row level security;
alter table public.task_cycles enable row level security;
alter table public.task_orders enable row level security;

drop policy if exists "Utilizadores veem tarefas ativas" on public.task_products;
create policy "Utilizadores veem tarefas ativas"
on public.task_products for select
to authenticated
using (is_active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins criam tarefas" on public.task_products;
create policy "Admins criam tarefas"
on public.task_products for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin') and created_by = auth.uid());

drop policy if exists "Admins atualizam tarefas" on public.task_products;
create policy "Admins atualizam tarefas"
on public.task_products for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins removem tarefas" on public.task_products;
create policy "Admins removem tarefas"
on public.task_products for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Utilizador vê o seu ciclo de tarefas" on public.task_cycles;
create policy "Utilizador vê o seu ciclo de tarefas"
on public.task_cycles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins veem todos os ciclos de tarefas" on public.task_cycles;
create policy "Admins veem todos os ciclos de tarefas"
on public.task_cycles for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Utilizador vê as suas compras de tarefas" on public.task_orders;
create policy "Utilizador vê as suas compras de tarefas"
on public.task_orders for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins veem todas as compras de tarefas" on public.task_orders;
create policy "Admins veem todas as compras de tarefas"
on public.task_orders for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create or replace function public.start_task_round(p_product_id uuid)
returns public.task_cycles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_product public.task_products;
  v_cycle public.task_cycles;
  v_balance numeric;
  v_round smallint;
  v_reward numeric;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  select *
  into v_product
  from public.task_products
  where id = p_product_id and is_active = true;

  if not found then
    raise exception 'Esta tarefa já não está disponível.';
  end if;

  select *
  into v_cycle
  from public.task_cycles
  where user_id = v_user_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if not found then
    if exists (
      select 1
      from public.task_cycles
      where user_id = v_user_id and status = 'completed'
    ) then
      raise exception 'Conclua o resgate do ciclo atual antes de iniciar outro.';
    end if;

    insert into public.task_cycles (user_id)
    values (v_user_id)
    returning * into v_cycle;
  end if;

  v_balance := public.get_wallet_balance(v_user_id);
  if v_product.price > v_balance then
    raise exception 'Saldo insuficiente. Deposite Kz % para continuar.', v_product.price - v_balance;
  end if;

  v_round := v_cycle.current_round + 1;
  v_reward := round(v_product.price * 0.09, 2);

  insert into public.wallet_transactions (
    user_id, type, amount, status, note, confirmed_at
  )
  values (
    v_user_id,
    'compra_tarefa',
    -v_product.price,
    'confirmado',
    'Tarefa: ' || v_product.name || ' · Rodada ' || v_round || '/3',
    now()
  );

  insert into public.task_orders (
    cycle_id, user_id, product_id, round_number, price, reward
  )
  values (
    v_cycle.id, v_user_id, v_product.id, v_round, v_product.price, v_reward
  );

  update public.task_cycles
  set current_round = v_round,
      locked_amount = locked_amount + v_product.price,
      reward_amount = reward_amount + v_reward,
      status = case when v_round = rounds_required then 'completed' else 'active' end,
      completed_at = case when v_round = rounds_required then now() else null end
  where id = v_cycle.id
  returning * into v_cycle;

  return v_cycle;
end;
$$;

create or replace function public.redeem_task_cycle(p_cycle_id uuid)
returns public.task_cycles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cycle public.task_cycles;
  v_total numeric;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária.';
  end if;

  select *
  into v_cycle
  from public.task_cycles
  where id = p_cycle_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Ciclo de tarefas não encontrado.';
  end if;
  if v_cycle.status <> 'completed' then
    raise exception 'Complete as três rodadas antes de resgatar.';
  end if;

  v_total := v_cycle.locked_amount + v_cycle.reward_amount;

  insert into public.wallet_transactions (
    user_id, type, amount, status, note, confirmed_at
  )
  values (
    v_user_id,
    'resgate_tarefa',
    v_total,
    'confirmado',
    'Resgate de tarefas · 3 rodadas + 9%',
    now()
  );

  update public.task_cycles
  set status = 'redeemed', redeemed_at = now()
  where id = v_cycle.id
  returning * into v_cycle;

  return v_cycle;
end;
$$;

revoke all on function public.start_task_round(uuid) from public, anon;
revoke all on function public.redeem_task_cycle(uuid) from public, anon;
grant execute on function public.start_task_round(uuid) to authenticated;
grant execute on function public.redeem_task_cycle(uuid) to authenticated;

-- Tarefas iniciais. A equipa pode alterar ou desativar estes produtos no painel.
insert into public.task_products (name, description, category, price)
select seed.name, seed.description, seed.category, seed.price
from (
  values
    ('Auriculares Bluetooth', 'Ajude a plataforma a divulgar este produto eletrónico.', 'Eletrónicos', 50::numeric),
    ('Candeeiro LED', 'Produto para casa com procura frequente.', 'Casa', 100::numeric),
    ('Relógio inteligente', 'Uma tarefa de divulgação de tecnologia.', 'Eletrónicos', 250::numeric),
    ('Power bank', 'Ajude a vender este acessório móvel.', 'Acessórios', 500::numeric),
    ('Kit de acessórios', 'Tarefa especial com valor de mil kwanzas.', 'Acessórios', 1000::numeric)
) as seed(name, description, category, price)
where not exists (
  select 1 from public.task_products existing where existing.name = seed.name
);