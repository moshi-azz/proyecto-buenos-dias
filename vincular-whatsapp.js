// vincular-whatsapp.js — Muestra el código QR directamente en la consola para escanearlo
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const QRCode = require('qrcode');
const wa = require('./moshiclaw-modulos-reutilizables/whatsapp');
const utils = require('./moshiclaw-modulos-reutilizables/utils');

(async () => {
  const to = process.env.WHATSAPP_TO_NUMBER;
  if (!to) {
    console.error('❌ Falta WHATSAPP_TO_NUMBER en .env');
    process.exit(1);
  }

  console.log('================================================================');
  console.log('            🤖 VINCULACIÓN DE WHATSAPP — BUENOS DÍAS            ');
  console.log('================================================================\n');
  console.log('Iniciando WhatsApp... El código QR aparecerá abajo en unos segundos.\n');

  wa.emitter.on('raw_qr', async (rawQr) => {
    try {
      const qrAscii = await QRCode.toString(rawQr, { type: 'terminal', small: true });
      console.log('\n================================================================');
      console.log('          📱 ESCANEÁ ESTE CÓDIGO QR CON TU CELULAR              ');
      console.log('================================================================\n');
      console.log(qrAscii);
      console.log('👉 En tu celular:');
      console.log('   1. Abrí WhatsApp.');
      console.log('   2. Menú (3 puntitos o Configuración) > Dispositivos vinculados.');
      console.log('   3. Tocá "Vincular un dispositivo".');
      console.log('   4. Apuntá la cámara al código QR de arriba.\n');
      console.log('================================================================\n');
    } catch (e) {
      console.error('Error mostrando QR:', e.message);
    }
  });

  wa.emitter.on('status', (s) => {
    if (s === 'authenticated') {
      console.log('🔐 ¡Código detectado! Autenticando sesión...');
    }
  });

  // Iniciar en modo QR
  await wa.start(null, null, { headless: true });

  // Esperar a que quede ready (hasta 180 segundos)
  let segundos = 0;
  while (wa.getStatus().status !== 'ready' && segundos < 180) {
    await utils.sleep(1000);
    segundos++;
  }

  if (wa.getStatus().status !== 'ready') {
    console.error('\n❌ Tiempo de espera agotado. Volvé a intentarlo cuando estés listo.');
    await wa.stop();
    process.exit(1);
  }

  console.log('\n🎉 ¡FELICITACIONES! WHATSAPP VINCULADO CON ÉXITO.');
  console.log('Enviando mensaje de confirmación a tu WhatsApp...');

  const nombre = process.env.USER_NAME || 'Moshi';
  const mensaje =
    `☀️ *¡Buenos días ${nombre}!*\n\n` +
    '✅ *Tu WhatsApp quedó 100% vinculado y funcionando.*\n\n' +
    'A partir de ahora vas a recibir tu reporte matutino automáticamente todos los días a las 06:50 🚀';

  try {
    await wa.sendMessage(to, mensaje);
    console.log('✅ Mensaje de prueba entregado a tu celular.');
  } catch (err) {
    console.warn('⚠️ Se vinculó pero no se pudo enviar el mensaje:', err.message);
  }

  console.log('Guardando sesión...');
  await wa.stop();
  console.log('✨ Todo listo. La sesión quedó guardada permanentemente en data/wwebjs_session.');
  process.exit(0);
})().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
