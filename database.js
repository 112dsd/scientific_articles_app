const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'your_strong_secret_key_here';
const DATABASE_PATH = process.env.DATABASE_URL || './articles.db';

// Инициализация базы данных
const db = new sqlite3.Database(DATABASE_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к SQLite базе данных');
        initializeDatabase();
    }
});

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Инициализация таблиц
function initializeDatabase() {
    db.serialize(() => {
        // Таблица пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            institution TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица статей
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

        // Тестовые данные (для разработки)
        if (process.env.NODE_ENV !== 'production') {
            insertTestData();
        }
    });
}

// Добавление тестовых данных
function insertTestData() {
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            const testUsers = [
                ['Иван Иванов', 'ivan@example.com', bcrypt.hashSync('password123', 10), 'МГУ'],
                ['Петр Петров', 'petr@example.com', bcrypt.hashSync('password123', 10), 'СПбГУ']
            ];

            testUsers.forEach(user => {
                db.run(
                    'INSERT INTO users (fullname, email, password, institution) VALUES (?, ?, ?, ?)',
                    user,
                    function(err) {
                        if (err) return console.error(err.message);
                        console.log(`Добавлен тестовый пользователь с ID: ${this.lastID}`);
                        
                        // Добавляем тестовые статьи для пользователя
                        if (this.lastID === 1) {
                            const testArticles = [
                                ['Исследование алгоритмов', 'Иван Иванов', 'Аннотация исследования...', 'алгоритмы, анализ', 'Полный текст статьи...', '1. Кнут Д. Искусство программирования'],
                                ['Методы машинного обучения', 'Иван Иванов', 'Аннотация по ML...', 'ML, AI', 'Содержание статьи...', '2. Bishop C. Pattern Recognition']
                            ];
                            
                            testArticles.forEach(article => {
                                db.run(
                                    'INSERT INTO articles (title, author, abstract, keywords, content, references, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                    [...article, this.lastID],
                                    function(err) {
                                        if (err) return console.error(err.message);
                                        console.log(`Добавлена тестовая статья с ID: ${this.lastID}`);
                                    }
                                );
                            });
                        }
                    }
                );
            });
        }
    });
}

// Регистрация пользователя
app.post('/register', async (req, res) => {
    const { fullname, email, password, institution } = req.body;
    
    if (!fullname || !email || !password) {
        return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
    }
    
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
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email и пароль обязательны' });
    }
    
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

// Добавление новой статьи
app.post('/articles', authenticateToken, (req, res) => {
    const { title, author, abstract, keywords, content, references } = req.body;
    const userId = req.user.userId;
    
    if (!title || !author || !abstract || !keywords || !content) {
        return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
    }
    
    db.run(
        'INSERT INTO articles (title, author, abstract, keywords, content, references, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, author, abstract, keywords, content, references, userId],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Ошибка при добавлении статьи' });
            }
            
            res.status(201).json({ 
                message: 'Статья успешно добавлена', 
                articleId: this.lastID 
            });
        }
    );
});

// Получение списка статей
app.get('/articles', (req, res) => {
    const searchQuery = req.query.q;
    const userId = req.query.user_id;
    
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

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ message: 'Страница не найдена' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

module.exports = app;