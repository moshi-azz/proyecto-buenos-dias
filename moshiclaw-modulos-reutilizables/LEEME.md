# Módulos reutilizados de moshiClaw-panel para "buenos dias"

Origen: https://github.com/moshi-azz/moshiClaw-panel

## Por qué no se instaló el panel completo

`setup.sh` del repo exige explícitamente Ubuntu/Debian (`apt`), instala
paquetes de X11 (`xdotool`, `scrot`, `ffmpeg`) para streaming de escritorio,
y está pensado para correr como servicio systemd/PM2 en un servidor Linux.
Tu compu conectada para "buenos dias" es Windows, así que levantar el panel
entero tal cual no es viable ahí — y como charlamos, tampoco hacía falta:
lo que sirve para este proyecto es reusar código puntual, no correr el panel
de administración completo.

## Qué se copió y por qué sirve

- **`whatsapp.js`** — Cliente de WhatsApp Web real (vía `whatsapp-web.js` +
  Puppeteer), con login por QR o por código de teléfono, sesión persistida
  en disco. No depende de X11 ni de nada Linux-específico: es JS + un binario
  de Chromium, así que funciona en Windows igual que en Ubuntu. Es la pieza
  clave para que "buenos dias" pueda leer tus chats (`getChats()`) o mandarte
  el reporte del día por WhatsApp (`sendMessage()`).
- **`browser.js`** — Wrapper genérico de Puppeteer (navegar, leer texto de
  una página, hacer clic, scrollear). Útil si en algún momento querés que el
  reporte matutino "lea" una red social sin API oficial (mismo mecanismo que
  usa MoshiClaw para eso). También cross-platform.
- **`utils.js`** — Detecta el ejecutable de Chromium/Chrome. **Adaptado**
  respecto al original: el de MoshiClaw solo buscaba rutas de Linux: le
  agregué las rutas típicas de Chrome/Edge en Windows como fallback. Lo más
  simple igual es dejar que use el paquete npm `chromium` (se instala un
  binario propio y no dependés de tener Chrome instalado).

## Qué NO se trajo (y por qué)

- **`modules/productivity.js`** — Ojo con este: a pesar del nombre, **no
  conecta con Gmail/Calendar reales**. Solo guarda "emails" y "eventos" en un
  JSON local (es un stub/mock para la demo del panel). Para "buenos dias" no
  sirve — ya tenés Gmail conectado de verdad en este mismo entorno de Claude,
  que es mejor punto de partida para el módulo de correo.
- **Todo lo de escritorio remoto / streaming de pantalla / terminal
  integrada / webcam** (`screen.js`, `terminal.js`, `webcam.js`,
  `xdotool`/`scrot`/`ffmpeg` de `setup.sh`) — Linux-only y no lo necesita
  "buenos dias".
- **`messenger.js`, `autoresponder.js`, `canva.js`, `skills.js`, rutas
  Express del panel** — son parte de la UI/API del panel de administración,
  no del "motor" de datos. Se pueden mirar más adelante si hace falta, pero
  no se copiaron ahora para no traer código de más.

## Cómo integrarlos

1. Copiá esta carpeta dentro de tu proyecto "buenos dias" (por ejemplo en
   `buenos-dias/lib/whatsapp/`).
2. Instalá las dependencias que usan:
   ```bash
   npm install whatsapp-web.js qrcode puppeteer-core chromium
   ```
3. La primera vez que corras `whatsapp.js` vas a necesitar escanear un QR
   (o pedir el código de vinculación por teléfono) para autenticar la
   sesión — igual que en MoshiClaw. Después queda guardada en
   `data/wwebjs_session/` y no hace falta repetirlo.
4. Mismo riesgo que ya asumís con MoshiClaw: `whatsapp-web.js` no es la API
   oficial de Meta, así que hay un riesgo bajo pero real de restricción de
   cuenta por patrones de bot. Como ya corrés ese riesgo hoy, sumar este uso
   no cambia mucho el panorama.
