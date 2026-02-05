-- Create whatsapp_accounts table with Embedded Signup support
-- Run this if the table doesn't exist yet

-- WhatsApp accounts: one per project
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  phone_number_id text NOT NULL,
  waba_id text NOT NULL,
  access_token text NOT NULL,
  phone_number text,
  display_name text,
  quality_rating text,
  tier text,
  -- Embedded Signup OAuth fields
  connection_type text DEFAULT 'manual' CHECK (connection_type IN ('manual', 'embedded_signup')),
  token_expires_at timestamptz,
  business_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_project_id ON public.whatsapp_accounts (project_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_token_expires ON public.whatsapp_accounts (token_expires_at) WHERE token_expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "WhatsApp accounts visible to project members"
  ON public.whatsapp_accounts FOR SELECT
  USING (public.user_can_access_project(project_id));

CREATE POLICY "Owners and admins can insert WhatsApp account"
  ON public.whatsapp_accounts FOR INSERT
  WITH CHECK (public.user_is_project_owner_or_admin(project_id));

CREATE POLICY "Owners and admins can update WhatsApp account"
  ON public.whatsapp_accounts FOR UPDATE
  USING (public.user_is_project_owner_or_admin(project_id));

CREATE POLICY "Owners and admins can delete WhatsApp account"
  ON public.whatsapp_accounts FOR DELETE
  USING (public.user_is_project_owner_or_admin(project_id));

-- Updated at trigger (assumes update_updated_at() function exists)
DROP TRIGGER IF EXISTS whatsapp_accounts_updated_at ON public.whatsapp_accounts;
CREATE TRIGGER whatsapp_accounts_updated_at
  BEFORE UPDATE ON public.whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Column comments
COMMENT ON COLUMN public.whatsapp_accounts.connection_type IS 'How the account was connected: manual or embedded_signup';
COMMENT ON COLUMN public.whatsapp_accounts.token_expires_at IS 'When the access token expires (null for manual/system tokens)';
COMMENT ON COLUMN public.whatsapp_accounts.business_id IS 'Meta Business ID associated with this WABA';
