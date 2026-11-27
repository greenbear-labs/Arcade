// Encore: a rhythm battle. Four lanes, one per crew member; notes fall to the ring on the beat.
// Hitting a note makes that crew member attack. Perfect hits and long combos hit harder and charge her skill.
// When her meter is full, her next note turns gold: hit it to fire her skill. Before a big enemy attack,
// red guard notes drop in every lane on the landing beat; each one you hit blocks a quarter of the damage.
"use strict";

const BPM = 112;
const BEAT = 60 / BPM;
const LEAD = 1.7;            // seconds a note takes to fall to the ring
const PERFECT = 0.075, GOOD = 0.15;
const HP_MULT = 1.7, ATK_MULT = 1.5;
const KEYS = ["d", "f", "j", "k"];

const app = document.getElementById("app");
const foesEl = document.getElementById("foes");
const lanesEl = document.getElementById("lanes");
const waveEl = document.getElementById("wave");
const accEl = document.getElementById("acc");
const comboEl = document.getElementById("combo");
const tipEl = document.getElementById("tip");

const stageIdx = getStage();
const stage = STAGES[stageIdx];
const scale = 1 + 0.25 * stageIdx, atkScale = 1 + 0.12 * stageIdx;
document.getElementById("bg").style.backgroundImage = "url(" + bgUrl(stage.bg) + ")";

const squad = getSquad().map((id) => ({ id, c: CREW[id], hp: CREW[id].hp, maxHp: CREW[id].hp, charge: 0.2, shield: 0, starQueued: false }));
let enemies = [], wave = -1, focus = null, over = false, started = false;
let combo = 0, maxCombo = 0, counts = { p: 0, g: 0, m: 0 }, buffBeats = 0;
let notes = [], nextBeat = 0, liveBeat = 0, guardBeat = -1, guardBlock = 0, pendingBig = null;

// ---------- lanes ----------
const laneEls = squad.map((u, i) => {
  const l = el("div", "lane", lanesEl);
  el("div", "hitline", l);
  el("div", "ring", l).style.borderColor = DEPTS[u.c.dept].color;
  l.addEventListener("pointerdown", (e) => { e.preventDefault(); press(i); });
  return l;
});
const cards = buildCards(app, squad.map((u) => u.id), (i) => press(i));
cards.forEach((c, i) => { c.node.querySelector(".key").textContent = KEYS[i].toUpperCase(); });

// ---------- clock and music (synthesized, scheduled on the audio clock) ----------
let ctx = null, t0Audio = 0, t0Perf = 0, scheduled = 0, musicOn = !sfx.muted;
function now() { return (performance.now() - t0Perf) / 1000; }
function startClock() {
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); t0Audio = ctx.currentTime + 0.15; } catch (e) { ctx = null; }
  t0Perf = performance.now() + 150;
}
const BASS = [55, 55, 65.4, 49];   // A, A, C, G: one note per bar
function scheduleMusic() {
  if (!ctx || !musicOn) return;
  const horizon = now() + 0.6;
  while (scheduled * BEAT / 2 < horizon) {
    const t = t0Audio + scheduled * BEAT / 2, half = scheduled;
    if (half % 2 === 0) drum(t, 150, 0.32, 0.5);                 // kick on the beat
    else drum(t, 6000, 0.05, 0.12, true);                         // hat on the off-beat
    if (half % 8 === 0) bass(t, BASS[(half / 8) % 4], BEAT * 3.6);
    scheduled++;
  }
}
function drum(t, f, dur, vol, noise) {
  const g = ctx.createGain(); g.gain.setValueAtTime(vol * 0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(ctx.destination);
  if (noise) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = f;
    s.buffer = b; s.connect(hp); hp.connect(g); s.start(t);
  } else {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(45, t + dur); o.connect(g); o.start(t); o.stop(t + dur);
  }
}
function bass(t, f, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = "sawtooth"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 420;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur);
}

// ---------- chart: generated beat by beat, denser on later stages ----------
function liveLanes() { return squad.map((u, i) => (u.hp > 0 ? i : -1)).filter((i) => i >= 0); }
function chartBeat(b) {
  const lanes = liveLanes();
  if (!lanes.length) return;
  const time = b * BEAT;
  if (b === guardBeat) { lanes.forEach((i) => addNote(i, time, "guard")); return; }
  if (b % 16 >= 14) return;                                    // a short breath every 4 bars
  const pick = () => lanes[Math.floor(Math.random() * lanes.length)];
  const a = pick();
  addNote(a, time);
  if (stageIdx >= 1 && b % 4 === 2 && lanes.length > 1) { let c = pick(); if (c === a) c = lanes[(lanes.indexOf(a) + 1) % lanes.length]; addNote(c, time); }
  if (stageIdx >= 2 && b % 2 === 1 && Math.random() < 0.45) addNote(pick(), time + BEAT / 2);
}
function addNote(lane, time, kind) {
  const u = squad[lane];
  if (!kind && u.charge >= 1 && !u.starQueued) { kind = "star"; u.starQueued = true; }
  const n = el("div", "note" + (kind ? " " + kind : ""), laneEls[lane]);
  if (kind !== "guard") n.style.backgroundImage = "url(" + faceUrl(u.id) + ")";
  n.style.borderColor = kind ? "" : DEPTS[u.c.dept].color;
  notes.push({ lane, time, kind, node: n, done: false });
}

