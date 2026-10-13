/* t-pacing — 🏫 學校進度表（v493 建立，v494 改成照欄位名稱對 ＋ 讀得到粗體）
 *
 * ⚠ 測資刻意是**自己編的**，不是學校那三份真表：
 *   那是康橋的內部課程規劃，這個 repo 是公開的（v493 我誤把 G4 整份提交進來，v494 移除）。
 *   編的時候照著三個年級**真實的欄位長相**做，所以該驗的都驗得到。
 *   真表怎麼跑？用 scratchpad 的腳本在本機跑，不要進 repo。
 *
 * 守三件事：
 *   ① 三個年級欄位不一樣 → 要照**欄位名稱**對，不是照位置（v493 照 G4 寫死，G3/G6 會錯位）
 *   ② 兩條「沿用」規則（Alan 親自講解）
 *   ③ G6 的「只教粗體頁數」——貼上拿不到，一定要讀檔
 */
import fs from 'fs';
import { DOMParser } from './helpers-xml.mjs';
globalThis.DOMParser = DOMParser;

const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const shell= fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const tune = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

/* ── 三個年級真實的欄位長相（內容是編的，欄位名稱照抄真表）── */
const CAL = ['Month', 'M', 'T', 'W', 'Th', 'F', 'Sa', 'Su', 'Notes'];
const HEAD = {
  g4: CAL.concat(
    ['WK', 'Unit', 'Reading', 'Word Study', 'Vocabulary', 'Reading Skills', 'LAW (E1&E2)', 'Word Study WB (E1,E2+E3)', 'Assessments'],
    ['WK', 'Unit', 'Reading ', 'Vocabulary', 'Language and Conventions', 'Reading Skills', 'LAW (E1&E2)', 'Grammar WB (E1,E2+E3)', 'Assessments']),
  // G3：外師多一欄 High Frequency Words（Alan：不用管）；中師作業欄叫 Homework
  g3: CAL.concat(
    ['WK', 'Unit', 'Reading', 'Word Study', 'High Frequency Words', 'Vocabulary', 'Reading Skills', 'LAW (E1&E2)', 'Word Study WB (E1,E2+E3)', 'Assessments'],
    ['WK', 'Unit', 'Reading ', 'Vocabulary', 'Language and Conventions', 'Reading Skills', 'Homework', 'Grammar WB (E1,E2+E3)', 'Assessments']),
  // G6：外師是 Writing（沒有 LAW／Word Study WB）；中師叫 Grammar Skills
  g6: CAL.concat(
    ['WK', 'Unit', 'Reading', 'Word Study', 'Vocabulary', 'Reading Skills', 'Writing', 'Assessments'],
    ['WK', 'Unit', 'Reading ', 'Vocabulary', 'Grammar Skills', 'Reading Skills', 'Assessments']),
};
const blank = (n) => Array(n).fill('');
const tsvOf = (g, weeks) => [HEAD[g].join('\t')].concat(weeks.map(r => r.join('\t'))).join('\n');

console.log('\n【1】三個年級的欄位都不一樣，要照名稱對（v493 照位置寫死，G3/G6 會錯位）');
const rowG4 = (wk, u, rd, ws, vo, sk, law, wswb, as, lu, lrd, lvo, lg, lsk, llaw, lgwb, las) =>
  ['Oct', '', '', '', '', '', '', '', '', wk, u, rd, ws, vo, sk, law, wswb, as, wk, lu, lrd, lvo, lg, lsk, llaw, lgwb, las];
const g4 = W.pacingParse(tsvOf('g4', [
  rowG4('W1', 'U1W1', '課文甲', '字首 A', 'Part 1', 'Skill 1', 'p1-4', 'p1-2', '-', 'LU1', '長課文', 'Part 1', '文法甲', 'Skill 1', 'LAW1', 'P1-3', '-'),
  rowG4('W2', '', '', '字首 B', 'Part 2', 'Skill 2', 'p5-8', 'p3-4', 'Summative 1', '', '', '', 'Unit 1 Writing Activity', 'Skill 2', 'LAW2', 'P4-6', '-'),
  rowG4('W3', '', '', '課文甲複習', '', '', '', '', 'Formative 1', '', '', '', '-', '', 'LAW3', 'P7-9', 'Formative 1'),
]));
ok('⭐ G4 讀得出來', !!g4 && g4.length === 3);

