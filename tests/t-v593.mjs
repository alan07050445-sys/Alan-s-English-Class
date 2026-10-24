// t-v593 — 🗑 垃圾桶：刪單元／整週先拍快照，之後救得回來（成績也跟著回來）
// ⭐ 用真的資料跑 data.js 的函式（含假的 Firestore 交易），不是比對程式長相。
import fs from 'fs';
const R = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const data = R('data.js'), app = R('app.jsx'), ed = R('components-editor.jsx'), shell = R('components-shell.jsx');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const store = {};
const mkDoc = (c, d) => { const k = c + '/' + d; return { _k: k, get: async () => ({ exists: k in store, data: () => JSON.parse(JSON.stringify(store[k])) }),
  set: async (v) => { store[k] = JSON.parse(JSON.stringify(v)); } }; };
const fakeDb = new Proxy({}, { get: (t, k) => k === 'collection' ? (c) => ({ doc: (d) => mkDoc(c, d) })
  : k === 'runTransaction' ? async (fn) => fn({ get: (r) => r.get(), set: (r, v) => { store[r._k] = JSON.parse(JSON.stringify(v)); } }) : stub[k] });
const fsFn = Object.assign(() => fakeDb, { FieldValue: stub });
const fb = new Proxy(stub, { get: (t, k) => k === 'firestore' ? fsFn : stub[k] });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(W,
  { documentElement: { classList: { toggle: () => {} } } }, fb, { getItem: () => null, setItem: () => {}, removeItem: () => {} });
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const mk = () => ({
  w1: { label: 'Week 1', items: { vocab: [
    { id: 'fc', type: 'flashcard', title: '單字卡', group: 'Unit 1', cards: [{ front: 'a', back: 'b' }] },
    { id: 'wp', type: 'writing-practice', title: '造句', group: 'Unit 1', linkedFlashcardId: 'fc' },
    { id: 'q1', type: 'quiz', title: '測驗', group: 'Unit 1', questions: [{ id: 'a', q: 'x', options: ['1', '2'], answer: 0 }], order: 3 },
    { id: 'z', type: 'quiz', title: '別組', group: 'Other', questions: [] },
  ], grammar: [
    { id: 'ls', type: 'lesson', title: '教學卡', steps: [] },
    { id: 'pr', type: 'quiz', title: '練習', requires: 'ls', questions: [] },
  ] }, homework: { q1: { dueDate: '2026-11-01' }, z: { dueDate: '2026-11-02' } } },
  w2: { label: 'Week 2', items: { vocab: [], grammar: [] } },
});
/* 跟 app.jsx 的 stripItemsFrom 同樣的清法（測試要重現「刪了之後」的狀態） */
const strip = (wk, ids) => {
  Object.keys(wk.items).forEach(k => { wk.items[k] = (wk.items[k] || []).filter(it => !ids.has(it.id)); });
  ids.forEach(id => { if (wk.homework && wk.homework[id]) delete wk.homework[id]; });
  Object.keys(wk.items).forEach(k => (wk.items[k] || []).forEach(it => { if (ids.has(it.requires)) delete it.requires; if (ids.has(it.linkedFlashcardId)) delete it.linkedFlashcardId; }));
};

console.log('\n【1】單元：刪 → 拍快照 → 復原');
let weeks = mk(); const before = JSON.stringify(weeks);
const snap = W.trashSnapshotUnits(weeks, 'w1', ['fc', 'wp', 'q1']);
ok('快照記了 3 個單元、作業、指向別人的鎖，標題用組名＋數量', snap.n === 3 && snap.label === 'Unit 1（3 個單元）' && snap.data.homework.q1.dueDate === '2026-11-01');
ok('⭐ 記下「被解掉的指向」：這三個之外，沒有別的單元指向它們（links 空）；但 pr 指向教學卡', snap.data.links.length === 0);
const snap2 = W.trashSnapshotUnits(weeks, 'w1', ['ls']);
ok('⭐ 刪教學卡：別的單元「需要先學完它」的鎖記下來（pr.requires）', snap2.data.links.length === 1 && snap2.data.links[0].itemId === 'pr' && snap2.data.links[0].key === 'requires');
ok('⭐ 拍快照不動原資料', JSON.stringify(weeks) === before);
const after = JSON.parse(JSON.stringify(weeks)); strip(after.w1, new Set(['ls']));
ok('（刪掉之後 pr 的鎖確實被解了，教學卡不見）', !after.w1.items.grammar.find(x => x.id === 'pr').requires && after.w1.items.grammar.length === 1);
const r = W.trashRestoreUnits(after, snap2);
ok('⭐⭐ 復原：教學卡回來、pr 的鎖接回去', r.ok && r.restored === 1 && r.relinked === 1 && r.weeks.w1.items.grammar.find(x => x.id === 'pr').requires === 'ls');
const after3 = JSON.parse(JSON.stringify(weeks)); strip(after3.w1, new Set(['fc', 'wp', 'q1']));
const r3 = W.trashRestoreUnits(after3, snap);
ok('⭐⭐ 整組復原：三個單元用原本的 id 回到原本的分類、作業日期也回來（成績 key 是 週次_單元id，所以成績會跟著回來）',
  r3.ok && r3.restored === 3 && ['fc', 'wp', 'q1'].every(id => r3.weeks.w1.items.vocab.some(x => x.id === id)) && r3.weeks.w1.homework.q1.dueDate === '2026-11-01');
