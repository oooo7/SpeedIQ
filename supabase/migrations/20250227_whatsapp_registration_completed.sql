-- Track that the user completed the one-time WhatsApp number setup (PIN registration).
-- When set, we hide the "Your number isn't set up for sending yet" section and don't auto-open the popup on 133010.

alter table public.projects
  add column if not exists whatsapp_registration_completed_at timestamptz;

comment on column public.projects.whatsapp_registration_completed_at is
  'Set when user completed the one-time WhatsApp phone registration (PIN) in app; used to hide the setup section.';

-- RPC so owner or admin can set the flag (RLS on projects only allows owner to update).
drop function if exists public.set_whatsapp_registration_completed(uuid);
create or replace function public.set_whatsapp_registration_completed(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_is_project_owner_or_admin(p_project_id) then
    raise exception 'Forbidden';
  end if;
  update public.projects
  set whatsapp_registration_completed_at = now()
  where id = p_project_id;
end;
$$;

-- Clear the flag when user disconnects WhatsApp (so they see setup again if they reconnect).
drop function if exists public.clear_whatsapp_registration_completed(uuid);
create or replace function public.clear_whatsapp_registration_completed(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_is_project_owner_or_admin(p_project_id) then
    raise exception 'Forbidden';
  end if;
  update public.projects
  set whatsapp_registration_completed_at = null
  where id = p_project_id;
end;
$$;
