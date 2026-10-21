# 💳 Integración de pagos (NowPayments) — guía segura

CosmoMates es hoy un juego **100 % estático y gratuito**: no tiene cuentas, no recoge datos y no habla con ningún servidor. Cualquier cobro real rompe esa propiedad, así que esta guía explica **cómo hacerlo sin exponer credenciales ni a los estudiantes**.

> ⚠️ **Regla de oro:** la API key de un proveedor de pagos es un secreto de servidor. **Nunca** se escribe en HTML, JavaScript del navegador, `localStorage`, ni se sube al repositorio. Si una clave se comparte por chat, correo o un commit, se considera **comprometida** y hay que revocarla y generar otra.

---

## 1. Por qué no puede ir en el frontend

Todo archivo de `assets/js/` se descarga al navegador del estudiante. Si la clave viajara ahí:

- cualquiera podría leerla con la pestaña *Network* o *View Source*;
- permitiría consultar pagos, crear facturas o cambiar ajustes de tu cuenta;
- quedaría guardada en cachés y en copias del repo.

Por eso NowPayments y cualquier pasarela piden la clave solo desde un **backend** que la lea de una variable de entorno.

---

## 2. Arquitectura recomendada

```
Navegador (CosmoMates)                Backend mínimo (Node/Python)          NowPayments
──────────────────────                ────────────────────────────          ───────────
botón "Apoyar el proyecto"  ──POST──▶ /api/donacion
                                       usa NOWPAYMENTS_API_KEY  ──────────▶ crea el pago
                       ◀──URL de pago──
redirige a la pasarela  ──────────────────────────────────────────────────▶ checkout
                                       webhook /api/webhook  ◀──────────── factura pagada
                                       verifica firma IPN
                                       marca el pago como confirmado
```

Puntos clave:

1. **La clave vive solo en el backend**, en una variable de entorno:
   ```bash
   # .env (ignorado por git, ver .gitignore)
   NOWPAYMENTS_API_KEY=tu_clave_privada
   NOWPAYMENTS_IPN_SECRET=tu_secreto_ipn
   ```
2. El frontend solo conoce **endpoints propios** (`/api/donacion`), nunca la URL ni la clave del proveedor.
3. El backend **valida el monto y la moneda** que envía el cliente: nunca confíes en un importe que llega del navegador.
4. La confirmación de pago se hace **solo por webhook firmado** (IPN), no por el regreso del usuario a la página (`success_url` es manipulable).
5. La entrega del beneficio (por ejemplo, un código de desbloqueo) se hace después de verificar el webhook.

### Esqueleto de backend (sin claves, solo el patrón)

```js
// server.js — ejemplo ilustrativo, NO incluye credenciales
import express from 'express';
const app = express();
app.use(express.json());

app.post('/api/donacion', async (req, res) => {
  const monto = 5;                       // el servidor decide el precio
  const moneda = 'usd';
  const r = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      price_amount: monto,
      price_currency: moneda,
      order_description: 'Apoyo a CosmoMates',
      success_url: 'https://tudominio/apoyo/gracias',
      cancel_url: 'https://tudominio/apoyo/cancelado'
    })
  });
  if (!r.ok) return res.status(502).json({ error: 'No se pudo crear el pago' });
  const data = await r.json();
  res.json({ url: data.invoice_url });
});

app.listen(process.env.PORT || 3000);
```

En el juego, el botón solo haría:

```js
const r = await fetch('/api/donacion', { method: 'POST' });
const { url } = await r.json();
window.location.href = url;
```

---

## 3. Modelos posibles y su impacto

| Modelo | Qué requiere | Impacto en el juego |
| --- | --- | --- |
| **Donación voluntaria** | Backend mínimo + enlace de pago | Ninguno: el juego sigue gratuito e igual para todos. **Opción recomendada.** |
| **Versión premium** (planetas extra) | Backend + cuentas + verificación de compra | Hay que crear cuentas, lo que implica datos personales de menores. |
| **Monedas del juego con dinero real** | Backend + cuentas + control parental | **No recomendado** para 10–15 años: riesgo legal y de consumo. |

CosmoMates no pide edad ni datos personales; mantener ese diseño es también lo que lo hace seguro para un aula.

---

## 4. Protección de menores

- No mostrar publicidad ni solicitar datos personales para jugar.
- Si se habilita cualquier cobro, dejarlo **detrás de una acción adulta** ("Esta sección es para personas adultas") y sin incentivos dentro del juego.
- No usar patrones de presión (temporizadores, "última oportunidad", recompensas exclusivas) con público infantil.
- Ofrecer siempre un enlace a la versión gratuita completa.

---

## 5. Checklist antes de publicar

- [ ] La clave está **revocada y regenerada** si alguna vez se compartió por chat o commit.
- [ ] No hay secretos en el repositorio (`git log -p | grep -i "api.key"` sin resultados).
- [ ] `.env` está en `.gitignore` y los secretos viven en el panel de variables del hosting.
- [ ] El monto lo decide el servidor, no el navegador.
- [ ] El pago se confirma **solo** por webhook firmado.
- [ ] El backend usa HTTPS y limita peticiones.
- [ ] El juego sigue siendo jugable sin pagar y sin conexión.
