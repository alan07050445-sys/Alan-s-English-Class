/* t-v527 — 🌙 整站翻夜色
 * Alan：「顏色太深了，因為背景都是亮色…整個背景也要跟著變，整體都要協調。」
 * 他是對的：v523~v526 是「深色卡片 ＋ 淺色頁面」＝兩種主題疊在一起。
 *
 * 這一支守的是**翻過去之後有沒有東西變成看不見**——這是深色模式唯一真正的風險，
 * 而且 CSS 一個錯都不會報。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const css  = fs.readFileSync(new URL('styles-holiday-hw.css', ROOT), 'utf8');
const tw   = fs.readFileSync(new URL('styles-holiday.css', ROOT), 'utf8');
const home = fs.readFileSync(new URL('styles-home.css', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const lum = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
};
/* 取 html.fest-hw 根層（第一個 { ... } 區塊群）裡某個變數的值 */
const rootVar = (name) => {
  const re = new RegExp('html\\.fest-hw\\s*\\{[^}]*?' + name + ':\\s*([^;]+);', 's');
  const m = re.exec(css);
  return m ? m[1].trim() : null;
};

console.log('\n【1】變數整組翻過去了（一次蓋掉幾百個地方）');
ok('⭐⭐ 底變暗、字變亮——這是整件事的槓桿', (() => {
   const bg = rootVar('--bg'), ink = rootVar('--ink');
   return bg && ink && lum(bg) < 0.1 && lum(ink) > 0.8; })());
ok('⭐ 卡片面也有自己的階層（不然整頁一片死黑，看不出哪裡是一張卡）', (() => {
   const bg = rootVar('--bg'), card = rootVar('--bg-card');
   return bg && card && lum(card) > lum(bg); })());
ok('   次要文字也要跟著亮（--ink-2 / --ink-3 全站的小字都吃它）',
   ['--ink-2', '--ink-3', '--ink-muted'].every(v => { const x = rootVar(v); return x && lum(x) > 0.3; }));
