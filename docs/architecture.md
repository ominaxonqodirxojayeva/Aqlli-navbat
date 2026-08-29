# Arxitektura

## Umumiy ko'rinish

Aqlli Navbat — **backendsiz** (BaaS) SPA. Alohida server kodi yo'q: brauzer
to'g'ridan-to'g'ri Supabase bilan gaplashadi, biznes qoidalari esa Postgres
ichida — RLS siyosatlari va `SECURITY DEFINER` RPC funksiyalarida yashaydi.

```
Brauzer (React SPA)
   │
   ├── supabase-js ──► Auth (PKCE, localStorage: "aqlli-navbat-auth")
   │                   │
   │                   ├── PostgREST ──► jadvallar (RLS bilan filtrlanadi)
   │                   ├── RPC        ──► SECURITY DEFINER funksiyalar
   │                   └── Realtime   ──► navbat_queues, notifications
   │
   └── Service Worker (/sw.js) ──► ilova qobig'i keshi + push
```

**Asosiy tamoyil:** ishonchli tekshiruv faqat bazada. Frontend rolni
`profiles` jadvalidan o'qiydi (JWT metadata'dan emas), yozish amallari esa
deyarli butunlay RPC orqali o'tadi. Frontendni o'zgartirib huquq oshirib
bo'lmaydi.

---

## Papkalar

```
src/
  App.tsx              Marshrutlar, route guard'lari, QueryClient
  main.tsx             Kirish nuqtasi, SW ro'yxatdan o'tkazish
  components/          Umumiy UI: Navbar, DashboardLayout, ui.tsx, ConfirmDialog...
  lib/                 Biznes-mantiq va integratsiyalar (quyida)
  pages/               Har bir marshrut uchun bitta sahifa
    get-queue/         Navbat olish sehrgarining qadamlari
    admin-organizations/  Tashkilotlar sahifasining qismlari
  test/setup.ts        Vitest global sozlamasi (jsdom polyfill'lari)
supabase/
  migrations/          Baza sxemasi (nom tartibida qo'llanadi)
  tests/rls_check.sql  Migratsiyadan keyingi tekshiruv
public/
  sw.js, manifest.webmanifest, icons/   PWA
docs/                  Shu hujjatlar
```

### `src/lib/` — nima qayerda

| Fayl | Vazifasi |
| --- | --- |
| `supabase.ts` | Klient, `isSupabaseConfigured`, **barcha TypeScript tiplari** (jadval qatorlari va RPC natijalari) |
| `auth.tsx` | `AuthProvider` — sessiya, profil, `organization_members`, demo rejim |
| `auth-context.ts` | `useAuth()` va `AuthContextValue` tipi (Fast Refresh uchun ajratilgan) |
| `queue.ts` | `useMyQueue()` — mijozning joriy navbati (realtime + poll) |
| `notifications.ts` | `useNotifications()` — bildirishnomalar uchun yagona manba |
| `errors.ts` | `translateError()` / `logError()` / `reportError()` |
| `validation.ts` | Email, parol, telefon, ism tekshiruvlari |
| `utils.ts` | Sana/vaqt formatlash, `STATUS_LABELS`, `STATUS_COLORS` |
| `announce.ts` | Display ekrani uchun ovozli e'lon (Web Audio + Speech API) |
| `pwa.ts` | Service Worker va "Ilovani o'rnatish" prompt'i |

`auth.tsx` va `auth-context.ts` ataylab ajratilgan: bir faylda ham komponent,
ham hook eksport qilinsa `eslint-plugin-react-refresh` ogohlantiradi.

---

## Rollar va route guard'lari

`useAuth()` uchta hosila qiymat beradi:

- `isSuperAdmin` — `profiles.role === 'admin'`
- `isStaff` — superadmin **yoki** `organization_members` da qatori bor
- `managedOrgIds` — `'all'` (superadmin) yoki tashkilot id'lari massivi

`App.tsx` dagi guard'lar:

| Guard | Shart |
| --- | --- |
| `RequireAuth` | Profil bor |
| `RequireStaff` | `isStaff` |
| `RequireStaff superAdminOnly` | `isSuperAdmin` (faqat `/admin/staff`) |
| `PublicOnlyRoute` | Profil **yo'q** (login/register) |

Bular faqat UX uchun. Haqiqiy himoya RLS va RPC ichidagi
`is_admin()` / `is_org_admin()` tekshiruvlarida — [database.md](database.md).

---

## Ma'lumot oqimi

### Navbat olish (mijoz)

`/get-queue` — besh qadamli sehrgar (`src/pages/get-queue/`):

