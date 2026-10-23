/* t-v537 — 拍照讀考卷要認得全部 8 種題型
 *
 * 🔴 這一支守的是一個會「安靜少一大題」的坑：
 *   提示詞教會模型認某種題型，但 _examCleanPart 沒跟著收 → 讀出來了也會被丟掉，
 *   畫面上就是少一大題，而且**完全不報錯**。
 *   （v531 的 __dashGoto、v533 的 intent 清單，都是同一個家族。）
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(
  W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const SYS = data.slice(data.indexOf('const EXAM_READ_SYS'), data.indexOf('async function aiReadExamSheet'));
/* _examCleanPart 是內部函式，從 aiReadExamSheet 走不到——這裡直接在同一個範圍裡取出來 */
const clean = new Function('window', 'document', 'firebase', 'localStorage',
  data + '\nreturn _examCleanPart;')(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

console.log('\n【1】⭐⭐ 提示詞與程式支援的題型要對得上');
ok('⭐⭐ EXAM_KINDS 裡的每一種，讀卷提示詞都要教過', (() => {
   const miss = Object.keys(W.EXAM_KINDS).filter(k => !new RegExp('"' + k + '"').test(SYS));
   if (miss.length) console.log('      提示詞沒教的：', miss);
   return !miss.length; })());
ok('⭐ 提示詞不要再寫「只有四種」（新增之後那句話就是錯的）',
   !/ONLY use these four kinds/.test(SYS));

console.log('\n【2】⭐⭐ 模型讀出來的每一種，程式都要收得進來');
const CASES = {
  circle:   { kind:'circle', pts:20, need:10, check:'vce', passage:'Captain Jeff was ready to go into deep space.' },
  cloze:    { kind:'cloze', pts:32, bank:['struggled','challenge'], items:[{text:'Mark ___ on the test.',answer:'struggled'}] },
  quiz:     { kind:'quiz', pts:24, questions:[{q:'Main idea?',options:['a','b','c'],answer:2}] },
  affix:    { kind:'affix', pts:10, need:2, minWords:5, affixes:['-ity','-ty','-ic','-ment'] },
  usewords: { kind:'usewords', pts:10, need:2, minWords:6, bank:['extreme','protect','shelter'] },
  genq:     { kind:'genq', pts:14, need:2, passage:'Dr. Hu traveled all across Taiwan.' },
  storymap: { kind:'storymap', pts:15, need:2, passage:"Georgia O'Keeffe was born in Wisconsin." },
  short:    { kind:'short', pts:45, questions:[{q:'Write a 5-paragraph narrative.'}] },
  /* ══ v538 的四種 ══ */
  fixbox:   { kind:'fixbox', pts:10,
              answers:['Taipei','I','Monday'],
              passage:'last monday i went to taipei with my family.' },
  evidence: { kind:'evidence', pts:6, need:2, minWords:5,
              question:'Why can penguins live in the cold?',
              passage:'Penguins have a thick layer of fat called blubber under their skin.' },
  essay:    { kind:'essay', pts:45, prompt:'Write a narrative about a time you were brave.',
              vocab:['curious','brave'], paras:5, sentsPerPara:4, rubricSet:'writing' },
  order:    { kind:'order', pts:10, events:['A team earned a place.','They traveled abroad.','They won the final.'] },
  table:    { kind:'table', pts:9, rows:3, headers:['Descriptive Word or Phrase','What It Helps Me Imagine'] },
  draw:     { kind:'draw', pts:3, prompt:'Draw the final scene. Include details from the sentences.' },
  checkin:  { kind:'checkin', pts:0,
              goals:['Read every question carefully.','Stay calm and do my best.'] },
};
Object.keys(W.EXAM_KINDS).forEach(k => {
  ok(`⭐ ${k.padEnd(9)} 讀得進來（${W.EXAM_KINDS[k].zh}）`, (() => {
     const r = clean(CASES[k]);
     return !!r && r.kind === k; })());
});

console.log('\n【3】收進來的東西要是「真的出得出題」的');
ok('⭐⭐ 字尾沒寫成 -ing／un- 這種就不要收', (() => {
   /* 光禿禿的 "ing" 程式判不出是字首還是字尾，收進來那一大題就是壞的。 */
   return clean({ kind:'affix', pts:10, affixes:['ing','ed'] }) === null; })());
ok('⭐ 詞庫比要造的句子少就不要收',
   clean({ kind:'usewords', pts:10, need:3, bank:['a'] }) === null);
ok('⭐ 故事結構圖／自己出問題沒有文章就不要收',
   clean({ kind:'storymap', pts:15, need:2 }) === null
   && clean({ kind:'genq', pts:14, need:2 }) === null);
ok('⭐ 圈選的規則程式判不出來就不要收（跟 v516 同一條規矩）',
   clean({ kind:'circle', pts:20, check:'rhyme', passage:'x' }) === null);

console.log('\n【4】印在卷子上的 rubric 要跟著帶進來');
ok('⭐⭐ 七項寫作 rubric 認得出來', (() => {
   const r = clean({ kind:'short', pts:45, rubricSet:'writing', questions:[{q:'Write a narrative.'}] });
   return r && r.rubricSet === 'writing' && r.rubricMax === 7; })());
ok('⭐ 三項的也認得', (() => {
   const r = clean({ kind:'short', pts:20, rubricSet:'basic', questions:[{q:'Why?'}] });
   return r && r.rubricSet === 'basic' && r.rubricMax === 4; })());
ok('⭐ 認不得的套組不要亂設（留空＝用預設的三項）', (() => {
   const r = clean({ kind:'short', pts:20, rubricSet:'kangchiao-2027', questions:[{q:'Why?'}] });
   return r && !r.rubricSet; })());
ok('   提示詞有教它怎麼分辨那兩套', /Content, Details,\s*Creativity/.test(SYS) && /Explanation \/ Relevant \/ Effort/.test(SYS));

console.log('\n【5】拍照讀卷的既有規矩沒被弄壞');
ok('⭐ 不可以讀學生的手寫答案與紅筆', /Ignore ALL handwriting and red pen/.test(SYS));
ok('⭐⭐ 不可以輸出學生的姓名／班級／分數', /NEVER output the student's name, class or score/.test(SYS));
ok('⭐ 一張照片是攤開的兩頁，兩邊都要讀（v516 的教訓）', /TWO facing pages/.test(data));

console.log(fail ? `\n❌ t-v537：${pass} 過 / ${fail} 失敗` : `\n✅ t-v537：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
