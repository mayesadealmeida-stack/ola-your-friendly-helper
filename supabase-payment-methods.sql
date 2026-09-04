-- =============================================================================
-- GROUP MOBIL — Métodos de pagamento da Carteira
-- Cole este script no SQL Editor do Supabase e execute ANTES do
-- supabase-groups-system.sql (as contribuições referenciam este tipo).
-- =============================================================================

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null check (method in ('unitel_money', 'paypay_africa', 'bank_transfer')),
  phone text not null default '',
  bank_name text not null default '',
  account_holder text not null default '',
  account_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, method)
);

alter table public.payment_methods enable row level security;

create policy "Cada utilizador vê os seus próprios métodos" on public.payment_methods
  for select using (auth.uid() = user_id);

create policy "Cada utilizador gere os seus próprios métodos" on public.payment_methods
  for insert with check (auth.uid() = user_id);

create policy "Cada utilizador atualiza os seus próprios métodos" on public.payment_methods
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Cada utilizador remove os seus próprios métodos" on public.payment_methods
  for delete using (auth.uid() = user_id);
