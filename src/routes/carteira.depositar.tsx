import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Smartphone, Paperclip, CheckCircle2, X } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { maskPhone, usePaymentMethods } from "@/hooks/use-payment-methods";
import { useWallet } from "@/hooks/use-wallet";

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
  const { requestDeposit } = useWallet();

  const loading = profileLoading || methodsLoading;

  const [amount, setAmount] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const amountValue = Number(amount.replace(/\D/g, ""));

  async function handleSubmit() {
    setError(null);

    if (!amountValue || amountValue <= 0) {
      setError("Indique o valor que depositou.");
      return;
    }
    if (!proofFile) {
      setError("Anexe o comprovativo do depósito (foto ou PDF).");
      return;
    }

    setSubmitting(true);
    const { error: submitError } = await requestDeposit(amountValue, "paypay_africa", proofFile);
    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }
    setSubmitted(true);
    setAmount("");
    setProofFile(null);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/40 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/15 text-brand-green-dark">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="mt-4 font-display text-lg font-semibold text-foreground">
          Depósito em análise
        </p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Recebemos o seu comprovativo. Assim que a equipa Group Mobil o confirmar, o saldo entra
          automaticamente na sua carteira.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setSubmitted(false)}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground transition hover:bg-accent"
          >
            Fazer outro depósito
          </button>
          <Link
            to="/carteira"
            className="rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark"
          >
            Voltar à carteira
          </Link>
        </div>
      </div>
    );
  }

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
              <Step number={3} text="Volte aqui, indique o valor e anexe o comprovativo." />
              <Step
                number={4}
                text="Assim que a equipa confirmar o comprovativo, o saldo entra na sua carteira."
              />
            </ol>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
            <h2 className="font-display text-sm font-semibold text-card-foreground">
              Confirmar o meu depósito
            </h2>

            <div className="mt-4 space-y-1.5">
              <label htmlFor="amount" className="block text-xs font-medium text-muted-foreground">
                Valor depositado (Kz)
              </label>
              <input
                id="amount"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="0"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
              />
            </div>

            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Comprovativo (foto ou PDF)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />

              {proofFile ? (
                <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3.5 py-2.5">
                  <span className="flex items-center gap-2 truncate text-sm text-card-foreground">
                    <Paperclip
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">{proofFile.name}</span>
                  </span>
                  <button
                    onClick={() => {
                      setProofFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label="Remover ficheiro"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3.5 text-sm font-medium text-muted-foreground transition hover:border-brand-green hover:text-brand-green-dark"
                >
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                  Anexar comprovativo
                </button>
              )}
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? "A enviar…" : "Enviar comprovativo"}
            </button>
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
