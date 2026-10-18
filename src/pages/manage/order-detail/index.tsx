import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, ReceiptText, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { OrderItemsTable } from "@/components/orders/order-items-table";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { PaymentDialog } from "@/components/orders/payment-dialog";
import { StatusUpdateDialog } from "@/components/orders/status-update-dialog";
import { getOrder, getOrderHistory, getReceiptForOrder } from "@/lib/api/orders";
import { listProfiles } from "@/lib/api/profiles";
import { openConversationForCustomer } from "@/lib/api/chat";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/constants";
import { useMutation } from "@tanstack/react-query";
import { alertError, errorMessageFrom } from "@/lib/alerts";

export default function ManageOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

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
  const staffQuery = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });

  const openChat = useMutation({
    mutationFn: (customerId: string) => openConversationForCustomer(customerId),
    onSuccess: () => navigate("/manage/chat"),
    onError: async (error) => alertError("The chat could not be opened", errorMessageFrom(error)),
  });

  const order = orderQuery.data;
  const total = Number(order?.total_amount ?? 0);
  const paid = Number(order?.amount_paid ?? 0);
  const staff = (staffQuery.data ?? []).find((profile) => profile.id === order?.assigned_to);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/manage/orders")}>
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        Back to the queue
      </Button>

      <QueryState isLoading={orderQuery.isLoading} error={orderQuery.error}>
        {order ? (
          <>
            <PageHeader
              title={order.order_code ?? "Order"}
              description={`${order.customer_name}${order.customer_phone ? ` · ${order.customer_phone}` : ""} · logged ${formatDateTime(order.created_at)}`}
              actions={
                <>
                  {order.status !== "completed" && order.status !== "cancelled" ? (
                    <StatusUpdateDialog
                      orderId={order.id}
                      orderCode={order.order_code ?? "Order"}
                      status={order.status as OrderStatus}
                    />
                  ) : null}
                  {order.status !== "cancelled" && paid < total ? (
                    <PaymentDialog orderId={order.id} orderCode={order.order_code ?? "Order"} total={total} amountPaid={paid} />
                  ) : null}
                  {receiptQuery.data ? (
                    <Button asChild variant="outline">
                      <Link to={`/manage/receipts/${receiptQuery.data.id}`}>
                        <ReceiptText className="mr-2 h-4 w-4" aria-hidden="true" />
                        {receiptQuery.data.receipt_no}
                      </Link>
                    </Button>
                  ) : null}
                  {order.customer_id ? (
                    <Button
                      variant="outline"
                      onClick={() => openChat.mutate(order.customer_id as string)}
                      disabled={openChat.isPending}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                      Chat with customer
                    </Button>
                  ) : null}
                </>
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full">
                Payment: {order.payment_status}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {formatCurrency(paid)} of {formatCurrency(total)} paid
              </Badge>
              {order.is_walk_in ? (
                <Badge variant="outline" className="rounded-full">
                  Walk-in drop-off
                </Badge>
              ) : null}
              <Badge variant="outline" className="rounded-full">
                <UserCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                {staff?.full_name ? `Handled by ${staff.full_name}` : "Unassigned"}
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Processing history</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline status={order.status as OrderStatus} history={historyQuery.data ?? []} />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg">Order lines</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderItemsTable
                    items={order.order_items}
                    subtotal={Number(order.subtotal)}
                    discount={Number(order.discount)}
                    total={total}
                    amountPaid={paid}
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
                    <p className="text-sm text-muted-foreground">Nothing collected yet.</p>
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
                          <span className="font-semibold text-foreground">{formatCurrency(payment.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Balance due</span>
                    <span className="font-display text-base font-bold text-primary">
                      {formatCurrency(Math.max(total - paid, 0))}
                    </span>
                  </div>
                  {order.notes ? (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Order notes
                        </p>
                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                      </div>
                    </>
                  ) : null}
                  {!order.customer_id ? (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground">
                        This walk-in is not linked to a customer account, so no ready-for-pick-up notification
                        will be created for it.
                      </p>
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
