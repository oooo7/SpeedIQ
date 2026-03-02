-- Add header_format and header_media_url for media headers (image, video, document, location).
-- Existing templates keep header_format = 'text' (the default).
alter table public.whatsapp_templates
  add column if not exists header_format text not null default 'text'
    check (header_format in ('text', 'image', 'video', 'document', 'location'));

alter table public.whatsapp_templates
  add column if not exists header_media_url text;

comment on column public.whatsapp_templates.header_format is
  'Header type: text (default), image, video, document, or location';
comment on column public.whatsapp_templates.header_media_url is
  'Public URL for image/video/document header sample (used in Meta submission)';
