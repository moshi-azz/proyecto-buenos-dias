// lib/whatsappFormatter.js — Formateador móvil ejecutivo para WhatsApp
// Aplica los principios de "Smart Brevity" y formateo nativo de WhatsApp:
// - Cero Markdown roto (#, ##, [link](url))
// - Negritas (*texto*), cursivas (_texto_) y citas con barra lateral (> texto)
// - Lectura de 15 segundos: micro-clima, radar crítico, top 3 prioridades y contexto rápido.

function capitalizar(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Limpia texto markdown para que se lea natural en WhatsApp sin tags rotos.
 */
function limpiarTextoMd(texto) {
  if (!texto) return '';
  return texto
    // Quitar enlaces markdown [texto](url) -> texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Quitar encabezados #, ##, ###
    .replace(/^#{1,6}\s+/gm, '')
    // Reemplazar viñetas asterisco/guion por viñeta redonda limpia
    .replace(/^[\*\-]\s+/gm, '• ')
    .trim();
}

/**
 * Genera el mensaje optimizado para WhatsApp.
 * @param {object} params
 * @param {Date} params.fecha
 * @param {string} params.fechaTexto
 * @param {object} params.clima
 * @param {object} params.ia
 * @param {object} params.actividad
 * @returns {string}
 */
function formatearReporteWhatsapp({ fecha = new Date(), fechaTexto, clima, ia, actividad }) {
  const lineas = [];

  const fechaFormateada = capitalizar(
    fecha.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  );

  // 1. Header con fecha
  const nombre = (process.env.USER_NAME || 'Moshi').toUpperCase();
  const ciudad = process.env.USER_CITY_SHORT || (process.env.USER_CITY ? process.env.USER_CITY.split(',')[0].trim() : 'Concordia');
  lineas.push(`☀️ *BUENOS DÍAS, ${nombre}*`);
  lineas.push(`📅 _${fechaFormateada}_`);
  lineas.push('');

  // 2. Micro-clima en una sola línea informativa
  if (clima) {
    const estado = clima.descripcion || 'Parcial';
    const temp = `${clima.tempActual}°C`;
    const minMax = `mín ${clima.tempMin}° / máx ${clima.tempMax}°`;
    const lluvia = clima.probLluvia > 0 ? ` · ☔ ${clima.probLluvia}% lluvia` : '';
    lineas.push(`🌤️ *${ciudad}:* ${temp} · ${estado} (${minMax})${lluvia}`);
  }

  lineas.push('');
  lineas.push('━━━━━━━━━━━━━━━━━━━━');

  // 3. Radar Crítico (Alertas urgentes / correos importantes)
  const itemsRadar = [];
  if (ia?.radarCritico && Array.isArray(ia.radarCritico) && ia.radarCritico.length > 0) {
    for (const r of ia.radarCritico.slice(0, 3)) {
      itemsRadar.push(`• ${limpiarTextoMd(r)}`);
    }
  } else if (ia?.correoImportante) {
    // Extraer hasta 2 líneas clave de correo
    const lineasCorreo = ia.correoImportante
      .split('\n')
      .map(l => limpiarTextoMd(l))
      .filter(l => l.length > 5 && !l.toLowerCase().includes('no hay nada'));
    for (const l of lineasCorreo.slice(0, 2)) {
      itemsRadar.push(l.startsWith('•') ? l : `• ${l}`);
    }
  }

  if (itemsRadar.length > 0) {
    lineas.push('🚨 *RADAR CRÍTICO*');
    lineas.push(...itemsRadar);
    lineas.push('');
  }

  // 4. Foco del Día (Top 3 acciones prioritarias)
  const acciones = ia?.acciones || [];
  if (acciones.length > 0) {
    lineas.push('🎯 *PRIORIDADES DE HOY*');
    const numeros = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    const topAcciones = acciones.slice(0, 3);
    topAcciones.forEach((acc, i) => {
      const num = numeros[i] || '•';
      const tit = typeof acc === 'object' ? acc.titulo : acc;
      const det = typeof acc === 'object' && acc.detalle ? ` — _${acc.detalle}_` : '';
      lineas.push(`${num} *${limpiarTextoMd(tit)}*${limpiarTextoMd(det)}`);
    });
    lineas.push('');
  }

  // 5. Continuidad Operativa (en bloque de cita estilizado con >)
  lineas.push('📌 *EN CURSO*');
  if (ia?.enCursoCorto && Array.isArray(ia.enCursoCorto) && ia.enCursoCorto.length > 0) {
    for (const item of ia.enCursoCorto.slice(0, 3)) {
      lineas.push(`> ${limpiarTextoMd(item)}`);
    }
  } else {
    // Fallback sintetizado
    lineas.push('> ⚖️ *Pericias PJN:* NBER (honorarios), Cuevas, Yacob, Barrios, EDASA');
    lineas.push('> 💻 *Dev & Redes:* Buenos Días, Jarvis & Canva Siglo 21');
  }

  lineas.push('');
  lineas.push('━━━━━━━━━━━━━━━━━━━━');
  lineas.push('💻 _Dashboard completo y check-in abierto en tu PC_');

  return lineas.join('\n');
}

module.exports = { formatearReporteWhatsapp };
