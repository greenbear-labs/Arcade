// Deck Match: match-3 battle. Each of the four crew owns a tile (her face); matching her tiles makes her
// attack and charges her skill. Hearts heal. Enemies count down and strike when their counter hits zero.
// Matching 4 or more leaves a star tile that clears its whole row and column when it's matched again.
"use strict";

const COLS = 6, ROWS = 6, HEART = 4;
const MATCH_MULT = 2.0;        // damage per tile group, times the crew member's attack
const SKILL_MULT = 1.5;        // skills hit a bit harder here than in Rush (they're rarer)
const CHARGE_PER_TILE = 0.07;
const ENEMY_ATK_MULT = 1.7;
const BIG_EVERY = 3;
const SLOT_COLORS = ["#e25555", "#4f7bd9", "#9bd16b", "#a77ae6"];

const app = document.getElementById("app");
const foesEl = document.getElementById("foes");
const boardEl = document.getElementById("board");
const waveEl = document.getElementById("wave");
const movesEl = document.getElementById("moves");
const tipEl = document.getElementById("tip");

const stageIdx = getStage();
const stage = STAGES[stageIdx];
const hpScale = 1.3 * (1 + 0.2 * stageIdx), atkScale = 1 + 0.12 * stageIdx;
document.getElementById("bg").style.backgroundImage = "url(" + bgUrl(stage.bg) + ")";

const squad = getSquad().map((id) => {
  const c = CREW[id];
  return { id, c, hp: c.hp, maxHp: c.hp, charge: 0.2, shield: 0, shieldT: 0 };
});
// Tile color: her department's color, unless two squad members share a department.
const deptCount = {};
squad.forEach((u) => (deptCount[u.c.dept] = (deptCount[u.c.dept] || 0) + 1));
const tileColor = squad.map((u, i) => (deptCount[u.c.dept] > 1 ? SLOT_COLORS[i] : DEPTS[u.c.dept].color));

let enemies = [], wave = -1, focus = null, moves = 0, busy = true, over = false, buffMoves = 0, buffMult = 1;

// ---------- cards ----------
const cards = buildCards(app, squad.map((u) => u.id), (i) => fireSkill(i));
app.insertBefore(cards[0].node.parentNode, document.getElementById("cardslot"));
cards.forEach((c, i) => (c.node.style.borderColor = tileColor[i]));
function renderCards() {
  squad.forEach((u, i) => {
    paintCard(cards[i], u, u.charge);
    cards[i].node.classList.toggle("shielded", u.shield > 0 && u.hp > 0);
    if (u.charge < 1 || u.hp <= 0) cards[i].node.style.borderColor = tileColor[i];
    else cards[i].node.style.borderColor = "";
  });
  movesEl.textContent = "MOVES " + moves;
}

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
    const cd = el("div", "cd", node);
    const e = { key, d, node, hpBar, cd, hp: Math.round(d.hp * hpScale), maxHp: Math.round(d.hp * hpScale), atk: d.atk * atkScale * ENEMY_ATK_MULT,
      count: d.turns + (Math.random() < 0.5 ? 1 : 0), actions: 0, stun: 0 };
    node.addEventListener("pointerdown", (ev) => { ev.preventDefault(); focus = e; paintEnemies(); });
    return e;
  });
  focus = null;
  paintEnemies();
  waveEl.textContent = "W" + (wave + 1) + "/" + stage.waves.length;
  const boss = enemies.find((e) => e.d.boss);
  banner(app, boss ? "BOSS" : "WAVE " + (wave + 1), boss ? boss.d.name : stage.name);
}
function alive(list) { return list.filter((x) => x.hp > 0); }
function target() { return focus && focus.hp > 0 ? focus : alive(enemies)[0]; }
function isBig(e) { return (e.actions + 1) % BIG_EVERY === 0; }
function paintEnemies() {
  enemies.forEach((e) => {
    e.node.classList.toggle("target", e === focus && e.hp > 0);
    e.cd.textContent = e.stun > 0 ? "zZ" : (isBig(e) ? "⚠" : "") + e.count;
    e.cd.className = "cd" + (e.stun > 0 ? " stun" : e.count <= 1 ? " warn" : "");
  });
}

