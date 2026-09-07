import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useAdminFinance, useIsAdmin, type WalletTx } from "@/hooks/use-admin";
import { PAYMENT_METHOD_INFO, type PaymentMethodKey } from "@/hooks/use-payment-methods";
import { formatKz, formatDate } from "@/lib/groups";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Administração" },
      {
        name: "description",
        content:
          "Painel de administração da Group Mobil: entradas de dinheiro, pedidos de levantamento e resumo financeiro da plataforma.",
      },
      { property: "og:title", content: "Group Mobil — Administração" },
      {
        property: "og:description",
        content: "Resumo financeiro, pagamentos recebidos e pedidos de levantamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type TabKey = "resumo" | "pagamentos" | "saques" | "contribuicoes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "pagamentos", label: "Pagamentos" },
  { key: "saques", label: "Levantamentos" },
  { key: "contribuicoes", label: "Contribuições" },
];

function methodLabel(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_METHOD_INFO[method as PaymentMethodKey]?.label ?? method;
}

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading, userId } = useIsAdmin();
  const finance = useAdminFinance(isAdmin);
  const [tab, setTab] = useState<TabKey>("resumo");

  useEffect(() => {
    if (!roleLoading && !userId) navigate({ to: "/" });
  }, [roleLoading, userId, navigate]);

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-secondary/40 px-6 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="font-display text-lg font-semibold">Área restrita</h1>
        <p className="text-sm text-muted-foreground">
          Esta página é só para a equipa Group Mobil. A sua conta não tem acesso.
        </p>
        <Link
          to="/home"
          className="rounded-2xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Voltar à página inicial
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40 pb-16">
      <div className="mx-auto max-w-md">
        <header
          className="px-5 pb-16 pt-8"
          style={{
            background:
              "radial-gradient(120% 140% at 82% 0%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 60%)",
          }}
        >
          <div className="flex items-center justify-between">
            <Link to="/home" className="flex items-center gap-1 text-sm text-white/70">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Início
            </Link>
            <button
              type="button"
              onClick={() => finance.refresh()}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Atualizar
            </button>
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold text-white">Administração</h1>
          <p className="mt-1 text-sm text-white/55">
            Dinheiro que entra, levantamentos e quem já pagou.
          </p>
        </header>

        <main className="-mt-10 space-y-4 px-5">
          <nav className="flex gap-1 rounded-2xl bg-card p-1 shadow-xl shadow-navy-900/10">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                  tab === t.key
                    ? "bg-navy-900 text-white"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {finance.loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : (
            <>
              {tab === "resumo" && <ResumoTab finance={finance} />}
              {tab === "pagamentos" && <MovimentosTab finance={finance} kind="deposito" />}
              {tab === "saques" && <MovimentosTab finance={finance} kind="levantamento" />}
              {tab === "contribuicoes" && <ContribuicoesTab finance={finance} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

type Finance = ReturnType<typeof useAdminFinance>;

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "text-brand-green-dark"
      : tone === "amber"
        ? "text-amber-600"
        : "text-card-foreground";
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ResumoTab({ finance }: { finance: Finance }) {
  const s = finance.summary;
  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
        <p className="text-xs font-medium text-muted-foreground">Saldo total da plataforma</p>
        <p className="mt-1 font-display text-3xl font-bold text-card-foreground">
          {formatKz(s.saldo_plataforma)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Soma de tudo o que está confirmado nas carteiras.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Entrou (confirmado)" value={formatKz(s.total_entradas)} tone="green" />
        <StatCard label="Saiu (confirmado)" value={formatKz(s.total_saidas)} />
        <StatCard
          label="Depósitos por confirmar"
          value={formatKz(s.depositos_pendentes)}
          hint={`${s.n_depositos_pendentes} pedido(s)`}
          tone="amber"
        />
        <StatCard
          label="Levantamentos por pagar"
          value={formatKz(s.saques_pendentes)}
          hint={`${s.n_saques_pendentes} pedido(s)`}
          tone="amber"
        />
        <StatCard label="Contribuições pagas" value={formatKz(s.total_contribuicoes_pagas)} />
        <StatCard
          label="Contribuições por pagar"
          value={String(s.n_contribuicoes_pendentes)}
          hint="pessoas ainda em falta"
        />
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-navy-900">
          <Users className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-card-foreground">{s.n_utilizadores} contas</p>
          <p className="text-xs text-muted-foreground">Pessoas registadas na plataforma.</p>
        </div>
      </div>
    </div>
  );
}

function MovimentosTab({ finance, kind }: { finance: Finance; kind: "deposito" | "levantamento" }) {
  const list = useMemo(
    () => finance.transactions.filter((t) => t.type === kind),
    [finance.transactions, kind],
  );
  const pending = list.filter((t) => t.status === "pendente");
  const done = list.filter((t) => t.status !== "pendente");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="font-display text-sm font-semibold text-card-foreground">
          {kind === "deposito" ? "Dinheiro a entrar" : "Pedidos de levantamento"}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {kind === "deposito"
            ? "Confirme depois de ver o comprovativo enviado."
            : "Confirme depois de enviar o dinheiro à pessoa."}
        </p>
      </section>

      <Section title={`Por tratar (${pending.length})`}>
        {pending.length === 0 ? (
          <Empty text="Nada pendente de momento." />
        ) : (
          pending.map((t) => <TxRow key={t.id} tx={t} finance={finance} actionable />)
        )}
      </Section>

      <Section title={`Histórico (${done.length})`}>
        {done.length === 0 ? (
          <Empty text="Ainda sem histórico." />
        ) : (
          done.map((t) => <TxRow key={t.id} tx={t} finance={finance} />)
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-card p-4 text-center text-xs text-muted-foreground shadow-sm">
      {text}
    </p>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-600",
  confirmado: "bg-brand-green/15 text-brand-green-dark",
  rejeitado: "bg-destructive/15 text-destructive",
};

function TxRow({
  tx,
  finance,
  actionable = false,
}: {
  tx: WalletTx;
  finance: Finance;
  actionable?: boolean;
}) {
  const [busy, setBusy] = useState<"ok" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profile = finance.profiles[tx.user_id];
  const isIn = Number(tx.amount) > 0;

  async function act(approve: boolean) {
    setError(null);
    setBusy(approve ? "ok" : "no");
    const { error: err } = await finance.review(
      tx.id,
      approve,
      approve ? "" : "Comprovativo não válido",
    );
    setBusy(null);
    if (err) setError(err);
  }

  async function openProof() {
    const url = await finance.proofUrl(tx.proof_url);
    if (url) window.open(url, "_blank", "noopener");
    else setError("Não foi possível abrir o comprovativo.");
  }

  return (
    <article className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isIn ? "bg-brand-green/15 text-brand-green-dark" : "bg-secondary text-navy-900"
          }`}
        >
          {isIn ? (
            <ArrowDownLeft className="h-4.5 w-4.5" aria-hidden="true" />
          ) : (
            <ArrowUpRight className="h-4.5 w-4.5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-card-foreground">
            {profile?.full_name?.trim() || "Conta sem nome"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {profile?.phone || "—"} · {methodLabel(tx.method)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(tx.created_at)}</p>
        </div>
        <div className="text-right">
          <p
            className={`font-display text-sm font-bold ${
              isIn ? "text-brand-green-dark" : "text-card-foreground"
            }`}
          >
            {isIn ? "+" : "−"}
            {formatKz(Math.abs(Number(tx.amount)))}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              STATUS_STYLE[tx.status] ?? "bg-secondary text-muted-foreground"
            }`}
          >
            {tx.status}
          </span>
        </div>
      </div>

      {tx.proof_url && (
        <button
          type="button"
          onClick={openProof}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-navy-900 underline-offset-2 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Ver comprovativo
        </button>
      )}

      {actionable && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => act(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy === "ok" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            Confirmar
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => act(false)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/25 bg-destructive/5 py-2.5 text-xs font-semibold text-destructive disabled:opacity-60"
          >
            {busy === "no" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden="true" />
            )}
            Rejeitar
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] font-medium text-destructive">{error}</p>}
    </article>
  );
}

function ContribuicoesTab({ finance }: { finance: Finance }) {
  const paid = finance.contributions.filter((c) => c.status === "confirmada");
  const unpaid = finance.contributions.filter((c) => c.status !== "confirmada");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Já pagaram" value={String(paid.length)} tone="green" />
        <StatCard label="Ainda não pagaram" value={String(unpaid.length)} tone="amber" />
      </div>

      <Section title={`Em falta (${unpaid.length})`}>
        {unpaid.length === 0 ? (
          <Empty text="Toda a gente está em dia." />
        ) : (
          unpaid.map((c) => (
            <ContribRow
              key={c.id}
              name={c.participant_name}
              group={c.group_name}
              round={c.round_number}
              amount={Number(c.amount)}
              date={c.due_date}
              status={c.status}
            />
          ))
        )}
      </Section>

      <Section title={`Pagas (${paid.length})`}>
        {paid.length === 0 ? (
          <Empty text="Ainda sem contribuições pagas." />
        ) : (
          paid.map((c) => (
            <ContribRow
              key={c.id}
              name={c.participant_name}
              group={c.group_name}
              round={c.round_number}
              amount={Number(c.amount)}
              date={c.paid_at ?? c.due_date}
              status={c.status}
            />
          ))
        )}
      </Section>
    </div>
  );
}

function ContribRow({
  name,
  group,
  round,
  amount,
  date,
  status,
}: {
  name: string;
  group: string;
  round: number;
  amount: number;
  date: string;
  status: string;
}) {
  const ok = status === "confirmada";
  return (
    <article className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-brand-green/15 text-brand-green-dark" : "bg-amber-500/15 text-amber-600"
        }`}
      >
        <Wallet className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-card-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {group} · rodada {round} · {formatDate(date)}
        </p>
      </div>
      <p className="font-display text-sm font-bold text-card-foreground">{formatKz(amount)}</p>
    </article>
  );
}
