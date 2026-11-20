// Computer players so you can practise alone or fill out a small group.
// They path-find on the tile grid with breadth-first distance fields.
import { TILE, COLS, ROWS, isSolid, links, itemSpots, tileAt } from "./map.js";

const N = COLS * ROWS;
const idx = (tx, ty) => ty * COLS + tx;

// Forward and reverse adjacency per role (vents are survivor-only).
function buildGraph(role) {
  const fwd = Array.from({ length: N }, () => []);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (isSolid(x, y)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!isSolid(x + dx, y + dy)) fwd[idx(x, y)].push(idx(x + dx, y + dy));
    }
  }
  for (const l of links) {
    if (l.kind === "vent" && role === "wolf") continue;
    // Stepping onto a pad sends you to its partner, so the pad's only exit is the far end.
    const a = idx(...l.a), b = idx(...l.b);
    fwd[a].push(b);
    if (!l.oneWay) fwd[b].push(a);
  }
  const rev = Array.from({ length: N }, () => []);
  fwd.forEach((list, i) => list.forEach((j) => rev[j].push(i)));
  return { fwd, rev };
}
const graphs = { wolf: buildGraph("wolf"), surv: buildGraph("surv"), survNoVent: buildGraph("wolf") };

// Distance field. With reverse=true it is "distance to reach `from`".
function field(role, from, reverse, maxD = 9999) {
  const g = reverse ? graphs[role].rev : graphs[role].fwd;
  const d = new Int16Array(N).fill(-1);
  const q = new Int32Array(N);
  let h = 0, t = 0;
  d[from] = 0; q[t++] = from;
  while (h < t) {
    const i = q[h++];
    if (d[i] >= maxD) continue;
    for (const j of g[i]) if (d[j] < 0) { d[j] = d[i] + 1; q[t++] = j; }
  }
  return d;
}

