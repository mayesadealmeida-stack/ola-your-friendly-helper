import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setRememberMe as persistRememberMe } from "@/integrations/supabase/remember-me";
import {
  getLoginEmail,
  normalizePhone,
  phoneToEmail,
  rememberLoginEmail,
  validatePassword,
  validatePhonePassword,
} from "@/lib/phone";

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

    const invalid = validatePhonePassword(rawPhone, password);
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
    rememberLoginEmail(phoneToEmail(rawPhone));
    navigate({ to: "/home" });
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");

    const invalid = validatePassword(password);
    if (invalid) {
      setError(invalid);
      return;
    }

    const email = getLoginEmail();
    setLoading(true);
    // Define ANTES de entrar: é neste momento que a sessão é gravada, e o
    // storage do Supabase lê esta preferência para decidir onde guardá-la.
    persistRememberMe(rememberMe);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (signInError) {
      setError("Telefone ou senha incorretos.");
      return;
    }
    rememberLoginEmail(email);
    navigate({ to: "/home" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 pb-10 pt-16">
      <div className="w-full max-w-sm">
        {/* Marca */}
        <div className="flex flex-col items-center">
          <div className="h-28 w-28 overflow-hidden rounded-full shadow-sm ring-[3px] ring-navy-900">
            <img
              src="/logo-group-mobil-badge.webp"
              alt="Group Mobil"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-navy-900">Group Mobil</h1>
        </div>

        {view === "login" ? (
          <form className="mt-10 space-y-5" onSubmit={handleLogin}>
            <IconField
              label="Palavra-passe"
              name="password"
              type="password"
              placeholder=""
              icon={<Lock className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />}
              required
            />
            <p className="text-xs text-muted-foreground">
              Para entrar, basta colocar a sua palavra-passe.
            </p>

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
