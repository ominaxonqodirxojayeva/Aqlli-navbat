/*
  # RLS tekshiruvi — migratsiyalardan keyin ishga tushiring

  Supabase Dashboard -> SQL Editor -> shu faylni to'liq nusxalab "Run".
  Har bir qator "OK" bo'lishi kerak. "XATO" chiqsa, migratsiya to'liq
  qo'llanmagan — 20260828120000 va 20260828120100 fayllarini qayta ishga tushiring.
*/

WITH checks AS (

  -- 1. Eng muhimi: mijoz o'z navbatining holatini o'zgartira olmasligi kerak
  SELECT
    'navbat_queues: mijozning erkin UPDATE policy''si olib tashlangan' AS tekshiruv,
    NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'navbat_queues'
        AND policyname = 'update_own_navbat_queues'
    ) AS natija

  UNION ALL
  -- 2. Rol yordamchi funksiyalari mavjud
  SELECT 'is_admin() funksiyasi mavjud',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'is_admin')

  UNION ALL
  SELECT 'is_org_admin() funksiyasi mavjud',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'is_org_admin')

  UNION ALL
  -- 3. Barcha muhim jadvallarda RLS yoqilgan
  SELECT 'barcha jadvallarda RLS yoqilgan',
         NOT EXISTS (
           SELECT 1 FROM pg_tables t
           JOIN pg_class c ON c.relname = t.tablename
           JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
           WHERE t.schemaname = 'public'
             AND t.tablename IN ('profiles', 'organizations', 'organization_members',
                                 'navbat_services', 'navbat_queues',
                                 'navbat_queue_settings', 'notifications')
             AND c.relrowsecurity = false
         )

  UNION ALL
  -- 4. Ko'p tashkilotlilik jadvali yaratilgan
  SELECT 'organization_members jadvali mavjud',
         EXISTS (SELECT 1 FROM pg_tables
                 WHERE schemaname = 'public' AND tablename = 'organization_members')

  UNION ALL
  -- 5. Xizmatlar tashkilotga bog'langan
  SELECT 'navbat_services.organization_id ustuni mavjud',
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'navbat_services'
                   AND column_name = 'organization_id')

  UNION ALL
  -- 6. Yangi RPC'lar o'rnatilgan
  SELECT 'cancel_my_queue() RPC mavjud',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'cancel_my_queue')

  UNION ALL
  SELECT 'admin_set_queue_status() RPC mavjud',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'admin_set_queue_status')

  UNION ALL
  SELECT 'get_my_queue_status() RPC mavjud',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'get_my_queue_status')

  UNION ALL
  SELECT 'admin_set_org_open() RPC mavjud',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'admin_set_org_open')

  UNION ALL
  -- 7. create_org_queue faqat bitta (5 argumentli) versiyada bo'lishi kerak
  SELECT 'create_org_queue() yagona versiyada',
         (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'create_org_queue') = 1

  UNION ALL
  -- 8. Har bir tashkilotda navbat sozlamalari bor
  SELECT 'har bir tashkilotda navbat sozlamasi bor',
         NOT EXISTS (
           SELECT 1 FROM organizations o
           WHERE NOT EXISTS (
             SELECT 1 FROM navbat_queue_settings s WHERE s.organization_id = o.id
           )
         )

  UNION ALL
  -- 9. Tashkilot turlari normallashtirilgan
  SELECT 'tashkilot turlari faqat clinic/bank',
         NOT EXISTS (SELECT 1 FROM organizations WHERE type NOT IN ('clinic', 'bank'))

  UNION ALL
  -- 10. Realtime yoqilgan
  SELECT 'navbat_queues realtime''da',
         EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'navbat_queues')

  UNION ALL
  -- 11. Seed yaratgan demo hisoblar o'chirilgan (paroli kodda ochiq edi)
  SELECT 'demo hisoblar (admin@timeflow.uz va h.k.) bazada yo''q',
         NOT EXISTS (
           SELECT 1 FROM auth.users
           WHERE email IN ('admin@timeflow.uz', 'staff@timeflow.uz', 'user@timeflow.uz')
         )

  UNION ALL
  -- 12. Rol qiymatlari normallashtirilgan ('ADMIN' kabi qoldiq yo'q)
  SELECT 'profiles.role faqat customer/admin',
         NOT EXISTS (SELECT 1 FROM profiles WHERE role NOT IN ('customer', 'admin'))
)

SELECT
  CASE WHEN natija THEN 'OK  ✓' ELSE 'XATO ✗' END AS holat,
  tekshiruv
FROM checks
ORDER BY natija, tekshiruv;
