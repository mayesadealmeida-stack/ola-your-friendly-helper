import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, CheckCircle2, Circle, Clock, AlertCircle, History } from "lucide-react";
import { useCompliance } from "@/hooks/use-compliance";
import { useProfile } from "@/hooks/use-profile";
import {
  LEVEL_ORDER,
  LEVEL_META,
  EVENT_META,
  formatRate,
  nextLevelRequirements,
} from "@/lib/compliance";
import { ComplianceGauge } from "@/components/compliance-card";

export const Route = createFileRoute("/nivel")({
  head: () => ({
    meta: [{ title: "Group Mobil — O seu nível" }],
  }),
  component: NivelPage,
});

function NivelPage() {
  const navigate = useNavigate();
  const { notAuthenticated, loading: profileLoading } = useProfile();
  const { stats, events, audit, loading } = useCompliance();

  useEffect(() => {
    if (!profileLoading && notAuthenticated) {
      navigate({ to: "/" });
    }
  }, [profileLoading, notAuthenticated, navigate]);

  if (notAuthenticated) return null;

  return (
    <div className="min-h-screen bg-secondary/40 pb-16">
      <div className="mx-auto max-w-md">
        <header
          className="px-5 pb-8 pt-6"
          style={{
            background:
              "radial-gradient(120% 140% at 82% 0%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 60%)",
          }}
        >
          <Link
            to="/perfil"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Perfil
          </Link>
          <p className="mt-3 font-display text-xl font-semibold text-white">O seu nível</p>
          <p className="mt-1 text-sm text-white/55">
            Como a sua taxa de cumprimento é calculada, passo a passo.
          </p>
        </header>

        <main className="-mt-4 space-y-5 px-5">
          {loading && (
            <div className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
              A carregar…
            </div>
          )}

          {!loading && !stats && (
            <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Ainda não há histórico de cumprimento associado à sua conta.
            </div>
          )}

          {stats && (
            <>
              {/* Situação atual */}
              <section className="rounded-3xl bg-card p-6 text-center shadow-sm">
                <ComplianceGauge
                  rate={Number(stats.compliance_rate)}
                  color={LEVEL_META[stats.level].ring}
                  size={104}
                />
                <p className="mt-3 font-display text-base font-semibold text-card-foreground">
                  {LEVEL_META[stats.level].emoji} {LEVEL_META[stats.level].label.toUpperCase()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {LEVEL_META[stats.level].permissions}
                </p>
              </section>

              {/* Requisitos do próximo nível */}
              <NextLevelRequirements stats={stats} />

              {/* Todos os níveis */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-sm font-semibold text-card-foreground">
                  Todos os níveis
                </h2>
                <ul className="mt-4 space-y-3">
                  {LEVEL_ORDER.map((key) => {
                    const meta = LEVEL_META[key];
                    const isCurrent = key === stats.level;
                    return (
                      <li
                        key={key}
                        className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                          isCurrent ? "border-brand-green/40 bg-brand-green/5" : "border-border"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${meta.chip}`}
                        >
                          {meta.emoji}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-card-foreground">{meta.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {meta.requirements.rate === 0
                              ? "Sem requisito mínimo de taxa"
                              : `Taxa a partir de ${meta.requirements.rate}%`}
                          </p>
                        </div>
                        {isCurrent && (
                          <span className="rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                            Atual
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Histórico de eventos */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <h2 className="font-display text-sm font-semibold text-card-foreground">
                    Histórico recente
                  </h2>
                </div>

                {events.length === 0 ? (
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Ainda não há eventos registados.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {events.map((event) => {
                      const meta = EVENT_META[event.event_type];
                      const Icon =
                        meta.tone === "good"
                          ? CheckCircle2
                          : meta.tone === "bad"
                            ? AlertCircle
                            : Clock;
                      return (
                        <li key={event.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                                meta.tone === "good"
                                  ? "bg-brand-green/15 text-brand-green-dark"
                                  : meta.tone === "bad"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                            </span>
                            <div>
                              <p className="text-sm text-card-foreground">{meta.label}</p>
                              <p className="text-xs text-muted-foreground">{event.description}</p>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              meta.tone === "good"
                                ? "text-brand-green-dark"
                                : meta.tone === "bad"
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {meta.sign}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Auditoria (mudanças de nível / alterações excecionais) */}
              {audit.length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="font-display text-sm font-semibold text-card-foreground">
                    Alterações registadas
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {audit.map((entry) => (
                      <li key={entry.id} className="text-sm">
                        <p className="text-card-foreground">{entry.reason}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString("pt-AO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          {entry.previous_level && entry.new_level
                            ? ` · ${LEVEL_META[entry.previous_level].label} → ${LEVEL_META[entry.new_level].label}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                O nível reflete o seu histórico de cumprimento. Não é garantia de pagamento nem de
                recebimento de qualquer valor.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function NextLevelRequirements({
  stats,
}: {
  stats: NonNullable<ReturnType<typeof useCompliance>["stats"]>;
}) {
  const { next, requirements, progress } = nextLevelRequirements(stats);

  if (!next) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-sm font-medium text-card-foreground">
          Já está no nível mais alto disponível. 🎉
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-card-foreground">
          Progresso para {LEVEL_META[next].emoji} {LEVEL_META[next].label}
        </h2>
        <span className="font-display text-sm font-semibold text-card-foreground">{progress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: LEVEL_META[next].ring }}
        />
      </div>

      <ul className="mt-4 space-y-2.5">
        {requirements.map((req) => (
          <li key={req.label} className="flex items-center gap-2.5 text-sm">
            {req.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green-dark" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={req.done ? "text-card-foreground" : "text-muted-foreground"}>
              {req.label}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{req.detail}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Taxa atual:{" "}
        <span className="font-semibold text-card-foreground">
          {formatRate(stats.compliance_rate)}
        </span>
      </p>
    </section>
  );
}
