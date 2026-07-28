/*
 * Alan's English Class — LINE 通知 Worker（v2：加「學生綁定」地基）
 * ────────────────────────────────────────────────────────────
 * 獨立 Worker（跟 AI Worker 分開）。負責：發公告 + 家長自助綁定。
 *
 * ▍需要的環境變數 / 綁定
 *   Secret  LINE_TOKEN   = Channel access token（發訊息用）
 *   Secret  LINE_SECRET  = Channel secret（驗證 webhook 來源用）
 *   Secret  ADMIN_PASS   = 管理密碼（後台呼叫用）
 *   KV      LINKS        = Workers KV 命名空間，綁定變數名稱取【 LINKS 】
 *                          （存 roster 名單快取 + 家長綁定資料）
 *
 * ▍LINE 官方帳號要設定
 *   Webhook URL = https://alan-line.alan07050445.workers.dev/webhook
 *   開啟「使用 Webhook」；關閉「自動回應訊息」（改由本 Worker 回覆）。
 *
 * ▍路由
 *   GET  /             健康檢查
 *   POST /broadcast    {text}                  → 發給所有好友（全班公告）
 *   POST /webhook      LINE 事件（加好友/訊息）  → 自助綁定
 *   POST /sync-roster  {roster:[...]}           → App 同步學生名單到 KV
 *   GET  /links                                 → 後台讀綁定狀態
 *   POST /unlink       {lineUserId, email?}     → 後台解除綁定
 *   （admin 路由都要 header x-admin-pass）
 */

const LINE_API = 'https://api.line.me';

// ── helpers ──────────────────────────────────────────────
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
const norm = (s) => String(s || '').replace(/\s+/g, '').trim();      // 去空白比對姓名
const gradeLabel = (g) => (g ? String(g).toUpperCase() : '');

// 驗證 LINE webhook 簽章（HMAC-SHA256(body, channelSecret) == x-line-signature）
async function verifyLineSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    'raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc(rawBody));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return b64 === signature;
}

