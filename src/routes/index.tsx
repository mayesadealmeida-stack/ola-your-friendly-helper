import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setRememberMe as persistRememberMe } from "@/integrations/supabase/remember-me";

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("244") ? digits.slice(3) : digits.replace(/^0+/, "");
  return `244${local}`;
}

// O telefone é convertido num endereço interno estável para a autenticação.
function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@groupmobil.app`;
}

function validate(phone: string, password: string): string | null {
  const digits = normalizePhone(phone);
  if (digits.length < 11) return "Número de telefone inválido. Ex.: 900 000 000";
  if (!/^[A-Za-z0-9]+$/.test(password)) return "A senha deve conter apenas letras e números.";
  if (password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    return "A senha deve conter letras e números.";
  return null;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Entrar" },
      {
        name: "description",
        content:
          "Group Mobil: crie o seu grupo de kixikila, convide quem confia e acompanhe cada contribuição e cada turno.",
      },
      { property: "og:title", content: "Group Mobil" },
      {
        property: "og:description",
        content:
          "Group Mobil: crie o seu grupo de kixikila, convide quem confia e acompanhe cada contribuição e cada turno.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [view, setView] = useState<"login" | "signup">("login");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const username = String(form.get("username") ?? "").trim();
    const rawPhone = String(form.get("phone") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const invalid = validate(rawPhone, password);
    if (invalid) {
      setError(invalid);
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: phoneToEmail(rawPhone),
      password,
      options: {
        data: { full_name: fullName, username, phone: normalizePhone(rawPhone) },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(
        signUpError.message.toLowerCase().includes("already")
          ? "Este número já tem conta. Faça login."
          : signUpError.message,
      );
      return;
    }

    // Auto-confirmação está ativa: entra logo após criar a conta.
    // Conta nova fica lembrada por omissão, até o utilizador terminar sessão.
    persistRememberMe(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(rawPhone),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate({ to: "/home" });
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const rawPhone = String(form.get("phone") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const invalid = validate(rawPhone, password);
    if (invalid) {
      setError(invalid);
      return;
    }

    setLoading(true);
    // Define ANTES de entrar: é neste momento que a sessão é gravada, e o
    // storage do Supabase lê esta preferência para decidir onde guardá-la.
    persistRememberMe(rememberMe);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(rawPhone),
      password,
    });

    setLoading(false);
    if (signInError) {
      setError("Telefone ou senha incorretos.");
      return;
    }
    navigate({ to: "/home" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 pb-10 pt-16">
      <div className="w-full max-w-sm">
        {/* Marca */}
        <div className="flex flex-col items-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-navy-900 bg-white shadow-sm">
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-white">
              <img
                src="/logo-group-mobil-mark.webp"
                alt="Group Mobil"
                className="h-16 w-16 object-contain"
              />
            </div>
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-navy-900">Group Mobil</h1>
        </div>

        {view === "login" ? (
          <form className="mt-10 space-y-5" onSubmit={handleLogin}>
            <IconField
              label="Número de Telefone"
              name="phone"
              type="tel"
              placeholder=""
              icon={<Phone className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />}
              required
            />
            <IconField
              label="Palavra-passe"
              name="password"
              type="password"
              placeholder=""
              icon={<Lock className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />}
              required
            />

            <div className="flex items-center justify-between pt-1 text-sm">
              <label htmlFor="remember" className="flex items-center gap-2 text-muted-foreground">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-navy-900 focus:ring-navy-900"
                />
                Lembrar de mim
              </label>
            </div>

            {error && (
              <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 py-4 text-base font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Entrar
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setView("signup");
              }}
              className="w-full rounded-full bg-slate-800 py-4 text-base font-bold text-white transition hover:bg-slate-900"
            >
              Criar conta
            </button>
          </form>
        ) : (
          <form className="mt-10 space-y-5" onSubmit={handleSignup}>
            <IconField label="Nome completo" name="fullName" type="text" placeholder="" required />
            <IconField
              label="Nome de usuário"
              name="username"
              type="text"
              placeholder=""
              required
            />
            <IconField
              label="Número de Telefone"
              name="phone"
              type="tel"
              placeholder=""
              icon={<Phone className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />}
              required
            />
            <IconField
              label="Palavra-passe"
              name="password"
              type="password"
              placeholder=""
              icon={<Lock className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />}
              required
            />

            {error && (
              <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 py-4 text-base font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Criar conta
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setView("login");
              }}
              className="w-full rounded-full bg-slate-800 py-4 text-base font-bold text-white transition hover:bg-slate-900"
            >
              Já tenho conta
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function IconField({
  label,
  name,
  type,
  placeholder,
  icon,
  required,
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm text-navy-900">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-full border-none bg-secondary py-3.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-navy-900/30 ${
            icon ? "pl-11 pr-4" : "px-4"
          }`}
        />
      </div>
    </div>
  );
}
