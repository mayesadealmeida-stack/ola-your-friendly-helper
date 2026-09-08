import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  CircleDollarSign,
  Info,
  Loader2,
  ReceiptText,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [{ title: "Group Mobil — Notificações" }],
  }),
  component: NotificacoesPage,
});

function NotificacoesPage() {
  const { notifications, unreadCount, loading, markAllAsRead, markAsRead } = useNotifications();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function handleMarkAsRead(id: string) {
    setMarkingId(id);
    await markAsRead(id);
    setMarkingId(null);
  }

  async function handleMarkAllAsRead() {
    setMarkingAll(true);
    await markAllAsRead();
    setMarkingAll(false);
  }

  return (
    <div className="min-h-screen bg-secondary/40 pb-10">
      <header className="flex items-center gap-3 bg-navy-900 px-5 py-4 text-white">
        <Link
          to="/perfil"
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
        >
          <ArrowLeft className="h-4.5 w-4.5" strokeWidth={2.25} aria-hidden="true" />
        </Link>
        <h1 className="flex-1 font-display text-base font-semibold">Notificações</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 transition hover:text-white disabled:opacity-60"
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Ler todas
          </button>
        )}
      </header>

      <main className="mx-auto max-w-md px-5 pt-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2
              className="h-6 w-6 animate-spin text-muted-foreground"
              aria-label="A carregar"
            />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-navy-900">
              <Bell className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">
              Ainda não tem notificações. Assim que houver novidades na sua conta ou grupos,
              aparecem aqui.
            </p>
          </div>
        ) : (
          <section className="space-y-3" aria-label="Lista de notificações">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                marking={markingId === notification.id}
                onRead={() => handleMarkAsRead(notification.id)}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  wallet: "Carteira",
  wallet_pending: "Carteira",
  rate_up: "Cumprimento",
  rate_down: "Cumprimento",
  level_up: "Nível",
  level_down: "Nível",
  pending: "Pendências",
  override: "Conta",
  info: "Informação",
};

const NOTIFICATION_KIND_ICONS: Record<string, LucideIcon> = {
  wallet: CircleDollarSign,
  wallet_pending: CircleDollarSign,
  rate_up: TrendingUp,
  rate_down: TrendingUp,
  level_up: TrendingUp,
  level_down: TrendingUp,
  pending: ReceiptText,
  override: Info,
  info: Info,
};

function NotificationCard({
  notification,
  marking,
  onRead,
}: {
  notification: ReturnType<typeof useNotifications>["notifications"][number];
  marking: boolean;
  onRead: () => void;
}) {
  const Icon = NOTIFICATION_KIND_ICONS[notification.kind] ?? Bell;
  const isUnread = !notification.read_at;
  const date = new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(notification.created_at));

  return (
    <button
      type="button"
      onClick={onRead}
      disabled={marking || !isUnread}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
        isUnread
          ? "border-destructive/20 bg-destructive/5 shadow-sm"
          : "border-border bg-card hover:bg-accent"
      } disabled:cursor-default`}
      aria-label={isUnread ? `Marcar como lida: ${notification.title}` : notification.title}
    >
      <span
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          isUnread ? "bg-destructive/15 text-destructive" : "bg-secondary text-navy-900"
        }`}
      >
        {marking ? (
          <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="flex-1 text-sm font-semibold text-card-foreground">
            {notification.title}
          </span>
          {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive" />}
        </span>
        {notification.body && (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {notification.body}
          </span>
        )}
        <span className="mt-2 block text-[11px] font-medium text-muted-foreground">
          {NOTIFICATION_KIND_LABELS[notification.kind] ?? "Notificação"} · {date}
        </span>
      </span>
    </button>
  );
}
