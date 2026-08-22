-- Harden the organization queue flow without changing the existing UI schema.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND lower(role) = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "read_organizations" ON organizations;
CREATE POLICY "read_organizations" ON organizations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "read_navbat_queues" ON navbat_queues;
DROP POLICY IF EXISTS "select_own_navbat_queues" ON navbat_queues;
CREATE POLICY "select_own_navbat_queues" ON navbat_queues FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "admin_update_navbat_queues" ON navbat_queues;
CREATE POLICY "admin_update_navbat_queues" ON navbat_queues FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_navbat_queue_settings" ON navbat_queue_settings;
CREATE POLICY "admin_update_navbat_queue_settings" ON navbat_queue_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE UNIQUE INDEX IF NOT EXISTS navbat_queue_settings_org_uniq
  ON navbat_queue_settings (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Foydalanuvchi'),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    'customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
  v_org_name text;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT name, prefix INTO v_org_name, v_prefix
  FROM organizations
  WHERE id = p_org_id AND is_active = true;
  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'ORGANIZATION_NOT_FOUND';
  END IF;
  v_prefix := COALESCE(NULLIF(v_prefix, ''), CASE WHEN lower((SELECT type FROM organizations WHERE id = p_org_id)) = 'bank' THEN 'B' ELSE 'P' END);

  IF EXISTS (
    SELECT 1 FROM navbat_queues
    WHERE user_id = p_user_id AND status IN ('waiting', 'serving')
  ) THEN
    RAISE EXCEPTION 'ACTIVE_QUEUE_EXISTS';
  END IF;

  INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
  VALUES (p_org_id, 0, v_prefix, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_settings_id
  FROM navbat_queue_settings
  WHERE organization_id = p_org_id
  FOR UPDATE;

  IF NOT EXISTS (SELECT 1 FROM navbat_queue_settings WHERE id = v_settings_id AND is_open) THEN
    RAISE EXCEPTION 'QUEUE_CLOSED';
  END IF;

  UPDATE navbat_queue_settings
  SET current_number = current_number + 1, updated_at = now()
  WHERE id = v_settings_id
  RETURNING current_number, prefix INTO v_new_number, v_prefix;

  SELECT count(*) INTO v_people_ahead
  FROM navbat_queues
  WHERE organization_id = p_org_id AND status = 'waiting';

  v_queue_number := v_prefix || '-' || lpad(v_new_number::text, 3, '0');
  INSERT INTO navbat_queues (queue_number, organization_id, user_id, status, estimated_wait_time, full_name, phone)
  VALUES (v_queue_number, p_org_id, p_user_id, 'waiting', v_people_ahead * 5, p_full_name, p_phone)
  RETURNING navbat_queues.id, navbat_queues.queue_number, navbat_queues.status, navbat_queues.estimated_wait_time
  INTO id, queue_number, status, estimated_wait_time;

  organization_name := v_org_name;
  organization_prefix := v_prefix;
  RETURN NEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_org_queue(uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_next_org_queue(p_org_id uuid)
RETURNS TABLE (id uuid, queue_number text, status text, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serving_id uuid;
  v_next_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

  SELECT q.id INTO v_serving_id
  FROM navbat_queues q
  WHERE q.organization_id = p_org_id AND q.status = 'serving'
  ORDER BY q.called_at NULLS LAST, q.created_at
  LIMIT 1 FOR UPDATE;

  IF v_serving_id IS NOT NULL THEN
    UPDATE navbat_queues
    SET status = 'completed', completed_at = now()
    WHERE navbat_queues.id = v_serving_id;
  END IF;

  SELECT q.id INTO v_next_id
  FROM navbat_queues q
  WHERE q.organization_id = p_org_id AND q.status = 'waiting'
  ORDER BY q.created_at, q.id
  LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF v_next_id IS NULL THEN RETURN; END IF;

  UPDATE navbat_queues
  SET status = 'serving', called_at = now()
  WHERE navbat_queues.id = v_next_id
  RETURNING navbat_queues.id, navbat_queues.queue_number, navbat_queues.status, navbat_queues.user_id
  INTO id, queue_number, status, user_id;
  RETURN NEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_next_org_queue(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_queue_serving()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'serving' AND OLD.status IS DISTINCT FROM 'serving' THEN
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (NEW.user_id, 'Navbatingiz keldi', 'Raqamingiz ' || NEW.queue_number || '. Xizmat ko''rsatish joyiga boring.');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_queue_serving ON public.navbat_queues;
CREATE TRIGGER on_queue_serving
  AFTER UPDATE OF status ON public.navbat_queues
  FOR EACH ROW EXECUTE FUNCTION public.notify_queue_serving();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'navbat_queues') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.navbat_queues;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_org_display(p_org_id uuid)
RETURNS TABLE (id uuid, queue_number text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.queue_number, q.status
  FROM public.navbat_queues q
  JOIN public.organizations o ON o.id = q.organization_id
  WHERE q.organization_id = p_org_id
    AND o.is_active = true
    AND q.status IN ('waiting', 'serving')
  ORDER BY (q.status = 'serving') DESC, q.created_at ASC;
$$;
REVOKE ALL ON FUNCTION public.get_public_org_display(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_org_display(uuid) TO anon, authenticated;
