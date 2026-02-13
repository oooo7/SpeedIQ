-- Whether to use custom from email (when verified) or platform fallback.
-- When true, custom from is used if domain_verified; otherwise fallback is used.

alter table public.project_email_settings
  add column if not exists use_custom_from boolean default false;

comment on column public.project_email_settings.use_custom_from is
  'When true, use from_email if domain is verified; otherwise use fallback address.';
