/* t-v542 — 一次練習最多幾題（合併單字之後全部擠在一個練習裡）
 *
 * Alan 合併 24 個單字之後：
 *   「短文填空幫我出共三篇，都幫我挖空 6 格，Word Bank 每一篇給隨機 10 個單字」
 *   「字義選擇不可能一次的練習就 24 題，這樣也太久，小孩會沒耐心，所以要拆開」
 *   「不然之後合併單字 或是文法 都全部出在一個練習 也太累」
 * 他已經試過寫在「💬 這次的特別要求」裡叫 AI 自己拆——做不到。
 *
 * ⭐⭐ 因為那是**程式的工作**：AI 只負責生足夠的題材，切成幾份由程式算。
 *   （v417 選擇題位置、v488 字義選擇位置都是同一類：
 *     程式自己會做的隨機化／切分叫模型做，它為了服從會謊報。）
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const dist = fs.readFileSync(new URL('dist/components-editor.js', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });
/* 真的拿編好的 qsBuildItems 來跑（不要另外抄一份） */
const grab = (name) => {
  const i = dist.indexOf('function ' + name + '(');
  const j = dist.indexOf('\nfunction ', i + 10);
  return new Function('window', 'React', dist.slice(i, j) + '\nreturn ' + name + ';')(W, stub);
};
const qsBuildItems = grab('qsBuildItems');
const gnBuildItems = grab('gnBuildItems');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const nOf = (it) => (it.cards || it.defPairs || it.questions || it.spellWords || it.pairs
  || it.writingPrompts || []).length || ((it.passage || '').match(/\[[^\]]+\]/g) || []).length;

console.log('\n【1】⭐⭐ 切要「平均分」，不是留一個短尾巴');
const len = (n) => W.qsChunkEven(Array.from({ length: n }, (_, i) => i), 10).map(x => x.length);
ok('⭐⭐ 24 個、上限 10 → 8/8/8（不是 10/10/4——短尾巴看起來像出錯了）',
   len(24).join('/') === '8/8/8');
ok('⭐ 11 個 → 6/5（差最多 1 個）', len(11).join('/') === '6/5');
ok('⭐ 沒超過上限就**一份都不切**（原本好好的流程一行都不要動）',
   len(10).join('/') === '10' && len(1).join('/') === '1');
ok('   空的回空陣列（不要回一個空單元）', W.qsChunkEven([], 10).length === 0);
ok('   23 個、上限 8 → 8/8/7',
   W.qsChunkEven(Array.from({ length: 23 }, (_, i) => i), 8).map(x => x.length).join('/') === '8/8/7');

console.log('\n【2】⭐⭐ 標題：只有一份時完全不加字尾');
ok('⭐ 一份＝原樣', W.qsPartTitle('合併複習', 0, 1) === '合併複習');
ok('⭐ 多份＝加（1/3）', W.qsPartTitle('合併複習', 0, 3) === '合併複習（1/3）'
   && W.qsPartTitle('合併複習', 2, 3) === '合併複習（3/3）');
ok('⭐⭐ 加了字尾就一定要能**拿掉**——站上有地方是「用標題比對」認題型的', (() => {
   /* 🔴 這就是我自己造出來的 bug：qsKindsInGroup 用 /字義選擇$/ 認字義選擇，
      標題變成「… 字義選擇（1/3）」之後它認不出來，而且**不報錯**，
      只會讓「只補漏掉的題型」重複生一份。 */
   return W.qsStripPart('合併複習 · 字義選擇（1/3）') === '合併複習 · 字義選擇'
       && W.qsStripPart('合併複習(2/4)') === '合併複習'
       && W.qsStripPart('Week 3') === 'Week 3'; })());
ok('⭐⭐ 拆開之後「這一組已經有哪些題型」還是認得出七種', (() => {
   const have = W.qsKindsInGroup([
     { type: 'flashcard', cards: [1] },
     { type: 'quiz', title: '合併複習（1/3）', questions: [1] },
     { type: 'quiz', title: '合併複習 · 字義選擇（1/3）' },
     { type: 'cloze', title: '合併複習 · 短文填空（2/4）' },
     { type: 'spelling', spellWords: [1] }, { type: 'def-match', defPairs: [1] },
     { type: 'fillblank' }]).sort().join(',');
   return have === 'def-match,fillblank,flashcard,quiz,sense,spelling,story'; })());

console.log('\n【3】📖 短文填空：好幾篇、每篇 6 格、Word Bank 10 個');
const bank = W.qsStoryBank(['a', 'b', 'c', 'd', 'e', 'f'],
  Array.from({ length: 24 }, (_, i) => 'w' + i).concat(['a', 'b', 'c', 'd', 'e', 'f']), 10);
