// config.js
module.exports = {
  db: {
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'news_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'local',
    charset: 'utf8mb4',
    // 移除了无效的connectionTimeout
    connectTimeout: 10000 // 正确的参数名是connectTimeout
  }
};