import { supabase } from "@/integrations/supabase/client";
import type { RfidDevice, RfidEvent, RfidTag } from "./types";

export async function listRfidDevices(): Promise<RfidDevice[]> {
  const { data, error } = await supabase.from("rfid_devices").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createRfidDevice(input: { label: string; location: string | null }): Promise<RfidDevice> {
  const { data, error } = await supabase
    .from("rfid_devices")
    .insert({ label: input.label.trim(), location: input.location })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The reader could not be registered.");
  return data;
}

export async function setRfidDeviceActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("rfid_devices").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listRfidTags(): Promise<(RfidTag & { orders: { order_code: string; status: string; customer_name: string } | null })[]> {
  const { data, error } = await supabase
    .from("rfid_tags")
    .select("*, orders(order_code, status, customer_name)")
    .order("assigned_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

export async function assignRfidTag(input: {
  tagUid: string;
  orderId: string;
  label: string | null;
}): Promise<RfidTag> {
  const { data: session } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("rfid_tags")
    .upsert(
      {
        tag_uid: input.tagUid.trim().toUpperCase(),
        order_id: input.orderId,
        label: input.label,
        is_active: true,
        assigned_by: session.user?.id ?? null,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "tag_uid" },
    )
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The tag could not be linked.");
  return data;
}

export async function detachRfidTag(id: string): Promise<void> {
  const { error } = await supabase.from("rfid_tags").update({ order_id: null }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setRfidTagActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("rfid_tags").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listRfidEvents(limit = 50): Promise<(RfidEvent & { rfid_devices: { label: string } | null })[]> {
  const { data, error } = await supabase
    .from("rfid_events")
    .select("*, rfid_devices(label)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}