// ---------- damage ----------
function hitEnemy(e, amount, cls) {
  if (!e || e.hp <= 0) return;
  amount = Math.round(amount * (buffMoves > 0 ? buffMult : 1));
  e.hp = Math.max(0, e.hp - amount);
  e.hpBar.style.width = (e.hp / e.maxHp) * 100 + "%";
  e.node.classList.remove("hit"); void e.node.offsetWidth; e.node.classList.add("hit");
  const p = centerOf(app, e.node);
  floatText(app, p.x + (Math.random() - 0.5) * 40, p.y, amount, cls);
  sfx.hit();
  if (e.hp <= 0) { e.node.classList.add("dead"); if (focus === e) focus = null; }
}
function hurtCrew(i, amount) {
  const u = squad[i];
  if (u.hp <= 0) return;
  amount = Math.round(amount);
  const p = centerOf(app, cards[i].node);
  if (u.shield > 0) {
    const s = Math.min(u.shield, amount); u.shield -= s; amount -= s;
    if (!amount) { floatText(app, p.x, p.y, "BLOCK", "info"); return; }
  }
  u.hp = Math.max(0, u.hp - amount);
  u.charge = Math.min(1, u.charge + 0.05);
  floatText(app, p.x, p.y, amount, "hurt");
  shake(cards[i].node);
  if (u.hp <= 0) banner(app, u.c.name + " is down", "Her tiles go dark");
}
function healCrew(i, amount) {
  const u = squad[i];
  if (u.hp <= 0) return;
  amount = Math.round(Math.min(amount, u.maxHp - u.hp));
  u.hp += amount;
  if (amount > 0) { const p = centerOf(app, cards[i].node); floatText(app, p.x, p.y, "+" + amount, "heal"); }
}

// ---------- board ----------
let grid = [];           // grid[r][c] = { t: type 0-4, star: bool, node }
let tile = 60;
function rand() {
  // Slightly fewer hearts than crew tiles.
  return Math.random() < 0.15 ? HEART : Math.floor(Math.random() * 4);
}
function makeNode(cell) {
  const n = el("div", "tile", boardEl);
  const g = el("div", "gem", n);
  if (cell.t === HEART) { n.classList.add("heart"); g.textContent = "♥"; }
  else {
    g.style.borderColor = tileColor[cell.t];
    g.style.background = tileColor[cell.t];
    const img = el("img", "", g); img.src = faceUrl(squad[cell.t].id); img.alt = "";
    if (squad[cell.t].hp <= 0) n.classList.add("dim");
  }
  if (cell.star) n.classList.add("star");
  n.style.width = n.style.height = tile + "px";
  cell.node = n;
  return n;
}
function place(cell, r, c, instant) {
  const n = cell.node;
  if (instant) n.style.transition = "none";
  n.style.transform = "translate(" + c * tile + "px," + r * tile + "px)";
  if (instant) { void n.offsetWidth; n.style.transition = ""; }
}
function layout() {
  const W = Math.min(app.clientWidth, 520) - 16;
  const used = document.querySelector(".topbar").offsetHeight + document.querySelector(".cards").offsetHeight + 200;
  tile = Math.floor(Math.min(W / COLS, (app.clientHeight - used) / ROWS));
  boardEl.style.width = tile * COLS + "px";
  boardEl.style.height = tile * ROWS + "px";
  grid.forEach((row, r) => row.forEach((cell, c) => { if (cell) { cell.node.style.width = cell.node.style.height = tile + "px"; place(cell, r, c, true); } }));
}
function newBoard() {
  boardEl.innerHTML = "";
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push([]);
    for (let c = 0; c < COLS; c++) {
      let t;
      do { t = rand(); } while ((c >= 2 && grid[r][c - 1].t === t && grid[r][c - 2].t === t) || (r >= 2 && grid[r - 1][c].t === t && grid[r - 2][c].t === t));
      const cell = { t, star: false };
      grid[r].push(cell);
    }
  }
  if (!findMove()) return newBoard();
  grid.forEach((row, r) => row.forEach((cell, c) => { makeNode(cell); place(cell, r, c, true); }));
}
// All runs of 3+ in rows and columns; returns a list of groups (arrays of [r,c]).
function findGroups() {
  const groups = [];
  for (let r = 0; r < ROWS; r++) {
    let s = 0;
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && grid[r][c] && grid[r][s] && grid[r][c].t === grid[r][s].t) continue;
      if (c - s >= 3) groups.push(Array.from({ length: c - s }, (_, k) => [r, s + k]));
      s = c;
    }
  }
  for (let c = 0; c < COLS; c++) {
    let s = 0;
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && grid[r][c] && grid[s][c] && grid[r][c].t === grid[s][c].t) continue;
      if (r - s >= 3) groups.push(Array.from({ length: r - s }, (_, k) => [s + k, c]));
      s = r;
    }
  }
  return groups;
}
function swapCells(a, b) { const t = grid[a[0]][a[1]]; grid[a[0]][a[1]] = grid[b[0]][b[1]]; grid[b[0]][b[1]] = t; }
function findMove() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc;
      if (r2 >= ROWS || c2 >= COLS) continue;
      swapCells([r, c], [r2, c2]);
      const ok = findGroups().length > 0;
      swapCells([r, c], [r2, c2]);
      if (ok) return [[r, c], [r2, c2]];
    }
  }
  return null;
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function trySwap(a, b) {
  if (busy || over) return;
  busy = true; clearHint(); hideTip();
  swapCells(a, b);
  place(grid[a[0]][a[1]], a[0], a[1]); place(grid[b[0]][b[1]], b[0], b[1]);
  await sleep(190);
  if (!findGroups().length) {
    swapCells(a, b);
    place(grid[a[0]][a[1]], a[0], a[1]); place(grid[b[0]][b[1]], b[0], b[1]);
    await sleep(190);
    busy = false; return;
  }
  moves++;
  await resolve(b);
  if (over) return;
  if (!alive(enemies).length) { await sleep(500); return nextWave(); }
  await enemyTurn();
  if (buffMoves > 0) buffMoves--;
  squad.forEach((u) => { if (u.shieldT > 0 && --u.shieldT <= 0) u.shield = 0; });
  if (!findMove()) { banner(app, "SHUFFLE", ""); await sleep(400); newBoard(); }
  renderCards();
  busy = false;
}

