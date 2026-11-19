/* The app shell: a hub where each mini-game is a mascot to tap, plus everything the
 * games share (settings, voice, the grown-up panel, full screen, offline support).
 * A mini-game calls App.register({ id, screen, enter(), leave(), clear() }). */
const App = (() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const games = {};
  const hub = $('#hub'), home = $('#home');

  /* ---------- settings ---------- */
  const settings = { music: true, voice: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('froggy-settings') || '{}')); } catch (e) {}
  const saveSettings = () => { try { localStorage.setItem('froggy-settings', JSON.stringify(settings)); } catch (e) {} };

  /* ---------- voice: silly lines through the device's own text-to-speech ---------- */
  const Voice = {
    voice: null, last: 0,
    pickVoice() {
      if (!('speechSynthesis' in window)) return;
      const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
      const pref = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Google US English', 'Google UK English Female'];
      this.voice = pref.map(n => vs.find(v => v.name.includes(n))).find(Boolean) || vs.find(v => v.localService) || vs[0] || null;
    },
    say(text, opts) {
      if (!settings.voice || !('speechSynthesis' in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/[^\w\s!?,.'-]/g, ''));
        if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-US';
        u.pitch = (opts && opts.pitch) || 1.7;
        u.rate = (opts && opts.rate) || 1.05;
        u.onstart = () => Sound.duck(true);
        u.onend = u.onerror = () => Sound.duck(false);
        speechSynthesis.speak(u);
        this.last = performance.now();
      } catch (e) {}
    },
  };
  if ('speechSynthesis' in window) {
    Voice.pickVoice();
    speechSynthesis.onvoiceschanged = () => Voice.pickVoice();
  }

  /* ---------- switching between the hub and the games ---------- */
  const api = { settings, Voice, current: null, register, show, goFullscreen };
  function register(game) {
    games[game.id] = game;
    game.screen.hidden = true;
  }
  function show(id) {
    const prev = games[api.current];
    if (prev) { prev.leave && prev.leave(); prev.screen.hidden = true; }
    api.current = id || null;
    const g = games[id];
    hub.hidden = !!g;
    home.hidden = !g;
    if (g) { g.screen.hidden = false; g.enter && g.enter(); }
    else Sound.setMood('day');
  }

  let wentFull = false;
  document.addEventListener('pointerdown', e => {
    Sound.init();
    if (!wentFull && e.pointerType === 'touch') { wentFull = true; goFullscreen(); }
  }, true);

  const anim = (n, f, d) => n && n.animate && n.animate(f, { duration: d, easing: 'ease-out' });
  hub.addEventListener('pointerdown', e => {
    const tile = e.target.closest('[data-game]');
    if (!tile) return;
    const id = tile.dataset.game;
    anim(tile.querySelector('.tile-anim'), [{ transform: 'scale(1)' }, { transform: 'scale(.88,1.1)' }, { transform: 'scale(1.08,.94)' }, { transform: 'scale(1)' }], 450);
    if (games[id]) {
      Sound.play('boing');
      setTimeout(() => show(id), 380);
    } else {
      // not built yet: the mascot still reacts, so tapping is never a dead end
      Sound.play('sparkle');
      Voice.say(tile.dataset.soon || 'Coming soon!');
    }
  });
  home.addEventListener('pointerdown', e => { e.preventDefault(); Sound.play('pop'); show(null); });

  /* ---------- grown-up corner: hold top-left for 3 seconds ---------- */
  const lock = $('#lock'), panel = $('#parent');
  let holdTimer = 0, panelTimer = 0;
  lock.addEventListener('pointerdown', e => {
    e.preventDefault();
    lock.classList.add('holding');
    holdTimer = setTimeout(openPanel, 3000);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => lock.addEventListener(ev, () => { clearTimeout(holdTimer); lock.classList.remove('holding'); }));
  function refreshPanel() {
    panel.querySelector('[data-act=music]').textContent = 'Music: ' + (settings.music ? 'on' : 'off');
    panel.querySelector('[data-act=voice]').textContent = 'Voice: ' + (settings.voice ? 'on' : 'off');
  }
  function openPanel() {
    lock.classList.remove('holding');
    refreshPanel();
    panel.hidden = false;
    clearTimeout(panelTimer);
    panelTimer = setTimeout(() => { panel.hidden = true; }, 30000);
  }
  panel.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'music') { settings.music = !settings.music; Sound.setMusic(settings.music); }
    if (act === 'voice') settings.voice = !settings.voice;
    if (act === 'clear') Object.values(games).forEach(g => g.clear && g.clear());
    if (act === 'fs') goFullscreen();
    if (act === 'home') { show(null); panel.hidden = true; }
    if (act === 'close') panel.hidden = true;
    saveSettings(); refreshPanel();
  });
  Sound.setMusic(settings.music);

  function goFullscreen() {
    if (window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone) return;
    const d = document.documentElement;
    try {
      const req = d.requestFullscreen || d.webkitRequestFullscreen;
      if (req && !(document.fullscreenElement || document.webkitFullscreenElement)) {
        const r = req.call(d);
        if (r && r.then) r.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
      }
    } catch (e) {}
  }

  /* keep the page from zooming, scrolling or opening menus */
  ['contextmenu', 'gesturestart', 'gesturechange', 'dblclick', 'selectstart'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

  /* ---------- offline support ---------- */
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  return api;
})();
