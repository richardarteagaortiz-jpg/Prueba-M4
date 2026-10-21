# 🔎 Análisis · `NowPaymentsIO/nowpayments-mcp`

Revisión del repositorio <https://github.com/NowPaymentsIO/nowpayments-mcp> y de su servicio MCP alojado, hecha el **21 de octubre de 2026**.
Objetivo: decidir si sirve para integrar pagos en CosmoMates.

> **Veredicto corto:** ⚠️ **no recomendado para producción hoy.** El repositorio no contiene el servidor (solo documentación), las herramientas que ofrece no permiten confirmar pagos de forma segura y hay un reporte abierto de que el endpoint alojado responde **404 en todas las llamadas**. Para cobrar de verdad, usa la **API REST oficial o el SDK de Node con webhooks IPN**.

---

## 1. Qué es, según su propia documentación

Un **servidor MCP alojado** (no una librería) que envuelve la API de NOWPayments para que un agente de IA pueda crear cobros con "tool calls":

| Herramienta | Para qué sirve | Endpoint REST que envuelve* |
| --- | --- | --- |
| `get_full_currencies` | Lista de criptomonedas soportadas con metadatos | `GET /v1/full-currencies` |
| `get_min_amount` | Monto mínimo por par moneda/moneda (tasa fija y flotante) | `GET /v1/min-amount` |
| `create_invoice` | Crea una factura alojada y devuelve la URL de pago | `POST /v1/invoice` |
| `create_payment` | Pago directo: devuelve dirección, monto y datos para enviar fondos | `POST /v1/payment` |
| `get_payment_status` | Consulta el estado de un pago por `payment_id` | `GET /v1/payment/{id}` |

\* Correspondencia inferida a partir del reporte de error del issue #1 y de la API pública de NOWPayments.

**Autenticación:** la clave de API de NOWPayments se configura en el cliente MCP (cabecera `x-api-key`) y el servidor alojado la usa para hablar con la API.

---

## 2. Qué hay realmente en el repositorio

| Dato | Valor (verificado vía GitHub API) |
| --- | --- |
| Archivos | `README.md` y `LICENSE` **únicamente** |
| Tamaño | 12 KB |
| Commits | 6, **todos el mismo día** (29 abr 2026) |
| Releases / tags | 0 |
| Ramas | solo `main` |
| Issues / PRs | 1 issue abierto, 0 PRs |
| Estrellas / forks | 8 / 3 |
| Comunidad | `health_percentage` 42 %; sin `SECURITY.md`, sin `CONTRIBUTING`, sin código de conducta |
| Descripción del repo | "MCP server description for the NOWPayments API" |

**Consecuencias:**

- **No es código abierto de facto**: no hay fuente del servidor, ni `package.json`, ni Dockerfile, ni tests, ni configuración de ejemplo. La licencia MIT solo cubre el README y el LICENSE; **no** da derecho a auditar ni a autoalojar el servicio.
- **No hay alternativa local**: el paquete `@nowpayments/nowpayments-mcp` que mencionan los reportes **no existe** en npm (verificado: `HTTP 404` en `registry.npmjs.org`). Sí existen `nowpayments` (SDK oficial, 1.0.1) y varias librerías de la comunidad.
- Es, en la práctica, **una landing de documentación para un endpoint propietario**.

---

## 3. Estado del servicio: evidencia de que no está operativo

