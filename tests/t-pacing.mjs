/* t-pacing — 🏫 學校進度表（v493）
 *
 * 用 **Alan 真的那份 G4 進度表**（SY26-27 Grade 4 Term 1-2.xlsx 轉成 TSV）當測資，
 * 不是我編的——兩條「沿用」規則是他親自講解的，編假資料驗不到真情況。
 *
 * 守的是「我有沒有照 Alan 講的方式讀這張表」：
 *   ① Unit／課文只寫在循環第一週 → 後面幾週要沿用
 *   ② 課堂上 Writing Activity 那週，文法作業沿用上一個真的文法主題
 *   ③ 考試只看 Formative（Alan 指定：Summative 不用看）
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const shell= fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const tsv  = fs.readFileSync(new URL('tests/fixtures-pacing-g4.tsv', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const P = W.pacingParse(tsv);
const wk = n => P.find(w => w.n === n);

console.log('\n【1】讀得進來');
ok('⭐ 解析出 20 週', !!P && P.length === 20);
ok('   標題列用「同一列有兩個 WK」找，不是寫死第幾列（學校在上面加一行也不會壞）', (() => {
   const shifted = '垃圾\n又一行垃圾\n' + tsv;
   const r = W.pacingParse(shifted);
   return r && r.length === 20; })());
ok('   讀不懂就回 null，不要吐半套出來', W.pacingParse('abc\ndef') === null);

console.log('\n【2】Week 7＝Alan 親自講解的那一週');
const w7 = wk(7);
ok('⭐ 外師：U1W5 · Barbed Wire Baseball · Part 1',
   w7.it.unit === 'U1W5' && w7.it.reading === 'Barbed Wire Baseball' && w7.it.vocab === 'Part 1');
ok('⭐ 外師 Word Study ＝ Prefixes mis-, en-, & em-', /Prefixes mis-, en-, & em-/.test(w7.it.wordStudy));
ok('   外師 Reading Skill ＝ Skill 1 Analyze Text Structure', /Analyze Text Structure/.test(w7.it.skill));
ok('   外師作業 ＝ LAW p20-23 ＋ Word Study WB p14-16', w7.it.law === 'p20-23' && w7.it.wsWb === 'p14-16');
ok('⭐⭐ 中師：課堂上 Writing Activity，但**作業的文法主題沿用上一週的 U2W2 複合句**',
   /Writing Activity/.test(w7.lt.grammar)
   && /U2W2 - Complex Sentences & Subordinating/.test(w7.lt.grammarHw)
   && w7.lt._carry === true);
ok('   中師作業 ＝ Grammar WB P14-17', w7.lt.gramWb === 'P14-17');

console.log('\n【3】規則①：Unit／課文只寫在循環第一週');
ok('⭐ 外師 W8／W9 沿用 W7 的課文（表上那兩格是空的）',
   wk(8).it.reading === 'Barbed Wire Baseball' && wk(9).it.reading === 'Barbed Wire Baseball'
   && wk(7).it._own_reading === true && wk(8).it._own_reading === false);
ok('   外師是 3 週一循環：Part 1 → Part 2 → 複習（複習週沒有 Part）',
   wk(7).it.vocab === 'Part 1' && wk(8).it.vocab === 'Part 2' && !wk(9).it.vocab);
ok('⭐ 中師 W7 的課文沿用 W1（一篇課文教八週）',
   wk(7).lt.reading === 'Feathers: Not Just for Flying' && wk(7).lt._own_reading === false);
ok('   中師是 4 週 Part 1、4 週 Part 2',
   wk(1).lt.vocab === 'Part 1' && wk(5).lt.vocab === 'Part 2' && wk(7).lt.vocab === 'Part 2');

console.log('\n【4】規則②：文法作業的沿用');
ok('⭐ 有真的文法主題那幾週不要亂沿用（W6 自己就有）',
   /U2W2 - Complex Sentences & Subordinating/.test(wk(6).lt.grammarHw) && wk(6).lt._carry === false);
ok('⭐ 課堂寫「-」那幾週也要沿用（W3 有 Grammar WB P6-9 卻沒寫主題）',
   wk(3).lt.gramWb === 'P6-9' && !!wk(3).lt.grammarHw && wk(3).lt._carry === true);

console.log('\n【5】考試只看 Formative（Alan：Summative 不用看）');
ok('⭐ Summative 全部被濾掉', P.every(w => !/summative/i.test(w.it.assess + w.lt.assess)));
ok('⭐ 外師 Formative 在 W3／W6／W9（3 週一次）',
   /Formative/.test(wk(3).it.assess) && /Formative/.test(wk(6).it.assess) && /Formative/.test(wk(9).it.assess));
ok('⭐ 中師 Formative 在 W4／W8（4 週一次）',
   /Formative/.test(wk(4).lt.assess) && /Formative/.test(wk(8).lt.assess));
ok('   W7 本身沒有 Formative（它那格是 Summative 3）', !wk(7).it.assess && !wk(7).lt.assess);

console.log('\n【6】下一次 Formative 還有幾週');
const nf = W.pacingNextFormative(P, 'g4-2026F-W07');
ok('⭐ 站在 W7：外師還有 2 週（W9）、中師還有 1 週（W8）',
   nf.it.in === 2 && nf.it.wk === 9 && nf.lt.in === 1 && nf.lt.wk === 8);
ok('   當週就要考的話回 0（站在 W9 看外師）',
   W.pacingNextFormative(P, 'g4-2026F-W09').it.in === 0);
ok('   週次 id 對得上（g4-2026F-W07 → 7）', W.pacingWeekNo('g4-2026F-W07') === 7);

console.log('\n【7】連假也要讀進來（那正是會打亂固定上課時段的日子）');
ok('⭐ W4 中秋＋教師節連假', /Moon Festival/.test(wk(4).note));
ok('   W10 期中考週', /Midterm/i.test(wk(10).note));

console.log('\n【8】有真的接上去');
ok('⭐ 一鍵出 Word Study 自動帶這週的主題',
   /defaultTopic=\{\(paceWeek && paceWeek\.it\.wordStudy\)/.test(app)
   && /defaultTopic/.test(ed));
ok('⭐⭐ 一鍵出文法要用 grammarHw（沿用過來的），不是課堂的 grammar', (() => {
   /* 上 Writing Activity 那週如果帶 grammar，就會去出「Writing Activity」的文法題＝錯的。 */
   const noC = app.replace(/\/\*[\s\S]*?\*\//g, '');
   return /paceWeek && paceWeek\.lt\.grammarHw/.test(noC) && !/paceWeek\.lt\.grammar\b(?!Hw)/.test(noC); })());
ok('   老師編輯列看得到「學校這週」', /className="sw-bar"/.test(shell));
ok('   沒匯入進度表的年級完全不顯示（不要留一條空的）', /\{pace && \(\s*<div className="sw-bar">/.test(shell));
ok('   匯入要先給老師看過才存（學校改版面才不會靜靜讀錯）',
   /請先確認下面這張表跟學校發的一樣/.test(ed));

console.log(fail ? `\n❌ t-pacing：${pass} 過 / ${fail} 失敗` : `\n✅ t-pacing：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
