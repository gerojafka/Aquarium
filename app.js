/* Ocean Dream — app.js
   Interface : menu, panneaux, bibliothèque et fiches, paramètres, langues, plein écran, sauvegarde, PWA. */
(function () {
'use strict';
const OD = window.OD, $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const KEY = 'oceanDream.v1';
const DEFAULT_SET = { sound: true, ambient: false, volume: 0.6, quality: 'auto', speed: 1, light: 1, bubbles: true };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IC = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>', minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg>'
};

let S, aq, sys, feeding, view = null, detailId = null, cat = 'all', immersive = false, nativeFs = false, wake = null, lastTex = 0;

/* ---------- état et sauvegarde ---------- */
const FIRST = { sea: 'reef', fresh: 'dutch' };
/* deux milieux : « sea » (par défaut) et « fresh » ; le milieu affiché est dans decor/pop, l'autre est gardé dans alt */
function defaults(world) {
  world = world === 'fresh' ? 'fresh' : 'sea'; const other = world === 'sea' ? 'fresh' : 'sea';
  return { v: 1, lang: (navigator.language || 'fr').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en', world: world, decor: FIRST[world], pop: Object.assign({}, OD.DB.starters[world]),
    alt: { decor: FIRST[other], pop: Object.assign({}, OD.DB.starters[other]) }, set: Object.assign({}, DEFAULT_SET) };
}
const RENAMED = { fresh: { harlequin: 'rasbora' } };   /* anciens identifiants des sauvegardes */
function cleanPop(pop, world) { const o = {}, ren = RENAMED[world] || {}; let tot = 0; for (const k in pop) { const id = ren[k] || k, e = OD.DB.byId[id], n = Math.min(pop[k] | 0, e ? e.max : 0, OD.DB.maxTotal - tot); if (e && e.world === world && n > 0 && !o[id]) { o[id] = n; tot += n; } } return o; }
function load() {
  let d = defaults();
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j && j.v === 1) {
      d = defaults(j.world); const w = d.world, o = w === 'sea' ? 'fresh' : 'sea';
      d.lang = j.lang === 'en' ? 'en' : 'fr';
      if (OD.Decors.lists[w].indexOf(j.decor) >= 0) d.decor = j.decor;
      if (j.pop && typeof j.pop === 'object') d.pop = cleanPop(j.pop, w);
      if (j.alt && typeof j.alt === 'object') { if (OD.Decors.lists[o].indexOf(j.alt.decor) >= 0) d.alt.decor = j.alt.decor; if (j.alt.pop && typeof j.alt.pop === 'object') d.alt.pop = cleanPop(j.alt.pop, o); }
      if (j.set) for (const k in DEFAULT_SET) if (typeof j.set[k] === typeof DEFAULT_SET[k]) d.set[k] = j.set[k];
    }
  } catch (e) { /* stockage indisponible : valeurs par défaut */ }
  return d;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* navigation privée */ } }
const L = () => OD.I18N[S.lang];
const entry = id => OD.DB.byId[id];
const nameOf = id => entry(id)[S.lang].name;
const total = () => Object.keys(S.pop).reduce((a, k) => a + S.pop[k], 0);
const decorName = id => L().decor[id][0];

/* ---------- vignettes ---------- */
const thumbs = {};
function thumb(id, w, h) {
  const k = id + ':' + w;
  if (!thumbs[k]) thumbs[k] = OD.FISH_MODELS[id] ? OD.FishArt.thumb(id, w, h, { dpr: Math.min(2, window.devicePixelRatio || 1) }) : OD.Inverts.thumb(id, aq, w, h);
  return thumbs[k];
}
let thumbQueue = [], thumbBusy = false;
function lazyThumb(holder, id, w, h) {
  const k = id + ':' + w; if (thumbs[k]) { holder.appendChild(thumbs[k]); return; }
  thumbQueue.push([holder, id, w, h]); if (thumbBusy) return; thumbBusy = true;
  const step = () => { let n = 0; while (thumbQueue.length && n < 3) { const q = thumbQueue.shift(); if (q[0].isConnected) { try { q[0].appendChild(thumb(q[1], q[2], q[3])); } catch (e) { console.error(e); } n++; } } if (thumbQueue.length) setTimeout(step, 16); else thumbBusy = false; };
  setTimeout(step, 30);
}

