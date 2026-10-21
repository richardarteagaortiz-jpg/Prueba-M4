/* =========================================================================
   Pruebas de la pasarela: firma IPN, validaciones y flujo completo
   contra un mock local de la API de NowPayments.

   Ejecutar: node tests/payments.test.js
   ========================================================================= */
'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parsearEnv, leerConfig, configPublica } = require('../server/env.js');
const {
  crearCliente, ordenarObjeto, firmarCuerpo, verificarFirma, ErrorPago
} = require('../server/nowpayments.js');
const { crearServidor, crearLimitador } = require('../server/server.js');

let pasos = 0;
const ok = (nombre) => { pasos++; console.log('  ✓ ' + nombre); };

/* ------------------------------ 1. .env ---------------------------------- */

{
  const env = parsearEnv([
    '# comentario',
    'PORT=4000',
    'PUBLIC_URL="https://cosmo.test"',
    "PAY_CURRENCY='eur'",
    'NOWPAYMENTS_API_KEY=abc123',
    'LINEA_INVALIDA',
    ''
  ].join('\n'));
  assert.strictEqual(env.PORT, '4000');
  assert.strictEqual(env.PUBLIC_URL, 'https://cosmo.test');
  assert.strictEqual(env.PAY_CURRENCY, 'eur');
  assert.ok(!('LINEA_INVALIDA' in env));
  ok('el parser de .env ignora comentarios, comillas y líneas inválidas');

  const cfg = leerConfig({ PORT: '5555', NOWPAYMENTS_API_KEY: 'clave', PAY_AMOUNTS: '3, 6 ,9' });
  assert.strictEqual(cfg.puerto, 5555);
  assert.strictEqual(cfg.pagosActivos, true);
  assert.strictEqual(cfg.webhookActivo, false);
  assert.deepStrictEqual(cfg.importes, [3, 6, 9]);
  const publica = configPublica(cfg);
  assert.strictEqual(publica.pagos, true);
  assert.ok(!('apiKey' in publica) && !('ipnSecret' in publica), 'la config pública no debe filtrar secretos');
  ok('la configuración pública nunca expone la API key ni el secreto IPN');

  const vacia = leerConfig({ NOWPAYMENTS_API_KEY: '' });
  assert.strictEqual(vacia.pagosActivos, false);
  ok('sin API key los pagos quedan desactivados (modo gratuito intacto)');
}

/* --------------------------- 2. firma IPN -------------------------------- */

{
  const secreto = 'secreto-de-prueba';
  const cuerpo = { b: 2, a: { z: 1, y: [3, { n: 2, m: 1 }] } };
  const ordenado = ordenarObjeto(cuerpo);
  assert.deepStrictEqual(Object.keys(ordenado), ['a', 'b']);
  assert.deepStrictEqual(Object.keys(ordenado.a), ['y', 'z']);

  // Firma esperada calculada de forma independiente
  const jsonOrdenado = JSON.stringify(ordenarObjeto(cuerpo));
  const esperada = crypto.createHmac('sha512', secreto).update(jsonOrdenado).digest('hex');
  assert.strictEqual(firmarCuerpo(cuerpo, secreto), esperada);
  assert.strictEqual(verificarFirma(cuerpo, esperada, secreto), true);
  assert.strictEqual(verificarFirma(cuerpo, esperada.toUpperCase(), secreto), true, 'la firma es hexadecimal sin distinguir mayúsculas');
  assert.strictEqual(verificarFirma(cuerpo, 'deadbeef', secreto), false);
  assert.strictEqual(verificarFirma(cuerpo, esperada, 'otro-secreto'), false);
  assert.strictEqual(verificarFirma(cuerpo, '', secreto), false);
  assert.strictEqual(verificarFirma(cuerpo, esperada, ''), false);
  ok('la firma HMAC SHA-512 ordena claves y compara en tiempo constante');
}

/* ------------------------- 3. cliente NowPayments ------------------------ */

