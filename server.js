import express from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, jidNormalizedUser, makeCacheableSignalKeyStore, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import whatsappRouter from './whatsappRoute.js';

const app = express();
const PORT = 3000;
const DATA_DIR = 'users_data';
const ADMIN_KEY = "miClaveSecreta123"; // CAMBIA ESTO POR UNA CLAVE SEGURA

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

app.use(express.json());
app.use(express.static('public'));

app.use('/admin/whatsapp', whatsappRouter);

app.post('/register', async (req, res) => {
    const { username, password, phoneNumber } = req.body;
    if (!username || !password || !phoneNumber) {
        return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }
    const userFolderPath = path.join(DATA_DIR, username);
    if (fs.existsSync(userFolderPath)) {
        return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
    }
    try {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        fs.mkdirSync(userFolderPath);
        const userData = {
            username,
            password: hashedPassword,
            phoneNumber,
            verificationCode,
            isVerified: false
        };
        fs.writeFileSync(path.join(userFolderPath, 'data.json'), JSON.stringify(userData, null, 2));

        const { state, saveCreds } = await useMultiFileAuthState('sesion-admin');
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({ version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })) }, browser: Browsers.windows('Chrome'), printQRInTerminal: false, logger: pino({ level: "fatal" }).child({ level: "fatal" }) });
        
        sock.ev.on('connection.update', (update) => {
            if (update.connection === 'open') {
                const jid = jidNormalizedUser(phoneNumber + '@s.whatsapp.net');
                const message = `Hola, tu código de verificación es: ${verificationCode}\n\nIngresa este código para completar tu registro.`;
                sock.sendMessage(jid, { text: message });
            }
        });
        sock.ev.on('creds.update', saveCreds);
        res.status(200).json({ message: 'Usuario registrado. Se ha enviado un código de verificación.' });
    } catch (error) {
        console.error("Error al registrar y enviar mensaje:", error);
        res.status(500).json({ message: 'Error en el servidor. Intenta de nuevo.' });
    }
});

app.post('/verify', (req, res) => {
    const { username, code } = req.body;
    const userFilePath = path.join(DATA_DIR, username, 'data.json');
    if (!fs.existsSync(userFilePath)) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    try {
        const fileData = fs.readFileSync(userFilePath, 'utf8');
        const userData = JSON.parse(fileData);
        if (userData.verificationCode === code) {
            userData.isVerified = true;
            delete userData.verificationCode;
            fs.writeFileSync(userFilePath, JSON.stringify(userData, null, 2));
            res.status(200).json({ message: '¡Verificación exitosa! Ahora puedes iniciar sesión.' });
        } else {
            res.status(400).json({ message: 'Código incorrecto. Intenta de nuevo.' });
        }
    } catch (error) {
        console.error("Error al verificar el código:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password, adminKey } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'El nombre de usuario y la contraseña son requeridos.' });
    }
    const userFilePath = path.join(DATA_DIR, username, 'data.json');
    if (!fs.existsSync(userFilePath)) {
        return res.status(401).json({ message: 'Credenciales incorrectas. Intenta de nuevo.' });
    }
    try {
        const fileData = fs.readFileSync(userFilePath, 'utf8');
        const userData = JSON.parse(fileData);
        const hashedPassword = userData.password;
        const match = await bcrypt.compare(password, hashedPassword);
        const isAdmin = (username === 'admin' && adminKey === ADMIN_KEY);
        if (match) {
            res.status(200).json({ message: '¡Login exitoso!', isAdmin, username });
        } else {
            res.status(401).json({ message: 'Credenciales incorrectas. Intenta de nuevo.' });
        }
    } catch (error) {
        console.error("Error al intentar iniciar sesión:", error);
        res.status(500).json({ message: 'Error interno del servidor. Intenta de nuevo.' });
    }
});

app.post('/admin/send-info', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ message: 'El nombre de usuario es requerido.' });
    }
    const userFilePath = path.join(DATA_DIR, username, 'data.json');
    if (!fs.existsSync(userFilePath)) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    try {
        const fileData = fs.readFileSync(userFilePath, 'utf8');
        const userData = JSON.parse(fileData);
        const phoneNumber = userData.phoneNumber;
        if (!phoneNumber) {
            return res.status(400).json({ message: 'El usuario no tiene un número de teléfono registrado.' });
        }
        const messageText = `Hola ${userData.username}, tu información registrada es:\n\n👤 Nombre de usuario: ${userData.username}\n📞 Número de teléfono: ${phoneNumber}`;
        const { state, saveCreds } = await useMultiFileAuthState('sesion-admin');
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({ version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })) }, browser: Browsers.windows('Chrome'), printQRInTerminal: false, logger: pino({ level: "fatal" }).child({ level: "fatal" }) });
        sock.ev.on('connection.update', (update) => {
            if (update.connection === 'open') {
                const jid = jidNormalizedUser(phoneNumber + '@s.whatsapp.net');
                sock.sendMessage(jid, { text: messageText });
            }
        });
        sock.ev.on('creds.update', saveCreds);
        res.status(200).json({ message: `Mensaje enviado a ${username} exitosamente.` });
    } catch (error) {
        console.error("Error al enviar la información del usuario:", error);
        res.status(500).json({ message: 'Error interno del servidor. Intenta de nuevo.' });
    }
});

