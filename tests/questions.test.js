/* Pruebas del motor de preguntas: node tests/questions.test.js */
const assert = require('node:assert');
const MQ = require('../assets/js/questions.js');

const TEMAS = Object.keys(MQ.TOPICS);
let total = 0;
let fallos = 0;

function revisar(q, contexto) {
  total++;
  const errores = [];
  if (!q.prompt || q.prompt.length < 5) errores.push('enunciado vacío');
  if (!q.explanation || q.explanation.length < 10) errores.push('explicación vacía');
  if (!Array.isArray(q.options) || q.options.length !== 4) errores.push('no hay 4 opciones');
  const textos = q.options.map((o) => o.text);
  if (new Set(textos).size !== textos.length) errores.push('opciones duplicadas: ' + textos.join(' | '));
  const correctas = q.options.filter((o) => o.correct);
  if (correctas.length !== 1) errores.push('cantidad de correctas = ' + correctas.length);
  if (textos.some((t) => t === '' || t === 'NaN' || t === 'undefined' || /Infinity/.test(t))) {
    errores.push('texto inválido: ' + textos.join(' | '));
  }
  if (q.options.some((o) => typeof o.correct !== 'boolean')) errores.push('flag correct inválido');
  if (errores.length) {
    fallos++;
    if (fallos <= 8) {
      console.error(`✗ [${contexto}] ${q.prompt}\n  → ${errores.join(' / ')}\n  opciones: ${textos.join(' | ')}`);
    }
  }
}

for (const tema of TEMAS) {
  for (let d = 1; d <= 2; d++) {
    for (let i = 0; i < 600; i++) {
      revisar(MQ.generate(tema, d), `${tema} d${d}`);
    }
  }
}

for (let i = 0; i < 600; i++) revisar(MQ.generateMixed(i % 2 ? 2 : 1), 'mixto');

// Comprobaciones puntuales de contenido
const suma = MQ.generate('aritmetica', 1);
assert.ok(suma.prompt.length > 5 && suma.options.length === 4, 'la pregunta debe traer enunciado y 4 opciones');
assert.ok(['aritmetica', 'fracciones', 'porcentajes', 'potencias', 'algebra', 'geometria', 'logica', 'estadistica'].includes(suma.topic));
assert.ok(suma.topicName && suma.icon && /^#/.test(suma.color), 'la pregunta debe traer metadatos del tema');
assert.strictEqual(typeof suma.difficulty, 'number');
assert.ok(MQ._internals.gcd(12, 18) === 6);
assert.ok(MQ._internals.lcm(4, 6) === 12);
assert.ok(MQ._internals.fmt(1.5) === '1,5');
assert.throws(() => MQ.generate('no-existe', 1), /Tema desconocido/);

console.log(`\n${total} preguntas revisadas · ${fallos} inválidas`);
if (fallos > 0) process.exit(1);
console.log('✓ Todas las preguntas son válidas (4 opciones únicas, 1 correcta, con explicación).');
