// ==============================================================================
// EXPENSE ENGINE ME CLIENT-SIDE LOCALSTORAGE (SHPENZIME PERSONALE VS TË PËRBASHKËTA)
// ==============================================================================

import { authStorage, getAppUsers } from './authApi';

const STORAGE_KEYS = {
  EXPENSES_DB: 'kalkulimi_expenses_db',
};

// Shpenzimet fillestare realiste me ndarje të qartë Personale vs Të Përbashkëta
const DEFAULT_EXPENSES = [
  {
    id: 1,
    title: 'Rryma (KESCO)',
    total_amount: 65.50,
    category: 'Rrymë',
    paid_by_user_id: 1,
    paid_by_name: 'Artan Hoxha',
    group_id: 1,
    is_shared: true,
    is_personal: false,
    isPersonal: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    splits: [
      { user_id: 1, amount_owed: 21.84 },
      { user_id: 2, amount_owed: 21.83 },
      { user_id: 3, amount_owed: 21.83 }
    ]
  },
  {
    id: 2,
    title: 'Qiraja Mujore e Banesës',
    total_amount: 300.00,
    category: 'Banesë',
    paid_by_user_id: 2,
    paid_by_name: 'Blerta Krasniqi',
    group_id: 1,
    is_shared: true,
    is_personal: false,
    isPersonal: false,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    splits: [
      { user_id: 1, amount_owed: 100.00 },
      { user_id: 2, amount_owed: 100.00 },
      { user_id: 3, amount_owed: 100.00 }
    ]
  },
  {
    id: 3,
    title: 'Kafe & Drekë Personale',
    total_amount: 14.50,
    category: 'Ushqim',
    paid_by_user_id: 1,
    paid_by_name: 'Artan Hoxha',
    group_id: null,
    is_shared: false,
    is_personal: true,
    isPersonal: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    splits: []
  },
  {
    id: 4,
    title: 'Interneti & TV (IPKO)',
    total_amount: 25.00,
    category: 'Internet',
    paid_by_user_id: 3,
    paid_by_name: 'Dardan Gashi',
    group_id: 1,
    is_shared: true,
    is_personal: false,
    isPersonal: false,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    splits: [
      { user_id: 1, amount_owed: 8.34 },
      { user_id: 2, amount_owed: 8.33 },
      { user_id: 3, amount_owed: 8.33 }
    ]
  }
];

// Leximi i listës së shpenzimeve nga LocalStorage
const getExpenses = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES_DB);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES_DB, JSON.stringify(DEFAULT_EXPENSES));
      return DEFAULT_EXPENSES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : DEFAULT_EXPENSES;
  } catch {
    return DEFAULT_EXPENSES;
  }
};

// Ruajtja e listës së shpenzimeve në LocalStorage
const saveExpenses = (expenses) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES_DB, JSON.stringify(expenses));
  } catch (e) {
    console.error('Gabim gjatë ruajtjes së shpenzimeve në localStorage:', e);
  }
};

const getAllUsers = () => {
  return getAppUsers();
};

// Burimi i vetëm i së vërtetës: a është shpenzimi individual (personal)?
// Pranon `isPersonal` (fusha e re), si dhe `is_personal` / `is_shared` (të dhëna më të vjetra).
// Nëse asnjë flamur nuk është vendosur, shpenzimi konsiderohet i përbashkët (default).
export const isPersonalExpense = (expense) => {
  if (!expense) return false;
  if (typeof expense.isPersonal === 'boolean') return expense.isPersonal;
  if (typeof expense.is_personal === 'boolean') return expense.is_personal;
  if (typeof expense.is_shared === 'boolean') return !expense.is_shared;
  return false;
};

const isInCurrentMonth = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

