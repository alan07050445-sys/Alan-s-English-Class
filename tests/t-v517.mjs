/* t-v517 — 💬 用講的就好
 *
 * Alan：「我可以給他文字 或是截圖 不需要有任何匯入方式 我用對話的他就可以幫我生成
 *        單字 文法 word study reading comprehension…我都有所有模板了對吧？」
 *
 * ⭐ 他說得對，所以這一版**一行出題邏輯都沒有**。它只做兩件事：
 *   ① 聽懂要做哪一件事、把參數抓出來　② 打開現成的那個視窗並填好
 * 出題、校稿、存檔走的全是已經驗過上百次的舊路。
 *
 * 🔴 守的重點：
 *   · 它不會自己存（週次是整個年級共用一份文件，v447「我做的單元不見了」）
 *   · 聽不懂就問，不要亂猜一個最接近的去做
 *   · AI 講的每一件事都要對得上真實的東西（學生名字、單字長得像單字）
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data  = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed    = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const app   = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const roster = [{ name: 'Eric', email: 'e@s' }, { name: 'Nick Wang', email: 'n@s' }];

console.log('\n【1】它會做的事是一份固定清單');
ok('⭐ 七件事都在', ['vocab', 'wordstudy', 'grammar', 'reading', 'exam', 'lesson', 'weak']
   .every(k => W.ASK_JOBS[k] && W.ASK_JOBS[k].zh));
ok('⭐⭐ 清單以外的 intent 一律當 unknown（模型自己發明的不算數）',
   W.askVerify({ intent: '幫我做點什麼' }, { roster }).intent === 'unknown');
ok('   提示詞也把清單寫死', /"intent" MUST be exactly one of: vocab wordstudy grammar reading exam lesson weak unknown/.test(data));

console.log('\n【2】⭐⭐ 聽不懂就問，不要亂猜');
ok('⭐ 提示詞明講猜錯的代價', /Guessing wrong costs him ten minutes of proofreading before he notices, so ASK/.test(data));
ok('⭐ 說要出單字卻沒給字 → 問他', (() => {
   const r = W.askVerify({ intent: 'vocab', words: [] }, { roster });
   return r.intent === 'unknown' && /哪幾個單字/.test(r.ask); })());
ok('⭐ Word Study 沒給主題 → 問他', (() => {
   const r = W.askVerify({ intent: 'wordstudy', topic: '' }, { roster });
   return r.intent === 'unknown' && /主題/.test(r.ask); })());
ok('⭐ 閱讀沒給文章 → 問他', (() => {
   const r = W.askVerify({ intent: 'reading', text: '' }, { roster });
   return r.intent === 'unknown' && /貼給我/.test(r.ask); })());
ok('⭐ 不准發明老師沒給的單字', /Never invent words he did not give/.test(data));

console.log('\n【3】⭐⭐ AI 說的要對得上真實的東西');
ok('⭐⭐ 名單裡沒有的學生 → 問，不要安靜對到空氣', (() => {
   const r = W.askVerify({ intent: 'lesson', student: 'Jack' }, { roster });
   return r.intent === 'unknown' && /找不到「Jack」/.test(r.ask); })());
ok('⭐ 只打 first name 也認得', W.askVerify({ intent: 'lesson', student: 'Nick' }, { roster }).email === 'n@s');
ok('⭐⭐ 只收看起來真的是單字的（模型會把整句話塞進來）', (() => {
   const r = W.askVerify({ intent: 'vocab', words: [
     { term: 'pursued' }, { term: 'ice cream' }, { term: '他追趕' }, { term: 'I ran fast today' }] }, { roster });
   return r.words.map(w => w.term).join() === 'pursued,ice cream'; })());
ok('⚠ 理由有寫下來（第一版就把整句話收進去了）', /就把 "I ran fast today" 整句收進去了/.test(data));
ok('   文字有長度上限（貼一本書進來不要炸掉）', /\.slice\(0, 12000\)/.test(data));

console.log('\n【4】⭐⭐ 它不會自己存');
ok('⭐⭐ 一定要按「就這樣做」才會動', /就這樣做/.test(ed) && /onRun\(m\.plan\)/.test(ed));
ok('⭐ 畫面上寫明「它不會自己存」', /它不會自己存，打開之後你還能改/.test(ed));
ok('⭐ 理由有寫下來（週次是整個年級共用一份文件）',
   /週次的內容是整個年級共用一份文件/.test(data) || /週次是整個年級共用一份文件/.test(ed));
ok('⭐⭐ runAskPlan 只開視窗、不寫資料', (() => {
   const i = app.indexOf('const runAskPlan');
   const body = app.slice(i, app.indexOf('const handleAddBuiltItems', i));
   return i > 0 && !/saveWeeksSafe|setWeeks\(/.test(body); })());

console.log('\n【5】⭐ 不新寫任何出題邏輯——打開現成的視窗並填好');
ok('⭐ 單字 → QuickSetModal', /setRegenFor\(\{ name: plan\.title[\s\S]{0,200}setQuickSetOpen\(true\)/.test(app));
ok('⭐ Word Study → WordStudyModal（主題帶進去）',
   /setAskTopic\(plan\.topic\); setWsGenOpen\(true\)/.test(app) && /defaultTopic=\{askTopic \|\|/.test(app));
ok('⭐ 文法 → GrammarNotesModal（文字帶進去）',
   /setAskText\(\{ text: plan\.text, title: plan\.title[^}]*\}\); setGnGenOpen\(true\)/.test(app)
   && /defaultText=\{\(askText && askText\.text\)/.test(app));
ok('⭐ 閱讀 → ReadingGenModal（本來沒有貼文章的入口，這一版補上）',
   /function ReadingGenModal\(\{ open, categories, defaultCat, perStudent, roster, defaultTitle, defaultText/.test(ed)
   && /setText\(defaultText \|\| ''\);/.test(ed));
ok('⭐ 考卷 → ExamScanModal', /plan\.intent === 'exam'[\s\S]{0,80}setExamScanOpen\(true\)/.test(app));
ok('⭐ 上課紀錄／弱點分析住在後台，開後台並指路', /setDashOpen\(true\)/.test(app) && /__dashGoto/.test(app));
ok('   換一個視窗時要把帶進去的東西清掉（不然下次會沿用上一次的）',
   /setAskTopic\(''\)/.test(app) && /setAskText\(null\)/.test(app));

console.log('\n【6】接到畫面上');
ok('⭐ 編輯列有「💬 用講的就好」', /<b>用講的就好<\/b>/.test(shell) && /onAsk/.test(shell));
ok('⭐ app.jsx 掛上面板', /<window\.AskPanel/.test(app) && /onRun=\{runAskPlan\}/.test(app));
ok('⭐ 可以丟截圖（讀圖的機制 v428 就有了）', /type: 'image'/.test(data) && /ask-clip/.test(ed));
ok('   名單只在打開時才訂閱（平常不花錢）', /if \(!askOpen \|\| !window\.subscribeRoster\) return;/.test(app));
ok('   記得前幾句（「再多五個字」要知道在講什麼）', /history: msgs\.slice\(-4\)/.test(ed) && /const hist = \(history \|\| \[\]\)/.test(data));

console.log('\n【7】v518：聽得懂「要哪幾種題型」與「我的特別要求」');
ok('⭐⭐ 題型只收真的做得出來的那幾種（模型自己發明的 id 丟進去會安靜少一個單元）', (() => {
   const r = W.askVerify({ intent: 'vocab', words: [{ term: 'apple' }],
     kinds: ['quiz', 'fillblank', 'matching2', '亂講'] }, { roster });
   return r.kinds.join() === 'quiz,fillblank'; })());
ok('⭐⭐ 清單跟編輯器的 QS_KINDS 是同一份 id（兩份一定會走鐘）', (() => {
   const seg = ed.slice(ed.indexOf('const QS_KINDS = ['), ed.indexOf('];', ed.indexOf('const QS_KINDS = [')));
   const ids = [...seg.matchAll(/\{ id: '([a-z-]+)'/g)].map(m => m[1]);
   return ids.length >= 6 && ids.every(id => (W.ASK_VOCAB_KINDS || []).indexOf(id) >= 0)
     && (W.ASK_VOCAB_KINDS || []).every(id => ids.indexOf(id) >= 0); })());
ok('⭐⭐ 抓得到「特別要求」（這就是他說的「我要求一些 prompt」）',
   W.askVerify({ intent: 'vocab', words: [{ term: 'a' }], note: '例句要跟棒球有關' }, { roster }).note === '例句要跟棒球有關');
ok('   要求會真的送到出題的 AI 手上（teacherNote）',
   /teacherNote: note/.test(app) && /_aiTeacherNote\(teacherNote\)/.test(data));
ok('   題數有上限（說「出 999 題」不要真的去跑）',
   W.askVerify({ intent: 'reading', text: 'x'.repeat(50), nMcq: 999 }, { roster }).nMcq === 20);

console.log('\n【8】⭐⭐ v518：聊天室裡直接出題 → 看過再存');
ok('⭐⭐ 出完先給他看，不是直接存', /出題給我看/.test(ed) && /就這些，存進本週/.test(ed));
/* v519：五種都能在聊天室裡做完（剩下兩種住在後台，開後台指路） */
ok('⭐⭐ 單字／閱讀／Word Study／文法／考卷五種都在聊天室做得完',
   /\['vocab', 'reading', 'wordstudy', 'grammar', 'exam'\]\.indexOf\(m\.plan\.intent\) >= 0/.test(ed));
