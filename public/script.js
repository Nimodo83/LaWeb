document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    const isAdmin = localStorage.getItem('isAdmin');
    const adminButton = document.getElementById('adminButton');
    const authButtons = document.getElementById('authButtons');
    const userInfoDiv = document.getElementById('userInfo');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const logoutButton = document.getElementById('logoutButton');

    if (username) {
        welcomeTitle.textContent = `Bienvenido, ${username}!`;
        authButtons.style.display = 'none';
        userInfoDiv.style.display = 'block';
        
        if (isAdmin === 'true') {
            adminButton.style.display = 'block';
            adminButton.addEventListener('click', () => {
                window.location.href = 'admin.html';
            });
        }
        
        getUserInfo(username);

    } else {
        welcomeTitle.textContent = 'Bienvenido a la Web';
        authButtons.style.display = 'block';
        userInfoDiv.style.display = 'none';
        adminButton.style.display = 'none';
    }

    logoutButton.addEventListener('click', () => {
        localStorage.clear();
        window.location.reload();
    });
});

async function getUserInfo(username) {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const ip = data.ip;
        const location = `${data.city}, ${data.region}, ${data.country_name}`;
        const timezone = data.timezone;
        const time = new Date().toLocaleString('es-ES', { timeZone: timezone });

        document.getElementById('ip-address').textContent = ip;
        document.getElementById('location').textContent = location;
        document.getElementById('current-time').textContent = time;

        await sendInfoToServer(username, ip, location, time);
    } catch (error) {
        document.getElementById('message').textContent = "Error al obtener tu información. Por favor, intenta de nuevo.";
    }
}

async function sendInfoToServer(username, ip, location, time) {
    try {
        const response = await fetch('/check-and-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, ip, location, time })
        });
        const serverResponse = await response.text();
        const messageElement = document.getElementById('message');
        messageElement.textContent = serverResponse;
        if (serverResponse.includes('Bienvenido')) {
            messageElement.style.color = 'green';
        } else {
            messageElement.style.color = 'red';
        }
    } catch (error) {
        document.getElementById('message').textContent = "Error de conexión con el servidor. Intenta más tarde.";
    }
}
