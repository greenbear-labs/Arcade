/* Froggy Farm: an original tap-and-drag farm toy for toddlers.
 * No text to read, no menus, no way to fail. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = s => document.querySelector(s);
  const svg = $('#scene');
  const layer = { fxBack: $('#fxBack'), stickers: $('#stickers'), fx: $('#fx'), bubbles: $('#bubbles') };
  const tongue = $('#tongue');
  const frog = $('#frog');
  const frogAnim = frog.querySelector('.frog-anim');
  const frogHead = frog.querySelector('.head');
  const belly = frog.querySelector('.belly');
  const bellyGlow = frog.querySelector('.belly-glow');
  const pupils = [...frog.querySelectorAll('.pupil')];
  const eyes = [...frog.querySelectorAll('.eye')];
  const FROG = { head: { x: 450, y: 535 }, mouth: { x: 450, y: 578 }, bubble: { x: 450, y: 330 } };
  const MAX_STICKERS = 12;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const { Voice } = App;

  /* ---------- small helpers ---------- */
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function anim(node, frames, dur, opts) {
    if (!node || !node.animate) return null;
    return node.animate(frames, Object.assign({ duration: dur, easing: 'ease-out' }, opts || {}));
  }
  function toSvg(cx, cy) {
    const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function toClient(x, y) {
    const p = svg.createSVGPoint(); p.x = x; p.y = y;
    return p.matrixTransform(svg.getScreenCTM());
  }
  function visibleBox(margin) {
    const a = toSvg(0, 0), b = toSvg(window.innerWidth, window.innerHeight);
    return { x0: Math.max(a.x, 0) + margin, y0: Math.max(a.y, 0) + margin, x1: Math.min(b.x, 1600) - margin, y1: Math.min(b.y, 900) - margin };
  }
  function centerOf(node) {
    const r = node.getBoundingClientRect();
    const c = toSvg(r.left + r.width / 2, r.top + r.height / 2);
    const t = toSvg(r.left, r.top);
    return { x: c.x, y: c.y, top: t.y };
  }
  function tween(ms, fn) {
    return new Promise(res => {
      const t0 = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - t0) / ms);
        fn(t);
        if (t < 1) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
  }
  function starPath(R, r, n = 5) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R, a = Math.PI * i / n - Math.PI / 2;
      d += (i ? 'L' : 'M') + (Math.cos(a) * rad).toFixed(1) + ' ' + (Math.sin(a) * rad).toFixed(1);
    }
    return d + 'Z';
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => clamp(Math.round(c * (1 + amt)), 0, 255);
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
  }
  /* ---------- speech bubbles ---------- */
  const bubbles = {};
  function bubble(key, x, y, text) {
    if (bubbles[key]) bubbles[key].remove();
    const g = el('g', { class: 'bubble' }, layer.bubbles);
    bubbles[key] = g;
    const inner = el('g', {}, g);
    const rect = el('rect', { y: -42, height: 84, rx: 42, fill: '#fff', stroke: '#333', 'stroke-width': 5 }, inner);
    el('path', { d: 'M-18 39 L0 72 L18 39', fill: '#fff', stroke: '#333', 'stroke-width': 5, 'stroke-linejoin': 'round' }, inner);
    el('path', { d: 'M-15 39 L15 39', stroke: '#fff', 'stroke-width': 7 }, inner);
    const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 42 }, inner);
    t.textContent = text;
    const w = Math.max(120, t.getComputedTextLength() + 64);
    rect.setAttribute('x', -w / 2); rect.setAttribute('width', w);
    const vb = visibleBox(10);
    const bx = clamp(x, vb.x0 + w / 2, vb.x1 - w / 2), by = clamp(y, vb.y0 + 45, vb.y1 - 80);
    g.setAttribute('transform', `translate(${bx},${by})`);
    anim(inner, [{ transform: 'scale(0)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], 300);
    setTimeout(() => {
      const a = anim(inner, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-20px)' }], 350, { fill: 'forwards' });
      const done = () => { g.remove(); if (bubbles[key] === g) delete bubbles[key]; };
      if (a) a.onfinish = done; else done();
    }, 2100);
  }
  function talk(key, x, y, text, voiceOpts) {
    bubble(key, x, y, text);
    Voice.say(text, voiceOpts);
  }

  /* ---------- particles ---------- */
  const RAINBOW = ['#ff4b4b', '#ff9f1c', '#ffd93b', '#5cc84a', '#3fa9f5', '#9b6bff'];
  function sparkles(x, y, o) {
    const { n = 10, colors = ['#ffd93b', '#fff'], spread = 130, size = 14, dur = 800, shape = null } = o || {};
    for (let i = 0; i < n; i++) {
      const g = el('g', { transform: `translate(${x},${y})` }, layer.fx);
      const p = el('path', { d: shape ? shape(size) : starPath(size, size * 0.45), fill: pick(colors) }, g);
      const a = rand(0, Math.PI * 2), d = rand(spread * 0.4, spread);
      const an = anim(p, [
        { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(1) rotate(${rand(-200, 200)}deg)`, opacity: 1, offset: 0.7 },
        { transform: `translate(${Math.cos(a) * d * 1.1}px,${Math.sin(a) * d * 1.1 + 30}px) scale(.2) rotate(${rand(-300, 300)}deg)`, opacity: 0 },
      ], dur * rand(0.8, 1.2), { easing: 'cubic-bezier(.2,.8,.3,1)' });
      if (an) an.onfinish = () => g.remove(); else setTimeout(() => g.remove(), dur);
    }
  }
  const heart = r => `M0 ${r * 0.9} C${-r * 1.6} ${-r * 0.2} ${-r * 0.7} ${-r * 1.3} 0 ${-r * 0.45} C${r * 0.7} ${-r * 1.3} ${r * 1.6} ${-r * 0.2} 0 ${r * 0.9}Z`;
  const drop = r => `M0 ${-r} Q${r * 0.8} 0 0 ${r * 0.6} Q${-r * 0.8} 0 0 ${-r}Z`;
  function rings(x, y, colors, o) {
    const { width = 7, scale = 9, gap = 70, back = false } = o || {};
    colors.forEach((c, i) => {
      const g = el('g', { transform: `translate(${x},${y})` }, back ? layer.fxBack : layer.fx);
      const ci = el('ellipse', { rx: 20, ry: back ? 7 : 20, fill: 'none', stroke: c, 'stroke-width': width }, g);
      const a = anim(ci, [{ transform: 'scale(.5)', opacity: 1 }, { transform: `scale(${scale})`, opacity: 0 }], 900, { delay: i * gap, fill: 'backwards' });
      if (a) a.onfinish = () => g.remove(); else setTimeout(() => g.remove(), 900);
    });
  }

  /* ---------- frog moods ---------- */
  const mouthReasons = new Set();
  function mouth(reason, open) {
    if (open) mouthReasons.add(reason); else mouthReasons.delete(reason);
    frog.classList.toggle('open', mouthReasons.size > 0);
  }
  let giggleTimer = 0;
  function giggle(ms) {
    frog.classList.add('giggle'); mouth('giggle', true);
    clearTimeout(giggleTimer);
    giggleTimer = setTimeout(() => { frog.classList.remove('giggle'); mouth('giggle', false); }, ms || 900);
  }
  function lookAt(x, y) {
    pupils.forEach((p, i) => {
      const ex = FROG.head.x + (i ? 78 : -78), ey = FROG.head.y - 68;
      const dx = x - ex, dy = y - ey, d = Math.hypot(dx, dy) || 1, m = Math.min(12, d / 20);
      p.setAttribute('transform', `translate(${(dx / d * m).toFixed(1)},${(dy / d * m).toFixed(1)})`);
    });
  }
  function blink() {
    eyes.forEach(e => { e.classList.remove('blink'); void e.getBBox(); e.classList.add('blink'); });
    setTimeout(blink, rand(2200, 5200));
  }
  setTimeout(blink, 2000);
  const nearFrog = p => p.x > 270 && p.x < 630 && p.y > 370 && p.y < 770;

  const BELLY_LINES = ['Hee hee! That tickles!', 'Ribbit-giggle!', 'Boing boing!', 'Ooh, what came out?', 'Tummy rumble!', 'Blub blub blub!', 'Wheee!', 'Hee hee hee!', 'Again! Again!'];
  const HEAD_LINES = ['Ribbit!', 'Boop!', 'Hello, friend!', 'Croak croak!', 'Peekaboo!'];
  const EAT_LINES = ['Yum yum in my tum!', 'Crunchy munchy!', 'Mmm, buggy!', 'Gulp! Delicious!', 'More bugs, please!', 'Nom nom nom!', 'Tasty!'];

  function frogSays(lines) { talk('frog', FROG.bubble.x, FROG.bubble.y, pick(lines)); }

  let lastSpawn = 0, frogBusy = false;
  function tapBelly() {
    giggle(1000);
    Sound.play('tickle');
    anim(frogAnim, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.07,.9)' }, { transform: 'scale(.96,1.07) rotate(-3deg)' }, { transform: 'scale(1.02,.98) rotate(3deg)' }, { transform: 'scale(1,1)' }], 700);
    anim(belly, [{ transform: 'scale(1)' }, { transform: 'scale(1.16,.84)' }, { transform: 'scale(.95,1.08)' }, { transform: 'scale(1)' }], 500);
    anim(bellyGlow, [{ opacity: 0.6 }, { opacity: 0 }], 500);
    const now = performance.now();
    if (frogBusy || now - lastSpawn < 550) return;
    lastSpawn = now;
    if (now - Voice.last > 1300) setTimeout(() => frogSays(BELLY_LINES), 150);
    setTimeout(() => spawnFromFrog(), 320);
  }
  function tapHead() {
    Sound.play('croak');
    anim(frogHead, [{ transform: 'translateY(0)' }, { transform: 'translateY(-30px) rotate(-5deg)' }, { transform: 'translateY(0) rotate(4deg)' }, { transform: 'translateY(0)' }], 550);
    eyes.forEach(e => anim(e, [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], 500));
    if (performance.now() - Voice.last > 900) frogSays(HEAD_LINES);
  }

  /* ---------- stickers ---------- */
  const stickers = [];
  const BUG_TYPES = ['ladybug', 'bee', 'caterpillar', 'butterfly', 'beetle', 'firefly'];
  const ART = {
    ladybug: `
      <g stroke="#2a2a2a" stroke-width="6" stroke-linecap="round" fill="none"><path d="M-28 -22 L-56 -36 M-36 0 L-62 2 M-28 22 L-54 40 M28 -22 L56 -36 M36 0 L62 2 M28 22 L54 40"/>
      <path d="M-8 -60 Q-16 -84 -28 -84 M8 -60 Q16 -84 28 -84" stroke-width="4"/></g>
      <circle cx="-28" cy="-84" r="6" fill="#2a2a2a"/><circle cx="28" cy="-84" r="6" fill="#2a2a2a"/>
      <circle r="46" fill="var(--main)" stroke="var(--dark)" stroke-width="4"/>
      <path d="M0 -40 V46" stroke="#2a2a2a" stroke-width="5"/>
      <g fill="#2a2a2a"><circle cx="-22" cy="-10" r="9"/><circle cx="22" cy="-10" r="9"/><circle cx="-24" cy="22" r="8"/><circle cx="24" cy="22" r="8"/></g>
      <ellipse cx="-22" cy="-26" rx="10" ry="5" fill="#fff" opacity=".55" transform="rotate(-30 -22 -26)"/>
      <circle cy="-48" r="24" fill="#2a2a2a"/>
      <circle cx="-9" cy="-52" r="7" fill="#fff"/><circle cx="9" cy="-52" r="7" fill="#fff"/><circle cx="-8" cy="-51" r="3.5" fill="#111"/><circle cx="10" cy="-51" r="3.5" fill="#111"/>`,
    bee: `
      <g class="wing"><ellipse cx="-14" cy="-40" rx="20" ry="30" fill="#eaf8ff" stroke="#8fc6dd" stroke-width="3" opacity=".92" transform="rotate(-20 -14 -40)"/>
      <ellipse cx="16" cy="-40" rx="20" ry="30" fill="#eaf8ff" stroke="#8fc6dd" stroke-width="3" opacity=".92" transform="rotate(20 16 -40)"/></g>
      <path d="M46 -9 L68 0 L46 9Z" fill="#2a2a2a"/>
      <ellipse rx="50" ry="36" fill="var(--main)"/>
      <g clip-path="url(#beeClip)" fill="#2a2a2a"><rect x="-10" y="-40" width="14" height="80"/><rect x="18" y="-40" width="14" height="80"/></g>
      <ellipse rx="50" ry="36" fill="none" stroke="#2a2a2a" stroke-width="4"/>
      <circle cx="-28" cy="-8" r="8" fill="#fff"/><circle cx="-30" cy="-7" r="4" fill="#111"/>
      <path d="M-42 10 Q-33 20 -24 12" stroke="#2a2a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M-34 -30 Q-44 -54 -56 -52" stroke="#2a2a2a" stroke-width="4" fill="none"/><circle cx="-56" cy="-52" r="5" fill="#2a2a2a"/>`,
    caterpillar: [-64, -36, -8, 20].map(x => `
      <g class="seg"><circle cx="${x}" cy="12" r="22" fill="var(--main)" stroke="var(--dark)" stroke-width="4"/>
      <path d="M${x - 8} 32 v9 M${x + 8} 32 v9" stroke="var(--dark)" stroke-width="5" stroke-linecap="round"/></g>`).join('') + `
      <g class="seg"><path d="M44 -30 L36 -54 M62 -30 L70 -54" stroke="#2a2a2a" stroke-width="4" stroke-linecap="round"/>
      <circle cx="36" cy="-56" r="6" fill="#ff6f91"/><circle cx="70" cy="-56" r="6" fill="#ff6f91"/>
      <circle cx="53" cy="-4" r="30" fill="var(--main)" stroke="var(--dark)" stroke-width="4"/>
      <circle cx="43" cy="-10" r="7" fill="#fff"/><circle cx="63" cy="-10" r="7" fill="#fff"/><circle cx="44" cy="-9" r="3.5" fill="#111"/><circle cx="64" cy="-9" r="3.5" fill="#111"/>
      <path d="M42 6 Q53 17 64 6" stroke="#2a2a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="34" cy="4" r="5" fill="#ff8fa8" opacity=".7"/><circle cx="72" cy="4" r="5" fill="#ff8fa8" opacity=".7"/></g>`,
    butterfly: (() => {
      const wing = `<path d="M-4 -6 C-40 -64 -84 -44 -70 -6 C-60 16 -30 6 -4 -6Z" fill="var(--main)" stroke="var(--dark)" stroke-width="4"/>
        <path d="M-4 4 C-40 10 -62 46 -36 52 C-18 56 -8 30 -4 4Z" fill="var(--main)" stroke="var(--dark)" stroke-width="4"/>
        <circle cx="-46" cy="-20" r="9" fill="#fff" opacity=".8"/><circle cx="-30" cy="34" r="6" fill="#fff" opacity=".8"/>`;
      return `<g class="wingL">${wing}</g><g class="wingR"><g transform="scale(-1,1)">${wing}</g></g>
        <path d="M-4 -40 Q-12 -62 -22 -64 M4 -40 Q12 -62 22 -64" stroke="#3a2a4a" stroke-width="4" fill="none" stroke-linecap="round"/>
        <ellipse rx="9" ry="34" fill="#3a2a4a"/><circle cy="-36" r="12" fill="#3a2a4a"/>
        <circle cx="-5" cy="-38" r="3.5" fill="#fff"/><circle cx="5" cy="-38" r="3.5" fill="#fff"/>`;
    })(),
    firefly: `
      <circle class="ff-halo" cy="22" r="64" fill="url(#gGlow)"/>
      <g class="wing"><ellipse cx="-20" cy="-12" rx="17" ry="30" fill="#eaf8ff" stroke="#8fc6dd" stroke-width="3" opacity=".88" transform="rotate(-28 -20 -12)"/>
      <ellipse cx="20" cy="-12" rx="17" ry="30" fill="#eaf8ff" stroke="#8fc6dd" stroke-width="3" opacity=".88" transform="rotate(28 20 -12)"/></g>
      <ellipse cy="-2" rx="22" ry="28" fill="#5a4636" stroke="#3a2c22" stroke-width="4"/>
      <ellipse class="ff-tail" cy="28" rx="23" ry="21" fill="var(--main)" stroke="var(--dark)" stroke-width="4"/>
      <ellipse cx="-7" cy="22" rx="6" ry="4" fill="#fff" opacity=".6"/>
      <path d="M-6 -48 Q-12 -66 -22 -68 M6 -48 Q12 -66 22 -68" stroke="#3a2c22" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cy="-36" r="18" fill="#5a4636"/>
      <circle cx="-7" cy="-39" r="6" fill="#fff"/><circle cx="7" cy="-39" r="6" fill="#fff"/><circle cx="-6" cy="-38" r="3" fill="#111"/><circle cx="8" cy="-38" r="3" fill="#111"/>
      <path d="M-6 -28 Q0 -23 6 -28" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    beetle: `
      <g stroke="#2a2a3a" stroke-width="6" stroke-linecap="round" fill="none"><path d="M-30 -14 L-54 -30 M-36 10 L-60 12 M-30 32 L-50 50 M30 -14 L54 -30 M36 10 L60 12 M30 32 L50 50"/></g>
      <path d="M0 -52 q-6 -20 6 -30 q2 14 -2 30z" fill="#2a2a3a"/>
      <circle cy="-38" r="22" fill="#2a2a3a"/>
      <circle cx="-9" cy="-42" r="6" fill="#fff"/><circle cx="9" cy="-42" r="6" fill="#fff"/><circle cx="-8" cy="-41" r="3" fill="#111"/><circle cx="10" cy="-41" r="3" fill="#111"/>
      <ellipse cy="10" rx="42" ry="46" fill="var(--main)" stroke="var(--dark)" stroke-width="4"/>
      <path d="M0 -34 V56" stroke="var(--dark)" stroke-width="4"/>
      <ellipse cx="-18" cy="-6" rx="9" ry="16" fill="#fff" opacity=".45"/>`,
    wand: `
      <g transform="rotate(-18)">
        <rect x="-8" y="-18" width="16" height="100" rx="8" fill="#7b4bd1" stroke="#4d2a91" stroke-width="3"/>
        <rect x="-7" y="12" width="14" height="10" fill="#fff" opacity=".8"/><rect x="-7" y="44" width="14" height="10" fill="#fff" opacity=".8"/>
        <g transform="translate(0,-45)"><g class="wand-star">
          <path d="${starPath(40, 18)}" fill="#ffd93b" stroke="#f2a600" stroke-width="5" stroke-linejoin="round"/>
          <circle cx="-7" cy="-2" r="3.5" fill="#6b4300"/><circle cx="7" cy="-2" r="3.5" fill="#6b4300"/>
          <path d="M-7 7 Q0 13 7 7" stroke="#6b4300" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g></g>
      </g>`,
  };
  const DEFAULT_COLOR = { ladybug: '#ff4b4b', bee: '#ffcf33', caterpillar: '#7ed957', butterfly: '#b57cff', beetle: '#3b82f6', firefly: '#e4ff5c' };

  function setPos(s) {
    s.el.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) scale(${s.scale.toFixed(3)})`);
  }
  function makeSticker(type, x, y) {
    const isWand = type === 'wand';
    const g = el('g', { class: `sticker ${type}`, 'data-act': 'sticker' }, layer.stickers);
    if (!isWand) {
      const main = DEFAULT_COLOR[type];
      g.setAttribute('data-color', '');
      g.style.setProperty('--main', main);
      g.style.setProperty('--dark', shade(main, -0.3));
    }
    const pop = el('g', { class: 'pop' }, g);
    el('ellipse', { cy: 62, rx: 44, ry: 10, fill: '#000', opacity: 0.12 }, pop);
    const a = el('g', { class: 'anim' }, pop);
    a.innerHTML = ART[type];
    const s = { el: g, anim: a, type, kind: isWand ? 'wand' : 'bug', x, y, scale: 1, held: false, locked: false };
    g.__s = s;
    stickers.push(s);
    setPos(s);
    while (stickers.filter(t => !t.locked).length > MAX_STICKERS) {
      const old = stickers.find(t => !t.held && !t.locked);
      if (!old) break;
      removeSticker(old, true);
    }
    return s;
  }
  function removeSticker(s, poof) {
    const i = stickers.indexOf(s);
    if (i >= 0) stickers.splice(i, 1);
    rainbow.delete(s.el);
    s.locked = true;
    if (poof) {
      Sound.play('poof');
      sparkles(s.x, s.y, { n: 6, colors: ['#fff', '#e8f4ff'], spread: 70, size: 12 });
      const a = anim(s.anim, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0.8, offset: 0.3 }, { transform: 'scale(0)', opacity: 0 }], 350, { fill: 'forwards' });
      if (a) a.onfinish = () => s.el.remove(); else s.el.remove();
    } else s.el.remove();
  }
  function freeSpot() {
    const vb = visibleBox(80);
    let best = null, bestD = -1;
    for (let i = 0; i < 24; i++) {
      const p = { x: rand(Math.max(vb.x0, 230), Math.min(vb.x1, 1370)), y: rand(Math.max(vb.y0, 170), Math.min(vb.y1, 800)) };
      if (nearFrog(p)) continue;
      const d = stickers.reduce((m, s) => Math.min(m, Math.hypot(s.x - p.x, s.y - p.y)), 9999);
      if (d > 150) return p;
      if (d > bestD) { bestD = d; best = p; }
    }
    return best || { x: 800, y: 300 };
  }
  async function launch(type, from, to) {
    const s = makeSticker(type, from.x, from.y);
    s.locked = true; s.scale = 0.25; setPos(s);
    Sound.play('pop');
    const arc = Math.min(260, 90 + Math.abs(to.x - from.x) * 0.3);
    await tween(650, t => {
      s.x = lerp(from.x, to.x, t);
      s.y = lerp(from.y, to.y, t) - Math.sin(Math.PI * t) * arc;
      s.scale = lerp(0.25, 1, Math.min(1, t * 1.6));
      setPos(s);
    });
    if (s.el.isConnected) {
      s.locked = false;
      Sound.play('land');
      anim(s.anim, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.25,.75)' }, { transform: 'scale(.9,1.1)' }, { transform: 'scale(1,1)' }], 380);
      if (type === 'wand') sparkles(s.x - 14, s.y - 43, { n: 8 });
    }
    return s;
  }

  let spawnCount = 0, sinceWand = 0;
  async function spawnFromFrog() {
    spawnCount++; sinceWand++;
    const wands = stickers.filter(s => s.kind === 'wand').length;
    const wantWand = wands < 2 && spawnCount >= 3 && (Math.random() < 0.22 || sinceWand >= 7);
    const night = svg.classList.contains('night');
    const type = wantWand ? 'wand' : (night && Math.random() < 0.4 ? 'firefly' : pick(BUG_TYPES));
    if (wantWand) sinceWand = 0;
    mouth('spit', true);
    const to = freeSpot();
    lookAt(to.x, to.y);
    await launch(type, FROG.mouth, to);
    mouth('spit', false);
    if (type === 'wand') { Sound.play('sparkle'); }
  }

  /* bug tap reactions */
  const BUG_TAP = {
    ladybug(s) { Sound.play('whirr'); anim(s.anim, [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(360deg) scale(1.2) translateY(-20px)' }, { transform: 'rotate(720deg) scale(1)' }], 900, { easing: 'ease-in-out' }); },
    bee(s) {
      Sound.play('buzz');
      anim(s.anim, [0, 1, 2, 3, 4, 5, 6].map(i => ({ transform: i === 0 || i === 6 ? 'translate(0,0)' : `translate(${i % 2 ? 46 : -46}px,${-18 - i * 4}px) rotate(${i % 2 ? 12 : -12}deg)` })), 1000, { easing: 'ease-in-out' });
    },
    caterpillar(s) {
      Sound.play('squeak', 3);
      s.anim.querySelectorAll('.seg').forEach((g, i) => anim(g, [{ transform: 'translateY(0)' }, { transform: 'translateY(-22px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], 700, { delay: i * 70 }));
    },
    butterfly(s) {
      Sound.play('flutter');
      s.el.classList.add('fast');
      setTimeout(() => s.el.classList.remove('fast'), 1100);
      anim(s.anim, [{ transform: 'translate(0,0)' }, { transform: 'translate(-30px,-60px)' }, { transform: 'translate(30px,-90px)' }, { transform: 'translate(0,0)' }], 1100, { easing: 'ease-in-out' });
      sparkles(s.x, s.y, { n: 5, colors: ['#fff', '#ffe3f7'], spread: 90, size: 10 });
    },
    beetle(s) { Sound.play('boink'); anim(s.anim, [{ transform: 'scale(1,1)' }, { transform: 'scale(1,-1) translateY(10px)', offset: 0.25 }, { transform: 'scale(1,-1) rotate(20deg) translateY(10px)', offset: 0.45 }, { transform: 'scale(1,-1) rotate(-20deg) translateY(10px)', offset: 0.6 }, { transform: 'translateY(-50px) rotate(180deg)', offset: 0.85 }, { transform: 'scale(1,1) rotate(360deg)' }], 1100); },
    firefly(s) {
      Sound.play('twinkle');
      anim(s.anim.querySelector('.ff-halo'), [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.6)' }, { opacity: 0.2, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.5)' }, { opacity: 0, transform: 'scale(1)' }], 1200);
      anim(s.anim, [{ transform: 'translate(0,0)' }, { transform: 'translate(20px,-40px)' }, { transform: 'translate(-20px,-60px)' }, { transform: 'translate(0,0)' }], 1200, { easing: 'ease-in-out' });
      sparkles(s.x, s.y + 22, { n: 6, colors: ['#f4ff8a', '#fff'], spread: 80, size: 9 });
    },
    wand(s) {
      Sound.play('sparkle');
      anim(s.anim, [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-25deg) scale(1.15)' }, { transform: 'rotate(20deg) scale(1.1)' }, { transform: 'rotate(0) scale(1)' }], 600);
      sparkles(s.x - 14, s.y - 43, { n: 14, colors: RAINBOW });
    },
  };

  /* ---------- the magic wand: blue, pink, orange, purple, RAINBOW, then back to the start ---------- */
  const PALETTE = [{ name: 'Blue!', c: '#3fa9f5' }, { name: 'Pink!', c: '#ff6fb5' }, { name: 'Orange!', c: '#ffa630' }, { name: 'Purple!', c: '#9b6bff' }];
  const rainbow = new Map(); // element -> start time
  function setColor(t, main, dark) { t.style.setProperty('--main', main); t.style.setProperty('--dark', dark); }
  function rememberColor(t) {
    if (t.dataset.omain) return;
    const cs = t.style;
    t.dataset.omain = cs.getPropertyValue('--main').trim();
    t.dataset.odark = cs.getPropertyValue('--dark').trim();
  }
  function rainbowLoop(now) {
    let i = 0;
    for (const [t, t0] of rainbow) {
      if (!t.isConnected) { rainbow.delete(t); continue; }
      const age = now - t0, speed = age < 2500 ? 0.9 : 0.12;
      const h = ((t0 * 0.1 + age * speed) + i * 50) % 360;
      setColor(t, `hsl(${h.toFixed(0)},90%,60%)`, `hsl(${h.toFixed(0)},75%,40%)`);
      i++;
    }
    requestAnimationFrame(rainbowLoop);
  }
  requestAnimationFrame(rainbowLoop);

  function animTarget(t) { return t.querySelector('.anim') || t; }
  function speakerSpot(t) {
    if (t === frog) return FROG.bubble;
    const c = centerOf(t);
    return { x: c.x, y: c.top - 60 };
  }
  function applyWand(t, at) {
    rememberColor(t);
    const next = ((+t.dataset.cstate || 0) + 1) % (PALETTE.length + 2);
    t.dataset.cstate = next;
    rainbow.delete(t);
    const spot = speakerSpot(t);
    const key = t === frog ? 'frog' : 'wand';
    const c = centerOf(t);
    if (next === 0) {
      setColor(t, t.dataset.omain, t.dataset.odark);
      Sound.play('sparkle');
      sparkles(c.x, c.y, { n: 12 });
      talk(key, spot.x, spot.y, 'Ta-da!');
      anim(animTarget(t), [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], 400);
    } else if (next <= PALETTE.length) {
      const p = PALETTE[next - 1];
      setColor(t, p.c, shade(p.c, -0.3));
      Sound.play('sparkle');
      sparkles(c.x, c.y, { n: 14, colors: [p.c, '#fff', '#ffd93b'] });
      talk(key, spot.x, spot.y, p.name);
      anim(animTarget(t), [{ transform: 'scale(1)' }, { transform: 'scale(1.12,.9)' }, { transform: 'scale(.95,1.08)' }, { transform: 'scale(1)' }], 450);
    } else {
      rainbow.set(t, performance.now());
      Sound.play('rainbow');
      rings(c.x, c.y, RAINBOW, { scale: 10 });
      sparkles(c.x, c.y, { n: 30, colors: RAINBOW, spread: 260, size: 18, dur: 1200 });
      setTimeout(() => sparkles(c.x, c.y, { n: 20, colors: RAINBOW, spread: 200, size: 16 }), 500);
      talk(key, spot.x, spot.y, t === frog ? "I'm a rainbow frog!" : 'Rainbow!', { pitch: 1.9, rate: 1.1 });
      anim(animTarget(t), [
        { transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.2,.8) rotate(-8deg)' }, { transform: 'scale(.85,1.2) rotate(8deg)' },
        { transform: 'scale(1.15,.85) rotate(-6deg)' }, { transform: 'scale(.92,1.1) rotate(6deg)' }, { transform: 'scale(1) rotate(0)' },
      ], 1400, { easing: 'ease-in-out' });
      if (t === frog) giggle(1400);
    }
    if (at) sparkles(at.x, at.y, { n: 6 });
  }
  function wandTargetAt(points, wandEl) {
    wandEl.style.pointerEvents = 'none';
    try {
      for (const p of points) {
        const c = toClient(p.x, p.y);
        for (const n of document.elementsFromPoint(c.x, c.y)) {
          const t = n.closest && n.closest('[data-color]');
          if (t && t !== wandEl) return t;
        }
        if (nearFrog(p)) return frog;
      }
    } finally { wandEl.style.pointerEvents = ''; }
    return null;
  }
  const wandTip = s => ({ x: s.x - 14 * s.scale, y: s.y - 43 * s.scale });

  /* ---------- feeding the frog ---------- */
  async function eat(s) {
    s.locked = true; frogBusy = true;
    mouth('eat', true);
    lookAt(s.x, s.y);
    const M = FROG.mouth, B = { x: s.x, y: s.y };
    tongue.setAttribute('x1', M.x); tongue.setAttribute('y1', M.y);
    tongue.setAttribute('x2', M.x); tongue.setAttribute('y2', M.y);
    tongue.setAttribute('visibility', 'visible');
    Sound.play('slurp');
    await tween(160, t => { tongue.setAttribute('x2', lerp(M.x, B.x, t)); tongue.setAttribute('y2', lerp(M.y, B.y, t)); });
    await tween(260, t => {
      const e = t * t;
      s.x = lerp(B.x, M.x, e); s.y = lerp(B.y, M.y, e); s.scale = 1 - 0.75 * e; setPos(s);
      tongue.setAttribute('x2', s.x); tongue.setAttribute('y2', s.y);
    });
    tongue.setAttribute('visibility', 'hidden');
    const wasRainbow = rainbow.has(s.el), cstate = +s.el.dataset.cstate || 0, milky = s.el.dataset.milk === '1';
    removeSticker(s, false);
    mouth('eat', false);
    Sound.play('chomp');
    anim(frogHead, [{ transform: 'scale(1)' }, { transform: 'scale(1.06,.94)' }, { transform: 'scale(1)' }, { transform: 'scale(1.06,.94)' }, { transform: 'scale(1)' }], 420);
    await wait(420);
    Sound.play('gulp');
    anim(belly, [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(.95)' }, { transform: 'scale(1)' }], 600, { easing: 'ease-in-out' });
    await wait(250);
    giggle(1100);
    frogBusy = false;
    if (s.kind === 'wand') {
      // a magic snack: sparkly hiccup, then the magic works on him
      Sound.play('sparkle');
      sparkles(FROG.mouth.x, FROG.mouth.y, { n: 16, colors: RAINBOW, spread: 160 });
      setTimeout(() => applyWand(frog), 350);
      return;
    }
    if (wasRainbow) { rainbowTummy(); return; }
    if (cstate >= 1 && cstate <= PALETTE.length) {
      const p = PALETTE[cstate - 1];
      rememberColor(frog); rainbow.delete(frog);
      frog.dataset.cstate = cstate;
      setColor(frog, p.c, shade(p.c, -0.3));
      sparkles(FROG.head.x, FROG.head.y, { n: 12, colors: [p.c, '#fff'] });
      talk('frog', FROG.bubble.x, FROG.bubble.y, p.name.replace('!', ' tummy!'));
      return;
    }
    frogSays(milky ? ['Mmm, milky!', 'Milk and bugs!', 'A milky bug!'] : EAT_LINES);
    if (Math.random() < 0.3) {
      await wait(1700);
      Sound.play('burp');
      mouth('burp', true);
      bubble('frog', FROG.bubble.x, FROG.bubble.y, 'BURP!');
      rings(FROG.mouth.x, FROG.mouth.y - 10, ['#bfe9ff', '#d6f5ff'], { width: 4, scale: 4, gap: 150 });
      setTimeout(() => mouth('burp', false), 600);
    }
  }

  async function rainbowTummy() {
    frogBusy = true;
    rememberColor(frog);
    frog.dataset.cstate = PALETTE.length + 1;
    rainbow.set(frog, performance.now());
    Sound.play('rainbow');
    talk('frog', FROG.bubble.x, FROG.bubble.y, 'Whoa! Rainbow tummy!', { pitch: 2, rate: 1.1 });
    giggle(2200);
    anim(frogAnim, [
      { transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-70px) rotate(-10deg) scale(1.05,.95)' },
      { transform: 'translateY(0) rotate(8deg) scale(1.1,.9)' }, { transform: 'translateY(-50px) rotate(-6deg)' },
      { transform: 'translateY(0) rotate(0) scale(1.08,.92)' }, { transform: 'translateY(0) rotate(0)' },
    ], 1600, { easing: 'ease-in-out' });
    for (let i = 0; i < 4; i++) setTimeout(() => sparkles(FROG.head.x + rand(-120, 120), FROG.head.y + rand(-60, 160), { n: 10, colors: RAINBOW, spread: 180, size: 16 }), i * 300);
    await wait(2100);
    Sound.play('burp');
    mouth('burp', true);
    bubble('frog', FROG.bubble.x, FROG.bubble.y, 'RAINBOW BURP!');
    rings(FROG.mouth.x, FROG.mouth.y - 10, RAINBOW, { width: 8, scale: 7, gap: 90 });
    sparkles(FROG.mouth.x, FROG.mouth.y, { n: 24, colors: RAINBOW, spread: 260, size: 15, dur: 1200 });
    setTimeout(() => mouth('burp', false), 700);
    frogBusy = false;
  }

  /* ---------- stickers meeting stickers, and the cow's milk ---------- */
  function stickerUnder(s) {
    let best = null, bd = 85;
    for (const o of stickers) {
      if (o === s || o.locked || o.held) continue;
      const d = Math.hypot(o.x - s.x, o.y - s.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function stickerMeet(a, b) {
    // rainbow is catching: if either one is rainbow, now both are
    const ra = rainbow.has(a.el), rb = rainbow.has(b.el);
    if (ra !== rb && a.kind === 'bug' && b.kind === 'bug') {
      const t = ra ? b : a;
      rememberColor(t.el); t.el.dataset.cstate = PALETTE.length + 1; rainbow.set(t.el, performance.now());
      Sound.play('rainbow');
      sparkles(t.x, t.y, { n: 16, colors: RAINBOW, spread: 140 });
    }
    if (a.type === b.type) {
      // best friends: hearts, a happy dance together, and they stay stacked
      Sound.play('love');
      sparkles((a.x + b.x) / 2, (a.y + b.y) / 2 - 40, { n: 9, colors: ['#ff5c8a', '#ff8fb3', '#ffc2d6'], spread: 120, size: 16, shape: heart, dur: 1100 });
      const nx = b.x + 28, ny = b.y - 28;
      tween(200, t => { a.x = lerp(a.x, nx, t); a.y = lerp(a.y, ny, t); setPos(a); });
      [a, b].forEach((s, i) => anim(s.anim, [0, 1, 2, 3, 4, 5].map(k => ({ transform: k === 0 || k === 5 ? 'rotate(0) translateY(0)' : `rotate(${(k % 2 ? 14 : -14) * (i ? -1 : 1)}deg) translateY(${k % 2 ? -16 : 0}px)` })), 900, { easing: 'ease-in-out' }));
    } else {
      // strangers: a startled shake, a squeak, and a little hop apart
      Sound.play('bonk');
      [a, b].forEach(s => anim(s.anim, [0, 1, 2, 3, 4, 5, 6].map(k => ({ transform: k === 0 || k === 6 ? 'translateX(0)' : `translateX(${k % 2 ? 9 : -9}px) scale(1.06,.94)` })), 500));
      sparkles((a.x + b.x) / 2, (a.y + b.y) / 2 - 50, { n: 5, colors: ['#ffd93b', '#fff'], spread: 70, size: 11 });
      const ang = Math.atan2(a.y - b.y, a.x - b.x) || -Math.PI / 4, vb = visibleBox(60);
      const x0 = a.x, y0 = a.y;
      const nx = clamp(b.x + Math.cos(ang) * 125, vb.x0, vb.x1), ny = clamp(b.y + Math.sin(ang) * 125, vb.y0, vb.y1);
      setTimeout(() => tween(380, t => { a.x = lerp(x0, nx, t); a.y = lerp(y0, ny, t) - Math.sin(Math.PI * t) * 60; setPos(a); }), 420);
    }
  }
  function overCow(s) {
    const c = toClient(s.x, s.y);
    s.el.style.pointerEvents = 'none';
    try { return document.elementsFromPoint(c.x, c.y).some(n => n.closest && n.closest('#cow')); }
    finally { s.el.style.pointerEvents = ''; }
  }
  function milkBath(s) {
    rememberColor(s.el);
    rainbow.delete(s.el);
    s.el.dataset.cstate = 0;
    s.el.dataset.milk = '1';
    setColor(s.el, '#ffffff', '#c3c9d6');
    Sound.play('moo');
    setTimeout(() => Sound.play('splash'), 250);
    tapCowBounce();
    bubble('cow', 1050, 330, pick(['Moo! Milky!', 'Moo, splash!', 'Moooilk!']));
    sparkles(s.x, s.y, { n: 12, colors: ['#ffffff', '#f2f6ff', '#e6ecf7'], spread: 110, size: 14, shape: drop, dur: 1000 });
    anim(s.anim, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.2,.8)' }, { transform: 'scale(.9,1.1) rotate(8deg)' }, { transform: 'scale(1,1) rotate(-6deg)' }, { transform: 'scale(1,1)' }], 800);
  }

  /* ---------- the other farm stations (placeholders for now) ---------- */
  document.querySelectorAll('.flower .petals').forEach(g => {
    let m = '';
    for (let i = 0; i < 6; i++) m += `<ellipse cy="-32" rx="19" ry="29" fill="var(--main)" stroke="var(--dark)" stroke-width="3" transform="rotate(${i * 60})"/>`;
    m += '<circle r="24" fill="#ffd93b" stroke="#f2a600" stroke-width="3"/><circle cx="-7" cy="-4" r="3" fill="#6b4300"/><circle cx="7" cy="-4" r="3" fill="#6b4300"/><path d="M-8 6 Q0 13 8 6" stroke="#6b4300" stroke-width="3" fill="none" stroke-linecap="round"/>';
    g.innerHTML = m;
  });
  let flowerTaps = 0;
  function tapFlower(f) {
    const head = f.querySelector('.petals');
    Sound.play('chime', +f.dataset.note + Math.floor(Math.random() * 2));
    anim(head, [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(180deg) scale(1.3)' }, { transform: 'rotate(360deg) scale(1)' }], 800, { easing: 'ease-in-out' });
    const c = centerOf(head);
    sparkles(c.x, c.y, { n: 8, colors: [getComputedStyle(f).getPropertyValue('--main').trim() || '#ff6f91', '#fff', '#ffd93b'], spread: 110 });
    flowerTaps++;
    if (flowerTaps % 3 === 0) setTimeout(() => launch('butterfly', c, freeSpot()), 300);
  }
  const cow = $('#cow');
  function tapCowBounce() {
    cow.classList.add('moo');
    setTimeout(() => cow.classList.remove('moo'), 1100);
    anim(animTarget(cow), [{ transform: 'translateY(0)' }, { transform: 'translateY(-36px) scale(1.03,.97)' }, { transform: 'translateY(0) scale(1.05,.95)' }, { transform: 'translateY(0)' }], 600);
    anim(cow.querySelector('.cow-head'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], 1100);
  }
  function tapCow() {
    Sound.play('moo');
    tapCowBounce();
    bubble('cow', 1050, 330, pick(['Moooo!', 'Moo moo!', 'Mooooooo!']));
  }
  function tapPond(p) {
    Sound.play('splash');
    rings(p.x, p.y, ['#e6fbff', '#bfefff', '#e6fbff'], { back: true, scale: 5, width: 5, gap: 160 });
    sparkles(p.x, p.y - 10, { n: 7, colors: ['#bfefff', '#fff', '#7fd7ff'], spread: 90, size: 11 });
  }
  function tapCloud(c) {
    Sound.play('rain');
    anim(c.querySelector('.anim'), [{ transform: 'scale(1)' }, { transform: 'scale(1.15,.85)' }, { transform: 'scale(.95,1.05)' }, { transform: 'scale(1)' }], 450);
    const cc = centerOf(c);
    for (let i = 0; i < 9; i++) {
      const g = el('g', { transform: `translate(${cc.x + rand(-80, 80)},${cc.y + 30})` }, layer.fx);
      const d = el('path', { d: 'M0 -12 Q8 0 0 6 Q-8 0 0 -12Z', fill: '#5ab8f0' }, g);
      const a = anim(d, [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${rand(180, 300)}px)`, opacity: 0 }], rand(600, 900), { delay: i * 60, fill: 'backwards', easing: 'ease-in' });
      if (a) a.onfinish = () => g.remove();
    }
  }
  const stars = $('#stars');
  for (let i = 0; i < 32; i++) {
    const g = el('g', { transform: `translate(${rand(20, 1580).toFixed(0)},${rand(20, 440).toFixed(0)})` }, stars);
    const p = el('path', { d: starPath(rand(6, 12), 4), fill: '#fff6c8', class: 'star' }, g);
    p.style.animationDelay = rand(0, 2.4).toFixed(2) + 's';
  }
  function setNight(on) {
    svg.classList.toggle('night', on);
    Sound.play(on ? 'night' : 'day');
    Sound.setMood(on ? 'night' : 'day');
    sparkles(1290, 170, { n: 14, colors: on ? ['#fff6c8', '#fff'] : ['#ffd93b', '#fff'], spread: 160 });
    setTimeout(() => talk('frog', FROG.bubble.x, FROG.bubble.y, on ? 'Good night!' : 'Good morning!'), 500);
  }

  /* ---------- input: tap things, drag stickers ---------- */
  const drags = new Map();
  let lastInput = performance.now(), hints = 0;

  svg.addEventListener('pointerdown', e => {
    lastInput = performance.now(); hints = 0;
    const hit = e.target.closest('[data-act]');
    if (!hit) return;
    const act = hit.dataset.act;
    const p = toSvg(e.clientX, e.clientY);
    if (act === 'sticker') {
      const s = hit.__s;
      if (!s || s.locked || s.held) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      s.held = true;
      s.el.classList.add('held');
      layer.stickers.appendChild(s.el);
      drags.set(e.pointerId, { s, ox: p.x - s.x, oy: p.y - s.y, cx: e.clientX, cy: e.clientY, t: performance.now(), moved: false, trail: 0 });
      Sound.play('pop');
      return;
    }
    if (act === 'belly' || act === 'frog') tapBelly();
    else if (act === 'frog-head') tapHead();
    else if (act === 'flower') tapFlower(hit);
    else if (act === 'cow') tapCow();
    else if (act === 'pond') tapPond(p);
    else if (act === 'cloud') tapCloud(hit);
    else if (act === 'sun') { anim(hit.querySelector('.anim'), [{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.2) rotate(90deg)' }, { transform: 'scale(0) rotate(180deg)' }], 700); setNight(true); }
    else if (act === 'moon') { anim(hit.querySelector('.anim'), [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(0)' }], 700); setNight(false); }
  });

  svg.addEventListener('pointermove', e => {
    const d = drags.get(e.pointerId);
    if (!d) return;
    lastInput = performance.now();
    if (!d.moved && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 12) d.moved = true;
    if (!d.moved) return;
    const p = toSvg(e.clientX, e.clientY), vb = visibleBox(30), s = d.s;
    s.x = clamp(p.x - d.ox, vb.x0, vb.x1);
    s.y = clamp(p.y - d.oy, vb.y0, vb.y1);
    setPos(s);
    lookAt(s.x, s.y);
    mouth('eager', nearFrog(s));
    if (s.kind === 'wand') {
      const tip = wandTip(s);
      if (performance.now() - d.trail > 70) { d.trail = performance.now(); sparkles(tip.x, tip.y, { n: 2, colors: RAINBOW, spread: 40, size: 9, dur: 600 }); }
    }
  });

  function endDrag(e) {
    const d = drags.get(e.pointerId);
    if (!d) return;
    drags.delete(e.pointerId);
    const s = d.s;
    s.held = false;
    s.el.classList.remove('held');
    mouth('eager', false);
    if (!s.el.isConnected) return;
    if (!d.moved) { BUG_TAP[s.type](s); return; }
    if (nearFrog(s) && !frogBusy) { eat(s); return; }  // the frog eats anything, wands too
    const other = stickerUnder(s);
    if (s.kind === 'bug') {
      if (other) { stickerMeet(s, other); return; }
      if (overCow(s)) { milkBath(s); return; }
      Sound.play('land');
      anim(s.anim, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.15,.85)' }, { transform: 'scale(1,1)' }], 250);
    } else {
      const tip = wandTip(s);
      const t = wandTargetAt([tip, { x: s.x, y: s.y }], s.el);
      if (t) applyWand(t, tip);
      else { Sound.play('swish'); sparkles(tip.x, tip.y, { n: 8, colors: RAINBOW }); }
    }
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);


  /* ---------- little bits of life ---------- */
  setInterval(() => {
    const idle = stickers.filter(s => !s.held && !s.locked);
    if (idle.length && Math.random() < 0.6) {
      const s = pick(idle);
      anim(s.anim, [{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], 500);
    }
    if (!drags.size && Math.random() < 0.4) {
      const s = pick(stickers);
      if (s) lookAt(s.x, s.y); else lookAt(FROG.head.x + rand(-200, 200), FROG.head.y + rand(-100, 200));
    }
  }, 2600);
  setInterval(() => {
    if (App.current !== 'frog' || performance.now() - lastInput < 12000 || hints >= 3 || frogBusy) return;
    lastInput = performance.now(); hints++;
    Sound.play('croak');
    anim(frogAnim, [{ transform: 'translateY(0)' }, { transform: 'translateY(-40px) scale(.97,1.04)' }, { transform: 'translateY(0) scale(1.05,.95)' }, { transform: 'translateY(0)' }], 650);
    anim(bellyGlow, [{ opacity: 0 }, { opacity: 0.5 }, { opacity: 0 }, { opacity: 0.5 }, { opacity: 0 }], 1600);
  }, 1000);

  App.register({
    id: 'frog',
    screen: svg,
    enter() { lastInput = performance.now(); hints = 0; Sound.setMood(svg.classList.contains('night') ? 'night' : 'day'); setTimeout(() => frogSays(['Hello, friend!', 'Ribbit! Tickle my tummy!']), 500); },
    leave() { drags.clear(); },
    clear() { [...stickers].forEach(s => removeSticker(s, true)); },
  });

  // a tiny hook so automated play-tests can drive the game
  window.__froggy = { spawnFromFrog, stickers, applyWand, frog, setNight, eat };
})();
