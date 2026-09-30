const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Qasja u refuzua. Ju lutem kyçuni (Token mungon).'
            });
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'sekreti_shume_i_sigurt_kalkulimi_jwt_token_2026';

        const decoded = jwt.verify(token, secret);
        req.user = decoded; // { id, name, email, group_id }

        next();
    } catch (error) {
        console.error('Gabim në Auth Middleware:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Token i pavlefshëm ose i skaduar. Ju lutem ri-kyçuni.'
        });
    }
};

module.exports = authMiddleware;
