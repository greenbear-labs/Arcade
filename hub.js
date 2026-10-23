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
      a.href = game.url || `games/${game.slug}/index.html`;
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
      if (game.meta) {
        meta.innerHTML = `${game.controls.toUpperCase()}<br><b></b>`;
        meta.querySelector("b").textContent = game.meta;
      } else {
        meta.innerHTML = `${game.controls.toUpperCase()}<br>BEST <b></b>`;
        meta.querySelector("b").textContent = Arcade.best(game.slug);
      }
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
    "chow-pow"(ctx, t) {
      // Spicy Punch jabs a Ravioli ghost down a night street; every third punch knocks it back.
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#1b1030"); sky.addColorStop(1, "#4a1d3f");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff3c4"; ctx.beginPath(); ctx.arc(196, 30, 13, 0, Math.PI * 2); ctx.fill();
      const pan = (t * 18) % 60;
      ctx.fillStyle = "#24163a";
      for (let i = -1; i < 6; i++) ctx.fillRect(i * 60 - pan, 62 + (i * 29 % 3) * 10, 50, 90);
      ctx.fillStyle = "#3a2a20"; ctx.fillRect(0, 138, W, 42);
      ctx.fillStyle = "#5a4030"; ctx.fillRect(0, 138, W, 4);
      for (let i = 0; i < 6; i++) ctx.fillRect(i * 48 - (t * 30 % 48), 158, 24, 3);

      const beat = t * 1.8, k = beat % 1, hit = Math.floor(beat) % 3 === 2;
      const jab = Math.max(0, Math.sin(Math.min(k / .35, 1) * Math.PI));
      const knock = hit && k > .15 ? Math.min((k - .15) * 4, 1) : 0;
      drawTaco(ctx, 64 + jab * 6, 112 + Math.sin(t * 6) * 1.5, 30, jab);
      drawRavioli(ctx, 168 + knock * 26, 92 + Math.sin(t * 3) * 5 - knock * 10, 22, knock);
      if (jab > .7) {
        ctx.save(); ctx.translate(138, 106); ctx.rotate(t * 4);
        ctx.fillStyle = hit ? "#ffd23f" : "#fff";
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10; ctx.lineTo(Math.cos(i * Math.PI / 5) * r, Math.sin(i * Math.PI / 5) * r); }
        ctx.fill(); ctx.restore();
      }
      if (hit && k > .2 && k < .8) {
        ctx.font = "16px Bungee, sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = "#e63b2e"; ctx.fillText("POW!", 152, 54);
        ctx.fillStyle = "#ffd23f"; ctx.fillText("POW!", 150, 52);
      }
    },
    "chow-pow-rock"(ctx, t) {
      // A four-lane note highway under stage lights; notes land on the strike line in time with the beat.
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#2a0f3d"); bg.addColorStop(1, "#5a1650");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const beat = t * 2, pulse = 1 - (beat % 1);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(255, 220, 255, ${0.06 + 0.08 * pulse})`;
        ctx.beginPath(); ctx.moveTo(30 + i * 60, 0); ctx.lineTo(10 + i * 60, H); ctx.lineTo(50 + i * 60, H); ctx.fill();
      }
      const top = 18, strike = 150, cx = W / 2;
      const proj = (lane, u) => { const s = 1 / (1 + 2.3 * u); return [cx + (lane - 1.5) * 34 * s, strike - (strike - top) * (1 - s) / (1 - 1 / 3.3)]; };
      ctx.fillStyle = "#16101e"; ctx.strokeStyle = "#ff3fa4"; ctx.lineWidth = 2;
      const [l0x] = proj(-0.5, 1), [r0x] = proj(3.5, 1), [l1x] = proj(-0.5, 0), [r1x] = proj(3.5, 0);
      ctx.beginPath(); ctx.moveTo(l0x, top); ctx.lineTo(r0x, top); ctx.lineTo(r1x + 6, H); ctx.lineTo(l1x - 6, H); ctx.closePath(); ctx.fill(); ctx.stroke();
      const colors = ["#7bd93a", "#e8263f", "#ffd23f", "#3cc3ee"];
      const pattern = [0, 2, 1, 3, 2, 0, 3, 1];
      for (let n = 0; n < 8; n++) {
        const due = Math.floor(beat) + n - (beat % 1);
        const u = due / 4;
        if (u < -0.05 || u > 1) continue;
        const lane = pattern[(Math.floor(beat) + n) % 8];
        const [x, y] = proj(lane, u), s = 1 / (1 + 2.3 * u);
        ctx.fillStyle = colors[lane]; ctx.strokeStyle = "#0b0d0a";
        ctx.beginPath(); ctx.ellipse(x, y, 13 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      for (let lane = 0; lane < 4; lane++) {
        const [x, y] = proj(lane, 0);
        const hit = pattern[Math.floor(beat) % 8] === lane && beat % 1 < 0.25;
        ctx.strokeStyle = colors[lane]; ctx.lineWidth = hit ? 5 : 3;
        ctx.beginPath(); ctx.ellipse(x, y, 14, 9, 0, 0, Math.PI * 2); ctx.stroke();
        if (hit) { ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fill(); }
      }
      if (Math.floor(beat) % 4 === 3) {
        ctx.font = "15px Bungee, sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = "#e8263f"; ctx.fillText("PERFECT!", cx + 2, 52);
        ctx.fillStyle = "#ffd23f"; ctx.fillText("PERFECT!", cx, 50);
      }
    },
    "mythica-sanctuary"(ctx, t) {
      // Slow pan over the game's title art, with drifting fireflies.
      ctx.fillStyle = "#14202c"; ctx.fillRect(0, 0, W, H);
      if (sanctuaryArt.complete && sanctuaryArt.naturalWidth) {
        const iw = sanctuaryArt.naturalWidth, ih = sanctuaryArt.naturalHeight;
        const scale = W / iw * 1.12;
        const pan = (Math.sin(t * 0.25) + 1) / 2;
        ctx.drawImage(sanctuaryArt, -(iw * scale - W) * pan, -(ih * scale - H) * (1 - pan), iw * scale, ih * scale);
      }
      for (let i = 0; i < 9; i++) {
        const x = (i * 53 + Math.sin(t * 0.7 + i) * 14 + 400) % W;
        const y = 40 + ((i * 37) % 120) + Math.cos(t * 0.9 + i * 2) * 8;
        const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2 + i * 1.7));
        ctx.fillStyle = `rgba(255, 236, 140, ${a})`;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    },
    soon(ctx) {
      const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 120; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      ctx.putImageData(img, 0, 0);
    },
  };

  const sanctuaryArt = new Image();
  sanctuaryArt.onload = () => { const c = cabs.find((x) => x.slug === "mythica-sanctuary"); if (c && c.ctx) attract[c.slug](c.ctx, 1.3); };
  sanctuaryArt.src = "assets/sanctuary.jpg";

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

  function drawTaco(ctx, x, y, s, jab) {
    ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
    // filling peeking out of the shell
    ctx.fillStyle = "#6cc63a"; ctx.beginPath(); ctx.ellipse(x, y - s * .55, s * .95, s * .3, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#e63b2e"; for (const dx of [-.5, 0, .5]) { ctx.beginPath(); ctx.arc(x + dx * s, y - s * .62, s * .14, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.ellipse(x, y - s * .5, s, s * .9, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e63b2e"; ctx.fillRect(x - s * .9, y - s * .3, s * 1.8, s * .16); // bandana
    ctx.fillStyle = "#fff"; for (const dx of [-.25, .2]) { ctx.beginPath(); ctx.arc(x + dx * s, y - s * .02, s * .13, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#000"; for (const dx of [-.2, .25]) { ctx.beginPath(); ctx.arc(x + dx * s, y, s * .06, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#c81e1e"; // boxing gloves
    ctx.beginPath(); ctx.arc(x + s * (1.1 + jab * 1.3), y - s * .1, s * .3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + s * .9, y + s * .3, s * .28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  function drawRavioli(ctx, x, y, s, knock) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(knock * .5);
    ctx.globalAlpha = .9;
    ctx.fillStyle = "#f6a6c8"; ctx.strokeStyle = "#0b0d0a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, -s); ctx.lineTo(s, s * .6);
    for (let i = 4; i >= 0; i--) ctx.quadraticCurveTo(-s + (i + .5) * s * .4, s * (i % 2 ? .6 : 1.1), -s + i * s * .4, s * .6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = "#1b1030";
    if (knock > .2) { ctx.font = `${s * .6}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("x  x", 0, -s * .1); }
    else for (const dx of [-.4, .4]) { ctx.beginPath(); ctx.ellipse(dx * s, -s * .25, s * .14, s * .22, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0, s * .25, s * .2, s * (.12 + knock * .1), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
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
