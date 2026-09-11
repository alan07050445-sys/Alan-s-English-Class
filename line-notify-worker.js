/*
 * Alan's English Class — LINE 通知 Worker（v7：關鍵字秒回＋AI 每次都回但範圍寫死＋快速按鈕）
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
 *   POST /run-reminders   自動提醒（?dry=1 只預覽「今晚會發什麼」）
 *   POST /manual          老師主動提醒 {target, note}（?dry=1 預覽）——跟自動提醒的紀錄完全分開
 *   GET  /diag            最近 30 則 LINE 訊息的處理紀錄
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
  // v426：同一個 Worker 裡先看記憶體（綁定、刪除這些回覆就不用每次跑 KV）
  if (MEM.roster && Date.now() - MEM.roster.ts < ROSTER_TTL_MS && MEM.roster.env === env) return MEM.roster.list;
  const keep = (list) => { if (list && list.length) MEM.roster = { ts: Date.now(), list, env }; return list; };
  if (env.FIREBASE_SA && env.LINKS) {
    let cached = null;
    try { cached = JSON.parse((await env.LINKS.get('roster_live')) || 'null'); } catch (e) {}
    const has = cached && cached.ts && Array.isArray(cached.list) && cached.list.length;
    if (has && Date.now() - cached.ts < ROSTER_TTL_MS) return keep(cached.list);
    // v426：名單很少變——過期的先拿來用（新增／刪除孩子就不用等 Firestore），背景再更新
    if (has) { bg(refreshRoster(env)); return keep(cached.list); }
    const fresh = await refreshRoster(env);
    if (fresh && fresh.length) return keep(fresh);
  }
  try { return keep(JSON.parse((await env.LINKS.get('roster')) || '[]')); } catch (e) { return []; }
}
async function refreshRoster(env) {
  if (env.FIREBASE_SA && env.LINKS) {
    try {
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
          MEM.roster = { ts: Date.now(), list, env };
          return list;
        }
      }
    } catch (e) { /* 讀不到就用 KV 名單 */ }
  }
  return null;
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
  const e = Object.assign({}, m[uid] || {});                // 保留 e.ai（今天問 AI 的次數）
  if (stage) { e.stage = stage; e.ts = Date.now(); } else { delete e.stage; delete e.ts; }
  if (Object.keys(e).length) m[uid] = e; else delete m[uid];
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

const matchName = (a, b) => nkey(a) === nkey(b) || nkey(a).startsWith(nkey(b)) || nkey(b).startsWith(nkey(a));
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

// v423：Alan 決定只留三件事——打開練習／查作業／新增或刪除孩子。
// 「如果不是用選單而是直接打字 偵測是否跟…有關係 因為有些家長可能不想用選單」
// → 用「包含關鍵字」而不是整句吻合；順序有意義（先刪、再加、再作業、再網站）。
const INTENT = {
  // 刪除孩子要排在最前面：「刪除 Eric」裡面也有名字，不能被當成新增
  remove: /(刪除|刪掉|移除|解除|取消綁定|拿掉|不要收|不想收|不想再收|不要再收|不用收|不用再收|取消通知|不要通知|退訂|退出)/,
  add:    /(新增|加入|加一個|再加|新增孩子|新增小孩|綁定|綁孩子|加小孩|加孩子)/,
  kids:   /(我的孩子|孩子|小孩|弟弟|妹妹|哥哥|姐姐|姊姊|名單|誰|查詢|綁定|狀態|status)/i,
  hw:     /(作業|功課|進度|homework|hw|沒完成|未完成|要做什麼|還有什麼|寫完)/i,
  site:   /(網站|網址|連結|練習|登入|開始|題目|link|site|怎麼進|哪裡練)/i,
  help:   /^(說明|幫助|選單|功能|help|menu|\?|？)$/i,
};
const HUMAN_MS = 10 * 60 * 1000;      // 無關訊息：10 分鐘內只客氣回一次，不洗版

// v423：跟三件事都無關的訊息 → 隨機挑一句有禮貌的回覆
const POLITE = [
  '謝謝您的訊息 😊\n想看孩子的作業，按下面的「📝 作業」就可以囉。',
  '收到囉 🙌\n這裡是自動小幫手，有其他問題請按「💬 找老師」。',
  '謝謝您 🌱\n需要查作業的話，回覆「作業」兩個字就行了。',
  '好的 ✨\n練習網站在下面的「📚 練習」按鈕裡。',
  '謝謝您的來訊 🙏\n請假、調課等事情，請按「💬 找老師」私訊老師本人。',
  '收到 😊\n祝孩子練習順利，有需要隨時按下面的按鈕。',
];
// 同一個人不要每次都收到同一句（用 userId + 分鐘數挑，不必存狀態）
function politeReply(uid) {
  const seed = String(uid || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) + Math.floor(Date.now() / 60000);
  return POLITE[seed % POLITE.length];
}

// 客氣回一次，10 分鐘內再講就安靜（家長連打好幾句不會被洗版）
// v427：Alan「不用防洗版」——每次都客氣回（名字保留，呼叫的地方不用改）
async function politeOrQuiet(env, uid, stage) {
  return politeReply(uid);
}

function menuText() {
  return (
    '這個帳號可以做三件事 🙌\n\n' +
    '📚「練習」－ 拿到練習網站的連結\n' +
    '📝「作業」－ 看孩子還有哪些沒完成\n' +
    '👦「孩子」－ 新增或刪除要收通知的孩子\n\n' +
    '直接打這些字，或用下方的選單都可以 👇'
  );
}
const siteText = () => '📚 練習網站\n' + SITE_URL + '\n\n用孩子的學校帳號登入就可以開始練習。';

