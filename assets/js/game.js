/* =========================================================================
   CosmoMates · Núcleo del juego
   Planetas, niveles, puntuación, estrellas, logros y recompensas.
   Independiente del DOM para poder probarlo con Node.
   ========================================================================= */
(function (global) {
  'use strict';

  const MQ = (typeof require !== 'undefined' && typeof module !== 'undefined')
    ? require('./questions.js')
    : global.MQ;

  /* ------------------------------- planetas -------------------------------- */

  const PLANETS = [
    {
      id: 'aritmetica', name: 'Planeta Números', emoji: '🔢', color: '#38bdf8',
      desc: 'Operaciones, cálculos mentales y problemas del día a día.',
      skills: ['Sumas y restas', 'Multiplicaciones', 'Divisiones', 'Orden de operaciones']
    },
    {
      id: 'fracciones', name: 'Mundo Fracción', emoji: '🍕', color: '#f472b6',
      desc: 'Partes de un todo, fracciones equivalentes y comparaciones.',
      skills: ['Sumar fracciones', 'Fracciones de una cantidad', 'Simplificar', 'Comparar']
    },
    {
      id: 'porcentajes', name: 'Estación Porcentaje', emoji: '💯', color: '#fbbf24',
      desc: 'Descuentos, IVA, proporciones y regla de tres.',
      skills: ['Calcular %', 'Descuentos', 'Aumentos', 'Proporciones']
    },
    {
      id: 'potencias', name: 'Reactor Potencia', emoji: '⚡', color: '#a78bfa',
      desc: 'Potencias, raíces cuadradas y notación científica.',
      skills: ['Cuadrados', 'Cubos', 'Raíz cuadrada', 'Propiedades']
    },
    {
      id: 'algebra', name: 'Nebulosa Álgebra', emoji: '🧮', color: '#34d399',
      desc: 'Ecuaciones, incógnitas y patrones numéricos.',
      skills: ['Ecuaciones', 'Valor numérico', 'Simplificar', 'Secuencias']
    },
    {
      id: 'geometria', name: 'Geometría Estelar', emoji: '📐', color: '#fb7185',
      desc: 'Áreas, perímetros, ángulos y volúmenes.',
      skills: ['Áreas', 'Perímetros', 'Ángulos', 'Volúmenes']
    },
    {
      id: 'logica', name: 'Cinturón Lógico', emoji: '🧠', color: '#22d3ee',
      desc: 'Patrones, MCD y MCM, días de la semana y razonamiento.',
      skills: ['Patrones', 'MCD y MCM', 'Deducciones', 'Paridad']
    },
    {
      id: 'estadistica', name: 'Observatorio de Datos', emoji: '📊', color: '#f59e0b',
      desc: 'Media, mediana, moda, rango y probabilidad.',
      skills: ['Media', 'Mediana y moda', 'Rango', 'Probabilidad']
    }
  ];

  const LEVELS = [
    { id: 1, name: 'Órbita 1 · Despegue', count: 10, timer: 0, desc: '10 retos sin reloj' },
    { id: 2, name: 'Órbita 2 · Exploración', count: 10, timer: 0, desc: '10 retos sin reloj' },
    { id: 3, name: 'Órbita 3 · Maestría', count: 10, timer: 30, desc: '10 retos · 30 s por pregunta' }
  ];

  const BOSS = { id: 'boss', name: 'Núcleo Final', count: 8, timer: 20, desc: '8 retos mezclados · 20 s por pregunta' };

  const AVATARS_FREE = ['🧑‍🚀', '👩‍🚀', '🤖', '👽', '🦊', '🐼', '🐙', '🦖'];
  const AVATARS_SHOP = [
    { emoji: '🦄', price: 250, name: 'Unicornio cósmico' },
    { emoji: '🐉', price: 400, name: 'Dragón estelar' },
    { emoji: '👾', price: 300, name: 'Alien arcade' },
    { emoji: '🦉', price: 350, name: 'Búho sabio' }
  ];

  const RANKS = ['Cadete', 'Piloto', 'Navegante', 'Explorador', 'Capitán', 'Comandante', 'Maestro estelar', 'Leyenda galáctica'];
  const THRESHOLDS = [0, 250, 800, 1600, 3000, 4800, 7200, 10000, 13500, 17500, 22000, 28000, 35000, 43000, 53000];

  /* -------------------------------- logros --------------------------------- */

  const BADGES = [
    { id: 'primera_mision', icon: '🚀', name: 'Primer vuelo', desc: 'Completa tu primera misión.', check: (s) => s.stats.missions >= 1 },
    { id: 'perfecta', icon: '💯', name: 'Puntuación perfecta', desc: 'Acierta todas las preguntas de una misión o del Núcleo.', check: (s, c) => (c.mode === 'mision' || c.mode === 'jefe') && c.total >= 8 && c.correct === c.total },
    { id: 'racha5', icon: '🔥', name: 'Racha de 5', desc: 'Consigue 5 aciertos seguidos.', check: (s) => s.stats.bestStreak >= 5 },
    { id: 'racha10', icon: '☄️', name: 'Racha de 10', desc: 'Consigue 10 aciertos seguidos.', check: (s) => s.stats.bestStreak >= 10 },
    { id: 'estrellas10', icon: '🌟', name: 'Coleccionista', desc: 'Reúne 10 estrellas.', check: (s) => totalStars(s) >= 10 },
    { id: 'estrellas25', icon: '🌠', name: 'Constelación', desc: 'Reúne 25 estrellas.', check: (s) => totalStars(s) >= 25 },
    { id: 'jefe', icon: '👑', name: 'Vencedor del Núcleo', desc: 'Supera el Núcleo Final.', check: (s, c) => c.isBoss && c.stars > 0 },
    { id: 'cien', icon: '🧠', name: 'Cien aciertos', desc: 'Acumula 100 respuestas correctas.', check: (s) => s.stats.correct >= 100 },
    { id: 'veloz', icon: '⚡', name: 'Mente veloz', desc: 'Acierta 5 preguntas en menos de 6 segundos.', check: (s) => s.stats.fastCorrect >= 5 },
    { id: 'diario', icon: '🎁', name: 'Rutina estelar', desc: 'Completa un reto diario.', check: (s, c) => c.mode === 'diario' },
    { id: 'explorador', icon: '🪐', name: 'Explorador total', desc: 'Gana 1 estrella en los 8 planetas.', check: (s) => PLANETS.every((p) => planetStars(s, p.id) > 0) },
    { id: 'rico', icon: '💰', name: 'Ahorrador galáctico', desc: 'Reúne 500 monedas.', check: (s) => s.coins >= 500 }
  ];

  /* ------------------------------ utilidades ------------------------------- */

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function todayKey(date) {
    const d = date || new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function planetData(state, topicId) {
    if (!state.planets) state.planets = {};
    if (!state.planets[topicId]) state.planets[topicId] = { levels: {}, boss: 0 };
    if (!state.planets[topicId].levels) state.planets[topicId].levels = {};
    return state.planets[topicId];
  }

  function planetStars(state, topicId) {
    const data = state.planets && state.planets[topicId];
    if (!data) return 0;
    const levels = data.levels || {};
    return LEVELS.reduce((sum, lvl) => sum + (Number(levels[lvl.id]) || 0), 0);
  }

  function totalStars(state) {
    return PLANETS.reduce((sum, p) => sum + planetStars(state, p.id), 0);
  }

  function bossStars(state) {
    return Number(state.planets && state.planets.__nucleo__ && state.planets.__nucleo__.boss) || 0;
  }

  function allStars(state) {
    return totalStars(state) + bossStars(state);
  }

  function bossUnlocked(state) {
    return totalStars(state) >= 6;
  }

  function levelInfo(xp) {
    let level = 1;
    for (let i = 1; i < THRESHOLDS.length; i++) {
      if (xp >= THRESHOLDS[i]) level = i + 1;
    }
    const floor = THRESHOLDS[level - 1];
    const next = THRESHOLDS[level] || floor + 12000 + level * 2000;
    const progress = clamp(Math.round(((xp - floor) / (next - floor)) * 100), 0, 100);
    return {
      level,
      floor,
      next,
      progress,
      rank: RANKS[Math.min(level - 1, RANKS.length - 1)],
      inLevel: xp - floor,
      needed: next - floor
    };
  }

  function difficultyFor(state, level) {
    const base = state.player.ageGroup === 2 ? 2 : 1;
    return level === 3 ? 2 : base;
  }

  function buildQuestions(session, count, topicId, difficulty) {
    const questions = [];
    const usados = new Set();
    let intentos = 0;
    while (questions.length < count && intentos < count * 25) {
      intentos++;
      const q = session.mode === 'mision' && topicId
        ? MQ.generate(topicId, difficulty)
        : MQ.generateMixed(difficulty);
      if (usados.has(q.prompt)) continue;
      usados.add(q.prompt);
      questions.push(q);
    }
    while (questions.length < count) {
      questions.push(session.mode === 'mision' && topicId
        ? MQ.generate(topicId, difficulty)
        : MQ.generateMixed(difficulty));
    }
    return questions;
  }

  /* -------------------------------- sesión --------------------------------- */

  /**
   * Crea una sesión de juego.
   * @param {object} state estado del jugador
   * @param {object} opts { mode, topicId, level }
   */
  function startSession(state, opts) {
    opts = opts || {};
    const mode = opts.mode || 'mision';
    const topicId = opts.topicId || null;
    const planet = PLANETS.find((p) => p.id === topicId);

    let title = 'Misión';
    let count = 10;
    let timer = 0;
    let difficulty = state.player.ageGroup === 2 ? 2 : 1;
    let powerups = { fifty: 2, time: 1 };
    let level = opts.level || 1;
    let totalTime = 0;

    if (mode === 'mision') {
      const cfg = LEVELS.find((l) => l.id === level) || LEVELS[0];
      title = planet ? planet.name : 'Misión';
      count = cfg.count;
      timer = cfg.timer;
      difficulty = difficultyFor(state, level);
    } else if (mode === 'jefe') {
      title = 'Núcleo Final';
      count = BOSS.count;
      timer = BOSS.timer;
      difficulty = 2;
      powerups = { fifty: 0, time: 0 };
      level = 'boss';
    } else if (mode === 'blitz') {
      title = 'Contrarreloj';
      count = 25;
      totalTime = 60;
      difficulty = state.player.ageGroup === 2 ? 2 : 1;
      powerups = { fifty: 1, time: 0 };
      level = 'blitz';
    } else if (mode === 'diario') {
      title = 'Reto diario';
      count = 8;
      difficulty = state.player.ageGroup === 2 ? 2 : 1;
      powerups = { fifty: 1, time: 1 };
      level = 'diario';
    }

    const questions = buildQuestions({ mode }, count, topicId, difficulty);

    const session = {
      mode,
      topicId,
      planetName: planet ? planet.name : null,
      planetColor: planet ? planet.color : '#a78bfa',
      title,
      level,
      difficulty,
      questions,
      index: 0,
      answeredCount: 0,
      correctCount: 0,
      wrongCount: 0,
      streak: 0,
      maxStreak: 0,
      score: 0,
      timeLimit: timer,
      timeLeft: timer,
      totalTime,
      totalTimeLeft: totalTime,
      powerups,
      fiftyUsed: false,
      answered: false,
      finished: false,
      fastCorrect: 0,
      secondsUsed: 0,
      lastAnswer: null,
      startedAt: Date.now()
    };
    return session;
  }

  function current(session) {
    return session.questions[session.index] || null;
  }

  /** Añade segundos al temporizador activo. */
  function addTime(session, seconds) {
    if (session.powerups.time <= 0) return false;
    if (session.timeLimit > 0) {
      session.timeLeft += seconds;
    } else if (session.totalTime > 0) {
      session.totalTimeLeft += seconds;
    } else {
      return false;
    }
    session.powerups.time -= 1;
    return true;
  }

  /** Comodín 50/50: descarta dos opciones incorrectas. */
  function useFifty(session) {
    if (session.powerups.fifty <= 0 || session.fiftyUsed || session.answered) return [];
    const q = current(session);
    if (!q) return [];
    const wrongs = [];
    q.options.forEach((opt, i) => { if (!opt.correct) wrongs.push(i); });
    for (let i = wrongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = wrongs[i]; wrongs[i] = wrongs[j]; wrongs[j] = tmp;
    }
    session.powerups.fifty -= 1;
    session.fiftyUsed = true;
    return wrongs.slice(0, 2);
  }

  /**
   * Responde la pregunta actual.
   * @param {object} session
   * @param {number|null} optionIndex null = se acabó el tiempo
   * @param {number} secondsUsed segundos empleados
   */
  function answer(session, optionIndex, secondsUsed) {
    if (session.finished) return null;
    if (session.answered) return session.lastAnswer;
    const q = current(session);
    if (!q) return null;

    const selected = (optionIndex === null || optionIndex === undefined) ? null : q.options[optionIndex];
    const correct = Boolean(selected && selected.correct);
    const seconds = Number(secondsUsed) || 0;
    const correctIndex = q.options.findIndex((o) => o.correct);

    session.answered = true;
    session.answeredCount += 1;
    session.secondsUsed = seconds;

    let points = 0;
    if (correct) {
      session.correctCount += 1;
      session.streak += 1;
      session.maxStreak = Math.max(session.maxStreak, session.streak);
      const streakBonus = Math.min(session.streak * 15, 75);
      const speedBonus = session.timeLimit > 0 ? Math.max(0, Math.round((session.timeLimit - seconds) * 4)) : 0;
      points = 100 + streakBonus + speedBonus;
      if (session.timeLimit > 0 && seconds <= 6) session.fastCorrect += 1;
    } else {
      session.streak = 0;
      session.wrongCount += 1;
    }
    session.score += points;

    session.lastAnswer = {
      correct,
      correctIndex,
      selectedIndex: optionIndex === null || optionIndex === undefined ? null : optionIndex,
      explanation: q.explanation,
      points,
      streak: session.streak,
      timedOut: selected === null
    };
    return session.lastAnswer;
  }

  function next(session) {
    if (session.index + 1 >= session.questions.length) {
      session.finished = true;
      return false;
    }
    session.index += 1;
    session.answered = false;
    session.fiftyUsed = false;
    session.lastAnswer = null;
    session.secondsUsed = 0;
    if (session.timeLimit > 0) session.timeLeft = session.timeLimit;
    return true;
  }

  function starsFor(session) {
    const total = session.mode === 'blitz' ? session.answeredCount : session.questions.length;
    if (session.mode === 'blitz') {
      if (session.correctCount >= 12) return 3;
      if (session.correctCount >= 8) return 2;
      if (session.correctCount >= 4) return 1;
      return 0;
    }
    const totalSeguro = Math.max(total, 1);
    const percent = session.correctCount / totalSeguro;
    if (percent >= 0.9) return 3;
    if (percent >= 0.7) return 2;
    if (percent >= 0.5) return 1;
    return 0;
  }

  function checkBadges(state, ctx) {
    const nuevos = [];
    BADGES.forEach((badge) => {
      if (state.badges.indexOf(badge.id) !== -1) return;
      let ok = false;
      try { ok = Boolean(badge.check(state, ctx)); } catch (err) { ok = false; }
      if (ok) {
        state.badges.push(badge.id);
        nuevos.push(badge);
      }
    });
    return nuevos;
  }

  /**
   * Cierra la sesión, aplica recompensas y devuelve el resumen.
   * @param {object} state estado del jugador (se modifica)
   * @param {object} session
   */
  function finish(state, session) {
    if (session.result) return session.result;

    const stars = starsFor(session);
    const total = session.mode === 'blitz' ? Math.max(session.answeredCount, 1) : session.questions.length;
    const percent = Math.round((session.correctCount / Math.max(total, 1)) * 100);
    const levelBefore = levelInfo(state.xp).level;
    const firstDaily = session.mode === 'diario' && !(state.daily.done && state.daily.date === todayKey());

    const prevBoss = session.mode === 'jefe' ? bossStars(state) : 0;
    const prevLevelStars = (session.mode === 'mision')
      ? Number((planetData(state, session.topicId).levels[session.level]) || 0)
      : 0;

    // Progreso de planetas
    if (session.mode === 'mision') {
      const data = planetData(state, session.topicId);
      data.levels[session.level] = Math.max(Number(data.levels[session.level]) || 0, stars);
    } else if (session.mode === 'jefe') {
      if (!state.planets.__nucleo__) state.planets.__nucleo__ = { levels: {}, boss: 0 };
      state.planets.__nucleo__.boss = Math.max(Number(state.planets.__nucleo__.boss) || 0, stars);
    }

    // Estadísticas
    state.stats.answered += session.answeredCount;
    state.stats.correct += session.correctCount;
    state.stats.bestStreak = Math.max(state.stats.bestStreak, session.maxStreak);
    state.stats.fastCorrect += session.fastCorrect;
    if (session.mode === 'mision') state.stats.missions += 1;
    if (session.topicId) {
      if (!state.stats.byTopic[session.topicId]) state.stats.byTopic[session.topicId] = { answered: 0, correct: 0 };
      state.stats.byTopic[session.topicId].answered += session.answeredCount;
      state.stats.byTopic[session.topicId].correct += session.correctCount;
    }

    // Recompensas
    const bonus = { mision: 0, jefe: 80, blitz: 40, diario: 60 }[session.mode] || 0;
    let xp = session.correctCount * 20 + stars * 30 + bonus;
    let coins = session.correctCount * 10 + stars * 15 + Math.round(bonus / 2);
    if (session.mode === 'jefe' && stars > 0 && prevBoss === 0) coins += 100;
    if (firstDaily) {
      coins += 100;
      xp += 50;
      state.daily = { date: todayKey(), done: true };
    } else if (session.mode === 'diario') {
      state.daily = { date: todayKey(), done: true };
    }

    state.xp += xp;
    state.coins += coins;

    const levelAfter = levelInfo(state.xp);

    const ctx = {
      mode: session.mode,
      topicId: session.topicId,
      level: session.level,
      stars,
      percent,
      correct: session.correctCount,
      total: session.questions.length,
      answeredCount: session.answeredCount,
      maxStreak: session.maxStreak,
      fastCorrect: session.fastCorrect,
      isBoss: session.mode === 'jefe',
      firstDaily
    };
    const newBadges = checkBadges(state, ctx);

    session.finished = true;
    session.result = {
      mode: session.mode,
      isBoss: session.mode === 'jefe',
      topicId: session.topicId,
      topicName: session.planetName,
      title: session.title,
      level: session.level,
      stars,
      percent,
      correct: session.correctCount,
      total: session.questions.length,
      answered: session.answeredCount,
      score: session.score,
      xp,
      coins,
      bonusCoins: firstDaily ? 100 : 0,
      passed: stars > 0,
      improved: stars > prevLevelStars,
      leveledUp: levelAfter.level > levelBefore,
      levelInfo: levelAfter,
      newBadges,
      newBossStar: session.mode === 'jefe' && prevBoss === 0 && stars > 0,
      dailyDone: session.mode === 'diario'
    };
    return session.result;
  }

  const Game = {
    PLANETS,
    LEVELS,
    BOSS,
    BADGES,
    AVATARS_FREE,
    AVATARS_SHOP,
    RANKS,
    startSession,
    current,
    answer,
    next,
    finish,
    addTime,
    useFifty,
    starsFor,
    levelInfo,
    planetData,
    planetStars,
    totalStars,
    bossStars,
    allStars,
    bossUnlocked,
    todayKey,
    difficultyFor
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Game;
  else global.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
