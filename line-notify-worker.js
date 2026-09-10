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
      const token = await getAccessToken(sa);
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

function askNameLine(english) {
  return english
    ? '請直接回覆孩子的英文名字（就是康橋帳號上的英文名字，例如：Eric）。\n大小寫、空格都沒關係 👌'
    : '請直接回覆孩子的姓名（例如：王小明）。';
}
function welcomeText(english) {
  return (
    '再一個小步驟就完成囉 📌\n\n' +
    askNameLine(english) + '\n\n' +
    `有兩位孩子的話，可以一次輸入，例如：\n${english ? 'Eric & Tayler' : '王小明 & 王小美'}\n\n` +
    '綁定完成後，班級通知與作業提醒都會傳到這裡 📩'
  );
}
function doneText(children, english) {
  return (
    '綁定完成 🎉\n\n目前這個 LINE 已綁定：\n' + listChildren(children) + '\n\n' +
    '之後班級通知與作業提醒都會傳到這裡 📩\n' +
    `（要再新增孩子，隨時回覆他的${english ? '英文名字' : '姓名'}就可以；一個 LINE 最多 ${MAX_CHILDREN} 位）`
  );
}

// 加好友時的歡迎（接在官方帳號原本的歡迎訊息後面）
async function welcomeMessage(env) {
  let english = true;
  try { english = rosterAllEnglish(await getRoster(env)); } catch (e) {}
  return welcomeText(english);
}

