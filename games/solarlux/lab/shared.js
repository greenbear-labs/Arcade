// SolarLux Battle Lab: crew, enemies, stages and helpers shared by the prototype battle modes.
// Plain JS, no build step. Numbers here are first-pass tuning for playtests, not final balance.
"use strict";

const DEPTS = [
  { name: "Bridge Command", color: "#4f7bd9" },
  { name: "Guest Services", color: "#e9c46a" },
  { name: "Engineering", color: "#9bd16b" },
  { name: "Security", color: "#e25555" },
  { name: "Entertainment", color: "#a77ae6" },
];

// Skill kinds: hit (one enemy), aoe (all enemies), heal (squad), shield (squad), stun (one enemy, plus damage),
// charge (fills the rest of the squad's meters), buff (squad damage up for a while).
// pow is a multiple of the crew member's attack. Rush reads time in seconds; Match reads it in enemy turns.
const CREW = {
  sable:   { name: "Sable",   full: "Sable Dren",       dept: 3, hp: 220, atk: 26, spd: 8,  skill: { name: "Lockdown",          kind: "stun",   pow: 3.2, dur: 3 } },
  marisol: { name: "Marisol", full: "Marisol Reyes",    dept: 3, hp: 180, atk: 24, spd: 11, skill: { name: "Rescue Dive",       kind: "shield", pow: 1.6, dur: 6 } },
  rhea:    { name: "Rhea",    full: "Rhea Castellan",   dept: 1, hp: 160, atk: 20, spd: 9,  skill: { name: "Last Call",         kind: "heal",   pow: 3.0 } },
  odette:  { name: "Odette",  full: "Odette Marlowe",   dept: 1, hp: 200, atk: 19, spd: 8,  skill: { name: "Concierge Service", kind: "charge", pow: 0.5 } },
  finn:    { name: "Finn",    full: "Finn Halloway",    dept: 1, hp: 175, atk: 21, spd: 10, skill: { name: "Fresh Towels",      kind: "heal",   pow: 2.2, extra: "cleanse" } },
  barnaby: { name: "Barnaby", full: "Barnaby Crane",    dept: 1, hp: 230, atk: 30, spd: 6,  skill: { name: "Galley Broadside",  kind: "hit",    pow: 5.5 } },
  bolt:    { name: "Bolt",    full: "Brigid \"Bolt\" Okafor", dept: 2, hp: 210, atk: 25, spd: 7, skill: { name: "Overclock",   kind: "aoe",    pow: 3.0 } },
  pip:     { name: "Pip",     full: "Pip Tanaka",       dept: 2, hp: 150, atk: 22, spd: 10, skill: { name: "Drone Swarm",       kind: "aoe",    pow: 2.4, hits: 3 } },
  kaela:   { name: "Kaela",   full: "Kaela Voss",       dept: 0, hp: 170, atk: 23, spd: 11, skill: { name: "Evasive Course",    kind: "shield", pow: 2.0, dur: 6 } },
  juni:    { name: "Juni",    full: "Juniper \"Juni\" Hart", dept: 0, hp: 155, atk: 21, spd: 13, skill: { name: "Signal Jam",  kind: "stun",   pow: 1.8, dur: 4, all: true } },
  lyra:    { name: "Lyra",    full: "Lyra Starling",    dept: 4, hp: 150, atk: 24, spd: 12, skill: { name: "Encore",            kind: "aoe",    pow: 2.6, extra: "charge" } },
  isolde:  { name: "Isolde",  full: "Isolde Fenn",      dept: 4, hp: 165, atk: 20, spd: 9,  skill: { name: "Hot Stone Ritual",  kind: "buff",   pow: 1.5, dur: 8 } },
};
const CREW_IDS = Object.keys(CREW);
const DEFAULT_SQUAD = ["sable", "lyra", "bolt", "rhea"];

function skillText(id) {
  const s = CREW[id].skill;
  switch (s.kind) {
    case "hit": return "Huge hit on the target";
    case "aoe": return "Hits every enemy" + (s.extra === "charge" ? " and charges the squad" : "");
    case "heal": return "Heals the squad" + (s.extra === "cleanse" ? " and clears the enemy's next big attack" : "");
    case "shield": return "Shields the whole squad";
    case "stun": return s.all ? "Jams every enemy's next attack" : "Big hit that stuns the target";
    case "charge": return "Fills the rest of the squad's skill meters";
    case "buff": return "Squad deals 50% more damage for a while";
  }
  return "";
}

