/* Ocean Dream — decorations.js
   Générateurs procéduraux : roches, coraux, gorgones, anémones, plantes, épave, torii, lanterne…
   Tout est modélisé par le code (aucune ressource externe). */
(function () {
'use strict';
const T = THREE, OD = window.OD, C = OD.C, lerp = OD.lerp, clamp = OD.clamp, sstep = OD.sstep;
const V = (x, y, z) => new T.Vector3(x, y, z);
const UP = V(0, 1, 0);
const _c = new T.Color(), _c2 = new T.Color();

/* ---------- icosphère indexée (sommets partagés) ---------- */
const _ico = {};
function ico(detail) {
  if (_ico[detail]) return _ico[detail];
  const t = (1 + Math.sqrt(5)) / 2;
  let v = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
  let f = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
  const norm = () => { for (let i = 0; i < v.length; i += 3) { const l = Math.hypot(v[i], v[i + 1], v[i + 2]); v[i] /= l; v[i + 1] /= l; v[i + 2] /= l; } };
  norm();
  for (let d = 0; d < detail; d++) {
    const nf = [], cache = new Map();
    const mid = (a, b) => { const k = a < b ? a * 100000 + b : b * 100000 + a; let m = cache.get(k);
      if (m === undefined) { m = v.length / 3; v.push((v[a * 3] + v[b * 3]) / 2, (v[a * 3 + 1] + v[b * 3 + 1]) / 2, (v[a * 3 + 2] + v[b * 3 + 2]) / 2); cache.set(k, m); } return m; };
    for (let i = 0; i < f.length; i += 3) { const a = f[i], b = f[i + 1], c = f[i + 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca); }
    f = nf; norm();
  }
  return (_ico[detail] = { v: new Float32Array(v), f: new Uint32Array(f) });
}

/* ---------- accumulateur de maillage (position, couleur, ondulation, fluorescence) ---------- */
class MW {
  constructor() { this.p = []; this.c = []; this.s = []; this.g = []; this.i = []; this.n = 0; }
  v(x, y, z, col, sw, ph, gl) { this.p.push(x, y, z); this.c.push(col.r, col.g, col.b); this.s.push(sw || 0, ph || 0); this.g.push(gl || 0); return this.n++; }
  tube(pts, rad, seg, col, o) {
    o = o || {}; const n = pts.length, tan = V(0, 0, 0), N = V(0, 0, 0), B = V(0, 0, 0), first = this.n; let pn = null;
    for (let k = 0; k < n; k++) {
      tan.subVectors(pts[Math.min(n - 1, k + 1)], pts[Math.max(0, k - 1)]).normalize();
      if (!pn) { N.set(1, 0, 0); if (Math.abs(tan.x) > 0.9) N.set(0, 0, 1); N.addScaledVector(tan, -N.dot(tan)).normalize(); pn = N.clone(); }
      else { N.copy(pn).addScaledVector(tan, -pn.dot(tan)).normalize(); pn.copy(N); }
      B.crossVectors(tan, N);
      const t = k / (n - 1), r = typeof rad === 'function' ? rad(t) : rad, sw = o.sway ? o.sway(t) : 0, gl = o.glow ? (typeof o.glow === 'function' ? o.glow(t) : o.glow) : 0, P = pts[k];
      for (let j = 0; j < seg; j++) { const an = j / seg * 6.2832, cs = Math.cos(an) * r, sn = Math.sin(an) * r, c = col(t, j);
        this.v(P.x + N.x * cs + B.x * sn, P.y + N.y * cs + B.y * sn, P.z + N.z * cs + B.z * sn, c, sw, o.phase || 0, gl); }
    }
    for (let k = 0; k < n - 1; k++) for (let j = 0; j < seg; j++) { const a = first + k * seg + j, b = first + k * seg + (j + 1) % seg; this.i.push(a, a + seg, b, b, a + seg, b + seg); }
    if (o.cap !== false) { const P = pts[n - 1], r = (typeof rad === 'function' ? rad(1) : rad) * (o.capLen !== undefined ? o.capLen : 0.8), c = col(1, 0);
      const tip = this.v(P.x + tan.x * r, P.y + tan.y * r, P.z + tan.z * r, c, o.sway ? o.sway(1) : 0, o.phase || 0, o.glow ? (typeof o.glow === 'function' ? o.glow(1) : o.glow) : 0), b0 = first + (n - 1) * seg;
      for (let j = 0; j < seg; j++) this.i.push(b0 + j, tip, b0 + (j + 1) % seg); }
  }
  lathe(p, axis, prof, seg, col, o) {
    o = o || {}; const N = V(1, 0, 0); if (Math.abs(axis.x) > 0.9) N.set(0, 0, 1); N.addScaledVector(axis, -N.dot(axis)).normalize(); const B = V(0, 0, 0).crossVectors(axis, N), first = this.n, m = prof.length;
    for (let i = 0; i < m; i++) { const h = prof[i][0], r0 = prof[i][1], sw = o.sway ? o.sway(i) : 0, gl = o.glow ? (typeof o.glow === 'function' ? o.glow(i) : o.glow) : 0;
      for (let j = 0; j < seg; j++) { const an = j / seg * 6.2832, r = r0 * (o.rf ? o.rf(an, i) : 1), cs = Math.cos(an) * r, sn = Math.sin(an) * r, c = col(i, j);
        this.v(p.x + axis.x * h + N.x * cs + B.x * sn, p.y + axis.y * h + N.y * cs + B.y * sn, p.z + axis.z * h + N.z * cs + B.z * sn, c, sw, o.phase || 0, gl); } }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < seg; j++) { const a = first + i * seg + j, b = first + i * seg + (j + 1) % seg; this.i.push(a, a + seg, b, b, a + seg, b + seg); }
  }
  blob(c, r, detail, col, o) {
    o = o || {}; const I = ico(detail), first = this.n, rx = r.x !== undefined ? r.x : r, ry = r.y !== undefined ? r.y : r, rz = r.z !== undefined ? r.z : r;
    for (let i = 0; i < I.v.length; i += 3) { const ux = I.v[i], uy = I.v[i + 1], uz = I.v[i + 2], d = o.disp ? o.disp(ux, uy, uz) : 1;
      this.v(c.x + ux * rx * d, c.y + uy * ry * d, c.z + uz * rz * d, col(ux, uy, uz), typeof o.sway === 'function' ? o.sway(ux, uy, uz) : (o.sway || 0), o.phase || 0, typeof o.glow === 'function' ? o.glow(ux, uy, uz) : (o.glow || 0)); }
    for (let i = 0; i < I.f.length; i += 3) this.i.push(first + I.f[i], first + I.f[i + 1], first + I.f[i + 2]);
  }
  /* pavé à faces plates ; m : Matrix4 ; taille sx, sy, sz ; col(k) -> couleur du coin */
  box(m, sx, sy, sz, col, gl) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, P = V(0, 0, 0);
    const F = [[[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]],
      [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]];
    for (const f of F) { const b = this.n; for (const q of f) { P.set(q[0] * hx, q[1] * hy, q[2] * hz).applyMatrix4(m); this.v(P.x, P.y, P.z, typeof col === 'function' ? col(P, q) : col, 0, 0, gl || 0); } this.i.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  }
  quad(a, b, c, d, col, gl) { const k = this.n; this.v(a.x, a.y, a.z, col, 0, 0, gl); this.v(b.x, b.y, b.z, col, 0, 0, gl); this.v(c.x, c.y, c.z, col, 0, 0, gl); this.v(d.x, d.y, d.z, col, 0, 0, gl); this.i.push(k, k + 1, k + 2, k, k + 2, k + 3); }
  append(o, m) {
    const b = this.n, P = V(0, 0, 0);
    for (let i = 0; i < o.n; i++) { P.set(o.p[i * 3], o.p[i * 3 + 1], o.p[i * 3 + 2]); if (m) P.applyMatrix4(m); this.p.push(P.x, P.y, P.z); this.c.push(o.c[i * 3], o.c[i * 3 + 1], o.c[i * 3 + 2]); this.s.push(o.s[i * 2], o.s[i * 2 + 1]); this.g.push(o.g[i]); }
    for (let i = 0; i < o.i.length; i++) this.i.push(o.i[i] + b); this.n += o.n;
  }
  build() {
    if (!this.n) return null;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aSway', new T.Float32BufferAttribute(this.s, 2)); g.setAttribute('aGlow', new T.Float32BufferAttribute(this.g, 1));
    g.setIndex(this.i); g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  }
}
OD.MW = MW; OD.ico = ico;

/* ---------- contexte de construction d'un décor ---------- */
class Ctx {
  constructor(seed, o) {
    this.rng = OD.rng(seed); this.nz = new OD.Noise(seed);
    this.rock = new MW(); this.coral = new MW(); this.sway = new MW(); this.prop = new MW();
    this.obstacles = []; this.perches = []; this.pois = []; this.hides = []; this.anemones = []; this.bubbles = []; this.lights = []; this.extra = [];
    this.pal = o.pal; this.floorFn = o.floor; this.rake = [];
  }
  floor(x, z) { return this.floorFn(x, z); }
  poi(p, r, kind) { this.pois.push({ p: p.clone(), r: r, kind: kind || 'coral' }); }
  inside(p, skip) { for (const ob of this.obstacles) { if (ob === skip) continue; const dx = (p.x - ob.x) / ob.rx, dy = (p.y - ob.y) / ob.ry, dz = (p.z - ob.z) / ob.rz; if (dx * dx + dy * dy + dz * dz < 0.72) return true; } return false; }
}
OD.Ctx = Ctx;

const G = OD.Gen = {};
const pick = (ctx, pal, def) => { const a = pal || def; return a[(ctx.rng() * a.length) | 0]; };
const rnd3 = (r, k) => V((r() - 0.5) * 2 * k, (r() - 0.5) * 2 * k, (r() - 0.5) * 2 * k);

/* ---------- roche ---------- */
G.rock = function (ctx, o) {
  const mw = o.mw || ctx.rock, nz = ctx.nz, I = ico(o.detail || 3), c = o.c, rx = o.r[0], ry = o.r[1], rz = o.r[2];
  const off = o.seed !== undefined ? o.seed : ctx.rng() * 100, rough = o.rough !== undefined ? o.rough : 0.3;
  const fl = o.floor !== undefined ? o.floor : ctx.floor(c.x, c.z), pal = o.pal || ctx.pal;
  const cb = C(pal[0]), cd = C(pal[1]), ca = C(pal[2]), ca2 = C(pal[3]), alg = o.algae !== undefined ? o.algae : 1;
  const disp = (x, y, z) => 1 + rough * 1.5 * nz.fbm(x * 1.3 + off, y * 1.3 + off * 0.7, z * 1.3 - off, 4) + rough * 0.6 * (0.5 - Math.abs(nz.n3(x * 2.9 - off, y * 2.9, z * 2.9 + off))) - rough * 0.34 * Math.pow(Math.abs(nz.n3(x * 5.7 + off, y * 5.7 - off, z * 5.7)), 0.6);
  const first = mw.n;
  for (let i = 0; i < I.v.length; i += 3) {
    const ux = I.v[i], uy = I.v[i + 1], uz = I.v[i + 2], d = disp(ux, uy, uz);
    const x = c.x + ux * rx * d, z = c.z + uz * rz * d; let y = c.y + uy * ry * d;
    if (o.flat !== false && y < fl - 0.25) y = fl - 0.25 - (fl - 0.25 - y) * 0.12;
    const n1 = nz.fbm(x * 0.7 + off, y * 0.7, z * 0.7, 3) * 0.5 + 0.5;
    _c.copy(cd).lerp(cb, clamp(n1 * 1.25 + (d - 1) * 1.3, 0, 1));
    const al = nz.n3(x * 0.42 + off * 2, y * 0.42, z * 0.42 - off);
    if (al > 0.02 && alg > 0) _c.lerp(al > 0.3 ? ca2 : ca, clamp((al - 0.02) * 2.4, 0, 0.8) * alg);
    const ao = o.hang ? 1 : 0.45 + 0.55 * sstep(fl - 0.2, fl + 1.7, y);
    _c.multiplyScalar(ao * (0.82 + 0.3 * Math.max(0, uy)));
    mw.v(x, y, z, _c, 0, 0, 0);
  }
  for (let i = 0; i < I.f.length; i += 3) mw.i.push(first + I.f[i], first + I.f[i + 1], first + I.f[i + 2]);
  const ob = { x: c.x, y: c.y, z: c.z, rx: rx * 0.95, ry: ry * 0.95, rz: rz * 0.95 };
  if (o.obstacle !== false) ctx.obstacles.push(ob);
  return { c: c, r: [rx, ry, rz], ob: ob, at(ux, uy, uz) {
    const l = Math.hypot(ux, uy, uz) || 1; ux /= l; uy /= l; uz /= l; const d = disp(ux, uy, uz);
    return { p: V(c.x + ux * rx * d, Math.max(c.y + uy * ry * d, fl - 0.15), c.z + uz * rz * d), n: V(ux / rx, uy / ry, uz / rz).normalize() }; } };
};

/* amas rocheux : une grosse roche et ses satellites */
G.mound = function (ctx, x, z, w, h, d, o) {
  o = o || {}; const r = ctx.rng, fy = ctx.floor(x, z), rocks = [], rough = o.rough !== undefined ? o.rough : 0.36;
  rocks.push(G.rock(ctx, { c: V(x, fy + h * 0.3, z), r: [w * 0.46, h * 0.56, d * 0.46], detail: o.detail || 5, rough: rough, pal: o.pal, algae: o.algae }));
  const n = o.n !== undefined ? o.n : 5 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, k = 0.24 + r() * 0.2, up = i < 2 ? 0.55 + r() * 0.3 : r() * 0.5, cx = x + Math.cos(a) * w * (0.24 + 0.26 * r()) * (1 - up * 0.5), cz = z + Math.sin(a) * d * (0.24 + 0.26 * r()) * (1 - up * 0.5);
    rocks.push(G.rock(ctx, { c: V(cx, ctx.floor(cx, cz) + h * (0.06 + up * 0.8), cz), r: [w * k * (0.8 + r() * 0.5), h * k * (0.6 + r() * 0.45), d * k * (0.8 + r() * 0.5)], detail: 4, rough: rough, pal: o.pal, algae: o.algae, flat: up < 0.3 }));
  }
  const top = rocks[0].at(0.1, 1, 0.25); ctx.perches.push({ p: top.p, n: top.n });
  for (let i = 0; i < 2; i++) { const pr = rocks[(r() * rocks.length) | 0].at(r() - 0.5, 0.6 + r() * 0.4, 0.2 + r() * 0.6); if (!ctx.inside(pr.p)) ctx.perches.push(pr); }
  ctx.hides.push({ p: V(x + (r() - 0.5) * w * 0.4, fy + 0.5 + r() * h * 0.45, z - d * 0.5 - 0.9 - r() * 0.5) });
  ctx.hides.push({ p: V(x + (r() < 0.5 ? -1 : 1) * (w * 0.5 + 0.6), fy + 0.45 + r() * h * 0.3, z - d * 0.3) });
  return rocks;
};

