# Kalkulimi: Ndarja e Shpenzimeve të Banesës

Aplikacion për shokët e banesës që ndajnë faturat (si Splitwise). Të dhënat sinkronizohen në kohë reale
mes të gjitha pajisjeve përmes [Supabase](https://supabase.com).

- **Banesa me kod ftese**: njëri krijon banesën (p.sh. `BANESA-4821`) dhe të tjerët bashkohen me kod.
- **Shpenzime të përbashkëta ose personale**: të përbashkëtat ndahen mes anëtarëve të zgjedhur, kurse personalet i sheh vetëm pronari.
- **Kush e pagoi?**: shpenzimin mund ta regjistrojë kushdo në emër të shokut që e pagoi.
- **Kush i ka borxh kujt**: borxhet dypalëshe dhe butoni **Laje Borxhin** për pagesat e kthyera.
- **Raport PDF**: barazimi i plotë i banesës me numrin minimal të pagesave.

## Struktura

```text
kalkulimi/
├── frontend/          # Web app (React + Vite + Tailwind), deploy në Vercel
│   ├── public/        # manifest + service worker (njoftimet push)
│   ├── tests/e2e.mjs  # testi end-to-end kundrejt Supabase-it real
│   └── src/
│       ├── api/       # authApi, householdApi, expenseApi (+ kopje në mobile), profileApi, pushApi
│       ├── lib/       # supabaseClient, tema, kompresimi i fotove të faturave
│       ├── hooks/     # useToast
│       ├── utils/     # balances.js (llogaritja e borxheve, funksione të pastra), generatePdfReport.js
│       ├── screens/   # Login, Register, ForgotPassword, ResetPassword, HouseholdSetup, Dashboard, AddExpense
│       └── components/
├── mobile/            # App mobil (Expo / React Native), i njëjti Supabase
├── scripts/           # check-shared-copies.mjs: kopjet web/mobil janë identike
└── supabase/
    ├── schema.sql     # Tabelat, RLS, funksionet RPC, realtime
    ├── functions/     # send-push (Edge Function për njoftimet)
    └── README.md      # Udhëzimet e konfigurimit
```

## Arkitektura dhe performanca (web)

- **Të dhënat**: gjithçka kalon përmes `src/api/*` → Supabase; siguria zbatohet në databazë (RLS). Queries marrin vetëm
  kolonat e nevojshme, dhe Dashboard-i rifreskohet vetë përmes Realtime.
- **Logjika e pastër** (`utils/balances.js`) është e ndarë nga UI-ja dhe mbulohet nga testet Vitest. `api/authApi`,
  `api/householdApi`, `api/expenseApi` dhe `utils/balances.js` kanë kopje identike në `mobile/src`: ndryshoni versionin
  web dhe kopjojeni në mobil (`npm run check:copies` e kontrollon).
- **Ngarkimi**: `App.jsx` ngarkohet dinamikisht nga `main.jsx`; jsPDF (raporti PDF) ngarkohet vetëm kur klikohet
  "Shkarko PDF", jo në hapjen e parë të faqes.
- **Render-at**: përbërësit e listës dhe kartelat e Dashboard-it janë me `React.memo`, me callback-e të qëndrueshme
  (`useCallback`), që scroll-i dhe njoftimet (toast) të mos rivizatojnë listën.

## Nisja e shpejtë

1. Konfiguroni Supabase sipas [supabase/README.md](supabase/README.md): ekzekutoni `schema.sql` dhe merrni URL-në dhe çelësin.
2. Web:
   ```bash
   cd frontend
   cp .env.example .env.local   # plotësoni VITE_SUPABASE_URL dhe VITE_SUPABASE_ANON_KEY
   npm install
   npm run dev
   ```
3. Mobil: shikoni [mobile/README.md](mobile/README.md).

## Testet

```bash
npm test               # Vitest: logjika e borxheve, ndarjeve, përqindjeve dhe datave (frontend/src/utils)
npm run check:copies   # kopjet në mobile/src janë identike me frontend/src
npm run test:e2e       # test end-to-end kundrejt Supabase-it real (krijon 2 llogari testuese)
```

GitHub Actions (`.github/workflows/ci.yml`) ekzekuton `check:copies`, testet dhe build-in në çdo push.
Testi E2E nuk ekzekutohet në CI, sepse krijon llogari në projektin real.

## Deploy (Vercel)

Vendosni `VITE_SUPABASE_URL` dhe `VITE_SUPABASE_ANON_KEY` te **Settings → Environment Variables**, pastaj bëni **Redeploy**.
Variablat futen në kod gjatë build-it, prandaj çdo ndryshim i tyre kërkon një deploy të ri.

> Ndani me shokët domain-in e **produksionit** (Vercel → Settings → Domains). Adresat e deploy-eve individuale
> (`...-projects.vercel.app`) kërkojnë kyçje në Vercel.
