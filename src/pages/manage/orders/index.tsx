import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { OrderTable } from "@/components/orders/order-table";
import { WalkInOrderDialog } from "@/components/orders/walk-in-order-dialog";
import { listOrders } from "@/lib/api/orders";
import { ORDER_STATUS_META, ORDER_FLOW, type OrderStatus } from "@/lib/constants";

const STATUS_OPTIONS: { value: OrderStatus | "active" | "all"; label: string }[] = [
  { value: "active", label: "All active orders" },
  { value: "all", label: "Every order (including finished)" },
  ...ORDER_FLOW.map((status) => ({ value: status, label: ORDER_STATUS_META[status].label })),
  { value: "cancelled" as OrderStatus, label: ORDER_STATUS_META.cancelled.label },
];

export default function ManageOrders() {
  const [status, setStatus] = useState<OrderStatus | "active" | "all">("active");
  const [search, setSearch] = useState("");
  const [walkInOnly, setWalkInOnly] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["orders", "manage", status, search, walkInOnly],
    queryFn: () =>
      listOrders({
        status,
        search,
        isWalkIn: walkInOnly ? true : undefined,
        limit: 300,
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order queue"
        description="Every order in the shop. Update statuses and record payments straight from here."
        actions={<WalkInOrderDialog />}
      />

      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="order-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="order-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order code, customer name or number"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="order-status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger id="order-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 self-end rounded-xl border border-border px-4 py-3">
          <Label htmlFor="walkin-only" className="text-sm font-medium">
            Walk-in drop-offs only
          </Label>
          <Switch id="walkin-only" checked={walkInOnly} onCheckedChange={setWalkInOnly} />
        </div>
      </div>

      <QueryState isLoading={ordersQuery.isLoading} error={ordersQuery.error}>
        <OrderTable orders={ordersQuery.data ?? []} />
      </QueryState>
    </div>
  );
}
