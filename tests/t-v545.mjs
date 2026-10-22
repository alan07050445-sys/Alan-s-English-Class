/* t-v545 — ① 萬聖節讓好幾處看不清楚 ② 1/4 2/4 這種要再收成一小組
 *
 * Alan 兩張圖：
 *  圖1 「先複習單字卡」的標題整個看不見。
 *  圖2 上課紀錄的日期（2026/10/24）看不見。
 *  圖3 「如果有題目類型有分 1234 之類的就再分組，不然全部展開也太長」
 *
 * 🔴🔴 圖2 的根因最難找：**沒有任何一條 CSS 把字設成白色**。
 *   `html.fest-hw { color-scheme: dark }` 會讓所有**原生控制項**
 *   （日期、下拉、核取方塊、捲軸）改用瀏覽器的深色版＝白字。
 *   學生那一側是對的，但後台已經被「刻意不進夜色」還原成白底 → 白底白字。
 *   ⭐ 還原顏色變數的地方，就要一起還原 color-scheme——兩者是同一件事。
 *
 * 🔴 圖1 是另一種：v527 自動產生夜色規則時只看得懂 `background-color` 的單色，
 *   **`linear-gradient` 的底一律被跳過**，所以一批淺色漸層卡片沒被換掉，
 *   而它們的字吃 `var(--ink)`（已經翻亮）。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const hw   = fs.readFileSync(new URL('styles-holiday-hw.css', ROOT), 'utf8');
/* ⚠ 比對 CSS 之前要先把註解拿掉（v473 記過的，這是第三次）——
   我寫的說明裡剛好引用了 `{ color-scheme: dark }`，裡面那個 } 會讓
   「切到下一個 }」提早收手，看起來像功能沒做。 */
