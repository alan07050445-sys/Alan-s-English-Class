// sw.js — Service Worker for Alan's English Class PWA
const CACHE = 'alans-english-v104';
const SW_PATH = new URL(self.location.href).pathname;
const BASE = SW_PATH.includes('/Alan-s-English-Class/') ? '/Alan-s-English-Class' : '';
const asset = path => BASE + path;
const PRECACHE = [
  asset('/'), asset('/index.html'), asset('/manifest.json?v=104'),
  asset('/styles.css?v=104'), asset('/styles-part2.css?v=104'), asset('/styles-quiz.css?v=104'),
  asset('/styles-flashcard.css?v=104'), asset('/styles-auth.css?v=104'), asset('/styles-quiz-mode.css?v=104'),
  asset('/data.js?v=104'), asset('/data-g2.js?v=104'), asset('/data-g5.js?v=104'),
  asset('/components-shell.jsx?v=104'), asset('/components-cat.jsx?v=104'), asset('/components-quiz.jsx?v=104'),
  asset('/components-flashcard.jsx?v=104'), asset('/components-editor.jsx?v=104'),
  asset('/components-quiz-mode.jsx?v=104'), asset('/components-dashboard.jsx?v=104'),
  asset('/tweaks-panel.jsx?v=104'), asset('/app.jsx?v=104'),
  asset('/icon.svg'), asset('/icon-512.png'), asset('/apple-touch-icon.png'),
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
