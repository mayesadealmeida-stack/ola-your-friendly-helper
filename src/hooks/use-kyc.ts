import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type KycBasic = Tables<"kyc_basic">;
export type KycStatus = KycBasic["status"];

type KycQueryData = { userId: string | null; kyc: KycBasic | null };

export const KYC_QUERY_KEY = ["kyc"] as const;

export type KycInput = {
  full_name: string;
  country: string;
  birth_date: string; // YYYY-MM-DD
  city: string;
  address: string;
  address_reference: string;
};

async function fetchKycData(): Promise<KycQueryData> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return { userId: null, kyc: null };

  const { data } = await supabase.from("kyc_basic").select("*").eq("id", user.id).maybeSingle();
  return { userId: user.id, kyc: data };
}

/**
 * Dados de KYC em cache partilhado — mesmo princípio do useProfile: evita
 * recarregar/mostrar "a processar" sempre que se navega entre páginas.
 */
export function useKyc() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KYC_QUERY_KEY,
    queryFn: fetchKycData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const userId = query.data?.userId ?? null;
  const kyc = query.data?.kyc ?? null;

  const submitKyc = useCallback(
    async (input: KycInput) => {
      if (!userId) return { error: "Sessão expirada. Entre novamente." };

      const { data, error } = await supabase
        .from("kyc_basic")
        .upsert(
          {
            id: userId,
            ...input,
            status: "pending",
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select()
        .single();

      if (error) return { error: error.message };

      queryClient.setQueryData<KycQueryData>(KYC_QUERY_KEY, (old) =>
        old ? { ...old, kyc: data } : { userId, kyc: data },
      );
      return { error: null };
    },
    [userId, queryClient],
  );

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: KYC_QUERY_KEY }),
    [queryClient],
  );

  return {
    userId,
    kyc,
    loading: query.isPending,
    notAuthenticated: query.isSuccess && !userId,
    reload,
    submitKyc,
  };
}

export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function kycStatusLabel(status: KycStatus | undefined): string {
  switch (status) {
    case "verified":
      return "Verificado";
    case "pending":
      return "Em análise";
    case "rejected":
      return "Rejeitado";
    default:
      return "Não iniciado";
  }
}
