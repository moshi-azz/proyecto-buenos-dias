// whatsapp.js — Integración WhatsApp Web (auth por QR o código de teléfono)
// Tomado tal cual de moshiClaw-panel (modules/whatsapp.js).
// Cross-platform (no depende de X11/Linux): sirve igual en Windows.
// Requiere: npm install whatsapp-web.js qrcode
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const utils = require('./utils');

const emitter = new EventEmitter();

let client = null;
let qrDataUrl = null;
let pairingCode = null;   // código de vinculación por teléfono
let phoneMode = false;    // true cuando se usa login por teléfono
let phoneNumber = null;   // número para pedir el pairing code
let status = 'disconnected'; // disconnected | starting | qr_pending | phone_pending | authenticated | ready | error
let lastError = null;
let onMessageCallback = null;

// Ajustá esta ruta a donde quieras guardar la sesión de WhatsApp del proyecto "buenos dias"
const SESSION_DIR = path.join(__dirname, '..', 'data', 'wwebjs_session');

function getStatus() {
  return { status, qr: qrDataUrl, pairingCode, error: lastError };
}

/**
 * Iniciar WhatsApp.
 * @param {Function} onMessage - callback para mensajes entrantes
 * @param {string|null} phone - si se pasa, usa el método de código de teléfono en vez de QR
 */
async function start(onMessage, phone, options = {}) {
  if (client && (status === 'ready' || status === 'authenticated')) {
    return { ok: true, msg: 'Ya conectado' };
  }
  if (status === 'starting' || status === 'qr_pending' || status === 'phone_pending') {
    return { ok: true, msg: 'Ya iniciando' };
  }

  onMessageCallback = onMessage;
  phoneNumber = phone ? String(phone).replace(/\D/g, '') : null;
  phoneMode = !!phoneNumber;

  status = 'starting';
  qrDataUrl = null;
  pairingCode = null;
  lastError = null;
  emitter.emit('status', status);

  let executablePath = utils.getChromiumPath();

  // Destruir cliente anterior si existe
  if (client) {
    try { await client.destroy(); } catch {}
    client = null;
  }

  // Limpiar residuos de sesiones anteriores que bloquean Chromium
  const sessionDir = path.join(SESSION_DIR, 'session');
  for (const f of [
    path.join(sessionDir, 'DevToolsActivePort'),
    path.join(sessionDir, 'lockfile'),
    path.join(sessionDir, 'LOCK'),
    path.join(sessionDir, 'Default', 'LOCK'),
  ]) {
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
    }
  }

  const headless = options.headless !== undefined ? options.headless : true;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    puppeteer: {
      executablePath,
      headless: headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        ...(headless ? ['--disable-gpu'] : []),
        '--no-first-run',
      ]
    }
  });

  client.on('qr', async (qr) => {
    status = 'qr_pending';
    try {
      qrDataUrl = await QRCode.toDataURL(qr, { width: 256 });
    } catch {
      qrDataUrl = qr;
    }
    emitter.emit('raw_qr', qr);
    emitter.emit('qr', qrDataUrl, qr);
    emitter.emit('status', status);
  });

  client.on('code', (code) => {
    pairingCode = code;
    status = 'phone_pending';
    emitter.emit('pairing_code', code);
    emitter.emit('status', status);
  });

  client.on('authenticated', () => {
    console.log('✅ WhatsApp autenticado');
    status = 'authenticated';
    qrDataUrl = null;
    pairingCode = null;
    emitter.emit('status', status);
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp listo para recibir mensajes');
    status = 'ready';
    qrDataUrl = null;
    pairingCode = null;
    phoneMode = false;
    emitter.emit('status', status);
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp auth fallida:', msg);
    status = 'error';
    lastError = msg;
    client = null;
    emitter.emit('status', status);
  });

  client.on('disconnected', (reason) => {
    console.log('🔌 WhatsApp desconectado:', reason);
    status = 'disconnected';
    client = null;
    emitter.emit('status', status);
  });

  client.on('message', async (msg) => {
    try {
      if (msg.fromMe) return;

      const contact = await msg.getContact().catch(() => null);
      const chat = await msg.getChat().catch(() => null);

      const incoming = {
        platform: 'whatsapp',
        id: msg.id?._serialized,
        from: msg.from,
        fromName: contact?.pushname || contact?.name || msg.from,
        body: msg.body,
        timestamp: msg.timestamp,
        isGroup: chat?.isGroup || false,
      };

      console.log(`📩 WA [${incoming.fromName}]: ${incoming.body?.substring(0, 80) || ''}`);
      emitter.emit('message', incoming);

      if (onMessageCallback) {
        try { await onMessageCallback(incoming); } catch (e) { console.error('Error en onMessage WA:', e.message); }
      }
    } catch (err) {
      // Ignorar fallas transitorias de parseo durante la sincronización inicial
    }
  });

  // Inicializar en background — NO bloqueamos el request HTTP
  client.initialize().catch(err => {
    console.error('❌ WhatsApp initialize error:', err.message);
    status = 'error';
    lastError = err.message;
    client = null;
    emitter.emit('status', status);
  });

  return {
    ok: true,
    msg: phoneMode
      ? `Iniciando WhatsApp en background, generando código para ${phoneNumber}...`
      : 'Iniciando WhatsApp en background, esperá el QR...'
  };
}

async function stop() {
  if (client) {
    try { await client.destroy(); } catch {}
    client = null;
  }
  status = 'disconnected';
  qrDataUrl = null;
  pairingCode = null;
  phoneMode = false;
  phoneNumber = null;
  emitter.emit('status', status);
}

async function sendMessage(to, text) {
  if (status !== 'ready') throw new Error(`WhatsApp no está listo (estado: ${status})`);
  const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`;
  try {
    await client.sendMessage(chatId, text, { waitUntilMsgSent: true });
  } catch (err) {
    // Si falla con lid o formato especial, reintentar directo
    await client.sendMessage(chatId, text);
  }
  // Esperar 4 segundos para asegurar que el socket vacíe los paquetes antes de un eventual wa.stop()
  await utils.sleep(4000);
  return { ok: true, to: chatId };
}

async function getChats() {
  if (status !== 'ready') return [];
  const chats = await client.getChats();
  return chats.slice(0, 20).map(c => ({
    id: c.id._serialized,
    name: c.name,
    unread: c.unreadCount,
    lastMessage: c.lastMessage?.body?.substring(0, 60)
  }));
}

module.exports = { start, stop, sendMessage, getChats, getStatus, emitter };
