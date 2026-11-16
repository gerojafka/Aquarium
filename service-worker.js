/* Ocean Dream — service-worker.js
   Met l'application en cache au premier chargement pour un fonctionnement hors connexion.
   Changer VERSION à chaque mise à jour des fichiers pour forcer le rafraîchissement du cache. */
const VERSION = 'ocean-dream-v3';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.json',
  'libs/three.min.js', 'translations.js', 'database-fish.js', 'aquarium.js', 'decorations.js', 'scenes.js',
  'fish-models.js', 'fish.js', 'invertebrates.js', 'audio.js', 'feeding.js', 'app.js',
  'freshwater-database.js', 'freshwater-scenes.js', 'freshwater-fish.js', 'compatibility.js',
  'assets/backgrounds/dutch.jpg', 'assets/backgrounds/iwagumi.jpg', 'assets/backgrounds/amazon.jpg', 'assets/backgrounds/stream.jpg', 'assets/backgrounds/malawi.jpg',
  'assets/backgrounds/pond.jpg', 'assets/backgrounds/forest.jpg', 'assets/backgrounds/ruins.jpg', 'assets/backgrounds/moon.jpg', 'assets/backgrounds/riverbank.jpg',
  'assets/fonts/fraunces-latin-wght-normal.woff2', 'assets/fonts/fraunces-latin-wght-italic.woff2', 'assets/fonts/figtree-latin-wght-normal.woff2',
  'assets/backgrounds/reef.jpg', 'assets/backgrounds/lagoon.jpg', 'assets/backgrounds/gbr.jpg', 'assets/backgrounds/garden.jpg', 'assets/backgrounds/wreck.jpg',
  'assets/backgrounds/cave.jpg', 'assets/backgrounds/gorgon.jpg', 'assets/backgrounds/night.jpg', 'assets/backgrounds/zen.jpg', 'assets/backgrounds/panorama.jpg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* cache d'abord, réseau ensuite ; la copie en cache est rafraîchie en arrière-plan quand le réseau répond */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(cache => cache.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit || (req.mode === 'navigate' ? cache.match('index.html') : undefined));
      return hit || net;
    }))
  );
});
