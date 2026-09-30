const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importimi i lidhjes me databazën dhe rrugëve
require('./config/db');
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

// Inicializimi i aplikacionit Express
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// MIDDLEWARES
// ============================================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROUTING (Endpoint-et e Aplikacionit)
// ============================================================================

// Endpoint bazik testues për të kontrolluar statusin e serverit
app.get('/', (req, res) => {
    res.json({
        message: 'Mirësevini në API-në e Menaxhimit të Shpenzimeve (Expense Manager API me JWT Auth)',
        status: 'online',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login:    'POST /api/auth/login',
                me:       'GET  /api/auth/me (Protected)'
            },
            expenses: {
                getAllAndSummary: 'GET    /api/expenses/summary/:userId (Protected)',
                getGroupReport:   'GET    /api/expenses/report/group/:groupId (Protected)',
                createExpense:    'POST   /api/expenses (Protected)',
                updateExpense:    'PUT    /api/expenses/:id (Protected)',
                deleteExpense:    'DELETE /api/expenses/:id (Protected)'
            }
        }
    });
});

// 1. Rrugët e Autentifikimit (Publike & Protected me /me)
app.use('/api/auth', authRoutes);

// 2. Rrugët e Shpenzimeve (Të mbrojtura me JWT Token)
app.use('/api', expenseRoutes);

// ============================================================================
// ERROR HANDLING (Trajtimi i gabimeve)
// ============================================================================

// Trajtimi i rrugëve që nuk ekzistojnë (404)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Rruga [${req.method}] ${req.originalUrl} nuk u gjet në server.`
    });
});

// Trajtimi i përgjithshëm i gabimeve të brendshme (500)
app.use((err, req, res, next) => {
    console.error('Gabim në server:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Ndodhi një gabim në server.',
        error: process.env.NODE_ENV === 'production' ? null : err.message
    });
});

// ============================================================================
// NISJA E SERVERIT
// ============================================================================
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 Serveri po funksionon në: http://localhost:${PORT}`);
        console.log(`🔐 Autentifikimi (Auth):`);
        console.log(`   POST   http://localhost:${PORT}/api/auth/register`);
        console.log(`   POST   http://localhost:${PORT}/api/auth/login`);
        console.log(`   GET    http://localhost:${PORT}/api/auth/me`);
        console.log(`📌 Shpenzimet (Të mbrojtura me JWT):`);
        console.log(`   POST   http://localhost:${PORT}/api/expenses`);
        console.log(`   GET    http://localhost:${PORT}/api/expenses/summary/:userId`);
        console.log(`   GET    http://localhost:${PORT}/api/expenses/report/group/:groupId`);
        console.log(`   PUT    http://localhost:${PORT}/api/expenses/:id`);
        console.log(`   DELETE http://localhost:${PORT}/api/expenses/:id`);
        console.log(`====================================================`);
    });
}

module.exports = app;
