/* =========================================================================
   CosmoMates · Cliente mínimo de NowPayments (API REST oficial)
   Solo se ejecuta en el servidor: la API key nunca llega al navegador.
   ========================================================================= */
'use strict';

const crypto = require('node:crypto');

/** Ordena las claves de un objeto de forma recursiva (requisito de la firma IPN). */
function ordenarObjeto(valor) {
  if (Array.isArray(valor)) return valor.map(ordenarObjeto);
  if (valor && typeof valor === 'object') {
    const salida = {};
    Object.keys(valor)
      .sort()
      .forEach((clave) => {
        salida[clave] = ordenarObjeto(valor[clave]);
      });
    return salida;
  }
  return valor;
}

/** Firma HMAC SHA-512 del cuerpo con las claves ordenadas (igual que NowPayments). */
function firmarCuerpo(cuerpo, secreto) {
  const ordenado = ordenarObjeto(cuerpo);
  return crypto.createHmac('sha512', secreto).update(JSON.stringify(ordenado)).digest('hex');
}

/**
 * Verifica la cabecera `x-nowpayments-sig` de un webhook IPN.
 * Compara en tiempo constante para evitar ataques de temporización.
 */
function verificarFirma(cuerpo, firmaRecibida, secreto) {
  if (!secreto || !firmaRecibida || !cuerpo) return false;
  const esperada = firmarCuerpo(cuerpo, secreto);
  const a = Buffer.from(String(esperada), 'utf8');
  const b = Buffer.from(String(firmaRecibida).trim().toLowerCase(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

class ErrorPago extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = 'ErrorPago';
    this.estado = estado || 502;
  }
}

/**
 * Crea un cliente ligado a la configuración del servidor.
 * @param {object} config
 * @param {Function} [fetchImpl] inyectable para pruebas
 */
function crearCliente(config, fetchImpl) {
  const hacerFetch = fetchImpl || globalThis.fetch;

  async function llamar(ruta, opciones) {
    const opts = opciones || {};
    if (!config.apiKey) throw new ErrorPago('Falta NOWPAYMENTS_API_KEY en el servidor', 503);

    let respuesta;
    try {
      respuesta = await hacerFetch(`${config.apiBase}${ruta}`, {
        method: opts.method || 'GET',
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(opts.timeout || 12000)
      });
    } catch (err) {
      throw new ErrorPago('No se pudo contactar con NowPayments: ' + err.message, 504);
    }

    const texto = await respuesta.text();
    let datos = null;
    try { datos = texto ? JSON.parse(texto) : null; } catch (err) { datos = { raw: texto }; }

    if (!respuesta.ok) {
      const detalle = datos && (datos.message || datos.error || datos.raw);
      throw new ErrorPago(`NowPayments respondió ${respuesta.status}${detalle ? ': ' + detalle : ''}`, 502);
    }
    return datos;
  }

  /** Crea una factura alojada (checkout) y devuelve `invoice_url`. */
  async function crearFactura(opciones) {
    const cuerpo = {
      price_amount: Number(opciones.importe),
      price_currency: String(opciones.moneda || config.moneda).toLowerCase(),
      order_id: String(opciones.referencia),
      order_description: String(opciones.descripcion || 'Apoyo a CosmoMates').slice(0, 200),
      ipn_callback_url: config.webhookActivo ? `${config.urlPublica}/api/ipn` : undefined,
      success_url: `${config.urlPublica}/?apoyo=gracias`,
      cancel_url: `${config.urlPublica}/?apoyo=cancelado`
    };
    Object.keys(cuerpo).forEach((k) => { if (cuerpo[k] === undefined) delete cuerpo[k]; });

    const datos = await llamar('/invoice', { method: 'POST', body: cuerpo });
    if (!datos || !datos.invoice_url) {
      throw new ErrorPago('NowPayments no devolvió una URL de pago', 502);
    }
    return {
      id: datos.id || null,
      url: datos.invoice_url,
      importe: cuerpo.price_amount,
      moneda: cuerpo.price_currency,
      referencia: cuerpo.order_id
    };
  }

  /** Estado de un pago concreto (útil para conciliar). */
  async function estadoPago(paymentId) {
    if (!paymentId) throw new ErrorPago('Falta payment_id', 400);
    return llamar(`/payment/${encodeURIComponent(paymentId)}`);
  }

  /** Comprueba que la clave funciona y que la API está disponible. */
  async function estadoApi() {
    return llamar('/status', { timeout: 6000 });
  }

  return { crearFactura, estadoPago, estadoApi, llamar };
}

module.exports = { crearCliente, ordenarObjeto, firmarCuerpo, verificarFirma, ErrorPago };
