import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpLeft,
  Briefcase,
  Users,
  BadgeCheck,
  HelpCircle,
  ShieldCheck,
  HandCoins,
  type LucideIcon,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { UserAvatarLink } from "@/components/user-avatar";
import { useProfile } from "@/hooks/use-profile";
import { useWallet } from "@/hooks/use-wallet";
import { useKyc } from "@/hooks/use-kyc";
import { useNotifications } from "@/hooks/use-notifications";
import logoMark from "/logo-group-mobil-mark.webp";

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
  const { profile } = useProfile();
  const userName = profile?.full_name?.trim() || null;
  const wallet = useWallet();
  const notifications = useNotifications();
  const recent = useRecentMovements();

  // Saldo de depósito = pedidos de depósito ainda por confirmar.
  const pendingDepositKz = wallet.transactions
    .filter((t) => t.status === "pendente" && t.type === "deposito")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <TopBar unreadCount={notifications.unreadCount} />

        <HeroBanner />

        <main className="space-y-6 px-5 pt-5">
          <RechargeWithdrawButtons />

          <WalletCard
            depositKz={pendingDepositKz}
            availableKz={wallet.balance}
            loading={wallet.loading}
          />

          <ShortcutsRow />

          <PromoBanner />

          <RecentMovements movements={recent.movements} />
        </main>
      </div>

      <BottomNav active="home" />
    </div>
  );
}

function TopBar({ unreadCount }: { unreadCount: number }) {
  return (
    <header className="flex items-center gap-3 bg-navy-900 px-5 py-3.5">
      <img src={logoMark} alt="" aria-hidden="true" className="h-8 w-8 shrink-0" />
      <p className="flex-1 truncate font-display text-base font-semibold text-white">Group Mobil</p>
      <button
        aria-label="Notificações"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
      >
        <Bell className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-green ring-2 ring-navy-900" />
        )}
      </button>
      <UserAvatarLink size={32} />
    </header>
  );
}

const HERO_SLIDES = [
  "/banners/banner-1.jpg",
  "/banners/banner-2.jpg",
  "/banners/banner-3.png",
  "/banners/banner-4.jpg",
];

function HeroBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-40 overflow-hidden bg-navy-900">
      {HERO_SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {HERO_SLIDES.map((src, i) => (
          <span
            key={src}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-4 bg-brand-green" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function RechargeWithdrawButtons() {
  return (
    <section className="grid grid-cols-2 gap-3">
      <Link
        to="/perfil/depositar"
        className="flex items-center justify-center gap-2 rounded-2xl bg-navy-900 py-4 font-display text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:bg-navy-800"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-navy-900">
          <Plus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        </span>
        Recarregar
      </Link>
      <Link
        to="/perfil/pagamento"
        className="flex items-center justify-center gap-2 rounded-2xl bg-navy-900 py-4 font-display text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:bg-navy-800"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-navy-900">
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        </span>
        Retirar
      </Link>
      <Link
        to="/minha-coleta"
        className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-display text-sm font-semibold text-card-foreground shadow-sm transition hover:bg-accent"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green/20 text-navy-900">
          <HandCoins className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        </span>
        Minha Coleta
      </Link>
    </section>
  );
}

function WalletCard({
  depositKz,
  availableKz,
  loading,
}: {
  depositKz: number;
  availableKz: number;
  loading: boolean;
}) {
  const fmt = (n: number) => new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(n);

  return (
    <section className="rounded-2xl bg-navy-900 p-5 text-white shadow-md shadow-navy-900/20">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Briefcase className="h-4 w-4 text-brand-green" strokeWidth={2.25} aria-hidden="true" />
        Carteira
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/10 p-3.5">
          <p className="text-xs text-white/55">Saldo de Depósito</p>
          <p className="mt-1 font-display text-lg font-bold">
            {loading ? "…" : `Kz ${fmt(depositKz)}`}
          </p>
        </div>
        <div className="rounded-xl bg-white/10 p-3.5">
          <p className="text-xs text-white/55">Saldo Disponível</p>
          <p className="mt-1 font-display text-lg font-bold">
            {loading ? "…" : `Kz ${fmt(availableKz)}`}
          </p>
        </div>
      </div>
    </section>
  );
}

function ShortcutsRow() {
  const items: { icon: LucideIcon; label: string; to: string }[] = [
    { icon: Users, label: "Grupos", to: "/grupos" },
    { icon: BadgeCheck, label: "Verificação", to: "/perfil/kyc" },
    { icon: HelpCircle, label: "Suporte", to: "/assistente" },
  ];

  return (
    <section className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card py-4 text-center transition hover:bg-accent"
        >
          <item.icon className="h-5 w-5 text-navy-900" strokeWidth={1.9} aria-hidden="true" />
          <span className="text-xs font-medium text-card-foreground">{item.label}</span>
        </Link>
      ))}
    </section>
  );
}

type PromoSlide = {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: { label: string; to: string };
};

function PromoBanner() {
  const { kyc, loading } = useKyc();
  const [index, setIndex] = useState(0);

  const slides: PromoSlide[] = [];
  if (!loading && kyc?.status !== "verified") {
    slides.push({
      key: "kyc",
      icon: BadgeCheck,
      title: "Verifique a sua conta",
      description: "Complete o KYC Basic para desbloquear todas as funcionalidades.",
      cta: { label: "Verificar agora", to: "/perfil/kyc" },
    });
  }
  slides.push({
    key: "security",
    icon: ShieldCheck,
    title: "Segurança da sua conta",
    description: "Nunca partilhe o seu PIN ou código de verificação com ninguém.",
  });

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  // slides tem sempre pelo menos o slide de segurança.
  const current = slides[Math.min(index, slides.length - 1)]!;
  const Icon = current.icon;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 font-display text-sm font-semibold">
            <Icon className="h-4 w-4 text-brand-green" strokeWidth={2.25} aria-hidden="true" />
            {current.title}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/60">{current.description}</p>
        </div>
      </div>

      {current.cta && (
        <Link
          to={current.cta.to}
          className="mt-4 inline-block rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
        >
          {current.cta.label}
        </Link>
      )}

      {slides.length > 1 && (
        <div className="mt-4 flex gap-1.5">
          {slides.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-brand-green" : "w-1.5 bg-white/25"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RecentMovements({ movements }: { movements: Movement[] }) {
  return (
    <section id="movimentacoes" className="scroll-mt-6">
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
