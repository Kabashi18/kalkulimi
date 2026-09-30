const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const User = require('../models/User');

const getJwtSecret = () => process.env.JWT_SECRET || 'sekreti_shume_i_sigurt_kalkulimi_jwt_token_2026';

/**
 * @route   POST /api/auth/register
 * @desc    Krijon përdorues të ri me fjalëkalim të heshuar dhe kthen JWT token
 * @body    { name, email, password, group_name }
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, group_name, group_id } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Emri, email-i dhe fjalëkalimi janë të detyrueshëm.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Fjalëkalimi duhet të ketë së paku 6 karaktere.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Verifiko nëse ekziston përdoruesi me këtë email
        const existingUser = await User.findByEmail(normalizedEmail);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Ky email tashmë është i regjistruar në sistem.'
            });
        }

        // Përcakto ose krijo grupin e banesës
        let targetGroupId = group_id ? parseInt(group_id) : 1;
        let finalGroupName = 'Banesa në Qendër';

        if (group_name && group_name.trim()) {
            const cleanGroupName = group_name.trim();
            finalGroupName = cleanGroupName;
            try {
                const [existingGroups] = await pool.query('SELECT id, name FROM `groups` WHERE name = ?', [cleanGroupName]);
                if (existingGroups && existingGroups.length > 0) {
                    targetGroupId = existingGroups[0].id;
                } else {
                    const [newGroupResult] = await pool.query('INSERT INTO `groups` (name) VALUES (?)', [cleanGroupName]);
                    targetGroupId = newGroupResult.insertId;
                }
            } catch (groupErr) {
                console.error('Kujdes gjatë trajtimit të grupit:', groupErr.message);
            }
        }

        // Hesho fjalëkalimin me bcrypt
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Krijimi i përdoruesit në MySQL
        const userId = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password_hash,
            group_id: targetGroupId
        });

        const newUser = await User.findById(userId);

        // Gjenerimi i JWT Token
        const token = jwt.sign(
            {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                group_id: newUser.group_id
            },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            success: true,
            message: 'Regjistrimi u krye me sukses!',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                group_id: newUser.group_id,
                group_name: newUser.group_name || finalGroupName
            }
        });

    } catch (error) {
        console.error('Gabim në register:', error);
        return res.status(500).json({
            success: false,
            message: 'Dështoi regjistrimi i përdoruesit.',
            error: error.message
        });
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Verifikon email dhe fjalëkalimin dhe kthen JWT token
 * @body    { email, password }
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Ju lutem shkruani email-in dhe fjalëkalimin.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Gjej përdoruesin sipas email-it
        const user = await User.findByEmail(normalizedEmail);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Email-i ose fjalëkalimi nuk është i saktë.'
            });
        }

        // Verifiko fjalëkalimin me bcrypt
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Email-i ose fjalëkalimi nuk është i saktë.'
            });
        }

        // Gjenerimi i JWT Token
        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                group_id: user.group_id || 1
            },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            message: 'U kyçët me sukses!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                group_id: user.group_id || 1,
                group_name: user.group_name || 'Banesa në Qendër'
            }
        });

    } catch (error) {
        console.error('Gabim në login:', error);
        return res.status(500).json({
            success: false,
            message: 'Dështoi kyçja e përdoruesit.',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Kthen të dhënat e përdoruesit aktual nga tokeni i verifikuar
 */
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Përdoruesi nuk u gjet.'
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                group_id: user.group_id || 1,
                group_name: user.group_name || 'Banesa në Qendër'
            }
        });
    } catch (error) {
        console.error('Gabim në getMe:', error);
        return res.status(500).json({
            success: false,
            message: 'Ndodhi një gabim gjatë verifikimit të përdoruesit.',
            error: error.message
        });
    }
};
