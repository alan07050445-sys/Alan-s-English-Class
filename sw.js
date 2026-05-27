// sw.js — Service Worker for Alan's English Class PWA
const CACHE = 'alans-english-v33';
const BASE = '/Alan-s-English-Class';
const PRECACHE = [
  BASE + '/', BASE + '/index.html', BASE + '/manifest.json',
  BASE + '/styles.css', BASE + '/styles-part2.css', BASE + '/styles-quiz.css',
  BASE + '/styles-flashcard.css', BASE + '/styles-auth.css', BASE + '/styles-quiz-mode.css',
  BASE + '/data.js',
  BASE + '/components-shell.jsx', BASE + '/components-cat.jsx', BASE + '/components-quiz.jsx',
  BASE + '/components-flashcard.jsx', BASE + '/components-editor.jsx',
  BASE + '/components-quiz-mode.jsx', BASE + '/components-dashboard.jsx',
  BASE + '/tweaks-panel.jsx', BASE + '/app.jsx',
  BASE + '/icon.svg', BASE + '/icon-512.png', BASE + '/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Pass through Firebase, fonts, CDN requests
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (e.request.method !== 'GET' || !res.ok) return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
