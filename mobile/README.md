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
- **Menuja e profilit** (rrethi me inicialet): Banesa & ftesa, Tema e errët, Njoftimet push, Dalja.
- **Shto shpenzim**: e përbashkët ose individuale, **Kush e pagoi?**, me kë ndahet dhe kategoria.

## Njoftimet push

Telefoni merr të njëjtat njoftime si web-i (shpenzim i përbashkët, "Laje Borxhin", anëtar i ri) përmes
**Expo Push**. Shpenzimet individuale nuk dërgojnë njoftim. I aktivizoni te **Menuja e profilit → Njoftimet push**.

Konfigurimi (një herë):

1. Ekzekutoni të gjithë `supabase/schema.sql` sërish (seksioni 10 shton tabelën `user_expo_push_tokens`) dhe
   ribëni deploy: `supabase functions deploy send-push --no-verify-jwt`.
2. Lidhni projektin me Expo (llogari falas te [expo.dev](https://expo.dev)):

   ```bash
   cd mobile
   npx eas-cli login
   npx eas-cli init        # shton "extra.eas.projectId" te app.json; ky ID nuk është sekret
   ```
3. Rinisni me `npx expo start -c` dhe hapeni me **Expo Go** në telefon të vërtetë (jo emulator).

Me Expo Go nuk duhet asgjë tjetër. Për një build të vetin (`eas build`) Android-i kërkon edhe çelësin FCM
(`npx eas-cli credentials`, shih [udhëzuesin e Expo](https://docs.expo.dev/push-notifications/fcm-credentials/)).
Nëse aktivizoni "Enhanced push security" te expo.dev, vendoseni tokenin si sekret të Supabase:
`supabase secrets set EXPO_ACCESS_TOKEN=...`, kurrë në kod.

## Kodi i përbashkët me web-in

`src/api/*.js` dhe `src/utils/balances.js` janë kopje të skedarëve në `frontend/src/`. Kur ndryshoni
logjikën e borxheve ose API-të, përditësoni të dyja kopjet.
