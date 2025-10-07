const mysql = require('mysql2/promise');
require('dotenv').config();

// 允許 DB_HOST 可帶入 "host:port"，或使用 DB_PORT 指定連接埠
const rawHost = process.env.DB_HOST || 'localhost';
let host = rawHost;
let port = Number(process.env.DB_PORT || 3306);
if (rawHost.includes(':')) {
  const [h, p] = rawHost.split(':');
  host = h;
  if (p) {
    const parsed = Number(p);
    if (!Number.isNaN(parsed)) port = parsed;
  }
}

const pool = mysql.createPool({
  host,
  port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // BIGINT 精度：確保像 snowflake 這樣的大數以字串形式傳回，避免 JS 53-bit 浮點精度問題
  supportBigNumbers: true,
  bigNumberStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;