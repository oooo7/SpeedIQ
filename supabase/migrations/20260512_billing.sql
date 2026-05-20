-- Billing & subscriptions (Stripe-backed)
-- Depends on: projects, profiles, user_can_access_project, user_is_project_owner_or_admin, update_updated_at

-- ============================================================================
-- 1. subscription_plans (catalog)
-- ============================================================================
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  -- Stripe price IDs (filled in post-Stripe-setup; nullable so we can seed before)
  stripe_price_id_monthly_inr text,
  stripe_price_id_yearly_inr text,
  stripe_price_id_monthly_usd text,
  stripe_price_id_yearly_usd text,
  -- Quotas & grants
  monthly_credits int not null default 0,
  max_contacts int,
  max_seats int,
  max_campaigns_per_month int,
  channels jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  analytics_retention_days int,
  -- Display
  price_inr_monthly int,
  price_usd_monthly int,
  price_inr_yearly int,
  price_usd_yearly int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

drop policy if exists "Plans readable by anyone authenticated" on public.subscription_plans;
create policy "Plans readable by anyone authenticated"
  on public.subscription_plans for select
  using (auth.role() = 'authenticated');

drop trigger if exists subscription_plans_updated_at on public.subscription_plans;
create trigger subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.update_updated_at();

-- Seed initial plans
insert into public.subscription_plans (
  id, name, sort_order, monthly_credits, max_contacts, max_seats, max_campaigns_per_month,
  channels, features, analytics_retention_days,
  price_inr_monthly, price_usd_monthly, price_inr_yearly, price_usd_yearly
) values
  ('starter', 'Starter', 1, 5000, 5000, 3, 50,
    '{"email": true, "whatsapp": true, "sms": false}'::jsonb,
    '{"custom_email_domain": true, "live_inbox": true, "automations": "basic", "api": false, "custom_branding": false, "custom_roles": false}'::jsonb,
    30, 999, 12, 9590, 115),
  ('pro', 'Pro', 2, 15000, 25000, 10, null,
    '{"email": true, "whatsapp": true, "sms": true}'::jsonb,
    '{"custom_email_domain": true, "live_inbox": true, "automations": "full", "api": true, "custom_branding": true, "custom_roles": false}'::jsonb,
    90, 2499, 29, 23990, 278),
  ('business', 'Business', 3, 50000, 100000, null, null,
    '{"email": true, "whatsapp": true, "sms": true, "ai_assist": true}'::jsonb,
    '{"custom_email_domain": true, "live_inbox": true, "automations": "full_branching", "api": true, "custom_branding": true, "custom_roles": true, "audit_log": true, "sla": true}'::jsonb,
    365, 6999, 79, 67190, 759)
on conflict (id) do update set
  name = excluded.name,
  monthly_credits = excluded.monthly_credits,
  max_contacts = excluded.max_contacts,
  max_seats = excluded.max_seats,
  max_campaigns_per_month = excluded.max_campaigns_per_month,
  channels = excluded.channels,
  features = excluded.features,
  analytics_retention_days = excluded.analytics_retention_days,
  price_inr_monthly = excluded.price_inr_monthly,
  price_usd_monthly = excluded.price_usd_monthly,
  price_inr_yearly = excluded.price_inr_yearly,
  price_usd_yearly = excluded.price_usd_yearly,
  updated_at = now();