// ---------- input and judging ----------
function press(lane) {
  if (over || !started) return;
  hideTip();
  if (squad[lane].hp <= 0) return;
  const t = now();
  let best = null;
  notes.forEach((n) => { if (!n.done && n.lane === lane && Math.abs(n.time - t) <= GOOD && (!best || Math.abs(n.time - t) < Math.abs(best.time - t))) best = n; });
  laneEls[lane].classList.add("flash"); setTimeout(() => laneEls[lane].classList.remove("flash"), 90);
  if (!best) return;
  const perfect = Math.abs(best.time - t) <= PERFECT;
  judge(best, perfect ? "p" : "g");
}
function judge(n, grade) {
  n.done = true; n.node.remove();
  counts[grade]++;
  const lane = n.lane, u = squad[lane];
  const j = el("div", "judge " + grade, laneEls[lane], grade === "p" ? "PERFECT" : grade === "g" ? "GOOD" : "MISS");
  setTimeout(() => j.remove(), 460);
  if (grade === "m") {
    combo = 0;
    if (n.kind === "star") u.starQueued = false;
    paintCombo(); return;
  }
  combo++; maxCombo = Math.max(maxCombo, combo); paintCombo();
  sfx.match(grade === "p" ? 4 : 2);
  if (n.kind === "guard") { guardBlock += grade === "p" ? 0.25 : 0.15; return; }
  if (n.kind === "star") { u.starQueued = false; fireSkill(lane); return; }
  const mult = (grade === "p" ? 1.4 : 1) * (1 + Math.min(combo, 50) / 50) * (buffBeats > 0 ? 1.5 : 1);
  hitEnemy(target(), u.c.atk * mult, grade === "p" ? "crit" : "");
  u.charge = Math.min(1, u.charge + (grade === "p" ? 0.11 : 0.07) * (0.8 + u.c.spd / 40));
}
function paintCombo() {
  comboEl.innerHTML = combo >= 5 ? combo + "<small>COMBO</small>" : "";
  const total = counts.p + counts.g + counts.m;
  accEl.textContent = total ? Math.round(((counts.p + counts.g * 0.6) / total) * 100) + "%" : "100%";
}

