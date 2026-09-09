import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WalletTx = Tables<"wallet_transactions">;
export type Profile = Tables<"profiles">;
export type ContributionRow = Tables<"contributions">;
export type TaskOrder = Tables<"task_orders">;
export type TaskCycle = Tables<"task_cycles">;
export type TaskProduct = Tables<"task_products">;

export type AdminSummary = {
  total_entradas: number;
  total_saidas: number;
  saldo_plataforma: number;
  depositos_pendentes: number;
  saques_pendentes: number;
  n_depositos_pendentes: number;
  n_saques_pendentes: number;
  n_utilizadores: number;
  total_contribuicoes_pagas: number;
  n_contribuicoes_pendentes: number;
};

export type WithdrawalFeeSummary = {
  total_taxas_confirmadas: number;
  total_taxas_pendentes: number;
  total_taxas_geral: number;
  total_saques_confirmados: number;
  valor_saques_confirmados: number;
};

const EMPTY_SUMMARY: AdminSummary = {
  total_entradas: 0,
  total_saidas: 0,
  saldo_plataforma: 0,
  depositos_pendentes: 0,
  saques_pendentes: 0,
  n_depositos_pendentes: 0,
  n_saques_pendentes: 0,
  n_utilizadores: 0,
  total_contribuicoes_pagas: 0,
  n_contribuicoes_pendentes: 0,
};

const EMPTY_FEE_SUMMARY: WithdrawalFeeSummary = {
  total_taxas_confirmadas: 0,
  total_taxas_pendentes: 0,
  total_taxas_geral: 0,
  total_saques_confirmados: 0,
  valor_saques_confirmados: 0,
};

export const ADMIN_QUERY_KEY = ["admin-finance"] as const;

export function useIsAdmin() {
  const query = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return { userId: null, isAdmin: false };
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return { userId, isAdmin: Boolean(data) };
    },
    staleTime: 60 * 1000,
  });

  return {
    userId: query.data?.userId ?? null,
    isAdmin: query.data?.isAdmin ?? false,
    loading: query.isPending,
  };
}

type AdminData = {
  summary: AdminSummary;
  withdrawalFeePercent: number;
  feeSummary: WithdrawalFeeSummary;
  transactions: WalletTx[];
  profiles: Record<string, Profile>;
  contributions: (ContributionRow & { participant_name: string; group_name: string })[];
  taskOrders: TaskOrder[];
  taskCycles: TaskCycle[];
  taskProducts: Record<string, TaskProduct>;
};

