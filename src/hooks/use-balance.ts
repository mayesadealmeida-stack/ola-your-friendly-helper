import { useWallet } from "@/hooks/use-wallet";

/** Saldo real da carteira — soma dos movimentos confirmados. */
export function useBalance() {
  const { balance, loading } = useWallet();
  return { amountKz: balance, loading };
}
