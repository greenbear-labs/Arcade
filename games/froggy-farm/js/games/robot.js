/* The robot repair shop: pick a broken gadget (radio, alarm clock, TV, robot dog, toaster or
 * music box). Everything is done by dragging: drag the screwdriver onto the screws and the
 * cover pops off, drag the vacuum over the dust (something silly is always hiding in there),
 * pull the broken parts out and drag them into the junk bin, drag shiny new parts in from the
 * parts box, drag the cover back on and screw it shut. Slide the power switch and it comes
 * back to life. Then drag on silly add-ons (propeller hat, rocket, googly eyes, mustache, arms,
 * party lights) and tap it to see them all at once. Nothing can go wrong. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const svg = $('#robot');
  const layer = { fx: $('#rb-fx'), bubbles: $('#rb-bubbles') };
  const K = Kit(svg, layer);
  const { el, anim, toSvg, tween, sparkles, rings, talk, rand, pick, lerp, wait, starPath, shapes } = K;
  const bay = $('#rb-bay'), park = $('#rb-park'), toolsG = $('#rb-tools'), addsG = $('#rb-adds');
  const PANELS = { tools: $('#rb-tools-panel'), power: $('#rb-power-panel'), add: $('#rb-add-panel'), next: $('#rb-next') };
  const bot = $('#rb-bot'), botAnim = bot.querySelector('.anim'), powerBtn = $('#rb-power');

  const SPOT = { x: 800, y: 720 };
  const BOT = { x: 300, y: 720, s: 0.8 };
  const BIN = { x: 1284, y: 600 };
  const LID_PARK = { x: 1112, y: 670 };
  const SCREW_AT = [[-122, -206], [122, -206], [-122, -74], [122, -74]];
  const SLOT_X = [-90, 0, 90], SLOT_Y = -140;
  const LINE = 'rgba(0,0,0,.28)';
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  const rot = ([x, y], a) => ({ transform: `translate(${x}px,${y}px) rotate(${a}deg) translate(${-x}px,${-y}px)` });
  const hop = (node, h = 16, delay = 0) => anim(node, [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }, { transform: 'translateY(0)' }], 420, { delay });

  /* ---------- the gadgets ---------- */
  const knob = (g, x, y, r) => el('circle', { cx: x, cy: y, r, fill: '#fff3d6', stroke: LINE, 'stroke-width': 4 }, g);
  const TYPES = {
    radio: {
      color: '#ff8a3d', side: 210, top: [0, -480], edge: -400, face: { x: 0, y: -312, s: 1 },
      sad: ['My music is broken!', 'I can only go bzzzt!'], happy: ['La la la!', 'Dance with me!'],
      draw(g, P, G) {
        el('path', { d: 'M-130 -400 L-120 -455 Q0 -492 120 -455 L130 -400', fill: 'none', stroke: '#5b6670', 'stroke-width': 18, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
        G.ant = el('g', {}, g);
        el('path', { d: 'M150 -400 L215 -540', stroke: '#8a96a0', 'stroke-width': 8, 'stroke-linecap': 'round' }, G.ant);
        el('circle', { cx: 215, cy: -545, r: 14, fill: '#ff5c6c' }, G.ant);
        [-150, 150].forEach(x => el('rect', { x: x - 30, y: -22, width: 60, height: 22, rx: 8, fill: '#5b6670' }, g));
        P('rect', { x: -210, y: -400, width: 420, height: 385, rx: 44 });
        [-176, 176].forEach(x => { knob(g, x, -110, 20); knob(g, x, -180, 12); });
      },
      async job(G) {
        Sound.play('xylo', 10);
        anim(G.a, [{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }], 500, { iterations: 3 });
        anim(G.ant, [rot([150, -400], 0), rot([150, -400], -16), rot([150, -400], 12), rot([150, -400], 0)], 400, { iterations: 3 });
        for (let i = 0; i < 7; i++) setTimeout(() => note(G.x + rand(-160, 160) * G.s, G.y - 420 * G.s), i * 180);
        await wait(1500);
      },
    },
    clock: {
      color: '#5cb3ff', side: 222, top: [0, -505], edge: -462, face: { x: 0, y: -392, s: 0.8 },
      sad: ["I can't tick!", 'Tick... tock... ow!'], happy: ['Ring ring! Wake up!', 'Tick tock!'],
      draw(g, P, G) {
        [-1, 1].forEach(sx => el('path', { d: `M${sx * 110} -70 L${sx * 160} 0`, stroke: '#5b6670', 'stroke-width': 18, 'stroke-linecap': 'round' }, g));
        G.bells = [-1, 1].map(sx => {
          const b = el('g', { transform: `translate(${sx * 150},-448) rotate(${sx * 28})` }, g);
          const bi = el('g', {}, b);
          el('circle', { cy: -64, r: 11, fill: '#e0a800' }, bi);
          el('path', { d: 'M-62 0 A62 62 0 0 1 62 0 Z', fill: '#ffd93b', stroke: '#e0a800', 'stroke-width': 6, 'stroke-linejoin': 'round' }, bi);
          return bi;
        });
        P('circle', { cy: -255, r: 235 });
        [[0, -462], [-205, -255], [205, -255], [0, -40]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 9, fill: '#fff', opacity: 0.8 }, g));
      },
      async job(G) {
        Sound.play('alarm');
        anim(G.a, [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }], 110, { iterations: 8 });
        G.bells.forEach((b, i) => anim(b, [{ transform: 'rotate(0)' }, { transform: `rotate(${i ? 14 : -14}deg)` }, { transform: 'rotate(0)' }], 120, { iterations: 7 }));
        await wait(1000);
      },
    },
    tv: {
      color: '#b98bff', side: 220, top: [0, -580], edge: -470, face: { x: 0, y: -356, s: 0.95, color: '#9ff3ff' },
      sad: ['My picture is fuzzy!', 'Fzzzzzt!'], happy: ['Showtime!', 'Look at my colors!'],
      draw(g, P, G) {
        [-1, 1].forEach(sx => { el('path', { d: `M0 -470 L${sx * 95} -570`, stroke: '#5b6670', 'stroke-width': 8, 'stroke-linecap': 'round' }, g); el('circle', { cx: sx * 95, cy: -572, r: 12, fill: '#ff5c6c' }, g); });
        [-150, 150].forEach(x => el('path', { d: `M${x} -40 L${x * 1.1} 0`, stroke: '#5b6670', 'stroke-width': 16, 'stroke-linecap': 'round' }, g));
        P('rect', { x: -220, y: -470, width: 440, height: 440, rx: 36 });
        G.screen = el('rect', { x: -176, y: -448, width: 352, height: 186, rx: 28, fill: '#26323d', stroke: LINE, 'stroke-width': 5 }, g);
        [-186, 186].forEach(x => knob(g, x, -140, 16));
      },
      async job(G) {
        Sound.play('tvtune');
        const bars = el('g', {}, G.a);
        const cols = ['#ff5c6c', '#ffa53b', '#ffe14d', '#6fdc6a', '#5cb3ff', '#b98bff'];
        cols.forEach((c, i) => el('rect', { x: -176 + i * 352 / 6, y: -448, width: 352 / 6 + 1, height: 186, fill: c }, bars));
        anim(bars, [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], 200, { iterations: 6 });
        for (let i = 0; i < 4; i++) setTimeout(() => sparkles(G.x + rand(-150, 150) * G.s, G.y - 360 * G.s, { n: 4, colors: cols, spread: 120 }), i * 250);
        await wait(1300);
        bars.remove();
      },
    },
    dog: {
      color: '#ffc94d', side: 205, top: [210, -455], edge: -275, face: { x: 210, y: -360, s: 0.7 },
      sad: ['Woof... I feel wobbly!', 'Arf! Fix me!'], happy: ['Woof woof!', 'Arf! Play with me!'],
      draw(g, P, G) {
        G.tail = el('g', {}, g);
        el('path', { d: 'M-196 -220 Q-262 -232 -262 -306', stroke: 'rgba(0,0,0,.28)', 'stroke-width': 34, fill: 'none', 'stroke-linecap': 'round' }, G.tail);
        el('path', { d: 'M-196 -220 Q-262 -232 -262 -306', stroke: '#ffc94d', 'stroke-width': 24, fill: 'none', 'stroke-linecap': 'round' }, G.tail);
        [-170, -90, 50, 130].forEach(x => P('rect', { x, y: -70, width: 42, height: 70, rx: 14 }));
        P('rect', { x: -205, y: -275, width: 410, height: 232, rx: 46 });
        P('rect', { x: 110, y: -448, width: 200, height: 196, rx: 52 });
        [118, 302].forEach(x => el('ellipse', { cx: x, cy: -384, rx: 24, ry: 56, fill: '#c47a2c', stroke: LINE, 'stroke-width': 4 }, g));
        el('rect', { x: 128, y: -268, width: 164, height: 18, rx: 9, fill: '#ff5c6c' }, g);
        el('circle', { cx: 210, cy: -244, r: 12, fill: '#ffd93b', stroke: '#e0a800', 'stroke-width': 3 }, g);
      },
      async job(G) {
        Sound.play('bark');
        anim(G.tail, [rot([-196, -220], 0), rot([-196, -220], 22), rot([-196, -220], -10), rot([-196, -220], 0)], 260, { iterations: 6 });
        hop(G.a, 50); setTimeout(() => { hop(G.a, 40); Sound.play('bark'); }, 600);
        await wait(1300);
      },
    },
    toaster: {
      color: '#c9d3dc', side: 200, top: [0, -425], edge: -370, face: { x: 0, y: -295, s: 0.9 },
      sad: ["I can't make toast!", 'My toast is stuck!'], happy: ['Toast time!', 'Ding! Toast!'],
      draw(g, P, G) {
        G.toast = el('g', {}, g);
        [-76, 76].forEach(x => {
          const t = el('g', { transform: `translate(${x},-400)` }, G.toast);
          el('path', { d: 'M-40 70 L-40 -10 Q-48 -34 -26 -38 Q0 -52 26 -38 Q48 -34 40 -10 L40 70 Z', fill: '#f2c27a', stroke: '#b5793a', 'stroke-width': 5, 'stroke-linejoin': 'round' }, t);
        });
        [-150, 150].forEach(x => el('rect', { x: x - 28, y: -24, width: 56, height: 24, rx: 8, fill: '#5b6670' }, g));
        P('rect', { x: -200, y: -370, width: 400, height: 350, rx: 70 });
        el('path', { d: 'M-150 -330 L-110 -330 L-170 -60 L-196 -110 Z', fill: '#fff', opacity: 0.35 }, g);
        el('rect', { x: 200, y: -262, width: 28, height: 22, rx: 6, fill: '#5b6670' }, g);
        el('circle', { cx: 236, cy: -251, r: 16, fill: '#26323d' }, g);
      },
      async job(G) {
        Sound.play('ding');
        await wait(250);
        Sound.play('toss');
        anim(G.toast, [{ transform: 'translateY(0)' }, { transform: 'translateY(-280px) rotate(0)', offset: 0.45 }, { transform: 'translateY(-300px)', offset: 0.55 }, { transform: 'translateY(0)' }], 1200, { easing: 'ease-in-out' });
        await wait(1200);
        Sound.play('plop');
      },
    },
    musicbox: {
      color: '#ff8fc8', side: 200, top: [0, -470], edge: -350, face: { x: 0, y: -280, s: 0.65 },
      sad: ["I can't sing!", 'My song is all wobbly!'], happy: ['Tra la la!', 'Twinkle twinkle!'],
      draw(g, P, G) {
        el('path', { d: 'M0 -350 V-395', stroke: '#e0a800', 'stroke-width': 8 }, g);
        const st = el('g', { transform: 'translate(0,-425)' }, g);
        G.star = el('g', {}, st);
        el('path', { d: starPath(44, 19), fill: '#ffd93b', stroke: '#e0a800', 'stroke-width': 5, 'stroke-linejoin': 'round' }, G.star);
        P('rect', { x: -200, y: -330, width: 400, height: 312, rx: 26 });
        P('rect', { x: -215, y: -352, width: 430, height: 46, rx: 16 });
        G.crank = el('g', { transform: 'translate(200,-190)' }, g);
        const ci = el('g', {}, G.crank);
        el('path', { d: 'M0 0 H40 V36', stroke: '#8a96a0', 'stroke-width': 10, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ci);
        el('circle', { cx: 40, cy: 40, r: 13, fill: '#ff5c6c' }, ci);
        [-172, 172].forEach(x => el('path', { d: shapes.heart(14), transform: `translate(${x},-70)`, fill: '#fff', opacity: 0.8 }, g));
      },
      async job(G) {
        Sound.play('xylo', 10);
        anim(G.star, [{ transform: 'rotate(0)' }, { transform: 'rotate(720deg)' }], 1400, { easing: 'ease-in-out' });
        anim(G.crank.firstChild, [{ transform: 'rotate(0)' }, { transform: 'rotate(720deg)' }], 1400, { easing: 'linear' });
        for (let i = 0; i < 6; i++) setTimeout(() => note(G.x + rand(-120, 120) * G.s, G.y - 460 * G.s), i * 200);
        await wait(1500);
      },
    },
  };
  function note(x, y) {
    const g = el('g', { transform: `translate(${x.toFixed(0)},${y.toFixed(0)})` }, layer.fx);
    const n = el('g', {}, g);
    const c = pick(['#ff5c6c', '#5cb3ff', '#b98bff', '#5cc84a', '#ff9a2e']);
    el('ellipse', { cx: -8, cy: 14, rx: 13, ry: 10, fill: c, transform: 'rotate(-20 -8 14)' }, n);
    el('path', { d: 'M3 12 V-26 Q16 -20 20 -8', stroke: c, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, n);
    const a = anim(n, [{ transform: 'translate(0,0) scale(.5)', opacity: 1 }, { transform: `translate(${rand(-60, 60).toFixed(0)}px,-160px) scale(1.2)`, opacity: 0 }], 1400);
    if (a) a.onfinish = () => g.remove(); else g.remove();
  }

  /* ---------- faces: sad and sleepy while broken, happy once fixed ---------- */
  function drawFace(parent, T) {
    const f = T.face, c = f.color || '#26323d';
    const g = el('g', { class: 'rb-face', transform: `translate(${f.x},${f.y}) scale(${f.s})` }, parent);
    const sad = el('g', { class: 'sad' }, g);
    [-45, 45].forEach(x => {
      el('path', { d: `M${x - 21} -2 A21 21 0 0 0 ${x + 21} -2 Z`, fill: c }, sad);
      el('path', { d: `M${x - 25} -4 H${x + 25}`, stroke: c, 'stroke-width': 7, 'stroke-linecap': 'round' }, sad);
    });
    el('path', { d: 'M-32 50 Q-16 36 0 48 Q16 60 32 46', stroke: c, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }, sad);
    const happy = el('g', { class: 'happy' }, g);
    [-45, 45].forEach(x => { el('circle', { cx: x, cy: 0, r: 22, fill: c }, happy); el('circle', { cx: x + 7, cy: -7, r: 7, fill: '#fff' }, happy); });
    el('path', { d: 'M-40 36 Q0 80 40 36', stroke: c, 'stroke-width': 9, fill: 'none', 'stroke-linecap': 'round' }, happy);
    [-76, 76].forEach(x => el('circle', { cx: x, cy: 30, r: 15, fill: '#ff8fa8', opacity: 0.6 }, happy));
  }

  /* ---------- the parts that go inside ---------- */
  const GOOD = { battery: '#5cdc4a', gear: '#ffc23d', bulb: '#fff27a', spring: '#5cb3ff' };
  const OLD = '#8f969e', OLD_LINE = '#5d646c';
  const GHOST = { fill: 'none', stroke: 'rgba(255,255,255,.6)', 'stroke-width': 4, 'stroke-dasharray': '8 7' };
  function gearPath(R, r, n, skip) {
    let d = '';
    for (let k = 0; k < n * 4; k++) {
      const a = (k / (n * 4)) * Math.PI * 2 - Math.PI / 2, tooth = Math.floor(k / 4);
      const rad = (k % 4 < 2 && tooth !== skip) ? R : r;
      d += (k ? 'L' : 'M') + (Math.cos(a) * rad).toFixed(1) + ' ' + (Math.sin(a) * rad).toFixed(1);
    }
    return d + 'Z';
  }
  function partFace(g, x, y, broken) {
    const c = '#3a4048';
    if (broken) {
      el('path', { d: `M${x - 14} ${y} h8 M${x + 6} ${y} h8`, stroke: c, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
      el('path', { d: `M${x - 8} ${y + 14} Q${x} ${y + 8} ${x + 8} ${y + 14}`, stroke: c, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
    } else {
      el('circle', { cx: x - 9, cy: y, r: 4.5, fill: c }, g); el('circle', { cx: x + 9, cy: y, r: 4.5, fill: c }, g);
      el('path', { d: `M${x - 9} ${y + 9} Q${x} ${y + 18} ${x + 9} ${y + 9}`, stroke: c, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
    }
  }
  const PARTS = {
    battery(g, mode) {
      const br = mode === 'broken', st = mode === 'ghost' ? GHOST : { fill: br ? OLD : GOOD.battery, stroke: br ? OLD_LINE : '#2f9a3a', 'stroke-width': 4 };
      el('rect', Object.assign({ x: -12, y: -46, width: 24, height: 12, rx: 4 }, st), g);
      el('rect', Object.assign({ x: -27, y: -36, width: 54, height: 80, rx: 12 }, st), g);
      if (mode === 'ghost') return;
      if (br) { el('rect', { x: -17, y: 28, width: 34, height: 9, rx: 4, fill: '#ff5c5c' }, g); partFace(g, 0, -6, true); }
      else { el('path', { d: 'M5 -30 L-11 -8 L-1 -8 L-7 10 L11 -14 L1 -14 Z', fill: '#fff6a0' }, g); partFace(g, 0, 22, false); }
    },
    gear(g, mode) {
      const br = mode === 'broken', st = mode === 'ghost' ? GHOST : { fill: br ? OLD : GOOD.gear, stroke: br ? OLD_LINE : '#d99a00', 'stroke-width': 4, 'stroke-linejoin': 'round' };
      el('path', Object.assign({ d: gearPath(40, 30, 8, br ? 1 : -1) }, st), g);
      if (mode === 'ghost') return;
      if (br) el('path', { d: 'M8 -30 L0 -14 L10 -4', stroke: OLD_LINE, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
      partFace(g, 0, -2, br);
    },
    bulb(g, mode) {
      const br = mode === 'broken';
      if (mode === 'ghost') { el('circle', Object.assign({ cy: -12, r: 30 }, GHOST), g); el('rect', Object.assign({ x: -16, y: 16, width: 32, height: 26, rx: 5 }, GHOST), g); return; }
      if (!br) el('circle', { cy: -12, r: 44, fill: '#fff27a', opacity: 0.4, class: 'rb-glow' }, g);
      el('rect', { x: -16, y: 14, width: 32, height: 28, rx: 5, fill: '#b5bcc4', stroke: '#7d858d', 'stroke-width': 4 }, g);
      el('path', { d: 'M-16 24 H16 M-16 33 H16', stroke: '#7d858d', 'stroke-width': 3 }, g);
      el('circle', { cy: -12, r: 30, fill: br ? '#5a6270' : GOOD.bulb, stroke: br ? '#3a4048' : '#e0c200', 'stroke-width': 4 }, g);
      if (br) el('path', { d: 'M-12 -36 L-2 -24 L-12 -14 L0 -4', stroke: '#d8dde2', 'stroke-width': 3, fill: 'none' }, g);
      partFace(g, 0, -14, br);
    },
    spring(g, mode) {
      const br = mode === 'broken', ghost = mode === 'ghost';
      const col = ghost ? null : br ? OLD : GOOD.spring;
      let d = 'M0 -30';
      for (let i = 0; i < 7; i++) d += ` L${i % 2 ? -22 : 22} ${-26 + i * 9}`;
      d += ' L0 34';
      if (ghost) { el('rect', Object.assign({ x: -28, y: -44, width: 56, height: 88, rx: 10 }, GHOST), g); return; }
      el('rect', { x: -26, y: -46, width: 52, height: 14, rx: 6, fill: col, stroke: br ? OLD_LINE : '#2f7fbf', 'stroke-width': 4 }, g);
      el('rect', { x: -26, y: 32, width: 52, height: 14, rx: 6, fill: col, stroke: br ? OLD_LINE : '#2f7fbf', 'stroke-width': 4 }, g);
      el('path', { d, transform: br ? 'rotate(16) translate(6,0)' : '', stroke: col, 'stroke-width': 9, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    },
  };
  function makePart(type, broken, parent) {
    const node = el('g', { class: 'rb-part' + (broken ? ' rb-old' : '') }, parent);
    const a = el('g', { class: 'anim' }, node);
    PARTS[type](a, broken ? 'broken' : 'good');
    return node;
  }
  function partIcon(type, g) { PARTS[type](g, 'good'); }

  /* ---------- the silly things hiding inside ---------- */
  const FINDS = {
    mouse(g) {
      el('ellipse', { rx: 26, ry: 18, fill: '#b5bcc4', stroke: '#7d858d', 'stroke-width': 3 }, g);
      el('circle', { cx: 22, cy: -14, r: 10, fill: '#ffc4d6', stroke: '#7d858d', 'stroke-width': 3 }, g);
      el('circle', { cx: 24, cy: -2, r: 3.5, fill: '#26323d' }, g);
      el('path', { d: 'M-26 4 Q-46 10 -44 -10', stroke: '#ff8fa8', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
      el('circle', { cx: 32, cy: 6, r: 4, fill: '#ff8fa8' }, g);
    },
    sock(g) {
      el('path', { d: 'M-12 -30 L12 -30 L12 8 Q30 10 30 24 Q30 34 16 34 L-8 34 Q-14 34 -12 26 Z', fill: '#fff', stroke: '#ff5c6c', 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
      el('path', { d: 'M-12 -18 H12 M-12 -6 H12', stroke: '#ff5c6c', 'stroke-width': 5 }, g);
    },
    cookie(g) {
      el('circle', { r: 26, fill: '#e8b46a', stroke: '#b5793a', 'stroke-width': 4 }, g);
      [[-10, -8], [9, -12], [12, 8], [-8, 12], [0, 0]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 4.5, fill: '#5a3a22' }, g));
    },
    duck(g) {
      el('ellipse', { cy: 6, rx: 26, ry: 16, fill: '#ffd93b', stroke: '#e8b400', 'stroke-width': 4 }, g);
      el('circle', { cx: 14, cy: -14, r: 13, fill: '#ffd93b', stroke: '#e8b400', 'stroke-width': 4 }, g);
      el('path', { d: 'M25 -16 L40 -12 L25 -8Z', fill: '#ff9f1c' }, g);
      el('circle', { cx: 17, cy: -17, r: 3.5, fill: '#26323d' }, g);
    },
    marble(g) {
      el('circle', { r: 20, fill: '#5cb3ff', stroke: '#2f7fbf', 'stroke-width': 4 }, g);
      el('path', { d: 'M-12 -4 Q0 -18 12 -4 Q0 10 -12 -4Z', fill: '#ff5c6c' }, g);
      el('circle', { cx: -7, cy: -9, r: 5, fill: '#fff', opacity: 0.8 }, g);
    },
  };

  /* ---------- building a gadget ---------- */
  function makeGadget(type, parent) {
    const T = TYPES[type];
    const g = el('g', { class: 'rb-gad' }, parent);
    g.style.setProperty('--body', T.color);
    const tilt = el('g', {}, g);
    const a = el('g', { class: 'anim' }, tilt);
    const G = { type, T, g, tilt, a, x: 0, y: 0, s: 1, done: {}, slots: [], screws: [], adds: {}, lidOff: false, decorated: false, fixed: false };
    g._G = G;
    G.back = el('g', {}, a);
    const body = el('g', {}, a);
    const P = (tag, attrs) => el(tag, Object.assign({ fill: T.color, stroke: LINE, 'stroke-width': 6, 'stroke-linejoin': 'round' }, attrs), body);
    T.draw(body, P, G);
    G.body = body;
    // the inside, under the cover
    const inside = el('g', {}, a);
    el('rect', { x: -140, y: -225, width: 280, height: 170, rx: 18, fill: '#2e3a48', stroke: '#1d2630', 'stroke-width': 4 }, inside);
    el('path', { d: 'M-130 -100 H-108 V-70 H-60 M130 -180 H112 V-210 H60 M-30 -215 V-196 M30 -64 V-80 H60', stroke: '#4fdc8a', 'stroke-width': 4, fill: 'none', opacity: 0.6 }, inside);
    const types = shuffle(Object.keys(PARTS)).slice(0, 3);
    const nBroken = Math.random() < 0.3 ? 3 : 2;
    const broken = shuffle([0, 1, 2]).slice(0, nBroken);
    G.slots = types.map((pt, i) => {
      const sg = el('g', { transform: `translate(${SLOT_X[i]},${SLOT_Y})` }, inside);
      sg.dataset.slot = i;
      el('rect', { x: -40, y: -50, width: 80, height: 100, rx: 14, fill: '#3c4a5a', stroke: '#56687a', 'stroke-width': 4 }, sg);
      const ghost = el('g', { class: 'rb-ghost', style: 'display:none' }, sg);
      PARTS[pt](ghost, 'ghost');
      const holder = el('g', {}, sg);
      const S = { i, x: SLOT_X[i], y: SLOT_Y, type: pt, g: sg, ghost, holder, part: null, busy: false };
      S.part = { broken: broken.includes(i), node: makePart(pt, broken.includes(i), holder) };
      return S;
    });
    // the silly find, then the dust on top
    G.findKind = pick(Object.keys(FINDS));
    const fx = rand(-90, 90), fy = -76;
    G.find = el('g', { transform: `translate(${fx.toFixed(0)},${fy})` }, inside);
    G.find._x = fx; G.find._y = fy;
    FINDS[G.findKind](el('g', { transform: 'scale(.9)' }, G.find));
    G.dustG = el('g', {}, inside);
    addDust(G, 11);
    G.inside = inside;
    drawFace(a, T);
    G.lidHolder = el('g', {}, a);
    G.lid = makeLid(G, G.lidHolder);
    G.screwG = el('g', {}, a);
    G.screws = SCREW_AT.map(([hx, hy], i) => {
      const n = el('g', { transform: `translate(${hx},${hy})` }, G.screwG);
      n.dataset.screw = i;
      drawScrew(el('g', {}, n));
      return { i, hx, hy, node: n, state: 'in' };
    });
    G.addG = el('g', {}, a);
    return G;
  }
  function makeLid(G, parent) {
    const lid = el('g', { class: 'rb-lid', transform: 'translate(0,-140)' }, parent);
    el('rect', { x: -152, y: -96, width: 304, height: 192, rx: 24, fill: G.T.color, stroke: LINE, 'stroke-width': 6 }, lid);
    el('rect', { x: -152, y: -96, width: 304, height: 192, rx: 24, fill: 'rgba(0,0,0,.1)' }, lid);
    el('path', { d: 'M-70 -36 H70 M-70 -12 H70 M-70 12 H70', stroke: LINE, 'stroke-width': 9, 'stroke-linecap': 'round' }, lid);
    el('path', { d: 'M8 30 L-12 56 L0 56 L-8 76 L14 48 L2 48 L10 30 Z', fill: '#ffd93b', stroke: 'rgba(0,0,0,.2)', 'stroke-width': 2 }, lid);
    SCREW_AT.forEach(([x, y]) => el('circle', { cx: x, cy: y + 140, r: 11, fill: '#26323d', opacity: 0.45 }, lid));
    return lid;
  }
  function drawScrew(g) {
    el('circle', { r: 17, fill: '#d6dde3', stroke: '#7d858d', 'stroke-width': 4 }, g);
    el('path', { d: 'M-9 0 H9 M0 -9 V9', stroke: '#7d858d', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  }
  function addDust(G, n) {
    for (let i = 0; i < n; i++) {
      const x = rand(-118, 118), y = rand(-205, -75);
      const h = el('g', { transform: `translate(${x.toFixed(0)},${y.toFixed(0)})`, class: 'rb-dust' }, G.dustG);
      const m = el('g', {}, h);
      const c = pick(['#9aa0a6', '#aeb4ba', '#c2c7cc']);
      el('circle', { r: rand(17, 24).toFixed(0), fill: c }, m);
      for (let j = 0; j < 4; j++) el('circle', { cx: rand(-22, 22).toFixed(0), cy: rand(-16, 16).toFixed(0), r: rand(8, 13).toFixed(0), fill: c }, m);
      if (i % 3 === 0) [-7, 7].forEach(ex => { el('circle', { cx: ex, cy: -3, r: 5, fill: '#fff' }, m); el('circle', { cx: ex, cy: -2, r: 2.5, fill: '#26323d' }, m); });
      h._x = x; h._y = y;
    }
    // a cobweb in the corner
    const w = el('g', { class: 'rb-dust', transform: 'translate(-140,-225)' }, G.dustG);
    const wi = el('g', {}, w);
    el('path', { d: 'M0 0 L70 8 M0 0 L52 44 M0 0 L10 70 M24 3 Q18 18 4 22 M46 6 Q36 30 8 44 M64 8 Q50 46 9 64', stroke: '#eef1f3', 'stroke-width': 3, fill: 'none', opacity: 0.9 }, wi);
    w._x = -110; w._y = -195;
  }
  const dustLeft = G => G.dustG.querySelectorAll('.rb-dust:not(.gone)');

  function place(G, x, y, s) {
    G.x = x; G.y = y; G.s = s;
    G.g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(3)})`);
  }
  const L2S = (G, x, y) => ({ x: G.x + x * G.s, y: G.y + y * G.s });
  const S2L = (G, p) => ({ x: (p.x - G.x) / G.s, y: (p.y - G.y) / G.s });
  const overGadget = (G, p) => { const l = S2L(G, p); return l.x > -G.T.side - 40 && l.x < G.T.side + 40 && l.y > G.T.top[1] && l.y < 10; };
  const overPanel = (G, p) => { const l = S2L(G, p); return l.x > -160 && l.x < 160 && l.y > -245 && l.y < -35; };
  const bounce = (G, h = 18) => anim(G.a, [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px) scale(1.02,.98)` }, { transform: 'translateY(0)' }], 360);
  const setTilt = (G, deg) => { G.tiltDeg = deg; G.tilt.setAttribute('transform', `rotate(${deg})`); };

  // something flies from one place to another along a little arc
  function arc(node, from, to, ms, h, s0 = 1, s1 = 1, spin = 0) {
    return tween(ms, t => {
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e) - Math.sin(Math.PI * t) * h;
      node.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(spin * t).toFixed(0)}) scale(${lerp(s0, s1, t).toFixed(3)})`);
    });
  }

  /* ---------- stages: pick, fix, power, play ---------- */
  let stage = '';
  const SHOW = { pick: ['next'], fix: ['tools', 'next'], power: ['power', 'next'], play: ['add', 'next'] };
  function setStage(s) {
    if (s === stage) return;
    stage = s;
    if (s === 'power') resetSwitch();
    for (const k in PANELS) {
      const n = PANELS[k], on = SHOW[s].includes(k), shown = n.style.display !== 'none';
      if (on && !shown) {
        n.style.display = '';
        if (k === 'next') anim(n.querySelector('.anim'), [{ opacity: 0 }, { opacity: 1 }], 400);
        else anim(n, [{ transform: 'translateY(-200px)' }, { transform: 'translate(0,0)' }], 500, { easing: 'cubic-bezier(.3,1.4,.5,1)' });
      } else if (!on && shown) {
        const a = anim(n, [{ opacity: 1 }, { opacity: 0 }], 250);
        if (a) a.onfinish = () => { if (!SHOW[stage].includes(k)) n.style.display = 'none'; }; else n.style.display = 'none';
      }
    }
  }
  /* The repair is five steps, always in this order. The tool for the next step glows, the
   * others fade back, and each finished step gets a check mark. There is no pointing hand:
   * the robot says what to do, and if you wait it shows a see-through tool being dragged. */
  const STEPS = [
    { k: 'open', tool: 'driver', say: 'Drag the screwdriver to the screws!' },
    { k: 'clean', tool: 'vacuum', say: 'So dusty! Drag the vacuum around!' },
    { k: 'out', tool: 'pliers', say: 'Pull out the broken parts! Put them in the bin!' },
    { k: 'in', tool: 'box', say: 'Drag in shiny new parts from the box!' },
    { k: 'close', tool: 'driver', say: 'Now screw it back together!' },
  ];
  const sayOf = (G, st) => (st.k === 'close' && G.lidOff ? 'Drag the cover back on!' : st.say);
  const nextStep = G => STEPS.find(st => !G.done[st.k]);
  const toolBtn = t => toolsG.querySelector(`[data-tool=${t}]`);
  function updateGuide() {
    const st = V && stage === 'fix' ? nextStep(V) : null;
    const lidFirst = !!st && st.k === 'close' && V.lidOff;
    toolsG.querySelectorAll('[data-act=tool]').forEach(b => {
      const t = b.dataset.tool;
      b.classList.toggle('rb-next', !!st && !lidFirst && st.tool === t);
      b.classList.toggle('dim', !!st && (lidFirst || st.tool !== t));
      b.classList.toggle('done', !!V && (t === 'driver' ? !!V.done.close : !!V.done[STEPS.find(x => x.tool === t).k]));
    });
    if (V && V.lid) V.lid.classList.toggle('rb-pulse', lidFirst);
    powerBtn.classList.toggle('rb-next', stage === 'power');
    PANELS.next.classList.toggle('rb-next', stage === 'play' && !!V && V.decorated);
  }
  function stepDone(G, k) {
    if (G !== V || G.done[k]) return;
    G.done[k] = true;
    const i = STEPS.findIndex(st => st.k === k), b = toolBtn(STEPS[i].tool);
    Sound.play('chime', i + 1);
    sparkles(+b.dataset.x, +b.dataset.y, { n: 8, colors: ['#5cdc4a', '#ffe14d', '#fff'], spread: 90 });
    updateGuide();
    const nx = nextStep(G);
    if (nx) setTimeout(() => { if (V === G && nextStep(G) === nx && !G.finding) botSay(sayOf(G, nx)); }, 900);
    else maybeFinish(G);
  }
  function maybeFinish(G) {
    if (G !== V || stage !== 'fix' || nextStep(G)) return;
    setStage('power');
    setTimeout(() => { if (V === G) { botSay(pick(['All fixed! Slide the power switch!', 'Now slide the red switch!'])); updateGuide(); } }, 700);
  }

  /* ---------- the chooser: three broken gadgets wait on the bench ---------- */
  let V = null, choices = [], busy = false, leaving = false;
  const state = { get V() { return V; }, get choices() { return choices; }, get busy() { return busy; }, get stage() { return stage; } };

  async function spawnChooser() {
    busy = true;
    setStage('pick');
    const types = shuffle(Object.keys(TYPES)).slice(0, 3);
    choices = types.map((t, i) => {
      const G = makeGadget(t, bay);
      G.g.classList.add('tap'); G.g.dataset.act = 'pick'; G.g.dataset.i = i;
      setTilt(G, pick([-6, 6]));
      place(G, -300 - i * 220, SPOT.y, 0.32);
      return G;
    });
    Sound.play('whirr');
    await Promise.all(choices.map((G, i) => {
      const x0 = G.x, x1 = 640 + i * 160;
      return tween(1100, t => place(G, lerp(x0, x1, 1 - Math.pow(1 - t, 3)), SPOT.y, 0.32));
    }));
    busy = false;
    updateGuide();
    if (App.current === 'robot') botSay(pick(['Pick a broken one!', 'Which one should we fix?']));
  }

  async function pickGadget(i) {
    if (busy || V || !choices[i]) return;
    busy = true;
    const G = choices[i];
    Sound.play('zap'); bounce(G, 30);
    choices.forEach(O => {
      if (O === G) return;
      const x0 = O.x;
      tween(900, t => place(O, x0 + t * t * 1100, SPOT.y, 0.32)).then(() => O.g.remove());
    });
    choices = [];
    G.g.classList.remove('tap'); delete G.g.dataset.i;
    G.g.dataset.act = 'gad';
    const x0 = G.x, t0 = G.tiltDeg;
    await tween(700, t => { const e = 1 - Math.pow(1 - t, 3); place(G, lerp(x0, SPOT.x, e), SPOT.y, lerp(0.32, 1, e)); setTilt(G, lerp(t0, 0, e)); });
    Sound.play('land'); bounce(G, 12);
    V = G;
    busy = false;
    setStage('fix');
    updateGuide();
    setTimeout(() => gadSay(G, pick(G.T.sad)), 200);
    setTimeout(() => botSay(pick(["Let's fix it! Drag the screwdriver to a screw!", 'Beep boop! Grab the screwdriver!'])), 1800);
  }

  /* ---------- the robot ---------- */
  const faces = [...bot.querySelectorAll('.bf')];
  const armR = bot.querySelector('.rb-armR'), armL = bot.querySelector('.rb-armL'), head = bot.querySelector('.rb-head'), wheel = bot.querySelector('.rb-wheel .spin');
  let faceT = 0;
  function setFace(name, ms = 1600) {
    faces.forEach(f => { f.style.display = f.classList.contains('bf-' + name) ? '' : 'none'; });
    clearTimeout(faceT);
    if (name !== 'normal') faceT = setTimeout(() => setFace('normal'), ms);
  }
  const BOT_TALK = { x: 300, y: 236 };
  function botSay(text, face) {
    Sound.play('beepboop');
    anim(head, [{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], 300, { iterations: 2 });
    if (face) setFace(face);
    talk('bot', BOT_TALK.x, BOT_TALK.y, text, { pitch: 1.25, rate: 0.95 });
  }
  // the gadget talks from beside itself, so its bubble never covers the tool bar
  const gadSay = (G, text, opts) => { bounce(G, 14); talk('gad', G.x + (G.T.side + 170) * G.s, G.y - 330 * G.s, text, opts || { pitch: 1.7, rate: 1.05 }); };
  const waveArm = (times = 2) => anim(armR, [rot([96, -255], 0), rot([96, -255], -22), rot([96, -255], 10), rot([96, -255], 0)], 500, { iterations: times });
  let botTricks = 0;
  function tapBot() {
    const n = botTricks++ % 6;
    if (n === 0) {
      setFace('happy'); waveArm(2); Sound.play('beepboop');
      botSay(V ? pick(['I love fixing things!', 'Beep boop! Hello!']) : pick(['Hello! I fix things!', 'Beep boop!']));
    } else if (n === 1) {
      // spin around on the wheel
      Sound.play('whirr'); setFace('dizzy', 1800);
      anim(botAnim, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1)' }, { transform: 'scaleX(1)' }, { transform: 'scaleX(-1)' }, { transform: 'scaleX(1)' }], 900);
      anim(wheel, [{ transform: 'rotate(0)' }, { transform: 'rotate(720deg)' }], 900);
      setTimeout(() => botSay('Whoa! Dizzy!'), 950);
    } else if (n === 2) {
      // head pops up on a spring
      Sound.play('boing'); setFace('happy');
      anim(head, [{ transform: 'translateY(0)' }, { transform: 'translateY(-120px)' }, { transform: 'translateY(10px)' }, { transform: 'translateY(-30px)' }, { transform: 'translateY(0)' }], 900);
    } else if (n === 3) {
      setFace('heart', 2000); Sound.play('love');
      sparkles(BOT.x, BOT.y - 380, { n: 8, shape: 'heart', colors: ['#ff6b9d', '#ffb3c6'], spread: 120, up: 60 });
      botSay(pick(['I love you!', 'Robot hug!']));
    } else if (n === 4) {
      // dance
      Sound.play('beepboop'); setTimeout(() => Sound.play('beepboop'), 400); setFace('happy', 1800);
      anim(botAnim, [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }], 400, { iterations: 3 });
      anim(armL, [rot([-96, -255], 0), rot([-96, -255], 25), rot([-96, -255], 0)], 400, { iterations: 3 });
      waveArm(3);
    } else {
      // antenna zap
      Sound.play('zap'); setFace('dizzy');
      sparkles(BOT.x, BOT.y - 588 * BOT.s, { n: 10, colors: ['#ffe14d', '#fff'], spread: 80 });
      setTimeout(() => botSay('Bzzzt! Hee hee!'), 400);
    }
  }

  /* ---------- step 1 and 5: the screwdriver ---------- */
  async function unscrew(G, i) {
    const sc = G.screws[i];
    if (!sc || sc.state !== 'in' || G.done.open || G !== V) return;
    sc.state = 'moving';
    Sound.play('unscrew');
    const inner = sc.node.firstChild;
    await tween(420, t => inner.setAttribute('transform', `rotate(${(-t * 720).toFixed(0)}) scale(${(1 + t * 0.4).toFixed(2)})`));
    const from = L2S(G, sc.hx, sc.hy);
    park.appendChild(sc.node);
    sc.node.dataset.act = 'parked';
    inner.setAttribute('transform', '');
    await arc(sc.node, from, { x: 1036 + i * 42, y: 730 }, 480, 120, G.s * 1.4, 0.85, 360);
    Sound.play('land');
    sc.state = 'out';
    if (G.screws.every(s => s.state === 'out')) lidOff(G);
  }
  async function lidOff(G) {
    if (G.lidOff || G !== V) return;
    G.lidOff = true;
    Sound.play('boing');
    const from = L2S(G, 0, -140);
    park.insertBefore(G.lid, park.firstChild);
    G.lid.dataset.act = 'parked';
    G.lidArc = true;
    await arc(G.lid, from, LID_PARK, 600, 160, G.s, 0.55, -14);
    G.lidArc = false;
    Sound.play('clank');
    if (G !== V) return;
    stepDone(G, 'open');
    setTimeout(() => { if (V === G && dustLeft(G).length) gadSay(G, pick(['Ah... ah... choo!', 'So dusty in here!'])); if (V === G) Sound.play('sneeze'); }, 300);
  }
  async function lidOn(G) {
    if (!G.lidOff || G.lidMoving || G !== V) return;
    G.lidMoving = true;
    Sound.play('swish');
    await arc(G.lid, ghostPos(G.lid), L2S(G, 0, -140), 300, 30, 0.8, G.s, 0);
    G.lid.setAttribute('transform', 'translate(0,-140)');
    delete G.lid.dataset.act;
    G.lidHolder.appendChild(G.lid);
    G.lidOff = false; G.lidMoving = false;
    G.lid.classList.remove('rb-pulse');
    Sound.play('clank'); bounce(G, 8);
    sparkles(G.x, G.y - 140 * G.s, { n: 8, colors: ['#fff', '#ffe14d'], spread: 140 });
    updateGuide();
    setTimeout(() => { if (V === G && !G.done.close) botSay('Now drag the screwdriver to each screw!'); }, 500);
  }
  async function screwIn(G, i) {
    const sc = G.screws[i];
    if (!sc || sc.state !== 'out' || !G.done.in || G.done.close || G !== V) return;
    if (G.lidOff || G.lidMoving) return;
    sc.state = 'moving';
    const m = sc.node.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
    const from = { x: +m[1], y: +m[2] };
    await arc(sc.node, from, L2S(G, sc.hx, sc.hy), 420, 120, 0.85, G.s * 1.4, -360);
    if (G !== V) return;
    delete sc.node.dataset.act;
    sc.node.setAttribute('transform', `translate(${sc.hx},${sc.hy})`);
    G.screwG.appendChild(sc.node);
    const inner = sc.node.firstChild;
    Sound.play('screwin');
    await tween(420, t => inner.setAttribute('transform', `rotate(${(t * 720).toFixed(0)}) scale(${(1.4 - t * 0.4).toFixed(2)})`));
    sc.state = 'in';
    if (G.screws.every(s => s.state === 'in')) { sparkles(G.x, G.y - 140, { n: 10, colors: ['#fff', '#ffe14d'], spread: 160 }); stepDone(G, 'close'); }
  }
  /* ---------- step 2: the vacuum ---------- */
  function suck(G, h, to) {
    if (h.classList.contains('gone')) return;
    h.classList.add('gone');
    const from = L2S(G, h._x, h._y);
    const dx = (to ? to.x - from.x : rand(-60, 60)) / G.s, dy = (to ? to.y - from.y : -80) / G.s;
    const a = anim(h.firstChild, [{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 }, { transform: `translate(${dx.toFixed(0)}px,${dy.toFixed(0)}px) scale(.2) rotate(360deg)`, opacity: 0.2 }], 320, { fill: 'forwards', easing: 'ease-in' });
    setTimeout(() => h.remove(), 340);
    if (!a) h.remove();
    if (Math.random() < 0.5) Sound.play('suck');
    if (!dustLeft(G).length) setTimeout(() => cleanDone(G), 350);
  }
  function wipe(G, h) {
    if (h.classList.contains('gone')) return;
    h.classList.add('gone');
    const p = L2S(G, h._x, h._y);
    sparkles(p.x, p.y, { n: 5, colors: ['#c2c7cc', '#e6e9ec'], shape: 'dot', size: 9, spread: 60 });
    const a = anim(h.firstChild, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], 300, { fill: 'forwards' });
    setTimeout(() => h.remove(), 320);
    if (!a) h.remove();
    Sound.play('swish');
    if (!dustLeft(G).length) setTimeout(() => cleanDone(G), 350);
  }
  function dustNear(G, l, r) { return [...dustLeft(G)].filter(h => Math.hypot(h._x - l.x, h._y - l.y) < r); }
  function cleanDone(G) {
    if (G !== V || G.done.clean || dustLeft(G).length) return;
    G.finding = true;
    stepDone(G, 'clean');
    setTimeout(() => revealFind(G), 400);
  }
  // the silly thing hiding inside comes out
  async function revealFind(G) {
    if (G !== V || !G.find) { G.finding = false; return; }
    const kind = G.findKind, from = L2S(G, G.find._x, G.find._y);
    G.find.remove(); G.find = null;
    const n = el('g', { transform: `translate(${from.x},${from.y})` }, layer.fx);
    FINDS[kind](el('g', {}, n));
    Sound.play('pop');
    await arc(n, from, { x: from.x, y: from.y - 120 }, 400, 0, 1, 1.5);
    if (kind === 'mouse') {
      Sound.play('squeak', 4); botSay('Eek! A mouse!', 'dizzy');
      await arc(n, { x: from.x, y: from.y - 120 }, { x: from.x - 260, y: 700 }, 500, 60, 1.5, 1.2);
      Sound.play('squeak', 3);
      await tween(900, t => n.setAttribute('transform', `translate(${lerp(from.x - 260, -120, t).toFixed(0)},${(700 - Math.abs(Math.sin(t * 20)) * 14).toFixed(0)}) scale(-1.2,1.2)`));
    } else if (kind === 'sock') {
      Sound.play('boing');
      const top = { x: BOT.x, y: BOT.y - 540 * BOT.s };
      await arc(n, { x: from.x, y: from.y - 120 }, top, 700, 200, 1.5, 1.6, 340);
      botSay('Pee-yew! A stinky sock!', 'dizzy');
      await wait(1600);
      Sound.play('poof');
      await arc(n, top, { x: BOT.x - 220, y: 760 }, 600, 60, 1.6, 1.2, 200);
      await wait(400);
    } else if (kind === 'cookie') {
      const mouth = { x: BOT.x, y: BOT.y - 400 * BOT.s };
      await arc(n, { x: from.x, y: from.y - 120 }, mouth, 700, 180, 1.5, 1, 360);
      Sound.play('chomp'); setFace('happy', 2000);
      sparkles(mouth.x, mouth.y, { n: 8, colors: ['#e8b46a', '#5a3a22'], shape: 'dot', size: 7, spread: 70 });
      botSay('Yum! A cookie! Crunch crunch!');
    } else if (kind === 'duck') {
      Sound.play('quack');
      gadSay(G, 'Quack quack!');
      await arc(n, { x: from.x, y: from.y - 120 }, { x: BIN.x, y: BIN.y }, 800, 220, 1.5, 1, 360);
      Sound.play('quack'); wobbleBin();
    } else {
      Sound.play('xylo', 4);
      botSay('A marble! Wheee!');
      await arc(n, { x: from.x, y: from.y - 120 }, { x: from.x - 120, y: 722 }, 500, 40, 1.5, 1.2);
      for (let i = 0; i < 4; i++) setTimeout(() => Sound.play('land'), i * 160);
      await tween(900, t => n.setAttribute('transform', `translate(${lerp(from.x - 120, BOT.x + 60, t).toFixed(0)},722) rotate(${(-t * 900).toFixed(0)}) scale(1.2)`));
      setFace('happy'); hop(botAnim, 20);
    }
    n.remove();
    G.finding = false;
    if (V === G && nextStep(G)) setTimeout(() => { if (V === G && nextStep(G)) { botSay(sayOf(G, nextStep(G))); updateGuide(); } }, 600);
  }

  /* ---------- steps 3 and 4: carrying parts around ----------
   * A broken part comes out when you drag it (with a finger or the grabber), and you carry it
   * to the junk bin. Drop it anywhere else and it lands on the bench, where you can pick it up
   * again. New parts come out of the parts box when you drag from it, and snap into their
   * dashed outline when you drop them on the open gadget. */
  let carry = null;
  function startCarryOld(G, S, id, by) {
    if (!S || !S.part || !S.part.broken || G !== V || !G.done.clean || carry) return false;
    const node = S.part.node;
    node.classList.remove('rb-old');
    const p = L2S(G, S.x, S.y);
    layer.fx.appendChild(node);
    node.setAttribute('transform', `translate(${p.x.toFixed(0)},${p.y.toFixed(0)}) scale(1.15)`);
    S.part = null;
    S.ghost.style.display = '';
    Sound.play('pop'); Sound.play('grunt');
    sparkles(p.x, p.y, { n: 6, colors: ['#c2c7cc', '#fff'], shape: 'dot', size: 8, spread: 60 });
    carry = { id, node, kind: 'old', by, p };
    if (G.slots.every(s => !s.part || !s.part.broken)) stepDone(G, 'out');
    return true;
  }
  function startCarryJunk(n, id, p) {
    if (carry) return;
    layer.fx.appendChild(n);
    delete n.dataset.act;
    Sound.play('pop');
    carry = { id, node: n, kind: 'old', by: 'finger', p };
    moveCarry(p);
  }
  function startCarryNew(G, id, p) {
    const S = G.slots.find(x => !x.part && !x.busy);
    if (!S || carry) return false;
    const node = makePart(S.type, false, layer.fx);
    node.style.opacity = 0;
    carry = { id, node, kind: 'new', type: S.type, by: 'box', p, hidden: true };
    return true;
  }
  function moveCarry(p) {
    const c = carry;
    c.p = p;
    if (c.hidden) { c.hidden = false; c.node.style.opacity = 1; Sound.play('pop'); }
    const dy = c.by === 'pliers' ? 46 : -20, w = Math.sin(performance.now() / 90) * 8;
    c.node.setAttribute('transform', `translate(${p.x.toFixed(0)},${(p.y + dy).toFixed(0)}) rotate(${w.toFixed(0)}) scale(1.25)`);
  }
  const nearBin = p => p && Math.abs(p.x - BIN.x) < 120 && p.y > BIN.y - 160 && p.y < 760;
  async function dropCarry() {
    const c = carry;
    carry = null;
    if (!c) return;
    const from = ghostPos(c.node), G = V;
    if (c.kind === 'old') {
      if (nearBin(c.p)) {
        // into the junk bin it goes
        await arc(c.node, from, BIN, 300, 60, 1.25, 0.7, 300);
        Sound.play('clank'); wobbleBin();
        sparkles(BIN.x, BIN.y, { n: 6, colors: ['#ffe14d', '#fff'], spread: 70 });
        c.node.remove();
        if (Math.random() < 0.5) botSay(pick(['Into the bin! Clang!', 'Bye bye, old part!']));
        return;
      }
      // dropped somewhere else: it lands on the bench and waits there
      const x = K.clamp(from.x, 470, 1420);
      Sound.play('swish');
      await arc(c.node, from, { x, y: 700 }, 380, 40, 1.25, 0.8, 180);
      Sound.play('land');
      park.appendChild(c.node);
      c.node.dataset.act = 'junk';
      c.node.classList.add('tap');
      if (G && G.done.out) setTimeout(() => { if (V === G) gadSay(G, 'Put it in the bin!'); }, 300);
      return;
    }
    // a new part
    const S = G && stage === 'fix' && G.done.out && c.p && overGadget(G, c.p) ? G.slots.find(x => !x.part && !x.busy && x.type === c.type) : null;
    if (S) return placePart(G, S, c.node, from);
    // not on the gadget: it floats back into the box
    const b = toolBtn('box');
    Sound.play('poof');
    await arc(c.node, from, { x: +b.dataset.x, y: +b.dataset.y }, 350, 40, 1.25, 0.3);
    c.node.remove();
  }
  async function placePart(G, S, node, from) {
    S.busy = true;
    await arc(node, from, L2S(G, S.x, S.y), 220, 20, 1.25, G.s);
    if (G !== V) { node.remove(); return; }
    node.setAttribute('transform', '');
    S.holder.appendChild(node);
    S.part = { broken: false, node };
    S.ghost.style.display = 'none';
    S.busy = false;
    Sound.play('plop');
    hop(node.firstChild, 16);
    const p = L2S(G, S.x, S.y);
    sparkles(p.x, p.y, { n: 8, colors: [GOOD[S.type], '#fff'], spread: 80 });
    if (S.type === 'bulb') setTimeout(() => Sound.play('twinkle'), 150);
    else if (S.type === 'spring') setTimeout(() => Sound.play('boing'), 150);
    else if (S.type === 'gear') setTimeout(() => Sound.play('ratchet', 3), 150);
    else setTimeout(() => Sound.play('zap'), 150);
    if (G.slots.every(s => s.part && !s.part.broken)) stepDone(G, 'in');
  }

  /* ---------- the tool bar ---------- */
  const TOOLS = {
    driver: g => {
      el('rect', { x: -9, y: -40, width: 18, height: 34, rx: 4, fill: '#cfd6dc', stroke: '#6b7680', 'stroke-width': 3 }, g);
      el('path', { d: 'M-9 -40 L0 -50 L9 -40', fill: '#cfd6dc', stroke: '#6b7680', 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
      el('rect', { x: -15, y: -8, width: 30, height: 44, rx: 12, fill: '#ff5c6c', stroke: '#c23131', 'stroke-width': 4 }, g);
      el('path', { d: 'M-6 2 V26 M6 2 V26', stroke: '#c23131', 'stroke-width': 3 }, g);
    },
    vacuum: g => {
      el('path', { d: 'M18 -28 L-22 26', stroke: '#8a96a0', 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
      el('rect', { x: -40, y: 20, width: 36, height: 16, rx: 6, fill: '#5b6670' }, g);
      el('rect', { x: 2, y: -40, width: 38, height: 44, rx: 14, fill: '#5cc84a', stroke: '#3e9b32', 'stroke-width': 4 }, g);
      el('circle', { cx: 21, cy: -18, r: 8, fill: '#e9fbff' }, g);
    },
    pliers: g => {
      el('path', { d: 'M-4 -10 L-20 34 M4 -10 L20 34', stroke: '#5cb3ff', 'stroke-width': 13, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M-4 -10 L-12 -42 M4 -10 L12 -42', stroke: '#8a96a0', 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
      el('circle', { cy: -10, r: 7, fill: '#5b6670' }, g);
    },
    box: g => {
      el('rect', { x: -34, y: -12, width: 68, height: 46, rx: 8, fill: '#ffb347', stroke: '#d9822b', 'stroke-width': 4 }, g);
      partIcon('battery', el('g', { transform: 'translate(-14,-22) scale(.4)' }, g));
      const gp = el('g', { transform: 'translate(14,-24) scale(.4)' }, g); partIcon('gear', gp);
      el('rect', { x: -34, y: -12, width: 68, height: 20, rx: 6, fill: '#ffc46b', stroke: '#d9822b', 'stroke-width': 4 }, g);
    },
  };
  Object.keys(TOOLS).forEach((k, i) => {
    const x = 605 + i * 130, y = 94;
    const b = el('g', { class: 'tap', transform: `translate(${x},${y})` }, toolsG);
    b.dataset.act = 'tool'; b.dataset.tool = k; b.dataset.x = x; b.dataset.y = y;
    el('circle', { r: 50, class: 'glow' }, b);
    const a = el('g', { class: 'anim' }, b);
    el('circle', { r: 44, fill: '#fff', stroke: '#5ec8d8', 'stroke-width': 5 }, a);
    TOOLS[k](a);
    const ck = el('g', { class: 'check', transform: 'translate(32,-32)' }, b);
    el('circle', { r: 16, fill: '#5cdc4a', stroke: '#fff', 'stroke-width': 4 }, ck);
    el('path', { d: 'M-7 0 L-2 6 L8 -6', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ck);
  });
  function toolGhost(tool) {
    const b = toolBtn(tool);
    const g = el('g', { transform: `translate(${b.dataset.x},${b.dataset.y}) scale(1.4)` }, layer.fx);
    TOOLS[tool](el('g', {}, g));
    return g;
  }
  function ghostPos(g) { const m = g.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/); return { x: +m[1], y: +m[2] }; }
  function moveGhost(g, x, y, ms) {
    const a = ghostPos(g);
    return tween(ms, t => { const e = 1 - Math.pow(1 - t, 2); g.setAttribute('transform', `translate(${lerp(a.x, x, e).toFixed(0)},${lerp(a.y, y, e).toFixed(0)}) scale(1.4)`); });
  }
  function returnGhost(g, tool) {
    const a = ghostPos(g), b = toolBtn(tool);
    return tween(280, t => g.setAttribute('transform', `translate(${lerp(a.x, +b.dataset.x, t).toFixed(0)},${lerp(a.y, +b.dataset.y, t).toFixed(0)}) scale(${lerp(1.4, 1, t).toFixed(2)})`)).then(() => g.remove());
  }
  // tapping a tool never does the job: it does a silly little trick, and the robot shows you how to drag it
  const TOOL_FUN = {
    driver(a) { Sound.play('ratchet'); anim(a, [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], 450, { easing: 'ease-in-out' }); },
    vacuum(a) { Sound.play('suck'); anim(a, [{ transform: 'translate(0,0)' }, { transform: 'translate(-5px,2px)' }, { transform: 'translate(5px,-2px)' }, { transform: 'translate(0,0)' }], 110, { iterations: 4 }); },
    pliers(a) { Sound.play('pop'); setTimeout(() => Sound.play('pop'), 150); anim(a, [{ transform: 'scale(1)' }, { transform: 'scale(.75,1.15)' }, { transform: 'scale(1.1,.9)' }, { transform: 'scale(.8,1.1)' }, { transform: 'scale(1)' }], 380); },
    box(a, b) { Sound.play('plop'); hop(a, 24); sparkles(+b.dataset.x, +b.dataset.y - 30, { n: 6, colors: ['#ffb347', '#ffe14d', '#fff'], spread: 60 }); },
  };
  let lastTapHint = 0;
  function tapTool(tool, btn) {
    TOOL_FUN[tool](btn.querySelector('.anim'), btn);
    if (!V) { setTimeout(needGadget, 300); return; }
    if (busy) return;
    if (stage !== 'fix') {
      setTimeout(() => {
        if (stage === 'power') { botSay('Slide the switch!'); nudgeSwitch(); }
        else if (stage === 'play') botSay(pick(["It's all fixed! Add something silly!", 'Tap it to see it go!']));
      }, 400);
      return;
    }
    const G = V, st = nextStep(G);
    if (!st || G.finding) return;
    const now = performance.now();
    if (now - lastTapHint < 2500) return;
    lastTapHint = now;
    if (st.tool === tool && !(st.k === 'close' && G.lidOff)) {
      setTimeout(() => { if (V === G && nextStep(G) === st) { botSay(pick(['Drag it!', 'Hold it and drag it!', 'Drag it over here!'])); demo(tool); } }, 350);
      return;
    }
    // not this one yet: something silly, and then the robot shows what to do
    if (tool === 'vacuum' && !G.lidOff) { gadSay(G, 'Hee hee! That tickles!'); anim(G.a, [{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(0)' }], 300, { iterations: 2 }); }
    else if (tool === 'box') gadSay(G, pick(['Take out the old one first!', 'Not yet!']));
    else if (tool === 'pliers' && !G.done.open) gadSay(G, 'Open me up first!');
    setTimeout(() => { if (V === G && nextStep(G) === st && !G.finding) { botSay(sayOf(G, st)); demo(st.tool); } }, 1000);
  }
  /* A see-through tool slides from the tool bar to where it should go, and back. It only shows
   * the way: it never does the step for you. */
  let demoing = false;
  async function demo(tool) {
    const G = V;
    if (!G || stage !== 'fix' || demoing || G.finding) return;
    const st = nextStep(G);
    if (!st) return;
    if (st.k === 'close' && G.lidOff) return demoLid(G);
    if (tool !== st.tool) return;
    let path = [];
    if (st.k === 'open' || st.k === 'close') {
      const sc = G.screws.find(x => x.state === (st.k === 'open' ? 'in' : 'out'));
      if (sc) path = [L2S(G, sc.hx, sc.hy)];
    } else if (st.k === 'clean') {
      path = [...dustLeft(G)].slice(0, 3).map(h => L2S(G, h._x, h._y));
      if (!path.length) path = [L2S(G, 0, -140)];
    } else if (st.k === 'out') {
      const S = G.slots.find(x => x.part && x.part.broken);
      if (S) path = [L2S(G, S.x, S.y), { x: BIN.x, y: BIN.y - 40 }];
    } else if (st.k === 'in') {
      const S = G.slots.find(x => !x.part && !x.busy);
      if (S) path = [L2S(G, S.x, S.y)];
    }
    if (!path.length) return;
    demoing = true;
    const g = toolGhost(tool);
    g.style.opacity = 0.5;
    for (const q of path) { await moveGhost(g, q.x, q.y, 650); await wait(250); }
    await returnGhost(g, tool);
    demoing = false;
  }
  async function demoLid(G) {
    if (!G.lidOff || G.lidMoving || ldrag) return;
    demoing = true;
    const c = G.lid.cloneNode(true);
    delete c.dataset.act;
    c.classList.remove('rb-pulse', 'tap');
    c.style.opacity = 0.45;
    layer.fx.appendChild(c);
    await arc(c, ghostPos(G.lid), L2S(G, 0, -140), 900, 80, 0.55, G.s);
    await wait(300);
    const a = anim(c, [{ opacity: 0.45 }, { opacity: 0 }], 300, { fill: 'forwards' });
    await wait(320);
    c.remove();
    if (!a) c.remove();
    demoing = false;
  }

  /* ---------- power on ---------- */
  function bolt(x0, y0, x1, y1) {
    let d = `M${x0} ${y0}`;
    for (let i = 1; i < 8; i++) d += ` L${(lerp(x0, x1, i / 8) + rand(-30, 30)).toFixed(0)} ${lerp(y0, y1, i / 8).toFixed(0)}`;
    d += ` L${x1} ${y1}`;
    const p = el('path', { d, stroke: '#ffe14d', 'stroke-width': 10, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, layer.fx);
    const a = anim(p, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0 }], 360);
    if (a) a.onfinish = () => p.remove(); else setTimeout(() => p.remove(), 360);
  }
  async function powerOn() {
    if (!V || busy || stage !== 'power') {
      Sound.play('bonk');
      if (!V) needGadget();
      resetSwitch(true);
      return;
    }
    busy = true;
    powerBtn.classList.remove('rb-next');
    swOn = true;
    swTrack.setAttribute('fill', '#6fdc6a');
    const G = V;
    for (let k = 0; k < 3; k++) {
      Sound.play('zap');
      bolt(800, 150, G.x + rand(-60, 60), G.y + (G.T.top[1] + 40) * G.s);
      anim(G.a, [{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,-4px)' }, { transform: 'translate(6px,2px)' }, { transform: 'translate(0,0)' }], 120, { iterations: 3 });
      await wait(420);
    }
    if (G !== V) { busy = false; return; }
    Sound.play('powerup');
    G.fixed = true;
    G.g.classList.add('fixed');
    bounce(G, 40);
    sparkles(G.x, G.y - 260, { n: 18, colors: ['#ffe14d', '#fff', '#7ff3ff'], spread: 280 });
    rings(G.x, G.y - 260, ['#ffe14d', '#7ff3ff', '#fff'], { width: 8, scale: 8 });
    await wait(900);
    Sound.play('cheer');
    const box = K.visibleBox(40);
    for (let i = 0; i < 4; i++) setTimeout(() => sparkles(rand(box.x0, box.x1), rand(150, 450), { n: 14, colors: ['#ff5c6c', '#ffe14d', '#5cb3ff', '#6fdc6a', '#fff'], spread: 200 }), i * 250);
    setFace('happy', 2500); hop(botAnim, 40); waveArm(2);
    setStage('play');
    gadSay(G, pick(['I work again! Thank you!', 'Yay! I feel all better!']));
    await wait(600);
    busy = false;
    await trick(G);
    if (V === G) { botSay(pick(['Hooray! Now add something silly!', 'It works! Try a silly hat!'])); hopRow(); updateGuide(); }
  }

  /* ---------- the power switch: slide the red knob all the way across ---------- */
  const swKnob = powerBtn.querySelector('.rb-knob'), swTrack = powerBtn.querySelector('.rb-track');
  const SW0 = -74, SW1 = 74;
  let sw = null, swX = SW0, swOn = false, lastSwHint = 0;
  function setKnob(x) { swX = x; swKnob.setAttribute('transform', `translate(${x.toFixed(0)},0)`); }
  function resetSwitch(spring) {
    swOn = false;
    swTrack.setAttribute('fill', '#c9d3dc');
    if (!spring || swX <= SW0) { setKnob(SW0); return; }
    const x0 = swX;
    Sound.play('boing');
    tween(380, t => setKnob(lerp(x0, SW0, 1 - Math.pow(1 - t, 3)) + Math.sin(t * Math.PI * 3) * (1 - t) * 10));
  }
  function nudgeSwitch() {
    if (sw || swOn || swX > SW0 + 4) return;
    Sound.play('boing');
    tween(520, t => setKnob(SW0 + Math.sin(t * Math.PI) * 34));
  }
  function startSwitch(e, p) {
    if (sw || swOn) return;
    if (!V || busy || stage !== 'power') {
      Sound.play('bonk');
      anim(swKnob.querySelector('.anim'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], 200);
      if (!V) needGadget();
      return;
    }
    sw = { id: e.pointerId, x0: p.x, k0: swX, moved: false, cx: e.clientX };
    Sound.play('pop');
  }
  function moveSwitch(e, p) {
    if (!sw.moved && Math.abs(e.clientX - sw.cx) > 8) sw.moved = true;
    if (!sw.moved) return;
    const was = swX;
    setKnob(K.clamp(sw.k0 + p.x - sw.x0, SW0, SW1));
    if (Math.floor(was / 30) !== Math.floor(swX / 30)) Sound.play('ratchet', 1);
  }
  function endSwitch() {
    const d = sw; sw = null;
    if (!d.moved) {
      nudgeSwitch();
      const now = performance.now();
      if (now - lastSwHint > 2500) { lastSwHint = now; setTimeout(() => botSay(pick(['Slide the switch!', 'Push the red knob all the way over!'])), 300); }
      return;
    }
    if (swX > SW1 - 24) { setKnob(SW1); Sound.play('clank'); powerOn(); }
    else resetSwitch(true);
  }

  /* ---------- silly add-ons, once it works ---------- */
  const ADDONS = {
    propeller: {
      icon(g) {
        el('rect', { x: -4, y: -36, width: 8, height: 22, fill: '#5b6670' }, g);
        el('path', { d: 'M-34 6 A34 34 0 0 1 34 6 Z', fill: '#ff5c6c', stroke: '#c23131', 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
        el('path', { d: 'M-12 6 A34 34 0 0 1 0 -28 A34 34 0 0 1 12 6 Z', fill: '#ffd93b' }, g);
        const b = el('g', { transform: 'translate(0,-38)' }, g);
        const bi = el('g', { class: 'blades' }, b);
        el('ellipse', { cx: -24, rx: 24, ry: 7, fill: '#5cdc4a', stroke: '#3e9b32', 'stroke-width': 3 }, bi);
        el('ellipse', { cx: 24, rx: 24, ry: 7, fill: '#5cb3ff', stroke: '#2f7fbf', 'stroke-width': 3 }, bi);
        el('circle', { r: 6, fill: '#5b6670' }, b);
      },
      put(G, g) { const [x, y] = G.T.top; place2(g, x, y + 8, 1.5); this.icon(g.firstChild); },
    },
    rocket: {
      icon(g) {
        const fl = el('g', { class: 'flame' }, g);
        el('path', { d: 'M-14 30 Q0 80 14 30 Z', fill: '#ff9a2e' }, fl);
        el('path', { d: 'M-7 30 Q0 58 7 30 Z', fill: '#ffe14d' }, fl);
        el('path', { d: 'M-18 10 L-32 34 L-14 30 Z M18 10 L32 34 L14 30 Z', fill: '#ff5c6c', stroke: '#c23131', 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
        el('path', { d: 'M0 -44 Q22 -20 18 30 L-18 30 Q-22 -20 0 -44 Z', fill: '#e9eef2', stroke: '#8a96a0', 'stroke-width': 4 }, g);
        el('circle', { cy: -6, r: 9, fill: '#5cb3ff', stroke: '#8a96a0', 'stroke-width': 3 }, g);
      },
      put(G, g) { place2(g, -G.T.side - 30, -230, 1.8); G.back.appendChild(g); this.icon(g.firstChild); },
    },
    googly: {
      icon(g) { [-22, 22].forEach(x => { el('circle', { cx: x, r: 20, fill: '#fff', stroke: '#26323d', 'stroke-width': 4 }, g); const p = el('g', { transform: `translate(${x},0)` }, g); const pi = el('g', { class: 'pupil' }, p); el('circle', { r: 9, fill: '#26323d' }, pi); }); },
      put(G, g) {
        const f = G.T.face;
        place2(g, f.x, f.y, 1);
        [-45, 45].forEach(x => {
          el('circle', { cx: x * f.s, r: 30 * f.s, fill: '#fff', stroke: '#26323d', 'stroke-width': 5 }, g.firstChild);
          const p = el('g', { transform: `translate(${x * f.s},0) scale(${f.s})` }, g.firstChild);
          const pi = el('g', { class: 'pupil' }, p);
          el('circle', { r: 13, fill: '#26323d' }, pi); el('circle', { cx: -4, cy: -4, r: 4, fill: '#fff' }, pi);
        });
      },
    },
    mustache: {
      icon(g) { el('path', { d: 'M0 -4 C-14 -18 -36 -18 -46 -4 C-54 8 -66 6 -70 -4 C-66 18 -40 24 -24 12 C-14 6 -6 4 0 4 C6 4 14 6 24 12 C40 24 66 18 70 -4 C66 6 54 8 46 -4 C36 -18 14 -18 0 -4Z', fill: '#5a3a22', transform: 'scale(.6)' }, g); },
      put(G, g) { const f = G.T.face; place2(g, f.x, f.y + 32 * f.s, f.s * 1.6); this.icon(g.firstChild); },
    },
    arms: {
      icon(g) {
        el('path', { d: 'M20 30 Q-10 20 -14 -14', stroke: '#8a96a0', 'stroke-width': 12, fill: 'none', 'stroke-linecap': 'round' }, g);
        el('circle', { cx: -14, cy: -24, r: 17, fill: '#fff', stroke: '#26323d', 'stroke-width': 4 }, g);
        el('path', { d: 'M-24 -36 V-46 M-14 -40 V-50 M-4 -36 V-46', stroke: '#26323d', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
      },
      put(G, g) {
        [-1, 1].forEach(sx => {
          const a = el('g', { transform: `translate(${sx * G.T.side},-170) scale(${-sx * 2.2},2.2)` }, g.firstChild);
          const ai = el('g', { class: 'arm' }, a);
          el('path', { d: 'M0 0 Q-34 -6 -40 -46', stroke: '#8a96a0', 'stroke-width': 10, fill: 'none', 'stroke-linecap': 'round' }, ai);
          el('circle', { cx: -40, cy: -56, r: 14, fill: '#fff', stroke: '#26323d', 'stroke-width': 3 }, ai);
        });
        g.setAttribute('transform', '');
      },
    },
    lights: {
      icon(g) {
        el('path', { d: 'M-50 -10 Q-25 14 0 -10 Q25 14 50 -10', stroke: '#26323d', 'stroke-width': 4, fill: 'none' }, g);
        [['#ff5c6c', -38, 2], ['#ffe14d', -12, 2], ['#5cdc4a', 12, 2], ['#5cb3ff', 38, 2]].forEach(([c, x, y], i) => {
          el('circle', { cx: x, cy: y + 10, r: 11, fill: c, stroke: '#26323d', 'stroke-width': 3, class: 'rb-blink', style: `animation-delay:${-i * 0.18}s` }, g);
        });
      },
      put(G, g) { place2(g, 0, G.T.edge - 6, 2.1); this.icon(g.firstChild); },
    },
  };
  function place2(g, x, y, s) { g.setAttribute('transform', `translate(${x},${y}) scale(${s})`); }
  const ADD_LINES = {
    propeller: 'A propeller hat!', rocket: 'A rocket! Zoom!', googly: 'Googly eyes! I can see!',
    mustache: 'Ooh, a fancy mustache!', arms: 'Arms! I can wave!', lights: 'Party lights!',
  };
  Object.keys(ADDONS).forEach((k, i) => {
    const x = 555 + i * 98, y = 94;
    const b = el('g', { class: 'tap', transform: `translate(${x},${y})` }, addsG);
    b.dataset.act = 'add'; b.dataset.add = k; b.dataset.x = x; b.dataset.y = y;
    const a = el('g', { class: 'anim' }, b);
    el('circle', { r: 42, fill: '#fff', stroke: '#b98bff', 'stroke-width': 5 }, a);
    ADDONS[k].icon(el('g', { transform: 'scale(.85)' }, a));
  });
  function hopRow() { addsG.querySelectorAll('[data-act=add] .anim').forEach((a, i) => hop(a, 16, i * 90)); }
  function addOn(G, k) {
    if (!G || G !== V || stage !== 'play') return;
    if (G.adds[k]) return removeAdd(G, k);
    const g = el('g', {}, G.addG);
    el('g', {}, g);
    ADDONS[k].put(G, g);
    G.adds[k] = g;
    g.classList.add('rb-add'); g.dataset.add = k;
    anim(g.firstChild, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(.85)', opacity: 1 }, { transform: 'scale(1)' }], 320);
    Sound.play('plop');
    if (!G.decorated) { G.decorated = true; updateGuide(); }
    if (k === 'googly') setTimeout(() => Sound.play('boing'), 150);
    if (k === 'lights') setTimeout(() => Sound.play('twinkle'), 150);
    setTimeout(() => gadSay(G, ADD_LINES[k], k === 'mustache' ? { pitch: 0.7, rate: 0.9 } : null), 250);
  }
  // every add-on has its own little show, on the shelf or stuck on the gadget
  const ADD_FUN = {
    propeller(a) { Sound.play('propeller'); const b = a.querySelector('.blades'); if (b) anim(b, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1)' }, { transform: 'scaleX(1)' }], 160, { iterations: 6, easing: 'linear' }); hop(a, 10); },
    rocket(a) { Sound.play('rocket'); anim(a, [{ transform: 'translate(0,0)' }, { transform: 'translate(-4px,-6px)' }, { transform: 'translate(4px,-10px)' }, { transform: 'translate(0,0)' }], 120, { iterations: 5 }); },
    googly(a) { Sound.play('boing'); a.querySelectorAll('.pupil').forEach(p => anim(p, [{ transform: 'translate(0,0)' }, { transform: 'translate(8px,0)' }, { transform: 'translate(0,8px)' }, { transform: 'translate(-8px,0)' }, { transform: 'translate(0,0)' }], 600)); },
    mustache(a) { Sound.play('squeak', 1); anim(a, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }], 500); },
    arms(a) {
      Sound.play('whirr');
      const arms = a.querySelectorAll('.arm');
      (arms.length ? [...arms] : [a]).forEach(n => anim(n, [{ transform: 'rotate(0)' }, { transform: 'rotate(-25deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(0)' }], 420, { iterations: 2 }));
    },
    lights(a) { Sound.play('twinkle'); a.querySelectorAll('.rb-blink').forEach((c, i) => anim(c, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], 300, { iterations: 2, delay: i * 70 })); hop(a, 8); },
  };
  let lastAddHint = 0;
  function tapAddBtn(btn) {
    const k = btn.dataset.add;
    ADD_FUN[k](btn.querySelector('.anim'));
    if (!V || stage !== 'play') return;
    const now = performance.now();
    if (now - lastAddHint < 3000) return;
    lastAddHint = now;
    setTimeout(() => { if (V && stage === 'play') botSay(pick(['Drag it onto it!', 'Hold it and drag it on!'])); }, 400);
  }
  // pull a stuck-on add-on off with your finger; let go on the gadget to stick it back
  function peelAdd(G, k, id, p) {
    const g = G.adds[k];
    if (!g) return null;
    delete G.adds[k];
    g.remove();
    Sound.play('pop');
    const btn = addsG.querySelector(`[data-add=${k}]`);
    const ghost = el('g', { transform: `translate(${p.x.toFixed(0)},${p.y.toFixed(0)}) scale(1.5)` }, layer.fx);
    ADDONS[k].icon(el('g', {}, ghost));
    return { id, btn, ghost, add: k, moved: true, peeled: true, p, cx: 0, cy: 0 };
  }
  function removeAdd(G, k) {
    const g = G.adds[k];
    delete G.adds[k];
    Sound.play('poof');
    const a = anim(g, [{ opacity: 1 }, { opacity: 0 }], 250, { fill: 'forwards' });
    setTimeout(() => g.remove(), 260);
    if (!a) g.remove();
  }

  /* ---------- tap a fixed gadget: its own trick, plus everything you stuck on it ---------- */
  async function trick(G) {
    if (busy || G !== V || !G.fixed) return;
    busy = true;
    const has = k => !!G.adds[k];
    const job = G.T.job(G);
    if (has('lights')) {
      Sound.play('party');
      for (let i = 0; i < 5; i++) setTimeout(() => rings(G.x, G.y - 220, [pick(['#ff5c6c', '#ffe14d', '#5cdc4a', '#5cb3ff', '#b98bff'])], { width: 10, scale: 10 }), i * 220);
    }
    if (has('googly')) {
      Sound.play('boing');
      G.adds.googly.querySelectorAll('.pupil').forEach(p => anim(p, [{ transform: 'translate(0,0)' }, { transform: 'translate(10px,0)' }, { transform: 'translate(0,10px)' }, { transform: 'translate(-10px,0)' }, { transform: 'translate(0,0)' }], 500, { iterations: 2 }));
    }
    if (has('arms')) G.adds.arms.querySelectorAll('.arm').forEach(a => anim(a, [{ transform: 'rotate(0)' }, { transform: 'rotate(-30deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(0)' }], 450, { iterations: 3 }));
    if (has('mustache')) setTimeout(() => gadSay(G, pick(['Hello there!', 'Oh la la!', 'How fancy!']), { pitch: 0.7, rate: 0.9 }), 500);
    else if (!has('lights')) setTimeout(() => { if (V === G) gadSay(G, pick(G.T.happy)); }, 300);
    await job;
    if (has('propeller') && G === V) await fly(G);
    if (has('rocket') && G === V) await zoom(G);
    busy = false;
    updateGuide();
  }
  async function fly(G) {
    const blades = G.adds.propeller.querySelector('.blades');
    const sp = anim(blades, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1)' }, { transform: 'scaleX(1)' }], 160, { iterations: Infinity, easing: 'linear' });
    Sound.play('propeller');
    await tween(600, t => place(G, SPOT.x, SPOT.y - 180 * Math.sin(t * Math.PI / 2), 1));
    await tween(700, t => place(G, SPOT.x + Math.sin(t * Math.PI * 2) * 90, SPOT.y - 180, 1));
    Sound.play('whirr');
    await tween(600, t => place(G, SPOT.x, SPOT.y - 180 * (1 - t * t), 1));
    if (sp) sp.cancel();
    Sound.play('land'); bounce(G, 10);
  }
  async function zoom(G) {
    G.g.classList.add('zoom');
    Sound.play('rocket');
    let last = 0;
    await tween(1600, t => {
      const a = t * Math.PI * 2;
      place(G, SPOT.x + Math.sin(a) * 320, SPOT.y - (1 - Math.cos(a)) * 140, 1);
      const now = performance.now();
      if (now - last > 70) { last = now; sparkles(G.x - (G.T.side + 30), G.y - 180, { n: 2, colors: ['#ff9a2e', '#ffe14d', '#fff'], size: 12, spread: 40 }); }
    });
    place(G, SPOT.x, SPOT.y, 1);
    G.g.classList.remove('zoom');
    Sound.play('land'); bounce(G, 12);
  }

  /* ---------- send it home, bring new broken ones ---------- */
  async function sendOff() {
    anim(PANELS.next.querySelector('.anim'), [{ transform: 'scale(1)' }, { transform: 'scale(.85)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], 350);
    if (leaving) return;
    if (!V) {
      if (busy || !choices.length) return;
      // three different broken things, please
      busy = true;
      const old = choices; choices = [];
      Sound.play('whirr');
      await Promise.all(old.map(O => { const x0 = O.x; return tween(700, t => place(O, x0 + t * t * 1100, SPOT.y, 0.32)).then(() => O.g.remove()); }));
      busy = false;
      return spawnChooser();
    }
    leaving = true;
    for (let i = 0; i < 25 && busy; i++) await wait(100);
    cancelInput();
    busy = true;
    const G = V;
    V = null;
    if (!G) { busy = false; leaving = false; return; }
    // whatever is lying on the bench goes too
    [...park.children].forEach(n => { const a = anim(n, [{ opacity: 1 }, { opacity: 0 }], 300, { fill: 'forwards' }); setTimeout(() => n.remove(), 320); if (!a) n.remove(); });
    gadSay(G, G.fixed ? pick(['Thank you! Bye bye!', 'Bye bye, robot!', 'See you later!']) : 'Bye bye!');
    botSay(pick(['Bye bye!', 'Beep boop! Bye!']), 'happy'); waveArm(2);
    await wait(700);
    if (G.fixed && G.adds.propeller) {
      const blades = G.adds.propeller.querySelector('.blades');
      anim(blades, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1)' }, { transform: 'scaleX(1)' }], 160, { iterations: 12 });
      Sound.play('propeller');
      await tween(1200, t => place(G, SPOT.x + t * 300, SPOT.y - t * t * 1100, 1));
    } else if (G.fixed && G.adds.rocket) {
      G.g.classList.add('zoom'); Sound.play('rocket');
      await tween(900, t => place(G, SPOT.x + t * t * 1200, SPOT.y - t * 200, 1));
    } else {
      Sound.play('whirr');
      await tween(1000, t => place(G, SPOT.x + t * t * 1100, SPOT.y, 1));
    }
    G.g.remove();
    busy = false; leaving = false;
    spawnChooser();
  }

  /* ---------- other things to tap ---------- */
  function needGadget() {
    if (busy) return;
    botSay('Pick a broken one first!');
    choices.forEach((G, i) => hop(G.a, 24, i * 120));
  }
  const binOld = $('#rb-bin-old');
  function wobbleBin() { anim(svg.querySelector('[data-act=bin] .anim'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], 400); }
  function tapBin() {
    Sound.play('clank'); wobbleBin();
    // old parts jump out and fall back in
    shuffle(Object.keys(PARTS)).slice(0, 3).forEach((t, i) => {
      const n = makePart(t, true, layer.fx);
      const x = BIN.x + (i - 1) * 40;
      const a = anim(n, [0, 0.5, 1].map(f => ({ transform: `translate(${(x + (i - 1) * 40 * f).toFixed(0)}px,${(BIN.y + 40 - Math.sin(Math.PI * f) * 170).toFixed(0)}px) rotate(${(f * 300 * (i - 1)).toFixed(0)}deg) scale(.6)` })), 700, { delay: i * 90, fill: 'backwards', easing: 'ease-in-out' });
      if (a) a.onfinish = () => { n.remove(); if (i === 2) Sound.play('clank'); }; else n.remove();
    });
    if (Math.random() < 0.5) setTimeout(() => botSay(pick(['Clang clang!', 'Old junk! Hee hee!'])), 300);
  }
  function tapPeg(hit) {
    const t = hit.dataset.tool, a = hit.querySelector('.anim');
    anim(a, [{ transform: 'rotate(0)' }, { transform: 'rotate(22deg)' }, { transform: 'rotate(-16deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], 900);
    if (t === 'wrench') Sound.play('clank');
    else if (t === 'hammer') { Sound.play('bonk'); setTimeout(() => Sound.play('bonk'), 250); }
    else { for (let i = 0; i < 4; i++) setTimeout(() => Sound.play('scrub'), i * 120); }
  }
  function tapLamp(hit) {
    svg.classList.toggle('dark');
    const dark = svg.classList.contains('dark');
    Sound.play(dark ? 'night' : 'day');
    anim(hit.querySelector('.anim'), [{ transform: 'rotate(0)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(0)' }], 1200);
    setTimeout(() => botSay(dark ? pick(['Lights off! My eyes glow!', 'Ooh, spooky!']) : 'Lights on!'), 300);
  }
  function tapOil(hit) {
    anim(hit.querySelector('.anim'), [{ transform: 'rotate(0)' }, { transform: 'rotate(18deg)' }, { transform: 'rotate(18deg)' }, { transform: 'rotate(0)' }], 800);
    Sound.play('squeak', 2);
    const G = V, tx = G ? G.x - 120 : 640, ty = G ? G.y - 200 : 712;
    for (let i = 0; i < 6; i++) setTimeout(() => {
      const g = el('g', { transform: 'translate(594,604)' }, layer.fx);
      const d = el('path', { d: shapes.drop(10), fill: '#3a4048' }, g);
      const a = anim(d, [{ transform: 'translate(0,0)' }, { transform: `translate(${(tx - 594 + rand(-30, 30)).toFixed(0)}px,${(ty - 604 + rand(-30, 30)).toFixed(0)}px)` }], 420, { easing: 'ease-in' });
      if (a) a.onfinish = () => g.remove(); else g.remove();
    }, 150 + i * 60);
    setTimeout(() => {
      if (!G || G !== V || busy) return;
      anim(G.a, [{ transform: 'rotate(0)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' }], 300, { iterations: 2 });
      gadSay(G, G.fixed ? pick(['Ahh! So smooth!', 'Squeaky clean!']) : pick(['Ahh! Much better!', 'Glug glug! Thank you!']));
    }, 700);
  }
  const shiver = n => anim(n, [{ transform: 'translate(0,0)' }, { transform: 'translate(-4px,0) rotate(-6deg)' }, { transform: 'translate(4px,0) rotate(6deg)' }, { transform: 'translate(0,0)' }], 110, { iterations: 3 });
  const spin = (n, ms = 420) => anim(n, [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], ms, { easing: 'ease-in-out' });
  let lastGadHint = 0;
  // after a tap, the robot says what to do (not too often) and shows it with a see-through tool
  function hintSoon(G) {
    const now = performance.now();
    if (now - lastGadHint < 4000) return;
    lastGadHint = now;
    const st = nextStep(G);
    if (!st) return;
    setTimeout(() => { if (V === G && stage === 'fix' && nextStep(G) === st && !G.finding) { botSay(sayOf(G, st)); demo(st.tool); } }, 800);
  }
  function tapGadget(G, target) {
    if (G !== V || busy) return;
    if (stage === 'play') {
      const ad = target.closest('.rb-add');
      if (ad && G.adds[ad.dataset.add] === ad) { ADD_FUN[ad.dataset.add](ad.firstChild); bounce(G, 8); return; }
      return trick(G);
    }
    if (stage === 'power') { gadSay(G, 'Slide the switch!'); nudgeSwitch(); return; }
    const scEl = target.closest('[data-screw]');
    if (scEl) { spin(scEl.firstChild); Sound.play('chime', Math.floor(rand(0, 6))); hintSoon(G); return; }
    if (G.lidOff) {
      const dust = target.closest('.rb-dust');
      if (dust && !dust.classList.contains('gone')) { hop(dust.firstChild, 16); Sound.play('squeak', Math.floor(rand(0, 4))); hintSoon(G); return; }
      const slEl = target.closest('[data-slot]');
      if (slEl) {
        const S = G.slots[+slEl.dataset.slot];
        if (S.part && S.part.broken) { shiver(S.part.node.firstChild); Sound.play('grunt'); hintSoon(G); return; }
        if (S.part) {
          hop(S.part.node.firstChild, 16); Sound.play('squeak', 1);
          const q = L2S(G, S.x, S.y);
          sparkles(q.x, q.y, { n: 5, colors: [GOOD[S.type], '#fff'], spread: 50 });
          return;
        }
        Sound.play('boing'); hintSoon(G); return;
      }
      if (dustLeft(G).length) {
        // tickling a dusty gadget makes it sneeze
        Sound.play('sneeze');
        setTimeout(() => { if (V === G) gadSay(G, 'Ah... choo!'); }, 380);
        hintSoon(G);
        return;
      }
    } else if (target.closest('.rb-lid')) {
      Sound.play('clank');
      anim(G.lid.firstChild, [{ opacity: 1 }, { opacity: 0.7 }, { opacity: 1 }], 200);
      anim(G.a, [{ transform: 'rotate(0)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' }], 260);
      hintSoon(G);
      return;
    }
    Sound.play('zap');
    sparkles(G.x + rand(-100, 100), G.y - 300, { n: 5, colors: ['#ffe14d', '#fff'], spread: 70 });
    gadSay(G, pick(G.T.sad.concat(['Bzzt! Hee hee!', 'Ouch! Fix me!'])));
    hintSoon(G);
  }
  function tapParked(n) {
    const G = V;
    if (!G) return;
    if (n === G.lid) {
      Sound.play('clank');
      anim(n.firstChild, [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], 300);
      if (G.done.in && !G.done.close) {
        const now = performance.now();
        if (now - lastGadHint > 3000) { lastGadHint = now; setTimeout(() => { botSay('Drag the cover back on!'); demoLid(G); }, 400); }
      }
      return;
    }
    spin(n.firstChild);
    Sound.play('chime', Math.floor(rand(0, 6)));
  }
  // drag the cover: on the gadget once the new parts are in, otherwise back to the bench
  let ldrag = null;
  function moveLid(p) {
    ldrag.p = p;
    V.lid.setAttribute('transform', `translate(${p.x.toFixed(0)},${p.y.toFixed(0)}) scale(.8)`);
  }
  async function endLid() {
    const d = ldrag; ldrag = null;
    const G = V;
    if (!G || !G.lidOff) return;
    if (!d.moved) return tapParked(G.lid);
    if (stage === 'fix' && G.done.in && !G.done.close && overGadget(G, d.p)) return lidOn(G);
    Sound.play('swish');
    if (stage === 'fix' && !G.done.in) setTimeout(() => { if (V === G) gadSay(G, pick(['Not yet!', 'Fix my insides first!'])); }, 200);
    await arc(G.lid, ghostPos(G.lid), LID_PARK, 380, 60, 0.8, 0.55, -14);
    Sound.play('clank');
  }

  // broken gadgets puff a little smoke and spark now and then
  setInterval(() => {
    if (App.current !== 'robot') return;
    const list = choices.concat(V && !V.fixed ? [V] : []);
    list.forEach(G => {
      if (Math.random() < 0.45) return;
      const top = L2S(G, G.T.top[0] + rand(-60, 60), G.T.top[1] + 30);
      if (Math.random() < 0.6) {
        const g = el('g', { transform: `translate(${top.x.toFixed(0)},${top.y.toFixed(0)})` }, layer.fx);
        const c = el('circle', { r: 16 * Math.max(0.5, G.s), fill: '#b5bcc4', opacity: 0.7 }, g);
        const a = anim(c, [{ transform: 'translate(0,0) scale(.5)', opacity: 0.7 }, { transform: `translate(${rand(-20, 20).toFixed(0)}px,-90px) scale(1.6)`, opacity: 0 }], 1400);
        if (a) a.onfinish = () => g.remove(); else g.remove();
      } else {
        sparkles(top.x, top.y + 40 * G.s, { n: 3, colors: ['#ffe14d', '#fff'], size: 9 * Math.max(0.6, G.s), spread: 40 * Math.max(0.5, G.s) });
      }
    });
  }, 1600);
  // the robot blinks
  setInterval(() => {
    if (App.current !== 'robot') return;
    bot.querySelectorAll('.bf-normal .rb-eye').forEach(e => anim(e, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], 220));
  }, 3800);

  /* ---------- input ---------- */
  let rub = null, tdrag = null, adrag = null, lastInput = performance.now(), hints = 0, lastVac = 0;
  const dragging = () => !!(rub || tdrag || adrag || carry || ldrag || sw);
  // stop whatever a finger was doing (leaving the game, or sending the gadget home)
  function cancelInput() {
    rub = null;
    if (tdrag) { tdrag.ghost.remove(); tdrag = null; }
    if (adrag) { adrag.ghost.remove(); adrag = null; }
    if (carry) { carry.node.remove(); carry = null; }
    if (ldrag) { ldrag = null; if (V && V.lidOff && !V.lidMoving) V.lid.setAttribute('transform', `translate(${LID_PARK.x},${LID_PARK.y}) rotate(-14) scale(.55)`); }
    if (sw) { sw = null; if (!swOn) resetSwitch(); }
  }
  const capture = e => { e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch (err) {} };
  svg.addEventListener('pointerdown', e => {
    lastInput = performance.now(); hints = 0;
    // a new finger (not a second one) clears anything a lost finger left hanging
    if (e.isPrimary && dragging()) {
      const stale = [rub, tdrag, adrag, carry, ldrag, sw].some(d => d && d.id !== e.pointerId);
      if (stale) cancelInput();
    }
    const hit = e.target.closest('[data-act]');
    if (!hit) return;
    const act = hit.dataset.act, p = toSvg(e.clientX, e.clientY);
    if (act === 'gad') {
      if (hit._G !== V || rub || carry) return;
      capture(e);
      rub = { id: e.pointerId, cx: e.clientX, cy: e.clientY, moved: false, target: e.target, p };
      return;
    }
    if (act === 'tool' || act === 'add') {
      if (tdrag || adrag || carry) return;
      capture(e);
      const ghost = el('g', { transform: `translate(${p.x},${p.y})` }, layer.fx);
      const gi = el('g', {}, ghost);
      if (act === 'tool') TOOLS[hit.dataset.tool](gi); else ADDONS[hit.dataset.add].icon(gi);
      ghost.style.opacity = 0;
      const d = { id: e.pointerId, btn: hit, ghost, cx: e.clientX, cy: e.clientY, moved: false };
      if (act === 'tool') {
        d.tool = hit.dataset.tool; tdrag = d;
        // new parts come straight out of the box
        if (d.tool === 'box' && V && !busy && stage === 'fix' && V.done.out && !V.done.in && startCarryNew(V, e.pointerId, p)) d.hideGhost = true;
      } else { d.add = hit.dataset.add; adrag = d; }
      return;
    }
    if (act === 'junk') {
      if (carry) return;
      capture(e);
      startCarryJunk(hit, e.pointerId, p);
      return;
    }
    if (act === 'parked' && V && hit === V.lid) {
      if (ldrag || V.lidArc || V.lidMoving) return;
      capture(e);
      ldrag = { id: e.pointerId, cx: e.clientX, cy: e.clientY, moved: false, p };
      return;
    }
    if (act === 'power') { capture(e); startSwitch(e, p); return; }
    if (act === 'pick') pickGadget(+hit.dataset.i);
    else if (act === 'parked') tapParked(hit);
    else if (act === 'next') sendOff();
    else if (act === 'bot') tapBot();
    else if (act === 'peg') tapPeg(hit);
    else if (act === 'lamp') tapLamp(hit);
    else if (act === 'bin') tapBin();
    else if (act === 'oil') tapOil(hit);
  });
  svg.addEventListener('pointermove', e => {
    const p = toSvg(e.clientX, e.clientY);
    if (sw && e.pointerId === sw.id) { lastInput = performance.now(); moveSwitch(e, p); return; }
    if (ldrag && e.pointerId === ldrag.id) {
      lastInput = performance.now();
      if (!ldrag.moved && Math.hypot(e.clientX - ldrag.cx, e.clientY - ldrag.cy) > 10) { ldrag.moved = true; Sound.play('pop'); V.lid.classList.remove('rb-pulse'); }
      if (ldrag.moved && V && V.lidOff && !V.lidMoving) moveLid(p);
      return;
    }
    const d = tdrag || adrag;
    if (d && e.pointerId === d.id) {
      lastInput = performance.now();
      if (!d.moved && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 10) { d.moved = true; if (!d.hideGhost) Sound.play('pop'); }
      if (!d.moved) return;
      d.p = p;
      d.ghost.style.opacity = d.hideGhost ? 0 : 1;
      d.ghost.setAttribute('transform', `translate(${p.x.toFixed(0)},${p.y.toFixed(0)}) scale(1.5)`);
      if (tdrag) dragTool(tdrag, p);
      if (carry && carry.id === d.id) moveCarry(p);
      return;
    }
    if (carry && e.pointerId === carry.id) { lastInput = performance.now(); moveCarry(p); return; }
    if (!rub || e.pointerId !== rub.id) return;
    lastInput = performance.now();
    if (!rub.moved && Math.hypot(e.clientX - rub.cx, e.clientY - rub.cy) > 10) rub.moved = true;
    if (!rub.moved) return;
    const G = V;
    if (!G || busy) return;
    // in the play stage, a stuck-on add-on can be pulled back off
    if (stage === 'play') {
      const ad = rub.target.closest('.rb-add');
      if (ad && G.adds[ad.dataset.add] === ad) { const pd = peelAdd(G, ad.dataset.add, rub.id, p); rub = null; if (pd) adrag = pd; }
      return;
    }
    if (stage !== 'fix' || !G.lidOff) return;
    // rub the dust away with a finger
    if (!G.done.clean) { dustNear(G, S2L(G, p), 45).forEach(h => wipe(G, h)); return; }
    // grab a broken part with a finger and carry it off
    if (!G.done.out && !carry) {
      const slEl = rub.target.closest('[data-slot]');
      const S = slEl ? G.slots[+slEl.dataset.slot] : null;
      if (S && startCarryOld(G, S, rub.id, 'finger')) { rub = null; moveCarry(p); }
    }
  });
  // dragging a tool over the gadget does that tool's job right where you point
  function dragTool(d, p) {
    const G = V;
    if (!G || busy || stage !== 'fix') return;
    const l = S2L(G, p), now = performance.now();
    if (d.tool === 'driver') {
      if (!G.done.open) G.screws.forEach(sc => { if (sc.state === 'in' && Math.hypot(sc.hx - l.x, sc.hy - l.y) < 60) unscrew(G, sc.i); });
      else if (G.done.in && !G.done.close && !G.lidOff && !G.lidMoving) G.screws.forEach(sc => { if (sc.state === 'out' && Math.hypot(sc.hx - l.x, sc.hy - l.y) < 60) screwIn(G, sc.i); });
    } else if (d.tool === 'vacuum') {
      if (now - lastVac > 1000 && overGadget(G, p)) { lastVac = now; Sound.play('vacuum'); }
      if (G.lidOff && !G.done.clean) dustNear(G, l, 75).forEach(h => suck(G, h, p));
    } else if (d.tool === 'pliers') {
      // the grabber pinches a broken part, and then it comes along with you
      if (G.lidOff && G.done.clean && !G.done.out && !carry) {
        const S = G.slots.find(x => x.part && x.part.broken && (Math.hypot(x.x - l.x, x.y - (l.y + 46 / G.s)) < 75 || Math.hypot(x.x - l.x, x.y - l.y) < 50));
        if (S) startCarryOld(G, S, d.id, 'pliers');
      }
    }
  }
  function endDrag(d) {
    if (d.btn) hop(d.btn.querySelector('.anim'), 10);
    const mine = carry && carry.id === d.id;
    if (!d.moved) {
      d.ghost.remove();
      if (mine) { carry.node.remove(); carry = null; }
      if (d.tool) tapTool(d.tool, d.btn);
      else tapAddBtn(d.btn);
      return;
    }
    if (mine) dropCarry();
    if (d.add && V && stage === 'play' && d.p && overGadget(V, d.p)) {
      d.ghost.remove();
      if (V.adds[d.add]) { Sound.play('boing'); bounce(V, 12); } else addOn(V, d.add);
      return;
    }
    if (d.peeled) Sound.play('poof');
    if (d.hideGhost) { d.ghost.remove(); return; }
    // it floats back to its spot on the board
    const a = ghostPos(d.ghost), x1 = +d.btn.dataset.x, y1 = +d.btn.dataset.y;
    tween(300, t => d.ghost.setAttribute('transform', `translate(${lerp(a.x, x1, t).toFixed(0)},${lerp(a.y, y1, t).toFixed(0)}) scale(${lerp(1.5, 1, t).toFixed(2)})`)).then(() => d.ghost.remove());
  }
  function endInput(e) {
    if (sw && e.pointerId === sw.id) return endSwitch();
    if (ldrag && e.pointerId === ldrag.id) return endLid();
    if (tdrag && e.pointerId === tdrag.id) { const d = tdrag; tdrag = null; endDrag(d); return; }
    if (adrag && e.pointerId === adrag.id) { const d = adrag; adrag = null; endDrag(d); return; }
    if (carry && e.pointerId === carry.id) { dropCarry(); rub = null; return; }
    if (rub && e.pointerId === rub.id) {
      const r = rub; rub = null;
      if (!r.moved && V) tapGadget(V, r.target);
    }
  }
  svg.addEventListener('pointerup', endInput);
  svg.addEventListener('pointercancel', endInput);

  /* ---------- gentle hints when nobody is tapping ---------- */
  setInterval(() => {
    if (App.current !== 'robot' || busy || dragging() || performance.now() - lastInput < 7000 || hints >= 3) return;
    lastInput = performance.now(); hints++;
    if (!V) { botSay('Pick a broken one!'); choices.forEach((G, i) => hop(G.a, 24, i * 120)); return; }
    if (stage === 'fix') { const st = nextStep(V); if (st && !V.finding) { botSay(sayOf(V, st)); demo(st.tool); } return; }
    if (stage === 'power') { botSay('Slide the red switch!'); nudgeSwitch(); return; }
    if (!V.decorated) { botSay('Drag something silly onto it!'); hopRow(); }
    else if (hints === 3) { botSay('Send it home and fix another one!'); hop(PANELS.next.querySelector('.anim'), 20); }
    else { botSay('Tap it to see it go!'); bounce(V, 20); }
  }, 1000);
  // safety net: nothing in this game takes 9 seconds, so a longer "busy" means something went wrong
  let busyAt = 0;
  setInterval(() => {
    if (!busy || leaving) { busyAt = 0; return; }
    if (!busyAt) busyAt = performance.now();
    else if (performance.now() - busyAt > 9000) { busy = false; busyAt = 0; if (V) { place(V, SPOT.x, SPOT.y, 1); V.g.classList.remove('zoom'); } updateGuide(); }
  }, 500);
  // if a step is taking a long time, the robot shows how again (it never does it for you)
  let stepKey = '', stepAt = 0;
  setInterval(() => {
    if (App.current !== 'robot' || stage !== 'fix' || !V || busy || dragging() || V.finding) { stepAt = performance.now(); return; }
    const st = nextStep(V), key = V.type + (st ? st.k : '') + (V.lidOff ? 1 : 0);
    if (key !== stepKey) { stepKey = key; stepAt = performance.now(); return; }
    if (st && performance.now() - stepAt > 20000) {
      stepAt = performance.now();
      botSay('Let me show you!', 'happy');
      waveArm(1);
      setTimeout(() => { if (V && stage === 'fix' && nextStep(V) === st) demo(st.tool); }, 900);
    }
  }, 1000);

  for (const k in PANELS) PANELS[k].style.display = 'none';
  spawnChooser();

  App.register({
    id: 'robot',
    screen: svg,
    enter() {
      lastInput = performance.now(); hints = 0;
      Sound.setMood('robot');
      setTimeout(updateGuide, 50);
      setTimeout(() => botSay(V ? 'Welcome back!' : "Beep boop! Let's fix something!"), 500);
    },
    leave() { cancelInput(); },
    clear() {
      if (busy) return;
      if (V) { V.g.remove(); V = null; }
      park.innerHTML = '';
      choices.forEach(G => G.g.remove()); choices = [];
      svg.classList.remove('dark');
      spawnChooser();
    },
  });

  window.__robot = { state, nextStep, pickGadget, tapTool: t => tapTool(t, toolBtn(t)), demo, powerOn, get carry() { return carry; }, addOn: k => addOn(V, k), trick: () => V && trick(V), sendOff, TYPES, dustLeft };
})();
