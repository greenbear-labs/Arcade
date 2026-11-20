// Keyboard (WASD / arrows + Space) and touch (drag anywhere on the left, USE button) controls.
export function makeInput(canvas, useBtn, stickEl) {
  const keys = new Set();
  const st = { mx: 0, my: 0, useSeq: 0, touch: false };
  let stick = null; // { id, ox, oy, x, y }
  // main.js can take over the action button (for mini games) with st.onPress(down) -> true
  const use = () => { if (st.onPress && st.onPress(true)) return; st.useSeq++; };
  const release = () => { if (st.onPress) st.onPress(false); };

  addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
    const k = e.key.toLowerCase();
    if ([" ", "e", "enter", "shift"].includes(k)) { if (!e.repeat) use(); e.preventDefault(); return; }
    if (k === "escape" && st.onEscape) { st.onEscape(); return; }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) { keys.add(k); e.preventDefault(); }
  });
  addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    keys.delete(k);
    if ([" ", "e", "enter", "shift"].includes(k)) release();
  });
  addEventListener("blur", () => keys.clear());

  const area = canvas.parentElement;
  area.addEventListener("touchstart", (e) => {
    st.touch = true;
    document.body.classList.add("touching");
    for (const t of e.changedTouches) {
      if (t.target === useBtn) continue;
      if (!stick) stick = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY };
    }
    paintStick();
    e.preventDefault();
  }, { passive: false });
  area.addEventListener("touchmove", (e) => {
    for (const t of e.changedTouches) if (stick && t.identifier === stick.id) { stick.x = t.clientX; stick.y = t.clientY; }
    paintStick();
    e.preventDefault();
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) if (stick && t.identifier === stick.id) stick = null;
    paintStick();
  };
  area.addEventListener("touchend", end);
  area.addEventListener("touchcancel", end);
  useBtn.addEventListener("touchstart", (e) => { use(); e.preventDefault(); e.stopPropagation(); }, { passive: false });
  useBtn.addEventListener("touchend", (e) => { release(); e.preventDefault(); e.stopPropagation(); }, { passive: false });
  useBtn.addEventListener("mousedown", use);
  useBtn.addEventListener("mouseup", release);

  function paintStick() {
    if (!stick) { stickEl.style.display = "none"; return; }
    stickEl.style.display = "block";
    const r = area.getBoundingClientRect();
    stickEl.style.left = `${stick.ox - r.left}px`;
    stickEl.style.top = `${stick.oy - r.top}px`;
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy, len = Math.hypot(dx, dy), max = 46;
    const k = len > max ? max / len : 1;
    stickEl.firstElementChild.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  }

  st.read = () => {
    let mx = 0, my = 0;
    if (keys.has("a") || keys.has("arrowleft")) mx -= 1;
    if (keys.has("d") || keys.has("arrowright")) mx += 1;
    if (keys.has("w") || keys.has("arrowup")) my -= 1;
    if (keys.has("s") || keys.has("arrowdown")) my += 1;
    if (stick) {
      const dx = stick.x - stick.ox, dy = stick.y - stick.oy, len = Math.hypot(dx, dy);
      if (len > 8) { const k = Math.min(1, len / 40); mx = (dx / len) * k; my = (dy / len) * k; }
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    st.mx = mx; st.my = my;
    if (st.frozen) { mx = 0; my = 0; } // busy with a mini game
    return { mx, my, useSeq: st.useSeq };
  };
  return st;
}
