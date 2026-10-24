// t-v589 — 萬聖節限時雙倍（v552）的兩個洞：跨年全部消失、重做讓星星變少
//
// 🔴 ① 年份：v552 用「現在的年份」比對——2027/01/01 一到，今年萬聖節賺到的雙倍全部同時消失（20 → 10）。
// 🔴 ② 時間：v552 看 prog.ts（最後一次存檔）——10/25 完成、11/05 重做，雙倍就掉了（20 → 10）。
// ⭐ 星星是「從做過什麼反算」的（v409）＝拿到的星星就是拿到了，任何情況都不可以讓它變少。
import fs from 'fs';
const R = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const data = R('data.js'), app = R('app.jsx'), qm = R('components-quiz-mode.jsx');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
/* 假的 Date：讓「現在」可以指定（跨年那天要能模擬） */
const RD = Date; let NOW = null;
function FD(...a) { if (!(this instanceof FD)) return new RD(NOW ?? RD.now()).toString(); return a.length ? new RD(...a) : new RD(NOW ?? RD.now()); }
FD.now = () => NOW ?? RD.now(); FD.prototype = RD.prototype; FD.UTC = RD.UTC; FD.parse = RD.parse;
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', 'Date', data)(W,
  { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} }, FD);
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const L = (y, m, d, h = 12) => new RD(y, m - 1, d, h).getTime();
const weeks = { w: { label: 'W', items: { vocab: [{ id: 'a', title: 'A', type: 'quiz' }] } } };
const total = (now, prog) => { NOW = now; return W.computeAutoStars(weeks, ['w'], { w_a: { score: 90, total: 100, itemType: 'quiz', ...prog } }, { cloudShape: true }).total; };

console.log('\n【1】跨年不可以讓雙倍消失');
const p = { done: L(2026, 10, 25), ts: L(2026, 10, 25) };
ok('⭐ 10/26、11/05、12/31 看都是 20', [total(L(2026, 10, 26), p), total(L(2026, 11, 5), p), total(L(2026, 12, 31), p)].every(x => x === 20));
ok('⭐⭐ 2027/01/01 看還是 20（本來是 10：用「現在的年份」比對）', total(L(2027, 1, 1), p) === 20);
ok('⭐ 2027 年的 10/25 完成**不會**自動雙倍——明年要不要雙倍是新的決定，不是自動延續', total(L(2027, 10, 26), { done: L(2027, 10, 25), ts: L(2027, 10, 25) }) === 10);
ok('⭐ 年份釘在活動本身（HW_DOUBLE.year），不是跟著今天走', /HW_DOUBLE = \{ year: 2026,/.test(data) && /getFullYear\(\) !== HW_DOUBLE\.year/.test(data));

console.log('\n【2】重做不可以讓星星變少（也不可以讓活動前做的變雙倍）');
ok('⭐⭐ 10/25 完成、11/05 重做（first 保留）→ 還是 20', total(L(2026, 11, 5), { done: L(2026, 11, 5), ts: L(2026, 11, 5), first: L(2026, 10, 25) }) === 20);
ok('⭐ 9/15 完成、10/25 重做（first 保留）→ 10（不會因為重做變雙倍）', total(L(2026, 10, 26), { done: L(2026, 10, 25), ts: L(2026, 10, 25), first: L(2026, 9, 15) }) === 10);
ok('⭐ 舊資料沒有 first：用 done（最接近的已知值），ts 被重做推到後面也不影響', total(L(2026, 11, 5), { done: L(2026, 10, 25), ts: L(2026, 11, 5) }) === 20);
ok('⚠ 本機那份的 done 是「做對幾題」的數字不是時間，不可以當時間用', total(L(2026, 10, 26), { done: 8, ts: L(2026, 10, 25) }) === 20 && total(L(2026, 10, 26), { done: 8 }) === 10);
ok('   優先序 first ＞ done ＞ ts，而且每個都要 > 1e11 才算時間', (() => {
   const e = W.earnedAtOf;
   return e({ first: 5e11, done: 6e11, ts: 7e11 }) === 5e11 && e({ done: 6e11, ts: 7e11 }) === 6e11
     && e({ done: 8, ts: 7e11 }) === 7e11 && e({ done: 8 }) === 0 && e(null) === 0; })());

console.log('\n【3】first 要一路保留（寫入、本機、合併）');
ok('⭐ 雲端存檔時保留第一次完成（只在「完成」時多讀一次）', /if \(data && data\.done\) \{[\s\S]{0,400}ref\.get\(\)[\s\S]{0,400}first = t\(old && old\.first\) \|\| t\(old && old\.done\)/.test(data));
ok('⭐ 讀失敗不影響存檔', /catch \(e\) \{ \/\* 讀不到就照舊存/.test(data));
ok('⭐ 本機存檔：重做、補分數都不把 first 往後推', /const firstAt = \(old && old\.first\) \|\| \(qualifies \? ts : 0\);/.test(qm));
ok('⭐⭐ 合併雲端進度：三方取**最早**的，絕不換成比較晚的', /Math\.min\(\.\.\.firstAts\)/.test(app) && /remote = \{[^}]*first: fp\.first \|\| 0/.test(app));
ok('⭐ 兩處套用雙倍的地方都改成看 earnedAtOf', (data.match(/hwDoubleAt\(earnedAtOf\(prog\)\)/g) || []).length === 2 && !/hwDoubleAt\(prog && \(prog\.ts \|\| prog\.done\)\)/.test(data));
console.log(fail ? `\n❌ t-v589：${pass} 過 / ${fail} 失敗` : `\n✅ t-v589：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
