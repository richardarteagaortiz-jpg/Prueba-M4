# 🚀 CosmoMates

**Videojuego educativo de matemáticas para niños y niñas de 10 a 15 años.**
Pilota una nave por 8 planetas, resuelve retos matemáticos, aprende con explicaciones paso a paso y gana estrellas hasta desbloquear el **Núcleo Final**.

- 🎮 Juego completo en el navegador, **sin instalar nada y sin dependencias**.
- 🧠 **Más de 50 generadores** de preguntas: cada partida es distinta.
- 📱 Diseño responsive (móvil, tablet y computadora) y accesible con teclado.
- 🔒 Sin registro, sin anuncios, sin conexión a servidores: el progreso se guarda en el dispositivo.
- 🏫 Listo para usar en clase o en casa. Incluye [guía docente](docs/guia-docente.md).

---

## ▶️ Cómo jugar

**Opción 1 — abrir directamente:** descarga el repositorio y abre `index.html` en un navegador moderno.

**Opción 2 — servidor local** (recomendado):

```bash
# con Python
python3 -m http.server 8000

# o con Node
npx serve .
```

Abre <http://localhost:8000>.

1. Escribe tu nombre, elige un avatar y tu edad (10–12 o 13–15 años).
2. Elige un planeta en el mapa.
3. Completa las 3 órbitas de 10 retos. Cada respuesta muestra la explicación.
4. Consigue **6 estrellas** y se desbloquea el **Núcleo Final**.
5. Vuelve cada día para el **Reto diario** y usa tus monedas para desbloquear avatares.

### Atajos de teclado

| Tecla | Acción |
| --- | --- |
| `1` – `4` | Elegir una opción |
| `Enter` | Continuar después de responder |
| `Esc` | Cerrar ventanas |

---

## 🎯 Modos de juego

| Modo | Cómo funciona |
| --- | --- |
| **Misión (3 órbitas)** | 10 retos de un tema. La órbita 3 añade 30 s por pregunta y más dificultad. |
| **Núcleo Final** | 8 retos mezclados, 20 s por pregunta, sin comodines. Se desbloquea con 6 ⭐. |
| **Contrarreloj** | Preguntas mezcladas con 60 segundos en total. |
| **Reto diario** | 8 retos mixtos, una vez al día, con 100 monedas extra. |

### Estrellas y recompensas

| Aciertos (sobre 10) | Estrellas |
| --- | --- |
| 9 – 10 | ★★★ |
| 7 – 8 | ★★ |
| 5 – 6 | ★ |
| 0 – 4 | Repetir la misión |

- **Puntos:** 100 por acierto + bonus por racha + bonus por rapidez.
- **Monedas:** se ganan jugando y desbloquean 4 avatares en Ajustes.
- **Logros:** 12 insignias (primera misión, racha de 10, puntuación perfecta, explorador total…).
- **Comodines:** ✂️ descarta dos opciones incorrectas (2 usos) y ⏱️ suma 10 segundos (1 uso).

---

## 🪐 Contenido matemático

| Planeta | Tema | Qué se practica | Ejemplo |
| --- | --- | --- | --- |
| 🔢 Planeta Números | Aritmética | Sumas, restas, multiplicaciones, divisiones, orden de operaciones y problemas | `348 + 276`, `(6 + 4) × 3` |
| 🍕 Mundo Fracción | Fracciones | Sumar fracciones, fracción de una cantidad, equivalentes, simplificar y comparar | `3/4 de 48`, `1/2 = ?/8` |
| 💯 Estación Porcentaje | Porcentajes | Porcentajes, descuentos, IVA, proporciones y regla de tres | `20% de 80`, precio con descuento |
| ⚡ Reactor Potencia | Potencias y raíces | Cuadrados, cubos, raíces, potencias de 10 y propiedades | `12²`, `√144`, `10³` |
| 🧮 Nebulosa Álgebra | Álgebra | Ecuaciones de primer grado, valor numérico, simplificación y secuencias | `3x + 5 = 20` |
| 📐 Geometría Estelar | Geometría | Áreas, perímetros, ángulos, círculo y volumen | área de triángulo, ángulos suplementarios |
| 🧠 Cinturón Lógico | Lógica y números | Patrones, MCD y MCM, deducciones, paridad y días de la semana | MCM(4, 6), sucesión de Fibonacci |
| 📊 Observatorio de Datos | Estadística | Media, mediana, moda, rango y probabilidad | media de 4 datos, probabilidad con fracciones |

Cada tema tiene **dos niveles de dificultad** ligados a la edad elegida:

- **10–12 años:** números más pequeños, una operación por paso.
- **13–15 años:** números mayores, varios pasos y expresiones algebraicas.
- La **órbita 3** de cada planeta siempre usa la dificultad alta, como reto extra.

