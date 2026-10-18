// Admin-only staff account creation.
//
// The client cannot create accounts, and nothing about the caller's role is
// trusted from the browser: the caller's own profile is re-read here through the
// service role before any account is created.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `Lf-${out}!7`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization');
  if (!url || !serviceKey) return json({ ok: false, error: 'missing_backend_credentials' }, 500);
  if (!authHeader) return json({ ok: false, error: 'not_authenticated' }, 401);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerData, error: callerError } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (callerError || !callerData?.user) return json({ ok: false, error: 'not_authenticated' }, 401);

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role, is_active')
    .eq('id', callerData.user.id)
    .maybeSingle();

  if (!callerProfile || !callerProfile.is_active || callerProfile.role !== 'admin') {
    return json({ ok: false, error: 'admin_only' }, 403);
  }

  let payload: { email?: string; full_name?: string; phone?: string; role?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_payload' }, 400);
  }

  const email = (payload.email ?? '').trim().toLowerCase();
  const fullName = (payload.full_name ?? '').trim();
  const phone = (payload.phone ?? '').trim();
  const role = payload.role === 'admin' ? 'admin' : 'staff';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'invalid_email', message: 'Enter a valid email address.' }, 400);
  }
  if (fullName.length < 2) {
    return json({ ok: false, error: 'invalid_name', message: 'Enter the staff member name.' }, 400);
  }

  const password = temporaryPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (createError || !created?.user) {
    console.error('create-staff-account: user creation failed', createError?.message);
    return json(
      { ok: false, error: 'create_failed', message: createError?.message ?? 'Account creation failed.' },
      400,
    );
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: created.user.id,
      email,
      full_name: fullName,
      phone: phone || null,
      role,
      is_active: true,
      is_demo: false,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    console.error('create-staff-account: profile upsert failed', profileError.message);
    return json({ ok: false, error: 'profile_failed', message: profileError.message }, 500);
  }

  return json({
    ok: true,
    user_id: created.user.id,
    email,
    role,
    temporary_password: password,
    message: 'Share this temporary password with the staff member and ask them to change it after signing in.',
  });
});
