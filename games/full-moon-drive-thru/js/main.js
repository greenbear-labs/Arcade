// Menus, lobby and the game loop for host, client and solo practice.
import { TILE, tileAtPx } from "./map.js";
import { CFG, ITEMS, COLORS, newPlayer, createGame, startRound, step, snapshot, removePlayer, movePlayer } from "./sim.js";
import { Bot } from "./bots.js";
import { HostNet, ClientNet, cleanCode } from "./net.js";
import { makeRenderer, burst, floatText } from "./render.js";
import { makeInput } from "./input.js";
import { sfx, bindMute } from "./sound.js";

const $ = (id) => document.getElementById(id);
const MAX_PLAYERS = 6;
const BOT_NAMES = ["Nugget", "Pickles", "Waffles", "Tater", "Sprinkles", "Meatball"];

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

bindMute($("mute"));
$("name").value = store.get("fmdt:name", "");
if (matchMedia("(pointer: coarse)").matches) document.body.classList.add("touch");

// Arcade: when this page is inside the arcade, the back link goes to the arcade floor.
const backHref = document.body.dataset.back;
if (backHref) { $("back-link").href = backHref; $("back-link").hidden = false; }

const myName = () => {
  const n = $("name").value.trim().slice(0, 12) || "Fry Cook";
  store.set("fmdt:name", n);
  return n;
};

function show(screen) {
  for (const id of ["menu", "lobby", "game"]) $(id).hidden = id !== screen;
}

