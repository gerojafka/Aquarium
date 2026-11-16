/* Ocean Dream — invertebrates.js
   Invertébrés : crevettes, étoile de mer, oursin, anémone, bernard-l'ermite (modèles procéduraux et déplacements). */
(function () {
'use strict';
const T = THREE, OD = window.OD, C = OD.C, lerp = OD.lerp, clamp = OD.clamp;
const V = (x, y, z) => new T.Vector3(x, y, z), UP = V(0, 1, 0);
const rnd = Math.random, rr = (a, b) => a + (b - a) * rnd();
const _c = new T.Color();
let MAT = null;
const mat = () => MAT || (MAT = OD.mat({ sway: true, glow: true, side: T.DoubleSide, caustics: 0.6 }));
const meshOf = mw => { const m = new T.Mesh(mw.build(), mat()); m.castShadow = true; m.frustumCulled = false; return m; };
const nz = new OD.Noise(77);
const curve = (a, b, c, n) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push(V(u * u * a.x + 2 * u * t * b.x + t * t * c.x, u * u * a.y + 2 * u * t * b.y + t * t * c.y, u * u * a.z + 2 * u * t * b.z + t * t * c.z)); } return o; };

const BUILD = {
  /* Lysmata amboinensis : dos rouge à bande blanche, flancs ambrés, longues antennes blanches */
  cleanershrimp(o) {
    o = o || {}; const mw = new OD.MW(), red = C(o.back || '#cf2218'), wh = C(o.line || '#fbfbf6'), ye = C(o.side || '#e9a838'), bk = C('#0a0a0a');
    const col = o.plain ? ((ux, uy, uz) => (nz.n3(ux * 4 + 2, uy * 4, uz * 4) > 0.22 ? ye : red)) : ((ux, uy, uz) => (uy > 0.5 && Math.abs(uz) < 0.34) ? wh : (uy > -0.1 ? red : ye));
    mw.blob(V(0.14, 0.03, 0), V(0.2, 0.085, 0.07), 2, col);
    for (let i = 0; i < 6; i++) mw.blob(V(-0.06 - 0.072 * i, 0.03 - 0.011 * i * i, 0), V(0.056, 0.064 - 0.006 * i, 0.055 - 0.005 * i), 2, col);
    mw.blob(V(-0.53, -0.3, 0), V(0.085, 0.014, 0.075), 2, (ux, uy, uz) => (Math.abs(uz) > 0.55 && ux < 0) ? wh : red);
    mw.tube([V(0.3, 0.065, 0), V(0.44, 0.08, 0)], t => 0.013 * (1 - t * 0.8), 4, () => red);
    for (const s of [1, -1]) {
      mw.blob(V(0.31, 0.07, s * 0.06), 0.02, 1, () => bk);
      const ph = s > 0 ? 0 : 2.1;
      mw.tube(curve(V(0.33, 0.06, s * 0.03), V(0.6, 0.3, s * 0.2), V(1.0, 0.36, s * 0.5), 8), t => 0.007 * (1 - t * 0.7), 3, () => wh, { sway: t => 0.16 * t * t, phase: ph, glow: 0.4 });
      mw.tube(curve(V(0.33, 0.05, s * 0.03), V(0.55, 0.0, s * 0.3), V(0.85, 0.08, s * 0.75), 8), t => 0.007 * (1 - t * 0.7), 3, () => wh, { sway: t => 0.14 * t * t, phase: ph + 1.3, glow: 0.4 });
      mw.tube(curve(V(0.3, 0.07, s * 0.03), V(0.0, 0.4, s * 0.25), V(-0.55, 0.3, s * 0.4), 8), t => 0.006 * (1 - t * 0.7), 3, () => wh, { sway: t => 0.12 * t * t, phase: ph + 2.6, glow: 0.4 });
      for (let i = 0; i < 5; i++) { const x = 0.22 - 0.055 * i; mw.tube([V(x, -0.03, s * 0.045), V(x + 0.01, -0.09, s * 0.14), V(x + 0.03, -0.2, s * 0.17)], 0.008, 3, (t) => t > 0.5 ? wh : red); }
    }
    return { mesh: meshOf(mw), lift: 0.2, scale: o.scale || 0.95, view: [0.5, 0.35, 1], kind: 'hop' };
  },
  /* Hymenocera picta : corps crème à grandes taches rose violacé, pinces en palettes */
  harlequin() {
    const mw = new OD.MW(), cr = C('#f6f0e6'), pk = C('#b8589a'), bl = C('#3a56d8'), bk = C('#0a0a0a');
    const spot = (px, py, pz) => { const n = nz.n3(px * 9.5 + 3, py * 9.5, pz * 9.5); return n > 0.2 ? pk : (n > 0.12 ? bl : cr); };
    const part = (c, r) => mw.blob(c, r, 2, (ux, uy, uz) => spot(c.x + ux * r.x, c.y + uy * r.y, c.z + uz * r.z));
    part(V(0.08, 0.14, 0), V(0.16, 0.1, 0.085));
    for (let i = 0; i < 5; i++) part(V(-0.08 - 0.07 * i, 0.14 - 0.014 * i * i, 0), V(0.06, 0.08 - 0.008 * i, 0.07 - 0.007 * i));
    part(V(-0.44, -0.12, 0), V(0.075, 0.016, 0.07));
    for (const s of [1, -1]) {
      part(V(0.27, 0.1, s * 0.14), V(0.13, 0.115, 0.022)); part(V(0.16, 0.12, s * 0.11), V(0.07, 0.035, 0.03));
      part(V(0.25, 0.27, s * 0.05), V(0.055, 0.045, 0.008));
      mw.tube([V(0.2, 0.18, s * 0.04), V(0.24, 0.26, s * 0.05)], 0.008, 3, () => cr); mw.blob(V(0.245, 0.27, s * 0.05), 0.016, 1, () => bk);
      mw.tube(curve(V(0.22, 0.2, s * 0.03), V(0.4, 0.4, s * 0.12), V(0.6, 0.42, s * 0.3), 6), 0.005, 3, () => cr, { sway: t => 0.1 * t * t, phase: s });
      for (let i = 0; i < 4; i++) { const x = 0.14 - 0.06 * i; mw.tube([V(x, 0.07, s * 0.05), V(x + 0.01, 0.02, s * 0.14), V(x + 0.03, -0.1, s * 0.17)], 0.011, 4, (t, j) => (Math.floor(t * 5) & 1) ? pk : cr); }
    }
    return { mesh: meshOf(mw), lift: 0.1, scale: 0.85, view: [0.55, 0.3, 1] };
  },
  /* Fromia : étoile rouge orangé à pores sombres */
  starfish() {
    const mw = new OD.MW(), c0 = C('#d43c1a'), c1 = C('#ff8440'), dk = C('#7c160c'), S = 0.44, segs = 90, rings = 9, first = mw.n;
    mw.v(0, 0.075, 0, c0, 0, 0, 0.1);
    for (let i = 1; i <= rings; i++) for (let j = 0; j < segs; j++) {
      const th = j / segs * 6.2832, a = ((th % 1.25664) - 0.62832), R = 0.27 + 0.73 * Math.pow(Math.max(0, Math.cos(a * 2.5)), 1.9), f = i / rings, rho = f * R * S;
      const x = Math.cos(th) * rho, z = Math.sin(th) * rho, n = nz.n3(x * 22, 1, z * 22), y = 0.075 * Math.sqrt(Math.max(0, 1 - f * f)) * (0.5 + 0.5 * R) + n * 0.006 * (1 - f);
      _c.copy(c0).lerp(c1, Math.pow(f * R, 2)); if (n > 0.32) _c.lerp(dk, 0.75);
      mw.v(x, y, z, _c, 0, 0, 0.15);
    }
    for (let j = 0; j < segs; j++) mw.i.push(first, first + 1 + (j + 1) % segs, first + 1 + j);
    for (let i = 0; i < rings - 1; i++) for (let j = 0; j < segs; j++) { const a = first + 1 + i * segs + j, b = first + 1 + i * segs + (j + 1) % segs; mw.i.push(a, b, a + segs, b, b + segs, a + segs); }
    return { mesh: meshOf(mw), lift: 0.01, scale: 1, view: [0.2, 1, 0.75] };
  },
  /* Diadema setosum : test noir, longues épines, cinq points blancs et anneau orange */
  urchin() {
    const mw = new OD.MW(), bk = C('#0b0b10'), gr = C('#2a2a36'), wh = C('#f4f4f4'), or = C('#ff7a1a'), r = OD.rng(31);
    mw.blob(V(0, 0.15, 0), V(0.17, 0.14, 0.17), 2, (ux, uy) => uy > 0.2 ? bk : gr);
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.2832; mw.blob(V(Math.cos(a) * 0.085, 0.265, Math.sin(a) * 0.085), 0.014, 1, () => wh, { glow: 0.8 }); }
    const ring = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * 6.2832; ring.push(V(Math.cos(a) * 0.035, 0.292, Math.sin(a) * 0.035)); } mw.tube(ring, 0.008, 4, () => or, { cap: false, glow: 1.2 });
    for (let k = 0; k < 96; k++) {
      const u = r() * 1.25 - 0.25, a = r() * 6.2832, sy = u, sr = Math.sqrt(Math.max(0, 1 - sy * sy)), dir = V(Math.cos(a) * sr, sy, Math.sin(a) * sr), len = 0.42 + r() * 0.42, st = V(dir.x * 0.15, 0.15 + dir.y * 0.12, dir.z * 0.15);
      mw.tube([st, st.clone().addScaledVector(dir, len * 0.5), st.clone().addScaledVector(dir, len)], t => 0.0075 * (1 - t * 0.85), 3, (t) => (Math.floor(t * 6 + k) & 3) === 0 ? gr : bk, { sway: t => 0.05 * t * t, phase: r() * 6.28 });
    }
    return { mesh: meshOf(mw), lift: 0.0, scale: 0.95, view: [0.4, 0.5, 1] };
  },
  /* Clibanarius tricolor : pattes bleues à articulations orangées, coquille spiralée */
  hermit() {
    const mw = new OD.MW(), cr = C('#eadfc6'), br = C('#8c5c36'), bl = C('#2253d6'), or = C('#e85a1e'), bk = C('#0a0a0a');
    const shell = (ux, uy, uz) => _c.copy(cr).lerp(br, 0.5 + 0.5 * Math.sin((ux * 2 + uy * 5 + uz * 1.5) * 4));
    for (let i = 0; i < 4; i++) { const r = 0.15 * Math.pow(0.72, i); mw.blob(V(-0.06 - 0.085 * i, 0.16 + 0.055 * i, 0.03 * i), V(r * 1.1, r, r), 2, shell); }
    mw.tube([V(-0.33, 0.33, 0.1), V(-0.4, 0.38, 0.13)], t => 0.04 * (1 - t), 5, () => br);
    for (const s of [1, -1]) {
      mw.blob(V(0.17, 0.08, s * 0.06), V(0.065, 0.042, 0.036), 2, () => bl);
      for (let i = 0; i < 2; i++) { const x = 0.06 - 0.07 * i, zz = s * (0.12 + i * 0.03);
        mw.tube([V(x, 0.1, s * 0.05), V(x + 0.1, 0.13, zz), V(x + 0.17, 0.0, zz + s * 0.04)], 0.018, 5, (t) => (t > 0.42 && t < 0.58) ? or : bl); }
      mw.tube([V(0.1, 0.13, s * 0.025), V(0.15, 0.22, s * 0.035)], 0.007, 3, () => or); mw.blob(V(0.152, 0.225, s * 0.035), 0.013, 1, () => bk);
      mw.tube(curve(V(0.14, 0.12, s * 0.02), V(0.28, 0.2, s * 0.08), V(0.4, 0.14, s * 0.2), 5), 0.004, 3, () => or, { sway: t => 0.06 * t * t, phase: s * 2 });
    }
    return { mesh: meshOf(mw), lift: 0.0, scale: 0.62, view: [0.6, 0.35, 1] };
  },
  /* Entacmaea quadricolor : anémone à bouts renflés */
  anemone() {
    const ctx = new OD.Ctx(900 + ((rnd() * 99) | 0), { pal: ['#888', '#444', '#666', '#777'], floor: () => 0 });
    OD.Gen.anemone(ctx, V(0, 0, 0), UP.clone(), 0.85, { pal: [['#c8643c', '#f0b890', '#ffe9d8', '#8a4a34']], n: 96 });
    const m = new T.Mesh(ctx.sway.build(), mat()); m.castShadow = true; m.frustumCulled = false;
    return { mesh: m, lift: 0.0, scale: 1, view: [0.3, 0.5, 1], fixed: true };
  }
};

