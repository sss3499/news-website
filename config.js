module.exports = {
  db: {
    host: '192.168.100.36',
    user: 'root',
    password: '123456',
    database: 'news_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  server: {
    port: 3000,
    secretKey: 'your-secret-key-here',
    saltRounds: 10
  }
};