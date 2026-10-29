// v623 期中考總複習：只算 since 之後做的；since 會被存下來
import fs from 'fs';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {};
new Function('window', 'document', 'firebase', 'localStorage', 'fetch', data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem() {}, removeItem() {} }, fetch);
const weeks = { w1: { items: { c1: [{ id: 'a', title: 'A' }] } } };
const path = { steps: [{ id: 's1', name: 'Word Study 1', items: [{ w: 'w1', c: 'c1', i: 'a' }] }] };
const prog = (p, ts) => W.reviewProgress(p, weeks, (w, i, since) => ts >= since);
ok('沒設 since：預設起算日之前做的不算', prog(path, W.REVIEW_DEFAULT_SINCE - 1).done === 0);
ok('預設起算日之後做的算', prog(path, W.REVIEW_DEFAULT_SINCE + 1).done === 1);
const p2 = Object.assign({}, path, { since: 1800000000000 });
ok('since 會被保留', W.reviewClean(p2).since === 1800000000000);
ok('老師重設 since 後，之前做的不算', prog(p2, 1799999999999).done === 0 && prog(p2, 1800000000001).done === 1);
console.log(fail ? `\n❌ t-v623：${pass} 過 / ${fail} 失敗` : `\n✅ t-v623：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
