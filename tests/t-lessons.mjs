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
const qm    = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const rules = fs.readFileSync(new URL('firestore.rules', ROOT), 'utf8');
const css   = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
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
/* ⚠ 不要釘標籤的確切字（v499 我把「家長看不到」改成「只有我看得到」就打到自己）。
   要驗的是「那一欄有被標示成私密的」。 */
ok('   畫面上明講備註是私密的', /'🔒 我的備註（[^']*）'/.test(dash));

console.log('\n【5b】v499：複習狀況／預習／家長同步看得到');
ok('⭐ 複習三態：完成／部分／沒做（Alan：「有沒有完成複習之類的」）',
   W.REVIEW_STATES.map(r => r.id).join() === 'done,part,none');
ok('⭐ 有「先預習了什麼」可以填（Alan：「有時候會先預習」）', /先預習了什麼/.test(dash));
ok('   上次交代的功課會顯示出來，不用自己回想', /上次交代：/.test(dash));
ok('⭐⭐ 存檔時**同時寫一份給家長的**，而且那一份沒有 note', (() => {
   /* Firestore 的規則擋不了單一欄位 → 「哪些給家長看」必須在**寫入時**決定。 */
   const noC = data.replace(/\/\*[\s\S]*?\*\//g, '');
   return /const \{ note, \.\.\.pub \} = full;/.test(noC)
       && /collection\('lessonsPublic'\)\.doc\(id\)\.set\(\{ log: \{ \[dateISO\]: pub \}/.test(noC); })());
ok('⭐ 刪掉一堂時，家長那份也要一起刪（不然老師刪了家長還看得到）', (() => {
   const noC = data.replace(/\/\*[\s\S]*?\*\//g, '');
   const i = noC.indexOf('async function deleteLesson');
   const seg = noC.slice(i, i + 420);
   return /collection\('lessons'\)/.test(seg) && /collection\('lessonsPublic'\)/.test(seg); })());
ok('   v499 之前存的紀錄可以補寫過去（backfill）', /async function backfillLessonsPublic/.test(data));
ok('⭐ 學生端有「老師的上課紀錄」，讀的是 lessonsPublic 不是 lessons',
   /function TeacherLog\(/.test(qm) && /subscribeLessonsPublic/.test(qm) && !/subscribeLessons\(/.test(qm));
ok('   老師還沒記任何一堂時不要佔版面', /if \(!rows\.length\) return null;/.test(qm));
ok('⭐ firestore.rules 只讓本人與老師讀 lessonsPublic', (() => {
   const seg = rules.slice(rules.indexOf('match /lessonsPublic/'));
   return /allow read: if isTeacher\(\)/.test(seg)
       && /request\.auth\.token\.email\.lower\(\) == studentEmail/.test(seg)
       && /allow write: if isTeacher\(\)/.test(seg); })());
ok('⭐ 家長摘要也帶上複習與預習', (() => {
   const t = W.lessonParentText({ date: '2026-10-07', kind: 'normal', pct: 90,
     review: 'part', prev: '下週的 Word Study', did: 'x', hw: 'y', next: 'z', note: '私密' }, '小明', null);
   return /上次的複習/.test(t) && /部分/.test(t) && /先預習了/.test(t) && t.indexOf('私密') < 0; })());

console.log('\n【5c】年級：名單沒填就用學號 email 算（Alan：「年級都放在網站上面」）');
ok('⭐ 不回退的話進度表會對不到年級而整個不顯示，**而且不會報錯**',
   /window\.gradeFromEmail && window\.gradeFromEmail\(e\)/.test(dash)
   && /window\.gradeFromEmail\(stu\.email\)/.test(dash));

console.log('\n【6】四種課別（Alan 提到連假／請假／補課／加課）');
ok('⭐ 正常／補課／加課／請假停課 四種都有',
   W.LESSON_KINDS.map(k => k.id).join() === 'normal,makeup,extra,off');

console.log('\n【7】接上去了嗎');
ok('⭐ 後台有「上課紀錄」分頁', /id: 'lessons'/.test(dash) && /<LessonLog /.test(dash));
ok('⭐ 一個學生一份文件（lessons/{email}），不是一堂一份',
   /collection\('lessons'\)\.doc\(id\)/.test(data));
ok('⭐ 三個年級都吃得到學校進度（照學生的年級訂閱，不是寫死 g4）',
   /subscribePacing\([A-Za-z]+, setPace\)/.test(dash) && !/subscribePacing\('g\d'/.test(dash));
ok('   沒匯進度表的年級要講出來，不要靜靜地空白', /還沒匯入學校進度表/.test(dash));
ok('   學校這週的內容可以一鍵帶進「這次上了什麼」', /帶進「這次上了什麼」/.test(dash));

console.log('\n【8】v504 家長那張卡的質感（Alan：「不夠有質感」）');
ok('⭐ 日期拆成 10/14・週三，不是一行 2026-10-14', (() => {
   const d = W.lessonDateParts('2026-10-14');
   return d.md === '10/14' && d.wd === '週三' && d.y === '2026' && d.ok === true; })());
ok('   月份／日子不補 0（9/7 不要寫成 09/07）', W.lessonDateParts('2026-09-07').md === '9/7');
ok('   壞掉的字串原樣退回去，不要算出 NaN', (() => {
   const d = W.lessonDateParts('x');
   return d.ok === false && d.md === 'x' && !/NaN/.test(JSON.stringify(d)); })());
ok('⭐ 四個欄位排得成兩欄（寬卡片右半邊不要整片空著）', (() => {
   const seg = qm.slice(qm.indexOf('function TeacherLog('), qm.indexOf('function computeGrowthData'));
   return /tlog-fs/.test(seg) && /\.filter\(Boolean\)/.test(seg); })());
ok('⭐ 標題在上、內容在下——換行的第二行才對得齊第一行', (() => {
   const seg = css.slice(css.indexOf('.tlog-f {'), css.indexOf('.tlog-more'));
   return /\.tlog-f em \{[^}]*display:\s*block/.test(seg); })());
ok('   ⚠ 小字顏色要讀得動：欄位標題不可以用亮綠 #2FA56B 這種等級', (() => {
   const seg = css.slice(css.indexOf('.tlog-f.did'), css.indexOf('.tlog-more'));
   const bright = (seg.match(/em\s*\{\s*color:\s*(#[0-9A-Fa-f]{6})/g) || [])
     .map(m => m.slice(-6))
     .filter(h => {                                   // 相對亮度（WCAG），白底要夠暗
       const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
         .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
       const L = .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
       return 1.05 / (L + .05) < 4.5;
     });
   return bright.length === 0; })());
ok('   老師的私人備註依然沒有出現在這張卡上', (() => {
   /* ⚠ 兩個踩過的坑：①切到 computeGrowthData 會把後面好幾個元件一起切進來
        （v522 的 ExamPlayer 剛好也在裡面）②`/r\.note/` 是子字串，別人的
        `pr.note` 也會中→ 只切 TeacherLog 自己，且欄位名要前後都卡住。 */
   const a = qm.indexOf('function TeacherLog(');
   const body = qm.slice(a, qm.indexOf('\nfunction ', a + 10));
   return !/[^A-Za-z0-9_$]r\.note\b/.test(body); })());

console.log(fail ? `\n❌ t-lessons：${pass} 過 / ${fail} 失敗` : `\n✅ t-lessons：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
