// Trusted delivery of the "ready for pick-up" push notification.
//
// The notification row itself is created by a database trigger, so a customer can
// never be told their laundry is ready unless a real order of theirs actually
// became ready. This function only handles delivery, and it re-checks the order
// and customer before sending anything.
//
// FCM requires the shop's own Firebase service account. Until that secret exists
// the function reports `not_configured` and nothing is claimed as delivered.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { importPKCS8, SignJWT } from 'https://esm.sh/jose@5.9.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fcmAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(account.private_key.replace(/\\n/g, '\n'), 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`token_exchange_failed: ${JSON.stringify(payload)}`);
  }
  return payload.access_token as string;
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

  const isStaff =
    !!callerProfile?.is_active && (callerProfile.role === 'staff' || callerProfile.role === 'admin');

  if (!isStaff) return json({ ok: false, error: 'staff_only' }, 403);

  let payload: { notification_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_payload' }, 400);
  }

  if (!payload.notification_id) return json({ ok: false, error: 'invalid_payload' }, 400);

  const { data: notification } = await admin
    .from('notifications')
    .select('id, user_id, order_id, type, title, body, push_attempts')
    .eq('id', payload.notification_id)
    .maybeSingle();

  if (!notification) return json({ ok: false, error: 'notification_not_found' }, 404);

  async function record(status: string, error: string | null, extra: Record<string, unknown> = {}) {
    await admin
      .from('notifications')
      .update({
        push_status: status,
        push_error: error,
        push_attempts: (notification?.push_attempts ?? 0) + 1,
      })
      .eq('id', payload.notification_id!);
    return json({ ok: status === 'sent', push_status: status, push_error: error, ...extra });
  }

  if (notification.type !== 'order_ready') {
    return record('skipped', 'unsupported_notification_type');
  }

  // The only orders allowed to reach a customer are their own, still-ready ones.
  const { data: order } = await admin
    .from('orders')
    .select('id, order_code, status, customer_id')
    .eq('id', notification.order_id)
    .maybeSingle();

  if (!order) return record('skipped', 'order_missing');
  if (order.customer_id !== notification.user_id) return record('skipped', 'order_not_owned_by_recipient');
  if (order.status !== 'ready_for_pickup') return record('skipped', `order_status_${order.status}`);

  const { data: tokens } = await admin
    .from('device_tokens')
    .select('token, platform')
    .eq('user_id', notification.user_id);

  if (!tokens || tokens.length === 0) {
    return record('skipped', 'no_registered_device', { order_code: order.order_code });
  }

  const rawAccount = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!rawAccount) {
    return record('not_configured', 'FCM service account is not configured for this shop yet', {
      order_code: order.order_code,
      intended_recipients: tokens.length,
    });
  }

  let account: ServiceAccount;
  try {
    account = JSON.parse(rawAccount);
  } catch {
    return record('failed', 'FCM service account JSON could not be parsed');
  }

  let accessToken: string;
  try {
    accessToken = await fcmAccessToken(account);
  } catch (error) {
    console.error('dispatch-push: FCM token exchange failed', error);
    return record('failed', String(error));
  }

  let sent = 0;
  const failures: string[] = [];
  const staleTokens: string[] = [];

  for (const token of tokens) {
    try {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: token.token,
              notification: { title: notification.title, body: notification.body },
              data: { order_id: order.id, order_code: order.order_code, type: 'order_ready' },
            },
          }),
        },
      );

      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        sent += 1;
        continue;
      }

      const detail = JSON.stringify(body);
      failures.push(detail);
      if (response.status === 404 || detail.includes('UNREGISTERED') || detail.includes('INVALID_ARGUMENT')) {
        staleTokens.push(token.token);
      }
      console.error('dispatch-push: FCM send failed', response.status, detail);
    } catch (error) {
      failures.push(String(error));
      console.error('dispatch-push: FCM send threw', error);
    }
  }

  if (staleTokens.length > 0) {
    await admin.from('device_tokens').delete().in('token', staleTokens);
  }

  if (sent === 0) {
    return record('failed', failures.join(' | ').slice(0, 500), {
      delivered: 0,
      attempted: tokens.length,
      order_code: order.order_code,
    });
  }

  return record(failures.length > 0 ? 'sent' : 'sent', failures.join(' | ').slice(0, 500) || null, {
    delivered: sent,
    attempted: tokens.length,
    order_code: order.order_code,
  });
});
