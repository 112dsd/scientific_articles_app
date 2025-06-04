// Общие функции
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

// Загрузка профиля пользователя
async function loadProfile() {
  if (!checkAuth()) return;
  
  try {
    const response = await fetch('/api/profile', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Ошибка загрузки профиля');
    }
    
    const profile = await response.json();
    
    document.getElementById('profileName').textContent = profile.fullname;
    document.getElementById('profileEmail').textContent = profile.email;
    document.getElementById('profileInstitution').textContent = profile.institution || 'Не указано';
  } catch (error) {
    console.error('Error:', error);
    alert('Не удалось загрузить профиль');
  }
}

// Загрузка статей
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
        <a href="article.html?id=${article.id}" class="btn">Читать далее</a>
      `;
      articlesList.appendChild(articleElement);
    });

    // Обновление пагинации
    document.getElementById('pageInfo').textContent = `Страница ${data.page} из ${data.pages}`;
    document.getElementById('prevBtn').disabled = data.page <= 1;
    document.getElementById('nextBtn').disabled = data.page >= data.pages;
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('articlesList').innerHTML = '<p>Произошла ошибка при загрузке статей</p>';
  }
}

// Обработка формы входа
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const formData = {
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('authToken', data.token);
      window.location.href = 'index.html';
    } else {
      alert(data.error || 'Ошибка входа');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Произошла ошибка при входе');
  }
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
  
  // Загрузка статей
  if (window.location.pathname.includes('articles.html')) {
    loadArticles();
    
    // Обработка поиска
    document.getElementById('searchBtn')?.addEventListener('click', function() {
      const query = document.getElementById('searchInput').value;
      loadArticles(query);
    });
    
    // Пагинация
    document.getElementById('prevBtn')?.addEventListener('click', function() {
      const currentPage = parseInt(document.getElementById('pageInfo').textContent.match(/\d+/)[0]);
      loadArticles('', currentPage - 1);
    });
    
    document.getElementById('nextBtn')?.addEventListener('click', function() {
      const currentPage = parseInt(document.getElementById('pageInfo').textContent.match(/\d+/)[0]);
      loadArticles('', currentPage + 1);
    });
  }
  
  // Загрузка профиля
  if (window.location.pathname.includes('profile.html')) {
    loadProfile();
  }
  
  // Выход
  document.getElementById('logoutBtn')?.addEventListener('click', function() {
    localStorage.removeItem('authToken');
    window.location.href = 'index.html';
  });
});