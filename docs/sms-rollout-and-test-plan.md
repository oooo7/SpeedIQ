# SMS Rollout and Test Plan

## Feature Flag Rollout

- SMS enablement is controlled per project via `projects.sms_channel_enabled`.
- Until enabled, SMS campaign/contact/template/conversation APIs return a guarded error.
- Setup APIs remain accessible while disabled:
  - `/api/projects/:id/sms/account`
  - `/api/projects/:id/sms/settings`
  - `/api/projects/:id/sms/numbers`
- When SMS account onboarding is saved as `connected`, project flag is set to enabled.

## Environment Variables

- `TWILIO_ACCOUNT_SID`
- `TWILIO_OAUTH_CLIENT_ID`
- `TWILIO_OAUTH_CLIENT_SECRET`
- `TWILIO_OAUTH_SCOPE` (optional)
- `TWILIO_AUTH_TOKEN` (still required for webhook signature validation)
- `TWILIO_INBOUND_WEBHOOK_URL` (recommended)
- `TWILIO_STATUS_CALLBACK_URL` (recommended)
- `CRON_SECRET`

## Compliance Safeguards

- Campaign audience is filtered to contacts with:
  - `opt_out = false`
  - `consent_status = 'subscribed'`
- Inbound webhook updates consent state from Twilio Advanced Opt-Out:
  - `OptOutType=STOP` -> unsubscribed/opted out
  - `OptOutType=START` -> subscribed/opted in
  - `OptOutType=HELP` -> no duplicate response

## Manual Verification Checklist

1. **Setup**
   - Save Twilio account settings from `/dashboard/settings/sms`
   - Buy or attach a number from SMS numbers API
   - Confirm `sms_channel_enabled` is true for project

2. **Contacts**
   - Create contact manually
   - Import CSV contacts (`phone,name,email`)
   - Verify invalid phone rows are skipped

3. **Templates + Campaigns**
   - Create template with variables (`{{name}}`)
   - Create campaign with subscribed contacts
   - Run debug send and verify recipient statuses
   - Schedule campaign and verify cron moves it to `sending`

4. **Webhooks**
   - Send inbound SMS to Twilio number
   - Verify inbound message appears in `sms_messages` and conversation unread increases
   - Confirm status callback updates `sms_messages.status`
   - Confirm status callback updates `sms_campaign_recipients.status`

5. **Automation**
   - Send STOP from test phone and verify contact opt-out
   - Send START and verify opt-in
   - Send HELP and verify no duplicate auto-reply when `OptOutType` is present
   - Verify welcome/off-hours replies based on settings

6. **UI**
   - Confirm SMS appears in sidebar
   - Validate pages load:
     - `/dashboard/sms`
     - `/dashboard/sms/contacts`
     - `/dashboard/sms/templates`
     - `/dashboard/sms/campaigns`
     - `/dashboard/sms/live-chat`
     - `/dashboard/sms/analytics`
