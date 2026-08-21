/*
# TimeFlow AI — Demo data seed

1. Purpose
   Populate the platform with demo banks, hospitals, branches, services, and
   demo auth users (USER, STAFF, ADMIN) so the app is presentable on first load.

2. Data inserted
   - 3 banks: TimeFlow Bank (Chilonzor, Yunusobod, Sergeli)
   - 3 hospitals: TimeFlow Medical (Chilonzor), City Hospital (Yunusobod), Central Clinic (Sergeli)
   - Services per org type (bank: Karta, Kredit, Valyuta, Hisob, Konsultatsiya;
     hospital: Shifokor qabuli, UZI, Tahlil, Registratura, Konsultatsiya)
   - Demo auth users via auth.users insert + profile rows:
       admin@timeflow.uz   / Admin123!   (ADMIN)
       staff@timeflow.uz   / Staff123!   (STAFF)
       user@timeflow.uz    / User123!    (USER)
   - Staff assignment for staff@timeflow.uz to TimeFlow Bank Chilonzor.
   - Demo queue entries so live queue and dashboards have content.

3. Notes
   - auth.users rows are inserted directly with a fixed password hash. The
     handle_new_user trigger will also try to insert a profile; we use
     ON CONFLICT DO NOTHING and then upsert with the correct role.
   - Passwords are bcrypt-hashed (Supabase auth format) using the standard
     $2a$ hash of the demo password. Since we cannot compute bcrypt here,
     we use the auth.admin.createUser approach is not available in SQL, so
     we insert a pre-computed bcrypt hash. The hash below is for "Demo123!"
     style passwords — but to keep it simple and guaranteed working, we
     instead create users with a known bcrypt hash for "Password123!".
   - Actually, the simplest reliable approach: insert into auth.users with
     encrypted_password = crypt('Password123!', gen_salt('bf')) which uses
     Postgres pgcrypto's bcrypt — Supabase auth accepts this format.
*/

-- Insert demo auth users (idempotent by email)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
SELECT
  gen_random_uuid(),
  email,
  crypt(pwd, gen_salt('bf')),
  now(),
  now(),
  now(),
  jsonb_build_object('full_name', full_name, 'role', role)
FROM (VALUES
  ('admin@timeflow.uz', 'Password123!', 'Admin User', 'ADMIN'),
  ('staff@timeflow.uz', 'Password123!', 'Staff User', 'STAFF'),
  ('user@timeflow.uz',  'Password123!', 'Demo User',  'USER')
) AS t(email, pwd, full_name, role)
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = t.email);

-- Ensure profiles exist with correct roles (upsert, conflict on id won't work
-- since ids are random; match by email instead)
INSERT INTO profiles (id, full_name, role)
SELECT u.id, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'role'
FROM auth.users u
WHERE u.email IN ('admin@timeflow.uz','staff@timeflow.uz','user@timeflow.uz')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- ---------- organizations ----------
INSERT INTO organizations (id, name, type, description)
SELECT 'a0000000-0000-0000-0000-000000000001', 'TimeFlow Bank', 'BANK', 'Zamonaviy bank xizmatlari'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = 'a0000000-0000-0000-0000-000000000001');

INSERT INTO organizations (id, name, type, description)
SELECT 'a0000000-0000-0000-0000-000000000002', 'TimeFlow Medical', 'HOSPITAL', 'Tibbiy xizmatlar'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = 'a0000000-0000-0000-0000-000000000002');

INSERT INTO organizations (id, name, type, description)
SELECT 'a0000000-0000-0000-0000-000000000003', 'City Hospital', 'HOSPITAL', 'Shahar klinikasi'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = 'a0000000-0000-0000-0000-000000000003');

INSERT INTO organizations (id, name, type, description)
SELECT 'a0000000-0000-0000-0000-000000000004', 'Central Clinic', 'HOSPITAL', 'Markaziy klinik'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = 'a0000000-0000-0000-0000-000000000004');

-- ---------- branches ----------
INSERT INTO branches (id, organization_id, name, address, phone)
SELECT 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'TimeFlow Bank — Chilonzor', 'Chilonzor tumani, Toshkent', '+998 71 123 45 67'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'b0000000-0000-0000-0000-000000000001');

INSERT INTO branches (id, organization_id, name, address, phone)
SELECT 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'TimeFlow Bank — Yunusobod', 'Yunusobod tumani, Toshkent', '+998 71 234 56 78'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'b0000000-0000-0000-0000-000000000002');

INSERT INTO branches (id, organization_id, name, address, phone)
SELECT 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'TimeFlow Bank — Sergeli', 'Sergeli tumani, Toshkent', '+998 71 345 67 89'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'b0000000-0000-0000-0000-000000000003');

INSERT INTO branches (id, organization_id, name, address, phone)
SELECT 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'TimeFlow Medical — Chilonzor', 'Chilonzor, Toshkent', '+998 71 456 78 90'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'b0000000-0000-0000-0000-000000000004');

INSERT INTO branches (id, organization_id, name, address, phone)
SELECT 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'City Hospital — Yunusobod', 'Yunusobod, Toshkent', '+998 71 567 89 01'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'b0000000-0000-0000-0000-000000000005');

INSERT INTO branches (id, organization_id, name, address, phone)
SELECT 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 'Central Clinic — Sergeli', 'Sergeli, Toshkent', '+998 71 678 90 12'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 'b0000000-0000-0000-0000-000000000006');

-- ---------- services (bank) ----------
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Karta ochish', 'credit-card', 5
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000001');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Kredit', 'banknote', 12
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000002');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Valyuta', 'dollar-sign', 6
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000003');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Hisob ochish', 'landmark', 10
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000004');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Konsultatsiya', 'message-circle', 8
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000005');

