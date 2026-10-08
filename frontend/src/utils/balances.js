// ==============================================================================
// LLOGARITJA E BORXHEVE (funksione të pastra, pa varësi nga Supabase)
// ==============================================================================
// Të gjitha llogaritjet bëhen në centë (numra të plotë) që të shmangen gabimet e
// presjes dhjetore (p.sh. 0.1 + 0.2). Konvertohen në euro vetëm në fund.

const toCents = (value) => Math.round(Number(value || 0) * 100);
const toEuro = (cents) => Number((cents / 100).toFixed(2));

const memberName = (members, id) =>
  members.find((m) => m.id === id)?.name || 'Ish-anëtar';

// Burimi i vetëm i së vërtetës: a është shpenzimi individual (personal)?
// Pranon `isPersonal` dhe `is_personal`. Nëse mungon flamuri, shpenzimi është i përbashkët.
export const isPersonalExpense = (expense) => {
  if (!expense) return false;
  if (typeof expense.isPersonal === 'boolean') return expense.isPersonal;
  if (typeof expense.is_personal === 'boolean') return expense.is_personal;
  return false;
};

/**
 * Borxhet dypalëshe të një përdoruesi me secilin shok banese.
 * Pozitiv = shoku i ka borxh përdoruesit; negativ = përdoruesi i ka borxh shokut.
 */
export const computeBalancesForUser = (userId, expenses = [], settlements = [], members = []) => {
  const net = {}; // otherUserId -> centë

  const add = (otherId, cents) => {
    if (!otherId || otherId === userId) return;
    net[otherId] = (net[otherId] || 0) + cents;
  };

  expenses.forEach((expense) => {
    if (isPersonalExpense(expense)) return; // Shpenzimet individuale nuk krijojnë borxhe
    const splits = expense.splits || [];

    if (expense.paid_by === userId) {
      // Unë pagova: secili tjetër më ka borxh pjesën e vet
      splits.forEach((s) => add(s.user_id, toCents(s.amount_owed)));
    } else {
      // Dikush tjetër pagoi: unë i kam borxh pjesën time
      const mine = splits.find((s) => s.user_id === userId);
      if (mine) add(expense.paid_by, -toCents(mine.amount_owed));
    }
  });

  settlements.forEach((s) => {
    const cents = toCents(s.amount);
    if (s.from_user === userId) add(s.to_user, cents); // Unë i dhashë para -> borxhi im zvogëlohet
    if (s.to_user === userId) add(s.from_user, -cents); // Më dhanë para -> borxhi i tyre zvogëlohet
  });

  const breakdown = Object.entries(net)
    .filter(([, cents]) => cents !== 0)
    .map(([otherId, cents]) => ({
      userId: otherId,
      name: memberName(members, otherId),
      amount: toEuro(Math.abs(cents)),
      type: cents > 0 ? 'owed_to_user' : 'user_owes'
    }))
    .sort((a, b) => b.amount - a.amount);

  const owedCents = Object.values(net).filter((c) => c > 0).reduce((a, b) => a + b, 0);
  const owesCents = Object.values(net).filter((c) => c < 0).reduce((a, b) => a - b, 0);

  return {
    breakdown,
    totalOwedToUser: toEuro(owedCents),
    totalUserOwes: toEuro(owesCents),
    netAmount: toEuro(owedCents - owesCents)
  };
};

/**
 * Raporti i plotë i banesës: sa pagoi secili, sa i takonte, bilanci neto
 * dhe numri minimal i pagesave për t'u barazuar të gjithë.
 */
