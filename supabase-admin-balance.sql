-- =============================================================================
-- GROUP MOBIL — Ajuste manual de saldo pelo administrador
-- Cole este script no SQL Editor do Supabase e execute uma vez.
-- =============================================================================

-- Novo tipo de movimento: ajuste feito diretamente pela equipa (ex.: dar
-- saldo por um motivo excecional). Fica sempre confirmado na hora e com
-- motivo obrigatório, para auditoria.
alter type public.wallet_transaction_type add value if not exists 'ajuste_admin';

create or replace function public.admin_grant_balance(
  p_user_id uuid,
  p_amount numeric,
  p_reason text
) returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_tx public.wallet_transactions;
begin
  if v_admin_id is null or not public.has_role(v_admin_id, 'admin') then
    raise exception 'Não autorizado.';
  end if;
  if p_amount = 0 then
    raise exception 'O valor do ajuste não pode ser zero.';
  end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Indique o motivo do ajuste.';
  end if;

  insert into public.wallet_transactions
    (user_id, type, amount, status, note, confirmed_at, reviewed_by, reviewed_at)
  values
    (p_user_id, 'ajuste_admin', p_amount, 'confirmado', p_reason, now(), v_admin_id, now())
  returning * into v_tx;

  return v_tx;
end;
$$;

revoke execute on function public.admin_grant_balance from anon, authenticated;
grant execute on function public.admin_grant_balance to authenticated;
-- (A verificação de admin acontece dentro da função — quem não for admin
-- recebe sempre "Não autorizado", mesmo tendo permissão para chamar.)
