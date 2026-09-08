import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { WALLET_QUERY_KEY } from "@/hooks/use-wallet";

export type TaskProduct = Tables<"task_products">;
export type TaskCycle = Tables<"task_cycles">;
export type TaskOrder = Tables<"task_orders">;

export const TASKS_QUERY_KEY = ["tasks"] as const;

type TasksData = {
  products: TaskProduct[];
  allProducts: TaskProduct[];
  cycle: TaskCycle | null;
  orders: TaskOrder[];
};

async function fetchTasks(): Promise<TasksData> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { products: [], allProducts: [], cycle: null, orders: [] };

  const [{ data: products, error: productsError }, { data: cycles, error: cyclesError }] =
    await Promise.all([
      supabase
        .from("task_products")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true }),
      supabase
        .from("task_cycles")
        .select("*")
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  if (productsError) throw productsError;
  if (cyclesError) throw cyclesError;

  const allProducts = (products ?? []) as TaskProduct[];
  const cycle = cycles?.[0] ?? null;
  if (!cycle) return { products: allProducts, allProducts, cycle: null, orders: [] };

  const { data: orders, error: ordersError } = await supabase
    .from("task_orders")
    .select("*")
    .eq("cycle_id", cycle.id)
    .order("round_number", { ascending: true });

  if (ordersError) throw ordersError;

  const completedProductIds = new Set((orders ?? []).map((order) => order.product_id));

  return {
    // Cada produto só pode ser usado uma vez no mesmo ciclo. Os produtos
    // continuam ativos para poderem voltar a aparecer num ciclo futuro.
    products: allProducts.filter((product) => !completedProductIds.has(product.id)),
    allProducts,
    cycle: cycle as TaskCycle,
    orders: (orders ?? []) as TaskOrder[],
  };
}

export function useTasks() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 10_000,
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY }),
    ]);
  }, [queryClient]);

  const startTask = useCallback(
    async (productId: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc("start_task_round", { p_product_id: productId });
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const redeemTasks = useCallback(
    async (cycleId: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc("redeem_task_cycle", { p_cycle_id: cycleId });
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  return {
    products: query.data?.products ?? [],
    allProducts: query.data?.allProducts ?? [],
    cycle: query.data?.cycle ?? null,
    orders: query.data?.orders ?? [],
    loading: query.isPending,
    error: query.error?.message ?? null,
    startTask,
    redeemTasks,
    refresh,
  };
}
