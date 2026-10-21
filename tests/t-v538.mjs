/* t-v538 — Alan 那疊康橋卷子上剩下的四種題型
 *
 * Alan 看完 v537 的清單（「現在可以出什麼題目」）之後說「四個都做」：
 *   📦 fixbox   找出錯的字，把改好的字填進一排格子（文法卷 C 大題）
 *   🔍 evidence 用文章裡的 N 個細節回答（企鵝卷 "Use two specific details…"）
 *   ✍️ essay    一整篇寫作（G5 寫作卷佔 45%）
 *   😊 checkin  開頭的「今天心情／這次的目標」
 *
 * 🔴 這一輪自己抓到的三個 bug，每一個都「畫面上看起來正常」：
 *   ① checkin 的分支被 `if (!n) return out` 攔在前面（它的題數本來就是 0）
 *      ＝那個分支活不到，從來沒跑過。
 *   ② examTotals 把 checkin 的配分算進合計：老師看到 60 分、學生的滿分是 55。
 *   ③ 重複引用只比「字串一不一樣」，兩句引同一處各自截到不同長度就都算對。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const css  = fs.readFileSync(new URL('styles-quiz-mode.css', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
/* _examCleanPart 是內部函式（讀照片之後的清洗這一關），跟 t-v537 同一招取出來 */
const clean = new Function('window', 'document', 'firebase', 'localStorage',
  data + '\nreturn _examCleanPart;')(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

/* ── 共用題材 ─────────────────────────────────────────────── */
const PENGUIN = 'Penguins have special bodies built for the cold. They have a thick layer of '
  + 'fat called blubber under their skin. This traps their body heat. They also have dense, '
  + 'waterproof feathers. Their feathers lock out the icy wind and keep them dry.';
const fixbox = { kind: 'fixbox', pts: 10, title: 'Part C',
  answers: ['Taipei', 'I', 'Monday', 'English', 'May'],
  passage: 'last monday i went to taipei. in may i will start english class.' };
const evid = { kind: 'evidence', pts: 6, need: 2, minWords: 5,
  question: 'Why can penguins live in the cold?', passage: PENGUIN };
const essay = { kind: 'essay', pts: 45, prompt: 'Write a narrative about a time you were brave.',
  vocab: ['curious', 'brave'], paras: 5, sentsPerPara: 4, rubricSet: 'writing', rubricMax: 7 };
const checkin = { kind: 'checkin', pts: 0, goals: ['Read every question carefully.', 'Stay calm.'] };

console.log('\n【1】📦 找出錯的字，填進格子');
ok('⭐⭐ 不管順序——孩子從頭讀下來，找到的順序不會跟老師寫答案的順序一樣', (() => {
   const a = W.examScorePart(fixbox, ['Monday', 'May', 'Taipei', 'English', 'I']);
   return a.got === 10 && a.right === 5; })());
ok('⭐⭐ 大小寫要比（這一題考的就是大小寫，忽略大小寫等於這題沒意義）', (() => {
   const a = W.examScorePart(fixbox, ['taipei', 'i', 'monday', 'english', 'may']);
   return a.right === 0 && a.detail.every(d => /大小寫/.test(d.why[0])); })());
ok('⭐ 大小寫錯跟「這個字根本不在答案裡」要分開講（孩子才知道差在哪）', (() => {
   const a = W.examScorePart(fixbox, ['taipei', 'Dog', '', 'English', 'May']);
   return /大小寫/.test(a.detail[0].why[0])
       && /不在答案裡/.test(a.detail[1].why[0])
       && /沒有寫/.test(a.detail[2].why[0]); })());
ok('⭐ 同一個字寫兩次不可以拿兩次分（答案只有一個 Monday）', (() => {
   const a = W.examScorePart(fixbox, ['Monday', 'Monday']);
   return a.right === 1; })());
ok('⭐⭐ 答案一定要真的出現在那段文章裡——老師說改成 Monday、文章裡卻沒有 monday，'
   + '學生永遠找不到', (() => {
   const bad = { ...fixbox, answers: ['Taipei', 'Friday'] };
   return W.examWarnings({ sections: [{ parts: [bad] }] }).some(x => /Friday/.test(x)); })());
ok('   讀照片的時候同一條規則也要擋（模型會順手給一個文章裡沒有的字）',
   /const low = passage\.toLowerCase\(\);[\s\S]{0,200}ok\.length < 2\) return null;/.test(data));
