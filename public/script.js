// Общие функции
function checkAuth() {
    const authToken = localStorage.getItem('authToken');
    const protectedPages = ['add_article.html', 'profile.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !authToken) {
        window.location.href = 'login.html';
    }
}

// Обработка формы регистрации
document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (document.getElementById('password').value !== document.getElementById('confirmPassword').value) {
        alert('Пароли не совпадают!');
        return;
    }
    
    const formData = {
        fullname: document.getElementById('fullname').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        institution: document.getElementById('institution').value
    };
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Регистрация успешна!');
            window.location.href = 'login.html';
        } else {
            alert(data.message || 'Ошибка регистрации');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при регистрации');
    }
});

// Обработка формы входа
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            alert('Вход выполнен успешно!');
            window.location.href = 'index.html';
        } else {
            alert(data.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при входе');
    }
});

// Загрузка статей
async function loadArticles(searchQuery = '') {
    try {
        const url = searchQuery ? `/articles?q=${encodeURIComponent(searchQuery)}` : '/articles';
        const response = await fetch(url);
        const articles = await response.json();
        
        const articlesList = document.getElementById('articlesList');
        articlesList.innerHTML = '';
        
        if (articles.length === 0) {
            articlesList.innerHTML = '<p>Статьи не найдены</p>';
            return;
        }
        
        articles.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'article-card card';
            articleElement.innerHTML = `
                <h3>${article.title}</h3>
                <p class="article-meta">${new Date(article.created_at).toLocaleDateString()} • ${article.author}</p>
                <p>${article.abstract.substring(0, 150)}...</p>
                <a href="article.html?id=${article.id}" class="btn">Читать далее</a>
            `;
            articlesList.appendChild(articleElement);
        });
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('articlesList').innerHTML = '<p>Произошла ошибка при загрузке статей</p>';
    }
}

// Обработка поиска
document.getElementById('searchForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const query = document.getElementById('searchQuery').value;
    loadArticles(query);
});

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Показываем/скрываем кнопки входа/выхода
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        document.querySelectorAll('.login-link').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.logout-link').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.login-link').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.logout-link').forEach(el => el.style.display = 'none');
    }
    
    // Загрузка статей на соответствующей странице
    if (window.location.pathname.includes('articles.html')) {
        loadArticles();
    }
    
    // Обработчик выхода
    document.getElementById('logoutBtn')?.addEventListener('click', function() {
        localStorage.removeItem('authToken');
        window.location.href = 'index.html';
    });
});