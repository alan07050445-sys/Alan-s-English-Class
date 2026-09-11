/* t-line-v427 — Alan：「不用防洗版就讓 AI 正常回覆 但是要有限制 這很重要」
 *   「這個 line 的功能主要是 Alan 老師宣布事情 提醒作業的地方 沒辦法請假 加課 或是批改功課…
 *     要的話都直接聯絡我本人 Line」「速度很重要 不要有延遲」 */
import fs from 'fs';
import crypto from 'crypto';
const src = fs.readFileSync(new URL('../line-notify-worker.js', import.meta.url), 'utf8');
const W = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e).replace(/\n/g, '\n         ') : '')));
const S = (v) => ({ stringValue: v });
const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

let aiAnswer = { intent: 'chat', reply: '謝謝您 😊' };
const calls = [], sent = { reply: [], loading: [] };
globalThis.fetch = async (url, opts) => {
  const u = String(url); calls.push(u);
  if (u.includes('alan-ai-proxy')) return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(aiAnswer) }] }), { status: 200 });
  if (u.includes('oauth2')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
  if (u.includes('/documents/')) return new Response(JSON.stringify({ documents: [] }), { status: 200 });
  const b = opts && opts.body ? JSON.parse(opts.body) : {};
  if (u.includes('/chat/loading')) { sent.loading.push(b); return new Response('{}', { status: 202 }); }
  if (u.includes('/message/reply')) { sent.reply.push(b); return new Response('{}', { status: 200 }); }
  return new Response('{}', { status: 200 });
};
const ROSTER = [{ email: 'le12777@kcbs.tw', name: 'Lucas', grade: 'g4' }, { email: 'le13555@kcbs.tw', name: 'Tayler', grade: 'g3' }, { email: 'le12888@kcbs.tw', name: 'Nick', grade: 'g4' }];
const ONE = [{ email: 'le12777@kcbs.tw', name: 'Lucas', grade: 'g4' }];
const TWO = [ONE[0], { email: 'le13555@kcbs.tw', name: 'Tayler', grade: 'g3' }];
function makeEnv(links, extra) {
  const st = new Map([['roster', JSON.stringify(ROSTER)]]);
  if (links) st.set('links', JSON.stringify(links));
  return Object.assign({ LINE_TOKEN: 't', LINE_SECRET: 'sec', LINKS: { get: async (k) => (st.has(k) ? st.get(k) : null), put: async (k, v) => void st.set(k, v) }, _s: st }, extra || {});
}
const aiCalls = () => calls.filter((u) => u.includes('alan-ai-proxy')).length;
const reset = () => { calls.length = 0; sent.reply.length = 0; sent.loading.length = 0; aiAnswer = { intent: 'chat', reply: '謝謝您 😊' }; };
const say = async (env, text) => { const h = {}; const r = await W.handleMessage(env, 'Uc', text, h); return { r, h }; };

// ═══ 1. 秒回：關鍵字就能確定的，不問 AI ═══
log.push('\n【1】關鍵字就知道意思 → 不等 AI（秒回）');
{
  const cases = [
    ['Lucas作業寫完了嗎', (r) => r.hw && r.hw.length === 1 && r.hw[0].name === 'Lucas', '查 Lucas 的作業'],
    ['Tayler文法寫完了嗎', (r) => r.hw && r.hw[0].name === 'Tayler' && r.cat === 'grammar', '查 Tayler 的文法'],
    ['小孩功課還剩什麼', (r) => r.hw && r.hw.length === 2, '查兩個孩子的作業'],
    ['Lucas要請假', (r) => r.contact, '請私訊老師'],
    ['下禮拜可以調課嗎', (r) => r.contact, '請私訊老師'],
    ['可以幫他改作業嗎', (r) => r.contact, '請私訊老師（有「作業」兩個字也一樣）'],
    ['這次成績怎麼樣', (r) => r.contact, '請私訊老師'],
    ['學費怎麼繳', (r) => r.contact, '請私訊老師'],
    ['找老師', (r) => r.contact, '請私訊老師（快速按鈕）'],
    ['練習網站在哪裡', (r) => typeof r === 'string' && r.includes('github.io'), '給網站'],
  ];
  for (const [t, check, what] of cases) {
    reset();
    const { r, h } = await say(makeEnv({ Uc: TWO }), t);
    ok(`「${t}」→ ${what}，沒有問 AI`, check(r || {}) && aiCalls() === 0 && h.path === 'fast', JSON.stringify({ r, path: h.path, ai: aiCalls() }));
  }
  reset();
  const envR = makeEnv({ Uc: TWO });
  const { r: rr } = await say(envR, '我不想再收Tayler的通知了');
  ok('⭐「我不想再收Tayler的通知了」→ 直接刪掉，不等 AI', String(rr).includes('已刪除 Tayler') && aiCalls() === 0, rr);
  reset();
  const envA = makeEnv({ Uc: ONE });
  const { r: ra } = await say(envA, '我還有一個小孩Nick也要收');
  ok('⭐「我還有一個小孩Nick也要收」→ 直接綁好，不等 AI', String(ra).includes('已綁定 Nick') && aiCalls() === 0, ra);
  ok('名字要整個字吻合（「Lucasss」不算 Lucas）', W.nameIn('Lucas作業', 'Lucas') && !W.nameIn('Lucasss作業', 'Lucas'));
}