/* ---------- messages ---------- */
function toast(msg) {
  const box = $('#toasts'), t = el('div', 'toast'); t.textContent = msg; box.appendChild(t);
  while (box.children.length > 2) box.removeChild(box.firstChild);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 2600);
}
let hintT = 0;
function hint(msg, ms) { const h = $('#hint'); h.textContent = msg; h.classList.add('on'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove('on'), ms || 3600); }

/* ---------- population ---------- */
function setPop(id, n, quiet) {
  const e = entry(id), cur = S.pop[id] || 0; n = Math.max(0, n | 0);
  if (n > e.max) { toast(L().tMax(e.max, nameOf(id))); n = e.max; }
  if (n > cur && total() - cur + n > OD.DB.maxTotal) { toast(L().tFull(OD.DB.maxTotal)); n = Math.max(cur, OD.DB.maxTotal - (total() - cur)); }
  if (n === cur) return cur;
  if (n > 0) S.pop[id] = n; else delete S.pop[id];
  sys.setPopulation(S.pop, false); save();
  if (!quiet) toast(n > cur ? L().tAdded(n - cur, nameOf(id)) : (n === 0 ? L().tRemoved(nameOf(id)) : nameOf(id) + ' : ' + n));
  return n;
}

/* ---------- panneaux ---------- */
function stepper(val, min, max, onChange) {
  const s = el('div', 'stepper'), a = el('button', '', IC.minus), o = el('output', '', String(val)), b = el('button', '', IC.plus);
  a.type = b.type = 'button'; a.setAttribute('aria-label', L().less); b.setAttribute('aria-label', L().more);
  const upd = v => { val = v; o.textContent = v; a.disabled = v <= min; b.disabled = v >= max; };
  a.onclick = () => { const r = onChange(val - 1); upd(r === undefined ? val - 1 : r); }; b.onclick = () => { const r = onChange(val + 1); upd(r === undefined ? val + 1 : r); };
  s.append(a, o, b); upd(val); return s;
}
function swatch(id) { const c = OD.Decors.swatch(id); return 'linear-gradient(172deg,' + c[0] + ' 0%,' + c[1] + ' 52%,' + c[2] + ' 100%)'; }
const preview = id => 'url("assets/backgrounds/' + id + '.jpg")';

/* choix du milieu : eau de mer ou eau douce */
function worldSeg(body) {
  const T = L(), r = el('div', 'set world-row', '<div class="lbl"><b>' + esc(T.worldTitle) + '</b></div>'), seg = el('div', 'seg');
  [['sea', T.worldSea], ['fresh', T.worldFresh]].forEach(q => { const b = el('button', S.world === q[0] ? 'on' : '', q[1]); b.type = 'button'; b.dataset.world = q[0]; b.onclick = () => setWorld(q[0]); seg.appendChild(b); });
  r.appendChild(seg); body.appendChild(r);
}
function setWorld(w) {
  if (w === S.world || changing) return; changing = true; const veil = $('#veil'); veil.classList.add('on');
  setTimeout(() => {
    const cur = { decor: S.decor, pop: S.pop }; S.world = w; S.decor = S.alt.decor; S.pop = S.alt.pop; S.alt = cur; cat = 'all'; detailId = null; scrollKeep = 0; save();
    aq.setDecor(S.decor); sys.setPopulation(S.pop, true); applyStatic(); if (view) render();
    setTimeout(() => { veil.classList.remove('on'); changing = false; toast(w === 'sea' ? L().worldSea : L().worldFresh); }, 300);
  }, 580);
}

