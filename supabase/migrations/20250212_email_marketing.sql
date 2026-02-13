-- Email marketing: subscribers, templates, campaigns, campaign recipients.
-- Run after profiles.sql, projects.sql, team.sql (depends on user_can_access_project).

-- Email subscribers: project-scoped, email unique per project
create table if not exists public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null,
  name text,
  tags text[] default '{}',
  source text,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed', 'bounced')),
  subscribed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists idx_email_subscribers_project_id on public.email_subscribers (project_id);
create index if not exists idx_email_subscribers_status on public.email_subscribers (project_id, status);
create index if not exists idx_email_subscribers_tags on public.email_subscribers using gin (tags);

alter table public.email_subscribers enable row level security;

create policy "Email subscribers visible to project members"
  on public.email_subscribers for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert email subscribers"
  on public.email_subscribers for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update email subscribers"
  on public.email_subscribers for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete email subscribers"
  on public.email_subscribers for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists email_subscribers_updated_at on public.email_subscribers;
create trigger email_subscribers_updated_at
  before update on public.email_subscribers
  for each row execute function public.update_updated_at();

-- Email templates
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  subject text not null,
  body_html text,
  body_text text,
  variables jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_templates_project_id on public.email_templates (project_id);

alter table public.email_templates enable row level security;

create policy "Email templates visible to project members"
  on public.email_templates for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert email templates"
  on public.email_templates for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update email templates"
  on public.email_templates for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete email templates"
  on public.email_templates for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists email_templates_updated_at on public.email_templates;
create trigger email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.update_updated_at();

-- Email campaigns
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  template_id uuid references public.email_templates (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_campaigns_project_id on public.email_campaigns (project_id);
create index if not exists idx_email_campaigns_status on public.email_campaigns (project_id, status);

alter table public.email_campaigns enable row level security;

create policy "Email campaigns visible to project members"
  on public.email_campaigns for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert email campaigns"
  on public.email_campaigns for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update email campaigns"
  on public.email_campaigns for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete email campaigns"
  on public.email_campaigns for delete
  using (public.user_can_access_project(project_id));

drop trigger if exists email_campaigns_updated_at on public.email_campaigns;
create trigger email_campaigns_updated_at
  before update on public.email_campaigns
  for each row execute function public.update_updated_at();

-- Email campaign recipients
create table if not exists public.email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  subscriber_id uuid not null references public.email_subscribers (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'bounced')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (campaign_id, subscriber_id)
);

create index if not exists idx_email_campaign_recipients_campaign_id on public.email_campaign_recipients (campaign_id);
create index if not exists idx_email_campaign_recipients_subscriber_id on public.email_campaign_recipients (subscriber_id);
create index if not exists idx_email_campaign_recipients_status on public.email_campaign_recipients (campaign_id, status);

alter table public.email_campaign_recipients enable row level security;

create policy "Email campaign recipients visible to project members"
  on public.email_campaign_recipients for select
  using (
    exists (
      select 1 from public.email_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can insert email campaign recipients"
  on public.email_campaign_recipients for insert
  with check (
    exists (
      select 1 from public.email_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can update email campaign recipients"
  on public.email_campaign_recipients for update
  using (
    exists (
      select 1 from public.email_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can delete email campaign recipients"
  on public.email_campaign_recipients for delete
  using (
    exists (
      select 1 from public.email_campaigns c
      where c.id = campaign_id and public.user_can_access_project(c.project_id)
    )
  );
