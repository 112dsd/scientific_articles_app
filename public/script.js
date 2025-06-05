// Auth functions
function saveUserData(token, userData) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(userData));
}

function checkAuth() {
  const authToken = localStorage.getItem('authToken');
  const protectedPages = ['add_article.html', 'profile.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
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

// Article functions
let isSubmitting = false;

async function loadArticles() {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) throw new Error('Ошибка загрузки статей');
    
    const articles = await response.json();
    const articlesList = document.getElementById('articlesList');
    
    if (!articlesList) return;
    
    articlesList.innerHTML = '';
    
    if (articles.length === 0) {
      articlesList.innerHTML = '<p class="no-articles">Статьи не найдены</p>';
      return;
    }
    
    articles.forEach(article => {
      const articleElement = document.createElement('div');
      articleElement.className = 'article-card card';
      articleElement.innerHTML = `
        <h3>${article.title}</h3>
        <p class="article-meta">
          ${new Date(article.created_at).toLocaleDateString()} • 
          ${article.author_name || article.author}
        </p>
        <p class="article-abstract">${article.abstract.substring(0, 150)}...</p>
        <a href="article.html?id=${article.id}" class="btn btn-primary">Читать далее</a>
      `;
      articlesList.appendChild(articleElement);
    });
  } catch (error) {
    console.error('Ошибка загрузки статей:', error);
    const articlesList = document.getElementById('articlesList');
    if (articlesList) {
      articlesList.innerHTML = '<p class="error-message">Ошибка загрузки статей. Пожалуйста, попробуйте позже.</p>';
    }
  }
}

async function publishArticle(articleData) {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('Требуется авторизация');

  const response = await fetch('/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(articleData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка публикации статьи');
  }

  return await response.json();
}

// Article form handler
document.getElementById('articleForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (isSubmitting) return;
  isSubmitting = true;
  
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  
  try {
    submitButton.disabled = true;
    submitButton.textContent = 'Публикация...';
    
    const articleData = {
      title: form.title.value,
      author: form.author.value,
      abstract: form.abstract.value,
      keywords: form.keywords.value,
      content: form.content.value,
      bibliography: form.bibliography.value
    };

    const newArticle = await publishArticle(articleData);
    alert(`Статья "${newArticle.title}" успешно опубликована!`);
    window.location.href = 'articles.html';
    
  } catch (error) {
    console.error('Ошибка публикации:', error);
    alert(error.message || 'Ошибка при публикации статьи');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    isSubmitting = false;
  }
});

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

  // Load articles if on articles page
  if (window.location.pathname.includes('articles.html')) {
    loadArticles();
  }
  
  // Load profile if on profile page
  if (window.location.pathname.includes('profile.html')) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      document.getElementById('profileName').textContent = user.fullname;
      document.getElementById('profileEmail').textContent = user.email;
      document.getElementById('profileInstitution').textContent = user.institution || 'Не указано';
    }
  }
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
});