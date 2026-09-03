import type { Database, Tables } from "@/integrations/supabase/types";

export type ComplianceLevel = Database["public"]["Enums"]["compliance_level"];
export type ComplianceStats = Tables<"compliance_stats">;
export type ComplianceEvent = Tables<"compliance_events">;
export type ComplianceAudit = Tables<"compliance_audit_log">;

export const LEVEL_ORDER: ComplianceLevel[] = [
  "iniciante",
  "regular",
  "confiavel",
  "avancado",
  "excelente",
];

type LevelMeta = {
  label: string;
  emoji: string;
  ring: string;
  chip: string;
  permissions: string;
  requirements: {
    rate: number;
    historyDays: number;
    cycles: number;
    noPending: boolean;
  };
};

export const LEVEL_META: Record<ComplianceLevel, LevelMeta> = {
  iniciante: {
    label: "Iniciante",
    emoji: "🟢",
    ring: "oklch(0.72 0.17 145)",
    chip: "bg-brand-green/15 text-brand-green-dark",
    permissions: "Participar em grupos permitidos. Ainda não pode criar grupos.",
    requirements: { rate: 0, historyDays: 0, cycles: 0, noPending: false },
  },
  regular: {
    label: "Regular",
    emoji: "🔵",
    ring: "oklch(0.62 0.16 250)",
    chip: "bg-sky-500/15 text-sky-700",
    permissions: "Participar em grupos e permissões limitadas.",
    requirements: { rate: 70, historyDays: 30, cycles: 0, noPending: false },
  },
  confiavel: {
    label: "Confiável",
    emoji: "🟣",
    ring: "oklch(0.6 0.19 305)",
    chip: "bg-purple-500/15 text-purple-700",
    permissions: "Participar e criar grupos pequenos, se elegível.",
    requirements: { rate: 85, historyDays: 60, cycles: 0, noPending: true },
  },
  avancado: {
    label: "Avançado",
    emoji: "🟠",
    ring: "oklch(0.72 0.17 55)",
    chip: "bg-orange-500/15 text-orange-700",
    permissions: "Criar e administrar grupos dentro dos limites da plataforma.",
    requirements: { rate: 95, historyDays: 90, cycles: 1, noPending: true },
  },
  excelente: {
    label: "Excelente",
    emoji: "🟡",
    ring: "oklch(0.82 0.16 90)",
    chip: "bg-amber-400/20 text-amber-700",
    permissions: "Permissões ampliadas, sempre sujeitas às regras de segurança.",
    permissionsNote: undefined,
    requirements: { rate: 98, historyDays: 180, cycles: 4, noPending: true },
  } as LevelMeta,
};

export function nextLevel(level: ComplianceLevel): ComplianceLevel | null {
  const i = LEVEL_ORDER.indexOf(level);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1]! : null;
}

export type Requirement = { label: string; done: boolean; detail: string };

/** Requisitos, um a um, do próximo nível — a base da barra de progresso. */
export function nextLevelRequirements(stats: ComplianceStats): {
  next: ComplianceLevel | null;
  requirements: Requirement[];
  progress: number;
} {
  const next = nextLevel(stats.level);
  if (!next) return { next: null, requirements: [], progress: 100 };

  const req = LEVEL_META[next].requirements;
  const requirements: Requirement[] = [
    {
      label: `Taxa de Cumprimento de ${req.rate}%`,
      done: Number(stats.compliance_rate) >= req.rate,
      detail: `Atual: ${formatRate(stats.compliance_rate)}`,
    },
    {
      label: `${req.historyDays} dias de histórico`,
      done: stats.history_days >= req.historyDays,
      detail: `Atual: ${stats.history_days} dias`,
    },
  ];
  if (req.cycles > 0) {
    requirements.push({
      label: `${req.cycles} ciclo(s) concluído(s)`,
      done: stats.cycles_completed >= req.cycles,
      detail: `Atual: ${stats.cycles_completed}`,
    });
  }
  if (req.noPending) {
    requirements.push({
      label: "Sem obrigações pendentes",
      done: stats.pending_obligations === 0,
      detail: `Pendentes: ${stats.pending_obligations}`,
    });
  }

  const done = requirements.filter((r) => r.done).length;
  return {
    next,
    requirements,
    progress: Math.round((done / requirements.length) * 100),
  };
}

export function formatRate(rate: number | string): string {
  const n = typeof rate === "string" ? Number(rate) : rate;
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

export const EVENT_META: Record<
  ComplianceEvent["event_type"],
  { label: string; sign: "+" | "−" | "•"; tone: "good" | "bad" | "neutral" }
> = {
  payment_on_time: { label: "Pagamento no prazo", sign: "+", tone: "good" },
  cycle_completed: { label: "Ciclo concluído", sign: "+", tone: "good" },
  obligation_resolved: { label: "Obrigação regularizada", sign: "+", tone: "good" },
  payment_late: { label: "Pagamento atrasado", sign: "−", tone: "bad" },
  payment_missed: { label: "Pagamento em falta", sign: "−", tone: "bad" },
  rule_violation: { label: "Quebra das regras do grupo", sign: "−", tone: "bad" },
  obligation_created: { label: "Obrigação pendente", sign: "•", tone: "neutral" },
};
