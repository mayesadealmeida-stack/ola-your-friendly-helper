import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Check, Clock, Loader2, ShieldAlert, ShieldX } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { calculateAge, kycStatusLabel, useKyc, type KycInput } from "@/hooks/use-kyc";

export const Route = createFileRoute("/perfil/kyc")({
  head: () => ({
    meta: [
      { title: "Group Mobil — KYC Basic" },
      {
        name: "description",
        content: "Complete os seus dados de identificação e endereço para verificar a conta.",
      },
    ],
  }),
  component: KycPage,
});

const emptyForm: KycInput = {
  full_name: "",
  country: "Angola",
  birth_date: "",
  city: "",
  address: "",
  address_reference: "",
};

function KycPage() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading, notAuthenticated } = useProfile();
  const { kyc, loading: kycLoading, submitKyc } = useKyc();

  const [form, setForm] = useState<KycInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const loading = profileLoading || kycLoading;

  useEffect(() => {
    if (!loading && notAuthenticated) navigate({ to: "/" });
  }, [loading, notAuthenticated, navigate]);

  useEffect(() => {
    if (kyc) {
      setForm({
        full_name: kyc.full_name || profile?.full_name || "",
        country: kyc.country || "Angola",
        birth_date: kyc.birth_date || "",
        city: kyc.city || "",
        address: kyc.address || "",
        address_reference: kyc.address_reference || "",
      });
    } else if (profile && !kycLoading) {
      setForm((f) => ({ ...f, full_name: profile.full_name || "" }));
    }
  }, [kyc, profile, kycLoading]);

  const status = kyc?.status ?? "not_started";
  const locked = status === "pending" || status === "verified";
  const age = calculateAge(form.birth_date);

  function updateField<K extends keyof KycInput>(key: K, value: KycInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (
      !form.full_name.trim() ||
      !form.country.trim() ||
      !form.city.trim() ||
      !form.address.trim()
    ) {
      setMessage({ type: "error", text: "Preencha nome completo, país, cidade e endereço." });
      return;
    }
    if (!form.birth_date) {
      setMessage({ type: "error", text: "Indique a sua data de nascimento." });
      return;
    }
    const computedAge = calculateAge(form.birth_date);
    if (computedAge === null || computedAge < 18) {
      setMessage({
        type: "error",
        text: "É preciso ter pelo menos 18 anos para verificar a conta.",
      });
      return;
    }

    setSaving(true);
    const { error } = await submitKyc({
      full_name: form.full_name.trim(),
      country: form.country.trim(),
      birth_date: form.birth_date,
      city: form.city.trim(),
      address: form.address.trim(),
      address_reference: form.address_reference.trim(),
    });
    setSaving(false);

    setMessage(
      error
        ? { type: "error", text: error }
        : { type: "ok", text: "Dados enviados. A verificação está em análise." },
    );
  }

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
              to="/perfil"
              aria-label="Voltar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4.5 w-4.5" strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-display text-base font-semibold text-white">KYC Basic</h1>
              <p className="text-xs text-white/55">Verificação de identidade e endereço</p>
            </div>
          </div>
        </header>

        <main className="space-y-5 px-5 pt-6">
          <StatusBanner status={status} />

          <section className="rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
            <h2 className="font-display text-sm font-semibold text-card-foreground">
              Identificação
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <Field label="Nome completo (como no documento)" htmlFor="kycFullName">
                <input
                  id="kycFullName"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  disabled={locked}
                  maxLength={120}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-secondary/60 disabled:text-muted-foreground"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="País" htmlFor="kycCountry">
                  <input
                    id="kycCountry"
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    disabled={locked}
                    maxLength={60}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-secondary/60 disabled:text-muted-foreground"
                  />
                </Field>

                <Field label="Cidade" htmlFor="kycCity">
                  <input
                    id="kycCity"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    disabled={locked}
                    maxLength={60}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-secondary/60 disabled:text-muted-foreground"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Data de nascimento" htmlFor="kycBirthDate">
                  <input
                    id="kycBirthDate"
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => updateField("birth_date", e.target.value)}
                    disabled={locked}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-secondary/60 disabled:text-muted-foreground"
                  />
                </Field>

                <Field label="Idade">
                  <div className="flex h-[42px] items-center rounded-xl border border-input bg-secondary/60 px-4 text-sm text-muted-foreground">
                    {age !== null ? `${age} anos` : "—"}
                  </div>
                </Field>
              </div>

              <Field label="Endereço (bairro / rua)" htmlFor="kycAddress">
                <input
                  id="kycAddress"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  disabled={locked}
                  maxLength={160}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-secondary/60 disabled:text-muted-foreground"
                />
              </Field>

              <Field label="Ponto de referência do endereço" htmlFor="kycReference">
                <input
                  id="kycReference"
                  value={form.address_reference}
                  onChange={(e) => updateField("address_reference", e.target.value)}
                  disabled={locked}
                  maxLength={160}
                  placeholder="Ex.: perto da farmácia, ao lado do mercado…"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-secondary/60 disabled:text-muted-foreground"
                />
              </Field>

              {message && (
                <p
                  className={`text-xs font-medium ${
                    message.type === "ok" ? "text-brand-green-dark" : "text-destructive"
                  }`}
                >
                  {message.text}
                </p>
              )}

              {!locked && (
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
                  {status === "rejected" ? "Reenviar dados" : "Enviar para verificação"}
                </button>
              )}
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatusBanner({ status }: { status: string }) {
  const config = {
    verified: {
      icon: BadgeCheck,
      bg: "bg-brand-green/10",
      text: "text-brand-green-dark",
      title: "Conta verificada",
      desc: "Os seus dados de identificação foram confirmados.",
    },
    pending: {
      icon: Clock,
      bg: "bg-amber-500/10",
      text: "text-amber-600",
      title: "Em análise",
      desc: "Recebemos os seus dados. A verificação pode levar até 24 horas.",
    },
    rejected: {
      icon: ShieldX,
      bg: "bg-destructive/10",
      text: "text-destructive",
      title: "Verificação rejeitada",
      desc: "Reveja os seus dados e envie novamente.",
    },
    not_started: {
      icon: ShieldAlert,
      bg: "bg-secondary",
      text: "text-muted-foreground",
      title: kycStatusLabel("not_started"),
      desc: "Complete os seus dados para verificar a conta.",
    },
  } as const;

  const c = config[status as keyof typeof config] ?? config.not_started;
  const Icon = c.icon;

  return (
    <section className={`flex items-start gap-3 rounded-2xl p-4 ${c.bg}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${c.text}`} aria-hidden="true" />
      <div>
        <p className={`text-sm font-semibold ${c.text}`}>{c.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{c.desc}</p>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