ok('⭐ 單字卡與造句之間的連結接回去', r3.weeks.w1.items.vocab.find(x => x.id === 'wp').linkedFlashcardId === 'fc');
ok('⭐ 別組的作業不受影響', r3.weeks.w1.homework.z.dueDate === '2026-11-02');
const twice = W.trashRestoreUnits(r3.weeks, snap);
ok('⭐ 復原兩次不會重複放（id 已經在了）→ 回「已經在了」，資料不變', !twice.ok && twice.error === 'already');
const partial = JSON.parse(JSON.stringify(after3)); partial.w1.items.vocab.push({ id: 'q1', type: 'quiz', title: '同 id 的新單元', questions: [] });
const rp = W.trashRestoreUnits(partial, snap);
ok('⭐ 原本那個 id 被別人占了：不蓋掉它，其他的照常救回來', rp.ok && rp.restored === 2 && rp.skipped === 1 && rp.weeks.w1.items.vocab.find(x => x.id === 'q1').title === '同 id 的新單元');
ok('原本那一週已經不在了 → noweek（不亂放到別週）', W.trashRestoreUnits({ w2: {} }, snap).error === 'noweek');
ok('不動傳進來的資料（深拷貝）', (() => { const a = JSON.parse(JSON.stringify(after3)), s = JSON.stringify(a); W.trashRestoreUnits(a, snap); return JSON.stringify(a) === s; })());
ok('沒東西可拍（id 不存在／週不存在）→ null，不產生空快照', W.trashSnapshotUnits(weeks, 'w1', ['nope']) === null && W.trashSnapshotUnits(weeks, 'zz', ['fc']) === null);

console.log('\n【2】整週');
const order = ['w1', 'w2', 'w3'];
const ws = { ...mk(), w3: { label: 'Week 3', items: { vocab: [] } } };
const wsnap = W.trashSnapshotWeek(ws, order, 'w2');
const left = { ...ws }; delete left.w2;
const rw = W.trashRestoreWeek(left, ['w1', 'w3'], wsnap);
ok('⭐ 整週救回來，而且回到原本的位置（第 2 個）', rw.ok && rw.order.join() === 'w1,w2,w3' && rw.weeks.w2.label === 'Week 2');
ok('⭐ 那一週已經存在 → 不蓋掉（exists）', W.trashRestoreWeek(ws, order, wsnap).error === 'exists');
ok('快照記單元數；整週內容完整帶著', W.trashSnapshotWeek(ws, order, 'w1').n === 6 && W.trashSnapshotWeek(ws, order, 'w1').data.week.homework.q1.dueDate === '2026-11-01');

console.log('\n【3】保留規則（trashTrim）');
const NOW = 1e12;
const E = (i, age, pad = 0) => ({ id: 'e' + i, at: NOW - age, kind: 'units', data: { x: 'p'.repeat(pad) } });
ok('⭐ 超過 30 天的丟掉', W.trashTrim([E(1, 1000), E(2, 31 * 24 * 3600 * 1000)], { now: NOW }).map(e => e.id).join() === 'e1');
ok('最新的排前面；最多 30 筆（丟最舊的）', (() => { const t = W.trashTrim(Array.from({ length: 40 }, (_, i) => E(i, i * 1000)), { now: NOW }); return t.length === 30 && t[0].id === 'e0' && t[29].id === 'e29'; })());
ok('⭐ 太大（文件有 1MB 上限）就從最舊的丟，但至少留最新一筆', (() => { const t = W.trashTrim([E(1, 1, 400000), E(2, 2, 400000), E(3, 3, 400000)], { now: NOW }); return t.length === 1 && t[0].id === 'e1'; })());
ok('⭐ 序列化往返：陣列裡面放陣列（Firestore 不收）也不會壞', (() => {
  const e = { id: 'a', at: 1, kind: 'units', data: { items: [{ item: { matrix: [[1, 2], [3, 4]] } }] } };
  const row = W.trashPack(e); return typeof row.json === 'string' && !('data' in row) && JSON.stringify(W.trashUnpack(row)) === JSON.stringify(e); })());
