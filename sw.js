// sw.js — Service Worker for Alan's English Class PWA
const CACHE = 'alans-english-v263';
const SW_PATH = new URL(self.location.href).pathname;
const BASE = SW_PATH.includes('/Alan-s-English-Class/') ? '/Alan-s-English-Class' : '';
const asset = path => BASE + path;
const PRECACHE = [
  asset('/'), asset('/index.html'), asset('/manifest.json?v=263'),
  asset('/styles.css?v=263'), asset('/styles-part2.css?v=263'), asset('/styles-quiz.css?v=263'),
  asset('/styles-flashcard.css?v=263'), asset('/styles-auth.css?v=263'), asset('/styles-quiz-mode.css?v=263'),
  asset('/data.js?v=263'), asset('/data-g2.js?v=263'), asset('/data-g4.js?v=263'), asset('/data-g5.js?v=263'), asset('/data-g6.js?v=263'), asset('/data-summer.js?v=263'),
  asset('/components-shell.jsx?v=263'), asset('/components-cat.jsx?v=263'), asset('/components-quiz.jsx?v=263'),
  asset('/components-flashcard.jsx?v=263'), asset('/components-editor.jsx?v=263'),
  asset('/components-quiz-mode.jsx?v=263'), asset('/components-dashboard.jsx?v=263'),
  asset('/components-mistakes.jsx?v=263'), asset('/styles-mistakes.css?v=263'),
  asset('/components-review.jsx?v=263'), asset('/styles-review.css?v=263'), asset('/styles-theme.css?v=263'),
  asset('/components-home.jsx?v=263'), asset('/styles-home.css?v=263'),
  asset('/components-companion.jsx?v=263'), asset('/styles-companion.css?v=263'),
  asset('/components-shop.jsx?v=263'), asset('/components-boss.jsx?v=263'), asset('/components-goals.jsx?v=263'), asset('/styles-goals.css?v=263'), asset('/styles-boss.css?v=263'),
  asset('/tweaks-panel.jsx?v=263'), asset('/app.jsx?v=263'),
  asset('/summer-booking.html'), asset('/summer-booking.css?v=263'), asset('/summer-booking-admin.css?v=263'), asset('/summer-booking.js?v=263'),
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

  // Navigations (index.html) — NETWORK FIRST so a new deploy is never masked by
  // a stale cached page. Falls back to cache only when offline.
  const isNav = e.request.mode === 'navigate' ||
                (e.request.method === 'GET' && e.request.headers.get('accept')?.includes('text/html'));
  if (isNav) {
    e.respondWith(
      fetch(e.request)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(ch => ch.put(e.request, c)); return res; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Versioned assets (?v=N) — cache first is safe because the URL changes on each bump.
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