function renderAquarium(body, foot) {
  const T = L(), ids = Object.keys(S.pop); worldSeg(body);
  const d = el('div', 'aq-decor', '<div class="swatch" style=\'background-image:' + preview(S.decor) + ',' + swatch(S.decor) + '\'></div><div class="txt"><small>' + T.aqDecor + '</small><strong>' + esc(decorName(S.decor)) + '</strong></div>');
  const ch = el('button', 'btn', T.aqChange); ch.type = 'button'; ch.onclick = () => open('decors'); d.appendChild(ch); body.appendChild(d);
  const lead = el('p', 'lead'); lead.textContent = T.aqCount(total()); body.appendChild(lead);
  if (!ids.length) body.appendChild(el('p', 'empty', esc(T.aqEmpty)));
  else {
    const ul = el('ul', 'aq-list');
    OD.DB.list.forEach(e => { if (!S.pop[e.id]) return;
      const li = el('li'), th = el('div', 'th'), nm = el('div', 'nm', '<b>' + esc(e[S.lang].name) + '</b><i>' + esc(e.sci) + '</i>');
      lazyThumb(th, e.id, 156, 104); th.onclick = nm.onclick = () => { view = 'fish'; detailId = e.id; render(); };
      li.append(th, nm, stepper(S.pop[e.id], 0, e.max, v => { const r = setPop(e.id, v, true); lead.textContent = T.aqCount(total()); if (r === 0) { li.remove(); if (!total()) render(); } return r; }));
      ul.appendChild(li); });
    body.appendChild(ul);
  }
  const row = el('div', 'row'), add = el('button', 'btn primary', T.aqAdd), clr = el('button', 'btn danger', T.aqClear);
  add.type = clr.type = 'button'; add.onclick = () => open('fish');
  clr.onclick = () => { if (!clr.classList.contains('armed')) { clr.classList.add('armed'); clr.textContent = T.aqClearConfirm; setTimeout(() => { clr.classList.remove('armed'); clr.textContent = T.aqClear; }, 3500); return; }
    S.pop = {}; sys.setPopulation(S.pop); save(); toast(T.tCleared); render(); };
  row.appendChild(add); if (ids.length) row.appendChild(clr); foot.appendChild(row); foot.hidden = false;
}

function renderDecors(body) {
  const T = L(), g = el('div', 'decor-grid'); worldSeg(body);
  OD.Decors.lists[S.world].forEach(id => {
    const c = el('button', 'decor-card' + (id === S.decor ? ' on' : ''), '<i class="tick">' + IC.check + '</i><b>' + esc(T.decor[id][0]) + '</b><span>' + esc(T.decor[id][1]) + '</span>');
    c.type = 'button'; c.style.setProperty('--sw', swatch(id)); c.style.setProperty('--img', preview(id)); c.setAttribute('aria-pressed', id === S.decor); c.onclick = () => changeDecor(id); g.appendChild(c);
  });
  body.appendChild(g);
}

function renderFish(body) {
  const T = L(), labels = { all: T.catAll, clown: T.catClown, tang: T.catTang, angel: T.catAngel, other: T.catOther, invert: T.catInvert,
    tetra: T.catTetra, live: T.catLive, laby: T.catLaby, cichlid: T.catCichlid, carp: T.catCarp, bottom: T.catBottom, finvert: T.catInvert };
  const chips = el('div', 'chips');
  OD.DB.catsBy[S.world].forEach(c => { const b = el('button', 'chip' + (c === cat ? ' on' : ''), labels[c]); b.type = 'button'; b.onclick = () => { cat = c; render(); }; chips.appendChild(b); });
  body.appendChild(chips);
  const g = el('div', 'fish-grid');
  OD.DB.list.forEach(e => { if (e.world !== S.world || (cat !== 'all' && e.cat !== cat)) return;
    const c = el('button', 'fish-card'), th = el('div', 'th'); c.type = 'button'; lazyThumb(th, e.id, 156, 104); c.appendChild(th);
    const b = el('b'); b.textContent = e[S.lang].name; c.appendChild(b);
    if (S.pop[e.id]) { const bd = el('span', 'badge'); bd.textContent = S.pop[e.id]; c.appendChild(bd); }
    c.onclick = () => { detailId = e.id; scrollKeep = body.scrollTop; render(); }; g.appendChild(c); });
  body.appendChild(g);
}
let scrollKeep = 0;

