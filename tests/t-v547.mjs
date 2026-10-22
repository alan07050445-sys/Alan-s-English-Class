/* t-v547 — 聊天室直接回答問題＋改固定課表
 *
 * Alan 同意的兩項：①查詢（「這週誰還沒做完」「Nick 錯最多的是什麼」）②改固定課表。
 * 聊天室以前只會「把畫面打開」；現在 query 是直接回答。
 *
 * ⭐⭐ 數字一律由程式算，AI 只選 qtype——用的是後台總覽**同一支** buildWeeklyReport，
 *   所以聊天室說的跟後台看到的一定對得上。
 * ⚠ 名單上有、但從沒登入過的孩子不可以消失（那正是最需要被找出來的人）。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });
W.gradeFromEmail = (e) => (String(e).match(/^(g\d)/) || [])[1] || '';   // 學號前綴＝年級

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const run = (plan, ctx) => W.askQueryAnswer({ qtype: '', student: '', gradeId: '', ...plan }, ctx);

/* ── 假資料：G4 這週 3 項作業（單字 2、文法 1）、G6 這週 2 項（單字 2）── */
const cats = W.CATEGORIES || [];
const vId = (cats.find(c => c.id === 'vocab') || { id: 'vocab' }).id;
const gId = (cats.find(c => c.id === 'grammar') || { id: 'grammar' }).id;
const gradeData = {
  g4: { order: ['w'], weeks: { w: { label: 'Week 8', dateRange: 'Oct 19 – Oct 25', items: {
        [vId]: [{ id: 'a', title: 'Unit A' }, { id: 'b', title: 'Unit B' }], [gId]: [{ id: 'c', title: 'Gram C' }] } } } },
  g6: { order: ['w'], weeks: { w: { label: 'Week 8', dateRange: 'Oct 19 – Oct 25', items: {
        [vId]: [{ id: 'x', title: 'Unit X' }, { id: 'y', title: 'Unit Y' }] } } } },
};
const roster = [
  { name: 'Nick',  email: 'g4nick@t' },        // 做完 3/3
  { name: 'Eric',  email: 'g4eric@t' },        // 做了 1/3
  { name: 'Amy',   email: 'g4amy@t' },         // 從沒登入過（沒有進度文件）
  { name: 'Elroy', email: 'g6elroy@t' },       // G6 做了 0/2
  { name: 'Elory', email: 'g4elory@t' },       // G4 做了 2/3
  { name: 'Gone',  email: 'g4gone@t', active: false },   // 已停用
  { name: 'Lost',  email: 'g9lost@t' },        // 年級查不到作業
];
const done = (x) => ({ done: true, score: 90, ...x });
const students = [
  { email: 'g4nick@t',  name: 'Nick',  items: { w_a: done(), w_b: done(), w_c: done() } },
  { email: 'g4eric@t',  name: 'Eric',  items: { w_a: done({ score: 60 }),
      w_b: { wrongQuestions: [{ q: 'q1', answer: 'a1' }, { q: 'q2', answer: 'a2' }, { q: 'q3', answer: 'a3' }] } } },
  { email: 'g6elroy@t', name: 'Elroy', items: {} },
  { email: 'g4elory@t', name: 'Elory', items: { w_a: done(), w_b: done() } },
];
const ctx = { roster, students, gradeData, currentWeekId: (w, o) => o[o.length - 1] };

console.log('\n【1】⭐⭐ 誰還沒做完——數字我自己能心算');
const un = run({ qtype: 'unfinished' }, ctx);
ok('⭐ 沒做完的是 Eric(1/3)、Amy(0/3)、Elroy(0/2)、Elory(2/3)，Nick 做完了不在裡面',
   un.rows.map(r => r.name).sort().join() === 'Amy,Elory,Elroy,Eric');
ok('⭐ 由最少的排前面（0% 的先、再 33%、再 67%）',
   un.rows.map(r => r.pct).join() === '0,0,33,67');
