/* t-v687 — 簡報加上「昨天誰剛完成」
 * 看每個單元的完成時間（done 毫秒），昨天（本地 00:00～24:00）完成的才算；
 * 不是只看這週；舊資料 done=true（沒時間）不亂猜；沒有人完成就不出現；好消息排最後、不算進「N 件事」。 */
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

const t0 = new Date(); t0.setHours(0, 0, 0, 0);
const todayStart = t0.getTime(), DAY = 86400000;
const yAt = (h) => todayStart - DAY + h * 3600000;          // 昨天 h 點

const roster = [
  { name: 'Nick', email: 'g4nick@t' }, { name: 'Eric', email: 'g4eric@t' }, { name: 'Amy', email: 'g4amy@t' },
  { name: 'Old', email: 'g4old@t' }, { name: 'Gone', email: 'g4gone@t', active: false },
];
const students = [
  // Nick：昨天做完 3 項（含上週補做的 w0_x），最高 95；另外前天 1 項、今天 1 項不算
  { email: 'g4nick@t', name: 'Nick', updatedAt: Date.now(), items: {
    w_a: { done: yAt(9), score: 80 }, w_b: { done: yAt(20), score: 95 }, w0_x: { done: yAt(23.5), score: 70 },
    w_c: { done: todayStart - DAY - 3600000, score: 100 }, w_d: { done: todayStart + 1000, score: 100 } } },
  // Eric：只有一項、沒分數
  { email: 'g4eric@t', name: 'Eric', updatedAt: Date.now(), items: { w_a: { done: yAt(12) } } },
  // Old：舊資料 done 只是 true（沒有時間）→ 不算
  { email: 'g4old@t', name: 'Old', updatedAt: Date.now(), items: { w_a: { done: true, score: 90 } } },
  // Gone 停用：昨天有做也不列
  { email: 'g4gone@t', name: 'Gone', updatedAt: Date.now(), items: { w_a: { done: yAt(10) } } },
];
const mk = (stu) => {
  const src = data.slice(data.indexOf('async function askBriefing'), data.indexOf('Object.assign(window, { askBriefing })'));
  return new Function('askLoadQueryData', 'askQueryAnswer', 'buildWeeklyReport', 'window', src + '\nreturn askBriefing;')(
    async () => ({ students: stu, gradeData: {}, stars: {}, redeems: [] }), W.askQueryAnswer, W.buildWeeklyReport, W);
};

console.log('\n【1】昨天誰剛完成');
const b = await mk(students)(roster, () => null);
const y = b.lines.find(l => l.key === 'yesterday');
ok('有「昨天」這一行', !!y);
ok('只有 Nick、Eric 上榜（Amy 沒資料、Old 沒時間、Gone 停用都不列）', y && y.rows.map(r => r.name).sort().join() === 'Eric,Nick');
const nick = y.rows.find(r => r.name === 'Nick'), eric = y.rows.find(r => r.name === 'Eric');
ok('Nick 3 項（前天、今天的不算；上週補做的 w0_x 要算）、最高 95 分', nick.n === 3 && /完成 3 項（最高 95 分）/.test(nick.text));
ok('Eric 沒有分數就不寫分數', /^完成 1 項$/.test(eric.text));
ok('多的排前面（Nick 在 Eric 前）', y.rows[0].name === 'Nick');
ok('標題寫人數與項數：2 位、共 4 項', /2 位同學/.test(y.text) && /共 4 項/.test(y.text));
ok('好消息排最後', b.lines[b.lines.length - 1].key === 'yesterday');

console.log('\n【2】數字與沒人的情況');
ok('todo 不含昨天的好消息（沒有待辦時是 0）', b.todo === b.lines.filter(l => l.key !== 'yesterday').length);
const none = await mk([{ email: 'g4nick@t', name: 'Nick', updatedAt: Date.now(), items: { w_a: { done: todayStart - DAY - 5000 } } }])(roster, () => null);
ok('昨天沒人完成 → 不出現這一行（不拿「沒人完成」嚇自己）', !none.lines.some(l => l.key === 'yesterday'));

console.log('\n【3】畫面');
ok('泡泡標題用 todo（只有好消息時寫「今日簡報」），並且最多列 5 行不會把昨天切掉', /briefing\.todo > 0 \? `📋 今天有 \$\{briefing\.todo\} 件事` : '📋 今日簡報'/.test(app) && /briefing\.lines\.slice\(0, 5\)/.test(app));
ok('面板：好消息的按鈕寫「看總覽」不是「去處理」', /l\.key === 'yesterday' \? '看總覽 →' : '去處理 →'/.test(ed));
ok('簡報仍然只讀', !/addStarEntry|setRedeemStatus|saveProgress/.test(data.slice(data.indexOf('async function askBriefing'), data.indexOf('Object.assign(window, { askBriefing })'))));

console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
