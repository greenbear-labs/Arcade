// Game rules. The host runs step() for everyone; clients only use movePlayer()
// to predict their own movement between host updates.
import {
  TILE, COLS, ROWS, WORLD_W, WORLD_H, tileAt, tileAtPx, isSolid, center, linkFrom,
  doorOf, conveyor, wolfSpawn, survivorSpawns, itemSpots,
} from "./map.js";

export const CFG = {
  half: 13,               // collision half-size of a player
  survSpeed: 170,
  wolfSpeed: 184,
  botWolfSpeed: 166,      // bot werewolves are a little slower so kids can escape
  ghostSpeed: 230,
  catchDist: 30,
  roundTime: 90,
  wolfHold: 4,            // seconds the werewolf waits while survivors scatter
  intermission: 7,
  maxItems: 8,
  itemEvery: 3.5,
};

export const ITEMS = {
  soda:   { name: "Turbo Soda",    who: "both", desc: "Zoom! Big speed boost." },
  grease: { name: "Grease Bucket", who: "both", desc: "Drop a slick. The other team spins out." },
  garlic: { name: "Garlic Fries",  who: "surv", desc: "Shield: the werewolf bounces off you." },
  smoke:  { name: "Onion Bomb",    who: "surv", desc: "Stinky cloud. Hide inside it." },
  moon:   { name: "Moon Pie",      who: "wolf", desc: "HOWL! See every survivor for a bit." },
};
const ITEM_WEIGHTS = [["soda", 3], ["grease", 2], ["garlic", 2], ["smoke", 2], ["moon", 1.6]];

export const COLORS = ["#ffcf3a", "#4ec3ff", "#ff6fb5", "#7be05a", "#c08bff", "#ff9a3c", "#3cf0d0", "#f05050"];

const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

export function newPlayer(id, name, color, isBot = false) {
  return {
    id, name, color, isBot,
    x: 0, y: 0, vx: 0, vy: 0, face: 1,
    role: "surv", alive: true, item: null,
    fx: { speed: 0, shield: 0, stun: 0, slip: 0, howl: 0, hold: 0, slipImmune: 0 },
    score: 0, round: 0, catches: 0,
    lastTile: "", padLock: "", useSeq: 0,
  };
}

export function createGame(players, rounds) {
  return {
    phase: "lobby", time: 0, roundIndex: -1, totalRounds: rounds,
    timer: 0, players, order: players.map((p) => p.id),
    items: [], puddles: [], smokes: [], doorSwing: {}, nextId: 1, itemClock: 0,
    events: [], results: null,
  };
}

const findPlayer = (s, id) => s.players.find((p) => p.id === id);
export const wolfOf = (s) => s.players.find((p) => p.role === "wolf");

export function startRound(s) {
  s.roundIndex++;
  s.phase = "play";
  s.timer = CFG.roundTime;
  s.items = []; s.puddles = []; s.smokes = []; s.doorSwing = {};
  s.itemClock = 0;
  const ids = s.order.filter((id) => findPlayer(s, id));
  const wolfId = ids[s.roundIndex % ids.length];
  const spawns = [...survivorSpawns].sort(() => Math.random() - 0.5);
  let si = 0;
  for (const p of s.players) {
    p.role = p.id === wolfId ? "wolf" : "surv";
    p.alive = true; p.item = null; p.round = 0;
    p.vx = p.vy = 0;
    for (const k in p.fx) p.fx[k] = 0;
    const [tx, ty] = p.role === "wolf" ? wolfSpawn : spawns[si++ % spawns.length];
    const c = center(tx, ty);
    p.x = c.x + rand(-6, 6); p.y = c.y + rand(-6, 6);
    p.lastTile = ""; p.padLock = "";
  }
  const wolf = wolfOf(s);
  wolf.fx.hold = CFG.wolfHold;
  for (let i = 0; i < 4; i++) spawnItem(s);
  s.events.push({ e: "round", wolf: wolf.id, n: s.roundIndex + 1, of: s.totalRounds });
}

