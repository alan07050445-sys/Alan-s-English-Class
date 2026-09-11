/* t-line-v426 — Alan：「加快所有 line 回覆（查詢作業、新增或刪除）」
 *                 「自動提醒是自動提醒 主動提醒是主動提醒 不要混在一起」
 *                 「我要的是更智慧的版本 而不是很死板」 */
import fs from 'fs';
import crypto from 'crypto';
const src = fs.readFileSync(new URL('../line-notify-worker.js', import.meta.url), 'utf8');
const W = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e).replace(/\n/g, '\n         ') : '')));
const S = (v) => ({ stringValue: v });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 假資料：G4（Eric）、G3（Tayler）各一週作業，含單字與文法 ──
const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const addD = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const mon = (() => { const d = new Date(today + 'T00:00:00Z'); return addD(today, -((d.getUTCDay() + 6) % 7)); })();
function gradeDoc(prefix) {
  const it = (id, t, type) => ({ mapValue: { fields: { id: S(id), title: S(t), type: S(type) } } });
  const hw = (ids) => ({ mapValue: { fields: Object.fromEntries(ids.map((i) => [i, { mapValue: { fields: { dueDate: S(addD(mon, 6)) } } }])) } });
  return { fields: { weeks: { mapValue: { fields: { [prefix + 'W']: { mapValue: { fields: {
    label: S('Week 2'), startISO: S(mon), endISO: S(addD(mon, 6)),
    items: { mapValue: { fields: {
      vocab: { arrayValue: { values: [it(prefix + 'v1', 'Unit', 'quiz'), it(prefix + 'v2', 'Unit', 'spelling')] } },
      grammar: { arrayValue: { values: [it(prefix + 'g1', 'Verbs', 'quiz')] } },
    } } },
    homework: hw([prefix + 'v1', prefix + 'v2', prefix + 'g1']),
  } } } } } } } };
}
const DOCS = { 'class/data_g4': gradeDoc('g4-'), 'class/data': gradeDoc('g3-') };
const ERIC = 'le12777@kcbs.tw', TAY = 'le13555@kcbs.tw';
let done = {};                                       // email → {progressKey:true}
let aiMode = 'ok', aiAnswer = null;
const calls = [];
const sent = { reply: [], push: [], multicast: [], loading: [] };
globalThis.fetch = async (url, opts) => {
  const u = String(url); calls.push(u);
  if (u.includes('oauth2')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
  if (u.includes('alan-ai-proxy')) {
    if (aiMode === 'down') return new Response('{"error":"overloaded"}', { status: 529 });
    if (aiMode === 'slow') await new Promise((res, rej) => { const t = setTimeout(res, 300);
      opts.signal && opts.signal.addEventListener('abort', () => { clearTimeout(t); rej(Object.assign(new Error('aborted'), { name: 'AbortError' })); }); });
    return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(aiAnswer) }] }), { status: 200 });
  }
  const pdoc = (em) => ({ fields: { email: S(em), items: { mapValue: { fields: Object.fromEntries(Object.keys(done[em] || {}).map((k) => [k, { mapValue: { fields: { done: { booleanValue: true } } } }])) } } } });
  if (u.includes('/documents/progress?')) return new Response(JSON.stringify({ documents: [
    Object.assign({ name: 'projects/p/databases/(default)/documents/progress/uidE' }, pdoc(ERIC)),
    Object.assign({ name: 'projects/p/databases/(default)/documents/progress/uidT' }, pdoc(TAY)) ] }), { status: 200 });
  if (u.includes('/documents/progress/uidE')) return new Response(JSON.stringify(pdoc(ERIC)), { status: 200 });
  if (u.includes('/documents/progress/uidT')) return new Response(JSON.stringify(pdoc(TAY)), { status: 200 });
  if (u.includes('/documents/roster')) return new Response(JSON.stringify({ documents: [] }), { status: 200 });
  const m = u.match(/\/documents\/(class\/[A-Za-z0-9_]+)/);
  if (m) return new Response(JSON.stringify(DOCS[m[1]] || {}), { status: 200 });
  const b = opts && opts.body ? JSON.parse(opts.body) : {};
  if (u.includes('/chat/loading')) { sent.loading.push(b); return new Response('{}', { status: 202 }); }
  if (u.includes('/message/reply')) { sent.reply.push(b); return new Response('{}', { status: 200 }); }
  if (u.includes('/message/push')) { sent.push.push(b); return new Response('{}', { status: 200 }); }
  if (u.includes('/message/multicast')) { sent.multicast.push(b); return new Response('{}', { status: 200 }); }
  return new Response('{}', { status: 200 });
};
const rI = crypto.webcrypto.subtle.importKey.bind(crypto.webcrypto.subtle);
globalThis.crypto.subtle.importKey = async (f, d, a, e, u) => (a && a.name === 'RSASSA-PKCS1-v1_5') ? rI('raw', new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']) : rI(f, d, a, e, u);
const rS = crypto.webcrypto.subtle.sign.bind(crypto.webcrypto.subtle);
globalThis.crypto.subtle.sign = async (a, k, d) => rS(a === 'RSASSA-PKCS1-v1_5' ? 'HMAC' : a, k, d);

const ROSTER = [{ email: ERIC, name: 'Eric', grade: 'g4' }, { email: TAY, name: 'Tayler', grade: 'g3' }, { email: 'le12888@kcbs.tw', name: 'Nick', grade: 'g4' }];
const BOTH = [{ email: ERIC, name: 'Eric', grade: 'g4' }, { email: TAY, name: 'Tayler', grade: 'g3' }];
function makeEnv(links, extra) {
  const st = new Map([['roster', JSON.stringify(ROSTER)]]);
  if (links) st.set('links', JSON.stringify(links));
  return Object.assign({ LINE_TOKEN: 't', LINE_SECRET: 'sec', ADMIN_PASS: 'pw', FIREBASE_SA: JSON.stringify({ project_id: 'p', client_email: 'x', private_key: 'AAAA' }),
    LINKS: { get: async (k) => (st.has(k) ? st.get(k) : null), put: async (k, v) => void st.set(k, v) }, _s: st }, extra || {});
}
const reset = () => { calls.length = 0; for (const k of Object.keys(sent)) sent[k].length = 0; aiMode = 'ok'; aiAnswer = null; done = {}; };
const aiCalls = () => calls.filter((u) => u.includes('alan-ai-proxy')).length;
const say = (env, text, hooks) => W.handleMessage(env, 'Uc', text, hooks || {});

// ═══ 1. 更聰明：看得懂家長的話 ═══
log.push('\n【1】看不懂的話交給 AI；選單按鈕／名字不用等 AI');
{
  reset();
  const env = makeEnv({ Uc: BOTH });
  for (const t of ['作業', '查詢作業', '孩子', '練習', '刪除 Tayler', '新增 Tayler', '說明']) {
    const e2 = makeEnv({ Uc: BOTH });
    const before = aiCalls();
    const h = {};
    await say(e2, t, h);
    ok(`「${t}」→ 走快速路徑，不問 AI`, aiCalls() === before && h.path === 'fast', h.path);
  }
  const envN = makeEnv({});
  const hN = {};
  const rN = await say(envN, 'Eric & Tayler', hN);
  ok('整句就是名字（Eric & Tayler）→ 直接綁定，不問 AI', aiCalls() === 0 && String(rN).includes('已綁定'), rN);

  reset();
  const h0 = {};
  const r0 = await say(env, '請問Tayler文法寫完了嗎', h0);
  ok('⭐ （v427）「請問Tayler文法寫完了嗎」關鍵字就看得懂 → 不必問 AI，直接挑出 Tayler＋文法', aiCalls() === 0 && r0.hw.length === 1 && r0.hw[0].name === 'Tayler' && r0.cat === 'grammar' && h0.path === 'fast', JSON.stringify({ r0, path: h0.path }));
  reset();
  aiAnswer = { intent: 'homework', child: 'Tayler', cat: 'grammar' };
  const h = {};
  const r = await say(env, 'Tayler那個還有幾項沒交', h);
  ok('⭐ 關鍵字抓不到的（「Tayler那個還有幾項沒交」）→ 問 AI 一次，挑出 Tayler＋文法', aiCalls() === 1 && r.hw.length === 1 && r.hw[0].name === 'Tayler' && r.cat === 'grammar', JSON.stringify(r));
  ok('路徑記成 ai:homework', h.path === 'ai:homework' && typeof h.aiMs === 'number', h.path);

  reset();
  aiAnswer = { intent: 'homework', child: 'Nick', cat: null };           // AI 講了一個沒綁的名字
  const r2 = await say(env, 'Nick寫完了嗎', {});
  ok('⭐ AI 講了沒綁定的孩子 → 不編造，改回這個 LINE 綁的全部孩子', r2.hw.length === 2, JSON.stringify(r2));

  reset();
  aiAnswer = { intent: 'remove', child: 'Tayler', cat: null };
  const envR = makeEnv({ Uc: BOTH });
  const r3 = await say(envR, '我不想再收Tayler的通知了', {});
  ok('⭐ 「我不想再收Tayler的通知了」→ 真的刪掉 Tayler（由程式執行，不是 AI）',
     String(r3).includes('已刪除 Tayler') && JSON.parse(envR._s.get('links')).Uc.length === 1, r3);

  reset();
  aiAnswer = { intent: 'add', child: 'Ghost', cat: null };
  const r4 = await say(makeEnv({ Uc: [BOTH[0]] }), '幫我加小孩Ghost', {});
  ok('⭐ AI 說要加一個名單上沒有的名字 → 照規則說找不到，不會亂綁', String(r4).includes('找不到'), r4);

  reset();
  aiAnswer = { intent: 'add', child: 'Tayler', cat: null };
  const envU = makeEnv({});
  const r5 = await say(envU, '我女兒叫Tayler', {});
  ok('⭐ 還沒綁定的家長說「我女兒叫Tayler」→ 看得懂，直接綁好', String(r5).includes('已綁定 Tayler') && JSON.parse(envU._s.get('links')).Uc.length === 1, r5);
}

// ═══ 2. AI 聊天 ═══
log.push('\n【2】聊天：像人一樣回、每次都回、不亂發連結');
{
  reset();
  const env = makeEnv({ Uc: BOTH });
  aiAnswer = { intent: 'chat', reply: '哈哈謝謝你 😊 詳情 https://evil.example/x' };
  const r = await say(env, '老師好帥', {});
  ok('⭐ 用 AI 寫的話回覆（不是固定那六句）', String(r).startsWith('哈哈謝謝你'), r);
  ok('⭐ AI 的回話裡網址被拿掉', !/https?:/.test(r), r);
  const r2 = await say(env, '大概兩天', {});
  ok('（v427）再聊一句 → 照樣回（Alan：不用防洗版）', String(r2).startsWith('哈哈謝謝你'), JSON.stringify(r2));
  aiAnswer = { intent: 'homework', child: null, cat: null };
  const r3 = await say(env, '那他這週還剩什麼', {});
  ok('但中間問作業還是會回', !!(r3 && r3.hw), JSON.stringify(r3));
}

// ═══ 3. AI 掛掉也不能停擺 ═══
log.push('\n【3】AI 出問題 → 自動退回原本的規則');
{
  reset(); aiMode = 'down';
  const h = {};
  const r = await say(makeEnv({ Uc: BOTH }), '你好', h);
  ok('⭐ AI 回 529（太忙）→ 退回規則，照樣客氣回一句', W.POLITE.indexOf(r) >= 0 && h.path === 'rules', JSON.stringify({ r, path: h.path }));
  reset(); aiMode = 'slow';
  const t0 = Date.now();
  const h2 = {};
  const r2 = await say(makeEnv({ Uc: BOTH }, { AI_TIMEOUT_MS: 50 }), '你好', h2);
  ok('⭐ AI 太慢 → 時間到就放棄，退回規則（家長不會一直等）', Date.now() - t0 < 250 && h2.path === 'rules' && W.POLITE.indexOf(r2) >= 0, (Date.now() - t0) + 'ms ' + h2.path);
  reset(); aiAnswer = { intent: 'not-a-thing', child: 'x' };
  const h3 = {};
  await say(makeEnv({ Uc: BOTH }), '你好', h3);
  ok('AI 回了看不懂的格式 → 也退回規則', h3.path === 'rules', h3.path);
  reset();
  const h4 = {};
  await say(makeEnv({ Uc: BOTH }, { AI_CHAT: 'off' }), '你好', h4);
  ok('AI_CHAT=off → 完全不問 AI（隨時可以關掉）', aiCalls() === 0 && h4.path === 'rules');
}

// ═══ 3b. 綁滿 2 位的家長隨便打字（v423 起就壞了的 bug）═══
log.push('\n【3b】綁了 2 位孩子的家長打「你好」，不能回「已經綁定 2 位孩子了」');
{
  for (const t of ['你好', '謝謝老師', 'ㄏㄏ']) {
    reset(); aiMode = 'down';                              // 走規則那條路（AI 正常時本來就不會到這）
    const r = await W.handleNameBinding(makeEnv({ Uc: BOTH }), 'Uc', t);
    ok(`「${t}」→ 客氣回一句，不是「已經綁定 2 位」`, W.POLITE.indexOf(r) >= 0 && !String(r).includes('已經綁定 2 位'), r);
  }
  reset();
  const r = await W.handleNameBinding(makeEnv({ Uc: BOTH }), 'Uc', 'Nick');
  ok('真的要加第三位（Nick）→ 才說已經綁滿，並教他怎麼換', String(r).includes('已經綁定 2 位') && String(r).includes('刪除 Eric'), r);
  const r2 = await W.handleNameBinding(makeEnv({ Uc: BOTH }), 'Uc', 'Eric');
  ok('打已經綁的孩子（Eric）→ 說之前就綁好了，不是「已綁滿」', String(r2).includes('之前就綁好了'), r2);
}

// ═══ 4. 查某一類 → 先直接回答 ═══
log.push('\n【4】「Tayler 文法寫完了嗎」→ 先一句話回答，再給卡片');
{
  reset();
  const msgs = await W.hwReplyMessages(makeEnv({ Uc: BOTH }), [BOTH[1]], { cat: 'grammar' });
  ok('第一則是直接回答', msgs[0].type === 'text' && /Tayler 的文法：本週還有 1 項/.test(msgs[0].text), JSON.stringify(msgs[0]));
  ok('第二則是作業卡', msgs[1] && msgs[1].type === 'flex');
  reset();
  done[TAY] = { 'g3-W_g3-g1': true };
  const msgs2 = await W.hwReplyMessages(makeEnv({ Uc: BOTH }), [BOTH[1]], { cat: 'grammar' });
  ok('做完了 → 直接說「都完成了」', /Tayler 的文法都完成了/.test(msgs2[0].text), msgs2[0].text);
}

// ═══ 5. 更快 ═══
log.push('\n【5】速度：快取、只讀需要的、背景更新');
{
  reset();
  W.MEM.hw = {};
  const env = makeEnv({ Uc: BOTH });
  await W.queryHomework(env, BOTH);
  const n1 = calls.filter((u) => /documents\/class\/data/.test(u)).length;
  ok('第一次：兩個年級的課程各讀一次', n1 === 2, n1);
  calls.length = 0;
  await W.queryHomework(env, BOTH);
  ok('⭐ 再查一次：課程文件一份都不用再下載（快取）', calls.filter((u) => /documents\/class\/data/.test(u)).length === 0, calls.join('\n'));
  ok('⭐ 進度只讀這兩個孩子的，不再整批下載全班', calls.some((u) => u.includes('/progress/uidE')) && !calls.some((u) => u.includes('/documents/progress?')), calls.filter((u) => u.includes('progress')).join('\n'));

  // 快取過期（但 12 小時內）→ 先用舊的回，背景再抓
  W.MEM.hw = {};
  const c = JSON.parse(env._s.get('hwc:g4')); c.ts = Date.now() - W.HW_TTL_MS - 1000; env._s.set('hwc:g4', JSON.stringify(c));
  const c3 = JSON.parse(env._s.get('hwc:g3')); c3.ts = Date.now() - W.HW_TTL_MS - 1000; env._s.set('hwc:g3', JSON.stringify(c3));
  calls.length = 0;
  const list = await W.queryHomework(env, BOTH);
  ok('⭐ 快取有點舊 → 照樣立刻回（不等 Firestore）', list.length === 2 && calls.filter((u) => /documents\/class\/data/.test(u)).length <= 2);
  await W.flushBg();
  ok('回覆之後在背景把快取更新', JSON.parse(env._s.get('hwc:g4')).ts > c.ts);

  // 名單同理
  W.MEM.roster = null;
  const envR = makeEnv({ Uc: BOTH });
  envR._s.set('roster_live', JSON.stringify({ ts: Date.now() - 3600 * 1000, list: ROSTER }));
  calls.length = 0;
  const rs = await W.getRoster(envR);
  ok('⭐ 名單過期 → 先用舊的（新增／刪除不用等 Firestore）', rs.length === 3 && !calls.some((u) => u.includes('/documents/roster')));
  await W.flushBg();
  ok('名單在背景更新', calls.some((u) => u.includes('/documents/roster')));
}

// ═══ 6. 「輸入中…」 ═══
log.push('\n【6】要花時間的回覆，先讓家長看到「輸入中…」');
{
  const run = async (text, env) => {
    const raw = JSON.stringify({ events: [{ type: 'message', replyToken: 'rt', source: { userId: 'Uc' }, message: { type: 'text', text } }] });
    const sig = crypto.createHmac('sha256', 'sec').update(raw).digest('base64');
    const pend = [];
    await W.default.fetch(new Request('https://w/webhook', { method: 'POST', body: raw, headers: { 'x-line-signature': sig } }), env, { waitUntil: (p) => pend.push(p) });
    await Promise.all(pend);
  };
  reset();
  await run('作業', makeEnv({ Uc: BOTH }));
  ok('⭐ 「作業」→ 先顯示輸入中，再回卡片', sent.loading.length === 1 && sent.loading[0].chatId === 'Uc' && sent.reply.length === 1);
  reset();
  await run('刪除 Tayler', makeEnv({ Uc: BOTH }));
  ok('「刪除 Tayler」本來就很快 → 不顯示輸入中', sent.loading.length === 0 && sent.reply.length === 1);
  reset(); aiAnswer = { intent: 'chat', reply: '謝謝您 😊' };
  const envD = makeEnv({ Uc: BOTH });
  await run('謝謝老師', envD);
  ok('AI 的路 → 顯示輸入中', sent.loading.length === 1);
  const d = JSON.parse(envD._s.get('diag'))[0];
  ok('診斷紀錄寫得出走哪條路、AI 花多久', d.path === 'ai:chat' && typeof d.aiMs === 'number', JSON.stringify(d));
}

// ═══ 7. 主動提醒：挑對象 ═══
log.push('\n【7】主動提醒：年級／個別孩子');
{
  reset();
  const links = { U1: [BOTH[0]], U2: [BOTH[1]], U3: [BOTH[0]] };        // Eric 有兩個家長 LINE
  const env = makeEnv(links);
  const Rg = await W.manualSend(env, { target: { type: 'grade', grade: 'g3' } }, true);
  ok('只挑 G3 → 只有 Tayler', Rg.sends.length === 1 && Rg.sends[0].name === 'Tayler', JSON.stringify(Rg.sends.map((x) => x.name)));
  const Rs = await W.manualSend(env, { target: { type: 'students', emails: [ERIC, 'le12888@kcbs.tw'] } }, false);
  ok('挑 Eric＋Nick → Eric 發給他兩個家長的 LINE', Rs.sends.length === 1 && sent.multicast[0].to.sort().join() === 'U1,U3', JSON.stringify(sent.multicast.map((x) => x.to)));
  ok('⭐ Nick 還沒綁定 → 清楚列出來，老師知道他收不到', Rs.noBind.join() === 'le12888@kcbs.tw', JSON.stringify(Rs.noBind));
  done[TAY] = { 'g3-W_g3-v1': true, 'g3-W_g3-v2': true, 'g3-W_g3-g1': true };
  const Rd = await W.manualSend(env, { target: { type: 'grade', grade: 'g3' } }, true);
  ok('Tayler 都做完了 → 不發，列在「都做完了」', Rd.sends.length === 0 && Rd.skippedDone.join() === 'Tayler', JSON.stringify(Rd));
  const Rl = await W.manualSend(env, { target: { type: 'all' }, note: 'x'.repeat(500) }, true);
  ok('老師的話最多 200 字', Rl.note.length === 200);
  const bad = await W.default.fetch(new Request('https://w/manual', { method: 'POST', body: '{}' }), env, {});
  ok('沒密碼不能用 /manual', bad.status === 401);
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
