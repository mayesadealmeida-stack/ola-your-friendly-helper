import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  HelpCircle,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useKyc, kycStatusLabel } from "@/hooks/use-kyc";
import { useCompliance } from "@/hooks/use-compliance";
import { ComplianceCard } from "@/components/compliance-card";
import { BottomNav } from "@/components/bottom-nav";

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

function PerfilPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, loading, notAuthenticated, uploadAvatar } = useProfile();
  const { kyc } = useKyc();
  const { stats: complianceStats } = useCompliance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="mx-auto max-w-md">
        <header
          className="px-5 pb-20 pt-8"
          style={{
            background:
              "radial-gradient(120% 140% at 82% 0%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 60%)",
          }}
        >
          <p className="font-display text-xl font-semibold text-white">Perfil</p>
          <p className="mt-1 text-sm text-white/55">Os seus dados e preferências.</p>
        </header>

        <main className="-mt-14 space-y-5 px-5">
          <section className="rounded-3xl bg-card p-6 text-center shadow-xl shadow-navy-900/10">
            <div className="relative mx-auto -mt-16 h-24 w-24">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-card bg-brand-green shadow-lg">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-primary-foreground">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Alterar foto de perfil"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-white shadow-md ring-2 ring-card transition hover:bg-navy-800 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden="true" />
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

            <h1 className="mt-4 font-display text-lg font-semibold text-card-foreground">
              {displayName}
            </h1>
            {username && <p className="text-sm text-muted-foreground">@{username}</p>}
            <p className="mt-1 text-sm text-muted-foreground">{formatPhone(profile?.phone)}</p>

            {uploadError && (
              <p className="mt-3 text-xs font-medium text-destructive">{uploadError}</p>
            )}
          </section>

          <ComplianceCard stats={complianceStats} />

          <section className="overflow-hidden rounded-3xl bg-card shadow-xl shadow-navy-900/10">
            <MenuLink
              to="/perfil/kyc"
              icon={BadgeCheck}
              label="KYC Basic"
              badge={kycBadge(kyc?.status)}
            />
            <MenuLink
              to="/perfil/configuracoes"
              icon={Settings}
              label="Editar perfil e configurações"
            />
            <MenuLink to="/assistente" icon={HelpCircle} label="Ajuda e suporte" />
            <MenuRow icon={ShieldCheck} label="Segurança da conta" />
          </section>

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

function MenuLink({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: MenuBadge;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-b border-border px-5 py-4 text-sm font-medium text-card-foreground transition last:border-b-0 hover:bg-secondary/60"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-navy-900">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_TONE_CLASSES[badge.tone]}`}
        >
          {badge.text}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function MenuRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-4 text-sm font-medium text-card-foreground last:border-b-0">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-navy-900">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <span className="flex-1">{label}</span>
      <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold text-brand-green-dark">
        Ativa
      </span>
    </div>
  );
}
