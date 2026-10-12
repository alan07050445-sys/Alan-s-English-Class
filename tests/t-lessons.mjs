/* t-lessons — 📒 上課紀錄（v496）
 *
 * Alan：「我是一對一，給我自己看就好，三個年級都要，之後也要出家長可以看的，
 *        而且還要寫這次上課這位小朋友掌握度幾 percentage、有什麼功課、下次上課進度。」
 *
 * 守的是「這個畫面有沒有真的幫他省事」，不是欄位有沒有長出來：
 *   ① 日期要自動帶下一個固定時段
 *   ② **上一堂的「下次進度」要自動變成這一堂的「這次上了什麼」**（整個功能最省力的地方）
 *   ③ 給家長看的摘要**不可以**含老師私人備註
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

console.log('\n【1】日期 → 學校第幾週');
ok('⭐ 開學日 2026-08-31 ＝ 第 1 週', W.lessonWeekOf('2026-08-31') === 1);
ok('⭐ 2026-10-12 ＝ 第 7 週（跟網站、跟學校進度表都對得上）', W.lessonWeekOf('2026-10-12') === 7);
ok('   同一週的任一天算出來都一樣', [12, 13, 14, 15, 16, 17, 18]
   .every(d => W.lessonWeekOf('2026-10-' + d) === 7));
ok('   開學前回 0，不要算出負的', W.lessonWeekOf('2026-08-01') === 0);
ok('⭐ 用本地時間不是 UTC（toISOString 會害台灣早上變成前一天）', (() => {
   const d = new Date(2026, 9, 12, 1, 30);   // 10/12 凌晨 1:30
   return W.lessonISO(d) === '2026-10-12'; })());

console.log('\n【2】固定時段（Alan：學生通常都是每週固定時間上課）');
ok('⭐ 下一個週三（從 10/12 週一起算）＝ 10/14',
   W.lessonNextDate({ day: 3, time: '17:00' }, '2026-10-12') === '2026-10-14');
ok('   當天就是那一天的話回當天（不要跳到下一週）',
   W.lessonNextDate({ day: 1 }, '2026-10-12') === '2026-10-12');
ok('   沒設時段就回今天，不要壞掉', !!W.lessonNextDate(null, '2026-10-12'));

const DOC = { slot: { day: 3 }, log: {
  '2026-09-30': { kind: 'normal', pct: 70, did: 'Rare Treasure P1', hw: 'p12-15', next: 'Rare Treasure P2', note: '私密甲' },
  '2026-10-07': { kind: 'normal', pct: 90, did: 'Rare Treasure P2', hw: 'p16-19', next: 'Barbed Wire Baseball P1', note: '私密乙' },
  '2026-10-09': { kind: 'off' },
}};

console.log('\n【3】⭐ 課堂之間要自己接起來（最省力的地方）');
ok('⭐ 上一堂＝最近一堂、而且不能是請假那堂',
   W.lessonPrev(DOC, '2026-10-14').date === '2026-10-07');
ok('⭐ 上一堂的「下次進度」就是這一堂要帶進去的內容',
   W.lessonPrev(DOC, '2026-10-14').next === 'Barbed Wire Baseball P1');
ok('   第一堂（前面沒有課）要回 null，不要爆掉', W.lessonPrev(DOC, '2026-09-01') === null);
ok('⭐ 畫面真的有接上（新增一堂時把上一堂的 next 填進 did）',
   /did: \(prev && prev\.next\) \|\| ''/.test(dash));

console.log('\n【4】掌握度');
ok('⭐ 近 N 堂平均（請假那堂不算）', W.lessonAvgPct(DOC, 5) === 80);
ok('   一筆都沒有時回 null，不要回 0（0% 跟「沒資料」是兩回事）',
   W.lessonAvgPct({ log: {} }) === null && W.lessonAvgPct(null) === null);
ok('   請假那堂不存 pct', /kind === 'off' \? null : Number\(draft\.pct\)/.test(dash));

console.log('\n【5】⭐ 給家長看的摘要：不可以含老師私人備註');
const txt = W.lessonParentText({ ...DOC.log['2026-10-07'], date: '2026-10-07' }, '小明',
  { it: { reading: 'Rare Treasure', vocab: 'Part 2' } });
ok('⭐⭐ 摘要裡**沒有**私人備註', txt.indexOf('私密乙') < 0);
ok('   該有的都有：上了什麼／掌握度／功課／下次進度',
   /Rare Treasure P2/.test(txt) && /90%/.test(txt) && /p16-19/.test(txt) && /Barbed Wire Baseball P1/.test(txt));
ok('   學校進度也帶進去（家長看得懂這堂在學校的哪個位置）', /學校進度/.test(txt) && /Rare Treasure/.test(txt));
ok('   畫面上明講備註家長看不到', /家長看不到/.test(dash));

console.log('\n【6】四種課別（Alan 提到連假／請假／補課／加課）');
ok('⭐ 正常／補課／加課／請假停課 四種都有',
   W.LESSON_KINDS.map(k => k.id).join() === 'normal,makeup,extra,off');

console.log('\n【7】接上去了嗎');
ok('⭐ 後台有「上課紀錄」分頁', /id: 'lessons'/.test(dash) && /<LessonLog /.test(dash));
ok('⭐ 一個學生一份文件（lessons/{email}），不是一堂一份',
   /collection\('lessons'\)\.doc\(id\)/.test(data));
ok('⭐ 三個年級都吃得到學校進度（照學生的 grade 訂閱，不是寫死 g4）',
   /subscribePacing\(g, setPace\)/.test(dash) && /stu && stu\.grade/.test(dash));
ok('   沒匯進度表的年級要講出來，不要靜靜地空白', /這個年級還沒匯入學校進度表/.test(dash));
ok('   學校這週的內容可以一鍵帶進「這次上了什麼」', /帶進「這次上了什麼」/.test(dash));

console.log(fail ? `\n❌ t-lessons：${pass} 過 / ${fail} 失敗` : `\n✅ t-lessons：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
