// Tiny WebAudio sound effects, no files to load.
let ctx = null;
let muted = false;
try { muted = localStorage.getItem("fmdt:muted") === "1"; } catch { /* private mode */ }

const tones = {
  start: [[440, .06], [660, .06], [880, .1]],
  coin: [[988, .05], [1319, .12]],
  use: [[520, .05, 900]],
  bonk: [[180, .08, 70, "square"]],
  catch: [[300, .1, 80, "sawtooth"], [120, .2, 60, "sawtooth"]],
  whoosh: [[200, .15, 900, "triangle"]],
  slip: [[700, .2, 200, "triangle"]],
  howl: [[300, .25, 600, "sawtooth"], [600, .5, 380, "sawtooth"]],
  garlic: [[880, .05], [660, .05], [990, .12]],
  tick: [[660, .03]],
  over: [[392, .14], [330, .14], [262, .3]],
  win: [[784, .06], [988, .06], [1175, .06], [1568, .14]],
  growl: [[90, .35, 60, "sawtooth"], [70, .3, 50, "sawtooth"]],
};

export function sfx(name) {
  if (muted || !tones[name]) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    let t = ctx.currentTime;
    for (const [freq, dur, slideTo, type] of tones[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(.07, t);
      gain.gain.exponentialRampToValueAtTime(.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + dur + .02);
      t += dur;
    }
  } catch { /* no audio */ }
}

export function bindMute(btn) {
  const paint = () => { btn.textContent = muted ? "🔇" : "🔊"; btn.setAttribute("aria-label", muted ? "Unmute" : "Mute"); };
  paint();
  btn.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem("fmdt:muted", muted ? "1" : "0"); } catch { /* ignore */ }
    paint(); btn.blur();
  });
}
