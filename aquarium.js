/* Ocean Dream — aquarium.js
   Moteur de rendu : scène, eau, lumière, caustiques, rayons, particules, bulles, caméra. */
(function () {
'use strict';
const T = THREE;
const OD = window.OD = window.OD || {};

/* ---------- utilitaires ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
OD.clamp = clamp; OD.lerp = lerp; OD.sstep = sstep;

OD.rng = function (seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

/* bruit de gradient 3D (Perlin amélioré) */
OD.Noise = class {
  constructor(seed) {
    const r = OD.rng(seed || 7), perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }
  n3(x, y, z) {
    const p = this.p;
    let X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z; X &= 255; Y &= 255; Z &= 255;
    const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10), w = z * z * z * (z * (z * 6 - 15) + 10);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    const g = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
    return lerp(
      lerp(lerp(g(p[AA], x, y, z), g(p[BA], x - 1, y, z), u), lerp(g(p[AB], x, y - 1, z), g(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(g(p[AA + 1], x, y, z - 1), g(p[BA + 1], x - 1, y, z - 1), u), lerp(g(p[AB + 1], x, y - 1, z - 1), g(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }
  fbm(x, y, z, oct) {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < (oct || 4); i++) { s += a * this.n3(x * f, y * f, z * f); a *= 0.5; f *= 2.03; }
    return s;
  }
};

const _colCache = {};
OD.C = function (hex) { return _colCache[hex] || (_colCache[hex] = new T.Color(hex)); };
const srgbVec = (hex, v) => { const c = new T.Color(hex); c.convertLinearToSRGB(); return (v || new T.Vector3()).set(c.r, c.g, c.b); };

OD.TANK = { top: 9.4 };
OD.bounds = { x0: -10, x1: 10, y0: 0.7, y1: 8.7, z0: -6, z1: 3.8 };

/* ---------- uniforms partagés ---------- */
const U = OD.U = {
  uTime: { value: 0 },
  uCaustics: { value: null },
  uCausticScale: { value: 0.085 },
  uCausticStrength: { value: 1.6 },
  uCurrent: { value: new T.Vector2(0.4, 0.1) },
  uSwayAmp: { value: 1 },
  uGlow: { value: 0 },
  uFishGlow: { value: 0 },
  uDetail: { value: null },
  uSunDir: { value: new T.Vector3(0.2, 1, 0.25).normalize() },
  uSunColor: { value: new T.Color(1, 1, 1) },
  uAmbSky: { value: new T.Color(0.5, 0.7, 0.9) },
  uAmbGround: { value: new T.Color(0.1, 0.2, 0.3) },
  uFogColorS: { value: new T.Vector3(0.1, 0.5, 0.7) },
  uFogDensity: { value: 0.03 },
  uRip: { value: new T.Vector4(0.3, 6.5, 0.9, 0) },
  uRake: { value: [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()] }
};

/* texture de détail répétable (R : taches, G : grain fin, B : mouchetures) */
function makeDetailTexture() {
  const S = 256, data = new Uint8Array(S * S * 4), r = OD.rng(4242);
  const grid = (per) => { const g = new Float32Array(per * per); for (let i = 0; i < g.length; i++) g[i] = r(); return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const i0 = ((xi % per) + per) % per, i1 = (i0 + 1) % per, j0 = ((yi % per) + per) % per, j1 = (j0 + 1) % per;
    return lerp(lerp(g[j0 * per + i0], g[j0 * per + i1], u), lerp(g[j1 * per + i0], g[j1 * per + i1], u), v); }; };
  const n6 = grid(6), n13 = grid(13), n29 = grid(29), n64 = grid(64), n128 = grid(128);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, i = (y * S + x) * 4;
    const a = n6(u * 6, v * 6) * 0.45 + n13(u * 13, v * 13) * 0.32 + n29(u * 29, v * 29) * 0.23;
    const b = n64(u * 64, v * 64) * 0.55 + n128(u * 128, v * 128) * 0.25 + r() * 0.2;
    const c = Math.pow(n29(u * 29 + 3.3, v * 29 + 1.7), 3);
    const h = n6(u * 6 + 1.7, v * 6 + 4.1) * 0.6 + n13(u * 13 + 2.2, v * 13 + 0.6) * 0.4;      // relief doux (canal alpha)
    data[i] = clamp(a * 255, 0, 255); data[i + 1] = clamp(b * 255, 0, 255); data[i + 2] = clamp(c * 255, 0, 255); data[i + 3] = clamp(h * 255, 0, 255);
  }
  const tex = new T.DataTexture(data, S, S, T.RGBAFormat);
  tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter;
  tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

/* ---------- matériau « sous-marin » (Lambert + ondulation + caustiques + fluorescence) ---------- */
const SWAY_GLSL = `
  float odS = aSway.x; float odP = aSway.y + uTime * 1.25;
  float odW = sin(odP + position.y * 0.9) * 0.62 + sin(odP * 0.57 + position.x * 0.7) * 0.38;
  transformed.x += odS * uSwayAmp * (odW * 0.55 + uCurrent.x * 0.45);
  transformed.z += odS * uSwayAmp * (cos(odP * 0.8 + position.z * 0.9) * 0.34 + uCurrent.y * 0.4);
  transformed.y -= odS * odS * 0.12 * abs(odW);
`;
OD.mat = function (o) {
  o = o || {};
  const m = new T.MeshLambertMaterial({
    color: o.color !== undefined ? o.color : 0xffffff, vertexColors: o.vertexColors !== false,
    side: o.side || T.FrontSide, emissive: o.emissive || 0x000000, emissiveIntensity: o.emissiveIntensity !== undefined ? o.emissiveIntensity : 1,
    transparent: !!o.transparent, opacity: o.opacity !== undefined ? o.opacity : 1, map: o.map || null
  });
  const sway = !!o.sway, detail = o.detail || 0, glow = !!o.glow, cst = o.caustics !== undefined ? o.caustics : 1;
  m.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uCaustics = U.uCaustics; sh.uniforms.uCausticScale = U.uCausticScale;
    sh.uniforms.uCausticStrength = U.uCausticStrength; sh.uniforms.uCurrent = U.uCurrent; sh.uniforms.uSwayAmp = U.uSwayAmp;
    sh.uniforms.uGlow = U.uGlow; sh.uniforms.uDetail = U.uDetail; sh.uniforms.uRip = U.uRip; sh.uniforms.uRake = U.uRake;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vODW;\n' +
        (sway ? 'attribute vec2 aSway; uniform float uTime; uniform vec2 uCurrent; uniform float uSwayAmp;\n' : '') +
        (glow ? 'attribute float aGlow; varying float vGlow;\n' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (sway ? SWAY_GLSL : '') + (glow ? 'vGlow = aGlow;\n' : ''))
      .replace('#include <project_vertex>', '#include <project_vertex>\nvODW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vODW; uniform sampler2D uCaustics; uniform sampler2D uDetail;' +
        ' uniform float uCausticScale; uniform float uCausticStrength; uniform float uGlow; uniform vec4 uRip; uniform vec3 uRake[6];\n' + (glow ? 'varying float vGlow;\n' : ''))
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + (
        detail === 1 ? `
          vec3 odB = abs(normalize(cross(dFdx(vODW), dFdy(vODW)))); odB /= (odB.x + odB.y + odB.z);
          vec4 odT = texture2D(uDetail, vODW.zy * 0.31) * odB.x + texture2D(uDetail, vODW.xz * 0.31) * odB.y + texture2D(uDetail, vODW.xy * 0.31) * odB.z;
          diffuseColor.rgb *= (0.5 + odT.r * 0.75) * (0.8 + odT.g * 0.4); float odH = odT.a * smoothstep(38.0, 12.0, length(vODW - cameraPosition));` :
        detail === 2 ? `
          vec3 odT = texture2D(uDetail, vODW.xz * 0.9).rgb; float odT2 = texture2D(uDetail, vODW.xz * 0.13).r;
          vec2 odG; float odPh;
          if (uRip.w < 0.5) {
            float wz = sin(vODW.z * 0.42) + 0.5 * sin(vODW.z * 1.13 + vODW.x * 0.21);
            odPh = uRip.y * (vODW.x + uRip.z * wz);
            odG = vec2(1.0, uRip.z * (0.42 * cos(vODW.z * 0.42) + 0.565 * cos(vODW.z * 1.13 + vODW.x * 0.21)));
          } else {
            odPh = vODW.z * uRip.y; odG = vec2(0.0, 1.0); float best = 0.0;
            for (int i = 0; i < 6; i++) { vec3 st = uRake[i]; if (st.z > 0.0) { vec2 dv = vODW.xz - st.xy; float d = length(dv); float k = smoothstep(st.z, st.z - 0.5, d);
              if (k > best) { best = k; odPh = mix(vODW.z * uRip.y, d * uRip.y, k); odG = normalize(mix(vec2(0.0, 1.0), dv / max(d, 0.001), k)); } } }
          }
          float odFar = smoothstep(46.0, 14.0, length(vODW - cameraPosition));
          float odRs = sin(odPh) * odFar, odRc = cos(odPh) * odFar;
          diffuseColor.rgb *= (0.78 + odT.g * 0.34) * (0.88 + odT2 * 0.24) * (1.0 - odT.b * 0.35) * (1.0 + odRs * uRip.x * 0.3);` :
        detail === 3 ? `
          vec3 odB = abs(normalize(cross(dFdx(vODW), dFdy(vODW)))); odB /= (odB.x + odB.y + odB.z);
          float odT = texture2D(uDetail, vODW.zy * 1.1).g * odB.x + texture2D(uDetail, vODW.xz * 1.1).g * odB.y + texture2D(uDetail, vODW.xy * 1.1).g * odB.z;
          diffuseColor.rgb *= 0.74 + odT * 0.52;` : ''))
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n' +
        (detail === 2 ? 'normal = normalize(normal + (viewMatrix * vec4(-odG.x * odRc, 0.0, -odG.y * odRc, 0.0)).xyz * uRip.x * 1.5);\n' :
         detail === 1 ? `{ vec2 odDH = vec2(dFdx(odH), dFdy(odH)) * 2.4; vec3 odSX = dFdx(vODW), odSY = dFdy(vODW); vec3 odNW = normalize(cross(odSX, odSY));
            vec3 odR1 = cross(odSY, odNW), odR2 = cross(odNW, odSX); float odDet = dot(odSX, odR1);
            vec3 odGr = sign(odDet) * (odDH.x * odR1 + odDH.y * odR2);
            normal = normalize(normal - (viewMatrix * vec4(odGr / max(abs(odDet), 1e-6), 0.0)).xyz * 0.5); }\n` : ''))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' +
        (glow ? 'totalEmissiveRadiance += diffuseColor.rgb * vGlow * uGlow;\n' : ''))
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' +
        'float odC = texture2D(uCaustics, vODW.xz * uCausticScale + vODW.y * 0.021).r;\n' +
        'reflectedLight.directDiffuse *= 0.82 + odC * uCausticStrength * ' + cst.toFixed(2) + ';\n');
  };
  m.customProgramCacheKey = function () { return 'od-' + (sway ? 1 : 0) + detail + (glow ? 1 : 0) + cst; };
  return m;
};

