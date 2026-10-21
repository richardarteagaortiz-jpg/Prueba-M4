# 👩‍🏫 Guía docente · CosmoMates

Guía breve para usar **CosmoMates** en el aula con estudiantes de **10 a 15 años**.
El juego está pensado para sesiones de 15 a 30 minutos, en computadora, tablet o proyector.

---

## 1. Qué es y qué no es

CosmoMates es un **juego de práctica y refuerzo** de matemáticas. No sustituye la enseñanza de un concepto nuevo: sirve para automatizar procedimientos, detectar errores frecuentes y ganar confianza.

- **Fortalece:** cálculo, fracciones, porcentajes, potencias, álgebra inicial, geometría, lógica y estadística.
- **No incluye:** teoría previa ni exámenes. Cada respuesta se explica paso a paso.
- **Privacidad:** no hay cuentas ni servidores. El progreso queda en el navegador del dispositivo.

---

## 2. Objetivos de aprendizaje por planeta

| Planeta | Objetivos | Errores frecuentes que ayuda a detectar |
| --- | --- | --- |
| 🔢 Números | Resolver operaciones con números naturales y aplicar el orden de operaciones. | Sumar antes de multiplicar; olvidar el paréntesis; errores de resta con llevadas. |
| 🍕 Fracciones | Sumar fracciones, obtener una fracción de una cantidad, simplificar y comparar. | Sumar numeradores y denominadores; no simplificar; comparar por el numerador sin mirar el denominador. |
| 💯 Porcentajes | Calcular porcentajes, descuentos y aumentos; usar la regla de tres. | Confundir el porcentaje con el valor; restar el porcentaje al número sin dividir entre 100. |
| ⚡ Potencias | Calcular cuadrados, cubos y raíces; aplicar propiedades de potencias. | Multiplicar la base por el exponente (`3² = 6`); confundir raíz con dividir entre 2. |
| 🧮 Álgebra | Resolver ecuaciones de primer grado y evaluar expresiones. | Cambiar de lado sin cambiar la operación; no dividir ambos miembros. |
| 📐 Geometría | Calcular áreas, perímetros, ángulos y volúmenes. | Confundir área con perímetro; olvidar dividir entre 2 en el triángulo; mezclar unidades. |
| 🧠 Lógica | Reconocer patrones, calcular MCD/MCM y razonar con deducciones. | Confundir múltiplo con divisor; no comprobar la regularidad de la secuencia. |
| 📊 Datos | Calcular media, mediana, moda y rango; estimar probabilidad. | Confundir media con mediana; no ordenar los datos; probabilidad mayor que 1. |

---

## 3. Cómo interpretar el progreso

- **Estrellas por órbita:** 5–6 aciertos = ⭐; 7–8 = ⭐⭐; 9–10 = ⭐⭐⭐.
- **Planeta completo:** 9 estrellas (tres órbitas).
- **Núcleo Final:** se desbloquea con 6 estrellas acumuladas; exige 5 de 8 aciertos para superarlo.
- El HUD muestra **nivel, rango, estrellas totales, monedas y porcentaje de acierto histórico**.

Sugerencia de lectura:

| Señal | Interpretación | Acción sugerida |
| --- | --- | --- |
| 3 estrellas en la órbita 1 | Domina lo básico | Avanzar a la órbita 2 |
| 1–2 estrellas | Procedimiento inestable | Repetir y revisar las explicaciones |
| 0 estrellas | Necesita apoyo previo | Trabajar el concepto en pizarra antes de reintentar |
| Precisión global menor al 60% | Posible desajuste de dificultad | Cambiar la edad en Ajustes (10–12 ↔ 13–15) |

El progreso se conserva en el navegador. Para reiniciarlo: **Ajustes → Borrar todo el progreso**.

---

## 4. Ideas para la clase

### A. Exploración libre (15 min)
Cada estudiante elige un planeta y juega la órbita 1. Al finalizar, comparte en parejas **una explicación que le haya sorprendido**.

### B. Estaciones rotativas (30 min)
Divide la clase en tres grupos y asigna un planeta a cada estación (por ejemplo: fracciones, porcentajes y geometría). Cada 8 minutos rotan. Al cierre, cada grupo enseña al resto un error frecuente que detectó.

### C. Reto cooperativo
Proyecta el **Núcleo Final** y resuelvan las preguntas en plenaria. Antes de responder, un estudiante explica el procedimiento en voz alta. Sin comodines: el objetivo es argumentar.

### D. Contrarreloj como cierre
Usa **Contrarreloj** (60 s) en los últimos minutos. Comparar marcas personales fomenta la fluidez de cálculo sin exponer notas.

### E. Reto diario como tarea
Pide completar el **Reto diario** (8 preguntas mixtas) y anotar en el cuaderno una explicación completa de una pregunta resuelta.

---

## 5. Evaluación sugerida

| Criterio | Indicador observable | Instrumento |
| --- | --- | --- |
| Fluidez de cálculo | Aciertos en Contrarreloj y órbitas sin reloj | Registro del HUD |
| Comprensión conceptual | Explica el procedimiento después de responder | Observación / cuaderno |
| Autonomía | Repite misiones y usa comodines con criterio | Observación |
| Perseverancia | Vuelve tras una misión fallida | Estrellas por planeta |

La precisión global y las estrellas no deberían usarse como calificación sumativa: son información formativa y pueden depender de la edad configurada.

---

## 6. Atención a la diversidad

- Configura la **edad** en Ajustes: cambia el tamaño de los números y la complejidad, no el contenido.
- Las misiones no tienen límite de tiempo; solo la órbita 3 y el jefe lo tienen.
- Los comodines reducen la ansiedad ante el error.
- El juego funciona con **teclado** (`1`–`4`, `Enter`, `Esc`) y respeta `prefers-reduced-motion`.
- Se recomienda acompañar a estudiantes con dificultades lectoras leyendo el enunciado en voz alta: los textos son cortos y directos.

---

## 7. Adaptar el contenido

Los enunciados y números viven en `assets/js/questions.js`. Cada tema es un arreglo de generadores. Para cambiar el rango numérico o redactar problemas con nombres del grupo, edita esos generadores (hay ejemplos comentados en el README del repositorio). Los cambios no requieren compilar nada.

Para comprobar que tus cambios no rompen las opciones, ejecuta:

```bash
node tests/questions.test.js
```

---

## 8. Ficha técnica

- **Edad recomendada:** 10 a 15 años.
- **Duración de una sesión:** 10–30 minutos.
- **Dispositivos:** navegador moderno en computadora, tablet o teléfono.
- **Requisitos:** ninguno; no usa cuentas ni conexión después de cargar la página.
- **Idioma:** español.
- **Licencia:** MIT.