class Invert {
  constructor(sys, id) {
    this.sys = sys; this.id = id; const b = BUILD[id](); this.b = b;
    this.obj = new T.Group(); b.mesh.scale.setScalar(b.scale); b.mesh.position.y = b.lift * b.scale; this.obj.add(b.mesh);
    this.pos = this.obj.position; this.yaw = rnd() * 6.28; this.seed = rnd() * 100; this.timer = rr(2, 6); this.from = V(0, 0, 0); this.to = V(0, 0, 0); this.k = 1; this.dur = 1;
    this.kind = b.fixed ? 'fixed' : (b.kind || (id === 'harlequin' ? 'hop' : 'crawl')); this.walker = id === 'hermit' || !!b.walker;
    this.speed = b.speed || (id === 'hermit' ? 0.22 : (id === 'urchin' ? 0.05 : 0.035)); this.perch = null; this.host = null; this.n = UP.clone();
    this.place(true);
  }
  freePerch(maxD) {
    const B = OD.bounds, L = this.sys.decor.perches.filter(q => !q.busy && Math.abs(q.p.x) < B.x1 - 0.4 && q.p.y < B.y1 - 0.5 && q.p.z > B.z0 && (!maxD || q.p.distanceTo(this.pos) < maxD));
    return L.length ? L[(rnd() * L.length) | 0] : null;
  }
  place() {
    const s = this.sys, d = s.decor;
    if (this.perch) { this.perch.busy = null; this.perch = null; }
    if (this.kind === 'fixed') {
      if (this.host) { const i = d.anemones.indexOf(this.host); if (i >= 0) d.anemones.splice(i, 1); }
      const p = s.sandPoint(), q = this.freePerch(); if (q && q.p.y < 4.5 && rnd() < 0.8) { this.perch = q; q.busy = this; p.copy(q.p); p.y -= 0.05; }
      this.pos.copy(p); this.host = { p: p.clone().add(V(0, 0.62, 0)), r: 0.85 }; d.anemones.push(this.host); d.pois.push({ p: this.host.p.clone().add(V(0, 0.3, 0)), r: 0.8, kind: 'anemone' }); s.hosts = {};
    } else if (this.kind === 'hop') {
      const q = this.freePerch(); if (q) { this.perch = q; q.busy = this; this.pos.copy(q.p); this.n.copy(q.n); } else { this.pos.copy(s.sandPoint()); this.n.copy(UP); }
      this.k = 1; this.timer = rr(4, 12);
    } else { this.pos.copy(s.sandPoint()); this.to.copy(this.pos); this.timer = rr(1, 5); }
    this.orient(0);
  }
  orient(t) {
    const tilt = this.kind === 'hop' ? new T.Quaternion().setFromUnitVectors(UP, V(this.n.x * 0.6, 1, this.n.z * 0.6).normalize()) : null;
    this.obj.quaternion.setFromAxisAngle(UP, this.yaw + (this.kind === 'hop' && this.k >= 1 ? Math.sin(t * 0.5 + this.seed) * 0.25 : 0)); if (tilt) this.obj.quaternion.premultiply(tilt);
  }
  update(dt, t) {
    const s = this.sys, d = s.decor;
    if (this.kind === 'fixed') return;
    if (this.kind === 'hop') {
      if (this.k < 1) { this.k = Math.min(1, this.k + dt / this.dur); const e = this.k * this.k * (3 - 2 * this.k); this.pos.lerpVectors(this.from, this.to, e); this.pos.y += Math.sin(this.k * Math.PI) * this.arc; }
      else { this.timer -= dt; if (this.timer <= 0) { this.timer = rr(7, 20); const q = this.freePerch(5.5); if (q) { if (this.perch) this.perch.busy = null; this.perch = q; q.busy = this; this.from.copy(this.pos); this.to.copy(q.p); this.n.copy(q.n);
        const dist = this.from.distanceTo(this.to); this.dur = 1.2 + dist * 0.9; this.arc = 0.3 + dist * 0.12; this.k = 0; this.yaw = Math.atan2(-(this.to.z - this.from.z), this.to.x - this.from.x); } } }
      this.orient(t); return;
    }
    const dx = this.to.x - this.pos.x, dz = this.to.z - this.pos.z, dist = Math.hypot(dx, dz);
    if (dist < 0.06) { this.timer -= dt; if (this.timer <= 0) { this.to.copy(s.sandPoint(this.pos, this.walker ? 3 : 1.6)); this.timer = this.walker ? rr(1, 5) : rr(4, 14); } }
    else { const gait = this.walker ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 5 + this.seed)) : 1, st = Math.min(dist, this.speed * gait * dt);
      this.pos.x += dx / dist * st; this.pos.z += dz / dist * st;
      if (this.walker) { let da = Math.atan2(-dz, dx) - this.yaw; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; this.yaw += da * Math.min(1, dt * 3); if (!this.b.calm) this.b.mesh.rotation.z = Math.sin(t * 9 + this.seed) * 0.05 * gait; }
      else this.yaw += dt * 0.03; }
    this.pos.y = d.floor(this.pos.x, this.pos.z);
    this.orient(t);
  }
  dispose() {
    if (this.perch) this.perch.busy = null;
    if (this.host) { const a = this.sys.decor.anemones, i = a.indexOf(this.host); if (i >= 0) a.splice(i, 1); this.sys.hosts = {}; for (const f of this.sys.fish) f.home = null; }
    this.b.mesh.geometry.dispose();
  }
}

const THUMBS = {};
OD.Inverts = {
  ids: Object.keys(BUILD), kit: { meshOf: meshOf, curve: curve, nz: nz },
  register(id, fn) { BUILD[id] = fn; }, build(id, o) { return BUILD[id](o); },
  create(id, sys) { return BUILD[id] ? new Invert(sys, id) : null; },
  thumb(id, aq, w, h) {
    const key = id + w; if (THUMBS[key]) return THUMBS[key];
    const b = BUILD[id](), g = new T.Group(); b.mesh.scale.setScalar(b.scale); g.add(b.mesh);
    const cv = aq.snapshot(g, w * 2, h * 2, b.view); b.mesh.geometry.dispose();
    return (THUMBS[key] = cv);
  }
};
})();