// Motori i Barazimit (Settlement Engine & Split Calculations)
const calculateSummaryForUser = (userId, allExpenses, allUsers) => {
  const currentUserId = Number(userId);

  // Shpenzimet që i sheh ky përdorues: të gjitha të përbashkëtat + vetëm shpenzimet e TIJ individuale
  const visibleExpenses = allExpenses.filter(
    (e) => !isPersonalExpense(e) || Number(e.paid_by_user_id) === currentUserId
  );

  // 1. Shpenzimet e paguara direkt nga xhepi i këtij përdoruesi këtë muaj (Të gjitha: Personale + Të përbashkëta)
  const paidOutOfPocket = allExpenses
    .filter((e) => Number(e.paid_by_user_id) === currentUserId && isInCurrentMonth(e.created_at))
    .reduce((sum, e) => sum + Number(e.total_amount || 0), 0);

  // 2. Llogaritja e bilancit neto (Barazimi mes banorëve)
  // RREGULLI: Përfshihen VETËM shpenzimet e përbashkëta (isPersonal: false)
  const balancesMap = {};

  allExpenses.forEach((expense) => {
    if (isPersonalExpense(expense) || !expense.splits || expense.splits.length === 0) {
      return; // Shpenzimet individuale nuk ndikojnë në borxhe
    }

    const payerId = Number(expense.paid_by_user_id);
    const splits = expense.splits || [];

    if (payerId === currentUserId) {
      // Unë kam paguar: banorët e tjerë më kanë borxh pjesën e tyre
      splits.forEach((split) => {
        const debtorId = Number(split.user_id);
        if (debtorId !== currentUserId) {
          balancesMap[debtorId] = (balancesMap[debtorId] || 0) + Number(split.amount_owed || 0);
        }
      });
    } else {
      // Dikush tjetër ka paguar: unë i kam borxh pjesën time atij
      const mySplit = splits.find((s) => Number(s.user_id) === currentUserId);
      if (mySplit) {
        balancesMap[payerId] = (balancesMap[payerId] || 0) - Number(mySplit.amount_owed || 0);
      }
    }
  });

  // Ndërtojmë objektin settlementBalance për kartelën e barazimit
  const breakdown = Object.keys(balancesMap).map((idStr) => {
    const otherId = Number(idStr);
    const otherUser = allUsers.find((u) => u.id === otherId) || { name: `Anëtari ${otherId}` };
    const net = balancesMap[otherId];

    return {
      userId: otherId,
      name: otherUser.name,
      amount: Math.abs(net),
      type: net >= 0 ? 'owed_to_user' : 'user_owes',
      text: net >= 0
        ? `${otherUser.name} të ka borxh`
        : `I ke borxh ${otherUser.name}`
    };
  });

  const totalOwedToUser = breakdown
    .filter((b) => b.type === 'owed_to_user')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalUserOwes = breakdown
    .filter((b) => b.type === 'user_owes')
    .reduce((sum, b) => sum + b.amount, 0);

  const overallNet = totalOwedToUser - totalUserOwes;

  // 3. Shpërndarja e Kategorive për Grafiket (Category Breakdown)
  const categoryTotals = {};
  visibleExpenses.forEach((exp) => {
    const cat = exp.category || 'Të tjera';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.total_amount || 0);
  });

  const totalAllGroup = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  const categoryBreakdown = Object.keys(categoryTotals).map((catName) => {
    const total = categoryTotals[catName];
    return {
      category: catName,
      total: Number(total.toFixed(2)),
      percentage: totalAllGroup > 0 ? Math.round((total / totalAllGroup) * 100) : 0
    };
  });

  // Përgatitja e listës së shpenzimeve me flamujt e duhur
  const enrichedExpenses = visibleExpenses.map((exp) => {
    const isPayer = Number(exp.paid_by_user_id) === currentUserId;
    const isSharedExpense = !isPersonalExpense(exp);
    const mySplit = exp.splits?.find((s) => Number(s.user_id) === currentUserId);

    return {
      ...exp,
      is_shared: isSharedExpense,
      is_personal: !isSharedExpense,
      isPersonal: !isSharedExpense,
      is_payer: isPayer ? 1 : 0,
      my_split_amount: isSharedExpense && mySplit ? mySplit.amount_owed : (isPayer ? exp.total_amount : 0)
    };
  });

  return {
    summary: {
      user: allUsers.find((u) => u.id === currentUserId) || { id: currentUserId, name: 'Përdorues' },
      currentMonth: {
        totalPaidOutOfPocket: Number(paidOutOfPocket.toFixed(2))
      },
      settlementBalance: {
        netAmount: Number(overallNet.toFixed(2)),
        status: overallNet >= 0 ? 'in_credit' : 'in_debt',
        totalOwedToUser: Number(totalOwedToUser.toFixed(2)),
        totalUserOwes: Number(totalUserOwes.toFixed(2)),
        breakdown
      },
      categoryBreakdown
    },
    expenses: enrichedExpenses
  };
};

