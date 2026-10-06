/* t-mistake-star — v465（Alan：「錯題那個也幫我做，我覺得要加上獎勵比較合理」）
 *
 * ⚠ 先更正一件事：錯題本不是「沒做」——v394 就把 header 的 📕 加回去了，整套都在跑。
 *   真正缺的是 Alan 指出來的：**沒有獎勵**，所以小朋友沒有理由去點它。
 *
 * 這一版：訂正一題 +1⭐、一天上限 10 顆；順便把面板的三個問題修掉
 * （一次 18 題太多／照週次分而不是照「你哪裡不會」分／看不到獎勵）。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const mk = fs.readFileSync(new URL('components-mistakes.jsx', ROOT), 'utf8');
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');

// 把算星的函式切出來真的跑
const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const F = new Function(
  'const checkinToday = () => "2026-10-06";\n'
  + pick('const FIX_STAR = 1;', '/* 訂正了一題 → 記一筆')
  + '\nreturn { computeFixedStars, FIX_STAR, FIX_DAILY_CAP };')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】算星星');
ok('一題 1 顆、一天上限 10 顆', F.FIX_STAR === 1 && F.FIX_DAILY_CAP === 10);
ok('沒訂正過＝0 顆', F.computeFixedStars(null).total === 0 && F.computeFixedStars({}).total === 0);
ok('訂正 3 題 → 3 顆', F.computeFixedStars({ days: { '2026-10-06': 3 } }).total === 3);
ok('⭐ 一天訂正 12 題只給 10 顆（上限）', F.computeFixedStars({ days: { '2026-10-06': 12 } }).total === 10);
ok('⭐ 上限是「每天」算的，不是總量（兩天各 12 題 → 20 顆）',
   F.computeFixedStars({ days: { '2026-10-05': 12, '2026-10-06': 12 } }).total === 20);
ok('今天還可以拿幾顆算得出來', F.computeFixedStars({ days: { '2026-10-06': 3 } }).todayLeft === 7);
ok('拿滿了就是 0', F.computeFixedStars({ days: { '2026-10-06': 15 } }).todayLeft === 0);
ok('集點紀錄寫的是「真的訂正幾題」（不是封頂後的顆數）',
   /訂正錯題 \$\{n\} 題/.test(data));
ok('⚠ 紀錄存真實題數、上限算星時才套（以後調上限不用重算歷史）',
   /紀錄存「真正訂正了幾題」，上限是算星星時才套用/.test(data));

console.log('\n【2】為什麼要另外存一份（v409 的教訓）');
ok('⭐ 有寫下原因：星星是從「做過什麼」反算，但訂正是把錯題刪掉',
   /而「訂正」做完的動作是\*\*把錯題刪掉\*\*——刪掉就沒有東西可以反算了/.test(data));
ok('存在 progress/{uid}.fixed.days（跟著人走，換年級不會消失）',
   /\[`fixed\.days\.\$\{checkinToday\(\)\}`\]: firebase\.firestore\.FieldValue\.increment\(1\)/.test(data));
ok('訂閱時把 fixed 一起帶出來', /callback\(d\.items \|\| \{\}, d\.checkin \|\| null, d\.fixed \|\| null\);/.test(data));
ok('⚠ 匯出掛在定義之後（const 寫進上面那張表會 TDZ——v451 踩過）',
   /一定要掛在這裡（定義之後）。FIX_STAR \/ FIX_DAILY_CAP 是 const/.test(data)
   && data.indexOf('Object.assign(window, { computeFixedStars') > data.indexOf('const FIX_STAR'));

console.log('\n【3】兩邊的星星數字要一致');
ok('header 右上角那顆 ⭐ 有加進來', /const f = window\.computeFixedStars \? window\.computeFixedStars\(myFixed\)/.test(app));
ok('集點面板也有加進來', /const f = window\.computeFixedStars \? window\.computeFixedStars\(fixed\)/.test(shell));
ok('集點紀錄清單也看得到這一筆', /entries: \[\.\.\.a\.entries, \.\.\.c\.entries, \.\.\.f\.entries\]/.test(shell));
ok('StarsPanel 收得到 fixed', /function StarsPanel\(\{[^}]*fixed,/.test(shell));

console.log('\n【4】答對才給，而且只給一次');
ok('⭐ 記星星跟「把錯題清掉」在同一個 if (correct) 分支裡',
   /window\.removeWrongQuestion\(user\.uid, current\.itemId, current\.q, current\.answer\);\s*\n\s*\/\/ v465[\s\S]{0,120}markMistakeFixed/.test(mk));
ok('「我已複習」那一種也記', /window\.removeWrongQuestion\(user\.uid, q\.itemId, q\.q, q\.answer\);\s*\n\s*if \(window\.markMistakeFixed\)/.test(mk));
ok('⚠ 有寫下「為什麼不怕刷星星」（故意答錯會先掉 10~15 顆完成星）',
   /故意答錯會讓那一份的分數掉到 80 以下/.test(data));

console.log('\n【5】面板本身：一次 5 題、照答案歸戶、看得到獎勵');
ok('⭐ 一次只練 5 題', /const MK_BATCH = 5;/.test(mk) && /allWrong\.slice\(0, MK_BATCH\)/.test(mk));
ok('⭐ 照「答案」歸戶（不是照週次）', /const byAnswer = useMKM/.test(mk));
ok('⭐ 錯最多次的排前面（那才是他真的不會的）',
   /sort\(\(x, y\) => y\.items\.length - x\.items\.length\)/.test(mk));
ok('⚠ 用 gnNorm 正規化，pursued / Pursued 不會變兩張', /window\.gnNorm \? window\.gnNorm/.test(mk));
ok('寫出「錯過幾次」', /錯過 \{g\.items\.length\} 次/.test(mk));
ok('標題寫出獎勵與今天還能拿幾顆', /訂正一題 <b>\+\{perStar\}⭐<\/b>/.test(mk) && /今天還可以拿 \$\{f\.todayLeft\} 顆/.test(mk));
ok('按鈕寫「先練 5 題 · 最多 +5⭐」', /先練 \{Math\.min\(MK_BATCH, allWrong\.length\)\} 題/.test(mk));
ok('拿滿了要講清楚，不要騙他還有', /今天的已經拿滿了，明天再來/.test(mk));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
