// t-v595 — 🔴 藏了很久的存檔 bug：set({weeks},{merge:true}) 不會刪 map 的 key
//   取消作業／清幽靈作業／取消封存／刪參考資料——本機拿掉了，雲端永遠還在（線上 87 筆幽靈作業就是這樣來的）。
//   用真的 Firestore SDK 離線實測過同一個行為（見 data.js 的說明）；這裡測的是修法 weeksWithDeletes。
import fs from 'fs';
const R = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const data = R('data.js');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(W,
  { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} });
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const DEL = { __del: true };
const cloud = () => ({
  w1: { id: 'w1', label: 'W1', archived: true, startISO: '2026-10-01',
    homework: { a: { dueDate: '2026-11-01' }, b: { dueDate: '2026-11-02' } }, groupRes: { 'vocab::G': { yt: 'x' }, 'vocab::H': { yt: 'y' } },
    items: { vocab: [{ id: 'a' }, { id: 'b' }], grammar: [] } },
  w2: { id: 'w2', label: 'W2', items: { vocab: [{ id: 'z' }] } },
});
W.noteCloudWeeks('t', cloud());
const dels = (o, p = '') => Object.keys(o || {}).flatMap(k => o[k] === DEL ? [p + k] : (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? dels(o[k], p + k + '.') : []));

console.log('\n【1】本機明確拿掉的 key → 改成刪除標記');
let next = cloud(); delete next.w1.homework.b; next.w1.items.vocab = [{ id: 'a' }];
let out = W.weeksWithDeletes('t', next, DEL);
ok('⭐⭐ 取消作業／清幽靈作業：homework.b 變成刪除標記（本來 merge 永遠刪不掉）', dels(out).join() === 'w1.homework.b');
ok('   留著的 homework.a 還在、陣列照原樣（陣列本來就是整個換掉）', out.w1.homework.a.dueDate === '2026-11-01' && out.w1.items.vocab.length === 1);
next = cloud(); delete next.w1.archived;
ok('⭐⭐ 取消封存：delete week.archived 也要真的刪（不然學生還是看不到那一週）', dels(W.weeksWithDeletes('t', next, DEL)).join() === 'w1.archived');
next = cloud(); delete next.w1.groupRes['vocab::G'];
ok('⭐ 刪參考資料（groupRes 的 key）', dels(W.weeksWithDeletes('t', next, DEL)).join() === 'w1.groupRes.vocab::G');
next = cloud(); next.w1.homework = {};
ok('⭐ 整份作業清空（homework 變 {}）→ 裡面每一筆都刪', dels(W.weeksWithDeletes('t', next, DEL)).sort().join() === 'w1.homework.a,w1.homework.b');

console.log('\n【2】不該刪的絕對不刪（merge 本來保護的東西）');
next = cloud(); delete next.w2;
ok('⭐⭐ 整個週次不見（本機只載到一部分也可能）→ **不**自動刪，雲端週次留著', dels(W.weeksWithDeletes('t', next, DEL)).length === 0 && !('w2' in W.weeksWithDeletes('t', next, DEL)));
next = cloud(); delete next.w1.startISO; delete next.w1.label;
ok('⭐⭐ 週次層其他欄位（label／startISO…）少了 → 不刪（有些地方會用「只有已知欄位」重組週次物件）', dels(W.weeksWithDeletes('t', next, DEL)).length === 0);
next = cloud(); next.w1.homework.c = { dueDate: '2026-12-01' };
ok('新加的 key 照常寫進去', W.weeksWithDeletes('t', next, DEL).w1.homework.c.dueDate === '2026-12-01' && dels(W.weeksWithDeletes('t', next, DEL)).length === 0);
/* 別台剛加的 key：這台沒看過（不在最後一次看到的雲端裡）→ 就算本機沒有也不能刪 */
W.noteCloudWeeks('t2', { w1: { homework: { a: 1 } } });
ok('⭐⭐ 別台剛加的 key（這台沒看過）不會被刪——只刪「看過、現在沒了」的', dels(W.weeksWithDeletes('t2', { w1: { homework: { a: 1 } } }, DEL)).length === 0);
ok('還沒收到過雲端（沒有對照）→ 原樣不動，不亂刪', W.weeksWithDeletes('never', cloud(), DEL).w1.homework.b.dueDate === '2026-11-02');
ok('不改傳進來的資料', (() => { const n = cloud(); delete n.w1.homework.b; const s = JSON.stringify(n); W.weeksWithDeletes('t', n, DEL); return JSON.stringify(n) === s; })());
ok('陣列裡面不會被當成 map 走進去（不產生奇怪的刪除）', (() => { W.noteCloudWeeks('t3', { w1: { items: { v: [{ id: 'a', x: 1 }] } } }); return dels(W.weeksWithDeletes('t3', { w1: { items: { v: [{ id: 'a' }] } } }, DEL)).length === 0; })());

console.log('\n【3】每一個年級的存檔都真的走這個（寫了沒人用是最常見的坑）');
const files = { 'data.js': /_classDoc\.set\(\{ weeks: weeksWithDeletes\('g3', weeks\) \}/, 'data-g1.js': /weeksWithDeletes\('g1', weeks\)/, 'data-g2.js': /weeksWithDeletes\('g2', weeks\)/,
  'data-g4.js': /weeksWithDeletes\('g4', weeks\)/, 'data-g5.js': /weeksWithDeletes\('g5', weeks\)/, 'data-g6.js': /weeksWithDeletes\('g6', weeks\)/, 'data-grammar.js': /weeksWithDeletes\('gr', weeks\)/ };
Object.keys(files).forEach(f => ok(`⭐ ${f} 存檔會帶刪除`, files[f].test(R(f))));
Object.keys({ g1: 'data-g1.js', g2: 'data-g2.js', g4: 'data-g4.js', g5: 'data-g5.js', g6: 'data-g6.js', gr: 'data-grammar.js', g3: 'data.js' }).forEach(k => {
  const f = { g1: 'data-g1.js', g2: 'data-g2.js', g4: 'data-g4.js', g5: 'data-g5.js', g6: 'data-g6.js', gr: 'data-grammar.js', g3: 'data.js' }[k];
  ok(`⭐⭐ ${k}：訂閱收到雲端時有 noteCloudWeeks('${k}')（對照表才有東西）；存檔與訂閱用同一個 key`, new RegExp(`noteCloudWeeks\\(\\s*'${k}'`).test(R(f)) && new RegExp(`weeksWithDeletes\\(\\s*'${k}'`).test(R(f)));
});
console.log(fail ? `\n❌ t-v595：${pass} 過 / ${fail} 失敗` : `\n✅ t-v595：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
