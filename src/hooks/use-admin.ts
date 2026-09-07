import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WalletTx = Tables<"wallet_transactions">;
export type Profile = Tables<"profiles">;
export type ContributionRow = Tables<"contributions">;

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
  transactions: WalletTx[];
  profiles: Record<string, Profile>;
  contributions: (ContributionRow & { participant_name: string; group_name: string })[];
};

async function fetchAdminData(): Promise<AdminData> {
  const [summaryRes, txRes, profilesRes, contribRes, participantsRes, groupsRes] =
    await Promise.all([
      supabase.rpc("admin_finance_summary"),
      supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("profiles").select("*"),
      supabase
        .from("contributions")
        .select("*")
        .order("due_date", { ascending: false })
        .limit(300),
      supabase.from("group_participants").select("id, user_id, display_name"),
      supabase.from("groups").select("id, name"),
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

  return { summary, transactions: (txRes.data ?? []) as WalletTx[], profiles, contributions };
}

export function useAdminFinance(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ADMIN_QUERY_KEY,
    queryFn: fetchAdminData,
    enabled,
    staleTime: 15 * 1000,
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

  return {
    summary: query.data?.summary ?? EMPTY_SUMMARY,
    transactions: query.data?.transactions ?? [],
    profiles: query.data?.profiles ?? {},
    contributions: query.data?.contributions ?? [],
    loading: query.isPending,
    refresh,
    review,
    proofUrl,
  };
}
