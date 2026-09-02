import { Link } from "@tanstack/react-router";
import { useProfile } from "@/hooks/use-profile";

/**
 * Mostra a foto de perfil real do utilizador (ou as iniciais, como fallback)
 * e leva sempre para o ecrã de Perfil, onde a foto pode ser alterada.
 * Usar em qualquer cabeçalho/tela do app para manter o perfil visível em todo o lado.
 */
export function UserAvatarLink({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const { profile } = useProfile();
  const initials = (profile?.full_name?.trim()?.charAt(0) || "?").toUpperCase();

  return (
    <Link
      to="/perfil"
      aria-label="Ir para o perfil"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-green font-display text-sm font-bold text-primary-foreground transition hover:opacity-90 ${className}`}
      style={{ width: size, height: size }}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="Foto de perfil" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </Link>
  );
}
