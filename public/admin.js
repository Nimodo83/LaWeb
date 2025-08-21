document.getElementById('whatsappForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phoneNumber = document.getElementById('phoneNumber').value;
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<p>Conectando... por favor espera.</p>';
    try {
        const response = await fetch(`/admin/whatsapp?number=${phoneNumber}`);
        const data = await response.json();
        if (response.ok) {
            if (data.code) {
                resultDiv.innerHTML = `<p style="color: green; font-weight: bold;">Código de Emparejamiento: ${data.code}</p><p>Usa este código en tu teléfono para vincular el número.</p>`;
            } else {
                resultDiv.innerHTML = '<p style="color: red;">Error: No se pudo obtener el código.</p>';
            }
        } else {
            resultDiv.innerHTML = `<p style="color: red;">Error del servidor: ${data.code || 'Algo salió mal.'}</p>`;
        }
    } catch (error) {
        resultDiv.innerHTML = '<p style="color: red;">Error de conexión. Asegúrate de que el servidor esté activo.</p>';
    }
});
document.getElementById('sendInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('targetUsername').value;
    const resultDiv = document.getElementById('sendInfoResult');
    resultDiv.innerHTML = '<p>Enviando mensaje...</p>';
    try {
        const response = await fetch('/admin/send-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await response.json();
        if (response.ok) {
            resultDiv.innerHTML = `<p style="color: green;">${data.message}</p>`;
        } else {
            resultDiv.innerHTML = `<p style="color: red;">Error: ${data.message}</p>`;
        }
    } catch (error) {
        resultDiv.innerHTML = '<p style="color: red;">Error de conexión. Asegúrate de que el servidor esté activo.</p>';
    }
});
