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

## 3. Si funksionon

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

### Rregullat e sigurisë (RLS)

- Çdo përdorues sheh vetëm të dhënat e banesës së vet.
- Shpenzimet **personale** i sheh vetëm ai që i ka paguar, dhe ato nuk hyjnë në borxhe.
- Shpenzimin mund ta ndryshojë ose fshijë vetëm ai që e ka paguar.
- Pagesën e borxhit mund ta regjistrojë vetëm njëra nga dy palët (debitori ose kreditori).
- Banesa ndryshohet vetëm përmes funksioneve `create_household`, `join_household` dhe `leave_household`.
