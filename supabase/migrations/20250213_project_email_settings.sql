-- Per-project email settings: from address and optional own Resend/SMTP account.
-- Encrypted fields (resend_api_key_encrypted, smtp_pass_encrypted) are decrypted in app using ENCRYPTION_KEY.

create table if not exists public.project_email_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  from_email text,
  provider text check (provider is null or provider in ('resend', 'smtp')),
  resend_api_key_encrypted text,
  smtp_host text,
  smtp_port int,
  smtp_secure boolean default false,
  smtp_user text,
  smtp_pass_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists idx_project_email_settings_project_id on public.project_email_settings (project_id);

alter table public.project_email_settings enable row level security;

create policy "Project email settings visible to project members"
  on public.project_email_settings for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert project email settings"
  on public.project_email_settings for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update project email settings"
  on public.project_email_settings for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete project email settings"
  on public.project_email_settings for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists project_email_settings_updated_at on public.project_email_settings;
create trigger project_email_settings_updated_at
  before update on public.project_email_settings
  for each row execute function public.update_updated_at();
