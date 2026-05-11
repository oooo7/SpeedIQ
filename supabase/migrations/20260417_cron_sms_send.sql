-- SMS send cron setup (Supabase pg_cron -> app endpoint)

insert into public.app_cron_config (id, endpoint, secret)
values ('sms_send', '/api/cron/sms-send', null)
on conflict (id) do nothing;

create or replace function public.invoke_sms_send_cron()
returns void
language plpgsql
security definer
as $$
declare
  cfg record;
  base_url text;
begin
  select endpoint, secret into cfg
  from public.app_cron_config
  where id = 'sms_send';

  if cfg.endpoint is null then
    raise warning 'app_cron_config row missing for sms_send';
    return;
  end if;

  base_url := coalesce(current_setting('app.settings.app_base_url', true), '');
  if base_url = '' then
    raise warning 'app.settings.app_base_url is not set; cannot invoke cron endpoint';
    return;
  end if;

  perform net.http_get(
    url := base_url || cfg.endpoint,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || coalesce(cfg.secret, '')
    )
  );
end;
$$;

select cron.schedule(
  'sms-send',
  '* * * * *',
  $$select public.invoke_sms_send_cron();$$
)
where not exists (
  select 1 from cron.job where jobname = 'sms-send'
);
