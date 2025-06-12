// database.js
const mysql = require('mysql2/promise');
const config = require('./config'); // 确保引入配置文件

class Database {
  constructor() {
    // 过滤无效配置项
    const validConfig = {
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: config.db.waitForConnections,
      connectionLimit: config.db.connectionLimit,
      queueLimit: config.db.queueLimit,
      timezone: config.db.timezone,
      charset: config.db.charset,
      connectTimeout: config.db.connectTimeout
    };
    this.pool = mysql.createPool(validConfig);
  }

  async query(sql, params) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.query(sql, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  async insertNews(news) {
    const sql = `
      INSERT INTO news 
      (title, description, content, category, tags, image, source, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      news.title,
      news.description,
      news.content,
      news.category,
      news.tags,
      news.image,
      news.source,
      news.date || new Date()
    ];
    return this.query(sql, params);
  }

  async newsExists(title) {
    const sql = 'SELECT id FROM news WHERE title = ? LIMIT 1';
    const [rows] = await this.query(sql, [title]);
    return rows.length > 0;
  }
}

// 使用兼容性最好的测试查询
async function testConnection() {
  const db = new Database();
  try {
    // 使用最简单的数字测试查询
    const [rows] = await db.query('SELECT 1 AS connection_test');
    
    if (rows && rows.length > 0) {
      console.log('✅ 数据库连接成功，测试返回值:', rows[0].connection_test);
      
      // 额外测试NOW()函数
      try {
        const [timeRows] = await db.query('SELECT NOW() AS server_time');
        console.log('🕒 服务器当前时间:', timeRows[0].server_time);
      } catch (timeError) {
        console.log('⚠️ 时间查询测试失败，但基础连接正常');
      }
    } else {
      console.log('⚠️ 数据库连接成功，但查询返回空结果');
    }
  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error('错误代码:', error.code);
    console.error('错误信息:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('🔐 可能原因: 用户名或密码不正确');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💾 可能原因: 数据库不存在');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 可能原因: MySQL服务未启动或无法连接');
    }
  }
}


testConnection();

module.exports = new Database();