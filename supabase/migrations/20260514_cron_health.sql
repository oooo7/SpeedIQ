-- Cron health diagnostic for whatsapp_send (and email_send / sms_send).
-- Lets the app surface whether the pg_cron-based send pipeline is healthy
-- without exposing direct table access. Returns a single JSON blob.

create or replace function public.get_cron_health(p_job_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
  v_config record;
  v_last_response record;
  v_last_run timestamptz;
  v_job_exists boolean := false;
  v_config_exists boolean := false;
  v_endpoint text := null;
  v_last_status int := null;
  v_last_content text := null;
  v_last_called timestamptz := null;
begin
  -- Permission: only project members who have any role on at least one project
  -- can call this, plus service_role. The data is global, not per-project,
  -- but we don't want it open to anyone authenticated.
  if auth.role() <> 'service_role' then
    if not exists (
      select 1 from public.project_members where user_id = auth.uid()
    ) then
      raise exception 'forbidden';
    end if;
  end if;

  -- 1. cron schedule
  begin
    select jobname, schedule, active
      into v_job
      from cron.job
      where jobname = p_job_id;
    if found then
      v_job_exists := true;
    end if;
  exception when others then
    -- pg_cron not installed; v_job_exists stays false
    null;
  end;

  -- 2. app_cron_config row
  select endpoint_url, bearer_token, updated_at
    into v_config
    from public.app_cron_config
    where id = p_job_id;
  if found then
    v_config_exists := true;
    v_endpoint := v_config.endpoint_url;
  end if;

  -- 3. last pg_net response for that endpoint
  if v_endpoint is not null then
    begin
      select r.status_code, r.content, r.created
        into v_last_response
        from net._http_response r
        join net.http_request_queue q on q.id = r.id
        where q.url like rtrim(v_endpoint, '/') || '%'
        order by r.created desc
        limit 1;
      if found then
        v_last_status := v_last_response.status_code;
        v_last_content := left(coalesce(v_last_response.content, ''), 500);
        v_last_called := v_last_response.created;
      end if;
    exception when others then
      -- pg_net not installed or schema differs; ignore
      null;
    end;
  end if;

  -- 4. last successful run inferred from net._http_response (any 2xx)
  begin
    select max(r.created)
      into v_last_run
      from net._http_response r
      join net.http_request_queue q on q.id = r.id
      where v_endpoint is not null
        and q.url like rtrim(v_endpoint, '/') || '%'
        and r.status_code between 200 and 299;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'job_id', p_job_id,
    'job_scheduled', v_job_exists,
    'job_active', coalesce(v_job.active, false),
    'job_schedule', v_job.schedule,
    'config_present', v_config_exists,
    'endpoint_url', v_endpoint,
    'config_updated_at', v_config.updated_at,
    'last_response_status', v_last_status,
    'last_response_at', v_last_called,
    'last_response_body', v_last_content,
    'last_success_at', v_last_run,
    'checked_at', now()
  );
end;
$$;

comment on function public.get_cron_health(text) is
  'Returns health snapshot for a pg_cron-driven send job (whatsapp_send / email_send / sms_send). Reads cron.job, app_cron_config, and net._http_response. Used by the app diagnostic UI.';

grant execute on function public.get_cron_health(text) to authenticated;
grant execute on function public.get_cron_health(text) to service_role;
