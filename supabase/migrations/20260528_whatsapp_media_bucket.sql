-- Provision the private storage bucket that holds downloaded WhatsApp media.
--
-- The inbound webhook creates this lazily via ensureWhatsAppMediaBucket(), but
-- that call was requesting a 100MB file_size_limit which EXCEEDS the project's
-- default 50MB global upload limit, so createBucket failed every time and the
-- bucket was never created — every inbound image/voice/doc rendered as an empty
-- "Photo" placeholder. Creating it here (within the global limit) makes media
-- storage work deterministically, independent of the lazy path.
--
-- 50MB matches the known-good canned-message-attachments bucket and covers all
-- WhatsApp media (images ≤5MB; audio/video/documents ≤16MB). To allow larger
-- files, raise the project's global storage limit first, then bump this value.

insert into storage.buckets (id, name, public, file_size_limit)
values ('whatsapp-media', 'whatsapp-media', false, 52428800)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;
