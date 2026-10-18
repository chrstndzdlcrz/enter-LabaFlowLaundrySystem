// One-time demo seeding for LabaFlow.
//
// Creates the demo customer / staff / admin accounts plus a few sample orders so
// role routing, the order lifecycle, stock consumption, receipts, reports and the
// ready-for-pick-up notification can all be exercised immediately.
//
// Refuses to run once a real administrator exists, so it can never be used to
// inject accounts into an already-initialised shop.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEMO_PASSWORD = 'LabaFlow123!';

const demoAccounts = [
  { email: 'demo.admin@labaflow.test', full_name: 'Demo Admin (Owner)', role: 'admin', phone: '+63 917 000 0001' },
  { email: 'demo.staff@labaflow.test', full_name: 'Demo Staff', role: 'staff', phone: '+63 917 000 0002' },
  { email: 'demo.customer@labaflow.test', full_name: 'Demo Customer', role: 'customer', phone: '+63 917 000 0003' },
] as const;

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
  if (!url || !serviceKey) {
    return json({ ok: false, error: 'missing_backend_credentials' }, 500);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingAdmin } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  if (existingAdmin) {
    return json(
      {
        ok: false,
        error: 'already_initialised',
        message:
          'An administrator already exists, so demo seeding is closed. Manage staff from the Staff & Roles page instead.',
      },
      409,
    );
  }

  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const userIds: Record<string, string> = {};
  const created: string[] = [];

  for (const account of demoAccounts) {
    const existing = userList?.users?.find((u) => u.email === account.email);
    if (existing) {
      userIds[account.email] = existing.id;
      continue;
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: account.full_name, phone: account.phone },
    });

    if (error || !data?.user) {
      return json({ ok: false, error: 'create_user_failed', detail: error?.message }, 500);
    }

    userIds[account.email] = data.user.id;
    created.push(account.email);
  }

  const profileRows = demoAccounts.map((account) => ({
    id: userIds[account.email],
    email: account.email,
    full_name: account.full_name,
    phone: account.phone,
    role: account.role,
    is_active: true,
    is_demo: true,
  }));

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(profileRows, { onConflict: 'id' });

  if (profileError) {
    return json({ ok: false, error: 'profile_seed_failed', detail: profileError.message }, 500);
  }

  const customerId = userIds['demo.customer@labaflow.test'];
  const staffId = userIds['demo.staff@labaflow.test'];

  const { count: orderCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true });

  if ((orderCount ?? 0) > 0) {
    return json({
      ok: true,
      accounts_created: created,
      orders_seeded: 0,
      message: 'Demo accounts are ready. Sample orders already existed, so none were added.',
      credentials: { password: DEMO_PASSWORD, emails: demoAccounts.map((a) => a.email) },
    });
  }

  const { data: services } = await admin
    .from('services')
    .select('id, name, unit, price')
    .eq('is_active', true);
  const serviceByName = new Map((services ?? []).map((s) => [s.name, s]));

  const buildItems = (
    orderId: string,
    picks: Array<{ name: string; quantity: number }>,
  ) =>
    picks
      .map((pick) => {
        const service = serviceByName.get(pick.name);
        if (!service) return null;
        return {
          order_id: orderId,
          service_id: service.id,
          service_name: service.name,
          unit: service.unit,
          quantity: pick.quantity,
          unit_price: service.price,
          line_total: Math.round(service.price * pick.quantity * 100) / 100,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

  async function createOrder(input: {
    customerId: string | null;
    isWalkIn: boolean;
    customerName: string;
    customerPhone: string | null;
    status: string;
    notes: string | null;
    picks: Array<{ name: string; quantity: number }>;
    path?: string[];
  }) {
    const { data: order, error } = await admin
      .from('orders')
      .insert({
        customer_id: input.customerId,
        is_walk_in: input.isWalkIn,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        status: input.status,
        notes: input.notes,
        created_by: input.customerId ? input.customerId : staffId,
        assigned_to: input.isWalkIn ? staffId : null,
      })
      .select('id')
      .single();

    if (error || !order) {
      throw new Error(error?.message ?? 'order insert failed');
    }

    const items = buildItems(order.id, input.picks);
    if (items.length > 0) {
      const { error: itemError } = await admin.from('order_items').insert(items);
      if (itemError) throw new Error(itemError.message);
    }

    // Walk the lifecycle so the real triggers run: status history, stock
    // consumption, and the ready-for-pick-up notification.
    for (const next of input.path ?? []) {
      const { error: stepError } = await admin
        .from('orders')
        .update({ status: next })
        .eq('id', order.id);
      if (stepError) throw new Error(`status ${next}: ${stepError.message}`);
    }

    return order.id;
  }

  try {
    const pendingId = await createOrder({
      customerId,
      isWalkIn: false,
      customerName: 'Demo Customer',
      customerPhone: '+63 917 000 0003',
      status: 'pending',
      notes: 'Please use mild detergent on the whites.',
      picks: [{ name: 'Wash, Dry & Fold', quantity: 6 }],
    });

    const inProgressId = await createOrder({
      customerId,
      isWalkIn: false,
      customerName: 'Demo Customer',
      customerPhone: '+63 917 000 0003',
      status: 'received',
      notes: 'Two barong tagalog for pressing.',
      picks: [
        { name: 'Wash, Dry & Fold', quantity: 4 },
        { name: 'Press / Steam Iron', quantity: 3 },
      ],
      path: ['in_progress'],
    });

    await createOrder({
      customerId,
      isWalkIn: false,
      customerName: 'Demo Customer',
      customerPhone: '+63 917 000 0003',
      status: 'received',
      notes: 'Wedding gown - handle with care.',
      picks: [{ name: 'Dry Cleaning', quantity: 2 }],
      path: ['in_progress', 'ready_for_pickup'],
    });

    const completedId = await createOrder({
      customerId,
      isWalkIn: false,
      customerName: 'Demo Customer',
      customerPhone: '+63 917 000 0003',
      status: 'received',
      notes: null,
      picks: [{ name: 'Wash Only', quantity: 5 }],
      path: ['in_progress', 'ready_for_pickup'],
    });

    // Walk-in with no customer account: it must never produce a notification.
    await createOrder({
      customerId: null,
      isWalkIn: true,
      customerName: 'Walk-in - Aling Nena',
      customerPhone: '+63 917 000 0005',
      status: 'received',
      notes: 'Counter drop-off, paid on claim.',
      picks: [{ name: 'Wash, Dry & Fold', quantity: 9 }],
      path: ['in_progress', 'ready_for_pickup'],
    });

    // A partial cash payment keeps the in-progress order open.
    const { data: inProgressOrder } = await admin
      .from('orders')
      .select('id, total_amount')
      .eq('id', inProgressId)
      .single();

    if (inProgressOrder && Number(inProgressOrder.total_amount) > 0) {
      await admin.from('payments').insert({
        order_id: inProgressOrder.id,
        amount: Math.round((Number(inProgressOrder.total_amount) / 2) * 100) / 100,
        channel: 'Cash',
        received_by: staffId,
        notes: 'Partial payment at drop-off.',
      });
    }

    // Settling the ready order completes it and issues the e-receipt.
    const { data: completedOrder } = await admin
      .from('orders')
      .select('id, total_amount')
      .eq('id', completedId)
      .single();

    if (completedOrder) {
      await admin.from('payments').insert({
        order_id: completedOrder.id,
        amount: completedOrder.total_amount,
        channel: 'GCash',
        reference_no: 'GC-8842193',
        received_by: staffId,
        notes: 'GCash transfer confirmed at the counter.',
      });
    }

    return json({
      ok: true,
      accounts_created: created,
      orders_seeded: 5,
      sample_order_ids: { pending: pendingId, in_progress: inProgressId, completed: completedId },
      credentials: { password: DEMO_PASSWORD, emails: demoAccounts.map((a) => a.email) },
    });
  } catch (error) {
    console.error('seed-demo failed', error);
    return json({ ok: false, error: 'seed_failed', detail: String(error) }, 500);
  }
});
