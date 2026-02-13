# WhatsApp send cron (Supabase)

Campaign sending is triggered every minute by a **Supabase cron job** (pg_cron + pg_net) that calls your app’s cron endpoint. This replaces the previous Vercel cron.

## Prerequisites

1. **Enable extensions** in the Supabase Dashboard: **Database → Extensions**
   - Enable **pg_cron**
   - Enable **pg_net**

2. **Run the migration** that creates the config table, function, and schedule:
   - `supabase/migrations/20250204_cron_whatsapp_send.sql`
   - Apply via your usual migration flow (e.g. `supabase db push` or Dashboard SQL).

## One-time setup: configure the cron

Insert your app URL and `CRON_SECRET` so the cron job can call your API. Use the **SQL Editor** in the Supabase Dashboard (or any client that runs as a role that can insert into `app_cron_config`).

Replace `YOUR_APP_URL` (e.g. `https://yourapp.vercel.app`) and `YOUR_CRON_SECRET` with your values:

```sql
INSERT INTO public.app_cron_config (id, endpoint_url, bearer_token)
VALUES (
  'whatsapp_send',
  'https://YOUR_APP_URL/api/cron/whatsapp-send',
  'YOUR_CRON_SECRET'
)
ON CONFLICT (id) DO UPDATE SET
  endpoint_url = EXCLUDED.endpoint_url,
  bearer_token = EXCLUDED.bearer_token,
  updated_at = now();
```

- **endpoint_url**: Full URL of your deployed app’s cron endpoint (no trailing slash). Same value you’d use in a browser or `curl`.
- **bearer_token**: Same as the `CRON_SECRET` env var used by your Next.js app to validate the request.

Keep `CRON_SECRET` set in your Next.js app (e.g. on Vercel) so the endpoint can verify the Supabase cron request.

## How it works

1. **pg_cron** runs every minute (`* * * * *`) and executes `public.invoke_whatsapp_send_cron()`.
2. The function reads `app_cron_config` for `id = 'whatsapp_send'` and, if present, calls **pg_net** to send a GET request to `endpoint_url` with `Authorization: Bearer <bearer_token>`.
3. Your Next.js route `/api/cron/whatsapp-send` receives the request, checks the bearer token, and processes sending/scheduled campaigns as before.

## Managing the job

- **View / edit / disable**: Supabase Dashboard → **Integrations → Cron** (or **Database → Cron** depending on your project). Find the job named `whatsapp-send`.
- **Unschedule** (SQL):
  ```sql
  SELECT cron.unschedule('whatsapp-send');
  ```
- **Reschedule** (if you unscheduled it):
  ```sql
  SELECT cron.schedule(
    'whatsapp-send',
    '* * * * *',
    $$SELECT public.invoke_whatsapp_send_cron()$$
  );
  ```

## Updating URL or secret

Run the same `INSERT ... ON CONFLICT DO UPDATE` from the setup section with the new `endpoint_url` and/or `bearer_token`.

## Troubleshooting

- **Cron not firing**: Confirm pg_cron and pg_net are enabled and the job `whatsapp-send` exists and is active in the Dashboard.
- **401 from the app**: Ensure `bearer_token` in `app_cron_config` exactly matches `CRON_SECRET` in your Next.js app.
- **No sends**: Check that the app URL is correct and the app can reach Supabase (same as before). Check `net._http_response` in SQL for the last response from your endpoint.

---

## Email send cron

Email campaign sending uses the same pattern. A separate cron job `email-send` runs every minute and calls `/api/cron/email-send`.

1. **Run the migration** that creates the function and schedule: `supabase/migrations/20250212_cron_email_send.sql`.

2. **Configure the email cron** (SQL Editor). Use the same `CRON_SECRET` as WhatsApp:

```sql
INSERT INTO public.app_cron_config (id, endpoint_url, bearer_token)
VALUES (
  'email_send',
  'https://YOUR_APP_URL/api/cron/email-send',
  'YOUR_CRON_SECRET'
)
ON CONFLICT (id) DO UPDATE SET
  endpoint_url = EXCLUDED.endpoint_url,
  bearer_token = EXCLUDED.bearer_token,
  updated_at = now();
```

3. The job name in the Dashboard is `email-send`. Unschedule with `SELECT cron.unschedule('email-send');` if needed.
