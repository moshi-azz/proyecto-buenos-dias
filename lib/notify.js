// lib/notify.js — Aviso nativo de Windows (toast) de que el reporte ya está.
// Liviano a propósito: es solo un "aviso", el contenido posta va por
// WhatsApp y/o el HTML. Si falla (por ejemplo la primera vez que Windows
// pide permiso para notificaciones), no debe frenar el resto del reporte.

const notifier = require('node-notifier');

/**
 * @param {string} titulo
 * @param {string} mensaje
 */
function avisar(titulo, mensaje) {
  try {
    notifier.notify({
      title: titulo,
      message: mensaje,
      sound: true,
      appID: 'BuenosDias',
    });
  } catch (err) {
    console.warn(`⚠️ No se pudo mostrar la notificación de Windows: ${err.message}`);
  }
}

module.exports = { avisar };
