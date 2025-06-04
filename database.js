const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-strong-secret-key-here';
const SALT_ROUNDS = 10;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./articles.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      institution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      abstract TEXT NOT NULL,
      keywords TEXT NOT NULL,
      content TEXT NOT NULL,
      bibliography TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
  });
}

// Authentication middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { fullname, email, password, institution } = req.body;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    db.run(
      `INSERT INTO users (fullname, email, password, institution) VALUES (?, ?, ?, ?)`,
      [fullname, email, hashedPassword, institution],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email уже зарегистрирован' });
          }
          return res.status(500).json({ error: err.message });
        }
        
        const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.status(201).json({ token });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ token });
  });
});

app.get('/api/profile', authenticate, (req, res) => {
  db.get(
    `SELECT fullname, email, institution FROM users WHERE id = ?`,
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Пользователь не найден' });
      res.json(row);
    }
  );
});

app.get('/api/articles', (req, res) => {
  const { page = 1, limit = 5, q = '' } = req.query;
  const offset = (page - 1) * limit;

  db.all(
    `SELECT a.*, 
     (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comments_count
     FROM articles a
     WHERE a.title LIKE ? OR a.abstract LIKE ?
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [`%${q}%`, `%${q}%`, limit, offset],
    (err, articles) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get(
        `SELECT COUNT(*) as total FROM articles WHERE title LIKE ? OR abstract LIKE ?`,
        [`%${q}%`, `%${q}%`],
        (err, count) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ 
            articles,
            total: count.total,
            page: parseInt(page),
            pages: Math.ceil(count.total / limit)
          });
        }
      );
    }
  );
});

// Остальные маршруты остаются без изменений (как в вашем исходном файле)

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});