Hay un issue abierto (**#1**, 17 sep 2026, con un comentario del 7 oct 2026) que reporta:

- el endpoint `https://mcp.nowpayments.io/mcp` **conecta y anuncia las 5 herramientas**;
- **toda llamada a cualquiera de ellas falla** con una página HTML de Express: `Cannot GET /v1/full-currencies`, `Cannot GET /v1/payment/{id}`;
- **la misma clave funciona** en `https://api.nowpayments.io` (`/v1/status`, `/v1/currencies`, `/v1/payment/{id}` responden 200);
- el autor concluye que el proxy del MCP no está reenviando `/v1/*` al host real;
- **el mantenedor no ha respondido**: los únicos comentarios son de usuarios etiquetando a otros.

⚠️ **No pude verificarlo yo mismo**: desde este entorno la red solo permite salir a `github.com`, `registry.npmjs.org`, `pypi.org` y similares; `mcp.nowpayments.io` responde `HTTP 000`. Lo anterior es **reporte de terceros**, no una comprobación propia. Si quieres confirmarlo, prueba desde tu máquina con Cursor o Claude (ver §7).

---

## 4. Lo que falta para poder cobrar en serio

| Necesidad de producción | ¿El MCP lo cubre? | Nota |
| --- | --- | --- |
| Confirmar el pago de forma confiable | ❌ | No expone webhooks/IPN; solo `get_payment_status` (sondeo manual) |
| Verificar firma del webhook | ❌ | El SDK oficial sí: **HMAC SHA-512** con claves ordenadas |
| Idempotencia de creación | ❌ | Sin `order_id`/clave de idempotencia documentada |
| Reembolsos, payouts, saldos | ❌ | No hay herramientas para ello |
| Listar pagos históricos | ❌ | Solo por `payment_id` |
| Esquemas de entrada/salida y códigos de error | ❌ | El README describe las tools en prosa, sin contratos |
| Rate limits, SLA, versionado, política de datos | ❌ | No documentados |
| Confirmación humana antes de cobrar | ❌ | `create_payment`/`create_invoice` son una sola llamada |

Un checkout real **necesita** confirmación por webhook firmado: el `success_url` que ve el usuario es manipulable y no prueba que el pago exista.

---

## 5. Riesgos de seguridad y de diseño

1. **La clave se entrega a un tercero.** El servidor alojado recibe tu `x-api-key` y opera con ella: puede crear facturas y pagos en tu cuenta. Es una caja negra no auditable, sin política de datos publicada.
2. **Agente con autoridad de cobro.** Un LLM que puede llamar `create_invoice` sin límites de monto ni confirmación es vulnerable a *prompt injection*: contenido malicioso en una página o un correo podría provocar cobros. Los pagos deben vivir detrás de código determinista, no de un agente conversacional.
3. **Credenciales en el cliente.** El propio README pide configurar la clave en el cliente MCP; esa configuración puede acabar en capturas, historiales o logs del proveedor del LLM.
4. **Detalles descuidados en la documentación.** El enlace que publican es `http://` (sin TLS) y no hay aviso de seguridad ni de privacidad.
5. **Sin verificación de firma.** Al no usar IPN, cualquier confirmación basada solo en estas tools es susceptible de fraude por sondeo/estado manipulado en el flujo del cliente.

---

## 6. ¿Sirve para CosmoMates?

**No.** Tres razones independientes:

1. **Técnica:** el endpoint reporta 404 en todas las llamadas y no hay versión local; hoy no hay nada que integrar.
2. **De producto:** CosmoMates es un juego **gratuito, estático, sin cuentas ni datos personales**, para **10–15 años**. Un cobro en cripto introduce backend, cuentas, verificación de pagos y riesgos de consumo en menores. No hay ninguna necesidad de juego que lo justifique.
3. **Metodológica:** aunque el servicio funcionara, la clave no puede ir en el frontend (ver [`integracion-pagos.md`](integracion-pagos.md)); habría que montar backend + webhook igualmente, y entonces **el MCP sobra**.

**Si algún día quieres aceptar donaciones**, el camino correcto es:

```text
CosmoMates (estático) → backend mínimo propio → SDK oficial `nowpayments`
                                              → webhook IPN verificado (HMAC SHA-512)
```

---

## 7. Cómo comprobarlo tú mismo (sin exponer la clave)

1. Genera una clave **nueva y de solo pruebas** en el panel de NOWPayments.
2. Añade el servidor MCP en Cursor o Claude:
   - URL: `https://mcp.nowpayments.io/mcp`
   - Header: `x-api-key: <clave>`
3. Intenta `get_full_currencies`.
   - **Si devuelve `Cannot GET /v1/full-currencies`** → confirmas el issue #1.
   - **Si devuelve JSON** → el servicio ya está arreglado, pero siguen faltando webhooks para producción.
4. Compara con la API directa desde tu terminal:

```bash
curl -s -H "x-api-key: $NOWPAYMENTS_API_KEY" https://api.nowpayments.io/v1/status
curl -s -H "x-api-key: $NOWPAYMENTS_API_KEY" https://api.nowpayments.io/v1/currencies
```

5. Revoca la clave de prueba al terminar.

---

## 8. Conclusión

| Criterio | Valoración |
| --- | --- |
| ¿Es auditable? | ❌ Solo documentación, servidor propietario |
| ¿Es instalable/autoalojable? | ❌ No hay paquete ni fuente |
| ¿Está operativo? | ⚠️ Reporte abierto de 404 en todas las tools |
| ¿Permite cobrar de forma segura? | ❌ Sin webhooks/IPN ni verificación de firma |
| ¿Adecuado para un juego infantil? | ❌ No por diseño de producto |
| Utilidad real | 🟡 Demo de "pagos por chat"; **no** producción |

**Recomendación:** archivar esta vía. Para pagos, API REST/SDK oficial con IPN en un backend; para CosmoMates, seguir sin pagos (o donación opcional) y mantener el juego gratuito, sin cuentas y sin datos de menores.
