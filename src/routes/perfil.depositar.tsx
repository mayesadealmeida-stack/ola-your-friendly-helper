import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  Paperclip,
  CheckCircle2,
  X,
  Landmark,
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useWallet } from "@/hooks/use-wallet";

export const Route = createFileRoute("/perfil/depositar")({
  head: () => ({
    meta: [{ title: "Group Mobil — Recarregar" }],
  }),
  component: DepositarPage,
});

// -----------------------------------------------------------------------------
// PREENCHER com as contas bancárias reais da Group Mobil antes de publicar.
// Cada entrada: { bank: "Nome do banco", holder: "Titular", iban: "IBAN" }
// -----------------------------------------------------------------------------
const BANK_ACCOUNTS: { bank: string; holder: string; iban: string }[] = [];

const QUICK_AMOUNTS = [6000, 15000, 30000, 50000, 100000, 250000];

type Phase = "valor" | "dados" | "comprovativo" | "enviado";

function DepositarPage() {
  const navigate = useNavigate();
  const { notAuthenticated, loading: profileLoading } = useProfile();
  const { requestDeposit } = useWallet();

  const [phase, setPhase] = useState<Phase>("valor");
  const [amount, setAmount] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profileLoading && notAuthenticated) navigate({ to: "/" });
  }, [profileLoading, notAuthenticated, navigate]);

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }
  if (notAuthenticated) return null;

  const amountValue = Number(amount.replace(/\D/g, ""));

  async function handleSubmitProof() {
    setError(null);
    if (!proofFile) {
      setError("Anexe o comprovativo do depósito (foto ou PDF).");
      return;
    }
    setSubmitting(true);
    const { error: submitError } = await requestDeposit(amountValue, "bank_transfer", proofFile);
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setPhase("enviado");
  }

  return (
    <div className="min-h-screen bg-secondary/40 pb-16">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-3 px-5 pb-4 pt-6">
          <Link
            to="/perfil"
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition hover:bg-accent"
          >
            <ArrowLeft className="h-4.5 w-4.5" strokeWidth={2.25} aria-hidden="true" />
          </Link>
          <h1 className="font-display text-lg font-bold text-foreground">Recarregar</h1>
        </header>

        <main className="px-5">
          {phase === "valor" && (
            <ValorStep
              amount={amount}
              setAmount={setAmount}
              onConfirm={() => setShowConfirm(true)}
            />
          )}

          {phase === "dados" && <DadosBancariosStep onDone={() => setPhase("comprovativo")} />}

          {phase === "comprovativo" && (
            <ComprovativoStep
              amountValue={amountValue}
              proofFile={proofFile}
              setProofFile={setProofFile}
              fileInputRef={fileInputRef}
              error={error}
              submitting={submitting}
              onSubmit={handleSubmitProof}
            />
          )}

          {phase === "enviado" && <EnviadoStep />}
        </main>
      </div>

      {showConfirm && (
        <ConfirmDialog
          amountValue={amountValue}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false);
            setPhase("dados");
          }}
        />
      )}
    </div>
  );
}

function ValorStep({
  amount,
  setAmount,
  onConfirm,
}: {
  amount: string;
  setAmount: (v: string) => void;
  onConfirm: () => void;
}) {
  const amountValue = Number(amount.replace(/\D/g, ""));

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Selecione um valor rápido ou introduza o montante desejado.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {QUICK_AMOUNTS.map((value) => (
          <button
            key={value}
            onClick={() => setAmount(String(value))}
            className={`rounded-2xl py-3.5 text-sm font-semibold transition ${
              amountValue === value
                ? "bg-navy-900 text-white"
                : "bg-card text-card-foreground shadow-sm hover:bg-accent"
            }`}
          >
            {new Intl.NumberFormat("pt-AO").format(value)}
          </button>
        ))}
      </div>

      <input
        type="text"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        placeholder="Digite o valor"
        className="mt-4 w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-foreground shadow-sm outline-none transition focus:border-navy-900"
      />

      <button
        onClick={onConfirm}
        disabled={!amountValue}
        className="mt-4 w-full rounded-2xl bg-navy-900 py-4 text-center text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirmar depósito
      </button>

      <div className="mt-5 rounded-2xl bg-card p-5 shadow-sm">
        <p className="font-display text-sm font-semibold text-card-foreground">
          Informações importantes
        </p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>• Processamento: 10h00 às 22h00</li>
          <li>• Envie o comprovativo apenas para canais oficiais</li>
        </ul>
        <p className="mt-2 text-xs font-medium text-navy-900">
          A Group Mobil não se responsabiliza por envios fora do horário.
        </p>
      </div>
    </>
  );
}

