// Bridge Tactics: a turn-based grid battle. Every enemy shows exactly which tiles it will hit next turn
// (striped red, with the damage). Move the crew out of danger, or into position, then attack.
// Departments fight differently: Security strikes adjacent foes hard, Bridge Command shoots down straight lines,
// Engineering lobs blasts that splash, Entertainment's hits knock foes back, and Guest Services can heal a neighbour.
// Enemies hit whatever is standing on their tiles when they act, including each other.
// Three guests are stuck on deck. Enemies go for them too; keep them safe by killing, stunning or knocking
// away whoever is aiming at them.
"use strict";

const COLS = 6, ROWS = 8, MOVE = 3;
const HP_MULT = 0.6, ATK_MULT = 1.6;   // turn-based: keep fights to roughly 15-20 turns per stage

const app = document.getElementById("app");
const boardEl = document.getElementById("board");
const wrapEl = document.getElementById("boardwrap");
const statusEl = document.getElementById("status");
const waveEl = document.getElementById("wave");
const turnEl = document.getElementById("turn");
const btn = { skill: document.getElementById("skill"), wait: document.getElementById("wait"), undo: document.getElementById("undo"), end: document.getElementById("end") };

const stageIdx = getStage();
const stage = STAGES[stageIdx];
const scale = 1 + 0.25 * stageIdx, atkScale = 1 + 0.12 * stageIdx;
document.getElementById("bg").style.backgroundImage = "url(" + bgUrl(stage.bg) + ")";

// How each department attacks: range, shape and a damage multiplier.
const STYLE = {
  3: { name: "Melee", range: 1, line: false, mult: 1.45, note: "hits an adjacent foe hard" },
  0: { name: "Line shot", range: 4, line: true, mult: 1.0, note: "shoots down a row or column" },
  2: { name: "Blast", range: 2, line: false, mult: 0.85, splash: 0.5, note: "splashes foes next to the target" },
  4: { name: "Knockback", range: 2, line: false, mult: 0.9, push: true, note: "knocks the target back a tile" },
  1: { name: "Support", range: 1, line: false, mult: 0.8, heal: true, note: "hits an adjacent foe, or heals an adjacent ally" },
};

let cell = 48, turn = 1, wave = -1, over = false, phase = "player", sel = null, mode = null, lastMove = null, buffT = 0;
const crew = getSquad().map((id, i) => ({ id, c: CREW[id], hp: CREW[id].hp, maxHp: CREW[id].hp, charge: 0.25, x: 1 + i, y: ROWS - 1, moved: false, acted: false, shield: 0, crew: true }));
let foes = [];
const guests = [[0, 5], [5, 5], [2, 6]].map(([x, y], i) => ({ x, y, hp: 2, name: ["Duchess", "Senator", "Honeymooners"][i], guest: true }));

// ---------- board ----------
const cells = [];
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  const d = el("div", "cell", boardEl);
  d.addEventListener("pointerdown", (e) => { e.preventDefault(); tapCell(x, y); });
  cells.push(d);
}
function cellAt(x, y) { return cells[y * COLS + x]; }
function layout() {
  const w = wrapEl.clientWidth - 16, h = wrapEl.clientHeight - 12;
  cell = Math.max(30, Math.floor(Math.min(w / COLS, h / ROWS)));
  boardEl.style.width = cell * COLS + "px"; boardEl.style.height = cell * ROWS + "px";
  cells.forEach((d, i) => { const x = i % COLS, y = Math.floor(i / COLS); Object.assign(d.style, { left: x * cell + 1 + "px", top: y * cell + 1 + "px", width: cell - 2 + "px", height: cell - 2 + "px" }); });
  [...crew, ...foes, ...guests].forEach(place);
}
window.addEventListener("resize", layout);

function makePiece(u) {
  const p = el("div", "piece" + (u.crew ? "" : " foe"), boardEl);
  const img = el("img", "", p); img.src = u.crew ? faceUrl(u.id) : enemyUrl(u.key); img.alt = "";
  if (u.crew) img.style.borderColor = DEPTS[u.c.dept].color;
  const bar = el("div", "bar" + (u.crew ? "" : " foe"), p); u.hpBar = el("i", "", bar);
  u.node = p; place(u);
}
function place(u) {
  if (!u.node) return;
  const pad = Math.round(cell * 0.08), size = cell - pad * 2 - (u.boss ? 0 : 0);
  Object.assign(u.node.style, { left: u.x * cell + pad + "px", top: u.y * cell + pad + "px", width: size + "px", height: size + "px" });
  u.hpBar.style.width = Math.max(0, u.hp / u.maxHp) * 100 + "%";
}
guests.forEach((g) => {
  const p = el("div", "piece guest", boardEl);
  el("div", "emoji", p, "🍸");
  const bar = el("div", "bar", p); g.hpBar = el("i", "", bar); g.maxHp = 2;
  g.node = p; place(g);
});
const cards = buildCards(app, crew.map((u) => u.id), (i) => { if (phase === "player" && crew[i].hp > 0) select(crew[i]); });
crew.forEach(makePiece);

