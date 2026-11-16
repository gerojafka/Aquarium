/* Ocean Dream — audio.js : sons synthétisés (aucun fichier audio), tous désactivables */
(function () {
'use strict';
const OD = window.OD = window.OD || {};
const A = OD.Audio = {
  ctx: null, master: null, enabled: true, volume: 0.6, ambientOn: false, amb: null, ambTimer: 0,
  /* le contexte audio ne peut démarrer qu'après un geste de l'utilisateur */
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try { this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.enabled ? this.volume : 0; this.master.connect(this.ctx.destination); } catch (e) { return false; }
    if (this.ambientOn) this.startAmbient();
    return true;
  },
  apply() { if (this.master) this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.08); },
  setEnabled(b) { this.enabled = b; this.apply(); },
  setVolume(v) { this.volume = v; this.apply(); },
  noise(sec) { const c = this.ctx, b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.03 * w) / 1.03; d[i] = last * 3.2; } return b; },
  /* petite bulle : glissando sinusoïdal très court */
  bloop(gain, f0) {
    if (!this.enabled || !this.ctx) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); f0 = f0 || 320 + Math.random() * 420;
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 2.1, t + 0.09);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.15);
  },
  /* nourriture qui tombe à la surface : grains de bruit filtré */
  sprinkle(delay) {
    if (!this.enabled || !this.ensure()) return; const c = this.ctx, t0 = c.currentTime + (delay || 0), buf = this.noise(0.08);
    for (let i = 0; i < 26; i++) { const t = t0 + i * 0.05 + Math.random() * 0.04, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; s.playbackRate.value = 1.6 + Math.random() * 2; f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 3200; f.Q.value = 1.2;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 + Math.random() * 0.14, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + 0.09); }
    for (let i = 0; i < 5; i++) setTimeout(() => this.bloop(0.07), (delay || 0) * 1000 + 250 + i * 240 + Math.random() * 120);
  },
  startAmbient() {
    if (this.amb || !this.ctx) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise(4); s.loop = true; f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = 0; g.gain.setTargetAtTime(0.5, c.currentTime, 1.5);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(); this.amb = { s: s, g: g };
    const tick = () => { if (!this.amb) return; if (this.enabled && !document.hidden) this.bloop(0.03 + Math.random() * 0.03, 220 + Math.random() * 500); this.ambTimer = setTimeout(tick, 1400 + Math.random() * 5200); }; tick();
  },
  stopAmbient() { if (!this.amb) return; const a = this.amb; this.amb = null; clearTimeout(this.ambTimer); try { a.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4); a.s.stop(this.ctx.currentTime + 1.5); } catch (e) { /* déjà arrêté */ } },
  setAmbient(b) { this.ambientOn = b; if (b) { if (this.ctx) this.startAmbient(); } else this.stopAmbient(); }
};
})();
