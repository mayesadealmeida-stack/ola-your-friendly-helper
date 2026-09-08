import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [{ title: "Group Mobil — Notificações" }],
  }),
  component: NotificacoesPage,
});

function NotificacoesPage() {
  const { unreadCount, loading } = useNotifications();

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
        <h1 className="font-display text-base font-semibold">Notificações</h1>
      </header>

      <main className="mx-auto max-w-md px-5 pt-6">
        {loading ? null : unreadCount === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-navy-900">
              <Bell className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">
              Ainda não tem notificações. Assim que houver novidades na sua conta ou grupos,
              aparecem aqui.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