ok('⭐ 每一列寫「幾/幾」與還差哪一類', (() => {
   const e = un.rows.find(r => r.name === 'Eric');
   return /^1\/3（33%）/.test(e.text) && /還差/.test(e.text); })());
ok('⭐⭐ 從沒登入過的 Amy **一定要在**，而且寫「還沒登入過」', (() => {
   const a = un.rows.find(r => r.name === 'Amy');
   return !!a && /還沒登入過/.test(a.text) && a.done === 0; })());
ok('⭐ 已停用的孩子不算', !un.rows.some(r => r.name === 'Gone'));
ok('⭐⭐ 查不到作業資料的孩子不可以安靜消失——要在答案底下講出來',
   /找不到作業資料所以沒算到：Lost/.test(un.foot));
ok('⭐ 每個孩子用**自己年級**那一份作業（Elroy 是 G6，總共 2 項不是 3 項）',
   un.rows.find(r => r.name === 'Elroy').total === 2);
ok('⭐ 答案底下寫明算法跟後台總覽同一套、不含暑假', /跟後台「總覽」同一套/.test(un.foot) && /不含暑假/.test(un.foot));
ok('⭐ 標題寫人數', /還沒做完的有 4 位/.test(un.head));

const g4 = run({ qtype: 'unfinished', gradeId: 'g4' }, ctx);
ok('⭐ 指定年級只看那個年級（G4 不含 Elroy）', !g4.rows.some(r => r.name === 'Elroy') && g4.rows.length === 3);
const ns = run({ qtype: 'notstarted' }, ctx);
ok('⭐ 完全沒開始的只有 Amy 與 Elroy（Eric 做了一項不算）',
   ns.rows.map(r => r.name).sort().join() === 'Amy,Elroy');
ok('⭐ 全部做完時要說「每位都做完了」而不是一個空清單', (() => {
   const all = { ...ctx, roster: [roster[0]] };
   return /每位都做完了/.test(run({ qtype: 'unfinished' }, all).head); })());

console.log('\n【2】某一位學生這週的狀況');
const st = run({ qtype: 'student', student: 'Eric' }, ctx);
ok('⭐ 完成 1/3（33%）、平均 60 分、還差單字 1 項＋文法 1 項', (() => {
   const t = st.rows.map(r => r.name + ':' + r.text).join('|');
   return /完成:1\/3（33%）/.test(t) && /平均分數:60 分/.test(t) && /還差:/.test(t); })());
ok('   標題寫年級與週次', /G4 Week 8/.test(st.head));
ok('⭐⭐ 名單裡找不到就老實說，不猜最像的那一個', /名單裡找不到「Nicky」/.test(run({ qtype: 'student', student: 'Nicky' }, ctx).head));
ok('⭐⭐ Elroy／Elory 各自對到自己，而且提醒有長得很像的名字', (() => {
   const a = run({ qtype: 'student', student: 'Elroy' }, ctx), b = run({ qtype: 'student', student: 'Elory' }, ctx);
   return /G6/.test(a.head) && /G4/.test(b.head) && /長得很像/.test(a.foot) && /長得很像/.test(b.foot); })());
ok('   還沒登入過的學生要標出來', /還沒登入過/.test(run({ qtype: 'student', student: 'Amy' }, ctx).rows.map(r => r.text).join()));

console.log('\n【3】錯題');
const mk = run({ qtype: 'mistakes', student: 'Eric' }, ctx);
ok('⭐ Eric 有 3 題還沒訂正，集中在 Unit B', /共 3 題/.test(mk.head) && /Unit B/.test(mk.rows[0].text) && mk.rows[0].name === '3 題');
ok('⭐⭐ 要講明這是「還沒訂正的累積」不是某段時間內的（錯的時間沒有記錄）——不可以假裝是「最近」',
   /不是某段時間內的/.test(mk.foot));
ok('⭐ 引導到「針對弱點出練習」那一條（那是 weak，不是 query）', /針對 Eric 的弱點出練習/.test(mk.foot));
ok('   沒有錯題就誇一句，不是空清單', /沒有還沒訂正的錯題/.test(run({ qtype: 'mistakes', student: 'Nick' }, ctx).head));

