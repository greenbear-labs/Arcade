// Drawing: the restaurant (pre-rendered once), characters, pickups, lighting and HUD.
import { TILE, COLS, ROWS, WORLD_W, WORLD_H, map, tileAt, rooms, doors, links } from "./map.js";
import { ITEMS } from "./sim.js";

export const VIEW_W = 960;
export const VIEW_H = 600;

// ---------- seeded random so the decoration is the same on every screen ----------
let seed = 7;
const srand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

const FLOOR = {
  ".": ["#f4e6c8", "#d9493b"],   // diner checkers
  "h": ["#2e8f8a", "#277a76"],
  "k": ["#c9cfd4", "#b3bac1"],
  "i": ["#d8f1ff", "#c3e6fb"],
  "q": ["#6a3d9a", "#5d3388"],
  "y": ["#2f7de1", "#29b35a"],
  ",": ["#3a3d44", "#363940"],
  "D": ["#2e8f8a", "#277a76"],
};

function floorFor(tx, ty) {
  const t = tileAt(tx, ty);
  if (FLOOR[t]) return t;
  // special tiles sit on whatever floor is around them
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
    const n = tileAt(tx + dx, ty + dy);
    if (FLOOR[n] && n !== "D") return n;
  }
  return ",";
}

function drawFloor(g, tx, ty, kind) {
  const x = tx * TILE, y = ty * TILE;
  const [a, b] = FLOOR[kind];
  if (kind === ".") {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j + tx + ty) % 2 ? a : b;
      g.fillRect(x + i * 20, y + j * 20, 20, 20);
    }
  } else if (kind === "y") {
    g.fillStyle = (tx + ty) % 2 ? a : b; g.fillRect(x, y, TILE, TILE);
    g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
  } else {
    g.fillStyle = (tx + ty) % 2 ? a : b; g.fillRect(x, y, TILE, TILE);
    if (kind === "k") { g.strokeStyle = "rgba(0,0,0,.08)"; g.strokeRect(x + .5, y + .5, TILE - 1, TILE - 1); }
    if (kind === "i" && srand() < .35) { g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(x + srand() * 36, y + srand() * 36, 3, 3); }
    if (kind === "q" && srand() < .6) {
      for (let n = 0; n < 3; n++) {
        g.fillStyle = ["#ffd23a", "#ff6fb5", "#4ec3ff", "#7be05a"][Math.floor(srand() * 4)];
        g.fillRect(x + srand() * 36, y + srand() * 36, 4, 4);
      }
    }
    if (kind === ",") {
      if (srand() < .1) { g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.arc(x + srand() * 40, y + srand() * 40, 3 + srand() * 5, 0, 7); g.fill(); }
    }
  }
}

function drawSolid(g, tx, ty, t) {
  const x = tx * TILE, y = ty * TILE;
  if (t === "#") {
    const outside = tx === 0 || ty === 0 || tx === COLS - 1 || ty === ROWS - 1;
    g.fillStyle = outside ? "#1b1d22" : "#7a2b25"; g.fillRect(x, y, TILE, TILE);
    if (!outside) {
      g.fillStyle = "#9b3a30";
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) g.fillRect(x + c * 20 + (r % 2) * 10 - 9, y + r * 10 + 1, 18, 8);
      g.fillStyle = "#7a2b25"; g.fillRect(x - 1, y, 1, TILE);
      if (!["#", "G", "T", "C", "P"].includes(tileAt(tx, ty - 1))) { g.fillStyle = "#ffcf3a"; g.fillRect(x, y, TILE, 5); }
    } else {
      g.fillStyle = "#121317"; g.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
    }
  } else if (t === "G") {
    g.fillStyle = "#8d98a3"; g.fillRect(x, y + 2, TILE, TILE - 4);
    g.fillStyle = "#59636d"; g.fillRect(x + 3, y + 6, TILE - 6, TILE - 12);
    g.strokeStyle = "#2a2f35"; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + 6 + i * 9, y + 8); g.lineTo(x + 6 + i * 9, y + TILE - 8); g.stroke(); }
    g.fillStyle = "rgba(255,120,30,.55)"; g.fillRect(x + 5, y + 10, TILE - 10, 4);
    if ((tx + ty) % 3 === 0) { // patties!
      g.fillStyle = "#6b3b1f"; g.beginPath(); g.ellipse(x + 20, y + 20, 9, 6, 0, 0, 7); g.fill();
    }
  } else if (t === "T") {
    const party = floorFor(tx, ty) === "q";
    g.fillStyle = party ? "#ff8fc8" : "#c8302a"; g.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    g.fillStyle = party ? "#ffd0e8" : "#e85a4a"; g.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
    if (srand() < .4) { // food on the table
      g.fillStyle = "#ffcf3a"; g.fillRect(x + 10 + srand() * 14, y + 10 + srand() * 14, 8, 6);
    }
    if (party && srand() < .3) { g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 20, y + 20, 7, 0, 7); g.fill(); g.fillStyle = "#ff3f6c"; g.fillRect(x + 19, y + 9, 2, 6); }
  } else if (t === "C") {
    if (floorFor(tx, ty) === ",") {
      g.fillStyle = "#5a3d24"; g.fillRect(x + 2, y + 10, TILE - 4, TILE - 12);
      g.fillStyle = "#3fa34d"; g.beginPath(); g.arc(x + 12, y + 14, 11, 0, 7); g.arc(x + 28, y + 14, 11, 0, 7); g.fill();
    } else {
      g.fillStyle = "#a6d8f5"; g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      g.strokeStyle = "#5f9fc7"; g.lineWidth = 2; g.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
      g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + TILE - 4, y + TILE - 4); g.stroke();
    }
  } else if (t === "P") {
    const cols = ["#ff3f6c", "#ffcf3a", "#4ec3ff", "#7be05a"];
    g.fillStyle = cols[(tx + ty) % 4]; g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.arc(x + 20, y + 20, 9, 0, 7); g.fill();
  }
}

