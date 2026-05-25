-- Pre-launch hardening for the email system:
--   1. Consent tracking on email_subscribers (GDPR/CASL).
--   2. Unified email_sends audit log for every outbound message.
--   3. Platform settings for CAN-SPAM footer (physical address + support email).

-- ============================================================================
-- 1. Consent tracking on email_subscribers.
-- ============================================================================
alter table public.email_subscribers
  add column if not exists consent_given_at timestamptz,
  add column if not exists consent_source text,
  add column if not exists consent_ip inet;

comment on column public.email_subscribers.consent_given_at is
  'When the subscriber opted in. Required for GDPR/CASL audit.';
comment on column public.email_subscribers.consent_source is
  'How consent was obtained (e.g. signup_form, csv_import, api, manual_admin).';
comment on column public.email_subscribers.consent_ip is
  'IP at time of opt-in (if collected via web form).';

-- Backfill: existing subscribers already marked subscribed get a synthetic
-- consent record based on their subscribed_at / created_at so they aren't
-- flagged as missing consent. Source marked 'legacy' for traceability.
update public.email_subscribers
set consent_given_at = coalesce(subscribed_at, created_at),
    consent_source = 'legacy'
where status = 'subscribed'
  and consent_given_at is null;

-- ============================================================================
-- 2. email_sends: unified audit log for every outbound email.
-- ============================================================================
create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  kind text not null check (kind in (
    'campaign', 'transactional', 'billing', 'test', 'invite', 'auth', 'other'
  )),
  ref_id text,
  recipient_email text not null,
  from_email text,
  subject text,
  provider text not null check (provider in ('resend', 'smtp')),
  provider_message_id text,
  status text not null default 'sent' check (status in (
    'sent', 'failed', 'delivered', 'bounced', 'complained', 'delivery_delayed'
  )),
  error_message text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_email_sends_project_sent
  on public.email_sends (project_id, sent_at desc);
create index if not exists idx_email_sends_recipient
  on public.email_sends (recipient_email, sent_at desc);
create index if not exists idx_email_sends_provider_message
  on public.email_sends (provider_message_id)
  where provider_message_id is not null;
create index if not exists idx_email_sends_kind_ref
  on public.email_sends (kind, ref_id)
  where ref_id is not null;

alter table public.email_sends enable row level security;

drop policy if exists "Email sends visible to project members" on public.email_sends;
create policy "Email sends visible to project members"
  on public.email_sends for select
  using (project_id is not null and public.user_can_access_project(project_id));

drop policy if exists "Email sends visible to platform admins" on public.email_sends;
create policy "Email sends visible to platform admins"
  on public.email_sends for select
  using (public.is_platform_admin());

-- Writes via service_role only (no public insert/update policy).

-- ============================================================================
-- 3. Platform settings for CAN-SPAM footer.
-- ============================================================================
insert into public.platform_settings (key, value, description) values
  ('sender_physical_address', to_jsonb(''::text),
    'Postal address shown in CAN-SPAM compliant email footer. Required for bulk email.'),
  ('support_email',           to_jsonb(''::text),
    'Support / reply-to address shown in email footers.')
on conflict (key) do nothing;
