// Настройка базового URL для API (будет работать на Render)
const API_URL = window.location.origin; // Автоматически подставит текущий домен

// Обработчик регистрации (исправленная версия)
document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        fullname: document.getElementById('fullname').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        password: document.getElementById('password').value,
        institution: document.getElementById('institution').value.trim()
    };

    // Валидация
    if (!formData.fullname || !formData.email || !formData.password) {
        alert('Заполните все обязательные поля!');
        return;
    }

    if (formData.password !== document.getElementById('confirmPassword').value) {
        alert('Пароли не совпадают!');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка регистрации');
        }

        alert('Регистрация успешна!');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message || 'Произошла ошибка при регистрации');
    }
});