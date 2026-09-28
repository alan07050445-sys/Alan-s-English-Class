// alan-ai-proxy —— Cloudflare Worker
// 改這個檔案之後，要自己貼到 Cloudflare → Workers → alan-ai-proxy → 編輯 → Deploy
//
// v458b：修「有時候晚上 AI 不能用」
//   實測：代理會間歇性回 403 {"error":{"type":"forbidden","message":"Request not allowed"}}
//   這個 body 是 api.anthropic.com 原樣轉回來的（本 Worker 沒有任何擋人的程式），
//   而且沒有 request_id ＝ 根本沒進到模型，是上游的邊緣防護擋掉的。
//   兩個對策：
//     ① 轉出去的請求補上 user-agent（Worker 的 fetch 預設不帶，沒有 UA 的請求最容易被擋）
//     ② 被擋就在 Worker 裡面直接重試（伺服器對伺服器，比較快，學生端完全看不到）

const UA = 'alans-english-class/1.0 (+https://alan07050445-sys.github.io/Alan-s-English-Class/)';

// 這些狀態代表「現在不讓你過」，不是「你寫錯了」——值得重試
const RETRYABLE = new Set([403, 408, 429, 500, 502, 503, 504, 529]);
const RETRY_WAIT = [250, 700, 1500];   // 毫秒；最多重試 3 次

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });

    const url = new URL(request.url);

    // 朗讀：OpenAI 真人語音（gpt-4o-mini-tts）——自然、有抑揚頓挫、標點會停頓
    if (url.pathname === '/tts') {
      // 想換聲音就改這一行：coral(親切) / nova(清亮) / shimmer(柔) / alloy(中性) / fable(英腔) / sage / ash
      const VOICE = 'fable';
      const STYLE =
        'Read the text aloud like a warm, friendly elementary-school English teacher ' +
        'speaking to young learners. Use a clear, gentle, unhurried pace. Give the words ' +
        'natural, lively intonation — let your pitch rise and fall expressively, never flat ' +
        'and never robotic. Pause briefly at commas and stop fully at periods. ' +
        'Pronounce every word clearly and warmly.';

      const toB64 = async (out) => {
        if (typeof out === 'string') return out;
        if (out && typeof out.audio === 'string') return out.audio;
        let buf;
        if (out instanceof Response) buf = await out.arrayBuffer();
        else if (out instanceof ReadableStream) buf = await new Response(out).arrayBuffer();
        else if (out instanceof ArrayBuffer) buf = out;
        else if (out && out.buffer) buf = out.buffer;
        else throw new Error('unknown audio format');
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(bin);
      };

      try {
        const { text } = await request.json();
        const clean = String(text || '').slice(0, 4000);
        if (!clean.trim()) {
          return new Response(JSON.stringify({ error: 'no text' }), {
            status: 400, headers: { 'content-type': 'application/json', ...cors },
          });
        }
        const r = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${String(env.OPENAI_API_KEY || '').replace(/\s+/g, '')}`,
            'content-type': 'application/json',
            'user-agent': UA,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini-tts',
            voice: VOICE,
            input: clean,
            instructions: STYLE,
            response_format: 'mp3',
          }),
        });
        if (!r.ok) {
          const detail = await r.text().catch(() => '');
          return new Response(JSON.stringify({ error: 'openai ' + r.status, detail: detail.slice(0, 300) }), {
            status: 502, headers: { 'content-type': 'application/json', ...cors },
          });
        }
        const audio = await toB64(r);
        return new Response(JSON.stringify({ audio }), {
          headers: { 'content-type': 'application/json', ...cors },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500, headers: { 'content-type': 'application/json', ...cors },
        });
      }
    }

    // AI 出題／批改代理（Claude）
    const body = await request.text();
    const headers = {
      'content-type': 'application/json',
      'accept': 'application/json',
      // 沒有 user-agent 的請求最容易被上游的邊緣防護當成機器人擋掉
      'user-agent': UA,
      'x-api-key': String(env.ANTHROPIC_API_KEY || '').trim(),
      'anthropic-version': '2023-06-01',
    };
    const beta = request.headers.get('anthropic-beta');
    if (beta) headers['anthropic-beta'] = beta;

    let res = null;
    let lastErr = '';
    let tries = 0;

    for (let attempt = 0; attempt <= RETRY_WAIT.length; attempt++) {
      tries = attempt + 1;
      try {
        res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body });
        if (!RETRYABLE.has(res.status)) break;   // 成功，或是我們自己寫錯（400/401）——不用重試
        lastErr = 'status ' + res.status;
      } catch (e) {
        res = null;
        lastErr = String(e);
      }
      if (attempt < RETRY_WAIT.length) await sleep(RETRY_WAIT[attempt]);
    }

    // 連線整個失敗（沒有回應可以轉）
    if (!res) {
      return new Response(JSON.stringify({
        error: { type: 'upstream_unreachable', message: lastErr, tries },
      }), { status: 502, headers: { 'content-type': 'application/json', ...cors } });
    }

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        'content-type': 'application/json',
        // 方便之後查：這次總共送了幾趟才拿到結果
        'x-proxy-tries': String(tries),
        ...cors,
      },
    });
  },
};
