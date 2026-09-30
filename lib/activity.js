// lib/activity.js — Señales de en qué estuviste trabajando:
// 1. Contexto de proyectos de Claude (contexto/proyectos-en-curso.md), refrescado
//    por la tarea silenciosa de Claude a partir de su memoria en la nube.
// 2. Actividad local de Claude Code / Desktop (logs de depuración MCP).
// 3. Actividad local de Antigravity (~/.gemini/antigravity/conversation_summaries.db),
//    leída directamente con SQLite nativo de Node.js.

const fs = require('fs');
const os = require('os');
const path = require('path');

function listarDirs(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

// Los nombres de carpeta vienen "escapados" (espacios Y barras se
// convierten en "-"), así que la reconstrucción es aproximada — alcanza
// para que se entienda de qué proyecto se trata, no para reconstruir la
// ruta exacta.
function nombreLegible(escapado) {
  return escapado.replace(/^([A-Za-z])--/, '$1:\\').replace(/-/g, ' ');
}

/**
 * Lee el snapshot de proyectos que Claude vuelca en contexto/proyectos-en-curso.md
 */
function getClaudeProjectsContext() {
  const archivo = path.join(__dirname, '..', 'contexto', 'proyectos-en-curso.md');
  if (!fs.existsSync(archivo)) {
    return null;
  }
  try {
    const contenido = fs.readFileSync(archivo, 'utf8').trim();
    return contenido.length > 0 ? contenido : null;
  } catch {
    return null;
  }
}

/**
 * Actividad reciente de Claude Code / Claude Desktop en esta PC, a partir
 * de los logs de depuración de MCP (no del contenido real de las charlas).
 * @param {{ sinceHours?: number }} opts
 */
function getClaudeCliActivity(opts = {}) {
  const sinceHours = opts.sinceHours ?? 36;
  const base = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'claude-cli-nodejs',
    'Cache'
  );

  if (!fs.existsSync(base)) return [];

  const cutoff = Date.now() - sinceHours * 3600 * 1000;
  const proyectos = [];

  for (const proyectoDir of listarDirs(base)) {
    const proyectoPath = path.join(base, proyectoDir);
    let ultimaActividad = 0;
    const herramientas = new Set();

    for (const subDir of listarDirs(proyectoPath)) {
      const subPath = path.join(proyectoPath, subDir);
      const m = subDir.match(/^mcp-logs-(.+)$/);
      const herramienta = m ? m[1] : subDir;

      let archivos = [];
      try {
        archivos = fs.readdirSync(subPath);
      } catch {
        continue;
      }

      for (const archivo of archivos) {
        let st;
        try {
          st = fs.statSync(path.join(subPath, archivo));
        } catch {
          continue;
        }
        if (st.mtimeMs > ultimaActividad) ultimaActividad = st.mtimeMs;
        if (st.mtimeMs >= cutoff) herramientas.add(herramienta);
      }
    }

    if (ultimaActividad >= cutoff) {
      proyectos.push({
        proyecto: nombreLegible(proyectoDir),
        ultimaActividad: new Date(ultimaActividad),
        herramientas: [...herramientas],
      });
    }
  }

  proyectos.sort((a, b) => b.ultimaActividad - a.ultimaActividad);
  return proyectos;
}

/**
 * Lee las conversaciones y proyectos recientes registrados por Antigravity
 * en ~/.gemini/antigravity/conversation_summaries.db
 * @param {{ limit?: number }} opts
 */
function getAntigravityActivity(opts = {}) {
  const limit = opts.limit ?? 10;
  const dbPath = path.join(os.homedir(), '.gemini', 'antigravity', 'conversation_summaries.db');

  if (!fs.existsSync(dbPath)) {
    return {
      disponible: false,
      motivo: 'No se encontró la base de datos de Antigravity en ~/.gemini/antigravity/',
      sesiones: [],
    };
  }

  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const stmt = db.prepare(
        'SELECT conversation_id, title, preview, last_modified_time, workspace_uris FROM conversation_summaries ORDER BY last_modified_time DESC LIMIT ?'
      );
      const rows = stmt.all(limit);
      const sesiones = rows.map((r) => {
        let workspaces = [];
        try {
          const parsed = JSON.parse(r.workspace_uris || '[]');
          workspaces = parsed.map((uri) => {
            const decoded = decodeURIComponent(uri);
            return decoded
              .replace(/^file:\/\/\/?([a-zA-Z])%3A/i, '$1:')
              .replace(/^file:\/\/\/?([a-zA-Z]):/i, '$1:');
          });
        } catch {
          workspaces = [];
        }

        return {
          id: r.conversation_id,
          titulo: r.title || r.preview || 'Sin título',
          ultimaActividad: r.last_modified_time,
          workspaces,
        };
      });

      return {
        disponible: true,
        sesiones,
      };
    } finally {
      db.close();
    }
  } catch (err) {
    return {
      disponible: false,
      motivo: `Error al leer base de datos de Antigravity: ${err.message}`,
      sesiones: [],
    };
  }
}

async function getActivitySnapshot(opts = {}) {
  return {
    claudeProyectos: getClaudeProjectsContext(),
    claudeCli: getClaudeCliActivity(opts),
    antigravity: getAntigravityActivity(opts),
  };
}

module.exports = {
  getActivitySnapshot,
  getClaudeProjectsContext,
  getClaudeCliActivity,
  getAntigravityActivity,
};
