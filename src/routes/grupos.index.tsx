import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, Lock, Users2, X } from "lucide-react";
import { useCompliance } from "@/hooks/use-compliance";
import { LEVEL_META, LEVEL_ORDER, type ComplianceLevel } from "@/lib/compliance";
import {
  MOCK_GROUPS,
  vacancies,
  groupDisplayStatus,
  nextRoundDate,
  formatKz,
  formatDate,
  type GroupDef,
} from "@/lib/groups-mock";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/grupos/")({
  head: () => ({
    meta: [{ title: "Group Mobil — Grupos" }],
  }),
  component: GruposPage,
});

type FilterKey = "todos" | "mensal" | "semanal" | "proximos" | "poucas_vagas";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "mensal", label: "Mensal" },
  { key: "semanal", label: "Semanal" },
  { key: "proximos", label: "Próximos" },
  { key: "poucas_vagas", label: "Poucas vagas" },
];

function levelAllows(userLevel: ComplianceLevel, minLevel: ComplianceLevel): boolean {
  return LEVEL_ORDER.indexOf(userLevel) >= LEVEL_ORDER.indexOf(minLevel);
}

function GruposPage() {
  const { stats } = useCompliance();
  const userLevel: ComplianceLevel = stats?.level ?? "iniciante";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [showBlockedNotice, setShowBlockedNotice] = useState(false);

  const canCreate = levelAllows(userLevel, "confiavel");

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return MOCK_GROUPS.filter((group) => {
      const matchesSearch =
        !query ||
        group.name.toLowerCase().includes(query) ||
        group.code.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (filter === "mensal") return group.frequency === "mensal";
      if (filter === "semanal") return group.frequency === "semanal";
      if (filter === "poucas_vagas") return vacancies(group) <= 5 && vacancies(group) > 0;
      if (filter === "proximos") {
        const daysUntil = (nextRoundDate(group).getTime() - Date.now()) / 86_400_000;
        return daysUntil >= 0 && daysUntil <= 14;
      }
      return true;
    });
  }, [search, filter]);

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <header
          className="px-5 pb-6 pt-8"
          style={{
            background:
              "radial-gradient(120% 140% at 82% 0%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 60%)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-xl font-semibold text-white">Grupos</p>
            <CreateGroupButton canCreate={canCreate} onBlocked={() => setShowBlockedNotice(true)} />
          </div>
          <p className="mt-1 text-sm text-white/55">
            Veja, pesquise e entre nos grupos disponíveis.
          </p>

          <div className="relative mt-5">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder="Procurar um grupo por nome ou código"
              className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-10 pr-3.5 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-brand-green focus:bg-white/15"
            />
          </div>
        </header>

        <div className="border-b border-border bg-card px-5 py-3">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === f.key
                    ? "bg-brand-green text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <main className="space-y-4 px-5 py-5">
          {filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
              <Users2 className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum grupo encontrado com esses filtros.
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <GroupCard key={group.id} group={group} userLevel={userLevel} />
            ))
          )}
        </main>
      </div>

      {showBlockedNotice && (
        <BlockedLevelDialog level={userLevel} onClose={() => setShowBlockedNotice(false)} />
      )}

      <BottomNav active="grupos" />
    </div>
  );
}

function CreateGroupButton({
  canCreate,
  onBlocked,
}: {
  canCreate: boolean;
  onBlocked: () => void;
}) {
  if (canCreate) {
    return (
      <button className="flex items-center gap-1.5 rounded-full bg-brand-green px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-brand-green-dark">
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        Criar grupo
      </button>
    );
  }

  return (
    <button
      onClick={onBlocked}
      className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/50"
    >
      <Lock className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
      Criar grupo
    </button>
  );
}

function BlockedLevelDialog({ level, onClose }: { level: ComplianceLevel; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Lock className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-4 font-display text-base font-semibold text-card-foreground">
          Criação de grupos indisponível
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Você ainda está no nível <strong>{LEVEL_META[level].label}</strong>. Continue participando
          de grupos e construindo o seu histórico de cumprimento para desbloquear esta função.
        </p>
        <Link
          to="/nivel"
          onClick={onClose}
          className="mt-5 block w-full rounded-xl bg-brand-green py-3 text-center text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark"
        >
          Ver o meu nível
        </Link>
      </div>
    </div>
  );
}

function GroupCard({ group, userLevel }: { group: GroupDef; userLevel: ComplianceLevel }) {
  const current = group.participantsCurrent;
  const remaining = vacancies(group);
  const status = groupDisplayStatus(group, current);
  const eligible = levelAllows(userLevel, group.minLevel);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="font-display text-base font-semibold text-card-foreground">{group.name}</p>
        <StatusChip status={status} />
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {current}/{group.participantsMax} participantes
        </span>
        <VacancyChip remaining={remaining} full={status === "completo"} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <Row label="💰 Valor de entrada" value={formatKz(group.entryFee)} />
        <Row label="🔄 Contribuição" value={formatKz(group.contribution)} />
        <Row label="📅 Frequência" value={group.frequency === "semanal" ? "Semanal" : "Mensal"} />
        <Row label="⏳ Duração" value={group.durationLabel} />
        <Row label="🎁 Recebimento por rodada" value={formatKz(group.roundAmount)} />
        <Row
          label="👥 Beneficiários por rodada"
          value={`${group.beneficiariesPerRound} pessoa(s)`}
        />
      </dl>

      <p className="mt-3 text-sm text-muted-foreground">
        📅 Próxima rodada:{" "}
        <span className="text-card-foreground">{formatDate(nextRoundDate(group))}</span>
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span
          className={`text-xs font-medium ${eligible ? "text-muted-foreground" : "text-destructive"}`}
        >
          Nível mínimo: {LEVEL_META[group.minLevel].label}
        </span>
      </div>

      <Link
        to="/grupos/$groupId"
        params={{ groupId: group.id }}
        className="mt-4 block w-full rounded-xl bg-brand-green py-3 text-center text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark"
      >
        Ver grupo
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-card-foreground">{value}</dd>
    </div>
  );
}

function StatusChip({ status }: { status: GroupDef["status"] | "completo" }) {
  if (status === "completo") {
    return (
      <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
        🔴 Grupo completo
      </span>
    );
  }
  if (status === "andamento") {
    return (
      <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
        🟠 Em andamento
      </span>
    );
  }
  return (
    <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-[11px] font-semibold text-brand-green-dark">
      🟢 Aberto
    </span>
  );
}

function VacancyChip({ remaining, full }: { remaining: number; full: boolean }) {
  if (full) return null;
  if (remaining <= 2) {
    return (
      <span className="text-xs font-semibold text-orange-600">
        🟠 {remaining} {remaining === 1 ? "vaga restante" : "vagas restantes"}
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-brand-green-dark">
      🟢 {remaining} vagas restantes
    </span>
  );
}