const tileOf = (p) => idx(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
const tileCenter = (i) => ({ x: (i % COLS) * TILE + TILE / 2, y: Math.floor(i / COLS) * TILE + TILE / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Bot {
  constructor(id) {
    this.id = id;
    this.think = 0;
    this.goal = -1;
    this.toGoal = null;
    this.useSeq = 0;
    this.stuck = 0;
    this.jiggle = 0;
    this.jx = 0; this.jy = 0;
    this.last = null;
    this.known = null;     // werewolf's memory of a survivor
    this.sniff = 4;
    this.doing = null;
    this.taskGoal = null;
  }

  input(s, me, dt) {
    if (s.phase !== "play" || !me.alive || me.role === "wolf") this.doing = null;
    if (s.phase !== "play") return { mx: 0, my: 0, useSeq: this.useSeq };
    if (this.doing) {
      // Standing at a station playing its mini game
      const wolf = s.players.find((p) => p.role === "wolf");
      if (wolf && wolf.fx.hold <= 0 && dist(wolf, me) < 260) { this.doing = null; this.think = 0; }
      else {
        this.doing.t -= dt;
        if (this.doing.t <= 0) { const id = this.doing.id; this.doing = null; this.taskGoal = null; return { mx: 0, my: 0, useSeq: this.useSeq, task: id }; }
        return { mx: 0, my: 0, useSeq: this.useSeq };
      }
    }
    this.think -= dt;
    if (this.think <= 0) { this.think = 0.25 + Math.random() * 0.1; this.plan(s, me, dt); }
    let mx = 0, my = 0;
    if (this.toGoal && this.goal >= 0) {
      const here = tileOf(me);
      let next = here;
      let best = this.toGoal[here];
      if (best > 0) {
        for (const j of graphs[this.graph || "surv"].fwd[here]) {
          if (this.toGoal[j] >= 0 && this.toGoal[j] < best) { best = this.toGoal[j]; next = j; }
        }
      }
      const c = next === here ? tileCenter(this.goal === here ? here : here) : tileCenter(next);
      if (next !== here || dist(me, c) > 6) { mx = c.x - me.x; my = c.y - me.y; }
    }
    // Close in on a survivor we can see: go straight for them instead of tile centers.
    if (me.role === "wolf" && this.prey && this.prey.alive && dist(this.prey, me) < 90) {
      mx = this.prey.x - me.x; my = this.prey.y - me.y;
    }
    // Unstick: if we're trying to move but not getting anywhere, wiggle a bit.
    if (this.last && (mx || my) && dist(me, this.last) < 0.4 && !me.fx.stun && !me.fx.hold) this.stuck += dt;
    else this.stuck = Math.max(0, this.stuck - dt);
    this.last = { x: me.x, y: me.y };
    if (this.stuck > 0.5) { this.stuck = 0; this.jiggle = 0.35; const a = Math.random() * 6.28; this.jx = Math.cos(a); this.jy = Math.sin(a); }
    if (this.jiggle > 0) { this.jiggle -= dt; mx = this.jx; my = this.jy; }
    const len = Math.hypot(mx, my) || 1;
    return { mx: mx / len, my: my / len, useSeq: this.useSeq };
  }

  setGoal(role, goal) {
    if (goal === this.goal && this.toGoal) { this.toGoal = field(role, goal, true); return; }
    this.goal = goal;
    this.toGoal = goal >= 0 ? field(role, goal, true) : null;
  }

  plan(s, me) {
    this.graph = me.role === "surv" && me.fx.ventCd > 0 ? "survNoVent" : me.role === "wolf" ? "wolf" : "surv";
    const wolf = s.players.find((p) => p.role === "wolf");
    if (!me.alive) { this.wander(s, me, "surv"); return; }
    if (me.role === "wolf") this.planWolf(s, me);
    else this.planSurvivor(s, me, wolf);
  }

  wander(s, me, role) {
    if (this.goal < 0 || tileOf(me) === this.goal || Math.random() < 0.02) {
      const [tx, ty] = itemSpots[Math.floor(Math.random() * itemSpots.length)];
      this.setGoal(role, idx(tx, ty));
    }
  }

  planWolf(s, me) {
    const mine = field("wolf", tileOf(me), false);
    this.sniff -= 0.3;
    let target = null, best = 1e9;
    for (const p of s.players) {
      if (p.role !== "surv" || !p.alive) continue;
      const d = mine[tileOf(p)];
      if (d < 0) continue;
      const hidden = tileAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === "b" && dist(p, me) > 80;
      const smoked = s.smokes.some((c) => dist(c, p) < c.r);
      const seen = me.fx.howl > 0 || (!hidden && !smoked && dist(p, me) < 380);
      if (seen && d < best) { best = d; target = p; }
    }
    if (!target && this.sniff <= 0) {
      // Every few seconds the werewolf catches a whiff of the closest survivor.
      this.sniff = 3 + Math.random() * 2;
      for (const p of s.players) {
        if (p.role !== "surv" || !p.alive) continue;
        const d = mine[tileOf(p)];
        if (d >= 0 && d < best) { best = d; target = p; }
      }
      if (target) this.known = tileOf(target);
    }
    if (!target && s.pings.length) {
      // Someone just finished a task: go check it out
      const pg = s.pings[s.pings.length - 1];
      this.known = tileOf(pg);
    }
    if (!target && me.fx.sniff > 0) {
      for (const p of s.players) {
        if (p.role !== "surv" || !p.alive) continue;
        const d = mine[tileOf(p)];
        if (d >= 0 && d < best) { best = d; target = p; }
      }
    }
    this.prey = target;
    if (target) { this.known = tileOf(target); this.setGoal("wolf", this.known); }
    else if (this.known !== null && tileOf(me) !== this.known) this.setGoal("wolf", this.known);
    else { this.known = null; this.wander(s, me, "wolf"); }

    if (me.item) {
      const close = target && dist(target, me) < 260;
      if (((me.item === "soda" || me.item === "pepper") && close) || (me.item === "moon" && !target) ||
          ((me.item === "grease" || me.item === "syrup") && Math.random() < 0.05)) this.useSeq++;
    }
  }

  planSurvivor(s, me, wolf) {
    if (!wolf) return;
    const wolfD = field("wolf", tileOf(wolf), false);
    const myD = field(this.graph, tileOf(me), false, 10);
    const near = dist(wolf, me);
    // Survivors only know where the werewolf is when they can see or hear it (like a person would),
    // or while it is still waiting at the start.
    const aware = wolf.fx.hold <= 0 && near < 400;
    if (aware) this.lastWolf = { x: wolf.x, y: wolf.y, t: 3 };
    else if (this.lastWolf) this.lastWolf.t -= 0.3;
    const remembered = this.lastWolf && this.lastWolf.t > 0;
    const threat = wolf.fx.hold > 0 ? 99 : aware || remembered ? wolfD[tileOf(me)] : 99;

    if (me.item) {
      if (me.item === "garlic" && near < 130) this.useSeq++;
      else if ((me.item === "soda" || me.item === "smoke" || me.item === "grease") && near < 170) this.useSeq++;
    }

    if (threat > 14 || threat < 0) {
      // Safe for now: do a task, go shopping for a pickup, or mosey around.
      const st = this.taskGoal !== null && this.taskGoal !== undefined ? s.stations.find((x) => x.id === this.taskGoal && x.cd <= 0) : null;
      if (st) {
        if (dist(st, me) < 30) { this.doing = { id: st.id, t: 3.5 + Math.random() * 1.5 }; return; }
        this.setGoal(this.graph, tileOf(st));
        return;
      }
      this.taskGoal = null;
      if (Math.random() < 0.12) {
        const open = s.stations.filter((x) => x.cd <= 0);
        const full = field(this.graph, tileOf(me), false);
        open.sort((a, b) => full[tileOf(a)] - full[tileOf(b)]);
        if (open.length && full[tileOf(open[0])] >= 0 && full[tileOf(open[0])] < 25) { this.taskGoal = open[0].id; this.setGoal(this.graph, tileOf(open[0])); return; }
      }
      if (!me.item && s.items.length) {
        let bestI = -1, bestD = 1e9;
        const full = field(this.graph, tileOf(me), false);
        for (const it of s.items) {
          if (it.kind === "moon") continue;
          const d = full[tileOf(it)];
          if (d >= 0 && d < bestD) { bestD = d; bestI = tileOf(it); }
        }
        if (bestI >= 0) { this.setGoal(this.graph, bestI); return; }
      }
      this.wander(s, me, "surv");
      return;
    }
    // Run: pick a reachable tile that is far from the werewolf.
    let bestT = -1, bestScore = -1e9;
    for (let i = 0; i < N; i++) {
      if (myD[i] < 0 || wolfD[i] < 0) continue;
      let score = wolfD[i] * 1.0 - myD[i] * 0.45;
      const t = tileAt(i % COLS, Math.floor(i / COLS));
      if (t === "b") score += 2;
      if (wolfD[i] <= myD[i]) score -= 20; // the wolf would get there first
      if (score > bestScore) { bestScore = score; bestT = i; }
    }
    if (bestT >= 0) this.setGoal(this.graph, bestT);
  }
}
