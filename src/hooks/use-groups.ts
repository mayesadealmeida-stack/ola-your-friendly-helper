import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Group } from "@/lib/groups";

export const GROUPS_QUERY_KEY = ["groups"] as const;

async function fetchGroups(): Promise<Group[]> {
  const { data } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });

  return data ?? [];
}

/** Lista de grupos disponíveis. Só leitura — grupos são criados pela equipa. */
export function useGroups() {
  const query = useQuery({
    queryKey: GROUPS_QUERY_KEY,
    queryFn: fetchGroups,
    staleTime: 60 * 1000,
  });

  return { groups: query.data ?? [], loading: query.isPending };
}