// Clear matches, deal damage, drop tiles, repeat for cascades.
async function resolve(swapPos) {
  let cascade = 0;
  for (;;) {
    const groups = findGroups();
    if (!groups.length) break;
    cascade++;
    const clear = new Set();
    const key = (r, c) => r * COLS + c;
    const tally = [0, 0, 0, 0, 0];
    const newStars = [];
    groups.forEach((g) => {
      const t = grid[g[0][0]][g[0][1]].t;
      g.forEach(([r, c]) => clear.add(key(r, c)));
      tally[t] += g.length;
      if (g.length >= 4) {
        // Leave a star where the player swapped, or in the middle of the run.
        const spot = (cascade === 1 && swapPos && g.some(([r, c]) => r === swapPos[0] && c === swapPos[1])) ? swapPos : g[Math.floor(g.length / 2)];
        newStars.push({ spot, t });
      }
    });
    // Stars in the cleared set blow up their row and column.
    let starBlast = false;
    for (let pass = 0; pass < 3; pass++) {
      clear.forEach((k) => {
        const r = Math.floor(k / COLS), c = k % COLS, cell = grid[r][c];
        if (cell && cell.star && !cell.blown) {
          cell.blown = true; starBlast = true;
          for (let i = 0; i < COLS; i++) clear.add(key(r, i));
          for (let i = 0; i < ROWS; i++) clear.add(key(i, c));
        }
      });
    }
    if (starBlast) { banner(app, "SPOTLIGHT!", "Row and column cleared"); shake(boardEl); }
    // Count every cleared tile toward its owner (star blasts count too).
    const counts = [0, 0, 0, 0, 0];
    clear.forEach((k) => { const cell = grid[Math.floor(k / COLS)][k % COLS]; if (cell) counts[cell.t]++; });
    const mult = 1 + 0.25 * (cascade - 1);
    if (cascade > 1) { const cb = el("div", "combo", app, "COMBO ×" + cascade); setTimeout(() => cb.remove(), 900); }
    sfx.match(cascade);
    // Pop tiles.
    clear.forEach((k) => { const cell = grid[Math.floor(k / COLS)][k % COLS]; if (cell) { cell.node.classList.add("pop"); cell.node.style.transform += " scale(.4)"; } });
    await sleep(200);
    // Effects.
    counts.forEach((n, t) => {
      if (!n) return;
      if (t === HEART) { const avg = squad.reduce((s, u) => s + u.c.atk, 0) / 4; squad.forEach((u, i) => healCrew(i, avg * 0.45 * n * mult)); sfx.heal(); return; }
      const u = squad[t];
      if (u.hp <= 0) return;
      const big = n >= 4 ? 1.5 : 1;
      hitEnemy(target(), u.c.atk * MATCH_MULT * (n / 3) * big * mult, n >= 4 ? "crit" : "");
      u.charge = Math.min(1, u.charge + n * CHARGE_PER_TILE * mult);
    });
    renderCards();
    // Remove cleared, then place new stars.
    clear.forEach((k) => { const r = Math.floor(k / COLS), c = k % COLS; if (grid[r][c]) { grid[r][c].node.remove(); grid[r][c] = null; } });
    newStars.forEach(({ spot, t }) => {
      if (grid[spot[0]][spot[1]]) return;
      const cell = { t, star: true }; grid[spot[0]][spot[1]] = cell; makeNode(cell); place(cell, spot[0], spot[1], true);
    });
    // Gravity and refill.
    for (let c = 0; c < COLS; c++) {
      let w = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) if (grid[r][c]) { const cell = grid[r][c]; grid[r][c] = null; grid[w][c] = cell; w--; }
      for (let r = w, k = 1; r >= 0; r--, k++) {
        const cell = { t: rand(), star: false }; grid[r][c] = cell; makeNode(cell); place(cell, -k, c, true);
      }
    }
    await sleep(20);
    grid.forEach((row, r) => row.forEach((cell, c) => place(cell, r, c)));
    await sleep(230);
    if (!alive(enemies).length) break;
  }
}

