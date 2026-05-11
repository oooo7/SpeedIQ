-- Expand sms_campaigns.status to include paused and canceled

alter table public.sms_campaigns
  drop constraint if exists sms_campaigns_status_check;

alter table public.sms_campaigns
  add constraint sms_campaigns_status_check
  check (status in ('draft', 'scheduled', 'sending', 'paused', 'completed', 'failed', 'canceled'));
