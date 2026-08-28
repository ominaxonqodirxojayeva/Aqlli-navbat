/*
  # Aqlli Navbat v2 — RPC funksiyalari

  Barcha yozish amallari endi shu funksiyalar orqali o'tadi. Jadvalga
  to'g'ridan-to'g'ri UPDATE qilish faqat tashkilot xodimiga qolgan
  (RLS: is_org_admin), mijoz esa faqat `cancel_my_queue()` ni chaqira oladi.

  Vaqt belgilari (called_at / completed_at) endi server vaqtida yoziladi —
  ilgari brauzer vaqti yuborilardi.
*/

-- =====================================================================
-- 1. Navbat olish — yagona, avtorizatsiya tekshiruvi bor versiya
-- =====================================================================

-- Eski 4 argumentli versiyani olib tashlaymiz, aks holda 5 argumentli
-- versiya bilan birga qolib, chaqiruvda "ambiguous function" xatosi chiqadi.
DROP FUNCTION IF EXISTS public.create_org_queue(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.create_org_queue(uuid, uuid, text, text, uuid);

CREATE FUNCTION public.create_org_queue(
  p_org_id uuid,
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_service_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  queue_number text,
  status text,
  estimated_wait_time int,
  organization_name text,
  organization_prefix text,
  service_name text,
  people_ahead int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_settings_id uuid;
  v_new_number int;
  v_queue_number text;
  v_prefix text;
  v_people_ahead int;
  v_org_name text;
  v_org_type text;
  v_service_name text;
  v_average_time int := 5;
  v_estimated int;
  v_queue_id uuid;
  v_is_open boolean;
BEGIN
  -- Boshqa odam nomidan navbat olishning oldini olamiz
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT o.name, o.type, o.prefix INTO v_org_name, v_org_type, v_prefix
  FROM organizations o
  WHERE o.id = p_org_id AND o.is_active = true;

  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'ORGANIZATION_NOT_FOUND';
  END IF;

  v_prefix := COALESCE(
    NULLIF(v_prefix, ''),
    CASE WHEN lower(v_org_type) = 'bank' THEN 'B' ELSE 'P' END
  );

  -- Bir vaqtda faqat bitta faol navbat (istalgan tashkilotda)
  IF EXISTS (
    SELECT 1 FROM navbat_queues q
    WHERE q.user_id = p_user_id AND q.status IN ('waiting', 'serving')
  ) THEN
    RAISE EXCEPTION 'ACTIVE_QUEUE_EXISTS';
  END IF;

  -- Tanlangan xizmat shu tashkilotga tegishli va faol bo'lishi kerak
  IF p_service_id IS NOT NULL THEN
    SELECT s.name, s.average_time INTO v_service_name, v_average_time
    FROM navbat_services s
    WHERE s.id = p_service_id
      AND s.is_active = true
      AND (s.organization_id = p_org_id OR s.organization_id IS NULL);

    IF v_service_name IS NULL THEN
      RAISE EXCEPTION 'SERVICE_NOT_FOUND';
    END IF;
    v_average_time := GREATEST(COALESCE(v_average_time, 5), 1);
  END IF;

  -- Sozlama qatorini olish yoki yaratish
  INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
  VALUES (p_org_id, 0, v_prefix, true)
  ON CONFLICT DO NOTHING;

  SELECT s.id, s.is_open INTO v_settings_id, v_is_open
  FROM navbat_queue_settings s
  WHERE s.organization_id = p_org_id
  FOR UPDATE;

  IF v_settings_id IS NULL THEN
    RAISE EXCEPTION 'ORGANIZATION_NOT_FOUND';
  END IF;

  IF NOT v_is_open THEN
    RAISE EXCEPTION 'QUEUE_CLOSED';
  END IF;

  -- Raqamni atomik oshirish (qator qulflangan — dublikat raqam bo'lmaydi)
  UPDATE navbat_queue_settings s
  SET current_number = s.current_number + 1, updated_at = now()
  WHERE s.id = v_settings_id
  RETURNING s.current_number, s.prefix INTO v_new_number, v_prefix;

  SELECT count(*)::int INTO v_people_ahead
  FROM navbat_queues q
  WHERE q.organization_id = p_org_id AND q.status = 'waiting';

  v_estimated := v_people_ahead * v_average_time;
  v_queue_number := v_prefix || '-' || lpad(v_new_number::text, 3, '0');

  INSERT INTO navbat_queues (
    queue_number, organization_id, service_id, user_id,
    status, estimated_wait_time, full_name, phone
  )
  VALUES (
    v_queue_number, p_org_id, p_service_id, p_user_id,
    'waiting', v_estimated, p_full_name, p_phone
  )
  RETURNING navbat_queues.id INTO v_queue_id;

  RETURN QUERY SELECT
    v_queue_id, v_queue_number, 'waiting'::text, v_estimated,
    v_org_name, v_prefix, v_service_name, v_people_ahead;
END;
$fn$;
REVOKE ALL ON FUNCTION public.create_org_queue(uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_org_queue(uuid, uuid, text, text, uuid) TO authenticated;


-- =====================================================================
-- 2. Mijoz o'z navbatini bekor qiladi (yagona ruxsat etilgan o'zgartirish)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cancel_my_queue(p_queue_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_updated int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  UPDATE navbat_queues q
  SET status = 'cancelled', completed_at = now()
  WHERE q.id = p_queue_id
    AND q.user_id = auth.uid()
    AND q.status IN ('waiting', 'serving');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'QUEUE_NOT_CANCELLABLE';
  END IF;
  RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.cancel_my_queue(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_my_queue(uuid) TO authenticated;


-- =====================================================================
-- 3. Xodim navbat holatini o'zgartiradi (server vaqti bilan)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_set_queue_status(
  p_queue_id uuid,
  p_status text
)
RETURNS TABLE (id uuid, queue_number text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org_id uuid;
  v_current text;
BEGIN
  IF p_status NOT IN ('serving', 'completed', 'skipped', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT q.organization_id, q.status INTO v_org_id, v_current
  FROM navbat_queues q WHERE q.id = p_queue_id FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'QUEUE_NOT_FOUND';
  END IF;
  IF NOT public.is_org_admin(v_org_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF v_current NOT IN ('waiting', 'serving') THEN
    RAISE EXCEPTION 'QUEUE_ALREADY_CLOSED';
  END IF;

  UPDATE navbat_queues q
  SET status = p_status,
      called_at = CASE WHEN p_status = 'serving' THEN now() ELSE q.called_at END,
      completed_at = CASE WHEN p_status IN ('completed', 'skipped', 'cancelled')
                          THEN now() ELSE q.completed_at END
  WHERE q.id = p_queue_id;

  RETURN QUERY
  SELECT q.id, q.queue_number, q.status
  FROM navbat_queues q WHERE q.id = p_queue_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_set_queue_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_queue_status(uuid, text) TO authenticated;


-- =====================================================================
-- 4. Keyingi mijozni chaqirish (tashkilot doirasida)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_next_org_queue(p_org_id uuid)
RETURNS TABLE (id uuid, queue_number text, status text, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_serving_id uuid;
  v_next_id uuid;
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  -- Hozir xizmatdagini yakunlaymiz
  SELECT q.id INTO v_serving_id
  FROM navbat_queues q
  WHERE q.organization_id = p_org_id AND q.status = 'serving'
  ORDER BY q.called_at NULLS LAST, q.created_at
  LIMIT 1 FOR UPDATE;

  IF v_serving_id IS NOT NULL THEN
    UPDATE navbat_queues q
    SET status = 'completed', completed_at = now()
    WHERE q.id = v_serving_id;
  END IF;

  -- Keyingisini chaqiramiz
  SELECT q.id INTO v_next_id
  FROM navbat_queues q
  WHERE q.organization_id = p_org_id AND q.status = 'waiting'
  ORDER BY q.created_at, q.id
  LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF v_next_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE navbat_queues q
  SET status = 'serving', called_at = now()
  WHERE q.id = v_next_id;

  RETURN QUERY
  SELECT q.id, q.queue_number, q.status, q.user_id
  FROM navbat_queues q WHERE q.id = v_next_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_next_org_queue(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_next_org_queue(uuid) TO authenticated;


-- =====================================================================
-- 5. Navbat qabulini ochish / yopish
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_set_org_open(
  p_org_id uuid,
  p_is_open boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_prefix text;
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT COALESCE(NULLIF(o.prefix, ''), 'A') INTO v_prefix
  FROM organizations o WHERE o.id = p_org_id;

  INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
  VALUES (p_org_id, 0, COALESCE(v_prefix, 'A'), p_is_open)
  ON CONFLICT DO NOTHING;

  UPDATE navbat_queue_settings s
  SET is_open = p_is_open, updated_at = now()
  WHERE s.organization_id = p_org_id;

  RETURN p_is_open;
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_set_org_open(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_org_open(uuid, boolean) TO authenticated;


-- =====================================================================
-- 6. Mijozning joriy navbati — bitta so'rovda hamma narsa
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_my_queue_status()
RETURNS TABLE (
  id uuid,
  queue_number text,
  status text,
  created_at timestamptz,
  called_at timestamptz,
  organization_id uuid,
  organization_name text,
  organization_type text,
  organization_slug text,
  service_name text,
  average_time int,
  people_ahead int,
  serving_number text,
  estimated_wait_minutes int,
  is_open boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH mine AS (
    SELECT q.*
    FROM navbat_queues q
    WHERE q.user_id = v_uid AND q.status IN ('waiting', 'serving')
    ORDER BY q.created_at
    LIMIT 1
  )
  SELECT
    m.id,
    m.queue_number,
    m.status,
    m.created_at,
    m.called_at,
    m.organization_id,
    o.name,
    o.type,
    o.slug,
    s.name,
    COALESCE(s.average_time, 5)::int,
    ahead.cnt::int,
    serving.queue_number,
    (CASE WHEN m.status = 'serving' THEN 0
          ELSE ahead.cnt * COALESCE(s.average_time, 5) END)::int,
    COALESCE(st.is_open, true)
  FROM mine m
  LEFT JOIN organizations o ON o.id = m.organization_id
  LEFT JOIN navbat_services s ON s.id = m.service_id
  LEFT JOIN navbat_queue_settings st ON st.organization_id = m.organization_id
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM navbat_queues w
    WHERE w.organization_id = m.organization_id
      AND w.status = 'waiting'
      AND w.created_at < m.created_at
  ) ahead ON true
  LEFT JOIN LATERAL (
    SELECT sv.queue_number
    FROM navbat_queues sv
    WHERE sv.organization_id = m.organization_id AND sv.status = 'serving'
    ORDER BY sv.called_at DESC NULLS LAST
    LIMIT 1
  ) serving ON true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_my_queue_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_queue_status() TO authenticated;


-- =====================================================================
-- 7. Ochiq display (login talab qilmaydi)
-- =====================================================================
DROP FUNCTION IF EXISTS public.get_public_org_display(uuid);
CREATE FUNCTION public.get_public_org_display(p_org_id uuid)
RETURNS TABLE (id uuid, queue_number text, status text, service_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT q.id, q.queue_number, q.status, s.name
  FROM public.navbat_queues q
  JOIN public.organizations o ON o.id = q.organization_id
  LEFT JOIN public.navbat_services s ON s.id = q.service_id
  WHERE q.organization_id = p_org_id
    AND o.is_active = true
    AND q.status IN ('waiting', 'serving')
  ORDER BY (q.status = 'serving') DESC, q.called_at DESC NULLS LAST, q.created_at ASC;
$fn$;
REVOKE ALL ON FUNCTION public.get_public_org_display(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_org_display(uuid) TO anon, authenticated;

-- Tashkilotning umumiy holati (navbat ochiqmi, nechta kutmoqda)
CREATE OR REPLACE FUNCTION public.get_public_org_state(p_org_id uuid)
RETURNS TABLE (is_open boolean, waiting_count int, serving_number text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    COALESCE(st.is_open, true),
    (SELECT count(*)::int FROM public.navbat_queues q
      WHERE q.organization_id = p_org_id AND q.status = 'waiting'),
    (SELECT q.queue_number FROM public.navbat_queues q
      WHERE q.organization_id = p_org_id AND q.status = 'serving'
      ORDER BY q.called_at DESC NULLS LAST LIMIT 1)
  FROM public.organizations o
  LEFT JOIN public.navbat_queue_settings st ON st.organization_id = o.id
  WHERE o.id = p_org_id AND o.is_active = true;
$fn$;
REVOKE ALL ON FUNCTION public.get_public_org_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_org_state(uuid) TO anon, authenticated;


-- =====================================================================
-- 8. Statistika — serverda hisoblanadi
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_org_stats(
  p_org_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  total int,
  waiting int,
  serving int,
  completed int,
  skipped int,
  cancelled int,
  avg_wait_minutes numeric,
  avg_service_minutes numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.is_org_admin(p_org_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT
    (count(*))::int,
    (count(*) FILTER (WHERE q.status = 'waiting'))::int,
    (count(*) FILTER (WHERE q.status = 'serving'))::int,
    (count(*) FILTER (WHERE q.status = 'completed'))::int,
    (count(*) FILTER (WHERE q.status = 'skipped'))::int,
    (count(*) FILTER (WHERE q.status = 'cancelled'))::int,
    COALESCE(ROUND(
      (AVG((EXTRACT(EPOCH FROM (q.called_at - q.created_at)))::numeric / 60.0)
       FILTER (WHERE q.called_at IS NOT NULL)), 1), 0),
    COALESCE(ROUND(
      (AVG((EXTRACT(EPOCH FROM (q.completed_at - q.called_at)))::numeric / 60.0)
       FILTER (WHERE q.called_at IS NOT NULL AND q.completed_at IS NOT NULL
                 AND q.status = 'completed')), 1), 0)
  FROM navbat_queues q
  WHERE q.created_at >= p_from AND q.created_at < p_to
    AND (p_org_id IS NULL OR q.organization_id = p_org_id);
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_org_stats(uuid, timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_org_hourly_stats(
  p_org_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (hour int, total int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.is_org_admin(p_org_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT g.h::int, COALESCE(c.cnt, 0)::int
  FROM generate_series(0, 23) AS g(h)
  LEFT JOIN (
    SELECT EXTRACT(HOUR FROM q.created_at)::int AS hr, count(*) AS cnt
    FROM navbat_queues q
    WHERE q.created_at >= p_from AND q.created_at < p_to
      AND (p_org_id IS NULL OR q.organization_id = p_org_id)
    GROUP BY 1
  ) c ON c.hr = g.h
  ORDER BY g.h;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_org_hourly_stats(uuid, timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_org_daily_stats(
  p_org_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (day date, total int, completed int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.is_org_admin(p_org_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT g.d::date,
         COALESCE(c.total, 0)::int,
         COALESCE(c.completed, 0)::int
  FROM generate_series(p_from::date, (p_to - interval '1 day')::date, interval '1 day') AS g(d)
  LEFT JOIN (
    SELECT q.created_at::date AS dd,
           count(*) AS total,
           count(*) FILTER (WHERE q.status = 'completed') AS completed
    FROM navbat_queues q
    WHERE q.created_at >= p_from AND q.created_at < p_to
      AND (p_org_id IS NULL OR q.organization_id = p_org_id)
    GROUP BY 1
  ) c ON c.dd = g.d::date
  ORDER BY g.d;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_org_daily_stats(uuid, timestamptz, timestamptz) TO authenticated;

-- Tashkilotlar kesimida (faqat foydalanuvchi ko'ra oladigan tashkilotlar)
CREATE OR REPLACE FUNCTION public.get_org_breakdown(
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (organization_id uuid, organization_name text, total int, completed int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT o.id, o.name,
         COALESCE(c.total, 0)::int,
         COALESCE(c.completed, 0)::int
  FROM organizations o
  LEFT JOIN (
    SELECT q.organization_id AS oid,
           count(*) AS total,
           count(*) FILTER (WHERE q.status = 'completed') AS completed
    FROM navbat_queues q
    WHERE q.created_at >= p_from AND q.created_at < p_to
    GROUP BY 1
  ) c ON c.oid = o.id
  WHERE public.is_org_admin(o.id)
  ORDER BY o.name;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.get_org_breakdown(timestamptz, timestamptz) TO authenticated;


-- =====================================================================
-- 9. Tashkilotni o'chirish — faol navbat bo'lsa ruxsat berilmaydi
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_delete_organization(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM navbat_queues q
    WHERE q.organization_id = p_org_id AND q.status IN ('waiting', 'serving')
  ) THEN
    RAISE EXCEPTION 'ORG_HAS_ACTIVE_QUEUES';
  END IF;

  DELETE FROM organizations WHERE id = p_org_id;
  RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_delete_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_organization(uuid) TO authenticated;


-- =====================================================================
-- 10. Bildirishnomalarni o'qilgan deb belgilash
-- =====================================================================
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  UPDATE notifications n
  SET is_read = true
  WHERE n.user_id = auth.uid() AND n.is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;


-- =====================================================================
-- 11. Realtime
-- =====================================================================
DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'navbat_queues') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.navbat_queues;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'navbat_queue_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.navbat_queue_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'organizations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
  END IF;
END $mig$;
