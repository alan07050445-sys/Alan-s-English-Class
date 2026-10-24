/* t-v530 — 📋 申論題 Rubric 三項評分 ＋ 萬聖節脫掉裝扮
 *
 * Alan：「Rubri's 加上去吧」「吸血鬼所有額外裝扮都要脫掉，活動結束再調整回來」
 *
 * 這一支守的是**分工**：
 *   學生寫的字 → progress（他自己寫的，老師只能讀）
 *   老師的分數 → practice（老師寫的，學生只能讀自己的）
 *   AI 只給建議，老師按下存檔之前學生一個字都看不到
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data  = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const qm    = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const dash  = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const ed    = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const fx    = fs.readFileSync(new URL('components-fx.jsx', ROOT), 'utf8');
const rules = fs.readFileSync(new URL('firestore.rules', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(
  W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】三項評分怎麼算');
ok('⭐ 三項就是 Alan 說的 Explanation / Relevant / Effort',
   W.EXAM_RUBRIC.map(c => c.en).join('/') === 'Explanation/Relevant/Effort');
ok('⭐⭐「還沒改」回 null，不是 0', (() => {
   /* ⚠ 混在一起的話，老師還沒改的孩子在畫面上看起來就像被當掉了。 */
   return W.examRubricPoints(null, 10, 4) === null
     && W.examRubricPoints({}, 10, 4) === null
     && W.examRubricPoints({ explain: 0, relevant: 0, effort: 0 }, 10, 4) === 0; })());
ok('⭐ 三項滿分＝這一題滿分；一半就一半',
   W.examRubricPoints({ explain: 4, relevant: 4, effort: 4 }, 10, 4) === 10
   && W.examRubricPoints({ explain: 2, relevant: 2, effort: 2 }, 10, 4) === 5);
ok('   超出範圍的分數會被夾回來（手滑打 99 不會變成 99 分）',
   W.examRubricPoints({ explain: 99, relevant: 0, effort: 0 }, 9, 3) === 3);
ok('⭐ 整大題：改一題算一題，沒改的不算進去', (() => {
   const part = { pts: 20, questions: [{ q: 'a' }, { q: 'b' }], rubricMax: 4 };
   const r = W.examRubricPart(part, { 0: { explain: 4, relevant: 3, effort: 4 } });
   return r.done === 1 && r.total === 2 && r.per[1] === null && r.got > 0 && r.got < 20; })());

console.log('\n【2】AI 只是建議，而且要「接得到地」');
ok('⭐⭐ 幾乎空白的答案不送 AI（問了也只會得到「請再寫多一點」）', (() => {
   /* 同時也是省錢：一份考卷一個班就是幾十次呼叫。 */
   const i = data.indexOf('async function aiGradeRubric');
   return /words\.length < 3/.test(data.slice(i, i + 700)); })());
ok('⭐⭐ 引用不到孩子真的寫過的字 → 整份建議作廢', (() => {
   /* 這是接地檢查：引不出連續 3 個字，就代表它在憑空評論。 */
   const i = data.indexOf('async function aiGradeRubric');
   const b = data.slice(i, data.indexOf('\n}', i));
   /* v571：最少引幾個字改成看答案長度（短答案 1~2 個字、長答案才 3 個字）；「必須是孩子真的寫過的」不變 */
   return /q\.split\(' '\)\.length < minQ \|\| !grounded\) return null/.test(b) && /const grounded = flat\(ans\)\.indexOf\(q\) >= 0/.test(b)
     && /minQ = aw <= 10 \? 1 : \(aw <= 25 \? 2 : 3\)/.test(b); })());