const g3 = W.pacingParse(tsvOf('g3', [
  ['Oct', '', '', '', '', '', '', '', '', 'W1', 'U1W1', '課文乙', '雙母音', 'unit, figure', 'Part 1', 'Skill 1', 'p1-4', 'p1-2', '-',
   'W1', 'LU1', '長課文', 'Part 1', '文法乙', 'Skill 1', 'Skills 1', 'P1-3', '-'],
]));
ok('⭐ G3 的 High Frequency Words 要跳過，不可以被當成 Vocabulary',
   !!g3 && g3[0].it.vocab === 'Part 1' && g3[0].it.wordStudy === '雙母音');
ok('   G3 中師的作業欄叫 Homework，一樣要認得', g3[0].lt.law === 'Skills 1');

const g6 = W.pacingParse(tsvOf('g6', [
  ['Oct', '', '', '', '', '', '', '', '', 'W1', 'U1', '課文丙 (pp. 1-10)', '拉丁字首', 'Prince', 'Make Inferences', 'Writing 1', '-',
   'W1', 'LU1', '長課文丙', 'Part 1', 'NOUNS- 名詞 (GPW pp. 1, 3, 6)', 'Skill 1', 'Formative 3 (Vocabulary + Reading)'],
]));
ok('⭐ G6 外師的 Writing 欄要當成作業欄（它沒有 LAW）', !!g6 && g6[0].it.law === 'Writing 1');
ok('⭐ G6 中師的 Grammar Skills 要當成文法欄（它沒有 Language and Conventions）',
   /NOUNS/.test(g6[0].lt.grammar));
ok('   G6 的 Formative 寫成「Formative 3 (Vocabulary + Reading)」也要收',
   /Formative 3/.test(g6[0].lt.assess));
ok('   欄位名稱比對要忽略括號與空白（LAW (E1&E2) → law、"Reading " 尾巴有空格）',
   g4[0].it.law === 'p1-4' && g4[0].lt.reading === '長課文');

console.log('\n【2】兩條「沿用」規則（Alan 親自講解的，表上看不出來）');
ok('⭐ 規則①：Unit／課文只寫在循環第一週 → 後面沿用',
   g4[1].it.reading === '課文甲' && g4[2].it.reading === '課文甲'
   && g4[0].it._own_reading === true && g4[1].it._own_reading === false);
ok('⭐⭐ 規則②：課堂上 Writing Activity 那週，文法作業沿用上一個真的文法主題',
   /Writing Activity/.test(g4[1].lt.grammar) && g4[1].lt.grammarHw === '文法甲' && g4[1].lt._carry === true);
ok('   課堂寫「-」那週也一樣沿用（還是有 Grammar WB）',
   g4[2].lt.gramWb === 'P7-9' && g4[2].lt.grammarHw === '文法甲' && g4[2].lt._carry === true);
ok('   本來就有文法主題那週不要亂標沿用', g4[0].lt._carry === false);

console.log('\n【3】考試只看 Formative（Alan 指定：Summative 不用看）');
ok('⭐ Summative 全部濾掉', g4.every(w => !/summative/i.test(w.it.assess + w.lt.assess)));
ok('⭐ Formative 留著', /Formative 1/.test(g4[2].it.assess));
const nf = W.pacingNextFormative(g4, 'x-W1');
ok('⭐ 算得出「還有幾週」', nf.it.in === 2 && nf.it.wk === 3);
ok('   當週就要考回 0', W.pacingNextFormative(g4, 'x-W3').it.in === 0);

