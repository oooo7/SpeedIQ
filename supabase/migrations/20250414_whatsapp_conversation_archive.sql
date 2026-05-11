-- Add is_archived and is_deleted flags to whatsapp_conversations
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_archived
  ON whatsapp_conversations (project_id, is_archived, is_deleted, last_message_at DESC);