/* habille des roches avec des coraux : recipe = [[nom, nombre, options], …] */
G.dress = function (ctx, rocks, recipe, o) {
  o = o || {}; const r = ctx.rng;
  for (const it of recipe) {
    const name = it[0], count = it[1], opt = it[2] || {};
    for (let i = 0, tries = 0; i < count && tries < count * 6; tries++) {
      const rk = rocks[(r() * rocks.length) | 0];
      const s = rk.at((r() - 0.5) * 2, opt.side ? 0.02 + r() * 0.45 : (opt.top ? 0.7 + r() * 0.3 : 0.22 + r() * 0.78), o.all ? (r() - 0.5) * 2 : -0.3 + r() * 1.3);
      if (ctx.inside(s.p, rk.ob)) continue;
      const size = (opt.s ? opt.s[0] + r() * (opt.s[1] - opt.s[0]) : 0.6 + r() * 0.5) * (o.scale || 1);
      s.p.addScaledVector(s.n, -0.04);
      G[name](ctx, s.p, s.n, size, opt); i++;
    }
  }
};

/* ---------- coraux durs ---------- */
const STAG = [['#b08a55', '#fff0c8'], ['#3f5fc8', '#b8d2ff'], ['#c8528a', '#ffd0e4'], ['#4a9a62', '#d6ffc0'], ['#7446b8', '#dcc0ff'], ['#c9a030', '#fff3a8']];
G.staghorn = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.coral, r = ctx.rng, pl = pick(ctx, o.pal, STAG), c0 = C(pl[0]), c1 = C(pl[1]);
  const maxD = o.depth || 4, spread = o.spread !== undefined ? o.spread : 0.8, thick = o.thick || 1, lift = o.lift !== undefined ? o.lift : 0.4;
  const grow = (st, dir, len, rad, dep) => {
    const end = st.clone().addScaledVector(dir, len).add(rnd3(r, len * 0.07)), mid = st.clone().lerp(end, 0.5).add(rnd3(r, len * 0.06));
    const ta = 1 - (dep + 1) / maxD, tb = 1 - dep / maxD;
    mw.tube([st, mid, end], t => rad * (1 - 0.32 * t), dep > 1 ? 6 : 5, t => _c.copy(c0).lerp(c1, Math.pow(lerp(ta, tb, t), 1.6)), { cap: dep === 0, glow: dep === 0 ? (t => t * 0.9) : (dep === 1 ? 0.15 : 0) });
    if (dep > 0) { const k = 2 + (r() < 0.5 ? 1 : 0); for (let i = 0; i < k; i++) { const nd = dir.clone().multiplyScalar(0.62).add(rnd3(r, spread)).add(V(0, lift, 0)).normalize(); grow(end, nd, len * (0.6 + r() * 0.25), rad * 0.72, dep - 1); } }
  };
  const stems = o.stems || 3;
  for (let i = 0; i < stems; i++) grow(p.clone(), n.clone().add(rnd3(r, 0.55)).normalize(), s * (0.32 + r() * 0.2), s * 0.065 * thick, maxD - 1);
  ctx.poi(p.clone().addScaledVector(n, s * 0.9).add(V(0, 0.2, 0)), s, 'coral');
};
G.bushy = function (ctx, p, n, s, o) { o = Object.assign({ depth: 3, spread: 1.0, thick: 1.5, stems: 4, lift: 0.3, pal: [['#b0507a', '#ffc6de'], ['#8a6a3a', '#ffe9b0'], ['#4f8a4a', '#d4ffb0'], ['#b06a2a', '#ffd6a0']] }, o || {}); G.staghorn(ctx, p, n, s * 0.8, o); };