// ---------- enemy turn ----------
async function enemyTurn() {
  for (const e of alive(enemies)) {
    if (e.stun > 0) { e.stun--; continue; }
    e.count--;
    if (e.count > 0) continue;
    const targets = squad.map((u, i) => i).filter((i) => squad[i].hp > 0);
    if (!targets.length) break;
    const big = isBig(e);
    e.actions++;
    e.count = e.d.turns;
    shake(e.node);
    if (big) {
      banner(app, e.d.big.toUpperCase(), e.d.name); shake(app); sfx.hurt();
      targets.forEach((i) => hurtCrew(i, e.atk * 1.3));
    } else {
      sfx.hurt();
      hurtCrew(targets[Math.floor(Math.random() * targets.length)], e.atk * (0.85 + Math.random() * 0.3));
    }
    renderCards();
    await sleep(big ? 700 : 350);
    if (!alive(squad).length) return end(false);
  }
  paintEnemies();
  grid.forEach((row) => row.forEach((cell) => { if (cell && cell.t !== HEART) cell.node.classList.toggle("dim", squad[cell.t].hp <= 0); }));
}

// ---------- skills ----------
async function fireSkill(i) {
  const u = squad[i];
  if (busy || over || u.hp <= 0 || u.charge < 1) return;
  busy = true; hideTip();
  u.charge = 0;
  cutIn(app, u.id); sfx.skill();
  await sleep(550);
  const s = u.c.skill, base = u.c.atk * s.pow * SKILL_MULT * MATCH_MULT, t = target();
  switch (s.kind) {
    case "hit": hitEnemy(t, base, "crit"); break;
    case "aoe": {
      const hits = s.hits || 1;
      for (let h = 0; h < hits; h++) { alive(enemies).forEach((e) => hitEnemy(e, base / hits, "crit")); await sleep(140); }
      if (s.extra === "charge") squad.forEach((o) => { if (o !== u && o.hp > 0) o.charge = Math.min(1, o.charge + 0.2); });
      break;
    }
    case "heal":
      squad.forEach((o, k) => healCrew(k, u.c.atk * s.pow * 1.6)); sfx.heal();
      if (s.extra === "cleanse") enemies.forEach((e) => { if (e.hp > 0 && e.count <= 1) { e.count = 2; const p = centerOf(app, e.node); floatText(app, p.x, p.y, "DELAYED", "info"); } });
      break;
    case "shield":
      squad.forEach((o) => { if (o.hp > 0) { o.shield = Math.round(u.c.atk * s.pow * 2.5); o.shieldT = 3; } });
      banner(app, "SHIELDS UP", "Blocks damage for 3 turns"); break;
    case "stun": {
      const list = s.all ? alive(enemies) : [t];
      list.forEach((e) => { if (!e) return; hitEnemy(e, base * (s.all ? 0.5 : 1), "crit"); e.stun = s.all ? 1 : 2; const p = centerOf(app, e.node); floatText(app, p.x, p.y - 30, "STUNNED", "info"); });
      break;
    }
    case "charge":
      squad.forEach((o) => { if (o !== u && o.hp > 0) o.charge = Math.min(1, o.charge + s.pow); });
      banner(app, "AT YOUR SERVICE", "Squad charged"); break;
    case "buff":
      buffMoves = 3; buffMult = s.pow; banner(app, "RELAXED & READY", "+50% damage for 3 moves"); break;
  }
  paintEnemies(); renderCards();
  await sleep(300);
  busy = false;
  if (!alive(enemies).length) { busy = true; await sleep(400); nextWave(); }
}

