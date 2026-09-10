/*
 * Alan's English Class — LINE 通知 Worker（v4：綁定對話流程正式版，可綁 2 位孩子）
 * ────────────────────────────────────────────────────────────
 * 獨立 Worker。負責：發公告 + 家長自助綁定 + 作業沒完成自動提醒。
 *
 * ▍需要的環境變數 / 綁定
 *   Secret  LINE_TOKEN    = Channel access token
 *   Secret  LINE_SECRET   = Channel secret（驗 webhook）
 *   Secret  ADMIN_PASS    = 管理密碼
 *   Secret  FIREBASE_SA   = Firebase 服務帳號 JSON 整包（功能B 讀進度用）
 *   KV      LINKS         = Workers KV，變數名稱【 LINKS 】
 *   Cron    0 10 * * *    = 每天 UTC 10:00 = 台灣 18:00（Settings → Triggers）
 *
 * ▍路由
 *   GET  /                健康檢查
 *   POST /broadcast       {text}
 *   POST /push            {target:{type,grade?,emails?}, text}
 *   POST /webhook         LINE 事件（綁定）
 *   POST /sync-roster     {roster}
 *   GET  /links
 *   POST /unlink          {lineUserId, email?}
 *   POST /run-reminders   （?dry=1 只預覽不發送）功能B 手動試跑
 */

const LINE_API = 'https://api.line.me';

// ── 通用 helpers ─────────────────────────────────────────
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-pass',
    'Access-Control-Max-Age': '86400',
  };
}
function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}
const enc = (s) => new TextEncoder().encode(s);
const norm = (s) => String(s || '').replace(/\s+/g, '').trim();
const gradeLabel = (g) => (g ? String(g).toUpperCase() : '');

async function verifyLineSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey('raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc(rawBody));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return b64 === signature;
}
async function lineReply(replyToken, text, token) {
  return fetch(LINE_API + '/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  });
}
// v421：純文字的 LINE 訊息不能粗體也不能上色——要醒目就得用 Flex Message。
// 送失敗（Flex 被拒）時自動退回純文字，家長不會漏收。
async function lineReplyMessages(replyToken, messages, token) {
  if (!messages || !messages.length) return;
  return fetch(LINE_API + '/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) }),
  });
}
async function lineMulticastFlex(to, altText, bubble, fallbackText, token) {
  const errors = [];
  for (let i = 0; i < to.length; i += 500) {
    const batch = to.slice(i, i + 500);
    const send = (messages) => fetch(LINE_API + '/v2/bot/message/multicast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ to: batch, messages }),
    });
    let res = await send([{ type: 'flex', altText: altText.slice(0, 390), contents: bubble }]);
    if (!res.ok) {
      const why = await res.text().catch(() => '');
      errors.push('flex ' + res.status + ':' + why.slice(0, 200));
      res = await send([{ type: 'text', text: fallbackText }]);   // 退回純文字
      if (!res.ok) errors.push('text ' + res.status + ':' + (await res.text().catch(() => '')).slice(0, 200));
    }
  }
  return errors;
}
async function lineMulticast(to, text, token) {
  const errors = [];
  for (let i = 0; i < to.length; i += 500) {
    const batch = to.slice(i, i + 500);
    const res = await fetch(LINE_API + '/v2/bot/message/multicast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ to: batch, messages: [{ type: 'text', text }] }),
    });
    if (!res.ok) errors.push(res.status + ':' + (await res.text().catch(() => '')));
  }
  return errors;
}

// ── 綁定（功能地基）───────────────────────────────────────
// v418：正式上線版的綁定對話流程
//   ① 加好友 → 官方帳號的歡迎訊息之後，再問一次孩子的名字
//   ② 一個 LINE 可以綁「最多 2 位」孩子（Eric & Tayler 這種家庭）
//   ③ 名單若全是英文名（康橋帳號綁英文名）→ 訊息會註明「請用英文名字」
const MAX_CHILDREN = 2;                       // 一個 LINE 最多綁幾位孩子
const ROSTER_TTL_MS = 10 * 60 * 1000;         // 即時名單快取 10 分鐘