G.table = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.coral, r = ctx.rng, pl = pick(ctx, o.pal, [['#8f744c', '#ecd9a6'], ['#566cb4', '#bccbff'], ['#6f8f58', '#e4f6b4'], ['#9a5a84', '#ffd0ec']]), c0 = C(pl[0]), c1 = C(pl[1]);
  const up = V(n.x * 0.3, 1, n.z * 0.3).normalize(), h = s * (0.28 + r() * 0.25), top = p.clone().addScaledVector(up, h);
  mw.tube([p.clone().addScaledVector(up, -0.12), p.clone().addScaledVector(up, h * 0.5), top], t => s * (0.17 - 0.07 * t + 0.1 * t * t), 7, () => _c.copy(c0).multiplyScalar(0.8), { cap: false });
  const R = s * (0.85 + r() * 0.35), rings = 6, segs = 26, ph = r() * 10, tx = (r() - 0.5) * 0.3, tz = (r() - 0.5) * 0.3, first = mw.n;
  const yAt = (q, a, rr) => top.y + s * 0.13 * q * q + Math.cos(a) * rr * tx + Math.sin(a) * rr * tz;
  mw.v(top.x, top.y, top.z, c0, 0, 0, 0);
  for (let i = 1; i <= rings; i++) for (let j = 0; j < segs; j++) {
    const a = j / segs * 6.2832, e = 1 + 0.15 * Math.sin(a * 3 + ph) + 0.09 * Math.sin(a * 7 + ph * 2), q = i / rings, rr = R * q * lerp(1, e, q);
    _c.copy(c0).lerp(c1, Math.pow(q, 1.7));
    mw.v(top.x + Math.cos(a) * rr, yAt(q, a, rr) + (i === rings ? Math.sin(a * 9 + ph) * 0.02 * s : 0), top.z + Math.sin(a) * rr, _c, 0, 0, i >= rings - 1 ? 0.7 : 0.05);
  }
  for (let j = 0; j < segs; j++) mw.i.push(first, first + 1 + j, first + 1 + (j + 1) % segs);
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < segs; j++) { const a = first + 1 + i * segs + j, b = first + 1 + i * segs + (j + 1) % segs; mw.i.push(a, a + segs, b, b, a + segs, b + segs); }
  const nn = Math.round(24 * s * s) + 10;
  for (let k = 0; k < nn; k++) { const a = r() * 6.283, q = Math.sqrt(r()) * 0.9, rr = R * q, bx = top.x + Math.cos(a) * rr, bz = top.z + Math.sin(a) * rr, by = yAt(q, a, rr), hh = s * (0.05 + r() * 0.06);
    mw.tube([V(bx, by - 0.01, bz), V(bx + (r() - 0.5) * 0.03, by + hh, bz + (r() - 0.5) * 0.03)], t => s * 0.024 * (1 - t * 0.55), 4, t => _c.copy(c0).lerp(c1, 0.45 + t * 0.55), { glow: t => t * 0.8 }); }
  ctx.poi(V(top.x, top.y + 0.55, top.z), R, 'coral'); ctx.perches.push({ p: V(top.x, top.y + 0.1, top.z), n: UP.clone() });
};

G.brain = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.coral, nz = ctx.nz, pl = pick(ctx, o.pal, [['#c2ae72', '#3f7a3a'], ['#cf9462', '#2f8a7a'], ['#a99cc0', '#58468a'], ['#d0b890', '#8a4a3a']]), c0 = C(pl[0]), c1 = C(pl[1]);
  const big = s > 0.7, I = ico(big ? 5 : 4), off = ctx.rng() * 50, bands = big ? 11 : 7.5, c = p.clone().addScaledVector(n, s * 0.22), first = mw.n;
  for (let i = 0; i < I.v.length; i += 3) {
    const ux = I.v[i], uy = I.v[i + 1], uz = I.v[i + 2];
    const m = nz.n3(ux * 2.1 + off, uy * 2.1, uz * 2.1 + off) + 0.45 * nz.n3(ux * 4.6, uy * 4.6 + off, uz * 4.6);
    const rd = Math.pow(Math.abs(Math.sin(m * bands)), 0.7), rad = s * (1 + 0.05 * rd) * (1 + 0.09 * nz.n3(ux * 1.2 + off, uy * 1.2, uz * 1.2));
    _c.copy(c1).lerp(c0, rd).multiplyScalar(0.7 + 0.3 * Math.max(0, uy + 0.3));
    mw.v(c.x + ux * rad, c.y + uy * rad * 0.72, c.z + uz * rad, _c, 0, 0, (1 - rd) * 0.9);
  }
  for (let i = 0; i < I.f.length; i += 3) mw.i.push(first + I.f[i], first + I.f[i + 1], first + I.f[i + 2]);
  ctx.obstacles.push({ x: c.x, y: c.y, z: c.z, rx: s, ry: s * 0.72, rz: s });
  ctx.poi(V(c.x, c.y + s * 0.72 + 0.45, c.z), s, 'coral'); ctx.perches.push({ p: V(c.x, c.y + s * 0.75, c.z), n: UP.clone() });
};

G.plates = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.coral, r = ctx.rng, pl = pick(ctx, o.pal, [['#6f469c', '#ecc2ff'], ['#b0572c', '#ffc890'], ['#2c8a6a', '#bcffdc'], ['#a8467a', '#ffc6e0'], ['#8a7a2a', '#fff0a0']]), c0 = C(pl[0]), c1 = C(pl[1]);
  const k = 3 + ((r() * 3) | 0), rings = 5, segs = 14;
  for (let q = 0; q < k; q++) {
    const R = s * (0.45 + r() * 0.5), arc = Math.PI * (0.8 + r() * 0.9), yaw = r() * 6.283, cx = p.x + (r() - 0.5) * s * 0.5, cz = p.z + (r() - 0.5) * s * 0.5, cy = p.y + q * s * 0.15 - 0.06, slope = 0.3 + r() * 0.35, ph = r() * 9, first = mw.n;
    for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) { const f = i / rings, rr = R * (0.1 + 0.9 * f), a = yaw + (j / segs - 0.5) * arc, wv = Math.sin(j / segs * arc * 4 + ph) * 0.08 * rr * f;
      _c.copy(c0).lerp(c1, f * f); mw.v(cx + Math.cos(a) * rr, cy + rr * slope + wv, cz + Math.sin(a) * rr, _c, 0, 0, i === rings ? 0.9 : 0.12 * f); }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a = first + i * (segs + 1) + j; mw.i.push(a, a + segs + 1, a + 1, a + 1, a + segs + 1, a + segs + 2); }
  }
  ctx.poi(V(p.x, p.y + s * 0.8, p.z), s * 0.8, 'coral');
};

G.sponge = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.coral, r = ctx.rng, pl = pick(ctx, o.pal, [['#c29a1c', '#ffe884'], ['#74399c', '#dca4ff'], ['#2869bc', '#9ed2ff'], ['#bc4c28', '#ffb284'], ['#cc466c', '#ffb4ca']]), c0 = C(pl[0]), c1 = C(pl[1]);
  const dark = _c2.copy(c0).multiplyScalar(0.22).clone(), k = o.k || 3 + ((r() * 4) | 0);
  for (let q = 0; q < k; q++) {
    const h = s * (0.5 + r() * 0.8), rad = s * (0.09 + r() * 0.06), ax = V((r() - 0.5) * 0.5 + n.x * 0.3, 1, (r() - 0.5) * 0.5 + n.z * 0.3).normalize(), b = p.clone().add(V((r() - 0.5) * s * 0.4, -0.06, (r() - 0.5) * s * 0.4));
    mw.lathe(b, ax, [[0, rad * 0.7], [h * 0.3, rad], [h * 0.7, rad * 1.25], [h * 0.95, rad * 1.15], [h, rad], [h * 0.97, rad * 0.72], [h * 0.6, rad * 0.5]], 8, i => i >= 5 ? dark : _c.copy(c0).lerp(c1, i / 4), { glow: i => i < 5 ? i * 0.12 : 0 });
  }
  ctx.poi(V(p.x, p.y + s, p.z), s * 0.6, 'coral');
};