// LINE 回覆（用 replyToken，webhook 當下免費回）
async function lineReply(replyToken, text, token) {
  return fetch(LINE_API + '/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  });
}

// ── 綁定訊息文案 ─────────────────────────────────────────
const WELCOME =
  '歡迎加入 Alan\'s English Class 👋\n\n' +
  '請直接回覆孩子的姓名完成綁定（例如：王小明）。\n' +
  '有多位孩子請分別輸入姓名。\n\n' +
  '綁定後，班級通知與作業提醒都會傳到這裡 📩';

// 處理一則家長輸入的姓名 → 嘗試綁定，回傳要回覆的文字
async function handleNameBinding(env, lineUserId, rawText) {
  const name = norm(rawText);
  const roster = JSON.parse((await env.LINKS.get('roster')) || '[]');
  const links = JSON.parse((await env.LINKS.get('links')) || '{}');
  const existing = links[lineUserId] || [];

  if (!roster.length) {
    return '系統名單尚未就緒，請稍後再試，或直接聯絡 Alan 老師 🙏';
  }

  const matches = roster.filter((s) => s.active !== false && norm(s.name) === name && name);

  if (matches.length === 0) {
    if (existing.length) {
      return '您已完成綁定 👍\n若要新增其他孩子，請輸入他的姓名；其他問題請直接聯絡 Alan 老師。';
    }
    return `找不到「${rawText.trim()}」這位學生 🤔\n請確認姓名與報名時一致，或直接聯絡 Alan 老師。`;
  }
  if (matches.length > 1) {
    return `有多位同名「${rawText.trim()}」，請直接聯絡 Alan 老師協助綁定 🙏`;
  }

  const s = matches[0];
  if (existing.some((x) => x.email === s.email)) {
    return `${s.name}（${gradeLabel(s.grade)}）已經綁定過了 👍`;
  }
  existing.push({ email: s.email, name: s.name, grade: s.grade || '' });
  links[lineUserId] = existing;
  await env.LINKS.put('links', JSON.stringify(links));
  return `✅ 已綁定 ${s.name}（${gradeLabel(s.grade)}）！\n之後班級通知與作業提醒都會傳到這裡。`;
}

// ── main ─────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // 健康檢查
    if (request.method === 'GET' && path === '/') {
      return json({ ok: true, service: 'alan-line-notify', kv: !!env.LINKS }, 200, origin);
    }

    // ── LINE Webhook（家長加好友 / 傳訊息）──
    if (request.method === 'POST' && path === '/webhook') {
      const raw = await request.text();
      const sig = request.headers.get('x-line-signature');
      if (!(await verifyLineSignature(raw, sig, env.LINE_SECRET))) {
        return json({ ok: false, error: 'bad_signature' }, 401, origin);
      }
      let payload = {};
      try { payload = JSON.parse(raw); } catch (e) {}
      const events = payload.events || [];
      for (const ev of events) {
        try {
          if (ev.type === 'follow' && ev.replyToken) {
            await lineReply(ev.replyToken, WELCOME, env.LINE_TOKEN);
          } else if (ev.type === 'message' && ev.message && ev.message.type === 'text' && ev.replyToken) {
            const uid = ev.source && ev.source.userId;
            if (uid && env.LINKS) {
              const reply = await handleNameBinding(env, uid, ev.message.text);
              await lineReply(ev.replyToken, reply, env.LINE_TOKEN);
            }
          }
        } catch (e) { /* 單一事件失敗不影響其他 */ }
      }
      return json({ ok: true }, 200, origin); // LINE 需要 200
    }

    // ── 以下為後台管理路由：需要 admin 密碼 ──
    const adminOk = (request.headers.get('x-admin-pass') || '') === (env.ADMIN_PASS || '__none__');

    // 發全班公告（給所有好友）
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
      } catch (e) {
        return json({ ok: false, error: 'network', detail: String(e) }, 502, origin);
      }
      if (res.ok) return json({ ok: true }, 200, origin);
      const detail = await res.text().catch(() => '');
      return json({ ok: false, error: 'line_error', status: res.status, detail }, 502, origin);
    }

    // App 同步學生名單到 KV（供 webhook 比對姓名）
    if (request.method === 'POST' && path === '/sync-roster') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      if (!env.LINKS) return json({ ok: false, error: 'no_kv' }, 500, origin);
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const roster = Array.isArray(body.roster) ? body.roster : [];
      const clean = roster
        .filter((s) => s && s.email && s.name)
        .map((s) => ({ email: String(s.email).toLowerCase(), name: s.name, grade: s.grade || '', active: s.active !== false }));
      await env.LINKS.put('roster', JSON.stringify(clean));
      return json({ ok: true, count: clean.length }, 200, origin);
    }

    // 後台讀綁定狀態
    if (request.method === 'GET' && path === '/links') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      if (!env.LINKS) return json({ ok: false, error: 'no_kv' }, 500, origin);
      const links = JSON.parse((await env.LINKS.get('links')) || '{}');
      const roster = JSON.parse((await env.LINKS.get('roster')) || '[]');
      return json({ ok: true, links, roster }, 200, origin);
    }

    // 後台解除綁定
    if (request.method === 'POST' && path === '/unlink') {
      if (!adminOk) return json({ ok: false, error: 'unauthorized' }, 401, origin);
      if (!env.LINKS) return json({ ok: false, error: 'no_kv' }, 500, origin);
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const uid = body.lineUserId;
      const email = body.email;
      const links = JSON.parse((await env.LINKS.get('links')) || '{}');
      if (uid && links[uid]) {
        if (email) {
          links[uid] = links[uid].filter((x) => x.email !== email);
          if (!links[uid].length) delete links[uid];
        } else {
          delete links[uid];
        }
        await env.LINKS.put('links', JSON.stringify(links));
      }
      return json({ ok: true }, 200, origin);
    }

    return json({ ok: false, error: 'not_found' }, 404, origin);
  },
};
