-- Phase 3: Admin-controlled refunds/adjustments, auto-recharge scaffolding,
-- billing email tracking. Depends on 20260512_billing.sql and 20260513_billing_admin_phase2.sql.

-- ============================================================================
-- 1. Admin-only RPC: grant credits with audit log entry in one transaction.
-- ============================================================================
create or replace function public.admin_grant_credits(
  p_actor uuid,
  p_project_id uuid,
  p_amount int,
  p_reason text,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'admin_grant_credits: amount must be positive';
  end if;
  if p_reason not in ('manual_adjustment', 'refund') then
    raise exception 'admin_grant_credits: reason must be manual_adjustment or refund';
  end if;

  -- Authorize: actor must currently be a platform admin.
  select is_platform_admin into v_is_admin from public.profiles where id = p_actor;
  if not coalesce(v_is_admin, false) then
    raise exception 'admin_grant_credits: actor is not a platform admin';
  end if;

  v_new_balance := public.grant_credits(
    p_project_id,
    p_amount,
    p_reason,
    'admin_action',
    p_actor::text,
    p_metadata
  );

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, notes)
  values (
    p_actor,
    case when p_reason = 'refund' then 'credits.refund' else 'credits.grant' end,
    'wallet',
    p_project_id::text,
    null,
    jsonb_build_object('delta', p_amount, 'new_balance', v_new_balance),
    p_notes
  );

  return v_new_balance;
end;
$$;

-- ============================================================================
-- 2. Admin-only RPC: deduct credits with audit log entry.
-- ============================================================================
create or replace function public.admin_deduct_credits(
  p_actor uuid,
  p_project_id uuid,
  p_amount int,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'admin_deduct_credits: amount must be positive';
  end if;

  select is_platform_admin into v_is_admin from public.profiles where id = p_actor;
  if not coalesce(v_is_admin, false) then
    raise exception 'admin_deduct_credits: actor is not a platform admin';
  end if;

  v_new_balance := public.deduct_credits(
    p_project_id,
    p_amount,
    'manual_adjustment',
    'admin_action',
    p_actor::text,
    p_metadata
  );

  if v_new_balance < 0 then
    raise exception 'admin_deduct_credits: insufficient balance';
  end if;

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, notes)
  values (
    p_actor,
    'credits.deduct',
    'wallet',
    p_project_id::text,
    null,
    jsonb_build_object('delta', -p_amount, 'new_balance', v_new_balance),
    p_notes
  );

  return v_new_balance;
end;
$$;

