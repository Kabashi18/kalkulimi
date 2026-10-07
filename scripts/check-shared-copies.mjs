// Kontrollon që kopjet e logjikës në mobile/ janë identike me frontend/ (përveç komentit në krye).
// Përdorimi: node scripts/check-shared-copies.mjs   (ose: npm run check:copies)
import fs from 'fs';

const FILES = ['api/authApi.js', 'api/householdApi.js', 'api/expenseApi.js', 'utils/balances.js'];
const strip = (text) => text.replace(/\r\n/g, '\n').replace(/^(\/\/[^\n]*\n)+\n?/, '');

let failed = 0;
for (const f of FILES) {
  const web = fs.readFileSync(`frontend/src/${f}`, 'utf8').replace(/\r\n/g, '\n');
  const mobile = strip(fs.readFileSync(`mobile/src/${f}`, 'utf8'));
  // Kopja në mobil ka komentin "KOPJE e ..." në krye; skedari web mund të ketë komentet e veta
  const ok = mobile === web || mobile === strip(web);
  console.log(`${ok ? '✅' : '❌'} ${f}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`\n${failed} kopje në mobile/src nuk përputhen me frontend/src. Kopjoni versionin web në mobil.`);
  process.exit(1);
}
