/* Shared drawing and effects helpers for a mini-game's SVG screen.
 * const K = Kit(svgElement, { fx: <g>, bubbles: <g> }) */
const Kit = (svg, layer) => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function anim(node, frames, dur, opts) {
    if (!node || !node.animate) return null;
    return node.animate(frames, Object.assign({ duration: dur, easing: 'ease-out' }, opts || {}));
  }
  function toSvg(cx, cy) {
    const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function toClient(x, y) {
    const p = svg.createSVGPoint(); p.x = x; p.y = y;
    return p.matrixTransform(svg.getScreenCTM());
  }
  function visibleBox(margin) {
    const a = toSvg(0, 0), b = toSvg(window.innerWidth, window.innerHeight);
    return { x0: Math.max(a.x, 0) + margin, y0: Math.max(a.y, 0) + margin, x1: Math.min(b.x, 1600) - margin, y1: Math.min(b.y, 900) - margin };
  }
  function tween(ms, fn) {
    return new Promise(res => {
      const t0 = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - t0) / ms);
        fn(t);
        if (t < 1) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
  }
  function starPath(R, r, n = 5) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R, a = Math.PI * i / n - Math.PI / 2;
      d += (i ? 'L' : 'M') + (Math.cos(a) * rad).toFixed(1) + ' ' + (Math.sin(a) * rad).toFixed(1);
    }
    return d + 'Z';
  }
  const shapes = {
    star: r => starPath(r, r * 0.45),
    heart: r => `M0 ${r * 0.9} C${-r * 1.6} ${-r * 0.2} ${-r * 0.7} ${-r * 1.3} 0 ${-r * 0.45} C${r * 0.7} ${-r * 1.3} ${r * 1.6} ${-r * 0.2} 0 ${r * 0.9}Z`,
    drop: r => `M0 ${-r} Q${r * 0.8} 0 0 ${r * 0.6} Q${-r * 0.8} 0 0 ${-r}Z`,
    dot: r => `M${-r} 0 a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0Z`,
    bit: r => `M${-r} ${-r * 0.35} h${r * 2} v${r * 0.7} h${-r * 2}Z`,
  };

  function sparkles(x, y, o) {
    const { n = 10, colors = ['#ffd93b', '#fff'], spread = 130, size = 14, dur = 800, shape = 'star', up = 0 } = o || {};
    for (let i = 0; i < n; i++) {
      const g = el('g', { transform: `translate(${x},${y})` }, layer.fx);
      const p = el('path', { d: shapes[shape](size * rand(0.7, 1.2)), fill: pick(colors) }, g);
      const a = rand(0, Math.PI * 2), d = rand(spread * 0.4, spread);
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - up;
      const an = anim(p, [
        { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(1) rotate(${rand(-200, 200)}deg)`, opacity: 1, offset: 0.7 },
        { transform: `translate(${dx * 1.1}px,${dy * 1.1 + 30}px) scale(.2) rotate(${rand(-300, 300)}deg)`, opacity: 0 },
      ], dur * rand(0.8, 1.2), { easing: 'cubic-bezier(.2,.8,.3,1)' });
      if (an) an.onfinish = () => g.remove(); else setTimeout(() => g.remove(), dur);
    }
  }
  function rings(x, y, colors, o) {
    const { width = 7, scale = 9, gap = 70 } = o || {};
    colors.forEach((c, i) => {
      const g = el('g', { transform: `translate(${x},${y})` }, layer.fx);
      const ci = el('circle', { r: 20, fill: 'none', stroke: c, 'stroke-width': width }, g);
      const a = anim(ci, [{ transform: 'scale(.5)', opacity: 1 }, { transform: `scale(${scale})`, opacity: 0 }], 900, { delay: i * gap, fill: 'backwards' });
      if (a) a.onfinish = () => g.remove(); else setTimeout(() => g.remove(), 900);
    });
  }

  const bubbles = {};
  function bubble(key, x, y, text) {
    if (bubbles[key]) bubbles[key].remove();
    const g = el('g', { class: 'bubble' }, layer.bubbles);
    bubbles[key] = g;
    const inner = el('g', {}, g);
    const rect = el('rect', { y: -42, height: 84, rx: 42, fill: '#fff', stroke: '#333', 'stroke-width': 5 }, inner);
    el('path', { d: 'M-18 39 L0 72 L18 39', fill: '#fff', stroke: '#333', 'stroke-width': 5, 'stroke-linejoin': 'round' }, inner);
    el('path', { d: 'M-15 39 L15 39', stroke: '#fff', 'stroke-width': 7 }, inner);
    const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 42 }, inner);
    t.textContent = text;
    const w = Math.max(120, t.getComputedTextLength() + 64);
    rect.setAttribute('x', -w / 2); rect.setAttribute('width', w);
    const vb = visibleBox(10);
    const bx = clamp(x, vb.x0 + w / 2, vb.x1 - w / 2), by = clamp(y, vb.y0 + 45, vb.y1 - 80);
    g.setAttribute('transform', `translate(${bx},${by})`);
    anim(inner, [{ transform: 'scale(0)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], 300);
    setTimeout(() => {
      const a = anim(inner, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-20px)' }], 350, { fill: 'forwards' });
      const done = () => { g.remove(); if (bubbles[key] === g) delete bubbles[key]; };
      if (a) a.onfinish = done; else done();
    }, 2100);
  }
  function talk(key, x, y, text, voiceOpts) {
    bubble(key, x, y, text);
    App.Voice.say(text, voiceOpts);
  }

  return { NS, rand, pick, clamp, lerp, wait, el, anim, toSvg, toClient, visibleBox, tween, starPath, shapes, sparkles, rings, bubble, talk };
};