// ── v427：這個官方帳號「只」做公告與作業提醒 ──────────────────
// Alan：「這個 line 的功能主要是 Alan 老師宣布事情 提醒作業的地方 沒辦法請假 加課
//        或是批改功課 等等之類的 要的話都直接聯絡我本人 Line」
//       「不用防洗版就讓 AI 正常回覆 但是要有限制 這很重要」「速度很重要 不要有延遲」
// → ① 關鍵字先判斷（毫秒級，不問 AI）：請假／調課／批改／成績／學費…→ 固定回覆「請私訊老師本人」；
//      「Lucas 作業寫完了嗎」→ 直接查；「我還要加 Nick」「不想收 Tayler 的通知」→ 直接新增／刪除
//   ② 剩下看不懂的才問 AI；AI 每次都回（不再防洗版），但範圍寫死、每個 LINE 一天最多 AI_DAILY 次
//   ③ 每則回覆底下都有快速按鈕（作業／練習／孩子／找老師），家長幾乎不用打字
const TEACHER_LINE_URL = '';   // Alan 本人 LINE 的連結（例：https://line.me/ti/p/xxxx）；也可在 Cloudflare 設 env TEACHER_LINE_URL
const AI_DAILY = 40;           // 每個 LINE 一天最多問 AI 幾次（小朋友一直打也不會一直花錢；超過就用固定的客氣話）
const CONTACT_RE = /(請假|請個假|病假|事假|要請|加課|調課|補課|換時間|改時間|上課時間|幾點上課|什麼時候上課|哪天上課|停課|取消上課|批改|改作業|幫忙改|幫他改|訂正|成績|分數|考幾分|考試結果|學費|費用|繳費|退費|收據|老師電話|聯絡老師|找老師|私訊老師|跟老師說|想問老師|請問老師|老師在嗎|問老師)/;
const SITE_RE = /(網站|網址|連結|哪裡練|去哪練|怎麼練習|練習網站|登入|怎麼進|link|site)/i;
const CAT_KW = [[/文法|grammar/i, 'grammar'], [/閱讀|寫作|reading|writing/i, 'reading'], [/字彙|字根|字首/, 'word']];
const QUICK_ITEMS = [['📝 作業', '作業'], ['📚 練習', '練習'], ['👦 孩子', '孩子'], ['💬 找老師', '找老師']];

// 句子裡有沒有提到這個孩子（英文名要整個字吻合：「Lucas作業」可以，「Lucasss」不行）
function nameIn(text, name) {
  const first = String(name || '').trim().split(/\s+/)[0];
  if (!first || first.length < 2) return false;
  const esc = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^A-Za-z])' + esc + '($|[^A-Za-z])', 'i').test(text);
}
// 不用 AI 就能確定意思的句子
function quickRoute(text, bound, roster) {
  if (CONTACT_RE.test(text)) return { contact: true };
  if (INTENT.remove.test(text)) {
    const hit = bound.find((c) => nameIn(text, c.name));
    if (hit) return { bind: '刪除 ' + hit.name };
  }
  if (INTENT.add.test(text) || /(還有|也要|也要收|再加|加上)/.test(text)) {
    const hit = activeRoster(roster).find((st) => nameIn(text, st.name) && !bound.some((b) => b.email === st.email));
    if (hit) return { bind: '新增 ' + hit.name };
  }
  if (INTENT.hw.test(text)) {
    const kids = bound.filter((c) => nameIn(text, c.name));
    let cat = null;
    for (const [re, c] of CAT_KW) if (re.test(text)) { cat = c; break; }
    return { hw: kids.length ? kids : bound, cat };
  }
  if (SITE_RE.test(text)) return { site: true };
  return null;
}
// 「請私訊老師本人」——有設定老師的 LINE 連結就附一顆按鈕
function contactMessages(env) {
  const url = String((env && env.TEACHER_LINE_URL) || TEACHER_LINE_URL || '').trim();
  const text = '這個帳號只負責 Alan 老師的公告和作業提醒 📌\n\n請假、調課、作業批改、成績或其他問題，請直接私訊 Alan 老師本人的 LINE，老師會親自回覆您 🙏';
  if (!/^https:\/\/\S+$/.test(url)) return [{ type: 'text', text }];
  return [{ type: 'flex', altText: '請假、調課、作業批改等問題，請直接私訊 Alan 老師本人', contents: {
    type: 'bubble', size: 'kilo',
    body: { type: 'box', layout: 'vertical', paddingAll: '16px', contents: [
      { type: 'text', text: '這個帳號只負責公告和作業提醒 📌', weight: 'bold', size: 'sm', color: C_INK, wrap: true },
      { type: 'text', text: '請假、調課、作業批改、成績或其他問題，請直接私訊 Alan 老師本人，老師會親自回覆您 🙏', size: 'sm', color: C_SUB, wrap: true, margin: 'md' },
    ] },
    footer: { type: 'box', layout: 'vertical', paddingAll: '12px', paddingTop: 'none', contents: [
      { type: 'button', style: 'primary', height: 'sm', color: '#06C755', action: { type: 'uri', label: '💬 私訊 Alan 老師', uri: url } },
    ] },
  } }];
}
// 最後一則訊息底下掛快速按鈕（LINE 只顯示最後一則的）
function withQuickReply(messages) {
  if (!messages || !messages.length) return messages;
  const items = QUICK_ITEMS.map(([label, text]) => ({ type: 'action', action: { type: 'message', label, text } }));
  const last = Object.assign({}, messages[messages.length - 1], { quickReply: { items } });
  return messages.slice(0, -1).concat([last]);
}
// 每個 LINE 一天問 AI 的次數（記在 chatstate，回覆送出後才寫）
async function aiUsedToday(env, uid) {
  try {
    const e = (JSON.parse((await env.LINKS.get('chatstate')) || '{}'))[uid] || {};
    return e.ai && e.ai.d === taipeiToday() ? e.ai.n : 0;
  } catch (e) { return 0; }
}
async function aiBump(env, uid) {
  let m = {};
  try { m = JSON.parse((await env.LINKS.get('chatstate')) || '{}'); } catch (e) {}
  const d = taipeiToday();
  const e = Object.assign({}, m[uid] || {});
  e.ai = { d, n: (e.ai && e.ai.d === d ? e.ai.n : 0) + 1 };
  m[uid] = e;
  await env.LINKS.put('chatstate', JSON.stringify(m));
}

// ── v426：更聰明——看不懂的話交給 Claude 判斷（選單按鈕、純名字仍走規則，毫秒級）──
// Alan：「我要的是更智慧的版本 而不是很死板」
// AI 只負責「看懂意思、挑出是哪個孩子／哪一類」，真正的動作（查作業、綁定、刪除）
// 一律由程式照名單驗證後才做——AI 講錯名字也不會綁錯人、不會編造作業。
const AI_ENDPOINT = 'https://alan-ai-proxy.alan07050445.workers.dev';   // 網站本來就在用的 Anthropic 代理
const AI_MODEL = 'claude-haiku-4-5-20251001';
const AI_TIMEOUT_MS = 6000;
const AI_INTENTS = ['homework', 'practice', 'add', 'remove', 'list', 'contact', 'chat'];
const AI_CATS = ['vocab', 'word', 'grammar', 'reading'];

