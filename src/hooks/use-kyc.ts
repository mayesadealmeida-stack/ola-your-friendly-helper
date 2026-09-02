import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type KycBasic = Tables<"kyc_basic">;
export type KycStatus = KycBasic["status"];

type KycState = {
  userId: string | null;
  kyc: KycBasic | null;
  loading: boolean;
  notAuthenticated: boolean;
};

export type KycInput = {
  full_name: string;
  country: string;
  birth_date: string; // YYYY-MM-DD
  city: string;
  address: string;
  address_reference: string;
};

export function useKyc() {
  const [state, setState] = useState<KycState>({
    userId: null,
    kyc: null,
    loading: true,
    notAuthenticated: false,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setState({ userId: null, kyc: null, loading: false, notAuthenticated: true });
      return;
    }

    const { data } = await supabase.from("kyc_basic").select("*").eq("id", user.id).maybeSingle();

    setState({ userId: user.id, kyc: data, loading: false, notAuthenticated: false });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitKyc = useCallback(
    async (input: KycInput) => {
      if (!state.userId) return { error: "Sessão expirada. Entre novamente." };

      const { data, error } = await supabase
        .from("kyc_basic")
        .upsert(
          {
            id: state.userId,
            ...input,
            status: "pending",
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select()
        .single();

      if (error) return { error: error.message };

      setState((s) => ({ ...s, kyc: data }));
      return { error: null };
    },
    [state.userId],
  );

  return { ...state, reload: load, submitKyc };
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
