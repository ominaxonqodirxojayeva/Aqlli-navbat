# RPC funksiyalari

Barcha yozish amallari shu funksiyalar orqali o'tadi. Hammasi
`SECURITY DEFINER` + `SET search_path = public`, `PUBLIC` dan `REVOKE`
qilingan va faqat kerakli rolga `GRANT` berilgan.

Chaqirish:

```ts
const { data, error } = await supabase.rpc('funksiya_nomi', { p_arg: value });
```

`RETURNS TABLE` qaytaradigan funksiyalar **massiv** beradi — bitta qator
kutilsa `data?.[0]` oling (`src/lib/queue.ts` shunday qiladi).

---

## Mijoz uchun

### `create_org_queue(p_org_id, p_user_id, p_full_name, p_phone, p_service_id)`
`authenticated` · qaytaradi: `id, queue_number, status, estimated_wait_time,
organization_name, organization_prefix, service_name, people_ahead`

Yangi navbat ochadi. Ketma-ketlik:

1. `p_user_id <> auth.uid()` bo'lsa → `NOT_AUTHORIZED` (boshqa nomidan navbat olib bo'lmaydi).
2. Tashkilot mavjud va `is_active` bo'lishi kerak → aks holda `ORGANIZATION_NOT_FOUND`.
3. Foydalanuvchida `waiting`/`serving` navbat bo'lsa → `ACTIVE_QUEUE_EXISTS`
   (cheklov **barcha tashkilotlar bo'yicha**, bittada emas).
4. `p_service_id` berilgan bo'lsa, u shu tashkilotga tegishli va faol
   bo'lishi kerak → `SERVICE_NOT_FOUND`. Uning `average_time` qiymati
   kutish vaqtini hisoblashda ishlatiladi.
5. Navbat yopiq bo'lsa → `QUEUE_CLOSED`.
6. `navbat_queue_settings` qatori `FOR UPDATE` bilan qulflanadi va
   `current_number` atomik oshiriladi → dublikat raqam bo'lmaydi.

Raqam formati: `<prefix>-<3 xonali>` (masalan `P-007`). Prefiks tashkilotdan,
bo'lmasa turiga qarab `B` (bank) yoki `P` (klinika).

> Eski 4 argumentli versiya migratsiya boshida `DROP` qilinadi — aks holda
> ikkalasi qolib "ambiguous function" xatosi chiqadi.

### `cancel_my_queue(p_queue_id)`
`authenticated` · `boolean`

Mijoz uchun **yagona** ruxsat etilgan o'zgartirish. Faqat o'z navbatini va
faqat `waiting`/`serving` holatida bekor qila oladi; aks holda
`QUEUE_NOT_CANCELLABLE`.

### `get_my_queue_status()`
`authenticated` · qaytaradi: `id, queue_number, status, created_at, called_at,
organization_id, organization_name, organization_type, organization_slug,
service_name, average_time, people_ahead, serving_number,
estimated_wait_minutes, is_open`

Mijozning joriy navbati haqida hamma narsa — **bitta so'rovda**. Navbat
bo'lmasa bo'sh natija. `useMyQueue()` shu funksiyani ishlatadi.

### `mark_all_notifications_read()`
`authenticated` · `int` (nechta qator o'zgardi)

---

## Xodim uchun

Hammasi `is_org_admin(organization_id)` ni tekshiradi — tashkilot xodimi
faqat o'z tashkilotini boshqaradi, superadmin hammasini.

### `admin_next_org_queue(p_org_id)`
qaytaradi: `id, queue_number, status, user_id`

"Keyingi mijoz" tugmasi. Hozir `serving` holatidagini `completed` qiladi,
so'ng eng eski `waiting` ni `serving` ga o'tkazadi va `called_at` ni
**server vaqti** bilan yozadi. Kutayotgan hech kim bo'lmasa bo'sh natija
qaytadi (xato emas).

Tanlash `FOR UPDATE SKIP LOCKED` bilan — ikki operator bir vaqtda bossa
bir xil mijozni chaqirmaydi.

### `admin_set_queue_status(p_queue_id, p_status)`
qaytaradi: `id, queue_number, status`

`p_status` faqat `serving` / `completed` / `skipped` / `cancelled`
(→ `INVALID_STATUS`). Navbat allaqachon yopilgan bo'lsa
(`waiting`/`serving` emas) → `QUEUE_ALREADY_CLOSED`.
`called_at` / `completed_at` server vaqtida to'ldiriladi.

### `admin_set_org_open(p_org_id, p_is_open)`
`boolean`

Navbat qabulini ochadi/yopadi. Sozlama qatori bo'lmasa yaratadi.

### `admin_delete_organization(p_org_id)`
`boolean` · **faqat superadmin** (`is_admin()`)

Tashkilotda `waiting`/`serving` navbat bo'lsa o'chirmaydi →
`ORG_HAS_ACTIVE_QUEUES`.

---

## Statistika

Hammasi `authenticated`, `is_org_admin()` tekshiradi va **serverda**
hisoblanadi — brauzerga xom qatorlar yuborilmaydi.

| Funksiya | Argumentlar | Qaytaradi |
| --- | --- | --- |
| `get_org_stats` | `p_org_id, p_from, p_to` | `total, waiting, serving, completed, skipped, cancelled, avg_wait_minutes, avg_service_minutes` |
| `get_org_hourly_stats` | `p_org_id, p_from, p_to` | `hour, total` |
| `get_org_daily_stats` | `p_org_id, p_from, p_to` | `day, total, completed` |
| `get_org_breakdown` | `p_from, p_to` | `organization_id, organization_name, total, completed` |

`get_org_breakdown` argumentida `org_id` yo'q — foydalanuvchi ko'ra
oladigan **barcha** tashkilotlar kesimida qaytaradi.

---

## Ochiq (login talab qilmaydigan)

Ikkalasi ham `anon, authenticated` ga berilgan va faqat `is_active = true`
tashkilotlar uchun ishlaydi. **Ism va telefon hech qachon qaytmaydi.**

### `get_public_org_display(p_org_id)`
qaytaradi: `id, queue_number, status, service_name`

`waiting` va `serving` navbatlar; chaqirilganlari birinchi.

### `get_public_org_state(p_org_id)`
qaytaradi: `is_open, waiting_count, serving_number`

---

## Xato kodlari

Bazadan `RAISE EXCEPTION` bilan keladi va `src/lib/errors.ts` da o'zbekcha
matnga aylantiriladi. Yangi kod qo'shsangiz, `DB_ERROR_MESSAGES` ga ham
qo'shing — aks holda foydalanuvchi umumiy "Kutilmagan xatolik" ni ko'radi.

| Kod | Foydalanuvchiga ko'rinadigan matn |
| --- | --- |
| `NOT_AUTHORIZED` | Bu amal uchun ruxsatingiz yo'q. |
| `ACTIVE_QUEUE_EXISTS` | Sizda allaqachon faol navbat bor... |
| `ORGANIZATION_NOT_FOUND` | Tashkilot topilmadi yoki hozircha faol emas. |
| `SERVICE_NOT_FOUND` | Tanlangan xizmat topilmadi yoki faol emas. |
| `QUEUE_CLOSED` | Bu tashkilotda navbat qabuli hozircha yopiq. |
| `QUEUE_NOT_FOUND` | Navbat topilmadi. |
| `QUEUE_NOT_CANCELLABLE` | Bu navbatni bekor qilib bo'lmaydi... |
| `QUEUE_ALREADY_CLOSED` | Bu navbat allaqachon yakunlangan. |
| `INVALID_STATUS` | Noto'g'ri holat tanlandi. |
| `ORG_HAS_ACTIVE_QUEUES` | Tashkilotda faol navbatlar bor... |

Postgres kodlari ham tarjima qilinadi: `23505` (dublikat), `23503` (FK),
`42501` (ruxsat yo'q), `PGRST301` (sessiya tugagan), shuningdek tarmoq va
JWT xatolari.

---

## Frontendda qayerda ishlatiladi

| Funksiya | Fayl |
| --- | --- |
| `get_my_queue_status` | `src/lib/queue.ts` |
| `mark_all_notifications_read` | `src/lib/notifications.ts` |
| `create_org_queue`, `get_public_org_state` | `src/pages/GetQueuePage.tsx` |
| `cancel_my_queue` | `src/pages/UserDashboard.tsx`, `QueueDetailPage.tsx` |
| `admin_next_org_queue`, `admin_set_queue_status`, `admin_set_org_open`, `get_public_org_state` | `src/pages/AdminDashboard.tsx` |
| `admin_delete_organization` | `src/pages/AdminOrganizationsPage.tsx` |
| `get_org_stats`, `get_org_hourly_stats`, `get_org_daily_stats`, `get_org_breakdown` | `src/pages/AdminStatsPage.tsx` |
| `get_public_org_display`, `get_public_org_state` | `src/pages/LiveQueuePage.tsx` |