function spawnItem(s) {
  const free = itemSpots.filter(([tx, ty]) => {
    const c = center(tx, ty);
    return !s.items.some((it) => Math.abs(it.x - c.x) < 4 && Math.abs(it.y - c.y) < 4);
  });
  if (!free.length) return;
  const [tx, ty] = free[Math.floor(Math.random() * free.length)];
  let r = Math.random() * ITEM_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let kind = "soda";
  for (const [k, w] of ITEM_WEIGHTS) { if ((r -= w) <= 0) { kind = k; break; } }
  const c = center(tx, ty);
  s.items.push({ id: s.nextId++, x: c.x, y: c.y, kind });
}

// ---- movement (shared with client prediction) ----
export function speedOf(p, s) {
  if (!p.alive) return CFG.ghostSpeed;
  let v = p.role === "wolf" ? (p.isBot ? CFG.botWolfSpeed : CFG.wolfSpeed) : CFG.survSpeed;
  if (p.fx.speed > 0) v *= 1.55;
  const t = tileAtPx(p.x, p.y);
  if (t === "b") v *= p.role === "wolf" ? 0.55 : 0.68;
  if (p.role === "wolf" && s && s.smokes.some((c) => dist2(c, p) < c.r * c.r)) v *= 0.72;
  return v;
}

export function movePlayer(p, input, dt, s) {
  const t = tileAtPx(p.x, p.y);
  let mx = input.mx || 0, my = input.my || 0;
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  const disabled = p.fx.stun > 0 || p.fx.slip > 0 || p.fx.hold > 0;
  if (disabled) { mx = 0; my = 0; }
  const sp = speedOf(p, s);
  let accel = 14;
  if (t === "i" && p.alive) accel = 2.2;
  if (p.fx.slip > 0) accel = 0.4;
  const k = Math.min(1, dt * accel);
  p.vx += (mx * sp - p.vx) * k;
  p.vy += (my * sp - p.vy) * k;
  if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1;
  let dx = p.vx * dt, dy = p.vy * dt;
  const push = p.alive && conveyor[t];
  if (push) { dx += push[0] * 95 * dt; dy += push[1] * 95 * dt; }
  if (!p.alive) {
    p.x = Math.max(20, Math.min(WORLD_W - 20, p.x + dx));
    p.y = Math.max(20, Math.min(WORLD_H - 20, p.y + dy));
    return;
  }
  moveAxis(p, dx, 0);
  moveAxis(p, 0, dy);
}

function moveAxis(p, dx, dy) {
  const h = CFG.half;
  p.x += dx; p.y += dy;
  const x0 = Math.floor((p.x - h) / TILE), x1 = Math.floor((p.x + h) / TILE);
  const y0 = Math.floor((p.y - h) / TILE), y1 = Math.floor((p.y + h) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!isSolid(tx, ty)) continue;
    if (dx > 0) { p.x = tx * TILE - h - 0.01; p.vx *= p.fx.slip > 0 ? -0.6 : 0; }
    else if (dx < 0) { p.x = (tx + 1) * TILE + h + 0.01; p.vx *= p.fx.slip > 0 ? -0.6 : 0; }
    else if (dy > 0) { p.y = ty * TILE - h - 0.01; p.vy *= p.fx.slip > 0 ? -0.6 : 0; }
    else if (dy < 0) { p.y = (ty + 1) * TILE + h + 0.01; p.vy *= p.fx.slip > 0 ? -0.6 : 0; }
  }
}

