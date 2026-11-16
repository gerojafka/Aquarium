/* Ocean Dream — fish-models.js
   Morphologie et livrée de chaque espèce de poisson.
   Une même description produit : la vignette illustrée (2D), la texture et le maillage 3D (corps, nageoires, yeux). */
(function () {
'use strict';
const OD = window.OD, T = THREE, lerp = OD.lerp, clamp = OD.clamp, sstep = OD.sstep;

/* ---------- profils ---------- */
function prof(spec) {
  if (Array.isArray(spec)) { const P = spec; return x => {
    if (x <= P[0][0]) return P[0][1]; if (x >= P[P.length - 1][0]) return P[P.length - 1][1];
    let i = 0; while (x > P[i + 1][0]) i++;
    const x0 = P[i][0], x1 = P[i + 1][0], y0 = P[i][1], y1 = P[i + 1][1], h = x1 - x0, t = (x - x0) / h;
    const m0 = i > 0 ? (y1 - P[i - 1][1]) / (x1 - P[i - 1][0]) : (y1 - y0) / h, m1 = i < P.length - 2 ? (P[i + 2][1] - y0) / (P[i + 2][0] - x0) : (y1 - y0) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1; }; }
  const d = spec.d, pk = spec.pk || 0.4, f = spec.f || 1, ped = spec.ped || 0.06, k = Math.log(0.5) / Math.log(pk);
  return x => { x = clamp(x, 0, 1); const b = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(x, k))), f); return d * b + ped * sstep(pk, 1, x) * (1 - b); };
}

function prepare(M) {
  if (M._p) return M; M._p = true;
  const t = prof(M.top), b0 = prof(M.bot), b = Array.isArray(M.bot) ? b0 : (x => -b0(x));
  let Tf = t, Bf = b;
  if (M.sn) { const x0 = M.sn[0], pw = M.sn[1], t0 = t(x0), bb = b(x0); Tf = x => x < x0 ? t0 * Math.pow(x / x0, pw) : t(x); Bf = x => x < x0 ? bb * Math.pow(x / x0, pw) : b(x); }
  M.T = Tf; M.B = Bf;
  let hm = 0; for (let i = 0; i <= 40; i++) hm = Math.max(hm, Tf(i / 40) - Bf(i / 40));
  M.hmax = hm;
  const wp = M.wp ? prof(M.wp) : null;
  M.W = wp ? (x => Math.max(0.004, wp(x))) : (x => Math.max(0.004, M.w * Math.pow(clamp((Tf(x) - Bf(x)) / hm, 0, 1), 0.65) * (1 - 0.6 * sstep(0.5, 1, x))));
  const F = M.fins, G = M.G = { d: [], an: null, c: null, pv: null, pc: null };
  const strip = (spec, top, nn) => { const a = spec[0], bb = spec[1], lean = spec[2], hs = spec.slice(3), n = nn || Math.max(10, (hs.length - 1) * 3), cols = [];
    const hAt = s => { const f = s * (hs.length - 1), i = Math.min(hs.length - 2, Math.floor(f)), tt = f - i; return lerp(hs[i], hs[i + 1], tt * tt * (3 - 2 * tt)); };
    for (let k = 0; k <= n; k++) { const s = k / n, x = lerp(a, bb, s), h = hAt(s); cols.push(top ? { b: [x, Tf(x) - 0.02], t: [x + lean * h, Tf(x) + h] } : { b: [x, Bf(x) + 0.02], t: [x + lean * h, Bf(x) - h] }); }
    return { cols: cols, rows: 3 }; };
  (F.d || []).forEach((sp, i) => G.d.push(strip(sp, true, F.dn && F.dn[i])));
  if (F.an) G.an = strip(F.an, false);
  if (F.c) { const c = F.c, len = c[0], ht = c[1], hb = c[2], fork = c[3], pw = c[4] || 1.5, n = 12, cols = [];
    for (let k = 0; k <= n; k++) { const v = k / n * 2 - 1, av = Math.abs(v), e = fork >= 0 ? (1 - fork) + fork * Math.pow(av, pw) : 1 + fork * Math.pow(av, pw);
      cols.push({ b: [0.975, lerp(Bf(1), Tf(1), (v + 1) / 2)], t: [1 + len * e + (c[5] ? c[5] * sstep(-0.62, -0.95, v) : 0), v >= 0 ? ht * v : hb * v] }); }
    G.c = { cols: cols, rows: 5 }; }
  if (F.pv) { const p = F.pv, x = p[0], len = p[1], ang = p[2] * Math.PI / 180, sp = p[3] * Math.PI / 180, n = 5, cols = [], by = Bf(x) + 0.015;
    for (let k = 0; k <= n; k++) { const ph = ang - sp / 2 + sp * k / n, l = len * (1 - 0.42 * k / n); cols.push({ b: [x + 0.012 * k, by], t: [x + Math.cos(ph) * l, by - Math.sin(ph) * l] }); }
    G.pv = { cols: cols, rows: 3 }; }
  if (F.pc) { const p = F.pc, len = p[2], sp = p[3] * Math.PI / 180, n = Math.max(7, Math.round(p[3] / 9)), cols = [];
    for (let k = 0; k <= n; k++) { const ph = (k / n - 0.5) * sp, l = len * (1 - 0.3 * Math.pow(Math.abs(2 * k / n - 1), 2)); cols.push({ b: [Math.cos(ph) * l * 0.08, Math.sin(ph) * l * 0.08], t: [Math.cos(ph) * l, Math.sin(ph) * l] }); }
    G.pc = { cols: cols, rows: 3, x: p[0], y: p[1], ang: p[4] * Math.PI / 180 }; }
  let x0 = -0.02, x1 = 1.02, y0 = 0, y1 = 0;
  for (let i = 0; i <= 20; i++) { y1 = Math.max(y1, Tf(i / 20)); y0 = Math.min(y0, Bf(i / 20)); }
  const grow = g => { if (!g) return; for (const c of g.cols) for (const q of [c.b, c.t]) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } };
  G.d.forEach(grow); grow(G.an); grow(G.c); grow(G.pv);
  M.bb = [x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02];
  return M;
}

/* ---------- pinceaux ---------- */
class Art {
  constructor(g, M, px, mode) { this.g = g; this.M = M; this.px = px; this.mode = mode; this.r = OD.rng(M.seed || 5); }
  fill(c) { this.g.fillStyle = c; this.g.fillRect(-1, -2, 4, 4); }
  lin(x0, y0, x1, y1, st) { const gr = this.g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) gr.addColorStop(st[i], st[i + 1]); return gr; }
  rad(x, y, r, st) { const gr = this.g.createRadialGradient(x, y, 0, x, y, r); for (let i = 0; i < st.length; i += 2) gr.addColorStop(st[i], st[i + 1]); return gr; }
  hfill(st) { this.fill(this.lin(0, 0, 1, 0, st)); }
  vfill(st) { this.fill(this.lin(0, this.M.hmax * 0.52, 0, -this.M.hmax * 0.52, st)); }
  band(x0, x1, c, o) {
    o = o || {}; const g = this.g, hh = o.hh || 0.4, bl = o.bl !== undefined ? o.bl : (o.bow || 0), br = o.br !== undefined ? o.br : (o.bow || 0), sl = o.slant || 0, n = 14, L = [], R = [];
    for (let i = 0; i <= n; i++) { const y = hh - 2 * hh * i / n, k = 1 - (y / hh) * (y / hh); L.push([x0 - bl * k + sl * y, y]); R.push([x1 + br * k + sl * y, y]); }
    const path = (A, mv) => A.forEach((p, i) => (i || !mv) ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
    g.beginPath(); path(L, true); path(R.slice().reverse(), false); g.closePath(); g.fillStyle = c; g.fill();
    if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = o.ew || 0.012; g.beginPath(); path(L, true); g.stroke(); g.beginPath(); path(R, true); g.stroke(); }
  }
  hband(t0, t1, c, x0, x1) { const g = this.g, M = this.M, n = 26; x0 = x0 === undefined ? 0 : x0; x1 = x1 === undefined ? 1 : x1; g.beginPath();
    for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), y = lerp(M.B(x), M.T(x), typeof t1 === 'function' ? t1(x) : t1); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    for (let i = n; i >= 0; i--) { const x = lerp(x0, x1, i / n); g.lineTo(x, lerp(M.B(x), M.T(x), typeof t0 === 'function' ? t0(x) : t0)); }
    g.closePath(); g.fillStyle = c; g.fill(); }
  hline(t, w, c, x0, x1, amp, fr) { const g = this.g, M = this.M, n = 40; g.beginPath();
    for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), y = lerp(M.B(x), M.T(x), t) + (amp ? amp * Math.sin(x * (fr || 40) + t * 20) : 0); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); }
  line(pts, w, c) { const g = this.g; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
  bez(p, w, c) { const g = this.g; g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 6) g.bezierCurveTo(p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5]); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); }
  poly(pts, c) { const g = this.g; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = c; g.fill(); }
  spot(x, y, rx, c, ry, rot) { const g = this.g; g.beginPath(); g.ellipse(x, y, rx, ry || rx, rot || 0, 0, 6.2832); g.fillStyle = c; g.fill(); }
  dots(n, r0, r1, c, x0, x1, y0, y1) { for (let i = 0; i < n; i++) this.spot(lerp(x0, x1, this.r()), lerp(y0, y1, this.r()), lerp(r0, r1, this.r()), c); }
}

const gridPath = gr => { const p = new Path2D(), c = gr.cols; p.moveTo(c[0].b[0], c[0].b[1]); for (let i = 1; i < c.length; i++) p.lineTo(c[i].b[0], c[i].b[1]); for (let i = c.length - 1; i >= 0; i--) p.lineTo(c[i].t[0], c[i].t[1]); p.closePath(); return p; };
function bodyPath(M, e) { const p = new Path2D(), n = 56, cy = (M.T(0.5) + M.B(0.5)) / 2, pts = [];
  for (let i = 0; i <= n; i++) { const x = Math.pow(i / n, 1.25); pts.push([x, M.T(x)]); } for (let i = n; i >= 0; i--) { const x = Math.pow(i / n, 1.25); pts.push([x, M.B(x)]); }
  pts.forEach((q, i) => { let x = q[0], y = q[1]; if (e) { const dx = x - 0.5, dy = y - cy, l = Math.hypot(dx, dy) || 1; x += dx / l * e; y += dy / l * e; } i ? p.lineTo(x, y) : p.moveTo(x, y); }); p.closePath(); return p; }

