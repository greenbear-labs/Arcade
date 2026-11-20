/* Ice cream kitchen: pick a cone or cup, tap tubs to stack scoops, tap jars for toppings,
 * then drag the ice cream onto the penguin chef or a customer, who eats it and reacts
 * to what's in it. Nothing can go wrong: every tap adds something or makes someone giggle. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const svg = $('#icecream');
  const layer = { build: $('#ic-buildLayer'), fx: $('#ic-fx'), bubbles: $('#ic-bubbles') };
  const K = Kit(svg, layer);
  const { el, anim, toSvg, toClient, tween, sparkles, rings, bubble, talk, rand, pick, lerp, wait, starPath } = K;

  const SPOT = { x: 800, y: 560 };
  const MAX_SCOOPS = 7, SCOOP_GAP = 70;
  const RAINBOW = ['#ff6b8b', '#ffa53b', '#ffe14d', '#7ee07a', '#6cb6ff', '#b98bff'];
  const SPRINKLES = ['#ff5c8a', '#ffd93b', '#6cb6ff', '#7ee07a', '#b98bff', '#fff'];

  const FLAVORS = {
    strawberry: { name: 'Strawberry!', main: '#ff8fb3', dark: '#e0628c' },
    chocolate: { name: 'Chocolate!', main: '#8b5a3c', dark: '#5e3a24' },
    vanilla: { name: 'Vanilla!', main: '#fff3c4', dark: '#dcc37a' },
    mint: { name: 'Mint!', main: '#9ee6c4', dark: '#55b98b' },
    blueberry: { name: 'Blueberry!', main: '#9db1ff', dark: '#5b72d6' },
    rainbow: { name: 'Rainbow!', main: 'url(#ic-rainbow)', dark: '#a26be6' },
    swirl: { name: 'Swirly!', main: '#fff3c4', dark: '#dcc37a' },
    chocochip: { name: 'Chocolate chip!', main: '#fff7e2', dark: '#d9c28c' },
    bubblegum: { name: 'Bubblegum!', main: '#8fdcff', dark: '#45a8d6' },
    lemon: { name: 'Lemon!', main: '#fff176', dark: '#d9bf1f' },
    orange: { name: 'Orange!', main: '#ffb35c', dark: '#e07f22' },
    cookie: { name: 'Cookies and cream!', main: '#eeece8', dark: '#a8a29a' },
  };
  // there are more flavors and toppings than fit on the shelf, so each visit (and each ring
  // of the bell) shows a new handful
  const N_TUBS = 6, N_JARS = 5;
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);

  /* ---------- art ---------- */
  const BASE_ART = {
    cone: `<path d="M-60 -4 L0 152 L60 -4 Z" fill="#e8b46a" stroke="#c48a3c" stroke-width="5" stroke-linejoin="round"/>
      <path d="M-40 10 L18 110 M-14 6 L32 86 M14 6 L44 58 M40 10 L-18 110 M14 6 L-32 86 M-14 6 L-44 58" stroke="#cf9450" stroke-width="4" stroke-linecap="round"/>
      <rect x="-66" y="-12" width="132" height="22" rx="11" fill="#efc27e" stroke="#c48a3c" stroke-width="5"/>`,
    choco: `<path d="M-60 -4 L0 152 L60 -4 Z" fill="#e8b46a" stroke="#c48a3c" stroke-width="5" stroke-linejoin="round"/>
      <path d="M-40 10 L18 110 M-14 6 L32 86 M14 6 L44 58 M40 10 L-18 110 M14 6 L-32 86 M-14 6 L-44 58" stroke="#cf9450" stroke-width="4" stroke-linecap="round"/>
      <path d="M-64 -10 L64 -10 L52 30 Q40 44 30 30 Q18 50 4 32 Q-10 48 -22 30 Q-34 44 -46 28 Z" fill="#6b3a22" stroke="#4a2614" stroke-width="4" stroke-linejoin="round"/>
      <g fill="#fff"><rect x="-30" y="0" width="8" height="3" rx="1.5" transform="rotate(30 -26 2)"/><rect x="10" y="6" width="8" height="3" rx="1.5" fill="#ffd93b"/><rect x="34" y="-2" width="8" height="3" rx="1.5" fill="#ff5c8a" transform="rotate(-25 38 0)"/></g>`,
    cup: `<path d="M-72 -6 L-54 104 L54 104 L72 -6 Z" fill="#7ec8ff" stroke="#3f97d6" stroke-width="5" stroke-linejoin="round"/>
      <path d="M-62 30 L62 30 M-58 62 L58 62" stroke="#fff" stroke-width="10" opacity=".8"/>
      <rect x="-80" y="-14" width="160" height="20" rx="10" fill="#a6dbff" stroke="#3f97d6" stroke-width="5"/>`,
  };
  function scoopArt(f) {
    const F = FLAVORS[f];
    let s = `<path d="M-60 6 Q-64 -60 0 -62 Q64 -60 60 6 Q52 26 44 12 Q36 30 24 14 Q12 30 0 14 Q-12 30 -24 14 Q-36 30 -44 12 Q-52 26 -60 6Z" fill="${F.main}" stroke="${F.dark}" stroke-width="5" stroke-linejoin="round"/>
      <ellipse cx="-24" cy="-32" rx="16" ry="9" fill="#fff" opacity=".45" transform="rotate(-25 -24 -32)"/>`;
    if (f === 'mint') s += '<g fill="#4a2f22"><ellipse cx="14" cy="-30" rx="6" ry="4"/><ellipse cx="-10" cy="-6" rx="5" ry="3.5"/><ellipse cx="32" cy="-4" rx="6" ry="4"/><ellipse cx="-36" cy="-14" rx="4" ry="3"/></g>';
    if (f === 'chocolate') s += '<g fill="#5e3a24"><circle cx="18" cy="-28" r="4"/><circle cx="-8" cy="-10" r="3.5"/><circle cx="34" cy="-8" r="3"/></g>';
    if (f === 'strawberry') s += '<g fill="#e0628c"><ellipse cx="16" cy="-26" rx="5" ry="3"/><ellipse cx="-12" cy="-8" rx="4" ry="2.5"/><ellipse cx="34" cy="-6" rx="4" ry="2.5"/></g>';
    if (f === 'blueberry') s += '<g fill="#3d4fb0"><circle cx="16" cy="-26" r="6"/><circle cx="-12" cy="-6" r="5"/><circle cx="36" cy="-6" r="5"/></g>';
    if (f === 'swirl') s += '<path d="M-46 -4 Q-40 -46 -4 -48 Q30 -48 30 -22 Q28 -2 4 -6 Q-14 -10 -8 -26" fill="none" stroke="#8b5a3c" stroke-width="8" stroke-linecap="round"/><path d="M-30 6 Q-24 -28 6 -32 Q22 -32 22 -20" fill="none" stroke="#ff8fb3" stroke-width="7" stroke-linecap="round"/>';
    if (f === 'chocochip') s += '<g fill="#5e3a24"><path d="M14 -36 l5 8 h-10z"/><path d="M-14 -16 l5 8 h-10z"/><path d="M32 -10 l5 8 h-10z"/><path d="M-36 -2 l5 8 h-10z"/><path d="M0 -2 l5 8 h-10z"/><path d="M-26 -38 l5 8 h-10z"/></g>';
    if (f === 'bubblegum') s += '<g><circle cx="16" cy="-28" r="6" fill="#ff8fc8"/><circle cx="-12" cy="-8" r="5" fill="#ffd93b"/><circle cx="34" cy="-6" r="5" fill="#ff8fc8"/><circle cx="-36" cy="-16" r="4" fill="#7ee07a"/></g>';
    if (f === 'lemon') s += '<g fill="#fffbd0"><circle cx="16" cy="-28" r="4"/><circle cx="-14" cy="-10" r="3"/><circle cx="34" cy="-8" r="3"/></g>';
    if (f === 'orange') s += '<g fill="#fff0d9"><circle cx="16" cy="-28" r="4"/><circle cx="-14" cy="-10" r="3"/><circle cx="34" cy="-8" r="3"/></g>';
    if (f === 'cookie') s += '<g fill="#3a3330"><rect x="10" y="-34" width="12" height="9" rx="3" transform="rotate(20 16 -30)"/><rect x="-20" y="-14" width="11" height="8" rx="3"/><rect x="28" y="-12" width="10" height="8" rx="3" transform="rotate(-25 33 -8)"/><rect x="-40" y="-4" width="9" height="7" rx="3"/></g>';
    if (f === 'rainbow') s += `<g><path d="${starPath(9, 4)}" fill="#fff" transform="translate(18 -28)"/><path d="${starPath(7, 3)}" fill="#fff" transform="translate(-12 -6)"/></g>`;
    return s;
  }

  // tubs of ice cream in the freezer case
  const tubs = $('#ic-tubs');
  function drawTub(f, i) {
    const F = FLAVORS[f];
    const g = el('g', { class: 'tap', 'data-act': 'tub', 'data-flavor': f, transform: `translate(${305 + i * 120},208)` }, tubs);
    const a = el('g', { class: 'anim' }, g);
    a.innerHTML = `<ellipse cy="-28" rx="50" ry="13" fill="${F.dark}"/>
      <path d="M-46 -26 Q-42 -64 -14 -56 Q0 -78 16 -58 Q44 -66 46 -26 Z" fill="${F.main}" stroke="${F.dark}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-50 -28 L-42 48 Q0 56 42 48 L50 -28 Z" fill="#fff" stroke="#c9d3e0" stroke-width="4" stroke-linejoin="round"/>
      <rect x="-46" y="-4" width="92" height="24" rx="6" fill="${F.main}" stroke="${F.dark}" stroke-width="3"/>
      <path d="M18 -52 L40 -86" stroke="#b7c3d3" stroke-width="8" stroke-linecap="round"/><ellipse cx="42" cy="-90" rx="12" ry="8" fill="#d5dde8" transform="rotate(-55 42 -90)"/>`;
    // a little peek of what's inside, on the tub's label
    const peek = el('g', { transform: 'translate(0,8) scale(.32)' }, a);
    peek.innerHTML = scoopArt(f);
    return g;
  }

  // topping jars on the shelf
  const JARS = {
    sprinkles: `<rect x="-30" y="-44" width="60" height="84" rx="12" fill="#f4fbff" stroke="#9fc3d6" stroke-width="4"/>
      <rect x="-32" y="-56" width="64" height="18" rx="6" fill="#ff8fb3" stroke="#e0628c" stroke-width="3"/>
      ${Array.from({ length: 16 }, (_, i) => `<rect x="${-20 + (i * 13) % 40}" y="${-30 + Math.floor(i / 4) * 16 + (i % 2) * 5}" width="10" height="4" rx="2" fill="${SPRINKLES[i % 5]}" transform="rotate(${(i * 47) % 180} ${-15 + (i * 13) % 40} ${-28 + Math.floor(i / 4) * 16})"/>`).join('')}`,
    cherry: `<path d="M-38 6 Q-38 40 0 40 Q38 40 38 6 Z" fill="#ffd2dc" stroke="#e08aa0" stroke-width="4"/>
      <path d="M-16 -6 Q-14 -40 4 -50 M14 -4 Q10 -36 4 -50" stroke="#3d9a2f" stroke-width="4" fill="none"/>
      <circle cx="-16" cy="2" r="16" fill="#e3263b"/><circle cx="14" cy="4" r="16" fill="#e3263b"/><circle cx="-20" cy="-3" r="4" fill="#fff" opacity=".7"/><circle cx="10" cy="-1" r="4" fill="#fff" opacity=".7"/>`,
    sauce: `<path d="M-22 -30 L22 -30 L26 40 Q0 48 -26 40 Z" fill="#6b3a22" stroke="#4a2614" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-12 -30 L-6 -56 L6 -56 L12 -30 Z" fill="#fff" stroke="#c9d3e0" stroke-width="3"/><rect x="-3" y="-70" width="6" height="16" rx="3" fill="#fff" stroke="#c9d3e0" stroke-width="2"/>
      <rect x="-18" y="-6" width="36" height="20" rx="4" fill="#ffd93b"/>`,
    cream: `<rect x="-24" y="-30" width="48" height="72" rx="10" fill="#e9f3ff" stroke="#7aa7d6" stroke-width="4"/>
      <rect x="-24" y="2" width="48" height="16" fill="#7aa7d6"/>
      <path d="M-10 -30 L-6 -48 L6 -48 L10 -30 Z" fill="#d0d7e2" stroke="#9aa6b8" stroke-width="3"/>
      <path d="M-6 -48 Q-10 -62 0 -66 Q12 -62 6 -50" fill="#fff" stroke="#d8dbe6" stroke-width="3"/>`,
    stars: `<rect x="-30" y="-44" width="60" height="84" rx="12" fill="#f4fbff" stroke="#9fc3d6" stroke-width="4"/>
      <rect x="-32" y="-56" width="64" height="18" rx="6" fill="#ffd93b" stroke="#e0a800" stroke-width="3"/>
      <path d="${starPath(10, 4.5)}" fill="#ffd93b" transform="translate(-12 -18)"/><path d="${starPath(9, 4)}" fill="#b98bff" transform="translate(12 -4)"/>
      <path d="${starPath(9, 4)}" fill="#6cb6ff" transform="translate(-10 18)"/><path d="${starPath(10, 4.5)}" fill="#ff8fb3" transform="translate(14 24)"/>`,
  };
  const jar = (lid, lidDark, inside) => `<rect x="-30" y="-44" width="60" height="84" rx="12" fill="#f4fbff" stroke="#9fc3d6" stroke-width="4"/>
      <rect x="-32" y="-56" width="64" height="18" rx="6" fill="${lid}" stroke="${lidDark}" stroke-width="3"/>${inside}`;
  const bear = (x, y, c, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"><circle cx="-5" cy="-13" r="3.5"/><circle cx="5" cy="-13" r="3.5"/><circle cy="-8" r="6.5"/><ellipse cy="5" rx="8" ry="9"/><circle cx="-8" cy="12" r="3.5"/><circle cx="8" cy="12" r="3.5"/></g>`;
  const chip = (x, y, r = 0) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 -7 Q4 0 6 5 Q0 8 -6 5 Q-4 0 0 -7Z" fill="#5e3a24"/>`;
  const floret = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 0 L-8 26 L8 26 L6 0Z" fill="#9fd67a" stroke="#5f9e3a" stroke-width="3"/><g fill="#4f9e35" stroke="#3a7d24" stroke-width="3"><circle cx="-14" cy="-4" r="11"/><circle cx="14" cy="-4" r="11"/><circle cy="-14" r="13"/><circle cx="-6" cy="2" r="9"/><circle cx="6" cy="2" r="9"/></g></g>`;
  const slice = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="11" fill="#fff6c2" stroke="#e8d070" stroke-width="3"/><g fill="#c9a94a"><circle cx="-3" cy="-2" r="1.6"/><circle cx="3" cy="-2" r="1.6"/><circle cy="3" r="1.6"/></g></g>`;
  const mallow = (x, y, c, r = 0) => `<rect transform="translate(${x} ${y}) rotate(${r})" x="-8" y="-6" width="16" height="12" rx="5" fill="${c}" stroke="#e3d6e8" stroke-width="2"/>`;
  Object.assign(JARS, {
    gummy: jar('#7ee07a', '#4fb84b', bear(-12, -18, '#ff5c6c') + bear(12, -14, '#ffd93b') + bear(-10, 16, '#7ee07a') + bear(14, 18, '#ffa53b')),
    chips: jar('#8b5a3c', '#5e3a24', [[-14, -24], [8, -28], [16, -8], [-6, -4], [-16, 14], [8, 16], [18, 28], [-4, 30]].map(([x, y], i) => chip(x, y, i * 40)).join('')),
    broccoli: `<path d="M-40 10 Q-40 42 0 42 Q40 42 40 10 Z" fill="#ffe7c2" stroke="#e0b07a" stroke-width="4"/>${floret(-14, -12, 1.05)}${floret(16, -4, 0.9)}`,
    banana: `<path d="M-40 10 Q-40 42 0 42 Q40 42 40 10 Z" fill="#cfe9ff" stroke="#7aa7d6" stroke-width="4"/>${slice(-18, 2)}${slice(4, -2)}${slice(24, 4)}${slice(-6, -16)}${slice(14, -18)}`,
    mallow: jar('#ffc4e0', '#e08ab3', mallow(-12, -24, '#fff', 20) + mallow(10, -18, '#ffd6ea', -15) + mallow(-10, 0, '#ffd6ea', 5) + mallow(12, 4, '#fff', 30) + mallow(-12, 24, '#fff', -20) + mallow(10, 26, '#ffd6ea')),
  });
  const jars = $('#ic-jars');
  function drawJar(k, i) {
    const g = el('g', { class: 'tap', 'data-act': 'topping', 'data-top': k, transform: `translate(${1020 + i * 90},204)` }, jars);
    el('g', { class: 'anim' }, g).innerHTML = JARS[k];
    return g;
  }
  let menu = { flavors: [], tops: [] };
  function newMenu(animate) {
    // always something new: at least half of the shelf changes, and a rainbow tub shows up often
    const pickSome = (all, n, old) => {
      const fresh = shuffle(all.filter(k => !old.includes(k))), kept = shuffle(old);
      const out = fresh.slice(0, Math.max(Math.ceil(n / 2), n - kept.length));
      return shuffle(out.concat(kept.slice(0, n - out.length)));
    };
    menu = { flavors: pickSome(Object.keys(FLAVORS), N_TUBS, menu.flavors), tops: pickSome(Object.keys(JARS), N_JARS, menu.tops) };
    const old = [...tubs.children, ...jars.children];
    const show = () => {
      old.forEach(n => n.remove());
      const fresh = menu.flavors.map(drawTub).concat(menu.tops.map(drawJar));
      if (animate) fresh.forEach((g, i) => anim(g.querySelector('.anim'), [{ transform: 'translateY(-60px) scale(.4)', opacity: 0 }, { transform: 'translateY(6px) scale(1.08)', opacity: 1 }, { transform: 'scale(1)' }], 380, { delay: i * 45, fill: 'backwards', easing: 'ease-out' }));
    };
    if (!animate || !old.length) return show();
    old.forEach((g, i) => anim(g.querySelector('.anim'), [{ transform: 'scale(1)', opacity: 1 }, { transform: 'translateY(30px) scale(.3)', opacity: 0 }], 220, { delay: i * 20, fill: 'forwards' }));
    setTimeout(show, 260 + old.length * 20);
  }
  newMenu(false);
  document.querySelectorAll('.base-art').forEach(g => { g.innerHTML = BASE_ART[g.dataset.art]; });

  function toppingArt(kind, item) {
    // drawn on top of a scoop (top edge at y -60) or a cone/cup rim (y 0)
    const top = item.isBase ? 0 : -60, w = item.isBase ? 56 : 46;
    if (kind === 'sprinkles') {
      let s = '';
      for (let i = 0; i < 16; i++) {
        const x = rand(-w, w), y = top + rand(4, 30) + Math.abs(x) * 0.35;
        s += `<rect x="${(x - 5).toFixed(1)}" y="${(y - 2).toFixed(1)}" width="11" height="4.5" rx="2.2" fill="${pick(SPRINKLES)}" transform="rotate(${rand(0, 180).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      }
      return s;
    }
    if (kind === 'stars') {
      let s = '';
      for (let i = 0; i < 6; i++) s += `<path d="${starPath(9, 4)}" fill="${pick(['#ffd93b', '#fff', '#b98bff', '#6cb6ff'])}" transform="translate(${rand(-w, w).toFixed(0)} ${(top + rand(6, 32)).toFixed(0)}) rotate(${rand(0, 70).toFixed(0)})"/>`;
      return s;
    }
    if (kind === 'cherry') {
      const x = rand(-14, 14), y = top - 12;
      return `<g transform="translate(${x.toFixed(0)} ${y})"><path d="M0 -14 Q4 -34 18 -40" stroke="#3d9a2f" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle r="18" fill="#e3263b" stroke="#a8182a" stroke-width="3"/><circle cx="-6" cy="-6" r="5" fill="#fff" opacity=".7"/></g>`;
    }
    if (kind === 'sauce') {
      return `<path transform="translate(0 ${top + 52}) scale(${item.isBase ? 1.1 : 1})" d="M-58 -10 Q-60 -60 0 -62 Q60 -60 58 -10 Q52 10 46 -6 Q42 26 32 -4 Q22 12 12 -6 Q2 34 -8 -6 Q-20 14 -30 -4 Q-40 24 -46 -6 Q-54 8 -58 -10Z" fill="#5b2f1a" opacity=".93"/>
        <ellipse cx="-20" cy="${top + 8}" rx="12" ry="5" fill="#fff" opacity=".3"/>`;
    }
    if (kind === 'gummy') {
      let s = '';
      for (let i = 0; i < 4; i++) s += bear(rand(-w, w).toFixed(0), (top + rand(2, 26)).toFixed(0), pick(['#ff5c6c', '#ffd93b', '#7ee07a', '#ffa53b']), 1.3);
      return s;
    }
    if (kind === 'chips') {
      let s = '';
      for (let i = 0; i < 10; i++) s += chip(rand(-w, w).toFixed(0), (top + rand(4, 32)).toFixed(0), rand(-40, 40).toFixed(0));
      return s;
    }
    if (kind === 'broccoli') return floret(rand(-10, 10).toFixed(0), top - 22, 1.4);
    if (kind === 'banana') {
      let s = '';
      for (let i = 0; i < 4; i++) s += slice(rand(-w, w).toFixed(0), (top + rand(2, 24)).toFixed(0), 1.3);
      return s;
    }
    if (kind === 'mallow') {
      let s = '';
      for (let i = 0; i < 6; i++) s += mallow(rand(-w, w).toFixed(0), (top + rand(4, 28)).toFixed(0), pick(['#fff', '#ffd6ea']), rand(-30, 30).toFixed(0));
      return s;
    }
    if (kind === 'cream') {
      return `<g transform="translate(0 ${top + 4})" fill="#fff" stroke="#e1e3ee" stroke-width="3">
        <ellipse cy="-4" rx="48" ry="18"/><ellipse cy="-22" rx="36" ry="15"/><ellipse cy="-38" rx="22" ry="11"/><path d="M-8 -46 Q0 -64 10 -48"/></g>`;
    }
    return '';
  }

  /* ---------- the ice cream being built ---------- */
  const root = el('g', { class: 'build', 'data-act': 'build', transform: `translate(${SPOT.x},${SPOT.y})` }, layer.build);
  const wob = el('g', { class: 'wob' }, root);
  const baseG = el('g', {}, wob);
  const baseTops = el('g', {}, wob);
  const stackG = el('g', {}, wob);
  const build = { base: null, scoops: [], tops: [], x: SPOT.x, y: SPOT.y, scale: 1, busy: false };
  function place() { root.setAttribute('transform', `translate(${build.x.toFixed(1)},${build.y.toFixed(1)}) scale(${build.scale.toFixed(3)})`); }
  const scoopY = i => -40 - i * SCOOP_GAP;
  const topItem = () => build.scoops.length ? build.scoops[build.scoops.length - 1] : { isBase: true, tops: baseTops };
  const topY = () => build.scoops.length ? scoopY(build.scoops.length - 1) : 0;

  function wobble(strength) {
    const a = 2 + build.scoops.length * 1.6 * (strength || 1);
    anim(wob, [0, 1, 2, 3, 4, 5].map(k => ({ transform: `rotate(${k === 0 || k === 5 ? 0 : (k % 2 ? a : -a) * (1 - k / 6)}deg)` })), 700, { easing: 'ease-in-out' });
  }
  function setBase(type, fromEl) {
    const had = build.base;
    build.base = type;
    baseG.innerHTML = BASE_ART[type];
    Sound.play(had ? 'swish' : 'pop');
    anim(baseG, [{ transform: 'translateY(-40px) scale(.6)' }, { transform: 'translateY(6px) scale(1.08,.92)' }, { transform: 'scale(1)' }], 380);
    if (fromEl) anim(fromEl.querySelector('.anim'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-26px)' }, { transform: 'translateY(0)' }], 350);
    sparkles(SPOT.x, SPOT.y + 20, { n: 6, colors: ['#fff', '#ffd93b'], spread: 90, size: 11 });
  }

  let lastName = 0;
  async function addScoop(flavor, tubEl) {
    anim(tubEl.querySelector('.anim'), [{ transform: 'scale(1)' }, { transform: 'scale(1.1,.9)' }, { transform: 'scale(.95,1.05)' }, { transform: 'scale(1)' }], 350);
    if (build.busy) return;
    if (!build.base) setBase('cone');
    if (build.scoops.length >= MAX_SCOOPS) {
      Sound.play('boing'); wobble(2);
      talk('chef', 610, 250, 'Too tall! Feed someone!', { pitch: 1.5 });
      return;
    }
    Sound.play('scoop');
    if (performance.now() - lastName > 900) { lastName = performance.now(); App.Voice.say(FLAVORS[flavor].name, { pitch: 1.6, rate: 1.1 }); }
    const i = build.scoops.length;
    const item = { flavor, isBase: false, tops: null, g: null };
    build.scoops.push(item);
    // fly a scoop from the tub to the top of the stack
    const fly = el('g', {}, layer.fx);
    const flyArt = el('g', {}, fly); flyArt.innerHTML = scoopArt(flavor);
    const from = { x: +tubEl.transform.baseVal[0].matrix.e, y: 170 };
    const to = { x: build.x, y: build.y + scoopY(i) * build.scale };
    await tween(420, t => {
      const x = lerp(from.x, to.x, t), y = lerp(from.y, to.y, t) - Math.sin(Math.PI * t) * 160;
      fly.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${lerp(0.5, build.scale, t).toFixed(3)})`);
    });
    fly.remove();
    if (!build.scoops.includes(item)) return; // eaten or cleared while flying
    const g = el('g', { transform: `translate(0,${scoopY(i)})` }, stackG);
    const a = el('g', { class: 'anim' }, g);
    a.innerHTML = scoopArt(flavor);
    item.g = g; item.tops = el('g', {}, a);
    Sound.play('plop');
    anim(a, [{ transform: 'scale(1.25,.7)' }, { transform: 'scale(.92,1.1)' }, { transform: 'scale(1)' }], 380);
    wobble();
    if (flavor === 'rainbow') sparkles(to.x, to.y, { n: 14, colors: RAINBOW, spread: 120 });
  }

  const TOP_SOUND = { sprinkles: 'shake', stars: 'sparkle', cherry: 'plop', sauce: 'drizzle', cream: 'spray', gummy: 'boing', chips: 'shake', broccoli: 'boink', banana: 'plop', mallow: 'squeak' };
  const TOP_NAME = { gummy: 'Gummy bears!', chips: 'Chocolate chips!', broccoli: 'Broccoli?!', banana: 'Banana!', mallow: 'Marshmallows!' };
  function addTopping(kind, jarEl) {
    anim(jarEl.querySelector('.anim'), [0, 1, 2, 3, 4].map(k => ({ transform: `rotate(${k === 0 || k === 4 ? 0 : (k % 2 ? 16 : -16)}deg) translateY(${k % 2 ? -10 : 0}px)` })), 450);
    if (build.busy) return;
    if (!build.base) setBase('cone');
    const item = topItem();
    if (!item.tops) return; // that scoop is still flying in
    Sound.play(TOP_SOUND[kind]);
    const g = el('g', {}, item.tops);
    g.innerHTML = toppingArt(kind, item);
    anim(g, [{ transform: 'translateY(-160px)', opacity: 0 }, { transform: 'translateY(6px)', opacity: 1, offset: 0.75 }, { transform: 'translateY(0)' }], 420, { easing: 'ease-in' });
    build.tops.push(kind);
    if (TOP_NAME[kind] && performance.now() - lastName > 900) { lastName = performance.now(); App.Voice.say(TOP_NAME[kind], { pitch: 1.6, rate: 1.1 }); }
    setTimeout(() => wobble(0.6), 380);
    if (kind === 'stars' || kind === 'sprinkles') sparkles(build.x, build.y + (topY() - 50) * build.scale, { n: 6, colors: SPRINKLES, spread: 80, size: 10 });
  }

  function clearBuild() {
    build.base = null; build.scoops = []; build.tops = [];
    baseG.innerHTML = ''; baseTops.innerHTML = ''; stackG.innerHTML = '';
    build.x = SPOT.x; build.y = SPOT.y; build.scale = 1; place();
  }

  /* ---------- the eaters ---------- */
  const EATERS = {
    penguin: { el: $('#ic-penguin'), mouth: { x: 610, y: 418 }, talk: { x: 610, y: 250 }, fav: 'mint', voice: { pitch: 1.5, rate: 1.05 }, sound: 'honk',
      hello: ["Let's make ice cream!", 'Pick a cone!', 'Scoop scoop!', 'I love mint!'] },
    walrus: { el: $('#ic-walrus'), mouth: { x: 1255, y: 700 }, talk: { x: 1280, y: 470 }, fav: 'chocolate', voice: { pitch: 0.5, rate: 0.8 }, sound: 'grunt',
      hello: ['Ice cream, please!', 'I am so hungry!', 'Big scoops for me!', 'Chocolate, please!'] },
    cub: { el: $('#ic-cub'), mouth: { x: 985, y: 731 }, talk: { x: 985, y: 560 }, fav: 'strawberry', voice: { pitch: 2, rate: 1.15 }, sound: 'squeak',
      hello: ['Me! Me!', 'Pink is my favorite!', 'Hee hee!', 'Yummy time?'] },
    puffin: { el: $('#ic-puffin'), mouth: { x: 1100, y: 482 }, talk: { x: 1100, y: 370 }, fav: 'blueberry', voice: { pitch: 1.9, rate: 1.25 }, sound: 'chirp',
      hello: ['Squawk!', 'Blueberry, please!', 'Tweet tweet!', 'Peep peep!'] },
  };
  for (const id in EATERS) EATERS[id].id = id;
  const eaterAnim = E => E.el.querySelector('.anim');

  /* ---------- guests come and go: after eating, a guest waves and walks off, and a new animal
   * of about the same size takes the spot. Each spot has its own set of guests. ---------- */
  const SLOTS = {
    puffin: { x: 1100, y: 560, mouth: -78, talk: -190 },
    cub: { x: 985, y: 900, mouth: -169, talk: -340 },
    walrus: { x: 1255, y: 905, mouth: -205, talk: -435 },
  };
  const GUESTS = {
    puffin: { slot: 'puffin', art: null, fav: 'blueberry', voice: { pitch: 1.9, rate: 1.25 }, sound: 'chirp', hello: ['Squawk!', 'Blueberry, please!', 'Tweet tweet!', 'Peep peep!'] },
    bunny: { slot: 'puffin', fav: 'swirl', voice: { pitch: 2, rate: 1.2 }, sound: 'squeak', hello: ['Hop hop!', 'Hello! I am a bunny!', 'Swirly, please!', 'Yummy?'],
      art: `<ellipse cx="-14" cy="-148" rx="11" ry="34" fill="#fff" stroke="#d6cfe0" stroke-width="4" transform="rotate(-10 -14 -148)"/><ellipse cx="14" cy="-148" rx="11" ry="34" fill="#fff" stroke="#d6cfe0" stroke-width="4" transform="rotate(10 14 -148)"/>
        <ellipse cx="-14" cy="-148" rx="5" ry="24" fill="#ffc2d6" transform="rotate(-10 -14 -148)"/><ellipse cx="14" cy="-148" rx="5" ry="24" fill="#ffc2d6" transform="rotate(10 14 -148)"/>
        <ellipse cy="-40" rx="40" ry="42" fill="#fff" stroke="#d6cfe0" stroke-width="4"/><ellipse cx="-16" cy="-2" rx="14" ry="8" fill="#fff" stroke="#d6cfe0" stroke-width="4"/><ellipse cx="16" cy="-2" rx="14" ry="8" fill="#fff" stroke="#d6cfe0" stroke-width="4"/>
        <circle cy="-96" r="34" fill="#fff" stroke="#d6cfe0" stroke-width="4"/>
        <circle cx="-12" cy="-102" r="5" fill="#222"/><circle cx="12" cy="-102" r="5" fill="#222"/><circle cx="-24" cy="-88" r="7" fill="#ffb3c6" opacity=".7"/><circle cx="24" cy="-88" r="7" fill="#ffb3c6" opacity=".7"/>
        <path d="M-5 -92 L5 -92 L0 -86Z" fill="#ff7aa0"/>
        <path class="mouth-closed" d="M-8 -82 Q0 -76 8 -82" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse class="mouth-open" cy="-79" rx="8" ry="7" fill="#7a1d33"/>` },
    chick: { slot: 'puffin', fav: 'lemon', voice: { pitch: 2.1, rate: 1.3 }, sound: 'chirp', hello: ['Cheep cheep!', 'Lemon, please!', 'Peep!', 'I am little!'],
      art: `<path d="M-10 -2 l-6 6 M-10 -2 l0 8 M10 -2 l6 6 M10 -2 l0 8" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round"/>
        <ellipse cy="-48" rx="46" ry="46" fill="#ffe14d" stroke="#e8b400" stroke-width="4"/><path d="M-40 -50 Q-58 -44 -46 -24 Z M40 -50 Q58 -44 46 -24 Z" fill="#ffd21f" stroke="#e8b400" stroke-width="3"/>
        <path d="M-4 -96 Q0 -112 6 -96 M2 -96 Q10 -110 12 -94" stroke="#e8b400" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="-14" cy="-62" r="5" fill="#222"/><circle cx="14" cy="-62" r="5" fill="#222"/><circle cx="-26" cy="-48" r="7" fill="#ff9f7a" opacity=".6"/><circle cx="26" cy="-48" r="7" fill="#ff9f7a" opacity=".6"/>
        <path class="mouth-closed" d="M-10 -52 L10 -52 L0 -40Z" fill="#ff9f1c" stroke="#e07a00" stroke-width="3" stroke-linejoin="round"/>
        <g class="mouth-open"><path d="M-11 -56 L11 -56 L0 -50Z M-9 -44 L9 -44 L0 -34Z" fill="#ff9f1c" stroke="#e07a00" stroke-width="3" stroke-linejoin="round"/><ellipse cy="-47" rx="7" ry="3" fill="#7a1d33"/></g>` },
    cub: { slot: 'cub', art: null, fav: 'strawberry', voice: { pitch: 2, rate: 1.15 }, sound: 'squeak', hello: ['Me! Me!', 'Pink is my favorite!', 'Hee hee!', 'Yummy time?'] },
    fox: { slot: 'cub', fav: 'orange', voice: { pitch: 1.7, rate: 1.15 }, sound: 'squeak', hello: ['Hello! I am a fox!', 'Orange, please!', 'Yip yip!', 'Ice cream!'],
      art: `<ellipse cx="96" cy="-60" rx="56" ry="26" fill="#ff8a3d" stroke="#d9641f" stroke-width="5" transform="rotate(-30 96 -60)"/><ellipse cx="128" cy="-84" rx="20" ry="14" fill="#fff" transform="rotate(-30 128 -84)"/>
        <ellipse cy="-90" rx="90" ry="92" fill="#ff8a3d" stroke="#d9641f" stroke-width="5"/><ellipse cy="-66" rx="52" ry="58" fill="#fff4e8"/>
        <ellipse cx="-66" cy="-30" rx="28" ry="22" fill="#5a3a2a"/><ellipse cx="66" cy="-30" rx="28" ry="22" fill="#5a3a2a"/>
        <path d="M-70 -236 L-40 -300 L-14 -250Z M70 -236 L40 -300 L14 -250Z" fill="#ff8a3d" stroke="#d9641f" stroke-width="5" stroke-linejoin="round"/><path d="M-56 -248 L-40 -282 L-26 -254Z M56 -248 L40 -282 L26 -254Z" fill="#5a3a2a"/>
        <circle cy="-206" r="78" fill="#ff8a3d" stroke="#d9641f" stroke-width="5"/>
        <path d="M-64 -196 Q-40 -150 0 -150 Q40 -150 64 -196 Q40 -176 0 -180 Q-40 -176 -64 -196Z" fill="#fff4e8"/>
        <circle cx="-28" cy="-222" r="9" fill="#222"/><circle cx="28" cy="-222" r="9" fill="#222"/><circle cx="-25" cy="-225" r="3" fill="#fff"/><circle cx="31" cy="-225" r="3" fill="#fff"/>
        <ellipse cy="-190" rx="11" ry="8" fill="#222"/>
        <path class="mouth-closed" d="M-12 -176 Q0 -166 12 -176" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse class="mouth-open" cy="-171" rx="15" ry="11" fill="#7a1d33"/>` },
    panda: { slot: 'cub', fav: 'mint', voice: { pitch: 1.8, rate: 1.05 }, sound: 'squeak', hello: ['Hi! I am a panda!', 'Mint, please!', 'Munch munch!', 'Hee hee!'],
      art: `<ellipse cy="-92" rx="96" ry="96" fill="#fbfbff" stroke="#c9cde0" stroke-width="5"/><ellipse cx="-80" cy="-110" rx="26" ry="50" fill="#2b2b33" transform="rotate(20 -80 -110)"/><ellipse cx="80" cy="-110" rx="26" ry="50" fill="#2b2b33" transform="rotate(-20 80 -110)"/>
        <ellipse cx="-72" cy="-34" rx="30" ry="24" fill="#2b2b33"/><ellipse cx="72" cy="-34" rx="30" ry="24" fill="#2b2b33"/>
        <circle cx="-58" cy="-268" r="26" fill="#2b2b33"/><circle cx="58" cy="-268" r="26" fill="#2b2b33"/>
        <circle cy="-208" r="80" fill="#fbfbff" stroke="#c9cde0" stroke-width="5"/>
        <ellipse cx="-30" cy="-220" rx="20" ry="25" fill="#2b2b33" transform="rotate(25 -30 -220)"/><ellipse cx="30" cy="-220" rx="20" ry="25" fill="#2b2b33" transform="rotate(-25 30 -220)"/>
        <circle cx="-28" cy="-220" r="7" fill="#fff"/><circle cx="28" cy="-220" r="7" fill="#fff"/><circle cx="-27" cy="-219" r="4" fill="#222"/><circle cx="29" cy="-219" r="4" fill="#222"/>
        <circle cx="-56" cy="-188" r="11" fill="#ffb3c6" opacity=".7"/><circle cx="56" cy="-188" r="11" fill="#ffb3c6" opacity=".7"/>
        <ellipse cy="-194" rx="12" ry="8" fill="#333"/>
        <path class="mouth-closed" d="M-12 -176 Q0 -166 12 -176" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse class="mouth-open" cy="-171" rx="15" ry="11" fill="#7a1d33"/>` },
    walrus: { slot: 'walrus', art: null, fav: 'chocolate', voice: { pitch: 0.5, rate: 0.8 }, sound: 'grunt', hello: ['Ice cream, please!', 'I am so hungry!', 'Big scoops for me!', 'Chocolate, please!'] },
    hippo: { slot: 'walrus', fav: 'bubblegum', voice: { pitch: 0.7, rate: 0.85 }, sound: 'grunt', hello: ['Hello! I am a hippo!', 'Big bites!', 'Bubblegum, please!', 'So hungry!'],
      art: `<ellipse cx="-96" cy="-24" rx="40" ry="26" fill="#9a8fc4" stroke="#6f64a0" stroke-width="5"/><ellipse cx="96" cy="-24" rx="40" ry="26" fill="#9a8fc4" stroke="#6f64a0" stroke-width="5"/>
        <ellipse cy="-120" rx="150" ry="120" fill="#a99ed3" stroke="#6f64a0" stroke-width="5"/><ellipse cy="-100" rx="90" ry="72" fill="#c3b9e8"/>
        <circle cx="-62" cy="-330" r="18" fill="#a99ed3" stroke="#6f64a0" stroke-width="5"/><circle cx="62" cy="-330" r="18" fill="#a99ed3" stroke="#6f64a0" stroke-width="5"/>
        <ellipse cy="-280" rx="90" ry="64" fill="#a99ed3" stroke="#6f64a0" stroke-width="5"/>
        <circle cx="-36" cy="-300" r="11" fill="#222"/><circle cx="36" cy="-300" r="11" fill="#222"/><circle cx="-33" cy="-303" r="3.5" fill="#fff"/><circle cx="39" cy="-303" r="3.5" fill="#fff"/>
        <ellipse cy="-222" rx="104" ry="58" fill="#b8aee0" stroke="#6f64a0" stroke-width="5"/>
        <ellipse cx="-34" cy="-246" rx="9" ry="6" fill="#6f64a0"/><ellipse cx="34" cy="-246" rx="9" ry="6" fill="#6f64a0"/>
        <circle cx="-72" cy="-224" r="13" fill="#ff9fc0" opacity=".6"/><circle cx="72" cy="-224" r="13" fill="#ff9fc0" opacity=".6"/>
        <path class="mouth-closed" d="M-40 -210 Q0 -186 40 -210" stroke="#6f64a0" stroke-width="5" fill="none" stroke-linecap="round"/>
        <g class="mouth-open"><ellipse cy="-205" rx="34" ry="22" fill="#5a1a2a"/><rect x="-24" y="-226" width="12" height="14" rx="3" fill="#fff"/><rect x="12" y="-226" width="12" height="14" rx="3" fill="#fff"/></g>` },
    sheep: { slot: 'walrus', fav: 'vanilla', voice: { pitch: 1.1, rate: 0.9 }, sound: 'grunt', hello: ['Baaa!', 'Vanilla, please! Baaa!', 'Fluffy and hungry!', 'Baa baa!'],
      art: `<rect x="-90" y="-60" width="26" height="60" rx="10" fill="#4a4a55"/><rect x="64" y="-60" width="26" height="60" rx="10" fill="#4a4a55"/>
        <g fill="#fbfbff" stroke="#d8dbe6" stroke-width="5">${[[-110, -150, 60], [-60, -200, 62], [10, -214, 64], [80, -196, 60], [120, -140, 56], [90, -80, 58], [20, -62, 60], [-50, -70, 60], [-110, -96, 54], [0, -140, 90]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
        <ellipse cx="-74" cy="-288" rx="34" ry="16" fill="#4a4a55" transform="rotate(25 -74 -288)"/><ellipse cx="74" cy="-288" rx="34" ry="16" fill="#4a4a55" transform="rotate(-25 74 -288)"/>
        <ellipse cy="-250" rx="66" ry="78" fill="#4a4a55"/>
        <g fill="#fbfbff" stroke="#d8dbe6" stroke-width="4"><circle cx="-34" cy="-322" r="24"/><circle cx="0" cy="-334" r="26"/><circle cx="34" cy="-322" r="24"/></g>
        <circle cx="-26" cy="-268" r="12" fill="#fff"/><circle cx="26" cy="-268" r="12" fill="#fff"/><circle cx="-24" cy="-266" r="7" fill="#222"/><circle cx="28" cy="-266" r="7" fill="#222"/>
        <ellipse cx="-14" cy="-228" rx="5" ry="4" fill="#222"/><ellipse cx="14" cy="-228" rx="5" ry="4" fill="#222"/>
        <path class="mouth-closed" d="M-14 -212 Q0 -202 14 -212" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse class="mouth-open" cy="-206" rx="16" ry="12" fill="#7a1d33"/>` },
  };
  // the first guest in each spot is the one drawn in the page
  for (const id in SLOTS) {
    const S = SLOTS[id], E = EATERS[id];
    S.el = E.el; S.guest = id;
    GUESTS[id].art = eaterAnim(E).innerHTML;
    E.slot = id;
  }
  // an eater takes its look and voice from the guest standing in that spot
  function seat(slotId, guestId) {
    const S = SLOTS[slotId], G = GUESTS[guestId], E = EATERS[slotId];
    S.guest = guestId;
    eaterAnim(E).innerHTML = G.art;
    Object.assign(E, { fav: G.fav, voice: G.voice, sound: G.sound, hello: G.hello, guest: guestId,
      mouth: { x: S.x, y: S.y + S.mouth }, talk: { x: S.x, y: S.y + S.talk } });
  }
  async function swapGuest(E) {
    const S = SLOTS[E.slot];
    if (!S || E.away) return;
    E.away = true;
    const holder = E.el, a = eaterAnim(E);
    const wave = (n, h) => anim(a, Array.from({ length: n * 2 + 1 }, (_, k) => ({ transform: `translateY(${k % 2 ? -h : 0}px) rotate(${k % 2 ? 4 : 0}deg)` })), n * 300);
    // a happy wave, then hop hop hop off to the side
    say(E, pick(['Bye bye! Thank you!', 'Thank you! Bye!', 'Yum! Bye bye!']));
    await wait(1100);
    wave(4, 26);
    Sound.play('swish');
    await tween(1200, t => holder.setAttribute('transform', `translate(${(S.x + t * t * 700).toFixed(0)},${S.y})`));
    holder.style.display = 'none';
    const others = Object.keys(GUESTS).filter(g => GUESTS[g].slot === E.slot && g !== S.guest);
    seat(E.slot, pick(others));
    await wait(300);
    holder.style.display = '';
    wave(3, 22);
    Sound.play('pop');
    await tween(900, t => { const e = 1 - Math.pow(1 - t, 3); holder.setAttribute('transform', `translate(${(S.x + (1 - e) * 700).toFixed(0)},${S.y})`); });
    holder.setAttribute('transform', `translate(${S.x},${S.y})`);
    E.away = false;
    hop(E, 30);
    say(E, pick(E.hello));
  }
  function say(E, text) { talk(E.id, E.talk.x, E.talk.y, text, E.voice); }
  function hop(E, h) { anim(eaterAnim(E), [{ transform: 'translateY(0)' }, { transform: `translateY(${-(h || 30)}px) scale(.97,1.04)` }, { transform: 'translateY(0) scale(1.05,.95)' }, { transform: 'translateY(0)' }], 500); }
  function tapEater(E) {
    Sound.play(E.sound, 2);
    hop(E);
    if (E.id === 'penguin') E.el.querySelectorAll('.flipL,.flipR').forEach((f, i) => anim(f, [{ transform: 'rotate(0)' }, { transform: `rotate(${i ? -25 : 25}deg)` }, { transform: 'rotate(0)' }, { transform: `rotate(${i ? -25 : 25}deg)` }, { transform: 'rotate(0)' }], 700));
    if (performance.now() - App.Voice.last > 900) say(E, pick(E.hello));
  }
  function eaterAt(p) {
    const c = toClient(p.x, p.y);
    root.style.pointerEvents = 'none';
    try {
      for (const n of document.elementsFromPoint(c.x, c.y)) {
        const e = n.closest && n.closest('[data-eater]');
        if (e && !EATERS[e.dataset.eater].away) return EATERS[e.dataset.eater];
      }
    } finally { root.style.pointerEvents = ''; }
    let best = null, bd = 190;
    for (const id in EATERS) {
      const E = EATERS[id];
      if (E.away) continue;
      const d = Math.hypot(E.mouth.x - p.x, E.mouth.y - p.y);
      if (d < bd) { bd = d; best = E; }
    }
    return best;
  }

  async function serve(E) {
    build.busy = true;
    E.el.classList.add('open');
    const contents = {
      n: build.scoops.length, base: build.base,
      flavors: new Set(build.scoops.map(s => s.flavor)),
      tops: build.tops.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {}),
    };
    // bring the ice cream to the mouth, top first
    const s = 0.72;
    const x0 = build.x, y0 = build.y, s0 = build.scale;
    const tx = E.mouth.x, ty = () => E.mouth.y - topY() * s;
    let ty0 = ty();
    await tween(280, t => { build.x = lerp(x0, tx, t); build.y = lerp(y0, ty0, t); build.scale = lerp(s0, s, t); place(); });
    // munch the scoops one by one
    while (build.scoops.length) {
      const item = build.scoops.pop();
      Sound.play('chomp');
      sparkles(E.mouth.x, E.mouth.y, { n: 6, colors: [FLAVORS[item.flavor].main.startsWith('url') ? pick(RAINBOW) : FLAVORS[item.flavor].main, '#fff'], spread: 70, size: 9, shape: 'dot' });
      anim(eaterAnim(E), [{ transform: 'scale(1)' }, { transform: 'scale(1.04,.96)' }, { transform: 'scale(1)' }], 220);
      if (item.g) { const a = anim(item.g.firstChild, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.2)', opacity: 0 }], 200, { fill: 'forwards' }); const g = item.g; setTimeout(() => g.remove(), 210); }
      await wait(240);
      const yA = build.y; ty0 = ty();
      await tween(160, t => { build.y = lerp(yA, ty0, t); place(); });
    }
    // and the cone (the cup gets tossed away)
    if (build.base === 'cup') {
      Sound.play('toss');
      const yA = build.y, xA = build.x;
      await tween(500, t => { build.x = xA + t * 260; build.y = yA - Math.sin(Math.PI * t) * 200 + t * 120; build.scale = s * (1 - t * 0.8); place(); });
    } else {
      Sound.play('crunch');
      await tween(380, t => { build.scale = s * (1 - t); place(); });
    }
    clearBuild();
    E.el.classList.remove('open');
    Sound.play('gulp');
    react(E, contents);
    await wait(900);
    build.busy = false;
    hintBases();
    if (E.slot) setTimeout(() => swapGuest(E), 1600 + (contents.n >= 3 ? 1400 : 0));
  }

  function react(E, c) {
    const cx = E.mouth.x, cy = E.mouth.y;
    const hearts = n => sparkles(cx, cy - 60, { n, colors: ['#ff5c8a', '#ff8fb3', '#ffc2d6'], spread: 140, size: 16, shape: 'heart', dur: 1200, up: 40 });
    const sundae = c.tops.sauce && c.tops.cream && c.tops.cherry;
    if (c.n >= 5) {
      Sound.play('shiver');
      anim(eaterAnim(E), Array.from({ length: 11 }, (_, k) => ({ transform: `translateX(${k === 0 || k === 10 ? 0 : (k % 2 ? 8 : -8)}px)` })), 1100);
      sparkles(cx, cy - 80, { n: 18, colors: ['#bfe9ff', '#ffffff', '#8fd3ff'], spread: 170, size: 14, dur: 1300 });
      say(E, pick(['Brrrr! Brain freeze!', 'So cold! Brrr!', 'Whoa, so many scoops!']));
    } else if (c.flavors.has('rainbow')) {
      Sound.play('rainbow');
      rings(cx, cy - 40, RAINBOW, { scale: 9 });
      sparkles(cx, cy - 40, { n: 26, colors: RAINBOW, spread: 220, size: 16, dur: 1200 });
      anim(eaterAnim(E), [{ transform: 'rotate(0) translateY(0)' }, { transform: 'rotate(-8deg) translateY(-40px)' }, { transform: 'rotate(8deg) translateY(0)' }, { transform: 'rotate(-5deg) translateY(-24px)' }, { transform: 'rotate(0) translateY(0)' }], 1200);
      say(E, pick(['Rainbow yummy!', 'Whoa, a rainbow!', 'Sparkly tummy!']));
    } else if (c.tops.broccoli) {
      // broccoli on ice cream: a big silly face, then a giggle
      Sound.play('boink');
      anim(eaterAnim(E), [0, 1, 2, 3, 4, 5, 6].map(k => ({ transform: `rotate(${k === 0 || k === 6 ? 0 : (k % 2 ? 7 : -7)}deg)` })), 900);
      sparkles(cx, cy - 40, { n: 10, colors: ['#4f9e35', '#9fd67a'], spread: 140, size: 13, shape: 'dot' });
      say(E, pick(['Broccoli?! Silly! Hee hee!', 'Yuck! Broccoli ice cream? Ha ha!', 'Broccoli! Crunchy and silly!']));
    } else if (sundae) {
      Sound.play('cheer');
      hearts(14); sparkles(cx, cy - 60, { n: 16, colors: SPRINKLES, spread: 200, size: 13 });
      hop(E, 50); setTimeout(() => hop(E, 40), 520);
      say(E, pick(['The best sundae ever!', 'Wow! A super sundae!']));
    } else if (c.flavors.has(E.fav)) {
      Sound.play('love');
      hearts(12); hop(E, 40); setTimeout(() => hop(E, 30), 520);
      say(E, pick(['My favorite!', 'I love it!', 'Yay! My favorite!']));
    } else if (c.flavors.has('mint')) {
      Sound.play('spray');
      for (let i = 0; i < 3; i++) setTimeout(() => sparkles(cx, cy - 10, { n: 5, colors: ['#e6fff4', '#9ee6c4', '#fff'], spread: 60, size: 16, shape: 'dot', up: 90 }), i * 200);
      say(E, pick(['Ooh, minty fresh!', 'Cool and minty!']));
    } else if (c.tops.cherry) {
      Sound.play('love'); hearts(6); hop(E);
      say(E, pick(['A cherry on top!', 'Cherry, yum!']));
    } else if (c.tops.gummy) {
      Sound.play('boing'); hop(E, 36); setTimeout(() => hop(E, 24), 450);
      say(E, pick(['Gummy bears! Chewy!', 'Boing boing, gummy bears!']));
    } else if (c.tops.mallow) {
      Sound.play('squeak', 2); hearts(5);
      say(E, pick(['Squishy marshmallows!', 'So soft! Yum!']));
    } else if (c.tops.sprinkles || c.tops.stars) {
      Sound.play('sparkle');
      sparkles(cx, cy - 40, { n: 18, colors: SPRINKLES, spread: 160, size: 12, shape: 'bit' });
      say(E, pick(['Sprinkles!', 'Crunchy sprinkles!', 'So sparkly!']));
    } else if (c.n === 0) {
      say(E, c.base === 'cup' ? pick(['An empty cup? Silly!', 'Where is the ice cream?']) : pick(['Crunchy cone!', 'Just a cone? Silly!']));
      hop(E, 20);
    } else {
      hop(E);
      say(E, pick(['Yum yum!', 'Delicious!', 'Mmm, ice cream!', 'More, please!', 'Tasty!']));
    }
    if (c.n >= 3 && Math.random() < 0.4) setTimeout(() => {
      Sound.play('burp');
      E.el.classList.add('open'); setTimeout(() => E.el.classList.remove('open'), 500);
      bubble(E.id, E.talk.x, E.talk.y, 'BURP!');
    }, 2300);
  }

  // the bell: new flavors and toppings come out
  let bellAt = 0;
  function ringBell(hit) {
    Sound.play('ding');
    anim(hit.querySelector('.anim'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-20deg)' }, { transform: 'rotate(16deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(0)' }], 600);
    for (const id in EATERS) if (!EATERS[id].away) setTimeout(() => hop(EATERS[id]), Math.random() * 300);
    if (performance.now() - bellAt < 900) return;
    bellAt = performance.now();
    Sound.play('rainbow');
    newMenu(true);
    if (performance.now() - App.Voice.last > 900) say(EATERS.penguin, pick(['New flavors!', 'Ding ding! Something new!', 'Ooh, look what we have!']));
  }

  /* ---------- input ---------- */
  let drag = null, lastInput = performance.now(), hints = 0;
  svg.addEventListener('pointerdown', e => {
    lastInput = performance.now(); hints = 0;
    const hit = e.target.closest('[data-act], [data-eater]');
    if (!hit) return;
    const p = toSvg(e.clientX, e.clientY);
    const act = hit.dataset.act;
    if (act === 'build') {
      if (!build.base || build.busy || drag) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      drag = { id: e.pointerId, ox: p.x - build.x, oy: p.y - build.y, cx: e.clientX, cy: e.clientY, moved: false, over: null };
      return;
    }
    if (act === 'tub') addScoop(hit.dataset.flavor, hit);
    else if (act === 'topping') addTopping(hit.dataset.top, hit);
    else if (act === 'base') { if (!build.busy) setBase(hit.dataset.base, hit); }
    else if (act === 'bell') ringBell(hit);
    else if (hit.dataset.eater && !EATERS[hit.dataset.eater].away) tapEater(EATERS[hit.dataset.eater]);
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    lastInput = performance.now();
    if (!drag.moved && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) > 12) { drag.moved = true; Sound.play('pop'); }
    if (!drag.moved) return;
    const p = toSvg(e.clientX, e.clientY);
    build.x = p.x - drag.ox; build.y = p.y - drag.oy; build.scale = 0.9; place();
    drag.p = p;
    const E = eaterAt(p);
    if (E !== drag.over) {
      if (drag.over) drag.over.el.classList.remove('open');
      if (E) E.el.classList.add('open');
      drag.over = E;
    }
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (d.over) d.over.el.classList.remove('open');
    if (!d.moved) {
      Sound.play('squeak', 1); wobble(1.5);
      return;
    }
    const E = d.p && eaterAt(d.p);
    if (E) { serve(E); return; }
    // not dropped on anyone: slide back to the counter
    const x0 = build.x, y0 = build.y;
    tween(300, t => { build.x = lerp(x0, SPOT.x, t); build.y = lerp(y0, SPOT.y, t); build.scale = lerp(0.9, 1, t); place(); }).then(() => { Sound.play('plop'); wobble(); });
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  /* ---------- gentle hints when nobody is tapping ---------- */
  function hintBases() {
    if (build.base) return;
    document.querySelectorAll('#icecream [data-act=base] .anim').forEach((a, i) => anim(a, [{ transform: 'translateY(0)' }, { transform: 'translateY(-22px)' }, { transform: 'translateY(0)' }], 450, { delay: i * 120 }));
  }
  setInterval(() => {
    if (App.current !== 'icecream' || build.busy || drag || performance.now() - lastInput < 10000 || hints >= 3) return;
    lastInput = performance.now(); hints++;
    if (!build.base) { hintBases(); Sound.play('ding'); }
    else { const E = pick(Object.values(EATERS).filter(E => !E.away)); hop(E); say(E, pick(E.hello)); }
  }, 1000);
  // eaters blink now and then
  setInterval(() => {
    if (App.current !== 'icecream') return;
    const E = pick(Object.values(EATERS).filter(E => !E.away));
    if (!E) return;
    anim(eaterAnim(E), [{ transform: 'rotate(0)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' }], 600);
  }, 2400);

  let visits = 0;
  App.register({
    id: 'icecream',
    screen: svg,
    enter() {
      lastInput = performance.now(); hints = 0;
      Sound.setMood('day');
      if (visits++) newMenu(false);
      setTimeout(() => { say(EATERS.penguin, "Let's make ice cream!"); hintBases(); }, 500);
    },
    leave() { drag = null; },
    clear() { if (!build.busy) clearBuild(); },
  });

  window.__icecream = { build, EATERS, SLOTS, GUESTS, menu: () => menu, newMenu, swapGuest, seat, addScoop, addTopping, setBase, serve };
})();