/* coraux-tubes orange des surplombs (Tubastraea) */
G.cups = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.coral, r = ctx.rng, pl = pick(ctx, o.pal, [['#e0641a', '#ffd23a'], ['#d8402a', '#ffb060'], ['#e89a1a', '#fff08a']]), c0 = C(pl[0]), c1 = C(pl[1]), k = 6 + ((r() * 8) | 0);
  for (let q = 0; q < k; q++) {
    const ax = n.clone().add(rnd3(r, 0.6)).normalize(), b = p.clone().add(rnd3(r, s * 0.3)), h = s * (0.12 + r() * 0.14), rad = s * (0.05 + r() * 0.025);
    mw.lathe(b, ax, [[0, rad * 0.8], [h, rad], [h * 1.02, rad * 0.55], [h * 0.8, 0.001]], 7, i => i >= 2 ? c1 : c0, { glow: i => i >= 1 ? 1 : 0.3 });
    for (let j = 0; j < 8; j++) { const a = j / 8 * 6.283, e = V(1, 0, 0); if (Math.abs(ax.x) > 0.9) e.set(0, 0, 1); e.addScaledVector(ax, -e.dot(ax)).normalize(); const f = V(0, 0, 0).crossVectors(ax, e);
      const st = b.clone().addScaledVector(ax, h).addScaledVector(e, Math.cos(a) * rad * 0.8).addScaledVector(f, Math.sin(a) * rad * 0.8);
      mw.tube([st, st.clone().addScaledVector(ax, rad * 1.1).addScaledVector(e, Math.cos(a) * rad * 1.2).addScaledVector(f, Math.sin(a) * rad * 1.2)], t => rad * 0.16 * (1 - t * 0.5), 3, () => c1, { glow: 1.2 }); }
  }
};

/* tapis de zoanthus / champignons : petits disques fluorescents plaqués sur la roche */
G.zoas = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.coral, r = ctx.rng, pl = pick(ctx, o.pal, [['#35d07a', '#ff7a2a', '#ffe14a'], ['#ff4f9a', '#3ad0ff', '#b5ff5a'], ['#ffb02a', '#b04aff', '#49ffd0'], ['#3a8aff', '#ff5a5a', '#fff07a'], ['#a8ff3a', '#ff3aa8', '#40e0ff']]);
  const cc = C(pl[0]), cr = C(pl[1]), ce = C(pl[2]), e1 = V(1, 0, 0); if (Math.abs(n.x) > 0.9) e1.set(0, 0, 1); e1.addScaledVector(n, -e1.dot(n)).normalize(); const e2 = V(0, 0, 0).crossVectors(n, e1);
  const count = o.count || Math.round(14 + r() * 16), big = o.big ? 2.4 : 1;
  for (let k = 0; k < count; k++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * s * 0.55, rad = (0.045 + r() * 0.035) * big, cx = p.x + e1.x * Math.cos(a) * d + e2.x * Math.sin(a) * d + n.x * 0.05, cy = p.y + e1.y * Math.cos(a) * d + e2.y * Math.sin(a) * d + n.y * 0.05, cz = p.z + e1.z * Math.cos(a) * d + e2.z * Math.sin(a) * d + n.z * 0.05;
    const f = mw.n, seg = 8; mw.v(cx + n.x * 0.012, cy + n.y * 0.012, cz + n.z * 0.012, cc, 0, 0, 1.3);
    for (let j = 0; j < seg; j++) { const b = j / seg * 6.283, x1 = Math.cos(b), y1 = Math.sin(b); mw.v(cx + (e1.x * x1 + e2.x * y1) * rad * 0.6 + n.x * 0.025, cy + (e1.y * x1 + e2.y * y1) * rad * 0.6 + n.y * 0.025, cz + (e1.z * x1 + e2.z * y1) * rad * 0.6 + n.z * 0.025, cr, 0, 0, 1.1); }
    for (let j = 0; j < seg; j++) { const b = j / seg * 6.283, x1 = Math.cos(b), y1 = Math.sin(b); mw.v(cx + (e1.x * x1 + e2.x * y1) * rad, cy + (e1.y * x1 + e2.y * y1) * rad, cz + (e1.z * x1 + e2.z * y1) * rad, ce, 0, 0, 0.9); }
    for (let j = 0; j < seg; j++) { const j2 = (j + 1) % seg; mw.i.push(f, f + 1 + j, f + 1 + j2, f + 1 + j, f + 1 + seg + j, f + 1 + j2, f + 1 + j2, f + 1 + seg + j, f + 1 + seg + j2); }
  }
};

/* bénitier (Tridacna) : coquille cannelée et manteau fluorescent */
G.clam = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.coral, r = ctx.rng, pl = pick(ctx, o.pal, [['#1a5fff', '#39e6c8'], ['#7a2aff', '#3ac0ff'], ['#0fb07a', '#ffe14a'], ['#2a3aff', '#c04aff']]), m0 = C(pl[0]), m1 = C(pl[1]), sh0 = C('#e9e2d0'), sh1 = C('#a89f8a');
  const yaw = r() * 3.14, cy = Math.cos(yaw), sy = Math.sin(yaw), segs = 30, rows = 5, first = mw.n, fl = 6;
  const P = (a, rr, y) => V(p.x + (Math.cos(a) * rr * cy - Math.sin(a) * rr * 0.62 * sy), p.y + y, p.z + (Math.cos(a) * rr * sy + Math.sin(a) * rr * 0.62 * cy));
  for (let i = 0; i <= rows; i++) for (let j = 0; j < segs; j++) { const a = j / segs * 6.2832, f = i / rows, w = Math.cos(a * fl), rr = s * (0.15 + 0.85 * Math.pow(f, 0.7)) * (1 + 0.1 * w * f), q = P(a, rr, s * 0.55 * Math.pow(f, 1.6) + s * 0.07 * w * f - 0.05);
    _c.copy(sh1).lerp(sh0, 0.5 + 0.5 * w); mw.v(q.x, q.y, q.z, _c, 0, 0, 0); }
  for (let i = 0; i < rows; i++) for (let j = 0; j < segs; j++) { const a = first + i * segs + j, b = first + i * segs + (j + 1) % segs; mw.i.push(a, a + segs, b, b, a + segs, b + segs); }
  const f2 = mw.n, c = P(0, 0, s * 0.36); mw.v(c.x, c.y, c.z, _c.copy(m0).multiplyScalar(0.15), 0, 0, 0.2);
  for (let i = 1; i <= 3; i++) for (let j = 0; j < segs; j++) { const a = j / segs * 6.2832, f = i / 3, w = Math.cos(a * fl), q = P(a, s * 0.93 * f * (1 + 0.1 * w * f), s * (0.36 + 0.17 * f * f) + s * 0.06 * w * f + (i === 3 ? 0.02 : 0));
    _c.copy(i === 1 ? m0 : m1).lerp(m0, (j % 2) * 0.7); if (i === 1) _c.multiplyScalar(0.55); mw.v(q.x, q.y, q.z, _c, 0, 0, i === 1 ? 0.5 : 1.4); }
  for (let j = 0; j < segs; j++) mw.i.push(f2, f2 + 1 + j, f2 + 1 + (j + 1) % segs);
  for (let i = 0; i < 2; i++) for (let j = 0; j < segs; j++) { const a = f2 + 1 + i * segs + j, b = f2 + 1 + i * segs + (j + 1) % segs; mw.i.push(a, a + segs, b, b, a + segs, b + segs); }
  ctx.poi(V(p.x, p.y + s * 0.9, p.z), s, 'coral');
};

/* ---------- coraux mous, gorgones, anémones, plantes (bucket « sway ») ---------- */
const FANS = [['#c8281e', '#ff8a5a'], ['#e0701a', '#ffd08a'], ['#d8b01a', '#fff2a0'], ['#7a2ab0', '#e0a0ff'], ['#c8286a', '#ffa8c8'], ['#f0e8d8', '#ffffff']];
G.fan = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.sway, r = ctx.rng, pl = pick(ctx, o.pal, FANS), c0 = C(pl[0]), c1 = C(pl[1]);
  const yaw = o.yaw !== undefined ? o.yaw : (r() - 0.5) * 1.2, ex = V(Math.cos(yaw), 0, Math.sin(yaw)), ez = V(-Math.sin(yaw), 0, Math.cos(yaw)), ph = r() * 6.28, dep0 = o.depth || 6, swK = (o.swayK || 0.16) * s;
  const grow = (st, ang, len, rad, dep) => {
    const end = st.clone().addScaledVector(ex, Math.sin(ang) * len).addScaledVector(UP, Math.cos(ang) * len).addScaledVector(ez, (r() - 0.5) * len * 0.22);
    const h0 = Math.max(0, st.y - p.y) / s, h1 = Math.max(0, end.y - p.y) / s;
    mw.tube([st, st.clone().lerp(end, 0.5).addScaledVector(ex, (r() - 0.5) * len * 0.12), end], t => rad * (1 - 0.3 * t), dep > 2 ? 5 : 4, (t, j) => (j & 1) ? c1 : c0, { cap: dep === 0, sway: t => swK * Math.pow(lerp(h0, h1, t), 1.5), phase: ph, glow: dep < 2 ? 0.5 : 0.12 });
    if (dep > 0) { const k = (dep > 1 && r() < 0.28) ? 3 : 2; for (let i = 0; i < k; i++) { const da = (k === 2 ? (i ? 1 : -1) : (i - 1)) * (0.3 + r() * 0.3) + (r() - 0.5) * 0.15; let na = ang * 0.75 + da; na = clamp(na, -1.25, 1.25); grow(end, na, len * (0.66 + r() * 0.16), rad * 0.74, dep - 1); } }
  };
  grow(p.clone().add(V(0, -0.1, 0)), (r() - 0.5) * 0.2, s * 0.2, s * 0.032, dep0);
  ctx.poi(V(p.x, p.y + s * 0.6, p.z + 0.5), s * 0.7, 'coral');
};

