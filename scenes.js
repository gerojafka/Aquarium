/* Ocean Dream — scenes.js
   Composition des 10 décors : ambiance lumineuse, relief, roches, coraux et accessoires. */
(function () {
'use strict';
const T = THREE, OD = window.OD, G = OD.Gen, sstep = OD.sstep;
const V = (x, y, z) => new T.Vector3(x, y, z), UP = V(0, 1, 0);

/* palettes de roche : [clair, sombre, algue 1, algue 2] */
const ROCK = {
  live: ['#9a8f80', '#4c4640', '#8a5a9e', '#c06a8c'],
  pale: ['#c9c2b0', '#7d7668', '#b08ab0', '#d9a0a8'],
  dark: ['#5f5a66', '#28242e', '#6a3f8a', '#93406e'],
  wreck: ['#6f7468', '#34382f', '#3f6e55', '#557a4a'],
  cave: ['#6a655f', '#2a2725', '#4a5a4a', '#7a5a4a'],
  night: ['#4a4a5e', '#1c1c28', '#4a3a7a', '#6a3a6a'],
  zen: ['#77797a', '#3a3c3e', '#4f7a4c', '#6a8a52'],
  deep: ['#7a7f8a', '#363a44', '#7a4a8a', '#a8506e']
};

const sandAt = (ctx, x, z) => V(x, ctx.floor(x, z), z);
function far(ctx, list, pal) { for (const a of list) G.rock(ctx, { c: V(a[0] * 1.25, ctx.floor(a[0], a[1]) + a[3] * 0.3, a[1] * 1.55 - 2), r: [a[2] * 1.3, a[3] * 1.15, a[2] * 0.8], detail: 4, rough: 0.34, obstacle: false, pal: pal, algae: 0.4 }); }
function pebbles(ctx, n, xr, zr, s) { const r = ctx.rng; for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 2 * xr, z = zr[0] + r() * (zr[1] - zr[0]), k = (s || 0.3) * (0.5 + r());
  G.rock(ctx, { c: V(x, ctx.floor(x, z) + k * 0.25, z), r: [k, k * 0.6, k * 0.8], detail: 2, rough: 0.25, obstacle: false }); } }

const BASE_CAM = { pos: [0, 4.3, 14.5], look: [0, 3.9, 0], fov: 38, sway: 0.018 };
const BASE_BOUNDS = { x: 10.5, y0: 0.8, y1: 8.6, z0: -5.4, z1: 3.6 };

const DEFS = {
  /* 1 — Récif corallien tropical */
  reef: {
    seed: 11, rock: ROCK.live, sand: ['#e8dcc0', '#cdbf9c', '#f4ead2'], floor: { amp: 0.32, f: 0.11, back: 1.3 }, rip: [0.3, 6.5, 0.9],
    env: { top: '#7fe6ee', bottom: '#0b4f86', fog: '#1e9cc0', fogD: 0.026, sun: '#fff6e0', sunI: 3.6, sky: '#9fe4ff', ground: '#3a6a78', hemiI: 2.3, caustic: 2.1, rays: '#d8fbff', rayI: 0.3, snow: '#eaffff', surface: ['#1a86b8', '#e8ffff'], exposure: 1.02, current: 0.4 },
    build(ctx) {
      const L = G.mound(ctx, -6.3, -2.3, 5.4, 4.3, 3.8), R = G.mound(ctx, 5.9, -3.1, 4.8, 3.5, 3.5), B = G.mound(ctx, 0.2, -6.4, 6.4, 2.7, 3.0, { n: 3 });
      const f1 = G.mound(ctx, -2.3, 1.7, 1.9, 0.95, 1.4, { n: 1, detail: 3 }), f2 = G.mound(ctx, 3.3, 2.1, 1.7, 0.85, 1.3, { n: 1, detail: 3 });
      G.dress(ctx, L, [['staghorn', 4, { s: [1.0, 1.6] }], ['table', 2, { s: [0.9, 1.4], top: true }], ['brain', 1, { s: [0.6, 0.8] }], ['plates', 2, { s: [0.8, 1.1] }], ['sponge', 2, { s: [0.8, 1.1] }], ['softTree', 2, { s: [0.9, 1.3] }], ['bushy', 3, { s: [0.7, 1.0] }], ['zoas', 4, { s: [0.7, 1.0] }], ['fan', 1, { s: [1.8, 2.2] }], ['duster', 2, { s: [0.7, 0.9] }]]);
      G.dress(ctx, R, [['staghorn', 3, { s: [0.9, 1.4] }], ['table', 2, { s: [0.8, 1.2], top: true }], ['brain', 1, { s: [0.5, 0.75] }], ['plates', 2], ['sponge', 2], ['softTree', 2], ['bushy', 3], ['zoas', 4], ['leather', 1, { s: [0.9, 1.1] }], ['whips', 1, { s: [1.3, 1.6] }]]);
      G.dress(ctx, B, [['staghorn', 3, { s: [1.0, 1.5] }], ['table', 2, { s: [1.0, 1.5] }], ['fan', 2, { s: [1.8, 2.6] }], ['sponge', 2], ['bushy', 2]]);
      let s = L[0].at(0.5, 0.75, 0.55); G.anemone(ctx, s.p, s.n, 0.95, { pal: [['#5aa83a', '#d8ff8a', '#ff5fa0', '#a86a4a']] });
      s = R[0].at(-0.45, 0.8, 0.5); G.anemone(ctx, s.p, s.n, 0.85, { pal: [['#c8b890', '#fff4d0', '#b05aff', '#7a3ab0']] });
      s = f2[0].at(0, 1, 0.1); G.anemone(ctx, s.p, s.n, 0.8, { pal: [['#d8587a', '#ffb0c0', '#ffe9f0', '#8a3a5a']] });
      G.dress(ctx, f1, [['zoas', 3, { s: [0.6, 0.8] }], ['bushy', 1, { s: [0.6, 0.7] }], ['sponge', 1, { s: [0.5, 0.7] }]]);
      G.clam(ctx, sandAt(ctx, 0.9, 0.1), UP, 0.55, {});
      G.grass(ctx, 8.8, 0.8, 46, 1.5, {}); G.grass(ctx, -9.6, 0.6, 40, 1.4, {});
      pebbles(ctx, 10, 9, [-1, 3.5], 0.22);
      far(ctx, [[-15, -13, 6, 5], [13, -15, 7, 6], [1, -19, 9, 4.5]]);
      ctx.bubbles.push(V(-3.9, 0.4, -4.6), V(7.9, 0.4, -4.9));
    }
  },

  /* 2 — Lagune des Maldives */
  lagoon: {
    seed: 23, rock: ROCK.pale, sand: ['#fbf6e8', '#efe6cf', '#ffffff'], floor: { amp: 0.42, f: 0.085, back: 0.9 }, rip: [0.42, 5.6, 1.1],
    env: { top: '#b8fbf4', bottom: '#1a9ac4', fog: '#56cfe0', fogD: 0.019, sun: '#fffbe8', sunI: 3.5, sky: '#c8f8ff', ground: '#a8d8c8', hemiI: 2.1, caustic: 3.0, rays: '#f4ffff', rayI: 0.4, rayN: 1.3, snow: '#ffffff', snowN: 0.6, surface: ['#3fc0d8', '#ffffff'], exposure: 0.84, current: 0.3 },
    camera: { pos: [0, 4.9, 14.5], look: [0, 3.5, 0], fov: 38, sway: 0.02 },
    build(ctx) {
      const pastel = [['#d06a98', '#ffd6e8'], ['#8a70d8', '#e0d4ff'], ['#d8b040', '#fff2b0'], ['#40b0a0', '#c8fff0'], ['#e8845a', '#ffd8c4']];
      const A = G.mound(ctx, -6.4, -3.0, 2.8, 2.0, 2.3, { n: 2 }), B = G.mound(ctx, 5.3, -1.3, 3.2, 2.3, 2.5, { n: 2 }), Cc = G.mound(ctx, 0.4, -6.2, 3.6, 1.7, 2.4, { n: 2 });
      for (const m of [A, B, Cc]) G.dress(ctx, m, [['staghorn', 4, { s: [0.9, 1.5], pal: pastel, thick: 0.7, depth: 5, spread: 0.7 }], ['table', 1, { s: [0.7, 1.0], pal: pastel, top: true }], ['softTree', 1, { s: [0.7, 1.0] }], ['bushy', 2, { s: [0.6, 0.8], pal: pastel }], ['zoas', 2]]);
      let s = B[0].at(-0.3, 0.9, 0.5); G.anemone(ctx, s.p, s.n, 0.8, { pal: [['#c8b890', '#fff4d0', '#b05aff', '#7a3ab0']] });
      G.clam(ctx, sandAt(ctx, -1.6, 0.6), UP, 0.6, { pal: [['#1a5fff', '#39e6c8']] }); G.clam(ctx, sandAt(ctx, 2.6, -3.4), UP, 0.5, { pal: [['#7a2aff', '#3ac0ff']] });
      G.grass(ctx, -8.6, 0.9, 110, 2.0, { c0: '#2a7a46', c1: '#b6ec86', h: 1.0 }); G.grass(ctx, 8.4, -3.6, 120, 2.2, { c0: '#2a7a46', c1: '#b6ec86', h: 1.1 });
      G.grass(ctx, 1.4, 2.6, 70, 1.5, { c0: '#2f8a4a', c1: '#c8f496', h: 0.7 }); G.grass(ctx, -2.6, -5.0, 80, 1.8, { c0: '#2a7a46', c1: '#b6ec86', h: 1.0 });
      pebbles(ctx, 8, 9, [-2, 3.5], 0.18);
      far(ctx, [[-17, -15, 5, 3], [15, -16, 6, 3.5]]);
      ctx.bubbles.push(V(6.9, 0.4, -2.6));
    }
  },

  /* 3 — Récif australien (Grande Barrière) */
  gbr: {
    seed: 37, rock: ROCK.live, sand: ['#e0d6bc', '#c2b694', '#eee6cc'], floor: { amp: 0.3, f: 0.1, back: 2.2 }, rip: [0.26, 6.8, 0.8],
    env: { top: '#5cc6f4', bottom: '#062f6e', fog: '#1670c4', fogD: 0.027, sun: '#fff4dc', sunI: 3.7, sky: '#8ad0ff', ground: '#2c5878', hemiI: 2.2, caustic: 2.0, rays: '#c8ecff', rayI: 0.3, snow: '#dff4ff', surface: ['#1466b0', '#dff6ff'], exposure: 1.02, current: 0.45 },
    build(ctx) {
      const blue = [['#3f5fc8', '#b8d2ff'], ['#b08a55', '#fff0c8'], ['#5a7ad8', '#d0e2ff'], ['#c9a030', '#fff3a8']];
      const W1 = G.mound(ctx, -9.0, -5.4, 8.2, 6.6, 4.2, { n: 5 }), W2 = G.mound(ctx, 0.2, -6.6, 9.4, 5.3, 4.2, { n: 5 }), W3 = G.mound(ctx, 9.2, -5.2, 7.8, 6.9, 4.2, { n: 5 });
      const M1 = G.mound(ctx, -4.2, -1.3, 4.0, 2.4, 2.8, { n: 2 }), M2 = G.mound(ctx, 5.2, -0.6, 3.6, 2.1, 2.6, { n: 2 });
      for (const w of [W1, W2, W3]) G.dress(ctx, w, [['table', 4, { s: [1.3, 2.1] }], ['staghorn', 4, { s: [1.2, 1.9], pal: blue }], ['brain', 1, { s: [0.9, 1.3] }], ['plates', 3, { s: [1.0, 1.5] }], ['sponge', 1, { s: [1.0, 1.4] }], ['bushy', 2], ['fan', 1, { s: [2.0, 2.8] }]]);
      G.dress(ctx, M1, [['staghorn', 5, { s: [1.0, 1.5], pal: blue, stems: 4 }], ['table', 1, { s: [1.0, 1.3], top: true }], ['brain', 1, { s: [0.7, 0.9] }], ['zoas', 2]]);
      G.dress(ctx, M2, [['staghorn', 4, { s: [1.0, 1.4], pal: blue, stems: 4 }], ['plates', 2], ['brain', 1, { s: [0.6, 0.85] }], ['leather', 1], ['softTree', 1]]);
      let s = M2[0].at(-0.2, 0.9, 0.5); G.anemone(ctx, s.p, s.n, 0.9, { pal: [['#3aa8a0', '#b8fff0', '#ffe14a', '#6a5a4a']] });
      G.clam(ctx, sandAt(ctx, 0.6, 1.2), UP, 0.85, { pal: [['#0fb07a', '#ffe14a']] }); G.clam(ctx, sandAt(ctx, -8.4, 0.4), UP, 0.6, {});
      const b = sandAt(ctx, 0.8, -1.9); b.y += 0.3; G.brain(ctx, b, UP, 1.15, {});
      pebbles(ctx, 12, 10, [-0.5, 3.6], 0.25);
      far(ctx, [[-19, -14, 8, 8], [18, -15, 8, 9], [0, -20, 12, 7]]);
      ctx.bubbles.push(V(-6.6, 0.5, -2.9), V(3.1, 0.4, -3.2));
    }
  },

  /* 4 — Jardin de corail fluorescent */
  garden: {
    seed: 41, rock: ROCK.dark, sand: ['#b8b0c8', '#8f88a8', '#d0c8e0'], floor: { amp: 0.26, f: 0.12, back: 1.2 }, rip: [0.22, 7.0, 0.8],
    env: { top: '#5a6cf0', bottom: '#150a4a', fog: '#2b2c9a', fogD: 0.03, sun: '#b8c4ff', sunI: 2.5, sky: '#7a7cff', ground: '#3a2a6a', hemiI: 1.7, caustic: 1.6, rays: '#b0b8ff', rayI: 0.22, snow: '#d8d0ff', surface: ['#2a2aa0', '#c8d0ff'], glow: 1.35, exposure: 1.05, current: 0.35 },
    build(ctx) {
      const neonS = [['#7a2ad0', '#ff9af0'], ['#1fa860', '#b8ff5a'], ['#d02a7a', '#ffb0d8'], ['#2a6ad8', '#7af0ff'], ['#d0661a', '#ffe25a']];
      const neonP = [['#c41a8a', '#ff8ae0'], ['#e0601a', '#ffd24a'], ['#3a2ad8', '#8ab8ff'], ['#1aa08a', '#7affd8']];
      const Cn = G.mound(ctx, 0.2, -2.7, 7.2, 3.7, 4.2, { n: 5 }), Lf = G.mound(ctx, -8.2, -4.1, 4.7, 4.6, 3.6), Rt = G.mound(ctx, 8.1, -3.6, 4.2, 3.3, 3.4);
      const f1 = G.mound(ctx, -3.2, 1.6, 2.2, 0.9, 1.5, { n: 1, detail: 3 }), f2 = G.mound(ctx, 3.7, 1.9, 2.0, 0.8, 1.4, { n: 1, detail: 3 });
      G.dress(ctx, Cn, [['softTree', 5, { s: [1.0, 1.5] }], ['plates', 4, { s: [0.9, 1.3], pal: neonP }], ['zoas', 8, { s: [0.7, 1.1] }], ['staghorn', 3, { s: [0.9, 1.4], pal: neonS }], ['leather', 2, { s: [0.8, 1.1] }], ['sponge', 2, { pal: [['#74399c', '#dca4ff'], ['#cc466c', '#ffb4ca']] }], ['brain', 1, { s: [0.6, 0.8], pal: [['#8a7ad0', '#2fff8a']] }], ['bushy', 3, { pal: neonS }], ['zoas', 3, { big: true, s: [0.8, 1.0], count: 9 }]]);
      for (const m of [Lf, Rt]) G.dress(ctx, m, [['softTree', 3, { s: [1.0, 1.4] }], ['plates', 3, { pal: neonP }], ['zoas', 5], ['staghorn', 3, { pal: neonS, s: [1.0, 1.5] }], ['fan', 1, { s: [1.8, 2.4], pal: [['#7a2ab0', '#e0a0ff'], ['#c8286a', '#ffa8c8']] }], ['whips', 1, { pal: [['#6a3aa8', '#d8a8ff']] }], ['sponge', 1]]);
      for (const m of [f1, f2]) G.dress(ctx, m, [['zoas', 5, { s: [0.6, 0.9] }], ['zoas', 2, { big: true, count: 7, s: [0.6, 0.8] }], ['softTree', 1, { s: [0.6, 0.8] }]]);
      let s = Cn[0].at(0.3, 0.85, 0.6); G.anemone(ctx, s.p, s.n, 0.95, { pal: [['#d8587a', '#ffb0c0', '#ffe9f0', '#8a3a5a']] });
      s = Lf[0].at(0.5, 0.7, 0.6); G.anemone(ctx, s.p, s.n, 0.8, { pal: [['#e8842a', '#ffd08a', '#fff4d8', '#a04a2a']] });
      s = f2[0].at(0.1, 1, 0); G.anemone(ctx, s.p, s.n, 0.7, { pal: [['#5aa83a', '#d8ff8a', '#ff5fa0', '#a86a4a']] });
      G.clam(ctx, sandAt(ctx, 0.2, 2.4), UP, 0.5, { pal: [['#2a3aff', '#c04aff']] });
      far(ctx, [[-15, -14, 6, 6], [14, -14, 6, 5]]);
      ctx.bubbles.push(V(-5.4, 0.4, -4.4), V(5.2, 0.4, -4.6));
    }
  },

  /* 5 — Épave sous-marine */
  wreck: {
    seed: 53, rock: ROCK.wreck, sand: ['#b6b89a', '#8f957a', '#c8c8a8'], floor: { amp: 0.34, f: 0.1, back: 1.0 }, rip: [0.24, 6.0, 0.9],
    env: { top: '#4fc8b8', bottom: '#052c38', fog: '#126a78', fogD: 0.033, sun: '#eaffec', sunI: 3.1, sky: '#7ad8cc', ground: '#2a4a48', hemiI: 1.8, caustic: 1.5, rays: '#c8fff0', rayI: 0.36, snow: '#d8ffe8', snowN: 1.3, surface: ['#0f6a70', '#d8fff0'], exposure: 1.0, current: 0.35 },
    build(ctx) {
      const w = G.wreck(ctx, { x: 0.4, z: -2.4, yaw: 0.36, roll: 0.3, pitch: 0.07, scale: 1.14 });
      G.dressSamples(ctx, w.samples, [['sponge', 5, { s: [0.5, 0.8] }], ['softTree', 4, { s: [0.6, 0.9] }], ['cups', 5, { s: [0.7, 1.0] }], ['zoas', 6, { s: [0.5, 0.8] }], ['whips', 3, { s: [0.9, 1.3] }], ['bushy', 3, { s: [0.5, 0.7] }], ['plates', 2, { s: [0.5, 0.7] }], ['duster', 3, { s: [0.6, 0.8] }]]);
      const dk = w.samples.filter(s => s.n.y > 0.8); if (dk.length) { const s = dk[(dk.length / 2) | 0]; G.anemone(ctx, s.p.clone(), UP.clone(), 0.75, { pal: [['#5aa83a', '#d8ff8a', '#ff5fa0', '#a86a4a']] }); }
      const A = G.mound(ctx, -8.7, -4.1, 4.2, 3.5, 3.4), B = G.mound(ctx, 9.1, -3.2, 3.8, 2.7, 3.2), f = G.mound(ctx, 6.9, 2.0, 1.6, 0.8, 1.2, { n: 1, detail: 3 });
      for (const m of [A, B]) G.dress(ctx, m, [['sponge', 3], ['fan', 2, { s: [1.6, 2.3] }], ['whips', 2], ['softTree', 2], ['bushy', 2], ['zoas', 3], ['table', 1, { s: [0.8, 1.1] }]]);
      let s = B[0].at(-0.5, 0.8, 0.5); G.anemone(ctx, s.p, s.n, 0.8, { pal: [['#3aa8a0', '#b8fff0', '#ffe14a', '#6a5a4a']] });
      G.dress(ctx, f, [['zoas', 2], ['sponge', 1, { s: [0.5, 0.6] }]]);
      G.chest(ctx, sandAt(ctx, 5.1, 1.1), 0.95, -0.5);
      G.anchor(ctx, sandAt(ctx, -6.0, 0.7).add(V(0, 0.25, 0)), 1.0, 0.5, 1.15);
      G.amphora(ctx, sandAt(ctx, -2.7, 2.3).add(V(0, 0.22, 0)), 0.75, {}); G.amphora(ctx, sandAt(ctx, 1.6, 2.9).add(V(0, 0.2, 0)), 0.6, { lean: -0.8, c0: '#96603a' });
      G.grass(ctx, -9.4, 1.4, 50, 1.6, { c0: '#1f5a3a', c1: '#6fb85a' }); G.grass(ctx, 9.2, 0.2, 40, 1.4, { c0: '#1f5a3a', c1: '#6fb85a' });
      pebbles(ctx, 10, 9, [-1, 3.6], 0.24);
      far(ctx, [[-16, -14, 7, 6], [15, -14, 6, 5], [2, -20, 9, 4]]);
    }
  },

  /* 6 — Grotte sous-marine */
  cave: {
    seed: 67, rock: ROCK.cave, sand: ['#a8a290', '#7a7566', '#c0b8a0'], floor: { amp: 0.4, f: 0.12, back: 0.6 }, rip: [0.2, 6.0, 0.8],
    env: { top: '#58d0ff', bottom: '#03101e', fog: '#0a3d66', mid: '#1d9be0', fogD: 0.03, sun: '#dff4ff', sunI: 6.2, sky: '#4a8ac0', ground: '#24405a', hemiI: 1.7, caustic: 2.6, rays: '#b8e8ff', rayI: 0.62, rayN: 1.1, rayZone: [2.2, -2.2, 5.5, 4.5], raySlant: -0.16, snow: '#bfe8ff', snowN: 1.2, snowA: 0.6, surface: ['#0c4f8a', '#e0f6ff'], glow: 1.1, fishGlow: 0.3, exposure: 1.08, current: 0.25, sunDir: [0.12, 1, 0.1] },
    bounds: { x: 10, y0: 0.8, y1: 7.2, z0: -5.2, z1: 3.4 },
    build(ctx) {
      const hang = (x, y, z, rx, ry, rz, d) => G.rock(ctx, { c: V(x, y, z), r: [rx, ry, rz], detail: d || 4, rough: 0.36, hang: true, flat: false, algae: 0.5 });
      const walls = [];
      /* piliers */
      walls.push(...G.mound(ctx, -10.4, -1.8, 5.6, 8.5, 6.5, { n: 4, rough: 0.34 }), ...G.mound(ctx, 10.8, -2.4, 5.2, 8.0, 6.0, { n: 4, rough: 0.34 }));
      walls.push(hang(-9.6, 6.6, -1.0, 3.6, 3.2, 4.2), hang(10.0, 6.4, -1.6, 3.4, 3.0, 4.0));
      /* voûte, avec une ouverture à droite du centre par où tombe la lumière */
      const roof = [hang(-5.6, 10.6, -1.0, 4.6, 2.5, 5.0), hang(-1.4, 10.9, 1.6, 3.6, 2.2, 3.4), hang(-1.2, 11.0, -5.2, 3.8, 2.3, 2.6), hang(6.4, 10.7, -0.8, 3.4, 2.4, 5.0), hang(2.4, 11.2, 2.9, 3.2, 2.2, 2.4), hang(2.6, 11.4, -6.4, 3.6, 2.4, 2.4), hang(0, 12.2, 6, 9, 2.6, 4)];
      const r = ctx.rng;
      for (let i = 0; i < 16; i++) { const x = -8 + r() * 16, z = -4.5 + r() * 7; if (x > 0.2 && x < 4.4 && z > -4.4 && z < 0.6) continue; const len = 0.8 + r() * 1.9, y0 = 9.3 - (Math.abs(x) > 6 ? 0.6 : 0);
        ctx.rock.lathe(V(x, y0, z), V((r() - 0.5) * 0.12, -1, (r() - 0.5) * 0.12).normalize(), [[-0.6, 0.42 + r() * 0.2], [0, 0.3 + r() * 0.12], [len * 0.6, 0.14], [len, 0.02]], 7, () => OD.C(ROCK.cave[r() < 0.5 ? 0 : 1])); }
      const M = G.mound(ctx, -3.4, -3.8, 3.6, 2.2, 2.8, { n: 2 }), N = G.mound(ctx, 4.9, -4.6, 3.2, 1.8, 2.6, { n: 2 }), f = G.mound(ctx, -5.6, 1.6, 2.0, 1.0, 1.5, { n: 1, detail: 3 });
      G.dress(ctx, walls, [['cups', 16, { s: [0.8, 1.3], side: true }], ['fan', 4, { s: [1.5, 2.3], side: true }], ['sponge', 5, { side: true }], ['zoas', 9, { side: true }], ['whips', 3, { side: true }], ['softTree', 3, { side: true, s: [0.8, 1.1] }]], { all: true });
      for (const m of [M, N]) G.dress(ctx, m, [['cups', 5], ['zoas', 6], ['sponge', 2], ['softTree', 2], ['plates', 2], ['duster', 2], ['table', 1, { top: true, s: [0.8, 1.0] }]]);
      G.dress(ctx, f, [['zoas', 4], ['cups', 2, { s: [0.6, 0.8] }]]);
      let s = N[0].at(-0.3, 0.9, 0.5); G.anemone(ctx, s.p, s.n, 0.8, { pal: [['#3aa8a0', '#b8fff0', '#ffe14a', '#6a5a4a']] });
      for (const rf of roof.slice(0, 6)) for (let i = 0; i < 3; i++) { const q = rf.at((r() - 0.5) * 1.6, -0.8, (r() - 0.5) * 1.6); G.cups(ctx, q.p, q.n, 0.9 + r() * 0.5, {}); }
      pebbles(ctx, 12, 8, [-3, 3.4], 0.3);
      far(ctx, [[-4, -17, 6, 4], [9, -19, 7, 5]]);
      ctx.bubbles.push(V(-6.9, 0.5, -1.4), V(2.4, 0.4, -2.2));
      ctx.hides.push({ p: V(-7.6, 2.2, 0.6) }, { p: V(7.9, 2.6, 0.2) });
    }
  },

  /* 7 — Forêt de gorgones */
  gorgon: {
    seed: 79, rock: ROCK.deep, sand: ['#b8b6a8', '#8c8a80', '#cfccba'], floor: { amp: 0.36, f: 0.1, back: 2.4 }, rip: [0.26, 6.2, 0.9],
    env: { top: '#3aa0f0', bottom: '#041c5a', fog: '#0f4fb0', fogD: 0.029, sun: '#f0f6ff', sunI: 3.4, sky: '#6ab0ff', ground: '#23406a', hemiI: 2.0, caustic: 1.5, rays: '#b8dcff', rayI: 0.32, snow: '#d8ecff', snowN: 1.5, surface: ['#0c4aa0', '#d0ecff'], glow: 0.25, exposure: 1.03, current: 0.8, sway: 1.5 },
    build(ctx) {
      const A = G.mound(ctx, -7.6, -4.6, 6.2, 3.3, 3.8), B = G.mound(ctx, 0.1, -5.6, 7.2, 4.3, 3.8), Cc = G.mound(ctx, 7.7, -4.1, 6.2, 5.1, 3.8);
      const f1 = G.mound(ctx, -4.1, 0.6, 2.5, 1.05, 1.7, { n: 1, detail: 3 }), f2 = G.mound(ctx, 4.6, 1.3, 2.3, 1.1, 1.6, { n: 1, detail: 3 });
      const fanAt = (m, ux, uy, uz, s, yaw, pal) => { const q = m[0].at(ux, uy, uz); G.fan(ctx, q.p, q.n, s, { yaw: yaw, pal: pal ? [pal] : undefined, swayK: 0.18 }); };
      const Rd = ['#c8281e', '#ff8a5a'], Or = ['#e0701a', '#ffd08a'], Ye = ['#d8b01a', '#fff2a0'], Pu = ['#7a2ab0', '#e0a0ff'], Pk = ['#c8286a', '#ffa8c8'], Wh = ['#f0e8d8', '#ffffff'];
      fanAt(A, -0.4, 0.8, 0.5, 4.0, 0.15, Rd); fanAt(A, 0.5, 0.7, 0.6, 3.0, -0.2, Ye); fanAt(A, 0.0, 0.5, 0.9, 2.3, 0.3, Pu);
      fanAt(B, -0.5, 0.75, 0.55, 3.6, -0.1, Or); fanAt(B, 0.35, 0.85, 0.4, 4.6, 0.1, Pu); fanAt(B, 0.0, 0.4, 0.95, 2.4, 0.0, Pk);
      fanAt(Cc, -0.5, 0.7, 0.6, 3.4, 0.2, Wh); fanAt(Cc, 0.3, 0.9, 0.4, 4.2, -0.15, Rd); fanAt(Cc, 0.6, 0.5, 0.7, 2.6, -0.4, Ye);
      fanAt(f1, 0, 1, 0.1, 2.4, 0.1, Or); fanAt(f2, 0, 1, 0, 2.7, -0.1, Pk);
      for (const m of [A, B, Cc]) G.dress(ctx, m, [['whips', 3, { s: [1.5, 2.3] }], ['sponge', 2, { s: [0.9, 1.3] }], ['softTree', 1], ['cups', 2], ['bushy', 2], ['fan', 1, { s: [1.6, 2.2] }], ['zoas', 2]]);
      G.dress(ctx, f1, [['whips', 1, { s: [1.0, 1.3] }], ['zoas', 2]]); G.dress(ctx, f2, [['sponge', 1, { s: [0.6, 0.8] }], ['zoas', 2]]);
      pebbles(ctx, 10, 9, [-1, 3.6], 0.26);
      far(ctx, [[-17, -13, 7, 7], [16, -14, 8, 9], [0, -20, 12, 6]]);
      ctx.bubbles.push(V(-2.9, 0.5, -3.6));
    }
  },

  /* 8 — Récif nocturne */
  night: {
    seed: 83, rock: ROCK.night, sand: ['#6a6c88', '#4a4c66', '#7c80a0'], floor: { amp: 0.3, f: 0.11, back: 1.3 }, rip: [0.22, 6.6, 0.9],
    env: { top: '#17358a', bottom: '#01030c', fog: '#061a48', fogD: 0.034, sun: '#8fb4ff', sunI: 1.5, sky: '#3a58c0', ground: '#101a3a', hemiI: 0.95, caustic: 1.1, rays: '#7fa8ff', rayI: 0.2, snow: '#5affe0', snowN: 1.7, snowA: 0.95, twinkle: 1, surface: ['#06143a', '#7a9cf0'], glow: 2.3, fishGlow: 0.42, exposure: 1.12, current: 0.3, bubble: '#a8c8ff' },
    build(ctx) {
      const neonS = [['#5a2ad0', '#c88aff'], ['#0f9a6a', '#5affb0'], ['#c02a8a', '#ff8ad8'], ['#1a5ad8', '#5ad8ff'], ['#c8601a', '#ffd04a']];
      const L = G.mound(ctx, -5.6, -3.0, 5.6, 3.9, 3.8), R = G.mound(ctx, 6.4, -2.4, 5.0, 4.4, 3.6), B = G.mound(ctx, 0.6, -6.2, 5.6, 2.6, 3.0, { n: 3 });
      const f1 = G.mound(ctx, 1.6, 1.5, 2.1, 0.9, 1.5, { n: 1, detail: 3 }), f2 = G.mound(ctx, -7.7, 1.5, 1.7, 0.8, 1.3, { n: 1, detail: 3 });
      for (const m of [L, R]) G.dress(ctx, m, [['staghorn', 4, { s: [1.0, 1.5], pal: neonS }], ['zoas', 9], ['zoas', 3, { big: true, count: 8 }], ['plates', 3, { pal: [['#3a1a8a', '#b07aff'], ['#0a6a5a', '#4affc8'], ['#8a1a5a', '#ff7ac8']] }], ['brain', 1, { s: [0.6, 0.85], pal: [['#5a5a9a', '#2fff8a'], ['#6a4a8a', '#ffb02a']] }], ['softTree', 3], ['sponge', 2], ['cups', 3], ['table', 1, { top: true, pal: [['#3a3a8a', '#7ab0ff']] }], ['whips', 1], ['bushy', 2, { pal: neonS }]]);
      G.dress(ctx, B, [['staghorn', 3, { pal: neonS }], ['fan', 2, { s: [1.8, 2.4] }], ['zoas', 4], ['softTree', 2]]);
      for (const m of [f1, f2]) G.dress(ctx, m, [['zoas', 5], ['cups', 2, { s: [0.6, 0.8] }], ['zoas', 1, { big: true, count: 6 }]]);
      let s = L[0].at(0.5, 0.75, 0.55); G.anemone(ctx, s.p, s.n, 0.9, { pal: [['#2a8a6a', '#6affc8', '#ff5fd0', '#3a3a5a']] });
      s = R[0].at(-0.45, 0.7, 0.6); G.anemone(ctx, s.p, s.n, 0.85, { pal: [['#8a3ab0', '#e08aff', '#7affff', '#3a2a5a']] });
      s = f1[0].at(0, 1, 0.1); G.anemone(ctx, s.p, s.n, 0.75, { pal: [['#b84a6a', '#ff9ab0', '#fff0a0', '#4a2a3a']] });
      G.clam(ctx, sandAt(ctx, -1.9, 0.9), UP, 0.55, { pal: [['#1a5fff', '#39e6c8']] });
      pebbles(ctx, 8, 9, [-1, 3.5], 0.22);
      far(ctx, [[-15, -13, 6, 5], [14, -14, 7, 6]]);
      ctx.bubbles.push(V(-2.2, 0.4, -4.9));
    }
  },

  /* 9 — Jardin japonais sous-marin */
  zen: {
    seed: 97, rock: ROCK.zen, sand: ['#f0ece0', '#dcd6c4', '#f8f6ee'], floor: { amp: 0.06, f: 0.08, back: 0.5 }, rip: [0.5, 8.4, 0, 1],
    env: { top: '#9aeede', bottom: '#0f5a66', fog: '#3aa69e', fogD: 0.023, sun: '#fff8e6', sunI: 3.5, sky: '#b4f0e4', ground: '#6a9a8a', hemiI: 2.3, caustic: 1.5, rays: '#e8fff6', rayI: 0.3, snow: '#f0fff8', snowN: 0.6, surface: ['#2a9a98', '#f0fffa'], glow: 0.3, exposure: 1.0, current: 0.22, sway: 0.8 },
    camera: { pos: [0, 4.7, 14.5], look: [0, 3.6, 0], fov: 38, sway: 0.014 },
    build(ctx) {
      const stone = (x, z, rx, ry, rz, alg) => { const k = G.rock(ctx, { c: V(x, ctx.floor(x, z) + ry * 0.62, z), r: [rx, ry, rz], detail: 4, rough: 0.2, algae: alg === undefined ? 0.75 : alg }); ctx.rake.push(V(x, z, Math.max(rx, rz) + 1.25)); const t = k.at(0, 1, 0.15); ctx.perches.push({ p: t.p, n: t.n }); ctx.hides.push({ p: V(x, 0.8, z - rz - 0.8) }); return k; };
      const s1 = stone(-5.6, -1.5, 0.95, 2.0, 0.85), s2 = stone(-4.0, -0.6, 0.8, 0.8, 0.7), s3 = stone(-6.9, -0.2, 0.9, 0.45, 0.7, 1);
      const s4 = stone(5.7, 0.4, 1.25, 1.0, 1.0), s5 = stone(7.1, -0.9, 0.65, 1.45, 0.62);
      G.torii(ctx, sandAt(ctx, 0.2, -5.2), 1.25, 0);
      G.lantern(ctx, sandAt(ctx, 2.6, 0.9), 1.0, 0.3); ctx.rake.push(V(2.6, 0.9, 1.6));
      G.bridge(ctx, sandAt(ctx, -8.6, -7.2).add(V(0, 0.3, 0)), 0.95, 0.42);
      const pine = [['#6a4a32', '#3f9a6a'], ['#6a4a32', '#58b07a']], bloom = [['#7a4a3a', '#ffb0c8'], ['#7a4a3a', '#ff8aa8']];
      let q = s4.at(0.1, 1, 0.1); G.staghorn(ctx, q.p, UP.clone(), 1.5, { pal: bloom, depth: 4, spread: 1.0, stems: 2, lift: 0.25, thick: 1.2 });
      q = s2.at(0, 1, 0); G.staghorn(ctx, q.p, UP.clone(), 1.1, { pal: pine, depth: 4, spread: 1.1, stems: 2, lift: 0.15, thick: 1.3 });
      q = s1.at(0.3, 0.6, 0.7); G.zoas(ctx, q.p, q.n, 0.7, { pal: [['#4fae5a', '#8fd66a', '#c8f496']], count: 18 });
      q = s5.at(-0.3, 0.5, 0.7); G.zoas(ctx, q.p, q.n, 0.6, { pal: [['#4fae5a', '#8fd66a', '#c8f496']], count: 14 });
      const bamboo = [['#3f8a4a', '#b6ec86'], ['#4a9a5a', '#c8f496']];
      G.whips(ctx, sandAt(ctx, 9.4, -4.2), UP, 2.6, { pal: bamboo, k: 9, thick: 1.5 }); G.whips(ctx, sandAt(ctx, -9.9, -3.2), UP, 2.3, { pal: bamboo, k: 8, thick: 1.5 }); G.whips(ctx, sandAt(ctx, 4.6, -6.6), UP, 2.0, { pal: bamboo, k: 6, thick: 1.4 });
      const isl = G.mound(ctx, 8.6, -5.6, 3.0, 1.5, 2.2, { n: 2, rough: 0.22, algae: 1 }); G.dress(ctx, isl, [['table', 1, { top: true, s: [0.9, 1.1], pal: [['#6a4a32', '#58b07a']] }], ['leather', 1, { s: [0.7, 0.9] }], ['zoas', 3, { pal: [['#4fae5a', '#8fd66a', '#c8f496']] }]]);
      q = s3.at(0, 1, 0); G.anemone(ctx, q.p, UP.clone(), 0.62, { pal: [['#e8e0d0', '#ffffff', '#ff9ab8', '#8a7a6a']], n: 70 });
      far(ctx, [[-17, -15, 6, 4], [16, -16, 7, 5]]);
      ctx.bubbles.push(V(-7.4, 0.3, -3.0));
    }
  },

  /* 10 — Grand récif panoramique */
  panorama: {
    seed: 101, rock: ROCK.live, sand: ['#eadfc4', '#cfc2a0', '#f6eed8'], floor: { amp: 0.36, f: 0.09, back: 1.8 }, rip: [0.3, 6.4, 0.9],
    env: { top: '#78dcf6', bottom: '#083c80', fog: '#1c8ccc', fogD: 0.023, sun: '#fff6e0', sunI: 3.7, sky: '#9adcff', ground: '#346880', hemiI: 2.3, caustic: 2.1, rays: '#d8f6ff', rayI: 0.3, rayN: 1.5, raySpread: 24, snow: '#eaffff', snowN: 1.2, surface: ['#1a7ab8', '#e8ffff'], glow: 0.15, exposure: 1.02, current: 0.45 },
    camera: { pos: [0, 4.6, 15.5], look: [0, 3.9, 0], fov: 38, sway: 0.02, dolly: 6.5, dollySpeed: 0.028, pan: 0.1, panSpeed: 0.021 },
    bounds: { x: 17, y0: 0.8, y1: 8.6, z0: -5.6, z1: 3.6 }, shadowW: 27, wide: true,
    build(ctx) {
      const all = [['staghorn', 3, { s: [1.0, 1.6] }], ['table', 2, { s: [0.9, 1.6] }], ['brain', 1, { s: [0.6, 1.0] }], ['plates', 2], ['sponge', 2], ['softTree', 2], ['bushy', 2], ['zoas', 4], ['leather', 1], ['whips', 1], ['fan', 1, { s: [1.8, 2.8] }], ['duster', 1]];
      const spots = [[-19, -3.4, 5.6, 4.6], [-12.4, -5.2, 6.4, 5.6], [-6.2, -2.6, 4.6, 3.3], [6.8, -3.2, 5.0, 4.0], [12.8, -5.0, 6.2, 5.4], [19, -3.0, 5.4, 4.2], [0.4, -7.0, 7.0, 3.0]];
      const ms = spots.map(a => G.mound(ctx, a[0], a[1], a[2], a[3], 3.8, { n: 4 }));
      ms.forEach(m => G.dress(ctx, m, all));
      /* arche centrale */
      const arch = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8, x = 0.4 + Math.cos(a) * 3.6, y = 0.3 + Math.sin(a) * 4.4, k = 0.95 + 0.45 * Math.abs(Math.cos(a));
        arch.push(G.rock(ctx, { c: V(x, y, -3.4), r: [k * 1.15, k * 1.05, k * 1.5], detail: 3, rough: 0.3, flat: false, hang: y > 2 })); }
      G.dress(ctx, arch, [['softTree', 4], ['zoas', 6], ['cups', 5], ['plates', 3], ['fan', 2, { s: [1.6, 2.2] }], ['sponge', 2], ['table', 2, { top: true }]], { all: true });
      ctx.poi(V(0.4, 1.8, -3.2), 1.6, 'cave'); ctx.hides.push({ p: V(0.4, 1.6, -5.2) });
      const fr = [[-15.5, 1.6], [-9.2, 1.9], [-2.6, 2.0], [3.6, 1.7], [9.6, 2.1], [15.8, 1.5]].map(a => G.mound(ctx, a[0], a[1], 2.0, 0.95, 1.5, { n: 1, detail: 3 }));
      const ap = [['#5aa83a', '#d8ff8a', '#ff5fa0', '#a86a4a'], ['#d8587a', '#ffb0c0', '#ffe9f0', '#8a3a5a'], ['#c8b890', '#fff4d0', '#b05aff', '#7a3ab0'], ['#3aa8a0', '#b8fff0', '#ffe14a', '#6a5a4a']];
      fr.forEach((m, i) => { G.dress(ctx, m, [['zoas', 3], ['bushy', 1, { s: [0.5, 0.7] }]]); if (i % 2 === 0) { const s = m[0].at(0, 1, 0.1); G.anemone(ctx, s.p, s.n, 0.8, { pal: [ap[(i / 2) % 4 | 0]] }); } });
      let s = ms[2][0].at(0.4, 0.8, 0.5); G.anemone(ctx, s.p, s.n, 0.9, { pal: [ap[3]] }); s = ms[3][0].at(-0.4, 0.8, 0.5); G.anemone(ctx, s.p, s.n, 0.9, { pal: [ap[1]] });
      G.clam(ctx, sandAt(ctx, -4.6, 0.6), UP, 0.7, {}); G.clam(ctx, sandAt(ctx, 12.2, 0.4), UP, 0.6, {}); G.clam(ctx, sandAt(ctx, 6.2, 0.9), UP, 0.5, {});
      G.grass(ctx, -12.5, 1.2, 60, 1.8, {}); G.grass(ctx, 13.0, 2.4, 60, 1.8, {}); G.grass(ctx, 0.6, 2.9, 40, 1.3, {});
      pebbles(ctx, 18, 17, [-1, 3.6], 0.24);
      far(ctx, [[-26, -14, 8, 7], [26, -15, 9, 8], [-9, -19, 9, 5], [10, -20, 10, 6]]);
      ctx.bubbles.push(V(-9.4, 0.4, -3.6), V(3.4, 0.4, -5.2), V(16.2, 0.4, -4.4));
    }
  }
};

