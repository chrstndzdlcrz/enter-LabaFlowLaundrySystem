import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./types";

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data returned.");
  return data;
}

/**
 * Creates the signed-in user's profile row when it does not exist yet (the
 * first-ever account becomes the owner). Idempotent.
 */
export async function ensureProfile(): Promise<Profile> {
  const { data, error } = await supabase.rpc("ensure_profile");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Could not load your profile.");
  return data as unknown as Profile;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return unwrap(data, error);
}

export async function updateMyProfile(input: {
  full_name: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
}): Promise<Profile> {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error("You are not signed in.");

  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", session.user.id)
    .select("*")
    .maybeSingle();

  return unwrap(data, error);
}

/**
 * Switches the signed-in user's own account off. An administrator can switch it
 * back on; the user cannot re-activate themselves.
 */
export async function deactivateMyAccount(): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error("You are not signed in.");

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", session.user.id);
  if (error) throw new Error(error.message);
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCustomers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setUserRole(userId: string, role: "customer" | "staff" | "admin"): Promise<Profile> {
  const { data, error } = await supabase.rpc("admin_set_user_role", { p_user_id: userId, p_role: role });
  if (error) throw new Error(error.message);
  return data as unknown as Profile;
}

export async function setProfileActive(userId: string, isActive: boolean): Promise<Profile> {
  const { data, error } = await supabase.rpc("admin_set_profile_active", {
    p_user_id: userId,
    p_is_active: isActive,
  });
  if (error) throw new Error(error.message);
  return data as unknown as Profile;
}

export async function createStaffAccount(input: {
  email: string;
  full_name: string;
  phone: string;
  role: "staff" | "admin";
}): Promise<{ email: string; temporary_password: string; role: string }> {
  const { data, error } = await supabase.functions.invoke("create-staff-account", { body: input });
  if (error) throw new Error(error.message);
  const result = data as { ok: boolean; message?: string; error?: string; temporary_password?: string; email?: string; role?: string };
  if (!result?.ok) throw new Error(result?.message ?? "The staff account could not be created.");
  return {
    email: result.email ?? input.email,
    temporary_password: result.temporary_password ?? "",
    role: result.role ?? input.role,
  };
}
