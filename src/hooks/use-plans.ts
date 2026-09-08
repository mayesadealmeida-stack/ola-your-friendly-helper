import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type InvestmentPlan = Tables<"investment_plans">;
export type NewInvestmentPlan = Omit<
  TablesInsert<"investment_plans">,
  "created_by" | "image_url"
> & { image?: File | null };

export const PLANS_QUERY_KEY = ["investment-plans"] as const;

async function uploadPlanImage(file: File, userId: string): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("planos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
  return supabase.storage.from("planos").getPublicUrl(path).data.publicUrl;
}

export function usePlans(includeInactive = false) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...PLANS_QUERY_KEY, includeInactive],
    queryFn: async () => {
      let request = supabase
        .from("investment_plans")
        .select("*")
        .order("created_at", { ascending: false });
      if (!includeInactive) request = request.eq("is_active", true);
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as InvestmentPlan[];
    },
    staleTime: 15_000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY }),
    [queryClient],
  );

  const createPlan = useCallback(
    async (values: NewInvestmentPlan): Promise<{ error: string | null }> => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return { error: "A sessão de administrador expirou." };

        const imageUrl = values.image ? await uploadPlanImage(values.image, userId) : null;
        const payload: TablesInsert<"investment_plans"> = {
          name: values.name,
          description: values.description ?? "",
          duration_value: Number(values.duration_value),
          duration_unit: values.duration_unit ?? "meses",
          entry_price: Number(values.entry_price),
          estimated_return: Number(values.estimated_return),
          image_url: imageUrl,
          is_active: true,
          created_by: userId,
        };
        const { error } = await supabase.from("investment_plans").insert(payload);
        if (error) return { error: error.message };
        await refresh();
        return { error: null };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Não foi possível criar o plano.",
        };
      }
    },
    [refresh],
  );

  const deletePlan = useCallback(
    async (plan: InvestmentPlan): Promise<{ error: string | null }> => {
      const { error } = await supabase.from("investment_plans").delete().eq("id", plan.id);
      if (error) {
        const friendly = /foreign key|violat/i.test(error.message)
          ? "Não é possível eliminar: existem investimentos de utilizadores associados a este plano."
          : error.message;
        return { error: friendly };
      }

      // A imagem é opcional. Remover o ficheiro depois do registo evita deixar
      // imagens órfãs no bucket quando um plano é eliminado.
      if (plan.image_url) {
        const marker = "/storage/v1/object/public/planos/";
        const markerIndex = plan.image_url.indexOf(marker);
        if (markerIndex >= 0) {
          const path = decodeURIComponent(plan.image_url.slice(markerIndex + marker.length));
          await supabase.storage.from("planos").remove([path]);
        }
      }

      await refresh();
      return { error: null };
    },
    [refresh],
  );

  return {
    plans: query.data ?? [],
    loading: query.isPending,
    error: query.error?.message ?? null,
    createPlan,
    deletePlan,
    refresh,
  };
}
