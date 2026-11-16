/* Ocean Dream — feeding.js : nourrissage. Le distributeur apparaît, la nourriture tombe, les poissons montent la saisir. */
(function () {
'use strict';
const T = THREE, OD = window.OD;
const V = (x, y, z) => new T.Vector3(x, y, z), rnd = Math.random, rr = (a, b) => a + (b - a) * rnd();
const N = 64, COLORS = ['#c8452a', '#e08a2a', '#7a9a3a', '#e0b84a', '#8a4a2a', '#d86a3a'];

OD.Feeding = class {
  constructor(aq, sys) {
    this.aq = aq; this.sys = sys; this.busy = false; this.el = document.getElementById('feeder'); this.onState = null;
    const g = new T.IcosahedronGeometry(1, 1); g.scale(1, 0.38, 0.8);
    this.mesh = new T.InstancedMesh(g, new T.MeshLambertMaterial({ color: 0xffffff }), N); this.mesh.frustumCulled = false; this.mesh.count = N; this.mesh.visible = false;
    const c = new T.Color(); this.P = [];
    for (let i = 0; i < N; i++) { this.mesh.setColorAt(i, c.set(COLORS[i % COLORS.length])); this.P.push({ pos: V(0, 0, 0), vel: V(0, 0, 0), size: 0, s: 0, delay: 0, inWater: false, eaten: false, gone: true, claims: 0, land: 0, ph: rnd() * 6.28, rot: V(rnd() * 6, rnd() * 6, rnd() * 6), spin: V(rr(-2, 2), rr(-2, 2), rr(-2, 2)) }); }
    this.mesh.instanceColor.needsUpdate = true; aq.scene.add(this.mesh);
    this.dummy = new T.Object3D(); this.zero = new T.Matrix4().makeScale(0, 0, 0);
    sys.foodList = this.P; sys.onEat = () => { if (OD.Audio && rnd() < 0.5) OD.Audio.bloop(0.035, 500 + rnd() * 500); };
    aq.updaters.push((dt, t) => this.update(dt, t));
    for (let i = 0; i < N; i++) this.mesh.setMatrixAt(i, this.zero);
  }

  feed() {
    if (this.busy) return false; this.busy = true; if (this.onState) this.onState(true);
    const B = OD.bounds, top = OD.TANK.top, x = rr(-0.5, 0.5) * B.x1 * 0.9, z = rr(-2.4, 0.4), ctr = V(x, top - 0.1, z);
    const sp = this.aq.project(ctr); this.el.style.left = Math.round(Math.min(window.innerWidth - 70, Math.max(70, sp.x))) + 'px';
    this.el.classList.remove('pour'); void this.el.offsetWidth; this.el.classList.add('pour');
    if (OD.Audio) OD.Audio.sprinkle(1.0);
    for (let i = 0; i < N; i++) { const p = this.P[i], a = rnd() * 6.283, r = Math.sqrt(rnd()) * 1.5;
      p.pos.set(x + Math.cos(a) * r, top - 0.03, z + Math.sin(a) * r * 0.7); p.vel.set(rr(-0.35, 0.35), -rr(2.4, 4.2), rr(-0.25, 0.25));
      p.size = rr(0.05, 0.085); p.s = 0; p.delay = 1.0 + (i / N) * 1.25 + rnd() * 0.15; p.inWater = false; p.eaten = false; p.gone = false; p.claims = 0; p.land = 0; p.sink = rr(0.28, 0.62); }
    this.mesh.visible = true; this.sys.foodCenter = V(x, top - 3, z); this.sys.foodActive = true; this.t0 = 0;
    for (const f of this.sys.fish) { f.foodDelay = -1; f.food = null; }
    return true;
  }

  update(dt, t) {
    if (!this.mesh.visible) return;
    const d = this.aq.decor, cur = OD.U.uCurrent.value; let alive = 0; this.t0 += dt;
    for (let i = 0; i < N; i++) { const p = this.P[i];
      if (p.gone) { this.mesh.setMatrixAt(i, this.zero); continue; }
      alive++;
      if (!p.inWater) { p.delay -= dt; if (p.delay <= 0) p.inWater = true; else { this.mesh.setMatrixAt(i, this.zero); continue; } }
      if (p.eaten) { p.s -= dt * 9; if (p.s <= 0) { p.gone = true; this.mesh.setMatrixAt(i, this.zero); continue; } }
      else {
        p.s = Math.min(1, p.s + dt * 6);
        const fl = d.floor(p.pos.x, p.pos.z) + 0.03;
        if (p.pos.y > fl) {
          p.vel.y += (-p.sink - p.vel.y) * Math.min(1, dt * 1.5); p.vel.x += (cur.x * 0.12 - p.vel.x) * dt * 0.8; p.vel.z += (cur.y * 0.1 - p.vel.z) * dt * 0.8;
          p.pos.x += (p.vel.x + Math.sin(t * 2.3 + p.ph) * 0.14) * dt; p.pos.y += p.vel.y * dt; p.pos.z += (p.vel.z + Math.cos(t * 1.9 + p.ph) * 0.1) * dt;
          p.rot.x += p.spin.x * dt; p.rot.y += p.spin.y * dt; p.rot.z += p.spin.z * dt;
          if (this.sys.inObstacle(p.pos, -0.1)) p.land += dt * 3;
        } else { p.pos.y = fl; p.land += dt; }
        if (p.land > 7) { p.s -= dt * 2.5; if (p.s <= 0) { p.gone = true; this.mesh.setMatrixAt(i, this.zero); continue; } }
      }
      const o = this.dummy; o.position.copy(p.pos); o.rotation.set(p.rot.x, p.rot.y, p.rot.z); o.scale.setScalar(Math.max(0.0001, p.size * p.s)); o.updateMatrix(); this.mesh.setMatrixAt(i, o.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (alive === 0 || this.t0 > 40) { for (const p of this.P) p.gone = true; this.mesh.visible = false; this.sys.foodActive = false; this.busy = false; if (this.onState) this.onState(false); for (const f of this.sys.fish) f.excite = 0.8; }
  }
};
})();
