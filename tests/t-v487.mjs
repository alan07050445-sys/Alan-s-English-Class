/* t-v487 — 「我新增字義選擇，結果按完確認沒有顯示」
 *
 * 兩個 bug 都屬於同一類：**東西生出來了，但在交接的路上掉了，而且沒有人講**。
 *   ① handleQuickSet 沒把 sense 解構出來 → 傳下去是 undefined → 單元靜靜地不見
 *      （複習那條路 v473 補過了，主路一直漏著 ＝ 字義選擇從 v468 起只有排複習生得出來）
 *   ② QuickSetModal 的 effect 裡 setPicked 寫了兩次，後面那次蓋掉前面
 *      → v475 的「只補漏掉的題型」沒生效，而且預設清單裡沒有 sense
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const ed  = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const appC = noComments(app), edC = noComments(ed);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const fnEnd = (s, a) => { const i = s.indexOf(a); const j = s.indexOf('\n}\n', i); return s.slice(i, j + 2); };
const qsBuild = new Function('window', fnEnd(ed, 'function qsBuildItems') + '\nreturn qsBuildItems;')({});

console.log('\n【1】勾了字義選擇就要生得出來（Alan 回報的那一件）');
const WORDS = [{ term: 'ancient', zh: '古老的' }, { term: 'quarrel', zh: '爭吵' }];
const SENSE = [1, 2].map(i => ({ title: 'T' + i, passage: 'p' + i, q: 'What does it mean here?',
  word: WORDS[i - 1].term, options: ['a', 'b', 'c', 'd'], answer: 0, explain: 'x' }));

ok('⭐ 只勾字義選擇 → 真的建得出那一個單元', (() => {
  const out = qsBuild({ words: WORDS, title: 'G', kinds: ['sense'], ai: [], story: null, sense: SENSE });
  return out.length === 1 && out[0].type === 'quiz' && /字義選擇$/.test(out[0].title); })());
ok('   沒有題目就不要硬生（空殼單元比沒有還糟）',
  qsBuild({ words: WORDS, title: 'G', kinds: ['sense'], ai: [], story: null, sense: [] }).length === 0);

console.log('\n【2】sense 要一路傳到底（這就是掉的地方）');
ok('⭐ handleQuickSet 有把 sense 解構出來',
  /const handleQuickSet = \(\{[^}]*\bsense\b[^}]*\}\)/.test(appC));
ok('⭐ 而且真的傳給了 qsBuildItems', (() => {
  const calls = appC.match(/qsBuildItems\(\{[^}]*\}\)/g) || [];
  return calls.length >= 2 && calls.every(c => /\bsense\b/.test(c)); })());
ok('   複習那條路也還在傳（v473 修過的不要被我改壞）',
  /qsBuildItems\(\{[^}]*words, title, kinds, ai, story, sense[^}]*\}\)/.test(appC));

console.log('\n【3】生不出來一定要講出來（v473 的教訓）');
ok('⭐ 一個單元都沒生出來時會跳訊息，不是默默關掉',
  /if \(!items\.length\) \{\s*setQuickSetOpen\(false\);[^}]*showToast\(/.test(appC));

console.log('\n【4】預設勾選：新增題型不可以再漏掉');
ok('⭐ 預設清單是從 QS_KINDS 長出來的，不是另外手寫一份',
  /const QS_DEFAULT_KINDS = QS_KINDS\.map\(k => k\.id\)/.test(edC));
ok('⭐ 所以「字義選擇」現在預設就勾著（它從 v468 起一次都沒被勾過）', (() => {
  const i = edC.indexOf('const QS_KINDS = [');
  const list = edC.slice(i, edC.indexOf('\n];', i));
  const ids = (list.match(/id: '([^']+)'/g) || []).map(x => x.slice(5, -1));
  return ids.indexOf('sense') >= 0 && ids.length >= 7; })());
ok('⭐ 同一個 effect 裡 setPicked 只能設一次（後面那次會蓋掉前面）', (() => {
  const i = edC.indexOf('if (open) { setText(defaultText');
  const j = edC.indexOf('}, [open]);', i);
  return (edC.slice(i, j).match(/setPicked\(/g) || []).length === 2; })());   // if / else 各一次
ok('   開視窗要把上一次的字義選擇清掉（不然會帶到下一組）', (() => {
  const i = edC.indexOf('if (open) { setText(defaultText');
  const j = edC.indexOf('}, [open]);', i);
  return edC.slice(i, j).indexOf('setSense([])') >= 0; })());

console.log(fail ? `\n❌ t-v487：${pass} 過 / ${fail} 失敗` : `\n✅ t-v487：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
