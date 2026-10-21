/* t-v543 — 聊天室說「今天 Nick 的上課內容是…」要真的幫他打好
 *
 * Alan 貼了一整段：
 *   「今天Nick我的上課內容是: 中師correlative conjunction & Subordinating conjunction
 *     外師則是 : 三篇biography unseen reading 包含 reading skill : 1. Use Text Evidence …」
 * 結果後台只是開到📒上課紀錄那一頁，**學生沒選、欄位全空**，他還要整段重打。
 *   「他卻不會幫我打好…我點進去還是要手動打 那我還要 AI 幹嘛？」
 *
 * 🔴 三個環節**同時**都是斷的，而且每一個都不報錯：
 *   ① router 只給 plan.student（名字），從來沒有產生過 plan.email，
 *      但 app.jsx 寫的是 `email: plan.email || ''` → 永遠是空字串。
 *   ② window.__dashEmail 寫了之後**沒有任何人讀**（跟 v531 的 __dashGoto 同一個坑）。
 *   ③ 他打的上課內容根本沒有被帶出來（提示詞沒說要放哪裡）。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
/* ⚠ 比對程式碼之前要先把註解拿掉（v473 的教訓）——
   不然「修好的那一行被寫進註解當說明」會讓斷言以為舊寫法還在。 */
const noC = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const appC = noC(app), dashC = noC(dash);
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const roster = [
  { name: 'Nick',  email: 'g4nick@le.ntpc' },
  { name: 'Elroy', email: 'g6elroy@le.ntpc' },   // G6，自己上
  { name: 'Elory', email: 'g4elory@le.ntpc' },   // G4，跟 Elvis 一起 —— 只差一個字母的位置
  { name: 'Joyce', email: 'g4joyce@le.ntpc' },
  { name: 'Joyce', email: 'g6joyce@le.ntpc' },   // 兩個同名
];

console.log('\n【1】⭐⭐ 名字 → 名單裡的那個孩子');
ok('⭐ 對得到（大小寫不計）', (() => {
   const a = W.askFindStudent('Nick', roster), b = W.askFindStudent('nick', roster);
   return a.email === 'g4nick@le.ntpc' && b.email === a.email; })());
ok('⭐⭐ Elroy / Elory **各自**對到自己（完全相同的名字優先，不可以互相搶）',
   W.askFindStudent('Elroy', roster).email === 'g6elroy@le.ntpc'
   && W.askFindStudent('Elory', roster).email === 'g4elory@le.ntpc');
ok('⭐⭐ 但還是要提醒「名單裡有長得很像的名字」——'
   + '打錯不會報錯，只會把整堂課記到別的孩子身上',
   W.askFindStudent('Elroy', roster).twins.length === 1);
ok('⭐⭐ 兩個同名就**不要猜**，回空的 email 並標 many', (() => {
   const r = W.askFindStudent('Joyce', roster);
   return r.email === '' && r.many === true; })());
ok('⭐ 名單裡沒有這個人也不要猜最像的那一個', (() => {
   const r = W.askFindStudent('Nicky', roster);
   return r.email === ''; })());
ok('   沒給名字回 null', W.askFindStudent('', roster) === null);
ok('   學號也認得（他有時候會直接貼 email 前面那段）',
   W.askFindStudent('g4nick', roster).email === 'g4nick@le.ntpc');

console.log('\n【2】⭐⭐ 提示詞要把「今天上了什麼」帶出來');
const SYS = data.slice(data.indexOf('The tools:'), data.indexOf('- "say":'));
ok('⭐⭐ lesson 明講「他說了教什麼就放進 text」——這才是他這則訊息的重點',
   /If he told you WHAT he taught, put it in "text"/.test(SYS));
ok('⭐ 保留他自己的寫法與結構（中師／外師分行、閱讀技巧照他的編號）',
   /中師 \/ 外師 on\s*\n\s*separate lines/.test(SYS) && /as he numbered them/.test(SYS));
ok('⭐ 只去掉開頭的客套話，不准摘要、不准翻譯、不准加他沒教的',
   /Drop only the/.test(SYS)
   && /Never summarise, never translate,\s*\n\s*never add a topic he did not teach/.test(SYS));

