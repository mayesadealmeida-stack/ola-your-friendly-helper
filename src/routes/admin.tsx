-- Rotação justa de tarefas: enquanto o utilizador ainda tiver tarefas
-- ativas por experimentar, não pode repetir uma que já fez antes (mesmo
-- em ciclos anteriores). Só volta a permitir repetição depois de já ter
-- passado por todas as tarefas ativas pelo menos uma vez.

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
  v_used_before boolean;
  v_has_untried boolean;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  select *
  into v_product
  from public.task_products
  where id = p_product_id
    and is_active = true;

  if not found then
    raise exception 'Esta tarefa já não está disponível.';
  end if;

  select *
  into v_cycle
  from public.task_cycles
  where user_id = v_user_id
    and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if not found then
    if exists (
      select 1
      from public.task_cycles
      where user_id = v_user_id
        and status = 'completed'
    ) then
      raise exception 'Conclua o resgate do ciclo atual antes de iniciar outro.';
    end if;

    insert into public.task_cycles (user_id)
    values (v_user_id)
    returning * into v_cycle;
  end if;

  -- Nunca repete a mesma tarefa dentro do ciclo atual.
  if exists (
    select 1
    from public.task_orders
    where cycle_id = v_cycle.id
      and product_id = p_product_id
  ) then
    raise exception 'Esta tarefa já foi concluída neste ciclo.';
  end if;

  -- Rotação justa entre ciclos: se este utilizador já fez esta tarefa
  -- antes e ainda existem outras tarefas ativas por experimentar,
  -- obriga a escolher uma diferente.
  v_used_before := exists (
    select 1
    from public.task_orders
    where user_id = v_user_id
      and product_id = p_product_id
  );

  if v_used_before then
    v_has_untried := exists (
      select 1
      from public.task_products tp
      where tp.is_active = true
        and tp.id <> p_product_id
        and not exists (
          select 1
          from public.task_orders too
          where too.user_id = v_user_id
            and too.product_id = tp.id
        )
    );

    if v_has_untried then
      raise exception 'Já concluiu esta tarefa antes. Escolha outra tarefa disponível.';
    end if;
  end if;

  v_balance := public.get_wallet_balance(v_user_id);

  if v_product.price > v_balance then
    raise exception 'Saldo insuficiente. Deposite Kz % para continuar.',
      v_product.price - v_balance;
  end if;

  v_round := v_cycle.current_round + 1;
  v_reward := round(v_product.price * 0.15, 2);

  insert into public.wallet_transactions (
    user_id,
    type,
    amount,
    status,
    note,
    confirmed_at
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
    cycle_id,
    user_id,
    product_id,
    round_number,
    price,
    reward
  )
  values (
    v_cycle.id,
    v_user_id,
    v_product.id,
    v_round,
    v_product.price,
    v_reward
  );

  update public.task_cycles
  set current_round = v_round,
      locked_amount = locked_amount + v_product.price,
      reward_amount = reward_amount + v_reward,
      status = case
        when v_round = rounds_required then 'completed'
        else 'active'
      end,
      completed_at = case
        when v_round = rounds_required then now()
        else null
      end
  where id = v_cycle.id
  returning * into v_cycle;

  return v_cycle;
end;
$$;
