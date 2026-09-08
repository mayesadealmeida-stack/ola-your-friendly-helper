-- Ajusta admin_wipe_financial_data: já não apaga payment_methods
-- (os métodos de pagamento dos utilizadores ficam intactos).

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
    public.posts,
    public.profiles
  CASCADE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_wipe_financial_data() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_wipe_financial_data() TO authenticated;
