-- Phase 2: Razorpay support, platform admin role, DB-backed config.
-- Depends on: 20260512_billing.sql, profiles, projects, update_updated_at.

-- ============================================================================
-- 1. Platform admin role
-- ============================================================================
alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

create index if not exists idx_profiles_is_platform_admin
  on public.profiles (is_platform_admin)
  where is_platform_admin = true;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- Allow platform admins to read/write any profile (for the admin users page).
drop policy if exists "Platform admins can view all profiles" on public.profiles;
create policy "Platform admins can view all profiles"
  on public.profiles for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can update any profile" on public.profiles;
create policy "Platform admins can update any profile"
  on public.profiles for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ============================================================================
-- 2. Multi-provider on subscription_plans
-- ============================================================================
-- Keep existing flat stripe_price_id_* columns for one release as fallback.
-- New canonical home: provider_ids JSONB:
--   {
--     "stripe":   { "monthly_inr": "price_...", "yearly_inr": "...", "monthly_usd": "...", "yearly_usd": "..." },
--     "razorpay": { "monthly_inr": "plan_...",  "yearly_inr": "plan_..." }
--   }
alter table public.subscription_plans
  add column if not exists provider_ids jsonb not null default '{}'::jsonb;

-- Backfill provider_ids.stripe from existing flat columns (idempotent).
update public.subscription_plans p
set provider_ids = jsonb_set(
  coalesce(provider_ids, '{}'::jsonb),
  '{stripe}',
  jsonb_strip_nulls(jsonb_build_object(
    'monthly_inr', p.stripe_price_id_monthly_inr,
    'yearly_inr',  p.stripe_price_id_yearly_inr,
    'monthly_usd', p.stripe_price_id_monthly_usd,
    'yearly_usd',  p.stripe_price_id_yearly_usd
  ))
)
where p.stripe_price_id_monthly_inr is not null
   or p.stripe_price_id_yearly_inr  is not null
   or p.stripe_price_id_monthly_usd is not null
   or p.stripe_price_id_yearly_usd  is not null;

-- Platform admin can edit plans.
drop policy if exists "Platform admins can write plans" on public.subscription_plans;
create policy "Platform admins can write plans"
  on public.subscription_plans for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ============================================================================
-- 3. Provider columns on project_subscriptions
-- ============================================================================
alter table public.project_subscriptions
  add column if not exists provider text check (provider in ('stripe', 'razorpay')),
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text,
  add column if not exists razorpay_plan_id text,
  add column if not exists preferred_provider text check (preferred_provider in ('stripe', 'razorpay', 'auto')) default 'auto';

create index if not exists idx_project_subscriptions_razorpay_subscription
  on public.project_subscriptions (razorpay_subscription_id);
create index if not exists idx_project_subscriptions_razorpay_customer
  on public.project_subscriptions (razorpay_customer_id);

-- Backfill provider for existing Stripe rows.
update public.project_subscriptions
set provider = 'stripe'
where stripe_subscription_id is not null and provider is null;

-- ============================================================================
-- 4. platform_settings (key/value store for trial, defaults, feature flags)
-- ============================================================================
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

alter table public.platform_settings enable row level security;

drop policy if exists "Settings readable by anyone authenticated" on public.platform_settings;
create policy "Settings readable by anyone authenticated"
  on public.platform_settings for select
  using (auth.role() = 'authenticated');

drop policy if exists "Platform admins can write settings" on public.platform_settings;
create policy "Platform admins can write settings"
  on public.platform_settings for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop trigger if exists platform_settings_updated_at on public.platform_settings;
create trigger platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.update_updated_at();

-- Seed
insert into public.platform_settings (key, value, description) values
  ('trial_days',                to_jsonb(7),         'Length of free trial in days'),
  ('trial_credits',             to_jsonb(200),       'Credits granted on trial start'),
  ('default_currency',          to_jsonb('inr'::text), 'Fallback currency when project does not specify'),
  ('preferred_provider_inr',    to_jsonb('razorpay'::text), 'Provider for INR currency'),
  ('preferred_provider_usd',    to_jsonb('stripe'::text),   'Provider for USD currency'),
  ('feature_billing_enabled',   to_jsonb(true),      'Billing kill switch'),
  ('feature_email_enabled',     to_jsonb(true),      'Email channel enabled'),
  ('feature_sms_enabled',       to_jsonb(true),      'SMS channel enabled'),
  ('refund_policy',             to_jsonb('none'::text), 'none | prorated | manual'),
  ('annual_discount_pct',       to_jsonb(20),        'Default annual discount percentage'),
  ('gst_pct',                   to_jsonb(18),        'India GST percentage (display only; Razorpay collects)'),
  ('platform_name',             to_jsonb('SpeedIQ'::text), 'Display name in invoices and emails')
