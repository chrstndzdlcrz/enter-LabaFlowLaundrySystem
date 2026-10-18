import { Link } from "react-router-dom";
import { CalendarClock, ChevronRight, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import type { OrderListItem } from "@/lib/api/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

/** Compact order summary used in customer and staff lists. */
export function OrderCard({ order, to }: { order: OrderListItem; to: string }) {
  const summary = order.order_items
    .map((item) => `${item.service_name} (${item.quantity} ${item.unit})`)
    .join(" · ");

  return (
    <Card className="transition-shadow hover:shadow-elegant">
      <CardContent className="p-4 sm:p-5">
        <Link to={to} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-base font-bold text-foreground">{order.order_code}</span>
              <StatusBadge status={order.status} />
              {order.is_walk_in ? (
                <Badge variant="outline" className="rounded-full border-border text-[11px]">
                  <Store className="mr-1 h-3 w-3" aria-hidden="true" />
                  Walk-in
                </Badge>
              ) : null}
            </span>
            <span className="font-display text-base font-bold text-primary">
              {formatCurrency(order.total_amount)}
            </span>
          </div>

          <p className="truncate text-sm text-muted-foreground">{summary || "No services listed"}</p>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              Placed {formatDateTime(order.created_at)}
            </span>
            <span className="flex items-center gap-1 font-medium text-primary">
              View details
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>

          {order.payment_status !== "unpaid" ? (
            <p className="text-xs text-muted-foreground">
              Payment: <span className="capitalize">{order.payment_status}</span> ·{" "}
              {formatCurrency(order.amount_paid)} received
            </p>
          ) : null}
        </Link>
      </CardContent>
    </Card>
  );
}
