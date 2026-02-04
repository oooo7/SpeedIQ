-- WhatsApp integration: accounts, contacts, segments (Phase 1)
-- Run after profiles.sql, projects.sql, team.sql (depends on user_can_access_project, user_is_project_owner_or_admin)

-- WhatsApp accounts: one per project
create table if not exists public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phone_number_id text not null,
  waba_id text not null,
  access_token text not null,
  phone_number text,
  display_name text,
  quality_rating text,
  tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists idx_whatsapp_accounts_project_id on public.whatsapp_accounts (project_id);

alter table public.whatsapp_accounts enable row level security;

create policy "WhatsApp accounts visible to project members"
  on public.whatsapp_accounts for select
  using (public.user_can_access_project(project_id));

create policy "Owners and admins can insert WhatsApp account"
  on public.whatsapp_accounts for insert
  with check (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can update WhatsApp account"
  on public.whatsapp_accounts for update
  using (public.user_is_project_owner_or_admin(project_id));

create policy "Owners and admins can delete WhatsApp account"
  on public.whatsapp_accounts for delete
  using (public.user_is_project_owner_or_admin(project_id));

drop trigger if exists whatsapp_accounts_updated_at on public.whatsapp_accounts;
create trigger whatsapp_accounts_updated_at
  before update on public.whatsapp_accounts
  for each row execute function public.update_updated_at();

-- Contacts: project-scoped, phone unique per project
create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phone text not null,
  name text,
  email text,
  custom_fields jsonb default '{}',
  tags text[] default '{}',
  source text,
  last_inbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, phone)
);

create index if not exists idx_whatsapp_contacts_project_id on public.whatsapp_contacts (project_id);
create index if not exists idx_whatsapp_contacts_phone on public.whatsapp_contacts (project_id, phone);
create index if not exists idx_whatsapp_contacts_tags on public.whatsapp_contacts using gin (tags);

alter table public.whatsapp_contacts enable row level security;

create policy "Contacts visible to project members"
  on public.whatsapp_contacts for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert contacts"
  on public.whatsapp_contacts for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update contacts"
  on public.whatsapp_contacts for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete contacts"
  on public.whatsapp_contacts for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists whatsapp_contacts_updated_at on public.whatsapp_contacts;
create trigger whatsapp_contacts_updated_at
  before update on public.whatsapp_contacts
  for each row execute function public.update_updated_at();

-- Contact segments: saved filters for campaigns
create table if not exists public.contact_segments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  filter_json jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_segments_project_id on public.contact_segments (project_id);

alter table public.contact_segments enable row level security;

create policy "Segments visible to project members"
  on public.contact_segments for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert segments"
  on public.contact_segments for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update segments"
  on public.contact_segments for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete segments"
  on public.contact_segments for delete
  using (public.user_can_access_project(project_id));

-- Phase 2: Templates
create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  category text not null check (category in ('marketing', 'utility', 'authentication')),
  language text not null default 'en',
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  rejection_reason text,
  body text,
  header text,
  footer text,
  buttons jsonb default '[]',
  variables jsonb default '[]',
  meta_template_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_templates_project_id on public.whatsapp_templates (project_id);
create index if not exists idx_whatsapp_templates_status on public.whatsapp_templates (project_id, status);

alter table public.whatsapp_templates enable row level security;

create policy "Templates visible to project members"
  on public.whatsapp_templates for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert templates"
  on public.whatsapp_templates for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update templates"
  on public.whatsapp_templates for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete templates"
  on public.whatsapp_templates for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists whatsapp_templates_updated_at on public.whatsapp_templates;
create trigger whatsapp_templates_updated_at
  before update on public.whatsapp_templates
  for each row execute function public.update_updated_at();

