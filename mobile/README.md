# Aplikacioni Mobil me React Native (Expo) & NativeWind (Tailwind CSS)

Ky është aplikacioni mobil për menaxhimin e shpenzimeve personale dhe të banesës, i integruar direkt me backend-in e Node.js/Express dhe MySQL.

---

## 📱 Ekranet Kryesore

1. **Dashboard Screen (Ekrani Kryesor):**
   - 💳 **Kartela "Totali i Shpenzuar këtë Muaj"** në euro (€).
   - ⚖️ **Kartela "Barazimi i Banesës"**:
     - Ngjyrë e gjelbër: kur të tjerët të detyrohen para.
     - Ngjyrë e kuqe: kur ti i detyrohesh banesës/shokëve.
     - Ngjyrë neutrale: kur llogaritë janë 0.00 € (të barazuara).
   - 📋 **Lista e shpenzimeve të fundit** me ikona dhe ngjyra dinamike sipas kategorisë:
     - ⚡ Rrymë
     - 🏠 Qira
     - 🍔 Ushqim
     - 📶 Internet / TV
     - 💧 Ujë
     - 📦 Të tjera
   - 🔄 **Pull-to-refresh** për rifreskim të të dhënave.

2. **Add Expense Screen (Formulari i Shpenzimit të Ri):**
   - Input për Titullin.
   - Input për Shumën në €.
   - Përzgjedhja e Kategorisë me kartela vizuale.
   - Switch / Toggle: **"Shpenzim Personal"** vs **"I Përbashkët me Banesën"**.
   - Nëse zgjidhet i përbashkët: përzgjedhja e personave (2, 3, 4, 5) me **përllogaritje të menjëhershme për person** (p.sh. `90 € / 3 persona = 30.00 € për person`).
   - Butoni **"Ruaj Shpenzimin"** me status ngarkimi (Loading state) që dërgon kërkesën në `POST /api/expenses`.

---

## 🚀 Si ta ekzekutoni në Expo

### 1. Hyni në dosjen `mobile`:
```bash
cd C:\Users\Admin\Desktop\kalkulimi\mobile
```

### 2. Instaloni varësitë:
```bash
npm install
```

### 3. Konfiguroni IP-në e Backend-it (nëse testoni me telefon):
Tek skedari `src/api/expenseApi.js`:
- Nëse testoni në **Android Emulator**: përdor `http://10.0.2.2:5000/api`.
- Nëse testoni në **iOS Simulator**: përdor `http://localhost:5000/api`.
- Nëse testoni me **telefon fizik përmes aplikacionit Expo Go**: vendosni IP-në lokale të kompjuterit tuaj (p.sh. `http://192.168.1.X:5000/api`).

### 4. Nisni aplikacionin me Expo:
```bash
npx expo start
```
* Skanoni kodin QR me kamerën e telefonit tuaj (iOS) ose me aplikacionin **Expo Go** (Android).
* Ose shtypni `a` për Android Emulator, `i` për iOS Simulator, ose `w` për Web.
