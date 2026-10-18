import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listMessages, markConversationRead, sendMessage } from "@/lib/api/chat";
import { realtimeTopic } from "@/lib/realtime";

/** Messages for one conversation, kept live with Realtime. */
export function useChat(conversationId: string | null | undefined) {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMessages(conversationId as string),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(realtimeTopic(`messages-${conversationId}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendMessage(conversationId as string, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await markConversationRead(conversationId);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error) {
      console.error("Lab a Day: could not mark the conversation read", error);
    }
  }, [conversationId, queryClient]);

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    send: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    sendError: sendMutation.error,
    markRead,
  };
}
