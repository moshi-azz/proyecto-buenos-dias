// lib/whatsappSend.js — Envío del reporte por WhatsApp, reusando el
// whatsapp.js de moshiClaw-panel (moshiclaw-modulos-reutilizables/).
//
// Primera corrida (una sola vez, manual): no hay sesión guardada todavía,
// así que se pide un CÓDIGO DE VINCULACIÓN (no un QR) para el número de
// WHATSAPP_TO_NUMBER — se muestra en la consola. En tu celu: WhatsApp →
// Configuración → Dispositivos vinculados → Vincular con número de
// teléfono, e ingresás ese código. Después queda guardada la sesión en
// data/wwebjs_session/ y las corridas automáticas ya no piden nada.
//
// El mensaje se manda al mismo número (a vos mismo) — WhatsApp soporta
// mandarte mensajes a tu propio número ("Mensaje a mí mismo").

const wa = require('../moshiclaw-modulos-reutilizables/whatsapp');

function esperarEstado(estadosOk, timeoutMs) {
  return new Promise((resolve, reject) => {
    const actual = () => wa.getStatus().status;
    if (estadosOk.includes(actual())) return resolve(actual());

    const onStatus = (s) => {
      if (estadosOk.includes(s)) {
        limpiar();
        resolve(s);
      } else if (s === 'error') {
        limpiar();
        reject(new Error(wa.getStatus().error || 'Error desconocido de WhatsApp'));
      }
    };
    const timer = setTimeout(() => {
      limpiar();
      reject(new Error('Timeout esperando que WhatsApp quede listo'));
    }, timeoutMs);
    function limpiar() {
      clearTimeout(timer);
      wa.emitter.off('status', onStatus);
    }
    wa.emitter.on('status', onStatus);
  });
}

/**
 * @param {string} texto
 */
async function enviarReportePorWhatsapp(texto) {
  const to = process.env.WHATSAPP_TO_NUMBER;
  if (!to) throw new Error('WHATSAPP_TO_NUMBER no configurado en .env');

  const onPairingCode = (code) => {
    console.log(`\n📲 Código de vinculación de WhatsApp: ${code}`);
    console.log(
      'En tu celu: WhatsApp → Configuración → Dispositivos vinculados → ' +
        'Vincular con número de teléfono, e ingresá este código.\n'
    );
  };
  wa.emitter.on('pairing_code', onPairingCode);

  const fs = require('fs');
  const path = require('path');
  const sessionDir = path.join(__dirname, '..', 'data', 'wwebjs_session', 'session');
  const staleFiles = [
    path.join(sessionDir, 'DevToolsActivePort'),
    path.join(sessionDir, 'lockfile'),
    path.join(sessionDir, 'LOCK'),
    path.join(sessionDir, 'Default', 'LOCK'),
  ];
  for (const f of staleFiles) {
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
    }
  }

  try {
    await wa.start(null, to);
    await esperarEstado(['ready'], 90000);
    await wa.sendMessage(to, texto);
  } finally {
    wa.emitter.off('pairing_code', onPairingCode);
    await wa.stop();
  }
}

module.exports = { enviarReportePorWhatsapp };
