-- Email send cron: run every minute via Supabase pg_cron + pg_net.
-- Requires app_cron_config table (from 20250204_cron_whatsapp_send.sql).
-- One-time: insert endpoint and bearer_token for id = 'email_send' (see docs/cron-supabase.md).

create or replace function public.invoke_email_send_cron()
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
  where id = 'email_send'
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

comment on function public.invoke_email_send_cron() is
  'Calls the Next.js email send cron endpoint. Configure app_cron_config with id = email_send first.';

select cron.schedule(
  'email-send',
  '* * * * *',
  $$select public.invoke_email_send_cron()$$
);
