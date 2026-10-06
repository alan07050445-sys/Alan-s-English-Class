/* jsxcheck — 提交前的關卡。做兩件事：
 *   ① 用跟瀏覽器一模一樣的 Babel 設定轉一次，語法壞掉就擋下來
 *      （⚠ v432b 推過壞掉的 JSX 上線，就是因為沒有把它當成關卡）
 *   ② 🔴 v472 新增：找出「用了但從來沒宣告」的變數
 *      —— 語法完全正確、Babel 也轉得過，但畫面一渲染就 ReferenceError、整個視窗變白。
 *      v462 的 `disabled={planBusy || !sheet}` 就是這樣，整整九個版本沒人發現，
 *      因為 sheet 只存在於另一個 async 函式裡面。
 *
 * ⚠ babel.min.js 跟這支一起放在 repo 裡（不是臨時下載的），
 *   否則換一台電腦、換一個工作階段，這個關卡就等於不存在。
 *   它不在 index.html 也不在 sw.js 裡，所以不會被送給學生。
 *
 * 用法：node tools/jsxcheck.js app.jsx components-*.jsx data.js
 */
const fs = require('fs'), path = require('path');
const Babel = require(path.join(__dirname, 'babel.min.js'));

/* 瀏覽器本來就有、或網站自己掛在 window 上的東西，不算「沒宣告」。 */
const KNOWN = new Set((
  'window document navigator location history screen console setTimeout clearTimeout setInterval clearInterval ' +
  'requestAnimationFrame cancelAnimationFrame queueMicrotask fetch Request Response Headers AbortController ' +
  'URL URLSearchParams Blob File FileReader FormData Image Audio Event CustomEvent MutationObserver ResizeObserver ' +
  'IntersectionObserver localStorage sessionStorage indexedDB crypto performance speechSynthesis ' +
  'SpeechSynthesisUtterance CSS getComputedStyle matchMedia alert confirm prompt structuredClone ' +
  'Object Array String Number Boolean Math JSON Date RegExp Error TypeError RangeError Promise Symbol Map Set ' +
  'WeakMap WeakSet Proxy Reflect Intl parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent ' +
  'encodeURI decodeURI escape unescape globalThis undefined NaN Infinity ArrayBuffer Uint8Array Int32Array ' +
  'Float64Array DataView TextEncoder TextDecoder BigInt atob btoa ' +
  'React ReactDOM firebase Babel module exports require process __dirname ' +
  'caches ServiceWorkerRegistration arguments WebSocket Worker Notification ' +
  'HTMLElement Element Node Text DOMParser XMLHttpRequest MediaRecorder ' +
  'DOMMatrix DOMMatrixReadOnly DOMPoint Path2D OffscreenCanvas ' +
  'self clients skipWaiting registration importScripts'   // service worker 裡的全域
).split(' '));

/* ⚠ 這些檔案是分開的 <script> 但**共用同一個全域作用域**，
   所以 components-shell.jsx 的 function Icon 在 components-editor.jsx 裡是合法的。
   先跑一遍把所有檔案的頂層宣告收齊，再檢查——不然會報出一堆假警報，
   假警報一多就沒有人會理這個關卡，等於沒有。 */
const files = process.argv.slice(2);
const GLOBALS = new Set();
files.forEach(f => {
  const collect = () => ({ visitor: { Program(p) {
    Object.keys(p.scope.bindings).forEach(n => GLOBALS.add(n));
  } } });
  try {
    Babel.transform(fs.readFileSync(f, 'utf8'),
      { presets: ['react'], plugins: ['transform-block-scoping', collect], filename: f });
  } catch (e) { /* 語法錯下面那一輪會報 */ }
});

let bad = 0;

files.forEach(f => {
  const src = fs.readFileSync(f, 'utf8');
  const name = path.basename(f);
  const missing = [];

  /* 找「沒宣告的變數」的外掛：Babel 自己的作用域分析說了算，
     不是用正規式猜——猜會有一堆假警報，沒人會理它。 */
  const scopePlugin = ({ types: t }) => ({
    visitor: {
      ReferencedIdentifier(p) {
        const n = p.node.name;
        if (KNOWN.has(n) || GLOBALS.has(n)) return;
        if (p.scope.hasBinding(n, true)) return;         // true＝連上層作用域一起找
        // JSX 元件名（<Foo/>）與一般變數都走這裡，報出去就對了
        missing.push({ n, line: p.node.loc && p.node.loc.start.line });
      },
    },
  });

  try {
    Babel.transform(src, {
      presets: ['react'], plugins: ['transform-block-scoping', scopePlugin], filename: f,
    });
  } catch (e) {
    bad++; console.log('  ❌ ' + name + '：' + String(e.message).split('\n')[0]);
    return;
  }

  if (!missing.length) { console.log('  ✅ ' + name); return; }
  bad++;
  // 同一個名字只報第一次，不然一個變數會洗出幾十行
  const seen = new Set();
  console.log('  ❌ ' + name + '：用了但從來沒宣告的變數（畫面一渲染就 ReferenceError）');
  missing.forEach(m => { if (seen.has(m.n)) return; seen.add(m.n);
    console.log(`       ${name}:${m.line}  ${m.n}`); });
});

if (bad) console.log(`\n❌ ${bad} 個檔案有問題`);
process.exit(bad ? 1 : 0);
