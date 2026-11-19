/* The pumpkin house: tap a pumpkin in the patch, tap eyes, a nose and a mouth to carve it,
 * and it lights up and talks. Drag it onto the porch of the spooky house; four glowing
 * pumpkins start a party. The ghost, the skeletons, the moon and the door all do something
 * when tapped. Nothing can go wrong: every tap makes something happen. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const svg = $('#pumpkin');
  const layer = { fx: $('#pk-fx'), bubbles: $('#pk-bubbles') };
  const K = Kit(svg, layer);
  const { el, anim, toSvg, tween, sparkles, rings, talk, bubble, rand, pick, lerp, wait, starPath, shapes } = K;
  const patchLayer = $('#pk-patch'), tableLayer = $('#pk-table'), porchLayer = $('#pk-porch'), board = $('#pk-board');

  const COLORS = [
    { id: 'orange', main: '#ff9a2e', dark: '#d96a00', glow: '#ffd94a' },
    { id: 'white', main: '#f4efe4', dark: '#c9bfa8', glow: '#a8e6ff' },
    { id: 'green', main: '#8fd16a', dark: '#4f9a35', glow: '#e8ff7a' },
    { id: 'purple', main: '#b48cff', dark: '#7a55c9', glow: '#ffd0ff' },
    { id: 'pink', main: '#ff9cc8', dark: '#d9649a', glow: '#fff0a0' },
  ];
  const TABLE = { x: 760, y: 600, s: 1 };
  const PATCH = [{ x: 300, y: 728 }, { x: 430, y: 720 }, { x: 560, y: 738 }, { x: 360, y: 832 }, { x: 500, y: 834 }];
  const PATCH_S = 0.4, PORCH_S = 0.3;
  const PORCH = [1090, 1146, 1296, 1352].map(x => ({ x, y: 548 }));
  const HOUSE = { x0: 1030, x1: 1410, y0: 120, y1: 660 };

  /* ---------- the faces you can carve ---------- */
  const PART_AT = { eyes: [[-55, -35], [55, -35]], nose: [[0, 22]], mouth: [[0, 80]] };
  const PARTS = {
    eyes: [
      { name: 'Round eyes!', d: shapes.dot(26) },
      { name: 'Triangle eyes!', d: 'M-30 18 L0 -26 L30 18Z' },
      { name: 'Heart eyes!', d: shapes.heart(26), fx: 'hearts' },
      { name: 'Star eyes!', d: starPath(34, 15), fx: 'stars' },
    ],
    nose: [
      { name: 'Triangle nose!', d: 'M-18 14 L0 -16 L18 14Z' },
      { name: 'Round nose!', d: shapes.dot(15) },
      { name: 'Heart nose!', d: shapes.heart(17), fx: 'hearts' },
      { name: 'Star nose!', d: starPath(22, 10), fx: 'stars' },
    ],
    mouth: [
      { name: 'Big smile!', d: 'M-80 -14 Q0 62 80 -14 Q0 22 -80 -14Z', line: 'Happy Halloween!' },
      { name: 'Toothy grin!', d: 'M-84 -18 L-62 -2 L-44 -16 L-22 0 L0 -14 L22 0 L44 -16 L62 -2 L84 -18 Q0 70 -84 -18Z', line: 'Ha ha ha!' },
      { name: 'Ooh mouth!', d: 'M-30 0 a30 34 0 1 0 60 0 a30 34 0 1 0 -60 0Z', line: 'Ooooooh!' },
      { name: 'Silly tongue!', d: 'M-72 -12 Q0 52 72 -12 Q0 18 -72 -12Z', tongue: true, line: 'Bleh! Hee hee!' },
    ],
  };
  const ROWS = ['eyes', 'nose', 'mouth'];

  function drawPart(parent, kind, i, scale) {
    const P = PARTS[kind][i];
    const g = el('g', {}, parent);
    el('path', { d: P.d, style: 'fill:var(--hole);stroke:var(--pkd);stroke-width:4;stroke-linejoin:round' }, g);
    if (P.tongue) el('ellipse', { cx: 18, cy: 22, rx: 22, ry: 15, fill: '#ff6f91', stroke: '#d9466e', 'stroke-width': 4 }, g);
    if (scale) g.setAttribute('transform', `scale(${scale})`);
    return g;
  }

  /* ---------- pumpkins ---------- */
  function makePumpkin(ci, parent) {
    const C = COLORS[ci];
    const g = el('g', { class: 'pkin' }, parent);
    g.style.setProperty('--pk', C.main); g.style.setProperty('--pkd', C.dark); g.style.setProperty('--glow', C.glow);
    const a = el('g', { class: 'anim' }, g);
    const halo = el('g', { class: 'halo' }, a);
    [[250, 0.12], [205, 0.16], [170, 0.22]].forEach(([r, o]) => el('circle', { r, cy: -10, style: `fill:var(--glow);opacity:${o}` }, halo));
    el('path', { d: 'M8 -132 Q30 -162 54 -150 Q44 -138 30 -140', fill: 'none', stroke: '#5a8f2e', 'stroke-width': 6, 'stroke-linecap': 'round' }, a);
    el('path', { d: 'M-14 -128 Q-18 -160 -4 -178 L14 -172 Q4 -156 12 -128Z', fill: '#6b9a3a', stroke: '#3d6a1f', 'stroke-width': 5, 'stroke-linejoin': 'round' }, a);
    const rib = 'fill:var(--pk);stroke:var(--pkd);stroke-width:5';
    [[-78, 82, 124], [78, 82, 124], [-36, 80, 138], [36, 80, 138], [0, 70, 143]].forEach(([cx, rx, ry]) => el('ellipse', { cx, rx, ry, style: rib }, a));
    el('ellipse', { cx: -92, cy: -40, rx: 14, ry: 40, fill: '#fff', opacity: 0.3, transform: 'rotate(18 -92 -40)' }, a);
    const face = el('g', { class: 'face' }, a);
    const P = { g, a, face, ci, parts: {}, nodes: {}, lit: false, x: 0, y: 0, s: 1 };
    g._P = P;
    return P;
  }
  function place(P, x, y, s) {
    P.x = x; P.y = y; P.s = s;
    P.g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(3)})`);
  }
  function arc(P, x1, y1, s1, ms, h) {
    const x0 = P.x, y0 = P.y, s0 = P.s;
    return tween(ms, t => {
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      place(P, lerp(x0, x1, e), lerp(y0, y1, e) - Math.sin(Math.PI * t) * h, lerp(s0, s1, e));
    });
  }
  const squish = P => anim(P.a, [{ transform: 'scale(1)' }, { transform: 'scale(1.1,.9)' }, { transform: 'scale(.95,1.06)' }, { transform: 'scale(1)' }], 380);
  const hop = (node, h = 26, delay = 0) => anim(node, [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }, { transform: 'translateY(0)' }], 420, { delay });

  /* ---------- the patch ---------- */
  const patch = [];
  function grow(i, ci) {
    const P = makePumpkin(ci, patchLayer);
    P.g.setAttribute('class', 'pkin tap');
    P.g.dataset.act = 'patch'; P.g.dataset.i = i;
    place(P, PATCH[i].x, PATCH[i].y, PATCH_S);
    patch[i] = P;
    anim(P.a, [{ transform: 'scale(0)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 450, { easing: 'cubic-bezier(.3,1.6,.5,1)' });
  }
  const shuffled = COLORS.map((_, i) => i).sort(() => Math.random() - 0.5);
  PATCH.forEach((_, i) => grow(i, shuffled[i]));

  /* ---------- the carving board ---------- */
  ROWS.forEach((kind, r) => PARTS[kind].forEach((_, i) => {
    const b = el('g', { class: 'tap pk-btn', transform: `translate(${580 + i * 120},${110 + r * 85})` }, board);
    b.dataset.act = 'part'; b.dataset.kind = kind; b.dataset.i = i;
    const a = el('g', { class: 'anim' }, b);
    el('circle', { r: 38, class: 'pk-btn-bg' }, a);
    const art = el('g', { style: '--hole:#ff9a2e;--pkd:#d96a00' }, a);
    drawPart(art, kind, i, kind === 'mouth' ? 0.4 : kind === 'eyes' ? 0.8 : 1.15);
  }));
  function markButtons() {
    board.querySelectorAll('.pk-btn').forEach(b => b.classList.toggle('chosen', !!table && table.parts[b.dataset.kind] === +b.dataset.i));
  }

  /* ---------- the stars ---------- */
  for (let i = 0; i < 46; i++) {
    const x = rand(0, 1600), y = rand(0, 470);
    if (x > 470 && x < 1050 && y < 350) continue; // keep the board clear
    const g = el('g', { transform: `translate(${x.toFixed(0)},${y.toFixed(0)})` }, $('#pk-stars'));
    const c = el('circle', { r: rand(1.5, 4).toFixed(1), fill: '#fff', class: 'star' }, g);
    c.style.animationDelay = (-rand(0, 2.4)).toFixed(2) + 's';
  }

  /* ---------- the pumpkin on the stump ---------- */
  let table = null, busy = false;
  const state = { get table() { return table; }, porch: [], get busy() { return busy; } };

  async function pickPumpkin(i) {
    if (busy || !patch[i]) return;
    busy = true;
    const P = patch[i]; patch[i] = null;
    if (table) await clearTable();
    Sound.play('boing');
    P.g.setAttribute('class', 'pkin'); delete P.g.dataset.act; delete P.g.dataset.i;
    tableLayer.appendChild(P.g);
    await arc(P, TABLE.x, TABLE.y, TABLE.s, 650, 220);
    Sound.play('land'); squish(P);
    P.g.dataset.act = 'tablepk'; P.g.classList.add('tap');
    table = P; markButtons();
    sparkles(TABLE.x, TABLE.y - 40, { n: 8, colors: [COLORS[P.ci].main, '#fff'], spread: 160 });
    setTimeout(() => grow(i, Math.floor(Math.random() * COLORS.length)), 1400);
    busy = false;
    if (Math.random() < 0.6) ghostSay(pick(['Ooh, I like it!', 'What a pumpkin!', 'Now pick some eyes!']));
  }
  // a lit pumpkin hops onto the porch; an unlit one rolls away with a poof
  async function clearTable() {
    const P = table; table = null; markButtons();
    if (P.lit) return toPorch(P);
    Sound.play('swish');
    await tween(380, t => { place(P, lerp(TABLE.x, TABLE.x + 260, t), TABLE.y + t * 40, 1 - t * 0.5); P.a.setAttribute('transform', `rotate(${t * 140})`); });
    Sound.play('poof');
    sparkles(P.x, P.y, { n: 10, colors: ['#fff', '#d6d0f0'], shape: 'dot', spread: 90 });
    P.g.remove();
  }

  async function carve(kind, i, btn) {
    if (btn) hop(btn.querySelector('.anim'), 12);
    if (busy) return;
    if (!table) {
      // no pumpkin yet: an orange one hops over by itself
      const free = patch.findIndex(Boolean);
      if (free < 0) return;
      await pickPumpkin(free);
      if (!table) return;
    }
    const P = table;
    if (P.parts[kind] === i) { squish(P); Sound.play('squeak', 1); return; }
    if (P.nodes[kind]) P.nodes[kind].forEach(n => n.remove());
    P.parts[kind] = i;
    P.nodes[kind] = PART_AT[kind].map(([x, y]) => {
      const holder = el('g', { transform: `translate(${x},${y})` }, P.face);
      const g = drawPart(holder, kind, i);
      anim(g, [{ transform: 'scale(0) rotate(-40deg)' }, { transform: 'scale(1.25) rotate(8deg)' }, { transform: 'scale(1)' }], 420, { easing: 'cubic-bezier(.3,1.5,.5,1)' });
      return holder;
    });
    markButtons();
    Sound.play('carve'); squish(P);
    const [x, y] = PART_AT[kind][0];
    sparkles(P.x + (kind === 'eyes' ? 0 : x), P.y + y, { n: 10, colors: [COLORS[P.ci].main, COLORS[P.ci].dark, '#ffe7b0'], shape: 'bit', spread: 120, size: 12 });
    const part = PARTS[kind][i];
    App.Voice.say(part.name, { pitch: 1.6 });
    if (part.fx) setTimeout(() => partFx(P, part.fx), 300);
    if (P.lit) { setTimeout(() => pumpkinTalk(P), 900); return; }
    if (ROWS.every(k => P.parts[k] != null)) { busy = true; await wait(900); await light(P); busy = false; }
  }
  function partFx(P, kind) {
    if (kind === 'hearts') { Sound.play('love'); sparkles(P.x, P.y - 40, { n: 9, shape: 'heart', colors: ['#ff5c8a', '#ff9cc8'], up: 80, spread: 150 }); }
    else { Sound.play('twinkle'); sparkles(P.x, P.y - 40, { n: 12, colors: ['#ffd93b', '#fff'], up: 60, spread: 170 }); }
  }

  async function light(P) {
    Sound.play('ignite');
    P.lit = true; P.g.classList.add('lit');
    const C = COLORS[P.ci];
    rings(P.x, P.y - 10 * P.s, [C.glow, '#fff', C.glow], { scale: 10 * P.s });
    await wait(500);
    Sound.play('cheer');
    sparkles(P.x, P.y - 60, { n: 16, colors: [C.glow, '#fff', '#ffb347'], spread: 230, up: 40 });
    // matching shapes everywhere get an extra surprise
    if (P.parts.eyes === P.parts.nose && P.parts.eyes >= 2) partFx(P, PARTS.eyes[P.parts.eyes].fx);
    await wait(500);
    pumpkinTalk(P);
    setTimeout(() => { if (table === P) ghostSay(pick(['Ooh, spooky-cute!', 'It glows!', 'Put it on the house!'])); }, 2400);
  }
  function pumpkinTalk(P, onPorch) {
    const m = PARTS.mouth[P.parts.mouth || 0];
    const mouth = P.nodes.mouth && P.nodes.mouth[0].firstChild;
    if (mouth) anim(mouth, [{ transform: 'scale(1)' }, { transform: 'scale(1.1,1.5)' }, { transform: 'scale(1,.8)' }, { transform: 'scale(1.1,1.4)' }, { transform: 'scale(1)' }], 900);
    squish(P);
    if (onPorch) talk('porch', P.x, P.y - 110, m.line, { pitch: 1.2, rate: 1 });
    else talk('pk', P.x - 250 * P.s, P.y - 150 * P.s, m.line, { pitch: 1.2, rate: 1 });
  }

  /* ---------- the porch ---------- */
  async function toPorch(P) {
    const slot = PORCH.findIndex((_, i) => !state.porch[i]);
    let i = slot;
    if (i < 0) {
      // full: the oldest pumpkin floats off like a balloon to make room
      i = state.porch.reduce((b, q, j) => (q.t < state.porch[b].t ? j : b), 0);
      const old = state.porch[i];
      delete old.g.dataset.act;
      tween(900, t => { place(old, old.x, old.y - t * 500, PORCH_S * (1 - t * 0.4)); old.g.style.opacity = 1 - t; }).then(() => old.g.remove());
      Sound.play('poof');
    }
    porchLayer.appendChild(P.g);
    P.g.dataset.act = 'porchpk'; P.g.classList.add('tap');
    P.t = performance.now();
    state.porch[i] = P;
    Sound.play('toss');
    await arc(P, PORCH[i].x, PORCH[i].y, PORCH_S, 650, 160);
    Sound.play('land'); squish(P);
    if (!P.lit) await light(P);
    else rings(P.x, P.y, [COLORS[P.ci].glow, '#fff'], { scale: 4 });
    windows();
    if (state.porch.filter(Boolean).length >= 4) setTimeout(party, 500);
    else ghostSay(pick(['On the house!', 'So glowy!', 'Make another one!']));
  }
  function windows() {
    const n = state.porch.filter(Boolean).length;
    svg.querySelectorAll('.pk-win').forEach(w => { w.style.fillOpacity = (0.35 + 0.65 * n / 4).toFixed(2); });
  }

  async function party() {
    Sound.play('party');
    ghostSay('Spooky party!');
    dance(skel1, 3); dance(skel2, 3);
    anim(ghostAnim, [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(180deg) scale(1.2)' }, { transform: 'rotate(360deg) scale(1)' }], 1200, { iterations: 2 });
    bats(6);
    state.porch.forEach((P, i) => P && hop(P.a, 40, i * 150));
    const box = K.visibleBox(40);
    for (let i = 0; i < 4; i++) setTimeout(() => sparkles(rand(box.x0, box.x1), rand(150, 500), { n: 14, colors: ['#ffb347', '#b48cff', '#8fd16a', '#fff'], spread: 200 }), i * 350);
    svg.querySelectorAll('.pk-win').forEach(w => anim(w, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], 400, { iterations: 4 }));
  }

  /* ---------- the ghost ---------- */
  const ghost = $('#pk-ghost'), ghostAnim = ghost.querySelector('.anim'), ghostMouth = ghost.querySelector('.ghost-mouth');
  const GHOST_TALK = { x: 330, y: 170 };
  function ghostSay(text) {
    anim(ghostMouth, [{ transform: 'scale(1)' }, { transform: 'scale(1.3,1.7)' }, { transform: 'scale(1,.8)' }, { transform: 'scale(1.3,1.6)' }, { transform: 'scale(1)' }], 800);
    talk('ghost', GHOST_TALK.x, GHOST_TALK.y, text, { pitch: 1.9, rate: 1 });
  }
  let ghostTaps = 0;
  function tapGhost() {
    ghostTaps++;
    if (ghostTaps % 3 === 0) {
      // peekaboo: the ghost fades away and comes back
      Sound.play('swish');
      anim(ghostAnim, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0.08, transform: 'scale(.8)', offset: 0.3 }, { opacity: 0.08, transform: 'scale(.8)', offset: 0.7 }, { opacity: 1, transform: 'scale(1.1)' }], 1600);
      setTimeout(() => { Sound.play('boo'); ghostSay('Peekaboo!'); }, 1150);
      return;
    }
    Sound.play('boo');
    anim(ghostAnim, [{ transform: 'scale(1)' }, { transform: 'scale(1.25,.8)' }, { transform: 'scale(.9,1.15) translateY(-20px)' }, { transform: 'scale(1)' }], 500);
    ghostSay(pick(['Boo! Hee hee!', 'Boo!', 'Hello, friend!', 'I love pumpkins!']));
  }

  /* ---------- skeletons ---------- */
  const skel1 = $('#pk-skel1'), skel2 = $('#pk-skel2');
  const PIVOTS = { armL: [-14, -164], armR: [14, -164], legL: [-10, -86], legR: [10, -86], skull: [0, -172] };
  const PIVOTS2 = { armL: [-26, -8], armR: [26, -8], skull: [0, -6] };
  const rot = ([x, y], a) => ({ transform: `translate(${x}px,${y}px) rotate(${a}deg) translate(${-x}px,${-y}px)` });
  function dance(sk, beats = 2) {
    const pv = sk === skel1 ? PIVOTS : PIVOTS2, ms = 520;
    const swing = { armL: [0, 60, -20, 60, 0], armR: [0, -20, -60, -20, 0], legL: [0, 18, -6, 18, 0], legR: [0, 6, -18, 6, 0], skull: [0, -12, 12, -12, 0] };
    const style = Math.floor(Math.random() * 2);
    for (const k in pv) {
      const part = sk.querySelector('.' + k);
      if (!part) continue;
      const deg = swing[k].map(d => (style && k.startsWith('arm') ? -d : d));
      anim(part, deg.map(d => rot(pv[k], d)), ms, { iterations: beats, easing: 'ease-in-out' });
    }
    anim(sk.querySelector('.anim'), [{ transform: 'translate(0,0)' }, { transform: 'translate(-12px,-24px)' }, { transform: 'translate(0,0)' }, { transform: 'translate(12px,-24px)' }, { transform: 'translate(0,0)' }], ms, { iterations: beats });
    Sound.play('xylo', 4 + beats * 2);
    setTimeout(() => Sound.play('rattle'), ms * beats * 0.5);
  }

  /* ---------- bats from the moon ---------- */
  function bats(n) {
    Sound.play('batsqueak');
    for (let i = 0; i < n; i++) {
      const g = el('g', {}, layer.fx);
      const inner = el('g', {}, g);
      el('path', { d: 'M0 0 Q-20 -26 -50 -14 Q-40 -4 -42 10 Q-30 2 -22 10 Q-12 2 0 8 Q12 2 22 10 Q30 2 42 10 Q40 -4 50 -14 Q20 -26 0 0Z', fill: '#6a4cc0', stroke: '#2a1d52', 'stroke-width': 3, 'stroke-linejoin': 'round' }, inner);
      el('ellipse', { rx: 13, ry: 15, fill: '#6a4cc0', stroke: '#2a1d52', 'stroke-width': 3 }, g);
      el('path', { d: 'M-10 -10 l3 -12 l6 8 z M10 -10 l-3 -12 l-6 8 z', fill: '#6a4cc0' }, g);
      el('circle', { cx: -5, cy: -3, r: 3.5, fill: '#fff' }, g); el('circle', { cx: 5, cy: -3, r: 3.5, fill: '#fff' }, g);
      anim(inner, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(-.6)' }, { transform: 'scaleY(1)' }], 260, { iterations: Infinity });
      const x0 = 255, y0 = 110, x1 = rand(700, 1700), y1 = rand(60, 420), wob = rand(20, 60), ph = rand(0, 6), s = rand(0.7, 1.1);
      setTimeout(() => tween(rand(2200, 3200), t => {
        const x = lerp(x0, x1, t), y = lerp(y0, y1, t) + Math.sin(t * 12 + ph) * wob;
        g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${(s * Math.min(1, t * 5)).toFixed(2)})`);
        g.style.opacity = t > 0.85 ? (1 - t) / 0.15 : 1;
      }).then(() => g.remove()), i * 160);
    }
  }

  /* ---------- the door and its cat ---------- */
  const door = $('#pk-door'), cat = $('#pk-cat');
  let doorOpen = false;
  function tapDoor() {
    if (doorOpen) return;
    doorOpen = true;
    Sound.play('creak');
    const open = [{ transform: 'translate(1186px,0) scaleX(1) translate(-1186px,0)' }, { transform: 'translate(1186px,0) scaleX(.12) translate(-1186px,0)' }];
    anim(door, open, 500, { fill: 'forwards' });
    cat.style.opacity = 1;
    anim(cat, [{ transform: 'translateY(16px)' }, { transform: 'translateY(0)' }], 400, { delay: 300, fill: 'backwards' });
    setTimeout(() => { Sound.play('meow'); talk('cat', 1220, 440, pick(['Meow!', 'Purr...', 'Mew mew!']), { pitch: 2, rate: 1.1 }); }, 600);
    setTimeout(() => {
      Sound.play('creak');
      const a = anim(door, open.slice().reverse(), 500, { fill: 'forwards' });
      setTimeout(() => { cat.style.opacity = 0; doorOpen = false; if (a) a.cancel(); }, 520);
    }, 2600);
  }

  function tapHouse() {
    Sound.play('creak');
    anim($('#pk-house'), [{ transform: 'translate(0,0)' }, { transform: 'translate(-4px,0)' }, { transform: 'translate(4px,0)' }, { transform: 'translate(0,0)' }], 300, { iterations: 2 });
    svg.querySelectorAll('.pk-win').forEach((w, i) => anim(w, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], 300, { delay: i * 150 }));
    if (Math.random() < 0.5) bats(2);
  }

  /* ---------- input ---------- */
  let drag = null, lastInput = performance.now(), hints = 0;
  svg.addEventListener('pointerdown', e => {
    lastInput = performance.now(); hints = 0;
    const hit = e.target.closest('[data-act]');
    if (!hit) return;
    const act = hit.dataset.act;
    if (act === 'tablepk') {
      if (busy || drag || hit._P !== table) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      const p = toSvg(e.clientX, e.clientY);
      drag = { id: e.pointerId, ox: p.x - table.x, oy: p.y - table.y, cx: e.clientX, cy: e.clientY, moved: false };
      return;
    }
    if (act === 'patch') pickPumpkin(+hit.dataset.i);
    else if (act === 'part') carve(hit.dataset.kind, +hit.dataset.i, hit);
    else if (act === 'porchpk') { const P = hit._P; anim(P.face, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], 500); hop(P.a, 30); Sound.play('chime', state.porch.indexOf(P) + 1); pumpkinTalk(P, true); }
    else if (act === 'ghost') tapGhost();
    else if (act === 'skeleton') dance(hit, 2);
    else if (act === 'moon') { Sound.play('twinkle'); anim(hit.querySelector('.anim'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-15deg) scale(1.1)' }, { transform: 'rotate(0)' }], 500); bats(4); }
    else if (act === 'door') tapDoor();
    else if (act === 'house') tapHouse();
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    lastInput = performance.now();
    if (!drag.moved && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) > 12) { drag.moved = true; Sound.play('pop'); }
    if (!drag.moved) return;
    const p = toSvg(e.clientX, e.clientY);
    drag.p = p;
    place(table, p.x - drag.ox * 0.7, p.y - drag.oy * 0.7, 0.7);
  });
  const overHouse = p => p && p.x > HOUSE.x0 && p.x < HOUSE.x1 && p.y > HOUSE.y0 && p.y < HOUSE.y1;
  async function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    const P = table;
    if (!P) return;
    if (!d.moved) {
      squish(P);
      if (P.lit) pumpkinTalk(P); else { Sound.play('squeak', 2); App.Voice.say(pick(['Hee hee!', 'Tickles!']), { pitch: 1.6 }); }
      return;
    }
    if (overHouse(d.p)) {
      busy = true; table = null; markButtons();
      await toPorch(P);
      busy = false;
      return;
    }
    await arc(P, TABLE.x, TABLE.y, TABLE.s, 320, 30);
    Sound.play('land'); squish(P);
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  /* ---------- gentle hints when nobody is tapping ---------- */
  setInterval(() => {
    if (App.current !== 'pumpkin' || busy || drag || performance.now() - lastInput < 9000 || hints >= 3) return;
    lastInput = performance.now(); hints++;
    if (!table) {
      ghostSay('Pick a pumpkin!');
      patch.forEach((P, i) => P && hop(P.a, 30, i * 120));
      return;
    }
    const next = ROWS.find(k => table.parts[k] == null);
    if (next) {
      ghostSay({ eyes: 'Pick some eyes!', nose: 'Now a nose!', mouth: 'Now a mouth!' }[next]);
      board.querySelectorAll(`[data-kind=${next}] .anim`).forEach((a, i) => hop(a, 16, i * 100));
    } else {
      ghostSay('Put it on the house!');
      hop(table.a, 30);
    }
  }, 1000);
  // the skeletons wiggle now and then
  setInterval(() => {
    if (App.current !== 'pumpkin' || Math.random() < 0.5) return;
    const sk = pick([skel1, skel2]);
    anim(sk.querySelector('.skull'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], 700);
  }, 3000);

  App.register({
    id: 'pumpkin',
    screen: svg,
    enter() {
      lastInput = performance.now(); hints = 0;
      Sound.setMood('spooky');
      setTimeout(() => { ghostSay(table ? 'Boo! Welcome back!' : "Let's make a pumpkin!"); if (!table) patch.forEach((P, i) => P && hop(P.a, 30, i * 120)); }, 500);
    },
    leave() { drag = null; if (table && !busy) place(table, TABLE.x, TABLE.y, TABLE.s); },
    clear() {
      if (busy) return;
      if (table) { table.g.remove(); table = null; }
      state.porch.forEach(P => P && P.g.remove());
      state.porch.length = 0;
      windows(); markButtons();
    },
  });

  window.__pumpkin = { state, patch, pickPumpkin, carve, toPorch, party, dance, bats, PARTS };
})();
