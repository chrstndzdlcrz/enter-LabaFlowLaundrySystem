import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getMyConversation } from "@/lib/api/chat";
import { fetchShopSettings } from "@/lib/api/settings";

export default function CustomerChat() {
  const conversationQuery = useQuery({
    queryKey: ["my-conversation"],
    queryFn: getMyConversation,
  });
  const { data: settings } = useQuery({ queryKey: ["shop-settings"], queryFn: fetchShopSettings });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chat with the shop"
        description="Ask about an order, a stain, or your pick-up schedule. Only you and authorized shop staff can read this thread."
      />

      <QueryState
        isLoading={conversationQuery.isLoading}
        error={conversationQuery.error}
        emptyIcon={MessageSquare}
        emptyTitle="Your conversation could not be opened"
      >
        <ChatPanel
          conversationId={conversationQuery.data?.id}
          counterpartName={settings?.shop_name ?? "Lab-a-Day Laundry Shop"}
        />
      </QueryState>
    </div>
  );
}