function ConfirmDialog({
  amountValue,
  onCancel,
  onConfirm,
}: {
  amountValue: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-3xl bg-navy-900 p-6 text-center text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-lg font-bold">Confirmar depósito</p>
        <p className="mt-2 text-sm text-white/70">
          Deseja depositar Kz {new Intl.NumberFormat("pt-AO").format(amountValue)}?
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-white/15 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-navy-900 transition hover:bg-white/90"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function DadosBancariosStep({ onDone }: { onDone: () => void }) {
  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground">
        Deposite o valor numa das contas abaixo e depois anexe o comprovativo.
      </p>

      <div className="mt-4 space-y-4">
        {BANK_ACCOUNTS.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <Landmark className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">
              As contas bancárias para depósito serão apresentadas aqui em breve.
            </p>
          </div>
        ) : (
          BANK_ACCOUNTS.map((account) => <BankAccountCard key={account.iban} account={account} />)
        )}
      </div>

      <button
        onClick={onDone}
        className="mt-6 w-full rounded-2xl bg-navy-900 py-4 text-center text-sm font-bold text-white transition hover:opacity-90"
      >
        Concluído
      </button>
    </>
  );
}

function BankAccountCard({ account }: { account: { bank: string; holder: string; iban: string } }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(account.iban);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <p className="font-display text-sm font-bold text-navy-900">{account.bank}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Titular: <span className="font-medium text-card-foreground">{account.holder}</span>
      </p>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
        <div>
          <p className="text-[11px] text-muted-foreground">IBAN</p>
          <p className="text-sm font-medium text-card-foreground">{account.iban}</p>
        </div>
        <button
          onClick={handleCopy}
          aria-label="Copiar IBAN"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-white transition hover:opacity-90"
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

function ComprovativoStep({
  amountValue,
  proofFile,
  setProofFile,
  fileInputRef,
  error,
  submitting,
  onSubmit,
}: {
  amountValue: number;
  proofFile: File | null;
  setProofFile: (f: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground">
        Envie o comprovativo do depósito de{" "}
        <span className="font-semibold text-card-foreground">
          Kz {new Intl.NumberFormat("pt-AO").format(amountValue)}
        </span>{" "}
        para confirmarmos.
      </p>

      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />

        {proofFile ? (
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3.5 shadow-sm">
            <span className="flex items-center gap-2 truncate text-sm text-card-foreground">
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{proofFile.name}</span>
            </span>
            <button
              onClick={() => {
                setProofFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              aria-label="Remover ficheiro"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card py-4 text-sm font-medium text-muted-foreground transition hover:border-navy-900 hover:text-navy-900"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            Anexar comprovativo (foto ou PDF)
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-900 py-4 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {submitting ? "A enviar…" : "Enviar"}
      </button>
    </>
  );
}

function EnviadoStep() {
  return (
    <div className="flex flex-col items-center pt-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/15 text-brand-green-dark">
        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold text-foreground">Depósito em análise</p>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        O valor fica pendente no seu perfil. Assim que a equipa Group Mobil confirmar o
        comprovativo, o saldo entra automaticamente na sua carteira.
      </p>
      <Link
        to="/perfil"
        className="mt-6 rounded-2xl bg-navy-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Voltar ao perfil
      </Link>
    </div>
  );
}