function drawSpecial(g, tx, ty, t) {
  const x = tx * TILE, y = ty * TILE, cx = x + 20, cy = y + 20;
  if (t === "b") {
    g.fillStyle = "#1c2b6b"; g.fillRect(x, y, TILE, TILE);
    for (let n = 0; n < 14; n++) {
      g.fillStyle = ["#ff3f6c", "#ffcf3a", "#4ec3ff", "#7be05a", "#ff9a3c", "#c08bff"][Math.floor(srand() * 6)];
      g.beginPath(); g.arc(x + srand() * 40, y + srand() * 40, 5, 0, 7); g.fill();
    }
  } else if (t === "V") {
    g.fillStyle = "#2a2f35"; g.fillRect(x + 4, y + 4, 32, 32);
    g.fillStyle = "#6c7680";
    for (let i = 0; i < 5; i++) g.fillRect(x + 7, y + 7 + i * 6, 26, 3);
    g.strokeStyle = "#9aa4ad"; g.lineWidth = 2; g.strokeRect(x + 4, y + 4, 32, 32);
  } else if (t === "O") {
    g.fillStyle = "#ff9a3c"; g.beginPath(); g.arc(cx, cy, 18, 0, 7); g.fill();
    g.fillStyle = "#3a1a06"; g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.fill();
    g.fillStyle = "#5c2c0c"; g.beginPath(); g.arc(cx + 3, cy + 3, 7, 0, 7); g.fill();
  } else if (t === "S") {
    g.fillStyle = "#ffcf3a"; g.fillRect(x + 6, y + 2, 28, 36);
    g.fillStyle = "#ff3f6c";
    for (let i = 0; i < 3; i++) g.fillRect(x + 8, y + 6 + i * 11, 24, 5);
  } else if (t === "s") {
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.stroke();
  } else if ("><^v".includes(t)) {
    g.fillStyle = "#2b2d33"; g.fillRect(x, y, TILE, TILE);
    g.fillStyle = "#ffcf3a";
    const horiz = t === ">" || t === "<";
    if (horiz) { g.fillRect(x, y + 2, TILE, 3); g.fillRect(x, y + TILE - 5, TILE, 3); }
    else { g.fillRect(x + 2, y, 3, TILE); g.fillRect(x + TILE - 5, y, 3, TILE); }
  }
}

let mapCanvas = null;
function buildMap() {
  seed = 7;
  const c = document.createElement("canvas");
  c.width = WORLD_W; c.height = WORLD_H;
  const g = c.getContext("2d");
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const t = tileAt(tx, ty);
    drawFloor(g, tx, ty, floorFor(tx, ty));
    if (["#", "G", "T", "C", "P"].includes(t)) drawSolid(g, tx, ty, t);
    else drawSpecial(g, tx, ty, t);
  }
  // Room names painted on the floor
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "30px Bungee, Impact, sans-serif";
  for (const r of rooms) {
    if (r.name === "HALLWAY" || r.name === "DRIVE-THRU") continue;
    g.fillStyle = "rgba(0,0,0,.16)";
    g.fillText(r.name, (r.x + r.w / 2) * TILE, (r.y + r.h / 2) * TILE + (r.name === "PLAYLAND" ? 140 : 0));
  }
  g.font = "18px Bungee, Impact, sans-serif";
  g.fillStyle = "rgba(255,207,58,.5)";
  g.fillText("DRIVE-THRU ▶", 30 * TILE, 1.5 * TILE + 2);
  g.fillText("◀ DRIVE-THRU", 30 * TILE, 38.5 * TILE);
  // The sign out front
  const sx = 28 * TILE, sy = 35.5 * TILE;
  g.fillStyle = "#14161b"; g.fillRect(sx - 190, sy - 28, 380, 56);
  g.strokeStyle = "#ffcf3a"; g.lineWidth = 4; g.strokeRect(sx - 190, sy - 28, 380, 56);
  drawLogo(g, sx - 150, sy, 20);
  g.fillStyle = "#ffcf3a"; g.font = "26px Bungee, Impact, sans-serif"; g.textAlign = "left";
  g.fillText("MEGA MOONBURGER", sx - 118, sy + 2);
  // Kitchen order window over the drive-thru
  g.fillStyle = "#ffcf3a"; g.font = "11px 'Press Start 2P', monospace"; g.textAlign = "center";
  g.fillText("PICK UP", 13 * TILE, 4.5 * TILE);
  mapCanvas = c;
}

