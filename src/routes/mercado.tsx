import { createFileRoute } from "@tanstack/react-router";
import { Info, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useMarketPrices, type MarketCoin } from "@/hooks/use-market";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Mercado" },
      {
        name: "description",
        content: "Cotações de criptomoedas em tempo real, apenas para consulta.",
      },
    ],
  }),
  component: MercadoPage,
});

const COIN_COLORS: Record<string, string> = {
  BTC: "bg-amber-500",
  ETH: "bg-indigo-500",
  BNB: "bg-yellow-500",
  SOL: "bg-fuchsia-500",
  XRP: "bg-slate-600",
  USDT: "bg-brand-green",
};

function formatUsd(value: number): string {
  const digits = value >= 1 ? 2 : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function MercadoPage() {
  const { coins, loading, error, isFetching, refetch } = useMarketPrices();

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <header className="bg-navy-900 px-5 pb-6 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-xl font-semibold text-white">Mercado</p>
              <p className="mt-1 text-sm text-white/55">Cotações em tempo real</p>
            </div>
            <button
              onClick={() => refetch()}
              aria-label="Atualizar cotações"
              disabled={isFetching}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4.5 w-4.5 ${isFetching ? "animate-spin" : ""}`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
          </div>
        </header>

        <main className="space-y-5 px-5 pt-5">
          <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-card px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Painel informativo com preços públicos. A Group Mobil não compra, vende, troca nem
              gere investimentos em criptomoedas — os valores servem apenas para consulta.
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[68px] animate-pulse rounded-2xl border border-border bg-card"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível obter as cotações agora.
              </p>
              <button
                onClick={() => refetch()}
                className="mt-3 rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-brand-green-dark"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {coins.map((coin) => (
                <CoinRow key={coin.id} coin={coin} />
              ))}
            </div>
          )}
        </main>
      </div>

      <BottomNav active="mercado" />
    </div>
  );
}

function CoinRow({ coin }: { coin: MarketCoin }) {
  const positive = coin.change24h >= 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white ${
          COIN_COLORS[coin.symbol] ?? "bg-navy-900"
        }`}
        aria-hidden="true"
      >
        {coin.symbol}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-card-foreground">{coin.name}</p>
        <p className="text-xs text-muted-foreground">{coin.symbol}</p>
      </div>

      <div className="text-right">
        <p className="font-display text-sm font-semibold text-card-foreground">
          {formatUsd(coin.priceUsd)}
        </p>
        <p
          className={`mt-0.5 flex items-center justify-end gap-1 text-xs font-medium ${
            positive ? "text-brand-green-dark" : "text-destructive"
          }`}
        >
          {positive ? (
            <TrendingUp className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
          )}
          {positive ? "+" : ""}
          {coin.change24h.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}