ok('   邊框換成半透明白（寫死淺灰在夜色上會變成一條亮線）',
   /--border:\s*rgba\(255,255,255/.test(css));

console.log('\n【2】三個頁面底都翻了');
['.page-lobby', '.page-mission', '.grade-selector'].forEach(sel => {
  ok(`⭐ ${sel} 的 background 是暗的`, (() => {
     const i = css.indexOf('html.fest-hw ' + sel + ' {');
     if (i < 0) return false;
     const blk = css.slice(i, css.indexOf('}', i));
     const hex = [...blk.matchAll(/#([0-9A-Fa-f]{6})/g)].map(m => lum(m[1]));
     /* ⚠ 只寫 background-color:transparent 蓋不掉 background-image（v491／v527 各踩一次） */
     return /linear-gradient/.test(blk) && hex.length > 0 && Math.max(...hex) < 0.35; })());
});

console.log('\n【3】🔴 .tt-wrap 這個 class 全站不存在');
ok('⭐⭐ 「今天的任務」真正的 class 是 .tt', /className="tt"/.test(qm) && !/className="tt-wrap"/.test(qm));
ok('⭐⭐ 兩份節慶樣式都不可以再寫 .tt-wrap（寫了等於整張卡一次都沒換過）', (() => {
   /* 🔴 萬聖節與雙十**兩份都中招**，而且活了好幾版沒人發現——
      因為我的對照頁 markup 是自己手打的，打成 .tt-wrap 所以「看起來是對的」。
      ⚠⚠ 對照頁要從 JSX 複製，不要憑印象打。 */
   const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
   return !/\.tt-wrap/.test(strip(css)) && !/\.tt-wrap/.test(strip(tw)); })());
ok('   而且 .tt 真的有被處理', /html\.fest-hw \.tt \{/.test(css) && /html\.fest-1010 \.tt,/.test(tw));

console.log('\n【4】🔴 寫死 #fff 的作答面（白底白字的來源）');
ok('⭐⭐ .fc-test-choice 一定要處理——它壞掉時四個選項整個看不見', (() => {
   const i = css.indexOf('html.fest-hw .fc-test-choice');
   if (i < 0) return false;
   const blk = css.slice(i, css.indexOf('}', i));
   return /background:\s*rgba\(255,255,255,\.0/.test(blk) || /background:\s*rgba\(0,0,0/.test(blk); })());
['.fc-written-input', '.cloze-bank-w', '.sa-passage', '.gr-seg', '.qm-intro-rules']
  .forEach(s => ok(`   ${s} 也處理了`, css.includes('html.fest-hw ' + s)));

console.log('\n【5】⭐⭐ 答對／答錯那一組只能從變數改');
ok('⭐⭐ --ok / --no / --warn 都換成夜色版', (() => {
   /* components-flashcard.jsx 的 .fc-learn-next-row 是 **inline style**
      （`background: var(--ok-bg)`）。inline 贏過任何選擇器 → 寫幾條
      `html.fest-hw .fc-learn-next-row` 都沒有用，只能換變數。 */
   return /--ok-bg:\s*rgba\(95,217,143/.test(css)
       && /--no-bg:\s*rgba\(255,142,120/.test(css)
       && /--warn-bg:\s*rgba\(255,201,92/.test(css); })());
ok('⭐ 語意保留：綠還是綠、紅還是紅（不可以為了過節全部換成主題紫）', (() => {
   const hue = (r, g, b) => {
     const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
     if (mx === mn) return -1;
     let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
     h *= 60; return h < 0 ? h + 360 : h;
   };
   const grab = (name) => { const m = new RegExp(name + ':\\s*rgba\\((\\d+),(\\d+),(\\d+)').exec(css);
     return m ? hue(+m[1], +m[2], +m[3]) : -1; };
   const g = grab('--ok-bg'), r = grab('--no-bg'), w = grab('--warn-bg');
   return g > 100 && g < 170 && (r < 25 || r > 340) && w > 25 && w < 60; })());

console.log('\n【6】狀態色整批轉換（程式撈出來的那 300 多條）');
ok('⭐ 對的是綠、錯的是紅——家族沒有搞混', (() => {
   const of = (sel) => { const i = css.indexOf('html.fest-hw ' + sel + ' {');
     return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
   return /rgba\(95,217,143/.test(of('.qm-option.correct'))
       && /rgba\(255,142,120/.test(of('.qm-option.wrong')); })());
ok('⭐ 這些規則是**撈出來的**不是手列的（數量會在上百條這個量級）',
   (css.match(/^html\.fest-hw \.[a-z][\w.:()\-\s]*\{ background: rgba/gm) || []).length > 150);

console.log('\n【7】老師後台刻意留在亮色');
ok('⭐⭐ .dash-overlay／.modal-backdrop 把顏色變數原樣還原', (() => {
   const i = css.indexOf('html.fest-hw .dash-overlay');
   if (i < 0) return false;
   const blk = css.slice(i, css.indexOf('}', i));
   return /--bg:\s*#F4F0E7/.test(blk) && /--ink:\s*#15130E/.test(blk)
       && /--ok-bg:\s*#EAF3EE/.test(blk); })());
ok('   理由寫在旁邊（學生看不到＋欄位太多＋我沒辦法一頁一頁點完）',
   /學生一個都看不到/.test(css) && /白底白字/.test(css));

console.log('\n【8】手機才出現的東西也要檢查');
ok('⭐⭐ .wh-weeknav 的箭頭鈕要有底色（白底白字，桌機看不到它）', (() => {
   /* ⭐ 教訓：對比度掃描要**每個寬度各跑一次**。這顆鈕在桌機是 display:none，
      所以前面好幾輪掃描一次都沒掃到它。 */
   const i = css.indexOf('html.fest-hw .wh-weeknav button {');
   if (i < 0) return false;
   return /background:\s*rgba\(255,255,255,\.1/.test(css.slice(i, css.indexOf('}', i))); })());
ok('   原本的確是白底（確認這不是我憑空擔心的）', /\.wh-weeknav button\s*\{[^}]*background:\s*#fff/s.test(
   fs.readFileSync(new URL('styles-theme.css', ROOT), 'utf8')));

console.log(fail ? `\n❌ t-v527：${pass} 過 / ${fail} 失敗` : `\n✅ t-v527：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
