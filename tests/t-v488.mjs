/* t-v488 — 「我單字卡有 8 個，字義選擇只有 4 題」
 *
 * 量出來的事實（2026-10-08）：8 個字只出 4~5 題，被擋掉的**全部**是
 * 「出題者說 2、覆核說 0」。一度懷疑是覆核亂判，
 * 於是把同一題的正解輪流放到四個位置去問 → 覆核 12/12 全對＝沒有位置偏誤，
 * 是出題者自己標錯。根因在提示詞叫它「每次把正解放在不同位置」，
 * 而位置**程式本來就會攤平**（_qsSpreadAnswers，v468）。
 *
 * ⭐ 通用原則：程式自己會做的隨機化，不要再叫模型做一次——
 *   模型為了服從會謊報，而那是程式看不出來的錯。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const dataC = noComments(data);

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data + '\nwindow.__t = { _qsSpreadAnswers, AI_SENSE_SYS, GN_Q_SYS };')(W, stub, stub, stub);
const T = W.__t;

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】不可以再叫模型自己換答案位置');
ok('⭐ 字義選擇：提示詞不再要求「每次放不同位置」',
   !/DIFFERENT position|Vary which position/i.test(T.AI_SENSE_SYS));
ok('⭐ 而且明講正解固定放第 0 格、位置交給網站',
   /options\[0\] is ALWAYS the correct definition/.test(T.AI_SENSE_SYS)
   && /shuffles the positions itself/.test(T.AI_SENSE_SYS));

console.log('\n【2】位置要由程式攤平（這本來就有，不能弄丟）');
ok('⭐ 八題全部標 0 → 攤平成 ABCD 各兩題', (() => {
   const list = Array.from({ length: 8 }, (_, i) => ({
     word: 'w' + i, options: ['right' + i, 'a', 'b', 'c'], answer: 0 }));
   const out = T._qsSpreadAnswers(list);
   const n = out.reduce((a, x) => { a[x.answer] = (a[x.answer] || 0) + 1; return a; }, {});
   return n[0] === 2 && n[1] === 2 && n[2] === 2 && n[3] === 2; })());
ok('⭐ 攤平之後 answer 仍然指著「原本那個正確選項」（不是只搬位置不改答案）', (() => {
   const list = Array.from({ length: 8 }, (_, i) => ({
     word: 'w' + i, options: ['right' + i, 'a', 'b', 'c'], answer: 0 }));
   return T._qsSpreadAnswers(list).every((x, i) => x.options[x.answer] === 'right' + i); })());

console.log('\n【3】覆核要看「攤開後」的題目，不然它只是在確認 0');
ok('⭐ 先攤平、再交叉檢查', (() => {
   const i = dataC.indexOf('async function _senseRound');
   const seg = dataC.slice(i, dataC.indexOf('\n}\n', i));
   const spreadAt = seg.indexOf('_qsSpreadAnswers');
   const checkAt  = seg.indexOf('const checked');
   return spreadAt > 0 && checkAt > spreadAt; })());

console.log('\n【4】文法選擇題不要跟著亂改（實測 11/12 通過，位置本來就分散）');
ok('⭐ 文法 mcq 沒有程式攤平，所以它那行「換位置」要留著',
   /Put the correct option in a DIFFERENT position each time/.test(T.GN_Q_SYS.mcq));
ok('   而且它有自己的 index 比對把關（v431）',
   /a\.length === 1 && a\[0\] === x\.answer/.test(dataC));

console.log(fail ? `\n❌ t-v488：${pass} 過 / ${fail} 失敗` : `\n✅ t-v488：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
