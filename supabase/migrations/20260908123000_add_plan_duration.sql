alter table public.investment_plans
  add column if not exists duration_value integer not null default 3,
  add column if not exists duration_unit text not null default 'meses';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'investment_plans_duration_value_check'
  ) then
    alter table public.investment_plans
      add constraint investment_plans_duration_value_check check (duration_value > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'investment_plans_duration_unit_check'
  ) then
    alter table public.investment_plans
      add constraint investment_plans_duration_unit_check
      check (duration_unit in ('dias', 'meses', 'anos'));
  end if;
end $$;