G.whips = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.sway, r = ctx.rng, pl = pick(ctx, o.pal, [['#b8301e', '#ff9a6a'], ['#d08a1a', '#ffe08a'], ['#6a3aa8', '#d8a8ff'], ['#3a8a5a', '#c0ffc8'], ['#e8dcc8', '#ffffff']]), c0 = C(pl[0]), c1 = C(pl[1]), k = o.k || 5 + ((r() * 6) | 0), ph = r() * 6.28;
  for (let q = 0; q < k; q++) {
    const len = s * (0.8 + r() * 0.9), b = p.clone().add(V((r() - 0.5) * s * 0.25, -0.08, (r() - 0.5) * s * 0.25)), lean = V((r() - 0.5) * 0.5 + n.x * 0.3, 1, (r() - 0.5) * 0.5 + n.z * 0.3).normalize(), bend = rnd3(r, 0.25), pts = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(b.clone().addScaledVector(lean, len * t).addScaledVector(bend, len * t * t)); }
    mw.tube(pts, t => s * 0.03 * (1 - 0.45 * t) * (o.thick || 1), 5, (t, j) => (j & 1) ? c1 : c0, { sway: t => 0.22 * len * Math.pow(t, 1.7), phase: ph + q * 0.7, glow: 0.35 });
  }
  ctx.poi(V(p.x, p.y + s, p.z + 0.4), s * 0.6, 'coral');
};

G.softTree = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.sway, r = ctx.rng, pl = pick(ctx, o.pal, [['#ffd9e2', '#ff4f8a'], ['#ffe9d0', '#ff7a2e'], ['#f1dcff', '#a24dff'], ['#fff0c0', '#ffc21a'], ['#ffd0d0', '#e0283c']]), cs = C(pl[0]), cp = C(pl[1]), ph = r() * 6.28;
  const up = V(n.x * 0.4, 1, n.z * 0.4).normalize(), sw = h => 0.11 * s * Math.pow(Math.max(0, h), 1.5);
  const grow = (st, dir, len, rad, dep) => {
    const end = st.clone().addScaledVector(dir, len), h0 = (st.y - p.y) / s, h1 = (end.y - p.y) / s;
    mw.tube([st, st.clone().lerp(end, 0.5).add(V((r() - 0.5) * len * 0.15, 0, (r() - 0.5) * len * 0.15)), end], t => rad * (1 - 0.35 * t), 5, () => cs, { cap: false, sway: t => sw(lerp(h0, h1, t)), phase: ph, glow: 0.15 });
    if (dep > 0) { const k = 2 + ((r() * 2) | 0); for (let i = 0; i < k; i++) grow(end, dir.clone().multiplyScalar(0.7).add(V((r() - 0.5) * 1.1, r() * 0.55, (r() - 0.5) * 1.1)).normalize(), len * 0.62, rad * 0.62, dep - 1); }
    else { const m = 4 + ((r() * 4) | 0); for (let i = 0; i < m; i++) { const c = end.clone().add(V((r() - 0.5) * s * 0.3, (r() - 0.3) * s * 0.3, (r() - 0.5) * s * 0.3)), k = 0.8 + r() * 0.4;
      mw.blob(c, s * (0.05 + r() * 0.035), 1, () => _c.copy(cp).multiplyScalar(k), { sway: sw((c.y - p.y) / s), phase: ph, glow: 0.9 }); } }
  };
  grow(p.clone().addScaledVector(up, -0.06), up, s * 0.42, s * 0.075, 2);
  ctx.poi(V(p.x, p.y + s * 0.9, p.z + 0.3), s * 0.6, 'coral');
};

G.leather = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.sway, r = ctx.rng, pl = pick(ctx, o.pal, [['#b8a47c', '#f6e9c4'], ['#9aae6e', '#ecf8bc'], ['#c69c84', '#ffe4d0'], ['#b08ab0', '#f4d8f4']]), c0 = C(pl[0]), c1 = C(pl[1]);
  const up = V(n.x * 0.3, 1, n.z * 0.3).normalize(), ph = r() * 6.28, R = s * 0.6, b = p.clone().addScaledVector(up, -0.07);
  mw.lathe(b, up, [[0, s * 0.2], [s * 0.3, s * 0.15], [s * 0.5, s * 0.18], [s * 0.62, R * 0.9], [s * 0.68, R], [s * 0.72, R * 0.85], [s * 0.75, R * 0.4], [s * 0.74, 0.001]], 14, i => _c.copy(c0).lerp(c1, i / 7), { sway: i => i > 2 ? 0.025 * s : 0, phase: ph, rf: (a, i) => (i >= 3 && i <= 5) ? 1 + 0.08 * Math.sin(a * 5 + ph) : 1, glow: 0.1 });
  const top = b.clone().addScaledVector(up, s * 0.75), e1 = V(1, 0, 0).addScaledVector(up, -up.x).normalize(), e2 = V(0, 0, 0).crossVectors(up, e1), N = Math.round(42 * s) + 14;
  for (let k = 0; k < N; k++) { const a = r() * 6.283, q = Math.sqrt(r()) * 0.85 * R, st = top.clone().addScaledVector(e1, Math.cos(a) * q).addScaledVector(e2, Math.sin(a) * q), len = s * (0.1 + r() * 0.08);
    mw.tube([st, st.clone().addScaledVector(up, len).addScaledVector(e1, Math.cos(a) * len * 0.3).addScaledVector(e2, Math.sin(a) * len * 0.3)], t => s * 0.013, 3, () => c1, { sway: t => 0.03 * s + 0.07 * s * t, phase: ph + k, glow: 0.6 }); }
  ctx.poi(V(p.x, p.y + s, p.z + 0.3), R, 'coral'); ctx.perches.push({ p: top.clone().add(V(0, 0.06, 0)), n: UP.clone() });
};

const ANEM = [['#5aa83a', '#d8ff8a', '#ff5fa0', '#a86a4a'], ['#d8587a', '#ffb0c0', '#ffe9f0', '#8a3a5a'], ['#c8b890', '#fff4d0', '#b05aff', '#7a3ab0'], ['#3aa8a0', '#b8fff0', '#ffe14a', '#6a5a4a'], ['#e8842a', '#ffd08a', '#fff4d8', '#a04a2a']];
G.anemone = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.sway, r = ctx.rng, pl = o.pal ? pick(ctx, o.pal) : pick(ctx, null, ANEM), cT = C(pl[0]), cM = C(pl[1]), cTip = C(pl[2]), cCol = C(pl[3]);
  const up = V(n.x * 0.35, 1, n.z * 0.35).normalize(), e1 = V(1, 0, 0).addScaledVector(up, -up.x).normalize(), e2 = V(0, 0, 0).crossVectors(up, e1), ph = r() * 6.28, b = p.clone().addScaledVector(up, -0.08);
  mw.lathe(b, up, [[0, s * 0.4], [s * 0.2, s * 0.34], [s * 0.36, s * 0.5], [s * 0.42, s * 0.56], [s * 0.44, s * 0.3], [s * 0.42, 0.001]], 14, i => i >= 4 ? cT : cCol, { sway: i => i > 1 ? 0.012 * s : 0, phase: ph });
  const N = o.n || Math.round(70 + 40 * Math.min(1.4, s)), bubble = o.bubble !== false, R = s * 0.52, top = b.clone().addScaledVector(up, s * 0.42), swK = (o.swayK || 0.3);
  for (let k = 0; k < N; k++) {
    const f = Math.sqrt((k + 0.5) / N), a = k * 2.39996, rr = R * f, ca = Math.cos(a), sa = Math.sin(a);
    const rad = V(e1.x * ca + e2.x * sa, e1.y * ca + e2.y * sa, e1.z * ca + e2.z * sa), st = top.clone().addScaledVector(rad, rr);
    const dir = up.clone().addScaledVector(rad, f * 1.15).normalize(), len = s * (0.5 + 0.35 * r()) * (0.72 + 0.28 * f), r0 = s * (0.03 + 0.012 * r()), pts = [], tp = ph + ((k * 7919) % 100) * 0.0628;
    for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push(st.clone().addScaledVector(dir, len * t).addScaledVector(rad, len * 0.22 * t * t * f).addScaledVector(up, -len * 0.1 * t * t * f)); }
    mw.tube(pts, t => r0 * (bubble ? (t < 0.6 ? 1 - 0.45 * t : (t < 0.85 ? 0.73 + 2.2 * (t - 0.6) : 1.28 - 2.6 * (t - 0.85))) : 1 - 0.55 * t), 5,
      t => t > 0.8 ? cTip : _c.copy(cT).lerp(cM, t * 1.1), { sway: t => swK * len * Math.pow(t, 1.5), phase: tp, glow: t => 0.25 + t * 0.9, capLen: 0.9 });
  }
  const c = top.clone().addScaledVector(up, s * 0.35); ctx.anemones.push({ p: c, r: s * 0.95 }); ctx.poi(c.clone().add(V(0, 0.3, 0)), s, 'anemone');
};

