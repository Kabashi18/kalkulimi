import { describe, it, expect } from 'vitest';
import {
  isPersonalExpense,
  computeBalancesForUser,
  computeGroupReport,
  computeMonthlyOutOfPocket,
  computeCategoryBreakdown,
  computeSplitAmounts,
  expenseDateOf,
  todayISO,
  isInMonth,
  monthLabel,
  formatDateSq,
  addMonths,
  formatEuro,
  dayLabel,
  expenseEffectFor
} from './balances';

const members = [
  { id: 'A', name: 'Artan' },
  { id: 'B', name: 'Blerta' },
  { id: 'C', name: 'Dardan' }
];
const shared = (id, paid_by, total, splits, extra = {}) => ({
  id,
  paid_by,
  total_amount: total,
  is_personal: false,
  expense_date: '2026-10-05',
  splits: Object.entries(splits).map(([user_id, amount_owed]) => ({ user_id, amount_owed })),
  ...extra
});

describe('isPersonalExpense', () => {
  it('lexon isPersonal dhe is_personal, parazgjedhja është e përbashkët', () => {
    expect(isPersonalExpense({ isPersonal: true })).toBe(true);
    expect(isPersonalExpense({ is_personal: true })).toBe(true);
    expect(isPersonalExpense({ is_personal: false })).toBe(false);
    expect(isPersonalExpense({})).toBe(false);
    expect(isPersonalExpense(null)).toBe(false);
  });
});

describe('computeBalancesForUser', () => {
  const expenses = [
    shared(1, 'A', 200, { A: 100, B: 100 }),
    { id: 2, paid_by: 'B', total_amount: 15, is_personal: true, splits: [] },
    shared(3, 'C', 10, { A: 3.34, B: 3.33, C: 3.33 })
  ];

  it('llogarit borxhet dypalëshe dhe injoron shpenzimet personale', () => {
    const b = computeBalancesForUser('B', expenses, [], members);
    expect(b.breakdown).toEqual([
      { userId: 'A', name: 'Artan', amount: 100, type: 'user_owes' },
      { userId: 'C', name: 'Dardan', amount: 3.33, type: 'user_owes' }
    ]);
    expect(b.totalUserOwes).toBe(103.33);
    expect(b.netAmount).toBe(-103.33);
  });

  it('pagesat ("Laje Borxhin") e ulin borxhin, edhe pjesërisht', () => {
    const partial = computeBalancesForUser('B', expenses, [{ from_user: 'B', to_user: 'A', amount: 40 }], members);
    expect(partial.breakdown.find((x) => x.userId === 'A').amount).toBe(60);
    const full = computeBalancesForUser('B', expenses, [{ from_user: 'B', to_user: 'A', amount: 100 }], members);
    expect(full.breakdown.find((x) => x.userId === 'A')).toBeUndefined();
  });

  it('shuma e bilanceve neto të të gjithëve është 0', () => {
    // Mblidhet në centë (si vetë aplikacioni) që të shmangen gabimet e presjes dhjetore
    const cents = members.reduce((acc, m) => acc + Math.round(computeBalancesForUser(m.id, expenses, [], members).netAmount * 100), 0);
    expect(cents).toBe(0);
  });

  it('anëtarët e larguar shfaqen si "Ish-anëtar"', () => {
    const b = computeBalancesForUser('A', [shared(9, 'A', 20, { A: 10, X: 10 })], [], members);
    expect(b.breakdown[0]).toMatchObject({ userId: 'X', name: 'Ish-anëtar', amount: 10 });
  });
});

describe('computeGroupReport', () => {
  it('jep numrin minimal të pagesave dhe bilanci total është 0', () => {
    const r = computeGroupReport([shared(1, 'A', 90, { A: 30, B: 30, C: 30 })], [], members);
    expect(r.totalAmount).toBe(90);
    expect(r.settlements).toEqual([
      { fromId: 'B', toId: 'A', from: 'Blerta', to: 'Artan', amount: 30 },
      { fromId: 'C', toId: 'A', from: 'Dardan', to: 'Artan', amount: 30 }
    ]);
    expect(r.members.reduce((a, m) => a + m.netBalance, 0)).toBe(0);
  });

  it('pas pagesave nuk mbetet asnjë udhëzim', () => {
    const r = computeGroupReport(
      [shared(1, 'A', 90, { A: 30, B: 30, C: 30 })],
      [{ from_user: 'B', to_user: 'A', amount: 30 }, { from_user: 'C', to_user: 'A', amount: 30 }],
      members
    );
    expect(r.settlements).toEqual([]);
  });
});

