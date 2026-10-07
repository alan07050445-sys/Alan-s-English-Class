/* t-review-kinds — 🔴 v473（Alan 看了複習出來的結果，回報三件事）
 *   1. 沒有短文填空
 *   2. 不需要出額外單字卡，但至少要給「是否複習單字卡」這個選項
 *   3. 也沒有新出的字義選擇
 *
 * 三個都是真的 bug，而且都是「說一套、做一套」：
 *   · 短文：生出來了（花掉一次 AI 請求）**然後被丟掉**——run() 把 'story' 從
 *     kinds 濾掉，但 qsBuildItems 正是靠 kinds 裡有 'story' 才會建那個單元。
 *   · 單字卡：畫面上打勾且不能取消、說明寫「會照抄一份過去」，但 kinds 的預設值
 *     裡根本沒有 flashcard ——**從來沒有抄過**。
 *   · 字義選擇：v468 做好了，但 QuickSetModal 的 canDo 漏了這一項 → undefined
 *     → 選項永遠是灰的寫著「資料不夠」，做出來到現在一次都按不下去。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const ed  = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const qm  = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');

const fnEnd = (s, a) => { const i = s.indexOf(a); const j = s.indexOf('\n}\n', i); return s.slice(i, j + 2); };
const build = new Function('window', fnEnd(ed, 'function qsBuildItems') + '\nreturn qsBuildItems;')({});
/* ⚠ 比對程式碼之前要先把註解拿掉——這些修正的註解裡本來就會引用「以前錯的寫法」
   （例：「本來是 .catch(() => null)」），不拿掉的話會自己打到自己。 */
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const reviewRaw = ed.slice(ed.indexOf('function ReviewGroupModal'), ed.indexOf('function qsBuildItems'));
const review = noComments(reviewRaw);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const WORDS = [{ term: 'treasure', zh: '寶藏' }, { term: 'rare', zh: '稀有的' }, { term: 'ancient', zh: '古代的' }];
const AI = WORDS.map(w => ({ term: w.term, word: w.term, zh: w.zh, def: 'a ' + w.term, sentence: 'A ___ is here.' }));
const STORY = { passage: 'Long ago a [treasure] sat in a [rare] and [ancient] place.', wordBank: [] };
const SENSE = WORDS.map((w, i) => ({ word: w.term, title: 'T', passage: 'p', q: 'What does it mean?',
  options: ['a', 'b', 'c', 'd'], answer: i % 4, explain: '' }));
const made = (kinds) => build({ words: WORDS, title: 'Rare Treasure · 複習', kinds, ai: AI, story: STORY, sense: SENSE });

console.log('\n【1】短文填空：生出來就要真的建成單元');
const all = made(['quiz', 'fillblank', 'story', 'sense', 'def-match', 'spelling']);
ok('⭐ kinds 有 story → 真的建出 cloze 單元', all.some(i => i.type === 'cloze'));
ok('⭐ run() 不可以再把 story 濾掉（濾掉就等於白生一次）',
   !/kinds\.filter\(k => k !== 'story'\)/.test(review) && /\n\s*kinds,\n/.test(review));
ok('有寫下為什麼（不然下次有人「順手」濾回去）', /生出來了（花了一次 AI 請求），然後被丟掉/.test(reviewRaw));

console.log('\n【2】單字卡：要是真的選項，不是「打勾但其實沒做」');
ok('⭐ 預設不放單字卡（Alan：「不需要出額外單字卡」）',
   !/useS\(\['quiz', 'fillblank', 'story', 'sense', 'def-match', 'spelling', 'flashcard'/.test(review)
   && !all.some(i => i.type === 'flashcard'));
ok('⭐ 但勾了就要真的放（怕學生忘記）',
   made(['quiz', 'flashcard']).some(i => i.type === 'flashcard'));
ok('⭐ 選項可以按（不再是 disabled）',
   /\['flashcard',\s*'🃏 也放一份單字卡（怕學生忘記）', false\]/.test(review));
ok('說明文字要跟實際行為一致（本來寫「會照抄一份過去」但從來沒抄）',
   /預設<b>不<\/b>放單字卡/.test(review) && !/單字卡會照抄一份過去/.test(noComments(ed)));

console.log('\n【3】字義選擇：v468 做好了卻一直按不下去');
ok('⭐ QuickSetModal 的 canDo 要有 sense（本來是 undefined ＝ 永遠灰的）',
   /sense: useAI && words\.length >= 2,/.test(ed));
ok('⭐ 只勾字義選擇也要去叫 AI（wantAI 本來沒算它）',
   /picked\.story \|\| picked\.sense\)/.test(ed));
ok('⭐ 複習視窗也有字義選擇', /\['sense',\s*'🔎 字義選擇（康橋第一大題）'/.test(review));
ok('⭐ 複習時會真的去生（而且帶 avoid，短文不會跟上次一樣）',
   /aiMakeVocabSense\(w, \{ hint: groupName[^)]*avoid: seen/.test(review));
ok('⭐ sense 一路傳到 qsBuildItems', /qsBuildItems\(\{ words, title, kinds, ai, story, sense \}\)/.test(app)
   && /groupName, words: w, ai, story, sense,/.test(review));
ok('⭐ 建得出字義選擇單元', made(['sense']).length === 1 && made(['sense'])[0].type === 'quiz');

console.log('\n【4】側欄分得出誰是誰（兩個都是 type:"quiz"）');
const senseUnit = made(['quiz', 'sense']).find(i => /字義選擇$/.test(i.title));
ok('⭐ 字義選擇的標題要跟「測驗」不一樣，不然側欄並排兩個「測驗」', !!senseUnit);
const line = qm.split('\n').find(l => l.startsWith('const QM_TYPE_WORDS'));
const re = () => new RegExp(line.slice(line.indexOf('/(') + 1, line.lastIndexOf('/gi')), 'gi');
const keyOf = (t) => String(t).toLowerCase().replace(re(), '').replace(/[\s\-–—_·．.。,，()（）0-9０-９]+/g, '');
const g = 'Rare Treasure · 複習';
ok('⭐ 加了字尾還是歸在同一組（QM_TYPE_WORDS 要補，不然會自己落單）',
   keyOf(g) === keyOf(g + ' · 字義選擇'));
ok('⭐ 順手修掉：短文填空本來也會落單（只剝掉「填空」，剩下「短文」）',
   keyOf(g) === keyOf(g + ' · 短文填空'));

console.log('\n【5】失敗不可以默默消失');
ok('⭐ 短文／字義選擇失敗時會告訴老師，不是悄悄少一個單元',
   /這次沒出來（AI 回得不乾淨）/.test(review) && !/\.catch\(\(\) => null\)/.test(review));
ok('但不會拖垮其他已經出好的練習', /其他都出好了，只有/.test(review));
ok('⭐ 一鍵出單字那邊本來也是悄悄吃掉——全站都不可以再有 .catch(() => null)',
   !/\.catch\(\(\) => null\)/.test(noComments(ed)));

console.log(`\n${fail ? '❌' : '✅'} t-review-kinds：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
