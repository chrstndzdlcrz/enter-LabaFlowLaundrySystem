import { supabase } from "@/integrations/supabase/client";
import type { ShopSettings } from "./types";

export async function fetchShopSettings(): Promise<ShopSettings> {
  const { data, error } = await supabase.from("shop_settings").select("*").eq("id", true).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Shop settings are not available.");
  return data;
}

export async function updateShopSettings(
  input: Partial<
    Pick<
      ShopSettings,
      | "shop_name"
      | "tagline"
      | "address"
      | "phone"
      | "email"
      | "currency"
      | "receipt_footer"
      | "consumption_stage"
      | "default_low_stock_threshold"
      | "payment_channels"
      | "gcash_qr_url"
      | "gcash_name"
      | "gcash_number"
    >
  >,
): Promise<ShopSettings> {
  const { data, error } = await supabase
    .from("shop_settings")
    .update(input)
    .eq("id", true)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Shop settings could not be saved.");
  return data;
}

/** Payment channels are admin-configurable; the default stays Cash + GCash. */
export function paymentChannelsOf(settings: ShopSettings | undefined | null): string[] {
  const raw = settings?.payment_channels;
  if (Array.isArray(raw)) {
    const channels = raw.filter((value): value is string => typeof value === "string" && value.trim() !== "");
    if (channels.length > 0) return channels;
  }
  return ["Cash", "GCash"];
}