// ---------- helpers ----------
const inside = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const living = (l) => l.filter((u) => u.hp > 0);
function unitAt(x, y) { return living(crew).find((u) => u.x === x && u.y === y) || living(foes).find((u) => u.x === x && u.y === y) || living(guests).find((g) => g.x === x && g.y === y) || null; }
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function reach(u, steps) {
  // Tiles u can walk to (4-way), not through other units.
  const seen = new Map([[u.x + "," + u.y, 0]]), q = [[u.x, u.y]], out = [];
  while (q.length) {
    const [x, y] = q.shift(), d = seen.get(x + "," + y);
    if (d >= steps) continue;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (!inside(nx, ny) || seen.has(k) || unitAt(nx, ny)) return;
      seen.set(k, d + 1); q.push([nx, ny]); out.push([nx, ny]);
    });
  }
  return out;
}
function targets(u) {
  // Tiles u can aim at this turn.
  const st = STYLE[u.c.dept], out = [];
  if (st.line) {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      for (let k = 1; k <= st.range; k++) {
        const x = u.x + dx * k, y = u.y + dy * k;
        if (!inside(x, y)) break;
        const o = unitAt(x, y);
        if (o) { if (!o.crew && !o.guest) out.push([x, y]); break; }
      }
    });
  } else {
    living(foes).forEach((f) => { if (dist(u, f) <= st.range) out.push([f.x, f.y]); });
    if (st.heal) living(crew).forEach((c) => { if (c !== u && dist(u, c) === 1 && c.hp < c.maxHp) out.push([c.x, c.y]); });
  }
  return out;
}

// ---------- waves ----------
function spawnWave() {
  wave++;
  foes.forEach((f) => f.node && f.node.remove());
  const keys = stage.waves[wave];
  const spots = [[1, 1], [4, 1], [2, 0], [3, 2], [0, 2], [5, 2]];
  foes = keys.map((key, i) => {
    const d = ENEMIES[key];
    const hp = Math.round(d.hp * scale * HP_MULT * (d.boss ? 0.75 : 1));
    const [x, y] = d.boss ? [2, 1] : spots[i];
    const f = { key, d, boss: !!d.boss, hp, maxHp: hp, atk: d.atk * atkScale * ATK_MULT, x, y, stun: 0, intent: [], acts: 0, ranged: key === "security_drone" || key === "pirate_captain" };
    makePiece(f);
    return f;
  });
  // Heal the crew a little between waves.
  if (wave > 0) living(crew).forEach((u) => { u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.2)); });
  waveEl.textContent = "W" + (wave + 1) + "/" + stage.waves.length;
  const boss = foes.find((f) => f.boss);
  banner(app, boss ? "BOSS" : "WAVE " + (wave + 1), boss ? boss.d.name : stage.name);
  living(foes).forEach(planIntent);
  startPlayerTurn();
}

