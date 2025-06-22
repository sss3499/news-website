const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const config = require('./config');
const SECRET_KEY = config.server.secretKey;
const SALT_ROUNDS = config.server.saltRounds;

let pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'news_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 增强的 CORS 配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// 处理预检请求
app.options('*', cors());

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'news-website')));

// 初始化数据库
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
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
        url VARCHAR(255),
        views INT DEFAULT 0,
        likes INT DEFAULT 0,
        comments INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_title (title)
      )
    `);
    
    connection.release();
    console.log('数据库初始化完成');
  } catch (err) {
    console.error('数据库初始化错误:', err);
    throw err; // 抛出错误以便捕获
  }
}

// 认证中间件
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 测试API端点
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: '服务运行正常' });
});

// 用户注册
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: '请填写所有字段' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const connection = await pool.getConnection();
    
    const [result] = await connection.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    
    connection.release();
    
    const token = jwt.sign({ user: { id: result.insertId, username } }, SECRET_KEY);
    res.json({ 
      success: true,
      token,
      user: { username }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }
    res.status(500).json({ error: '注册失败', details: err.message });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    connection.release();
    
    if (rows.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const token = jwt.sign({ user: { id: user.id, username: user.username } }, SECRET_KEY);
    res.json({ 
      success: true,
      token,
      user: { username: user.username }
    });
  } catch (err) {
    res.status(500).json({ error: '登录失败', details: err.message });
  }
});

// 获取用户信息
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [req.user.id]
    );
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ 
      success: true,
      user: rows[0] 
    });
  } catch (err) {
    res.status(500).json({ error: '获取用户信息失败', details: err.message });
  }
});

app.get('/api/news', async (req, res) => {
  const { page = 1, limit = 10, category, search } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    // 基础查询
    let query = 'SELECT * FROM news';
    let countQuery = 'SELECT COUNT(*) as count FROM news';
    const params = [];
    const whereClauses = [];
    
    // 添加分类过滤
    if (category && category !== 'all') {
     if (category === 'politics') {
        whereClauses.push('(category = ? OR category = ?)');
        params.push('politics', 'n1');
      } else {
        whereClauses.push('category = ?');
        params.push(category);
      }
    }
    
    // 添加搜索过滤
    if (search) {
      whereClauses.push('(title LIKE ? OR description LIKE ? OR content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    // 标签过滤
    if (tag && tag !== '全部') {
      if (tag === '热门') {
        whereClauses.push('views > ?');
        params.push(1000); // 假设热门是浏览量大于1000
      } else if (tag === '最新') {
        whereClauses.push('date >= ?');
        params.push(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      } else {
        whereClauses.push('tags LIKE ?');
        params.push(`%${tag}%`);
      }
    }
    // 构建完整查询
    if (whereClauses.length > 0) {
      const where = ' WHERE ' + whereClauses.join(' AND ');
      query += where;
      countQuery += where;
    }
    
    // 添加排序和分页
    query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    // 执行查询
    const [total] = await pool.query(countQuery, params.slice(0, -2));
    const [rows] = await pool.query(query, params);
    
    res.json({ 
      success: true,
      news: rows, 
      total: total[0].count, 
      pages: Math.ceil(total[0].count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('获取新闻失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取新闻失败', 
      details: error.message 
    });
  }
});

// 处理404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 启动服务器
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
  }
}

startServer();