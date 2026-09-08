-- Planos publicados pela equipa e apresentados no Mercado.
create table if not exists public.investment_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text,
  entry_price numeric(14,2) not null check (entry_price > 0),
  estimated_return numeric(14,2) not null check (estimated_return >= 0),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

grant select on public.investment_plans to anon, authenticated;
grant insert, update, delete on public.investment_plans to authenticated;
grant all on public.investment_plans to service_role;

alter table public.investment_plans enable row level security;

drop policy if exists "Ver planos publicados" on public.investment_plans;
create policy "Ver planos publicados" on public.investment_plans
  for select to anon, authenticated
  using (is_active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins criam planos" on public.investment_plans;
create policy "Admins criam planos" on public.investment_plans
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') and created_by = auth.uid());

drop policy if exists "Admins atualizam planos" on public.investment_plans;
create policy "Admins atualizam planos" on public.investment_plans
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins removem planos" on public.investment_plans;
create policy "Admins removem planos" on public.investment_plans
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

insert into storage.buckets (id, name, public)
values ('planos', 'planos', true)
on conflict (id) do update set public = true;

drop policy if exists "Qualquer pessoa vê imagens de planos" on storage.objects;
create policy "Qualquer pessoa vê imagens de planos" on storage.objects
  for select to public
  using (bucket_id = 'planos');

drop policy if exists "Admins enviam imagens de planos" on storage.objects;
create policy "Admins enviam imagens de planos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'planos' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins atualizam imagens de planos" on storage.objects;
create policy "Admins atualizam imagens de planos" on storage.objects
  for update to authenticated
  using (bucket_id = 'planos' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'planos' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins removem imagens de planos" on storage.objects;
create policy "Admins removem imagens de planos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'planos' and public.has_role(auth.uid(), 'admin'));