-- =============================================================================
-- GROUP MOBIL — Grupos (kixikila): grupos, participantes, rodadas, contribuições
-- Cole este script no SQL Editor do Supabase e execute uma vez.
--
-- Reaproveita o tipo public.compliance_level já criado pelo sistema de níveis.
-- Se ainda não tem a tabela payment_methods (métodos de pagamento da
-- Carteira), corra primeiro esse script — as contribuições referenciam o
-- mesmo tipo de método (unitel_money / paypay_africa / bank_transfer).
-- =============================================================================

-- 1) TIPOS -------------------------------------------------------------------

create type public.group_frequency as enum ('semanal', 'mensal');
create type public.group_status as enum ('aberto', 'completo', 'andamento', 'encerrado');
create type public.round_status as enum ('agendada', 'concluida');
create type public.contribution_status as enum ('pendente', 'confirmada', 'atrasada');
create type public.payment_method_key as enum ('unitel_money', 'paypay_africa', 'bank_transfer');

-- 2) GRUPOS --------------------------------------------------------------------
-- Criados manualmente pela equipa Group Mobil (SQL Editor), por agora.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status public.group_status not null default 'aberto',
  participants_max integer not null check (participants_max > 0),
  participants_current integer not null default 0,
  entry_fee numeric(12,2) not null default 0,
  contribution numeric(12,2) not null check (contribution > 0),
  frequency public.group_frequency not null,
  beneficiaries_per_round integer not null default 1 check (beneficiaries_per_round > 0),
  round_amount numeric(12,2) not null,
  min_level public.compliance_level not null default 'iniciante',
  fee_percent numeric(4,2) not null default 2.00,
  start_date date not null,
  created_at timestamptz not null default now()
);

comment on table public.groups is
  'Grupos de kixikila. participants_current é mantido automaticamente por trigger.';

-- 3) PARTICIPANTES -------------------------------------------------------------

create table public.group_participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null,
  quotas integer not null default 1,
  display_name text not null default 'Participante',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id),
  unique (group_id, position)
);

-- 4) RODADAS ---------------------------------------------------------------
-- Uma linha por rodada do grupo. Os beneficiários de cada rodada são as
-- posições [ (round_number-1)*beneficiaries_per_round + 1 .. round_number*beneficiaries_per_round ]
-- — calculados a partir de group_participants, nunca guardados em duplicado.

create table public.group_rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  round_number integer not null,
  scheduled_date date not null,
  status public.round_status not null default 'agendada',
  expected_amount numeric(12,2) not null,
  confirmed_amount numeric(12,2) not null default 0,
  unique (group_id, round_number)
);

-- 5) CONTRIBUIÇÕES -----------------------------------------------------------
-- Uma linha por participante, por rodada. Geradas automaticamente quando o
-- participante entra no grupo (função join_group, abaixo).

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  participant_id uuid not null references public.group_participants(id) on delete cascade,
  round_number integer not null,
  amount numeric(12,2) not null,
  due_date date not null,
  status public.contribution_status not null default 'pendente',
  payment_method public.payment_method_key,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (participant_id, round_number)
);

-- 6) MANTER participants_current e status ATUALIZADOS AUTOMATICAMENTE --------

create or replace function public.sync_group_participant_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid := coalesce(new.group_id, old.group_id);
  v_count integer;
  v_max integer;
begin
  select count(*) into v_count from public.group_participants where group_id = v_group_id;
  select participants_max into v_max from public.groups where id = v_group_id;

  update public.groups
  set participants_current = v_count,
      status = case when v_count >= v_max and status = 'aberto' then 'completo' else status end
  where id = v_group_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_sync_group_participant_count
  after insert or delete on public.group_participants
  for each row
  execute function public.sync_group_participant_count();

-- 7) ENTRAR NUM GRUPO — única forma de se tornar participante ----------------
--    Verifica nível mínimo, vagas e duplicidade; atribui posição e gera as
--    contribuições de todas as rodadas já existentes para esse participante.

create or replace function public.join_group(p_group_id uuid)
returns public.group_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups;
  v_user_level public.compliance_level;
  v_level_order text[] := array['iniciante','regular','confiavel','avancado','excelente'];
  v_next_position integer;
  v_display_name text;
  v_participant public.group_participants;
