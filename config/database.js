require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

let connection;

async function connectToDatabase() {
    try {
        if (!connection) {
            connection = await mysql.createConnection(dbConfig);
            console.log('Connected to the database.');
        }
        return connection;
    } catch (error) {
        console.error('Error connecting to the database:', error);
        throw error;
    }
}

async function getAllKeys() {
    const conn = await connectToDatabase();
    const [rows] = await conn.execute('SELECT * FROM `keys`');
    return rows;
}

async function getCooldown(userId, product) {
    const conn = await connectToDatabase();
    const [rows] = await conn.execute('SELECT * FROM cooldowns WHERE user_id = ? AND product = ?', [userId, product]);
    return rows[0];
}

async function setCooldown(userId, product, cooldownEnd) {
    const conn = await connectToDatabase();
    await conn.execute('REPLACE INTO cooldowns (user_id, product, cooldown_end) VALUES (?, ?, ?)', [userId, product, cooldownEnd.toISOString().slice(0, 19).replace('T', ' ')]);
}

async function getKey(product, time) {
    const conn = await connectToDatabase();
    const [rows] = await conn.execute('SELECT * FROM `keys` WHERE product = ? AND time = ? LIMIT 1', [product, time]);
    if (rows.length > 0) {
        await conn.execute('DELETE FROM `keys` WHERE id = ?', [rows[0].id]);
        return rows[0].key;
    }
    return null;
}

async function getUserGlobalCooldown(userId) {
    const conn = await connectToDatabase();
    const [rows] = await conn.execute('SELECT * FROM user_global_cooldown WHERE user_id = ? LIMIT 1', [userId]);
    return rows.length > 0 ? rows[0] : null;
}

async function setUserGlobalCooldown(userId, cooldownEnd) {
    const conn = await connectToDatabase();
    await conn.execute('REPLACE INTO user_global_cooldown (user_id, cooldown_end) VALUES (?, ?)', [userId, cooldownEnd.toISOString().slice(0, 19).replace('T', ' ')]);
}

async function getBlacklist(userId) {
    const conn = await connectToDatabase();
    const [rows] = await conn.execute('SELECT * FROM blacklist WHERE user_id = ? LIMIT 1', [userId]);
    return rows.length > 0 ? rows[0] : null;
}

async function setBlacklist(userId, blacklistEnd) {
    const conn = await connectToDatabase();
    await conn.execute('REPLACE INTO blacklist (user_id, blacklist_end) VALUES (?, ?)', [userId, blacklistEnd.toISOString().slice(0, 19).replace('T', ' ')]);
}

module.exports = {
    getAllKeys,
    getCooldown,
    setCooldown,
    getKey,
    getUserGlobalCooldown,
    setUserGlobalCooldown,
    getBlacklist,
    setBlacklist,
};