// ---- host simulation ----
export function step(s, dt, inputs) {
  s.time += dt;
  if (s.phase === "roundEnd") {
    s.timer -= dt;
    if (s.timer <= 0) {
      if (s.roundIndex + 1 >= s.totalRounds) endGame(s);
      else startRound(s);
    }
    return;
  }
  if (s.phase !== "play") return;

  s.timer -= dt;
  for (const p of s.players) {
    const fx = p.fx;
    for (const k in fx) if (fx[k] > 0) fx[k] = Math.max(0, fx[k] - dt);
    const inp = inputs[p.id] || { mx: 0, my: 0, useSeq: p.useSeq };
    if (inp.useSeq !== undefined && inp.useSeq !== p.useSeq) {
      p.useSeq = inp.useSeq;
      if (p.alive && p.item && fx.stun <= 0 && fx.hold <= 0) useItem(s, p);
    }
    movePlayer(p, inp, dt, s);
    if (p.alive) tileEffects(s, p);
    if (p.alive && p.role === "surv") p.round += dt;
  }

  // Werewolf catches
  const wolf = wolfOf(s);
  if (wolf && wolf.fx.stun <= 0 && wolf.fx.hold <= 0 && wolf.fx.slip <= 0) {
    for (const p of s.players) {
      if (p === wolf || !p.alive || dist2(p, wolf) > CFG.catchDist ** 2) continue;
      if (p.fx.shield > 0) {
        p.fx.shield = 0;
        wolf.fx.stun = 1.6;
        const a = Math.atan2(wolf.y - p.y, wolf.x - p.x);
        wolf.vx = Math.cos(a) * 320; wolf.vy = Math.sin(a) * 320;
        s.events.push({ e: "garlic", x: p.x, y: p.y, by: p.id });
        continue;
      }
      p.alive = false; p.item = null;
      p.fx.shield = p.fx.speed = p.fx.slip = p.fx.stun = 0;
      wolf.catches++;
      wolf.score += 20;
      wolf.fx.stun = 0.7; // munch time
      s.events.push({ e: "catch", x: p.x, y: p.y, who: p.id, by: wolf.id });
    }
  }

  // Grease puddles
  for (const g of s.puddles) {
    g.t -= dt;
    for (const p of s.players) {
      if (!p.alive || p.role === g.team || p.fx.slip > 0 || p.fx.slipImmune > 0) continue;
      if (dist2(p, g) < 34 * 34) {
        p.fx.slip = 1.2; p.fx.slipImmune = 2.6;
        const sp = Math.hypot(p.vx, p.vy);
        const a = sp > 20 ? Math.atan2(p.vy, p.vx) : Math.random() * Math.PI * 2;
        p.vx = Math.cos(a) * 300; p.vy = Math.sin(a) * 300;
        s.events.push({ e: "slip", x: p.x, y: p.y, who: p.id });
      }
    }
  }
  s.puddles = s.puddles.filter((g) => g.t > 0);
  for (const c of s.smokes) c.t -= dt;
  s.smokes = s.smokes.filter((c) => c.t > 0);
  for (const id in s.doorSwing) {
    s.doorSwing[id].t -= dt;
    if (s.doorSwing[id].t <= 0) delete s.doorSwing[id];
  }

  // Items
  s.itemClock += dt;
  if (s.itemClock > CFG.itemEvery) { s.itemClock = 0; if (s.items.length < CFG.maxItems) spawnItem(s); }
  for (const p of s.players) {
    if (!p.alive) continue;
    for (const it of s.items) {
      if (it.gone || dist2(p, it) > 26 * 26) continue;
      const rule = ITEMS[it.kind].who;
      if (p.role === "wolf" && it.kind === "garlic") {
        if (p.fx.stun <= 0) { p.fx.stun = 1.2; it.gone = true; s.events.push({ e: "sneeze", x: p.x, y: p.y, who: p.id }); }
        continue;
      }
      if (p.item || (rule !== "both" && rule !== p.role)) continue;
      p.item = it.kind; it.gone = true;
      s.events.push({ e: "pickup", who: p.id, kind: it.kind });
    }
  }
  s.items = s.items.filter((it) => !it.gone);

  // Survivor points: 1 per second alive, handed out on whole seconds
  for (const p of s.players) {
    if (p.role === "surv" && p.alive && Math.floor(p.round) > Math.floor(p.round - dt)) p.score += 1;
  }

  const survivorsLeft = s.players.filter((p) => p.role === "surv" && p.alive).length;
  const anySurvivors = s.players.some((p) => p.role === "surv");
  if (!wolf || !anySurvivors || survivorsLeft === 0 || s.timer <= 0) endRound(s);
}

