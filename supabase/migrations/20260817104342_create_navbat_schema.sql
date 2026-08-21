/*
# Aqlli Navbat — New schema for queue management

1. Overview
   Creates core tables for "Aqlli Navbat" (Smart Queue) platform.
   - profiles: add email column, update role constraint for customer/admin
   - navbat_services: service types with prefix and average_time
   - navbat_queue_settings: per-service current_number counter + is_open
   - navbat_queues: individual queue entries (tickets) with status tracking

2. Security (RLS)
   - profiles: customers read/update own; admins read all
   - navbat_services: all authenticated read; admin write
   - navbat_queue_settings: all authenticated read; admin update
   - navbat_queues: customers read/insert/cancel own; admins read all + update status

3. Functions
   - get_navbat_settings(service_id): get or create settings row
   - create_navbat_queue(service_id, user_id): atomic queue creation with number generation
     and active-queue check
*/

-- ---------- profiles: add email, update role constraint ----------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('USER','STAFF','ADMIN','customer','admin'));

-- ---------- navbat_services ----------
CREATE TABLE IF NOT EXISTS navbat_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  average_time int NOT NULL DEFAULT 5,
  prefix text NOT NULL DEFAULT 'A',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE navbat_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_navbat_services" ON navbat_services;
CREATE POLICY "read_navbat_services" ON navbat_services FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_navbat_services" ON navbat_services;
CREATE POLICY "admin_insert_navbat_services" ON navbat_services FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_navbat_services" ON navbat_services;
CREATE POLICY "admin_update_navbat_services" ON navbat_services FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_navbat_services" ON navbat_services;
CREATE POLICY "admin_delete_navbat_services" ON navbat_services FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ---------- navbat_queue_settings ----------
CREATE TABLE IF NOT EXISTS navbat_queue_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES navbat_services(id) ON DELETE CASCADE,
  current_number int NOT NULL DEFAULT 0,
  prefix text NOT NULL DEFAULT 'A',
  is_open boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE navbat_queue_settings ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS navbat_queue_settings_service_uniq
  ON navbat_queue_settings (service_id);

DROP POLICY IF EXISTS "read_navbat_queue_settings" ON navbat_queue_settings;
CREATE POLICY "read_navbat_queue_settings" ON navbat_queue_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_navbat_queue_settings" ON navbat_queue_settings;
CREATE POLICY "admin_update_navbat_queue_settings" ON navbat_queue_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ---------- navbat_queues ----------
CREATE TABLE IF NOT EXISTS navbat_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_number text NOT NULL,
  service_id uuid NOT NULL REFERENCES navbat_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','serving','completed','skipped','cancelled')),
  estimated_wait_time int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  called_at timestamptz,
  completed_at timestamptz
);
ALTER TABLE navbat_queues ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_navbat_queues_user_id ON navbat_queues(user_id);
CREATE INDEX IF NOT EXISTS idx_navbat_queues_service_id ON navbat_queues(service_id);
CREATE INDEX IF NOT EXISTS idx_navbat_queues_status ON navbat_queues(status);

DROP POLICY IF EXISTS "select_own_navbat_queues" ON navbat_queues;
CREATE POLICY "select_own_navbat_queues" ON navbat_queues FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_own_navbat_queues" ON navbat_queues;
CREATE POLICY "insert_own_navbat_queues" ON navbat_queues FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_navbat_queues" ON navbat_queues;
CREATE POLICY "update_own_navbat_queues" ON navbat_queues FOR UPDATE
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_update_navbat_queues" ON navbat_queues;
CREATE POLICY "admin_update_navbat_queues" ON navbat_queues FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ---------- Function: get or create queue settings ----------
CREATE OR REPLACE FUNCTION public.get_navbat_settings(p_service_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings_id uuid;
  v_prefix text;
BEGIN
  SELECT prefix INTO v_prefix FROM navbat_services WHERE id = p_service_id;
  IF v_prefix IS NULL THEN
    v_prefix := 'A';
  END IF;

  SELECT id INTO v_settings_id
  FROM navbat_queue_settings
  WHERE service_id = p_service_id
  LIMIT 1;

  IF v_settings_id IS NULL THEN
    INSERT INTO navbat_queue_settings (service_id, current_number, prefix, is_open)
    VALUES (p_service_id, 0, v_prefix, true)
    RETURNING id INTO v_settings_id;
  END IF;

  RETURN v_settings_id;
END;
$$;

-- ---------- Function: create navbat queue (atomic) ----------
CREATE OR REPLACE FUNCTION public.create_navbat_queue(p_service_id uuid, p_user_id uuid)
RETURNS TABLE (
  id uuid,
  queue_number text,
  status text,
  estimated_wait_time int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings_id uuid;
  v_new_number int;
  v_queue_number text;
  v_prefix text;
  v_avg_time int;
  v_people_ahead int;
  v_estimated_wait int;
  v_existing_count int;
BEGIN
  SELECT count(*) INTO v_existing_count
  FROM navbat_queues
  WHERE user_id = p_user_id
    AND status IN ('waiting', 'serving');

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'ACTIVE_QUEUE_EXISTS';
  END IF;

  v_settings_id := public.get_navbat_settings(p_service_id);

  UPDATE navbat_queue_settings
  SET current_number = current_number + 1,
      updated_at = now()
  WHERE id = v_settings_id
  RETURNING current_number, prefix INTO v_new_number, v_prefix;

  SELECT average_time INTO v_avg_time FROM navbat_services WHERE id = p_service_id;
  IF v_avg_time IS NULL THEN v_avg_time := 5; END IF;

  SELECT count(*) INTO v_people_ahead
  FROM navbat_queues
  WHERE service_id = p_service_id
    AND status = 'waiting'
    AND created_at < now();

  v_estimated_wait := v_people_ahead * v_avg_time;
  v_queue_number := v_prefix || '-' || lpad(v_new_number::text, 3, '0');

  INSERT INTO navbat_queues (queue_number, service_id, user_id, status, estimated_wait_time)
  VALUES (v_queue_number, p_service_id, p_user_id, 'waiting', v_estimated_wait)
  RETURNING id, queue_number, status, estimated_wait_time
  INTO id, queue_number, status, estimated_wait_time;

  RETURN NEXT;
END;
$$;

-- ---------- Seed: default services ----------
INSERT INTO navbat_services (id, name, description, average_time, prefix, is_active)
SELECT 'f0000000-0000-0000-0000-000000000001', 'Pasport xizmati', 'Pasport va ID karta bilan bog''liq xizmatlar', 10, 'P', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_services WHERE id = 'f0000000-0000-0000-0000-000000000001');

INSERT INTO navbat_services (id, name, description, average_time, prefix, is_active)
SELECT 'f0000000-0000-0000-0000-000000000002', 'Hujjat topshirish', 'Hujjatlarni topshirish va qabul qilish', 7, 'H', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_services WHERE id = 'f0000000-0000-0000-0000-000000000002');