-- ============================================================================
-- 3. Admin-only RPC: write an audit entry (used by admin API routes for
--    config updates like plan/pack/weight/settings edits).
-- ============================================================================
create or replace function public.admin_write_audit(
  p_actor uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_before jsonb,
  p_after jsonb,
  p_notes text default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_id bigint;
begin
  select is_platform_admin into v_is_admin from public.profiles where id = p_actor;
  if not coalesce(v_is_admin, false) then
    raise exception 'admin_write_audit: actor is not a platform admin';
  end if;

  insert into public.admin_audit_log
    (actor_id, action, target_type, target_id, before, after, notes)
  values (p_actor, p_action, p_target_type, p_target_id, p_before, p_after, p_notes)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.admin_grant_credits(uuid, uuid, int, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_deduct_credits(uuid, uuid, int, text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_write_audit(uuid, text, text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.admin_grant_credits(uuid, uuid, int, text, text, jsonb) to service_role;
grant execute on function public.admin_deduct_credits(uuid, uuid, int, text, jsonb) to service_role;
grant execute on function public.admin_write_audit(uuid, text, text, text, jsonb, jsonb, text) to service_role;

-- ============================================================================
-- 4. Convenience aggregate RPCs used by /admin overview.
-- ============================================================================
create or replace function public.admin_billing_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  with sub_stats as (
    select
      count(*) filter (where status = 'trialing') as trialing,
      count(*) filter (where status = 'active') as active,
      count(*) filter (where status = 'past_due') as past_due,
      count(*) filter (where status = 'canceled') as canceled,
      count(*) as total
    from public.project_subscriptions
  ),
  wallet_stats as (
    select coalesce(sum(balance), 0)::bigint as total_credits_outstanding,
           count(*) filter (where balance > 0) as wallets_with_balance
    from public.credit_wallets
  ),
  revenue_30d as (
    select
      coalesce(sum(case when reason = 'plan_grant' then 1 else 0 end), 0) as plan_grants,
      coalesce(sum(case when reason = 'top_up' then 1 else 0 end), 0) as top_ups,
      coalesce(sum(case when reason = 'trial_grant' then 1 else 0 end), 0) as trial_grants,
      coalesce(sum(case when reason = 'refund' then 1 else 0 end), 0) as refunds,
      coalesce(sum(case when reason = 'manual_adjustment' then 1 else 0 end), 0) as adjustments,
      coalesce(sum(case when delta > 0 then delta else 0 end), 0)::bigint as credits_granted,
      coalesce(sum(case when delta < 0 then -delta else 0 end), 0)::bigint as credits_consumed
    from public.credit_ledger
    where created_at >= now() - interval '30 days'
  ),
  channel_usage_30d as (
    select channel,
           count(*)::bigint as events,
           coalesce(sum(credits_charged), 0)::bigint as credits
    from public.usage_events
    where created_at >= now() - interval '30 days'
    group by channel
  )
  select jsonb_build_object(
    'subscriptions', (select to_jsonb(s) from sub_stats s),
    'wallets', (select to_jsonb(w) from wallet_stats w),
    'ledger_30d', (select to_jsonb(r) from revenue_30d r),
    'usage_30d', (select coalesce(jsonb_object_agg(channel, jsonb_build_object('events', events, 'credits', credits)), '{}'::jsonb) from channel_usage_30d)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_billing_overview() from public, anon, authenticated;
grant execute on function public.admin_billing_overview() to service_role;

-- ============================================================================
-- 5. Billing email tracking (so we don't double-send trial/low-balance emails).
-- ============================================================================
create table if not exists public.billing_email_log (
  id bigserial primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in (
    'trial_ending', 'trial_expired', 'low_balance', 'plan_grant_receipt',
    'top_up_receipt', 'subscription_canceled', 'payment_failed'
  )),
  recipient_email text not null,
  ref_id text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now()
);

create index if not exists idx_billing_email_log_project_kind_sent
  on public.billing_email_log (project_id, kind, sent_at desc);
create index if not exists idx_billing_email_log_ref
  on public.billing_email_log (kind, ref_id);

alter table public.billing_email_log enable row level security;

drop policy if exists "Billing email log readable by platform admins" on public.billing_email_log;
create policy "Billing email log readable by platform admins"
  on public.billing_email_log for select
  using (public.is_platform_admin());

-- No public write policy: writes via service_role only.

-- ============================================================================
-- 6. Wallet update policy: extend admin write access for auto-recharge fields.
-- ============================================================================
-- credit_wallets already has owner/admin update policy from phase 1; nothing
-- additional needed here beyond making sure platform admins can also update
-- (used by admin transactions page to flip auto-recharge if requested).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_wallets'
      and policyname = 'Platform admins can update wallets'
  ) then
    create policy "Platform admins can update wallets"
      on public.credit_wallets for update
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;
end$$;

-- ============================================================================
-- 7. Allow platform admins to read all subscriptions / wallets / ledger / usage
--    so the admin UI can show cross-project data without RLS dancing.
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_subscriptions' and policyname='Platform admins can view all subscriptions') then
    create policy "Platform admins can view all subscriptions"
      on public.project_subscriptions for select
      using (public.is_platform_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='credit_wallets' and policyname='Platform admins can view all wallets') then
    create policy "Platform admins can view all wallets"
      on public.credit_wallets for select
      using (public.is_platform_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='credit_ledger' and policyname='Platform admins can view all ledger') then
    create policy "Platform admins can view all ledger"
      on public.credit_ledger for select
      using (public.is_platform_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='usage_events' and policyname='Platform admins can view all usage') then
    create policy "Platform admins can view all usage"
      on public.usage_events for select
      using (public.is_platform_admin());
  end if;
end$$;
