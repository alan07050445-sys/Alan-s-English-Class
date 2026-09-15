/* t-find-unit — v446 「我做的單元不見了」
 * Alan：「我原本有製作 G3 living in the desert 的一鍵生成，但現在不見了」
 * 真相：單元一直都在第 1 週（2026F-W01 · 外師單字 · 5 個單元），
 * 但網站開起來會停在「今天這一週」，那一週是空的 → 看起來就像不見了。
 * 這支測「用名字找單元」與「空的一週要指路」。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const app   = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const css   = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const fnEnd = (src, a) => { const i = src.indexOf(a); const j = src.indexOf('\n}\n', i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j + 2); };
const findUnitsIn = new Function(fnEnd(shell, 'function findUnitsIn') + '\nreturn findUnitsIn;')();

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);

/* Alan 線上 G3（class/data）的真實形狀，照 Firestore 抓下來的樣子縮小版 */
const five = (g) => ['flashcard', 'def-match', 'fillblank', 'quiz', 'spelling']
  .map((t, i) => ({ id: 'qs1788159829523' + i, type: t, title: g, group: g }));
const WEEKS = {
  '2026F-W01': { label: 'Week 1', dateRange: 'Aug 31 – Sep 6',
    items: { vocab: five('Living in the desert - week1').concat(five('How Raven Brought Light To The World - Week1')), grammar: [], reading: [] } },
  '2026F-W02': { label: 'Week 2', dateRange: 'Sep 7 – Sep 13',
    items: { vocab: five('Unit 2 · Weather'), reading: [] } },
  '2026F-W03': { label: 'Week 3', dateRange: 'Sep 14 – Sep 20', items: { vocab: [], grammar: [], reading: [] } },
  '2026F-W04': { label: 'Week 4', dateRange: 'Sep 21 – Sep 27', items: { reading: [{ id: 'r1', type: 'guided-reading', title: 'Desert Animals', group: 'Desert Animals' }] } },
};
const ORDER = ['2026F-W01', '2026F-W02', '2026F-W03', '2026F-W04'];

console.log('\n【1】用名字找得回 Alan 的 desert 單元');
const hits = findUnitsIn(ORDER, WEEKS, 'desert');
eq('找到兩組（第 1 週的單字＋第 4 週的分段閱讀）', hits.length, 2);
eq('第一組就是他做的那一份', hits[0].name, 'Living in the desert - week1');
eq('⭐ 告訴他在第幾週', hits[0].label, 'Week 1');
eq('⭐ 也告訴他日期', hits[0].range, 'Aug 31 – Sep 6');
eq('⭐ 五個單元併成一列（不是洗版五行）', hits[0].n, 5);
eq('順便告訴他在哪一類（點了直接開）', hits[0].cat, 'vocab');
ok('大小寫不分', findUnitsIn(ORDER, WEEKS, 'DESERT').length === 2);
ok('中間比對也算（不用從頭打）', findUnitsIn(ORDER, WEEKS, 'raven')[0].name.indexOf('Raven') > 0);
eq('只打一個字不查（避免整份洗出來）', findUnitsIn(ORDER, WEEKS, 'd').length, 0);
eq('找不到就是空的', findUnitsIn(ORDER, WEEKS, 'zzzz').length, 0);
eq('空的一週不會冒出東西', findUnitsIn(['2026F-W03'], WEEKS, 'desert').length, 0);
ok('沒有 weeks 也不會壞', findUnitsIn(ORDER, null, 'desert').length === 0 && findUnitsIn(null, WEEKS, 'desert').length === 0);
ok('最多 12 列', findUnitsIn(ORDER, {
  w: { label: 'x', items: { vocab: Array.from({ length: 40 }, (_, i) => ({ id: 'i' + i, title: 'desert ' + i, group: 'desert ' + i })) } },
}, 'desert').length <= 12);

console.log('\n【2】空的一週要直接指路');
ok('Header 會算「這一週是不是空的」', /const curEmpty = /.test(shell) && /weekItems\(week\.id\)\.length === 0/.test(shell));
ok('⭐ 只有老師看得到（學生本來就看不到空的週次）', /canEdit && week && week\.id/.test(shell));
ok('找最近有內容的一週：先往回、再往前', /for \(const j of \[weekIdx - d, weekIdx \+ d\]\)/.test(shell));
ok('畫面上有指路條', /week-empty-bar/.test(shell) && /最近有內容的是/.test(shell));
ok('CSS 有樣式', /\.week-empty-bar/.test(css) && /\.find-unit-res/.test(css));

console.log('\n【3】點了要真的跳過去');
ok('app.jsx 有 goWeekId', /const goWeekId = \(id, cat\) =>/.test(app));
ok('跳過去會順便開那一類', /setOpenCat\(cat \|\| null\)/.test(app));
ok('不在清單裡的週次就不動（不會跳到 -1）', /const j = viewOrder\.indexOf\(id\);\s*\n\s*if \(j < 0\) return;/.test(app));
eq('三個 Header 呼叫點都有傳 weeks／onGoWeek', (app.match(/onGoWeek=\{goWeekId\}/g) || []).length, 3);
ok('三個 Header 呼叫點都有傳 weeks', (app.match(/onGoWeek=\{goWeekId\}/g) || []).length === (app.match(/weeks=\{weeks\}\n\s*onGoWeek=\{goWeekId\}/g) || []).length);
ok('Header 收得到這兩個 props', /weeks, onGoWeek,/.test(shell));
ok('搜尋框在編輯模式的上排', /find-unit-in/.test(shell) && /🔍 找單元/.test(shell));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