console.log('\n【4】⭐ G6：只教粗體的頁數（貼上拿不到，一定要讀檔）');
/* 直接組 rows 來驗——TSV 沒有粗體這種東西，這正是「要讀檔」的原因。 */
const cellOf = (t, bold) => ({ t, bold: bold || [] });
const rowsG6 = { 1: {}, 2: {} };
HEAD.g6.forEach((h, i) => {
  let c = '', n = i + 1;
  while (n > 0) { c = String.fromCharCode(65 + (n - 1) % 26) + c; n = Math.floor((n - 1) / 26); }
  rowsG6[1][c] = cellOf(h);
  rowsG6[2][c] = cellOf('');
});
rowsG6[2]['J'] = cellOf('W2'); rowsG6[2]['R'] = cellOf('W2');
/* 真表長這樣：類別名稱也是粗體，但那只是標題樣式，不是頁碼 */
rowsG6[2]['V'] = cellOf('NOUNS- Common, Proper, and Possessive Nouns pp. 25 (GPW pp. 1, 3, 4, 6, 139)',
                        ['NOUNS', '1', '6', '139']);
const gb = W.pacingFromRows(rowsG6);
ok('⭐ 只挑出粗體的頁碼：1, 6, 139（整格列了 25/1/3/4/6/139 六個數字）',
   !!gb && JSON.stringify(gb[0].lt.grammarBold) === JSON.stringify(['1', '6', '139']));
ok('⭐ 類別名稱（NOUNS）是粗體但不是頁碼，不可以被當成頁數',
   gb[0].lt.grammarBold.indexOf('NOUNS') < 0);
ok('⭐ 整格都沒有粗體 ＝「列出來的全部都教」→ 不要宣稱「只教某幾頁」', (() => {
   /* Alan 2026-10-12 確認：有粗體＝只教粗體那幾頁；沒粗體＝全部都教。
      所以沒粗體時要回空（整格文字本來就都看得到），不另外宣稱才是對的。
      ⚠ 真表 G6 的 W11/W13/W15 就是這種：只有類別名稱粗體、頁碼一個都沒粗。 */
   rowsG6[2]['V'] = cellOf('PHRASES- 介系詞片語 (GPW pp. 56, 57, 58)', ['PHRASES']);
   return !W.pacingFromRows(rowsG6)[0].lt.grammarBold; })());
ok('   粗體頁數不可以沿用到下一週（沿用的只有主題；在 Writing Activity 那格宣稱要教某幾頁是沒根據的）', (() => {
   const H = HEAD.g6, R = { 1: {}, 2: {}, 3: {} };
   H.forEach((h, i) => { let c = '', n = i + 1;
     while (n > 0) { c = String.fromCharCode(65 + (n - 1) % 26) + c; n = Math.floor((n - 1) / 26); }
     R[1][c] = cellOf(h); R[2][c] = cellOf(''); R[3][c] = cellOf(''); });
   R[2]['J'] = cellOf('W1'); R[2]['R'] = cellOf('W1');
   R[3]['J'] = cellOf('W2'); R[3]['R'] = cellOf('W2');
   R[2]['V'] = cellOf('NOUNS- 名詞 (GPW pp. 1, 3)', ['NOUNS', '1']);
   R[3]['V'] = cellOf('Unit 1 Writing Activity', []);
   const r = W.pacingFromRows(R);
   return r[1].lt.grammarHw === 'NOUNS- 名詞 (GPW pp. 1, 3)'   // 主題有沿用
       && !r[1].lt.grammarBold; })());                          // 粗體頁數沒有
ok('   頁碼範圍（61-64）也收得到', (() => {
   rowsG6[2]['V'] = cellOf('X (GPW pp. 61-64)', ['61-64']);
   return JSON.stringify(W.pacingFromRows(rowsG6)[0].lt.grammarBold) === JSON.stringify(['61-64']); })());

