/* Ocean Dream — compatibility.js
   Alerte de cohabitation : au moment d'ajouter une espèce, liste les habitants déjà présents qui posent problème
   et la raison (prédation, agressivité, eau incompatible). Les règles reprennent ce que disent les fiches. */
(function () {
'use strict';
const OD = window.OD;

/* prédateur -> proies : espèces nommées, et poissons jusqu'à maxCm */
const EATS = {
  lionfish: { maxCm: 9, ids: ['cleanershrimp', 'harlequin'] }, hawkfish: { ids: ['cleanershrimp', 'harlequin', 'yellowgoby'] },
  picasso: { ids: ['cleanershrimp', 'harlequin', 'hermit', 'urchin', 'starfish'] }, boxfish: { ids: ['starfish'] }, harlequin: { ids: ['starfish'] },
  scalare: { ids: ['neon', 'cardinal', 'cherryshrimp'] }, clownloach: { ids: ['nerite', 'cherryshrimp'] }, goldfish: { maxCm: 4.5, ids: ['cherryshrimp'] },
  betta: { ids: ['cherryshrimp'] }, discus: { ids: ['cherryshrimp'] }, pearlgourami: { ids: ['cherryshrimp'] }, yellowlab: { ids: ['cherryshrimp'] }
};
const ZEBRASOMA = ['yellowtang', 'sailfin', 'scopas'], DWARF = ['flameangel', 'bicolorangel'], MBUNA = ['yellowlab', 'demasoni'];
const CLOWN = { ocellaris: 1, blackclown: 1, percula: 2, clarkii: 3 };            /* même numéro = même espèce, cohabitation possible */
const PAIRS = [['similar', 'gramma', 'fridmani'], ['laby', 'betta', 'dwarfgourami'], ['laby', 'betta', 'pearlgourami']];
const ONEWAY = [['bully', 'sixline', ['cleaner', 'firefish']], ['bully', 'bluedamsel', ['firefish']],
  ['nip', 'tigerbarb', ['betta', 'scalare', 'guppy', 'dwarfgourami', 'pearlgourami']], ['nip', 'blackskirt', ['betta', 'scalare', 'guppy']],
  ['rival', 'betta', ['guppy']], ['toxin', 'picasso', ['boxfish']]];
const isFish = e => e.cat !== 'invert' && e.cat !== 'finvert';
const gap = (a, b) => Math.max(b[0] - a[1], a[0] - b[1]);                         /* > 0 : les deux plages ne se recouvrent pas */

/* raisons pour lesquelles x (espèce ajoutée) et y (déjà présente) cohabitent mal : [type, clé, sens] */
function pair(x, y) {
  const out = [], add = (type, key, dir) => out.push([type, key, dir || '']);
  const eats = (p, q) => { const r = EATS[p.id]; return !!r && ((r.ids && r.ids.indexOf(q.id) >= 0) || (!!r.maxCm && isFish(q) && q.cm <= r.maxCm)); };
  if (eats(x, y)) add('pred', 'pred', 'a'); if (eats(y, x)) add('pred', 'pred', 'b');
  if (ZEBRASOMA.indexOf(x.id) >= 0 && ZEBRASOMA.indexOf(y.id) >= 0) add('aggr', 'zebrasoma');
  if (CLOWN[x.id] && CLOWN[y.id] && CLOWN[x.id] !== CLOWN[y.id]) add('aggr', 'clowns');
  if (DWARF.indexOf(x.id) >= 0 && DWARF.indexOf(y.id) >= 0) add('aggr', 'dwarf');
  for (const p of PAIRS) if ((p[1] === x.id && p[2] === y.id) || (p[2] === x.id && p[1] === y.id)) add('aggr', p[0]);
  for (const o of ONEWAY) { if (o[1] === x.id && o[2].indexOf(y.id) >= 0) add('aggr', o[0], 'a'); if (o[1] === y.id && o[2].indexOf(x.id) >= 0) add('aggr', o[0], 'b'); }
  if (x.id === 'picasso' && isFish(y) && y.cm <= 10 && y.id !== 'boxfish') add('aggr', 'trigger', 'a');
  if (y.id === 'picasso' && isFish(x) && x.cm <= 10 && x.id !== 'boxfish') add('aggr', 'trigger', 'b');
  const mx = MBUNA.indexOf(x.id) >= 0, my = MBUNA.indexOf(y.id) >= 0;
  if (mx !== my && isFish(x) && isFish(y)) add('aggr', 'mbuna', mx ? 'a' : 'b');
  if (x.gh && y.gh) {                                                              /* eau douce : plages de température, pH et dureté */
    const gt = gap(x.temp, y.temp);
    if (gt >= 1) add('water', 'temp'); if (gap(x.ph, y.ph) >= 0.3) add('water', 'ph'); if (gap(x.gh, y.gh) >= 2) add('water', 'gh');
    const cx = x.id === 'goldfish', cy = y.id === 'goldfish', t = cx ? y : x;
    if (cx !== cy && gt < 1 && isFish(t) && t.temp[1] >= 27) add('water', 'cold', cx ? 'a' : 'b');
  }
  return out;
}

const ORDER = { pred: 0, aggr: 1, water: 2 };
OD.Compat = {
  pair: pair,
  /* id : espèce à ajouter ; pop : { id: nombre } des habitants présents. Renvoie [{ type, label, text }] */
  check(id, pop, lang) {
    const B = OD.DB.byId, T = OD.I18N[lang].compat, f = OD.fmt, x = B[id], groups = {}, keys = [];
    for (const oid in pop) { if (oid === id || !B[oid] || B[oid].world !== x.world) continue;
      for (const r of pair(x, B[oid])) { const k = r.join('|'); if (!groups[k]) { groups[k] = { type: r[0], key: r[1], dir: r[2], ids: [] }; keys.push(k); } groups[k].ids.push(oid); } }
    keys.sort((a, b) => ORDER[groups[a].type] - ORDER[groups[b].type]);
    const range = (e, key) => key === 'temp' ? f.temp(e.temp, lang) : key === 'ph' ? f.ph(e.ph, lang) : f.gh(e.gh, lang);
    return keys.map(k => { const g = groups[k], wr = g.key === 'temp' || g.key === 'ph' || g.key === 'gh';
      const list = g.ids.map(i => B[i][lang].name + (wr ? ' (' + range(B[i], g.key) + ')' : '')).join(', ');
      return { type: g.type, label: T.labels[g.type], text: T[g.key + (g.dir ? '_' + g.dir : '')](x[lang].name, list, wr ? range(x, g.key) : '') }; });
  }
};
})();
