# LabaFlow — Lab-a-Day Laundry Shop (web + mobile system)

## Context

The repository is a **fresh Enter template**, not an existing laundry app: Vite + React 19 + TypeScript + Tailwind 3 + shadcn/ui, React Router, one placeholder page (`src/pages/Index.tsx`), an unused i18n baseline, no database, no backend, no workflows, no Flutter project. There is therefore **nothing to preserve or migrate** — this is a greenfield build, and the only "existing" assets are the design/utility scaffolding we must reuse (`src/index.css`, `tailwind.config.ts`, `src/components/ui/*`, `src/router.tsx`, `CodeGuideline.md` conventions).

Goal: replace paper logging with one shared digital workflow for **customer / staff / admin** at Lab-a-Day Laundry Shop, on a real backend with server-enforced permissions.

## Environment constraints (decided with you)

| Area | Decision | Consequence |
|---|---|---|
| Backend | Enter Cloud (Postgres, Auth, RLS, Realtime, Storage, backend functions) | Real roles + server-side enforcement. No second backend, no duplicate modules. |
| Mobile | Web app as an **installable, mobile-first PWA** now + **Flutter source + GitHub Actions APK/AAB workflow committed as unverified source** | This environment can only build/run web. **No Flutter compile, no APK/AAB, no device test here — flagged, never claimed as working.** |
| Push | **In-app Realtime + browser Notification API** (verifiable now) + FCM push path wired behind an owner-supplied secret | `dispatch-push` returns `not_configured` until `FCM_SERVICE_ACCOUNT_JSON` exists. Never reported as delivered. |
| Data | Demo accounts (customer/staff/admin), sample orders, starter catalog with **clearly-labelled placeholder prices and placeholder consumption quantities** | No invented business rates: every seeded value is marked editable in the UI. |
| Imagery | AI-generated Oceanic Breeze photo set | I will confirm the image model before generating. |
| i18n | English UI copy in components; existing `i18n.config.json` + `src/i18n/*` + locale files left untouched (no multi-language was requested) | No dead translation keys; baseline still works if you enable multi-language later. |
| RFID | API boundary only (`rfid-scan` backend function + devices/tags/events tables + admin device console) | **No ESP32 hardware exists here — never reported as connected or verified.** |

## Design system — "Oceanic Breeze"

Set in `src/index.css` (HSL tokens) + `tailwind.config.ts`, then consumed via semantic classes only (no `text-white`/`bg-white` in components).

- `--primary` aqua-teal `191 85% 38%`, `--primary-foreground` `0 0% 100%`, `--accent` `174 68% 42%`
- `--background` warm white `190 45% 99%`, `--card` `0 0% 100%`, `--secondary`/`--muted` pale blue-green `186 45% 95%`
- `--foreground` dark navy-charcoal `210 45% 13%`; `--success` `152 58% 34%`, `--warning` `33 92% 42%`, `--destructive` `0 72% 48%`, `--info` `199 85% 46%`
- Tokens: `--gradient-ocean`, `--gradient-breeze`, `--shadow-elegant`, `--shadow-glow`, `--transition-smooth`; radius `1rem`; fonts Plus Jakarta Sans (display) + Inter (body) via `@import` in `index.css`
- `src/components/layout/ocean-background.tsx`: translucent soap bubbles + wave SVGs + subtle linen texture, `aria-hidden`, `pointer-events-none`, `z-index: 0` behind content — never near badges or controls
- Dark mode: full `.dark` token set (no white-on-white mistakes)

## Data model (one reversible migration per group, RLS enabled in the same migration)

`profiles`, `shop_settings` (single row: shop info, currency PHP, `consumption_stage` default `in_progress`, default low-stock threshold, `payment_channels` jsonb seeded `["Cash","GCash"]` — Maya is not assumed, admin can add it), `services`, `service_consumables`, `inventory_items`, `inventory_movements`, `orders`, `order_items`, `order_status_history`, `payments`, `receipts`, `notifications`, `device_tokens`, `conversations`, `conversation_participants`, `messages`, `faqs`, `rfid_devices`, `rfid_tags`, `rfid_events`.

