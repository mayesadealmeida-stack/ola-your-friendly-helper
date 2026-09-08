import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [{ title: "Group Mobil — Mercado" }],
  }),
  component: MercadoPage,
});

function MercadoPage() {
  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <header className="bg-navy-900 px-5 pb-6 pt-6">
          <p className="font-display text-xl font-semibold text-white">Mercado</p>
        </header>

        <main className="px-5 pt-5" />
      </div>

      <BottomNav active="mercado" />
    </div>
  );
}