-- ---------- services (hospital) ----------
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'Shifokor qabuli', 'stethoscope', 15
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000011');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'UZI', 'activity', 10
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000012');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'Tahlil', 'test-tube', 7
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000013');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000002', 'Registratura', 'clipboard', 4
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000014');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000002', 'Konsultatsiya', 'message-circle', 12
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000015');

-- City Hospital services
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000003', 'Shifokor qabuli', 'stethoscope', 15
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000021');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000003', 'UZI', 'activity', 10
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000022');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000003', 'Tahlil', 'test-tube', 7
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000023');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000003', 'Registratura', 'clipboard', 4
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000024');

-- Central Clinic services
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000004', 'Shifokor qabuli', 'stethoscope', 15
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000031');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000032', 'a0000000-0000-0000-0000-000000000004', 'UZI', 'activity', 10
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000032');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000033', 'a0000000-0000-0000-0000-000000000004', 'Tahlil', 'test-tube', 7
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000033');
INSERT INTO services (id, organization_id, name, icon, avg_duration_minutes)
SELECT 'c0000000-0000-0000-0000-000000000034', 'a0000000-0000-0000-0000-000000000004', 'Konsultatsiya', 'message-circle', 12
WHERE NOT EXISTS (SELECT 1 FROM services WHERE id = 'c0000000-0000-0000-0000-000000000034');

-- ---------- staff assignment ----------
INSERT INTO staff (user_id, branch_id, service_id, desk_number, is_active)
SELECT
  (SELECT id FROM auth.users WHERE email = 'staff@timeflow.uz'),
  'b0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002',
  1,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM staff s
  WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'staff@timeflow.uz')
    AND s.branch_id = 'b0000000-0000-0000-0000-000000000001'
);

-- ---------- demo queue + entries ----------
-- Create a queue for TimeFlow Bank Chilonzor / Kredit today
INSERT INTO queues (id, branch_id, service_id, queue_date, prefix, last_number, current_number, status)
SELECT 'd0000000-0000-0000-0000-000000000001',
       'b0000000-0000-0000-0000-000000000001',
       'c0000000-0000-0000-0000-000000000002',
       CURRENT_DATE,
       'A',
       127,
       121,
       'OPEN'
WHERE NOT EXISTS (SELECT 1 FROM queues WHERE id = 'd0000000-0000-0000-0000-000000000001');

-- Demo entries: a few waiting + the demo user at A-127
INSERT INTO queue_entries (id, queue_id, user_id, number, status, created_at)
SELECT 'e0000000-0000-0000-0000-000000000122',
       'd0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       122, 'WAITING',
       now() - interval '20 minutes'
WHERE NOT EXISTS (SELECT 1 FROM queue_entries WHERE id = 'e0000000-0000-0000-0000-000000000122');

INSERT INTO queue_entries (id, queue_id, user_id, number, status, created_at)
SELECT 'e0000000-0000-0000-0000-000000000123',
       'd0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       123, 'WAITING',
       now() - interval '18 minutes'
WHERE NOT EXISTS (SELECT 1 FROM queue_entries WHERE id = 'e0000000-0000-0000-0000-000000000123');

INSERT INTO queue_entries (id, queue_id, user_id, number, status, created_at)
SELECT 'e0000000-0000-0000-0000-000000000124',
       'd0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       124, 'WAITING',
       now() - interval '15 minutes'
WHERE NOT EXISTS (SELECT 1 FROM queue_entries WHERE id = 'e0000000-0000-0000-0000-000000000124');

INSERT INTO queue_entries (id, queue_id, user_id, number, status, created_at)
SELECT 'e0000000-0000-0000-0000-000000000125',
       'd0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       125, 'WAITING',
       now() - interval '12 minutes'
WHERE NOT EXISTS (SELECT 1 FROM queue_entries WHERE id = 'e0000000-0000-0000-0000-000000000125');

INSERT INTO queue_entries (id, queue_id, user_id, number, status, created_at)
SELECT 'e0000000-0000-0000-0000-000000000126',
       'd0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       126, 'WAITING',
       now() - interval '8 minutes'
WHERE NOT EXISTS (SELECT 1 FROM queue_entries WHERE id = 'e0000000-0000-0000-0000-000000000126');

INSERT INTO queue_entries (id, queue_id, user_id, number, status, created_at)
SELECT 'e0000000-0000-0000-0000-000000000127',
       'd0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       127, 'WAITING',
       now() - interval '5 minutes'
WHERE NOT EXISTS (SELECT 1 FROM queue_entries WHERE id = 'e0000000-0000-0000-0000-000000000127');

-- Completed entries for history
INSERT INTO queue_entries (id, queue_id, user_id, number, status, created_at, completed_at)
SELECT 'e0000000-0000-0000-0000-000000000100',
       'd0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       100, 'COMPLETED',
       now() - interval '2 days',
       now() - interval '2 days'
WHERE NOT EXISTS (SELECT 1 FROM queue_entries WHERE id = 'e0000000-0000-0000-0000-000000000100');

INSERT INTO queue_entries (id, queue_id, user_id, number, status, created_at, completed_at)
SELECT 'e0000000-0000-0000-0000-000000000101',
       'd0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       101, 'COMPLETED',
       now() - interval '2 days',
       now() - interval '2 days'
WHERE NOT EXISTS (SELECT 1 FROM queue_entries WHERE id = 'e0000000-0000-0000-0000-000000000101');

-- Rating for a completed entry
INSERT INTO ratings (queue_entry_id, user_id, score, comment)
SELECT 'e0000000-0000-0000-0000-000000000100',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       5, 'Juda tez va sifatli xizmat!'
WHERE NOT EXISTS (SELECT 1 FROM ratings WHERE queue_entry_id = 'e0000000-0000-0000-0000-000000000100');