on conflict (key) do nothing;

-- ============================================================================
-- 5. credit_weights (per channel + message_type)
-- ============================================================================
create table if not exists public.credit_weights (
  id bigserial primary key,
  channel text not null check (channel in ('email','whatsapp','sms','ai')),
  message_type text not null,
  credits int not null check (credits > 0),
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users,
  unique (channel, message_type)
);

alter table public.credit_weights enable row level security;

drop policy if exists "Credit weights readable by anyone authenticated" on public.credit_weights;
create policy "Credit weights readable by anyone authenticated"
  on public.credit_weights for select
  using (auth.role() = 'authenticated');

drop policy if exists "Platform admins can write credit weights" on public.credit_weights;
create policy "Platform admins can write credit weights"
  on public.credit_weights for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop trigger if exists credit_weights_updated_at on public.credit_weights;
create trigger credit_weights_updated_at
  before update on public.credit_weights
  for each row execute function public.update_updated_at();

-- Seed from current lib/billing/config.ts CREDIT_WEIGHTS.
insert into public.credit_weights (channel, message_type, credits, description) values
  ('email',    'campaign',                  1,  'Email send (campaign or transactional)'),
  ('email',    'transactional',             1,  'Email send (transactional API)'),
  ('whatsapp', 'session',                   2,  'WhatsApp session message (within 24h window)'),
  ('whatsapp', 'template_utility',          3,  'WhatsApp utility template'),
  ('whatsapp', 'template_authentication',   3,  'WhatsApp authentication template'),
  ('whatsapp', 'template_service',          3,  'WhatsApp service template'),
  ('whatsapp', 'template_marketing',        5,  'WhatsApp marketing template'),
  ('sms',      'domestic',                  5,  'SMS to domestic (India) number'),
  ('sms',      'international',             15, 'SMS to international number'),
  ('sms',      'mms',                       8,  'MMS / media SMS'),
  ('ai',       'generation',                10, 'AI generation request')
on conflict (channel, message_type) do nothing;

-- ============================================================================
-- 6. credit_packs (promoted to first-class table)
-- ============================================================================
create table if not exists public.credit_packs (
  id text primary key,
  name text not null,
  credits int not null check (credits > 0),
  price_inr int,
  price_usd int,
  provider_ids jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_packs enable row level security;

drop policy if exists "Credit packs readable by anyone authenticated" on public.credit_packs;
create policy "Credit packs readable by anyone authenticated"
  on public.credit_packs for select
  using (auth.role() = 'authenticated');

drop policy if exists "Platform admins can write credit packs" on public.credit_packs;
create policy "Platform admins can write credit packs"
  on public.credit_packs for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop trigger if exists credit_packs_updated_at on public.credit_packs;
create trigger credit_packs_updated_at
  before update on public.credit_packs
  for each row execute function public.update_updated_at();

-- Seed from current lib/billing/config.ts CREDIT_PACKS.
insert into public.credit_packs (id, name, credits, price_inr, price_usd, sort_order) values
  ('credits_5k',   'Starter pack',     5000,   499,   6,   1),
  ('credits_25k',  'Growth pack',      25000,  1999,  24,  2),
  ('credits_100k', 'Scale pack',       100000, 6999,  84,  3),
  ('credits_500k', 'Enterprise pack',  500000, 29999, 359, 4)
on conflict (id) do nothing;

-- ============================================================================
-- 7. admin_audit_log
-- ============================================================================
create table if not exists public.admin_audit_log (
  id bigserial primary key,
  actor_id uuid not null references auth.users,
  action text not null,                  -- e.g. 'plan.update', 'credit_weight.update', 'user.promote'
  target_type text not null,             -- 'plan' | 'credit_pack' | 'credit_weight' | 'platform_setting' | 'user' | 'subscription'
  target_id text,
  before jsonb,
  after jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_actor_created
  on public.admin_audit_log (actor_id, created_at desc);
create index if not exists idx_admin_audit_log_target
  on public.admin_audit_log (target_type, target_id, created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Audit log readable by platform admins" on public.admin_audit_log;
create policy "Audit log readable by platform admins"
  on public.admin_audit_log for select
  using (public.is_platform_admin());

-- No insert policy: all writes go via service_role from admin API routes.

-- ============================================================================
-- 8. Convenience: ensure existing plan rows have provider_ids structured
-- ============================================================================
-- Make sure stripe sub-object exists even when empty, so frontend can patch into it.
update public.subscription_plans
set provider_ids = jsonb_set(provider_ids, '{stripe}', '{}'::jsonb, true)
where not (provider_ids ? 'stripe');

update public.subscription_plans
set provider_ids = jsonb_set(provider_ids, '{razorpay}', '{}'::jsonb, true)
where not (provider_ids ? 'razorpay');
