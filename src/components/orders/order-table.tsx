import { Link } from "react-router-dom";
import { Receipt, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { PaymentDialog } from "./payment-dialog";
import { StatusUpdateDialog } from "./status-update-dialog";
import type { OrderListItem } from "@/lib/api/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/constants";

/** Counter queue table used by staff and admins. */
export function OrderTable({ orders, detailBase = "/manage/orders" }: { orders: OrderListItem[]; detailBase?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/60">
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden lg:table-cell">Services</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Payment</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const total = Number(order.total_amount);
            const paid = Number(order.amount_paid);
            return (
              <TableRow key={order.id}>
                <TableCell>
                  <Link to={`${detailBase}/${order.id}`} className="font-medium text-primary hover:underline">
                    {order.order_code}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{formatDateTime(order.created_at)}</span>
                </TableCell>
                <TableCell>
                  <span className="block font-medium text-foreground">{order.customer_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {order.customer_phone ?? "No number"}
                    {order.is_walk_in ? " · walk-in" : ""}
                  </span>
                </TableCell>
                <TableCell className="hidden max-w-[280px] lg:table-cell">
                  <span className="block truncate text-sm text-muted-foreground">
                    {order.order_items
                      .map((item) => `${item.service_name} (${item.quantity} ${item.unit})`)
                      .join(" · ") || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="block font-semibold text-foreground">{formatCurrency(total)}</span>
                  {paid > 0 ? (
                    <span className="block text-xs text-muted-foreground">{formatCurrency(paid)} paid</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status as OrderStatus} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    variant="outline"
                    className={
                      order.payment_status === "paid"
                        ? "rounded-full border-success/30 bg-success/10 text-success"
                        : order.payment_status === "partial"
                          ? "rounded-full border-warning/35 bg-warning/10 text-warning"
                          : "rounded-full border-border text-muted-foreground"
                    }
                  >
                    {order.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusUpdateDialog
                      orderId={order.id}
                      orderCode={order.order_code ?? "Order"}
                      status={order.status as OrderStatus}
                      trigger={
                        <Button size="sm" variant="outline">
                          Status
                        </Button>
                      }
                    />
                    {order.status !== "cancelled" && order.payment_status !== "paid" ? (
                      <PaymentDialog
                        orderId={order.id}
                        orderCode={order.order_code ?? "Order"}
                        total={total}
                        amountPaid={paid}
                        trigger={
                          <Button size="sm">
                            <Receipt className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Payment
                          </Button>
                        }
                      />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {orders.length === 0 ? (
        <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
          <Store className="h-4 w-4" aria-hidden="true" />
          No orders match this filter.
        </p>
      ) : null}
    </div>
  );
}
