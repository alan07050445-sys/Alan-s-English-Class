/* t-v536 — 📊 故事結構圖 ／ ✍️ 詞庫造句 ／ 多準則 Rubric
 * Alan 給的康橋考卷上有，但網站做不出來的三種。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(
  W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

/* Alan 考卷上真正那一篇（G5 期中 Excerpt 2） */
const PASSAGE = "The American artist Georgia O'Keeffe was influenced by her life and the places she visited. "
  + "She was born in 1887 in Sun Prairie, Wisconsin. Her parents were dairy farmers, and she grew up surrounded "
  + "by trees, wildflowers, and open fields. After high school, O'Keeffe studied painting in Chicago and later in "
  + "New York. She also worked as a teacher in Texas. In 1924 she married Alfred Stieglitz and lived in New York City. "
  + "The tall skyscrapers inspired her to paint the city. Later she traveled to the Southwest and loved the deserts "
  + "of New Mexico. The land gave her new ideas and made her feel free to paint in her own way.";
const SM = { kind: 'storymap', pts: 15, need: 2, minWords: 4, passage: PASSAGE };

console.log('\n【1】📊 故事結構圖 — 拿 Elaine 考卷上真的寫的答案測');
ok('⭐ 三個格子 × 每格 2 句 = 6 格', W.examPartN(SM) === 6);
ok('⭐⭐ 她真的寫的那六句全部算得過', (() => {
   const elaine = {
     begin:  ['She was influenced by the places she visited and her life.',
              'She grew up surrounded by nature, she studied and work as a teacher.'],
     middle: ['She lived in New York City, tall skyscrapers inspired her to paint.',
              'She went to many places, and she painted close-up views of nature.'],
     end:    ['The land gave her new ideas, and made her feel free.',
              'She became a famous painters in America.'],
   };
   const r = W.examScorePart(SM, elaine);
   if (r.right !== 6) r.detail.forEach(d => { if (!d.ok) console.log('      ✗', d.got, '→', d.why.join('；')); });
   return r.right === 6 && r.got === 15; })());
ok('⭐⭐ 用自己的話改寫不可以被誤判（文章寫 painting／painted，孩子寫 painter）', (() => {
   /* 🔴 第一版用「整個字」比對，"She became a famous painter." 被判成
      「不是在講這篇文章」——但那正是摘要題要的東西（v415 同一類的坑）。
      → 改成比**字根**。 */
   return W.examStoryOne('She became a famous painter in America.', SM).ok === true
     && W.examStoryOne('Her paintings were inspired by the desert.', SM).ok === true; })());
ok('⭐ 完全無關的還是要擋', (() => {
   const r = W.examStoryOne('I like pizza very much today.', SM);
   return !r.ok && /不是在講這篇文章/.test(r.why.join()); })());
ok('⭐ 太短要擋', !W.examStoryOne('Yes.', SM).ok);
ok('⭐ 一格塞兩句要擋（老師沒辦法一句一句看）', (() => {
   const r = W.examStoryOne('She moved to New York. She was very happy there.', SM);
   return !r.ok && /一格寫一句/.test(r.why.join()); })());
ok('⚠ 太短的不要被罰兩次（字數已經扣過，不要再說它離題）', (() => {
   const r = W.examStoryOne('Yes.', SM);
   return r.why.length === 1; })());
ok('   沒給文章時不做接地檢查（不然每一句都會被擋）',
   W.examStoryOne('Anything at all here.', { minWords: 3 }).ok === true);
ok('⭐ 出卷時沒貼文章要提醒', (() => {
   const w = W.examWarnings({ sections: [{ parts: [{ kind: 'storymap', pts: 100, need: 2 }] }] });
   return w.some(x => /沒有文章/.test(x)); })());

console.log('\n【2】✍️ 用詞庫的字造句（文法卷 C）');
const UW = { kind: 'usewords', pts: 10, need: 2, minWords: 6, bank: ['extreme', 'protect', 'shelter'] };
ok('⭐ 兩句都好＝滿分', W.examScorePart(UW, [
   { word: 'protect', sentence: 'My dad protects me because he loves me.' },
   { word: 'shelter', sentence: 'I made a shelter to protect my family.' }]).got === 10);
ok('⭐⭐ 字的變化要算數（protect / protects / protected 都是用到了）', (() => {
   /* 不認變化的話，孩子寫對了卻被判沒用到。 */
   return W.examUseWordOne({ word: 'protect', sentence: 'My dad protected me from the rain.' }, UW).ok
     && W.examUseWordOne({ word: 'protect', sentence: 'My dad protects me because he loves me.' }, UW).ok; })());
ok('⭐ 不在詞庫裡的字要擋', (() => {
   const r = W.examUseWordOne({ word: 'happy', sentence: 'I am very happy today at school.' }, UW);
   return !r.ok && /不在詞庫裡/.test(r.why.join()); })());
