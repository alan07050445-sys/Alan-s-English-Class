// t-v597 — 暑假題庫的存檔也要真的刪（跟 v595 學期那邊同一個 merge:true 問題）
//   邏輯本身（weeksWithDeletes）在 t-v595 測過；這裡釘「接線」：訂閱有記對照、存檔有帶刪除、還原備份刻意不帶。
import fs from 'fs';
const sum = fs.readFileSync(new URL('../data-summer.js', import.meta.url), 'utf8');
const code = sum.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const saveFn = code.slice(code.indexOf('async saveWeeks(weeks)'), code.indexOf('async forceSaveWeeks'));
const forceFn = code.slice(code.indexOf('async forceSaveWeeks'), code.indexOf('async saveWeekOrder'));
ok('⭐ 題庫訂閱收到雲端時記對照（key 是 sl），而且只在雲端真的有 weeks 時', /if \(d\.weeks && window\.noteCloudWeeks\) window\.noteCloudWeeks\('sl', d\.weeks\)/.test(code));
ok('⭐⭐ 存檔帶刪除，而且用同一個 key（sl）——對照與存檔 key 不一致就等於沒做', /weeksWithDeletes\('sl', weeks\)/.test(saveFn));
ok('⭐ 兩道舊防呆還在（雲端沒回來不准寫／0 題不准蓋）', /_lastLibCount === null/.test(saveFn) && /n === 0 && _lastLibCount > 0/.test(saveFn));
ok('⭐⭐ 還原備份維持只加不刪（不能因為備份比較舊就把備份之後新增的作業刪掉）', !/weeksWithDeletes/.test(forceFn) && /merge: true/.test(forceFn));
console.log(fail ? `\n❌ t-v597：${pass} 過 / ${fail} 失敗` : `\n✅ t-v597：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
