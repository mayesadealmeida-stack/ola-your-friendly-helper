import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { PaymentMethodKey } from "@/hooks/use-payment-methods";

// -----------------------------------------------------------------------------
// A tabela "wallet_transactions" ainda não está no types.ts gerado — passa a
// estar depois de correr supabase-wallet-system.sql e o projeto sincronizar
// os tipos. Mesmo padrão já usado para "posts" e "groups".
// -----------------------------------------------------------------------------

export type WalletTransaction = Tables<"wallet_transactions">;

export const WALLET_QUERY_KEY = ["wallet"] as const;

const MAX_PROOF_BYTES = 8 * 1024 * 1024; // 8MB

type WalletData = {
  userId: string | null;
  balance: number;
  transactions: WalletTransaction[];
};

async function fetchWallet(): Promise<WalletData> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { userId: null, balance: 0, transactions: [] };

  const { data } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const transactions = data ?? [];
  const balance = transactions
    .filter((t) => t.status === "confirmado")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return { userId, balance, transactions };
}

export function useWallet() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: WALLET_QUERY_KEY,
    queryFn: fetchWallet,
    staleTime: 30 * 1000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY }),
    [queryClient],
  );

  const userId = query.data?.userId ?? null;

  const requestDeposit = useCallback(
    async (
      amountKz: number,
      method: PaymentMethodKey,
      proofFile: File,
    ): Promise<{ error: string | null }> => {
      if (!userId) return { error: "Sessão expirada. Entre novamente." };

      const isImage = proofFile.type.startsWith("image/");
      const isPdf = proofFile.type === "application/pdf";
      if (!isImage && !isPdf) {
        return { error: "Envie uma foto (JPG, PNG) ou um PDF do comprovativo." };
      }
      if (proofFile.size > MAX_PROOF_BYTES) {
        return { error: "O ficheiro deve ter no máximo 8MB." };
      }

      const ext = proofFile.name.split(".").pop()?.toLowerCase() || (isPdf ? "pdf" : "jpg");
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("comprovativos")
        .upload(path, proofFile, { cacheControl: "3600" });

      if (uploadError) {
        return { error: "Falha ao enviar o comprovativo. Tente novamente." };
      }

      const { error } = await supabase.rpc(
        "request_deposit" as never,
        {
          p_amount: amountKz,
          p_method: method,
          p_proof_url: path,
        } as never,
      );

      if (error) return { error: error.message };

      await refresh();
      return { error: null };
    },
    [userId, refresh],
  );

  return {
    userId,
    balance: query.data?.balance ?? 0,
    transactions: query.data?.transactions ?? [],
    loading: query.isPending,
    requestDeposit,
    refresh,
  };
}
