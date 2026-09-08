import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { InvestmentPlan } from "@/hooks/use-plans";
import { WALLET_QUERY_KEY } from "@/hooks/use-wallet";

export type UserInvestment = Tables<"user_investments"> & {
  plan: InvestmentPlan | null;
};

export const INVESTMENTS_QUERY_KEY = ["user-investments"] as const;

async function fetchInvestments(): Promise<UserInvestment[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("user_investments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const investments = (data ?? []) as Tables<"user_investments">[];
  const planIds = [...new Set(investments.map((investment) => investment.plan_id))];
  if (planIds.length === 0) return [];

  const { data: plans } = await supabase.from("investment_plans").select("*").in("id", planIds);
  const plansById = new Map((plans ?? []).map((plan) => [plan.id, plan as InvestmentPlan]));
  return investments.map((investment) => ({
    ...investment,
    plan: plansById.get(investment.plan_id) ?? null,
  }));
}

export function useInvestments() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: INVESTMENTS_QUERY_KEY,
    queryFn: fetchInvestments,
    staleTime: 10_000,
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY }),
    ]);
  }, [queryClient]);

  const createInvestment = useCallback(
    async (planId: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc("create_investment", { p_plan_id: planId });
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const redeemInvestment = useCallback(
    async (investmentId: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc("redeem_investment", {
        p_investment_id: investmentId,
      });
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
    createInvestment,
    redeemInvestment,
    refresh,
  };
}