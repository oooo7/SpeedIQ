-- Per-project WhatsApp behavior: opt-in/opt-out keywords and responses, automated messages, working hours.

create table if not exists public.whatsapp_account_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- Opt-in/opt-out
  respect_opt_out_for_campaigns boolean not null default false,
  opt_out_keywords text[] default '{}',
  opt_out_response_enabled boolean not null default false,
  opt_out_response_text text,
  opt_in_keywords text[] default '{}',
  opt_in_response_enabled boolean not null default false,
  opt_in_response_text text,
  -- Automated messages
  auto_resolve_chats boolean not null default false,
  welcome_message_enabled boolean not null default false,
  welcome_message_text text,
  off_hours_message_enabled boolean not null default false,
  off_hours_message_text text,
  -- Working hours: timezone (e.g. Asia/Calcutta), working_hours jsonb per day
  timezone text default 'UTC',
  working_hours jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists idx_whatsapp_account_settings_project_id
  on public.whatsapp_account_settings (project_id);

alter table public.whatsapp_account_settings enable row level security;

create policy "WhatsApp account settings visible to project members"
  on public.whatsapp_account_settings for select
  using (public.user_can_access_project(project_id));

create policy "Owners and admins can insert WhatsApp account settings"
  on public.whatsapp_account_settings for insert
  with check (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can update WhatsApp account settings"
  on public.whatsapp_account_settings for update
  using (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can delete WhatsApp account settings"
  on public.whatsapp_account_settings for delete
  using (public.user_is_project_owner_or_admin(project_id));

drop trigger if exists whatsapp_account_settings_updated_at on public.whatsapp_account_settings;
create trigger whatsapp_account_settings_updated_at
  before update on public.whatsapp_account_settings
  for each row execute function public.update_updated_at();
