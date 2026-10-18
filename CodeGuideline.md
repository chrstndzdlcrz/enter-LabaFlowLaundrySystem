# Code Guideline

## Project Structure Overview

```
project-root/
  ├── .github/workflows/      # CI: web build/deploy and Flutter mobile build
  ├── i18n.config.json        # i18n manifest (template baseline, unchanged by LabaFlow)
  ├── mobile/                 # Flutter customer app (see mobile/README.md)
  ├── public/                 # Static assets: manifest, offline page, service worker, icons
  │   └── locales/            # public/locales/{code}.json translation files
  ├── supabase/
  │   ├── config.toml         # backend function configuration (JWT verification per function)
  │   └── functions/          # backend functions, one responsibility each
  ├── src/
  │   ├── components/         # Reusable UI, grouped by domain
  │   │   ├── auth/           # guards, shells, Google sign-in
  │   │   ├── chat/           # conversation list, chat panel
  │   │   ├── common/         # page header, stat card, status badge, query/empty/loading states
  │   │   ├── faq/            # public accordion + admin editor dialog
  │   │   ├── inventory/      # stock adjustment and supply item dialogs
  │   │   ├── layout/         # public shell, dashboard shell, navigation config, ocean background
  │   │   ├── notifications/  # bell, permission card
  │   │   ├── orders/         # tables, timeline, status/payment dialogs, service picker
  │   │   ├── receipts/       # shared printable e-receipt
  │   │   ├── sales/          # sales chart
  │   │   ├── services/       # service and consumption-rule dialogs
  │   │   └── ui/             # Prebuilt shadcn components and design-system primitives
  │   ├── hooks/              # One hook per file: use-auth, use-chat, use-notifications, use-mobile
  │   ├── i18n/               # i18n runtime: config.ts (entry) + util.ts (helpers)
  │   ├── integrations/       # Generated Cloud client and types — do not edit
  │   ├── lib/
  │   │   ├── api/            # One module per domain: typed backend access, no JSX
  │   │   ├── alerts.ts       # SweetAlert2 wrappers (confirmations, success, error)
  │   │   ├── assets.ts       # Image URLs used by the public site
  │   │   ├── constants.ts    # Roles, order lifecycle, units, validation patterns
  │   │   ├── format.ts       # Currency, dates, relative time, initials
  │   │   ├── pricing.ts      # Service price rules + stock level maths (mirrors SQL)
  │   │   └── utils.ts        # cn() and other primitives
  │   ├── pages/              # Route-level pages, each in its own subdirectory
  │   │   ├── landing/        # Public site sections
  │   │   ├── auth/           # login, register, role redirect
  │   │   ├── customer/       # dashboard, book, orders, receipts, notifications, chat, profile
  │   │   └── manage/         # staff + admin: dashboard, orders, bookings, inventory, services,
  │   │                       # sales reports, receipts, chat, rfid, faqs, staff, settings
  │   ├── providers/          # auth-context.ts (context) + auth-provider.tsx (component)
  │   ├── App.tsx             # Provider composition + offline shell registration
  │   ├── router.tsx          # Route table, area layout routes, lazy page loading
  │   └── index.css           # Oceanic Breeze design tokens and utilities
  ├── package.json            # Project metadata and scripts
  ├── tailwind.config.ts      # Tailwind theme: tokens, gradients, fonts, animations
  └── ...                     # Other config and lock files
```

> Backend-handoff temporary files (`scripts/`, `i18n.scan.json`, `reports/i18n/`, `docs/i18n-*.md`) are kept in the repo only until backend integration of i18n statistics/scan/auto-translate is complete. They are owned by the backend long-term and will be removed once integration lands. Treat them as read-only handoff copies — do not extend them.

## Directory Responsibilities

