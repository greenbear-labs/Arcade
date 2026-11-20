/* Froggy Farm sound: every sound effect and the music are synthesized live with
 * the Web Audio API, so there are no audio files to download or license. */
const Sound = (() => {
  'use strict';
  let ctx = null, master, sfxBus, musicBus, noiseBuf;
  let musicEnabled = true, musicTimer = null, mood = 'day', step = 0, nextTime = 0;
  const MUSIC_VOL = 0.16, DUCK_VOL = 0.05;

  function init() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    // Safari 17+: play even when the iPad's silent switch is on.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.75; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = MUSIC_VOL; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (ctx.state !== 'running') ctx.resume();
    if (musicEnabled) startMusic();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }

  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(o) {
    if (!ctx) return;
    const { type = 'sine', f0 = 440, f1 = f0, dur = 0.2, vol = 0.4, a = 0.01, at = 0,
      out = sfxBus, vib = 0, vibRate = 6, lp = 0, abs = null } = o;
    const t = abs != null ? abs : ctx.currentTime + at;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    env(g, t, a, vol, dur);
    let node = osc;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(out);
    if (vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = vibRate; lg.gain.value = vib;
      l.connect(lg); lg.connect(osc.frequency);
      l.start(t); l.stop(t + dur + 0.05);
    }
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function noise(o) {
    if (!ctx) return;
    const { dur = 0.2, vol = 0.3, type = 'lowpass', f0 = 1000, f1 = f0, q = 1, at = 0, a = 0.005 } = o;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    env(g, t, a, vol, dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  const r = (a, b) => a + Math.random() * (b - a);
  const PENTA = [784, 880, 1047, 1175, 1319, 1568];

  const fx = {
    tickle() { for (let i = 0; i < 6; i++) tone({ type: 'triangle', f0: 650 + i * 80 + (i % 2) * 260, f1: 900 + i * 110, dur: 0.07, vol: 0.22, at: i * 0.06 }); },
    boing() { tone({ f0: 180, f1: 760, dur: 0.38, vol: 0.42, vib: 45, vibRate: 18 }); },
    pop() { tone({ f0: 300, f1: 1150, dur: 0.09, vol: 0.4 }); },
    land() { tone({ f0: 520, f1: 240, dur: 0.09, vol: 0.22 }); },
    croak() {
      tone({ type: 'sawtooth', f0: 140, f1: 110, dur: 0.18, vol: 0.26, lp: 650, vib: 30, vibRate: 35 });
      tone({ type: 'sawtooth', f0: 150, f1: 115, dur: 0.22, vol: 0.26, lp: 650, vib: 30, vibRate: 35, at: 0.24 });
    },
    whirr() { tone({ type: 'square', f0: 300, f1: 950, dur: 0.85, vol: 0.1, lp: 1600, vib: 70, vibRate: 25 }); fx.squeak(1, 0.85); },
    buzz() { tone({ type: 'sawtooth', f0: 220, f1: 250, dur: 1.0, vol: 0.17, lp: 1400, vib: 28, vibRate: 28 }); },
    squeak(n = 3, at0 = 0) { for (let i = 0; i < n; i++) tone({ f0: 1100, f1: 1750, dur: 0.09, vol: 0.24, at: at0 + i * 0.17 }); },
    flutter() {
      for (let i = 0; i < 7; i++) noise({ type: 'bandpass', f0: 2600, dur: 0.05, vol: 0.16, q: 2, at: i * 0.09 });
      tone({ type: 'triangle', f0: 1319, dur: 0.5, vol: 0.14, at: 0.1 });
      tone({ type: 'triangle', f0: 1760, dur: 0.5, vol: 0.12, at: 0.3 });
    },
    boink() {
      tone({ type: 'square', f0: 170, f1: 80, dur: 0.15, vol: 0.18, lp: 1200 });
      tone({ f0: 200, f1: 820, dur: 0.32, vol: 0.34, at: 0.4, vib: 30, vibRate: 16 });
    },
    slurp() { noise({ type: 'bandpass', f0: 500, f1: 2600, dur: 0.18, vol: 0.32, q: 3 }); tone({ f0: 300, f1: 950, dur: 0.18, vol: 0.18 }); },
    chomp() {
      [0, 0.2].forEach(at => {
        noise({ type: 'lowpass', f0: 1000, f1: 300, dur: 0.09, vol: 0.5, at });
        tone({ type: 'square', f0: 130, f1: 70, dur: 0.08, vol: 0.16, lp: 800, at });
      });
    },
    gulp() { tone({ f0: 620, f1: 150, dur: 0.26, vol: 0.4 }); },
    burp() { tone({ type: 'sawtooth', f0: 95, f1: 68, dur: 0.6, vol: 0.36, lp: 450, vib: 12, vibRate: 22, a: 0.03 }); },
    sparkle() { [1568, 1976, 2349, 2637, 3136].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.25, vol: 0.12, at: i * 0.05 })); },
    rainbow() {
      tone({ f0: 300, f1: 2400, dur: 0.9, vol: 0.18, vib: 60, vibRate: 12 });
      for (let i = 0; i < 14; i++) tone({ type: 'triangle', f0: PENTA[i % 6] * (i > 6 ? 2 : 1), dur: 0.2, vol: 0.1, at: 0.1 + i * 0.07 });
    },
    swish() { noise({ type: 'bandpass', f0: 700, f1: 3500, dur: 0.25, vol: 0.14, q: 1.5 }); },
    moo() {
      tone({ type: 'sawtooth', f0: 150, f1: 102, dur: 1.15, vol: 0.32, a: 0.16, lp: 900, vib: 4, vibRate: 5 });
      tone({ type: 'sawtooth', f0: 300, f1: 205, dur: 1.15, vol: 0.07, a: 0.16, lp: 1300 });
    },
    splash() {
      noise({ type: 'lowpass', f0: 4500, f1: 400, dur: 0.5, vol: 0.32 });
      [0, 0.08, 0.16].forEach((at, i) => tone({ f0: 480 + i * 200, f1: 1200 + i * 300, dur: 0.08, vol: 0.18, at: at + 0.1 }));
    },
    chime(i = 0) {
      const f = PENTA[i % PENTA.length];
      tone({ f0: f, dur: 1.2, vol: 0.24, a: 0.005 });
      tone({ f0: f * 2, dur: 0.6, vol: 0.07 });
      tone({ f0: f * 1.5, dur: 0.9, vol: 0.08, at: 0.12 });
    },
    night() { [1319, 1047, 880, 784, 659, 523].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.6, vol: 0.14, at: i * 0.12 })); },
    day() { [523, 659, 784, 880, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.6, vol: 0.14, at: i * 0.1 })); },
    twinkle() { [2093, 2637, 3136, 2637, 3520].forEach((f, i) => tone({ type: 'sine', f0: f, dur: 0.18, vol: 0.12, at: i * 0.09 })); },
    love() { tone({ type: 'triangle', f0: 784, f1: 1047, dur: 0.25, vol: 0.2 }); tone({ type: 'triangle', f0: 1047, f1: 1319, dur: 0.35, vol: 0.2, at: 0.2 }); fx.squeak(2, 0.45); },
    bonk() { tone({ type: 'square', f0: 260, f1: 140, dur: 0.1, vol: 0.16, lp: 1400 }); tone({ f0: 900, f1: 1400, dur: 0.08, vol: 0.2, at: 0.12 }); tone({ f0: 1400, f1: 700, dur: 0.12, vol: 0.18, at: 0.22 }); },
    // ice cream kitchen
    scoop() { noise({ type: 'lowpass', f0: 900, f1: 250, dur: 0.18, vol: 0.35 }); tone({ f0: 420, f1: 180, dur: 0.16, vol: 0.25 }); },
    plop() { tone({ f0: 260, f1: 520, dur: 0.07, vol: 0.35 }); tone({ f0: 520, f1: 200, dur: 0.12, vol: 0.25, at: 0.06 }); },
    shake() { for (let i = 0; i < 6; i++) noise({ type: 'highpass', f0: 4000, dur: 0.05, vol: 0.2, at: i * 0.07 }); },
    drizzle() { tone({ type: 'triangle', f0: 900, f1: 300, dur: 0.6, vol: 0.18, vib: 20, vibRate: 9 }); noise({ type: 'bandpass', f0: 600, dur: 0.5, vol: 0.12, q: 2 }); },
    spray() { noise({ type: 'highpass', f0: 2500, f1: 5000, dur: 0.45, vol: 0.22, a: 0.03 }); },
    ding() { tone({ f0: 1568, dur: 1.2, vol: 0.28 }); tone({ f0: 3136, dur: 0.6, vol: 0.08 }); tone({ f0: 2093, dur: 0.9, vol: 0.1, at: 0.02 }); },
    crunch() { for (let i = 0; i < 4; i++) noise({ type: 'bandpass', f0: 1800, dur: 0.06, vol: 0.35, q: 1.2, at: i * 0.09 }); },
    shiver() { tone({ type: 'triangle', f0: 600, f1: 500, dur: 0.9, vol: 0.2, vib: 80, vibRate: 22 }); noise({ type: 'highpass', f0: 5000, dur: 0.8, vol: 0.08 }); },
    honk() { tone({ type: 'sawtooth', f0: 420, f1: 380, dur: 0.16, vol: 0.18, lp: 1400 }); tone({ type: 'sawtooth', f0: 460, f1: 420, dur: 0.18, vol: 0.18, lp: 1400, at: 0.2 }); },
    grunt() { tone({ type: 'sawtooth', f0: 95, f1: 80, dur: 0.35, vol: 0.32, lp: 500, vib: 8, vibRate: 14 }); },
    chirp() { [0, 0.12, 0.24].forEach(at => tone({ f0: 1800, f1: 2600, dur: 0.07, vol: 0.18, at })); },
    toss() { tone({ f0: 300, f1: 1200, dur: 0.3, vol: 0.2 }); noise({ type: 'bandpass', f0: 1000, f1: 3000, dur: 0.3, vol: 0.12 }); },
    cheer() { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.35, vol: 0.16, at: i * 0.08 })); fx.sparkle(); },
    poof() { noise({ type: 'lowpass', f0: 1800, f1: 200, dur: 0.35, vol: 0.28 }); },
    // pumpkin house
    carve() {
      for (let i = 0; i < 3; i++) noise({ type: 'bandpass', f0: 1400 + i * 500, f1: 700, dur: 0.1, vol: 0.3, q: 2.5, at: i * 0.11 });
      tone({ f0: 300, f1: 1150, dur: 0.09, vol: 0.3, at: 0.36 });
    },
    ignite() {
      noise({ type: 'bandpass', f0: 300, f1: 2400, dur: 0.6, vol: 0.3, q: 1.2, a: 0.08 });
      tone({ type: 'triangle', f0: 220, f1: 880, dur: 0.6, vol: 0.18 });
      [659, 880, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.4, vol: 0.12, at: 0.5 + i * 0.07 }));
    },
    rattle() { for (let i = 0; i < 8; i++) noise({ type: 'bandpass', f0: r(2200, 3600), dur: 0.035, vol: 0.28, q: 4, at: i * 0.055 + Math.random() * 0.02 }); },
    xylo(n = 6) {
      const notes = [69, 72, 76, 81, 76, 72, 74, 77, 81, 84];
      for (let i = 0; i < n; i++) {
        const f = 440 * Math.pow(2, (notes[i % notes.length] - 57) / 12);
        tone({ type: 'sine', f0: f, dur: 0.22, vol: 0.26, a: 0.003, at: i * 0.12 });
        tone({ type: 'sine', f0: f * 4, dur: 0.05, vol: 0.06, a: 0.002, at: i * 0.12 });
      }
    },
    boo() { tone({ f0: 520, f1: 300, dur: 0.9, vol: 0.3, a: 0.08, vib: 25, vibRate: 7 }); tone({ type: 'triangle', f0: 780, f1: 450, dur: 0.9, vol: 0.08, a: 0.08, vib: 25, vibRate: 7 }); },
    creak() { tone({ type: 'sawtooth', f0: 110, f1: 190, dur: 0.7, vol: 0.14, lp: 900, vib: 18, vibRate: 30 }); },
    meow() { tone({ type: 'triangle', f0: 620, f1: 1050, dur: 0.18, vol: 0.24 }); tone({ type: 'triangle', f0: 1050, f1: 560, dur: 0.4, vol: 0.24, at: 0.17, vib: 12, vibRate: 8 }); },
    batsqueak() { for (let i = 0; i < 4; i++) tone({ f0: r(2400, 3000), f1: r(3200, 3800), dur: 0.05, vol: 0.12, at: i * 0.13 + Math.random() * 0.05 }); },
    party() {
      [57, 60, 64, 69, 72, 76, 81].forEach((m, i) => tone({ type: 'triangle', f0: 440 * Math.pow(2, (m - 69) / 12), dur: 0.3, vol: 0.16, at: i * 0.09 }));
      fx.xylo(8); fx.sparkle();
    },
    // car wash
    trumpet() { tone({ type: 'sawtooth', f0: 330, f1: 520, dur: 0.5, vol: 0.2, lp: 1800, vib: 14, vibRate: 7, a: 0.04 }); tone({ type: 'sawtooth', f0: 520, f1: 480, dur: 0.35, vol: 0.18, lp: 1800, at: 0.45, vib: 10, vibRate: 7 }); },
    beep() { [0, 0.22].forEach(at => { tone({ type: 'square', f0: 440, dur: 0.15, vol: 0.12, lp: 2200, at }); tone({ type: 'square', f0: 554, dur: 0.15, vol: 0.1, lp: 2200, at }); }); },
    putt() { for (let i = 0; i < 6; i++) { tone({ type: 'square', f0: 70, f1: 55, dur: 0.07, vol: 0.2, lp: 500, at: i * 0.11 }); noise({ type: 'lowpass', f0: 400, dur: 0.05, vol: 0.18, at: i * 0.11 }); } },
    vroom() { tone({ type: 'sawtooth', f0: 90, f1: 260, dur: 0.7, vol: 0.18, lp: 1100, vib: 18, vibRate: 30 }); tone({ type: 'sawtooth', f0: 180, f1: 520, dur: 0.7, vol: 0.06, lp: 1600 }); },
    quack() { [0, 0.2].forEach(at => tone({ type: 'sawtooth', f0: 560, f1: 380, dur: 0.13, vol: 0.16, lp: 1400, at })); },
    bubbles() { for (let i = 0; i < 8; i++) tone({ f0: r(500, 900), f1: r(1100, 1800), dur: 0.06, vol: 0.16, at: i * 0.06 + Math.random() * 0.03 }); },
    scrub() { noise({ type: 'bandpass', f0: r(1800, 2600), f1: r(3000, 4000), dur: 0.1, vol: 0.14, q: 3 }); tone({ type: 'triangle', f0: r(1200, 1500), f1: r(1700, 2100), dur: 0.08, vol: 0.06 }); },
    blow() { noise({ type: 'bandpass', f0: 500, f1: 1400, dur: 1.0, vol: 0.28, q: 0.8, a: 0.1 }); },
    splat() { noise({ type: 'lowpass', f0: 1400, f1: 200, dur: 0.25, vol: 0.4 }); tone({ f0: 240, f1: 90, dur: 0.18, vol: 0.3 }); },
    siren() { [0, 0.4, 0.8].forEach(at => { tone({ type: 'triangle', f0: 660, f1: 990, dur: 0.2, vol: 0.18, at }); tone({ type: 'triangle', f0: 990, f1: 660, dur: 0.2, vol: 0.18, at: at + 0.2 }); }); },
    weewoo() { [0, 0.5].forEach(at => { tone({ type: 'triangle', f0: 880, dur: 0.24, vol: 0.18, at }); tone({ type: 'triangle', f0: 660, dur: 0.24, vol: 0.18, at: at + 0.25 }); }); },
    clang() { [0, 0.3].forEach(at => { tone({ f0: 1760, dur: 0.4, vol: 0.18, at }); tone({ f0: 2640, dur: 0.25, vol: 0.07, at }); }); },
    hose() { noise({ type: 'highpass', f0: 2200, f1: 3800, dur: 0.3, vol: 0.14, a: 0.02 }); },
    rain() { for (let i = 0; i < 9; i++) tone({ f0: r(1500, 2600), f1: r(700, 1100), dur: 0.05, vol: 0.11, at: i * 0.08 + Math.random() * 0.05 }); },
  };

  /* ---------- music: a tiny looping tune, cheerful by day and a lullaby by night ---------- */
  const _ = null;
  const SONGS = {
    day: {
      dt: 0.27, wave: 'triangle', vol: 0.5,
      mel: [72, _, 76, _, 79, _, 76, _, 77, _, 76, 74, 72, _, _, _, 74, _, 77, _, 81, _, 79, 77, 76, _, 74, _, 72, _, _, _],
      bass: [48, 53, 55, 48],
    },
    night: {
      dt: 0.42, wave: 'sine', vol: 0.45,
      mel: [79, _, 76, _, 72, _, 76, _, 74, _, 72, _, 69, _, _, _, 72, _, 76, _, 79, _, 77, _, 76, _, 74, _, 72, _, _, _],
      bass: [48, 45, 41, 43],
    },
    wash: {
      dt: 0.24, wave: 'triangle', vol: 0.45,
      mel: [72, _, 72, 74, 76, _, 72, _, 77, _, 76, _, 74, _, _, _, 74, _, 74, 76, 77, _, 74, _, 79, _, 77, _, 76, _, _, _],
      bass: [48, 53, 55, 48],
    },
    spooky: {
      dt: 0.3, wave: 'triangle', vol: 0.42,
      mel: [69, _, 72, _, 76, _, 72, _, 75, _, 74, _, 72, _, _, _, 71, _, 74, _, 77, _, 74, _, 72, _, 71, _, 69, _, _, _],
      bass: [45, 41, 40, 45],
    },
  };
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  function schedule() {
    const song = SONGS[mood];
    while (nextTime < ctx.currentTime + 0.3) {
      const m = song.mel[step % song.mel.length];
      if (m != null) tone({ type: song.wave, f0: midi(m), dur: song.dt * 1.8, vol: song.vol, a: 0.02, abs: nextTime, out: musicBus });
      if (step % 4 === 0) {
        const b = song.bass[Math.floor(step / 8) % song.bass.length];
        tone({ type: 'sine', f0: midi(b), dur: song.dt * 3.5, vol: 0.7, a: 0.02, abs: nextTime, out: musicBus });
      }
      if (mood === 'spooky' && step % 4 === 2) tone({ type: 'square', f0: 330, f1: 300, dur: 0.05, vol: 0.12, lp: 1200, abs: nextTime, out: musicBus });
      if ((mood === 'day' || mood === 'wash') && step % 2 === 1) tone({ type: 'triangle', f0: 2093, dur: 0.04, vol: 0.06, abs: nextTime, out: musicBus });
      nextTime += song.dt;
      step = (step + 1) % 32;
    }
  }
  function startMusic() {
    if (!ctx || musicTimer) return;
    nextTime = ctx.currentTime + 0.15; step = 0;
    musicTimer = setInterval(schedule, 90);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

  return {
    init,
    play(name, ...args) { try { if (ctx && fx[name]) fx[name](...args); } catch (e) {} },
    setMusic(on) { musicEnabled = on; if (on) startMusic(); else stopMusic(); },
    setMood(m) { mood = m; },
    duck(on) { if (ctx) musicBus.gain.setTargetAtTime(on ? DUCK_VOL : MUSIC_VOL, ctx.currentTime, 0.08); },
  };
})();
