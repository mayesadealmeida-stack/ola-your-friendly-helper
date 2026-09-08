import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, TrendingUp, X } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { usePlans, type InvestmentPlan } from "@/hooks/use-plans";
import { useInvestments } from "@/hooks/use-investments";
import { formatKz } from "@/lib/groups";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [{ title: "Group Mobil — Mercado" }],
  }),
  component: MercadoPage,
});

function MercadoPage() {
  const { plans, loading, error } = usePlans();
  const { createInvestment } = useInvestments();
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <header className="bg-navy-900 px-5 pb-7 pt-7">
          <p className="font-display text-xl font-semibold text-white">Mercado</p>
          <p className="mt-1 text-sm text-white/55">
            Conheça os planos disponíveis e escolha onde quer investir.
          </p>
        </header>

        <main className="space-y-4 px-5 pt-5">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-destructive/10 p-4 text-center text-xs text-destructive">
              Não foi possível carregar os planos agora.
            </div>
          )}

          {!loading && !error && plans.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
              <TrendingUp className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-card-foreground">
                Ainda não há planos disponíveis.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Os novos planos publicados pela equipa aparecerão aqui.
              </p>
            </div>
          )}

          {plans.map((plan) => (
            <MarketPlanCard key={plan.id} plan={plan} onInvest={() => setSelectedPlan(plan)} />
          ))}
        </main>
      </div>

      {selectedPlan && (
        <InvestDialog
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onConfirm={() => createInvestment(selectedPlan.id)}
        />
      )}

      <BottomNav active="mercado" />
    </div>
  );
}

function MarketPlanCard({
  plan,
  onInvest,
}: {
  plan: InvestmentPlan;
  onInvest: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {plan.image_url ? (
        <img src={plan.image_url} alt={plan.name} className="h-44 w-full object-cover" />
      ) : (
        <div className="flex h-32 items-center justify-center bg-gradient-to-br from-navy-900 to-navy-800">
          <TrendingUp className="h-10 w-10 text-brand-green" aria-hidden="true" />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-card-foreground">{plan.name}</h2>
          <span className="shrink-0 rounded-full bg-brand-green/15 px-2.5 py-1 text-[10px] font-semibold text-brand-green-dark">
            Disponível
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-[11px] text-muted-foreground">Preço de entrada</p>
            <p className="mt-1 font-display text-sm font-bold text-card-foreground">
              {formatKz(Number(plan.entry_price))}
            </p>
          </div>
          <div className="rounded-2xl bg-brand-green/10 p-3">
            <p className="text-[11px] text-muted-foreground">Retorno estimado</p>
            <p className="mt-1 font-display text-sm font-bold text-brand-green-dark">
              {formatKz(Number(plan.estimated_return))}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Duração: {plan.duration_value} {plan.duration_unit}
        </p>

        <button
          type="button"
          onClick={onInvest}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 text-sm font-bold text-primary-foreground transition hover:bg-brand-green-dark"
        >
          Investir neste plano
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function InvestDialog({
  plan,
  onClose,
  onConfirm,
}: {
  plan: InvestmentPlan;
  onClose: () => void;
  onConfirm: () => Promise<{ error: string | null }>;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    const result = await onConfirm();
    setBusy(false);
    if (result.error) {
      setError(
        result.error.includes("Saldo insuficiente")
          ? "Saldo insuficiente. Recarregue a sua carteira para investir neste plano."
          : result.error,
      );
      return;
    }
    setConfirmed(true);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className="flex items-center justify-between bg-navy-900 px-5 py-4 text-white">
          <div>
            <p className="font-display text-base font-bold">Investir</p>
            <p className="mt-0.5 text-xs text-white/60">{plan.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-white/70 hover:text-white">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5">
          {confirmed ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-brand-green-dark" aria-hidden="true" />
              <p className="mt-3 font-display text-base font-semibold text-card-foreground">
                Plano selecionado
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                O investimento foi criado e já pode acompanhá-lo em Minha Coleta. O valor vai
                crescer progressivamente até ao fim do prazo.
              </p>
              <Link
                to="/minha-coleta"
                className="mt-5 block rounded-2xl bg-brand-green py-3.5 text-center text-sm font-bold text-primary-foreground"
              >
                Ver Minha Coleta
              </Link>
              <button type="button" onClick={onClose} className="mt-3 text-xs font-semibold text-muted-foreground">
                Fechar
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Está a escolher investir <strong className="text-card-foreground">{formatKz(Number(plan.entry_price))}</strong>{" "}
                no plano <strong className="text-card-foreground">{plan.name}</strong>.
              </p>
              <div className="mt-4 rounded-2xl bg-secondary p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Retorno estimado</span>
                  <strong className="text-brand-green-dark">{formatKz(Number(plan.estimated_return))}</strong>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Duração</span>
                  <strong className="text-card-foreground">
                    {plan.duration_value} {plan.duration_unit}
                  </strong>
                </div>
              </div>
              {error && (
                <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {busy ? "A criar investimento…" : "Confirmar investimento"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
