-- Allow campaigns to send Meta's default hello_world template (no custom template needed).
alter table public.whatsapp_campaigns
  add column if not exists use_hello_world boolean not null default false;

comment on column public.whatsapp_campaigns.use_hello_world is
  'When true, send the default hello_world template to recipients; template_id is ignored for sending.';
