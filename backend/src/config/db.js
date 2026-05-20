const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'innovevents',
    password: process.env.DB_PASSWORD || 'innovevents',
    database: process.env.DB_NAME || 'innovevents',

    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;