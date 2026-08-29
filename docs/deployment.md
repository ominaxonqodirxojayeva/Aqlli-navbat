# Deploy va CI

## Muhit o'zgaruvchilari

| O'zgaruvchi | Qayerdan | Izoh |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Settings → API | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API | anon/publishable kalit |

`VITE_` prefiksli qiymatlar **bundle ichiga tushadi va ochiq ko'rinadi** —
bu normal, anon kalit shunday ishlatish uchun. Maxfiylik RLS bilan
ta'minlanadi. `service_role` kalitini hech qachon frontendga qo'ymang.

`.env` git'ga tushmaydi (`.gitignore`). Namuna — `.env.example`.

---

## Netlify

`netlify.toml` allaqachon sozlangan:

- **Build:** `npm run build` → `dist`, Node 20.
- **SPA redirect:** `/*` → `/index.html` (200). Busiz `/admin` ni to'g'ridan
  ochganda 404 chiqadi.
- **Kesh sarlavhalari:** `/assets/*` — 1 yil `immutable` (fayl nomlari
  hash'langan); `/sw.js` va `/index.html` — `max-age=0, must-revalidate`,
  aks holda foydalanuvchi eski versiyada qolib ketadi.
- **Xavfsizlik sarlavhalari:** `X-Frame-Options: SAMEORIGIN`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy` (kamera/mikrofon/geolokatsiya o'chirilgan).

Netlify UI'da qilinadigan yagona ish — **Site settings → Environment
variables** ga yuqoridagi ikki qiymatni kiritish.

### Supabase tomonida

Auth → URL Configuration:

- **Site URL** — production domeni;
- **Redirect URLs** ro'yxatiga `http://localhost:5173` (dev) va
  Netlify preview domenlarini qo'shing.

Busiz email tasdiqlash havolalari noto'g'ri manzilga olib boradi.

---

## CI

`.github/workflows/ci.yml` — `main` ga push va PR'da ishlaydi. Bosqichlar
`npm run verify` bilan bir xil:

```
npm ci → typecheck → lint → test → build → dist artefakti (7 kun)
```

Build bosqichida Supabase kalitlari o'rniga placeholder beriladi — ilova
ularsiz ham kompilyatsiya bo'ladi (demo rejimga tushadi).

`concurrency` sozlangan: bir branch uchun bir vaqtda bitta run, eskisi
bekor qilinadi.

---

## Relizdan oldingi ro'yxat

1. `npm run verify` — lokal yashil.
2. Yangi migratsiya bo'lsa: production Supabase'da qo'llang, so'ng
   `supabase/tests/rls_check.sql` — hamma qator `OK`.
3. `public/sw.js` dagi `VERSION` ni oshiring, agar keshlanadigan qobiq
   o'zgargan bo'lsa — aks holda foydalanuvchida eski SW qoladi.
4. Deploy'dan keyin tekshiring: `/` ochiladi, `/display/<slug>` login'siz
   ishlaydi, navbat olish va "Keyingi mijoz" tugmasi ishlaydi.

## Muammolarni aniqlash

| Belgi | Sabab |
| --- | --- |
| Konsolda "Supabase environment variables are missing" | `.env` yo'q yoki Netlify'da o'zgaruvchi qo'yilmagan → demo rejim |
| Sahifani yangilaganda 404 | SPA redirect yo'q (Netlify'dan boshqa hostingda) |
| Admin panel ko'rinmaydi | `profiles.role` `admin` emas yoki `organization_members` da qator yo'q |
| RPC "function ... does not exist" | v2 migratsiyalari qo'llanmagan |
| Eski versiya ko'rinaveradi | SW keshi — `VERSION` ni oshiring, brauzerda hard reload |
| Brauzer konsolida xatolar tarixi kerak | `window.__aqlliNavbatErrors` (oxirgi 50 ta) |
