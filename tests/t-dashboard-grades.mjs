/* t-dashboard-grades — v434 後台：每位學生要用「自己年級」的作業算進度
 * Alan 回報：進 G4 教室開後台，切到 G6 只看得到「G6 有沒有做 G4 的作業」＝ 永遠 0/20。
 * 不連網路：只測程式本身的把關與對應規則。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };
const W = new Function(slice(dash, 'function dashWeekIdForGrade', 'function dashCurrentWeekId') + '\nreturn { dashWeekIdForGrade };')();

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e) : '')));

// 真實資料的樣子（2026-09-13 用 Firestore REST 抓的）
const g6 = { order: ['g6-2026F-W01', 'g6-2026F-W02', 'g6-2026F-W03'],
             weeks: { 'g6-2026F-W02': { label: 'Week 2', dateRange: 'Sep 7 – Sep 13' } } };
const g3 = { order: ['2026F-W01', '2026F-W02'], weeks: { '2026F-W02': { label: 'Week 2', dateRange: 'Sep 7 – Sep 13' } } };
const srcWeeks = { 'g4-2026F-W02': { label: 'Week 2', dateRange: 'Sep 7 – Sep 13' } };

log.push('\n【1】同一週在各年級之間的對應');
ok('⭐ G4 的 g4-2026F-W02 → G6 的 g6-2026F-W02', W.dashWeekIdForGrade(g6, srcWeeks, 'g6', 'g4-2026F-W02') === 'g6-2026F-W02');
ok('⭐ G4 → G3（G3 沒有前綴）', W.dashWeekIdForGrade(g3, srcWeeks, 'g3', 'g4-2026F-W02') === '2026F-W02');
ok('G3 → G6（反過來也要對）', W.dashWeekIdForGrade(g6, g3.weeks, 'g6', '2026F-W02') === 'g6-2026F-W02');
ok('同一個年級就是原來那一週', W.dashWeekIdForGrade(g6, g6.weeks, 'g6', 'g6-2026F-W02') === 'g6-2026F-W02');
{
  // 前綴規則對不上（例如某年級週次自己取名）→ 用日期區間找
  const odd = { order: ['w-alpha', 'w-beta'], weeks: { 'w-beta': { label: '第二週', dateRange: 'Sep 7 – Sep 13' } } };
  ok('⭐ id 規則對不上 → 用「日期區間一樣」找到同一週', W.dashWeekIdForGrade(odd, srcWeeks, 'g6', 'g4-2026F-W02') === 'w-beta');
  const noRange = { order: ['x1'], weeks: { x1: { label: 'x', dateRange: '—' } } };
  ok('日期是「—」不能拿來配對（那是還沒設定）', W.dashWeekIdForGrade(noRange, srcWeeks, 'g6', 'g4-2026F-W02') === null);
}
ok('那個年級還沒有這一週 → 回 null（後台會灰掉，不是假裝 0 分）',
   W.dashWeekIdForGrade(g6, srcWeeks, 'g6', 'g4-2026F-W09') === null);
ok('年級資料還沒載到 → 回 null，不會爆掉', W.dashWeekIdForGrade(null, srcWeeks, 'g6', 'g4-2026F-W02') === null &&
   W.dashWeekIdForGrade({ order: [], weeks: {} }, srcWeeks, 'g6', 'g4-2026F-W02') === null);

log.push('\n【2】後台真的有把六個年級都載進來、而且照學生的年級算');
{
  const td = slice(dash, 'function TeacherDashboard(', 'function StudentDetail(');
  ['G1', 'G2', 'G4', 'G5', 'G6'].forEach(g => ok(`訂閱 ${g} 的課程資料`, td.indexOf('subscribeToClassData' + g) > 0));
  ok('G3 用的是沒有後綴的那一支（class/data）', /add\('g3', window\.subscribeToClassData\)/.test(td));
  ok('⭐ 每位學生的資料照「他自己的年級」挑', /const gradeOfStu = \(s\) => \(window\.gradeFromEmail/.test(td) &&
     /const gd = g && gradeData\[g\]/.test(td));
  ok('暑假模式不受影響（暑假題庫本來就是全校共用一份）', /if \(isSummerData\) return \{ weeks: weeksForStudent\(s\)/.test(td));
  ok('週次清單、單元清單也都跟著那位學生的年級走',
     /const orderForStudent = \(s\)/.test(td) && /return orderForStudent\(s\)\.flatMap/.test(td));

  const cwo = slice(dash, 'function ClassWeekOverview(', 'function isUid(');
  ok('⭐ 總覽每一列都用 dataFor（不是全班共用一份作業）',
     /const d = \(dataFor && dataFor\(s\)\)/.test(cwo) && /buildWeeklyReport\(s, d\.weeks, d\.order, \{ weekId: d\.weekId \|\| '__no_week__' \}\)/.test(cwo));
  ok('⭐ 那個年級沒有這一週時，不能讓 buildWeeklyReport 退回「最後一週」（會顯示別週的資料）',
     /__no_week__/.test(cwo) && /weekOrder\[weekOrder\.length - 1\]/.test(fs.readFileSync(new URL('data.js', ROOT), 'utf8')));
  ok('待批改、逾期也看同一份（不會一半用別班的）', /const wk = d\.weeks\[d\.weekId\]/.test(cwo) && /its2\[`\$\{d\.weekId\}_\$\{it\.id\}`\]/.test(cwo));
  ok('⭐ 不再因為「不是目前這一班」就灰掉、不算平均', /const isOffGrade = \(r\) => !!r\.noData/.test(cwo));
  ok('只有真的讀不到那一週才灰', /noData: !d\.ok/.test(cwo));
  ok('「本週 N 項練習」跟著篩選的年級走', /items: \(shown\.length \? shown : rows\)/.test(cwo));

  const acr = slice(dash, 'function AllClassReportModal(', 'function ClassWeekOverview(');
  ok('全班週報也是各用各年級的作業', /const d = \(dataFor && dataFor\(s\)\)/.test(acr));
  const sm = slice(dash, 'function StarsManager(', 'function ShopManager(');
  ok('自動集點也是（不然別班學生的星星算不出來）', /const d = dataFor \? dataFor\(st\) : null/.test(sm));
}

log.push('\n【3】（v435）新學生登入過、但還不在名單裡（Alan：「我怎麼看不到有新的學生？」）');
{
  const td = slice(dash, 'function TeacherDashboard(', 'function StudentDetail(');
  ok('⭐ 會把「有進度資料、名單裡卻沒有」的人抓出來', /const newcomers = useDashM/.test(td) && /rosterEmails\.has\(em\)/.test(td));
  ok('老師自己的帳號不算新學生', /em === myEmailD \|\| em === ownerEmailD/.test(td));
  ok('一鍵加入名單，年級用學號自動判斷', /addRosterStudent\(em, friendlyName\(s\), \(window\.gradeFromEmail && window\.gradeFromEmail\(em\)\)/.test(td));
  ok('⭐ 有寫清楚「沒登入的訪客不會出現」（不然老師會一直找）', /沒有登入的「訪客」不會出現在這裡/.test(td));
  ok('提示放在總覽最上面（看得到才有用）', td.indexOf('dash-newcomers') < td.indexOf('<ClassWeekOverview'));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
