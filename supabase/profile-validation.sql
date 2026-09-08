-- =============================================================================
-- GROUP MOBIL — Validação de nome e nome de usuário
-- Execute depois da migration que cria public.profiles.
-- =============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_full_name_letters_only'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_full_name_letters_only
      check (
        full_name ~ '[[:alpha:]]'
        and full_name !~ '[0-9]'
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_starts_with_letter'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_starts_with_letter
      check (
        username = ''
        or username ~ '^[[:alpha:]][[:alnum:]_.-]{2,19}$'
      ) not valid;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  v_username text := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));
begin
  if v_full_name !~ '[[:alpha:]]' or v_full_name ~ '[0-9]' then
    raise exception 'O nome completo deve conter apenas letras e espaços.';
  end if;

  if v_username !~ '^[[:alpha:]][[:alnum:]_.-]{2,19}$' then
    raise exception
      'O nome de usuário deve começar com uma letra e ter 3-20 caracteres.';
  end if;

  insert into public.profiles (id, full_name, username, phone)
  values (
    new.id,
    v_full_name,
    v_username,
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;