# WhatsApp setup checklist (Habiv)

Use this list to get WhatsApp (including Opt-in/Opt-out and Automated Messages) working end-to-end. The app code is already in place; you only need configuration and one-time setup.

**App Review:** If you need to pass Meta’s App Review for `whatsapp_business_messaging`, see [whatsapp-app-review-screencast.md](./whatsapp-app-review-screencast.md) for the exact screencast requirements and a step-by-step recording checklist.

---

## 1. Environment variables

Set these in `.env.local` (local) and in your host (e.g. Vercel → Project → Settings → Environment Variables).

| Variable | Required | Notes |
|----------|----------|--------|
| `WHATSAPP_VERIFY_TOKEN` | Yes (for webhook) | Any secret string. Must match the **Verify token** you enter in Meta → WhatsApp → Configuration → Webhook. |
| `CRON_SECRET` | Yes (for campaigns) | Secret for `/api/cron/whatsapp-send`. Same value must be stored in Supabase `app_cron_config.bearer_token` (see cron step below). |
| `NEXT_PUBLIC_APP_URL` | Recommended | Your app’s public URL (e.g. `https://yourapp.vercel.app`). Used for WhatsApp Embedded Signup callback. |
| `FACEBOOK_APP_ID` | If using Embedded Signup | From Meta Developer Portal. |
| `FACEBOOK_APP_SECRET` | If using Embedded Signup | From Meta Developer Portal. |
| `WHATSAPP_CONFIG_ID` | If using Embedded Signup | Embedded Signup config ID from Meta. |
| `WHATSAPP_SOLUTION_ID` | Optional | For Meta partners. |

---

## 2. Meta app: webhook

So that **incoming messages** (and thus Opt-in/Opt-out + Welcome/Off-hours) work:

1. Go to [Meta for Developers](https://developers.facebook.com/apps) → your app → **WhatsApp** → **Configuration**.
2. Under **Webhook**, click **Edit**.
3. **Callback URL:** `https://YOUR-DOMAIN/api/webhooks/whatsapp`  
   (e.g. `https://speediq.vercel.app/api/webhooks/whatsapp`; for local testing use an ngrok URL — see [webhook-local-testing.md](./webhook-local-testing.md)).
4. **Verify token:** Use the **exact same** value as `WHATSAPP_VERIFY_TOKEN` in your env.
5. Click **Verify and save**.
6. Click **Manage** and subscribe to:
   - **messages** (required for chats, opt-in/opt-out, welcome/off-hours).
   - **message_template_status_update** (optional; for template approval status updates).

Without this, Meta never calls your app, so automated messages and opt-in/opt-out will not run.

---

## 3. Supabase: cron for campaign sending

So that **campaigns** are actually sent (and opted-out contacts are skipped):

1. **Enable extensions** (Supabase Dashboard → Database → Extensions):
   - **pg_cron**
   - **pg_net**

2. **Run the migration** that creates the cron job and config table:
   - `supabase/migrations/20250204_cron_whatsapp_send.sql`  
   (e.g. `supabase db push` or run the SQL in the Dashboard).

3. **Configure the cron** (SQL Editor in Supabase):

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

   Replace:
   - `YOUR_APP_URL` with your real app URL (e.g. `https://yourapp.vercel.app`).
   - `YOUR_CRON_SECRET` with the **same** value as `CRON_SECRET` in your app env.

Details: [cron-supabase.md](./cron-supabase.md).

---

## 4. Storage (for attachment responses)

Opt-out / Opt-in / Welcome / Off-hours messages can use **text or media**. For **images, video, audio, or files**:

- The app uses the Supabase bucket **`canned-message-attachments`**.
- The code **creates this bucket automatically** on first upload (if your Supabase project allows `storage.createBucket`).
- If your project restricts bucket creation, create the bucket manually: **Storage → New bucket** → name: `canned-message-attachments`, **private**.

No extra env vars are required for storage; Supabase is already configured via `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## 5. In-app: connect WhatsApp and configure settings

1. **Connect a WhatsApp Business number**  
   Dashboard → **Settings → WhatsApp account** → connect via Embedded Signup or manual (Phone Number ID, WABA ID, Access Token). Save.

2. **Opt-in & Opt-out** (same page, tab **Opt-in & Opt-out**):
   - Turn on **API Campaign Opt-out** if you want to exclude opted-out contacts from campaigns.
   - Set **Opt-out keywords** (e.g. Stop, Unsubscribe) and optional **Opt-out response**.
   - Set **Opt-in keywords** (e.g. Allow) and optional **Opt-in response**.  
   Save.

3. **Automated Messages** (tab **Automated Messages**):
   - **Welcome message:** enable and set text (or media) for first message during working hours.
   - **Off-hours message:** enable and set text (or media) for first message outside working hours.
   - **Working hours:** set timezone and per-day from/to.  
   Save.

4. **Refresh:** If you change settings from another device/tab, use **Refresh settings** on the tab to load the latest from the database.

---

## 6. Quick verification

- **Webhook:** Send a text (e.g. "Hi") from your phone to your WhatsApp Business number. The message should appear under **Dashboard → WhatsApp → Chats** for the right project. If you use opt-out keywords, send "Stop" (or your keyword) and confirm the contact is marked opted out and the opt-out response is sent (if configured).
- **Campaigns:** Create a campaign, add recipients, send. Opted-out contacts should be skipped (no message sent; recipient marked failed with reason `opt_out`). Check **Dashboard → WhatsApp → Campaigns** for status.
- **Welcome/Off-hours:** From a **new** number (or a contact that has never messaged you), send a first message. You should get the Welcome message (within working hours) or Off-hours message (outside), if enabled.

---

## Summary: what the code does (no extra work)

- **Opt-in/Opt-out:** Webhook matches keywords on inbound text, updates contact `opt_out`, sends optional response. Campaign send and audience count respect **Respect opt-out for campaigns** and contact `opt_out`.
- **Welcome / Off-hours:** Webhook sends only on the **first ever** inbound message from that contact, based on working hours and timezone.
- **Settings:** Stored in `whatsapp_account_settings`; UI reads/writes via API. Use **Refresh settings** to load changes made elsewhere.

All of the above is implemented; this checklist is only for **configuration and one-time setup**.