function finStyle(M, name) { return Object.assign({ c0: M.fc || M.col, c1: M.fc1 || M.fc || M.col, edge: null, ew: 0.012, ray: 'rgba(0,0,0,0.16)', cut: 0 }, M.fin || {}, (M.fs && M.fs[name]) || {}); }
function drawFin(A, gr, st, name, idx) {
  const g = A.g, M = A.M, c = gr.cols, n = c.length;
  let bx = 0, by = 0, tx = 0, ty = 0; for (const q of c) { bx += q.b[0]; by += q.b[1]; tx += q.t[0]; ty += q.t[1]; } bx /= n; by /= n; tx /= n; ty /= n;
  g.save(); g.clip(gridPath(gr));
  g.fillStyle = A.lin(bx, by, tx, ty, [0, st.c0, 1, st.c1]); g.fillRect(-1, -2, 4, 4);
  if (M.fp) M.fp(A, name, idx, gr);
  g.strokeStyle = st.ray; g.lineWidth = Math.max(A.px * 1.2, 0.0035); g.beginPath();
  for (let k = 0; k < n; k++) { g.moveTo(c[k].b[0], c[k].b[1]); g.lineTo(c[k].t[0], c[k].t[1]); if (k < n - 1 && name !== 'pc') { g.moveTo((c[k].b[0] + c[k + 1].b[0]) / 2, (c[k].b[1] + c[k + 1].b[1]) / 2); g.lineTo((c[k].t[0] + c[k + 1].t[0]) / 2, (c[k].t[1] + c[k + 1].t[1]) / 2); } }
  g.stroke(); g.restore();
  if (st.edge) { g.save(); g.clip(gridPath(gr)); g.strokeStyle = st.edge; g.lineWidth = st.ew * 2; g.lineJoin = 'round'; g.beginPath(); c.forEach((q, i) => i ? g.lineTo(q.t[0], q.t[1]) : g.moveTo(q.t[0], q.t[1])); g.stroke(); g.restore(); }
  if (st.cut > 0) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
    for (let k = 0; k < n - 1; k++) { const a = c[k], b = c[k + 1], ex = 1.15, ax = a.b[0] + (a.t[0] - a.b[0]) * ex, ay = a.b[1] + (a.t[1] - a.b[1]) * ex, bx2 = b.b[0] + (b.t[0] - b.b[0]) * ex, by2 = b.b[1] + (b.t[1] - b.b[1]) * ex;
      const mx = lerp((a.t[0] + b.t[0]) / 2, (a.b[0] + b.b[0]) / 2, st.cut), my = lerp((a.t[1] + b.t[1]) / 2, (a.b[1] + b.b[1]) / 2, st.cut), w = st.cutW || 0.3;
      g.beginPath(); g.moveTo(lerp(ax, bx2, w), lerp(ay, by2, w)); g.lineTo(mx, my); g.lineTo(lerp(ax, bx2, 1 - w), lerp(ay, by2, 1 - w)); g.closePath(); g.fill(); }
    g.restore(); }
}

function drawEye(A) {
  const M = A.M, e = M.eye, g = A.g, x = e[0], y = e[1], r = e[2];
  A.spot(x, y, r * 1.14, '#0c0c0e'); A.spot(x, y, r, M.iris || '#c8b060');
  g.fillStyle = A.rad(x, y, r, [0, 'rgba(255,255,255,0)', 0.7, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.35)']); g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  A.spot(x, y, r * 0.56, '#050506'); A.spot(x - r * 0.24, y + r * 0.3, r * 0.2, 'rgba(255,255,255,0.92)'); A.spot(x + r * 0.2, y - r * 0.25, r * 0.09, 'rgba(255,255,255,0.5)');
}

/* dessine le poisson complet (profil gauche) dans le repère « poisson » déjà posé sur g */
function render(g, M, S, mode, pect) {
  const A = new Art(g, M, 1 / S, mode), G = M.G;
  G.d.forEach((gr, i) => drawFin(A, gr, finStyle(M, 'd' + (i || '')), 'd', i));
  if (G.an) drawFin(A, G.an, finStyle(M, 'an'), 'an', 0);
  if (G.c) drawFin(A, G.c, finStyle(M, 'c'), 'c', 0);
  if (G.pv) drawFin(A, G.pv, finStyle(M, 'pv'), 'pv', 0);
  g.save(); g.clip(bodyPath(M, mode === 'atlas' ? 0.014 : 0));
  A.fill(M.col); M.body(A);
  const sc = M.scale !== undefined ? M.scale : 0.06;
  if (sc > 0) { const st = M.scaleS || 0.034; g.strokeStyle = 'rgba(0,0,0,' + sc + ')'; g.lineWidth = Math.max(A.px, 0.003); g.beginPath();
    for (let j = 0, y = -0.45; y < 0.45; y += st * 0.8, j++) for (let x = 0.2 + (j & 1) * st * 0.5; x < 1; x += st) { g.moveTo(x + st * 0.5 * Math.cos(-1), y + st * 0.5 * Math.sin(-1)); g.arc(x, y, st * 0.5, -1, 1); }
    g.stroke(); }
  const hm = M.hmax, k = mode === 'atlas' ? 0.55 : 1;
  g.fillStyle = A.lin(0, hm * 0.5, 0, -hm * 0.5, [0, 'rgba(0,0,0,' + 0.34 * k + ')', 0.3, 'rgba(0,0,0,0)', 0.72, 'rgba(255,255,255,0)', 1, 'rgba(255,255,255,' + 0.2 * k + ')']); g.fillRect(-1, -2, 4, 4);
  if (mode !== 'atlas') A.hband(0.6, 0.74, 'rgba(255,255,255,0.13)', 0.12, 0.86);
  const ex = M.eye[0], gx = M.gill || (ex + 0.13 + M.eye[2]);
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.007; g.beginPath(); g.moveTo(gx - 0.01, lerp(M.B(gx), M.T(gx), 0.74)); g.quadraticCurveTo(gx + 0.045, (M.T(gx) + M.B(gx)) / 2, gx - 0.02, lerp(M.B(gx), M.T(gx), 0.2)); g.stroke();
  const mo = M.mouth || [0.0, (M.T(0.02) + M.B(0.02)) / 2 - 0.004, 0.05]; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.006; g.lineCap = 'round'; g.beginPath(); g.moveTo(mo[0], mo[1]); g.quadraticCurveTo(mo[0] + mo[2] * 0.6, mo[1] - 0.004, mo[0] + mo[2], mo[1] - 0.014); g.stroke();
  drawEye(A);
  g.restore();
  if (pect && G.pc) pect(A);
  return A;
}

/* vignette 2D */
function thumb(id, w, h, o) {
  o = o || {}; const M = prepare(OD.FISH_MODELS[id]), dpr = o.dpr || 2, cv = document.createElement('canvas'); cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d'), bb = M.bb, bw = bb[2] - bb[0], bh = bb[3] - bb[1], pad = o.pad !== undefined ? o.pad : 0.1;
  const S = Math.min(cv.width * (1 - pad * 2) / bw, cv.height * (1 - pad * 2) / bh), ox = cv.width / 2 - (bb[0] + bw / 2) * S, oy = cv.height / 2 + (bb[1] + bh / 2) * S;
  const flip = o.right ? -1 : 1;
  if (o.right) g.setTransform(-S, 0, 0, -S, cv.width - ox, oy); else g.setTransform(S, 0, 0, -S, ox, oy);
  g.lineJoin = 'round';
  render(g, M, S, 'thumb', A => {
    const pc = M.G.pc, sc = document.createElement('canvas'); sc.width = cv.width; sc.height = cv.height; const sg = sc.getContext('2d');
    if (o.right) sg.setTransform(-S, 0, 0, -S, cv.width - ox, oy); else sg.setTransform(S, 0, 0, -S, ox, oy);
    sg.translate(pc.x, pc.y); sg.rotate(-pc.ang); sg.scale(0.92, 1);
    const A2 = new Art(sg, M, 1 / S, 'thumb'); drawFin(A2, pc, finStyle(M, 'pc'), 'pc', 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = M.pcA !== undefined ? M.pcA : 0.86; g.drawImage(sc, 0, 0); g.restore();
  });
  return cv;
}

/* texture « atlas » : vue de profil + bande réservée à la nageoire pectorale */
function atlas(M, size) {
  prepare(M); const W = size, H = Math.round(size * 0.625), pf = M.atlasPect || 0.2, mh = H * (1 - pf), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), bb = M.bb, bw = bb[2] - bb[0], bh = bb[3] - bb[1];
  const S = Math.min(W * 0.98 / bw, mh * 0.98 / bh), ox = W / 2 - (bb[0] + bw / 2) * S, oy = mh / 2 + (bb[1] + bh / 2) * S;
  g.setTransform(S, 0, 0, -S, ox, oy); g.lineJoin = 'round';
  render(g, M, S, 'atlas', null);
  let uvP = null;
  if (M.G.pc) { const pc = M.G.pc; let ax = 0, ay0 = 0, ay1 = 0; for (const c of pc.cols) { ax = Math.max(ax, c.t[0]); ay0 = Math.min(ay0, c.t[1]); ay1 = Math.max(ay1, c.t[1]); }
    const ph = H * pf, S2 = Math.min(W * 0.96 / ax, ph * 0.94 / (ay1 - ay0)), px0 = W * 0.02, py0 = mh + ph / 2 + (ay0 + ay1) / 2 * S2;
    g.setTransform(S2, 0, 0, -S2, px0, py0); const A2 = new Art(g, M, 1 / S2, 'atlas'); drawFin(A2, pc, finStyle(M, 'pc'), 'pc', 0);
    uvP = (a, b) => [(px0 + a * S2) / W, 1 - (py0 - b * S2) / H]; }
  return { canvas: cv, uv: (x, y) => [(ox + x * S) / W, 1 - (oy - y * S) / H], uvP: uvP };
}

/* maillage 3D : corps tubulaire + nageoires en nappes + yeux bombés */
function geometry(M, at) {
  prepare(M); const P = [], UV = [], FIN = [], COL = [], IDX = []; let n = 0;
  const push = (x, y, z, uv, flex, type, side, rnd, col) => { P.push(0.5 - x, y, z); UV.push(uv[0], uv[1]); FIN.push(flex, type, side, rnd); if (col) COL.push(col[0], col[1], col[2], 1); else COL.push(0, 0, 0, 0); return n++; };
  const NS = 30, NR = 14, sq = M.sq || 2, ex = 2 / sq;
  for (let i = 0; i <= NS; i++) { const x = Math.pow(i / NS, 1.3), t = M.T(x), b = M.B(x), cy = (t + b) / 2, ry = Math.max((t - b) / 2, 0.0005), rz = i === 0 ? 0.0005 : M.W(x);
    for (let j = 0; j < NR; j++) { const th = j / NR * 6.2832, cs = Math.cos(th), sn = Math.sin(th), y = cy + ry * Math.sign(cs) * Math.pow(Math.abs(cs), ex), z = rz * Math.sign(sn) * Math.pow(Math.abs(sn), ex);
      push(x, y, z, at.uv(x, y), 0, 0, 0, 0); } }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * NR + j, b = i * NR + (j + 1) % NR; IDX.push(a, a + NR, b, b, a + NR, b + NR); }
  { const c = push(1.01, (M.T(1) + M.B(1)) / 2, 0, at.uv(1.0, (M.T(1) + M.B(1)) / 2), 0, 0, 0, 0), b0 = NS * NR; for (let j = 0; j < NR; j++) IDX.push(b0 + j, c, b0 + (j + 1) % NR); }
  const sheet = (gr, type, z0, zt, side, uvf, map) => { const c = gr.cols, R = gr.rows, first = n;
    for (let k = 0; k < c.length; k++) for (let r = 0; r <= R; r++) { const f = r / R, x = lerp(c[k].b[0], c[k].t[0], f), y = lerp(c[k].b[1], c[k].t[1], f);
      if (map) { const q = map(x, y, f, k / (c.length - 1)); push(q[0], q[1], q[2], uvf(x, y), f, type, side, k * 0.7); } else push(x, y, lerp(z0, zt, f), uvf(x, y), type === 2 ? f : f, type, side, k * 0.7); }
    for (let k = 0; k < c.length - 1; k++) for (let r = 0; r < R; r++) { const a = first + k * (R + 1) + r, b = a + R + 1; IDX.push(a, b, a + 1, a + 1, b, b + 1); } };
  M.G.d.forEach(gr => sheet(gr, 1, 0, 0, 0, at.uv));
  if (M.G.an) sheet(M.G.an, 1, 0, 0, 0, at.uv);
  if (M.G.c) sheet(M.G.c, 2, 0, 0, 0, at.uv);
  if (M.G.pv) { const px = M.fins.pv[0], zw = M.W(px) * 0.4; for (const s of [1, -1]) sheet(M.G.pv, 4, s * zw, s * (zw + M.fins.pv[1] * 0.45), s, at.uv); }
  if (M.G.pc && at.uvP) { const pc = M.G.pc, fl = M.flare !== undefined ? M.flare : 0.7, ca = Math.cos(pc.ang), sa = Math.sin(pc.ang), cf = Math.cos(fl), sf = Math.sin(fl);
    const t = M.T(pc.x), b = M.B(pc.x), cy = (t + b) / 2, ry = (t - b) / 2, zs = M.W(pc.x) * Math.sqrt(Math.max(0.1, 1 - Math.pow((pc.y - cy) / ry, 2))) * 0.94;
    for (const s of [1, -1]) sheet(pc, 3, 0, 0, s, at.uvP, (a, bb) => [pc.x + a * ca * cf + bb * sa, pc.y - a * sa * cf + bb * ca, s * (zs + a * sf)]); }
  { const e = M.eye, t = M.T(e[0]), b = M.B(e[0]), cy = (t + b) / 2, ry = (t - b) / 2, zs = M.W(e[0]) * Math.sqrt(Math.max(0.08, 1 - Math.pow((e[1] - cy) / ry, 2))), r = e[2] * 1.02, seg = 12;
    const ic = new T.Color(M.iris || '#c8b060'), iris = [ic.r, ic.g, ic.b], blk = [0.004, 0.004, 0.005], rim = [0.01, 0.01, 0.012], uv0 = at.uv(e[0], e[1]);
    const rings = [[0.52, blk], [0.54, iris], [0.86, iris], [0.9, rim], [1.08, rim]];
    for (const s of [1, -1]) { const zc = s * (zs - r * 0.42), dome = q => s * r * 0.62 * Math.sqrt(Math.max(0, 1 - q * q * 0.82)), c0 = push(e[0], e[1], zc + dome(0), uv0, 0, 5, s, 0, blk), first = n;
      for (const rg of rings) for (let j = 0; j < seg; j++) { const a = j / seg * 6.2832; push(e[0] + Math.cos(a) * r * rg[0], e[1] + Math.sin(a) * r * rg[0], zc + dome(rg[0]), uv0, 0, 5, s, 0, rg[1]); }
      for (let j = 0; j < seg; j++) IDX.push(c0, first + j, first + (j + 1) % seg);
      for (let q = 0; q < rings.length - 1; q++) for (let j = 0; j < seg; j++) { const a = first + q * seg + j, b2 = first + q * seg + (j + 1) % seg; IDX.push(a, a + seg, b2, b2, a + seg, b2 + seg); } } }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(UV, 2));
  g.setAttribute('aFin', new T.Float32BufferAttribute(FIN, 4)); g.setAttribute('aCol', new T.Float32BufferAttribute(COL, 4));
  g.setIndex(IDX); g.computeVertexNormals();
  g.boundingSphere = new T.Sphere(new T.Vector3(0, 0, 0), 1.6);
  return g;
}

