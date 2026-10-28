// v618 期中考總複習地圖：資料整理、進度計算、接線
import fs from 'fs';
const rd = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const data = rd('data.js'), app = rd('app.jsx'), shell = rd('components-shell.jsx'), ed = rd('components-editor.jsx'), rules = rd('firestore.rules');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {};
new Function('window', 'document', 'firebase', 'localStorage', 'fetch', data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem() {}, removeItem() {} }, fetch);
console.log('\n【範本與整理】');
const t = W.reviewTemplate();
ok('範本＝Word Study 1~5 → Vocabulary → Reading 共 7 關', t.steps.map(s => s.name).join('|') === 'Word Study 1|Word Study 2|Word Study 3|Word Study 4|Word Study 5|Vocabulary|Reading');
ok('關卡種類自動判斷', t.steps[0].kind === 'word' && t.steps[5].kind === 'vocab' && t.steps[6].kind === 'reading');
const dirty = W.reviewClean({ title: '', steps: [{ name: 'x', items: [{ w: 'a', c: 'b', i: 'c' }, { w: 'a' }, null] }], info: { date: 'abc' } });
ok('壞資料會被清乾淨（缺欄位的題目丟掉、標題給預設）', dirty.title === '期中考總複習' && dirty.steps[0].items.length === 1 && dirty.published === false);
ok('不是物件回 null', W.reviewClean(null) === null && W.reviewClean('x') === null);
console.log('\n【進度】');
const weeks = { w1: { items: { word: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], reading: [{ id: 'r', title: 'R' }] } } };
const p = { title: 'T', published: true, steps: [
  { id: 's1', name: 'Word Study 1', items: [{ w: 'w1', c: 'word', i: 'a' }, { w: 'w1', c: 'word', i: 'b' }] },
  { id: 's2', name: 'Reading', items: [{ w: 'w1', c: 'reading', i: 'r' }, { w: 'w1', c: 'reading', i: 'gone' }] },
  { id: 's3', name: 'Vocabulary', items: [] } ] };
const done = { 'w1|a': 1, 'w1|b': 1 };
const r = W.reviewProgress(p, weeks, (w, i) => !!done[w + '|' + i]);
ok('做完的關卡算完成、有題目沒做完不算', r.steps[0].complete && !r.steps[1].complete);
ok('沒有題目的關卡不算完成（老師還沒放）', !r.steps[2].complete && r.steps[2].total === 0);
ok('找不到的題目標成 exists:false，而且不能算做完', r.steps[1].items[1].exists === false && r.steps[1].items[1].done === false);
ok('下一關＝第一個沒完成的', r.next === 1 && r.stepsDone === 1 && r.done === 2 && r.total === 4);
done['w1|r'] = 1; done['w1|gone'] = 1;
ok('被刪掉的題目就算標記做過也不算（避免假完成）', !W.reviewProgress(p, weeks, (w, i) => !!done[w + '|' + i]).steps[1].complete);
const all = JSON.parse(JSON.stringify(p)); all.steps[1].items.pop(); all.steps[2].items = [{ w: 'w1', c: 'word', i: 'a' }]; done['w1|a'] = 1;
ok('全部關卡都完成才算 complete', W.reviewProgress(all, weeks, (w, i) => !!done[w + '|' + i]).complete === true);
ok('空地圖不會算完成', W.reviewProgress({ steps: [] }, weeks, () => true).complete === false);
console.log('\n【倒數天數】');
ok('距離考試天數', W.reviewDaysLeft('2026-11-12', '2026-11-10T08:00:00') === 2 && W.reviewDaysLeft('2026-11-12', '2026-11-12T23:00:00') === 0 && W.reviewDaysLeft('2026-11-12', '2026-11-13T01:00:00') === -1);
ok('沒填或格式錯回 null', W.reviewDaysLeft('') === null && W.reviewDaysLeft('11/12') === null);
console.log('\n【接線】');
ok('學生端：公開才給學生、老師永遠看得到', /isTeacher \|\| \(rpProg && rpProg\.published\)/.test(app) && /!rp\.published && !isTeacher\) return null/.test(shell));
ok('老師才能開編輯器', /rpEdit && isTeacher && window\.ReviewPathEditor/.test(app));
ok('點題目會跳到那一週那一題（跟補做舊作業同一條路）', /setWeekIdx\(idx\)/.test(app.slice(app.indexOf('const openReviewItem'), app.indexOf('const openReviewItem') + 700)) && /itemId: it\.i/.test(app));
ok('存在 class/reviewpath_{年級}，規則是公開讀、老師寫', /REVIEW_KEY = 'reviewpath'/.test(data) && /match \/class\/\{docId\}/.test(rules));
ok('地圖不發星星（星星是真的錢）', !/addStars|mxLogAdd|computeTreat/.test(shell.slice(shell.indexOf('function ReviewPathMap'), shell.indexOf('Object.assign(window, { ReviewPathCard'))));
ok('編輯器有匯出', /Object\.assign\(window, \{ ReviewPathEditor \}\)/.test(ed));
console.log(fail ? `\n❌ t-v618：${pass} 過 / ${fail} 失敗` : `\n✅ t-v618：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
