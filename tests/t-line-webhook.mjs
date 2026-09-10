/* t-line-webhook — 從 LINE 打進來的 HTTP 請求開始，完整跑一遍 webhook */
import fs from 'fs'; import crypto from 'crypto';
const src = fs.readFileSync(new URL('../line-notify-worker.js', import.meta.url), 'utf8');
const W = (await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'))).default;

const SECRET = 'test-channel-secret';
const ROSTER = [
  { email: 'eric@kcbs.tw',   name: 'Eric',   grade: 'g4' },
  { email: 'tayler@kcbs.tw', name: 'Tayler', grade: 'g2' },
];
const store = new Map([['roster', JSON.stringify(ROSTER)]]);
const env = {
  LINE_TOKEN: 'tok', LINE_SECRET: SECRET, ADMIN_PASS: 'pw',
  LINKS: { get: async (k) => (store.has(k) ? store.get(k) : null), put: async (k, v) => void store.set(k, v) },
};

// 攔截所有對 LINE API 的呼叫
const sent = [];        // 只記「真的送出訊息」的呼叫
const calls = [];       // 記全部（含查家長顯示名稱）
let profileName = '媽媽';
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  calls.push(u);
  if (u.includes('/v2/bot/profile/')) {
    return new Response(JSON.stringify({ displayName: profileName }), { status: 200 });
  }
  const body = JSON.parse((opts && opts.body) || '{}');
  sent.push({ url: u, auth: opts.headers.Authorization, text: (body.messages || [])[0] });
  return new Response('{}', { status: 200 });
};

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + e : '')));

function post(path, payload, secret) {
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret == null ? SECRET : secret).update(raw).digest('base64');
  return new Request('https://w/' + path, { method: 'POST', body: raw, headers: { 'x-line-signature': sig, 'Content-Type': 'application/json' } });
}
const ev = (e) => ({ destination: 'x', events: [e] });
const last = () => sent[sent.length - 1];

log.push('\n【W1】簽章驗證');
{
  const bad = new Request('https://w/webhook', { method: 'POST', body: '{}', headers: { 'x-line-signature': 'nope' } });
  const r = await W.fetch(bad, env);
  ok('簽章錯 → 401，而且完全不回訊息', r.status === 401 && sent.length === 0, String(r.status));
}

log.push('\n【W2】家長按「加入好友」');
{
  const r = await W.fetch(post('webhook', ev({ type: 'follow', replyToken: 'rt1', source: { userId: 'Uaaa' } })), env);
  ok('回 200', r.status === 200);
  ok('有回一則訊息', sent.length === 1, JSON.stringify(sent));
  ok('走 reply API（不是 push，不花額度）', last().url.includes('/message/reply'), last().url);
  ok('訊息在問孩子英文名字', last().text.text.includes('英文名字'), last().text.text);
  ok('開頭就是問候，不用再靠官方帳號的歡迎訊息', last().text.text.startsWith('媽媽 您好，歡迎加入'), last().text.text);
  ok('有去查家長的 LINE 顯示名稱', calls.some((u) => u.includes('/v2/bot/profile/')), calls.join(' '));
  log.push('\n───── 家長加好友會看到的訊息 ─────\n' + last().text.text + '\n──────────────────────────────');
}

log.push('\n【W3】家長回「Eric & Tayler」');
{
  await W.fetch(post('webhook', ev({ type: 'message', replyToken: 'rt2', source: { userId: 'Uaaa' }, message: { type: 'text', text: 'Eric & Tayler' } })), env);
  ok('兩位都寫進 KV', (JSON.parse(store.get('links'))['Uaaa'] || []).length === 2, store.get('links'));
  ok('回覆說綁定完成', last().text.text.includes('綁定完成'), last().text.text);
  log.push('\n───── 家長會看到的回覆 ─────\n' + last().text.text + '\n──────────────────────────────');
}

log.push('\n【W3b】查不到顯示名稱時，訊息仍然通順');
{
  profileName = '';
  const n = sent.length;
  await W.fetch(post('webhook', ev({ type: 'follow', replyToken: 'rtx', source: { userId: 'Ubbb' } })), env);
  ok('沒有名字就直接說「歡迎加入」，不會出現空白或 undefined',
     sent[n].text.text.startsWith("歡迎加入 Alan's English Class") && !sent[n].text.text.includes('undefined'), sent[n].text.text);
  profileName = '媽媽';
}

log.push('\n【W4】非文字訊息（貼圖／照片）不該爆掉');
{
  const n = sent.length;
  const r = await W.fetch(post('webhook', ev({ type: 'message', replyToken: 'rt3', source: { userId: 'Uaaa' }, message: { type: 'sticker' } })), env);
  ok('回 200 且安靜不回話', r.status === 200 && sent.length === n, String(r.status));
  const r2 = await W.fetch(post('webhook', ev({ type: 'unfollow', source: { userId: 'Uaaa' } })), env);
  ok('封鎖(unfollow) 事件也不會爆', r2.status === 200);
}

log.push('\n【W5】綁完之後 /push 找得到人（年級／個別通知）');
{
  const r = await W.fetch(new Request('https://w/push', { method: 'POST', headers: { 'x-admin-pass': 'pw', 'Content-Type': 'application/json' }, body: JSON.stringify({ target: { type: 'grade', grade: 'G2' }, text: 'hi' }) }), env);
  const d = await r.json();
  ok('發給 G2 → 找到 1 個收訊人（Tayler 的家長）', d.ok && d.count === 1, JSON.stringify(d));
  const r2 = await W.fetch(new Request('https://w/push', { method: 'POST', headers: { 'x-admin-pass': 'pw', 'Content-Type': 'application/json' }, body: JSON.stringify({ target: { type: 'students', emails: ['eric@kcbs.tw'] }, text: 'hi' }) }), env);
  const d2 = await r2.json();
  ok('發給 Eric 個人 → 找到 1 個收訊人', d2.ok && d2.count === 1, JSON.stringify(d2));
}

log.push('\n【W6】/links 後台看得到綁定結果');
{
  const r = await W.fetch(new Request('https://w/links', { headers: { 'x-admin-pass': 'pw' } }), env);
  const d = await r.json();
  ok('列出這個 LINE 綁的兩位', (d.links['Uaaa'] || []).map((x) => x.name).join() === 'Eric,Tayler', JSON.stringify(d.links));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
