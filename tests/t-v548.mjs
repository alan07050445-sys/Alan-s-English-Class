/* t-v548 — 聊天室剩下的四項：提醒／星星／名單／單一單元（＋為什麼「串多件事」沒做）
 *
 * Alan 說「接續做」——v547 我列的五項沒做完的。
 *
 * ⚠ 這四項的共通風險是**會動到別人的東西**（響在家長手機上、改星星、停用學生、刪單元），
 *   所以每一項都要：參數夾回受控值／名字不猜／動手前先確認／不可逆的要唯一符合。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const noC = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const appC = noC(app), dashC = noC(dash);
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const roster = [{ name: 'Nick', email: 'g4nick@t' }, { name: 'Eric', email: 'g5eric@t' }];
const V = (o) => W.askVerify({ student: 'Nick', ...o }, { roster });

console.log('\n【1】⭐ 路由參數夾回受控值（模型亂填，程式照做就會動到不該動的）');
ok('⭐ 星星金額：只收整數、上限 200（寫成 10000 當沒講）', V({ intent: 'stars', amount: 10000 }).intent === 'unknown'
   && V({ intent: 'stars', amount: 10 }).amount === 10 && V({ intent: 'stars', amount: -5 }).amount === -5);
ok('⭐⭐ 沒講金額就問，不自己湊一個（「加一些星星」）', (() => {
   const p = V({ intent: 'stars' }); return p.intent === 'unknown' && /幾顆/.test(p.ask); })());
ok('⭐ 小數四捨五入、字串數字也收得進來', V({ intent: 'stars', amount: '7.4' }).amount === 7);
ok('⭐ rop 只收三種，亂填當沒講', V({ intent: 'roster', rop: 'destroy' }).intent === 'unknown');
ok('⭐⭐ 新增學生一定要有名字**與**合法 email（不可以替他編一個帳號）', (() => {
   const noMail = V({ intent: 'roster', rop: 'add', student: 'Tom' });
   const bad = V({ intent: 'roster', rop: 'add', student: 'Tom', newEmail: 'not-an-email' });
   const good = V({ intent: 'roster', rop: 'add', student: 'Tom', newEmail: 'G4Tom@Gmail.com', gradeId: 'g4' });
   return noMail.intent === 'unknown' && bad.intent === 'unknown'
     && good.intent === 'roster' && good.newEmail === 'g4tom@gmail.com'; })());
ok('⭐ 新增學生時，名字當然還不在名單裡——不可以被「找不到」擋掉',
   V({ intent: 'roster', rop: 'add', student: 'Tom', newEmail: 'g4tom@gmail.com' }).intent === 'roster');
ok('⭐ 停用／恢復一定要是名單裡真的有的人', V({ intent: 'roster', rop: 'deactivate', student: 'Zed' }).intent === 'unknown');
ok('⭐ 單一單元沒說改名還是刪 → 問；改名沒給新名字 → 問', (() => {
   const a = V({ intent: 'unit', group: '測驗（2/4）', op: '' });
   const b = V({ intent: 'unit', group: '測驗（2/4）', op: 'rename', title: '' });
   const c = V({ intent: 'unit', group: '測驗（2/4）', op: 'rename', title: '期中複習 B' });
   return a.intent === 'unknown' && b.intent === 'unknown' && c.intent === 'unit'; })());
ok('⭐ 提示詞教了四個新工具，而且說明「你不送出任何東西」',
   ['remind    — get the parents', 'stars     — give or take', 'roster    — change the student list', 'unit      — rename or delete ONE'].every(x => data.indexOf(x) >= 0)
   && /You never send anything/.test(data));

console.log('\n【2】⭐⭐ 刪單一單元：要唯一符合才動手');
const flat = [
  { catId: 'vocab', item: { id: '1', title: '期中複習（1/4）' } }, { catId: 'vocab', item: { id: '2', title: '期中複習（2/4）' } },
  { catId: 'vocab', item: { id: '3', title: '期中複習 · 字義選擇（2/5）' } }, { catId: 'vocab', item: { id: '4', title: 'Unit 1' } },
  { catId: 'vocab', item: { id: '5', title: 'Unit 10' } }];
ok('⭐ 完整標題＝唯一一個', W.askMatchUnits(flat, '期中複習（2/4）').map(x => x.item.id).join() === '2');
ok('⭐⭐ 他只說「期中複習」會命中好幾個 → 回候選清單，由畫面叫他說清楚（刪錯一個救不回來）',
   W.askMatchUnits(flat, '期中複習').length === 3);
ok('⭐⭐ 「Unit 1」完全相同的優先，不會連 Unit 10 一起命中', W.askMatchUnits(flat, 'Unit 1').map(x => x.item.id).join() === '4');
ok('⭐ 全形／半形括號都認得（他打的 (2/4) 與標題裡的（2/4））', W.askMatchUnits(flat, '期中複習(2/4)').length === 1);
ok('   找不到回空陣列（畫面要講「這一週找不到」，不是安靜）', W.askMatchUnits(flat, '不存在').length === 0);

console.log('\n【3】🔔 提醒：只選人，送出是他按');
ok('⭐⭐ 聊天室**不呼叫任何發送函式**（lineRunReminders／manualRemind 都不碰）', (() => {
   const i = appC.indexOf("plan.intent === 'remind'");
   const blk = appC.slice(i, appC.indexOf("plan.intent === 'stars'", i));
   return i > 0 && !/lineRun|lineSend|manualRemind|linePush/.test(blk); })());
ok('⭐ 人選用的是「這週誰沒做完」同一個 askQueryAnswer——他剛看到的名單與選好的一定一樣',
   /askQueryAnswer\(\{ qtype: 'unfinished', gradeId: plan\.gradeId \|\| ''/.test(appC));
ok('⭐ 沒有人要提醒就說「沒有人需要提醒」，不是開一個空的畫面', /這週沒有人需要提醒/.test(app));
ok('⭐ 後台那一頁有讀字條、讀完清掉（不然下次自己開又被帶走）',
   /g = window\.__remindDraft; window\.__remindDraft = null;/.test(dashC) && /window\.__remindDraft = g\.remind/.test(dashC));
ok('⭐ 提醒頁用字條預先選好「個別孩子」與附話',
   /useDash\(draft0 \? 'students' : 'all'\)/.test(dashC) && /draft0\.emails/.test(dashC) && /draft0\.note/.test(dashC));
ok('⭐ 字條在 TeacherDashboard 與 HwRemind 之間有人寫也有人讀（v531／v543 的坑：只寫沒人讀）',
   (dashC.match(/__remindDraft/g) || []).length >= 3);

console.log('\n【4】⭐ 星星／名單／單元：動手前都先確認');
ok('⭐ 星星先 confirm，而且寫出「誰、加還是扣、幾顆、原因」',
   /\$\{f\.name\}：\$\{plan\.amount > 0 \? '加' : '扣'\} \$\{Math\.abs\(plan\.amount\)\} 顆星星/.test(appC) && /window\.confirm\(msg\)/.test(appC));
ok('⭐ 星星走既有的 addStarEntry（記錄會跟後台集點頁同一份，退費也算得出來）', /window\.addStarEntry\(f\.email/.test(appC));
ok('⭐ 星星對到名字很像的人要再提醒一次（Elroy/Elory）', /名單裡有長得很像的名字（\$\{f\.twins/.test(appC));
ok('⭐⭐ 停用要講明「不是刪除」，進度與星星都留著', /停用不是刪除：進度與星星都留著/.test(app));
ok('⭐ 新增學生已經在名單裡就說「已經在名單裡」，不重複建', /已經在名單裡了/.test(app));
ok('⭐ 新增走既有的 addRosterStudent，teacher 欄位寫他自己', /window\.addRosterStudent\(plan\.newEmail, plan\.student, g, me\)/.test(appC));
ok('⭐⭐ 刪單元：多個符合要列候選叫他說清楚，唯一符合才 confirm 然後刪', /符合的有 \$\{hits\.length\} 個/.test(app)
   && /刪掉「\$\{h\.item\.title\}」這一個單元嗎/.test(app) && /handleDeleteItem\(h\.item\.id\)/.test(appC));
ok('⭐⭐ 改單元名只動 title，不動 group（還留在原本那一組）', (() => {
   const i = appC.indexOf('const handleRenameUnit');
   const body = appC.slice(i, appC.indexOf('const handleMoveItem', i));
   return i > 0 && /it\.title = b;/.test(body) && !/it\.group/.test(body); })());

console.log('\n【5】聊天室的範例與清單');
ok('⭐ ASK_JOBS 四個新項目都註冊了', ['remind:', 'stars:', 'roster:', 'unit:'].every(k => data.indexOf('  ' + k) >= 0));

console.log(fail ? `\n❌ t-v548：${pass} 過 / ${fail} 失敗` : `\n✅ t-v548：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
