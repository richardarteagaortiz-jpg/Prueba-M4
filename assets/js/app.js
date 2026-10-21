/* =========================================================================
   CosmoMates · Interfaz y control del juego
   ========================================================================= */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const el = {};
  let state = null;
  let session = null;
  let timerId = null;
  let lastTick = 0;
  let questionStart = 0;
  let optionsLocked = false;
  let soundOn = true;
  let pendingAvatar = '🧑‍🚀';
  let pendingNext = null;
  let resultCtx = null;
  let lastFocus = null;
  let modalOpen = false;
  let pagos = null;          // { pagos, moneda, importes, webhook } cuando el servidor los ofrece

  /* ------------------------------- utilidades ------------------------------ */

  function esc(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function save() {
    if (state) Store.save(state);
  }

  function starIcons(n, total) {
    const max = total || 3;
    let html = '';
    for (let i = 0; i < max; i++) {
      html += `<span class="${i < n ? '' : 'dim'}">★</span>`;
    }
    return html;
  }

  function showScreen(name) {
    ['home', 'map', 'quiz', 'results'].forEach((screen) => {
      const section = document.getElementById('screen-' + screen);
      if (section) section.hidden = screen !== name;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(message, variant, duration) {
    const node = document.createElement('div');
    node.className = 'toast' + (variant === 'badge' ? ' is-badge' : '');
    node.innerHTML = message;
    $('#toasts').appendChild(node);
    setTimeout(() => {
      node.classList.add('is-out');
      setTimeout(() => node.remove(), 320);
    }, duration || 3200);
  }

  /* --------------------------------- sonido -------------------------------- */

  const Sound = {
    ctx: null,
    ensure() {
      if (!soundOn) return null;
      try {
        if (!this.ctx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return null;
          this.ctx = new Ctx();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      } catch (err) {
        return null;
      }
    },
    tone(freq, duration, opts) {
      const ctx = this.ensure();
      if (!ctx) return;
      const options = opts || {};
      const start = ctx.currentTime + (options.delay || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = options.type || 'sine';
      osc.frequency.setValueAtTime(freq, start);
      const vol = options.gain || 0.05;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    },
    click() { this.tone(540, 0.07, { type: 'triangle', gain: 0.03 }); },
    correct() {
      [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.18, { delay: i * 0.06, gain: 0.045 }));
    },
    wrong() {
      this.tone(190, 0.24, { type: 'sawtooth', gain: 0.03 });
      this.tone(150, 0.28, { delay: 0.08, type: 'sine', gain: 0.03 });
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.3, { delay: i * 0.09, gain: 0.04 }));
    },
    lose() {
      [392, 329.63, 261.63].forEach((f, i) => this.tone(f, 0.28, { delay: i * 0.1, gain: 0.035 }));
    },
    coin() { this.tone(1046.5, 0.1, { gain: 0.03 }); this.tone(1318.5, 0.14, { delay: 0.06, gain: 0.03 }); }
  };

  /* -------------------------------- confeti -------------------------------- */

  const confettiState = { particles: [], raf: null };

  function sizeCanvas() {
    const canvas = el.confetti;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function confetti(count) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sizeCanvas();
    const colors = ['#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#ffffff'];
    for (let i = 0; i < (count || 110); i++) {
      confettiState.particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 220,
        y: window.innerHeight * 0.34 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 11,
        vy: -Math.random() * 10 - 1.5,
        size: 4 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.28,
        life: 1
      });
    }
    if (!confettiState.raf) confettiState.raf = requestAnimationFrame(animateConfetti);
  }

  function animateConfetti() {
    const canvas = el.confetti;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const alive = [];
    confettiState.particles.forEach((p) => {
      p.vy += 0.26;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.006;
      if (p.y < window.innerHeight + 40 && p.life > 0) {
        alive.push(p);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life + 0.35));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });
    confettiState.particles = alive;
    if (alive.length) {
      confettiState.raf = requestAnimationFrame(animateConfetti);
    } else {
      confettiState.raf = null;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  /* -------------------------------- modales -------------------------------- */

  function openModal(html, onReady) {
    el.modalContent.innerHTML = html;
    el.modal.hidden = false;
    modalOpen = true;
    lastFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    const closeBtn = $('.modal-close', el.modal);
    if (closeBtn) closeBtn.focus();
    if (typeof onReady === 'function') onReady(el.modalContent);
  }

  function closeModal() {
    el.modal.hidden = true;
    modalOpen = false;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (err) { /* ignorar */ }
    }
  }

  /* ------------------------------ pantalla inicio -------------------------- */

  function buildAvatarPicker() {
    el.avatarGrid.innerHTML = Game.AVATARS_FREE.map((emoji, i) => `
      <label class="avatar-option">
        <input type="radio" name="avatar" value="${emoji}" ${i === 0 ? 'checked' : ''} aria-label="Avatar ${i + 1}" />
        <span aria-hidden="true">${emoji}</span>
      </label>`).join('');
    el.avatarGrid.addEventListener('change', (e) => {
      if (e.target.name === 'avatar') {
        pendingAvatar = e.target.value;
        Sound.click();
      }
    });
  }

  function renderHome() {
    const hasProfile = Boolean(state && state.player && state.player.name);
    el.profileActions.hidden = !hasProfile;
    el.startForm.hidden = hasProfile;
    if (hasProfile) {
      el.btnContinue.innerHTML = `<span aria-hidden="true">${esc(state.player.avatar)}</span> Continuar como ${esc(state.player.name)}`;
    }
  }

  function showStartForm() {
    el.profileActions.hidden = true;
    el.startForm.hidden = false;
    el.playerName.value = '';
    el.formError.hidden = true;
    pendingAvatar = Game.AVATARS_FREE[0];
    $$('input[name="avatar"]', el.avatarGrid).forEach((input, i) => { input.checked = i === 0; });
    setTimeout(() => el.playerName.focus(), 60);
  }

  function newProfileFlow() {
    if (!state) { showStartForm(); return; }
    openModal(`
      <h2 id="modalTitle">¿Empezar de cero?</h2>
      <p class="modal-sub">Se borrará el progreso de <b>${esc(state.player.name)}</b> (estrellas, monedas y logros) guardado en este dispositivo.</p>
      <div class="results-actions">
        <button type="button" class="btn btn-ghost" data-close="1">Cancelar</button>
        <button type="button" class="btn btn-primary" id="confirmNewProfile">Sí, crear otro explorador</button>
      </div>`, (root) => {
      const btn = root.querySelector('#confirmNewProfile');
      btn.addEventListener('click', () => {
        Store.clear();
        state = null;
        closeModal();
        showStartForm();
        renderHome();
        Sound.click();
      });
    });
  }

  function startProfile(ev) {
    if (ev) ev.preventDefault();
    const raw = el.playerName.value.trim().replace(/\s+/g, ' ');
    if (raw.length < 2) {
      el.formError.textContent = 'Escribe un nombre de al menos 2 letras para tu explorador.';
      el.formError.hidden = false;
      el.playerName.focus();
      return;
    }
    const avatarInput = $('input[name="avatar"]:checked', el.avatarGrid);
    const ageInput = $('input[name="ageGroup"]:checked', el.ageGrid);
    state = Store.fresh();
    state.player = {
      name: raw.slice(0, 16),
      avatar: avatarInput ? avatarInput.value : '🧑‍🚀',
      ageGroup: ageInput ? Number(ageInput.value) : 1
    };
    state.createdAt = new Date().toISOString();
    state.settings.sound = soundOn;
    save();
    el.formError.hidden = true;
    Sound.win();
    renderMap();
    showScreen('map');
    toast(`¡Bienvenido, ${esc(state.player.name)}! Empieza por el Planeta Números 🚀`);
  }

  /* ---------------------------------- mapa --------------------------------- */

  function renderMap() {
    if (!state) { renderHome(); showScreen('home'); return; }
    const info = Game.levelInfo(state.xp);
    const stars = Game.allStars(state);
    const accuracy = state.stats.answered
      ? Math.round((state.stats.correct / state.stats.answered) * 100) + '%'
      : '—';

    el.hudAvatar.textContent = state.player.avatar;
    el.mapTitle.textContent = state.player.name;
    el.hudLevel.textContent = `Nivel ${info.level} · ${info.rank}`;
    el.hudAge.textContent = state.player.ageGroup === 2 ? '13–15 años' : '10–12 años';
    el.hudXp.textContent = `${info.inLevel} / ${info.needed} XP`;
    el.hudXpBar.style.width = info.progress + '%';
    el.hudStars.textContent = stars;
    el.hudCoins.textContent = state.coins;
    el.hudAccuracy.textContent = accuracy;

    const dailyDone = Boolean(state.daily && state.daily.done && state.daily.date === Game.todayKey());
    el.btnDaily.disabled = dailyDone;
    el.btnDaily.innerHTML = dailyDone
      ? '<span aria-hidden="true">✅</span> Reto diario hecho'
      : '<span aria-hidden="true">🎁</span> Reto diario';

    el.planetsGrid.innerHTML = Game.PLANETS.map((planet) => {
      const data = state.planets[planet.id] || { levels: {} };
      const levels = data.levels || {};
      const planetTotal = Game.planetStars(state, planet.id);
      const segments = Game.LEVELS.map((lvl) => `<i class="${(levels[lvl.id] || 0) > 0 ? 'on' : ''}"></i>`).join('');
      return `
        <button type="button" class="planet-card" data-topic="${planet.id}" style="--planet-color:${planet.color}"
                aria-label="${esc(planet.name)}. ${planetTotal} de 9 estrellas. Abrir niveles">
          <span class="planet-top">
            <span class="planet-orb" aria-hidden="true">${planet.emoji}</span>
            <span>
              <span class="planet-title">${esc(planet.name)}</span>
              <span class="planet-topic">${esc(MQ.TOPICS[planet.id].name)}</span>
            </span>
          </span>
          <span class="planet-desc">${esc(planet.desc)}</span>
          <span class="planet-progress" aria-hidden="true">${segments}</span>
          <span class="planet-footer">
            <span class="planet-stars">★ ${planetTotal}/9</span>
            <span class="planet-cta">Jugar →</span>
          </span>
        </button>`;
    }).join('');

    renderBoss();
  }

  function renderBoss() {
    const unlocked = Game.bossUnlocked(state);
    const stars = Game.bossStars(state);
    const missing = Math.max(0, 6 - Game.totalStars(state));
    el.bossWrap.innerHTML = `
      <div class="boss-card">
        <div class="boss-orb" aria-hidden="true">🌌</div>
        <div class="boss-copy">
          <h3>Núcleo Final</h3>
          <p>El desafío definitivo: 8 retos mezclados de todos los planetas, con 20 segundos por pregunta.</p>
          <div class="boss-meta">
            <span>${unlocked ? '🔓 Desbloqueado' : `🔒 Faltan ${missing} ⭐`}</span>
            <span>★ ${stars}/3</span>
            <span>Mezcla de temas</span>
          </div>
        </div>
        <button type="button" class="btn ${unlocked ? 'btn-accent' : 'btn-ghost'}" data-boss="1" ${unlocked ? '' : 'disabled'}>
          ${unlocked ? 'Enfrentar al Núcleo' : `Necesitas ${missing} ⭐ más`}
        </button>
      </div>`;
  }

  function openPlanet(topicId) {
    const planet = Game.PLANETS.find((p) => p.id === topicId);
    if (!planet) return;
    const data = Game.planetData(state, topicId);
    const rows = Game.LEVELS.map((lvl) => {
      const stars = Number((data.levels || {})[lvl.id]) || 0;
      return `
        <div class="level-row">
          <div class="level-info">
            <div class="level-name">${esc(lvl.name)}</div>
            <div class="level-meta">${esc(lvl.desc)}${lvl.id === 3 ? ' · dificultad alta' : ''}</div>
          </div>
          <div class="level-stars" aria-label="${stars} de 3 estrellas">${starIcons(stars)}</div>
          <button type="button" class="btn btn-primary btn-sm" data-play="${lvl.id}">
            ${stars > 0 ? 'Repetir' : 'Jugar'}
          </button>
        </div>`;
    }).join('');

    const bossUnlocked = Game.bossUnlocked(state);
    const bossStarsValue = Game.bossStars(state);
    const bossRow = `
      <div class="level-row is-boss">
        <div class="level-info">
          <div class="level-name">👑 Núcleo Final</div>
          <div class="level-meta">${bossUnlocked ? 'Retos mezclados · 20 s por pregunta' : `Se desbloquea con 6 ⭐ (tienes ${Game.totalStars(state)})`}</div>
        </div>
        <div class="level-stars">${starIcons(bossStarsValue)}</div>
        <button type="button" class="btn btn-accent btn-sm" data-play="boss" ${bossUnlocked ? '' : 'disabled'}>Jugar</button>
      </div>`;

    openModal(`
      <div class="planet-modal-head">
        <span class="planet-orb" style="--planet-color:${planet.color}" aria-hidden="true">${planet.emoji}</span>
        <div>
          <h2 id="modalTitle">${esc(planet.name)}</h2>
          <p class="modal-sub">${esc(planet.desc)}</p>
        </div>
      </div>
      <div class="topic-list">
        ${planet.skills.map((skill) => `<span class="topic-chip">${esc(skill)}</span>`).join('')}
      </div>
      <div class="level-list">${rows}${bossRow}</div>
      <p class="field-hint" style="margin-top:14px">Cada órbita tiene 10 retos. Consigue al menos 5 aciertos para ganar 1 estrella.</p>
    `, (root) => {
      root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-play]');
        if (!btn || btn.disabled) return;
        const value = btn.getAttribute('data-play');
        closeModal();
        if (value === 'boss') startGame({ mode: 'jefe' });
        else startGame({ mode: 'mision', topicId: planet.id, level: Number(value) });
      });
    });
  }

  function bossFlow() {
    if (!Game.bossUnlocked(state)) {
      toast('Necesitas 6 ⭐ para desbloquear el Núcleo Final. ¡Sigue explorando!');
      return;
    }
    openModal(`
      <h2 id="modalTitle">👑 Núcleo Final</h2>
      <p class="modal-sub">8 retos mezclados · 20 segundos por pregunta · sin comodines. Si aciertas al menos 5, ganarás estrellas y 100 monedas extra la primera vez.</p>
      <div class="results-actions">
        <button type="button" class="btn btn-ghost" data-close="1">Ahora no</button>
        <button type="button" class="btn btn-accent" id="confirmBoss">¡Vamos al Núcleo!</button>
      </div>`, (root) => {
      root.querySelector('#confirmBoss').addEventListener('click', () => {
        closeModal();
        startGame({ mode: 'jefe' });
      });
    });
  }

  /* ---------------------------------- quiz --------------------------------- */

  function startGame(opts) {
    if (!state) return;
    session = Game.startSession(state, opts);
    optionsLocked = false;
    resultCtx = null;
    pendingNext = null;
    questionStart = Date.now();
    showScreen('quiz');
    renderQuiz();
    clearInterval(timerId);
    lastTick = Date.now();
    timerId = setInterval(tick, 200);
    Sound.click();
  }

  function renderQuiz() {
    const q = Game.current(session);
    if (!q) { finishSession(); return; }

    const total = session.questions.length;
    el.quizTopic.textContent = session.planetName || session.title;
    el.quizCount.textContent = session.mode === 'blitz'
      ? `Pregunta ${session.index + 1}`
      : `Pregunta ${session.index + 1} de ${total}`;
    el.quizBar.style.width = Math.round((session.answeredCount / total) * 100) + '%';
    el.quizScore.textContent = session.score;

    const modeLabel = { mision: 'Misión', jefe: 'Jefe final', blitz: 'Contrarreloj', diario: 'Reto diario' }[session.mode];
    el.quizMode.textContent = modeLabel;

    el.quizTopicPill.textContent = `${q.icon} ${q.topicName}`;
    el.quizTopicPill.style.setProperty('--topic-color', q.color);
    el.questionCard.style.setProperty('--topic-color', q.color);

    el.quizStreak.hidden = session.streak < 2;
    el.streakValue.textContent = session.streak;

    el.questionKicker.textContent = session.mode === 'jefe' ? `Reto ${session.index + 1} de ${total}` : `Pregunta ${session.index + 1}`;
    el.questionText.innerHTML = q.prompt;
    el.options.style.setProperty('--topic-color', q.color);

    el.options.innerHTML = q.options.map((opt, i) => `
      <button type="button" class="option" data-index="${i}" aria-label="Opción ${i + 1}: ${esc(opt.text.replace(/<[^>]+>/g, ''))}">
        <span class="option-key" aria-hidden="true">${i + 1}</span>
        <span>${opt.text}</span>
      </button>`).join('');

    optionsLocked = false;
    el.feedback.hidden = true;
    el.feedback.classList.remove('is-bad');
    el.btnNext.textContent = 'Siguiente →';
    el.questionCard.classList.remove('is-correct', 'is-wrong');
    updateTimerUI();
    updatePowerups();
    el.questionText.setAttribute('tabindex', '-1');
    try { el.questionText.focus({ preventScroll: true }); } catch (err) { /* ignorar */ }
  }

  function handleAnswer(index) {
    if (!session || optionsLocked) return;
    const seconds = (Date.now() - questionStart) / 1000;
    const res = Game.answer(session, index, seconds);
    if (!res) return;
    optionsLocked = true;
    renderAnswer(res);
  }

  function renderAnswer(res) {
    const buttons = $$('.option', el.options);
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === res.correctIndex) btn.classList.add('is-correct');
      if (i === res.selectedIndex && !res.correct) btn.classList.add('is-wrong');
      if (res.selectedIndex !== null && i === res.selectedIndex) btn.setAttribute('aria-pressed', 'true');
    });

    el.feedback.hidden = false;
    el.feedback.classList.toggle('is-bad', !res.correct);
    el.feedbackIcon.textContent = res.correct ? '✅' : (res.timedOut ? '⌛' : '❌');
    el.feedbackTitle.textContent = res.correct ? '¡Correcto!' : (res.timedOut ? '¡Se acabó el tiempo!' : 'Casi…');
    el.feedbackPoints.textContent = res.correct ? `+${res.points} pts` : 'Sin puntos';
    el.feedbackText.innerHTML = res.explanation;
    el.quizScore.textContent = session.score;
    el.streakValue.textContent = session.streak;
    el.quizStreak.hidden = session.streak < 2;

    const isLast = session.index + 1 >= session.questions.length;
    el.btnNext.textContent = isLast ? 'Ver resultados →' : 'Siguiente →';
    el.quizBar.style.width = Math.round((session.answeredCount / session.questions.length) * 100) + '%';

    updatePowerups();
    if (res.correct) { Sound.correct(); } else { Sound.wrong(); }
  }

  function handleTimeout() {
    if (!session || session.answered) return;
    const res = Game.answer(session, null, session.timeLimit);
    if (!res) return;
    optionsLocked = true;
    renderAnswer(res);
  }

  function nextQuestion() {
    if (!session || !optionsLocked) return;
    if (session.mode === 'blitz' && session.totalTimeLeft <= 0) { finishSession(); return; }
    const hasNext = Game.next(session);
    if (!hasNext) { finishSession(); return; }
    questionStart = Date.now();
    renderQuiz();
    Sound.click();
  }

  function updateTimerUI() {
    if (!session) { el.quizTimer.hidden = true; return; }
    const perQuestion = session.timeLimit > 0;
    const totalMode = session.totalTime > 0;
    if (!perQuestion && !totalMode) { el.quizTimer.hidden = true; return; }
    el.quizTimer.hidden = false;
    const seconds = perQuestion ? session.timeLeft : session.totalTimeLeft;
    const display = Math.max(0, Math.ceil(seconds));
    el.timerValue.textContent = display;
    el.quizTimer.classList.toggle('is-low', display <= 5);
  }

  function tick() {
    if (!session || session.finished) return;
    const now = Date.now();
    const delta = Math.min((now - lastTick) / 1000, 2);
    lastTick = now;

    if (session.timeLimit > 0 && !session.answered) {
      session.timeLeft = Math.max(0, session.timeLeft - delta);
      updateTimerUI();
      if (session.timeLeft <= 0) handleTimeout();
    } else if (session.totalTime > 0 && !session.answered) {
      session.totalTimeLeft = Math.max(0, session.totalTimeLeft - delta);
      updateTimerUI();
      if (session.totalTimeLeft <= 0) finishSession();
    }
  }

  function updatePowerups() {
    if (!session) return;
    const fifty = session.powerups.fifty;
    const time = session.powerups.time;
    el.countFifty.textContent = fifty;
    el.countTime.textContent = time;
    el.powerFifty.disabled = fifty <= 0 || session.answered || session.fiftyUsed;
    el.powerTime.disabled = time <= 0 || session.answered || (session.timeLimit <= 0 && session.totalTime <= 0);
  }

  function useFifty() {
    if (!session || optionsLocked) return;
    const eliminadas = Game.useFifty(session);
    if (!eliminadas.length) return;
    eliminadas.forEach((i) => {
      const btn = el.options.querySelector(`[data-index="${i}"]`);
      if (btn) {
        btn.classList.add('is-dim');
        btn.disabled = true;
      }
    });
    updatePowerups();
    Sound.click();
    toast('✂️ Dos opciones menos. ¡Tú puedes!', null, 1800);
  }

  function useTime() {
    if (!session || optionsLocked) return;
    if (Game.addTime(session, 10)) {
      updateTimerUI();
      updatePowerups();
      Sound.coin();
      toast('⏱️ +10 segundos añadidos', null, 1600);
    }
  }

  function quitFlow() {
    if (!session) { showScreen('map'); return; }
    openModal(`
      <h2 id="modalTitle">¿Salir de la misión?</h2>
      <p class="modal-sub">Perderás el progreso de esta partida (no las estrellas que ya tenías).</p>
      <div class="results-actions">
        <button type="button" class="btn btn-ghost" data-close="1">Seguir jugando</button>
        <button type="button" class="btn btn-primary" id="confirmQuit">Salir</button>
      </div>`, (root) => {
      root.querySelector('#confirmQuit').addEventListener('click', () => {
        closeModal();
        clearInterval(timerId);
        session = null;
        renderMap();
        showScreen('map');
      });
    });
  }

  /* ------------------------------- resultados ------------------------------ */

  function finishSession() {
    if (!session || session.result) return;
    clearInterval(timerId);
    const result = Game.finish(state, session);
    save();
    renderResults(result);
    showScreen('results');
    el.resultsTitle.setAttribute('tabindex', '-1');
    try { el.resultsTitle.focus({ preventScroll: true }); } catch (err) { /* ignorar */ }
    resultCtx = { result, session };

    if (result.stars > 0) {
      Sound.win();
      confetti(result.stars === 3 ? 150 : 100);
    } else {
      Sound.lose();
    }
    if (result.leveledUp) {
      setTimeout(() => toast(`🎉 ¡Subiste al nivel ${result.levelInfo.level}! Rango: <b>${esc(result.levelInfo.rank)}</b>`, 'badge', 4200), 350);
    }
    result.newBadges.forEach((badge, i) => {
      setTimeout(() => toast(`${badge.icon} Nuevo logro: <b>${esc(badge.name)}</b>`, 'badge', 4200), 900 + i * 800);
    });
  }

  function renderResults(result) {
    const isBoss = result.mode === 'jefe';
    const isBlitz = result.mode === 'blitz';
    const isDaily = result.mode === 'diario';

    el.resultsEyebrow.textContent = isBoss ? 'Núcleo Final' : isBlitz ? 'Contrarreloj' : isDaily ? 'Reto diario' : 'Misión completada';
    el.resultsTitle.textContent = result.passed
      ? (result.stars === 3 ? '¡Dominio total!' : result.stars === 2 ? '¡Muy buen trabajo!' : '¡Misión cumplida!')
      : '¡Casi lo logras!';

    el.resultsStars.innerHTML = [0, 1, 2].map((i) => `
      <span class="star-anim${i < result.stars ? '' : ' dim'}" style="animation-delay:${0.15 + i * 0.18}s">★</span>`).join('');
    el.resultsStars.setAttribute('aria-label', `${result.stars} de 3 estrellas`);

    let message;
    if (isBlitz) {
      message = `Resolviste ${result.correct} de ${result.answered} retos en 60 segundos. ` +
        (result.stars === 3 ? '¡Velocidad de leyenda!' : 'Repite para batir tu marca.');
    } else if (isBoss) {
      message = result.passed
        ? 'El Núcleo Final se apaga y la galaxia vuelve a brillar. ¡Eres una leyenda de CosmoMates!'
        : 'El Núcleo sigue encendido. Necesitas al menos 5 aciertos: repasa los planetas y vuelve a intentarlo.';
    } else if (result.passed) {
      message = result.stars === 3
        ? '¡Aciertos casi perfectos! Has dominado este nivel; prueba la siguiente órbita.'
        : 'Vas por buen camino. Repite la misión si quieres conseguir las 3 estrellas.';
    } else {
      message = 'Necesitas al menos 5 aciertos para superar la misión. Lee las explicaciones y vuelve a intentarlo: cada intento enseña.';
    }
    if (isDaily && result.passed) message += ' ¡Bono diario conseguido!';

    el.resultsMessage.textContent = message;
    el.resCorrect.textContent = result.mode === 'blitz'
      ? `${result.correct} / ${result.answered}`
      : `${result.correct} / ${result.total}`;
    el.resAccuracy.textContent = result.percent + '%';
    el.resScore.textContent = result.score;
    el.resCoins.textContent = result.coins;

    if (result.newBadges.length) {
      el.resBadges.hidden = false;
      el.resBadgeRow.innerHTML = result.newBadges
        .map((b) => `<span class="badge-chip">${b.icon} ${esc(b.name)}</span>`).join('');
    } else {
      el.resBadges.hidden = true;
      el.resBadgeRow.innerHTML = '';
    }

    pendingNext = null;
    if (result.mode === 'mision' && result.passed) {
      if (result.level < 3) {
        pendingNext = { level: result.level + 1, label: 'Siguiente órbita' };
      } else if (Game.bossUnlocked(state)) {
        pendingNext = { boss: true, label: 'Ir al Núcleo Final' };
      }
    }
    if (pendingNext) {
      el.btnNextLevel.hidden = false;
      el.btnNextLevel.innerHTML = `${esc(pendingNext.label)} <span aria-hidden="true">→</span>`;
    } else {
      el.btnNextLevel.hidden = true;
    }

    el.btnRetry.textContent = result.mode === 'blitz' ? 'Volver a intentarlo' : 'Repetir';
  }

  /* -------------------------------- pantallas ------------------------------ */

  function openBadges() {
    if (!state) { toast('Primero crea tu explorador para ver los logros.'); return; }
    const unlocked = state.badges || [];
    const items = Game.BADGES.map((badge) => {
      const isOn = unlocked.indexOf(badge.id) !== -1;
      return `
        <div class="badge-item ${isOn ? '' : 'locked'}">
          <span class="badge-icon" aria-hidden="true">${badge.icon}</span>
          <strong>${esc(badge.name)}</strong>
          <small>${esc(badge.desc)}</small>
          <small>${isOn ? '✅ Conseguido' : '🔒 Pendiente'}</small>
        </div>`;
    }).join('');
    openModal(`
      <h2 id="modalTitle">🏅 Mis logros</h2>
      <p class="modal-sub">${unlocked.length} de ${Game.BADGES.length} conseguidos · ${Game.allStars(state)} estrellas · ${state.coins} monedas</p>
      <div class="badge-grid">${items}</div>`);
  }

  function openHelp() {
    openModal(`
      <h2 id="modalTitle">❓ Cómo jugar</h2>
      <p class="modal-sub">CosmoMates convierte las matemáticas en una aventura espacial de 10 a 15 años.</p>
      <ol class="help-steps">
        <li><span class="step-num">1</span><div><strong>Elige un planeta.</strong> Cada uno entrena un tema distinto: números, fracciones, porcentajes, potencias, álgebra, geometría, lógica o datos.</div></li>
        <li><span class="step-num">2</span><div><strong>Resuelve la órbita.</strong> Son 10 retos con 4 opciones. Puedes responder con las teclas <kbd>1</kbd>–<kbd>4</kbd>.</div></li>
        <li><span class="step-num">3</span><div><strong>Aprende del error.</strong> Después de cada respuesta verás la explicación paso a paso.</div></li>
        <li><span class="step-num">4</span><div><strong>Gana estrellas.</strong> 5 aciertos = 1 ⭐ · 7 = 2 ⭐ · 9 = 3 ⭐. Con 6 ⭐ se desbloquea el Núcleo Final.</div></li>
        <li><span class="step-num">5</span><div><strong>Usa comodines.</strong> ✂️ Descarta dos opciones incorrectas · ⏱️ suma 10 segundos.</div></li>
        <li><span class="step-num">6</span><div><strong>Vuelve cada día.</strong> El reto diario da monedas extra; las monedas desbloquean avatares en Ajustes.</div></li>
      </ol>
      <p class="field-hint">No hay anuncios ni registro. El progreso se guarda en este navegador y puedes borrarlo desde Ajustes.</p>`);
  }

  function avatarPickerHtml(selected) {
    const comprados = state.unlockedAvatars || [];
    const libres = Game.AVATARS_FREE.map((emoji, i) => `
      <label class="avatar-option">
        <input type="radio" name="setAvatar" value="${emoji}" ${emoji === selected ? 'checked' : ''} aria-label="Avatar ${i + 1}" />
        <span aria-hidden="true">${emoji}</span>
      </label>`).join('');
    const tienda = Game.AVATARS_SHOP.map((item) => {
      const owned = comprados.indexOf(item.emoji) !== -1;
      if (owned) {
        return `
          <label class="avatar-option" title="${esc(item.name)}">
            <input type="radio" name="setAvatar" value="${item.emoji}" ${item.emoji === selected ? 'checked' : ''} aria-label="Avatar ${esc(item.name)}" />
            <span aria-hidden="true">${item.emoji}</span>
          </label>`;
      }
      return `
        <button type="button" class="avatar-option avatar-buy" data-buy="${item.emoji}" data-price="${item.price}"
                title="${esc(item.name)} · ${item.price} monedas" aria-label="Comprar avatar ${esc(item.name)} por ${item.price} monedas">
          <span aria-hidden="true" class="avatar-locked">${item.emoji}</span>
          <span class="price-tag" aria-hidden="true">${item.price}</span>
        </button>`;
    }).join('');
    return `<div class="avatar-grid">${libres}${tienda}</div>
      <p class="field-hint" style="margin-top:8px">Los avatares con precio se compran con monedas. Tienes <b>${state.coins}</b> 🪙.</p>`;
  }

  function openSettings() {
    if (!state) { toast('Primero crea tu explorador para abrir los ajustes.'); return; }
    openModal(`
      <h2 id="modalTitle">⚙️ Ajustes</h2>
      <p class="modal-sub">Personaliza tu nave y gestiona tu progreso.</p>
      <div class="settings-grid">
        <label class="field">
          <span class="field-label">Nombre del explorador</span>
          <span style="display:flex;gap:8px">
            <input type="text" id="setName" maxlength="16" value="${esc(state.player.name)}" />
            <button type="button" class="btn btn-primary btn-sm" id="saveName">Guardar</button>
          </span>
        </label>
        <fieldset class="field">
          <legend class="field-label">Nivel de dificultad</legend>
          <div class="age-grid">
            <label class="age-card">
              <input type="radio" name="setAge" value="1" ${state.player.ageGroup === 1 ? 'checked' : ''} />
              <span class="age-title">10 a 12 años</span>
              <span class="age-sub">Niveles base</span>
            </label>
            <label class="age-card">
              <input type="radio" name="setAge" value="2" ${state.player.ageGroup === 2 ? 'checked' : ''} />
              <span class="age-title">13 a 15 años</span>
              <span class="age-sub">Más desafío</span>
            </label>
          </div>
        </fieldset>
        <div class="setting-row">
          <div><strong>Sonido</strong><p>Efectos al acertar, fallar y ganar.</p></div>
          <label class="switch">
            <input type="checkbox" id="setSound" ${soundOn ? 'checked' : ''} aria-label="Sonido" />
            <span aria-hidden="true"></span>
          </label>
        </div>
        <div class="field">
          <span class="field-label">Tu avatar</span>
          ${avatarPickerHtml(state.player.avatar)}
        </div>
        <div class="setting-row danger-zone">
          <div><strong>Borrar todo el progreso</strong><p>Estrellas, monedas, logros y perfil de este dispositivo.</p></div>
          <button type="button" class="btn btn-ghost btn-sm" id="resetProgress">Borrar</button>
        </div>
      </div>`, (root) => {
      const rerender = () => openSettings();
      root.querySelector('#saveName').addEventListener('click', () => {
        const value = root.querySelector('#setName').value.trim().replace(/\s+/g, ' ');
        if (value.length < 2) { toast('El nombre necesita al menos 2 letras.'); return; }
        state.player.name = value.slice(0, 16);
        save();
        renderMap();
        toast('Nombre actualizado ✨');
      });
      $$('input[name="setAge"]', root).forEach((input) => {
        input.addEventListener('change', () => {
          state.player.ageGroup = Number(input.value);
          save();
          renderMap();
          toast(`Dificultad ajustada a ${input.value === '2' ? '13–15 años' : '10–12 años'}.`);
        });
      });
      root.querySelector('#setSound').addEventListener('change', (e) => {
        soundOn = e.target.checked;
        state.settings.sound = soundOn;
        updateSoundButton();
        save();
        if (soundOn) Sound.coin();
      });
      $$('input[name="setAvatar"]', root).forEach((input) => {
        input.addEventListener('change', () => {
          state.player.avatar = input.value;
          save();
          renderMap();
          Sound.click();
          toast('¡Nuevo avatar equipado!');
        });
      });
      $$('[data-buy]', root).forEach((btn) => {
        btn.addEventListener('click', () => {
          const emoji = btn.getAttribute('data-buy');
          const price = Number(btn.getAttribute('data-price'));
          if (state.coins < price) {
            toast(`Te faltan ${price - state.coins} 🪙. ¡Juega misiones para conseguirlas!`);
            return;
          }
          state.coins -= price;
          if (!state.unlockedAvatars) state.unlockedAvatars = [];
          state.unlockedAvatars.push(emoji);
          state.player.avatar = emoji;
          save();
          renderMap();
          Sound.coin();
          toast(`¡Avatar desbloqueado! ${emoji}`, 'badge');
          rerender();
        });
      });
      root.querySelector('#resetProgress').addEventListener('click', () => {
        openModal(`
          <h2 id="modalTitle">¿Borrar todo el progreso?</h2>
          <p class="modal-sub">Esta acción no se puede deshacer: se eliminarán el perfil, las estrellas, las monedas y los logros de <b>${esc(state.player.name)}</b>.</p>
          <div class="results-actions">
            <button type="button" class="btn btn-ghost" data-close="1">Cancelar</button>
            <button type="button" class="btn btn-primary" id="confirmReset">Sí, borrar todo</button>
          </div>`, (r2) => {
          r2.querySelector('#confirmReset').addEventListener('click', () => {
            Store.clear();
            state = null;
            session = null;
            closeModal();
            renderHome();
            showScreen('home');
            showStartForm();
            toast('Progreso borrado. ¡Hasta la próxima aventura!');
          });
        });
      });
    });
  }

  function updateSoundButton() {
    el.btnSound.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    el.soundIcon.textContent = soundOn ? '🔊' : '🔇';
  }

  /* ------------------------------ apoyo / pagos ----------------------------- */

  /**
   * Pregunta al servidor si las donaciones están configuradas.
   * En hosting estático (sin backend) la petición falla y el botón queda oculto:
   * el juego sigue siendo 100 % gratuito y funcional.
   */
  async function detectarPagos() {
    try {
      const control = new AbortController();
      const temporizador = setTimeout(() => control.abort(), 2500);
      const respuesta = await fetch('api/salud', {
        headers: { Accept: 'application/json' },
        signal: control.signal
      });
      clearTimeout(temporizador);
      if (!respuesta.ok) return;
      const datos = await respuesta.json();
      if (!datos || !datos.pagos) return;
      pagos = datos;
      if (el.btnApoyar) {
        el.btnApoyar.hidden = false;
        if (el.supportNote) el.supportNote.hidden = false;
      }
    } catch (err) {
      /* sin backend: modo gratuito, no hacemos nada */
    }
  }

  function importesDisponibles() {
    if (pagos && Array.isArray(pagos.importes) && pagos.importes.length) return pagos.importes;
    return [5, 10, 25, 50];
  }

  function monedaLegible(moneda) {
    const codigo = String(moneda || 'usd').toUpperCase();
    const simbolo = { USD: 'US$', EUR: '€', MXN: 'MX$', COP: 'COL$', ARS: 'AR$' }[codigo];
    return simbolo || codigo;
  }

  function abrirApoyo() {
    if (!pagos) return;
    const importes = importesDisponibles();
    const seleccionado = importes[Math.min(1, importes.length - 1)];
    openModal(`
      <h2 id="modalTitle">💜 Apoyar CosmoMates</h2>
      <p class="modal-sub">El juego es y seguirá siendo gratuito, sin anuncios y sin cuentas.</p>
      <p class="support-intro">Si quieres ayudar a mantener los servidores y seguir creando planetas, puedes hacer una donación voluntaria. El pago se procesa en la pasarela segura de NowPayments: <b>no recibimos ni guardamos datos de tu tarjeta o monedero</b>.</p>
      <div class="support-note-box">
        <span aria-hidden="true">👩‍👦</span>
        <span><b>Solo para personas adultas.</b> Si tienes menos de 18 años, pide permiso a un adulto. Puedes jugar todo el contenido sin donar nada.</span>
      </div>
      <fieldset class="field">
        <legend class="field-label">Elige un importe (${monedaLegible(pagos.moneda)})</legend>
        <div class="support-amounts" id="supportAmounts" role="radiogroup" aria-label="Importe de la donación">
          ${importes.map((n, i) => `
            <button type="button" class="support-amount" role="radio" aria-checked="${n === seleccionado}" aria-pressed="${n === seleccionado}"
                    data-amount="${n}" data-testid="amount-${n}">${monedaLegible(pagos.moneda)} ${n}</button>`).join('')}
        </div>
      </fieldset>
      <button type="button" class="btn btn-primary btn-block" id="btnPagar">
        <span aria-hidden="true">🔒</span> Continuar al pago seguro
      </button>
      <p class="support-status is-info" id="supportStatus" role="status" aria-live="polite">Serás redirigido a NowPayments para completar el pago.</p>
    `, (root) => {
      let monto = seleccionado;
      const estado = root.querySelector('#supportStatus');
      const botones = Array.from(root.querySelectorAll('[data-amount]'));

      botones.forEach((btn) => {
        btn.addEventListener('click', () => {
          monto = Number(btn.getAttribute('data-amount'));
          botones.forEach((b) => {
            const activo = b === btn;
            b.setAttribute('aria-pressed', activo ? 'true' : 'false');
            b.setAttribute('aria-checked', activo ? 'true' : 'false');
          });
          Sound.click();
        });
      });

      root.querySelector('#btnPagar').addEventListener('click', async (evento) => {
        const boton = evento.currentTarget;
        boton.disabled = true;
        estado.className = 'support-status is-info';
        estado.textContent = 'Creando el pago…';
        try {
          const respuesta = await fetch('api/donacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monto })
          });
          const datos = await respuesta.json().catch(() => ({}));
          if (!respuesta.ok || !datos.url) {
            throw new Error(datos.error || 'No se pudo crear el pago.');
          }
          estado.textContent = 'Redirigiendo a la pasarela…';
          window.location.href = datos.url;
        } catch (err) {
          estado.className = 'support-status is-error';
          estado.textContent = '⚠️ ' + (err.message || 'No se pudo crear el pago. Inténtalo más tarde.');
          boton.disabled = false;
        }
      });
    });
  }

  /** Mensajes de vuelta desde la pasarela (?apoyo=gracias | cancelado). */
  function revisarRetornoDeApoyo() {
    let parametros;
    try {
      parametros = new URLSearchParams(window.location.search);
    } catch (err) {
      return;
    }
    const apoyo = parametros.get('apoyo');
    if (!apoyo) return;
    if (apoyo === 'gracias') {
      openModal(`
        <div class="support-thanks">
          <span class="support-heart" aria-hidden="true">💜</span>
          <h2 id="modalTitle">¡Gracias por apoyar!</h2>
          <p class="modal-sub">Tu donación ayuda a mantener CosmoMates gratuito, sin anuncios y sin recoger datos de estudiantes.</p>
          <p class="support-intro">El pago puede tardar unos minutos en confirmarse en la red.</p>
          <button type="button" class="btn btn-primary btn-block" data-close="1">Volver a la aventura</button>
        </div>`);
      confetti(80);
      Sound.win();
    } else if (apoyo === 'cancelado') {
      toast('Pago cancelado. Puedes seguir jugando: todo el contenido es gratuito.');
    }
    try {
      const limpia = window.location.pathname + (parametros.get('apoyo') ? '' : '');
      window.history.replaceState({}, '', limpia);
    } catch (err) {
      /* ignorar */
    }
  }

  /* --------------------------------- eventos ------------------------------- */

  function cacheElements() {
    el.modal = $('#modal');
    el.modalContent = $('#modalContent');
    el.toasts = $('#toasts');
    el.confetti = $('#confetti');
    el.avatarGrid = $('#avatarGrid');
    el.ageGrid = $('#ageGrid');
    el.playerName = $('#playerName');
    el.formError = $('#formError');
    el.startForm = $('#startForm');
    el.profileActions = $('#profileActions');
    el.btnContinue = $('#btnContinue');
    el.btnNewProfile = $('#btnNewProfile');

    el.hudAvatar = $('#hudAvatar');
    el.mapTitle = $('#mapTitle');
    el.hudLevel = $('#hudLevel');
    el.hudAge = $('#hudAge');
    el.hudXp = $('#hudXp');
    el.hudXpBar = $('#hudXpBar');
    el.hudStars = $('#hudStars');
    el.hudCoins = $('#hudCoins');
    el.hudAccuracy = $('#hudAccuracy');

    el.btnDaily = $('#btnDaily');
    el.btnBlitz = $('#btnBlitz');
    el.planetsGrid = $('#planetsGrid');
    el.bossWrap = $('#bossWrap');

    el.quizTopic = $('#quizTopic');
    el.quizCount = $('#quizCount');
    el.quizBar = $('#quizBar');
    el.quizScore = $('#quizScore');
    el.quizTopicPill = $('#quizTopicPill');
    el.quizTimer = $('#quizTimer');
    el.quizStreak = $('#quizStreak');
    el.quizMode = $('#quizMode');
    el.timerValue = $('#timerValue');
    el.streakValue = $('#streakValue');
    el.questionCard = $('#questionCard');
    el.questionKicker = $('#questionKicker');
    el.questionText = $('#questionText');
    el.options = $('#options');
    el.feedback = $('#feedback');
    el.feedbackIcon = $('#feedbackIcon');
    el.feedbackTitle = $('#feedbackTitle');
    el.feedbackPoints = $('#feedbackPoints');
    el.feedbackText = $('#feedbackText');
    el.btnNext = $('#btnNext');
    el.powerFifty = $('[data-power="fifty"]');
    el.powerTime = $('[data-power="time"]');
    el.countFifty = $('#countFifty');
    el.countTime = $('#countTime');

    el.resultsEyebrow = $('#resultsEyebrow');
    el.resultsTitle = $('#resultsTitle');
    el.resultsStars = $('#resultsStars');
    el.resultsMessage = $('#resultsMessage');
    el.resCorrect = $('#resCorrect');
    el.resAccuracy = $('#resAccuracy');
    el.resScore = $('#resScore');
    el.resCoins = $('#resCoins');
    el.resBadges = $('#resBadges');
    el.resBadgeRow = $('#resBadgeRow');
    el.btnNextLevel = $('#btnNextLevel');
    el.btnRetry = $('#btnRetry');
    el.btnBackMap = $('#btnBackMap');
    el.btnQuit = $('#btnQuit');

    el.btnSound = $('#btnSound');
    el.soundIcon = $('#soundIcon');
    el.btnBadges = $('#btnBadges');
    el.btnHelp = $('#btnHelp');
    el.btnSettings = $('#btnSettings');
    el.brandHome = $('#brandHome');
    el.footerYear = $('#footerYear');
    el.btnApoyar = $('#btnApoyar');
    el.supportNote = $('#supportNote');
  }

  function bindEvents() {
    el.startForm.addEventListener('submit', startProfile);
    el.btnContinue.addEventListener('click', () => {
      Sound.click();
      renderMap();
      showScreen('map');
    });
    el.btnNewProfile.addEventListener('click', newProfileFlow);
    el.brandHome.addEventListener('click', (e) => {
      e.preventDefault();
      if (session && !session.finished) {
        clearInterval(timerId);
        session = null;
      }
      if (state) { renderMap(); showScreen('map'); } else { renderHome(); showScreen('home'); }
    });

    el.btnSound.addEventListener('click', () => {
      soundOn = !soundOn;
      if (state) { state.settings.sound = soundOn; save(); }
      updateSoundButton();
      if (soundOn) Sound.coin();
    });
    if (el.btnApoyar) el.btnApoyar.addEventListener('click', () => { Sound.click(); abrirApoyo(); });
    el.btnBadges.addEventListener('click', openBadges);
    el.btnHelp.addEventListener('click', openHelp);
    el.btnSettings.addEventListener('click', openSettings);

    el.planetsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-topic]');
      if (!card) return;
      Sound.click();
      openPlanet(card.getAttribute('data-topic'));
    });

    el.bossWrap.addEventListener('click', (e) => {
      if (!e.target.closest('[data-boss]')) return;
      Sound.click();
      bossFlow();
    });

    el.btnDaily.addEventListener('click', () => {
      if (!state || el.btnDaily.disabled) return;
      startGame({ mode: 'diario' });
    });
    el.btnBlitz.addEventListener('click', () => {
      if (!state) return;
      startGame({ mode: 'blitz' });
    });

    el.options.addEventListener('click', (e) => {
      const btn = e.target.closest('.option');
      if (!btn || btn.disabled) return;
      handleAnswer(Number(btn.getAttribute('data-index')));
    });
    el.btnNext.addEventListener('click', nextQuestion);
    el.btnQuit.addEventListener('click', quitFlow);
    el.powerFifty.addEventListener('click', useFifty);
    el.powerTime.addEventListener('click', useTime);

    el.btnBackMap.addEventListener('click', () => {
      renderMap();
      showScreen('map');
      Sound.click();
    });
    el.btnRetry.addEventListener('click', () => {
      if (!resultCtx) return;
      const result = resultCtx.result;
      if (result.mode === 'jefe') startGame({ mode: 'jefe' });
      else if (result.mode === 'blitz') startGame({ mode: 'blitz' });
      else if (result.mode === 'diario') startGame({ mode: 'diario' });
      else startGame({ mode: 'mision', topicId: result.topicId, level: result.level });
    });
    el.btnNextLevel.addEventListener('click', () => {
      if (!pendingNext || !resultCtx) return;
      if (pendingNext.boss) { startGame({ mode: 'jefe' }); return; }
      startGame({ mode: 'mision', topicId: resultCtx.result.topicId, level: pendingNext.level });
    });


    el.modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOpen) { closeModal(); return; }
      if (modalOpen) return;
      const quizVisible = !$('#screen-quiz').hidden;
      if (!quizVisible) return;
      if (!optionsLocked && /^[1-4]$/.test(e.key)) {
        const btn = el.options.querySelector(`[data-index="${Number(e.key) - 1}"]`);
        if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      } else if (optionsLocked && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        nextQuestion();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) lastTick = Date.now();
    });

    window.addEventListener('resize', () => {
      if (confettiState.particles.length) sizeCanvas();
    });
  }

  function boot() {
    cacheElements();
    state = Store.load();
    if (state && (!state.player || !state.player.name)) state = null;
    soundOn = state ? state.settings.sound !== false : true;
    updateSoundButton();
    buildAvatarPicker();
    bindEvents();
    renderHome();
    showScreen('home');
    el.footerYear.textContent = new Date().getFullYear();
    detectarPagos();
    revisarRetornoDeApoyo();
    if (state) {
      toast(`¡Hola de nuevo, ${esc(state.player.name)}! Tu aventura te espera.`, null, 3600);
    }
  }

  /* API mínima para depurar desde la consola del navegador y para las pruebas. */
  Object.defineProperty(window, 'CosmoMates', {
    value: {
      version: '1.0.0',
      get state() { return state; },
      get session() { return session; },
      Game: Game,
      Store: Store,
      get pagos() { return pagos; },
      abrirApoyo: abrirApoyo
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
