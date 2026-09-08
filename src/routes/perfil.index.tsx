import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Check,
  Copy,
  Download,
  HelpCircle,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useKyc, kycStatusLabel } from "@/hooks/use-kyc";
import { useCompliance } from "@/hooks/use-compliance";
import { useWallet } from "@/hooks/use-wallet";
import { LEVEL_META } from "@/lib/compliance";
import { BottomNav } from "@/components/bottom-nav";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export const Route = createFileRoute("/perfil/")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Perfil" },
      {
        name: "description",
        content: "Veja e edite os seus dados, foto de perfil e configurações da conta Group Mobil.",
      },
    ],
  }),
  component: PerfilPage,
});

function formatPhone(phone: string | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("244") ? digits.slice(3) : digits;
  if (local.length !== 9) return `+${digits}`;
  return `+244 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

function shortId(userId: string | null): string {
  if (!userId) return "—";
  return userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function PerfilPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId, profile, loading, notAuthenticated, uploadAvatar } = useProfile();
  const { kyc } = useKyc();
  const { stats: complianceStats } = useCompliance();
  const wallet = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && notAuthenticated) {
      navigate({ to: "/" });
    }
  }, [loading, notAuthenticated, navigate]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    const { error } = await uploadAvatar(file);
    setUploading(false);
    if (error) setUploadError(error);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/" });
  }

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(shortId(userId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard indisponível — ignora silenciosamente.
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (notAuthenticated) return null;

  const displayName = profile?.full_name?.trim() || "Sem nome";
  const username = profile?.username?.trim();
  const initials = (profile?.full_name?.trim()?.charAt(0) || "?").toUpperCase();
  const level = complianceStats ? LEVEL_META[complianceStats.level] : null;

  const fmt = (n: number) => new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(n);
  const pendingDepositKz = wallet.transactions
    .filter((t) => t.status === "pendente" && t.type === "deposito")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <header className="bg-navy-900 px-5 pb-6 pt-8 text-white">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/20 bg-brand-green shadow-md">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-xl font-bold text-primary-foreground">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Alterar foto de perfil"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-navy-900 shadow-md ring-2 ring-navy-900 transition hover:bg-brand-green-dark disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-semibold">{displayName}</p>
              {username && <p className="truncate text-sm text-white/55">@{username}</p>}
              <p className="mt-0.5 text-sm text-white/70">{formatPhone(profile?.phone)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            className="mt-3 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/15"
          >
            ID: {shortId(userId)}
            {copied ? (
              <Check className="h-3.5 w-3.5 text-brand-green" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {uploadError && <p className="mt-3 text-xs font-medium text-red-300">{uploadError}</p>}

          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-medium text-white/55">Saldo & Nível</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-base font-bold">
                  {wallet.loading ? "…" : `${fmt(wallet.balance)}`}
                </p>
                <p className="mt-0.5 text-[11px] text-white/55">Disponível (Kz)</p>
              </div>
              <div>
                <p className="font-display text-base font-bold">
                  {wallet.loading ? "…" : `${fmt(pendingDepositKz)}`}
                </p>
                <p className="mt-0.5 text-[11px] text-white/55">Pendente (Kz)</p>
              </div>
              <div>
                <p className="font-display text-base font-bold">
                  {level ? `${level.emoji} ${level.label}` : "—"}
                </p>
                <p className="mt-0.5 text-[11px] text-white/55">Nível</p>
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-6 px-5 pt-6">
          <section className="grid grid-cols-2 gap-3">
            <Link
              to="/perfil/depositar"
              className="rounded-2xl bg-navy-900 py-3.5 text-center font-display text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
            >
              Recarregar
            </Link>
            <Link
              to="/perfil/pagamento"
              className="rounded-2xl border border-border bg-card py-3.5 text-center font-display text-sm font-semibold text-card-foreground shadow-sm transition hover:bg-accent"
            >
              Retirar
            </Link>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold text-foreground">Minha conta</h2>
            <div className="grid grid-cols-3 gap-3">
              <AccountTile
                icon={BadgeCheck}
                label="KYC Basic"
                to="/perfil/kyc"
                badge={kycBadge(kyc?.status)}
              />
              <AccountTile icon={TrendingUp} label="Nível" to="/nivel" />
              <AccountTile icon={Settings} label="Configurações" to="/perfil/configuracoes" />
              <AccountTile icon={HelpCircle} label="Ajuda" to="/assistente" />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-navy-900">
                <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="flex-1 text-sm font-medium text-card-foreground">
                Segurança da conta
              </span>
              <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold text-brand-green-dark">
                Ativa
              </span>
            </div>
          </section>

          <InstallAppCard />

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 py-3.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Terminar sessão
          </button>
        </main>
      </div>

      <BottomNav active="perfil" />
    </div>
  );
}

type MenuBadge = { text: string; tone: "green" | "amber" | "red" | "muted" };

const BADGE_TONE_CLASSES: Record<MenuBadge["tone"], string> = {
  green: "bg-brand-green/15 text-brand-green-dark",
  amber: "bg-amber-500/15 text-amber-600",
  red: "bg-destructive/15 text-destructive",
  muted: "bg-secondary text-muted-foreground",
};

function kycBadge(status: string | undefined): MenuBadge {
  switch (status) {
    case "verified":
      return { text: kycStatusLabel("verified"), tone: "green" };
    case "pending":
      return { text: kycStatusLabel("pending"), tone: "amber" };
    case "rejected":
      return { text: kycStatusLabel("rejected"), tone: "red" };
    default:
      return { text: kycStatusLabel("not_started"), tone: "muted" };
  }
}

function InstallAppCard() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);
  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (installed) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green/15 text-brand-green-dark">
          <Check className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-card-foreground">
          Aplicação já instalada neste dispositivo
        </p>
      </section>
    );
  }

  async function handleClick() {
    if (canInstall) {
      await promptInstall();
      return;
    }
    setShowHelp((v) => !v);
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-navy-900 text-white">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2 px-5 py-4 font-display text-sm font-semibold transition hover:bg-navy-800"
      >
        <Download className="h-4.5 w-4.5" aria-hidden="true" />
        Instalar aplicação
      </button>
      {showHelp && (
        <div className="border-t border-white/10 px-5 py-4 text-xs leading-relaxed text-white/70">
          {isIos ? (
            <>
              No iPhone: toque em <strong className="text-white">Partilhar</strong> na barra do
              Safari e depois em{" "}
              <strong className="text-white">"Adicionar ao ecrã principal"</strong>.
            </>
          ) : (
            <>
              Ainda não foi possível instalar automaticamente. Abra o menu do navegador (⋮) e
              escolha <strong className="text-white">"Instalar aplicativo"</strong> ou{" "}
              <strong className="text-white">"Adicionar ao ecrã principal"</strong>. Se essa opção
              não aparecer, atualize a página e tente de novo.
            </>
          )}
        </div>
      )}
    </section>
  );
}

function AccountTile({
  icon: Icon,
  label,
  to,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  badge?: MenuBadge;
}) {
  return (
    <Link
      to={to}
      className="relative flex flex-col items-center gap-2 rounded-2xl border border-border bg-card py-4 text-center transition hover:bg-accent"
    >
      <Icon className="h-5 w-5 text-navy-900" strokeWidth={1.9} aria-hidden="true" />
      <span className="text-xs font-medium leading-tight text-card-foreground">{label}</span>
      {badge && (
        <span
          className={`absolute -right-1.5 -top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${BADGE_TONE_CLASSES[badge.tone]}`}
        >
          {badge.text}
        </span>
      )}
    </Link>
  );
}