```
type → select → service → details → result
 tur    tashkilot  xizmat   ism/tel   raqam
```

`service` qadami ixtiyoriy — tashkilotda faol xizmat bo'lmasa o'tkazib
yuboriladi. `details` da `create_org_queue()` RPC chaqiriladi; raqam
serverda, qulflangan `navbat_queue_settings` qatori ustida atomik
oshiriladi, shuning uchun bir vaqtda ikki kishi bir xil raqam ololmaydi.

`/join/:slug` — QR kod uchun: slug bo'yicha tashkilot oldindan tanlanadi.

### Navbatni kuzatish (mijoz)

`useMyQueue()` ikki manbani birlashtiradi:

- **realtime** — `navbat_queues` da `user_id=eq.<men>` filtri: o'z navbatim
  o'zgarsa bir zumda yangilanadi;
- **20 soniyalik poll** — oldimdagi odamlar soni boshqalarning harakatiga
  bog'liq, RLS sababli ularning realtime hodisalari menga kelmaydi.

Barcha kerakli ma'lumot (`people_ahead`, `serving_number`, taxminiy kutish)
bitta `get_my_queue_status()` chaqiruvida qaytadi.

### Navbatni boshqarish (xodim)

`/admin` → `admin_next_org_queue()` (joriyni yakunlab keyingisini chaqiradi),
`admin_set_queue_status()`, `admin_set_org_open()`. `called_at` /
`completed_at` **server vaqtida** yoziladi — ilgari brauzer vaqti yuborilardi.

Status `serving` / `skipped` / `completed` ga o'tganda
`on_queue_status_change` trigger'i `notifications` jadvaliga yozadi, u esa
realtime orqali mijozga yetadi.

### Display ekrani

`/display/:slug` login talab qilmaydi: `get_public_org_display()` va
`get_public_org_state()` `anon` rolga ochilgan va faqat raqam/status/xizmat
nomini qaytaradi — ism va telefon hech qachon chiqmaydi.

Ovoz brauzer tomonidan bloklanadi, shuning uchun `enableAudio()` albatta
foydalanuvchi bosgan tugmadan chaqirilishi kerak (`announce.ts`).

---

## Holat boshqaruvi

- **Server holati** — TanStack Query. Global sozlama (`App.tsx`):
  `staleTime: 30s`, `refetchOnWindowFocus: false`, `retry: 1`.
- **Sessiya/profil** — `AuthProvider` konteksti.
- **Lokal UI holati** — `useState`. Redux/Zustand yo'q va kerak emas.

## Xatoliklar

Har bir `catch` blokida `reportError(context, err)` chaqiriladi: xato
konsolga chiqadi, oxirgi 50 tasi `window.__aqlliNavbatErrors` da saqlanadi,
foydalanuvchiga esa o'zbekcha tarjima ko'rsatiladi. Bazadan kelgan
`RAISE EXCEPTION` kodlari (`ACTIVE_QUEUE_EXISTS`, `QUEUE_CLOSED`, ...)
`errors.ts` dagi jadval orqali tarjima qilinadi — ro'yxat
[rpc.md](rpc.md) da.

## PWA

- `public/manifest.webmanifest` + ikonkalar (192/512/maskable/apple-touch).
- `public/sw.js` — ilova qobig'ini keshlaydi (`VERSION = 'v2'`), push
  bildirishnomalarini ko'rsatadi. **Supabase so'rovlari hech qachon
  keshlanmaydi** — navbat ma'lumoti doim tirik bo'lishi shart.
- SW faqat production build'da ro'yxatdan o'tadi (`pwa.ts`); dev rejimda u
  eski fayllarni ko'rsatib qo'yardi.
- `InstallAppBanner` — `beforeinstallprompt` ushlangan bo'lsa ko'rinadi.

## Bundle

`vite.config.ts` da `manualChunks` bilan kutubxonalar ajratilgan
(`vendor-react`, `vendor-supabase`, `vendor-charts`, `vendor-query`), og'ir
sahifalar esa `React.lazy()` bilan yuklanadi. Sabab: bosh sahifa uchun
recharts (~400 kB) va admin panel kodini yuklashning hojati yo'q.

## Testlar

Vitest + Testing Library, jsdom muhitida. Hozir 6 fayl / 66 test:
`ConfirmDialog`, `errors`, `utils`, `validation`, `DetailsStep`,
`ServiceStep`. `src/test/setup.ts` jsdom'da yo'q brauzer API'larini
(`matchMedia`, `ResizeObserver`, `scrollTo`) to'ldiradi.