// ═══ 2. AI 每次都回（不再防洗版）═══
log.push('\n【2】看不懂的才問 AI，而且每次都回');
{
  reset();
  const env = makeEnv({ Uc: TWO });
  const out = [];
  for (const t of ['老師好帥', '今天天氣真好', '哈哈哈', '你是機器人嗎']) out.push((await say(env, t)).r);
  ok('⭐ 連續四句都有回（不再「刻意不回」）', out.every((x) => x === '謝謝您 😊'), JSON.stringify(out));
  ok('四句各問了一次 AI', aiCalls() === 4, aiCalls());
  reset(); aiAnswer = { intent: 'contact' };
  const { r, h } = await say(env, '老師我想跟你聊聊孩子最近的狀況');
  ok('⭐ AI 判斷要找老師本人 → 請私訊老師', r && r.contact && h.path === 'ai:contact', JSON.stringify({ r, path: h.path }));
}

// ═══ 3. 限制 ═══
log.push('\n【3】限制：範圍寫死、一天有上限');
{
  const sys = W.aiSystem(['Lucas']);
  ok('⭐ 給 AI 的規則寫明「只做公告與作業提醒」', sys.includes('只用來：Alan 老師發公告、提醒作業'));
  ok('⭐ 請假／調課／批改／成績／學費 → 一律判 contact', ['請假', '調課', '批改', '成績', '學費'].every((w) => sys.includes(w)) && sys.includes('contact'));
  ok('⭐ 聊天不能答應事情、不能說會轉告、不能編造、不能附網址', ['不能答應任何事', '不能說會轉告老師', '不能編造作業或成績', '不要附網址'].every((w) => sys.includes(w)));
  ok('拿不準的一律判 contact（寧可請他找老師，也不亂回）', sys.includes('拿不準的一律判 contact'));

  reset();
  const env = makeEnv({ Uc: TWO });
  env._s.set('chatstate', JSON.stringify({ Uc: { ai: { d: today, n: W.AI_DAILY } } }));
  const { r, h } = await say(env, '老師好帥');
  ok(`⭐ 同一個 LINE 今天已經問了 ${W.AI_DAILY} 次 → 不再問 AI，改用固定的客氣話（還是有回）`, aiCalls() === 0 && h.path === 'quota' && W.POLITE.indexOf(r) >= 0, JSON.stringify({ r, path: h.path }));
  const { r: r2 } = await say(env, 'Lucas作業寫完了嗎');
  ok('額度用完了，查作業這種功能照常（本來就不花 AI）', r2 && r2.hw);

  reset();
  const env2 = makeEnv({ Uc: TWO });
  await say(env2, '老師好帥');
  await W.flushBg();
  ok('每問一次 AI 就記一次（回覆送出之後才寫，不拖慢）', (await W.aiUsedToday(env2, 'Uc')) === 1);
  env2._s.set('chatstate', JSON.stringify({ Uc: { ai: { d: '2000-01-01', n: 99 } } }));
  ok('隔天自動歸零', (await W.aiUsedToday(env2, 'Uc')) === 0);
  env2._s.set('chatstate', JSON.stringify({ Uc: { ai: { d: today, n: 3 } } }));
  await W.handleNameBinding(env2, 'Uc', 'Nick');         // 會寫對話狀態
  ok('對話狀態改變時，不會把今天的 AI 次數洗掉', (await W.aiUsedToday(env2, 'Uc')) === 3, env2._s.get('chatstate'));
}