// ---------- enemies ----------
function spawnWave() {
  wave++;
  foesEl.innerHTML = "";
  enemies = stage.waves[wave].map((key) => {
    const d = ENEMIES[key];
    const node = el("div", "enemy" + (d.boss ? " boss" : ""), foesEl);
    const img = el("img", "", node); img.src = enemyUrl(key); img.alt = d.name;
    el("div", "name", node, d.name);
    const bar = el("div", "bar foe", node); const hpBar = el("i", "", bar);
    const intent = el("div", "intent", node); intent.style.display = "none";
    const hp = Math.round(d.hp * scale * HP_MULT);
    const e = { key, d, node, hpBar, intent, hp, maxHp: hp, atk: d.atk * atkScale * ATK_MULT, next: liveBeat + d.turns * 2 + Math.floor(Math.random() * 3), actions: 0, stun: 0 };
    node.addEventListener("pointerdown", (ev) => { ev.preventDefault(); focus = e; paintFocus(); });
    return e;
  });
  focus = null; paintFocus();
  waveEl.textContent = "W" + (wave + 1) + "/" + stage.waves.length;
  const boss = enemies.find((e) => e.d.boss);
  banner(app, boss ? "BOSS" : "WAVE " + (wave + 1), boss ? boss.d.name : stage.name);
}
function alive(list) { return list.filter((x) => x.hp > 0); }
function target() { return focus && focus.hp > 0 ? focus : alive(enemies)[0]; }
function paintFocus() { enemies.forEach((e) => e.node.classList.toggle("target", e === focus && e.hp > 0)); }
function hitEnemy(e, amount, cls) {
  if (!e || e.hp <= 0) return;
  amount = Math.round(amount);
  e.hp = Math.max(0, e.hp - amount);
  e.hpBar.style.width = (e.hp / e.maxHp) * 100 + "%";
  e.node.classList.remove("hit"); void e.node.offsetWidth; e.node.classList.add("hit");
  const p = centerOf(app, e.node);
  floatText(app, p.x + (Math.random() - 0.5) * 40, p.y, amount, cls);
  if (e.hp <= 0) {
    e.node.classList.add("dead"); e.intent.style.display = "none";
    if (pendingBig && pendingBig.e === e) { pendingBig = null; guardBeat = -1; }
    if (focus === e) focus = null;
    if (!alive(enemies).length) setTimeout(nextWave, 900);
  }
}
function hurtCrew(u, amount) {
  if (u.hp <= 0) return;
  amount = Math.round(amount);
  const i = squad.indexOf(u);
  if (u.shield > 0) { const s = Math.min(u.shield, amount); u.shield -= s; amount -= s; }
  if (amount <= 0) { const p = centerOf(app, cards[i].node); floatText(app, p.x, p.y, "BLOCK", "info"); return; }
  u.hp = Math.max(0, u.hp - amount);
  const p = centerOf(app, cards[i].node); floatText(app, p.x, p.y, amount, "hurt");
  shake(cards[i].node);
  if (u.hp <= 0) {
    laneEls[i].classList.add("down"); banner(app, u.c.name + " is down", "Her lane goes quiet");
    notes.forEach((n) => { if (n.lane === i && !n.done) { n.done = true; n.node.remove(); } });
  }
  if (!alive(squad).length) end(false);
}
function enemyBeat(b) {
  alive(enemies).forEach((e) => {
    if (pendingBig && pendingBig.e === e) {
      const left = guardBeat - b;
      e.intent.textContent = "⚠ " + e.d.big.toUpperCase() + " IN " + Math.max(0, left);
      if (b >= guardBeat + 1) bigMove(e);
      return;
    }
    if (b < e.next) return;
    if (e.stun > 0) { e.stun--; e.next = b + 2; return; }
    e.actions++;
    e.next = b + e.d.turns * 2 + Math.floor(Math.random() * 2);
    if (e.actions % 3 === 0 && !pendingBig) {
      // Telegraph: guard notes land 6 beats from now, and the attack hits just after.
      guardBeat = b + 6; guardBlock = 0; pendingBig = { e };
      e.intent.style.display = "block";
      return;
    }
    const t = alive(squad); if (!t.length) return;
    hurtCrew(t[Math.floor(Math.random() * t.length)], e.atk * (0.85 + Math.random() * 0.3)); sfx.hurt();
    shake(e.node);
  });
}
function bigMove(e) {
  e.intent.style.display = "none";
  const block = Math.min(1, guardBlock);
  pendingBig = null; guardBeat = -1;
  banner(app, e.d.big.toUpperCase(), block >= 0.99 ? "Fully blocked!" : Math.round(block * 100) + "% blocked");
  if (block < 0.99) { shake(app); sfx.hurt(); }
  squad.forEach((u) => hurtCrew(u, e.atk * 1.8 * (1 - block)));
}

// ---------- skills ----------
function fireSkill(lane) {
  const u = squad[lane], s = u.c.skill;
  if (u.hp <= 0 || !alive(enemies).length) return;
  u.charge = 0;
  cutIn(app, u.id); sfx.skill();
  setTimeout(() => {
    if (over) return;
    const base = u.c.atk * s.pow * (buffBeats > 0 ? 1.5 : 1) * 1.5, t = target();
    switch (s.kind) {
      case "hit": hitEnemy(t, base, "crit"); break;
      case "aoe": { const hits = s.hits || 1; for (let h = 0; h < hits; h++) setTimeout(() => alive(enemies).forEach((e) => hitEnemy(e, base / hits, "crit")), h * 140);
        if (s.extra === "charge") squad.forEach((o) => { if (o !== u && o.hp > 0) o.charge = Math.min(1, o.charge + 0.25); }); break; }
      case "heal": squad.forEach((o) => { if (o.hp > 0) o.hp = Math.min(o.maxHp, o.hp + Math.round(u.c.atk * s.pow * 1.4)); }); sfx.heal();
        if (s.extra === "cleanse" && pendingBig) { guardBlock = 1; banner(app, "CLEANSED", "Next big attack blocked"); } break;
      case "shield": squad.forEach((o) => { if (o.hp > 0) o.shield = Math.round(u.c.atk * s.pow * 2.2); }); banner(app, "SHIELDS UP", ""); break;
      case "stun": (s.all ? alive(enemies) : [t]).forEach((e) => { if (!e) return; hitEnemy(e, base, "crit"); e.stun = 2;
        if (pendingBig && pendingBig.e === e) { pendingBig = null; guardBeat = -1; e.intent.style.display = "none"; notes.forEach((n) => { if (n.kind === "guard" && !n.done) { n.done = true; n.node.remove(); } }); }
        const p = centerOf(app, e.node); floatText(app, p.x, p.y - 30, "STUNNED", "info"); }); break;
      case "charge": squad.forEach((o) => { if (o !== u && o.hp > 0) o.charge = Math.min(1, o.charge + s.pow); }); banner(app, "AT YOUR SERVICE", "Squad charged"); break;
      case "buff": buffBeats = 16; banner(app, "RELAXED & READY", "Damage up for 4 bars"); break;
    }
  }, 450);
}

