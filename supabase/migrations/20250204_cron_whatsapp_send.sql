-- WhatsApp send cron: run every minute via Supabase pg_cron + pg_net.
-- Requires pg_cron and pg_net extensions (enable in Dashboard: Database > Extensions).
--
-- One-time setup: insert your app URL and CRON_SECRET into app_cron_config:
--   INSERT INTO public.app_cron_config (id, endpoint_url, bearer_token)
--   VALUES ('whatsapp_send', 'https://YOUR_APP_URL/api/cron/whatsapp-send', 'YOUR_CRON_SECRET');

create table if not exists public.app_cron_config (
  id text primary key,
  endpoint_url text not null,
  bearer_token text not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_cron_config is
  'Config for cron-triggered HTTP calls. Used by whatsapp_send job to call the Next.js cron endpoint.';

-- Restrict access: only database owner (cron) and service role can read; only service role can write.
alter table public.app_cron_config enable row level security;

create policy "Cron or service role can read cron config"
  on public.app_cron_config for select
  using (current_user = 'postgres' or auth.role() = 'service_role');

create policy "Service role can manage cron config"
  on public.app_cron_config for insert
  with check (auth.role() = 'service_role');

create policy "Service role can update cron config"
  on public.app_cron_config for update
  using (auth.role() = 'service_role');

create policy "Service role can delete cron config"
  on public.app_cron_config for delete
  using (auth.role() = 'service_role');

-- Function called by pg_cron: reads config and triggers GET request to the cron endpoint.
create or replace function public.invoke_whatsapp_send_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  select endpoint_url, bearer_token into rec
  from public.app_cron_config
  where id = 'whatsapp_send'
  limit 1;

  if rec.endpoint_url is null or rec.endpoint_url = '' then
    return;
  end if;

  perform net.http_get(
    url := trim(trailing '/' from rec.endpoint_url),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || coalesce(rec.bearer_token, '')
    ),
    timeout_milliseconds := 65000
  );
end;
$$;

comment on function public.invoke_whatsapp_send_cron() is
  'Calls the Next.js WhatsApp send cron endpoint. Configure app_cron_config first.';

-- Schedule: every minute (same as previous Vercel cron).
-- Unschedule with: select cron.unschedule('whatsapp-send');
select cron.schedule(
  'whatsapp-send',
  '* * * * *',
  $$select public.invoke_whatsapp_send_cron()$$
);
