const pool = require('../config/db');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');

// ============================================================================
// CONTROLLER: Menaxhimi i Shpenzimeve
// ============================================================================

/**
 * @route   POST /api/expenses
 * @desc    Regjistron një shpenzim të ri (personal ose të përbashkët me ndarje automatike)
 */
exports.createExpense = async (req, res) => {
    try {
        const { title, total_amount, category, paid_by_user_id, group_id, is_shared } = req.body;

        // Përcakto automatikisht përdoruesin që paguan nga token-i JWT (req.user.id) ose nga body
        const payerId = req.user ? req.user.id : paid_by_user_id;

        // 1. Validimet bazë të të dhënave
        if (!title || total_amount === undefined || !payerId) {
            return res.status(400).json({
                success: false,
                message: 'Fushat title dhe total_amount janë të detyrueshme.'
            });
        }

        const parsedAmount = parseFloat(total_amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'total_amount duhet të jetë një numër pozitiv.'
            });
        }

        // 2. Verifiko ekzistencën e përdoruesit që po paguan
        const payer = await User.findById(payerId);
        if (!payer) {
            return res.status(404).json({
                success: false,
                message: `Përdoruesi me ID ${payerId} nuk u gjet.`
            });
        }

        // Përcakto nëse është shpenzim grupi
        const activeGroupId = group_id !== undefined ? group_id : (is_shared ? (req.user?.group_id || 1) : null);

        // 3. Nëse shpenzimi është i përbashkët (ka activeGroupId)
        if (activeGroupId) {
            const group = await Group.findById(activeGroupId);
            if (!group) {
                return res.status(404).json({
                    success: false,
                    message: `Grupi me ID ${activeGroupId} nuk u gjet.`
                });
            }

            // Merr të gjithë anëtarët e këtij grupi
            const members = await Group.getMembers(activeGroupId);
            if (!members || members.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Ky grup nuk ka anëtarë për të ndarë shpenzimin.'
                });
            }

            // Përdorim Transaksion në MySQL për të garantuar integritetin e të dhënave
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Krijojmë shpenzimin kryesor
                const expenseId = await Expense.create({
                    title,
                    total_amount: parsedAmount,
                    category: category || 'Banesë',
                    paid_by_user_id: payerId,
                    group_id: activeGroupId
                }, connection);

                // Llogaritja e ndarjes së barabartë sipas numrit të anëtarëve
                const memberCount = members.length;
                const splitsArray = [];
                let allocatedSum = 0;

                for (let i = 0; i < memberCount; i++) {
                    let amountOwed;
                    // Në anëtarin e fundit rregullojmë mbetjen e qindarkave nëse ka (p.sh. 100 / 3 = 33.33 + 33.33 + 33.34)
                    if (i === memberCount - 1) {
                        amountOwed = Number((parsedAmount - allocatedSum).toFixed(2));
                    } else {
                        amountOwed = Number((parsedAmount / memberCount).toFixed(2));
                        allocatedSum += amountOwed;
                    }

                    splitsArray.push([expenseId, members[i].id, amountOwed]);
                }

                // Ruajmë ndarjet në tabelën expense_splits
                await Expense.createSplits(splitsArray, connection);

                // Konfirmojmë transaksionin
                await connection.commit();

                // Marrim shpenzimin e plotë me ndarjet për përgjigjen
                const completeExpense = await Expense.getByIdWithSplits(expenseId);

                return res.status(201).json({
                    success: true,
                    message: `Shpenzimi i përbashkët u regjistrua me sukses dhe u nda mes ${memberCount} anëtarëve.`,
                    data: completeExpense
                });
            } catch (transactionError) {
                await connection.rollback();
                throw transactionError;
            } finally {
                connection.release();
            }
        }

        // 4. Nëse është shpenzim personal (pa group_id)
        const expenseId = await Expense.create({
            title,
            total_amount: parsedAmount,
            category: category || 'Personal',
            paid_by_user_id: payerId,
            group_id: null
        });

        const completeExpense = await Expense.getByIdWithSplits(expenseId);

        return res.status(201).json({
            success: true,
            message: 'Shpenzimi personal u regjistrua me sukses.',
            data: completeExpense
        });

    } catch (error) {
        console.error('Gabim në createExpense:', error);
        return res.status(500).json({
            success: false,
            message: 'Ndodhi një gabim i brendshëm në server gjatë regjistrimit të shpenzimit.',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/expenses/summary/:userId
 * @desc    Kthen të gjitha shpenzimet e përdoruesit, totalin e këtij muaji dhe bilancin e barazimit
 */
exports.getUserExpenseSummary = async (req, res) => {
    try {
        const targetUserId = (req.params.userId && req.params.userId !== 'me') ? req.params.userId : (req.user?.id || 1);

        // 1. Verifikojmë ekzistencën e përdoruesit
        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: `Përdoruesi me ID ${targetUserId} nuk u gjet.`
            });
        }

        // 2. Të gjitha shpenzimet e përdoruesit (të paguara prej tij ose ku merr pjesë në ndarje)
        const expenses = await Expense.getAllByUserId(targetUserId);

        // 3. Totali i shpenzuar gjatë muajit aktual (paratë e paguara nga xhepi)
        const monthlyTotalPaid = await Expense.getMonthlyTotalPaid(targetUserId);

        // Pjesa e tij reale e konsumit këtë muaj (shpenzime personale + pjesa e tij në shpenzime grupi)
        const monthlyPersonalShare = await Expense.getMonthlyPersonalShare(targetUserId);

        // 4. Llogaritja e Bilancit të Barazimit (Settlement Balance)
        // Sa ka paguar ky person për grupet gjithsej vs Sa detyrohet nga ndarjet
        const totalPaidForGroups = await Expense.getTotalPaidForGroups(targetUserId);
        const totalOwedForGroups = await Expense.getTotalOwedForGroups(targetUserId);

        // netBalance = Çfarë ka paguar për të tjerët - Pjesa që i takon atij
        const netBalance = Number((totalPaidForGroups - totalOwedForGroups).toFixed(2));

        let balanceStatus = 'settled';
        let balanceMessage = 'Të gjitha llogaritë me grupin janë të barazuara (0.00 €).';

        if (netBalance > 0) {
            balanceStatus = 'owed_to_user';
            balanceMessage = `Të tjerët të detyrohen ${netBalance.toFixed(2)} €`;
        } else if (netBalance < 0) {
            balanceStatus = 'user_owes';
            balanceMessage = `Ti i detyrohesh grupit ${Math.abs(netBalance).toFixed(2)} €`;
        }

        // Detajimi sipas grupeve individuale
        const groupBalances = await Expense.getBalancesPerGroup(targetUserId);

        // 5. Llogaritja e shpërndarjes së shpenzimeve sipas kategorive për grafikë
        const categoryMap = {};
        let totalExpensesAmount = 0;

        expenses.forEach((item) => {
            const cat = item.category || 'Të Përgjithshme';
            const amt = Number(item.total_amount);
            categoryMap[cat] = (categoryMap[cat] || 0) + amt;
            totalExpensesAmount += amt;
        });

        const categoryBreakdown = Object.keys(categoryMap).map((cat) => {
            const amt = categoryMap[cat];
            return {
                category: cat,
                amount: Number(amt.toFixed(2)),
                percentage: totalExpensesAmount > 0 ? Number(((amt / totalExpensesAmount) * 100).toFixed(1)) : 0
            };
        });

        // 6. Përgjigja e strukturuar
        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            summary: {
                currentMonth: {
                    totalPaidOutOfPocket: monthlyTotalPaid, // Totali i paguar nga xhepi këtë muaj
                    actualExpenseShare: monthlyPersonalShare.totalActualShare, // Konsumi real këtë muaj
                    breakdown: {
                        personalExpenses: monthlyPersonalShare.personalExpenses,
                        groupShare: monthlyPersonalShare.groupShare
                    }
                },
                settlementBalance: {
                    netBalance,
                    status: balanceStatus,
                    message: balanceMessage,
                    totalPaidForGroups,
                    totalOwedForGroups,
                    groups: groupBalances
                },
                categoryBreakdown
            },
            totalRecords: expenses.length,
            expenses
        });

    } catch (error) {
        console.error('Gabim në getUserExpenseSummary:', error);
        return res.status(500).json({
            success: false,
            message: 'Ndodhi një gabim i brendshëm në server gjatë gjenerimit të përmbledhjes.',
            error: error.message
        });
    }
};

