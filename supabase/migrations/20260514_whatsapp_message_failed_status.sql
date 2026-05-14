-- whatsapp_messages didn't allow status='failed' (CHECK constraint blocked it),
-- so Meta's "delivery failed" webhooks were being silently rejected. This let
-- approved-but-undeliverable templates (e.g. marketing templates blocked by
-- Meta's per-user delivery cap, error 131049) appear successful in the UI.
--
-- Adding 'failed' to the allowed values, plus columns for Meta's error code and
-- title so the cause of the failure is surfaced to users instead of guessed.

alter table public.whatsapp_messages
  drop constraint if exists whatsapp_messages_status_check;

alter table public.whatsapp_messages
  add constraint whatsapp_messages_status_check
  check (status in ('sent', 'delivered', 'read', 'failed'));

alter table public.whatsapp_messages
  add column if not exists error_code text;

alter table public.whatsapp_messages
  add column if not exists error_title text;

alter table public.whatsapp_messages
  add column if not exists template_id uuid references public.whatsapp_templates (id) on delete set null;

create index if not exists idx_whatsapp_messages_template
  on public.whatsapp_messages (template_id)
  where template_id is not null;

create index if not exists idx_whatsapp_messages_status
  on public.whatsapp_messages (project_id, status, created_at desc);
