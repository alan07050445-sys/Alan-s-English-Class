/* t-line-v425 — Alan 回報的三件事：
 *  ① 綁定明明成功  ② 按「立即發送」卻顯示 0 位  ③ 家長按「查詢作業」完全沒回應 */
import fs from 'fs';
const src = fs.readFileSync(new URL('../line-notify-worker.js', import.meta.url), 'utf8');
const W = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const Wd = W.default;

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e).replace(/\n/g, '\n         ') : '')));
const S = (v) => ({ stringValue: v });

// ── 假資料：G4 一週作業（本週 9/7–9/13）──────────────────────
const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const addD = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const mon = (() => { const d = new Date(today + 'T00:00:00Z'); return addD(today, -((d.getUTCDay() + 6) % 7)); })();
const G4 = { fields: { weeks: { mapValue: { fields: { 'g4-W': { mapValue: { fields: {
  label: S('Week 2'), startISO: S(mon), endISO: S(addD(mon, 6)),
  items: { mapValue: { fields: { vocab: { arrayValue: { values: [{ mapValue: { fields: { id: S('v1'), title: S('Unit'), type: S('quiz') } } }] } } } } },
  homework: { mapValue: { fields: { v1: { mapValue: { fields: { dueDate: S(addD(mon, 6)) } } } } } },
} } } } } } } };
const ERIC = 'le12777@kcbs.tw';
const calls = [];
let replyStatus = 200, replyBody = '{}', slowMs = 0;
const sent = { reply: [], push: [], multicast: [] };
globalThis.fetch = async (url, opts) => {
  const u = String(url); calls.push(u);
  if (slowMs && u.includes('firestore')) await new Promise((r) => setTimeout(r, slowMs));
  if (u.includes('oauth2')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
  if (u.includes('/documents/progress')) return new Response(JSON.stringify({ documents: [{ name: 'x/' + ERIC, fields: { email: S(ERIC), name: S('Eric'), items: { mapValue: { fields: {} } } } }] }), { status: 200 });
  if (u.includes('/documents/roster')) return new Response(JSON.stringify({ documents: [] }), { status: 200 });
  const m = u.match(/\/documents\/(class\/[A-Za-z0-9_]+)/);
  if (m) return new Response(JSON.stringify(m[1] === 'class/data_g4' ? G4 : {}), { status: 200 });
  if (u.includes('/v2/bot/profile/')) return new Response(JSON.stringify({ displayName: 'Candy' }), { status: 200 });
  const b = opts && opts.body ? JSON.parse(opts.body) : {};
  if (u.includes('/message/reply')) { sent.reply.push(b); return new Response(replyBody, { status: replyStatus }); }
  if (u.includes('/message/push')) { sent.push.push(b); return new Response('{}', { status: 200 }); }
  if (u.includes('/message/multicast')) { sent.multicast.push(b); return new Response('{}', { status: 200 }); }
  return new Response('{}', { status: 200 });
};
const rI = crypto.subtle.importKey.bind(crypto.subtle);
crypto.subtle.importKey = async (f, d, a, e, u) => (a && a.name === 'RSASSA-PKCS1-v1_5') ? rI('raw', new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']) : rI(f, d, a, e, u);
const rS = crypto.subtle.sign.bind(crypto.subtle);
crypto.subtle.sign = async (a, k, d) => rS(a === 'RSASSA-PKCS1-v1_5' ? 'HMAC' : a, k, d);

const SECRET = 'sec';
function makeEnv(seed) {
  const store = new Map(Object.entries(Object.assign({ roster: JSON.stringify([{ email: ERIC, name: 'Eric', grade: 'g4' }]) }, seed || {})));
  return { LINE_TOKEN: 't', LINE_SECRET: SECRET, ADMIN_PASS: 'pw',
    FIREBASE_SA: JSON.stringify({ project_id: 'p', client_email: 'x', private_key: 'AAAA' }),
    LINKS: { get: async (k) => (store.has(k) ? store.get(k) : null), put: async (k, v) => void store.set(k, v) }, _s: store };
}
async function hook(env, text, ctx) {
  const raw = JSON.stringify({ events: [{ type: 'message', replyToken: 'rt', source: { userId: 'Ucandy0076d66b' }, message: { type: 'text', text } }] });
  const sig = (await import('crypto')).createHmac('sha256', SECRET).update(raw).digest('base64');
  return Wd.fetch(new Request('https://w/webhook', { method: 'POST', body: raw, headers: { 'x-line-signature': sig } }), env, ctx);
}
const reset = () => { sent.reply.length = sent.push.length = sent.multicast.length = calls.length = 0; replyStatus = 200; replyBody = '{}'; slowMs = 0; };
const BOUND = { links: JSON.stringify({ Ucandy0076d66b: [{ email: ERIC, name: 'Eric', grade: 'g4' }] }) };

// ═══ ③ 查詢作業沒回應 ═══
log.push('\n【③】家長按「查詢作業」要有回應');
{
  reset(); slowMs = 300;                        // 模擬 Firestore 慢
  const env = makeEnv(BOUND);
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(p) };
  const t0 = Date.now();
  const res = await hook(env, '查詢作業', ctx);
  const tResp = Date.now() - t0;
  ok('⭐ LINE 立刻收到 200（不等 Firestore）', res.status === 200 && tResp < 150, tResp + 'ms');
  ok('真正的工作交給 waitUntil 在背景跑', pending.length === 1);
  ok('回 200 的當下還沒回覆（證明沒有卡住 LINE）', sent.reply.length === 0);
  await Promise.all(pending);
  ok('⭐ 背景跑完 → 有回覆一張作業卡', sent.reply.length === 1 && sent.reply[0].messages[0].type === 'flex', JSON.stringify(sent.reply[0] || {}).slice(0, 120));
  ok('⭐ 開學後不再下載 2.7MB 的暑假題庫', !calls.some((u) => u.includes('data_summer_lib')), calls.filter((u) => u.includes('summer')).join(' '));
  ok('⭐ 沒有下載用不到的年級（只讀 G4）', calls.filter((u) => /documents\/class\/data/.test(u)).length === 1, calls.filter((u) => /class\/data/.test(u)).join('\n'));
  const d = JSON.parse(env._s.get('diag'));
  ok('診斷紀錄有記下這一則', d[0].kind === 'homework' && d[0].reply === 200 && d[0].text === '查詢作業', JSON.stringify(d[0]));
  ok('診斷紀錄不存完整 LINE userId', !JSON.stringify(d).includes('Ucandy0076d66b') && d[0].u === '…76d66b', d[0].u);
}
{
  reset(); replyStatus = 400; replyBody = '{"message":"Invalid reply token"}';
  const env = makeEnv(BOUND);
  const pending = [];
  await hook(env, '作業', { waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  ok('⭐ 回覆失敗（權杖過期）→ 自動改用 push 補送', sent.push.length === 1 && sent.push[0].to === 'Ucandy0076d66b', JSON.stringify(sent.push));
  const d = JSON.parse(env._s.get('diag'))[0];
  ok('診斷紀錄寫得出失敗原因', d.reply === 400 && /Invalid reply token/.test(d.replyErr) && d.push === 200, JSON.stringify(d));
}
{
  reset();
  const env = makeEnv(BOUND);
  const res = await hook(env, '哈囉', undefined);   // 舊環境沒有 ctx 也不能爆
  ok('沒有 ctx（舊版執行環境）也照樣能處理', res.status === 200 && sent.reply.length === 1);
}
{
  reset();
  const env = makeEnv(BOUND);
  const pending = [];
  const raw = JSON.stringify({ events: [
    { type: 'message', replyToken: 'a', source: { userId: 'U1aaaaaa' }, message: { type: 'text', text: '練習' } },
    { type: 'message', replyToken: 'b', source: { userId: 'U2bbbbbb' }, message: { type: 'sticker' } },
  ] });
  const sig = (await import('crypto')).createHmac('sha256', SECRET).update(raw).digest('base64');
  await Wd.fetch(new Request('https://w/webhook', { method: 'POST', body: raw, headers: { 'x-line-signature': sig } }), env, { waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  ok('一次來兩個事件、其中一個是貼圖 → 文字照回、貼圖不理', sent.reply.length === 1, JSON.stringify(sent.reply));
}
{
  reset();
  const env = makeEnv();
  const raw = '{"events":[]}';
  const r = await Wd.fetch(new Request('https://w/webhook', { method: 'POST', body: raw, headers: { 'x-line-signature': 'bad' } }), env, { waitUntil() {} });
  ok('簽章錯 → 401、而且不做任何事', r.status === 401 && calls.length === 0);
}

// ═══ ② 立即發送 0 位 ═══
log.push('\n【②】老師測試時收過 → 媽媽綁定後還是要收得到');
{
  reset();
  // 情境：Eric 的作業之前已經通知過（老師自己的 LINE 測試時收的），今天不是週一
  const hwsent = { 'g4-W_v1': { [ERIC]: ['new'] } };
  const env = makeEnv(Object.assign({}, BOUND, { hwsent: JSON.stringify(hwsent) }));
  const R = await W.runReminders(env, false, false);
  const isMon = today === mon;
  if (!isMon) {
    ok('⭐ 媽媽剛綁定、還沒收過 → 18:00 會補發給她（原因 bind）',
       R.sends.length === 1 && R.sends[0].reason === 'bind' && sent.multicast[0].to.join() === 'Ucandy0076d66b',
       JSON.stringify({ sends: R.sends.map((x) => x.reason), quiet: R.skippedQuiet }));
  } else ok('（今天剛好週一，改由週一回報觸發）', R.sends.length === 1);
  const R2 = await W.runReminders(env, false, false);
  ok('補發過一次之後，同一天不會再發', R2.sends.length === 0 && R2.skippedQuiet.length === 1, JSON.stringify(R2.sends.map((x) => x.reason)));
  ok('⭐ 沒發的原因寫得清清楚楚（給老師看）', /已經通知過/.test((R2.skippedQuiet[0] || {}).why), JSON.stringify(R2.skippedQuiet));
}
{
  reset();
  const hwsent = { 'g4-W_v1': { [ERIC]: ['new'] } };
  const hwbind = { ['Ucandy0076d66b|' + ERIC]: today };
  const env = makeEnv(Object.assign({}, BOUND, { hwsent: JSON.stringify(hwsent), hwbind: JSON.stringify(hwbind) }));
  const R = await W.runReminders(env, false, true);
  ok('⭐ 老師按「立即發送」→ 不管頻率規則，照樣發', R.sends.length === 1 && sent.multicast.length === 1,
     JSON.stringify(R.sends.map((x) => x.reason)));
  ok('報告會標出「18:00 自動提醒其實不會發這一則」',
     today === mon ? true : (R.sends[0].reason === 'manual' && R.sends[0].auto === false), JSON.stringify(R.sends[0] && { reason: R.sends[0].reason, auto: R.sends[0].auto }));
  const Rp = await W.runReminders(env, true, true);
  ok('試跑預覽（force）不會真的發', Rp.sends.length === 1 && sent.multicast.length === 1);
}
{
  reset();
  const env = makeEnv(BOUND);
  const R = await W.runReminders(env, true, false);
  ok('開學後：老師端「暑假發派」誠實顯示 0', R.summerStudents === 0);
  ok('開學後：每日提醒也不下載暑假題庫', !calls.some((u) => u.includes('data_summer_lib')));
}

// ═══ /diag ═══
log.push('\n【診斷】老師端讀得到最近的處理紀錄');
{
  const env = makeEnv(Object.assign({}, BOUND, { diag: JSON.stringify([{ at: '09-11 20:00', kind: 'homework', reply: 200 }]) }));
  const bad = await Wd.fetch(new Request('https://w/diag'), env, {});
  ok('沒密碼 → 401', bad.status === 401);
  const r = await Wd.fetch(new Request('https://w/diag', { headers: { 'x-admin-pass': 'pw' } }), env, {});
  const j = await r.json();
  ok('有密碼 → 拿得到紀錄', r.status === 200 && j.list.length === 1 && j.list[0].kind === 'homework', JSON.stringify(j));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
