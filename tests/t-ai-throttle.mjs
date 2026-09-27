/* t-ai-throttle — v458 代理會間歇性回 403（Alan：「有時候晚上不能用」）
 * 2026-09-28 01:20~01:40 實測：單發大多 200，但 30 發有 10 發被 403 擋掉（0.17 秒就回來＝沒到模型），
 * 而且「打得愈兇擋得愈兇」（連打約 150 發之後一度全擋，停 45 秒就恢復）。
 * 網站的對策：① 403 也要重試（短間隔）② 全站同時最多 4 個請求 ③ 被擋就全體冷卻一下。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));

let nowMs = 1000;
const sleeps = [];
const calls = [];
let plan = [];   // 每一發要回什麼
const fetchT = async () => {
  const p = plan.shift() || { status: 200 };
  calls.push({ at: nowMs, inflight: W.__inflight() });
  if (p.throw) { const e = new Error('boom'); e.name = p.throw; throw e; }
  return { ok: p.status === 200, status: p.status,
           json: async () => (p.status === 200 ? { content: [{ type: 'text', text: 'OK' }] } : { error: { type: 'forbidden', message: 'Request not allowed' } }) };
};
const W = new Function('fetchT', 'AI_WRITING_ENDPOINT', 'Date', 'setTimeout',
  /* ⚠ 從 _AI_BACKOFF 開始切，不要含 data.js 自己的 fetchT——
     它會蓋掉我們注入的假 fetchT，然後真的去打網路（實測踩過）。 */
  pick('/* v458：多一段退避', '/* words: [{ term, zh }]') +
  '\nreturn { _aiAsk, _aiShouldBackoff, _AI_BACKOFF, _AI_MAX_INFLIGHT, __inflight: () => _aiInflight, __cool: () => _aiCoolUntil };')(
  fetchT, 'x',
  { now: () => nowMs },                                     // 假時鐘
  (fn, ms) => { sleeps.push(ms); nowMs += ms; Promise.resolve().then(fn); });   // 假 sleep：直接推進時間

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);
const reset = (p) => { plan = p; calls.length = 0; sleeps.length = 0; };
const askOK = (d) => (d?.content?.[0]?.text || null);

console.log('\n【1】403 要當成「這一發被擋」重試，不是直接放棄');
ok('⭐ 403 列進值得重試的狀態（以前只有 429/500/529）', W._aiShouldBackoff(403));
ok('429／500／529 一樣重試', [429, 500, 529].every(W._aiShouldBackoff));
ok('400 不重試（那是我們自己的格式錯，重打幾次都一樣）', !W._aiShouldBackoff(400));
eq('⭐ 總共有 4 次機會（1/3 被擋的話，漏掉的機率從 3.6% 降到 1.2%）', W._AI_BACKOFF.length, 4);

console.log('\n【2】被擋一次還是要把結果交出來');
reset([{ status: 403 }, { status: 200 }]);
eq('第一發被擋、第二發成功 → 使用者拿得到結果', await W._aiAsk({}, askOK), 'OK');
eq('真的重打了兩次', calls.length, 2);
ok('⭐ 403 的等待是「短的」（幾百毫秒，不是 3 秒）——它 0.17 秒就回來，等久沒意義', sleeps[0] < 500);

reset([{ status: 403 }, { status: 403 }, { status: 403 }, { status: 200 }]);
eq('連被擋三次，第四次成功也還是交得出來', await W._aiAsk({}, askOK), 'OK');

reset([{ status: 403 }, { status: 403 }, { status: 403 }, { status: 403 }]);
let err = null;
try { await W._aiAsk({}, askOK); } catch (e) { err = e; }
ok('四次都被擋才放棄', !!err);
ok('⭐ 錯誤訊息要講清楚「已經自動重試過」，不要叫老師去換金鑰', /自動重試/.test(err.message));
eq('錯誤物件帶著上游狀態（畫面才知道是 403 還是逾時）', err.upstream.status, 403);

console.log('\n【3】500／逾時維持原本的長退避（那才是真的塞車）');
reset([{ status: 500 }, { status: 200 }]);
await W._aiAsk({}, askOK);
ok('⭐ 5xx 等比較久（400ms 起跳）', sleeps[0] >= 400);

console.log('\n【4】主動把量壓下來：同時最多 4 個請求');
eq('上限就是 4', W._AI_MAX_INFLIGHT, 4);
reset(Array.from({ length: 10 }, () => ({ status: 200 })));
await Promise.all(Array.from({ length: 10 }, () => W._aiAsk({}, askOK)));
eq('十個請求全部完成', calls.length, 10);
ok('⭐ 任何時刻都沒有超過 4 個在飛（一鍵生成本來會一口氣丟 6~10 個）',
  Math.max(...calls.map(c => c.inflight)) <= 4);
ok('名額用完會還回來（不會卡死）', W.__inflight() === 0);

console.log('\n【5】一看到 403，所有人先一起冷靜一下');
reset([{ status: 403 }, { status: 200 }]);
await W._aiAsk({}, askOK);
ok('⭐ 403 之後設了全站冷卻時間（不然十個請求會一起再撞上去）', W.__cool() > 0);
ok('冷卻不會太久（約 1 秒，不然一鍵生成會變很慢）', W.__cool() - nowMs < 2000);

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