INSERT INTO navbat_services (id, name, description, average_time, prefix, is_active)
SELECT 'f0000000-0000-0000-0000-000000000003', 'Maslahat', 'Konsultatsiya va maslahat berish', 5, 'M', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_services WHERE id = 'f0000000-0000-0000-0000-000000000003');

INSERT INTO navbat_services (id, name, description, average_time, prefix, is_active)
SELECT 'f0000000-0000-0000-0000-000000000004', 'To''lov', 'Turli to''lov operatsiyalari', 3, 'T', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_services WHERE id = 'f0000000-0000-0000-0000-000000000004');

INSERT INTO navbat_services (id, name, description, average_time, prefix, is_active)
SELECT 'f0000000-0000-0000-0000-000000000005', 'Ma''lumotnoma olish', 'Ma''lumotnoma va spravanka olish', 4, 'S', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_services WHERE id = 'f0000000-0000-0000-0000-000000000005');

-- ---------- Seed: queue settings for each service ----------
INSERT INTO navbat_queue_settings (service_id, current_number, prefix, is_open)
SELECT 'f0000000-0000-0000-0000-000000000001', 23, 'P', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE service_id = 'f0000000-0000-0000-0000-000000000001');

INSERT INTO navbat_queue_settings (service_id, current_number, prefix, is_open)
SELECT 'f0000000-0000-0000-0000-000000000002', 15, 'H', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE service_id = 'f0000000-0000-0000-0000-000000000002');

INSERT INTO navbat_queue_settings (service_id, current_number, prefix, is_open)
SELECT 'f0000000-0000-0000-0000-000000000003', 8, 'M', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE service_id = 'f0000000-0000-0000-0000-000000000003');

INSERT INTO navbat_queue_settings (service_id, current_number, prefix, is_open)
SELECT 'f0000000-0000-0000-0000-000000000004', 42, 'T', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE service_id = 'f0000000-0000-0000-0000-000000000004');

INSERT INTO navbat_queue_settings (service_id, current_number, prefix, is_open)
SELECT 'f0000000-0000-0000-0000-000000000005', 12, 'S', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE service_id = 'f0000000-0000-0000-0000-000000000005');

-- ---------- Seed: demo queues ----------
INSERT INTO navbat_queues (queue_number, service_id, user_id, status, estimated_wait_time, created_at)
SELECT 'P-021', 'f0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       'completed', 20, now() - interval '1 hour'
WHERE NOT EXISTS (SELECT 1 FROM navbat_queues WHERE queue_number = 'P-021' AND service_id = 'f0000000-0000-0000-0000-000000000001');

INSERT INTO navbat_queues (queue_number, service_id, user_id, status, estimated_wait_time, created_at, called_at, completed_at)
SELECT 'P-022', 'f0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       'completed', 15, now() - interval '30 minutes', now() - interval '20 minutes', now() - interval '10 minutes'
WHERE NOT EXISTS (SELECT 1 FROM navbat_queues WHERE queue_number = 'P-022' AND service_id = 'f0000000-0000-0000-0000-000000000001');

INSERT INTO navbat_queues (queue_number, service_id, user_id, status, estimated_wait_time, created_at, called_at)
SELECT 'P-023', 'f0000000-0000-0000-0000-000000000001',
       (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz'),
       'serving', 0, now() - interval '5 minutes', now() - interval '2 minutes'
WHERE NOT EXISTS (SELECT 1 FROM navbat_queues WHERE queue_number = 'P-023' AND service_id = 'f0000000-0000-0000-0000-000000000001');

-- ---------- Update demo profile roles ----------
UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@timeflow.uz');
UPDATE profiles SET role = 'customer' WHERE id = (SELECT id FROM auth.users WHERE email = 'user@timeflow.uz');