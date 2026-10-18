import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem, Payment } from "./types";

export type ReportGranularity = "day" | "week" | "month";

export type SalesRow = {
  bucket: string;
  channel: string;
  total: number;
  payment_count: number;
};

export async function salesSummary(from: Date, to: Date, granularity: ReportGranularity): Promise<SalesRow[]> {
  const { data, error } = await supabase.rpc("sales_summary", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_granularity: granularity,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalesRow[];
}

export async function paymentsInRange(from: Date, to: Date): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .gte("paid_at", from.toISOString())
    .lt("paid_at", to.toISOString())
    .order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function ordersInRange(
  from: Date,
  to: Date,
): Promise<(Pick<Order, "id" | "order_code" | "status" | "total_amount" | "amount_paid" | "created_at"> & { order_items: OrderItem[] })[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_code, status, total_amount, amount_paid, created_at, order_items(*)")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7; // week starts on Monday
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export function startOfMonth(date: Date) {
  const copy = startOfDay(date);
  copy.setDate(1);
  return copy;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function rangeFor(preset: "today" | "week" | "month" | "last30") {
  const now = new Date();
  const to = addDays(startOfDay(now), 1);
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to, granularity: "day" as ReportGranularity, label: "Today" };
    case "week":
      return { from: startOfWeek(now), to, granularity: "day" as ReportGranularity, label: "This week" };
    case "month":
      return { from: startOfMonth(now), to, granularity: "day" as ReportGranularity, label: "This month" };
    case "last30":
      return { from: addDays(startOfDay(now), -29), to, granularity: "day" as ReportGranularity, label: "Last 30 days" };
  }
}
