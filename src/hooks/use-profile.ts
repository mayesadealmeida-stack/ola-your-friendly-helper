import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

type ProfileQueryData = { userId: string | null; profile: Profile | null };

export const PROFILE_QUERY_KEY = ["profile"] as const;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

async function fetchProfileData(): Promise<ProfileQueryData> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return { userId: null, profile: null };

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { userId: user.id, profile: data };
}

/**
 * Dados do perfil, partilhados (e em cache) entre todos os ecrãs que os usam —
 * navegar entre páginas já não dispara um novo carregamento sempre que os dados
 * já estão em memória.
 */
export function useProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfileData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const userId = query.data?.userId ?? null;
  const profile = query.data?.profile ?? null;

  const updateProfile = useCallback(
    async (updates: Partial<Pick<Profile, "full_name" | "username" | "avatar_url">>) => {
      if (!userId) return { error: "Sessão expirada. Entre novamente." };

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) return { error: error.message };

      queryClient.setQueryData<ProfileQueryData>(PROFILE_QUERY_KEY, (old) =>
        old ? { ...old, profile: data } : { userId, profile: data },
      );
      return { error: null };
    },
    [userId, queryClient],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!userId) return { error: "Sessão expirada. Entre novamente." };

      if (!file.type.startsWith("image/")) {
        return { error: "Escolha uma imagem (JPG, PNG ou WEBP)." };
      }
      if (file.size > MAX_AVATAR_BYTES) {
        return { error: "A imagem deve ter no máximo 5MB." };
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) {
        return { error: "Falha ao enviar a imagem. Tente novamente." };
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-buster para a imagem atualizar de imediato em todos os ecrãs.
      const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

      return updateProfile({ avatar_url: url });
    },
    [userId, updateProfile],
  );

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
    [queryClient],
  );

  return {
    userId,
    profile,
    loading: query.isPending,
    notAuthenticated: query.isSuccess && !userId,
    reload,
    updateProfile,
    uploadAvatar,
  };
}
