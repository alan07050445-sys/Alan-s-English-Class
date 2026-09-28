/* t-hw-late — v459（Alan：「有學生反應補交作業不會顯示已完成 並且消掉」）
 * 用真實程式碼跑完整條路：做完 → 寫本機 → 寫雲端 → 雲端併回本機 → 大廳判斷「還要不要提醒」。
 * 抓到的兩個真 bug：
 *   ① 合併時「取分數比較好的一次」把 done 一起換掉。單字卡／上傳作業完成時 score 是 null，
 *      任何一筆「考過但沒到 80」的本機舊紀錄都會贏過雲端那筆「已完成」→ 換裝置就沒打勾。
 *   ② 單字卡的「學習／測驗做過沒」只讀 localStorage → 換一台就歸零，「完成練習」永遠鎖著。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const qm  = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a)));

const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
globalThis.window = { _currentUser: { uid: 'kid1', displayName: 'Tayler', email: 't@x.com' } };
const cloudWrites = [];
window.saveProgressItem = (u, n, e, key, data) => { cloudWrites.push({ key, data }); };
window._bumpQmProgress = () => {};

new Function(
  cut(qm, "const QM_KEY = 'alans-qm-v1';", '// v298: 側欄收合')
  + cut(qm, 'function saveQuizModeCompletion', '\n/* v361')
  + '\nglobalThis.saveQuizModeCompletion = saveQuizModeCompletion; globalThis.loadQMProg = loadQMProg;'
)();
new Function('globalThis.mergeCloud = function(myProgressItems){'
  + cut(app, 'const qmProgress = useAppMemo(() => {', '}, [qmProgressVersion').replace('const qmProgress = useAppMemo(() => {', '') + '};')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

// 跑一次完整流程，回傳「大廳還會不會催他」
const run = ({ local = {}, cloud = {}, redo = null }) => {
  for (const k of Object.keys(store)) delete store[k];
  localStorage.setItem('alans-qm-v1:u:kid1', JSON.stringify(local));
  cloudWrites.length = 0;
  window.loadQMProg = loadQMProg;
  if (redo) saveQuizModeCompletion('W05_hw1', { title: 'HW', type: redo.type || 'quiz' }, redo);
  const items = { ...cloud };
  cloudWrites.forEach(w => { items[w.key] = w.data; });
  const merged = mergeCloud(items);
  const p = merged['W05_hw1'];
  return { merged: p, 還在催: !(p && p.done), 雲端寫入: cloudWrites.length };
};

console.log('\n【1】一般補交：做完就該打勾、也該從「還沒完成」消失');
ok('沒做過 → 補交 100 分', !run({ redo: { score: 10, total: 10 } }).還在催);
ok('剛好 80 分也算完成', !run({ redo: { score: 8, total: 10 } }).還在催);
ok('之前考 60 → 補交 100', !run({
  local: { W05_hw1: { done: 0, score: 6, total: 10, ts: 1 } },
  cloud: { W05_hw1: { done: null, score: 60, total: 10 } },
  redo: { score: 10, total: 10 } }).還在催);
ok('換一台裝置補交（本機空的、雲端有舊低分）', !run({
  cloud: { W05_hw1: { done: null, score: 60, total: 10 } }, redo: { score: 10, total: 10 } }).還在催);

console.log('\n【2】⭐ 單字卡／上傳作業：完成時沒有分數，最容易被洗掉');
ok('單字卡補交（score 是 null）算完成', !run({ redo: { doneCount: 1, total: 1, type: 'flashcard' } }).還在催);
ok('上傳作業交了照片算完成',              !run({ redo: { doneCount: 1, total: 1, type: 'upload' } }).還在催);
const cross = run({
  local: { W05_hw1: { done: 0, score: 6, total: 10, ts: 1 } },          // 這台以前考 60 分沒過
  cloud: { W05_hw1: { done: 111, score: null, total: 1, itemType: 'flashcard' } }, // 別台已經做完了
});
ok('⭐ 別台做完的單字卡，不會被這台的舊低分洗掉（換裝置的元凶）', !cross.還在催);
ok('分數仍然保留（合併只救 done，不會亂動成績）', cross.merged.score === 6);

console.log('\n【3】原本就對的行為不可以跑掉');
const worse = run({
  local: { W05_hw1: { done: 10, score: 9, total: 10, ts: 1 } },
  cloud: { W05_hw1: { done: 111, score: 90, total: 10 } },
  redo: { score: 8.5, total: 10 } });
ok('重做考差不會把好成績蓋掉（仍是 90）', worse.merged.score === 9 && worse.雲端寫入 === 0);
const notYet = run({ redo: { score: 75, total: 100 } });
ok('⭐ 只考 75 分＝還沒完成（未達 80 的規則沒被我改掉）', notYet.還在催 && notYet.merged.done === 0);
ok('但分數有記下來，學生看得到自己考幾分', notYet.merged.score === 75);

console.log('\n【4】單字卡的「學習／測驗做過沒」要跨裝置');
ok('⭐ FlashcardStandalone 收 cloudModes', /function FlashcardStandalone\(\{[^}]*cloudModes/.test(qm));
ok('⭐ 傳進去的是合併過雲端的那一份（qmProg），不是 localStorage',
   /cloudModes=\{\(\(qmProg \|\| \{\}\)\[`\$\{weekId\}_\$\{selectedItem\.id\}`\] \|\| \{\}\)\.modes/.test(qm));
ok('本機與雲端取聯集（不是二選一）', /return \{ \.\.\.local, \.\.\.\(cloudModes \|\| \{\}\) \};/.test(qm));
ok('雲端晚到也算數（有補一個 effect）', /if \(!cloudModes\) return;[\s\S]{0,200}setModes/.test(qm));

console.log('\n【5】「之前沒完成」那一列要說得出原因');
ok('⭐ 帶出上次幾分（不然學生做完看到它還在，會以為壞掉）', /lastPct,\s*\n\s*weekLabel/.test(qm));
ok('畫面上寫清楚要 80 分', /要 80 分才算完成/.test(qm));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
