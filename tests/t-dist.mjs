/* t-dist — v508：dist/*.js 一定要跟 .jsx 對得上
 *
 * v508 把「瀏覽器端即時轉譯」改成「提交前先轉譯好」。好處很大（實測轉譯佔住
 * 主執行緒 10.9 秒 → 0），但多了一個**非常安靜**的失敗模式：
 *   改了 .jsx、忘了重跑 node tools/build-jsx.js
 *   → 線上跑的是舊程式，而且畫面看起來完全正常，測試也全過（測試讀的是 .jsx）。
 *
 * 所以這支在測試裡重算一次，逐字比對。對不上就紅燈，順便告訴你要跑哪一行。
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const { FILES, OPTS } = require(path.join(ROOT, 'tools/build-jsx.js'));
const Babel = require(path.join(ROOT, 'tools/babel.min.js'));

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】每一個 .jsx 都有對得上的 dist/*.js');
let stale = [];
for (const f of FILES) {
  const dest = path.join(ROOT, 'dist', f.replace(/\.jsx$/, '.js'));
  if (!fs.existsSync(dest)) { stale.push(f + '（根本沒有）'); continue; }
  const want = Babel.transform(fs.readFileSync(path.join(ROOT, f), 'utf8'), OPTS).code;
  if (fs.readFileSync(dest, 'utf8') !== want) stale.push(f);
}
ok('⭐⭐ dist 是最新的' + (stale.length ? `　→ 請跑：node tools/build-jsx.js　（過期：${stale.join('、')}）` : ''),
   stale.length === 0);

console.log('\n【2】index.html 真的改吃 dist 了');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const noC = html.replace(/<!--[\s\S]*?-->/g, '');
ok('⭐ 網頁上不再載 @babel/standalone（約 2.8MB，而且會佔住主執行緒）',
   !/babel\.min\.js/.test(noC));
ok('⭐ 沒有任何 <script type="text/babel"> 了', !/text\/babel/.test(noC));
/* v594：老師專用的兩包（editor／dashboard）改成確認是老師才載，所以不在 <script> 標籤裡，
   而是在 loadTeacherBundle() 裡——順序仍是 editor → dashboard（跟以前一樣）。 */
const TEACHER = ['components-editor.jsx', 'components-dashboard.jsx'];
ok('⭐ 九個檔都從 dist 載（學生那七個是普通 script；老師那兩個由 loadTeacherBundle 載）',
   FILES.every(f => noC.includes('dist/' + f.replace(/\.jsx$/, '.js'))));
ok('⭐⭐ 學生那七個的載入順序跟以前一模一樣（共用同一個全域範圍，順序＝全域變數建立順序）', (() => {
   const got = [...noC.matchAll(/<script src="dist\/([^"?]+)\.js/g)].map(m => m[1] + '.jsx');
   return got.join() === FILES.filter(f => !TEACHER.includes(f)).join(); })());
ok('⭐ 老師那兩包照原本的順序一個接一個載（editor → dashboard，async=false）', (() => {
   const a = noC.indexOf("load('dist/components-editor.js"), b = noC.indexOf("load('dist/components-dashboard.js");
   return a > 0 && b > a && /s\.async = false/.test(noC); })());

console.log('\n【3】轉譯參數不可以走鐘');
ok('⭐⭐ 還是有 transform-block-scoping——頂層維持 const 的話，useQM 會重複宣告整個 app 掛掉',
   OPTS.plugins.includes('transform-block-scoping'));
ok('   只做 JSX、不降轉 ES5（v391 量過：react+env 6050ms vs react 1397ms）',
   OPTS.presets.join() === 'react' && !OPTS.presets.includes('env'));
ok('   不要內嵌 sourcemap（那會讓每個檔案大一倍）', OPTS.sourceMaps === false);
ok('⭐ 實際跑出來的 dist 真的沒有頂層 const／let（那是 block-scoping 在做的事）', (() => {
   const js = fs.readFileSync(path.join(ROOT, 'dist/components-quiz.js'), 'utf8');
   return /^var /m.test(js) && !/^const /m.test(js) && !/^let /m.test(js); })());

console.log('\n【4】Service Worker 也要跟著改（不然它會去抓已經不存在的 .jsx）');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
ok('⭐ 預先快取的是 dist/*.js（老師專用那兩包刻意不放——放了就是每個學生都下載一次）', FILES.filter(f => !TEACHER.includes(f)).every(f => sw.includes('/dist/' + f.replace(/\.jsx$/, '.js'))) && !/components-(editor|dashboard)/.test(sw.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')));
ok('   清單裡不再有 .jsx', !/\.jsx\?v=/.test(sw));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
