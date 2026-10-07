/* t-group-menu — 🔴 v474（Alan 用「整組」選單時回報三件事）
 *   1. 整組無法直接刪掉
 *   2. 「再出一份題目」是白色字體完全看不到，而且「這份很明顯就是單字，幹嘛還要選？」
 *   3. 選完之後還要再貼一次單字——「這太笨了，因為我本來就有單字了啊」
 *
 * 2 的成因：.edit-make-btn 那組顏色是給**深色的老師編輯列**用的（白字配深底），
 *   v454 把同一組 class 搬進**白底彈窗** → 白字配白底。
 *   實測對比度：白底彈窗 17.35 / 5.11、深色編輯列 10.83 / 5.28，兩邊都過 AA。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const qm  = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const ed  = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const css = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const R = new Function(pick('function reviewWordsOf', 'function collectWrongQuestions')
  + '\nreturn reviewWordsOf;')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】整組刪掉');
ok('⭐ 選單裡有「整組刪掉」', /🗑 整組刪掉/.test(qm));
ok('⭐ 會先問清楚（刪哪一組、幾個單元；刪掉救不回來）',
   /刪掉「\$\{g\.name\}」整組 \$\{g\.items\.length\} 個單元？/.test(qm) && /救不回來/.test(qm));
ok('長得不一樣，不會跟旁邊的手滑按錯', /qm-grp-ghost danger/.test(qm) && /\.qm-grp-ghost\.danger \{ color: #C62828/.test(css));
ok('⭐ 跟刪單一單元共用同一份清理邏輯（孤兒作業、練習鎖都要清）',
   /const handleDeleteItem = \(itemId\) => handleDeleteItems\(\[itemId\]\);/.test(app));
ok('⭐ 一次處理完只存一次（不是迴圈呼叫、每次重讀 weeksRef）',
   !/\.forEach\(\s*\w+\s*=>\s*handleDeleteItem\(/.test(app) && /不要寫成「迴圈呼叫 handleDeleteItem」/.test(app));
/* v477：清理那一段抽成 stripItemsFrom 了（刪整組、搬到別週都要做同一件事），
   所以要去那裡比，不是比 handleDeleteItems 的函式本體。守的事情沒變。 */
const strip = app.slice(app.indexOf('const stripItemsFrom'), app.indexOf('const handleDeleteItems'));
const del = app.slice(app.indexOf('const handleDeleteItems'), app.indexOf('const handleDeleteItem = (itemId)'));
ok('整組刪掉時，孤兒作業一樣會清掉（v460 那個天天催的坑）', /delete wk\.homework\[id\]/.test(strip));
ok('別人的「要先學完這一個」鎖也要解掉', /ids\.has\(it\.requires\)/.test(strip) && /ids\.has\(it\.linkedFlashcardId\)/.test(strip));
ok('空的不會爆', /if \(!ids\.size\) return;/.test(del) && /if \(!wk \|\| !wk\.items \|\| !ids \|\| !ids\.size\) return;/.test(strip));
ok('⭐ 刪整組與搬到別週共用同一份清理（漏一邊就會留下孤兒作業）',
   /stripItemsFrom\(w\[weekId\], ids\)/.test(del) && /if \(move\) stripItemsFrom\(w\[weekId\]/.test(app));

console.log('\n【2】白字配白底');
ok('⭐ 白底彈窗有自己的一組顏色', /\.modal \.edit-make-btn \{/.test(css));
ok('⭐ 用的是深色文字，不是白色', /\.modal \.edit-make-btn \{[^}]*color: var\(--ink\)/.test(css));
ok('⭐ 說明小字也要看得見（本來是 rgba(251,248,241,.62)＝幾乎白色）',
   /\.modal \.edit-make-btn em \{ color: var\(--ink-muted\); \}/.test(css));
ok('深色編輯列那一組不可以被改壞（它本來就是對的）',
   /^\.edit-make-btn \{[\s\S]*?color: #fbf8f1;/m.test(css));
ok('有寫下為什麼（同一組 class 用在兩種底色上）', /同一組 class 用在兩種底色上/.test(css));
ok('彈窗比編輯列窄，三欄要會折行', /@media \(max-width: 760px\) \{ \.modal \.edit-make/.test(css));

console.log('\n【3】認得出是什麼組就不要再問');
const regen = noComments(app.slice(app.indexOf('onRegenGroup={'), app.indexOf('onReviewGroup={')));
ok('⭐ 單字組直接開「一鍵出單字」，不出選單',
   /ws\.length >= 2/.test(regen) && /pick: false/.test(regen) && /setQuickSetOpen\(true\)/.test(regen));
ok('⭐ 文法組直接開「一鍵出文法」', /reviewGrammarOf/.test(regen) && /setGnGenOpen\(true\)/.test(regen));
ok('⭐ 真的認不出來才退回選單（不是整個拿掉）', /setRegenFor\(\{ catId, name, pick: true \}\)/.test(regen));
ok('⭐ 本來把 items 丟掉了（第三個參數收了沒用）', /onRegenGroup=\{\(catId, name, gItems\) =>/.test(app));

console.log('\n【4】不要再貼一次單字');
ok('⭐ 單字照 QuickSetModal 吃的格式組回去（英文 - 中文 - 例句 - 英文定義）',
   /\[x\.term, x\.zh, x\.example, x\.def\]\.filter\(Boolean\)\.join\(' - '\)/.test(regen));
ok('⭐ 一鍵出單字收 defaultText 並真的填進去',
   /function QuickSetModal\(\{[^}]*defaultText/.test(ed) && /setText\(defaultText \|\| ''\)/.test(ed));
ok('⭐ 一鍵出文法也先填好原本的教學重點',
   /function GrammarNotesModal\(\{[^}]*defaultText/.test(ed) && /setText\(defaultText \|\| ''\)/.test(noComments(ed)));
ok('⭐ app.jsx 兩邊都傳下去', (app.match(/defaultText=\{\(regenFor && regenFor\.text\) \|\| ''\}/g) || []).length === 2);

console.log('\n【5】複習組沒有單字卡也要找得到字（v473 之後預設就不放了）');
const noFc = [
  { type: 'def-match', defPairs: [{ word: 'treasure', def: 'something valuable' }, { word: 'rare', def: 'not common' }] },
  { type: 'spelling', spellWords: [{ word: 'treasure', zh: '寶藏' }, { word: 'ancient', zh: '古代的' }] },
  { type: 'cloze', passage: 'A [treasure] sat in an [ancient] [chest].' },
];
const got = R(noFc);
ok('⭐ 從配對連線／聽寫／短文填空反推得出單字', got.length === 4);
ok('⭐ 同一個字只算一次，而且把各處的資料併起來',
   got.filter(w => w.term === 'treasure').length === 1
   && got.find(w => w.term === 'treasure').zh === '寶藏'
   && got.find(w => w.term === 'treasure').def === 'something valuable');
ok('短文填空的 [word|提示] 只取字本身', R([{ type: 'cloze', passage: 'The [chest|n.] is here.' }])[0].term === 'chest');
ok('⭐ 有單字卡時還是以單字卡為準（它最完整：中文＋例句）',
   R([{ type: 'flashcard', cards: [{ term: 'a', zh: '一', example: 'An a.' }] },
      { type: 'spelling', spellWords: [{ word: 'zzz' }] }]).length === 1);
ok('什麼都沒有就回空陣列（不會爆）', R([{ type: 'quiz' }]).length === 0 && R(null).length === 0);
ok('⭐ 這也修好了「複習組自己不能再排複習」', R(noFc).length >= 2);

console.log(`\n${fail ? '❌' : '✅'} t-group-menu：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
