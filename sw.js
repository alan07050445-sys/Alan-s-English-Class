// sw.js — Service Worker for Alan's English Class PWA
//
// 快取分兩層（v392 起）：
//   CACHE  = 跟版本走（html / css / js / jsx / data）——每次 deploy 換名字、舊的整包刪掉。
//   STATIC = 跟版本無關（圖片與 icon）——deploy 不動它，圖片換檔名時才手動把 v1 往上加。
// 為什麼要分：Alan 一個月內從 v375 跳到 v391（16 次 deploy），舊版 activate 會刪掉所有
// key !== CACHE 的快取，等於每次 deploy 都把每個學生的圖片也一起清空重新冷啟動。
// 圖片其實一整年都沒變，沒有理由跟著版本號陪葬。
const CACHE = 'alans-english-v393';
const STATIC = 'alans-static-v1';
const SW_PATH = new URL(self.location.href).pathname;
const BASE = SW_PATH.includes('/Alan-s-English-Class/') ? '/Alan-s-English-Class' : '';
const asset = path => BASE + path;

// 跟版本走的檔案：URL 上都帶 ?v=393，所以 cache-first 是安全的（改版就換 URL）。
const PRECACHE = [
  asset('/'), asset('/index.html'), asset('/manifest.json?v=393'),
  asset('/styles.css?v=393'), asset('/styles-part2.css?v=393'), asset('/styles-quiz.css?v=393'),
  asset('/styles-flashcard.css?v=393'), asset('/styles-auth.css?v=393'), asset('/styles-quiz-mode.css?v=393'),
  asset('/data.js?v=393'), asset('/data-g2.js?v=393'), asset('/data-g4.js?v=393'), asset('/data-g5.js?v=393'), asset('/data-g6.js?v=393'), asset('/data-summer.js?v=393'), asset('/data-grammar.js?v=393'),
  asset('/components-shell.jsx?v=393'), asset('/components-quiz.jsx?v=393'),
  asset('/components-flashcard.jsx?v=393'), asset('/components-editor.jsx?v=393'),
  asset('/components-quiz-mode.jsx?v=393'), asset('/components-dashboard.jsx?v=393'),
  asset('/components-mistakes.jsx?v=393'), asset('/styles-mistakes.css?v=393'),
  asset('/styles-theme.css?v=393'), asset('/styles-home.css?v=393'),
  asset('/app.jsx?v=393'), asset('/components-fx.jsx?v=393'),
  asset('/styles-fx.css?v=393'), asset('/styles-tune.css?v=393'),
  asset('/summer-booking.html'), asset('/summer-booking.css?v=393'), asset('/summer-booking-admin.css?v=393'), asset('/summer-booking.js?v=393'),
];

// 跟版本無關的圖片／icon（合計約 417KB）。原本完全沒進快取，而 GitHub Pages 全站
// cache-control: max-age=600 ＝ 每 10 分鐘就要重抓一次，門口頁與大廳每次都在等圖。
// ⚠ 這些路徑一律不加 ?v=，因為 HTML/JSX 裡就是裸路徑引用，帶了查詢字串會對不上。
const STATIC_PRECACHE = [
  asset('/cards/vocab.jpg'), asset('/cards/grammar.jpg'),
  asset('/cards/word.jpg'), asset('/cards/reading.jpg'),
  asset('/feat-mark.png'), asset('/feat-week.png'), asset('/feat-record.png'),
  asset('/demo-apple.png'),
  asset('/icon-vocab.webp'), asset('/icon-word.webp'),
  asset('/icon-grammar.webp'), asset('/icon-reading.webp'),
  asset('/icon.svg'), asset('/icon-512.png'), asset('/apple-touch-icon.png'),
];

// fetch 時用 pathname 判斷該進哪一層（STATIC_PRECACHE 的字串本身就已經是完整 pathname）。
const STATIC_PATHS = new Set(STATIC_PRECACHE);

// 逐檔 add + 各自 catch。原本是 c.addAll(PRECACHE).catch(() => {})，
// 而 addAll 是「全有全無」：清單裡只要任何一個檔案 404（改名、忘了 deploy、路徑打錯），
// 整批都不會寫進快取，而且外層 .catch 會把錯誤吞掉，完全看不出來。
// 改成逐檔就變成「壞一個只掉一個」，其餘照樣進快取。
const addEach = (cache, list) => Promise.all(list.map(u => cache.add(u).catch(() => {})));

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(Promise.all([
    caches.open(CACHE).then(c => addEach(c, PRECACHE)),
    caches.open(STATIC).then(c => addEach(c, STATIC_PRECACHE)),
  ]));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // 只清掉「舊版的 alans-english-*」，STATIC 與其他 cache 一律留著不動。
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('alans-english-') && k !== CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Pass through Firebase, fonts, CDN requests
  if (url.origin !== location.origin) return;

  // Navigations (index.html) — NETWORK FIRST so a new deploy is never masked by
  // a stale cached page. Falls back to cache only when offline.
  // ⚠ 這段是防止舊頁面卡住新 deploy 的保命符，絕對不可以為了速度改成 cache-first。
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

  // 圖片走 STATIC，其餘（帶 ?v=N 的版本化檔案）維持現況走 CACHE。
  // 兩邊都是 cache first：版本化檔案改版就換 URL 所以安全；圖片換內容時改檔名或升 STATIC 版號。
  const bucket = STATIC_PATHS.has(url.pathname) ? STATIC : CACHE;
  e.respondWith(
    caches.open(bucket).then(c =>
      c.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (e.request.method !== 'GET' || !res.ok) return res;
          c.put(e.request, res.clone());
          return res;
        });
      })
    )
  );
});