OD.FishArt = { thumb: thumb, atlas: atlas, geometry: geometry, prepare: prepare };

/* ============================================================
   ESPÈCES — top/bot : profil dorsal/ventral ; fins : d (dorsales), an (anale), c (caudale), pv (pelviennes), pc (pectorales)
   ============================================================ */
const FM = OD.FISH_MODELS = {};
const WAVY = (A, col, lw, y0, y1, n, x0, x1, amp, fr) => { for (let i = 0; i < n; i++) { const t = lerp(y0, y1, (i + 0.5) / n); A.hline(t, lw, col, x0, x1, amp, fr + i * 3); } };

/* --- poissons-clowns --- */
function clown(o) {
  return Object.assign({
    top: { d: 0.215, pk: 0.4, f: 0.62, ped: 0.075 }, bot: { d: 0.205, pk: 0.42, f: 0.62, ped: 0.07 }, w: 0.092, eye: [0.115, 0.045, 0.034],
    fins: { d: [[0.3, 0.88, 0.25, 0.03, 0.085, 0.1, 0.085, 0.06, 0.09, 0.115, 0.1, 0.05]], an: [0.62, 0.88, 0.3, 0.03, 0.1, 0.12, 0.09, 0.04], c: [0.3, 0.19, 0.19, -0.35, 2], pv: [0.4, 0.17, 60, 35], pc: [0.3, -0.03, 0.2, 70, 20] },
    swim: { wave: 1.3, pect: 1.2, fin: 1, freq: 1.3 }
  }, o);
}
FM.ocellaris = clown({ col: '#ff7a14', iris: '#b86a2a', fin: { edge: '#141210', ew: 0.014 }, fc: '#ff7a14', fc1: '#ff8f2a',
  body(A) { A.vfill([0, '#f2600c', 0.45, '#ff8018', 1, '#ffa040']);
    A.band(0.205, 0.285, '#fbfbf8', { bow: 0.012, edge: '#161310', ew: 0.012 }); A.band(0.49, 0.6, '#fbfbf8', { bl: 0.055, br: 0.0, edge: '#161310', ew: 0.012 }); A.band(0.9, 0.975, '#fbfbf8', { bow: -0.008, edge: '#161310', ew: 0.012 }); },
  fp(A, name) { if (name === 'd') A.band(0.49, 0.6, '#fbfbf8', { bl: 0.03, edge: '#161310', ew: 0.012, slant: 0.12 }); } });
FM.percula = clown({ top: { d: 0.225, pk: 0.4, f: 0.6, ped: 0.078 }, bot: { d: 0.21, pk: 0.42, f: 0.6, ped: 0.072 }, col: '#ff6a0c', iris: '#ff8a1a', fin: { edge: '#0e0c0a', ew: 0.03 }, fc: '#ff6a0c', fc1: '#ff7a14',
  fins: { d: [[0.28, 0.88, 0.25, 0.04, 0.1, 0.115, 0.095, 0.06, 0.09, 0.115, 0.1, 0.05]], an: [0.62, 0.88, 0.3, 0.03, 0.1, 0.12, 0.09, 0.04], c: [0.3, 0.19, 0.19, -0.35, 2], pv: [0.4, 0.17, 60, 35], pc: [0.3, -0.03, 0.2, 70, 20] },
  body(A) { A.vfill([0, '#f0540a', 0.45, '#ff7210', 1, '#ff9430']);
    A.band(0.2, 0.285, '#fdfdfb', { bow: 0.012, edge: '#0e0c0a', ew: 0.03 }); A.band(0.49, 0.6, '#fdfdfb', { bl: 0.06, br: 0.0, edge: '#0e0c0a', ew: 0.032 }); A.band(0.9, 0.975, '#fdfdfb', { bow: -0.008, edge: '#0e0c0a', ew: 0.026 }); },
  fp(A, name) { if (name === 'd') A.band(0.49, 0.6, '#fdfdfb', { bl: 0.03, edge: '#0e0c0a', ew: 0.03, slant: 0.12 }); } });
FM.blackclown = clown({ col: '#141416', iris: '#3a3028', fin: { edge: '#050505', ew: 0.01, ray: 'rgba(255,255,255,0.07)' }, fc: '#17171a', fc1: '#222226', scale: 0.0,
  body(A) { A.vfill([0, '#0c0c0e', 0.5, '#1a1a1e', 1, '#2a2622']); A.g.fillStyle = A.rad(0.02, -0.01, 0.2, [0, 'rgba(150,70,20,0.75)', 1, 'rgba(150,70,20,0)']); A.g.fillRect(-1, -2, 4, 4);
    A.band(0.205, 0.285, '#fbfbf8', { bow: 0.012 }); A.band(0.49, 0.6, '#fbfbf8', { bl: 0.055, br: 0.0 }); A.band(0.9, 0.975, '#fbfbf8', { bow: -0.008 }); },
  fp(A, name) { if (name === 'd') A.band(0.49, 0.6, '#fbfbf8', { bl: 0.03, slant: 0.12 }); } });
FM.clarkii = clown({ top: { d: 0.245, pk: 0.4, f: 0.6, ped: 0.08 }, bot: { d: 0.235, pk: 0.42, f: 0.6, ped: 0.075 }, w: 0.1, col: '#1c1512', iris: '#d8a020',
  fins: { d: [[0.28, 0.9, 0.25, 0.04, 0.095, 0.11, 0.1, 0.075, 0.1, 0.12, 0.1, 0.05]], an: [0.6, 0.9, 0.3, 0.03, 0.11, 0.13, 0.1, 0.04], c: [0.32, 0.21, 0.21, 0.3, 1.6], pv: [0.4, 0.18, 60, 35], pc: [0.3, -0.03, 0.21, 70, 20] },
  fc: '#f7b21a', fc1: '#ffd24a', fs: { d: { c0: '#1c1512', c1: '#3a2a18' }, c: { c0: '#fff6d8', c1: '#ffd84a' } },
  body(A) { A.vfill([0, '#14100e', 0.55, '#241a14', 1, '#3a2a18']); A.hband(0, t => 0.2 + 0.16 * sstep(0.5, 0.1, t), '#f7ae18', 0, 0.8);
    A.g.fillStyle = A.rad(0.03, 0, 0.21, [0, '#ffb81a', 0.75, '#f29a12', 1, 'rgba(242,154,18,0)']); A.g.fillRect(-1, -2, 4, 4);
    A.band(0.2, 0.3, '#f8fbff', { bow: 0.014, edge: '#0c0a08', ew: 0.008 }); A.band(0.5, 0.63, '#f8fbff', { bow: 0.012, edge: '#0c0a08', ew: 0.008 }); A.band(0.88, 1.05, '#fbfbf2', {}); },
  fp(A, name) { if (name === 'd') { A.band(0.5, 0.63, '#f8fbff', { slant: 0.1 }); A.g.fillStyle = A.lin(0.7, 0, 0.92, 0, [0, 'rgba(247,178,26,0)', 1, '#f7b21a']); A.g.fillRect(-1, -2, 4, 4); } } });