function renderDetail(body, foot, id) {
  const T = L(), e = entry(id), d = e[S.lang], other = e[S.lang === 'fr' ? 'en' : 'fr'].name, cur = S.pop[id] || 0;
  const plate = el('div', 'plate'); plate.appendChild(thumb(id, 460, 290)); body.appendChild(plate);
  const h = el('h3', 'sp-name'); h.textContent = d.name; body.appendChild(h);
  const sci = el('p', 'sp-sci'); sci.textContent = e.sci; body.appendChild(sci);
  const st = el('p', 'sp-status'); st.textContent = cur ? T.inTank(cur) : T.notInTank; body.appendChild(st);
  if (cur) { const rm = el('button', 'btn danger', T.removeAll); rm.type = 'button'; rm.style.marginTop = '10px'; rm.onclick = () => { setPop(id, 0); render(); }; body.appendChild(rm); }
  const dots = '<span class="dots">' + [1, 2, 3, 4, 5].map(i => '<i' + (i <= e.diff ? ' class="on"' : '') + '></i>').join('') + '</span>' + esc(T.diff[e.diff]);
  const F = (label, value, o) => '<div class="f' + (o && o.long ? ' long' : '') + '"><dt>' + esc(label) + '</dt><dd' + (o && o.sci ? ' class="sci"' : '') + '>' + (o && o.raw ? value : esc(value)) + '</dd></div>';
  const fm = OD.fmt, sheet = el('div', 'sheet');
  sheet.innerHTML =
    '<h3>' + T.secIdentity + '</h3><dl>' + F(T.fOtherName, other) + F(T.fSci, e.sci, { sci: true }) + F(T.fFamily, d.family) + F(T.fSize, d.size) + F(T.fLife, d.life) + F(T.fOrigin, d.origin, { long: true }) + '</dl>' +
    '<h3>' + T.secLife + '</h3><dl>' + F(T.fZone, d.zone, { long: true }) + F(T.fBehavior, d.behavior, { long: true }) + F(T.fDiet, d.diet) + F(T.fCompat, d.compat, { long: true }) + F(T.fNotes, d.notes, { long: true }) + '</dl>' +
    '<h3>' + T.secCare + '</h3><dl>' + F(T.fDiff, dots, { raw: true }) + F(T.fVol, fm.vol(e.vol, S.lang)) + F(T.fTemp, fm.temp(e.temp, S.lang)) + F(T.fPh, fm.ph(e.ph, S.lang)) + (e.gh ? F(T.fGh, fm.gh(e.gh, S.lang)) : F(T.fSal, fm.sal(e.sal, S.lang))) + F(T.fFeeding, d.feeding, { long: true }) + '</dl>';
  body.appendChild(sheet);
  const room = Math.min(e.max - cur, OD.DB.maxTotal - total()); let qty = Math.max(1, Math.min(room, 1));
  const bar = el('div', 'add-bar'), add = el('button', 'btn primary'); add.type = 'button';
  const label = () => { add.textContent = T.addN(qty); };
  if (room > 1) bar.appendChild(stepper(1, 1, room, v => { qty = v; label(); }));
  add.disabled = room <= 0; label();
  add.onclick = () => { const go = () => { setPop(id, cur + qty); render(); }, risks = cur ? [] : OD.Compat.check(id, S.pop, S.lang);
    if (risks.length) compatAlert(foot, risks, go, render); else go(); };
  bar.appendChild(add); foot.appendChild(bar);
  const note = el('p', 'add-note'); note.textContent = e.max === 1 ? T.maxOne : T.maxN(e.max); foot.appendChild(note); foot.hidden = false;
}

/* alerte de cohabitation : habitants présents qui posent problème, et pourquoi */
function compatAlert(foot, risks, yes, no) {
  const T = L().compat, box = el('div', 'compat', '<b class="compat-title">' + esc(T.title) + '</b><p>' + esc(T.intro) + '</p>'), ul = el('ul');
  risks.forEach(r => ul.appendChild(el('li', '', '<span class="tag tag-' + r.type + '">' + esc(r.label) + '</span>' + esc(r.text))));
  const row = el('div', 'row'), c = el('button', 'btn', T.cancel), a = el('button', 'btn danger armed', T.anyway); c.type = a.type = 'button'; c.onclick = () => no(); a.onclick = () => yes();
  row.append(c, a); box.append(ul, row); foot.textContent = ''; foot.appendChild(box); foot.hidden = false;
}

