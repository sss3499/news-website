const mysql = require('mysql2/promise');
const config = require('./config.js');

class Database {
  constructor() {
    const validConfig = {
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: config.db.waitForConnections,
      connectionLimit: config.db.connectionLimit,
      queueLimit: config.db.queueLimit,
      timezone: '+08:00',
      charset: 'utf8mb4'
    };
    this.pool = mysql.createPool(validConfig);
  }

  async createTables() {
    await this.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await this.query(`
      CREATE TABLE IF NOT EXISTS news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT,
        category VARCHAR(50) DEFAULT 'general',
        tags VARCHAR(255),
        image VARCHAR(255),
        source VARCHAR(100),
        date VARCHAR(50),
        url VARCHAR(255), -- 确保包含 url 字段
        views INT DEFAULT 0,
        likes INT DEFAULT 0,
        comments INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async query(sql, params) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.query(sql, params);
      return rows;
    } catch (error) {
      console.error('数据库查询错误:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async insertNews(news) {
    const sql = `
      INSERT INTO news 
      (title, description, content, category, tags, image, source, date, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    let dateValue = news.date;
    if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      dateValue = new Date().toISOString().split('T')[0];
    }

    const params = [
      news.title,
      news.description || '',
      news.content || '',
      news.category || 'general',
      news.tags || '新闻',
      news.image || null,
      news.source || '人民网',
      dateValue,
      news.url || '' // 确保插入 url 字段
    ];
    
    return this.query(sql, params);
  }

  async newsExists(title) {
    const sql = 'SELECT id FROM news WHERE title = ? LIMIT 1';
    const rows = await this.query(sql, [title]);
    return rows.length > 0;
  }

  async testConnection() {
    try {
      await this.createTables();
      const [rows] = await this.query('SELECT 1 AS connection_test');
      return rows && rows.length > 0;
    } catch (error) {
      console.error('数据库连接失败:', error);
      return false;
    }
  }
}

module.exports = Database;