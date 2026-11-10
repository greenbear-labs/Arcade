// Spotlight Rush: real-time auto battle. The crew attack on their own; the player decides WHEN each crew
// member fires her skill (tap her portrait). Three skills in quick succession build a Showstopper chain.
// Enemies telegraph a big attack a few seconds ahead, so shields, stuns and heals have a right moment.
"use strict";

const CHAIN_WINDOW = 4;     // seconds between skills to keep the chain going
const SHOW_TIME = 6;        // Showstopper length (seconds)
const SHOW_MULT = 2;        // Showstopper damage and charge multiplier
const BIG_EVERY = 3;        // every Nth enemy action is the telegraphed big move
const WINDUP = 2.4;         // seconds of warning before a big move lands

const app = document.getElementById("app");
const foesEl = document.getElementById("foes");
const rowEl = document.getElementById("crewrow");
const waveEl = document.getElementById("wave");
const chainEl = document.getElementById("chain");
const tipEl = document.getElementById("tip");

const stageIdx = getStage();
const stage = STAGES[stageIdx];
const scale = 1 + 0.25 * stageIdx, atkScale = 1 + 0.12 * stageIdx;
const HP_MULT = 2.4, ATK_MULT = 2.0;   // Rush fights are real time, so enemies need more health than in Match
document.getElementById("bg").style.backgroundImage = "url(" + bgUrl(stage.bg) + ")";

const squad = getSquad().map((id) => {
  const c = CREW[id];
  return { id, c, hp: c.hp, maxHp: c.hp, charge: 0.35 + Math.random() * 0.2, timer: Math.random(), shield: 0, shieldT: 0 };
});
let enemies = [], wave = -1, focus = null;
let time = 0, speed = 1, auto = store.get("rush.auto", false), over = false, slowmo = 0;
let chain = 0, lastSkill = -99, showT = 0, buffT = 0, buffMult = 1, started = false;

// ---------- crew row and cards ----------
const unitEls = squad.map((u) => {
  const d = el("div", "unit", rowEl);
  const img = el("img", "", d); img.src = spriteUrl(u.id); img.alt = u.c.name;
  return d;
});
const cards = buildCards(app, squad.map((u) => u.id), (i) => fireSkill(i));

// ---------- waves ----------
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
    const e = { key, d, node, hpBar, intent, hp: Math.round(d.hp * scale * HP_MULT), maxHp: Math.round(d.hp * scale * HP_MULT), atk: d.atk * atkScale * ATK_MULT,
      timer: d.every * (0.6 + Math.random() * 0.5), actions: 0, windup: 0, stun: 0 };
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

// ---------- damage ----------
function dmgMult() { return (showT > 0 ? SHOW_MULT : 1) * (buffT > 0 ? buffMult : 1); }
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
    if (focus === e) focus = null;
    if (!alive(enemies).length) setTimeout(nextWave, 900);
  }
}
function hurtCrew(u, amount, idx) {
  if (u.hp <= 0) return;
  amount = Math.round(amount);
  if (u.shield > 0) {
    const s = Math.min(u.shield, amount);
    u.shield -= s; amount -= s;
    if (!amount) { const p = centerOf(app, unitEls[idx]); floatText(app, p.x, p.y, "BLOCK", "info"); return; }
  }
  u.hp = Math.max(0, u.hp - amount);
  u.charge = Math.min(1, u.charge + 0.03);
  const n = unitEls[idx];
  n.classList.remove("hurt"); void n.offsetWidth; n.classList.add("hurt");
  const p = centerOf(app, n);
  floatText(app, p.x, p.y, amount, "hurt");
  if (u.hp <= 0) { n.classList.add("down"); banner(app, u.c.name + " is down", ""); }
  if (!alive(squad).length) end(false);
}
function healCrew(u, amount, idx) {
  if (u.hp <= 0) return;
  amount = Math.round(Math.min(amount, u.maxHp - u.hp));
  u.hp += amount;
  const p = centerOf(app, unitEls[idx]);
  if (amount > 0) floatText(app, p.x, p.y, "+" + amount, "heal");
}

