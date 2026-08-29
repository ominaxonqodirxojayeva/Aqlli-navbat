/*
  # Demo hisoblarni olib tashlash va rol qiymatlarini normallashtirish

  ## Muammo

  `20260817095000_seed_demo_data.sql` migratsiyasi bazaga uchta haqiqiy
  foydalanuvchi yaratadi, paroli esa kod ichida ochiq matnda:

      admin@timeflow.uz / Password123!  -> profiles.role = 'ADMIN'
      staff@timeflow.uz / Password123!
      user@timeflow.uz  / Password123!

  `is_admin()` roli `lower(role) = 'admin'` bilan tekshirgani uchun 'ADMIN'
  ham mos keladi — ya'ni birinchi hisob to'liq huquqli superadmin bo'ladi.
  Repo ochiq, `email_confirmed_at` to'ldirilgan: hisob darhol ishlaydi.

  O'sha faylning sarlavhasida "[SUPERSEDED] ... not used by the current app"
  deb yozilgan, lekin bu eskirgan *sxemaga* tegishli — `INSERT INTO auth.users`
  bloki izohga olinmagan va migratsiya qo'llanganda baribir bajariladi.

  Eski migratsiya fayli tahrirlanmaydi (u allaqachon qo'llangan). O'rniga
  shu migratsiya undan keyin ishlab, hisoblarni o'chiradi. Toza bazada ham
  tartib saqlanadi: avval seed yaratadi, keyin shu fayl o'chiradi.

  ## Nima qilinadi

  1. Uchta demo hisob `auth.users` dan o'chiriladi. CASCADE orqali ularning
     `profiles`, `navbat_queues`, `staff` qatorlari ham ketadi.
  2. `profiles.role` qiymatlari normallashtiriladi: 'ADMIN' -> 'admin',
     qolgan eski qiymatlar ('USER', 'STAFF') -> 'customer'.
  3. `profiles_role_check` cheklovi faqat 'customer' va 'admin' ga toraytiriladi,
     shunda kelajakda 'ADMIN' kabi qiymat umuman yozilmaydi.

  ## Nima QILINMAYDI

  Seed yaratgan tashkilotlar (TimeFlow Bank, TimeFlow Medical, City Hospital,
  Central Clinic), filiallar va xizmatlar tegilmaydi — ular ma'lumot, xavf emas.
  Kerak bo'lsa admin panelidan o'chiring.
*/

-- =====================================================================
-- 1. Demo hisoblarni o'chirish
-- =====================================================================
DO $mig$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM auth.users
  WHERE email IN ('admin@timeflow.uz', 'staff@timeflow.uz', 'user@timeflow.uz');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    RAISE NOTICE 'Demo hisoblar o''chirildi: % ta', v_deleted;
  ELSE
    RAISE NOTICE 'Demo hisoblar topilmadi — bazada ular yo''q edi.';
  END IF;
END $mig$;


-- =====================================================================
-- 2. Rol qiymatlarini normallashtirish
-- =====================================================================

-- `on_profile_role_change` trigger'i superadmin bo'lmagan sessiyada rol
-- o'zgarishini bekor qiladi. Migratsiya `auth.uid()` siz ishlaydi, ya'ni
-- `is_admin()` false qaytaradi va quyidagi UPDATE jimgina yo'qqa chiqardi.
ALTER TABLE public.profiles DISABLE TRIGGER on_profile_role_change;

UPDATE public.profiles
SET role = CASE WHEN lower(role) = 'admin' THEN 'admin' ELSE 'customer' END
WHERE role NOT IN ('customer', 'admin');

ALTER TABLE public.profiles ENABLE TRIGGER on_profile_role_change;


-- =====================================================================
-- 3. Cheklovni toraytirish
-- =====================================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'admin'));

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'customer';
