import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, HandCoins, Loader2, PiggyBank, Sparkles, Users } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";
import { useInvestments, type UserInvestment } from "@/hooks/use-investments";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/minha-coleta")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Minha Coleta" },
      {
        name: "description",
        content:
          "Acompanhe o dinheiro que já recebeu dos seus grupos na Group Mobil e o histórico de cada coleta.",
      },
      { property: "og:title", content: "Group Mobil — Minha Coleta" },
      {
        property: "og:description",
        content: "O que já recebeu dos seus grupos e o histórico de cada coleta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MinhaColetaPage,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(n);
const fmtInvestment = (n: number) =>
  new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-AO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MinhaColetaPage() {
  const navigate = useNavigate();
  const { loading: profileLoading, notAuthenticated } = useProfile();
  const wallet = useWallet();
  const investmentData = useInvestments();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!profileLoading && notAuthenticated) navigate({ to: "/" });
  }, [profileLoading, notAuthenticated, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (profileLoading || wallet.loading || investmentData.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (notAuthenticated) return null;

  const coletas = wallet.transactions.filter((t) => t.type === "recebimento_grupo");
  const recebido = coletas
    .filter((t) => t.status === "confirmado")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const aCaminho = coletas
    .filter((t) => t.status === "pendente")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const contribuido = wallet.transactions
    .filter((t) => t.type === "contribuicao_grupo" && t.status === "confirmado")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const activeInvestments = investmentData.investments.filter((investment) => investment.status === "active");

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <header className="bg-navy-900 px-5 pb-8 pt-8 text-white">
          <Link
            to="/home"
            className="mb-4 inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>

          <h1 className="flex items-center gap-2 font-display text-xl font-bold">
            <HandCoins className="h-5 w-5 text-brand-green" aria-hidden="true" />
            Minha Coleta
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Tudo o que já recebeu dos seus grupos, numa só página.
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-medium text-white/55">Já recebido</p>
            <p className="mt-1 font-display text-3xl font-bold">Kz {fmt(recebido)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="font-display text-base font-bold">Kz {fmt(aCaminho)}</p>
                <p className="mt-0.5 text-[11px] text-white/55">A caminho</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="font-display text-base font-bold">Kz {fmt(contribuido)}</p>
                <p className="mt-0.5 text-[11px] text-white/55">Já contribuído</p>
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-4 px-5 pt-6">
          {activeInvestments.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-foreground">Investimentos ativos</h2>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Em crescimento
                </span>
              </div>
              <div className="space-y-4">
                {activeInvestments.map((investment) => (
                  <InvestmentCard
                    key={investment.id}
                    investment={investment}
                    now={now}
                    onRedeem={investmentData.redeemInvestment}
                  />
                ))}
              </div>
            </section>
          )}

          <h2 className="font-display text-sm font-semibold text-foreground">
            Histórico de coletas
          </h2>

          {coletas.length === 0 ? (
            <section className="rounded-2xl border border-border bg-card px-5 py-8 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-navy-900">
                <PiggyBank className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-card-foreground">
                Ainda não recebeu nenhuma coleta
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Quando chegar a sua vez num grupo, o valor aparece aqui automaticamente.
              </p>
              <Link
                to="/grupos"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-navy-900 px-5 py-3 font-display text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Ver grupos
              </Link>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              {coletas.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 px-5 py-4 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green-dark">
                    <HandCoins className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-card-foreground">Coleta do grupo</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(t.confirmed_at ?? t.created_at)}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold text-card-foreground">
                      Kz {fmt(Math.abs(Number(t.amount)))}
                    </p>
                    <p
                      className={`mt-0.5 text-[11px] font-semibold ${
                        t.status === "confirmado"
                          ? "text-brand-green-dark"
                          : t.status === "pendente"
                            ? "text-amber-600"
                            : "text-destructive"
                      }`}
                    >
                      {t.status === "confirmado"
                        ? "Recebido"
                        : t.status === "pendente"
                          ? "Em processamento"
                          : "Rejeitado"}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            A coleta é o valor que recebe quando chega a sua vez no grupo. O nível de cumprimento
            mostra o seu histórico e não é garantia de recebimento.
          </p>
        </main>
      </div>

      <BottomNav active="home" />
    </div>
  );
}

function investmentProgress(investment: UserInvestment, now: number): number {
  const start = new Date(investment.started_at).getTime();
  const end = new Date(investment.ends_at).getTime();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

function remainingTime(investment: UserInvestment, now: number): string {
  const remaining = Math.max(0, new Date(investment.ends_at).getTime() - now);
  if (!remaining) return "Prazo concluído";
  const totalMinutes = Math.floor(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m restantes`;
}

function InvestmentCard({
  investment,
  now,
  onRedeem,
}: {
  investment: UserInvestment;
  now: number;
  onRedeem: (investmentId: string) => Promise<{ error: string | null }>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = investmentProgress(investment, now);
  const completed = progress >= 1;
  const entry = Number(investment.entry_amount);
  const expected = Number(investment.expected_amount);
  const accumulated = entry + (expected - entry) * progress;

  async function handleRedeem() {
    setError(null);
    setBusy(true);
    const result = await onRedeem(investment.id);
    setBusy(false);
    if (result.error) setError(result.error);
  }

  return (
    <article className="overflow-hidden rounded-3xl bg-[#090b10] p-5 text-white shadow-xl shadow-black/15">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400/80">
            Coleta de investimento
          </p>
          <h3 className="mt-1 truncate font-display text-base font-bold">
            {investment.plan?.name ?? "Plano de investimento"}
          </h3>
        </div>
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
          {completed ? "Disponível" : "A acumular"}
        </span>
      </div>

      <div className="mt-5 flex justify-center">
        <div
          className="investment-energy-ring"
          style={{
            background: `conic-gradient(#f7931a ${progress * 360}deg, rgba(255,255,255,0.08) 0deg)`,
          }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label={`Progresso de ${Math.round(progress * 100)}%`}
        >
          <div className="investment-energy-core">
            <span className="investment-bitcoin">₿</span>
            <p className="mt-1 font-display text-xl font-bold tracking-tight">
              Kz {fmtInvestment(accumulated)}
            </p>
            <p className="mt-0.5 text-[11px] text-white/55">Acumulando BTC</p>
            <p className="mt-1 text-xs font-semibold text-amber-300">
              {(progress * 100).toFixed(1).replace(".", ",")}% concluído
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="text-xs font-medium text-white/60">{remainingTime(investment, now)}</p>
        <p className="mt-1 text-[11px] text-white/35">
          Entrada: Kz {fmtInvestment(entry)} · Retorno estimado: Kz {fmtInvestment(expected)}
        </p>
      </div>

      {completed ? (
        <button
          type="button"
          onClick={handleRedeem}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          {busy ? "A resgatar…" : "Resgatar investimento"}
        </button>
      ) : (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs text-white/55">
          O resgate ficará disponível quando o prazo terminar.
        </div>
      )}

      {error && <p className="mt-3 text-center text-xs font-medium text-red-300">{error}</p>}
    </article>
  );
}
