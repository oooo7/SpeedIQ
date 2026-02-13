-- Add domain verification fields for platform-owned email.
-- provider, resend_api_key_encrypted, smtp_* are deprecated (kept for backward compat) but no longer used.

alter table public.project_email_settings
  add column if not exists domain_verified boolean default false,
  add column if not exists resend_domain_id text;

comment on column public.project_email_settings.domain_verified is
  'True when the from_email domain has been verified in Resend via DNS records.';
comment on column public.project_email_settings.resend_domain_id is
  'Resend domain ID for the from_email domain; used to check verification status.';
