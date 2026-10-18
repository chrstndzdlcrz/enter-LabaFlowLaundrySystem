import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, CalendarCheck, ClipboardList, PackageCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { StatCard } from "@/components/common/stat-card";
import { OrderTable } from "@/components/orders/order-table";
import { WalkInOrderDialog } from "@/components/orders/walk-in-order-dialog";
import { listInventory } from "@/lib/api/inventory";
import { listOrders } from "@/lib/api/orders";
import { paymentsInRange, startOfDay, addDays } from "@/lib/api/reports";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";

export default function ManageDashboard() {
  const { profile, isAdmin } = useAuth();
  const ordersQuery = useQuery({ queryKey: ["orders", "manage"], queryFn: () => listOrders({ limit: 100 }) });
  const inventoryQuery = useQuery({ queryKey: ["inventory"], queryFn: listInventory, enabled: true });
  const todayPaymentsQuery = useQuery({
    queryKey: ["payments", "today"],
    queryFn: () => paymentsInRange(startOfDay(new Date()), addDays(startOfDay(new Date()), 1)),
  });

  const orders = ordersQuery.data ?? [];
  const active = orders.filter(
    (order) => !["completed", "cancelled"].includes(order.status),
  );
  const ready = orders.filter((order) => order.status === "ready_for_pickup");
  const pendingBookings = orders.filter((order) => order.status === "pending");

  const inventory = inventoryQuery.data ?? [];
  const lowStock = inventory.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold));

  const collections = (todayPaymentsQuery.data ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Counter dashboard${profile?.full_name ? ` — ${profile.full_name}` : ""}`}
        description="Everything waiting on the counter right now, plus what needs restocking."
        actions={<WalkInOrderDialog />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders in the shop" value={active.length} icon={ClipboardList} hint="Not yet released" />
        <StatCard label="Ready for pick-up" value={ready.length} icon={PackageCheck} tone="success" hint="Waiting for the customer" />
        <StatCard label="Bookings to confirm" value={pendingBookings.length} icon={CalendarCheck} tone="warning" hint="Online bookings" />
        <StatCard label="Collected today" value={formatCurrency(collections)} icon={Wallet} tone="info" hint="All payment channels" />
      </div>

      {lowStock.length > 0 ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 font-display text-base text-warning">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {lowStock.length} supply item{lowStock.length === 1 ? "" : "s"} at or below the reorder level
            </CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link to="/manage/inventory">Open inventory</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {lowStock.map((item) => (
              <span key={item.id} className="rounded-full border border-warning/40 bg-card px-3 py-1 text-xs text-foreground">
                {item.name}: {Number(item.quantity)} {item.unit} left (reorder at {Number(item.low_stock_threshold)})
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="font-display text-lg">Orders in the shop</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/manage/orders">Open the full queue</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={ordersQuery.isLoading}
            error={ordersQuery.error}
            isEmpty={active.length === 0}
            emptyIcon={Boxes}
            emptyTitle="The queue is clear"
            emptyDescription="Log a walk-in drop-off, or wait for the next online booking."
            emptyAction={<WalkInOrderDialog />}
          >
            <OrderTable orders={active.slice(0, 8)} />
          </QueryState>
        </CardContent>
      </Card>

      {!isAdmin ? (
        <p className="text-xs text-muted-foreground">
          Sales reports, services, staff management and shop settings are available to the shop owner.
        </p>
      ) : null}
    </div>
  );
}