-- Campaigns
create table if not exists public.whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  template_id uuid references public.whatsapp_templates (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_campaigns_project_id on public.whatsapp_campaigns (project_id);
create index if not exists idx_whatsapp_campaigns_status on public.whatsapp_campaigns (project_id, status);

alter table public.whatsapp_campaigns enable row level security;

create policy "Campaigns visible to project members"
  on public.whatsapp_campaigns for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert campaigns"
  on public.whatsapp_campaigns for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update campaigns"
  on public.whatsapp_campaigns for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete campaigns"
  on public.whatsapp_campaigns for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists whatsapp_campaigns_updated_at on public.whatsapp_campaigns;
create trigger whatsapp_campaigns_updated_at
  before update on public.whatsapp_campaigns
  for each row execute function public.update_updated_at();

-- Campaign recipients
create table if not exists public.whatsapp_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.whatsapp_campaigns (id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_at timestamptz,
  meta_message_id text,
  error_code text,
  created_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);

create index if not exists idx_whatsapp_campaign_recipients_campaign_id on public.whatsapp_campaign_recipients (campaign_id);
create index if not exists idx_whatsapp_campaign_recipients_contact_id on public.whatsapp_campaign_recipients (contact_id);
create index if not exists idx_whatsapp_campaign_recipients_status on public.whatsapp_campaign_recipients (campaign_id, status);

alter table public.whatsapp_campaign_recipients enable row level security;

-- RLS via campaign -> project
create policy "Campaign recipients visible to project members"
  on public.whatsapp_campaign_recipients for select
  using (
    exists (
      select 1 from public.whatsapp_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can insert campaign recipients"
  on public.whatsapp_campaign_recipients for insert
  with check (
    exists (
      select 1 from public.whatsapp_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can update campaign recipients"
  on public.whatsapp_campaign_recipients for update
  using (
    exists (
      select 1 from public.whatsapp_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can delete campaign recipients"
  on public.whatsapp_campaign_recipients for delete
  using (
    exists (
      select 1 from public.whatsapp_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

-- Phase 3: Message queue, messages, conversations
create table if not exists public.whatsapp_message_queue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  campaign_id uuid references public.whatsapp_campaigns (id) on delete set null,
  contact_id uuid not null references public.whatsapp_contacts (id) on delete cascade,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_message_queue_project_status on public.whatsapp_message_queue (project_id, status);
create index if not exists idx_whatsapp_message_queue_scheduled on public.whatsapp_message_queue (scheduled_for) where status = 'pending';

alter table public.whatsapp_message_queue enable row level security;

create policy "Message queue visible to project members"
  on public.whatsapp_message_queue for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert message queue"
  on public.whatsapp_message_queue for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update message queue"
  on public.whatsapp_message_queue for update
  using (public.user_can_access_project(project_id));

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  type text not null default 'text' check (type in ('text', 'image', 'document', 'audio', 'video', 'location')),
  body text,
  media_url text,
  meta_message_id text unique,
  meta_timestamp text,
  status text default 'sent' check (status in ('sent', 'delivered', 'read')),
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_messages_project_contact on public.whatsapp_messages (project_id, contact_id);
create index if not exists idx_whatsapp_messages_meta_id on public.whatsapp_messages (meta_message_id) where meta_message_id is not null;

alter table public.whatsapp_messages enable row level security;

create policy "Messages visible to project members"
  on public.whatsapp_messages for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert messages"
  on public.whatsapp_messages for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update messages"
  on public.whatsapp_messages for update
  using (public.user_can_access_project(project_id));

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts (id) on delete cascade,
  assigned_to uuid references auth.users (id) on delete set null,
  last_message_at timestamptz,
  unread_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, contact_id)
);

create index if not exists idx_whatsapp_conversations_project on public.whatsapp_conversations (project_id);
create index if not exists idx_whatsapp_conversations_last_message on public.whatsapp_conversations (project_id, last_message_at desc nulls last);

alter table public.whatsapp_conversations enable row level security;

create policy "Conversations visible to project members"
  on public.whatsapp_conversations for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert conversations"
  on public.whatsapp_conversations for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update conversations"
  on public.whatsapp_conversations for update
  using (public.user_can_access_project(project_id));

drop trigger if exists whatsapp_conversations_updated_at on public.whatsapp_conversations;
create trigger whatsapp_conversations_updated_at
  before update on public.whatsapp_conversations
  for each row execute function public.update_updated_at();

-- Phase 5: Quick replies (canned messages), tag definitions
create table if not exists public.whatsapp_quick_replies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  body text not null,
  category text,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_quick_replies_project_id on public.whatsapp_quick_replies (project_id);

alter table public.whatsapp_quick_replies enable row level security;

create policy "Quick replies visible to project members"
  on public.whatsapp_quick_replies for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert quick replies"
  on public.whatsapp_quick_replies for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update quick replies"
  on public.whatsapp_quick_replies for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete quick replies"
  on public.whatsapp_quick_replies for delete
  using (public.user_can_access_project(project_id));

create table if not exists public.whatsapp_tag_definitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists idx_whatsapp_tag_definitions_project_id on public.whatsapp_tag_definitions (project_id);

alter table public.whatsapp_tag_definitions enable row level security;

create policy "Tag definitions visible to project members"
  on public.whatsapp_tag_definitions for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert tag definitions"
  on public.whatsapp_tag_definitions for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update tag definitions"
  on public.whatsapp_tag_definitions for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete tag definitions"
  on public.whatsapp_tag_definitions for delete
  using (public.user_can_access_project(project_id));

-- Retry count for campaign recipients (number of send attempts)
alter table public.whatsapp_campaign_recipients
  add column if not exists retry_count integer not null default 0;
