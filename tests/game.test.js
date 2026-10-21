/* Pruebas de la lógica del juego: node tests/game.test.js */
const assert = require('node:assert');
const Store = require('../assets/js/store.js');
const Game = require('../assets/js/game.js');

const nuevoEstado = () => {
  const s = Store.fresh();
  s.player = { name: 'Luna', avatar: '🧑‍🚀', ageGroup: 1 };
  return s;
};

function jugarSesion(state, opts, aciertos) {
  const session = Game.startSession(state, opts);
  let i = 0;
  while (!session.finished) {
    const q = Game.current(session);
    const correctIndex = q.options.findIndex((o) => o.correct);
    const elegir = i < aciertos ? correctIndex : q.options.findIndex((o, idx) => !o.correct && idx !== correctIndex);
    Game.answer(session, elegir, 5);
    i++;
    if (!Game.next(session)) break;
  }
  return Game.finish(state, session);
}

// 1. Sesión perfecta
let s = nuevoEstado();
let r = jugarSesion(s, { mode: 'mision', topicId: 'aritmetica', level: 1 }, 10);
assert.strictEqual(r.stars, 3, '10/10 debe dar 3 estrellas');
assert.strictEqual(r.correct, 10);
assert.strictEqual(r.percent, 100);
assert.ok(r.score > 1000, 'la puntuación debe acumular bonus');
assert.ok(s.xp > 0 && s.coins > 0, 'debe otorgar XP y monedas');
assert.strictEqual(Game.planetStars(s, 'aritmetica'), 3);
assert.ok(s.badges.includes('primera_mision'));
assert.ok(s.badges.includes('perfecta'));
assert.ok(r.leveledUp, '10 aciertos deben subir de nivel');
assert.strictEqual(Game.levelInfo(s.xp).level >= 2, true);

// 2. Repetir una misión no baja las estrellas
jugarSesion(s, { mode: 'mision', topicId: 'aritmetica', level: 1 }, 4);
assert.strictEqual(Game.planetStars(s, 'aritmetica'), 3, 'las estrellas solo mejoran');

// 3. Umbrales de estrellas
const casos = [[10, 3], [9, 3], [8, 2], [7, 2], [5, 1], [4, 0], [0, 0]];
casos.forEach(([aciertos, esperadas]) => {
  const st = nuevoEstado();
  const ses = Game.startSession(st, { mode: 'mision', topicId: 'fracciones', level: 2 });
  const res = jugarSesion(st, { mode: 'mision', topicId: 'fracciones', level: 2 }, aciertos);
  assert.strictEqual(res.stars, esperadas, `${aciertos}/10 debería dar ${esperadas} estrellas`);
});

// 4. Comodín 50/50
const s4 = nuevoEstado();
const ses4 = Game.startSession(s4, { mode: 'mision', topicId: 'algebra', level: 1 });
const eliminadas = Game.useFifty(ses4);
assert.strictEqual(eliminadas.length, 2);
eliminadas.forEach((i) => assert.strictEqual(Game.current(ses4).options[i].correct, false, 'solo se descartan incorrectas'));
assert.strictEqual(ses4.powerups.fifty, 1);
assert.strictEqual(Game.useFifty(ses4).length, 0, 'el 50/50 se usa una vez por pregunta');

// 5. Comodín de tiempo
const ses5 = Game.startSession(nuevoEstado(), { mode: 'mision', topicId: 'potencias', level: 3 });
const tiempoInicial = ses5.timeLeft;
assert.strictEqual(Game.addTime(ses5, 10), true);
assert.strictEqual(ses5.timeLeft, tiempoInicial + 10);
assert.strictEqual(ses5.powerups.time, 0);

// 6. Reto diario: se registra una sola vez
const s6 = nuevoEstado();
const d1 = jugarSesion(s6, { mode: 'diario' }, 8);
assert.strictEqual(d1.bonusCoins, 100);
assert.strictEqual(s6.daily.done, true);
assert.strictEqual(s6.daily.date, Game.todayKey());
const coinsDespues = s6.coins;
const d2 = jugarSesion(s6, { mode: 'diario' }, 2);
assert.strictEqual(d2.bonusCoins, 0, 'el bono diario no se repite el mismo día');
assert.ok(s6.coins > coinsDespues);

// 7. Núcleo Final bloqueado hasta 6 estrellas
const s7 = nuevoEstado();
assert.strictEqual(Game.bossUnlocked(s7), false);
['aritmetica', 'fracciones', 'porcentajes'].forEach((tema) => {
  jugarSesion(s7, { mode: 'mision', topicId: tema, level: 1 }, 9);
});
assert.strictEqual(Game.totalStars(s7), 9);
assert.strictEqual(Game.bossUnlocked(s7), true);
const jefe = jugarSesion(s7, { mode: 'jefe' }, 8);
assert.strictEqual(jefe.isBoss, true);
assert.strictEqual(jefe.stars, 3);
assert.strictEqual(Game.bossStars(s7), 3);
assert.ok(s7.badges.includes('jefe'));

// 8. Dificultad progresiva
const s8 = nuevoEstado();
assert.strictEqual(Game.difficultyFor(s8, 1), 1);
assert.strictEqual(Game.difficultyFor(s8, 3), 2, 'la órbita 3 sube la dificultad');
s8.player.ageGroup = 2;
assert.strictEqual(Game.difficultyFor(s8, 1), 2);

// 9. Preguntas sin repetir dentro de una sesión
const ses9 = Game.startSession(nuevoEstado(), { mode: 'blitz' });
const prompts = ses9.questions.map((q) => q.prompt);
assert.strictEqual(new Set(prompts).size, prompts.length, 'no debe repetir enunciados');
assert.strictEqual(ses9.totalTime, 60);
assert.strictEqual(ses9.timeLimit, 0, 'el contrarreloj usa tiempo total, no por pregunta');

// 10. Niveles de experiencia
assert.strictEqual(Game.levelInfo(0).level, 1);
assert.strictEqual(Game.levelInfo(700).level, 2);
assert.strictEqual(Game.levelInfo(800).level, 3);
assert.strictEqual(Game.levelInfo(2000).level, 4);
assert.ok(Game.levelInfo(5000).progress >= 0 && Game.levelInfo(5000).progress <= 100);

// 11. Persistencia (con localStorage simulado)
const memoria = {};
global.localStorage = {
  getItem: (k) => (k in memoria ? memoria[k] : null),
  setItem: (k, v) => { memoria[k] = String(v); },
  removeItem: (k) => { delete memoria[k]; }
};
const s11 = nuevoEstado();
s11.coins = 120;
assert.strictEqual(Store.save(s11), true);
const cargado = Store.load();
assert.strictEqual(cargado.coins, 120);
assert.strictEqual(cargado.player.name, 'Luna');
assert.strictEqual(Store.hasProfile(), true);
Store.clear();
assert.strictEqual(Store.load(), null);

console.log('✓ 11 grupos de pruebas de juego superados');