/* ---------- préréglages de qualité ---------- */
const QUALITY = {
  low:    { pr: 1.0,  shadow: 0,    rays: 6,  snow: 140, caus: 256, tex: 512,  bub: 14 },
  medium: { pr: 1.5,  shadow: 1024, rays: 10, snow: 280, caus: 256, tex: 512,  bub: 22 },
  high:   { pr: 2.0,  shadow: 2048, rays: 14, snow: 460, caus: 512, tex: 768,  bub: 30 }
};

OD.Aquarium = class {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false });
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.shadowMap.type = T.PCFShadowMap;
    r.setClearColor(0x04203a, 1);
    this.scene = new T.Scene();
    this.scene.fog = new T.FogExp2(0x1b8fb4, 0.03);
    this.camera = new T.PerspectiveCamera(38, 1, 0.3, 300);
    this.hemi = new T.HemisphereLight(0xffffff, 0x223344, 1);
    this.sun = new T.DirectionalLight(0xffffff, 3);
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.time = 0; this.speed = 1; this.light = 1; this.showBubbles = true;
    this.qualityMode = 'auto'; this.q = QUALITY.high; this.qName = 'high'; this.prScale = 1;
    this.updaters = []; this.decor = null; this.env = null; this.decorListeners = [];
    this.cam = { yaw: 0, pitch: 0, zoom: 1, tyaw: 0, tpitch: 0, tzoom: 1 };
    this._ft = []; this._slow = 0; this._last = 0; this._running = false; this._skipAdapt = 20;
    document.addEventListener('visibilitychange', () => { this._ft.length = 0; this._skipAdapt = 4; });   // un retour d'onglet ne doit pas fausser la mesure de fluidité
    U.uDetail.value = makeDetailTexture();
    this._initCaustics(); this._initDome(); this._initSurface();
    this.rays = null; this.snow = null; this.bubbles = null;
    this._bindPointer();
    window.addEventListener('resize', () => this.resize());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
    this.resize();
  }

  /* ----- caustiques animées rendues dans une petite texture répétable ----- */
  _initCaustics() {
    this.cRT = new T.WebGLRenderTarget(512, 512, { depthBuffer: false, type: T.UnsignedByteType });
    this.cRT.texture.wrapS = this.cRT.texture.wrapT = T.RepeatWrapping;
    this.cRT.texture.minFilter = T.LinearFilter; this.cRT.texture.magFilter = T.LinearFilter;
    U.uCaustics.value = this.cRT.texture;
    this.cScene = new T.Scene(); this.cCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.cMat = new T.ShaderMaterial({
      uniforms: { uTime: U.uTime }, depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        varying vec2 vUv; uniform float uTime;
        float layer(vec2 uv, float t){
          const float TAU = 6.28318530718;
          vec2 p = mod(uv * TAU, TAU) - 250.0; vec2 i = p; float c = 1.0; const float inten = 0.005;
          for (int n = 0; n < 5; n++) {
            float tt = t * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
            c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
          }
          c /= 5.0; c = 1.17 - pow(c, 1.4);
          return pow(abs(c), 8.0);
        }
        void main(){
          float t = uTime * 0.42 + 23.0;
          float c = layer(vUv, t) * 0.75 + layer(vUv * 2.0 + 0.37, t * 1.13 + 5.0) * 0.4;
          gl_FragColor = vec4(vec3(clamp(c, 0.0, 1.0)), 1.0);
        }`
    });
    this.cScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), this.cMat));
  }

  /* ----- dôme de fond : dégradé de l'eau ----- */
  _initDome() {
    this.domeU = { uTop: { value: new T.Vector3() }, uBottom: { value: new T.Vector3() }, uMid: { value: new T.Vector3() }, uTime: U.uTime };
    const m = new T.ShaderMaterial({
      uniforms: this.domeU, side: T.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        varying vec3 vP; uniform vec3 uTop, uBottom, uMid; uniform float uTime;
        void main(){
          float h = vP.y;
          vec3 c = mix(uMid, uTop, smoothstep(0.0, 0.55, h));
          c = mix(c, uBottom, smoothstep(0.02, -0.4, h));
          float glow = exp(-pow(max(0.0, 0.75 - h) * 2.2, 2.0)) * (0.5 + 0.5 * smoothstep(0.2, 0.9, h));
          c += uTop * glow * 0.18;
          gl_FragColor = vec4(c, 1.0);
        }`
    });
    this.dome = new T.Mesh(new T.SphereGeometry(140, 32, 20), m);
    this.dome.renderOrder = -10; this.dome.frustumCulled = false;
    this.scene.add(this.dome);
  }

  /* ----- surface de l'eau vue d'en dessous ----- */
  _initSurface() {
    this.surfU = { uCaustics: U.uCaustics, uTime: U.uTime, uDeep: { value: new T.Vector3() }, uBright: { value: new T.Vector3() },
      uFog: U.uFogColorS, uFogD: U.uFogDensity };
    const m = new T.ShaderMaterial({
      uniforms: this.surfU, side: T.DoubleSide, fog: false, toneMapped: false, depthWrite: false,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `
        varying vec3 vW; uniform sampler2D uCaustics; uniform float uTime, uFogD; uniform vec3 uDeep, uBright, uFog;
        void main(){
          vec2 uv = vW.xz * 0.045;
          float a = texture2D(uCaustics, uv + vec2(uTime * 0.012, 0.0)).r;
          float b = texture2D(uCaustics, uv * 0.47 - vec2(0.0, uTime * 0.008)).r;
          float w = clamp(a * 1.1 + b * 0.9, 0.0, 1.0);
          vec3 c = mix(uDeep, uBright, w);
          float d = length(vW - cameraPosition);
          float f = 1.0 - exp(-uFogD * uFogD * d * d * 0.55);
          gl_FragColor = vec4(mix(c, uFog, f), 1.0);
        }`
    });
    const g = new T.PlaneGeometry(220, 160); g.rotateX(Math.PI / 2);
    this.surface = new T.Mesh(g, m); this.surface.position.y = OD.TANK.top; this.surface.renderOrder = -5;
    this.scene.add(this.surface);
  }

  /* ----- rayons de lumière ----- */
  _buildRays() {
    if (this.rays) { this.scene.remove(this.rays); this.rays.geometry.dispose(); this.rays.material.dispose(); this.rays = null; }
    const env = this.env; if (!env || env.rayI <= 0) return;
    const n = Math.round(this.q.rays * (env.rayN || 1)), r = OD.rng(91), pos = [], uv = [], ph = [], idx = [];
    const top = OD.TANK.top + 0.4, spread = env.raySpread || 15, zone = env.rayZone;
    for (let i = 0; i < n; i++) {
      const x = zone ? zone[0] + (r() - 0.5) * zone[2] : (r() - 0.5) * 2 * spread;
      const z = zone ? zone[1] + (r() - 0.5) * zone[3] : -7 + r() * 11;
      const w = 0.7 + r() * 2.4, len = 9 + r() * 4, slant = (env.raySlant !== undefined ? env.raySlant : -0.28) + (r() - 0.5) * 0.12, p = r() * 6.28, b = i * 4;
      pos.push(x - w / 2, top, z, x + w / 2, top, z, x + slant * len - w * 0.8, top - len, z, x + slant * len + w * 0.8, top - len, z);
      uv.push(0, 1, 1, 1, 0, 0, 1, 0); ph.push(p, p, p, p); idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('aPh', new T.Float32BufferAttribute(ph, 1)); g.setIndex(idx);
    const m = new T.ShaderMaterial({
      uniforms: { uTime: U.uTime, uColor: { value: srgbVec(env.rays) }, uI: { value: env.rayI } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false, toneMapped: false,
      vertexShader: `attribute float aPh; varying vec2 vUv; varying float vPh; uniform float uTime;
        void main(){ vUv = uv; vPh = aPh; vec3 p = position; p.x += sin(uTime * 0.23 + aPh) * 0.55 * (1.0 - uv.y) + sin(uTime * 0.11 + aPh * 2.0) * 0.3;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `varying vec2 vUv; varying float vPh; uniform float uTime, uI; uniform vec3 uColor;
        void main(){
          float e = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
          float st = 0.55 + 0.45 * sin(vUv.x * 17.0 + vPh * 3.0 + uTime * 0.35) * sin(vUv.x * 7.0 - uTime * 0.21 + vPh);
          float v = pow(vUv.y, 1.35) * smoothstep(1.0, 0.9, vUv.y);
          float fl = 0.72 + 0.28 * sin(uTime * 0.6 + vPh * 4.0);
          gl_FragColor = vec4(uColor, e * e * st * v * fl * uI);
        }`
    });
    this.rays = new T.Mesh(g, m); this.rays.frustumCulled = false; this.rays.renderOrder = 6;
    this.scene.add(this.rays);
  }

  /* ----- particules en suspension ----- */
  _buildSnow() {
    if (this.snow) { this.scene.remove(this.snow); this.snow.geometry.dispose(); this.snow.material.dispose(); this.snow = null; }
    const env = this.env; if (!env) return;
    const n = Math.round(this.q.snow * (env.snowN || 1)), r = OD.rng(17), pos = new Float32Array(n * 3), sd = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * 34; pos[i * 3 + 1] = r() * 10; pos[i * 3 + 2] = -9 + r() * 20; sd[i * 2] = r(); sd[i * 2 + 1] = r(); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new T.BufferAttribute(sd, 2));
    const m = new T.ShaderMaterial({
      uniforms: { uTime: U.uTime, uCurrent: U.uCurrent, uColor: { value: srgbVec(env.snow || '#ffffff') }, uSize: { value: 1 }, uTwinkle: { value: env.twinkle || 0 }, uA: { value: env.snowA || 0.5 } },
      transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: env.twinkle ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: `attribute vec2 aSeed; uniform float uTime, uSize, uTwinkle; uniform vec2 uCurrent; varying float vA;
        void main(){
          vec3 p = position; float t = uTime;
          p.x = mod(p.x + t * (0.12 + uCurrent.x * 0.5) * (0.5 + aSeed.x) + 17.0, 34.0) - 17.0;
          p.y = mod(p.y - t * 0.035 * (0.4 + aSeed.y) + sin(t * 0.4 + aSeed.x * 40.0) * 0.12, 10.0);
          p.z += sin(t * 0.21 + aSeed.y * 30.0) * 0.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (1.2 + aSeed.x * 2.6) * (9.0 / -mv.z);
          float tw = uTwinkle > 0.0 ? pow(0.5 + 0.5 * sin(t * (0.8 + aSeed.y * 2.0) + aSeed.x * 50.0), 3.0) : 1.0;
          vA = (0.35 + 0.65 * aSeed.y) * tw * smoothstep(1.0, 4.0, -mv.z);
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uA; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.1, d); gl_FragColor = vec4(uColor, a * vA * uA); }`
    });
    this.snow = new T.Points(g, m); this.snow.frustumCulled = false; this.snow.renderOrder = 5;
    this.scene.add(this.snow);
  }

  /* ----- colonnes de bulles ----- */
  _buildBubbles() {
    if (this.bubbles) { this.scene.remove(this.bubbles); this.bubbles.geometry.dispose(); this.bubbles.material.dispose(); this.bubbles = null; }
    const d = this.decor; if (!d || !d.bubbles || !d.bubbles.length) return;
    const per = this.q.bub, n = d.bubbles.length * per, r = OD.rng(5), pos = new Float32Array(n * 3), rnd = new Float32Array(n * 4);
    let k = 0;
    for (const e of d.bubbles) for (let i = 0; i < per; i++, k++) {
      pos[k * 3] = e.x; pos[k * 3 + 1] = e.y; pos[k * 3 + 2] = e.z;
      const burst = Math.floor(r() * 4) / 4;
      rnd[k * 4] = burst + r() * 0.16; rnd[k * 4 + 1] = 0.75 + r() * 0.5; rnd[k * 4 + 2] = 0.35 + r() * r() * 1.5; rnd[k * 4 + 3] = r() * 6.28;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aR', new T.BufferAttribute(rnd, 4));
    const m = new T.ShaderMaterial({
      uniforms: { uTime: U.uTime, uTop: { value: OD.TANK.top }, uSize: { value: 1 }, uColor: { value: srgbVec(this.env.bubble || '#dff6ff') } },
      transparent: true, depthWrite: false, fog: false, toneMapped: false,
      vertexShader: `attribute vec4 aR; uniform float uTime, uTop, uSize; varying float vA;
        void main(){
          vec3 p = position; float life = fract(aR.x + uTime * 0.085 * aR.y);
          float h = uTop - p.y;
          p.y += life * h;
          p.x += sin(life * 22.0 + aR.w) * 0.10 * (0.4 + life) + life * life * 0.5 * sin(aR.w);
          p.z += cos(life * 17.0 + aR.w * 1.7) * 0.10 * (0.4 + life);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * aR.z * (0.55 + life * 0.75) * (62.0 / -mv.z);
          vA = smoothstep(0.0, 0.04, life) * smoothstep(1.0, 0.94, life);
        }`,
      fragmentShader: `uniform vec3 uColor; varying float vA;
        void main(){
          vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
          float rim = smoothstep(0.5, 0.92, r) * smoothstep(1.0, 0.93, r);
          float hl = smoothstep(0.42, 0.0, length(p - vec2(-0.36, -0.38)));
          float lo = smoothstep(0.5, 0.0, length(p - vec2(0.3, 0.42))) * 0.35;
          float a = rim * 0.75 + hl * 0.85 + lo + 0.07;
          gl_FragColor = vec4(uColor * (0.75 + hl * 0.5), a * vA);
        }`
    });
    this.bubbles = new T.Points(g, m); this.bubbles.frustumCulled = false; this.bubbles.renderOrder = 7;
    this.bubbles.visible = this.showBubbles;
    this.scene.add(this.bubbles);
  }

  /* ----- décor ----- */
  setDecor(id) {
    if (this.decor) {
      this.scene.remove(this.decor.group);
      this.decor.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      if (this.decor.lights) this.decor.lights.forEach(l => this.scene.remove(l));
    }
    const d = this.decor = OD.Decors.build(id, this); this._ft.length = 0; this._skipAdapt = 6;
    this.env = d.env;
    this.scene.add(d.group);
    if (d.lights) d.lights.forEach(l => this.scene.add(l));
    this._applyEnv(); this._buildRays(); this._buildSnow(); this._buildBubbles(); this._applyShadow();
    this.cam.tyaw = this.cam.yaw = 0; this.cam.tpitch = this.cam.pitch = 0; this.cam.tzoom = this.cam.zoom = 1;
    this.resize();
    this.decorListeners.forEach(f => f(d));
    return d;
  }

  _applyEnv() {
    const e = this.env, L = this.light;
    this.scene.fog.color.set(e.fog); this.scene.fog.density = e.fogD;
    srgbVec(e.fog, U.uFogColorS.value); U.uFogDensity.value = e.fogD;
    srgbVec(e.top, this.domeU.uTop.value); srgbVec(e.bottom, this.domeU.uBottom.value); srgbVec(e.mid || e.fog, this.domeU.uMid.value);
    srgbVec(e.surface[0], this.surfU.uDeep.value); srgbVec(e.surface[1], this.surfU.uBright.value);
    this.hemi.color.set(e.sky); this.hemi.groundColor.set(e.ground); this.hemi.intensity = e.hemiI * (0.55 + 0.45 * L);
    this.sun.color.set(e.sun); this.sun.intensity = e.sunI * L;
    const sd = new T.Vector3().fromArray(e.sunDir || [0.22, 1, 0.3]).normalize();
    this.sun.position.copy(sd).multiplyScalar(40); this.sun.target.position.set(0, 0, 0);
    U.uSunDir.value.copy(sd);
    U.uSunColor.value.set(e.sun).multiplyScalar(e.sunI * L * 0.36);
    U.uAmbSky.value.set(e.sky).multiplyScalar(e.hemiI * (0.55 + 0.45 * L) * 0.42);
    U.uAmbGround.value.set(e.ground).multiplyScalar(e.hemiI * (0.55 + 0.45 * L) * 0.42);
    U.uCausticStrength.value = e.caustic; U.uGlow.value = e.glow || 0; U.uFishGlow.value = e.fishGlow || 0;
    U.uSwayAmp.value = e.sway || 1;
    this.renderer.toneMappingExposure = (e.exposure || 1) * (0.7 + 0.3 * L);
    this.renderer.setClearColor(new T.Color(e.fog), 1);
    if (this.rays) this.rays.material.uniforms.uI.value = e.rayI * (0.5 + 0.5 * L);
  }

  _applyShadow() {
    const on = this.q.shadow > 0 && !(this.env && this.env.noShadow);
    this.renderer.shadowMap.enabled = true;
    this.sun.castShadow = on;
    if (on) {
      const s = this.sun.shadow, c = s.camera, w = (this.decor && this.decor.shadowW) || 17;
      if (s.mapSize.x !== this.q.shadow) { s.mapSize.set(this.q.shadow, this.q.shadow); if (s.map) { s.map.dispose(); s.map = null; } }
      c.left = -w; c.right = w; c.top = 13; c.bottom = -13; c.near = 5; c.far = 80; c.updateProjectionMatrix();
    }
  }

  setLight(v) { this.light = v; if (this.env) this._applyEnv(); }
  setBubbles(b) { this.showBubbles = b; if (this.bubbles) this.bubbles.visible = b; }
  setQuality(mode) {
    this.qualityMode = mode;
    this._setPreset(mode === 'auto' ? 'high' : mode);
    this.prScale = 1; this._ft.length = 0; this._slow = 0;
  }
  _setPreset(name) {
    if (this.qName === name && this._presetApplied) return;
    this._presetApplied = true; this.qName = name; this.q = QUALITY[name];
    if (this.cRT.width !== this.q.caus) this.cRT.setSize(this.q.caus, this.q.caus);
    if (this.decor) { this._buildRays(); this._buildSnow(); this._buildBubbles(); this._applyShadow(); }
    this.resize();
    if (this.onQuality) this.onQuality(name);
  }

  resize() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const pr = Math.min(window.devicePixelRatio || 1, this.q.pr) * this.prScale;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    const asp = w / h, cam = (this.decor && this.decor.camera) || { fov: 38, pos: [0, 4.2, 14.5], look: [0, 3.8, 0] };
    const minH = Math.tan(T.MathUtils.degToRad(cam.minHalf || 24));
    const vf = Math.max(cam.fov, T.MathUtils.radToDeg(2 * Math.atan(minH / asp)));
    this.camera.fov = Math.min(vf, 78); this.camera.aspect = asp; this.camera.updateProjectionMatrix();
    const dist = Math.hypot(cam.pos[0] - cam.look[0], cam.pos[2] - cam.look[2]);
    const halfW = Math.tan(T.MathUtils.degToRad(this.camera.fov / 2)) * asp * (dist - 1);
    const b = (this.decor && this.decor.bounds) || { x: 10, y0: 0.7, y1: 8.7, z0: -6, z1: 3.8 };
    const bx = Math.min(b.x, Math.max(4.5, halfW + 0.6));
    OD.bounds.x0 = -bx; OD.bounds.x1 = bx; OD.bounds.y0 = b.y0; OD.bounds.y1 = b.y1; OD.bounds.z0 = b.z0; OD.bounds.z1 = b.z1;
    const s = h / 900 * pr;
    if (this.snow) this.snow.material.uniforms.uSize.value = s * 2.1;
    if (this.bubbles) this.bubbles.material.uniforms.uSize.value = s;
    this.viewHalfW = halfW;
  }

  /* ----- caméra : glisser pour regarder, molette / pincement pour zoomer ----- */
  _bindPointer() {
    const el = this.canvas, pts = new Map(); let pinch = 0, lastTap = 0;
    el.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const a = [...pts.values()]; pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
      const now = performance.now();
      if (pts.size === 1 && now - lastTap < 320) { this.cam.tyaw = 0; this.cam.tpitch = 0; this.cam.tzoom = 1; }
      lastTap = now;
      if (this.onTap) this._tapStart = { x: e.clientX, y: e.clientY, t: now };
    });
    el.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 1) {
        this.cam.tyaw = clamp(this.cam.tyaw - dx * 0.0022, -0.42, 0.42);
        this.cam.tpitch = clamp(this.cam.tpitch + dy * 0.0018, -0.12, 0.26);
      } else if (pts.size === 2) {
        const a = [...pts.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        if (pinch > 0) this.cam.tzoom = clamp(this.cam.tzoom * d / pinch, 0.85, 1.7);
        pinch = d;
      }
    });
    const up = e => { pts.delete(e.pointerId); pinch = 0; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    el.addEventListener('wheel', e => { e.preventDefault(); this.cam.tzoom = clamp(this.cam.tzoom * (e.deltaY > 0 ? 0.93 : 1.07), 0.85, 1.7); }, { passive: false });
  }

  _updateCamera(dt) {
    const c = this.cam, d = (this.decor && this.decor.camera) || { pos: [0, 4.2, 14.5], look: [0, 3.8, 0] }, t = this.time;
    const k = 1 - Math.exp(-dt * 4);
    c.yaw += (c.tyaw - c.yaw) * k; c.pitch += (c.tpitch - c.pitch) * k; c.zoom += (c.tzoom - c.zoom) * k;
    const sway = d.sway !== undefined ? d.sway : 0.018;
    const dolly = d.dolly ? Math.sin(t * (d.dollySpeed || 0.035)) * d.dolly : 0;
    const lx = d.look[0] + dolly, ly = d.look[1], lz = d.look[2];
    const ox = d.pos[0] - d.look[0], oy = d.pos[1] - d.look[1], oz = d.pos[2] - d.look[2];
    const len = Math.hypot(ox, oy, oz), yaw0 = Math.atan2(ox, oz), p0 = Math.asin(oy / len);
    const yaw = yaw0 + c.yaw + Math.sin(t * 0.06) * sway + (d.pan ? Math.sin(t * (d.panSpeed || 0.03) + 1.3) * d.pan : 0);
    const pitch = p0 + c.pitch + Math.sin(t * 0.045 + 1) * sway * 0.4;
    const dist = len / c.zoom;
    this.camera.position.set(lx + Math.sin(yaw) * Math.cos(pitch) * dist, ly + Math.sin(pitch) * dist, lz + Math.cos(yaw) * Math.cos(pitch) * dist);
    this.camera.lookAt(lx, ly, lz);
    this.dome.position.copy(this.camera.position);
    this.surface.position.x = this.camera.position.x;
  }

  /* projette un point monde en coordonnées écran (px) */
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, z: p.z };
  }

  /* rendu hors écran d'un objet 3D vers un canvas 2D (vignettes des invertébrés) */
  snapshot(obj, w, h, view) {
    const S = 2, W = w * S, H = h * S, r = this.renderer;
    const rt = new T.WebGLRenderTarget(W, H, { type: T.UnsignedByteType });
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight(0xdff3ff, 0x2a4660, 2.4));
    const dl = new T.DirectionalLight(0xffffff, 2.6); dl.position.set(2.5, 6, 5); sc.add(dl);
    sc.add(obj); obj.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(obj), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    const cam = new T.PerspectiveCamera(26, W / H, 0.05, 100);
    const dir = new T.Vector3().fromArray(view || [0.35, 0.42, 1]).normalize();
    const rad = Math.max(size.x / (W / H), size.y, size.z * 0.7) * 0.62 + 0.001;
    cam.position.copy(ctr).addScaledVector(dir, rad / Math.tan(T.MathUtils.degToRad(13)) * 1.08); cam.lookAt(ctr);
    const prevRT = r.getRenderTarget(), prevA = r.getClearAlpha(), prevC = r.getClearColor(new T.Color());
    const gSave = U.uGlow.value, cSave = U.uCausticStrength.value; U.uGlow.value = 0.25; U.uCausticStrength.value = 0.4;
    r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(sc, cam);
    const px = new Uint8Array(W * H * 4); r.readRenderTargetPixels(rt, 0, 0, W, H, px);
    r.setRenderTarget(prevRT); r.setClearColor(prevC, prevA); U.uGlow.value = gSave; U.uCausticStrength.value = cSave;
    sc.remove(obj); rt.dispose();
    const big = document.createElement('canvas'); big.width = W; big.height = H;
    const g = big.getContext('2d'), im = g.createImageData(W, H), lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) { const v = i / 255; lut[i] = Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const s = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 4;
      im.data[d] = lut[px[s]]; im.data[d + 1] = lut[px[s + 1]]; im.data[d + 2] = lut[px[s + 2]]; im.data[d + 3] = px[s + 3];
    }
    g.putImageData(im, 0, 0);
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const og = out.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(big, 0, 0, w, h);
    return out;
  }

  /* ----- boucle ----- */
  start() { if (this._running) return; this._running = true; this._last = performance.now(); requestAnimationFrame(t => this._frame(t)); }
  _frame(now) {
    if (!this._running) return;
    requestAnimationFrame(t => this._frame(t));
    const raw = (now - this._last) / 1000; this._last = now;
    const dt = Math.min(Math.max(raw, 0), 0.05), sdt = dt * this.speed;   // au retour d'onglet, le pas reste borné
    this.time += sdt; U.uTime.value = this.time % 21600;     // repli toutes les 6 h : garde la précision des shaders sur de très longues durées
    const e = this.env, cs = (e && e.current) || 0.4, t = this.time;
    U.uCurrent.value.set(cs * (0.75 + 0.25 * Math.sin(t * 0.09)), cs * 0.35 * Math.sin(t * 0.063 + 2));
    if (e) {     // respiration très lente de la lumière (nuages qui passent)
      const br = 1 + 0.07 * Math.sin(t * 0.11) + 0.04 * Math.sin(t * 0.37 + 1.7);
      this.sun.intensity = e.sunI * this.light * br;
    }
    for (let i = 0; i < this.updaters.length; i++) this.updaters[i](sdt, t, dt);
    this._updateCamera(dt);
    const r = this.renderer;
    r.setRenderTarget(this.cRT); r.render(this.cScene, this.cCam); r.setRenderTarget(null);
    r.render(this.scene, this.camera);
    if (this._skipAdapt > 0) this._skipAdapt--; else this._adapt(Math.min(raw, 1.5));
    this.frameMs = raw * 1000;
  }

  /* résolution adaptative en mode « auto » pour tenir la fluidité */
  _adapt(raw) {
    if (this.qualityMode !== 'auto') return;
    const f = this._ft; f.push(raw); if (f.length < (raw > 0.09 ? 10 : 50)) return;
    let s = 0; for (let i = 0; i < f.length; i++) s += f[i]; const avg = s / f.length; f.length = 0;
    if (avg > 1 / 14 && this.qName !== 'low') { this.prScale = 1; this._slow = 0; this._setPreset(this.qName === 'high' ? 'medium' : 'low'); }      // appareil très lent : on descend d'un cran sans attendre
    else if (avg > 1 / 44) {
      if (this.prScale > 0.72) { this.prScale = Math.max(0.7, this.prScale - 0.12); this.resize(); }
      else if (++this._slow >= 2) { this._slow = 0; if (this.qName === 'high') { this.prScale = 1; this._setPreset('medium'); } else if (this.qName === 'medium') { this.prScale = 1; this._setPreset('low'); } }
    } else if (avg < 1 / 57 && this.prScale < 1) { this.prScale = Math.min(1, this.prScale + 0.06); this.resize(); }
  }
};
})();
