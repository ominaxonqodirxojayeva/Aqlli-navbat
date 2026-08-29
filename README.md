# Aqlli Navbat

Poliklinika va banklar uchun elektron navbat platformasi. Mijoz telefonidan
navbat oladi va o'z raqamini real vaqtda kuzatadi; xodim admin panelidan
navbatni chaqiradi, statistikani ko'radi; zaldagi ekran esa `/display`
sahifasida chaqirilgan raqamni ovoz bilan e'lon qiladi.

**Stack:** React 18 + TypeScript + Vite · Tailwind CSS · React Router 7 ·
TanStack Query 5 · Supabase (Postgres + Auth + Realtime) · Vitest · Netlify.

---

## Tez boshlash

```bash
npm install
cp .env.example .env      # so'ng qiymatlarni to'ldiring
npm run dev
```

`.env` da ikkita qiymat kerak — Supabase loyihangizning **Settings → API**
bo'limidan:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> **Demo rejim.** `.env` bo'lmasa ilova yiqilmaydi — `isSupabaseConfigured`
> `false` bo'lib, ro'yxatdan o'tish va tashkilotlar ro'yxati `localStorage`
> asosidagi demo ma'lumotlar bilan ishlaydi
> (`src/pages/get-queue/shared.ts`). Bu UI ni tez ko'rish uchun, real
> foydalanish uchun emas.

### Bazani tayyorlash

`supabase/migrations/` dagi fayllarni **nom tartibida** Supabase SQL
Editor'da ishga tushiring (yoki `supabase db push`). Hammasi idempotent —
qayta ishga tushirish xavfsiz. So'ng `supabase/tests/rls_check.sql` ni
ishga tushiring: har bir qator `OK` bo'lishi kerak.

> **Mavjud loyihaga qo'llayotgan bo'lsangiz.** Eski seed migratsiyasi bazaga
> paroli kodda ochiq yozilgan uchta demo hisob yaratgan bo'lishi mumkin
> (`admin@timeflow.uz` — superadmin huquqi bilan).
> `20260829120000_remove_demo_accounts.sql` ularni o'chiradi; tekshirish
> uchun `rls_check.sql` dagi 11-tekshiruvga qarang.

Batafsil: [docs/database.md](docs/database.md).

---

## Skriptlar

| Buyruq | Vazifasi |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Build'ni lokal ko'rish |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (bir marta) |
| `npm run test:watch` | Vitest watch rejimi |
| `npm run verify` | typecheck → lint → test → build (CI da ham shu) |

Commit qilishdan oldin `npm run verify` ni ishga tushiring — CI aynan
shu bosqichlarni takrorlaydi.

---

## Rollar

Uch daraja bor va ular **frontendda emas, bazada** aniqlanadi:

| Daraja | Manba | Nima qila oladi |
| --- | --- | --- |
| Mijoz (`customer`) | standart | Navbat oladi, o'z navbatini bekor qiladi, tarixini ko'radi |
| Tashkilot xodimi | `organization_members` qatori (`owner` / `operator`) | Faqat **o'z tashkiloti** navbatlarini boshqaradi |
| Superadmin | `profiles.role = 'admin'` | Barcha tashkilotlar, xodimlarni biriktirish |

Ro'yxatdan o'tish har doim `customer` beradi — bu qasddan. Rol JWT
metadata'dan emas, RLS bilan himoyalangan `profiles` jadvalidan o'qiladi,
aks holda har kim o'zini admin deb e'lon qila olardi. Bundan tashqari
`on_profile_role_change` trigger'i superadmin bo'lmagan foydalanuvchining
rol o'zgartirishini jimgina bekor qiladi.

**Superadmin tayinlash** — avval odatdagidek ro'yxatdan o'tkazing, so'ng
SQL Editor'da:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

**Tashkilotga xodim biriktirish** — superadmin sifatida kiring va
`/admin/staff` sahifasidan foydalanuvchini email bo'yicha qidirib qo'shing.

Foydalanuvchi keyingi kirishida (yoki sahifani yangilaganda) admin panelga
yo'naltiriladi.

---

## Hujjatlar

| Fayl | Mazmuni |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Umumiy tuzilma, papkalar, ma'lumot oqimi, realtime, PWA |
| [docs/database.md](docs/database.md) | Jadvallar, RLS siyosatlari, migratsiyalarni qo'llash |
| [docs/rpc.md](docs/rpc.md) | Barcha RPC funksiyalari va xato kodlari |
| [docs/deployment.md](docs/deployment.md) | Netlify deploy, CI, muhit o'zgaruvchilari |
| [CLAUDE.md](CLAUDE.md) | AI yordamchisi uchun loyiha qoidalari |

## Marshrutlar

| Yo'l | Kim uchun |
| --- | --- |
| `/` | Landing (ochiq) |
| `/login`, `/register` | Mehmon |
| `/display`, `/display/:slug` | Zaldagi ekran — **login talab qilmaydi** |
| `/dashboard` | Mijoz |
| `/get-queue`, `/join/:slug` | Mijoz — navbat olish sehrgari |
| `/my-queue`, `/history` | Mijoz |
| `/admin` | Xodim — navbat boshqaruvi |
| `/admin/services`, `/admin/organizations`, `/admin/stats` | Xodim |
| `/admin/staff` | Faqat superadmin |
