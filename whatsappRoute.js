import express from 'express';
import fs from 'fs';
import pn from 'awesome-phonenumber';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';

const router = express.Router();

function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    let dirs = './sesion-admin';

    await removeFile(dirs);
    num = num.replace(/[^0-9]/g, '');
    const phone = pn('+' + num);
    if (!phone.isValid()) {
        if (!res.headersSent) {
            return res.status(400).send({ code: 'Invalid phone number.' });
        }
        return;
    }
    num = phone.getNumber('e164').replace('+', '');

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);
        try {
            const { version } = await fetchLatestBaileysVersion();
            let KnightBot = makeWASocket({ version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })) }, printQRInTerminal: false, logger: pino({ level: "fatal" }).child({ level: "fatal" }), browser: Browsers.windows('Chrome'), markOnlineOnConnect: false, generateHighQualityLinkPreview: false, defaultQueryTimeoutMs: 60000, connectTimeoutMs: 60000, keepAliveIntervalMs: 30000, retryRequestDelayMs: 250, maxRetries: 5 });

            KnightBot.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, isNewLogin } = update;
                if (connection === 'open') {
                    console.log("✅ Connected successfully!");
                    const sessionKnight = fs.readFileSync(dirs + '/creds.json');
                    const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                    await KnightBot.sendMessage(userJid, { document: sessionKnight, mimetype: 'application/json', fileName: 'creds.json' });
                    await KnightBot.sendMessage(userJid, { image: { url: 'https://img.youtube.com/vi/-oz_u1iMgf8/maxresdefault.jpg' }, caption: `🎬 *KnightBot MD V2.0 Full Setup Guide!*` });
                    await KnightBot.sendMessage(userJid, { text: `⚠️Do not share this file with anybody⚠️` });
                    await delay(1000);
                    removeFile(dirs);
                }
                if (isNewLogin) {
                    console.log("🔐 New login via pair code");
                }
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (statusCode === 401) {
                        console.log("❌ Logged out from WhatsApp.");
                    } else {
                        console.log("🔁 Connection closed — restarting...");
                        initiateSession();
                    }
                }
            });
            if (!KnightBot.authState.creds.registered) {
                await delay(3000);
                num = num.replace(/[^\d+]/g, '');
                if (num.startsWith('+')) num = num.substring(1);
                try {
                    let code = await KnightBot.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    if (!res.headersSent) {
                        await res.send({ code });
                    }
                } catch (error) {
                    console.error('Error requesting pairing code:', error);
                    if (!res.headersSent) {
                        res.status(503).send({ code: 'Failed to get pairing code.' });
                    }
                }
            }
            KnightBot.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
        }
    }
    await initiateSession();
});

router.post('/send-info', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ message: 'El nombre de usuario es requerido.' });
    }
    const userFilePath = path.join('../' + DATA_DIR, username, 'data.json');
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

export default router;
