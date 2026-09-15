/* t-ai-error — v449 AI 不通的時候要講實話
 * Alan：「分段閱讀讀取完圖片之後沒辦法 AI 生成背景知識，以及分段題目跟綜合題目」
 * 追查結果：那個時間點 AI 供應商對每一個請求都回 403
 *   {"error":{"type":"forbidden","message":"Request not allowed"}}
 * ——網站每一個 AI 功能都不通，畫面上卻只寫「產生失敗」，看起來像文章的問題。
 * 這支測「錯誤訊息要把上游的狀態帶出來」。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data   = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const css    = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };

/* 假的 fetch：想回什麼就回什麼 */
let reply = null;
const fetchT = async () => ({ ok: reply.status < 400, status: reply.status, json: async () => reply.body });
const W = new Function('fetchT', 'AI_WRITING_ENDPOINT',
  slice(data, '/* _aiBackoff', '/* words: [{ term, zh }]') +
  '\nreturn { _aiAsk, _aiUpstreamNote };')(fetchT, 'https://x');

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);
const call = async () => {
  try { await W._aiAsk({ model: 'm', messages: [] }, (d) => (d && d.content ? d : null)); return null; }
  catch (e) { return e; }
};

console.log('\n【1】AI 服務回 403（Alan 那天遇到的）');
reply = { status: 403, body: { error: { type: 'forbidden', message: 'Request not allowed' } } };
let e = await call();
ok('有丟錯', !!e);
ok('⭐ 訊息直接寫「AI 服務拒絕了這次請求（403）」', /AI 服務拒絕了這次請求（403/.test(e.message));
ok('⭐ 帶上上游原文', /Request not allowed/.test(e.message));
ok('⭐ 明講「不是你的內容有問題」', /這不是你的內容有問題/.test(e.message));
ok('⭐ 告訴他去看 Worker 的金鑰／Anthropic 額度', /Cloudflare Worker 的 API 金鑰失效|停用／額度用完/.test(e.message));
ok('提醒他所有 AI 功能都會一起不通', /所有 AI 功能都會一起不通/.test(e.message));
ok('錯誤物件帶得走（upstream）', e.upstream && e.upstream.status === 403 && e.upstream.type === 'forbidden');

console.log('\n【2】其他狀態各有各的講法');
reply = { status: 401, body: { error: { message: 'invalid x-api-key' } } };
ok('401 → 金鑰不正確', /金鑰不正確/.test((await call()).message));
reply = { status: 429, body: { error: { message: 'rate limit' } } };
ok('429 → 請求太密集', /請求太密集/.test((await call()).message));
reply = { status: 529, body: { error: { message: 'overloaded' } } };
ok('529 → AI 服務暫時出問題', /暫時出問題/.test((await call()).message));

console.log('\n【3】格式不合格（AI 有回、只是內容不對）不要亂賴');
reply = { status: 200, body: { hello: 'world' } };
e = await call();
ok('還是原本那句「回傳格式看不懂」', /回傳格式看不懂/.test(e.message));
ok('⭐ 不會硬掰成「AI 服務拒絕」', !/AI 服務拒絕/.test(e.message));
ok('沒有 upstream', !e.upstream);

console.log('\n【4】成功之後就把「上次失敗」忘掉');
reply = { status: 403, body: { error: { message: 'Request not allowed' } } };
await call();
reply = { status: 200, body: { content: [{ text: '{}' }] } };
const good = await W._aiAsk({ model: 'm', messages: [] }, (d) => (d && d.content ? 'ok' : null));
eq('成功就是成功', good, 'ok');
eq('⭐ 之後的失敗不會再掛著舊的 403', W._aiUpstreamNote(null), '');

console.log('\n【5】各個功能的失敗訊息都要帶上這一段');
['互動教學產生失敗', '背景知識產生失敗', '分一分這次沒有產生成功', 'AI 這次沒有出到符合文章的題目'].forEach(k => {
  const i = data.indexOf(k);
  ok(`「${k}」有帶 _aiUpstreamNote`, i > 0 && data.slice(i, i + 200).indexOf('_aiUpstreamNote') > 0);
});
ok('太久以前的失敗不算（兩分鐘內才提）', /Date\.now\(\) - \(_aiLastUpstream\.at \|\| 0\) < 120000/.test(data));
ok('錯誤框會保留換行', /white-space: pre-line/.test(css));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
