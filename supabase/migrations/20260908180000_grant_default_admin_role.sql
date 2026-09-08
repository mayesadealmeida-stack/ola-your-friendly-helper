-- Garante que a conta administrativa configurada pela aplicação tenha
-- autorização real no banco. A autenticação sozinha não deve abrir o painel:
-- a função admin continua a ser validada por public.has_role().
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = 'admin@groupmobil.app'
on conflict (user_id, role) do nothing;

-- Se a conta for criada depois desta migration, o mesmo acesso continua a
-- ser atribuído automaticamente. O trigger é restrito ao e-mail fixo do
-- administrador e não abre acesso para contas normais.
create or replace function public.assign_default_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'admin@groupmobil.app' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_default_admin_role on auth.users;
create trigger assign_default_admin_role
after insert on auth.users
for each row execute function public.assign_default_admin_role();