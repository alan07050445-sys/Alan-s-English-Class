/* t-v522 — 考卷缺的兩個題型：✏️ 造字＋造句、❓ 自己出問題
 *
 * Alan 給的 G4 Formative 上還有兩種 v515 做不出來的題：
 *   Part 1  從字尾表挑兩個 → 造字 → 各造一個 5 字以上的句子
 *   Part 2  用剛讀的故事，自己出兩個「文章上沒有」的問題
 *
 * ⭐ 這兩題最大的價值是**程式驗得出來**，而且驗的就是考卷自己印的規則：
 *   "two of the suffixes" / "Each sentence should be 5 or more words" / "(not on the page)"
 * ⚠ 拼字對不對、是不是真的英文字，程式判不了——那本來就是老師改的部分。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const AF = { kind: 'affix', pts: 10, need: 2, minWords: 5, affixes: ['-ing', '-ed', '-s', '-est'] };
const sc = (slots) => W.examScorePart(AF, slots);
const GOOD1 = { affix: '-ing', word: 'playing', sentence: 'I love playing soccer and basketball in my free time.' };
const GOOD2 = { affix: '-est', word: 'biggest', sentence: 'The blue whale is the biggest animal in the sea.' };

console.log('\n【1】✏️ 造字＋造句（拿 Nick 考卷上真的寫的答案測）');
ok('⭐ 兩格全對 = 滿分', sc([GOOD1, GOOD2]).got === 10);
ok('⭐ 造的字沒用到字尾表裡任何一個 → 扣那半（句子照他寫的字算，所以句子那半還是有分）', (() => {
   /* v563：從字本身認字尾，不再逼他先點對按鈕——所以「點 -ing、造 played（-ed）」現在是對的；
      要扣分的是「字根本沒用到清單上的任何字尾」。 */
   const r = sc([{ affix: '-ing', word: 'table', sentence: 'I put my books on the table at home.' }, GOOD2]);
   return r.got === 8 && /「table」沒有用到/.test(r.detail[0].why.join()); })());
ok('⭐ v563 點的按鈕跟字不一樣，但字真的有清單上的字尾 → 算對', (() => {
   const r = sc([{ affix: '-ing', word: 'played', sentence: 'I played soccer with my friends yesterday.' }, GOOD2]);
   return r.got === 10; })());
ok('⭐ 句子沒用到那個字 → 扣那半', (() => {
   const r = sc([{ ...GOOD1, sentence: 'I love soccer and basketball very much.' }, GOOD2]);
   return r.got === 8 && /沒有用到/.test(r.detail[0].why.join()); })());
ok('⭐⭐ 句子少於 5 個字 → 扣（考卷自己印的規則）', (() => {
   const r = sc([{ ...GOOD1, sentence: 'I love playing.' }, GOOD2]);
   return r.got === 8 && /要 5 個字以上/.test(r.detail[0].why.join()); })());
ok('⭐⭐ 兩格選同一個字尾只算一半（考卷寫 "two of the suffixes"）', (() => {
   const r = sc([GOOD1, { affix: '-ing', word: 'running', sentence: 'I enjoy running at the park every morning.' }]);
   return r.got === 5 && /兩個不一樣的字尾/.test(r.note || ''); })());
ok('⚠ 那是整大題的問題，不是某一格錯——不要把兩格都標成錯', (() => {
   const r = sc([GOOD1, { affix: '-ing', word: 'running', sentence: 'I enjoy running at the park every morning.' }]);
   return r.detail.every(d => d.ok === true); })());
ok('   造字對、句子沒寫 → 只拿一半（跟完全空白不一樣）',
   sc([{ affix: '-ing', word: 'playing' }, GOOD2]).got === 8);
ok('   完全空白 = 0 分', sc([{}, {}]).got === 0);
ok('   字首（un-）也判得出來',
   W.examAffixOne({ affix: 'un-', word: 'unhappy', sentence: 'He was unhappy about the test result.' },
     { minWords: 5 }).ok === true);
ok('⭐ 題數算得出來（要造幾個字）', W.examPartN(AF) === 2);

