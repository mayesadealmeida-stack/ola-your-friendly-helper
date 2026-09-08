import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { InvestmentPlan } from "@/hooks/use-plans";

export type AdminInvestment = Tables<"user_investments"> & {
  plan: InvestmentPlan | null;
};

export const ADMIN_INVESTMENTS_QUERY_KEY = ["admin-investments"] as const;

async function fetchAdminInvestments(): Promise<AdminInvestment[]> {
  const { data, error } = await supabase
    .from("user_investments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const investments = (data ?? []) as Tables<"user_investments">[];
  const planIds = [...new Set(investments.map((investment) => investment.plan_id))];

  let plansById = new Map<string, InvestmentPlan>();
  if (planIds.length > 0) {
    const { data: plans } = await supabase.from("investment_plans").select("*").in("id", planIds);
    plansById = new Map((plans ?? []).map((plan) => [plan.id, plan as InvestmentPlan]));
  }

  return investments.map((investment) => ({
    ...investment,
    plan: plansById.get(investment.plan_id) ?? null,
  }));
}

export function useAdminInvestments(enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ADMIN_INVESTMENTS_QUERY_KEY,
    queryFn: fetchAdminInvestments,
    enabled,
    staleTime: 15_000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ADMIN_INVESTMENTS_QUERY_KEY }),
    [queryClient],
  );

  const cancelInvestment = useCallback(
    async (investmentId: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc(
        "admin_cancel_investment" as never,
        {
          p_investment_id: investmentId,
          p_refund: true,
        } as never,
      );
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  return {
    investments: query.data ?? [],
    loading: query.isPending,
    error: query.error?.message ?? null,
    cancelInvestment,
    refresh,
  };
}
