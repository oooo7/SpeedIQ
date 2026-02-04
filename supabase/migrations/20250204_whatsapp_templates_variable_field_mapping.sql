-- Map template variables ({{1}}, {{2}}, ...) to contact fields for dynamic values when sending.
-- variable_field_mapping[i] = field key for variable {{i+1}}.
-- Allowed keys: first_name, last_name, name, email, phone, custom:<key>
alter table public.whatsapp_templates
  add column if not exists variable_field_mapping jsonb default '[]';

comment on column public.whatsapp_templates.variable_field_mapping is
  'Array of contact field keys for body variables: first_name, last_name, name, email, phone, or custom:key';
