import { useQuery } from "@tanstack/react-query";

export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
};

const COINS: { id: string; symbol: string; name: string }[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "tether", symbol: "USDT", name: "Tether" },
];

export const MARKET_QUERY_KEY = ["market-prices"] as const;

type CoinGeckoResponse = Record<string, { usd?: number; usd_24h_change?: number }>;

async function fetchMarketPrices(): Promise<MarketCoin[]> {
  const ids = COINS.map((c) => c.id).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
  );

  if (!res.ok) throw new Error("Falha ao obter cotações.");
  const data = (await res.json()) as CoinGeckoResponse;

  return COINS.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    priceUsd: data[c.id]?.usd ?? 0,
    change24h: data[c.id]?.usd_24h_change ?? 0,
  }));
}

/**
 * Cotações públicas de criptomoedas (CoinGecko), apenas informativo.
 * A Group Mobil não compra, vende nem gere investimentos em cripto —
 * isto é só um painel de consulta de preços.
 */
export function useMarketPrices() {
  const query = useQuery({
    queryKey: MARKET_QUERY_KEY,
    queryFn: fetchMarketPrices,
    staleTime: 30 * 1000,
    refetchInterval: 45 * 1000,
    retry: 1,
  });

  return {
    coins: query.data ?? [],
    loading: query.isPending,
    error: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
