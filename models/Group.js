const db = require('../config/db');

const Group = {
    // Gjej grupin sipas ID
    findById: async (id) => {
        const [rows] = await db.query(
            'SELECT id, name, created_at FROM `groups` WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },

    // Merr të gjithë anëtarët e një grupi
    getMembers: async (groupId) => {
        const query = `
            SELECT u.id, u.name, u.email
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ?
        `;
        const [rows] = await db.query(query, [groupId]);
        return rows;
    },

    // Krijimi i një grupi të ri
    create: async (name) => {
        const [result] = await db.query(
            'INSERT INTO `groups` (name) VALUES (?)',
            [name]
        );
        return result.insertId;
    },

    // Shtimi i një përdoruesi në grup
    addMember: async (groupId, userId) => {
        const [result] = await db.query(
            'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
            [groupId, userId]
        );
        return result.insertId;
    }
};

module.exports = Group;
