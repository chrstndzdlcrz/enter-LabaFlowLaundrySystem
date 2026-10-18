import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderItem } from "@/lib/api/types";
import { UNIT_SUFFIX } from "@/lib/constants";
import { formatCurrency, formatQuantity } from "@/lib/format";

/** Read-only breakdown of what was ordered. Shared by detail views and receipts. */
export function OrderItemsTable({
  items,
  subtotal,
  discount,
  total,
  amountPaid,
  paymentStatus,
  compact = false,
}: {
  items: Pick<
    OrderItem,
    "id" | "service_name" | "unit" | "quantity" | "unit_price" | "line_total" | "pricing_note"
  >[];
  subtotal?: number;
  discount?: number;
  total?: number;
  amountPaid?: number;
  paymentStatus?: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60">
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-foreground">
                  {item.service_name}
                  {/* Tiered lines explain themselves; a flat per-unit rate stays as the rate. */}
                  {item.pricing_note ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {item.pricing_note}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.pricing_note ? (
                    <span className="text-xs">Tiered</span>
                  ) : (
                    <>
                      {formatCurrency(item.unit_price)}
                      <span className="ml-1 text-xs">{UNIT_SUFFIX[item.unit] ?? ""}</span>
                    </>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatQuantity(item.quantity, item.unit)}
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">
                  {formatCurrency(item.line_total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!compact && subtotal !== undefined ? (
        <Card className="border-border/80">
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discount !== undefined && Number(discount) > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-success">-{formatCurrency(discount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-display font-semibold text-foreground">Total</span>
              <span className="font-display text-lg font-bold text-primary">{formatCurrency(total ?? 0)}</span>
            </div>
            {amountPaid !== undefined ? (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Paid so far</span>
                <span>{formatCurrency(amountPaid)}</span>
              </div>
            ) : null}
            {paymentStatus ? (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Payment status</span>
                <span className="capitalize">{paymentStatus}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function OrderStatusInline({ status }: { status: Parameters<typeof StatusBadge>[0]["status"] }) {
  return <StatusBadge status={status} />;
}