export const computeGroupReport = (expenses = [], settlements = [], members = []) => {
  const shared = expenses.filter((e) => !isPersonalExpense(e));
  const stats = {};
  const ensure = (id) => (stats[id] ||= { paid: 0, owed: 0, sent: 0, received: 0 });
  members.forEach((m) => ensure(m.id));

  shared.forEach((e) => {
    ensure(e.paid_by).paid += toCents(e.total_amount);
    (e.splits || []).forEach((s) => (ensure(s.user_id).owed += toCents(s.amount_owed)));
  });
  settlements.forEach((s) => {
    ensure(s.from_user).sent += toCents(s.amount);
    ensure(s.to_user).received += toCents(s.amount);
  });

  const rows = Object.entries(stats).map(([id, s]) => ({
    userId: id,
    name: memberName(members, id),
    paidCents: s.paid,
    owedCents: s.owed,
    netCents: s.paid - s.owed + s.sent - s.received
  }));

  // Algoritmi "greedy": debitori më i madh i paguan kreditorit më të madh
  const creditors = rows.filter((r) => r.netCents > 0).map((r) => ({ ...r, left: r.netCents }));
  const debtors = rows.filter((r) => r.netCents < 0).map((r) => ({ ...r, left: -r.netCents }));
  creditors.sort((a, b) => b.left - a.left);
  debtors.sort((a, b) => b.left - a.left);

  const instructions = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const pay = Math.min(creditors[ci].left, debtors[di].left);
    instructions.push({
      fromId: debtors[di].userId,
      toId: creditors[ci].userId,
      from: debtors[di].name,
      to: creditors[ci].name,
      amount: toEuro(pay)
    });
    creditors[ci].left -= pay;
    debtors[di].left -= pay;
    if (creditors[ci].left === 0) ci += 1;
    if (debtors[di].left === 0) di += 1;
  }

  const totalCents = shared.reduce((sum, e) => sum + toCents(e.total_amount), 0);
  const memberCount = Math.max(members.length, 1);

  return {
    totalAmount: toEuro(totalCents),
    memberCount: members.length,
    perPersonAverage: toEuro(Math.round(totalCents / memberCount)),
    members: rows
      .filter((r) => members.some((m) => m.id === r.userId) || r.netCents !== 0)
      .map((r) => ({
        userId: r.userId,
        name: r.name,
        paid: toEuro(r.paidCents),
        owed: toEuro(r.owedCents),
        netBalance: toEuro(r.netCents)
      })),
    settlements: instructions,
    expenses: shared
  };
};

/**
 * Data e shpenzimit si Date lokale. `expense_date` vjen si "YYYY-MM-DD"; e lexojmë manualisht
 * sepse `new Date("2026-10-01")` interpretohet si UTC dhe mund të kalojë në ditën e mëparshme.
 */
export const expenseDateOf = (expense) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(expense?.expense_date || '');
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return expense?.created_at ? new Date(expense.created_at) : null;
};

/** Data e sotme lokale në formatin "YYYY-MM-DD" (për fushën e datës). */
export const todayISO = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/** Totali i paguar nga xhepi i përdoruesit në muajin aktual (personale + të përbashkëta). */
export const computeMonthlyOutOfPocket = (userId, expenses = [], now = new Date()) => {
  const cents = expenses
    .filter((e) => {
      const d = expenseDateOf(e);
      if (e.paid_by !== userId || !d) return false;
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, e) => sum + toCents(e.total_amount), 0);
  return toEuro(cents);
};

/** Shpërndarja sipas kategorive për grafikun. */
export const computeCategoryBreakdown = (expenses = []) => {
  const totals = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Të tjera';
    totals[cat] = (totals[cat] || 0) + toCents(e.total_amount);
  });
  const all = Object.values(totals).reduce((a, b) => a + b, 0);
  return Object.entries(totals).map(([category, cents]) => ({
    category,
    total: toEuro(cents),
    percentage: all > 0 ? Math.round((cents / all) * 100) : 0
  }));
};

/**
 * Llogarit pjesën në euro të secilit anëtar për një shpenzim të përbashkët.
 *   mode 'equal'   -> ndarje e barabartë (centët e mbetur shkojnë te të fundit, si në databazë)
 *   mode 'exact'   -> `values` janë shuma në euro; duhet të japin saktësisht totalin
 *   mode 'percent' -> `values` janë përqindje; duhet të japin 100%. Centët ndahen me metodën
 *                     e "mbetjes më të madhe", që shuma e pjesëve të jetë gjithmonë sa totali.
 * Kthen { amounts: [euro...] (në rendin e `memberIds`), error: string|null, assignedCents, totalCents }.
 */
export const computeSplitAmounts = (total, memberIds = [], mode = 'equal', values = {}) => {
  const totalCents = toCents(total);
  const n = memberIds.length;
  const result = (cents, error = null) => ({
    amounts: cents.map(toEuro),
    error,
    assignedCents: cents.reduce((a, b) => a + b, 0),
    totalCents
  });

  if (n === 0) return result([], 'Zgjidhni të paktën një anëtar për ndarjen.');

  if (mode === 'exact') {
    const cents = memberIds.map((id) => toCents(values[id]));
    if (cents.some((c) => c < 0)) return result(cents, 'Shumat nuk mund të jenë negative.');
    const sum = cents.reduce((a, b) => a + b, 0);
    if (sum !== totalCents) {
      const diff = formatEuro(Math.abs(totalCents - sum) / 100);
      return result(cents, sum < totalCents ? `Mbeten edhe ${diff} për t'u ndarë.` : `Keni ndarë ${diff} më shumë se totali.`);
    }
    return result(cents);
  }

  if (mode === 'percent') {
    const pcts = memberIds.map((id) => Number(values[id] || 0));
    if (pcts.some((p) => p < 0)) return result(memberIds.map(() => 0), 'Përqindjet nuk mund të jenë negative.');
    const pctSum = Math.round(pcts.reduce((a, b) => a + b, 0) * 100) / 100;
    // Toleranca ±0.1% lejon p.sh. 33.33% × 3 = 99.99%; përqindjet trajtohen si proporcione
    if (Math.abs(pctSum - 100) > 0.1 || pctSum === 0) {
      return result(pcts.map((p) => Math.floor((totalCents * p) / 100)), `Përqindjet japin ${pctSum}% - duhet të jenë gjithsej 100%.`);
    }
    const raw = pcts.map((p) => (totalCents * p) / pctSum);
    const cents = raw.map(Math.floor);
    // Centët e mbetur u jepen atyre me pjesën dhjetore më të madhe
    let left = totalCents - cents.reduce((a, b) => a + b, 0);
    raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac || a.i - b.i)
      .forEach(({ i }) => {
        if (left > 0) {
          cents[i] += 1;
          left -= 1;
        }
      });
    return result(cents);
  }

  // equal
  const base = Math.floor(totalCents / n);
  const cents = memberIds.map((_, i) => (i === n - 1 ? totalCents - base * (n - 1) : base));
  return result(cents);
};