function renderSettings(body) {
  const T = L(), st = S.set;
  const sw = (label, hintTxt, key, fn) => { const r = el('div', 'set', '<div class="lbl"><b>' + esc(label) + '</b>' + (hintTxt ? '<small>' + esc(hintTxt) + '</small>' : '') + '</div>'), b = el('button', 'switch');
    b.type = 'button'; b.setAttribute('role', 'switch'); b.setAttribute('aria-label', label); b.setAttribute('aria-checked', st[key]);
    b.onclick = () => { st[key] = !st[key]; b.setAttribute('aria-checked', st[key]); fn(st[key]); save(); }; r.appendChild(b); body.appendChild(r); };
  const slider = (label, key, min, max, step, show, fn) => { const r = el('div', 'set col'), head = el('div', 'head', '<b>' + esc(label) + '</b><span class="val"></span>'), i = el('input');
    i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = st[key]; i.setAttribute('aria-label', label);
    const upd = () => { head.lastChild.textContent = show(+i.value); i.style.setProperty('--p', ((i.value - min) / (max - min) * 100) + '%'); };
    i.oninput = () => { st[key] = +i.value; upd(); fn(st[key]); }; i.onchange = save; upd(); r.append(head, i); body.appendChild(r); };
  sw(T.setSound, T.setSoundHint, 'sound', v => { OD.Audio.setEnabled(v); if (v) OD.Audio.ensure(); });
  sw(T.setAmbient, T.setAmbientHint, 'ambient', v => { if (v) OD.Audio.ensure(); OD.Audio.setAmbient(v); });
  slider(T.setVolume, 'volume', 0, 1, 0.05, v => Math.round(v * 100) + ' %', v => OD.Audio.setVolume(v));
  { const r = el('div', 'set col', '<div class="head"><b>' + esc(T.setQuality) + '</b></div>'), seg = el('div', 'seg');
    [['auto', T.qAuto], ['low', T.qLow], ['medium', T.qMedium], ['high', T.qHigh]].forEach(q => { const b = el('button', st.quality === q[0] ? 'on' : '', q[1]); b.type = 'button';
      b.onclick = () => { st.quality = q[0]; aq.setQuality(q[0]); save(); $$('.seg button').forEach(x => x.classList.toggle('on', x === b)); }; seg.appendChild(b); });
    r.appendChild(seg); body.appendChild(r); }
  slider(T.setSpeed, 'speed', 0.25, 2, 0.05, v => '× ' + v.toFixed(2).replace('.', S.lang === 'fr' ? ',' : '.'), v => { aq.speed = v; });
  slider(T.setLight, 'light', 0.4, 1.6, 0.05, v => Math.round(v * 100) + ' %', v => aq.setLight(v));
  sw(T.setBubbles, T.setBubblesHint, 'bubbles', v => aq.setBubbles(v));
  { const r = el('div', 'set', '<div class="lbl"><b>' + esc(T.setLang) + '</b></div>'), seg = el('div', 'seg'); seg.style.width = '132px';
    [['fr', 'FR'], ['en', 'US']].forEach(q => { const b = el('button', S.lang === q[0] ? 'on' : '', q[1]); b.type = 'button'; b.onclick = () => setLang(q[0]); seg.appendChild(b); }); r.appendChild(seg); body.appendChild(r); }
  { const r = el('div', 'set', '<div class="lbl"><b>' + esc(T.setReset) + '</b><small>' + esc(T.setResetHint) + '</small></div>'), b = el('button', 'btn danger', T.setReset.split(' ')[0]); b.type = 'button';
    b.onclick = () => { if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = T.setResetConfirm; setTimeout(() => { if (b.isConnected) { b.classList.remove('armed'); b.textContent = T.setReset.split(' ')[0]; } }, 3500); return; } resetAll(); };
    r.appendChild(b); body.appendChild(r); }
  body.appendChild(el('div', 'note', '<b>' + esc(T.setInstall) + '</b><p>' + esc(T.setInstallText) + '</p>'));
}