ok('⭐ 句子太短要擋', !W.examUseWordOne({ word: 'protect', sentence: 'He protected us.' }, UW).ok);
ok('⭐⭐ 同一個字用兩次，第二次不給分（考卷寫的是「挑兩個」）', (() => {
   const r = W.examScorePart(UW, [
     { word: 'protect', sentence: 'My dad protects me because he loves me.' },
     { word: 'protect', sentence: 'The shelter protects us from the extreme rain.' }]);
   return r.right === 1 && /前面已經用過/.test(r.detail[1].why.join()); })());
ok('⭐ 詞庫比要造的句子少要提醒', (() => {
   const w = W.examWarnings({ sections: [{ parts: [{ kind: 'usewords', pts: 100, need: 3, bank: ['a'] }] }] });
   return w.some(x => /詞庫只有 1 個字/.test(x)); })());

console.log('\n【3】📋 多準則 Rubric（康橋寫作卷七項）');
const WR = W.examRubricOf({ rubricSet: 'writing' });
ok('⭐ 七項：Content / Details / Creativity / Text Structure / Length / Grammar / Vocabulary',
   WR.criteria.length === 7
   && WR.criteria.map(c => c.en).join('/') === 'Content/Details/Creativity/Text Structure/Length/Grammar/Vocabulary');
ok('⭐⭐ 等第是 7 / 5 / 3 / 0 四級，不是 0~7 的連續分', (() => {
   /* 康橋的 rubric 是 Working Above/At/Below/None，硬塞成連續分
      老師改的時候要自己換算，很容易點錯。 */
   return WR.bands.map(b => b.n).join(',') === '7,5,3,0'; })());
ok('⭐ 舊的三項卷照舊（0~4 連續分）', (() => {
   const B = W.examRubricOf({});
   return B.criteria.length === 3 && B.max === 4 && B.bands.map(b => b.n).join(',') === '4,3,2,1,0'; })());
ok('⭐ 認不得的套組退回三項，不要回 undefined 害下游炸掉',
   W.examRubricOf({ rubricSet: 'nope' }).criteria.length === 3);
ok('⭐ 七項全拿＝那一題滿分', (() => {
   const part = { pts: 45, rubricSet: 'writing', questions: [{ q: 'x' }] };
   const full = {}; WR.criteria.forEach(c => { full[c.id] = 7; });
   return W.examRubricPart(part, { 0: full }).got === 45; })());
ok('⭐⭐ 還沒改仍然是 null 不是 0（跟 v530 同一條規矩）',
   W.examRubricPoints(null, 45, 7, WR.criteria) === null);
ok('⭐⭐ AI 只能回允許的等第——回一個 6 的話整份作廢', (() => {
   /* 寫作卷只有 7/5/3/0，模型回 6 的話老師在畫面上根本點不到那一格。 */
   const i = data.indexOf('const allowed = new Set(R.bands.map');
   return i > 0 && /: allowed\.has\(n\);\s*\n\s*if \(!isFinite\(n\) \|\| !okN\) return null;/.test(data); })());
ok('⭐ 提示詞是照準則**組出來**的，不是寫死三項',
   /\{BANDS\}/.test(data) && /\{CRITERIA\}/.test(data)
   && /R\.criteria\.map\(c => `- \$\{c\.id\} : \$\{c\.en\}/.test(data));

console.log('\n【4】三端都接上了');
ok('⭐ 學生端畫得出來（三個格子／詞庫按鈕）', /ex-story-box/.test(qm) && /ex-af-p/.test(qm) && /usewords/.test(qm));
ok('⭐ 學生看到的評分也照那一大題的準則', /window\.examRubricOf \? window\.examRubricOf\(pt\)/.test(qm));
ok('⭐⭐ 用哪一套 rubric 要跟著學生的答案一起存，老師端才看得到七項',
   /rubricSet: pp\.part\.rubricSet \|\| 'basic'/.test(qm));
ok('⭐ 老師批改畫面照等第畫按鈕（不是 0~max 一整排）',
   /\(window\.examBandsOf \? window\.examBandsOf\(RB, cr\) : RB\.bands\)\.map\(b => \(/.test(dash) && /className=\{c\[cr\.id\] === b\.n \? 'on' : ''\}/.test(dash));
ok('⭐ AI 批改知道這一題用哪一套', /part: w \}\)/.test(dash));
ok('⭐ 出卷端選得到套組', /window\.EXAM_RUBRIC_SETS \|\| \{\}\)\.map/.test(ed) && /rubricSet: k/.test(ed));
ok('   兩種新題型在出卷端有說明', /storymap: '貼文章/.test(ed) && /usewords: '一行就是詞庫/.test(ed));

console.log(fail ? `\n❌ t-v536：${pass} 過 / ${fail} 失敗` : `\n✅ t-v536：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