/* --- chirurgiens --- */
FM.bluetang = {
  top: { d: 0.235, pk: 0.4, f: 0.74, ped: 0.06 }, bot: { d: 0.215, pk: 0.42, f: 0.74, ped: 0.055 }, w: 0.07, eye: [0.13, 0.065, 0.03], iris: '#2a2a30', col: '#1e5fe0', scale: 0.035,
  fins: { d: [[0.2, 0.9, 0.15, 0.03, 0.07, 0.085, 0.085, 0.085, 0.08, 0.07, 0.045, 0.02]], an: [0.5, 0.9, 0.15, 0.02, 0.07, 0.075, 0.07, 0.05, 0.02], c: [0.28, 0.2, 0.2, 0.14, 1.5], pv: [0.36, 0.12, 65, 25], pc: [0.27, -0.02, 0.19, 60, 25] },
  fc: '#1e5fe0', fc1: '#2a78f0', fin: { edge: '#07070f', ew: 0.02 }, fs: { c: { c0: '#0a0a14', c1: '#0a0a14', edge: null }, pc: { c0: '#1e5fe0', c1: '#ffd21a', edge: null }, pv: { c0: '#1a50c8', c1: '#0a0a14' } },
  swim: { wave: 0.5, pect: 1.5, fin: 0.8, freq: 1 },
  body(A) { A.vfill([0, '#143cb8', 0.45, '#2a7af5', 1, '#3a8cff']);
    A.bez([0.1, 0.07, 0.24, 0.2, 0.62, 0.205, 0.98, 0.045], 0.052, '#07070f'); A.bez([0.34, 0.165, 0.2, 0.06, 0.3, -0.055, 0.46, -0.02, 0.62, 0.012, 0.8, 0.03, 0.97, 0.03], 0.046, '#07070f');
    A.poly([[0.9, 0.0], [1.02, 0.05], [1.02, -0.045]], '#ffd21a'); },
  fp(A, name) { if (name === 'c') A.poly([[0.97, 0.03], [1.3, 0.135], [1.3, -0.135], [0.97, -0.03]], '#ffd21a'); }
};
const ZEB = { top: [[0, 0.0], [0.05, 0.035], [0.12, 0.085], [0.2, 0.195], [0.32, 0.285], [0.48, 0.31], [0.66, 0.27], [0.82, 0.17], [0.93, 0.075], [1, 0.06]], bot: [[0, -0.006], [0.05, -0.032], [0.12, -0.07], [0.22, -0.185], [0.36, -0.275], [0.5, -0.3], [0.66, -0.26], [0.82, -0.16], [0.93, -0.07], [1, -0.055]] };
FM.yellowtang = {
  top: ZEB.top, bot: ZEB.bot, w: 0.062, eye: [0.2, 0.115, 0.03], iris: '#e8b020', col: '#ffd400', scale: 0.03, gill: 0.3, mouth: [0.0, -0.004, 0.035],
  fins: { d: [[0.24, 0.9, 0.22, 0.1, 0.17, 0.2, 0.21, 0.2, 0.18, 0.14, 0.08, 0.02]], an: [0.42, 0.9, 0.22, 0.06, 0.15, 0.17, 0.16, 0.12, 0.07, 0.02], c: [0.24, 0.17, 0.17, 0.08, 1.5], pv: [0.38, 0.12, 70, 22], pc: [0.31, -0.03, 0.18, 55, 15] },
  fc: '#ffd400', fc1: '#ffdf30', fin: { ray: 'rgba(160,110,0,0.22)' }, swim: { wave: 0.45, pect: 1.5, fin: 0.9, freq: 1 },
  body(A) { A.vfill([0, '#f0b400', 0.4, '#ffd400', 1, '#ffe84a']); A.hline(0.52, 0.008, 'rgba(255,255,255,0.4)', 0.32, 0.86); A.line([[0.885, 0.0], [0.94, 0.002]], 0.014, '#fffef0'); }
};
FM.sailfin = {
  top: ZEB.top, bot: ZEB.bot, w: 0.064, eye: [0.2, 0.115, 0.03], iris: '#d8c070', col: '#e9dcc0', scale: 0.03, gill: 0.3, mouth: [0.0, -0.004, 0.035],
  fins: { d: [[0.22, 0.9, 0.12, 0.2, 0.31, 0.37, 0.39, 0.37, 0.33, 0.26, 0.15, 0.04]], an: [0.4, 0.9, 0.12, 0.13, 0.27, 0.31, 0.29, 0.23, 0.12, 0.03], c: [0.24, 0.17, 0.17, 0.05, 1.5], pv: [0.38, 0.13, 70, 22], pc: [0.31, -0.03, 0.18, 55, 15] },
  fc: '#4a3a2c', fc1: '#2e241c', fin: { ray: 'rgba(255,240,200,0.12)' }, fs: { c: { c0: '#a88f4a', c1: '#c8b060', edge: '#f4ecd0', ew: 0.008 }, pc: { c0: '#c8b888', c1: '#e8dcb0' }, pv: { c0: '#4a3a2c', c1: '#2e241c' } },
  swim: { wave: 0.45, pect: 1.5, fin: 0.9, freq: 0.95 },
  bands(A, fin) { const dk = '#3e3024', ys = 'rgba(232,180,60,0.85)';
    for (const b of [[0.25, 0.37], [0.45, 0.56], [0.64, 0.74], [0.82, 0.9]]) A.band(b[0], b[1], dk, { hh: 0.75, slant: fin ? 0.1 : 0 });
    for (const x of [0.41, 0.6, 0.78]) A.band(x - 0.006, x + 0.006, ys, { hh: 0.75, slant: fin ? 0.1 : 0 });
    for (const x of [0.29, 0.33, 0.49, 0.53, 0.68, 0.71]) A.band(x - 0.004, x + 0.004, 'rgba(232,190,90,0.55)', { hh: 0.75, slant: fin ? 0.1 : 0 }); },
  body(A) { A.vfill([0, '#d8c8a4', 0.5, '#ece0c4', 1, '#f6eedc']); FM.sailfin.bands(A, false); A.band(0.175, 0.225, '#2e241c', { hh: 0.5, slant: -0.25 });
    A.dots(26, 0.004, 0.007, 'rgba(226,170,50,0.9)', 0.02, 0.2, -0.1, 0.12); },
  fp(A, name) { if (name === 'd' || name === 'an') { A.fill('#d8c8a4'); FM.sailfin.bands(A, true); } }
};
FM.scopas = {
  top: ZEB.top, bot: ZEB.bot, w: 0.062, eye: [0.2, 0.115, 0.03], iris: '#b8a060', col: '#5a4630', scale: 0.03, gill: 0.3, mouth: [0.0, -0.004, 0.035],
  fins: { d: [[0.24, 0.9, 0.22, 0.09, 0.155, 0.18, 0.19, 0.18, 0.16, 0.125, 0.07, 0.02]], an: [0.42, 0.9, 0.22, 0.05, 0.135, 0.155, 0.145, 0.11, 0.06, 0.02], c: [0.24, 0.17, 0.17, 0.08, 1.5], pv: [0.38, 0.12, 70, 22], pc: [0.31, -0.03, 0.18, 55, 15] },
  fc: '#3a2a1e', fc1: '#1e1612', fin: { ray: 'rgba(255,230,180,0.08)' }, fs: { pc: { c0: '#6a5638', c1: '#8a7448' } }, swim: { wave: 0.45, pect: 1.5, fin: 0.9, freq: 1 },
  body(A) { A.hfill([0, '#c0a658', 0.3, '#9a7e44', 0.6, '#5c4630', 1, '#2a1e18']);
    for (let i = 0; i < 12; i++) A.hline(0.08 + i * 0.075, 0.0045, 'rgba(150,215,225,0.42)', 0.34, 0.92, 0.003, 60);
    A.dots(60, 0.003, 0.005, 'rgba(160,220,230,0.6)', 0.03, 0.34, -0.2, 0.24); A.line([[0.885, 0.0], [0.94, 0.002]], 0.014, '#fffef0'); }
};

