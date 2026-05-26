-- Billing emails cron: run hourly via Supabase pg_cron + pg_net.
-- Requires app_cron_config table (from 20250204_cron_whatsapp_send.sql).
-- One-time: insert endpoint and bearer_token for id = 'billing_emails':
--   INSERT INTO public.app_cron_config (id, endpoint_url, bearer_token)
--   VALUES ('billing_emails', 'https://YOUR_APP_URL/api/cron/billing-emails', 'YOUR_CRON_SECRET');

create or replace function public.invoke_billing_emails_cron()
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
  where id = 'billing_emails'
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

comment on function public.invoke_billing_emails_cron() is
  'Calls the Next.js billing emails cron endpoint. Configure app_cron_config with id = billing_emails first.';

select cron.schedule(
  'billing-emails',
  '0 * * * *',
  $$select public.invoke_billing_emails_cron()$$
);
