import type { Tables } from "@/integrations/supabase/types";
import type { ComplianceLevel } from "@/lib/compliance";

// -----------------------------------------------------------------------------
// A tabela "groups" e afins ainda não estão no types.ts gerado (só passam a
// estar depois de correr supabase-groups-system.sql e o projeto sincronizar
// os tipos) — por isso usamos Tables<"groups"> na mesma, tal como o resto do
// código já faz para "posts". Fica a compilar assim que o SQL for corrido.
// -----------------------------------------------------------------------------

export type Group = Tables<"groups">;
export type GroupParticipant = Tables<"group_participants">;
export type GroupRound = Tables<"group_rounds">;
export type Contribution = Tables<"contributions">;

export type GroupFrequency = "semanal" | "mensal";
export type GroupStatus = "aberto" | "completo" | "andamento" | "encerrado";
export type PaymentMethodKey = "unitel_money" | "paypay_africa" | "bank_transfer";

export function vacancies(group: Group): number {
  return Math.max(0, group.participants_max - group.participants_current);
}

export function roundsCount(group: Group): number {
  return Math.ceil(group.participants_max / group.beneficiaries_per_round);
}

export function formatKz(amount: number): string {
  return `${new Intl.NumberFormat("pt-AO").format(Math.round(amount))} Kz`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function levelAllows(userLevel: ComplianceLevel, minLevel: ComplianceLevel): boolean {
  const order: ComplianceLevel[] = ["iniciante", "regular", "confiavel", "avancado", "excelente"];
  return order.indexOf(userLevel) >= order.indexOf(minLevel);
}

/** Beneficiários de uma rodada = participantes cuja posição cai no intervalo da rodada. */
export function beneficiariesForRound(
  group: Group,
  roundNumber: number,
  participants: GroupParticipant[],
): { position: number; participant: GroupParticipant | null }[] {
  const start = (roundNumber - 1) * group.beneficiaries_per_round + 1;
  const end = roundNumber * group.beneficiaries_per_round;
  const byPosition = new Map(participants.map((p) => [p.position, p]));

  const slots: { position: number; participant: GroupParticipant | null }[] = [];
  for (let pos = start; pos <= end; pos++) {
    slots.push({ position: pos, participant: byPosition.get(pos) ?? null });
  }
  return slots;
}