function render() {
  const T = L(), body = $('#panelBody'), foot = $('#panelFoot'), back = $('#panelBack');
  body.textContent = ''; foot.textContent = ''; foot.hidden = true; thumbQueue = [];
  const detail = view === 'fish' && detailId; back.hidden = !detail; back.setAttribute('aria-label', T.back); $('#panelClose').setAttribute('aria-label', T.close);
  $('#panelTitle').textContent = view === 'aquarium' ? T.aqTitle : view === 'decors' ? T.decorsTitle : view === 'settings' ? T.setTitle : (detail ? T.navFish : T.fishTitle);
  if (view === 'aquarium') renderAquarium(body, foot); else if (view === 'decors') renderDecors(body); else if (view === 'settings') renderSettings(body);
  else if (detail) renderDetail(body, foot, detailId); else if (view === 'fish') renderFish(body);
  body.scrollTop = (view === 'fish' && !detail) ? scrollKeep : 0;
  $$('#dock button').forEach(b => b.classList.toggle('on', b.dataset.nav === view));
}
function open(v) { if (v !== 'fish') scrollKeep = 0; view = v; detailId = null; render(); const p = $('#panel'); p.classList.add('open'); p.setAttribute('aria-hidden', 'false'); }
function close() { view = null; detailId = null; const p = $('#panel'); p.classList.remove('open'); p.setAttribute('aria-hidden', 'true'); $$('#dock button').forEach(b => b.classList.remove('on')); }

/* ---------- actions ---------- */
let changing = false;
function changeDecor(id) {
  if (id === S.decor || changing) return; changing = true; const veil = $('#veil'); veil.classList.add('on');
  setTimeout(() => {
    aq.setDecor(id); S.decor = id; save(); if (view === 'decors' || view === 'aquarium') render();
    setTimeout(() => { veil.classList.remove('on'); changing = false; toast(decorName(id)); }, 260);
  }, 580);
}
function feed() {
  OD.Audio.ensure();
  if (!sys.fish.length) { toast(L().tFeedEmpty); return; }
  feeding.feed();
}
function resetAll() {
  const lang = S.lang, prevDecor = S.decor; S = defaults(S.world); S.lang = lang; save();
  aq.setQuality(S.set.quality); aq.speed = S.set.speed; aq.setLight(S.set.light); aq.setBubbles(S.set.bubbles);
  OD.Audio.setEnabled(S.set.sound); OD.Audio.setVolume(S.set.volume); OD.Audio.setAmbient(S.set.ambient);
  const apply = () => { sys.setPopulation(S.pop, true); toast(L().tReset); if (view) render(); };
  if (prevDecor !== S.decor) { const veil = $('#veil'); veil.classList.add('on'); setTimeout(() => { aq.setDecor(S.decor); apply(); setTimeout(() => veil.classList.remove('on'), 260); }, 580); } else apply();
}
function setLang(l) {
  if (l === S.lang) return; S.lang = l; save(); applyStatic(); if (view) render();
}
function applyStatic() {
  const T = L(); document.documentElement.lang = S.lang === 'en' ? 'en-US' : 'fr';
  $$('[data-i18n]').forEach(n => { n.textContent = T[n.dataset.i18n]; });
  $('.brand-tag').textContent = S.world === 'fresh' ? T.taglineFresh : T.tagline;
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === S.lang));
  $('#corner').setAttribute('aria-label', T.cornerLabel);
}

/* ---------- plein écran : toute l'interface disparaît ; coin supérieur droit ou Échap pour revenir ---------- */
function wakeOn() { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(w => { wake = w; }).catch(() => {}); }
function wakeOff() { if (wake) { wake.release().catch(() => {}); wake = null; } }
let idleT = 0;
function idle() { document.body.classList.remove('idle'); clearTimeout(idleT); if (immersive) idleT = setTimeout(() => document.body.classList.add('idle'), 2500); }
function enterImmersive() {
  if (immersive) return; immersive = true; close(); document.body.classList.add('immersive');
  const d = document.documentElement, req = d.requestFullscreen || d.webkitRequestFullscreen; nativeFs = false;
  if (req && !(navigator.standalone)) { try { const p = req.call(d); nativeFs = true; if (p && p.catch) p.catch(() => { nativeFs = false; }); } catch (e) { nativeFs = false; } }
  hint(window.matchMedia('(pointer: fine)').matches ? L().hintCornerKey : L().hintCorner, 4200); wakeOn(); idle();
}
function exitImmersive() {
  if (!immersive) return; immersive = false; document.body.classList.remove('immersive', 'idle'); clearTimeout(idleT); $('#hint').classList.remove('on'); wakeOff();
  const fe = document.fullscreenElement || document.webkitFullscreenElement, ex = document.exitFullscreen || document.webkitExitFullscreen;
  if (fe && ex) { try { const p = ex.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) { /* déjà sorti */ } }
  nativeFs = false;
}

