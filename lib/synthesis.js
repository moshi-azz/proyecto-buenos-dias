// lib/synthesis.js — Capa de "juicio" con IA: qué correo importa de verdad,
// un resumen honesto de "dónde quedé" a partir de señales locales, y
// acciones sugeridas para arrancar el día.
//
// Usa la API de Gemini (Google AI Studio) directamente vía fetch, sin SDK
// aparte. Requiere GEMINI_API_KEY en .env — se crea gratis en
// https://aistudio.google.com/apikey (tiene nivel gratuito para un uso
// personal como este; revisá límites vigentes en la propia consola).
// Si no está configurada, report.js usa un fallback sin IA (ver ahí).

function resumirEmails(emailsRaw) {
  if (!emailsRaw || emailsRaw.length === 0) return 'Sin mails en el período.';
  return emailsRaw
    .slice(0, 20)
    .map(
      (e, i) =>
        `${i + 1}. De: ${e.de} | Asunto: ${e.asunto} | ${e.noLeido ? 'no leído' : 'leído'} | Resumen: ${e.resumen}`
    )
    .join('\n');
}

function resumirProyectosClaude(claudeProyectos, claudeCli) {
  const bloques = [];
  if (claudeProyectos) {
    bloques.push(`[Snapshot de proyectos activos de Claude (memoria de la cuenta)]:\n${claudeProyectos}`);
  }
  if (claudeCli && claudeCli.length > 0) {
    const cliTxt = claudeCli
      .map(
        (p) =>
          `- ${p.proyecto}: última actividad ${p.ultimaActividad.toLocaleString('es-AR')}, herramientas usadas: ${
            p.herramientas.join(', ') || 'sin datos'
          }`
      )
      .join('\n');
    bloques.push(`[Actividad local de Claude Code/Desktop (logs MCP)]:\n${cliTxt}`);
  }
  if (bloques.length === 0) {
    return 'Sin proyectos activos ni actividad reciente detectada de Claude.';
  }
  return bloques.join('\n\n');
}

function resumirActividadAntigravity(antigravity) {
  if (!antigravity || !antigravity.disponible) {
    return antigravity?.motivo || 'Antigravity no disponible.';
  }
  if (!antigravity.sesiones || antigravity.sesiones.length === 0) {
    return 'Sin conversaciones recientes registradas en Antigravity.';
  }
  return antigravity.sesiones
    .slice(0, 5)
    .map((s) => {
      const fecha = s.ultimaActividad ? new Date(s.ultimaActividad).toLocaleString('es-AR') : 'reciente';
      const ws = s.workspaces.length > 0 ? s.workspaces.join(', ') : 'general';
      return `- "${s.titulo}" (última actividad: ${fecha}) | Carpetas: ${ws}`;
    })
    .join('\n');
}

