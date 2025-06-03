const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your_secret_key_here';

app.use(bodyParser.json());
app.use(cors());

// Подключение к базе данных SQLite
const db = new sqlite3.Database('./articles.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite');
        initializeDatabase();
    }
});

// Инициализация базы данных
function initializeDatabase() {
    db.serialize(() => {
        // Создание таблицы пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            institution TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Создание таблицы статей
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
}

// Регистрация пользователя
app.post('/register', async (req, res) => {
    const { fullname, email, password, institution } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (fullname, email, password, institution) VALUES (?, ?, ?, ?)',
            [fullname, email, hashedPassword, institution],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
                    }
                    return res.status(500).json({ message: 'Ошибка при регистрации пользователя' });
                }
                
                res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Вход пользователя
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Ошибка сервера' });
        }
        
        if (!user) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }
        
        try {
            const passwordMatch = await bcrypt.compare(password, user.password);
            
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Неверный email или пароль' });
            }
            
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                SECRET_KEY,
                { expiresIn: '1h' }
            );
            
            res.json({ token });
        } catch (error) {
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    });
});

// Middleware для проверки аутентификации
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.sendStatus(401);
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
}

// Добавление новой статьи
app.post('/articles', authenticateToken, (req, res) => {
    const { title, author, abstract, keywords, content, references } = req.body;
    const userId = req.user.userId;
    
    db.run(
        'INSERT INTO articles (title, author, abstract, keywords, content, references, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, author, abstract, keywords, content, references, userId],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Ошибка при добавлении статьи' });
            }
            
            res.status(201).json({ message: 'Статья успешно добавлена', articleId: this.lastID });
        }
    );
});

// Получение списка статей
app.get('/articles', (req, res) => {
    const searchQuery = req.query.q;
    
    let query = 'SELECT * FROM articles';
    let params = [];
    
    if (searchQuery) {
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

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});