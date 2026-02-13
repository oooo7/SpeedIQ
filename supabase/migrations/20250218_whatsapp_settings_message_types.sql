-- Add message type and attachment support for opt-in/opt-out and automated messages (like canned messages).

alter table public.whatsapp_account_settings
  add column if not exists opt_out_response_type text default 'text' check (opt_out_response_type in ('text', 'image', 'video', 'audio', 'file')),
  add column if not exists opt_out_response_attachment_path text,
  add column if not exists opt_out_response_attachment_filename text,
  add column if not exists opt_in_response_type text default 'text' check (opt_in_response_type in ('text', 'image', 'video', 'audio', 'file')),
  add column if not exists opt_in_response_attachment_path text,
  add column if not exists opt_in_response_attachment_filename text,
  add column if not exists welcome_message_type text default 'text' check (welcome_message_type in ('text', 'image', 'video', 'audio', 'file')),
  add column if not exists welcome_message_attachment_path text,
  add column if not exists welcome_message_attachment_filename text,
  add column if not exists off_hours_message_type text default 'text' check (off_hours_message_type in ('text', 'image', 'video', 'audio', 'file')),
  add column if not exists off_hours_message_attachment_path text,
  add column if not exists off_hours_message_attachment_filename text;

comment on column public.whatsapp_account_settings.opt_out_response_type is 'Message type: text, image, video, audio, or file (document).';
comment on column public.whatsapp_account_settings.opt_out_response_attachment_path is 'Storage path for media (bucket: canned-message-attachments, prefix project_id/whatsapp-settings/).';
comment on column public.whatsapp_account_settings.opt_in_response_type is 'Message type for opt-in response.';
comment on column public.whatsapp_account_settings.welcome_message_type is 'Message type for welcome message.';
comment on column public.whatsapp_account_settings.off_hours_message_type is 'Message type for off-hours message.';
