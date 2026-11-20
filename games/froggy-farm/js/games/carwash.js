/* The elephant car wash: pick a muddy truck, bus, tractor or race car. The elephant sprays it,
 * then soap it, scrub it (rub with a finger, or tap the sponge), rinse it and dry it. Paint it
 * (red + yellow makes orange, and so on), stick stickers on it, then tap the traffic light and
 * it drives around the block. Sometimes it comes back muddy. Nothing can go wrong. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const svg = $('#carwash');
  const layer = { fx: $('#cw-fx'), bubbles: $('#cw-bubbles') };
  const K = Kit(svg, layer);
  const { el, anim, toSvg, tween, sparkles, rings, talk, rand, pick, lerp, wait, starPath, shapes } = K;
  const bay = $('#cw-bay'), board = svg, stickerSheet = $('#cw-stickers');
  const toolsG = $('#cw-tools'), paintsG = $('#cw-paints');
  const PANELS = { tools: $('#cw-tools-panel'), paint: $('#cw-paint-panel'), stickers: $('#cw-stk-panel'), light: $('#cw-light'), newcar: $('#cw-new') };
  const light = $('#cw-light'), elephant = $('#cw-elephant'), elAnim = elephant.querySelector('.anim');

  const SPOT = { x: 800, y: 720 };
  const EL = { x: 300, y: 720, s: 0.85 };
  const TRUNK_TIP = { x: EL.x + 260 * EL.s, y: EL.y - 304 * EL.s };
  const WIN = '#cdeeff', LINE = 'rgba(0,0,0,.28)';

  /* ---------- the vehicles ---------- */
  const TYPES = {
    truck: {
      color: '#ff5a4e', horn: 'beep', line: 'Beep beep!',
      wheels: [[-130, -46, 46], [130, -46, 46]],
      area: [[-200, -145, -25, -62], [-15, -150, 205, -62]],
      draw(g, P) {
        P('rect', { x: -205, y: -150, width: 190, height: 96, rx: 12 });
        P('path', { d: 'M-20 -54 L-20 -230 Q-20 -246 -4 -246 L92 -246 Q110 -246 120 -226 L160 -152 L198 -142 Q214 -138 214 -120 L214 -54 Z' });
        el('path', { d: 'M4 -226 L86 -226 L120 -162 L4 -162 Z', fill: WIN, stroke: LINE, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
        el('circle', { cx: 202, cy: -116, r: 10, fill: '#fff6a0', stroke: LINE, 'stroke-width': 3 }, g);
        el('rect', { x: 196, y: -84, width: 30, height: 22, rx: 6, fill: '#cfd6dc', stroke: LINE, 'stroke-width': 3 }, g);
        el('path', { d: 'M70 -146 V-70 M84 -128 H100', stroke: LINE, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
      },
    },
    bus: {
      color: '#ffd23f', horn: 'honk', line: 'Honk honk!',
      wheels: [[-140, -44, 44], [130, -44, 44]],
      area: [[-205, -160, 140, -64], [-205, -250, 205, -236]],
      draw(g, P) {
        P('rect', { x: -218, y: -258, width: 436, height: 204, rx: 30 });
        for (let i = 0; i < 5; i++) el('rect', { x: -192 + i * 68, y: -232, width: 54, height: 62, rx: 10, fill: WIN, stroke: LINE, 'stroke-width': 4 }, g);
        el('rect', { x: 150, y: -232, width: 48, height: 160, rx: 8, fill: WIN, stroke: LINE, 'stroke-width': 4 }, g);
        el('path', { d: 'M174 -232 V-72', stroke: LINE, 'stroke-width': 4 }, g);
        el('rect', { x: -218, y: -150, width: 368, height: 12, fill: 'rgba(0,0,0,.16)' }, g);
        el('circle', { cx: 206, cy: -84, r: 9, fill: '#fff6a0', stroke: LINE, 'stroke-width': 3 }, g);
      },
    },
    tractor: {
      color: '#4fbf4a', horn: 'putt', line: 'Putt putt putt!',
      wheels: [[-110, -86, 86], [140, -50, 50]],
      area: [[-178, -175, -45, -150], [-30, -168, 182, -86]],
      draw(g, P) {
        el('rect', { x: 120, y: -246, width: 18, height: 76, rx: 6, fill: '#5b6670', stroke: LINE, 'stroke-width': 3 }, g);
        P('rect', { x: -40, y: -176, width: 232, height: 100, rx: 18 });
        P('rect', { x: -186, y: -292, width: 152, height: 216, rx: 16 });
        el('rect', { x: -166, y: -272, width: 112, height: 92, rx: 12, fill: WIN, stroke: LINE, 'stroke-width': 4 }, g);
        el('path', { d: 'M150 -160 V-96 M166 -160 V-96 M182 -160 V-96', stroke: LINE, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
      },
    },
    race: {
      color: '#3d8bff', horn: 'vroom', line: 'Vroom vroom!',
      wheels: [[-135, -42, 42], [135, -42, 42]],
      area: [[-200, -112, 200, -64]],
      draw(g, P) {
        P('path', { d: 'M-216 -118 L-216 -152 L-150 -152 L-160 -118 Z' });
        P('path', { d: 'M-216 -58 Q-212 -112 -150 -120 L-62 -126 Q-22 -186 60 -180 Q112 -176 140 -126 L202 -112 Q222 -102 216 -58 Z' });
        el('path', { d: 'M-38 -130 Q-8 -168 50 -166 Q90 -163 110 -130 Z', fill: WIN, stroke: LINE, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
        el('circle', { cx: -100, cy: -88, r: 24, fill: '#fff', stroke: LINE, 'stroke-width': 3 }, g);
        el('path', { d: starPath(16, 7), transform: 'translate(-100,-88)', fill: '#ffd93b' }, g);
        el('circle', { cx: 204, cy: -84, r: 8, fill: '#fff6a0' }, g);
      },
    },
  };

  function makeVehicle(type, parent) {
    const T = TYPES[type];
    const g = el('g', { class: 'cw-veh' }, parent);
    g.style.setProperty('--body', T.color);
    const a = el('g', { class: 'anim' }, g);
    const body = el('g', {}, a);
    const P = (tag, attrs) => el(tag, Object.assign({ class: 'paint', 'stroke-width': 6, 'stroke-linejoin': 'round' }, attrs), body);
    T.draw(body, P);
    const glit = el('g', { class: 'glit' }, a);
    const wheels = T.wheels.map(([x, y, r]) => {
      const w = el('g', { transform: `translate(${x},${y})` }, a);
      const s = el('g', {}, w);
      el('circle', { r, fill: '#2f343a', stroke: '#1d2126', 'stroke-width': 5 }, s);
      el('circle', { r: r * 0.46, fill: '#d6dde3', stroke: '#9aa5ae', 'stroke-width': 4 }, s);
      el('path', { d: `M0 ${-r * 0.42} V${r * 0.42} M${-r * 0.42} 0 H${r * 0.42}`, stroke: '#9aa5ae', 'stroke-width': 5 }, s);
      return s;
    });
    const V = {
      type, T, g, a, body, glit, wheels, x: 0, y: 0, s: 1,
      stk: el('g', {}, a), mud: el('g', {}, a), bub: el('g', {}, a), drips: el('g', {}, a),
      paint: 'base', wet: false, cleanSaid: false, shinySaid: false, stickers: [], done: {}, scrub: 0, decorated: false,
    };
    g._V = V;
    return V;
  }
  function place(V, x, y, s) {
    V.x = x; V.y = y; V.s = s;
    V.g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(3)})`);
  }
  const areaPoint = V => {
    const ar = pick(V.T.area);
    return [rand(ar[0], ar[2]), rand(ar[1], ar[3])];
  };
  const toLocal = (V, p) => ({ x: (p.x - V.x) / V.s, y: (p.y - V.y) / V.s });
  const overVehicle = (V, p) => { const l = toLocal(V, p); return l.x > -230 && l.x < 230 && l.y > -300 && l.y < 10; };
  let spinAnims = [];
  function spin(V, on, ms = 450) {
    spinAnims.forEach(a => a && a.cancel()); spinAnims = [];
    if (on) spinAnims = V.wheels.map(w => anim(w, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], ms, { iterations: Infinity, easing: 'linear' }));
  }
  const bounce = (V, h = 18) => anim(V.a, [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px) scale(1.02,.98)` }, { transform: 'translateY(0)' }], 360);
  const hop = (node, h = 16, delay = 0) => anim(node, [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }, { transform: 'translateY(0)' }], 420, { delay });

  /* ---------- mud, bubbles, drips ---------- */
  function addMud(V, n = 9) {
    for (let i = 0; i < n; i++) {
      const [x, y] = areaPoint(V);
      const h = el('g', { transform: `translate(${x.toFixed(0)},${y.toFixed(0)})`, class: 'cw-mud' }, V.mud);
      const m = el('g', {}, h);
      const c = pick(['#8b5a2b', '#7a4a22', '#94643a']);
      el('circle', { r: rand(18, 28).toFixed(0), fill: c }, m);
      for (let j = 0; j < 3; j++) el('circle', { cx: rand(-26, 26).toFixed(0), cy: rand(-18, 18).toFixed(0), r: rand(8, 16).toFixed(0), fill: c }, m);
      el('circle', { cx: rand(-30, 30).toFixed(0), cy: rand(12, 30).toFixed(0), r: 6, fill: c }, m);
      h._x = x; h._y = y;
    }
  }
  const mudLeft = V => V.mud.querySelectorAll('.cw-mud:not(.gone)');
  function removeMud(V, h, delay = 0) {
    if (h.classList.contains('gone')) return;
    h.classList.add('gone');
    const a = anim(h.firstChild, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.2) translateY(10px)', opacity: 0 }], 380, { delay, fill: 'forwards' });
    setTimeout(() => h.remove(), 400 + delay);
    if (!a) h.remove();
  }
  function addBubbles(V, n, px, py) {
    for (let i = 0; i < n; i++) {
      const [x, y] = px != null ? [px, py] : areaPoint(V);
      const h = el('g', { transform: `translate(${(x + rand(-20, 20)).toFixed(0)},${(y + rand(-20, 10)).toFixed(0)})`, class: 'cw-bubble' }, V.bub);
      const b = el('g', {}, h);
      const r = rand(14, 30);
      el('circle', { r: r.toFixed(0), fill: 'rgba(255,255,255,.6)', stroke: '#fff', 'stroke-width': 3 }, b);
      el('circle', { cx: (-r * 0.35).toFixed(0), cy: (-r * 0.35).toFixed(0), r: (r * 0.25).toFixed(0), fill: '#fff' }, b);
      h._x = +h.getAttribute('transform').match(/translate\(([-\d.]+)/)[1];
      h._y = +h.getAttribute('transform').match(/,([-\d.]+)\)/)[1];
      anim(b, [{ transform: 'scale(0)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], 300, { delay: i * 35, fill: 'backwards' });
    }
  }
  const bubblesLeft = V => V.bub.querySelectorAll('.cw-bubble:not(.gone)');
  function popBubble(V, h, delay = 0, quiet) {
    if (h.classList.contains('gone')) return;
    h.classList.add('gone');
    setTimeout(() => {
      if (!quiet) Sound.play('pop');
      sparkles(V.x + h._x * V.s, V.y + h._y * V.s, { n: 3, colors: ['#fff', '#bfe9ff'], shape: 'dot', size: 6, spread: 40 });
      h.remove();
    }, delay);
  }
  function setWet(V, on) {
    V.wet = on;
    V.drips.innerHTML = '';
    if (!on) return;
    V.T.area.forEach(ar => {
      for (let i = 0; i < 3; i++) {
        const h = el('g', { transform: `translate(${rand(ar[0], ar[2]).toFixed(0)},${ar[3]})` }, V.drips);
        const d = el('path', { d: shapes.drop(9), fill: '#7cc8ff', class: 'cw-drip' }, h);
        d.style.animationDelay = (-rand(0, 1.4)).toFixed(2) + 's';
      }
    });
  }

  /* ---------- steps: pick a car, wash it, then paint and stickers ---------- */
  let stage = '';
  const SHOW = { pick: [], wash: ['tools', 'newcar'], decorate: ['paint', 'stickers', 'light', 'newcar'] };
  function setStage(s) {
    if (s === stage) return;
    stage = s;
    for (const k in PANELS) {
      const n = PANELS[k], on = SHOW[s].includes(k), shown = n.style.display !== 'none';
      if (on && !shown) {
        n.style.display = '';
        const from = k === 'tools' || k === 'paint' ? 'translateY(-200px)' : k === 'stickers' ? 'translateX(320px)' : 'scale(0)';
        if (k === 'light' || k === 'newcar') anim(n.querySelector('.anim') || n, [{ opacity: 0 }, { opacity: 1 }], 400);
        else anim(n, [{ transform: from }, { transform: 'translate(0,0)' }], 500, { easing: 'cubic-bezier(.3,1.4,.5,1)' });
      } else if (!on && shown) {
        const a = anim(n, [{ opacity: 1 }, { opacity: 0 }], 250);
        if (a) a.onfinish = () => { if (!SHOW[stage].includes(k)) n.style.display = 'none'; }; else n.style.display = 'none';
      }
    }
  }
  /* The wash is five steps, always in this order. The tool for the next step glows, the
   * others fade back, a hand points at it, and each finished step gets a check mark. */
  const STEPS = [
    { k: 'spray', tool: 'water', say: 'Spray it with water!' },
    { k: 'soap', tool: 'soap', say: 'Now the soap!' },
    { k: 'scrub', tool: 'sponge', say: 'Scrub scrub scrub!' },
    { k: 'rinse', tool: 'water', say: 'Spray it again!' },
    { k: 'dry', tool: 'fan', say: 'Dry it with the fan!' },
  ];
  const nextStep = C => STEPS.find(st => !C.done[st.k]);
  const SCRUB_NEED = 1400;
  const hand = el('g', { id: 'cw-hand', 'pointer-events': 'none', style: 'display:none' }, svg);
  {
    const b = el('g', { class: 'hand-bob' }, hand);
    el('rect', { x: -11, y: 0, width: 22, height: 54, rx: 11, fill: '#fff', stroke: '#26323d', 'stroke-width': 5 }, b);
    el('path', { d: 'M-30 50 Q-32 34 -16 34 L28 34 Q42 34 40 52 L38 80 Q36 98 16 98 L-12 98 Q-30 98 -30 80 Z', fill: '#fff', stroke: '#26323d', 'stroke-width': 5, 'stroke-linejoin': 'round' }, b);
    el('path', { d: 'M8 36 V50 M22 36 V50', stroke: '#26323d', 'stroke-width': 4, 'stroke-linecap': 'round' }, b);
  }
  let handAt = '';
  function pointAt(x, y) {
    const key = x + ',' + y;
    if (key === handAt) return;
    handAt = key;
    hand.style.display = '';
    hand.setAttribute('transform', `translate(${x},${y})`);
    anim(hand.firstChild, [{ opacity: 0 }, { opacity: 1 }], 300);
  }
  function hideHand() { hand.style.display = 'none'; handAt = ''; }
  const toolBtn = t => toolsG.querySelector(`[data-tool=${t}]`);
  function updateGuide() {
    toolsG.querySelectorAll('[data-act=tool]').forEach(b => {
      const t = b.dataset.tool, st = nextStep(V || { done: {} });
      b.classList.toggle('cw-next', stage === 'wash' && !!V && !!st && st.tool === t);
      b.classList.toggle('dim', stage === 'wash' && !!V && !!st && st.tool !== t);
      b.classList.toggle('done', !!V && (t === 'water' ? !!V.done.rinse : !!V.done[STEPS.find(x => x.tool === t).k]));
    });
    light.classList.toggle('cw-next', stage === 'decorate' && !!V && V.decorated);
    if (busy || App.current !== 'carwash') return hideHand();
    if (stage === 'pick' && choices.length) return pointAt(800, 735);
    if (stage === 'wash' && V) { const st = nextStep(V); if (st) { const b = toolBtn(st.tool); return pointAt(+b.dataset.x + 6, 146); } }
    if (stage === 'decorate' && V) return V.decorated ? pointAt(806, 376) : pointAt(806, 150);
    hideHand();
  }
  function stepDone(C, k) {
    if (C !== V || C.done[k]) return;
    C.done[k] = true;
    const i = STEPS.findIndex(st => st.k === k), b = toolBtn(STEPS[i].tool);
    Sound.play('chime', i + 1);
    sparkles(+b.dataset.x, +b.dataset.y, { n: 8, colors: ['#5cdc4a', '#ffe14d', '#fff'], spread: 90 });
    updateGuide();
    const nx = nextStep(C);
    if (nx && k !== 'rinse') setTimeout(() => { if (V === C && nextStep(C) === nx) elSay(nx.say); }, 900);
  }
  function maybeFinish(C) {
    if (C !== V || stage !== 'wash' || !C.done.dry) return;
    // all five steps done: a big hooray, then the paint and stickers come in
    Sound.play('cheer'); Sound.play('trumpet');
    flapEar(3);
    anim(elAnim, [{ transform: 'translateY(0)' }, { transform: 'translateY(-30px)' }, { transform: 'translateY(0)' }], 400, { iterations: 2 });
    const box = K.visibleBox(40);
    for (let i = 0; i < 4; i++) setTimeout(() => sparkles(rand(box.x0, box.x1), rand(150, 450), { n: 14, colors: ['#ff5c6c', '#ffe14d', '#5cb3ff', '#6fdc6a', '#fff'], spread: 200 }), i * 250);
    setStage('decorate');
    setTimeout(() => { elSay(pick(['Hooray! So shiny! Now paint it!', 'All clean! Paint it and add stickers!'])); hopRow('paint'); updateGuide(); }, 700);
  }
  // rubbing a lot after the scrub is done: the elephant rinses it for you
  function extraRub(C, amount) {
    if (C !== V || !C.done.scrub || C.done.rinse || busy) return;
    C.extra = (C.extra || 0) + amount;
    if (C.extra > 1500) { C.extra = -99999; elSay('Splash time!'); setTimeout(() => { if (V === C && !busy) water(); }, 500); }
  }
  function addScrub(C, amount) {
    if (C !== V || C.done.scrub) return;
    C.scrub += amount;
    const left = mudLeft(C);
    // the mud fades as you scrub, so you can see it working
    const f = Math.max(0.3, 1 - 0.7 * C.scrub / SCRUB_NEED);
    left.forEach(m => { m.firstChild.style.opacity = f; });
    if (C.scrub >= SCRUB_NEED || !left.length) {
      // the last of the mud turns into suds, ready to rinse off
      [...left].forEach((m, i) => { removeMud(C, m, i * 40); addBubbles(C, 2, m._x, m._y); });
      Sound.play('bubbles');
      talkVehicle(C, pick(['That tickles!', 'Hee hee! Bubbly!']));
      stepDone(C, 'scrub');
    }
  }

  /* ---------- the chooser: three muddy vehicles wait in the bay ---------- */
  let V = null, choices = [], busy = false;
  const state = { get V() { return V; }, get choices() { return choices; }, get busy() { return busy; } };

  async function spawnChooser() {
    busy = true;
    setStage('pick');
    const types = Object.keys(TYPES).sort(() => Math.random() - 0.5).slice(0, 3);
    choices = types.map((t, i) => {
      const C = makeVehicle(t, bay);
      C.g.classList.add('tap'); C.g.dataset.act = 'pick'; C.g.dataset.i = i;
      addMud(C, 7);
      place(C, -300 - i * 200, SPOT.y, 0.32);
      return C;
    });
    Sound.play('putt');
    hideHand();
    await Promise.all(choices.map((C, i) => {
      spin(C, false);
      const ws = C.wheels.map(w => anim(w, [{ transform: 'rotate(0)' }, { transform: 'rotate(720deg)' }], 1100, { easing: 'ease-out' }));
      const x0 = C.x, x1 = 640 + i * 160;
      return tween(1100, t => place(C, lerp(x0, x1, 1 - Math.pow(1 - t, 3)), SPOT.y, 0.32)).then(() => ws);
    }));
    busy = false;
    updateGuide();
    if (App.current === 'carwash') elSay(pick(['Pick a muddy one!', 'Which one should we wash?']));
  }

  async function pickVehicle(i) {
    if (busy || V || !choices[i]) return;
    busy = true;
    hideHand();
    const C = choices[i];
    Sound.play(C.T.horn); bounce(C, 30);
    // the others drive away
    choices.forEach((O, j) => {
      if (O === C) return;
      const x0 = O.x;
      O.wheels.forEach(w => anim(w, [{ transform: 'rotate(0)' }, { transform: 'rotate(900deg)' }], 900, { easing: 'ease-in' }));
      tween(900, t => place(O, x0 + t * t * 1100, SPOT.y, 0.32)).then(() => O.g.remove());
    });
    choices = [];
    C.g.classList.remove('tap'); delete C.g.dataset.i;
    C.g.dataset.act = 'veh';
    // the muddy vehicle grows to full size in the middle of the bay, with fresh mud for the big size
    C.wheels.forEach(w => anim(w, [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], 700));
    const x0 = C.x;
    await tween(700, t => { const e = 1 - Math.pow(1 - t, 3); place(C, lerp(x0, SPOT.x, e), SPOT.y, lerp(0.32, 1, e)); });
    Sound.play('land'); bounce(C, 12);
    V = C;
    if (mudLeft(V).length < 9) addMud(V, 9 - mudLeft(V).length);
    busy = false;
    setStage('wash');
    updateGuide();
    setTimeout(() => talkVehicle(V, V.T.line), 200);
    setTimeout(() => elSay(pick(["So muddy! Let's spray it!", 'Yucky mud! Spray it with water!'])), 1600);
  }

  /* ---------- the elephant ---------- */
  const trunk = elephant.querySelector('.trunk'), ear = elephant.querySelector('.ear');
  const rot = ([x, y], a) => ({ transform: `translate(${x}px,${y}px) rotate(${a}deg) translate(${-x}px,${-y}px)` });
  const TRUNK_BASE = [150, -190], EAR_BASE = [80, -230];
  const EL_TALK = { x: 300, y: 236 };
  function elSay(text) {
    anim(elephant.querySelector('.el-smile'), [{ transform: 'scale(1)' }, { transform: 'translate(0,-4px) scale(1,1.6)' }, { transform: 'scale(1)' }, { transform: 'translate(0,-4px) scale(1,1.5)' }, { transform: 'scale(1)' }], 700);
    talk('elephant', EL_TALK.x, EL_TALK.y, text, { pitch: 1.35, rate: 1 });
  }
  function flapEar(times = 2) { anim(ear, [rot(EAR_BASE, 0), rot(EAR_BASE, -18), rot(EAR_BASE, 6), rot(EAR_BASE, 0)], 360, { iterations: times }); }
  const talkVehicle = (C, text) => { bounce(C, 14); talk('veh', C.x, C.y - 330 * C.s, text, { pitch: 1.1, rate: 1.05 }); };

  // a stream of drops from the trunk to a target point
  function spray(tx, ty, ms = 1000, spread = 150) {
    anim(trunk, [rot(TRUNK_BASE, 0), rot(TRUNK_BASE, -10), rot(TRUNK_BASE, -6), rot(TRUNK_BASE, -10), rot(TRUNK_BASE, 0)], ms + 200);
    Sound.play('spray');
    const n = Math.round(ms / 35);
    for (let i = 0; i < n; i++) setTimeout(() => {
      const g = el('g', { transform: `translate(${TRUNK_TIP.x},${TRUNK_TIP.y})` }, layer.fx);
      const d = el('path', { d: shapes.drop(rand(8, 13)), fill: pick(['#5cb3ff', '#7cc8ff', '#bfe9ff']) }, g);
      const ex = tx - TRUNK_TIP.x + rand(-spread, spread), ey = ty - TRUNK_TIP.y + rand(-spread * 0.6, spread * 0.6);
      const frames = [0, 0.25, 0.5, 0.75, 1].map(t => ({ transform: `translate(${(ex * t).toFixed(0)}px,${(ey * t - Math.sin(Math.PI * t) * 120).toFixed(0)}px) rotate(${(90 + t * 40).toFixed(0)}deg)`, opacity: t > 0.9 ? 0.4 : 1 }));
      const a = anim(d, frames, 450, { easing: 'linear' });
      if (a) a.onfinish = () => g.remove(); else g.remove();
    }, i * 35);
  }

  async function water() {
    if (!V) {
      // nothing to wash: he sprays himself and giggles
      flapEar();
      spray(EL.x + 40, EL.y - 300, 700, 60);
      await wait(700);
      Sound.play('tickle');
      anim(elAnim, [{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(0)' }], 400, { iterations: 2 });
      elSay(pick(['Hee hee! That tickles!', 'Splash! Hee hee!']));
      return;
    }
    if (busy) return;
    busy = true;
    const C = V;
    spray(C.x, C.y - 150, 1000);
    await wait(650);
    Sound.play('splash');
    sparkles(C.x, C.y - 150, { n: 10, colors: ['#5cb3ff', '#bfe9ff', '#fff'], shape: 'drop', spread: 200 });
    setWet(C, true);
    if (C.done.scrub && !C.done.rinse) {
      // rinse: everything washes away
      [...bubblesLeft(C)].forEach((b, i) => popBubble(C, b, i * 40, i % 4));
      [...mudLeft(C)].forEach((m, i) => removeMud(C, m, 200 + i * 60));
      await wait(500);
      busy = false;
      C.done.soap = true;
      stepDone(C, 'rinse');
      checkClean(C);
      return;
    }
    if (!C.done.spray) {
      const mud = [...mudLeft(C)].sort(() => Math.random() - 0.5);
      mud.slice(0, Math.max(1, Math.ceil(mud.length * 0.35))).forEach((m, i) => removeMud(C, m, i * 80));
      setTimeout(() => talkVehicle(C, pick(['Hee hee! Cold!', 'Splishy splashy!'])), 300);
    }
    busy = false;
    stepDone(C, 'spray');
  }

  function soap(btn) {
    if (!V || busy) return needVehicle();
    Sound.play('bubbles');
    if (btn) sparkles(+btn.dataset.x, +btn.dataset.y + 30, { n: 6, colors: ['#fff', '#ffc4f0', '#bfe9ff'], shape: 'dot', size: 9, spread: 60 });
    addBubbles(V, V.wet ? 22 : 16);
    bounce(V, 8);
    stepDone(V, 'soap');
  }

  async function sponge() {
    if (!V || busy) return needVehicle();
    busy = true;
    const C = V;
    const g = el('g', {}, layer.fx);
    const inner = el('g', {}, g);
    el('rect', { x: -46, y: -30, width: 92, height: 60, rx: 18, fill: '#ffe14d', stroke: '#e8b400', 'stroke-width': 5 }, inner);
    [[-22, -8, 6], [8, -12, 5], [24, 8, 7], [-6, 12, 5]].forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r, fill: '#f0c400' }, inner));
    const pts = [];
    C.T.area.forEach(ar => { for (let i = 0; i <= 6; i++) pts.push([lerp(ar[0], ar[2], i / 6), i % 2 ? ar[1] + 10 : ar[3] - 10]); });
    let last = 0;
    await tween(1500, t => {
      const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i;
      const lx = lerp(pts[i][0], pts[i + 1][0], u), ly = lerp(pts[i][1], pts[i + 1][1], u);
      g.setAttribute('transform', `translate(${(C.x + lx * C.s).toFixed(0)},${(C.y + ly * C.s).toFixed(0)}) rotate(${(Math.sin(t * 30) * 12).toFixed(0)})`);
      const now = performance.now();
      if (now - last > 130) { last = now; Sound.play('scrub'); if (Math.random() < 0.5) addBubbles(C, 1); }
      scrubAt(C, lx, ly, 60, true);
      addScrub(C, 0);
    });
    g.remove();
    busy = false;
    addScrub(C, SCRUB_NEED);
  }

  async function dryer() {
    if (!V || busy) return needVehicle();
    busy = true;
    const C = V;
    Sound.play('blow');
    for (let i = 0; i < 14; i++) setTimeout(() => {
      const g = el('g', { transform: `translate(${rand(1050, 1150).toFixed(0)},${rand(400, 700).toFixed(0)})` }, layer.fx);
      const p = el('path', { d: 'M0 0 q20 -12 40 0 t40 0 t40 0', fill: 'none', stroke: '#fff', 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
      const a = anim(p, [{ transform: 'translateX(0)', opacity: 0 }, { transform: 'translateX(-200px)', opacity: 1, offset: 0.3 }, { transform: 'translateX(-600px)', opacity: 0 }], 700, { easing: 'linear' });
      if (a) a.onfinish = () => g.remove(); else g.remove();
    }, i * 60);
    anim(C.a, [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], 160, { iterations: 5 });
    [...bubblesLeft(C)].forEach((b, i) => {
      b.classList.add('gone');
      const a = anim(b.firstChild, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${-rand(200, 400).toFixed(0)}px,${-rand(40, 160).toFixed(0)}px)`, opacity: 0 }], 700, { delay: i * 20, fill: 'forwards' });
      setTimeout(() => b.remove(), 720 + i * 20);
      if (!a) b.remove();
    });
    await wait(800);
    setWet(C, false);
    busy = false;
    if (C.done.rinse) {
      Sound.play('twinkle');
      shine(C);
      stepDone(C, 'dry');
      maybeFinish(C);
    } else { const nx = nextStep(C); elSay('Whoosh! ' + (nx ? nx.say : '')); }
  }
  function shine(C) {
    for (let i = 0; i < 5; i++) setTimeout(() => {
      const [x, y] = areaPoint(C);
      sparkles(C.x + x * C.s, C.y + y * C.s, { n: 3, colors: ['#fff'], size: 18, spread: 30 });
    }, i * 120);
  }

  function scrubAt(C, lx, ly, r, quiet) {
    let hit = false;
    mudLeft(C).forEach(m => { if (Math.hypot(m._x - lx, m._y - ly) < r + 20) { removeMud(C, m); hit = true; } });
    bubblesLeft(C).forEach(b => { if (Math.hypot(b._x - lx, b._y - ly) < r * 0.6) popBubble(C, b, 0, quiet); });
    if (hit && !quiet) sparkles(C.x + lx * C.s, C.y + ly * C.s, { n: 4, colors: ['#fff', '#bfe9ff'], shape: 'dot', size: 8, spread: 50 });
    return hit;
  }

  function checkClean(C) {
    if (C !== V || mudLeft(C).length || C.cleanSaid) return;
    C.cleanSaid = true;
    Sound.play('cheer');
    shine(C);
    rainbowArc();
    sparkles(C.x, C.y - 160, { n: 16, colors: ['#fff', '#ffe14d', '#bfe9ff'], spread: 260, up: 40 });
    setTimeout(() => talkVehicle(C, pick(["I'm clean!", 'Yay! No more mud!'])), 300);
    setTimeout(() => { if (V === C && !C.done.dry) elSay('Sparkly clean! Now dry it with the fan!'); }, 2000);
  }

  function rainbowArc() {
    const g = el('g', { opacity: 0 }, layer.fx);
    ['#ff5c6c', '#ffa53b', '#ffe14d', '#6fdc6a', '#5cb3ff', '#b98bff'].forEach((c, i) => {
      const r = 600 - i * 16;
      el('path', { d: `M${800 - r} 760 A${r} ${r} 0 0 1 ${800 + r} 760`, fill: 'none', stroke: c, 'stroke-width': 17 }, g);
    });
    Sound.play('rainbow');
    const a = anim(g, [{ opacity: 0 }, { opacity: 0.75, offset: 0.2 }, { opacity: 0.75, offset: 0.75 }, { opacity: 0 }], 3200);
    if (a) a.onfinish = () => g.remove(); else setTimeout(() => g.remove(), 3200);
  }

  /* ---------- paint, with color mixing ---------- */
  const PAINTS = {
    red: { color: '#ff4d4d', name: 'Red!' },
    yellow: { color: '#ffd93b', name: 'Yellow!' },
    blue: { color: '#3d8bff', name: 'Blue!' },
    pink: { color: '#ff8fc8', name: 'Pink!' },
    rainbow: { color: 'url(#cw-rainbow)', name: 'Rainbow!' },
  };
  const MIXES = {
    'red+yellow': { id: 'orange', color: '#ff9a2e', name: 'Red and yellow make orange!' },
    'blue+yellow': { id: 'green', color: '#5cc84a', name: 'Blue and yellow make green!' },
    'blue+red': { id: 'purple', color: '#a86bff', name: 'Red and blue make purple!' },
  };
  async function paint(id, btn) {
    if (btn) hop(btn.querySelector('.anim'), 12);
    if (!V || busy) return needVehicle();
    const C = V;
    let color = PAINTS[id].color, name = PAINTS[id].name, nid = id;
    const mix = MIXES[[C.paint, id].sort().join('+')];
    if (C.paint === id) {
      // the same color twice: it turns sparkly
      C.g.classList.add('sparkly');
      if (!C.glit.firstChild) for (let i = 0; i < 14; i++) { const [x, y] = areaPoint(C); el('path', { d: starPath(9, 4), transform: `translate(${x.toFixed(0)},${y.toFixed(0)})`, fill: '#fff' }, C.glit); }
      Sound.play('sparkle'); shine(C);
      App.Voice.say('Sparkly!', { pitch: 1.6 });
      return;
    }
    if (mix) { color = mix.color; name = mix.name; nid = mix.id; }
    C.paint = nid;
    C.g.classList.remove('sparkly');
    if (!C.decorated) { C.decorated = true; updateGuide(); }
    Sound.play('splat');
    // a big splat of paint, then the color is on
    const g = el('g', { transform: `translate(${C.x},${C.y - 150 * C.s})` }, layer.fx);
    const s = el('path', { d: 'M0 -90 C40 -100 60 -60 90 -50 C130 -36 100 10 110 40 C118 80 60 80 30 100 C0 120 -40 100 -70 80 C-110 56 -120 20 -100 -20 C-84 -56 -40 -84 0 -90Z', style: `fill:${color}` }, g);
    const a = anim(s, [{ transform: 'scale(0)', opacity: 0.95 }, { transform: 'scale(2.2)', opacity: 0.9, offset: 0.6 }, { transform: 'scale(2.6)', opacity: 0 }], 600);
    if (a) a.onfinish = () => g.remove(); else g.remove();
    await wait(260);
    C.g.style.setProperty('--body', color);
    bounce(C, 10);
    if (mix) { Sound.play('rainbow'); sparkles(C.x, C.y - 170, { n: 14, colors: [color, '#fff'], spread: 220 }); }
    else if (id === 'rainbow') { Sound.play('rainbow'); sparkles(C.x, C.y - 170, { n: 14, colors: ['#ff5c6c', '#ffe14d', '#6fdc6a', '#5cb3ff', '#b98bff'], spread: 240 }); }
    App.Voice.say(name, { pitch: 1.5 });
  }

  /* ---------- stickers ---------- */
  const STICKERS = {
    star: g => el('path', { d: starPath(38, 17), fill: '#ffd93b', stroke: '#fff', 'stroke-width': 6, 'stroke-linejoin': 'round' }, g),
    flame: g => { el('path', { d: 'M0 40 C-34 40 -40 8 -26 -12 C-20 4 -8 4 -10 -14 C-12 -30 0 -40 6 -46 C8 -26 34 -16 32 12 C30 32 18 40 0 40Z', fill: '#ff6a2e', stroke: '#fff', 'stroke-width': 6, 'stroke-linejoin': 'round' }, g); el('path', { d: 'M0 34 C-14 34 -18 20 -10 8 C-6 18 4 14 4 2 C14 10 18 30 0 34Z', fill: '#ffd93b' }, g); },
    googly: g => { el('circle', { r: 30, fill: '#fff', stroke: '#26323d', 'stroke-width': 5 }, g); const p = el('g', { class: 'pupil' }, g); el('circle', { r: 13, fill: '#26323d' }, p); el('circle', { cx: -4, cy: -4, r: 4, fill: '#fff' }, p); },
    heart: g => el('path', { d: shapes.heart(30), fill: '#ff5c8a', stroke: '#fff', 'stroke-width': 6, 'stroke-linejoin': 'round' }, g),
    bolt: g => el('path', { d: 'M10 -42 L-24 6 L0 6 L-12 42 L26 -8 L2 -8 Z', fill: '#ffe14d', stroke: '#fff', 'stroke-width': 6, 'stroke-linejoin': 'round' }, g),
    flower: g => { for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; el('circle', { cx: (Math.cos(a) * 20).toFixed(1), cy: (Math.sin(a) * 20).toFixed(1), r: 16, fill: '#ff9cc8', stroke: '#fff', 'stroke-width': 4 }, g); } el('circle', { r: 13, fill: '#ffd93b', stroke: '#fff', 'stroke-width': 4 }, g); },
  };
  const TRAIL = { star: { shape: 'star', colors: ['#ffd93b', '#fff'] }, flame: { shape: 'drop', colors: ['#ff6a2e', '#ffd93b'] }, heart: { shape: 'heart', colors: ['#ff5c8a', '#ff9cc8'] }, bolt: { shape: 'star', colors: ['#ffe14d', '#fff'] }, flower: { shape: 'dot', colors: ['#ff9cc8', '#ffd93b'] } };
  Object.keys(STICKERS).forEach((k, i) => {
    const x = 1210 + (i % 2) * 120, y = 395 + Math.floor(i / 2) * 115;
    const b = el('g', { class: 'tap', transform: `translate(${x},${y})` }, stickerSheet);
    b.dataset.act = 'sticker'; b.dataset.kind = k; b.dataset.x = x; b.dataset.y = y;
    STICKERS[k](el('g', { class: 'anim' }, b));
  });
  const MAX_STICKERS = 12;
  function stick(C, kind, lx, ly) {
    if (C.stickers.length >= MAX_STICKERS) {
      const old = C.stickers.shift();
      anim(old, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.5)' }], 250, { fill: 'forwards' });
      setTimeout(() => old.remove(), 260);
    }
    const h = el('g', { transform: `translate(${lx.toFixed(0)},${ly.toFixed(0)}) rotate(${rand(-15, 15).toFixed(0)})`, class: 'cw-stk' }, C.stk);
    h.dataset.kind = kind;
    const s = el('g', {}, h);
    STICKERS[kind](s);
    C.stickers.push(h);
    if (!C.decorated) { C.decorated = true; updateGuide(); }
    anim(s, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(.85)', opacity: 1 }, { transform: 'scale(1)' }], 300);
    Sound.play('plop');
    const eyes = C.stickers.filter(n => n.dataset.kind === 'googly').length;
    if (kind === 'googly' && eyes === 2) {
      C.g.classList.add('alive');
      setTimeout(() => { Sound.play('boing'); talkVehicle(C, pick(['Hi! I can see!', 'Hello! Look at me!'])); }, 300);
    } else if (kind === 'heart') setTimeout(() => Sound.play('love'), 150);
    else if (kind === 'star') setTimeout(() => Sound.play('twinkle'), 150);
  }

  /* ---------- drive around the block ---------- */
  async function go() {
    anim(light, [{ transform: 'scale(1)' }, { transform: 'translate(800px,344px) scale(1.08) translate(-800px,-344px)' }, { transform: 'scale(1)' }], 300);
    if (!V || busy) {
      if (!V) { Sound.play('bonk'); light.setAttribute('class', 'tap red'); setTimeout(() => light.setAttribute('class', 'tap'), 700); }
      return;
    }
    busy = true;
    hideHand(); light.classList.remove('cw-next');
    const C = V;
    const wasClean = !mudLeft(C).length;
    light.setAttribute('class', 'tap red'); Sound.play('chime', 0); await wait(400);
    light.setAttribute('class', 'tap yellow'); Sound.play('chime', 2); await wait(400);
    light.setAttribute('class', 'tap green'); Sound.play('chime', 4);
    Sound.play(C.T.horn);
    talkVehicle(C, C.g.classList.contains('alive') ? pick(['Bye bye!', 'Wheee!', 'See you soon!']) : C.T.line);
    await wait(500);
    const fast = C.stickers.some(n => /flame|bolt/.test(n.dataset.kind));
    const trails = [...new Set(C.stickers.map(n => n.dataset.kind))].filter(k => TRAIL[k]);
    spin(C, true, fast ? 220 : 400);
    Sound.play(fast ? 'vroom' : 'putt');
    let last = 0;
    await tween(fast ? 900 : 1400, t => {
      place(C, SPOT.x + t * t * 1100, SPOT.y, 1);
      const now = performance.now();
      if (trails.length && now - last > 90) { last = now; const T = TRAIL[pick(trails)]; sparkles(C.x - 220, C.y - rand(40, 160), { n: 2, shape: T.shape, colors: T.colors, size: 14, spread: 50 }); }
    });
    light.setAttribute('class', 'tap');
    await wait(900);
    // around the block and back, sometimes through a mud puddle
    const muddy = wasClean && Math.random() < 0.4;
    if (muddy) { addMud(C, 9); C.cleanSaid = false; C.shinySaid = false; C.done = {}; C.scrub = 0; setWet(C, false); }
    place(C, -400, SPOT.y, 1);
    spin(C, true, 400);
    await tween(1300, t => place(C, lerp(-400, SPOT.x, 1 - Math.pow(1 - t, 3)), SPOT.y, 1));
    spin(C, false);
    if (V !== C) return;
    Sound.play('land'); bounce(C, 14);
    busy = false;
    if (muddy) { setStage('wash'); elSay(pick(['Oops! Muddy again!', 'Oh no! A mud puddle!'])); }
    else { Sound.play(C.T.horn); talkVehicle(C, pick(['That was fun!', 'Again! Again!', 'Wheee!'])); }
    updateGuide();
  }

  let leaving = false;
  async function newCar() {
    anim(PANELS.newcar.querySelector('.anim'), [{ transform: 'scale(1)' }, { transform: 'scale(.85)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], 350);
    if (!V || leaving) return;
    leaving = true;
    // let a running step finish (up to a moment), then this always wins
    for (let i = 0; i < 15 && busy; i++) await wait(100);
    if (tdrag) { tdrag.ghost.remove(); tdrag = null; }
    rub = null;
    busy = true;
    hideHand();
    const C = V;
    V = null;
    if (!C) { busy = false; leaving = false; return; }
    Sound.play(C.T.horn);
    talkVehicle(C, pick(['Bye bye!', 'See you later!', 'Thank you!']));
    await wait(600);
    spin(C, true, 350);
    Sound.play('putt');
    await tween(1000, t => place(C, SPOT.x + t * t * 1100, SPOT.y, 1));
    spin(C, false);
    C.g.remove();
    busy = false; leaving = false;
    spawnChooser();
  }

  /* ---------- other things to tap ---------- */
  function needVehicle() {
    if (busy) return;
    elSay('Pick a car first!');
    choices.forEach((C, i) => hop(C.a, 24, i * 120));
  }
  function tapElephant() {
    if (V) return water();
    Sound.play('trumpet'); flapEar(3);
    anim(trunk, [rot(TRUNK_BASE, 0), rot(TRUNK_BASE, -18), rot(TRUNK_BASE, 6), rot(TRUNK_BASE, 0)], 700);
    elSay(pick(['Toot toot!', 'Hello! I wash cars!', 'Pick a muddy one!']));
  }
  function tapDuck(hit) {
    Sound.play('quack');
    anim(hit.querySelector('.anim'), [{ transform: 'rotate(0) translateY(0)' }, { transform: 'rotate(-12deg) translateY(-14px)' }, { transform: 'rotate(10deg) translateY(0)' }, { transform: 'rotate(0)' }], 500);
    rings(480, 800, ['#bfe9ff', '#fff'], { width: 4, scale: 4 });
    sparkles(480, 790, { n: 6, colors: ['#5cb3ff', '#bfe9ff'], shape: 'drop', spread: 70, up: 40 });
  }
  function tapSun(hit) {
    Sound.play('twinkle');
    anim(hit.querySelector('.anim'), [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 500);
    rainbowArc();
  }
  function hopRow(kind) { board.querySelectorAll(`[data-act=${kind}] .anim`).forEach((a, i) => hop(a, 16, i * 100)); }

  /* ---------- the board: wash tools and paint buckets ---------- */
  const TOOLS = {
    water: g => el('path', { d: shapes.drop(30), transform: 'translate(0,4) scale(1,1.1)', fill: '#5cb3ff', stroke: '#2f8fbf', 'stroke-width': 4 }, g),
    soap: g => { el('rect', { x: -18, y: -16, width: 36, height: 44, rx: 10, fill: '#ff8fc8', stroke: '#d9649a', 'stroke-width': 4 }, g); el('rect', { x: -7, y: -28, width: 14, height: 14, fill: '#d9649a' }, g); [[-22, -30, 9], [18, -36, 7], [26, -16, 6]].forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r, fill: '#fff', stroke: '#9fd8f5', 'stroke-width': 3 }, g)); },
    sponge: g => { el('rect', { x: -32, y: -22, width: 64, height: 44, rx: 14, fill: '#ffe14d', stroke: '#e8b400', 'stroke-width': 4 }, g); [[-14, -6, 5], [8, -8, 4], [16, 8, 5], [-4, 10, 4]].forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r, fill: '#f0c400' }, g)); },
    fan: g => { el('circle', { r: 32, fill: '#e9f8ff', stroke: '#2f8fbf', 'stroke-width': 4 }, g); const b = el('g', { class: 'fan-blades' }, g); for (let i = 0; i < 3; i++) el('ellipse', { cx: 0, cy: -14, rx: 9, ry: 15, fill: '#5cb3ff', transform: `rotate(${i * 120})` }, b); el('circle', { r: 6, fill: '#2f8fbf' }, g); },
  };
  Object.keys(TOOLS).forEach((k, i) => {
    const x = 605 + i * 130, y = 94;
    const b = el('g', { class: 'tap', transform: `translate(${x},${y})` }, toolsG);
    b.dataset.act = 'tool'; b.dataset.tool = k; b.dataset.x = x; b.dataset.y = y;
    el('circle', { r: 50, class: 'glow' }, b);
    const a = el('g', { class: 'anim' }, b);
    el('circle', { r: 44, fill: '#fff', stroke: '#4cb8e6', 'stroke-width': 5 }, a);
    TOOLS[k](a);
    const ck = el('g', { class: 'check', transform: 'translate(32,-32)' }, b);
    el('circle', { r: 16, fill: '#5cdc4a', stroke: '#fff', 'stroke-width': 4 }, ck);
    el('path', { d: 'M-7 0 L-2 6 L8 -6', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ck);
  });
  Object.keys(PAINTS).forEach((k, i) => {
    const x = 580 + i * 110, y = 100;
    const b = el('g', { class: 'tap', transform: `translate(${x},${y})` }, paintsG);
    b.dataset.act = 'paint'; b.dataset.paint = k;
    const a = el('g', { class: 'anim' }, b);
    el('path', { d: 'M-30 -22 L30 -22 L24 30 Q0 38 -24 30 Z', fill: '#cfd6dc', stroke: '#8a96a0', 'stroke-width': 4, 'stroke-linejoin': 'round' }, a);
    el('ellipse', { cy: -22, rx: 30, ry: 9, style: `fill:${PAINTS[k].color}`, stroke: '#8a96a0', 'stroke-width': 4 }, a);
    el('path', { d: 'M-18 -18 Q-20 0 -12 2 Q-6 0 -8 -18 Z', style: `fill:${PAINTS[k].color}` }, a);
    el('path', { d: 'M-30 -22 Q0 -54 30 -22', fill: 'none', stroke: '#8a96a0', 'stroke-width': 4 }, a);
  });
  function useTool(tool, btn) {
    hop(btn.querySelector('.anim'), 12);
    if (tool === 'water') water();
    else if (tool === 'soap') soap(btn);
    else if (tool === 'sponge') sponge();
    else if (tool === 'fan') { anim(btn.querySelector('.fan-blades'), [{ transform: 'rotate(0)' }, { transform: 'rotate(1080deg)' }], 900); dryer(); }
  }

  /* ---------- input ---------- */
  let rub = null, sdrag = null, tdrag = null, lastInput = performance.now(), hints = 0, lastScrub = 0;
  svg.addEventListener('pointerdown', e => {
    lastInput = performance.now(); hints = 0;
    if (e.isPrimary) {
      if (tdrag && tdrag.id !== e.pointerId) { tdrag.ghost.remove(); tdrag = null; }
      if (sdrag && sdrag.id !== e.pointerId) { sdrag.ghost.remove(); sdrag = null; }
      if (rub && rub.id !== e.pointerId) rub = null;
    }
    const hit = e.target.closest('[data-act]');
    if (!hit) return;
    const act = hit.dataset.act;
    const p = toSvg(e.clientX, e.clientY);
    if (act === 'veh') {
      if (busy || hit._V !== V || rub || sdrag) return;
      const bub = e.target.closest('.cw-bubble');
      // popping a bubble still starts a scrub, so a soapy car can always be rubbed clean
      if (bub) { popBubble(V, bub); Sound.play('chime', Math.floor(rand(0, 6))); }
      const stk = !bub && e.target.closest('.cw-stk');
      if (stk) {
        anim(stk.firstChild, [{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.3) rotate(-15deg)' }, { transform: 'scale(1) rotate(10deg)' }, { transform: 'scale(1)' }], 400);
        Sound.play(stk.dataset.kind === 'googly' ? 'boing' : 'squeak', 1);
        if (stk.dataset.kind === 'googly' && V.g.classList.contains('alive')) talkVehicle(V, pick(['Hee hee!', 'I see you!', 'Wash me!']));
        return;
      }
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      rub = { id: e.pointerId, cx: e.clientX, cy: e.clientY, moved: false, bub: !!bub };
      return;
    }
    if (act === 'sticker') {
      if (sdrag) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      const ghost = el('g', { transform: `translate(${p.x},${p.y})` }, layer.fx);
      STICKERS[hit.dataset.kind](el('g', {}, ghost));
      ghost.style.opacity = 0;
      sdrag = { id: e.pointerId, kind: hit.dataset.kind, btn: hit, ghost, cx: e.clientX, cy: e.clientY, moved: false };
      Sound.play('pop');
      return;
    }
    if (act === 'tool' && (hit.dataset.tool === 'soap' || hit.dataset.tool === 'sponge')) {
      if (tdrag) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      const ghost = el('g', { transform: `translate(${p.x},${p.y})` }, layer.fx);
      const gi = el('g', {}, ghost);
      TOOLS[hit.dataset.tool](gi);
      ghost.style.opacity = 0;
      tdrag = { id: e.pointerId, tool: hit.dataset.tool, btn: hit, ghost, gi, cx: e.clientX, cy: e.clientY, moved: false, last: 0, snd: 0 };
      return;
    }
    if (act === 'pick') pickVehicle(+hit.dataset.i);
    else if (act === 'tool') useTool(hit.dataset.tool, hit);
    else if (act === 'paint') paint(hit.dataset.paint, hit);
    else if (act === 'light') go();
    else if (act === 'newcar') newCar();
    else if (act === 'elephant') tapElephant();
    else if (act === 'duck') tapDuck(hit);
    else if (act === 'sun') tapSun(hit);
  });
  svg.addEventListener('pointermove', e => {
    if (tdrag && e.pointerId === tdrag.id) { moveTool(e); return; }
    const d = rub || sdrag;
    if (!d || e.pointerId !== d.id) return;
    lastInput = performance.now();
    if (!d.moved && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 10) d.moved = true;
    if (!d.moved) return;
    const p = toSvg(e.clientX, e.clientY);
    if (sdrag) {
      sdrag.ghost.style.opacity = 1;
      sdrag.ghost.setAttribute('transform', `translate(${p.x.toFixed(0)},${p.y.toFixed(0)}) scale(1.2)`);
      sdrag.p = p;
      return;
    }
    if (!V || busy || stage !== 'wash') return;
    const l = toLocal(V, p);
    scrubAt(V, l.x, l.y, V.done.scrub ? 80 : 40);
    if (rub.l && overVehicle(V, p)) { addScrub(V, Math.hypot(l.x - rub.l.x, l.y - rub.l.y)); extraRub(V, Math.hypot(l.x - rub.l.x, l.y - rub.l.y)); }
    rub.l = l;
    const now = performance.now();
    if (now - lastScrub > 140 && overVehicle(V, p)) { lastScrub = now; Sound.play('scrub'); if (!V.done.scrub && bubblesLeft(V).length < 30 && Math.random() < 0.3) addBubbles(V, 1); }
  });
  function moveTool(e) {
    const d = tdrag;
    lastInput = performance.now();
    if (!d.moved && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 10) { d.moved = true; Sound.play('pop'); }
    if (!d.moved) return;
    const p = toSvg(e.clientX, e.clientY);
    d.ghost.style.opacity = 1;
    d.ghost.setAttribute('transform', `translate(${p.x.toFixed(0)},${p.y.toFixed(0)}) scale(1.5) rotate(${(Math.sin(performance.now() / 60) * 10).toFixed(0)})`);
    if (!V || busy || !overVehicle(V, p)) return;
    const l = toLocal(V, p), now = performance.now();
    if (d.tool === 'soap') {
      if (now - d.last > 70 && bubblesLeft(V).length < 45) { d.last = now; addBubbles(V, 1, l.x + rand(-25, 25), l.y + rand(-20, 20)); }
      if (now - d.snd > 260) { d.snd = now; Sound.play('bubbles'); }
      if (bubblesLeft(V).length >= 8) stepDone(V, 'soap');
    } else {
      scrubAt(V, l.x, l.y, V.done.scrub ? 90 : 55);
      if (d.l) { addScrub(V, Math.hypot(l.x - d.l.x, l.y - d.l.y)); extraRub(V, Math.hypot(l.x - d.l.x, l.y - d.l.y)); }
      d.l = l;
      if (now - d.snd > 140) { d.snd = now; Sound.play('scrub'); if (!V.done.scrub && Math.random() < 0.4) addBubbles(V, 1, l.x, l.y); }
    }
  }
  function endTool(e) {
    const d = tdrag; tdrag = null;
    if (!d.moved) { d.ghost.remove(); useTool(d.tool, d.btn); return; }
    // the tool floats back to its spot on the board
    const m = d.ghost.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
    const x0 = +m[1], y0 = +m[2], x1 = +d.btn.dataset.x, y1 = +d.btn.dataset.y;
    tween(300, t => d.ghost.setAttribute('transform', `translate(${lerp(x0, x1, t).toFixed(0)},${lerp(y0, y1, t).toFixed(0)}) scale(${lerp(1.5, 1, t).toFixed(2)})`)).then(() => d.ghost.remove());

  }
  function endInput(e) {
    if (tdrag && e.pointerId === tdrag.id) { endTool(e); return; }
    if (rub && e.pointerId === rub.id) {
      const r = rub; rub = null;
      if (!r.moved && V && !r.bub) {
        Sound.play(V.T.horn);
        talkVehicle(V, V.g.classList.contains('alive') ? pick(['Hee hee!', 'Wash me!', 'Make me shiny!', V.T.line]) : V.T.line);
      }
      return;
    }
    if (sdrag && e.pointerId === sdrag.id) {
      const d = sdrag; sdrag = null;
      d.ghost.remove();
      hop(d.btn.querySelector('.anim'), 10);
      if (!V || busy) return needVehicle();
      if (!d.moved) { const [x, y] = areaPoint(V); stick(V, d.kind, x, y); return; }
      if (d.p && overVehicle(V, d.p)) { const l = toLocal(V, d.p); stick(V, d.kind, l.x, l.y); }
      else { Sound.play('poof'); if (d.p) sparkles(d.p.x, d.p.y, { n: 6, colors: ['#fff', '#bfe9ff'], shape: 'dot', spread: 50 }); }
    }
  }
  svg.addEventListener('pointerup', endInput);
  svg.addEventListener('pointercancel', endInput);

  /* ---------- gentle hints when nobody is tapping ---------- */
  setInterval(() => {
    if (App.current !== 'carwash' || busy || rub || sdrag || tdrag || performance.now() - lastInput < 7000 || hints >= 3) return;
    lastInput = performance.now(); hints++;
    if (!V) { elSay('Pick a muddy one!'); choices.forEach((C, i) => hop(C.a, 24, i * 120)); return; }
    if (stage === 'wash') { const st = nextStep(V); if (st) { elSay(st.say); hop(toolBtn(st.tool).querySelector('.anim'), 18); } return; }
    if (!V.decorated) { elSay('Paint it! Add stickers!'); hopRow('paint'); }
    else if (hints === 3) { elSay('Want a new car? Tap here!'); hop(PANELS.newcar.querySelector('.anim'), 20); }
    else { elSay('Tap the light to go!'); anim(light, [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], 400, { iterations: 3 }); }
  }, 1000);
  // safety net: nothing in this game takes 8 seconds, so a longer "busy" means something went wrong
  let busyAt = 0;
  setInterval(() => {
    if (!busy || leaving) { busyAt = 0; return; }
    if (!busyAt) busyAt = performance.now();
    else if (performance.now() - busyAt > 8000) { busy = false; busyAt = 0; if (V) { spin(V, false); place(V, SPOT.x, SPOT.y, 1); } updateGuide(); }
  }, 500);
  // the elephant helps out if a wash step is taking a long time
  let stepKey = '', stepAt = 0;
  setInterval(() => {
    if (App.current !== 'carwash' || stage !== 'wash' || !V || busy || tdrag) { stepAt = performance.now(); return; }
    const st = nextStep(V), key = V.type + (st ? st.k : '');
    if (key !== stepKey) { stepKey = key; stepAt = performance.now(); return; }
    if (st && performance.now() - stepAt > 20000) {
      stepAt = performance.now();
      elSay("Let me help!");
      flapEar(2);
      setTimeout(() => { if (!busy && V) ({ water, soap, sponge, fan: dryer })[st.tool](); }, 900);
    }
  }, 1000);
  // the elephant flaps an ear now and then
  setInterval(() => { if (App.current === 'carwash' && Math.random() < 0.5) flapEar(1); }, 3500);

  for (const k in PANELS) PANELS[k].style.display = 'none';
  spawnChooser();

  App.register({
    id: 'carwash',
    screen: svg,
    enter() {
      lastInput = performance.now(); hints = 0;
      Sound.setMood('wash');
      setTimeout(updateGuide, 50);
      setTimeout(() => elSay(V ? 'Welcome back!' : "Let's wash a car!"), 500);
    },
    leave() { hideHand(); rub = null; if (sdrag) { sdrag.ghost.remove(); sdrag = null; } if (tdrag) { tdrag.ghost.remove(); tdrag = null; } },
    clear() {
      if (busy) return;
      if (V) { V.g.remove(); V = null; }
      choices.forEach(C => C.g.remove()); choices = [];
      spawnChooser();
    },
  });

  window.__carwash = { state, nextStep, updateGuide, pickVehicle, water, soap, sponge, dryer, paint, stick, go, TYPES, mudLeft };
})();
