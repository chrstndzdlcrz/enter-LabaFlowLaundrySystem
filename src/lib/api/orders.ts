import { supabase } from "@/integrations/supabase/client";
import type { OrderStatus } from "@/lib/constants";
import type {
  Order,
  OrderItem,
  OrderListItem,
  OrderStatusHistoryRow,
  OrderWithRelations,
  Payment,
  Receipt,
  ReceiptWithOrder,
} from "./types";

const ORDER_RELATIONS =
  "*, order_items(*), payments(*), receipts(id, receipt_no, is_final, total), customer:profiles!orders_customer_id_fkey(id, full_name, email, phone)";

export type OrderFilters = {
  status?: OrderStatus | "active" | "all";
  search?: string;
  isWalkIn?: boolean;
  customerId?: string;
  limit?: number;
};

const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "received",
  "in_progress",
  "ready_for_pickup",
];

export async function listOrders(filters: OrderFilters = {}): Promise<OrderListItem[]> {
  let query = supabase
    .from("orders")
    .select("*, order_items(id, service_name, quantity, unit)")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status === "active") query = query.in("status", ACTIVE_STATUSES);
  else if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  if (filters.isWalkIn !== undefined) query = query.eq("is_walk_in", filters.isWalkIn);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.search && filters.search.trim() !== "") {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`order_code.ilike.${term},customer_name.ilike.${term},customer_phone.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export async function getOrder(orderId: string): Promise<OrderWithRelations> {
  const { data, error } = await supabase.from("orders").select(ORDER_RELATIONS).eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That order could not be found, or it is not yours.");
  return data as never;
}

export async function getOrderHistory(orderId: string): Promise<OrderStatusHistoryRow[]> {
  const { data, error } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listPayments(orderId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("paid_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listReceipts(options?: { orderId?: string }): Promise<Receipt[]> {
  let query = supabase.from("receipts").select("*").order("issued_at", { ascending: false }).limit(200);
  if (options?.orderId) query = query.eq("order_id", options.orderId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getReceipt(receiptId: string): Promise<ReceiptWithOrder> {
  const { data, error } = await supabase
    .from("receipts")
    .select("*, orders(id, order_code, customer_name, customer_phone, status, is_walk_in)")
    .eq("id", receiptId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That receipt could not be found, or it is not yours.");
  return data as never;
}

export async function getReceiptForOrder(orderId: string): Promise<Receipt | null> {
  const { data, error } = await supabase.from("receipts").select("*").eq("order_id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Staff-only lifecycle update. The database validates the transition. */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
): Promise<Order> {
  const payload: { status: OrderStatus; notes?: string | null } = { status };
  if (note && note.trim() !== "") payload.notes = note.trim();

  const { data, error } = await supabase.from("orders").update(payload).eq("id", orderId).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The status could not be updated.");
  return data;
}

export async function assignOrder(orderId: string, staffId: string | null): Promise<void> {
  const { error } = await supabase.from("orders").update({ assigned_to: staffId }).eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function recordPayment(input: {
  orderId: string;
  amount: number;
  channel: string;
  referenceNo: string | null;
  notes: string | null;
}): Promise<void> {
  const { error } = await supabase.from("payments").insert({
    order_id: input.orderId,
    amount: input.amount,
    channel: input.channel,
    reference_no: input.referenceNo,
    notes: input.notes,
  });
  if (error) throw new Error(error.message);
}

export async function applyDiscount(orderId: string, discount: number): Promise<void> {
  const { error } = await supabase.from("orders").update({ discount }).eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function createBooking(input: {
  items: { service_id: string; quantity: number }[];
  notes?: string | null;
  pickupAt?: string | null;
}): Promise<Order> {
  const { data, error } = await supabase.rpc("create_booking", {
    p_items: input.items as never,
    p_notes: input.notes ?? undefined,
    p_pickup_at: input.pickupAt ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as unknown as Order;
}

export async function createWalkInOrder(input: {
  customerName: string;
  customerPhone: string | null;
  items: { service_id: string; quantity: number }[];
  notes?: string | null;
  linkCustomerId?: string | null;
}): Promise<Order> {
  const { data, error } = await supabase.rpc("create_walk_in_order", {
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone ?? undefined,
    p_items: input.items as never,
    p_notes: input.notes ?? undefined,
    p_link_customer_id: input.linkCustomerId ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as unknown as Order;
}

export async function cancelMyOrder(orderId: string): Promise<Order> {
  const { data, error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
  if (error) throw new Error(error.message);
  return data as unknown as Order;
}
