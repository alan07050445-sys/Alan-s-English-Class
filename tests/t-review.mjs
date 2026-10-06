/* t-review — v466（Alan：「我想製作一個複習的方式，但題目我又要重新生成，
 *   如果不生成題目又一樣，小朋友會背答案。單字卡當然不用再換，
 *   但 fill in the blank 或故事型的題目就可以換」）
 *
 * 真 AI 實測（同一批字出兩次，第二次把第一次的句子當 avoid 傳進去）：
 *   第一次：The lion ___ the zebra across the hot desert sand yesterday.
 *   第二次：The desert fox ___ the small rabbit across the sandy ground yesterday.
 *   用字重疊超過一半的 0/4 題、一模一樣的 0 題。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const qm = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');

// 真的把兩個抽素材的函式切出來跑
const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const R = new Function(pick('function reviewWordsOf', 'function collectWrongQuestions')
  + '\nreturn { reviewWordsOf, reviewSeenSentences };')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const ITEMS = [
  { type: 'flashcard', cards: [
    { term: 'pursued', zh: '追趕', example: 'The dog pursued the ball.' },
    { term: 'boulders', zh: '巨石', example: 'Big boulders blocked the road.' },
    { term: '', zh: 'x' },                                   // 空的要濾掉
  ] },
  { type: 'quiz', questions: [{ q: 'The lion ___ the zebra.' }] },
  { type: 'type-answer', pairs: [{ prompt: 'He ___ the thief.' }] },
  { type: 'cloze', passage: 'Long ago, [boulders](boulder) fell down the hill.' },
  { type: 'circle-answer', circleQuestions: [{ sentence: 'The fox pursued the rabbit.' }] },
  { type: 'sentence-order', orderQuestions: [{ words: ['Do', 'you', 'like', 'pizza?'] }] },
];

console.log('\n【1】單字從哪來：單字卡本來就存了，不用老師再貼一次');
const w = R.reviewWordsOf(ITEMS);
ok('⭐ 拿得到單字＋中文＋例句', w.length === 2 && w[0].term === 'pursued' && w[0].zh === '追趕' && !!w[0].example);
ok('空的卡片會濾掉', w.every(x => x.term));
ok('沒有單字卡就回空陣列（不會爆）', R.reviewWordsOf([{ type: 'quiz' }]).length === 0);

console.log('\n【2】「上次出過的句子」要抓得乾淨——漏一種，那一種就會原封不動再出一次');
const seen = R.reviewSeenSentences(ITEMS);
ok('⭐ 單字卡的例句', seen.includes('The dog pursued the ball.'));
ok('⭐ 選擇題／填空的題幹', seen.includes('The lion ___ the zebra.'));
ok('⭐ 打字題的題幹', seen.includes('He ___ the thief.'));
ok('⭐ 找出來的句子', seen.includes('The fox pursued the rabbit.'));
ok('⭐ 排順序的句子', seen.includes('Do you like pizza?'));
ok('⭐ 短文（把答案挖掉再比對，不然會把答案洩漏進 prompt）',
   seen.some(x => /Long ago, ___\(boulder\) fell down/.test(x)));
ok('不會重複', new Set(seen).size === seen.length);

console.log('\n【3】告訴 AI「這些不可以再用」');
ok('⭐ 有共用的 _aiAvoidNote', /function _aiAvoidNote\(avoid\)/.test(data));
ok('⭐ 明講這是複習、學生看過了', /this is a REVIEW round, so the student has seen these before/.test(data));
ok('⭐ 不准只換一個字（實測：只說「要不一樣」沒有用）',
   /do not just swap one word/.test(data) && /v461 的分一分就實測過這件事/.test(data));
ok('只放前 24 句（再多只會把 prompt 撐大）', /\.slice\(0, 24\)/.test(data));
ok('單字題目收 avoid', /aiMakeVocabExercises\(words, \{[^}]*avoid = \[\]/.test(data));
ok('短文填空也收 avoid', /aiMakeVocabStory\(words, \{[^}]*avoid = \[\]/.test(data));
// ⚠ 計數要扣掉定義那一行（function _aiAvoidNote(avoid) 也會被比對到）
ok('兩邊都真的把它放進 prompt（單字題目＋短文填空）',
   (data.match(/_aiAvoidNote\(avoid\)/g) || []).length >= 2);   // ⚠ 不要寫死幾個，之後只會愈來愈多

console.log('\n【4】老師端：排到別週');
ok('⭐ 組的選單有「排一份複習到別週」', /🔁 排一份複習到別週…/.test(qm));
/* v469：文法也能排複習了，所以條件變成「有單字卡**或**有互動教學」。
   真正該擋的是兩個都沒有的組（按了也沒東西可以重出）。 */
ok('兩個都沒有的組不顯示這個選項（按了也沒用）',
   /window\.reviewWordsOf\(g\.items\)\.length >= 2\)\s*\n?\s*\|\|\s*\(window\.reviewGrammarOf/.test(qm));
ok('有 ReviewGroupModal', /function ReviewGroupModal\(/.test(ed) && /ReviewGroupModal \}\);/.test(ed));
ok('⭐ 預設排到「兩週後」（Alan：每隔一週複習一次）',
   /const defWeek = \(weekChoices \|\| \[\]\)\[curIx \+ 2\]/.test(ed));
ok('⭐ 單字卡不給取消（Alan：單字卡當然不用再換）',
   /\['flashcard',\s*'🃏 單字卡（同一批字，不重出）', true\]/.test(ed) && /disabled=\{fixed\}/.test(ed));
ok('可以順便設成那一週的作業', /順便設成那一週的作業/.test(ed));
ok('也可以寫這次的特別要求（v445 的那個框）', /<window\.AiNoteBox value=\{note\}/.test(ed));

console.log('\n【5】寫進目標週');
ok('⭐ 有 handleCreateReview', /const handleCreateReview = \(\{ targetWeekId/.test(app));
ok('組名加「· 複習」（側欄才分得出來）', /const title = `\$\{groupName\} · 複習`;/.test(app));
ok('⭐ id 一定要換新的，不然跟原本那一週同 id、進度會互相蓋掉',
   /while \(taken\.has\(id\)\) \{ id = `\$\{it\.id\}-\$\{n\}`; n\+\+; \}/.test(app)
   && /進度會互相蓋掉|學生做完會互相蓋掉進度/.test(app));
ok('要設作業就一起設', /if \(dueDate\) w\[targetWeekId\]\.homework\[id\] = \{ dueDate \};/.test(app));
ok('存檔走 saveWeeksSafe（存不進去會有紅條——v447）', /saveWeeksSafe\(w\);\s*\n\s*setReviewFor\(null\);/.test(app));

console.log('\n【6】文法複習的前置：教學重點要先存下來');
ok('⭐ 教學單元存 srcNotes', /srcTopic: topic \|\| g, srcNotes: String\(srcNotes \|\| ''\)\.slice\(0, 4000\)/.test(ed));
ok('有寫下為什麼（以前生成完就丟掉）', /以前生成完就丟掉了——所以兩週後想重出一份不一樣的文法題/.test(ed));
ok('校稿頁建立時有把 notes 傳下去', /srcNotes: res\.sheet \? res\.sheet\.notes : ''/.test(ed));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
