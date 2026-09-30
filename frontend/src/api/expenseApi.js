// ==============================================================================
// EXPENSE ENGINE ME CLIENT-SIDE LOCALSTORAGE (100% E PAVARUR NGA SERVERI)
// ==============================================================================

import { authStorage, getAppUsers } from './authApi';

const STORAGE_KEYS = {
  EXPENSES_DB: 'kalkulimi_expenses_db',
};

// Shpenzimet fillestare realiste për demonstrim të menjëhershëm
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
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    splits: [
      { user_id: 1, amount_owed: 100.00 },
      { user_id: 2, amount_owed: 100.00 },
      { user_id: 3, amount_owed: 100.00 }
    ]
  },
  {
    id: 3,
    title: 'Blerje Ushqimore në Market',
    total_amount: 54.00,
    category: 'Ushqim',
    paid_by_user_id: 1,
    paid_by_name: 'Artan Hoxha',
    group_id: 1,
    is_shared: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    splits: [
      { user_id: 1, amount_owed: 18.00 },
      { user_id: 2, amount_owed: 18.00 },
      { user_id: 3, amount_owed: 18.00 }
    ]
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
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    splits: [
      { user_id: 1, amount_owed: 8.34 },
      { user_id: 2, amount_owed: 8.33 },
      { user_id: 3, amount_owed: 8.33 }
    ]
  }
];

// Funksione ndihmëse për të menaxhuar shpenzimet në LocalStorage
const getExpenses = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES_DB);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES_DB, JSON.stringify(DEFAULT_EXPENSES));
      return DEFAULT_EXPENSES;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_EXPENSES;
  }
};

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

