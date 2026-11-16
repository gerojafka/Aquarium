/* Ocean Dream — freshwater-scenes.js
   Eau douce : générateurs de plantes, bois, nénuphars, ruines, et composition de 10 décors. */
(function () {
'use strict';
const T = THREE, OD = window.OD, G = OD.Gen, K = OD.SceneKit, V = K.V, UP = K.UP, C = OD.C, sandAt = K.sandAt;
const _c = new T.Color();

/* ---------- plantes ---------- */
/* plante à tige : étages de feuilles autour d'une tige souple */
G.stemPlant = function (ctx, x, z, o) {
  o = o || {}; const mw = ctx.sway, r = ctx.rng, h = (o.h || 2.5) * (0.7 + r() * 0.5), by = ctx.floor(x, z) - 0.03, lv = Math.max(5, Math.round(h / (o.gap || 0.26))), lf = (o.leaf || 0.2) * 1.75;
  const c0 = C(o.c0 || '#2a7a3a'), c1 = C(o.c1 || '#9ae06a'), ph = x * 0.5 + z * 0.4 + r(), lx = (r() - 0.5) * 0.3, lz = (r() - 0.5) * 0.3, per = o.per || 4, wd = o.wd || 0.42, swk = (o.sw || 0.16) * h;
  for (let k = 0; k < lv; k++) { const t = (k + 1) / lv, y = by + h * t, cx = x + lx * h * t * t, cz = z + lz * h * t * t, sw = swk * Math.pow(t, 1.5), size = lf * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.15))) * (0.8 + r() * 0.4);
    _c.copy(c0).lerp(c1, Math.pow(t, 1.5)).multiplyScalar(0.85 + r() * 0.3);
    for (let j = 0; j < per; j++) { const a = k * 1.3 + j / per * 6.283, dx = Math.cos(a), dz = Math.sin(a), up = size * 0.45, f = mw.n;
      mw.v(cx, y, cz, _c, sw, ph, 0); mw.v(cx + dx * size * 0.5 - dz * size * wd, y + up * 0.5, cz + dz * size * 0.5 + dx * size * wd, _c, sw, ph, 0);
      mw.v(cx + dx * size, y + up, cz + dz * size, _c, sw, ph, 0.05); mw.v(cx + dx * size * 0.5 + dz * size * wd, y + up * 0.5, cz + dz * size * 0.5 - dx * size * wd, _c, sw, ph, 0); mw.i.push(f, f + 1, f + 2, f, f + 2, f + 3); } }
  mw.tube([V(x, by, z), V(x + lx * h * 0.25, by + h * 0.5, z + lz * h * 0.25), V(x + lx * h, by + h, z + lz * h)], 0.012, 3, () => c0, { sway: t => swk * Math.pow(t, 1.5), phase: ph, cap: false });
};
G.bush = function (ctx, x, z, n, rad, o) {
  const r = ctx.rng; for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * rad; G.stemPlant(ctx, x + Math.cos(a) * d, z + Math.sin(a) * d * 0.7, o); }
  const fy = ctx.floor(x, z); ctx.poi(V(x, fy + (o.h || 2.5) * 0.55, z + rad * 0.6), rad, 'coral'); ctx.hides.push({ p: V(x, fy + 0.7, z - rad * 0.7 - 0.5) });
};
/* rosette de grandes feuilles (échinodorus, anubias, cryptocorynes) */
G.sword = function (ctx, x, z, s, o) {
  o = o || {}; const mw = ctx.sway, r = ctx.rng, by = ctx.floor(x, z) - 0.02, n = o.n || 12, c0 = C(o.c0 || '#1f6a34'), c1 = C(o.c1 || '#6ac85a'), ph = x + z + r(), wd = (o.wd || 0.16) * s, seg = 6;
  for (let k = 0; k < n; k++) { const a = k / n * 6.283 + r() * 0.4, out = 0.35 + r() * 0.5, len = s * (0.7 + r() * 0.5), dx = Math.cos(a), dz = Math.sin(a), f = mw.n, sh = 0.8 + r() * 0.35;
    for (let i = 0; i <= seg; i++) { const t = i / seg, w = wd * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.88)), 0.8) * (t < 0.3 ? 0.25 + t * 2.5 : 1), px = x + dx * len * out * t * t, pz = z + dz * len * out * t * t * 0.9, py = by + len * t * (1 - 0.25 * t * out), sw = (o.sw || 0.1) * len * Math.pow(t, 1.6);
      _c.copy(c0).lerp(c1, t).multiplyScalar(sh); mw.v(px - dz * w, py, pz + dx * w, _c, sw, ph, 0); mw.v(px + dz * w, py, pz - dx * w, _c, sw, ph, 0); }
    for (let i = 0; i < seg; i++) { const q = f + i * 2; mw.i.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } }
  ctx.poi(V(x, by + s * 0.7, z + 0.4), s * 0.6, 'coral');
};
/* bois flotté et racines */
G.wood = function (ctx, x, z, s, o) {
  o = o || {}; const mw = ctx.prop, r = ctx.rng, nz = ctx.nz, c0 = C(o.c0 || '#4e3522'), c1 = C(o.c1 || '#8a6642'), base = o.base || V(x, ctx.floor(x, z) + 0.05, z);
  const col = P => _c.copy(c0).lerp(c1, nz.n3(P.x * 1.4, P.y * 3, P.z * 1.4) * 0.5 + 0.5);
  const grow = (st, dir, len, rad, dep) => { const pts = [st.clone()], d = dir.clone(), n = 4; let p = st.clone();
    for (let i = 0; i < n; i++) { d.add(V((r() - 0.5) * 0.5, (r() - 0.5) * 0.35, (r() - 0.5) * 0.5)).normalize(); p = p.clone().addScaledVector(d, len / n); pts.push(p); }
    mw.tube(pts, t => rad * (1 - 0.45 * t), 7, t => col(pts[Math.min(n, Math.round(t * n))]), { cap: dep === 0, capLen: 1.5 });
    if (!o.base) ctx.perches.push({ p: pts[2].clone().add(V(0, rad * 0.8 + 0.02, 0)), n: UP.clone() });
    if (dep > 0) { const k = 2 + (r() < 0.4 ? 1 : 0); for (let i = 0; i < k; i++) grow(pts[2 + ((r() * 3) | 0)].clone(), d.clone().multiplyScalar(0.5).add(V((r() - 0.5) * 1.6, (r() - 0.2) * 1.2 * (o.up !== undefined ? o.up : 1), (r() - 0.5) * 1.2)).normalize(), len * 0.68, rad * 0.6, dep - 1); } };
  const dir = V(o.dx !== undefined ? o.dx : (r() - 0.5) * 1.4, o.dy !== undefined ? o.dy : 0.6, (r() - 0.5) * 0.6).normalize();
  grow(base, dir, s * 2.2, s * 0.2, o.depth || 2);
  if (!o.base) { ctx.obstacles.push({ x: base.x + dir.x * s * 0.6, y: base.y + dir.y * s * 0.6, z: base.z, rx: s * 0.5, ry: s * 0.5, rz: s * 0.45 }); ctx.hides.push({ p: V(x, base.y + 0.5, z - 0.9) }); }
  ctx.poi(V(base.x + dir.x * s, base.y + dir.y * s + (o.base ? -0.4 : 0.4), base.z + 0.5), s * 0.7, 'cave');
};
/* nénuphars : feuilles flottantes vues par en dessous, tiges souples */
G.lilies = function (ctx, list) {
  const mw = ctx.sway, r = ctx.rng, top = OD.TANK.top - 0.04, cu = C('#3f8a3a'), cd = C('#6a4a3a'), st = C('#6a9a4a');
  for (const a of list) { const x = a[0], z = a[1], R = a[2], rot = r() * 6.28, f = mw.n, seg = 14, ph = x + z;
    mw.v(x, top, z, cd, 0.02, ph, 0);
    for (let j = 0; j <= seg; j++) { const an = rot + 0.22 + j / seg * (6.283 - 0.44); mw.v(x + Math.cos(an) * R, top + 0.012, z + Math.sin(an) * R, (j & 1) ? cu : cd, 0.02, ph, 0); }
    for (let j = 0; j < seg; j++) mw.i.push(f, f + 1 + j, f + 2 + j);
    if (a[3] !== 0) { const fy = ctx.floor(x * 0.8, z * 0.8), b = V(x * 0.8 + (r() - 0.5), fy, z * 0.8 + (r() - 0.5)), pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(V(b.x + (x - b.x) * t * t, fy + (top - fy) * t, b.z + (z - b.z) * t * t)); }
      mw.tube(pts, 0.03, 4, () => st, { cap: false, sway: t => 0.5 * Math.sin(Math.PI * t), phase: ph }); } }
};
/* tronc d'arbre de forêt inondée */
G.trunk = function (ctx, x, z, rad) {
  const mw = ctx.prop, nz = ctx.nz, c0 = C('#3c2c1e'), c1 = C('#6a5238'), ms = C('#3f5a2a'), fy = ctx.floor(x, z), ax = V((ctx.rng() - 0.5) * 0.12, 1, (ctx.rng() - 0.5) * 0.08).normalize(), H = [-0.4, 0.5, 1.6, 4.5, 11.5];
  mw.lathe(V(x, fy, z), ax, [[H[0], rad * 2.3], [H[1], rad * 1.5], [H[2], rad * 1.1], [H[3], rad], [H[4], rad * 0.95]], 14,
    (i, j) => _c.copy(c0).lerp(c1, nz.n3(x + j * 0.9, H[i] * 0.4, z) * 0.5 + 0.5).lerp(ms, i < 2 ? 0.5 : 0.08), { rf: (a, i) => 1 + (i < 2 ? 0.22 : 0.06) * Math.sin(a * 5 + x) });
  ctx.obstacles.push({ x: x, y: fy + 4.5, z: z, rx: rad * 1.35, ry: 6.5, rz: rad * 1.35 }); ctx.hides.push({ p: V(x, fy + 1.5 + ctx.rng() * 3, z - rad - 0.9) });
};
/* pierres taillées : colonnes et blocs moussus */
const stone = (ctx) => { const nz = ctx.nz, a = C('#aca08a'), b = C('#5e584a'), m = C('#4a6a3a'); return P => _c.copy(b).lerp(a, nz.fbm(P.x * 0.9, P.y * 0.9, P.z * 0.9, 3) * 0.7 + 0.5).lerp(m, OD.clamp(nz.n3(P.x * 0.5 + 9, P.y * 0.6, P.z * 0.5) * 1.6, 0, 0.75)); };
G.column = function (ctx, x, z, h, rad, broken) {
  const mw = ctx.prop, fy = ctx.floor(x, z), col = stone(ctx), P = V(0, 0, 0), ax = V((ctx.rng() - 0.5) * (broken ? 0.2 : 0.04), 1, (ctx.rng() - 0.5) * 0.04).normalize();
  const prof = [[-0.2, rad * 1.55], [0.3, rad * 1.55], [0.36, rad * 1.15], [h, rad]]; if (!broken) prof.push([h + 0.06, rad * 1.3], [h + 0.34, rad * 1.4], [h + 0.36, 0.01]); else prof.push([h + 0.15, rad * 0.5], [h + 0.2, 0.01]);
  mw.lathe(V(x, fy, z), ax, prof, 12, (i, j) => col(P.set(x + Math.cos(j) * rad, fy + prof[i][0], z + Math.sin(j) * rad)), { rf: (a, i) => (i === 2 || i === 3) ? 1 + 0.045 * Math.cos(a * 12) : 1 });
  ctx.obstacles.push({ x: x, y: fy + h * 0.5, z: z, rx: rad * 1.5, ry: h * 0.6 + 0.3, rz: rad * 1.5 }); ctx.perches.push({ p: V(x + ax.x * h, fy + h + (broken ? 0.22 : 0.38), z), n: UP.clone() });
};
G.block = function (ctx, x, y, z, sx, sy, sz, yaw, tilt) {
  const m = new T.Matrix4().compose(V(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(tilt || 0, yaw || 0, 0, 'YXZ')), V(1, 1, 1)); ctx.prop.box(m, sx, sy, sz, stone(ctx));
  ctx.obstacles.push({ x: x, y: y, z: z, rx: sx * 0.6, ry: sy * 0.6, rz: sz * 0.6 }); ctx.perches.push({ p: V(x, y + sy * 0.5 + 0.03, z), n: UP.clone() });
};
G.litter = function (ctx, n, xr, zr) { const r = ctx.rng, cols = ['#6a4a2a', '#8a5a2a', '#4a3420', '#9a6a30', '#7a4a20'];
  for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 2 * xr, z = zr[0] + r() * (zr[1] - zr[0]), c = C(cols[(r() * cols.length) | 0]), a = r() < 0.5; ctx.rock.blob(V(x, ctx.floor(x, z) + 0.02, z), V(a ? 0.17 : 0.09, 0.012, a ? 0.09 : 0.17), 0, () => c); } };
