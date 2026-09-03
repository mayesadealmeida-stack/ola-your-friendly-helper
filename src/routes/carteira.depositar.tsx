import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Loader2, Smartphone } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { maskPhone, usePaymentMethods } from "@/hooks/use-payment-methods";

export const Route = createFileRoute("/carteira/depositar")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Depositar" },
      {
        name: "description",
        content: "Deposite na sua carteira Group Mobil através do PayPay África.",
      },
    ],
  }),
  component: DepositarPage,
});

function DepositarPage() {
  const navigate = useNavigate();
  const { notAuthenticated, loading: profileLoading } = useProfile();
  const { getMethod, loading: methodsLoading } = usePaymentMethods();

  const loading = profileLoading || methodsLoading;

  useEffect(() => {
    if (!loading && notAuthenticated) navigate({ to: "/" });
  }, [loading, notAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (notAuthenticated) return null;

  const paypay = getMethod("paypay_africa");

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
          <div className="flex items-center gap-3">
            <Link
              to="/carteira"
              aria-label="Voltar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4.5 w-4.5" strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-display text-base font-semibold text-white">Depositar</h1>
              <p className="text-xs text-white/55">Via PayPay África</p>
            </div>
          </div>
        </header>

        <main className="space-y-5 px-5 pt-6">
          <section className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green-dark">
              <Smartphone className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-card-foreground">
                Todos os depósitos são feitos via PayPay África
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Envie o valor pretendido a partir da sua conta PayPay África.
              </p>
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
            <p className="text-xs font-medium text-muted-foreground">O seu número PayPay África</p>
            {paypay?.phone ? (
              <div className="mt-2 flex items-center justify-between">
                <p className="font-display text-lg font-semibold text-card-foreground">
                  {maskPhone(paypay.phone)}
                </p>
                <Link
                  to="/carteira/metodo/$method"
                  params={{ method: "paypay_africa" }}
                  className="text-xs font-semibold text-brand-green-dark hover:underline"
                >
                  Editar
                </Link>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  Ainda não configurou o seu número PayPay África.
                </p>
                <Link
                  to="/carteira/metodo/$method"
                  params={{ method: "paypay_africa" }}
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark"
                >
                  Adicionar número PayPay África
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
            <h2 className="font-display text-sm font-semibold text-card-foreground">
              Como funciona
            </h2>
            <ol className="mt-3 space-y-3">
              <Step number={1} text="Confirme o seu número PayPay África acima." />
              <Step
                number={2}
                text="Abra a app PayPay África e envie o valor que quer depositar."
              />
              <Step
                number={3}
                text="Assim que o pagamento for confirmado, o saldo entra na sua carteira."
              />
            </ol>
          </section>
        </main>
      </div>
    </div>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-navy-900">
        {number}
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </li>
  );
}
