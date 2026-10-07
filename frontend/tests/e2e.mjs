// ==============================================================================
// TEST END-TO-END kundrejt Supabase-it REAL (nga frontend/.env.local)
// ==============================================================================
// Përdor kodin e vërtetë të aplikacionit (authApi, householdApi, expenseApi, balances.js).
// Krijon 2 llogari testuese (e2e.*@mailinator.com) dhe një banesë testuese; në fund fshin
// shpenzimet/pagesat dhe largon të dy përdoruesit nga banesa. Llogaritë mbeten te
// Supabase -> Authentication -> Users (mund t'i fshini atje).
// Kërkon: "Confirm email" i fikur dhe skema e fundit e supabase/schema.sql.
//
//   cd frontend && npm run test:e2e
// ==============================================================================
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const FRONT = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root: FRONT, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const load = (p) => server.ssrLoadModule(p);
const { authApi } = await load('/src/api/authApi.js');
const { householdApi } = await load('/src/api/householdApi.js');
const { expenseApi } = await load('/src/api/expenseApi.js');
const { supabase, supabaseConfigError } = await load('/src/lib/supabaseClient.js');
if (!supabase) {
  console.error('Supabase nuk është konfiguruar:', supabaseConfigError);
  process.exit(1);
}

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`);
};
const ts = Date.now().toString(36);
const A = { name: 'E2E Artan', email: `e2e.artan.${ts}@mailinator.com`, password: `Test-${ts}!` };
const B = { name: 'E2E Blerta', email: `e2e.blerta.${ts}@mailinator.com`, password: `Test-${ts}?` };
const as = async (u) => { await authApi.logout(); await authApi.login(u); };
const created = { expenses: [], settlements: [] };

try {
  // 1. Regjistrimi + krijimi i banesës
  const regA = await authApi.register(A);
  check('Regjistrimi i A (pa konfirmim email-i)', !regA.needsConfirmation, regA.needsConfirmation ? 'Confirm email është AKTIV' : '');
  if (regA.needsConfirmation) throw new Error('Çaktivizoni Confirm email për testin.');
  const hh = await householdApi.createHousehold('E2E Banesa Test');
  check('A krijon banesën me kod unik', /^BANESA-\d{4,}$/.test(hh.code), hh.code);
  A.id = (await supabase.auth.getUser()).data.user.id;

  // 2. B regjistrohet me kodin (me shkronja të vogla)
  await authApi.logout();
  await authApi.register({ ...B, household_code: hh.code.toLowerCase() });
  const profB = await householdApi.getMyProfile();
  B.id = profB.id;
  check('B bashkohet me kod gjatë regjistrimit', profB.household?.id === hh.id, profB.household?.code);
  const members = await householdApi.getMembers(hh.id);
  check('Banesa ka 2 anëtarë', members.length === 2, members.map((m) => m.name).join(', '));

  // 3. Realtime: A dëgjon nga një klient tjetër (si pajisje e dytë)
  const env = Object.fromEntries(fs.readFileSync(`${FRONT}/.env.local`, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => l.split(/=(.*)/).slice(0, 2)));
  const deviceA = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await deviceA.auth.signInWithPassword({ email: A.email, password: A.password });
  let rtResolve;
  const rtEvent = new Promise((r) => (rtResolve = r));
  let joined = false;
  const ch = deviceA
    .channel('e2e-' + ts)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses', filter: `household_id=eq.${hh.id}` }, (p) => rtResolve(p.new))
    .subscribe((status) => { if (status === 'SUBSCRIBED') joined = true; });
  for (let i = 0; i < 80 && !joined; i++) await new Promise((r) => setTimeout(r, 100));
  check('Pajisja e A lidhet me Realtime', joined);

  // 4. B regjistron qiranë 200 € që e PAGOI A ("Kush e pagoi?")
  const t0 = Date.now();
  const rent = (await expenseApi.createExpense({ title: 'E2E Qiraja', total_amount: 200, category: 'Banesë', isPersonal: false, member_ids: [A.id, B.id], paid_by: A.id })).data;
  created.expenses.push(rent.id);
  check('B shton shpenzim me pagues A', rent.paid_by === A.id && rent.created_by === B.id);
  const rt = await Promise.race([rtEvent, new Promise((r) => setTimeout(() => r(null), 10000))]);
  check('Pajisja e A e merr shpenzimin në kohë reale', Number(rt?.id) === Number(rent.id), rt ? `${Date.now() - t0} ms` : 'asnjë ngjarje brenda 10s');
  await deviceA.removeChannel(ch);
  await deviceA.auth.signOut();

  // 5. B shton shpenzim personal
  const coffee = (await expenseApi.createExpense({ title: 'E2E Kafe personale', total_amount: 15, category: 'Ushqim', isPersonal: true })).data;
  created.expenses.push(coffee.id);

  // 5b. Fatura e muajit të kaluar (data e shpenzimit) nuk hyn te totali i këtij muaji
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const lastMonthISO = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-15`;
  const oldBill = (await expenseApi.createExpense({ title: 'E2E Fatura muaji kaluar', total_amount: 7, category: 'Rrymë', isPersonal: true, expense_date: lastMonthISO })).data;
  created.expenses.push(oldBill.id);
  check('Shpenzimi ruan datën e zgjedhur', oldBill.expense_date === lastMonthISO, oldBill.expense_date);
  let future = false;
  try { await expenseApi.createExpense({ title: 'E2E e ardhme', total_amount: 1, category: 'x', isPersonal: true, expense_date: '2099-01-01' }); } catch { future = true; }
  check('Data në të ardhmen refuzohet', future);

  // 6. Pamja e B
  let sB = await expenseApi.getSummary(hh.id);
  const debtB = sB.summary.settlementBalance.breakdown[0];
  check('B sheh: "Ti i ke borxh E2E Artan: 100 €"', debtB?.type === 'user_owes' && debtB.amount === 100 && debtB.name === A.name, debtB && `${debtB.type} ${debtB.amount} ${debtB.name}`);
  check('Kafeja personale nuk krijon borxh', sB.summary.settlementBalance.totalUserOwes === 100);
  check('Totali mujor i B = 15 € (vetëm sa pagoi vetë)', sB.summary.currentMonth.totalPaidOutOfPocket === 15, String(sB.summary.currentMonth.totalPaidOutOfPocket));
  check('B mund ta ndryshojë qiranë (e regjistroi)', sB.expenses.find((e) => e.id === rent.id)?.can_edit === true);
  let leaveBlocked = false;
  try { await householdApi.leaveHousehold(); } catch (e) { leaveBlocked = /borxhet/.test(e.message); }
  check('B nuk mund të largohet me borxh të pashlyer', leaveBlocked);

  // 7. Pamja e A
  await as(A);
  let sA = await expenseApi.getSummary(hh.id);
  const credA = sA.summary.settlementBalance.breakdown[0];
  check('A sheh: "E2E Blerta të ka borxh: 100 €"', credA?.type === 'owed_to_user' && credA.amount === 100, credA && `${credA.type} ${credA.amount}`);
  check('A NUK e sheh kafenë personale të B', !sA.expenses.some((e) => e.id === coffee.id), `${sA.expenses.length} shpenzime të dukshme`);
  check('Totali mujor i A = 200 €', sA.summary.currentMonth.totalPaidOutOfPocket === 200);
  let blocked = false;
  try { await expenseApi.deleteExpense(coffee.id); } catch { blocked = true; }
  check('A nuk mund ta fshijë kafenë e B', blocked);

  // 8. "Laje Borxhin": B paguan pjesërisht 40, pastaj 60
  await as(B);
  await expenseApi.settleUp({ householdId: hh.id, fromUser: B.id, toUser: A.id, amount: 40 });
  sB = await expenseApi.getSummary(hh.id);
  check('Pas pagesës 40 €, B i ka borxh 60 €', sB.summary.settlementBalance.breakdown[0]?.amount === 60);
  await expenseApi.settleUp({ householdId: hh.id, fromUser: B.id, toUser: A.id, amount: 60 });
  sB = await expenseApi.getSummary(hh.id);
  created.settlements.push(...sB.settlements.map((s) => s.id));
  check('Pas pagesës 60 €, B është i barazuar', sB.summary.settlementBalance.breakdown.length === 0);
  let rejected = false;
  try { await expenseApi.settleUp({ householdId: hh.id, fromUser: A.id, toUser: A.id, amount: 1 }); } catch { rejected = true; }
  check('Pagesa e pavlefshme (A→A, nga B) refuzohet', rejected);

  // 9. A e sheh barazimin dhe raportin
  await as(A);
  sA = await expenseApi.getSummary(hh.id);
  check('A sheh borxhin 0 (të barazuar)', sA.summary.settlementBalance.breakdown.length === 0);
  // 10. Ndarje jo e barabartë: B paguan internetin 40 €, A merr 75% (30 €), B 25% (10 €)
  await as(B);
  const { computeSplitAmounts } = await load('/src/utils/balances.js');
  const pct = computeSplitAmounts(40, [A.id, B.id], 'percent', { [A.id]: 75, [B.id]: 25 });
  const net = (await expenseApi.createExpense({ title: 'E2E Interneti', total_amount: 40, category: 'Internet', isPersonal: false, member_ids: [A.id, B.id], paid_by: B.id, split_mode: 'percent', split_amounts: pct.amounts })).data;
  created.expenses.push(net.id);
  check('Shpenzimi ruhet me split_mode = percent', net.split_mode === 'percent');
  let badSplit = false;
  try { await expenseApi.createExpense({ title: 'E2E gabim', total_amount: 40, category: 'x', isPersonal: false, member_ids: [A.id, B.id], split_mode: 'exact', split_amounts: [30, 5] }); } catch (e) { badSplit = /totalin/.test(e.message); }
  check('Databaza refuzon ndarjen që s\'jep totalin', badSplit);
  await as(A);
  sA = await expenseApi.getSummary(hh.id);
  const owesNet = sA.summary.settlementBalance.breakdown[0];
  check('A i ka borxh B 30 € (75% e 40 €)', owesNet?.type === 'user_owes' && owesNet.amount === 30, owesNet && `${owesNet.type} ${owesNet.amount}`);
  check('"Pjesa jote" e A = 30 €', sA.expenses.find((e) => e.id === net.id)?.my_split_amount === 30);

  const { report } = await expenseApi.getGroupReport(hh);
  const instr = report.settlements[0];
  check('Raporti PDF: total 240 €, 1 pagesë A → B 30 €', report.totalAmount === 240 && report.settlements.length === 1 && instr.from === A.name && instr.amount === 30, `total ${report.totalAmount}, ${report.settlements.map((x) => `${x.from}→${x.to} ${x.amount}`).join(', ')}`);
} catch (err) {
  fail++;
  console.log('❌ GABIM:', err.message);
} finally {
  try {
    const hhId = (await householdApi.getMyProfile().catch(() => null))?.household_id;
    for (const u of [B, A]) {
      await as(u);
      const prof = await householdApi.getMyProfile();
      if (!prof?.household_id) continue;
      const sum = await expenseApi.getSummary(prof.household_id);
      for (const st of sum.settlements.filter((x) => x.created_by === prof.id)) await expenseApi.deleteSettlement(st.id).catch(() => {});
      for (const ex of sum.expenses.filter((x) => x.can_edit)) await expenseApi.deleteExpense(ex.id).catch(() => {});
    }
    for (const u of [B, A]) { await as(u); await householdApi.leaveHousehold(); }
    await authApi.logout();
    console.log('🧹 Të dhënat e testit u fshinë; të dy përdoruesit dolën nga banesa.');
  } catch (e) {
    console.log('⚠️ Pastrimi:', e.message);
  }
  console.log(`\nREZULTATI: ${pass} kaluan, ${fail} dështuan`);
  console.log(`Përdoruesit testues: ${A.email}, ${B.email}`);
  await server.close();
  process.exit(fail ? 1 : 0);
}
