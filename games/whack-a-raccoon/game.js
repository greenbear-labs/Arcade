// Whack-a-Raccoon: raccoons pop out of trash cans, the bear punches them.
// Chain hits for a combo, grab the gold raccoon, never punch a cub.
(function () {
  const SLUG = "whack-a-raccoon";
  const W = 600, H = 640;
  const ROUND = 45, LIVES = 3;
  const COLS = [120, 300, 480], ROWS = [250, 400, 550];
  // Q W E / A S D / Z X C, plus the number pad laid out the same way
  const KEYMAP = {
    KeyQ: 0, KeyW: 1, KeyE: 2, KeyA: 3, KeyS: 4, KeyD: 5, KeyZ: 6, KeyX: 7, KeyC: 8,
    Numpad7: 0, Numpad8: 1, Numpad9: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad1: 6, Numpad2: 7, Numpad3: 8,
  };
  const LABELS = ["Q", "W", "E", "A", "S", "D", "Z", "X", "C"];

  const canvas = document.getElementById("game");
  const ctx = Arcade.setupCanvas(canvas, W, H);
  const overlay = Arcade.overlay(document.getElementById("overlay"));
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  Arcade.bindMute(document.getElementById("mute"));
  bestEl.textContent = Arcade.best(SLUG);
  const showKeys = !window.matchMedia("(pointer: coarse)").matches;

  let state = "title";
  let cans, score, combo, lives, timeLeft, nextPop, effects, shake, overAt, elapsed, hits;

  function reset() {
    cans = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cans.push({ x: COLS[c], y: ROWS[r], who: null, t: 0, life: 0, bonk: 0 });
    score = 0; combo = 0; lives = LIVES; timeLeft = ROUND; nextPop = .6; effects = []; shake = 0; elapsed = 0; hits = 0;
  }

  // ---- input ----
  function punch(i) {
    if (state === "title") return start();
    if (state === "over") { if (performance.now() - overAt > 500) start(); return; }
    const can = cans[i];
    const up = can.who && can.t < can.life && !can.bonk;
    if (!up) {
      combo = 0;
      effects.push({ kind: "whiff", x: can.x, y: can.y - 40, t: 0 });
      Arcade.sfx("blip");
      return;
    }
    can.bonk = .35;
    if (can.who === "cub") {
      lives--; combo = 0; shake = 14;
      effects.push({ kind: "text", text: "NOT THE CUB!", color: "#e63b2e", x: can.x, y: can.y - 110, t: 0 });
      Arcade.sfx("hit");
      if (lives <= 0) return gameOver();
    } else {
      combo = Math.min(combo + 1, 50);
      hits++;
      const mult = 1 + Math.min(4, Math.floor(combo / 4));
      const pts = (can.who === "gold" ? 50 : 10) * mult;
      score += pts;
      shake = can.who === "gold" ? 10 : 5;
      effects.push({ kind: "pow", x: can.x, y: can.y - 60, t: 0 });
      effects.push({ kind: "text", text: `+${pts}`, color: can.who === "gold" ? "#f7b52c" : "#a4ec6a", x: can.x, y: can.y - 120, t: 0 });
      Arcade.sfx(can.who === "gold" ? "bonus" : "pow");
    }
    scoreEl.textContent = score;
  }

  addEventListener("keydown", (e) => {
    if (e.code in KEYMAP) { e.preventDefault(); if (!e.repeat) punch(KEYMAP[e.code]); return; }
    if ((e.code === "Space" || e.code === "Enter") && state !== "play") { e.preventDefault(); punch(0); }
  });
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state !== "play") return punch(0);
    const p = Arcade.pointer(canvas, e, W, H);
    // the nearest can within reach wins, so taps between cans still count
    let best = -1, bestD = 95 * 95;
    cans.forEach((c, i) => {
      const dx = p.x - c.x, dy = p.y - (c.y - 40);
      const d = dx * dx + dy * dy * .6;
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) punch(best);
  });
  document.getElementById("overlay").addEventListener("pointerdown", (e) => { e.preventDefault(); punch(0); });

  function start() {
    reset();
    state = "play";
    overlay.hide();
    scoreEl.textContent = 0;
    Arcade.sfx("start");
  }

  function gameOver() {
    state = "over";
    overAt = performance.now();
    Arcade.sfx("over");
    const isBest = Arcade.saveBest(SLUG, score);
    bestEl.textContent = Arcade.best(SLUG);
    overlay.show({
      title: lives <= 0 ? "GAME OVER" : "TIME'S UP",
      newBest: isBest,
      text: `You bonked ${hits} raccoon${hits === 1 ? "" : "s"}. Score: ${score}.`,
      press: "PRESS SPACE OR TAP TO PLAY AGAIN",
    });
  }

  // ---- update ----
  function update(dt) {
    elapsed += dt;
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; return gameOver(); }

    // the round speeds up as the clock runs down
    const heat = elapsed / ROUND;
    nextPop -= dt;
    if (nextPop <= 0) {
      const free = cans.filter((c) => !c.who);
      if (free.length) {
        const c = free[Math.floor(Math.random() * free.length)];
        const roll = Math.random();
        c.who = roll < .07 ? "gold" : roll < .07 + .1 + heat * .1 ? "cub" : "raccoon";
        c.t = 0; c.bonk = 0;
        c.life = (c.who === "gold" ? .75 : 1.25) - heat * .5;
      }
      nextPop = .75 - heat * .45 + Math.random() * .25;
      // late in the round, two pop at once sometimes
      if (heat > .4 && Math.random() < heat * .5) nextPop *= .35;
    }

    for (const c of cans) {
      if (!c.who) continue;
      c.t += dt;
      if (c.bonk) {
        c.bonk -= dt;
        if (c.bonk <= 0) { c.who = null; c.bonk = 0; }
      } else if (c.t > c.life + .2) {
        if (c.who !== "cub") combo = 0; // a raccoon got away
        c.who = null;
      }
    }
    for (const f of effects) f.t += dt;
    effects = effects.filter((f) => f.t < .7);
  }

  // ---- drawing ----
  function drawBackdrop() {
    // brick wall
    ctx.fillStyle = "#2a1712"; ctx.fillRect(0, 0, W, 170);
    ctx.fillStyle = "#3b2119";
    for (let y = 0; y < 170; y += 22) {
      for (let x = (y / 22) % 2 ? -30 : 0; x < W; x += 60) ctx.fillRect(x + 2, y + 2, 56, 18);
    }
    // neon sign on the wall
    ctx.save();
    ctx.font = '28px "Bungee", sans-serif'; ctx.textAlign = "center";
    ctx.shadowColor = "#6cc63a"; ctx.shadowBlur = 18; ctx.fillStyle = "#a4ec6a";
    ctx.fillText("NO RACCOONS", W / 2, 128);
    ctx.restore();
    // pavement
    const g = ctx.createLinearGradient(0, 170, 0, H);
    g.addColorStop(0, "#1c211a"); g.addColorStop(1, "#0f120d");
    ctx.fillStyle = g; ctx.fillRect(0, 170, W, H - 170);
    ctx.fillStyle = "#0b0d0a"; ctx.fillRect(0, 170, W, 6);
    ctx.fillStyle = "rgba(255,255,255,.04)";
    for (let i = 0; i < 18; i++) ctx.fillRect((i * 97) % W, 200 + (i * 61) % 420, 30, 3);
  }

  function drawCritter(c) {
    const rise = c.bonk ? Math.max(0, c.bonk / .35) : Math.min(1, c.t / .12, Math.max(0, (c.life + .2 - c.t) / .2));
    const x = c.x, top = c.y - 8 - rise * 78;
    const s = 34;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 90, 0, 180, c.y - 4); ctx.clip();
    ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 3;
    const squish = c.bonk ? .75 : 1;
    ctx.translate(x, top + s); ctx.scale(1, squish); ctx.translate(-x, -(top + s));

    if (c.who === "cub") {
      Arcade.drawBear(ctx, x, top + s, s * .95, { mouth: c.bonk ? "open" : "grin", blink: !!c.bonk });
      // cubs wear a little bow instead of the headband stripe
      ctx.fillStyle = "#ff8fb1";
      ctx.beginPath(); ctx.moveTo(x + 14, top + 2); ctx.lineTo(x + 30, top - 8); ctx.lineTo(x + 30, top + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 46, top + 2); ctx.lineTo(x + 30, top - 8); ctx.lineTo(x + 30, top + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      const fur = c.who === "gold" ? "#f7b52c" : "#8a8f96";
      const dark = c.who === "gold" ? "#a86f06" : "#2b2e33";
      const cy = top + s;
      for (const sx of [-1, 1]) {
        ctx.fillStyle = fur; ctx.beginPath(); ctx.moveTo(x + sx * s * .35, cy - s * .7); ctx.lineTo(x + sx * s * .85, cy - s * 1.25); ctx.lineTo(x + sx * s * .95, cy - s * .45); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(x, cy, s * 1.05, s * .9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e9e6df"; ctx.beginPath(); ctx.ellipse(x, cy + s * .35, s * .55, s * .42, 0, 0, Math.PI * 2); ctx.fill();
      // the bandit mask
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(x, cy - s * .1, s * .95, s * .3, 0, 0, Math.PI * 2); ctx.fill();
      for (const sx of [-1, 1]) {
        if (c.bonk) {
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x + sx * s * .42 - 6, cy - s * .1 - 6); ctx.lineTo(x + sx * s * .42 + 6, cy - s * .1 + 6);
          ctx.moveTo(x + sx * s * .42 + 6, cy - s * .1 - 6); ctx.lineTo(x + sx * s * .42 - 6, cy - s * .1 + 6); ctx.stroke();
        } else {
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + sx * s * .42, cy - s * .1, s * .14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#0b0d0a"; ctx.beginPath(); ctx.arc(x + sx * s * .4, cy - s * .08, s * .07, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.strokeStyle = "#0b0d0a";
      ctx.fillStyle = "#0b0d0a"; ctx.beginPath(); ctx.ellipse(x, cy + s * .2, s * .14, s * .1, 0, 0, Math.PI * 2); ctx.fill();
      // sneaky grin with a stolen snack
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - s * .2, cy + s * .45); ctx.quadraticCurveTo(x, cy + s * .58, x + s * .2, cy + s * .45); ctx.stroke();
      if (c.who === "gold") {
        ctx.fillStyle = "#fff3b0";
        for (let i = 0; i < 3; i++) {
          const a = elapsed * 3 + i * 2.1;
          ctx.fillRect(x + Math.cos(a) * s * 1.4 - 2, cy + Math.sin(a) * s * 1.1 - 2, 5, 5);
        }
      }
    }
    ctx.restore();
  }

  function drawCan(c, i) {
    const x = c.x, y = c.y;
    ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 3;
    // body
    const g = ctx.createLinearGradient(x - 62, 0, x + 62, 0);
    g.addColorStop(0, "#4b5446"); g.addColorStop(.35, "#8d9888"); g.addColorStop(1, "#3d453a");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - 62, y); ctx.lineTo(x - 52, y + 76); ctx.quadraticCurveTo(x, y + 88, x + 52, y + 76); ctx.lineTo(x + 62, y); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 22, y + 8); ctx.lineTo(x + k * 19, y + 74); ctx.stroke(); }
    // opening
    ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 3;
    ctx.fillStyle = "#0b0d0a"; ctx.beginPath(); ctx.ellipse(x, y, 62, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#a9b3a4"; ctx.beginPath(); ctx.ellipse(x, y, 62, 16, 0, 0, Math.PI * 2); ctx.stroke();
    // key hint on the front of the can
    if (showKeys) {
      ctx.font = '12px "Press Start 2P", monospace'; ctx.textAlign = "center"; ctx.fillStyle = "rgba(246,231,200,.55)";
      ctx.fillText(LABELS[i], x, y + 52);
    }
  }

  function drawCritterFront(c) {
    // the lid pops off and floats to the side while something is out
    if (!c.who) {
      ctx.fillStyle = "#6e7a69"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(c.x, c.y - 4, 66, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#4b5446"; Arcade.roundRect(ctx, c.x - 14, c.y - 18, 28, 10, 4); ctx.fill(); ctx.stroke();
    }
  }

  function drawEffects() {
    for (const f of effects) {
      const a = 1 - f.t / .7;
      ctx.globalAlpha = Math.max(0, a);
      if (f.kind === "pow") {
        const r = 30 + f.t * 90;
        ctx.fillStyle = "#f7b52c"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k < 16; k++) {
          const ang = (k / 16) * Math.PI * 2, rr = k % 2 ? r * .55 : r;
          ctx.lineTo(f.x + Math.cos(ang) * rr, f.y + Math.sin(ang) * rr);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.font = '22px "Bungee", sans-serif'; ctx.textAlign = "center"; ctx.fillStyle = "#e63b2e";
        ctx.fillText("POW!", f.x, f.y + 8);
        // the bear's fist
        if (f.t < .18) {
          ctx.fillStyle = "#6cc63a";
          ctx.beginPath(); ctx.ellipse(f.x + 6, f.y - 30 - (1 - f.t / .18) * 40, 30, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(f.x - 14, f.y - 40); ctx.lineTo(f.x - 14, f.y - 22); ctx.moveTo(f.x + 2, f.y - 42); ctx.lineTo(f.x + 2, f.y - 20); ctx.moveTo(f.x + 18, f.y - 40); ctx.lineTo(f.x + 18, f.y - 22); ctx.stroke();
        }
      } else if (f.kind === "text") {
        ctx.font = '18px "Press Start 2P", monospace'; ctx.textAlign = "center";
        ctx.fillStyle = "#0b0d0a"; ctx.fillText(f.text, f.x + 2, f.y - f.t * 60 + 2);
        ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - f.t * 60);
      } else if (f.kind === "whiff") {
        ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, 20 + f.t * 60, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    // timer bar
    const frac = timeLeft / ROUND;
    ctx.fillStyle = "rgba(0,0,0,.55)"; Arcade.roundRect(ctx, 20, 50, W - 40, 14, 7); ctx.fill();
    ctx.fillStyle = frac < .2 ? "#e63b2e" : frac < .5 ? "#f7b52c" : "#6cc63a";
    Arcade.roundRect(ctx, 22, 52, (W - 44) * frac, 10, 5); ctx.fill();
    // lives
    ctx.font = '22px sans-serif'; ctx.textAlign = "left";
    for (let i = 0; i < LIVES; i++) { ctx.globalAlpha = i < lives ? 1 : .2; ctx.fillText("❤️", 20 + i * 30, 36); }
    ctx.globalAlpha = 1;
    ctx.font = '14px "Press Start 2P", monospace'; ctx.textAlign = "right";
    ctx.fillStyle = "#f6e7c8"; ctx.fillText(`${Math.ceil(timeLeft)}s`, W - 20, 34);
    const mult = 1 + Math.min(4, Math.floor(combo / 4));
    if (combo >= 2) {
      ctx.textAlign = "center"; ctx.fillStyle = mult > 1 ? "#f7b52c" : "#a4ec6a";
      ctx.fillText(`COMBO ${combo}${mult > 1 ? `  x${mult}` : ""}`, W / 2, 34);
    }
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawBackdrop();
    cans.forEach((c, i) => { drawCan(c, i); if (c.who) drawCritter(c); drawCritterFront(c); });
    drawEffects();
    if (state === "play") drawHud();
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    if (state === "play") update(dt);
    else if (state === "title") {
      // idle demo: raccoons poke out while the title is up
      elapsed += dt;
      for (const c of cans) { if (c.who) { c.t += dt; if (c.t > c.life + .2) c.who = null; } }
      if (Math.random() < dt * 1.2) { const c = cans[Math.floor(Math.random() * 9)]; if (!c.who) { c.who = "raccoon"; c.t = 0; c.life = 1; } }
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 50);
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { last = performance.now(); });

  reset();
  overlay.show({
    title: "WHACK-A-RACCOON",
    text: "Trash bandits are raiding the den. Punch every raccoon, chase the gold one, and don't you dare punch a cub.",
    press: "PRESS SPACE OR TAP TO START",
  });
  requestAnimationFrame(frame);
})();
