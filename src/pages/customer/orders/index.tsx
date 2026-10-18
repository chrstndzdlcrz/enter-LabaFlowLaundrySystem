import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { OrderCard } from "@/components/orders/order-card";
import { listOrders } from "@/lib/api/orders";
import type { OrderStatus } from "@/lib/constants";

const FILTERS: { value: "active" | "completed" | "cancelled" | "all"; label: string }[] = [
  { value: "active", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All orders" },
];

export default function CustomerOrders() {
  const [filter, setFilter] = useState<"active" | "completed" | "cancelled" | "all">("active");

  const ordersQuery = useQuery({ queryKey: ["orders", "customer-all"], queryFn: () => listOrders() });
  const orders = ordersQuery.data ?? [];

  const active: OrderStatus[] = ["pending", "confirmed", "received", "in_progress", "ready_for_pickup"];
  const visible = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "active") return active.includes(order.status);
    return order.status === filter;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My orders"
        description="Every laundry order you have booked with the shop, with its live status."
        actions={
          <Button asChild>
            <Link to="/app/book">
              <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Book a service
            </Link>
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
        <TabsList className="flex-wrap">
          {FILTERS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <QueryState
        isLoading={ordersQuery.isLoading}
        error={ordersQuery.error}
        isEmpty={visible.length === 0}
        emptyIcon={ClipboardList}
        emptyTitle={filter === "active" ? "No laundry in progress" : "Nothing in this list"}
        emptyDescription="Book a service and your order will appear here with live status updates."
        emptyAction={
          <Button asChild>
            <Link to="/app/book">Book a service</Link>
          </Button>
        }
      >
        <div className="grid gap-3">
          {visible.map((order) => (
            <OrderCard key={order.id} order={order} to={`/app/orders/${order.id}`} />
          ))}
        </div>
      </QueryState>
    </div>
  );
}