G.grass = function (ctx, x, z, count, radius, o) {
  o = o || {}; const mw = ctx.sway, r = ctx.rng, c0 = C(o.c0 || '#1f6a3a'), c1 = C(o.c1 || '#8fd66a');
  for (let k = 0; k < count; k++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * radius, bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d, by = ctx.floor(bx, bz) - 0.03, h = (o.h || 0.9) * (0.5 + r() * 0.8), w = (o.w || 0.045) * (0.7 + r() * 0.6), yaw = r() * 3.14, dx = Math.cos(yaw) * w, dz = Math.sin(yaw) * w, lx = (r() - 0.5) * 0.35, lz = (r() - 0.5) * 0.35, ph = bx * 0.6 + bz * 0.4 + r(), f = mw.n, seg = 4;
    for (let i = 0; i <= seg; i++) { const t = i / seg, ww = 1 - t * 0.75, sw = (o.sw !== undefined ? o.sw : 0.34) * h * Math.pow(t, 1.6); _c.copy(c0).lerp(c1, t);
      mw.v(bx - dx * ww + lx * h * t * t, by + h * t, bz - dz * ww + lz * h * t * t, _c, sw, ph, 0.1 * t); mw.v(bx + dx * ww + lx * h * t * t, by + h * t, bz + dz * ww + lz * h * t * t, _c, sw, ph, 0.1 * t); }
    for (let i = 0; i < seg; i++) { const a2 = f + i * 2; mw.i.push(a2, a2 + 1, a2 + 2, a2 + 1, a2 + 3, a2 + 2); }
  }
};

/* ver plumeux (sabelle) */
G.duster = function (ctx, p, n, s, o) {
  o = o || {}; const mw = ctx.sway, r = ctx.rng, pl = pick(ctx, o.pal, [['#f0e0c0', '#c8502a'], ['#ffffff', '#8a3ab0'], ['#ffe9a0', '#b03a3a'], ['#fff', '#2a6ab0']]), c0 = C(pl[0]), c1 = C(pl[1]), tube = C('#8a7a66');
  const k = o.k || 2 + ((r() * 3) | 0);
  for (let q = 0; q < k; q++) { const ax = n.clone().add(rnd3(r, 0.45)).add(V(0, 0.5, 0)).normalize(), b = p.clone().add(rnd3(r, s * 0.2)), h = s * (0.35 + r() * 0.4), ph = r() * 6.28;
    mw.lathe(b, ax, [[-0.05, s * 0.045], [h, s * 0.04], [h + s * 0.02, s * 0.02], [h + s * 0.16, s * 0.2], [h + s * 0.22, s * 0.3]], 16, (i, j) => i < 2 ? tube : ((j & 1) ? c1 : c0), { sway: i => i >= 3 ? 0.04 * s : 0, phase: ph, glow: i => i >= 3 ? 0.7 : 0 }); }
};

/* ---------- sable ---------- */
G.sand = function (ctx, o) {
  o = o || {}; const W = o.w || 84, D = o.d || 56, sx = o.sx || 110, sz = o.sz || 76, zc = o.zc !== undefined ? o.zc : 2, mw = new MW(), nz = ctx.nz, c0 = C(o.pal[0]), c1 = C(o.pal[1]), c2 = C(o.pal[2] || o.pal[0]);
  for (let j = 0; j <= sz; j++) for (let i = 0; i <= sx; i++) { const x = (i / sx - 0.5) * W, z = (j / sz - 0.5) * D + zc, y = ctx.floor(x, z), n1 = nz.fbm(x * 0.22, 3.1, z * 0.22, 3) * 0.5 + 0.5, n2 = nz.n3(x * 0.07, 9, z * 0.07) * 0.5 + 0.5;
    _c.copy(c0).lerp(c1, n1).lerp(c2, n2 * 0.5); mw.v(x, y, z, _c, 0, 0, 0); }
  for (let j = 0; j < sz; j++) for (let i = 0; i < sx; i++) { const a = j * (sx + 1) + i; mw.i.push(a, a + sx + 1, a + 1, a + 1, a + sx + 1, a + sx + 2); }
  return mw.build();
};

/* ---------- accessoires ---------- */
G.amphora = function (ctx, p, s, o) {
  o = o || {}; const mw = ctx.prop, r = ctx.rng, c0 = C(o.c0 || '#a8643c'), c1 = C(o.c1 || '#5a7a5a'), ax = V(o.lean !== undefined ? o.lean : 0.9, 0.35, (r() - 0.5) * 0.6).normalize(), nz = ctx.nz;
  mw.lathe(p, ax, [[0, 0.1 * s], [0.08 * s, 0.2 * s], [0.4 * s, 0.36 * s], [0.7 * s, 0.3 * s], [0.92 * s, 0.13 * s], [1.08 * s, 0.1 * s], [1.18 * s, 0.16 * s], [1.2 * s, 0.11 * s], [1.0 * s, 0.07 * s]], 14,
    (i, j) => i >= 8 ? _c.set(0x120c08) : _c.copy(c0).lerp(c1, clamp(0.5 + nz.n3(i * 0.9, j * 0.5, p.x), 0, 1) * 0.7));
  ctx.obstacles.push({ x: p.x + ax.x * 0.6 * s, y: p.y + ax.y * 0.6 * s, z: p.z + ax.z * 0.6 * s, rx: 0.6 * s, ry: 0.4 * s, rz: 0.45 * s });
  ctx.hides.push({ p: p.clone().addScaledVector(ax, 1.5 * s).add(V(0, 0.2, 0)) });
};

G.chest = function (ctx, p, s, yaw) {
  const mw = ctx.prop, wood = C('#5a3d26'), iron = C('#3a3a3c'), gold = C('#ffcf3a'), m = new T.Matrix4(), q = new T.Quaternion();
  const M = (x, y, z, rx) => { q.setFromEuler(new T.Euler(rx || 0, yaw, 0, 'YXZ')); return m.compose(V(x, y, z).applyAxisAngle(UP, yaw).add(p), q, V(1, 1, 1)); };
  mw.box(M(0, 0.3 * s, 0), 1.3 * s, 0.6 * s, 0.8 * s, wood);
  mw.box(M(0, 0.3 * s, 0), 1.34 * s, 0.1 * s, 0.84 * s, iron); mw.box(M(-0.45 * s, 0.3 * s, 0), 0.1 * s, 0.64 * s, 0.84 * s, iron); mw.box(M(0.45 * s, 0.3 * s, 0), 0.1 * s, 0.64 * s, 0.84 * s, iron);
  mw.box(M(0, 0.86 * s, -0.5 * s, -1.05), 1.3 * s, 0.12 * s, 0.8 * s, wood);
  const r = ctx.rng; for (let i = 0; i < 26; i++) ctx.coral.blob(V((r() - 0.5) * 1.0 * s, 0.6 * s + r() * 0.1 * s, (r() - 0.5) * 0.55 * s).applyAxisAngle(UP, yaw).add(p), V(0.06 * s, 0.025 * s, 0.06 * s), 1, () => gold, { glow: 1.5 });
  ctx.obstacles.push({ x: p.x, y: p.y + 0.4 * s, z: p.z, rx: 0.9 * s, ry: 0.7 * s, rz: 0.7 * s });
  ctx.bubbles.push(V(p.x, p.y + 0.7 * s, p.z));
};

G.anchor = function (ctx, p, s, yaw, tilt) {
  const mw = ctx.prop, c = C('#3d3a36'), c2 = C('#5a6a52'), col = (t, j) => (j & 1) ? c : c2, R = (v) => v.applyAxisAngle(V(0, 0, 1), tilt).applyAxisAngle(UP, yaw).multiplyScalar(s).add(p);
  mw.tube([R(V(0, 0, 0)), R(V(0, 1.2, 0)), R(V(0, 2.4, 0))], 0.09 * s, 6, col);
  const arc = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.12 + 0.76 * i / 10); arc.push(R(V(Math.cos(a) * 1.0, 0.95 + Math.sin(a) * 1.0, 0))); } mw.tube(arc, t => 0.085 * s * (0.75 + 0.5 * Math.sin(t * Math.PI)), 6, col);
  mw.tube([R(V(-0.7, 2.1, 0)), R(V(0.7, 2.1, 0))], 0.07 * s, 5, col);
  const ring = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * 6.2832; ring.push(R(V(Math.cos(a) * 0.2, 2.6 + Math.sin(a) * 0.2, 0))); } mw.tube(ring, 0.04 * s, 5, col, { cap: false });
};

