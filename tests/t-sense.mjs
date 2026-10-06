/* t-sense — v468：康橋單字考卷的第 1 大題「字義選擇題」
 *
 * Alan 2026-10-06 給的 G3/G4 考卷，Section I 的 A 一定是這一種（10%、5 題）：
 *   短文裡一個目標字 →「Based on the passage above, what does X mean?」
 *   四個選項**全是定義**，干擾項是**同一個字的其他語意**
 *   （shade：涼爽處 ✅／偏暗的顏色／燈罩／把東西藏起來）
 * ⚠ 這跟現有的「配對連線」不是同一件事——配對是「字↔定義」，這是「同一個字的哪一個意思」。
 *
 * 真 AI 實測：5/5 出得出來、3.6~6s、正解位置 A B C D A（分散）。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const V = new Function('const _AI_MINIFY = "";\n'
  + pick('const _gnCJK', 'async function _gnCall')
  + pick('function qsValidSense', 'async function aiMakeVocabExercises')
  + '\nreturn { qsValidSense, _qsSpreadAnswers };')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const P = 'On hot summer days the birds rest in the shade under the big trees. The cool spot helps them stay comfortable and happy all afternoon long.';
const good = { word: 'shade', title: 'Birds Rest', passage: P, answer: 0,
  options: ['a cool place out of the sun', 'a colour that is a little dark', 'a cover for a lamp', 'to hide something from someone'] };

console.log('\n【1】出題規則對齊康橋');
ok('⭐ 題幹固定寫法（跟考卷一樣）', /Based on the passage above, what does \$\{word\} mean\?/.test(data));
ok('⭐ 干擾項必須是「同一個字的其他語意」，不是別的單字的定義',
   /must be OTHER REAL MEANINGS OF THE SAME WORD/.test(data) && /never the definition of a different word/.test(data));
ok('prompt 直接拿考卷上的 shade 當範例', /Example for "shade"/.test(data));
ok('四個選項詞性與長度要相近（不然選最長的就對——v417 的教訓）',
   /so the longest one\s*\n\s*is not always the answer/.test(data));
ok('⚠ 有寫清楚跟配對連線不是同一件事', /這跟現有的「配對連線」\*\*不是同一件事\*\*/.test(data));

console.log('\n【2】程式擋得住的');
ok('⭐ 正常的收得下', !!V.qsValidSense(good));
ok('⭐ 目標字在短文裡出現兩次 → 擋掉（「哪一個用法」就不唯一了）',
   !V.qsValidSense({ ...good, passage: P + ' The shade was nice.' }));
ok('目標字根本沒出現 → 擋掉', !V.qsValidSense({ ...good, word: 'eagle' }));
ok('選項不是四個 → 擋掉', !V.qsValidSense({ ...good, options: good.options.slice(0, 3) }));
ok('選項重複 → 擋掉', !V.qsValidSense({ ...good, options: ['a', 'a', 'b', 'c'] }));
ok('正解索引超出範圍 → 擋掉', !V.qsValidSense({ ...good, answer: 9 }));
ok('有中文 → 擋掉', !V.qsValidSense({ ...good, passage: P + ' 這是中文。' }));
ok('短文太短 → 擋掉', !V.qsValidSense({ ...good, passage: 'Birds rest in the shade.' }));
ok('⭐ 正解比別人長太多 → 擋掉（v417：學生會發現「選最長的就對」）',
   !V.qsValidSense({ ...good, options: ['a cool and very pleasant place well out of the hot summer sun today', 'dark', 'lamp', 'hide'] }));
ok('⭐ 允許自然變化形（soar → soaring）', !!V.qsValidSense({ ...good, word: 'rest',
   passage: 'The eagle needs a quiet place. It will rest on the tall branch after a long day of flying over the wide green valley.' }));

console.log('\n【3】正解位置要攤平（模型很愛一直放同一格）');
const sp = V._qsSpreadAnswers([0, 0, 0, 0, 0].map((_, i) => ({ ...good, word: 'w' + i })));
ok('⭐ 五題的正解位置變成 A B C D A', sp.map(x => x.answer).join('') === '01230');
ok('⭐ 攤平之後正解的「內容」還是對的（不是只改索引）',
   sp.every(x => x.options[x.answer] === good.options[0]));

console.log('\n【4】⭐ 模型會把答案標錯 → 第二個 AI 自己作答比對');
ok('有交叉檢查', /You answer ONE multiple-choice vocabulary question/.test(data));
ok('⭐ 對不上就不給學生', /return pick\.answer === x\.answer \? x : null;/.test(data));
ok('⚠ 有記下實測：trapping 的正解被標成「making a sound」', /它標成「making a sound」/.test(data));
ok('⭐ 被擋掉的字會再出一次（不然老師貼 8 個字只拿到 4 題）',
   /const miss = list\.filter\(w => !got\.some/.test(data) && /再出一次/.test(data));
ok('檢查器掛掉不擋住老師', /檢查器掛掉不擋住老師/.test(data));
ok('照老師貼的順序排回去', /got\.sort\(\(a, b\) => ix\(a\) - ix\(b\)\);/.test(data));

console.log('\n【5】老師端');
ok('題型清單有「字義選擇」', /id: 'sense',\s+zh: '字義選擇'/.test(ed));
ok('⭐ 沿用 quiz，不新增題型（v414 的教訓）', /kinds\.indexOf\('sense'\) >= 0 && \(sense \|\| \[\]\)\.length >= 2/.test(ed));
ok('⭐ 不可以再 shuffle（正解位置已經攤平過，再洗會打亂）',
   /不能 shuffle 選項：正解位置已經由程式攤平過/.test(ed) && !/id: 'qs' \+ stamp \+ 'se'[^}]*shuffle: true/.test(ed));
ok('短文放進題幹，學生讀得到', /\$\{x\.passage\}\\n\\n\$\{x\.q\}/.test(ed));
ok('校稿頁可以改短文與四個選項', /qs-sense-q/.test(ed) && /qs-sense-opt/.test(ed));
ok('校稿頁說清楚干擾項要怎麼寫', /換成別的單字的定義就變回配對題了/.test(ed));
ok('沒出成功的字會告訴老師', /個字沒出成功（答案對不上就不給學生）/.test(ed));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
