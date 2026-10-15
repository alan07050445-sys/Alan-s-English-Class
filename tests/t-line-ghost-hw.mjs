/* t-line-ghost-hw — 🔴 v460（Alan：「家長反應學生作業都做完了，為什麼還在傳未交提醒」）
 *
 * 根因：老師把單元刪掉／換掉時，week.homework 裡那一筆 id 會留下來變孤兒。
 * 網站到處都會略過這種（getQuizItems 濾掉 → 學生看不到、也點不進去），
 * 但 Worker 本來是「找不到就拿 id 當標題」照樣列進提醒
 * → 變成學生**永遠做不掉**的作業，每天催到 28 天回溯期滿。
 * 2026-09-29 實測線上資料：六個年級追蹤 182 份，其中 38 份是這種幽靈
 * （G3 光 Week 3 就有 12 份，G1 的 34 份裡有 21 份是）。
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
const ROOT = new URL('..', import.meta.url);
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lw-')), 'w.mjs');
fs.writeFileSync(tmp, fs.readFileSync(new URL('line-notify-worker.js', ROOT), 'utf8'));
const W = await import('file://' + tmp);
const src = fs.readFileSync(new URL('line-notify-worker.js', ROOT), 'utf8');
const qm  = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const wk = (extra) => ({
  label: 'Week 3', startISO: '2026-09-14', endISO: '2026-09-20',
  items: { vocab: [
    { id: 'real_fc', type: 'flashcard', title: '單字卡', cards: [{ term: 'a', zh: 'ㄅ' }] },
    { id: 'real_qz', type: 'quiz',      title: '選擇題', questions: [{ q: 'x', options: ['a', 'b'], answer: 0 }] },
    { id: 'no_q',    type: 'quiz',      title: '還沒出題', questions: [] },
  ] },
  homework: { real_fc: { dueDate: '2026-09-20' }, real_qz: { dueDate: '2026-09-20' },
              ghost1: { dueDate: '2026-09-20' }, no_q: { dueDate: '2026-09-20' } },
  ...extra,
});

console.log('\n【1】⭐ 幽靈作業不可以進提醒清單');
const list = W.buildHomeworkList({ weeks: { 'W03': wk() } });
const ids = list.map(h => h.itemId).sort();
ok('⭐ 單元被刪掉的（ghost1）不再列入', ids.indexOf('ghost1') < 0);
ok('⭐ 沒有題目的（no_q）也不列入——網站也看不到它', ids.indexOf('no_q') < 0);
ok('真的能做的兩份還在', ids.join() === 'real_fc,real_qz');
ok('標題是課名，不是亂碼 id', list.every(h => h.title && !/^[a-z]+\d/.test(h.title)));

console.log('\n【2】判斷「做不做得到」要跟網站同一套');
const P = W.playableItem ? W.playableItem : null;
ok('lesson 本身就是一件任務（不需要題目）', W.buildHomeworkList({ weeks: { W: {
  label: 'W', startISO: '2026-09-14', endISO: '2026-09-20',
  items: { g: [{ id: 'ls', type: 'lesson', title: '先學一下' }] }, homework: { ls: { dueDate: '2026-09-20' } } } } }).length === 1);
ok('upload 也是（交照片就算）', W.buildHomeworkList({ weeks: { W: {
  label: 'W', startISO: '2026-09-14', endISO: '2026-09-20',
  items: { g: [{ id: 'up', type: 'upload', title: '拍照上傳' }] }, homework: { up: { dueDate: '2026-09-20' } } } } }).length === 1);
ok('cloze 要有挖空才算', W.buildHomeworkList({ weeks: { W: {
  label: 'W', startISO: '2026-09-14', endISO: '2026-09-20',
  items: { g: [{ id: 'c1', type: 'cloze', title: '短文', passage: '沒有挖空' }] }, homework: { c1: { dueDate: '2026-09-20' } } } } }).length === 0);
ok('認不得的型別一律不催（不拿沒把握的事吵家長）', W.buildHomeworkList({ weeks: { W: {
  label: 'W', startISO: '2026-09-14', endISO: '2026-09-20',
  items: { g: [{ id: 'x1', type: '未來的新題型', title: '?' }] }, homework: { x1: { dueDate: '2026-09-20' } } } } }).length === 0);
ok('⚠ 有留下「網站加題型時這裡要一起補」的提醒', /網站那邊新增題型時，這裡要一起補/.test(src));

console.log('\n【3】兩邊的題型清單要對得起來');
const siteTypes = new Set([...qm.slice(qm.indexOf('function getQuizItems'), qm.indexOf('// Generate flashcard data'))
  .matchAll(/item\.type === '([a-z-]+)'/g)].map(m => m[1]));
const workerTypes = new Set([...src.slice(src.indexOf('function playableItem'), src.indexOf('function buildHomeworkList'))
  .matchAll(/t === '([a-z-]+)'/g)].map(m => m[1]));
const missing = [...siteTypes].filter(t => !workerTypes.has(t));
ok('⭐ 網站算得出來的題型，Worker 都認得：' + (missing.length ? '缺 ' + missing.join('、') : '全部都有'), missing.length === 0);

console.log('\n【4】v460：提醒要留下「實際發了什麼」的紀錄');
/* 🔴 v514（Alan：「固定自動提醒幫我關閉，現在全部改成我手動提醒，家長覺得很吵」）：
   這一條本來守「Cron 跑完會存紀錄」。自動提醒停掉之後，要守的變成
   **Cron 不可以再發出任何訊息**——而且是「停在 Worker 裡」，
   不是只靠 Alan 記得去 Cloudflare 把 Trigger 刪掉。 */
// ⚠ 行尾的 // 註解也要拿掉（`return;   // …` 這種），不然比對會卡在註解上
const noC = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
ok('⭐⭐ 每天 18:00 的自動提醒已停用（scheduled 什麼都不做）',
   /async scheduled\([^)]*\)\s*\{\s*return;\s*\}/.test(noC));
ok('⭐⭐ Cron 不會再呼叫 runReminders（就算 Trigger 忘了刪也不會發）', (() => {
   // ⚠ 只看 scheduled 的函式主體——檔尾的 export 清單裡也有 runReminders 這個字，
   //   用「附近幾百個字元」比會被它打到（第一版就是）。
   const i = noC.indexOf('async scheduled');
   const body = noC.slice(i, noC.indexOf('},', i));
   return i > 0 && !/runReminders/.test(body); })());
ok('⭐ 但 runReminders 本身留著——老師要手動發、或看「誰還沒完成」都還要用它',
   /async function runReminders\(env, dryRun\)/.test(src) && /path === '\/run-reminders'/.test(src));
ok('⭐ 家長自己查作業那條路沒有關（Alan：「他們想知道功課就自己問官方 LINE」）',
   /輸入「作業」/.test(src));
ok('⭐ 綁定訊息不可以再承諾會自動提醒（承諾了卻不發＝騙家長）',
   !/也會提醒孩子還沒完成的作業/.test(src) && !/班級通知與作業提醒都會傳到這裡/.test(src));
ok('手動跑的也會留', /if \(!dry\) await saveRunLog\(env, R, 'manual'\);/.test(src));
ok('只留最近 10 次（KV 不要無限長大）', /list\.slice\(0, 10\)/.test(src));
ok('⭐ 老師端讀得到（/run-log，要密碼）',
   /path === '\/run-log'/.test(src) && /if \(!adminOk\) return json\(\{ ok: false, error: 'unauthorized' \}/.test(src));
ok('存的內容包含家長收到的原文', /text: x\.text,/.test(src));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