/* torii vermillon */
G.torii = function (ctx, p, s, yaw) {
  const mw = ctx.prop, red = C('#c2321c'), red2 = C('#7a2a1c'), blk = C('#16181a'), moss = C('#3f6b4a'), nz = ctx.nz, m = new T.Matrix4(), q = new T.Quaternion().setFromAxisAngle(UP, yaw);
  const W = (x, y, z) => V(x * s, y * s, z * s).applyAxisAngle(UP, yaw).add(p);
  const colR = (P) => { const k = sstep(p.y + 1.4 * s, p.y, P.y) * 0.8 + clamp(nz.n3(P.x * 1.5, P.y * 1.5, P.z * 1.5), 0, 1) * 0.35; return _c.copy(red).lerp(red2, clamp(nz.n3(P.x * 3, P.y * 0.6, P.z * 3) + 0.3, 0, 1) * 0.6).lerp(moss, clamp(k, 0, 0.8)); };
  for (const sx of [-1, 1]) {
    const b = W(sx * 1.85, -0.2, 0), ax = V(-sx * 0.035, 1, 0).applyAxisAngle(UP, yaw).normalize(), P = V(0, 0, 0);
    mw.lathe(b, ax, [[0, 0.3 * s], [0.5 * s, 0.3 * s], [0.52 * s, 0.22 * s], [2.4 * s, 0.2 * s], [4.4 * s, 0.185 * s]], 14, (i, j) => i < 2 ? _c.copy(blk).lerp(moss, 0.45) : colR(P.copy(b).addScaledVector(ax, [0, 0.5, 0.52, 2.4, 4.4][i] * s).add(V(Math.cos(j) * 0.2, 0, Math.sin(j) * 0.2))));
    ctx.obstacles.push({ x: b.x, y: p.y + 2.2 * s, z: b.z, rx: 0.45 * s, ry: 2.6 * s, rz: 0.45 * s });
  }
  const beam = (y, len, h, d, col, curve) => { const n = 12; for (let i = 0; i < n; i++) { const x0 = (i / n - 0.5) * len, x1 = ((i + 1) / n - 0.5) * len, xm = (x0 + x1) / 2, cy = curve * Math.pow(Math.abs(xm) / (len / 2), 2.2), an = Math.atan2(curve * (Math.pow(Math.abs(x1) / (len / 2), 2.2) - Math.pow(Math.abs(x0) / (len / 2), 2.2)), (x1 - x0));
      const qq = new T.Quaternion().setFromEuler(new T.Euler(0, yaw, an, 'YZX')); m.compose(W(xm, y + cy, 0), qq, V(1, 1, 1)); mw.box(m, (x1 - x0) * s * 1.04, h * s, d * s, typeof col === 'function' ? col : col); } };
  beam(3.45, 4.6, 0.26, 0.2, colR, 0); beam(4.32, 5.3, 0.3, 0.3, colR, 0.3); beam(4.6, 5.9, 0.2, 0.44, blk, 0.36);
  m.compose(W(0, 3.88, 0), q, V(1, 1, 1)); mw.box(m, 0.3 * s, 0.6 * s, 0.14 * s, colR);
  ctx.perches.push({ p: W(0.9, 4.95, 0), n: UP.clone() }, { p: W(-1.1, 4.95, 0), n: UP.clone() });
  ctx.poi(W(0, 2.2, 0.3), 1.6 * s, 'cave');
};

/* lanterne de pierre (tōrō) */
G.lantern = function (ctx, p, s, yaw) {
  const mw = ctx.prop, st = C('#8d8c84'), st2 = C('#5c5f58'), moss = C('#4d7a4a'), nz = ctx.nz, ax = UP;
  const col = (i, j) => { const k = nz.n3(p.x + i * 0.7, j * 0.9, p.z + i * 0.3); return _c.copy(st).lerp(st2, clamp(k + 0.4, 0, 1)).lerp(moss, clamp(k * 1.6, 0, 0.7)); };
  const L = (y0, prof, seg, rot) => mw.lathe(V(p.x, p.y + y0 * s, p.z), ax, prof.map(a => [a[0] * s, a[1] * s]), seg, col, rot);
  L(-0.1, [[0, 0.62], [0.22, 0.6], [0.24, 0.42], [0.34, 0.36]], 6);
  L(0.24, [[0, 0.17], [1.1, 0.15], [1.12, 0.2]], 10);
  L(1.36, [[0, 0.2], [0.05, 0.5], [0.16, 0.52], [0.18, 0.3]], 6);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + yaw; mw.tube([V(p.x + Math.cos(a) * 0.3 * s, p.y + 1.52 * s, p.z + Math.sin(a) * 0.3 * s), V(p.x + Math.cos(a) * 0.3 * s, p.y + 2.02 * s, p.z + Math.sin(a) * 0.3 * s)], 0.045 * s, 4, () => st, { cap: false }); }
  L(2.0, [[0, 0.3], [0.02, 0.78], [0.1, 0.7], [0.3, 0.3], [0.42, 0.12], [0.44, 0.001]], 6, { rf: (a) => 1 + 0.1 * Math.cos(a * 6) });
  L(2.42, [[0, 0.06], [0.1, 0.13], [0.2, 0.1], [0.3, 0.02]], 8);
  ctx.coral.blob(V(p.x, p.y + 1.78 * s, p.z), 0.17 * s, 1, () => _c.set(0xffb040), { glow: 2.6 });
  const pl = new T.PointLight(0xffa040, 9, 7, 1.6); pl.position.set(p.x, p.y + 1.8 * s, p.z); ctx.lights.push(pl);
  ctx.obstacles.push({ x: p.x, y: p.y + 1.3 * s, z: p.z, rx: 0.75 * s, ry: 1.7 * s, rz: 0.75 * s });
  ctx.perches.push({ p: V(p.x, p.y + 2.78 * s, p.z), n: UP.clone() });
};

/* pont arqué */
G.bridge = function (ctx, p, s, yaw) {
  const mw = ctx.prop, red = C('#b0301c'), dk = C('#5a2418'), moss = C('#3f6b4a'), m = new T.Matrix4(), n = 14, L = 6.4, H = 1.5, nz = ctx.nz;
  const W = (x, y, z) => V(x * s, y * s, z * s).applyAxisAngle(UP, yaw).add(p), yA = x => H * (1 - Math.pow(x / (L / 2), 2));
  const col = (P) => _c.copy(red).lerp(dk, clamp(nz.n3(P.x * 2, P.y * 2, P.z * 2) + 0.4, 0, 1) * 0.7).lerp(moss, clamp(nz.n3(P.x * 0.8, P.y, P.z * 0.8), 0, 0.6));
  for (let i = 0; i < n; i++) { const x0 = (i / n - 0.5) * L, x1 = ((i + 1) / n - 0.5) * L, xm = (x0 + x1) / 2, an = Math.atan2(yA(x1) - yA(x0), x1 - x0);
    m.compose(W(xm, yA(xm), 0), new T.Quaternion().setFromEuler(new T.Euler(0, yaw, an, 'YZX')), V(1, 1, 1)); mw.box(m, (x1 - x0) * s * 1.12, 0.12 * s, 1.5 * s, col); }
  for (const sz of [-1, 1]) { const rail = []; for (let i = 0; i <= n; i++) { const x = (i / n - 0.5) * L; rail.push(W(x, yA(x) + 0.75, sz * 0.72)); if (i % 2 === 0) mw.tube([W(x, yA(x) - 0.05, sz * 0.72), W(x, yA(x) + 0.85, sz * 0.72)], 0.055 * s, 5, () => red); }
    mw.tube(rail, 0.05 * s, 5, () => red, { cap: false }); for (const ex of [-1, 1]) mw.tube([W(ex * L / 2, -0.6, sz * 0.72), W(ex * L / 2, yA(ex * L / 2) + 1.0, sz * 0.72)], 0.09 * s, 6, () => dk); }
  ctx.obstacles.push({ x: p.x, y: p.y + 0.6 * s, z: p.z, rx: 3.0 * s, ry: 1.0 * s, rz: 1.0 * s });
  ctx.poi(W(0, 0.4, 0.2), 1.2, 'cave'); ctx.hides.push({ p: W(0, 0.5, -0.3) });
};

