const db = require('../config/db');

const User = {
    // Gjej përdoruesin sipas ID
    findById: async (id) => {
        const [rows] = await db.query(
            'SELECT u.id, u.name, u.email, u.group_id, g.name AS group_name, u.created_at FROM users u LEFT JOIN `groups` g ON u.group_id = g.id WHERE u.id = ?',
            [id]
        );
        return rows[0] || null;
    },

    // Gjej përdoruesin sipas Email
    findByEmail: async (email) => {
        const [rows] = await db.query(
            'SELECT u.*, g.name AS group_name FROM users u LEFT JOIN `groups` g ON u.group_id = g.id WHERE u.email = ?',
            [email]
        );
        return rows[0] || null;
    },

    // Krijimi i një përdoruesi të ri
    create: async ({ name, email, password_hash, group_id = 1 }) => {
        const [result] = await db.query(
            'INSERT INTO users (name, email, password_hash, group_id) VALUES (?, ?, ?, ?)',
            [name, email, password_hash, group_id || 1]
        );
        const newUserId = result.insertId;

        // Regjistrohet automatikisht si anëtar në tabelën group_members
        if (group_id) {
            await db.query(
                'INSERT IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)',
                [group_id, newUserId]
            );
        }

        return newUserId;
    },

    // Merr listën e të gjithë përdoruesve
    getAll: async () => {
        const [rows] = await db.query(
            'SELECT id, name, email, group_id, created_at FROM users ORDER BY name ASC'
        );
        return rows;
    }
};

module.exports = User;
