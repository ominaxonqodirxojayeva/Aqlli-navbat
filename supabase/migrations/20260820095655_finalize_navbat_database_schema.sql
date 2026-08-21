/*
# Aqlli Navbat — Database schema to'g'rilash va mustahkamlash

1. Ustun qo'shish
   - navbat_queues: full_name (text, nullable) — foydalanuvchi ismi
   - navbat_queues: phone (text, nullable) — telefon raqami
   - navbat_queues: service_id ni nullable qilish (endi organization_id asosiy)

2. Queue settings RLS
   - navbat_queue_settings uchun INSERT policy qo'shish (admin uchun)
   - navbat_queue_settings uchun DELETE policy qo'shish (admin uchun)

3. Function yangilash
   - create_org_queue funksiyasini yangilash: full_name va phone ni saqlash

4. Realtime
   - navbat_queues va navbat_queue_settings jadvallari uchun realtime yoqilgan (avvaldan)

5. Security
   - navbat_queues: SELECT faqat o'z navbati yoki admin uchun (avvaldan)
   - navbat_queues: INSERT faqat o'zi uchun (avvaldan)
   - navbat_queues: UPDATE o'zi yoki admin uchun (avvaldan)
   - Telefon raqamlar himoyalangan — boshqa foydalanuvchilar ko'ra olmaydi
*/

-- ---------- navbat_queues: full_name va phone qo'shish ----------
ALTER TABLE navbat_queues ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE navbat_queues ADD COLUMN IF NOT EXISTS phone text;

-- service_id ni nullable qilish (organization_id asosiy bo'ldi)
ALTER TABLE navbat_queues ALTER COLUMN service_id DROP NOT NULL;

-- ---------- navbat_queue_settings: INSERT va DELETE policy ----------
DROP POLICY IF EXISTS "admin_insert_navbat_queue_settings" ON navbat_queue_settings;
CREATE POLICY "admin_insert_navbat_queue_settings" ON navbat_queue_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_navbat_queue_settings" ON navbat_queue_settings;
CREATE POLICY "admin_delete_navbat_queue_settings" ON navbat_queue_settings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ---------- Function: create_org_queue (yangilangan) ----------
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

  -- Atomic increment (row-level lock prevents duplicate numbers)
  UPDATE navbat_queue_settings
  SET current_number = current_number + 1,
      updated_at = now()
  WHERE id = v_settings_id
  RETURNING current_number, prefix INTO v_new_number, v_prefix;

  -- Count people ahead (waiting in same org, created before now)
  SELECT count(*) INTO v_people_ahead
  FROM navbat_queues
  WHERE organization_id = p_org_id
    AND status = 'waiting'
    AND created_at < now();

  v_estimated_wait := v_people_ahead * 5;
  v_queue_number := v_prefix || '-' || lpad(v_new_number::text, 3, '0');

  -- Insert queue with full_name and phone
  INSERT INTO navbat_queues (queue_number, organization_id, user_id, status, estimated_wait_time, full_name, phone)
  VALUES (v_queue_number, p_org_id, p_user_id, 'waiting', v_estimated_wait, p_full_name, p_phone)
  RETURNING id, queue_number, status, estimated_wait_time
  INTO id, queue_number, status, estimated_wait_time;

  RETURN NEXT;
END;
$$;

-- ---------- Ensure realtime is on ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'navbat_queues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE navbat_queues;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'navbat_queue_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE navbat_queue_settings;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'organizations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
  END IF;
END $$;