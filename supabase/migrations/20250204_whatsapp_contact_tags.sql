-- Junction table: many-to-many between contacts and tag definitions.
-- Replaces storing tag names on whatsapp_contacts.tags; we keep tags column for backward compatibility during transition.
create table if not exists public.whatsapp_contact_tags (
  contact_id uuid not null references public.whatsapp_contacts (id) on delete cascade,
  tag_id uuid not null references public.whatsapp_tag_definitions (id) on delete cascade,
  primary key (contact_id, tag_id)
);

create index if not exists idx_whatsapp_contact_tags_contact_id on public.whatsapp_contact_tags (contact_id);
create index if not exists idx_whatsapp_contact_tags_tag_id on public.whatsapp_contact_tags (tag_id);

alter table public.whatsapp_contact_tags enable row level security;

create policy "Contact tags visible to project members"
  on public.whatsapp_contact_tags for select
  using (
    exists (
      select 1 from public.whatsapp_contacts c
      where c.id = contact_id and public.user_can_access_project(c.project_id)
    )
  );

create policy "Project members can insert contact tags"
  on public.whatsapp_contact_tags for insert
  with check (
    exists (
      select 1 from public.whatsapp_contacts c
      where c.id = contact_id and public.user_can_access_project(c.project_id)
    )
    and
    exists (
      select 1 from public.whatsapp_tag_definitions t
      where t.id = tag_id and public.user_can_access_project(t.project_id)
    )
  );

create policy "Project members can delete contact tags"
  on public.whatsapp_contact_tags for delete
  using (
    exists (
      select 1 from public.whatsapp_contacts c
      where c.id = contact_id and public.user_can_access_project(c.project_id)
    )
  );

-- Backfill: for each contact, for each tag name in contact.tags, link to tag_definition by name (same project).
insert into public.whatsapp_contact_tags (contact_id, tag_id)
select c.id, t.id
from public.whatsapp_contacts c
cross join lateral unnest(c.tags) as tag_name
join public.whatsapp_tag_definitions t on t.project_id = c.project_id and t.name = tag_name
on conflict (contact_id, tag_id) do nothing;