/* --- poissons-anges --- */
const ANG = { top: { d: 0.25, pk: 0.42, f: 0.66, ped: 0.08 }, bot: { d: 0.24, pk: 0.44, f: 0.66, ped: 0.075 } };
FM.flameangel = {
  top: ANG.top, bot: ANG.bot, w: 0.076, eye: [0.12, 0.06, 0.03], iris: '#e8501a', col: '#f0301a', scale: 0.045,
  fins: { d: [[0.26, 0.93, 0.3, 0.04, 0.08, 0.09, 0.095, 0.1, 0.11, 0.125, 0.13, 0.08]], an: [0.5, 0.93, 0.3, 0.04, 0.1, 0.12, 0.13, 0.13, 0.08], c: [0.26, 0.17, 0.17, -0.25, 2], pv: [0.4, 0.16, 65, 28], pc: [0.3, -0.03, 0.18, 60, 20] },
  fc: '#f0301a', fc1: '#e8281a', fs: { c: { c0: '#ff8a1a', c1: '#ffb040' }, pc: { c0: '#ff7a1a', c1: '#ffa040' } }, swim: { wave: 0.55, pect: 1.4, fin: 1, freq: 1.1 },
  body(A) { A.fill(A.rad(0.5, 0.0, 0.5, [0, '#ff9a1a', 0.45, '#ff5a14', 1, '#e0200f']));
    A.spot(0.33, 0.07, 0.03, '#0c0a0a', 0.085); for (const x of [0.45, 0.555, 0.655, 0.75]) A.spot(x, 0.02, 0.012, '#0c0a0a', 0.13 - (x - 0.45) * 0.1); },
  fp(A, name) { if (name === 'd' || name === 'an') { A.g.fillStyle = A.lin(0.62, 0, 0.82, 0, [0, 'rgba(8,8,16,0)', 1, 'rgba(8,8,16,0.96)']); A.g.fillRect(-1, -2, 4, 4);
    for (let x = 0.7; x < 1.1; x += 0.034) A.band(x, x + 0.012, '#3a56ff', { hh: 0.6, slant: 0.5 }); } }
};
FM.bicolorangel = {
  top: { d: 0.235, pk: 0.42, f: 0.68, ped: 0.078 }, bot: { d: 0.225, pk: 0.44, f: 0.68, ped: 0.072 }, w: 0.074, eye: [0.12, 0.055, 0.03], iris: '#e8b020', col: '#ffd91a', scale: 0.045,
  fins: { d: [[0.26, 0.93, 0.3, 0.04, 0.075, 0.085, 0.09, 0.095, 0.105, 0.12, 0.125, 0.075]], an: [0.5, 0.93, 0.3, 0.04, 0.095, 0.115, 0.125, 0.125, 0.075], c: [0.26, 0.17, 0.17, -0.25, 2], pv: [0.4, 0.16, 65, 28], pc: [0.3, -0.03, 0.18, 60, 20] },
  fc: '#ffd91a', fc1: '#ffe24a', swim: { wave: 0.55, pect: 1.4, fin: 1, freq: 1.1 },
  split(A) { A.band(0.44, 0.955, '#18247f', { hh: 0.7, bl: 0.02 }); A.g.fillStyle = A.lin(0.44, 0, 0.95, 0, [0, 'rgba(40,70,200,0.5)', 1, 'rgba(10,14,70,0.5)']); A.band(0.44, 0.955, A.g.fillStyle, { hh: 0.7, bl: 0.02 }); },
  body(A) { A.vfill([0, '#f2c010', 0.5, '#ffd91a', 1, '#ffe85a']); FM.bicolorangel.split(A); A.spot(0.125, 0.115, 0.022, '#1c2c9a', 0.055, 0.25); },
  fp(A, name) { if (name === 'd' || name === 'an') FM.bicolorangel.split(A); }
};
FM.emperor = {
  top: { d: 0.3, pk: 0.45, f: 0.6, ped: 0.085 }, bot: { d: 0.29, pk: 0.45, f: 0.6, ped: 0.08 }, w: 0.082, eye: [0.13, 0.07, 0.028], iris: '#c8a020', col: '#ffd21a', scale: 0.03, sn: [0.14, 1.25],
  fins: { d: [[0.2, 0.95, 0.35, 0.03, 0.06, 0.07, 0.08, 0.09, 0.1, 0.12, 0.155, 0.1]], an: [0.45, 0.95, 0.3, 0.04, 0.09, 0.11, 0.12, 0.13, 0.09], c: [0.24, 0.17, 0.17, -0.3, 2], pv: [0.38, 0.16, 70, 25], pc: [0.29, -0.04, 0.19, 60, 20] },
  fc: '#ffd21a', fc1: '#ffe04a', fs: { d: { edge: '#f4f6ff', ew: 0.01 }, an: { c0: '#16245c', c1: '#1e3a8a' }, c: { c0: '#ffc81a', c1: '#ffd84a' }, pv: { c0: '#1a2a6a', c1: '#16245c' }, pc: { c0: '#1a1a22', c1: '#ffcf30' } },
  swim: { wave: 0.5, pect: 1.4, fin: 0.9, freq: 0.9 },
  lines(A, c, lw) { for (let i = 0; i < 16; i++) { const y0 = -0.36 + i * 0.047; A.line([[0.26, y0 - 0.02], [0.6, y0 + 0.03], [1.05, y0 + 0.085]], lw, c); } },
  body(A) { A.fill('#ffd21a'); FM.emperor.lines(A, '#1e56d8', 0.021);
    A.band(-0.1, 0.21, '#cfdfee', { hh: 0.5, br: 0.02 }); A.band(0.235, 0.335, '#0a0a12', { hh: 0.5, bow: 0.012, edge: '#3a8cff', ew: 0.009 }); A.hband(0.78, 1.2, '#ffd21a', 0.22, 0.36);
    A.band(0.095, 0.175, '#0a0a12', { hh: 0.5, bow: 0.006, slant: -0.12, edge: '#3a8cff', ew: 0.008 }); A.poly([[-0.02, 0.03], [0.07, 0.03], [0.05, -0.05], [-0.02, -0.05]], '#f4f8fb'); },
  fp(A, name) { if (name === 'd') FM.emperor.lines(A, '#1e56d8', 0.021); if (name === 'an') FM.emperor.lines(A, '#4a8cff', 0.01); }
};

/* --- papillons --- */
FM.semilarvatus = {
  top: { d: 0.34, pk: 0.46, f: 0.56, ped: 0.07 }, bot: { d: 0.33, pk: 0.46, f: 0.56, ped: 0.066 }, w: 0.066, eye: [0.15, 0.075, 0.03], iris: '#c89020', col: '#ffd21a', scale: 0.03, sn: [0.15, 1.6], gill: 0.27,
  fins: { d: [[0.22, 0.95, 0.2, 0.05, 0.09, 0.11, 0.12, 0.12, 0.12, 0.11, 0.09, 0.04]], an: [0.48, 0.95, 0.2, 0.05, 0.11, 0.12, 0.11, 0.08, 0.03], c: [0.2, 0.15, 0.15, 0.0, 1], pv: [0.38, 0.15, 75, 25], pc: [0.31, -0.03, 0.17, 55, 15] },
  fc: '#ffd21a', fc1: '#ffc81a', fin: { edge: '#1a1612', ew: 0.007, ray: 'rgba(180,110,0,0.2)' }, fs: { pc: { edge: null, c0: '#ffe04a', c1: '#fff0a0' }, pv: { edge: null } }, swim: { wave: 0.5, pect: 1.4, fin: 1, freq: 1 },
  body(A) { A.fill(A.rad(0.5, 0, 0.55, [0, '#ffe030', 0.6, '#ffd21a', 1, '#f8b414']));
    for (let x = 0.3; x < 0.94; x += 0.047) A.band(x, x + 0.0085, 'rgba(210,92,18,0.8)', { hh: 0.42, bow: 0.01 });
    A.spot(0.24, 0.0, 0.05, '#4f6f92', 0.09, 0.15); A.spot(0.24, 0.0, 0.03, 'rgba(110,150,190,0.6)', 0.065, 0.15); }
};
FM.longnose = {
  top: [[0, 0.011], [0.1, 0.017], [0.2, 0.028], [0.27, 0.085], [0.36, 0.2], [0.5, 0.27], [0.66, 0.25], [0.82, 0.15], [0.93, 0.065], [1, 0.055]],
  bot: [[0, -0.011], [0.1, -0.019], [0.2, -0.034], [0.27, -0.08], [0.38, -0.18], [0.52, -0.25], [0.68, -0.22], [0.82, -0.14], [0.93, -0.06], [1, -0.05]],
  w: 0.062, eye: [0.3, 0.055, 0.028], iris: '#1a1a1e', col: '#ffd91a', scale: 0.03, gill: 0.4, mouth: [0.0, 0.0, 0.03],
  wp: [[0, 0.006], [0.2, 0.012], [0.3, 0.04], [0.5, 0.062], [0.75, 0.04], [1, 0.012]],
  fins: { d: [[0.36, 0.94, 0.22, 0.1, 0.14, 0.15, 0.15, 0.14, 0.13, 0.13, 0.12, 0.06]], an: [0.56, 0.94, 0.25, 0.05, 0.12, 0.14, 0.13, 0.1, 0.04], c: [0.16, 0.1, 0.1, 0.0, 1], pv: [0.45, 0.16, 75, 22], pc: [0.39, -0.02, 0.16, 55, 15] },
  fc: '#ffd91a', fc1: '#ffe24a', fin: { ray: 'rgba(170,110,0,0.22)' }, fs: { d: { cut: 0.22 }, c: { c0: 'rgba(225,232,236,0.7)', c1: 'rgba(235,240,244,0.5)' }, pc: { c0: 'rgba(255,235,120,0.8)', c1: 'rgba(255,245,180,0.6)' } },
  swim: { wave: 0.45, pect: 1.4, fin: 1, freq: 1 },
  body(A) { A.vfill([0, '#f6c410', 0.5, '#ffd91a', 1, '#ffe85a']); const M = A.M, up = [], lo = [];
    for (let i = 0; i <= 16; i++) { const x = 0.385 * i / 16; up.push([x, M.T(x) + 0.03]); lo.push([x, M.B(x) - 0.03]); }
    A.poly(up.concat([[0.385, 0.03], [0.3, 0.012], [0, 0.0]]), '#0c0c10'); A.poly(lo.concat([[0.36, 0.02], [0.3, 0.008], [0, -0.002]]), '#eef2f4'); },
  fp(A, name) { if (name === 'an') { A.spot(0.9, A.M.B(0.88) - 0.045, 0.026, '#0c0c10'); } }
};

/* --- mandarin --- */
FM.mandarin = {
  top: [[0, 0.02], [0.05, 0.085], [0.14, 0.125], [0.26, 0.12], [0.45, 0.105], [0.65, 0.085], [0.85, 0.06], [1, 0.05]], bot: [[0, -0.02], [0.06, -0.07], [0.2, -0.095], [0.45, -0.09], [0.7, -0.07], [0.88, -0.05], [1, -0.045]],
  wp: [[0, 0.03], [0.12, 0.125], [0.3, 0.115], [0.6, 0.07], [1, 0.02]], w: 0.12, eye: [0.105, 0.088, 0.032], iris: '#e0401a', col: '#1a6ae0', scale: 0, gill: 0.25, mouth: [0.0, 0.0, 0.035],
  fins: { d: [[0.22, 0.4, 0.35, 0.06, 0.2, 0.17, 0.06], [0.45, 0.85, 0.3, 0.1, 0.13, 0.13, 0.11, 0.06]], an: [0.5, 0.85, 0.3, 0.07, 0.1, 0.1, 0.08, 0.04], c: [0.3, 0.17, 0.17, -0.4, 2], pv: [0.28, 0.27, 35, 70], pc: [0.25, -0.02, 0.17, 80, 10] },
  fc: '#ff8a1a', fc1: '#ffa030', fin: { edge: '#2a8cff', ew: 0.014, ray: 'rgba(0,40,120,0.25)' }, swim: { wave: 0.25, pect: 1.7, fin: 1.4, freq: 0.9 }, flare: 1.0,
  body(A) { A.hfill([0, '#2fb86a', 0.22, '#1f8ad8', 0.6, '#1a62d8', 1, '#1a4cc0']);
    for (let i = 0; i < 6; i++) { const t = 0.12 + i * 0.155; A.hline(t, 0.034, '#0a3a2a', 0.16, 1.0, 0.02, 34 + i * 2); A.hline(t, 0.02, '#ff8a1a', 0.16, 1.0, 0.02, 34 + i * 2); }
    for (let i = 0; i < 5; i++) { A.hline(0.15 + i * 0.17, 0.013, '#2a9cff', 0.0, 0.2, 0.012, 60); }
    A.dots(10, 0.006, 0.01, '#2a9cff', 0.02, 0.18, -0.07, 0.03); },
  fp(A, name) { const g = A.g; for (let i = 0; i < 5; i++) { const y = -0.4 + i * 0.16; A.line([[0, y], [0.3, y + 0.05], [0.6, y - 0.02], [0.9, y + 0.05], [1.4, y]], 0.012, 'rgba(26,90,220,0.75)'); }
    if (name === 'c') { for (let i = 0; i < 5; i++) A.band(1.04 + i * 0.055, 1.055 + i * 0.055, 'rgba(26,90,220,0.7)', { hh: 0.3, bow: 0.02 }); } void g; }
};