// Enemies: hp, atk, how often they act (Rush: seconds between attacks; Match: turns), and a big telegraphed move.
const ENEMIES = {
  pest_grunt:       { name: "Galley Pest",      hp: 260,  atk: 14, every: 3.2, turns: 2, big: "Swarm" },
  stowaway_critter: { name: "Stowaway Fluff",   hp: 220,  atk: 12, every: 2.6, turns: 2, big: "Static Hug" },
  pirate_grunt:     { name: "Scrap Pirate",     hp: 340,  atk: 18, every: 3.4, turns: 3, big: "Hook Slash" },
  security_drone:   { name: "Hacked Drone",     hp: 300,  atk: 20, every: 3.0, turns: 3, big: "Laser Sweep" },
  service_droid:    { name: "Rogue Bot Waiter", hp: 380,  atk: 16, every: 3.0, turns: 3, big: "Hot Soup" },
  pest_queen:       { name: "Pest Queen",       hp: 1500, atk: 26, every: 3.6, turns: 3, big: "Brood Storm", boss: true },
  pirate_captain:   { name: "Captain Rustbeard", hp: 1900, atk: 30, every: 3.8, turns: 3, big: "Broadside", boss: true },
  rival_director:   { name: "Rival Director",   hp: 2100, atk: 28, every: 3.4, turns: 3, big: "Hostile Takeover", boss: true },
  anomaly:          { name: "The Anomaly",      hp: 2600, atk: 34, every: 4.0, turns: 3, big: "Event Horizon", boss: true },
};

const STAGES = [
  { name: "Pool Deck Pests", bg: "bg_battle_pooldeck", waves: [["pest_grunt", "stowaway_critter"], ["pest_grunt", "pest_grunt", "stowaway_critter"], ["pest_queen"]] },
  { name: "Galley Raid", bg: "bg_battle_galley", waves: [["service_droid", "pirate_grunt"], ["pirate_grunt", "security_drone", "pirate_grunt"], ["pirate_captain"]] },
  { name: "Engine Room Takeover", bg: "bg_engine_room", waves: [["security_drone", "security_drone"], ["service_droid", "pirate_grunt", "security_drone"], ["rival_director"]] },
  { name: "Edge of the Anomaly", bg: "bg_pirate_deck", waves: [["pirate_grunt", "security_drone", "pest_grunt"], ["pirate_captain"], ["anomaly"]] },
];

const ART = "art/";
const faceUrl = (id) => ART + "face_" + id + ".webp";
const spriteUrl = (id) => ART + id + ".webp";
const enemyUrl = (id) => ART + "enemy_" + id + ".webp";
const bgUrl = (id) => ART + id + ".webp";

// ---------- storage (best effort: private windows can refuse it) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem("solarlux.lab." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("solarlux.lab." + k, JSON.stringify(v)); } catch (e) {} },
};
function getSquad() {
  const s = store.get("squad", null);
  if (Array.isArray(s) && s.length === 4 && s.every((id) => CREW[id]) && new Set(s).size === 4) return s;
  return DEFAULT_SQUAD.slice();
}
function getStage() {
  const i = parseInt(new URLSearchParams(location.search).get("stage"), 10);
  return isNaN(i) ? store.get("stage", 0) % STAGES.length : Math.max(0, Math.min(STAGES.length - 1, i));
}
function saveResult(mode, stage, stars) {
  const best = store.get("best", {});
  const k = mode + ":" + stage;
  if (!best[k] || best[k] < stars) { best[k] = stars; store.set("best", best); }
}