console.log('\n【5】讀 .xlsx（不靠外部函式庫）');
ok('⭐ 自己解 zip，不要載 SheetJS（400KB，而這件事一學期只做一次）', (() => {
   /* ⚠ 一定要先去掉註解——我在 data.js 的註解裡就寫了「刻意不用 SheetJS」，
      不去掉的話這條會打到自己的註解（這個坑這陣子踩第四次了）。 */
   const noC = data.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
   return /DecompressionStream\('deflate-raw'\)/.test(noC)
       && !/sheetjs|xlsx\.full|cdn[^\n]*xlsx/i.test(noC); })());
ok('   本地檔頭的名稱／extra 長度要重讀（跟中央目錄可能不同，算錯幾個 byte 就解壓失敗）',
   /lho \+ 26.*\n?.*lho \+ 28|const lnl = dv\.getUint16\(lho \+ 26/.test(data));
ok('   讀不懂要講清楚，不要吐半套', /不像是 Excel 檔/.test(data));

console.log('\n【5d】v501：Alan 問「哪邊可以匯入三個年級進度表？」');
/* 本來只在網站的編輯模式裡（切年級→進編輯→⋯更多→🏫，三個年級要切三次）。
   他人就站在上課紀錄那個畫面、而且畫面正在跟他說「還沒匯入」——按鈕就該在那裡。 */
ok('⭐ 後台的上課紀錄裡也能匯入', /window\.PacingImportModal/.test(dash) && /setPaceFor/.test(dash));
ok('⭐ 「還沒匯入」那行本身就是按鈕（他正在看著它）', /點這裡匯入/.test(dash));
ok('⭐ 三個年級的狀態一次列出來，哪個沒匯就點哪個',
   /function PacingStrip\(/.test(dash) && /<PacingStrip grades=/.test(dash));
ok('   只訂閱學生實際用到的年級，不要六個全訂', (() => {
   const noC = dash.replace(/\/\*[\s\S]*?\*\//g, '');
   return /gradesInUse/.test(noC) && /g\[1-6\]/.test(noC); })());
ok('   已匯入的也要能重匯（學校會改版）', /重新匯入/.test(dash));

console.log('\n【5e】🔴 v502：匯入視窗開在後台底下＋整頁白掉');
/* Alan：「匯入進去直接跑出這個 bug」——整片空白只剩左上角殘影。 */
ok('⭐ 匯入視窗要 createPortal 到 body（後台是 z-index:900 的 fixed 容器）', (() => {
   const i = ed.indexOf('function PacingImportModal(');
   const seg = ed.slice(i, ed.indexOf('\nfunction ', i + 10));
   return /ReactDOM\.createPortal\(/.test(seg) && /\), document\.body\);/.test(seg); })());
ok('⭐ 而且 z-index 要壓過後台的 900', (() => {
   const m = /\.modal-backdrop\.pace-top \{ z-index: (\d+)/.exec(tune);
   return !!m && Number(m[1]) > 900; })());
ok('⭐⭐ 壞掉時要顯示錯誤，不要整頁白掉', /class Boom extends React\.Component/.test(shell)
   && /getDerivedStateFromError/.test(shell));
ok('   錯誤訊息要印在畫面上（Alan 截圖就等於把 console 給我）', /\{msg\}<\/code>/.test(shell));
ok('   上課紀錄有包起來', /<window\.Boom where="上課紀錄">/.test(dash));

console.log('\n【5f】v503：Alan 看了實際畫面之後的兩個要求');
/* ①「U1W1 這個不用特別寫出來，因為根本沒人看，我只需要看重點」
   ②「請把什麼 book 寫清楚，像是 LAW、Word Study WB、Grammar WB」
      ——`p20-23 · p14-16` 根本看不出是哪一本。 */
ok('⭐ 編號前綴要拿掉（U1W5 - ／U2W2 - ／Skill 1 - ）', (() => {
   const C = W.pacingClean;
   return C('U1W5 - Prefixes mis-, en-, & em-') === 'Prefixes mis-, en-, & em-'
       && C('U2W2 - Complex Sentences & Subordinating Conjunctions') === 'Complex Sentences & Subordinating Conjunctions'
       && C('Skill 1 - Analyze Text Structure') === 'Analyze Text Structure'; })());
ok('   沒有前綴的不要被動到', W.pacingClean('Latin Prefix: mal-') === 'Latin Prefix: mal-');
ok('   只在顯示時拿掉，存的資料保持原樣（哪天要對回學校的表還找得到編號）', (() => {
   const r = W.pacingParse(tsvOf('g4', [
     rowG4('W1', 'U1W1', 'A', 'U1W5 - X', 'Part 1', 'Skill 1 - Y', 'p1-4', 'p1-2', '-',
           'LU1', 'B', 'Part 1', 'U2W2 - Z', 'S', 'L1', 'P1-3', '-')]));
   return r[0].it.wordStudy === 'U1W5 - X'; })());

ok('⭐⭐ 頁數一定要帶書名，而且書名**從 Excel 的欄位標題來**', (() => {
   /* 不可以寫死：G6 外師那欄叫 Writing、G3 中師那欄叫 Homework。 */
   const r = W.pacingParse(tsvOf('g3', [
     ['Oct','','','','','','','','', 'W1','U1','A','WS','hf','Part 1','SK','p20-23','p14-16','-',
      'W1','LU','B','Part 1','G','SK2','Skills 2','P14-17','-']]));
   const it = W.pacingBooks(r[0].it), lt = W.pacingBooks(r[0].lt);
   return it.map(x => x.book + ' ' + x.pages).join('|') === 'LAW p20-23|Word Study WB p14-16'
       && lt.map(x => x.book + ' ' + x.pages).join('|') === 'Homework Skills 2|Grammar WB P14-17'; })());
ok('   G6 外師那欄叫 Writing，也要照抄', (() => {
   const r = W.pacingParse(tsvOf('g6', [
     ['Oct','','','','','','','','', 'W1','U1','A','WS','V','SK','寫作 p9','-',
      'W1','LU','B','V2','G','SK2','-']]));
   return W.pacingBooks(r[0].it).map(x => x.book).join() === 'Writing'; })());
ok('   沒有頁數就不要生出空書名', W.pacingBooks({ law: '-', wsWb: '' }).length === 0);
ok('⭐ 兩個畫面（後台上課紀錄／老師編輯列）用同一套規則',
   /window\.pacingClean/.test(dash) && /window\.pacingBooks/.test(dash)
   && /window\.pacingClean/.test(shell) && /window\.pacingBooks/.test(shell));

console.log('\n【6】接上去了嗎');
ok('⭐ 一鍵出 Word Study 自動帶這週主題', /defaultTopic=\{\(paceWeek && paceWeek\.it\.wordStudy\)/.test(app));
ok('⭐⭐ 一鍵出文法要用 grammarHw（沿用過來的），不是課堂的 grammar', (() => {
   const noC = app.replace(/\/\*[\s\S]*?\*\//g, '');
   return /paceWeek && paceWeek\.lt\.grammarHw/.test(noC) && !/paceWeek\.lt\.grammar\b(?!Hw)/.test(noC); })());
ok('   編輯列看得到「學校這週」＋粗體頁數', /className="sw-bar"/.test(shell) && /className="sw-bold"/.test(shell));
ok('   沒匯入的年級完全不顯示', /\{pace && \(\s*<div className="sw-bar">/.test(shell));
ok('⭐ 匯入以「讀檔」為主（貼上只是後備，而且要講明拿不到粗體）',
   /選擇 \.xlsx 檔/.test(ed) && /貼上的內容<b>沒有粗體<\/b>/.test(ed));
ok('   存之前先把整張表列給老師看', /請先確認下面這張表跟學校發的一樣/.test(ed));

console.log(fail ? `\n❌ t-pacing：${pass} 過 / ${fail} 失敗` : `\n✅ t-pacing：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
