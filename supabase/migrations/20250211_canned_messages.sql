-- Canned messages table: multiple types (text, image, file, video, audio) and channel (whatsapp, email)
create table if not exists public.canned_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  type text not null check (type in ('text', 'image', 'file', 'video', 'audio')),
  channel text not null check (channel in ('whatsapp', 'email')),
  body text,
  attachment_path text,
  attachment_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_canned_messages_project_id on public.canned_messages (project_id);
create index if not exists idx_canned_messages_channel on public.canned_messages (project_id, channel);

alter table public.canned_messages enable row level security;

create policy "Canned messages visible to project members"
  on public.canned_messages for select
  using (public.user_can_access_project(project_id));

create policy "Project members can insert canned messages"
  on public.canned_messages for insert
  with check (public.user_can_access_project(project_id));

create policy "Project members can update canned messages"
  on public.canned_messages for update
  using (public.user_can_access_project(project_id));

create policy "Project members can delete canned messages"
  on public.canned_messages for delete
  using (public.user_can_access_project(project_id));

create or replace function public.update_canned_messages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger canned_messages_updated_at
  before update on public.canned_messages
  for each row execute function public.update_canned_messages_updated_at();

-- Storage: Create bucket "canned-message-attachments" in Supabase Dashboard (Storage > New bucket).
-- Private bucket; uploads/access are done server-side with project role check.
