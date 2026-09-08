alter table public.profiles add column if not exists avatar_url text;

do $$ begin
  create type public.kyc_status as enum ('pending','verified','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.kyc_basic (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  country text not null,
  birth_date date not null,
  city text not null,
  address text not null,
  address_reference text not null default '',
  status public.kyc_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.kyc_basic to authenticated;
grant all on public.kyc_basic to service_role;

alter table public.kyc_basic enable row level security;

do $$ begin
  create policy "Ver o proprio KYC" on public.kyc_basic
    for select to authenticated using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Enviar o proprio KYC" on public.kyc_basic
    for insert to authenticated with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Atualizar o proprio KYC" on public.kyc_basic
    for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Ver o proprio avatar" on storage.objects
    for select to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Enviar o proprio avatar" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Atualizar o proprio avatar" on storage.objects
    for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;