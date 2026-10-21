/* =========================================================================
   CosmoMates · Carga de configuración (.env sin dependencias)
   Las credenciales viven SOLO aquí, en el servidor. Nunca en el navegador.
   ========================================================================= */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');

/** Lee un archivo .env y devuelve un objeto. Ignora comentarios y líneas vacías. */
function parsearEnv(texto) {
  const salida = {};
  String(texto || '').split(/\r?\n/).forEach((linea) => {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) return;
    const igual = limpia.indexOf('=');
    if (igual === -1) return;
    const clave = limpia.slice(0, igual).trim();
    let valor = limpia.slice(igual + 1).trim();
    if (!clave) return;
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    salida[clave] = valor;
  });
  return salida;
}

function cargarEnv(archivo) {
  const ruta = archivo || path.join(RAIZ, '.env');
  let texto = '';
  try {
    texto = fs.readFileSync(ruta, 'utf8');
  } catch (err) {
    texto = '';
  }
  return parsearEnv(texto);
}

function leerConfig(entorno) {
  const env = Object.assign({}, cargarEnv(), entorno || process.env);
  const pedir = (clave, defecto) => {
    const valor = env[clave];
    return valor === undefined || valor === '' ? defecto : String(valor).trim();
  };

  const importes = pedir('PAY_AMOUNTS', '5,10,25,50')
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const config = {
    puerto: Number(pedir('PORT', '3000')),
    urlPublica: pedir('PUBLIC_URL', `http://localhost:${pedir('PORT', '3000')}`).replace(/\/+$/, ''),
    apiKey: pedir('NOWPAYMENTS_API_KEY', ''),
    ipnSecret: pedir('NOWPAYMENTS_IPN_SECRET', ''),
    apiBase: pedir('NOWPAYMENTS_API_BASE', 'https://api.nowpayments.io/v1').replace(/\/+$/, ''),
    moneda: pedir('PAY_CURRENCY', 'usd').toLowerCase(),
    importes: importes.length ? importes : [5, 10, 25, 50],
    importeMinimo: Number(pedir('PAY_MIN_AMOUNT', '1')),
    importeMaximo: Number(pedir('PAY_MAX_AMOUNT', '100')),
    entorno: pedir('NODE_ENV', 'development')
  };

  config.pagosActivos = Boolean(config.apiKey);
  config.webhookActivo = Boolean(config.ipnSecret);
  return config;
}

/** Texto que se puede mostrar en el navegador: nunca incluye secretos. */
function configPublica(config) {
  return {
    pagos: config.pagosActivos,
    webhook: config.webhookActivo,
    moneda: config.moneda,
    importes: config.importes,
    modo: 'donacion'
  };
}

module.exports = { parsearEnv, cargarEnv, leerConfig, configPublica, RAIZ };
