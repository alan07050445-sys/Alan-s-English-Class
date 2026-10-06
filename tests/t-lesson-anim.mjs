/* t-lesson-anim — v470 互動教學動畫層
 *
 * 動畫最容易壞的方式是「悄悄地沒有」：keyframes 名字打錯一個字母、
 * 或是 CSS 寫了但元素根本不會重新掛載——畫面不會報錯，就是不動
 * （v457 兔子跳躍就是這樣壞的：高度算成 0，整段動畫等於不存在）。
 * 所以這一支把能靜態驗的全部驗掉。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const css = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const qm  = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

/* v471 之後這個檔案又往下長了，所以 v470 那一段要有結尾，
   不然下面「不可以有 position:absolute」會誤判到 v471 的時間軸裝飾線。 */
const all470 = css.slice(css.indexOf('v470：互動教學的動畫層'));
const v470 = all470.slice(0, all470.indexOf('══ v471：三種會動的講解') >= 0
  ? all470.indexOf('══ v471：三種會動的講解') : all470.length);
const v471 = css.slice(css.indexOf('══ v471：三種會動的講解'));
ok('找到 v470 那一段', v470.length > 1000);

console.log('\n【1】每一個用到的 keyframes 都真的定義了（打錯一個字母＝整段沒有）');
const used = [...new Set([...all470.matchAll(/animation:\s*([A-Za-z][\w-]*)/g)].map(m => m[1]))];
const defined = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]));
const missing = used.filter(n => n !== 'none' && !defined.has(n));
ok(`⭐ 用到 ${used.length} 個動畫，都定義得到${missing.length ? '（缺：' + missing.join(', ') + '）' : ''}`,
   used.length >= 10 && missing.length === 0);

console.log('\n【2】每一段 150~300ms（規格第 ① 條：久了小朋友就變成在等動畫）');
const durs = [...all470.matchAll(/animation:\s*[\w-]+\s+\.(\d+)s/g)].map(m => +('0.' + m[1]) * 1000);
const bad = durs.filter(d => d < 150 || d > 300);
ok(`⭐ ${durs.length} 段動畫都在範圍內${bad.length ? '（超出：' + bad.join('、') + 'ms）' : ''}`,
   durs.length >= 10 && bad.length === 0);

console.log('\n【3】不可以蓋住字、也不可以結束在看不見的狀態（規格第 ②③ 條）');
/* ⚠ keyframes 有寫成一行的（@keyframes x { from {…} to {…} }）也有多行的，
   所以不能用 \n} 當結尾——那會漏掉一行式的那幾個。 */
const frames = [...all470.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^}]*\})*)\}/g)];
ok('有抓到 keyframes 內容', frames.length >= 10);
const endsHidden = frames.filter(([, name, body]) => {
  const to = body.match(/(?:to|100%)\s*\{([^}]*)\}/);
  return to && /opacity:\s*0\b/.test(to[1]);
}).map(f => f[1]);
ok(`⭐ 沒有任何一段結束在 opacity:0${endsHidden.length ? '（' + endsHidden.join(', ') + '）' : ''}`,
   endsHidden.length === 0);
ok('沒有用浮層去蓋畫面（position:fixed／absolute 的遮罩）',
   !/position:\s*(fixed|absolute)/.test(v470));
/* v471 的時間軸有一條裝飾線要 absolute，那是「線在圓點後面」不是「浮層蓋住字」。
   真正該擋的是 fixed（會蓋住整個畫面），以及線沒有被壓在圓點下面。 */
ok('v471 沒有用 position:fixed', !/position:\s*fixed/.test(v471));
ok('v471 時間軸的線在圓點後面（不會蓋住字）',
   /\.gnl-tl-rail \{ position: absolute;/.test(v471) && /\.gnl-tl-dot \{ position: relative; z-index: 1;/.test(v471));
ok('螢光筆掃的是背景，字一直看得見（background-size 不是 opacity）',
   /@keyframes gnlSweep \{ from \{ background-size: 0% 100%; \}/.test(v470));

console.log('\n【4】會動暈的小朋友要能關掉（規格第 ④ 條）');
const rm = all470.slice(all470.indexOf('@media (prefers-reduced-motion: reduce)'));
ok('⭐ 有 prefers-reduced-motion 區塊', rm.length > 200);
// 把每一個「掛了動畫的選擇器」都挑出來，逐個確認 reduced-motion 有關到
const animated = [...new Set([...all470.matchAll(/^(\.[^{\n]*?)\s*\{[^}]*animation:\s*[A-Za-z]/gm)]
  .map(m => m[1].trim()).filter(s => !s.startsWith('@')))];
const notCovered = animated.filter(sel => {
  const last = sel.split(/\s+/).pop();            // 後代選擇器只比最後那一節
  return rm.indexOf(last) < 0;
});
ok(`⭐ ${animated.length} 個會動的選擇器都關得掉${notCovered.length ? '（漏：' + notCovered.join(' / ') + '）' : ''}`,
   animated.length >= 9 && notCovered.length === 0);
ok('⭐ 答錯的晃動也一起關（gnlShake 以前從來沒被關過）', /\.gnl-opt\.no/.test(rm) && /\.gnl-word\.no/.test(rm));
ok('關掉動畫時螢光筆要留在「已填滿」（不然字變成沒有底色）',
   /\.gnl-word\.got \{ background-size: 100% 100%; \}/.test(rm));

console.log('\n【5】動畫要真的被觸發——CSS 寫對但元素不重新掛載＝照樣不動');
ok('⭐ 積木的 key 用固定的池子編號，不是陣列位置',
   /<button key=\{picked\[i\]\} className="gnl-tile in"/.test(qm));
ok('   有寫下為什麼（不然下次有人「順手」改回 i）', /整排莫名其妙重播/.test(qm));
ok('⭐ 分一分的字卡帶 key，下一個字才會重新掛載',
   /\? <div key=\{done2\} className=\{'gnl-chip-now'/.test(qm));
ok('   有寫下為什麼', /只換文字的話，CSS 動畫不會重新觸發/.test(qm));

console.log('\n【6】沒有動到任何判斷邏輯（動畫層的意義就在這裡：舊單元直接變動畫版）');
ok('步驟型態還是那六種，沒有新增也沒有拿掉',
   ["'learn'", "'pick'", "'order'", "'tap'", "'sort'", "'fix'"].every(k => qm.includes("cur.kind === " + k)));
/* ⚠ 只比 <link> 的位置。index.html 第 25 行的註解也提到 styles-tune.css，
   直接 indexOf 會抓到註解，量到的順序是假的。 */
const idx = fs.readFileSync(new URL('index.html', ROOT), 'utf8');
const linkAt = (f) => idx.indexOf('<link rel="stylesheet" href="' + f);
ok('styles-tune.css 最後載入，所以蓋得過 styles-quiz-mode.css',
   linkAt('styles-tune.css') > linkAt('styles-quiz-mode.css') && linkAt('styles-quiz-mode.css') > 0);

console.log(`\n${fail ? '❌' : '✅'} t-lesson-anim：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