/* ---------- liaisons ---------- */
function bind() {
  $$('#dock button').forEach(b => { b.onclick = () => { const n = b.dataset.nav; OD.Audio.ensure();
    if (n === 'feed') feed(); else if (n === 'fullscreen') enterImmersive(); else if (view === n && !(n === 'fish' && detailId)) close(); else open(n); }; });
  $$('.lang button').forEach(b => { b.onclick = () => setLang(b.dataset.lang); });
  $('#panelClose').onclick = close;
  $('#panelBack').onclick = () => { detailId = null; render(); };
  const corner = $('#corner'); corner.addEventListener('pointerdown', e => { e.preventDefault(); exitImmersive(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (immersive) exitImmersive(); else if (view === 'fish' && detailId) { detailId = null; render(); } else if (view) close(); }
    else if (e.target && e.target.tagName === 'INPUT') return;
    else if (e.key === 'f' || e.key === 'F') { immersive ? exitImmersive() : enterImmersive(); }
    else if (e.key === 'n' || e.key === 'N') feed();
  });
  const fsChange = () => { if (immersive && nativeFs && !(document.fullscreenElement || document.webkitFullscreenElement)) exitImmersive(); };
  document.addEventListener('fullscreenchange', fsChange); document.addEventListener('webkitfullscreenchange', fsChange);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && immersive) wakeOn(); });
  ['pointermove', 'pointerdown'].forEach(ev => window.addEventListener(ev, idle, { passive: true }));
  /* un simple toucher sur l'aquarium referme le panneau ouvert */
  const cv = $('#scene'); let down = null;
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; OD.Audio.ensure(); });
  cv.addEventListener('pointerup', e => { if (down && view && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7) close(); down = null; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
}

/* ---------- démarrage progressif ---------- */
const nextFrame = () => new Promise(r => { let done = false; const f = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(f); setTimeout(f, 80); });
function progress(p, txt) { $('#loaderFill').style.width = Math.round(p * 100) + '%'; if (txt) $('#loaderText').textContent = txt; }

async function boot() {
  S = load(); applyStatic(); progress(0.06, L().loading); await nextFrame();
  try { aq = new OD.Aquarium($('#scene')); } catch (e) { console.error(e); $('#loaderText').textContent = L().noWebgl; return; }
  aq.setQuality(S.set.quality); aq.speed = S.set.speed; aq.light = S.set.light; aq.showBubbles = S.set.bubbles;
  progress(0.16); await nextFrame();
  aq.setDecor(S.decor); progress(0.42, L().loadingFish); await nextFrame();
  sys = new OD.FishSystem(aq); lastTex = aq.q.tex;
  const ids = Object.keys(S.pop);
  for (let i = 0; i < ids.length; i++) { for (let k = 0; k < S.pop[ids[i]]; k++) sys.add(ids[i], true); progress(0.42 + 0.5 * (i + 1) / ids.length); await nextFrame(); }
  feeding = new OD.Feeding(aq, sys); feeding.onState = b => $('#dock button.feed').classList.toggle('busy', b);
  aq.onQuality = () => { if (lastTex !== aq.q.tex) { lastTex = aq.q.tex; sys.refreshTextures(); } };
  OD.Audio.enabled = S.set.sound; OD.Audio.volume = S.set.volume; OD.Audio.ambientOn = S.set.ambient;
  bind(); aq.start(); progress(1); await nextFrame();
  setTimeout(() => { $('#loader').classList.add('done'); document.body.classList.remove('booting'); }, 420);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
  OD.app = { get state() { return S; }, aq: aq, sys: sys, feeding: feeding, open: open, close: close, setPop: setPop, changeDecor: changeDecor, setWorld: setWorld, feed: feed, enterImmersive: enterImmersive, exitImmersive: exitImmersive, setLang: setLang };
}
document.body.classList.add('booting');
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
