import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Notification = Tables<"notifications">;

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

type NotificationsData = {
  userId: string | null;
  notifications: Notification[];
};

async function fetchNotifications(): Promise<NotificationsData> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) return { userId: null, notifications: [] };

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    // Mensagens diretas pertencem ao chat, não ao centro de notificações.
    .neq("kind", "dm")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return { userId, notifications: data ?? [] };
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchNotifications,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const userId = query.data?.userId ?? null;
  const notifications = query.data?.notifications ?? [];
  const unreadCount = notifications.reduce(
    (count, notification) => count + (notification.read_at ? 0 : 1),
    0,
  );

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<{ error: string | null }> => {
      if (!userId) return { error: "Sessão expirada. Entre novamente." };

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) return { error: error.message };

      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      return { error: null };
    },
    [queryClient, userId],
  );

  const markAllAsRead = useCallback(async (): Promise<{ error: string | null }> => {
    if (!userId) return { error: "Sessão expirada. Entre novamente." };
    if (unreadCount === 0) return { error: null };

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) return { error: error.message };

    await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    return { error: null };
  }, [queryClient, unreadCount, userId]);

  return {
    notifications,
    unreadCount,
    loading: query.isPending,
    error: query.error,
    markAsRead,
    markAllAsRead,
  };
}
