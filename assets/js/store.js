/* =========================================================================
   CosmoMates · Almacenamiento local
   Guarda el progreso en localStorage de forma segura (sin cuentas ni nube).
   ========================================================================= */
(function (global) {
  'use strict';

  const KEY = 'cosmomates.v1';

  function defaultState() {
    return {
      version: 1,
      player: { name: '', avatar: '🧑‍🚀', ageGroup: 1 },
      xp: 0,
      coins: 0,
      planets: {},          // { tema: { levels: {1:0,2:0,3:0}, boss:0 } }
      badges: [],           // ids conseguidos
      unlockedAvatars: [],  // avatares comprados
      stats: {
        answered: 0,
        correct: 0,
        missions: 0,
        bestStreak: 0,
        fastCorrect: 0,
        byTopic: {}         // { tema: { answered, correct } }
      },
      settings: { sound: true },
      daily: { date: '', done: false },
      createdAt: null
    };
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /** Mezcla profunda de un estado guardado con el estado por defecto. */
  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    Object.keys(saved).forEach((key) => {
      const value = saved[key];
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        if (Array.isArray(base[key])) base[key] = value.slice();
      } else if (typeof value === 'object') {
        if (base[key] && typeof base[key] === 'object') base[key] = merge(base[key], value);
        else base[key] = clone(value);
      } else {
        base[key] = value;
      }
    });
    return base;
  }

  function storage() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const test = '__cosmo_test__';
      localStorage.setItem(test, '1');
      localStorage.removeItem(test);
      return localStorage;
    } catch (err) {
      return null;
    }
  }

  const Store = {
    hasProfile() {
      const state = Store.load();
      return Boolean(state && state.player && state.player.name);
    },

    load() {
      const base = defaultState();
      const ls = storage();
      if (!ls) return null;
      try {
        const raw = ls.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const merged = merge(base, parsed);
        merged.version = 1;
        return merged;
      } catch (err) {
        return null;
      }
    },

    save(state) {
      const ls = storage();
      if (!ls || !state) return false;
      try {
        ls.setItem(KEY, JSON.stringify(state));
        return true;
      } catch (err) {
        return false;
      }
    },

    clear() {
      const ls = storage();
      if (!ls) return;
      try { ls.removeItem(KEY); } catch (err) { /* ignorar */ }
    },

    fresh: defaultState
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Store;
  else global.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
