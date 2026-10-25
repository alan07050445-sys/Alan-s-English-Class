// t-v596 — 同一個單元 id 出現在好幾週時，老師後台／聊天室／家長報告也只認「這一週」那一筆
//   （LINE 那邊的同一個 bug 見 t-line-v596；這裡是網站端：沿用到別週複製出來的單元 id 相同，
//    以前「任何一週後綴相同」就算做完 → 老師後台、「誰沒做完」、週報的完成數都被別週灌水）
import fs from 'fs';
const R = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const data = R('data.js'), dash = R('components-dashboard.jsx');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(W,
  { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} });
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const Q = (id) => ({ id, type: 'quiz', title: id, questions: [{ q: 'a', options: ['x', 'y'], answer: 0 }, { q: 'b', options: ['x', 'y'], answer: 0 }] });
const weeks = {
  W3: { label: 'W3', items: { vocab: [Q('shared'), Q('only3')], grammar: [], word: [], reading: [] } },
  W8: { label: 'W8', items: { vocab: [Q('shared')], grammar: [], word: [], reading: [] } },
  W9: { label: 'W9', items: { vocab: [Q('only9')], grammar: [], word: [], reading: [] } },
};
const order = ['W3', 'W8', 'W9'];
const D = { done: 1790000000000, score: 90, total: 100 };
const stu = (items) => ({ items, uid: 'u', email: 'a@b.c' });

console.log('\n【1】sharedItemIds／progKeysFor');
const sh = W.sharedItemIds(weeks, order);
ok('⭐ 出現在兩週以上的 id 才算 shared', sh.has('shared') && !sh.has('only3') && !sh.has('only9'));
ok('只算 weekOrder 裡的週（孤兒週不算）', !W.sharedItemIds({ ...weeks, X: { items: { vocab: [Q('only3')] } } }, order).has('only3'));
ok('同週內同 id 出現兩次不算 shared', !W.sharedItemIds({ A: { items: { v: [Q('d'), Q('d')] } } }, ['A']).has('d'));
ok('⭐ 同一份 weeks 不重算（WeakMap 快取；後台每次重繪都會呼叫）', W.sharedItemIds(weeks, order) === sh);
const its = { 'W3_shared': D, 'OLD-W9_only9': D, only3: D };
ok('⭐⭐ shared：別週做完的 key 不會對進來', W.progKeysFor(its, { id: 'shared', progressId: 'W8_shared', shared: true }).length === 0);
ok('   shared：自己這週的 key 對得進來', W.progKeysFor(its, { id: 'shared', progressId: 'W3_shared', shared: true }).join() === 'W3_shared');
ok('⭐⭐ 不是 shared：後綴比對照舊（週次 id 改過的舊進度 OLD-W9_only9 還是對得到）', W.progKeysFor(its, { id: 'only9', progressId: 'W9_only9', shared: false }).join() === 'OLD-W9_only9');
ok('   裸 id（舊核取方塊）shared 也算', W.progKeysFor(its, { id: 'only3', progressId: 'W3_only3', shared: true }).join() === 'only3');
ok('   優先序：週次_id → 裸 id → 後綴', W.progKeysFor({ a: 1, 'Z_a': 1, 'W_a': 1 }, { id: 'a', progressId: 'W_a', shared: false }).join() === 'W_a,a,Z_a');

console.log('\n【2】buildWeeklyReport：週報的完成數');
const rep = (items, wid) => W.buildWeeklyReport(stu(items), weeks, order, { weekId: wid });
const r8 = rep({ 'W3_shared': D }, 'W8');
ok('⭐⭐ W3 做完 shared、W8 沒做 → W8 的週報顯示「還沒完成」（本來會被別週灌水成完成）', r8.completed.length === 0 && r8.pending.length === 1);
ok('⭐ W8 自己做完了 → 完成', rep({ 'W8_shared': D }, 'W8').completed.length === 1);
ok('⭐⭐ 只出現在一週的 id，舊前綴的進度照樣算（週次 id 改過的學生不能被當成沒做）', rep({ 'OLD_only9': D }, 'W9').completed.length === 1);
ok('分數也只取自己那一週（不會拿別週的 90 分來當這週的）', rep({ 'W3_shared': D }, 'W8').avgScore == null);

console.log('\n【3】老師後台的四個地方都改走同一份（寫了沒人用是最常見的坑）');
ok('⭐ 兩個項目清單都帶 shared 旗標', (dash.match(/shared: sharedIds\.has\(it\.id\)/g) || []).length === 2);
ok('⭐ 完成判斷／分數／學生詳情都走 progKeysFor，不再各自 endsWith', (dash.match(/window\.progKeysFor\(its, it\)/g) || []).length === 3);
ok('⭐ 學生詳情「刪除單筆成績」：重複 id 不會連別週的一起刪掉', /\.\.\.\(it\.shared \? \[\] : Object\.keys\(its\)\.filter\(k => k\.endsWith\('_' \+ it\.id\)\)\)/.test(dash));
ok('⭐ buildWeeklyReport 的後綴那一層跳過 shared', /shared\.has\(itemId\) \? null : suffixIndex\(\)\[itemId\]/.test(data));
console.log(fail ? `\n❌ t-v596：${pass} 過 / ${fail} 失敗` : `\n✅ t-v596：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
