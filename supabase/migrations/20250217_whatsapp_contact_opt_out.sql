-- Add opt_out flag to WhatsApp contacts for campaign and keyword-based opt-out.
alter table public.whatsapp_contacts
  add column if not exists opt_out boolean not null default false;

create index if not exists idx_whatsapp_contacts_project_opt_out
  on public.whatsapp_contacts (project_id, opt_out)
  where opt_out = false;

comment on column public.whatsapp_contacts.opt_out is
  'When true, contact has opted out of marketing; respect when respect_opt_out_for_campaigns is enabled in whatsapp_account_settings.';
