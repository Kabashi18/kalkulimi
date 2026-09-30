const express = require('express');
const cors = require('cors');
const path = require('path');
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
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROUTING (Endpoint-et e Backend API)
// ============================================================================

// 1. Rrugët e Autentifikimit (Register, Login, Me)
app.use('/api/auth', authRoutes);

// 2. Rrugët e Shpenzimeve (Të mbrojtura me JWT Token)
app.use('/api', expenseRoutes);

// Endpoint testues për statusin e API
app.get('/api/health', (req, res) => {
    res.json({
        message: 'Kalkulimi API është funksionale dhe online',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// ============================================================================
// SERVING FRONTEND (React SPA Production Build)
// ============================================================================
const distPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(distPath));

// Për çdo rrugë që nuk është API, dërgo index.html të React-it (SPA Router)
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            next();
        }
    });
});

// ============================================================================
// ERROR HANDLING (Trajtimi i gabimeve për API)
// ============================================================================

// Trajtimi i rrugëve API që nuk ekzistojnë (404)
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Rruga API [${req.method}] ${req.originalUrl} nuk u gjet në server.`
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
        console.log(`📱 Frontend & API janë gati.`);
        console.log(`====================================================`);
    });
}

module.exports = app;