console.log('\n【2】❓ 自己出問題');
const GQ = { kind: 'genq', pts: 14, need: 2,
  passage: 'Dr. Hu traveled all across Taiwan to carefully dig up rock layers in search of hidden treasures.' };
const g = (arr) => W.examScorePart(GQ, arr);
ok('⭐ 兩題都好 = 滿分',
   g(['Why do you want to study fossils?', 'Is it dangerous to find fossils under cliffs?']).got === 14);
ok('⭐ 沒有問號 → 不算問句', /不是問句/.test(g(['Why do you want to study fossils']).detail[0].why.join()));
ok('⭐ 太短 → 擋掉', /太短/.test(g(['Is it?']).detail[0].why.join()));
ok('⭐⭐ 整句抄文章 → 擋掉（考卷寫 "not on the page"）',
   /直接從文章抄/.test(g(['Dr. Hu traveled all across Taiwan to carefully dig up rock layers?']).detail[0].why.join()));
ok('⚠ 比對要忽略大小寫與標點，不然改一個逗號就躲過去',
   /直接從文章抄/.test(g(['dr hu traveled all across taiwan to carefully dig up rock layers?']).detail[0].why.join()));
ok('   只是用到文章裡的幾個字不算抄',
   g(['Why did Dr. Hu want to dig up rock layers in Taiwan?']).detail[0].ok === true);

console.log('\n【3】出卷時的自我檢查');
const warn = (parts) => W.examWarnings({ sections: [{ parts }] });
ok('⭐ 字尾表少於兩個 → 提醒（考卷要「兩個不一樣的」）',
   warn([{ kind: 'affix', pts: 100, need: 2, affixes: ['-ing'] }]).some(w => /至少要兩個/.test(w)));
ok('⭐⭐ 字尾沒寫成 -ing / un- 這種 → 程式判不出是字首還是字尾，要講出來',
   warn([{ kind: 'affix', pts: 100, need: 2, affixes: ['ing', 'ed'] }]).some(w => /判不出來是字首還是字尾/.test(w)));
ok('⭐ 要造的數量多過字尾表 → 提醒',
   warn([{ kind: 'affix', pts: 100, need: 5, affixes: ['-ing', '-ed'] }]).some(w => /只有 2 個/.test(w)));
ok('⭐ 自己出問題沒有文章 → 提醒', warn([{ kind: 'genq', pts: 100, need: 2 }]).some(w => /沒有文章/.test(w)));

console.log('\n【4】編輯器與學生端都接上了');
ok('⭐ 兩種都在 EXAM_KINDS 裡', !!W.EXAM_KINDS.affix && !!W.EXAM_KINDS.genq);
ok('⭐ 都是自動計分', W.EXAM_KINDS.affix.auto === true && W.EXAM_KINDS.genq.auto === true);
ok('⭐ 編輯器的文字格式（字尾表一行／貼文章）', (() => {
   const a = W.examParsePart('affix', '-ing -ed -s -est');
   const q = W.examParsePart('genq', 'Some passage here.');
   return a.affixes.join() === '-ing,-ed,-s,-est' && /Some passage/.test(q.passage); })());
ok('   來回不掉東西', W.examPartText({ kind: 'affix', affixes: ['-ing', '-ed'] }) === '-ing -ed');
ok('   編輯器寫得出怎麼填', /一行就是字尾表/.test(ed) && /文章上沒有/.test(ed));
ok('⭐ 學生端畫得出來（字尾表、Word/Sentence 兩行、問題欄）',
   /ex-affixbox/.test(qm) && /ex-af-w/.test(qm) && /ex-genq/.test(qm));
ok('⭐ 扣分原因逐條寫給學生看（不是只給一個叉）', /className="ex-why"/.test(qm));
ok('   整大題的問題寫在大題上', /ex-partnote/.test(qm) && /pr && pr\.note/.test(qm));
ok('⚠ 作答一樣用函式版更新（v515 踩過：同一瞬間的輸入互相蓋掉）',
   /const setSlot = \(i, patch\) => put\(key, prev => \{/.test(qm));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
