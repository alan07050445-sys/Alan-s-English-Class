/* t-v513 — 📝 考前複習包（AI 清單第三順位）
 *
 * Alan：外師每 3 週、中師每 4 週一次 formative。
 * pacingNextFormative（v493）早就知道下一次在第幾週——缺的只是
 * 「那一次考試涵蓋哪幾週、那幾週教過哪些字」。接起來之後考前複習幾乎是免費的。
 *
 * ⭐ 這一版刻意**不新寫一套出題 AI**：撈完字直接交給 QuickSetModal
 *   （一鍵出單字 7 種題型，v466 的 avoid 會讓題目跟原本那幾週不一樣）。
 *   這裡只做 AI 做不好、程式做得準的那一段：算範圍、把字撈齊。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data  = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app   = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const ed    = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

// 外師每 3 週、中師每 4 週
const pace = Array.from({ length: 12 }, (_, i) => i + 1).map(n => ({
  n, it: { assess: n % 3 === 0 ? `Formative ${n / 3}` : '' },
  lt: { assess: n % 4 === 0 ? `Formative ${n / 4}` : '' },
}));

console.log('\n【1】下一次考試涵蓋哪幾週');
ok('⭐ 外師：第 7 週 → 下次第 9 週考，範圍 W7–W9', (() => {
   const r = W.examRange(pace, '2026-W07', 'it');
   return r && r.wk === 9 && r.from === 7 && r.to === 9 && r.in === 2; })());
ok('⭐ 中師：第 7 週 → 下次第 8 週考，範圍 W5–W8（四週一次）', (() => {
   const r = W.examRange(pace, '2026-W07', 'lt');
   return r && r.wk === 8 && r.from === 5 && r.to === 8; })());
ok('⭐ 範圍＝「上一次考完之後」到這一次（不是固定往回推 N 週）', (() => {
   const r = W.examRange(pace, '2026-W01', 'it');
   return r && r.from === 1 && r.to === 3; })());
ok('   就是這週考的時候 in = 0', (W.examRange(pace, '2026-W09', 'it') || {}).in === 0);
ok('   後面沒有考試了就回 null（不要硬湊一個）', W.examRange(pace, '2026-W13', 'it') === null);
ok('   沒有進度表不會炸', W.examRange(null, '2026-W07', 'it') === null);

console.log('\n【2】把那幾週教過的字撈齊（純程式，不花錢也不會編）');
const mkWeek = (label, words) => ({ label, items: { vocab: [
  { id: 'fc1', type: 'flashcard', title: label + ' Unit', cards: words.map(t => ({ term: t, zh: t + '的中文' })) },
] } });
const weeks = {
  '2026-W07': mkWeek('Week 7', ['apple', 'banana']),
  '2026-W08': mkWeek('Week 8', ['cherry', 'apple']),     // apple 跨週重複
  '2026-W09': mkWeek('Week 9', ['durian']),
  '2026-W10': mkWeek('Week 10', ['elder']),              // 超出範圍
};
const order = ['2026-W07', '2026-W08', '2026-W09', '2026-W10'];
const src = W.examSource(weeks, order, { from: 7, to: 9 }, [{ id: 'vocab', titleZh: '單字' }]);
ok('⭐ 只收範圍內的週次（W10 不算）', src.weeks.length === 3 && !src.weeks.some(w => w.n === 10));
ok('⭐ 字都撈到了', src.words.map(w => w.term).sort().join() === 'apple,banana,cherry,durian');
ok('⭐⭐ 跨週重複的字只收一次（apple 出現兩週）', src.dup === 1 && src.words.length === 4);
ok('   每一週各撈到幾個字也要講出來（哪一週沒建課看得出來）',
   src.weeks.find(w => w.n === 7).n_words === 2);
ok('   封存的週次不算', (() => {
   const w2 = { ...weeks, '2026-W08': { ...weeks['2026-W08'], archived: true } };
   return W.examSource(w2, order, { from: 7, to: 9 }, [{ id: 'vocab' }]).words.length === 3; })());
ok('   沒有範圍時回空的，不要炸', W.examSource(weeks, order, null, []).words.length === 0);

console.log('\n【3】交棒給既有的一鍵出單字');
ok('⭐ 貼上格式跟「在這一組再出一份」完全一樣（不另外發明一種）',
   W.examPasteText([{ term: 'apple', zh: '蘋果', example: 'I ate an apple.', def: 'a fruit' }])
   === 'apple - 蘋果 - I ate an apple. - a fruit');
ok('   欄位缺了也排得出來', W.examPasteText([{ term: 'kiwi' }]) === 'kiwi');
ok('⭐⭐ 不新寫一套出題 AI——直接開 QuickSetModal 並把字填好',
   /setRegenFor\(\{ name: title, catId: 'vocab',/.test(app) && /setQuickSetOpen\(true\);/.test(app));
ok('   理由有寫下來（題目交給驗過很多次的那一套）', /不新寫一套出題 AI/.test(ed));

console.log('\n【4】接到畫面上：點 formative 那一塊就打開');
ok('⭐ 編輯列上「🧪 外師 Formative N」變成可以按的', /onExamPrep\('it'\)/.test(shell) && /onExamPrep\('lt'\)/.test(shell));
ok('   沒接 onExamPrep 時維持原本的樣子（不要變成壞掉的按鈕）',
   /disabled=\{!onExamPrep\}/.test(shell));
ok('⭐ app.jsx 有接上去', /onExamPrep=\{\(pacing && window\.ExamPrepModal\)/.test(app));
ok('⭐ 老師可以把不想考的字取消掉', /setDrop\(d => \(\{ \.\.\.d, \[k\]: !d\[k\] \}\)\)/.test(ed));
ok('   字太少就不給出題（1 個字出不了題）', /disabled=\{keep\.length < 2\}/.test(ed));
ok('   那幾週還沒建課時要講原因，不要給一個空面板', /先把那幾週的課建起來/.test(ed));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
