/* t-v480 — Alan 截到兩題「無解」的改寫題
 *   ① "My fish is more beautiful." → "My fish is more beautiful than yours."
 *      句子裡沒有任何線索說跟誰比，學生不可能知道要補 than yours。
 *   ② "The cake is sweeter than the candy." → "The candy is sweeter than the cake."
 *      理由寫「Candy is actually sweeter than cake」——那是常識題，不是文法題。
 *
 * Alan 的原則（而且要套用到所有文法點）：
 *   改寫題只能改「句子裡本來就看得出來的文法錯」。
 * 程式判得出來的版本＝實詞不可以多／少／換／對調，只能變形。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const F = new Function(pick('const _GN_FIX_IRREG', 'function _gnFixPairOk')
  + pick('const _GN_IRREG_CMP', 'function gnValidEditPara')
  + '\nreturn { _gnFixableFromSentence, _gnSameWord, _gnStem };')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const X = F._gnFixableFromSentence;

console.log('\n【1】Alan 截到的兩題要擋掉');
ok('⭐ 圖1：憑空多一個 yours（句子裡沒說跟誰比）',
   X('My fish is more beautiful.', 'My fish is more beautiful than yours.') === false);
ok('⭐ 圖2：cake↔candy 對調（那是常識題，不是文法題）',
   X('The cake is sweeter than the candy.', 'The candy is sweeter than the cake.') === false);

console.log('\n【2】其他「學生不可能知道」的也要擋');
[['This book is good.', 'This book is better than that one.', '憑空生出比較對象'],
 ['My room is clean.', 'My room is cleaner than my brother room.', '多出 brother'],
 ['The dog is big.', 'The dog is bigger than the cat.', '多出 cat'],
 ['I like apple.', 'I like banana.', '把實詞換掉']
].forEach(([w, a, n]) => ok('擋掉：' + n, X(w, a) === false));

console.log('\n【3】真正的文法錯要放行（擋太兇＝整個題型出不來）');
[['My bag is bigger yours.', 'My bag is bigger than yours.', '只補了 than（功能詞）'],
 ['My dog is more big than your dog.', 'My dog is bigger than your dog.', 'big→bigger（重複子音）'],
 ['This room is more hot than that room.', 'This room is hotter than that room.', 'hot→hotter'],
 ['The box is more heavy than the bag.', 'The box is heavier than the bag.', 'heavy→heavier（y→i）'],
 ['She is the happier student in class.', 'She is the happiest student in class.', '-er→-est'],
 ['I think the red team is the most good team.', 'I think the red team is the best team.', 'most good→best'],
 ['taipei is a big city.', 'Taipei is a big city.', '只改大小寫'],
 ['He go to school.', 'He goes to school.', 'go→goes'],
 ['I have two cat.', 'I have two cats.', 'cat→cats'],
 ['She buyed a new book.', 'She bought a new book.', 'buy/bought（不規則）'],
 ['We goed to the park.', 'We went to the park.', 'go/went（詞幹剝不回去，查表要多試幾種）'],
 ['I saw two childs.', 'I saw two children.', 'child/children'],
 ['The most delicious cake is in the bakery.', 'The most delicious cake is at the bakery.', 'in→at']
].forEach(([w, a, n]) => ok('放行：' + n, X(w, a) === true));
ok('⭐ 刪掉重複出現的字是合法的（從句子本身就看得出來）',
   X('This toy is the best toy I have.', 'This is the best toy I have.') === true);

console.log('\n【4】不要再寫第二份不規則表');
ok('⭐ 用現成的 _GN_FIX_IRREG（兩份遲早會走鐘）', /不要在這裡再寫第二份/.test(data));
ok('詞幹認得重複子音（big→bigger）', F._gnStem('bigger') === F._gnStem('big'));
ok('詞幹認得 y→i（happy→happier）', F._gnStem('happier') === F._gnStem('happy'));
ok('不同的字不會被當成同一個', F._gnSameWord('cake', 'candy') === false);

console.log('\n【5】接到題型上');
ok('⭐ 改寫句子會用它擋', /if \(!_gnFixableFromSentence\(wrong, answer\)\) return null;/.test(data));
/* 診斷題**不是**整題丟掉——康橋真的有「Missing Subject」這種題
   （"ran across the line." → "My dad ran across the line."），主詞本來就要學生自己想，
   那是合法的「看出錯在哪」題。它只是不能用標準答案比對來改，
   所以改成標記 canRewrite，判斷題照出、改寫那一步不要它。 */
ok('⭐ 診斷題改成標記 canRewrite（不是整題丟掉）',
   /const canRewrite = _gnFixableFromSentence\(broken, fixed\);/.test(data)
   && /canRewrite, why:/.test(data));
ok('⭐ Missing Subject 那種題還是收得下（康橋真的這樣考）', (() => {
  const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
  const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(W, stub, stub, stub);
  const r = W.gnValidDiagnose({ broken: 'ran across the line.', kinds: ['Missing Subject', 'Missing Predicate'],
                                answer: 0, fixed: 'My dad ran across the line.' });
  return !!r && r.canRewrite === false;
})());
ok('⭐ 但「改成正確的句子」那一步不會收它（標準答案比對一定誤判）',
   /const rwDiag = goodDiag\.filter\(x => x\.canRewrite !== false\);/.test(
     fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8')));
ok('   全部都不能重寫時整個單元就不要出', /if \(rwDiag\.length\) out\.push/.test(
     fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8')));
ok('⭐ 改寫句子也一起過比較級那一關', /if \(!_gnCmpClaimOk\(wrong, answer\)\) return null;/.test(data));

console.log('\n【6】擋掉之後要告訴 AI 為什麼（不然重試只會再犯一次）');
ok('⭐ 重試時會把被擋掉的那幾題送回去', /Your previous answer was REJECTED by a checker/.test(data));
ok('⭐ 而且講得出原因', /the child cannot fix it from the sentence alone/.test(data)
   && /the comparative rule is backwards/.test(data));
ok('⭐ 只送前幾題就好（不要把 prompt 撐爆）', /if \(dropped\.length < 4\)/.test(data));
ok('第一輪不要送（那時還沒有東西被擋）', /round > 0 && dropped\.length/.test(data));

console.log('\n【7】提示詞也要講清楚（Alan：給 claude 合理的 prompt 就好了吧）');
ok('⭐ 明寫「錯的地方要能從句子本身改回來」', /THE MISTAKE MUST BE FIXABLE FROM THE SENTENCE ITSELF/.test(data));
ok('⭐ 明寫「不可以叫小孩憑空想內容、也不可以考常識」',
   /You may NOT make the child invent information/.test(data) && /you may NOT ask about facts of the world/.test(data));
ok('⭐ 直接把 Alan 截到的那兩題當反例寫進去',
   /My fish is more beautiful than yours/.test(data) && /that is an opinion about food, not a grammar mistake/.test(data));
ok('   也給了正例', /GOOD: "My bag is bigger yours\." -> "My bag is bigger than yours\."/.test(data));

console.log(`\n${fail ? '❌' : '✅'} t-v480：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