// ═══ 4. 找老師 ═══
log.push('\n【4】「請私訊 Alan 老師本人」');
{
  const m0 = JSON.stringify(W.contactMessages({}));
  ok('⭐ 預設就帶 Alan 本人的 LINE（https://line.me/ti/p/BgUz6sEtJ9）', m0.includes('"uri":"https://line.me/ti/p/BgUz6sEtJ9"') && m0.includes('私訊 Alan 老師'), m0.slice(0, 300));
  const m1 = W.contactMessages({ TEACHER_LINE_URL: 'off' });
  ok('env 設 off → 只給文字，講清楚這個帳號辦不到、請私訊本人', m1.length === 1 && m1[0].type === 'text' && m1[0].text.includes('只負責 Alan 老師的公告和作業提醒') && m1[0].text.includes('私訊 Alan 老師本人'), m1[0].text);
  const m2 = W.contactMessages({ TEACHER_LINE_URL: 'https://line.me/ti/p/abc123' });
  const btn = JSON.stringify(m2[0]);
  ok('⭐ 設定了連結 → 附一顆「💬 私訊 Alan 老師」按鈕', m2[0].type === 'flex' && btn.includes('"uri":"https://line.me/ti/p/abc123"') && btn.includes('私訊 Alan 老師'));
  ok('連結不是 https → 不做按鈕（只給文字）', W.contactMessages({ TEACHER_LINE_URL: 'javascript:alert(1)' })[0].type === 'text');
}

// ═══ 5. 快速按鈕 ═══
log.push('\n【5】每則回覆底下都有快速按鈕');
{
  const q = W.withQuickReply([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }]);
  ok('只掛在最後一則（LINE 只顯示最後一則的）', !q[0].quickReply && q[1].quickReply.items.length === 4);
  ok('四顆：作業／練習／孩子／找老師', q[1].quickReply.items.map((x) => x.action.text).join() === '作業,練習,孩子,找老師');
  ok('按鈕文字都在 LINE 的 20 字上限內', q[1].quickReply.items.every((x) => x.action.label.length <= 20));
  const run = async (text, env) => {
    const raw = JSON.stringify({ events: [{ type: 'message', replyToken: 'rt', source: { userId: 'Uc' }, message: { type: 'text', text } }] });
    const sig = crypto.createHmac('sha256', 'sec').update(raw).digest('base64');
    const pend = [];
    await W.default.fetch(new Request('https://w/webhook', { method: 'POST', body: raw, headers: { 'x-line-signature': sig } }), env, { waitUntil: (p) => pend.push(p) });
    await Promise.all(pend);
  };
  reset();
  const env = makeEnv({ Uc: TWO });
  await run('Lucas要請假', env);
  const last = sent.reply[0].messages[sent.reply[0].messages.length - 1];
  ok('⭐ 實際送出的回覆有快速按鈕', last.quickReply && last.quickReply.items.length === 4, JSON.stringify(sent.reply[0]).slice(0, 200));
  ok('「Lucas要請假」→ 回「請私訊老師本人」＋私訊按鈕，不顯示輸入中（本來就秒回）', JSON.stringify(last).includes('私訊 Alan 老師本人') && JSON.stringify(last).includes('line.me/ti/p/BgUz6sEtJ9') && sent.loading.length === 0);
  const d = JSON.parse(env._s.get('diag'))[0];
  ok('診斷紀錄：kind=contact、path=fast', d.kind === 'contact' && d.path === 'fast', JSON.stringify(d));
  reset();
  await run('老師好帥', makeEnv({ Uc: TWO }));
  ok('問 AI 的那一則會先顯示輸入中', sent.loading.length === 1 && sent.reply.length === 1);
}

// ═══ 6. 客氣話不再暗示「老師會看到訊息」═══
log.push('\n【6】固定的客氣話');
{
  ok('六句都不說「老師會看到／會回覆您」（要找老師請私訊本人）', W.POLITE.every((x) => !/老師會看到|老師看到|會回覆您|老師都看得到/.test(x)), JSON.stringify(W.POLITE));
  ok('都有引導到快速按鈕或關鍵字', W.POLITE.every((x) => /按|回覆「/.test(x)));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
