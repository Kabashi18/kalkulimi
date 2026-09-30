# Sistemi i Menaxhimit të Shpenzimeve (Node.js + Express + MySQL)

Një RESTful API i plotë për menaxhimin e shpenzimeve vetjake dhe atyre të përbashkëta në banesë (me ndarje automatike të barabartë mes shokëve të banesës dhe llogaritje të bilancit të barazimit - ngjashëm me Splitwise).

---

## 📁 Struktura e Projektit

```text
expense-manager-backend/
├── config/
│   └── db.js                 # Lidhja me MySQL Connection Pool
├── controllers/
│   └── expenseController.js  # Logjika e biznesit (regjistrimi, ndarja, përmbledhja)
├── models/
│   ├── Expense.js            # Modeli i shpenzimeve dhe ndarjeve
│   ├── Group.js              # Modeli i grupit dhe anëtarëve
│   └── User.js               # Modeli i përdoruesve
├── routes/
│   └── expenseRoutes.js      # Endpoint-et e Express.js
├── .env                      # Variablat e mjedisit lokalisht
├── .env.example              # Shembull i variablave të mjedisit
├── package.json              # Varësitë dhe skriptet e projektit
├── schema.sql                # Skema e MySQL dhe të dhëna testuese
└── server.js                 # Pika kryesore hyrëse e aplikacionit
```

---

## 🚀 Udhëzime për Instalimin dhe Ekzekutimin

### 1. Krijimi i Databazës në MySQL
Hapni MySQL Workbench, phpMyAdmin ose terminalin MySQL dhe ekzekutoni skriptin `schema.sql`:
```bash
mysql -u root -p < schema.sql
```
Kjo do të krijojë databazën `expense_tracker_db`, të gjitha tabelat me çelësat e jashtëm (Foreign Keys), dhe disa të dhëna testuese:
- 3 përdorues: Artani (ID 1), Blerta (ID 2), Dardani (ID 3)
- 1 grup: "Banesa në Qendër" (ID 1) me këta tre anëtarë.

### 2. Instalimi i Varësive
Në terminal:
```bash
cd expense-manager-backend
npm install
```

### 3. Konfigurimi i `.env`
Sigurohuni që të dhënat në `.env` përputhen me konfigurimin tuaj të MySQL:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=expense_tracker_db
```

### 4. Nisja e Serverit
```bash
npm start
# ose me nodemon për zhvillim:
npm run dev
```
Serveri do të jetë i gatshëm në: `http://localhost:5000`.

---

## 📡 API Endpoints

### 1. Regjistrimi i Shpenzimit të Ri
- **URL**: `POST /api/expenses`
- **Headers**: `Content-Type: application/json`

#### Shembull 1: Shpenzim i Përbashkët Grupi (ndahet automatikisht)
```json
{
  "title": "Blerje Ushqimore në Supermarket",
  "total_amount": 90.00,
  "category": "Ushqim",
  "paid_by_user_id": 1,
  "group_id": 1
}
```
*Çfarë ndodh:* Serveri gjen se grupi ka 3 anëtarë, llogarit ndarjen e barabartë (30.00 € për secilin) dhe me anë të një transaksioni në MySQL regjistron shpenzimin në `expenses` dhe 3 rreshta në `expense_splits`.

#### Shembull 2: Shpenzim Personal
```json
{
  "title": "Kafene & Dreka Personale",
  "total_amount": 12.50,
  "category": "Ushqim",
  "paid_by_user_id": 1,
  "group_id": null
}
```

---

### 2. Përmbledhja dhe Bilanci i Barazimit
- **URL**: `GET /api/expenses/summary/:userId`
- **Përshkrimi**: Kthen të gjitha shpenzimet e lidhura me përdoruesin, totalin e paguar gjatë këtij muaji, dhe bilancin e barazimit (sa para i detyrohet grupit ose sa i detyrohen të tjerët).

#### Shembull Përgjigjeje (JSON):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Artan Berisha",
    "email": "artan@example.com"
  },
  "summary": {
    "currentMonth": {
      "totalPaidOutOfPocket": 102.50,
      "actualExpenseShare": 42.50,
      "breakdown": {
        "personalExpenses": 12.50,
        "groupShare": 30.00
      }
    },
    "settlementBalance": {
      "netBalance": 60.00,
      "status": "owed_to_user",
      "message": "Të tjerët të detyrohen 60.00 €",
      "totalPaidForGroups": 90.00,
      "totalOwedForGroups": 30.00,
      "groups": [
        {
          "groupId": 1,
          "groupName": "Banesa në Qendër",
          "totalPaid": 90.00,
          "totalShare": 30.00,
          "netBalance": 60.00,
          "status": "owed_to_user"
        }
      ]
    }
  },
  "totalExpensesCount": 2,
  "expenses": [...]
}
```
