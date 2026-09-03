import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useBalance } from "@/hooks/use-balance";
import {
  PAYMENT_METHOD_INFO,
  maskPhone,
  usePaymentMethods,
  type PaymentMethod,
  type PaymentMethodKey,
} from "@/hooks/use-payment-methods";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/carteira/")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Carteira" },
      {
        name: "description",
        content:
          "Saldo e métodos de pagamento: Unitel Money, PayPay África e transferência bancária.",
      },
    ],
  }),
  component: CarteiraPage,
});

const METHOD_ORDER: PaymentMethodKey[] = ["unitel_money", "paypay_africa", "bank_transfer"];

const METHOD_ICON: Record<PaymentMethodKey, LucideIcon> = {
  unitel_money: Smartphone,
  paypay_africa: Smartphone,
  bank_transfer: Building2,
};

function CarteiraPage() {
  const navigate = useNavigate();
  const { notAuthenticated, loading: profileLoading } = useProfile();
  const balance = useBalance();
  const { methods, getMethod, loading: methodsLoading } = usePaymentMethods();
  const [showBalance, setShowBalance] = useState(true);

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

  const formatted = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(
    balance.amountKz,
  );

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
          <p className="font-display text-xl font-semibold text-white">Carteira</p>
          <p className="mt-1 text-sm text-white/55">Saldo e métodos de pagamento.</p>
        </header>

        <main className="-mt-1 space-y-6 px-5 pt-6">
          <section className="rounded-3xl bg-navy-900 p-6 text-white shadow-xl shadow-navy-900/25">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white/55">Saldo disponível</p>
              <button
                onClick={() => setShowBalance((v) => !v)}
                aria-label={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/15"
              >
                {showBalance ? (
                  <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="mt-3 font-display text-4xl font-bold tracking-tight">
              {showBalance ? `${formatted} Kz` : "•••••• Kz"}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                to="/carteira/depositar"
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> Depositar
              </Link>
              <a
                href="#metodos"
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> Levantar
              </a>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Os depósitos são sempre feitos através do{" "}
            <span className="font-semibold text-card-foreground">PayPay África</span>.
          </section>

          <section id="metodos" className="scroll-mt-6">
            <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
              Métodos de pagamento
            </h2>
            <div className="overflow-hidden rounded-3xl bg-card shadow-xl shadow-navy-900/10">
              {METHOD_ORDER.map((key) => (
                <MethodRow key={key} methodKey={key} data={getMethod(key)} />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {methods.length === 0
                ? "Ainda não configurou nenhum método. Adicione pelo menos um para depositar ou levantar."
                : "Toque num método para editar os dados."}
            </p>
          </section>
        </main>
      </div>

      <BottomNav active="carteira" />
    </div>
  );
}

function MethodRow({
  methodKey,
  data,
}: {
  methodKey: PaymentMethodKey;
  data: PaymentMethod | null;
}) {
  const info = PAYMENT_METHOD_INFO[methodKey];
  const Icon = METHOD_ICON[methodKey];

  const configured =
    methodKey === "bank_transfer" ? Boolean(data?.account_number) : Boolean(data?.phone);

  const detail =
    methodKey === "bank_transfer"
      ? data?.account_number
        ? `${data.bank_name || "Banco"} · •••• ${data.account_number.slice(-4)}`
        : "Não configurado"
      : data?.phone
        ? maskPhone(data.phone)
        : "Não configurado";

  return (
    <Link
      to="/carteira/metodo/$method"
      params={{ method: methodKey }}
      className="flex items-center gap-3 border-b border-border px-5 py-4 text-left transition last:border-b-0 hover:bg-secondary/60"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          configured ? "bg-brand-green/15 text-brand-green-dark" : "bg-secondary text-navy-900"
        }`}
        aria-hidden="true"
      >
        {configured ? (
          <Wallet className="h-4.5 w-4.5" strokeWidth={2} />
        ) : (
          <Icon className="h-4.5 w-4.5" strokeWidth={2} />
        )}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-card-foreground">{info.label}</p>
        <p
          className={`text-xs ${configured ? "text-muted-foreground" : "text-muted-foreground/70"}`}
        >
          {detail}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