// 比對用的鍵：忽略大小寫、空白與標點（Eric Chen / eric-chen / ERIC CHEN 都一樣）
const nkey = (s) => String(s || '').toLowerCase().replace(/[\s.'’\-_]/g, '').trim();
const hasCJK = (s) => /[㐀-鿿豈-﫿]/.test(String(s || ''));
const isEnglishName = (s) => /^[A-Za-z][A-Za-z .'’\-]*$/.test(String(s || '').trim());

// 名單來源：優先用服務帳號即時讀 Firestore（老師剛加的學生馬上能綁），
// 讀不到才退回老師後台同步過的 KV 名單。
async function getRoster(env) {
  if (env.FIREBASE_SA && env.LINKS) {
    try {
      const cached = JSON.parse((await env.LINKS.get('roster_live')) || 'null');
      if (cached && cached.ts && Date.now() - cached.ts < ROSTER_TTL_MS && Array.isArray(cached.list) && cached.list.length) {
        return cached.list;
      }
      const sa = JSON.parse(env.FIREBASE_SA);
      const token = await getAccessTokenCached(env, sa);
      if (token) {
        const docs = await firestoreList(sa.project_id, token, 'roster');
        const list = docs.map((d) => {
          const f = d.fields || {};
          return {
            email: String(d.name || '').split('/').pop(),
            name: fsVal(f.name) || '',
            grade: fsVal(f.grade) || '',
            active: f.active ? fsVal(f.active) : undefined,
          };
        }).filter((s) => s.email && s.name);
        if (list.length) {
          await env.LINKS.put('roster_live', JSON.stringify({ ts: Date.now(), list }));
          return list;
        }
      }
    } catch (e) { /* 讀不到就用 KV 名單 */ }
  }
  try { return JSON.parse((await env.LINKS.get('roster')) || '[]'); } catch (e) { return []; }
}

const activeRoster = (roster) => (roster || []).filter((s) => s && s.name && s.active !== false);

// 名單是不是「全部都是英文名字」→ 決定訊息要不要註明「請用英文名字」
function rosterAllEnglish(roster) {
  const act = activeRoster(roster);
  return act.length > 0 && act.every((s) => isEnglishName(s.name));
}

// 對話狀態（只用來記「問過第二位孩子了沒」，資料本體仍在 links）
async function getStage(env, uid) {
  try { return ((JSON.parse((await env.LINKS.get('chatstate')) || '{}'))[uid] || {}).stage || ''; }
  catch (e) { return ''; }
}
async function getStageTs(env, uid) {
  try { return ((JSON.parse((await env.LINKS.get('chatstate')) || '{}'))[uid] || {}).ts || 0; }
  catch (e) { return 0; }
}
async function setStage(env, uid, stage) {
  let m = {};
  try { m = JSON.parse((await env.LINKS.get('chatstate')) || '{}'); } catch (e) {}
  if (stage) m[uid] = { stage, ts: Date.now() }; else delete m[uid];
  await env.LINKS.put('chatstate', JSON.stringify(m));
}

// 家長輸入的一句話 → 拆成 1~N 個名字（Eric & Tayler / Eric,Tayler / Eric 和 Tayler）
function splitNames(text) {
  const t = String(text || '').replace(/[。！!？?]+$/g, '').trim();
  const parts = t.split(/\s*(?:&|＆|,|，|、|\+|\/|and|及|和|跟|還有)\s*/i)
    .map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : (t ? [t] : []);
}

// 單一名字 → 名單比對。回傳 {hit} / {many} / {none}
function matchOne(roster, raw) {
  const k = nkey(raw);
  if (!k) return { none: true };
  const act = activeRoster(roster);
  const exact = act.filter((s) => nkey(s.name) === k);
  if (exact.length === 1) return { hit: exact[0] };
  if (exact.length > 1) return { many: exact };
  // 名單寫「Eric Chen」、家長只打「Eric」
  const first = act.filter((s) => nkey(String(s.name).trim().split(/\s+/)[0]) === k);
  if (first.length === 1) return { hit: first[0] };
  if (first.length > 1) return { many: first };
  // 開頭吻合（至少 3 個字元才允許，避免 "a" 亂中）
  if (k.length >= 3) {
    const pre = act.filter((s) => nkey(s.name).startsWith(k));
    if (pre.length === 1) return { hit: pre[0] };
    if (pre.length > 1) return { many: pre };
  }
  return { none: true };
}

// 整句 → 名字清單。若整句配不到、但用空白拆開後兩段各自配得到 → 當成兩個名字
function parseNames(roster, text) {
  const direct = splitNames(text);
  if (direct.length > 1) return direct;
  const one = direct[0] || '';
  if (matchOne(roster, one).none) {
    const toks = one.split(/\s+/).filter(Boolean);
    if (toks.length === 2) {
      const a = matchOne(roster, toks[0]), b = matchOne(roster, toks[1]);
      if (a.hit && b.hit && a.hit.email !== b.hit.email) return toks;
    }
  }
  return direct;
}

const NEG_RE = /^(沒有|沒|無|不用|不用了|不需要|no|nope|n|只有一位|只有一個|一位|一個|1|完成|好了|沒有了|就這樣|結束)$/i;
const ASK_RE = /^(查詢|查詢綁定|綁定|綁定狀態|狀態|status|查|list|\?|？)$/i;

const fmtChild = (x) => `${x.name}${x.grade ? '（' + gradeLabel(x.grade) + '）' : ''}`;
const listChildren = (arr) => (arr || []).map((x) => '・' + fmtChild(x)).join('\n');

// v419：舉例用的名字不能是真的學生（Alan：「不要用 Eric Tayler 當作舉例」）。
// 從這一池挑兩個「名單裡沒有的」名字，所以永遠不會撞到班上的孩子。
const EX_POOL_EN = ['Emma', 'Ryan', 'Olivia', 'Ethan', 'Chloe', 'Daniel', 'Hannah', 'Jason', 'Sophia', 'Brian'];
const EX_POOL_ZH = ['小明', '小美', '小華', '小安'];
function exampleNames(roster, english) {
  const taken = new Set(activeRoster(roster).map((st) => nkey(st.name)));
  const pool = (english ? EX_POOL_EN : EX_POOL_ZH).filter((n) => !taken.has(nkey(n)));
  const a = pool[0] || (english ? 'Emma' : '小明');
  const b = pool[1] || (english ? 'Ryan' : '小美');
  return { one: a, two: a + ' & ' + b };
}

function askNameLine(english, ex) {
  return english
    ? `請直接回覆孩子的英文名字（康橋帳號上的那個英文名字，例如：${ex.one}）。\n大小寫、空格都沒關係 👌`
    : `請直接回覆孩子的姓名（例如：${ex.one}）。`;
}
// 加好友後的第一則訊息：問候 → 說明這裡會做什麼 → 才請家長輸入名字
function welcomeText(english, ex, displayName) {
  const hi = displayName ? `${displayName} 您好，歡迎加入 Alan's English Class 👋` : "歡迎加入 Alan's English Class 👋";
  return (
    hi + '\n\n' +
    '這裡會發班級通知，也會提醒孩子還沒完成的作業。\n' +
    '開始之前，先讓我把您和孩子的帳號連起來 🔗\n\n' +
    askNameLine(english, ex) + '\n\n' +
    `有兩位孩子的話，可以一次輸入，例如：\n${ex.two}\n\n` +
    '連好之後，通知就會傳到這裡 📩'
  );
}
function doneText(children, english) {
  return (
    '綁定完成 🎉\n\n目前這個 LINE 已綁定：\n' + listChildren(children) + '\n\n' +
    '之後班級通知與作業提醒都會傳到這裡 📩\n' +
    '隨時輸入「作業」就能查孩子還有哪些沒完成 📚\n' +
    `（要再新增孩子，隨時回覆他的${english ? '英文名字' : '姓名'}就可以；一個 LINE 最多 ${MAX_CHILDREN} 位）`
  );
}

// 家長的 LINE 顯示名稱（拿不到就算了，訊息照樣通順）
async function lineDisplayName(env, lineUserId) {
  try {
    const res = await fetch(LINE_API + '/v2/bot/profile/' + encodeURIComponent(lineUserId), {
      headers: { Authorization: 'Bearer ' + env.LINE_TOKEN },
    });
    if (!res.ok) return '';
    const p = await res.json();
    return String((p && p.displayName) || '').trim().slice(0, 30);
  } catch (e) { return ''; }
}

// 加好友時的整則歡迎（問候 ＋ 請家長輸入孩子名字，一則講完）
async function welcomeMessage(env, lineUserId) {
  let roster = [];
  try { roster = await getRoster(env); } catch (e) {}
  const english = rosterAllEnglish(roster);
  const ex = exampleNames(roster, english);
  const who = lineUserId && env.LINE_TOKEN ? await lineDisplayName(env, lineUserId) : '';
  return welcomeText(english, ex, who);
}

// v422：Alan「不管我問什麼他都會回答綁定學生的訊息…怕小朋友亂問問題」
// → 先走固定指令；其餘只有「還沒綁」或「真的是名單上的名字」才進綁定流程。
const CMD = {
  hw:    /^(作業|查作業|我的作業|功課|進度|查進度|homework|hw)$/i,
  bind:  /^(查詢|查詢綁定|綁定|綁定狀態|我的孩子|狀態|status|查|list)$/i,
  site:  /^(網站|連結|練習|打開練習|登入|網址|link|site)$/i,
  class: /^(課表|上課|上課時間|時間|schedule)$/i,
  human: /^(老師|聯絡老師|找老師|請假|我要問問題|問問題|客服|人工)$/i,
  help:  /^(說明|幫助|選單|功能|help|menu|\?|？)$/i,
};
const HUMAN_MS = 60 * 60 * 1000;         // 轉人工後安靜一小時，讓家長好好打字

function helpText() {
  return (
    '這個帳號是自動回覆的小幫手 🤖\n可以直接輸入下面的字（或用下方選單）：\n\n' +
    '📚「作業」－ 看孩子還有哪些沒完成\n' +
    '🔗「綁定」－ 看這個 LINE 綁了誰\n' +
    '💻「網站」－ 拿到練習網站的連結\n' +
    '🕐「課表」－ 上課時間\n' +
    '🙋「老師」－ 有事情要問 Alan 老師'
  );
}
const CLASS_TEXT =
  '🕐 上課時間\n\n' +
  '上課時間與請假請直接跟 Alan 老師確認。\n輸入「老師」我就不再自動回覆，您可以直接留言，老師看到會親自回覆 🙏';
const HUMAN_TEXT =
  '好的，接下來這一小時我不會自動回覆 🤫\n\n' +
  '請直接在這裡留言（請假、進度、任何問題都可以），Alan 老師看到會親自回覆您。\n' +
  '※ 老師不一定能馬上看到，急事請用平常的聯絡方式 🙏';
const siteText = () => '💻 練習網站\n' + SITE_URL + '\n\n用孩子的學校帳號登入就可以開始練習 📚';

async function handleNameBinding(env, lineUserId, rawText) {
  const text = String(rawText || '').trim();
  const roster = await getRoster(env);
  const english = rosterAllEnglish(roster);
  const ex = exampleNames(roster, english);
  let links = {};
  try { links = JSON.parse((await env.LINKS.get('links')) || '{}'); } catch (e) {}
  const bound = links[lineUserId] || [];
  const stage = await getStage(env, lineUserId);

  // ── 固定指令（不管綁沒綁都能用）────────────────────────
  if (CMD.help.test(text)) return helpText();
  if (CMD.site.test(text)) return siteText();
  if (CMD.class.test(text)) return CLASS_TEXT;
  if (CMD.human.test(text)) { await setStage(env, lineUserId, 'human'); return HUMAN_TEXT; }
  if (CMD.hw.test(text)) return { hw: bound };            // 交給 webhook 現查（要讀 Firestore）

  // 已轉人工 → 一小時內安靜，讓家長好好打字給老師看
  if (stage === 'human') {
    const ts = await getStageTs(env, lineUserId);
    if (Date.now() - ts < HUMAN_MS) return '';
  }

  // 名單還沒就緒
  if (!activeRoster(roster).length) return '系統名單尚未就緒，請稍後再試，或直接聯絡 Alan 老師 🙏';

  // 「查詢」
  if (ASK_RE.test(text) || CMD.bind.test(text)) {
    if (!bound.length) return '這個 LINE 還沒有綁定任何孩子 🙌\n\n' + askNameLine(english, ex);
    return '目前這個 LINE 已綁定：\n' + listChildren(bound) +
      (bound.length < MAX_CHILDREN ? `\n\n要再新增孩子，直接回覆他的${english ? '英文名字' : '姓名'}就可以 👌` : '');
  }

  // 問「還有第二位嗎」→ 回答「沒有」
  if (stage === 'ask2' && NEG_RE.test(text)) {
    await setStage(env, lineUserId, 'done');
    return doneText(bound, english);
  }

  // 已經綁滿
  if (bound.length >= MAX_CHILDREN) {
    return `這個 LINE 已經綁定 ${MAX_CHILDREN} 位孩子了：\n` + listChildren(bound) +
      '\n\n還要新增其他孩子的話，請直接聯絡 Alan 老師 🙏';
  }

  const names = parseNames(roster, text);
  if (!names.length) return askNameLine(english, ex);

  const added = [], dup = [], bad = [], amb = [], over = [];
  const cur = bound.slice();
  for (const nm of names) {
    if (cur.length >= MAX_CHILDREN) { over.push(nm); continue; }
    const r = matchOne(roster, nm);
    if (r.hit) {
      if (cur.some((x) => String(x.email).toLowerCase() === String(r.hit.email).toLowerCase())) { dup.push(r.hit); continue; }
      const rec = { email: r.hit.email, name: r.hit.name, grade: r.hit.grade || '' };
      cur.push(rec); added.push(rec);
    } else if (r.many) { amb.push(nm); }
    else { bad.push(nm); }
  }

  if (added.length) {
    links[lineUserId] = cur;
    await env.LINKS.put('links', JSON.stringify(links));
  }

  // 完全沒配到
  if (!added.length && !dup.length) {
    if (amb.length) return `班上有多位「${amb[0]}」🤔\n請直接聯絡 Alan 老師協助綁定 🙏`;
    // 已經綁好的人隨口聊天／小朋友亂打 → 不要再回「找不到這位學生」，給選單就好
    if (bound.length) return '我看不懂這句話 🙇\n\n' + helpText();
    const who = bad[0] || text;
    if (english && hasCJK(who)) {
      return '我們的名單是用「英文名字」登記的 📝\n\n' + askNameLine(english, ex) + '\n\n找不到的話請直接聯絡 Alan 老師 🙏';
    }
    return `找不到「${who}」這位學生 🤔\n\n` +
      (english ? '請確認是康橋帳號上的英文名字（大小寫沒關係）。\n' : '請確認姓名與報名時一致。\n') +
      '還是不行的話，請直接聯絡 Alan 老師 🙏';
  }

  // 有配到 → 組回覆
  const lines = [];
  if (added.length) lines.push('✅ 已綁定 ' + added.map(fmtChild).join('、') + '！');
  if (dup.length) lines.push('👍 ' + dup.map(fmtChild).join('、') + ' 之前就綁好了。');
  if (amb.length) lines.push(`⚠️ 班上有多位「${amb[0]}」，請聯絡 Alan 老師協助。`);
  if (bad.length) lines.push(`⚠️ 找不到「${bad[0]}」，請確認${english ? '英文名字' : '姓名'}或聯絡 Alan 老師。`);
  if (over.length) lines.push(`⚠️ 一個 LINE 最多綁 ${MAX_CHILDREN} 位，「${over[0]}」請聯絡 Alan 老師協助。`);

  if (cur.length >= MAX_CHILDREN || bad.length || amb.length || over.length) {
    await setStage(env, lineUserId, 'done');
    return lines.join('\n') + '\n\n' + doneText(cur, english);
  }
  // 只綁到 1 位、還有空位 → 問第二位
  await setStage(env, lineUserId, 'ask2');
  return lines.join('\n') + '\n\n還有第二位孩子嗎？\n' +
    `有的話請直接回覆他的${english ? '英文名字' : '姓名'}；沒有的話回覆「沒有」就完成囉 🙌`;
}

// ── 功能B：Firebase 服務帳號 → 讀 Firestore ──────────────
function b64url(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urlStr(s) { return b64url(new TextEncoder().encode(s)); }

async function importPrivateKey(pem) {
  const body = String(pem || '')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

// v422：OAuth token 有效 1 小時，快取起來——家長按「查作業」時要即時回覆
async function getAccessTokenCached(env, sa) {
  try {
    const c = JSON.parse((await env.LINKS.get('gtoken')) || 'null');
    if (c && c.exp > Date.now() + 60000 && c.t) return c.t;
  } catch (e) {}
  const t = await getAccessToken(sa);
  if (t) { try { await env.LINKS.put('gtoken', JSON.stringify({ t, exp: Date.now() + 50 * 60000 })); } catch (e) {} }
  return t;
}
async function getAccessToken(sa) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSec,
    exp: nowSec + 3600,
  };
  const unsigned = b64urlStr(JSON.stringify(header)) + '.' + b64urlStr(JSON.stringify(claim));
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = unsigned + '.' + b64url(new Uint8Array(sig));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt,
  });
  const data = await res.json().catch(() => ({}));
  return data.access_token || null;
}

// Firestore REST 值 → 純 JS
function fsVal(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o = {}; const f = (v.mapValue && v.mapValue.fields) || {}; for (const k in f) o[k] = fsVal(f[k]); return o; }
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fsVal);
  return null;
}
async function firestoreGet(project, token, docPath) {
  const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  return res.ok ? res.json() : null;
}
async function firestoreList(project, token, collection) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${collection}?pageSize=300` + (pageToken ? '&pageToken=' + pageToken : '');
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) break;
    const data = await res.json();
    (data.documents || []).forEach((d) => docs.push(d));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// ── 功能B：日期工具 ──────────────────────────────────────
function taipeiToday() {
  const d = new Date(Date.now() + 8 * 3600 * 1000); // UTC+8
  return d.toISOString().slice(0, 10);
}
function dateDiffDays(a, b) { // a - b（天）
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000);
}
function fmtDate(s) { const p = String(s || '').split('-'); return p.length === 3 ? (Number(p[1]) + '/' + Number(p[2])) : s; }

// v419：作業提醒必須「照年級發」。
// 每個年級的課程各存一份文件（G3 是最早的那份，所以叫 class/data）。
// 以前只讀 class/data 一份、然後發給所有學生 → 只綁 G6 的家長也會收到 G1~G5 的作業。
const GRADE_DOCS = {
  g1: 'class/data_g1', g2: 'class/data_g2', g3: 'class/data',
  g4: 'class/data_g4', g5: 'class/data_g5', g6: 'class/data_g6',
};
// 學號 → 年級。跟網站 data.js 的 gradeFromEmail 同一套規則（學生看到哪一班的唯一依據）。
// ⚠️ 每年開學要 +1：2026 學年 base=16，2027 學年要改成 17。
const LE_GRADE_BASE = 16;
function gradeFromEmail(email) {
  const m = String(email || '').toLowerCase().match(/^le(\d{2})/);
  if (!m) return null;
  const g = LE_GRADE_BASE - parseInt(m[1], 10);
  return (g >= 1 && g <= 6) ? ('g' + g) : null;
}

// v420：題型的中文名。同一課會出一整組（字卡／選擇／拼字／填空／配對／短文填空），
// 家長看到六行一模一樣的標題會以為壞掉——所以訊息裡改成一課一行、後面列題型。
const TYPE_ZH = {
  flashcard: '單字卡', quiz: '選擇題', spelling: '拼字', fillblank: '填空', 'def-match': '配對',
  cloze: '短文填空', 'short-answer': '簡答', 'reading-skill': '閱讀技巧', 'guided-reading': '分段閱讀',
  'type-answer': '打字練習', 'circle-answer': '圈選', 'syllable-div': '音節切分', 'word-sort': '單字分類',
  'writing-practice': '手寫練習', essay: '寫作', 'story-mountain': '故事山', lesson: '教學卡', upload: '上傳作業',
};
// 題型與分類的固定排序——Firestore 的 map 沒有順序，不排的話每天的訊息長得都不一樣
const TYPE_ORDER = ['lesson', 'flashcard', 'quiz', 'spelling', 'fillblank', 'def-match', 'cloze',
  'word-sort', 'syllable-div', 'type-answer', 'circle-answer', 'reading-skill', 'guided-reading',
  'short-answer', 'writing-practice', 'essay', 'story-mountain', 'upload'];
const CAT_ORDER = ['vocab', 'word', 'grammar', 'reading'];
// v421：家長要看的是「哪一類作業還沒做」，不是一長串課名。
// 四大類的中文名各年級不一樣（跟 data-g*.js 的 CATEGORIES 對齊）。
const CAT_ZH = {
  g1: { vocab: '中師單字', word: '外師單字', grammar: '文法', reading: '閱讀理解' },
  g2: { vocab: '中師單字', word: '外師單字', grammar: '文法', reading: '閱讀理解' },
  g3: { vocab: '外師單字', word: '字根字首', grammar: '文法', reading: '閱讀理解' },
  g4: { vocab: '外師單字', word: '字彙學習', grammar: '文法', reading: '閱讀寫作' },
  g5: { vocab: '外師單字', word: '字彙學習', grammar: '文法', reading: '閱讀寫作' },
  g6: { vocab: '外師單字', word: '字彙學習', grammar: '文法', reading: '閱讀寫作' },
};
const catZh = (grade, cat) => ((CAT_ZH[grade] || CAT_ZH.g4)[cat] || '其他練習');
const idxIn = (arr, v) => { const i = arr.indexOf(v); return i < 0 ? 99 : i; };

// 從某個年級的課程文件整理出「有期限的作業」清單。
// v420：連「這份作業屬於哪一週」一起帶出來（startISO/endISO/label/archived），
// 因為要分「本週／前幾週沒完成／可以先預習」，光看 dueDate 分不出來
// （實際資料裡 Week 2 的單字作業 dueDate 還寫著 Week 1 的日期）。
function buildHomeworkList(cls) {
  const weeks = (cls && cls.weeks) || {};
  const out = [];
  for (const wid of Object.keys(weeks)) {
    const wk = weeks[wid] || {};
    const hw = wk.homework || {};
    const metaById = {};
    const items = wk.items || {};
    for (const cat of Object.keys(items)) {
      for (const it of (items[cat] || [])) {
        if (it && it.id) metaById[it.id] = { title: it.title || it.id, type: it.type || '', cat };
      }
    }
    for (const itemId of Object.keys(hw)) {
      const dd = hw[itemId] && hw[itemId].dueDate;
      if (!dd) continue;
      const m = metaById[itemId] || { title: itemId, type: '', cat: '' };
      out.push({
        wid, itemId, key: wid + '_' + itemId,
        title: String(m.title || '').trim() || itemId, type: m.type, cat: m.cat, dueDate: dd,
        wkLabel: wk.label || '', wkStart: wk.startISO || '', wkEnd: wk.endISO || '',
        archived: wk.archived === true,
      });
    }
  }
  // 固定排序：週次 → 分類（單字/字彙/文法/閱讀）→ 課名 → 題型
  out.sort((a, b) =>
    String(a.wkStart || a.wid).localeCompare(String(b.wkStart || b.wid)) ||
    idxIn(CAT_ORDER, a.cat) - idxIn(CAT_ORDER, b.cat) ||
    a.title.localeCompare(b.title) ||
    idxIn(TYPE_ORDER, a.type) - idxIn(TYPE_ORDER, b.type));
  return out;
}

// ── v420：把一堆作業排成家長看得懂的三區 ─────────────────
const OVERDUE_DAYS = 28;   // 「前幾週還沒完成」最多回溯 4 週，不然上學期的會全部冒出來
// 這一週的星期一（週次是週一～週日）
function mondayOf(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * 86400000).toISOString().slice(0, 10);
}
function addDays(iso, n) {
  return new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
}
// 同一課的不同題型併成一行（標題的「· 短文填空」這種尾巴要先拿掉才併得起來）
function groupByLesson(list) {
  const order = [], map = new Map();
  for (const hw of list) {
    const k = String(hw.title || '').split('·')[0].trim() || hw.title || hw.itemId;
    if (!map.has(k)) { map.set(k, []); order.push(k); }
    map.get(k).push(hw);
  }
  return order.map((k) => ({ title: k, items: map.get(k) }));
}
function lessonLine(g) {
  const seen = [];
  for (const it of g.items) if (seen.indexOf(it.type) < 0) seen.push(it.type);
  const types = seen.slice().sort((a, b) => idxIn(TYPE_ORDER, a) - idxIn(TYPE_ORDER, b))
    .map((t) => TYPE_ZH[t] || '').filter(Boolean);
  if (g.items.length === 1) return `• ${g.title}${types.length ? '（' + types[0] + '）' : ''}`;
  const tail = types.length ? types.join('・') : g.items.length + ' 項';
  return `• ${g.title}\n   ${tail}（${g.items.length} 項）`;
}

// v421/v422：一行只放「類別 + 幾項」。家長在手機上看 LINE，行一長就折行，越短越清楚。
// Alan：「如果是單字題目就不用像這樣 Feathers, Not just for flying - week2 …
//         可以改成 單字作業未完成（幾項）不然太亂了」
//        「為什麼只有當周練習有分類 前幾週 只是顯示其他練習 …幫我都統一」
// → 三區一律是【週次小標】＋【四大類各幾項】，長相完全一致。
function catRows(list, grade) {
  const by = {};
  list.forEach((hw) => { (by[hw.cat || 'other'] = by[hw.cat || 'other'] || []).push(hw); });
  return Object.keys(by)
    .sort((a, b) => idxIn(CAT_ORDER, a) - idxIn(CAT_ORDER, b))
    .map((c) => ({ label: catZh(grade, c), n: by[c].length }));
}
// [{head:'Week 1・8/31–9/6', rows:[{label:'外師單字', n:10}]}]，照週次先後排
function weekGroups(list, grade) {
  const by = {}, order = [];
  list.forEach((hw) => { if (!by[hw.wid]) { by[hw.wid] = []; order.push(hw.wid); } by[hw.wid].push(hw); });
  order.sort((a, b) => String(by[a][0].wkStart || '').localeCompare(String(by[b][0].wkStart || '')));
  return order.map((k) => {
    const arr = by[k], w0 = arr[0];
    const head = [wkTag(w0) || fmtDate(w0.dueDate), wkRange(w0)].filter(Boolean).join('・');
    return { head, rows: catRows(arr, grade) };
  });
}

const wkTag = (hw) => (hw.wkLabel ? hw.wkLabel.replace(/^Week\s*/i, 'Week ') : '');
// 一週的日期範圍寫成 9/7–9/13
function wkRange(hw) {
  if (!hw.wkStart || !hw.wkEnd) return '';
  return fmtDate(hw.wkStart) + '–' + fmtDate(hw.wkEnd);
}

// 一份作業要放進哪一區（每日提醒與「家長現查」共用）
function splitTodos(todos, doneItems, today, thisWeek, overdue, preview) {
  for (const hw of todos) {
    if (hw.archived) continue;                          // 封存的是上學期，不提醒
    if (isDone(doneItems, hw.wid, hw.itemId)) continue;
    if (hw.wkStart && hw.wkEnd) {
      // 有週次日期就照週次分（最準：dueDate 有時候是舊的沒改到）
      if (today < hw.wkStart) preview.push(hw);
      else if (today > hw.wkEnd) { if (dateDiffDays(today, hw.wkEnd) <= OVERDUE_DAYS) overdue.push(hw); }
      else thisWeek.push(hw);
    } else {
      // 沒有週次日期 → 退回用 dueDate 判斷
      if (today > hw.dueDate) { if (dateDiffDays(today, hw.dueDate) <= OVERDUE_DAYS) overdue.push(hw); }
      else if (dateDiffDays(hw.dueDate, today) > 7) preview.push(hw);
      else thisWeek.push(hw);
    }
  }
}

// ── v421：Flex Message（LINE 唯一能粗體、能上色的訊息形式）────
const C_INK = '#1F2328', C_SUB = '#8A9099', C_LINE = '#E6E8EA';
const C_NOW = '#1B7A3E';   // 本週＝綠（要做）
const C_OLD = '#C62828';   // 前幾週沒完成＝紅（醒目）
const C_SOON = '#9AA0A6';  // 預習＝灰（不用急）
const SITE_URL = 'https://alan07050445-sys.github.io/Alan-s-English-Class/';
// 三個區塊的定義（標題／小字／顏色／摘要用的短名）——訊息、純文字、老師端預覽共用同一份
const SEC_DEF = [
  ['week',    '▍本週作業',       '',                 C_NOW,  '本週'],
  ['overdue', '▍前幾週還沒完成', '請盡快補完',       C_OLD,  '前幾週還沒完成'],
  ['preview', '▍可以先預習',     '還沒開始，不用急', C_SOON, '可先預習'],
];

function fxRow(row, color) {
  return {
    type: 'box', layout: 'horizontal', margin: 'sm', contents: [
      { type: 'text', text: row.label, size: 'sm', color: C_INK, flex: 1, wrap: true },
      { type: 'text', text: row.n + ' 項', size: 'sm', weight: 'bold', color, align: 'end', flex: 0 },
    ],
  };
}
function fxSection(title, note, groups, color, first) {
  const out = [];
  if (!first) out.push({ type: 'separator', margin: 'lg', color: C_LINE });
  const head = [{ type: 'text', text: title, size: 'sm', weight: 'bold', color }];
  if (note) head.push({ type: 'text', text: note, size: 'xxs', color: C_SUB, margin: 'xs' });
  out.push({ type: 'box', layout: 'vertical', margin: first ? 'none' : 'lg', contents: head });
  groups.forEach((g, gi) => {
    if (g.head) out.push({ type: 'text', text: g.head, size: 'xxs', color: C_SUB, margin: gi === 0 ? 'md' : 'lg', wrap: true });
    g.rows.forEach((r) => out.push(fxRow(r, color)));
  });
  return out;
}
// 三區 → 一顆 Flex 泡泡
function hwBubble(name, secs) {
  const body = [];
  let first = true;
  SEC_DEF.forEach(([k, title, note, color]) => {
    const gs = (secs[k] || {}).groups || [];
    if (!gs.length) return;
    body.push(...fxSection(title, typeof note === 'function' ? note(secs) : note, gs, color, first));
    first = false;
  });
  return {
    type: 'bubble', size: 'mega',
    header: {
      type: 'box', layout: 'vertical', paddingAll: '16px', paddingBottom: '12px',
      backgroundColor: '#F4F7F4',
      contents: [
        { type: 'text', text: '📚 作業提醒', size: 'xs', color: C_SUB },
        { type: 'text', text: name || '同學', size: 'lg', weight: 'bold', color: C_INK, wrap: true, margin: 'xs' },
      ],
    },
    body: { type: 'box', layout: 'vertical', paddingAll: '16px', paddingTop: '14px', contents: body },
    footer: {
      type: 'box', layout: 'vertical', paddingAll: '12px', paddingTop: 'none', contents: [
        { type: 'button', style: 'primary', height: 'sm', color: '#06C755',
          action: { type: 'uri', label: '打開練習', uri: SITE_URL } },
        { type: 'text', text: 'Alan 老師', size: 'xxs', color: C_SUB, align: 'center', margin: 'md' },
      ],
    },
  };
}
// 同一份內容的純文字版（Flex 送不出去時的退路，也給老師端預覽用）
function hwPlain(name, secs) {
  const out = [`📚 作業提醒 — ${name || ''}`];
  SEC_DEF.forEach(([k, title, note]) => {
    const gs = (secs[k] || {}).groups || [];
    if (!gs.length) return;
    const nt = typeof note === 'function' ? note(secs) : note;
    out.push('', title + (nt ? `（${nt}）` : ''));
    gs.forEach((g) => {
      if (g.head) out.push(`　${g.head}`);
      g.rows.forEach((r) => out.push(`　　${r.label}　${r.n} 項`));
    });
  });
  out.push('', SITE_URL, '— Alan 老師');
  return out.join('\n');
}
const secCount = (sec) => ((sec || {}).groups || []).reduce((a, g) => a + g.rows.reduce((b, r) => b + r.n, 0), 0);
// 通知列/舊版客戶端看到的一行摘要（LINE 上限 400 字）
function hwAlt(name, secs) {
  const bits = [];
  SEC_DEF.forEach(([k, , , , short]) => { const n = secCount(secs[k]); if (n) bits.push(short + ' ' + n + ' 項'); });
  return `📚 作業提醒 — ${name || ''}｜` + bits.join('、');
}

function isDone(items, wid, itemId) {
  if (!items) return false;
  const pid = wid + '_' + itemId;
  if (items[pid] && items[pid].done) return true;
  if (items[itemId] && items[itemId].done) return true;
  for (const k of Object.keys(items)) {
    if ((k === itemId || k.endsWith('_' + itemId)) && items[k] && items[k].done) return true;
  }
  return false;
}

// ── 功能B：主引擎 ────────────────────────────────────────
// 暑假每週結束日（＝該週發派作業的期限）
const SUMMER_WEEK_END = {
  SW01: '2026-07-05', SW02: '2026-07-12', SW03: '2026-07-19', SW04: '2026-07-26',
  SW05: '2026-08-02', SW06: '2026-08-09', SW07: '2026-08-16', SW08: '2026-08-23', SW09: '2026-08-31',
};
// v422：暑假發派也要拿到「分類」與「題型」，不然在提醒裡會全部變成「其他練習」
function summerLibMeta(libWeeks, sw, itemId) {
  const wk = libWeeks['sl-2026-' + sw] || {};
  const items = wk.items || {};
  for (const cat of Object.keys(items)) {
    for (const it of (items[cat] || [])) {
      if (it && it.id === itemId) return { title: String(it.title || itemId).trim(), type: it.type || '', cat };
    }
  }
  return { title: itemId, type: '', cat: '' };
}
const summerWeekLabel = (sw) => '暑假第 ' + Number(String(sw).replace(/^SW/, '')) + ' 週';

// ── v422：家長在聊天室輸入「作業」→ 現場查一次，回同一張卡 ────
// 用的是跟每日提醒完全一樣的分區邏輯，只是不管里程碑、也不寫任何紀錄。
async function queryHomework(env, children) {
  if (!env.FIREBASE_SA) return null;
  let sa;
  try { sa = JSON.parse(env.FIREBASE_SA); } catch (e) { return null; }
  const token = await getAccessTokenCached(env, sa);
  if (!token) return null;
  const project = sa.project_id;
  const today = taipeiToday();

  // 只讀這些孩子用得到的年級
  const grades = [];
  const gradeOf = {};
  children.forEach((c) => {
    const g = gradeFromEmail(c.email) || String(c.grade || '').toLowerCase() || '';
    gradeOf[String(c.email).toLowerCase()] = g;
    if (g && GRADE_DOCS[g] && grades.indexOf(g) < 0) grades.push(g);
  });
  const hwByGrade = {};
  for (const g of grades) {
    const doc = await firestoreGet(project, token, GRADE_DOCS[g]);
    const c = doc && doc.fields ? fsVal({ mapValue: { fields: doc.fields } }) : {};
    hwByGrade[g] = buildHomeworkList(c);
  }
  const progressDocs = await firestoreList(project, token, 'progress');
  const progByEmail = {};
  progressDocs.forEach((d) => {
    const o = d.fields ? fsVal({ mapValue: { fields: d.fields } }) : {};
    if (o.email) progByEmail[String(o.email).toLowerCase()] = o;
  });

  const out = [];
  for (const c of children) {
    const email = String(c.email).toLowerCase();
    const grade = gradeOf[email];
    const prog = progByEmail[email] || {};
    const todos = (grade && hwByGrade[grade] ? hwByGrade[grade] : []).slice();
    const thisWeek = [], overdue = [], preview = [];
    splitTodos(todos, prog.items, today, thisWeek, overdue, preview);
    const secs = {
      week: { groups: weekGroups(thisWeek, grade) },
      overdue: { groups: weekGroups(overdue, grade) },
      preview: { groups: weekGroups(preview, grade) },
    };
    out.push({ name: c.name || prog.name || '', secs, empty: !thisWeek.length && !overdue.length && !preview.length });
  }
  return out;
}

async function runReminders(env, dryRun) {
  const R = { ok: true, dryRun: !!dryRun, today: taipeiToday(), homeworkCount: 0, summerStudents: 0, sends: [], skippedNoBind: [], errors: [] };
  if (!env.FIREBASE_SA) { R.ok = false; R.errors.push('no_firebase_sa'); return R; }
  if (!env.LINKS) { R.ok = false; R.errors.push('no_kv'); return R; }
  let sa;
  try { sa = JSON.parse(env.FIREBASE_SA); } catch (e) { R.ok = false; R.errors.push('bad_firebase_sa_json'); return R; }
  const project = sa.project_id;
  let token;
  try { token = await getAccessTokenCached(env, sa); } catch (e) { R.ok = false; R.errors.push('auth_error: ' + String(e)); return R; }
  if (!token) { R.ok = false; R.errors.push('no_access_token（金鑰或權限有問題）'); return R; }

  // 作業清單：六個年級各一份（公開資料）。v419 之前只讀 class/data 一份，
  // 然後把它發給每一位學生——這就是「只綁 G6 卻收到 G1~G5 作業」的原因。
  const hwByGrade = {};
  for (const g of Object.keys(GRADE_DOCS)) {
    const doc = await firestoreGet(project, token, GRADE_DOCS[g]);
    const c = doc && doc.fields ? fsVal({ mapValue: { fields: doc.fields } }) : {};
    hwByGrade[g] = buildHomeworkList(c);
  }
  R.homeworkByGrade = {};
  R.homeworkCount = 0;
  for (const g of Object.keys(hwByGrade)) {
    R.homeworkByGrade[g] = hwByGrade[g].length;
    R.homeworkCount += hwByGrade[g].length;
  }

  // 暑假題庫（class/data_summer_lib，取標題）＋ 暑假發派（class/summer_meta）
  const libDoc = await firestoreGet(project, token, 'class/data_summer_lib');
  const lib = libDoc && libDoc.fields ? fsVal({ mapValue: { fields: libDoc.fields } }) : {};
  const libWeeks = lib.weeks || {};
  const metaDoc = await firestoreGet(project, token, 'class/summer_meta');
  const meta = metaDoc && metaDoc.fields ? fsVal({ mapValue: { fields: metaDoc.fields } }) : {};
  const metaByEmail = {};
  for (const [em, plan] of Object.entries(meta.students || {})) metaByEmail[String(em).toLowerCase()] = plan;
  R.summerStudents = Object.keys(metaByEmail).length;

  // 學生進度（private，需服務帳號）
  const progressDocs = await firestoreList(project, token, 'progress');
  const students = progressDocs.map((d) => {
    const o = d.fields ? fsVal({ mapValue: { fields: d.fields } }) : {};
    return { email: String(o.email || '').toLowerCase(), name: o.name || '', items: o.items || {} };
  }).filter((s) => s.email);

  // 學生 → 年級：學號是唯一真相，名單上的年級只當備援（學號認不出來時）
  const gradeByEmail = {};
  try {
    activeRoster(await getRoster(env)).forEach((st) => {
      if (st.grade) gradeByEmail[String(st.email).toLowerCase()] = String(st.grade).toLowerCase();
    });
  } catch (e) {}

  const links = JSON.parse((await env.LINKS.get('links')) || '{}');
  const hwseen = JSON.parse((await env.LINKS.get('hwseen')) || '{}');
  const hwsent = JSON.parse((await env.LINKS.get('hwsent')) || '{}');
  const hwweek = JSON.parse((await env.LINKS.get('hwweek')) || '{}');   // v420：每位學生「上次的週一回報」
  const today = R.today;

  const emailToUids = {};
  for (const [uid, arr] of Object.entries(links)) {
    for (const x of (arr || [])) {
      const e = String(x.email).toLowerCase();
      (emailToUids[e] = emailToUids[e] || []).push(uid);
    }
  }

  R.skippedNoGrade = [];
  for (const st of students) {
    // 這位學生要追蹤的作業＝【他自己年級的】學期作業 ＋ 暑假發派給他的單元
    const grade = gradeFromEmail(st.email) || gradeByEmail[st.email] || null;
    if (!grade) R.skippedNoGrade.push(st.name || st.email);
    const todos = (grade && hwByGrade[grade] ? hwByGrade[grade] : []).slice();
    const plan = metaByEmail[st.email];
    if (plan && plan.weeks) {
      for (const sw of Object.keys(plan.weeks)) {
        const due = SUMMER_WEEK_END[sw];
        if (!due) continue;
        const libWid = 'sl-2026-' + sw;
        for (const itemId of (plan.weeks[sw] || [])) {
          const m = summerLibMeta(libWeeks, sw, itemId);
          todos.push({
            wid: libWid, itemId, key: libWid + '_' + itemId,
            title: m.title, type: m.type, cat: m.cat, dueDate: due,
            wkLabel: summerWeekLabel(sw), wkStart: addDays(due, -6), wkEnd: due, archived: false,
          });
        }
      }
    }
    // 記錄每份作業「第一次被看到」的日期（＝發布基準）
    for (const hw of todos) { if (!hwseen[hw.key]) hwseen[hw.key] = today; }

    const uids = emailToUids[st.email];
    if (!uids || !uids.length) { if (todos.length) R.skippedNoBind.push(st.name || st.email); continue; }

    // ── v420：先分三區（本週／前幾週沒完成／可以先預習）────────
    // Alan：「當周作業, 前幾週未完成作業, 可以先預習 都要排版排清楚 不然家長很亂」
    const thisWeek = [], overdue = [], preview = [];
    splitTodos(todos, st.items, today, thisWeek, overdue, preview);
    const nDue = thisWeek.length + overdue.length;
    if (!nDue) continue;                                 // 只剩「可以先預習」→ 不打擾

    // ── 今天到底要不要發？（不要每天煩同一件事）────────────
    //   ① 有這位家長沒被通知過的新作業  ② 每週一固定回報一次  ③ 明天就到期
    const fresh = thisWeek.concat(overdue).filter((hw) => !(((hwsent[hw.key] || {})[st.email]) || []).includes('new'));
    const monday = mondayOf(today);
    const weeklyDue = today === monday && (hwweek[st.email] || '') !== monday;
    const dueTomorrow = thisWeek.some((hw) => hw.dueDate === addDays(today, 1));
    const reason = fresh.length ? 'new' : (weeklyDue ? 'weekly' : (dueTomorrow ? 'due1' : ''));
    if (!reason) continue;

    // ── 組訊息（v421：四大類彙總＋Flex 粗體上色）──────────────
    const secs = {
      week:    { groups: weekGroups(thisWeek, grade) },
      overdue: { groups: weekGroups(overdue, grade) },
      preview: { groups: weekGroups(preview, grade) },
    };
    const bubble = hwBubble(st.name, secs);
    const text = hwPlain(st.name, secs);
    const alt = hwAlt(st.name, secs);

    R.sends.push({
      name: st.name, email: st.email, count: nDue, reason, text, alt,
      lines: text.split('\n').filter((l) => l.trim()),
      sections: secs,
      buckets: { thisWeek: thisWeek.length, overdue: overdue.length, preview: preview.length },
    });
    if (!dryRun) {
      thisWeek.concat(overdue).forEach((hw) => {
        const sent = (hwsent[hw.key] && hwsent[hw.key][st.email]) || [];
        if (!sent.includes('new')) {
          hwsent[hw.key] = hwsent[hw.key] || {};
          hwsent[hw.key][st.email] = sent.concat(['new']);
        }
      });
      if (weeklyDue) hwweek[st.email] = monday;
      const errs = await lineMulticastFlex(uids, alt, bubble, text, env.LINE_TOKEN);
      if (errs.length) R.errors.push('push_failed ' + st.email + ': ' + errs.join(','));
    }
  }

  if (!dryRun) {
    await env.LINKS.put('hwseen', JSON.stringify(hwseen));
    await env.LINKS.put('hwsent', JSON.stringify(hwsent));
    await env.LINKS.put('hwweek', JSON.stringify(hwweek));
  }
  return R;
}

// v422：把「現查作業」的結果包成 LINE 訊息（一個孩子一張卡，最多 5 張）
async function hwReplyMessages(env, children) {
  if (!children || !children.length) {
    let roster = [];
    try { roster = await getRoster(env); } catch (e) {}
    const english = rosterAllEnglish(roster);
    return [{ type: 'text', text: '這個 LINE 還沒綁定孩子，查不到作業 🙌\n\n' + askNameLine(english, exampleNames(roster, english)) }];
  }
  let list = null;
  try { list = await queryHomework(env, children); } catch (e) {}
  if (!list) return [{ type: 'text', text: '暫時查不到作業，請稍後再試，或直接聯絡 Alan 老師 🙏' }];
  const msgs = [];
  for (const r of list) {
    if (r.empty) { msgs.push({ type: 'text', text: `🎉 ${r.name || ''} 目前沒有未完成的作業，太棒了！` }); continue; }
    msgs.push({ type: 'flex', altText: hwAlt(r.name, r.secs).slice(0, 390), contents: hwBubble(r.name, r.secs) });
  }
  return msgs;
}

// ── main ─────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method === 'GET' && path === '/') {
      return json({ ok: true, service: 'alan-line-notify', kv: !!env.LINKS, fb: !!env.FIREBASE_SA }, 200, origin);
    }

    // LINE Webhook（綁定）
    if (request.method === 'POST' && path === '/webhook') {
      const raw = await request.text();
      const sig = request.headers.get('x-line-signature');
      if (!(await verifyLineSignature(raw, sig, env.LINE_SECRET))) return json({ ok: false, error: 'bad_signature' }, 401, origin);
      let payload = {};
      try { payload = JSON.parse(raw); } catch (e) {}
      for (const ev of (payload.events || [])) {
        try {
          if (ev.type === 'follow' && ev.replyToken) {
            await lineReply(ev.replyToken, await welcomeMessage(env, ev.source && ev.source.userId), env.LINE_TOKEN);
          } else if (ev.type === 'message' && ev.message && ev.message.type === 'text' && ev.replyToken) {
            const uid = ev.source && ev.source.userId;
            if (!uid || !env.LINKS) continue;
            const r = await handleNameBinding(env, uid, ev.message.text);
            if (r && r.hw) {
              // v422：家長輸入「作業」→ 現場查一次，回跟每日提醒一樣的卡片
              await lineReplyMessages(ev.replyToken, await hwReplyMessages(env, r.hw), env.LINE_TOKEN);
            } else if (typeof r === 'string' && r.trim()) {
              await lineReply(ev.replyToken, r, env.LINE_TOKEN);
            }
            // r === '' → 已轉人工，故意不回話
          }
        } catch (e) {}
      }
      return json({ ok: true }, 200, origin);
    }

    const adminOk = (request.headers.get('x-admin-pass') || '') === (env.ADMIN_PASS || '__none__');

    // 全班公告
    if (request.method === 'POST' && path === '/broadcast') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const text = String((body && body.text) || '').trim();
      if (!text) return json({ ok: false, error: 'empty' }, 400, origin);
      if (text.length > 4900) return json({ ok: false, error: 'too_long' }, 400, origin);
      let res;
      try {
        res = await fetch(LINE_API + '/v2/bot/message/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.LINE_TOKEN },
          body: JSON.stringify({ messages: [{ type: 'text', text }] }),
        });
      } catch (e) { return json({ ok: false, error: 'network', detail: String(e) }, 502, origin); }
      if (res.ok) return json({ ok: true }, 200, origin);
      const detail = await res.text().catch(() => '');
      return json({ ok: false, error: 'line_error', status: res.status, detail }, 502, origin);
    }

    // 指定對象發送
    if (request.method === 'POST' && path === '/push') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      if (!env.LINKS) return json({ ok: false, error: 'no_kv' }, 500, origin);
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const text = String((body && body.text) || '').trim();
      if (!text) return json({ ok: false, error: 'empty' }, 400, origin);
      if (text.length > 4900) return json({ ok: false, error: 'too_long' }, 400, origin);
      const target = body.target || {};
      const links = JSON.parse((await env.LINKS.get('links')) || '{}');
      const recipients = new Set();
      if (target.type === 'grade') {
        const g = String(target.grade || '').toLowerCase();
        for (const [uid, arr] of Object.entries(links)) if ((arr || []).some((x) => String(x.grade || '').toLowerCase() === g)) recipients.add(uid);
      } else if (target.type === 'students') {
        const emails = new Set((target.emails || []).map((e) => String(e).toLowerCase()));
        for (const [uid, arr] of Object.entries(links)) if ((arr || []).some((x) => emails.has(String(x.email).toLowerCase()))) recipients.add(uid);
      } else {
        for (const uid of Object.keys(links)) recipients.add(uid);
      }
      const to = [...recipients];
      if (!to.length) return json({ ok: false, error: 'no_recipients' }, 200, origin);
      const errs = await lineMulticast(to, text, env.LINE_TOKEN);
      if (errs.length) return json({ ok: false, error: 'line_error', detail: errs.join(',') }, 502, origin);
      return json({ ok: true, count: to.length }, 200, origin);
    }

    // 同步名單
    if (request.method === 'POST' && path === '/sync-roster') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      if (!env.LINKS) return json({ ok: false, error: 'no_kv' }, 500, origin);
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const roster = Array.isArray(body.roster) ? body.roster : [];
      const clean = roster.filter((s) => s && s.email && s.name)
        .map((s) => ({ email: String(s.email).toLowerCase(), name: s.name, grade: s.grade || '', active: s.active !== false }));
      await env.LINKS.put('roster', JSON.stringify(clean));
      return json({ ok: true, count: clean.length }, 200, origin);
    }

    // 讀綁定
    if (request.method === 'GET' && path === '/links') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      if (!env.LINKS) return json({ ok: false, error: 'no_kv' }, 500, origin);
      const links = JSON.parse((await env.LINKS.get('links')) || '{}');
      const roster = JSON.parse((await env.LINKS.get('roster')) || '[]');
      return json({ ok: true, links, roster }, 200, origin);
    }

    // 解除綁定
    if (request.method === 'POST' && path === '/unlink') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      if (!env.LINKS) return json({ ok: false, error: 'no_kv' }, 500, origin);
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const uid = body.lineUserId, email = body.email;
      const links = JSON.parse((await env.LINKS.get('links')) || '{}');
      if (uid && links[uid]) {
        if (email) { links[uid] = links[uid].filter((x) => x.email !== email); if (!links[uid].length) delete links[uid]; }
        else delete links[uid];
        await env.LINKS.put('links', JSON.stringify(links));
      }
      return json({ ok: true }, 200, origin);
    }

    // 功能B：手動試跑（?dry=1 只預覽）
    if (request.method === 'POST' && path === '/run-reminders') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      const dry = url.searchParams.get('dry') === '1';
      const R = await runReminders(env, dry);
      return json(R, 200, origin);
    }

    return json({ ok: false, error: 'not_found' }, 404, origin);
  },

  // 每日 Cron（Settings → Triggers 設 0 10 * * *）
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env, false));
  },
};

// ── 給 Node 測試用的具名匯出（Cloudflare 不會用到，留著無害）─────
export {
  handleNameBinding, welcomeMessage, welcomeText, doneText, rosterAllEnglish,
  matchOne, parseNames, splitNames, exampleNames, gradeFromEmail, runReminders,
  MAX_CHILDREN, GRADE_DOCS, buildHomeworkList, groupByLesson, lessonLine, mondayOf, TYPE_ZH, OVERDUE_DAYS,
  queryHomework, hwReplyMessages, helpText, CMD, splitTodos,
  catRows, weekGroups, hwBubble, hwPlain, hwAlt, catZh, CAT_ZH, SEC_DEF, summerLibMeta,
};
