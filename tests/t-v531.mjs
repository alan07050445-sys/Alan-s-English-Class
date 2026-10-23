/* t-v531 — 💬 聊天室接完剩下的 6 件事（Alan：「我要他做到任何事情，就要可以做到」）
 *
 * ⭐ 這一支最重要的一條：**聊天室不自己生內容**，它只負責聽懂要做哪一件事、
 *   把參數掏出來，然後把對應的畫面開起來、欄位填好。
 *   生成的程式只有一份 → 用講的跟用按的會得到一模一樣的結果（v520 的教訓）。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(
  W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });
const V = (o) => W.askVerify(o, { roster: [{ name: 'Eric', email: 'e@t.com' }] });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】13 件事都在表上，而且表是唯一的真相');
ok('⭐ 新接的 6 個都在 ASK_JOBS 裡',
   ['guided', 'exampaper', 'tense', 'review', 'group', 'marking'].every(k => !!W.ASK_JOBS[k]));
ok('⭐⭐ 提示詞裡的 intent 清單要跟 ASK_JOBS 一模一樣', (() => {
   /* ⚠ 兩邊走鐘的話，模型會回一個程式不認得的 intent → 按下去什麼都不會發生。 */
   const m = /"intent" MUST be exactly one of: ([\s\S]*?)\n/.exec(data);
   if (!m) return false;
   const inPrompt = m[1].replace(/\s+/g, ' ').trim().split(' ')
     .concat((/^\s+(guided exampaper[^\n]*)/m.exec(data) || [])[1]?.split(' ') || [])
     .filter(x => x && x !== 'unknown');
   const have = Object.keys(W.ASK_JOBS);
   return have.every(k => data.includes(k)) && inPrompt.every(k => k === 'unknown' || have.includes(k)); })());
