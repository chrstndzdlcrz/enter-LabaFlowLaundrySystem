import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryState } from "@/components/common/query-state";
import { getOrder, getReceipt } from "@/lib/api/orders";
import { UNIT_SUFFIX } from "@/lib/constants";
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";

type SnapshotItem = {
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Snapshot = {
  shop?: { name?: string; address?: string; phone?: string; footer?: string };
  order_code?: string;
  customer_name?: string;
  customer_phone?: string | null;
  items?: SnapshotItem[];
};

/**
 * Printable e-receipt. Every figure is read from the order and its recorded
 * payments, so the receipt can never disagree with the ledger.
 */
export function ReceiptDetail({ backTo = "/app/receipts" }: { backTo?: string }) {
  const { receiptId } = useParams<{ receiptId: string }>();

  const receiptQuery = useQuery({
    queryKey: ["receipt", receiptId],
    queryFn: () => getReceipt(receiptId as string),
    enabled: Boolean(receiptId),
  });

  const orderQuery = useQuery({
    queryKey: ["order", receiptQuery.data?.order_id],
    queryFn: () => getOrder(receiptQuery.data!.order_id),
    enabled: Boolean(receiptQuery.data?.order_id),
  });

  const receipt = receiptQuery.data;
  const order = orderQuery.data;
  const snapshot = (receipt?.snapshot ?? {}) as Snapshot;
  const shop = snapshot.shop ?? {};

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={backTo}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to receipts
          </Link>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
          Print or save as PDF
        </Button>
      </div>

      <QueryState isLoading={receiptQuery.isLoading} error={receiptQuery.error}>
        {receipt ? (
          <Card className="mx-auto w-full max-w-2xl border-border/80">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="font-display text-xl font-extrabold text-foreground">
                    {shop.name ?? "Lab-a-Day Laundry Shop"}
                  </h1>
                  {shop.address ? <p className="text-xs text-muted-foreground">{shop.address}</p> : null}
                  {shop.phone ? <p className="text-xs text-muted-foreground">{shop.phone}</p> : null}
                </div>
                <div className="text-right">
                  <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-primary">
                    {receipt.is_final ? "Official receipt" : "Proforma receipt"}
                  </p>
                  <p className="font-mono text-sm text-foreground">{receipt.receipt_no}</p>
                  <p className="text-xs text-muted-foreground">Issued {formatDateTime(receipt.issued_at)}</p>
                  {receipt.channel ? (
                    <Badge variant="outline" className="mt-1 rounded-full text-[11px]">
                      {receipt.channel}
                    </Badge>
                  ) : null}
                </div>
              </header>

              <div className="grid gap-2 rounded-xl bg-secondary/50 p-4 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Customer: </span>
                  <span className="font-medium text-foreground">
                    {order?.customer_name ?? snapshot.customer_name ?? "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Order code: </span>
                  <span className="font-mono font-medium text-foreground">
                    {order?.order_code ?? snapshot.order_code ?? "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Order placed: </span>
                  <span className="font-medium text-foreground">
                    {order?.created_at ? formatDateTime(order.created_at) : "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Payment status: </span>
                  <span className="font-medium capitalize text-foreground">
                    {order?.payment_status ?? (receipt.is_final ? "paid" : "partial")}
                  </span>
                </p>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="pb-2">Service</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(order?.order_items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-border/60">
                      <td className="py-2 font-medium text-foreground">
                        {item.service_name}
                        {item.pricing_note ? (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {item.pricing_note}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {item.pricing_note ? (
                          <span className="text-xs">Tiered</span>
                        ) : (
                          <>
                            {formatCurrency(item.unit_price)}
                            <span className="ml-1 text-xs">{UNIT_SUFFIX[item.unit] ?? ""}</span>
                          </>
                        )}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {formatQuantity(item.quantity, item.unit)}
                      </td>
                      <td className="py-2 text-right font-semibold text-foreground">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                  {!order &&
                    (snapshot.items ?? []).map((item, index) => (
                      <tr key={index} className="border-b border-border/60">
                        <td className="py-2 font-medium text-foreground">{item.name}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatQuantity(item.quantity, item.unit)}
                        </td>
                        <td className="py-2 text-right font-semibold text-foreground">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              <div className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(receipt.subtotal)}</span>
                </div>
                {Number(receipt.discount) > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-success">-{formatCurrency(receipt.discount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-base">
                  <span className="font-display font-semibold text-foreground">Total</span>
                  <span className="font-display font-bold text-primary">{formatCurrency(receipt.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount paid</span>
                  <span className="font-medium">{formatCurrency(receipt.amount_paid)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-medium">
                    {formatCurrency(Math.max(Number(receipt.total) - Number(receipt.amount_paid), 0))}
                  </span>
                </div>
              </div>

              {order && order.payments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Payments recorded
                  </p>
                  <ul className="space-y-1 text-sm">
                    {order.payments.map((payment) => (
                      <li key={payment.id} className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {payment.channel} · {formatDateTime(payment.paid_at)}
                          {payment.reference_no ? ` · ${payment.reference_no}` : ""}
                        </span>
                        <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
                {shop.footer ?? "Thank you for trusting Lab-a-Day Laundry Shop."}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </QueryState>
    </div>
  );
}
