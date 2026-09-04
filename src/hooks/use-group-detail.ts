import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GROUPS_QUERY_KEY } from "@/hooks/use-groups";
import type { Group, GroupParticipant, GroupRound, Contribution } from "@/lib/groups";

export function groupDetailQueryKey(groupId: string) {
  return ["group-detail", groupId] as const;
}

type GroupDetailData = {
  userId: string | null;
  group: Group | null;
  participants: GroupParticipant[];
  rounds: GroupRound[];
  myParticipant: GroupParticipant | null;
  myContributions: Contribution[];
};

async function fetchGroupDetail(groupId: string): Promise<GroupDetailData> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const [groupRes, participantsRes, roundsRes] = await Promise.all([
    supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
    supabase
      .from("group_participants")
      .select("*")
      .eq("group_id", groupId)
      .order("position", { ascending: true }),
    supabase
      .from("group_rounds")
      .select("*")
      .eq("group_id", groupId)
      .order("round_number", { ascending: true }),
  ]);

  const participants = participantsRes.data ?? [];
  const myParticipant = userId ? (participants.find((p) => p.user_id === userId) ?? null) : null;

  let myContributions: Contribution[] = [];
  if (myParticipant) {
    const { data } = await supabase
      .from("contributions")
      .select("*")
      .eq("participant_id", myParticipant.id)
      .order("round_number", { ascending: true });
    myContributions = data ?? [];
  }

  return {
    userId,
    group: groupRes.data ?? null,
    participants,
    rounds: roundsRes.data ?? [],
    myParticipant,
    myContributions,
  };
}

/** Detalhe de um grupo: dados, participantes, calendário e a minha participação. */
export function useGroupDetail(groupId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: groupDetailQueryKey(groupId),
    queryFn: () => fetchGroupDetail(groupId),
    staleTime: 30 * 1000,
    enabled: !!groupId,
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: groupDetailQueryKey(groupId) }),
      queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY }),
    ]);
  }, [queryClient, groupId]);

  const joinGroup = useCallback(async (): Promise<{ error: string | null }> => {
    const { error } = await supabase.rpc(
      "join_group" as never,
      {
        p_group_id: groupId,
      } as never,
    );
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  }, [groupId, refresh]);

  const contributeFromWallet = useCallback(
    async (contributionId: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc(
        "contribute_from_wallet" as never,
        {
          p_contribution_id: contributionId,
        } as never,
      );
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  return {
    userId: query.data?.userId ?? null,
    group: query.data?.group ?? null,
    participants: query.data?.participants ?? [],
    rounds: query.data?.rounds ?? [],
    myParticipant: query.data?.myParticipant ?? null,
    myContributions: query.data?.myContributions ?? [],
    loading: query.isPending,
    notFound: !query.isPending && query.data?.group == null,
    joinGroup,
    contributeFromWallet,
  };
}
