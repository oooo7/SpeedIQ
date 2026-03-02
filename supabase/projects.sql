-- Projects table for SpeedIQ
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  whatsapp_registration_completed_at timestamptz
);

alter table public.projects enable row level security;

create policy "Projects are visible to owners"
on public.projects
for select
using (auth.uid() = owner_id);

create policy "Owners can create projects"
on public.projects
for insert
with check (auth.uid() = owner_id);

create policy "Owners can update projects"
on public.projects
for update
using (auth.uid() = owner_id);

create policy "Owners can delete projects"
on public.projects
for delete
using (auth.uid() = owner_id);

