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