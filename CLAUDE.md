# CLAUDE.md

Aqlli Navbat — poliklinika va banklar uchun elektron navbat platformasi.
React 18 + TypeScript + Vite + Tailwind, backend sifatida Supabase
(Postgres + Auth + Realtime). Alohida server kodi yo'q.

Batafsil: [docs/architecture.md](docs/architecture.md) ·
[docs/database.md](docs/database.md) · [docs/rpc.md](docs/rpc.md) ·
[docs/deployment.md](docs/deployment.md)

## Buyruqlar

```bash
npm run dev        # dev server
npm run verify     # typecheck + lint + test + build  ← commit'dan oldin shu
npm test           # faqat testlar
npm run test:watch # watch rejimi
```

**O'zgarish kiritgandan keyin `npm run verify` ni ishga tushiring.** CI aynan
shu bosqichlarni takrorlaydi, shuning uchun lokal yashil bo'lmasa PR ham qizil.

## Til

Loyiha o'zbek tilida. Foydalanuvchiga ko'rinadigan **barcha** matn, kod
izohlari va commit xabarlari — o'zbekcha. Kod identifikatorlari (o'zgaruvchi,
funksiya, tip nomlari) inglizcha.

Izoh yozganda **nima** qilinayotganini emas, **nega** shunday qilinganini
yozing — mavjud kodda shu uslub ishlatilgan:

```ts
// Rol `profiles` jadvalidan olinadi, JWT metadata'dan emas — metadata
// ro'yxatdan o'tishda mijoz tomonidan boshqariladi va har kim o'zini
// admin deb e'lon qila olardi.
```

## Muhim qoidalar

### Xavfsizlik bazada, frontendda emas

Rol tekshiruvi faqat `profiles` jadvalidan (RLS ostida) o'qiladi. JWT
`user_metadata` dan rol olish — **taqiqlanadi**, u mijoz tomonidan
boshqariladi. `App.tsx` dagi route guard'lar faqat UX uchun; haqiqiy himoya
RLS va RPC ichidagi `is_admin()` / `is_org_admin()` tekshiruvlarida.

### Yozish amallari RPC orqali

`navbat_queues` ga to'g'ridan-to'g'ri `UPDATE` qilmang. Mijoz uchun yagona
ruxsat etilgan o'zgartirish — `cancel_my_queue()`; xodim uchun
`admin_*` RPC'lari. Vaqt belgilari (`called_at`, `completed_at`) serverda
`now()` bilan yoziladi, brauzer vaqti yuborilmaydi.

### Uchta rol darajasi

| Daraja | Manba |
| --- | --- |
| Mijoz | standart (`profiles.role = 'customer'`) |
| Tashkilot xodimi | `organization_members` qatori |
| Superadmin | `profiles.role = 'admin'` |

`useAuth()` dan `isStaff`, `isSuperAdmin`, `managedOrgIds` oling. Yangi admin
sahifasi qo'shsangiz, u qaysi darajaga tegishli ekanini aniqlang — tashkilot
xodimi **boshqa tashkilot** ma'lumotini ko'rmasligi kerak.

### Xatoliklarni yutmang

Har bir `catch` da `reportError('kontekst', err)` (yoki `logError`)
chaqiring. Bo'sh `catch {}` yoki umumiy "Xatolik yuz berdi" — qabul
qilinmaydi. Bazadan yangi `RAISE EXCEPTION` kodi qo'shsangiz, uni
`src/lib/errors.ts` dagi `DB_ERROR_MESSAGES` ga ham qo'shing.

### Tiplar bitta joyda

Jadval qatorlari va RPC natijalarining TypeScript tiplari faqat
`src/lib/supabase.ts` da. Sahifa ichida lokal interfeys yaratmang.

### Import yo'llari

`@/` aliasi `src/` ga ishora qiladi (`vite.config.ts` + `tsconfig.app.json`).
`../../lib/...` ko'rinishidagi nisbiy yo'llardan qoching.

### Demo rejim

`.env` bo'lmasa `isSupabaseConfigured === false` bo'ladi va ilova
`localStorage` asosidagi demo ma'lumotlar bilan ishlaydi. Supabase bilan
ishlaydigan yangi kod yozganda bu holatni ham hisobga oling — aks holda ilova
`.env` siz yiqiladi (CI build'i ham shu rejimda o'tadi).

## Migratsiyalar

- Fayl nomi: `supabase/migrations/YYYYMMDDHHMMSS_qisqacha_nom.sql`.
- **Idempotent bo'lishi shart** — `IF NOT EXISTS`, `DROP POLICY IF EXISTS`,
  `CREATE OR REPLACE`. Qayta ishga tushirish xavfsiz bo'lishi kerak.
- Mavjud migratsiya faylini tahrirlamang — yangisini yozing. Ular allaqachon
  production'da qo'llangan.
- Yangi funksiya: `SECURITY DEFINER` + `SET search_path = public`, so'ng
  `REVOKE ALL ... FROM PUBLIC` va aniq `GRANT`.
- RLS policy'sida rolni tekshirish uchun `is_admin()` / `is_org_admin()`
  yordamchilarini ishlating — `profiles` ga to'g'ridan-to'g'ri so'rov
  rekursiya beradi.
- Xavfsizlikka tegadigan o'zgarishdan keyin `supabase/tests/rls_check.sql`
  ga tekshiruv qo'shing.

## Testlar

Vitest + Testing Library (jsdom). Test fayli tekshirilayotgan fayl yonida:
`Foo.tsx` → `Foo.test.tsx`. `src/test/setup.ts` jsdom'da yo'q brauzer
API'larini to'ldiradi.

Test yozishga arziydigan joylar: `lib/` dagi sof funksiyalar (validation,
utils, errors) va foydalanuvchi kiritadigan formalar. Supabase klientini
mock qilishdan ko'ra sof mantiqni ajratib test qilish afzal.

## UI

- Tailwind, maxsus palitra `tailwind.config.js` da: `navy`, `electric`,
  `accent`, `success`, `warning`, `error`. Shrift — Plus Jakarta Sans.
- Umumiy komponentlar `src/components/ui.tsx` da: `Card`, `Badge`,
  `StatCard`, `EmptyState`, `Spinner`, `LoadingScreen`. Yangisini yozishdan
  oldin shu yerga qarang.
- Tasdiq so'rash uchun `ConfirmDialog` — `window.confirm()` ishlatmang.
- Status matni/rangi: `STATUS_LABELS`, `STATUS_COLORS`, `STATUS_DOT_COLORS`
  (`src/lib/utils.ts`).

## Ishlash

Og'ir sahifalar `React.lazy()` bilan yuklanadi, kutubxonalar `manualChunks`
bilan ajratilgan (`vite.config.ts`). Bosh sahifaga recharts kabi og'ir
kutubxonani import qilmang. Yangi sahifa qo'shsangiz, uni ham `App.tsx` da
`lazy()` orqali ulang.
