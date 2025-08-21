import express from 'express';
import fs from 'fs';
import pn from 'awesome-phonenumber';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import path from 'path';

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
    let dirs = path.join(process.cwd(), 'sesion-admin'); // Usar path.join para compatibilidad con Vercel

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
                    const sessionKnight = fs.readFileSync(path.join(dirs, 'creds.json'));
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

export default router;