// ---------- skills ----------
function fireSkill(i) {
  const u = squad[i];
  if (over || !started || u.hp <= 0 || u.charge < 1 || !alive(enemies).length) return;
  u.charge = 0;
  hideTip();
  // Chain: skills close together build up to a Showstopper.
  chain = time - lastSkill <= CHAIN_WINDOW ? chain + 1 : 1;
  lastSkill = time;
  cutIn(app, u.id); sfx.skill();
  slowmo = 0.75;
  setTimeout(() => applySkill(u, i), 520);
  if (chain >= 3) {
    setTimeout(() => { showT = SHOW_TIME; app.classList.add("showtime"); paintChain(); banner(app, "SHOWSTOPPER!", "Double damage"); }, 900);
    chain = 0;
  }
  paintChain();
}
function applySkill(u, i) {
  if (over) return;
  const s = u.c.skill, m = dmgMult(), base = u.c.atk * s.pow * m;
  const t = target();
  switch (s.kind) {
    case "hit": hitEnemy(t, base, "crit"); break;
    case "aoe": {
      const hits = s.hits || 1;
      for (let h = 0; h < hits; h++) setTimeout(() => alive(enemies).forEach((e) => hitEnemy(e, base / hits, "crit")), h * 140);
      if (s.extra === "charge") squad.forEach((o) => { if (o !== u && o.hp > 0) o.charge = Math.min(1, o.charge + 0.2); });
      break;
    }
    case "heal":
      squad.forEach((o, k) => healCrew(o, u.c.atk * s.pow * 1.2, k)); sfx.heal();
      if (s.extra === "cleanse") enemies.forEach((e) => { if (e.windup > 0) { e.windup = 0; e.intent.style.display = "none"; const p = centerOf(app, e.node); floatText(app, p.x, p.y, "CANCELLED", "info"); } });
      break;
    case "shield":
      squad.forEach((o) => { if (o.hp > 0) { o.shield = Math.round(u.c.atk * s.pow * 2); o.shieldT = s.dur; } });
      banner(app, "SHIELDS UP", ""); break;
    case "stun": {
      const list = s.all ? alive(enemies) : [t];
      list.forEach((e) => {
        if (!e) return;
        hitEnemy(e, base, "crit");
        e.stun = s.dur; e.windup = 0; e.intent.style.display = "none";
        const p = centerOf(app, e.node); floatText(app, p.x, p.y - 30, "STUNNED", "info");
      });
      break;
    }
    case "charge":
      squad.forEach((o) => { if (o !== u && o.hp > 0) o.charge = Math.min(1, o.charge + s.pow); });
      banner(app, "AT YOUR SERVICE", "Squad charged"); break;
    case "buff":
      buffT = s.dur; buffMult = s.pow; banner(app, "RELAXED & READY", "Squad damage up"); break;
  }
}
function paintChain() {
  chainEl.textContent = showT > 0 ? "★ SHOW" : "CHAIN ×" + chain;
  chainEl.classList.toggle("hot", chain > 0 && showT <= 0);
  chainEl.classList.toggle("show", showT > 0);
}

// ---------- enemy turns ----------
function enemyAct(e) {
  e.actions++;
  const targets = alive(squad);
  if (!targets.length) return;
  if (e.actions % BIG_EVERY === 0) {
    e.windup = WINDUP;
    e.intent.style.display = "block";
    return;
  }
  const u = targets[Math.floor(Math.random() * targets.length)];
  hurtCrew(u, e.atk * (0.85 + Math.random() * 0.3), squad.indexOf(u)); sfx.hurt();
  shake(e.node);
}
function bigMove(e) {
  e.intent.style.display = "none";
  banner(app, e.d.big.toUpperCase(), e.d.name);
  shake(app);
  sfx.hurt();
  squad.forEach((u, k) => hurtCrew(u, e.atk * 1.6, k));
}

