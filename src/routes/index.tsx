import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      { title: "Group Mobil — Kixikila digital para o seu grupo" },
      {
        name: "description",
        content:
          "Group Mobil: crie o seu grupo de kixikila, convide quem confia e acompanhe cada contribuição e cada turno.",
      },
      { property: "og:title", content: "Group Mobil — Kixikila digital para o seu grupo" },
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
  const [view, setView] = useState<"landing" | "login" | "signup">("landing");
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


  if (view === "landing") {
    return <Landing onSignup={() => setView("signup")} onLogin={() => setView("login")} />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-navy-900 px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 140% at 82% 8%, oklch(0.3 0.09 261.5) 0%, transparent 55%)",
        }}
      />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-card shadow-2xl md:grid md:grid-cols-[0.85fr_1.15fr]">
        {/* Brand panel */}
        <div className="hidden flex-col justify-between bg-navy-900 p-10 text-white md:flex">
          <button
            onClick={() => setView("landing")}
            className="flex items-center gap-2 self-start opacity-90 transition hover:opacity-100"
            aria-label="Voltar ao início"
          >
            <img src="/logo-group-mobil.webp" alt="Group Mobil" className="h-7 w-auto" />
          </button>
          <div>
            <BrandRing />
            <h3 className="mt-6 font-display text-xl font-semibold leading-snug">
              Junte-se ao seu grupo em menos de dois minutos.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Os seus dados servem apenas para identificar quem é quem dentro do grupo — nada de
              partilha com terceiros.
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-12">
          <button
            onClick={() => setView("landing")}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground md:hidden"
          >
            ← Voltar
          </button>

          {view === "signup" && (
            <>
              <p className="font-display text-sm font-semibold text-brand-green-dark">
                Criar conta
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">
                Vamos começar
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Preencha os seus dados para criar ou entrar num grupo.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSignup}>
                <Field
                  label="Nome completo"
                  name="fullName"
                  type="text"
                  placeholder="Maria Fernandes"
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Nome de usuário"
                    name="username"
                    type="text"
                    placeholder="maria.f"
                    required
                  />
                  <Field
                    label="Telefone"
                    name="phone"
                    type="tel"
                    placeholder="+244 900 000 000"
                    required
                  />
                </div>
                <Field
                  label="Senha"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />

                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-brand-green px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-brand-green-dark disabled:opacity-60"
                >
                  {loading ? "A criar conta…" : "Criar conta"}
                </button>
                <p className="text-center text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setView("login");
                    }}
                    className="font-semibold text-brand-green-dark underline-offset-4 hover:underline"
                  >
                    Entrar
                  </button>
                </p>
              </form>
            </>
          )}

          {view === "login" && (
            <>
              <p className="font-display text-sm font-semibold text-brand-green-dark">Entrar</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">
                Bem-vindo de volta
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Digite o seu telefone e senha para continuar.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleLogin}>
                <Field
                  label="Telefone"
                  name="phone"
                  type="tel"
                  placeholder="+244 900 000 000"
                  required
                />
                <Field
                  label="Senha"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />

                <div className="flex items-center justify-between pt-1">
                  <label
                    htmlFor="remember"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-brand-green focus:ring-ring"
                    />
                    Lembrar de mim
                  </label>
                  <a
                    href="#"
                    className="text-sm font-semibold text-brand-green-dark hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                </div>

                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-brand-green px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-brand-green-dark disabled:opacity-60"
                >
                  {loading ? "A entrar…" : "Entrar"}
                </button>
                <p className="text-center text-sm text-muted-foreground">
                  Ainda não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setView("signup");
                    }}
                    className="font-semibold text-brand-green-dark underline-offset-4 hover:underline"
                  >
                    Criar conta
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Landing({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        className="relative overflow-hidden bg-navy-900"
        style={{
          background:
            "radial-gradient(120% 140% at 82% 8%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 55%)",
        }}
      >
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <img src="/logo-group-mobil.webp" alt="Group Mobil" className="h-7 w-auto sm:h-8" />
          <div className="flex items-center gap-2.5">
            <button
              onClick={onSignup}
              className="rounded-full border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:px-5"
            >
              Criar conta
            </button>
            <button
              onClick={onLogin}
              className="rounded-full bg-brand-green px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark sm:px-5"
            >
              Entrar
            </button>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-6 md:grid-cols-[1.05fr_0.95fr] md:pb-28">
          <div>
            <span className="inline-block rounded-full border border-brand-green/40 bg-brand-green/10 px-3.5 py-1.5 text-xs font-semibold text-brand-green">
              Kixikila digital para o seu grupo
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[52px]">
              A poupança em grupo que todos já confiam, agora no telemóvel.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/60">
              Crie o grupo, convide quem confia e acompanhe cada contribuição e cada turno — sem
              folhas, sem confusão, sem faltar ninguém.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={onSignup}
                className="rounded-full bg-brand-green px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-brand-green/20 transition hover:bg-brand-green-dark"
              >
                Criar o meu grupo
              </button>
              <button
                onClick={onLogin}
                className="rounded-full border border-white/30 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Já tenho conta
              </button>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Contribuições
                registadas
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Turnos organizados
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Feito para grupos
                angolanos
              </span>
            </div>
          </div>

          <HeroArt />
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Como funciona
        </h2>
        <p className="mt-3 max-w-lg text-muted-foreground">
          O mesmo espírito da kixikila que já conhece, só que mais simples de organizar.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <StepCard
            number="01"
            title="Crie o grupo"
            description="Defina o valor da contribuição, a frequência e a ordem dos turnos em poucos minutos."
          />
          <StepCard
            number="02"
            title="Convide os membros"
            description="Cada pessoa entra com o seu número de telefone e acompanha o grupo a partir do telemóvel."
          />
          <StepCard
            number="03"
            title="Acompanhe os turnos"
            description="Veja quem já contribuiu, quem falta e de quem é a vez de receber — tudo num só lugar."
          />
        </div>
      </div>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Group Mobil. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="font-display text-sm font-bold text-brand-green-dark">{number}</div>
      <h3 className="mt-3.5 font-display text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function HeroArt() {
  return (
    <div className="relative hidden h-[420px] md:block">
      <svg viewBox="0 0 420 420" className="h-full w-full">
        <circle
          cx="210"
          cy="210"
          r="150"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="2"
        />
        <path
          d="M 335 145 A 150 150 0 0 1 335 275"
          fill="none"
          stroke="oklch(0.72 0.19 149.5)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 85 275 A 150 150 0 0 1 85 145"
          fill="none"
          stroke="oklch(0.72 0.19 149.5)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="210" cy="60" r="22" fill="#fff" />
        <circle cx="360" cy="210" r="20" fill="#fff" />
        <circle cx="210" cy="360" r="20" fill="#fff" />
        <circle cx="60" cy="210" r="20" fill="#fff" />
        <circle cx="300" cy="105" r="13" fill="oklch(0.72 0.19 149.5)" />
        <circle cx="300" cy="315" r="13" fill="oklch(0.72 0.19 149.5)" />
        <circle cx="120" cy="315" r="13" fill="oklch(0.72 0.19 149.5)" />
        <circle cx="120" cy="105" r="13" fill="oklch(0.72 0.19 149.5)" />
        <g stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
          <line x1="210" y1="60" x2="300" y2="105" />
          <line x1="300" y1="105" x2="360" y2="210" />
          <line x1="360" y1="210" x2="300" y2="315" />
          <line x1="300" y1="315" x2="210" y2="360" />
          <line x1="210" y1="360" x2="120" y2="315" />
          <line x1="120" y1="315" x2="60" y2="210" />
          <line x1="60" y1="210" x2="120" y2="105" />
          <line x1="120" y1="105" x2="210" y2="60" />
        </g>
      </svg>

      <div className="absolute right-2.5 top-4 w-[198px] rounded-2xl bg-white p-3.5 shadow-2xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-brand-green font-display text-xs font-bold text-primary-foreground">
            M
          </span>
          É a vez de Maria
        </div>
        <div className="mt-1.5 font-display text-xl font-bold text-slate-900">45.000 Kz</div>
        <div className="mt-0.5 text-xs text-slate-500">Turno de setembro</div>
      </div>

      <div className="absolute bottom-8 left-0 w-[172px] rounded-2xl bg-white p-3.5 shadow-2xl">
        <div className="text-xs text-slate-500">Grupo "Amigas do Bairro"</div>
        <div className="mt-1 font-display text-base font-bold text-slate-900">8 de 12 pagaram</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[68%] rounded-full bg-brand-green" />
        </div>
      </div>
    </div>
  );
}

function BrandRing() {
  return (
    <svg viewBox="0 0 150 150" className="h-32 w-32">
      <circle cx="75" cy="75" r="55" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <path
        d="M 122 50 A 55 55 0 0 1 122 100"
        fill="none"
        stroke="oklch(0.72 0.19 149.5)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="75" cy="20" r="9" fill="#fff" />
      <circle cx="130" cy="75" r="8" fill="oklch(0.72 0.19 149.5)" />
      <circle cx="75" cy="130" r="8" fill="#fff" />
      <circle cx="20" cy="75" r="8" fill="oklch(0.72 0.19 149.5)" />
    </svg>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-card-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
      />
    </div>
  );
}
