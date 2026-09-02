import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/perfil/configuracoes")({
  head: () => ({
    meta: [
      { title: "Group Mobil — Configurações" },
      {
        name: "description",
        content: "Edite o seu nome, utilizador, foto de perfil e senha da conta Group Mobil.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

function formatPhone(phone: string | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("244") ? digits.slice(3) : digits;
  if (local.length !== 9) return `+${digits}`;
  return `+244 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

function ConfiguracoesPage() {
  const navigate = useNavigate();
  const { profile, loading, notAuthenticated, updateProfile, uploadAvatar } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && notAuthenticated) navigate({ to: "/" });
  }, [loading, notAuthenticated, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setUsername(profile.username ?? "");
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    const { error } = await uploadAvatar(file);
    setUploading(false);
    if (error) {
      setUploadError(error);
      return;
    }
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMessage(null);

    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();

    if (!trimmedName) {
      setProfileMessage({ type: "error", text: "O nome não pode ficar vazio." });
      return;
    }
    if (trimmedUsername && !/^[a-zA-Z0-9_.]{3,20}$/.test(trimmedUsername)) {
      setProfileMessage({
        type: "error",
        text: "Utilizador deve ter 3-20 caracteres: letras, números, ponto ou underscore.",
      });
      return;
    }

    setSavingProfile(true);
    const { error } = await updateProfile({ full_name: trimmedName, username: trimmedUsername });
    setSavingProfile(false);

    setProfileMessage(
      error
        ? { type: "error", text: error }
        : { type: "ok", text: "Perfil atualizado com sucesso." },
    );
  }

  async function handleSavePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMessage(null);

    if (!/^[A-Za-z0-9]+$/.test(newPassword) || newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "A senha deve ter pelo menos 6 caracteres, apenas letras e números.",
      });
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordMessage({ type: "error", text: "A senha deve conter letras e números." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "As senhas não coincidem." });
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordMessage({
        type: "error",
        text: "Não foi possível alterar a senha. Tente novamente.",
      });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage({ type: "ok", text: "Senha alterada com sucesso." });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
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

  const initials = (fullName.trim().charAt(0) || "?").toUpperCase();

  return (
    <div className="min-h-screen bg-secondary/40 pb-16">
      <div className="mx-auto max-w-md">
        <header
          className="px-5 pb-6 pt-6"
          style={{
            background:
              "radial-gradient(120% 140% at 82% 0%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 60%)",
          }}
        >
          <div className="flex items-center gap-3">
            <Link
              to="/perfil"
              aria-label="Voltar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4.5 w-4.5" strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-display text-base font-semibold text-white">Configurações</h1>
              <p className="text-xs text-white/55">Dados pessoais e segurança</p>
            </div>
          </div>
        </header>

        <main className="space-y-5 px-5 pt-6">
          {/* Foto de perfil */}
          <section className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
            <div className="relative h-16 w-16 shrink-0">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-brand-green">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-primary-foreground">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Alterar foto de perfil"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-white shadow-md ring-2 ring-card transition hover:bg-navy-800 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
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
            <div className="flex-1">
              <p className="text-sm font-semibold text-card-foreground">Foto de perfil</p>
              <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP. Máximo 5MB.</p>
              {uploadError && (
                <p className="mt-1 text-xs font-medium text-destructive">{uploadError}</p>
              )}
            </div>
          </section>

          {/* Dados pessoais */}
          <section className="rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
            <h2 className="font-display text-sm font-semibold text-card-foreground">
              Dados pessoais
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleSaveProfile}>
              <Field label="Nome completo" htmlFor="fullName">
                <input
                  id="fullName"
                  name="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={80}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </Field>

              <Field label="Nome de utilizador" htmlFor="username">
                <div className="flex items-center rounded-xl border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                  <span className="pl-4 text-sm text-muted-foreground">@</span>
                  <input
                    id="username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={20}
                    className="w-full bg-transparent px-2 py-2.5 text-sm text-foreground outline-none"
                  />
                </div>
              </Field>

              <Field label="Telefone (identificador de acesso)" htmlFor="phone">
                <input
                  id="phone"
                  value={formatPhone(profile?.phone)}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-input bg-secondary/60 px-4 py-2.5 text-sm text-muted-foreground outline-none"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  O telefone é usado para entrar na conta e não pode ser alterado aqui.
                </p>
              </Field>

              {profileMessage && (
                <p
                  className={`text-xs font-medium ${
                    profileMessage.type === "ok" ? "text-brand-green-dark" : "text-destructive"
                  }`}
                >
                  {profileMessage.text}
                </p>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-semibold text-primary-foreground transition hover:bg-brand-green-dark disabled:opacity-60"
              >
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                Guardar alterações
              </button>
            </form>
          </section>

          {/* Segurança */}
          <section className="rounded-3xl bg-card p-5 shadow-xl shadow-navy-900/10">
            <h2 className="font-display text-sm font-semibold text-card-foreground">
              Alterar senha
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleSavePassword}>
              <Field label="Nova senha" htmlFor="newPassword">
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </Field>

              <Field label="Confirmar nova senha" htmlFor="confirmPassword">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </Field>

              {passwordMessage && (
                <p
                  className={`text-xs font-medium ${
                    passwordMessage.type === "ok" ? "text-brand-green-dark" : "text-destructive"
                  }`}
                >
                  {passwordMessage.text}
                </p>
              )}

              <button
                type="submit"
                disabled={savingPassword}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy-900 py-3 text-sm font-semibold text-navy-900 transition hover:bg-navy-900 hover:text-white disabled:opacity-60"
              >
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Alterar senha
              </button>
            </form>
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
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
