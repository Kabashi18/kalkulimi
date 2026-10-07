# Kalkulimi Mobil (Expo / React Native)

App-i mobil përdor **të njëjtin Supabase** si versioni web. Shpenzimet, borxhet dhe pagesat sinkronizohen
në kohë reale mes telefonit dhe web-it.

## Nisja

```bash
cd mobile
cp .env.example .env      # plotësoni vlerat (të njëjtat si te frontend/.env.local)
npm install
npx expo start -c         # -c pastron cache-in, që të merren variablat e reja
```

Skanoni kodin QR me **Expo Go** (Android / iOS). Telefoni nuk ka nevojë të jetë në të njëjtin rrjet me
ndonjë server, sepse lidhet direkt me Supabase.

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## Ekranet

- **Kyçja / Regjistrimi**: me fushën opsionale "Kodi i Banesës".
- **Banesa**: "Kam një kod" ose "Krijo banesë".
- **Dashboard**: totali mujor, **Kush i ka borxh kujt** me **Laje Borxhin**, lista e shpenzimeve
  (shtypni gjatë ose ⋮ për Ndrysho / Fshij). Klikoni emrin e banesës për kodin e ftesës dhe butonin **Share**.
- **Shto shpenzim**: e përbashkët ose individuale, **Kush e pagoi?**, me kë ndahet dhe kategoria.

## Kodi i përbashkët me web-in

`src/api/*.js` dhe `src/utils/balances.js` janë kopje të skedarëve në `frontend/src/`. Kur ndryshoni
logjikën e borxheve ose API-të, përditësoni të dyja kopjet.