let toastTimer = 0;
function toast(text) {
  const el = $("toast");
  el.textContent = text; el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

// ---------------------------------------------------------------- shared game view
const canvas = $("canvas");
const renderer = makeRenderer(canvas);
const input = makeInput(canvas, $("use-btn"), $("stick"));
function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const w = Math.round((r.width || 960) * dpr), h = Math.round((r.height || 600) * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}
addEventListener("resize", fitCanvas);

const ui = { banner: null, roundTitle: "", roundSub: "", lastSecond: -1 };
let session = null; // the active Host, Client or null

function nameOf(players, id) {
  const p = players.find((x) => x.id === id);
  return p ? p.name : "Someone";
}

function setBanner(title, sub, color, secs = 2.5) { ui.banner = { title, sub, color, t: secs }; }

// Turn game events into sounds, particles and banners. Same code on every screen.
function handleEvents(events, players, meId) {
  for (const ev of events) {
    const mine = ev.who === meId;
    switch (ev.e) {
      case "round": {
        ui.roundTitle = ""; ui.roundSub = "";
        if (ev.wolf === meId) setBanner("YOU'RE THE WEREWOLF!", "Catch the crew before closing time.", "#ffe03a", 2);
        else setBanner(`ROUND ${ev.n} OF ${ev.of}`, `${nameOf(players, ev.wolf)} is the werewolf. Run!`, "#7be05a", 2);
        sfx("start");
        $("end").hidden = true;
        break;
      }
      case "catch":
        burst(ev.x, ev.y, ["#fff", "#ffcf3a", "#e63b2e", "#4b425a"], 24, 220);
        floatText(ev.x, ev.y - 20, "CHOMP!", "#ff5a4a");
        sfx("catch");
        if (ev.who === meId) { setBanner("GOT YOU!", "You're a ghost now. Float around and watch the chase.", "#cfd8ff", 3); renderer.shake(.5); }
        else if (ev.by === meId) { setBanner(`CAUGHT ${nameOf(players, ev.who).toUpperCase()}!`, "", "#ffe03a", 1.5); renderer.shake(.3); }
        else toast(`${nameOf(players, ev.who)} got caught!`);
        break;
      case "garlic":
        burst(ev.x, ev.y, ["#ffe066", "#fff"], 18, 200);
        floatText(ev.x, ev.y - 20, "GARLIC!", "#ffe066"); sfx("garlic");
        break;
      case "sneeze":
        floatText(ev.x, ev.y - 24, "ACHOO!", "#ffe066"); burst(ev.x, ev.y, ["#ffe066"], 10); sfx("bonk");
        break;
      case "bonk":
        burst(ev.x, ev.y, ["#ffe03a", "#fff"], 10, 120);
        floatText(ev.x, ev.y - 24, "BONK!", "#fff"); sfx("bonk");
        if (mine) renderer.shake(.25);
        break;
      case "slip":
        burst(ev.x, ev.y, ["#c58a1c", "#ffd88a"], 12); floatText(ev.x, ev.y - 24, "WHOA!", "#ffd88a"); sfx("slip");
        break;
      case "vent": case "tube": case "slide":
        burst(ev.x, ev.y, ["#9aa4ad", "#fff"], 8, 90); burst(ev.x2, ev.y2, ["#9aa4ad", "#fff"], 8, 90);
        if (mine) sfx("whoosh");
        break;
      case "pickup":
        if (mine) { sfx("coin"); toast(`Got ${ITEMS[ev.kind].name}! ${ITEMS[ev.kind].desc}`); }
        break;
      case "use":
        if (ev.kind === "moon") {
          sfx("howl"); renderer.shake(.4);
          if (!mine) setBanner("AWOOOOO!", "The werewolf howled and can see everyone!", "#ff5a4a", 2.5);
        } else if (ev.kind === "smoke") { burst(ev.x, ev.y, ["#9ec27a", "#b9d99b"], 20, 140); sfx("whoosh"); }
        else if (mine) sfx("use");
        break;
      case "roundEnd": {
        const escaped = ev.escaped.map((id) => nameOf(players, id));
        ui.roundTitle = escaped.length ? "THE CREW SURVIVED!" : "THE WEREWOLF WINS!";
        ui.roundSub = escaped.length ? `Made it to closing time: ${escaped.join(", ")}` : `${nameOf(players, ev.wolf)} caught everyone!`;
        sfx(escaped.length ? "win" : "over");
        ui.banner = null;
        break;
      }
      case "gameEnd":
        sfx("win");
        $("end").hidden = false;
        $("again-btn").hidden = !(session && session.isHost);
        $("end-wait").hidden = !!(session && session.isHost);
        break;
    }
  }
}

function decorate(view) {
  // derived things the renderer needs: hidden flags, werewolf hold, banners
  const smokes = view.smokes;
  for (const p of view.players) {
    p.hidden = p.alive && p.role === "surv" && (tileAtPx(p.x, p.y) === "b" || smokes.some(([x, y, , r]) => Math.hypot(p.x - x, p.y - y) < r));
  }
  const wolf = view.players.find((p) => p.role === "wolf");
  view.wolfHold = wolf && wolf.fx.hold ? wolf.fx.hold : 0;
  view.banner = ui.banner;
  view.roundTitle = ui.roundTitle;
  view.roundSub = ui.roundSub;
  view.touch = input.touch || document.body.classList.contains("touch");
  if (view.phase === "play") {
    const s = Math.ceil(view.timer);
    if (s !== ui.lastSecond && s <= 5 && s > 0) sfx("tick");
    ui.lastSecond = s;
  }
  return view;
}

let lastFrame = performance.now();
function renderLoop(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (ui.banner) ui.banner.t -= dt;
  if (session && !$("game").hidden) {
    fitCanvas();
    const view = session.view(dt, now);
    if (view) renderer.frame(decorate(view), dt, now / 1000);
  }
  requestAnimationFrame(renderLoop);
}
requestAnimationFrame(renderLoop);

// ---------------------------------------------------------------- lobby UI
function paintLobby(players, { isHost, code, offline }) {
  const ul = $("players");
  ul.innerHTML = "";
  for (const p of players) {
    const li = document.createElement("li");
    const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = p.color;
    const name = document.createElement("span"); name.textContent = p.name;
    const tag = document.createElement("span"); tag.className = "tag";
    tag.textContent = p.id === "host" ? "host" : p.bot ? "bot" : p.id === (session && session.myId) ? "you" : "";
    li.append(dot, name, tag);
    ul.append(li);
  }
  $("host-controls").hidden = !isHost;
  $("waiting").hidden = isHost;
  $("code-label").hidden = offline;
  $("room-code").hidden = offline;
  if (!offline) $("room-code").textContent = code || "····";
  $("lobby-hint").textContent = offline
    ? "Practice mode: you and some bots. Add or remove bots, then start."
    : isHost ? "Tell your friends this code. They open this page, type it in and press Join." : "You're in! Get ready.";
  if (isHost) {
    $("start-btn").disabled = players.length < 2;
    $("start-btn").textContent = players.length < 2 ? "Need 2 or more players" : "Start!";
    $("add-bot").disabled = players.length >= MAX_PLAYERS;
    $("remove-bot").disabled = !players.some((p) => p.bot);
  }
}

// ---------------------------------------------------------------- host (also used offline)
class Host {
  constructor(offline) {
    this.isHost = true;
    this.offline = offline;
    this.myId = "host";
    this.lobby = [{ id: "host", name: myName(), color: COLORS[0], bot: false }];
    this.bots = new Map();
    this.inputs = {};
    this.game = null;
    this.code = null;
    this.acc = 0;
    this.steps = 0;
    this.pending = [];
    this.last = performance.now();
    if (offline) { this.addBot(); this.addBot(); }
    else {
      this.net = new HostNet({
        onOpen: (code) => { this.code = code; this.paint(); },
        onJoin: () => {},
        onMessage: (id, msg) => this.onMessage(id, msg),
        onLeave: (id) => this.onLeave(id),
        onError: (text) => {
          if (this.code) toast(text);
          else { $("lobby-error").textContent = `${text} You can still practise with bots.`; }
        },
      });
    }
    this.timer = setInterval(() => this.tick(), 1000 / 60);
    // Closing a tab doesn't always close the connection right away, so drop anyone silent for 7s.
    this.seen = new Map();
    this.watchdog = setInterval(() => {
      for (const [id, at] of this.seen) {
        if (performance.now() - at > 7000) { this.seen.delete(id); this.net.kick(id); this.onLeave(id); }
      }
    }, 1000);
    this.paint();
  }

  paint() { paintLobby(this.lobby, { isHost: true, code: this.code, offline: this.offline }); this.sendLobby(); }

  sendLobby() {
    if (this.net) this.net.broadcast({ t: "lobby", players: this.lobby, code: this.code });
  }

  freeColor() { return COLORS.find((c) => !this.lobby.some((p) => p.color === c)) || COLORS[0]; }

  addBot() {
    if (this.lobby.length >= MAX_PLAYERS) return;
    const n = BOT_NAMES.find((b) => !this.lobby.some((p) => p.name === b)) || "Bot";
    const id = `bot-${Math.random().toString(36).slice(2, 7)}`;
    this.lobby.push({ id, name: n, color: this.freeColor(), bot: true });
    this.paint();
  }

  removeBot() {
    const i = this.lobby.map((p) => p.bot).lastIndexOf(true);
    if (i >= 0) this.lobby.splice(i, 1);
    this.paint();
  }

  onMessage(id, msg) {
    if (!msg || typeof msg !== "object") return;
    this.seen.set(id, performance.now());
    if (msg.t === "hello") {
      if (this.game || this.lobby.length >= MAX_PLAYERS) {
        this.net.send(id, { t: "full", why: this.game ? "That game already started. Ask the host to finish the round and press Play again." : "That game is full." });
        setTimeout(() => this.net.kick(id), 500);
        return;
      }
      const name = String(msg.name || "Player").slice(0, 12);
      this.lobby.push({ id, name, color: this.freeColor(), bot: false });
      this.net.send(id, { t: "welcome", id });
      sfx("coin");
      this.paint();
    } else if (msg.t === "in") {
      this.inputs[id] = { mx: +msg.mx || 0, my: +msg.my || 0, useSeq: msg.useSeq | 0 };
    } else if (msg.t === "ping") {
      this.net.send(id, { t: "pong", c: msg.c });
    }
  }

  onLeave(id) {
    this.seen.delete(id);
    const p = this.lobby.find((x) => x.id === id);
    this.lobby = this.lobby.filter((x) => x.id !== id);
    delete this.inputs[id];
    if (this.game) removePlayer(this.game, id);
    if (p) toast(`${p.name} left`);
    this.paint();
  }

  start() {
    if (this.lobby.length < 2) return;
    const players = this.lobby.map((p) => newPlayer(p.id, p.name, p.color, p.bot));
    // Shuffle who goes first, then everyone takes a turn as the werewolf.
    players.sort(() => Math.random() - 0.5);
    const rounds = players.length * Number($("rounds").value || 1);
    this.game = createGame(players, Math.max(2, rounds));
    this.bots = new Map(players.filter((p) => p.isBot).map((p) => [p.id, new Bot(p.id)]));
    // keep the lobby order for the turn order, but start from the shuffled one
    this.inputs = {};
    startRound(this.game);
    show("game");
    $("end").hidden = true;
  }

  backToLobby() {
    this.game = null;
    show("lobby");
    if (this.net) this.net.broadcast({ t: "back" });
    this.paint();
  }

  tick() {
    const now = performance.now();
    this.acc = Math.min(1, this.acc + (now - this.last) / 1000);
    this.last = now;
    const g = this.game;
    if (!g) { this.acc = 0; return; }
    const DT = 1 / 60;
    while (this.acc >= DT) {
      this.acc -= DT;
      this.inputs.host = input.read();
      for (const p of g.players) {
        const bot = this.bots.get(p.id);
        if (bot) this.inputs[p.id] = bot.input(g, p, DT);
      }
      step(g, DT, this.inputs);
      if (g.events.length) {
        handleEvents(g.events, g.players, this.myId);
        this.pending.push(...g.events);
        g.events.length = 0;
      }
      if (++this.steps % 3 === 0 && this.net) {
        this.net.broadcast({ t: "snap", s: snapshot(g), ev: this.pending });
        this.pending = [];
      }
    }
    if (!this.net) this.pending = [];
  }

  view() {
    return this.game ? { ...snapshot(this.game), meId: this.myId } : null;
  }

  leave() {
    clearInterval(this.timer);
    clearInterval(this.watchdog);
    if (this.net) this.net.close();
  }
}

// ---------------------------------------------------------------- client
class Client {
  constructor(code) {
    this.isHost = false;
    this.myId = null;
    this.snaps = [];
    this.me = null;
    this.history = [];
    this.rtt = 0.08;
    this.inGame = false;
    this.lastSend = 0;
    $("room-code").textContent = code;
    this.net = new ClientNet(code, {
      onOpen: () => this.net.send({ t: "hello", name: myName() }),
      onMessage: (m) => this.onMessage(m),
      onClose: () => { if (session === this) { goMenu("The host closed the game."); } },
      onError: (text) => { if (session === this) goMenu(text); },
    });
    this.pinger = setInterval(() => this.net.send({ t: "ping", c: performance.now() }), 2000);
    this.sender = setInterval(() => this.sendInput(), 1000 / 30);
    this.heard = performance.now();
    this.watchdog = setInterval(() => {
      if (this.myId && performance.now() - this.heard > 8000 && session === this) goMenu("Lost the connection to the host.");
    }, 1000);
  }

  sendInput() {
    if (!this.inGame) return;
    const i = input.read();
    this.net.send({ t: "in", mx: Math.round(i.mx * 100) / 100, my: Math.round(i.my * 100) / 100, useSeq: i.useSeq });
  }

  onMessage(m) {
    if (!m || typeof m !== "object") return;
    this.heard = performance.now();
    if (m.t === "welcome") { this.myId = m.id; show("lobby"); }
    else if (m.t === "lobby") { this.lobby = m.players; if (!this.inGame) { show("lobby"); paintLobby(m.players, { isHost: false, code: m.code, offline: false }); } }
    else if (m.t === "full") goMenu(m.why);
    else if (m.t === "pong") this.rtt = this.rtt * 0.7 + ((performance.now() - m.c) / 1000) * 0.3;
    else if (m.t === "back") { this.inGame = false; this.snaps = []; this.me = null; show("lobby"); if (this.lobby) paintLobby(this.lobby, { isHost: false, offline: false, code: $("room-code").textContent }); }
    else if (m.t === "snap") this.onSnap(m.s, m.ev || []);
  }

  onSnap(s, events) {
    const now = performance.now();
    if (!this.inGame) { this.inGame = true; show("game"); $("end").hidden = true; }
    this.snaps.push({ at: now, s });
    if (this.snaps.length > 12) this.snaps.shift();
    handleEvents(events, s.players, this.myId);
    const sp = s.players.find((p) => p.id === this.myId);
    if (!sp) { this.me = null; return; }
    const teleported = events.some((e) => e.who === this.myId && (e.e === "vent" || e.e === "tube" || e.e === "slide"));
    if (!this.me || teleported || s.phase !== "play" || this.me.alive !== sp.alive || this.me.role !== sp.role || events.some((e) => e.e === "round")) {
      this.me = { ...sp, fx: { ...sp.fx } };
      this.history = [];
      return;
    }
    Object.assign(this.me, { alive: sp.alive, role: sp.role, item: sp.item, score: sp.score, catches: sp.catches, fx: { ...sp.fx } });
    if (sp.fx.stun || sp.fx.slip) { this.me.vx = sp.vx; this.me.vy = sp.vy; }
    // Compare the host's position with where we predicted we'd be one round-trip ago.
    const target = now - this.rtt * 1000 - 16;
    let past = null;
    for (const h of this.history) { if (h.at <= target) past = h; else break; }
    if (!past) past = this.history[0] || this.me;
    const ex = sp.x - past.x, ey = sp.y - past.y;
    if (Math.hypot(ex, ey) > 110) { this.me.x = sp.x; this.me.y = sp.y; this.history = []; return; }
    const k = 0.3;
    this.me.x += ex * k; this.me.y += ey * k;
    for (const h of this.history) { h.x += ex * k; h.y += ey * k; }
  }

  view(dt, now) {
    const last = this.snaps[this.snaps.length - 1];
    if (!last) return null;
    // Other players: draw them ~100ms in the past, smoothly between two updates.
    const rt = now - 100;
    let a = null, b = null;
    for (let i = this.snaps.length - 1; i > 0; i--) {
      if (this.snaps[i - 1].at <= rt) { a = this.snaps[i - 1]; b = this.snaps[i]; break; }
    }
    const base = last.s;
    let players = base.players;
    if (a && b) {
      const k = Math.max(0, Math.min(1, (rt - a.at) / (b.at - a.at || 1)));
      players = b.s.players.map((pb) => {
        const pa = a.s.players.find((p) => p.id === pb.id);
        if (!pa || Math.hypot(pa.x - pb.x, pa.y - pb.y) > 120) return { ...pb };
        return { ...pb, x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k };
      });
      // keep the newest status (role, item, effects) from the latest update
      players = players.map((p) => ({ ...(base.players.find((q) => q.id === p.id) || p), x: p.x, y: p.y }));
    } else players = players.map((p) => ({ ...p }));

    // Me: predicted locally so movement feels instant.
    if (this.me && base.phase === "play") {
      const me = this.me;
      for (const k in me.fx) me.fx[k] = Math.max(0, me.fx[k] - dt);
      const i = input.read();
      movePlayer(me, i, dt, { smokes: base.smokes.map(([x, y, , r]) => ({ x, y, r })) });
      this.history.push({ at: now, x: me.x, y: me.y });
      while (this.history.length && this.history[0].at < now - 1500) this.history.shift();
      players = players.map((p) => (p.id === me.id ? { ...p, x: me.x, y: me.y, vx: me.vx, vy: me.vy, face: me.face, fx: me.fx } : p));
    }
    return { ...base, players, meId: this.myId };
  }

  leave() {
    clearInterval(this.pinger);
    clearInterval(this.sender);
    clearInterval(this.watchdog);
    this.net.close();
  }
}

// ---------------------------------------------------------------- buttons
function goMenu(error = "") {
  if (session) { const s = session; session = null; s.leave(); }
  show("menu");
  $("menu-error").textContent = error;
  $("lobby-error").textContent = "";
}

function onlineAvailable() {
  if (typeof Peer === "undefined") { $("menu-error").textContent = "Online play couldn't load. Try reloading the page."; return false; }
  return true;
}

$("host-btn").addEventListener("click", () => {
  if (!onlineAvailable()) return;
  goMenu();
  session = new Host(false);
  show("lobby");
});
$("practice-btn").addEventListener("click", () => {
  goMenu();
  session = new Host(true);
  show("lobby");
});
$("join-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = cleanCode($("code").value);
  if (code.length < 3) { $("menu-error").textContent = "Type the room code the host sees (like BEAR42)."; return; }
  if (!onlineAvailable()) return;
  goMenu();
  myName();
  session = new Client(code);
  $("menu-error").textContent = "Connecting…";
});
$("add-bot").addEventListener("click", () => session && session.isHost && session.addBot());
$("remove-bot").addEventListener("click", () => session && session.isHost && session.removeBot());
$("start-btn").addEventListener("click", () => { if (session && session.isHost) { session.start(); canvas.focus && canvas.focus(); } });
$("leave-btn").addEventListener("click", () => goMenu());
$("end-leave").addEventListener("click", () => goMenu());
$("again-btn").addEventListener("click", () => session && session.isHost && session.backToLobby());

// While connecting, the menu shows "Connecting…"; the lobby appears once the host welcomes us.
const params = new URLSearchParams(location.search);
if (params.get("join")) $("code").value = cleanCode(params.get("join"));

// Test hook (used by the automated multiplayer test only).
window.__fmdt = { get session() { return session; }, CFG, TILE };