async function fetchAdminData(): Promise<AdminData> {
  const [
    summaryRes,
    txRes,
    profilesRes,
    contribRes,
    participantsRes,
    groupsRes,
    taskOrdersRes,
    taskCyclesRes,
    taskProductsRes,
    feeSettingsRes,
    feeSummaryRes,
  ] = await Promise.all([
    supabase.rpc("admin_finance_summary"),
    supabase
      .from("wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("profiles").select("*"),
    supabase.from("contributions").select("*").order("due_date", { ascending: false }).limit(300),
    supabase.from("group_participants").select("id, user_id, display_name"),
    supabase.from("groups").select("id, name"),
    supabase.from("task_orders").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("task_cycles").select("*").order("created_at", { ascending: false }).limit(300),
    supabase.from("task_products").select("*"),
    supabase.rpc("get_withdrawal_fee_settings" as never, {} as never),
    supabase.rpc("admin_withdrawal_fee_summary" as never, {} as never),
  ]);

  const rawSummary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data;
  const summary: AdminSummary = rawSummary
    ? {
        total_entradas: Number(rawSummary.total_entradas ?? 0),
        total_saidas: Number(rawSummary.total_saidas ?? 0),
        saldo_plataforma: Number(rawSummary.saldo_plataforma ?? 0),
        depositos_pendentes: Number(rawSummary.depositos_pendentes ?? 0),
        saques_pendentes: Number(rawSummary.saques_pendentes ?? 0),
        n_depositos_pendentes: Number(rawSummary.n_depositos_pendentes ?? 0),
        n_saques_pendentes: Number(rawSummary.n_saques_pendentes ?? 0),
        n_utilizadores: Number(rawSummary.n_utilizadores ?? 0),
        total_contribuicoes_pagas: Number(rawSummary.total_contribuicoes_pagas ?? 0),
        n_contribuicoes_pendentes: Number(rawSummary.n_contribuicoes_pendentes ?? 0),
      }
    : EMPTY_SUMMARY;

  const profiles: Record<string, Profile> = {};
  for (const p of profilesRes.data ?? []) profiles[p.id] = p as Profile;

  const participantName = new Map<string, string>();
  for (const p of participantsRes.data ?? []) participantName.set(p.id, p.display_name);
  const groupName = new Map<string, string>();
  for (const g of groupsRes.data ?? []) groupName.set(g.id, g.name);

  const contributions = (contribRes.data ?? []).map((c) => ({
    ...(c as ContributionRow),
    participant_name: participantName.get(c.participant_id) ?? "Participante",
    group_name: groupName.get(c.group_id) ?? "Grupo",
  }));

  const taskProducts: Record<string, TaskProduct> = {};
  for (const product of taskProductsRes.data ?? []) {
    taskProducts[product.id] = product as TaskProduct;
  }

  const feeSettingsRow = Array.isArray(feeSettingsRes.data)
    ? feeSettingsRes.data[0]
    : feeSettingsRes.data;
  const feeSummaryRow = Array.isArray(feeSummaryRes.data) ? feeSummaryRes.data[0] : feeSummaryRes.data;
  const feeSummary = feeSummaryRow
    ? {
        total_taxas_confirmadas: Number(feeSummaryRow.total_taxas_confirmadas ?? 0),
        total_taxas_pendentes: Number(feeSummaryRow.total_taxas_pendentes ?? 0),
        total_taxas_geral: Number(feeSummaryRow.total_taxas_geral ?? 0),
        total_saques_confirmados: Number(feeSummaryRow.total_saques_confirmados ?? 0),
        valor_saques_confirmados: Number(feeSummaryRow.valor_saques_confirmados ?? 0),
      }
    : EMPTY_FEE_SUMMARY;

  return {
    summary,
    withdrawalFeePercent: Number(feeSettingsRow?.fee_percent ?? 0),
    feeSummary,
    transactions: (txRes.data ?? []) as WalletTx[],
    profiles,
    contributions,
    taskOrders: (taskOrdersRes.data ?? []) as TaskOrder[],
    taskCycles: (taskCyclesRes.data ?? []) as TaskCycle[],
    taskProducts,
  };
}

export function useAdminFinance(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ADMIN_QUERY_KEY,
    queryFn: fetchAdminData,
    enabled,
    staleTime: 15 * 1000,
    refetchInterval: enabled ? 15 * 1000 : false,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY }),
    [queryClient],
  );

  const review = useCallback(
    async (id: string, approve: boolean, reason = ""): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc("admin_review_transaction", {
        p_transaction_id: id,
        p_approve: approve,
        p_reason: reason,
      });
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const proofUrl = useCallback(async (path: string | null): Promise<string | null> => {
    if (!path) return null;
    const { data } = await supabase.storage.from("comprovativos").createSignedUrl(path, 300);
    return data?.signedUrl ?? null;
  }, []);

  const grantBalance = useCallback(
    async (userId: string, amount: number, reason: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc(
        "admin_grant_balance" as never,
        {
          p_user_id: userId,
          p_amount: amount,
          p_reason: reason,
        } as never,
      );
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const updateWithdrawalFee = useCallback(
    async (feePercent: number): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc(
        "admin_update_withdrawal_fee" as never,
        { p_fee_percent: feePercent } as never,
      );
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  return {
    summary: query.data?.summary ?? EMPTY_SUMMARY,
    withdrawalFeePercent: query.data?.withdrawalFeePercent ?? 0,
    feeSummary: query.data?.feeSummary ?? EMPTY_FEE_SUMMARY,
    transactions: query.data?.transactions ?? [],
    profiles: query.data?.profiles ?? {},
    contributions: query.data?.contributions ?? [],
    taskOrders: query.data?.taskOrders ?? [],
    taskCycles: query.data?.taskCycles ?? [],
    taskProducts: query.data?.taskProducts ?? {},
    loading: query.isPending,
    refresh,
    review,
    proofUrl,
    grantBalance,
    updateWithdrawalFee,
  };
}
