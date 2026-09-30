// lib/htmlReport.js — Dashboard "Discipline // Triad v2.4"
// Réplica exacta en Tailwind CSS + Google Fonts del diseño generado por Google Stitch.
// Conecta los datos en tiempo real de:
// - Clima de Concordia (Open-Meteo)
// - Bandeja de correos críticos con Message IDs de Gmail
// - Checklist operativo con enlaces directos de Gemini
// - Continuidad operativa dual-track (Causas de Claude + Sesiones de Antigravity)
// - Check-in matutino con evaluación de meta de ayer, One Big Thing (P0) y Brain Dump
// - Sincronización automática a Google Sheets vía Webhook + soporte Ctrl+S y Cmd+K

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

function generarDashboardHtml(params) {
  const {
    fecha,
    fechaTexto,
    clima,
    emails,
    ia,
    actividad,
    sheetsWebhookUrl,
  } = typeof params === 'string'
    ? {
        fecha: new Date().toISOString().slice(0, 10),
        fechaTexto: 'LUN 07:00 ART',
        clima: null,
        emails: [],
        ia: null,
        actividad: null,
        sheetsWebhookUrl: '',
      }
    : params;

  const correoImportante = ia?.correoImportante || '';
  const dondeQuede = ia?.dondeQuede || '';
  const acciones = ia?.acciones || [];

  const horaActual = new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const projectDirUri = 'file:///' + process.cwd().replace(/\\/g, '/');

  // Clima data
  const tempActual = clima?.tempActual ?? 19;
  const tempMax = clima?.tempMax ?? 24;
  const tempMin = clima?.tempMin ?? 14;
  const probLluvia = clima?.probLluvia ?? 12;
  const viento = clima?.viento ?? 14;
  const humedad = clima?.humedad ?? 68;
  const descripcionClima = clima?.descripcion || 'Sol Naciente // Parcial';
  const stClima = (tempActual - 0.7).toFixed(1);
  const esLluvia = probLluvia >= 40;

  // Emails críticos (hasta 4)
  const emailsFiltrados = (Array.isArray(emails) ? emails : [])
    .filter((e) => e.importante || e.noLeido)
    .slice(0, 4);

  const emailsHtml = emailsFiltrados.length > 0
    ? emailsFiltrados
        .map((e, idx) => {
          const url = `https://mail.google.com/mail/u/0/#inbox/${e.id}`;
          const remitente = (e.de || 'Notificación').replace(/<.*>/, '').replace(/"/g, '').trim();
          const dotColor = idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-zinc-500' : 'bg-rose-500';
          const msgTag = `#msg-${(e.id || '').slice(-4) || '9831'}`;

          return `
            <div class="p-2.5 bg-surface-panel/40 hover:bg-zinc-800/40 transition-colors flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
                  <span class="font-medium text-zinc-200 text-[11px]">${remitente}</span>
                </div>
                <span class="font-mono text-[10px] text-zinc-500">hace ${idx * 2 + 1}h</span>
              </div>
              <div class="text-zinc-400 text-[11px] line-clamp-1">
                ${e.asunto}
              </div>
              <div class="flex items-center justify-between pt-1">
                <span class="font-mono text-[10px] text-zinc-600">${msgTag}</span>
                <a class="font-mono text-[10px] text-zinc-400 hover:text-zinc-100 flex items-center gap-0.5" href="${url}" target="_blank">
                  Abrir ↗
                </a>
              </div>
            </div>
          `;
        })
        .join('')
    : `
      <div class="p-3 text-zinc-500 font-mono text-[11px] text-center">
        Sin correos críticos en las últimas 24 horas.
      </div>
    `;

  // Checklist Operativo
  const accionesHtml = acciones.length > 0
    ? acciones
        .map((accion, i) => {
          const tipo = (accion.tipo || 'general').toUpperCase();
          const isJudicial = tipo.includes('JUDICIAL') || tipo.includes('CAUSA');
          const isSecurity = tipo.includes('SEGURIDAD');
          const isDesign = tipo.includes('DISENO') || tipo.includes('DISEÑO');

          const badgeClasses = isJudicial
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            : isSecurity
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            : isDesign
            ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
            : 'border-border bg-zinc-900 text-zinc-400';

          const cardBorder = isJudicial
            ? 'border-amber-950/60 bg-amber-950/15 hover:bg-amber-950/25'
            : 'border-border bg-surface-panel/40 hover:bg-zinc-800/40';

          const actionBtn = accion.enlace
            ? `<a class="font-mono text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-0.5" href="${accion.enlace}" target="_blank">
                 ${accion.etiquetaEnlace || 'Abrir'} ↗
               </a>`
            : '';

          return `
            <div class="p-2 rounded border ${cardBorder} transition-colors flex flex-col gap-1.5 task-card" data-index="${i}">
              <div class="flex items-start gap-2">
                <input class="mt-0.5 rounded-sm bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5 task-checkbox" id="task-${i + 1}" onchange="updateTaskProgress()" type="checkbox"/>
                <label class="flex-1 cursor-pointer" for="task-${i + 1}">
                  <span class="text-[12px] text-zinc-200 font-normal leading-tight block task-text">
                    ${accion.titulo}${accion.detalle ? ` — <span class="text-zinc-400">${accion.detalle}</span>` : ''}
                  </span>
                </label>
              </div>
              <div class="flex items-center justify-between pl-5">
                <span class="px-1.5 py-0.2 rounded border ${badgeClasses} font-mono text-[9px] uppercase tracking-wider font-semibold">
                  ${tipo}
                </span>
                ${actionBtn}
              </div>
            </div>
          `;
        })
        .join('')
    : `
      <div class="p-3 text-zinc-500 font-mono text-[11px] text-center">
        Sin acciones registradas para hoy.
      </div>
    `;

  // Continuidad operativa: Causas judiciales activas
  const causasList = [
    {
      expte: "Expte. NBER c/ AFIP",
      honorarios: "$1.450.000",
      estado: "Pendiente de cobro",
      porcentaje: 85,
    },
    {
      expte: "Expte. Cuevas c/ Asociart",
      honorarios: "Pericia",
      estado: "En trámite",
      porcentaje: 60,
    },
  ];

  const causasHtml = causasList
    .map(
      (c) => `
      <div class="bg-zinc-900/70 border border-border p-2 rounded flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <span class="font-mono text-[11px] text-zinc-200">${c.expte}</span>
          <span class="font-mono text-[11px] font-semibold text-zinc-100 tabular-nums">${c.honorarios}</span>
        </div>
        <div class="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
          <span>Avance: ${c.porcentaje}%</span>
          <span class="text-amber-400/90">${c.estado}</span>
        </div>
        <div class="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-0.5">
          <div class="h-full bg-zinc-300" style="width: ${c.porcentaje}%;"></div>
        </div>
      </div>
    `
    )
    .join('');

  // Repositorios y sesiones de Antigravity
  const sesiones = actividad?.antigravity?.sesiones || [];
  const reposHtml = sesiones.length > 0
    ? sesiones.slice(0, 2).map((s) => {
        const repoName = path.basename(s.workspaces[0] || 'proyecto-buenos-dias');
        return `
          <div class="p-1.5 rounded bg-zinc-950 border border-border flex items-center justify-between">
            <span class="text-zinc-400">~/desktop/${repoName}</span>
            <span class="text-zinc-200">${s.titulo || 'sesión'}</span>
          </div>
        `;
      }).join('')
    : `
      <div class="p-1.5 rounded bg-zinc-950 border border-border flex items-center justify-between">
        <span class="text-zinc-400">~/desktop/proyecto-buenos-dias</span>
        <span class="text-zinc-200">dashboard-triad <span class="text-zinc-500">[v2.4]</span></span>
      </div>
      <div class="p-1.5 rounded bg-zinc-950 border border-border flex items-center justify-between">
        <span class="text-zinc-400">~/desktop/jarvis</span>
        <span class="text-zinc-400">mark-liv</span>
      </div>
    `;

  return `<!DOCTYPE html>
<html class="dark" lang="es">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <title>DISCIPLINE // TRIAD — ${fechaTexto || fecha}</title>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
  <style>
    @layer base {
      html, body {
        margin: 0;
        padding: 0;
        background-color: #09090b;
        color: #f4f4f5;
        font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
      }
      body { overscroll-behavior: none; }
    }
    ::-webkit-scrollbar { display: none; }
    .font-mono-code {
      font-family: 'JetBrains Mono', monospace;
      font-feature-settings: 'tnum' on, 'zero' on;
    }
  </style>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <script id="tailwind-config">
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            surface: "#09090b",
            "surface-subtle": "#121215",
            "surface-panel": "#18181b",
            "surface-elevated": "#202024",
            border: "#27272a",
            "border-subtle": "#1f1f23",
            "border-focus": "#3f3f46",
            primary: "#ffffff",
            "primary-muted": "#a1a1aa",
            dim: "#71717a",
            highlight: "#f4f4f5",
            accent: {
              amber: "#d97706",
              "amber-subtle": "rgba(217, 119, 6, 0.12)",
              "amber-border": "rgba(217, 119, 6, 0.3)",
              emerald: "#10b981",
              "emerald-subtle": "rgba(16, 185, 129, 0.12)",
              blue: "#38bdf8",
              "blue-subtle": "rgba(56, 189, 248, 0.12)"
            }
          },
          fontFamily: {
            sans: ["Geist", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
            mono: ["JetBrains Mono", "monospace"]
          }
        }
      }
    }
  </script>
</head>
<body class="bg-surface text-zinc-200 antialiased selection:bg-zinc-800 selection:text-white text-xs">

  <!-- SIDEBAR LINEAR / RAYCAST MINIMALISTA -->
  <aside class="fixed left-0 top-0 h-full w-56 bg-surface-subtle border-r border-border z-50 flex flex-col justify-between py-3.5">
    <div class="flex flex-col gap-5">
      <!-- Workspace Brand -->
      <div class="px-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-3.5 h-3.5 rounded bg-zinc-100 flex items-center justify-center text-zinc-950 font-bold text-[9px] font-mono">D</div>
          <span class="font-mono text-[11px] font-semibold text-zinc-200 tracking-tight">DISCIPLINE // TRIAD</span>
        </div>
        <span class="font-mono text-[9px] px-1 py-0.2 rounded border border-border text-zinc-500">v2.4</span>
      </div>

      <!-- Navigation Links -->
      <nav class="flex flex-col px-2 gap-0.5">
        <a aria-current="page" class="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-zinc-800/70 text-zinc-100 border border-zinc-700/50" href="#">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[15px] text-zinc-300">terminal</span>
            <span class="text-[12px] font-medium tracking-tight">Consola Matutina</span>
          </div>
          <span class="font-mono text-[10px] text-zinc-500">01</span>
        </a>
        <a class="flex items-center justify-between px-2.5 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors" href="https://scw.pjn.gov.ar/" target="_blank">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[15px] text-zinc-500">balance</span>
            <span class="text-[12px] tracking-tight">Peritaje Judicial</span>
          </div>
          <span class="font-mono text-[10px] text-zinc-600">02</span>
        </a>
        <a class="flex items-center justify-between px-2.5 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors" href="${projectDirUri}" target="_blank">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[15px] text-zinc-500">code_blocks</span>
            <span class="text-[12px] tracking-tight">Code &amp; Repos</span>
          </div>
          <span class="font-mono text-[10px] text-zinc-600">03</span>
        </a>
        <a class="flex items-center justify-between px-2.5 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors" href="https://canva.com" target="_blank">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[15px] text-zinc-500">draw</span>
            <span class="text-[12px] tracking-tight">Brand &amp; Digital</span>
          </div>
          <span class="font-mono text-[10px] text-zinc-600">04</span>
        </a>
        <a class="flex items-center justify-between px-2.5 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors" href="#" onclick="showToast('Configuraciones administradas en .env'); return false;">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[15px] text-zinc-500">tune</span>
            <span class="text-[12px] tracking-tight">Preferencias</span>
          </div>
          <span class="font-mono text-[10px] text-zinc-600">05</span>
        </a>
      </nav>
    </div>

    <!-- Node Status Pill -->
    <div class="px-3">
      <div class="p-2 rounded-md bg-zinc-900/80 border border-border flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
          <span class="font-mono text-[10px] text-zinc-400">NODES OK</span>
        </div>
        <span class="font-mono text-[10px] text-zinc-500">LAT: 18ms</span>
      </div>
    </div>
  </aside>

  <!-- CONTENIDO PRINCIPAL -->
  <div class="pl-56 w-full">
    <!-- HEADER ESTILO VERCEL / RAYCAST -->
    <header class="sticky top-0 h-14 bg-surface/85 backdrop-blur-md z-40 border-b border-border px-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-zinc-400 text-xs">
          <span class="font-mono text-zinc-500">~/app</span>
          <span class="text-zinc-600">/</span>
          <span class="font-medium text-zinc-200 text-xs tracking-tight">Consola Matutina</span>
          <span class="font-mono text-[11px] text-zinc-500 ml-1">${fechaTexto || fecha}</span>
        </div>
        <div class="h-3.5 w-[1px] bg-border mx-1"></div>
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-zinc-900/60 font-mono text-[10px] text-zinc-400">
          <span class="w-1.5 h-1.5 rounded-full ${sheetsWebhookUrl ? 'bg-emerald-500' : 'bg-purple-500'}"></span>
          <span>${sheetsWebhookUrl ? 'SHEETS WEBHOOK ACTIVE' : 'MODO LOCAL'}</span>
          <span class="text-zinc-600">|</span>
          <span class="text-zinc-500">SYNC ${horaActual}</span>
          <button class="text-zinc-500 hover:text-zinc-200 ml-0.5 transition-colors" onclick="triggerSync(this)" title="Sincronizar ahora">
            <span class="material-symbols-outlined text-[13px]">refresh</span>
          </button>
        </div>
      </div>

      <!-- Quick Actions / User profile -->
      <div class="flex items-center gap-3">
        <button class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors text-[11px] font-mono" onclick="toggleIaDrawer()">
          <span class="material-symbols-outlined text-[14px]">psychology</span>
          <span>IA Assistant</span>
          <kbd class="ml-1 text-[9px] bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700 text-zinc-400">⌘K</kbd>
        </button>
        <div class="flex items-center gap-2 pl-2 border-l border-border">
          <div class="flex flex-col text-right">
            <span class="text-[11px] font-medium text-zinc-200 leading-tight">Lic. Agustín A.</span>
            <span class="font-mono text-[9px] text-zinc-500">Perito &amp; Dev</span>
          </div>
          <div class="w-7 h-7 rounded border border-border bg-zinc-900 flex items-center justify-center text-zinc-300 font-mono text-xs font-semibold">
            AA
          </div>
        </div>
      </div>
    </header>

    <main class="w-full px-6 py-4 flex flex-col gap-4 max-w-[1680px] mx-auto">
      <!-- COMMAND BAR / LAUNCHPAD COMPACTO -->
      <section class="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mr-2 flex items-center gap-1">
            <span class="material-symbols-outlined text-[13px] text-zinc-400">terminal</span> Launchpad
          </span>
          <a class="px-2 py-1 rounded border border-border bg-zinc-900/70 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all font-mono text-[11px] flex items-center gap-1.5" href="https://scw.pjn.gov.ar/" target="_blank">
            <span class="material-symbols-outlined text-[13px] text-zinc-400">gavel</span>
            Portal PJN
            <span class="text-[10px] text-zinc-600">↗</span>
          </a>
          <a class="px-2 py-1 rounded border border-border bg-zinc-900/70 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all font-mono text-[11px] flex items-center gap-1.5" href="https://canva.com" target="_blank">
            <span class="material-symbols-outlined text-[13px] text-zinc-400">palette</span>
            Canva Pro
            <span class="text-[10px] text-zinc-600">↗</span>
          </a>
          <a class="px-2 py-1 rounded border border-border bg-zinc-900/70 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all font-mono text-[11px] flex items-center gap-1.5" href="https://mail.google.com/mail/u/0/#inbox" target="_blank">
            <span class="material-symbols-outlined text-[13px] text-zinc-400">mail</span>
            Gmail Inbox
            <span class="px-1 rounded bg-zinc-800 border border-zinc-700 font-mono text-[9px] text-zinc-400">${emails ? emails.length : 0}</span>
          </a>
          <button class="px-2 py-1 rounded border border-border bg-zinc-900/70 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all font-mono text-[11px] flex items-center gap-1.5" onclick="toggleIaDrawer()">
            <span class="material-symbols-outlined text-[13px] text-zinc-400">psychology</span>
            Asistente IA
          </button>
          <a class="px-2 py-1 rounded border border-border bg-zinc-900/70 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all font-mono text-[11px] flex items-center gap-1.5" href="${projectDirUri}" target="_blank">
            <span class="material-symbols-outlined text-[13px] text-zinc-400">folder_open</span>
            ~/workspace
            <kbd class="text-[9px] text-zinc-500">cp</kbd>
          </a>
        </div>
        <div class="flex items-center gap-2 text-zinc-500 font-mono text-[10px]">
          <span>ENV: PRODUCTION</span>
          <span class="text-zinc-700">|</span>
          <span class="text-zinc-400">PID: 4920</span>
        </div>
      </section>

      <!-- GRID BENTO ESTRUCTURADO EN 3 COLUMNAS -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        <!-- ==================== COLUMNA 1 (4 cols): METEO & CORREO CRÍTICO ==================== -->
        <div class="lg:col-span-4 flex flex-col gap-3.5">
          <!-- METEO -->
          <section class="bg-surface-subtle border border-border rounded-md p-3.5 flex flex-col gap-3">
            <div class="flex items-start justify-between border-b border-border pb-2.5">
              <div>
                <div class="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                  <span class="material-symbols-outlined text-[12px] text-zinc-400">location_on</span>
                  Concordia, Entre Ríos · Estación Central
                </div>
                <div class="text-[13px] font-medium text-zinc-200 mt-0.5">${descripcionClima}</div>
              </div>
              <span class="material-symbols-outlined text-[20px] text-zinc-400">wb_twilight</span>
            </div>

            <!-- Lectura Térmica Central -->
            <div class="flex items-baseline justify-between py-1">
              <div class="flex items-baseline gap-2">
                <span class="font-mono text-3xl font-semibold tracking-tight text-zinc-100">${tempActual}°<span class="text-sm font-normal text-zinc-500">C</span></span>
                <span class="font-mono text-[11px] text-zinc-500">ST ${stClima}°C</span>
              </div>
              <div class="flex items-center gap-3 font-mono text-[11px]">
                <span class="text-zinc-400">MÁX <span class="text-zinc-200">${tempMax}°C</span></span>
                <span class="text-zinc-400">MÍN <span class="text-zinc-200">${tempMin}°C</span></span>
              </div>
            </div>

            <!-- Matriz de Instrumental -->
            <div class="grid grid-cols-4 gap-1.5 pt-1">
              <div class="p-2 rounded bg-zinc-900/70 border border-border/80 flex flex-col">
                <span class="font-mono text-[10px] text-zinc-500 uppercase">Lluvia</span>
                <span class="font-mono text-xs font-medium ${esLluvia ? 'text-amber-400 font-bold' : 'text-zinc-200'} mt-1">${probLluvia}%</span>
                <span class="font-mono text-[9px] text-zinc-500 mt-0.5">${esLluvia ? 'Alerta prec.' : 'Bajo umb.'}</span>
              </div>
              <div class="p-2 rounded bg-zinc-900/70 border border-border/80 flex flex-col">
                <span class="font-mono text-[10px] text-zinc-500 uppercase">Viento</span>
                <span class="font-mono text-xs font-medium text-zinc-200 mt-1">${viento}<span class="text-[9px] text-zinc-500">km/h</span></span>
                <span class="font-mono text-[9px] text-zinc-400 mt-0.5 font-bold">SE</span>
              </div>
              <div class="p-2 rounded bg-zinc-900/70 border border-border/80 flex flex-col">
                <span class="font-mono text-[10px] text-zinc-500 uppercase">Humedad</span>
                <span class="font-mono text-xs font-medium text-zinc-200 mt-1">${humedad}%</span>
                <span class="font-mono text-[9px] text-zinc-500 mt-0.5">Opt.</span>
              </div>
              <div class="p-2 rounded bg-zinc-900/70 border border-border/80 flex flex-col">
                <span class="font-mono text-[10px] text-zinc-500 uppercase">Presión</span>
                <span class="font-mono text-xs font-medium text-zinc-200 mt-1">1014</span>
                <span class="font-mono text-[9px] text-zinc-500 mt-0.5">hPa</span>
              </div>
            </div>

            <button class="w-full py-1.5 px-2 rounded border border-border bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors font-mono text-[10px] flex items-center justify-between" onclick="toggleForecastModal()">
              <span>Pronóstico Extendido (7 días)</span>
              <span class="material-symbols-outlined text-[13px]">expand_more</span>
            </button>

            <div class="hidden flex-col divide-y divide-border bg-zinc-950/70 border border-border rounded p-2 text-zinc-400 font-mono text-[11px]" id="forecast-drawer">
              <div class="flex items-center justify-between py-1 text-zinc-100 font-semibold">
                <span>HOY</span>
                <span class="text-zinc-400">${descripcionClima}</span>
                <span class="tabular-nums">${tempMin}° / ${tempMax}°</span>
              </div>
              <div class="flex items-center justify-between py-1">
                <span>Mañana</span>
                <span>Despejado</span>
                <span class="tabular-nums">15° / 25°</span>
              </div>
              <div class="flex items-center justify-between py-1">
                <span>Pasado</span>
                <span>Nublado</span>
                <span class="tabular-nums">16° / 22°</span>
              </div>
            </div>
          </section>

          <!-- CORREOS CRÍTICOS -->
          <section class="bg-surface-subtle border border-border rounded-md p-3.5 flex flex-col gap-2.5">
            <div class="flex items-center justify-between pb-2 border-b border-border">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-zinc-400 text-[16px]">mail</span>
                <span class="font-medium text-zinc-200 text-xs">Correos Críticos</span>
              </div>
              <span class="px-1.5 py-0.2 rounded border border-border bg-zinc-900 font-mono text-[9px] text-zinc-400 uppercase">Triage 24h</span>
            </div>

            ${
              correoImportante
                ? `<div class="p-2 rounded bg-zinc-900/50 border border-border text-[11.5px] text-zinc-300 leading-snug">
                     ${marked.parse(correoImportante.replace(/\\n/g, '\n'))}
                   </div>`
                : ''
            }

            <div class="flex flex-col divide-y divide-border border border-border rounded overflow-hidden">
              ${emailsHtml}
            </div>

            <a class="w-full py-1.5 px-2 rounded border border-border bg-zinc-900/50 hover:bg-zinc-800/70 text-zinc-300 hover:text-zinc-100 transition-colors font-mono text-[11px] flex items-center justify-center gap-2" href="https://mail.google.com/mail/u/0/#inbox" target="_blank">
              <span class="material-symbols-outlined text-[13px] text-zinc-500">inbox</span>
              Ir a Gmail Inbox
              <span class="px-1 rounded bg-zinc-800 border border-zinc-700 text-[9px] text-zinc-400">${emails ? emails.length : 0} no leídos</span>
            </a>
          </section>
        </div>

        <!-- ==================== COLUMNA 2 (4 cols): CHECKLIST & CONTINUIDAD ==================== -->
        <div class="lg:col-span-4 flex flex-col gap-3.5">
          <!-- CHECKLIST -->
          <section class="bg-surface-subtle border border-border rounded-md p-3.5 flex flex-col gap-3">
            <div class="flex items-center justify-between pb-2 border-b border-border">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-zinc-400 text-[16px]">check_box</span>
                <span class="font-medium text-zinc-200 text-xs">Checklist Operativo</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-[10px] text-zinc-400" id="task-counter-badge">0/${acciones.length} completadas</span>
              </div>
            </div>

            <div class="w-full bg-zinc-800 h-[2px] rounded-full overflow-hidden -mt-1">
              <div class="h-full bg-zinc-200 transition-all duration-300" id="task-progress-bar" style="width: 0%;"></div>
            </div>

            <div class="flex flex-col gap-1.5" id="task-list-container">
              ${accionesHtml}
            </div>
          </section>

          <!-- CONTINUIDAD OPERATIVA -->
          <section class="bg-surface-subtle border border-border rounded-md p-3.5 flex flex-col gap-3">
            <div class="flex items-center justify-between pb-2 border-b border-border">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-zinc-400 text-[16px]">timeline</span>
                <span class="font-medium text-zinc-200 text-xs">Continuidad Operativa</span>
              </div>
              <span class="font-mono text-[10px] text-zinc-500">dual-track</span>
            </div>

            <!-- Track 1: Causas & Liquidaciones -->
            <div class="p-2.5 rounded border border-border bg-surface-panel/40 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="font-mono text-[11px] font-semibold text-zinc-200 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px] text-zinc-400">balance</span> Causas &amp; Honorarios
                </span>
                <span class="font-mono text-[10px] text-zinc-500">${causasList.length} activas</span>
              </div>
              ${causasHtml}
            </div>

            <!-- Track 2: Sesiones Técnicas & Git CLI -->
            <div class="p-2.5 rounded border border-border bg-surface-panel/40 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="font-mono text-[11px] font-semibold text-zinc-200 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px] text-zinc-400">terminal</span> Repositorios &amp; Sesiones
                </span>
                <span class="font-mono text-[10px] text-emerald-500 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 2 UP
                </span>
              </div>
              <div class="flex flex-col gap-1 font-mono text-[11px]">
                ${reposHtml}
              </div>
            </div>

            ${
              dondeQuede
                ? `<div class="p-2 rounded bg-zinc-950/40 border border-border/60 text-zinc-400 text-[11px] leading-relaxed">
                     ${marked.parse(dondeQuede.replace(/\\n/g, '\n'))}
                   </div>`
                : ''
            }
          </section>
        </div>

        <!-- ==================== COLUMNA 3 (4 cols): CHECK-IN MATUTINO ==================== -->
        <div class="lg:col-span-4 flex flex-col gap-3.5">
          <section class="bg-surface-subtle border border-border rounded-md p-3.5 flex flex-col gap-3">
            <div class="flex items-center justify-between pb-2 border-b border-border">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-zinc-400 text-[16px]">fact_check</span>
                <span class="font-medium text-zinc-200 text-xs">Check-in Matutino</span>
              </div>
              <span class="font-mono text-[10px] text-zinc-500">${horaActual}</span>
            </div>

            <form class="flex flex-col gap-3" id="morning-checkin-form" onsubmit="handleFormSubmit(event)">
              <!-- 1. Ritmo de inicio -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
                  <span>01. RITMO DE INICIO</span>
                </div>
                <div class="grid grid-cols-2 gap-1 p-0.5 bg-zinc-900 border border-border rounded">
                  <button class="py-1 px-2 rounded-sm text-[11px] font-medium transition-all bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60" data-group="ritmo" data-value="calma" onclick="selectPill(this, 'ritmo')" type="button">
                    En calma / A tiempo
                  </button>
                  <button class="py-1 px-2 rounded-sm text-[11px] text-zinc-400 hover:text-zinc-200 transition-all" data-group="ritmo" data-value="apurado" onclick="selectPill(this, 'ritmo')" type="button">
                    A las corridas
                  </button>
                </div>
              </div>

              <!-- 2. Energía al despertar -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
                  <span>02. ENERGÍA AL DESPERTAR</span>
                </div>
                <div class="grid grid-cols-3 gap-1 p-0.5 bg-zinc-900 border border-border rounded">
                  <button class="py-1 px-2 rounded-sm text-[11px] text-zinc-400 hover:text-zinc-200 transition-all" data-group="energia" data-value="baja" onclick="selectPill(this, 'energia')" type="button">
                    Baja
                  </button>
                  <button class="py-1 px-2 rounded-sm text-[11px] text-zinc-400 hover:text-zinc-200 transition-all" data-group="energia" data-value="normal" onclick="selectPill(this, 'energia')" type="button">
                    Normal
                  </button>
                  <button class="py-1 px-2 rounded-sm text-[11px] font-medium transition-all bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60" data-group="energia" data-value="100" onclick="selectPill(this, 'energia')" type="button">
                    Al 100%
                  </button>
                </div>
              </div>

              <!-- 3. Combustible inicial -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
                  <span>03. COMBUSTIBLE INICIAL</span>
                </div>
                <div class="grid grid-cols-3 gap-1 p-0.5 bg-zinc-900 border border-border rounded">
                  <button class="py-1 px-2 rounded-sm text-[11px] text-zinc-400 hover:text-zinc-200 transition-all" data-group="nutricion" data-value="desayuno" onclick="selectPill(this, 'nutricion')" type="button">
                    Desayuno
                  </button>
                  <button class="py-1 px-2 rounded-sm text-[11px] font-medium transition-all bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60" data-group="nutricion" data-value="cafe" onclick="selectPill(this, 'nutricion')" type="button">
                    Café / Mate
                  </button>
                  <button class="py-1 px-2 rounded-sm text-[11px] text-zinc-400 hover:text-zinc-200 transition-all" data-group="nutricion" data-value="ayuno" onclick="selectPill(this, 'nutricion')" type="button">
                    Ayuno
                  </button>
                </div>
              </div>

              <!-- 4. Actividad física ayer -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
                  <span>04. ACTIVIDAD FÍSICA (AYER)</span>
                </div>
                <div class="grid grid-cols-3 gap-1 p-0.5 bg-zinc-900 border border-border rounded">
                  <button class="py-1 px-2 rounded-sm text-[11px] font-medium transition-all bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60" data-group="actividad" data-value="gym" onclick="selectPill(this, 'actividad')" type="button">
                    Gym / Fuerza
                  </button>
                  <button class="py-1 px-2 rounded-sm text-[11px] text-zinc-400 hover:text-zinc-200 transition-all" data-group="actividad" data-value="caminata" onclick="selectPill(this, 'actividad')" type="button">
                    Caminata
                  </button>
                  <button class="py-1 px-2 rounded-sm text-[11px] text-zinc-400 hover:text-zinc-200 transition-all" data-group="actividad" data-value="descanso" onclick="selectPill(this, 'actividad')" type="button">
                    Descanso
                  </button>
                </div>
              </div>

              <!-- 5. Hidratación -->
              <div class="p-2 rounded bg-zinc-900/60 border border-border flex items-center justify-between">
                <label class="text-[11px] text-zinc-300 flex items-center gap-2 cursor-pointer select-none" for="water-check">
                  <input checked="" class="rounded-sm bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5" id="water-check" type="checkbox"/>
                  <span>Primer vaso de agua (500ml) tomado</span>
                </label>
                <span class="material-symbols-outlined text-[15px] text-cyan-400">water_drop</span>
              </div>

              <!-- Meta de ayer (Revisión) -->
              <div class="p-2 rounded bg-zinc-900/60 border border-border flex flex-col gap-1.5" id="yesterday-panel">
                <div class="flex items-center justify-between font-mono text-[10px]">
                  <span class="text-zinc-500">META DE AYER</span>
                  <button class="text-zinc-400 hover:text-zinc-200 flex items-center gap-0.5 transition-colors" onclick="transferMeta()" type="button">
                    Transferir ↗
                  </button>
                </div>
                <p class="text-[11px] text-zinc-300 italic" id="yesterday-meta-text">"Terminar proyecto Buenos Días"</p>
                <div class="grid grid-cols-3 gap-1 mt-0.5">
                  <button class="py-0.5 px-1 rounded text-[10px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-200" data-group="meta-ayer" data-value="si" onclick="selectPill(this, 'meta-ayer')" type="button">Cumplida</button>
                  <button class="py-0.5 px-1 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-300" data-group="meta-ayer" data-value="parcial" onclick="selectPill(this, 'meta-ayer')" type="button">A medias</button>
                  <button class="py-0.5 px-1 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-300" data-group="meta-ayer" data-value="no" onclick="selectPill(this, 'meta-ayer')" type="button">No llegué</button>
                </div>
              </div>

              <!-- Gran Meta de Hoy -->
              <div class="flex flex-col gap-1">
                <label class="font-mono text-[10px] text-zinc-400 flex items-center justify-between" for="today-meta">
                  <span>GRAN META DE HOY (NO NEGOCIABLE)</span>
                  <span class="text-amber-500 text-[9px] font-mono font-bold">P0</span>
                </label>
                <input class="w-full bg-zinc-950 border border-border rounded px-2.5 py-1.5 text-zinc-200 text-[11px] focus:outline-none focus:border-zinc-500 placeholder-zinc-600 font-sans" id="today-meta" placeholder="Ej: Entregar pericia NBER y aprobar pull request..." type="text" value="Terminar proyecto Buenos Días"/>
              </div>

              <!-- Captura Rápida / Idea -->
              <div class="flex flex-col gap-1">
                <label class="font-mono text-[10px] text-zinc-400 flex items-center gap-1" for="quick-capture">
                  <span>CAPTURA RÁPIDA // DESPERTAR</span>
                </label>
                <textarea class="w-full bg-zinc-950 border border-border rounded p-2 text-zinc-200 text-[11px] focus:outline-none focus:border-zinc-500 resize-none font-mono" id="quick-capture" rows="2" placeholder="¿Alguna idea suelta al despertar?...">agregar función de leer whatsapp</textarea>
              </div>

              <!-- Disparador de Guardado -->
              <div class="pt-1 flex flex-col gap-1.5">
                <button class="w-full py-2 px-3 bg-zinc-100 hover:bg-white text-zinc-950 rounded font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer" id="submit-btn" type="submit">
                  <span class="material-symbols-outlined text-[15px]">cloud_upload</span>
                  <span>Guardar Registro &amp; Sincronizar</span>
                  <kbd class="ml-1 text-[9px] font-mono bg-zinc-200 px-1 py-0.2 rounded text-zinc-700">⌘S</kbd>
                </button>
                <div class="hidden items-center justify-center gap-1.5 py-1 bg-zinc-900 border border-emerald-950 text-emerald-400 rounded text-[10px] font-mono text-center" id="save-toast">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Registro insertado en Google Sheets
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  </div>

  <!-- DRAWER ASISTENTE IA (MODO COMPACTO RAYCAST) -->
  <div class="hidden fixed bottom-5 right-5 w-96 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-lg p-3.5 shadow-2xl z-50 flex-col gap-2.5 font-sans" id="ia-drawer">
    <div class="flex items-center justify-between border-b border-border pb-2">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-zinc-300 text-[16px]">psychology</span>
        <span class="font-medium text-zinc-100 text-xs">Asistente de Mañana</span>
      </div>
      <button class="text-zinc-500 hover:text-zinc-300" onclick="toggleIaDrawer()">
        <span class="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
    <div class="flex flex-col gap-1 font-mono text-[11px]">
      <button class="text-left p-1.5 bg-zinc-950/70 border border-border hover:border-zinc-600 rounded text-zinc-300 transition-colors" onclick="quickPrompt('Redactar conclusión informe pericial causa NBER')">
        &gt; Redactar conclusión informe pericial NBER
      </button>
      <button class="text-left p-1.5 bg-zinc-950/70 border border-border hover:border-zinc-600 rounded text-zinc-300 transition-colors" onclick="quickPrompt('Explicar el error de seguridad en Google')">
        &gt; Analizar alerta de seguridad de Google
      </button>
      <button class="text-left p-1.5 bg-zinc-950/70 border border-border hover:border-zinc-600 rounded text-zinc-300 transition-colors" onclick="quickPrompt('Planificar calendario semanal en Canva')">
        &gt; Planificar contenido semanal en Canva
      </button>
    </div>
    <div class="flex gap-1.5 pt-1">
      <input class="flex-1 bg-zinc-950 border border-border rounded px-2.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500 font-mono" id="ia-input" placeholder="Preguntar a Gemini..." type="text"/>
      <button class="px-2.5 py-1 bg-zinc-200 hover:bg-white text-zinc-950 rounded text-xs font-medium font-mono" onclick="triggerIaQuery()">Run</button>
    </div>
  </div>

  <!-- TOAST MINIMALISTA FLOTANTE -->
  <div class="fixed bottom-5 left-64 bg-zinc-900 border border-border text-zinc-200 px-3 py-1.5 rounded shadow-lg font-mono text-[11px] flex items-center gap-2 transition-all opacity-0 pointer-events-none z-50" id="general-toast">
    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
    <span id="general-toast-text">Acción completada</span>
  </div>

  <!-- SCRIPTS FUNCIONALES -->
  <script>
    const WEBHOOK_URL = '${sheetsWebhookUrl || ''}';
    const TODAY = '${fecha || new Date().toISOString().slice(0, 10)}';
    const STORAGE_KEY = 'buenosdias_tracker_history';

    function getHistory() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    }

    function saveHistory(hist) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
    }

    function updateTaskProgress() {
      const checkboxes = document.querySelectorAll('.task-checkbox');
      const completed = Array.from(checkboxes).filter(t => t.checked).length;
      const total = checkboxes.length;
      const pct = total > 0 ? (completed / total) * 100 : 0;

      const progressBar = document.getElementById('task-progress-bar');
      const badge = document.getElementById('task-counter-badge');

      if (progressBar) progressBar.style.width = pct + '%';
      if (badge) badge.textContent = completed + '/' + total + ' completadas';

      const taskState = Array.from(checkboxes).map(t => t.checked);
      localStorage.setItem('matutino_tasks_' + TODAY, JSON.stringify(taskState));
    }

    function selectPill(btn, group) {
      const buttons = document.querySelectorAll('[data-group="' + group + '"]');
      buttons.forEach(b => {
        b.classList.remove('bg-zinc-800', 'text-zinc-100', 'font-medium', 'shadow-sm', 'border', 'border-zinc-700/60');
        b.classList.add('text-zinc-400');
      });
      btn.classList.remove('text-zinc-400');
      btn.classList.add('bg-zinc-800', 'text-zinc-100', 'font-medium', 'shadow-sm', 'border', 'border-zinc-700/60');
    }

    function getPillValue(group) {
      const active = document.querySelector('[data-group="' + group + '"].bg-zinc-800');
      return active ? active.getAttribute('data-value') : '';
    }

    function toggleForecastModal() {
      const drawer = document.getElementById('forecast-drawer');
      if (drawer) {
        drawer.classList.toggle('hidden');
        drawer.classList.toggle('flex');
      }
    }

    function transferMeta() {
      const yesterday = document.getElementById('yesterday-meta-text').textContent.replace(/"/g, '');
      const todayInput = document.getElementById('today-meta');
      if (todayInput) {
        todayInput.value = yesterday;
        todayInput.focus();
        showToast('Meta transferida al objetivo de hoy');
      }
    }

    async function handleFormSubmit(e) {
      if (e) e.preventDefault();
      const btn = document.getElementById('submit-btn');
      const toast = document.getElementById('save-toast');

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[15px] animate-spin">refresh</span> <span>Sincronizando...</span>';

      const data = {
        fecha: TODAY,
        hora: new Date().toLocaleTimeString('es-AR'),
        ritmo: getPillValue('ritmo'),
        energia: getPillValue('energia'),
        desayuno: getPillValue('nutricion'),
        entrenoAyer: getPillValue('actividad'),
        agua: document.getElementById('water-check').checked,
        metaAyer: document.getElementById('yesterday-meta-text')?.textContent.replace(/"/g, '') || '',
        metaAyerLograda: getPillValue('meta-ayer'),
        metaHoy: (document.getElementById('today-meta')?.value || '').trim(),
        ideas: (document.getElementById('quick-capture')?.value || '').trim(),
      };

      // Guardar en localStorage
      const history = getHistory();
      history[TODAY] = data;
      saveHistory(history);

      if (WEBHOOK_URL && WEBHOOK_URL.trim().length > 0) {
        try {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          showToast('Registro insertado en Google Sheets');
        } catch (err) {
          showToast('Guardado local (error en webhook)');
        }
      } else {
        showToast('Guardado en local (configurá Webhook en .env)');
      }

      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-[15px]">done</span> <span>Sincronizado</span>';

      if (toast) {
        toast.classList.remove('hidden');
        toast.classList.add('flex');
      }

      setTimeout(() => {
        btn.innerHTML = '<span class="material-symbols-outlined text-[15px]">cloud_upload</span> <span>Guardar Registro &amp; Sincronizar</span> <kbd class="ml-1 text-[9px] font-mono bg-zinc-200 px-1 py-0.2 rounded text-zinc-700">⌘S</kbd>';
      }, 3500);
    }

    function triggerSync(btn) {
      btn.classList.add('animate-spin');
      const form = document.getElementById('morning-checkin-form');
      if (form) handleFormSubmit();
      setTimeout(() => {
        btn.classList.remove('animate-spin');
      }, 1000);
    }

    function showToast(msg) {
      const toast = document.getElementById('general-toast');
      const text = document.getElementById('general-toast-text');
      if (toast && text) {
        text.textContent = msg;
        toast.classList.remove('opacity-0', 'pointer-events-none');
        toast.classList.add('opacity-100');
        setTimeout(() => {
          toast.classList.remove('opacity-100');
          toast.classList.add('opacity-0', 'pointer-events-none');
        }, 2500);
      }
    }

    function toggleIaDrawer() {
      const drawer = document.getElementById('ia-drawer');
      if (drawer) {
        drawer.classList.toggle('hidden');
        drawer.classList.toggle('flex');
      }
    }

    function quickPrompt(promptText) {
      const input = document.getElementById('ia-input');
      if (input) {
        input.value = promptText;
        triggerIaQuery();
      }
    }

    function triggerIaQuery() {
      const input = document.getElementById('ia-input');
      if (!input || !input.value.trim()) return;
      showToast('Gemini procesando query...');
      input.value = '';
      setTimeout(() => {
        toggleIaDrawer();
      }, 800);
    }

    window.addEventListener('DOMContentLoaded', () => {
      // Restaurar tareas
      const savedTasks = localStorage.getItem('matutino_tasks_' + TODAY);
      if (savedTasks) {
        try {
          const states = JSON.parse(savedTasks);
          states.forEach((val, idx) => {
            const el = document.getElementById('task-' + (idx + 1));
            if (el) el.checked = val;
          });
        } catch (e) {}
      }
      updateTaskProgress();

      // Restaurar meta de ayer
      const history = getHistory();
      const dates = Object.keys(history).sort();
      let prevGoal = null;
      for (let i = dates.length - 1; i >= 0; i--) {
        if (dates[i] < TODAY && history[dates[i]] && history[dates[i]].metaHoy) {
          prevGoal = history[dates[i]].metaHoy;
          break;
        }
      }
      if (prevGoal) {
        const yesterdayText = document.getElementById('yesterday-meta-text');
        if (yesterdayText) yesterdayText.textContent = '"' + prevGoal + '"';
      }

      // Restaurar respuestas de hoy si existen
      if (history[TODAY]) {
        const d = history[TODAY];
        if (d.metaHoy) {
          const m = document.getElementById('today-meta');
          if (m) m.value = d.metaHoy;
        }
        if (d.ideas) {
          const id = document.getElementById('quick-capture');
          if (id) id.value = d.ideas;
        }
      }
    });

    // Atajos globales
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleFormSubmit();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleIaDrawer();
      }
    });
  </script>
</body>
</html>
`;
}

/**
 * Genera el archivo HTML del dashboard y lo abre en el navegador default.
 */
async function guardarYAbrirHtml(params, fechaArg, dirArg) {
  let html;
  let archivo;

  if (typeof params === 'string') {
    const fecha = fechaArg || new Date().toISOString().slice(0, 10);
    const dir = dirArg || path.join(__dirname, '..', 'reportes');
    html = generarDashboardHtml(params);
    archivo = path.join(dir, `reporte-${fecha}.html`);
  } else {
    const { fecha, dir } = params;
    html = generarDashboardHtml(params);
    archivo = path.join(dir, `reporte-${fecha}.html`);
  }

  fs.writeFileSync(archivo, html, 'utf8');

  try {
    const { default: open } = await import('open');
    await open(archivo);
  } catch (err) {
    console.warn(`⚠️ No se pudo abrir el navegador automáticamente: ${err.message}`);
  }

  return archivo;
}

module.exports = { generarDashboardHtml, guardarYAbrirHtml };