// ---------- enemy AI: move toward the nearest crew, then lock in tiles to hit ----------
// Enemies go for whatever is closest: crew or guests (guests count as a little closer, they're easy prey).
function prey(f) { return [...living(crew), ...living(guests)].sort((a, b) => (dist(f, a) - (a.guest ? 0.5 : 0)) - (dist(f, b) - (b.guest ? 0.5 : 0)))[0]; }
function planIntent(f) {
  f.intent = [];
  if (f.hp <= 0 || f.stun > 0) return;
  const t = prey(f);
  if (!t) return;
  f.acts++;
  const big = f.boss && f.acts % 3 === 0;
  if (big) {
    // Boss big move: a plus shape centred on the target, telegraphed a turn ahead.
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (inside(t.x + dx, t.y + dy)) f.intent.push([t.x + dx, t.y + dy]); });
    f.bigName = f.d.big;
  } else if (f.ranged && (f.x === t.x || f.y === t.y) && dist(f, t) <= 4) {
    f.intent.push([t.x, t.y]);
  } else if (dist(f, t) === 1) {
    f.intent.push([t.x, t.y]);
  }
  // Otherwise it's out of reach this turn and shows no threat; it will close in after the next enemy phase.
  f.intentDmg = Math.round(f.atk * (big ? 1.7 : 1));
}
function moveFoe(f) {
  if (f.hp <= 0 || f.stun > 0) return;
  const t = prey(f);
  if (!t) return;
  const want = f.ranged ? 2 : 1;
  if (dist(f, t) <= want) return;
  let best = null, bd = dist(f, t);
  reach(f, f.boss ? 1 : 2).forEach(([x, y]) => { const d = Math.abs(x - t.x) + Math.abs(y - t.y); if (d >= want && d < bd) { bd = d; best = [x, y]; } });
  if (best) { f.x = best[0]; f.y = best[1]; place(f); }
}
function resolveFoe(f) {
  if (f.hp <= 0) return;
  if (f.stun > 0) { f.stun--; f.node.classList.toggle("stun", f.stun > 0); return; }
  if (f.bigName) { banner(app, f.bigName.toUpperCase(), f.d.name); f.bigName = null; shake(app); }
  f.intent.forEach(([x, y]) => {
    const u = unitAt(x, y);
    if (u && u.guest) hitGuest(u);
    else if (u && u !== f) damage(u, f.intentDmg, u.crew ? "hurt" : "");
  });
  shake(f.node);
}

// ---------- damage ----------
function damage(u, amount, cls) {
  if (u.hp <= 0) return;
  amount = Math.round(amount);
  if (u.shield > 0) { const s = Math.min(u.shield, amount); u.shield -= s; amount -= s; }
  const p = centerOf(app, u.node);
  if (amount <= 0) { floatText(app, p.x, p.y, "BLOCK", "info"); return; }
  u.hp = Math.max(0, u.hp - amount);
  floatText(app, p.x, p.y, amount, cls);
  if (u.crew) { u.charge = Math.min(1, u.charge + 0.15); sfx.hurt(); } else sfx.hit();
  place(u);
  if (u.hp <= 0) {
    u.node.classList.add("dead");
    if (u.crew) banner(app, u.c.name + " is down", "");
  }
}
function hitGuest(g) {
  if (g.hp <= 0) return;
  g.hp--; place(g); sfx.hurt();
  const p = centerOf(app, g.node);
  floatText(app, p.x, p.y, g.hp > 0 ? "HURT" : "RESCUED BY STAFF", "hurt");
  if (g.hp <= 0) { g.node.classList.add("dead"); banner(app, "GUEST DOWN", g.name + " had to be carried off"); }
}
function heal(u, amount) {
  amount = Math.round(Math.min(amount, u.maxHp - u.hp));
  if (amount <= 0) return;
  u.hp += amount; place(u);
  const p = centerOf(app, u.node); floatText(app, p.x, p.y, "+" + amount, "heal");
}
function knock(attacker, f) {
  const dx = Math.sign(f.x - attacker.x), dy = Math.sign(f.y - attacker.y);
  const nx = f.x + (Math.abs(f.x - attacker.x) >= Math.abs(f.y - attacker.y) ? dx : 0);
  const ny = f.y + (Math.abs(f.x - attacker.x) >= Math.abs(f.y - attacker.y) ? 0 : dy);
  if (!inside(nx, ny)) { damage(f, 12, ""); return; }
  const o = unitAt(nx, ny);
  if (o && o.guest) { damage(f, 12, ""); return; }
  if (o) { damage(f, 12, ""); damage(o, 12, o.crew ? "hurt" : ""); return; }
  f.x = nx; f.y = ny; place(f);
  // Knocked foes keep aiming at the same tiles, so knocking one into position can make it hit its friends.
}