export const expenseApi = {
  // 1. Merr përmbledhjen e shpenzimeve për përdoruesin e kyçur
  getSummary: async (userId = 'me') => {
    await new Promise((r) => setTimeout(r, 60));
    const currentUser = authStorage.getUser() || { id: 1, name: 'Artan Hoxha' };
    const targetUserId = userId === 'me' ? currentUser.id : Number(userId);

    const expenses = getExpenses();
    const users = getAllUsers();

    return calculateSummaryForUser(targetUserId, expenses, users);
  },

  // 2. Regjistron një shpenzim të ri (Personal ose i Përbashkët)
  createExpense: async ({ title, total_amount, category, isPersonal, is_shared = true, is_personal = false, member_count = 3 }) => {
    await new Promise((r) => setTimeout(r, 80));
    const currentUser = authStorage.getUser() || { id: 1, name: 'Artan Hoxha', group_id: 1 };
    const expenses = getExpenses();
    const users = getAllUsers();

    const isSharedExpense = !isPersonalExpense({ isPersonal, is_personal, is_shared });
    const count = Number(member_count) || Math.max(users.length, 3);
    const parsedAmount = parseFloat(total_amount);

    if (!title || !title.trim()) {
      throw new Error('Ju lutem shkruani një titull për shpenzimin.');
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Ju lutem vendosni një shumë pozitive në euro.');
    }

    // Ndarja e barabartë nëse është shpenzim i përbashkët
    let splits = [];
    if (isSharedExpense) {
      const splitPerPerson = Number((parsedAmount / count).toFixed(2));
      const activeMembers = users.length > 0 ? users.slice(0, count) : [{ id: 1 }, { id: 2 }, { id: 3 }];
      splits = activeMembers.map((u, index) => ({
        user_id: u.id,
        amount_owed: index === count - 1
          ? Number((parsedAmount - splitPerPerson * (count - 1)).toFixed(2))
          : splitPerPerson
      }));
    }

    const newExpense = {
      id: expenses.length > 0 ? Math.max(...expenses.map((e) => e.id || 0)) + 1 : 1,
      title: title.trim(),
      total_amount: parsedAmount,
      category: category || 'Të tjera',
      paid_by_user_id: currentUser.id,
      paid_by_name: currentUser.name,
      group_id: isSharedExpense ? (currentUser.group_id || 1) : null,
      is_shared: isSharedExpense,
      is_personal: !isSharedExpense,
      isPersonal: !isSharedExpense,
      created_at: new Date().toISOString(),
      splits
    };

    expenses.unshift(newExpense);
    saveExpenses(expenses);

    return {
      success: true,
      message: 'Shpenzimi u regjistrua me sukses!',
      data: newExpense
    };
  },

  // 3. Përditëson një shpenzim ekzistues
  updateExpense: async (id, { title, total_amount, category, isPersonal, is_shared, is_personal, member_count }) => {
    await new Promise((r) => setTimeout(r, 80));
    const expenses = getExpenses();
    const index = expenses.findIndex((e) => Number(e.id) === Number(id));

    if (index === -1) {
      throw new Error(`Shpenzimi nuk u gjet.`);
    }

    const current = expenses[index];
    const parsedAmount = total_amount !== undefined ? parseFloat(total_amount) : current.total_amount;
    
    let isSharedExpense = !isPersonalExpense(current);
    if (isPersonal !== undefined) {
      isSharedExpense = !Boolean(isPersonal);
    } else if (is_personal !== undefined) {
      isSharedExpense = !Boolean(is_personal);
    } else if (is_shared !== undefined) {
      isSharedExpense = Boolean(is_shared);
    }

    const users = getAllUsers();
    const count = Number(member_count) || Math.max(users.length, 3);
    const splitPerPerson = Number((parsedAmount / count).toFixed(2));

    const updatedSplits = isSharedExpense
      ? (users.length > 0 ? users.slice(0, count) : [{ id: 1 }, { id: 2 }, { id: 3 }]).map((u, i) => ({
          user_id: u.id,
          amount_owed: i === count - 1 
            ? Number((parsedAmount - splitPerPerson * (count - 1)).toFixed(2)) 
            : splitPerPerson
        }))
      : [];

    const updated = {
      ...current,
      title: title !== undefined ? title.trim() : current.title,
      total_amount: parsedAmount,
      category: category !== undefined ? category : current.category,
      is_shared: isSharedExpense,
      is_personal: !isSharedExpense,
      isPersonal: !isSharedExpense,
      group_id: isSharedExpense ? (current.group_id || 1) : null,
      splits: updatedSplits
    };

    expenses[index] = updated;
    saveExpenses(expenses);

    return {
      success: true,
      message: 'Shpenzimi u përditësua me sukses!',
      data: updated
    };
  },

  // 4. Fshin një shpenzim
  deleteExpense: async (id) => {
    await new Promise((r) => setTimeout(r, 80));
    const expenses = getExpenses();
    saveExpenses(expenses.filter((e) => Number(e.id) !== Number(id)));
    return { success: true, message: `Shpenzimi u fshi me sukses.` };
  },

  // 5. Gjeneron raportin e barazimit mujor për grupin (VETËM shpenzimet e përbashkëta)
  getGroupReport: async (groupId = 1) => {
    await new Promise((r) => setTimeout(r, 80));
    // Përfshihen VETËM shpenzimet e përbashkëta
    const sharedExpenses = getExpenses().filter((e) => !isPersonalExpense(e));
    const users = getAllUsers();

    const totalGroupExpenses = sharedExpenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
    const memberCount = Math.max(users.length, 3);
    const fairSharePerPerson = Number((totalGroupExpenses / memberCount).toFixed(2));

    const paidByMember = {};
    users.forEach((u) => {
      paidByMember[u.id] = 0;
    });

    sharedExpenses.forEach((e) => {
      const pId = Number(e.paid_by_user_id);
      paidByMember[pId] = (paidByMember[pId] || 0) + Number(e.total_amount || 0);
    });

    const membersSummary = users.map((u) => {
      const paid = paidByMember[u.id] || 0;
      const net = paid - fairSharePerPerson;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        totalPaid: Number(paid.toFixed(2)),
        fairShare: fairSharePerPerson,
        netBalance: Number(net.toFixed(2)),
        status: net >= 0 ? 'in_credit' : 'in_debt'
      };
    });

    const creditors = membersSummary.filter((m) => m.netBalance > 0.01).map((m) => ({ ...m, remaining: m.netBalance }));
    const debtors = membersSummary.filter((m) => m.netBalance < -0.01).map((m) => ({ ...m, remaining: Math.abs(m.netBalance) }));
    const settlements = [];

    debtors.forEach((d) => {
      creditors.forEach((c) => {
        if (d.remaining > 0.01 && c.remaining > 0.01) {
          const payment = Math.min(d.remaining, c.remaining);
          settlements.push({
            fromName: d.name,
            toName: c.name,
            amount: Number(payment.toFixed(2)),
            text: `${d.name} -> i jep ${Number(payment.toFixed(2))} € -> ${c.name}`
          });
          d.remaining -= payment;
          c.remaining -= payment;
        }
      });
    });

    return {
      group: { id: groupId, name: 'Banesa Jonë', memberCount },
      totalGroupExpenses: Number(totalGroupExpenses.toFixed(2)),
      fairSharePerPerson,
      members: membersSummary,
      settlementInstructions: settlements,
      expenses: sharedExpenses
    };
  }
};
