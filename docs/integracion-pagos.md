# 💳 Pasarela de donaciones (NowPayments) — implementada

CosmoMates incluye una integración **funcional y probada** de donaciones voluntarias con NowPayments.
El juego sigue siendo **gratuito, sin cuentas y sin datos personales**: si no configuras las claves, todo funciona igual y el botón de apoyo ni siquiera aparece.

---

## 1. Arranque en 4 pasos

```bash
# 1. Dependencias: ninguna (Node 18+)
node --version

# 2. Configura tus claves (el archivo .env NO se sube a git)
cp .env.example .env
#    edita .env y rellena NOWPAYMENTS_API_KEY y NOWPAYMENTS_IPN_SECRET

# 3. Arranca el servidor
npm run serve          # equivale a: node server/server.js

# 4. Abre http://localhost:3000
```

En la consola verás el estado real:

```text
🚀 CosmoMates en http://localhost:3000
   Pagos: ✅ activos (USD)
   Webhook IPN: ✅ configurado
   Importes permitidos: 5, 10, 25, 50 USD
```

| Situación | Qué ocurre |
| --- | --- |
| Sin `NOWPAYMENTS_API_KEY` | El juego funciona normal; el botón "Apoyar" permanece oculto y `/api/donacion` responde 503. |
| Con API key, sin `NOWPAYMENTS_IPN_SECRET` | Se crean las facturas, pero **no se confirman pagos** (no hay webhook verificable). |
| Ambos configurados | Flujo completo: factura → pago → webhook firmado → donación registrada. |

---

## 2. Qué se implementó

| Archivo | Responsabilidad |
| --- | --- |
| `server/server.js` | Sirve el juego y expone la API. Sin dependencias externas. |
| `server/nowpayments.js` | Cliente de la API REST: `POST /v1/invoice`, `GET /v1/payment/{id}`, `GET /v1/status` y **verificación de firma IPN HMAC SHA-512**. |
| `server/env.js` | Lee `.env` sin librerías y separa configuración privada de la pública. |
| `.env.example` | Plantilla documentada. **No contiene secretos.** |
| `assets/js/app.js` | Botón "Apoyar", modal con importes, aviso para adultos y retorno `?apoyo=gracias`. |