/**
 * @route   PUT /api/expenses/:id
 * @desc    Përditëson një shpenzim ekzistues dhe rilogarit automatikisht ndarjet
 */
exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, total_amount, category, paid_by_user_id, group_id, is_shared, split_count } = req.body;

        const existingExpense = await Expense.getByIdWithSplits(id);
        if (!existingExpense) {
            return res.status(404).json({
                success: false,
                message: `Shpenzimi me ID ${id} nuk u gjet.`
            });
        }

        const parsedAmount = total_amount !== undefined ? parseFloat(total_amount) : Number(existingExpense.total_amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'total_amount duhet të jetë një numër pozitiv.'
            });
        }

        // Përcakto nëse shpenzimi është i përbashkët apo personal
        let newGroupId = null;
        if (group_id !== undefined) {
            newGroupId = group_id;
        } else if (is_shared !== undefined) {
            newGroupId = (is_shared === true || is_shared === 'true') ? 1 : null;
        } else {
            newGroupId = existingExpense.group_id;
        }

        const newPayerId = paid_by_user_id || existingExpense.paid_by_user_id;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Përditësojmë shpenzimin në tabelën expenses
            await Expense.update(
                id,
                {
                    title: title !== undefined ? title.trim() : existingExpense.title,
                    total_amount: parsedAmount,
                    category: category || existingExpense.category,
                    paid_by_user_id: newPayerId,
                    group_id: newGroupId
                },
                connection
            );

            // Fshijmë ndarjet e mëparshme për këtë shpenzim
            await Expense.deleteSplits(id, connection);

            // Nëse është shpenzim grupi, rilogaritim ndarjet e barabarta
            if (newGroupId) {
                const members = await Group.getMembers(newGroupId);
                if (members && members.length > 0) {
                    const memberCount = (split_count && split_count > 0 && split_count <= members.length)
                        ? split_count
                        : members.length;

                    const splitsArray = [];
                    let allocatedSum = 0;

                    for (let i = 0; i < memberCount; i++) {
                        let amountOwed;
                        if (i === memberCount - 1) {
                            amountOwed = Number((parsedAmount - allocatedSum).toFixed(2));
                        } else {
                            amountOwed = Number((parsedAmount / memberCount).toFixed(2));
                            allocatedSum += amountOwed;
                        }
                        splitsArray.push([id, members[i].id, amountOwed]);
                    }

                    await Expense.createSplits(splitsArray, connection);
                }
            }

            await connection.commit();

            const updated = await Expense.getByIdWithSplits(id);
            return res.status(200).json({
                success: true,
                message: 'Shpenzimi u përditësua me sukses.',
                data: updated
            });
        } catch (trxErr) {
            await connection.rollback();
            throw trxErr;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Gabim në updateExpense:', error);
        return res.status(500).json({
            success: false,
            message: 'Dështoi përditësimi i shpenzimit.',
            error: error.message
        });
    }
};

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Fshin një shpenzim dhe të gjitha ndarjet përkatëse
 */
exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        const existingExpense = await Expense.getByIdWithSplits(id);
        if (!existingExpense) {
            return res.status(404).json({
                success: false,
                message: `Shpenzimi me ID ${id} nuk u gjet.`
            });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await Expense.deleteSplits(id, connection);
            await Expense.delete(id, connection);
            await connection.commit();

            return res.status(200).json({
                success: true,
                message: `Shpenzimi me ID ${id} u fshi me sukses.`
            });
        } catch (trxErr) {
            await connection.rollback();
            throw trxErr;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Gabim në deleteExpense:', error);
        return res.status(500).json({
            success: false,
            message: 'Dështoi fshirja e shpenzimit.',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/expenses/report/group/:groupId
 * @desc    Gjeneron raportin e plotë mujor të barazimit për grupin (për PDF)
 */
exports.getGroupMonthlyReport = async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: `Grupi me ID ${groupId} nuk u gjet.`
            });
        }

        const report = await Expense.getGroupMonthlyReport(groupId);

        return res.status(200).json({
            success: true,
            group: {
                id: group.id,
                name: group.name
            },
            report
        });
    } catch (error) {
        console.error('Gabim në getGroupMonthlyReport:', error);
        return res.status(500).json({
            success: false,
            message: 'Dështoi marrja e raportit të grupit.',
            error: error.message
        });
    }
};