Rules baked into the database:
- Helpers `is_admin()`, `is_staff()` = `SECURITY DEFINER` (no RLS recursion).
- **Role escalation blocked server-side**: `revoke update (role) on public.profiles from authenticated`; role changes only through `admin_set_user_role()` which re-checks `is_admin()`.
- Bootstrap: signup trigger creates `profiles`; the **first account becomes admin only while zero admins exist**, everyone else `customer`.
- Customer policies restrict to own `orders`/`payments`/`receipts`/`notifications`/`conversations`/`messages`/`device_tokens`; staff/admin read shop-wide; only staff/admin write status, payments, inventory; `faqs`/`services`/`shop_settings` publicly readable where active, admin-writable.
- `orders` status trigger writes `order_status_history` with `auth.uid()` + name; status → `ready_for_pickup` trigger inserts the customer notification (idempotent, only when a real matching customer order exists).
- `payments` insert trigger issues `receipts` with sequence-based `receipt_no` (`LFD-YYYYMM-0001`) and completes the order.
- Consumption: `service_consumables` recipes applied at `shop_settings.consumption_stage` (default In Progress), writing `inventory_movements` + `quantity_after`, shortages recorded as notes (never silent).
- Realtime enabled on `messages`, `notifications`, `orders`.
- Storage buckets: `avatars`, `service-images`.

## Backend functions (`supabase/functions/*`)

1. `create-staff-account` — admin-only (server-side role check), service-role account creation with temp password + role assignment.
2. `dispatch-push` — re-verifies the notification's order still belongs to the user and is still `ready_for_pickup`; sends FCM when `FCM_SERVICE_ACCOUNT_JSON` exists, else returns `not_configured`; records `push_status`/`push_error` per attempt.
3. `rfid-scan` — `verify_jwt = false`, authenticated by `x-device-key` against `RFID_DEVICE_API_KEY` secret; resolves `rfid_tags` → order, updates status + history + `rfid_events`, returns structured JSON for the OLED; explicit `unknown_tag` / `unauthorized_device` / `inactive_order` responses. Manual staff updates remain the fallback.
4. SQL RPC `sales_summary(from, to, granularity)` — admin-only, totals grouped by payment channel for daily/weekly/monthly reports.

## Implementation phases

**Phase 1 — Foundation & backend.** Enable Enter Cloud; design tokens (`index.css`, `tailwind.config.ts`); `src/lib/*` (supabase client usage, `constants.ts`, `format.ts` (PHP/date), `alerts.ts` SweetAlert2 wrappers, `orders.ts` status flow); add `sweetalert2`; migrations above + RLS; seeds (demo accounts, catalog, inventory, FAQs, sample orders); `AuthProvider` + `use-auth` (listener registered before session read, no async callback, deferred supabase calls), Google provider card, email auto-confirm; role-based routing guards.

**Phase 2 — Public site.** `src/components/layout/public-layout.tsx` + Oceanic Breeze landing sections (hero, services & pricing from `services`, how-it-works, FAQ accordion, CTA, footer), `/login`, `/register` (validation, field errors, Google button, preserved values), 404 polish.

**Phase 3 — Customer area.** `/app` dashboard, `/app/book` cart with live price preview, `/app/orders` + detail (timeline from `order_status_history`), `/app/receipts` + printable receipt, `/app/notifications` + bell, `/app/chat` (Realtime, read state, empty/loading/error states), `/app/profile`, notification permission card with explanation.

**Phase 4 — Staff/Admin `/manage`.** Dashboard KPIs; orders queue with walk-in create, status updates, payment recording; bookings review; inventory + movements + low-stock warnings; services & pricing + consumption recipes; reports (daily/weekly/monthly, by channel, recharts); receipts; chat inbox; FAQ admin; RFID device/tag console; staff management + shop settings (admin-only).

**Phase 5 — PWA & CI.** `public/manifest.webmanifest`, app icons, iOS/Android meta, prod-only offline service worker (never registered in dev/preview), install prompt; `.github/workflows/web-deploy.yml` (build + Pages-deploy with SPA 404 fallback and `--base=/<repo>/`) and `mobile-build.yml` (Flutter `apk` + `appbundle` artifacts, `google-services.json` from secrets).

**Phase 6 — Flutter source (unverified).** `mobile/` project mirroring core flows (auth, booking, orders/status, receipts, notifications, chat, profile) with `supabase_flutter`; README build steps. Cannot be compiled or tested here.

**Phase 7 — Docs & QA.** Rewrite `README.md` (setup, secrets/variables, Enter Cloud setup, Google OAuth, deployment, mobile build, what is verified vs owner-supplied), update `CodeGuideline.md` structure rules; run build/lint/typecheck; responsive screenshots; RLS + lifecycle verification.

## Critical files

