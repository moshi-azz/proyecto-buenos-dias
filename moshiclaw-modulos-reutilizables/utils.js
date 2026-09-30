const fs = require('fs');
const path = require('path');

/**
 * Detecta la ruta del ejecutable de Chromium/Chrome disponible en el sistema.
 * ADAPTADO respecto al original de moshiClaw-panel: el original solo tenía
 * fallbacks para Linux/Ubuntu. Acá se agregan también los paths típicos de Windows,
 * ya que "buenos dias" corre en tu PC Windows, no en el servidor Ubuntu de MoshiClaw.
 * @returns {string|undefined}
 */
function getChromiumPath() {
  // Intentar primero con el paquete 'chromium' de npm (descarga un binario propio,
  // funciona igual en Windows/Linux/Mac) — recomendado si no querés depender de que
  // ya tengas Chrome instalado.
  try {
    const { path: cPath } = require('chromium');
    if (cPath) return cPath;
  } catch {}

  const candidates = [
    // Linux / Ubuntu (por si en algún momento esto corre en el mismo server que MoshiClaw)
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
    // Windows — rutas típicas de instalación de Chrome/Edge
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  return undefined;
}

/**
 * Espera una cantidad de milisegundos.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  getChromiumPath,
  sleep
};