- **public/**: Static files served directly. LabaFlow adds `manifest.webmanifest`, `sw.js` and `offline.html` for the installable mobile experience.
- **public/locales/**: Translation files, one per language (`{code}.json`). LabaFlow's UI copy is written in plain English in the components; the i18n baseline is left untouched.
- **i18n.config.json**: The lightweight i18n manifest for fallback language, language labels, browser detection aliases, and document direction. Single source of truth for the language list.
- **supabase/functions/**: One backend function per directory, one responsibility each. `seed-demo`, `create-staff-account`, `dispatch-push` and `rfid-scan`. `supabase/config.toml` records per-function JWT verification (`rfid-scan` is called by hardware, so it verifies a device key instead).
- **mobile/**: The Flutter customer app. It uses the same tables, policies and validated functions as the web app. Never give the mobile app a second backend or a second set of business rules.
- **src/components/**: All UI components.
  - **ui/**: Atomic and composite design-system components.
  - Domain folders (`orders/`, `inventory/`, `chat/`, …) hold components shared by more than one page.
- **src/lib/api/**: The only place that talks to the backend from the browser. One module per domain; each function either returns data or throws an `Error` whose message is safe to show. Components never build their own queries or call `supabase` directly.
- **src/hooks/**: One hook per file, one responsibility. `use-auth` reads the auth context; `use-chat` and `use-notifications` own their Realtime subscriptions.
- **src/providers/**: `auth-context.ts` declares the context and its value type; `auth-provider.tsx` is the component that restores the session and loads the profile.
- **src/pages/**: Route-level pages, one subdirectory each, grouped by area (public, customer, staff/admin).
- **src/App.tsx**: Global providers and the production-only service worker registration.
- **src/router.tsx**: Route table. Each area (`/app`, `/manage`) is a layout route; signed-in pages are lazy-loaded to keep the public landing page light.
- **src/index.css** and **tailwind.config.ts**: The Oceanic Breeze design system. Change tokens here rather than styling components ad hoc.

**Important:**
Whenever a new module (such as a component, hook, or utility) or a new page is added or removed, this document **must be updated immediately** to reflect the changes. Keeping this documentation up to date ensures that all collaborators have a clear understanding of the project structure and its intended organization.

## How to Add New Code

### 1. Adding a New Page

- **Create a subdirectory under the right area of `src/pages/`** (for example `src/pages/manage/inventory/`).
- **Place the main page component as `index.tsx` inside the subdirectory.**
- **Register the route in `src/router.tsx`** under the matching area route, give it a semantic `name`, and lazy-load it with `lazy(() => import(...))` wrapped in the shared `withFallback` helper.
- **Restrict it by role**: customer pages live under `/app`; the counter and shop-operation pages live under `/manage` and are available to both roles. Wrap only the genuinely owner-level pages (sales reports, staff and roles) in `<AdminOnly>`. The split follows the shop: the seller runs the shop, the owner monitors stock and sales. Row level security enforces the same split, so a page guard is never the security boundary.

### 2. Adding a New Component

- **Group related components into a domain folder under `src/components/`.**
- **If the component is used by one page only, keep it in that page's subdirectory.**
- **One responsibility per component; small files are encouraged.**
- **Never hardcode colours.** Use the semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`, `text-primary`, `bg-success/10`, …) so light and dark mode both work.
- **Use `lucide-react` icons, never emoji.**

### 3. Adding a New Hook

- **One file, one hook, named after the hook** (for example `use-orders.ts`).
- **Realtime subscriptions must be cleaned up** in the effect's return.

### 4. Adding Backend Access

- **Add the call to the matching module in `src/lib/api/`**, not to a component.
- **Reads/writes that change money, stock or status must go through a database function or a backend function**, never a bare client insert.
- **Never trust the client for permissions.** Roles, ownership and totals are decided by row level security and backend functions.
- **Never let a component compute a price.** Use `src/lib/pricing.ts`, which mirrors the database's `service_line_total`. If a price rule changes, change both and re-check that they agree.

### 5. Adding a Database Change

- **Apply it with a migration**; enable row level security in the same migration that creates a table, and add policies that actually scope the rows.
- **Then confirm it applied**: check the table's schema and listed policies, because a table without RLS is readable by everyone and nothing in the build will warn you.
- **Business rates belong to the shop.** Seed new prices, stock levels or consumption rules as clearly-marked placeholders, or leave them for the owner to enter.

### 6. Adding or Updating Languages

- **Language metadata must go through `i18n.config.json`.**
- **Do not hardcode supported languages, labels, browser detection aliases, or RTL direction lists in `src/i18n/*.ts`.**
- **Locale content lives in `public/locales/{code}.json`** as flat dotted-key JSON; the `fallbackLng` file owns the canonical key set.
- **Runtime code reads the manifest only through `src/i18n/util.ts`.** Adding or removing a language means editing `i18n.config.json` plus the matching `public/locales/{code}.json`; nothing in `src/i18n/` needs to change.
- **Translations are read with the official `useTranslation()` from `react-i18next`.** No custom hook, no cast at call sites.

## Coding Best Practices

- **One module, one responsibility.**
- **High cohesion, low coupling.**
- **Naming conventions:**
  - `PascalCase` for components and page directories, `kebab-case` for files and hooks.
  - Name page subdirectories after their route or feature.
- **Feedback:** confirm irreversible actions (cancelling an order, deactivating an account or a service, deleting an FAQ entry) with a SweetAlert2 confirmation. Routine navigation and routine saves do not need a dialog.
- **State:** loading, empty and error branches are rendered through `QueryState`/`LoadingState`/`EmptyState` so every screen behaves the same way.
- **Honesty in the UI:** never present an unverified external integration as working. If background push is not configured, or no RFID reader has checked in, the screen must say so.
- **Documentation:** document the purpose of a module at the top of the file when it is not obvious.
