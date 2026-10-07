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
│   └── src/
│       ├── api/       # authApi, householdApi, expenseApi (Supabase)
│       ├── lib/       # supabaseClient (validimi i variablave të ambientit)
│       ├── utils/     # balances.js: llogaritja e borxheve (funksione të pastra)
│       ├── screens/   # Login, Register, HouseholdSetup, Dashboard, AddExpense
│       └── components/
├── mobile/            # App mobil (Expo / React Native), i njëjti Supabase
└── supabase/
    ├── schema.sql     # Tabelat, RLS, funksionet RPC, realtime
    └── README.md      # Udhëzimet e konfigurimit
```

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
