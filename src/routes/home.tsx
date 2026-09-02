import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sun,
  Sunset,
  Moon,
  Bell,
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpLeft,
  Send,
  History,
  ShieldCheck,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import logo from "/logo-group-mobil.webp";
import { BottomNav } from "@/components/bottom-nav";
import { UserAvatarLink } from "@/components/user-avatar";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Início" },
      {
        name: "description",
        content: "A sua conta Group Mobil: saldo, movimentações e grupos num só lugar.",
      },
    ],
  }),
  component: HomePage,
});

// ---------------------------------------------------------------------------
// Data hooks — return empty/zero state until wired to Supabase.
// Replace the bodies of these with real Supabase queries; the UI below
// already handles loading, empty and populated states.
// ---------------------------------------------------------------------------

function useGreetingPeriod() {
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (hour < 12) return { label: "Bom dia", icon: Sun };
  if (hour < 18) return { label: "Boa tarde", icon: Sunset };
  return { label: "Boa noite", icon: Moon };
}

function useBalance() {
  // TODO: ligar à tabela de saldo real no Supabase.
  return { amountKz: 0, loading: false };
}

function useNotifications() {
  // TODO: ligar à tabela de notificações real no Supabase.
  return { unreadCount: 0, loading: false };
}

type Movement = {
  id: string;
  description: string;
  amountKz: number;
  direction: "in" | "out";
  occurredAt: string;
};

function useRecentMovements() {
  // TODO: ligar à tabela de transações real no Supabase.
  return { movements: [] as Movement[], loading: false };
}

// ---------------------------------------------------------------------------

function HomePage() {
  const greeting = useGreetingPeriod();
  const { profile } = useProfile();
  const userName = profile?.full_name?.trim() || null;
  const balance = useBalance();
  const notifications = useNotifications();
  const recent = useRecentMovements();
  const [showBalance, setShowBalance] = useState(true);

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <Header
          greetingLabel={greeting.label}
          greetingIcon={greeting.icon}
          userName={userName}
          unreadCount={notifications.unreadCount}
        />

        <main className="-mt-6 space-y-6 px-5">
          <BalanceCard
            amountKz={balance.amountKz}
            visible={showBalance}
            onToggleVisible={() => setShowBalance((v) => !v)}
          />

          <PrimaryActions />

          <QuickActions />

          <SecurityBanner />

          <RecentMovements movements={recent.movements} />

          <AssistantCard />
        </main>
      </div>

      <BottomNav active="home" />
    </div>
  );
}

function Header({
  greetingLabel,
  greetingIcon: GreetingIcon,
  userName,
  unreadCount,
}: {
  greetingLabel: string;
  greetingIcon: LucideIcon;
  userName: string | null;
  unreadCount: number;
}) {
  return (
    <header
      className="px-5 pb-14 pt-8"
      style={{
        background:
          "radial-gradient(120% 140% at 82% 0%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 60%)",
      }}
    >
      <div className="mx-auto flex max-w-md items-start justify-between">
        <div>
          <p className="flex items-center gap-2 font-display text-xl font-semibold text-white">
            <GreetingIcon
              className="h-5 w-5 text-brand-green"
              strokeWidth={2.25}
              aria-hidden="true"
            />
            {greetingLabel}
            {userName ? `, ${userName}!` : "!"}
          </p>
          <p className="mt-1 text-sm text-white/55">Que bom ter você de volta.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            aria-label="Notificações"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
          >
            <Bell className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-green ring-2 ring-navy-900" />
            )}
          </button>
          <UserAvatarLink size={40} />
        </div>
      </div>
    </header>
  );
}

function BalanceCard({
  amountKz,
  visible,
  onToggleVisible,
}: {
  amountKz: number;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  const formatted = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(amountKz);

  return (
    <section className="rounded-3xl bg-navy-900 p-6 text-white shadow-xl shadow-navy-900/25">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/55">Saldo disponível</p>
        <button
          onClick={onToggleVisible}
          aria-label={visible ? "Ocultar saldo" : "Mostrar saldo"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/15"
        >
          {visible ? (
            <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          ) : (
            <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
      <p className="mt-3 font-display text-4xl font-bold tracking-tight">
        {visible ? `${formatted} Kz` : "•••••• Kz"}
      </p>
    </section>
  );
}

function PrimaryActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button className="flex items-center justify-center gap-2 rounded-2xl bg-brand-green py-4 font-display text-sm font-semibold text-primary-foreground shadow-md shadow-brand-green/25 transition hover:bg-brand-green-dark">
        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> Depositar
      </button>
      <button className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-display text-sm font-semibold text-card-foreground shadow-sm transition hover:bg-accent">
        <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> Levantar
      </button>
    </div>
  );
}

function QuickActions() {
  const actions: { icon: LucideIcon; label: string }[] = [
    { icon: Send, label: "Transferir" },
    { icon: History, label: "Histórico" },
    { icon: ShieldCheck, label: "Segurança" },
    { icon: HelpCircle, label: "Ajuda" },
  ];

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-semibold text-foreground">Mais ações</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:bg-accent"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-brand-green-dark"
              aria-hidden="true"
            >
              <action.icon className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <span className="text-sm font-medium text-card-foreground">{action.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SecurityBanner() {
  // Estático por agora — preparado para virar carrossel (novidades, avisos, dicas).
  return (
    <section className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 font-display text-sm font-semibold">
            <ShieldCheck
              className="h-4 w-4 text-brand-green"
              strokeWidth={2.25}
              aria-hidden="true"
            />
            Segurança da sua conta
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/60">
            Nunca partilhe o seu PIN ou código de verificação com ninguém.
          </p>
        </div>
      </div>
      <button className="mt-4 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15">
        Saiba mais
      </button>
      <div className="mt-4 flex gap-1.5">
        <span className="h-1.5 w-4 rounded-full bg-brand-green" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
      </div>
    </section>
  );
}

function RecentMovements({ movements }: { movements: Movement[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Movimentações recentes
        </h2>
      </div>

      {movements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">Ainda não há movimentações para mostrar.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {movements.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                    m.direction === "in"
                      ? "bg-brand-green/15 text-brand-green-dark"
                      : "bg-destructive/10 text-destructive"
                  }`}
                  aria-hidden="true"
                >
                  {m.direction === "in" ? (
                    <ArrowDownLeft className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <ArrowUpLeft className="h-4 w-4" strokeWidth={2.5} />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{m.description}</p>
                  <p className="text-xs text-muted-foreground">{m.occurredAt}</p>
                </div>
              </div>
              <p
                className={`font-display text-sm font-semibold ${
                  m.direction === "in" ? "text-brand-green-dark" : "text-destructive"
                }`}
              >
                {m.direction === "in" ? "+" : "−"}
                {new Intl.NumberFormat("pt-AO").format(m.amountKz)} Kz
              </p>
            </div>
          ))}
        </div>
      )}

      <button className="mt-3 flex items-center gap-1 text-sm font-semibold text-brand-green-dark hover:underline">
        Ver histórico →
      </button>
    </section>
  );
}

function AssistantCard() {
  return (
    <section className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="h-11 w-11 shrink-0 rounded-full bg-navy-900 object-contain p-1.5"
        width={44}
        height={44}
      />
      <div className="flex-1">
        <p className="font-display text-sm font-semibold text-card-foreground">
          Assistente Group Mobil
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Precisa de ajuda? Estamos aqui para ajudar.
        </p>
      </div>
      <Link
        to="/assistente"
        className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-brand-green-dark"
      >
        Conversar
      </Link>
    </section>
  );
}