async function handleNameBinding(env, lineUserId, rawText) {
  const text = String(rawText || '').trim();
  const roster = await getRoster(env);
  const english = rosterAllEnglish(roster);
  let links = {};
  try { links = JSON.parse((await env.LINKS.get('links')) || '{}'); } catch (e) {}
  const bound = links[lineUserId] || [];
  const stage = await getStage(env, lineUserId);

  // 名單還沒就緒
  if (!activeRoster(roster).length) return '系統名單尚未就緒，請稍後再試，或直接聯絡 Alan 老師 🙏';

  // 「查詢」
  if (ASK_RE.test(text)) {
    if (!bound.length) return '這個 LINE 還沒有綁定任何孩子 🙌\n\n' + askNameLine(english);
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
  if (!names.length) return askNameLine(english);

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
    const who = bad[0] || text;
    if (english && hasCJK(who)) {
      return '我們的名單是用「英文名字」登記的 📝\n\n' + askNameLine(english) + '\n\n找不到的話請直接聯絡 Alan 老師 🙏';
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

// 從 class/data 整理出「有期限的作業」清單
function buildHomeworkList(cls) {
  const weeks = (cls && cls.weeks) || {};
  const out = [];
  for (const wid of Object.keys(weeks)) {
    const wk = weeks[wid] || {};
    const hw = wk.homework || {};
    const titleById = {};
    const items = wk.items || {};
    for (const cat of Object.keys(items)) {
      for (const it of (items[cat] || [])) { if (it && it.id) titleById[it.id] = it.title || it.id; }
    }
    for (const itemId of Object.keys(hw)) {
      const dd = hw[itemId] && hw[itemId].dueDate;
      if (!dd) continue;
      out.push({ wid, itemId, key: wid + '_' + itemId, title: titleById[itemId] || itemId, dueDate: dd });
    }
  }
  return out;
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
function summerLibTitle(libWeeks, sw, itemId) {
  const wk = libWeeks['sl-2026-' + sw] || {};
  const items = wk.items || {};
  for (const cat of Object.keys(items)) for (const it of (items[cat] || [])) if (it && it.id === itemId) return it.title || itemId;
  return itemId;
}

async function runReminders(env, dryRun) {
  const R = { ok: true, dryRun: !!dryRun, today: taipeiToday(), homeworkCount: 0, summerStudents: 0, sends: [], skippedNoBind: [], errors: [] };
  if (!env.FIREBASE_SA) { R.ok = false; R.errors.push('no_firebase_sa'); return R; }
  if (!env.LINKS) { R.ok = false; R.errors.push('no_kv'); return R; }
  let sa;
  try { sa = JSON.parse(env.FIREBASE_SA); } catch (e) { R.ok = false; R.errors.push('bad_firebase_sa_json'); return R; }
  const project = sa.project_id;
  let token;
  try { token = await getAccessToken(sa); } catch (e) { R.ok = false; R.errors.push('auth_error: ' + String(e)); return R; }
  if (!token) { R.ok = false; R.errors.push('no_access_token（金鑰或權限有問題）'); return R; }

  // 作業清單（class/data，公開資料）
  const clsDoc = await firestoreGet(project, token, 'class/data');
  const cls = clsDoc && clsDoc.fields ? fsVal({ mapValue: { fields: clsDoc.fields } }) : {};
  const homeworks = buildHomeworkList(cls);
  R.homeworkCount = homeworks.length;

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

  const links = JSON.parse((await env.LINKS.get('links')) || '{}');
  const hwseen = JSON.parse((await env.LINKS.get('hwseen')) || '{}');
  const hwsent = JSON.parse((await env.LINKS.get('hwsent')) || '{}');
  const today = R.today;

  const emailToUids = {};
  for (const [uid, arr] of Object.entries(links)) {
    for (const x of (arr || [])) {
      const e = String(x.email).toLowerCase();
      (emailToUids[e] = emailToUids[e] || []).push(uid);
    }
  }

  for (const st of students) {
    // 這位學生要追蹤的作業＝學期作業（全班）＋暑假發派給他的單元
    const todos = homeworks.slice();
    const plan = metaByEmail[st.email];
    if (plan && plan.weeks) {
      for (const sw of Object.keys(plan.weeks)) {
        const due = SUMMER_WEEK_END[sw];
        if (!due) continue;
        const libWid = 'sl-2026-' + sw;
        for (const itemId of (plan.weeks[sw] || [])) {
          todos.push({ wid: libWid, itemId, key: libWid + '_' + itemId, title: summerLibTitle(libWeeks, sw, itemId), dueDate: due });
        }
      }
    }
    // 記錄每份作業「第一次被看到」的日期（＝發布基準）
    for (const hw of todos) { if (!hwseen[hw.key]) hwseen[hw.key] = today; }

    const uids = emailToUids[st.email];
    if (!uids || !uids.length) { if (todos.length) R.skippedNoBind.push(st.name || st.email); continue; }
    const lines = [];
    for (const hw of todos) {
      if (today > hw.dueDate) continue;                // 過期不再提醒
      if (isDone(st.items, hw.wid, hw.itemId)) continue;
      const sent = (hwsent[hw.key] && hwsent[hw.key][st.email]) || [];
      const firstSeen = hwseen[hw.key] || today;
      const sinceSeen = dateDiffDays(today, firstSeen);
      const toDue = dateDiffDays(hw.dueDate, today);
      let ms = null;
      if (!sent.includes('new')) ms = 'new';
      else if (toDue === 1 && !sent.includes('due1')) ms = 'due1';
      else if (sinceSeen >= 5 && toDue >= 1 && !sent.includes('d5')) ms = 'd5';
      else if (sinceSeen >= 3 && toDue >= 1 && !sent.includes('d3')) ms = 'd3';
      if (!ms) continue;
      const dd = fmtDate(hw.dueDate);
      if (ms === 'new') lines.push(`• ${hw.title}（新作業，${dd} 到期）`);
      else if (ms === 'due1') lines.push(`• ${hw.title}（⚠️ 明天 ${dd} 到期！）`);
      else lines.push(`• ${hw.title}（${dd} 到期，剩 ${toDue} 天）`);
      if (!dryRun) {
        hwsent[hw.key] = hwsent[hw.key] || {};
        hwsent[hw.key][st.email] = sent.concat([ms]);
      }
    }
    if (lines.length) {
      R.sends.push({ name: st.name, email: st.email, count: lines.length, lines });
      if (!dryRun) {
        const text = `📚 作業提醒 — ${st.name || ''}\n還有 ${lines.length} 份作業要完成：\n${lines.join('\n')}\n\n請提醒孩子完成 💪 — Alan 老師`;
        const errs = await lineMulticast(uids, text, env.LINE_TOKEN);
        if (errs.length) R.errors.push('push_failed ' + st.email + ': ' + errs.join(','));
      }
    }
  }

  if (!dryRun) {
    await env.LINKS.put('hwseen', JSON.stringify(hwseen));
    await env.LINKS.put('hwsent', JSON.stringify(hwsent));
  }
  return R;
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
            await lineReply(ev.replyToken, await welcomeMessage(env), env.LINE_TOKEN);
          } else if (ev.type === 'message' && ev.message && ev.message.type === 'text' && ev.replyToken) {
            const uid = ev.source && ev.source.userId;
            if (uid && env.LINKS) await lineReply(ev.replyToken, await handleNameBinding(env, uid, ev.message.text), env.LINE_TOKEN);
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
export { handleNameBinding, welcomeMessage, welcomeText, doneText, rosterAllEnglish, matchOne, parseNames, splitNames, MAX_CHILDREN };