// ---------- DOM helpers ----------
function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
function floatText(root, x, y, text, cls) {
  const f = el("div", "float " + (cls || ""), root, text);
  f.style.left = x + "px"; f.style.top = y + "px";
  setTimeout(() => f.remove(), 950);
}
function centerOf(root, node) {
  const a = root.getBoundingClientRect(), b = node.getBoundingClientRect();
  return { x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height * 0.35 };
}
function banner(root, text, sub) {
  const b = el("div", "banner", root, text + (sub ? "<small>" + sub + "</small>" : ""));
  setTimeout(() => b.remove(), 1450);
}
function cutIn(root, id) {
  const c = CREW[id];
  const d = el("div", "cutin", root);
  const stripe = el("div", "stripe", d);
  stripe.style.background = "linear-gradient(90deg, rgba(0,0,0,.0), " + DEPTS[c.dept].color + "cc 30%, " + DEPTS[c.dept].color + "ee 70%, rgba(0,0,0,0))";
  const img = el("img", "", d); img.src = spriteUrl(id); img.alt = "";
  el("div", "label", d, "<span>" + DEPTS[c.dept].name + "</span><b>" + c.skill.name + "</b><span>" + c.name + "</span>");
  setTimeout(() => d.remove(), 950);
}
function shake(node) {
  node.animate([{ transform: "translate(0,0)" }, { transform: "translate(-6px,3px)" }, { transform: "translate(5px,-3px)" }, { transform: "translate(0,0)" }], { duration: 220 });
}

// ---------- crew portrait cards ----------
function buildCards(root, squad, onTap) {
  const wrap = el("div", "cards", root);
  return squad.map((id, i) => {
    const c = CREW[id];
    const b = el("button", "card", wrap);
    b.setAttribute("aria-label", c.name + ": " + c.skill.name);
    const img = el("img", "face", b); img.src = faceUrl(id); img.alt = "";
    const fill = el("div", "fill", b); fill.style.height = "0%";
    const dot = el("div", "dept", b); dot.style.background = DEPTS[c.dept].color;
    el("div", "ready", b, "SKILL");
    el("div", "key", b, String(i + 1));
    const meta = el("div", "meta", b);
    el("span", "nm", meta, c.name);
    const bar = el("div", "bar", meta); const hp = el("i", "", bar);
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); onTap(i); });
    return { node: b, fill, hp };
  });
}
function paintCard(card, unit, charge) {
  card.fill.style.height = Math.round(Math.min(1, charge) * 100) + "%";
  card.hp.style.width = Math.max(0, (unit.hp / unit.maxHp) * 100) + "%";
  card.node.classList.toggle("full", unit.hp > 0 && charge >= 1);
  card.node.classList.toggle("down", unit.hp <= 0);
}

// ---------- sound: tiny synth blips, no files ----------
const sfx = (() => {
  let ctx = null, muted = store.get("muted", false);
  function tone(freq, dur, type, vol, slide) {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  return {
    hit: () => tone(180 + Math.random() * 60, 0.08, "square", 0.03, 90),
    hurt: () => tone(120, 0.18, "sawtooth", 0.05, 60),
    skill: () => { tone(440, 0.12, "triangle", 0.07, 880); setTimeout(() => tone(660, 0.18, "triangle", 0.06, 1320), 90); },
    heal: () => tone(520, 0.25, "sine", 0.06, 1040),
    match: (n) => tone(300 + n * 70, 0.1, "triangle", 0.05),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2, "triangle", 0.07), i * 120)),
    lose: () => [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.3, "sawtooth", 0.05), i * 180)),
    get muted() { return muted; },
    toggle() { muted = !muted; store.set("muted", muted); return muted; },
  };
})();

// ---------- age gate: same flag as the main game ----------
function ageGate(start) {
  let ok = false;
  try { ok = localStorage.getItem("solarlux.age_ok") === "1"; } catch (e) {}
  if (ok) return start();
  const g = el("div", "gate", document.body,
    "<h1>SOLARLUX</h1><p>This game contains suggestive themes and fan service intended for adults. All characters are 21 or older.</p>" +
    "<p>Please confirm you are 18 or older to continue.</p>");
  const yes = el("button", "big", g, "I am 18 or older");
  const no = el("button", "big alt", g, "Leave");
  yes.onclick = () => { try { localStorage.setItem("solarlux.age_ok", "1"); } catch (e) {} g.remove(); start(); };
  no.onclick = () => { location.href = "https://www.google.com"; };
}

// Offline and install support: the main game's service worker covers the lab too.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => {}));
}
