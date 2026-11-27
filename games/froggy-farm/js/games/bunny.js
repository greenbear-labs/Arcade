/* The bunny's veggie garden: tap the bunny's pocket and seed packets pop out. Drag a packet
 * onto a patch of dirt to plant it, then drag the watering can (or the rain cloud) over it and
 * it sprouts and grows. Tap the sun and the plants soak up the sunshine. Pull a ripe veggie out
 * of the ground and feed it to the bunny: every veggie gets its own silly reaction.
 * Secrets: rain and sunshine together make a rainbow (anything that ripens under it is a
 * rainbow veggie), watering a ripe veggie makes it giant, sunshine gives it sunglasses, and a
 * sparkly magic packet now and then grows a surprise. Nothing can go wrong. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const svg = $('#bunny');
  const layer = { fx: $('#bn-fx'), bubbles: $('#bn-bubbles') };
  const K = Kit(svg, layer);
  const { el, anim, toSvg, tween, sparkles, rings, talk, bubble, rand, pick, clamp, lerp, wait, visibleBox } = K;
  const { Voice } = App;

  const bunny = $('#bn-bunny'), bunnyAnim = bunny.querySelector('.bn-anim'), bunnyHead = bunny.querySelector('.bn-head');
  const belly = bunny.querySelector('.bn-belly'), bellyGlow = bunny.querySelector('.bn-belly-glow');
  const ears = [...bunny.querySelectorAll('.bn-ear')], eyes = [...bunny.querySelectorAll('.eye')];
  const plotsG = $('#bn-plots'), stickersG = $('#bn-stickers');
  const can = $('#bn-can'), canAnim = can.querySelector('.anim'), canTilt = can.querySelector('.bn-tilt');
  const cloud = $('#bn-cloud'), cloudAnim = cloud.querySelector('.anim');
  const sun = $('#bn-sun'), sunAnim = sun.querySelector('.anim');

  const BUN = { x: 370, y: 800, s: 0.74 };
  const MOUTH = { x: 370, y: 800 - 262 * 0.74 };       // where food goes in
  const POCKET = { x: 370, y: 800 - 132 * 0.74 };      // where seed packets pop out
  const SAY = { x: 370, y: 250 };
  const CAN_HOME = { x: 590, y: 775 };
  const CLOUD_HOME = { x: 860, y: 165 };
  const MAX_STICKERS = 9;
  const RAINBOW = ['#ff4b4b', '#ff9f1c', '#ffd93b', '#5cc84a', '#3fa9f5', '#9b6bff'];
  const nearBunny = p => p.x > 200 && p.x < 545 && p.y > 300 && p.y < 820;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => clamp(Math.round(c * (1 + amt)), 0, 255);
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const setColor = (t, main, dark) => { t.style.setProperty('--main', main); t.style.setProperty('--dark', dark); };

  /* ---------- the veggies (all drawn around 0,0, about 150 tall) ---------- */
  const face = (x, y, s = 1) => `<g class="vface" transform="translate(${x},${y}) scale(${s})">
    <g class="veyes"><circle cx="-15" r="7.5" fill="#2a2a2a"/><circle cx="15" r="7.5" fill="#2a2a2a"/><circle cx="-12.5" cy="-3" r="2.6" fill="#fff"/><circle cx="17.5" cy="-3" r="2.6" fill="#fff"/></g>
    <g class="shades"><path d="M-32 -9 H-4 V-2 Q-6 11 -18 11 Q-30 11 -32 -2Z M4 -9 H32 V-2 Q30 11 18 11 Q6 11 4 -2Z" fill="#1d1d2b"/><path d="M-6 -6 H6" stroke="#1d1d2b" stroke-width="4"/><path d="M-26 -4 H-18" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/></g>
    <circle cx="-27" cy="11" r="6.5" fill="#ff8fa8" opacity=".6"/><circle cx="27" cy="11" r="6.5" fill="#ff8fa8" opacity=".6"/>
    <path d="M-10 13 Q0 23 10 13" stroke="#2a2a2a" stroke-width="4.5" fill="none" stroke-linecap="round"/></g>`;
  const LEAF = 'fill="#5cc84a" stroke="#3e9b32" stroke-width="4" stroke-linejoin="round"';
  const BODY = 'fill="var(--main)" stroke="var(--dark)" stroke-width="5" stroke-linejoin="round"';
  const cornDots = (() => {
    let d = '';
    for (let r = 0; r < 7; r++) for (let c = -1; c <= 1; c++) {
      const y = -58 + r * 17, w = Math.sqrt(Math.max(0, 1 - Math.pow((y + 6) / 72, 2))) * 30;
      if (Math.abs(c * 16) < w) d += `<circle cx="${c * 16 + (r % 2 ? 8 : 0)}" cy="${y}" r="5.5" fill="#fff3a0" opacity=".8"/>`;
    }
    return d;
  })();
  const VEG = {
    carrot: {
      name: 'Carrot', color: '#ff8a2b',
      art: `<path d="M0 -58 Q-30 -100 -22 -128 Q-4 -100 0 -62Z M0 -58 Q0 -110 10 -134 Q16 -100 4 -60Z M2 -58 Q30 -96 40 -118 Q30 -84 6 -56Z" ${LEAF}/>
        <path d="M-42 -58 Q0 -74 42 -58 Q36 10 4 76 Q0 82 -4 76 Q-36 10 -42 -58Z" ${BODY}/>
        <path d="M-30 4 h14 M16 24 h14 M-18 44 h10" stroke="var(--dark)" stroke-width="5" stroke-linecap="round"/>${face(0, -30)}`,
    },
    tomato: {
      name: 'Tomato', color: '#ff4b4b',
      art: `<circle r="56" ${BODY}/><ellipse cx="-22" cy="-28" rx="13" ry="8" fill="#fff" opacity=".45"/>
        <path d="M0 -52 L-28 -66 L-11 -49 L-32 -41 L-7 -43 L0 -27 L7 -43 L32 -41 L11 -49 L28 -66Z" ${LEAF}/>
        <path d="M0 -54 Q2 -72 12 -78" stroke="#3e9b32" stroke-width="7" fill="none" stroke-linecap="round"/>${face(0, 4)}`,
    },
    corn: {
      name: 'Corn', color: '#ffd93b',
      art: `<path d="M-6 -70 Q-14 -96 -26 -100 M0 -72 Q2 -100 8 -106 M6 -70 Q18 -94 30 -96" stroke="#e8b46a" stroke-width="5" fill="none" stroke-linecap="round"/>
        <ellipse cy="-6" rx="38" ry="72" ${BODY}/>${cornDots}
        <path d="M-6 74 Q-66 34 -54 -40 Q-40 14 -4 42Z M6 74 Q66 34 54 -40 Q40 14 4 42Z" fill="#7ed957" stroke="#4fae3c" stroke-width="4" stroke-linejoin="round"/>${face(0, -20)}`,
    },
    peas: {
      name: 'Peas', color: '#6fcf4a',
      art: `<path d="M74 -14 Q92 -30 84 -50" stroke="#3e9b32" stroke-width="7" fill="none" stroke-linecap="round"/>
        <path d="M-80 8 Q-42 -48 30 -42 Q78 -38 84 -10 Q42 36 -30 34 Q-72 30 -80 8Z" ${BODY}/>
        <g fill="#c4f59a" stroke="var(--dark)" stroke-width="3"><circle cx="-42" cy="-2" r="21"/><circle cx="0" cy="-6" r="23"/><circle cx="42" cy="-8" r="21"/></g>
        <g fill="#2a2a2a"><circle cx="-49" cy="-6" r="3.5"/><circle cx="-36" cy="-6" r="3.5"/><circle cx="35" cy="-12" r="3.5"/><circle cx="48" cy="-12" r="3.5"/></g>
        ${face(0, -10, 0.62)}`,
    },
    eggplant: {
      name: 'Eggplant', color: '#9b5de5',
      art: `<path d="M-6 -52 Q40 -62 48 -10 Q56 52 6 72 Q-50 82 -56 30 Q-60 -12 -32 -32 Q-20 -48 -6 -52Z" ${BODY}/>
        <ellipse cx="-30" cy="20" rx="9" ry="18" fill="#fff" opacity=".25"/>
        <path d="M-32 -42 Q-10 -30 0 -50 Q14 -30 38 -46 Q22 -66 4 -66 Q-18 -66 -32 -42Z" ${LEAF}/>
        <path d="M2 -64 Q4 -84 18 -90" stroke="#3e9b32" stroke-width="8" fill="none" stroke-linecap="round"/>${face(0, 8)}`,
    },
    chili: {
      name: 'Chili pepper', color: '#ff3b30',
      art: `<path d="M-32 -50 Q-52 12 -10 52 Q22 80 58 72 Q22 50 16 10 Q12 -30 2 -52 Q-14 -62 -32 -50Z" ${BODY}/>
        <path d="M-36 -50 Q-16 -38 4 -52 Q-4 -66 -16 -66 Q-30 -64 -36 -50Z" ${LEAF}/>
        <path d="M-16 -64 Q-14 -86 -30 -94" stroke="#3e9b32" stroke-width="8" fill="none" stroke-linecap="round"/>${face(-12, -14, 0.85)}`,
    },
    pumpkin: {
      name: 'Pumpkin', color: '#ff9a2e',
      art: `<path d="M-6 -50 Q-8 -72 4 -82 L14 -76 Q6 -68 8 -50Z" fill="#6b9a3a" stroke="#3d6a1f" stroke-width="4"/>
        <path d="M10 -64 Q40 -84 52 -62 Q34 -54 10 -64Z" ${LEAF}/>
        <g ${BODY}><ellipse cx="-36" cy="4" rx="40" ry="52"/><ellipse cx="36" cy="4" rx="40" ry="52"/><ellipse cy="4" rx="42" ry="58"/></g>${face(0, 6)}`,
    },
    strawberry: {
      name: 'Strawberry', color: '#ff4d6d',
      art: `<path d="M0 64 Q-60 26 -54 -20 Q-48 -50 0 -46 Q48 -50 54 -20 Q60 26 0 64Z" ${BODY}/>
        <g fill="#ffe680"><ellipse cx="-30" cy="-16" rx="3" ry="5"/><ellipse cx="30" cy="-16" rx="3" ry="5"/><ellipse cx="-36" cy="12" rx="3" ry="5"/><ellipse cx="36" cy="12" rx="3" ry="5"/><ellipse cx="-16" cy="34" rx="3" ry="5"/><ellipse cx="16" cy="34" rx="3" ry="5"/><ellipse cy="48" rx="3" ry="5"/></g>
        <path d="M0 -44 L-30 -58 L-14 -42 L-34 -34 L-8 -38 L0 -24 L8 -38 L34 -34 L14 -42 L30 -58Z" ${LEAF}/>${face(0, 4)}`,
    },
    broccoli: {
      name: 'Broccoli', color: '#3fae49',
      art: `<path d="M-22 72 L-15 4 L15 4 L22 72Z" fill="#b8e986" stroke="#6fae3c" stroke-width="5" stroke-linejoin="round"/>
        <g ${BODY}><circle cx="-38" cy="-16" r="31"/><circle cx="38" cy="-16" r="31"/><circle cy="-46" r="35"/><circle cx="-16" cy="-4" r="27"/><circle cx="16" cy="-4" r="27"/></g>
        ${face(0, -16)}`,
    },
  };
  const TYPES = Object.keys(VEG);

  function vegArt(g, type) {
    g.classList.add('veg');
    setColor(g, VEG[type].color, shade(VEG[type].color, -0.3));
    g.insertAdjacentHTML('beforeend', VEG[type].art);
  }

  /* ---------- rainbow colors: anything in this set cycles through the rainbow ---------- */
  const rainbowSet = new Map();
  function rainbowLoop(now) {
    let i = 0;
    for (const [t, t0] of rainbowSet) {
      if (!t.isConnected) { rainbowSet.delete(t); continue; }
      const h = ((t0 * 0.1 + (now - t0) * 0.15) + i * 60) % 360;
      setColor(t, `hsl(${h.toFixed(0)},90%,60%)`, `hsl(${h.toFixed(0)},75%,40%)`);
      i++;
    }
    requestAnimationFrame(rainbowLoop);
  }
  requestAnimationFrame(rainbowLoop);

  /* ---------- the bunny ---------- */
  const mouthReasons = new Set();
  function mouth(reason, open) {
    if (open) mouthReasons.add(reason); else mouthReasons.delete(reason);
    bunny.classList.toggle('open', mouthReasons.size > 0);
  }
  let giggleTimer = 0;
  function giggle(ms) {
    bunny.classList.add('giggle'); mouth('giggle', true);
    clearTimeout(giggleTimer);
    giggleTimer = setTimeout(() => { bunny.classList.remove('giggle'); mouth('giggle', false); }, ms || 900);
  }
  function blink() {
    eyes.forEach(e => { e.classList.remove('blink'); void e.getBBox(); e.classList.add('blink'); });
    setTimeout(blink, rand(2200, 5200));
  }
  setTimeout(blink, 2500);
  const hopBunny = (h = 60, ms = 600) => anim(bunnyAnim, [
    { transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.08,.9)', offset: 0.15 },
    { transform: `translateY(${-h}px) scale(.95,1.06)`, offset: 0.5 }, { transform: 'translateY(0) scale(1.06,.94)', offset: 0.85 }, { transform: 'translateY(0) scale(1,1)' },
  ], ms, { easing: 'ease-in-out' });
  function wiggleEars(big) {
    ears.forEach((e, i) => anim(e, [0, 1, 2, 3, 4].map(k => ({ transform: `rotate(${k === 0 || k === 4 ? 0 : (k % 2 ? 1 : -1) * (i ? 1 : -1) * (big ? 28 : 14)}deg)` })), big ? 900 : 600, { easing: 'ease-in-out' }));
  }
  function say(lines, opts) { talk('bunny', SAY.x, SAY.y, Array.isArray(lines) ? pick(lines) : lines, opts); }

  // the bunny's own color can change (eggplant, chili, rainbow); it always comes back
  const BASE = { main: '#fbf3ea', dark: '#d3c0aa' };
  let colorTimer = 0, coolTimer = 0;
  function tintBunny(main, dark, ms) {
    rainbowSet.delete(bunny);
    setColor(bunny, main, dark);
    clearTimeout(colorTimer);
    colorTimer = setTimeout(() => { rainbowSet.delete(bunny); setColor(bunny, BASE.main, BASE.dark); }, ms);
  }
  function rainbowBunny(ms) {
    rainbowSet.set(bunny, performance.now());
    clearTimeout(colorTimer);
    colorTimer = setTimeout(() => { rainbowSet.delete(bunny); setColor(bunny, BASE.main, BASE.dark); }, ms);
  }
  function coolBunny(ms) {
    bunny.classList.add('cool');
    clearTimeout(coolTimer);
    coolTimer = setTimeout(() => bunny.classList.remove('cool'), ms);
  }

  const POCKET_LINES = ['Seeds! Plant them!', 'Hee hee, my pocket!', 'Ooh, what seeds?', 'Let\'s grow veggies!', 'Pop! Seeds!', 'That tickles!', 'Plant it in the dirt!'];
  const HEAD_LINES = ['Boop!', 'Hi hi!', 'Sniff sniff!', 'Peekaboo!', 'Hop hop!'];
  let lastSpawn = 0, bunnyBusy = false;
  function tapBelly() {
    giggle(1000);
    Sound.play('tickle');
    anim(bunnyAnim, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.06,.92)' }, { transform: 'scale(.97,1.06) rotate(-2deg)' }, { transform: 'scale(1.02,.98) rotate(2deg)' }, { transform: 'scale(1,1)' }], 700);
    anim(belly, [{ transform: 'scale(1)' }, { transform: 'scale(1.1,.9)' }, { transform: 'scale(.96,1.05)' }, { transform: 'scale(1)' }], 500);
    anim(bellyGlow, [{ opacity: 0.55 }, { opacity: 0 }], 500);
    const now = performance.now();
    if (bunnyBusy || now - lastSpawn < 550) return;
    lastSpawn = now;
    if (now - Voice.last > 1400) setTimeout(() => say(POCKET_LINES), 150);
    setTimeout(spawnPacket, 300);
  }
  function tapHead() {
    Sound.play('hop');
    anim(bunnyHead, [{ transform: 'translateY(0)' }, { transform: 'translateY(-24px) rotate(-5deg)' }, { transform: 'translateY(0) rotate(4deg)' }, { transform: 'translateY(0)' }], 550);
    anim(bunny.querySelector('.bn-nose'), [{ transform: 'scale(1)' }, { transform: 'scale(1.4,.8)' }, { transform: 'scale(.9,1.2)' }, { transform: 'scale(1.3,.85)' }, { transform: 'scale(1)' }], 600);
    if (performance.now() - Voice.last > 900) say(HEAD_LINES);
  }
  let earTaps = 0;
  function tapEars() {
    earTaps++;
    if (earTaps % 4 === 0) {
      // every few taps: a full helicopter spin of both ears
      Sound.play('whirr');
      ears.forEach((e, i) => anim(e, [{ transform: 'rotate(0)' }, { transform: `rotate(${i ? 360 : -360}deg)` }, { transform: `rotate(${i ? 720 : -720}deg)` }], 1000, { easing: 'ease-in-out' }));
      hopBunny(90, 1000);
      say(['Wheee! Helicopter ears!', 'Spinny ears!']);
    } else {
      Sound.play('boing');
      wiggleEars(true);
    }
  }

  /* ---------- the dirt patches ---------- */
  const PLOTS = [[760, 610], [990, 610], [1220, 610], [760, 780], [990, 780], [1220, 780]].map(([x, y], i) => {
    const g = el('g', { class: 'tap bn-plot', 'data-act': 'plot', transform: `translate(${x},${y})` }, plotsG);
    g.dataset.i = i;
    // an invisible box so the whole patch (and the plant on it) is easy to hit
    el('rect', { x: -112, y: i < 3 ? -230 : -175, width: 224, height: i < 3 ? 260 : 215, fill: '#fff', opacity: 0 }, g);
    const dirt = el('g', {}, g);
    el('ellipse', { cy: 4, rx: 104, ry: 36, fill: '#6b4320' }, dirt);
    el('ellipse', { cy: -2, rx: 96, ry: 28, fill: '#7d5027' }, dirt);
    el('path', { d: 'M-66 -4 Q-30 -14 0 -6 Q30 -14 66 -4', stroke: '#5e3a1a', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, dirt);
    const plant = el('g', { class: 'bn-plant' }, g);
    return { i, x, y, g, dirt, plant, stage: 0, type: null, wet: 0, lastGrow: 0, giant: 0, cool: false, rainbow: false, vegEl: null, thirstyAt: 0 };
  });
  const plotAt = p => PLOTS.slice().reverse().find(P => Math.abs(p.x - P.x) < 115 && p.y > P.y - (P.i < 3 ? 200 : 160) && p.y < P.y + 50) || null;

  function drawPlant(P) {
    P.plant.innerHTML = '';
    P.vegEl = null;
    if (P.stage === 1) {
      // seeds in the dirt and a little sign with a picture of what will grow
      el('g', {}, P.plant).innerHTML = '<g fill="#e8c07a" stroke="#a47a3a" stroke-width="3"><ellipse cx="-28" cy="-8" rx="8" ry="6"/><ellipse cx="4" cy="-12" rx="8" ry="6"/><ellipse cx="32" cy="-6" rx="8" ry="6"/></g>';
      const sign = el('g', { transform: 'translate(70,-10)' }, P.plant);
      el('path', { d: 'M0 0 V-70', stroke: '#a47a3a', 'stroke-width': 8, 'stroke-linecap': 'round' }, sign);
      el('rect', { x: -32, y: -128, width: 64, height: 64, rx: 12, fill: '#fff4d6', stroke: '#c9ab7c', 'stroke-width': 4 }, sign);
      const icon = el('g', { transform: 'translate(0,-96) scale(.33)' }, sign);
      vegArt(icon, P.type);
      if (P.rainbow) rainbowSet.set(icon, performance.now());
    } else if (P.stage === 2) {
      const s = el('g', { class: 'bn-sprout-sway' }, P.plant);
      s.innerHTML = `<path d="M0 0 Q6 -30 0 -62" stroke="#4fae3c" stroke-width="9" fill="none" stroke-linecap="round"/>
        <path d="M0 -50 Q-36 -74 -48 -50 Q-26 -36 0 -50Z" ${LEAF}/><path d="M0 -58 Q34 -86 50 -62 Q26 -46 0 -58Z" ${LEAF}/>`;
    } else if (P.stage === 3) {
      const s = el('g', { class: 'bn-sprout-sway' }, P.plant);
      s.innerHTML = `<path d="M0 0 Q8 -50 0 -110" stroke="#4fae3c" stroke-width="10" fill="none" stroke-linecap="round"/>
        <path d="M0 -30 Q-50 -56 -66 -26 Q-34 -12 0 -30Z" ${LEAF}/><path d="M0 -44 Q52 -74 68 -42 Q36 -26 0 -44Z" ${LEAF}/>
        <path d="M0 -76 Q-40 -104 -54 -78 Q-28 -64 0 -76Z" ${LEAF}/>`;
      const v = el('g', { transform: 'translate(0,-120) scale(.42)' }, s);
      vegArt(v, P.type);
      if (P.rainbow) rainbowSet.set(v, performance.now());
    } else if (P.stage === 4) {
      el('g', {}, P.plant).innerHTML = `<path d="M-20 0 Q-50 -30 -70 -10 Q-44 4 -20 0Z M20 0 Q50 -30 70 -10 Q44 4 20 0Z" ${LEAF}/>`;
      const holder = el('g', { transform: `scale(${1 + P.giant * 0.28})` }, P.plant);
      const bob = el('g', { class: 'anim' }, holder);
      const v = el('g', { transform: 'translate(0,-72)' }, bob);
      vegArt(v, P.type);
      v.classList.toggle('cool', P.cool);
      if (P.rainbow) rainbowSet.set(v, performance.now());
      P.vegEl = v; P.bob = bob;
    }
  }
  function resetPlot(P) {
    Object.assign(P, { stage: 0, type: null, wet: 0, giant: 0, cool: false, rainbow: false });
    drawPlant(P);
  }
  const popPlant = (P, big) => anim(P.plant, [{ transform: 'scale(.3,.1)' }, { transform: `scale(${big ? 1.25 : 1.15},${big ? 1.3 : 1.2})`, offset: 0.6 }, { transform: 'scale(1)' }], 500, { easing: 'cubic-bezier(.2,.9,.3,1.3)' });

  function plant(P, type, magic) {
    P.type = type; P.stage = 1; P.wet = 0; P.giant = 0; P.cool = false; P.rainbow = !!magic;
    P.lastGrow = performance.now();
    drawPlant(P);
    popPlant(P);
    Sound.play('plop');
    sparkles(P.x, P.y - 10, { n: 8, colors: magic ? RAINBOW : ['#e8c07a', '#a47a3a', '#fff'], spread: 80, size: 10, shape: 'dot' });
    if (magic) {
      // magic seeds sprout all by themselves
      setTimeout(() => { Sound.play('sparkle'); grow(P); }, 700);
    }
  }

  function grow(P) {
    if (P.stage < 1 || P.stage >= 4) return;
    P.stage++;
    P.wet = 0; P.lastGrow = performance.now();
    if (P.stage === 4 && rainbowUp()) P.rainbow = true;
    drawPlant(P);
    popPlant(P, P.stage === 4);
    if (P.stage === 4) {
      Sound.play('ripe');
      sparkles(P.x, P.y - 80, { n: 16, colors: P.rainbow ? RAINBOW : [VEG[P.type].color, '#fff', '#ffd93b'], spread: 140, size: 15 });
      // the new veggie says its own name
      setTimeout(() => {
        if (P.stage !== 4) return;
        const name = VEG[P.type].name;
        talk('veg', P.x, P.y - 230, P.rainbow ? `Rainbow ${name.toLowerCase()}!` : `${name}!`, { pitch: 1.5 });
        vegWiggle(P);
      }, 350);
    } else {
      Sound.play(P.stage === 2 ? 'sprout' : 'grow', P.stage);
      sparkles(P.x, P.y - 40, { n: 6, colors: ['#9be27a', '#fff', '#5cc84a'], spread: 70, size: 10 });
    }
  }
  const vegWiggle = P => P.bob && anim(P.bob, [0, 1, 2, 3, 4, 5].map(k => ({ transform: k === 0 || k === 5 ? 'rotate(0) translateY(0)' : `rotate(${k % 2 ? 9 : -9}deg) translateY(${k % 2 ? -14 : 0}px)` })), 800, { easing: 'ease-in-out' });

  // seeds without water: a little thought bubble with a water drop
  function thirsty(P) {
    const now = performance.now();
    if (now - P.thirstyAt < 2500) return;
    P.thirstyAt = now;
    const g = el('g', { transform: `translate(${P.x + 20},${P.y - 120})` }, layer.fx);
    const b = el('g', { class: 'bn-thirsty' }, g);
    b.innerHTML = '<circle cx="-34" cy="70" r="8" fill="#fff" stroke="#9fc6e0" stroke-width="3"/><circle cx="-20" cy="46" r="12" fill="#fff" stroke="#9fc6e0" stroke-width="3"/>' +
      '<ellipse rx="44" ry="38" fill="#fff" stroke="#9fc6e0" stroke-width="4"/><path d="M0 -22 Q18 2 0 18 Q-18 2 0 -22Z" fill="#5cb3ff"/>';
    anim(b, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], 250);
    setTimeout(() => { const a = anim(g, [{ opacity: 1 }, { opacity: 0 }], 300, { fill: 'forwards' }); if (a) a.onfinish = () => g.remove(); else g.remove(); }, 2000);
    anim(canAnim, [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }], 700);
  }

  /* water from the can or the cloud: a short soak grows the plant one step */
  function water(P, dt, from) {
    P.wet += dt;
    if (P.stage === 0) return;
    if (P.stage < 4) {
      if (P.wet > 0.55 && performance.now() - P.lastGrow > 650) grow(P);
      return;
    }
    // a ripe veggie: under the rainbow it turns rainbow, otherwise it grows giant
    if (rainbowUp() && !P.rainbow && P.wet > 0.35) {
      P.rainbow = true; P.wet = 0;
      rainbowSet.set(P.vegEl, performance.now());
      Sound.play('rainbow');
      sparkles(P.x, P.y - 90, { n: 20, colors: RAINBOW, spread: 160, size: 15 });
      talk('veg', P.x, P.y - 240, 'Rainbow!', { pitch: 1.6 });
      return;
    }
    if (P.wet > 1.0 && performance.now() - P.lastGrow > 900) {
      P.wet = 0; P.lastGrow = performance.now();
      if (P.giant < 2) {
        P.giant++;
        drawPlant(P);
        Sound.play('grow', 2 + P.giant);
        anim(P.plant, [{ transform: 'scale(1)' }, { transform: 'scale(1.15,.85)' }, { transform: 'scale(.95,1.1)' }, { transform: 'scale(1)' }], 500);
        sparkles(P.x, P.y - 120, { n: 10, colors: ['#fff', '#bfefff', VEG[P.type].color], spread: 150, size: 14 });
        talk('veg', P.x, P.y - 260 - P.giant * 40, P.giant === 1 ? 'I\'m getting big!' : 'I\'m GIANT!', { pitch: 1.4 });
      } else {
        Sound.play('squeak', 3);
        vegWiggle(P);
        bubble('veg', P.x, P.y - 340, 'Hee hee! Splashy!');
      }
    }
  }

  /* ---------- seed packets and picked veggies (draggable stickers) ---------- */
  const stickers = [];
  function setPos(s) { s.el.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) scale(${s.scale.toFixed(3)})`); }
  function makeSticker(kind, type, x, y, flags) {
    const g = el('g', { class: `sticker bn-${kind}`, 'data-act': 'sticker' }, stickersG);
    const pop = el('g', { class: 'pop' }, g);
    el('ellipse', { cy: 74, rx: 46, ry: 10, fill: '#000', opacity: 0.12 }, pop);
    const a = el('g', { class: 'anim' }, pop);
    const s = Object.assign({ el: g, anim: a, kind, type, x, y, scale: 1, held: false, locked: false, giant: 0, cool: false, rainbow: false, magic: false }, flags || {});
    if (kind === 'packet') drawPacket(a, s);
    else {
      const v = el('g', { transform: `scale(${1 + s.giant * 0.22})` }, a);
      vegArt(v, type);
      v.classList.toggle('cool', s.cool);
      if (s.rainbow) rainbowSet.set(v, performance.now());
      s.vegEl = v;
    }
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
  function drawPacket(a, s) {
    const magic = s.magic;
    el('rect', { x: -50, y: -66, width: 100, height: 132, rx: 12, fill: magic ? 'url(#bn-magic)' : '#fff4d6', stroke: magic ? '#b98bff' : '#c9ab7c', 'stroke-width': 5 }, a);
    el('path', { d: 'M-50 -46 H50', stroke: magic ? '#fff' : '#c9ab7c', 'stroke-width': 4, 'stroke-dasharray': '8 6' }, a);
    if (!magic) el('rect', { x: -40, y: -36, width: 80, height: 80, rx: 40, fill: shade(VEG[s.type].color, 0.55) }, a);
    const icon = el('g', { transform: 'translate(0,4) scale(.46)' }, a);
    if (magic) {
      icon.innerHTML = `<path d="${K.starPath(70, 30)}" fill="#fff" stroke="#ffd93b" stroke-width="8"/>`;
      for (let i = 0; i < 3; i++) el('path', { d: K.starPath(10, 4), fill: '#fff', transform: `translate(${[-34, 36, 30][i]},${[-52, -40, 50][i]})` }, a);
    } else vegArt(icon, s.type);
    el('g', {}, a).innerHTML = '<g fill="#a47a3a"><ellipse cx="-22" cy="54" rx="5" ry="4"/><ellipse cx="0" cy="56" rx="5" ry="4"/><ellipse cx="22" cy="54" rx="5" ry="4"/></g>';
  }
  function removeSticker(s, poof) {
    const i = stickers.indexOf(s);
    if (i >= 0) stickers.splice(i, 1);
    s.locked = true;
    if (poof) {
      Sound.play('poof');
      sparkles(s.x, s.y, { n: 6, colors: ['#fff', '#e8f4ff'], spread: 70, size: 12 });
      const a = anim(s.anim, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0.8, offset: 0.3 }, { transform: 'scale(0)', opacity: 0 }], 350, { fill: 'forwards' });
      if (a) a.onfinish = () => s.el.remove(); else s.el.remove();
    } else s.el.remove();
  }
  // packets land in the open sky above the garden, away from each other
  function freeSpot() {
    const vb = visibleBox(80);
    let best = null, bestD = -1;
    for (let i = 0; i < 30; i++) {
      const p = { x: rand(Math.max(vb.x0, 600), Math.min(vb.x1, 1380)), y: rand(Math.max(vb.y0, 300), 410) };
      if (Math.abs(p.x - cloudPos.x) < 170 && Math.abs(p.y - cloudPos.y) < 130) continue;
      const d = stickers.reduce((m, s) => Math.min(m, Math.hypot(s.x - p.x, s.y - p.y)), 9999);
      if (d > 135) return p;
      if (d > bestD) { bestD = d; best = p; }
    }
    return best || { x: 900, y: 360 };
  }
  async function launch(s, from, to) {
    s.locked = true; s.scale = 0.25; setPos(s);
    Sound.play('pop');
    const arc = Math.min(280, 120 + Math.abs(to.x - from.x) * 0.3);
    await tween(700, t => {
      s.x = lerp(from.x, to.x, t);
      s.y = lerp(from.y, to.y, t) - Math.sin(Math.PI * t) * arc;
      s.scale = lerp(0.25, 1, Math.min(1, t * 1.6));
      setPos(s);
    });
    if (s.el.isConnected) {
      s.locked = false;
      Sound.play('land');
      anim(s.anim, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.22,.78)' }, { transform: 'scale(.92,1.1)' }, { transform: 'scale(1,1)' }], 380);
      if (s.magic) sparkles(s.x, s.y, { n: 12, colors: RAINBOW });
    }
    return s;
  }
  let spawnCount = 0, sinceMagic = 0;
  function spawnPacket() {
    spawnCount++; sinceMagic++;
    const magic = spawnCount >= 4 && !stickers.some(s => s.magic) && (Math.random() < 0.18 || sinceMagic >= 8);
    if (magic) sinceMagic = 0;
    // prefer a veggie that isn't already waiting as a packet
    const waiting = new Set(stickers.filter(s => s.kind === 'packet').map(s => s.type));
    const type = pick(TYPES.filter(t => !waiting.has(t)).concat(TYPES).slice(0, Math.max(3, TYPES.length - waiting.size)));
    const s = makeSticker('packet', type, POCKET.x, POCKET.y, { magic });
    anim(bunny.querySelector('.bn-pocket'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-8px) scale(1.1)' }, { transform: 'translateY(0)' }], 300);
    launch(s, POCKET, freeSpot()).then(() => { if (magic) { Sound.play('sparkle'); say(['Ooh! Magic seeds!', 'Sparkly seeds!']); } });
  }
  const stickerTap = s => {
    if (s.kind === 'packet') {
      Sound.play('shake');
      anim(s.anim, [0, 1, 2, 3, 4, 5, 6].map(k => ({ transform: k === 0 || k === 6 ? 'rotate(0)' : `rotate(${k % 2 ? 14 : -14}deg) translateY(${-k * 2}px)` })), 600);
      sparkles(s.x, s.y + 60, { n: 4, colors: ['#e8c07a', '#a47a3a'], spread: 50, size: 7, shape: 'dot' });
    } else {
      Sound.play(s.type === 'peas' ? 'boink' : s.type === 'corn' ? 'pop' : 'squeak', 3);
      anim(s.anim, [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-50px) rotate(-14deg) scale(1.05)' }, { transform: 'translateY(0) rotate(10deg) scale(1.1,.9)' }, { transform: 'translateY(0) rotate(0)' }], 650);
      talk('veg', s.x, s.y - 140, s.rainbow ? `Rainbow ${VEG[s.type].name.toLowerCase()}!` : `${VEG[s.type].name}!`, { pitch: 1.5 });
    }
  };
  function stickerUnder(s) {
    let best = null, bd = 90;
    for (const o of stickers) {
      if (o === s || o.locked || o.held) continue;
      const d = Math.hypot(o.x - s.x, o.y - s.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function stickerMeet(a, b) {
    if (a.kind === 'veg' && b.kind === 'veg' && a.rainbow !== b.rainbow) {
      // rainbow is catching
      const t = a.rainbow ? b : a;
      t.rainbow = true; rainbowSet.set(t.vegEl, performance.now());
      Sound.play('rainbow');
      sparkles(t.x, t.y, { n: 16, colors: RAINBOW, spread: 140 });
    }
    if (a.kind === b.kind && a.type === b.type) {
      Sound.play('love');
      sparkles((a.x + b.x) / 2, (a.y + b.y) / 2 - 50, { n: 9, colors: ['#ff5c8a', '#ff8fb3', '#ffc2d6'], spread: 120, size: 16, shape: 'heart', dur: 1100 });
      const nx = b.x + 30, ny = b.y - 30;
      tween(200, t => { a.x = lerp(a.x, nx, t); a.y = lerp(a.y, ny, t); setPos(a); });
      [a, b].forEach((s, i) => anim(s.anim, [0, 1, 2, 3, 4, 5].map(k => ({ transform: k === 0 || k === 5 ? 'rotate(0) translateY(0)' : `rotate(${(k % 2 ? 14 : -14) * (i ? -1 : 1)}deg) translateY(${k % 2 ? -16 : 0}px)` })), 900, { easing: 'ease-in-out' }));
      if (a.kind === 'veg') bubble('veg', b.x, b.y - 150, 'Best friends!');
    } else {
      Sound.play('bonk');
      [a, b].forEach(s => anim(s.anim, [0, 1, 2, 3, 4, 5, 6].map(k => ({ transform: k === 0 || k === 6 ? 'translateX(0)' : `translateX(${k % 2 ? 9 : -9}px) scale(1.06,.94)` })), 500));
      const ang = Math.atan2(a.y - b.y, a.x - b.x) || -Math.PI / 4, vb = visibleBox(70);
      const x0 = a.x, y0 = a.y;
      const nx = clamp(b.x + Math.cos(ang) * 130, vb.x0, vb.x1), ny = clamp(b.y + Math.sin(ang) * 130, vb.y0, vb.y1);
      setTimeout(() => tween(380, t => { a.x = lerp(x0, nx, t); a.y = lerp(y0, ny, t) - Math.sin(Math.PI * t) * 60; setPos(a); }), 420);
    }
  }
  async function bounceAway(s, to) {
    s.locked = true;
    const x0 = s.x, y0 = s.y;
    await tween(550, t => { s.x = lerp(x0, to.x, t); s.y = lerp(y0, to.y, t) - Math.sin(Math.PI * t) * 140; setPos(s); });
    s.locked = false;
    Sound.play('land');
  }

  /* pull a ripe veggie out of the ground: it becomes a sticker in your finger */
  function pullOut(P, p) {
    const flags = { giant: P.giant, cool: P.cool, rainbow: P.rainbow };
    const s = makeSticker('veg', P.type, P.x, P.y - 72 * (1 + P.giant * 0.28), flags);
    Sound.play('pull');
    sparkles(P.x, P.y - 6, { n: 10, colors: ['#7d5027', '#a47a3a', '#5e3a1a'], spread: 90, size: 10, shape: 'dot' });
    anim(P.dirt, [{ transform: 'scale(1)' }, { transform: 'scale(1.12,.8)' }, { transform: 'scale(1)' }], 300);
    resetPlot(P);
    anim(s.anim, [{ transform: 'scale(.8,1.25)' }, { transform: 'scale(1.1,.9)' }, { transform: 'scale(1)' }], 350);
    return s;
  }

  /* ---------- feeding the bunny ---------- */
  async function eat(s) {
    s.locked = true; bunnyBusy = true;
    mouth('eat', true);
    const x0 = s.x, y0 = s.y, sc = s.scale;
    await tween(380, t => { const e = t * t; s.x = lerp(x0, MOUTH.x, e); s.y = lerp(y0, MOUTH.y, e); s.scale = lerp(sc, 0.35, e); setPos(s); });
    const big = s.giant > 0;
    removeSticker(s, false);
    const chomps = big ? 6 : 3;
    Sound.play('munch', chomps);
    for (let i = 0; i < chomps; i++) setTimeout(() => {
      anim(bunnyHead, [{ transform: 'scale(1)' }, { transform: 'scale(1.05,.94)' }, { transform: 'scale(1)' }], 150);
      bunny.classList.toggle('open', i % 2 === 0);
      sparkles(MOUTH.x, MOUTH.y + 10, { n: 2, colors: [s.rainbow ? pick(RAINBOW) : VEG[s.type].color], spread: 60, size: 8, shape: 'dot' });
    }, i * 160);
    await wait(chomps * 160 + 100);
    mouth('eat', false);
    Sound.play('gulp');
    anim(belly, [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }], 600, { easing: 'ease-in-out' });
    await wait(200);
    bunnyBusy = false;
    react(s);
  }
  function react(s) {
    const B = { x: BUN.x, y: 520 };
    if (s.rainbow) {
      rainbowBunny(9000);
      Sound.play('rainbow');
      rings(B.x, B.y, RAINBOW, { scale: 10 });
      sparkles(B.x, B.y, { n: 30, colors: RAINBOW, spread: 260, size: 18, dur: 1200 });
      say("I'm a rainbow bunny!", { pitch: 1.9, rate: 1.1 });
      giggle(1600); hopBunny(90, 900); wiggleEars(true);
      return;
    }
    if (s.cool) coolBunny(9000);
    if (s.giant) {
      say(s.giant > 1 ? 'That was GIANT!' : 'Wow, so big!');
      anim(belly, [{ transform: 'scale(1)' }, { transform: 'scale(1.3,1.15)', offset: 0.3 }, { transform: 'scale(1.3,1.15)', offset: 0.7 }, { transform: 'scale(1)' }], 2200, { easing: 'ease-in-out' });
      anim(bunnyAnim, [0, 1, 2, 3, 4, 5].map(k => ({ transform: `rotate(${k === 0 || k === 5 ? 0 : (k % 2 ? 7 : -7)}deg)` })), 1800, { easing: 'ease-in-out' });
      setTimeout(() => { Sound.play('burp'); mouth('burp', true); bubble('bunny', SAY.x, SAY.y, 'BURP!'); rings(MOUTH.x, MOUTH.y, ['#d6f5ff', '#fff'], { width: 4, scale: 4, gap: 150 }); setTimeout(() => mouth('burp', false), 600); }, 2100);
      return;
    }
    if (s.cool) { Sound.play('cheer'); say(['So cool!', 'Cool bunny!']); giggle(1200); wiggleEars(); return; }
    switch (s.type) {
      case 'carrot':
        Sound.play('love');
        sparkles(B.x, B.y - 60, { n: 12, colors: ['#ff5c8a', '#ff8fb3', '#ffc2d6'], spread: 170, size: 18, shape: 'heart', dur: 1300 });
        say(['Crunchy carrot! My favorite!', 'Carrots! Yum yum yum!', 'I love carrots!']);
        giggle(1500); hopBunny(100, 800); wiggleEars(true);
        setTimeout(() => hopBunny(60, 600), 800);
        break;
      case 'tomato':
        Sound.play('splat');
        sparkles(MOUTH.x, MOUTH.y, { n: 16, colors: ['#ff4b4b', '#ff7a7a', '#d92f2f'], spread: 170, size: 14, shape: 'drop', dur: 900 });
        say(['Squish! Juicy!', 'Splat! Hee hee!', 'Squirty tomato!']);
        giggle(1200);
        anim(bunnyHead, [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], 600);
        break;
      case 'corn':
        say(['Pop pop popcorn!', 'Popcorn party!']);
        for (let i = 0; i < 7; i++) setTimeout(() => {
          Sound.play('pop');
          anim(bunnyAnim, [{ transform: 'translateY(0)' }, { transform: 'translateY(-18px)' }, { transform: 'translateY(0)' }], 180);
          sparkles(MOUTH.x + rand(-40, 40), MOUTH.y - 20, { n: 3, colors: ['#fffbe6', '#fff3a0'], spread: 120, size: 16, shape: 'dot', up: 60 });
        }, 150 + i * 190);
        break;
      case 'peas':
        say(['Boing boing boing!', 'Bouncy peas!']);
        for (let i = 0; i < 3; i++) setTimeout(() => { Sound.play('boing'); hopBunny(70, 420); sparkles(B.x, 790, { n: 4, colors: ['#9be27a', '#6fcf4a'], spread: 80, size: 10, shape: 'dot' }); }, i * 440);
        break;
      case 'eggplant':
        tintBunny('#c9a3ff', '#8e63d6', 7000);
        Sound.play('sparkle');
        sparkles(B.x, B.y, { n: 16, colors: ['#c9a3ff', '#9b5de5', '#fff'], spread: 200, size: 15 });
        say(["I'm purple!", 'Purple bunny!']);
        giggle(1300); wiggleEars();
        break;
      case 'chili':
        tintBunny('#ff8a80', '#d9473b', 4500);
        Sound.play('sizzle');
        say(['Hot hot hot!', 'Spicy! Whoa!'], { pitch: 2, rate: 1.25 });
        hopBunny(150, 800); wiggleEars(true);
        for (let i = 0; i < 8; i++) setTimeout(() => {
          [-1, 1].forEach(side => {
            const g = el('g', { transform: `translate(${BUN.x + side * 50},${BUN.y - 470 * BUN.s})` }, layer.fx);
            const c = el('circle', { r: rand(14, 22), fill: '#fff', opacity: 0.85 }, g);
            const a = anim(c, [{ transform: 'translate(0,0) scale(.5)', opacity: 0.9 }, { transform: `translate(${side * rand(20, 60)}px,${-rand(90, 150)}px) scale(1.4)`, opacity: 0 }], 900);
            if (a) a.onfinish = () => g.remove(); else setTimeout(() => g.remove(), 900);
          });
        }, i * 140);
        setTimeout(() => { if (App.current === 'bunny') say('Phew! Water please!'); }, 2600);
        break;
      case 'pumpkin':
        say(['So full! Round tummy!', 'Big pumpkin tummy!']);
        anim(belly, [{ transform: 'scale(1)' }, { transform: 'scale(1.35,1.2)', offset: 0.3 }, { transform: 'scale(1.35,1.2)', offset: 0.75 }, { transform: 'scale(1)' }], 2400, { easing: 'ease-in-out' });
        anim(bunnyAnim, [{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg)' }, { transform: 'rotate(9deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }], 1800, { easing: 'ease-in-out' });
        setTimeout(() => { Sound.play('burp'); bubble('bunny', SAY.x, SAY.y, 'BURP!'); }, 2200);
        break;
      case 'strawberry':
        Sound.play('love');
        sparkles(B.x, B.y - 60, { n: 10, colors: ['#ff4d6d', '#ff8fb3', '#ffc2d6'], spread: 160, size: 16, shape: 'heart', dur: 1200 });
        bunny.querySelectorAll('.bn-cheek').forEach(c => anim(c, [{ opacity: 0.55, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.5)' }, { opacity: 1, transform: 'scale(1.5)' }, { opacity: 0.55, transform: 'scale(1)' }], 1800));
        say(['Sweet strawberry!', 'Mmm, so sweet!']);
        giggle(1500);
        break;
      case 'broccoli':
        say('Hmm... broccoli?');
        anim(bunnyHead, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(0)' }], 1200);
        setTimeout(() => {
          Sound.play('cheer');
          say(['Yummy! Big and strong!', 'I like it!']);
          ears.forEach((e, i) => anim(e, [{ transform: 'rotate(0) scale(1)' }, { transform: `rotate(${i ? 12 : -12}deg) scale(1.1,1.35)` }, { transform: `rotate(${i ? 12 : -12}deg) scale(1.1,1.35)` }, { transform: 'rotate(0) scale(1)' }], 1600));
          hopBunny(80, 700);
          sparkles(B.x, B.y - 150, { n: 14, colors: ['#3fae49', '#9be27a', '#ffd93b'], spread: 180, size: 15 });
        }, 1500);
        break;
    }
  }
  // seed packets aren't food: a sniff, a big sneeze, and the packet flies back out
  async function sniffPacket(s) {
    s.locked = true; bunnyBusy = true;
    Sound.play('sneeze');
    say(['Ah... ah... choo!', 'Not seeds, silly!']);
    anim(bunnyHead, [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px) rotate(-6deg)', offset: 0.6 }, { transform: 'translateY(8px) rotate(4deg)', offset: 0.75 }, { transform: 'translateY(0)' }], 800);
    await wait(500);
    sparkles(MOUTH.x, MOUTH.y - 30, { n: 10, colors: ['#fff', '#e8f4ff'], spread: 120, size: 12, shape: 'dot' });
    bunnyBusy = false;
    await bounceAway(s, freeSpot());
  }
  // water on the bunny: a big wet shake
  let lastShake = 0, bunnyWet = 0;
  function wetBunny(dt) {
    bunnyWet += dt;
    if (bunnyWet < 0.6 || performance.now() - lastShake < 2000 || bunnyBusy) return;
    bunnyWet = 0; lastShake = performance.now();
    Sound.play('shakeoff');
    say(['Splishy! Shake shake!', 'I\'m all wet! Hee hee!', 'Brrr! Shake!']);
    giggle(1200);
    anim(bunnyAnim, [0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => ({ transform: `rotate(${k === 0 || k === 8 ? 0 : (k % 2 ? 6 : -6)}deg)` })), 800);
    wiggleEars(true);
    for (let i = 0; i < 3; i++) setTimeout(() => sparkles(BUN.x, 560, { n: 8, colors: ['#bfefff', '#5cb3ff', '#fff'], spread: 230, size: 12, shape: 'drop' }), i * 220);
  }

  /* ---------- weather ---------- */
  let sunUntil = 0, rainUntil = 0, rainbowUntil = 0;
  const now = () => performance.now();
  const sunny = () => now() < sunUntil;
  const raining = () => now() < rainUntil || !!(drag && drag.kind === 'cloud' && drag.moved);
  const rainbowUp = () => now() < rainbowUntil;
  const cloudPos = { x: CLOUD_HOME.x, y: CLOUD_HOME.y };
  const setCloud = () => cloud.setAttribute('transform', `translate(${cloudPos.x.toFixed(1)},${cloudPos.y.toFixed(1)})`);

  async function tapSun() {
    Sound.play('day');
    anim(sunAnim, [{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.3) rotate(30deg)' }, { transform: 'scale(.95) rotate(-10deg)' }, { transform: 'scale(1) rotate(0)' }], 800);
    sunUntil = now() + 4500;
    svg.classList.add('sunny');
    sparkles(1235, 140, { n: 14, colors: ['#ffd93b', '#fff'], spread: 180 });
    if (raining()) startRainbow();
    // sunbeams down to the garden
    for (let i = 0; i < 5; i++) {
      const g = el('g', { transform: `translate(1235,140) rotate(${100 + i * 14})` }, layer.fx);
      const r = el('rect', { x: 0, y: -10, width: 900, height: 20, rx: 10, fill: '#fff2a0', opacity: 0 }, g);
      const a = anim(r, [{ opacity: 0, transform: 'scaleX(.2)' }, { opacity: 0.45, transform: 'scaleX(1)', offset: 0.3 }, { opacity: 0 }], 1400, { delay: i * 60, fill: 'backwards' });
      if (a) a.onfinish = () => g.remove(); else setTimeout(() => g.remove(), 1500);
    }
    let k = 0, any = false;
    for (const P of PLOTS) {
      if (P.stage >= 2 && P.stage < 4) { any = true; setTimeout(() => grow(P), 300 + k++ * 220); }
      else if (P.stage === 1) setTimeout(() => thirsty(P), 300 + k++ * 120);
      else if (P.stage === 4 && !P.cool) {
        any = true;
        setTimeout(() => {
          if (P.stage !== 4) return;
          P.cool = true; P.vegEl.classList.add('cool');
          Sound.play('pop'); vegWiggle(P);
          sparkles(P.x, P.y - 100, { n: 6, colors: ['#ffd93b', '#fff'], spread: 80, size: 12 });
        }, 300 + k++ * 220);
      } else if (P.stage === 4) setTimeout(() => vegWiggle(P), 300 + k++ * 150);
    }
    if (!any && !PLOTS.some(P => P.stage === 1) && now() - Voice.last > 1500) setTimeout(() => say(['Sunshine!', 'Warm and sunny!']), 400);
    await wait(4500);
    if (!sunny()) svg.classList.remove('sunny');
  }
  function startRainbow() {
    const was = rainbowUp();
    rainbowUntil = now() + 11000;
    svg.classList.add('rainbow');
    if (!was) {
      Sound.play('rainbow');
      sparkles(1000, 250, { n: 30, colors: RAINBOW, spread: 400, size: 18, dur: 1400 });
      setTimeout(() => say(['A rainbow! Wow!', 'Rainbow! Look!'], { pitch: 1.9 }), 300);
    }
  }
  function tapCloud() {
    Sound.play('rain');
    anim(cloudAnim, [{ transform: 'scale(1)' }, { transform: 'scale(1.15,.85)' }, { transform: 'scale(.95,1.05)' }, { transform: 'scale(1)' }], 450);
    rainUntil = Math.max(rainUntil, now() + 2600);
  }

  /* drops falling from the cloud and the can, and the soaking they do */
  function drop(x, y, toY, color) {
    const g = el('g', { transform: `translate(${x.toFixed(0)},${y.toFixed(0)})` }, layer.fx);
    const d = el('path', { d: 'M0 -13 Q9 0 0 7 Q-9 0 0 -13Z', fill: color || '#5ab8f0' }, g);
    const dist = Math.max(30, toY - y);
    const a = anim(d, [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${dist}px)`, opacity: 0.9, offset: 0.92 }, { transform: `translateY(${dist}px) scale(1.8,.3)`, opacity: 0 }], 180 + dist * 0.9, { easing: 'ease-in' });
    if (a) a.onfinish = () => g.remove(); else setTimeout(() => g.remove(), 600);
  }
  const canTip = () => {
    const a = (drag && drag.kind === 'can' ? drag.tilt : 0) * Math.PI / 180;
    const [px, py] = [122, -62];
    return { x: canPos.x + px * Math.cos(a) - py * Math.sin(a), y: canPos.y + px * Math.sin(a) + py * Math.cos(a) };
  };
  const plotBelow = (x, y) => PLOTS.filter(P => Math.abs(x - P.x) < 110 && P.y > y - 40).sort((a, b) => a.y - b.y)[0] || null;

  let lastFrame = performance.now(), dropT = 0, canDropT = 0, rainSnd = 0, pourSnd = 0;
  function frame(t) {
    const dt = Math.min(0.1, (t - lastFrame) / 1000);
    lastFrame = t;
    if (App.current === 'bunny') {
      const r = raining();
      svg.classList.toggle('raining', r);
      if (r) {
        if (sunny()) startRainbow();
        dropT += dt;
        while (dropT > 0.035) {
          dropT -= 0.035;
          const x = cloudPos.x + rand(-105, 105);
          const P = plotBelow(x, cloudPos.y + 40);
          const toY = P ? P.y - rand(0, 20) : (nearBunny({ x, y: 600 }) ? rand(420, 620) : rand(760, 860));
          drop(x, cloudPos.y + 50, toY);
        }
        if (t - rainSnd > 700) { rainSnd = t; Sound.play('rain'); }
        // everything under the cloud gets soaked
        PLOTS.forEach(P => { if (Math.abs(P.x - cloudPos.x) < 125) water(P, dt, 'rain'); });
        if (Math.abs(BUN.x - cloudPos.x) < 150) wetBunny(dt);
      }
      if (drag && drag.kind === 'can' && drag.moved) {
        const tip = canTip();
        canDropT += dt;
        const P = plotBelow(tip.x, tip.y);
        const toY = P ? P.y - rand(0, 16) : (nearBunny(tip) ? tip.y + 60 : Math.max(tip.y + 60, 820));
        while (canDropT > 0.05) { canDropT -= 0.05; drop(tip.x + rand(-14, 14), tip.y + 6, toY, '#7fcbff'); }
        if (t - pourSnd > 260) { pourSnd = t; Sound.play('pour'); }
        if (P) water(P, dt, 'can');
        else if (nearBunny({ x: tip.x, y: tip.y + 40 })) wetBunny(dt);
      }
      if (!rainbowUp() && svg.classList.contains('rainbow')) svg.classList.remove('rainbow');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- the other little things to tap ---------- */
  function tapBird(hit) {
    Sound.play('chirp');
    anim(hit.querySelector('.anim'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-40px) rotate(-10deg)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-20px)' }, { transform: 'translateY(0)' }], 700);
    anim(hit.querySelector('.wing'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-40deg)' }, { transform: 'rotate(0)' }, { transform: 'rotate(-40deg)' }, { transform: 'rotate(0)' }], 500);
    sparkles(1360, 380, { n: 4, colors: ['#5cb3ff', '#fff'], spread: 60, size: 10 });
  }
  function tapPlot(P) {
    if (P.stage === 0) {
      // a wiggly worm says hello
      Sound.play('squeak', 2);
      const g = el('g', { transform: `translate(${P.x + rand(-40, 40)},${P.y - 4})` }, layer.fx);
      const w = el('g', {}, g);
      w.innerHTML = '<path d="M0 0 Q-10 -24 0 -44 Q10 -60 0 -70" stroke="#ff9fb0" stroke-width="18" fill="none" stroke-linecap="round"/><circle cx="-4" cy="-72" r="3.5" fill="#2a2a2a"/><circle cx="6" cy="-70" r="3.5" fill="#2a2a2a"/>';
      const a = anim(w, [{ transform: 'translateY(40px) scaleY(0)' }, { transform: 'translateY(0) scaleY(1.1) rotate(-8deg)', offset: 0.25 }, { transform: 'rotate(8deg)', offset: 0.5 }, { transform: 'rotate(-6deg)', offset: 0.7 }, { transform: 'translateY(40px) scaleY(0)' }], 1600, { fill: 'forwards' });
      if (a) a.onfinish = () => g.remove(); else setTimeout(() => g.remove(), 1600);
      anim(P.dirt, [{ transform: 'scale(1)' }, { transform: 'scale(1.08,.9)' }, { transform: 'scale(1)' }], 250);
      return;
    }
    if (P.stage === 4) {
      Sound.play('squeak', 3); vegWiggle(P);
      bubble('veg', P.x, P.y - 230, `${VEG[P.type].name}!`);
      Voice.say(`${P.rainbow ? 'Rainbow ' : ''}${VEG[P.type].name}!`, { pitch: 1.5 });
      return;
    }
    Sound.play('chime', P.stage + P.i % 3);
    anim(P.plant, [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], 500);
    if (P.stage === 1) thirsty(P);
  }

  /* ---------- input: tap things, drag packets, veggies, the can and the cloud ---------- */
  let drag = null;
  const canPos = { x: CAN_HOME.x, y: CAN_HOME.y };
  const setCan = () => can.setAttribute('transform', `translate(${canPos.x.toFixed(1)},${canPos.y.toFixed(1)})`);
  let lastInput = performance.now(), hints = 0;
  const capture = e => { try { svg.setPointerCapture(e.pointerId); } catch (err) {} };

  function grabSticker(s, e, p) {
    s.held = true;
    s.el.classList.add('held');
    stickersG.appendChild(s.el);
    drag = { kind: 'sticker', id: e.pointerId, s, ox: p.x - s.x, oy: p.y - s.y, cx: e.clientX, cy: e.clientY, moved: false };
  }
  svg.addEventListener('pointerdown', e => {
    lastInput = performance.now(); hints = 0;
    if (drag && e.isPrimary && drag.id !== e.pointerId) endDrag({ pointerId: drag.id, cancel: true });
    if (drag) return;
    const hit = e.target.closest('[data-act]');
    if (!hit) return;
    const act = hit.dataset.act;
    const p = toSvg(e.clientX, e.clientY);
    if (act === 'sticker') {
      const s = hit.__s;
      if (!s || s.locked || s.held) return;
      e.preventDefault(); capture(e);
      grabSticker(s, e, p);
      Sound.play('pop');
      return;
    }
    if (act === 'plot') {
      const P = PLOTS[+hit.dataset.i];
      if (P.stage === 4) { capture(e); drag = { kind: 'pull', id: e.pointerId, P, cx: e.clientX, cy: e.clientY, moved: false }; return; }
      tapPlot(P);
      return;
    }
    if (act === 'can') {
      capture(e);
      drag = { kind: 'can', id: e.pointerId, ox: p.x - canPos.x, oy: p.y - canPos.y, cx: e.clientX, cy: e.clientY, moved: false, tilt: 0 };
      can.parentNode.appendChild(can); svg.appendChild(layer.fx); svg.appendChild(layer.bubbles);
      return;
    }
    if (act === 'cloud') {
      capture(e);
      drag = { kind: 'cloud', id: e.pointerId, ox: p.x - cloudPos.x, oy: p.y - cloudPos.y, cx: e.clientX, cy: e.clientY, moved: false };
      return;
    }
    if (act === 'belly' || act === 'bunny') tapBelly();
    else if (act === 'bunny-head') tapHead();
    else if (act === 'ear') tapEars();
    else if (act === 'sun') tapSun();
    else if (act === 'bird') tapBird(hit);
  });

  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    lastInput = performance.now();
    if (!drag.moved && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) > 12) {
      drag.moved = true;
      if (drag.kind === 'pull') {
        // pull the veggie out and keep holding it
        const P = drag.P, s = pullOut(P);
        const p = toSvg(e.clientX, e.clientY);
        grabSticker(s, e, p);
        drag.moved = true;
        s.x = p.x; s.y = p.y - 30; drag.ox = 0; drag.oy = 30; setPos(s);
        return;
      }
      if (drag.kind === 'can') Sound.play('pop');
    }
    if (!drag.moved) return;
    const p = toSvg(e.clientX, e.clientY), vb = visibleBox(30);
    if (drag.kind === 'sticker') {
      const s = drag.s;
      s.x = clamp(p.x - drag.ox, vb.x0, vb.x1); s.y = clamp(p.y - drag.oy, vb.y0, vb.y1);
      setPos(s);
      mouth('eager', s.kind === 'veg' && nearBunny(s));
    } else if (drag.kind === 'can') {
      canPos.x = clamp(p.x - drag.ox, vb.x0 + 40, vb.x1 - 120); canPos.y = clamp(p.y - drag.oy, vb.y0 + 60, vb.y1 - 40);
      drag.tilt = 38;
      setCan();
      canTilt.setAttribute('transform', `rotate(${drag.tilt})`);
    } else if (drag.kind === 'cloud') {
      cloudPos.x = clamp(p.x - drag.ox, Math.max(vb.x0, 250), Math.min(vb.x1, 1400) - 60);
      cloudPos.y = clamp(p.y - drag.oy, Math.max(vb.y0, 0) + 60, 330);
      setCloud();
    }
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.kind === 'pull') { if (!e.cancel) tapPlot(d.P); return; }
    if (d.kind === 'can') {
      canTilt.setAttribute('transform', 'rotate(0)');
      if (!d.moved) {
        Sound.play('splash');
        anim(canAnim, [{ transform: 'translateY(0)' }, { transform: 'translateY(-30px) rotate(-8deg)' }, { transform: 'translateY(0) rotate(6deg)' }, { transform: 'translateY(0)' }], 500);
        sparkles(canPos.x + 120, canPos.y - 70, { n: 6, colors: ['#bfefff', '#5cb3ff', '#fff'], spread: 60, size: 10, shape: 'drop' });
        return;
      }
      // the can hops back home
      const x0 = canPos.x, y0 = canPos.y;
      tween(450, t => { canPos.x = lerp(x0, CAN_HOME.x, t); canPos.y = lerp(y0, CAN_HOME.y, t) - Math.sin(Math.PI * t) * 60; setCan(); }).then(() => Sound.play('land'));
      return;
    }
    if (d.kind === 'cloud') {
      if (!d.moved) tapCloud();
      else rainUntil = Math.max(rainUntil, now() + 1200);
      return;
    }
    const s = d.s;
    s.held = false;
    s.el.classList.remove('held');
    mouth('eager', false);
    if (!s.el.isConnected || e.cancel) return;
    if (!d.moved) { stickerTap(s); return; }
    if (nearBunny(s) && !bunnyBusy) { if (s.kind === 'veg') eat(s); else sniffPacket(s); return; }
    const P = plotAt(s);
    if (P && P.stage === 0) {
      if (s.kind === 'packet') {
        // sprinkle the seeds in
        s.locked = true;
        const x0 = s.x, y0 = s.y;
        tween(260, t => { s.x = lerp(x0, P.x, t); s.y = lerp(y0, P.y - 120, t); setPos(s); }).then(() => {
          anim(s.anim, [{ transform: 'rotate(0)' }, { transform: 'rotate(120deg)' }, { transform: 'rotate(110deg)' }, { transform: 'rotate(130deg)' }], 450, { fill: 'forwards' });
          Sound.play('shake');
          for (let i = 0; i < 6; i++) setTimeout(() => drop(P.x + rand(-40, 40), P.y - 90, P.y - 8, '#c9a35a'), i * 50);
          setTimeout(() => { removeSticker(s, true); plant(P, s.type, s.magic); }, 480);
        });
        return;
      }
      // a picked veggie goes back into its bed
      removeSticker(s, false);
      Object.assign(P, { type: s.type, stage: 4, giant: s.giant, cool: s.cool, rainbow: s.rainbow, wet: 0, lastGrow: performance.now() });
      drawPlant(P); popPlant(P);
      Sound.play('plop');
      return;
    }
    if (P && P.stage > 0 && s.kind === 'packet') {
      Sound.play('bonk');
      bounceAway(s, freeSpot());
      return;
    }
    const other = stickerUnder(s);
    if (other) { stickerMeet(s, other); return; }
    Sound.play('land');
    anim(s.anim, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.15,.85)' }, { transform: 'scale(1,1)' }], 250);
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', e => endDrag({ pointerId: e.pointerId, cancel: true }));

  /* ---------- little bits of life, and gentle hints when nothing happens ---------- */
  setInterval(() => {
    if (App.current !== 'bunny') return;
    const ripe = PLOTS.filter(P => P.stage === 4);
    if (ripe.length && Math.random() < 0.5) vegWiggle(pick(ripe));
    const idle = stickers.filter(s => !s.held && !s.locked);
    if (idle.length && Math.random() < 0.5) anim(pick(idle).anim, [{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], 500);
  }, 2600);
  setInterval(() => {
    if (App.current !== 'bunny' || performance.now() - lastInput < 11000 || hints >= 3 || bunnyBusy || drag) return;
    lastInput = performance.now(); hints++;
    const packets = stickers.filter(s => s.kind === 'packet' && !s.locked);
    const empty = PLOTS.filter(P => P.stage === 0), growing = PLOTS.filter(P => P.stage > 0 && P.stage < 4), ripe = PLOTS.filter(P => P.stage === 4);
    if (ripe.length) {
      // ripe veggies jump up and down: pick me!
      ripe.forEach((P, i) => setTimeout(() => vegWiggle(P), i * 150));
      if (stickers.length < 2) say(['Pull a veggie for me!', 'I\'m hungry!']);
    } else if (growing.length) {
      anim(canAnim, [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-36px) rotate(-10deg)' }, { transform: 'translateY(0) rotate(8deg)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], 900);
      Sound.play('splash');
      growing.forEach(P => P.stage === 1 && thirsty(P));
    } else if (packets.length && empty.length) {
      packets.forEach((s, i) => setTimeout(() => anim(s.anim, [{ transform: 'translateY(0)' }, { transform: 'translateY(-30px) rotate(-8deg)' }, { transform: 'translateY(0)' }], 500), i * 120));
      empty.forEach(P => anim(P.dirt, [{ transform: 'scale(1)' }, { transform: 'scale(1.08,.9)' }, { transform: 'scale(1)' }, { transform: 'scale(1.08,.9)' }, { transform: 'scale(1)' }], 700));
      Sound.play('boing');
    } else {
      Sound.play('hop');
      hopBunny(60, 650);
      anim(bellyGlow, [{ opacity: 0 }, { opacity: 0.5 }, { opacity: 0 }, { opacity: 0.5 }, { opacity: 0 }], 1600);
    }
  }, 1000);

  App.register({
    id: 'bunny',
    screen: svg,
    enter() {
      lastInput = performance.now(); hints = 0;
      Sound.setMood('garden');
      const anyPlants = PLOTS.some(P => P.stage > 0);
      setTimeout(() => say(anyPlants ? ['Welcome back to my garden!', 'Hello again!'] : ['Hello! Tickle my pocket for seeds!', "Let's grow some veggies!"]), 500);
    },
    leave() { if (drag) endDrag({ pointerId: drag.id, cancel: true }); },
    clear() {
      [...stickers].forEach(s => removeSticker(s, true));
      PLOTS.forEach(resetPlot);
    },
  });

  // a tiny hook so automated play-tests can drive the game
  window.__bunny = { PLOTS, stickers, spawnPacket, plant, grow, water, tapSun, tapCloud, startRainbow, eat, react, makeSticker, VEG, get drag() { return drag; } };
})();