// ------------------------------------------------------------------------------
// DATAT NË SHQIP (pa Intl: Hermes në Android shpesh nuk e ka gjuhën 'sq')
// ------------------------------------------------------------------------------
export const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
const MONTHS_SQ_SHORT = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj'];
const WEEKDAYS_SQ = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];

/** "Tetor 2026" */
export const monthLabel = (date) => `${MONTHS_SQ[date.getMonth()]} ${date.getFullYear()}`;

/** "07 Tet 2026" (ose "07 Tet" pa vit; me ditën e javës: "E mërkurë, 07 Tetor 2026") */
export const formatDateSq = (date, { year = true, weekday = false } = {}) => {
  if (!date) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  if (weekday) return `${WEEKDAYS_SQ[date.getDay()]}, ${dd} ${MONTHS_SQ[date.getMonth()]} ${date.getFullYear()}`;
  return `${dd} ${MONTHS_SQ_SHORT[date.getMonth()]}${year ? ` ${date.getFullYear()}` : ''}`;
};

/** Dita e parë e muajit (për zgjedhësin e muajit) */
export const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);
export const addMonths = (date, n) => new Date(date.getFullYear(), date.getMonth() + n, 1);

/** A bie shpenzimi në muajin e dhënë (sipas datës së shpenzimit)? */
export const isInMonth = (expense, monthDate) => {
  const d = expenseDateOf(expense);
  return !!d && d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
};

/**
 * Shuma në formatin shqip: 1234.5 -> "1.234,50 €" (me hapësirë që nuk ndahet para €).
 * `sign: true` shton "+" për pozitive (p.sh. bilanci neto); negativet marrin gjithmonë "−".
 */
export const formatEuro = (value, { sign = false } = {}) => {
  const n = Number(value) || 0;
  const cents = Math.round(Math.abs(n) * 100);
  const whole = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = String(cents % 100).padStart(2, '0');
  const prefix = cents === 0 ? '' : n < 0 ? '−' : sign ? '+' : '';
  // \u00a0 = hapësirë që nuk ndahet: "€" nuk kalon kurrë në rresht tjetër
  return `${prefix}${whole},${decimals}\u00a0€`;
};

/** Ditët e listës: "Sot", "Dje" ose "05 Tet 2026" */
export const dayLabel = (date, now = new Date()) => {
  if (!date) return '';
  const strip = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((strip(now) - strip(date)) / 86400000);
  if (diff === 0) return 'Sot';
  if (diff === 1) return 'Dje';
  return formatDateSq(date, { year: date.getFullYear() !== now.getFullYear() });
};

/**
 * Efekti i një shpenzimi mbi përdoruesin (si "you lent / you borrowed" te Splitwise):
 *   { type: 'lent', amount }      -> pagova unë; të tjerët më kanë borxh `amount`
 *   { type: 'borrowed', amount }  -> pagoi dikush tjetër; unë i kam borxh `amount`
 *   { type: 'personal', amount }  -> shpenzim individual
 *   { type: 'none' }              -> nuk më përfshin
 */
export const expenseEffectFor = (userId, expense) => {
  if (isPersonalExpense(expense)) return { type: 'personal', amount: Number(expense.total_amount) || 0 };
  const splits = expense.splits || [];
  const mine = splits.find((s) => s.user_id === userId);
  if (expense.paid_by === userId) {
    const othersCents = splits.filter((s) => s.user_id !== userId).reduce((a, s) => a + toCents(s.amount_owed), 0);
    return othersCents > 0 ? { type: 'lent', amount: toEuro(othersCents) } : { type: 'none' };
  }
  return mine && toCents(mine.amount_owed) > 0 ? { type: 'borrowed', amount: Number(mine.amount_owed) } : { type: 'none' };
};
