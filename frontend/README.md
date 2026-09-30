# Kalkulimi i Shpenzimeve - Web (Mobile View)

Ky është versioni Web me **React + Vite + Tailwind CSS**, i dizajnuar me **Mobile-First Layout** (pamje si aplikacion smartphone në ekran dhe plotësisht i përshtatshëm në telefon).

---

## 🚀 Si ta ekzekutoni në kompjuter (Lokal)

### 1. Sigurohuni që Backend-i po punon:
Hapni një terminal në `C:\Users\Admin\Desktop\kalkulimi`:
```bash
npm start
```
*(Dëgjon në portën `http://localhost:5000`)*

### 2. Nisni Frontend-in Web:
Hapni një terminal të dytë në `C:\Users\Admin\Desktop\kalkulimi\frontend`:
```bash
npm run dev
```
Aplikacioni do të hapet automatikisht në browser në: **`http://localhost:3000`**.

---

## ☁️ Si ta publikoni (Deploy) në Vercel:

1. **Ngarkimi në GitHub:**
   - Krijoni një repository në GitHub dhe bëni push dosjen `frontend`.
2. **Lidhja me Vercel:**
   - Shkoni tek [vercel.com](https://vercel.com) dhe klikoni **"Add New Project"**.
   - Zgjidhni repository-n tuaj të GitHub.
   - Tek **Root Directory**, zgjidhni dosjen `frontend` (nëse i gjithë projekti është në një repo).
   - Tek **Environment Variables**, mund të shtoni:
     * `VITE_API_URL` = URL e backend-it tuaj të publikuar (p.sh. në Render, Railway, etj.).
   - Klikoni **Deploy**.
3. Projekti do të jetë live brenda 1 minute me një domen falas `.vercel.app`.
