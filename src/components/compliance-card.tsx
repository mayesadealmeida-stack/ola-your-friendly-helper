import { Link } from "@tanstack/react-router";
import { ChevronRight, Info } from "lucide-react";
import {
  LEVEL_META,
  formatRate,
  nextLevelRequirements,
  type ComplianceStats,
} from "@/lib/compliance";

export function ComplianceGauge({
  rate,
  color,
  size = 92,
}: {
  rate: number;
  color: string;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, rate));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-secondary"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        stroke={color}
        strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-card-foreground font-display text-[15px] font-bold"
      >
        {formatRate(pct)}
      </text>
    </svg>
  );
}

export function ComplianceCard({ stats }: { stats: ComplianceStats | null }) {
  if (!stats) return null;

  const meta = LEVEL_META[stats.level];
  const rate = Number(stats.compliance_rate);
  const { next, progress } = nextLevelRequirements(stats);

  return (
    <section className="rounded-3xl bg-card p-5 shadow-lg shadow-navy-900/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Seu nível
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-card-foreground">
            {meta.emoji} {meta.label.toUpperCase()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Taxa de Cumprimento</p>
        </div>
        <ComplianceGauge rate={rate} color={meta.ring} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric label="Histórico" value={`${stats.history_days} d`} />
        <Metric label="Ciclos" value={String(stats.cycles_completed)} />
        <Metric label="Pendentes" value={String(stats.pending_obligations)} />
      </dl>

      {next && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Progresso para {LEVEL_META[next].emoji} {LEVEL_META[next].label}
            </span>
            <span className="font-semibold text-card-foreground">{progress}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: LEVEL_META[next].ring }}
            />
          </div>
        </div>
      )}

      <Link
        to="/nivel"
        className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary/70 px-4 py-3 text-sm font-medium text-card-foreground transition hover:bg-secondary"
      >
        <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 text-left">Como a minha taxa foi calculada?</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </Link>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        O nível é um indicador do histórico de cumprimento. Não é garantia de que alguém
        irá pagar nem de que receberá algum valor.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-2 py-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-display text-sm font-semibold text-card-foreground">{value}</dd>
    </div>
  );
}
