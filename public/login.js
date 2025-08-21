document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const adminKey = document.getElementById('adminKey').value;
    const messageElement = document.getElementById('message');
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, adminKey })
        });
        const data = await response.json();
        messageElement.textContent = data.message;
        messageElement.style.color = response.ok ? 'green' : 'red';
        if (response.ok) {
            localStorage.setItem('username', data.username);
            localStorage.setItem('isAdmin', data.isAdmin);
            document.getElementById('loginForm').reset();
            setTimeout(() => { window.location.href = `index.html`; }, 1000);
        }
    } catch (error) {
        messageElement.textContent = "Error de conexión con el servidor.";
    }
});
