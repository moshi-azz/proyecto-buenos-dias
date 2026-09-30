// lib/gmail.js
// Lee los mails de las últimas N horas usando la API real de Gmail (OAuth2).
// Setup completo en README.md — necesitás credentials/credentials.json
// (Google Cloud Console → OAuth Client ID → "Aplicación de escritorio").

const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'credentials', 'token.json');
const AUTH_PORT = 53682;

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `No encontré ${CREDENTIALS_PATH}. Seguí los pasos del README para crear credenciales de Gmail API.`
    );
  }
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
}

function buildOAuthClient() {
  const creds = loadCredentials();
  const cfg = creds.installed || creds.web;
  if (!cfg) throw new Error('credentials.json con formato inesperado (esperaba "installed" o "web").');
  const { client_secret, client_id, redirect_uris } = cfg;
  // Para el flujo local forzamos el redirect a nuestro servidor temporal.
  return new google.auth.OAuth2(client_id, client_secret, `http://localhost:${AUTH_PORT}`);
}

async function getAuthorizedClient() {
  const oAuth2Client = buildOAuthClient();

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  return runLocalAuthFlow(oAuth2Client);
}

// Primera vez: levanta un servidor local temporal para recibir el redirect de Google
// después de que inicies sesión en el navegador. Solo hace falta una vez; el token
// queda guardado en credentials/token.json para las próximas corridas (incluida la
// automática por Task Scheduler).
function runLocalAuthFlow(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const qs = new URL(req.url, `http://localhost:${AUTH_PORT}`).searchParams;
        const code = qs.get('code');
        if (!code) return;

        res.end('Listo, ya podés cerrar esta pestaña y volver a la terminal.');
        server.close();

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log(`✅ Token de Gmail guardado en ${TOKEN_PATH}`);
        resolve(oAuth2Client);
      } catch (err) {
        reject(err);
      }
    });

    server.listen(AUTH_PORT, () => {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
      });
      console.log('\n🔑 Autorización de Gmail requerida (solo la primera vez).');
      console.log('Abrí esta URL en tu navegador e iniciá sesión con tu cuenta de Gmail:\n');
      console.log(authUrl, '\n');
    });
  });
}

/**
 * @param {{hours?: number, maxResults?: number}} opts
 */
async function getRecentImportantEmails(opts = {}) {
  const hours = opts.hours ?? 24;
  const maxResults = opts.maxResults ?? 15;

  const auth = await getAuthorizedClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const afterEpoch = Math.floor(Date.now() / 1000) - hours * 3600;
  const query = `after:${afterEpoch}`;

  const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults });
  const messages = list.data.messages || [];

  const detailed = await Promise.all(
    messages.map(async (m) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject'],
      });
      const headers = msg.data.payload.headers || [];
      const get = (name) => headers.find((h) => h.name === name)?.value || '';
      const labelIds = msg.data.labelIds || [];
      return {
        id: m.id,
        de: get('From'),
        asunto: get('Subject'),
        resumen: msg.data.snippet,
        noLeido: labelIds.includes('UNREAD'),
        importante: labelIds.includes('IMPORTANT') || labelIds.includes('STARRED'),
      };
    })
  );

  // Importantes/no leídos primero.
  detailed.sort((a, b) => Number(b.importante) - Number(a.importante) || Number(b.noLeido) - Number(a.noLeido));

  return detailed;
}

module.exports = { getAuthorizedClient, getRecentImportantEmails };