// The made-up restaurant logo: a burger with a crescent moon bite.
export function drawLogo(g, x, y, r) {
  g.save(); g.translate(x, y);
  g.fillStyle = "#f2a33a"; g.beginPath(); g.arc(0, -r * .1, r, Math.PI, 0); g.fill();
  g.fillStyle = "#6b3b1f"; g.fillRect(-r, -r * .1, r * 2, r * .35);
  g.fillStyle = "#7be05a"; g.fillRect(-r * 1.05, r * .2, r * 2.1, r * .15);
  g.fillStyle = "#f2a33a"; g.beginPath(); g.ellipse(0, r * .5, r, r * .25, 0, 0, 7); g.fill();
  g.fillStyle = "#14161b"; g.beginPath(); g.arc(r * .55, -r * .55, r * .55, 0, 7); g.fill();
  g.fillStyle = "#fff6c8"; g.beginPath(); g.arc(r * .75, -r * .75, r * .32, 0, 7); g.fill();
  g.fillStyle = "#14161b"; g.beginPath(); g.arc(r * .88, -r * .85, r * .26, 0, 7); g.fill();
  g.restore();
}

// ---------- pickups ----------
export function drawItem(g, kind, x, y, s = 1, t = 0) {
  g.save(); g.translate(x, y + Math.sin(t * 4 + x) * 2 * s); g.scale(s, s);
  if (kind === "soda") {
    g.fillStyle = "#e63b2e"; g.beginPath(); g.moveTo(-8, -9); g.lineTo(8, -9); g.lineTo(6, 11); g.lineTo(-6, 11); g.fill();
    g.fillStyle = "#fff"; g.fillRect(-7, -2, 14, 4);
    g.fillStyle = "#ddd"; g.fillRect(-9, -12, 18, 4);
    g.fillStyle = "#ffcf3a"; g.fillRect(1, -20, 3, 9);
  } else if (kind === "grease") {
    g.fillStyle = "#c9cfd4"; g.beginPath(); g.moveTo(-9, -8); g.lineTo(9, -8); g.lineTo(7, 10); g.lineTo(-7, 10); g.fill();
    g.fillStyle = "#c58a1c"; g.beginPath(); g.ellipse(0, -8, 9, 3, 0, 0, 7); g.fill();
    g.strokeStyle = "#555"; g.lineWidth = 2; g.beginPath(); g.arc(0, -8, 10, Math.PI, 0); g.stroke();
  } else if (kind === "garlic") {
    g.fillStyle = "#ffe066";
    for (let i = -3; i <= 3; i++) g.fillRect(i * 2.5 - 1, -14 + Math.abs(i), 2.5, 12);
    g.fillStyle = "#e63b2e"; g.beginPath(); g.moveTo(-9, -4); g.lineTo(9, -4); g.lineTo(6, 11); g.lineTo(-6, 11); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 3, 4, 0, 7); g.fill();
  } else if (kind === "smoke") {
    g.fillStyle = "#b07ad6"; g.beginPath(); g.arc(0, 2, 10, 0, 7); g.fill();
    g.fillStyle = "#d9b3f2"; g.beginPath(); g.arc(-3, -1, 4, 0, 7); g.fill();
    g.strokeStyle = "#7be05a"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -8); g.quadraticCurveTo(4, -16, 8, -14); g.stroke();
  } else if (kind === "moon") {
    g.fillStyle = "#c58a4a"; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill();
    g.fillStyle = "#fff6c8"; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill();
    g.fillStyle = "#c58a4a"; g.beginPath(); g.arc(3, -2, 6, 0, 7); g.fill();
  }
  g.restore();
}

// ---------- characters ----------
function drawSurvivor(g, p, t, alpha) {
  const bob = Math.hypot(p.vx, p.vy) > 20 ? Math.sin(t * 16) * 2 : 0;
  g.save(); g.translate(p.x, p.y + bob); g.globalAlpha = alpha;
  if (p.fx.slip) g.rotate(t * 14);
  if (p.fx.shield) {
    g.strokeStyle = "rgba(255,224,102,.9)"; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 21 + Math.sin(t * 8) * 2, 0, 7); g.stroke();
  }
  g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(0, 14 - bob, 13, 5, 0, 0, 7); g.fill();
  g.fillStyle = p.color; g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; g.stroke();
  // crew cap
  g.fillStyle = "#fff"; g.fillRect(-11, -16, 22, 7);
  g.fillStyle = "#e63b2e"; g.fillRect(-11, -12, 22, 3);
  g.fillStyle = "#e63b2e"; g.fillRect(p.face > 0 ? 5 : -15, -11, 10, 3);
  // face
  const f = p.face || 1;
  g.fillStyle = "#fff"; g.beginPath(); g.arc(f * 4 - 4, -2, 4, 0, 7); g.arc(f * 4 + 4, -2, 4, 0, 7); g.fill();
  g.fillStyle = "#14161b"; g.beginPath(); g.arc(f * 5 - 4, -2, 2, 0, 7); g.arc(f * 5 + 4, -2, 2, 0, 7); g.fill();
  g.fillStyle = "#14161b"; g.fillRect(f * 4 - 3, 6, 6, 2);
  if (p.fx.speed) {
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-f * 18, i * 7); g.lineTo(-f * 28, i * 7); g.stroke(); }
  }
  g.restore();
}

