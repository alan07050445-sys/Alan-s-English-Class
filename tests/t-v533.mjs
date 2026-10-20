/* t-v533 — 🗓 整週複製 ／ 🧩 合併單字再出題 ／ 題數指定
 *
 * Alan：「把哪一週的內容複製到哪裡、合併哪些單字卡、合併之後再出題、我需要多少題目」
 * ⚠ 前兩件以前**整個網站都做不到**，不只是聊天室叫不動——所以這一版是新功能，
 *   不是單純的路由。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(
  W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });
const V = (o) => W.askVerify(o, {});

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const fn = (mark) => { const a = app.indexOf(mark);
  return a < 0 ? '' : app.slice(a, app.indexOf('\n  const ', a + 30)); };
/* ⚠⚠ runAskPlan 裡的分支一定要先切出 runAskPlan 本身——
   askGenerate 裡也有一模一樣的 `plan.intent === 'vocab'`，
   直接在整支 app.jsx 上 indexOf 會抓到**另一個函式**（這個 repo 第六次了）。 */
const PLAN = (() => { const a = app.indexOf('const runAskPlan = (plan) => {');
  return app.slice(a, app.indexOf('\n  const handleAddBuiltItems', a)); })();

console.log('\n【1】參數照樣夾回受控值');
ok('⭐ 題數最多 60（模型回 500，程式照做會把瀏覽器卡死）', V({ intent: 'vocab', nQ: 500 }).nQ === 60);
ok('⭐ 合併的組數最多 8、週次最多 12', (() => {
   const r = V({ intent: 'merge', groups: Array(20).fill('g'), weeks: Array(30).fill(3) });
   return r.groups.length === 8 && r.weeks.length === 12; })());
ok('   週次只收 1~40（打錯成 99 不會跑去第 99 週）',
   V({ intent: 'merge', weeks: [3, 99, -1] }).weeks.join() === '3');
ok('⭐ 沒說複製到哪一週 → 問他', V({ intent: 'copyweek' }).ask === '要複製到第幾週？');
ok('⭐ 沒說合併哪幾組 → 問他', /要合併哪幾組/.test(V({ intent: 'merge' }).ask));

console.log('\n【2】🗓 整週複製');
const CW = fn('const handleCopyWholeWeek =');
ok('⭐⭐ 目標週原本的東西要留著——是「加進去」不是「蓋掉」', (() => {
   /* 🔴 蓋掉的話，他一句話就能把一整週的課程洗掉。
      ⚠ 初始化只能在「那一類還不存在」時做（有 Array.isArray 守著），
        不可以無條件 `dst.items[catId] = []`。 */
   return /dst\.items\[catId\]\.push\(clone\)/.test(CW)
     && /if \(!Array\.isArray\(dst\.items\[catId\]\)\) dst\.items\[catId\] = \[\];/.test(CW)
     && !/^\s*dst\.items\[catId\] = \[\];/m.test(CW); })());
