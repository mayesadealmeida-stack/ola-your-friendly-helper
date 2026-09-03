import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ComplianceAudit,
  ComplianceEvent,
  ComplianceStats,
} from "@/lib/compliance";

export const COMPLIANCE_QUERY_KEY = ["compliance"] as const;

type ComplianceData = {
  stats: ComplianceStats | null;
  events: ComplianceEvent[];
  audit: ComplianceAudit[];
};

async function fetchCompliance(): Promise<ComplianceData> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { stats: null, events: [], audit: [] };

  const [stats, events, audit] = await Promise.all([
    supabase.from("compliance_stats").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("compliance_events")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(30),
    supabase
      .from("compliance_audit_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    stats: stats.data ?? null,
    events: events.data ?? [],
    audit: audit.data ?? [],
  };
}

/**
 * Taxa de Cumprimento e nível do participante. Tudo é calculado no servidor
 * por regras objetivas — o cliente apenas lê.
 */
export function useCompliance() {
  const query = useQuery({
    queryKey: COMPLIANCE_QUERY_KEY,
    queryFn: fetchCompliance,
    staleTime: 60 * 1000,
  });

  return {
    stats: query.data?.stats ?? null,
    events: query.data?.events ?? [],
    audit: query.data?.audit ?? [],
    loading: query.isLoading,
  };
}