let MATS = null;
function mats() {
  if (MATS) return MATS;
  MATS = { rock: OD.mat({ detail: 1 }), coral: OD.mat({ detail: 3, glow: true, side: T.DoubleSide }), sway: OD.mat({ sway: true, glow: true, side: T.DoubleSide, caustics: 0.6 }),
    prop: OD.mat({ detail: 1, side: T.DoubleSide }), sand: OD.mat({ detail: 2 }) };
  return MATS;
}

OD.SceneKit = { V: V, UP: UP, sandAt: sandAt, far: far, pebbles: pebbles, ROCK: ROCK };
OD.Decors = {
  list: ['reef', 'lagoon', 'gbr', 'garden', 'wreck', 'cave', 'gorgon', 'night', 'zen', 'panorama'],
  lists: { sea: ['reef', 'lagoon', 'gbr', 'garden', 'wreck', 'cave', 'gorgon', 'night', 'zen', 'panorama'], fresh: [] },
  add(id, def) { DEFS[id] = def; this.list.push(id); this.lists.fresh.push(id); },
  swatch(id) { const e = DEFS[id].env; return [e.top, e.fog, e.bottom]; },
  build(id) {
    const def = DEFS[id] || DEFS.reef, nz = new OD.Noise(def.seed * 7 + 1), P = def.floor;
    const floor = (x, z) => P.amp * 2 * nz.fbm(x * P.f, 1.7, z * P.f, 3) + (P.back || 0) * sstep(-3, -15, z) - 0.25 * sstep(4, 10, z);
    const ctx = new OD.Ctx(def.seed, { pal: def.rock, floor: floor });
    def.build(ctx);
    const M = mats(), group = new T.Group(), add = (geo, mat, cast, recv) => { if (!geo) return; const m = new T.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; m.frustumCulled = false; group.add(m); return m; };
    add(G.sand(ctx, { pal: def.sand, w: def.wide ? 120 : 84, sx: def.wide ? 150 : 110 }), M.sand, false, true);
    add(ctx.rock.build(), M.rock, true, true); add(ctx.coral.build(), M.coral, true, true); add(ctx.sway.build(), M.sway, true, false); add(ctx.prop.build(), M.prop, true, true);
    const U = OD.U; U.uRip.value.set(def.rip[0], def.rip[1], def.rip[2], def.rip[3] || 0);
    for (let i = 0; i < 6; i++) { const k = ctx.rake[i]; if (k) U.uRake.value[i].copy(k); else U.uRake.value[i].set(0, 0, 0); }
    const env = Object.assign({ sunDir: [0.22, 1, 0.3] }, def.env);
    return { id: id, group: group, env: env, camera: Object.assign({}, BASE_CAM, def.camera || {}), bounds: Object.assign({}, BASE_BOUNDS, def.bounds || {}), shadowW: def.shadowW,
      floor: floor, obstacles: ctx.obstacles, perches: ctx.perches, pois: ctx.pois, hides: ctx.hides, anemones: ctx.anemones, bubbles: ctx.bubbles, lights: ctx.lights,
      stats: { rock: ctx.rock.n, coral: ctx.coral.n, sway: ctx.sway.n, prop: ctx.prop.n } };
  }
};
})();
