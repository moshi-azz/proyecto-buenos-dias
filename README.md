# ☀️ Buenos Días — Executive Daily Briefing & Life Dashboard

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AI Engine](https://img.shields.io/badge/AI-Groq%20LPU%20%7C%20Gemini-orange.svg)](https://groq.com/)
[![Platform: Windows](https://img.shields.io/badge/platform-Windows-blue.svg)](https://www.microsoft.com/windows)

**Buenos Días** es un sistema de asistente personal matutino autónomo y de alta productividad. Todas las mañanas sintetiza el clima en tiempo real, filtra correos críticos con inteligencia artificial de ultra baja latencia, recupera tu contexto de trabajo reciente y te entrega un resumen ejecutivo en tres frentes:

1. 🖥️ **Obsidian Slate Dashboard:** Un panel interactivo HTML local (dark-mode, estilo Stitch/Obsidian) con enlaces rápidos, métricas y tracker de hábitos.
2. 📱 **Executive WhatsApp Mobile Briefing:** Resumen conciso enviado a tu celular con formato nativo (*Smart Brevity*: micro-clima, radar crítico, top prioridades y proyectos en curso).
3. 🔔 **Notificación Nativa de Windows:** Alerta en el escritorio avisando que tu plan del día está listo.

---

## 🌟 Características Principales

- ⚡ **Motor IA Groq LPU (Sub-segundo):** Impulsado por modelos abiertos de alta gama (`openai/gpt-oss-120b` y `qwen/qwen3.8-27b`) a través de la infraestructura LPU de Groq, con fallback transparente a Google Gemini.
- 📬 **Filtro Inteligente de Gmail:** Evalúa tus correos de las últimas 24 horas usando la API oficial de Google, ignorando newsletters y spam, y resaltando únicamente lo que requiere atención inmediata.
- 🧠 **Memoria de Contexto Dual ("Dónde quedé"):**
  - **Proyectos Activos:** Memoria en `contexto/` con tus metas, peritajes o proyectos en curso.
  - **Antigravity / Local SQLite:** Lectura automática del historial de sesiones y ramas locales recientes.
- 📊 **Tracker de Hábitos & Sincronización con Google Sheets:** Check-in diario interactivo (Ritmo, Energía, Desayuno, Ejercicio, Metas P0 e Ideas) con persistencia local (`localStorage`) y sincronización automática vía Google Apps Script Webhook.
- ⏰ **Despertador Autónomo de PC:** Scripts PowerShell para encender o despertar Windows automáticamente a las `06:45` y ejecutar el reporte general a las `06:50`.
- 🔒 **Arquitectura Segura (Zero-Leak):** Diseñado para no almacenar secretos en el repositorio. Tokens OAuth, sesiones de WhatsApp, variables `.env` y reportes generados quedan 100% aislados en tu equipo.

---

## 🏗️ Arquitectura del Sistema

```
                 ┌────────────────────────────────┐
                 │       Open-Meteo API           │
                 │      (Clima y Pronóstico)      │
                 └──────────────┬─────────────────┘
                                │
┌───────────────────────┐       │       ┌───────────────────────┐
│     Gmail API v1      │───────┼───────│  Contexto & Sesiones  │
│  (Correos últimas 24h)│       │       │(Proyectos + SQLite DB)│
└───────────────────────┘       │       └───────────────────────┘
                                ▼
                 ┌────────────────────────────────┐
                 │       Groq LPU Engine          │
                 │  (openai/gpt-oss-120b / Qwen)  │
                 │   [Fallback: Google Gemini]    │
                 └──────────────┬─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ Obsidian Slate│       │   WhatsApp    │       │ Notificación  │
│ HTML Dashboard│       │ Web Formatter │       │   Windows     │
│  + Sheets API │       │ (Smart Brief) │       │   (Toast)     │
└───────────────┘       └───────────────┘       └───────────────┘
```

---

## 🚀 Inicio Rápido (En 2 Minutos)

### 1. Clonar el repositorio
```bash
git clone https://github.com/moshi-azz/proyecto-buenos-dias.git
cd proyecto-buenos-dias
```

### 2. Instalación Automática (Windows)
Hacé doble clic en **`setup.bat`** (o ejecutalo desde la consola):
```cmd
setup.bat
```
El instalador se encargará de:
1. Validar que Node.js esté instalado.
2. Instalar todas las dependencias (`npm install`).
3. Crear tu archivo `.env` a partir de `.env.example`.
4. Generar las carpetas requeridas (`data/`, `reportes/`, `credentials/`).

> **En Linux / macOS:** Ejecutá `npm install` y copiá `.env.example` a `.env`.

---

## ⚙️ Configuración Paso a Paso

### 1. Variables de Entorno (`.env`)
Abrí el archivo `.env` recién creado y configurá lo que desees utilizar:

```env
# Personalización de Usuario
USER_NAME=TuNombre
USER_CITY=Tu Ciudad, Provincia, País

# Coordenadas de Clima (Open-Meteo no requiere API key)
WEATHER_LAT=-31.3928
WEATHER_LON=-58.0209

# Motor de IA Principal (Groq - Gratuito y Ultra-rápido)
GROQ_API_KEY=gsk_tu_clave_aqui
GROQ_MODEL=openai/gpt-oss-120b

# Motor de IA Fallback (Opcional - Google Gemini)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# WhatsApp Móvil (Opcional - Número internacional sin '+' ni espacios)
WHATSAPP_TO_NUMBER=5493451234567

# Google Sheets Tracker (Opcional - Ver docs/google-sheets-setup.md)
GOOGLE_SHEETS_WEBHOOK_URL=
```

- **Groq API Key:** Obtené tu clave gratuita en [console.groq.com/keys](https://console.groq.com/keys).
- **Gemini API Key (Opcional):** Obtené tu clave en [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

---

### 2. Correo de Gmail (Google OAuth)
Para que el sistema lea tus correos no leídos y alertas de seguridad:

1. Entrá a [Google Cloud Console](https://console.cloud.google.com/) y creá un proyecto.
2. En **APIs y servicios → Biblioteca**, buscá y activá **Gmail API**.
3. En **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo**.
   - Nombre de la app: `Buenos Días`.
   - Agregá tu propia cuenta de Gmail en **Usuarios de prueba**.
4. En **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación de escritorio**.
   - Descargá el archivo JSON resultante.
5. Renombrá ese archivo a **`credentials.json`** y guardalo en la carpeta:
   ```
   credentials/credentials.json
   ```
*(La primera vez que se ejecute el reporte se abrirá una ventana de navegador para autorizar permisos de lectura `gmail.readonly`).*

---

### 3. WhatsApp (Opcional)
Si querés recibir el reporte en tu celular todas las mañanas:

1. Asegurate de haber completado `WHATSAPP_TO_NUMBER` en `.env`.
2. Hacé doble clic en **`vincular.bat`** (o ejecutá `npm run vincular`).
3. Aparecerá un código QR en la consola:
   - Abrí WhatsApp en tu celular → **Dispositivos vinculados** → **Vincular un dispositivo**.
   - Escaneá el código QR.
4. El sistema te enviará un mensaje de confirmación y guardará la sesión localmente en `data/wwebjs_session/`. ¡No necesitás volver a escanearlo nunca más!

---

### 4. Tracker de Hábitos en Google Sheets (Opcional)
Si querés que tus check-ins matutinos se almacenen en una hoja de cálculo con gráficos en tiempo real:

- Seguí la guía paso a paso en **[docs/google-sheets-setup.md](docs/google-sheets-setup.md)**.
- Incluye el código listo para copiar y pegar en Google Apps Script.

---

### 5. Memoria de Proyectos Activos
Podés definir tus proyectos y prioridades editando el archivo `contexto/proyectos-en-curso.md` (podés guiarte con `contexto/proyectos-en-curso.example.md`). La IA leerá este documento cada mañana para contextualizar qué tareas sugerirte.

---

## 🏃‍♂️ Ejecución y Uso

### Ejecución Manual
- **Doble clic en `iniciar.bat`**, o:
```bash
npm start
```
En cuestión de 2 a 3 segundos:
- Se generará el reporte en `reportes/reporte-YYYY-MM-DD.html` y `.md`.
- Se abrirá automáticamente el Dashboard en tu navegador predeterminado.
- Recibirás una notificación nativa de Windows.
- Si tenés WhatsApp configurado, llegará el mensaje ejecutivo a tu celular.

---

## ⏰ Automatización Matutina (Despertar la PC)

El proyecto incluye dos scripts de PowerShell diseñados para Windows:
- **`configurar-despertador.ps1`**: Programa dos tareas en el *Programador de Tareas de Windows*:
  - **`06:45` (BuenosDias-Despertar):** Despierta el equipo y ejecuta `mantener-despierta.ps1` (evita que Windows se vuelva a suspender).
  - **`06:50` (BuenosDias):** Corre el pipeline completo de generación de reporte.

### Para activarlo:
1. Abrí **PowerShell como Administrador**.
2. Navegá hasta la carpeta del proyecto y ejecutá:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\configurar-despertador.ps1
```

> **Nota sobre suspensión:** Asegurate de que en Windows la opción *Permitir temporizadores de activación* (Wake Timers) esté habilitada en las Opciones Avanzadas de Energía del Panel de Control.

---

## 🔐 Seguridad y Privacidad

Este repositorio está configurado con reglas estrictas de exclusión (`.gitignore`):
- ❌ **Secretos y API Keys:** `.env` y variantes nunca se suben.
- ❌ **Credenciales Google:** `credentials/*.json` y tokens OAuth ignorados.
- ❌ **Sesiones de WhatsApp:** `data/wwebjs_session` y cachés de Chromium jamás se versionan.
- ❌ **Datos Personales y Reportes:** `reportes/*.html` y `reportes/*.md` (que contienen fragmentos de correos y tareas privadas) permanecen exclusivamente locales.
- ❌ **Memorias Privadas:** Solo se versionan plantillas de ejemplo (`*.example.md`).

---

## 📂 Estructura del Proyecto

```
proyecto-buenos-dias/
├── contexto/
│   ├── .gitkeep
│   └── proyectos-en-curso.example.md  # Plantilla de proyectos para contexto de IA
├── credentials/
│   └── .gitkeep                       # Guardá acá credentials.json
├── data/
│   └── .gitkeep                       # Almacén local de sesión de WhatsApp Web
├── docs/
│   └── google-sheets-setup.md         # Guía de integración con Google Sheets
├── lib/
│   ├── activity.js                    # Recolección de contexto de Antigravity/SQLite
│   ├── gmail.js                       # Cliente OAuth y lector de correos Gmail
│   ├── htmlReport.js                  # Generador del Dashboard Obsidian Slate
│   ├── notify.js                      # Notificaciones de escritorio para Windows
│   ├── report.js                      # Generador de Markdown diario
│   ├── synthesis.js                   # Orquestador de IA (Groq LPU / Gemini)
│   ├── weather.js                     # Consulta de clima Open-Meteo
│   ├── whatsappFormatter.js           # Formateador Smart Brevity para móviles
│   └── whatsappSend.js                # Integración con cliente de WhatsApp Web
├── moshiclaw-modulos-reutilizables/   # Módulos core de automatización y browser
├── configurar-despertador.ps1         # Script de configuración de Task Scheduler
├── index.js                           # Punto de entrada principal del reporte
├── iniciar.bat                        # Acceso directo para correr el reporte
├── package.json
├── setup.bat                          # Instalador automático 1-click
├── vincular-whatsapp.js               # Script interactivo de escaneo QR de WhatsApp
└── vincular.bat                       # Acceso directo para vincular WhatsApp
```

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consultá el archivo `LICENSE` para más detalles.
