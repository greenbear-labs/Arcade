// Honey Dash: a one-button runner. Jump hives, grab honey, keep your head below the bees.
(function () {
  const SLUG = "honey-dash";
  const W = 800, H = 400, GROUND = 340;
  const GRAVITY = 2300, JUMP_V = -860, CUT = .45;
  const BEAR_X = 140;

  const canvas = document.getElementById("game");
  const ctx = Arcade.setupCanvas(canvas, W, H);
  const overlay = Arcade.overlay(document.getElementById("overlay"));
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  Arcade.bindMute(document.getElementById("mute"));
  bestEl.textContent = Arcade.best(SLUG);

  let state = "title"; // title | play | over
  let bear, things, speed, dist, honey, spawnIn, time, particles, shake, overAt, held, bufferedJump;

  function reset() {
    bear = { y: GROUND, vy: 0, onGround: true, coyote: 0, run: 0 };
    things = []; particles = [];
    speed = 330; dist = 0; honey = 0; spawnIn = 500; time = 0; shake = 0; bufferedJump = 0;
  }
  const score = () => Math.floor(dist / 12) + honey * 25;

  // ---- input: space / up / W / click / touch, all the same button ----
  function press() {
    if (state === "title") return start();
    if (state === "over") { if (performance.now() - overAt > 450) start(); return; }
    held = true;
    bufferedJump = .12;
  }
  function release() {
    held = false;
    if (state === "play" && bear.vy < 0) bear.vy *= CUT;
  }
  const JUMP_KEYS = new Set(["Space", "ArrowUp", "KeyW", "Enter"]);
  addEventListener("keydown", (e) => {
    if (!JUMP_KEYS.has(e.code)) return;
    e.preventDefault();
    if (!e.repeat) press();
  });
  addEventListener("keyup", (e) => { if (JUMP_KEYS.has(e.code)) release(); });
  for (const el of [canvas, document.getElementById("overlay")]) {
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); press(); });
  }
  addEventListener("pointerup", release);
  addEventListener("pointercancel", release);

  function start() {
    reset();
    state = "play";
    overlay.hide();
    Arcade.sfx("start");
  }

  function gameOver() {
    state = "over";
    overAt = performance.now();
    shake = 12;
    Arcade.sfx("hit");
    setTimeout(() => Arcade.sfx("over"), 200);
    const s = score();
    scoreEl.textContent = s;
    const isBest = Arcade.saveBest(SLUG, s);
    bestEl.textContent = Arcade.best(SLUG);
    overlay.show({
      title: "GAME OVER",
      newBest: isBest,
      text: `You ran ${Math.floor(dist / 12)} m and grabbed ${honey} honey jar${honey === 1 ? "" : "s"}. Score: ${s}.`,
      press: "PRESS SPACE OR TAP TO RUN AGAIN",
    });
  }

  // ---- spawning ----
  function spawn() {
    const roll = Math.random();
    const s = score();
    if (s > 250 && roll < .22) {
      // bees fly at head height: jumping into them ends the run
      things.push({ kind: "bees", x: W + 40, y: GROUND - 118, w: 54, h: 30, t: 0 });
    } else if (s > 120 && roll < .42) {
      things.push({ kind: "hive", x: W + 30, w: 40, h: 74, tall: true });
    } else {
      things.push({ kind: "hive", x: W + 30, w: 40, h: 46 });
      if (s > 400 && Math.random() < .25) things.push({ kind: "hive", x: W + 74, w: 40, h: 46 });
    }
    if (Math.random() < .55) {
      const high = Math.random() < .6;
      things.push({ kind: "honey", x: W + 30 + (high ? 0 : 160), y: high ? GROUND - 150 : GROUND - 30, w: 26, h: 28, got: false });
    }
    const gap = speed * (.62 + Math.random() * .7);
    // never closer than one full jump, so a hive and a bee swarm can't trap you
    spawnIn = Math.max(gap, speed * .8 + 80);
  }

  // ---- update ----
  function update(dt) {
    time += dt;
    speed = Math.min(780, 330 + time * 9);
    const dx = speed * dt;
    dist += dx;

    // jump with a little coyote time and input buffering so it feels fair
    bear.coyote = bear.onGround ? .08 : Math.max(0, bear.coyote - dt);
    bufferedJump = Math.max(0, bufferedJump - dt);
    if (bufferedJump > 0 && bear.coyote > 0) {
      bear.vy = JUMP_V; bear.onGround = false; bear.coyote = 0; bufferedJump = 0;
      Arcade.sfx("jump");
      if (!held) bear.vy *= CUT * 1.6;
    }
    bear.vy += GRAVITY * dt;
    bear.y += bear.vy * dt;
    if (bear.y >= GROUND) { bear.y = GROUND; bear.vy = 0; bear.onGround = true; }
    bear.run += dt * speed / 40;

    spawnIn -= dx;
    if (spawnIn <= 0) spawn();

    const box = { x: BEAR_X - 22, y: bear.y - 66, w: 44, h: 62 };
    for (const t of things) {
      t.x -= dx;
      if (t.kind === "bees") t.t += dt;
      const tb = t.kind === "hive" ? { x: t.x - t.w / 2 + 6, y: GROUND - t.h + 6, w: t.w - 12, h: t.h - 6 }
        : t.kind === "bees" ? { x: t.x - t.w / 2, y: t.y - t.h / 2 + Math.sin(t.t * 8) * 6, w: t.w, h: t.h }
        : { x: t.x - t.w / 2, y: t.y - t.h / 2, w: t.w, h: t.h };
      if (!hit(box, tb)) continue;
      if (t.kind === "honey") {
        if (!t.got) { t.got = true; honey++; Arcade.sfx("coin"); burst(t.x, t.y); }
      } else {
        return gameOver();
      }
    }
    things = things.filter((t) => t.x > -80 && !(t.kind === "honey" && t.got));

    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt; }
    particles = particles.filter((p) => p.life > 0);

    scoreEl.textContent = score();
  }

  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function burst(x, y) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 180;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: .5 + Math.random() * .3 });
    }
  }

  // ---- drawing ----
  function drawScene() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, "#17243a"); sky.addColorStop(.6, "#6b3f4a"); sky.addColorStop(1, "#f08a3c");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // sun
    ctx.fillStyle = "rgba(255, 200, 90, .9)";
    ctx.beginPath(); ctx.arc(620, 250, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(240, 138, 60, .9)";
    for (let i = 0; i < 4; i++) ctx.fillRect(540, 240 + i * 16, 160, 4 + i * 2);

    const far = (dist * .15) % 400, mid = (dist * .4) % 300;
    // far hills
    ctx.fillStyle = "#24331f";
    ctx.beginPath(); ctx.moveTo(0, GROUND);
    for (let x = -400; x <= W + 400; x += 200) ctx.quadraticCurveTo(x - far + 100, GROUND - 130, x - far + 200, GROUND - 40);
    ctx.lineTo(W, GROUND); ctx.fill();
    // pine trees
    ctx.fillStyle = "#16210f";
    for (let i = -1; i < W / 75 + 2; i++) {
      const x = i * 75 - mid % 75, h = 70 + ((i + Math.floor(dist * .4 / 75)) * 37 % 40);
      ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 22, GROUND - h); ctx.lineTo(x + 44, GROUND); ctx.fill();
    }
    // ground
    ctx.fillStyle = "#2f6a1c"; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#6cc63a"; ctx.fillRect(0, GROUND, W, 8);
    ctx.fillStyle = "#24521a";
    const g = dist % 60;
    for (let x = -g; x < W; x += 60) ctx.fillRect(x, GROUND + 22, 26, 5);
    for (let x = -g * 1.3 % 90; x < W; x += 90) ctx.fillRect(x + 30, GROUND + 42, 18, 4);
  }

  function drawHive(t) {
    const levels = t.tall ? 4 : 3;
    const lh = t.h / levels;
    ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 3;
    for (let i = 0; i < levels; i++) {
      const w = t.w * (1 - i * .16) / 2 + 4;
      ctx.fillStyle = i % 2 ? "#e9a21e" : "#f7b52c";
      ctx.beginPath(); ctx.ellipse(t.x, GROUND - lh * (i + .5), w, lh * .62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#0b0d0a";
    ctx.beginPath(); ctx.ellipse(t.x, GROUND - lh * .7, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  function drawBees(t) {
    const y = t.y + Math.sin(t.t * 8) * 6;
    for (let i = 0; i < 3; i++) {
      const bx = t.x - 18 + i * 18, by = y + Math.sin(t.t * 14 + i * 2) * 6;
      ctx.fillStyle = "rgba(255,255,255,.7)";
      ctx.beginPath(); ctx.ellipse(bx - 2, by - 8, 5, 7, -.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f7b52c"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(bx, by, 9, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#0b0d0a"; ctx.fillRect(bx - 2, by - 6, 3, 12); ctx.fillRect(bx + 4, by - 5, 2, 10);
    }
  }
  function drawHoney(t) {
    const bob = Math.sin(time * 5 + t.x * .02) * 4;
    const x = t.x, y = t.y + bob;
    ctx.fillStyle = "rgba(247,181,44,.25)";
    ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f7b52c"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 3;
    Arcade.roundRect(ctx, x - 12, y - 10, 24, 24, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e63b2e"; Arcade.roundRect(ctx, x - 14, y - 16, 28, 8, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff3b0"; ctx.fillRect(x - 7, y - 4, 4, 10);
  }

  function drawBear() {
    const y = bear.y;
    const step = bear.onGround ? Math.sin(bear.run) : 0;
    ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 3;
    // legs
    ctx.fillStyle = "#4f9a2b";
    for (const s of [-1, 1]) {
      const swing = bear.onGround ? step * s * 9 : (s * 5);
      Arcade.roundRect(ctx, BEAR_X - 6 + s * 9 + swing - 7, y - 20, 14, 20, 5); ctx.fill(); ctx.stroke();
    }
    // body in the leather vest
    ctx.fillStyle = "#6cc63a";
    Arcade.roundRect(ctx, BEAR_X - 22, y - 52, 44, 36, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e9dcc0"; ctx.fillRect(BEAR_X - 8, y - 50, 16, 32);
    ctx.fillStyle = "#4a2e1f";
    ctx.beginPath(); ctx.moveTo(BEAR_X - 21, y - 48); ctx.lineTo(BEAR_X - 8, y - 48); ctx.lineTo(BEAR_X - 4, y - 18); ctx.lineTo(BEAR_X - 21, y - 20); ctx.fill();
    ctx.beginPath(); ctx.moveTo(BEAR_X + 21, y - 48); ctx.lineTo(BEAR_X + 8, y - 48); ctx.lineTo(BEAR_X + 4, y - 18); ctx.lineTo(BEAR_X + 21, y - 20); ctx.fill();
    // arm pumping
    ctx.fillStyle = "#6cc63a";
    ctx.beginPath(); ctx.arc(BEAR_X + 18 + step * 6, y - 34 - (bear.onGround ? 0 : 14), 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    Arcade.drawBear(ctx, BEAR_X + 4, y - 72, 24, {
      mouth: bear.onGround ? "grin" : "open",
      tilt: bear.onGround ? step * .04 : -.12,
      blink: state === "over",
    });
  }

  function draw() {
    ctx.save();
    if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); }
    drawScene();
    for (const t of things) {
      if (t.kind === "hive") drawHive(t);
      else if (t.kind === "bees") drawBees(t);
      else drawHoney(t);
    }
    drawBear();
    ctx.fillStyle = "#f7b52c";
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
    if (state === "play") {
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillStyle = "#fff3b0";
      ctx.fillText(`🍯 ${honey}`, 20, 34);
    }
    ctx.restore();
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    if (state === "play") update(dt);
    else if (state === "title") { dist += 120 * dt; time += dt; bear.run += dt * 3; }
    if (shake > 0) shake = Math.max(0, shake - dt * 40);
    draw();
    requestAnimationFrame(frame);
  }

  // pause when the tab is hidden so a run isn't lost
  document.addEventListener("visibilitychange", () => { last = performance.now(); });

  reset();
  overlay.show({
    title: "HONEY DASH",
    text: "Jump the hives, scoop the honey and keep your head below the bees.",
    press: "PRESS SPACE OR TAP TO START",
  });
  requestAnimationFrame(frame);
})();