ok('⭐ 畫面上的「我會做這幾件事」是從 ASK_JOBS 撈的，不是另外手寫一份',
   /Object\.keys\(JOBS\)\.map\(k => \(/.test(ed) && /我現在會做這 \{Object\.keys\(JOBS\)\.length\} 件事/.test(ed));

console.log('\n【2】參數一樣要夾回受控的值');
ok('⭐ side 只收 it / lt', V({ intent: 'exampaper', side: 'xx' }).side === ''
   && V({ intent: 'exampaper', side: 'it' }).side === 'it');
ok('⭐⭐ op 只收四種——模型亂填一個 "destroy"，程式照做就會動到不該動的東西',
   V({ intent: 'group', group: 'A', op: 'destroy' }).op === ''
   && V({ intent: 'group', group: 'A', op: 'move' }).op === 'move');
ok('   toWeek 夾在 0~40（打錯成 900 不會跑去第 900 週）',
   V({ intent: 'review', group: 'A', toWeek: 900 }).toWeek === 40);

console.log('\n【3】沒講清楚就要問，不可以自己猜');
ok('⭐⭐ 整組操作沒說要做什麼 → 問他', (() => {
   const r = V({ intent: 'group', group: 'Barbed Wire' });
   return r.intent === 'unknown' && /沿用到別週／搬到別週／換類別／再出一份／刪掉/.test(r.ask); })());
ok('⭐ 考卷沒說外師還中師 → 問他', (() => {
   const r = V({ intent: 'exampaper' });
   return r.intent === 'unknown' && /外師還是中師/.test(r.ask); })());
ok('⭐ 沒說是哪一組 → 問他', (() => {
   const r = V({ intent: 'review' });
   return r.intent === 'unknown' && /哪一組/.test(r.ask); })());
ok('⭐⭐ 提示詞明講「delete 是唯一會把東西丟掉的，沒有明確要刪就用問的」',
   /"delete" is the only thing here that throws work away/.test(data));

console.log('\n【4】路由：開既有的畫面，不要另外寫一套生成邏輯');
const RUN = app.slice(app.indexOf('const runAskPlan = (plan) => {'), app.indexOf('const handleAddBuiltItems'));
ok('⭐ 分段閱讀 → 開單元編輯器，型別與文章先填好',
   /type: 'guided-reading'/.test(RUN) && /segments: \[\{/.test(RUN) && /setEditorOpen\(true\)/.test(RUN));
ok('⭐ 出一份新考卷 → setExamSide', /setExamSide\(plan\.side \|\| 'it'\)/.test(RUN));
ok('⭐ 五大時態 → setGrGenOpen', /plan\.intent === 'tense'[\s\S]{0,80}setGrGenOpen\(true\)/.test(RUN));
ok('⭐ 排複習 → 走既有的 setReviewFor（跟單元列的選單同一條路）',
   /setReviewFor\(\{ catId: found\.catId, name: found\.name, items: found\.items \}\)/.test(RUN));
ok('⭐ 再出一份 → 走既有的 setRegenFor／setQuickSetOpen', /setRegenFor\(\{[\s\S]{0,180}setQuickSetOpen\(true\)/.test(RUN));
ok('⭐ 沿用／搬過去 → 走既有的 handleCopyGroupToWeeks', /handleCopyGroupToWeeks\(found\.catId, found\.items, \[target\]/.test(RUN));
ok('⭐ 申論批改 → 開後台並指到 marking', /plan\.intent === 'marking'/.test(RUN) && /'marking' \? 'marking'/.test(RUN));

console.log('\n【5】找不到就要講出來，不可以安靜地什麼都不做');
ok('⭐⭐ 找不到那一組 → 把這一週有哪些組列給他看', (() => {
   /* v500 的教訓：「靜靜地少做一半比直接失敗更難發現」。 */
   return /這一週沒有「\$\{plan\.group\}」這一組。有的是：/.test(RUN)
     && /這一週還沒有任何分組/.test(RUN); })());
ok('⭐ 沒說搬去第幾週 → 問，不要自己挑一週', /要沿用到第幾週/.test(RUN));
ok('⭐ 組名比對要寬鬆（他不會一個字不差地打出來）', (() => {
   /* ⚠ 切到 runAskPlan 為止，不要用固定長度（這個 repo 已經踩過五次）
      v570：比對本身搬進 data.js 的 askBestGroup（打分數：完全一樣 ＞ 開頭 ＞ 包含），
      app.jsx 只留正規化（大小寫、破折號）。 */
   const i = app.indexOf('const askNorm =');
   const blk = app.slice(i, app.indexOf('const runAskPlan', i));
   const j = data.indexOf('function askBestGroup');
   const bg = data.slice(j, data.indexOf('Object.assign(window, { askBestGroup', j));
   return /toLowerCase\(\)/.test(blk) && /\[—–-\]/.test(blk) && /window\.askBestGroup/.test(blk)
     && /indexOf\(q\) >= 0/.test(bg) && /startsWith\(q\)/.test(bg) && /n === q/.test(bg); })());

console.log('\n【6】🔴 唯一會把東西丟掉的那件事');
ok('⭐⭐ 刪整組一定要他自己按下去確認', (() => {
   /* 聊天室打錯一個字就刪掉一整組，那是救不回來的。 */
   return /window\.confirm\(`要刪掉「\$\{found\.name\}」這一組的 \$\{found\.items\.length\} 個單元嗎？/.test(RUN)
     && /救不回來/.test(RUN); })());

console.log('\n【7】🔴 順手修好的舊 bug');
ok('⭐⭐ window.__dashGoto 從 v517 起只有寫、沒有人讀', (() => {
   /* 所以「幫 Eric 擬紀錄」只是開後台、停在總覽，他還要自己再點一次。 */
   return /window\.__dashGoto = \{ tab, email/.test(app)
     && /g = window\.__dashGoto; window\.__dashGoto = null;/.test(dash)
     && /if \(g && g\.tab\) setTab\(g\.tab\)/.test(dash); })());
ok('   讀完要清掉，不然下次自己開後台又會被帶走', /window\.__dashGoto = null;/.test(dash));

console.log(fail ? `\n❌ t-v531：${pass} 過 / ${fail} 失敗` : `\n✅ t-v531：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
