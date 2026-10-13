/* t-timetable — 📅 固定課表（v497）
 *
 * Alan 2026-10-13 給了整份課表，接著**連兩次更正**打掉我的假設：
 *   ① 他先說「我是一對一」 → 其實 Elvis & Elory、Joyce & Lydia 是兩人一起上
 *   ② 我以為同一行就是一起上 → 「Eric & Tayler 只是兄弟我寫在一起，時間是分開的」
 * ⭐ 所以這支守的第一件事就是：**同一個時段寫兩個名字，不代表一起上。**
 *
 * 另外 v496 假設「每人每週一堂」也是錯的——他多數學生一週兩堂。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

/* 名字是編的，但**排法照 Alan 真正的課表**（兩人一組、一週兩堂、全形冒號、en dash） */
const R = ['Ann', 'Ben', 'Cody', 'Dana', 'Evan', 'Fay'].map(n => ({ name: n, email: n.toLowerCase() + '@x', active: true }));
const TXT = `星期一
Ann：18:00–20:00
Ben & Cody：20:00–22:00

星期二
Dana & Evan：17:30–20:30

星期三
Fay：19:15–21:15

星期五
沒有固定課程

星期日
Fay：10:00–12:00
Ann：13:00–15:00`;
const T = W.timetableParse(TXT, R);

console.log('\n【1】貼上就建得好（Alan 每學期才調一次，但調的時候要很快）');
ok('⭐ 解析出 6 個時段', !!T && T.slots.length === 6);
ok('   全形冒號「：」與 en dash「–」都認得', (() => {
   /* ⚠ 不要用 T.slots[0]——時段是照「週日→週六」排序的，[0] 是週日那堂不是週一。
      用內容找，不要用位置找。 */
   const mon = W.timetableOfDay(T, 1).find(x => x.names.join() === 'Ann');
   return mon && mon.start === '18:00' && mon.end === '20:00'; })());
ok('   19:15 這種非整點也對', T.slots.find(s => s.start === '19:15').end === '21:15');
ok('   「沒有固定課程」那天不會生出空時段', !W.timetableOfDay(T, 5).length);
ok('   名單裡沒有的名字要講出來，不要靜靜吞掉', (() => {
   const r = W.timetableParse('星期一\nZoe：18:00–19:00', R);
   return r && r.unknown.join() === 'Zoe' && r.slots[0].students.length === 0; })());

console.log('\n【2】⭐⭐ 同一個時段寫兩個名字 ≠ 一起上（Alan 更正兩次的那件事）');
ok('⭐ together 只是**預設值**，不是寫死的事實',
   T.slots.find(s => s.names.length > 1).together === true);
ok('⭐⭐ 切成「分開上」之後，同伴要變成 0（Eric & Tayler 就是這種）', (() => {
   const tt = { slots: T.slots.map(s => s.names.length > 1 ? { ...s, together: false } : s) };
   const pair = tt.slots.find(s => s.names.length > 1);
   return W.timetableBuddies(tt, pair.students[0], pair.id).length === 0; })());
ok('⭐ 標著「一起上」才算同伴', (() => {
   const pair = T.slots.find(s => s.names.length > 1);
   return W.timetableBuddies(T, pair.students[0], pair.id).join() === pair.students[1]; })());
ok('   畫面上可以切（不是只有程式判斷）', /一起上（記一次、兩人共用內容）/.test(dash));
ok('   分開上的時段可以「拆成兩堂」（我不去猜他怎麼切時間）', /拆成兩堂/.test(dash));

console.log('\n【3】⭐ 一週兩堂（v496 假設一堂，錯了）');
ok('⭐ Ann 一週兩堂（週一＋週日）', W.timetableOfStudent(T, 'ann@x').length === 2);
ok('⭐ 下次上課要在**所有**時段裡挑最近的那一個', (() => {
   /* 2026-10-13 是週二。Ann 有週一與週日 → 最近的是週日 10/18。 */
   return W.timetableNextDate(T, 'ann@x', '2026-10-13') === '2026-10-18'; })());
ok('   當天就有課的話回當天', W.timetableNextDate(T, 'fay@x', '2026-10-14') === '2026-10-14');
ok('   課表裡沒有的學生不要壞掉', !!W.timetableNextDate(T, 'nobody@x', '2026-10-13'));
ok('⭐ 上課紀錄真的改用課表算下次日期（不是 v496 的單一時段）',
   /window\.timetableNextDate\(tt, who\)/.test(dash));

console.log('\n【4】一起上的那一堂：共用內容複製，掌握度與備註不複製');
ok('⭐⭐ 存檔時只把 did／hw／next 給同伴', (() => {
   const noC = dash.replace(/\/\*[\s\S]*?\*\//g, '');
   const i = noC.indexOf('for (const m of mates)');
   const seg = noC.slice(i, i + 320);
   return /did: base\.did/.test(seg) && /hw: base\.hw/.test(seg) && /next: base\.next/.test(seg)
       && /pct: null/.test(seg) && /note: ''/.test(seg); })());
ok('   畫面上要先講清楚會同步什麼、不同步什麼', /掌握度與備註不會/.test(dash));

console.log('\n【5】整週看得到 ＋ 今天有哪幾堂');
ok('⭐ 一週總時數算得出來（26.5 小時那種）', (() => {
   const h = W.timetableHours(T);
   return Math.abs(h - (2 + 2 + 3 + 2 + 2 + 2)) < 0.01; })());
ok('   某一天的課照時間排序', (() => {
   const d = W.timetableOfDay(T, 0);
   return d.length === 2 && d[0].start === '10:00' && d[1].start === '13:00'; })());
ok('⭐ 後台有「今天有幾堂」，點名字就跳到那個學生', /ll2-today/.test(dash) && /setWho\(e\)/.test(dash));
ok('   課表存在 class/timetable（整週一份，不是每人一份）',
   /collection\('class'\)\.doc\(TT_DOC\)/.test(data) && /TT_DOC = 'timetable'/.test(data));

console.log(fail ? `\n❌ t-timetable：${pass} 過 / ${fail} 失敗` : `\n✅ t-timetable：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