// Motori i Barazimit (Settlement Engine & Net Balance Calculation)
const calculateSummaryForUser = (userId, allExpenses, allUsers) => {
  const currentUserId = Number(userId);

  // 1. Shpenzimet e paguara direkt nga xhepi i këtij përdoruesi këtë muaj
  const paidOutOfPocket = allExpenses
    .filter((e) => Number(e.paid_by_user_id) === currentUserId)
    .reduce((sum, e) => sum + Number(e.total_amount || 0), 0);

  // 2. Llogaritja e bilancit neto (kush kujt i ka borxh)
  // netBalances: { [otherUserId]: netAmount } (nëse > 0: ai person më ka borxh mua; nëse < 0: unë i kam borxh atij)
  const balancesMap = {};

  allExpenses.forEach((expense) => {
    if (!expense.is_shared || !expense.splits) return;

    const payerId = Number(expense.paid_by_user_id);
    const splits = expense.splits || [];

    if (payerId === currentUserId) {
      // Unë kam paguar: të tjerët më kanë borxh pjesën e tyre
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

  // Ndërtojmë objektin settlementBalance për UI
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
  allExpenses.forEach((exp) => {
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

  // Përgatitja e listës së shpenzimeve me flamujt e duhur për UI
  const enrichedExpenses = allExpenses.map((exp) => {
    const isPayer = Number(exp.paid_by_user_id) === currentUserId;
    const mySplit = exp.splits?.find((s) => Number(s.user_id) === currentUserId);
    return {
      ...exp,
      is_payer: isPayer ? 1 : 0,
      my_split_amount: mySplit ? mySplit.amount_owed : (isPayer ? exp.total_amount : 0)
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
    await new Promise((resolve) => setTimeout(resolve, 80));
    const currentUser = authStorage.getUser() || { id: 1, name: 'Artan Hoxha' };
    const targetUserId = userId === 'me' ? currentUser.id : Number(userId);

    const expenses = getExpenses();
    const users = getAllUsers();

    return calculateSummaryForUser(targetUserId, expenses, users);
  },

  // 2. Regjistron një shpenzim të ri
  createExpense: async ({ title, total_amount, category, is_shared = true }) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const currentUser = authStorage.getUser() || { id: 1, name: 'Artan Hoxha', group_id: 1 };
    const expenses = getExpenses();
    const users = getAllUsers().filter((u) => u.group_id === (currentUser.group_id || 1));
    const memberCount = Math.max(users.length, 3); // Minimumi 3 anëtarë në grup

    const parsedAmount = parseFloat(total_amount);
    if (!title || isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Titulli dhe një shumë pozitive janë të detyrueshme.');
    }

    // Llogarit ndarjen e barabartë
    const splitPerPerson = Number((parsedAmount / memberCount).toFixed(2));
    const splits = (users.length > 0 ? users : [{ id: 1 }, { id: 2 }, { id: 3 }]).map((u, index) => ({
      user_id: u.id,
      amount_owed: index === memberCount - 1
        ? Number((parsedAmount - splitPerPerson * (memberCount - 1)).toFixed(2))
        : splitPerPerson
    }));

    const newExpense = {
      id: expenses.length > 0 ? Math.max(...expenses.map((e) => e.id || 0)) + 1 : 1,
      title: title.trim(),
      total_amount: parsedAmount,
      category: category || 'Të tjera',
      paid_by_user_id: currentUser.id,
      paid_by_name: currentUser.name,
      group_id: is_shared ? (currentUser.group_id || 1) : null,
      is_shared: Boolean(is_shared),
      created_at: new Date().toISOString(),
      splits: is_shared ? splits : []
    };

    expenses.unshift(newExpense); // Shtohet në krye të listës
    saveExpenses(expenses);

    return {
      success: true,
      message: 'Shpenzimi u regjistrua me sukses!',
      data: newExpense
    };
  },

  // 3. Përditëson një shpenzim ekzistues (Edit)
  updateExpense: async (id, { title, total_amount, category, is_shared }) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const expenses = getExpenses();
    const expenseIndex = expenses.findIndex((e) => Number(e.id) === Number(id));

    if (expenseIndex === -1) {
      throw new Error(`Shpenzimi me ID ${id} nuk u gjet.`);
    }

    const currentExpense = expenses[expenseIndex];
    const parsedAmount = total_amount !== undefined ? parseFloat(total_amount) : currentExpense.total_amount;
    const shouldBeShared = is_shared !== undefined ? Boolean(is_shared) : currentExpense.is_shared;

    const users = getAllUsers();
    const memberCount = Math.max(users.length, 3);
    const splitPerPerson = Number((parsedAmount / memberCount).toFixed(2));

    const updatedSplits = shouldBeShared
      ? (users.length > 0 ? users : [{ id: 1 }, { id: 2 }, { id: 3 }]).map((u, index) => ({
          user_id: u.id,
          amount_owed: index === memberCount - 1
            ? Number((parsedAmount - splitPerPerson * (memberCount - 1)).toFixed(2))
            : splitPerPerson
        }))
      : [];

    const updatedExpense = {
      ...currentExpense,
      title: title !== undefined ? title.trim() : currentExpense.title,
      total_amount: parsedAmount,
      category: category !== undefined ? category : currentExpense.category,
      is_shared: shouldBeShared,
      splits: updatedSplits
    };

    expenses[expenseIndex] = updatedExpense;
    saveExpenses(expenses);

    return {
      success: true,
      message: 'Shpenzimi u përditësua me sukses!',
      data: updatedExpense
    };
  },

  // 4. Fshin një shpenzim (Delete)
  deleteExpense: async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const expenses = getExpenses();
    const filtered = expenses.filter((e) => Number(e.id) !== Number(id));

    saveExpenses(filtered);

    return {
      success: true,
      message: `Shpenzimi me ID ${id} u fshi me sukses.`
    };
  },

  // 5. Gjeneron raportin e plotë të barazimit për PDF
  getGroupReport: async (groupId = 1) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const expenses = getExpenses().filter((e) => e.is_shared);
    const users = getAllUsers();

    const totalGroupExpenses = expenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
    const memberCount = Math.max(users.length, 3);
    const fairSharePerPerson = Number((totalGroupExpenses / memberCount).toFixed(2));

    // Sa ka paguar secili anëtar
    const paidByMember = {};
    users.forEach((u) => {
      paidByMember[u.id] = 0;
    });

    expenses.forEach((e) => {
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

    // Udhëzimet e pagesave (Kush kujt duhet t'i japë para)
    const creditors = membersSummary.filter((m) => m.netBalance > 0.01).map((m) => ({ ...m, remaining: m.netBalance }));
    const debtors = membersSummary.filter((m) => m.netBalance < -0.01).map((m) => ({ ...m, remaining: Math.abs(m.netBalance) }));
    const settlements = [];

    debtors.forEach((debtor) => {
      creditors.forEach((creditor) => {
        if (debtor.remaining > 0.01 && creditor.remaining > 0.01) {
          const payment = Math.min(debtor.remaining, creditor.remaining);
          settlements.push({
            fromName: debtor.name,
            toName: creditor.name,
            amount: Number(payment.toFixed(2)),
            text: `${debtor.name} -> i jep ${Number(payment.toFixed(2))} € -> ${creditor.name}`
          });
          debtor.remaining -= payment;
          creditor.remaining -= payment;
        }
      });
    });

    return {
      group: { id: groupId, name: 'Banesa Jonë', memberCount },
      totalGroupExpenses: Number(totalGroupExpenses.toFixed(2)),
      fairSharePerPerson,
      members: membersSummary,
      settlementInstructions: settlements,
      expenses
    };
  }
};