// ---------- player turn ----------
function startPlayerTurn() {
  phase = "player";
  living(crew).forEach((u) => { u.moved = false; u.acted = false; });
  turnEl.textContent = "TURN " + turn;
  sel = null; mode = null; lastMove = null;
  paint();
  say("<b>Your turn.</b> Striped tiles get hit when you end the turn. Tap a crew member to move and attack.");
}
function select(u) {
  if (over || phase !== "player" || u.hp <= 0) return;
  sel = u;
  mode = u.acted ? null : !u.moved ? "move" : "aim";
  const st = STYLE[u.c.dept];
  say("<b>" + u.c.full + "</b> · " + st.name + ": " + st.note + "." + (u.charge >= 1 ? " <b>Skill ready:</b> " + u.c.skill.name + "." : "") + (u.acted ? " Already acted." : ""));
  paint();
}
function tapCell(x, y) {
  if (over || phase !== "player") return;
  const who = unitAt(x, y);
  if (sel && mode === "move" && !who && reach(sel, MOVE).some(([a, b]) => a === x && b === y)) {
    lastMove = { u: sel, x: sel.x, y: sel.y };
    sel.x = x; sel.y = y; sel.moved = true; place(sel);
    mode = "aim"; paint(); return;
  }
  if (sel && mode === "aim" && targets(sel).some(([a, b]) => a === x && b === y)) return attack(sel, who);
  if (who && who.crew) {
    if (sel === who && mode === "move") { who.moved = true; mode = "aim"; paint(); return; }
    return select(who);
  }
  if (who && who.guest) { say("<b>" + who.name + "</b> · a guest who can't get off the deck. Two hits and they're out. Protect them."); return; }
  if (who && !who.crew) {
    say("<b>" + who.d.name + "</b> · " + who.hp + "/" + who.maxHp + " HP" + (who.ranged ? " · shoots in straight lines" : "") + (who.boss ? " · boss: every third turn hits a plus shape" : "") + ".");
  }
}
function attack(u, t) {
  const st = STYLE[u.c.dept];
  if (t.crew) { heal(t, u.c.atk * 2.4); sfx.heal(); }
  else {
    const dmg = u.c.atk * st.mult * (buffT > 0 ? 1.5 : 1) * (0.9 + Math.random() * 0.2);
    damage(t, dmg, "");
    if (st.splash) living(foes).forEach((f) => { if (f !== t && dist(f, t) === 1) damage(f, dmg * st.splash, ""); });
    if (st.push && t.hp > 0) knock(u, t);
  }
  u.charge = Math.min(1, u.charge + 0.25);
  done(u);
}
function done(u) {
  u.acted = true; u.moved = true; lastMove = null;
  sel = null; mode = null;
  paint();
  if (!living(foes).length) return nextWave();
  if (living(crew).every((c) => c.acted)) say("Everyone has acted. <b>End the turn</b> when you're ready.");
}
function useSkill(u) {
  const s = u.c.skill;
  u.charge = 0;
  cutIn(app, u.id); sfx.skill();
  setTimeout(() => {
    const base = u.c.atk * s.pow * 1.3 * (buffT > 0 ? 1.5 : 1);
    const near = living(foes).sort((a, b) => dist(u, a) - dist(u, b))[0];
    switch (s.kind) {
      case "hit": if (near) damage(near, base, "crit"); break;
      case "aoe": living(foes).forEach((f) => damage(f, base / (s.hits ? 1.3 : 1), "crit"));
        if (s.extra === "charge") living(crew).forEach((o) => { if (o !== u) o.charge = Math.min(1, o.charge + 0.25); }); break;
      case "heal": living(crew).forEach((o) => heal(o, u.c.atk * s.pow * 1.2)); sfx.heal();
        if (s.extra === "cleanse") { living(foes).forEach((f) => { f.intent = []; }); banner(app, "ALL CLEAR", "Enemy attacks cancelled"); } break;
      case "shield": living(crew).forEach((o) => { o.shield = Math.round(u.c.atk * s.pow * 2); }); banner(app, "SHIELDS UP", ""); break;
      case "stun": (s.all ? living(foes) : near ? [near] : []).forEach((f) => { damage(f, base, "crit"); f.stun = 1; f.intent = []; f.node.classList.add("stun"); }); break;
      case "charge": living(crew).forEach((o) => { if (o !== u) { o.charge = Math.min(1, o.charge + s.pow); o.acted = false; o.moved = false; } }); banner(app, "AT YOUR SERVICE", "Everyone may act again"); break;
      case "buff": buffT = 2; banner(app, "RELAXED & READY", "Damage up for 2 turns"); break;
    }
    done(u);
  }, 450);
}

// ---------- enemy phase ----------
function endTurn() {
  if (over || phase !== "player" || advancing) return;
  phase = "enemy"; sel = null; mode = null; paint();
  say("Enemy turn…");
  const order = living(foes);
  let i = 0;
  const stepFoe = () => {
    if (over) return;
    if (i >= order.length) return afterEnemies();
    resolveFoe(order[i++]);
    paint();
    if (!living(crew).length) return end(false);
    setTimeout(stepFoe, 380);
  };
  setTimeout(stepFoe, 250);
}
function afterEnemies() {
  if (!living(foes).length) return nextWave();
  living(foes).forEach(moveFoe);
  living(foes).forEach(planIntent);
  if (buffT > 0) buffT--;
  turn++;
  startPlayerTurn();
}
let advancing = false;
function nextWave() {
  // Several paths notice an empty board (last hit, end of enemy phase); only the first one advances.
  if (over || advancing || living(foes).length) return;
  advancing = true;
  setTimeout(() => {
    advancing = false;
    if (over) return;
    if (wave + 1 >= stage.waves.length) return end(true);
    spawnWave();
  }, 700);
}