G.moss = function (ctx, p, s) { const nz = ctx.nz, a = C('#2f6a2a'), b = C('#7ac84a'); ctx.coral.blob(p, V(s, s * 0.45, s * 0.8), 2, (ux, uy, uz) => _c.copy(a).lerp(b, nz.n3(p.x + ux * 3, uy * 3, p.z + uz * 3) * 0.5 + 0.5), { disp: (ux, uy, uz) => 1 + 0.25 * nz.n3(ux * 4 + p.x, uy * 4, uz * 4) }); };
const carpet = (ctx, x0, x1, z0, z1, dens, o) => { const st = 3.0; for (let x = x0; x <= x1; x += st) for (let z = z0; z <= z1; z += st) G.grass(ctx, x, z, Math.round(dens * 1.5), 2.3, Object.assign({}, o, { w: (o.w || 0.03) * 1.8 })); };
const vallis = (ctx, x, z, n, o) => G.grass(ctx, x, z, n || 34, 0.9, Object.assign({ h: 5.6, w: 0.085, c0: '#1f6a34', c1: '#8ad85a', sw: 0.1 }, o || {}));
const stoneAt = (ctx, x, z, rx, ry, rz, o) => { const k = G.rock(ctx, Object.assign({ c: V(x, ctx.floor(x, z) + ry * 0.55, z), r: [rx, ry, rz], detail: 4, rough: 0.12, algae: 0.8 }, o || {})), t = k.at(0, 1, 0.1); ctx.perches.push({ p: t.p, n: t.n }); ctx.hides.push({ p: V(x, ctx.floor(x, z) + 0.6, z - rz - 0.8) }); return k; };

