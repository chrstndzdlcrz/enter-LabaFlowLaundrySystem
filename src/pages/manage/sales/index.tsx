import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, TrendingUp, Wallet, Receipt as ReceiptIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { SalesChart } from "@/components/sales/sales-chart";
import { ordersInRange, paymentsInRange, rangeFor, salesSummary, type ReportGranularity } from "@/lib/api/reports";
import { formatCurrency, formatQuantity } from "@/lib/format";

export default function ManageReports() {
  const [preset, setPreset] = useState<"today" | "week" | "month" | "last30">("month");
  const [granularity, setGranularity] = useState<ReportGranularity>("day");

  const range = useMemo(() => rangeFor(preset), [preset]);

  const summaryQuery = useQuery({
    queryKey: ["sales-summary", preset, granularity],
    queryFn: () => salesSummary(range.from, range.to, granularity),
  });
  const paymentsQuery = useQuery({
    queryKey: ["payments", "range", preset],
    queryFn: () => paymentsInRange(range.from, range.to),
  });
  const ordersQuery = useQuery({
    queryKey: ["orders", "range", preset],
    queryFn: () => ordersInRange(range.from, range.to),
  });

  const payments = paymentsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  const totalSales = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const byChannel = payments.reduce<Record<string, number>>((acc, payment) => {
    acc[payment.channel] = (acc[payment.channel] ?? 0) + Number(payment.amount);
    return acc;
  }, {});

  const billed = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total_amount), 0);
  const outstanding = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Math.max(Number(order.total_amount) - Number(order.amount_paid), 0), 0);

  const topServices = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; unit: string; amount: number }>();
    for (const order of orders) {
      for (const item of order.order_items) {
        const current = totals.get(item.service_name) ?? {
          name: item.service_name,
          quantity: 0,
          unit: item.unit,
          amount: 0,
        };
        current.quantity += Number(item.quantity);
        current.amount += Number(item.line_total);
        totals.set(item.service_name, current);
      }
    }
    return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales reports"
        description="Daily, weekly and monthly collections, grouped by payment channel."
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="report-preset" className="text-xs">
                Period
              </Label>
              <Select value={preset} onValueChange={(value) => setPreset(value as typeof preset)}>
                <SelectTrigger id="report-preset" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="report-granularity" className="text-xs">
                Grouped by
              </Label>
              <Select value={granularity} onValueChange={(value) => setGranularity(value as ReportGranularity)}>
                <SelectTrigger id="report-granularity" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Collected" value={formatCurrency(totalSales)} icon={Wallet} hint={range.label} />
        <StatCard
          label="Payments recorded"
          value={payments.length}
          icon={ReceiptIcon}
          tone="info"
          hint="Individual transactions"
        />
        <StatCard label="Billed to customers" value={formatCurrency(billed)} icon={TrendingUp} hint="Order totals in period" />
        <StatCard
          label="Still outstanding"
          value={formatCurrency(outstanding)}
          icon={ClipboardList}
          tone={outstanding > 0 ? "warning" : "success"}
          hint="Not yet collected"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Collections by channel</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState isLoading={summaryQuery.isLoading} error={summaryQuery.error}>
            <SalesChart rows={summaryQuery.data ?? []} />
          </QueryState>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Channel totals</CardTitle>
          </CardHeader>
          <CardContent>
            <QueryState
              isLoading={paymentsQuery.isLoading}
              error={paymentsQuery.error}
              isEmpty={payments.length === 0}
              emptyTitle="No payments in this period"
              emptyDescription="Record a payment from an order to see it here."
            >
              <ul className="space-y-3">
                {Object.entries(byChannel)
                  .sort(([, a], [, b]) => b - a)
                  .map(([channel, amount]) => (
                    <li key={channel} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{channel}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {totalSales > 0 ? `${Math.round((amount / totalSales) * 100)}%` : "0%"}
                        </span>
                        <span className="font-display font-bold text-primary">{formatCurrency(amount)}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </QueryState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Most booked services</CardTitle>
          </CardHeader>
          <CardContent>
            <QueryState
              isLoading={ordersQuery.isLoading}
              error={ordersQuery.error}
              isEmpty={topServices.length === 0}
              emptyTitle="No orders in this period"
              emptyDescription="Bookings and counter drop-offs will be summarised here."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topServices.map((service) => (
                    <TableRow key={service.name}>
                      <TableCell className="font-medium text-foreground">{service.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatQuantity(service.quantity, service.unit)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatCurrency(service.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </QueryState>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Figures come from recorded payments and orders only. Nothing here is estimated.
      </p>
    </div>
  );
}
