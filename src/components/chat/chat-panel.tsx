import { useEffect, useRef, useState } from "react";
import { AlertCircle, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { errorMessageFrom } from "@/lib/alerts";
import { formatDateTime, formatRelative, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

function MessageBubble({
  body,
  mine,
  senderName,
  createdAt,
}: {
  body: string;
  mine: boolean;
  senderName: string;
  createdAt: string;
}) {
  return (
    <li className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine ? (
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-primary">
          {initialsFrom(senderName, "S")}
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[85%] space-y-1 rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[70%]",
          mine
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-card-foreground",
        )}
      >
        {!mine ? <p className="text-[11px] font-semibold opacity-80">{senderName}</p> : null}
        <p className="whitespace-pre-wrap break-words">{body}</p>
        <p className={cn("text-[10px]", mine ? "text-primary-foreground/75" : "text-muted-foreground")}>
          {formatRelative(createdAt)}
        </p>
      </div>
    </li>
  );
}

/**
 * Real-time conversation between a customer and the shop. Only its participants
 * and authorized staff can read it - enforced by the database, not by this view.
 */
export function ChatPanel({
  conversationId,
  counterpartName,
  className,
}: {
  conversationId: string | null | undefined;
  counterpartName: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { messages, isLoading, error, send, isSending, sendError, markRead } = useChat(conversationId);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (conversationId && messages.length > 0) void markRead();
  }, [conversationId, messages.length, markRead]);

  const handleSend = async () => {
    const body = draft.trim();
    if (body === "" || !conversationId) return;
    try {
      await send(body);
      setDraft("");
    } catch {
      // The error is surfaced below; the draft is kept so nothing is lost.
    }
  };

  return (
    <Card className={cn("flex h-[70vh] flex-col overflow-hidden border-border/80", className)}>
      <CardHeader className="border-b border-border py-4">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          {counterpartName}
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <LoadingState label="Loading your conversation…" />
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title="The conversation could not be loaded"
              description={error instanceof Error ? error.message : "Please try again."}
            />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Say hello, or ask about your order code — the shop staff will reply here."
            />
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  body={message.body}
                  mine={message.sender_id === user?.id}
                  senderName={
                    message.sender_id === user?.id
                      ? "You"
                      : message.profiles?.full_name ??
                        (message.sender_role === "staff" ? "Shop staff" : "Customer")
                  }
                  createdAt={message.created_at}
                />
              ))}
              <li aria-hidden="true">
                <div ref={bottomRef} />
              </li>
            </ul>
          )}
        </div>
      </ScrollArea>

      <div className="space-y-2 border-t border-border p-3">
        {sendError ? (
          <p role="alert" className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {errorMessageFrom(sendError, "Your message could not be sent.")}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
            rows={2}
            className="min-h-[52px] resize-none"
            aria-label="Message"
          />
          <Button onClick={() => void handleSend()} disabled={isSending || draft.trim() === ""}>
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            {isSending ? "Sending…" : "Send"}
          </Button>
        </div>
        {messages.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Last activity {formatDateTime(messages[messages.length - 1].created_at)} · messages are private
            between you and authorized shop staff.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