ok('⭐⭐ 一次做完一次存（不要照分類一個一個存）', (() => {
   /* 連存好幾次的話，中間任何一次失敗就變成「複製到一半」。 */
   return (CW.match(/saveWeeksSafe\(/g) || []).length === 1
     && (CW.match(/setWeeks\(/g) || []).length === 1; })());
ok('⭐ 組內互指的 id 要換成新的（requires／linkedFlashcardId）', (() => {
   /* 少做這一步，到了新的一週就會鎖著一個不存在的單元。 */
   return /map\[item\.id\] = id;/.test(CW)
     && /it\.requires = map\[it\.requires\]/.test(CW)
     && /it\.linkedFlashcardId = map\[it\.linkedFlashcardId\]/.test(CW); })());
ok('⭐ id 撞到要讓開（目標週可能已經有同名的單元）', /while \(taken\.has\(id\)\)/.test(CW));
ok('⭐⭐ 整週複製要他自己按確認', (() => {
   const R = PLAN.slice(PLAN.indexOf("plan.intent === 'copyweek'"), PLAN.indexOf("plan.intent === 'merge'"));
   return /window\.confirm\(/.test(R) && /目標週原本的東西會保留/.test(R); })());
ok('   來源沒講就是現在這一週', /const from = plan\.fromWeek \? askFindWeek\(plan\.fromWeek, true\) : weekId;/.test(app));
ok('⚠ 複製的來源可以是現在這一週，搬家的目標不行——askFindWeek 要分得開',
   /const askFindWeek = \(n, allowCurrent\)/.test(app) && /allowCurrent \|\| hit !== weekId/.test(app));

console.log('\n【3】🧩 合併單字再出題');
const MG = fn('const askMergeWords =');
ok('⭐⭐ 零件本來就有：reviewWordsOf 反推單字 ＋ qsBuildItems 出題', (() => {
   /* 以前缺的只是「把好幾組的字接起來、去掉重複」這一段。 */
   return /window\.reviewWordsOf/.test(MG) && /qsBuildItems/.test(data); })());
ok('⭐ 去重用小寫比對（Pursued 跟 pursued 是同一個字）',
   /String\(x\.term \|\| ''\)\.toLowerCase\(\)\.trim\(\)/.test(MG) && /seen\.has\(k\)/.test(MG));
ok('⭐⭐ 同一個字再出現時不要覆蓋先前的中文／例句／圖片', (() => {
   /* 覆蓋的話，他後來補的翻譯會被舊的蓋回去。 */
   return /if \(!k \|\| seen\.has\(k\)\) return;/.test(MG); })());
ok('⭐ 組名跟週次兩種講法都收', /if \(wkNos\.length\)/.test(MG) && /groups\.forEach\(gName/.test(MG));
ok('⭐ 合併完直接開「一鍵出單字」，單字表先填好', (() => {
   const R = PLAN.slice(PLAN.indexOf("plan.intent === 'merge'"), PLAN.indexOf("plan.intent === 'review'"));
   return /setRegenFor\(\{ catId: cat0/.test(R) && /setQuickSetOpen\(true\)/.test(R); })());
ok('⭐ 找不到單字不要安靜地什麼都不做', (() => {
   const R = PLAN.slice(PLAN.indexOf("plan.intent === 'merge'"), PLAN.indexOf("plan.intent === 'review'"));
   return /這幾組裡找不到單字/.test(R); })());

console.log('\n【4】題數');
ok('⭐⭐ 只會裁短，絕對不會去湊', (() => {
   /* 湊出來的字不是他要教的。 */
   const R = PLAN.slice(PLAN.indexOf("if (plan.intent === 'vocab')"), PLAN.indexOf("plan.intent === 'wordstudy'"));
   return /plan\.words\.slice\(0, plan\.nQ\)/.test(R) && !/\.concat\(|\.repeat\(/.test(R); })());
ok('⭐ 裁了要講出來（不然他以為字貼漏了）', /照你說的只用前 \$\{ws\.length\} 個字/.test(app));
ok('   合併那邊也一樣會講', /照你說的只取前 \$\{plan\.nQ\} 個/.test(app));

console.log('\n【5】兩件新工具都在表上');
ok('⭐ copyweek / merge 都進了 ASK_JOBS', !!W.ASK_JOBS.copyweek && !!W.ASK_JOBS.merge);
ok('⭐⭐ 提示詞的 intent 清單要跟 ASK_JOBS 對得上', (() => {
   const a = data.indexOf('"intent" MUST be exactly one of:');
   const listed = data.slice(a + 32, data.indexOf('\n- "', a))
     .replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
   const jobs = Object.keys(W.ASK_JOBS);
   return jobs.every(j => listed.indexOf(j) >= 0); })());

console.log(fail ? `\n❌ t-v533：${pass} 過 / ${fail} 失敗` : `\n✅ t-v533：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
