import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Conecte-se" },
      {
        name: "description",
        content:
          "Group Mobil: a sua plataforma para criar conta ou entrar de forma simples e segura.",
      },
      { property: "og:title", content: "Group Mobil — Conecte-se" },
      {
        property: "og:description",
        content:
          "Group Mobil: a sua plataforma para criar conta ou entrar de forma simples e segura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Group Mobil — Conecte-se",
      },
      {
        name: "twitter:description",
        content:
          "Group Mobil: a sua plataforma para criar conta ou entrar de forma simples e segura.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [view, setView] = useState<"landing" | "login" | "signup">("landing");
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Top-right actions */}
      <header className="absolute right-0 top-0 z-20 flex items-center gap-3 p-6">
        <button
          onClick={() => setView("signup")}
          className="rounded-full border border-border bg-background px-5 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          Criar conta
        </button>
        <button
          onClick={() => setView("login")}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Entrar
        </button>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-4">
        {view === "landing" && (
          <div className="max-w-xl text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-muted p-4">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                className="text-primary"
                aria-hidden="true"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
              Group Mobil
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A maneira mais simples de começar. Crie a sua conta ou entre para
              continuar.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => setView("signup")}
                className="rounded-full bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Criar conta
              </button>
              <button
                onClick={() => setView("login")}
                className="rounded-full border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
              >
                Entrar
              </button>
            </div>
          </div>
        )}

        {view === "signup" && (
          <AuthCard
            title="Criar conta"
            subtitle="Preencha os seus dados para começar."
            backTo={() => setView("landing")}
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Conta criada com sucesso!");
              }}
            >
              <Field label="Nome completo" name="fullName" type="text" required />
              <Field label="Nome de usuário" name="username" type="text" required />
              <Field label="Senha" name="password" type="password" required />
              <Field label="Telefone" name="phone" type="tel" required />
              <button
                type="submit"
                className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Criar conta
              </button>
              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Entrar
                </button>
              </p>
            </form>
          </AuthCard>
        )}

        {view === "login" && (
          <AuthCard
            title="Entrar"
            subtitle="Digite o seu telefone e senha."
            backTo={() => setView("landing")}
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Entrou com sucesso!");
              }}
            >
              <Field label="Telefone" name="phone" type="tel" required />
              <Field label="Senha" name="password" type="password" required />
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground">
                  Lembrar de mim
                </label>
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Entrar
              </button>
              <p className="text-center text-sm text-muted-foreground">
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setView("signup")}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Criar conta
                </button>
              </p>
            </form>
          </AuthCard>
        )}
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Group Mobil. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function AuthCard({
  title,
  subtitle,
  backTo,
  children,
}: {
  title: string;
  subtitle: string;
  backTo: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
      <button
        onClick={backTo}
        className="absolute left-4 top-4 text-muted-foreground transition hover:text-foreground"
        aria-label="Voltar"
      >
        ←
      </button>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold text-card-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-card-foreground"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
