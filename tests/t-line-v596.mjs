// t-line-v596 — 🔴 LINE 提醒「做完了嗎」只認這一週那一筆
//   以前 isDone 最後一段是 k.endsWith('_' + itemId)：別週同 id 的單元做完了，這週就被當成做完 → 少提醒家長。
//   「沿用到別週」複製的單元 id 相同（G4 線上 44 個 id 出現在好幾週），進度卻是「週次_單元id」分開記的。
import fs from 'fs';
const src = fs.readFileSync(new URL('../line-notify-worker.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('function isDone('), src.indexOf('// ── 功能B：主引擎'));
const isDone = new Function(body + '\nreturn isDone;')();
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const D = { done: 1790000000000 };
const dupFn = isDone;
console.log('\n【1】isDone：重複 id（dup）只認這一週');
ok('⭐ 這一週的那一筆做完了 → 完成（dup 與否都一樣）', isDone({ 'g4-2026F-W06_u1': D }, 'g4-2026F-W06', 'u1', true) === true && isDone({ 'g4-2026F-W06_u1': D }, 'g4-2026F-W06', 'u1', false) === true);
ok('⭐⭐ dup：只有「別週同 id」做完 → **沒完成**（本來會被當成完成而不提醒）', isDone({ 'g4-2026F-W03_u1': D }, 'g4-2026F-W06', 'u1', true) === false);
ok('⭐ dup：兩週都有，只做了一週 → 另一週還是要提醒', isDone({ 'g4-2026F-W03_u1': D }, 'g4-2026F-W08', 'u1', true) === false);
ok('⭐⭐ 不是 dup（全年級只有這一個）：寬鬆比對照舊——週次 id 改過、舊前綴對不上的舊資料不能掉', isDone({ 'g4-2026-W06_u1': D }, 'g4-2026F-W06', 'u1', false) === true && isDone({ 'g4-2026-W06_u1': D }, 'g4-2026F-W06', 'u1') === true);
ok('進度存在但沒 done（做到一半）／沒有任何進度／null → 沒完成', isDone({ 'w_u1': { score: 3 } }, 'w', 'u1', true) === false && isDone({}, 'w', 'u1') === false && isDone(null, 'w', 'u1') === false);
ok('⭐ 舊格式（沒有週次前綴的核取方塊紀錄 items[itemId]）dup 也照樣算——網站本身也是這樣讀', isDone({ u1: D }, 'g4-2026F-W06', 'u1', true) === true);
ok('⭐ 暑假 todo 沒有 dup → 一律寬鬆（進度 key 的週次不一定跟發派清單一致）', isDone({ 'sl-2026-SW02_it9': D }, 'sl-2026-SW05', 'it9') === true);

console.log('\n【2】buildHomeworkList：dup 是真的算出來的（同 id 出現在幾個週次）');
const bhSrc = src.slice(src.indexOf('const TYPE_ORDER'), src.indexOf('// ── v420：把一堆作業排成家長看得懂的三區'));
const bh = new Function(bhSrc + '\nreturn buildHomeworkList;')();
const Q = (id) => ({ id, type: 'quiz', title: id, questions: [{ q: 'a', options: ['x', 'y'], answer: 0 }, { q: 'b', options: ['x', 'y'], answer: 0 }] });
const cls = { weeks: {
  W3: { label: 'W3', startISO: '2026-09-14', endISO: '2026-09-20', items: { vocab: [Q('shared'), Q('only3')] }, homework: { shared: { dueDate: '2026-09-20' }, only3: { dueDate: '2026-09-20' } } },
  W8: { label: 'W8', startISO: '2026-10-19', endISO: '2026-10-25', items: { vocab: [Q('shared')] }, homework: { shared: { dueDate: '2026-10-25' } } } } };
const list = bh(cls);
const by = {}; list.forEach(h => { by[h.wid + ':' + h.itemId] = h; });
ok('⭐⭐ 複製到兩週的 id → 兩筆都標 dup', by['W3:shared'] && by['W8:shared'] && by['W3:shared'].dup === true && by['W8:shared'].dup === true);
ok('⭐ 只出現在一週的 id → 不是 dup（保留舊資料的寬鬆比對）', by['W3:only3'] && by['W3:only3'].dup === false);
ok('⭐⭐ 合起來：W3 做完了 shared，W8 的 shared 還是要列進「沒做完」', (() => {
  const done = { 'W3_shared': D };
  return isDone(done, 'W3', 'shared', by['W3:shared'].dup) === true && isDone(done, 'W8', 'shared', by['W8:shared'].dup) === false; })());
ok('⭐ 呼叫處把 dup 傳進去', /isDone\(doneItems, hw\.wid, hw\.itemId, hw\.dup\)/.test(src));
console.log(fail ? `\n❌ t-line-v596：${pass} 過 / ${fail} 失敗` : `\n✅ t-line-v596：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
