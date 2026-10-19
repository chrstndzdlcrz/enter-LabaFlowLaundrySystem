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
| Google sign-in | Enabled in the project's authentication settings. Runs through Google's sign-in widget with the redirect round-trip as fallback; the account round-trip itself has **not** been independently verified here |
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
builds and deploys the same app to GitHub Pages once Pages is switched on for the
repository (see *Deploying the web app to your own GitHub* below).

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

The shop runs with two people: the **seller**, who is at the counter and does the
work, and the **owner**, who is abroad and uses LabaFlow to **monitor stock and
sales**. That is what the split below reflects.

| Capability | Customer | Seller (staff) | Owner (admin) |
|---|---|---|---|
| Own orders, receipts, notifications, chat | Yes | — | — |
| Counter queue, status updates, payments, receipts, customer chat | — | Yes | Yes |
| Supplies, stock movements, reorder levels | — | Yes | Yes |
| Services, prices, consumption rules | — | Yes | Yes |
| FAQ entries, shop settings, RFID readers | — | Yes | Yes |
| Sales reports (daily / weekly / monthly, by channel) | — | — | Yes |
| Staff accounts and roles | — | — | Yes |

The owner keeps the monitoring view: their dashboard carries the live stock levels
with each supply's percentage, and the sales reports are theirs alone. Everything
operational — prices, supplies, settings, FAQs — sits with the seller, so the shop
never waits on someone in another time zone.

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

### The shop's price list and pricing model

Prices are tiered: a base quantity is covered by the base price, anything above it
is charged per extra unit, and an optional cap limits one wash.

| Service | Price rule | Cap per wash |
|---|---|---|
| Wash, Dry & Fold | ₱180 for the first 7 kg, then ₱25 per extra kilo | 10 kg |
| Bedsheet | ₱190 for the first 5 kg, then ₱38 per extra kilo | 9 kg |
| Comforter | ₱200 per piece | none |
| Wash Only, Dry Only, Press / Steam Iron, Dry Cleaning, Express Rush | still placeholder prices — the owner edits them | — |

A booking below the base weight is still charged the base price (the minimum
charge), and booking above the cap is refused with a message asking for a separate
load. Every line stores the rule that priced it, so a receipt can show
"First 7 kg at 180.00 + 1 extra at 25.00" even after the price list changes.

The server computes every line; the browser and the mobile app mirror the same
formula only to show a preview, and that mirror is verified against the server
(`src/lib/pricing.ts`).

### Soap and supply inventory

Soap is bought by the pack and consumed by the millilitre, so stock is tracked in
ml with the pack size recorded alongside it:

| Supply | Pack | Consumption |
|---|---|---|
| Surf Liquid Detergent | 2500 ml pack | 100 ml per load |
| Surf Fabric Conditioner | 1600 ml pack | 100 ml per load |
| Zonrox Color Safe Bleach | 900 ml bottle | 10 ml per load |

A "per wash" rule deducts a fixed amount for every load a service represents, so a
10 kg wash-dry-fold costs one load while three separate comforters count as three.
Stock is deducted when an order reaches the stage chosen in shop settings (In
Progress by default), and the movement log records exactly what came off which
supply for which order.

Each soap shows its **stock status as a percentage** of the level the shop wants to
keep (`full_stock_level`, pre-set to one full pack), with a bar and a colour band:
green above 60%, amber below it, red below 25%, plus a separate “Reorder” flag once
the quantity reaches the reorder level. The reorder levels shipped as a starting
point are one fifth of a pack and are meant to be adjusted to the shop's own way of
working.

### Business values are the shop's, not the app's

The prices, pack sizes and consumption rates above come from the shop. Anything
still flagged “Placeholder — edit” (the remaining services, and the dry-cleaning
and pressing consumption rules) is a starting point the owner replaces, and with no
consumption rule configured for a service no stock is deducted at all.

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

Google sign-in runs through Google's own sign-in widget, which hands the page an
ID token that the backend turns into a session. Nothing round-trips through a
redirect, so it works from whatever address the site is served from — the Enter
preview and the GitHub Pages site alike — and the customer never leaves the page.

Two things about the OAuth round-trip are worth knowing, because the deployed site
used to fall into both:

- The backend only returns a redirect round-trip to an origin on its allow-list,
  and that list holds the Enter preview and published addresses only. From any
  other address the round-trip is dropped and the browser is sent to the bare
  backend host, which answers with a server sign-in prompt. The app therefore
  refuses to start a round-trip from an address that is not allowed, and shows a
  plain explanation instead.
- On the Google side the OAuth client needs the site's origin under
  **Authorized JavaScript origins** (`https://<user>.github.io`), and the app is
  only offered to accounts that the consent screen allows: while the screen is in
  **Testing**, only the accounts listed as test users can sign in, and everyone
  else is refused with a 403.

If the credentials ever need replacing, the OAuth client also needs this redirect
URI, which the round-trip fallback uses:

```
https://<your project ref>.supabase.opentrust.net/auth/v1/callback
```

### 5. GitHub Actions

| Workflow | Needs |
|---|---|
| `web-deploy.yml` | Repository → Settings → Pages → Source: **GitHub Actions**. No secrets: the publishable client key is safe to ship because RLS protects every table. |
| `mobile-build.yml` | Repository variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; optional secrets `GOOGLE_SERVICES_JSON_BASE64` (Firebase config) and `FCM_SERVICE_ACCOUNT_BASE64`. |

Neither workflow has been executed from the development environment.

#### Deploying the web app to your own GitHub

1. **Put the code in your repository.** Either connect your own GitHub account in
   Enter's GitHub integration so it syncs to your repo, or clone the repository and
   push it to a new one of your own — `git remote set-url origin <your repo>` then
   `git push -u origin main`.
2. **Turn Pages on**: repository **Settings → Pages → Source: GitHub Actions**.
   That is the only setting the workflow needs; it deliberately does not try to
   change repository settings itself.
3. **Let it run.** The first push to `main` builds and publishes the site. The job
   prints the live URL; it is one of:
   - `https://<user>.github.io/<repo>/` — a normal repository name
   - `https://<user>.github.io/` — a repository named `<user>.github.io`, or a
     custom domain
   The workflow works out that base path by itself, and the app follows it: asset
   URLs, the router, the service worker, the manifest and the sign-in redirects all
   resolve relative to wherever it is deployed. A project path like `/repo/` needs
   no edits and no rebuild.
4. **Allow the new address on the Google side.** Add the deployed origin
   (`https://<user>.github.io`) to the OAuth client's **Authorized JavaScript
   origins**. This is the step that makes Google sign-in work on the deployed
   address; email and number sign-in need nothing. Keep the OAuth client's
   consent screen published, or only its listed test users can sign in.

**What the site needs from the backend.** Nothing changes when you deploy: the
running app keeps using the same managed Supabase backend, with the publishable key
that is already in the build. Data, logins, realtime chat and notifications keep
working, and row level security applies to the public site exactly as it does in
the preview.

**If you ever want your own Supabase project instead**, tell me — the repository
already holds the complete backend history in `supabase/migrations/` (schema, row
level security, triggers, functions, seed data) plus the four deployable backend
functions in `supabase/functions/`, so it can be recreated elsewhere in order.

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