- `src/router.tsx`, `src/App.tsx`, `src/index.css`, `tailwind.config.ts`
- `src/lib/alerts.ts`, `src/lib/constants.ts`, `src/lib/format.ts`
- `src/providers/auth-provider.tsx`, `src/hooks/use-auth.ts`, `src/hooks/use-notifications.ts`
- `src/components/layout/{public-layout,dashboard-layout,ocean-background}.tsx`
- `src/pages/{landing,auth/customer,manage}/**`
- `supabase/functions/{create-staff-account,dispatch-push,rfid-scan}/index.ts`
- `.github/workflows/{web-deploy,mobile-build}.yml`, `mobile/**`, `README.md`

## Implementation checklist

- [ ] Enter Cloud connected; `src/integrations/supabase/client.ts` used as-is (never edited)
- [ ] Oceanic Breeze tokens in `index.css` + `tailwind.config.ts`; no raw `bg-white`/`text-white` in components; dark mode readable
- [ ] Ocean background bubbles/waves/linen render behind content only
- [ ] All 21 tables + helpers created via migration, each with RLS enabled + policies in the same migration
- [ ] `role` column update revoked from `authenticated`; `admin_set_user_role()` requires `is_admin()`
- [ ] First-account-becomes-admin trigger fires only while zero admins exist
- [ ] Email signup + login with validation, field errors, value preservation, `emailRedirectTo: ${origin}/`
- [ ] Google sign-in button uses `signInWithOAuth('google', { redirectTo: `${origin}/` })`, no popup/top-nav override
- [ ] Role-based routing: customer → `/app`, staff → `/manage`, admin → `/manage`; unauthenticated → `/login`
- [ ] Landing page hero, services+pricing from DB, how-it-works, FAQ accordion, CTAs
- [ ] Booking cart computes price before submit and shows per-line breakdown
- [ ] Order lifecycle Received → In Progress → Ready for Pick-up → Done, each transition writing history with actor + timestamp
- [ ] Consumption deducted from `service_consumables` at `consumption_stage`, movements + shortage notes recorded
- [ ] Low-stock warnings use admin-configured thresholds
- [ ] Payments recorded per `payment_channels`; receipt auto-issued with `receipt_no`; printable receipt view
- [ ] Reports totals reconcile with recorded payments, grouped by channel, daily/weekly/monthly
- [ ] Chat: private to participant + authorized staff, realtime, timestamps, read state, send/error feedback
- [ ] `ready_for_pickup` creates exactly one customer notification; no notification otherwise
- [ ] `dispatch-push` returns `not_configured` without the FCM secret and never reports false delivery
- [ ] `rfid-scan` rejects bad device key and unknown tag; records `rfid_events` only on real scan calls
- [ ] SweetAlert2 confirmations for irreversible actions (cancel order, deactivate staff, delete FAQ) and success/error alerts
- [ ] PWA manifest + icons + install UI; service worker registered only in production build
- [ ] `.github/workflows/*` committed with no secrets inline
- [ ] `README.md` documents verified vs owner-supplied setup
- [ ] `CodeGuideline.md` structure section updated for every new module

## Verification checklist

- [ ] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build` all pass on the final tree
- [ ] `supabase_get_table_schema` confirms RLS enabled + policies present for every new table (not assumed)
- [ ] Positive: demo customer books → staff moves status → customer sees timeline, notification, receipt; totals appear in reports
- [ ] Positive: staff records Cash and GCash payments; channel breakdown matches
- [ ] Negative: customer account attempting to read another customer's order/receipt/conversation is denied by RLS
- [ ] Negative: staff attempting `admin_set_user_role()` self-escalation is rejected
- [ ] Negative: `dispatch-push` with no FCM secret returns `not_configured`; `rfid-scan` with wrong device key is rejected; unknown tag returns an explicit error
- [ ] Boundary: ready-for-pickup notification is NOT created for walk-in orders with no customer, nor when the order leaves ready state
- [ ] Boundary: booking with quantity 0 / empty cart / out-of-range values blocked with field errors
- [ ] Boundary: inventory deduction below zero is prevented and surfaced as a shortage note
- [ ] Responsive check via `website_screenshot` at `mobile_390` and `desktop_1280` on landing, customer dashboard and manage orders (assumption stated, since no target device was specified)
- [ ] Backend function failures diagnosed from `supabase_search_edge_function_logs`
- [ ] Flutter build/APK, closed-app FCM push, ESP32 hardware and GitHub Pages deploy explicitly reported as **not verified here**

## Owner-supplied setup (cannot be verified by me)

- Firebase service account JSON (`FCM_SERVICE_ACCOUNT_JSON`) and web push config — required for background push
- Google OAuth credentials if the provider card requests them
- ESP32/RC522 hardware + `RFID_DEVICE_API_KEY` on the device
- GitHub repository secrets/variables for the two workflows, and the Flutter SDK for logs