ok('⭐ Word Study 走 aiMakeWordStudy + wsBuildItems', /window\.aiMakeWordStudy\(/.test(app) && /window\.wsBuildItems\(/.test(app));
ok('⭐ 文法走 aiReadGrammarSheet → aiMakeGrammarPack → gnBuildItems',
   /window\.aiReadGrammarSheet\(/.test(app) && /window\.aiMakeGrammarPack\(/.test(app) && /window\.gnBuildItems\(/.test(app));
ok('⭐ 考卷走 aiReadExamSheet（本來就直接吐一份完整單元）', /window\.aiReadExamSheet\(/.test(app));
ok('⭐⭐ 照片要留給產生器用原圖，不是靠路由器轉述', /plan\.images = shots;/.test(ed));
ok('⭐ 只給照片不給文字也行（文法、考卷）',
   /need === 'text' && !out\.text && !nImages/.test(data) && /need === 'images' && !nImages/.test(data));
ok('⚠ 校稿提醒不可以跟著寫進課程資料', /map\(\(\{ _warn, \.\.\.it \}\) => it\)/.test(app));
/* 🔴 v520：聊天室出的東西不可以比按按鈕出的少。 */
ok('⭐⭐ 閱讀理解一樣要出「讀之前先知道」（視窗裡預設就是開的）',
   /window\.aiMakeReadingBackground\(\{ passage: plan\.text/.test(app)
   && !/background: null/.test(app));
ok('⚠ 背景知識失敗不可以拖垮題目', /aiMakeReadingBackground\([^)]*\)[\s\S]{0,40}\.catch\(\(\) => null\)/.test(app));
ok('⭐⭐ 兩段確認：先確認要做什麼，再確認題目對不對',
   /第一段確認「要做什麼」，第二段確認「題目對不對」/.test(ed));
ok('⭐ 覺得方向不對可以重出一份', /↻ 重出一份/.test(ed));
ok('⭐ 想自己調還是開得了視窗', /我自己開視窗調/.test(ed));
ok('⭐⭐ 出題呼叫的是視窗裡本來就在用的那幾支（不新寫出題邏輯）',
   /window\.aiMakeVocabExercises\(words, \{ hint: title, grade: g, teacherNote: note \}\)/.test(app)
   && /window\.qsBuildItems\(\{ words, title, kinds, ai, story, sense \}\)/.test(app)
   && /window\.aiMakeReadingSet\(\{/.test(app) && /window\.rcBuildItems\(\{/.test(app));
ok('⚠ 短文填空／字義選擇失敗不可以拖垮其他已經出好的（v473 的教訓）',
   /aiMakeVocabStory\([\s\S]{0,120}\.catch\(\(\) => null\)/.test(app)
   && /aiMakeVocabSense\([\s\S]{0,120}\.catch\(\(\) => null\)/.test(app));
ok('⭐ 出一半失敗要講出來，不要安靜關掉', /出題失敗：/.test(ed));
ok('   預覽看得到每個單元幾題、前兩題長什麼樣', /function AskPreview/.test(ed) && /getQuizItemTotal/.test(ed));
ok('⭐⭐ 存是最後一步——按了才寫進週次', /onSave\(g\.items, m\.plan\)/.test(ed) && /handleAddBuiltItems\(items, cat\)/.test(app));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
