import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  CircleDollarSign,
  Clock3,
  ListChecks,
  Loader2,
  LockKeyhole,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  WalletCards,
  X,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useTasks, type TaskProduct } from "@/hooks/use-tasks";
import { useWallet } from "@/hooks/use-wallet";

export const Route = createFileRoute("/grupos/")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Tarefas" },
      {
        name: "description",
        content: "Escolha produtos, complete três rodadas e desbloqueie o seu resgate.",
      },
    ],
  }),
  component: TasksPage,
});

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 }).format(value);

function TasksPage() {
  const wallet = useWallet();
  const tasks = useTasks();
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [busyRedeem, setBusyRedeem] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<TaskProduct | null>(null);

  const currentRound = tasks.cycle?.current_round ?? 0;
  const isCompleted = tasks.cycle?.status === "completed";
  const lockedTotal = (tasks.cycle?.locked_amount ?? 0) + (tasks.cycle?.reward_amount ?? 0);

  function handleBuy(product: TaskProduct) {
    setFeedback(null);
    setSelectedProduct(product);
  }

  async function confirmBuy() {
    if (!selectedProduct) return;
    const product = selectedProduct;
    setFeedback(null);
    setBusyProduct(product.id);
    const result = await tasks.startTask(product.id);
    setBusyProduct(null);
    setSelectedProduct(null);
    setFeedback(
      result.error ? translateTaskError(result.error) : `Rodada ${currentRound + 1} concluída.`,
    );
  }

  async function handleRedeem() {
    if (!tasks.cycle) return;
    setFeedback(null);
    setBusyRedeem(true);
    const result = await tasks.redeemTasks(tasks.cycle.id);
    setBusyRedeem(false);
    setFeedback(
      result.error
        ? translateTaskError(result.error)
        : "Resgate concluído. O valor voltou para o seu saldo.",
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <header
          className="px-5 pb-7 pt-8 text-white"
          style={{
            background:
              "radial-gradient(120% 140% at 82% 0%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 60%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-2 font-display text-xl font-semibold">
                <ListChecks className="h-5 w-5 text-brand-green" aria-hidden="true" />
                Tarefas
              </p>
              <p className="mt-1 text-sm text-white/60">
                Ajude a plataforma a vender produtos e complete as suas rodadas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => tasks.refresh()}
              className="rounded-full bg-white/10 p-2.5 text-white/75 transition hover:bg-white/15 hover:text-white"
              aria-label="Atualizar tarefas"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="space-y-5 px-5 pt-5">
          <WalletSummary
            balance={wallet.balance}
            lockedTotal={lockedTotal}
            loading={wallet.loading}
          />

          {tasks.loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : tasks.error ? (
            <ErrorCard message="Não foi possível carregar as tarefas. Execute a migration de tarefas no Supabase." />
          ) : (
            <>
              <RoundProgress cycle={tasks.cycle} />

              {isCompleted && tasks.cycle && (
                <RedeemCard
                  total={lockedTotal}
                  reward={tasks.cycle.reward_amount}
                  busy={busyRedeem}
                  onRedeem={handleRedeem}
                />
              )}

              <section>
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <h2 className="font-display text-sm font-semibold text-foreground">
                      Produtos disponíveis
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Cada compra conta como uma rodada da tarefa.
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-[10px] font-bold text-brand-green-dark">
                    +15% no resgate
                  </span>
                </div>

                {tasks.products.length === 0 ? (
                  <EmptyTasks />
                ) : (
                  <div className="space-y-3">
                    {tasks.products.map((product) => (
                      <ProductTaskCard
                        key={product.id}
                        product={product}
                        balance={wallet.balance}
                        disabled={Boolean(isCompleted || busyProduct)}
                        busy={busyProduct === product.id}
                        onBuy={() => handleBuy(product)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {tasks.orders.length > 0 && (
                <TaskHistory tasks={tasks.orders} products={tasks.allProducts} />
              )}
            </>
          )}

          {feedback && (
            <p className="rounded-2xl border border-brand-green/20 bg-brand-green/10 px-4 py-3 text-center text-xs font-semibold text-brand-green-dark">
              {feedback}
            </p>
          )}
        </main>
      </div>

      <BottomNav active="tarefas" />

      {selectedProduct && !isCompleted && (
        <PurchaseTaskModal
          product={selectedProduct}
          round={currentRound + 1}
          busy={busyProduct === selectedProduct.id}
          onCancel={() => setSelectedProduct(null)}
          onConfirm={confirmBuy}
        />
      )}
    </div>
  );
}

function WalletSummary({
  balance,
  lockedTotal,
  loading,
}: {
  balance: number;
  lockedTotal: number;
  loading: boolean;
}) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-navy-900 p-4 text-white shadow-md shadow-navy-900/15">
        <WalletCards className="h-5 w-5 text-brand-green" aria-hidden="true" />
        <p className="mt-3 text-[11px] text-white/55">Saldo disponível</p>
        <p className="mt-1 font-display text-xl font-bold">
          {loading ? "…" : `Kz ${fmt(balance)}`}
        </p>
        <Link
          to="/perfil/depositar"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-green"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Depositar
        </Link>
      </div>
      <div className="rounded-2xl border border-amber-500/20 bg-amber-50 p-4 text-amber-950">
        <LockKeyhole className="h-5 w-5 text-amber-600" aria-hidden="true" />
        <p className="mt-3 text-[11px] text-amber-900/60">Bloqueado para resgate</p>
        <p className="mt-1 font-display text-xl font-bold">Kz {fmt(lockedTotal)}</p>
        <p className="mt-3 text-[11px] font-medium text-amber-900/60">Liberta após 3 rodadas</p>
      </div>
    </section>
  );
}

function RoundProgress({ cycle }: { cycle: ReturnType<typeof useTasks>["cycle"] }) {
  const completed = cycle?.current_round ?? 0;
  const isReady = cycle?.status === "completed";
  const nextRound = Math.min(completed + 1, 3);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-brand-green/5 p-5 shadow-sm">
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand-green/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="relative">
          <p className="font-display text-sm font-semibold text-card-foreground">
            {isReady ? "Ciclo concluído" : "Progresso da tarefa"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {isReady
              ? "As três rodadas estão completas. O seu resgate está desbloqueado."
              : `Complete as três rodadas para desbloquear o seu resgate · próxima: ${nextRound}/3.`}
          </p>
        </div>
        <span className="relative shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-navy-900">
          {completed}/3
        </span>
      </div>

      <div className="relative mt-5 flex items-center">
        {[1, 2, 3].map((round) => (
          <div key={round} className="flex flex-1 items-center last:flex-none">
            <span
              className={`task-round-marker flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-700 ${
                round <= completed
                  ? "task-round-complete border-brand-green bg-brand-green text-navy-900"
                  : round === nextRound && !isReady
                    ? "task-round-active border-brand-green/70 bg-brand-green/10 text-brand-green-dark"
                    : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {round <= completed ? <Check className="h-4 w-4" aria-hidden="true" /> : round}
            </span>
            {round < 3 && (
              <span
                className={`mx-2 h-1 flex-1 overflow-hidden rounded-full bg-border transition-all duration-700 ${
                  round < completed ? "bg-brand-green" : ""
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="relative mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>Rodada 1</span>
        <span>Rodada 2</span>
        <span>Rodada 3</span>
      </div>
      <div className="relative mt-4 flex items-center justify-between rounded-2xl bg-secondary/70 px-3 py-2.5 text-[11px]">
        <span className="font-medium text-muted-foreground">
          {completed === 0 ? "Comece pela primeira compra" : `${completed} de 3 concluída(s)`}
        </span>
        <span className="font-bold text-brand-green-dark">+15% no resgate</span>
      </div>
    </section>
  );
}

function ProductTaskCard({
  product,
  balance,
  disabled,
  busy,
  onBuy,
}: {
  product: TaskProduct;
  balance: number;
  disabled: boolean;
  busy: boolean;
  onBuy: () => void;
}) {
  const insufficient = product.price > balance;

  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary text-navy-900">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt=""
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            <Package className="h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-green-dark">
                {product.category}
              </p>
              <h3 className="mt-1 truncate font-display text-sm font-bold text-card-foreground">
                {product.name}
              </h3>
            </div>
            <p className="shrink-0 font-display text-base font-bold text-navy-900">
              Kz {fmt(Number(product.price))}
            </p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CircleDollarSign className="h-3.5 w-3.5 text-brand-green-dark" aria-hidden="true" />+ Kz{" "}
          {fmt(Number(product.price) * 0.15)} no resgate
        </p>
        {insufficient ? (
          <Link
            to="/perfil/depositar"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-2 text-[11px] font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Depositar
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBuy}
            disabled={disabled}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-green px-3 py-2 text-[11px] font-bold text-navy-900 transition hover:bg-brand-green/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {busy ? "A comprar…" : "Comprar"}
          </button>
        )}
      </div>
    </article>
  );
}

function RedeemCard({
  total,
  reward,
  busy,
  onRedeem,
}: {
  total: number;
  reward: number;
  busy: boolean;
  onRedeem: () => void;
}) {
  return (
    <section className="rounded-3xl bg-[#090b10] p-5 text-white shadow-xl shadow-black/15">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-navy-900">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-sm font-bold">Resgate desbloqueado</p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            As três rodadas terminaram. O valor das compras mais 15% está pronto para voltar ao seu
            saldo.
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-white/50">Valor a resgatar</p>
          <p className="mt-1 font-display text-2xl font-bold">Kz {fmt(total)}</p>
        </div>
        <p className="text-xs font-semibold text-brand-green">+ Kz {fmt(reward)} de lucro</p>
      </div>
      <button
        type="button"
        onClick={onRedeem}
        disabled={busy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 text-sm font-bold text-navy-900 transition hover:bg-brand-green/85 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {busy ? "A resgatar…" : "Resgatar"}
      </button>
    </section>
  );
}

function PurchaseTaskModal({
  product,
  round,
  busy,
  onCancel,
  onConfirm,
}: {
  product: TaskProduct;
  round: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/55 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-task-title"
        className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-green-dark">
              Rodada {round} de 3
            </p>
            <h2 id="purchase-task-title" className="mt-1 font-display text-lg font-bold">
              Confirmar compra
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar confirmação"
            className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex gap-3 rounded-2xl bg-secondary/60 p-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-card text-navy-900">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt=""
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              <Package className="h-7 w-7" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-card-foreground">{product.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{product.description}</p>
            <p className="mt-2 text-sm font-bold text-navy-900">Kz {fmt(Number(product.price))}</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          O valor será bloqueado até completares as três rodadas. Ao terminar, poderás clicar em
          <strong className="text-card-foreground"> Resgatar</strong> para voltar a receber o valor
          com o lucro previsto.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-secondary py-3 text-xs font-semibold text-muted-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green py-3 text-xs font-bold text-navy-900 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {busy ? "A comprar…" : "Comprar rodada"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskHistory({
  tasks,
  products,
}: {
  tasks: ReturnType<typeof useTasks>["orders"];
  products: TaskProduct[];
}) {
  const productNames = new Map(products.map((product) => [product.id, product.name]));

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
        Rodadas deste ciclo
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 px-4 py-3.5 ${
              index > 0 ? "border-t border-border" : ""
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green-dark">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-card-foreground">
                Rodada {task.round_number} · {productNames.get(task.product_id) ?? "Produto"}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                Valor bloqueado até ao resgate
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-sm font-bold text-card-foreground">
                Kz {fmt(Number(task.price))}
              </p>
              <p className="text-[11px] font-semibold text-brand-green-dark">
                + Kz {fmt(Number(task.reward))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyTasks() {
  return (
    <section className="rounded-3xl border border-dashed border-border bg-card px-5 py-10 text-center">
      <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-card-foreground">
        Ainda não há tarefas publicadas
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Quando a plataforma publicar produtos, eles aparecerão nesta área.
      </p>
    </section>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-8 text-center">
      <p className="text-sm font-medium text-destructive">{message}</p>
    </section>
  );
}

function translateTaskError(message: string): string {
  if (message.includes("Saldo insuficiente")) {
    return `${message} Abra Depositar para continuar.`;
  }
  if (message.includes("ciclo atual")) {
    return "Resgate o ciclo atual antes de começar novas tarefas.";
  }
  if (message.includes("três rodadas")) {
    return "Complete as três rodadas antes de resgatar.";
  }
  return message;
}
