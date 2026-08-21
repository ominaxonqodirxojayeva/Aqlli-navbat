/*
# Add organization-based queue system (clinics + banks)

1. Overview
   Extends the existing organizations table with slug, prefix, is_active columns.
   Adds organization_id to navbat_queues so each organization has its own independent queue counter.
   Creates a new atomic function create_org_queue that generates per-organization queue numbers.
   Seeds demo clinics and banks.

2. Schema changes
   - organizations: ADD slug (text, unique), prefix (text), is_active (boolean default true)
   - organizations: update type constraint to allow 'clinic' and 'bank'
   - navbat_queues: ADD organization_id (uuid, FK to organizations)
   - navbat_queue_settings: ADD organization_id (uuid, FK to organizations) for per-org counters

3. Functions
   - create_org_queue(p_org_id, p_user_id, p_full_name, p_phone):
     Atomic per-organization queue creation. Checks for active queue per user per org.
     Gets or creates queue_settings for that org. Increments counter. Generates queue_number.
     Returns queue details.

4. Security (RLS)
   - organizations: all authenticated + anon can read; admin can insert/update/delete

5. Seed data
   - 5 demo clinics: 1-son, 5-son, 12-son, Yunusobod, Chilonzor
   - 5 demo banks: Kapitalbank, Hamkorbank, Ipak Yo'li, Xalq Banki, Asakabank
*/

-- ---------- organizations: add new columns ----------
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS prefix text DEFAULT 'A';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update type constraint to allow clinic and bank
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_type_check
  CHECK (type IN ('BANK','HOSPITAL','clinic','bank'));

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_uniq ON organizations (slug) WHERE slug IS NOT NULL;

-- ---------- navbat_queues: add organization_id ----------
ALTER TABLE navbat_queues ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_navbat_queues_org_id ON navbat_queues(organization_id);

-- ---------- navbat_queue_settings: add organization_id ----------
ALTER TABLE navbat_queue_settings ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- ---------- RLS for organizations ----------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_organizations" ON organizations;
CREATE POLICY "read_organizations" ON organizations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_organizations" ON organizations;
CREATE POLICY "anon_read_organizations" ON organizations FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "admin_insert_organizations" ON organizations;
CREATE POLICY "admin_insert_organizations" ON organizations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_organizations" ON organizations;
CREATE POLICY "admin_update_organizations" ON organizations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_organizations" ON organizations;
CREATE POLICY "admin_delete_organizations" ON organizations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ---------- Function: create_org_queue (atomic per-org) ----------
CREATE OR REPLACE FUNCTION public.create_org_queue(
  p_org_id uuid,
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  queue_number text,
  status text,
  estimated_wait_time int,
  organization_name text,
  organization_prefix text
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
  v_people_ahead int;
  v_estimated_wait int;
  v_existing_count int;
  v_org_name text;
BEGIN
  -- Check for active queue for this user in this organization
  SELECT count(*) INTO v_existing_count
  FROM navbat_queues
  WHERE user_id = p_user_id
    AND organization_id = p_org_id
    AND status IN ('waiting', 'serving');

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'ACTIVE_QUEUE_EXISTS';
  END IF;

  -- Get org info
  SELECT name, prefix INTO v_org_name, v_prefix
  FROM organizations WHERE id = p_org_id;

  IF v_prefix IS NULL THEN
    v_prefix := 'A';
  END IF;

  -- Get or create queue_settings for this org
  SELECT id INTO v_settings_id
  FROM navbat_queue_settings
  WHERE organization_id = p_org_id
  LIMIT 1;

  IF v_settings_id IS NULL THEN
    INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
    VALUES (p_org_id, 0, v_prefix, true)
    RETURNING id INTO v_settings_id;
  END IF;

  -- Increment counter
  UPDATE navbat_queue_settings
  SET current_number = current_number + 1,
      updated_at = now()
  WHERE id = v_settings_id
  RETURNING current_number, prefix INTO v_new_number, v_prefix;

  -- Count people ahead (waiting in same org)
  SELECT count(*) INTO v_people_ahead
  FROM navbat_queues
  WHERE organization_id = p_org_id
    AND status = 'waiting'
    AND created_at < now();

  v_estimated_wait := v_people_ahead * 5;
  v_queue_number := v_prefix || '-' || lpad(v_new_number::text, 3, '0');

  INSERT INTO navbat_queues (queue_number, organization_id, user_id, status, estimated_wait_time)
  VALUES (v_queue_number, p_org_id, p_user_id, 'waiting', v_estimated_wait)
  RETURNING id, queue_number, status, estimated_wait_time
  INTO id, queue_number, status, estimated_wait_time;

  RETURN NEXT;
END;
$$;

-- ---------- Seed: demo clinics ----------
INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'c0000000-0000-0000-0000-000000000001', '1-son Poliklinika', 'clinic', 'clinic-1', 'P', true, '1-son poliklinika'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'clinic-1');

INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'c0000000-0000-0000-0000-000000000002', '5-son Poliklinika', 'clinic', 'clinic-5', 'P', true, '5-son poliklinika'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'clinic-5');

INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'c0000000-0000-0000-0000-000000000003', '12-son Poliklinika', 'clinic', 'clinic-12', 'P', true, '12-son poliklinika'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'clinic-12');

INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'c0000000-0000-0000-0000-000000000004', 'Yunusobod Poliklinikasi', 'clinic', 'clinic-yunusobod', 'P', true, 'Yunusobod poliklinikasi'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'clinic-yunusobod');

INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'c0000000-0000-0000-0000-000000000005', 'Chilonzor Poliklinikasi', 'clinic', 'clinic-chilonzor', 'P', true, 'Chilonzor poliklinikasi'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'clinic-chilonzor');

-- ---------- Seed: demo banks ----------
INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Kapitalbank', 'bank', 'bank-kapital', 'B', true, 'Kapitalbank'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'bank-kapital');

INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'b0000000-0000-0000-0000-000000000002', 'Hamkorbank', 'bank', 'bank-hamkor', 'B', true, 'Hamkorbank'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'bank-hamkor');

INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'b0000000-0000-0000-0000-000000000003', 'Ipak Yo''li Bank', 'bank', 'bank-ipak-yoli', 'B', true, 'Ipak Yo''li Bank'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'bank-ipak-yoli');

INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'b0000000-0000-0000-0000-000000000004', 'Xalq Banki', 'bank', 'bank-xalq', 'B', true, 'Xalq Banki'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'bank-xalq');

INSERT INTO organizations (id, name, type, slug, prefix, is_active, description)
SELECT 'b0000000-0000-0000-0000-000000000005', 'Asakabank', 'bank', 'bank-asaka', 'B', true, 'Asakabank'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'bank-asaka');

-- ---------- Seed: queue settings for each org ----------
INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'c0000000-0000-0000-0000-000000000001', 5, 'P', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'c0000000-0000-0000-0000-000000000001');

INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'c0000000-0000-0000-0000-000000000002', 3, 'P', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'c0000000-0000-0000-0000-000000000002');

INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'c0000000-0000-0000-0000-000000000003', 22, 'P', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'c0000000-0000-0000-0000-000000000003');

INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'c0000000-0000-0000-0000-000000000004', 8, 'P', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'c0000000-0000-0000-0000-000000000004');

INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'c0000000-0000-0000-0000-000000000005', 12, 'P', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'c0000000-0000-0000-0000-000000000005');

INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'b0000000-0000-0000-0000-000000000001', 13, 'B', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'b0000000-0000-0000-0000-000000000001');

INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'b0000000-0000-0000-0000-000000000002', 7, 'B', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'b0000000-0000-0000-0000-000000000002');

INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'b0000000-0000-0000-0000-000000000003', 4, 'B', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'b0000000-0000-0000-0000-000000000003');

INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'b0000000-0000-0000-0000-000000000004', 9, 'B', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'b0000000-0000-0000-0000-000000000004');

INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT 'b0000000-0000-0000-0000-000000000005', 6, 'B', true
WHERE NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE organization_id = 'b0000000-0000-0000-0000-000000000005');

-- ---------- Enable realtime for organizations ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'organizations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
  END IF;
END $$;