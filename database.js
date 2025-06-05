const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-secret-key';
const SALT_ROUNDS = 10;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/articles.db' 
  : path.join(__dirname, 'articles.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON'); // Включаем проверку внешних ключей

// Initialize database
function initializeDatabase() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        institution TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        abstract TEXT NOT NULL,
        keywords TEXT NOT NULL,
        content TEXT NOT NULL,
        bibliography TEXT,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
}

initializeDatabase();

// Enhanced auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Неверный токен' });
    }
    
    // Verify user exists in database
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    req.user = decoded;
    next();
  });
}

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { fullname, email, password, institution } = req.body;
    
    if (!fullname || !email || !password) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const stmt = db.prepare(`
      INSERT INTO users (fullname, email, password, institution) 
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(fullname, email, hashedPassword, institution);
    
    const token = jwt.sign(
      { id: result.lastInsertRowid, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
      token,
      user: {
        id: result.lastInsertRowid,
        email,
        fullname,
        institution
      }
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email уже зарегистрирован' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        institution: user.institution
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Articles routes
app.get('/api/articles', (req, res) => {
  try {
    const articles = db.prepare(`
      SELECT a.*, u.fullname as author_name 
      FROM articles a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `).all();
    
    res.json(articles);
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Ошибка при загрузке статей' });
  }
});

app.post('/api/articles', authenticate, (req, res) => {
  try {
    const { title, author, abstract, keywords, content, bibliography } = req.body;
    
    if (!title || !author || !abstract || !keywords || !content) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    // Double-check user exists
    const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(req.user.id);
    if (!userExists) {
      return res.status(404).json({ error: 'Пользователь не найден. Пожалуйста, войдите снова.' });
    }

    const stmt = db.prepare(`
      INSERT INTO articles 
      (title, author, abstract, keywords, content, bibliography, user_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      title,
      author,
      abstract,
      keywords,
      content,
      bibliography || '',
      req.user.id
    );

    const newArticle = db.prepare(`
      SELECT a.*, u.fullname as author_name 
      FROM articles a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newArticle);
  } catch (err) {
    console.error('Error publishing article:', err);
    
    if (err.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(400).json({ 
        error: 'Ошибка авторизации',
        details: 'Пожалуйста, войдите снова'
      });
    }
    
    res.status(500).json({ 
      error: 'Ошибка при публикации статьи',
      details: err.message 
    });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});