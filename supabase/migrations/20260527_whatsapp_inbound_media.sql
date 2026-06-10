-- Inbound WhatsApp media support.
--
-- Until now the inbound webhook only stored text (and media captions) into
-- whatsapp_messages, so the live chat showed nothing for images, voice notes,
-- video, documents, stickers, location, etc. This migration adds the columns
-- needed to persist downloaded media + structured payloads, and widens the
-- `type` CHECK so non-text message types (which previously failed the insert
-- silently) can be stored.

-- 1. New columns for stored media + structured payloads.
alter table public.whatsapp_messages
  add column if not exists media_path text;       -- object key in the whatsapp-media storage bucket
alter table public.whatsapp_messages
  add column if not exists mime_type text;         -- e.g. image/jpeg, audio/ogg, application/pdf
alter table public.whatsapp_messages
  add column if not exists media_filename text;    -- original filename (documents)
alter table public.whatsapp_messages
  add column if not exists payload jsonb;          -- structured data for location/contacts/reaction/etc.

comment on column public.whatsapp_messages.media_path is
  'Storage object key in the whatsapp-media bucket for downloaded inbound/outbound media. Served via the media proxy route, never exposed publicly.';
comment on column public.whatsapp_messages.payload is
  'Structured, non-binary message data (location lat/lng, contact cards, reaction emoji, unsupported raw type).';

-- 2. Widen the type CHECK constraint. The original allowed only
--    ('text','image','document','audio','video','location'); any other type
--    (sticker, contacts, reaction, interactive, button, ...) violated the
--    constraint and the webhook insert was dropped silently.
alter table public.whatsapp_messages
  drop constraint if exists whatsapp_messages_type_check;

alter table public.whatsapp_messages
  add constraint whatsapp_messages_type_check
  check (type in (
    'text', 'image', 'document', 'audio', 'video', 'sticker',
    'location', 'contacts', 'reaction', 'interactive', 'button',
    'order', 'system', 'unsupported'
  ));
