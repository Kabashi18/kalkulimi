# Konfigurimi i Supabase (Sinkronizimi i Banesës)

Aplikacioni web (`frontend/`) përdor Supabase për llogaritë, banesat, shpenzimet dhe borxhet.
Kështu të dhënat janë të njëjta në çdo pajisje ku kyçen shokët e së njëjtës banesë.

## 1. Krijo projektin (rreth 5 minuta)

1. Hyr te [supabase.com](https://supabase.com) → **New project** (plani falas mjafton).
2. Hap **SQL Editor** → **New query**, ngjit të gjithë përmbajtjen e [`schema.sql`](schema.sql) dhe kliko **Run**.
   Skedari mund të ekzekutohet sërish pa rrezik, p.sh. pas përditësimeve.
3. **Authentication → Sign In / Providers → Email**:
   - Për testim të shpejtë, çaktivizo **Confirm email**, që përdoruesit të kyçen direkt pas regjistrimit.
   - Nëse e lë aktiv, përdoruesi duhet të klikojë lidhjen në email para kyçjes. Te **Authentication → URL Configuration**
     vendos **Site URL** = adresa e Vercel (p.sh. `https://kalkulimi.vercel.app`).

## 2. Lidh frontend-in

Te **Project Settings → API** kopjo **Project URL** dhe **anon public key**.

**Lokalisht**: krijo `frontend/.env.local` (mos e bëj commit):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

**Vercel**: Project → Settings → Environment Variables → shto të njëjtat 2 variabla → **Redeploy**.

> Anon key është publik nga natyra. Siguria garantohet nga politikat RLS në `schema.sql`.

## 3. Njoftimet push (opsionale)

Anëtarët marrin njoftim në telefon/kompjuter kur:

| Ngjarja | Kush njoftohet | Teksti |
|---|---|---|
| Shpenzim i ri **i përbashkët** | Anëtarët e tjerë të banesës | "Artan shtoi një shpenzim të ri: Qiraja (200.00 €)" |
| "Laje Borxhin" | Pala tjetër e pagesës | "Blerta regjistroi një pagesë prej 100.00 €" |
| Anëtar i ri me kodin e banesës | Anëtarët ekzistues | "Drini u bashkua me banesën!" |

Shpenzimet **individuale** nuk dërgojnë kurrë njoftim (triggeri dhe funksioni i injorojnë).

Rrjedha: `schema.sql` (triggerët + `pg_net`) → Edge Function [`send-push`](functions/send-push/index.ts) → `web-push` me çelësat VAPID → Service Worker ([`frontend/public/sw.js`](../frontend/public/sw.js)).

1. **Çelësat VAPID** (një herë): `npx web-push generate-vapid-keys`
2. **Edge Function** (me [Supabase CLI](https://supabase.com/docs/guides/cli)):

   ```bash
   supabase login
   supabase link --project-ref xxxxxxxxxxxx
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:ju@example.com PUSH_WEBHOOK_SECRET=<një-fjalë-e-gjatë-e-rastësishme>
   supabase functions deploy send-push --no-verify-jwt
   ```

   `--no-verify-jwt` duhet sepse funksionin e thërret databaza, e cila identifikohet me `PUSH_WEBHOOK_SECRET`.
3. **Lidh databazën me funksionin**: te SQL Editor (pasi të keni ekzekutuar `schema.sql`):

   ```sql
   select vault.create_secret('https://xxxxxxxxxxxx.supabase.co/functions/v1/send-push', 'push_function_url');
   select vault.create_secret('<i njëjti PUSH_WEBHOOK_SECRET>', 'push_webhook_secret');
   ```

   Pa këto dy sekrete triggerët nuk bëjnë asgjë, ndaj aplikacioni funksionon normalisht edhe pa njoftime.
4. **Frontend**: shto `VITE_VAPID_PUBLIC_KEY=<çelësi publik>` te `frontend/.env.local` dhe te Vercel, pastaj **Redeploy**.
5. Përdoruesi i aktivizon te menuja e profilit → **Njoftimet push**. Në iPhone (iOS 16.4+) njoftimet punojnë vetëm
   kur faqja është shtuar te **Home Screen** dhe hapet prej andej.

Për diagnostikim: **Edge Functions → send-push → Logs**, ose `select * from net._http_response order by created desc limit 10;`.

## 4. Si funksionon

| Hapi | Çfarë ndodh |
|---|---|
| Artani regjistrohet → "Krijo banesë" | Krijohet banesa me kod unik, p.sh. `BANESA-4821` |
| Blerta regjistrohet me kodin (ose e shkruan pas kyçjes) | Bashkohet me të njëjtën banesë |
| Artani shton "Qiraja 200 €" (e përbashkët, Artan + Blerta) | Ruhet në databazë; Dashboard-i i Blertës rifreskohet vetë (Realtime) |
| Blerta sheh | "Ti i ke borxh **Artan**: 100.00 €" → **Laje Borxhin** |
| Blerta konfirmon pagesën | Regjistrohet te `settlements`; borxhi bëhet 0 për të dy |

### Tabelat

- `households`: banesat me `code` unik
- `profiles`: emri i përdoruesit dhe `household_id` (krijohet automatikisht pas regjistrimit)
- `expenses` + `expense_splits`: shpenzimet dhe pjesa e secilit anëtar
- `settlements`: pagesat e kthimit të borxhit ("Laje Borxhin")
- `user_push_subscriptions`: pajisjet ku përdoruesi ka aktivizuar njoftimet push

### Rregullat e sigurisë (RLS)

- Çdo përdorues sheh vetëm të dhënat e banesës së vet.
- Shpenzimet **personale** i sheh vetëm ai që i ka paguar, dhe ato nuk hyjnë në borxhe.
- Shpenzimin mund ta ndryshojë ose fshijë vetëm ai që e ka paguar.
- Pagesën e borxhit mund ta regjistrojë vetëm njëra nga dy palët (debitori ose kreditori).
- Banesa ndryshohet vetëm përmes funksioneve `create_household`, `join_household` dhe `leave_household`.
