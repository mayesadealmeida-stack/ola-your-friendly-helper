import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Post = Tables<"posts">;
export type PostCategory = "novidade" | "evento" | "noticia";

export const POSTS_QUERY_KEY = ["posts"] as const;

async function fetchPosts(): Promise<Post[]> {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

export function usePosts() {
  const query = useQuery({
    queryKey: POSTS_QUERY_KEY,
    queryFn: fetchPosts,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { posts: query.data ?? [], loading: query.isPending };
}

export function relativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d`;
  return date.toLocaleDateString("pt-AO", { day: "2-digit", month: "short" });
}