function drawGhost(g, p, t) {
  g.save(); g.translate(p.x, p.y + Math.sin(t * 3 + p.x) * 3); g.globalAlpha = .55;
  g.fillStyle = "#eef3ff";
  g.beginPath(); g.arc(0, -2, 13, Math.PI, 0); g.lineTo(13, 12);
  for (let i = 0; i < 4; i++) g.lineTo(13 - (i + .5) * 6.5, i % 2 ? 12 : 7);
  g.lineTo(-13, 12); g.closePath(); g.fill();
  g.fillStyle = p.color; g.fillRect(-10, -14, 20, 4);
  g.fillStyle = "#14161b"; g.beginPath(); g.arc(-4, -2, 2.5, 0, 7); g.arc(4, -2, 2.5, 0, 7); g.fill();
  g.restore();
}

function drawWolf(g, p, t) {
  const moving = Math.hypot(p.vx, p.vy) > 20;
  const bob = moving ? Math.sin(t * 18) * 2.5 : 0;
  const f = p.face || 1;
  g.save(); g.translate(p.x, p.y + bob);
  if (p.fx.slip) g.rotate(t * 12);
  g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 17 - bob, 17, 6, 0, 0, 7); g.fill();
  // ears
  g.fillStyle = "#3b3346";
  g.beginPath(); g.moveTo(-14, -8); g.lineTo(-9, -26); g.lineTo(-2, -12); g.fill();
  g.beginPath(); g.moveTo(14, -8); g.lineTo(9, -26); g.lineTo(2, -12); g.fill();
  g.fillStyle = "#c86b8a";
  g.beginPath(); g.moveTo(-11, -11); g.lineTo(-9, -21); g.lineTo(-5, -13); g.fill();
  g.beginPath(); g.moveTo(11, -11); g.lineTo(9, -21); g.lineTo(5, -13); g.fill();
  // furry body
  g.fillStyle = "#4b425a";
  g.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, r = i % 2 ? 15 : 19;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath(); g.fill();
  // snout
  g.fillStyle = "#8a7d99"; g.beginPath(); g.ellipse(f * 7, 5, 9, 7, 0, 0, 7); g.fill();
  g.fillStyle = "#14161b"; g.beginPath(); g.arc(f * 13, 3, 3, 0, 7); g.fill();
  // fangs
  g.fillStyle = "#fff";
  g.beginPath(); g.moveTo(f * 3, 9); g.lineTo(f * 5, 15); g.lineTo(f * 7, 9); g.fill();
  g.beginPath(); g.moveTo(f * 8, 9); g.lineTo(f * 10, 14); g.lineTo(f * 12, 9); g.fill();
  // glowing eyes
  const glow = p.fx.stun ? "#9aa58e" : "#ffe03a";
  g.fillStyle = glow; g.shadowColor = glow; g.shadowBlur = p.fx.stun ? 0 : 10;
  g.beginPath(); g.ellipse(f * 3 - 6, -5, 4, 3, 0, 0, 7); g.ellipse(f * 3 + 5, -5, 4, 3, 0, 0, 7); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = "#14161b"; g.fillRect(f * 3 - 6, -7, 2, 4); g.fillRect(f * 3 + 5, -7, 2, 4);
  // little crew apron so you know he works here
  g.fillStyle = p.color; g.fillRect(-8, 11, 16, 6);
  if (p.fx.stun) { // dizzy stars
    g.fillStyle = "#ffe03a";
    for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; g.fillRect(Math.cos(a) * 16 - 2, -24 + Math.sin(a) * 4, 4, 4); }
  }
  if (p.fx.speed) {
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-f * 22, i * 8); g.lineTo(-f * 34, i * 8); g.stroke(); }
  }
  g.restore();
}

function drawNameTag(g, p, alpha = 1) {
  g.save(); g.globalAlpha = alpha;
  g.font = "bold 12px Rubik, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom";
  const w = g.measureText(p.name).width + 10;
  const y = p.y - (p.role === "wolf" && p.alive ? 30 : 22);
  g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(p.x - w / 2, y - 15, w, 15);
  g.fillStyle = p.role === "wolf" && p.alive ? "#ffe03a" : "#fff"; g.fillText(p.name, p.x, y - 1);
  g.restore();
}

