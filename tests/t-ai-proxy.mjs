/* t-ai-proxy — v458b：Cloudflare Worker（alan-ai-proxy）本身的重試
 * 2026-09-28 看到 Worker 原始碼才確定：那個 403 body 是 api.anthropic.com 原樣轉回來的
 *（Worker 裡完全沒有擋人的程式），而且轉出去的請求沒有 user-agent ——
 * 沒有 UA 又來自資料中心 IP，正是上游邊緣防護最愛擋的形狀。
 * 對策：① 補 user-agent ② 被擋就在 Worker 裡面重試（伺服器對伺服器，學生端看不到）。 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = new URL('..', import.meta.url);
const src = fs.readFileSync(new URL('ai-proxy-worker.js', ROOT), 'utf8');
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wk-')), 'worker.mjs');
fs.writeFileSync(tmp, src);
const worker = (await import('file://' + tmp)).default;

let pass = 0, fail = 0;
const ok = (msg, cond) => { if (cond) { pass++; console.log('  ✅ ' + msg); } else { fail++; console.log('  ❌ ' + msg); } };

// 假的計時器：不真的等，只把「等了多久」記下來
const realTimeout = globalThis.setTimeout;
const waits = [];
globalThis.setTimeout = (fn, ms) => { waits.push(ms); return realTimeout(fn, 0); };

// 假的 fetch：照劇本回應，並記下每一發的標頭
let plan = [], sent = [];
globalThis.fetch = async (url, opt) => {
  sent.push({ url: String(url), headers: opt.headers, body: opt.body });
  const p = plan.shift() || { status: 200 };
  if (p.throw) throw new Error(p.throw);
  return new Response(p.body || JSON.stringify({ content: [{ type: 'text', text: 'OK' }] }), { status: p.status });
};

const FORBID = JSON.stringify({ error: { type: 'forbidden', message: 'Request not allowed' } });
const env = { ANTHROPIC_API_KEY: '  sk-ant-test-key\n', OPENAI_API_KEY: 'sk-oai' };
const askBody = JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 16, messages: [] });
const ask = () => new Request('https://x.workers.dev/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: askBody });
const reset = (p) => { plan = p; sent = []; waits.length = 0; };

console.log('\n【1】平常：一次就過，不要多送');
reset([{ status: 200 }]);
let res = await worker.fetch(ask(), env);
ok('回 200', res.status === 200);
ok('只送出去一趟（沒事不要重試，會多花錢又變慢）', sent.length === 1);
ok('內容原樣轉回來', JSON.parse(await res.text()).content[0].text === 'OK');

console.log('\n【2】⭐ 轉出去的請求要帶 user-agent（沒帶就是被擋的主因）');
reset([{ status: 200 }]);
await worker.fetch(ask(), env);
const h = sent[0].headers;
ok('⭐ 有 user-agent', !!h['user-agent'] && h['user-agent'].length > 5);
ok('打的是 Anthropic 的 messages', sent[0].url === 'https://api.anthropic.com/v1/messages');
ok('金鑰前後的空白/換行有清掉（貼上時很容易多一個換行）', h['x-api-key'] === 'sk-ant-test-key');
ok('學生的題目原樣送出去', sent[0].body === askBody);

console.log('\n【3】⭐ 被 403 擋掉：Worker 自己重試，學生端不該看到失敗');
reset([{ status: 403, body: FORBID }, { status: 403, body: FORBID }, { status: 200 }]);
res = await worker.fetch(ask(), env);
ok('⭐ 最後回 200（擋兩次還是救回來了）', res.status === 200);
ok('總共送了三趟', sent.length === 3);
ok('重試有間隔，不是馬上再撞上去', waits.length === 2 && waits[0] > 0 && waits[1] > waits[0]);
ok('回應會註明送了幾趟（之後要查就看這個）', res.headers.get('x-proxy-tries') === '3');

console.log('\n【4】429 / 529 / 502 也一樣要重試');
for (const st of [429, 529, 500, 502, 503, 408]) {
  reset([{ status: st }, { status: 200 }]);
  res = await worker.fetch(ask(), env);
  ok(`${st} 會重試並救回來`, res.status === 200 && sent.length === 2);
}

console.log('\n【5】我們自己寫錯的，不要重試（重試也不會變對，只是白花錢）');
for (const st of [400, 401, 404]) {
  reset([{ status: st, body: JSON.stringify({ error: { message: 'bad' } }) }]);
  res = await worker.fetch(ask(), env);
  ok(`${st} 只送一趟就回報`, res.status === st && sent.length === 1);
}

console.log('\n【6】一直被擋：不要無限重試，要把真正的錯誤交回去');
reset([{ status: 403, body: FORBID }, { status: 403, body: FORBID }, { status: 403, body: FORBID }, { status: 403, body: FORBID }, { status: 403, body: FORBID }]);
res = await worker.fetch(ask(), env);
ok('最後還是回 403（不要假裝成功）', res.status === 403);
ok('上游的錯誤原文有保留', (await res.text()).includes('Request not allowed'));
ok('送的趟數有上限（4 趟）', sent.length === 4);

console.log('\n【7】連線整個斷掉');
reset([{ throw: 'network down' }, { throw: 'network down' }, { status: 200 }]);
res = await worker.fetch(ask(), env);
ok('斷線也會重試，接得回來', res.status === 200);
reset([{ throw: 'down' }, { throw: 'down' }, { throw: 'down' }, { throw: 'down' }]);
res = await worker.fetch(ask(), env);
ok('完全連不上時回 502，而且說得出原因', res.status === 502 && (await res.text()).includes('down'));

console.log('\n【8】網站要能讀得到回應（CORS 不能因為改寫而弄丟）');
reset([{ status: 403, body: FORBID }, { status: 200 }]);
res = await worker.fetch(ask(), env);
ok('成功時有 CORS', res.headers.get('Access-Control-Allow-Origin') === '*');
reset([{ status: 400, body: '{}' }]);
res = await worker.fetch(ask(), env);
ok('⭐ 失敗時也要有 CORS（不然瀏覽器連錯誤訊息都讀不到，會變成看不懂的網路錯誤）',
   res.headers.get('Access-Control-Allow-Origin') === '*');
res = await worker.fetch(new Request('https://x.workers.dev/', { method: 'OPTIONS' }), env);
ok('OPTIONS 預檢照常過', res.status === 200 && res.headers.get('Access-Control-Allow-Origin') === '*');

console.log('\n【9】朗讀（TTS）那條路沒有被我改壞');
reset([{ status: 200, body: JSON.stringify({ ok: 1 }) }]);
const tts = new Request('https://x.workers.dev/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Hello there.' }) });
res = await worker.fetch(tts, env);
ok('打的是 OpenAI 的語音', sent[0].url.includes('api.openai.com'));
ok('文字有送出去', JSON.parse(sent[0].body).input === 'Hello there.');
ok('回得出音檔', res.status === 200 && 'audio' in JSON.parse(await res.text()));
reset([]);
const empty = new Request('https://x.workers.dev/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '   ' }) });
res = await worker.fetch(empty, env);
ok('空白文字直接回 400，不會白打一次 OpenAI', res.status === 400 && sent.length === 0);

globalThis.setTimeout = realTimeout;
console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
