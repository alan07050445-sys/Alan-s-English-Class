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
ok('⭐⭐ 每秒更新但**不重新 render**（走 state 的話整個封面每秒重算一次）', (() => {
   /* ⚠ useFestCursor 把節點直接 append 在同一個容器上、那些不是 React 建的，
      每秒 render 一次是自找麻煩。→ 數字寫進 ref 的 textContent。 */
   const body = fnBody(shell, 'function FestCountdown');
   return /setInterval/.test(body) && /\.current\.textContent =/.test(body)
     && !/setParts|useState\(\{/.test(body); })());
ok('⭐ 倒數結束才換畫面，而且只換一次', (() => {
   const body = fnBody(shell, 'function FestCountdown');
   return /if \(!p\) \{ setOver\(true\); return; \}/.test(body)
     && /if \(over\) return <span className="fest-day">/.test(body); })());
ok('   interval 有收乾淨', /return \(\) => clearInterval\(id\);/.test(fnBody(shell, 'function FestCountdown')));
ok('⭐ 封面與門口頁用的是同一顆倒數鐘（不要各寫一份）',
   (shell.match(/<FestCountdown big\/>/g) || []).length === 2);

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
ok('⭐⭐ v527：作答面也進夜色了，但寫死 #fff 的那些「面」一定要一起處理', (() => {
   /* 🔴 這一條是 v527 真的壞過才加的：`.fc-test-choice` 是寫死 #fff 的選項鈕，
      字色跟著變數翻白 → **白底白字，四個選項整個看不見**。
      Alan 要求整站協調，所以舊的「作答面一個字都不碰」不再成立；
      改成「碰了就要把寫死淺底的那些面一起帶走」。 */
   const need = ['.fc-test-choice', '.fc-written-input', '.cloze-bank-w', '.sa-passage'];
   return need.every(n => css.includes('html.fest-hw ' + n)); })());

console.log('\n【5】⑥ 簽到／商店');
ok('⭐ 每日簽到的面板、標題、進度條都換了',
   /html\.fest-hw \.ci-panel \{/.test(css) && /html\.fest-hw \.ci-title \{/.test(css)
   && /html\.fest-hw \.ci-rail-line i \{/.test(css));
ok('⭐⭐ 綠色打勾的**語意**要留著——v527 底翻黑了，所以改成半透明綠，不是改成主題色', (() => {
   /* 從「不准碰」改成「碰了但意思要留著」：整頁進夜色之後，淺綠底在夜色上是一塊白斑，
      所以底換成 rgba 綠；小朋友仍然靠綠色分辨「哪幾天已經領過」。 */
   const i = css.indexOf('html.fest-hw .ci-cell.done');
   if (i < 0) return false;
   const blk = css.slice(i, i + 160);
   return /rgba\(95,217,143/.test(blk); })());
ok('⭐ 商店的標頭換成南瓜橘', /html\.fest-hw \.sp-head \{[\s\S]{0,140}245,124,31/.test(css));

ok('⭐⭐ 熟悉度那個大數字不可以統一翻白——綠/黃/紅是語意色（好/普通/要加強）', (() => {
   /* ⚠ 抬頭翻成夜色之後很容易順手把所有字寫成 #fff，那就把「這孩子學得好不好」
      這個訊息弄丟了。正解是**同一個色相提亮**：意思保留、在夜色上也讀得動。 */
   const hue = (h) => {
     const [r, g, b] = [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16) / 255);
     const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
     if (mx === mn) return -1;
     let u = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
     u *= 60; return u < 0 ? u + 360 : u;
   };
   const pick = (k) => {
     const m = new RegExp('\\.tlog-avg\\.' + k + ' > b\\s*\\{ color: #([0-9A-Fa-f]{6})').exec(css);
     return m ? hue(m[1]) : -1;
   };
   const hi = pick('hi'), mid = pick('mid'), lo = pick('lo');
   /* 綠 ~90-160、黃橘 ~30-60、紅 ~0-25 或 >340 */
   return hi >= 90 && hi <= 170
     && mid >= 25 && mid <= 60
     && (lo <= 25 || lo >= 340)
     && !/\.tlog-avg > b \{ color: #fff/.test(css); })());
ok('   量尺那一條也照同一套語意色', /\.tlog-avg\.hi \.tlog-bar > div/.test(css)
   && /\.tlog-avg\.lo \.tlog-bar > div/.test(css));
ok('⚠ 今天的任務那隻蝙蝠要跟著文字排，不可以絕對定位', (() => {
   /* .wh 可以放浮在角落的小鬼是因為它有 `.wh > * { z-index: 1 }` 把內容墊高；
      .tt-wrap 沒有那一層，而且清單長度每天都在變——今天沒壓到不代表明天沒有。 */
   const i = css.indexOf('html.fest-hw .tt-title::after');
   if (i < 0) return false;
   const blk = css.slice(i, i + 300);
   return /display: inline-block/.test(blk) && !/position: absolute/.test(blk); })());

console.log('\n【6】④ 滑鼠特效不可以幫倒忙');
ok('⭐⭐ 用「移動距離」節流，不是用時間', (() => {
   /* ⚠ 慢慢移動時，時間節流照樣每隔幾毫秒噴一個，但視覺上根本沒移動
      → 在原地疊成一坨。距離節流才對。 */
   return /Math\.hypot\(x - last\[0\], y - last\[1\]\) < \d+\) return;/.test(fnBody(shell, 'function installFestCursor')); })());
ok('⭐ 不走 React state（每秒幾十次的事件，進 state 會讓整個封面重新 render）', (() => {
   const body = fnBody(shell, 'function installFestCursor');
   return /document\.createElement/.test(body) && !/useState/.test(body); })());
ok('   計時器與節點都有收乾淨（不然換頁後還在飄）', (() => {
   const i = shell.indexOf('function installFestCursor');
   const body = fnBody(shell, 'function installFestCursor');
   /* v528 改成「載入時裝一次」的全域監聽（不再是 hook），
      所以收尾改掛在 pagehide 上——重點沒變：還在飄的節點與計時器都要清掉。 */
   return /timers\.forEach\(clearTimeout\)/.test(body)
     && /pagehide/.test(body) && /\.hw-trail'\)[\s\S]{0,60}remove\(\)/.test(body); })());

console.log(fail ? `\n❌ t-v525：${pass} 過 / ${fail} 失敗` : `\n✅ t-v525：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
