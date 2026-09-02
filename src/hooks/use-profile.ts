import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

type ProfileState = {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  notAuthenticated: boolean;
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function useProfile() {
  const [state, setState] = useState<ProfileState>({
    userId: null,
    profile: null,
    loading: true,
    notAuthenticated: false,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setState({ userId: null, profile: null, loading: false, notAuthenticated: true });
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    setState({ userId: user.id, profile: profileData, loading: false, notAuthenticated: false });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateProfile = useCallback(
    async (updates: Partial<Pick<Profile, "full_name" | "username" | "avatar_url">>) => {
      if (!state.userId) return { error: "Sessão expirada. Entre novamente." };

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", state.userId)
        .select()
        .single();

      if (error) return { error: error.message };

      setState((s) => ({ ...s, profile: data }));
      return { error: null };
    },
    [state.userId],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!state.userId) return { error: "Sessão expirada. Entre novamente." };

      if (!file.type.startsWith("image/")) {
        return { error: "Escolha uma imagem (JPG, PNG ou WEBP)." };
      }
      if (file.size > MAX_AVATAR_BYTES) {
        return { error: "A imagem deve ter no máximo 5MB." };
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${state.userId}/avatar.${ext}`;

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
    [state.userId, updateProfile],
  );

  return { ...state, reload: load, updateProfile, uploadAvatar };
}