ok('   貼上的格式：第一行答案、空一行、文章——存回去再打開要一模一樣', (() => {
   const t = 'Taipei, I, Monday\n\nlast monday i went to taipei.';
   const p = { kind: 'fixbox', ...W.examParsePart('fixbox', t) };
   return p.answers.length === 3 && p.need === 3 && W.examPartText(p) === t; })());

console.log('\n【2】🔍 用文章裡的細節回答');
ok('⭐⭐ 要真的從文章裡抄出證據（連續三個字以上）', (() => {
   const a = W.examScorePart(evid, [
     'They have a thick layer of fat called blubber under their skin.',
     'They also have dense, waterproof feathers that keep them dry.']);
   return a.got === 6 && a.right === 2; })());
ok('⭐ 沒引用原文的要擋下來（自己憑印象寫的不算證據）', (() => {
   const a = W.examScorePart(evid, ['Penguins are very strong animals in the winter.', '']);
   return a.detail[0].ok === false && /沒有從文章裡找證據/.test(a.detail[0].why.join()); })());
ok('⭐⭐ 兩格引用同一處不算兩個細節——⚠ 不能只比「字串一不一樣」：'
   + '一句引到 blubber、一句只引到 of fat，兩段文字不同卻是同一件事', (() => {
   const a = W.examScorePart(evid, [
     'They have a thick layer of fat called blubber.',
     'They have a thick layer of fat under their skin.']);
   return a.right === 1 && /前面已經用過/.test(a.detail[1].why.join()); })());
ok('⭐⭐ **同一句的前半＋後半**也算重複——這一條是出整份考卷時模擬作答才抓到的：'
   + '「use the sun and the pull of the earth」＋「to find the same trees」'
   + '兩段在原文裡根本不重疊（所以包含關係擋不掉），卻是同一件事→改成比「來自第幾句」', (() => {
   const P = 'Every fall, monarch butterflies begin a long journey south. Scientists think the '
     + 'butterflies use the sun and the pull of the earth to find the same trees. On the way they '
     + 'must stop at flowers, because nectar is the only fuel they have.';
   const part = { kind: 'evidence', pts: 20, need: 2, minWords: 5, passage: P };
   const dup = W.examScorePart(part, ['They use the sun to find the same trees.',
                                      'They use the sun and the pull of the earth.']);
   const good = W.examScorePart(part, ['They use the sun and the pull of the earth to find the same trees.',
                                       'They must stop at flowers, because nectar is the only fuel.']);
   return dup.right === 1 && /前面已經用過/.test(dup.detail[1].why.join()) && good.right === 2; })());
ok('⚠ 這條規則要**寫在學生看得到的地方**，不可以當暗樁'
   + '（不然孩子只會覺得「我明明有寫為什麼不給分」）',
   /文章裡不同的句子/.test(qm) && /同一句話的前半和後半算同一個細節/.test(qm));
ok('   太短的要講「只有幾個字」（不是只說「不對」）', (() => {
   const r = W.examEvidenceOne('thick layer of fat', evid, new Set());
   return r.ok === false && /只有 4 個字/.test(r.why.join()); })());
ok('⭐ 對的時候也要回「引用到哪一段」——學生端要印出來，孩子才知道這一題在練什麼',
   /sent && d\.quote && <u className="ex-ev-q">引用到：/.test(qm));
ok('   沒給文章就不驗引用（老師只貼題目的時候不要全部標紅）', (() => {
   const r = W.examEvidenceOne('Penguins stay warm because of their fat.', { ...evid, passage: '' }, new Set());
   return r.ok === true; })());
ok('⭐ 貼上的格式：第一行是問題、空一行之後是文章（只存 passage 的話畫面上就沒題目了）', (() => {
   const t = 'Why can penguins live in the cold?\n\n' + PENGUIN;
   const p = { kind: 'evidence', ...W.examParsePart('evidence', t) };
   return p.question === 'Why can penguins live in the cold?' && p.passage === PENGUIN; })());
ok('   沒有文章要在出卷頁講出來',
   W.examWarnings({ sections: [{ parts: [{ ...evid, passage: '' }] }] }).some(x => /找細節/.test(x)));

