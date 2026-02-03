-- Project members: accepted team members with roles
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists idx_project_members_project_id on public.project_members (project_id);
create index if not exists idx_project_members_user_id on public.project_members (user_id);

alter table public.project_members enable row level security;

-- Helper functions (SECURITY DEFINER) to avoid RLS recursion
create or replace function public.user_can_access_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid()
  ) or exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
  );
$$;

create or replace function public.user_is_project_owner_or_admin(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid()
  ) or exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
    and pm.role in ('owner', 'admin')
  );
$$;

create or replace function public.user_is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid()
  );
$$;

-- RPC: get project members with profile details (name, email)
drop function if exists public.get_project_team_members(uuid);
create or replace function public.get_project_team_members(p_project_id uuid)
returns table(
  id uuid,
  project_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  email text,
  full_name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.user_can_access_project(p_project_id) then
    return;
  end if;

  return query
  select
    pm.id as id,
    pm.project_id as project_id,
    pm.user_id as user_id,
    pm.role::text as role,
    pm.joined_at as joined_at,
    (au.email)::text as email,
    (coalesce(pr.full_name, split_part(coalesce(au.email, 'unknown'), '@', 1)))::text as full_name
  from public.project_members pm
  left join auth.users au on au.id = pm.user_id
  left join public.profiles pr on pr.id = pm.user_id
  where pm.project_id = p_project_id
  order by pm.joined_at asc;
end;
$$;

drop policy if exists "Members can view project members" on public.project_members;
create policy "Members can view project members"
  on public.project_members for select
  using (public.user_can_access_project(project_id));

drop policy if exists "Owners and admins can insert members" on public.project_members;
create policy "Owners and admins can insert members"
  on public.project_members for insert
  with check (public.user_is_project_owner_or_admin(project_id));

drop policy if exists "Owners and admins can update members" on public.project_members;
create policy "Owners and admins can update members"
  on public.project_members for update
  using (public.user_is_project_owner_or_admin(project_id));

drop policy if exists "Owners and admins can delete members" on public.project_members;
create policy "Owners and admins can delete members"
  on public.project_members for delete
  using (public.user_is_project_owner_or_admin(project_id));

-- Project invites: pending email invites
create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  invited_by uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists idx_project_invites_project_id on public.project_invites (project_id);
create index if not exists idx_project_invites_token on public.project_invites (token);
create index if not exists idx_project_invites_expires_at on public.project_invites (expires_at);

alter table public.project_invites enable row level security;

drop policy if exists "Owners and admins can view invites" on public.project_invites;
create policy "Owners and admins can view invites"
  on public.project_invites for select
  using (public.user_is_project_owner_or_admin(project_id));

drop policy if exists "Owners and admins can insert invites" on public.project_invites;
create policy "Owners and admins can insert invites"
  on public.project_invites for insert
  with check (public.user_is_project_owner_or_admin(project_id));

drop policy if exists "Owners and admins can delete invites" on public.project_invites;
create policy "Owners and admins can delete invites"
  on public.project_invites for delete
  using (public.user_is_project_owner_or_admin(project_id));

-- Projects: allow access for owners OR members
drop policy if exists "Projects are visible to owners" on public.projects;
drop policy if exists "Projects are visible to owners and members" on public.projects;
create policy "Projects are visible to owners and members"
  on public.projects for select
  using (public.user_can_access_project(id));

-- RPC: create project (bypasses RLS; uses auth.uid() for owner)
-- Returns TABLE(project_id uuid) - one row so Supabase client parses it correctly
drop function if exists public.create_project(text);
create or replace function public.create_project(p_name text)
returns table(project_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.projects (owner_id, name)
  values (v_user_id, trim(p_name))
  returning id into v_id;

  project_id := v_id;
  return next;
end;
$$;

-- Backfill: add existing project owners to project_members
insert into public.project_members (project_id, user_id, role)
select p.id, p.owner_id, 'owner'
from public.projects p
where not exists (
  select 1 from public.project_members pm
  where pm.project_id = p.id and pm.user_id = p.owner_id
)
on conflict (project_id, user_id) do nothing;

-- Trigger: add owner as project_member when project is created
create or replace function public.add_owner_as_project_member()
returns trigger as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_project_created_add_owner on public.projects;
create trigger on_project_created_add_owner
  after insert on public.projects
  for each row execute function public.add_owner_as_project_member();

-- RPC: get invite by token (anyone with token can call; bypasses RLS for invitee preview)
drop function if exists public.get_invite_by_token(text);
create or replace function public.get_invite_by_token(invite_token text)
returns table(project_name text, inviter_name text, email text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_inviter_name text;
begin
  select pi.id, pi.project_id, pi.email, pi.role, pi.expires_at, pi.invited_by, p.name as proj_name
  into v_invite
  from public.project_invites pi
  join public.projects p on p.id = pi.project_id
  where pi.token = invite_token and pi.expires_at > now();

  if not found then
    return;
  end if;

  select coalesce(pr.full_name, 'A team member') into v_inviter_name
  from public.profiles pr where pr.id = v_invite.invited_by;

  project_name := v_invite.proj_name;
  inviter_name := coalesce(v_inviter_name, 'A team member');
  email := v_invite.email;
  role := v_invite.role;
  return next;
end;
$$;

-- RPC: accept invite (invitee calls this; runs with elevated privileges)
-- Returns TABLE(project_id uuid) - one row so Supabase client parses it correctly
drop function if exists public.accept_project_invite(text);
create or replace function public.accept_project_invite(invite_token text)
returns table(project_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_user_email from auth.users where id = auth.uid();
  if v_user_email is null then
    raise exception 'User email not found';
  end if;

  select * into v_invite from public.project_invites
  where token = invite_token and expires_at > now();

  if not found then
    raise exception 'Invite not found or expired';
  end if;

  if lower(trim(v_invite.email)) <> lower(trim(v_user_email)) then
    raise exception 'Invite was sent to a different email';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_invite.project_id, auth.uid(), v_invite.role)
  on conflict on constraint project_members_project_id_user_id_key do update set role = excluded.role;

  delete from public.project_invites where id = v_invite.id;

  project_id := v_invite.project_id;
  return next;
end;
$$;
