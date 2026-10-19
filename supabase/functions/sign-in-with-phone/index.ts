// Sign in with the mobile number the customer registered.
//
// Why this lives on the backend: Supabase verifies a password against an email
// address, so a mobile-number login has to resolve to the account first. Doing that
// in the browser would mean handing the customer's email to anyone who types their
// number. Here the lookup never leaves the server, and every failure - unknown
// number or wrong password - returns the same message, so the endpoint cannot be
// used to discover which numbers have accounts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENERIC_MESSAGE = 'That email or mobile number, or the password, is not correct.';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Digits only, so "+63 917 000 0003", "0917 000 0003" and "639170000003" agree. */
function lastTenDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '').slice(-10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) {
    console.error('sign-in-with-phone: backend credentials are missing');
    return json({ ok: false, error: 'missing_backend_credentials' }, 500);
  }

  let payload: { phone?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_payload' }, 400);
  }

  const phone = (payload.phone ?? '').trim();
  const password = payload.password ?? '';

  if (password === '' || lastTenDigits(phone).length < 10) {
    return json({ ok: false, error: 'invalid_credentials', message: GENERIC_MESSAGE }, 401);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profiles, error: lookupError } = await admin
    .from('profiles')
    .select('email, phone')
    .not('phone', 'is', null);

  if (lookupError) {
    console.error('sign-in-with-phone: lookup failed', lookupError.message);
    return json({ ok: false, error: 'lookup_failed' }, 500);
  }

  const wanted = lastTenDigits(phone);
  const match = (profiles ?? []).find(
    (profile) => (profile.email ?? '') !== '' && lastTenDigits(profile.phone) === wanted,
  );

  if (!match) {
    console.error(`sign-in-with-phone: no account for a number ending ${wanted.slice(-4)}`);
    return json({ ok: false, error: 'invalid_credentials', message: GENERIC_MESSAGE }, 401);
  }

  // The password check happens in the auth service, exactly as it would for an
  // email sign-in; this function only finds which account the number belongs to.
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email: match.email, password }),
  });

  const session = await response.json().catch(() => null);

  if (!response.ok || !session?.access_token || !session?.refresh_token) {
    console.error(
      `sign-in-with-phone: password rejected for a number ending ${wanted.slice(-4)}`,
    );
    return json({ ok: false, error: 'invalid_credentials', message: GENERIC_MESSAGE }, 401);
  }

  return json({
    ok: true,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
});