Las preguntas se generan al azar, así que **nunca se acaban**: se pueden repetir misiones sin memorizar respuestas.

---

## ♿ Accesibilidad y diseño pedagógico

- Navegación completa con teclado y foco visible.
- Enunciados y explicaciones con etiquetas semánticas; resultados anunciados con `aria-live`.
- Botones con etiquetas descriptivas y buen contraste de color.
- Respeta `prefers-reduced-motion` (desactiva animaciones y confeti).
- **El error es parte del aprendizaje:** después de cada respuesta se muestra el procedimiento, no solo la solución.
- Refuerzo positivo, sin vidas ni castigos; repetir es siempre una opción.
- Sin anuncios, sin recolección de datos y sin enlaces externos.

---

## 🧱 Estructura del proyecto

```
.
├── index.html               # Estructura de las 4 pantallas y ventanas modales
├── assets/
│   ├── css/styles.css       # Tema espacial, responsive y accesible
│   ├── js/questions.js      # Motor de preguntas (55 generadores, 2 dificultades)
│   ├── js/game.js           # Planetas, niveles, puntuación, estrellas, logros
│   ├── js/store.js          # Guardado en localStorage
│   ├── js/app.js            # Interfaz, temporizadores, sonido y confeti
│   └── img/favicon.svg
├── tests/
│   ├── questions.test.js    # Valida miles de preguntas generadas
│   └── game.test.js         # Pruebas de la lógica del juego
└── docs/guia-docente.md     # Uso en el aula y objetivos de aprendizaje
```

El juego usa **JavaScript clásico (sin frameworks ni build)**. Se puede abrir `index.html` directamente o publicarlo en cualquier hosting estático.

### Datos guardados

Todo el progreso se guarda en `localStorage` bajo la clave `cosmomates.v1`:
nombre, avatar, edad, XP, monedas, estrellas por planeta, logros, estadísticas, sonido y reto diario.
No se envía nada a ningún servidor. Se puede borrar desde **Ajustes → Borrar todo el progreso**.

---

## ✅ Pruebas

No requieren instalar dependencias:

```bash
npm test
# o directamente:
node tests/questions.test.js
node tests/game.test.js
```

- `questions.test.js` genera **10.200 preguntas** y comprueba que todas tengan 4 opciones únicas, exactamente una correcta, sin valores inválidos y con explicación.
- `game.test.js` cubre estrellas, recompensas, comodines, reto diario, desbloqueo del núcleo, niveles de XP y persistencia.

---

## ✏️ Personalizar el contenido

Para añadir un tipo de pregunta, edita el arreglo del tema en `assets/js/questions.js`:

```js
const porcentajes = [
  // ...
  (dificultad) => {
    const precio = 100;
    const descuento = 20;
    return numQ(
      'porcentajes',
      `Un libro cuesta $${precio} y tiene <b>${descuento}% de descuento</b>. ¿Cuánto pagas?`,
      precio - (precio * descuento) / 100,
      `Descuento: ${precio} × ${descuento} ÷ 100 = 20. Pagas 100 − 20 = <b>80</b>.`,
      [descuento, precio]
    );
  }
];
```

`numQ` recibe: tema, enunciado, respuesta, explicación y respuestas incorrectas plausibles; completa solo las opciones que falten y las mezcla. Para respuestas en forma de fracción usa `fracQ`, y para texto libre, `textQ`.

---

## 🌐 Publicar en GitHub Pages

1. Sube el proyecto a GitHub.
2. Ve a **Settings → Pages**.
3. En *Build and deployment*, elige **Deploy from a branch** → `main` → `/ (root)`.
4. Guarda y espera unos segundos: el juego quedará en `https://<usuario>.github.io/<repositorio>/`.

---

## 📚 Documentación

- [`docs/guia-docente.md`](docs/guia-docente.md): objetivos de aprendizaje por planeta, ideas para clase, criterios de evaluación y accesibilidad.
- [`docs/integracion-pagos.md`](docs/integracion-pagos.md): cómo añadir donaciones o una versión premium **sin exponer credenciales** y protegiendo a los menores.
- [`docs/analisis-nowpayments-mcp.md`](docs/analisis-nowpayments-mcp.md): análisis del servidor MCP de NowPayments y por qué **no** se usa en este proyecto.

> 🔐 Este proyecto no contiene claves ni secretos. Si en el futuro se integra una pasarela de pagos, la clave debe vivir en el backend (variable de entorno) y `.env` ya está excluido en `.gitignore`.

---

## 📄 Licencia

[MIT](LICENSE) · Recurso educativo abierto: puedes usarlo, adaptarlo y compartirlo citando el proyecto.

Hecho con cariño para que aprender matemáticas se sienta como explorar la galaxia. 🌌
