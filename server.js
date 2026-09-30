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
// MIDDLEWARES & CORS
// ============================================================================
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Vendos Content-Type: application/json për të gjitha rrugët API
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Trajto kërkesat OPTIONS (Pre-flight CORS)
app.options('*', cors());

// ============================================================================
// ROUTING (Endpoint-et e Backend API)
// ============================================================================

// Status Health check
app.get(['/api/health', '/health'], (req, res) => {
    res.json({
        message: 'Kalkulimi API është funksionale dhe online',
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// 1. Rrugët e Autentifikimit (mbështet si me prefiksin /api ashtu edhe pa të në Vercel)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// 2. Rrugët e Shpenzimeve
app.use('/api', expenseRoutes);
app.use('/', expenseRoutes);

// ============================================================================
// SERVING FRONTEND (React SPA Static Assets kur ekzekutohet si Fullstack Server)
// ============================================================================
const distPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(distPath));

// Për çdo rrugë jo-API, dërgo index.html të React SPA
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
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
// ERROR HANDLING (Gjithmonë kthen përgjigje JSON)
// ============================================================================

// 404 për rrugët API që nuk gjenden
app.use(['/api/*', '/auth/*'], (req, res) => {
    res.status(404).json({
        success: false,
        message: `Rruga API [${req.method}] ${req.originalUrl} nuk u gjet në server.`
    });
});

// 500 Global Error Handler me JSON të pastër
app.use((err, req, res, next) => {
    console.error('Gabim në server:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Ndodhi një gabim i brendshëm në server.',
        error: process.env.NODE_ENV === 'production' ? null : err.stack
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
