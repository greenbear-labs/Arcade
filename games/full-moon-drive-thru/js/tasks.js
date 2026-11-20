// Mini games at the task stations. Each one uses a single button (Space, the USE
// button, or tapping the panel), so they work the same on keyboard and tablet.
//   timing: press when the needle is in the green zone (3 times)
//   mash:   press fast to fill the meter before it drains
//   hold:   hold to fill the cup, let go between the lines (2 cups)
const W = 360, H = 130;

export class TaskUI {
  constructor(panel, onDone, onClose) {
    this.panel = panel;
    this.canvas = panel.querySelector("canvas");
    this.title = panel.querySelector(".task-title");
    this.hint = panel.querySelector(".task-hint");
    this.onDone = onDone;
    this.onClose = onClose;
    this.st = null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = W * dpr; this.canvas.height = H * dpr;
    this.g = this.canvas.getContext("2d");
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Tapping the panel is the button; keep those touches away from the movement stick.
    const stop = (e) => e.stopPropagation();
    panel.addEventListener("touchstart", stop, { passive: true });
    panel.addEventListener("touchend", stop, { passive: true });
    this.canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); this.press(true); });
    this.canvas.addEventListener("pointerup", () => this.press(false));
    panel.querySelector(".task-close").addEventListener("click", () => this.close());
  }

  get open() { return !!this.st; }

  start(station) {
    const kind = station.kind;
    this.st = { station, kind, t: 0, hits: 0, need: kind === "timing" ? 3 : kind === "hold" ? 2 : 1, fill: 0, holding: false, zone: Math.random() * .6 + .2, flash: 0, msg: "" };
    this.title.textContent = station.name;
    this.hint.textContent = {
      timing: "Press when the arrow is in the green!",
      mash: "Mash the button as fast as you can!",
      hold: "Hold to pour. Let go between the lines!",
    }[kind] + " Move to quit.";
    this.panel.hidden = false;
  }

  close(done = false) {
    if (!this.st) return;
    this.st = null;
    this.panel.hidden = true;
    if (!done) this.onClose();
  }

  press(down) {
    const s = this.st;
    if (!s) return;
    if (s.kind === "timing" && down) {
      const pos = needle(s.t);
      if (Math.abs(pos - s.zone) < .09) { s.hits++; s.flash = .3; s.msg = "NICE!"; s.zone = Math.random() * .6 + .2; }
      else { s.flash = -.3; s.msg = "MISS"; }
    } else if (s.kind === "mash" && down) {
      s.fill = Math.min(1, s.fill + .085);
      if (s.fill >= 1) s.hits = 1;
    } else if (s.kind === "hold") {
      if (down) s.holding = true;
      else if (s.holding) {
        s.holding = false;
        if (s.fill > .74 && s.fill < .92) { s.hits++; s.flash = .3; s.msg = "PERFECT!"; }
        else { s.flash = -.3; s.msg = s.fill >= .92 ? "SPILLED!" : "NOT ENOUGH"; }
        s.fill = 0;
      }
    }
    if (s.hits >= s.need) { const st = s.station; this.close(true); this.onDone(st); }
  }

  update(dt) {
    const s = this.st;
    if (!s) return;
    s.t += dt;
    if (s.flash > 0) s.flash = Math.max(0, s.flash - dt); else if (s.flash < 0) s.flash = Math.min(0, s.flash + dt);
    if (s.kind === "mash") s.fill = Math.max(0, s.fill - dt * .22);
    if (s.kind === "hold" && s.holding) { s.fill += dt * .5; if (s.fill > 1.05) { s.holding = false; s.fill = 0; s.flash = -.3; s.msg = "SPILLED!"; } }
    this.draw();
  }

  draw() {
    const g = this.g, s = this.st;
    g.clearRect(0, 0, W, H);
    g.fillStyle = s.flash > 0 ? "#1e3a14" : s.flash < 0 ? "#3a1414" : "#14161f"; g.fillRect(0, 0, W, H);
    g.font = "12px 'Press Start 2P', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#ffcf3a"; g.fillText(`${s.hits} / ${s.need}`, W / 2, 16);
    if (s.kind === "timing") {
      const x0 = 30, x1 = W - 30, y = 70;
      g.fillStyle = "#2b2f3d"; g.fillRect(x0, y - 14, x1 - x0, 28);
      g.fillStyle = "#7be05a"; g.fillRect(x0 + (s.zone - .09) * (x1 - x0), y - 14, .18 * (x1 - x0), 28);
      const nx = x0 + needle(s.t) * (x1 - x0);
      g.fillStyle = "#fff"; g.beginPath(); g.moveTo(nx, y - 18); g.lineTo(nx - 8, y - 30); g.lineTo(nx + 8, y - 30); g.fill();
      g.fillRect(nx - 2, y - 16, 4, 32);
      // a patty / bouncy ball riding the needle
      g.fillStyle = s.station.room === "Playland" ? "#ff3f6c" : "#6b3b1f";
      g.beginPath(); g.ellipse(nx, y + 32, 12, 7, 0, 0, 7); g.fill();
    } else if (s.kind === "mash") {
      const x0 = 40, x1 = W - 40, y = 70;
      g.fillStyle = "#2b2f3d"; g.fillRect(x0, y - 16, x1 - x0, 32);
      g.fillStyle = s.station.room === "Freezer" ? "#ff9ad0" : "#4ec3ff";
      g.fillRect(x0, y - 16, (x1 - x0) * s.fill, 32);
      const r = 10 + s.fill * 26;
      g.globalAlpha = .9;
      g.fillStyle = s.station.room === "Freezer" ? "#f6e7c8" : "#ff6fb5";
      g.beginPath(); g.arc(W / 2, y + 10 - r * .3, r * .6, 0, 7); g.fill();
      g.globalAlpha = 1;
    } else if (s.kind === "hold") {
      const cx = W / 2, top = 30, bot = 118, w = 70;
      g.fillStyle = "#e9edf2"; g.beginPath(); g.moveTo(cx - w / 2, top); g.lineTo(cx + w / 2, top); g.lineTo(cx + w / 2 - 10, bot); g.lineTo(cx - w / 2 + 10, bot); g.fill();
      const level = Math.min(1, s.fill);
      g.fillStyle = s.station.room === "Drive-Thru" ? "#ff9ad0" : "#8a4b1c";
      g.fillRect(cx - w / 2 + 12, bot - (bot - top - 4) * level, w - 24, (bot - top - 4) * level);
      g.strokeStyle = "#7be05a"; g.lineWidth = 2;
      for (const k of [.74, .92]) { const yy = bot - (bot - top - 4) * k; g.beginPath(); g.moveTo(cx - w / 2 - 14, yy); g.lineTo(cx + w / 2 + 14, yy); g.stroke(); }
      if (s.holding) { g.fillStyle = "#cfd3c8"; g.fillRect(cx - 4, 8, 8, top - 6); }
    }
    if (s.flash !== 0) {
      g.fillStyle = s.flash > 0 ? "#7be05a" : "#ff7a6a"; g.font = "16px Bungee, Impact, sans-serif";
      g.fillText(s.msg, W - 60, 16);
    }
  }
}

const needle = (t) => (Math.sin(t * 2.6) + 1) / 2;