// ---------- auto mode: fires skills sensibly ----------
function autoPlay() {
  squad.forEach((u, i) => {
    if (u.hp <= 0 || u.charge < 1) return;
    const k = u.c.skill.kind;
    const hurt = squad.some((o) => o.hp > 0 && o.hp / o.maxHp < 0.6);
    const danger = enemies.some((e) => e.hp > 0 && e.windup > 0);
    if (k === "heal" && !hurt && !(u.c.skill.extra === "cleanse" && danger)) return;
    if (k === "shield" && !danger) return;
    fireSkill(i);
  });
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!over && started) {
    if (slowmo > 0) { slowmo -= dt; dt *= 0.12; }
    dt *= speed;
    step(dt);
  }
  render();
  requestAnimationFrame(frame);
}
function step(dt) {
  time += dt;
  if (showT > 0) { showT -= dt; if (showT <= 0) { app.classList.remove("showtime"); paintChain(); } }
  if (buffT > 0) buffT -= dt;
  if (chain > 0 && time - lastSkill > CHAIN_WINDOW) { chain = 0; paintChain(); }
  const foes = alive(enemies);
  squad.forEach((u, i) => {
    if (u.hp <= 0) return;
    if (u.shieldT > 0) { u.shieldT -= dt; if (u.shieldT <= 0) u.shield = 0; }
    u.charge = Math.min(1, u.charge + dt * (0.05 + u.c.spd * 0.004) * (showT > 0 ? SHOW_MULT : 1));
    if (!foes.length) return;
    u.timer -= dt;
    if (u.timer <= 0) {
      u.timer = 1.7 - u.c.spd * 0.045;
      const t = target();
      hitEnemy(t, u.c.atk * (0.9 + Math.random() * 0.2) * dmgMult(), "");
      u.charge = Math.min(1, u.charge + 0.035);
      const n = unitEls[i]; n.classList.remove("atk"); void n.offsetWidth; n.classList.add("atk");
      sfx.hit();
    }
  });
  foes.forEach((e) => {
    if (e.stun > 0) { e.stun -= dt; return; }
    if (e.windup > 0) {
      e.windup -= dt;
      e.intent.textContent = "⚠ " + e.d.big.toUpperCase() + " " + Math.max(0, e.windup).toFixed(1);
      if (e.windup <= 0) bigMove(e);
      return;
    }
    e.timer -= dt;
    if (e.timer <= 0) { e.timer = e.d.every * (0.85 + Math.random() * 0.3); enemyAct(e); }
  });
  if (auto) autoPlay();
}
function render() {
  squad.forEach((u, i) => {
    paintCard(cards[i], u, u.charge);
    unitEls[i].classList.toggle("shielded", u.shield > 0 && u.hp > 0);
  });
}

function nextWave() {
  if (over) return;
  if (wave + 1 >= stage.waves.length) return end(true);
  spawnWave();
}
function end(won) {
  if (over) return;
  over = true;
  const downs = squad.filter((u) => u.hp <= 0).length;
  const stars = won ? (downs === 0 ? 3 : downs <= 1 ? 2 : 1) : 0;
  if (won) { saveResult("rush", stageIdx, stars); sfx.win(); } else sfx.lose();
  setTimeout(() => {
    const o = el("div", "overlay", app);
    el("h2", "", o, won ? "VICTORY" : "DEFEAT");
    if (won) el("div", "stars", o, "★".repeat(stars) + "☆".repeat(3 - stars));
    el("p", "", o, won ? stage.name + " cleared in " + Math.round(time) + "s." + (downs ? " " + downs + " crew went down." : " Nobody went down!")
      : "The crew needs a breather. Try firing shields and stuns just before the big telegraphed attacks.");
    const again = el("button", "big", o, "Play again"); again.onclick = () => location.reload();
    if (won && stageIdx + 1 < STAGES.length) { const n = el("button", "big alt", o, "Next stage"); n.onclick = () => { store.set("stage", stageIdx + 1); location.href = "rush.html?stage=" + (stageIdx + 1); }; }
    const back = el("button", "big alt", o, "Battle Lab"); back.onclick = () => { location.href = "index.html"; };
  }, 900);
}

let tipHidden = false;
function hideTip() { if (!tipHidden) { tipHidden = true; tipEl.style.opacity = 0; } }

// ---------- controls ----------
const autoBtn = document.getElementById("auto"), speedBtn = document.getElementById("speed"), muteBtn = document.getElementById("mute");
autoBtn.classList.toggle("on", auto);
autoBtn.onclick = () => { auto = !auto; store.set("rush.auto", auto); autoBtn.classList.toggle("on", auto); };
speedBtn.onclick = () => { speed = speed === 1 ? 2 : 1; speedBtn.textContent = speed + "x"; speedBtn.classList.toggle("on", speed === 2); };
muteBtn.classList.toggle("on", !sfx.muted);
muteBtn.onclick = () => muteBtn.classList.toggle("on", !sfx.toggle());
window.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "4") fireSkill(+e.key - 1);
  else if (e.key === "Tab" && enemies.length) { e.preventDefault(); const a = alive(enemies); focus = a[(a.indexOf(focus) + 1) % a.length]; paintFocus(); }
});

ageGate(() => {
  spawnWave();
  setTimeout(() => { started = true; last = performance.now(); }, 900);
  setTimeout(hideTip, 9000);
  requestAnimationFrame(frame);
});
