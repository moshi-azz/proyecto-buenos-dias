// lib/weather.js
// Clima actual + pronóstico del día vía Open-Meteo (gratis, sin API key).
// Docs: https://open-meteo.com/en/docs

const WEATHER_CODES = {
  0: 'Cielo despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna débil',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  56: 'Llovizna helada débil',
  57: 'Llovizna helada intensa',
  61: 'Lluvia débil',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada débil',
  67: 'Lluvia helada intensa',
  71: 'Nevada débil',
  73: 'Nevada moderada',
  75: 'Nevada intensa',
  77: 'Granizo pequeño',
  80: 'Chubascos débiles',
  81: 'Chubascos moderados',
  82: 'Chubascos violentos',
  85: 'Chubascos de nieve débiles',
  86: 'Chubascos de nieve intensos',
  95: 'Tormenta eléctrica',
  96: 'Tormenta con granizo débil',
  99: 'Tormenta con granizo intenso',
};

function describeCode(code) {
  return WEATHER_CODES[code] || `Condición desconocida (código ${code})`;
}

/**
 * @param {{lat?: number, lon?: number, tz?: string}} opts
 */
async function getWeatherReport(opts = {}) {
  const latitude = opts.lat ?? process.env.WEATHER_LAT ?? -31.3928;
  const longitude = opts.lon ?? process.env.WEATHER_LON ?? -58.0209;
  const tz = opts.tz ?? 'auto';

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code');
  url.searchParams.set('timezone', tz);
  url.searchParams.set('forecast_days', '1');

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo respondió ${res.status}`);
  }
  const data = await res.json();

  return {
    tempActual: Math.round(data.current.temperature_2m),
    humedad: data.current.relative_humidity_2m,
    viento: Math.round(data.current.wind_speed_10m),
    descripcion: describeCode(data.current.weather_code),
    tempMax: Math.round(data.daily.temperature_2m_max[0]),
    tempMin: Math.round(data.daily.temperature_2m_min[0]),
    probLluvia: data.daily.precipitation_probability_max[0],
  };
}

module.exports = { getWeatherReport, describeCode };
