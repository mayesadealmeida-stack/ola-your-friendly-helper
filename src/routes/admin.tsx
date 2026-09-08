import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  Copy,
  ExternalLink,
  FileText,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Lock,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  KeyRound,
  ClipboardCheck,
  TrendingUp,
  User as UserIcon,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAdminLoginEmail, validatePassword } from "@/lib/phone";
import { useAdminFinance, useIsAdmin, type WalletTx } from "@/hooks/use-admin";
import { usePlans, type InvestmentPlan } from "@/hooks/use-plans";
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

type TabKey =
  "resumo" | "pagamentos" | "saques" | "usuarios" | "faturas" | "planos" | "tarefas" | "seguranca";

const ADMIN_ACTIONS: {
  key: TabKey;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { key: "resumo", label: "Resumo", description: "Visão geral", icon: LayoutDashboard },
  {
    key: "pagamentos",
    label: "Pagamentos",
    description: "Confirmar entradas",
    icon: ArrowDownLeft,
  },
  { key: "saques", label: "Levantamentos", description: "Pedidos de saída", icon: ArrowUpRight },
  { key: "usuarios", label: "Usuários", description: "Contas e saldos", icon: Users },
  { key: "faturas", label: "Faturas", description: "Comprovativos", icon: FileText },
  { key: "planos", label: "Planos", description: "Gerir investimentos", icon: TrendingUp },
  { key: "tarefas", label: "Tarefas", description: "Rodadas e pagamentos", icon: ClipboardCheck },
  { key: "seguranca", label: "Segurança", description: "Trocar palavra-passe", icon: KeyRound },
];

function methodLabel(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_METHOD_INFO[method as PaymentMethodKey]?.label ?? method;
}