/* épave de bateau en bois : bordés à clin, membrures apparentes, pont troué, mât brisé */
G.wreck = function (ctx, o) {
  const L = 11, B = 3.5, D = 2.5, r = ctx.rng, nz = ctx.nz, tmp = new MW(), sc = o.scale || 1;
  const M = new T.Matrix4().compose(V(o.x, ctx.floor(o.x, o.z) + D * 0.74 * sc, o.z), new T.Quaternion().setFromEuler(new T.Euler(o.roll !== undefined ? o.roll : 0.3, o.yaw !== undefined ? o.yaw : 0.4, o.pitch !== undefined ? o.pitch : 0.07, 'YXZ')), V(sc, sc, sc));
  const hb = t => B / 2 * (t < 0.62 ? lerp(0.62, 1, sstep(0, 0.45, t)) : Math.pow(Math.max(0, Math.cos((t - 0.62) / 0.38 * Math.PI / 2)), 0.75));
  const keel = t => -D * (0.78 + 0.22 * Math.sin(Math.PI * clamp(t * 1.05, 0, 1))), sheer = t => 0.75 * Math.pow(Math.abs(t - 0.45) / 0.55, 2.2);
  const sec = (t, phi, inset) => { const b = hb(t) * (1 - (inset || 0)); return V((t - 0.5) * L, lerp(keel(t), sheer(t), Math.pow(phi, 1.9)), b * Math.pow(Math.sin(phi * Math.PI / 2), 0.75)); };
  const w0 = C('#5d4532'), w1 = C('#86694c'), al = C('#3d6e52'), al2 = C('#2a5560'), dk = C('#2a1e16');
  const wood = (P, k) => { const g = nz.n3(P.x * 0.5, P.y * 1.2 + k * 3, P.z * 0.5) * 0.5 + 0.5; _c.copy(w0).lerp(w1, clamp(g + (k % 3) * 0.12, 0, 1)); const a = nz.n3(P.x * 0.35 + 5, P.y * 0.5, P.z * 0.35); if (a > 0) _c.lerp(a > 0.3 ? al2 : al, clamp(a * 2, 0, 0.75)); return _c; };
  const hash = (a, b, c) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
  const NS = 26, NP = 8, samples = [];
  for (const side of [1, -1]) for (let k = 0; k < NP; k++) for (let i = 0; i < NS; i++) {
    const t0 = i / NS, t1 = (i + 1) / NS;
    if ((side === 1 && t0 > 0.34 && t0 < 0.5 && k >= 2 && k <= 6) || hash(i, k, side) < 0.07 || (k === NP - 1 && hash(i, k, side + 3) < 0.25)) continue;
    const a = sec(t0, k / NP), b = sec(t1, k / NP), c = sec(t1, (k + 1) / NP), d = sec(t0, (k + 1) / NP);
    a.z += 0.045; b.z += 0.045; a.z *= side; b.z *= side; c.z *= side; d.z *= side;
    tmp.quad(a, b, c, d, wood(a, k).clone(), 0);
    if (k >= 3 && hash(i, k, 9) < 0.3) samples.push({ p: a.clone().lerp(c, 0.5), n: V(0, 0.4, side).normalize() });
  }
  for (let i = 1; i < NS; i += 2) for (const side of [1, -1]) { const t = i / NS, pts = []; for (let q = 0; q <= 8; q++) { const P = sec(t, q / 8 * 1.04, 0.05); P.z *= side; pts.push(P); } tmp.tube(pts, 0.075, 5, () => dk); }
  const kp = []; for (let i = 0; i <= 12; i++) { const P = sec(i / 12, 0); P.y -= 0.05; kp.push(P); } tmp.tube(kp, 0.13, 6, () => dk);
  tmp.tube([sec(1, 0), V(L / 2 + 0.25, sheer(1) * 0.5, 0), V(L / 2 + 0.45, sheer(1) + 0.5, 0)], 0.12, 6, () => dk);
  tmp.tube([V(L / 2 + 0.2, sheer(1) + 0.2, 0), V(L / 2 + 2.6, sheer(1) + 1.1, 0)], t => 0.1 * (1 - 0.5 * t), 6, () => w0);
  const NDK = 9;
  for (let k = 0; k < NDK; k++) for (let i = 1; i < NS - 1; i++) {
    const t0 = i / NS, t1 = (i + 1) / NS; if (hash(i, k, 21) < 0.3 || (t0 > 0.3 && t0 < 0.55 && k > 3)) continue;
    const z0 = lerp(-1, 1, k / NDK), z1 = lerp(-1, 1, (k + 1) / NDK), y0 = sheer(t0) - 0.18, y1 = sheer(t1) - 0.18, a = V((t0 - 0.5) * L, y0, z0 * hb(t0) * 0.96), b = V((t1 - 0.5) * L, y1, z0 * hb(t1) * 0.96), c = V((t1 - 0.5) * L, y1, z1 * hb(t1) * 0.96), d = V((t0 - 0.5) * L, y0, z1 * hb(t0) * 0.96);
    tmp.quad(a, d, c, b, wood(a, k + 4).clone(), 0);
    if (hash(i, k, 5) < 0.2) samples.push({ p: a.clone().lerp(c, 0.5), n: V(0, 1, 0) });
  }
  { const pts = []; for (let q = 0; q <= 10; q++) pts.push(sec(0.001, q / 10)); const c = wood(pts[5], 2).clone(); for (let q = 0; q < 10; q++) { const a = pts[q], b = pts[q + 1]; tmp.quad(V(a.x, a.y, -a.z), V(a.x, a.y, a.z), V(b.x, b.y, b.z), V(b.x, b.y, -b.z), c, 0); }
    for (const z of [-0.6, 0.6]) tmp.quad(V(-L / 2 - 0.02, -0.5, z - 0.28), V(-L / 2 - 0.02, -0.5, z + 0.28), V(-L / 2 - 0.02, 0.05, z + 0.28), V(-L / 2 - 0.02, 0.05, z - 0.28), _c.set(0x080604).clone(), 0); }
  const mb = V(0.7, sheer(0.56) - 0.2, 0);
  tmp.tube([V(0.7, keel(0.56) + 0.2, 0), mb.clone().add(V(0, 1.2, 0)), mb.clone().add(V(0.12, 2.5, 0.05))], t => 0.2 * (1 - 0.25 * t), 7, (t) => wood(V(t * 3, t * 5, 1), 1));
  const f0 = V(0.2, sheer(0.5) + 0.3, 0.9), f1 = V(-2.6, keel(0.3) + 0.5, 5.6);
  tmp.tube([f0, f0.clone().lerp(f1, 0.5), f1], t => 0.17 * (1 - 0.35 * t), 7, (t) => wood(V(t * 4, 2, t * 6), 2));
  const ym = f0.clone().lerp(f1, 0.62); tmp.tube([ym.clone().add(V(1.6, 0.1, 0.9)), ym.clone().add(V(-1.6, -0.1, -0.9))], 0.07, 5, () => w0);
  for (let i = 2; i < NS - 1; i += 2) for (const side of [1, -1]) { if (hash(i, side, 40) < 0.35) continue; const t = i / NS, P = sec(t, 1); P.z *= side; tmp.tube([P.clone().add(V(0, -0.1, 0)), P.clone().add(V(0, 0.55, 0))], 0.05, 4, () => w0); }
  ctx.prop.append(tmp, M);
  const world = v => v.clone().applyMatrix4(M), nrm = new T.Matrix3().setFromMatrix4(M);
  o.samples = samples.map(s => ({ p: world(s.p), n: s.n.clone().applyMatrix3(nrm).normalize() }));
  for (const t of [0.14, 0.38, 0.62, 0.84]) { const c = world(V((t - 0.5) * L, keel(t) * 0.45, 0)); ctx.obstacles.push({ x: c.x, y: c.y, z: c.z, rx: 1.75 * sc, ry: 1.5 * sc, rz: 1.75 * sc }); }
  ctx.hides.push({ p: world(V(-1.6, -3.2, -2.6)) }, { p: world(V(2.6, -1.2, -2.8)) }, { p: world(V(-4.2, -0.6, -2.4)) });
  ctx.poi(world(V(-0.8, -0.9, 2.6)), 1.4, 'cave'); ctx.poi(world(V(2.4, 1.4, 0.4)), 1.2, 'coral'); ctx.poi(world(V(-3.4, 1.5, 0.2)), 1.2, 'coral'); ctx.poi(world(V(5.6, 1.6, 0)), 1, 'coral');
  ctx.perches.push({ p: world(V(0.82, sheer(0.56) + 2.45, 0.05)), n: UP.clone() }, { p: world(V(3.0, sheer(0.77) - 0.1, 0.2)), n: UP.clone() }, { p: world(V(-3.6, sheer(0.17) - 0.1, 0)), n: UP.clone() });
  ctx.bubbles.push(world(V(-1.0, -1.4, 0.6)), world(V(3.2, 0.1, 0)));
  return o;
};

/* habille des points d'échantillonnage (coque, pont…) */
G.dressSamples = function (ctx, samples, recipe, scale) {
  const r = ctx.rng;
  for (const it of recipe) for (let i = 0; i < it[1] && samples.length; i++) { const s = samples[(r() * samples.length) | 0], opt = it[2] || {};
    G[it[0]](ctx, s.p.clone(), s.n.clone(), (opt.s ? opt.s[0] + r() * (opt.s[1] - opt.s[0]) : 0.5 + r() * 0.4) * (scale || 1), opt); }
};
})();
