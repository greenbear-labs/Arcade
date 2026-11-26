/* Lane Racer: a no-lose lane racing game for little drivers. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- cars
  var CARS = [
    { id: 'zoom',   name: 'Zoomer',  body: '#ff3b4e', dark: '#c81e33', accent: '#ffffff', style: 'sport',  num: '1' },
    { id: 'bolt',   name: 'Bolt',    body: '#2f7bff', dark: '#1a52c4', accent: '#ffd21f', style: 'formula', num: '7' },
    { id: 'sunny',  name: 'Sunny',   body: '#ffc21f', dark: '#e09400', accent: '#ff5aa5', style: 'buggy',  num: '3' },
    { id: 'leafy',  name: 'Leafy',   body: '#2fc95a', dark: '#1d8e3c', accent: '#ffffff', style: 'muscle', num: '5' },
    { id: 'rocket', name: 'Rocket',  body: '#a55cff', dark: '#7330d1', accent: '#4ef0ff', style: 'rocket', num: '9' },
    // unlockable: bought with coins banked by finishing races
    { id: 'police', name: 'Police',     body: '#ffffff', dark: '#1f2a44', accent: '#ffd21f', style: 'police',    sound: 'siren', price: 30 },
    { id: 'ambo',   name: 'Ambulance',  body: '#ffffff', dark: '#d9dde6', accent: '#ff3b4e', style: 'ambulance', sound: 'siren', price: 40 },
    { id: 'fire',   name: 'Fire Truck', body: '#ff3b2e', dark: '#c4221a', accent: '#ffffff', style: 'fire',      sound: 'wail',  price: 60 },
    { id: 'icecream', name: 'Ice Cream', body: '#ff9ccf', dark: '#e2659f', accent: '#ffffff', style: 'icecream', sound: 'jingle', price: 80 },
    { id: 'bus',    name: 'School Bus', body: '#ffc21f', dark: '#e09400', accent: '#222222', style: 'bus',       sound: 'bus',   price: 100 },
    { id: 'monster', name: 'Monster',   body: '#2fc95a', dark: '#1d8e3c', accent: '#ff7a1a', style: 'monster',   sound: 'vroom', price: 150, num: '8' }
  ];
  var SIREN_CARS = { police: 1, ambulance: 1, fire: 1 };

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // Draws a top-down car centred at (0,0), facing up, size w x h.
  // opts: { noShadow: true } skips the drop shadow, { siren: true } flashes the roof lights.
  function drawCar(c, car, w, h, t, opts) {
    t = t || 0; opts = opts || {};
    var hw = w / 2, hh = h / 2;
    // shadow
    if (!opts.noShadow) {
      c.fillStyle = 'rgba(0,0,0,.22)';
      rr(c, -hw * 0.95 + w * 0.06, -hh + h * 0.06, w * 0.95, h, w * 0.3); c.fill();
    }

    // wheels
    c.fillStyle = '#222';
    var ww = w * 0.22, wh = h * 0.2;
    var wx = car.style === 'formula' || car.style === 'buggy' ? hw * 0.98 : car.style === 'monster' ? hw * 0.9 : hw * 0.82;
    var wheels = car.style === 'bus' || car.style === 'fire' ? [[-1, -0.6], [1, -0.6], [-1, 0.42], [1, 0.42], [-1, 0.7], [1, 0.7]] : [[-1, -0.55], [1, -0.55], [-1, 0.55], [1, 0.55]];
    wheels.forEach(function (p) {
      var big = car.style === 'buggy' || (car.style === 'formula' && p[1] > 0);
      var ew = big ? ww * 1.25 : ww, eh = big ? wh * 1.2 : wh;
      if (car.style === 'monster') { ew = ww * 1.6; eh = wh * 1.45; }
      else if (wheels.length > 4) eh = wh * 0.8;
      rr(c, p[0] * wx - ew / 2, p[1] * hh - eh / 2, ew, eh, ew * 0.35); c.fill();
      if (car.style === 'monster') {
        c.fillStyle = '#444';
        for (var tr = -2; tr <= 2; tr++) c.fillRect(p[0] * wx - ew / 2, p[1] * hh + tr * eh * 0.18 - eh * 0.04, ew, eh * 0.08);
        c.fillStyle = '#222';
      }
    });
    c.fillStyle = '#666';
    wheels.forEach(function (p) {
      rr(c, p[0] * wx - ww * 0.2, p[1] * hh - wh * 0.3, ww * 0.4, wh * (wheels.length > 4 ? 0.45 : 0.6), 2); c.fill();
    });

    c.lineWidth = Math.max(2, w * 0.04);
    c.strokeStyle = car.dark;

    if (SPECIAL_STYLES[car.style]) {
      drawSpecial(c, car, w, h, t, opts);
    } else if (car.style === 'formula') {
      // nose + front wing
      c.fillStyle = car.accent; rr(c, -hw * 0.95, -hh, w * 0.95, h * 0.09, 4); c.fill();
      c.fillStyle = car.body;
      c.beginPath();
      c.moveTo(-w * 0.12, -hh * 0.92); c.lineTo(w * 0.12, -hh * 0.92);
      c.lineTo(w * 0.32, hh * 0.1); c.lineTo(w * 0.34, hh * 0.75);
      c.lineTo(-w * 0.34, hh * 0.75); c.lineTo(-w * 0.32, hh * 0.1); c.closePath();
      c.fill(); c.stroke();
      // side pods
      rr(c, -w * 0.46, -hh * 0.05, w * 0.92, h * 0.38, w * 0.12); c.fill(); c.stroke();
      // rear wing
      c.fillStyle = car.accent; rr(c, -hw, hh * 0.78, w, h * 0.12, 4); c.fill();
      // cockpit + helmet
      c.fillStyle = '#222'; rr(c, -w * 0.13, -hh * 0.2, w * 0.26, h * 0.3, w * 0.1); c.fill();
      c.fillStyle = car.accent; c.beginPath(); c.arc(0, -hh * 0.05, w * 0.1, 0, 7); c.fill();
    } else if (car.style === 'buggy') {
      c.fillStyle = car.body;
      rr(c, -hw * 0.78, -hh * 0.88, w * 0.78, h * 0.88, w * 0.3); c.fill(); c.stroke();
      // roll cage
      c.strokeStyle = '#333'; c.lineWidth = w * 0.06;
      rr(c, -w * 0.3, -hh * 0.25, w * 0.6, h * 0.42, w * 0.08); c.stroke();
      c.beginPath(); c.moveTo(-w * 0.3, 0); c.lineTo(w * 0.3, 0); c.stroke();
      // seat + driver
      c.fillStyle = car.accent; c.beginPath(); c.arc(0, -hh * 0.08, w * 0.13, 0, 7); c.fill();
      // spots
      c.fillStyle = car.accent;
      c.beginPath(); c.arc(-w * 0.2, -hh * 0.6, w * 0.07, 0, 7); c.fill();
      c.beginPath(); c.arc(w * 0.2, -hh * 0.6, w * 0.07, 0, 7); c.fill();
      c.beginPath(); c.arc(0, hh * 0.6, w * 0.09, 0, 7); c.fill();
    } else {
      // sport / muscle / rocket share a body
      var bw = car.style === 'muscle' ? w * 0.9 : w * 0.82;
      c.fillStyle = car.body;
      if (car.style === 'rocket') {
        c.beginPath();
        c.moveTo(0, -hh);
        c.quadraticCurveTo(bw / 2, -hh * 0.75, bw / 2, -hh * 0.1);
        c.lineTo(bw / 2, hh * 0.92); c.lineTo(-bw / 2, hh * 0.92);
        c.lineTo(-bw / 2, -hh * 0.1);
        c.quadraticCurveTo(-bw / 2, -hh * 0.75, 0, -hh);
        c.closePath(); c.fill(); c.stroke();
        // fins
        c.fillStyle = car.dark;
        c.beginPath(); c.moveTo(-bw / 2, hh * 0.4); c.lineTo(-hw * 1.05, hh); c.lineTo(-bw / 2, hh * 0.92); c.fill();
        c.beginPath(); c.moveTo(bw / 2, hh * 0.4); c.lineTo(hw * 1.05, hh); c.lineTo(bw / 2, hh * 0.92); c.fill();
      } else {
        rr(c, -bw / 2, -hh * 0.96, bw, h * 0.94, w * (car.style === 'sport' ? 0.36 : 0.18)); c.fill(); c.stroke();
      }
      // stripes
      c.fillStyle = car.accent;
      if (car.style === 'muscle') {
        c.fillRect(-w * 0.16, -hh * 0.94, w * 0.1, h * 0.92);
        c.fillRect(w * 0.06, -hh * 0.94, w * 0.1, h * 0.92);
      } else if (car.style === 'sport') {
        c.fillRect(-w * 0.06, -hh * 0.94, w * 0.12, h * 0.92);
      } else {
        c.beginPath(); c.arc(0, -hh * 0.55, w * 0.1, 0, 7); c.fill();
      }
      // windscreen
      c.fillStyle = '#9fe4ff';
      c.beginPath();
      c.moveTo(-bw * 0.4, -hh * 0.3); c.lineTo(bw * 0.4, -hh * 0.3);
      c.lineTo(bw * 0.32, -hh * 0.02); c.lineTo(-bw * 0.32, -hh * 0.02); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)';
      c.fillRect(-bw * 0.28, -hh * 0.25, bw * 0.12, hh * 0.08);
      // roof
      c.fillStyle = car.dark; rr(c, -bw * 0.34, -hh * 0.02, bw * 0.68, h * 0.28, w * 0.1); c.fill();
      // number circle
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, hh * 0.12, w * 0.15, 0, 7); c.fill();
      c.fillStyle = car.dark;
      c.font = '900 ' + Math.round(w * 0.22) + 'px system-ui, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(car.num, 0, hh * 0.13);
      // spoiler
      if (car.style !== 'rocket') { c.fillStyle = car.dark; rr(c, -bw / 2 - 2, hh * 0.78, bw + 4, h * 0.1, 4); c.fill(); }
      // headlights
      c.fillStyle = '#fff6a0';
      c.beginPath(); c.arc(-bw * 0.3, -hh * 0.86, w * 0.06, 0, 7); c.fill();
      c.beginPath(); c.arc(bw * 0.3, -hh * 0.86, w * 0.06, 0, 7); c.fill();
    }
  }

  // ---------------------------------------------------------------- special vehicles
  var SPECIAL_STYLES = { police: 1, ambulance: 1, fire: 1, icecream: 1, bus: 1, monster: 1 };

  function windscreen(c, bw, y0, y1) {
    c.fillStyle = '#9fe4ff';
    c.beginPath();
    c.moveTo(-bw * 0.4, y0); c.lineTo(bw * 0.4, y0);
    c.lineTo(bw * 0.34, y1); c.lineTo(-bw * 0.34, y1); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)';
    c.fillRect(-bw * 0.3, y0 + (y1 - y0) * 0.2, bw * 0.12, (y1 - y0) * 0.28);
  }
  function headlights(c, bw, y, r) {
    c.fillStyle = '#fff6a0';
    c.beginPath(); c.arc(-bw * 0.32, y, r, 0, 7); c.fill();
    c.beginPath(); c.arc(bw * 0.32, y, r, 0, 7); c.fill();
  }
  // A light bar centred at (0, y). Flashes left/right when on; draws a glow on top.
  function lightBar(c, w, y, cols, on, t) {
    var lw = w * 0.62, lh = w * 0.16, phase = Math.floor(t * 7) % 2;
    c.fillStyle = '#333'; rr(c, -lw / 2 - 2, y - lh / 2 - 2, lw + 4, lh + 4, lh * 0.4); c.fill();
    for (var i = 0; i < 2; i++) {
      var bright = on && phase === i;
      c.fillStyle = cols[i];
      c.globalAlpha = on ? (bright ? 1 : 0.45) : 0.75;
      rr(c, i ? 2 : -lw / 2, y - lh / 2, lw / 2 - 2, lh, lh * 0.35); c.fill();
      c.globalAlpha = 1;
      if (bright) {
        var gx = (i ? 1 : -1) * lw * 0.25, gr = w * 0.95;
        var g = c.createRadialGradient(gx, y, 0, gx, y, gr);
        g.addColorStop(0, cols[i]); g.addColorStop(0.25, cols[i] === '#2f7bff' ? 'rgba(47,123,255,.6)' : cols[i] === '#ffffff' ? 'rgba(255,255,255,.6)' : 'rgba(255,59,78,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.beginPath(); c.arc(gx, y, gr, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(gx, y, lh * 0.3, 0, 7); c.fill();
      }
    }
  }

  function drawSpecial(c, car, w, h, t, opts) {
    var hw = w / 2, hh = h / 2, bw, on = !!opts.siren;
    if (car.style === 'police') {
      bw = w * 0.84;
      c.fillStyle = car.body; rr(c, -bw / 2, -hh * 0.96, bw, h * 0.94, w * 0.3); c.fill(); c.stroke();
      c.save(); rr(c, -bw / 2, -hh * 0.96, bw, h * 0.94, w * 0.3); c.clip();
      c.fillStyle = car.dark; c.fillRect(-bw, -hh, bw * 2, h * 0.24); c.fillRect(-bw, hh * 0.62, bw * 2, h * 0.3);
      c.restore();
      c.fillStyle = car.accent; c.save(); c.translate(0, -hh * 0.66); starPath(c, w * 0.14, w * 0.06, 5); c.fill(); c.restore();
      windscreen(c, bw, -hh * 0.44, -hh * 0.16);
      c.fillStyle = '#f0f2f6'; rr(c, -bw * 0.36, -hh * 0.16, bw * 0.72, h * 0.34, w * 0.1); c.fill();
      c.fillStyle = '#9fe4ff'; rr(c, -bw * 0.3, hh * 0.26, bw * 0.6, h * 0.08, 4); c.fill();
      headlights(c, bw, -hh * 0.86, w * 0.06);
      lightBar(c, w, -hh * 0.02, ['#ff3b4e', '#2f7bff'], on, t);
    } else if (car.style === 'ambulance') {
      bw = w * 0.9;
      c.fillStyle = car.body; rr(c, -bw / 2, -hh * 0.96, bw, h * 0.94, w * 0.16); c.fill();
      c.strokeStyle = '#c5cad4'; c.stroke();
      c.fillStyle = car.accent; c.fillRect(-bw / 2 + 2, -hh * 0.5, w * 0.08, h * 0.7); c.fillRect(bw / 2 - 2 - w * 0.08, -hh * 0.5, w * 0.08, h * 0.7);
      windscreen(c, bw, -hh * 0.8, -hh * 0.56);
      c.fillStyle = car.dark; rr(c, -bw * 0.38, -hh * 0.54, bw * 0.76, h * 0.06, 4); c.fill();
      // red cross on the roof
      c.fillStyle = car.accent;
      var cs = w * 0.13; c.fillRect(-cs / 2, hh * 0.22 - cs * 1.5, cs, cs * 3); c.fillRect(-cs * 1.5, hh * 0.22 - cs / 2, cs * 3, cs);
      headlights(c, bw, -hh * 0.9, w * 0.06);
      lightBar(c, w, -hh * 0.4, ['#ff3b4e', '#2f7bff'], on, t);
    } else if (car.style === 'fire') {
      bw = w * 0.9;
      c.fillStyle = car.body; rr(c, -bw / 2, -hh * 0.98, bw, h * 0.98, w * 0.14); c.fill(); c.stroke();
      windscreen(c, bw, -hh * 0.84, -hh * 0.62);
      c.fillStyle = car.dark; rr(c, -bw * 0.4, -hh * 0.62, bw * 0.8, h * 0.12, 5); c.fill();
      // ladder
      c.fillStyle = '#d8dde6';
      var lx = w * 0.2, ly0 = -hh * 0.3, ly1 = hh * 0.92;
      c.fillRect(-lx - w * 0.04, ly0, w * 0.08, ly1 - ly0); c.fillRect(lx - w * 0.04, ly0, w * 0.08, ly1 - ly0);
      for (var y = ly0 + h * 0.04; y < ly1; y += h * 0.08) c.fillRect(-lx, y, lx * 2, w * 0.04);
      c.fillStyle = car.accent; c.fillRect(-bw / 2 + 2, -hh * 0.3, w * 0.05, h * 0.6); c.fillRect(bw / 2 - 2 - w * 0.05, -hh * 0.3, w * 0.05, h * 0.6);
      c.fillStyle = '#ffd21f'; c.beginPath(); c.arc(0, hh * 0.15, w * 0.1, 0, 7); c.fill();
      c.fillStyle = car.body; c.beginPath(); c.arc(0, hh * 0.15, w * 0.05, 0, 7); c.fill();
      headlights(c, bw, -hh * 0.92, w * 0.06);
      lightBar(c, w, -hh * 0.46, ['#ff3b4e', '#ffffff'], on, t);
    } else if (car.style === 'icecream') {
      bw = w * 0.88;
      c.fillStyle = car.body; rr(c, -bw / 2, -hh * 0.96, bw, h * 0.94, w * 0.18); c.fill(); c.stroke();
      // striped awning roof
      c.save(); rr(c, -bw * 0.44, -hh * 0.4, bw * 0.88, h * 0.62, w * 0.1); c.clip();
      for (var k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#ffffff' : '#8fe3ff'; c.fillRect(-bw / 2 + k * bw / 8, -hh * 0.4, bw / 8 + 1, h * 0.62); }
      c.restore();
      windscreen(c, bw, -hh * 0.82, -hh * 0.56);
      // big cone on top
      c.save(); c.translate(0, hh * 0.05);
      c.fillStyle = '#e0a458'; c.beginPath(); c.moveTo(-w * 0.15, -h * 0.02); c.lineTo(w * 0.15, -h * 0.02); c.lineTo(0, h * 0.2); c.closePath(); c.fill();
      c.strokeStyle = '#b97a35'; c.lineWidth = Math.max(1, w * 0.02);
      c.beginPath(); c.moveTo(-w * 0.08, 0); c.lineTo(w * 0.04, h * 0.12); c.moveTo(w * 0.08, 0); c.lineTo(-w * 0.04, h * 0.12); c.stroke();
      c.fillStyle = '#ff5aa5'; c.beginPath(); c.arc(0, -h * 0.04, w * 0.18, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-w * 0.06, -h * 0.07, w * 0.06, 0, 7); c.fill();
      c.fillStyle = '#ff3b4e'; c.beginPath(); c.arc(w * 0.04, -h * 0.12, w * 0.05, 0, 7); c.fill();
      c.restore();
      headlights(c, bw, -hh * 0.88, w * 0.06);
      if (on) { // little music notes float off the roof
        c.fillStyle = '#ffffff';
        for (var n = 0; n < 3; n++) { var nt = (t * 1.5 + n / 3) % 1; c.save(); c.globalAlpha = 1 - nt; c.translate((n - 1) * w * 0.4, hh * 0.2 - nt * h * 0.6); c.beginPath(); c.ellipse(0, 0, w * 0.07, w * 0.05, -0.4, 0, 7); c.fill(); c.fillRect(w * 0.05, -w * 0.22, w * 0.025, w * 0.22); c.restore(); }
      }
    } else if (car.style === 'bus') {
      bw = w * 0.92;
      c.fillStyle = car.body; rr(c, -bw / 2, -hh * 0.98, bw, h * 0.98, w * 0.12); c.fill(); c.stroke();
      windscreen(c, bw, -hh * 0.9, -hh * 0.7);
      c.fillStyle = '#ffffff'; rr(c, -bw * 0.4, -hh * 0.66, bw * 0.8, h * 0.78, w * 0.08); c.fill();
      c.fillStyle = car.accent;
      c.fillRect(-bw / 2 + 1, -hh * 0.6, w * 0.05, h * 0.72); c.fillRect(bw / 2 - 1 - w * 0.05, -hh * 0.6, w * 0.05, h * 0.72);
      c.fillStyle = '#d6dbe3'; [-0.4, 0.1, 0.55].forEach(function (q) { rr(c, -w * 0.14, hh * q - h * 0.04, w * 0.28, h * 0.08, 3); c.fill(); });
      c.fillStyle = '#ff3b4e'; c.beginPath(); c.arc(-bw / 2 - w * 0.02, -hh * 0.55, w * 0.07, 0, 7); c.fill();
      headlights(c, bw, -hh * 0.94, w * 0.05);
      if (on) { c.fillStyle = Math.floor(t * 6) % 2 ? '#ff3b4e' : '#ffd21f'; c.beginPath(); c.arc(-bw * 0.3, hh * 0.9, w * 0.07, 0, 7); c.arc(bw * 0.3, hh * 0.9, w * 0.07, 0, 7); c.fill(); }
    } else if (car.style === 'monster') {
      bw = w * 0.66;
      c.fillStyle = car.body; rr(c, -bw / 2, -hh * 0.9, bw, h * 0.86, w * 0.2); c.fill(); c.stroke();
      // flames on the hood
      c.fillStyle = car.accent;
      c.beginPath(); c.moveTo(-bw * 0.4, -hh * 0.35);
      for (var f = 0; f < 4; f++) { var fx = -bw * 0.4 + f * bw * 0.2; c.quadraticCurveTo(fx + bw * 0.05, -hh * 0.75, fx + bw * 0.2, -hh * 0.35); }
      c.closePath(); c.fill();
      windscreen(c, bw, -hh * 0.3, -hh * 0.06);
      c.fillStyle = car.dark; rr(c, -bw * 0.34, -hh * 0.06, bw * 0.68, h * 0.3, w * 0.08); c.fill();
      c.strokeStyle = '#333'; c.lineWidth = w * 0.05; c.beginPath(); c.moveTo(-bw * 0.42, hh * 0.05); c.lineTo(bw * 0.42, hh * 0.05); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, hh * 0.5, w * 0.13, 0, 7); c.fill();
      c.fillStyle = car.dark; c.font = '900 ' + Math.round(w * 0.18) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(car.num || '8', 0, hh * 0.51);
      headlights(c, bw, -hh * 0.82, w * 0.055);
      if (on) { // exhaust puffs
        c.fillStyle = 'rgba(120,120,120,.6)';
        for (var e = 0; e < 3; e++) { var et = (t * 2 + e / 3) % 1; c.globalAlpha = 1 - et; c.beginPath(); c.arc((e - 1) * w * 0.15, hh + et * h * 0.35, w * (0.07 + et * 0.12), 0, 7); c.fill(); }
        c.globalAlpha = 1;
      }
    }
  }

  // ---------------------------------------------------------------- audio
  var Audio = (function () {
    var ctx = null, master = null, musicGain = null, on = true, musicTimer = null, nextNote = 0, step = 0;
    try { on = localStorage.getItem('lr-sound') !== 'off'; } catch (e) {}
    function ensure() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = on ? 0.7 : 0; master.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    var quiet = false, key = 1;
    function tone(freq, dur, type, vol, when, slideTo, dest) {
      if (!ctx || (quiet && dest !== musicGain)) return;
      var t = (when || ctx.currentTime);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || master);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(dur, vol, filterFreq) {
      if (!ctx || quiet) return;
      var len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = buf; f.type = 'lowpass'; f.frequency.value = filterFreq || 1200; g.gain.value = vol || 0.3;
      s.connect(f); f.connect(g); g.connect(master); s.start();
    }
    // cheerful major-pentatonic loop
    var MEL = [0, 4, 7, 9, 7, 4, 2, 4, 0, 2, 4, 7, 9, 12, 9, 7];
    var BASS = [0, 0, 5, 5, 7, 7, 5, 5];
    function schedule() {
      if (!ctx) return;
      while (nextNote < ctx.currentTime + 0.3) {
        var beat = 0.2;
        if (step % 2 === 0 || Math.random() < 0.5) tone(523.25 * key * Math.pow(2, MEL[step % 16] / 12), 0.18, 'triangle', 0.5, nextNote, null, musicGain);
        if (step % 2 === 0) tone(130.8 * key * Math.pow(2, BASS[(step / 2) % 8] / 12), 0.35, 'sine', 0.7, nextNote, null, musicGain);
        nextNote += beat; step++;
      }
    }
    return {
      unlock: function () { ensure(); },
      isOn: function () { return on; },
      toggle: function () {
        on = !on;
        try { localStorage.setItem('lr-sound', on ? 'on' : 'off'); } catch (e) {}
        if (ensure()) master.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.05);
        return on;
      },
      setQuiet: function (q) { quiet = q; },
      startMusic: function (shift) {
        key = Math.pow(2, (shift || 0) / 12);
        if (!ensure() || musicTimer) return;
        nextNote = ctx.currentTime + 0.1; step = 0;
        musicTimer = setInterval(schedule, 100);
      },
      stopMusic: function () { clearInterval(musicTimer); musicTimer = null; },
      suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend(); },
      resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume(); },
      swoosh: function () { noise(0.15, 0.12, 2500); },
      coin: function () { if (!ctx) return; var t = ctx.currentTime; tone(988, 0.08, 'square', 0.12, t); tone(1319, 0.25, 'square', 0.12, t + 0.07); },
      bump: function () { if (!ctx) return; tone(300, 0.35, 'sine', 0.5, null, 90); noise(0.12, 0.2, 600); },
      boing: function () { if (!ctx) return; tone(200, 0.4, 'triangle', 0.4, null, 600); },
      pow: function () { if (!ctx) return; noise(0.2, 0.35, 3000); tone(660, 0.2, 'square', 0.12, null, 1320); },
      power: function () { if (!ctx) return; var t = ctx.currentTime; [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.3, t + i * 0.07); }); },
      honk: function () { if (!ctx) return; var t = ctx.currentTime; tone(440, 0.14, 'square', 0.15, t); tone(554, 0.14, 'square', 0.15, t); tone(440, 0.2, 'square', 0.15, t + 0.18); tone(554, 0.2, 'square', 0.15, t + 0.18); },
      fanfare: function () { if (!ctx) return; var t = ctx.currentTime; [523, 659, 784, 659, 784, 1047].forEach(function (f, i) { tone(f, i === 5 ? 0.6 : 0.16, 'square', 0.14, t + i * 0.13); tone(f / 2, 0.16, 'triangle', 0.2, t + i * 0.13); }); },
      splat: function () { if (!ctx) return; noise(0.35, 0.5, 500); tone(180, 0.3, 'sine', 0.5, null, 50); tone(500, 0.15, 'triangle', 0.2, ctx.currentTime + 0.12, 900); },
      pop: function () { if (!ctx) return; tone(900, 0.12, 'sine', 0.35, null, 250); },
      // vehicle horns: what a car does when you tap it
      siren: function () { if (!ctx) return; var t = ctx.currentTime; for (var i = 0; i < 6; i++) tone(i % 2 ? 740 : 988, 0.3, 'triangle', 0.2, t + i * 0.32); },
      wail: function () { if (!ctx) return; var t = ctx.currentTime; tone(500, 0.9, 'sawtooth', 0.07, t, 1100); tone(1100, 0.9, 'sawtooth', 0.07, t + 0.9, 500); tone(500, 0.9, 'triangle', 0.18, t, 1100); tone(1100, 0.9, 'triangle', 0.18, t + 0.9, 500); },
      jingle: function () { if (!ctx) return; var t = ctx.currentTime; [784, 659, 784, 880, 784, 659, 523, 659, 784].forEach(function (f, i) { tone(f, 0.16, 'sine', 0.3, t + i * 0.17); tone(f * 2, 0.08, 'sine', 0.06, t + i * 0.17); }); },
      bus: function () { if (!ctx) return; var t = ctx.currentTime; [0, 0.3].forEach(function (d) { tone(330, 0.22, 'square', 0.14, t + d); tone(415, 0.22, 'square', 0.12, t + d); }); },
      vroom: function () { if (!ctx) return; var t = ctx.currentTime; tone(70, 0.5, 'sawtooth', 0.3, t, 140); tone(140, 0.6, 'sawtooth', 0.25, t + 0.45, 60); noise(0.9, 0.2, 400); },
      cash: function () { if (!ctx) return; var t = ctx.currentTime; [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.22, 'square', 0.1, t + i * 0.08); }); tone(2093, 0.5, 'sine', 0.2, t + 0.34); },
      tick: function () { if (!ctx) return; tone(1319, 0.06, 'square', 0.06); },
      nope: function () { if (!ctx) return; var t = ctx.currentTime; tone(330, 0.15, 'triangle', 0.3, t); tone(262, 0.25, 'triangle', 0.3, t + 0.15); },
      jump: function () { if (!ctx) return; tone(250, 0.45, 'triangle', 0.4, null, 900); noise(0.2, 0.12, 2000); },
      land: function () { if (!ctx) return; noise(0.18, 0.3, 500); tone(160, 0.2, 'sine', 0.4, null, 70); }
    };
  })();

  // ---------------------------------------------------------------- piggy bank
  // Coins picked up in a race are banked when you cross the finish line (plus a finishing bonus).
  // Banked coins buy locked cars and places. Everything is saved on the device.
  var FINISH_BONUS = 10;
  var Bank = (function () {
    var coins = 0, owned = {};
    try {
      coins = Math.max(0, parseInt(localStorage.getItem('lr-bank'), 10) || 0);
      (JSON.parse(localStorage.getItem('lr-owned') || '[]') || []).forEach(function (id) { owned[id] = true; });
    } catch (e) {}
    function save() {
      try {
        localStorage.setItem('lr-bank', String(coins));
        localStorage.setItem('lr-owned', JSON.stringify(Object.keys(owned)));
      } catch (e) {}
    }
    return {
      coins: function () { return coins; },
      add: function (n) { coins += n; save(); },
      has: function (item) { return !item.price || !!owned[item.id]; },
      canBuy: function (item) { return !this.has(item) && coins >= item.price; },
      buy: function (item) {
        if (!this.canBuy(item)) return false;
        coins -= item.price; owned[item.id] = true; save(); return true;
      }
    };
  })();

  // ---------------------------------------------------------------- setup
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var LANES = 3, road = { x: 0, w: 0 }, laneW = 0, carW = 0, carH = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    road.w = Math.min(W * 0.8, H * 0.78, 760);
    road.x = (W - road.w) / 2;
    laneW = road.w / LANES;
    carW = laneW * 0.52; carH = carW * 1.75;
    if (state && state.player) { state.player.baseY = H - carH * 0.9 - Math.max(30, H * 0.06); state.player.y = state.player.baseY + state.player.yOff; }
  }

  function laneX(i) { return road.x + laneW * (i + 0.5); }

  // ---------------------------------------------------------------- locations
  var THEMES = [
    { id: 'speedway', name: 'Speedway', music: 0,
      grass: '#5ccf6a', grass2: '#52c060', road: '#4a4f5c', kerb: ['#ff3b4e', '#fff'], lines: 'dash',
      decor: ['tree', 'tree', 'bush', 'flower', 'flower', 'rock', 'tree2'],
      obstacles: ['cone', 'cone', 'crate', 'tires', 'puddle', 'rock', 'barrier'] },
    { id: 'mud', name: 'Muddy Trail', music: -3,
      grass: '#93c24c', grass2: '#86b643', road: '#b07c45', edge: '#7a5230', lines: 'ruts',
      decor: ['hay', 'tree', 'bush', 'sunflower', 'tree', 'fence', 'fence'],
      obstacles: ['mud', 'mud', 'mud', 'log', 'rock', 'bale'] },
    { id: 'snow', name: 'Snowy Peaks', music: 2,
      grass: '#f4f9ff', grass2: '#e7f0fb', road: '#7b8ca6', kerb: ['#2f7bff', '#fff'], lines: 'dash', weather: 'snow',
      decor: ['pine', 'pine', 'pine', 'snowrock', 'snowman'],
      obstacles: ['snowman', 'ice', 'snowball', 'cone', 'snowball'] },
    { id: 'beach', name: 'Sunny Beach', music: 5,
      grass: '#ffe3a1', grass2: '#ffda8c', road: '#59606f', kerb: ['#ffc21f', '#fff'], lines: 'dash', sea: true,
      decor: ['palm', 'palm', 'umbrella', 'shell', 'starfish'],
      obstacles: ['sandcastle', 'ball', 'crab', 'puddle', 'crate'] },
    // unlockable places (jumps: ramps appear on the road)
    { id: 'city', name: 'Busy City', music: 3, price: 40,
      grass: '#c9ced8', grass2: '#bfc5d0', road: '#3d424d', kerb: ['#ffd21f', '#3d424d'], lines: 'dash',
      decor: ['building', 'building', 'building', 'lamp', 'hydrant', 'tree'],
      obstacles: ['cone', 'cone', 'barrier', 'trash', 'puddle'] },
    { id: 'desert', name: 'Desert Jumps', music: -2, price: 60, jumps: true,
      grass: '#f2c27a', grass2: '#ebb86d', road: '#d39a57', edge: '#a8713a', lines: 'ruts',
      decor: ['cactus', 'cactus', 'mesa', 'tumbleweed', 'desertrock'],
      obstacles: ['cactus', 'rock', 'tumbleweed', 'bale'] },
    { id: 'jungle', name: 'Jungle Jumps', music: 4, price: 90, jumps: true,
      grass: '#2f9e48', grass2: '#2a9142', road: '#9a7444', edge: '#6b4f2a', lines: 'ruts',
      decor: ['bigleaf', 'bigleaf', 'tree', 'palm', 'flower', 'bush'],
      obstacles: ['log', 'mud', 'rock', 'coconut'] },
    { id: 'moon', name: 'Moon Jumps', music: 7, price: 120, jumps: true, floaty: true,
      grass: '#3a3f63', grass2: '#353a5b', road: '#9096ad', kerb: ['#4ef0ff', '#2a2f4a'], lines: 'dash',
      decor: ['crater', 'crater', 'twinkle', 'twinkle', 'planet', 'alien', 'moonrock'],
      obstacles: ['moonrock', 'crater', 'satellite', 'moonrock'] }
  ];
  var FLAT = { puddle: 1, mud: 1, ice: 1, crater: 1 };

  // ---------------------------------------------------------------- state
  var state = null;
  var RACE_SECONDS = 60; // length of a race at normal speed

  function newGame(car, theme, demo) {
    state = {
      car: car, theme: theme, demo: !!demo, splats: [], aiT: 0,
      t: 0, dist: 0,
      baseSpeed: 0, speedMul: 1,
      player: { lane: 1, x: laneX(1), y: 0, baseY: 0, yOff: 0, tilt: 0, bump: 0, spin: 0, air: 0, airLen: 0,
        free: false, fx: 0, drag: false, dragY: 0 },
      horn: 0,
      things: [], decor: [], parts: [], floaters: [],
      nextSpawn: 0, nextDecor: 0, dashOff: 0,
      coins: 0, raceLen: demo ? Infinity : H * 0.6 * RACE_SECONDS, finishSpawned: false, finished: false, finishT: 0,
      star: 0, boost: 0, shield: false, magnet: 0,
      celebrate: 0
    };
    resize();
    state.player.x = laneX(1);
    // pre-fill scenery
    for (var y = -100; y < H + 100; y += 70) addDecor(y);
    state.nextSpawn = H * 0.5;
    lastPct = -1;
    if (!demo) { updateHud(); updateProgress(); paintProgCar(); }
  }

  // ---------------------------------------------------------------- spawning
  var POWERS = ['star', 'boost', 'shield', 'magnet'];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function spawnRow() {
    var r = Math.random();
    var y = -carH;
    if (state.theme.jumps && Math.random() < 0.28) {
      // a ramp, with coins up in the air and something to fly right over
      var jl = Math.floor(Math.random() * 3);
      addThing('ramp', 'ramp', jl, y);
      for (var j = 1; j <= 3; j++) addThing('coin', 'coin', jl, y - carH * (0.5 + j * 0.45));
      if (Math.random() < 0.7) addThing('obstacle', pick(state.theme.obstacles), jl, y - carH * 1.2);
      return;
    }
    if (r < 0.45) {
      // obstacles in 1 (sometimes 2) lanes, never all three
      var lanes = [0, 1, 2].sort(function () { return Math.random() - 0.5; });
      var n = Math.random() < 0.25 ? 2 : 1;
      for (var i = 0; i < n; i++) addThing('obstacle', pick(state.theme.obstacles), lanes[i], y);
      // a coin in a free lane as a reward for dodging
      if (Math.random() < 0.6) addThing('coin', 'coin', lanes[2], y);
    } else if (r < 0.85) {
      // a line of coins, sometimes snaking between lanes
      var lane = Math.floor(Math.random() * 3), snake = Math.random() < 0.4;
      for (var k = 0; k < 5; k++) {
        addThing('coin', 'coin', lane, y - k * carH * 0.55);
        if (snake && k === 2) lane = Math.max(0, Math.min(2, lane + (Math.random() < 0.5 ? -1 : 1)));
      }
    } else {
      addThing('power', pick(POWERS), Math.floor(Math.random() * 3), y);
    }
  }

  function addThing(kind, type, lane, y) {
    var s = kind === 'ramp' ? laneW * 0.78 : kind === 'coin' ? carW * 0.55 : kind === 'power' ? carW * 0.85 : carW * (type === 'barrier' || type === 'log' ? 1.15 : FLAT[type] ? 1.1 : 0.9);
    state.things.push({ kind: kind, type: type, lane: lane, x: laneX(lane), y: y, s: s, hit: false, vx: 0, vy: 0, rot: 0, vr: 0, alpha: 1, wob: Math.random() * 6 });
  }

  function addDecor(y) {
    var th = state.theme;
    var side = th.sea || Math.random() < 0.5 ? -1 : 1;
    var margin = road.x;
    if (margin < 20) return;
    var type = pick(th.decor);
    var gap = type === 'building' ? 55 : 25;
    if (margin < gap + 15) { if (type === 'building') return; gap = 25; }
    var x = type === 'fence' ? (side < 0 ? road.x - 22 : road.x + road.w + 22)
      : side < 0 ? rand(10, margin - gap) : rand(road.x + road.w + gap, W - 10);
    state.decor.push({ type: type, x: x, y: y, s: rand(0.8, 1.3), hue: Math.floor(Math.random() * 5) });
  }

  // ---------------------------------------------------------------- input
  var playing = false, paused = false;

  function nearestLane(x) { return Math.max(0, Math.min(LANES - 1, Math.round((x - road.x) / laneW - 0.5))); }

  function moveLane(dir) {
    if (!playing || !state) return;
    var p = state.player;
    if (p.drag) return;
    if (p.free) {
      // after a drag the car can sit between lanes: hop to the next lane centre that way
      p.free = false;
      var off = (p.x - laneX(nearestLane(p.x))) * dir;
      p.lane = off < -laneW * 0.15 ? nearestLane(p.x) : nearestLane(p.x) + dir;
      p.lane = Math.max(0, Math.min(LANES - 1, p.lane));
      Audio.swoosh(); flashArrow(dir);
      return;
    }
    var nl = Math.max(0, Math.min(LANES - 1, p.lane + dir));
    if (nl !== p.lane) { p.lane = nl; Audio.swoosh(); }
    else { p.tilt = dir * 0.25; } // little nudge at the edge
    flashArrow(dir);
  }

  // Touch: grab the car and drag it anywhere on the road (and a little up or down),
  // tap the car to honk, or tap / swipe anywhere else to change lanes.
  var touchStart = null;
  function onCar(x, y) {
    var pl = state && state.player;
    return playing && pl && Math.abs(x - pl.x) < carW * 1.1 && Math.abs(y - pl.y) < carH * 0.8;
  }
  function dragTo(x, y) {
    var p = state.player, t = touchStart;
    p.fx = Math.max(road.x + carW * 0.5, Math.min(road.x + road.w - carW * 0.5, x - t.gx));
    p.dragY = Math.max(carH * 0.5 + 96 - p.baseY, Math.min(carH * 0.3, y - t.gy - p.baseY)); // anywhere on the road, up to just under the top bar
  }
  canvas.addEventListener('pointerdown', function (e) {
    Audio.unlock();
    if (touchStart && touchStart.grab && state && state.player.drag) return; // keep holding the car
    var grab = onCar(e.clientX, e.clientY);
    touchStart = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, grab: grab };
    if (grab) {
      var p = state.player;
      touchStart.gx = e.clientX - p.x; touchStart.gy = e.clientY - p.y;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!touchStart || touchStart.id !== e.pointerId) return;
    var dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
    if (touchStart.grab && playing) {
      var p = state.player;
      if (!p.drag && Math.abs(dx) + Math.abs(dy) > 12) { p.drag = true; p.free = true; }
      if (p.drag) dragTo(e.clientX, e.clientY);
      return;
    }
    if (touchStart.moved) return;
    if (Math.abs(dx) > 40) { touchStart.moved = true; moveLane(dx > 0 ? 1 : -1); }
  });
  function endTouch(e, cancel) {
    if (!touchStart || touchStart.id !== e.pointerId) return;
    var p = state && state.player;
    if (p && p.drag) {
      p.drag = false;
      p.lane = nearestLane(p.fx);
    } else if (!touchStart.moved && !cancel) {
      if (touchStart.grab && playing) tapCar();
      else moveLane(e.clientX < W / 2 ? -1 : 1);
    }
    touchStart = null;
  }
  canvas.addEventListener('pointerup', function (e) { endTouch(e, false); });
  canvas.addEventListener('pointercancel', function (e) { endTouch(e, true); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') moveLane(-1);
    if (e.key === 'ArrowRight' || e.key === 'd') moveLane(1);
  });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  var arrowEls = { '-1': document.querySelector('.arrow.left'), '1': document.querySelector('.arrow.right') };
  function flashArrow(dir) {
    var el = arrowEls[String(dir)]; if (!el) return;
    el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 140);
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    var s = state, p = s.player;
    s.t += dt;
    s.baseSpeed = H * (0.55 + Math.min(s.t / 240, 0.35)); // speeds up very gently over minutes
    var target = s.boost > 0 ? 1.8 : 1;
    if (s.finished) target = 0.25;
    if (p.bump > 0) target = 0.45;
    s.speedMul += (target - s.speedMul) * Math.min(1, dt * 3);
    var v = s.baseSpeed * s.speedMul * dt;
    s.dist += v;
    s.dashOff = (s.dashOff + v) % (carH * 1.2);

    // timers
    if (s.star > 0) s.star -= dt;
    if (s.boost > 0) s.boost -= dt;
    if (s.magnet > 0) s.magnet -= dt;
    if (s.celebrate > 0) s.celebrate -= dt;

    if (s.demo) autopilot(dt);
    for (var si = s.splats.length - 1; si >= 0; si--) {
      var sp = s.splats[si]; sp.life -= dt;
      sp.drips.forEach(function (d) { d.len += d.speed * dt; });
      if (sp.life <= 0) s.splats.splice(si, 1);
    }

    // player
    var tx = p.free ? p.fx : laneX(p.lane);
    var dx = tx - p.x;
    p.x += dx * Math.min(1, dt * (p.drag ? 20 : 12));
    // forward / back: follows the finger while held, then drifts home
    var ty = p.drag ? p.dragY : 0;
    p.yOff += (ty - p.yOff) * Math.min(1, dt * (p.drag ? 16 : 1.5));
    p.y = p.baseY + p.yOff;
    p.tilt += ((dx / laneW) * 0.5 - p.tilt) * Math.min(1, dt * 10);
    if (p.bump > 0) { p.bump -= dt; p.spin = Math.sin(p.bump * 22) * 0.35 * (p.bump / 1.0); } else p.spin = 0;
    if (p.air > 0) {
      p.air -= v;
      if (p.air <= 0) { p.air = 0; landed(); }
    }
    if (s.horn > 0) s.horn -= dt;
    if (s.demo && s.horn <= 0 && Math.random() < dt * 0.15) s.horn = 3;

    // spawn
    var left = s.raceLen - s.dist;
    s.nextSpawn -= v;
    if (s.nextSpawn <= 0 && left > H * 1.4) { spawnRow(); s.nextSpawn = carH * rand(2.2, 3.4); }
    if (!s.finishSpawned && left < p.y + carH) {
      s.finishSpawned = true;
      s.things.push({ kind: 'finish', type: 'finish', lane: 1, x: W / 2, y: p.y - left, s: 0, hit: false, vx: 0, vy: 0, rot: 0, vr: 0, alpha: 1, wob: 0 });
    }
    if (s.finished) {
      s.finishT += dt;
      if (Math.random() < 0.15) confettiPuff();
      if (s.finishT > 2.4 && finishEl.classList.contains('hidden')) showFinish();
    } else if (!s.demo) updateProgress();
    s.nextDecor -= v;
    if (s.nextDecor <= 0) { addDecor(-80); s.nextDecor = rand(35, 80); }

    // decor
    for (var i = s.decor.length - 1; i >= 0; i--) { s.decor[i].y += v; if (s.decor[i].y > H + 120) s.decor.splice(i, 1); }

    var invincible = s.star > 0 || s.boost > 0;
    var pw = carW * 0.8, ph = carH * 0.85;

    for (i = s.things.length - 1; i >= 0; i--) {
      var o = s.things[i];
      if (o.hit) {
        o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; o.alpha -= dt * 1.2;
        if (o.alpha <= 0) { s.things.splice(i, 1); }
        continue;
      }
      o.y += v;
      o.wob += dt;
      if (o.kind === 'coin' && s.magnet > 0) {
        var mx = p.x - o.x, my = p.y - o.y;
        var d = Math.sqrt(mx * mx + my * my);
        if (d < H * 0.5) { o.x += mx * Math.min(1, dt * 6); o.y += my * Math.min(1, dt * 6); }
      }
      if (o.kind === 'finish') {
        if (!s.finished && o.y > p.y - carH * 0.5) crossFinish();
        if (o.y > H + 200) s.things.splice(i, 1);
        continue;
      }
      if (o.y > H + 100) { s.things.splice(i, 1); continue; }

      if (o.kind === 'ramp') {
        if (!o.used && p.air <= 0 && Math.abs(o.x - p.x) < laneW * 0.45 && o.y > p.y - carH * 0.45 && o.y < p.y + carH * 0.3) { o.used = true; launch(); }
        continue;
      }
      // flying over things off a ramp
      if (o.kind === 'obstacle' && lift(p) > 0.25) continue;

      // collision
      if (Math.abs(o.x - p.x) < (pw + o.s) / 2 * 0.8 && Math.abs(o.y - p.y) < (ph + o.s) / 2 * 0.8) {
        if (o.kind === 'coin') {
          s.things.splice(i, 1);
          collectCoin(o.x, o.y);
        } else if (o.kind === 'power') {
          s.things.splice(i, 1);
          getPower(o.type, o.x, o.y);
        } else {
          hitObstacle(o, invincible);
        }
      }
    }

    // particles
    for (i = s.parts.length - 1; i >= 0; i--) {
      var q = s.parts[i];
      q.life -= dt;
      if (q.life <= 0) { s.parts.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt + (q.fall ? 0 : v * 0.5); q.vy += (q.g || 0) * dt; q.rot += (q.vr || 0) * dt;
    }
    for (i = s.floaters.length - 1; i >= 0; i--) { var f = s.floaters[i]; f.life -= dt; f.y -= 60 * dt; if (f.life <= 0) s.floaters.splice(i, 1); }

    // trails
    if (s.boost > 0 && Math.random() < 0.9) puff(p.x + rand(-carW * 0.2, carW * 0.2), p.y + carH * 0.5, ['#ffef5a', '#ff9d2e', '#ff4d2e'], 1);
    if (s.star > 0 && Math.random() < 0.7) sparkle(p.x + rand(-carW * 0.5, carW * 0.5), p.y + carH * 0.4, 1);
  }

  // 0 on the ground, up to 1 at the top of a jump
  function lift(p) { return p.air > 0 ? Math.sin(Math.PI * (1 - p.air / p.airLen)) : 0; }
  function launch() {
    var s = state, p = s.player;
    p.airLen = carH * (s.theme.floaty ? 3.4 : 2.4); p.air = p.airLen;
    Audio.jump();
    sparkle(p.x, p.y + carH * 0.3, 6);
  }
  function landed() {
    var p = state.player;
    Audio.land();
    puff(p.x - carW * 0.4, p.y + carH * 0.3, ['#e8d2b0', '#d9bf96', '#fff'], 4);
    puff(p.x + carW * 0.4, p.y + carH * 0.3, ['#e8d2b0', '#d9bf96', '#fff'], 4);
  }

  // Tapping your own car: honk, or siren lights for the emergency vehicles.
  function hornFor(car) {
    var snd = car.sound || 'honk';
    if (Audio[snd]) Audio[snd]();
  }
  function tapCar() {
    var s = state;
    if (s.horn > 1) return; // let the siren play out
    s.horn = SIREN_CARS[s.car.style] ? 3.6 : 1.6;
    hornFor(s.car);
  }

  function crossFinish() {
    var s = state;
    s.finished = true; s.finishT = 0;
    s.celebrate = 2.5;
    if (!s.demo) {
      Audio.fanfare(); setTimeout(function () { hornFor(s.car); }, 900);
      s.bankBefore = Bank.coins();
      Bank.add(s.coins + FINISH_BONUS);
      if (SIREN_CARS[s.car.style]) s.horn = 4;
    }
    confetti();
    updateProgress(1);
  }

  function autopilot(dt) {
    var s = state, p = s.player;
    s.aiT -= dt;
    if (s.aiT > 0) return;
    var danger = function (lane) {
      return s.things.some(function (o) { return !o.hit && o.kind === 'obstacle' && o.lane === lane && o.y < p.y && o.y > p.y - carH * 3.2; });
    };
    var want = function (lane) {
      return s.things.some(function (o) { return !o.hit && o.kind !== 'obstacle' && o.lane === lane && o.y < p.y && o.y > p.y - carH * 3; });
    };
    var opts = [p.lane - 1, p.lane + 1].filter(function (l) { return l >= 0 && l < LANES && !danger(l); });
    if (danger(p.lane) && opts.length) { p.lane = pick(opts); s.aiT = 0.4; }
    else if (!want(p.lane)) { var g = opts.filter(want); if (g.length) { p.lane = g[0]; s.aiT = 0.4; } }
  }

  function mudSplat() {
    var s = state, n = 3 + Math.floor(Math.random() * 3), m = Math.min(W, H);
    for (var i = 0; i < n; i++) {
      var r = m * rand(0.07, 0.14), blobs = [], drips = [];
      for (var b = 0; b < 8; b++) { var a = Math.random() * 7, d = r * rand(0.6, 1.1); blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: r * rand(0.15, 0.35) }); }
      for (b = 0; b < 3; b++) drips.push({ x: rand(-r * 0.6, r * 0.6), w: r * rand(0.12, 0.22), len: 0, speed: rand(15, 45) });
      s.splats.push({ x: rand(W * 0.1, W * 0.9), y: rand(H * 0.1, H * 0.75), r: r, blobs: blobs, drips: drips, life: rand(3, 4.2), rot: Math.random() * 7 });
    }
    Audio.splat();
  }

  function collectCoin(x, y) {
    var s = state;
    s.coins++;
    Audio.coin();
    sparkle(x, y, 6);
    if (!s.demo) updateHud();
  }

  function getPower(type, x, y) {
    var s = state;
    Audio.power();
    burst(x, y, ['#fff', '#ffe14d', '#4ef0ff'], 18);
    if (type === 'star') s.star = 7;
    else if (type === 'boost') s.boost = 4;
    else if (type === 'shield') s.shield = true;
    else if (type === 'magnet') s.magnet = 9;
    s.floaters.push({ type: type, x: x, y: y, life: 1.2 });
  }

  function hitObstacle(o, invincible) {
    var s = state, p = s.player;
    o.hit = true;
    if (FLAT[o.type]) {
      o.vx = 0; o.vy = 0; o.vr = 0; o.alpha = 0.99;
      if (o.type === 'mud') { mudSplat(); splash(o.x, o.y, ['#6b4423', '#8a5a30', '#4f311a']); }
      else if (o.type === 'ice') { Audio.swoosh(); sparkle(o.x, o.y, 8); }
      else if (o.type === 'crater') { Audio.boing(); splash(o.x, o.y, ['#c9cde0', '#e6e8f2', '#fff']); }
      else { Audio.boing(); splash(o.x, o.y); }
      if (!invincible) { p.bump = Math.max(p.bump, 0.6); }
      return;
    }
    var side = o.x < p.x ? -1 : 1;
    o.vx = side * rand(300, 600); o.vy = -rand(300, 600); o.vr = side * rand(6, 12);
    if (invincible) {
      Audio.pow();
      burst(o.x, o.y, ['#fff', '#ffe14d', '#ff5aa5'], 14);
      collectCoin(o.x, o.y); // smashing things with a star is a treat
      return;
    }
    if (s.shield) {
      s.shield = false;
      Audio.pop();
      burst(p.x, p.y, ['#bdf3ff', '#ffffff', '#7fdcff'], 20);
      return;
    }
    Audio.bump();
    setTimeout(Audio.boing, 120);
    p.bump = 1.0;
    dizzy(p.x, p.y - carH * 0.4);
    try { if (!s.demo && navigator.vibrate) navigator.vibrate(60); } catch (e) {}
  }

  // ---------------------------------------------------------------- particles
  function burst(x, y, colors, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = rand(120, 380);
      state.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.8), max: 0.8, r: rand(4, 9), c: pick(colors), shape: 'dot', fall: true });
    }
  }
  function sparkle(x, y, n) {
    for (var i = 0; i < n; i++) {
      state.parts.push({ x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-80, 80), vy: rand(-120, 20), life: rand(0.4, 0.7), max: 0.7, r: rand(5, 10), c: pick(['#fff', '#ffe14d', '#ff9dd2', '#8ff7ff']), shape: 'star', rot: Math.random() * 6, vr: rand(-6, 6), fall: true });
    }
  }
  function puff(x, y, colors, n) {
    for (var i = 0; i < n; i++) state.parts.push({ x: x, y: y, vx: rand(-30, 30), vy: rand(80, 200), life: rand(0.25, 0.45), max: 0.45, r: rand(8, 16), c: pick(colors), shape: 'dot', fall: true });
  }
  function splash(x, y, cols) {
    for (var i = 0; i < 14; i++) { var a = -Math.random() * Math.PI; state.parts.push({ x: x, y: y, vx: Math.cos(a) * rand(100, 260), vy: Math.sin(a) * rand(100, 260), g: 700, life: 0.6, max: 0.6, r: rand(4, 8), c: pick(cols || ['#5ab8ff', '#9fd8ff', '#fff']), shape: 'dot', fall: true }); }
  }
  function dizzy(x, y) {
    for (var i = 0; i < 5; i++) {
      state.parts.push({ orbit: true, a: i / 5 * Math.PI * 2, life: 1.1, max: 1.1, r: 10, c: pick(['#ffe14d', '#fff']), shape: 'star', rot: 0, vr: 5, x: 0, y: 0, vx: 0, vy: 0, fall: true });
    }
  }
  function confettiPuff() {
    for (var i = 0; i < 6; i++) state.parts.push({ x: rand(0, W), y: -10, vx: rand(-60, 60), vy: rand(150, 300), life: 2.5, max: 2.5, r: rand(6, 11), c: pick(['#ff3b4e', '#ffc21f', '#2fc95a', '#2f7bff', '#a55cff', '#ff5aa5']), shape: 'rect', rot: Math.random() * 6, vr: rand(-8, 8), fall: true });
  }
  function confetti() {
    for (var i = 0; i < 120; i++) state.parts.push({ x: rand(0, W), y: rand(-H * 0.3, 0), vx: rand(-60, 60), vy: rand(150, 400), life: rand(1.8, 3), max: 3, r: rand(6, 11), c: pick(['#ff3b4e', '#ffc21f', '#2fc95a', '#2f7bff', '#a55cff', '#ff5aa5']), shape: 'rect', rot: Math.random() * 6, vr: rand(-8, 8), fall: true });
  }

  // ---------------------------------------------------------------- drawing
  // Ground, scenery strip and road for a location. Shared by the race and the track picker.
  function drawTrack(c, th, w, h, rx, rw, dist, decor, dashLen) {
    c.fillStyle = th.grass; c.fillRect(0, 0, w, h);
    var band = 90, off = dist % (band * 2), y;
    c.fillStyle = th.grass2;
    for (y = -band * 2 + off; y < h; y += band * 2) c.fillRect(0, y, w, band);
    if (th.sea) {
      var sx = rx + rw + Math.max(20, (w - rx - rw) * 0.3);
      c.fillStyle = '#3fb6ff'; c.fillRect(sx, 0, w - sx, h);
      c.fillStyle = '#7fd3ff'; c.fillRect(sx, 0, 10, h);
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 4; c.lineCap = 'round';
      for (y = -60 + (dist * 0.5) % 60; y < h; y += 60) {
        c.beginPath(); c.moveTo(sx + 18, y);
        for (var k = 0; k < 4; k++) c.quadraticCurveTo(sx + 30 + k * 30, y - 8, sx + 42 + k * 30, y);
        c.stroke();
      }
      c.fillStyle = '#ffffff'; for (y = (dist % 26) - 26; y < h; y += 26) { c.beginPath(); c.arc(sx, y, 7, 0, 7); c.fill(); }
    }
    decor.forEach(function (d) { drawDecor(d, c); });
    c.fillStyle = th.road; c.fillRect(rx, 0, rw, h);
    var kw = Math.max(10, rw * 0.03), seg = 40, koff = dist % (seg * 2);
    var lw = rw / LANES, l, lx;
    if (th.kerb) {
      for (y = -seg * 2 + koff; y < h; y += seg * 2) {
        c.fillStyle = th.kerb[0]; c.fillRect(rx - kw, y, kw, seg); c.fillRect(rx + rw, y, kw, seg);
        c.fillStyle = th.kerb[1]; c.fillRect(rx - kw, y + seg, kw, seg); c.fillRect(rx + rw, y + seg, kw, seg);
      }
    } else {
      // soft bumpy dirt edges
      c.fillStyle = th.edge;
      for (y = -40 + (dist % 40); y < h; y += 40) {
        c.beginPath(); c.arc(rx, y, kw * 1.1, 0, 7); c.arc(rx + rw, y + 20, kw * 1.1, 0, 7); c.fill();
      }
      c.fillRect(rx - 2, 0, 6, h); c.fillRect(rx + rw - 4, 0, 6, h);
    }
    if (th.lines === 'dash') {
      c.fillStyle = 'rgba(255,255,255,.85)';
      var gap = dashLen * 2;
      for (l = 1; l < LANES; l++) {
        lx = rx + lw * l - 4;
        for (y = -gap + (dist % gap); y < h; y += gap) { rr(c, lx, y, 8, dashLen, 4); c.fill(); }
      }
    } else {
      // tyre ruts down the middle of each lane, plus pebbles
      c.fillStyle = 'rgba(80,45,15,.22)';
      for (l = 0; l < LANES; l++) {
        lx = rx + lw * (l + 0.5);
        c.fillRect(lx - lw * 0.3, 0, lw * 0.1, h); c.fillRect(lx + lw * 0.2, 0, lw * 0.1, h);
      }
      c.fillStyle = 'rgba(255,240,210,.35)';
      for (l = 1; l < LANES; l++) {
        lx = rx + lw * l;
        for (y = -30 + (dist % 30); y < h; y += 30) { c.beginPath(); c.arc(lx + ((y * 7) % 9) - 4, y, 3, 0, 7); c.fill(); }
      }
      c.fillStyle = 'rgba(90,55,25,.45)';
      for (var i = 0; i < 26; i++) {
        var px = rx + ((i * 137) % 97) / 97 * rw, py = ((i * 211 + dist) % (h + 40)) - 20;
        c.beginPath(); c.ellipse(px, py, 4 + (i % 3) * 2, 3 + (i % 2) * 2, 0, 0, 7); c.fill();
      }
    }
  }

  function drawSnow(c, w, h, t, dist) {
    c.fillStyle = 'rgba(255,255,255,.9)';
    for (var i = 0; i < 70; i++) {
      var sp = 40 + (i % 5) * 18;
      var x = ((i * 97.3) % w) + Math.sin(t * 1.5 + i) * 14;
      var y = ((i * 53.7 + t * sp + dist * 0.15) % (h + 20)) - 10;
      c.beginPath(); c.arc(x, y, 2 + (i % 4), 0, 7); c.fill();
    }
  }

  function drawSplats(c) {
    state.splats.forEach(function (sp) {
      c.save();
      c.globalAlpha = Math.min(1, sp.life / 1.2) * 0.95;
      c.translate(sp.x, sp.y);
      c.fillStyle = '#6b4423';
      sp.drips.forEach(function (d) { rr(c, d.x - d.w / 2, 0, d.w, sp.r * 0.6 + d.len, d.w / 2); c.fill(); c.beginPath(); c.arc(d.x, sp.r * 0.6 + d.len, d.w * 0.7, 0, 7); c.fill(); });
      c.rotate(sp.rot);
      c.beginPath(); c.arc(0, 0, sp.r * 0.8, 0, 7); c.fill();
      sp.blobs.forEach(function (b) { c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); });
      c.fillStyle = '#8a5a30';
      c.beginPath(); c.arc(-sp.r * 0.25, -sp.r * 0.2, sp.r * 0.35, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.beginPath(); c.ellipse(-sp.r * 0.35, -sp.r * 0.35, sp.r * 0.16, sp.r * 0.08, -0.6, 0, 7); c.fill();
      c.restore();
    });
  }

  function drawWorld() {
    var s = state, c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawTrack(c, s.theme, W, H, road.x, road.w, s.dist, s.decor, carH * 0.6);

    // things
    s.things.forEach(function (o) {
      c.save();
      c.globalAlpha = Math.max(0, o.alpha);
      c.translate(o.x, o.y); c.rotate(o.rot);
      if (o.kind === 'finish') drawFinish(c, o.y);
      else if (o.kind === 'coin') drawCoin(c, o.s, o.wob);
      else if (o.kind === 'power') drawPower(c, o.type, o.s, o.wob);
      else if (o.kind === 'ramp') drawRamp(c, o.s, carH * 0.62);
      else drawObstacle(c, o.type, o.s);
      c.restore();
    });

    // player
    var p = s.player, up = lift(p);
    if (up > 0) { // shadow stays on the ground while the car flies
      c.fillStyle = 'rgba(0,0,0,' + (0.25 - up * 0.1) + ')';
      c.beginPath(); c.ellipse(p.x + up * carW * 0.25, p.y + up * carH * 0.12, carW * (0.5 - up * 0.08), carH * (0.48 - up * 0.08), 0, 0, 7); c.fill();
    }
    c.save();
    c.translate(p.x, p.y - up * carH * 0.22 + (p.bump > 0 ? Math.abs(Math.sin(p.bump * 14)) * -8 : 0));
    if (up > 0) c.scale(1 + up * 0.35, 1 + up * 0.35);
    if (s.magnet > 0) {
      c.strokeStyle = 'rgba(255,80,120,' + (0.25 + 0.15 * Math.sin(s.t * 8)) + ')';
      c.lineWidth = 6;
      c.beginPath(); c.arc(0, 0, carH * 0.75 + Math.sin(s.t * 8) * 6, 0, 7); c.stroke();
    }
    c.rotate(p.tilt + p.spin);
    if (s.boost > 0) drawFlame(c, s.t);
    var carOpts = { siren: s.horn > 0, noShadow: up > 0 };
    if (s.star > 0) drawRainbowCar(c, s, carOpts);
    else drawCar(c, s.car, carW, carH, s.t, carOpts);
    c.restore();
    if (s.shield) {
      c.save();
      c.translate(p.x, p.y);
      var g = c.createRadialGradient(0, 0, carH * 0.3, 0, 0, carH * 0.72);
      g.addColorStop(0, 'rgba(150,230,255,0)'); g.addColorStop(0.85, 'rgba(150,230,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,.8)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, carH * 0.72 + Math.sin(s.t * 5) * 3, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-carH * 0.3, -carH * 0.35, carH * 0.12, carH * 0.06, -0.7, 0, 7); c.fill();
      c.restore();
    }

    // particles
    s.parts.forEach(function (q) {
      var a = Math.max(0, q.life / q.max);
      c.save(); c.globalAlpha = Math.min(1, a * 1.5);
      if (q.orbit) {
        var ang = q.a + (1.1 - q.life) * 7;
        c.translate(p.x + Math.cos(ang) * carW * 0.7, p.y - carH * 0.55 + Math.sin(ang) * carW * 0.25);
      } else c.translate(q.x, q.y);
      c.rotate(q.rot || 0);
      c.fillStyle = q.c;
      if (q.shape === 'star') starPath(c, q.r, q.r * 0.45, 5), c.fill();
      else if (q.shape === 'rect') c.fillRect(-q.r / 2, -q.r / 4, q.r, q.r / 2);
      else { c.beginPath(); c.arc(0, 0, q.r * (0.5 + a * 0.5), 0, 7); c.fill(); }
      c.restore();
    });

    // power-up pop-ups
    s.floaters.forEach(function (f) {
      c.save(); c.globalAlpha = Math.min(1, f.life * 2);
      c.translate(f.x, f.y); var k = 1 + (1.2 - f.life) * 0.8; c.scale(k, k);
      drawPower(c, f.type, carW * 0.8, 0, true);
      c.restore();
    });

    if (s.theme.weather === 'snow') drawSnow(c, W, H, s.t, s.dist);
    drawSplats(c);

    // trophy celebration
    if (s.celebrate > 0) {
      var tt = 2.5 - s.celebrate;
      var sc = Math.min(1, tt * 3) * (1 + Math.sin(tt * 8) * 0.05);
      c.save(); c.translate(W / 2, H * 0.38);
      c.globalAlpha = Math.min(1, s.celebrate * 2);
      c.scale(sc, sc);
      c.fillStyle = 'rgba(255,255,255,.6)';
      c.save(); c.rotate(tt * 0.6); for (var r = 0; r < 12; r++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(-30, -H * 0.3); c.lineTo(30, -H * 0.3); c.fill(); } c.restore();
      drawTrophy(c, Math.min(W, H) * 0.22);
      c.restore();
    }
  }

  // Star power: a soft rainbow glow hugging the car, and the car itself tinted with shifting colours.
  // The car is drawn on its own small canvas so the tint only touches the car, never the road.
  var starCv = document.createElement('canvas'), starCtx = starCv.getContext('2d');
  function drawRainbowCar(c, s, opts) {
    var hue = (s.t * 400) % 360;
    // glow: an oval just around the car body
    c.save(); c.scale(1, carH / carW);
    var g = c.createRadialGradient(0, 0, carW * 0.2, 0, 0, carW * 0.78);
    g.addColorStop(0, 'hsla(' + hue + ',100%,65%,.75)');
    g.addColorStop(0.6, 'hsla(' + ((hue + 60) % 360) + ',100%,65%,.35)');
    g.addColorStop(1, 'hsla(' + ((hue + 120) % 360) + ',100%,65%,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, carW * 0.78, 0, 7); c.fill();
    c.restore();
    var pad = 1.5, cw = Math.ceil(carW * pad * DPR), ch = Math.ceil(carH * 1.3 * DPR);
    if (starCv.width !== cw || starCv.height !== ch) { starCv.width = cw; starCv.height = ch; }
    var k = starCtx;
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-over'; k.clearRect(0, 0, cw, ch);
    k.setTransform(DPR, 0, 0, DPR, cw / 2, ch / 2);
    drawCar(k, s.car, carW, carH, s.t, { siren: opts.siren, noShadow: true });
    k.setTransform(1, 0, 0, 1, 0, 0);
    k.globalCompositeOperation = 'source-atop';
    var lg = k.createLinearGradient(0, 0, 0, ch), off = (s.t * 1.5) % 1;
    for (var i = 0; i <= 6; i++) lg.addColorStop(i / 6, 'hsla(' + ((hue + i * 60 + off * 360) % 360) + ',100%,60%,.45)');
    k.fillStyle = lg; k.fillRect(0, 0, cw, ch);
    k.globalCompositeOperation = 'source-over';
    if (!opts.noShadow) { c.fillStyle = 'rgba(0,0,0,.22)'; rr(c, -carW * 0.475 + carW * 0.06, -carH / 2 + carH * 0.06, carW * 0.95, carH, carW * 0.3); c.fill(); }
    c.drawImage(starCv, -cw / DPR / 2, -ch / DPR / 2, cw / DPR, ch / DPR);
  }

  // A small ramp with yellow and black chevrons; the car jumps off its top (far) edge.
  function drawRamp(c, w, h) {
    c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, -w / 2 + 6, -h / 2 + 8, w, h, 8); c.fill();
    c.fillStyle = '#8a8f9c'; rr(c, -w / 2, -h / 2, w, h, 8); c.fill();
    var g = c.createLinearGradient(0, h / 2, 0, -h / 2);
    g.addColorStop(0, '#9aa0ad'); g.addColorStop(1, '#e6e9ef');
    c.fillStyle = g; rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 6); c.fill();
    c.save(); rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 6); c.clip();
    c.fillStyle = '#ffc21f';
    for (var i = -1; i < 4; i++) {
      var y = -h / 2 + i * h * 0.3;
      c.beginPath(); c.moveTo(-w / 2, y + h * 0.2); c.lineTo(0, y); c.lineTo(w / 2, y + h * 0.2); c.lineTo(w / 2, y + h * 0.32); c.lineTo(0, y + h * 0.12); c.lineTo(-w / 2, y + h * 0.32); c.closePath(); c.fill();
    }
    c.restore();
    c.fillStyle = '#ff3b4e'; rr(c, -w / 2, -h / 2 - 4, w, 10, 5); c.fill();
  }

  // Checkered finish line across the road with a flag on each side. Drawn in world space.
  function drawFinish(c, y) {
    c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalAlpha = 1;
    var sq = road.w / 12, rows = 2;
    for (var r = 0; r < rows; r++) for (var k = 0; k < 12; k++) {
      c.fillStyle = (r + k) % 2 ? '#222' : '#fff';
      c.fillRect(road.x + k * sq, y - sq * rows / 2 + r * sq, sq + 0.5, sq + 0.5);
    }
    [road.x - sq * 0.4, road.x + road.w + sq * 0.4].forEach(function (px, i) {
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(px + 4, y + 4, sq * 0.35, 0, 7); c.fill();
      c.fillStyle = '#666'; c.beginPath(); c.arc(px, y, sq * 0.3, 0, 7); c.fill();
      var wave = Math.sin(state.t * 8 + i) * sq * 0.15, dir = i ? 1 : -1;
      for (var a = 0; a < 3; a++) for (var b = 0; b < 2; b++) {
        c.fillStyle = (a + b) % 2 ? '#222' : '#fff';
        c.fillRect(px + dir * (sq * 0.25 + a * sq * 0.4) - (dir < 0 ? sq * 0.4 : 0), y - sq * 1.2 + b * sq * 0.4 + wave * (a / 3), sq * 0.4, sq * 0.4);
      }
    });
    // arch banner
    c.fillStyle = '#ff3b4e';
    rr(c, road.x + road.w * 0.2, y - sq * 2.6, road.w * 0.6, sq * 1.1, sq * 0.3); c.fill();
    c.fillStyle = '#ffd21f';
    for (var st = 0; st < 5; st++) { c.save(); c.translate(road.x + road.w * (0.3 + st * 0.1), y - sq * 2.05); c.rotate(state.t * 2 + st); starPath(c, sq * 0.32, sq * 0.14, 5); c.fill(); c.restore(); }
  }

  function starPath(c, R, r, n) {
    c.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = i * Math.PI / n - Math.PI / 2, rad = i % 2 ? r : R;
      c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    c.closePath();
  }

  function drawCoin(c, s, wob) {
    var sx = Math.abs(Math.cos(wob * 3)) * 0.7 + 0.3;
    c.save(); c.scale(sx, 1);
    c.fillStyle = '#e8a200'; c.beginPath(); c.arc(0, 3, s / 2, 0, 7); c.fill();
    var g = c.createRadialGradient(-s * 0.15, -s * 0.15, 2, 0, 0, s / 2);
    g.addColorStop(0, '#fff6a8'); g.addColorStop(0.5, '#ffd21f'); g.addColorStop(1, '#f0b400');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, s / 2, 0, 7); c.fill();
    c.fillStyle = '#fff3a0'; starPath(c, s * 0.22, s * 0.1, 5); c.fill();
    c.restore();
  }

  function drawPower(c, type, s, wob, noBase) {
    var bob = Math.sin((wob || 0) * 4) * s * 0.06;
    c.translate(0, bob);
    if (!noBase) {
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.beginPath(); c.arc(0, 0, s * 0.6, 0, 7); c.fill();
      c.strokeStyle = 'hsl(' + (((wob || 0) * 200) % 360) + ',100%,60%)'; c.lineWidth = 5;
      c.beginPath(); c.arc(0, 0, s * 0.6, 0, 7); c.stroke();
    }
    if (type === 'star') {
      c.fillStyle = '#ffd21f'; c.strokeStyle = '#ff9d00'; c.lineWidth = 4;
      starPath(c, s * 0.45, s * 0.2, 5); c.fill(); c.stroke();
      c.fillStyle = '#333';
      c.beginPath(); c.arc(-s * 0.08, -s * 0.02, s * 0.04, 0, 7); c.arc(s * 0.08, -s * 0.02, s * 0.04, 0, 7); c.fill();
    } else if (type === 'boost') {
      c.fillStyle = '#ffcf1f'; c.strokeStyle = '#ff7a00'; c.lineWidth = 4;
      c.beginPath();
      c.moveTo(s * 0.08, -s * 0.45); c.lineTo(-s * 0.25, s * 0.05); c.lineTo(-s * 0.02, s * 0.05);
      c.lineTo(-s * 0.1, s * 0.45); c.lineTo(s * 0.25, -s * 0.08); c.lineTo(s * 0.02, -s * 0.08); c.closePath();
      c.fill(); c.stroke();
    } else if (type === 'shield') {
      var g = c.createRadialGradient(-s * 0.1, -s * 0.1, 2, 0, 0, s * 0.42);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#9be8ff'); g.addColorStop(1, '#38b6ff');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, s * 0.4, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(-s * 0.14, -s * 0.16, s * 0.1, s * 0.05, -0.7, 0, 7); c.fill();
    } else if (type === 'magnet') {
      c.lineCap = 'butt';
      c.strokeStyle = '#ff3b4e'; c.lineWidth = s * 0.18;
      c.beginPath(); c.arc(0, -s * 0.02, s * 0.22, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.22, -s * 0.02); c.lineTo(-s * 0.22, s * 0.18); c.moveTo(s * 0.22, -s * 0.02); c.lineTo(s * 0.22, s * 0.18); c.stroke();
      c.strokeStyle = '#d8dde6';
      c.beginPath(); c.moveTo(-s * 0.22, s * 0.18); c.lineTo(-s * 0.22, s * 0.34); c.moveTo(s * 0.22, s * 0.18); c.lineTo(s * 0.22, s * 0.34); c.stroke();
    }
  }

  function drawObstacle(c, type, s) {
    c.fillStyle = 'rgba(0,0,0,.2)';
    if (type === 'barrier' || type === 'log') { rr(c, -s * 0.5, -s * 0.1, s * 1.05, s * 0.34, 8); c.fill(); }
    else if (!FLAT[type]) { c.beginPath(); c.ellipse(s * 0.06, s * 0.08, s * 0.44, s * 0.4, 0, 0, 7); c.fill(); }
    if (type === 'cone') {
      c.fillStyle = '#ff7a1a'; rr(c, -s * 0.45, -s * 0.45, s * 0.9, s * 0.9, s * 0.15); c.fill();
      c.fillStyle = '#ff9a3d'; c.beginPath(); c.arc(0, 0, s * 0.34, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * 0.24, 0, 7); c.fill();
      c.fillStyle = '#ff7a1a'; c.beginPath(); c.arc(0, 0, s * 0.12, 0, 7); c.fill();
    } else if (type === 'crate') {
      c.fillStyle = '#c98a45'; rr(c, -s * 0.45, -s * 0.45, s * 0.9, s * 0.9, 6); c.fill();
      c.strokeStyle = '#8a5a26'; c.lineWidth = s * 0.08; rr(c, -s * 0.4, -s * 0.4, s * 0.8, s * 0.8, 4); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.4, -s * 0.4); c.lineTo(s * 0.4, s * 0.4); c.moveTo(s * 0.4, -s * 0.4); c.lineTo(-s * 0.4, s * 0.4); c.stroke();
    } else if (type === 'tires') {
      [[-0.22, -0.2], [0.22, -0.2], [0, 0.2]].forEach(function (q) {
        c.fillStyle = '#2a2a2a'; c.beginPath(); c.arc(q[0] * s, q[1] * s, s * 0.26, 0, 7); c.fill();
        c.fillStyle = '#555'; c.beginPath(); c.arc(q[0] * s, q[1] * s, s * 0.12, 0, 7); c.fill();
      });
    } else if (type === 'puddle') {
      c.fillStyle = '#4aa8ff';
      c.beginPath(); c.ellipse(0, 0, s * 0.5, s * 0.36, 0, 0, 7); c.ellipse(s * 0.25, s * 0.15, s * 0.3, s * 0.22, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-s * 0.15, -s * 0.1, s * 0.15, s * 0.06, -0.3, 0, 7); c.fill();
    } else if (type === 'rock') {
      c.fillStyle = '#9aa0ad';
      c.beginPath(); c.moveTo(-s * 0.45, s * 0.2); c.lineTo(-s * 0.3, -s * 0.35); c.lineTo(s * 0.1, -s * 0.45); c.lineTo(s * 0.45, -s * 0.1); c.lineTo(s * 0.35, s * 0.35); c.lineTo(-s * 0.2, s * 0.42); c.closePath(); c.fill();
      c.fillStyle = '#c3c8d2'; c.beginPath(); c.moveTo(-s * 0.25, -s * 0.25); c.lineTo(s * 0.08, -s * 0.35); c.lineTo(0, -s * 0.05); c.closePath(); c.fill();
    } else if (type === 'mud') {
      c.fillStyle = '#5e3a1c';
      c.beginPath(); c.ellipse(0, 0, s * 0.52, s * 0.38, 0, 0, 7); c.fill();
      c.beginPath(); c.arc(s * 0.3, s * 0.18, s * 0.22, 0, 7); c.arc(-s * 0.32, -s * 0.12, s * 0.2, 0, 7); c.fill();
      c.fillStyle = '#7a4d27'; c.beginPath(); c.ellipse(-s * 0.05, 0, s * 0.32, s * 0.22, 0.2, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.beginPath(); c.arc(s * 0.12, -s * 0.08, s * 0.05, 0, 7); c.arc(-s * 0.2, s * 0.1, s * 0.035, 0, 7); c.fill();
      c.beginPath(); c.ellipse(-s * 0.2, -s * 0.16, s * 0.1, s * 0.04, -0.4, 0, 7); c.fill();
    } else if (type === 'log') {
      c.fillStyle = '#8a5a2b'; rr(c, -s * 0.55, -s * 0.17, s * 1.1, s * 0.34, s * 0.17); c.fill();
      c.strokeStyle = '#6b431e'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-s * 0.3, -s * 0.06); c.lineTo(s * 0.2, -s * 0.06); c.moveTo(-s * 0.1, s * 0.07); c.lineTo(s * 0.35, s * 0.07); c.stroke();
      c.fillStyle = '#e0b779'; c.beginPath(); c.ellipse(s * 0.5, 0, s * 0.09, s * 0.17, 0, 0, 7); c.fill();
      c.strokeStyle = '#b8894a'; c.lineWidth = 2; c.beginPath(); c.ellipse(s * 0.5, 0, s * 0.045, s * 0.09, 0, 0, 7); c.stroke();
      c.fillStyle = '#3fae4f'; c.beginPath(); c.arc(-s * 0.15, -s * 0.17, s * 0.07, 0, 7); c.arc(-s * 0.05, -s * 0.2, s * 0.06, 0, 7); c.fill();
    } else if (type === 'bale') {
      c.fillStyle = '#f2c94c'; rr(c, -s * 0.45, -s * 0.32, s * 0.9, s * 0.64, 8); c.fill();
      c.strokeStyle = '#c99a1e'; c.lineWidth = 3;
      for (var j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(-s * 0.4, j * s * 0.1); c.lineTo(s * 0.4, j * s * 0.1 + 3); c.stroke(); }
      c.strokeStyle = '#a0522d'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-s * 0.18, -s * 0.32); c.lineTo(-s * 0.18, s * 0.32); c.moveTo(s * 0.18, -s * 0.32); c.lineTo(s * 0.18, s * 0.32); c.stroke();
    } else if (type === 'snowman') {
      c.fillStyle = '#ffffff'; c.strokeStyle = '#c9d8ea'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, s * 0.12, s * 0.36, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -s * 0.2, s * 0.24, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#ff7a1a'; c.beginPath(); c.moveTo(0, -s * 0.2); c.lineTo(s * 0.04, -s * 0.48); c.lineTo(-s * 0.04, -s * 0.2); c.fill();
      c.fillStyle = '#333'; c.beginPath(); c.arc(-s * 0.08, -s * 0.24, s * 0.03, 0, 7); c.arc(s * 0.08, -s * 0.24, s * 0.03, 0, 7); c.arc(0, s * 0.05, s * 0.035, 0, 7); c.arc(0, s * 0.18, s * 0.035, 0, 7); c.fill();
      c.fillStyle = '#ff3b4e'; c.fillRect(-s * 0.26, -s * 0.03, s * 0.52, s * 0.08);
    } else if (type === 'snowball') {
      c.fillStyle = '#ffffff'; c.strokeStyle = '#c9d8ea'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, 0, s * 0.42, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#dde8f5'; c.beginPath(); c.arc(s * 0.12, s * 0.12, s * 0.2, 0, 7); c.fill();
    } else if (type === 'ice') {
      c.fillStyle = 'rgba(170,225,255,.85)';
      c.beginPath(); c.moveTo(-s * 0.5, 0); c.lineTo(-s * 0.2, -s * 0.38); c.lineTo(s * 0.3, -s * 0.32); c.lineTo(s * 0.52, s * 0.05); c.lineTo(s * 0.2, s * 0.38); c.lineTo(-s * 0.3, s * 0.3); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-s * 0.25, -s * 0.12); c.lineTo(s * 0.05, -s * 0.22); c.moveTo(-s * 0.1, s * 0.12); c.lineTo(s * 0.25, 0); c.stroke();
    } else if (type === 'sandcastle') {
      c.fillStyle = '#e8c16e'; rr(c, -s * 0.4, -s * 0.3, s * 0.8, s * 0.6, 4); c.fill();
      c.fillStyle = '#d9ab52';
      [[-0.32, -0.24], [0.32, -0.24], [-0.32, 0.24], [0.32, 0.24]].forEach(function (q) { c.beginPath(); c.arc(q[0] * s, q[1] * s, s * 0.14, 0, 7); c.fill(); });
      c.fillStyle = '#f2d48d'; c.beginPath(); c.arc(0, 0, s * 0.18, 0, 7); c.fill();
      c.strokeStyle = '#8a5a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s * 0.32); c.stroke();
      c.fillStyle = '#ff3b4e'; c.beginPath(); c.moveTo(0, -s * 0.32); c.lineTo(s * 0.2, -s * 0.26); c.lineTo(0, -s * 0.2); c.fill();
    } else if (type === 'ball') {
      var cols = ['#ff3b4e', '#ffffff', '#2f7bff', '#ffffff', '#ffc21f', '#ffffff'];
      for (var k = 0; k < 6; k++) { c.fillStyle = cols[k]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, s * 0.4, k * Math.PI / 3, (k + 1) * Math.PI / 3); c.fill(); }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * 0.08, 0, 7); c.fill();
    } else if (type === 'crab') {
      c.fillStyle = '#ff5a3c';
      c.strokeStyle = '#ff5a3c'; c.lineWidth = 5; c.lineCap = 'round';
      for (var g = -1; g <= 1; g += 2) for (var m = 0; m < 3; m++) { c.beginPath(); c.moveTo(g * s * 0.2, s * 0.05 + m * s * 0.08); c.lineTo(g * s * 0.45, s * 0.15 + m * s * 0.1); c.stroke(); }
      c.beginPath(); c.ellipse(0, s * 0.08, s * 0.3, s * 0.22, 0, 0, 7); c.fill();
      c.beginPath(); c.arc(-s * 0.36, -s * 0.2, s * 0.12, 0, 7); c.arc(s * 0.36, -s * 0.2, s * 0.12, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-s * 0.1, -s * 0.08, s * 0.07, 0, 7); c.arc(s * 0.1, -s * 0.08, s * 0.07, 0, 7); c.fill();
      c.fillStyle = '#222'; c.beginPath(); c.arc(-s * 0.1, -s * 0.08, s * 0.035, 0, 7); c.arc(s * 0.1, -s * 0.08, s * 0.035, 0, 7); c.fill();
    } else if (type === 'trash') {
      c.fillStyle = '#5aa86a'; c.beginPath(); c.arc(0, 0, s * 0.4, 0, 7); c.fill();
      c.strokeStyle = '#3f7d4c'; c.lineWidth = s * 0.06; c.beginPath(); c.arc(0, 0, s * 0.3, 0, 7); c.stroke();
      c.fillStyle = '#3f7d4c'; rr(c, -s * 0.16, -s * 0.05, s * 0.32, s * 0.1, 4); c.fill();
    } else if (type === 'cactus') {
      c.fillStyle = '#3fa34f';
      c.beginPath(); c.arc(0, 0, s * 0.26, 0, 7); c.fill();
      c.beginPath(); c.ellipse(-s * 0.3, -s * 0.08, s * 0.16, s * 0.12, 0, 0, 7); c.ellipse(s * 0.3, s * 0.06, s * 0.16, s * 0.12, 0, 0, 7); c.fill();
      c.fillStyle = '#5cc46a'; c.beginPath(); c.arc(-s * 0.06, -s * 0.06, s * 0.12, 0, 7); c.fill();
      c.fillStyle = '#ff5aa5'; c.beginPath(); c.arc(0, 0, s * 0.07, 0, 7); c.fill();
    } else if (type === 'tumbleweed') {
      c.strokeStyle = '#b08850'; c.lineWidth = s * 0.05;
      for (var tw = 0; tw < 5; tw++) { c.beginPath(); c.ellipse(0, 0, s * 0.38, s * 0.2, tw * 0.63, 0, 7); c.stroke(); }
    } else if (type === 'coconut') {
      [[-0.18, -0.1], [0.18, -0.05], [0, 0.2]].forEach(function (q) {
        c.fillStyle = '#7a4d27'; c.beginPath(); c.arc(q[0] * s, q[1] * s, s * 0.22, 0, 7); c.fill();
        c.fillStyle = '#5a3518'; c.beginPath(); c.arc(q[0] * s - s * 0.05, q[1] * s - s * 0.04, s * 0.03, 0, 7); c.arc(q[0] * s + s * 0.05, q[1] * s - s * 0.04, s * 0.03, 0, 7); c.fill();
      });
    } else if (type === 'moonrock') {
      c.fillStyle = '#b9a6e0';
      c.beginPath(); c.moveTo(-s * 0.42, s * 0.15); c.lineTo(-s * 0.28, -s * 0.32); c.lineTo(s * 0.12, -s * 0.42); c.lineTo(s * 0.42, -s * 0.08); c.lineTo(s * 0.32, s * 0.34); c.lineTo(-s * 0.18, s * 0.4); c.closePath(); c.fill();
      c.fillStyle = '#4ef0ff'; c.beginPath(); c.moveTo(-s * 0.1, -s * 0.28); c.lineTo(s * 0.04, -s * 0.05); c.lineTo(-s * 0.16, 0); c.closePath(); c.fill();
      c.fillStyle = '#e2d8ff'; c.beginPath(); c.moveTo(s * 0.12, -s * 0.3); c.lineTo(s * 0.3, -s * 0.06); c.lineTo(s * 0.12, -s * 0.04); c.closePath(); c.fill();
    } else if (type === 'crater') {
      c.fillStyle = '#6f748a'; c.beginPath(); c.ellipse(0, 0, s * 0.5, s * 0.38, 0, 0, 7); c.fill();
      c.fillStyle = '#585c70'; c.beginPath(); c.ellipse(s * 0.04, s * 0.04, s * 0.38, s * 0.27, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-s * 0.2, -s * 0.18, s * 0.18, s * 0.06, -0.3, 0, 7); c.fill();
    } else if (type === 'satellite') {
      c.fillStyle = '#2f7bff'; rr(c, -s * 0.52, -s * 0.14, s * 0.32, s * 0.28, 3); c.fill(); rr(c, s * 0.2, -s * 0.14, s * 0.32, s * 0.28, 3); c.fill();
      c.strokeStyle = '#8fd3ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-s * 0.36, -s * 0.14); c.lineTo(-s * 0.36, s * 0.14); c.moveTo(s * 0.36, -s * 0.14); c.lineTo(s * 0.36, s * 0.14); c.stroke();
      c.fillStyle = '#d8dde6'; c.beginPath(); c.arc(0, 0, s * 0.2, 0, 7); c.fill();
      c.fillStyle = '#ffc21f'; c.beginPath(); c.arc(0, 0, s * 0.09, 0, 7); c.fill();
    } else if (type === 'barrier') {
      rr(c, -s * 0.5, -s * 0.18, s, s * 0.36, 8); c.fillStyle = '#fff'; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#ff3b4e';
      for (var i = -4; i < 5; i++) { c.beginPath(); c.moveTo(i * s * 0.2, -s * 0.2); c.lineTo(i * s * 0.2 + s * 0.1, -s * 0.2); c.lineTo(i * s * 0.2 - s * 0.05, s * 0.2); c.lineTo(i * s * 0.2 - s * 0.15, s * 0.2); c.fill(); }
      c.restore();
      c.fillStyle = '#ffd21f'; c.beginPath(); c.arc(-s * 0.4, -s * 0.18, s * 0.07, 0, 7); c.arc(s * 0.4, -s * 0.18, s * 0.07, 0, 7); c.fill();
    }
  }

  function drawFlame(c, t) {
    var f = 0.8 + Math.sin(t * 40) * 0.2;
    c.fillStyle = '#ff7a1a';
    c.beginPath(); c.moveTo(-carW * 0.3, carH * 0.45); c.quadraticCurveTo(0, carH * (0.45 + 0.7 * f), carW * 0.3, carH * 0.45); c.fill();
    c.fillStyle = '#ffe14d';
    c.beginPath(); c.moveTo(-carW * 0.16, carH * 0.45); c.quadraticCurveTo(0, carH * (0.45 + 0.4 * f), carW * 0.16, carH * 0.45); c.fill();
  }

  function drawTrophy(c, s) {
    c.fillStyle = '#ffc21f'; c.strokeStyle = '#e08a00'; c.lineWidth = s * 0.04;
    // handles
    c.beginPath(); c.arc(-s * 0.32, -s * 0.15, s * 0.16, 0, 7); c.stroke();
    c.beginPath(); c.arc(s * 0.32, -s * 0.15, s * 0.16, 0, 7); c.stroke();
    // cup
    c.beginPath(); c.moveTo(-s * 0.36, -s * 0.38); c.lineTo(s * 0.36, -s * 0.38);
    c.quadraticCurveTo(s * 0.34, s * 0.12, 0, s * 0.16); c.quadraticCurveTo(-s * 0.34, s * 0.12, -s * 0.36, -s * 0.38); c.fill(); c.stroke();
    c.fillRect(-s * 0.06, s * 0.14, s * 0.12, s * 0.16);
    rr(c, -s * 0.24, s * 0.28, s * 0.48, s * 0.12, 6); c.fill(); c.stroke();
    c.fillStyle = '#fff6a8'; starPath(c, s * 0.12, s * 0.055, 5); c.fill();
  }

  var TREE_COLORS = ['#2e9e48', '#3fb35a', '#25883d', '#48b84f', '#2f9e60'];
  var FLOWER_COLORS = ['#ff5aa5', '#ffd21f', '#ffffff', '#ff7a1a', '#a55cff'];
  function drawDecor(d, c) {
    var s = d.s;
    c.save(); c.translate(d.x, d.y); c.scale(s, s);
    if (d.type === 'tree' || d.type === 'tree2') {
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(8, 10, 30, 26, 0, 0, 7); c.fill();
      c.fillStyle = TREE_COLORS[d.hue];
      c.beginPath(); c.arc(0, 0, 28, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(-9, -9, 12, 0, 7); c.fill();
      if (d.type === 'tree2') { c.fillStyle = '#ff3b4e'; [[-10, 6], [10, -4], [4, 12]].forEach(function (q) { c.beginPath(); c.arc(q[0], q[1], 4, 0, 7); c.fill(); }); }
    } else if (d.type === 'bush') {
      c.fillStyle = '#3aa64f';
      c.beginPath(); c.arc(-10, 0, 14, 0, 7); c.arc(10, 0, 14, 0, 7); c.arc(0, -8, 14, 0, 7); c.fill();
    } else if (d.type === 'flower') {
      c.fillStyle = FLOWER_COLORS[d.hue];
      for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 7, Math.sin(a) * 7, 6, 0, 7); c.fill(); }
      c.fillStyle = '#ffd21f'; c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fill();
    } else if (d.type === 'rock') {
      c.fillStyle = '#b8bec8'; c.beginPath(); c.ellipse(0, 0, 16, 11, 0.3, 0, 7); c.fill();
    } else if (d.type === 'hay') {
      c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.arc(5, 6, 22, 0, 7); c.fill();
      c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill();
      c.strokeStyle = '#c99a1e'; c.lineWidth = 3; c.beginPath();
      for (var t = 0; t < 14; t += 0.2) c.lineTo(Math.cos(t) * t * 1.4, Math.sin(t) * t * 1.4);
      c.stroke();
    } else if (d.type === 'fence') {
      c.fillStyle = '#9b6a3a'; c.fillRect(-4, -30, 8, 60);
      c.fillStyle = '#7a5230'; c.beginPath(); c.arc(0, -30, 7, 0, 7); c.arc(0, 30, 7, 0, 7); c.fill();
    } else if (d.type === 'sunflower') {
      c.fillStyle = '#ffd21f';
      for (var q = 0; q < 10; q++) { var b = q / 10 * Math.PI * 2; c.beginPath(); c.ellipse(Math.cos(b) * 11, Math.sin(b) * 11, 7, 4, b, 0, 7); c.fill(); }
      c.fillStyle = '#7a4d27'; c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fill();
    } else if (d.type === 'pine') {
      c.fillStyle = 'rgba(0,40,80,.15)'; c.beginPath(); c.arc(8, 8, 30, 0, 7); c.fill();
      c.fillStyle = '#1f7a4a'; starPath(c, 30, 18, 8); c.fill();
      c.fillStyle = '#2a9a5c'; starPath(c, 20, 12, 8); c.fill();
      c.fillStyle = '#ffffff'; starPath(c, 10, 6, 8); c.fill();
      c.beginPath(); c.arc(-14, 10, 5, 0, 7); c.arc(16, -8, 4, 0, 7); c.fill();
    } else if (d.type === 'snowrock') {
      c.fillStyle = '#8f99a8'; c.beginPath(); c.ellipse(0, 0, 18, 13, 0.3, 0, 7); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(-3, -4, 12, 7, 0.3, 0, 7); c.fill();
    } else if (d.type === 'snowman') {
      c.fillStyle = '#ffffff'; c.strokeStyle = '#c9d8ea'; c.lineWidth = 2;
      c.beginPath(); c.arc(0, 6, 14, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -10, 9, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#ff7a1a'; c.beginPath(); c.arc(0, -10, 2.5, 0, 7); c.fill();
    } else if (d.type === 'palm') {
      c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.arc(8, 8, 30, 0, 7); c.fill();
      c.fillStyle = '#2fb35a';
      for (var f = 0; f < 7; f++) { var a2 = f / 7 * Math.PI * 2; c.save(); c.rotate(a2); c.beginPath(); c.ellipse(16, 0, 18, 7, 0, 0, 7); c.fill(); c.restore(); }
      c.fillStyle = '#8a5a2b'; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill();
      c.fillStyle = '#6b431e'; c.beginPath(); c.arc(-4, 6, 3.5, 0, 7); c.arc(5, 4, 3.5, 0, 7); c.fill();
    } else if (d.type === 'umbrella') {
      var uc = ['#ff3b4e', '#ffffff'];
      for (var u = 0; u < 8; u++) { c.fillStyle = uc[u % 2]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 24, u * Math.PI / 4, (u + 1) * Math.PI / 4); c.fill(); }
      c.fillStyle = '#ffc21f'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
    } else if (d.type === 'shell') {
      c.fillStyle = '#ffb3c7'; c.beginPath(); c.arc(0, 0, 9, Math.PI, 0); c.lineTo(0, 8); c.closePath(); c.fill();
    } else if (d.type === 'starfish') {
      c.fillStyle = '#ff8a3d'; starPath(c, 12, 5, 5); c.fill();
    } else if (d.type === 'building') {
      var bc = ['#ff8a7a', '#7ab8ff', '#ffd36b', '#9be08a', '#c7a0ff'][d.hue];
      c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-22, -26, 56, 62);
      c.fillStyle = bc; c.fillRect(-28, -32, 56, 62);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-28, -32, 56, 6);
      c.fillStyle = '#8a93a6'; c.fillRect(-14, -16, 14, 10); c.fillRect(6, 6, 12, 12);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(12, -14, 6, 0, 7); c.fill();
    } else if (d.type === 'lamp') {
      c.fillStyle = 'rgba(255,240,150,.35)'; c.beginPath(); c.arc(0, 0, 16, 0, 7); c.fill();
      c.fillStyle = '#555c6b'; c.beginPath(); c.arc(0, 0, 7, 0, 7); c.fill();
      c.fillStyle = '#fff6a0'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
    } else if (d.type === 'hydrant') {
      c.fillStyle = '#ff3b4e'; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill(); c.fillRect(-13, -3, 26, 6);
      c.fillStyle = '#ffd21f'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
    } else if (d.type === 'cactus') {
      c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(6, 6, 22, 14, 0, 0, 7); c.fill();
      c.fillStyle = '#3fa34f'; rr(c, -7, -26, 14, 52, 7); c.fill(); rr(c, -22, -10, 10, 22, 5); c.fill(); rr(c, 12, -18, 10, 22, 5); c.fill();
      c.fillRect(-16, 4, 10, 6); c.fillRect(6, -2, 10, 6);
      c.fillStyle = '#ff5aa5'; c.beginPath(); c.arc(0, -26, 4, 0, 7); c.fill();
    } else if (d.type === 'mesa') {
      c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(8, 8, 34, 22, 0.2, 0, 7); c.fill();
      c.fillStyle = '#d0703a'; c.beginPath(); c.ellipse(0, 0, 34, 22, 0.2, 0, 7); c.fill();
      c.fillStyle = '#e88b4e'; c.beginPath(); c.ellipse(-4, -3, 24, 14, 0.2, 0, 7); c.fill();
    } else if (d.type === 'tumbleweed') {
      c.strokeStyle = '#b08850'; c.lineWidth = 2.5;
      c.rotate((d.y || 0) * 0.03);
      for (var tw = 0; tw < 4; tw++) { c.beginPath(); c.ellipse(0, 0, 13, 7, tw * 0.8, 0, 7); c.stroke(); }
    } else if (d.type === 'desertrock') {
      c.fillStyle = '#c98a5a'; c.beginPath(); c.ellipse(0, 0, 15, 10, 0.4, 0, 7); c.fill();
    } else if (d.type === 'bigleaf') {
      c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.arc(8, 8, 28, 0, 7); c.fill();
      var lc = ['#1f8a3a', '#38b54f', '#25a046', '#4cc95f', '#2c9a50'][d.hue];
      for (var lf = 0; lf < 5; lf++) { c.save(); c.rotate(lf * 1.26 + d.hue); c.fillStyle = lc; c.beginPath(); c.ellipse(16, 0, 18, 9, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(2, 0); c.lineTo(30, 0); c.stroke(); c.restore(); }
    } else if (d.type === 'crater') {
      c.fillStyle = '#2c3050'; c.beginPath(); c.ellipse(0, 0, 22, 16, 0, 0, 7); c.fill();
      c.fillStyle = '#4a5078'; c.beginPath(); c.ellipse(-3, -3, 16, 10, 0, 0, 7); c.fill();
    } else if (d.type === 'twinkle') {
      c.fillStyle = ['#ffffff', '#fff3a0', '#9be8ff', '#ffc8ef', '#ffffff'][d.hue];
      c.rotate(d.hue); starPath(c, 8, 3, 4); c.fill();
    } else if (d.type === 'planet') {
      c.fillStyle = ['#ff9d5c', '#5cc8ff', '#c18cff', '#ff7aa8', '#7ee08a'][d.hue]; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4; c.beginPath(); c.ellipse(0, 0, 30, 8, -0.4, 0, 7); c.stroke();
    } else if (d.type === 'alien') {
      c.fillStyle = '#7ee08a'; c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fill();
      c.strokeStyle = '#7ee08a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -10); c.lineTo(-10, -22); c.moveTo(6, -10); c.lineTo(10, -22); c.stroke();
      c.fillStyle = '#ffd21f'; c.beginPath(); c.arc(-10, -22, 3.5, 0, 7); c.arc(10, -22, 3.5, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -2, 6, 0, 7); c.fill();
      c.fillStyle = '#222'; c.beginPath(); c.arc(0, -2, 3, 0, 7); c.fill();
      c.strokeStyle = '#2a7a3a'; c.lineWidth = 2; c.beginPath(); c.arc(0, 5, 4, 0.2, Math.PI - 0.2); c.stroke();
    } else if (d.type === 'moonrock') {
      c.fillStyle = '#b9a6e0'; c.beginPath(); c.ellipse(0, 0, 14, 10, 0.4, 0, 7); c.fill();
      c.fillStyle = '#4ef0ff'; c.beginPath(); c.arc(-3, -2, 3, 0, 7); c.fill();
    }
    c.restore();
  }

  // ---------------------------------------------------------------- HUD
  var hud = document.getElementById('hud'), selectEl = document.getElementById('select');
  var barFill = document.getElementById('bar-fill'), progCar = document.getElementById('prog-car'), coinCount = document.getElementById('coin-count');
  var finishEl = document.getElementById('finish'), finishCoins = document.getElementById('finish-coins');
  var lastPct = -1;
  function updateHud() {
    coinCount.textContent = state.coins;
    if (!state.finished) updateProgress();
  }
  function updateProgress(force) {
    var pct = force || Math.min(1, state.dist / state.raceLen);
    pct = Math.round(pct * 200) / 2;
    if (pct === lastPct) return;
    lastPct = pct;
    barFill.style.width = pct + '%';
    progCar.style.left = pct + '%';
  }
  var progCtx = progCar.getContext('2d');
  function paintProgCar() {
    progCar.width = 80; progCar.height = 80;
    progCtx.setTransform(1, 0, 0, 1, 0, 0); progCtx.clearRect(0, 0, 80, 80);
    progCtx.translate(40, 40); progCtx.rotate(Math.PI / 2);
    drawCar(progCtx, state.car, 36, 63, 0);
  }
  var finishBank = document.getElementById('finish-bank'), bankTimer = null;
  function showFinish() {
    finishCoins.textContent = state.coins;
    finishEl.classList.remove('hidden');
    playing = false;
    // count the race coins (and the finishing bonus) into the piggy bank
    var from = state.bankBefore || 0, to = Bank.coins(), n = from;
    finishBank.textContent = from;
    clearInterval(bankTimer);
    setTimeout(function () {
      var step = Math.max(1, Math.ceil((to - from) / 25));
      bankTimer = setInterval(function () {
        n = Math.min(to, n + step);
        finishBank.textContent = n;
        Audio.tick();
        if (n >= to) { clearInterval(bankTimer); Audio.coin(); }
      }, 60);
    }, 700);
  }
  document.getElementById('again').addEventListener('click', function () { startGame(state.car, state.theme); });
  document.getElementById('places').addEventListener('click', function () { chosenCar = state.car; show('tracks'); });
  document.getElementById('finish-home').addEventListener('click', function () { show('title'); });

  var SOUND_ON = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
  var SOUND_OFF = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.6 3 2.7-2.7-1.3-1.3-2.7 2.7-2.7-2.7-1.3 1.3 2.7 2.7-2.7 2.7 1.3 1.3 2.7-2.7 2.7 2.7 1.3-1.3z"/></svg>';
  var soundBtns = [document.getElementById('sound'), document.getElementById('sound-sel')];
  function paintSound() { soundBtns.forEach(function (b) { b.innerHTML = Audio.isOn() ? SOUND_ON : SOUND_OFF; }); }
  soundBtns.forEach(function (b) {
    b.addEventListener('click', function () { Audio.unlock(); Audio.toggle(); paintSound(); });
  });
  paintSound();

  // ---------------------------------------------------------------- screens
  var titleEl = document.getElementById('title'), tracksEl = document.getElementById('tracks');
  var screen = 'title', chosenCar = null;

  function show(name) {
    screen = name;
    touchStart = null;
    playing = name === 'race';
    titleEl.classList.toggle('hidden', name !== 'title');
    selectEl.classList.toggle('hidden', name !== 'cars');
    tracksEl.classList.toggle('hidden', name !== 'tracks');
    hud.classList.toggle('hidden', name !== 'race');
    finishEl.classList.add('hidden');
    Array.prototype.forEach.call(document.querySelectorAll('.picked'), function (b) { b.classList.remove('picked'); });
    if (name !== 'race') Audio.stopMusic();
    Audio.setQuiet(name === 'title');
    if (name === 'title') startDemo();
    if (name === 'cars' || name === 'tracks') { paintBank(); paintLocks(cardCanvases); paintLocks(trackCards); }
    shopEl.classList.add('hidden'); shopCard = null;
    if (name !== 'race') clearInterval(bankTimer);
  }

  function startDemo() {
    newGame(pick(CARS), pick(THEMES), true);
  }

  titleEl.addEventListener('click', function () { Audio.unlock(); Audio.honk(); show('cars'); });
  document.getElementById('home').addEventListener('click', function () { show('title'); });
  document.getElementById('back-cars').addEventListener('click', function () { show('title'); });
  document.getElementById('back-tracks').addEventListener('click', function () { show('cars'); });

  // ---------------------------------------------------------------- cards (cars + places)
  var COIN_HTML = '<div class="coin-icon"></div>';
  var LOCK_SVG = '<svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>';
  var bankEls = Array.prototype.slice.call(document.querySelectorAll('.bank-count'));
  function paintBank() { bankEls.forEach(function (el) { el.textContent = Bank.coins(); }); }

  function makeCard(parent, item, extraClass, onPick) {
    var b = document.createElement('button');
    b.className = 'car-card' + (extraClass ? ' ' + extraClass : '');
    var cv = document.createElement('canvas');
    var nm = document.createElement('div'); nm.className = 'name'; nm.textContent = item.name;
    b.appendChild(cv); b.appendChild(nm);
    if (item.price) {
      var lock = document.createElement('div'); lock.className = 'lock'; lock.innerHTML = LOCK_SVG;
      var tag = document.createElement('div'); tag.className = 'price'; tag.innerHTML = COIN_HTML + '<span>' + item.price + '</span>';
      b.appendChild(lock); b.appendChild(tag);
    }
    var card = { el: b, cv: cv, item: item, horn: 0 };
    b.addEventListener('click', function () {
      if (b.classList.contains('picked')) return;
      Audio.unlock();
      if (!Bank.has(item)) { openShop(card); return; }
      onPick(card);
    });
    parent.appendChild(b);
    return card;
  }
  function paintLocks(cards) {
    cards.forEach(function (o) {
      o.el.classList.toggle('locked', !Bank.has(o.item));
      o.el.classList.toggle('can-buy', Bank.canBuy(o.item));
      o.el.setAttribute('aria-label', o.item.name + (Bank.has(o.item) ? '' : ', locked, ' + o.item.price + ' coins'));
    });
  }

  // ---------------------------------------------------------------- car select
  var carsEl = document.getElementById('cars');
  var cardCanvases = CARS.map(function (car) {
    return makeCard(carsEl, car, '', function (o) {
      hornFor(car);
      o.horn = SIREN_CARS[car.style] ? 3 : 1.2;
      o.el.classList.add('picked');
      chosenCar = car;
      setTimeout(function () { show('tracks'); }, 700);
    });
  });

  function fitCanvas(cv) {
    var r = cv.getBoundingClientRect();
    if (!r.width) return null;
    var w = Math.round(r.width * DPR), h = Math.round(r.height * DPR);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    var c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    return { c: c, w: w, h: h };
  }

  function drawCarPreview(f, o, i) {
    var c = f.c, w = f.w, h = f.h;
    c.fillStyle = '#4a4f5c'; rr(c, w * 0.12, 0, w * 0.76, h, w * 0.12); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)';
    var off = (selectT * h * 0.8 + i * 30) % (h * 0.5);
    for (var y = -h * 0.5 + off; y < h; y += h * 0.5) c.fillRect(w / 2 - w * 0.015, y, w * 0.03, h * 0.2);
    c.save();
    c.translate(w / 2, h / 2 + Math.sin(selectT * 6 + i) * h * 0.015);
    c.rotate(Math.sin(selectT * 2 + i) * 0.05);
    drawCar(c, o.item, w * 0.42, w * 0.42 * 1.75, selectT, { siren: o.horn > 0 });
    c.restore();
  }

  var selectT = 0;
  function drawCards(dt) {
    selectT += dt;
    cardCanvases.forEach(function (o, i) {
      if (o.horn > 0) o.horn -= dt;
      var f = fitCanvas(o.cv); if (!f) return;
      drawCarPreview(f, o, i);
    });
  }

  // ---------------------------------------------------------------- track select
  var tracksGrid = document.getElementById('tracks-grid');
  var trackCards = THEMES.map(function (th) {
    var card = makeCard(tracksGrid, th, 'track-card', function (o) {
      Audio.power();
      o.el.classList.add('picked');
      setTimeout(function () { startGame(chosenCar || CARS[0], th); }, 550);
    });
    // fixed scenery for the preview, in a 400 x 300 virtual space
    var decor = [];
    for (var y = -60; y < 420; y += 60) {
      var type = pick(th.decor);
      var bld = type === 'building';
      decor.push({ type: type, x: type === 'fence' ? 88 : bld ? rand(30, 55) : rand(20, 75), y: y, s: rand(0.8, 1.1), hue: Math.floor(Math.random() * 5) });
      if (!th.sea) decor.push({ type: type, x: type === 'fence' ? 312 : bld ? rand(345, 370) : rand(325, 380), y: y + 30, s: rand(0.8, 1.1), hue: Math.floor(Math.random() * 5) });
    }
    card.decor = decor; card.obs = pick(th.obstacles);
    return card;
  });

  function drawTrackPreview(f, o, i) {
    var c = f.c, k = f.w / 400, vh = f.h / k, th = o.item;
    var dist = selectT * 160 + i * 50;
    c.save(); c.scale(k, k);
    var moved = o.decor.map(function (d) { return { type: d.type, x: d.x, y: ((d.y + dist) % 480) - 60, s: d.s, hue: d.hue }; });
    drawTrack(c, th, 400, vh, 100, 200, dist, moved, 40);
    c.save(); c.translate(250, ((vh * 0.25 + dist) % (vh + 120)) - 60); drawObstacle(c, o.obs, 56); c.restore();
    var jy = ((vh * 0.75 + dist) % (vh + 120)) - 60, jlift = 0;
    if (th.jumps) {
      c.save(); c.translate(167, jy); drawRamp(c, 52, 40); c.restore();
      // the car hops when the ramp passes under it
      var past = jy - vh * 0.68; // >0 once the ramp has passed under the car
      var span = th.floaty ? 150 : 110;
      if (past > 0 && past < span) jlift = Math.sin(Math.PI * past / span);
    }
    if (th.weather === 'snow') drawSnow(c, 400, vh, selectT, dist);
    c.save(); c.translate(167, vh * 0.68 - jlift * 14); c.scale(1 + jlift * 0.3, 1 + jlift * 0.3);
    drawCar(c, chosenCar || CARS[0], 38, 66, selectT, { noShadow: jlift > 0.05 }); c.restore();
    c.restore();
  }

  function drawTrackCards(dt) {
    selectT += dt;
    trackCards.forEach(function (o, i) {
      var f = fitCanvas(o.cv); if (!f) return;
      drawTrackPreview(f, o, i);
    });
  }

  // ---------------------------------------------------------------- shop (buy a locked car or place)
  var shopEl = document.getElementById('shop'), shopCv = document.getElementById('shop-cv');
  var shopPrice = document.getElementById('shop-price'), shopHave = document.getElementById('shop-have');
  var shopFill = document.getElementById('shop-fill'), buyBtn = document.getElementById('buy');
  var shopCard = null, shopDone = 0;
  function openShop(card) {
    shopCard = card; shopDone = 0;
    var it = card.item, ok = Bank.canBuy(it);
    shopPrice.textContent = it.price;
    shopHave.textContent = Math.min(Bank.coins(), it.price) + ' / ' + it.price;
    shopFill.style.width = Math.min(100, Bank.coins() / it.price * 100) + '%';
    shopEl.classList.toggle('short', !ok);
    shopEl.classList.toggle('wide', !it.style);
    shopEl.classList.remove('bought');
    shopEl.classList.remove('hidden');
    if (ok) Audio.power(); else Audio.nope();
  }
  function closeShop() { shopEl.classList.add('hidden'); shopCard = null; }
  buyBtn.addEventListener('click', function () {
    if (!shopCard || shopDone) return;
    var card = shopCard;
    if (!Bank.buy(card.item)) { Audio.nope(); buyBtn.classList.add('shake'); setTimeout(function () { buyBtn.classList.remove('shake'); }, 500); return; }
    Audio.cash();
    shopDone = 1.4;
    shopEl.classList.add('bought');
    card.horn = 3;
    if (card.item.style) setTimeout(function () { hornFor(card.item); }, 450);
    paintBank(); paintLocks(cardCanvases); paintLocks(trackCards);
  });
  document.getElementById('shop-close').addEventListener('click', closeShop);
  shopEl.addEventListener('click', function (e) { if (e.target === shopEl) closeShop(); });

  function drawShop(dt) {
    if (!shopCard) return;
    if (shopDone > 0) { shopDone -= dt; if (shopDone <= 0) { closeShop(); return; } }
    var f = fitCanvas(shopCv); if (!f) return;
    if (shopCard.item.style) drawCarPreview(f, shopCard, 0); else drawTrackPreview(f, shopCard, 0);
  }

  function startGame(car, theme) {
    newGame(car, theme || THEMES[0]);
    show('race');
    Audio.startMusic(state.theme.music);
    keepAwake();
  }

  var wakeLock = null;
  function keepAwake() {
    try {
      if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
    } catch (e) {}
  }

  // ---------------------------------------------------------------- loop
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) {
      if (screen === 'race' || screen === 'title') { update(dt); drawWorld(); }
      else if (screen === 'cars') drawCards(dt);
      else if (screen === 'tracks') drawTrackCards(dt);
      if (screen === 'cars' || screen === 'tracks') drawShop(dt);
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', function () {
    paused = document.hidden;
    if (paused) Audio.suspend(); else { Audio.resume(); last = performance.now(); if (playing) keepAwake(); }
  });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });

  resize();
  show('title');
  requestAnimationFrame(frame);

  // test hook
  window.__laneRacer = { drawCar: drawCar, cars: CARS, get state() { return state; }, themes: THEMES, show: show, start: function (i, t) { startGame(CARS[i || 0], THEMES[t || 0]); }, moveLane: moveLane };
})();
