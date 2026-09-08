-- Alarga admin_wipe_financial_data: passa a apagar TODOS os dados de
-- aplicação (não só carteira/contribuições), incluindo perfis, KYC, grupos,
-- notificações, métodos de pagamento e publicações.
-- Continua reservada a quem tem o papel 'admin', e continua sem tocar em
-- auth.users (as contas de login) nem em user_roles (para ninguém ficar
-- sem acesso ao próprio painel a meio da operação).

CREATE OR REPLACE FUNCTION public.admin_wipe_financial_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  TRUNCATE TABLE
    public.compliance_audit_log,
    public.compliance_events,
    public.compliance_stats,
    public.wallet_transactions,
    public.contributions,
    public.group_rounds,
    public.group_participants,
    public.groups,
    public.user_investments,
    public.investment_plans,
    public.task_orders,
    public.task_cycles,
    public.task_products,
    public.kyc_basic,
    public.notifications,
    public.payment_methods,
    public.posts,
    public.profiles
  CASCADE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_wipe_financial_data() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_wipe_financial_data() TO authenticated;
