const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { generarReporte } = require('./lib/report');

(async () => {
  console.log('Generando reporte de "buenos días"...\n');
  const { texto, archivo } = await generarReporte();
  console.log(texto);
  console.log(`\n📄 Guardado en: ${archivo}`);
})().catch((err) => {
  console.error('❌ Error generando el reporte:', err);
  process.exit(1);
});
