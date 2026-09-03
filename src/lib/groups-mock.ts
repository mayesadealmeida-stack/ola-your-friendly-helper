import type { ComplianceLevel } from "@/lib/compliance";

// -----------------------------------------------------------------------------
// Dados de exemplo para a página "Grupos". Ainda sem backend — nesta etapa é
// só a interface visual e a experiência de navegação, como combinado. Quando
// ligarmos a lógica real, isto passa a vir do Supabase (grupos, participantes,
// rodadas, contribuições).
// -----------------------------------------------------------------------------

export type GroupFrequency = "semanal" | "mensal";
export type GroupStatus = "aberto" | "completo" | "andamento";

export type GroupDef = {
  id: string;
  code: string;
  name: string;
  status: GroupStatus;
  participantsMax: number;
  participantsCurrent: number;
  entryFee: number;
  contribution: number;
  frequency: GroupFrequency;
  durationLabel: string;
  beneficiariesPerRound: number;
  roundAmount: number;
  minLevel: ComplianceLevel;
  feePercent: number;
  startDate: string; // ISO — data da rodada 1
};

export const MOCK_PARTICIPANT_NAMES = [
  "João",
  "Maria",
  "Carlos",
  "Ana",
  "Pedro",
  "Sofia",
  "Miguel",
  "Beatriz",
  "Tiago",
  "Inês",
  "Domingos",
  "Luísa",
  "Manuel",
  "Célia",
  "Fernando",
  "Rosa",
  "António",
  "Isabel",
  "Paulo",
  "Marta",
];

export const MOCK_GROUPS: GroupDef[] = [
  {
    id: "poupanca-maria",
    code: "GRP-8F42K",
    name: "Poupança Maria",
    status: "aberto",
    participantsMax: 20,
    participantsCurrent: 19,
    entryFee: 10_000,
    contribution: 10_000,
    frequency: "semanal",
    durationLabel: "20 semanas",
    beneficiariesPerRound: 1,
    roundAmount: 200_000,
    minLevel: "regular",
    feePercent: 2,
    startDate: "2026-09-15",
  },
  {
    id: "familia-unida",
    code: "GRP-3B91Q",
    name: "Grupo Família Unida",
    status: "aberto",
    participantsMax: 10,
    participantsCurrent: 8,
    entryFee: 5_000,
    contribution: 5_000,
    frequency: "mensal",
    durationLabel: "10 meses",
    beneficiariesPerRound: 1,
    roundAmount: 50_000,
    minLevel: "iniciante",
    feePercent: 2,
    startDate: "2026-09-20",
  },
  {
    id: "negocio-100k",
    code: "GRP-5C17T",
    name: "Poupança Negócio 100K",
    status: "aberto",
    participantsMax: 20,
    participantsCurrent: 15,
    entryFee: 10_000,
    contribution: 10_000,
    frequency: "mensal",
    durationLabel: "10 meses",
    beneficiariesPerRound: 2,
    roundAmount: 200_000,
    minLevel: "confiavel",
    feePercent: 2,
    startDate: "2026-09-25",
  },
];

export function getGroupById(id: string): GroupDef | undefined {
  return MOCK_GROUPS.find((g) => g.id === id);
}

export function vacancies(group: GroupDef): number {
  return Math.max(0, group.participantsMax - group.participantsCurrent);
}

export function groupDisplayStatus(group: GroupDef, current: number): GroupStatus {
  if (current >= group.participantsMax) return "completo";
  return group.status;
}

export function roundsCount(group: GroupDef): number {
  return Math.ceil(group.participantsMax / group.beneficiariesPerRound);
}

function addInterval(date: Date, frequency: GroupFrequency, steps: number): Date {
  const d = new Date(date);
  if (frequency === "semanal") {
    d.setDate(d.getDate() + steps * 7);
  } else {
    d.setMonth(d.getMonth() + steps);
  }
  return d;
}

export type RoundEntry = {
  round: number;
  date: Date;
  beneficiaries: { name: string; position: number }[];
  status: "concluida" | "agendada";
};

/** Gera o calendário completo de rodadas do grupo, de forma determinística. */
export function buildCalendar(group: GroupDef): RoundEntry[] {
  const total = roundsCount(group);
  const start = new Date(group.startDate);
  const now = new Date();

  const entries: RoundEntry[] = [];
  for (let round = 1; round <= total; round++) {
    const date = addInterval(start, group.frequency, round - 1);
    const beneficiaries = Array.from({ length: group.beneficiariesPerRound }, (_, i) => {
      const position = (round - 1) * group.beneficiariesPerRound + i + 1;
      const name = MOCK_PARTICIPANT_NAMES[(position - 1) % MOCK_PARTICIPANT_NAMES.length]!;
      return { name, position };
    });
    entries.push({
      round,
      date,
      beneficiaries,
      status: date.getTime() < now.getTime() ? "concluida" : "agendada",
    });
  }
  return entries;
}

export function nextRoundDate(group: GroupDef): Date {
  const calendar = buildCalendar(group);
  const next = calendar.find((r) => r.status === "agendada");
  return next?.date ?? calendar[calendar.length - 1]!.date;
}

export function formatKz(amount: number): string {
  return `${new Intl.NumberFormat("pt-AO").format(amount)} Kz`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
