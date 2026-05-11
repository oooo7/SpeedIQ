-- SMS marketing + automation channel (Twilio)
-- Run after projects/team migrations (depends on user_can_access_project, user_is_project_owner_or_admin)

create table if not exists public.sms_accounts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  twilio_account_sid text,
  messaging_service_sid text,
  default_from text,
  onboarding_state text not null default 'not_started' check (onboarding_state in ('not_started', 'pending', 'connected', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists idx_sms_accounts_project_id on public.sms_accounts (project_id);

alter table public.sms_accounts enable row level security;

create policy "SMS accounts visible to project members"
  on public.sms_accounts for select
  using (public.user_can_access_project(project_id));

create policy "Owners and admins can insert SMS account"
  on public.sms_accounts for insert
  with check (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can update SMS account"
  on public.sms_accounts for update
  using (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can delete SMS account"
  on public.sms_accounts for delete
  using (public.user_is_project_owner_or_admin(project_id));

drop trigger if exists sms_accounts_updated_at on public.sms_accounts;
create trigger sms_accounts_updated_at
  before update on public.sms_accounts
  for each row execute function public.update_updated_at();

create table if not exists public.sms_numbers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sms_account_id uuid references public.sms_accounts (id) on delete set null,
  phone_number_e164 text not null,
  twilio_phone_number_sid text not null,
  capabilities jsonb not null default '{"sms": true, "mms": false}'::jsonb,
  status text not null default 'active' check (status in ('active', 'inactive', 'pending', 'released')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, phone_number_e164),
  unique (project_id, twilio_phone_number_sid)
);

create index if not exists idx_sms_numbers_project_id on public.sms_numbers (project_id);
create index if not exists idx_sms_numbers_default on public.sms_numbers (project_id, is_default);

alter table public.sms_numbers enable row level security;

create policy "SMS numbers visible to project members"
  on public.sms_numbers for select
  using (public.user_can_access_project(project_id));

create policy "Owners and admins can insert SMS numbers"
  on public.sms_numbers for insert
  with check (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can update SMS numbers"
  on public.sms_numbers for update
  using (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can delete SMS numbers"
  on public.sms_numbers for delete
  using (public.user_is_project_owner_or_admin(project_id));

drop trigger if exists sms_numbers_updated_at on public.sms_numbers;
create trigger sms_numbers_updated_at
  before update on public.sms_numbers
  for each row execute function public.update_updated_at();

create table if not exists public.sms_account_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  respect_opt_out_for_campaigns boolean not null default true,
  advanced_opt_out_enabled boolean not null default true,
  opt_out_keywords jsonb not null default '["STOP","UNSUBSCRIBE","CANCEL","END","QUIT"]'::jsonb,
  opt_in_keywords jsonb not null default '["START","UNSTOP"]'::jsonb,
  help_keywords jsonb not null default '["HELP"]'::jsonb,
  opt_out_response_enabled boolean not null default true,
  opt_out_response_text text default 'You are unsubscribed and will no longer receive messages.',
  opt_in_response_enabled boolean not null default true,
  opt_in_response_text text default 'You are subscribed again and can receive messages.',
  help_response_enabled boolean not null default true,
  help_response_text text default 'Reply STOP to unsubscribe or START to re-subscribe.',
  welcome_message_enabled boolean not null default false,
  welcome_message_text text default 'Thanks for contacting us. We will get back to you shortly.',
  off_hours_message_enabled boolean not null default false,
  off_hours_message_text text default 'We are currently away. We will reply during business hours.',
  timezone text default 'UTC',
  working_hours jsonb not null default '{}'::jsonb,
  auto_resolve_chats boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists idx_sms_account_settings_project_id on public.sms_account_settings (project_id);

alter table public.sms_account_settings enable row level security;

create policy "SMS settings visible to project members"
  on public.sms_account_settings for select
  using (public.user_can_access_project(project_id));

create policy "Owners and admins can insert SMS settings"
  on public.sms_account_settings for insert
  with check (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can update SMS settings"
  on public.sms_account_settings for update
  using (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can delete SMS settings"
  on public.sms_account_settings for delete
  using (public.user_is_project_owner_or_admin(project_id));

drop trigger if exists sms_account_settings_updated_at on public.sms_account_settings;
create trigger sms_account_settings_updated_at
  before update on public.sms_account_settings
  for each row execute function public.update_updated_at();

create table if not exists public.sms_tag_definitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists idx_sms_tag_definitions_project_id on public.sms_tag_definitions (project_id);

alter table public.sms_tag_definitions enable row level security;

create policy "SMS tag definitions visible to project members"
  on public.sms_tag_definitions for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert SMS tag definitions"
  on public.sms_tag_definitions for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update SMS tag definitions"
  on public.sms_tag_definitions for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete SMS tag definitions"
  on public.sms_tag_definitions for delete
  using (public.user_can_access_project(project_id));

create table if not exists public.sms_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phone text not null,
  name text,
  email text,
  custom_fields jsonb not null default '{}'::jsonb,
  source text,
  opt_out boolean not null default false,
  consent_status text not null default 'unknown' check (consent_status in ('unknown', 'subscribed', 'unsubscribed')),
  consent_updated_at timestamptz,
  last_inbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, phone)
);

create index if not exists idx_sms_contacts_project_id on public.sms_contacts (project_id);
create index if not exists idx_sms_contacts_phone on public.sms_contacts (project_id, phone);
create index if not exists idx_sms_contacts_opt_out on public.sms_contacts (project_id, opt_out);

alter table public.sms_contacts enable row level security;

create policy "SMS contacts visible to project members"
  on public.sms_contacts for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert SMS contacts"
  on public.sms_contacts for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update SMS contacts"
  on public.sms_contacts for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete SMS contacts"
  on public.sms_contacts for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists sms_contacts_updated_at on public.sms_contacts;
create trigger sms_contacts_updated_at
  before update on public.sms_contacts
  for each row execute function public.update_updated_at();

create table if not exists public.sms_contact_tags (
  contact_id uuid not null references public.sms_contacts (id) on delete cascade,
  tag_id uuid not null references public.sms_tag_definitions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create index if not exists idx_sms_contact_tags_contact on public.sms_contact_tags (contact_id);
create index if not exists idx_sms_contact_tags_tag on public.sms_contact_tags (tag_id);

alter table public.sms_contact_tags enable row level security;

create policy "SMS contact tags visible to project members"
  on public.sms_contact_tags for select
  using (
    exists (
      select 1 from public.sms_contacts c
      where c.id = contact_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can insert SMS contact tags"
  on public.sms_contact_tags for insert
  with check (
    exists (
      select 1 from public.sms_contacts c
      where c.id = contact_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can delete SMS contact tags"
  on public.sms_contact_tags for delete
  using (
    exists (
      select 1 from public.sms_contacts c
      where c.id = contact_id and public.user_can_access_project(c.project_id)
    )
  );

create table if not exists public.sms_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sms_templates_project_id on public.sms_templates (project_id);

alter table public.sms_templates enable row level security;

create policy "SMS templates visible to project members"
  on public.sms_templates for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert SMS templates"
  on public.sms_templates for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update SMS templates"
  on public.sms_templates for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete SMS templates"
  on public.sms_templates for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists sms_templates_updated_at on public.sms_templates;
create trigger sms_templates_updated_at
  before update on public.sms_templates
  for each row execute function public.update_updated_at();

create table if not exists public.sms_campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  template_id uuid references public.sms_templates (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sms_campaigns_project_id on public.sms_campaigns (project_id);
create index if not exists idx_sms_campaigns_status on public.sms_campaigns (project_id, status);
create index if not exists idx_sms_campaigns_schedule on public.sms_campaigns (status, scheduled_at);

alter table public.sms_campaigns enable row level security;

create policy "SMS campaigns visible to project members"
  on public.sms_campaigns for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert SMS campaigns"
  on public.sms_campaigns for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update SMS campaigns"
  on public.sms_campaigns for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete SMS campaigns"
  on public.sms_campaigns for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists sms_campaigns_updated_at on public.sms_campaigns;
create trigger sms_campaigns_updated_at
  before update on public.sms_campaigns
  for each row execute function public.update_updated_at();

create table if not exists public.sms_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sms_campaigns (id) on delete cascade,
  contact_id uuid not null references public.sms_contacts (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'queued', 'sent', 'delivered', 'undelivered', 'failed')),
  sent_at timestamptz,
  twilio_message_sid text,
  error_code text,
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);

create index if not exists idx_sms_campaign_recipients_campaign_id on public.sms_campaign_recipients (campaign_id);
create index if not exists idx_sms_campaign_recipients_contact_id on public.sms_campaign_recipients (contact_id);
create index if not exists idx_sms_campaign_recipients_status on public.sms_campaign_recipients (campaign_id, status);
create index if not exists idx_sms_campaign_recipients_sid on public.sms_campaign_recipients (twilio_message_sid) where twilio_message_sid is not null;

alter table public.sms_campaign_recipients enable row level security;

create policy "SMS campaign recipients visible to project members"
  on public.sms_campaign_recipients for select
  using (
    exists (
      select 1 from public.sms_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can insert SMS campaign recipients"
  on public.sms_campaign_recipients for insert
  with check (
    exists (
      select 1 from public.sms_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can update SMS campaign recipients"
  on public.sms_campaign_recipients for update
  using (
    exists (
      select 1 from public.sms_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can delete SMS campaign recipients"
  on public.sms_campaign_recipients for delete
  using (
    exists (
      select 1 from public.sms_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contact_id uuid not null references public.sms_contacts (id) on delete cascade,
  campaign_id uuid references public.sms_campaigns (id) on delete set null,
  direction text not null check (direction in ('in', 'out')),
  from_number text,
  to_number text,
  body text,
  num_segments integer,
  num_media integer not null default 0,
  twilio_message_sid text unique,
  status text not null default 'queued' check (status in ('queued', 'accepted', 'scheduled', 'sent', 'delivered', 'undelivered', 'failed', 'canceled', 'received')),
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sms_messages_project_contact on public.sms_messages (project_id, contact_id);
create index if not exists idx_sms_messages_sid on public.sms_messages (twilio_message_sid) where twilio_message_sid is not null;
create index if not exists idx_sms_messages_status on public.sms_messages (project_id, status);

alter table public.sms_messages enable row level security;

create policy "SMS messages visible to project members"
  on public.sms_messages for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert SMS messages"
  on public.sms_messages for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update SMS messages"
  on public.sms_messages for update
  using (public.user_can_access_project(project_id));

drop trigger if exists sms_messages_updated_at on public.sms_messages;
create trigger sms_messages_updated_at
  before update on public.sms_messages
  for each row execute function public.update_updated_at();

create table if not exists public.sms_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contact_id uuid not null references public.sms_contacts (id) on delete cascade,
  assigned_to uuid references auth.users (id) on delete set null,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  is_archived boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, contact_id)
);

create index if not exists idx_sms_conversations_project on public.sms_conversations (project_id);
create index if not exists idx_sms_conversations_last_message on public.sms_conversations (project_id, last_message_at desc nulls last);
create index if not exists idx_sms_conversations_archived on public.sms_conversations (project_id, is_archived);

alter table public.sms_conversations enable row level security;

create policy "SMS conversations visible to project members"
  on public.sms_conversations for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert SMS conversations"
  on public.sms_conversations for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update SMS conversations"
  on public.sms_conversations for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete SMS conversations"
  on public.sms_conversations for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists sms_conversations_updated_at on public.sms_conversations;
create trigger sms_conversations_updated_at
  before update on public.sms_conversations
  for each row execute function public.update_updated_at();
