-- =============================================================================
-- GROUP MOBIL — Acesso administrativo aos relatórios de tarefas
-- Execute se a migration tasks-system.sql já tiver sido executada anteriormente.
-- =============================================================================

drop policy if exists "Admins veem todos os ciclos de tarefas"
on public.task_cycles;

create policy "Admins veem todos os ciclos de tarefas"
on public.task_cycles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins veem todas as compras de tarefas"
on public.task_orders;

create policy "Admins veem todas as compras de tarefas"
on public.task_orders
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));