/* --- demoiselles et chromis --- */
FM.bluedamsel = {
  top: { d: 0.2, pk: 0.38, f: 0.7, ped: 0.065 }, bot: { d: 0.19, pk: 0.4, f: 0.7, ped: 0.06 }, w: 0.076, eye: [0.12, 0.045, 0.032], iris: '#2a3a8a', col: '#1a4cff', scale: 0.05,
  fins: { d: [[0.28, 0.88, 0.3, 0.03, 0.07, 0.075, 0.075, 0.08, 0.1, 0.11, 0.06]], an: [0.58, 0.88, 0.3, 0.03, 0.09, 0.1, 0.08, 0.03], c: [0.27, 0.16, 0.16, 0.35, 1.4], pv: [0.38, 0.15, 60, 25], pc: [0.28, -0.02, 0.17, 60, 20] },
  fc: '#1a4cff', fc1: '#2a6cff', fin: { edge: '#0a1450', ew: 0.008 }, fs: { c: { c0: '#2a6cff', c1: 'rgba(120,180,255,0.7)', edge: null }, pc: { c0: 'rgba(60,120,255,0.75)', c1: 'rgba(150,200,255,0.5)', edge: null } },
  swim: { wave: 1.0, pect: 1.2, fin: 1, freq: 1.3 },
  body(A) { A.vfill([0, '#1030c8', 0.45, '#1e5aff', 1, '#3a8cff']); A.line([[0.0, 0.008], [0.1, 0.04], [0.2, 0.062]], 0.014, '#07091e'); },
  fp(A, name) { if (name === 'd') A.spot(0.81, A.M.T(0.8) + 0.012, 0.022, '#07091e'); }
};
FM.chromis = {
  top: { d: 0.22, pk: 0.4, f: 0.7, ped: 0.06 }, bot: { d: 0.21, pk: 0.42, f: 0.7, ped: 0.055 }, w: 0.072, eye: [0.13, 0.045, 0.036], iris: '#c8d8c8', col: '#52cfae', scale: 0.11,
  fins: { d: [[0.28, 0.88, 0.3, 0.03, 0.075, 0.08, 0.08, 0.08, 0.09, 0.1, 0.05]], an: [0.58, 0.88, 0.3, 0.03, 0.09, 0.1, 0.07, 0.03], c: [0.32, 0.2, 0.2, 0.55, 1.3], pv: [0.38, 0.16, 60, 22], pc: [0.29, -0.02, 0.18, 60, 20] },
  fc: 'rgba(96,214,178,0.9)', fc1: 'rgba(170,240,214,0.65)', fin: { ray: 'rgba(0,80,70,0.25)' }, swim: { wave: 1.0, pect: 1.2, fin: 1, freq: 1.35 },
  body(A) { A.vfill([0, '#2f9aa8', 0.35, '#52cfae', 0.75, '#8fe8bc', 1, '#d8fbe6']); A.g.fillStyle = A.lin(0, 0, 1, 0, [0, 'rgba(60,150,230,0.28)', 0.5, 'rgba(60,150,230,0)', 1, 'rgba(120,240,170,0.2)']); A.g.fillRect(-1, -2, 4, 4); }
};

/* --- cardinaux --- */
const CARD = { top: [[0, 0.0], [0.05, 0.075], [0.15, 0.16], [0.3, 0.215], [0.45, 0.22], [0.62, 0.175], [0.8, 0.09], [0.92, 0.06], [1, 0.055]], bot: [[0, -0.01], [0.06, -0.085], [0.18, -0.165], [0.35, -0.205], [0.5, -0.195], [0.66, -0.14], [0.82, -0.075], [0.93, -0.055], [1, -0.05]] };
FM.banggai = {
  top: CARD.top, bot: CARD.bot, w: 0.08, eye: [0.13, 0.055, 0.05], iris: '#d8dce0', col: '#dfe3e6', scale: 0.07, mouth: [0.0, -0.01, 0.06],
  fins: { d: [[0.34, 0.46, 0.5, 0.1, 0.36, 0.3, 0.08], [0.56, 0.74, 0.9, 0.08, 0.3, 0.26, 0.1]], an: [0.56, 0.74, 0.9, 0.08, 0.26, 0.22, 0.08], c: [0.5, 0.3, 0.3, 0.76, 1.15], pv: [0.36, 0.3, 65, 30], pc: [0.3, -0.03, 0.16, 55, 10] },
  fc: '#101012', fc1: '#1a1a1e', fin: { ray: 'rgba(255,255,255,0.08)' }, fs: { pc: { c0: 'rgba(230,235,240,0.5)', c1: 'rgba(240,244,248,0.3)' }, c: { c0: '#e6eaee', c1: '#f2f4f6' } },
  swim: { wave: 0.6, pect: 1.2, fin: 1.2, freq: 0.8 },
  body(A) { A.vfill([0, '#b8c0c8', 0.4, '#e6eaec', 1, '#fbfcfc']);
    A.band(0.095, 0.165, '#0c0c0e', { slant: -0.1 }); A.band(0.33, 0.415, '#0c0c0e', { slant: 0.12 }); A.band(0.575, 0.665, '#0c0c0e', { slant: 0.3 });
    A.dots(26, 0.008, 0.012, '#ffffff', 0.42, 1.0, -0.17, 0.16); A.dots(10, 0.006, 0.009, 'rgba(255,255,255,0.9)', 0.33, 0.66, -0.2, 0.2); },
  fp(A, name) { if (name === 'c') { A.poly([[0.97, 0.06], [1.6, 0.32], [1.6, 0.2], [0.97, 0.02]], '#0c0c0e'); A.poly([[0.97, -0.06], [1.6, -0.32], [1.6, -0.2], [0.97, -0.02]], '#0c0c0e'); A.dots(22, 0.007, 0.011, '#fff', 1.0, 1.5, -0.3, 0.3); }
    else if (name !== 'pc') A.dots(name === 'pv' ? 9 : 14, 0.007, 0.012, '#ffffff', 0.3, 1.1, -0.5, 0.6); }
};
FM.pajama = {
  top: [[0, 0.0], [0.05, 0.08], [0.15, 0.17], [0.3, 0.225], [0.45, 0.23], [0.62, 0.18], [0.8, 0.09], [0.92, 0.06], [1, 0.055]], bot: CARD.bot, w: 0.086, eye: [0.14, 0.06, 0.056], iris: '#e03018', col: '#f2ede6', scale: 0.06, mouth: [0.0, -0.01, 0.06],
  fins: { d: [[0.36, 0.5, 0.3, 0.06, 0.2, 0.17, 0.05], [0.58, 0.76, 0.6, 0.06, 0.2, 0.17, 0.06]], an: [0.58, 0.76, 0.5, 0.06, 0.16, 0.13, 0.05], c: [0.3, 0.19, 0.19, 0.4, 1.3], pv: [0.38, 0.17, 65, 28], pc: [0.31, -0.03, 0.15, 55, 10] },
  fc: 'rgba(240,236,220,0.7)', fc1: 'rgba(250,248,240,0.45)', fin: { ray: 'rgba(90,60,30,0.2)' }, fs: { d: { c0: '#e0d04a', c1: 'rgba(240,230,140,0.7)' }, pv: { c0: '#e8d85a', c1: 'rgba(250,240,170,0.7)' } },
  swim: { wave: 0.6, pect: 1.2, fin: 1.2, freq: 0.8 },
  body(A) { A.hfill([0, '#d4cc48', 0.3, '#dcd660', 0.4, '#efe9dc', 1, '#f6f2ec']); A.band(0.385, 0.47, '#141012', { slant: 0.1 });
    for (let i = 0; i < 26; i++) { const x = 0.5 + A.r() * 0.46, y = -0.16 + A.r() * 0.3; A.spot(x, y, 0.013 + A.r() * 0.006, '#8a3a24'); } },
  fp(A, name, idx) { if (name === 'd' && idx === 1) A.band(0.5, 0.64, 'rgba(20,16,18,0.55)', { hh: 0.26, slant: 0.5 }); }
};

/* --- poisson-lion --- */
FM.lionfish = {
  top: [[0, 0.01], [0.05, 0.09], [0.14, 0.16], [0.28, 0.185], [0.45, 0.175], [0.65, 0.13], [0.82, 0.08], [0.93, 0.055], [1, 0.05]], bot: [[0, -0.02], [0.06, -0.1], [0.18, -0.155], [0.35, -0.165], [0.55, -0.14], [0.72, -0.1], [0.87, -0.06], [1, -0.045]],
  wp: [[0, 0.03], [0.12, 0.1], [0.3, 0.105], [0.6, 0.07], [1, 0.02]], w: 0.1, eye: [0.13, 0.065, 0.03], iris: '#a04a2a', col: '#f3e6d6', scale: 0, mouth: [0.0, -0.02, 0.09], atlasPect: 0.46, flare: 1.05, pcA: 0.95,
  fins: { d: [[0.2, 0.62, 0.1, 0.3, 0.38, 0.42, 0.42, 0.4, 0.36, 0.3, 0.24], [0.64, 0.86, 0.3, 0.12, 0.2, 0.2, 0.14, 0.06]], an: [0.6, 0.84, 0.3, 0.1, 0.18, 0.18, 0.1], c: [0.3, 0.18, 0.18, -0.4, 2], pv: [0.36, 0.3, 70, 40], pc: [0.3, -0.04, 0.62, 150, 25], dn: [12] },
  fc: '#f3e6d6', fc1: '#f8eee2', fin: { ray: 'rgba(90,30,20,0.45)' },
  fs: { d: { cut: 0.84, cutW: 0.1 }, d1: { c0: 'rgba(245,236,224,0.75)', c1: 'rgba(250,244,236,0.55)' }, an: { c0: 'rgba(245,236,224,0.75)', c1: 'rgba(250,244,236,0.55)' }, c: { c0: 'rgba(245,236,224,0.75)', c1: 'rgba(250,244,236,0.55)' }, pv: { c0: '#5a1c14', c1: '#2e0e0a' }, pc: { cut: 0.8, cutW: 0.12 } },
  swim: { wave: 0.3, pect: 0.45, fin: 1.5, freq: 0.7 },
  body(A) { A.fill('#f3e6d6'); const dk = '#7a2418', md = '#a8492e';
    for (let i = 0; i < 17; i++) { const x = 0.2 + i * 0.05; A.band(x, x + 0.024, dk, { slant: -0.12 }); A.band(x + 0.035, x + 0.04, md, { slant: -0.12 }); }
    A.band(-0.1, 0.2, '#f3e6d6', { br: 0.01 }); for (let i = 0; i < 5; i++) { const a = -2.2 + i * 0.62; A.line([[0.13 + Math.cos(a) * 0.045, 0.065 + Math.sin(a) * 0.045], [0.13 + Math.cos(a) * 0.3, 0.065 + Math.sin(a) * 0.3]], 0.019, dk); } A.band(0.185, 0.2, dk, { slant: -0.12 }); },
  fp(A, name, idx) { const dk = '#7a2418';
    if (name === 'pc') { for (let i = 1; i < 12; i++) { A.g.beginPath(); A.g.arc(0, 0, i * 0.056, -1.6, 1.6); A.g.strokeStyle = (i % 3 === 0) ? '#fbf4ea' : (i % 3 === 1 ? dk : '#b85a3a'); A.g.lineWidth = 0.02; A.g.stroke(); } }
    else if (name === 'd' && idx === 0) { for (let y = 0.2; y < 0.7; y += 0.085) A.band(-1, 2, dk, { hh: 0.02, }); for (let i = 0; i < 6; i++) { const y = 0.2 + i * 0.08; A.poly([[0.1, y], [0.9, y + 0.03], [0.9, y + 0.065], [0.1, y + 0.035]], dk); } }
    else if (name === 'pv') A.dots(12, 0.008, 0.014, '#f6ece0', 0.3, 0.7, -0.5, -0.1);
    else A.dots(34, 0.008, 0.013, '#5a1c14', 0.55, 1.4, -0.42, 0.42); }
};