// ---------- doors ----------
function drawDoors(g, doorState, t) {
  for (const d of doors) {
    const sw = doorState.get(d.id);
    const swing = sw ? Math.sin(Math.min(1, sw[1]) * Math.PI * 3) * sw[1] : 0;
    const xs = d.tiles.map(([x]) => x), ys = d.tiles.map(([, y]) => y);
    const x0 = Math.min(...xs) * TILE, y0 = Math.min(...ys) * TILE;
    const x1 = (Math.max(...xs) + 1) * TILE, y1 = (Math.max(...ys) + 1) * TILE;
    g.save();
    g.fillStyle = "#8a5a2b"; g.strokeStyle = "#5a3a1b"; g.lineWidth = 2;
    if (d.horizontalWall) {
      const mid = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      for (const side of [-1, 1]) {
        g.save(); g.translate(side < 0 ? x0 : x1, cy);
        g.rotate(side * swing * 1.2);
        const len = (mid - x0) - 2;
        g.fillRect(side < 0 ? 0 : -len, -4, len, 8); g.strokeRect(side < 0 ? 0 : -len, -4, len, 8);
        g.fillStyle = "#cfe8ff"; g.fillRect(side < 0 ? len * .4 : -len * .6, -2, len * .2, 4);
        g.restore();
        g.fillStyle = "#8a5a2b";
      }
    } else {
      const mid = (y0 + y1) / 2, cx = (x0 + x1) / 2;
      for (const side of [-1, 1]) {
        g.save(); g.translate(cx, side < 0 ? y0 : y1);
        g.rotate(-side * swing * 1.2);
        const len = (mid - y0) - 2;
        g.fillRect(-4, side < 0 ? 0 : -len, 8, len); g.strokeRect(-4, side < 0 ? 0 : -len, 8, len);
        g.restore();
      }
    }
    g.restore();
  }
}

// ---------- particles ----------
const particles = [];
const texts = [];
export function burst(x, y, colors, n = 14, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (.4 + Math.random() * .8);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .6 + Math.random() * .4, c: colors[i % colors.length], r: 2 + Math.random() * 3 });
  }
}
export function floatText(x, y, text, color = "#fff") { texts.push({ x, y, text, color, life: 1.2 }); }

function drawParticles(g, dt) {
  for (const p of particles) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy *= .92;
    g.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
  g.font = "16px Bungee, Impact, sans-serif"; g.textAlign = "center";
  for (const tx of texts) {
    tx.life -= dt; tx.y -= 30 * dt;
    g.globalAlpha = Math.max(0, Math.min(1, tx.life * 2));
    g.fillStyle = "#14161b"; g.fillText(tx.text, tx.x + 2, tx.y + 2);
    g.fillStyle = tx.color; g.fillText(tx.text, tx.x, tx.y);
  }
  g.globalAlpha = 1;
  for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
}