console.log('\n【4】⭐⭐ 路由要把參數夾回受控值（模型亂填，程式照做就會算錯／存錯）');
const V = (o) => W.askVerify({ intent: 'timetable', student: 'Nick', ...o }, { roster });
ok('⭐ 亂填的 qtype 當沒講，由畫面問他', (() => {
   const p = W.askVerify({ intent: 'query', qtype: 'destroy' }, { roster });
   return p.intent === 'unknown' && /想查什麼/.test(p.ask); })());
ok('⭐ student／mistakes 沒給學生 → 問「要查哪一位」', (() => {
   const p = W.askVerify({ intent: 'query', qtype: 'mistakes' }, { roster });
   return p.intent === 'unknown' && /哪一位/.test(p.ask); })());
ok('⭐ 星期只收 0~6，時間只收合法的 HH:MM（25:99 當沒講）', (() => {
   const p = V({ fromDay: 9, toDay: 3, start: '25:99', end: '7:5' });
   return p.fromDay === -1 && p.toDay === 3 && p.start === '' && p.end === ''; })());
ok('⭐ 個位數小時補零（9:30 → 09:30），不然字串比大小會錯', V({ toDay: 3, start: '9:30' }).start === '09:30');
ok('⭐ 什麼都沒說要改成什麼 → 問，不是亂猜', (() => {
   const p = V({});
   return p.intent === 'unknown' && /改成星期幾、幾點/.test(p.ask); })());
ok('⭐ 只改這一次要保留 once 旗標（畫面才能老實說做不到）', V({ toDay: 3, once: true }).once === true);
ok('   名單裡沒有這個人 → 問', (() => {
   const p = W.askVerify({ intent: 'timetable', student: 'Zed', toDay: 3 }, { roster });
   return p.intent === 'unknown'; })());

console.log('\n【5】🗓 改固定課表');
const slot = (id, day, start, end, names, emails) => ({ id, day, start, end, names, students: emails, together: emails.length > 1 });
const tt = { slots: [
  slot('s1', 3, '17:00', '18:30', ['Nick'], ['g4nick@t']),
  slot('s2', 0, '10:00', '11:30', ['Nick'], ['g4nick@t']),
  slot('s3', 2, '16:00', '17:30', ['Elvis', 'Elory'], ['g4elvis@t', 'g4elory@t']),
  slot('s4', 3, '19:00', '20:00', ['Eric'], ['g4eric@t']),
] };
const mv = (o) => W.ttMoveSlot(tt, { email: 'g4nick@t', name: 'Nick', fromDay: -1, toDay: -1, start: '', end: '', ...o });
ok('⭐⭐ Nick 一週兩堂又沒說哪一天 → 問，不猜', /要改哪一堂/.test(mv({ toDay: 4 }).ask || ''));
ok('⭐ 說了週三就改週三那一堂：17:00–18:30 → 17:30–19:00（只給開始時間，長度保持 90 分鐘）', (() => {
   const r = mv({ fromDay: 3, start: '17:30' });
   return r.before === '週三 17:00–18:30' && r.after === '週三 17:30–19:00'; })());
ok('⭐ 只改星期、時間不變', (() => { const r = mv({ fromDay: 3, toDay: 4 }); return r.after === '週四 17:00–18:30'; })());
ok('⭐ 另一堂（週日）完全沒被動到', (() => {
   const r = mv({ fromDay: 3, start: '17:30' });
   return r.tt.slots.find(x => x.id === 's2').start === '10:00' && r.tt.slots.length === 4; })());
ok('⭐ 他週五沒有課 → 說他的課是哪幾天，不是只回一句「找不到」',
   /* ⚠ 只釘「兩堂都列出來」，不釘順序——回的是依星期排序（週日在前），
        我第一版的正則假設週三在週日前，是測試寫錯不是程式錯。 */
   (() => { const e = mv({ fromDay: 5, start: '17:30' }).error;
            return /週五沒有課/.test(e) && /週三 17:00–18:30/.test(e) && /週日 10:00–11:30/.test(e); })());