begin
  if v_user_id is null then
    raise exception 'Autenticação necessária.';
  end if;

  select * into v_group from public.groups where id = p_group_id for update;
  if not found then
    raise exception 'Grupo não encontrado.';
  end if;

  if v_group.status <> 'aberto' then
    raise exception 'Este grupo já não está aberto a novos participantes.';
  end if;

  if exists (select 1 from public.group_participants where group_id = p_group_id and user_id = v_user_id) then
    raise exception 'Já é participante deste grupo.';
  end if;

  select level into v_user_level from public.compliance_stats where user_id = v_user_id;
  v_user_level := coalesce(v_user_level, 'iniciante');

  if array_position(v_level_order, v_user_level::text) < array_position(v_level_order, v_group.min_level::text) then
    raise exception 'O seu nível (%) não atinge o nível mínimo exigido (%) para este grupo.', v_user_level, v_group.min_level;
  end if;

  v_next_position := v_group.participants_current + 1;
  if v_next_position > v_group.participants_max then
    raise exception 'Este grupo já está completo.';
  end if;

  select coalesce(nullif(full_name, ''), nullif(username, ''), 'Participante')
  into v_display_name
  from public.profiles
  where id = v_user_id;

  insert into public.group_participants (group_id, user_id, position, display_name)
  values (p_group_id, v_user_id, v_next_position, coalesce(v_display_name, 'Participante'))
  returning * into v_participant;

  insert into public.contributions (group_id, participant_id, round_number, amount, due_date)
  select p_group_id, v_participant.id, r.round_number, v_group.contribution, r.scheduled_date
  from public.group_rounds r
  where r.group_id = p_group_id;

  return v_participant;
end;
$$;

-- 8) GERAR O CALENDÁRIO DE RODADAS DE UM GRUPO --------------------------------
--    Chamar uma vez, manualmente, depois de criar cada grupo:
--    select public.generate_group_rounds('<id-do-grupo>');

create or replace function public.generate_group_rounds(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
  v_rounds integer;
  v_date date;
  i integer;
begin
  select * into v_group from public.groups where id = p_group_id;
  if not found then
    raise exception 'Grupo não encontrado.';
  end if;

  v_rounds := ceil(v_group.participants_max::numeric / v_group.beneficiaries_per_round);

  for i in 1..v_rounds loop
    v_date := case
      when v_group.frequency = 'semanal' then v_group.start_date + ((i - 1) * 7)
      else (v_group.start_date + ((i - 1) || ' months')::interval)::date
    end;

    insert into public.group_rounds (group_id, round_number, scheduled_date, expected_amount)
    values (p_group_id, i, v_date, v_group.round_amount)
    on conflict (group_id, round_number) do nothing;
  end loop;
end;
$$;

-- 9) MARCAR UMA CONTRIBUIÇÃO COMO PAGA (auto-declarado pelo participante) ----
--    Sem gateway de pagamento real ainda — o participante indica qual método
--    da Carteira usou. Fica registado para conferência da equipa.

create or replace function public.mark_contribution_paid(
  p_contribution_id uuid,
  p_payment_method public.payment_method_key
) returns public.contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_contribution public.contributions;
  v_owner uuid;
begin
  select gp.user_id into v_owner
  from public.contributions c
  join public.group_participants gp on gp.id = c.participant_id
  where c.id = p_contribution_id;

  if v_owner is null or v_owner <> v_user_id then
    raise exception 'Não autorizado.';
  end if;

  update public.contributions
  set status = 'confirmada',
      payment_method = p_payment_method,
      paid_at = now()
  where id = p_contribution_id
  returning * into v_contribution;

  update public.group_rounds r
  set confirmed_amount = confirmed_amount + v_contribution.amount
  where r.group_id = v_contribution.group_id and r.round_number = v_contribution.round_number;

  return v_contribution;
end;
$$;

-- 10) SEGURANÇA (RLS) ---------------------------------------------------------

alter table public.groups enable row level security;
alter table public.group_participants enable row level security;
alter table public.group_rounds enable row level security;
alter table public.contributions enable row level security;

create policy "Qualquer pessoa autenticada vê os grupos" on public.groups
  for select using (auth.role() = 'authenticated');

create policy "Qualquer pessoa autenticada vê participantes e posições" on public.group_participants
  for select using (auth.role() = 'authenticated');

create policy "Qualquer pessoa autenticada vê o calendário de rodadas" on public.group_rounds
  for select using (auth.role() = 'authenticated');

create policy "Cada participante só vê as suas próprias contribuições" on public.contributions
  for select using (
    auth.uid() = (select user_id from public.group_participants where id = participant_id)
  );

-- Ninguém escreve diretamente: entrar é só via join_group(), marcar
-- contribuição paga é só via mark_contribution_paid(), e criar grupos /
-- gerar calendário é só a equipa, através do SQL Editor (service role).
revoke execute on function public.join_group from anon;
revoke execute on function public.mark_contribution_paid from anon;
revoke execute on function public.generate_group_rounds from anon, authenticated;

-- =============================================================================
-- 11) EXEMPLO — como criar um novo grupo manualmente
-- =============================================================================
-- insert into public.groups
--   (code, name, participants_max, entry_fee, contribution, frequency,
--    beneficiaries_per_round, round_amount, min_level, fee_percent, start_date)
-- values
--   ('GRP-XXXXX', 'Nome do grupo', 20, 10000, 10000, 'semanal',
--    1, 200000, 'regular', 2.00, '2026-10-01');
--
-- -- depois, gerar o calendário desse grupo:
-- select public.generate_group_rounds(
--   (select id from public.groups where code = 'GRP-XXXXX')
-- );
-- =============================================================================