// ---------- lighting ----------
let dark = null;
function lighting(g, cx, cy, radius, view) {
  if (!dark) { dark = document.createElement("canvas"); dark.width = VIEW_W; dark.height = VIEW_H; }
  const d = dark.getContext("2d");
  d.globalCompositeOperation = "source-over";
  d.clearRect(0, 0, VIEW_W, VIEW_H);
  d.fillStyle = "rgba(6,6,24,.86)"; d.fillRect(0, 0, VIEW_W, VIEW_H);
  d.globalCompositeOperation = "destination-out";
  const grad = d.createRadialGradient(cx, cy, radius * .35, cx, cy, radius);
  grad.addColorStop(0, "rgba(0,0,0,1)"); grad.addColorStop(1, "rgba(0,0,0,0)");
  d.fillStyle = grad; d.beginPath(); d.arc(cx, cy, radius, 0, 7); d.fill();
  // little lamps: pickups glow so you can find them
  for (const l of view.lamps) {
    const gr = d.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    gr.addColorStop(0, `rgba(0,0,0,${l.a})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    d.fillStyle = gr; d.beginPath(); d.arc(l.x, l.y, l.r, 0, 7); d.fill();
  }
  g.drawImage(dark, 0, 0);
}

// ---------- the frame ----------
export function makeRenderer(canvas) {
  const g = canvas.getContext("2d");
  if (!mapCanvas) buildMap();
  const cam = { x: WORLD_W / 2, y: WORLD_H / 2 };
  let shake = 0;

  function frame(view, dt, t) {
    const me = view.players.find((p) => p.id === view.meId);
    const wolf = view.players.find((p) => p.role === "wolf");
    const focus = me || wolf || { x: WORLD_W / 2, y: WORLD_H / 2 };
    cam.x += (focus.x - cam.x) * Math.min(1, dt * 10);
    cam.y += (focus.y - cam.y) * Math.min(1, dt * 10);
    if (Math.hypot(focus.x - cam.x, focus.y - cam.y) > 400) { cam.x = focus.x; cam.y = focus.y; }
    const ox = Math.round(Math.max(0, Math.min(WORLD_W - VIEW_W, cam.x - VIEW_W / 2)) + (shake > 0 ? (Math.random() - .5) * shake * 12 : 0));
    const oy = Math.round(Math.max(0, Math.min(WORLD_H - VIEW_H, cam.y - VIEW_H / 2)) + (shake > 0 ? (Math.random() - .5) * shake * 12 : 0));
    shake = Math.max(0, shake - dt);

    g.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
    g.fillStyle = "#0b0d0a"; g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.drawImage(mapCanvas, ox, oy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
    g.save(); g.translate(-ox, -oy);

    // conveyor arrows
    g.fillStyle = "rgba(255,207,58,.85)";
    const phase = (t * 95) % TILE;
    for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + VIEW_H) / TILE); ty++) {
      for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + VIEW_W) / TILE); tx++) {
        const c = tileAt(tx, ty);
        const dir = { ">": [1, 0], "<": [-1, 0], "^": [0, -1], "v": [0, 1] }[c];
        if (!dir) continue;
        const x = tx * TILE + 20 + dir[0] * (phase - 20), y = ty * TILE + 20 + dir[1] * (phase - 20);
        g.save(); g.translate(x, y); g.rotate(Math.atan2(dir[1], dir[0]));
        g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -7); g.lineTo(-4, 7); g.fill();
        g.restore();
      }
    }

    // puddles and smoke
    for (const [x, y, life] of view.puddles) {
      g.globalAlpha = Math.min(1, life / 2);
      g.fillStyle = "#b3801c"; g.beginPath(); g.ellipse(x, y, 30, 20, 0, 0, 7); g.fill();
      g.fillStyle = "rgba(255,240,180,.5)"; g.beginPath(); g.ellipse(x - 8, y - 6, 9, 4, -.4, 0, 7); g.fill();
      g.globalAlpha = 1;
    }
    const doorState = new Map(view.doors.map((d) => [d[0], d]));
    drawDoors(g, doorState, t);
    for (const [, x, y, kind] of view.items) {
      g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.arc(x, y, 18 + Math.sin(t * 5) * 2, 0, 7); g.fill();
      drawItem(g, kind, x, y, 1, t);
    }

    // who can I see?
    const amWolf = me && me.role === "wolf" && me.alive;
    const ghost = me && !me.alive;
    const lightR = ghost ? 520 : amWolf ? 250 : 270;
    const visible = (p) => {
      if (!me || ghost || p.id === me.id) return true;
      if (!p.alive) return true;
      if (amWolf) {
        if (me.fx.howl) return true;
        if (p.hidden && Math.hypot(p.x - me.x, p.y - me.y) > 80) return false;
        return Math.hypot(p.x - me.x, p.y - me.y) < lightR * .95;
      }
      if (p.role === "surv") return true;
      return Math.hypot(p.x - me.x, p.y - me.y) < lightR * .95;
    };
    const sorted = [...view.players].sort((a, b) => a.y - b.y);
    const later = [];
    for (const p of sorted) {
      if (!visible(p)) continue;
      const inLight = !me || Math.hypot(p.x - me.x, p.y - me.y) < lightR * .8 || ghost;
      if (!inLight) { later.push(p); continue; }
      if (!p.alive) drawGhost(g, p, t);
      else if (p.role === "wolf") drawWolf(g, p, t);
      else if (p.hidden && me && p.id !== me.id) { // peeking out of the ball pit
        g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y + 6, 10, Math.PI, 0); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(p.x - 4, p.y + 2, 3, 0, 7); g.arc(p.x + 4, p.y + 2, 3, 0, 7); g.fill();
      } else drawSurvivor(g, p, t, p.hidden ? .75 : 1);
    }
    for (const [x, y, life, r] of view.smokes) {
      g.globalAlpha = Math.min(.8, life / 2);
      for (let i = 0; i < 9; i++) {
        const a = i * .7 + t * .3;
        g.fillStyle = i % 2 ? "#9ec27a" : "#b9d99b";
        g.beginPath(); g.arc(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .45, r * .45, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    }
    drawParticles(g, dt);
    g.restore();

    // darkness
    const lamps = view.items.map(([, x, y]) => ({ x: x - ox, y: y - oy, r: 46, a: .6 }));
    for (const p of view.players) if (p.role === "wolf" && p.alive && amWolf === false && me && Math.hypot(p.x - me.x, p.y - me.y) < 340) lamps.push({ x: p.x - ox, y: p.y - oy - 4, r: 26, a: .5 });
    if (me) lighting(g, me.x - ox, me.y - oy, lightR, { lamps });
    else lighting(g, VIEW_W / 2, VIEW_H / 2, 900, { lamps });

    // teammates outside the light show as outlines; werewolf eyes glow in the dark
    g.save(); g.translate(-ox, -oy);
    for (const p of later) {
      g.globalAlpha = .7;
      g.strokeStyle = p.color; g.lineWidth = 3;
      g.beginPath(); g.arc(p.x, p.y, 14, 0, 7); g.stroke();
      g.globalAlpha = 1;
    }
    if (me && !amWolf) {
      for (const p of view.players) {
        if (p.role !== "wolf" || !p.alive) continue;
        const d = Math.hypot(p.x - me.x, p.y - me.y);
        if (d > lightR * .8 && d < 420) {
          g.fillStyle = "#ffe03a"; g.shadowColor = "#ffe03a"; g.shadowBlur = 8;
          g.beginPath(); g.ellipse(p.x - 5, p.y - 5, 3, 2, 0, 0, 7); g.ellipse(p.x + 6, p.y - 5, 3, 2, 0, 0, 7); g.fill();
          g.shadowBlur = 0;
        }
      }
    }
    for (const p of sorted) if (visible(p) && (!p.hidden || !amWolf || me.fx.howl)) drawNameTag(g, p, p.alive ? 1 : .6);
    g.restore();

    // werewolf howl arrows toward survivors
    if (amWolf && me.fx.howl) {
      for (const p of view.players) {
        if (p.role !== "surv" || !p.alive) continue;
        const sx = p.x - ox, sy = p.y - oy;
        if (sx > 0 && sx < VIEW_W && sy > 0 && sy < VIEW_H) continue;
        const a = Math.atan2(sy - VIEW_H / 2, sx - VIEW_W / 2);
        const ex = VIEW_W / 2 + Math.cos(a) * (VIEW_W / 2 - 30), ey = VIEW_H / 2 + Math.sin(a) * (VIEW_H / 2 - 30);
        g.save(); g.translate(ex, ey); g.rotate(a); g.fillStyle = p.color;
        g.beginPath(); g.moveTo(16, 0); g.lineTo(-8, -10); g.lineTo(-8, 10); g.fill(); g.restore();
      }
    }

    // heartbeat when the werewolf is close
    if (me && me.alive && me.role === "surv" && wolf && wolf.alive && view.phase === "play") {
      const d = Math.hypot(wolf.x - me.x, wolf.y - me.y);
      if (d < 360) {
        const k = (1 - d / 360) * (.55 + .45 * Math.abs(Math.sin(t * (4 + (1 - d / 360) * 6))));
        const vg = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * .35, VIEW_W / 2, VIEW_H / 2, VIEW_W * .62);
        vg.addColorStop(0, "rgba(230,40,40,0)"); vg.addColorStop(1, `rgba(230,40,40,${.55 * k})`);
        g.fillStyle = vg; g.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    }

    drawHud(g, view, me, t);
  }

  function drawHud(g, view, me, t) {
    // top bar
    g.fillStyle = "rgba(10,10,20,.7)"; g.fillRect(0, 0, VIEW_W, 38);
    g.font = "14px 'Press Start 2P', monospace"; g.textBaseline = "middle";
    g.textAlign = "left"; g.fillStyle = "#9aa58e";
    g.fillText(`ROUND ${view.round}/${view.of}`, 12, 20);
    const secs = Math.max(0, Math.ceil(view.timer));
    g.textAlign = "center";
    g.fillStyle = view.phase === "play" && secs <= 10 ? "#ff5a4a" : "#fff";
    if (view.phase === "play") g.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`, VIEW_W / 2, 20);
    const alive = view.players.filter((p) => p.role === "surv" && p.alive).length;
    const total = view.players.filter((p) => p.role === "surv").length;
    g.textAlign = "right"; g.fillStyle = "#7be05a";
    g.fillText(`SURVIVORS ${alive}/${total}`, VIEW_W - 12, 20);

    // role badge + item slot
    if (me) {
      const role = !me.alive ? "GHOST" : me.role === "wolf" ? "WEREWOLF" : "SURVIVOR";
      g.font = "16px Bungee, Impact, sans-serif"; g.textAlign = "left";
      g.fillStyle = "rgba(10,10,20,.7)"; g.fillRect(10, VIEW_H - 74, 210, 64);
      g.fillStyle = me.role === "wolf" ? "#ffe03a" : !me.alive ? "#cfd8ff" : "#7be05a";
      g.fillText(role, 20, VIEW_H - 58);
      g.font = "12px Rubik, system-ui, sans-serif"; g.fillStyle = "#fff";
      g.fillText(`Score ${me.score}`, 20, VIEW_H - 38);
      g.strokeStyle = me.item ? "#ffcf3a" : "#444"; g.lineWidth = 2;
      g.strokeRect(150, VIEW_H - 68, 60, 52);
      if (me.item) {
        drawItem(g, me.item, 180, VIEW_H - 44, 1.3, t);
        g.font = "11px Rubik, system-ui, sans-serif"; g.textAlign = "left"; g.fillStyle = "#ffcf3a";
        g.fillText(ITEMS[me.item].name, 228, VIEW_H - 52);
        g.fillStyle = "#cfd3c8"; g.fillText(view.touch ? "Tap USE" : "Space to use", 228, VIEW_H - 34);
      }
      const effects = [];
      if (me.fx.speed) effects.push("ZOOM");
      if (me.fx.shield) effects.push("GARLIC SHIELD");
      if (me.fx.howl) effects.push("HOWL");
      if (me.fx.stun) effects.push("DIZZY");
      if (me.fx.slip) effects.push("SLIPPING");
      if (me.hidden && me.alive) effects.push("HIDDEN");
      g.font = "11px 'Press Start 2P', monospace"; g.fillStyle = "#ffcf3a"; g.textAlign = "left";
      effects.forEach((e, i) => g.fillText(e, 14, VIEW_H - 90 - i * 16));
    }

    drawMinimap(g, view, me);

    // center banners
    if (view.banner && view.banner.t > 0) banner(g, view.banner.title, view.banner.sub, view.banner.color);
    else if (view.phase === "play" && me && me.fx.hold && me.role === "wolf") banner(g, "WAIT FOR IT...", `Hunting starts in ${Math.ceil(me.fx.hold)}`, "#ffe03a");
    else if (view.phase === "play" && view.wolfHold > 0 && me && me.role === "surv") banner(g, "RUN AND HIDE!", `The werewolf is loose in ${Math.ceil(view.wolfHold)}`, "#7be05a");
    if (view.phase === "roundEnd" || view.phase === "gameEnd") scoreboard(g, view);
  }

  function banner(g, title, sub, color, yk = .3) {
    const y = VIEW_H * yk;
    g.fillStyle = "rgba(10,10,20,.72)"; g.fillRect(0, y - 44, VIEW_W, 84);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "34px Bungee, Impact, sans-serif"; g.fillStyle = color; g.fillText(title, VIEW_W / 2, y - 12);
    if (sub) { g.font = "15px Rubik, system-ui, sans-serif"; g.fillStyle = "#fff"; g.fillText(sub, VIEW_W / 2, y + 22); }
  }

  function scoreboard(g, view) {
    const rows = [...view.players].sort((a, b) => b.score - a.score);
    const h = 120 + rows.length * 36;
    const x = VIEW_W / 2 - 230, y = VIEW_H / 2 - h / 2;
    g.fillStyle = "rgba(10,10,20,.9)"; g.fillRect(x, y, 460, h);
    g.strokeStyle = "#ffcf3a"; g.lineWidth = 3; g.strokeRect(x, y, 460, h);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "24px Bungee, Impact, sans-serif"; g.fillStyle = "#ffcf3a";
    g.fillText(view.phase === "gameEnd" ? "FINAL SCORES" : view.roundTitle || "ROUND OVER", VIEW_W / 2, y + 30);
    g.font = "13px Rubik, system-ui, sans-serif"; g.fillStyle = "#cfd3c8";
    if (view.roundSub) g.fillText(view.roundSub, VIEW_W / 2, y + 58);
    rows.forEach((p, i) => {
      const ry = y + 92 + i * 36;
      g.fillStyle = p.color; g.beginPath(); g.arc(x + 40, ry, 10, 0, 7); g.fill();
      g.textAlign = "left"; g.font = "16px Rubik, system-ui, sans-serif"; g.fillStyle = "#fff";
      g.fillText(`${i === 0 && view.phase === "gameEnd" ? "👑 " : ""}${p.name}${p.bot ? " (bot)" : ""}`, x + 60, ry);
      g.textAlign = "right"; g.font = "14px 'Press Start 2P', monospace"; g.fillStyle = "#ffcf3a";
      g.fillText(String(p.score), x + 430, ry);
    });
    if (view.phase === "roundEnd") {
      g.textAlign = "center"; g.font = "12px Rubik, system-ui, sans-serif"; g.fillStyle = "#9aa58e";
      g.fillText(`Next round in ${Math.max(0, Math.ceil(view.timer))}...`, VIEW_W / 2, y + h - 16);
    }
  }

  function drawMinimap(g, view, me) {
    const s = 3, w = COLS * s, h = ROWS * s;
    const x = VIEW_W - w - 10, y = VIEW_H - h - 10;
    if (!drawMinimap.base) {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const m = c.getContext("2d");
      for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
        const t = map[ty][tx];
        m.fillStyle = ["#", "G", "T", "C", "P"].includes(t) ? "#14161b" : t === "V" ? "#9aa4ad" : t === "O" || t === "S" ? "#ff9a3c" : t === "b" ? "#4e5fd6" : "#4a5060";
        m.fillRect(tx * s, ty * s, s, s);
      }
      drawMinimap.base = c;
    }
    g.globalAlpha = .85;
    g.drawImage(drawMinimap.base, x, y);
    g.globalAlpha = 1;
    g.strokeStyle = "#ffcf3a"; g.lineWidth = 1; g.strokeRect(x - .5, y - .5, w + 1, h + 1);
    const amWolf = me && me.role === "wolf" && me.alive;
    for (const p of view.players) {
      const mine = me && p.id === me.id;
      let show = mine || !me || !me.alive;
      if (!show && !amWolf && p.role === "surv") show = true;
      if (!show && amWolf && me.fx.howl && p.alive) show = true;
      if (!show) continue;
      g.fillStyle = p.role === "wolf" && p.alive ? "#ffe03a" : p.alive ? p.color : "rgba(255,255,255,.4)";
      const r = mine ? 3 : 2;
      g.fillRect(x + (p.x / TILE) * s - r, y + (p.y / TILE) * s - r, r * 2, r * 2);
      if (mine) { g.strokeStyle = "#fff"; g.strokeRect(x + (p.x / TILE) * s - 4, y + (p.y / TILE) * s - 4, 8, 8); }
    }
  }

  return { frame, shake: (v) => { shake = Math.max(shake, v); } };
}
