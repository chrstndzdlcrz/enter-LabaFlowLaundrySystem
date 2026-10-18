import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { NotificationPermissionCard } from "@/components/notifications/notification-permission-card";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listOrders } from "@/lib/api/orders";

export default function CustomerNotifications() {
  const { notifications, isLoading, error, unreadCount, markRead, markAllRead, isMarkingAll, permission } =
    useNotifications();
  const ordersQuery = useQuery({ queryKey: ["orders", "customer-all"], queryFn: () => listOrders() });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Ready-for-pick-up alerts and order updates for your own laundry."
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={() => void markAllRead()} disabled={isMarkingAll}>
              <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              {isMarkingAll ? "Marking…" : "Mark all as read"}
            </Button>
          ) : null
        }
      />

      {permission !== "granted" ? <NotificationPermissionCard /> : null}

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={notifications.length === 0}
        emptyIcon={Bell}
        emptyTitle="No notifications yet"
        emptyDescription="We will tell you here the moment your laundry is ready for pick-up."
      >
        <div className="grid gap-3">
          {notifications.map((item) => {
            const order = (ordersQuery.data ?? []).find((candidate) => candidate.id === item.order_id);
            return (
              <Card
                key={item.id}
                className={cn("transition-shadow hover:shadow-elegant", !item.read_at && "border-primary/40 bg-primary/5")}
              >
                <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 font-display font-semibold text-foreground">
                      {!item.read_at ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      ) : null}
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelative(item.created_at)} · {formatDateTime(item.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order ? (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/app/orders/${order.id}`}>View {order.order_code}</Link>
                      </Button>
                    ) : null}
                    {!item.read_at ? (
                      <Button variant="ghost" size="sm" onClick={() => void markRead(item.id)}>
                        Mark as read
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
}
