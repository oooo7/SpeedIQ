-- Store WhatsApp account health/settings refresh data in a single JSON column.
-- Keeps a snapshot of quality_rating, verified_name, status, etc. from Meta.

alter table public.whatsapp_accounts
  add column if not exists health_data jsonb;

comment on column public.whatsapp_accounts.health_data is
  'JSON snapshot from Meta: display_phone_number, quality_rating, platform_type, verified_name, code_verification_status, status, etc. Updated on refresh.';
