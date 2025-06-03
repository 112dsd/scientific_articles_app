// Обработка формы регистрации
document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        fullname: document.getElementById('fullname').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        institution: document.getElementById('institution').value
    };
    
    if (document.getElementById('password').value !== document.getElementById('confirmPassword').value) {
        alert('Пароли не совпадают!');
        return;
    }
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
            headers: {
                'Content-Type': 'application/json',
            },
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

// Обработка формы добавления статьи
document.getElementById('articleForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        alert('Для добавления статьи необходимо авторизоваться');
        window.location.href = 'login.html';
        return;
    }
    
    const formData = {
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        abstract: document.getElementById('abstract').value,
        keywords: document.getElementById('keywords').value,
        content: document.getElementById('content').value,
        references: document.getElementById('references').value
    };
    
    try {
        const response = await fetch('/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Статья успешно добавлена!');
            window.location.href = 'articles.html';
        } else {
            alert(data.message || 'Ошибка при добавлении статьи');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при добавлении статьи');
    }
});

// Загрузка списка статей
document.addEventListener('DOMContentLoaded', async function() {
    if (window.location.pathname.includes('articles.html')) {
        try {
            const response = await fetch('/articles');
            const articles = await response.json();
            
            const articlesList = document.getElementById('articlesList');
            articlesList.innerHTML = '';
            
            if (articles.length === 0) {
                articlesList.innerHTML = '<p>Статьи не найдены</p>';
                return;
            }
            
            articles.forEach(article => {
                const articleElement = document.createElement('div');
                articleElement.className = 'article-preview';
                articleElement.innerHTML = `
                    <h3>${article.title}</h3>
                    <p class="author">Автор: ${article.author}</p>
                    <p class="abstract">${article.abstract.substring(0, 150)}...</p>
                    <a href="#" class="read-more" data-id="${article.id}">Читать далее</a>
                `;
                articlesList.appendChild(articleElement);
            });
            
            // Обработка клика на "Читать далее"
            document.querySelectorAll('.read-more').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const articleId = this.getAttribute('data-id');
                    // Здесь можно реализовать открытие полной статьи
                    alert(`Открыть статью с ID: ${articleId}`);
                });
            });
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('articlesList').innerHTML = '<p>Произошла ошибка при загрузке статей</p>';
        }
    }
});

// Обработка формы поиска
document.getElementById('searchForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const query = document.getElementById('searchQuery').value;
    
    try {
        const response = await fetch(`/articles?q=${encodeURIComponent(query)}`);
        const articles = await response.json();
        
        const articlesList = document.getElementById('articlesList');
        articlesList.innerHTML = '';
        
        if (articles.length === 0) {
            articlesList.innerHTML = '<p>По вашему запросу ничего не найдено</p>';
            return;
        }
        
        articles.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'article-preview';
            articleElement.innerHTML = `
                <h3>${article.title}</h3>
                <p class="author">Автор: ${article.author}</p>
                <p class="abstract">${article.abstract.substring(0, 150)}...</p>
                <a href="#" class="read-more" data-id="${article.id}">Читать далее</a>
            `;
            articlesList.appendChild(articleElement);
        });
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('articlesList').innerHTML = '<p>Произошла ошибка при поиске</p>';
    }
});