// ---------- flow ----------
function nextWave() {
  if (over) return;
  if (wave + 1 >= stage.waves.length) return end(true);
  spawnWave();
  renderCards();
  busy = false;
}
function end(won) {
  if (over) return;
  over = true; busy = true;
  const downs = squad.filter((u) => u.hp <= 0).length;
  const stars = won ? (downs === 0 ? 3 : downs <= 1 ? 2 : 1) : 0;
  if (won) { saveResult("match", stageIdx, stars); sfx.win(); } else sfx.lose();
  setTimeout(() => {
    const o = el("div", "overlay", app);
    el("h2", "", o, won ? "VICTORY" : "DEFEAT");
    if (won) el("div", "stars", o, "★".repeat(stars) + "☆".repeat(3 - stars));
    el("p", "", o, won ? stage.name + " cleared in " + moves + " moves." + (downs ? " " + downs + " crew went down." : " Nobody went down!")
      : "The crew needs a breather. Save shields for the ⚠ attacks, and make 4-matches for star tiles.");
    const again = el("button", "big", o, "Play again"); again.onclick = () => location.reload();
    if (won && stageIdx + 1 < STAGES.length) { const n = el("button", "big alt", o, "Next stage"); n.onclick = () => { store.set("stage", stageIdx + 1); location.href = "match.html?stage=" + (stageIdx + 1); }; }
    const back = el("button", "big alt", o, "Battle Lab"); back.onclick = () => { location.href = "index.html"; };
  }, 900);
}

// ---------- input: swipe a tile, or tap two neighbours ----------
let down = null, selected = null;
function cellAt(ev) {
  const r = boardEl.getBoundingClientRect();
  const c = Math.floor((ev.clientX - r.left) / tile), row = Math.floor((ev.clientY - r.top) / tile);
  return row >= 0 && row < ROWS && c >= 0 && c < COLS ? [row, c] : null;
}
boardEl.addEventListener("pointerdown", (ev) => {
  ev.preventDefault();
  const p = cellAt(ev);
  if (!p || busy) return;
  down = { p, x: ev.clientX, y: ev.clientY, moved: false };
  try { boardEl.setPointerCapture(ev.pointerId); } catch (e) {}
});
boardEl.addEventListener("pointermove", (ev) => {
  if (!down || down.moved) return;
  const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < tile * 0.35) return;
  down.moved = true;
  const [r, c] = down.p;
  const to = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
  setSel(null);
  if (to[0] >= 0 && to[0] < ROWS && to[1] >= 0 && to[1] < COLS) trySwap(down.p, to);
});
boardEl.addEventListener("pointerup", () => {
  if (down && !down.moved) {
    const p = down.p;
    if (selected && Math.abs(selected[0] - p[0]) + Math.abs(selected[1] - p[1]) === 1) { const a = selected; setSel(null); trySwap(a, p); }
    else setSel(selected && selected[0] === p[0] && selected[1] === p[1] ? null : p);
  }
  down = null;
});
function setSel(p) {
  if (selected && grid[selected[0]][selected[1]]) grid[selected[0]][selected[1]].node.classList.remove("sel");
  selected = p;
  if (p) grid[p[0]][p[1]].node.classList.add("sel");
}
let hinted = [];
function clearHint() { hinted.forEach((n) => n.classList.remove("hint")); hinted = []; }
document.getElementById("hintb").onclick = () => {
  clearHint();
  const m = findMove();
  if (m) hinted = m.map(([r, c]) => grid[r][c].node), hinted.forEach((n) => n.classList.add("hint"));
};
const muteBtn = document.getElementById("mute");
muteBtn.classList.toggle("on", !sfx.muted);
muteBtn.onclick = () => muteBtn.classList.toggle("on", !sfx.toggle());
window.addEventListener("keydown", (e) => { if (e.key >= "1" && e.key <= "4") fireSkill(+e.key - 1); });
window.addEventListener("resize", layout);

let tipHidden = false;
function hideTip() { if (!tipHidden) { tipHidden = true; tipEl.style.opacity = 0; } }

ageGate(() => {
  spawnWave();
  newBoard();
  layout();
  renderCards();
  setTimeout(() => { busy = false; }, 700);
});
