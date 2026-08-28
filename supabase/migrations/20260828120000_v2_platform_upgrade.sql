/*
  # Aqlli Navbat v2 — xavfsizlik, ko'p tashkilotlilik va yangi imkoniyatlar

  Bu migratsiya oldingi barcha migratsiyalar ustiga qo'yiladi va ular qoldirgan
  kamchiliklarni yopadi. Idempotent — bir necha marta ishga tushirish xavfsiz.

  1. XAVFSIZLIK (kritik)
     - "update_own_navbat_queues" policy olib tashlanadi. U mijozga o'z
       navbatining `status` va `queue_number` ustunini erkin o'zgartirishga
       ruxsat berardi (o'zini "chaqirilgan" qilib qo'yish mumkin edi).
       O'rniga faqat `cancel_my_queue()` RPC qoladi.
     - Barcha admin policy'lari `public.is_admin()` / `public.is_org_admin()`
       ga o'tkaziladi (profiles RLS rekursiyasining oldini oladi).
     - `create_org_queue()` ning yagona, avtorizatsiya tekshiruvi bor versiyasi.
     - `profiles` uchun UPDATE policy + rolni o'zgartirishni bloklovchi trigger.

  2. KO'P TASHKILOTLILIK
     - `organization_members` jadvali: xodim qaysi tashkilotga biriktirilgan.
       Global `profiles.role = 'admin'` — superadmin (hamma tashkilotni ko'radi).

  3. XIZMATLAR TASHKILOTGA BOG'LANADI
     - `navbat_services.organization_id` qo'shiladi.
     - `average_time` endi haqiqatda kutish vaqtini hisoblashda ishlatiladi.

  4. YANGI RPC'LAR
     cancel_my_queue, admin_set_queue_status, admin_set_org_open,
     get_my_queue_status, get_public_org_state, get_org_stats,
     get_org_hourly_stats, get_org_daily_stats, get_org_breakdown,
     admin_delete_organization
*/

-- =====================================================================
-- 0. Tashkilot turlarini normallashtirish (BANK/HOSPITAL -> bank/clinic)
-- =====================================================================
UPDATE organizations SET type = 'clinic' WHERE upper(type) = 'HOSPITAL';
UPDATE organizations SET type = 'bank'   WHERE upper(type) = 'BANK';

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_type_check
  CHECK (type IN ('clinic', 'bank'));

ALTER TABLE organizations ALTER COLUMN is_active SET DEFAULT true;
UPDATE organizations SET is_active = true WHERE is_active IS NULL;


-- =====================================================================
-- 1. Rol yordamchilari
-- =====================================================================

-- Superadmin: profiles.role = 'admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND lower(role) = 'admin'
  );
$fn$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Tashkilot xodimlari
CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('owner', 'operator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);

-- Ushbu tashkilotni boshqara oladimi? (superadmin yoki shu tashkilot xodimi)
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $fn$
  SELECT public.is_admin()
      OR (
        p_org_id IS NOT NULL
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = p_org_id AND m.user_id = auth.uid()
        )
      );
$fn$;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

-- Umuman xodimmi? (admin panelga kirish huquqi bormi)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $fn$
  SELECT public.is_admin()
      OR (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.organization_members m WHERE m.user_id = auth.uid()
          ));
$fn$;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- organization_members policy'lari
DROP POLICY IF EXISTS "select_org_members" ON public.organization_members;
CREATE POLICY "select_org_members" ON public.organization_members FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "admin_write_org_members" ON public.organization_members;
CREATE POLICY "admin_write_org_members" ON public.organization_members FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- =====================================================================
-- 2. profiles — o'z profilini tahrirlash, lekin rolni emas
-- =====================================================================
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Rolni faqat superadmin o'zgartira oladi. RLS ichida tekshirib bo'lmaydi
-- (profiles policy ichidan profiles'ga so'rov rekursiya beradi) — trigger.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();


-- =====================================================================
-- 3. organizations policy'lari -> is_admin()
-- =====================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_organizations" ON organizations;
CREATE POLICY "read_organizations" ON organizations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_organizations" ON organizations;
CREATE POLICY "anon_read_organizations" ON organizations FOR SELECT
  TO anon USING (is_active = true);

DROP POLICY IF EXISTS "admin_insert_organizations" ON organizations;
CREATE POLICY "admin_insert_organizations" ON organizations FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_organizations" ON organizations;
CREATE POLICY "admin_update_organizations" ON organizations FOR UPDATE
  TO authenticated USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));

DROP POLICY IF EXISTS "admin_delete_organizations" ON organizations;
CREATE POLICY "admin_delete_organizations" ON organizations FOR DELETE
  TO authenticated USING (public.is_admin());


-- =====================================================================
-- 4. navbat_services — tashkilotga bog'lash
-- =====================================================================
ALTER TABLE navbat_services ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_navbat_services_org ON navbat_services(organization_id);

DROP POLICY IF EXISTS "read_navbat_services" ON navbat_services;
CREATE POLICY "read_navbat_services" ON navbat_services FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_navbat_services" ON navbat_services;
CREATE POLICY "anon_read_navbat_services" ON navbat_services FOR SELECT
  TO anon USING (is_active = true);

