/* =========================================================================
   CosmoMates · Servidor estático + pasarela de donaciones (NowPayments)
   Node 18+ · sin dependencias externas.

   Arranque:  npm run serve   (o `node server/server.js`)
   Docs:      docs/integracion-pagos.md
   ========================================================================= */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { leerConfig, configPublica, RAIZ } = require('./env.js');
const { crearCliente, verificarFirma, ErrorPago } = require('./nowpayments.js');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

const PRIVADOS = ['/server/', '/tests/', '/data/', '/.git/', '/docs/'];
const BLOQUEADOS = ['/.env', '/.env.example', '/package.json', '/package-lock.json'];

function cabecerasSeguras(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}

function responderJson(res, estado, datos) {
  const cuerpo = JSON.stringify(datos);
  cabecerasSeguras(res);
  res.writeHead(estado, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(cuerpo),
    'Cache-Control': 'no-store'
  });
  res.end(cuerpo);
}

function leerCuerpo(req, limite) {
  return new Promise((resolve, reject) => {
    const max = limite || 64 * 1024;
    let total = 0;
    const partes = [];
    req.on('data', (trozo) => {
      total += trozo.length;
      if (total > max) {
        reject(new ErrorPago('Cuerpo de la petición demasiado grande', 413));
        req.destroy();
        return;
      }
      partes.push(trozo);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

function ipDe(req) {
  const reenviada = req.headers['x-forwarded-for'];
  if (typeof reenviada === 'string' && reenviada) return reenviada.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'desconocida';
}

/** Limitador simple en memoria (suficiente para un servidor pequeño). */
function crearLimitador(maximo, ventanaMs) {
  const registro = new Map();
  return function permitir(clave) {
    const ahora = Date.now();
    const previo = registro.get(clave) || { count: 0, desde: ahora };
    if (ahora - previo.desde > ventanaMs) {
      previo.count = 0;
      previo.desde = ahora;
    }
    previo.count += 1;
    registro.set(clave, previo);
    if (registro.size > 5000) {
      for (const [claveGuardada, valor] of registro) {
        if (ahora - valor.desde > ventanaMs) registro.delete(claveGuardada);
      }
    }
    return previo.count <= maximo;
  };
}

/** Persistencia mínima de pagos confirmados (sin datos personales). */
function crearAlmacen(directorio) {
  const archivo = path.join(directorio, 'pagos.json');
  return {
    archivo,
    guardar(entrada) {
      try {
        fs.mkdirSync(directorio, { recursive: true });
        let lista = [];
        try { lista = JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch (err) { lista = []; }
        if (!Array.isArray(lista)) lista = [];
        lista.push(entrada);
        fs.writeFileSync(archivo, JSON.stringify(lista.slice(-500), null, 2));
        return true;
      } catch (err) {
        return false;
      }
    },
    resumen() {
      try {
        const lista = JSON.parse(fs.readFileSync(archivo, 'utf8'));
        if (!Array.isArray(lista)) return { donaciones: 0, total: 0 };
        const confirmadas = lista.filter((p) => p.estado === 'confirmado');
        return {
          donaciones: confirmadas.length,
          total: Number(confirmadas.reduce((suma, p) => suma + (Number(p.importe) || 0), 0).toFixed(2))
        };
      } catch (err) {
        return { donaciones: 0, total: 0 };
      }
    }
  };
}

function crearServidor(opciones) {
  const opts = opciones || {};
  const config = opts.config || leerConfig();
  const cliente = opts.cliente || crearCliente(config, opts.fetch);
  const almacen = crearAlmacen(opts.dataDir || path.join(RAIZ, 'data'));
  const permitirDonacion = crearLimitador(6, 10 * 60 * 1000);

  async function manejarApi(req, res, ruta) {
    const metodo = req.method || 'GET';

    if (ruta === '/api/salud' && metodo === 'GET') {
      return responderJson(res, 200, Object.assign({ ok: true, servicio: 'cosmomates' }, configPublica(config)));
    }

    if (ruta === '/api/apoyos' && metodo === 'GET') {
      return responderJson(res, 200, almacen.resumen());
    }

    if (ruta === '/api/donacion') {
      if (metodo !== 'POST') {
        res.setHeader('Allow', 'POST');
        return responderJson(res, 405, { error: 'Método no permitido' });
      }
      if (!config.pagosActivos) {
        return responderJson(res, 503, {
          error: 'Los pagos no están configurados en este servidor.',
          ayuda: 'Define NOWPAYMENTS_API_KEY en el archivo .env y reinicia.'
        });
      }
      if (!permitirDonacion(ipDe(req))) {
        return responderJson(res, 429, { error: 'Demasiadas solicitudes. Inténtalo en unos minutos.' });
      }

      let cuerpo = {};
      try {
        const texto = await leerCuerpo(req, 4 * 1024);
        cuerpo = texto ? JSON.parse(texto) : {};
      } catch (err) {
        return responderJson(res, 400, { error: 'Cuerpo inválido' });
      }

      const importe = Number(cuerpo.monto);
      if (!Number.isFinite(importe) || importe < config.importeMinimo || importe > config.importeMaximo) {
        return responderJson(res, 400, {
          error: `El importe debe estar entre ${config.importeMinimo} y ${config.importeMaximo} ${config.moneda.toUpperCase()}.`
        });
      }
      if (config.importes.length && config.importes.indexOf(importe) === -1) {
        return responderJson(res, 400, {
          error: 'Importe no permitido.',
          permitidos: config.importes
        });
      }

      const referencia = 'cosmo-' + Date.now().toString(36) + '-' +
        Math.random().toString(36).slice(2, 8);

      try {
        const factura = await cliente.crearFactura({
          importe,
          moneda: config.moneda,
          referencia,
          descripcion: 'Apoyo voluntario a CosmoMates'
        });
        almacen.guardar({
          referencia,
          id: factura.id,
          importe,
          moneda: config.moneda,
          estado: 'pendiente',
          creado: new Date().toISOString()
        });
        return responderJson(res, 201, {
          url: factura.url,
          referencia,
          importe,
          moneda: config.moneda
        });
      } catch (err) {
        const estado = err instanceof ErrorPago ? err.estado : 502;
        return responderJson(res, estado, {
          error: err.message || 'No se pudo crear el pago'
        });
      }
    }

    if (ruta === '/api/ipn') {
      if (metodo !== 'POST') {
        res.setHeader('Allow', 'POST');
        return responderJson(res, 405, { error: 'Método no permitido' });
      }
      if (!config.webhookActivo) {
        return responderJson(res, 503, { error: 'Webhook sin configurar (falta NOWPAYMENTS_IPN_SECRET).' });
      }

      let texto;
      try {
        texto = await leerCuerpo(req, 64 * 1024);
      } catch (err) {
        return responderJson(res, 413, { error: 'Cuerpo demasiado grande' });
      }

      let cuerpo;
      try {
        cuerpo = JSON.parse(texto);
      } catch (err) {
        return responderJson(res, 400, { error: 'JSON inválido' });
      }

      const firma = req.headers['x-nowpayments-sig'];
      if (!verificarFirma(cuerpo, firma, config.ipnSecret)) {
        return responderJson(res, 401, { error: 'Firma IPN inválida' });
      }

      const estado = String(cuerpo.payment_status || '').toLowerCase();
      const confirmados = ['finished', 'confirmed', 'partially_paid'];
      almacen.guardar({
        referencia: cuerpo.order_id || null,
        id: cuerpo.payment_id || null,
        importe: Number(cuerpo.price_amount || 0),
        moneda: String(cuerpo.price_currency || config.moneda).toLowerCase(),
        estado: confirmados.indexOf(estado) !== -1 ? 'confirmado' : estado || 'desconocido',
        ipn: true,
        recibido: new Date().toISOString()
      });

      return responderJson(res, 200, { ok: true, estado });
    }

    return responderJson(res, 404, { error: 'Ruta de API no encontrada' });
  }

  function servirEstatico(req, res, ruta) {
    let decodificada;
    try {
      decodificada = decodeURIComponent(ruta.split('?')[0]);
    } catch (err) {
      res.writeHead(400);
      return res.end('Petición inválida');
    }

    if (decodificada === '/') decodificada = '/index.html';

    const relativa = path.normalize(decodificada).replace(/^([/\\])+/, '');
    if (relativa.startsWith('..') || path.isAbsolute(relativa)) {
      res.writeHead(403);
      return res.end('Prohibido');
    }

    const conBarra = '/' + relativa.replace(/\\/g, '/');
    if (BLOQUEADOS.indexOf(conBarra) !== -1 || PRIVADOS.some((p) => conBarra.startsWith(p))) {
      res.writeHead(404);
      return res.end('No encontrado');
    }
    if (path.basename(relativa).startsWith('.')) {
      res.writeHead(404);
      return res.end('No encontrado');
    }

    const completa = path.join(RAIZ, relativa);
    if (!completa.startsWith(RAIZ + path.sep)) {
      res.writeHead(403);
      return res.end('Prohibido');
    }

    fs.stat(completa, (err, stats) => {
      if (err || !stats.isFile()) {
        cabecerasSeguras(res);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('No encontrado');
      }
      const tipo = TIPOS[path.extname(completa).toLowerCase()] || 'application/octet-stream';
      cabecerasSeguras(res);
      res.writeHead(200, {
        'Content-Type': tipo,
        'Content-Length': stats.size,
        'Cache-Control': tipo.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600'
      });
      fs.createReadStream(completa).pipe(res);
    });
  }

  const servidor = http.createServer((req, res) => {
    let ruta;
    try {
      ruta = new URL(req.url, 'http://localhost').pathname;
    } catch (err) {
      res.writeHead(400);
      return res.end('Petición inválida');
    }

    if (ruta.startsWith('/api/')) {
      manejarApi(req, res, ruta).catch((err) => {
        if (!res.headersSent) responderJson(res, 500, { error: 'Error interno' });
        else res.end();
      });
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end('Método no permitido');
    }

    servirEstatico(req, res, ruta);
  });

  servidor.config = config;
  servidor.cliente = cliente;
  servidor.almacen = almacen;
  return servidor;
}

if (require.main === module) {
  const config = leerConfig();
  const servidor = crearServidor({ config });

  servidor.listen(config.puerto, '0.0.0.0', () => {
    const publica = configPublica(config);
    console.log(`\n🚀 CosmoMates en http://localhost:${config.puerto}`);
    console.log(`   Pagos: ${publica.pagos ? '✅ activos (' + publica.moneda.toUpperCase() + ')' : '⏸️  desactivados (falta NOWPAYMENTS_API_KEY)'}`);
    console.log(`   Webhook IPN: ${publica.webhook ? '✅ configurado' : '⚠️  sin IPN secret (no se puede confirmar pagos)'}`);
    if (publica.pagos) {
      console.log(`   Importes permitidos: ${publica.importes.join(', ')} ${publica.moneda.toUpperCase()}`);
      console.log(`   URL pública: ${config.urlPublica}`);
    }
    console.log('');
  });

  const cerrar = () => {
    console.log('\n👋 Cerrando servidor…');
    servidor.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

module.exports = { crearServidor, crearLimitador, crearAlmacen };