ok('⭐ 分數不是允許的等第就整份作廢（不要只夾回來就用）', (() => {
   /* v536 起等第可以是 7/5/3/0 這種不連續的（康橋寫作卷），
      所以檢查從「在 0~max 之間」改成「必須是允許的等第之一」——更嚴，不是更鬆。 */
   const i = data.indexOf('async function aiGradeRubric');
   const b = data.slice(i, data.indexOf('\n}', i));
   /* v557：摘要評分表每一項滿分不同，那種沒有等第的套組改成「0~這一項的滿分」；
      有等第的套組（寫作七項）照舊必須是允許的等第。 */
   return /const allowed = new Set\(R\.bands\.map/.test(data)
     && /allowed\.has\(n\)/.test(b) && /return null/.test(b); })());
ok('⭐ 每一項都要有一句理由，沒有就作廢', (() => {
   const i = data.indexOf('async function aiGradeRubric');
   return /if \(!out\[c\.id\]\.why\) return null/.test(data.slice(i, data.indexOf('\n}', i))); })());
ok('   評語是中文、對老師說的，而且限長度', /≤22 characters/.test(data) && /Traditional Chinese/.test(data));

console.log('\n【3】⭐⭐ 分工：誰寫哪一份資料');
ok('⭐⭐ 學生寫的字存在 progress（他自己寫的，老師只能讀）', (() => {
   /* 不另開 collection 是刻意的：開新的就要 Alan 再去 Firebase 貼一次 rules，
      那件事卡過好幾個功能。 */
   return /extra: Object\.keys\(written\)\.length \? \{ examWritten: written/.test(qm)
     && /match \/progress\/\{userId\}/.test(rules); })());
ok('⭐⭐ 老師的分數存在 practice（老師寫、學生讀自己的）',
   /_db\.collection\('practice'\)\.doc\(id\)\.set\(\{\s*marks:/.test(data)
   && /match \/practice\/\{studentEmail\}/.test(rules));
ok('⭐⭐ 不需要改 Firestore 規則（兩條路本來就開好了）', (() => {
   const i = rules.indexOf('match /practice/{studentEmail}');
   const blk = rules.slice(i, i + 220);
   return /allow write: if isTeacher\(\)/.test(blk) && /token\.email\.lower\(\) == studentEmail/.test(blk); })());
ok('   規則上學生不能改自己的分數，老師也不能改學生的作答', (() => {
   const i = rules.indexOf('match /progress/{userId}');
   const blk = rules.slice(i, i + 700);
   return /allow write: if request\.auth != null\s*&& request\.auth\.uid == userId/.test(blk)
     && /只准動 mx 這一個欄位/.test(blk); })());

console.log('\n【4】老師批改畫面');
ok('⭐ 後台多一個「申論批改」分頁', /id: 'marking'/.test(dash) && /<ExamMarking students=\{visibleStudents\}\/>/.test(dash));
ok('⭐ 待批改清單是從學生的 progress 撈 examWritten 來的', /if \(!it \|\| !it\.examWritten\) return;/.test(dash));
ok('⭐⭐ 沒有「全部自動改完」這顆按鈕——AI 一次只建議一題', (() => {
   /* 申論分數會被拿去跟家長討論，不能讓沒有人看過的機器分數直接變成成績。 */
   const i = dash.indexOf('function ExamMarking(');
   const b = dash.slice(i, dash.indexOf('\nfunction ', i + 10));
   return /aiGradeRubric\(/.test(b) && !/全部自動|markAll|autoAll/.test(b); })());
ok('⭐ AI 建議的旁邊要寫出它引用了哪一句（老師才判斷得了可不可信）',
   /mk-ai-why/.test(dash) && /_quote/.test(dash));
ok('   畫面上要講清楚「存檔之前學生看不到」',
   /AI 只給建議，按下存檔之前學生看不到任何分數/.test(dash));
ok('   老師改過的分數再打開要帶回來（不然每次點進去都是空的）', /had && !mark\[sel\]/.test(dash));

console.log('\n【5】學生端');
ok('⭐ 學生訂閱自己的 practice 看分數', /window\.subscribePractice\(em, \(doc\) => \{[\s\S]{0,140}examMarkOf/.test(qm));
ok('⭐⭐ v575：老師存過的分數優先；沒有才顯示 AI 先改的，而且標明是 AI（不假裝是老師）', (() => {
   const i = qm.indexOf('const byTeacher =');
   const b = qm.slice(i, i + 500);
   return i > 0 && /by = byTeacher \|\| aiMarks\[key\]/.test(b) && /isAi/.test(qm) && /AI 先幫你改了（老師還會再看過）/.test(qm) && /if \(!marked\)/.test(qm); })());
ok('   改好之後三項分數與評語都看得到', /ex-marked-cr/.test(qm) && /ex-marked-note/.test(qm));

console.log('\n【6】出卷端');
ok('⭐ 申論題可以勾「三項評分」並設定每項滿分', /checked=\{!!pt\.rubricMax\}/.test(ed) && /exed-rub/.test(ed));

console.log('\n【7】🧛 萬聖節把裝扮脫掉');
ok('⭐ 節慶期間不戴帽子也不掛配件',
   /hat=\{\(hwOn \|\| bat\) \? 'none' : \(wear\.hat \|\| 'none'\)\}/.test(fx)
   && /acc=\{\(hwOn \|\| bat\) \? '' : wear\.item\}/.test(fx));
ok('⭐⭐ 只是**畫的時候不畫**，wear 這份資料一個字都沒動', (() => {
   /* 所以 11/01 之後他原本戴的那頂帽子會自己回來，不用任何還原動作。 */
   return !/mxSetWear\(\{\}\)|wear = \{ hat: '', item: '' \}/.test(fx)
     && /window\.__mxWear/.test(fx); })());

console.log(fail ? `\n❌ t-v530：${pass} 過 / ${fail} 失敗` : `\n✅ t-v530：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
