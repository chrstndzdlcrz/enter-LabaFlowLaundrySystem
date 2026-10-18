import { supabase } from "@/integrations/supabase/client";
import type { Notification } from "./types";

export async function listNotifications(options?: { limit?: number }): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error("You are not signed in.");
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.user.id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function findNotificationForOrder(orderId: string): Promise<Notification | null> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("order_id", orderId)
    .eq("type", "order_ready")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export type PushDispatchResult = {
  ok: boolean;
  push_status: "pending" | "sent" | "skipped" | "not_configured" | "failed";
  push_error?: string | null;
  delivered?: number;
  attempted?: number;
};

/**
 * Asks the backend to attempt delivery. The result is reported exactly as the
 * backend returned it - "not_configured" is never presented as delivered.
 */
export async function dispatchPush(notificationId: string): Promise<PushDispatchResult> {
  const { data, error } = await supabase.functions.invoke("dispatch-push", {
    body: { notification_id: notificationId },
  });
  if (error) throw new Error(error.message);

  const result = data as PushDispatchResult & { error?: string; message?: string };
  if (!result) throw new Error("The notification service did not respond.");
  if (result.error && !result.push_status) {
    throw new Error(result.message ?? result.error);
  }
  return result;
}

/**
 * Registers an FCM web token when the shop has configured Firebase for the app.
 * Without a Firebase web configuration there is nothing to register, and the app
 * relies on in-app and browser notifications instead.
 */
export async function registerDeviceToken(token: string, platform: "web" | "android" | "ios") {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error("You are not signed in.");

  const { error } = await supabase.from("device_tokens").upsert(
    {
      user_id: session.user.id,
      token,
      platform,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) throw new Error(error.message);
}
