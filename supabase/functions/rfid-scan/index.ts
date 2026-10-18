// RFID scan boundary for the counter reader (ESP32 + RC522 + OLED + LED + buzzer).
//
// This is an integration boundary, not a simulation: it only ever acts on a real
// HTTP call from a registered device carrying the shop device key. It never
// fabricates a successful scan, and every attempt - including rejected ones - is
// written to rfid_events so the shop can see exactly what the hardware sent.
//
// The reader authenticates with the `x-device-key` header against the
// RFID_DEVICE_API_KEY secret (verify_jwt = false for this function).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-key',
};

// Actions the reader may request, mapped to the shop's processing lifecycle.
const actionToStatus: Record<string, string> = {
  receive: 'received',
  received: 'received',
  start: 'in_progress',
  in_progress: 'in_progress',
  ready: 'ready_for_pickup',
  ready_for_pickup: 'ready_for_pickup',
  release: 'completed',
  completed: 'completed',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ ok: false, error: 'missing_backend_credentials' }, 500);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: { tag_uid?: string; device_id?: string; device_label?: string; action?: string; raw?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_payload', message: 'Send a JSON body.' }, 400);
  }

  const tagUid = (payload.tag_uid ?? '').trim().toUpperCase();
  const action = (payload.action ?? '').trim().toLowerCase();

  async function logEvent(
    result: string,
    detail: string,
    deviceId: string | null,
    orderId: string | null = null,
  ) {
    await admin.from('rfid_events').insert({
      device_id: deviceId,
      tag_uid: tagUid || null,
      order_id: orderId,
      result,
      detail,
      raw: (payload.raw ?? payload) as never,
    });
  }

  // ---------------------------------------------------------------- device auth
  const expectedKey = Deno.env.get('RFID_DEVICE_API_KEY');
  if (!expectedKey) {
    await logEvent('error', 'Device key is not configured on the backend', null);
    return json(
      {
        ok: false,
        error: 'device_not_configured',
        message: 'This shop has not configured an RFID device key yet. Ask the owner to set it up.',
      },
      503,
    );
  }

  const providedKey = req.headers.get('x-device-key');
  if (!providedKey || providedKey !== expectedKey) {
    await logEvent('unauthorized', 'Request rejected: missing or incorrect device key', null);
    return json({ ok: false, error: 'unauthorized', message: 'Unknown device key.' }, 401);
  }

  // ------------------------------------------------------------- device lookup
  let device: { id: string; label: string; is_active: boolean } | null = null;
  if (payload.device_id) {
    const { data } = await admin
      .from('rfid_devices')
      .select('id, label, is_active')
      .eq('id', payload.device_id)
      .maybeSingle();
    device = data;
  } else if (payload.device_label) {
    const { data } = await admin
      .from('rfid_devices')
      .select('id, label, is_active')
      .eq('label', payload.device_label)
      .maybeSingle();
    device = data;
  }

  if (!device) {
    await logEvent('unauthorized', 'Device is not registered in LabaFlow', null);
    return json(
      {
        ok: false,
        error: 'device_not_registered',
        message: 'Register this reader on the RFID devices page before scanning.',
      },
      403,
    );
  }

  if (!device.is_active) {
    await logEvent('unauthorized', 'Device has been deactivated', device.id);
    return json({ ok: false, error: 'device_inactive', message: 'This reader is deactivated.' }, 403);
  }

  if (!tagUid) {
    await admin
      .from('rfid_devices')
      .update({ last_seen_at: new Date().toISOString(), last_result: 'unknown_tag' })
      .eq('id', device.id);
    await logEvent('unknown_tag', 'No tag UID was sent', device.id);
    return json({ ok: false, error: 'missing_tag', message: 'No tag UID was sent.' }, 400);
  }

  const nextStatus = actionToStatus[action];
  if (!nextStatus) {
    await logEvent('error', `Unsupported action: ${action || '(empty)'}`, device.id);
    return json(
      { ok: false, error: 'invalid_action', message: `Unsupported action "${action}".` },
      400,
    );
  }

  // ------------------------------------------------------------------ tag lookup
  const { data: tag } = await admin
    .from('rfid_tags')
    .select('id, tag_uid, is_active, order_id')
    .eq('tag_uid', tagUid)
    .maybeSingle();

  if (!tag) {
    await admin
      .from('rfid_devices')
      .update({ last_seen_at: new Date().toISOString(), last_result: 'unknown_tag' })
      .eq('id', device.id);
    await logEvent('unknown_tag', 'Tag is not linked to any order', device.id);
    return json({ ok: false, error: 'unknown_tag', message: `Tag ${tagUid} is not linked to an order.` }, 404);
  }

  if (!tag.is_active) {
    await logEvent('inactive_tag', 'Tag is deactivated', device.id, tag.order_id);
    return json({ ok: false, error: 'inactive_tag', message: `Tag ${tagUid} is deactivated.` }, 409);
  }

  if (!tag.order_id) {
    await logEvent('unknown_tag', 'Tag is not attached to an order yet', device.id);
    return json({ ok: false, error: 'unassigned_tag', message: `Tag ${tagUid} has no order.` }, 409);
  }

  const { data: order } = await admin
    .from('orders')
    .select('id, order_code, status, customer_name, total_amount')
    .eq('id', tag.order_id)
    .maybeSingle();

  if (!order) {
    await logEvent('unknown_tag', 'Linked order no longer exists', device.id, tag.order_id);
    return json({ ok: false, error: 'order_missing', message: 'The linked order no longer exists.' }, 404);
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    await admin
      .from('rfid_devices')
      .update({ last_seen_at: new Date().toISOString(), last_result: 'inactive_order' })
      .eq('id', device.id);
    await logEvent('inactive_order', `Order is already ${order.status}`, device.id, order.id);
    return json(
      {
        ok: false,
        error: 'inactive_order',
        message: `Order ${order.order_code} is already ${order.status}.`,
        order_code: order.order_code,
        status: order.status,
      },
      409,
    );
  }

  // The database lifecycle trigger is the authority on what transitions are legal.
  const { data: updated, error: updateError } = await admin
    .from('orders')
    .update({ status: nextStatus })
    .eq('id', order.id)
    .select('id, order_code, status, customer_name')
    .single();

  if (updateError) {
    await admin
      .from('rfid_devices')
      .update({ last_seen_at: new Date().toISOString(), last_result: 'invalid_transition' })
      .eq('id', device.id);
    await logEvent('invalid_transition', updateError.message, device.id, order.id);
    return json(
      {
        ok: false,
        error: 'invalid_transition',
        message: updateError.message,
        order_code: order.order_code,
        status: order.status,
      },
      409,
    );
  }

  await admin
    .from('rfid_devices')
    .update({ last_seen_at: new Date().toISOString(), last_result: 'ok' })
    .eq('id', device.id);
  await logEvent('ok', `Status set to ${nextStatus}`, device.id, order.id);

  return json({
    ok: true,
    order_code: updated.order_code,
    status: updated.status,
    customer_name: updated.customer_name,
    message: `${updated.order_code} is now ${updated.status.replace(/_/g, ' ')}.`,
  });
});
