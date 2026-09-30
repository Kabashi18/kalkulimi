const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================================
// RRUGËT E SHPENZIMEVE (Të mbrojtura me Auth Middleware - JWT)
// ============================================================================

// Të gjitha rrugët e shpenzimeve kërkojnë autentifikim me JWT
router.use(authMiddleware);

// 1. POST /api/expenses - Regjistron një shpenzim të ri
router.post('/expenses', expenseController.createExpense);

// 2. GET /api/expenses/summary/:userId - Kthen të gjitha shpenzimet dhe përmbledhjen e bilancit
router.get('/expenses/summary/:userId', expenseController.getUserExpenseSummary);

// 3. GET /api/expenses/report/group/:groupId - Kthen raportin mujor të barazimit për grupin (PDF)
router.get('/expenses/report/group/:groupId', expenseController.getGroupMonthlyReport);

// 4. PUT /api/expenses/:id - Përditëson shpenzimin me ID të caktuar dhe rilogarit ndarjet
router.put('/expenses/:id', expenseController.updateExpense);

// 5. DELETE /api/expenses/:id - Fshin shpenzimin dhe splits përkatëse
router.delete('/expenses/:id', expenseController.deleteExpense);

module.exports = router;
