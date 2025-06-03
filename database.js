const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к SQLite
const db = new sqlite3.Database('./articles.db', (err) => {
    if (err) console.error('Ошибка БД:', err.message);
    else console.log('Подключено к SQLite');
});

// Инициализация БД
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
        references TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
});

// Роут регистрации (исправленный)
app.post('/register', async (req, res) => {
    const { fullname, email, password, institution } = req.body;

    try {
        // Проверка существующего email
        db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) throw err;
            if (row) return res.status(400).json({ error: 'Email уже занят' });

            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            
            db.run(
                `INSERT INTO users (fullname, email, password, institution) 
                 VALUES (?, ?, ?, ?)`,
                [fullname, email, hashedPassword, institution],
                function(err) {
                    if (err) throw err;
                    res.json({ success: true });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Остальные API-роуты (логин, статьи и т.д.)
app.post('/login', async (req, res) => { /* ... */ });
app.get('/articles', (req, res) => { /* ... */ });

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});