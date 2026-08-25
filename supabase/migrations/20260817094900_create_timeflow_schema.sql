/*
# [SUPERSEDED] Early "TimeFlow AI" schema draft — not used by the current app.
# The app now runs on the `navbat_*` tables (see 20260817104342_create_navbat_schema.sql
# onward: organizations, navbat_queues, navbat_queue_settings, notifications).
# Kept as-is (not deleted/renamed) so migration history stays intact for any
# project this already ran against. Do not build new features on this schema.

# TimeFlow AI — Core schema

1. Overview
   Queue management platform for banks and hospitals. Users reserve queues online,
   track wait times live, check in via QR, and rate services. Staff call and serve
   customers; admins manage branches, services, staff, and view analytics.

2. New Tables
   - profiles, organizations, branches, services, staff, queues, queue_entries,
     checkins, ratings, notifications

3. Security
   - RLS enabled on every table with ownership checks.
   - Profiles: own row read/update; admin reads all.
   - Orgs/branches/services: all authenticated read; admin writes.
   - Staff: self or admin read; admin writes.
   - Queues: all read; staff/admin update; admin insert.
   - Queue entries: own or branch-staff or admin read; own insert/update/delete;
     staff/admin update.
   - Checkins: own or admin read; staff/admin insert.
   - Ratings: own or admin read; own insert.
   - Notifications: own read/update/insert.

4. Notes
   - Profile auto-created on signup via trigger (role from metadata, default USER).
   - Ticket numbers issued atomically via SECURITY DEFINER function to prevent
     duplicates under concurrency.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'Foydalanuvchi',
  phone text,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','STAFF','ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- ---------- organizations ----------
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('BANK','HOSPITAL')),
  description text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_organizations" ON organizations;
CREATE POLICY "read_organizations" ON organizations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_organizations" ON organizations;
CREATE POLICY "admin_write_organizations" ON organizations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );
DROP POLICY IF EXISTS "admin_update_organizations" ON organizations;
CREATE POLICY "admin_update_organizations" ON organizations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );
DROP POLICY IF EXISTS "admin_delete_organizations" ON organizations;
CREATE POLICY "admin_delete_organizations" ON organizations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- ---------- branches ----------
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  open_time time DEFAULT '09:00',
  close_time time DEFAULT '18:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_branches" ON branches;
CREATE POLICY "read_branches" ON branches FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_branches" ON branches;
CREATE POLICY "admin_write_branches" ON branches FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );
DROP POLICY IF EXISTS "admin_update_branches" ON branches;
CREATE POLICY "admin_update_branches" ON branches FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );
DROP POLICY IF EXISTS "admin_delete_branches" ON branches;
CREATE POLICY "admin_delete_branches" ON branches FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- ---------- services ----------
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  avg_duration_minutes int NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_services" ON services;
CREATE POLICY "read_services" ON services FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_services" ON services;
CREATE POLICY "admin_write_services" ON services FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );
DROP POLICY IF EXISTS "admin_update_services" ON services;
CREATE POLICY "admin_update_services" ON services FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );
DROP POLICY IF EXISTS "admin_delete_services" ON services;
CREATE POLICY "admin_delete_services" ON services FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- ---------- staff ----------
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  desk_number int DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_staff_self_or_admin" ON staff;
CREATE POLICY "read_staff_self_or_admin" ON staff FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "admin_write_staff" ON staff;
CREATE POLICY "admin_write_staff" ON staff FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );
DROP POLICY IF EXISTS "admin_update_staff" ON staff;
CREATE POLICY "admin_update_staff" ON staff FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );
DROP POLICY IF EXISTS "admin_delete_staff" ON staff;
CREATE POLICY "admin_delete_staff" ON staff FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- ---------- queues ----------
CREATE TABLE IF NOT EXISTS queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  queue_date date NOT NULL DEFAULT CURRENT_DATE,
  prefix text NOT NULL DEFAULT 'A',
  last_number int NOT NULL DEFAULT 0,
  current_number int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_queues" ON queues;
CREATE POLICY "read_queues" ON queues FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_update_queues" ON queues;
CREATE POLICY "staff_update_queues" ON queues FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.user_id = auth.uid() AND s.branch_id = queues.branch_id
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.user_id = auth.uid() AND s.branch_id = queues.branch_id
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "admin_insert_queues" ON queues;
CREATE POLICY "admin_insert_queues" ON queues FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP INDEX IF EXISTS queues_unique_branch_service_day;
CREATE UNIQUE INDEX IF NOT EXISTS queues_unique_branch_service_day
  ON queues (branch_id, service_id, queue_date)
  WHERE status = 'OPEN';

-- ---------- queue_entries ----------
CREATE TABLE IF NOT EXISTS queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  number int NOT NULL,
  status text NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','CALLED','SERVING','COMPLETED','CANCELLED','SKIPPED')),
  checked_in boolean NOT NULL DEFAULT false,
  called_at timestamptz,
  served_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_or_branch_entries" ON queue_entries;
CREATE POLICY "select_own_or_branch_entries" ON queue_entries FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff s
      JOIN queues q ON q.id = queue_entries.queue_id
      WHERE s.user_id = auth.uid() AND q.branch_id = s.branch_id
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "insert_own_entry" ON queue_entries;
CREATE POLICY "insert_own_entry" ON queue_entries FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_entry" ON queue_entries;
CREATE POLICY "update_own_entry" ON queue_entries FOR UPDATE
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "staff_update_entries" ON queue_entries;
CREATE POLICY "staff_update_entries" ON queue_entries FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN queues q ON q.id = queue_entries.queue_id
      WHERE s.user_id = auth.uid() AND q.branch_id = s.branch_id
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN queues q ON q.id = queue_entries.queue_id
      WHERE s.user_id = auth.uid() AND q.branch_id = s.branch_id
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "delete_own_entry" ON queue_entries;
CREATE POLICY "delete_own_entry" ON queue_entries FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_queue_entries_queue_id ON queue_entries(queue_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_user_id ON queue_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status);

-- ---------- checkins ----------
CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id uuid NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
  scanned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_checkins" ON checkins;
CREATE POLICY "read_own_checkins" ON checkins FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM queue_entries qe WHERE qe.id = checkins.queue_entry_id AND qe.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "staff_insert_checkins" ON checkins;
CREATE POLICY "staff_insert_checkins" ON checkins FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN queues q ON q.id = (SELECT queue_id FROM queue_entries WHERE id = checkins.queue_entry_id)
      WHERE s.user_id = auth.uid() AND q.branch_id = s.branch_id
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- ---------- ratings ----------
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id uuid NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_or_admin_ratings" ON ratings;
CREATE POLICY "read_own_or_admin_ratings" ON ratings FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "insert_own_rating" ON ratings;
CREATE POLICY "insert_own_rating" ON ratings FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ---------- notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'INFO',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_notifications" ON notifications;
CREATE POLICY "read_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ---------- trigger: create profile on signup ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Foydalanuvchi'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'USER')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- function: get or create today's queue ----------
CREATE OR REPLACE FUNCTION public.get_or_create_queue(p_branch_id uuid, p_service_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_id uuid;
  v_prefix text;
BEGIN
  SELECT prefix INTO v_prefix FROM services WHERE id = p_service_id;
  IF v_prefix IS NULL THEN
    v_prefix := 'A';
  END IF;

  SELECT id INTO v_queue_id
  FROM queues
  WHERE branch_id = p_branch_id AND service_id = p_service_id AND queue_date = CURRENT_DATE
  LIMIT 1;

  IF v_queue_id IS NULL THEN
    INSERT INTO queues (branch_id, service_id, queue_date, prefix, last_number, current_number, status)
    VALUES (p_branch_id, p_service_id, CURRENT_DATE, v_prefix, 0, 0, 'OPEN')
    RETURNING id INTO v_queue_id;
  END IF;

  RETURN v_queue_id;
END;
$$;

-- ---------- function: issue next ticket number ----------
CREATE OR REPLACE FUNCTION public.issue_ticket_number(p_queue_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_number int;
BEGIN
  UPDATE queues
  SET last_number = last_number + 1
  WHERE id = p_queue_id
  RETURNING last_number INTO v_new_number;

  RETURN v_new_number;
END;
$$;