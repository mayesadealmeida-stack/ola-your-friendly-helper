import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, HandCoins, Loader2, PiggyBank, Users } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile } from "@/hooks/use-profile";
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

  useEffect(() => {
    if (!profileLoading && notAuthenticated) navigate({ to: "/" });
  }, [profileLoading, notAuthenticated, navigate]);

  if (profileLoading || wallet.loading) {
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
