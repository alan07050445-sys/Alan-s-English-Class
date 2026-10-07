/* t-v476 — Alan 回報五件
 *   1. 配對的右邊定義靠右一點，讓線拉開
 *   2. 短文填空：字被劃掉了還是可以繼續選 → 五個空格全變成同一個字
 *   3. 字義選擇：標題在文章內部又寫了一次；title 要大一點
 *   4. 配對連線裡混進一個中文定義
 *   5. 「重出題目中… 8/8」卡很久
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const tune = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));

const V = new Function(pick('const _gnCJK', 'const _GN_FIX_FN')
  + pick('function qsValidSense', 'function _qsSpreadAnswers') + '\nreturn qsValidSense;')();
const R = new Function(pick('function reviewWordsOf', 'function collectWrongQuestions') + '\nreturn reviewWordsOf;')();
const fnEnd = (s, a) => { const i = s.indexOf(a); const j = s.indexOf('\n}\n', i); return s.slice(i, j + 2); };
const build = new Function('window', fnEnd(ed, 'function qsBuildItems') + '\nreturn qsBuildItems;')({});

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】配對連線：線拉長');
ok('⭐ 桌機／平板的欄距拉開了', /@media \(min-width: 761px\)[\s\S]{0,400}column-gap: clamp\(90px, 18vw, 300px\)/.test(tune));
ok('⭐ 左欄有最小寬度（只寫 fr 的話「miraculous (adj.)」會被擠成兩行）',
   /grid-template-columns: minmax\(262px, 0\.55fr\)/.test(tune));
ok('有寫下為什麼', /那比線短還難看/.test(tune));
ok('⭐ 手機那一段不要碰（本來就擠）', /@media \(max-width: 760px\)/.test(fs.readFileSync(new URL('styles-quiz-mode.css', ROOT), 'utf8')));

console.log('\n【2】短文填空：劃掉了就不可以再填一次');
const put = qm.slice(qm.indexOf('const putBankWord'), qm.indexOf('const handleKeyDown'));
ok('⭐ 已經填過的字，再點是「拿回來」不是再填一格',
   /const usedAt = blanks\.find\(b => bankSame\(w, inputs\[b\.num\]\)\)/.test(put) && /handleInput\(usedAt\.num, ''\)/.test(put));
ok('⭐ 而且是提前 return，不會繼續走到「填進空格」', /return;\s*\n\s*\}\s*\n\s*const active = blanks\.find/.test(put));
ok('畫面要講清楚（不然小朋友不知道可以拿回來）', /再點一下可以拿回來/.test(qm));
ok('已使用的按鈕提示也改了', /已經填進去了——點一下拿回來/.test(qm));
ok('有寫下為什麼（連點五下全變同一個字）', /連點五下，五個空格全變成同一個字/.test(qm));

console.log('\n【3】字義選擇：標題不要寫兩次、要夠大');
const mk = (p) => V({ word: 'poverty', title: 'The Kind Neighbors', passage: p,
  options: ['the state of being very poor', 'a kind of warm winter clothing', 'a quiet street in a small town', 'a weekly gift of free food'], answer: 0 });
const BODY = 'An old man lived alone on a quiet street. He had very little money and lived in poverty for many years. His kind neighbors brought him food and warm clothes every week. The man felt grateful.';
ok('⭐ 「Title: 標題」開頭會被清掉', mk('Title: The Kind Neighbors ' + BODY).passage === BODY);
ok('⭐ 只是重複標題（沒有 Title:）也會清掉', mk('The Kind Neighbors ' + BODY).passage === BODY);
ok('本來就乾淨的不要被動到', mk(BODY).passage === BODY);
ok('⭐ 提示詞也改了（根源：本來寫 passage … with a short "title"）',
   /- title: a SHORT headline, 2-5 words\. Put it ONLY here\./.test(data)
   && /never start it with "Title:"/.test(data));
ok('⭐ 標題字級放大（13px 太像裝飾）',
   /\.qm-sense-title \{[^}]*font-size: clamp\(17px, 2\.1vw, 21px\)/.test(tune) && !/\.qm-sense-title \{[^}]*font-size: 13px/.test(tune));

console.log('\n【4】配對連線不可以混進中文');
ok('⭐ 漏掉 def 的字會再問 AI 一次（根本的修法）',
   /const missing = _noRetry \? \[\] : out\.filter\(r => !r\.def\)/.test(data) && /_noRetry: true/.test(data));
ok('   不會無限遞迴', /_noRetry = false/.test(data));
const mixed = build({ title: 'T', kinds: ['def-match'], ai: [],
  words: [{ term: 'skull', def: 'the hard bone that covers the brain' },
          { term: 'fossils', def: 'the hard remains of plants' },
          { term: 'minerals', def: 'natural rocks and metals' },
          { term: 'remains', zh: 'n. 遺骸；殘留物' }] });
ok('⭐ 少數的中文定義會被拿掉（整組要嘛全英文要嘛全中文）',
   mixed[0].defPairs.length === 3 && mixed[0].defPairs.every(p => !/[一-鿿]/.test(p.def)));
const allZh = build({ title: 'T', kinds: ['def-match'], ai: [],
  words: [{ term: 'a', zh: '一' }, { term: 'b', zh: '二' }, { term: 'c', zh: '三' }] });
ok('全中文（老師只貼中文）要保留，不可以整組清空', allZh[0].defPairs.length === 3);
ok('⭐ 中文定義不會被當成 def 傳到下一份（不然錯誤一直傳下去）',
   R([{ type: 'def-match', defPairs: [{ word: 'remains', def: 'n. 遺骸；殘留物' },
                                      { word: 'skull', def: 'the hard bone' }] }])
     .find(x => x.term === 'remains').def === '');

console.log('\n【5】進度不要停在 8/8');
const rv = noComments(ed.slice(ed.indexOf('function ReviewGroupModal'), ed.indexOf('function qsBuildItems')));
ok('⭐ 單字題目做完就換成「還在等誰」', /exP\.then\(\(\) => setSlow\(/.test(rv));
ok('⭐ 等完一個就從清單拿掉', /drop\('短文填空'\)/.test(rv) && /drop\('字義選擇'\)/.test(rv));
ok('⭐ 按鈕真的會顯示它', /slow\.length \? `\$\{slow\.join\('、'\)\}還在出…（要多檢查一輪）`/.test(rv));
ok('⭐ 一鍵出單字那邊也一樣（Alan：這可以套用到所有一鍵生成）',
   (ed.match(/還在出…（要多檢查一輪）/g) || []).length === 2);
ok('⭐ 失敗也要歸零，不然按鈕永遠卡在那句話', (ed.match(/setSlow\(\[\]\); setBusy\(0\)/g) || []).length === 2);
ok('有說明為什麼比較久（要多跑一輪交叉檢查）', /要多檢查一輪/.test(ed));

console.log(`\n${fail ? '❌' : '✅'} t-v476：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
