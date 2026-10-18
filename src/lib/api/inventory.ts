import { supabase } from "@/integrations/supabase/client";
import type { InventoryItem, InventoryItemWithRecipes, InventoryMovement } from "./types";

export async function listInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listInventoryWithRecipes(): Promise<InventoryItemWithRecipes[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*, service_consumables(*, services(id, name))")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export async function listMovements(options?: { itemId?: string; limit?: number }): Promise<(InventoryMovement & { inventory_items: Pick<InventoryItem, "name" | "unit"> | null })[]> {
  let query = supabase
    .from("inventory_movements")
    .select("*, inventory_items(name, unit)")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);
  if (options?.itemId) query = query.eq("item_id", options.itemId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export async function createInventoryItem(input: {
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  cost_per_unit: number | null;
  pack_size: number | null;
  pack_label: string | null;
  full_stock_level: number | null;
}): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({ ...input, is_placeholder: false })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The supply item could not be saved.");
  return data;
}

export async function updateInventoryItem(
  id: string,
  input: Partial<
    Pick<
      InventoryItem,
      | "name"
      | "unit"
      | "low_stock_threshold"
      | "cost_per_unit"
      | "is_active"
      | "pack_size"
      | "pack_label"
      | "full_stock_level"
    >
  >,
): Promise<void> {
  const { error } = await supabase.from("inventory_items").update({ ...input, is_placeholder: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Records a stock movement. The database applies the delta, so the resulting
 * quantity shown afterwards is the real one, and a shortage below zero is
 * reported instead of silently producing a negative count.
 */
export async function recordMovement(input: {
  itemId: string;
  delta: number;
  reason: "consumption" | "purchase" | "adjustment" | "waste" | "return";
  note: string | null;
  orderId?: string | null;
}): Promise<InventoryMovement> {
  const { data, error } = await supabase
    .from("inventory_movements")
    .insert({
      item_id: input.itemId,
      delta: input.delta,
      reason: input.reason,
      note: input.note,
      order_id: input.orderId ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The stock movement could not be recorded.");
  return data;
}