function AdminPage() {
  const { isAdmin, loading: roleLoading, userId } = useIsAdmin();
  const finance = useAdminFinance(isAdmin);
  const [tab, setTab] = useState<TabKey>("resumo");
  // Exige sempre o login próprio do admin nesta página — mesmo que o
  // navegador já tenha uma sessão normal de utilizador aberta, essa sessão
  // nunca é usada para dar acesso automático ao painel.
  const [adminAuthAttempted, setAdminAuthAttempted] = useState(false);

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (!adminAuthAttempted || !userId) {
    return <AdminLoginForm onAuthenticated={() => setAdminAuthAttempted(true)} />;
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
            Organize pagamentos, utilizadores, faturas e planos num só lugar.
          </p>
        </header>

        <main className="-mt-10 space-y-4 px-5">
          <nav className="rounded-3xl bg-card p-4 shadow-xl shadow-navy-900/10">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-display text-sm font-semibold text-card-foreground">
                  Ações rápidas
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Escolha uma área para gerir.</p>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Admin
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_ACTIONS.map((action) => {
                const Icon = action.icon;
                const active = tab === action.key;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => setTab(action.key)}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-navy-900 bg-navy-900 text-white shadow-md shadow-navy-900/20"
                        : "border-border bg-background text-card-foreground hover:border-navy-900/30 hover:bg-secondary"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-white/15 text-white" : "bg-secondary text-navy-900"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold">{action.label}</span>
                      <span
                        className={`mt-0.5 block truncate text-[10px] ${
                          active ? "text-white/65" : "text-muted-foreground"
                        }`}
                      >
                        {action.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
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
              {tab === "usuarios" && <UsuariosTab finance={finance} />}
              {tab === "faturas" && <FaturasTab finance={finance} />}
              {tab === "planos" && <PlanosTab />}
              {tab === "tarefas" && <TarefasTab finance={finance} />}
              {tab === "seguranca" && <SegurancaTab />}
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

function computeUserBalances(transactions: WalletTx[]): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const t of transactions) {
    if (t.status !== "confirmado") continue;
    balances[t.user_id] = (balances[t.user_id] ?? 0) + Number(t.amount);
  }
  return balances;
}

function UsuariosTab({ finance }: { finance: Finance }) {
  const balances = useMemo(() => computeUserBalances(finance.transactions), [finance.transactions]);
  const people = useMemo(
    () =>
      Object.values(finance.profiles).sort((a, b) =>
        (a.full_name || a.username || "").localeCompare(b.full_name || b.username || ""),
      ),
    [finance.profiles],
  );
  const [grantingId, setGrantingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="px-1 text-xs text-muted-foreground">{people.length} conta(s) registada(s).</p>

      {people.map((p) => (
        <article key={p.id} className="rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-navy-900">
              <UserIcon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-card-foreground">
                {p.full_name?.trim() || p.username?.trim() || "Conta sem nome"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{p.phone || "—"}</p>
            </div>
            <p className="font-display text-sm font-bold text-card-foreground">
              {formatKz(balances[p.id] ?? 0)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(p.id)}
            className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3 w-3" aria-hidden="true" />
            ID: {p.id.slice(0, 8).toUpperCase()}
          </button>

          {grantingId === p.id ? (
            <GrantBalanceForm
              onCancel={() => setGrantingId(null)}
              onSubmit={async (amount, reason) => {
                const { error } = await finance.grantBalance(p.id, amount, reason);
                if (!error) setGrantingId(null);
                return { error };
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setGrantingId(p.id)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-xs font-semibold text-navy-900 transition hover:bg-secondary/70"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Dar saldo
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function GrantBalanceForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (amount: number, reason: string) => Promise<{ error: string | null }>;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const value = Number(amount.replace(/[^\d-]/g, ""));
    if (!value) {
      setError("Indique um valor (pode ser negativo, para retirar).");
      return;
    }
    if (!reason.trim()) {
      setError("Indique o motivo.");
      return;
    }
    setBusy(true);
    const { error: err } = await onSubmit(value, reason.trim());
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <input
        type="text"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))}
        placeholder="Valor em Kz (negativo para retirar)"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-brand-green"
      />
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-brand-green"
      />
      {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-secondary py-2 text-xs font-semibold text-muted-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Confirmar
        </button>
      </div>
    </div>
  );
}

function TarefasTab({ finance }: { finance: Finance }) {
  const orders = finance.taskOrders;
  const totalPaidForTasks = orders.reduce((sum, order) => sum + Number(order.price), 0);
  const totalReward = orders.reduce((sum, order) => sum + Number(order.reward), 0);
  const redeemedCycles = finance.taskCycles.filter((cycle) => cycle.status === "redeemed");
  const totalRedeemed = redeemedCycles.reduce(
    (sum, cycle) => sum + Number(cycle.locked_amount) + Number(cycle.reward_amount),
    0,
  );
  const rounds = [1, 2, 3].map((round) => {
    const roundOrders = orders.filter((order) => order.round_number === round);
    return {
      round,
      count: roundOrders.length,
      amount: roundOrders.reduce((sum, order) => sum + Number(order.price), 0),
      reward: roundOrders.reduce((sum, order) => sum + Number(order.reward), 0),
    };
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900/10 text-navy-900">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold text-card-foreground">
              Gestão de tarefas
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Veja quantas rodadas foram executadas e quanto foi pago em cada rodada.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Rodadas executadas"
          value={String(orders.length)}
          hint="Compras registadas"
        />
        <StatCard label="Valor das tarefas" value={formatKz(totalPaidForTasks)} tone="green" />
        <StatCard label="Lucro previsto" value={formatKz(totalReward)} hint="9% acumulado" />
        <StatCard
          label="Resgates pagos"
          value={formatKz(totalRedeemed)}
          hint={`${redeemedCycles.length} ciclo(s) concluído(s)`}
          tone="green"
        />
      </div>

      <Section title="Pagamentos por rodada">
        {rounds.map((item) => (
          <div
            key={item.round}
            className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-sm"
          >
            <div>
              <p className="text-sm font-semibold text-card-foreground">Rodada {item.round} de 3</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.count} tarefa(s) executada(s)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-card-foreground">{formatKz(item.amount)}</p>
              <p className="mt-0.5 text-[11px] text-brand-green-dark">
                +{formatKz(item.reward)} de lucro
              </p>
            </div>
          </div>
        ))}
      </Section>

      <Section title={`Histórico das tarefas (${orders.length})`}>
        {orders.length === 0 ? (
          <Empty text="Ainda não há tarefas executadas." />
        ) : (
          orders.map((order) => {
            const product = finance.taskProducts[order.product_id];
            const profile = finance.profiles[order.user_id];
            return (
              <article key={order.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-card-foreground">
                      {product?.name ?? "Tarefa"}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {profile?.full_name || profile?.username || "Utilizador"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-navy-900">
                    Rodada {order.round_number}/3
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(order.created_at)}
                  </p>
                  <div className="text-right">
                    <p className="text-sm font-bold text-card-foreground">
                      {formatKz(Number(order.price))}
                    </p>
                    <p className="text-[11px] text-brand-green-dark">
                      Lucro: +{formatKz(Number(order.reward))}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </Section>
    </div>
  );
}

function SegurancaTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const invalid = validatePassword(newPassword);
    if (invalid) {
      setMessage({ type: "error", text: invalid });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "As novas palavras-passe não coincidem." });
      return;
    }
    if (currentPassword === newPassword) {
      setMessage({ type: "error", text: "A nova palavra-passe deve ser diferente da atual." });
      return;
    }

    setBusy(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: getAdminLoginEmail(),
      password: currentPassword,
    });

    if (loginError) {
      setBusy(false);
      setMessage({ type: "error", text: "A palavra-passe atual está incorreta." });
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) {
      setMessage({ type: "error", text: "Não foi possível trocar a palavra-passe." });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage({ type: "ok", text: "Palavra-passe alterada com sucesso." });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900/10 text-navy-900">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold text-card-foreground">
              Segurança do administrador
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Troque a palavra-passe usada para entrar neste painel.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-card p-4 shadow-sm">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Palavra-passe atual
          </span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-navy-900"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Nova palavra-passe
          </span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-navy-900"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Confirmar nova palavra-passe
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-navy-900"
            required
          />
        </label>

        {message && (
          <p
            className={`text-xs font-medium ${
              message.type === "ok" ? "text-brand-green-dark" : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Alterar palavra-passe
        </button>
      </form>
    </div>
  );
}

function PlanosTab() {
  const { plans, loading, error: loadError, createPlan } = usePlans(true);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green-dark">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold text-card-foreground">
              Gestão de planos
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Crie planos para aparecerem imediatamente no Mercado da aplicação.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-brand-green px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-brand-green-dark"
          >
            <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {showForm ? "Fechar" : "Novo plano"}
          </button>
        </div>
      </section>

      {showForm && <PlanForm onCancel={() => setShowForm(false)} onSubmit={createPlan} />}

      {loadError && (
        <p className="rounded-2xl bg-destructive/10 p-4 text-xs font-medium text-destructive">
          Não foi possível carregar os planos: {loadError}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : plans.length === 0 ? (
        <Empty text="Ainda não há planos criados. Use “Novo plano” para publicar o primeiro." />
      ) : (
        <Section title={`Planos publicados (${plans.length})`}>
          {plans.map((plan) => (
            <AdminPlanRow key={plan.id} plan={plan} />
          ))}
        </Section>
      )}
    </div>
  );
}

function PlanForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (values: {
    name: string;
    description: string;
    entry_price: number;
    estimated_return: number;
    image?: File | null;
  }) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [estimatedReturn, setEstimatedReturn] = useState("");
  const [durationValue, setDurationValue] = useState("3");
  const [durationUnit, setDurationUnit] = useState("meses");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const entry = Number(entryPrice);
    const estimated = Number(estimatedReturn);
    const duration = Number(durationValue);
    if (!name.trim()) return setError("Digite o nome do plano.");
    if (!entry || entry < 0) return setError("Digite um preço de entrada válido.");
    if (!estimated || estimated < 0) return setError("Digite o retorno estimado.");
    if (!duration || duration < 1) return setError("Digite a duração do plano.");
    if (!description.trim()) return setError("Digite a descrição do plano.");

    setBusy(true);
    const result = await onSubmit({
      name: name.trim(),
      description: description.trim(),
      entry_price: entry,
      estimated_return: estimated,
      duration_value: duration,
      duration_unit: durationUnit,
      image,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
    } else {
      onCancel();
    }
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem válida.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setError(null);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-card p-4 shadow-sm">
      <div>
        <p className="font-display text-sm font-semibold text-card-foreground">Novo plano</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Preencha os dados e clique em publicar quando estiver pronto.
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Nome do plano
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Plano Crescimento"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-green"
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Preço de entrada (Kz)
          </span>
          <input
            type="number"
            min="1"
            value={entryPrice}
            onChange={(event) => setEntryPrice(event.target.value)}
            placeholder="50000"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-green"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Retorno estimado (Kz)
          </span>
          <input
            type="number"
            min="0"
            value={estimatedReturn}
            onChange={(event) => setEstimatedReturn(event.target.value)}
            placeholder="75000"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-green"
            required
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Duração do plano
          </span>
          <input
            type="number"
            min="1"
            value={durationValue}
            onChange={(event) => setDurationValue(event.target.value)}
            placeholder="3"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-green"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Unidade</span>
          <select
            value={durationUnit}
            onChange={(event) => setDurationUnit(event.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-green"
          >
            <option value="dias">Dias</option>
            <option value="meses">Meses</option>
            <option value="anos">Anos</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Descrição</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Explique em poucas palavras como funciona este plano."
          rows={4}
          className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-green"
          required
        />
      </label>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/50 p-3 transition hover:border-brand-green">
        {preview ? (
          <img
            src={preview}
            alt="Pré-visualização do plano"
            className="h-14 w-14 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-card text-muted-foreground">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-card-foreground">Foto do plano</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            JPG ou PNG, até 5 MB
          </span>
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => selectImage(event.target.files?.[0])}
        />
      </label>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-secondary py-3 text-xs font-semibold text-muted-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green py-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {busy ? "A publicar…" : "Pronto e publicar"}
        </button>
      </div>
    </form>
  );
}

function AdminPlanRow({ plan }: { plan: InvestmentPlan }) {
  return (
    <article className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
      {plan.image_url ? (
        <img src={plan.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-navy-900">
          <TrendingUp className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-card-foreground">{plan.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Entrada: {formatKz(Number(plan.entry_price))}
        </p>
        <p className="text-xs text-muted-foreground">
          Duração: {plan.duration_value} {plan.duration_unit}
        </p>
        <p className="text-xs font-semibold text-brand-green-dark">
          Retorno: {formatKz(Number(plan.estimated_return))}
        </p>
      </div>
      <span className="rounded-full bg-brand-green/15 px-2 py-1 text-[10px] font-semibold text-brand-green-dark">
        No Mercado
      </span>
    </article>
  );
}

function FaturasTab({ finance }: { finance: Finance }) {
  const invoices = useMemo(
    () =>
      finance.transactions.filter(
        (t) => t.status === "confirmado" && (t.type === "deposito" || t.type === "levantamento"),
      ),
    [finance.transactions],
  );
  const [viewing, setViewing] = useState<WalletTx | null>(null);

  return (
    <div className="space-y-3">
      <p className="px-1 text-xs text-muted-foreground">
        Faturas de depósitos e levantamentos já aprovados.
      </p>

      {invoices.length === 0 ? (
        <Empty text="Ainda não há faturas emitidas." />
      ) : (
        invoices.map((tx) => {
          const profile = finance.profiles[tx.user_id];
          const isIn = tx.type === "deposito";
          return (
            <article
              key={tx.id}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
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
                <p className="text-xs text-muted-foreground">
                  {isIn ? "Depósito" : "Levantamento"} · {formatDate(tx.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(tx)}
                className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-navy-900 transition hover:bg-secondary/70"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Ver
              </button>
            </article>
          );
        })
      )}

      {viewing && (
        <AdminInvoiceSheet
          tx={viewing}
          userName={
            finance.profiles[viewing.user_id]?.full_name?.trim() ||
            finance.profiles[viewing.user_id]?.username?.trim() ||
            "Participante"
          }
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function AdminInvoiceSheet({
  tx,
  userName,
  onClose,
}: {
  tx: WalletTx;
  userName: string;
  onClose: () => void;
}) {
  const invoiceNumber = `GM-${tx.id.slice(0, 8).toUpperCase()}`;
  const isIn = tx.type === "deposito";

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 px-4 pb-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-navy-900 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-group-mobil-mark.webp"
              alt="Group Mobil"
              className="h-8 w-8 object-contain"
            />
            <p className="font-display text-sm font-bold text-white">Group Mobil</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold text-slate-900">
              Fatura de {isIn ? "depósito" : "levantamento"}
            </p>
            <span className="rounded-full bg-brand-green/15 px-3 py-1 text-[11px] font-semibold text-brand-green-dark">
              Aprovado
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">Nº {invoiceNumber}</p>

          <div className="mt-5 space-y-2.5 border-y border-dashed border-slate-200 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Utilizador</span>
              <span className="font-medium text-slate-900">{userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Data do pedido</span>
              <span className="font-medium text-slate-900">{formatDate(tx.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Data de aprovação</span>
              <span className="font-medium text-slate-900">
                {tx.confirmed_at ? formatDate(tx.confirmed_at) : "—"}
              </span>
            </div>
            {tx.method && (
              <div className="flex justify-between">
                <span className="text-slate-500">Método</span>
                <span className="font-medium text-slate-900">{methodLabel(tx.method)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">Valor</span>
            <span className="font-display text-2xl font-bold text-slate-900">
              Kz{" "}
              {formatKz(Math.abs(Number(tx.amount)))
                .replace("Kz", "")
                .trim()}
            </span>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            Fatura gerada automaticamente pela Group Mobil.
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminLoginForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");

    const invalid = validatePassword(password);
    if (invalid) {
      setError(invalid);
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: getAdminLoginEmail(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("Telefone ou senha incorretos.");
      return;
    }

    // A sessão está válida — força o AdminPage a reavaliar se a conta é admin.
    await queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    onAuthenticated();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/40 px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-white">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-lg font-semibold text-foreground">Administração</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso restrito à equipa Group Mobil.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="admin-password"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Senha
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-3">
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3.5 font-display text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Entrar"}
          </button>
        </form>

        <Link
          to="/home"
          className="mt-5 block text-center text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Voltar à página inicial
        </Link>
      </div>
    </div>
  );
}