ok('⭐ 結束比開始早要擋', /要比開始時間/.test(mv({ fromDay: 3, start: '17:30', end: '17:00' }).error));
ok('⭐ 跟現在一樣就說沒要改的（不要白存一次）', /跟現在一樣/.test(mv({ fromDay: 3, start: '17:00' }).error));
ok('⭐⭐ 跟同一天另一堂撞時間要回報（Eric 週三 19:00–20:00），但不擋', (() => {
   const r = mv({ fromDay: 3, start: '19:30' });
   return !r.error && r.clash.length === 1 && /Eric/.test(r.clash[0]); })());
ok('⭐⭐ 一個時段有好幾個孩子（Elvis & Elory）→ 回報「一起上的還有誰」，按下去之前就講清楚', (() => {
   const r = W.ttMoveSlot(tt, { email: 'g4elory@t', name: 'Elory', fromDay: -1, toDay: 4, start: '', end: '' });
   return !r.error && r.others.join() === 'Elvis'; })());
ok('   不在課表裡的孩子 → 說要先排進課表', /要先把他排進固定課表/.test(
   W.ttMoveSlot(tt, { email: 'g4zed@t', name: 'Zed', fromDay: -1, toDay: 3, start: '', end: '' }).error));

console.log('\n【6】接到畫面上');
ok('⭐ 聊天室收到 query 直接算、直接顯示答案（不走確認卡）',
   /plan\.intent === 'query' && window\.askQueryAnswer/.test(ed) && /m\.plan\.intent !== 'query'/.test(ed));
ok('⭐ 算法用的是後台那支（dashCurrentWeekId 匯出給它）',
   /currentWeekId: window\.dashCurrentWeekId/.test(ed) && /Object\.assign\(window, \{[^}]*\bdashCurrentWeekId\b[^}]*\}\)/.test(dash));   // ⚠ 不釘匯出列的順序（v548 又加了 HwRemind）
ok('⭐ 讀資料要先放一則「查詢中」，不是畫面卡住', /好，我查一下…/.test(ed));
ok('⭐⭐ 一句話「查＋做」（「誰沒做完，順便提醒他們」）：做不到的那一半要**講出來**，不可以安靜丟掉',
   /\/提醒\|催\|通知\|傳給\|發給\/\.test\(t\)/.test(ed) && /提醒這週沒做完的人」，我幫你把人選好/.test(ed));
ok('⭐⭐ 改課表一定先 confirm，而且寫出改前→改後', /window\.confirm\(msg\)/.test(app) && /\$\{r\.before\}  →  \$\{r\.after\}/.test(app));
ok('⭐ 一起上的人與撞時間都寫在確認框裡', /一起上，他們也會一起改/.test(app) && /跟這幾堂時間重疊/.test(app));
ok('⭐⭐ 「只改這一次」要老實說做不到，不可以偷偷改成固定的', /if \(plan\.once\)/.test(app) && /只改這一次」我還不會/.test(app));
ok('⭐ 提示詞教了兩個新工具與 qtype', /query     — he is ASKING/.test(data) && /timetable — change ONE student/.test(data));
ok('⭐ 提示詞講明「你不回答、只選 qtype」', /You do NOT answer\. You only pick the qtype/.test(data));
ok('⭐ weak 與 query 的分界寫清楚（出練習＝weak，問是什麼＝query）', /that is "weak", not "query"/.test(data));
/* ⚠ v549 Alan 要求小助手打開時不要再放範例句（「我自己會打，太亂了」）——
   這一條本來釘「範例句裡有這幾句」，現在改成釘「路由提示詞已經把 weak／query 的分界教好了」，
   沒有範例句不影響他講「Nick 最近哪裡最弱」會被當成查詢。 */
ok('⭐ weak／query 的分界在提示詞裡（不靠範例句）', /Asking WHAT \/ WHO \/ HOW MANY ＝ query/.test(data));

console.log(fail ? `\n❌ t-v547：${pass} 過 / ${fail} 失敗` : `\n✅ t-v547：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
