// Berry Snake: classic snake in the Green Bear palette. Berries grow you,
// golden honey is a timed bonus, and every bite speeds you up a little.
(function () {
  const SLUG = "berry-snake";
  const N = 20, CELL = 30, W = N * CELL, H = N * CELL;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KEYS = {
    ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  };

  const canvas = document.getElementById("game");
  const ctx = Arcade.setupCanvas(canvas, W, H);
  const overlay = Arcade.overlay(document.getElementById("overlay"));
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  Arcade.bindMute(document.getElementById("mute"));
  bestEl.textContent = Arcade.best(SLUG);

  let state = "title"; // title | play | paused | over
  let snake, dir, queue, berry, honey, score, eaten, grow, stepEvery, acc, overAt, time, pops;

  function reset() {
    snake = [[6, 10], [5, 10], [4, 10], [3, 10]];
    dir = "right"; queue = [];
    score = 0; eaten = 0; grow = 0; stepEvery = 1 / 7; acc = 0; time = 0; pops = [];
    honey = null;
    berry = freeCell();
  }

  function freeCell() {
    const taken = new Set(snake.map(([x, y]) => `${x},${y}`));
    if (berry) taken.add(`${berry.x},${berry.y}`);
    if (honey) taken.add(`${honey.x},${honey.y}`);
    const free = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (!taken.has(`${x},${y}`)) free.push({ x, y });
    return free[Math.floor(Math.random() * free.length)];
  }

  // ---- input: queue up to two turns so quick double-taps feel right ----
  function turn(d) {
    if (state === "title") return start(d);
    if (state === "over") { if (performance.now() - overAt > 450) start(d); return; }
    if (state === "paused") { state = "play"; overlay.hide(); }
    const lastDir = queue.length ? queue[queue.length - 1] : dir;
    const [lx, ly] = DIRS[lastDir], [nx, ny] = DIRS[d];
    if (d === lastDir || (lx + nx === 0 && ly + ny === 0)) return;
    if (queue.length < 2) queue.push(d);
  }

  addEventListener("keydown", (e) => {
    if (e.code in KEYS) { e.preventDefault(); turn(KEYS[e.code]); return; }
    if (e.code === "KeyP" || e.code === "Escape") {
      if (state === "play") { state = "paused"; overlay.show({ title: "PAUSED", press: "PRESS P OR AN ARROW TO KEEP GOING" }); }
      else if (state === "paused") { state = "play"; overlay.hide(); }
      return;
    }
    if ((e.code === "Space" || e.code === "Enter") && state !== "play") {
      e.preventDefault();
      if (state === "paused") { state = "play"; overlay.hide(); } else turn("right");
    }
  });

  // swipe anywhere on the screen
  let touchStart = null;
  const screenEl = canvas.parentElement;
  screenEl.addEventListener("pointerdown", (e) => { touchStart = { x: e.clientX, y: e.clientY }; });
  screenEl.addEventListener("pointerup", (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
      if (state !== "play") turn("right");
      return;
    }
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  document.querySelectorAll(".dpad button").forEach((b) => {
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); turn(b.dataset.dir); });
  });

  function start(d) {
    reset();
    if (d && d !== "left") dir = d; // can't start by reversing into yourself
    state = "play";
    overlay.hide();
    scoreEl.textContent = 0;
    Arcade.sfx("start");
  }

  function gameOver() {
    state = "over";
    overAt = performance.now();
    Arcade.sfx("hit");
    setTimeout(() => Arcade.sfx("over"), 180);
    const isBest = Arcade.saveBest(SLUG, score);
    bestEl.textContent = Arcade.best(SLUG);
    overlay.show({
      title: "GAME OVER",
      newBest: isBest,
      text: `You ate ${eaten} berr${eaten === 1 ? "y" : "ies"} and grew to ${snake.length} long. Score: ${score}.`,
      press: "PRESS SPACE OR SWIPE TO PLAY AGAIN",
    });
  }

  // ---- one grid step ----
  function step() {
    if (queue.length) dir = queue.shift();
    const [dx, dy] = DIRS[dir];
    const [hx, hy] = snake[0];
    const nx = hx + dx, ny = hy + dy;
    if (nx < 0 || ny < 0 || nx >= N || ny >= N) return gameOver();
    // moving into the tail tip is fine when the tail is about to move away
    const body = grow > 0 ? snake : snake.slice(0, -1);
    if (body.some(([x, y]) => x === nx && y === ny)) return gameOver();

    snake.unshift([nx, ny]);
    if (grow > 0) grow--; else snake.pop();

    if (nx === berry.x && ny === berry.y) {
      eaten++; grow += 1; score += 10;
      stepEvery = 1 / Math.min(15, 7 + eaten * .25);
      pops.push({ x: nx, y: ny, t: 0, text: "+10", color: "#a4ec6a" });
      Arcade.sfx("blip");
      berry = freeCell();
      if (!honey && eaten % 5 === 0) honey = { ...freeCell(), life: 6 };
    }
    if (honey && nx === honey.x && ny === honey.y) {
      grow += 2; score += 50;
      pops.push({ x: nx, y: ny, t: 0, text: "+50", color: "#f7b52c" });
      Arcade.sfx("bonus");
      honey = null;
    }
    scoreEl.textContent = score;
  }

  function update(dt) {
    time += dt;
    acc += dt;
    while (acc >= stepEvery && state === "play") { acc -= stepEvery; step(); }
    if (honey) { honey.life -= dt; if (honey.life <= 0) honey = null; }
    for (const p of pops) p.t += dt;
    pops = pops.filter((p) => p.t < .8);
  }

  // ---- drawing ----
  function draw() {
    ctx.fillStyle = "#0e1a0b"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#13230f";
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);

    // berry
    const bob = Math.sin(time * 6) * 1.5;
    drawBerry(berry.x * CELL + CELL / 2, berry.y * CELL + CELL / 2 + bob);

    // honey blinks when it's about to vanish
    if (honey && (honey.life > 1.5 || Math.floor(time * 8) % 2 === 0)) {
      const x = honey.x * CELL + CELL / 2, y = honey.y * CELL + CELL / 2;
      ctx.fillStyle = "rgba(247,181,44,.25)"; ctx.beginPath(); ctx.arc(x, y, CELL * .8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f7b52c"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
      Arcade.roundRect(ctx, x - 9, y - 7, 18, 17, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e63b2e"; Arcade.roundRect(ctx, x - 10, y - 11, 20, 6, 2); ctx.fill(); ctx.stroke();
    }

    // snake: tail to head so the head sits on top
    for (let i = snake.length - 1; i >= 0; i--) {
      const [x, y] = snake[i];
      const px = x * CELL, py = y * CELL;
      ctx.fillStyle = i === 0 ? "#7fd64a" : i % 2 ? "#6cc63a" : "#5ab52f";
      ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
      Arcade.roundRect(ctx, px + 2, py + 2, CELL - 4, CELL - 4, i === 0 ? 9 : 7); ctx.fill(); ctx.stroke();
      if (i > 0 && i % 3 === 0) { ctx.fillStyle = "#2f6a1c"; ctx.fillRect(px + 11, py + 11, 8, 8); }
    }
    drawHead();

    ctx.textAlign = "center"; ctx.font = '14px "Press Start 2P", monospace';
    for (const p of pops) {
      ctx.globalAlpha = 1 - p.t / .8;
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x * CELL + CELL / 2, p.y * CELL - p.t * 40);
    }
    ctx.globalAlpha = 1;
  }

  function drawBerry(x, y) {
    ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
    ctx.fillStyle = "#e63b2e";
    for (const [ox, oy] of [[-5, 2], [5, 2], [0, -4]]) { ctx.beginPath(); ctx.arc(x + ox, y + oy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "#ff9b90";
    ctx.beginPath(); ctx.arc(x - 2, y - 6, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6cc63a";
    ctx.beginPath(); ctx.ellipse(x + 4, y - 12, 6, 3, -.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  function drawHead() {
    const [x, y] = snake[0];
    const cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2;
    const [dx, dy] = DIRS[dir];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(dy, dx));
    // headband across the back of the head, tails trailing behind
    ctx.fillStyle = "#e63b2e"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
    ctx.fillRect(-7, -13, 6, 26);
    ctx.beginPath(); ctx.moveTo(-6, 9); ctx.lineTo(-18, 16); ctx.lineTo(-14, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    // eyes facing forward
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#f6e7c8"; ctx.beginPath(); ctx.arc(5, s * 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0b0d0a"; ctx.beginPath(); ctx.arc(6.5, s * 6, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(1 / 20, (now - last) / 1000);
    last = now;
    if (state === "play") update(dt);
    else time += dt;
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
    if (document.hidden && state === "play") { state = "paused"; overlay.show({ title: "PAUSED", press: "PRESS P OR AN ARROW TO KEEP GOING" }); }
  });

  reset();
  overlay.show({
    title: "BERRY SNAKE",
    text: "Eat the berries, grab the golden honey and don't run into the walls or your own tail.",
    press: "PRESS AN ARROW OR SWIPE TO START",
  });
  requestAnimationFrame(frame);
})();
