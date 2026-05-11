# SpeedIQ Billing & Subscription Plan (Phase 1)

> Status: **Decisions locked** — see §0. Numbers are starting points based on Wati / AiSensy / Interakt / TeleCRM benchmarks; tune before launch.

## 0. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Currency | **USD + INR**, both supported (Stripe multi-currency on each price) |
| 2 | Free tier | **Removed.** Replaced by **7-day Pro trial** on signup |
| 3 | Trial card requirement | **Card required** at signup; auto-converts on day 8 |
| 4 | WhatsApp session message credits | **Charged** (2 credits) — same as drafted |
| 5 | BYO-carrier discount | **No** — same credit price for all users |
| 6 | Tax | **Stripe Tax** (auto) |
| 7 | Annual discount | **20% off** monthly price × 12 |
| 8 | Refund policy | **No refunds.** All charges final; access retained until period end on cancel |

---

## 1. Pricing model in one line

**Monthly subscription** (gates features, contacts, seats, channels) **+ a credit wallet** (consumed per message sent, weighted by channel & message type). Stripe is the merchant.

## 2. Why this model

- WhatsApp & SMS are BYO-carrier today — users already pay Meta / Twilio for the network cost. SpeedIQ credits represent the **platform service fee** (sending engine, retries, inbox, analytics, automations).
- Email runs on the platform's Resend account by default, so credits there cover *both* platform service and real carrier cost.
- Plan fee secures predictable monthly revenue; credits add usage-based upside and a self-serve top-up loop.

## 3. Plan tiers

All new signups get a **7-day Pro trial** (card required). On day 8 the subscription auto-starts on the plan the user picked at checkout; if they did not pick, it falls back to Starter.

Monthly prices below. **Annual = 20% off** (monthly × 12 × 0.8). Stripe holds separate price IDs per currency.

| Lever | **Starter** | **Pro** | **Business** |
|---|---|---|---|
| **Monthly** | ₹999 / $12 | ₹2,499 / $29 | ₹6,999 / $79 |
| **Annual (20% off)** | ₹9,590 / $115 | ₹23,990 / $278 | ₹67,190 / $759 |
| **Included credits / mo** | 5,000 | 15,000 | 50,000 |
| **Contacts (total)** | 5,000 | 25,000 | 100,000 |
| **Team seats** | 3 | 10 | Unlimited |
| **Channels** | Email + WhatsApp, custom email domain | + SMS, all channels | All + AI assist (when shipped) |
| **Campaigns / month** | 50 | Unlimited | Unlimited |
| **Live inbox (WA/SMS)** | ✓ | ✓ | ✓ |
| **Automations & segments** | Basic | Full | Full + branching |
| **API + webhooks** | — | ✓ | ✓ |
| **Analytics retention** | 30 days | 90 days | 1 year |
| **Custom branding (emails)** | — | ✓ | ✓ |
| **Support** | Email | Priority email | Dedicated CSM, SLA |
| **Custom roles / audit log** | — | — | ✓ |

### 3.1 Trial mechanic
- Day 0: user signs up, enters card → Stripe creates subscription with `trial_end = now + 7d` on the chosen plan (defaults to Pro features).
- During trial: full Pro feature access, **200 trial credits** granted (separate from plan grants).
- Day 7 reminder email sent.
- Day 8: Stripe auto-charges the chosen plan; remaining trial credits forfeit; first month's plan credits grant fires.
- Cancel during trial → no charge, project downgraded to read-only (existing data preserved 90 days).

## 4. Credit weights (per outbound message)

Base unit: **1 credit ≈ ₹0.10** at retail (₹100 = 1,000 credits). Adjustable per region.

| Action | Credits | Rationale |
|---|---|---|
| Email send (campaign or transactional) | **1** | Cheapest channel; you pay Resend ≈ $0.40/1k. ₹0.10 keeps healthy margin. |
| WhatsApp — session message (inside 24h window) | **2** | Free to Meta but still a billable platform action. |
| WhatsApp — template: Utility / Authentication | **3** | Meta charges ~₹0.15–0.30 (IN). |
| WhatsApp — template: Marketing | **5** | Meta charges ~₹0.78 (IN) — highest tier. |
| WhatsApp — template: Service | **3** | Same as utility post-2024 pricing. |
| SMS — domestic (IN, transactional) | **5** | Twilio ~₹0.25/msg + DLT fees. |
| SMS — domestic (IN, promotional) | **6** | Higher DLT cost. |
| SMS — international | **15** | Wide variance; bias high. |
| MMS / media SMS | **8** | When supported. |
| AI assist generation (future) | **10** per request | When AI features ship. |

**Failed sends** (rejected by provider before submission) → **no credit charged**.
**Failed deliveries after submission** (provider accepted, recipient failed) → **credit charged** (carrier behavior, not refundable).

## 5. Credit top-up packs (one-time, on top of plan)

| Pack | Credits | INR price | USD price | Effective rate (INR) | Discount |
|---|---|---|---|---|---|
| Starter pack | 5,000 | ₹499 | $6 | ₹0.10/credit | — |
| Growth pack | 25,000 | ₹1,999 | $24 | ₹0.08/credit | 20% off |
| Scale pack | 100,000 | ₹6,999 | $84 | ₹0.07/credit | 30% off |
| Enterprise pack | 500,000 | ₹29,999 | $359 | ₹0.06/credit | 40% off |

