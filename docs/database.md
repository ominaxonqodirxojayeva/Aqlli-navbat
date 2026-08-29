# Baza: sxema, RLS va migratsiyalar

## Migratsiyalarni qo'llash

`supabase/migrations/` dagi fayllar **nom (sana) tartibida** qo'llanadi.
Barchasi idempotent — qayta ishga tushirish xavfsiz.

```bash
supabase db push          # yoki har bir faylni SQL Editor'da "Run"
```

| Fayl | Nima qiladi |
| --- | --- |
| `20260817094900_create_timeflow_schema.sql` | Dastlabki `profiles`, `organizations`, `branches`, `services` |
| `20260817095000_seed_demo_data.sql` | Demo ma'lumotlar |
| `20260817104342_create_navbat_schema.sql` | `navbat_services`, `navbat_queue_settings`, `navbat_queues` |
| `20260818092537_enable_navbat_realtime.sql` | Realtime publication |
| `20260820093326_make_service_id_nullable.sql` | `service_id` ixtiyoriy |
| `20260820093351_add_organizations_and_org_queues.sql` | `slug`, `prefix`, `is_active`; navbatni tashkilotga bog'lash |
| `20260820095655_finalize_navbat_database_schema.sql` | `full_name`, `phone`; settings policy'lari |
| `20260821120000_harden_aqlli_navbat.sql` | `is_admin()`, policy'larni mustahkamlash |
| `20260822100000_fix_profiles_rls_recursion.sql` | `profiles` RLS rekursiyasini tuzatish |
| **`20260828120000_v2_platform_upgrade.sql`** | **v2:** ko'p tashkilotlilik, kritik RLS tuzatish, `notifications` |
| **`20260828120100_v2_rpc_functions.sql`** | **v2:** barcha RPC funksiyalari |
| **`20260829120000_remove_demo_accounts.sql`** | Seed yaratgan demo hisoblarni o'chiradi, rollarni normallashtiradi |

Qo'llagandan keyin **albatta** `supabase/tests/rls_check.sql` ni ishga
tushiring — har bir qator `OK` bo'lishi kerak. `XATO` chiqsa oxirgi ikki
migratsiya to'liq qo'llanmagan.

> **Ogohlantirish — seed va demo hisoblar.**
> `20260817095000_seed_demo_data.sql` bazaga namunaviy tashkilot/xizmatlar
> bilan birga **uchta foydalanuvchi hisobi** ham yaratadi va ularning paroli
> fayl ichida ochiq matnda yozilgan (`Password123!`). Ulardan biri —
> `admin@timeflow.uz` — `role = 'ADMIN'` oladi, `is_admin()` esa
> `lower(role) = 'admin'` ni tekshirgani uchun bu **to'liq huquqli
> superadmin** bo'lib chiqadi.
>
> Faylning sarlavhasidagi `[SUPERSEDED] ... not used by the current app`
> izohi faqat eskirgan *sxemaga* tegishli — `INSERT INTO auth.users` bloki
> baribir bajariladi.
>
> `20260829120000_remove_demo_accounts.sql` shu hisoblarni o'chiradi va
> `profiles.role` cheklovini `customer`/`admin` bilan chegaralaydi. Migratsiyani
> qo'llagach `supabase/tests/rls_check.sql` dagi 11- va 12-tekshiruv buni
> tasdiqlaydi.
>
> Yangi seed yozsangiz — **hech qachon** unga login/parol qo'ymang.

> Eski migratsiyalardagi `profiles.role` cheklovi (`USER`/`STAFF`/`ADMIN`) va
> `organizations.type` (`BANK`/`HOSPITAL`) v2 da normallashtirilgan:
> rol `admin`/`customer` (kichik harf), tur `clinic`/`bank`. Eski qatorlar
> migratsiya ichida `UPDATE` bilan ko'chiriladi.

---

## Jadvallar

### `profiles`
Foydalanuvchi profili, `auth.users(id)` ga bog'langan.

| Ustun | Tur | Izoh |
| --- | --- | --- |
| `id` | uuid PK | = `auth.users.id` |
| `full_name` | text | |
| `phone` | text | |
| `email` | text | |
| `role` | text | `customer` / `admin` (`admin` = superadmin); CHECK bilan cheklangan |
| `created_at` | timestamptz | |

**RLS:** o'z qatorini SELECT/UPDATE qila oladi, superadmin — hammasini.
INSERT faqat o'zi uchun.

**`on_profile_role_change` trigger'i:** superadmin bo'lmagan foydalanuvchi
`role` ni o'zgartirsa, o'zgarish jimgina bekor qilinadi (`NEW.role := OLD.role`).
Buni RLS ichida qilib bo'lmaydi — `profiles` policy'sidan `profiles` ga
so'rov rekursiya beradi.

### `organizations`
Poliklinika yoki bank.

| Ustun | Tur | Izoh |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text | |
| `type` | text | `clinic` / `bank` |
| `slug` | text UNIQUE | `/join/:slug` va `/display/:slug` uchun |
| `prefix` | text | Navbat raqami prefiksi (`P-001`, `B-014`) |
| `is_active` | boolean | |
| `description`, `logo_url` | text | |

**RLS:** `authenticated` hammasini o'qiydi; `anon` faqat `is_active = true`
bo'lganlarini (display ekrani uchun). INSERT/DELETE — superadmin,
UPDATE — `is_org_admin(id)`.