function armarPrompt({ clima, emailsRaw, actividad }) {
  const nombre = process.env.USER_NAME || 'Moshi';
  const ciudad = process.env.USER_CITY || 'Concordia, Entre Ríos, Argentina';
  return `Sos el asistente que arma el reporte matutino de ${nombre}, en \
${ciudad}. Con los datos crudos de abajo armá tres \
secciones en español rioplatense, tono cercano y directo, SIN inventar nada \
que no esté en los datos.

1) CORREO IMPORTANTE: de la lista de mails, elegí solo los que realmente \
ameritan atención (alertas de seguridad, algo urgente, pedidos de gente \
real) y para cada uno una línea con por qué importa. Ignorá newsletters, \
promociones y spam. Si no hay nada importante, decilo en una frase.

2) DONDE QUEDE: resumí en qué se viene trabajando diferenciando con claridad:
   - Proyectos de Claude: destacá las causas judiciales / pericias y proyectos activos principales que aparecen en el snapshot.
   - Antigravity: mencioná los desarrollos técnicos, scripts o temas trabajados recientemente con Antigravity en esta PC.
   Armá un resumen claro y conciso con viñetas o subtítulos para arrancar enfocado.

3) ACCIONES SUGERIDAS: entre 3 y 5 acciones concretas para arrancar el \
día, priorizadas, basadas en todo lo anterior (clima, correo, proyectos de Claude y tareas de Antigravity). \
Para que el panel sea verdaderamente accionable, cada acción debe incluir un enlace directo relevante:
- Si trata de un correo: enlace a Gmail (ej. https://mail.google.com/mail/u/0/#inbox o https://mail.google.com/mail/u/0/#search/...)
- Si trata de pericias/causas judiciales: https://scw.pjn.gov.ar/
- Si trata de Canva / diseño / redes: https://www.canva.com/
- Si trata de proyectos en Claude: https://claude.ai/
- Si trata de código local o carpetas: file:/// (ruta local del proyecto) o URL pertinente
- Si no hay URL específica, dejá el campo "enlace" como string vacío ("").

Clima de hoy: ${JSON.stringify(clima)}

Mails de las últimas 24hs:
${resumirEmails(emailsRaw)}

Proyectos y actividad de Claude:
${resumirProyectosClaude(actividad.claudeProyectos, actividad.claudeCli)}

Actividad reciente en Antigravity (esta PC):
${resumirActividadAntigravity(actividad.antigravity)}

Respondé ÚNICAMENTE con un JSON válido, sin texto antes ni después, con esta estructura exacta:
{
  "radarCritico": [
    "Breve alerta urgente o correo clave (ej: Google: Alerta de acceso o PJN: Cobro honorarios NBER)"
  ],
  "enCursoCorto": [
    "⚖️ Pericias PJN: causas principales activas",
    "💻 Dev / Redes: proyectos activos clave"
  ],
  "correoImportante": "resumen en markdown",
  "dondeQuede": "resumen en markdown",
  "acciones": [
    {
      "titulo": "Título conciso y directo de la tarea",
      "detalle": "Contexto o motivo en 1 línea",
      "tipo": "causa" | "seguridad" | "correo" | "codigo" | "diseno" | "general",
      "enlace": "https://... o file:///... o vacío",
      "etiquetaEnlace": "Texto del botón, ej. 'Ir al PJN', 'Ver en Gmail', 'Abrir Canva'"
    }
  ]
}`;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsearYNormalizarRespuesta(texto) {
  // Por si igual viniera envuelto en ```json ... ```
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(limpio);

  // Normalizar acciones para asegurar objetos consistentes con enlace
  if (Array.isArray(parsed.acciones)) {
    parsed.acciones = parsed.acciones.map((a) => {
      if (typeof a === 'string') {
        return {
          titulo: a,
          detalle: '',
          tipo: 'general',
          enlace: '',
          etiquetaEnlace: '',
        };
      }
      return {
        titulo: a.titulo || a.title || 'Acción',
        detalle: a.detalle || a.description || '',
        tipo: a.tipo || 'general',
        enlace: a.enlace || a.url || '',
        etiquetaEnlace: a.etiquetaEnlace || (a.enlace ? 'Abrir' : ''),
      };
    });
  } else {
    parsed.acciones = [];
  }

  return parsed;
}

async function llamarGroq({ apiKey, modelo, prompt }) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const body = {
    model: modelo || 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: `Sos el asistente personal de ${process.env.USER_NAME || 'Moshi'}. Respondé ÚNICAMENTE con un objeto JSON válido respetando el esquema solicitado, sin markdown extra ni explicaciones alrededor.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    const err = new Error(`Groq respondió ${res.status}${detalle ? `: ${detalle.slice(0, 300)}` : ''}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const texto = data?.choices?.[0]?.message?.content;
  if (!texto) {
    throw new Error('Respuesta de Groq sin texto en choices');
  }

  return parsearYNormalizarRespuesta(texto);
}

async function llamarGemini({ apiKey, modelo, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    const err = new Error(`Gemini respondió ${res.status}${detalle ? `: ${detalle.slice(0, 300)}` : ''}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) {
    const motivo = data?.candidates?.[0]?.finishReason || 'sin candidates en la respuesta';
    throw new Error(`Respuesta de Gemini sin texto (${motivo})`);
  }

  return parsearYNormalizarRespuesta(texto);
}

/**
 * @param {{ clima: object, emailsRaw: Array, actividad: object }} datos
 * @returns {Promise<{ correoImportante: string, dondeQuede: string, acciones: Array<{titulo: string, detalle: string, tipo: string, enlace: string, etiquetaEnlace: string}> }>}
 */
async function sintetizarReporte({ clima, emailsRaw, actividad }) {
  const prompt = armarPrompt({ clima, emailsRaw, actividad });

  // 1) Si está configurado Groq, lo usamos como primera opción (ultra-rápido LPU, sin cuotas 503)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModelo = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    try {
      return await llamarGroq({ apiKey: groqKey, modelo: groqModelo, prompt });
    } catch (errGroq) {
      console.warn(`⚠️ Error en Groq (${groqModelo}): ${errGroq.message}. Probando fallback en Groq qwen/qwen3.8-27b...`);
      try {
        return await llamarGroq({ apiKey: groqKey, modelo: 'qwen/qwen3.8-27b', prompt });
      } catch (errGroq2) {
        console.warn(`⚠️ Fallback en Groq falló: ${errGroq2.message}. Intentando con Gemini si está disponible...`);
      }
    }
  }

  // 2) Fallback a Gemini si está disponible
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const modelo = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    try {
      return await llamarGemini({ apiKey: geminiKey, modelo, prompt });
    } catch (err) {
      if (err.status === 503) {
        await esperar(2000);
        try {
          return await llamarGemini({ apiKey: geminiKey, modelo, prompt });
        } catch (err2) {
          if (err2.status === 503) {
            const fallbackModelo = 'gemini-2.5-flash-lite';
            console.log(`⚠️ Gemini 503 en ${modelo}, probando fallback con ${fallbackModelo}...`);
            return await llamarGemini({ apiKey: geminiKey, modelo: fallbackModelo, prompt });
          }
          throw err2;
        }
      }
      throw err;
    }
  }

  throw new Error('Ni GROQ_API_KEY ni GEMINI_API_KEY están configuradas en .env');
}

module.exports = { sintetizarReporte };