const hwC  = hw.replace(/\/\*[\s\S]*?\*\//g, '');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const qmcss= fs.readFileSync(new URL('styles-quiz-mode.css', ROOT), 'utf8');
const qmC  = qm.replace(/\/\*[\s\S]*?\*\//g, '');
/* 老師端／學生端各自用到哪些 class——判斷一條規則該不該存在 */
const T = ['components-dashboard.jsx', 'components-editor.jsx']
  .map(f => fs.readFileSync(new URL(f, ROOT), 'utf8'));
const S = ['components-quiz-mode.jsx', 'components-flashcard.jsx', 'components-quiz.jsx',
  'components-shell.jsx', 'components-mistakes.jsx', 'components-fx.jsx', 'app.jsx']
  .map(f => fs.readFileSync(new URL(f, ROOT), 'utf8'));
const usedIn = (src, c) => src.some(s => s.indexOf(c) >= 0);
/* ⚠ `Footer` 定義在 components-editor.jsx，但它是 **app.jsx 畫在學生頁面上**的
   （頁尾的 Email／LINE 按鈕）——只看「定義在哪個檔案」會把它誤判成老師專屬。
   → 直接從程式裡把 Footer 用到的 class 撈出來當學生端。 */
const FOOTER = (() => {
  const src = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
  const i = src.indexOf('function Footer(');
  const body = src.slice(i, src.indexOf('\n}', i));
  return new Set([...body.matchAll(/className="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)));
})();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】⭐⭐ 圖2：原生控制項跟著 color-scheme 走');
ok('⭐⭐ 後台／彈窗把顏色變數還原的同一塊，要一起還原 color-scheme', (() => {
   const i = hwC.indexOf('html.fest-hw .dash-overlay,');
   const blk = hwC.slice(i, hwC.indexOf('}', i));
   return i > 0 && /color-scheme:\s*light/.test(blk) && /--ink:\s*#15130E/.test(blk); })());
ok('   學生那一側還是深色（夜色下的日期/下拉本來就該是白字）',
   /html\.fest-hw\s*\{[^}]*color-scheme:\s*dark/.test(hw.replace(/\n/g, ' ')));

console.log('\n【2】⭐⭐ 萬聖節不可以碰「只有老師看得到」的畫面');
ok('⭐⭐ 自動產生的夜色規則裡，不可以有只在後台／編輯器出現的 class', (() => {
   /* 🔴 本來有 125 條（.ll2-＝上課紀錄、.qs-＝一鍵出單字、.rc-/.gr-/.gq-＝出題視窗…）。
      它們跟下面「老師後台刻意不進夜色」的還原互相打架 → 白底白字。 */
   const bad = [];
   hw.split('\n').forEach(l => {
     const m = l.match(/^html\.fest-hw\s+([^{]+)\{/);
     if (!m) return;
     /* ⚠ 只看第一個 class——`.ll2-avg.hi` 的 `hi` 學生端也有用到，
        拿它判斷會漏掉（我第一版就漏了 25 條）。 */
     const first = (m[1].trim().match(/\.([a-z0-9][a-z0-9_-]*)/i) || [])[1];
     if (!first) return;
     if (FOOTER.has(first)) return;                      // 學生頁面的頁尾
     if (usedIn(T, first) && !usedIn(S, first)) bad.push(m[1].trim());
   });
   if (bad.length) console.log('      還留著：', bad.slice(0, 6).join('  '));
   return bad.length === 0; })());

console.log('\n【3】⭐ 圖1：淺色漸層的底（自動規則掃不到的那一批）');
ok('⭐ 「先複習單字卡」整張卡換成夜色，三段字都指名顏色', (() => {
   return /html\.fest-hw \.qm-fcb \{/.test(hw)
     && /html\.fest-hw \.qm-fcb-text b \{ color: #FFE3A8/.test(hw)
     && /html\.fest-hw \.qm-fcb-text > span/.test(hw)
     && /html\.fest-hw \.qm-fcb-arrow/.test(hw); })());
ok('⭐ 同一批掃出來的其他幾個也補上（參考資料卡／登出頁／裝扮預覽）',
   ['.qm-gres-card', '.app-farewell', '.mx-dress-prev', '.dm-foot', '.grd-img']
     .every(c => hw.indexOf('html.fest-hw ' + c) >= 0));
ok('⚠ 誤報的兩個刻意不動，而且寫明原因（登入封面的漸層是半透明覆蓋層、稿紙橫線）',
   /\.login-screen 與 \.ex-sa textarea 是掃描的誤報/.test(hw));

console.log('\n【4】⭐⭐ 圖3：同一種題型的（1/4）收成一小組');
ok('⭐ 有 qmSubGroups，而且是用**畫面上真的顯示的標籤**判斷', (() => {
   const i = qm.indexOf('function qmSubGroups');
   const body = qm.slice(i, qm.indexOf('\nfunction qmShortLabel', i));
   return i > 0 && /const lab = qmShortLabel\(it, groupName\);/.test(body); })());
/* 直接把函式挖出來跑 */
const fn = (() => {
  const a = qm.indexOf('function qmShortLabel'), b = qm.indexOf('\n}', qm.indexOf('function qmSubGroups'));
  const src = qm.slice(qm.indexOf('function qmSubGroups'), b + 2) + '\n'
            + qm.slice(a, qm.indexOf('\n}', a) + 2);
  return new Function('QM_TYPE_ZH', src + '\nreturn qmSubGroups;')({ quiz: '測驗', cloze: '短文填空' });
})();
const G = '期中考單字總複習';
const mk = (t, title) => ({ type: t, title });
ok('⭐⭐ 測驗（1/4）~（4/4）收成一組、字義選擇（1/5）~（5/5）另一組', (() => {
   const list = [mk('flashcard', G)]
     .concat([1, 2, 3, 4].map(i => mk('quiz', `${G}（${i}/4）`)))
     .concat([1, 2, 3, 4, 5].map(i => mk('quiz', `${G} · 字義選擇（${i}/5）`)));
   const subs = fn(list, G);
   return subs.length === 3
     && subs[0].base === '' && subs[0].items.length === 1          // 單字卡：沒有編號，不收
     && subs[1].base === '測驗' && subs[1].items.length === 4
     && subs[2].base === '字義選擇' && subs[2].items.length === 5; })());
ok('⭐ 沒有編號的單元一律維持原樣，不要憑空多一層', (() => {
   const subs = fn([mk('quiz', `${G} · 測驗`), mk('cloze', `${G} · 短文填空`)], G);
   return subs.length === 2 && subs.every(s => s.base === '' && s.items.length === 1); })());
ok('   只有一份的編號（1/1）也不會被收起來（畫面端要求 >= 2 份）', (() => {
   const subs = fn([mk('quiz', `${G}（1/1）`)], G);
   return subs.length === 1 && subs[0].items.length === 1; })());

console.log('\n【5】畫面上的行為');
ok('⭐⭐ 編輯模式**維持攤平**——老師要在那裡上下移、刪單一個單元',
   /if \(editMode\) return rows\.map\(\(it, ii, arr\) => renderUnitRow\(it, g\.name, \{ list: arr, idx: ii \}\)\);/.test(qmC));
ok('⭐ 兩份以上才收，一份就照原樣畫',
   /if \(!sub\.base \|\| sub\.items\.length < 2\) return sub\.items\.map/.test(qmC));
ok('⭐⭐ 正在做的那一份在裡面要自動打開（不然點進去會找不到自己在哪）',
   /const hasSel = sub\.items\.some\(it => selectedItem && selectedItem\.id === it\.id\);/.test(qmC)
   && /const open = openSubs\[sk\] \|\| hasSel;/.test(qmC));
ok('⭐ 標頭要寫幾份、做完幾份（收起來也看得出進度）',
   /\{sub\.items\.length\} 份/.test(qm) && /qm-sub-done/.test(qm));
ok('⭐ 整組同一個截止日才顯示一次，不同就讓每一份自己顯示',
   /const dues = \[\.\.\.new Set\(sub\.items\.map/.test(qmC) && /dues\.length === 1 &&/.test(qmC));
ok('⭐⭐ 「還有幾天到期」只留一份（小組標頭與單元列共用 qmDueText）', (() => {
   const defs = (qm.match(/function qmDueText\(/g) || []).length;
   return defs === 1 && /qmDueText\(dues\[0\]\)/.test(qmC) && /qmDueText\(hw\.dueDate\)/.test(qmC); })());
ok('   有樣式，而且顏色走變數（萬聖節那層要能翻深色）', (() => {
   const i = qmcss.indexOf('v545 📂');
   const blk = qmcss.slice(i);
   return i > 0 && /\.qm-sub-head \{/.test(blk) && !/background:\s*#fff\b/.test(blk); })());
ok('   萬聖節也幫小組標頭換了色', /html\.fest-hw \.qm-sub-head/.test(hw) && /html\.fest-hw \.qm-sub-name/.test(hw));

console.log(fail ? `\n❌ t-v545：${pass} 過 / ${fail} 失敗` : `\n✅ t-v545：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
