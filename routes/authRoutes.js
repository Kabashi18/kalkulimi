const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================================
// RRUGËT E AUTENTIFIKIMIT (Auth Routes)
// ============================================================================

// 1. POST /api/auth/register - Regjistron përdorues të ri
router.post('/register', authController.register);

// 2. POST /api/auth/login - Kyçja e përdoruesit
router.post('/login', authController.login);

// 3. GET /api/auth/me - Merr profilin e përdoruesit të kyçur
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
