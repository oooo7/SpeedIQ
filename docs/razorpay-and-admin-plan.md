# Razorpay + Platform Admin (Phase 2)

> Status: **Decisions locked — see §0.** Builds on top of the Stripe-only Phase 1 (see [billing-and-subscription-plan.md](billing-and-subscription-plan.md)).

## 0. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Provider routing | **Currency-based.** INR → Razorpay, USD → Stripe. Plus admin override (platform-wide) + project-level override (escape hatch). |
| 2 | Razorpay trial | **Delayed start + auth-and-hold.** Subscription `start_at = now + 7d`. Small auth payment (≈₹1) on day 0 to validate card; refunded immediately. |
| 3 | Config storage | **DB-backed.** `platform_settings`, `credit_weights`, `credit_packs` tables. Admin UI edits live. Feature flags move from env to DB. Provider API keys stay in env. |
| 4 | Platform admin storage | **`profiles.is_platform_admin` boolean.** Simplest; audit log captures who-changed-what without needing a separate table. |
| 5 | First-admin bootstrap | **`PLATFORM_ADMIN_EMAILS` env var.** Comma-separated. Auto-promote matching emails on first sign-in. |
| 6 | Admin UI shape | **Multiple `/admin/*` pages.** One concern per page. |
| 7 | Admin audit log | **Yes.** Append-only `admin_audit_log` table on every write to plans/packs/weights/settings. |
| 8 | Project-level provider override | **Yes.** Owner can override the currency-default in project Billing settings. Defaults to "auto". |
| 9 | Stripe price-ID columns | **Migrate to `provider_ids` JSONB.** Keep flat columns for one release as fallback; drop in a follow-up migration. |
| 10 | GST handling | **Configured in admin settings (display only).** Actual collection handled by Razorpay merchant account config (out of app's hands). |

This phase adds three things, designed to ship together:

1. **Razorpay** as a second payment provider, alongside Stripe.
2. A **platform admin** role and a dedicated admin area that controls *everything billing-related from the UI*: plans, credit costs, packs, payment routing, feature flags, etc.
3. Migration of currently-static config (plan limits, credit weights, feature flags) **out of code and into DB**, so the admin UI can edit them live.

---

## 1. Recommended payment-provider strategy

| Approach | What it means | Verdict |
|---|---|---|
| **Currency-based (recommended)** | INR → Razorpay (UPI/NetBanking/Cards), USD → Stripe (Cards). User picks currency at checkout, provider is decided automatically. | ✅ Cleanest UX; matches each region's preferred rails. |
| Region-based (IP geo) | Vercel `x-vercel-ip-country` header. India → Razorpay, else → Stripe. | OK but breaks for travelling users / VPN; adds a hidden decision. |
| User explicitly picks provider | Two buttons "Pay with Stripe" / "Pay with Razorpay" | Maximum control, but most checkouts only need one. |
| Admin-configurable per project | Project owner sees a "Preferred provider" toggle in Billing. | Useful as an override on top of currency-based; not standalone. |

**Proposal:** currency-based default, with an **admin-level override** in the admin page (e.g. "Force all Indian projects to Razorpay") and a **project-level override** (escape hatch).

---

## 2. Razorpay primer (what differs from Stripe)

| Concept | Stripe | Razorpay |
|---|---|---|
| Subscription product/price | `Product` + `Price` | `Plan` (one entity, includes amount + interval) |
| Subscription | `Subscription` | `Subscription` (created server-side, then redirected to checkout) |
| Customer | `Customer` | `Customer` (optional but recommended) |
| One-time payment | `Checkout.Session` mode=payment | `Order` + Razorpay Checkout JS (client-side handler) |
| Self-serve portal | Hosted Billing Portal | **No equivalent.** We have to build cancel/upgrade flows in-app. |
| Tax | Stripe Tax (automatic) | Manual GST handling — merchant is responsible. |
| Webhook events | `customer.subscription.*`, `invoice.*` | `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.halted`, `payment.captured`, etc. |
| Trial | `trial_period_days` on subscription | `start_at` (delayed start) — no native "card-required trial"; we simulate with auth-and-charge. |
| Refunds | Stripe Refunds API | Razorpay Refunds API |

**Trial handling difference is the biggest gotcha.** Razorpay charges immediately when the user authorises. To match Stripe's 7-day trial:
- Option A: Create the subscription with `start_at = now + 7d` and skip immediate charge. Authentication still happens upfront (auth-and-hold pattern with a ₹1 auth payment, then refund or void).
- Option B: Do free for 7 days (no card capture); on day 8 prompt user to add a payment method. Lower conversion but simpler.
- Option C: Charge immediately for month 1, mark first 7 days as "trial period in DB" — if user cancels in 7 days we refund. Easiest to implement; aligns with refund policy = "no refunds" risk though, so we'd need a special exception.

→ Pick one in §9.

---

## 3. Multi-provider schema changes

Migrate `subscription_plans` to a provider-agnostic shape:

```sql
alter table public.subscription_plans
  add column if not exists provider_ids jsonb not null default '{}'::jsonb;

-- shape: { "stripe": { "monthly_inr": "price_xxx", "yearly_inr": "...", "monthly_usd": "...", "yearly_usd": "..." },
--         "razorpay": { "monthly_inr": "plan_xxx", "yearly_inr": "plan_yyy" } }
```

This replaces the four flat `stripe_price_id_*` columns. (We can drop them in a follow-up migration once the admin UI is wired up.)

`project_subscriptions` gains a provider column and parallel Razorpay IDs:

```sql
alter table public.project_subscriptions
  add column if not exists provider text check (provider in ('stripe', 'razorpay')),
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text,
  add column if not exists razorpay_plan_id text;

create index if not exists idx_project_subscriptions_razorpay_subscription
  on public.project_subscriptions (razorpay_subscription_id);
```

Same for credit packs — extend `provider_ids` JSONB on a new `credit_packs` table (currently hardcoded in `lib/billing/config.ts`).

---

## 4. Move static config → DB (so admin UI can edit it)

Today, three groups of values live in code:

| What | Where now | Move to |
|---|---|---|
| Plan limits (credits, contacts, seats, prices) | `lib/billing/config.ts` PLANS + DB seed | DB-only (already in `subscription_plans`); admin UI edits |
| Credit weights (email=1, WA marketing=5, etc.) | `lib/billing/config.ts` CREDIT_WEIGHTS | New table `credit_weights` |
| Credit packs | `lib/billing/config.ts` CREDIT_PACKS | New table `credit_packs` (already partially modeled; promote to first-class) |
| Trial days/credits | `lib/billing/config.ts` TRIAL_DAYS, TRIAL_CREDITS | New table `platform_settings` (key-value) |
| Feature flags (BILLING/EMAIL/SMS) | env vars in `lib/features.ts` | **OPEN — see §9.** Either keep env (simple, redeploy needed) or move to `platform_settings` (live toggle). |
| Provider API keys (Stripe / Razorpay secrets) | env | **Stay in env** — they're secrets, not config |

Suggested new tables:

```sql
-- platform_settings: key/value, all in JSONB so admin UI can store anything
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

-- Seeded keys:
--   'trial_days' = 7
--   'trial_credits' = 200
--   'default_currency' = 'inr'
--   'preferred_provider_inr' = 'razorpay'
--   'preferred_provider_usd' = 'stripe'
--   'features.billing'  = true     -- only if we move flags to DB
--   'features.email'    = true
--   'features.sms'      = true
--   'refund_policy'     = 'none'

-- credit_weights: per channel + message_type
create table public.credit_weights (
  id bigserial primary key,
  channel text not null check (channel in ('email','whatsapp','sms','ai')),
  message_type text not null,
  credits int not null check (credits > 0),
  description text,
  updated_at timestamptz not null default now(),
  unique (channel, message_type)
);
-- Seeded with current static values from lib/billing/config.ts.

-- credit_packs: editable top-up packs
create table public.credit_packs (
  id text primary key,
  name text not null,
  credits int not null check (credits > 0),
  price_inr int,
  price_usd int,
  provider_ids jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
```

Runtime code (`lib/billing/cost.ts`, etc.) loads these from DB instead of constants. Add a small **5-min in-memory cache** to avoid hitting DB on every send.

---

## 5. Platform admin role

The existing role system is project-scoped (`project_members.role` ∈ owner/admin/editor/viewer). `platform_admin` is **not** project-scoped — it's an account-wide super-power.

**Two options, recommend (a):**

**(a) Boolean flag on `profiles`** — simplest:
```sql
alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;
```
- Pros: one SQL update to grant.
- Cons: only a single bit. Can't track granted_by / granted_at / scope.

**(b) Dedicated table** — auditable:
```sql
create table public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  granted_by uuid references auth.users,
  granted_at timestamptz not null default now(),
  notes text
);
```
- Pros: knows who granted, when, why.
- Cons: extra joins.

**Bootstrap**: the very first platform admin can't be granted via the admin UI (chicken/egg). Either:
- A `scripts/grant-platform-admin.ts` CLI (the one currently failing your build — separate fix), or
- An env-bootstrap: `PLATFORM_ADMIN_EMAILS=foo@x.com,bar@y.com` checked at login time, auto-promoted on first sign-in.

→ Pick in §9.

---

## 6. RLS for admin tables

All admin tables should be readable only to platform admins. Helper function:

```sql
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select is_platform_admin from public.profiles where id = auth.uid()
  ), false);
$$;

-- Then on every admin table:
create policy "platform admin read" on public.platform_settings
  for select using (public.is_platform_admin());
create policy "platform admin write" on public.platform_settings
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
```

`subscription_plans` and `credit_packs` keep public read (so the checkout page can list them) but writes only via `is_platform_admin()`.

---

## 7. Admin UI

**New routes** under `/admin/*`. Gated by middleware: redirect non-platform-admins to `/dashboard`.

Suggested IA:

```
/admin                     overview dashboard (MRR, signups, total credits issued/spent, active subs by plan)
/admin/plans               CRUD plans (limits, prices, credits, channels included, features JSON, provider IDs)
/admin/credit-packs        CRUD credit top-up packs (credits, INR/USD, provider IDs)
/admin/credit-weights      Edit per channel/message_type (email=1, WA marketing=5, SMS dom=5, SMS intl=15, ...)
/admin/settings            Trial days, default currency, region/provider rules, refund policy, feature flags (if moved to DB)
/admin/projects            All projects with subscription + balance; filter by plan/status; impersonate (with audit log)
/admin/users               All users; toggle platform_admin; audit log of role grants
/admin/audit               Append-only log of every admin-write
```

Each page is a server-rendered list + an edit form. No exotic UI — same shadcn `Card`/`Input`/`Switch`/`Button` set already used.

**Sidebar:** Add a separate "Admin" group only rendered when `is_platform_admin()` is true. Different visual treatment so it doesn't get confused with project nav.

**Safety rails:** Any write to plans/packs/weights creates an `admin_audit_log` row with `actor_id`, `action`, `before`, `after`. Lets you undo accidents.

---

## 8. Razorpay implementation specifics

**New deps:**
```bash
pnpm add razorpay
pnpm add -D @types/razorpay  # if available, else write our own minimal types
```

**Files to add (mirror `lib/billing/*`):**
```
lib/billing/providers/types.ts          -- shared PaymentProvider interface
lib/billing/providers/stripe-provider.ts -- refactor existing stripe.ts/checkout.ts/etc.
lib/billing/providers/razorpay-provider.ts -- new
lib/billing/providers/router.ts          -- getProviderFor(currency, project) → provider instance
app/api/webhooks/razorpay/route.ts       -- new webhook handler
```

**`PaymentProvider` interface (rough):**
```ts
interface PaymentProvider {
  id: 'stripe' | 'razorpay';
  createSubscriptionCheckout(args): Promise<{ url: string; sessionId: string }>;
  createTopUpCheckout(args): Promise<{ url: string; sessionId: string }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  verifyWebhook(rawBody: string, signature: string): WebhookEvent;
}
```

The existing `app/api/projects/[id]/billing/checkout/route.ts` becomes provider-agnostic — it calls `getProviderFor(currency)` and delegates.

**Razorpay subscription flow:**
1. Server: `razorpay.subscriptions.create({ plan_id, total_count, customer_notify, start_at })` → returns `subscription_id`.
2. Server returns `subscription_id` to client.
3. Client opens Razorpay Checkout JS with that `subscription_id` and `key_id`.
4. User pays; Razorpay calls our webhook with `subscription.activated`, then later `subscription.charged` on each cycle.
5. We update `project_subscriptions` rows the same way Stripe webhook does today.

**Razorpay one-time (credit packs):**
1. Server: `razorpay.orders.create({ amount, currency: 'INR', notes: { project_id, pack_id } })` → returns `order_id`.
2. Client opens Razorpay Checkout; on success, fires `handler(response)` with `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`.
3. Client POSTs that triplet to our `/api/projects/[id]/billing/verify-razorpay-payment` route. We verify the signature server-side, then grant credits.
4. Webhook (`payment.captured`) is the second line of defence for missed client confirmations.

**Self-serve cancel/upgrade (since no Razorpay portal):**
- "Cancel subscription" button → POST to our cancel route → `razorpay.subscriptions.cancel(id, { cancel_at_cycle_end: 1 })`
- "Change plan" → cancel current + create new with `start_at = next billing date`. Or use Razorpay's update API (limited).
- Show current plan, next billing date, and cancel-at-period-end status in the existing Billing UI.

---

## 9. Open product/architecture questions

1. **Provider routing** — go with currency-based (INR→Razorpay, USD→Stripe)?
2. **Razorpay trial** — Option A (auth-and-hold + delayed start), B (no card upfront), or C (charge immediately, refund window)?
3. **Feature flags location** — keep in env (simple, redeploy required) OR move to DB `platform_settings` (live toggle in admin UI)?
4. **Platform admin storage** — `profiles.is_platform_admin` boolean (recommended) or `platform_admins` table with audit?
5. **First-admin bootstrap** — CLI script, env var (`PLATFORM_ADMIN_EMAILS=...`), or direct SQL?
6. **Admin shape** — multiple `/admin/*` pages (recommended) or one big tabbed page?
7. **Admin audit log** — yes/no? Adds work but valuable for accountability.
8. **Project-level provider override** — let project owners pick Stripe vs Razorpay manually, or always use currency-based?
9. **Existing Stripe-only data** — keep `stripe_price_id_*` columns on plans table or migrate to `provider_ids` JSONB only?
10. **GST on Razorpay** — handle in admin settings, or punt to Razorpay merchant account config?

---

## 10. Suggested phasing

| Phase | Scope | Effort |
|---|---|---|
| **2a** | Schema for multi-provider, `platform_admins`, `credit_weights`, `credit_packs`, `platform_settings` tables. Migrate static config to DB. | ~half day |
| **2b** | Refactor `lib/billing/*` behind `PaymentProvider` interface. Stripe still works exactly as today; just gets pluggable. | ~half day |
| **2c** | Razorpay provider implementation + webhook + verify-payment route. | ~1 day |
| **2d** | Provider router (currency-based) + project-level override + admin override. | ~half day |
| **2e** | Platform admin role, RLS, gated layout, bootstrap script. | ~half day |
| **2f** | Admin UI pages (Plans, Packs, Weights, Settings, Projects, Users). One at a time, ship as ready. | ~2 days |
| **2g** | Audit log + impersonation safety + production checks. | ~half day |

Total: **~5–6 days** of focused work.

---

## 11. Quick implementation order I'd take (after §9 is locked)

1. Migration: new tables + alter existing.
2. Seed `credit_weights`, `credit_packs`, `platform_settings` from current code constants.
3. Refactor `lib/billing/cost.ts` and `lib/billing/config.ts` to read from DB (with in-memory cache).
4. Add `PaymentProvider` interface; move existing Stripe code behind it.
5. Add Razorpay provider + webhook (test mode).
6. Add provider router with currency-based default.
7. Add `is_platform_admin()` SQL function + RLS policies.
8. Bootstrap admin script / env.
9. Admin UI scaffolding (`/admin` shell + sidebar group).
10. Admin pages, one at a time: Plans → Packs → Weights → Settings → Users → Projects → Audit.
