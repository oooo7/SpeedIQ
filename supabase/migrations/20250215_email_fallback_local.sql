-- User-chosen fallback from address (local part only, e.g. acme for acme@send.habiv.com).
-- Works immediately; no domain verification needed.

alter table public.project_email_settings
  add column if not exists fallback_local_part text;

comment on column public.project_email_settings.fallback_local_part is
  'Local part of fallback from address (e.g. acme for acme@send.habiv.com). Used when custom domain is not verified.';
