#!/usr/bin/env node
/* tools/build-jsx.js — v508：把 9 個 .jsx 先轉譯好，別讓瀏覽器每次載入都重做一次。
 *
 * Alan：「有小朋友反應登入頁面跟到第二頁以及第三頁以及有時候轉換畫面還是會卡卡的。」
 *
 * 實測（在真的線上站台上用它自己的 babel.min.js 跑）：
 *   這 9 個檔共 1,290 KB，瀏覽器端轉譯要 10.9 秒的主執行緒時間（Mac）。
 *   v391 已經把它從「預設 preset-env」的 6,050ms 砍到 1,460ms（Node 量的），
 *   但再怎麼調參數，這件事本來就不該在學生的 iPad 上做。
 *
 * 所以改成「提交前先轉譯好」：
 *   · 原始碼還是 .jsx（照改不誤，jsxcheck 也還是跑它們）
 *   · 這支把結果寫到 dist/*.js，index.html 直接載 dist
 *   · @babel/standalone（約 2.8MB）整個從網頁上拿掉
 *   · dist/*.js 是普通的 <script src>，瀏覽器的 preload scanner 一開始就看得到它們
 *     （本來 Babel 要先下載完、執行完才去抓 .jsx，實測從 1,386ms 才開始）
 *
 * ⚠ presets / plugins 必須跟 index.html 以前寫的一模一樣，尤其 transform-block-scoping：
 *   9 個檔是「9 個獨立 script 共用同一個全域範圍」，頂層如果維持 const，
 *   components-quiz.jsx 與 components-quiz-mode.jsx 都宣告的 useQM 會丟
 *   「Identifier 'useQM' has already been declared」整個 app 掛掉。
 *
 * ⚠ 忘了重跑這支 ＝ 線上跑的是舊程式，而且畫面看起來完全正常。
 *   所以 tests/t-dist.mjs 會重算一次並逐字比對，對不上就讓測試紅燈。
 *
 * 用法：node tools/build-jsx.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

/* index.html 的載入順序＝全域變數的建立順序，不可以改 */
const FILES = [
  'components-shell.jsx', 'components-quiz.jsx', 'components-flashcard.jsx',
  'components-editor.jsx', 'components-quiz-mode.jsx', 'components-dashboard.jsx',
  'components-mistakes.jsx', 'app.jsx', 'components-fx.jsx',
];
const OPTS = { presets: ['react'], plugins: ['transform-block-scoping'], sourceMaps: false, compact: false };

function build() {
  const Babel = require(path.join(__dirname, 'babel.min.js'));   // 跟 jsxcheck.js 同一份

  fs.mkdirSync(OUT, { recursive: true });
  const made = [];
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const t0 = Date.now();
    const code = Babel.transform(src, OPTS).code;
    const dest = path.join(OUT, f.replace(/\.jsx$/, '.js'));
    fs.writeFileSync(dest, code);
    made.push({ f, ms: Date.now() - t0, kb: Math.round(code.length / 1024) });
  }
  return made;
}

module.exports = { FILES, OPTS, build };

if (require.main === module) {
  const made = build();
  let ms = 0, kb = 0;
  made.forEach(m => { ms += m.ms; kb += m.kb; console.log(`  ✅ ${m.f.padEnd(26)} ${String(m.ms).padStart(5)}ms  ${m.kb}KB`); });
  console.log(`\n  dist/ 共 ${made.length} 檔、${kb}KB、轉譯 ${ms}ms —— 這 ${ms}ms 以前是每個學生每次載入都要付的。`);
  /* v599：data.js 也順便切成學生那包與老師那包（原始碼不動，見 tools/split-data.js） */
  const sd = require('./split-data').writeDist();
  console.log(`  ✅ data.js ${(sd.srcLen / 1024) | 0}KB → dist/data-core.js ${(sd.core.length / 1024) | 0}KB ＋ dist/data-teacher.js ${(sd.teacher.length / 1024) | 0}KB`);
}
