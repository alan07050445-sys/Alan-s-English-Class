/* t-v525 — 萬聖節第二輪（Alan 看完 v524 的七項）
 * ① 泡泡轉場 ② 倒數 ③ hero 更大膽 ④ 滑鼠特效 ⑤ 門口頁 ⑥ 簽到/商店 ⑦ 作答頁
 *
 * ⚠ 這一輪把夜色放進了學生真的在用的頁面（本週卡、門口頁、作答頁），
 *   所以這支測試的重點是**「底翻黑了，字有沒有跟著翻白」**——
 *   漏一個就是黑底黑字，而且 CSS 不會報錯。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data  = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const css   = fs.readFileSync(new URL('styles-holiday-hw.css', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const qm    = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');

/* ⚠ 切片一定要切到**下一個 function** 為止。
   t-lessons 踩過：切到 440 行後的別的元件，結果驗到別人的程式碼。 */
const fnBody = (src, mark) => {
  const a = src.indexOf(mark);
  return a < 0 ? '' : src.slice(a, src.indexOf('\nfunction ', a + 10));
};

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const store = {};
const LS = { getItem: k => (k in store ? store[k] : null),
             setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(
  W, { documentElement: { classList: { toggle: () => {} } } }, stub, LS);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const at = (m, d, h) => new Date(2026, m - 1, d, h === undefined ? 10 : h, 30);

console.log('\n【1】② 倒數距離萬聖節');
ok('⭐ 10/20 下午看到的是 11 天', W.festDaysTo(at(10, 20, 16)) === 11);
ok('⭐⭐ 一天之內不管幾點看，天數都一樣', (() => {
   /* 🔴 直接拿毫秒差除以一天會被「現在幾點」影響：下午四點算出來是 10.x，
      Math.floor 變成 10，但其實還有 11 天。倒數差一天特別明顯，小朋友會自己算。
      → 兩邊都要先歸零到當天 00:00。 */
   const h = [0, 6, 12, 18, 23].map(x => W.festDaysTo(at(10, 22, x)));
   return new Set(h).size === 1 && h[0] === 9; })());
ok('⭐ 10/30 剩 1 天、10/31 是 0 天', W.festDaysTo(at(10, 30)) === 1 && W.festDaysTo(at(10, 31)) === 0);
ok('⭐ 當天不要再寫「還有 0 天」', (() => {
   const t = W.festCountText(at(10, 31));
   return !/0 天/.test(t) && /萬聖節快樂/.test(t); })());
ok('   不是節慶的日子沒有倒數', W.festDaysTo(at(6, 1)) === null && W.festCountText(at(6, 1)) === '');
ok('   國慶那套也能倒數（同一份程式）', W.festDaysTo(at(10, 8)) === 2 && /雙十國慶/.test(W.festCountText(at(10, 8))));
ok('⭐ 天數是 render 當下算的，不是存起來的（跨午夜不會停在昨天）', (() => {
   const i = shell.indexOf('fest-day-wrap');
   return /window\.festDaysTo \? window\.festDaysTo\(\) : null/.test(shell.slice(i, i + 400)); })());
ok('   倒數版與當天版都有（n>0 才倒數）', /fest-day fest-count/.test(shell) && /f\.day/.test(shell));

console.log('\n【2】① 泡泡轉場');
ok('⭐⭐ 一行 JSX 都不用改——泡泡本來就是圓的，只換底圖', (() => {
   /* spawnPageWave 是純 DOM 生成的，改它要小心；這一版刻意只動 CSS。 */
   const i = shell.indexOf('function spawnPageWave');
   return i > 0 && !/fest|hw-/.test(shell.slice(i, i + 1800)); })());
ok('⭐ 紗幕換成夜色', /html\.fest-hw \.pw-veil \{[\s\S]{0,180}#2A1B45/.test(css));
ok('⭐ 泡泡換成南瓜／小鬼／蝙蝠', (() => {
   const i = css.indexOf('html.fest-hw .pwb {');
   const blk = css.slice(i, i + 700);
   return /--hw-jack/.test(blk) && /--hw-ghost/.test(blk) && /--hw-bat/.test(blk); })());
ok('⚠ 泡泡裡原本有字母，換成圖之後要藏起來（不然圖上壓一個咖啡色的字）', (() => {
   const i = css.indexOf('html.fest-hw .pwb {');
   return /color:\s*transparent/.test(css.slice(i, i + 300)); })());
ok('   原本的高光點也要拿掉', /html\.fest-hw \.pwb::after \{ content: none/.test(css));

console.log('\n【3】③⑤ 底翻黑的地方，字有沒有跟著翻白');
/* ⭐ 查法：把 JSX 裡「這張卡/這一頁裡所有會顯示文字的 class」撈出來，
   一個一個問 CSS 有沒有處理——比我自己憑印象列清單可靠（v489~v492 列三次漏三次）。 */
const textClassesIn = (src, startMark, endMark) => {
  const a = src.indexOf(startMark), b = endMark ? src.indexOf(endMark, a) : a + 3000;
  return [...new Set([...src.slice(a, b).matchAll(/className="([a-z0-9 -]+)"/g)]
    .flatMap(m => m[1].split(/\s+/)))];
};
ok('⭐⭐ 本週卡（.wh）裡每一組字都處理過了', (() => {
   const cls = textClassesIn(qm, '<section className="wh"', '今天的任務（v229）');
   /* 只看會顯示文字的（排版用的容器不算） */
   const text = cls.filter(c => /^wh-(title|kick-txt|pill|date|theme-en|meta|empty|done-msg)$/.test(c));
   const missing = text.filter(c => !css.includes('html.fest-hw .' + c));
   if (missing.length) console.log('      沒處理到的：', missing);
   return text.length >= 6 && missing.length === 0; })());
ok('⭐ 進度環三個部位（底環／進度／數字）都換了',
   /\.wh-ring-bg \{ stroke: rgba\(255,255,255/.test(css)
   && /\.wh-ring-fill \{ stroke: var\(--hw-pump\)/.test(css)
   && /\.wh-ring-num b \{ color: var\(--hw-gold\)/.test(css));
ok('⭐ 兩個數字磚的數字與說明都翻白了',
   /\.wh-stat b \{ color: #fff/.test(css) && /\.wh-stat i \{ color: rgba\(255,255,255/.test(css));
ok('⭐⭐ 門口頁（晚安，Eric！）的標題與副標也翻白了',
   /\.grade-sel-title \{ color: #fff/.test(css) && /\.grade-sel-sub,[\s\S]{0,60}color: rgba\(255,255,255/.test(css));
ok('⚠ 門口頁的蝙蝠要換成白色那一版（深色剪影在夜空上等於不見）', (() => {
   const i = css.lastIndexOf('html.fest-hw .grade-selector::after');
   const blk = css.slice(i, i + 700);
   return /var\(--hw-bat\)/.test(blk) && !/var\(--hw-bat-d\)/.test(blk); })());

console.log('\n【4】⑦ 作答頁');
ok('⭐⭐ .page-mission 要連 background-image 一起蓋掉', (() => {
   /* 🔴 跟 v491 的 .page-lobby 同一個坑：它有自己的奶油色 radial+linear 漸層，
      只寫 background-color:transparent 蓋不掉 background-image → 整頁還是奶油色。 */
   const i = css.indexOf('html.fest-hw .page-mission {');
   return i > 0 && /linear-gradient/.test(css.slice(i, i + 300)); })());
ok('⭐ 側欄、返回列、單元列都換了', (() => {
   const need = ['.page-mission .qm-sidebar', '.page-mission .qm-sidebar-back',
                 '.page-mission .qm-sidebar-cat', '.page-mission .qm-unit-row'];
   return need.every(n => css.includes('html.fest-hw ' + n)); })());
ok('⭐⭐ 作答面本身一個字都沒碰（單字卡／題目／選項／短文）', (() => {
   const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
   return !/\.fc-(card|term|ex)|\.qm-question-text|\.qm-option|\.gr-(text|para)|\.cloze-passage|\.circle-prose\b/.test(body); })());

console.log('\n【5】⑥ 簽到／商店');
ok('⭐ 每日簽到的面板、標題、進度條都換了',
   /html\.fest-hw \.ci-panel \{/.test(css) && /html\.fest-hw \.ci-title \{/.test(css)
   && /html\.fest-hw \.ci-rail-line i \{/.test(css));
ok('⭐⭐ 綠色打勾刻意不動——那是「已經領過了」的狀態，不是裝飾', (() => {
   const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
   return !/\.ci-cell\.(on|done)|\.ci-cell\s*\{/.test(body); })());
ok('⭐ 商店的標頭換成南瓜橘', /html\.fest-hw \.sp-head \{[\s\S]{0,140}245,124,31/.test(css));

console.log('\n【6】④ 滑鼠特效不可以幫倒忙');
ok('⭐⭐ 用「移動距離」節流，不是用時間', (() => {
   /* ⚠ 慢慢移動時，時間節流照樣每隔幾毫秒噴一個，但視覺上根本沒移動
      → 在原地疊成一坨。距離節流才對。 */
   return /Math\.hypot\(x - last\[0\], y - last\[1\]\) < \d+\) return;/.test(fnBody(shell, 'function useFestCursor')); })());
ok('⭐ 不走 React state（每秒幾十次的事件，進 state 會讓整個封面重新 render）', (() => {
   const body = fnBody(shell, 'function useFestCursor');
   return /document\.createElement/.test(body) && !/useState/.test(body); })());
ok('   計時器與節點都有收乾淨（不然換頁後還在飄）', (() => {
   const i = shell.indexOf('function useFestCursor');
   const body = fnBody(shell, 'function useFestCursor');
   return /timers\.forEach\(clearTimeout\)/.test(body) && /removeEventListener/.test(body); })());

console.log(fail ? `\n❌ t-v525：${pass} 過 / ${fail} 失敗` : `\n✅ t-v525：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
