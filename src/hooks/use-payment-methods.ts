import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PaymentMethod = Tables<"payment_methods">;
export type PaymentMethodKey = "unitel_money" | "paypay_africa" | "bank_transfer";

export const PAYMENT_METHOD_INFO: Record<
  PaymentMethodKey,
  { label: string; short: string; placeholder: string }
> = {
  unitel_money: {
    label: "Unitel Money",
    short: "Levantamentos e transferências para a sua conta Unitel Money.",
    placeholder: "9XX XXX XXX",
  },
  paypay_africa: {
    label: "PayPay África",
    short: "Usado também para receber os seus depósitos.",
    placeholder: "9XX XXX XXX",
  },
  bank_transfer: {
    label: "Transferência bancária",
    short: "Levantamentos diretos para a sua conta bancária.",
    placeholder: "",
  },
};

type PaymentMethodsQueryData = { userId: string | null; methods: PaymentMethod[] };

export const PAYMENT_METHODS_QUERY_KEY = ["payment-methods"] as const;

async function fetchPaymentMethods(): Promise<PaymentMethodsQueryData> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { userId: null, methods: [] };

  const { data } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", user.id)
    .order("method");

  return { userId: user.id, methods: data ?? [] };
}

export type PaymentMethodInput = {
  method: PaymentMethodKey;
  phone?: string;
  bank_name?: string;
  account_holder?: string;
  account_number?: string;
};

const EMPTY_METHODS: PaymentMethod[] = [];

export function usePaymentMethods() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PAYMENT_METHODS_QUERY_KEY,
    queryFn: fetchPaymentMethods,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const userId = query.data?.userId ?? null;
  const methods = query.data?.methods ?? EMPTY_METHODS;

  const getMethod = useCallback(
    (key: PaymentMethodKey) => methods.find((m) => m.method === key) ?? null,
    [methods],
  );

  const saveMethod = useCallback(
    async (input: PaymentMethodInput) => {
      if (!userId) return { error: "Sessão expirada. Entre novamente." };

      const { data, error } = await supabase
        .from("payment_methods")
        .upsert(
          {
            user_id: userId,
            method: input.method,
            phone: input.phone ?? "",
            bank_name: input.bank_name ?? "",
            account_holder: input.account_holder ?? "",
            account_number: input.account_number ?? "",
          },
          { onConflict: "user_id,method" },
        )
        .select()
        .single();

      if (error) return { error: error.message };

      queryClient.setQueryData<PaymentMethodsQueryData>(PAYMENT_METHODS_QUERY_KEY, (old) => {
        const rest = (old?.methods ?? []).filter((m) => m.method !== input.method);
        return { userId, methods: [...rest, data] };
      });
      return { error: null };
    },
    [userId, queryClient],
  );

  return { userId, methods, getMethod, saveMethod, loading: query.isPending };
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("244") ? digits.slice(3) : digits;
  if (local.length !== 9) return phone;
  return `+244 ${local.slice(0, 3)} ••• ${local.slice(6)}`;
}
