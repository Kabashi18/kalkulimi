const db = require('../config/db');

const Expense = {
    // Krijon një shpenzim të ri (mund të përdorë një lidhje transaksioni nëse ofrohet)
    create: async ({ title, total_amount, category, paid_by_user_id, group_id }, client = db) => {
        const query = `
            INSERT INTO expenses (title, total_amount, category, paid_by_user_id, group_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await client.query(query, [
            title,
            total_amount,
            category || 'Të Përgjithshme',
            paid_by_user_id,
            group_id || null
        ]);
        return result.insertId;
    },

    // Shton ndarjet (splits) për anëtarët në mënyrë grupore (batch insert)
    createSplits: async (splitsArray, client = db) => {
        if (!splitsArray || splitsArray.length === 0) return;
        const query = `
            INSERT INTO expense_splits (expense_id, user_id, amount_owed)
            VALUES ?
        `;
        // splitsArray pritet të jetë format: [[expense_id, user_id, amount_owed], ...]
        const [result] = await client.query(query, [splitsArray]);
        return result;
    },

    // Merr një shpenzim së bashku me detajet e ndarjes
    getByIdWithSplits: async (expenseId) => {
        const [expenseRows] = await db.query(
            `SELECT e.*, u.name AS paid_by_name, g.name AS group_name
             FROM expenses e
             JOIN users u ON e.paid_by_user_id = u.id
             LEFT JOIN \`groups\` g ON e.group_id = g.id
             WHERE e.id = ?`,
            [expenseId]
        );

        if (expenseRows.length === 0) return null;

        const [splitRows] = await db.query(
            `SELECT es.id, es.user_id, u.name AS user_name, u.email, es.amount_owed
             FROM expense_splits es
             JOIN users u ON es.user_id = u.id
             WHERE es.expense_id = ?`,
            [expenseId]
        );

        return {
            ...expenseRows[0],
            splits: splitRows
        };
    },

    // Kthen të gjitha shpenzimet që lidhen me një përdorues (të paguara prej tij ose ku merr pjesë në ndarje)
    getAllByUserId: async (userId) => {
        const query = `
            SELECT DISTINCT 
                e.id,
                e.title,
                e.total_amount,
                e.category,
                e.paid_by_user_id,
                u.name AS paid_by_name,
                e.group_id,
                g.name AS group_name,
                e.created_at,
                (CASE WHEN e.paid_by_user_id = ? THEN 1 ELSE 0 END) AS is_payer,
                (SELECT amount_owed FROM expense_splits WHERE expense_id = e.id AND user_id = ? LIMIT 1) AS my_split_amount
            FROM expenses e
            JOIN users u ON e.paid_by_user_id = u.id
            LEFT JOIN \`groups\` g ON e.group_id = g.id
            LEFT JOIN expense_splits es ON e.id = es.expense_id
            WHERE e.paid_by_user_id = ? OR es.user_id = ?
            ORDER BY e.created_at DESC
        `;
        const [rows] = await db.query(query, [userId, userId, userId, userId]);
        return rows;
    },

    // Totali i paguar nga ky përdorues në muajin aktual
    getMonthlyTotalPaid: async (userId) => {
        const query = `
            SELECT COALESCE(SUM(total_amount), 0) AS total_paid_this_month
            FROM expenses
            WHERE paid_by_user_id = ?
              AND MONTH(created_at) = MONTH(CURRENT_DATE())
              AND YEAR(created_at) = YEAR(CURRENT_DATE())
        `;
        const [rows] = await db.query(query, [userId]);
        return Number(rows[0].total_paid_this_month);
    },

    // Pjesa reale personale e shpenzimeve të këtij muaji (shpenzime personale + ndarjet e tij në grupe)
    getMonthlyPersonalShare: async (userId) => {
        // 1. Shpenzimet vetjake (jo të grupit) të paguara nga përdoruesi këtë muaj
        const [personalRows] = await db.query(
            `SELECT COALESCE(SUM(total_amount), 0) AS total
             FROM expenses
             WHERE paid_by_user_id = ?
               AND group_id IS NULL
               AND MONTH(created_at) = MONTH(CURRENT_DATE())
               AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
            [userId]
        );

        // 2. Pjesa (splits) që i takon përdoruesit në shpenzimet e grupit këtë muaj
        const [splitRows] = await db.query(
            `SELECT COALESCE(SUM(es.amount_owed), 0) AS total
             FROM expense_splits es
             JOIN expenses e ON es.expense_id = e.id
             WHERE es.user_id = ?
               AND MONTH(e.created_at) = MONTH(CURRENT_DATE())
               AND YEAR(e.created_at) = YEAR(CURRENT_DATE())`,
            [userId]
        );

        const personalPaid = Number(personalRows[0].total);
        const splitsOwed = Number(splitRows[0].total);

        return {
            personalExpenses: personalPaid,
            groupShare: splitsOwed,
            totalActualShare: Number((personalPaid + splitsOwed).toFixed(2))
        };
    },

    // Totali i paguar për shpenzime të grupit (nga përdoruesi)
    getTotalPaidForGroups: async (userId) => {
        const query = `
            SELECT COALESCE(SUM(total_amount), 0) AS total
            FROM expenses
            WHERE paid_by_user_id = ? AND group_id IS NOT NULL
        `;
        const [rows] = await db.query(query, [userId]);
        return Number(rows[0].total);
    },

    // Totali që ky përdorues detyrohet nga të gjitha ndarjet në grupe
    getTotalOwedForGroups: async (userId) => {
        const query = `
            SELECT COALESCE(SUM(amount_owed), 0) AS total
            FROM expense_splits
            WHERE user_id = ?
        `;
        const [rows] = await db.query(query, [userId]);
        return Number(rows[0].total);
    },

    // Fshin shpenzimin sipas ID (splits fshihen automatikisht nga CASCADE, por mund të thirret në transaksion)
    delete: async (expenseId, client = db) => {
        const [result] = await client.query('DELETE FROM expenses WHERE id = ?', [expenseId]);
        return result.affectedRows > 0;
    },

    // Përditëson shpenzimin
    update: async (expenseId, { title, total_amount, category, paid_by_user_id, group_id }, client = db) => {
        const query = `
            UPDATE expenses 
            SET title = ?, total_amount = ?, category = ?, paid_by_user_id = ?, group_id = ?
            WHERE id = ?
        `;
        const [result] = await client.query(query, [
            title,
            total_amount,
            category || 'Të Përgjithshme',
            paid_by_user_id,
            group_id || null,
            expenseId
        ]);
        return result.affectedRows > 0;
    },

    // Fshin ndarjet (splits) ekzistuese të një shpenzimi
    deleteSplits: async (expenseId, client = db) => {
        const [result] = await client.query('DELETE FROM expense_splits WHERE expense_id = ?', [expenseId]);
        return result.affectedRows;
    },

    // Raporti i detajuar mujor për të gjithë anëtarët e një grupi
    getGroupMonthlyReport: async (groupId) => {
        // 1. Shpenzimet e këtij muaji në grup
        const [expenses] = await db.query(
            `SELECT e.id, e.title, e.total_amount, e.category, e.paid_by_user_id, u.name AS paid_by_name, e.created_at
             FROM expenses e
             JOIN users u ON e.paid_by_user_id = u.id
             WHERE e.group_id = ?
               AND MONTH(e.created_at) = MONTH(CURRENT_DATE())
               AND YEAR(e.created_at) = YEAR(CURRENT_DATE())
             ORDER BY e.created_at DESC`,
            [groupId]
        );

        // 2. Anëtarët e grupit
        const [members] = await db.query(
            `SELECT u.id, u.name, u.email
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = ?`,
            [groupId]
        );

        // 3. Totali i përgjithshëm i grupit këtë muaj
        const totalAmount = expenses.reduce((sum, item) => sum + Number(item.total_amount), 0);

        // 4. Llogaritjet për secilin anëtar
        const memberBreakdown = await Promise.all(
            members.map(async (m) => {
                // Sa ka paguar ky person këtë muaj për grupin
                const [paidRes] = await db.query(
                    `SELECT COALESCE(SUM(total_amount), 0) AS total_paid
                     FROM expenses
                     WHERE group_id = ? AND paid_by_user_id = ?
                       AND MONTH(created_at) = MONTH(CURRENT_DATE())
                       AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
                    [groupId, m.id]
                );

                // Sa është pjesa e tij e detyrimit (splits) këtë muaj
                const [owedRes] = await db.query(
                    `SELECT COALESCE(SUM(es.amount_owed), 0) AS total_owed
                     FROM expense_splits es
                     JOIN expenses e ON es.expense_id = e.id
                     WHERE e.group_id = ? AND es.user_id = ?
                       AND MONTH(e.created_at) = MONTH(CURRENT_DATE())
                       AND YEAR(e.created_at) = YEAR(CURRENT_DATE())`,
                    [groupId, m.id]
                );

                const paid = Number(paidRes[0].total_paid);
                const owed = Number(owedRes[0].total_owed);
                const net = Number((paid - owed).toFixed(2));

                return {
                    userId: m.id,
                    name: m.name,
                    email: m.email,
                    paid: paid,
                    owed: owed,
                    netBalance: net, // + i detyrohen, - i detyrohet
                };
            })
        );

        // 5. Llogaritja e barazimit: Kush duhet t'i japë kujt dhe sa?
        const debtors = []; // ata me bilanc negativ (duhet të japin para)
        const creditors = []; // ata me bilanc pozitiv (duhet të marrin para)

        memberBreakdown.forEach((mb) => {
            if (mb.netBalance < -0.01) {
                debtors.push({ name: mb.name, amount: Math.abs(mb.netBalance) });
            } else if (mb.netBalance > 0.01) {
                creditors.push({ name: mb.name, amount: mb.netBalance });
            }
        });

        const settlements = [];
        let dIdx = 0;
        let cIdx = 0;

        while (dIdx < debtors.length && cIdx < creditors.length) {
            const debtor = debtors[dIdx];
            const creditor = creditors[cIdx];
            const payment = Math.min(debtor.amount, creditor.amount);

            settlements.push({
                from: debtor.name,
                to: creditor.name,
                amount: Number(payment.toFixed(2)),
                text: `${debtor.name} duhet t'i japë ${creditor.name}: ${payment.toFixed(2)} €`
            });

            debtor.amount -= payment;
            creditor.amount -= payment;

            if (debtor.amount <= 0.01) dIdx++;
            if (creditor.amount <= 0.01) cIdx++;
        }

        const perPersonAverage = members.length > 0 ? Number((totalAmount / members.length).toFixed(2)) : 0;

        return {
            month: new Date().toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' }),
            totalAmount: Number(totalAmount.toFixed(2)),
            perPersonAverage,
            memberCount: members.length,
            members: memberBreakdown,
            settlements,
            expenses
        };
    },

    // Bilanci sipas secilit grup ku bën pjesë përdoruesi
    getBalancesPerGroup: async (userId) => {
        const query = `
            SELECT 
                g.id AS group_id,
                g.name AS group_name,
                COALESCE((
                    SELECT SUM(e.total_amount) 
                    FROM expenses e 
                    WHERE e.group_id = g.id AND e.paid_by_user_id = ?
                ), 0) AS total_paid_by_user,
                COALESCE((
                    SELECT SUM(es.amount_owed) 
                    FROM expense_splits es 
                    JOIN expenses e ON es.expense_id = e.id 
                    WHERE e.group_id = g.id AND es.user_id = ?
                ), 0) AS total_user_share
            FROM \`groups\` g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = ?
        `;
        const [rows] = await db.query(query, [userId, userId, userId]);

        return rows.map((r) => {
            const paid = Number(r.total_paid_by_user);
            const owed = Number(r.total_user_share);
            const net = Number((paid - owed).toFixed(2));
            return {
                groupId: r.group_id,
                groupName: r.group_name,
                totalPaid: paid,
                totalShare: owed,
                netBalance: net,
                status: net > 0 ? 'owed_to_user' : net < 0 ? 'user_owes' : 'settled'
            };
        });
    }
};

module.exports = Expense;
