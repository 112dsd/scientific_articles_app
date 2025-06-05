let isSubmitting = false;

async function publishArticle(articleData) {
  if (isSubmitting) return;
  isSubmitting = true;
  
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Требуется авторизация');
    }

    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(articleData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка публикации статьи');
    }

    return await response.json();
  } finally {
    isSubmitting = false;
  }
}

// Обработчик формы
document.getElementById('articleForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Публикация...';

  try {
    const articleData = {
      title: document.getElementById('title').value,
      author: document.getElementById('author').value,
      abstract: document.getElementById('abstract').value,
      keywords: document.getElementById('keywords').value,
      content: document.getElementById('content').value,
      bibliography: document.getElementById('bibliography').value
    };

    const result = await publishArticle(articleData);
    alert('Статья успешно опубликована!');
    window.location.href = `article.html?id=${result.id}`;
  } catch (error) {
    console.error('Ошибка:', error);
    alert(error.message || 'Ошибка соединения с сервером');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Опубликовать статью';
  }
});

// Проверка авторизации при загрузке
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('authToken') && 
      window.location.pathname.includes('add_article.html')) {
    alert('Для публикации статьи необходимо войти в систему');
    window.location.href = 'login.html';
  }
});