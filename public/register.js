const registrationForm = document.getElementById('registrationForm');
const verificationForm = document.getElementById('verificationForm');
const registerBtn = document.getElementById('registerBtn');
const verifyBtn = document.getElementById('verifyBtn');

registerBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const messageElement = document.getElementById('message');
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, phoneNumber })
        });
        const data = await response.json();
        messageElement.textContent = data.message;
        messageElement.style.color = response.ok ? 'green' : 'red';
        if (response.ok) {
            registrationForm.style.display = 'none';
            verificationForm.style.display = 'block';
        }
    } catch (error) {
        messageElement.textContent = "Error de conexión con el servidor.";
    }
});

verifyBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const code = document.getElementById('verificationCode').value;
    const messageElement = document.getElementById('message');
    try {
        const response = await fetch('/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, code })
        });
        const data = await response.json();
        messageElement.textContent = data.message;
        messageElement.style.color = response.ok ? 'green' : 'red';
        if (response.ok) {
            setTimeout(() => window.location.href = 'login.html', 2000);
        }
    } catch (error) {
        messageElement.textContent = "Error de conexión con el servidor.";
    }
});
