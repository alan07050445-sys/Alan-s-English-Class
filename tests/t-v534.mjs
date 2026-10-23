/* t-v534 — 📌 設定期限 ／ 📢 發公告 ／ 單元名也找得到 ／ 文法合併 ／ 考卷帶要求
 * Alan 再加的五件事。17 個工具。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(
  W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });
const V = (o) => W.askVerify(o, {});
const PLAN = (() => { const a = app.indexOf('const runAskPlan = (plan) => {');
  return app.slice(a, app.indexOf('\n  const handleAddBuiltItems', a)); })();
const br = (from, to) => PLAN.slice(PLAN.indexOf(from), PLAN.indexOf(to));

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】17 個工具，兩邊對得上');
ok('⭐ assign / notify 都進了 ASK_JOBS', !!W.ASK_JOBS.assign && !!W.ASK_JOBS.notify);
ok('⭐⭐ 提示詞的清單要跟 ASK_JOBS 一致（漏一個＝做了但叫不動）', (() => {
   const a = data.indexOf('"intent" MUST be exactly one of:');
   const listed = data.slice(a + 32, data.indexOf('\n- "', a))
     .replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
   const jobs = Object.keys(W.ASK_JOBS);
   const miss = jobs.filter(j => listed.indexOf(j) < 0);
   if (miss.length) console.log('      少了：', miss);
   return !miss.length; })());

console.log('\n【2】📌 設定作業期限');
const AS = br("plan.intent === 'assign'", "plan.intent === 'notify'");
ok('⭐ 沒講日期就用跟「出完順手指派」同一套預設', /window\.askDueDefault/.test(AS));
ok('⭐ 他說「不要當作業」就取消指派，不是設一個日期',
   /plan\.due === 'none' \? ''/.test(AS) && /due \? \{ dueDate: due \} : null/.test(AS));
ok('⭐ 走既有的 handleSetHomeworkMany（不要另外寫一套存法）', /handleSetHomeworkMany\(found\.items\.map/.test(AS));
ok('   找不到那一組要列出有哪些', /這一週沒有「\$\{plan\.group\}」/.test(AS));

console.log('\n【3】📢 LINE 公告');
const NT = br("plan.intent === 'notify'", "plan.intent === 'review'");
ok('⭐⭐ 聊天室只把稿子打好，**送出那一下是老師自己按**', (() => {
   /* 這是會直接送到家長手機上的東西，不可以由聊天室替他送出去。 */
   return /__dashGoto = \{ tab: 'notify', notify:/.test(NT)
     && !/sendNotify|fetch\(/.test(NT) && /送出那一下還是他自己按/.test(NT); })());
ok('⭐ 稿子、對象、年級都帶過去', /text: plan\.text \|\| ''/.test(NT)
   && /target: plan\.target \|\| 'all'/.test(NT) && /grade: plan\.gradeId \|\| ''/.test(NT));
ok('⭐ LineNotify 真的會讀那張字條（不是只有寫）', (() => {
   /* 🔴 v531 剛修過一次「只有寫沒有人讀」——同樣的坑不要再踩。 */
   return /window\.__notifyDraft/.test(dash)
     && /const \[text, setText\]     = useDash\(draft \? \(draft\.text \|\| ''\) : ''\)/.test(dash); })());
ok('⭐ 讀完要清掉（不然他下次自己開，上一篇又跑出來）', /window\.__notifyDraft = null/.test(dash));
ok('⭐ 對象只收三種、年級只收 g1~g6', V({ intent: 'notify', text: 'x', target: 'boom' }).target === 'all'
   && V({ intent: 'notify', text: 'x', gradeId: 'g9' }).gradeId === '');
ok('⭐ 說要發給某年級卻沒講哪一個 → 問他',
   /要發給哪一個年級/.test(V({ intent: 'notify', text: 'x', target: 'grade' }).ask));
ok('⚠ 提示詞明講「不要加他沒說的話」', /no greetings he did not write/.test(data));

console.log('\n【4】他講的是「單元名」不是「組名」也要找得到');
ok('⭐⭐ 比對組名找不到時，再用單元名找一次', (() => {
   /* 他會說「Barbed Wire Baseball 的單字卡再加幾種題目」——那是單元名。 */
   /* v570：比對搬進 data.js 的 askBestGroup（組名找不到才用單元名，而且同樣打分數） */
   const d = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
   const j = d.indexOf('function askBestGroup');
   const blk = d.slice(j, d.indexOf('Object.assign(window, { askBestGroup', j));
   return /N\(it\.title \|\| ''\)/.test(blk) && /it\.group \|\| ''/.test(blk) && /window\.askBestGroup/.test(app); })());
ok('   找到單元就回傳它所屬的那一組（整組一起處理才合理）',
   /best = g && groups\[g\] \? \{ catId: cid, name: g, items: groups\[g\] \}/.test(fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8')));

console.log('\n【5】文法也能合併');
const MG = br("plan.intent === 'merge'", "plan.intent === 'review'");
ok('⭐⭐ 那幾組沒有單字時，改成合併它們的文法重點', (() => {
   /* 文法沒有「單字」可以合併，能合併的是**出題的依據**（srcNotes）。 */
   return /window\.reviewGrammarOf/.test(MG) && /setGnGenOpen\(true\)/.test(MG); })());
ok('   合併完要講出來合併了幾組', /合併了 \$\{notes\.length\} 組的文法重點/.test(MG));

console.log('\n【6】大考考卷帶上他的要求');
const EP = br("plan.intent === 'exampaper'", "plan.intent === 'tense'");
ok('⭐ 「題目需包含…」原話帶進去當這次的特別要求', /if \(plan\.note\) setAskText\(\{ text: '', title: '', note: plan\.note \}\)/.test(EP));
ok('   提示詞有教它把這種話放進 note', /anything he said the paper must contain goes in "note"/.test(data));

console.log(fail ? `\n❌ t-v534：${pass} 過 / ${fail} 失敗` : `\n✅ t-v534：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
