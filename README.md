# LabaFlow — Lab-a-Day Laundry Shop

LabaFlow replaces paper-based laundry logging with one shared digital workflow for
**customers**, **staff** and the **shop owner**: pre-booking, live order status,
supply tracking, counter payments, digital receipts, reporting, in-app chat and
customer notifications.

Built on Vite + React + TypeScript + Tailwind (shadcn/ui) with **Enter Cloud** as
the backend (Postgres, authentication, row level security, Realtime and backend
functions). The project also contains a **Flutter mobile app** under `mobile/`.
It has never been compiled here — see its README before believing anything about it.

---

## What works today

| Area | State |
|---|---|
| Email/password sign-up and sign-in | Working, verified against the live backend |
| Google sign-in | Provider enabled and credentials configured through Enter Cloud. The consent round-trip itself has **not** been independently verified here |
| Role-based routing (customer / staff / admin) | Working; the backend is the authority |
| Public site: services, prices, FAQ, CTAs | Working, reads the live catalogue |
| Booking with price preview | Working; price is computed server-side |
| Order lifecycle + status history | Working; transitions validated in the database |
| Supply consumption + low-stock warnings | Working; rules are shop-configured, not invented |
| Cash / GCash payments + e-receipts | Working; receipts issued by a database trigger |
| Reports (daily/weekly/monthly, by channel) | Working, owner-only |
| Realtime chat + read state | Working |
| Ready-for-pick-up in-app notifications | Working (Realtime + browser notification) |
| Background push (FCM) | **Wired but inactive** — needs the shop's Firebase service account |
| RFID hardware boundary | **Endpoint implemented, hardware absent** — no reader has ever connected |
| Flutter app | **Source only, never compiled** |
| GitHub Actions deployment | **Workflows committed, never executed** |

Nothing in the last four rows should be described as working until the owner
completes the setup below.

---

## Quick start

```bash
pnpm install
pnpm dev          # development server
pnpm check        # lint + type check
pnpm run build    # production build
```

Publishing is done from Enter; `.github/workflows/web-deploy.yml` additionally
builds and deploys to GitHub Pages once Pages is switched on for the repository.

### Demo accounts (seeded once, deletable)

| Role | Email | Password |
|---|---|---|
| Owner / admin | `demo.admin@labaflow.test` | `LabaFlow123!` |
| Staff / seller | `demo.staff@labaflow.test` | `LabaFlow123!` |
| Customer | `demo.customer@labaflow.test` | `LabaFlow123!` |

Sample orders, payments, receipts, stock movements and one ready-for-pick-up
notification are seeded alongside them so every screen has real data.

**Before going live:** sign in as the demo admin, promote your own account under
*Staff & roles*, then switch the demo accounts off.

The first account ever registered becomes the owner automatically **only while no
admin exists**. With the demo admin present, that rule is already spent — use the
demo admin to promote yourself.

---

## Roles and permissions

| Capability | Customer | Staff | Owner |
|---|---|---|---|
| Own orders, receipts, notifications, chat | Yes | — | — |
| Counter queue, status updates, payments, receipts, customer chat | — | Yes | Yes |
| Supplies, stock movements | — | Record movements | Full management |
| Services, prices, consumption rules | — | — | Yes |
| Reports, staff & roles, FAQ, shop settings | — | — | Yes |
| Register / deactivate RFID readers | — | View, link tags | Yes |

Enforcement lives in the database (row level security plus security-definer
functions) and in the backend functions. The web app's routing guard is only a
convenience; it is not the security boundary. Nobody can promote themselves: the
role column is not client-writable and `admin_set_user_role` re-checks the caller.

---

## Data model

`profiles`, `shop_settings`, `services`, `service_consumables`, `inventory_items`,
`inventory_movements`, `orders`, `order_items`, `order_status_history`, `payments`,
`receipts`, `notifications`, `device_tokens`, `conversations`,
`conversation_participants`, `messages`, `faqs`, `rfid_devices`, `rfid_tags`,
`rfid_events`.

Rules that are enforced in the database rather than in code:

- Only the lifecycle `pending → confirmed → received → in_progress →
  ready_for_pickup → completed` (plus `cancelled`, and a rework step back to
  `in_progress`) is allowed, and every change writes an `order_status_history` row.
- Reaching `ready_for_pickup` creates **one** notification for the order's own
  customer. Walk-in orders with no linked account create none.
- Stock is deducted at the stage configured in shop settings using the shop's own
  consumption rules. Stock never goes negative: a shortage is recorded instead.
- Recording a payment issues or refreshes the e-receipt and completes the order
  once it is fully paid.
