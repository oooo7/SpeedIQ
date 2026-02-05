-- Migration: Add Embedded Signup support to whatsapp_accounts
-- This enables automatic WhatsApp account connection via Meta's OAuth flow
-- Safe to run multiple times (idempotent)

-- Add connection_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'whatsapp_accounts'
    AND column_name = 'connection_type'
  ) THEN
    ALTER TABLE public.whatsapp_accounts
    ADD COLUMN connection_type text DEFAULT 'manual';

    ALTER TABLE public.whatsapp_accounts
    ADD CONSTRAINT whatsapp_accounts_connection_type_check
    CHECK (connection_type IN ('manual', 'embedded_signup'));
  END IF;
END $$;

-- Add token_expires_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'whatsapp_accounts'
    AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE public.whatsapp_accounts
    ADD COLUMN token_expires_at timestamptz;
  END IF;
END $$;

-- Add business_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'whatsapp_accounts'
    AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.whatsapp_accounts
    ADD COLUMN business_id text;
  END IF;
END $$;

-- Create index for token expiry monitoring (for future token refresh jobs)
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_token_expires
  ON public.whatsapp_accounts (token_expires_at)
  WHERE token_expires_at IS NOT NULL;

-- Update existing records to be marked as manual connections
UPDATE public.whatsapp_accounts
SET connection_type = 'manual'
WHERE connection_type IS NULL;

-- Add column comments
COMMENT ON COLUMN public.whatsapp_accounts.connection_type IS 'How the account was connected: manual or embedded_signup';
COMMENT ON COLUMN public.whatsapp_accounts.token_expires_at IS 'When the access token expires (null for manual/system tokens)';
COMMENT ON COLUMN public.whatsapp_accounts.business_id IS 'Meta Business ID associated with this WABA';
