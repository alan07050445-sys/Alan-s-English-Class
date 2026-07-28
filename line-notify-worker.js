/*
 * Alan's English Class — LINE 通知 Worker（v3：加「作業自動提醒」功能B）
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
const WELCOME =
  '歡迎加入 Alan\'s English Class 👋\n\n' +
  '請直接回覆孩子的姓名完成綁定（例如：王小明）。\n' +
  '有多位孩子請分別輸入姓名。\n\n' +
  '綁定後，班級通知與作業提醒都會傳到這裡 📩';

async function handleNameBinding(env, lineUserId, rawText) {
  const name = norm(rawText);
  const roster = JSON.parse((await env.LINKS.get('roster')) || '[]');
  const links = JSON.parse((await env.LINKS.get('links')) || '{}');
  const existing = links[lineUserId] || [];
  if (!roster.length) return '系統名單尚未就緒，請稍後再試，或直接聯絡 Alan 老師 🙏';
  const matches = roster.filter((s) => s.active !== false && norm(s.name) === name && name);
  if (matches.length === 0) {
    if (existing.length) return '您已完成綁定 👍\n若要新增其他孩子，請輸入他的姓名；其他問題請直接聯絡 Alan 老師。';
    return `找不到「${rawText.trim()}」這位學生 🤔\n請確認姓名與報名時一致，或直接聯絡 Alan 老師。`;
  }
  if (matches.length > 1) return `有多位同名「${rawText.trim()}」，請直接聯絡 Alan 老師協助綁定 🙏`;
  const s = matches[0];
  if (existing.some((x) => x.email === s.email)) return `${s.name}（${gradeLabel(s.grade)}）已經綁定過了 👍`;
  existing.push({ email: s.email, name: s.name, grade: s.grade || '' });
  links[lineUserId] = existing;
  await env.LINKS.put('links', JSON.stringify(links));
  return `✅ 已綁定 ${s.name}（${gradeLabel(s.grade)}）！\n之後班級通知與作業提醒都會傳到這裡。`;
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
            await lineReply(ev.replyToken, WELCOME, env.LINE_TOKEN);
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
