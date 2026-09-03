import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sun,
  Sunset,
  Moon,
  Bell,
  Eye,
  EyeOff,
  Send,
  History,
  ShieldCheck,
  HelpCircle,
  BadgeCheck,
  CheckCircle2,
  ThumbsUp,
  MessageCircle,
  Share2,
  LayoutGrid,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpLeft,
  type LucideIcon,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { UserAvatarLink } from "@/components/user-avatar";
import { useProfile } from "@/hooks/use-profile";
import { useBalance } from "@/hooks/use-balance";
import { useKyc } from "@/hooks/use-kyc";
import { usePosts, relativeTime, type Post, type PostCategory } from "@/hooks/use-posts";

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

type FeedFilter = "todos" | PostCategory;

// ---------------------------------------------------------------------------

function HomePage() {
  const greeting = useGreetingPeriod();
  const { profile } = useProfile();
  const userName = profile?.full_name?.trim() || null;
  const balance = useBalance();
  const notifications = useNotifications();
  const recent = useRecentMovements();
  const feed = usePosts();
  const [showBalance, setShowBalance] = useState(true);
  const [activeCategory, setActiveCategory] = useState<FeedFilter>("todos");

  const filteredPosts =
    activeCategory === "todos"
      ? feed.posts
      : feed.posts.filter((p) => p.category === activeCategory);

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

          <PromoCarousel />

          <QuickActions />

          <RecentMovements movements={recent.movements} />

          <FeedSection
            posts={filteredPosts}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
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

type BalanceAction = { icon: LucideIcon; label: string; to?: string; href?: string };

const BALANCE_ACTIONS: BalanceAction[] = [
  { icon: Send, label: "Transferir", to: "/carteira" },
  { icon: ArrowUpRight, label: "Levantar", to: "/carteira" },
  { icon: History, label: "Extrato", href: "#movimentacoes" },
  { icon: LayoutGrid, label: "Mais", to: "/carteira" },
];

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
    <section className="rounded-3xl bg-card p-6 shadow-xl shadow-navy-900/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            onClick={onToggleVisible}
            aria-label={visible ? "Ocultar saldo" : "Mostrar saldo"}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
          >
            Saldo disponível
            {visible ? (
              <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
          <p className="mt-2 font-display text-4xl font-bold tracking-tight text-card-foreground">
            {visible ? `${formatted} Kz` : "•••••• Kz"}
          </p>
        </div>

        <Link
          to="/carteira/depositar"
          className="shrink-0 rounded-full bg-brand-green px-5 py-3 font-display text-sm font-semibold text-primary-foreground shadow-md shadow-brand-green/25 transition hover:bg-brand-green-dark"
        >
          Depositar
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {BALANCE_ACTIONS.map((action) => {
          const content = (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground transition group-hover:bg-accent">
                <action.icon className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="text-center text-[11px] font-medium text-muted-foreground">
                {action.label}
              </span>
            </>
          );
          const className = "group flex flex-col items-center gap-1.5";

          return action.to ? (
            <Link key={action.label} to={action.to} className={className}>
              {content}
            </Link>
          ) : (
            <a key={action.label} href={action.href} className={className}>
              {content}
            </a>
          );
        })}
      </div>
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

function PromoCarousel() {
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

function QuickActions() {
  const actions: { icon: LucideIcon; label: string; to?: string; href?: string }[] = [
    { icon: History, label: "Histórico", href: "#movimentacoes" },
    { icon: BadgeCheck, label: "KYC Basic", to: "/perfil/kyc" },
    { icon: ShieldCheck, label: "Segurança", to: "/perfil/configuracoes" },
    { icon: HelpCircle, label: "Ajuda", to: "/assistente" },
  ];

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-semibold text-foreground">Mais ações</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const content = (
            <>
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-brand-green-dark"
                aria-hidden="true"
              >
                <action.icon className="h-4.5 w-4.5" strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-card-foreground">{action.label}</span>
            </>
          );
          const className =
            "flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:bg-accent";

          return action.to ? (
            <Link key={action.label} to={action.to} className={className}>
              {content}
            </Link>
          ) : (
            <a key={action.label} href={action.href} className={className}>
              {content}
            </a>
          );
        })}
      </div>
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

const CATEGORY_TABS: { key: FeedFilter; label: string }[] = [
  { key: "todos", label: "Novidades" },
  { key: "evento", label: "Eventos" },
  { key: "noticia", label: "Notícias" },
];

function FeedSection({
  posts,
  activeCategory,
  onCategoryChange,
}: {
  posts: Post[];
  activeCategory: FeedFilter;
  onCategoryChange: (category: FeedFilter) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-5 border-b border-border">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onCategoryChange(tab.key)}
            className={`relative pb-3 font-display text-sm font-semibold transition ${
              activeCategory === tab.key ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {tab.label}
            {activeCategory === tab.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-green" />
            )}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">Ainda não há publicações para mostrar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-900 font-display text-xs font-bold text-white">
          {post.author_avatar_url ? (
            <img
              src={post.author_avatar_url}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          ) : (
            post.author_name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-semibold text-card-foreground">
            {post.author_name}
            <CheckCircle2
              className="h-3.5 w-3.5 shrink-0 text-brand-green"
              strokeWidth={2.25}
              aria-hidden="true"
            />
          </p>
          <p className="text-xs text-muted-foreground">{relativeTime(post.created_at)}</p>
        </div>
      </div>

      <div className="px-4 pb-1 pt-3">
        <p className="font-display text-sm font-semibold leading-snug text-card-foreground">
          {post.title}
        </p>
        {post.body && (
          <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
            {post.body}
          </p>
        )}
      </div>

      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="mt-3 aspect-video w-full object-cover"
          loading="lazy"
        />
      )}

      <div className="flex items-center gap-5 px-4 py-3 text-muted-foreground">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <ThumbsUp className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {post.likes_count}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {post.comments_count}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {post.shares_count}
        </span>
      </div>
    </article>
  );
}
