import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, ClipboardList, PackageCheck, PlusCircle, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { InstallAppHint } from "@/components/common/install-app-hint";
import { QueryState } from "@/components/common/query-state";
import { StatCard } from "@/components/common/stat-card";
import { OrderCard } from "@/components/orders/order-card";
import { NotificationPermissionCard } from "@/components/notifications/notification-permission-card";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { listOrders } from "@/lib/api/orders";
import { formatCurrency } from "@/lib/format";

const ACTIVE_STATUSES = ["pending", "confirmed", "received", "in_progress", "ready_for_pickup"];

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();

  const ordersQuery = useQuery({
    queryKey: ["orders", "customer-all"],
    queryFn: () => listOrders(),
  });

  const orders = ordersQuery.data ?? [];
  const active = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const ready = orders.filter((order) => order.status === "ready_for_pickup");
  const lifetime = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total_amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Kumusta, ${profile?.full_name?.split(" ")[0] ?? "there"}!`}
        description="Your laundry at a glance — book a service, follow your orders and keep every receipt."
        actions={
          <>
            <Button asChild>
              <Link to="/app/book">
                <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                Book a service
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/chat">Message the shop</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active orders" value={active.length} icon={ClipboardList} hint="Being processed or waiting" />
        <StatCard
          label="Ready for pick-up"
          value={ready.length}
          icon={PackageCheck}
          tone="success"
          hint={ready.length > 0 ? "Collect at the counter" : "Nothing waiting"}
        />
        <StatCard
          label="Lifetime billed"
          value={formatCurrency(lifetime)}
          icon={Wallet}
          tone="info"
          hint="Across all your orders"
        />
        <StatCard label="Unread updates" value={unreadCount} icon={Bell} tone="warning" hint="Notifications" />
      </div>

      <NotificationPermissionCard />
      <InstallAppHint />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="font-display text-lg">Orders in progress</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <QueryState
              isLoading={ordersQuery.isLoading}
              error={ordersQuery.error}
              isEmpty={active.length === 0}
              emptyIcon={Sparkles}
              emptyTitle="No laundry in progress"
              emptyDescription="When you book a service, its progress shows up here — from received all the way to pick-up."
              emptyAction={
                <Button asChild>
                  <Link to="/app/book">Book my first service</Link>
                </Button>
              }
            >
              {active.map((order) => (
                <OrderCard key={order.id} order={order} to={`/app/orders/${order.id}`} />
              ))}
            </QueryState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QueryState
              isLoading={ordersQuery.isLoading}
              error={ordersQuery.error}
              isEmpty={orders.length === 0}
              emptyTitle="Nothing here yet"
              emptyDescription="Your finished and cancelled orders will be listed here."
            >
              {orders.slice(0, 4).map((order) => (
                <OrderCard key={order.id} order={order} to={`/app/orders/${order.id}`} />
              ))}
            </QueryState>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
