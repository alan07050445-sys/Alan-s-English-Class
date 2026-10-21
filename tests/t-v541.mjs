/* t-v541 — 圈選題寫多個規則（digraph:sh ch）本來一個字都不符合
 *
 * 康橋 G3 的 Word Study 最常見的就是「circle the words with sh or ch」，
 * 一大題同時考兩三個規則。出卷頁的說明也寫了可以填 `digraph`、`suffix:-ing`。
 *
 * 🔴 但算分與出卷頁的檢查都寫成
 *      wsCheck(w, { kind, args: checkArg }, checkArg)
 *    而 wsCheck 的**第三個參數是「只比這一個」**——
 *    老師填 'sh ch' 就變成拿整串 'sh ch' 去 indexOf，**一個字都不符合**。
 *
 * ⚠ 它不是安靜壞掉（出卷頁會說「短文裡只有 0 個符合」），
 *   但老師看不出為什麼——所以直接讓它支援，不要只改說明文字。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const hit = (w, check, arg) => W.examCircleHit(w, { check, checkArg: arg });

console.log('\n【1】一大題可以同時考好幾個規則');
ok('⭐⭐ digraph 寫兩個（sh ch）兩個都要算——這就是那個 bug',
   hit('fish', 'digraph', 'sh ch') === true
   && hit('lunch', 'digraph', 'sh ch') === true
   && hit('water', 'digraph', 'sh ch') === false);
ok('⭐ 字尾寫三個（-ment -tion -ity）',
   ['announcement', 'solution', 'quality'].every(w => hit(w, 'suffix', '-ment -tion -ity') === true)
   && hit('playground', 'suffix', '-ment -tion -ity') === false);
ok('   逗號分開也認得（老師不一定會用空白）',
   hit('fish', 'digraph', 'sh, ch') === true && hit('rain', 'team', 'ea, ai') === true);
ok('   只寫一個照樣對（原本就會動的不可以被我改壞）',
   hit('ship', 'digraph', 'sh') === true && hit('much', 'digraph', 'sh') === false);
ok('   不需要參數的（vce）照樣對',
   hit('whale', 'vce', '') === true && hit('sun', 'vce', '') === false);
ok('⚠ 程式判不出來的規則要回 null，不可以回 false（那會把學生圈的全判錯）',
   hit('whale', 'rhyme', '') === null);

console.log('\n【2】⭐⭐ 算分與出卷頁的檢查要用同一份');
ok('⭐⭐ 只有一個 examCircleHit，算分與 examWarnings 都叫它', (() => {
   const def = (data.match(/function examCircleHit\(/g) || []).length;
   const old = /wsCheck\([^)]*\{ kind: (pt|part)\.check/.test(data);   // 舊的那種寫法不可以還留著
   return def === 1 && !old
     && /const ok = \(w\) => examCircleHit\(w, part\);/.test(data)
     && /words\.filter\(x => examCircleHit\(x, pt\) === true\)/.test(data); })());
ok('⭐ 出卷頁真的會數「短文裡有幾個符合」，不夠要講出來', (() => {
   const part = { kind: 'circle', pts: 20, need: 10, check: 'digraph', checkArg: 'sh ch',
                  passage: 'The ship went up. The sun was hot.' };
   return W.examWarnings({ sections: [{ parts: [part] }] }).some(x => /只有 1 個符合/.test(x)); })());
ok('⭐ 多規則的卷子現在數得對（10 個就是 10 個）', (() => {
   const P = 'Mia had a new fish tank by her bed. Every morning Mia put a pinch of food on top of '
     + 'the water. One day the water went cloudy and her pet did not swim much. Mia told her mom, '
     + 'who showed her how to wash the small stones with a brush. They put in fresh water and one '
     + 'green plant with a shiny leaf. Mia sat on the floor and waited until lunch. Then her pet '
     + 'came up to the top, and Mia gave a happy shout.';
   const part = { kind: 'circle', pts: 25, need: 10, check: 'digraph', checkArg: 'sh ch', passage: P };
   /* ⚠ 只看「符合的個數」那一條——單獨一大題當然不是 100 分，
        把整串警告拿來比 0 是我的 fixture 寫錯，不是程式錯。 */
   const w = W.examWarnings({ sections: [{ parts: [part] }] });
   return !w.some(x => /個符合/.test(x))
     && W.examScorePart(part, ['fish', 'pinch', 'much', 'showed', 'wash',
                               'brush', 'fresh', 'shiny', 'lunch', 'shout']).got === 25; })());
ok('   圈錯的還是要扣回來（整篇全圈起來不可以滿分）', (() => {
   const part = { kind: 'circle', pts: 20, need: 4, check: 'digraph', checkArg: 'sh ch',
                  passage: 'The fish and the brush are on the shelf near a bunch of keys.' };
   return W.examScorePart(part, ['fish', 'brush', 'the', 'are', 'on', 'near']).got < 20; })());

console.log(fail ? `\n❌ t-v541：${pass} 過 / ${fail} 失敗` : `\n✅ t-v541：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