function aiSystem(kids) {
  return [
    "你是「Alan's English Class」LINE 官方帳號的自動小幫手，對象是小學生的家長，用繁體中文（台灣用語）。",
    '這個帳號只用來：Alan 老師發公告、提醒作業。家長在這裡只能：查作業(homework)、拿練習網站(practice)、新增孩子(add)、刪除孩子(remove)、看綁了哪些孩子(list)。',
    '請假、調課、加課、補課、上課時間、作業批改或訂正、成績、學費或費用、想跟老師討論孩子的狀況——這個帳號都辦不到，一律判成 contact（系統會請家長直接私訊 Alan 老師本人）。',
    '這個 LINE 目前綁定的孩子：' + (kids.length ? kids.join('、') : '（還沒綁定）'),
    '只輸出一行 JSON，不要任何其他文字：',
    '{"intent":"homework|practice|add|remove|list|contact|chat","child":"孩子的英文名字或 null","cat":"vocab|word|grammar|reading 或 null","reply":"只有 chat 才寫"}',
    '- 問作業、功課、進度、寫完沒、還剩什麼 → homework（有講哪個孩子填 child；單字 vocab、字彙 word、文法 grammar、閱讀或寫作 reading）。',
    '- 要新增／加入孩子 → add；要刪除、取消、不要再收某個孩子的通知 → remove（child 填名字，沒講就 null）。要網站或連結 → practice。問綁了誰 → list。',
    '- chat 只限打招呼、道謝、閒聊、小朋友亂打：reply 一句話、30 字以內、溫暖有禮。',
    '  不能答應任何事、不能給學習建議或教學、不能說會轉告老師、不能編造作業或成績、不要附網址、不要反問或邀請對方繼續聊。拿不準的一律判 contact。',
  ].join('\n');
}
const REPLY_MAX = 40;
function clipReply(t) {
  if (t.length <= REPLY_MAX) return t;
  const cut = t.slice(0, REPLY_MAX);
  const k = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('！'), cut.lastIndexOf('？'), cut.lastIndexOf('!'), cut.lastIndexOf('?'), cut.lastIndexOf('～'));
  return k >= 8 ? cut.slice(0, k + 1) : cut.replace(/[，、,\s]+$/, '') + '…';
}
async function aiUnderstand(env, text, bound) {
  if (env.AI_CHAT === 'off') return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), Number(env.AI_TIMEOUT_MS) || AI_TIMEOUT_MS);
  try {
    const res = await fetch(env.AI_ENDPOINT || AI_ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 120, system: aiSystem(bound.map((c) => c.name)),
        messages: [{ role: 'user', content: String(text).slice(0, 300) }] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = (((data && data.content) || []).find((c) => c && c.type === 'text') || {}).text || '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]);
    const intent = AI_INTENTS.indexOf(j.intent) >= 0 ? j.intent : null;
    if (!intent) return null;
    const child = typeof j.child === 'string' && j.child.trim() && j.child !== 'null' ? j.child.trim().slice(0, 40) : null;
    const cat = AI_CATS.indexOf(j.cat) >= 0 ? j.cat : null;
    // AI 的回話：拿掉網址、由程式限制在 40 字內（在句子結尾切；實測 AI 偶爾會寫到 59 字）
    const reply = clipReply(String(j.reply || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim());
    return { intent, child, cat, reply };
  } catch (e) {
    return null;
  } finally { clearTimeout(timer); }
}

// 選單按鈕送的固定字、「刪除 Eric／新增 Eric」→ 規則就夠了，不必問 AI
const FAST = {
  hw:   /^(作業|查作業|查詢作業|看作業|功課|進度|查進度|homework|hw)$/i,
  site: /^(練習|網站|打開練習|網址|連結)$/,
  kids: /^(孩子|我的孩子|小孩|新增|刪除|新增或刪除|新增or刪除|新增\/刪除|綁定|查詢)$/i,
  act:  /^(刪除|刪掉|移除|新增|加入)\s*[A-Za-z]/,
};
async function readLinks(env) {
  try { return JSON.parse((await env.LINKS.get('links')) || '{}'); } catch (e) { return {}; }
}

// v426：聊天室的總入口。hooks.slow() → 要花時間了（顯示「輸入中…」）；hooks.path 記錄走哪條路
async function handleMessage(env, uid, rawText, hooks) {
  const h = hooks || {};
  const text = String(rawText || '').trim();
  h.path = 'fast';
  if (CONTACT_RE.test(text)) return { contact: true };                  // 「找老師」「請假」→ 馬上回
  if (FAST.hw.test(text) && h.slow) h.slow();              // 查作業一定要讀資料 → 先讓家長看到「輸入中…」
  if (FAST.hw.test(text) || FAST.site.test(text) || FAST.kids.test(text) || FAST.act.test(text) || INTENT.help.test(text)) {
    return handleNameBinding(env, uid, text);
  }
  const [roster, links, stage] = await Promise.all([getRoster(env), readLinks(env), getStage(env, uid)]);
  const bound = links[uid] || [];
  if (stage === 'ask2' && NEG_RE.test(text)) return handleNameBinding(env, uid, text);
  // 整句就是名單上的名字（含「Eric & Tayler」）→ 綁定
  const names = parseNames(roster, text);
  if (names.length && names.every((n) => !matchOne(roster, n).none)) return handleNameBinding(env, uid, text);

  // v427：關鍵字就能確定意思的，不必等 AI
  const q = quickRoute(text, bound, roster);
  if (q) {
    if (q.bind) return handleNameBinding(env, uid, q.bind);
    if (q.site) return siteText();
    if (q.hw && h.slow) h.slow();
    return q;
  }

  // 其他 → 交給 AI 看懂（每個 LINE 一天最多 AI_DAILY 次）
  if (await aiUsedToday(env, uid) >= AI_DAILY) { h.path = 'quota'; return bound.length ? politeReply(uid) : handleNameBinding(env, uid, text); }
  if (h.slow) h.slow();
  const t0 = Date.now();
  const ai = await aiUnderstand(env, text, bound);
  h.aiMs = Date.now() - t0;
  bg(aiBump(env, uid));
  if (!ai) { h.path = 'rules'; return handleNameBinding(env, uid, text); }   // AI 沒回 → 退回原本的規則
  h.path = 'ai:' + ai.intent;
  const pickKids = () => {
    if (!ai.child) return bound;
    const hit = bound.filter((c) => matchName(c.name, ai.child));
    return hit.length ? hit : bound;
  };
  switch (ai.intent) {
    case 'homework': return { hw: bound.length ? pickKids() : [], cat: ai.cat, child: ai.child };
    case 'practice': return siteText();
    case 'contact':  return { contact: true };
    case 'list':     return handleNameBinding(env, uid, '孩子');
    case 'add':      return handleNameBinding(env, uid, ai.child ? '新增 ' + ai.child : '新增');
    case 'remove':   return handleNameBinding(env, uid, ai.child ? '刪除 ' + ai.child : '刪除');
    default:
      if (!bound.length) return handleNameBinding(env, uid, text);          // 還沒綁：先請他綁定
      return ai.reply || politeReply(uid);                                    // v427：每次都回，不再防洗版
  }
}

async function handleNameBinding(env, lineUserId, rawText) {
  const text = String(rawText || '').trim();
  // v426：名單、綁定、對話狀態三樣同時讀（以前一個等一個）
  const [roster, links, stage] = await Promise.all([getRoster(env), readLinks(env), getStage(env, lineUserId)]);
  const english = rosterAllEnglish(roster);
  const ex = exampleNames(roster, english);
  const bound = links[lineUserId] || [];

  // ── 三件事的意圖判斷（打字或按選單都走這裡）──────────────
  if (INTENT.help.test(text)) return menuText();
  if (INTENT.site.test(text)) return siteText();

  // 刪除孩子：「刪除 Eric」直接刪；只打「刪除」就先問要刪誰
  if (INTENT.remove.test(text)) {
    if (!bound.length) return '這個 LINE 目前沒有綁定任何孩子 🙌\n\n' + askNameLine(english, ex);
    const who = text.replace(INTENT.remove, ' ').trim();
    const hit = who ? bound.find((c) => matchName(c.name, who)) : null;
    if (!hit) {
      return '要刪除哪一位呢？目前綁定的是：\n' + listChildren(bound) +
        `\n\n請回覆「刪除 ${bound[0].name}」這樣的格式 🙏`;
    }
    const left = bound.filter((c) => c.email !== hit.email);
    if (left.length) links[lineUserId] = left; else delete links[lineUserId];
    await Promise.all([env.LINKS.put('links', JSON.stringify(links)), setStage(env, lineUserId, left.length ? 'done' : '')]);
    return `已刪除 ${fmtChild(hit)} ✅\n之後不會再收到他的作業提醒。\n\n` +
      (left.length ? '目前還綁定：\n' + listChildren(left) : '要重新加回來，直接回覆孩子的' + (english ? '英文名字' : '姓名') + '就可以 👌');
  }

  // 「小孩寫完了嗎」是在問作業，不是在問綁定 → hw 要排在 kids 前面
  if (INTENT.hw.test(text)) return { hw: bound };          // 交給 webhook 現查（要讀 Firestore）

  // 新增孩子／看目前綁了誰
  let nameText = text;                                     // 進到綁定流程時要比對的字
  let explicitAdd = false;
  if (INTENT.add.test(text) || INTENT.kids.test(text)) {
    const nm = text.replace(INTENT.add, ' ').replace(INTENT.kids, ' ').trim();
    // v426：「新增 Ghost」這種有講名字的 → 交給下面的名字流程（配不到會說「找不到」）；
    //       「要加一個小孩」剩下的「要」不是名字 → 顯示新增／刪除面板
    const looksLikeName = english ? /[A-Za-z]/.test(nm) : /^[\u4e00-\u9fff]{2,4}$/.test(nm) || /[A-Za-z]/.test(nm);
    if (!looksLikeName) {
      const head = bound.length ? '目前這個 LINE 綁定：\n' + listChildren(bound) + '\n\n' : '這個 LINE 還沒有綁定孩子 🙌\n\n';
      if (bound.length >= MAX_CHILDREN) {
        return head + `已經是上限 ${MAX_CHILDREN} 位了。\n要換人的話，回覆「刪除 ${bound[0].name}」再輸入新的名字 🙏`;
      }
      return head + '➕ 新增：直接回覆孩子的' + (english ? '英文名字（例：' + ex.one + '）' : '姓名') +
        (bound.length ? `\n➖ 刪除：回覆「刪除 ${bound[0].name}」` : '');
    }
    nameText = nm;                                         // 「新增 Eric」這種一次講完的
    explicitAdd = true;                                    // 他明確說要加人 → 配不到要講「找不到」
  }

  // 名單還沒就緒
  if (!activeRoster(roster).length) return '系統名單尚未就緒，請稍後再試，或直接聯絡 Alan 老師 🙏';

  // 問「還有第二位嗎」→ 回答「沒有」
  if (stage === 'ask2' && NEG_RE.test(text)) {
    await setStage(env, lineUserId, 'done');
    return doneText(bound, english);
  }

  // v426：「已經綁滿」要等確定他真的在講名單上的另一個孩子才說——
  //       以前這一段放在比對名字之前，綁了 2 位的家長打「你好」也會收到「已經綁定 2 位孩子了」

  const names = parseNames(roster, nameText);
  if (!names.length) {
    // 標點符號之類的（「???」）——已綁定的人就客氣帶過，還沒綁的才請他打名字
    if (bound.length) return politeOrQuiet(env, lineUserId, stage);
    return askNameLine(english, ex);
  }

  const added = [], dup = [], bad = [], amb = [], over = [];
  const cur = bound.slice();
  for (const nm of names) {
    const r = matchOne(roster, nm);
    if (r.hit) {
      if (cur.some((x) => String(x.email).toLowerCase() === String(r.hit.email).toLowerCase())) { dup.push(r.hit); continue; }
      if (cur.length >= MAX_CHILDREN) { over.push(r.hit.name); continue; }
      const rec = { email: r.hit.email, name: r.hit.name, grade: r.hit.grade || '' };
      cur.push(rec); added.push(rec);
    } else if (r.many) { amb.push(nm); }
    else { bad.push(nm); }
  }

  let linksWrite = null;                                    // 跟最後的 setStage 一起等
  if (added.length) {
    links[lineUserId] = cur;
    linksWrite = env.LINKS.put('links', JSON.stringify(links));
  }

  // 完全沒配到（這條路不會有寫入）
  if (!added.length && !dup.length) {
    if (over.length) {
      return `這個 LINE 已經綁定 ${MAX_CHILDREN} 位孩子了：\n` + listChildren(bound) +
        `\n\n要換成 ${over[0]} 的話，先回覆「刪除 ${bound[0].name}」再輸入他的名字；其他問題請聯絡 Alan 老師 🙏`;
    }
    if (amb.length) return `班上有多位「${amb[0]}」🤔\n請直接聯絡 Alan 老師協助綁定 🙏`;
    // v423：跟三件事都無關的閒聊／小朋友亂打 → 隨機一句有禮貌的回覆，
    //       而且 10 分鐘內只回一次，家長連打好幾句不會被洗版。
    if (bound.length && !explicitAdd) return politeOrQuiet(env, lineUserId, stage);
    const who = bad[0] || nameText;
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
    await Promise.all([linksWrite, setStage(env, lineUserId, 'done')]);
    return lines.join('\n') + '\n\n' + doneText(cur, english);
  }
  // 只綁到 1 位、還有空位 → 問第二位
  await Promise.all([linksWrite, setStage(env, lineUserId, 'ask2')]);
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

// ── v426：速度 ──────────────────────────────────────────
// 實測：一個年級的課程文件從 Firestore 下載是 ~1.4MB、~1.5 秒（就算只拿一個欄位也要 ~1.1 秒）。
// 家長按「作業」其實只需要每份作業的「標題／分類／週次／期限」，壓縮後才幾 KB。
// → 三層快取：同一個 Worker 的記憶體（毫秒）→ KV（~幾十毫秒）→ Firestore（~1.5 秒）。
//   每天 18:00 的自動提醒會強制重抓一次，順便把 KV 更新成最新。
const MEM = { hw: {}, roster: null, bg: [] };
const HW_TTL_MS = 10 * 60 * 1000;          // 10 分鐘內的快取直接用
const HW_STALE_MS = 26 * 3600 * 1000;      // 26 小時內的舊快取：先拿來回覆，背景再更新
                                           //（每天 18:00 的自動提醒會刷新一次，26 小時保證整天都是熱的）
// 「先用舊的回，背景再更新」——家長不用等那 1.5 秒；更新好的下一次就用得到
function bg(p) { MEM.bg.push(Promise.resolve(p).catch(() => {})); }
async function flushBg() { while (MEM.bg.length) await Promise.all(MEM.bg.splice(0)); }
async function fetchHwList(env, project, token, g) {
  const doc = await firestoreGet(project, token, GRADE_DOCS[g]);
  const c = doc && doc.fields ? fsVal({ mapValue: { fields: doc.fields } }) : {};
  const list = buildHomeworkList(c);
  const now = Date.now();
  MEM.hw[g] = { ts: now, list, env };
  if (env.LINKS) { try { await env.LINKS.put('hwc:' + g, JSON.stringify({ ts: now, list })); } catch (e) {} }
  return list;
}
async function getHwList(env, project, token, g, fresh) {
  if (fresh) return fetchHwList(env, project, token, g);
  const now = Date.now();
  const m = MEM.hw[g];
  if (m && m.env === env && now - m.ts < HW_TTL_MS) return m.list;
  if (env.LINKS) {
    let c = null;
    try { c = JSON.parse((await env.LINKS.get('hwc:' + g)) || 'null'); } catch (e) {}
    if (c && Array.isArray(c.list)) {
      if (now - c.ts < HW_TTL_MS) { MEM.hw[g] = { ts: c.ts, list: c.list, env }; return c.list; }
      if (now - c.ts < HW_STALE_MS) {
        MEM.hw[g] = { ts: now, list: c.list, env };         // 這個 Worker 先別再重抓
        bg(fetchHwList(env, project, token, g));
        return c.list;
      }
    }
  }
  return fetchHwList(env, project, token, g);
}
// 進度文件的 id 是登入的 uid，不是 email → 第一次要整批列出來才知道誰是誰；
// 之後把「email → 文件路徑」記在 KV，只讀需要的那幾份（原本每次都整批下載全班）
async function getProgressFor(env, project, token, emails) {
  const need = emails.map((e) => String(e).toLowerCase());
  const out = {};
  let map = {};
  try { map = JSON.parse((env.LINKS && (await env.LINKS.get('progmap'))) || '{}'); } catch (e) {}
  if (need.some((e) => !map[e])) {
    const docs = await firestoreList(project, token, 'progress');
    docs.forEach((d) => {
      const o = d.fields ? fsVal({ mapValue: { fields: d.fields } }) : {};
      if (!o.email) return;
      const e = String(o.email).toLowerCase();
      const rel = String(d.name || '').split('/documents/')[1];
      if (rel) map[e] = rel;
      if (need.indexOf(e) >= 0) out[e] = o;
    });
    if (env.LINKS) { try { await env.LINKS.put('progmap', JSON.stringify(map)); } catch (e) {} }
  }
  const toGet = need.filter((e) => !out[e] && map[e]);
  const got = await Promise.all(toGet.map((e) => firestoreGet(project, token, map[e])));
  toGet.forEach((e, i) => { const d = got[i]; out[e] = d && d.fields ? fsVal({ mapValue: { fields: d.fields } }) : {}; });
  return out;
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
// v426：opts.title／opts.note——老師「主動提醒」用不同的標題，並可以附一段話
function hwBubble(name, secs, opts) {
  const o = opts || {};
  const body = [];
  let first = true;
  if (o.note) {
    body.push({ type: 'box', layout: 'vertical', backgroundColor: '#FFF6E0', cornerRadius: 'md', paddingAll: '10px',
      contents: [{ type: 'text', text: o.note, size: 'sm', color: C_INK, wrap: true }] });
    body.push({ type: 'separator', margin: 'lg', color: C_LINE });
  }
  SEC_DEF.forEach(([k, title, note, color]) => {
    const gs = (secs[k] || {}).groups || [];
    if (!gs.length) return;
    const sec = fxSection(title, typeof note === 'function' ? note(secs) : note, gs, color, first);
    if (first && o.note) sec[0] = Object.assign({}, sec[0], { margin: 'lg' });
    body.push(...sec);
    first = false;
  });
  return {
    type: 'bubble', size: 'mega',
    header: {
      type: 'box', layout: 'vertical', paddingAll: '16px', paddingBottom: '12px',
      backgroundColor: '#F4F7F4',
      contents: [
        { type: 'text', text: o.title || '📚 作業提醒', size: 'xs', color: C_SUB },
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
function hwPlain(name, secs, opts) {
  const o = opts || {};
  const out = [`${o.title || '📚 作業提醒'} — ${name || ''}`];
  if (o.note) out.push('', '💬 ' + o.note);
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
function hwAlt(name, secs, opts) {
  const o = opts || {};
  const bits = [];
  SEC_DEF.forEach(([k, , , , short]) => { const n = secCount(secs[k]); if (n) bits.push(short + ' ' + n + ' 項'); });
  return `${o.title || '📚 作業提醒'} — ${name || ''}｜` + (o.note ? o.note.slice(0, 40) + '｜' : '') + bits.join('、');
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
// v424：Alan「現在是學期之中 不用包含暑假」。
// 暑假最後一週結束之後，暑假發派就不再進提醒（開學了就講學期的事）。
// ⚠️ 明年暑假要一起更新 SUMMER_WEEK_END（這個日期就是從它最後一週來的）。
const SUMMER_LAST_DAY = SUMMER_WEEK_END.SW09;
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
// v423：暑假發派的 todo（每日提醒與「家長現查」共用——之前只有每日提醒有，
// 所以家長自己按「作業」時，暑假那幾項會整區消失）
function summerTodos(libWeeks, plan, today) {
  const out = [];
  if (!plan || !plan.weeks) return out;
  if (today && today > SUMMER_LAST_DAY) return out;      // 開學了 → 不再提醒暑假發派
  for (const sw of Object.keys(plan.weeks)) {
    const due = SUMMER_WEEK_END[sw];
    if (!due) continue;
    const libWid = 'sl-2026-' + sw;
    for (const itemId of (plan.weeks[sw] || [])) {
      const m = summerLibMeta(libWeeks, sw, itemId);
      out.push({
        wid: libWid, itemId, key: libWid + '_' + itemId,
        title: m.title, type: m.type, cat: m.cat, dueDate: due,
        wkLabel: summerWeekLabel(sw), wkStart: addDays(due, -6), wkEnd: due, archived: false,
      });
    }
  }
  return out;
}
// 暑假的兩份文件（題庫標題＋每個人的發派）
async function loadSummer(project, token) {
  const libDoc = await firestoreGet(project, token, 'class/data_summer_lib');
  const lib = libDoc && libDoc.fields ? fsVal({ mapValue: { fields: libDoc.fields } }) : {};
  const metaDoc = await firestoreGet(project, token, 'class/summer_meta');
  const meta = metaDoc && metaDoc.fields ? fsVal({ mapValue: { fields: metaDoc.fields } }) : {};
  const byEmail = {};
  for (const em of Object.keys(meta.students || {})) byEmail[String(em).toLowerCase()] = meta.students[em];
  return { libWeeks: lib.weeks || {}, metaByEmail: byEmail };
}

// ── v426：老師「主動提醒」────────────────────────────────
// Alan：「自動提醒是自動提醒 但我主動提醒是主動提醒 不要混在一起」
// → 完全不碰自動提醒的紀錄（hwsent／hwbind／hwweek），自己記在 manuallog。
//   家長看到的標題也不一樣：「📣 Alan 老師提醒」＋老師想說的話。
const MANUAL_TITLE = '📣 Alan 老師提醒';
async function manualSend(env, body, dryRun) {
  const R = { ok: true, dryRun: !!dryRun, today: taipeiToday(), sends: [], skippedDone: [], noBind: [], errors: [] };
  if (!env.LINKS) { R.ok = false; R.errors.push('no_kv'); return R; }
  const target = (body && body.target) || { type: 'all' };
  const note = String((body && body.note) || '').replace(/\s+$/g, '').slice(0, 200).trim();
  R.note = note;
  let links = {};
  try { links = JSON.parse((await env.LINKS.get('links')) || '{}'); } catch (e) {}
  const byStudent = {};
  for (const [uid, arr] of Object.entries(links)) {
    for (const c of (arr || [])) {
      const e = String(c.email).toLowerCase();
      (byStudent[e] = byStudent[e] || { child: c, uids: [] }).uids.push(uid);
    }
  }
  let picked = Object.values(byStudent);
  if (target.type === 'grade') {
    const g = String(target.grade || '').toLowerCase();
    picked = picked.filter((x) => (gradeFromEmail(x.child.email) || String(x.child.grade || '').toLowerCase()) === g);
  } else if (target.type === 'students') {
    const want = (target.emails || []).map((e) => String(e).toLowerCase());
    picked = picked.filter((x) => want.indexOf(String(x.child.email).toLowerCase()) >= 0);
    R.noBind = want.filter((e) => !byStudent[e]);          // 老師選了、但家長還沒綁定
  }
  if (!picked.length) return R;
  const list = await queryHomework(env, picked.map((x) => x.child));
  if (!list) { R.ok = false; R.errors.push('查不到作業（Firebase 服務金鑰有問題？）'); return R; }
  const opts = { title: MANUAL_TITLE, note };
  for (let i = 0; i < list.length; i++) {
    const r = list[i], x = picked[i];
    const nDue = secCount(r.secs.week) + secCount(r.secs.overdue);
    if (!nDue) { R.skippedDone.push(r.name || x.child.email); continue; }
    const alt = hwAlt(r.name, r.secs, opts);
    R.sends.push({ name: r.name, email: x.child.email, to: x.uids.length, sections: r.secs, alt,
      buckets: { thisWeek: secCount(r.secs.week), overdue: secCount(r.secs.overdue), preview: secCount(r.secs.preview) } });
    if (!dryRun) {
      const errs = await lineMulticastFlex(x.uids, alt, hwBubble(r.name, r.secs, opts), hwPlain(r.name, r.secs, opts), env.LINE_TOKEN);
      if (errs.length) R.errors.push('push_failed ' + x.child.email + ': ' + errs.join(','));
    }
  }
  if (!dryRun && R.sends.length) {
    try {
      const log = JSON.parse((await env.LINKS.get('manuallog')) || '[]');
      log.unshift({ at: R.today, target, note, kids: R.sends.map((x) => x.name) });
      await env.LINKS.put('manuallog', JSON.stringify(log.slice(0, 20)));
    } catch (e) {}
  }
  return R;
}

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
  // v425：以前是一份等一份（還包含 2.7MB 的暑假題庫）→ 家長按「作業」要等好幾秒，
  // LINE 先斷線、Worker 跟著被取消，回覆就消失了。改成同時讀，開學後也不讀暑假。
  // v426：作業清單走快取（不再每次下載 1.4MB）、進度只讀這幾個孩子的
  const hwByGrade = {};
  const [lists, summer, progByEmail] = await Promise.all([
    Promise.all(grades.map((g) => getHwList(env, project, token, g, false))),
    today > SUMMER_LAST_DAY ? Promise.resolve({ libWeeks: {}, metaByEmail: {} }) : loadSummer(project, token),
    getProgressFor(env, project, token, children.map((c) => c.email)),
  ]);
  grades.forEach((g, i) => { hwByGrade[g] = lists[i]; });

  const out = [];
  for (const c of children) {
    const email = String(c.email).toLowerCase();
    const grade = gradeOf[email];
    const prog = progByEmail[email] || {};
    const todos = (grade && hwByGrade[grade] ? hwByGrade[grade] : []).slice();
    todos.push(...summerTodos(summer.libWeeks, summer.metaByEmail[email], today));
    const thisWeek = [], overdue = [], preview = [];
    splitTodos(todos, prog.items, today, thisWeek, overdue, preview);
    const secs = {
      week: { groups: weekGroups(thisWeek, grade) },
      overdue: { groups: weekGroups(overdue, grade) },
      preview: { groups: weekGroups(preview, grade) },
    };
    out.push({ name: c.name || prog.name || '', grade, email, secs, empty: !thisWeek.length && !overdue.length && !preview.length });
  }
  return out;
}

// v426：這裡只做「自動提醒」（每天 18:00，照頻率規則）。
// 老師主動發的提醒是另一條路（manualSend），兩邊的紀錄完全分開，互不影響。
async function runReminders(env, dryRun) {
  const R = { ok: true, dryRun: !!dryRun, today: taipeiToday(), homeworkCount: 0, summerStudents: 0,
              sends: [], skippedNoBind: [], skippedQuiet: [], skippedDone: [], errors: [] };
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
  const gList = Object.keys(GRADE_DOCS);
  // 每天的自動提醒一定抓最新的，順便把快取更新（家長之後查作業就是這份）
  const gLists = await Promise.all(gList.map((g) => getHwList(env, project, token, g, true)));
  gList.forEach((g, i) => { hwByGrade[g] = gLists[i]; });
  R.homeworkByGrade = {};
  R.homeworkCount = 0;
  for (const g of Object.keys(hwByGrade)) {
    R.homeworkByGrade[g] = hwByGrade[g].length;
    R.homeworkCount += hwByGrade[g].length;
  }

  // 暑假題庫＋暑假發派——開學後根本用不到，不要去下載那 2.7MB
  const summer = R.today > SUMMER_LAST_DAY ? { libWeeks: {}, metaByEmail: {} } : await loadSummer(project, token);
  const libWeeks = summer.libWeeks;
  const metaByEmail = summer.metaByEmail;
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
  // v425：「已通知過」原本只記在孩子身上，不管是哪個 LINE 收到的——所以老師自己測試時
  //       收過 Eric 的提醒，後來 Eric 的媽媽綁定，她就永遠等不到第一則。改成記在「LINE×孩子」上。
  const hwbind = JSON.parse((await env.LINKS.get('hwbind')) || '{}');
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
    todos.push(...summerTodos(libWeeks, metaByEmail[st.email], today));
    // 記錄每份作業「第一次被看到」的日期（＝發布基準）
    for (const hw of todos) { if (!hwseen[hw.key]) hwseen[hw.key] = today; }

    const uids = emailToUids[st.email];
    if (!uids || !uids.length) { if (todos.length) R.skippedNoBind.push(st.name || st.email); continue; }

    // ── v420：先分三區（本週／前幾週沒完成／可以先預習）────────
    // Alan：「當周作業, 前幾週未完成作業, 可以先預習 都要排版排清楚 不然家長很亂」
    const thisWeek = [], overdue = [], preview = [];
    splitTodos(todos, st.items, today, thisWeek, overdue, preview);
    const nDue = thisWeek.length + overdue.length;
    if (!nDue) { R.skippedDone.push(st.name || st.email); continue; }   // 只剩預習 → 不打擾

    // ── 今天到底要不要發？（不要每天煩同一件事）────────────
    //   ① 有新作業  ② 有剛綁定、還沒收過這位孩子提醒的 LINE  ③ 每週一固定回報  ④ 明天就到期
    const fresh = thisWeek.concat(overdue).filter((hw) => !(((hwsent[hw.key] || {})[st.email]) || []).includes('new'));
    const newbies = uids.filter((u) => !hwbind[u + '|' + st.email]);
    const monday = mondayOf(today);
    const weeklyDue = today === monday && (hwweek[st.email] || '') !== monday;
    const dueTomorrow = thisWeek.some((hw) => hw.dueDate === addDays(today, 1));
    let reason = fresh.length ? 'new' : (weeklyDue ? 'weekly' : (dueTomorrow ? 'due1' : ''));
    let targets = uids;
    if (!reason && newbies.length) { reason = 'bind'; targets = newbies; }   // 只補發給新綁定的那幾個 LINE
    if (!reason) {
      R.skippedQuiet.push({ name: st.name || st.email, why: '這批作業已經通知過了，下次週一或到期前一天會再提醒' });
      continue;
    }

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
      name: st.name, email: st.email, count: nDue, reason, to: targets.length, text, alt,
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
      targets.forEach((u) => { hwbind[u + '|' + st.email] = today; });
      const errs = await lineMulticastFlex(targets, alt, bubble, text, env.LINE_TOKEN);
      if (errs.length) R.errors.push('push_failed ' + st.email + ': ' + errs.join(','));
    }
  }

  if (!dryRun) {
    await env.LINKS.put('hwseen', JSON.stringify(hwseen));
    await env.LINKS.put('hwsent', JSON.stringify(hwsent));
    await env.LINKS.put('hwweek', JSON.stringify(hwweek));
    await env.LINKS.put('hwbind', JSON.stringify(hwbind));
  }
  return R;
}

// v422：把「現查作業」的結果包成 LINE 訊息（一個孩子一張卡，最多 5 張）
async function hwReplyMessages(env, children, opts) {
  const o = opts || {};
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
  // v426：家長問的是某一類（「Tayler 文法寫完了嗎」）→ 先用一句話直接回答
  if (o.cat) {
    const lines = list.map((r) => {
      const label = catZh(r.grade, o.cat);
      const cnt = (sec) => ((sec || {}).groups || []).reduce((a, g) => a + g.rows.filter((x) => x.label === label).reduce((b, x) => b + x.n, 0), 0);
      const w = cnt(r.secs.week), ov = cnt(r.secs.overdue);
      if (!w && !ov) return `🎉 ${r.name} 的${label}都完成了！`;
      return `${r.name} 的${label}：` + [w ? `本週還有 ${w} 項` : '', ov ? `前幾週還有 ${ov} 項` : ''].filter(Boolean).join('、');
    });
    msgs.push({ type: 'text', text: lines.join('\n') });
  }
  for (const r of list) {
    if (msgs.length >= 5) break;
    if (r.empty) { msgs.push({ type: 'text', text: `🎉 ${r.name || ''} 目前沒有未完成的作業，太棒了！` }); continue; }
    msgs.push({ type: 'flex', altText: hwAlt(r.name, r.secs).slice(0, 390), contents: hwBubble(r.name, r.secs) });
  }
  return msgs;
}

// v425：把每一則 LINE 訊息「怎麼處理的、有沒有回成功、花了多久」記下來，
// 老師端🔗分頁看得到——下次再有「沒回應」就不用猜。只留最近 30 筆、不存完整 userId。
async function diagLog(env, entry) {
  if (!env.LINKS) return;
  try {
    const list = JSON.parse((await env.LINKS.get('diag')) || '[]');
    list.unshift(Object.assign({ at: new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(5, 19).replace('T', ' ') }, entry));
    await env.LINKS.put('diag', JSON.stringify(list.slice(0, 30)));
  } catch (e) {}
}
// LINE 的「輸入中…」動畫：要花一兩秒的回覆，家長一按下去就先看到有在處理
async function lineLoading(uid, token) {
  try {
    return await fetch(LINE_API + '/v2/bot/chat/loading/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ chatId: uid, loadingSeconds: 20 }),
    });
  } catch (e) { return null; }
}
async function pushMessages(to, messages, token) {
  return fetch(LINE_API + '/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ to, messages: messages.slice(0, 5) }),
  });
}
// 一則 LINE 事件的完整處理（在 waitUntil 裡跑，LINE 早就收到 200 了）
async function processEvent(env, ev) {
  const t0 = Date.now();
  const uid = ev.source && ev.source.userId;
  const D = { u: uid ? '…' + String(uid).slice(-6) : '', type: ev.type, text: ev.message && ev.message.text ? String(ev.message.text).slice(0, 30) : '' };
  try {
    let messages = null;
    if (ev.type === 'follow' && ev.replyToken) {
      messages = [{ type: 'text', text: await welcomeMessage(env, uid) }];
      D.kind = 'welcome';
    } else if (ev.type === 'message' && ev.message && ev.message.type === 'text' && ev.replyToken && uid && env.LINKS) {
      let loadingP = null;
      const hooks = { slow: () => { if (!loadingP) loadingP = lineLoading(uid, env.LINE_TOKEN); } };
      const r = await handleMessage(env, uid, ev.message.text, hooks);
      D.path = hooks.path;
      if (hooks.aiMs != null) D.aiMs = hooks.aiMs;
      if (r && r.hw) {
        hooks.slow();
        messages = await hwReplyMessages(env, r.hw, { cat: r.cat });
        D.kind = 'homework'; D.kids = r.hw.length;
      }
      else if (r && r.contact) { messages = contactMessages(env); D.kind = 'contact'; }
      else if (typeof r === 'string' && r.trim()) { messages = [{ type: 'text', text: r }]; D.kind = 'text'; }
      else { D.kind = 'quiet'; }
      if (loadingP) await loadingP;
    } else { D.kind = 'ignored'; }

    if (messages && messages.length) {
      messages = withQuickReply(messages);                  // v427：底下都有快速按鈕
      const res = await lineReplyMessages(ev.replyToken, messages, env.LINE_TOKEN);
      D.reply = res ? res.status : 0;
      if (!res || !res.ok) {
        D.replyErr = res ? (await res.text().catch(() => '')).slice(0, 160) : 'no_response';
        // 回覆權杖過期之類的 → 改用 push 補送（只在失敗時，才不會吃掉每月額度）
        if (uid) {
          const p = await pushMessages(uid, messages, env.LINE_TOKEN);
          D.push = p.status;
          if (!p.ok) D.pushErr = (await p.text().catch(() => '')).slice(0, 160);
        }
      }
    }
  } catch (e) {
    D.err = String((e && e.stack) || e).slice(0, 200);
  }
  D.ms = Date.now() - t0;                                   // 家長等待的時間（到回覆送出為止）
  await Promise.all([diagLog(env, D), flushBg()]);         // 背景更新快取：回覆已經送出了才做
}

// ── main ─────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
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
      // v425：先回 200 給 LINE，再慢慢處理。以前是全部做完才回——「作業」要讀好幾份
      // Firestore，LINE 等不及就斷線，Cloudflare 看到對方斷線會把整個 Worker 取消，
      // 回覆根本送不出去（Candy 按兩次「查詢作業」都石沉大海就是這樣）。
      const work = Promise.all((payload.events || []).map((ev) => processEvent(env, ev)));
      if (ctx && ctx.waitUntil) ctx.waitUntil(work); else await work;
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

    // v426：老師主動提醒（跟自動提醒分開）
    if (request.method === 'POST' && path === '/manual') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const R = await manualSend(env, body, url.searchParams.get('dry') === '1');
      return json(R, 200, origin);
    }

    // v425：最近 30 則 LINE 訊息的處理紀錄（老師端🔗分頁用）
    if (request.method === 'GET' && path === '/diag') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      const list = JSON.parse((env.LINKS && (await env.LINKS.get('diag'))) || '[]');
      return json({ ok: true, list }, 200, origin);
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
  queryHomework, hwReplyMessages, processEvent, handleMessage, aiUnderstand, aiSystem, clipReply, REPLY_MAX, manualSend, quickRoute, contactMessages, withQuickReply, nameIn, aiUsedToday, AI_DAILY, CONTACT_RE, QUICK_ITEMS, getHwList, getProgressFor, getRoster, flushBg, MEM, FAST, HW_TTL_MS, MANUAL_TITLE, menuText, INTENT, POLITE, politeReply, splitTodos, summerTodos, SUMMER_LAST_DAY,
  catRows, weekGroups, hwBubble, hwPlain, hwAlt, catZh, CAT_ZH, SEC_DEF, summerLibMeta,
};