(async () => {
  {
    const llamadas = [];
    const fetchFalso = async (url, opts) => {
      llamadas.push({ url, opts });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: 'inv_1', invoice_url: 'https://pay.test/i/inv_1' })
      };
    };
    const config = leerConfig({
      NOWPAYMENTS_API_KEY: 'k-test', NOWPAYMENTS_IPN_SECRET: 's-test',
      PUBLIC_URL: 'https://cosmo.test', PAY_CURRENCY: 'usd'
    });
    const cliente = crearCliente(config, fetchFalso);
    const factura = await cliente.crearFactura({ importe: 10, referencia: 'cosmo-1' });
    assert.strictEqual(factura.url, 'https://pay.test/i/inv_1');
    assert.strictEqual(llamadas[0].url, 'https://api.nowpayments.io/v1/invoice');
    assert.strictEqual(llamadas[0].opts.headers['x-api-key'], 'k-test');
    const enviado = JSON.parse(llamadas[0].opts.body);
    assert.strictEqual(enviado.price_amount, 10);
    assert.strictEqual(enviado.price_currency, 'usd');
    assert.strictEqual(enviado.ipn_callback_url, 'https://cosmo.test/api/ipn');
    assert.strictEqual(enviado.success_url, 'https://cosmo.test/?apoyo=gracias');
    ok('crearFactura envía importe, moneda, referencia y URLs de retorno correctos');

    const errorFalso = async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ message: 'Unauthorized' }) });
    const clienteMalo = crearCliente(config, errorFalso);
    await assert.rejects(() => clienteMalo.crearFactura({ importe: 5, referencia: 'x' }), (err) => {
      assert.ok(err instanceof ErrorPago);
      assert.strictEqual(err.estado, 502);
      assert.match(err.message, /401/);
      return true;
    });
    ok('los errores de NowPayments se propagan como ErrorPago sin filtrar la clave');

    const sinClave = crearCliente(leerConfig({ NOWPAYMENTS_API_KEY: '' }), fetchFalso);
    await assert.rejects(() => sinClave.crearFactura({ importe: 5 }), /Falta NOWPAYMENTS_API_KEY/);
    ok('sin clave configurada el cliente falla de forma explícita');
  }

  /* --------------------- 4. servidor + mock de la API -------------------- */

  const ipnSecret = 'ipn-secret-test';
  const peticionesMock = [];
  const mock = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => {
      peticionesMock.push({ url: req.url, headers: req.headers, body: cuerpo });
      if (req.url === '/v1/invoice') {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'inv_mock', invoice_url: 'https://sandbox.nowpayments.io/payment/?iid=inv_mock' }));
        return;
      }
      if (req.url === '/v1/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'OK' }));
        return;
      }
      res.writeHead(404);
      res.end('nope');
    });
  });
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  const mockUrl = 'http://127.0.0.1:' + mock.address().port + '/v1';

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmo-pagos-'));
  const config = leerConfig({
    NOWPAYMENTS_API_KEY: 'clave-mock',
    NOWPAYMENTS_IPN_SECRET: ipnSecret,
    NOWPAYMENTS_API_BASE: mockUrl,
    PUBLIC_URL: 'http://127.0.0.1:4321',
    PAY_AMOUNTS: '5,10,25',
    PAY_MIN_AMOUNT: '1',
    PAY_MAX_AMOUNT: '100'
  });

  const servidor = crearServidor({ config, dataDir });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + servidor.address().port;

  const pedir = async (ruta, opciones) => {
    const opts = opciones || {};
    const respuesta = await fetch(base + ruta, {
      method: opts.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}),
      body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined
    });
    const texto = await respuesta.text();
    let datos = null;
    try { datos = texto ? JSON.parse(texto) : null; } catch (err) { datos = { raw: texto }; }
    return { estado: respuesta.status, datos, cabeceras: respuesta.headers };
  };

  {
    const salud = await pedir('/api/salud');
    assert.strictEqual(salud.estado, 200);
    assert.strictEqual(salud.datos.pagos, true);
    assert.strictEqual(salud.datos.webhook, true);
    assert.deepStrictEqual(salud.datos.importes, [5, 10, 25]);
    assert.ok(!JSON.stringify(salud.datos).includes('clave-mock'), 'la salud no debe filtrar la API key');
    ok('/api/salud informa del estado sin revelar credenciales');
  }

  {
    const creada = await pedir('/api/donacion', { method: 'POST', body: { monto: 10 } });
    assert.strictEqual(creada.estado, 201);
    assert.match(creada.datos.url, /sandbox\.nowpayments\.io/);
    assert.match(creada.datos.referencia, /^cosmo-/);
    const enviado = JSON.parse(peticionesMock[0].body);
    assert.strictEqual(enviado.price_amount, 10);
    assert.strictEqual(peticionesMock[0].headers['x-api-key'], 'clave-mock');
    ok('POST /api/donacion crea la factura real con el importe elegido');
  }

  {
    const invalido = await pedir('/api/donacion', { method: 'POST', body: { monto: 7 } });
    assert.strictEqual(invalido.estado, 400, 'importe fuera de la lista permitida');
    const negativo = await pedir('/api/donacion', { method: 'POST', body: { monto: -5 } });
    assert.strictEqual(negativo.estado, 400);
    const grande = await pedir('/api/donacion', { method: 'POST', body: { monto: 5000 } });
    assert.strictEqual(grande.estado, 400);
    const texto = await pedir('/api/donacion', { method: 'POST', body: 'no-json' });
    assert.strictEqual(texto.estado, 400);
    const metodo = await pedir('/api/donacion');
    assert.strictEqual(metodo.estado, 405);
    ok('los importes y métodos inválidos se rechazan en el servidor (nunca el navegador decide)');
  }

  {
    const cuerpo = {
      payment_id: 987654, payment_status: 'finished', order_id: 'cosmo-abc',
      price_amount: 10, price_currency: 'usd', actually_paid: 0.00015
    };
    const firma = crypto.createHmac('sha512', ipnSecret)
      .update(JSON.stringify(ordenarObjeto(cuerpo))).digest('hex');

    const falsa = await pedir('/api/ipn', { method: 'POST', body: cuerpo, headers: { 'x-nowpayments-sig': 'firma-falsa' } });
    assert.strictEqual(falsa.estado, 401, 'una firma incorrecta debe rechazarse');
    const sinFirma = await pedir('/api/ipn', { method: 'POST', body: cuerpo });
    assert.strictEqual(sinFirma.estado, 401);

    const valida = await pedir('/api/ipn', { method: 'POST', body: cuerpo, headers: { 'x-nowpayments-sig': firma } });
    assert.strictEqual(valida.estado, 200);
    assert.strictEqual(valida.datos.estado, 'finished');

    const resumen = await pedir('/api/apoyos');
    assert.strictEqual(resumen.estado, 200);
    assert.strictEqual(resumen.datos.donaciones, 1);
    assert.strictEqual(resumen.datos.total, 10);
    ok('el webhook IPN rechaza firmas falsas y registra solo las verificadas');

    const pendiente = { payment_id: 1, payment_status: 'waiting', order_id: 'cosmo-x', price_amount: 5, price_currency: 'usd' };
    const firma2 = crypto.createHmac('sha512', ipnSecret).update(JSON.stringify(ordenarObjeto(pendiente))).digest('hex');
    await pedir('/api/ipn', { method: 'POST', body: pendiente, headers: { 'x-nowpayments-sig': firma2 } });
    const resumen2 = await pedir('/api/apoyos');
    assert.strictEqual(resumen2.datos.donaciones, 1, 'un pago "waiting" no cuenta como donación confirmada');
    ok('los pagos pendientes no se contabilizan como confirmados');
  }

  {
    const estatico = await fetch(base + '/');
    const html = await estatico.text();
    assert.strictEqual(estatico.status, 200);
    assert.match(html, /CosmoMates/);
    const css = await fetch(base + '/assets/css/styles.css');
    assert.strictEqual(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    ok('el servidor sirve el juego (index y assets) con el tipo correcto');
  }

  {
    const env = await fetch(base + '/.env');
    assert.strictEqual(env.status, 404, 'el .env nunca debe servirse');
    const envExample = await fetch(base + '/.env.example');
    assert.strictEqual(envExample.status, 404);
    const serverJs = await fetch(base + '/server/server.js');
    assert.strictEqual(serverJs.status, 404);
    const data = await fetch(base + '/data/pagos.json');
    assert.strictEqual(data.status, 404);
    const traversal = await fetch(base + '/../.env');
    assert.ok([403, 404].includes(traversal.status));
    ok('el servidor bloquea .env, /server, /data y path traversal');
  }

  {
    const limitador = crearLimitador(2, 1000);
    assert.strictEqual(limitador('ip'), true);
    assert.strictEqual(limitador('ip'), true);
    assert.strictEqual(limitador('ip'), false);
    assert.strictEqual(limitador('otra-ip'), true);
    ok('el limitador de peticiones funciona por IP');
  }

  {
    // Servidor sin claves: debe degradar al modo gratuito sin romperse
    const sinPagos = crearServidor({
      config: leerConfig({ NOWPAYMENTS_API_KEY: '', NOWPAYMENTS_IPN_SECRET: '' }),
      dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'cosmo-sinpagos-'))
    });
    await new Promise((r) => sinPagos.listen(0, '127.0.0.1', r));
    const baseSin = 'http://127.0.0.1:' + sinPagos.address().port;
    const salud = await (await fetch(baseSin + '/api/salud')).json();
    assert.strictEqual(salud.pagos, false);
    const respuesta = await fetch(baseSin + '/api/donacion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monto: 5 })
    });
    assert.strictEqual(respuesta.status, 503);
    const json = await respuesta.json();
    assert.match(json.error, /no están configurados/i);
    const portada = await fetch(baseSin + '/');
    assert.strictEqual(portada.status, 200, 'el juego sigue funcionando sin pagos configurados');
    await new Promise((r) => sinPagos.close(r));
    ok('sin claves el juego funciona igual y la API responde 503 con un mensaje claro');
  }

  await new Promise((r) => servidor.close(r));
  await new Promise((r) => mock.close(r));
  fs.rmSync(dataDir, { recursive: true, force: true });

  console.log(`\n✓ ${pasos} grupos de pruebas de la pasarela superados`);
})().catch((err) => {
  console.error('\n✗ FALLO:', err.message);
  console.error(err.stack);
  process.exit(1);
});