// ---------- main loop ----------
function frame() {
  if (!over && started) {
    const t = now();
    scheduleMusic();
    // Chart notes far enough ahead that they fall in from the top of the lane.
    while (nextBeat * BEAT < t + LEAD) {
      if (nextBeat >= 4) chartBeat(nextBeat);
      nextBeat++;
    }
    // Enemies and timers run on the beat that is actually sounding now.
    while (liveBeat * BEAT <= t) {
      enemyBeat(liveBeat);
      if (buffBeats > 0) buffBeats--;
      liveBeat++;
    }
    const h = lanesEl.clientHeight;
    notes.forEach((n) => {
      if (n.done) return;
      const left = n.time - t;
      if (left < -GOOD) { judge(n, "m"); return; }
      n.node.style.bottom = (21 + (left / LEAD) * (h - 21)) + "px";
    });
    notes = notes.filter((n) => !n.done);
  }
  squad.forEach((u, i) => { paintCard(cards[i], u, u.charge); cards[i].node.classList.toggle("shielded", u.shield > 0); });
  requestAnimationFrame(frame);
}

function nextWave() {
  if (over || alive(enemies).length) return;
  if (wave + 1 >= stage.waves.length) return end(true);
  spawnWave();
}
function end(won) {
  if (over) return;
  over = true;
  musicOn = false;
  const downs = squad.filter((u) => u.hp <= 0).length;
  const total = counts.p + counts.g + counts.m;
  const acc = total ? (counts.p + counts.g * 0.6) / total : 1;
  const stars = won ? 1 + (downs === 0 ? 1 : 0) + (acc >= 0.8 ? 1 : 0) : 0;
  if (won) { saveResult("encore", stageIdx, stars); sfx.win(); } else sfx.lose();
  setTimeout(() => {
    const o = el("div", "overlay", app);
    el("h2", "", o, won ? "ENCORE!" : "CURTAIN CALL");
    if (won) el("div", "stars", o, "★".repeat(stars) + "☆".repeat(3 - stars));
    el("p", "", o, "Perfect " + counts.p + " · Good " + counts.g + " · Miss " + counts.m + "<br>Best combo " + maxCombo + " · Accuracy " + Math.round(acc * 100) + "%");
    el("p", "", o, won ? "Stars: the win, nobody down, and 80% accuracy." : "Hit the red ⛨ notes before a big attack to block it, and save stuns for the telegraph.");
    const again = el("button", "big", o, "Play again"); again.onclick = () => location.reload();
    if (won && stageIdx + 1 < STAGES.length) { const n = el("button", "big alt", o, "Next stage"); n.onclick = () => { store.set("stage", stageIdx + 1); location.href = "encore.html?stage=" + (stageIdx + 1); }; }
    const back = el("button", "big alt", o, "Battle Lab"); back.onclick = () => { location.href = "index.html"; };
  }, 900);
}

let tipHidden = false;
function hideTip() { if (!tipHidden) { tipHidden = true; tipEl.style.opacity = 0; } }

const muteBtn = document.getElementById("mute");
muteBtn.classList.toggle("on", !sfx.muted);
muteBtn.onclick = () => { const m = sfx.toggle(); musicOn = !m; muteBtn.classList.toggle("on", !m); if (!m) scheduled = Math.ceil(now() / (BEAT / 2)); };
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const k = KEYS.indexOf(e.key.toLowerCase());
  if (k >= 0) press(k);
  else if (e.key >= "1" && e.key <= "4") press(+e.key - 1);
});

ageGate(() => {
  // Audio needs a tap first, so the run starts from a button.
  const o = el("div", "overlay", app);
  el("h2", "", o, "ENCORE");
  el("p", "", o, stage.name + ". Tap each lane as its note reaches the ring. Keyboard: D F J K.");
  const go = el("button", "big", o, "Start the music");
  go.onclick = () => {
    o.remove();
    startClock();
    spawnWave();
    started = true;
    setTimeout(hideTip, 10000);
  };
  requestAnimationFrame(frame);
});
