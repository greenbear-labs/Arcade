// The Bear's Den: builds a cabinet per game, runs little attract-mode loops on
// their screens, and drops a coin before sending you into a game.
(function () {
  const W = 240, H = 180;
  const games = window.ARCADE_GAMES;
  const grid = document.getElementById("cabinets");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  function cabinet(game) {
    const soon = !game;
    const a = el(soon ? "div" : "a", soon ? "cab soon" : "cab");
    if (!soon) {
      a.href = `games/${game.slug}/index.html`;
      a.style.setProperty("--c", game.color);
      a.setAttribute("aria-label", `Play ${game.title}. ${game.tagline}`);
    } else {
      a.setAttribute("aria-label", "Coming soon: a new cabinet is on the way");
    }

    a.append(el("div", "cab-marquee", soon ? "Coming Soon" : game.title));

    const body = el("div", "cab-body");
    const screen = el("div", "cab-screen");
    const canvas = document.createElement("canvas");
    screen.append(canvas, el("div", "insert", soon ? "NEXT GAME LOADING" : "INSERT COIN"));
    body.append(screen, el("p", "cab-tag", soon ? "The bear is wiring up another cabinet. Check back soon." : game.tagline));
    a.append(body);

    const deck = el("div", "cab-deck");
    const btns = el("div", "btns");
    btns.append(el("i"), el("i"));
    deck.append(el("div", "stick"), btns);
    a.append(deck);

    const base = el("div", "cab-base");
    const door = el("div", "coin-door");
    door.append(el("span", "slot"), el("span", "slot"));
    const meta = el("div", "meta");
    if (!soon) {
      meta.innerHTML = `${game.controls.toUpperCase()}<br>BEST <b></b>`;
      meta.querySelector("b").textContent = Arcade.best(game.slug);
    } else {
      meta.textContent = "OUT OF ORDER";
    }
    base.append(door, meta);
    a.append(base);

    if (!soon) a.addEventListener("click", (e) => insertCoin(e, a, door));
    return { node: a, canvas, slug: soon ? "soon" : game.slug };
  }

  // Coin drop, then navigate. Modified clicks (new tab etc.) go straight through.
  function insertCoin(e, cab, door) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const tokens = Arcade.store.get("gba:tokens", 0) + 1;
    Arcade.store.set("gba:tokens", tokens);
    Arcade.sfx("coin");
    const coin = el("span", "coin");
    const slot = door.querySelector(".slot");
    coin.style.left = `${slot.offsetLeft + 2}px`;
    coin.style.top = `${door.parentElement.offsetTop + slot.offsetTop + 4}px`;
    cab.append(coin);
    setTimeout(() => { window.location.href = cab.href; }, reduceMotion ? 0 : 480);
  }

  // ---- attract-mode loops, one per game ----
  const attract = {
    "honey-dash"(ctx, t) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#1c2b3f"); sky.addColorStop(1, "#f08a3c");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#2f6a1c"; ctx.fillRect(0, 140, W, 40);
      ctx.fillStyle = "#6cc63a"; ctx.fillRect(0, 140, W, 6);
      const speed = 70, period = 150;
      const off = (t * speed) % period;
      // hives
      for (let i = 0; i < 3; i++) {
        const x = i * period - off + 120;
        drawHive(ctx, x, 140, 16);
      }
      // bear hops over each hive
      const phase = ((t * speed) % period) / period;
      const jump = Math.max(0, Math.sin(phase * Math.PI * 2 - .9));
      Arcade.drawBear(ctx, 60, 118 - jump * 52, 18, { mouth: jump > .2 ? "open" : "grin" });
      // honey jar
      const hx = W - ((t * speed + 60) % (W + 40)) + 20;
      drawHoney(ctx, hx, 60);
    },
    "whack-a-raccoon"(ctx, t) {
      ctx.fillStyle = "#16210f"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1d2b14";
      for (let i = 0; i < 12; i++) ctx.fillRect((i * 37) % W, (i * 53) % H, 18, 3);
      const holes = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) holes.push([45 + c * 75, 45 + r * 52]);
      const active = Math.floor(t * 1.6) % 9;
      const order = [4, 0, 8, 2, 6, 1, 7, 3, 5];
      holes.forEach(([x, y], i) => {
        const up = order[active] === i ? Math.sin(((t * 1.6) % 1) * Math.PI) : 0;
        drawCan(ctx, x, y, 18, up, false);
      });
    },
    "berry-snake"(ctx, t) {
      ctx.fillStyle = "#0e1a0b"; ctx.fillRect(0, 0, W, H);
      const cell = 12;
      ctx.fillStyle = "#132310";
      for (let x = 0; x < W; x += cell) for (let y = 0; y < H; y += cell) if (((x + y) / cell) % 2 === 0) ctx.fillRect(x, y, cell, cell);
      // a snake looping around a rectangle path
      const path = [];
      for (let x = 2; x < 17; x++) path.push([x, 3]);
      for (let y = 3; y < 12; y++) path.push([17, y]);
      for (let x = 17; x > 2; x--) path.push([x, 12]);
      for (let y = 12; y > 3; y--) path.push([2, y]);
      const head = Math.floor(t * 9) % path.length;
      const len = 10 + (Math.floor(t / 4) % 6);
      for (let i = len; i >= 0; i--) {
        const [x, y] = path[(head - i + path.length * 4) % path.length];
        ctx.fillStyle = i === 0 ? "#a4ec6a" : i % 2 ? "#6cc63a" : "#58b02c";
        Arcade.roundRect(ctx, x * cell + 1, y * cell + 1, cell - 2, cell - 2, 3); ctx.fill();
      }
      const [hx, hy] = path[head];
      ctx.fillStyle = "#e63b2e"; ctx.fillRect(hx * cell + 1, hy * cell + 2, cell - 2, 3);
      for (const [bx, by] of [[9, 7], [13, 9], [6, 9]]) drawBerry(ctx, bx * cell + cell / 2, by * cell + cell / 2, 5);
    },
    soon(ctx) {
      const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 120; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      ctx.putImageData(img, 0, 0);
    },
  };

  // Sprites shared with the games live in each game; these are small preview versions.
  function drawHive(ctx, x, ground, s) {
    ctx.fillStyle = "#f7b52c"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const w = s * (1.1 - i * .25);
      ctx.beginPath(); ctx.ellipse(x, ground - s * .35 - i * s * .55, w, s * .35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#0b0d0a"; ctx.beginPath(); ctx.arc(x, ground - s * .45, s * .18, 0, Math.PI * 2); ctx.fill();
  }
  function drawHoney(ctx, x, y) {
    ctx.fillStyle = "#f7b52c"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
    Arcade.roundRect(ctx, x - 8, y - 8, 16, 18, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e63b2e"; ctx.fillRect(x - 9, y - 11, 18, 5);
  }
  function drawBerry(ctx, x, y, r) {
    ctx.fillStyle = "#e63b2e"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff9b90"; ctx.beginPath(); ctx.arc(x - r * .35, y - r * .35, r * .3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6cc63a"; ctx.fillRect(x - 1, y - r - 3, 2, 4);
  }
  function drawCan(ctx, x, y, s, up) {
    // raccoon peeking out
    if (up > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - s * 2, y - s * 3, s * 4, s * 3); ctx.clip();
      const ry = y - up * s * 1.4;
      ctx.fillStyle = "#8a8f96"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sx * s * .55, ry - s * .6, s * .28, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(x, ry, s * .8, s * .7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1a1c1f"; ctx.beginPath(); ctx.ellipse(x, ry - s * .1, s * .7, s * .22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sx * s * .3, ry - s * .1, s * .09, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = "#5d6656"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, s * 1.1, s * .35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(x, y, s * .85, s * .22, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ---- build the floor ----
  const cabs = [...games.map(cabinet), cabinet(null)];
  cabs.forEach((c) => grid.append(c.node));

  const live = new Set();
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((en) => {
        const c = cabs.find((x) => x.canvas === en.target);
        if (en.isIntersecting) live.add(c); else live.delete(c);
      }))
    : null;

  cabs.forEach((c) => {
    c.ctx = Arcade.setupCanvas(c.canvas, W, H);
    c.canvas.style.aspectRatio = "4 / 3";
    attract[c.slug](c.ctx, 1.3);
    if (io) io.observe(c.canvas); else live.add(c);
  });

  if (!reduceMotion) {
    let last = 0;
    const loop = (now) => {
      const t = now / 1000;
      // the static screen only needs ~12fps to look right
      const noiseTick = now - last > 80;
      for (const c of live) {
        if (c.slug === "soon") { if (noiseTick) attract.soon(c.ctx); continue; }
        attract[c.slug](c.ctx, t);
      }
      if (noiseTick) last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---- hero extras ----
  document.getElementById("random").addEventListener("click", () => {
    const g = games[Math.floor(Math.random() * games.length)];
    const c = cabs.find((x) => x.slug === g.slug);
    c.node.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    c.node.focus({ preventScroll: true });
  });

  const tokens = Arcade.store.get("gba:tokens", 0);
  if (tokens > 0) {
    const t = document.getElementById("tokens");
    t.textContent = `🪙 ${tokens} token${tokens === 1 ? "" : "s"} played`;
    t.hidden = false;
  }
})();
