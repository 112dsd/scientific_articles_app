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
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      institution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Articles table
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

    // Comments table
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
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

// API Routes

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { fullname, email, password, institution } = req.body;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    db.run(
      `INSERT INTO users (fullname, email, password, institution) 
       VALUES (?, ?, ?, ?)`,
      [fullname, email, hashedPassword, institution],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email уже зарегистрирован' });
          }
          return res.status(500).json({ error: err.message });
        }
        
        const token = jwt.sign(
          { id: this.lastID, email },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
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

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  });
});

// Profile routes
app.get('/api/profile', authenticate, (req, res) => {
  db.get(
    `SELECT fullname, email, institution 
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Пользователь не найден' });
      res.json(row);
    }
  );
});

// Articles routes
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
        `SELECT COUNT(*) as total 
         FROM articles
         WHERE title LIKE ? OR abstract LIKE ?`,
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

app.get('/api/articles/:id', (req, res) => {
  const articleId = req.params.id;
  
  db.get(
    `SELECT * FROM articles WHERE id = ?`,
    [articleId],
    (err, article) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!article) return res.status(404).json({ error: 'Статья не найдена' });
      res.json(article);
    }
  );
});

app.post('/api/articles', authenticate, (req, res) => {
  const { title, author, abstract, keywords, content, bibliography } = req.body;
  
  db.run(
    `INSERT INTO articles 
     (title, author, abstract, keywords, content, bibliography, user_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, author, abstract, keywords, content, bibliography, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Comments routes
app.get('/api/articles/:id/comments', (req, res) => {
  const articleId = req.params.id;
  
  db.all(
    `SELECT c.*, u.fullname as author_name 
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.article_id = ?
     ORDER BY c.created_at DESC`,
    [articleId],
    (err, comments) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(comments);
    }
  );
});

app.post('/api/comments', authenticate, (req, res) => {
  const { article_id, content } = req.body;
  
  if (!content || !article_id) {
    return res.status(400).json({ error: 'Необходимы article_id и content' });
  }

  db.run(
    `INSERT INTO comments (article_id, user_id, content)
     VALUES (?, ?, ?)`,
    [article_id, req.user.id, content],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Return the new comment with author info
      db.get(
        `SELECT c.*, u.fullname as author_name 
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [this.lastID],
        (err, comment) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json(comment);
        }
      );
    }
  );
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Получение профиля пользователя
app.get('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    db.get(
        `SELECT id, fullname, email, institution, created_at 
         FROM users WHERE id = ?`,
        [userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({ message: 'Ошибка при получении профиля' });
            }
            res.json(user);
        }
    );
});

// Получение статей конкретного пользователя
app.get('/articles', (req, res) => {
    const userId = req.query.user_id;
    const searchQuery = req.query.q;
    
    let query = 'SELECT * FROM articles';
    let params = [];
    
    if (userId) {
        query += ' WHERE user_id = ?';
        params.push(userId);
    } else if (searchQuery) {
        query += ' WHERE title LIKE ? OR abstract LIKE ? OR keywords LIKE ?';
        const searchParam = `%${searchQuery}%`;
        params = [searchParam, searchParam, searchParam];
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, articles) => {
        if (err) {
            return res.status(500).json({ message: 'Ошибка при получении статей' });
        }
        res.json(articles);
    });
});

// Получение одной статьи по ID
app.get('/articles/:id', (req, res) => {
    const articleId = req.params.id;
    
    db.get(
        'SELECT * FROM articles WHERE id = ?',
        [articleId],
        (err, article) => {
            if (err) {
                return res.status(500).json({ message: 'Ошибка при получении статьи' });
            }
            if (!article) {
                return res.status(404).json({ message: 'Статья не найдена' });
            }
            res.json(article);
        }
    );
});