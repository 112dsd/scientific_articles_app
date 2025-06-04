// Общие функции
function checkAuth() {
  const authToken = localStorage.getItem('authToken') || document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  const protectedPages = ['add_article.html', 'profile.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage) && !authToken) {
    window.location.href = 'login.html';
  }
}

// Регистрация
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
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('authToken', data.token);
      window.location.href = 'index.html';
    } else {
      alert(data.error || 'Ошибка регистрации');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Произошла ошибка при регистрации');
  }
});

// Остальные функции (login, loadArticles и т.д.) аналогично обновляем, заменяя пути на /api/...

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  
  const authToken = localStorage.getItem('authToken') || document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  if (authToken) {
    document.querySelectorAll('.login-link').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.logout-link').forEach(el => el.style.display = 'block');
  } else {
    document.querySelectorAll('.login-link').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.logout-link').forEach(el => el.style.display = 'none');
  }
  
  if (window.location.pathname.includes('articles.html')) {
    loadArticles();
  }
  
  document.getElementById('logoutBtn')?.addEventListener('click', function() {
    localStorage.removeItem('authToken');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = 'index.html';
  });
});