/* ---------- palettes ---------- */
const RK = { river: ['#918a7c', '#4a4640', '#56684a', '#6c7c52'], seiryu: ['#8a96a2', '#3a4048', '#52664e', '#687a58'], malawi: ['#b0a288', '#5e5444', '#66784e', '#7a8a58'], dark: ['#5a564e', '#26241f', '#3a4a30', '#4a5a36'] };
const SOIL = ['#3d2e24', '#261c16', '#4c3b2c'], GRAVEL = ['#b6a686', '#8a7a60', '#cfc2a4'], PALE = ['#ead9b4', '#cdb98c', '#f4ead0'], DARKSAND = ['#5a5248', '#3a342c', '#6a6256'];
const GREEN = { c0: '#2a8a3a', c1: '#9af06a' };

const DEFS = {
  /* 1 — Aquarium hollandais */
  dutch: { seed: 201, rock: RK.river, sand: SOIL, floor: { amp: 0.1, f: 0.1, back: 1.7 }, rip: [0.06, 7, 0.6],
    env: { top: '#d8f6e0', bottom: '#184c34', fog: '#58a482', fogD: 0.021, sun: '#fff8e8', sunI: 3.6, sky: '#c8f0d8', ground: '#4a6a4a', hemiI: 2.2, caustic: 1.7, rays: '#f0fff0', rayI: 0.28, snow: '#f0fff0', snowN: 0.5, surface: ['#3f9a78', '#f4fff6'], exposure: 1.0, current: 0.3 },
    build(ctx) {
      const B = (x, z, n, rad, o) => G.bush(ctx, x, z, n, rad, o);
      B(-8.6, -5, 26, 1.5, { h: 6.5, c0: '#1f6a34', c1: '#7ad85a', leaf: 0.3 }); B(-5, -5.4, 24, 1.4, { h: 5.6, c0: '#7a2a2a', c1: '#ff5a4a', leaf: 0.2, per: 4 }); B(-1.4, -5.6, 26, 1.5, { h: 6.2, c0: '#2a7a3a', c1: '#c8f07a', leaf: 0.26 });
      B(2.4, -5.4, 24, 1.4, { h: 5.2, c0: '#8a3a1a', c1: '#ff9a3a', leaf: 0.22, per: 4 }); B(6, -5.2, 26, 1.5, { h: 6.4, c0: '#1f6a34', c1: '#5ac86a', leaf: 0.34, per: 2, wd: 0.5 }); B(9.5, -4.6, 22, 1.3, { h: 5, c0: '#6a2a4a', c1: '#ff6a9a', leaf: 0.2, per: 4 });
      B(-7, -2.2, 20, 1.3, { h: 3, c0: '#2a7a3a', c1: '#a8f07a', leaf: 0.2 }); B(-3.2, -2.6, 20, 1.2, { h: 2.6, c0: '#8a2a2a', c1: '#ff4a3a', leaf: 0.16, per: 4 }); B(0.6, -2.8, 18, 1.2, { h: 3.2, c0: '#1f6a34', c1: '#7ad85a', leaf: 0.24 });
      B(4.4, -2.4, 20, 1.3, { h: 2.4, c0: '#3a8a3a', c1: '#e8f08a', leaf: 0.15, per: 5 }); B(8, -2, 18, 1.2, { h: 3, c0: '#7a3a1a', c1: '#ffaa4a', leaf: 0.2, per: 4 });
      for (let x = -12; x <= 12; x += 2) vallis(ctx, x, -7.4, 30, { h: 7.2 });
      G.sword(ctx, -9.6, 0.3, 1.6, {}); G.sword(ctx, 9.8, 0.5, 1.4, { c0: '#5a2a2a', c1: '#c85a4a' }); G.wood(ctx, 0.6, -0.4, 0.8, { dy: 0.35 });
      carpet(ctx, -8, 8, 0.4, 3.2, 300, { h: 0.24, w: 0.03, c0: GREEN.c0, c1: GREEN.c1, sw: 0.2 });
      ctx.bubbles.push(V(-9.6, 0.3, -3.6), V(7.2, 0.3, -3.8));
    } },
  /* 2 — Iwagumi */
  iwagumi: { seed: 211, rock: RK.seiryu, sand: ['#4c8a3c', '#3a7030', '#62a04a'], floor: { amp: 0.16, f: 0.09, back: 2.4 }, rip: [0.1, 7, 0.7],
    env: { top: '#dcf6f2', bottom: '#256a6a', fog: '#7cbab2', fogD: 0.018, sun: '#fffbf0', sunI: 3.7, sky: '#d4f4ee', ground: '#6a9a7a', hemiI: 2.3, caustic: 1.9, rays: '#f4ffff', rayI: 0.3, snow: '#ffffff', snowN: 0.4, surface: ['#4aa8a0', '#f6fffd'], exposure: 0.98, current: 0.25 },
    build(ctx) {
      const st = (x, z, rx, ry, rz) => stoneAt(ctx, x, z, rx, ry, rz, { rough: 0.3, algae: 0.35 });
      st(-2.6, -2.4, 1.5, 3.3, 1.2); st(-5.4, -1.2, 1.1, 1.5, 0.9); st(1.0, -1.6, 1.0, 1.9, 0.9); st(5.6, -2.6, 1.3, 1.2, 1.0); st(3.4, 0.6, 0.7, 0.6, 0.6); st(-7.9, 0.4, 0.6, 0.5, 0.5); st(8.4, -0.4, 0.8, 0.9, 0.7);
      carpet(ctx, -11, 11, -7, 3.4, 330, { h: 0.22, w: 0.03, c0: '#2f9440', c1: '#a6f472', sw: 0.2 });
      for (const a of [[-4.1, -3.4], [2.6, -3.2], [6.9, -3.6], [-8.6, -3.8]]) G.grass(ctx, a[0], a[1], 70, 0.9, { h: 1.3, w: 0.022, c0: '#2a8a3a', c1: '#b6f486', sw: 0.3 });
      K.far(ctx, [[-14, -13, 5, 4], [13, -14, 6, 5]]); ctx.bubbles.push(V(7.4, 0.4, -3.2));
    } },
  /* 3 — Amazonie, eaux noires */
  amazon: { seed: 223, rock: RK.dark, sand: PALE, floor: { amp: 0.2, f: 0.1, back: 1.0 }, rip: [0.16, 6.5, 0.9],
    env: { top: '#f0c468', bottom: '#2c1404', fog: '#8a5a1e', fogD: 0.033, sun: '#ffe2a0', sunI: 3.3, sky: '#e8b060', ground: '#5a3a1a', hemiI: 1.7, caustic: 1.4, rays: '#ffe6a0', rayI: 0.42, snow: '#ffe8b0', snowN: 1.4, surface: ['#8a5a14', '#fff0b8'], exposure: 1.02, current: 0.3 },
    build(ctx) {
      const top = OD.TANK.top + 0.4;
      for (const a of [[-8.2, -3.5, 1.5], [-3.6, -4.8, 1.3], [2.8, -4.2, 1.6], [8.4, -3.2, 1.4], [-0.4, -1.6, 1.0]]) G.wood(ctx, a[0], a[1], a[2], { base: V(a[0], top, a[1]), dx: (ctx.rng() - 0.5) * 0.5, dy: -1, depth: 3, up: -0.9 });
      G.wood(ctx, -5.4, -1.4, 1.5, { dx: 0.9, dy: 0.35 }); G.wood(ctx, 5.2, -0.6, 1.3, { dx: -0.8, dy: 0.3 }); G.wood(ctx, 0.2, 1.6, 0.8, { dx: 0.6, dy: 0.15, depth: 1 });
      for (const a of [[-8.6, -2.2, 2.6], [-2.4, -3.6, 2.9], [3.6, -3.4, 2.4], [8.8, -1.4, 2.6], [-6.2, 1.2, 1.5], [6.6, 1.8, 1.4]]) G.sword(ctx, a[0], a[1], a[2], { n: 14 });
      vallis(ctx, -10, -5.4, 30); vallis(ctx, 10.2, -5, 30); vallis(ctx, 0.6, -6.4, 34);
      G.lilies(ctx, [[-6, -2, 0.5, 0], [-5.2, -2.6, 0.4, 0], [-6.6, -3, 0.45, 0], [4, 0, 0.5, 0], [4.8, -0.7, 0.4, 0], [3.4, -1, 0.42, 0], [8, -4, 0.5, 0], [-1, -5, 0.5, 0], [0, -4.4, 0.4, 0]]);
      G.litter(ctx, 90, 10, [-5, 3.4]); K.pebbles(ctx, 8, 9, [-1, 3.4], 0.2);
      ctx.bubbles.push(V(-2.9, 0.3, -2.6));
    } },
  /* 4 — Ruisseau d'Asie */
  stream: { seed: 229, rock: RK.river, sand: GRAVEL, floor: { amp: 0.26, f: 0.12, back: 1.2 }, rip: [0.2, 7.5, 1.0],
    env: { top: '#c4f2e2', bottom: '#1a5656', fog: '#56a898', fogD: 0.023, sun: '#fffaf0', sunI: 3.8, sky: '#bfeee0', ground: '#4a7a6a', hemiI: 2.1, caustic: 2.4, rays: '#eafff8', rayI: 0.36, snow: '#f0fff8', snowN: 1.6, surface: ['#3a9a8c', '#f0fffa'], exposure: 1.0, current: 0.95, sway: 1.5 },
    build(ctx) {
      const r = ctx.rng;
      for (const a of [[-7.4, -3.2, 1.9, 1.3, 1.5], [-4.6, -4.6, 1.4, 1.0, 1.2], [-1.2, -3.0, 1.2, 0.8, 1.0], [2.8, -4.4, 2.2, 1.5, 1.7], [6.6, -2.8, 1.5, 1.0, 1.3], [9.4, -4.4, 1.7, 1.2, 1.4], [-9.6, -0.6, 1.0, 0.6, 0.9], [-3.4, 0.8, 0.9, 0.5, 0.8], [1.2, -0.4, 1.1, 0.6, 0.9], [4.8, 1.4, 0.8, 0.45, 0.7], [8.6, 0.2, 1.0, 0.55, 0.9], [-6.2, 1.9, 0.7, 0.4, 0.6]])
        stoneAt(ctx, a[0], a[1], a[2], a[3], a[4]);
      for (const a of [[-9.4, -4.6], [-5.8, -2.0], [-2.6, -5.4], [0.6, -5.2], [4.6, -2.4], [7.8, -5.2], [10.4, -2.2]]) vallis(ctx, a[0], a[1], 36, { sw: 0.13 });
      for (const a of [[-8.2, 0.8], [-1.6, 1.6], [2.9, 0.9], [6.6, 0.6], [-4.8, -0.6], [9.8, 1.6]]) G.sword(ctx, a[0], a[1], 0.8 + r() * 0.5, { c0: '#3a4a26', c1: '#8a9a4a', wd: 0.14, n: 10 });
      K.pebbles(ctx, 36, 10, [-5, 3.6], 0.2); K.far(ctx, [[-14, -13, 5, 4], [14, -14, 6, 4]]);
      ctx.bubbles.push(V(-6.4, 0.4, -4.4), V(3.6, 0.4, -5.6), V(8.2, 0.4, -3.6));
    } },
  /* 5 — Lac Malawi */
  malawi: { seed: 233, rock: RK.malawi, sand: PALE, floor: { amp: 0.26, f: 0.1, back: 1.6 }, rip: [0.3, 6.4, 0.9],
    env: { top: '#9cdcff', bottom: '#0c3674', fog: '#2f7cc8', fogD: 0.024, sun: '#fff8ea', sunI: 3.7, sky: '#9ad4ff', ground: '#3c6484', hemiI: 2.2, caustic: 2.2, rays: '#d4f0ff', rayI: 0.3, snow: '#e4f6ff', surface: ['#1a6ab8', '#e8f8ff'], exposure: 1.02, current: 0.4 },
    build(ctx) {
      const o = { rough: 0.2, algae: 0.6 };
      G.mound(ctx, -7.2, -3.4, 5.6, 4.6, 3.8, o); G.mound(ctx, 0.4, -5.6, 6.4, 3.4, 3.4, o); G.mound(ctx, 7.6, -3.2, 5.4, 5.2, 3.8, o); G.mound(ctx, -2.6, 0.8, 2.6, 1.3, 1.8, Object.assign({ n: 3, detail: 4 }, o)); G.mound(ctx, 4.2, 1.6, 2.2, 1.1, 1.6, Object.assign({ n: 2, detail: 4 }, o));
      vallis(ctx, -10.4, -1.4, 26, { h: 4.4 }); vallis(ctx, 10.6, -0.6, 24, { h: 4 }); vallis(ctx, 3.4, -2.2, 18, { h: 3.4 });
      K.pebbles(ctx, 22, 10, [-1, 3.6], 0.28); K.far(ctx, [[-17, -13, 7, 7], [16, -14, 8, 8], [0, -19, 11, 6]]);
      ctx.bubbles.push(V(-4.4, 0.4, -5.0), V(4.6, 0.4, -4.6));
    } },
  /* 6 — Bassin aux nénuphars */
  pond: { seed: 239, rock: RK.river, sand: GRAVEL, floor: { amp: 0.22, f: 0.1, back: 1.3 }, rip: [0.12, 7, 0.8],
    env: { top: '#e0f4a8', bottom: '#1e3816', fog: '#5a8c46', fogD: 0.029, sun: '#fffbe0', sunI: 3.8, sky: '#d0ec9c', ground: '#4a6a3a', hemiI: 1.9, caustic: 1.8, rays: '#f0ffc0', rayI: 0.44, snow: '#f0ffc8', snowN: 1.3, surface: ['#4a8a34', '#fbffe0'], exposure: 1.0, current: 0.25 },
    build(ctx) {
      G.lilies(ctx, [[-8.4, -3.2, 1.3], [-6.2, -1.2, 1.0], [-4.6, -4.4, 1.2], [-2.2, -2.2, 0.9], [0.4, -5.2, 1.3], [1.8, -1.6, 1.1], [4.2, -3.8, 1.2], [6.4, -1.4, 1.0], [8.6, -4.2, 1.3], [9.6, -1.2, 0.8], [-0.6, 0.8, 0.8], [-9.6, 0.4, 0.9], [3.6, 1.2, 0.7], [-3.8, 1.6, 0.7]]);
      for (const a of [[-9.2, -5.2], [-3.2, -5.6], [2.6, -6], [7.4, -5.4], [10.2, -3.2]]) G.bush(ctx, a[0], a[1], 24, 1.3, { h: 6.6, c0: '#1f5a2a', c1: '#5ab84a', leaf: 0.15, per: 5, gap: 0.2 });
      for (const a of [[-7.4, -2.4, 1.5, 0.9, 1.2], [5.6, -3.0, 1.7, 1.0, 1.3], [0.2, -3.6, 1.1, 0.6, 0.9], [-2.8, 0.4, 0.8, 0.4, 0.6], [8.8, 0.6, 0.9, 0.5, 0.7]]) stoneAt(ctx, a[0], a[1], a[2], a[3], a[4], { algae: 1 });
      carpet(ctx, -9, 9, -1.5, 3, 130, { h: 0.6, w: 0.035, c0: '#2a7a3a', c1: '#8fd66a', sw: 0.3 }); G.sword(ctx, -5.2, 0.9, 1.3, {}); G.sword(ctx, 6.4, 1.4, 1.2, {});
      K.pebbles(ctx, 20, 10, [-2, 3.6], 0.2); ctx.bubbles.push(V(-1.2, 0.4, -4.2), V(6.9, 0.4, -4.4));
    } },
  /* 7 — Forêt inondée */
  forest: { seed: 241, rock: RK.dark, sand: DARKSAND, floor: { amp: 0.24, f: 0.11, back: 1.1 }, rip: [0.08, 7, 0.8],
    env: { top: '#c4e09a', bottom: '#141f0c', fog: '#3e5a2a', fogD: 0.036, sun: '#f4ffc8', sunI: 4.6, sky: '#8aa860', ground: '#2a3a1c', hemiI: 1.25, caustic: 1.7, rays: '#e8ffb0', rayI: 0.56, rayN: 1.2, snow: '#e8ffb8', snowN: 1.6, snowA: 0.6, surface: ['#34521c', '#f4ffd0'], exposure: 1.06, current: 0.2, fishGlow: 0.12 },
    build(ctx) {
      for (const a of [[-8.8, -4.6, 0.9], [-4.4, -2.2, 0.6], [-0.6, -5.4, 1.0], [3.8, -3.2, 0.7], [8.2, -5.0, 0.95], [10.4, -1.6, 0.6], [-10.6, -0.8, 0.7]]) G.trunk(ctx, a[0], a[1], a[2]);
      G.wood(ctx, -6.4, -0.6, 1.4, { dx: 0.9, dy: 0.3 }); G.wood(ctx, 1.4, -1.6, 1.5, { dx: -0.7, dy: 0.45 }); G.wood(ctx, 6.6, 0.6, 1.1, { dx: 0.8, dy: 0.2 }); G.wood(ctx, -2.2, 1.6, 0.8, { dy: 0.15, depth: 1 });
      for (const a of [[-7.6, 1.4, 1.2], [-2.6, -3.6, 1.6], [2.4, 0.9, 1.1], [6.2, -2.6, 1.5], [9.4, 1.2, 1.0]]) G.sword(ctx, a[0], a[1], a[2], { c0: '#1c4a26', c1: '#4a9a44' });
      G.litter(ctx, 150, 10.5, [-6, 3.6]); ctx.bubbles.push(V(4.9, 0.4, -4.4));
    } },
  /* 8 — Ruines englouties */
  ruins: { seed: 251, rock: RK.river, sand: PALE, floor: { amp: 0.18, f: 0.1, back: 1.2 }, rip: [0.2, 6.6, 0.9],
    env: { top: '#b0ecdc', bottom: '#0e3e3a', fog: '#3a8c7e', fogD: 0.026, sun: '#fff8e4', sunI: 3.7, sky: '#a8e4d4', ground: '#3a6a5c', hemiI: 2.0, caustic: 2.0, rays: '#e0fff4', rayI: 0.4, snow: '#e8fff6', snowN: 1.1, surface: ['#2a8478', '#eafff8'], exposure: 1.0, current: 0.3 },
    build(ctx) {
      const r = ctx.rng, F = (x, z) => ctx.floor(x, z);
      G.column(ctx, -7.6, -4.6, 5.6, 0.48); G.column(ctx, -4.0, -4.9, 5.6, 0.48); G.column(ctx, 3.6, -4.9, 5.6, 0.48); G.column(ctx, 7.2, -4.6, 3.1, 0.48, true); G.column(ctx, -9.4, -1.4, 2.2, 0.48, true); G.column(ctx, 9.6, -1.6, 4.4, 0.44);
      G.block(ctx, -5.8, F(-5.8, -4.75) + 6.3, -4.75, 5.4, 0.7, 1.2, 0.02); G.block(ctx, 0, F(0, -5.4) + 0.25, -5.4, 5.6, 0.5, 1.6, 0); G.block(ctx, 0, F(0, -5.7) + 0.7, -5.7, 4.6, 0.5, 1.2, 0);
      G.block(ctx, 5.0, F(5, -1.6) + 0.35, -1.6, 2.6, 0.7, 1.0, 0.5, 0.2); G.block(ctx, -2.4, F(-2.4, -0.6) + 0.3, -0.6, 1.5, 0.6, 1.0, -0.4, -0.12); G.block(ctx, 1.6, F(1.6, 1.4) + 0.22, 1.4, 1.1, 0.45, 0.8, 0.9, 0.1); G.block(ctx, -6.4, F(-6.4, 0.9) + 0.26, 0.9, 1.3, 0.5, 0.9, 0.3);
      { const fy = F(6.9, 0.6); ctx.prop.lathe(V(6.9, fy + 0.2, 0.6), V(0.94, 0.3, 0.2).normalize(), [[0, 0.44], [2.6, 0.44], [2.62, 0.01]], 12, (i, j) => stone(ctx)(V(6.9 + i, fy + 0.3, 0.6 + Math.sin(j) * 0.4)), { rf: (a, i) => 1 + 0.045 * Math.cos(a * 12) }); ctx.obstacles.push({ x: 8.1, y: fy + 0.6, z: 0.8, rx: 1.5, ry: 0.6, rz: 0.6 }); }
      for (const a of [[-5.8, 6.72, -4.7, 0.6], [0.6, 1.0, -5.5, 0.5], [5.2, 0.78, -1.5, 0.45], [-2.3, 0.66, -0.6, 0.35], [-7.6, 6.0, -4.5, 0.4], [3.6, 6.0, -4.8, 0.4]]) G.moss(ctx, V(a[0], F(a[0], a[2]) + a[1], a[2]), a[3]);
      for (const a of [[-8.6, -2.8, 1.3], [-1.6, -3.4, 1.1], [2.6, -2.6, 1.2], [8.4, -3.4, 1.3], [-4.6, 1.2, 0.8], [4.2, 1.8, 0.7]]) G.sword(ctx, a[0], a[1], a[2], { c0: '#17482a', c1: '#3f9a4a', wd: 0.24, n: 9 });
      vallis(ctx, -10.6, -5.6, 30); vallis(ctx, 10.6, -5.2, 30); vallis(ctx, 1.6, -7, 30); G.bush(ctx, -1.8, -6.6, 16, 1.1, { h: 4.6, c0: '#1f6a34', c1: '#7ad85a', leaf: 0.24 });
      K.pebbles(ctx, 14, 9, [-1, 3.6], 0.22); K.far(ctx, [[-15, -14, 6, 5], [15, -14, 6, 5]]); ctx.bubbles.push(V(0.2, 1.1, -5.4), V(-7.2, 0.4, -2.2));
      ctx.poi(V(-5.8, F(-5.8, -4.7) + 3, -4.2), 1.6, 'cave'); void r;
    } },
  /* 9 — Clair de lune */
  moon: { seed: 257, rock: RK.dark, sand: DARKSAND, floor: { amp: 0.22, f: 0.1, back: 1.4 }, rip: [0.14, 6.6, 0.9],
    env: { top: '#1c4a6e', bottom: '#01060c', fog: '#072436', fogD: 0.033, sun: '#a8ccff', sunI: 1.9, sky: '#3a6a8a', ground: '#0f2024', hemiI: 1.0, caustic: 1.5, rays: '#9cc4ff', rayI: 0.3, snow: '#bfe0ff', snowN: 1.2, snowA: 0.7, twinkle: 1, surface: ['#061c30', '#9cc0f0'], fishGlow: 0.34, exposure: 1.12, current: 0.25, bubble: '#a8c8ff' },
    build(ctx) {
      G.wood(ctx, -5.6, -2.6, 1.9, { dx: 0.7, dy: 0.7, depth: 3 }); G.wood(ctx, 5.4, -3.2, 1.6, { dx: -0.6, dy: 0.6, depth: 3 }); G.wood(ctx, 0.6, 1.2, 0.8, { dy: 0.15, depth: 1 });
      for (const a of [[-9.2, -3.2, 2.3], [-2.2, -4.4, 2.6], [2.6, -1.6, 1.5], [8.8, -2.4, 2.2], [-6.6, 1.2, 1.2], [6.4, 1.4, 1.1]]) G.sword(ctx, a[0], a[1], a[2], { c0: '#1a5a3a', c1: '#5ac88a' });
      for (const a of [[-10.2, -5.4], [-4.2, -6], [1.4, -6.2], [6.6, -5.8], [10.4, -4.2]]) vallis(ctx, a[0], a[1], 32, { c0: '#16523a', c1: '#58c08a' });
      for (const a of [[-7.6, -0.6, 1.2, 0.7, 1.0], [3.4, -4.6, 1.4, 0.9, 1.1], [8.6, 0.4, 0.9, 0.5, 0.7], [-1.6, -1.2, 0.8, 0.45, 0.7]]) stoneAt(ctx, a[0], a[1], a[2], a[3], a[4]);
      carpet(ctx, -8, 8, 0.6, 3.2, 160, { h: 0.3, w: 0.03, c0: '#1c6a44', c1: '#6ad89a', sw: 0.25 });
      G.lilies(ctx, [[-3.4, -2.2, 1.0], [2.2, -3.6, 1.2], [7.2, -1.4, 0.9]]); ctx.bubbles.push(V(-3.6, 0.4, -4.4));
    } },
  /* 10 — Grande berge panoramique */
  riverbank: { seed: 263, rock: RK.river, sand: GRAVEL, floor: { amp: 0.3, f: 0.09, back: 1.8 }, rip: [0.18, 7, 0.9],
    env: { top: '#ccf4d8', bottom: '#184c40', fog: '#4f9c86', fogD: 0.021, sun: '#fff8e8', sunI: 3.7, sky: '#c4f0d8', ground: '#466a56', hemiI: 2.1, caustic: 2.0, rays: '#eafff2', rayI: 0.32, rayN: 1.5, raySpread: 24, snow: '#f0fff6', snowN: 1.1, surface: ['#3a947c', '#f2fff8'], exposure: 1.0, current: 0.5, sway: 1.2 },
    camera: { pos: [0, 4.6, 15.5], look: [0, 3.9, 0], fov: 38, sway: 0.02, dolly: 6.5, dollySpeed: 0.028, pan: 0.1, panSpeed: 0.021 }, bounds: { x: 17, y0: 0.8, y1: 8.6, z0: -5.6, z1: 3.6 }, shadowW: 27, wide: true,
    build(ctx) {
      const r = ctx.rng, cols = [['#1f6a34', '#7ad85a'], ['#7a2a2a', '#ff5a4a'], ['#2a7a3a', '#c8f07a'], ['#8a3a1a', '#ff9a3a'], ['#6a2a4a', '#ff6a9a']];
      for (let i = 0; i < 12; i++) { const x = -20 + i * 3.6 + (r() - 0.5), c = cols[i % 5]; G.bush(ctx, x, -5.2 + (r() - 0.5), 20, 1.4, { h: 4.6 + r() * 2, c0: c[0], c1: c[1], leaf: 0.18 + r() * 0.14, per: 3 + (i % 3) }); }
      for (let i = 0; i < 8; i++) { const x = -18 + i * 5.2 + (r() - 0.5) * 2; vallis(ctx, x, -6.6 + r(), 28); }
      for (const a of [[-16, -2.4, 1.7, 0.8], [-8.6, -1.6, 1.5, -0.8], [0.6, -2.6, 1.9, 0.7], [9.4, -1.8, 1.5, -0.7], [16.4, -2.6, 1.6, 0.6]]) G.wood(ctx, a[0], a[1], a[2], { dx: a[3], dy: 0.5, depth: 3 });
      for (let i = 0; i < 12; i++) { const x = -19 + i * 3.4 + (r() - 0.5) * 2, z = -3.4 + r() * 5.4, k = 0.6 + r() * 1.0; stoneAt(ctx, x, z, k * 1.2, k * 0.7, k); }
      for (let i = 0; i < 9; i++) { const x = -18 + i * 4.4 + (r() - 0.5) * 2; G.sword(ctx, x, -1.2 + r() * 3, 1.0 + r() * 1.2, i % 3 === 0 ? { c0: '#5a2a2a', c1: '#c85a4a' } : {}); }
      G.lilies(ctx, [[-17, -3, 1.2], [-13, -1, 0.9], [-6, -4, 1.2], [-1, -1.4, 1.0], [5, -3.6, 1.2], [11, -1.2, 1.0], [15, -4, 1.1], [18.4, -1.6, 0.9]]);
      carpet(ctx, -18, 18, 1, 3.2, 150, { h: 0.26, w: 0.03, c0: GREEN.c0, c1: GREEN.c1, sw: 0.2 });
      K.pebbles(ctx, 30, 17, [-2, 3.6], 0.2); K.far(ctx, [[-26, -14, 7, 5], [26, -15, 8, 6]]);
      ctx.bubbles.push(V(-11.4, 0.4, -3.8), V(3.6, 0.4, -4.4), V(13.6, 0.4, -4.2));
    } }
};
['dutch', 'iwagumi', 'amazon', 'stream', 'malawi', 'pond', 'forest', 'ruins', 'moon', 'riverbank'].forEach(id => OD.Decors.add(id, DEFS[id]));
})();
