// Добавляем в начало файла
function updateHeaderAuth() {
  const token = localStorage.getItem('token');
  const authLinks = document.querySelectorAll('.auth-links');
  
  authLinks.forEach(container => {
    if (token) {
      container.innerHTML = '<a href="profile.html">Личный кабинет</a>';
    } else {
      container.innerHTML = `
        <a href="login.html">Вход</a>
        <a href="register.html">Регистрация</a>
      `;
    }
  });
}

// Вызываем при загрузке каждой страницы
document.addEventListener('DOMContentLoaded', updateHeaderAuth);

// Обновляем функцию загрузки статей
function loadArticles(page = 1, search = '', sort = 'newest') {
  const articlesList = document.getElementById('articlesList');
  if (!articlesList) return;
  
  articlesList.innerHTML = '<div class="loading">Загрузка статей...</div>';
  
  fetch(`${API_BASE}/api/articles?page=${page}&q=${search}&sort=${sort}`)
    .then(response => response.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      
      if (data.articles.length === 0) {
        articlesList.innerHTML = '<div class="no-articles">Статьи не найдены</div>';
        return;
      }
      
      articlesList.innerHTML = data.articles.map(article => `
        <article class="article-card">
          <h3><a href="article.html?id=${article.id}">${article.title}</a></h3>
          <div class="article-meta">
            <span>Автор: ${article.author}</span>
            <span>${new Date(article.created_at).toLocaleDateString()}</span>
          </div>
          <p class="article-abstract">${article.abstract}</p>
          <a href="article.html?id=${article.id}" class="read-more">Читать полностью</a>
        </article>
      `).join('');
    })
    .catch(error => {
      console.error('Ошибка загрузки статей:', error);
      articlesList.innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
    });
}
const API_BASE = window.location.origin;
let currentUser = null;

// Auth functions
async function registerUser(userData) {
  const response = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return await response.json();
}

async function loginUser(credentials) {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return await response.json();
}

// Form handlers
document.addEventListener('DOMContentLoaded', () => {
  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = {
        fullname: document.getElementById('fullname').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        institution: document.getElementById('institution').value
      };
      
      try {
        await registerUser(formData);
        window.location.href = 'login.html';
      } catch (err) {
        alert(`Registration failed: ${err.message}`);
      }
    });
  }

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const credentials = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      };
      
      try {
        const { token } = await loginUser(credentials);
        localStorage.setItem('token', token);
        window.location.href = 'articles.html';
      } catch (err) {
        alert('Login failed');
      }
    });
  }

  // Load articles
  const articlesList = document.getElementById('articlesList');
  if (articlesList) {
    fetch(`${API_BASE}/api/articles`)
      .then(res => res.json())
      .then(articles => {
        articlesList.innerHTML = articles.map(article => `
          <article class="article-card">
            <h3>${article.title}</h3>
            <p class="author">By ${article.author}</p>
            <p class="abstract">${article.abstract}</p>
          </article>
        `).join('');
      });
  }

  // Add article form
  const articleForm = document.getElementById('articleForm');
  if (articleForm) {
    articleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      
      const articleData = {
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        abstract: document.getElementById('abstract').value,
        keywords: document.getElementById('keywords').value,
        content: document.getElementById('content').value,
        bibliography: document.getElementById('bibliography').value
      };
      
      try {
        await fetch(`${API_BASE}/api/articles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(articleData)
        });
        window.location.href = 'articles.html';
      } catch (err) {
        alert('Failed to add article');
      }
    });
  }
});

// Добавляем в конец файла
function loadFullArticle(articleId) {
  fetch(`${API_BASE}/api/articles/${articleId}`)
    .then(response => response.json())
    .then(article => {
      document.getElementById('articleTitle').textContent = article.title;
      document.getElementById('articleAuthor').textContent = `Автор: ${article.author}`;
      document.getElementById('articleAbstract').textContent = article.abstract;
      document.getElementById('articleContent').innerHTML = article.content.replace(/\n/g, '<br>');
      document.getElementById('articleKeywords').textContent = `Ключевые слова: ${article.keywords}`;
      document.getElementById('articleBibliography').innerHTML = article.bibliography ? `Список литературы:<br>${article.bibliography.replace(/\n/g, '<br>')}` : '';
    })
    .catch(error => console.error('Ошибка загрузки статьи:', error));
}

// Обработка просмотра статьи
if (document.getElementById('articleContent')) {
  const articleId = new URLSearchParams(window.location.search).get('id');
  if (articleId) {
    loadFullArticle(articleId);
  }
}

// Обновляем функцию загрузки списка статей
if (articlesList) {
  fetch(`${API_BASE}/api/articles`)
    .then(res => res.json())
    .then(articles => {
      articlesList.innerHTML = articles.map(article => `
        <div class="article-card">
          <h3><a href="article.html?id=${article.id}">${article.title}</a></h3>
          <p class="author">Автор: ${article.author}</p>
          <p class="abstract">${article.abstract.substring(0, 150)}...</p>
          <a href="article.html?id=${article.id}" class="read-more">Читать полностью</a>
        </div>
      `).join('');
    });
}