describe('computeSplitAmounts', () => {
  const ids = ['A', 'B', 'C'];
  const sum = (r) => r.assignedCents;

  it('equal: centët e mbetur shkojnë te i fundit (si në databazë)', () => {
    expect(computeSplitAmounts(100, ids, 'equal').amounts).toEqual([33.33, 33.33, 33.34]);
  });

  it('exact: pranon shumat kur japin totalin dhe tregon sa mbeten', () => {
    expect(computeSplitAmounts(300, ids, 'exact', { A: 150, B: 100, C: 50 }).error).toBeNull();
    expect(computeSplitAmounts(300, ids, 'exact', { A: 150, B: 100, C: 30 }).error).toMatch(/Mbeten edhe 20,00\u00a0€/);
    expect(computeSplitAmounts(300, ids, 'exact', { A: 155.5, B: 100, C: 50 }).error).toMatch(/5,50\u00a0€ më shumë/);
    expect(computeSplitAmounts(0.3, ['A', 'B'], 'exact', { A: '0.1', B: '0.2' }).error).toBeNull();
    expect(computeSplitAmounts(10, ['A', 'B'], 'exact', { A: 15, B: -5 }).error).toMatch(/negative/);
  });

  it('percent: pa humbur centë, edhe për 33.33% × 3', () => {
    const r = computeSplitAmounts(10, ids, 'percent', { A: 33.33, B: 33.33, C: 33.33 });
    expect(r.error).toBeNull();
    expect(sum(r)).toBe(1000);
    expect(computeSplitAmounts(40, ['A', 'B'], 'percent', { A: 75, B: 25 }).amounts).toEqual([30, 10]);
    expect(computeSplitAmounts(100, ['A', 'B'], 'percent', { A: 60, B: 30 }).error).toMatch(/90%/);
  });

  it('percent: shuma e pjesëve është gjithmonë sa totali (1000 raste të rastësishme)', () => {
    for (let k = 0; k < 1000; k++) {
      const total = Math.round(Math.random() * 100000) / 100 + 0.01;
      const a = Math.round(Math.random() * 6000) / 100;
      const b = Math.round(Math.random() * (100 - a) * 100) / 100;
      const r = computeSplitAmounts(total, ids, 'percent', { A: a, B: b, C: Math.round((100 - a - b) * 100) / 100 });
      expect(r.error).toBeNull();
      expect(r.assignedCents).toBe(r.totalCents);
    }
  });

  it('pa anëtarë kthen gabim', () => {
    expect(computeSplitAmounts(10, [], 'equal').error).toMatch(/të paktën një anëtar/);
  });
});

describe('datat dhe muajt', () => {
  it('expenseDateOf lexon "YYYY-MM-DD" si datë lokale (pa zhvendosje UTC)', () => {
    const d = expenseDateOf({ expense_date: '2026-10-01' });
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 1]);
  });

  it('totali mujor bazohet te data e shpenzimit, jo te dita e regjistrimit', () => {
    const expenses = [
      { paid_by: 'A', total_amount: 60, expense_date: '2026-09-15', created_at: '2026-10-03T10:00:00Z' },
      { paid_by: 'A', total_amount: 10, expense_date: '2026-10-02' },
      { paid_by: 'B', total_amount: 99, expense_date: '2026-10-02' }
    ];
    expect(computeMonthlyOutOfPocket('A', expenses, new Date(2026, 9, 7))).toBe(10);
    expect(computeMonthlyOutOfPocket('A', expenses, new Date(2026, 8, 1))).toBe(60);
  });

  it('isInMonth, monthLabel, formatDateSq, addMonths, todayISO', () => {
    const oct = new Date(2026, 9, 1);
    expect(isInMonth({ expense_date: '2026-10-31' }, oct)).toBe(true);
    expect(isInMonth({ expense_date: '2026-11-01' }, oct)).toBe(false);
    expect(monthLabel(oct)).toBe('Tetor 2026');
    expect(monthLabel(addMonths(oct, -10))).toBe('Dhjetor 2025');
    expect(formatDateSq(new Date(2026, 9, 7))).toBe('07 Tet 2026');
    expect(formatDateSq(new Date(2026, 9, 7), { year: false })).toBe('07 Tet');
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('computeCategoryBreakdown jep përqindjet', () => {
    const r = computeCategoryBreakdown([
      { category: 'Rrymë', total_amount: 30 },
      { category: 'Banesë', total_amount: 70 }
    ]);
    expect(r).toEqual([
      { category: 'Rrymë', total: 30, percentage: 30 },
      { category: 'Banesë', total: 70, percentage: 70 }
    ]);
  });
});

describe('formatEuro, dayLabel, expenseEffectFor', () => {
  it('formatEuro përdor pikë për mijëshet dhe presje për decimalet', () => {
    expect(formatEuro(1234.5)).toBe('1.234,50\u00a0€');
    expect(formatEuro(0)).toBe('0,00\u00a0€');
    expect(formatEuro(-42.1)).toBe('−42,10\u00a0€');
    expect(formatEuro(42.1, { sign: true })).toBe('+42,10\u00a0€');
    expect(formatEuro(1000000)).toBe('1.000.000,00\u00a0€');
    expect(formatEuro(0.004, { sign: true })).toBe('0,00\u00a0€');
  });

  it('dayLabel: Sot / Dje / data', () => {
    const now = new Date(2026, 9, 8, 15);
    expect(dayLabel(new Date(2026, 9, 8, 1), now)).toBe('Sot');
    expect(dayLabel(new Date(2026, 9, 7), now)).toBe('Dje');
    expect(dayLabel(new Date(2026, 9, 5), now)).toBe('05 Tet');
    expect(dayLabel(new Date(2025, 11, 31), now)).toBe('31 Dhj 2025');
  });

  it('expenseEffectFor: dhashë hua / mora hua / personale', () => {
    const e = { paid_by: 'A', total_amount: 90, is_personal: false, splits: [{ user_id: 'A', amount_owed: 30 }, { user_id: 'B', amount_owed: 30 }, { user_id: 'C', amount_owed: 30 }] };
    expect(expenseEffectFor('A', e)).toEqual({ type: 'lent', amount: 60 });
    expect(expenseEffectFor('B', e)).toEqual({ type: 'borrowed', amount: 30 });
    expect(expenseEffectFor('X', e)).toEqual({ type: 'none' });
    expect(expenseEffectFor('A', { total_amount: 5, is_personal: true })).toEqual({ type: 'personal', amount: 5 });
  });
});
