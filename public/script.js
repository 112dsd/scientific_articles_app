// Auth functions
function saveUserData(token, userData) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(userData));
}

function checkAuth() {
  const authToken = localStorage.getItem('authToken');
  const protectedPages = ['add_article.html', 'profile.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage)) {
    if (!authToken) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
  return !!authToken;
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Register form
document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
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

// Login form
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
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

// Load articles
async function loadArticles(searchQuery = '', page = 1) {
  try {
    const url = `/api/articles?q=${encodeURIComponent(searchQuery)}&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const articlesList = document.getElementById('articlesList');
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
    document.getElementById('pageInfo').textContent = `Страница ${data.page} из ${data.pages}`;
    document.getElementById('prevBtn').disabled = data.page <= 1;
    document.getElementById('nextBtn').disabled = data.page >= data.pages;
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('articlesList').innerHTML = '<p>Произошла ошибка при загрузке статей</p>';
  }
}

// Load profile
async function loadProfile() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user) {
      document.getElementById('profileName').textContent = user.fullname;
      document.getElementById('profileEmail').textContent = user.email;
      document.getElementById('profileInstitution').textContent = user.institution || 'Не указано';
    }
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error);
    alert('Не удалось загрузить профиль');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Update navigation
  const authToken = localStorage.getItem('authToken');
  document.querySelectorAll('.login-link').forEach(el => {
    el.style.display = authToken ? 'none' : 'block';
  });
  document.querySelectorAll('.logout-link').forEach(el => {
    el.style.display = authToken ? 'block' : 'none';
  });

  // Load content based on page
  if (window.location.pathname.includes('articles.html')) {
    loadArticles();
    
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
  
  if (window.location.pathname.includes('profile.html')) {
    loadProfile();
  }
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
});

// Article form
document.getElementById('articleForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (!checkAuth()) {
    alert('Для публикации статьи необходимо войти в систему');
    window.location.href = 'login.html';
    return;
  }
  
  try {
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
  }
});