ok('⭐ Word Bank 剛好 10 個（答案 6 ＋ 誘答 4）', bank.length === 10);
ok('⭐ 6 個答案都在裡面', ['a', 'b', 'c', 'd', 'e', 'f'].every(x => bank.indexOf(x) >= 0));
ok('⭐⭐ 要洗牌——不洗的話答案整排排在前面＝直接送分', (() => {
   /* 連抽 20 次，只要有一次答案不是剛好排在前 6 個就算有洗到 */
   for (let i = 0; i < 20; i++) {
     const b = W.qsStoryBank(['a', 'b', 'c'], ['a', 'b', 'c', 'x', 'y', 'z', 'p', 'q'], 6);
     if (!['a', 'b', 'c'].every((w, k) => b[k] === w)) return true;
   }
   return false; })());
ok('   字不夠 10 個就有幾個給幾個（不要塞空字串）',
   W.qsStoryBank(['a', 'b'], ['a', 'b', 'c'], 10).length === 3);
ok('⭐ aiMakeVocabStories 是「程式切批次、一批生一篇」，不是叫 AI 自己拆', (() => {
   const i = data.indexOf('async function aiMakeVocabStories');
   const body = data.slice(i, data.indexOf('\nfunction _aiStripFence', i));
   return i > 0 && /qsChunkEven\(list, Math\.max\(3, per\)\)/.test(body)
     && /aiMakeVocabStory\(batch,/.test(body); })());
ok('⭐⭐ 每一篇都要不一樣：v628 改同時寫，所以每篇指定不同場景＋老師帶進來的 avoid', (() => {
   const i = data.indexOf('async function aiMakeVocabStories');
   const body = data.slice(i, data.indexOf('\nfunction _aiStripFence', i));
   return /avoid: avoid0/.test(body) && /SETTINGS\[bi % SETTINGS\.length\]/.test(body) && /pMap\(batches/.test(body); })());
ok('⚠ 一篇失敗不可以拖垮其他篇，但要講出來（不可以 .catch(()=>null) 安靜少一篇）', (() => {
   const i = data.indexOf('async function aiMakeVocabStories');
   const body = data.slice(i, data.indexOf('\nfunction _aiStripFence', i));
   return /\{ error: \(e && e\.message\)/.test(body)
     && /短文填空有 \$\{/.test(ed.replace(/`/g, '`'))
     || /短文填空有 /.test(ed); })());

console.log('\n【4】⭐⭐ 24 個單字真的跑一次 qsBuildItems');
const words = Array.from({ length: 24 }, (_, i) => ({ term: 'w' + (i + 1), zh: 'z' + (i + 1),
  example: 'I like w' + (i + 1) + ' very much today.' }));
const ai = words.map(w => ({ term: w.term, zh: w.zh, def: 'def of ' + w.term,
  sentence: 'She saw the ___ today.', answer: w.term, explain: w.term }));
const sense = Array.from({ length: 24 }, (_, i) => ({ word: 'w' + (i + 1), title: 'T' + i,
  passage: 'A passage about w' + (i + 1) + '.', q: 'What does it mean?',
  options: ['a', 'b', 'c', 'd'], answer: 0 }));
const stories = W.qsChunkEven(words, 6).map((b, k) => ({ title: 'S' + k, words: b,
  passage: 'Once ' + b.map(w => '[' + w.term + ']').join(' and ') + ' were here.', check: {}, fixes: [] }));
const built = qsBuildItems({ words, title: '合併複習',
  kinds: ['flashcard', 'def-match', 'spelling', 'quiz', 'fillblank', 'story', 'sense'],
  ai, stories, sense, maxQ: 10 });
const byType = (t) => built.filter(x => x.type === t);
ok('⭐⭐ 沒有任何一個練習超過 10 題', built.filter(x => x.type !== 'flashcard').every(x => nOf(x) <= 10));
ok('⭐ 測驗／填空／配對／聽寫各切成 3 份、每份 8 題',
   [['quiz', 3], ['fillblank', 3], ['def-match', 3], ['spelling', 3]].every(([t, n]) => {
     const list = t === 'quiz' ? byType('quiz').filter(x => !/字義選擇/.test(x.title)) : byType(t);
     return list.length === n && list.every(x => nOf(x) === 8); }));
ok('⭐⭐ 字義選擇 3 份（Alan 指名的）——而且一份 8 題不是 24 題', (() => {
   const se = byType('quiz').filter(x => /字義選擇/.test(x.title));
   return se.length === 3 && se.every(x => nOf(x) === 8); })());
ok('⭐⭐ 短文填空好幾篇，每篇 6 格、Word Bank 10 個（Alan 指名的）', (() => {
   const st = byType('cloze');
   return st.length === 4 && st.every(x => nOf(x) === 6 && x.wordBank.length === 10); })());
ok('⭐⭐ 單字卡**不切**：它是這一組的底本，所有練習都 linkedFlashcardId 指著它，'
   + '切開會讓複習／再出一份找不到完整的單字表', (() => {
   const fc = byType('flashcard');
   return fc.length === 1 && fc[0].cards.length === 24
     && built.filter(x => x.linkedFlashcardId).every(x => x.linkedFlashcardId === fc[0].id); })());
ok('⭐ 每個單元的 id 都不一樣（切出來的共用同一個 id 會互相蓋掉進度）',
   new Set(built.map(x => x.id)).size === built.length);
ok('⭐ 每一題的 id 也都不一樣', (() => {
   const ids = [];
   built.forEach(x => (x.questions || x.pairs || x.defPairs || x.spellWords || []).forEach(q => ids.push(q.id)));
   return ids.length > 0 && new Set(ids).size === ids.length; })());
ok('⭐ 側欄歸戶還是同一組（group 欄位沒被動到）',
   built.every(x => x.group === '合併複習'));

console.log('\n【5】字少的時候一行都不要變');
const few = Array.from({ length: 8 }, (_, i) => ({ term: 'w' + i, zh: 'z' + i, example: 'I like w' + i + ' today.' }));
const b8 = qsBuildItems({ words: few, title: '一般單字',
  kinds: ['flashcard', 'quiz', 'spelling'],
  ai: few.map(w => ({ term: w.term, zh: w.zh })), maxQ: 10 });
ok('⭐⭐ 8 個字＝每種各一個單元，標題**完全沒有字尾**',
   b8.length === 3 && b8.every(x => x.title === '一般單字'));
ok('   舊的呼叫端只給一篇 story 也還收得進來（複習那條路還在用）', (() => {
   const one = qsBuildItems({ words: few, title: 'X', kinds: ['story'],
     ai: [], story: { title: 's', passage: '[w0] and [w1] went out.' } });
   return one.length === 1 && one[0].type === 'cloze' && one[0].title === 'X · 短文填空'; })());

console.log('\n【6】文法也要拆（Alan：「或是文法 都全部出在一個練習 也太累」）');
const mcq = Array.from({ length: 24 }, (_, i) => ({ q: 'Q' + i, options: ['a', 'b', 'c'], answer: 0 }));
const fill = Array.from({ length: 24 }, (_, i) => ({ prompt: 'P' + i, answer: 'a' }));
const g = gnBuildItems({ title: '現在完成式', mcq, fill, tr: [], rw: [], write: [], tf: [],
  ord: [], edit: null, diag: [], circle: [], sort: null, circleSets: [], sortSets: [], maxQ: 10 });
ok('⭐ 選擇題 24 題 → 3 份 8 題', (() => {
   const q = g.filter(x => x.type === 'quiz');
   return q.length === 3 && q.every(x => x.questions.length === 8); })());
ok('⭐ 填空題也一樣', (() => {
   const f = g.filter(x => x.variant === 'fill');
   return f.length === 3 && f.every(x => x.pairs.length === 8); })());
ok('⭐ 切出來的排在一起（order 用小數，側欄順序不會亂）', (() => {
   const q = g.filter(x => x.type === 'quiz').map(x => x.order);
   const f = g.filter(x => x.variant === 'fill').map(x => x.order);
   return q.every(o => o >= 3 && o < 4) && f.every(o => o >= 4 && o < 5); })());
ok('⭐ 題數在上限內的照樣只出一個單元、標題沒字尾', (() => {
   const g2 = gnBuildItems({ title: 'T', mcq: mcq.slice(0, 8), fill: [], tr: [], rw: [], write: [],
     tf: [], ord: [], edit: null, diag: [], circle: [], sort: null, circleSets: [], sortSets: [], maxQ: 10 });
   const q = g2.filter(x => x.type === 'quiz');
   return q.length === 1 && q[0].title === 'T · 選擇題'; })());
ok('⭐⭐ 單字跟文法用**同一份**切法，不要各寫一份',
   /window\.qsChunkEven/.test(ed) && (ed.match(/qsChunkEven \? window\.qsChunkEven/g) || []).length >= 2
   && !/function gnChunk/.test(ed));

console.log('\n【7】接到畫面上');
ok('⭐ 一鍵出單字有「一個練習最多 N 題」，而且先算給他看', /qs-split-n2/.test(ed)
   && /一個練習最多/.test(ed) && /單字卡不切/.test(ed));
ok('⭐ 一鍵出文法也有同一個欄位', /value=\{gnMaxQ\}/.test(ed) && /maxQ: gnMaxQ,/.test(ed));
ok('⭐⭐ maxQ／stories 要一路點名傳到 qsBuildItems（中間漏一個不會報錯，單元會安靜不見）',
   /window\.qsBuildItems\(\{ words: merged, title, kinds, ai, story, stories, sense, maxQ \}\)/.test(app)
   && /handleQuickSet = \(\{ words, title, cat, kinds, ai, story, stories, sense, maxQ, assign \}\)/.test(app));
ok('   排複習與聊天室那兩條路也要給 stories',
   /qsBuildItems\(\{ words, title, kinds, ai, story, stories, sense \}\)/.test(app)
   && (app.match(/stories/g) || []).length >= 4);
ok('   校稿頁一篇一塊、各自換一篇', /qs-story-one/.test(ed) && /setReStoryAt\(si\)/.test(ed));

console.log(fail ? `\n❌ t-v542：${pass} 過 / ${fail} 失敗` : `\n✅ t-v542：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
