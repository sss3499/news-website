const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-secret-key';
const SALT_ROUNDS = 10;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'news_db'
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 初始化数据库
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // 创建用户表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建新闻表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT,
        category VARCHAR(50),
        tags VARCHAR(255),
        image VARCHAR(255),
        source VARCHAR(100),
        date DATETIME,
        views INT DEFAULT 0,
        likes INT DEFAULT 0,
        comments INT DEFAULT 0
      )
    `);
    
    connection.release();
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// 调用初始化
initDatabase();

// 从JSON文件加载新闻数据
function loadNewsData(lang) {
  try {
    const filePath = path.join(__dirname, 'news-data', `news-${lang}.json`);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading news data:', err);
    return [];
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

// API路由
// 用户注册
app.post('/api/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
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
    res.json({ token, user: { username } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Registration failed' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    connection.release();
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ user: { id: user.id, username: user.username } }, SECRET_KEY);
    res.json({ token, user: { username: user.username } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
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
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// 获取新闻
app.get('/api/news', async (req, res) => {
  const { category, tag, search, page = 1, limit = 6 } = req.query;
  const lang = req.query.lang || 'zh';
  
  try {
    let newsData = loadNewsData(lang);
    
    // 过滤逻辑
    if (category && category !== 'all') {
      newsData = newsData.filter(news => news.category === category);
    }
    
    if (tag && tag !== 'all') {
      newsData = newsData.filter(news => news.tags.includes(tag));
    }
    
    if (search) {
      const query = search.toLowerCase();
      newsData = newsData.filter(news => 
        news.title.toLowerCase().includes(query) || 
        news.description.toLowerCase().includes(query)
      );
    }
    
    // 分页逻辑
    const total = newsData.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, total);
    const paginatedData = newsData.slice(startIndex, endIndex);
    
    res.json({
      news: paginatedData,
      total,
      pages: totalPages,
      currentPage: parseInt(page)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});