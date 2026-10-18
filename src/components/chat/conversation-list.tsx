import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import type { ConversationWithCustomer } from "@/lib/api/types";
import { formatRelative, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Staff inbox: every customer conversation, newest activity first. */
export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  unreadByConversation = {},
}: {
  conversations: ConversationWithCustomer[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (conversation: ConversationWithCustomer) => void;
  unreadByConversation?: Record<string, number>;
}) {
  if (isLoading) return <LoadingState label="Loading conversations…" />;

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No customer conversations yet"
        description="When a customer sends the shop a message, the thread appears here."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {conversations.map((conversation) => {
        const unread = unreadByConversation[conversation.id] ?? 0;
        const name = conversation.profiles?.full_name ?? conversation.profiles?.email ?? "Customer";
        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                selectedId === conversation.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-card hover:bg-secondary",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
                {initialsFrom(name, "C")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{name}</span>
                  {conversation.profiles?.is_demo ? (
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                      Demo
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {conversation.last_message_at
                    ? `Last message ${formatRelative(conversation.last_message_at)}`
                    : "No messages yet"}
                </span>
              </span>
              {unread > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
                  {unread}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ConversationListShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-border/80">
      <CardContent className="p-3">{children}</CardContent>
    </Card>
  );
}
