-- Add optional profile picture URL for WhatsApp contacts (e.g. for display in live chat).
-- Meta Cloud API does not provide contact profile photos in webhooks; this allows storing a URL
-- from manual upload or future integrations.
alter table public.whatsapp_contacts
  add column if not exists profile_picture_url text;
