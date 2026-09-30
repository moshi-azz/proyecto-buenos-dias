// lib/report.js — Arma el reporte matutino: clima + correo (con juicio de
// IA sobre qué es importante) + "dónde quedé" (señales locales) + acciones
// sugeridas. Después lo guarda en .md, genera una versión HTML y la abre,
// lo manda por WhatsApp y muestra un aviso de Windows — cada canal es
// best-effort: si uno falla, no frena a los demás ni el reporte en sí.

const fs = require('fs');
const path = require('path');
const { getWeatherReport } = require('./weather');
const { getRecentImportantEmails } = require('./gmail');
const { getActivitySnapshot } = require('./activity');
const { sintetizarReporte } = require('./synthesis');
const { guardarYAbrirHtml } = require('./htmlReport');
const { avisar } = require('./notify');

function formatFecha(d) {
  const texto = d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatEmailsFallback(emails) {
  if (emails.length === 0) return ['Sin mails nuevos.'];
  const lineas = [];
  for (const e of emails.slice(0, 10)) {
    const marca = e.importante ? '⭐' : e.noLeido ? '🔵' : '⚪';
    lineas.push(`${marca} **${e.de}** — ${e.asunto}`);
    lineas.push(`   ${e.resumen}`);
  }
  if (emails.length > 10) lineas.push(`...y ${emails.length - 10} más.`);
  return lineas;
}

async function generarReporte() {
  const hoy = new Date();
  const fechaISO = hoy.toISOString().slice(0, 10);
  const partes = [`# Buenos días — ${formatFecha(hoy)}`, ''];

  // --- Clima ---
  let clima = null;
  partes.push('## 🌤️ Clima');
  try {
    clima = await getWeatherReport();
    partes.push(
      `${clima.descripcion}, ${clima.tempActual}°C ahora (mín ${clima.tempMin}°C / máx ${clima.tempMax}°C). ` +
        `Humedad ${clima.humedad}%, viento ${clima.viento} km/h, ${clima.probLluvia}% prob. de lluvia.`
    );
  } catch (err) {
    partes.push(`⚠️ No se pudo obtener el clima: ${err.message}`);
  }
  partes.push('');

  // --- Correo (crudo, se filtra con IA más abajo si está disponible) ---
  let emails = [];
  let errorCorreo = null;
  try {
    emails = await getRecentImportantEmails({ hours: 24 });
  } catch (err) {
    errorCorreo = err.message;
  }

  // --- Actividad local (Claude Code / Antigravity) ---
  const actividad = await getActivitySnapshot();

  // --- Síntesis con IA (opcional: requiere GEMINI_API_KEY) ---
  let ia = null;
  let iaError = null;
  try {
    ia = await sintetizarReporte({ clima, emailsRaw: emails, actividad });
  } catch (err) {
    iaError = err.message;
  }

  // --- Sección de correo ---
  partes.push('## 📬 Correo (últimas 24hs)');
  if (errorCorreo) {
    partes.push(`⚠️ No se pudo leer el correo: ${errorCorreo}`);
  } else if (ia) {
    partes.push(ia.correoImportante);
  } else {
    if (iaError) partes.push(`_(Filtro con IA no disponible: ${iaError})_`);
    partes.push(...formatEmailsFallback(emails));
  }
  partes.push('');

  // --- Sección "dónde quedé" ---
  partes.push('## 🗂️ Dónde quedé');
  if (ia) {
    partes.push(ia.dondeQuede);
  } else {
    partes.push(
      iaError
        ? `_(No disponible: ${iaError}. Configurá GEMINI_API_KEY en .env para activar esto.)_`
        : '_(Configurá GEMINI_API_KEY en .env para activar esto.)_'
    );
  }
  partes.push('');

  // --- Acciones sugeridas ---
  partes.push('## ✅ Acciones sugeridas para hoy');
  if (ia && Array.isArray(ia.acciones) && ia.acciones.length > 0) {
    for (const accion of ia.acciones) {
      if (typeof accion === 'object' && accion !== null) {
        const link = accion.enlace ? ` ([${accion.etiquetaEnlace || 'Abrir'}](${accion.enlace}))` : '';
        const detalle = accion.detalle ? ` — ${accion.detalle}` : '';
        partes.push(`- **${accion.titulo}**${detalle}${link}`);
      } else {
        partes.push(`- ${accion}`);
      }
    }
  } else {
    partes.push('_(No disponible sin GEMINI_API_KEY configurada.)_');
  }
  partes.push('');

  const texto = partes.join('\n');

  // --- Guardar .md ---
  const dir = path.join(__dirname, '..', 'reportes');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, `reporte-${fechaISO}.md`);
  fs.writeFileSync(archivo, texto);

  // --- Dashboard HTML (se abre solo) ---
  try {
    await guardarYAbrirHtml({
      markdown: texto,
      fecha: fechaISO,
      fechaTexto: formatFecha(hoy),
      dir,
      clima,
      emails,
      ia,
      actividad,
      sheetsWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
    });
  } catch (err) {
    console.warn(`⚠️ No se pudo generar/abrir el HTML: ${err.message}`);
  }

  // --- WhatsApp (best-effort, formateo ejecutivo móvil) ---
  if (process.env.WHATSAPP_TO_NUMBER) {
    try {
      const { formatearReporteWhatsapp } = require('./whatsappFormatter');
      const { enviarReportePorWhatsapp } = require('./whatsappSend');
      const textoWhatsapp = formatearReporteWhatsapp({
        fecha: hoy,
        fechaTexto: formatFecha(hoy),
        clima,
        ia,
        actividad,
      });
      await enviarReportePorWhatsapp(textoWhatsapp);
      console.log('✅ Reporte enviado por WhatsApp.');
    } catch (err) {
      console.warn(`⚠️ No se pudo enviar por WhatsApp: ${err.message}`);
    }
  }

  // --- Notificación de Windows (best-effort, siempre que se pueda) ---
  avisar('Buenos días ☀️', 'Tu reporte de hoy ya está listo.');

  return { texto, archivo };
}

module.exports = { generarReporte };
