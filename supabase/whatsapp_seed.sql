-- Seed: test contacts, segments, and templates for the first project.
-- Run after profiles.sql, projects.sql, team.sql, whatsapp.sql.
-- Only runs if at least one project exists.

DO $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT id INTO v_project_id FROM public.projects LIMIT 1;
  IF v_project_id IS NULL THEN
    RETURN;
  END IF;

  -- 20+ test contacts (skip if any already exist for this project to allow re-run)
  INSERT INTO public.whatsapp_contacts (project_id, phone, name, email, tags, source)
  SELECT v_project_id, phone, name, email, tags, source FROM (VALUES
    ('+15550010001', 'Alice Smith', 'alice@example.com', ARRAY['VIP', 'Engaged']::text[], 'import'),
    ('+15550010002', 'Bob Johnson', 'bob@example.com', ARRAY['VIP']::text[], 'import'),
    ('+15550010003', 'Carol Williams', 'carol@example.com', ARRAY['New Customer']::text[], 'manual'),
    ('+15550010004', 'David Brown', 'david@example.com', ARRAY[]::text[], 'import'),
    ('+15550010005', 'Eve Davis', 'eve@example.com', ARRAY['Engaged']::text[], 'campaign'),
    ('+15550010006', 'Frank Miller', 'frank@example.com', ARRAY['New Customer', 'Engaged']::text[], 'import'),
    ('+15550010007', 'Grace Wilson', 'grace@example.com', ARRAY['VIP']::text[], 'manual'),
    ('+15550010008', 'Henry Moore', 'henry@example.com', ARRAY[]::text[], 'import'),
    ('+15550010009', 'Ivy Taylor', 'ivy@example.com', ARRAY['Engaged']::text[], 'campaign'),
    ('+15550010010', 'Jack Anderson', 'jack@example.com', ARRAY['New Customer']::text[], 'import'),
    ('+15550010011', 'Kate Thomas', 'kate@example.com', ARRAY['VIP', 'Engaged']::text[], 'manual'),
    ('+15550010012', 'Leo Jackson', 'leo@example.com', ARRAY[]::text[], 'import'),
    ('+15550010013', 'Mia White', 'mia@example.com', ARRAY['New Customer']::text[], 'import'),
    ('+15550010014', 'Noah Harris', 'noah@example.com', ARRAY['Engaged']::text[], 'campaign'),
    ('+15550010015', 'Olivia Martin', 'olivia@example.com', ARRAY['VIP']::text[], 'import'),
    ('+15550010016', 'Paul Garcia', 'paul@example.com', ARRAY[]::text[], 'manual'),
    ('+15550010017', 'Quinn Martinez', 'quinn@example.com', ARRAY['New Customer', 'Engaged']::text[], 'import'),
    ('+15550010018', 'Rachel Robinson', 'rachel@example.com', ARRAY['VIP']::text[], 'import'),
    ('+15550010019', 'Sam Clark', 'sam@example.com', ARRAY['Engaged']::text[], 'campaign'),
    ('+15550010020', 'Tina Rodriguez', 'tina@example.com', ARRAY['New Customer']::text[], 'manual'),
    ('+15550010021', 'Uma Lewis', 'uma@example.com', ARRAY['VIP', 'New Customer']::text[], 'import'),
    ('+15550010022', 'Victor Lee', 'victor@example.com', ARRAY[]::text[], 'import')
  ) AS t(phone, name, email, tags, source)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.whatsapp_contacts c
    WHERE c.project_id = v_project_id AND c.phone = t.phone
  );

  -- Segments (skip if any segment already exists for this project)
  INSERT INTO public.contact_segments (project_id, name, filter_json)
  SELECT v_project_id, name, filter_json FROM (VALUES
    ('VIP Customers', '{"tags": ["VIP"]}'::jsonb),
    ('New Customers', '{"tags": ["New Customer"]}'::jsonb),
    ('Engaged', '{"tags": ["Engaged"]}'::jsonb),
    ('Imported', '{"source": "import"}'::jsonb),
    ('VIP or Engaged', '{"tags": ["VIP", "Engaged"]}'::jsonb)
  ) AS t(name, filter_json)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.contact_segments s
    WHERE s.project_id = v_project_id AND s.name = t.name
  );

  -- Templates (skip if any template with same name exists for this project)
  INSERT INTO public.whatsapp_templates (project_id, name, category, language, status, body, header, footer)
  SELECT v_project_id, name, category, language, status, body, header, footer FROM (VALUES
    ('hello_world', 'marketing', 'en', 'approved', 'Hello {{1}}! Welcome to our service. How can we help you today?', 'Welcome', 'Reply to get started.'),
    ('order_update', 'utility', 'en', 'approved', 'Hi {{1}}, your order #{{2}} has been shipped. Track it here: {{3}}', NULL, 'Thank you for shopping with us.'),
    ('appointment_reminder', 'utility', 'en', 'draft', 'Reminder: Your appointment is on {{1}} at {{2}}. Reply YES to confirm or CANCEL to reschedule.', 'Appointment', 'We look forward to seeing you.'),
    ('promo_offer', 'marketing', 'en', 'draft', 'Hi {{1}}! Get {{2}}% off your next order. Use code {{3}} at checkout. Valid until {{4}}.', 'Special Offer', 'Terms apply.'),
    ('otp_verification', 'authentication', 'en', 'draft', 'Your verification code is {{1}}. It expires in 10 minutes. Do not share this code.', NULL, NULL),
    ('support_ticket', 'utility', 'en', 'approved', 'Hi {{1}}, we have received your request (Ticket #{{2}}). Our team will get back to you within 24 hours.', 'Support', 'Thank you for contacting us.')
  ) AS t(name, category, language, status, body, header, footer)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.whatsapp_templates tm
    WHERE tm.project_id = v_project_id AND tm.name = t.name
  );

END $$;