- Credits never expire while subscription is active.
- On downgrade to Free or cancel → credits frozen for 90 days, then forfeited.
- Auto-recharge option: "When balance < X, buy Y pack" — drives retention.

## 6. Hard gates vs soft gates

| Limit | Behavior on breach |
|---|---|
| Contact count | **Soft** — warn at 80%, block new imports at 100%. Existing contacts keep working. |
| Team seats | **Hard** — block invite at limit. |
| Campaigns / month | **Hard** — block new campaign creation; show upgrade CTA. |
| Credits | **Hard** — campaign send pauses; user prompted to top up or upgrade. |
| Channel access | **Hard** — channel toggle disabled in UI. |
| Custom domain | **Hard** — feature hidden below Starter. |

## 7. Implementation phases

### Phase 1 — Core billing (2–3 weeks)
- Stripe integration: products, prices, checkout session, customer portal, webhooks.
- DB: `subscription_plans`, `project_subscriptions`, `credit_wallets`, `credit_ledger`, `usage_events`.
- Plan-gating middleware on campaign create, contact import, team invite, send routes.
- Credit deduction inside existing send batchers: [app/api/cron/whatsapp-send/route.ts](app/api/cron/whatsapp-send/route.ts), [app/api/cron/sms-send/](app/api/cron/sms-send/), [lib/email/process-campaign-batch.ts](lib/email/process-campaign-batch.ts).
- Wire up the Billing nav stub: [navigation/sidebar-items.ts:173](navigation/sidebar-items.ts#L173) → real page with current plan, usage bars, top-up, portal link.

### Phase 2 — Polish & retention (1–2 weeks)
- Usage dashboards per channel.
- Auto-recharge on low balance.
- Email/in-app notifications at 80% / 100% of any limit.
- Invoices, GST/tax handling (Stripe Tax or manual).
- Coupon / promo code support.

### Phase 3 — Optional uplift
- Platform-managed WhatsApp / Twilio plans (we own carrier, mark up per message) — for users who don't want their own.
- AI features (drafted into Business tier).
- Annual contract / enterprise quoting flow.

## 8. Schema sketch

```sql
-- Plans defined by admin (or hardcoded JSON to start)
create table subscription_plans (
  id text primary key,                     -- 'free', 'starter', 'pro', 'business'
  name text not null,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  monthly_credits int not null default 0,
  max_contacts int,                        -- null = unlimited
  max_seats int,
  max_campaigns_per_month int,
  channels jsonb not null,                 -- {email:true, whatsapp:true, sms:false}
  features jsonb not null,                 -- {api:false, custom_domain:true, ...}
  created_at timestamptz default now()
);

create table project_subscriptions (
  project_id uuid primary key references projects(id),
  plan_id text not null references subscription_plans(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null,                    -- active, past_due, canceled, trialing
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  trial_ends_at timestamptz,
  updated_at timestamptz default now()
);

create table credit_wallets (
  project_id uuid primary key references projects(id),
  balance int not null default 0,          -- whole credits, signed
  auto_recharge_enabled boolean default false,
  auto_recharge_threshold int,
  auto_recharge_pack text,                 -- stripe price id for top-up pack
  updated_at timestamptz default now()
);

create table credit_ledger (
  id bigserial primary key,
  project_id uuid not null references projects(id),
  delta int not null,                      -- +500 top-up, -5 sms send
  reason text not null,                    -- 'plan_grant','top_up','sms_send','wa_marketing','refund'
  ref_type text,                           -- 'campaign','message','stripe_invoice'
  ref_id text,
  balance_after int not null,
  created_at timestamptz default now() not null
);
create index on credit_ledger (project_id, created_at desc);

create table usage_events (
  id bigserial primary key,
  project_id uuid not null,
  channel text not null,                   -- 'email','whatsapp','sms'
  message_type text,                       -- 'marketing_template','utility_template','session','sms_dom','sms_intl'
  recipient_id uuid,
  campaign_id uuid,
  credits_charged int not null,
  provider_message_id text,
  status text,                             -- 'submitted','delivered','failed'
  created_at timestamptz default now() not null
);
create index on usage_events (project_id, created_at desc);
```

## 9. Product decisions

All resolved in §0 except refund policy, which remains open:

1. ~~Free tier~~ → **Removed**, replaced by 7-day Pro trial.
2. ~~WhatsApp session credits~~ → **Charged** (2 credits per session message).
3. ~~BYO carrier discount~~ → **No discount**; everyone pays the same credit price.
4. ~~Tax handling~~ → **Stripe Tax** (auto).
5. **Refund policy** → **No refunds.** All subscription charges and credit pack purchases are final once captured. On cancel, user retains access until period end; no pro-rata. Disputed charges handled case-by-case via Stripe disputes flow.
6. ~~Trial card requirement~~ → **Card required** at signup.
7. ~~Currency~~ → **USD + INR** with separate Stripe prices.
8. ~~Annual discount~~ → **20% off** annual vs 12× monthly.

## 10. Competitive context (for calibration)

| Tool | Entry plan | Notes |
|---|---|---|
| Wati | $39/mo (Growth) | Per-conversation pricing on top |
| AiSensy | ₹999/mo | Credit markup on WA marketing templates |
| Interakt | ₹1,799/mo | Plan + Meta cost passthrough |
| TeleCRM | ₹1,500/user/mo | Per-user model, not per-msg |
| Mailchimp | $20/mo | Per-contact tiering |

SpeedIQ should sit **at or slightly under AiSensy/Interakt** to win on price while bundling more channels.
