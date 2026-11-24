/* t-v683 — 小助手 Jarvis 化：新增查詢（星星餘額／全班錯最多／待兌換／好幾天沒練習）＋今日簡報＋靜音開關
 * 不連網路：用假資料驗證「數字由程式算」。AI 只選 qtype（askVerify 要把亂填的夾回去）。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });
W.gradeFromEmail = (e) => (String(e).match(/^(g\d)/) || [])[1] || '';

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const run = (plan, ctx) => W.askQueryAnswer({ qtype: '', student: '', gradeId: '', ...plan }, ctx);

const cats = W.CATEGORIES || [];
const vId = (cats.find(c => c.id === 'vocab') || { id: 'vocab' }).id;
const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const DAY = 86400000;
const gradeData = { g4: { order: ['w'], weeks: { w: { label: 'Week 8', dateRange: 'x',
  items: { [vId]: [{ id: 'a', title: 'Unit A' }, { id: 'b', title: 'Unit B' }] },
  homework: { a: { dueDate: ymd(Date.now() + DAY) }, b: { dueDate: ymd(Date.now() + 20 * DAY) } } } } } };
const roster = [
  { name: 'Nick', email: 'g4nick@t' }, { name: 'Eric', email: 'g4eric@t' }, { name: 'Amy', email: 'g4amy@t' },
  { name: 'Gone', email: 'g4gone@t', active: false },
];
const wq = (q) => ({ q, answer: 'x' });
const students = [
  { email: 'g4nick@t', name: 'Nick', uid: 'u1', updatedAt: Date.now() - 1 * DAY,
    items: { w_a: { done: true, score: 90 }, w_b: { wrongQuestions: [wq('Q-shared'), wq('Q-nick')] } } },
  { email: 'g4eric@t', name: 'Eric', uid: 'u2', updatedAt: Date.now() - 9 * DAY,
    items: { w_b: { wrongQuestions: [wq('Q-shared'), wq('Q-eric')] } } },
];
const stars = { 'g4nick@t': { balance: 120 } };
const redeems = [
  { id: 'r1', email: 'g4nick@t', name: 'Nick', itemName: '魔擦筆', cost: 1200, status: 'pending', at: Date.now() },
  { id: 'r2', email: 'g4eric@t', name: 'Eric', itemName: 'UNO', cost: 2000, status: 'done', at: Date.now() },
];
const ctx = { roster, students, gradeData, stars, redeems, currentWeekId: (w, o) => o[o.length - 1] };

console.log('\n【1】router 的 qtype 夾回受控值');
ok('原始碼含新 qtype', /'balance', 'classmistakes', 'redeems', 'inactive'/.test(data));
ok('router 提示詞有說明四種新查詢', /balance\s+（/.test(data) && /classmistakes（/.test(data) && /redeems\s+（/.test(data) && /inactive\s+（/.test(data));
ok('查星星沒說是誰 → 要問（balance 也算要學生的 qtype）', /qtype === 'balance'\) && !out\.student/.test(data));

console.log('\n【2】待兌換');
const rd = run({ qtype: 'redeems' }, ctx);
ok('只列 pending（Nick 的魔擦筆），已處理的不列', rd.rows.length === 1 && /魔擦筆/.test(rd.rows[0].text));
ok('提醒「按已給他才扣」', /已給他，扣點/.test(rd.foot));
ok('沒有待兌換 → 老實說', /沒有人在等你/.test(run({ qtype: 'redeems' }, { ...ctx, redeems: [] }).head));

console.log('\n【3】好幾天沒練習');
const ina = run({ qtype: 'inactive' }, ctx);
ok('Eric 9 天沒練習列出來、Nick 1 天不列', ina.rows.some(r => r.name === 'Eric') && !ina.rows.some(r => r.name === 'Nick'));
ok('Amy 從沒登入過也要列出來（最需要被找出來）', ina.rows.some(r => r.name === 'Amy' && /還沒登入/.test(r.text)));
ok('已停用的 Gone 不列', !ina.rows.some(r => r.name === 'Gone'));
ok('9 天以上標紅（bad）', ina.rows.find(r => r.name === 'Eric').tone === 'bad');

console.log('\n【4】全班錯最多');
const cm = run({ qtype: 'classmistakes' }, ctx);
ok('Q-shared 兩位都錯 → 上榜；只有一個人錯的不算「全班」', cm.rows.length === 1 && /Q-shared/.test(cm.rows[0].text) && cm.rows[0].name === '2 位');
ok('沒有共同錯題 → 老實說', /沒有哪一題/.test(run({ qtype: 'classmistakes' }, { ...ctx, students: [students[0]] }).head));

console.log('\n【5】星星餘額');
W.computeAutoStars = () => ({ total: 30 }); W.computeCheckin = () => ({ total: 5 });
W.computeFixedStars = () => ({ total: 2 }); W.computeTreatStars = () => ({ total: 0 });
W.mxSpent = () => 50;
const bal = run({ qtype: 'balance', student: 'Nick' }, ctx);
ok('120 手動 + 37 自動 − 50 裝扮 = 107', /107/.test(bal.head));
ok('申請兌換中的列出來（還沒扣）', bal.rows.some(r => /申請兌換中/.test(r.name) && /魔擦筆/.test(r.text)));
ok('找不到的學生 → 老實說', /找不到/.test(run({ qtype: 'balance', student: 'Zed' }, ctx).head));

console.log('\n【6】今日簡報（只讀）');
ok('askBriefing 存在且匯出', typeof W.askBriefing === 'function');
W.dashCurrentWeekId = ctx.currentWeekId;
W.subscribeAllStudents = undefined;
const brief = await (async () => {
  // askBriefing 會呼叫 askLoadQueryData（連網）——這裡直接餵資料驗證組裝邏輯
  const src = data.slice(data.indexOf('async function askBriefing'), data.indexOf('Object.assign(window, { askBriefing })'));
  const fn = new Function('askLoadQueryData', 'askQueryAnswer', 'buildWeeklyReport', 'window', src + '\nreturn askBriefing;')(
    async () => ({ students, gradeData, stars, redeems }), W.askQueryAnswer, W.buildWeeklyReport, W);
  return fn(roster, ctx.currentWeekId);
})();
const keys = brief.lines.map(l => l.key);
ok('簡報有：待兌換、快到期、沒做完、沒練習', ['redeems', 'due', 'unfinished', 'inactive'].every(k => keys.includes(k)));
ok('待兌換排第一（最急）', keys[0] === 'redeems');
const due = brief.lines.find(l => l.key === 'due');
ok('作業快到期＝明天到期、還沒做完的人（Eric、Amy；Nick 已做完 Unit A 不算）', due && due.rows.map(r => r.name).sort().join() === 'Amy,Eric');
ok('每一行都帶名單，不是只有數字', brief.lines.every(l => Array.isArray(l.rows) && l.rows.length));

console.log('\n【7】接線');
ok('小助手靜音存在本機、預設不靜音', /localStorage\.getItem\('alan-ask-mute'\) === '1'/.test(app));
ok('靜音時不自己開機簡報', /if \(!isTeacher \|\| briefMuted\) return;/.test(app));
ok('每個分頁只講一次', /alan-brief-done/.test(app));
ok('面板有靜音鈕、有簡報卡、打開時沒簡報就算一份', /ask-head-mute/.test(ed) && /ask-brief-line/.test(ed) && /onRefreshBriefing\(\)/.test(ed));
ok('簡報不改資料（askBriefing 只呼叫查詢函式）',
   !/addStarEntry|setRedeemStatus|saveProgress/.test(data.slice(data.indexOf('async function askBriefing'), data.indexOf('Object.assign(window, { askBriefing })'))));

console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