### `organization_members` *(v2)*
Xodim qaysi tashkilotga biriktirilgan.

| Ustun | Tur | Izoh |
| --- | --- | --- |
| `organization_id` | uuid | PK qismi |
| `user_id` | uuid | PK qismi |
| `role` | text | `owner` / `operator` |
| `created_at` | timestamptz | |

**RLS:** o'z qatorlarini ko'radi; yozish faqat superadmin.

### `navbat_services`
Tashkilot xizmatlari.

| Ustun | Tur | Izoh |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid | *v2 da qo'shilgan*, `ON DELETE CASCADE` |
| `name`, `description` | text | |
| `average_time` | int | Daqiqa — kutish vaqtini hisoblashda **haqiqatda** ishlatiladi |
| `prefix` | text | |
| `is_active` | boolean | |

**RLS:** o'qish ochiq (`anon` uchun faqat faollari); yozish —
`is_org_admin(organization_id)`.

### `navbat_queue_settings`
Har bir tashkilot uchun bitta qator — joriy raqam hisoblagichi.

| Ustun | Tur | Izoh |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid | UNIQUE (v2 da indeks qo'shilgan) |
| `current_number` | int | Oxirgi berilgan raqam |
| `prefix` | text | |
| `is_open` | boolean | Navbat qabuli ochiqmi |
| `updated_at` | timestamptz | |

Raqam shu qatorda `FOR UPDATE` qulfi ostida oshiriladi — dublikat raqam
bo'lishi mumkin emas.

### `navbat_queues`
Navbat chiptasi.

| Ustun | Tur | Izoh |
| --- | --- | --- |
| `id` | uuid PK | |
| `queue_number` | text | `P-001` ko'rinishida |
| `organization_id` | uuid | |
| `service_id` | uuid | `ON DELETE SET NULL` (*v2* — ilgari CASCADE edi, tarix o'chib ketardi) |
| `user_id` | uuid | |
| `status` | text | `waiting` / `serving` / `completed` / `skipped` / `cancelled` |
| `estimated_wait_time` | int | Daqiqa |
| `full_name`, `phone` | text | Navbat olishda kiritilgan (profildan farq qilishi mumkin) |
| `created_at`, `called_at`, `completed_at` | timestamptz | Server vaqti |

**RLS:**

| Amal | Kim |
| --- | --- |
| SELECT | `user_id = auth.uid()` **yoki** `is_org_admin(organization_id)` |
| INSERT | Faqat o'zi uchun va faqat `status = 'waiting'` |
| UPDATE | Faqat `is_org_admin(organization_id)` |
| DELETE | Hech kim |

> **v2 dagi kritik tuzatish.** Ilgari `update_own_navbat_queues` policy'si
> bor edi va mijoz o'z qatorining `status` hamda `queue_number` ustunini
> erkin o'zgartira olardi — ya'ni o'zini "chaqirilgan" qilib qo'yishi
> mumkin edi. Policy olib tashlandi; mijozga qolgan yagona o'zgartirish —
> `cancel_my_queue()` RPC.

### `notifications` *(v2)*

| Ustun | Tur |
| --- | --- |
| `id` | uuid PK |
| `user_id` | uuid |
| `queue_id` | uuid, `ON DELETE CASCADE` |
| `title`, `body` | text |
| `is_read` | boolean |
| `created_at` | timestamptz |

**RLS:** faqat o'z qatorlari (SELECT/UPDATE/DELETE).

`on_queue_status_change` trigger'i navbat statusi `serving` / `skipped` /
`completed` ga o'tganda avtomatik qator yozadi.

---

## Rol yordamchi funksiyalari

Uchalasi ham `SECURITY DEFINER` + `SET row_security = off` — shu sababli
policy ichidan chaqirilganda rekursiya bermaydi.

| Funksiya | Qaytaradi |
| --- | --- |
| `is_admin()` | `profiles.role = 'admin'` (superadmin) |
| `is_org_admin(p_org_id)` | superadmin **yoki** shu tashkilotning a'zosi |
| `is_staff()` | superadmin **yoki** biror tashkilotning a'zosi |

Policy'larda deyarli har doim `is_org_admin(organization_id)` ishlatiladi —
tashkilot xodimi boshqa tashkilot ma'lumotini ko'ra olmasligi uchun.

---

## Indekslar

| Indeks | Nima uchun |
| --- | --- |
| `idx_navbat_queues_org_status_created` | Navbat ro'yxati va `people_ahead` sanog'i |
| `idx_navbat_queues_user_created` | Foydalanuvchi tarixi |
| `idx_navbat_services_org` | Tashkilot xizmatlari |
| `idx_notifications_user_unread` | O'qilmagan bildirishnomalar |
| `idx_org_members_user` | `is_staff()` / `is_org_admin()` |
| `navbat_queue_settings_org_uniq` | Har bir tashkilotga bitta sozlama qatori |
| `organizations_slug_uniq` | `slug` bo'yicha qidiruv |

## Realtime

Publication'da: `navbat_queues`, `navbat_queue_settings`, `notifications`,
`organizations` (va eski migratsiyadan `navbat_services`).
Realtime hodisalari ham RLS ostida — mijoz faqat o'z qatorlari haqidagi
hodisani oladi. Shuning uchun "oldingizda nechta kishi bor" ni realtime bilan
kuzatib bo'lmaydi va `useMyQueue()` qo'shimcha poll qiladi.