/* --- baliste Picasso --- */
FM.picasso = {
  top: [[0, 0.0], [0.06, 0.05], [0.18, 0.13], [0.32, 0.21], [0.45, 0.245], [0.6, 0.2], [0.78, 0.11], [0.92, 0.06], [1, 0.055]], bot: [[0, -0.02], [0.08, -0.07], [0.22, -0.15], [0.38, -0.22], [0.5, -0.235], [0.62, -0.19], [0.78, -0.1], [0.92, -0.055], [1, -0.05]],
  w: 0.09, eye: [0.31, 0.15, 0.027], iris: '#d8b040', col: '#d4c6ac', scale: 0.05, scaleS: 0.03, gill: 0.4, mouth: [0.0, -0.012, 0.045],
  fins: { d: [[0.34, 0.45, 0.6, 0.02, 0.13, 0.06, 0.01], [0.56, 0.9, 0.2, 0.04, 0.11, 0.12, 0.1, 0.07, 0.03]], an: [0.58, 0.9, 0.2, 0.04, 0.1, 0.11, 0.09, 0.06, 0.02], c: [0.22, 0.14, 0.14, -0.15, 2], pc: [0.4, 0.02, 0.11, 70, 0] },
  fc: 'rgba(236,230,214,0.8)', fc1: 'rgba(245,242,232,0.55)', fin: { ray: 'rgba(80,60,30,0.25)' }, fs: { d: { c0: '#2a2622', c1: '#4a4238' }, c: { c0: '#d8cdb4', c1: '#efe8d6' } },
  swim: { wave: 0.14, pect: 1.3, fin: 3.2, freq: 1 },
  body(A) { A.vfill([0, '#b8a684', 0.42, '#d8ccb0', 0.62, '#f4f1ea', 1, '#ffffff']);
    A.poly([[0.4, 0.09], [0.56, 0.05], [0.74, -0.03], [0.93, -0.02], [0.84, -0.12], [0.7, -0.24], [0.5, -0.25], [0.47, -0.08]], '#161618');
    for (let i = 0; i < 4; i++) { const x = 0.57 + i * 0.085; A.line([[x, 0.02 - i * 0.012], [x + 0.11, -0.2 + i * 0.03]], 0.017, '#eef6fa'); }
    A.poly([[0.36, 0.2], [0.5, 0.21], [0.62, 0.12], [0.5, 0.1], [0.4, 0.12]], 'rgba(196,138,70,0.55)');
    A.line([[0.3, 0.16], [0.385, -0.03]], 0.044, '#17171a'); A.line([[0.278, 0.155], [0.36, -0.03]], 0.011, '#3a8ce0'); A.line([[0.325, 0.16], [0.41, -0.03]], 0.011, '#3a8ce0');
    A.line([[0.25, 0.185], [0.34, 0.2]], 0.012, '#3a8ce0'); A.line([[0.015, -0.012], [0.2, -0.03], [0.385, -0.055]], 0.015, '#f2c21a');
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) A.spot(0.84 + i * 0.024, -0.02 + r * 0.022, 0.006, '#161618'); }
};

/* --- poisson-coffre --- */
FM.boxfish = {
  top: [[0, -0.02], [0.04, 0.06], [0.12, 0.17], [0.25, 0.22], [0.6, 0.225], [0.8, 0.2], [0.9, 0.1], [0.96, 0.05], [1, 0.04]], bot: [[0, -0.06], [0.05, -0.12], [0.14, -0.19], [0.3, -0.21], [0.65, -0.21], [0.82, -0.18], [0.9, -0.09], [0.96, -0.045], [1, -0.035]],
  wp: [[0, 0.05], [0.1, 0.16], [0.25, 0.19], [0.7, 0.19], [0.85, 0.15], [0.92, 0.06], [1, 0.02]], w: 0.19, sq: 4.5, eye: [0.17, 0.095, 0.036], iris: '#f0d040', col: '#ffd91a', scale: 0, gill: 0.33, mouth: [-0.005, -0.045, 0.03],
  fins: { d: [[0.72, 0.84, 0.3, 0.03, 0.09, 0.08, 0.03]], an: [0.72, 0.84, 0.3, 0.03, 0.08, 0.07, 0.03], c: [0.2, 0.1, 0.1, -0.25, 2], pc: [0.31, -0.06, 0.1, 90, 5] },
  fc: 'rgba(255,225,80,0.85)', fc1: 'rgba(255,240,150,0.6)', fin: { ray: 'rgba(150,100,0,0.25)' }, swim: { wave: 0.08, pect: 2.2, fin: 3.0, freq: 1.2 },
  body(A) { A.vfill([0, '#f2bc0c', 0.5, '#ffd91a', 1, '#ffe85a']);
    const P = [[0.1, 0.02], [0.2, -0.1], [0.26, 0.12], [0.33, -0.02], [0.38, -0.15], [0.42, 0.15], [0.47, 0.03], [0.52, -0.1], [0.56, 0.16], [0.62, -0.01], [0.66, -0.15], [0.7, 0.1], [0.76, -0.06], [0.82, 0.05], [0.84, -0.12], [0.3, 0.19], [0.5, -0.19], [0.74, 0.19], [0.9, -0.01], [0.24, 0.02], [0.6, 0.08], [0.45, -0.06], [0.14, -0.1], [0.36, 0.07]];
    P.forEach((p, i) => A.spot(p[0], p[1], 0.015 + (i % 3) * 0.003, '#101012')); A.spot(0.0, -0.045, 0.02, '#f0b810'); }
};

/* --- poisson-faucon flamme --- */
FM.hawkfish = {
  top: [[0, 0.0], [0.05, 0.08], [0.15, 0.16], [0.28, 0.195], [0.45, 0.185], [0.65, 0.14], [0.83, 0.085], [0.93, 0.065], [1, 0.06]], bot: [[0, -0.02], [0.06, -0.08], [0.18, -0.14], [0.35, -0.165], [0.55, -0.15], [0.72, -0.11], [0.88, -0.065], [1, -0.055]],
  w: 0.088, eye: [0.14, 0.085, 0.032], iris: '#e8c040', col: '#e8281a', scale: 0.06, mouth: [0.0, -0.015, 0.07],
  fins: { d: [[0.26, 0.86, 0.2, 0.05, 0.1, 0.11, 0.1, 0.09, 0.08, 0.11, 0.12, 0.06]], an: [0.6, 0.84, 0.3, 0.03, 0.1, 0.1, 0.05], c: [0.24, 0.15, 0.15, -0.1, 2], pv: [0.4, 0.15, 60, 25], pc: [0.32, -0.07, 0.2, 60, 35] },
  fc: '#e8281a', fc1: '#f04a2a', fin: { ray: 'rgba(80,0,0,0.25)' }, fs: { d: { cut: 0.2 } }, swim: { wave: 0.9, pect: 1.3, fin: 1, freq: 1.2 },
  body(A) { A.vfill([0, '#c8160e', 0.5, '#ec2c1a', 1, '#ff5a34']); A.hband(0.9, 1.3, '#160808', 0.27, 0.87);
    const g = A.g; g.beginPath(); g.arc(0.14, 0.085, 0.052, -0.3, 2.6); g.strokeStyle = '#160808'; g.lineWidth = 0.017; g.stroke(); },
  fp(A, name) { if (name === 'd') A.hband(0.9, 1.12, '#160808', 0.25, 0.9); }
};

/* --- gobie, blennie --- */
FM.yellowgoby = {
  top: { d: 0.2, pk: 0.3, f: 0.45, ped: 0.08 }, bot: { d: 0.17, pk: 0.32, f: 0.5, ped: 0.075 }, w: 0.1, eye: [0.12, 0.085, 0.04], iris: '#f0d870', col: '#ffe01a', scale: 0, mouth: [0.0, -0.01, 0.06],
  fins: { d: [[0.3, 0.5, 0.2, 0.04, 0.09, 0.09, 0.04], [0.55, 0.88, 0.2, 0.05, 0.09, 0.09, 0.06, 0.02]], an: [0.6, 0.86, 0.2, 0.04, 0.08, 0.07, 0.03], c: [0.26, 0.14, 0.14, -0.4, 2], pv: [0.34, 0.1, 70, 40], pc: [0.3, -0.02, 0.17, 80, 10] },
  fc: 'rgba(255,224,40,0.9)', fc1: 'rgba(255,238,130,0.65)', fin: { ray: 'rgba(160,110,0,0.22)' }, swim: { wave: 1.1, pect: 1.6, fin: 1, freq: 1.5 },
  body(A) { A.vfill([0, '#f2c40c', 0.5, '#ffe01a', 1, '#fff07a']); A.spot(0.2, -0.02, 0.07, 'rgba(255,250,200,0.5)', 0.06); A.line([[0.19, 0.09], [0.2, -0.06]], 0.006, 'rgba(120,180,255,0.5)'); A.line([[0.235, 0.1], [0.245, -0.07]], 0.006, 'rgba(120,180,255,0.4)'); }
};
FM.blenny = {
  top: [[0, 0.0], [0.03, 0.07], [0.08, 0.11], [0.16, 0.115], [0.3, 0.1], [0.55, 0.085], [0.8, 0.065], [1, 0.05]], bot: [[0, -0.02], [0.04, -0.06], [0.12, -0.085], [0.3, -0.085], [0.55, -0.075], [0.8, -0.058], [1, -0.045]],
  w: 0.07, eye: [0.075, 0.07, 0.033], iris: '#d8c890', col: '#3a2f4a', scale: 0, gill: 0.2, mouth: [0.0, -0.02, 0.05],
  fins: { d: [[0.16, 0.95, 0.15, 0.05, 0.075, 0.08, 0.06, 0.07, 0.075, 0.07, 0.06, 0.04]], an: [0.45, 0.95, 0.15, 0.03, 0.05, 0.055, 0.05, 0.04, 0.03], c: [0.2, 0.1, 0.1, -0.2, 2], pv: [0.2, 0.1, 70, 15], pc: [0.21, -0.03, 0.14, 80, 10] },
  fc: '#3a2f4a', fc1: '#4a3c5c', swim: { wave: 1.2, pect: 1.4, fin: 1.2, freq: 1.3 },
  split(A) { A.g.fillStyle = A.lin(0.46, 0, 0.58, 0, [0, 'rgba(242,128,26,0)', 1, '#f2801a']); A.g.fillRect(-1, -2, 4, 4); },
  body(A) { A.vfill([0, '#2a2238', 0.5, '#40344e', 1, '#5a4c66']); FM.blenny.split(A); A.g.fillStyle = A.lin(0.6, 0, 1, 0, [0, 'rgba(255,170,60,0)', 1, 'rgba(255,190,80,0.5)']); A.g.fillRect(-1, -2, 4, 4);
    A.line([[0.06, 0.1], [0.05, 0.125]], 0.008, '#2a2238'); },
  fp(A) { FM.blenny.split(A); }
};