// ---------- painting ----------
function paint() {
  cells.forEach((d) => { d.className = "cell"; d.innerHTML = ""; });
  living(foes).forEach((f) => f.intent.forEach(([x, y]) => {
    const d = cellAt(x, y); d.classList.add("danger");
    const tag = d.querySelector(".dmg") || el("span", "dmg", d); tag.textContent = (parseInt(tag.textContent, 10) || 0) + f.intentDmg;
  }));
  if (sel && mode === "move") reach(sel, MOVE).forEach(([x, y]) => cellAt(x, y).classList.add("move"));
  if (sel && mode === "aim") targets(sel).forEach(([x, y]) => cellAt(x, y).classList.add("aim"));
  [...crew, ...foes].forEach((u) => {
    if (!u.node) return;
    u.node.classList.toggle("sel", u === sel);
    u.node.classList.toggle("done", !!(u.crew && u.acted && u.hp > 0));
    u.node.classList.toggle("shield", u.shield > 0);
    u.node.classList.toggle("stun", !u.crew && u.stun > 0);
  });
  crew.forEach((u, i) => { paintCard(cards[i], u, u.charge); cards[i].node.classList.toggle("acted", u.acted && u.hp > 0); });
  const can = phase === "player" && sel && !sel.acted;
  btn.skill.disabled = !(can && sel.charge >= 1);
  btn.skill.textContent = sel && sel.charge >= 1 ? sel.c.skill.name.toUpperCase() : "SKILL";
  btn.wait.disabled = !can;
  btn.undo.disabled = !(phase === "player" && lastMove && !lastMove.u.acted);
  btn.end.disabled = phase !== "player";
}
function say(html) { statusEl.innerHTML = html; }

function end(won) {
  if (over) return;
  over = true;
  const downs = crew.filter((u) => u.hp <= 0).length;
  const safe = guests.every((g) => g.hp === 2), lost = guests.filter((g) => g.hp <= 0).length;
  const stars = won ? 1 + (downs === 0 ? 1 : 0) + (safe ? 1 : 0) : 0;
  if (won) { saveResult("tactics", stageIdx, stars); sfx.win(); } else sfx.lose();
  setTimeout(() => {
    const o = el("div", "overlay", app);
    el("h2", "", o, won ? "VICTORY" : "DEFEAT");
    if (won) el("div", "stars", o, "★".repeat(stars) + "☆".repeat(3 - stars));
    el("p", "", o, won ? "Cleared in " + turn + " turns. " + (downs ? downs + " crew went down. " : "Nobody went down! ") + (safe ? "Every guest is safe." : lost ? lost + " guest" + (lost > 1 ? "s" : "") + " carried off." : "A guest got roughed up.") + "<br>Stars: the win, nobody down, and no guest hurt."
      : "Step off the striped tiles before ending the turn, and knock enemies into each other's attacks.");
    const again = el("button", "big", o, "Play again"); again.onclick = () => location.reload();
    if (won && stageIdx + 1 < STAGES.length) { const n = el("button", "big alt", o, "Next stage"); n.onclick = () => { store.set("stage", stageIdx + 1); location.href = "tactics.html?stage=" + (stageIdx + 1); }; }
    const back = el("button", "big alt", o, "Battle Lab"); back.onclick = () => { location.href = "index.html"; };
  }, 800);
}

// ---------- controls ----------
btn.skill.onclick = () => { if (sel && !sel.acted && sel.charge >= 1 && phase === "player") useSkill(sel); };
btn.wait.onclick = () => { if (sel && !sel.acted && phase === "player") done(sel); };
btn.undo.onclick = () => { if (lastMove && !lastMove.u.acted) { const m = lastMove; m.u.x = m.x; m.u.y = m.y; m.u.moved = false; place(m.u); lastMove = null; select(m.u); } };
btn.end.onclick = endTurn;
const muteBtn = document.getElementById("mute");
muteBtn.classList.toggle("on", !sfx.muted);
muteBtn.onclick = () => muteBtn.classList.toggle("on", !sfx.toggle());
window.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "4") { const u = crew[+e.key - 1]; if (u.hp > 0) select(u); }
  else if (e.key === "Enter") endTurn();
});

ageGate(() => { layout(); spawnWave(); });
