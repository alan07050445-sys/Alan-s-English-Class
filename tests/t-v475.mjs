/* t-v475 — Alan 用複習那一組時回報三件：
 *   1. 複製過去的單字卡沒有圖片（「這很簡單吧？直接複製過去就好啦？」）
 *   2. 字義選擇的題目字太大、排版亂，目標單字沒有標起來
 *   3. 忘記勾某一個題型 → 只能整組刪掉重生成（「這太笨了，對吧？」）
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const css  = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const D = new Function(pick('function reviewWordsOf', 'function collectWrongQuestions')
  + '\nreturn { reviewWordsOf, qsKindsInGroup };')();
const fnEnd = (s, a) => { const i = s.indexOf(a); const j = s.indexOf('\n}\n', i); return s.slice(i, j + 2); };
const build = new Function('window', fnEnd(ed, 'function qsBuildItems') + '\nreturn qsBuildItems;')({});
const S = new Function(qm.slice(qm.indexOf('function qmSenseParts'), qm.indexOf('/* 把短文裡的目標字標起來'))
  + '\nreturn qmSenseParts;')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】單字卡的圖片要跟著過去');
const FC = [{ type: 'flashcard', cards: [
  { term: 'pursue', zh: '追求', example: 'He pursued his dream.', imageUrl: 'https://x/a.jpg' },
  { term: 'rare', zh: '稀有的', example: 'A rare coin.' }] }];
const ws = D.reviewWordsOf(FC);
ok('⭐ reviewWordsOf 帶得出 imageUrl（本來整個掉了）', ws[0].imageUrl === 'https://x/a.jpg');
ok('沒有圖片的字也不會爆', ws[1].imageUrl === '');
const made = build({ words: ws, title: 'T', kinds: ['flashcard'], ai: [] });
ok('⭐ 建出來的單字卡真的有圖片', made[0].cards[0].imageUrl === 'https://x/a.jpg');
ok('⭐ 一路都用同一個欄位名 imageUrl（學生端讀的就是它）',
   /card\.imageUrl/.test(fs.readFileSync(new URL('components-flashcard.jsx', ROOT), 'utf8')));
ok('⭐ 走「再出一份」那條路（單字變成純文字）也要救得回來',
   /defaultImages/.test(app) && /const withImgs = defaultImages/.test(ed) && /words: withImgs/.test(ed));

console.log('\n【2】字義選擇的排版');
const OLD = { q: 'Ocean Floor Discovery\nThe diver found an astonishing collection of pottery.\n\nBased on the passage above, what does astonishing mean?' };
const o = S(OLD);
ok('⭐ v475 以前建好的也會變乾淨（不用重出）', !!o && o.title === 'Ocean Floor Discovery');
ok('⭐ 短文與問題切得開', o.passage === 'The diver found an astonishing collection of pottery.' && /what does astonishing mean/.test(o.ask));
ok('⭐ 連該標起來的字也認得出來', o.word === 'astonishing');
ok('⭐ 新單元直接分開存，不用猜',
   /passage: x\.passage, passageTitle: x\.title \|\| '', word: x\.word \|\| '', ask: x\.q/.test(ed));
ok('   但 q 還是留著完整內容（別的路徑看得懂）', /q: `\$\{x\.title \? x\.title \+ '\\n' : ''\}\$\{x\.passage\}/.test(ed));
ok('⭐ 別的題型不可以被誤判成字義選擇',
   S({ q: 'The lion ___ the zebra.\n\nChoose the correct answer.' }) === null && S({ q: 'v. 追求' }) === null);
ok('新格式優先用存好的欄位', S({ passage: 'p', passageTitle: 'T', word: 'rare', ask: 'What does rare mean?' }).word === 'rare');
ok('⭐ 短文用內文字級，不是題目的 52px',
   /\.qm-sense-passage \{[^}]*font-size: clamp\(17px/.test(css) && !/\.qm-sense[^{]*\{[^}]*font-size: 52px/.test(css));
ok('⭐ 目標字是螢光筆（底色＋粗體，不是換顏色——色盲也看得見）',
   /\.qm-sense-mark \{ background: #FFE58F;[^}]*font-weight: 700/.test(css));
ok('⭐ 播放器真的用了新排版', /const sp = qmSenseParts\(q\);/.test(qm) && /className="qm-sense-passage"/.test(qm));
ok('字會變形（pursue → pursued）也標得到', /字會變形（pursue → pursued）/.test(qm));
ok('窄螢幕有收一下', /@media \(max-width: 560px\) \{\s*\n\s*\.qm-sense \{/.test(css));

console.log('\n【3】只補漏掉的那一個，不用整組刪掉重生成');
ok('⭐ 算得出這一組已經有哪些題型',
   D.qsKindsInGroup([{ type: 'def-match', defPairs: [1] }, { type: 'cloze' }, { type: 'spelling', spellWords: [1] }])
     .sort().join() === 'def-match,spelling,story');
ok('⭐ 字義選擇與測驗都是 quiz，要靠標題分得開',
   D.qsKindsInGroup([{ type: 'quiz', title: 'A · 字義選擇' }, { type: 'quiz', title: 'A' }]).sort().join() === 'quiz,sense');
ok('空的單元不算（有殼沒內容）', D.qsKindsInGroup([{ type: 'flashcard', cards: [] }]).length === 0);
ok('什麼都沒有不會爆', D.qsKindsInGroup(null).length === 0);
ok('⭐ 已經有的題型預設取消勾選', /alreadyHave\.indexOf\(k\.id\) < 0/.test(ed));
/* ⚠ 這一條本來釘的是「程式長這樣」（setPicked({ flashcard: true…）。
   它通過了九個版本，卻完全沒發現同一個 effect 後面還有第二個 setPicked
   把它整個蓋掉——v475 這個功能其實一天都沒生效過（v487 才抓到）。
   改成釘**結果**：每一種題型都要被勾起來，而且清單不可以是另外手寫的一份。 */
ok('⭐ 沒有從「再出一份」進來時，維持原本的預設（全勾、含之後新增的題型）', (() => {
   const noC = ed.replace(/\/\*[\s\S]*?\*\//g, '');
   const i = noC.indexOf('if (open) { setText(defaultText');
   const eff = noC.slice(i, noC.indexOf('}, [open]);', i));
   // 同一個狀態在一個 effect 裡只能設一次（if / else 各一次）
   if ((eff.match(/setPicked\(/g) || []).length !== 2) return false;
   return /QS_DEFAULT_KINDS\.reduce/.test(eff)
       && /const QS_DEFAULT_KINDS = QS_KINDS\.map/.test(noC); })());
ok('⭐ 畫面要講清楚（不然老師以為少勾了）',
   /這一組已經有：/.test(ed) && /只補那幾個，原本的一題都不會動/.test(ed));
ok('⭐ 每一個已經有的題型自己也標「已經有了」', /qs-kind-has/.test(ed) && /\.qs-kind-has \{/.test(css));
ok('老師還是可以自己勾回去（他可能就是想重出一份）', /想重出一份不一樣的，自己勾回去就好/.test(ed));
ok('⭐ app.jsx 有把「已經有哪些」算好傳下去',
   /have: \(window\.qsKindsInGroup && window\.qsKindsInGroup\(gItems\)\) \|\| \[\]/.test(app)
   && /alreadyHave=\{\(regenFor && regenFor\.have\) \|\| null\}/.test(app));

console.log(`\n${fail ? '❌' : '✅'} t-v475：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
