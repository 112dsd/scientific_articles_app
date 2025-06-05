const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-strong-secret-key-here';
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
const db = new Database(process.env.NODE_ENV === 'production' ? '/tmp/articles.db' : './articles.db');
db.pragma('journal_mode = WAL');

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
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

initializeDatabase();

// Auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Articles API
app.post('/api/articles', authenticate, async (req, res) => {
  try {
    const { title, author, abstract, keywords, content, bibliography } = req.body;
    
    if (!title || !author || !abstract || !keywords || !content) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
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

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Статья успешно опубликована'
    });
  } catch (err) {
    console.error('Error publishing article:', err);
    res.status(500).json({ error: 'Ошибка при публикации статьи' });
  }
});

// ... (остальные маршруты остаются без изменений) ...

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});