function tileEffects(s, p) {
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
  const key = `${tx},${ty}`;
  const entered = key !== p.lastTile;
  p.lastTile = key;
  if (p.padLock && p.padLock !== key) p.padLock = "";
  const t = tileAt(tx, ty);

  // Vents, tubes, slides
  const l = linkFrom(tx, ty);
  if (l && p.padLock !== key && p.fx.hold <= 0 && !(l.kind === "vent" && p.role === "wolf")) {
    const c = center(l.to[0], l.to[1]);
    s.events.push({ e: l.kind, x: p.x, y: p.y, x2: c.x, y2: c.y, who: p.id });
    p.x = c.x; p.y = c.y;
    p.padLock = `${l.to[0]},${l.to[1]}`;
    p.lastTile = p.padLock;
    if (l.kind === "slide") { p.vx *= 0.3; p.vy = 120; }
    return;
  }

  // Swinging doors: the door swings after you pass, bonking whoever follows too close
  if (t === "D" && entered) {
    const id = doorOf.get(key);
    const sw = s.doorSwing[id];
    if (sw && sw.by !== p.id) {
      p.fx.stun = 0.9;
      p.vx = -p.vx * 0.8; p.vy = -p.vy * 0.8;
      sw.t = Math.max(sw.t, 0.3);
      s.events.push({ e: "bonk", x: p.x, y: p.y, who: p.id });
    } else {
      s.doorSwing[id] = { t: 1.0, by: p.id, dir: Math.sign(p.vx + p.vy) || 1 };
      s.events.push({ e: "door", x: p.x, y: p.y });
    }
  }
}

function useItem(s, p) {
  const kind = p.item;
  p.item = null;
  if (kind === "soda") p.fx.speed = 3.5;
  else if (kind === "grease") s.puddles.push({ x: p.x - p.face * 6, y: p.y, t: 14, team: p.role, by: p.id });
  else if (kind === "garlic") p.fx.shield = 7;
  else if (kind === "smoke") s.smokes.push({ x: p.x, y: p.y, t: 7, r: 120 });
  else if (kind === "moon") p.fx.howl = 5;
  s.events.push({ e: "use", who: p.id, kind, x: p.x, y: p.y });
}

function endRound(s) {
  const wolf = wolfOf(s);
  const survivors = s.players.filter((p) => p.role === "surv");
  const escaped = survivors.filter((p) => p.alive);
  for (const p of escaped) p.score += 15;
  if (wolf && survivors.length && !escaped.length) wolf.score += 10;
  s.phase = "roundEnd";
  s.timer = CFG.intermission;
  s.events.push({
    e: "roundEnd",
    wolf: wolf ? wolf.id : null,
    escaped: escaped.map((p) => p.id),
    caught: survivors.filter((p) => !p.alive).map((p) => p.id),
    last: s.roundIndex + 1 >= s.totalRounds,
  });
}

function endGame(s) {
  s.phase = "gameEnd";
  const ranking = [...s.players].sort((a, b) => b.score - a.score).map((p) => ({ id: p.id, name: p.name, color: p.color, score: p.score, catches: p.catches }));
  s.results = ranking;
  s.events.push({ e: "gameEnd", ranking });
}

export function removePlayer(s, id) {
  s.players = s.players.filter((p) => p.id !== id);
  s.order = s.order.filter((x) => x !== id);
}

// ---- network snapshot ----
const r1 = (v) => Math.round(v * 10) / 10;
export function snapshot(s) {
  return {
    phase: s.phase, timer: r1(s.timer), round: s.roundIndex + 1, of: s.totalRounds,
    players: s.players.map((p) => ({
      id: p.id, name: p.name, color: p.color, bot: p.isBot,
      x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), face: p.face,
      role: p.role, alive: p.alive, item: p.item, score: p.score, catches: p.catches,
      fx: Object.fromEntries(Object.entries(p.fx).filter(([, v]) => v > 0).map(([k, v]) => [k, r1(v)])),
    })),
    items: s.items.map((it) => [it.id, it.x, it.y, it.kind]),
    puddles: s.puddles.map((g) => [Math.round(g.x), Math.round(g.y), r1(g.t), g.team]),
    smokes: s.smokes.map((c) => [Math.round(c.x), Math.round(c.y), r1(c.t), c.r]),
    doors: Object.entries(s.doorSwing).map(([id, d]) => [+id, r1(d.t), d.dir]),
    results: s.results,
  };
}

export { COLS, ROWS };