app.post('/check-and-save', async (req, res) => {
    const { username, ip, location, time } = req.body;
    if (!username || !ip || !location || !time) {
        return res.status(400).send('Faltan datos en la petición.');
    }
    const userFolderPath = path.join(DATA_DIR, username);
    const userFilePath = path.join(userFolderPath, 'data.json');
    if (!fs.existsSync(userFolderPath)) {
        fs.mkdirSync(userFolderPath);
    }
    if (fs.existsSync(userFilePath)) {
        fs.readFile(userFilePath, 'utf8', (err, fileData) => {
            if (err) return res.status(500).send('Error interno del servidor.');
            try {
                const userData = JSON.parse(fileData);
                const previousIp = userData.ip;
                if (previousIp && previousIp !== ip) {
                    return res.status(200).send('Favor de regresar a tu localización anterior.');
                }
                const newData = { ...userData, ip, location, time };
                fs.writeFile(userFilePath, JSON.stringify(newData, null, 2), (writeErr) => {
                    if (writeErr) return res.status(500).send('Error interno del servidor.');
                    res.status(200).send('Bienvenido de nuevo, tu información ha sido actualizada.');
                });
            } catch (parseErr) {
                res.status(500).send('Error al procesar los datos del usuario.');
            }
        });
    } else {
        const newData = { ip, location, time };
        fs.writeFile(userFilePath, JSON.stringify(newData, null, 2), (writeErr) => {
            if (writeErr) return res.status(500).send('Error interno del servidor.');
            res.status(200).send('¡Bienvenido! Es tu primera visita, tu información ha sido guardada.');
        });
    }
});

async function startWhatsAppListener() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('sesion-admin');
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({ version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })) }, browser: Browsers.windows('Chrome'), printQRInTerminal: false, logger: pino({ level: "fatal" }).child({ level: "fatal" }) });
        sock.ev.on('connection.update', (update) => {
            if (update.connection === 'open') {
                console.log('✅ Escuchando mensajes de WhatsApp...');
            } else if (update.connection === 'close') {
                console.log('❌ Conexión de WhatsApp cerrada. Reintentando...');
                startWhatsAppListener();
            }
        });
        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('messages.upsert', async (chatUpdate) => {
            if (!chatUpdate.messages) return;
            const m = chatUpdate.messages[0];
            const senderJid = m.key.remoteJid;
            if (!senderJid.endsWith('@s.whatsapp.net')) return;
            const senderNumber = senderJid.replace('@s.whatsapp.net', '');
            const userFilePath = path.join(DATA_DIR, senderNumber, 'data.json');
            const messageText = m.message?.conversation?.toLowerCase() || '';

            if (!fs.existsSync(userFilePath)) {
                await sock.sendMessage(senderJid, { text: 'Tu número no está registrado. Por favor, regístrate en la página web.' });
                return;
            }
            const fileData = fs.readFileSync(userFilePath, 'utf8');
            const userData = JSON.parse(fileData);

            if (messageText === 'mi informacion' || messageText === 'mi info') {
                if (!userData.isVerified) {
                    await sock.sendMessage(senderJid, { text: 'Tu cuenta no está verificada. Por favor, verifica tu número en la página de registro.' });
                    return;
                }
                const infoMessage = `Hola ${userData.username}, tu información registrada es:\n\n👤 Nombre de usuario: ${userData.username}\n📞 Número de teléfono: ${userData.phoneNumber}\n\n*Por motivos de seguridad, la contraseña no se puede enviar.*`;
                await sock.sendMessage(senderJid, { text: infoMessage });
            } else {
                await sock.sendMessage(senderJid, { text: 'Hola, soy un bot de servicio. Para pedir tu información escribe "mi info".' });
            }
        });
    } catch (error) {
        console.error("Error en el listener de WhatsApp:", error);
    }
}

startWhatsAppListener();

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
