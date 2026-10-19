import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, ReceiptText, Store, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { OrderItemsTable } from "@/components/orders/order-items-table";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { supabase } from "@/integrations/supabase/client";
import { cancelMyOrder, getOrder, getOrderHistory, getReceiptForOrder } from "@/lib/api/orders";
import { realtimeTopic } from "@/lib/realtime";
import { confirmAction, alertError, alertSuccess, errorMessageFrom } from "@/lib/alerts";
import { LOAD_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function CustomerOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder(orderId as string),
    enabled: Boolean(orderId),
  });

  const historyQuery = useQuery({
    queryKey: ["order-history", orderId],
    queryFn: () => getOrderHistory(orderId as string),
    enabled: Boolean(orderId),
  });

  const receiptQuery = useQuery({
    queryKey: ["receipt-for-order", orderId],
    queryFn: () => getReceiptForOrder(orderId as string),
    enabled: Boolean(orderId),
  });

  // Live status: staff changes appear here without a manual refresh.
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(realtimeTopic(`order-${orderId}`))
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
          void queryClient.invalidateQueries({ queryKey: ["order-history", orderId] });
          void queryClient.invalidateQueries({ queryKey: ["receipt-for-order", orderId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const confirmed = await confirmAction({
        title: "Cancel this order?",
        text: "The shop will see it as cancelled. You cannot undo this from your account — you would need to book again.",
        confirmLabel: "Yes, cancel it",
        danger: true,
      });
      if (!confirmed) return false;
      await cancelMyOrder(orderId as string);
      return true;
    },
    onSuccess: async (done) => {
      if (!done) return;
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      await alertSuccess("Order cancelled", "The shop has been notified.");
    },
    onError: async (error) => {
      await alertError("The order could not be cancelled", errorMessageFrom(error));
    },
  });

  const order = orderQuery.data;
  const cancellable = order?.status === "pending" || order?.status === "confirmed";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/app/orders")}>
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        Back to my orders
      </Button>

      <QueryState isLoading={orderQuery.isLoading} error={orderQuery.error}>
        {order ? (
          <>
            <PageHeader
              title={order.order_code ?? "Order"}
              description={`Placed ${formatDateTime(order.created_at)}${
                order.pickup_at ? ` · requested for ${formatDateTime(order.pickup_at)}` : ""
              }`}
              actions={
                <>
                  {receiptQuery.data ? (
                    <Button asChild variant="outline">
                      <Link to={`/app/receipts/${receiptQuery.data.id}`}>
                        <ReceiptText className="mr-2 h-4 w-4" aria-hidden="true" />
                        {receiptQuery.data.is_final ? "View e-receipt" : "View proforma receipt"}
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link to="/app/chat">
                      <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                      Message the shop
                    </Link>
                  </Button>
                  {cancellable ? (
                    <Button
                      variant="destructive"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                      Cancel order
                    </Button>
                  ) : null}
                </>
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              {order.is_walk_in ? (
                <Badge variant="outline" className="rounded-full">
                  <Store className="mr-1 h-3 w-3" aria-hidden="true" />
                  Walk-in drop-off
                </Badge>
              ) : null}
              <Badge variant="outline" className="rounded-full">
                Payment: {order.payment_status}
              </Badge>
              {order.load_type ? (
                <Badge variant="outline" className="rounded-full">
                  Load: {LOAD_TYPE_LABELS[order.load_type] ?? order.load_type}
                </Badge>
              ) : null}
              <Badge variant="outline" className="rounded-full">
                Paid {formatCurrency(order.amount_paid)} of {formatCurrency(order.total_amount)}
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline status={order.status} history={historyQuery.data ?? []} />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg">What you ordered</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <OrderItemsTable
                    items={order.order_items}
                    subtotal={Number(order.subtotal)}
                    discount={Number(order.discount)}
                    total={Number(order.total_amount)}
                    amountPaid={Number(order.amount_paid)}
                    paymentStatus={order.payment_status}
                  />
                </CardContent>
              </Card>

              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Payments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No payment recorded yet. Pay at the counter when you claim your laundry.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {order.payments.map((payment) => (
                        <li key={payment.id} className="flex items-start justify-between gap-3 text-sm">
                          <span className="space-y-0.5">
                            <span className="block font-medium text-foreground">{payment.channel}</span>
                            <span className="block text-xs text-muted-foreground">
                              {formatDateTime(payment.paid_at)}
                              {payment.reference_no ? ` · ref ${payment.reference_no}` : ""}
                            </span>
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(payment.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Still due</span>
                    <span className="font-display text-base font-bold text-primary">
                      {formatCurrency(Math.max(Number(order.total_amount) - Number(order.amount_paid), 0))}
                    </span>
                  </div>
                  {order.notes ? (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Your instructions
                        </p>
                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </QueryState>
    </div>
  );
}
