-- Notificações centralizadas da conta (nunca mensagens diretas).
-- O indicador vermelho da aplicação lê todas as notificações desta tabela
-- que ainda não tenham read_at.

create or replace function public.notify_wallet_transaction_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_title text;
  v_body text;
  v_amount text := to_char(abs(new.amount), 'FM999G999G999G990D00');
begin
  if new.user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_kind := 'wallet_pending';
    case new.type
      when 'deposito' then
        v_title := 'Depósito enviado';
        v_body := 'O seu depósito de Kz ' || v_amount || ' foi recebido e está em análise.';
      when 'levantamento' then
        v_title := 'Pedido de saque enviado';
        v_body := 'O seu pedido de saque de Kz ' || v_amount || ' foi recebido e está em análise.';
      when 'contribuicao_grupo' then
        v_kind := 'wallet';
        v_title := 'Contribuição registada';
        v_body := 'A sua contribuição de Kz ' || v_amount || ' foi registada com sucesso.';
      when 'recebimento_grupo' then
        v_kind := 'wallet';
        v_title := 'Recebimento registado';
        v_body := 'Recebeu Kz ' || v_amount || ' na sua carteira.';
      else
        v_title := 'Novo movimento na carteira';
        v_body := 'Foi registado um novo movimento de Kz ' || v_amount || ' na sua conta.';
    end case;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    v_kind := 'wallet';
    case
      when new.status = 'confirmado' and new.type = 'deposito' then
        v_title := 'Depósito confirmado';
        v_body := 'O seu depósito de Kz ' || v_amount || ' foi confirmado.';
      when new.status = 'confirmado' and new.type = 'levantamento' then
        v_title := 'Saque aprovado';
        v_body := 'O seu saque de Kz ' || v_amount || ' foi aprovado.';
      when new.status = 'confirmado' then
        v_title := 'Movimento confirmado';
        v_body := 'O seu movimento de Kz ' || v_amount || ' foi confirmado.';
      when new.status = 'rejeitado' and new.type = 'deposito' then
        v_title := 'Depósito rejeitado';
        v_body := 'O seu depósito de Kz ' || v_amount || ' foi rejeitado. ' || coalesce(new.review_reason, '');
      when new.status = 'rejeitado' and new.type = 'levantamento' then
        v_title := 'Saque rejeitado';
        v_body := 'O seu saque de Kz ' || v_amount || ' foi rejeitado. ' || coalesce(new.review_reason, '');
      when new.status = 'rejeitado' then
        v_title := 'Movimento rejeitado';
        v_body := 'O seu movimento de Kz ' || v_amount || ' foi rejeitado. ' || coalesce(new.review_reason, '');
      else
        v_title := 'Estado do movimento atualizado';
        v_body := 'O estado do seu movimento de Kz ' || v_amount || ' foi atualizado.';
    end case;
  else
    return new;
  end if;

  insert into public.notifications (user_id, kind, title, body)
  values (new.user_id, v_kind, v_title, trim(v_body));

  return new;
end;
$$;

drop trigger if exists wallet_transaction_notifications on public.wallet_transactions;
create trigger wallet_transaction_notifications
after insert or update of status on public.wallet_transactions
for each row
execute function public.notify_wallet_transaction_event();

-- A trigger acima passa a ser a única origem das notificações de revisão.
-- Assim, aprovar/rejeitar um depósito ou saque não cria notificações duplicadas.
create or replace function public.admin_review_transaction(
  p_transaction_id uuid,
  p_approve boolean,
  p_reason text default ''
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.wallet_transactions;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Não autorizado.';
  end if;

  select *
  into v_tx
  from public.wallet_transactions
  where id = p_transaction_id
  for update;

  if v_tx.id is null then
    raise exception 'Movimento não encontrado.';
  end if;

  if v_tx.status <> 'pendente' then
    raise exception 'Este movimento já foi revisto.';
  end if;

  update public.wallet_transactions
  set status = case
        when p_approve then 'confirmado'::public.wallet_transaction_status
        else 'rejeitado'::public.wallet_transaction_status
      end,
      confirmed_at = case when p_approve then now() else null end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_reason = coalesce(p_reason, '')
  where id = p_transaction_id
  returning * into v_tx;

  return v_tx;
end;
$$;