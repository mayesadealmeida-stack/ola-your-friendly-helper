import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type AdminPost = Tables<"posts">;

export type NewAdminPost = Pick<TablesInsert<"posts">, "title" | "body" | "category"> & {
  image?: File | null;
};

export const ADMIN_POSTS_QUERY_KEY = ["admin-posts"] as const;

const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;

async function uploadPostImage(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha uma imagem válida.");
  }
  if (file.size > MAX_POST_IMAGE_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("posts").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
  return supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
}

export function useAdminPosts(enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ADMIN_POSTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled,
    staleTime: 15_000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ADMIN_POSTS_QUERY_KEY }),
    [queryClient],
  );

  const createPost = useCallback(
    async (values: NewAdminPost): Promise<{ error: string | null }> => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return { error: "A sessão de administrador expirou." };

        const imageUrl = values.image ? await uploadPostImage(values.image, userId) : null;
        const payload: TablesInsert<"posts"> = {
          author_name: "Group Mobil",
          author_avatar_url: "/logo-group-mobil-mark.webp",
          title: values.title.trim(),
          body: values.body?.trim() || "",
          category: values.category,
          image_url: imageUrl,
        };

        const { error } = await supabase.from("posts").insert(payload);
        if (error) return { error: error.message };

        await refresh();
        return { error: null };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Não foi possível publicar a notícia.",
        };
      }
    },
    [refresh],
  );

  return {
    posts: query.data ?? [],
    loading: query.isPending,
    error: query.error?.message ?? null,
    createPost,
    refresh,
  };
}
