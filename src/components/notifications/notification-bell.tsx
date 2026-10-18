import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationBell({ to = "/app/notifications" }: { to?: string }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const queryClient = useQueryClient();

  const markOne = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const recent = notifications.slice(0, 6);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label={`Notifications (${unreadCount} unread)`}>
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm font-semibold">Notifications</p>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No notifications yet. We will tell you the moment your laundry is ready.
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="divide-y divide-border">
              {recent.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!item.read_at) markOne.mutate(item.id);
                    }}
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-secondary",
                      !item.read_at && "bg-primary/5",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      {!item.read_at ? <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" /> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.body}</span>
                    <span className="text-[11px] text-muted-foreground">{formatRelative(item.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to={to}>View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
