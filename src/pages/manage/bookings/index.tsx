import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { StatusUpdateDialog } from "@/components/orders/status-update-dialog";
import { listOrders } from "@/lib/api/orders";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Link } from "react-router-dom";

export default function ManageBookings() {
  const bookingsQuery = useQuery({
    queryKey: ["orders", "bookings"],
    queryFn: () => listOrders({ status: "pending", limit: 100 }),
  });

  const bookings = bookingsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings to confirm"
        description="Online bookings waiting for the shop. Confirm one when the customer drops off the laundry."
      />

      <QueryState
        isLoading={bookingsQuery.isLoading}
        error={bookingsQuery.error}
        isEmpty={bookings.length === 0}
        emptyIcon={CheckCircle2}
        emptyTitle="No bookings waiting"
        emptyDescription="New online bookings appear here as soon as a customer submits one."
      >
        <div className="grid gap-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/manage/orders/${booking.id}`}
                      className="font-display font-bold text-primary hover:underline"
                    >
                      {booking.order_code}
                    </Link>
                    <Badge variant="outline" className="rounded-full border-warning/35 bg-warning/10 text-warning">
                      Awaiting confirmation
                    </Badge>
                  </p>
                  <p className="text-sm text-foreground">
                    {booking.customer_name}
                    {booking.customer_phone ? ` · ${booking.customer_phone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Booked {formatDateTime(booking.created_at)}
                    {booking.pickup_at ? ` · requested for ${formatDateTime(booking.pickup_at)}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking.order_items
                      .map((item) => `${item.service_name} (${item.quantity} ${item.unit})`)
                      .join(" · ")}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className="font-display text-lg font-bold text-primary">
                    {formatCurrency(booking.total_amount)}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusUpdateDialog
                      orderId={booking.id}
                      orderCode={booking.order_code ?? "Order"}
                      status="pending"
                      trigger={
                        <Button size="sm">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          Review
                        </Button>
                      }
                    />
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/manage/orders/${booking.id}`}>
                        <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Open order
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryState>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Confirming a booking moves it to “Confirmed”. Mark it “Received” once the laundry is at the counter.
      </p>
    </div>
  );
}