console.log('\n【3】✍️ 長文寫作');
ok('⭐ 程式只數「數得出來的那幾項」——幾段、每段幾句、用到幾個單字', (() => {
   const t = ['A. B. C. D.', 'E. F. G. H.', 'I was curious. J. K. L.'].join('\n\n');
   const s = W.examEssayStats(t, essay);
   return s.paras === 3 && s.sents.join() === '4,4,4' && s.used.join() === 'curious'
       && s.needParas === 5 && s.needSents === 4; })());
ok('⭐ 句數不足的段落要數出來（rubric 的 Length 寫的是「5 段 AND 每段 4 句」）', (() => {
   const s = W.examEssayStats('A. B.\n\nC. D. E. F.', essay);
   return s.shortParas === 1; })());
ok('   單字認得變化型（brave / braver 都算用到了）', (() => {
   const s = W.examEssayStats('I was braver than before.', essay);
   return s.used.indexOf('brave') >= 0; })());
ok('⭐⭐ 不自動給分：寫得好不好是老師看的', W.EXAM_KINDS.essay.auto === false);
ok('⭐⭐ 孩子寫的字要存進去，老師才改得到——⚠ 它的作答是**一段字串**不是陣列，'
   + '少了這一段，老師端的批改清單裡什麼都沒有而且完全看不出來',
   /if \(pp\.part\.kind === 'essay'\) \{[\s\S]{0,400}qs: \[\{ q: pp\.part\.prompt/.test(qm));
ok('⭐ 老師改好的分數與評語跟申論用**同一塊**（兩邊各寫一份，改了只有一邊會動）', (() => {
   /* 守的是「只有一份」：examMarkBlock 定義一次，申論與長文各叫它一次。 */
   const def = (qm.match(/const examMarkBlock = \(pt, key, qs\) =>/g) || []).length;
   const use = (qm.match(/examMarkBlock\(pt, key,/g) || []).length;
   return def === 1 && use === 2; })());
ok('   Rubric 要開給它（康橋寫作卷就是那七項）',
   /pt\.kind === 'short' \|\| pt\.kind === 'essay'\) && \(/.test(ed)
   && W.EXAM_RUBRIC_SETS.writing.criteria.length === 7);
ok('   沒有寫作題目要在出卷頁講出來',
   W.examWarnings({ sections: [{ parts: [{ ...essay, prompt: '' }] }] }).some(x => /寫作題目/.test(x)));

console.log('\n【4】😊 開頭的心情與目標');
ok('⭐⭐ checkin 的分支要寫在 `if (!n)` **前面**——它的題數本來就是 0（不是題目），'
   + '被那一行攔下來就等於這個分支永遠跑不到', (() => {
   const i = data.indexOf("if (part.kind === 'checkin')");
   const j = data.indexOf('if (!n) return out;');
   return i > 0 && j > 0 && i < j; })());
ok('⭐ 收下孩子勾的東西（老師看得到），但不給分', (() => {
   const r = W.examScorePart(checkin, { mood: 2, goals: { 0: true } });
   return r.max === 0 && r.detail[0].ok === null && r.detail[0].got.mood === 2; })());
ok('⭐⭐ 老師填了配分也要歸 0——不然老師看到的合計是 60、學生的滿分是 55，兩邊都「看起來正常」', (() => {
   const paper = { sections: [{ parts: [{ ...checkin, pts: 5 }, fixbox, essay] }] };
   const T = W.examTotals(paper);
   const S = W.examScore(paper, {});
   return T.total === 55 && S.autoMax + S.manualMax === 55; })());
ok('⭐⭐ 「這一大題算幾分」只能有一份（examPtsOf），examTotals 與 examScorePart 都要用它',
   /function examPtsOf\(part\)/.test(data)
   && /const pts = examPtsOf\(pt\);/.test(data)
   && /const max = examPtsOf\(part\);/.test(data));
ok('   不計分的大題不要在學生畫面上寫「0 分」（孩子會以為被扣光了）',
   /noScore\) return <span className="ex-pts soft">不計分<\/span>/.test(qm));
ok('   老師忘記填配分的那種要維持 0 分，不可以也寫成「不計分」（那就看不出是漏填的了）',
   /EXAM_KINDS\[pt\.kind\] \|\| \{\}\)\.noScore\) return/.test(qm));
ok('⭐⭐ 題目與預設目標只寫一份（EXAM_CHECKIN）：開場區與 checkin 大題共用同一塊', (() => {
   const c = W.EXAM_CHECKIN;
   if (!c || c.goals.length !== 3 || c.faces.length !== 3) return false;
   /* 共用＝只有一個 ExamCheckin，開場區與大題各叫一次；
      舊的那一份寫死的英文清單不可以還留在畫面檔裡。 */
   const def = (qm.match(/function ExamCheckin\(/g) || []).length;
   return def === 1
     && /item\.examMood && !sent && <ExamCheckin value=\{mood\} onChange=\{setMood\}\/>/.test(qm)
     && /<ExamCheckin goals=\{pt\.goals\}/.test(qm)
     && !/'Read every question carefully\.', 'Take my time/.test(qm); })());
ok('⭐ 側欄的題數與交卷寫的 doneCount 要用同一條判斷——'
   + '一邊算一邊不算就變成 4/3 這種永遠做不完的進度', (() => {
   const defn = (qm.match(/function examCountsAsTask\(p\)/g) || []).length;
   return defn === 1
     && /\.filter\(p => examCountsAsTask\(p\)\)\.length, 0\);/.test(qm)
     && /doneCount: r\.parts\.filter\(p => examCountsAsTask\(p\.part\)\)\.length,/.test(qm); })());
ok('   不計分也不算「一題都沒有／沒有配分」', (() => {
   const w = W.examWarnings({ sections: [{ parts: [checkin] }] });
   return !w.some(x => /一題都沒有|沒有配分/.test(x)); })());

console.log('\n【5】接到四個入口上');
ok('⭐ 學生端四種都畫得出來', ['fixbox', 'evidence', 'essay', 'checkin']
   .every(k => new RegExp("pt\\.kind === '" + k + "'").test(qm)));
ok('⭐ 老師貼上的說明四種都有（沒有說明＝老師不知道要貼什麼格式）',
   ['fixbox:', 'evidence:', 'essay:', 'checkin:'].every(k => ed.indexOf('                ' + k) > 0));
ok('⭐ 讀照片的提示詞四種都教過（這一條 t-v537 也在守，兩邊都要過）',
   ['fixbox', 'evidence', 'essay', 'checkin'].every(k => new RegExp('"' + k + '"').test(W.EXAM_READ_SYS)));
ok('⭐ 讀進來之後程式收得進來（提示詞教了、清洗這一關丟掉＝畫面上還是少一大題，而且不報錯）',
   [fixbox, evid, essay, checkin].every(p => {
     const r = clean(p);
     return !!r && r.kind === p.kind; }));
ok('⭐ 模型給了文章裡沒有的答案就整題不收（它會「順手把句子改對」）',
   clean({ ...fixbox, answers: ['Friday', 'Dog'] }) === null);
ok('   長文沒有題目、找細節沒有文章，一樣不收',
   clean({ ...essay, prompt: '' }) === null && clean({ ...evid, passage: '' }) === null);
ok('   讀進來的長文要把康橋寫作七項帶著（滿分 7 不是 4）', (() => {
   const r = clean(essay);
   return r.rubricSet === 'writing' && r.rubricMax === 7; })());
ok('   讀進來的心情與目標配分一律歸 0（卷子上印了分數也不算）', (() => {
   const r = clean({ ...checkin, pts: 5 });
   return r.pts === 0 && r.goals.length === 2; })());
ok('⭐ 樣式一律走變數，不可以寫死白底（萬聖節那層把變數整組翻成深色＝白底白字）', (() => {
   const i = css.indexOf('v538 📦🔍✍️😊');
   const blk = css.slice(i);
   return i > 0 && !/background:\s*#fff\b/.test(blk) && /var\(--bg-card/.test(blk); })());
ok('   寫作統計達標只變框線顏色，不給「答對」的綠底（這一題不是程式給分的）',
   /\.ex-essay-stat span\.hit \{ border-color: var\(--ok/.test(css));

console.log(fail ? `\n❌ t-v538：${pass} 過 / ${fail} 失敗` : `\n✅ t-v538：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