-- ============================================================================
-- 2. project_subscriptions (one row per project)
-- ============================================================================
create table if not exists public.project_subscriptions (
  project_id uuid primary key references public.projects (id) on delete cascade,
  plan_id text references public.subscription_plans (id),
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  currency text check (currency in ('inr', 'usd')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_ends_at timestamptz,
  last_credit_grant_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_subscriptions_status on public.project_subscriptions (status);
create index if not exists idx_project_subscriptions_stripe_customer on public.project_subscriptions (stripe_customer_id);
create index if not exists idx_project_subscriptions_stripe_subscription on public.project_subscriptions (stripe_subscription_id);

alter table public.project_subscriptions enable row level security;

drop policy if exists "Subscriptions visible to project members" on public.project_subscriptions;
create policy "Subscriptions visible to project members"
  on public.project_subscriptions for select
  using (public.user_can_access_project(project_id));

-- No client-side writes: all mutations happen via service-role from Stripe webhooks.

drop trigger if exists project_subscriptions_updated_at on public.project_subscriptions;
create trigger project_subscriptions_updated_at
  before update on public.project_subscriptions
  for each row execute function public.update_updated_at();

-- ============================================================================
-- 3. credit_wallets (one row per project)
-- ============================================================================
create table if not exists public.credit_wallets (
  project_id uuid primary key references public.projects (id) on delete cascade,
  balance int not null default 0,
  auto_recharge_enabled boolean not null default false,
  auto_recharge_threshold int,
  auto_recharge_pack_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_wallets_balance_non_negative check (balance >= 0)
);

alter table public.credit_wallets enable row level security;

drop policy if exists "Wallet visible to project members" on public.credit_wallets;
create policy "Wallet visible to project members"
  on public.credit_wallets for select
  using (public.user_can_access_project(project_id));

-- Owners/admins may toggle auto-recharge from the UI.
drop policy if exists "Owners/admins can update wallet preferences" on public.credit_wallets;
create policy "Owners/admins can update wallet preferences"
  on public.credit_wallets for update
  using (public.user_is_project_owner_or_admin(project_id));

drop trigger if exists credit_wallets_updated_at on public.credit_wallets;
create trigger credit_wallets_updated_at
  before update on public.credit_wallets
  for each row execute function public.update_updated_at();

-- ============================================================================
-- 4. credit_ledger (immutable history of every credit change)
-- ============================================================================
create table if not exists public.credit_ledger (
  id bigserial primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  delta int not null,
  reason text not null,
  ref_type text,
  ref_id text,
  balance_after int not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_ledger_project_created
  on public.credit_ledger (project_id, created_at desc);
create index if not exists idx_credit_ledger_reason on public.credit_ledger (reason);

alter table public.credit_ledger enable row level security;

drop policy if exists "Ledger visible to project members" on public.credit_ledger;
create policy "Ledger visible to project members"
  on public.credit_ledger for select
  using (public.user_can_access_project(project_id));

-- ============================================================================
-- 5. usage_events (every billable action, even credit-free ones)
-- ============================================================================
create table if not exists public.usage_events (
  id bigserial primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp', 'sms', 'ai')),
  message_type text,
  recipient_id uuid,
  campaign_id uuid,
  credits_charged int not null default 0,
  provider_message_id text,
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_project_created on public.usage_events (project_id, created_at desc);
create index if not exists idx_usage_events_channel on public.usage_events (project_id, channel, created_at desc);
create index if not exists idx_usage_events_campaign on public.usage_events (campaign_id);

alter table public.usage_events enable row level security;

drop policy if exists "Usage events visible to project members" on public.usage_events;
create policy "Usage events visible to project members"
  on public.usage_events for select
  using (public.user_can_access_project(project_id));

-- ============================================================================
-- 6. RPCs: atomic credit operations
-- ============================================================================

-- Deduct credits: returns new balance, or -1 if insufficient.
create or replace function public.deduct_credits(
  p_project_id uuid,
  p_amount int,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'deduct_credits: amount must be positive';
  end if;

  -- Ensure wallet row exists, then lock it.
  insert into public.credit_wallets (project_id, balance)
    values (p_project_id, 0)
    on conflict (project_id) do nothing;

  select balance into v_balance
    from public.credit_wallets
    where project_id = p_project_id
    for update;

  if v_balance < p_amount then
    return -1;
  end if;

  v_new_balance := v_balance - p_amount;

  update public.credit_wallets
    set balance = v_new_balance,
        updated_at = now()
    where project_id = p_project_id;

  insert into public.credit_ledger
    (project_id, delta, reason, ref_type, ref_id, balance_after, metadata)
    values (p_project_id, -p_amount, p_reason, p_ref_type, p_ref_id, v_new_balance, p_metadata);

  return v_new_balance;
end;
$$;

-- Grant credits (top-up, plan grant, trial, manual adjustment). Returns new balance.
create or replace function public.grant_credits(
  p_project_id uuid,
  p_amount int,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'grant_credits: amount must be positive';
  end if;

  insert into public.credit_wallets (project_id, balance)
    values (p_project_id, 0)
    on conflict (project_id) do nothing;

  select balance into v_balance
    from public.credit_wallets
    where project_id = p_project_id
    for update;

  v_new_balance := coalesce(v_balance, 0) + p_amount;

  update public.credit_wallets
    set balance = v_new_balance,
        updated_at = now()
    where project_id = p_project_id;

  insert into public.credit_ledger
    (project_id, delta, reason, ref_type, ref_id, balance_after, metadata)
    values (p_project_id, p_amount, p_reason, p_ref_type, p_ref_id, v_new_balance, p_metadata);

  return v_new_balance;
end;
$$;

-- Restrict RPC execution to service_role only (callers go via admin client).
revoke all on function public.deduct_credits(uuid, int, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.grant_credits(uuid, int, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.deduct_credits(uuid, int, text, text, text, jsonb) to service_role;
grant execute on function public.grant_credits(uuid, int, text, text, text, jsonb) to service_role;

-- ============================================================================
-- 7. Convenience view: current period campaign count per project
-- Built dynamically so the migration works even when some channel tables
-- (e.g. sms_campaigns) haven't been created yet in the target environment.
-- Re-run this migration after applying a new channel migration to refresh
-- the view, or call public.refresh_campaign_counts_view() directly.
-- ============================================================================

create or replace function public.refresh_campaign_counts_view()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  parts text := '';
  joins text := '';
  view_sql text;
begin
  if to_regclass('public.whatsapp_campaigns') is not null then
    parts := parts || ' + coalesce(wa.cnt, 0)';
    joins := joins || ' left join (select project_id, count(*)::int as cnt from public.whatsapp_campaigns where created_at >= date_trunc(''month'', now()) group by project_id) wa on wa.project_id = p.id';
  end if;
  if to_regclass('public.email_campaigns') is not null then
    parts := parts || ' + coalesce(em.cnt, 0)';
    joins := joins || ' left join (select project_id, count(*)::int as cnt from public.email_campaigns where created_at >= date_trunc(''month'', now()) group by project_id) em on em.project_id = p.id';
  end if;
  if to_regclass('public.sms_campaigns') is not null then
    parts := parts || ' + coalesce(sm.cnt, 0)';
    joins := joins || ' left join (select project_id, count(*)::int as cnt from public.sms_campaigns where created_at >= date_trunc(''month'', now()) group by project_id) sm on sm.project_id = p.id';
  end if;

  if parts = '' then
    parts := '0';
  else
    parts := substring(parts from 4); -- strip leading ' + '
  end if;

  view_sql := 'create or replace view public.project_campaign_counts_current_month as '
    || 'select p.id as project_id, (' || parts || ')::int as campaigns_this_month '
    || 'from public.projects p' || joins;

  execute view_sql;
end;
$$;

select public.refresh_campaign_counts_view();
