import { supabase } from "@/integrations/supabase/client";

/**
 * Signs in with the mobile number on the account.
 *
 * The number-to-account lookup happens on the backend, so the customer's email is
 * never exposed to the browser, and the same message comes back whether the number
 * is unknown or the password is wrong.
 */
export async function signInWithPhone(phone: string, password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("sign-in-with-phone", {
    body: { phone, password },
  });

  if (error) {
    throw new Error("We could not reach the sign-in service. Please try again.");
  }

  const result = data as {
    ok?: boolean;
    access_token?: string;
    refresh_token?: string;
    message?: string;
  };

  if (!result?.ok || !result.access_token || !result.refresh_token) {
    throw new Error(result?.message ?? "That mobile number, or the password, is not correct.");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });

  if (sessionError) throw new Error(sessionError.message);
}
