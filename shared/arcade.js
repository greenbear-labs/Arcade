// Shared helpers for every Green Bear Arcade game: canvas setup, best scores,
// sound effects, start/game-over overlays and the procedural bear sprite.
(function () {
  const Arcade = {};

  // ---- storage (best scores survive reloads; private mode just forgets them) ----
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    },
  };
  Arcade.store = store;

  Arcade.best = (slug) => store.get(`gba:best:${slug}`, 0);
  Arcade.saveBest = (slug, score) => {
    if (score > Arcade.best(slug)) { store.set(`gba:best:${slug}`, score); return true; }
    return false;
  };

  // ---- canvas: fixed logical resolution, sharp on retina, scaled by CSS ----
  Arcade.setupCanvas = (canvas, width, height) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.aspectRatio = `${width} / ${height}`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  // Converts a pointer event to logical canvas coordinates.
  Arcade.pointer = (canvas, e, width, height) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * width, y: ((e.clientY - r.top) / r.height) * height };
  };

  // ---- sound: tiny WebAudio bleeps, no files to load ----
  let audio = null;
  let muted = store.get("gba:muted", false);
  const tones = {
    start: [[440, .06], [660, .06], [880, .1]],
    jump: [[520, .05, 780]],
    coin: [[988, .05], [1319, .12]],
    pow: [[180, .08, 60, "square"]],
    hit: [[220, .12, 90, "sawtooth"]],
    blip: [[660, .04]],
    bonus: [[784, .06], [988, .06], [1175, .06], [1568, .14]],
    over: [[392, .14], [330, .14], [262, .3]],
  };
  Arcade.sfx = (name) => {
    if (muted || !tones[name]) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      let t = audio.currentTime;
      for (const [freq, dur, slideTo, type] of tones[name]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type || "square";
        osc.frequency.setValueAtTime(freq, t);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
        gain.gain.setValueAtTime(.08, t);
        gain.gain.exponentialRampToValueAtTime(.0001, t + dur);
        osc.connect(gain).connect(audio.destination);
        osc.start(t); osc.stop(t + dur + .02);
        t += dur;
      }
    } catch { /* audio unavailable */ }
  };
  Arcade.bindMute = (btn) => {
    const paint = () => { btn.textContent = muted ? "🔇" : "🔊"; btn.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound"); };
    paint();
    btn.addEventListener("click", () => { muted = !muted; store.set("gba:muted", muted); paint(); btn.blur(); });
  };

  // ---- overlay: one element per game, reused for "press start" and "game over" ----
  Arcade.overlay = (el) => ({
    show({ title, text = "", press = "", newBest = false }) {
      el.innerHTML = "";
      const h = document.createElement("h2"); h.textContent = title; el.append(h);
      if (newBest) { const b = document.createElement("div"); b.className = "new-best"; b.textContent = "★ NEW BEST ★"; el.append(b); }
      if (text) { const p = document.createElement("p"); p.textContent = text; el.append(p); }
      if (press) { const s = document.createElement("div"); s.className = "press"; s.textContent = press; el.append(s); }
      el.hidden = false;
    },
    hide() { el.hidden = true; },
    get visible() { return !el.hidden; },
  });

  // ---- the bear: green head, red headband, cream muzzle, matching the logo ----
  // (x, y) is the head centre, r the head radius.
  Arcade.drawBear = (ctx, x, y, r, opts = {}) => {
    const { mouth = "grin", blink = false, tilt = 0 } = opts;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.lineWidth = Math.max(1.5, r * .09);
    ctx.strokeStyle = "#0b0d0a";
    // ears
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * r * .68, -r * .72, r * .34, 0, Math.PI * 2);
      ctx.fillStyle = "#6cc63a"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * r * .68, -r * .72, r * .17, 0, Math.PI * 2);
      ctx.fillStyle = "#2f6a1c"; ctx.fill();
    }
    // head
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * .92, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#6cc63a"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-r * .25, -r * .35, r * .45, r * .25, -.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(164,236,106,.45)"; ctx.fill();
    // headband with tails
    ctx.fillStyle = "#e63b2e";
    ctx.beginPath(); ctx.rect(-r * .98, -r * .52, r * 1.96, r * .26); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * .9, -r * .45); ctx.lineTo(r * 1.45, -r * .7); ctx.lineTo(r * 1.35, -r * .45);
    ctx.lineTo(r * 1.5, -r * .25); ctx.lineTo(r * .9, -r * .3); ctx.closePath(); ctx.fill(); ctx.stroke();
    // brows + eyes
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#0b0d0a";
      ctx.beginPath(); ctx.moveTo(s * r * .62, -r * .2); ctx.lineTo(s * r * .12, -r * .08); ctx.lineTo(s * r * .14, -r * .02); ctx.lineTo(s * r * .6, -r * .1); ctx.fill();
      if (blink) { ctx.fillRect(s * r * .38 - r * .12, r * .02, r * .24, r * .05); }
      else {
        ctx.beginPath(); ctx.arc(s * r * .36, r * .04, r * .1, 0, Math.PI * 2); ctx.fillStyle = "#f6e7c8"; ctx.fill();
        ctx.beginPath(); ctx.arc(s * r * .33, r * .05, r * .055, 0, Math.PI * 2); ctx.fillStyle = "#0b0d0a"; ctx.fill();
      }
    }
    // muzzle, nose, mouth
    ctx.beginPath(); ctx.ellipse(0, r * .42, r * .48, r * .36, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f6e7c8"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, r * .26, r * .17, r * .11, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0d0a"; ctx.fill();
    ctx.beginPath();
    if (mouth === "open") {
      ctx.ellipse(0, r * .55, r * .2, r * .14, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#7a1a14"; ctx.fill();
    } else {
      ctx.moveTo(-r * .22, r * .5); ctx.quadraticCurveTo(0, r * .7, r * .24, r * .46);
      ctx.lineCap = "round"; ctx.stroke();
    }
    ctx.restore();
  };

  // Rounded rectangle path helper.
  Arcade.roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  window.Arcade = Arcade;
})();