- Roles, account status, order ownership and receipt ownership are all checked
  server-side.

### Business values are the shop's, not the app's

Seeded services, prices, stock levels and consumption rates are **marked as
placeholders** and labelled “Placeholder — edit” in the owner's screens. The app
never invents a rate: with no consumption rule configured for a service, no stock
is deducted at all.

---

## Backend functions

| Function | Purpose | Access |
|---|---|---|
| `seed-demo` | One-time demo accounts and sample data | Refuses once any admin exists |
| `create-staff-account` | Creates a staff/owner account with a generated password | Caller must be an active admin (re-checked server-side) |
| `dispatch-push` | Delivers the ready-for-pick-up push | Staff/admin, re-verifies the order is still ready and belongs to the recipient |
| `rfid-scan` | RFID reader boundary | `x-device-key` header against the `RFID_DEVICE_API_KEY` secret; JWT verification disabled for this endpoint only |

`dispatch-push` reports what actually happened. Without the FCM service account it
sets `push_status = not_configured` and says so in the app — it never claims a
delivery that did not occur.

---

## Setup that only the owner can complete

### 1. Push notifications (optional, needs a Firebase project)

Background push requires the shop's own Firebase project:

1. Create a Firebase project and add an Android app plus a web app.
2. Store the service-account JSON as the backend secret `FCM_SERVICE_ACCOUNT_JSON`
   (Backend secrets → `FCM_SERVICE_ACCOUNT_JSON`).
3. Register device tokens in the `device_tokens` table: the table, its policies and
   the delivery path are already in place, and the Flutter README explains the
   mobile steps.

Until then, customers still receive ready-for-pick-up notifications inside the app
and as browser notifications while the site is open. That path is live and verified.

### 2. RFID reader (needs the ESP32 hardware)

1. Generate a device key and store it as the backend secret `RFID_DEVICE_API_KEY`.
2. Register the reader under *RFID readers* in the app.
3. Link a tag UID to an order, then have the reader POST to:

```
POST <your project URL>/functions/v1/rfid-scan
x-device-key: <the device key>
{ "device_label": "Counter reader", "tag_uid": "A1B2C3D4", "action": "ready" }
```

`action` is one of `receive`, `start`, `ready`, `release`. Responses are explicit:
`device_not_configured`, `unauthorized`, `device_not_registered`, `unknown_tag`,
`invalid_transition` or `ok` — the reader shows that text on its OLED. Every attempt,
accepted or rejected, is written to `rfid_events`.

Until a reader exists, staff keep updating statuses from the order screens; that
path is fully available and is the recommended fallback.

### 3. Mobile app

See `mobile/README.md`. It documents generating the platform folders, the backend
defines, the Google deep link and the FCM steps. The source has not been compiled.

### 4. Google sign-in

Enabled in the project's authentication settings. If the credentials ever need
replacing, the OAuth client needs this redirect URI:

```
https://<your project ref>.supabase.opentrust.net/auth/v1/callback
```

### 5. GitHub Actions

| Workflow | Needs |
|---|---|
| `web-deploy.yml` | Repository → Settings → Pages → Source: **GitHub Actions**. No secrets: the publishable client key is safe to ship because RLS protects every table. |
| `mobile-build.yml` | Repository variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; optional secrets `GOOGLE_SERVICES_JSON_BASE64` (Firebase config) and `FCM_SERVICE_ACCOUNT_BASE64`. |

Neither workflow has been executed from the development environment.

---

## Verification performed

- Type check, lint and production build all pass on the final tree.
- Row level security confirmed applied to all 20 tables, with server-side checks
  exercised for customer, staff and anonymous callers (no cross-customer reads, no
  self-promotion, no client billing authority).
- Order lifecycle, stock consumption, receipt issuance and completion driven
  end-to-end through the real triggers, including the boundary case that a walk-in
  order with no linked customer produces no notification.
- Responsive layout checked at mobile (390 px) and desktop (1280 px) widths for the
  public pages.

**Not verified here:** the Flutter build, background push delivery, any RFID
hardware scan, GitHub Actions runs, and the Google consent round-trip. Signed-in
screens could not be captured visually from this environment; their behaviour was
verified through the backend instead.

---

## Notes for maintainers

- Architecture and layout conventions: `CodeGuideline.md`.
- Only the publishable key belongs in client code. Private secrets live in backend
  secrets and are read with `Deno.env.get()` inside backend functions.
- Money is stored as `numeric(10,2)` and always formatted client-side; totals are
  computed by the database, never by the browser.