ok('壞掉的一筆（json 不是 JSON）→ 讀成 null，不讓整份垃圾桶讀不出來', W.trashUnpack({ id: 'x', json: '{oops' }) === null);

console.log('\n【4】雲端（假的 Firestore + 交易）');
const e1 = W.trashSnapshotUnits(mk(), 'w1', ['q1']), e2 = W.trashSnapshotUnits(mk(), 'w1', ['z']);
await W.trashPush('g4', e1); await W.trashPush('g4', e2);
let list = await W.trashLoad('g4');
ok('⭐ 推兩筆 → 讀回兩筆、新的在前（交易讀了再寫，不互相蓋掉）', list.length === 2 && list[0].id === e2.id && list[1].id === e1.id);
ok('存的是 class/trash_g4（class 集合規則現成：老師可寫，不用改規則）', 'class/trash_g4' in store && !('class/trash_g3' in store));
ok('存進去的內容是字串＋meta（不是巢狀陣列）', store['class/trash_g4'].entries.every(r => typeof r.json === 'string'));
await W.trashRemove('g4', e1.id);
list = await W.trashLoad('g4');
ok('⭐ 救回來之後從垃圾桶移掉', list.length === 1 && list[0].id === e2.id);
ok('各年級分開（g3 讀不到 g4 的）', (await W.trashLoad('g3')).length === 0);
await W.trashClear('g4');
ok('清空', (await W.trashLoad('g4')).length === 0);

console.log('\n【5】接線（所有刪除路徑都要走得到）');
const del = app.slice(app.indexOf('const handleDeleteItems'), app.indexOf('const handleDeleteItem = '));
ok('⭐ 刪單元／整組（含聊天室、編輯視窗的刪除鈕）共用的 handleDeleteItems 先拍快照再刪', /trashSnapshotUnits\(weeksRef\.current, weekId/.test(del) && del.indexOf('trashSnapshotUnits') < del.indexOf('stripItemsFrom(') && /keepInTrash\(snap/.test(del));
const dw = app.slice(app.indexOf('const handleDeleteWeek'), app.indexOf('const toggleCheck'));
ok('⭐ 刪整週也先拍快照（在 delete 之前）', dw.indexOf('trashSnapshotWeek') >= 0 && dw.indexOf('trashSnapshotWeek') < dw.indexOf('delete nextWeeks') && /keepInTrash\(snap/.test(dw));
ok('⭐ 所有刪除都走這兩個出口：沒有別處直接 splice／filter 掉單元後存檔而不經過它們', (() => {
  const uses = (app.match(/stripItemsFrom\(/g) || []).length;   // handleDeleteItems 1＋搬過去（複製在先，不是刪）1；之後再多一條就要來這裡看是不是漏了垃圾桶
  return uses === 2 && /if \(move\) stripItemsFrom/.test(app); })());
ok('⭐ 復原的提示用記憶體快照（不等雲端）；存雲端失敗要講出來', /showUndoToast\(msg, \(\) => restoreFromTrash\(snap\)\)/.test(app) && /垃圾桶沒存到/.test(app));
ok('⭐ 提示掛 10 秒，而且用 ref 記計時器（不被前一個 1.8 秒的計時器提早收掉）', /undoTimerRef\.current = setTimeout\(\(\) => setToast\(null\), 10000\)/.test(app) && /clearTimeout\(undoTimerRef\.current\)/.test(app));
ok('⭐ 復原按鈕真的畫出來並呼叫 undo', /toast-undo[\s\S]{0,200}toast\.undo/.test(app));
ok('⭐ 救回來要 setWeeks＋存檔；整週還要存週次順序', /trashRestoreUnits\(weeksRef\.current, entry\)[\s\S]{0,400}saveWeeksSafe\(r\.weeks\)/.test(app) && /saveWeekOrder\(r\.order\)/.test(app));
ok('⭐ Header 有收 onTrash 並畫出按鈕；app 有傳、有渲染 TrashModal 且匯出到 window', /onAddWeek, onCompose, onTrash,/.test(shell) && /onClick=\{onTrash\}/.test(shell) && /onTrash=\{/.test(app) && /<window\.TrashModal/.test(app) && /Object\.assign\(window, \{ TrashModal,/.test(ed));
ok('聊天室刪單元不再重複 toast（會把「復原」提示蓋掉）', !/handleDeleteItem\(h\.item\.id\);\s*showToast/.test(app));
console.log(fail ? `\n❌ t-v593：${pass} 過 / ${fail} 失敗` : `\n✅ t-v593：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
