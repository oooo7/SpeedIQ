-- Per-user notification preferences.
-- One row per user; populated lazily on first read or write.

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  -- Email notifications
  email_billing boolean not null default true,         -- trial ending, invoices, payment failures
  email_low_balance boolean not null default true,
  email_product_updates boolean not null default true, -- feature announcements
  email_team_invites boolean not null default true,
  email_campaign_completed boolean not null default false,
  email_weekly_digest boolean not null default false,
  -- In-app (future: bell menu)
  inapp_team_activity boolean not null default true,
  inapp_campaign_status boolean not null default true,
  inapp_credit_alerts boolean not null default true,
  -- Marketing
  marketing_emails boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can view their own notification prefs" on public.notification_preferences;
create policy "Users can view their own notification prefs"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own notification prefs" on public.notification_preferences;
create policy "Users can update their own notification prefs"
  on public.notification_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert their own notification prefs" on public.notification_preferences;
create policy "Users can insert their own notification prefs"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.update_updated_at();
