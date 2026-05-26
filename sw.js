// sw.js — Service Worker for Alan's English Class PWA
const CACHE = 'alans-english-v20';
const PRECACHE = [
  '/', '/index.html', '/manifest.json',
  '/styles.css', '/styles-part2.css', '/styles-quiz.css',
  '/styles-flashcard.css', '/styles-auth.css', '/styles-quiz-mode.css',
  '/data.js',
  '/components-shell.jsx', '/components-cat.jsx', '/components-quiz.jsx',
  '/components-flashcard.jsx', '/components-editor.jsx',
  '/components-quiz-mode.jsx', '/components-dashboard.jsx',
  '/tweaks-panel.jsx', '/app.jsx',
  '/icon.svg', '/icon-512.png', '/apple-touch-icon.png',
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