### Endpoints

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/api/salud` | Indica si los pagos están activos. No expone claves. |
| `GET` | `/api/apoyos` | Resumen agregado (número de donaciones y total). Sin datos personales. |
| `POST` | `/api/donacion` | Crea la factura en NowPayments. **El importe se valida en el servidor** contra `PAY_AMOUNTS`. Devuelve `{ url }`. |
| `POST` | `/api/ipn` | Webhook de NowPayments. **Solo acepta peticiones con firma válida.** |

### Seguridad aplicada

- La API key **solo existe en el proceso del servidor**; el navegador nunca la recibe.
- Validación de importe en servidor (lista blanca de `PAY_AMOUNTS` y rango `PAY_MIN_AMOUNT`–`PAY_MAX_AMOUNT`).
- **Límite de 6 solicitudes cada 10 minutos por IP** en `/api/donacion`.
- Webhook con **HMAC SHA-512** sobre el JSON con claves ordenadas y comparación en tiempo constante.
- El `.env`, `/server`, `/data` y cualquier archivo oculto **no se sirven** por HTTP; protección contra *path traversal*.
- Cabeceras `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` y `Permissions-Policy`.
- Cuerpo de las peticiones limitado (4 KB en donación, 64 KB en IPN).
- Nunca se guardan datos de tarjeta, monedero ni datos personales: solo referencia, importe, moneda y estado.

---

## 3. Configurar NowPayments

1. Crea la cuenta y configura la **wallet de cobro** en el panel (sin esto no hay pagos).
2. **API keys → Generate**: crea una clave. Si alguna se compartió por chat o commit, **revócala y genera otra**.
3. **Store settings → IPN**: copia el *IPN secret* y define la URL de callback:
   ```text
   https://tudominio.com/api/ipn
   ```
   (Con `NOWPAYMENTS_IPN_SECRET` configurado, el servidor ya envía `ipn_callback_url` al crear la factura.)
4. Rellena `.env`:
   ```bash
   NOWPAYMENTS_API_KEY=...
   NOWPAYMENTS_IPN_SECRET=...
   PUBLIC_URL=https://tudominio.com
   PAY_CURRENCY=usd
   PAY_AMOUNTS=5,10,25,50
   ```
5. Reinicia el servidor.

> 🔐 **Nunca** pegues la clave en el chat, en un issue o en el repositorio. Se pega solo en `.env` (local) o en las variables de entorno del hosting.

---

## 4. Probar sin gastar dinero

```bash
node tests/payments.test.js
```

Las pruebas levantan un **mock local de la API de NowPayments** y verifican: creación de factura con el importe correcto, validación de importes y métodos, rechazo de firma IPN falsa, aceptación de la firma válida, persistencia de la donación, bloqueo de `.env`/`/data` y degradación al modo gratuito sin claves.

Para probar el cobro real, usa la **sandbox** de NowPayments (o un importe mínimo) y luego revierte:

```bash
NOWPAYMENTS_API_BASE=https://api-sandbox.nowpayments.io/v1 npm run serve
```

---

## 5. Despliegue

El servidor es Node puro, así que funciona en cualquier hosting que ejecute `node server/server.js`:

| Hosting | Consideración |
| --- | --- |
| Vercel / Netlify Functions | Hay que adaptar `server.js` a funciones serverless (el `http.createServer` no aplica). |
| Railway / Render / Fly.io | Funciona tal cual: `npm run serve` y variables de entorno en el panel. |
| VPS propio | `node server/server.js` detrás de Nginx con HTTPS. |
| **GitHub Pages** | ❌ Solo estático: el juego funciona, pero **sin donaciones** (el botón queda oculto). |

Requisitos para producción:

- `PUBLIC_URL` con **HTTPS**.
- Webhook accesible públicamente (nada de `localhost`).
- Variables de entorno del hosting, **nunca** un `.env` commiteado.
- Copia de seguridad de `data/pagos.json` (o sustituirlo por una base de datos).

---

## 6. Protección de menores

- El botón está en el pie de página, **fuera del flujo de juego**: no interrumpe partidas ni presiona.
- El modal indica explícitamente **"Solo para personas adultas"** y que todo el contenido es jugable sin donar.
- No hay recompensas, ventajas ni contenido exclusivo por pagar: nada que incentive a un menor.
- No se solicitan datos personales en ningún punto del flujo.
- La donación es anónima: solo se guarda referencia, importe, moneda y estado.

---

## 7. Modelos descartados

| Modelo | Por qué no |
| --- | --- |
| **Monedas del juego con dinero real** | Incentiva el consumo en menores y exige cuentas y control parental. |
| **Suscripción con datos personales** | Obligaría a tratar datos de menores (RGPD/LOPDGDD) sin necesidad. |
| **Servidor MCP de NowPayments** | Es una caja negra sin código, sin webhooks y con un issue abierto de 404 en todas sus herramientas (ver [`analisis-nowpayments-mcp.md`](analisis-nowpayments-mcp.md)). |

Si en el futuro se quiere una versión premium, el diseño debe incluir cuentas, verificación por webhook y consentimiento adulto; no se recomienda para este público.

---

## 8. Checklist antes de publicar

- [ ] La clave filtrada (si la hubo) está **revocada** y sustituida.
- [ ] No hay secretos en el repositorio: `git log -p | grep -i "api.key"` sin resultados.
- [ ] `.env` está en `.gitignore` (ya incluido) y en el hosting se usan variables de entorno.
- [ ] `PUBLIC_URL` apunta al dominio real con HTTPS.
- [ ] El webhook `/api/ipn` es accesible desde internet y el secreto está configurado.
- [ ] Se probó una donación real de importe mínimo y el webhook la registró.
- [ ] El juego sigue siendo jugable sin pagar, sin conexión y sin el botón de apoyo.
