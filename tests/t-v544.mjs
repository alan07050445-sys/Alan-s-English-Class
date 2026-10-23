/* t-v544 — ✏️ 整組改名字
 *
 * Alan 合併了 6 組單字，組名變成六個名字串在一起：
 *   「Reaching for the moon - week1 + Reaching for the moon - week2 + Rare Treasure -
 *     Part 1 · 複習 + Rare Treasure - Part 2 · 複習 + Barbed Wire Baseball + …」
 * 側欄的群組標頭被截斷，學生點進單元更慘——那一長串就是**標題**，滿螢幕都是它。
 *   「整體合併沒有問題 但是群組缺少一個功能 就是改名字」
 *
 * ⭐ 改名要改**三個地方**，少一個就「看起來正常但其實壞掉」：
 *   ① 每個單元的 group（側欄靠它歸戶）
 *   ② 每個單元的 title（標題本來就是用組名拼出來的）
 *   ③ 群組的參考資料 groupRes，key 是 `分類::組名`
 *      —— ⚠ 不搬的話 📎 參考資料會**整個消失**，而且不會報錯。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const noC  = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const appC = noC(app), qmC = noC(qm);
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

/* Alan 螢幕上真的那一串 */
const OLD = 'Reaching for the moon - week1 + Reaching for the moon - week2 + Rare Treasure - '
  + 'Part 1 · 複習 + Rare Treasure - Part 2 · 複習 + Barbed Wire Baseball + Barbed Wire Baseball - Part 2';
const NEW = 'Unit 1–3 期中複習';
const items = [
  { id: 'a1', group: OLD, title: OLD, type: 'flashcard' },
  { id: 'a2', group: OLD, title: OLD + '（1/4）', type: 'quiz' },
  { id: 'a3', group: OLD, title: OLD + ' · 字義選擇（2/5）', type: 'quiz' },
  { id: 'a4', group: OLD, title: OLD + ' · 短文填空（1/4）', type: 'cloze' },
  { id: 'a5', group: OLD, title: '我自己取的名字', type: 'quiz' },
];

console.log('\n【1】⭐⭐ 標題是用組名拼出來的，要一起改');
const r = W.renameGroupItems(items, OLD, NEW);
ok('⭐ 每一個單元的 group 都變成新名字', r.items.every(it => it.group === NEW));
ok('⭐⭐ 標題跟著改，而且**保留字尾**（「（1/4）」「· 字義選擇（2/5）」不可以被吃掉）', (() => {
   const t = r.items.map(x => x.title);
   return t[0] === NEW && t[1] === NEW + '（1/4）'
     && t[2] === NEW + ' · 字義選擇（2/5）' && t[3] === NEW + ' · 短文填空（1/4）'; })());
ok('⭐⭐ 老師自己取過名字的單元**不動**——那是他故意取的', (() => {
   const x = r.items.find(i => i.id === 'a5');
   return x.title === '我自己取的名字' && x.group === NEW; })());
ok('⭐ 回報改了幾個、留了幾個（他要知道有沒有漏）', r.n === 4 && r.kept === 1);
ok('   新舊同名就什麼都不做', W.renameGroupItems(items, OLD, OLD).n === 0);
ok('   空白的新名字不處理（畫面也會先擋）',
   W.renameGroupItems(items, OLD, '   ').n === 0 && W.renameGroupItems(items, '', NEW).n === 0);
ok('   不會動到別組的單元（只處理傳進來的這一批）',
   W.renameGroupItems([{ id: 'z', group: '別組', title: '別組' }], OLD, NEW)[0] === undefined
   || W.renameGroupItems([{ id: 'z', group: '別組', title: '別組' }], OLD, NEW).items[0].title === '別組');

console.log('\n【2】⭐⭐ 參考資料要跟著搬（不搬就整個消失，而且不報錯）');
ok('⭐⭐ handleRenameGroup 有搬 groupRes 的 key',
   /const from = groupResKey\(catId, a\), to = groupResKey\(catId, b\);/.test(appC)
   && /delete wk\.groupRes\[from\];/.test(appC));
ok('⭐ 目標已經有資料時用合併，不要整個蓋掉',
   /wk\.groupRes\[to\] = \{ \.\.\.\(wk\.groupRes\[to\] \|\| \{\}\), \.\.\.wk\.groupRes\[from\] \}/.test(appC));

console.log('\n【3】會不小心合併兩組的情況要先問');
ok('⭐⭐ 同一週已經有同名的另一組＝兩組會被併在一起（側欄靠 group 歸戶）→ 要先問一句',
   /const clash = wk\.items\[catId\]\.some\(/.test(appC)
   && /已經有一組叫/.test(app) && /改下去兩組會變成同一組/.test(app));

console.log('\n【4】接到畫面上');
ok('⭐ 整組選單有「✏️ 改名字…」', /✏️ 改名字…/.test(qm) && /onRenameGroup && \(/.test(qmC));
ok('⭐ 預設值就是舊名字（大部分時候只是要刪掉後半段）',
   /prompt\(`這一組（\$\{g\.items\.length\} 個單元）要改叫什麼？`, g\.name\)/.test(qm));
ok('⭐ 按取消（prompt 回 null）什麼都不做，不要當成「改成空字串」',
   /if \(b == null\) return;/.test(qmC));
ok('   空白名字擋掉', /if \(!String\(b\)\.trim\(\)\) \{ alert\('名字不能是空的。'\); return; \}/.test(qmC));
ok('⭐ app.jsx 有接上去', /onRenameGroup=\{\(gName, newName\) => handleRenameGroup\(catView\.id, gName, newName\)\}/.test(app));
ok('   prop 有一路傳進元件', /onRegenGroup, onReviewGroup, onDeleteGroup, onRenameGroup, onMoveGroupCat, allCategories, weekQuizItems,/.test(qm));

console.log('\n【5】聊天室也要叫得動（畫面做得到的，用講的也要做得到）');
ok('⭐ op 收得了 rename', /\['copy', 'move', 'again', 'rename', 'delete', 'recat'\]/.test(data));
ok('⭐ 提示詞教過 rename，而且說新名字放在 title',
   /RENAME it, or delete it/.test(data) && /For "rename", put the NEW name in "title"/.test(data));
ok('⭐ 提示詞講了這最常發生在合併之後（他就是這樣遇到的）',
   /Renaming is common right after merging several units/.test(data));
ok('⭐⭐ 走的是跟畫面同一個 handler（不要另外寫一套）',
   /else handleRenameGroup\(found\.catId, found\.name, b\);/.test(appC));
ok('⚠ 他沒講新名字就不要自己取一個', /要改叫什麼？跟我說新名字就好/.test(app));

console.log(fail ? `\n❌ t-v544：${pass} 過 / ${fail} 失敗` : `\n✅ t-v544：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
