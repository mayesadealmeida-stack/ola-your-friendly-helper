import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Receipt,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useWallet } from "@/hooks/use-wallet";
import { PAYMENT_METHOD_INFO, type PaymentMethodKey } from "@/hooks/use-payment-methods";

export const Route = createFileRoute("/perfil/pagamento")({
  head: () => ({
    meta: [{ title: "Group Mobil — Pagamento e Faturamento" }],
  }),
  component: PagamentoPage,
});

function fmt(v: number) {
  return new Intl.NumberFormat("pt-AO").format(Math.round(v));
}

function PagamentoPage() {
  const navigate = useNavigate();
  const { notAuthenticated, loading: profileLoading, profile } = useProfile();
  const { balance, transactions, loading: walletLoading, requestWithdrawal } = useWallet();

  const [showRequest, setShowRequest] = useState(false);
  const [invoiceTx, setInvoiceTx] = useState<(typeof transactions)[number] | null>(null);

  useEffect(() => {
    if (!profileLoading && notAuthenticated) navigate({ to: "/" });
  }, [profileLoading, notAuthenticated, navigate]);

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }
  if (notAuthenticated) return null;

  const withdrawals = transactions
    .filter((t) => t.type === "levantamento")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen bg-secondary/40 pb-16">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-3 px-5 pb-4 pt-6">
          <Link
            to="/perfil"
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition hover:bg-accent"
          >
            <ArrowLeft className="h-4.5 w-4.5" strokeWidth={2.25} aria-hidden="true" />
          </Link>
          <h1 className="font-display text-lg font-bold text-foreground">
            Pagamento e Faturamento
          </h1>
        </header>

        <main className="px-5">
          <section className="rounded-3xl bg-navy-900 p-6 text-center text-white shadow-xl shadow-navy-900/20">
            <p className="text-sm text-white/55">Saldo disponível para saque</p>
            <p className="mt-2 font-display text-4xl font-bold tracking-tight">
              {walletLoading ? "…" : `Kz ${fmt(balance)}`}
            </p>
            <button
              onClick={() => setShowRequest(true)}
              disabled={balance <= 0}
              className="mt-5 w-full rounded-2xl bg-brand-green py-3.5 text-sm font-bold text-primary-foreground transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pedir pagamento
            </button>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
              As suas faturas
            </h2>

            {withdrawals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                <Receipt className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Ainda não pediu nenhum pagamento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((tx) => (
                  <WithdrawalCard key={tx.id} tx={tx} onViewInvoice={() => setInvoiceTx(tx)} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {showRequest && (
        <RequestPaymentSheet
          balance={balance}
          onClose={() => setShowRequest(false)}
          onSubmit={requestWithdrawal}
        />
      )}

      {invoiceTx && (
        <InvoiceSheet
          tx={invoiceTx}
          userName={profile?.full_name || profile?.username || "Participante"}
          onClose={() => setInvoiceTx(null)}
        />
      )}
    </div>
  );
}

function WithdrawalCard({
  tx,
  onViewInvoice,
}: {
  tx: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    note: string | null;
    method: string | null;
  };
  onViewInvoice: () => void;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-base font-bold text-card-foreground">
            Kz {fmt(Math.abs(Number(tx.amount)))}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(tx.created_at).toLocaleDateString("pt-AO", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <StatusBadge status={tx.status} />
      </div>

      {tx.status === "confirmado" && (
        <button
          onClick={onViewInvoice}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-xs font-semibold text-navy-900 transition hover:bg-secondary/70"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Ver fatura
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmado") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-brand-green/15 px-2.5 py-1 text-[11px] font-semibold text-brand-green-dark">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Aprovado
      </span>
    );
  }
  if (status === "rejeitado") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
        <XCircle className="h-3 w-3" aria-hidden="true" /> Rejeitado
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      <Clock className="h-3 w-3" aria-hidden="true" /> Pendente
    </span>
  );
}

function RequestPaymentSheet({
  balance,
  onClose,
  onSubmit,
}: {
  balance: number;
  onClose: () => void;
  onSubmit: (
    amount: number,
    method: PaymentMethodKey,
    note: string,
  ) => Promise<{ error: string | null }>;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodKey>("unitel_money");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const amountValue = Number(amount.replace(/\D/g, ""));
  const methods: PaymentMethodKey[] = ["unitel_money", "paypay_africa", "bank_transfer"];

  async function handleSubmit() {
    setError(null);
    if (!amountValue || amountValue <= 0) {
      setError("Indique o valor que quer receber.");
      return;
    }
    if (amountValue > balance) {
      setError("Esse valor é maior do que o seu saldo disponível.");
      return;
    }
    if (!destination.trim()) {
      setError("Indique para onde deve ser enviado o pagamento.");
      return;
    }

    setSubmitting(true);
    const { error: submitError } = await onSubmit(
      amountValue,
      method,
      `${PAYMENT_METHOD_INFO[method].label}: ${destination.trim()}`,
    );
    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }
    setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/15 text-brand-green-dark">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-3 font-display text-base font-semibold text-card-foreground">
              Pedido enviado
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              O seu pedido de pagamento está em análise. Assim que a equipa aprovar, a sua fatura
              fica disponível aqui.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-navy-900 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <p className="font-display text-base font-semibold text-card-foreground">
                Pedir pagamento
              </p>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Saldo disponível: Kz {fmt(balance)}
            </p>

            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Valor a receber (Kz)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
              />
            </div>

            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Receber via</label>
              <div className="flex flex-wrap gap-2">
                {methods.map((key) => (
                  <button
                    key={key}
                    onClick={() => setMethod(key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      method === key
                        ? "bg-navy-900 text-white"
                        : "border border-border bg-card text-card-foreground hover:border-navy-900"
                    }`}
                  >
                    {PAYMENT_METHOD_INFO[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                {method === "bank_transfer" ? "IBAN de destino" : "Número de telefone"}
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={
                  method === "bank_transfer" ? "IBAN" : PAYMENT_METHOD_INFO[method].placeholder
                }
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
              />
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Enviar pedido
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function InvoiceSheet({
  tx,
  userName,
  onClose,
}: {
  tx: { id: string; amount: number; created_at: string; confirmed_at: string | null };
  userName: string;
  onClose: () => void;
}) {
  const invoiceNumber = `GM-${tx.id.slice(0, 8).toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-navy-900 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-group-mobil-mark.webp"
              alt="Group Mobil"
              className="h-8 w-8 object-contain"
            />
            <p className="font-display text-sm font-bold text-white">Group Mobil</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-white/70 hover:text-white">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold text-slate-900">Fatura</p>
            <span className="rounded-full bg-brand-green/15 px-3 py-1 text-[11px] font-semibold text-brand-green-dark">
              Pago
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">Nº {invoiceNumber}</p>

          <div className="mt-5 space-y-2.5 border-y border-dashed border-slate-200 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Beneficiário</span>
              <span className="font-medium text-slate-900">{userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Data do pedido</span>
              <span className="font-medium text-slate-900">
                {new Date(tx.created_at).toLocaleDateString("pt-AO")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Data de aprovação</span>
              <span className="font-medium text-slate-900">
                {tx.confirmed_at ? new Date(tx.confirmed_at).toLocaleDateString("pt-AO") : "—"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">Valor pago</span>
            <span className="font-display text-2xl font-bold text-slate-900">
              Kz {fmt(Math.abs(Number(tx.amount)))}
            </span>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            Fatura gerada automaticamente pela Group Mobil.
          </p>
        </div>
      </div>
    </div>
  );
}
