const mysql = require('mysql2');
require('dotenv').config(); 

// Use createPool instead of createConnection for automatic reconnection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test the connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('🚩 Erreur de connexion à MySQL :', err);
        console.error('   Code:', err.code);
        console.error('   Message:', err.message);
        console.error('   Host:', process.env.DB_HOST);
        console.error('   Database:', process.env.DB_NAME);
    } else {
        console.log('📮📮 Connecté à MySQL !');
        console.log('   Host:', process.env.DB_HOST);
        console.log('   Database:', process.env.DB_NAME);
        console.log('   User:', process.env.DB_USER);
        connection.release(); // Release the connection back to the pool
    }
});

// Handle pool errors
db.on('error', (err) => {
    console.error('🚩 MySQL pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('   Connection lost. Pool will automatically reconnect.');
    }
});

// Export the pool (it has the same query interface as connection)
module.exports = db;
