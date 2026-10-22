/* t-v546 — ① 小組點進練習就收不起來 ② 萬聖節泡泡轉場卡頓
 *
 * ① 🔴 `const open = openSubs[sk] || hasSel`：使用者按收合寫進去的 false，
 *    被後面「正在做的那份在裡面就強制打開」蓋掉 → 一點進練習就再也收不起來。
 *    ⭐ 使用者**明確按過**的永遠贏；沒按過（undefined）才看 hasSel。
 *    （跟 v487 同一類：兩個來源同時決定一個狀態，後面那個贏。）
 * ② 🔴 萬聖節泡泡又掛了 `filter: drop-shadow`——那是 v397 為了解卡頓**特地拿掉**的東西。
 *    實測（同時放 8 次＝288 顆）：有 → 平均 32.8ms／掉 15 幀；拿掉 → 16.7ms／掉 0 幀。
 *    圖片本身不是問題：只換純色底一樣卡 33ms。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const qm  = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const hw  = fs.readFileSync(new URL('styles-holiday-hw.css', ROOT), 'utf8');
const noC = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const qmC = noC(qm), hwC = noC(hw);
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】小組收合');
ok('⭐⭐ 使用者按過的優先，沒按過才看「正在做的那份在不在裡面」',
   /const open = openSubs\[sk\] !== undefined \? openSubs\[sk\] : hasSel;/.test(qmC));
ok('⭐⭐ 不可以再寫成 `openSubs[sk] || hasSel`（false 會被蓋掉）', !/openSubs\[sk\] \|\| hasSel/.test(qmC));
ok('⭐ 換了另一個練習時，之前「明確收合」的記錄清掉（新選的那份所在的小組才會自動打開）',
   /useQME\(\(\) => \{\s*setOpenSubs\(x => \{[\s\S]{0,200}x\[k\] === true\) keep\[k\] = true;/.test(qmC)
   && /\}, \[selIdForSubs\]\);/.test(qmC));
ok('⚠ 只在「選的練習換了」才清——停在同一個練習時，使用者自己按的收合要算數',
   /\[selIdForSubs\]/.test(qmC) && !/\[selectedItem\]\);\s*\n[^\n]*setOpenSubs/.test(qmC));

console.log('\n【2】萬聖節泡泡');
ok('⭐⭐ .pwb 不可以有 filter（動畫中的元素不可以掛 filter／大範圍陰影）', (() => {
   const i = hwC.indexOf('html.fest-hw .pwb {');
   const blk = hwC.slice(i, hwC.indexOf('}', i));
   return i > 0 && !/filter\s*:\s*(?!none)/.test(blk); })());
ok('⭐ 整個萬聖節 CSS 裡，「有動畫又有 filter」的規則是 0 條', (() => {
   const bad = [];
   hwC.replace(/([^{}]+)\{([^{}]*)\}/g, (_, sel, body) => {
     if (/filter\s*:\s*(?!none)/.test(body) && /animation/.test(body)) bad.push(sel.trim());
   });
   return bad.length === 0; })());
ok('   圖還在（換底圖不是卡頓的原因，沒必要拿掉）',
   /html\.fest-hw \.pwb:nth-child\(3n\)\s*\{ background-image: var\(--hw-ghost\)/.test(hwC));

console.log(fail ? `\n❌ t-v546：${pass} 過 / ${fail} 失敗` : `\n✅ t-v546：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
