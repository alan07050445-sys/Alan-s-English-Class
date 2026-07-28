/*
 * Alan's English Class — LINE 通知 Worker
 * ────────────────────────────────────────────────────────────
 * 這是一支「獨立」的 Cloudflare Worker，專門負責發 LINE 訊息，
 * 跟你原本的 AI Worker（alan-ai-proxy）分開，互不影響。
 *
 * ▍部署方式（在 Cloudflare 網頁後台）
 *   1. dashboard.cloudflare.com → Workers & Pages → Create → Worker
 *   2. 名稱取【 alan-line 】（這樣網址會是 alan-line.alan07050445.workers.dev，
 *      跟前端 data.js 的 LINE_ENDPOINT 對得上；取別的名字就要去改那行）
 *   3. Deploy 後點「Edit code」，把這整個檔案內容貼上去 → 再 Deploy
 *   4. Settings → Variables and Secrets，加 3 個「Secret」：
 *        LINE_TOKEN  = 你 Issue 的 Channel access token（很長那串）
 *        ADMIN_PASS  = 你自訂的管理密碼（發公告時要輸入，只有你知道）
 *        LINE_SECRET = Channel secret（階段一用不到，先貼著，階段二 webhook 才用）
 *   5. 存檔後就完成。
 *
 * ▍路由
 *   GET  /            → 健康檢查（瀏覽器打開網址會看到 {"ok":true}）
 *   POST /broadcast   → body: { text }  header: x-admin-pass
 *                       發訊息給「所有加官方帳號好友的人」
 */

const LINE_BROADCAST = 'https://api.line.me/v2/bot/message/broadcast';

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

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';
    const url = new URL(request.url);

    // 瀏覽器預檢
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // 健康檢查
    if (request.method === 'GET' && url.pathname === '/') {
      return json({ ok: true, service: 'alan-line-notify' }, 200, origin);
    }

    // 發公告
    if (request.method === 'POST' && url.pathname === '/broadcast') {
      // 1) 驗證管理密碼（擋掉不是老師的人亂發）
      const pass = request.headers.get('x-admin-pass') || '';
      if (!env.ADMIN_PASS || pass !== env.ADMIN_PASS) {
        return json({ ok: false, error: 'unauthorized' }, 401, origin);
      }

      // 2) 取出訊息內容
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const text = String((body && body.text) || '').trim();
      if (!text) return json({ ok: false, error: 'empty' }, 400, origin);
      if (text.length > 4900) return json({ ok: false, error: 'too_long' }, 400, origin);

      // 3) 打 LINE broadcast API
      let res;
      try {
        res = await fetch(LINE_BROADCAST, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + env.LINE_TOKEN,
          },
          body: JSON.stringify({ messages: [{ type: 'text', text }] }),
        });
      } catch (e) {
        return json({ ok: false, error: 'network', detail: String(e) }, 502, origin);
      }

      if (res.ok) return json({ ok: true }, 200, origin);

      const detail = await res.text().catch(() => '');
      return json({ ok: false, error: 'line_error', status: res.status, detail }, 502, origin);
    }

    return json({ ok: false, error: 'not_found' }, 404, origin);
  },
};
