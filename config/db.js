const mysql = require('mysql2/promise');
require('dotenv').config();

// Përcakto konfigurimin e lidhjes me MySQL (mbështet si variabla lokale ashtu edhe DATABASE_URL për Cloud DB në Vercel)
const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

let poolConfig;

if (dbUrl) {
    poolConfig = {
        uri: dbUrl,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        decimalNumbers: true,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    };
} else {
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'expense_tracker_db',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        decimalNumbers: true,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
}

const pool = mysql.createPool(poolConfig);

// Funksion për të testuar lidhjen me databazën në nisje
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ U lidh me sukses në MySQL bazën e të dhënave:', process.env.DB_NAME || 'Cloud DB');
        connection.release();
    } catch (error) {
        console.error('❌ Gabim gjatë lidhjes me MySQL:', error.message);
    }
};

testConnection();

module.exports = pool;