/* --- labres --- */
FM.cleaner = {
  top: { d: 0.1, pk: 0.35, f: 0.7, ped: 0.05 }, bot: { d: 0.095, pk: 0.38, f: 0.7, ped: 0.045 }, w: 0.05, eye: [0.1, 0.022, 0.02], iris: '#1a1a1e', col: '#f4f0d8', scale: 0.03, sn: [0.1, 1.2],
  fins: { d: [[0.25, 0.92, 0.15, 0.02, 0.04, 0.045, 0.045, 0.045, 0.05, 0.05, 0.03]], an: [0.55, 0.92, 0.15, 0.02, 0.04, 0.04, 0.04, 0.02], c: [0.2, 0.12, 0.12, -0.1, 2], pv: [0.32, 0.07, 60, 20], pc: [0.24, -0.01, 0.1, 60, 15] },
  fc: 'rgba(200,232,255,0.85)', fc1: 'rgba(150,210,255,0.6)', fs: { c: { c0: '#2aa0f0', c1: '#58c0ff' } }, swim: { wave: 0.6, pect: 1.7, fin: 1, freq: 1.4 },
  stripe(A) { A.hband(x => 0.5 - 0.04 - 0.34 * sstep(0.1, 1, x), x => 0.5 + 0.06 + 0.3 * sstep(0.1, 1, x), '#08080e', 0, 1.02); },
  body(A) { A.hfill([0, '#f6f0c8', 0.35, '#f4f6f0', 0.55, '#8ad0f8', 0.8, '#2aa0f0', 1, '#1a80e0']); FM.cleaner.stripe(A); },
  fp(A, name) { if (name === 'c') A.band(0.9, 1.4, '#08080e', { hh: 0.05, br: -0.02 }); if (name === 'd') A.hband(0.94, 1.25, '#08080e', 0.25, 0.6); }
};
FM.sixline = {
  top: { d: 0.15, pk: 0.38, f: 0.7, ped: 0.06 }, bot: { d: 0.14, pk: 0.4, f: 0.7, ped: 0.055 }, w: 0.062, eye: [0.13, 0.035, 0.025], iris: '#e02a1a', col: '#6a3ad0', scale: 0.03, sn: [0.14, 1.3],
  fins: { d: [[0.26, 0.9, 0.2, 0.03, 0.055, 0.06, 0.06, 0.06, 0.065, 0.065, 0.04]], an: [0.55, 0.9, 0.2, 0.03, 0.055, 0.055, 0.05, 0.03], c: [0.2, 0.12, 0.12, -0.3, 2], pv: [0.34, 0.09, 60, 20], pc: [0.27, -0.02, 0.12, 60, 15] },
  fc: 'rgba(240,150,90,0.85)', fc1: 'rgba(200,150,230,0.6)', fs: { c: { c0: '#2fb86a', c1: '#6ad88a' }, pc: { c0: 'rgba(220,200,255,0.6)', c1: 'rgba(230,220,255,0.4)' } }, swim: { wave: 0.6, pect: 1.7, fin: 1, freq: 1.5 },
  body(A) { A.hfill([0, '#8a4ad8', 0.5, '#5a34c8', 0.86, '#4a3ab8', 0.93, '#2fb86a', 1, '#2fb86a']);
    for (let i = 0; i < 6; i++) A.hline(0.2 + i * 0.125, 0.0145, '#ff8a1a', 0.2, 0.9);
    A.dots(9, 0.005, 0.008, '#ff8a1a', 0.02, 0.18, -0.08, -0.01); A.spot(0.945, 0.032, 0.014, '#0a0a10'); A.line([[0.1, 0.045], [0.16, 0.05]], 0.004, '#fff'); A.line([[0.1, 0.024], [0.16, 0.022]], 0.004, '#fff'); }
};

/* --- gramma, pseudochromis --- */
FM.gramma = {
  top: { d: 0.15, pk: 0.36, f: 0.7, ped: 0.065 }, bot: { d: 0.14, pk: 0.38, f: 0.7, ped: 0.06 }, w: 0.066, eye: [0.11, 0.04, 0.028], iris: '#c8a0e0', col: '#a020c8', scale: 0.05,
  fins: { d: [[0.24, 0.9, 0.2, 0.04, 0.07, 0.075, 0.075, 0.075, 0.08, 0.085, 0.05]], an: [0.55, 0.9, 0.2, 0.03, 0.07, 0.075, 0.06, 0.03], c: [0.24, 0.13, 0.13, 0.2, 1.5], pv: [0.33, 0.2, 60, 15], pc: [0.27, -0.02, 0.13, 60, 15] },
  fc: '#a020c8', fc1: '#b840d8', fs: { c: { c0: '#ffd21a', c1: '#ffe24a' }, pv: { c0: '#a020c8', c1: '#c860e0' }, pc: { c0: 'rgba(200,120,230,0.6)', c1: 'rgba(230,180,240,0.4)' } }, swim: { wave: 0.8, pect: 1.4, fin: 1, freq: 1.3 },
  split(A) { A.g.fillStyle = A.lin(0.5, 0, 0.64, 0, [0, 'rgba(255,210,26,0)', 1, '#ffd21a']); A.g.fillRect(-1, -2, 4, 4); },
  body(A) { A.vfill([0, '#8a14b8', 0.5, '#aa24d0', 1, '#c850e0']); FM.gramma.split(A);
    for (let i = 0; i < 40; i++) { const x = 0.44 + A.r() * 0.22, y = -0.13 + A.r() * 0.27; A.spot(x, y, 0.007, x < 0.56 ? '#ffd21a' : '#a020c8'); }
    A.line([[0.01, 0.006], [0.1, 0.04], [0.2, 0.085]], 0.011, '#0c0812'); },
  fp(A, name) { if (name === 'd' || name === 'an') { FM.gramma.split(A); if (name === 'd') A.spot(0.29, A.M.T(0.29) + 0.03, 0.02, '#0c0812'); } }
};
FM.fridmani = {
  top: { d: 0.125, pk: 0.34, f: 0.75, ped: 0.06 }, bot: { d: 0.12, pk: 0.36, f: 0.75, ped: 0.055 }, w: 0.058, eye: [0.105, 0.035, 0.026], iris: '#d8a0e8', col: '#c01ad8', scale: 0.04,
  fins: { d: [[0.22, 0.92, 0.18, 0.04, 0.065, 0.07, 0.07, 0.07, 0.07, 0.075, 0.05]], an: [0.5, 0.92, 0.18, 0.03, 0.06, 0.065, 0.06, 0.04], c: [0.24, 0.12, 0.12, -0.15, 2], pv: [0.32, 0.12, 60, 15], pc: [0.25, -0.02, 0.12, 60, 15] },
  fc: '#b81ad0', fc1: '#d04ae8', fin: { ray: 'rgba(60,0,90,0.25)' }, fs: { pc: { c0: 'rgba(210,110,235,0.6)', c1: 'rgba(235,170,245,0.4)' } }, swim: { wave: 1.0, pect: 1.2, fin: 1, freq: 1.4 },
  body(A) { A.vfill([0, '#9a14b8', 0.5, '#c21cda', 1, '#dc5af0']); A.line([[0.0, 0.006], [0.1, 0.034], [0.23, 0.075]], 0.013, '#1a1a6a'); },
  fp(A, name) { if (name === 'c') A.line([[1.0, 0.03], [1.22, 0.09]], 0.012, 'rgba(60,60,200,0.7)'); }
};

/* --- poisson-fléchette de feu --- */
FM.firefish = {
  top: { d: 0.085, pk: 0.3, f: 0.7, ped: 0.045 }, bot: { d: 0.08, pk: 0.32, f: 0.7, ped: 0.04 }, w: 0.05, eye: [0.09, 0.03, 0.027], iris: '#e8e0c0', col: '#f6f2ea', scale: 0,
  fins: { d: [[0.26, 0.36, 0.25, 0.04, 0.5, 0.12, 0.03], [0.42, 0.93, 0.15, 0.03, 0.055, 0.06, 0.06, 0.06, 0.065, 0.065, 0.04]], an: [0.45, 0.93, 0.15, 0.03, 0.05, 0.055, 0.055, 0.06, 0.04], c: [0.22, 0.11, 0.11, -0.35, 2], pv: [0.3, 0.12, 65, 12], pc: [0.24, -0.01, 0.11, 60, 10] },
  fc: '#f6f0dc', fc1: '#fff8e0', fs: { c: { c0: '#a01818', c1: '#6a0e10', edge: '#0c0808', ew: 0.012 }, pc: { c0: 'rgba(250,245,225,0.6)', c1: 'rgba(255,250,235,0.35)' } }, swim: { wave: 0.7, pect: 1.3, fin: 1.6, freq: 1.2 },
  grad(A) { A.g.fillStyle = A.lin(0.42, 0, 0.95, 0, [0, 'rgba(255,138,42,0)', 0.4, '#ff8a2a', 0.75, '#d02418', 1, '#8a1012']); A.g.fillRect(-1, -2, 4, 4); },
  body(A) { A.hfill([0, '#f6e080', 0.16, '#f6eeda', 0.4, '#f8f4ea', 1, '#f8f4ea']); FM.firefish.grad(A); A.spot(0.05, 0.0, 0.05, 'rgba(250,215,90,0.5)', 0.05); },
  fp(A, name, idx) { if ((name === 'd' && idx === 1) || name === 'an') { FM.firefish.grad(A); A.g.fillStyle = A.lin(0.7, 0, 0.95, 0, [0, 'rgba(12,8,8,0)', 1, 'rgba(12,8,8,0.6)']); A.g.fillRect(-1, -2, 4, 4); }
    if (name === 'c') { A.line([[0.98, 0.04], [1.24, 0.1]], 0.02, '#0c0808'); A.line([[0.98, -0.04], [1.24, -0.1]], 0.02, '#0c0808'); } }
};
})();
