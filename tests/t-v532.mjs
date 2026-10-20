/* t-v532 — 💬 小助手常駐右下角
 * Alan：「可以直接放在老師的主頁面右下角，不需要再按編輯再開起來，他就像小助手一樣」
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const css = fs.readFileSync(new URL('styles-quiz-mode.css', ROOT), 'utf8');
const auth = fs.readFileSync(new URL('styles-auth.css', ROOT), 'utf8');
const fxcss = fs.readFileSync(new URL('styles-fx.css', ROOT), 'utf8');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const num = (re, src) => { const m = re.exec(src); return m ? +m[1] : null; };

console.log('\n【1】誰看得到');
ok('⭐⭐ 只有老師看得到', (() => {
   /* 學生不該有「幫我出一份考卷」這種入口。 */
   const i = app.indexOf("className={'ask-fab'");
   const before = app.slice(Math.max(0, i - 260), i);
   return i > 0 && /\{isTeacher && window\.AskPanel && !askOpen && \(/.test(before); })());
ok('⭐ 面板打開時就把按鈕收起來（兩個釘在同一個角落）', (() => {
   const i = app.indexOf("className={'ask-fab'");
   return /!askOpen/.test(app.slice(Math.max(0, i - 260), i)); })());

console.log('\n【2】⭐⭐ 不用先進編輯模式');
ok('⭐⭐ 按鈕本身不在 editMode 的條件底下', (() => {
   const i = app.indexOf("className={'ask-fab'");
   const before = app.slice(Math.max(0, i - 260), i);
   /* with-nav 那個 class 會提到 editMode（只是為了讓位），但「顯不顯示」不可以看它 */
   return !/editMode &&/.test(before); })());
ok('⭐⭐ 13 個生成視窗本來就各自獨立 render（靠自己的 open 控制）', (() => {
   /* 這是「不用先進編輯模式」成立的真正原因——如果它們被包在
      `{editMode && (...)}` 底下，從浮動鈕叫就會什麼都不會發生。 */
   const need = ['<window.QuickSetModal', '<window.WordStudyModal', '<window.GrammarNotesModal',
                 '<window.ReadingGenModal', '<window.ExamScanModal', '<window.EditorModal'];
   return need.every(tag => {
     const i = app.indexOf(tag);
     if (i < 0) return false;
     /* 往前找 200 字裡不可以有 editMode 的開關 */
     return !/editMode && \($/.test(app.slice(Math.max(0, i - 200), i).trim());
   }); })());

console.log('\n【3】位置：不要跟別的東西打架');
ok('⭐ 跟聊天面板同一個角落（按下去面板就從這裡長出來）', (() => {
   const fab = /\.ask-fab \{[\s\S]*?\}/.exec(css)[0];
   const panel = /\.ask-wrap \{[\s\S]*?\}/.exec(auth)[0];
   return /right: 20px; bottom: 20px/.test(fab) && /right: 20px; bottom: 20px/.test(panel); })());
ok('⭐⭐ z-index 要比吉祥物高、比面板低', (() => {
   /* 比吉祥物低 → 吉祥物走過去會蓋住它；比面板高 → 面板打開時按鈕會浮在上面。 */
   const fab = num(/\.ask-fab \{[\s\S]*?z-index: (\d+)/, css);
   const panel = num(/\.ask-wrap \{[\s\S]*?z-index: (\d+)/, auth);
   const mx = num(/\.mx-layer \{[\s\S]*?z-index: (\d+)/, fxcss);
   return fab && panel && mx && fab > mx && fab < panel; })());
ok('⭐ 有底部導覽列時要往上讓位', /\.ask-fab\.with-nav \{ bottom: 84px; \}/.test(css)
   && /with-nav/.test(app));
ok('   桌機沒有那條列，就不用讓', /@media \(min-width: 861px\) \{ \.ask-fab\.with-nav \{ bottom: 20px; \} \}/.test(css));
ok('⭐ 手機上只留圖示，不佔畫面', /@media \(max-width: 520px\)[\s\S]{0,140}\.ask-fab-txt \{ display: none; \}/.test(css));
ok('   尊重 prefers-reduced-motion', /@media \(prefers-reduced-motion: reduce\) \{ \.ask-fab/.test(css));

console.log('\n【4】看得見');
ok('⭐ 萬聖節的紫底上要換色（紫按鈕在紫底上看不出來）', (() => {
   const hw = fs.readFileSync(new URL('styles-holiday-hw.css', ROOT), 'utf8');
   return /html\.fest-hw \.ask-fab \{[\s\S]{0,120}#E8700F/.test(hw); })());
ok('   有無障礙標籤', /aria-label="跟小助手說一句話"/.test(app));

console.log(fail ? `\n❌ t-v532：${pass} 過 / ${fail} 失敗` : `\n✅ t-v532：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
