/* =========================================================================
   CosmoMates · Motor de preguntas
   Genera retos matemáticos al azar para estudiantes de 10 a 15 años.
   Sin dependencias: funciona en el navegador y en Node (para los tests).
   ========================================================================= */
(function (global) {
  'use strict';

  /* ------------------------------ utilidades ------------------------------ */

  const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[ri(0, arr.length - 1)];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  // Formato numérico en español: coma decimal, sin separador de miles.
  function fmt(value) {
    if (typeof value === 'string') return value;
    const rounded = Math.round(value * 100) / 100;
    return String(rounded).replace('.', ',');
  }

  const money = (value) => '$' + fmt(value);

  function numericOptions(answer, extras) {
    const out = [];
    const seen = new Set([fmt(answer)]);
    const push = (value) => {
      if (typeof value !== 'number' || !isFinite(value) || value < 0) return;
      const rounded = Math.round(value * 100) / 100;
      const text = fmt(rounded);
      if (seen.has(text)) return;
      seen.add(text);
      out.push(text);
    };
    (extras || []).forEach(push);
    const deltas = [1, -1, 2, -2, 3, -3, 10, -10, 5, -5, 20, -20];
    for (let i = 0; i < deltas.length && out.length < 3; i++) push(answer + deltas[i]);
    let k = 4;
    while (out.length < 3) {
      push(answer + k);
      push(answer - k);
      k += 7;
    }
    return out.slice(0, 3);
  }

  /**
   * Pregunta con respuesta numérica.
   * @param {string} topic id del tema
   * @param {string} prompt enunciado (admite <b>)
   * @param {number} answer respuesta correcta
   * @param {string} explanation explicación didáctica
   * @param {number[]} extras distractores plausibles
   */
  function numQ(topic, prompt, answer, explanation, extras) {
    const correct = fmt(answer);
    const wrongs = numericOptions(answer, extras).filter((t) => t !== correct);
    if (wrongs.length < 3) throw new Error('numQ sin distractores suficientes: ' + prompt);
    const options = shuffle([{ text: correct, correct: true }].concat(
      wrongs.map((t) => ({ text: t, correct: false }))
    ));
    return { topic, prompt, explanation, options };
  }

  /**
   * Pregunta con respuestas de texto (fracciones, %, álgebra...).
   */
  function textQ(topic, prompt, answerText, wrongTexts, explanation) {
    const seen = new Set([answerText]);
    const wrongs = [];
    for (let i = 0; i < wrongTexts.length && wrongs.length < 3; i++) {
      const text = String(wrongTexts[i]);
      if (seen.has(text)) continue;
      seen.add(text);
      wrongs.push(text);
    }
    if (wrongs.length < 3) throw new Error('textQ sin distractores suficientes: ' + prompt);
    const options = shuffle([{ text: answerText, correct: true }].concat(
      wrongs.map((t) => ({ text: t, correct: false }))
    ));
    return { topic, prompt, explanation, options };
  }

  /**
   * Pregunta cuya respuesta es una fracción "n/d". Los distractores se
   * deduplican por VALOR numérico (2/6 y 1/3 son la misma opción).
   * @param {Array<[number, number]>} wrongPairs pares [numerador, denominador]
   */
  function fracQ(topic, prompt, answerN, answerD, wrongPairs, explanation) {
    const target = answerN / answerD;
    const seen = new Set([target.toFixed(6)]);
    const wrongs = [];
    const add = (n, d) => {
      if (wrongs.length >= 3) return;
      if (!Number.isInteger(n) || !Number.isInteger(d) || d <= 0 || n < 0) return;
      const key = (n / d).toFixed(6);
      if (seen.has(key)) return;
      seen.add(key);
      wrongs.push(`${n}/${d}`);
    };
    wrongPairs.forEach(([n, d]) => add(n, d));
    let k = 2;
    while (wrongs.length < 3 && k < 20) {
      add(answerN + k, answerD);
      add(answerN, answerD + k);
      k++;
    }
    if (wrongs.length < 3) throw new Error('fracQ sin distractores suficientes: ' + prompt);
    const answer = `${answerN}/${answerD}`;
    const options = shuffle([{ text: answer, correct: true }].concat(
      wrongs.map((t) => ({ text: t, correct: false }))
    ));
    return { topic, prompt, explanation, options };
  }

  /* ------------------------------- temas ---------------------------------- */

  const TOPICS = {
    aritmetica: { name: 'Números', icon: '🔢', color: '#38bdf8' },
    fracciones: { name: 'Fracciones', icon: '🍕', color: '#f472b6' },
    porcentajes: { name: 'Porcentajes', icon: '💯', color: '#fbbf24' },
    potencias: { name: 'Potencias', icon: '⚡', color: '#a78bfa' },
    algebra: { name: 'Álgebra', icon: '🧮', color: '#34d399' },
    geometria: { name: 'Geometría', icon: '📐', color: '#fb7185' },
    logica: { name: 'Lógica', icon: '🧠', color: '#22d3ee' },
    estadistica: { name: 'Datos', icon: '📊', color: '#f59e0b' }
  };

  const NOMBRES = ['Mateo', 'Lucía', 'Sofía', 'Diego', 'Valentina', 'Martín', 'Camila', 'Andrés', 'Elena', 'Tomás'];
  const OBJETOS = [
    { s: 'cuaderno', p: 'cuadernos' }, { s: 'lápiz', p: 'lápices' },
    { s: 'chocolate', p: 'chocolates' }, { s: 'figurita', p: 'figuritas' },
    { s: 'manzana', p: 'manzanas' }, { s: 'calcomanía', p: 'calcomanías' }
  ];

  /* ----------------------------- Aritmética ------------------------------- */

  const aritmetica = [
    (d) => {
      const a = d === 1 ? ri(24, 89) : ri(148, 897);
      const b = d === 1 ? ri(13, 79) : ri(126, 786);
      return numQ('aritmetica', `¿Cuánto es <b>${a} + ${b}</b>?`, a + b,
        `Suma por columnas: ${a} + ${b} = <b>${a + b}</b>. Puedes empezar por las unidades, luego las decenas y por último las centenas.`,
        [a + b + 10, a + b - 10, Math.abs(a - b), a + b + 1]);
    },
    (d) => {
      const a = d === 1 ? ri(50, 99) : ri(420, 999);
      const b = d === 1 ? ri(12, 45) : ri(110, 389);
      return numQ('aritmetica', `¿Cuánto es <b>${a} − ${b}</b>?`, a - b,
        `Resta: ${a} − ${b} = <b>${a - b}</b>. Comprueba sumando: ${a - b} + ${b} = ${a}.`,
        [a - b + 10, a - b - 10, a + b, a - b + 1]);
    },
    (d) => {
      const a = d === 1 ? ri(3, 12) : ri(12, 29);
      const b = d === 1 ? ri(4, 12) : ri(4, 9);
      const dec = Math.floor(a / 10) * 10;
      const uni = a % 10;
      const detalle = a >= 10
        ? `Descompón ${a} = ${dec} + ${uni}. Multiplica ${dec} × ${b} = ${dec * b} y ${uni} × ${b} = ${uni * b}. Al sumar: ${a * b}.`
        : `Piensa en la tabla del ${a}: ${a} × ${b} = ${a * b}.`;
      return numQ('aritmetica', `¿Cuánto es <b>${a} × ${b}</b>?`, a * b,
        detalle, [a * b + b, a * b - b, a + b, a * b + 10]);
    },
    (d) => {
      const b = ri(2, 9);
      const cociente = d === 1 ? ri(3, 12) : ri(7, 25);
      const a = b * cociente;
      return numQ('aritmetica', `¿Cuánto es <b>${a} ÷ ${b}</b>?`, cociente,
        `Busca el número que multiplicado por ${b} da ${a}: ${b} × ${cociente} = ${a}. Entonces ${a} ÷ ${b} = <b>${cociente}</b>.`,
        [cociente + 1, cociente - 1, cociente * 2, a - b]);
    },
    (d) => {
      const a = ri(2, 9);
      const b = ri(2, 8);
      const c = ri(2, 6);
      const base = a + b;
      return numQ('aritmetica', `Resuelve: <b>(${a} + ${b}) × ${c}</b>`, base * c,
        `Primero los paréntesis: ${a} + ${b} = ${base}. Luego ${base} × ${c} = <b>${base * c}</b>.`,
        [a + b * c, base * (c + 1), base + c, base * c - 4]);
    },
    (d) => {
      const a = ri(2, 9);
      const b = ri(2, 8);
      const c = ri(2, 7);
      return numQ('aritmetica', `Resuelve: <b>${a} + ${b} × ${c}</b>`, a + b * c,
        `La multiplicación va antes que la suma: ${b} × ${c} = ${b * c}. Luego ${a} + ${b * c} = <b>${a + b * c}</b>.`,
        [(a + b) * c, a + b + c, a + b * c + 2, a * b + c]);
    },
    () => {
      const nombre = pick(NOMBRES);
      const obj = pick(OBJETOS);
      const cajas = ri(3, 9);
      const porCaja = ri(6, 15);
      return numQ('aritmetica', `${nombre} compra ${cajas} cajas con ${porCaja} ${obj.p} cada una. ¿Cuántos ${obj.p} tiene en total?`,
        cajas * porCaja,
        `Multiplica cajas por contenido: ${cajas} × ${porCaja} = <b>${cajas * porCaja}</b> ${obj.p}.`,
        [cajas + porCaja, cajas * porCaja + porCaja, cajas * porCaja - cajas]);
    },
    (d) => {
      const nombre = pick(NOMBRES);
      const amigos = ri(4, 9);
      const aCadaUno = d === 1 ? ri(3, 9) : ri(6, 18);
      const total = amigos * aCadaUno;
      return numQ('aritmetica', `${nombre} reparte <b>${total} ${pick(OBJETOS).p}</b> en partes iguales entre ${amigos} amigos. ¿Cuántos le tocan a cada uno?`,
        aCadaUno,
        `Divide el total entre la cantidad de amigos: ${total} ÷ ${amigos} = <b>${aCadaUno}</b>.`,
        [aCadaUno + 1, aCadaUno - 1, total - amigos, amigos]);
    }
  ];

  /* ----------------------------- Fracciones ------------------------------- */

  const FRACCIONES_BASICAS = [
    { n: 1, d: 2 }, { n: 1, d: 4 }, { n: 3, d: 4 }, { n: 1, d: 5 },
    { n: 2, d: 5 }, { n: 3, d: 5 }, { n: 1, d: 10 }, { n: 7, d: 10 },
    { n: 3, d: 8 }, { n: 5, d: 8 }
  ];

  const fracciones = [
    () => {
      const den = pick([3, 4, 5, 6, 7, 8, 9]);
      const n1 = ri(1, den - 1);
      const n2 = ri(1, den - 1);
      const suma = n1 + n2;
      return fracQ('fracciones', `Resuelve: <b>${n1}/${den} + ${n2}/${den}</b>`, suma, den,
        [[suma, den * 2], [n1 * n2, den], [suma + 1, den], [suma, den + 1], [suma - 1, den]],
        `Los denominadores son iguales, así que se suman solo los numeradores: ${n1} + ${n2} = ${suma}. El denominador se mantiene: <b>${suma}/${den}</b>.`);
    },
    (d) => {
      const den = pick(d === 1 ? [2, 3, 4, 5] : [3, 4, 5, 6, 8]);
      const num = ri(1, den - 1);
      const total = den * ri(3, 12);
      const answer = (total / den) * num;
      return numQ('fracciones', `¿Cuánto es <b>${num}/${den} de ${total}</b>?`, answer,
        `Primero divide el total en ${den} partes: ${total} ÷ ${den} = ${total / den}. Luego toma ${num} partes: ${total / den} × ${num} = <b>${answer}</b>.`,
        [total / den, answer + num, total - num, answer - 1]);
    },
    () => {
      const base = pick([{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 2, d: 3 }, { n: 1, d: 4 }, { n: 3, d: 4 }, { n: 2, d: 5 }]);
      const k = ri(2, 4);
      return numQ('fracciones', `Completa: <b>${base.n}/${base.d} = ?/${base.d * k}</b>`, base.n * k,
        `Multiplicamos numerador y denominador por el mismo número (${k}): ${base.n} × ${k} = ${base.n * k} y ${base.d} × ${k} = ${base.d * k}. La fracción equivalente es ${base.n * k}/${base.d * k}.`,
        [base.n + k, base.n * k + 1, base.d * k, base.n * (k + 1)]);
    },
    (d) => {
      const valores = [];
      const usados = new Set();
      const maxCandidatos = d === 1 ? [2, 3, 4, 6] : [2, 3, 4, 5, 6, 8];
      let intentos = 0;
      while (valores.length < 4 && intentos < 400) {
        intentos++;
        const den = pick(maxCandidatos);
        const num = ri(1, den - 1);
        const valor = num / den;
        const key = valor.toFixed(4);
        if (usados.has(key)) continue;
        usados.add(key);
        valores.push({ n: num, d: den, value: valor });
      }
      if (valores.length < 4) return fracciones[0](d);
      valores.sort((x, y) => x.value - y.value);
      const mayor = valores[valores.length - 1];
      const wrongPairs = valores.filter((v) => v !== mayor).map((v) => [v.n, v.d]);
      return fracQ('fracciones', '¿Cuál de estas fracciones es <b>la mayor</b>?', mayor.n, mayor.d, wrongPairs,
        `Compara con el mismo denominador o pasa a decimal: ${valores.map((v) => `${v.n}/${v.d} = ${fmt(v.value)}`).join(' · ')}. La mayor es <b>${mayor.n}/${mayor.d}</b>.`);
    },
    () => {
      const simple = pick([{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 2, d: 3 }, { n: 1, d: 4 }, { n: 3, d: 4 }, { n: 2, d: 5 }, { n: 3, d: 5 }, { n: 1, d: 5 }]);
      const k = ri(2, 4);
      const n = simple.n * k;
      const den = simple.d * k;
      const answer = `${simple.n}/${simple.d}`;
      return textQ('fracciones', `Simplifica la fracción <b>${n}/${den}</b>`, answer,
        [`${n}/${den}`, `${simple.n + 1}/${simple.d}`, `${simple.n}/${simple.d + 1}`, `${simple.n * 2}/${simple.d}`],
        `Divide numerador y denominador entre ${k}: ${n} ÷ ${k} = ${simple.n} y ${den} ÷ ${k} = ${simple.d}. Resultado: <b>${answer}</b>.`);
    },
    () => {
      const f = pick(FRACCIONES_BASICAS);
      const decimalText = fmt(f.n / f.d);
      const wrongPairs = FRACCIONES_BASICAS.filter((x) => x !== f).map((x) => [x.n, x.d]);
      return fracQ('fracciones', `¿Qué fracción equivale al número decimal <b>${decimalText}</b>?`, f.n, f.d, wrongPairs,
        `${decimalText} se lee como fracción decimal. Al simplificar se obtiene <b>${f.n}/${f.d}</b> (${f.n} ÷ ${f.d} = ${decimalText}).`);
    },
    () => {
      const a = pick([{ n: 1, d: 2, v: 0.5 }, { n: 1, d: 4, v: 0.25 }, { n: 3, d: 4, v: 0.75 }, { n: 1, d: 5, v: 0.2 }, { n: 2, d: 5, v: 0.4 }]);
      const b = pick([{ n: 1, d: 3, v: 1 / 3 }, { n: 2, d: 3, v: 2 / 3 }, { n: 1, d: 6, v: 1 / 6 }, { n: 5, d: 6, v: 5 / 6 }, { n: 1, d: 8, v: 0.125 }]);
      const suma = a.v + b.v;
      const den = a.d * b.d / gcd(a.d, b.d);
      const num = a.n * (den / a.d) + b.n * (den / b.d);
      return fracQ('fracciones', `Resuelve: <b>${a.n}/${a.d} + ${b.n}/${b.d}</b>`, num, den,
        [[a.n + b.n, a.d + b.d], [a.n + b.n, den], [num, den + 1], [num + 1, den], [a.n * b.n, den]],
        `Busca el mínimo común denominador (${den}): ${a.n}/${a.d} = ${a.n * (den / a.d)}/${den} y ${b.n}/${b.d} = ${b.n * (den / b.d)}/${den}. Sumando: <b>${num}/${den}</b> (aproximadamente ${fmt(suma)}).`);
    }
  ];

  /* ----------------------------- Porcentajes ------------------------------ */

  const porcentajes = [
    () => {
      const p = pick([10, 20, 25, 50, 75, 5, 15, 30]);
      const n = 20 * ri(2, 12);
      const answer = (n * p) / 100;
      return numQ('porcentajes', `¿Cuánto es el <b>${p}% de ${n}</b>?`, answer,
        `${p}% significa ${p} de cada 100. Calcula ${n} × ${p} ÷ 100 = <b>${answer}</b>.`,
        [p, n - answer, (n * p) / 100 + 5, n / 2]);
    },
    () => {
      const precio = 20 * ri(3, 12);
      const p = pick([10, 20, 25, 50]);
      const descuento = (precio * p) / 100;
      const answer = precio - descuento;
      return numQ('porcentajes', `Una mochila cuesta ${money(precio)} y tiene un <b>${p}% de descuento</b>. ¿Cuánto pagas?`, answer,
        `El descuento es ${precio} × ${p} ÷ 100 = ${money(descuento)}. Pagas ${precio} − ${descuento} = <b>${money(answer)}</b>.`,
        [descuento, precio + descuento, answer + 10, precio - descuento - 5]);
    },
    () => {
      const precio = 20 * ri(3, 10);
      const p = 15;
      const impuesto = (precio * p) / 100;
      const answer = precio + impuesto;
      return numQ('porcentajes', `Un artículo cuesta ${money(precio)} más el <b>IVA del ${p}%</b>. ¿Cuál es el precio final?`, answer,
        `IVA: ${precio} × ${p} ÷ 100 = ${money(impuesto)}. Precio final: ${precio} + ${impuesto} = <b>${money(answer)}</b>.`,
        [impuesto, precio - impuesto, answer + 3, precio + p]);
    },
    () => {
      const total = 20 * ri(2, 10);
      const p = pick([10, 20, 25, 50, 75]);
      const parte = (total * p) / 100;
      return textQ('porcentajes', `En una clase hay ${total} estudiantes y ${parte} practican fútbol. ¿Qué <b>porcentaje</b> practica fútbol?`, `${p}%`,
        ['10%', '20%', '25%', '50%', '75%', `${parte}%`].filter((t) => t !== `${p}%`),
        `Parte ÷ total × 100: ${parte} ÷ ${total} × 100 = <b>${p}%</b>.`);
    },
    () => {
      const cantidad = ri(3, 6);
      const precioUnitario = pick([2, 3, 4, 5]);
      const compra = ri(7, 11);
      const total = cantidad * precioUnitario;
      const answer = compra * precioUnitario;
      return numQ('porcentajes', `Si ${cantidad} lápices cuestan ${money(total)}, ¿cuánto cuestan <b>${compra} lápices</b>?`, answer,
        `Cada lápiz cuesta ${total} ÷ ${cantidad} = ${money(precioUnitario)}. Entonces ${compra} × ${money(precioUnitario)} = <b>${money(answer)}</b>. También puedes usar una regla de tres.`,
        [total + precioUnitario, compra * total, answer - precioUnitario, answer + cantidad]);
    },
    () => {
      const f = pick([{ n: 1, d: 4, p: 25 }, { n: 1, d: 2, p: 50 }, { n: 3, d: 4, p: 75 }, { n: 1, d: 5, p: 20 }, { n: 2, d: 5, p: 40 }, { n: 3, d: 5, p: 60 }, { n: 3, d: 10, p: 30 }]);
      return textQ('porcentajes', `¿A qué porcentaje equivale la fracción <b>${f.n}/${f.d}</b>?`, `${f.p}%`,
        ['10%', '20%', '25%', '40%', '50%', '60%', '75%', `${f.n}%`].filter((t) => t !== `${f.p}%`),
        `Convierte la fracción a decimal: ${f.n} ÷ ${f.d} = ${fmt(f.n / f.d)}. Luego multiplica por 100: <b>${f.p}%</b>.`);
    }
  ];

  /* ------------------------------ Potencias ------------------------------- */

  const potencias = [
    (d) => {
      const n = d === 1 ? ri(3, 12) : ri(11, 20);
      return numQ('potencias', `¿Cuánto es <b>${n}²</b>?`, n * n,
        `${n}² significa ${n} × ${n} = <b>${n * n}</b>.`,
        [n * 2, n * n + n, n * n - n, (n + 1) * (n + 1)]);
    },
    () => {
      const n = ri(2, 7);
      return numQ('potencias', `¿Cuánto es <b>${n}³</b>?`, n * n * n,
        `${n}³ = ${n} × ${n} × ${n} = <b>${n * n * n}</b>.`,
        [n * 3, n * n, n * n * n + n, n * n * n - n]);
    },
    () => {
      const n = ri(4, 16);
      return numQ('potencias', `¿Cuánto es <b>√${n * n}</b>?`, n,
        `Buscamos el número que al elevarlo al cuadrado da ${n * n}: ${n} × ${n} = ${n * n}. Por eso √${n * n} = <b>${n}</b>.`,
        [n + 1, n - 1, n * 2, n * n / 2]);
    },
    () => {
      const k = ri(2, 6);
      return numQ('potencias', `¿Cuánto es <b>10<sup>${k}</sup></b>?`, Math.pow(10, k),
        `10<sup>${k}</sup> es un 1 seguido de ${k} ceros: <b>${fmt(Math.pow(10, k))}</b>.`,
        [10 * k, Math.pow(10, k - 1), Math.pow(10, k) + 10, k * 1000]);
    },
    () => {
      const base = pick([2, 3, 5]);
      const a = ri(2, 4);
      const b = ri(2, 4);
      const answer = Math.pow(base, a + b);
      return numQ('potencias', `Simplifica y calcula: <b>${base}<sup>${a}</sup> × ${base}<sup>${b}</sup></b>`, answer,
        `Con la misma base se suman los exponentes: ${base}<sup>${a}</sup> × ${base}<sup>${b}</sup> = ${base}<sup>${a + b}</sup> = <b>${fmt(answer)}</b>.`,
        [Math.pow(base, a * b), Math.pow(base, a + b + 1), Math.pow(base, a) + Math.pow(base, b), Math.pow(base, a + b - 1)]);
    },
    () => {
      const a = ri(2, 5);
      const b = ri(2, 5);
      const c = ri(2, 6);
      return numQ('potencias', `Resuelve respetando el orden de operaciones: <b>${a} + ${b} × ${c}²</b>`, a + b * c * c,
        `Primero la potencia: ${c}² = ${c * c}. Luego la multiplicación: ${b} × ${c * c} = ${b * c * c}. Por último la suma: ${a} + ${b * c * c} = <b>${a + b * c * c}</b>.`,
        [(a + b) * c * c, a + b * c, a * b + c * c, a + b * c * c + c]);
    }
  ];

  /* ------------------------------- Álgebra -------------------------------- */

  const algebra = [
    (d) => {
      const a = ri(2, 9);
      const x = d === 1 ? ri(2, 10) : ri(4, 14);
      const b = ri(1, 15);
      const c = a * x + b;
      return numQ('algebra', `Resuelve la ecuación: <b>${a}x + ${b} = ${c}</b>. ¿Cuánto vale x?`, x,
        `Resta ${b} en ambos lados: ${a}x = ${c - b}. Luego divide entre ${a}: x = ${c - b} ÷ ${a} = <b>${x}</b>.`,
        [x + 1, x - 1, c - b, c / a]);
    },
    (d) => {
      const a = ri(2, 8);
      const x = d === 1 ? ri(3, 11) : ri(5, 15);
      const b = ri(2, 12);
      const c = a * x - b;
      return numQ('algebra', `Resuelve la ecuación: <b>${a}x − ${b} = ${c}</b>. ¿Cuánto vale x?`, x,
        `Suma ${b} en ambos lados: ${a}x = ${c + b}. Divide entre ${a}: x = ${c + b} ÷ ${a} = <b>${x}</b>.`,
        [x - 1, x + 1, c + b, c / a]);
    },
    () => {
      const a = ri(2, 6);
      const x = ri(4, 20);
      const result = x / a;
      if (!Number.isInteger(result)) return algebra[0](1);
      return numQ('algebra', `Resuelve la ecuación: <b>x ÷ ${a} = ${result}</b>. ¿Cuánto vale x?`, x,
        `Multiplica ambos lados por ${a}: x = ${result} × ${a} = <b>${x}</b>.`,
        [result, x + a, x - a, result * a * 2]);
    },
    () => {
      const a = ri(2, 6);
      const b = ri(1, 9);
      const x = ri(2, 10);
      const answer = a * x + b;
      return numQ('algebra', `Si <b>x = ${x}</b>, ¿cuál es el valor de <b>${a}x + ${b}</b>?`, answer,
        `Sustituye x por ${x}: ${a} × ${x} + ${b} = ${a * x} + ${b} = <b>${answer}</b>.`,
        [a + x + b, a * x, answer + a, answer - b]);
    },
    (d) => {
      const inicio = ri(2, 9);
      const paso = d === 1 ? ri(2, 5) : ri(3, 9);
      const terminos = [inicio, inicio + paso, inicio + paso * 2, inicio + paso * 3];
      const answer = inicio + paso * 4;
      return numQ('algebra', `¿Qué número sigue en la secuencia? <b>${terminos.join(', ')}, ...</b>`, answer,
        `Cada término aumenta ${paso}: ${terminos[3]} + ${paso} = <b>${answer}</b>. Comprueba la diferencia entre términos consecutivos: siempre es ${paso}.`,
        [answer + paso, answer - 1, terminos[3] * 2, answer - paso]);
    },
    () => {
      const a = ri(2, 7);
      const b = ri(2, 8);
      const c = ri(1, a + b - 1);
      const answer = `${a + b - c}x`;
      return textQ('algebra', `Simplifica: <b>${a}x + ${b}x − ${c}x</b>`, answer,
        [`${a + b + c}x`, `${a + b - c}x²`, `${a * b - c}x`, `${a + b - c}`],
        `Todos los términos tienen la misma letra x, así que se suman sus coeficientes: ${a} + ${b} − ${c} = ${a + b - c}. Resultado: <b>${answer}</b>.`);
    },
    () => {
      const x = ri(2, 9);
      const a = ri(2, 6);
      const b = ri(2, 15);
      const total = a * x + b;
      return numQ('algebra', `Pienso un número, lo multiplico por ${a} y le sumo ${b}. Obtengo ${total}. ¿Qué número pensé?`, x,
        `La ecuación es ${a}x + ${b} = ${total}. Resta ${b}: ${a}x = ${total - b}. Divide entre ${a}: x = <b>${x}</b>.`,
        [x + 1, total - b, total / a, x - 1]);
    }
  ];

  /* ------------------------------ Geometría ------------------------------- */

  const geometria = [
    () => {
      const base = ri(4, 15);
      const altura = ri(3, 12);
      const area = base * altura;
      return numQ('geometria', `Un rectángulo mide <b>${base} cm de base</b> y <b>${altura} cm de altura</b>. ¿Cuál es su área?`, area,
        `Área del rectángulo = base × altura = ${base} × ${altura} = <b>${area} cm²</b>.`,
        [base + altura, 2 * (base + altura), area + base, area - altura]);
    },
    () => {
      const base = ri(5, 18);
      const altura = ri(3, 12);
      const perimetro = 2 * (base + altura);
      return numQ('geometria', `Un rectángulo mide <b>${base} cm</b> por <b>${altura} cm</b>. ¿Cuál es su perímetro?`, perimetro,
        `Perímetro = 2 × (base + altura) = 2 × (${base} + ${altura}) = <b>${perimetro} cm</b>.`,
        [base * altura, base + altura, perimetro + 2, 4 * base]);
    },
    () => {
      const base = 2 * ri(2, 9);
      const altura = ri(3, 12);
      const area = (base * altura) / 2;
      return numQ('geometria', `Un triángulo tiene base de <b>${base} cm</b> y altura de <b>${altura} cm</b>. ¿Cuál es su área?`, area,
        `Área del triángulo = (base × altura) ÷ 2 = (${base} × ${altura}) ÷ 2 = <b>${area} cm²</b>.`,
        [base * altura, base + altura, area * 2 + 1, area - 2]);
    },
    () => {
      const radio = ri(2, 8);
      const pi = 3.14;
      const area = Math.round(pi * radio * radio * 100) / 100;
      return numQ('geometria', `Una pizza tiene <b>${radio} cm de radio</b>. Usando π = 3,14, ¿cuál es su área?`, area,
        `Área del círculo = π × r² = 3,14 × ${radio}² = 3,14 × ${radio * radio} = <b>${fmt(area)} cm²</b>.`,
        [Math.round(2 * pi * radio * 100) / 100, pi * radio, area + pi, radio * radio]);
    },
    () => {
      const a = ri(30, 80);
      const b = ri(20, 60);
      if (a + b >= 170) return geometria[0]();
      return numQ('geometria', `Dos ángulos de un triángulo miden <b>${a}°</b> y <b>${b}°</b>. ¿Cuánto mide el tercer ángulo?`, 180 - a - b,
        `La suma de los ángulos internos de un triángulo es 180°: 180 − ${a} − ${b} = <b>${180 - a - b}°</b>.`,
        [a + b, 90 - a, 180 - a, 360 - a - b]);
    },
    () => {
      const a = ri(20, 150);
      return numQ('geometria', `Un ángulo mide <b>${a}°</b>. ¿Cuánto mide su ángulo <b>suplementario</b>?`, 180 - a,
        `Dos ángulos suplementarios suman 180°: 180 − ${a} = <b>${180 - a}°</b>.`,
        [90 - a, 360 - a, 180 + a, a]);
    },
    () => {
      const lado = ri(2, 9);
      return numQ('geometria', `Un cubo tiene aristas de <b>${lado} cm</b>. ¿Cuál es su volumen?`, lado * lado * lado,
        `Volumen del cubo = arista³ = ${lado} × ${lado} × ${lado} = <b>${lado ** 3} cm³</b>.`,
        [lado * lado, 6 * lado * lado, lado * 3, lado ** 3 + lado]);
    }
  ];

  /* -------------------------------- Lógica -------------------------------- */

  const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  const logica = [
    () => {
      const inicio = ri(1, 6);
      const paso = ri(3, 8);
      const terminos = [inicio, inicio + paso, inicio + paso * 2, inicio + paso * 3];
      const answer = inicio + paso * 4;
      return numQ('logica', `¿Qué número sigue? <b>${terminos.join(', ')}, ...</b>`, answer,
        `La secuencia suma ${paso} cada vez: ${terminos[3]} + ${paso} = <b>${answer}</b>.`,
        [answer + paso, answer - 1, terminos[3] * 2, answer - paso]);
    },
    () => {
      const factor = pick([2, 3]);
      const inicio = ri(1, 3);
      const terminos = [inicio, inicio * factor, inicio * factor ** 2, inicio * factor ** 3];
      const answer = inicio * factor ** 4;
      return numQ('logica', `¿Qué número sigue? <b>${terminos.join(', ')}, ...</b>`, answer,
        `Cada término se multiplica por ${factor}: ${terminos[3]} × ${factor} = <b>${answer}</b>.`,
        [answer + factor, terminos[3] * factor * 2, answer - factor, terminos[3] + factor]);
    },
    () => {
      const n = ri(2, 6);
      const terminos = [1, 1, 2, 3, 5, 8, 13, 21];
      const start = ri(0, 3);
      const slice = terminos.slice(start, start + 5);
      const answer = slice[slice.length - 1] + slice[slice.length - 2];
      return numQ('logica', `Esta es la sucesión de Fibonacci. ¿Qué número sigue? <b>${slice.join(', ')}, ...</b>`, answer,
        `Cada término es la suma de los dos anteriores: ${slice[slice.length - 2]} + ${slice[slice.length - 1]} = <b>${answer}</b>.`,
        [answer + 1, slice[slice.length - 1] * 2, answer - 2, answer + 3]);
    },
    () => {
      const a = ri(6, 18);
      const b = ri(4, 15);
      const mcd = gcd(a, b);
      return numQ('logica', `¿Cuál es el <b>máximo común divisor (MCD)</b> de ${a} y ${b}?`, mcd,
        `Divisores de ${a}: ${divisores(a).join(', ')}. Divisores de ${b}: ${divisores(b).join(', ')}. El mayor que comparten es <b>${mcd}</b>.`,
        [a * b, Math.min(a, b), mcd + 1, lcm(a, b)]);
    },
    () => {
      const a = ri(3, 9);
      const b = ri(4, 12);
      const answer = lcm(a, b);
      return numQ('logica', `¿Cuál es el <b>mínimo común múltiplo (MCM)</b> de ${a} y ${b}?`, answer,
        `Múltiplos de ${a}: ${multiplos(a).join(', ')}... Múltiplos de ${b}: ${multiplos(b).join(', ')}... El primero que coincide es <b>${answer}</b>.`,
        [a * b, a + b, answer / 2, answer + a]);
    },
    () => {
      const x = ri(6, 14);
      const total = x * 3;
      return numQ('logica', `Ana tiene el <b>doble</b> de la edad de Beto. Si entre los dos suman <b>${total} años</b>, ¿cuántos años tiene Ana?`, x * 2,
        `Si Beto tiene b años, Ana tiene 2b. Entonces b + 2b = ${total}, es decir 3b = ${total}, así que b = ${x}. Ana tiene 2 × ${x} = <b>${x * 2}</b> años.`,
        [x, total - x, x * 2 + 2, x * 3]);
    },
    () => {
      const hoy = ri(0, 6);
      const suma = ri(10, 20);
      const answer = DIAS[(hoy + suma) % 7];
      return textQ('logica', `Si hoy es <b>${DIAS[hoy]}</b>, ¿qué día de la semana será dentro de <b>${suma} días</b>?`, answer,
        DIAS.filter((d) => d !== answer),
        `Una semana tiene 7 días. ${suma} ÷ 7 deja resto ${suma % 7}. Avanza ${suma % 7} días desde el ${DIAS[hoy]}: <b>${answer}</b>.`);
    },
    () => {
      const n = ri(2, 6);
      return textQ('logica', 'Si multiplicas un número <b>par</b> por un número <b>impar</b>, el resultado es siempre…', 'par',
        ['impar', 'a veces par y a veces impar', 'siempre cero'],
        `Todo número par es 2 × k. Al multiplicarlo por un impar: 2 × (k × impar), que sigue siendo par. Ejemplo: 4 × 3 = 12 (par).`);
    }
  ];

  /* ----------------------------- Estadística ------------------------------ */

  const estadistica = [
    () => {
      let nums;
      let suma = 0;
      do {
        nums = [ri(2, 15), ri(2, 15), ri(2, 15), ri(2, 15)];
        suma = nums.reduce((t, n) => t + n, 0);
      } while (suma % 4 !== 0);
      const media = suma / 4;
      return numQ('estadistica', `Calcula la <b>media</b> de estos datos: <b>${nums.join(', ')}</b>`, media,
        `Suma todos los datos: ${nums.join(' + ')} = ${suma}. Divide entre la cantidad de datos: ${suma} ÷ 4 = <b>${media}</b>.`,
        [suma, media + 1, media - 1, Math.max(...nums)]);
    },
    (d) => {
      const cantidad = d === 2 ? 6 : 5;
      const nums = [];
      while (nums.length < cantidad) {
        const n = ri(2, 40);
        if (nums.indexOf(n) === -1) nums.push(n);
      }
      const ordenados = nums.slice().sort((a, b) => a - b);
      const medio = Math.floor(cantidad / 2);
      const mediana = cantidad % 2 === 1
        ? ordenados[medio]
        : (ordenados[medio - 1] + ordenados[medio]) / 2;
      const media = nums.reduce((t, n) => t + n, 0) / cantidad;
      const detalle = cantidad % 2 === 1
        ? `Como hay ${cantidad} datos, la mediana es el del centro: <b>${fmt(mediana)}</b>.`
        : `Con ${cantidad} datos, la mediana es el promedio de los dos centrales: (${ordenados[medio - 1]} + ${ordenados[medio]}) ÷ 2 = <b>${fmt(mediana)}</b>.`;
      return numQ('estadistica', `¿Cuál es la <b>mediana</b> de estos datos? <b>${nums.join(', ')}</b>`, mediana,
        `Ordena los datos de menor a mayor: ${ordenados.join(', ')}. ${detalle}`,
        [ordenados[medio - 1], ordenados[medio], Math.round(media), ordenados[0]]);
    },
    () => {
      const repetido = ri(3, 8);
      const otros = [];
      while (otros.length < 3) {
        const candidato = ri(2, 20);
        if (candidato === repetido || otros.indexOf(candidato) !== -1) continue;
        otros.push(candidato);
      }
      const nums = shuffle(otros.concat([repetido, repetido, repetido]));
      return numQ('estadistica', `¿Cuál es la <b>moda</b> de estos datos? <b>${nums.join(', ')}</b>`, repetido,
        `La moda es el dato que más se repite. Aquí el ${repetido} aparece 3 veces y los demás una sola vez, así que la moda es <b>${repetido}</b>.`,
        [otros[0], otros[1], otros[2], repetido + 1]);
    },
    () => {
      const nums = [ri(3, 12), ri(15, 25), ri(26, 40), ri(41, 60)];
      const ordenados = nums.slice().sort((a, b) => a - b);
      const rango = ordenados[3] - ordenados[0];
      return numQ('estadistica', `¿Cuál es el <b>rango</b> de estos datos? <b>${nums.join(', ')}</b>`, rango,
        `El rango es el mayor menos el menor: ${ordenados[3]} − ${ordenados[0]} = <b>${rango}</b>.`,
        [ordenados[3], ordenados[0], rango + ordenados[0], nums[1]]);
    },
    () => {
      const rojas = ri(2, 6);
      const azules = ri(2, 7);
      const total = rojas + azules;
      const g = gcd(rojas, total);
      return fracQ('estadistica', `En una bolsa hay <b>${rojas} pelotas rojas</b> y <b>${azules} azules</b>. Si sacas una al azar, ¿cuál es la probabilidad de que sea <b>roja</b>?`, rojas, total,
        [[azules, total], [rojas, azules], [rojas, total + 1], [total, rojas], [azules, rojas]],
        `Probabilidad = casos favorables ÷ casos posibles = ${rojas} ÷ ${total} = <b>${rojas}/${total}</b>. ${g > 1 ? `Simplificada también es ${rojas / g}/${total / g}.` : 'Esta fracción ya está simplificada.'}`);
    },
    () => {
      const objetivo = pick([{ txt: 'un número par', casos: 3, n: 1, d: 2, lista: '2, 4 y 6' },
        { txt: 'un número mayor que 4', casos: 2, n: 1, d: 3, lista: '5 y 6' },
        { txt: 'un número menor que 3', casos: 2, n: 1, d: 3, lista: '1 y 2' },
        { txt: 'un número impar', casos: 3, n: 1, d: 2, lista: '1, 3 y 5' }]);
      return fracQ('estadistica', `Lanzas un dado de 6 caras. ¿Cuál es la probabilidad de obtener <b>${objetivo.txt}</b>?`, objetivo.n, objetivo.d,
        [[objetivo.casos, 6], [1, 6], [5, 6], [2, 3], [1, 2], [3, 4]],
        `Los casos favorables son ${objetivo.lista}: ${objetivo.casos} de 6 posibles. Probabilidad = ${objetivo.casos}/6, que simplificado es <b>${objetivo.n}/${objetivo.d}</b>.`);
    }
  ];

  const GENERADORES = {
    aritmetica, fracciones, porcentajes, potencias, algebra, geometria, logica, estadistica
  };

  /* --------------------------- utilidades extra --------------------------- */

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const t = b; b = a % b; a = t; }
    return a || 1;
  }

  function lcm(a, b) {
    return (a * b) / gcd(a, b);
  }

  function divisores(n) {
    const out = [];
    for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
    return out;
  }

  function multiplos(n) {
    const out = [];
    for (let i = 1; i <= 6; i++) out.push(n * i);
    return out;
  }

  /* ------------------------------- API ------------------------------------ */

  /**
   * Genera una pregunta de un tema.
   * @param {string} topic
   * @param {number} difficulty 1 (10-12 años) o 2 (13-15 años)
   */
  function generate(topic, difficulty) {
    const d = difficulty === 2 ? 2 : 1;
    const gens = GENERADORES[topic];
    if (!gens) throw new Error('Tema desconocido: ' + topic);
    const raw = pick(gens)(d);
    const meta = TOPICS[raw.topic];
    return {
      topic: raw.topic,
      topicName: meta.name,
      icon: meta.icon,
      color: meta.color,
      prompt: raw.prompt,
      explanation: raw.explanation,
      options: raw.options,
      difficulty: d
    };
  }

  /** Pregunta mezclada de cualquier tema (jefes, retos diarios, contrarreloj). */
  function generateMixed(difficulty, excludeTopic) {
    let topics = Object.keys(GENERADORES);
    if (excludeTopic) topics = topics.filter((t) => t !== excludeTopic);
    return generate(pick(topics), difficulty);
  }

  const MQ = {
    TOPICS,
    generate,
    generateMixed,
    _internals: { gcd, lcm, fmt, shuffle, numericOptions }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MQ;
  else global.MQ = MQ;
})(typeof window !== 'undefined' ? window : globalThis);
