import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import {
  PAYMENT_METHOD_INFO,
  usePaymentMethods,
  type PaymentMethodKey,
} from "@/hooks/use-payment-methods";

export const Route = createFileRoute("/carteira/metodo/$method")({
  head: () => ({
    meta: [{ title: "Group Mobil — Método de pagamento" }],
  }),
  component: MetodoPage,
});

const VALID_METHODS: PaymentMethodKey[] = ["unitel_money", "paypay_africa", "bank_transfer"];

function isValidMethod(value: string): value is PaymentMethodKey {
  return (VALID_METHODS as string[]).includes(value);
}

function MetodoPage() {
  const navigate = useNavigate();
  const { method: rawMethod } = useParams({ from: "/carteira/metodo/$method" });
  const { notAuthenticated, loading: profileLoading } = useProfile();
  const { getMethod, saveMethod, loading: methodsLoading } = usePaymentMethods();

  useEffect(() => {
    if (!isValidMethod(rawMethod)) navigate({ to: "/carteira" });
  }, [rawMethod, navigate]);

  const loading = profileLoading || methodsLoading;

  useEffect(() => {
    if (!loading && notAuthenticated) navigate({ to: "/" });
  }, [loading, notAuthenticated, navigate]);

  if (!isValidMethod(rawMethod)) return null;

  const method = rawMethod;
  const info = PAYMENT_METHOD_INFO[method];
  const existing = getMethod(method);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (notAuthenticated) return null;

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
              <h1 className="font-display text-base font-semibold text-white">{info.label}</h1>
              <p className="text-xs text-white/55">{info.short}</p>
            </div>
          </div>
        </header>

        <main className="space-y-5 px-5 pt-6">
          {method === "bank_transfer" ? (
            <BankForm existing={existing} saveMethod={saveMethod} />
          ) : (
            <PhoneForm method={method} existing={existing} saveMethod={saveMethod} />
          )}
        </main>
      </div>
    </div>
  );
}

type SaveFn = ReturnType<typeof usePaymentMethods>["saveMethod"];

function PhoneForm({
  method,
  existing,
  saveMethod,
}: {
  method: "unitel_money" | "paypay_africa";
  existing: ReturnType<typeof usePaymentMethods>["methods"][number] | null;
  saveMethod: SaveFn;
}) {
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setMessage({ type: "error", text: "Indique um número de telemóvel válido." });
      return;
    }

    setSaving(true);
    const { error } = await saveMethod({ method, phone: digits });
    setSaving(false);

    setMessage(
      error ? { type: "error", text: error } : { type: "ok", text: "Número guardado com sucesso." },
    );
  }

  return (
    <section className="rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Número de telemóvel
          </label>
          <div className="flex items-center rounded-xl border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
            <span className="pl-4 text-sm text-muted-foreground">+244</span>
            <input
              id="phone"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={PAYMENT_METHOD_INFO[method].placeholder}
              maxLength={9}
              className="w-full bg-transparent px-2 py-2.5 text-sm text-foreground outline-none"
            />
          </div>
        </div>

        {message && (
          <p
            className={`text-xs font-medium ${
              message.type === "ok" ? "text-brand-green-dark" : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          Guardar
        </button>
      </form>
    </section>
  );
}

function BankForm({
  existing,
  saveMethod,
}: {
  existing: ReturnType<typeof usePaymentMethods>["methods"][number] | null;
  saveMethod: SaveFn;
}) {
  const [bankName, setBankName] = useState(existing?.bank_name ?? "");
  const [accountHolder, setAccountHolder] = useState(existing?.account_holder ?? "");
  const [accountNumber, setAccountNumber] = useState(existing?.account_number ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim()) {
      setMessage({ type: "error", text: "Preencha o banco, o titular e o número da conta/IBAN." });
      return;
    }

    setSaving(true);
    const { error } = await saveMethod({
      method: "bank_transfer",
      bank_name: bankName.trim(),
      account_holder: accountHolder.trim(),
      account_number: accountNumber.trim().replace(/\s/g, ""),
    });
    setSaving(false);

    setMessage(
      error ? { type: "error", text: error } : { type: "ok", text: "Dados bancários guardados." },
    );
  }

  return (
    <section className="rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="bankName"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Banco
          </label>
          <input
            id="bankName"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Ex.: BAI, BFA, BIC…"
            maxLength={60}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label
            htmlFor="accountHolder"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Titular da conta
          </label>
          <input
            id="accountHolder"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label
            htmlFor="accountNumber"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Número da conta / IBAN
          </label>
          <input
            id="accountNumber"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            maxLength={30}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {message && (
          <p
            className={`text-xs font-medium ${
              message.type === "ok" ? "text-brand-green-dark" : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          Guardar
        </button>
      </form>
    </section>
  );
}
