-- Add retry tracking to email campaign recipients
ALTER TABLE public.email_campaign_recipients
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- Reset failed recipients with retry_count < 3 back to pending so the cron picks them up again.
-- (Safe to run multiple times — only affects retryable rows.)
UPDATE public.email_campaign_recipients
SET status = 'pending', retry_count = retry_count
WHERE status = 'failed' AND retry_count < 3;
