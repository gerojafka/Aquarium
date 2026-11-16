/* Ocean Dream — fish.js
   Population de l'aquarium : matériau animé des poissons, nage, comportements par espèce. */
(function () {
'use strict';
const T = THREE, OD = window.OD, U = OD.U, lerp = OD.lerp, clamp = OD.clamp;
const V = (x, y, z) => new T.Vector3(x, y, z);
const rnd = Math.random, rr = (a, b) => a + (b - a) * rnd();
const wrap = a => { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; };

/* ---------- shader : ondulation du corps, battement des nageoires, lumière sous-marine ---------- */
const VERT = `
attribute vec4 aFin; attribute vec4 aCol;
uniform vec4 uSwim; uniform vec4 uStyle;
varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec4 vCol; varying float vType;
void main(){
  vec3 p = position;
  float s = max(0.5 - p.x, 0.0), type = aFin.y, flex = aFin.x;
  float A = (0.008 + 0.078 * s * s) * uSwim.y * uStyle.x;
  float ph = uSwim.x - s * 5.2;
  float dz = A * sin(ph) + uSwim.z * 0.13 * s * s;
  if (type > 0.5 && type < 1.5) dz += flex * 0.03 * uStyle.z * sin(uSwim.w * 7.0 + s * 16.0);
  else if (type > 1.5 && type < 2.5) dz += flex * (0.04 * uSwim.y * (0.35 + uStyle.x) * sin(ph - 0.9) + 0.012 * sin(uSwim.w * 5.0 + p.y * 22.0));
  else if (type > 2.5 && type < 3.5) { float fl = 0.5 + 0.5 * sin(uSwim.w * 8.0 + aFin.z * 1.3); float k = flex * uStyle.y;
    dz += aFin.z * k * (0.06 * fl - 0.02); p.x += k * 0.035 * fl; p.y += k * 0.02 * (fl - 0.5); }
  else if (type > 3.5 && type < 4.5) dz += aFin.z * flex * 0.025 * sin(uSwim.w * 3.0 + 1.0);
  p.z += dz;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vCol = aCol; vType = type;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FRAG = `
uniform sampler2D uMap; uniform sampler2D uCaustics;
uniform float uCausticScale, uCausticStrength, uFogDensity, uFishGlow, uFade;
uniform vec3 uSunDir, uSunColor, uAmbSky, uAmbGround, uFogColorS;
varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec4 vCol; varying float vType;
void main(){
  vec4 tex = texture2D(uMap, vUv);
  float isEye = step(4.5, vType);
  if (isEye < 0.5 && tex.a < 0.42) discard;
  vec3 base = mix(tex.rgb, vCol.rgb, vCol.a);
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 Vd = normalize(cameraPosition - vW);
  float isFin = step(0.5, vType) * (1.0 - isEye);
  float ndl = dot(N, uSunDir) * 0.5 + 0.5; ndl *= ndl;
  vec3 light = uAmbSky * (0.6 + 0.4 * N.y) + uAmbGround * (0.6 - 0.4 * N.y) + uSunColor * mix(ndl, 0.5, isFin);
  float c = texture2D(uCaustics, vW.xz * uCausticScale + vW.y * 0.021).r;
  light += uSunColor * c * uCausticStrength * 0.5 * mix(smoothstep(-0.1, 0.9, N.y), 0.3, isFin);
  vec3 col = base * light;
  vec3 H = normalize(Vd + uSunDir);
  float sp = pow(max(dot(N, H), 0.0), mix(24.0, 80.0, isEye));
  col += uSunColor * sp * mix(0.16, 1.4, isEye) * (1.0 - isFin);
  float rim = pow(1.0 - max(dot(N, Vd), 0.0), 3.0);
  col += (uAmbSky * 0.4 + base * 0.2) * rim * (1.0 - isFin);
  col += base * uFishGlow * (0.3 + rim * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float d = length(vW - cameraPosition); float f = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColorS, max(f, 1.0 - uFade));
}`;

function fishMaterial(tex, sw) {
  return new T.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uSwim: { value: new T.Vector4(0, 1, 0, 0) }, uStyle: { value: new T.Vector4(sw.wave, sw.pect, sw.fin, 0) }, uFade: { value: 1 },
      uCaustics: U.uCaustics, uCausticScale: U.uCausticScale, uCausticStrength: U.uCausticStrength, uSunDir: U.uSunDir, uSunColor: U.uSunColor,
      uAmbSky: U.uAmbSky, uAmbGround: U.uAmbGround, uFogColorS: U.uFogColorS, uFogDensity: U.uFogDensity, uFishGlow: U.uFishGlow },
    vertexShader: VERT, fragmentShader: FRAG, side: T.DoubleSide
  });
}

/* ---------- comportements par espèce ----------
   st : style ; sp : vitesse de croisière ; y : tranche d'eau préférée (0 = fond, 1 = surface) ; graze : goût pour l'exploration des coraux */
const BEH = {
  ocellaris: { st: 'host', sp: 0.9, y: [0.08, 0.5] }, percula: { st: 'host', sp: 0.9, y: [0.08, 0.5] }, blackclown: { st: 'host', sp: 0.9, y: [0.08, 0.5] }, clarkii: { st: 'host', sp: 1.15, y: [0.08, 0.6], roam: 1.7 },
  bluetang: { st: 'cruise', sp: 2.0, y: [0.2, 0.9], graze: 0.25 }, yellowtang: { st: 'cruise', sp: 1.8, y: [0.15, 0.85], graze: 0.5 }, sailfin: { st: 'cruise', sp: 1.5, y: [0.2, 0.85], graze: 0.5 }, scopas: { st: 'cruise', sp: 1.7, y: [0.1, 0.8], graze: 0.55 },
  flameangel: { st: 'weave', sp: 1.4, y: [0.05, 0.55], graze: 0.6 }, bicolorangel: { st: 'weave', sp: 1.3, y: [0.05, 0.55], graze: 0.6 }, emperor: { st: 'cruise', sp: 1.3, y: [0.2, 0.8], graze: 0.35 },
  semilarvatus: { st: 'cruise', sp: 1.2, y: [0.15, 0.75], graze: 0.6 }, longnose: { st: 'cruise', sp: 1.2, y: [0.1, 0.7], graze: 0.75 },
  mandarin: { st: 'crawl', sp: 0.4 }, bluedamsel: { st: 'weave', sp: 1.5, y: [0.05, 0.5], graze: 0.3 }, chromis: { st: 'school', sp: 1.3, y: [0.42, 0.9] },
  banggai: { st: 'school', sp: 0.45, y: [0.25, 0.6], hover: true }, pajama: { st: 'school', sp: 0.4, y: [0.25, 0.6], hover: true },
  lionfish: { st: 'lurk', sp: 0.45, y: [0.15, 0.6] }, picasso: { st: 'cruise', sp: 1.2, y: [0.05, 0.6], graze: 0.4 }, boxfish: { st: 'cruise', sp: 0.6, y: [0.1, 0.6], graze: 0.4 },
  hawkfish: { st: 'perch', sp: 1.4 }, yellowgoby: { st: 'perch', sp: 1.0 }, blenny: { st: 'perch', sp: 1.2 },
  cleaner: { st: 'cruise', sp: 1.6, y: [0.15, 0.75], graze: 0.2, clean: true }, sixline: { st: 'weave', sp: 1.7, y: [0.03, 0.45], graze: 0.5 },
  gramma: { st: 'dart', sp: 1.0 }, fridmani: { st: 'dart', sp: 1.2 }, firefish: { st: 'dart', sp: 0.9, high: true }
};

class Fish {
  constructor(sys, sp) {
    this.sys = sys; this.sp = sp; this.b = sp.beh; this.id = sp.id;
    this.len = sp.len * rr(0.88, 1.1);
    this.mat = fishMaterial(sp.tex, sp.M.swim || { wave: 1, pect: 1, fin: 1, freq: 1 });
    this.mesh = new T.Mesh(sp.geo, this.mat); this.mesh.scale.setScalar(this.len); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    this.pos = this.mesh.position; this.yaw = rnd() * 6.28; this.pitch = 0; this.roll = 0; this.yawV = 0; this.speed = this.b.sp * 0.6;
    this.goal = V(0, 4, 0); this.mode = 'travel'; this.linger = 0; this.lingerT = 0; this.goalT = 0;
    this.phase = rnd() * 6.28; this.amp = 1; this.finT = rnd() * 20; this.seed = rnd() * 100; this.freq = (sp.M.swim && sp.M.swim.freq) || 1;
    this.sep = V(0, 0, 0); this.scare = 0; this.food = null; this.foodDelay = -1; this.snap = 0; this.fade = 0; this.excite = 0;
    this.home = null; this.perch = null; this.sit = false; this.off = V(rr(-1, 1), rr(-0.6, 0.6), rr(-1, 1)); this.client = null; this.dartT = rr(3, 9);
  }

  /* point d'eau libre dans la tranche préférée */
  openPoint(far) {
    const B = OD.bounds, b = this.b, y = b.y || [0.1, 0.8], g = this.goal;
    for (let k = 0; k < 8; k++) {
      let x = rr(B.x0 + 0.8, B.x1 - 0.8);
      if (far && rnd() < 0.7 && Math.sign(x) === Math.sign(this.pos.x)) x = -x;
      g.set(x, lerp(B.y0, B.y1, rr(y[0], y[1])), lerp(B.z0 + 0.4, B.z1 - 0.2, Math.pow(rnd(), 0.75)));
      const fy = this.sys.decor.floor(g.x, g.z) + 0.6 + this.len * 0.3; if (g.y < fy) g.y = fy;
      if (!this.sys.inObstacle(g, 0.5)) break;
    }
  }
  nearList(list, maxD) { const o = []; for (const q of list) { const p = q.p; if (p.x > OD.bounds.x0 - 0.5 && p.x < OD.bounds.x1 + 0.5 && p.y < OD.bounds.y1 + 0.3 && (!maxD || p.distanceTo(this.pos) < maxD)) o.push(q); } return o; }

  pickGoal() {
    const s = this.sys, d = s.decor, b = this.b, st = b.st, B = OD.bounds; this.goalT = 0; this.linger = 0; this.client = null;
    if (st === 'cruise' || st === 'weave' || st === 'lurk') {
      const near = st === 'weave' ? 8 : (st === 'lurk' ? 9 : 0), r = rnd();
      if (b.clean && r < 0.3 && s.fish.length > 1) { const c = s.fish[(rnd() * s.fish.length) | 0]; if (c !== this && c.len > this.len * 1.2 && !c.sit) { this.client = c; this.mode = 'clean'; this.linger = rr(3, 6); return; } }
      const pois = this.nearList(d.pois, near), hides = this.nearList(d.hides, near);
      if (r < (b.graze || 0.3) + (st !== 'cruise' ? 0.25 : 0) && pois.length) { const q = pois[(rnd() * pois.length) | 0];
        this.goal.copy(q.p).add(V(rr(-0.5, 0.5) * q.r, rr(-0.1, 0.4), rr(0.2, 0.9) * Math.max(0.6, q.r * 0.6))); this.mode = 'visit'; this.linger = st === 'weave' ? rr(0.6, 2.4) : (st === 'lurk' ? rr(5, 11) : rr(2, 5)); }
      else if (r > 0.86 && hides.length) { const q = hides[(rnd() * hides.length) | 0]; this.goal.copy(q.p); this.mode = 'hide'; this.linger = rr(2, 6); }
      else { this.openPoint(st === 'cruise'); this.mode = 'travel'; if (st === 'lurk') this.linger = rr(3, 8); }
      const fy = d.floor(this.goal.x, this.goal.z) + 0.45 + this.len * 0.25; if (this.goal.y < fy) this.goal.y = fy;
      this.goal.y = Math.min(this.goal.y, B.y1);
    } else if (st === 'host') {
      const h = this.home || (this.home = s.hostFor(this)), ro = (b.roam || 1) * (rnd() < 0.12 ? 2.6 : 1);
      this.goal.set(h.p.x + rr(-1, 1) * h.r * ro, h.p.y + rr(-0.05, 0.9) * h.r * ro, h.p.z + rr(-0.5, 1) * h.r * ro); this.mode = 'visit'; this.linger = rr(0.2, 1.6);
    } else if (st === 'school') {
      const g = s.groupFor(this); this.goal.copy(g.pos).addScaledVector(this.off, g.rad); this.mode = 'travel';
    } else if (st === 'dart') {
      const h = this.home || (this.home = s.homeFor(this));
      if (this.scare > 0) { this.goal.copy(h.p); this.mode = 'hide'; this.linger = rr(1.5, 3.5); }
      else { this.goal.set(h.p.x + rr(-0.5, 0.5), h.p.y + (b.high ? rr(0.9, 1.7) : rr(0.2, 0.8)), h.p.z + rr(0.9, 1.6)); this.mode = 'visit'; this.linger = rr(0.8, 2.6); }
    } else if (st === 'perch') {
      const list = this.nearList(d.perches, this.perch ? 7 : 0).filter(q => !q.busy || q.busy === this);
      if (this.perch) this.perch.busy = null;
      const q = list.length ? list[(rnd() * list.length) | 0] : null;
      if (q) { this.perch = q; q.busy = this; this.goal.copy(q.p).addScaledVector(q.n, this.len * 0.13 + 0.03); } else { this.perch = null; this.openPoint(false); this.goal.y = d.floor(this.goal.x, this.goal.z) + 0.2; }
      this.mode = 'hop'; this.sit = false;
    } else if (st === 'crawl') {
      const obs = d.obstacles, o = obs.length ? obs[(rnd() * obs.length) | 0] : null, a = rr(-0.4, 3.54);
      if (o && Math.abs(o.x) < B.x1 && o.y < 3.5) this.goal.set(o.x + Math.cos(a) * (o.rx + 0.5), 0, o.z + Math.sin(a) * (o.rz + 0.5)); else this.openPoint(false);
      this.goal.x = clamp(this.goal.x, B.x0 + 0.5, B.x1 - 0.5); this.goal.z = clamp(this.goal.z, B.z0 + 0.5, B.z1);
      this.goal.y = d.floor(this.goal.x, this.goal.z) + 0.22 + this.len * 0.12 + rr(0, 0.35); this.mode = 'visit'; this.linger = rr(1.5, 5);
    }
  }

  update(dt, t) {
    const s = this.sys, d = s.decor, b = this.b, B = OD.bounds, p = this.pos, st = b.st;
    if (this.fade < 1) { this.fade = Math.min(1, this.fade + dt * 0.7); this.mat.uniforms.uFade.value = this.fade; }
    this.goalT += dt; this.scare = Math.max(0, this.scare - dt); this.snap = Math.max(0, this.snap - dt * 3); this.excite = Math.max(0, this.excite - dt * 0.4);
    let ds = b.sp, hover = false, face = null, peck = 0;

    /* --- nourrissage : la nourriture prime sur le reste --- */
    let feeding = false;
    if (s.foodActive) {
      if (this.foodDelay < 0) this.foodDelay = s.reactionDelay(this); else this.foodDelay = Math.max(0, this.foodDelay - dt);
      if (this.foodDelay === 0 && (!this.food || this.food.eaten || this.food.gone)) this.food = s.claimFood(this);
      if (this.food && !this.food.eaten && !this.food.gone) {
        feeding = true; this.goal.copy(this.food.pos); this.sit = false; if (this.perch) { this.perch.busy = null; this.perch = null; }
        const dist = p.distanceTo(this.goal); this.goal.y = Math.min(this.goal.y, B.y1 - 0.3);
        ds = b.sp * (st === 'lurk' || st === 'crawl' ? 1.6 : 2.0) + 0.5;
        if (dist < this.len * 0.42 + 0.14) { s.eat(this.food, this); this.food = null; this.snap = 1; this.excite = 1; this.foodDelay = rr(0.45, 1.3); }
      } else if (this.foodDelay > 0 && this.excite > 0) {      /* il mâche : petit tour sur place avant la bouchée suivante */
        feeding = true; ds = b.sp * 0.8; this.goal.set(p.x + Math.cos(this.yaw + 1.2) * 1.5, clamp(p.y - 0.25, B.y0, B.y1 - 0.8), p.z - Math.sin(this.yaw + 1.2) * 1.5);
      }
    } else { this.foodDelay = -1; this.food = null; }

    if (!feeding) {
      if (this.mode === 'init') this.pickGoal();
      const dist = p.distanceTo(this.goal), arriveR = 0.45 + this.len * 0.35;
      if (st === 'school') {
        const g = s.groupFor(this); this.goal.copy(g.pos).addScaledVector(this.off, g.rad);
        ds = g.rest ? b.sp * 0.35 : g.speed * (dist > 2 ? 1.5 : 1); if (g.rest && dist < 0.5) { hover = true; face = g.yaw; ds = 0.03; }
      } else if (st === 'perch') {
        if (this.sit) { hover = true; ds = 0; this.lingerT -= dt; if (this.lingerT <= 0 || (this.perch && this.perch.busy !== this)) this.pickGoal(); }
        else if (dist < 0.22) { this.sit = true; this.lingerT = rr(5, 16); this.sitYaw = rr(-0.9, 0.9) + (rnd() < 0.5 ? 0 : Math.PI); this.speed = 0; }
        else if (this.goalT > 12) this.pickGoal(); else ds = b.sp * (dist < 1 ? 0.5 : 1);
      } else if (this.mode === 'clean' && this.client && s.fish.indexOf(this.client) >= 0) {
        const c = this.client; this.goal.set(c.pos.x + Math.sin(t * 2 + this.seed) * c.len * 0.45, c.pos.y + c.len * 0.2 + Math.sin(t * 5) * 0.12, c.pos.z + c.len * 0.3);
        ds = Math.max(b.sp, c.speed * 1.2); this.linger -= dt; if (this.linger <= 0) this.pickGoal();
      } else if (this.lingerT > 0) {
        this.lingerT -= dt; hover = true; ds = b.sp * 0.07;
        if (this.mode === 'visit' && (b.graze || st === 'crawl')) peck = Math.max(0, Math.sin(t * 3.1 + this.seed)) * 0.45;
        if (st === 'host') { ds = b.sp * 0.25; hover = false; }
        if (this.lingerT <= 0) this.pickGoal();
      } else if (dist < arriveR) { if (this.linger > 0) { this.lingerT = this.linger; this.linger = 0; } else this.pickGoal(); }
      else if (this.goalT > 14) this.pickGoal();
      else { ds = b.sp * (dist < 2 ? 0.45 + 0.55 * dist / 2 : 1); if (this.mode === 'hide' && this.scare > 0) ds = b.sp * 2.6; }
      if (st === 'dart' && this.lingerT > 0) { this.dartT -= dt; if (this.dartT <= 0) { this.dartT = rr(5, 13); this.lingerT = 0; this.goal.add(V(rr(-2.4, 2.4), rr(-0.3, 0.8), rr(-0.6, 1.2))); this.excite = 1; this.mode = 'travel'; this.goalT = 10; } }
      if (st === 'dart' && this.scare > 0 && this.mode !== 'hide') this.pickGoal();
      if (this.excite > 0 && !hover) ds *= 1 + this.excite * 1.4;
    }

    /* --- direction souhaitée : but + évitement + séparation + parois --- */
    let dx = this.goal.x - p.x, dy = this.goal.y - p.y, dz = this.goal.z - p.z; const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
    let ax = this.sep.x, ay = this.sep.y, az = this.sep.z; const m = (0.55 + this.len * 0.3) * clamp(dl / 2.2, 0.15, 1);
    if (!this.sit) for (const o of d.obstacles) {
      const ex = (p.x - o.x) / (o.rx + m), ey = (p.y - o.y) / (o.ry + m), ez = (p.z - o.z) / (o.rz + m), q = ex * ex + ey * ey + ez * ez;
      if (q < 1) { const k = (1 - Math.sqrt(q)) * 3.2, l = Math.hypot(ex, ey, ez) || 1; ax += ex / l * k; ay += (ey / l + 0.25) * k; az += ez / l * k; }
    }
    const fy = d.floor(p.x, p.z) + 0.22 + this.len * 0.14;
    if (p.y < fy + 0.5) ay += (fy + 0.5 - p.y) * 2.4; if (p.y > B.y1) ay -= (p.y - B.y1) * 2.5;
    if (this.fade >= 1 || Math.abs(p.x) < B.x1) { if (p.x > B.x1 - 1) ax -= (p.x - B.x1 + 1) * 1.6; if (p.x < B.x0 + 1) ax += (B.x0 + 1 - p.x) * 1.6; }
    if (p.z > B.z1) az -= (p.z - B.z1) * 2.2; if (p.z < B.z0) az += (B.z0 - p.z) * 1.6;
    const wx = dx + ax, wy = dy + ay, wz = dz + az, wl = Math.hypot(wx, wy, wz) || 1;

    /* --- orientation : ressort amorti sur le cap, tangage limité --- */
    let tYaw = Math.atan2(-wz, wx), tPitch = Math.asin(clamp(wy / wl, -0.4, 0.4));
    if (hover) { tPitch = -peck; if (face !== null) tYaw = face; else if (this.sit) tYaw = this.sitYaw; else if (this.mode === 'visit' && st !== 'dart') tYaw = Math.atan2(-(this.goal.z - 0.6 - p.z), this.goal.x - p.x) + Math.sin(t * 0.5 + this.seed) * 0.5; else tYaw = this.yaw + Math.sin(t * 0.7 + this.seed) * 0.02; }
    if (st === 'lurk' && !feeding) tPitch -= 0.14;
    if (st === 'host' && !feeding) tYaw += Math.sin(t * 4.3 + this.seed) * 0.28;
    if (this.sit) tPitch = 0.14;
    const ag = (2.1 / Math.sqrt(this.len)) * (feeding || this.excite > 0 ? 1.7 : 1), k1 = ag * ag * 2.6, dyaw = wrap(tYaw - this.yaw);
    this.yawV += (dyaw * k1 - this.yawV * 2 * Math.sqrt(k1) * 0.82) * dt; this.yawV = clamp(this.yawV, -ag * 1.7, ag * 1.7);
    this.yaw = wrap(this.yaw + this.yawV * dt);
    this.pitch += (tPitch - this.pitch) * Math.min(1, dt * (feeding ? 5 : 2.6));
    const slow = 1 - 0.6 * Math.min(1, Math.abs(dyaw) / 2.2);
    this.speed += (ds * slow - this.speed) * Math.min(1, dt * (feeding ? 3.2 : 1.6));
    if (this.snap > 0.6) this.speed += dt * 6;
    const cp = Math.cos(this.pitch), sp2 = this.speed * dt;
    p.x += cp * Math.cos(this.yaw) * sp2; p.y += Math.sin(this.pitch) * sp2 + clamp(wy / wl, -1, 1) * (0.35 * sp2 + 0.12 * dt); p.z -= cp * Math.sin(this.yaw) * sp2;
    if (hover && !this.sit) { p.y += Math.sin(t * 1.3 + this.seed) * 0.05 * dt; }
    if (this.sit && this.perch) { p.lerp(this.goal, Math.min(1, dt * 5)); }
    if (p.y < fy) p.y = fy;
    this.roll += (clamp(-this.yawV * 0.16, -0.42, 0.42) - this.roll) * Math.min(1, dt * 4);
    this.mesh.rotation.set(this.roll, this.yaw, this.pitch + (this.snap > 0 ? -Math.sin(this.snap * 3.14) * 0.3 : 0), 'YZX');

    /* --- animation de nage --- */
    const rel = this.speed / Math.max(0.15, b.sp);
    this.phase += dt * this.freq * (2.6 + 6.6 * this.speed / (this.len * 1.5)) * (1 + this.snap); if (this.phase > 6283.1853) this.phase -= 6283.1853;
    const tAmp = this.sit ? 0.06 : Math.min(1.45, 0.4 + 0.6 * Math.min(1.5, rel) + Math.abs(this.yawV) * 0.07 + this.snap * 0.4);
    this.amp += (tAmp - this.amp) * Math.min(1, dt * 3);
    this.finT += dt * (0.8 + Math.min(2, rel) * 0.5 + (hover ? 0.5 : 0)); if (this.finT > 628.31853) this.finT -= 628.31853;
    this.mat.uniforms.uSwim.value.set(this.phase, this.amp, clamp(this.yawV * 0.32, -0.8, 0.8), this.finT);
  }
}

OD.FishSystem = class {
  constructor(aq) {
    this.aq = aq; this.decor = aq.decor; this.fish = []; this.species = {}; this.groups = {}; this.hosts = {}; this.homes = [];
    this.group = new T.Group(); aq.scene.add(this.group);
    this.foodActive = false; this.foodList = null; this.inverts = [];
    aq.decorListeners.push(d => this.onDecor(d));
    aq.updaters.push((dt, t) => this.update(dt, t));
  }
  isFish(id) { return !!OD.FISH_MODELS[id]; }

  /* modèle 3D d'une espèce, construit à la demande */
  spec(id) {
    let s = this.species[id]; if (s) return s;
    const M = OD.FISH_MODELS[id], e = OD.DB.byId[id], at = OD.FishArt.atlas(M, this.aq.q.tex);
    const tex = new T.CanvasTexture(at.canvas); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter;
    s = this.species[id] = { id: id, M: M, tex: tex, geo: OD.FishArt.geometry(M, at), len: 0.34 * Math.pow(e.cm, 0.5), beh: BEH[id] || { st: 'cruise', sp: 1.2, y: [0.2, 0.8], graze: 0.3 } };
    return s;
  }

  count(id) { let n = 0; for (const f of this.fish) if (f.id === id) n++; for (const f of this.inverts) if (f.id === id) n++; return n; }
  total() { return this.fish.length + this.inverts.length; }

  spawnPoint(f, anywhere) {
    const B = OD.bounds, p = f.pos;
    if (anywhere) { for (let k = 0; k < 12; k++) { p.set(rr(B.x0 + 1, B.x1 - 1), rr(B.y0 + 0.6, B.y1 - 0.5), rr(B.z0 + 0.5, B.z1 - 0.3)); if (!this.inObstacle(p, 0.6)) break; } f.fade = 1; f.mat.uniforms.uFade.value = 1; }
    else { const side = rnd() < 0.5 ? -1 : 1; p.set(side * (B.x1 + 1.6 + rnd() * 1.5), rr(B.y0 + 1.5, B.y1 - 1.5), rr(B.z0 + 1.5, B.z1 - 0.8)); f.yaw = side > 0 ? Math.PI : 0; f.fade = 0; f.mat.uniforms.uFade.value = 0; }
    f.mode = 'init'; f.home = null; f.sit = false; if (f.perch) { f.perch.busy = null; f.perch = null; } f.lingerT = 0; f.food = null;
  }

  add(id, anywhere) {
    if (!this.isFish(id)) { const iv = OD.Inverts.create(id, this); if (iv) { this.inverts.push(iv); this.group.add(iv.obj); } return; }
    const f = new Fish(this, this.spec(id)); this.spawnPoint(f, anywhere); this.fish.push(f); this.group.add(f.mesh);
  }
  removeOne(id) {
    for (let i = this.fish.length - 1; i >= 0; i--) if (this.fish[i].id === id) { const f = this.fish[i]; if (f.perch) f.perch.busy = null; this.group.remove(f.mesh); f.mat.dispose(); this.fish.splice(i, 1); return; }
    for (let i = this.inverts.length - 1; i >= 0; i--) if (this.inverts[i].id === id) { const v = this.inverts[i]; this.group.remove(v.obj); if (v.dispose) v.dispose(); this.inverts.splice(i, 1); return; }
  }
  /* aligne la population sur { id: nombre } */
  setPopulation(pop, anywhere) {
    const ids = new Set(Object.keys(pop)); for (const f of this.fish) ids.add(f.id); for (const f of this.inverts) ids.add(f.id);
    for (const id of ids) { const want = pop[id] || 0; let have = this.count(id); while (have < want) { this.add(id, anywhere); have++; } while (have > want) { this.removeOne(id); have--; } }
    this.groups = {}; this.hosts = {};
  }

  onDecor(d) {
    this.decor = d; this.groups = {}; this.hosts = {}; this.homes = [];
    for (const f of this.fish) this.spawnPoint(f, true);
    for (const v of this.inverts) v.place(true);
  }
  /* qualité changée : les textures sont refaites à la bonne définition */
  refreshTextures() { for (const id in this.species) { const s = this.species[id], at = OD.FishArt.atlas(s.M, this.aq.q.tex); s.tex.image = at.canvas; s.tex.needsUpdate = true; } }

  inObstacle(p, m) { for (const o of this.decor.obstacles) { const ex = (p.x - o.x) / (o.rx + m), ey = (p.y - o.y) / (o.ry + m), ez = (p.z - o.z) / (o.rz + m); if (ex * ex + ey * ey + ez * ez < 1) return true; } return false; }
  sandPoint(nearP, rad) {
    const B = OD.bounds, p = V(0, 0, 0);
    for (let k = 0; k < 40; k++) {
      if (nearP) p.set(nearP.x + rr(-rad, rad), 0, nearP.z + rr(-rad, rad)); else p.set(rr(B.x0 + 0.8, B.x1 - 0.8), 0, rr(B.z0 + 2.5, B.z1 + 1.2));
      p.x = clamp(p.x, B.x0 + 0.5, B.x1 - 0.5); p.z = clamp(p.z, B.z0 + 1.5, B.z1 + 1.4); p.y = this.decor.floor(p.x, p.z);
      let ok = true; for (const o of this.decor.obstacles) { if (o.y - o.ry > p.y + 1.2) continue; const ex = (p.x - o.x) / (o.rx + 0.35), ez = (p.z - o.z) / (o.rz + 0.35); if (ex * ex + ez * ez < 1) { ok = false; break; } }
      if (ok) return p;
    }
    return p;
  }

  /* anémone (ou à défaut corail) qui héberge un poisson-clown */
  hostFor(f) {
    if (this.hosts[f.id]) return this.hosts[f.id];
    const B = OD.bounds, an = this.decor.anemones.filter(a => Math.abs(a.p.x) < B.x1 - 0.3), used = Object.values(this.hosts);
    let h = an.find(a => used.indexOf(a) < 0) || an[(rnd() * an.length) | 0];
    if (!h) { const ps = this.decor.pois.filter(q => Math.abs(q.p.x) < B.x1 - 1 && q.p.y < 5); const q = ps.length ? ps[(rnd() * ps.length) | 0] : { p: V(0, 2, 0), r: 1 }; h = { p: q.p.clone(), r: 0.9 }; }
    return (this.hosts[f.id] = h);
  }
  homeFor(f) {
    const B = OD.bounds, hs = this.decor.hides.filter(h => Math.abs(h.p.x) < B.x1 - 0.5);
    let h = hs.find(q => this.homes.indexOf(q) < 0) || hs[(rnd() * hs.length) | 0] || { p: V(rr(-3, 3), 1.5, -2) };
    this.homes.push(h); return { p: h.p.clone().add(V(0, 0.1, 0.5)) };
  }
  groupFor(f) {
    let g = this.groups[f.id];
    if (!g) { g = this.groups[f.id] = { pos: f.pos.clone(), goal: f.pos.clone(), timer: 0, rest: false, yaw: 0, speed: f.b.sp, rad: 1, b: f.b, n: 0 }; }
    return g;
  }
  updateGroups(dt) {
    const B = OD.bounds;
    for (const id in this.groups) {
      const g = this.groups[id], b = g.b; g.n = this.count(id); g.rad = 0.55 + 0.16 * Math.sqrt(g.n) * (b.hover ? 1.2 : 1.6);
      g.timer -= dt;
      const dist = g.pos.distanceTo(g.goal);
      if (g.timer <= 0 || (dist < 0.4 && !g.rest)) {
        if (b.hover && dist < 0.4 && !g.rest) { g.rest = true; g.timer = rr(7, 16); g.yaw = rnd() < 0.5 ? rr(-0.5, 0.5) : Math.PI + rr(-0.5, 0.5); }
        else { g.rest = false; g.timer = rr(9, 18);
          const pois = b.hover ? this.decor.pois.filter(q => Math.abs(q.p.x) < B.x1 - 1.5 && q.p.y < B.y1 - 1) : [];
          if (pois.length) { const q = pois[(rnd() * pois.length) | 0]; g.goal.set(q.p.x + rr(-0.5, 0.5), q.p.y + rr(0.5, 1.4), q.p.z + rr(0.6, 1.4)); }
          else g.goal.set(rr(B.x0 + 2, B.x1 - 2), lerp(B.y0, B.y1, rr(b.y[0], b.y[1])), rr(B.z0 + 1, B.z1 - 1));
          for (let k = 0; k < 6 && this.inObstacle(g.goal, 1.2); k++) g.goal.y += 0.8;
          g.goal.y = Math.min(g.goal.y, B.y1 - 0.4);
        }
      }
      if (this.foodActive) continue;
      if (!g.rest && dist > 0.05) { const st = Math.min(dist, b.sp * 0.85 * dt); g.pos.addScaledVector(g.goal.clone().sub(g.pos).normalize(), st); }
    }
  }

  /* --- nourriture (fournie par feeding.js) --- */
  reactionDelay(f) { const fc = this.foodCenter || f.pos, st = f.b.st; return 0.25 + f.pos.distanceTo(fc) * 0.11 + rnd() * 0.5 + (st === 'perch' || st === 'crawl' ? 1.5 : 0) + (st === 'lurk' ? 2 : 0); }
  claimFood(f) {
    const L = this.foodList; if (!L) return null; let best = null, bd = 1e9; const lim = (f.b.st === 'perch' || f.b.st === 'crawl') ? 4.5 : 1e9;
    for (const q of L) { if (q.eaten || q.gone || !q.inWater) continue; const d = q.pos.distanceTo(f.pos) + q.claims * 1.3; if (d < bd && d < lim) { bd = d; best = q; } }
    if (best) best.claims++; return best;
  }
  eat(q, f) { q.eaten = true; if (this.onEat) this.onEat(q, f); }

  update(dt, t) {
    if (!this.decor) return;
    this.updateGroups(dt);
    const F = this.fish, n = F.length;
    for (let i = 0; i < n; i++) F[i].sep.set(0, 0, 0);
    for (let i = 0; i < n; i++) { const a = F[i]; for (let j = i + 1; j < n; j++) { const b = F[j];
      const dx = a.pos.x - b.pos.x, dy = a.pos.y - b.pos.y, dz = a.pos.z - b.pos.z, d2 = dx * dx + dy * dy + dz * dz, r = (a.len + b.len) * 0.48;
      if (d2 < r * r && d2 > 1e-6) { const d = Math.sqrt(d2), k = (1 - d / r) * 1.6 / d; a.sep.x += dx * k; a.sep.y += dy * k * 0.7; a.sep.z += dz * k; b.sep.x -= dx * k; b.sep.y -= dy * k * 0.7; b.sep.z -= dz * k; }
      if (d2 < 3.2) { if (a.b.st === 'dart' && b.len > a.len * 1.6 && b.speed > 0.6) a.scare = 2.5; if (b.b.st === 'dart' && a.len > b.len * 1.6 && a.speed > 0.6) b.scare = 2.5; } } }
    for (let i = 0; i < n; i++) F[i].update(dt, t);
    for (const v of this.inverts) v.update(dt, t);
  }
};
OD.FishBehaviors = BEH;
})();