DROP POLICY IF EXISTS "admin_insert_navbat_services" ON navbat_services;
CREATE POLICY "admin_insert_navbat_services" ON navbat_services FOR INSERT
  TO authenticated WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "admin_update_navbat_services" ON navbat_services;
CREATE POLICY "admin_update_navbat_services" ON navbat_services FOR UPDATE
  TO authenticated USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "admin_delete_navbat_services" ON navbat_services;
CREATE POLICY "admin_delete_navbat_services" ON navbat_services FOR DELETE
  TO authenticated USING (public.is_org_admin(organization_id));

-- Xizmat o'chirilganda unga bog'langan navbatlar o'chib ketmasin (tarix saqlansin).
-- Boshlang'ich sxemada ON DELETE CASCADE edi.
DO $mig$
DECLARE
  v_conname text;
  v_attnum smallint;
BEGIN
  SELECT attnum INTO v_attnum FROM pg_attribute
  WHERE attrelid = 'public.navbat_queues'::regclass AND attname = 'service_id';

  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.navbat_queues'::regclass
    AND contype = 'f'
    AND conkey = ARRAY[v_attnum];

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.navbat_queues DROP CONSTRAINT %I', v_conname);
  END IF;

  ALTER TABLE public.navbat_queues
    ADD CONSTRAINT navbat_queues_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.navbat_services(id) ON DELETE SET NULL;
END $mig$;


-- =====================================================================
-- 5. navbat_queues policy'lari — KRITIK TUZATISH
-- =====================================================================

-- Mijoz o'z navbatining status/queue_number ustunini erkin o'zgartira olardi.
DROP POLICY IF EXISTS "update_own_navbat_queues" ON navbat_queues;
DROP POLICY IF EXISTS "read_navbat_queues" ON navbat_queues;

DROP POLICY IF EXISTS "select_own_navbat_queues" ON navbat_queues;
CREATE POLICY "select_own_navbat_queues" ON navbat_queues FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "insert_own_navbat_queues" ON navbat_queues;
CREATE POLICY "insert_own_navbat_queues" ON navbat_queues FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'waiting');

DROP POLICY IF EXISTS "admin_update_navbat_queues" ON navbat_queues;
CREATE POLICY "admin_update_navbat_queues" ON navbat_queues FOR UPDATE
  TO authenticated USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE INDEX IF NOT EXISTS idx_navbat_queues_org_status_created
  ON navbat_queues(organization_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_navbat_queues_user_created
  ON navbat_queues(user_id, created_at DESC);


-- =====================================================================
-- 6. navbat_queue_settings policy'lari
-- =====================================================================
DROP POLICY IF EXISTS "read_navbat_queue_settings" ON navbat_queue_settings;
CREATE POLICY "read_navbat_queue_settings" ON navbat_queue_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_navbat_queue_settings" ON navbat_queue_settings;
CREATE POLICY "admin_insert_navbat_queue_settings" ON navbat_queue_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "admin_update_navbat_queue_settings" ON navbat_queue_settings;
CREATE POLICY "admin_update_navbat_queue_settings" ON navbat_queue_settings FOR UPDATE
  TO authenticated USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "admin_delete_navbat_queue_settings" ON navbat_queue_settings;
CREATE POLICY "admin_delete_navbat_queue_settings" ON navbat_queue_settings FOR DELETE
  TO authenticated USING (public.is_org_admin(organization_id));

CREATE UNIQUE INDEX IF NOT EXISTS navbat_queue_settings_org_uniq
  ON navbat_queue_settings (organization_id)
  WHERE organization_id IS NOT NULL;

-- Har bir tashkilot uchun sozlama qatori mavjud bo'lsin
INSERT INTO navbat_queue_settings (organization_id, current_number, prefix, is_open)
SELECT o.id, 0, COALESCE(NULLIF(o.prefix, ''), 'A'), true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM navbat_queue_settings s WHERE s.organization_id = o.id
);


-- =====================================================================
-- 7. notifications
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS queue_id uuid
  REFERENCES public.navbat_queues(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications" ON public.notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Navbat holati o'zgarganda bildirishnoma yaratish
CREATE OR REPLACE FUNCTION public.notify_queue_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'serving' THEN
    INSERT INTO public.notifications (user_id, queue_id, title, body)
    VALUES (NEW.user_id, NEW.id, 'Navbatingiz keldi',
            'Raqamingiz ' || NEW.queue_number || '. Xizmat ko''rsatish joyiga boring.');
  ELSIF NEW.status = 'skipped' THEN
    INSERT INTO public.notifications (user_id, queue_id, title, body)
    VALUES (NEW.user_id, NEW.id, 'Navbat o''tkazib yuborildi',
            NEW.queue_number || ' raqamli navbatingiz o''tkazib yuborildi. Xodimga murojaat qiling.');
  ELSIF NEW.status = 'completed' THEN
    INSERT INTO public.notifications (user_id, queue_id, title, body)
    VALUES (NEW.user_id, NEW.id, 'Xizmat yakunlandi',
            NEW.queue_number || ' raqamli navbatingiz bo''yicha xizmat yakunlandi.');
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_queue_serving ON public.navbat_queues;
DROP TRIGGER IF EXISTS on_queue_status_change ON public.navbat_queues;
CREATE TRIGGER on_queue_status_change
  AFTER UPDATE OF status ON public.navbat_queues
  FOR EACH ROW EXECUTE FUNCTION public.notify_queue_status_change();