console.log('\n【3】⭐⭐ app.jsx：名字要真的變成 email，內容要真的帶過去');
ok('⭐⭐ 不可以再寫 `email: plan.email || \'\'`（router 從來沒產生過這個欄位）',
   !/email: plan\.email \|\| ''/.test(appC));
ok('⭐ 改成用 askFindStudent 去名單裡找', /window\.askFindStudent\(plan\.student, askRoster\)/.test(app));
ok('⭐⭐ 對不到要**說出來**，不是安靜地開一個空白畫面',
   /名單裡找不到/.test(app) && /名單裡有兩個/.test(app));
ok('⭐ 有長得像的名字要提醒', /很像的名字，確認一下是不是/.test(app));
ok('⭐⭐ 把他打的內容放進字條（這就是他要的「幫我打好」）',
   /window\.__lessonDraft = \(plan\.intent === 'lesson' && found && found\.email\)/.test(app)
   && /did: String\(plan\.text \|\| ''\)\.trim\(\)/.test(app));
ok('⚠ 功課與下次進度**不要**順便填——那兩欄有頁碼，要照學校進度表擬（v512 的把關）', (() => {
   const i = app.indexOf('window.__lessonDraft');
   const blk = app.slice(i - 600, i + 300);
   return !/hw:/.test(blk) && !/next:/.test(blk); })());

console.log('\n【4】⭐⭐ 後台那一頁要真的讀那張字條');
ok('⭐⭐ 不再寫一個沒人讀的 window.__dashEmail（v531 同一個坑）',
   !/window\.__dashEmail = g\.email/.test(dash));
ok('⭐ 上課紀錄自己讀 __lessonDraft，而且讀完清掉（不然下次自己開又被帶走）',
   /g = window\.__lessonDraft; window\.__lessonDraft = null;/.test(dash));
ok('⭐ 讀到就選那個學生', /fromAsk\.current = g;[\s\S]{0,120}setWho\(g\.email\);/.test(dash));
ok('⭐ 不在固定課表裡的孩子也要選得到', /setShowAll\(true\);\s*\/\/ ⚠ 不在固定課表裡的孩子也要選得到/.test(dash));
ok('⭐⭐ 等課表或紀錄回來再開那一堂——日期是從課表算的，'
   + '太早開會抓到預設時段（記到錯的日期比沒填還糟）',
   /if \(tt === null && doc === null\) return;/.test(dash));
ok('⭐ 開一堂新的，然後把內容填進 did', (() => {
   const i = dash.indexOf('fromAsk.current = null;');
   const blk = dash.slice(i, i + 400);
   /* ⚠ 要用函式版 setDraft：openNew() 已經設過一次，
      直接給物件會把它整個蓋掉（v487 的教訓：同一個 effect 設兩次後面贏）。 */
   return i > 0 && /openNew\(\);/.test(blk)
     && /setDraft\(x => \(x \? \{ \.\.\.x, did: g\.did \} : x\)\)/.test(blk); })());
ok('⭐ 畫面上要講一句「填好了、功課自己打或按 🪄」', /已經把你說的內容填進「這次上了什麼」/.test(dash));
ok('⭐ 貼進來的常常三四行——欄位要跟著長高，不可以把最後一行切掉',
   /rows=\{Math\.min\(10, Math\.max\(2, String\(draft\[k\]/.test(dashC)
   && /\.length \+ 1\)\)\}/.test(dashC));

console.log('\n【5】按下去之前就看得到會填什麼');
ok('⭐ 上課紀錄的預覽要把整段內容攤開，不是只寫「文字 87 字」',
   /m\.plan\.intent === 'lesson'[\s\S]{0,160}這次上了什麼：/.test(ed));
ok('   做完的訊息要說清楚接下來做什麼', /已經開好那一堂，內容也填進去了/.test(ed));

console.log(fail ? `\n❌ t-v543：${pass} 過 / ${fail} 失敗` : `\n✅ t-v543：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
