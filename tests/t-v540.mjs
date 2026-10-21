/* t-v540 — 📋 貼上整份考卷
 *
 * 出一份卷子有六大題，一題一題貼要設六次「題型／標題／配分」。
 * Alan 用的是我產生的卷子，所以貼的一定是機器寫的資料——重點不是好不好打，
 * 是**收不進來的東西一定要講出來**（安靜地少一大題，他要到學生交卷才會發現）。
 *
 * ⭐ 解析走的是跟拍照讀考卷**完全同一條**清洗路線（_examCleanPart）。
 *   另寫一份驗證＝哪天改了其中一邊，另一邊會安靜地放行壞資料。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const css  = fs.readFileSync(new URL('styles-quiz-mode.css', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

/* 一份縮小版的真卷子（六種題型各一，100 分） */
const PAPER = {
  title: 'Grade 4 Formative Assessment 1', examKicker: '康橋國際學校',
  sections: [
    { name: 'Section 1: Before You Begin', pct: 0, parts: [
      { kind: 'checkin', title: 'Part 1: Check In', pts: 0,
        goals: ['Read every question carefully.', 'Stay calm and do my best.'] }] },
    { name: 'Section 2: Word Study', pct: 20, parts: [
      { kind: 'circle', title: 'Part 2: Circle 10 -VCe words.', pts: 20, need: 10,
        /* ⚠ 這裡一定要用**完整的**那段文章：
             我第一版縮成一句（只有 3 個 VCe 字）卻還寫「圈 10 個」，
             測試就紅了——那不是程式錯，是我的 fixture 寫錯。 */
        check: 'vce', checkArg: '',
        passage: 'Last June a young whale swam too close to a small town. The tide went out and '
          + 'left the huge animal on the wet sand. A girl named Jane saw it when she rode past on '
          + 'her old blue bicycle. She ran all the way back to tell her dad, and he made a plan. '
          + 'All night the people of the town worked hard to keep the animal safe. They poured sea '
          + 'water on its skin so the hot sun would not burn it. When the morning sun rose, the '
          + 'deep water slowly washed back in. The great tail slapped the waves, and then the sea '
          + 'was quiet again.' }] },
    { name: 'Section 3: Vocabulary', pct: 20, parts: [
      { kind: 'cloze', title: 'Part 3: Fill in the blanks.', pts: 20,
        bank: ['journey', 'tide'], items: [{ text: 'A long ___ south.', answer: 'journey' },
                                           { text: 'The ___ went out.', answer: 'tide' }] }] },
    { name: 'Section 4: Grammar', pct: 15, parts: [
      { kind: 'fixbox', title: 'Part 4: Find the 5 mistakes.', pts: 15,
        answers: ['Friday', 'I', 'October', 'Amy', 'English'],
        passage: 'Last friday i went out. In october amy wrote it in english class.' }] },
    { name: 'Section 5: Reading', pct: 20, parts: [
      { kind: 'evidence', title: 'Part 5: Use two details.', pts: 20, need: 2, minWords: 8,
        question: 'How do monarchs finish the journey?',
        passage: 'Monarch butterflies begin a long journey south. They use the sun to find the trees. '
               + 'They stop at flowers, because nectar is the only fuel they have.' }] },
    { name: 'Section 6: Writing', pct: 25, parts: [
      { kind: 'essay', title: 'Part 6: Narrative Writing', pts: 25,
        prompt: 'Write about a time you helped someone.', vocab: ['journey', 'brave'],
        paras: 5, sentsPerPara: 4, rubricSet: 'writing', rubricMax: 7 }] },
  ]};
const J = JSON.stringify(PAPER);
const R = (t) => W.examPaperFromText(t);

console.log('\n【1】貼什麼進來都要有結果');
ok('⭐ 整份貼上：六大題、100 分、零警告', (() => {
   const r = R(J);
   return !r.error && r.n === 6 && W.examTotals(r.item).total === 100
       && !r.skipped.length && !r.warnings.length; })());
ok('⭐⭐ 連 ``` 圍欄一起貼（從對話框複製一定會帶著）', (() => {
   const r = R('```json\n' + J + '\n```');
   return !r.error && r.n === 6; })());
ok('⭐ 前後黏著說明文字也讀得出來', (() => {
   const r = R('這是這次的考卷：\n' + J + '\n以上，有問題再說。');
   return !r.error && r.n === 6; })());
ok('⭐⭐ 只貼 sections 那個**陣列**也要讀得出來——'
   + '⚠ 第一版直接「抓第一個 { 到最後一個 }」，陣列會被切成 `{…},{…}` ＝本來好的反而壞掉', (() => {
   const r = R(JSON.stringify(PAPER.sections));
   return !r.error && r.n === 6; })());
ok('   空的要說「沒有貼上任何東西」，不是丟一個看不懂的錯誤',
   /沒有貼上/.test(R('   ').error || ''));
ok('   不是 JSON 要講清楚是解析失敗', /JSON 解析失敗/.test(R('Part 1: Check In').error || ''));
ok('   有 JSON 但沒有 sections 要講出來', /沒有 sections/.test(R('{"title":"x"}').error || ''));

console.log('\n【2】⭐⭐ 收不進來的一定要講出來（安靜少一大題最可怕）');
ok('⭐⭐ 沒有這種題型 → 其他的照收，但要講出是哪一題、為什麼', (() => {
   const bad = { sections: [{ name: 'S', parts: [{ kind: 'bingo', pts: 10 },
     { kind: 'essay', pts: 40, title: 'W', prompt: 'Write.' }] }] };
   const r = R(JSON.stringify(bad));
   return !r.error && r.n === 1 && r.skipped.length === 1
       && /bingo/.test(r.skipped[0]) && /沒有.*這種題型/.test(r.skipped[0]); })());
