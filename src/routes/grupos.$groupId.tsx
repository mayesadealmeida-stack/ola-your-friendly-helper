import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, Star, Lock, ChevronRight, X } from "lucide-react";
import { useCompliance } from "@/hooks/use-compliance";
import { LEVEL_META, LEVEL_ORDER, type ComplianceLevel } from "@/lib/compliance";
import {
  getGroupById,
  buildCalendar,
  vacancies,
  groupDisplayStatus,
  formatKz,
  formatDate,
  type GroupDef,
  type RoundEntry,
} from "@/lib/groups-mock";

export const Route = createFileRoute("/grupos/$groupId")({
  head: () => ({
    meta: [{ title: "Group Mobil — Detalhe do grupo" }],
  }),
  component: GroupDetailPage,
});

function levelAllows(userLevel: ComplianceLevel, minLevel: ComplianceLevel): boolean {
  return LEVEL_ORDER.indexOf(userLevel) >= LEVEL_ORDER.indexOf(minLevel);
}

type JoinState =
  { status: "not_joined" } | { status: "confirming" } | { status: "joined"; position: number };

function GroupDetailPage() {
  const { groupId } = useParams({ from: "/grupos/$groupId" });
  const { stats } = useCompliance();
  const userLevel: ComplianceLevel = stats?.level ?? "iniciante";
  const [joinState, setJoinState] = useState<JoinState>({ status: "not_joined" });
  const [showRules, setShowRules] = useState(false);

  const group = getGroupById(groupId);

  // Participante extra simulado localmente ao "entrar" — só nesta sessão,
  // ainda sem gravar em lado nenhum (isso fica para a etapa da lógica real).
  const extraParticipant = joinState.status === "joined" ? 1 : 0;
  const effectiveCurrent = group ? group.participantsCurrent + extraParticipant : 0;

  const calendar = useMemo(() => (group ? buildCalendar(group) : []), [group]);

  if (!group) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 text-center">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">Grupo não encontrado</p>
          <Link
            to="/grupos"
            className="mt-3 inline-block text-sm font-semibold text-brand-green-dark"
          >
            ← Voltar aos grupos
          </Link>
        </div>
      </div>
    );
  }

  const status = groupDisplayStatus(group, effectiveCurrent);
  const eligible = levelAllows(userLevel, group.minLevel);
  const myPosition = joinState.status === "joined" ? joinState.position : null;
  const myRound = myPosition
    ? calendar.find((r) => r.beneficiaries.some((b) => b.position === myPosition))
    : null;
  const roundsUntilMine = myRound ? myRound.round - 1 : 0;
  const netAmount = Math.round(group.roundAmount * (1 - group.feePercent / 100));

  return (
    <div className="min-h-screen bg-secondary/40 pb-16">
      <div className="mx-auto max-w-md">
        <header
          className="px-5 pb-6 pt-6"
          style={{
            background:
              "radial-gradient(120% 140% at 82% 0%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 60%)",
          }}
        >
          <Link
            to="/grupos"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>
          <div className="mt-3 flex items-center justify-between">
            <p className="font-display text-xl font-semibold text-white">{group.name}</p>
            <StatusChip status={status} />
          </div>
          <p className="mt-1 font-mono text-xs text-white/40">{group.code}</p>
        </header>

        <main className="-mt-2 space-y-5 px-5 py-5">
          {/* Resumo */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {effectiveCurrent}/{group.participantsMax} participantes
              </span>
              <VacancyChip
                remaining={vacancies({ ...group, participantsCurrent: effectiveCurrent })}
                full={status === "completo"}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <Row label="Valor de entrada" value={formatKz(group.entryFee)} />
              <Row label="Contribuição" value={formatKz(group.contribution)} />
              <Row
                label="Frequência"
                value={group.frequency === "semanal" ? "Semanal" : "Mensal"}
              />
              <Row label="Duração" value={group.durationLabel} />
              <Row label="Beneficiários por rodada" value={`${group.beneficiariesPerRound}`} />
              <Row label="Valor da rodada" value={formatKz(group.roundAmount)} />
            </dl>

            <p className="mt-3 text-xs font-medium text-muted-foreground">
              Nível mínimo: {LEVEL_META[group.minLevel].label}
            </p>
          </section>

          {/* Botão principal / estado de entrada */}
          {joinState.status === "not_joined" && (
            <>
              {eligible ? (
                <button
                  onClick={() => setJoinState({ status: "confirming" })}
                  disabled={status === "completo"}
                  className="w-full rounded-2xl bg-brand-green py-4 text-center font-display text-sm font-semibold text-primary-foreground shadow-md shadow-brand-green/25 transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "completo" ? "Grupo completo" : "Entrar no grupo"}
                </button>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
                  <Lock className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-card-foreground">
                    Você ainda não pode entrar neste grupo.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Este grupo exige o nível {LEVEL_META[group.minLevel].label}. O seu nível atual é{" "}
                    {LEVEL_META[userLevel].label}.
                  </p>
                  <Link
                    to="/nivel"
                    className="mt-3 inline-block text-xs font-semibold text-brand-green-dark"
                  >
                    Ver o meu nível →
                  </Link>
                </div>
              )}
            </>
          )}

          {joinState.status === "joined" && (
            <div className="flex items-center gap-3 rounded-2xl bg-brand-green/10 p-4 text-brand-green-dark">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">Você entrou no grupo!</p>
            </div>
          )}

          {/* Meu recebimento */}
          {joinState.status === "joined" && myRound && myPosition && (
            <section className="rounded-2xl bg-navy-900 p-5 text-white">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-brand-green" aria-hidden="true" />
                <p className="font-display text-sm font-semibold">Meu recebimento</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                <InfoRow label="Posição" value={`${myPosition}`} light />
                <InfoRow label="Data prevista" value={formatDate(myRound.date)} light />
                <InfoRow label="Valor bruto previsto" value={formatKz(group.roundAmount)} light />
                <InfoRow label="Taxa Group Mobil" value={`${group.feePercent}%`} light />
              </div>
              <p className="mt-3 border-t border-white/10 pt-3 text-sm">
                Valor líquido previsto:{" "}
                <span className="font-display font-semibold">{formatKz(netAmount)}</span>
              </p>
              <p className="mt-1 text-xs text-white/50">
                {roundsUntilMine > 0
                  ? `Faltam ${roundsUntilMine} rodadas para a sua vez.`
                  : "É a sua rodada!"}
              </p>
            </section>
          )}

          {/* Calendário */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm font-semibold text-card-foreground">
              📅 Calendário de recebimentos
            </p>
            <div className="mt-4 space-y-3">
              {calendar.map((entry) => (
                <RoundRow key={entry.round} entry={entry} myPosition={myPosition} />
              ))}
            </div>
          </section>

          {/* Contribuições do utilizador */}
          {joinState.status === "joined" && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="font-display text-sm font-semibold text-card-foreground">
                💳 Minhas contribuições
              </p>
              <div className="mt-3 rounded-xl bg-secondary px-4 py-3">
                <p className="text-xs text-muted-foreground">Próxima contribuição</p>
                <p className="mt-0.5 font-display text-lg font-semibold text-card-foreground">
                  {formatKz(group.contribution)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(calendar[0]?.date ?? new Date())}
                </p>
              </div>
            </section>
          )}

          {/* Situação do grupo */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm font-semibold text-card-foreground">
              Estado da rodada atual
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <p className="font-display text-base font-semibold text-card-foreground">
                  {formatKz(group.roundAmount)}
                </p>
                <p className="mt-0.5 text-muted-foreground">💰 Esperado</p>
              </div>
              <div>
                <p className="font-display text-base font-semibold text-brand-green-dark">
                  {formatKz(Math.round(group.roundAmount * 0.95))}
                </p>
                <p className="mt-0.5 text-muted-foreground">✅ Confirmado</p>
              </div>
              <div>
                <p className="font-display text-base font-semibold text-orange-600">
                  {formatKz(Math.round(group.roundAmount * 0.05))}
                </p>
                <p className="mt-0.5 text-muted-foreground">⚠️ Pendente</p>
              </div>
            </div>
          </section>

          {/* Como funciona */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm font-semibold text-card-foreground">
              ℹ️ Como funciona este grupo
            </p>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              {[
                "Você entra no grupo.",
                "O sistema regista a sua posição.",
                "Você contribui conforme o calendário.",
                "Cada rodada tem um ou mais beneficiários.",
                "O calendário mostra quando cada participante recebe.",
                "Quando chegar a sua vez, poderá solicitar o recebimento conforme as regras.",
                "A taxa da Group Mobil é apresentada antes do recebimento.",
                "Todas as operações ficam registadas.",
              ].map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="font-display font-semibold text-brand-green-dark">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {/* Regras */}
          <button
            onClick={() => setShowRules(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-5 py-4"
          >
            <span className="font-display text-sm font-semibold text-card-foreground">
              📋 Ver regras completas
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </main>
      </div>

      {joinState.status === "confirming" && (
        <ConfirmJoinSheet
          group={group}
          position={effectiveCurrent + 1}
          onCancel={() => setJoinState({ status: "not_joined" })}
          onConfirm={() => setJoinState({ status: "joined", position: effectiveCurrent + 1 })}
        />
      )}

      {showRules && <RulesSheet group={group} onClose={() => setShowRules(false)} />}
    </div>
  );
}

function ConfirmJoinSheet({
  group,
  position,
  onCancel,
  onConfirm,
}: {
  group: GroupDef;
  position: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const nextContribution = buildCalendar(group)[0]?.date ?? new Date();

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <p className="font-display text-base font-semibold text-card-foreground">
            Confirme a sua entrada
          </p>
          <button
            onClick={onCancel}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Grupo</dt>
            <dd className="font-medium text-card-foreground">{group.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Cota</dt>
            <dd className="font-medium text-card-foreground">{formatKz(group.entryFee)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Contribuição {group.frequency === "semanal" ? "semanal" : "mensal"}
            </dt>
            <dd className="font-medium text-card-foreground">{formatKz(group.contribution)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Próxima contribuição</dt>
            <dd className="font-medium text-card-foreground">{formatDate(nextContribution)}</dd>
          </div>
        </dl>

        <label className="mt-5 flex items-start gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input text-brand-green focus:ring-ring"
          />
          Aceito as regras deste grupo
        </label>

        <button
          onClick={onConfirm}
          disabled={!accepted}
          className="mt-5 w-full rounded-xl bg-brand-green py-3 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirmar entrada
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          A sua posição será {position} de {group.participantsMax}.
        </p>
      </div>
    </div>
  );
}

function RulesSheet({ group, onClose }: { group: GroupDef; onClose: () => void }) {
  const topics = [
    "Entrada",
    "Cotas",
    "Contribuições",
    "Calendário",
    "Recebimentos",
    "Atrasos",
    "Reserva de continuidade",
    `Taxa Group Mobil (${group.feePercent}%)`,
    "Saída do grupo",
    "Encerramento do ciclo",
  ];
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <p className="font-display text-base font-semibold text-card-foreground">
            Regras do grupo
          </p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <ul className="mt-4 space-y-2.5">
          {topics.map((topic) => (
            <li
              key={topic}
              className="flex items-center justify-between border-b border-border pb-2.5 text-sm last:border-0"
            >
              <span className="text-card-foreground">{topic}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          As regras detalhadas de cada tópico serão apresentadas aqui quando a lógica do grupo
          estiver ligada ao sistema.
        </p>
      </div>
    </div>
  );
}

function RoundRow({ entry, myPosition }: { entry: RoundEntry; myPosition: number | null }) {
  const isMine = myPosition != null && entry.beneficiaries.some((b) => b.position === myPosition);

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        isMine ? "border-brand-green/40 bg-brand-green/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-card-foreground">
          {isMine && "⭐ "}Rodada {entry.round}
        </p>
        {entry.status === "concluida" ? (
          <span className="flex items-center gap-1 text-xs font-medium text-brand-green-dark">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Concluída
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Agendada
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.date)}</p>
      <div className="mt-2 space-y-1">
        {entry.beneficiaries.map((b) => (
          <p key={b.position} className="text-xs text-card-foreground">
            👤 {myPosition === b.position ? "Você" : b.name} · Posição {b.position}
          </p>
        ))}
      </div>
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

function InfoRow({ label, value, light }: { label: string; value: string; light?: boolean }) {
  return (
    <div>
      <dt className={`text-xs ${light ? "text-white/50" : "text-muted-foreground"}`}>{label}</dt>
      <dd className={`mt-0.5 font-medium ${light ? "text-white" : "text-card-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

function StatusChip({ status }: { status: GroupDef["status"] | "completo" }) {
  if (status === "completo") {
    return (
      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white">
        🔴 Completo
      </span>
    );
  }
  return (
    <span className="rounded-full bg-brand-green/20 px-2.5 py-1 text-[11px] font-semibold text-brand-green">
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
