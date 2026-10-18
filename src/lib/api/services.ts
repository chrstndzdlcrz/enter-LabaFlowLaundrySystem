import { supabase } from "@/integrations/supabase/client";
import type { InventoryItem, Service, ServiceConsumable } from "./types";

export async function listServices(options?: { includeInactive?: boolean }): Promise<Service[]> {
  let query = supabase.from("services").select("*").order("sort_order", { ascending: true });
  if (!options?.includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createService(input: {
  name: string;
  description: string | null;
  category: string | null;
  unit: Service["unit"];
  price: number;
  estimated_hours: number;
  image_url: string | null;
  sort_order: number;
}): Promise<Service> {
  // Prices entered by the shop replace the placeholder marker.
  const { data, error } = await supabase
    .from("services")
    .insert({ ...input, is_placeholder: false })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The service could not be saved.");
  return data;
}

export async function updateService(
  id: string,
  input: Partial<Pick<Service, "name" | "description" | "category" | "unit" | "price" | "estimated_hours" | "image_url" | "is_active" | "sort_order">>,
): Promise<Service> {
  const { data, error } = await supabase
    .from("services")
    .update({ ...input, is_placeholder: false })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The service could not be updated.");
  return data;
}

export async function setServiceActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("services").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listConsumables(): Promise<(ServiceConsumable & { services: Pick<Service, "id" | "name"> | null })[]> {
  const { data, error } = await supabase
    .from("service_consumables")
    .select("*, services(id, name)")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export async function saveConsumable(input: {
  id?: string;
  service_id: string;
  inventory_item_id: string;
  qty_per_unit: number;
  unit: string | null;
}): Promise<void> {
  const payload = { ...input, is_placeholder: false };
  const { error } = input.id
    ? await supabase.from("service_consumables").update(payload).eq("id", input.id)
    : await supabase.from("service_consumables").insert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteConsumable(id: string): Promise<void> {
  const { error } = await supabase.from("service_consumables").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type { InventoryItem };
