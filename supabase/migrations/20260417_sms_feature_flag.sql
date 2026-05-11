alter table public.projects
  add column if not exists sms_channel_enabled boolean not null default false;
