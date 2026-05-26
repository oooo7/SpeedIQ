-- Invitations inbox: RPCs so an invitee can see and act on invites addressed
-- to their own email without needing direct SELECT on project_invites
-- (which is restricted to project owners/admins).

drop function if exists public.get_my_pending_invites();
create or replace function public.get_my_pending_invites()
returns table(
  id uuid,
  project_id uuid,
  project_name text,
  role text,
  email text,
  token text,
  expires_at timestamptz,
  created_at timestamptz,
  inviter_name text,
  inviter_email text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    return;
  end if;

  select au.email into v_email from auth.users au where au.id = auth.uid();
  if v_email is null then
    return;
  end if;

  return query
  select
    pi.id,
    pi.project_id,
    p.name as project_name,
    pi.role,
    pi.email,
    pi.token,
    pi.expires_at,
    pi.created_at,
    coalesce(pr.full_name, split_part(coalesce(au.email, 'unknown'), '@', 1))::text as inviter_name,
    au.email::text as inviter_email
  from public.project_invites pi
  join public.projects p on p.id = pi.project_id
  left join auth.users au on au.id = pi.invited_by
  left join public.profiles pr on pr.id = pi.invited_by
  where lower(trim(pi.email)) = lower(trim(v_email))
    and pi.expires_at > now()
  order by pi.created_at desc;
end;
$$;

-- Decline: invitee removes an invite that was sent to their email.
drop function if exists public.decline_project_invite(text);
create or replace function public.decline_project_invite(invite_token text)
returns boolean
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
    return false;
  end if;

  if lower(trim(v_invite.email)) <> lower(trim(v_user_email)) then
    raise exception 'Invite was sent to a different email';
  end if;

  delete from public.project_invites where id = v_invite.id;
  return true;
end;
$$;
