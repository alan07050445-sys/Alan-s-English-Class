/* t-v479 — Alan 回報五件（#4 是教錯文法，最嚴重）
 *   1. 改寫句子的輸入框太小（要打一整句）
 *   2. 整段改錯把沒錯的字也要求圈起來（more crunchier 的 crunchier、good than 的 than）
 *   3. 「改成正確的」跟「改寫句子」長得一模一樣
 *   4. 🔴 "That pizza is more delicious than this pizza." 被說成錯的
 *      —— delicious 三音節，本來就該用 more。教錯的文法比少一題嚴重得多。
 *   5. 三個「改成正確的…」看不出差別
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const tune = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const F = new Function(pick('const _GN_IRREG_CMP', 'function gnValidEditPara')
  + '\nreturn { _gnDegreeKind, _gnCmpClaimOk, _gnChangedWords, _gnSyl };')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【4】🔴 比較級：不可以說正確的句子是錯的');
const K = F._gnDegreeKind;
ok('⭐ 一音節用 -er', ['big', 'sweet', 'tall', 'fast'].every(w => K(w) === 'er'));
ok('⭐ 兩音節字尾 y/er/ow/le 用 -er', ['happy', 'clever', 'narrow', 'crunchy', 'yummy'].every(w => K(w) === 'er'));
ok('⭐ 三音節以上用 more', ['delicious', 'beautiful', 'expensive', 'important'].every(w => K(w) === 'more'));
ok('⭐ 其他兩音節用 more', ['careful', 'famous', 'boring'].every(w => K(w) === 'more'));
ok('不規則另外認得', ['good', 'bad', 'far'].every(w => K(w) === 'irregular'));
ok('音節數會算（silent e 要扣掉）', F._gnSyl('delicious') === 3 && F._gnSyl('big') === 1 && F._gnSyl('simple') === 1);

const C = F._gnCmpClaimOk;
const block = [
  ['That pizza is more delicious than this pizza.', 'That pizza is deliciouser than this pizza.', '🔴 Alan 截到的那一題'],
  ['That pizza is more delicious than this.', 'That pizza is delicious than this.', '叫他把 more 拿掉'],
  ['She is taller than me.', 'She is more tall than me.', 'tall 該用 -er 卻說要 more'],
  ['He is happier than me.', 'He is more happy than me.', 'happy 該用 -er（happier 要還原成 happy 才認得出）'],
  ['It is more expensive than mine.', 'It is expensiver than mine.', 'expensive 該用 more（加 -er 會去掉字尾 e）'],
  ['This is the most beautiful garden.', 'This is the beautifulest garden.', '最高級同理'],
];
block.forEach(([b, f, n]) => ok('⭐ 擋掉：' + n, C(b, f) === false));
const allow = [
  ['My bag is more big than yours.', 'My bag is bigger than yours.', 'big 該用 -er（真的錯）'],
  ['The frosting was more sweet than vanilla.', 'The frosting was sweeter than vanilla.', 'sweet 該用 -er（真的錯）'],
  ['Tom brought cookies that were more crunchier than mine.', 'Tom brought cookies that were crunchier than mine.', '雙重比較級（真的錯）'],
  ['We sold the most yummiest treats in school.', 'We sold the yummiest treats in school.', '雙重最高級（真的錯）'],
  ['This book is beautifuler than that one.', 'This book is more beautiful than that one.', 'beautiful 該用 more（真的錯）'],
  ['The cake is more delicious than the pie.', 'The cake is the most delicious one.', 'more→most 不關這條事'],
  ['My pizza more delicious than your pizza.', 'My pizza is more delicious than your pizza.', '少了 is（more delicious 沒被動到）'],
  ['I have more books than you.', 'I have many books.', 'more 當數量詞'],
];
allow.forEach(([b, f, n]) => ok('放行：' + n, C(b, f) === true));
ok('⭐ 診斷題會用它擋', /if \(!_gnCmpClaimOk\(broken, fixed\)\) return null;/.test(data));
ok('⭐ 整段改錯也會用它擋（而且是放在整句裡比，不是只比詞組）',
   /_gnCmpClaimOk\(e\.sentence \|\| e\.wrong,\s*\n?\s*\(e\.sentence \|\| e\.wrong\)\.replace\(e\.wrong, e\.right\)\)/.test(data));
ok('⭐ 提示詞也教了這條規則（不要只靠擋，不然會一直重試）',
   /more delicious" and "the most beautiful" are CORRECT English/.test(data));

console.log('\n【2】只圈真的改到的字');
const D = F._gnChangedWords;
ok('⭐ more crunchier → crunchier：只圈 more', JSON.stringify(D('more crunchier', 'crunchier')) === '["more"]');
ok('⭐ good than → better than：只圈 good', JSON.stringify(D('good than', 'better than')) === '["good"]');
ok('⭐ more sweet → sweeter：兩個字都得改，兩個都圈', JSON.stringify(D('more sweet', 'sweeter')) === '["more","sweet"]');
ok('most yummiest → yummiest：只圈 most', JSON.stringify(D('most yummiest', 'yummiest')) === '["most"]');
ok('單一個字的照舊', JSON.stringify(D('is', 'are')) === '["is"]');
ok('⭐ 驗證器會把 mark 算好', /errs\.forEach\(e => \{ e\.mark = _gnChangedWords\(e\.wrong, e\.right\); \}\);/.test(data));
ok('⭐ 建圈選題時用 mark，不是把詞組整個拆開',
   /const mk = \(e\.mark && e\.mark\.length \? e\.mark : e\.wrong\.split/.test(ed)
   && !/answers: e\.wrong\.split\(\/\\s\+\/\)\.filter\(Boolean\),/.test(ed));

console.log('\n【3】【5】三種「改對」要看得出差別');
ok('⭐ 「改成正確的」改成只寫那幾個字（康橋原卷就是這樣）',
   /variant: 'word'[\s\S]{0,200}改成正確的`, zh: `\$\{n\} 題 · 只要寫改對的那幾個字`/.test(ed));
ok('⭐ 答案是改好的那幾個字，不是整句', /wrongPart: e\.wrong,\s*\n?\s*answer: e\.right, accept: \[e\.right\]/.test(ed));
ok('⭐ 「改寫句子」講明是整句重寫', /改寫句子`, zh: `\$\{goodRw\.length\} 題 · 把整句重寫一次`/.test(ed));
ok('⭐ 「改成正確的句子」講明是接在診斷之後', /你剛剛看出錯在哪了——把整句寫對/.test(ed));
ok('⭐ 播放器認得新的 variant', /const isWd = item\.variant === 'word';/.test(qm));
ok('⭐ 題幹會把要改的那一段標出來', /taMarkWrong\(current\.prompt, current\.wrongPart\)/.test(qm) && /function taMarkWrong/.test(qm));
ok('   標不到就原樣顯示（不要把句子弄壞）', /找不到就原樣顯示/.test(qm));
ok('⭐ 這一種不要預填整句（要寫的只有一小段）', /if \(isWd\) setInput\(''\);/.test(qm));
ok('⭐ 側欄／說明頁都認得（漏一個就顯示成「⌨ N 個單字」）',
   (qm.match(/variant === 'word'/g) || []).length >= 4);

console.log('\n【1】輸入框放大');
ok('⭐ 要打整句的放到很大', /\.ta-input\.long \{[\s\S]{0,160}max-width: min\(980px, 92vw\)/.test(tune));
ok('   而且靠左（整句置中很難讀）', /\.ta-input\.long \{[\s\S]{0,200}text-align: left/.test(tune));
ok('⭐ 只寫幾個字的維持小框（那才是康橋的樣子）', /\.ta-input\.wd \{[\s\S]{0,120}max-width: 420px/.test(tune));
ok('⭐ 整句型才加 long', /isTr \|\| isRw \|\| isTf \? ' tr long' : ''/.test(qm));
ok('手機也有收一下', /@media \(max-width: 560px\)[\s\S]{0,200}\.ta-input\.long/.test(tune));

console.log(`\n${fail ? '❌' : '✅'} t-v479：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