ok('⭐ 題型對但內容不完整（長文沒題目）也要講出來', (() => {
   const r = R(JSON.stringify({ sections: [{ name: 'S', parts: [
     { kind: 'essay', pts: 40, title: '沒題目的作文' }, { kind: 'checkin', pts: 0, goals: ['a'] }] }] }));
   return r.skipped.some(x => /沒題目的作文/.test(x) && /內容不完整/.test(x)); })());
ok('⭐⭐ 改錯題的答案在文章裡找不到＝不收（學生照文章找永遠找不到）', (() => {
   const r = R(JSON.stringify({ sections: [{ name: 'S', parts: [
     { kind: 'fixbox', pts: 10, answers: ['Zebra', 'Yak'], passage: 'last friday i went out.' }] }] }));
   return !!r.error; })());
ok('⭐ 一大題都沒收到要直接說，並且帶上第一個原因',
   /一大題都沒收到/.test(R('{"sections":[{"name":"S","parts":[{"kind":"bingo"}]}]}').error || ''));
ok('⭐⭐ 配分不對要用**出卷頁本來那組檢查**講（不要另寫一份）', (() => {
   const half = { sections: PAPER.sections.slice(0, 2) };
   const r = R(JSON.stringify(half));
   return r.warnings.some(x => /不是 100 分/.test(x)); })());

console.log('\n【3】每一題的小欄位都要跟著過來');
ok('⭐ 圈幾個／幾個細節／幾個字／幾段幾句／哪一套 rubric', (() => {
   const r = R(J);
   const p = (i) => r.sections[i].parts[0];
   return p(1).need === 10 && p(4).need === 2 && p(4).minWords === 8
       && p(5).paras === 5 && p(5).sentsPerPara === 4
       && p(5).rubricSet === 'writing' && p(5).rubricMax === 7; })());
ok('⭐ 心情與目標的配分一律歸 0（卷子上印了分數也不算）', (() => {
   const r = R(JSON.stringify({ sections: [{ name: 'S', parts: [
     { kind: 'checkin', pts: 5, goals: ['a', 'b'] }] }] }));
   return r.sections[0].parts[0].pts === 0; })());
ok('⭐ Section 名稱沒寫要自己補（不然側欄會出現空白的區）', (() => {
   const r = R(JSON.stringify({ sections: [{ parts: [{ kind: 'checkin', pts: 0, goals: ['a'] }] }] }));
   return r.sections[0].name === 'Section 1'; })());
ok('   一大題都沒有的 Section 不要留著變空殼', (() => {
   const r = R(JSON.stringify({ sections: [{ name: '空的', parts: [] },
     { name: 'S', parts: [{ kind: 'checkin', pts: 0, goals: ['a'] }] }] }));
   return r.sections.length === 1 && r.sections[0].name === 'S'; })());

console.log('\n【4】⭐⭐ 跟拍照讀考卷走同一條路');
ok('⭐⭐ 用的是 _examCleanPart，不是自己另寫一份驗證', (() => {
   const i = data.indexOf('function examPaperFromText');
   const body = data.slice(i, data.indexOf('\nObject.assign(window, { aiReadExamSheet', i));
   return i > 0 && /_examCleanPart\(p\)/.test(body); })());
ok('⭐ 自我檢查也用 examWarnings（老師手打考卷用的同一組）', (() => {
   const i = data.indexOf('function examPaperFromText');
   return /warnings: examWarnings\(item\)/.test(data.slice(i, i + 3000)); })());
ok('   掛上 window 才叫得到', typeof W.examPaperFromText === 'function');

console.log('\n【5】接到畫面上');
ok('⭐ 出卷頁有「📋 貼上整份考卷」', /📋 貼上整份考卷/.test(ed) && /exed-paste-btn/.test(ed));
ok('⭐⭐ 蓋掉現有內容前要問——這是唯一會丟東西的一步',
   /if \(secs\.length && !confirm\(/.test(ed));
ok('⭐ 卷子本來是空的就不要多問一句（沒東西可以丟）',
   /\{secs\.length \? '換成這一份' : '就用這一份'\}/.test(ed));
ok('⭐ 已經有內容時要能「接在後面」（兩張卷子併一份）',
   /setSecs\(secs\.concat\(r\.sections\)\);/.test(ed));
ok('⭐⭐ 沒收進來的與配分警告都要畫在面板上，不可以只寫進 console',
   /r\.skipped\.length > 0 &&/.test(ed) && /r\.warnings\.length > 0 &&/.test(ed));
ok('   讀到幾個 Section／幾大題／幾分要先給他看，按下去之前就知道對不對',
   /讀到 \{r\.sections\.length\} 個 Section、\{r\.n\} 大題，合計 \{tot\.total\} 分/.test(ed));
ok('   標題空白時才自動帶（他打過的字不可以被蓋掉）',
   /if \(r\.title && !String\(form\.title \|\| ''\)\.trim\(\)\) update\('title', r\.title\);/.test(ed));
ok('   有樣式（沒有樣式的話貼上面板會散成一團）',
   /\.exed-paste \{/.test(css) && /\.exed-paste-go button/.test(css));

console.log(fail ? `\n❌ t-v540：${pass} 過 / ${fail} 失敗` : `\n✅ t-v540：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
