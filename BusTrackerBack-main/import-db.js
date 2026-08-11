const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
});

const sql = `
DROP TABLE IF EXISTS problemes;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS trajets;
DROP TABLE IF EXISTS comptes;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS parents;
DROP TABLE IF EXISTS assistantes;
DROP TABLE IF EXISTS bus;
` + fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');

connection.connect((err) => {
    if (err) {
        console.error('Connection error:', err);
        process.exit(1);
    }
    console.log('Connected to DB, running database.sql schema...');
    
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error executing SQL:', err);
            process.exit(1);
        }
        console.log('Schema imported successfully!');
        connection.end();
    });
});
