import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ConversationList } from "@/components/chat/conversation-list";
import { listMessages, listParticipants, listStaffConversations } from "@/lib/api/chat";
import type { ConversationWithCustomer } from "@/lib/api/types";
import { useAuth } from "@/hooks/use-auth";

export default function ManageChat() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { user } = useAuth();

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: listStaffConversations,
  });

  const conversations = conversationsQuery.data ?? [];
  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  // Conversations with activity newer than the staff member's last read are flagged.
  const unreadQuery = useQuery({
    queryKey: ["conversation-activity"],
    queryFn: async () => {
      const lists = await Promise.all(
        conversations.map(async (conversation) => {
          const [participants, messages] = await Promise.all([
            listParticipants(conversation.id),
            listMessages(conversation.id),
          ]);
          const mine = participants.find((participant) => participant.user_id === user?.id);
          const lastRead = mine?.last_read_at ? new Date(mine.last_read_at).getTime() : 0;
          const newer = messages.filter(
            (message) => new Date(message.created_at).getTime() > lastRead && message.sender_role === "customer",
          ).length;
          return [conversation.id, newer] as const;
        }),
      );
      return Object.fromEntries(lists) as Record<string, number>;
    },
    enabled: conversations.length > 0 && Boolean(user?.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer chat"
        description="Answer customer questions about their orders. Conversations are private to the customer and shop staff."
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-3">
            <ConversationList
              conversations={conversations}
              isLoading={conversationsQuery.isLoading}
              selectedId={selectedId}
              onSelect={(conversation: ConversationWithCustomer) => setSelectedId(conversation.id)}
              unreadByConversation={unreadQuery.data ?? {}}
            />
          </CardContent>
        </Card>

        {selected ? (
          <ChatPanel
            key={selected.id}
            conversationId={selected.id}
            counterpartName={selected.profiles?.full_name ?? selected.profiles?.email ?? "Customer"}
          />
        ) : (
          <Card className="flex h-[70vh] items-center justify-center border-dashed">
            <CardContent className="space-y-2 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
              <p className="font-display font-semibold text-foreground">Pick a conversation</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Choose a customer on the left to read their messages and reply. New replies appear live.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
