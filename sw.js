// sw.js — Service Worker for Alan's English Class PWA
const CACHE = 'alans-english-v294';
const SW_PATH = new URL(self.location.href).pathname;
const BASE = SW_PATH.includes('/Alan-s-English-Class/') ? '/Alan-s-English-Class' : '';
const asset = path => BASE + path;
const PRECACHE = [
  asset('/'), asset('/index.html'), asset('/manifest.json?v=294'),
  asset('/styles.css?v=294'), asset('/styles-part2.css?v=294'), asset('/styles-quiz.css?v=294'),
  asset('/styles-flashcard.css?v=294'), asset('/styles-auth.css?v=294'), asset('/styles-quiz-mode.css?v=294'),
  asset('/data.js?v=294'), asset('/data-g2.js?v=294'), asset('/data-g4.js?v=294'), asset('/data-g5.js?v=294'), asset('/data-g6.js?v=294'), asset('/data-summer.js?v=294'),
  asset('/components-shell.jsx?v=294'), asset('/components-cat.jsx?v=294'), asset('/components-quiz.jsx?v=294'),
  asset('/components-flashcard.jsx?v=294'), asset('/components-editor.jsx?v=294'),
  asset('/components-quiz-mode.jsx?v=294'), asset('/components-dashboard.jsx?v=294'),
  asset('/components-mistakes.jsx?v=294'), asset('/styles-mistakes.css?v=294'),
  asset('/components-review.jsx?v=294'), asset('/styles-review.css?v=294'), asset('/styles-theme.css?v=294'),
  asset('/components-home.jsx?v=294'), asset('/styles-home.css?v=294'),
  asset('/components-companion.jsx?v=294'), asset('/styles-companion.css?v=294'),
  asset('/components-shop.jsx?v=294'), asset('/components-boss.jsx?v=294'), asset('/components-goals.jsx?v=294'), asset('/styles-goals.css?v=294'), asset('/styles-boss.css?v=294'),
  asset('/tweaks-panel.jsx?v=294'), asset('/app.jsx?v=294'),
  asset('/summer-booking.html'), asset('/summer-booking.css?v=294'), asset('/summer-booking-admin.css?v=294'), asset('/summer-booking.js?v=294'),
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
