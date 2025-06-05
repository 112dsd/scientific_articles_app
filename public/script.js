// Global variables
let isArticleSubmitting = false;
let currentPage = window.location.pathname.split('/').pop();

// Auth functions
function saveUserData(token, userData) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(userData));
}

function checkAuth() {
  const authToken = localStorage.getItem('authToken');
  const protectedPages = ['add_article.html', 'profile.html'];
  
  if (protectedPages.includes(currentPage) && !authToken) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Register form
function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
      alert('Пароли не совпадают!');
      return;
    }
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: document.getElementById('fullname').value,
          email: document.getElementById('email').value,
          password: password,
          institution: document.getElementById('institution').value
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        saveUserData(data.token, data.user);
        alert('Регистрация успешна!');
        window.location.href = 'index.html';
      } else {
        alert(data.error || 'Ошибка регистрации');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка соединения с сервером');
    }
  });
}

// Login form
function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('email').value,
          password: document.getElementById('password').value
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        saveUserData(data.token, data.user);
        alert('Вход выполнен успешно!');
        window.location.href = 'index.html';
      } else {
        alert(data.error || 'Ошибка входа');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка соединения с сервером');
    }
  });
}

// Article form
function setupArticleForm() {
  const form = document.getElementById('articleForm');
  if (!form) return;

  // Remove previous handler to avoid duplicates
  form.removeEventListener('submit', handleArticleSubmit);
  form.addEventListener('submit', handleArticleSubmit);
}

async function handleArticleSubmit(e) {
  e.preventDefault();
  
  if (isArticleSubmitting) return;
  isArticleSubmitting = true;
  
  if (!checkAuth()) {
    alert('Для публикации статьи необходимо войти в систему');
    window.location.href = 'login.html';
    isArticleSubmitting = false;
    return;
  }
  
  const submitButton = document.querySelector('#articleForm button[type="submit"]');
  try {
    submitButton.disabled = true;
    submitButton.textContent = 'Публикация...';
    
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        abstract: document.getElementById('abstract').value,
        keywords: document.getElementById('keywords').value,
        content: document.getElementById('content').value,
        bibliography: document.getElementById('bibliography').value
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Статья успешно опубликована!');
      window.location.href = 'articles.html';
    } else {
      alert(data.error || 'Ошибка публикации статьи');
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка соединения с сервером');
  } finally {
    isArticleSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Опубликовать статью';
    }
  }
}

// Load articles
async function loadArticles(searchQuery = '', page = 1) {
  try {
    const url = `/api/articles?q=${encodeURIComponent(searchQuery)}&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const articlesList = document.getElementById('articlesList');
    if (!articlesList) return;
    
    articlesList.innerHTML = '';
    
    if (data.articles.length === 0) {
      articlesList.innerHTML = '<p>Статьи не найдены</p>';
      return;
    }
    
    data.articles.forEach(article => {
      const articleElement = document.createElement('div');
      articleElement.className = 'article-card card';
      articleElement.innerHTML = `
        <h3>${article.title}</h3>
        <p class="article-meta">${new Date(article.created_at).toLocaleDateString()} • ${article.author}</p>
        <p>${article.abstract.substring(0, 150)}...</p>
        <p><strong>Комментарии:</strong> ${article.comments_count || 0}</p>
        <a href="article.html?id=${article.id}" class="btn btn-primary">Читать далее</a>
      `;
      articlesList.appendChild(articleElement);
    });

    // Update pagination
    if (document.getElementById('pageInfo')) {
      document.getElementById('pageInfo').textContent = `Страница ${data.page} из ${data.pages}`;
    }
    if (document.getElementById('prevBtn')) {
      document.getElementById('prevBtn').disabled = data.page <= 1;
    }
    if (document.getElementById('nextBtn')) {
      document.getElementById('nextBtn').disabled = data.page >= data.pages;
    }
  } catch (error) {
    console.error('Error:', error);
    const articlesList = document.getElementById('articlesList');
    if (articlesList) {
      articlesList.innerHTML = '<p>Произошла ошибка при загрузке статей</p>';
    }
  }
}

// Load profile
async function loadProfile() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user) {
      if (document.getElementById('profileName')) {
        document.getElementById('profileName').textContent = user.fullname;
      }
      if (document.getElementById('profileEmail')) {
        document.getElementById('profileEmail').textContent = user.email;
      }
      if (document.getElementById('profileInstitution')) {
        document.getElementById('profileInstitution').textContent = user.institution || 'Не указано';
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error);
    alert('Не удалось загрузить профиль');
  }
}

// Setup search and pagination
function setupArticlesPage() {
  // Search handler
  document.getElementById('searchBtn')?.addEventListener('click', function() {
    const query = document.getElementById('searchInput').value;
    loadArticles(query);
  });
  
  // Pagination
  document.getElementById('prevBtn')?.addEventListener('click', function() {
    const currentPage = parseInt(document.getElementById('pageInfo').textContent.match(/\d+/)[0]);
    loadArticles('', currentPage - 1);
  });
  
  document.getElementById('nextBtn')?.addEventListener('click', function() {
    const currentPage = parseInt(document.getElementById('pageInfo').textContent.match(/\d+/)[0]);
    loadArticles('', currentPage + 1);
  });
}

// Update navigation
function updateNavigation() {
  const authToken = localStorage.getItem('authToken');
  document.querySelectorAll('.login-link').forEach(el => {
    el.style.display = authToken ? 'none' : 'block';
  });
  document.querySelectorAll('.logout-link').forEach(el => {
    el.style.display = authToken ? 'block' : 'none';
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  updateNavigation();
  checkAuth();

  // Setup forms
  setupRegisterForm();
  setupLoginForm();
  setupArticleForm();

  // Load content based on page
  if (currentPage === 'articles.html') {
    loadArticles();
    setupArticlesPage();
  }
  
  if (currentPage === 'profile.html') {
    loadProfile();
  }
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
});