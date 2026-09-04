import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Star,
  Lock,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useCompliance } from "@/hooks/use-compliance";
import { useGroupDetail } from "@/hooks/use-group-detail";
import { useWallet } from "@/hooks/use-wallet";
import { LEVEL_META, type ComplianceLevel } from "@/lib/compliance";
import {
  vacancies,
  levelAllows,
  beneficiariesForRound,
  formatKz,
  formatDate,
  type Group,
  type GroupParticipant,
  type GroupRound,
  type Contribution,
} from "@/lib/groups";

export const Route = createFileRoute("/grupos/$groupId")({
  head: () => ({
    meta: [{ title: "Group Mobil — Detalhe do grupo" }],
  }),
  component: GroupDetailPage,
});

function GroupDetailPage() {
  const { groupId } = useParams({ from: "/grupos/$groupId" });
  const { stats } = useCompliance();
  const userLevel: ComplianceLevel = stats?.level ?? "iniciante";

  const {
    group,
    participants,
    rounds,
    myParticipant,
    myContributions,
    loading,
    notFound,
    joinGroup,
    contributeFromWallet,
  } = useGroupDetail(groupId);

  const [confirming, setConfirming] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [justJoined, setJustJoined] = useState(false);
  const [showRules, setShowRules] = useState(false);

  async function handleConfirmJoin() {
    setJoining(true);
    setJoinError(null);
    const { error } = await joinGroup();
    setJoining(false);
    if (error) {
      setJoinError(error);
      return;
    }
    setConfirming(false);
    setJustJoined(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (notFound || !group) {
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

  const eligible = levelAllows(userLevel, group.min_level);
  const myPosition = myParticipant?.position ?? null;

  const myRound = myPosition
    ? rounds.find((r) =>
        beneficiariesForRound(group, r.round_number, participants).some(
          (slot) => slot.position === myPosition,
        ),
      )
    : null;
  const roundsUntilMine = myRound ? myRound.round_number - 1 : 0;
  const netAmount = Math.round(group.round_amount * (1 - group.fee_percent / 100));

  const currentRound = rounds.find((r) => r.status === "agendada") ?? rounds[rounds.length - 1];

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
            <StatusChip status={group.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-white/40">{group.code}</p>
        </header>

        <main className="-mt-2 space-y-5 px-5 py-5">
          {/* Resumo */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {group.participants_current}/{group.participants_max} participantes
              </span>
              <VacancyChip remaining={vacancies(group)} full={group.status === "completo"} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <Row label="Valor de entrada" value={formatKz(group.entry_fee)} />
              <Row label="Contribuição" value={formatKz(group.contribution)} />
              <Row
                label="Frequência"
                value={group.frequency === "semanal" ? "Semanal" : "Mensal"}
              />
              <Row label="Beneficiários por rodada" value={`${group.beneficiaries_per_round}`} />
              <Row label="Valor da rodada" value={formatKz(group.round_amount)} />
              <Row label="Início" value={formatDate(group.start_date)} />
            </dl>

            <p className="mt-3 text-xs font-medium text-muted-foreground">
              Nível mínimo: {LEVEL_META[group.min_level].label}
            </p>
          </section>

          {/* Botão principal / estado de entrada */}
          {!myParticipant && (
            <>
              {eligible ? (
                <button
                  onClick={() => setConfirming(true)}
                  disabled={group.status !== "aberto"}
                  className="w-full rounded-2xl bg-brand-green py-4 text-center font-display text-sm font-semibold text-primary-foreground shadow-md shadow-brand-green/25 transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {group.status === "aberto" ? "Entrar no grupo" : "Grupo completo"}
                </button>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
                  <Lock className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-card-foreground">
                    Você ainda não pode entrar neste grupo.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Este grupo exige o nível {LEVEL_META[group.min_level].label}. O seu nível atual
                    é {LEVEL_META[userLevel].label}.
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

          {myParticipant && justJoined && (
            <div className="flex items-center gap-3 rounded-2xl bg-brand-green/10 p-4 text-brand-green-dark">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">
                Você entrou no grupo! A sua posição é {myParticipant.position}.
              </p>
            </div>
          )}

          {/* Meu recebimento */}
          {myParticipant && myRound && (
            <section className="rounded-2xl bg-navy-900 p-5 text-white">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-brand-green" aria-hidden="true" />
                <p className="font-display text-sm font-semibold">Meu recebimento</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                <InfoRow label="Posição" value={`${myParticipant.position}`} light />
                <InfoRow label="Data prevista" value={formatDate(myRound.scheduled_date)} light />
                <InfoRow label="Valor bruto previsto" value={formatKz(group.round_amount)} light />
                <InfoRow label="Taxa Group Mobil" value={`${group.fee_percent}%`} light />
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
              {rounds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  O calendário deste grupo ainda vai ser gerado.
                </p>
              ) : (
                rounds.map((round) => (
                  <RoundRow
                    key={round.id}
                    group={group}
                    round={round}
                    participants={participants}
                    myPosition={myPosition}
                  />
                ))
              )}
            </div>
          </section>

          {/* Contribuições do utilizador */}
          {myParticipant && (
            <MyContributions contributions={myContributions} onSend={contributeFromWallet} />
          )}

          {/* Situação do grupo */}
          {currentRound && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="font-display text-sm font-semibold text-card-foreground">
                Estado da rodada {currentRound.round_number}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <p className="font-display text-base font-semibold text-card-foreground">
                    {formatKz(currentRound.expected_amount)}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">💰 Esperado</p>
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-brand-green-dark">
                    {formatKz(currentRound.confirmed_amount)}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">✅ Confirmado</p>
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-orange-600">
                    {formatKz(
                      Math.max(0, currentRound.expected_amount - currentRound.confirmed_amount),
                    )}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">⚠️ Pendente</p>
                </div>
              </div>
            </section>
          )}

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

      {confirming && (
        <ConfirmJoinSheet
          group={group}
          nextPosition={group.participants_current + 1}
          joining={joining}
          error={joinError}
          onCancel={() => {
            setConfirming(false);
            setJoinError(null);
          }}
          onConfirm={handleConfirmJoin}
        />
      )}

      {showRules && <RulesSheet group={group} onClose={() => setShowRules(false)} />}
    </div>
  );
}

function ConfirmJoinSheet({
  group,
  nextPosition,
  joining,
  error,
  onCancel,
  onConfirm,
}: {
  group: Group;
  nextPosition: number;
  joining: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [accepted, setAccepted] = useState(false);

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
            <dd className="font-medium text-card-foreground">{formatKz(group.entry_fee)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Contribuição {group.frequency === "semanal" ? "semanal" : "mensal"}
            </dt>
            <dd className="font-medium text-card-foreground">{formatKz(group.contribution)}</dd>
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

        {error && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <button
          onClick={onConfirm}
          disabled={!accepted || joining}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joining && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Confirmar entrada
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          A sua posição será {nextPosition} de {group.participants_max}.
        </p>
      </div>
    </div>
  );
}

function MyContributions({
  contributions,
  onSend,
}: {
  contributions: Contribution[];
  onSend: (id: string) => Promise<{ error: string | null }>;
}) {
  const { balance, loading: walletLoading } = useWallet();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = contributions.find((c) => c.status === "pendente" || c.status === "atrasada");
  const insufficient = !!next && balance < Number(next.amount);

  async function handleSend() {
    if (!next) return;
    setError(null);
    setSendingId(next.id);
    const { error: sendError } = await onSend(next.id);
    setSendingId(null);
    if (sendError) setError(sendError);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-card-foreground">
          💳 Minhas contribuições
        </p>
        <span className="text-xs text-muted-foreground">
          Saldo na carteira: {walletLoading ? "…" : formatKz(balance)}
        </span>
      </div>

      {next && (
        <div className="mt-3 rounded-xl bg-secondary px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {next.status === "atrasada" ? "Contribuição atrasada" : "Próxima contribuição"}
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold text-card-foreground">
            {formatKz(next.amount)}
          </p>
          <p className="text-xs text-muted-foreground">
            Rodada {next.round_number} · {formatDate(next.due_date)}
          </p>

          {error && (
            <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {insufficient ? (
            <div className="mt-3">
              <p className="text-xs text-destructive">
                Saldo insuficiente na carteira para enviar esta contribuição.
              </p>
              <Link
                to="/carteira/depositar"
                className="mt-2 inline-block rounded-lg bg-brand-green px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-brand-green-dark"
              >
                Depositar na carteira
              </Link>
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={sendingId === next.id}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-green px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendingId === next.id && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              Enviar da carteira
            </button>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {contributions
          .filter((c) => c.status === "confirmada")
          .slice(-5)
          .reverse()
          .map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Rodada {c.round_number} — {formatKz(c.amount)}
              </span>
              <span className="flex items-center gap-1 text-brand-green-dark">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Pago
              </span>
            </div>
          ))}
      </div>
    </section>
  );
}

function RulesSheet({ group, onClose }: { group: Group; onClose: () => void }) {
  const topics = [
    "Entrada",
    "Cotas",
    "Contribuições",
    "Calendário",
    "Recebimentos",
    "Atrasos",
    "Reserva de continuidade",
    `Taxa Group Mobil (${group.fee_percent}%)`,
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
          As regras detalhadas de cada tópico serão apresentadas aqui numa próxima etapa.
        </p>
      </div>
    </div>
  );
}

function RoundRow({
  group,
  round,
  participants,
  myPosition,
}: {
  group: Group;
  round: GroupRound;
  participants: GroupParticipant[];
  myPosition: number | null;
}) {
  const slots = beneficiariesForRound(group, round.round_number, participants);
  const isMine = myPosition != null && slots.some((s) => s.position === myPosition);

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        isMine ? "border-brand-green/40 bg-brand-green/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-card-foreground">
          {isMine && "⭐ "}Rodada {round.round_number}
        </p>
        {round.status === "concluida" ? (
          <span className="flex items-center gap-1 text-xs font-medium text-brand-green-dark">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Concluída
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Agendada
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{formatDate(round.scheduled_date)}</p>
      <div className="mt-2 space-y-1">
        {slots.map((slot) => (
          <p key={slot.position} className="text-xs text-card-foreground">
            👤{" "}
            {slot.participant
              ? myPosition === slot.position
                ? "Você"
                : slot.participant.display_name
              : "Vaga por preencher"}{" "}
            · Posição {slot.position}
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

function StatusChip({ status }: { status: Group["status"] }) {
  if (status === "completo") {
    return (
      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white">
        🔴 Completo
      </span>
    );
  }
  if (status === "encerrado") {
    return (
      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">
        Encerrado
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
