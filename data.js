// data.js — Seed content + storage helpers
// Plain JS (not JSX). Exports to window so other scripts can use it.

// ── Firebase config ────────────────────────────────────
// 請到 Firebase Console > Project Settings > Your apps 複製設定貼在這裡
const firebaseConfig = {
  apiKey:            'AIzaSyD1fQDneiwkGhbMOUxpOzVxZi8EIkourAs',
  authDomain:        'alan-s-english-class.firebaseapp.com',
  projectId:         'alan-s-english-class',
  storageBucket:     'alan-s-english-class.firebasestorage.app',
  messagingSenderId: '113180818799',
  appId:             '1:113180818799:web:fff201f706d5c90b5f3c9a',
};
firebase.initializeApp(firebaseConfig);
const _db      = firebase.firestore();
const _storage = firebase.storage();
/* v387: 預設重試上限是 600 秒——一頁遇到爛網路就會把整個 PDF 匯入卡住十分鐘、
   而且畫面上什麼都不會說。縮到 90 秒，寧可快點報錯讓老師重來。 */
try { _storage.setMaxUploadRetryTime(90000); _storage.setMaxOperationRetryTime(60000); } catch (e) {}
const _auth    = firebase.auth();
const _classDoc = _db.collection('class').doc('data');

// ── 🔑 擁有者信箱（v337）──────────────────────────────────────────────
// 寫死＝永遠是管理者，不會被鎖在外面、也不會被別人移除。
// 其他老師改存資料庫 admins 集合（後台可增減）——見下方 isAdminUser。
// ⚠ 提醒：這裡只是「介面判斷」，真正的防線是 firestore.rules / storage.rules。
const OWNER_EMAILS = ['alan07050445@gmail.com'];
const ADMIN_EMAILS = OWNER_EMAILS; // 保留舊名稱，避免其他地方引用出錯

const CATEGORIES = [
  {
    id: "vocab",
    num: "01",
    title: "FET Vocabulary",
    titleZh: "外師單字",
    desc: "Build vocabulary through Quizlet flashcards and Wordwall games — words from this week's FET lesson.",
    descZh: "本週外師課堂單字練習，透過 Quizlet 與 Wordwall 反覆練習，建立紮實的字彙基礎。",
  },
  {
    id: "grammar",
    num: "02",
    title: "Grammar",
    titleZh: "文法",
    desc: "Sentence patterns and grammar drills. Watch the explanation, then practice.",
    descZh: "本週文法重點：例句說明、影片解析、線上練習與評量。",
  },
  {
    id: "word",
    num: "03",
    title: "Word Study",
    titleZh: "字根字首",
    desc: "Roots, prefixes, suffixes — learn how words are built so you can decode unfamiliar ones.",
    descZh: "從字根字首認識單字結構，學會自己拆解陌生單字。",
  },
  {
    id: "reading",
    num: "04",
    title: "Reading Comprehension",
    titleZh: "閱讀理解",
    desc: "Short passages with comprehension questions. Read first, then answer.",
    descZh: "短文閱讀加上閱讀測驗題目，培養閱讀理解的速度與準確度。",
  },
];

// Week 14 — Mar 31 – Apr 6, 2025 (seed content)
const SEED_WEEKS = {
  "2025-W14": {
    id: "2025-W14",
    label: "Week 14",
    dateRange: "Mar 31 – Apr 6",
    theme: "Aesop's Fables",
    themeZh: "伊索寓言",
    subtitle: "Fable is a short story to teach readers a lesson (moral).",
    subtitleZh: "本週主題：伊索寓言是一個小短文，目的是為了讓讀者學到教訓！！！",
    items: {
      vocab: [
        {
          id: "v1",
          type: "quizlet",
          title: "Aesop's Fables 單字",
          zh: "20 個本週核心單字",
          duration: "15 min",
          url: "https://quizlet.com/_8z9abc",
          embed: "https://quizlet.com/731289345/match/embed",
        },
        {
          id: "v2",
          type: "wordwall",
          title: "Match the Animal to Its Home",
          zh: "把動物配對到棲息地",
          duration: "10 min",
          url: "https://wordwall.net/play/12345/animals",
          embed: "https://wordwall.net/embed/12345",
        },
        {
          id: "v3",
          type: "pdf",
          title: "Vocabulary Practice Worksheet",
          zh: "單字練習卷（可下載列印）",
          duration: "20 min",
          url: "/files/wk14-vocab.pdf",
        },
      ],
      grammar: [
        {
          id: "g1",
          type: "youtube",
          title: "Present Continuous — The Basics",
          zh: "現在進行式 — 觀念講解",
          duration: "8 min",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          embed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        },
        {
          id: "g2",
          type: "wordwall",
          title: "Be + V-ing Practice",
          zh: "現在進行式練習題",
          duration: "12 min",
          url: "https://wordwall.net/play/12346/grammar",
          embed: "https://wordwall.net/embed/12346",
        },
        {
          id: "g3",
          type: "form",
          title: "Weekly Grammar Quiz",
          zh: "本週文法小考",
          duration: "10 min",
          url: "https://forms.gle/abcdefghij",
          embed: "https://docs.google.com/forms/d/e/abcdefghij/viewform?embedded=true",
        },
      ],
      word: [
        {
          id: "w1",
          type: "note",
          title: "Root: '-bio-' means life",
          zh: "字根 -bio- 表示「生命」",
          duration: "5 min read",
          body: "The root '-bio-' comes from Greek and means 'life'.\n\nExamples:\n• biology — the study of life\n• biography — a written life story\n• biodegradable — able to be broken down by living things\n• antibiotic — against living organisms (bacteria)\n\nTip: When you see '-bio-' in a word, think of anything related to living things.",
        },
        {
          id: "w2",
          type: "quizlet",
          title: "Root Words: bio, geo, photo",
          zh: "字根練習卡：bio / geo / photo",
          duration: "15 min",
          url: "https://quizlet.com/_root123",
          embed: "https://quizlet.com/731289346/match/embed",
        },
      ],
      reading: [
        {
          id: "r1",
          type: "note",
          title: "The Polar Bear's Home",
          zh: "閱讀短文：北極熊的家",
          duration: "10 min",
          body: "Polar bears live in the Arctic, one of the coldest places on Earth. Their thick white fur keeps them warm and helps them blend into the snow and ice.\n\nA polar bear's diet is mostly seals, which it hunts on the sea ice. As the Arctic gets warmer, the sea ice is melting earlier each year. This makes it harder for polar bears to find food.\n\nScientists are working to protect the Arctic so that polar bears can have a home for many years to come.",
        },
        {
          id: "r2",
          type: "wordwall",
          title: "Reading Comprehension Quiz",
          zh: "閱讀測驗（選擇題）",
          duration: "15 min",
          url: "https://wordwall.net/play/12347/reading",
          embed: "https://wordwall.net/embed/12347",
        },
        {
          id: "r3",
          type: "pdf",
          title: "Reading Worksheet — Polar Bear",
          zh: "閱讀練習卷",
          duration: "20 min",
          url: "/files/wk14-reading.pdf",
        },
      ],
    },
  },
  "2025-W13": {
    id: "2025-W13",
    label: "Week 13",
    dateRange: "Mar 24 – Mar 30",
    theme: "Weather & Seasons",
    themeZh: "天氣與季節",
    items: { vocab: [], grammar: [], word: [], reading: [] },
  },
  "2025-W15": {
    id: "2025-W15",
    label: "Week 15",
    dateRange: "Apr 7 – Apr 13",
    theme: "Food & Cooking",
    themeZh: "食物與料理",
    items: { vocab: [], grammar: [], word: [], reading: [] },
  },
};

const DEFAULT_WEEK_ORDER = ["2025-W13", "2025-W14", "2025-W15"];
const WEEK_ORDER_KEY = "alans-english-week-order-v1";

// ── Firestore sync ─────────────────────────────────────

// Subscribe to live class data. Returns an unsubscribe function.
// callback(weeks, weekOrder) fires immediately and on every change.
// progress is intentionally excluded — it stays per-device in localStorage.
function subscribeToClassData(callback, onError) {
  return _classDoc.onSnapshot(snap => {
    if (snap.exists) {
      const d = snap.data();
      const savedWeeks = d.weeks || SEED_WEEKS;
      const order = Array.isArray(d.weekOrder) && d.weekOrder.length > 0
        ? d.weekOrder
        : (Object.keys(savedWeeks).length > 0 ? Object.keys(savedWeeks).sort() : DEFAULT_WEEK_ORDER.slice());
      noteCloudWeeks('g3', cleanWeeks(savedWeeks));   // v359
      callback(cleanWeeks(savedWeeks), order);
    } else {
      callback(SEED_WEEKS, DEFAULT_WEEK_ORDER.slice());
    }
  }, err => {
    console.warn('subscribeToClassData:', err?.code);
    if (onError) onError(err);
  });
}

// ── 學生名單（roster）— 老師專用 ──────────────────────────
// 文件 ID = 學生 email（小寫）；內容 { name, grade, active, addedAt }
function subscribeRoster(callback, onError) {
  return _db.collection('roster').onSnapshot(snap => {
    const list = [];
    snap.forEach(doc => list.push({ email: doc.id, ...doc.data() }));
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(list);
  }, err => {
    console.warn('subscribeRoster:', err?.code);
    if (onError) onError(err);
  });
}

// v339: 多位老師各帶各的學生——記下這位學生是誰帶的（沒填就是目前登入的老師）。
// 舊資料沒有 teacher 欄位 → 視為擁有者(Alan)的學生。
async function addRosterStudent(email, name, grade, teacher) {
  const id = String(email || '').trim().toLowerCase();
  if (!id || !id.includes('@')) throw new Error('invalid-email');
  const owner = String(teacher || (_auth.currentUser && _auth.currentUser.email) || '').toLowerCase();
  await _db.collection('roster').doc(id).set({
    name: (name || '').trim(),
    grade: grade || '',
    active: true,
    teacher: owner,
    addedAt: Date.now(),
  }, { merge: true });   // merge：改年級/改名不會洗掉既有欄位
}

// 轉移學生給另一位老師（只有擁有者會用到）
async function setRosterStudentTeacher(email, teacher) {
  const id = String(email || '').trim().toLowerCase();
  await _db.collection('roster').doc(id).set({ teacher: String(teacher || '').toLowerCase() }, { merge: true });
}

async function setRosterStudentActive(email, active) {
  const id = String(email || '').trim().toLowerCase();
  await _db.collection('roster').doc(id).set({ active: !!active }, { merge: true });
}

async function deleteRosterStudent(email) {
  const id = String(email || '').trim().toLowerCase();
  await _db.collection('roster').doc(id).delete();
}

async function saveWeeks(weeks) {
  guardWeekSave('g3', weeks);                      // v359: 不准把有題目的蓋成空的
  await _classDoc.set({ weeks }, { merge: true });
}

async function saveWeekOrder(order) {
  await _classDoc.set({ weekOrder: order }, { merge: true });
}

// Upload a PDF File to Firebase Storage; returns the public download URL.
async function uploadPdfToStorage(weekId, itemId, file) {
  const storageRef = _storage.ref(`pdfs/${weekId}/${itemId}`);
  await storageRef.put(file);
  return storageRef.getDownloadURL();
}

// v277: 分段閱讀的文章照片——刻意放在 pdfs/reading/ 底下：
// 已發布的 pdfs/** 規則＝所有人可讀、只有老師信箱可寫，直接沿用、不用再改 Storage 規則
async function uploadReadingPhoto(itemId, blob) {
  const safe = String(itemId || 'gr').replace(/[^A-Za-z0-9_-]/g, '_');
  const ref = _storage.ref(`pdfs/reading/${safe}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`);
  await ref.put(blob, { contentType: 'image/jpeg' });
  return ref.getDownloadURL();
}

// v288: OCR 單字資料改存 Firestore 的 class 集合（公開可讀、老師可寫——規則現成）
// ⚠ 教訓：Firebase Storage 的「檔案下載」(alt=media) 不回 CORS 標頭（metadata 有、檔案沒有），
// 網頁 fetch/crossOrigin 讀圖都會被瀏覽器擋——除非去 GCS 設 bucket CORS。Firestore SDK 不經 CORS。
// v291: OCR 行 → 朗讀文字的清洗（Alan 回報：換行處會唸出怪數字）
// 課本掃描會混進：行首段落編號、行尾頁碼/音軌號、純數字或噪音行、行尾連字號斷詞。
function grJoinReadLines(lineTexts) {
  const cleaned = (lineTexts || [])
    .map(t => String(t || '')
      .replace(/^\s*\d{1,3}[.)\]]?\s+/, '')             // 行首「1 」「2) 」段落編號（限 1–3 位）
      .replace(/\s+\d{1,3}\s*$/, '')                    // 行尾頁碼/音軌號（限 1–3 位，長數字留著唸）
      .replace(/[|_~•·¤©®°§\\\/<>\[\]{}*#@^=+]+/g, ' ') // OCR 噪音符號
      .replace(/\s{2,}/g, ' ')
      .trim())
    // v301: 保留「有 2 個以上英文字」或「含 3 位數以上數字」的行——後者讓 12345678 這類被唸出來
    .filter(t => /[A-Za-z]{2}/.test(t) || /\d{3,}/.test(t));
  let out = '';
  cleaned.forEach(t => {
    if (/[A-Za-z]-$/.test(out)) out = out.replace(/-$/, '') + t; // 行尾連字號＝斷詞，接回
    else out += (out ? ' ' : '') + t;
  });
  return out;
}

// v292: 從 OCR 資料取「朗讀文字」——關鍵：OCR 的「行」會橫跨兩欄（課文行黏到旁邊圖說），
// 所以框選過濾要用「字」層級（每個字有自己的座標）。新資料的字帶 r（含標點原文，
// 朗讀停頓自然）；舊資料退回 t（無標點）。沒有 rect（沒框主文）時退回行清洗。
function grReadTextFrom(d, y0, y1, rect) {
  if (!d) return '';
  const inRect = (cx, cy) => cy >= rect.y && cy <= rect.y + rect.h && cx >= rect.x && cx <= rect.x + rect.w;
  if (rect && (d.words || []).length) {
    const toks = (d.words || []).filter(w => {
      const cy = w.y + (w.h || 0) / 2;
      const cx = (w.x || 0) + (w.w || 0) / 2;
      return cy >= y0 && cy <= y1 && inRect(cx, cy);
    }).map(w => String(w.r || w.t || '').trim()).filter(Boolean);
    let out = '';
    toks.forEach((t, i) => {
      if (!/[A-Za-z]/.test(t)) {
        // v301: 數字幾乎一律唸出來（Alan：像 12345678 這種會被整個跳過）。
        // 只略過「孤立、且只有 1–2 位數」的 token（那才多半是頁碼）；
        // 3 位數以上、或前後接得到字/數字的數字，全部保留給神經語音唸。
        if (!/\d/.test(t)) return;                       // 沒字也沒數字＝純標點，丟
        const digits = (t.match(/\d/g) || []).length;
        if (digits <= 2) {
          const prev = toks[i - 1] || '', next = toks[i + 1] || '';
          const isWord = s => /[A-Za-z0-9]/.test(s);
          if (!isWord(prev) && !isWord(next)) return;    // 孤立的一兩位數＝頁碼，略過
        }
      }
      if (/[A-Za-z]-$/.test(out)) out = out.replace(/-$/, '') + t; // 行尾斷詞接回
      else out += (out ? ' ' : '') + t;
    });
    return out.replace(/\s{2,}/g, ' ').trim();
  }
  const lines = (d.lines || []).filter(l => l.y >= y0 && l.y <= y1).filter(l => {
    if (!rect) return true;
    if (l.y < rect.y || l.y > rect.y + rect.h) return false;
    if (l.x == null) return true;
    return (l.x + (l.w || 0)) > rect.x && l.x < rect.x + rect.w;
  });
  return grJoinReadLines(lines.map(l => l.t));
}

// v301: 跟 grReadTextFrom 同一套過濾，但回傳「有座標的字物件」清單（給照片段落逐字高亮）。
// 只在有字層級資料 (d.words) 時有效；沒有就回空陣列（那種舊資料無法逐字高亮）。
function grReadWordsFrom(d, y0, y1, rect) {
  if (!d || !(d.words || []).length) return [];
  const inRect = (cx, cy) => !rect || (cy >= rect.y && cy <= rect.y + rect.h && cx >= rect.x && cx <= rect.x + rect.w);
  const toks = (d.words || []).filter(w => {
    const cy = w.y + (w.h || 0) / 2;
    const cx = (w.x || 0) + (w.w || 0) / 2;
    return cy >= y0 && cy <= y1 && inRect(cx, cy);
  });
  const isWord = (ww) => ww && /[A-Za-z0-9]/.test(String(ww.r || ww.t || ''));
  const out = [];
  toks.forEach((w, i) => {
    const t = String(w.r || w.t || '').trim();
    if (!t) return;
    if (!/[A-Za-z]/.test(t)) {
      if (!/\d/.test(t)) return;                       // 純標點，丟
      const digits = (t.match(/\d/g) || []).length;
      if (digits <= 2 && !isWord(toks[i - 1]) && !isWord(toks[i + 1])) return; // 孤立一兩位數＝頁碼
    }
    out.push({ t: t, r: w.r || t, x: w.x, y: w.y, w: w.w, h: w.h });
  });
  return out;
}

// v290: AI 產生自然朗讀——打同一個 Worker 的 /tts 路由（Workers AI 神經語音）。
// 長文按句切塊（~1400 字/塊）逐塊產生再串接；Worker 還沒加 /tts 時丟 'tts-missing'
// 讓編輯器顯示開通指引。產生一次存成 MP3，之後學生播放零成本。
async function generateTtsAudio(text) {
  const endpoint = AI_WRITING_ENDPOINT || '';
  if (!endpoint) throw new Error('tts-missing');
  // v293: 整理文字讓神經語音把句子斷得乾淨——標點後補空格、收掉多餘空白、
  // 結尾補句號，神經語音才會在標點自然停頓（少了句號會一路連著唸）。
  let prepped = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/([.!?,;:])(?=[A-Za-z])/g, '$1 ')  // 標點黏字→補空格
    .trim();
  if (prepped && !/[.!?]$/.test(prepped)) prepped += '.';
  const sents = prepped.match(/[^.!?]+[.!?]*/g) || [prepped];
  const chunks = [];
  let cur = '';
  sents.forEach(t => {
    if ((cur + t).length > 1400) { if (cur.trim()) chunks.push(cur); cur = t; }
    else cur += t;
  });
  if (cur.trim()) chunks.push(cur);
  const parts = [];
  for (const c of chunks) {
    const res = await fetch(endpoint + '/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: c.trim() }),
    });
    if (res.status === 404 || res.status === 405) throw new Error('tts-missing');
    if (!res.ok) throw new Error('TTS 服務回應 ' + res.status);
    const data = await res.json().catch(() => null);
    if (!data || !data.audio) throw new Error('tts-missing'); // 舊 Worker 沒有 /tts 會回 Claude 格式
    const bin = atob(data.audio);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    parts.push(u8);
  }
  if (!parts.length) throw new Error('沒有可朗讀的文字');
  return new Blob(parts, { type: 'audio/mpeg' });
}

// v289: 課文音檔（老師上傳課本配音/自錄）——<audio> 播放跟 <img> 一樣不需要 CORS
async function uploadReadingAudio(itemId, file) {
  const safe = String(itemId || 'gr').replace(/[^A-Za-z0-9_-]/g, '_');
  const ext = (String(file.name || '').match(/\.(mp3|m4a|aac|wav|ogg)$/i) || [, 'mp3'])[1].toLowerCase();
  const ref = _storage.ref(`pdfs/reading/${safe}/${Date.now()}_audio.${ext}`);
  await ref.put(file, { contentType: file.type || 'audio/mpeg' });
  return ref.getDownloadURL();
}

async function saveReadingWords(obj) {
  const id = 'grwords_' + Date.now() + Math.random().toString(36).slice(2, 6);
  await _db.collection('class').doc(id).set(obj);
  return id;
}
async function fetchReadingWords(ref) {
  if (!ref) return null;
  if (/^grwords_/.test(String(ref))) {
    try {
      const snap = await _db.collection('class').doc(String(ref)).get();
      return snap.exists ? snap.data() : null;
    } catch (e) { return null; }
  }
  // 舊資料（v287 存 Storage URL）——多半被 CORS 擋，盡力而為
  try { const r = await fetch(ref); return r.ok ? r.json() : null; } catch (e) { return null; }
}

// v287: 點字查義——走同一個 AI 代理（system prompt 在前端組，Worker 不用改）
// 小朋友點文章裡的單字 → 中文意思＋簡單英文釋義；localStorage 快取，同字不重打
const DICT_CACHE_KEY = 'alan-dict-v1';
function _dictCache() { try { return JSON.parse(localStorage.getItem(DICT_CACHE_KEY) || '{}'); } catch (e) { return {}; } }
function dictHas(word) { const w = String(word || '').trim().toLowerCase(); return !!(w && _dictCache()[w]); }
/* v410：同一個字同時被「背景預查」與「學生點下去」要到時，只跟 AI 要一次——
   而且點下去的那一次會直接接上正在跑的那一發，不用重打（本來會打兩次、也慢兩倍）。 */
const _dictPending = {};
async function lookupWord(word, context) {
  const w = String(word || '').trim().toLowerCase();
  if (!w) return '';
  const cache = _dictCache();
  if (cache[w]) return cache[w];
  if (_dictPending[w]) return _dictPending[w];
  const p = _lookupWordNow(w, context);
  _dictPending[w] = p;
  p.then(() => { delete _dictPending[w]; }, () => { delete _dictPending[w]; });
  return p;
}
async function _lookupWordNow(w, context) {
  const endpoint = AI_WRITING_ENDPOINT || '';
  if (!endpoint) return '（查詢服務未設定）';
  const systemPrompt =
`You are a dictionary for Taiwanese elementary school students learning English.
Given a word (and the sentence it appears in, if provided), reply in EXACTLY this format, nothing else:

【中文】the Traditional Chinese meaning of the word AS USED in the context (2-6 characters if possible)
【英文】one very simple English definition an 8-year-old understands (max 12 words)
【例句】one short, natural example sentence using the word (max 10 words)

If the input is not a real English word (typo/garbled), reply only: 【中文】（這個字讀不出來）`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 160,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Word: ${w}${context ? `\nContext: ${String(context).slice(0, 200)}` : ''}` }],
      }),
    });
    const data = await res.json().catch(() => null);
    const text = data?.content?.[0]?.text || '';
    if (text && text.includes('【中文】')) {
      const c = _dictCache();
      const keys = Object.keys(c);
      if (keys.length > 600) keys.slice(0, 200).forEach(k => delete c[k]); // 快取上限
      c[w] = text;
      try { localStorage.setItem(DICT_CACHE_KEY, JSON.stringify(c)); } catch (e) {}
    }
    return text || '查詢失敗，請再點一次。';
  } catch (e) { return '網路連不上，請再試一次。'; }
}

/* ══ v410：背景先把整段的字查好（Alan：「字典功能也很慢」）══════════════════
   一次查一個字要等 AI 約 1.8 秒，小朋友點下去就是乾等。
   進到一段文章時就在背景把這一段的字先查起來（查過的存在 localStorage，永久有效），
   等他真的點下去多半已經是現成的。
   ⚠ 只查「值得查的」：太短的、最常見的功能詞（the/and/was…）小朋友不會點，
     查了只是白花錢。上限 60 個字、同時 3 個，不要跟圖片和 OCR 搶頻寬。 */
const _DICT_SKIP = new Set(('a an the and or but so if then than that this these those there here ' +
  'is are was were be been being am do does did done have has had will would shall should can could ' +
  'may might must not no yes of to in on at for with from by as into onto over under about after before ' +
  'it its he she his her him they them their we us our you your i me my mine one two three four five ' +
  'who what when where why how all any both each few more most other some such only own same too very ' +
  'up out off down again once also just now new old get got go went come came make made take took ' +
  'said say says like well back even still way day').split(/\s+/));
/* 「值得先暖起來的字」——語音預抓也用同一份，兩邊的名單才會一致。
   去重、去掉 2 個字母以內的、去掉最常見的功能詞，再截上限。 */
function readWorthyWords(words, limit) {
  const seen = {}, out = [];
  (Array.isArray(words) ? words : [words]).forEach(x => {
    const w = String(x || '').toLowerCase().replace(/[^a-z'\u2019-]/g, '');
    if (w.length < 3 || seen[w] || _DICT_SKIP.has(w)) return;
    seen[w] = 1;
    if (!limit || out.length < limit) out.push(w);
  });
  return out;
}
const DICT_PREFETCH_PARALLEL = 3;
function prefetchDict(words, { limit = 60, parallel = DICT_PREFETCH_PARALLEL } = {}) {
  const cache = _dictCache();
  const list = readWorthyWords(words, 0).filter(w => !cache[w]).slice(0, limit);
  let stop = false, i = 0;
  const run = async () => {
    while (!stop) {
      const w = list[i++];
      if (w === undefined) return;
      try { await lookupWord(w, ''); } catch (e) { /* 這個字算了，繼續下一個 */ }
    }
  };
  if (list.length) {
    const n = Math.min(parallel, list.length);
    Promise.all(Array.from({ length: n }, run)).catch(() => {});
  }
  return () => { stop = true; };     // 換段就把還沒查的收掉
}

// v263: 學生作業照片上傳（「上傳作業」題型）——存 submissions/{uid}/{progressKey}/
// ⚠ 需要 storage.rules 的 submissions 區塊已發布（Firebase Console → Storage → Rules）
async function uploadSubmissionPhoto(uid, progressKey, blob, idx) {
  const safeKey = String(progressKey).replace(/[^A-Za-z0-9_-]/g, '_');
  const ref = _storage.ref(`submissions/${uid}/${safeKey}/${Date.now()}_${idx}.jpg`);
  await ref.put(blob, { contentType: 'image/jpeg' });
  return ref.getDownloadURL();
}

// ── v336: 單字卡自訂圖片（老師自己上傳／貼上）──────────────
// 圖庫找不到合適的圖時用。存到 Storage 的 pdfs/flashcards/（沿用現成規則：
// 公開可讀、只有老師信箱可寫——不必再去 Firebase Console 改 storage.rules）。
// ⚠ 顯示走 <img src>，不經 CORS；上傳前先縮圖＋轉 JPEG，學生端載入才快。
function compressImageBlob(fileOrBlob, maxSide = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';           // 透明 PNG 轉 JPEG 時底色不要變黑
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      cv.toBlob(b => b ? resolve(b) : reject(new Error('compress-failed')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片讀取失敗')); };
    img.src = url;
  });
}

async function uploadFlashcardImage(fileOrBlob) {
  if (!fileOrBlob) throw new Error('no-file');
  if (fileOrBlob.size > 15 * 1024 * 1024) throw new Error('檔案太大（上限 15MB）');
  let blob;
  try { blob = await compressImageBlob(fileOrBlob); }
  catch (e) { throw new Error('這不是有效的圖片檔'); }
  const rand = Math.random().toString(36).slice(2, 8);
  const ref = _storage.ref(`pdfs/flashcards/${Date.now()}_${rand}.jpg`);
  await ref.put(blob, { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000' });
  return ref.getDownloadURL();
}

// ── localStorage (initial cache + per-device progress) ─

function loadWeekOrder() {
  try {
    const raw = localStorage.getItem(WEEK_ORDER_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) {}
  return DEFAULT_WEEK_ORDER.slice();
}

const STORAGE_KEY = "alans-english-data-v3";

function loadWeeks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return cleanWeeks(JSON.parse(raw));
  } catch (e) {}
  return SEED_WEEKS;
}

const PROGRESS_KEY = "alans-english-progress-v1";

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}
function saveProgress(prog) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(prog)); } catch (e) {}
}

// ── Companion (localStorage — works for guests too) ──
const COMPANION_KEY = 'alan-companion';

function loadCompanion() {
  try { const r = localStorage.getItem(COMPANION_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}

// ── Utilities ──────────────────────────────────────────

function suggestNextWeekId(existingIds) {
  const parsed = existingIds
    .map(id => {
      const m = String(id).match(/^(\d{4})-W(\d{1,2})$/i);
      return m ? { year: +m[1], week: +m[2], id } : null;
    })
    .filter(Boolean);
  if (parsed.length === 0) {
    const d = new Date();
    return `${d.getFullYear()}-W01`;
  }
  parsed.sort((a, b) => a.year - b.year || a.week - b.week);
  const last = parsed[parsed.length - 1];
  let nextYear = last.year, nextWeek = last.week + 1;
  if (nextWeek > 53) { nextYear += 1; nextWeek = 1; }
  return `${nextYear}-W${String(nextWeek).padStart(2, "0")}`;
}

const TYPE_META = {
  quizlet:    { label: "Quizlet",    zh: "字卡",   embed: true,  cta: "Play →" },
  wordwall:   { label: "Wordwall",   zh: "遊戲",   embed: true,  cta: "Play →" },
  youtube:    { label: "Video",      zh: "影片",   embed: true,  cta: "Watch →" },
  form:       { label: "Quiz",       zh: "小考",   embed: true,  cta: "Take →" },
  pdf:        { label: "PDF",        zh: "練習卷", embed: false, cta: "Download ↓" },
  note:       { label: "Notes",      zh: "筆記",   embed: false, cta: "Read →" },
  image:      { label: "Image",      zh: "圖片",   embed: false, cta: "View →" },
  quiz:       { label: "Quiz",       zh: "測驗",   embed: false, cta: "Start →" },
  flashcard:  { label: "Flashcard",  zh: "單字卡", embed: false, cta: "Study →" },
  fillblank:  { label: "Fill Blank", zh: "填空",   embed: false, cta: "Play →" },
  "vocab-quiz":{ label: "Vocab Quiz", zh: "單字測驗", embed: false, cta: "Start →" },
  "circle-answer":{ label: "Circle Answer", zh: "圈選題", embed: false, cta: "Start →" },
};

function dedupeDoubled(s) {
  if (typeof s !== "string" || s.length < 4) return s;
  const half = s.length / 2;
  if (Number.isInteger(half) && s.slice(0, half) === s.slice(half)) return s.slice(0, half);
  return s;
}
function cleanWeeks(weeks) {
  try {
    const out = JSON.parse(JSON.stringify(weeks));
    Object.values(out).forEach(w => {
      ["theme", "themeZh", "subtitle", "subtitleZh", "label", "dateRange"].forEach(k => {
        if (w && typeof w[k] === "string") w[k] = dedupeDoubled(w[k]);
      });
    });
    return out;
  } catch (e) { return weeks; }
}

function toYouTubeEmbed(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return "https://www.youtube.com/embed" + u.pathname;
    const v = u.searchParams.get("v");
    if (v) return "https://www.youtube.com/embed/" + v;
  } catch (e) {}
  return url;
}

// ── Leaderboard (stored in Firestore under class/data as leaderboard.{itemId}) ──

// Add a new entry, keep top 20 sorted by score desc then time asc
async function addLeaderboardEntry(itemId, entry) {
  const snap = await _classDoc.get();
  const existing = (snap.exists && snap.data().leaderboard && snap.data().leaderboard[itemId]) || [];
  const merged = [...existing, entry];
  merged.sort((a, b) => b.score - a.score || a.time - b.time);
  const trimmed = merged.slice(0, 20);
  await _classDoc.set({ leaderboard: { [itemId]: trimmed } }, { merge: true });
}

// Delete entry by index in the stored array
async function deleteLeaderboardEntry(itemId, entryIndex) {
  const snap = await _classDoc.get();
  const existing = [...((snap.exists && snap.data().leaderboard && snap.data().leaderboard[itemId]) || [])];
  if (entryIndex < 0 || entryIndex >= existing.length) return;
  existing.splice(entryIndex, 1);
  await _classDoc.set({ leaderboard: { [itemId]: existing } }, { merge: true });
}

// Live-subscribe to leaderboard for one item. Returns unsubscribe fn.
function subscribeLeaderboard(itemId, callback) {
  return _classDoc.onSnapshot(snap => {
    const entries = (snap.exists && snap.data().leaderboard && snap.data().leaderboard[itemId]) || [];
    callback(entries);
  });
}

// ── Firebase Auth ──────────────────────────────────────────────────────

function _googleProvider() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' }); // always show account picker
  return provider;
}

function signInWithGoogle() {
  // 彈窗登入；被瀏覽器擋下時自動改用整頁跳轉（Chrome COOP 政策有時會卡住彈窗流程）
  return _auth.signInWithPopup(_googleProvider()).catch(err => {
    if (err && err.code === 'auth/popup-blocked') return _auth.signInWithRedirect(_googleProvider());
    throw err;
  });
}

// 整頁跳轉登入 — 不受彈窗／COOP 問題影響；跳回來後 onAuthStateChanged 會自動接手
function signInWithGoogleRedirect() {
  return _auth.signInWithRedirect(_googleProvider());
}

function signOutUser() { return _auth.signOut(); }

function subscribeAuth(callback) { return _auth.onAuthStateChanged(callback); }

// ── v337: 管理者判斷（擁有者 ＋ 資料庫 admins 名單）────────────────────
// ⚠ 這些只是「介面要不要顯示後台」的判斷；真正的權限由 Firestore/Storage
//   規則在伺服器端強制執行——就算有人竄改前端也拿不到資料。
let _extraAdmins = new Set();   // 額外管理者（小寫 email），由 subscribeAdminStatus 填入

function _lc(s) { return String(s || '').trim().toLowerCase(); }

function isOwnerUser(user) {
  return !!(user && user.email && OWNER_EMAILS.includes(_lc(user.email)));
}
function isAdminUser(user) {
  if (!user || !user.email) return false;
  const e = _lc(user.email);
  return OWNER_EMAILS.includes(e) || _extraAdmins.has(e);
}

// 登入後訂閱「我是不是管理者」——只讀自己那一筆（規則只允許讀自己的）
function subscribeAdminStatus(user, callback) {
  const done = (v) => { if (callback) callback(v); };
  if (!user || !user.email) { _extraAdmins.clear(); done(false); return () => {}; }
  const e = _lc(user.email);
  if (OWNER_EMAILS.includes(e)) { done(true); return () => {}; }
  return _db.collection('admins').doc(e).onSnapshot(
    snap => { if (snap.exists) _extraAdmins.add(e); else _extraAdmins.delete(e); done(snap.exists); },
    ()   => { _extraAdmins.delete(e); done(false); }   // 讀不到就當一般使用者
  );
}

// ── 管理者名單維護（只有擁有者能用；規則同樣會擋）──────────────────
function subscribeAdmins(callback, onError) {
  return _db.collection('admins').onSnapshot(snap => {
    const list = [];
    snap.forEach(d => list.push({ email: d.id, ...d.data() }));
    list.sort((a, b) => String(a.email).localeCompare(String(b.email)));
    callback(list);
  }, onError || (() => {}));
}
async function addAdmin(email, name) {
  const id = _lc(email);
  if (!id || !id.includes('@')) throw new Error('invalid-email');
  if (OWNER_EMAILS.includes(id)) throw new Error('owner-already');
  await _db.collection('admins').doc(id).set({
    email: id,
    name: String(name || '').trim(),
    addedBy: (_auth.currentUser && _auth.currentUser.email) || '',
    addedAt: Date.now(),
  });
}
async function removeAdmin(email) {
  const id = _lc(email);
  if (OWNER_EMAILS.includes(id)) throw new Error('cannot-remove-owner');
  await _db.collection('admins').doc(id).delete();
}

// ── Per-user Progress in Firestore ────────────────────────────────────
// Stored at: progress/{uid}  →  { name, email, updatedAt, items: { itemId: { done, score?, time? } } }

async function saveProgressItem(uid, displayName, email, itemId, data) {
  // data = { done: timestamp, score?: 0-100, time?: seconds } to mark done,
  //        null to remove (item unchecked)
  try {
    const ref = _db.collection('progress').doc(uid);
    // Step 1: ensure the document exists with profile fields.
    // Only overwrite name/email if they are non-empty — prevents blank displayName
    // from clobbering a valid name that was saved on a previous quiz completion.
    const profileFields = { updatedAt: Date.now() };
    if (displayName && displayName.trim()) profileFields.name  = displayName.trim();
    if (email      && email.trim())       profileFields.email = email.trim();
    await ref.set(profileFields, { merge: true });
    // Step 2: update() correctly treats "items.itemId" as a nested field path
    const fieldUpdate = {};
    fieldUpdate[`items.${itemId}`] = data === null
      ? firebase.firestore.FieldValue.delete()
      : data;
    await ref.update(fieldUpdate);
  } catch (e) { console.warn('saveProgressItem:', e); }
}

// Subscribe to this user's own Firestore progress
function subscribeMyProgress(uid, callback) {
  return _db.collection('progress').doc(uid).onSnapshot(snap => {
    const d = snap.exists ? (snap.data() || {}) : {};
    callback(d.items || {}, d.checkin || null);   // v362: 第二個參數＝每日簽到紀錄
  });
}

// Subscribe to ALL students' progress (teacher dashboard only)
function subscribeAllStudents(callback) {
  return _db.collection('progress').onSnapshot(snap => {
    const all = [];
    snap.forEach(doc => {
      const d = doc.data();
      all.push({
        uid: doc.id,
        name: d.name || doc.id,
        email: d.email || '',
        items: d.items || {},
        updatedAt: d.updatedAt || 0,
        xp: d.xp || 0,
        streak: d.streak || { count: 0 },
        badges: d.badges || {},
        checkin: d.checkin || null,   // v362
      });
    });
    all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(all);
  });
}

// ── Text-to-Speech (shared) ────────────────────────────────────────────
// iOS Safari requires a user gesture before the first utterance; callers
// should treat silent failure as acceptable and offer a manual 🔊 button.
// v244: 不指定語音時，macOS/Chrome 常落到 Albert / Fred 這類整人語音（氣音老人聲）。
// 主動挑高品質語音：Google / Natural / Premium / Enhanced / Samantha…，整人語音進黑名單。
let _ttsVoiceCache = {};
const _TTS_NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|junior|kathy|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|ralph/;
function _ttsPickVoice(lang) {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices.length) return null;
  const key = String(lang).toLowerCase();
  const cached = _ttsVoiceCache[key];
  if (cached && voices.indexOf(cached) !== -1) return cached;
  const norm = (l) => String(l || '').toLowerCase().replace('_', '-');
  const base = key.split('-')[0];
  const cands = voices.filter(v => norm(v.lang).indexOf(base) === 0);
  const score = (v) => {
    const n = v.name.toLowerCase();
    let s = 0;
    if (norm(v.lang) === key) s += 4;                                   // 完整 locale 相符
    if (n.indexOf('google') !== -1) s += 7;                             // Chrome 的 Google 語音自然（但是網路語音、偶爾啞掉）
    if (/natural|premium|enhanced/.test(n)) s += 7;                     // Edge Natural / macOS 加強版
    if (/samantha|ava|allison|karen|daniel|nicky|joelle|mei-jia|meijia|siri/.test(n)) s += 5; // 已知的好聲音
    if (v.localService) s += 3;                                         // v256: 本機語音更穩（網路語音會無聲）
    if (_TTS_NOVELTY.test(n)) s -= 20;                                  // 黑名單墊底
    return s;
  };
  cands.sort((a, b) => score(b) - score(a));
  _ttsVoiceCache[key] = cands[0] || null;
  return _ttsVoiceCache[key];
}
if (window.speechSynthesis) {
  try {
    window.speechSynthesis.getVoices(); // 觸發語音清單載入（部分瀏覽器第一次回空陣列）
    window.speechSynthesis.addEventListener('voiceschanged', () => { _ttsVoiceCache = {}; });
  } catch (e) {}
}
function speakText(text, { rate = 0.85, lang = 'en-US' } = {}) {
  try {
    if (!window.speechSynthesis || !text) return false;
    const synth = window.speechSynthesis;
    if (_activeSpeak) { try { _activeSpeak(); } catch (e) {} } // v293: 先停掉逐句朗讀，避免疊音
    synth.cancel();
    const fire = (useVoice) => {
      const utt = new SpeechSynthesisUtterance(String(text));
      utt.lang = lang;
      utt.rate = rate;
      utt.pitch = 1;
      if (useVoice) {
        const v = _ttsPickVoice(lang);
        if (v) utt.voice = v;
      }
      let started = false;
      utt.onstart = () => { started = true; };
      if (useVoice) {
        // v256: 看門狗——挑的語音沒出聲（Google 網路語音偶爾整個啞掉）→ 改用系統預設重講
        const fallback = () => {
          if (started || synth.speaking) return;
          try { synth.cancel(); } catch (e) {}
          fire(false);
        };
        utt.onerror = fallback;
        setTimeout(fallback, 650);
      }
      try { synth.resume(); } catch (e) {} // 有些瀏覽器卡在 paused 狀態
      synth.speak(utt);
    };
    // v256: Chrome 在 cancel() 同一拍 speak 會吞掉 utterance——隔一拍再講
    setTimeout(() => fire(true), 30);
    return true;
  } catch(e) { return false; }
}

// v326: 全站語音統一用 OpenAI 真人聲音（打 Worker /tts，跟閱讀同一把聲音）。
// 英文（單字卡、聽寫、查字典…）走這裡：拿 mp3、同一個字只產一次（快取）、共用一個 <audio> 播放；
// 失敗才退回瀏覽器語音，所以一定有聲音。中文（單字卡背面的中文意思）Worker /tts 是英文聲線→維持瀏覽器語音。
/* v393: 「小喇叭按下去要等 1~2 秒」的實測與修法 ───────────────────────────
   量到的數字（Cloudflare Worker /tts，同一台機器）：
     · 冷啟動（跟 Worker 要 mp3）………… 1300 ~ 2300 ms（幾乎全是 Worker 在等 OpenAI 生成）
     · Cache API 讀出來轉 objectURL …… 0.3 ~ 1.2 ms
     · 換 src 到真的出聲 ……………………… 約 10 ms
     · 同一個 src 重播（不換 src）………… 0.8 ms
   而且 Worker「沒有」快取：同一個字連問三次回來的 mp3 大小都不一樣
   （34316 / 23564 / 41996 bytes）＝每次都重新生成一遍。所以要快只能靠前端存起來。
   本來只有記憶體快取，重新整理就全沒了，等於每天上課第一次都要等 1~2 秒。
   改成三層：記憶體 → Cache API（存在裝置上，重新整理／換版本都還在）→ 才跟 Worker 要。 */
const _ttsAudioCache = {};   // 英文字串 → objectURL（OpenAI mp3）
const _ttsMemOrder = [];     // 記憶體快取的插入順序（滿了從最舊的開始丟）
const TTS_MEM_MAX = 150;     // 記憶體最多留幾個 objectURL（不設限的話整天下來會一直長）
const TTS_CACHE_NAME = 'alan-tts-v1';  // ⚠ 故意不叫 alans-english-*，sw.js 的 activate 才不會連它一起刪
const TTS_CACHE_MAX = 300;   // 裝置上最多留幾個字（實測一個字約 20~47KB → 上限約 9MB）
let _ttsAudioEl = null;      // 共用 <audio>
let _ttsPlayToken = 0;       // 連點時只讓最後一次真的播
let _ttsUnlocked = false;    // v363: iOS 需要「在使用者手勢裡播過一次」才准之後自動播

// 記憶體快取寫入；超過上限就丟掉最舊的，順便把 objectURL 收回來（不收會漏記憶體）
function _ttsMemPut(t, url) {
  if (!_ttsAudioCache[t]) _ttsMemOrder.push(t);
  _ttsAudioCache[t] = url;
  while (_ttsMemOrder.length > TTS_MEM_MAX) {
    const old = _ttsMemOrder.shift();
    const u = _ttsAudioCache[old];
    // 正在播的那個不能收，收掉聲音會斷在一半
    if (u && !(_ttsAudioEl && _ttsAudioEl.src === u)) { try { URL.revokeObjectURL(u); } catch (e) {} }
    delete _ttsAudioCache[old];
  }
}

/* Cache API 這層：key 用一個假的網址（Worker /tts 是 POST，POST 沒辦法當快取的 key，
   所以自己編一個 GET 網址當代號）。存的是 mp3 blob 本身。 */
function _ttsCacheKey(t) { return 'https://tts.local/v1/' + encodeURIComponent(t); }
let _ttsCachePromise = null;
function _ttsCache() {
  if (_ttsCachePromise) return _ttsCachePromise;
  _ttsCachePromise = (async () => {
    // 非 https（或很舊的瀏覽器）沒有 caches，整層就當作不存在，行為退回成原本的樣子
    try { return (window.caches && window.isSecureContext) ? await caches.open(TTS_CACHE_NAME) : null; }
    catch (e) { return null; }
  })();
  return _ttsCachePromise;
}
async function _ttsCacheGet(t) {
  try {
    const c = await _ttsCache(); if (!c) return null;
    const hit = await c.match(_ttsCacheKey(t)); if (!hit) return null;
    const blob = await hit.blob();
    if (!blob || !blob.size) return null;
    return URL.createObjectURL(blob);
  } catch (e) { return null; }
}
let _ttsCacheWrites = 0;
async function _ttsCachePut(t, blob) {
  try {
    const c = await _ttsCache(); if (!c) return;
    await c.put(new Request(_ttsCacheKey(t)), new Response(blob, { headers: { 'content-type': 'audio/mpeg' } }));
    if (++_ttsCacheWrites % 20 === 0) _ttsCacheTrim();   // 每 20 次才盤點一次，不要每次播放都去列全部 key
  } catch (e) {}
}
/* 上限管理：Cache API 的 keys() 回傳的是「寫進去的先後順序」，超過就從最舊的開始刪。
   音檔內容永遠不會變（同一個字就是同一個發音），所以不需要過期時間；
   真的要整批換掉時把 TTS_CACHE_NAME 的 v1 往上加就好。 */
async function _ttsCacheTrim() {
  try {
    const c = await _ttsCache(); if (!c) return;
    const keys = await c.keys();
    for (let i = 0; i < keys.length - TTS_CACHE_MAX; i++) await c.delete(keys[i]);
  } catch (e) {}
}

/* v363: 聽寫在 iPad/iPhone 沒聲音的兩個原因，這裡處理第一個 ──
   speakTTS 是先 await 抓 mp3 才 play()，await 之後就離開了「使用者手勢」的視窗，
   iOS 會擋掉 play()（NotAllowedError）。每個聽寫單字都不一樣＝每次都要現抓＝每次都被擋。
   解法：第一次任何點擊/觸控時，用同一個 <audio> 播一段無聲音檔把它解鎖，
   之後同一個元素就可以程式化播放了。 */
function _silentWavUrl() {
  const rate = 8000, n = 800;                   // 0.1 秒無聲
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
function unlockTtsAudio() {
  if (_ttsUnlocked) return;
  try {
    const a = _ttsAudioEl || (_ttsAudioEl = new Audio());
    a.playsInline = true;
    a.src = _silentWavUrl();
    const p = a.play();
    if (p && p.then) p.then(() => { _ttsUnlocked = true; }).catch(() => {});
    else _ttsUnlocked = true;
    // 順便解鎖瀏覽器語音（iOS 第一次 speak 也要在手勢裡）
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0; window.speechSynthesis.speak(u);
    }
  } catch (e) {}
}
try {
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev =>
    window.addEventListener(ev, unlockTtsAudio, { capture: true, passive: true }));
} catch (e) {}

/* v363: 第二個原因 —— iPhone/iPad 側邊的靜音開關會把 <audio> 靜音，
   但「瀏覽器內建語音」不受靜音開關影響。所以給一個開關：學生按「還是聽不到？」
   就切成內建語音，記在這台裝置上。 */
const TTS_MODE_KEY = 'alan-tts-mode';
function getTtsMode() { try { return localStorage.getItem(TTS_MODE_KEY) || 'auto'; } catch (e) { return 'auto'; } }
function setTtsMode(m) { try { localStorage.setItem(TTS_MODE_KEY, m); } catch (e) {} }

// 先把音檔抓好放快取——之後播放就不必等網路（也就不會掉出手勢視窗）
const _ttsPending = {};      // 同一個字同時被預抓＋被點播時，只跟 Worker 要一次
function _ttsFetchOnce(t) {
  if (_ttsAudioCache[t]) return Promise.resolve(_ttsAudioCache[t]);
  if (!_ttsPending[t]) {
    _ttsPending[t] = (async () => {
      const hit = await _ttsCacheGet(t);          // 先問裝置上的快取：命中約 1ms，等於免費
      if (hit) { _ttsMemPut(t, hit); return hit; }
      const blob = await generateTtsAudio(t);     // 真的沒有才跟 Worker 要（實測 1.3~2.3 秒）
      const u = URL.createObjectURL(blob);
      _ttsMemPut(t, u);
      _ttsCachePut(t, blob);                      // 背景寫進裝置，不擋這次播放
      return u;
    })()
      .then(u => { delete _ttsPending[t]; return u; })
      .catch(e => { delete _ttsPending[t]; throw e; });
  }
  return _ttsPending[t];
}

/* 先把音檔抓好放快取——之後播放就不必等網路（也就不會掉出手勢視窗）。
   v393 兩個改動：
   ① 本來是一個一個 await，20 個字要排隊 20 × 1.5 秒 ≈ 30 秒才暖完；
      改成一次 4 個並行，同一份大約 7 秒就好了。
   ② 本來只要有一個字失敗就整批放棄（return），一次網路抖動就讓整份都是冷的。
      改成只有「Worker 根本沒有 /tts」才整批停手，其餘失敗就跳過那個字繼續。 */
const TTS_PREFETCH_PARALLEL = 4;
async function prefetchTts(texts) {
  const seen = {};
  const list = (Array.isArray(texts) ? texts : [texts])
    .map(x => String(x || '').trim())
    .filter(t => t && !_ttsAudioCache[t] && !seen[t] && (seen[t] = 1));
  if (!list.length) return;
  let i = 0, dead = false;
  const worker = async () => {
    while (!dead) {
      const t = list[i++];
      if (t === undefined) return;
      try { await _ttsFetchOnce(t); }
      catch (e) { if (String(e && e.message) === 'tts-missing') dead = true; }
    }
  };
  const n = Math.min(TTS_PREFETCH_PARALLEL, list.length);
  await Promise.all(Array.from({ length: n }, worker));
}

/* v405（Alan：「小朋友會喜歡玩喇叭，一直重複按會卡頓」）：
   `_ttsSpeaking` ＝ 現在正在唸哪一個字。**同一個字還在唸的時候，再按就直接忽略**，
   不會把它從頭切掉重播（那個「切掉重播」就是聽起來卡卡的原因）。
   ⚠ 只擋「同一個字」：換一張卡、下一題、朗讀新的段落都是不同的字，
     照樣立刻打斷前一個——不然翻到下一張還要等上一個字唸完才有聲音。
   ⚠ 另外把這個函式改成「唸完才 resolve」。HTMLMediaElement.play() 是
     「開始播就 resolve」，所以 SpeakerBtn 的 busy 幾乎立刻解除、按鈕根本沒鎖到。
     全站呼叫 speakTTS 的地方都是射後不理，只有 SpeakerBtn 會 await，改這個很安全。 */
let _ttsSpeaking = '';
function ttsIsSpeaking(word) { return word ? _ttsSpeaking === String(word).trim() : !!_ttsSpeaking; }

async function speakTTS(text, { lang = 'en-US', rate = 0.9 } = {}) {
  const t = String(text || '').trim();
  if (!t) return;
  if (_ttsSpeaking === t) return;          // 同一個字還在唸 → 這一下不理它
  // 中文/非英文 → 瀏覽器語音（Worker /tts 只有英文聲線）
  if (!/^en/i.test(lang)) { try { speakText(t, { lang, rate }); } catch(e) {} return; }
  // v363: 學生自己選了「內建語音」（多半是因為 iPhone 靜音開關）
  if (getTtsMode() === 'browser') { try { speakText(t, { lang, rate }); } catch(e) {} return; }
  // 先停掉正在講的（瀏覽器＋前一段 mp3），避免兩個聲音疊起來
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e) {}
  if (_ttsAudioEl) { try { _ttsAudioEl.pause(); } catch(e) {} }
  const token = ++_ttsPlayToken;
  _ttsSpeaking = t;                        // 從「開始去拿音檔」就算在唸了（連點時不會排隊送出多次）
  try {
    let url = _ttsAudioCache[t];
    /* ⚠ v363 保命符：記憶體裡已經有音檔時「絕對不能 await」——await 之後就離開了
       iOS 的使用者手勢視窗，play() 會被擋掉（iPad 學生完全沒聲音）。
       所以命中時這裡一路同步走到下面的 a.play()，跟點擊在同一拍。 */
    if (!url) url = await _ttsFetchOnce(t);     // 沒有才去拿（記憶體→裝置快取→Worker）
    if (token !== _ttsPlayToken) return;         // 已被更新的點擊取代
    const a = _ttsAudioEl || (_ttsAudioEl = new Audio());
    a.playsInline = true;
    a.preload = 'auto';
    /* v393: 同一個字再按一次時不要重設 src。換 src 會重跑一次 load（實測約 10ms，
       而且會把已經解碼好的音檔丟掉）；沿用已載好的只要 0.8ms，按下去幾乎是立刻出聲。 */
    if (a.src !== url) {
      a.src = url;
      // Safari 換完 src 會把 playbackRate 重設成 1，載好之後再設一次才會真的變慢
      a.onloadedmetadata = () => { try { a.playbackRate = 0.92; } catch (e) {} };
    } else {
      try { a.currentTime = 0; } catch (e) {}
    }
    try { a.playbackRate = 0.92; } catch(e) {}   // 稍慢一點更清楚（單字/聽寫）
    await a.play();
    /* 等它真的唸完（或被下一個字打斷）才 resolve。
       pause 也要算完成——被新的一次打斷時，舊的那個 await 不能永遠卡著。 */
    await new Promise(res => {
      const done = () => {
        a.removeEventListener('ended', done);
        a.removeEventListener('pause', done);
        a.removeEventListener('error', done);
        if (token === _ttsPlayToken) _ttsSpeaking = '';
        res();
      };
      a.addEventListener('ended', done);
      a.addEventListener('pause', done);
      a.addEventListener('error', done);
    });
  } catch (e) {
    // ⚠ 任何失敗都要把「正在唸」解掉，否則那個字之後永遠按不出聲音
    if (token === _ttsPlayToken) _ttsSpeaking = '';
    /* v393: 連點時前一次的 play() 會被新的一次中斷，丟出 AbortError——那是正常的，
       不能因此又用瀏覽器語音講一次，否則兩個聲音會疊在一起。 */
    if (e && e.name === 'AbortError') return;
    if (token !== _ttsPlayToken) return;
    // OpenAI 語音不可用（Worker 沒 /tts 或斷線）→ 退回瀏覽器語音，確保有聲音
    try { speakText(t, { lang, rate }); } catch(e2) {}
  }
}

// v293: 把一段文字切成「句子／子句」，並為每塊標一個停頓時間（毫秒）——
// 讓瀏覽器朗讀遇到標點會停一下、更像真人在讀。句末(.!?)停久一點、逗號類短停。
function grSpeechChunks(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const sents = s.match(/[^.!?]+[.!?]+["'”’)]*|[^.!?]+$/g) || [s];
  const out = [];
  sents.forEach(sent => {
    const clauses = sent.match(/[^,;:—–]+[,;:—–]?/g) || [sent];
    clauses.forEach(cl => {
      const t = cl.trim();
      if (!t || !/[A-Za-z0-9]/.test(t)) return;
      const endSent = /[.!?]["'”’)]*$/.test(t);
      const endClause = /[,;:—–]$/.test(t);
      out.push({ t, pause: endSent ? 420 : endClause ? 230 : 130 });
    });
  });
  if (out.length) out[out.length - 1].pause = 0;
  return out;
}

// v293: 逐句朗讀（瀏覽器語音）——句子之間留自然停頓、語速放慢，比一口氣唸完自然得多。
// 回傳 stop() 讓呼叫端中止；朗讀完（或被中止）呼叫 onDone。全站同時只跑一個朗讀
// （_activeSpeak）——連點單字／附註／整段不會兩段聲音疊在一起。
let _activeSpeak = null;
// v301: onProgress(fraction 0~1)——朗讀到哪個字，回報進度（給「逐字亮起來」用）
function speakSentences(text, { rate = 0.82, lang = 'en-US', onDone, onProgress } = {}) {
  const synth = window.speechSynthesis;
  const chunks = grSpeechChunks(text);
  if (_activeSpeak) { try { _activeSpeak(); } catch (e) {} }
  _activeSpeak = null;
  if (!synth || !chunks.length) { if (onDone) onDone(); return () => {}; }
  try { synth.cancel(); } catch (e) {}
  const totalChars = chunks.reduce((n, c) => n + c.t.length, 0) || 1;
  const before = []; let acc = 0; chunks.forEach(c => { before.push(acc); acc += c.t.length; });
  let i = 0, stopped = false, done = false;
  // v306+: iOS/iPadOS WebKit 幾乎不觸發 onboundary → 逐字亮起來會整段不動。用估時 timer 當後備推進；
  // 只要真的收到一次 onboundary（boundarySeen=true），就讓真實邊界接手，timer 立刻退讓。
  let boundarySeen = false, tick = null;
  const clearTick = () => { if (tick) { clearInterval(tick); tick = null; } };
  const report = (f) => { if (onProgress) { try { onProgress(Math.max(0, Math.min(1, f))); } catch (e) {} } };
  const finish = () => {
    if (done) return; done = true;
    clearTick();
    if (_activeSpeak === stop) _activeSpeak = null;
    report(1);
    if (onDone) onDone();
  };
  const stop = () => { stopped = true; clearTick(); try { synth.cancel(); } catch (e) {} finish(); };
  const v = _ttsPickVoice(lang);
  const step = () => {
    if (stopped) return;
    if (i >= chunks.length) { finish(); return; }
    const c = chunks[i];
    const idx = i; // 給非同步 timer 抓穩目前段落（i 之後會被 onend 遞增）
    const u = new SpeechSynthesisUtterance(c.t);
    u.lang = lang; u.rate = rate; u.pitch = 1;
    if (v) u.voice = v;
    if (onProgress) u.onboundary = (e) => { boundarySeen = true; report((before[idx] + (e.charIndex || 0)) / totalChars); };
    u.onend = () => { clearTick(); report((before[idx] + c.t.length) / totalChars); i += 1; if (!stopped) setTimeout(step, c.pause); };
    u.onerror = () => { clearTick(); i += 1; if (!stopped) setTimeout(step, c.pause); };
    try { synth.resume(); } catch (e) {}
    synth.speak(u);
    // 估時後備：onboundary 沒動時，用約 14 字/秒（隨 rate 調整）在本段內線性推進，
    // 上限剛好是本段結尾 (before[idx]+c.t.length)/totalChars，永遠不會超過。
    if (onProgress) {
      clearTick();
      const startT = Date.now();
      const estMs = Math.max(1, (c.t.length / (14 * rate)) * 1000);
      tick = setInterval(() => {
        if (stopped || boundarySeen) return;
        const frac = Math.min(1, (Date.now() - startT) / estMs);
        report((before[idx] + frac * c.t.length) / totalChars);
      }, 70);
    }
  };
  _activeSpeak = stop;
  setTimeout(() => { if (!stopped) step(); }, 60);
  return stop;
}

// ── Sound Effects ──────────────────────────────────────────────────────
let _audioCtx = null;
function _getAudio() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
function playSound(type) {
  try {
    const ctx = _getAudio();
    const tone = (freq, startT, dur, type2 = 'sine', vol = 0.26) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type2; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime + startT);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startT + dur);
      o.start(ctx.currentTime + startT); o.stop(ctx.currentTime + startT + dur);
    };
    if (type === 'correct')  { tone(523,0,.18); tone(659,.1,.18); tone(784,.2,.22); }
    else if (type === 'wrong')   { tone(220,0,.15,'square',.16); tone(160,.1,.2,'square',.14); }
    else if (type === 'match')   { tone(880,0,.08); tone(1200,.07,.12); }
    else if (type === 'complete'){ tone(523,0,.2); tone(659,.1,.2); tone(784,.2,.2); tone(1047,.32,.35,'sine',.3); }
    else if (type === 'badge')   { tone(880,0,.1); tone(1100,.08,.1); tone(1320,.18,.25); }
    else if (type === 'streak')  { tone(440,0,.12); tone(554,.1,.12); tone(659,.22,.22); }
    /* v375(#7): 練習完成的「大」音效——比 complete 長、有收尾和弦，配彩帶用 */
    else if (type === 'fanfare') {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.085, .22, 'triangle', .22));
      tone(1319, .36, .5, 'triangle', .24);
      tone(1047, .36, .55, 'sine', .16);
      tone(784,  .36, .6,  'sine', .12);
      tone(2093, .52, .35, 'sine', .09);
    }
    else if (type === 'pop')     { tone(660,0,.07,'triangle',.18); tone(990,.05,.09,'triangle',.14); }
  } catch(e) { /* AudioContext may be blocked on first interaction */ }
}

// ── Streak & Badges ────────────────────────────────────────────────────
const BADGES = {
  first_quiz:  { emoji:'🌟', name:'初學者',    nameEn:'First Step',     desc:'完成第一個測驗' },
  perfect:     { emoji:'🏆', name:'第一次滿分', nameEn:'Perfect Score',  desc:'任一測驗拿到100分' },
  streak_3:    { emoji:'🔥', name:'三天連勝',   nameEn:'3-Day Streak',   desc:'連續3天學習' },
  streak_7:    { emoji:'🔥', name:'七天連勝',   nameEn:'7-Day Streak',   desc:'連續7天學習' },
  streak_30:   { emoji:'💎', name:'月冠軍',     nameEn:'30-Day Streak',  desc:'連續30天學習' },
  scholar:     { emoji:'📚', name:'週全勤',     nameEn:'Week Complete',  desc:'完成當週全部測驗' },
  quiz_10:     { emoji:'⚡', name:'練習王',     nameEn:'Quiz Veteran',   desc:'完成10個測驗' },
  xp_500:         { emoji:'🥈', name:'積分新星',   nameEn:'XP Rising Star',   desc:'累積500 XP' },
  xp_1000:        { emoji:'🥇', name:'積分達人',   nameEn:'XP Expert',        desc:'累積1000 XP' },
  xp_3000:        { emoji:'👑', name:'英語之星',   nameEn:'English Star',     desc:'累積3000 XP' },
  mistake_master: { emoji:'🎯', name:'錯題終結者', nameEn:'Mistake Master',   desc:'一次清空所有錯題' },
};

// ── 夥伴台詞表（可自由增減 / 換梗）──────────────────────────────────
// correct/wrong：答題當下；win/lose：整份完成時。鼓勵為主 + 小小吐槽（對題目調皮、不傷人）。
const COMPANION_LINES = {
  correct: ['太強了吧 😎', '這題難不倒你！', '答對了，繼續衝！', '根本高手 🔥', '帥喔～'],
  wrong:   ['哎呀～這題想偷襲你 😏 再試一次！', '差一點點，我都替你緊張 😅', '67～有點太菜了喔 👋', '再想想，你可以的 💪'],
  win:     ['太強了吧 😎 你根本是冒險者！', '完美通關！夥伴超驕傲 🥹', '這實力，魔王都怕你 🔥', '帥到認不出來！'],
  lose:    ['67～有點太菜了喔 👋 再挑戰一次！', '差一點點！我都替你緊張 😅', '沒關係，高手都是練出來的 💪', '再來一次，這次一定過！'],
};
function pickLine(kind) {
  const arr = (COMPANION_LINES[kind] || ['加油！']);
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── XP helpers ─────────────────────────────────────────────────────────
function getLevel(xp) {
  if (xp >= 3000) return { level:5, name:'英語之星', icon:'👑', next:null,  prevXp:3000 };
  if (xp >= 1000) return { level:4, name:'英語高手', icon:'🌟', next:3000, prevXp:1000 };
  if (xp >= 500)  return { level:3, name:'進步王',   icon:'⚡', next:1000, prevXp:500  };
  if (xp >= 200)  return { level:2, name:'書蟲',     icon:'📚', next:500,  prevXp:200  };
  return           { level:1, name:'新苗',     icon:'🌱', next:200,  prevXp:0    };
}

async function updateStreak(uid) {
  if (!uid) return { count: 0, isNew: false };
  try {
    const today = new Date().toDateString();
    const ref = _db.collection('progress').doc(uid);
    const snap = await ref.get();
    const d = snap.exists ? (snap.data() || {}) : {};
    const s = d.streak || { count: 0, lastDate: null };
    if (s.lastDate === today) return { count: s.count, isNew: false };
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const newCount = (s.lastDate === yest.toDateString()) ? s.count + 1 : 1;
    await ref.set({ streak: { count: newCount, lastDate: today } }, { merge: true });
    return { count: newCount, isNew: true };
  } catch(e) { return { count: 0, isNew: false }; }
}

async function unlockBadge(uid, badgeId) {
  if (!uid || !BADGES[badgeId]) return false;
  try {
    const ref = _db.collection('progress').doc(uid);
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data()?.badges || {}) : {};
    if (existing[badgeId]) return false; // already unlocked
    const u = {}; u[`badges.${badgeId}`] = Date.now();
    try { await ref.update(u); } catch(e2) {
      await ref.set({ badges: { [badgeId]: Date.now() } }, { merge: true });
    }
    return true;
  } catch(e) { return false; }
}

async function saveQuizMistakes(uid, displayName, email, itemId, wrongList) {
  if (!uid || !itemId) return;
  const wrongQuestions = (wrongList || []).map(q => {
    const o = {
      q: String(q.q || '').slice(0, 180),
      answer: String((q.options || [])[q.correct] || '').slice(0, 120),
    };
    // v318 (#3): 一併存「原始選項＋正解索引」，錯題重練才能用原題原選項（不再亂湊干擾項）
    if (Array.isArray(q.options) && q.options.length >= 2 &&
        typeof q.correct === 'number' && q.correct >= 0 && q.correct < q.options.length) {
      o.options = q.options.map(x => String(x).slice(0, 120)).slice(0, 6);
      o.correct = q.correct;
    }
    return o;
  }).filter(q => q.q);
  try {
    const ref = _db.collection('progress').doc(uid);
    await ref.set({
      name: displayName || '',
      email: email || '',
      updatedAt: Date.now(),
    }, { merge: true });
    const update = {};
    update[`items.${itemId}.wrongQuestions`] = wrongQuestions;
    update[`items.${itemId}.wrongCount`] = wrongQuestions.length;
    await ref.update(update);
  } catch(e) { console.warn('saveQuizMistakes:', e); }
}

function subscribeUserProfile(uid, callback) {
  if (!uid) return () => {};
  return _db.collection('progress').doc(uid).onSnapshot(snap => {
    const d = snap.exists ? (snap.data() || {}) : {};
    callback({
      streak: d.streak || { count: 0, lastDate: null },
      badges: d.badges || {},
      xp:     d.xp     || 0,
    });
  });
}

// ── AI Writing Practice ─────────────────────────────────────────────────
// For production, point this at a small server/Firebase Function that keeps
// the AI API key private. It should accept { word, sentence } and return
// { feedback: "..." } or plain text.
const AI_WRITING_ENDPOINT = 'https://alan-ai-proxy.alan07050445.workers.dev';
// ⚠ v392 刪掉：這裡原本還留著一個前端金鑰常數，以及「繞過 Worker 直接打
// Anthropic 官方端點」的 fallback。金鑰放在前端等於公開（歷史版本真的貼過四把，
// 現在還留在公開的 git 歷史裡），留著那段就是下次不小心再貼一把的坑。
// 現在只有一條路：全部走上面這個 Worker 代理；沒有端點就退回本機的規則式回饋。

async function checkWriting(word, sentence, instruction = '', zhHint = '') {
  if (!sentence || !sentence.trim()) return '請先寫一個英文句子。';
  const endpoint = AI_WRITING_ENDPOINT || localStorage.getItem('alan-ai-writing-endpoint') || '';

  const systemPrompt =
`You are an elementary English teacher grading a student's sentence.
The teacher may provide either a target word, phrase, grammar pattern, or writing prompt: "${word}".
If it is clearly a vocabulary word or phrase, check whether the student uses it correctly.
If it is a topic or writing prompt, check whether the sentence clearly answers the prompt.
Grade objectively. Do not invent praise. Every Good Job item must point to something actually present in the student's sentence.
If there is no clear objective strength, write: "目前還沒有明確做到的地方，先把句子補完整。"

Scoring standard (5 stars):
5★ = target word/prompt is answered correctly + grammar is correct + at least 7 words + capitalization/punctuation are correct + sentence is specific/clear.
4★ = mostly correct, with one small issue.
3★ = understandable, but has a grammar issue, weak detail, or only basic word usage.
2★ = target word/prompt is attempted but usage/grammar/completeness is weak.
1★ = missing the target word/prompt, wrong meaning, fragment, or too unclear.

Reply bilingually in Traditional Chinese + simple English. Output ONLY these four sections.
Every section must include BOTH Chinese and English, even when the score is 4★ or 5★.
Do not output an English-only explanation. Do not output a Chinese-only explanation.

【Score】
Use exactly 5 star characters, e.g. ⭐⭐⭐☆☆ (3/5), then:
中文：one short objective reason in Traditional Chinese.
English: one short objective reason in simple English.

【Good Job】
List 1-2 specific, factual things the student actually did well.
Each bullet must include:
中文：Traditional Chinese feedback.
English: simple English feedback.
Do not say "good grammar" unless grammar is correct. Do not say "used the word well" unless "${word}" is used with the correct meaning.

【To Improve】
List 1-2 objective fixes.
Each bullet must include:
中文：Traditional Chinese feedback.
English: simple English feedback.
Mention exact issues such as missing target word/prompt, wrong meaning, grammar error, fewer than 7 words, missing capital letter, missing punctuation, or not enough detail.

【Better Version】
English: Write one improved sentence using or answering "${word}" correctly. Keep the student's idea when possible. The sentence must be at least 7 words, natural, and suitable for elementary students.
中文：Write a Traditional Chinese meaning/explanation of the improved sentence.`;

  const userMessage = `造句題目 / Target prompt：${word}\n${zhHint ? `中文提示：${zhHint}\n` : ''}${instruction ? `老師補充規則：${instruction}\n` : ''}\n學生句子：${sentence.trim()}`;

  if (endpoint) {
    try {
      // fetchT：加 60 秒逾時。原本是裸 fetch，Worker 收下請求但不回應時 promise 永遠 pending，
      // 學生端的「批改中…」就會一直轉圈轉不完。
      const res = await fetchT(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 700,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await res.json().catch(() => null);
      return data?.content?.[0]?.text || data?.feedback || data?.text || '批改完成，但回傳格式不符。';
    } catch(e) {
      if (e && e.name === 'AbortError') return 'AI 批改太久沒有回應，請再試一次。';
      return 'AI 批改服務暫時連不上，請稍後再試。';
    }
  }
  // 沒有端點時退回本機的規則式回饋（行為與以前相同）
  return localWritingFeedback(word, sentence);
}

// ── v379: AI 出題（配對連線的英文定義／填空的情境例句＋中文解說）────────────
// Alan 本來的做法是把單字貼給 ChatGPT、拿回來再匯入。
// alan-ai-proxy 這個 Worker 本來就是「通用的 Anthropic 代理」（收 system+messages 原樣轉送），
// 所以不用重新部署，直接換一組 prompt 就能在網站裡出題。
/* 所有 system prompt 共用的一行：叫模型不要輸出換行與縮排。
   實測同一組 10 個單字，未加時 output_tokens 883/1196（含 83 個換行），
   加了之後 866/882（0 個換行）——依 176 tok/s 換算約省 1.9 秒。
   ⚠ _aiStripFence 仍然保留，因為模型偶爾還是會加 code fence。 */
const _AI_MINIFY =
  "Output the JSON MINIFIED on a single line: no newlines, no indentation, no spaces after ':' or ','. Do not wrap it in a code fence.";

const AI_VOCAB_SYS =
`You write English exercises for Taiwanese elementary-school students (grades 2-6, CEFR A1-A2).
Output ONLY a JSON array. No prose, no markdown, no code fences.

For each target word output:
{"word":"<word> (<pos.>)","zh":"<Traditional Chinese meaning>","def":"<definition>","sentence":"<context sentence with ___>","answer":"<the word as it fills the blank>","explain":"<Traditional Chinese explanation>"}

RULES
- zh: the Traditional Chinese meaning of the word, 2-8 characters, no explanation (e.g. 遺產／移民／訪問).
- def: a kid-friendly ENGLISH definition, 5-14 words, no ending punctuation, and it must NOT contain the target word or any form of it.
- sentence: ONE natural sentence, 12-22 words, with exactly one ___ where the word goes. The rest of the sentence must give enough clues to work the answer out. Never let the target word appear anywhere else in the sentence.
- answer: the exact surface form that fills the blank (may be inflected, e.g. plural or past tense).
- explain: Traditional Chinese, 20-45 characters. Copy the clue phrase from YOUR OWN sentence (not from the definition), say in Chinese what that clue means, then give the answer. Never output the literal characters "…" or "..." — always write the real reasoning.
  GOOD: 「old photos and stories from our grandparents」是家族一代一代留下來的東西，所以是 heritage（文化遺產）。
  GOOD: 「asked her many questions」是訪問別人的動作，所以是 interview（訪問）。
  BAD:  「something valuable passed down」表示…，所以是 heritage（文化遺產）。
  BAD:  quoting the definition instead of a phrase from the sentence.
- Keep every other word simple. Use the student's own world (school, family, food, animals, festivals).
- Return the words in the same order they were given, one object per word.
${_AI_MINIFY}`;

/* ══════════════════════════════════════════════════════════════════════════
   v406：一鍵出單字再多一種——「短文填空」（Alan 給的學校作業 Part B 就長這樣）
   ──────────────────────────────────────────────────────────────────────────
   一篇小故事，把這一課的每個單字各挖一個空格，學生讀上下文把字填回去。
   輸出的 passage 直接就是 cloze 題型吃的格式：`[answer]` 是空格，
   後面可以再接 `(提示)`——跟老師紙本上的 `______(ing)` 一模一樣
   （components-quiz-mode.jsx 的 parseClozePassage / ClozePlayer 已經支援）。 */
const AI_STORY_SYS =
`You write ONE short cloze story for Taiwanese elementary-school students (grades 2-6, CEFR A1-A2).
Output ONLY a JSON object. No prose, no markdown, no code fences.

{"title":"<2-5 words>","passage":"<the story>"}

RULES
- The story must use EVERY target word exactly once, and nothing else may be bracketed.
- Wrap each target word in square brackets where it belongs: [word]
- If the word needs a different form, put the exact form the student types inside the brackets
  and the ending as a hint right after: [soaring](ing)  [attracts](s)  [trapped](ed)
- Never let a target word appear anywhere outside its own brackets (no giveaways).
- 70-140 words, 4-8 sentences, one connected story with a beginning and an end.
- Every OTHER word must be simple, everyday vocabulary a 3rd grader knows.
- Give enough context around each blank that a child can work the answer out.
- title: a short story title, no ending punctuation.
${_AI_MINIFY}`;

/* 空格 → { answer, hint }。跟 parseClozePassage 同一條規則，這裡只是為了做檢查。 */
function storyBlanks(passage) {
  const out = [];
  const re = /\[([^\]]+)\](?:\(([^)]*)\))?/g;
  let m;
  while ((m = re.exec(String(passage || '')))) out.push({ answer: m[1].trim(), hint: (m[2] || '').trim() });
  return out;
}

const _storyNorm = (x) => String(x || '').toLowerCase().replace(/[^a-z]/g, '');

/* 字尾提示——作業紙上的 ______(ing) 就是這個。
   ⚠ 只有「認得出來的變化」才給提示；認不出來就不給。
   寧可沒提示，也不要給一個錯的提示害小朋友填錯。
   這個函式同時被當成「這兩個字是不是同一個字的變化形」的白名單用（見 _storyIsForm）。 */
function _storyHint(term, form) {
  const t = _storyNorm(term), f = _storyNorm(form);
  if (!t || !f || f === t) return '';
  if (f === t + 's')   return 's';
  if (f === t + 'es')  return 'es';
  if (f === t + 'ed')  return 'ed';
  if (f === t + 'd')   return 'd';
  if (f === t + 'ing') return 'ing';
  if (f === t + 'er')  return 'er';
  if (f === t + 'est') return 'est';
  if (f === t + 'ly')  return 'ly';
  if (t.endsWith('y')) {                                    // carry → carries / carried
    const y = t.slice(0, -1);
    if (f === y + 'ies') return 'ies';
    if (f === y + 'ied') return 'ied';
    if (f === y + 'ier') return 'ier';
  }
  if (t.endsWith('e')) {                                    // shade → shading
    const e = t.slice(0, -1);
    if (f === e + 'ing') return 'ing';
  }
  const dbl = t + t.slice(-1);                              // trap → trapping / trapped
  if (f === dbl + 'ing') return 'ing';
  if (f === dbl + 'ed')  return 'ed';
  if (f === dbl + 'er')  return 'er';
  return '';
}
/* 嚴格版的「同一個字」：本尊，或上面列得出來的變化形。
   找「文章裡哪一個字要挖掉」時一定要用這個版本——寬鬆版會把 trapeze 當成 trap。 */
function _storyIsForm(term, token) {
  const t = _storyNorm(term), f = _storyNorm(token);
  if (!t || !f) return false;
  return f === t || _storyHint(term, token) !== '';
}
/* 寬鬆版：只用來「檢查有沒有用到」，允許沒列到的變化形（漏判比誤判傷害大）。 */
function _storySame(a, b) {
  const x = _storyNorm(a), y = _storyNorm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [lo, hi] = x.length <= y.length ? [x, y] : [y, x];
  if (hi.startsWith(lo) && hi.length - lo.length <= 4) return true;
  if (lo.endsWith('y') && hi.startsWith(lo.slice(0, -1) + 'i') && hi.length - lo.length <= 4) return true;
  return false;
}

/* ⚠ AI 生出來的東西一律用程式驗一次（這個專案吃過虧）：
   哪些字沒被用到、哪些空格根本不是這一課的字、有沒有在括號外面洩答案。 */
function storyCheck(passage, words) {
  const terms = (words || []).map(w => String((w && w.term) || w || '').trim()).filter(Boolean);
  const blanks = storyBlanks(passage);
  const used = [], missing = [];
  terms.forEach(t => {
    (blanks.some(b => _storySame(b.answer, t)) ? used : missing).push(t);
  });
  const extra = blanks.filter(b => !terms.some(t => _storySame(b.answer, t))).map(b => b.answer);
  // 括號外面直接出現目標字＝答案被洩漏
  const bare = String(passage || '').replace(/\[[^\]]*\](?:\([^)]*\))?/g, ' ');
  const leaked = terms.filter(t => new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(bare));
  return { blanks: blanks.length, used, missing, extra, leaked };
}
/* 分數越低越好——多輪重生時用來挑「最不糟的那一篇」 */
function _storyScore(c) {
  return (c.missing.length * 3) + (c.leaked.length * 2) + c.extra.length;
}

/* ══════════════════════════════════════════════════════════════════════════
   v407（Alan：「這個新增題型我要百分之百能夠成功」）
   ──────────────────────────────────────────────────────────────────────────
   v406 只驗不修：驗到問題就把琥珀色警告丟給老師，等於把 AI 的失誤變成老師的工。
   這一版改成三層，只有全部落空才會讓老師看到問題：
     ① 程式修（storyFix）——修得掉的一律當場修好，不重打 AI：
        · 挖到不是這一課的字 → 把括號拆掉，文字本身不動
        · 目標字寫在括號外面 → 直接挖成空格
          （這一步同時解決「漏了這個字」與「答案被洩漏」——
           AI 最常見的失誤就是「字有寫進去、只是忘了加括號」）
     ② 重生（最多 3 輪）——把「這次哪裡不合格」原原本本寫進下一輪的 prompt
     ③ 保底（rescue）——還漏的字，直接把「填空題」那一份現成的例句接到故事後面。
        填空題本來就跟短文同一批平行生成，所以這一步不用多等 AI。
   ══════════════════════════════════════════════════════════════════════════ */

const _STORY_MAX_BLANK = 3;   // 同一個字最多挖幾格（避免整篇被同一個字洗版）

/* 找出「不在任何括號裡」的第一個目標字（含變化形）。回傳 {i, form} 或 null。 */
function _storyFindBare(passage, term, from) {
  const p = String(passage || '');
  // 先算出所有「受保護」的區間：[答案] 與緊接著的 (提示) 都不能動
  const guard = [];
  const gre = /\[[^\]]*\](?:\([^)]*\))?/g;
  let g;
  while ((g = gre.exec(p))) guard.push([g.index, g.index + g[0].length]);
  const inGuard = (i) => guard.some(([a, b]) => i >= a && i < b);
  const wre = /[A-Za-z]+/g;
  let m;
  wre.lastIndex = from || 0;
  while ((m = wre.exec(p))) {
    if (inGuard(m.index)) continue;
    if (_storyIsForm(term, m[0])) return { i: m.index, form: m[0] };
  }
  return null;
}

/* 程式修補。回傳 { passage, check, notes }——notes 是給老師看的「我幫你改了什麼」。 */
function storyFix(passage, words) {
  const terms = (words || []).map(w => String((w && w.term) || w || '').trim()).filter(Boolean);
  let p = String(passage || '').trim();
  const notes = [];

  // ① 不是這一課的字被挖走 → 拆掉括號與提示，句子本身完全不動
  const dropped = [];
  p = p.replace(/\[([^\]]+)\](?:\([^)]*\))?/g, (m, a) => {
    if (terms.some(t => _storySame(a, t))) return m;
    dropped.push(a.trim());
    return a;
  });
  if (dropped.length) notes.push(`拆掉不該挖的空格：${dropped.join('、')}`);

  // ② 目標字出現在括號外面 → 就地挖成空格（順便把字尾提示補上）
  const wrapped = [];
  terms.forEach(t => {
    for (let n = 0; n < _STORY_MAX_BLANK; n++) {
      if (storyBlanks(p).filter(b => _storySame(b.answer, t)).length >= _STORY_MAX_BLANK) break;
      const hit = _storyFindBare(p, t);
      if (!hit) break;
      const h = _storyHint(t, hit.form);
      p = p.slice(0, hit.i) + '[' + hit.form + ']' + (h ? '(' + h + ')' : '') + p.slice(hit.i + hit.form.length);
      wrapped.push(hit.form);
    }
  });
  if (wrapped.length) notes.push(`補挖成空格：${wrapped.join('、')}`);

  return { passage: p, check: storyCheck(p, terms), notes };
}

/* ③ 保底：把「填空題」現成的例句接到故事後面，一個漏掉的字一句。
   ex 的形狀就是 aiMakeVocabExercises 的輸出（{ term, sentence:'… ___ …', answer }）。 */
function _storyRescue(passage, missing, ex) {
  if (!Array.isArray(ex) || !ex.length || !missing.length) return { passage, added: [] };
  let out = String(passage || '').replace(/\s+$/, '');
  const added = [];
  missing.forEach(t => {
    const e = ex.find(x => x && (_storySame(x.term, t) || _storySame(x.answer, t)));
    const sent = e && String(e.sentence || '').trim();
    if (!sent || !/_{2,}|___/.test(sent)) return;
    const ans = String(e.answer || t).trim();
    const h = _storyHint(t, ans);
    const s = sent.replace(/_+/, '[' + ans + ']' + (h ? '(' + h + ')' : ''));
    if (s.indexOf('[') < 0) return;
    out += ' ' + s;
    added.push(t);
  });
  return { passage: out, added };
}

async function aiMakeVocabStory(words, { hint = '', rescue = null, rounds = 3 } = {}) {
  const list = (words || []).map(w => (typeof w === 'string' ? { term: w } : w)).filter(w => w && w.term);
  if (list.length < 2) throw new Error('至少要 2 個單字才生得出短文。');
  const head =
    (hint ? `Story topic / lesson title: ${hint}\n` : '') +
    'Target words (use each exactly once):\n' +
    list.map(w => `- ${w.term}${w.zh ? `  (${w.zh})` : ''}`).join('\n');

  let best = null, lastErr = null, note = '';
  for (let round = 0; round < Math.max(1, rounds); round++) {
    let r = null;
    try {
      /* max_tokens：一篇 140 字的故事約 250 token，留兩倍餘裕。
         ⚠ 不要砍太低——被 max_tokens 截斷的話 JSON 會壞掉，整批重試反而更慢。 */
      r = await _aiAsk({
        model: 'claude-haiku-4-5', max_tokens: 900,
        system: AI_STORY_SYS,
        messages: [{ role: 'user', content: head + note }],
      }, (data) => {
        const txt = data?.content?.[0]?.text || data?.text || '';
        const o = JSON.parse(_aiStripFence(txt));
        return (o && typeof o.passage === 'string' && o.passage.indexOf('[') >= 0) ? o : null;
      });
    } catch (e) { lastErr = e; continue; }

    const fixed = storyFix(r.passage, list);
    const cand = {
      title: String(r.title || '').trim(),
      passage: fixed.passage, check: fixed.check, fixes: fixed.notes, rounds: round + 1,
    };
    if (!_storyScore(cand.check)) return cand;                       // 完全乾淨，收工
    if (!best || _storyScore(cand.check) < _storyScore(best.check)) best = cand;

    /* 下一輪把「這次哪裡不合格」原原本本告訴它。
       泛泛地說「請再試一次」沒有用（v382 學到的），要指名道姓。 */
    const c = cand.check;
    note = '\n\nYour previous attempt was rejected. Fix exactly these problems:\n' +
      (c.missing.length ? `- These target words were never used: ${c.missing.join(', ')}\n` : '') +
      (c.leaked.length  ? `- These target words appear OUTSIDE their brackets, which gives the answer away: ${c.leaked.join(', ')}\n` : '') +
      (c.extra.length   ? `- You bracketed words that are not targets: ${c.extra.join(', ')}\n` : '') +
      'Write a NEW story that uses every target word exactly once, each one inside brackets.';
  }

  if (!best) throw lastErr || new Error('AI 這次沒有生出短文，請再試一次。');

  // ③ 還漏字 → 用「填空題」那一份現成的例句補上（不用再等 AI）
  if (best.check.missing.length && rescue) {
    let ex = null;
    try { ex = await Promise.resolve(typeof rescue === 'function' ? rescue() : rescue); } catch (e) { ex = null; }
    const pat = _storyRescue(best.passage, best.check.missing, ex);
    if (pat.added.length) {
      const again = storyFix(pat.passage, list);
      best = { ...best, passage: again.passage, check: again.check,
               fixes: (best.fixes || []).concat(again.notes, [`用填空題的例句補上：${pat.added.join('、')}`]) };
    }
  }
  return best;
}

function _aiStripFence(t) {
  const s = String(t || '').trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : s).trim();
}

/* ── v392: AI 呼叫的三個共用小工具 ──────────────────────────────────────
   為什麼要加：出一套時態題原本要 118 秒，老師在校稿頁前面乾等。
   量出來的延遲公式是 latency ≈ 1.4s + output_tokens / 176 ——
   幾乎全部是「吐字時間」，跟 prompt 長短、max_tokens 都無關。
   所以只有兩條路能快：把請求拆小、以及把請求同時送出去。 */

/* pMap：有上限的平行 map。單一請求失敗只讓那一格變 null，不會拖垮整批
   （呼叫端本來就要驗證＋補不足，null 就當成「這一發沒中」）。
   端點是 HTTP/2，實測 30 個請求同時打全部成功、沒有被限流；
   瀏覽器對 HTTP/2 也沒有「每網域 6 條連線」的限制，所以平行在前端真的會生效。 */
async function pMap(list, fn, limit = 8) {
  const out = new Array(list.length);
  let i = 0;
  const worker = async () => {
    while (i < list.length) {
      const k = i++;
      try { out[k] = await fn(list[k], k); } catch (e) { out[k] = null; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}

/* fetchT：帶逾時的 fetch。原本全站的 AI fetch 都沒有 timeout，
   Worker 收下請求卻不回應時 promise 永遠 pending → UI 的 busy 狀態永遠不解除。
   逾時會丟 AbortError，呼叫端據此給「太久沒有回應」的文案。 */
function fetchT(url, opts, ms = 60000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
}

/* _aiBackoff：重試之間的等待。原本是 catch 完立刻重試、不看 status，
   兩次會在 100ms 內燒光，等於沒有重試。改成 400→1200→3000ms 各加 0–300ms 隨機
   （加隨機是為了避免平行的十幾個請求同時醒來、又一起撞上去）。 */
const _AI_BACKOFF = [400, 1200, 3000];
const _aiSleep = (ms) => new Promise(r => setTimeout(r, ms));
/* 只有「連線／逾時例外」或「429 / 500 / 529」才值得等一下再試；
   400 那種是我們自己的格式錯誤，等再久也一樣，直接進下一輪。 */
function _aiShouldBackoff(status) { return status === 429 || status === 500 || status === 529; }

/* _aiAsk：全站 AI 呼叫的單一入口（逾時＋退避重試都在這裡）。
   pick(json) 把回傳整理成呼叫端要的東西；回 null／undefined 或丟例外
   就當「這一發沒中」，換下一輪（格式錯誤不等待，直接重打）。
   三次都沒中才丟錯，錯誤物件上帶 .timeout 讓 UI 能給不同文案。 */
async function _aiAsk(body, pick, timeoutMs) {
  let timedOut = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    let wait = false;
    try {
      const res = await fetchT(AI_WRITING_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }, timeoutMs || 60000);
      try {
        const data = await res.json();
        const got = pick(data);
        if (got != null) return got;
      } catch (e) { /* 不是 JSON、或格式不符 → 立刻換下一輪，等待也沒用 */ }
      wait = !res.ok && _aiShouldBackoff(res.status);   // 只有 429/500/529 值得等
    } catch (e) {
      if (e && e.name === 'AbortError') timedOut = true;
      wait = true;                                      // 連線失敗／逾時 → 退避後再試
    }
    if (wait && attempt < _AI_BACKOFF.length - 1) {
      await _aiSleep(_AI_BACKOFF[attempt] + Math.floor(Math.random() * 300));
    }
  }
  const err = new Error(timedOut
    ? 'AI 太久沒有回應，請再試一次。'
    : 'AI 出題失敗（回傳格式看不懂），請再試一次。');
  err.timeout = timedOut;
  throw err;
}

/* words: [{ term, zh }]（zh 只是給 AI 當語意提示，可省略）
   回傳 [{ word, def, sentence, answer, explain }]，順序與輸入相同。 */
/* v392: 改成「先切成一堆小請求，再一次平行送出去」。
   chunk 從 10 縮成 2：延遲幾乎全是吐字時間（≈ output_tokens / 176），
   所以每個請求要吐的字變少＝每個請求本身就變快；再加上全部同時跑，
   20 個單字實測從 20.8 秒降到 3 秒上下。
   ⚠ 對回輸入順序的方式完全沒變（part.forEach((w,k) => parsed[k]），
   校稿頁看到的欄位、順序、中文解說都跟以前一樣。 */
async function aiMakeVocabExercises(words, { onProgress, chunk = 2, hint = '' } = {}) {
  const list = (words || []).map(w => (typeof w === 'string' ? { term: w } : w)).filter(w => w && w.term);
  if (!list.length) return [];
  const size = Math.max(1, +chunk || 1);
  const parts = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));

  let doneWords = 0;
  let timedOut = false;
  const packs = await pMap(parts, async (part) => {
    const userMsg =
      (hint ? `Context / topic: ${hint}\n` : '') +
      'Target words:\n' +
      part.map(w => `- ${w.term}${w.zh ? `  (Chinese meaning: ${w.zh})` : ''}`).join('\n');
    try {
      /* max_tokens 700：chunk=2 時實測用量遠低於此，留約 1.6 倍餘裕當保險絲。
         ⚠ 不要再往下砍——一旦 stop_reason 變成 max_tokens，JSON 會被截斷、
         解析直接失敗然後整批重試，反而更慢。chunk 被呼叫端調大時按比例放寬。 */
      const arr = await _aiAsk({
        model: 'claude-haiku-4-5', max_tokens: Math.max(700, part.length * 350),
        system: AI_VOCAB_SYS,
        messages: [{ role: 'user', content: userMsg }],
      }, (data) => {
        const txt = data?.content?.[0]?.text || data?.text || '';
        const a = JSON.parse(_aiStripFence(txt));
        return Array.isArray(a) ? a : null;
      });
      return arr;
    } catch (e) {
      if (e && e.timeout) timedOut = true;
      throw e;
    } finally {
      // 進度語意不變：仍然是「已完成幾個字 / 總共幾個字」，只是 chunk 變小、回報變密
      doneWords += part.length;
      if (onProgress) onProgress(Math.min(doneWords, list.length), list.length);
    }
  }, 10);

  if (packs.some(p => !p)) {
    throw new Error(timedOut
      ? 'AI 太久沒有回應，請再試一次。'
      : 'AI 出題失敗（回傳格式看不懂），請再試一次。');
  }

  const out = [];
  parts.forEach((part, pi) => {
    const parsed = packs[pi] || [];
    // 用輸入的順序對回去，AI 少給或多給都不會錯位
    part.forEach((w, k) => {
      const r = parsed[k] || {};
      out.push({
        term: w.term,
        zh: w.zh || String(r.zh || '').trim(),   // 老師自己寫的中文優先，沒寫才用 AI 的
        word: String(r.word || w.term).trim(),
        def: String(r.def || '').trim(),
        sentence: String(r.sentence || '').trim(),
        answer: String(r.answer || w.term).trim(),
        explain: String(r.explain || '').trim(),
      });
    });
  });
  return out;
}

// ── v382: AI 出時態題目（五大時態核心題庫）────────────────────────────────
// Type A 單句填空 → type-answer（打字作答，大小寫不計、拼字與形式要對）
// Type B 短文填空 → cloze（passage 用 [答案](原形) 標記，括號會顯示成空格旁的提示）
const GR_TENSES = {
  t1: {
    zh: '現在簡單式', en: 'Simple Present Tense',
    must: `I/You/We/They + base form. He/She/It + -s or -es. consonant+y -> -ies. have -> has. do -> does. be: am/is/are.
Negatives: do not / does not + base form. Questions: Do / Does + subject + base form.
Meaning: habits, routines, schedules, facts and general truths.
Frequency adverbs: always, usually, often, sometimes, never.
Time clues: every day, on Mondays, once a week, after dinner.`,
    avoid: `Do not use past or future time clues. Do not use continuous forms.`,
  },
  t2: {
    zh: '過去簡單式', en: 'Simple Past Tense',
    must: `Regular verbs + -ed. Verbs ending in e + -d. consonant+y -> -ied. short vowel + single consonant -> double the consonant + -ed.
Common irregular verbs. be: was / were.
Negatives: did not + base form. Questions: Did + subject + base form.
Meaning: actions finished in the past.
Time clues: yesterday, last night, last week, two days ago, in 2025.`,
    avoid: `Do not use present perfect. Every item must have a clear finished-past time clue or context.`,
  },
  t3: {
    zh: '未來簡單式', en: 'Simple Future Tense',
    must: `will + base form. will be. Negatives: will not / won't + base form. Questions: Will + subject + base form.
Meaning: predictions, promises, sudden decisions, future events.
Time clues: tomorrow, next week, soon, later, in the future, one day.`,
    avoid: `NEVER use "be going to" anywhere — the student would not know which form the site wants. Only "will".`,
  },
  t4: {
    zh: '現在進行式', en: 'Present Progressive Tense',
    must: `am / is / are + V-ing. Normal verbs + -ing. Verbs ending in e -> drop e + -ing. short vowel + single consonant -> double the consonant + -ing. -ie -> -ying.
Negatives: am not / is not / are not + V-ing. Questions: Am / Is / Are + subject + V-ing.
Meaning: happening right now.
Time clues: now, right now, at the moment, Look!, Listen!`,
    avoid: `NEVER use stative verbs that do not take the progressive: know, believe, understand, need, like, want, hate.`,
  },
  t5: {
    zh: '現在完成式', en: 'Present Perfect Tense',
    must: `have / has + past participle. Regular and common irregular past participles. He/She/It + has. I/You/We/They + have.
Negatives: have not / has not + past participle. Questions: Have / Has + subject + past participle.
Meaning: finished but connected to now, life experience, state continuing from past until now.
Time clues: already, just, yet, ever, never, since, for.`,
    avoid: `NEVER use a finished past time such as yesterday, last week, two days ago, this morning, just now, today.
The answer must be the WHOLE verb phrase in one blank, e.g. "have finished" / "has left".
Do not use "have gone to" (it means the person is still away) — use "have been to" for experience.
NEVER use the present perfect CONTINUOUS (have/has been + V-ing) — that is a different tense and is not in this unit.
Do not mix past-tense verbs into the same sentence or passage.`,
  },
};

const _GR_SYS = (t, kind, n) => {
  const T = GR_TENSES[t];
  return `You write grammar drills for Taiwanese elementary students (Grade 4-6, CEFR A1-A2).
Questions in English. Explanations in Traditional Chinese.
Output ONLY valid JSON. No prose, no markdown fences.

TARGET TENSE: ${T.en}（${T.zh}）
The student must practise:
${T.must}
HARD AVOID:
${T.avoid}

UNIVERSAL RULES
- Every blank has EXACTLY ONE correct answer. Never write a sentence where two forms both work.
- Give enough time clues / context that the tense is unambiguous.
- Sentences must be complete and grammatical apart from the blank — check prepositions, articles and objects (e.g. "go to the supermarket", not "go the supermarket").
- Use Taiwanese elementary school life, family, food, animals, sports, science, travel.
- Vary the subject, verb and situation every time. Do NOT just swap names.

⚠⚠ THE SITE HAS ONE INPUT BOX PER BLANK. THIS IS THE MOST IMPORTANT RULE.
- EXACTLY ONE blank per sentence. Never two blanks in the same sentence.
- The answer may ONLY contain verb forms built from the base verb in the parentheses
  (plus a required auxiliary such as have/has/will/am/is/are).
- The answer must NEVER contain an adverb or a negative word.
  already / just / never / ever / yet / always / usually / not — these stay as ordinary
  words inside the sentence, OUTSIDE the blank. The student cannot guess them from "(finish)".
- For NEGATIVE items: write the auxiliary and "not" in the sentence, blank only the main verb.
    GOOD: \`Kevin does not ________ video games on school nights. (play)\`  → play
    BAD:  \`Kevin ________ video games on school nights. (not play)\`
- For QUESTION items: blank only the auxiliary at the start.
    GOOD: \`________ your sister like animals? (do)\`  → Does
    BAD:  \`________ you ________ a panda before? (see)\`
- Correct placement of adverbs:
    GOOD: \`I ________ my homework already. (finish)\`  → have finished
    BAD:  \`I ________ my homework. (finish)\` with answer "have already finished"
${kind === 'A' ? `
OUTPUT (${n} items):
{"items":[{"prompt":"<full sentence with ________ and the base verb in parentheses at the end>","answer":"<exact word(s) filling the blank>","explain":"<Traditional Chinese, 15-40 characters, say why>"}]}
- prompt format exactly like: \`Eric ________ his teeth before breakfast every morning. (brush)\`
  — 8 underscores, one space before the parentheses, base verb last.
- answer is only what goes in the blank (may be more than one word, e.g. "will visit", "have finished").
- Across the ${n} items, cover the full range listed above: different subjects, -s/-es/-ies, irregular forms, be-verbs, at least one negative and at least one question.`
: `
OUTPUT (${n} passage${n > 1 ? 's' : ''}):
{"items":[{"title":"<short English title>","passage":"<the passage>"}]}
- Each passage is ONE connected story of 80-130 words about a single situation. NOT unrelated sentences.
- Mark a blank like this: \`Lydia usually [wakes](wake) up at 6:30.\`  → [answer](base form)
- ⚠ EXACTLY 5 to 8 blanks per passage. COUNT THEM before you answer. Most verbs must stay as complete words so the story reads naturally.
- Every blank must be in the target tense. The WHOLE passage stays in that tense — never mix in past-tense verbs.
- ⚠ Inside [ ] put ONLY verb forms built from the base form in ( ). Adverbs stay outside the brackets:
    GOOD: \`We have already [finished](finish) the project.\`
    BAD:  \`We [have already finished](finish) the project.\`
    BAD:  \`Tom [has never been](be) to the zoo.\`  → write \`Tom has never [been](be) to the zoo.\``}

${_AI_MINIFY}`;
};

/* v392: 改走 _aiAsk（60 秒逾時＋429/500/529 才退避的三次重試）。
   原本是 catch 後立刻重試、不看 status，兩次會在 100ms 內燒光＝形同沒有重試。 */
async function _grCall(system, user, maxTokens) {
  return _aiAsk(
    { model: 'claude-haiku-4-5', max_tokens: maxTokens || 3000, system, messages: [{ role: 'user', content: user }] },
    (data) => {
      const arr = JSON.parse(_aiStripFence(data?.content?.[0]?.text || ''));
      return (arr && Array.isArray(arr.items)) ? arr.items : null;
    }
  );
}

/* ⚠ 只靠 prompt 講不動——模型很愛出「____ never ____」這種兩個空格的題目
   （那是課本的寫法，但這裡只有一個輸入框），也很愛把 never/just/already
   包進答案裡（學生看到「(see)」根本猜不到要加 never）。
   所以改成「程式驗，不合格就丟掉重生」，不靠模型自律。 */
const _GR_ADV = /\b(already|just|never|ever|yet|not|always|usually|often|sometimes|n't)\b/i;
/* 結構對了不代表內容對。這些是實測反覆出現、但不在 Alan 規格裡的東西。 */
const _GR_BAN = {
  t1: [/\bwill\b/i, /\b(am|is|are)\s+\w+ing\b/i, /\bhave\s+\w+ed\b/i],
  t2: [/\bwill\b/i, /\b(have|has)\s+/i, /\b(am|is|are)\s+\w+ing\b/i],
  t3: [/\bgoing\s+to\b/i, /\b(have|has)\s+/i],
  t4: [/\bwill\b/i, /\b(have|has)\s+/i,
       /\b(know|believe|understand|need|like|want|hate|belong|own)\b/i],
  // 現在完成進行式 (have been + V-ing) 不在規格裡；have gone 語意是「人還沒回來」，
  // 跟「經驗」的 have been 混在一起小朋友一定亂 → 一律不收
  t5: [/\bbeen\s+\w+ing\b/i, /\b(gone)\b/i, /\bwill\b/i],
};
function _grTenseOk(tense, x) {
  const hay = `${x.prompt || ''} ${x.answer || ''}`;
  if ((_GR_BAN[tense] || []).some(re => re.test(x.answer || ''))) return false;
  if (/\s(to|in|on|at|for|with|of)$/i.test(String(x.answer || '').trim())) return false;  // 答案不該以介系詞結尾
  if (tense === 't5' && /\b(yesterday|last (night|week|month|year)|ago|this morning|just now)\b/i.test(hay)) return false;
  if (tense === 't2' && /\b(tomorrow|next (week|month|year)|already|yet|since)\b/i.test(hay)) return false;
  return true;
}
function _grValidA(x) {
  if (!x || !x.prompt || !x.answer) return false;
  const blanks = (x.prompt.match(/_{3,}/g) || []).length;
  if (blanks !== 1) return false;                       // 一句只能一個空格
  if (!/\([^)]+\)\s*$/.test(x.prompt)) return false;    // 句尾要有 (原形動詞)
  if (_GR_ADV.test(x.answer)) return false;             // 答案不可以含副詞／否定
  if (/[?？]/.test(x.answer)) return false;
  const w = x.answer.trim().split(/\s+/).length;
  return w >= 1 && w <= 3;
}
/* 模型很愛把 never/already/just 包進 [ ] 裡（例 `[has never camped](camp)`），
   學生看到「(camp)」根本不知道要打 never。重生幾次也照樣犯，所以直接程式修：
   把助動詞＋副詞挪到空格外面，空格裡只留動詞本身 → `has never [camped](camp)`。
   這樣「空格＝剛好缺的那一塊」，學生看得到的就是他要補的。 */
function _grFixPassage(passage) {
  let out = String(passage || '').replace(/\[([^\]]+)\]\(([^)]*)\)/g, (whole, inner, base) => {
    if (!_GR_ADV.test(inner)) return whole;
    const parts = inner.trim().split(/\s+/);
    if (parts.length < 2) return whole;
    const verb = parts[parts.length - 1];
    const prefix = parts.slice(0, -1).join(' ');
    return prefix + ' [' + verb + '](' + base + ')';
  });
  /* 挖太多空（規格是 5–8）也很常見——與其重生，不如把多的那幾個還原成完整的字，
     文章反而更自然（規格本來就要求「不是所有動詞都挖空」）。從後面開始還原。 */
  const MAX = 8;
  let n = (out.match(/\[[^\]]+\]\([^)]*\)/g) || []).length;
  while (n > MAX) {
    out = out.replace(/\[([^\]]+)\]\(([^)]*)\)(?![\s\S]*\[[^\]]+\]\([^)]*\))/, '$1');
    const m = (out.match(/\[[^\]]+\]\([^)]*\)/g) || []).length;
    if (m === n) break;                 // 保險：沒減少就停，不要無限迴圈
    n = m;
  }
  return out;
}

function _grValidB(p) {
  if (!p || !p.passage) return false;
  const n = grCountBlanks(p.passage);
  if (n < 5 || n > 8) return false;
  const pairs = p.passage.match(/\[([^\]]+)\]\(([^)]*)\)/g) || [];
  if (pairs.length !== n) return false;                 // 每個 [ ] 後面都要有 ( )
  return pairs.every(m => {
    const inner = m.slice(1, m.indexOf(']'));
    if (_GR_ADV.test(inner) || /[?？]/.test(inner)) return false;
    return inner.trim().split(/\s+/).length <= 3;
  });
}

/* v392: 平行請求要用的「主題種子」。
   原本是「把前面出過的答案塞進 prompt 叫它不要重複」的鏈式脈絡，
   一旦改平行就沒有前一題可以參考了。補救方式（實測有效）：
   給每個平行請求不同的主題，回來後在程式端 dedupe。
   實測 9 個平行 A 請求拿到 47 題有效、unique 也是 47（0 重複）。 */
const _GR_SEEDS = ['school life', 'family', 'food and cooking', 'animals', 'sports',
  'the weekend', 'the classroom', 'pets', 'travel', 'festivals', 'the night market', 'hobbies'];

/* 超額生成的倍率＝實測通過率的倒數（第一波就一次把量做足，不要一輪一輪補）。
   實測：t1 四批都 12/12（幾乎全過）；t5 只有 8/12、3/12、4/12、6/12，
   B 短文 t5 更只有 2/5。其餘三個時態沒實測，取中間值。 */
const _GR_OVER = { t1: 1.2, t2: 1.6, t3: 1.6, t4: 1.6, t5: 2.5 };
const _GR_MAX_WAVE = 12;   // 一波最多 12 個請求（A、B 各自算）

/* 產生一個時態的整套題目。
   typeA: 幾「組」×10 題；typeB: 幾篇短文。回傳 { A:[[10題],[10題],…], B:[篇,…] }

   v392 改法：原本是「外層 group、內層重生 round」兩層循序 for，組與組之間也排隊，
   t5 四組 A + 五篇 B 實測要 118.6 秒。現在改成
   「超額生成 → 全部平行送 → 驗過的丟進同一個池子 → 依組切 10 題 → 不夠才發第二波」，
   預期同一組設定約 15 秒。
   ⚠ 驗證器（_grValidA / _grTenseOk / _grValidB / _grFixPassage）與判斷順序
     完全沒有動，是 v382 用血換來的規則。 */
async function aiMakeGrammarSet({ tense, aGroups = 3, bCount = 5, onProgress } = {}) {
  if (!GR_TENSES[tense]) throw new Error('不認得這個時態');
  const total = aGroups + bCount;
  const over = _GR_OVER[tense] || 1.6;
  const needA = aGroups * 10;
  if (needA <= 0 && bCount <= 0) return { A: [], B: [] };   // 什麼都沒勾＝不用打任何請求

  const poolA = [], seenA = new Set();      // 驗過的 A 題（池子）
  const poolB = [], seenB = new Set();      // 驗過的 B 短文
  const rejB = [];                          // 沒驗過的 B：最後不夠時先收下讓老師校稿（別丟掉）
  let timedOut = false;

  /* 進度：對外仍然是「已完成幾個單元 / 共幾個單元」，總次數也還是 aGroups+bCount，
     components-editor.jsx 的進度條不用動。差別只是現在由池子的存量換算出來。 */
  let units = 0;
  const emit = (n, label) => { while (units < n) { units++; if (onProgress) onProgress(units, total, label); } };
  const sync = () => {
    const aU = Math.min(aGroups, Math.floor(poolA.length / 10));
    const bU = Math.min(bCount, poolB.length);
    emit(aU + bU, `單句填空 ${aU}/${aGroups}、短文填空 ${bU}/${bCount}`);
  };

  const takeA = (items) => {
    (items || []).map(x => ({
      prompt: String(x.prompt || '').trim(),
      answer: String(x.answer || '').trim(),
      explain: String(x.explain || '').trim(),
    })).forEach(x => {
      const key = x.prompt.toLowerCase().replace(/\s+/g, ' ');
      if (!key || seenA.has(key)) return;                     // 平行來的重複題目在這裡擋掉
      if (!_grValidA(x) || !_grTenseOk(tense, x)) return;      // ⚠ 驗證邏輯與 v382 完全相同
      seenA.add(key); poolA.push(x);
    });
  };
  const takeB = (items) => {
    const p = (items || [])[0] || {};
    const cand = { title: String(p.title || '').trim(), passage: _grFixPassage(String(p.passage || '').trim()) };
    const key = (cand.title + '|' + cand.passage.slice(0, 60)).toLowerCase();
    if (seenB.has(key)) return;
    seenB.add(key);
    const blanksOk = (cand.passage.match(/\[([^\]]+)\]/g) || [])
      .every(m => _grTenseOk(tense, { prompt: cand.passage, answer: m.slice(1, -1) }));
    if (_grValidB(cand) && blanksOk) poolB.push(cand);
    else rejB.push(cand);                                     // 不合格的留著當備胎，不整批丟掉
  };

  // 一波：把 A 與 B 的請求算成一個陣列，一次全部平行送出去
  let seed = 0;
  const runWave = async (nA, nB) => {
    const jobs = [];
    for (let i = 0; i < nA; i++) jobs.push('A');
    for (let i = 0; i < nB; i++) jobs.push('B');
    if (!jobs.length) return;
    await pMap(jobs, async (kind) => {
      const topic = _GR_SEEDS[seed++ % _GR_SEEDS.length];
      try {
        if (kind === 'A') {
          // max_tokens 2600：12 題（含中文解說）實測用不到這麼多，留餘裕避免 JSON 被截斷
          takeA(await _grCall(_GR_SYS(tense, 'A', 12),
            `Generate 12 items. Set them in this topic area: ${topic}. Vary the subject and verb in every item.`, 2600));
        } else {
          // max_tokens 900：一篇 80–130 字的短文加標題，900 已經很寬鬆
          takeB(await _grCall(_GR_SYS(tense, 'B', 1),
            `Generate 1 passage about: ${topic}.`, 900));
        }
      } catch (e) {
        if (e && e.timeout) timedOut = true;
        throw e;                       // pMap 會把這一格記成 null，其他請求照跑
      } finally { sync(); }
      return true;
    }, Math.min(jobs.length, 24));
  };

  const waveSize = (miss, per) => (miss <= 0 ? 0
    : Math.max(1, Math.min(_GR_MAX_WAVE, Math.ceil(Math.ceil(miss / per) * over))));

  for (let wave = 0; wave < 3; wave++) {
    const missA = needA - poolA.length;
    const missB = bCount - poolB.length;
    if (wave > 0 && missA <= 0 && missB <= 0) break;
    const before = poolA.length + poolB.length;
    await runWave(waveSize(missA, 12), waveSize(missB, 1));
    // 一整波下來池子完全沒長（例如整段網路斷了）＝再打也是白打
    if (wave > 0 && poolA.length + poolB.length === before) break;
  }

  if (!poolA.length && !poolB.length && !rejB.length) {
    throw new Error(timedOut ? 'AI 太久沒有回應，請再試一次。' : 'AI 出題失敗（回傳格式看不懂），請再試一次。');
  }

  /* 池子依組切成每組 10 題。
     ⚠ 池子不夠時要「輪流發牌」而不是前面切滿、後面留空組——
     components-editor.jsx 是拿最後一組當「驗收」（r.A.pop()），
     照順序切會讓驗收剛好變成那個空的。以前一組一組出的時候，
     湊不滿是每組都少一點，這裡維持同樣的手感。 */
  const A = Array.from({ length: aGroups }, () => []);
  if (poolA.length >= needA) {
    for (let g = 0; g < aGroups; g++) A[g] = poolA.slice(g * 10, g * 10 + 10);
  } else {
    poolA.forEach((x, i) => A[i % aGroups].push(x));
  }
  // 短文：先用驗過的，不夠再用備胎（＝原本「最後一輪還是不合格就先收下」的行為）
  const B = [];
  for (let i = 0; i < bCount; i++) B.push(poolB[i] || rejB[i - poolB.length] || { title: '', passage: '' });

  emit(total, '完成');
  return { A, B };
}
/* v383: 產生單元開頭的「教學卡」。
   刻意做成通用的（topic 可以是任何主題，不只文法），之後單字單元也能用同一套。 */
const _LS_SYS = `You write the teaching page that comes BEFORE the practice, for Taiwanese
elementary students (Grade 4-6, CEFR A1-A2). Explanations in Traditional Chinese, examples in English.
Output ONLY valid JSON. No prose, no markdown fences.

{"lead":"","uses":[{"zh":"","en":"","enZh":""}],"forms":[{"subj":"","form":"","eg":""}],
 "clues":[""],"mistakes":[{"bad":"","good":"","why":""}],
 "examples":[{"q":"","a":"","why":""}],"check":[{"q":"","options":["",""],"answer":0,"why":""}],
 "outro":""}

RULES
- lead: ONE sentence in Traditional Chinese, ≤40 characters, saying what this is for. No jargon.
- uses: 3-4 items. zh = when you use it (Traditional Chinese, ≤20 chars). en = one short English example
  sentence showing it. enZh = the Chinese meaning of that sentence.
- forms: 2-4 rows of the pattern table. subj = the subject group (e.g. "He / She / It"),
  form = what happens to the verb in Traditional Chinese (e.g. "動詞 + s / es"), eg = one English example.
- clues: 4-6 English signal words/phrases that tell you it is this pattern.
- mistakes: 2-3 of the mistakes Taiwanese kids actually make. bad = the wrong English sentence,
  good = the corrected one, why = Traditional Chinese, ≤35 characters.
- examples: 2-3 WORKED examples. q = a question in the same format as the drills
  (a full sentence with ________ and the base verb in parentheses at the end).
  a = the answer. why = Traditional Chinese reasoning, ≤40 characters.
- check: 3 quick multiple-choice questions. q = a full sentence with ________ .
  options = 2-3 short choices (just the verb forms). answer = the INDEX of the correct one (0-based).
  why = Traditional Chinese, ≤40 characters, explaining the answer.
- outro: ONE encouraging sentence in Traditional Chinese telling them what to practise next.
- Everything must be simple enough for a 10-year-old. Use school, family, food, animals, sport.
${_AI_MINIFY}`;

async function aiMakeLesson({ topic, notes = '', tense = '' } = {}) {
  const T = tense && GR_TENSES[tense];
  const user = T
    ? `Topic: ${T.en}（${T.zh}）\nThe student must learn:\n${T.must}\nMust avoid:\n${T.avoid}`
    : `Topic: ${topic}\n${notes ? `Teacher notes: ${notes}` : ''}`;
  // v392: 改走 _aiAsk（60 秒逾時＋退避重試）。原本是裸 fetch、失敗立刻重試一次。
  try {
    return await _aiAsk(
      { model: 'claude-haiku-4-5', max_tokens: 2600, system: _LS_SYS, messages: [{ role: 'user', content: user }] },
      (data) => {
        const o = JSON.parse(_aiStripFence(data?.content?.[0]?.text || ''));
        if (!o || !(o.lead || o.uses)) return null;
        // answer 有時會回文字而不是索引 → 修回索引；超出範圍就丟掉那一題
        o.check = (o.check || []).map(c => {
          if (!c || !Array.isArray(c.options)) return null;
          let a = c.answer;
          if (typeof a === 'string') a = c.options.findIndex(x => String(x).trim() === a.trim());
          if (typeof a !== 'number' || a < 0 || a >= c.options.length) return null;
          return { ...c, answer: a };
        }).filter(Boolean);
        return o;
      }
    );
  } catch (e) {
    throw new Error(e && e.timeout ? '教學卡太久沒有回應，請再試一次。' : '教學卡產生失敗，請再試一次。');
  }
}

function grCountBlanks(passage) {
  return (String(passage || '').match(/\[[^\]]+\]/g) || []).length;
}

/* ══════════════════════════════════════════════════════════════════════════
   v386: AI 出閱讀理解題（貼文字稿 → 選擇題 + 閱讀簡答 + 閱讀技巧）
   ──────────────────────────────────────────────────────────────────────────
   Alan 的用法：學校老師除了考文意理解的選擇題與 short answer，還會考
   reading skill（Cause & Effect／Problem & Solution／Sequencing／
   Compare & Contrast）。這裡一次把三種都生出來，題數與要哪幾個技巧都由老師勾。

   ⚠ 沿用 v382 學到的：AI 出題「光靠 prompt 講不動，要程式驗＋能修就修」。
   每一種都有 _rcValid* 驗、修得掉的就修（例：answer 回文字而不是索引、
   選項有重複、排序題事件數量超過），修不掉才重生；最後一輪還是不合格就先收下，
   讓老師在校稿頁改（絕不整批丟掉、讓老師白等）。
   ══════════════════════════════════════════════════════════════════════════ */

const RC_SKILLS = {
  'problem-solution': { zh: '問題與解決', ico: '🧩', en: 'Problem & Solution' },
  'cause-effect':     { zh: '因果關係',   ico: '⚡', en: 'Cause & Effect' },
  'sequence':         { zh: '事件排序',   ico: '🔢', en: 'Sequencing' },
  'compare-contrast': { zh: '比較對照',   ico: '⚖️', en: 'Compare & Contrast' },
};

const RC_GRADES = {
  g1: 'Grade 1 (age 7, CEFR pre-A1). Three-to-five word sentences, only the most basic sight words.',
  g2: 'Grade 2 (age 8, CEFR pre-A1). Very short sentences, only the most common words.',
  g3: 'Grade 3 (age 9, CEFR A1). Short sentences, everyday words.',
  g4: 'Grade 4 (age 10, CEFR A1-A2).',
  g5: 'Grade 5 (age 11, CEFR A2).',
  g6: 'Grade 6 (age 12, CEFR A2). May include one inference question that needs two facts joined together.',
};

function _rcId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function _rcTxt(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

/* AI 常常把 answer 回成選項文字而不是索引（aiMakeLesson 也踩過）→ 修回索引 */
function _rcFixAnswerIdx(q) {
  if (!q || !Array.isArray(q.options)) return null;
  let a = q.answer;
  if (typeof a === 'string') {
    const t = _rcTxt(a);
    let i = q.options.findIndex(x => _rcTxt(x).toLowerCase() === t.toLowerCase());
    if (i < 0 && /^[0-3]$/.test(t)) i = +t;                                   // 回 "2" 這種數字字串
    // 也可能回 "A" / "B" / "(C)" 這種
    if (i < 0 && /^[（(]?[A-Da-d][）)．.]?$/.test(t)) i = t.toUpperCase().charCodeAt(t.search(/[A-Da-d]/i)) - 65;
    a = i;
  }
  if (typeof a !== 'number' || !(a >= 0) || a >= q.options.length) return null;
  return { ...q, answer: a };
}

function _rcValidMcq(q) {
  if (!q || !_rcTxt(q.q)) return false;
  const opts = (q.options || []).map(_rcTxt);
  if (opts.length !== 4 || opts.some(o => !o)) return false;
  // 選項重複＝送分題；大小寫不同也算重複
  const seen = new Set(opts.map(o => o.toLowerCase()));
  if (seen.size !== 4) return false;
  if (opts.some(o => /^(all|none) of the above/i.test(o))) return false;
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) return false;
  if (!_rcTxt(q.explain)) return false;
  if (/…|\.\.\./.test(q.explain)) return false;   // v379 踩過：模型把範本的「…」抄進輸出
  return true;
}

function _rcValidSa(q) {
  if (!q || !_rcTxt(q.question) || !_rcTxt(q.keyPoints)) return false;
  if (/^(is|are|was|were|do|does|did|can|will|has|have)\b/i.test(_rcTxt(q.question))) return false; // yes/no 題不適合簡答
  return true;
}

const _RC_SYS_BASE =
`You write English reading exercises for Taiwanese elementary-school students, based on a passage the teacher gives you.
Output ONLY valid JSON. No prose, no markdown, no code fences.
Everything you write must be answerable from the passage ALONE. Never use outside knowledge.
Never write the literal characters "..." or the Chinese ellipsis - always write the real wording.
${_AI_MINIFY}`;

function _RC_SYS_MCQ(gradeNote, n) {
  return _RC_SYS_BASE + '\n\n' +
`Student level: ${gradeNote}

Return: {"items":[{"q":"","options":["","","",""],"answer":0,"explain":"","skill":"detail"}]}
Generate ${n} items.

RULES
- q: ONE English question about the passage, 6-18 words. Answerable from the passage alone.
- options: EXACTLY 4 short English choices, similar length, all plausible. Exactly ONE is correct.
  The three wrong ones must be wrong because of the passage, not because they are silly.
  Never use "All of the above" or "None of the above".
- answer: the 0-BASED INDEX (0,1,2,3) of the correct option. A number, never the text.
- explain: Traditional Chinese, 20-45 characters. Quote the English clue phrase from the passage
  inside the Chinese quotation marks, then say what it means, then give the answer.
  GOOD: 「the deer ate too much grass and leaves」說鹿把草和樹葉都吃光了，所以島上的食物變少。
  GOOD: 「the wolves left the healthy deer alone」說狼只吃虛弱的鹿，所以鹿群反而變健康。
  BAD:  文章有提到相關內容，所以選 B。
  BAD:  quoting nothing from the passage.
- skill: one of "main-idea", "detail", "vocabulary", "inference", "sequence", "cause-effect".
- Mix the skills: at least one "main-idea", at least one "vocabulary" (a word used in the passage,
  asked in context), at least one "inference". The rest can be "detail".
- Keep every word simple enough for the student level above.`;
}

function _RC_SYS_SA(gradeNote, n) {
  return _RC_SYS_BASE + '\n\n' +
`Student level: ${gradeNote}

Return: {"items":[{"question":"","keyPoints":""}]}
Generate ${n} items.

RULES
- question: ONE open English question about the passage, 6-16 words, needing a 1-3 sentence answer.
  It must NOT be answerable with yes or no, so never start with Is/Are/Was/Were/Do/Does/Did/Can/Will/Has/Have.
  Start with What / Why / How / Who / Where / Describe / Explain.
- keyPoints: what a full-credit answer must contain, in ENGLISH, 2-4 points separated by " / ".
  These are marking points for the teacher's AI grader, not a model answer paragraph.
  Example: "wolves left the island / no one hunted the deer / too many deer ate the plants"
- Ask about different parts of the passage - do not ask two questions about the same sentence.`;
}

function _RC_SYS_SKILL(kind, gradeNote) {
  const head = _RC_SYS_BASE + '\n\nStudent level: ' + gradeNote + '\n\n';
  if (kind === 'problem-solution') {
    return head +
`Task: Problem & Solution. The student will drop each card into either the Problem box or the Solution box.

Return: {"items":[{"text":"","zone":"problem","why":""}]}

RULES
- Write 4 or 6 cards in total, HALF "problem" and HALF "solution".
- text: ONE short English sentence from the story, 5-14 words, in the student's own reading level.
  A "problem" card states something that went wrong in the passage.
  A "solution" card states what fixed it or made it better.
- Every card must clearly belong to one box only. If a card could go in either, rewrite it.
- Do NOT start a card with "The problem is" or "The solution is" - that gives the answer away.
- why: Traditional Chinese, 15-35 characters, saying how you can tell which box it goes in.`;
  }
  if (kind === 'cause-effect') {
    return head +
`Task: Cause & Effect. The student sees the causes and drops the matching effect next to each one.

Return: {"items":[{"cause":"","effect":"","why":""}]}

RULES
- Write exactly 4 pairs, taken from different parts of the passage.
- cause: ONE short English sentence, 4-12 words, describing something that happened.
- effect: ONE short English sentence, 4-12 words, describing what it made happen.
- The 4 effects must be clearly different from each other. A student must not be able to
  match an effect to the wrong cause and still be right.
- Never put the words "because", "so", "cause" or "effect" inside cause or effect.
- why: Traditional Chinese, 15-35 characters, explaining the link.`;
  }
  if (kind === 'sequence') {
    return head +
`Task: Sequencing. The student puts the events back into the order they happened in the passage.

Return: {"items":[{"text":""}]}

RULES
- Write 6 or 7 events, IN THE CORRECT ORDER (first event first).
- text: ONE short English sentence, 5-14 words, describing one clear event from the passage.
- The events must spread across the WHOLE passage - beginning, middle and end.
- Each event must be findable in the passage. Do not invent events.
- Do NOT number the events and do NOT use ordering words (first, then, next, finally, after that)
  inside the text - that would give the order away.`;
  }
  return head +
`Task: Compare & Contrast (a Venn diagram). The student drops each card into "only A", "both", or "only B".

Return: {"leftLabel":"","rightLabel":"","items":[{"text":"","zone":"left","why":""}]}

RULES
- leftLabel / rightLabel: the two things being compared, as short English labels, 2-6 words each,
  taken from the passage (for example two time periods, two characters, or two places).
- Write 6 to 8 cards in total: at least 2 with zone "left", at least 2 with zone "right",
  and at least 2 with zone "both".
- zone: exactly one of "left", "right", "both".
- text: ONE short English phrase or sentence, 3-12 words, that is true of that side.
- A "both" card must be true of BOTH sides. A "left" card must be true of the left side and
  FALSE of the right side (and the same for right) - never ambiguous.
- Do not repeat the label wording inside the card text.
- why: Traditional Chinese, 15-35 characters.`;
}

/* 一次呼叫（沿用 _grCall 的重試 + 剝 code fence），但這裡有些回傳不是 {items:[]}
   而是帶額外欄位的物件（比較對照要 leftLabel/rightLabel），所以回整個物件。
   v392: 同樣改走 _aiAsk（60 秒逾時＋只對 429/500/529 退避的三次重試）。 */
async function _rcCall(system, user, maxTokens) {
  return _aiAsk(
    { model: 'claude-haiku-4-5', max_tokens: maxTokens || 3000, system, messages: [{ role: 'user', content: user }] },
    (data) => {
      const o = JSON.parse(_aiStripFence(data?.content?.[0]?.text || ''));
      return (o && typeof o === 'object') ? o : null;
    }
  );
}

function _rcUser(passage, title, extra) {
  return (title ? 'Title: ' + title + '\n\n' : '') +
    'Passage:\n"""\n' + String(passage || '').trim() + '\n"""' +
    (extra ? '\n\n' + extra : '');
}

/* ── 把 AI 回來的東西整理成「卡片 → 區塊」的統一結構 ──────────────────────
   四種技巧在畫面上長得不一樣，但底下都是同一件事：把卡片放到正確的格子裡。
   統一成 { kind, zones:[{id,label,ico}], chips:[{id,text,zone,why}] } 之後，
   播放器只要寫一套、四種都能用（＝ bug 面積只有四分之一）。 */
function _rcBlockFrom(kind, o) {
  const id = _rcId('rb');
  const items = Array.isArray(o && o.items) ? o.items : [];
  if (kind === 'problem-solution') {
    const chips = items.map(x => ({
      id: _rcId('rc'), text: _rcTxt(x && x.text),
      zone: (x && x.zone) === 'solution' ? 'solution' : 'problem', why: _rcTxt(x && x.why),
    })).filter(c => c.text);
    return { id, kind, zones: [
      { id: 'problem',  label: 'Problem 問題',      ico: '⚠️' },
      { id: 'solution', label: 'Solution 解決方法', ico: '💡' },
    ], chips };
  }
  if (kind === 'cause-effect') {
    const pairs = items.map(x => ({ cause: _rcTxt(x && x.cause), effect: _rcTxt(x && x.effect), why: _rcTxt(x && x.why) }))
      .filter(p => p.cause && p.effect);
    return {
      id, kind,
      zones: pairs.map((p, i) => ({ id: 'c' + i, label: p.cause, ico: '⚡' })),
      chips: pairs.map((p, i) => ({ id: _rcId('rc'), text: p.effect, zone: 'c' + i, why: p.why })),
    };
  }
  if (kind === 'sequence') {
    const evs = items.map(x => _rcTxt(x && (x.text || x))).filter(Boolean);
    return rcResequence({ id, kind, zones: [], chips: evs.map(t => ({ id: _rcId('rc'), text: t, zone: '', why: '' })) });
  }
  const chips = items.map(x => {
    const z = String((x && x.zone) || '').toLowerCase();
    return {
      id: _rcId('rc'), text: _rcTxt(x && x.text),
      zone: z === 'both' ? 'both' : z === 'right' ? 'right' : 'left', why: _rcTxt(x && x.why),
    };
  }).filter(c => c.text);
  const L = _rcTxt(o && o.leftLabel) || 'A';
  const R = _rcTxt(o && o.rightLabel) || 'B';
  return { id, kind, leftLabel: L, rightLabel: R, zones: [
    { id: 'left',  label: L,        ico: '🔵' },
    { id: 'both',  label: '兩邊都有 Both', ico: '🟣' },
    { id: 'right', label: R,        ico: '🟠' },
  ], chips };
}

/* 排序題：chips 的順序＝正確答案，zone 只是 s0,s1,… 的位子。
   老師在校稿頁按 ▲▼ 換順序之後，重新蓋一次 zone 與格子標籤。 */
function rcResequence(block) {
  const chips = (block.chips || []).map((c, i) => ({ ...c, zone: 's' + i }));
  return { ...block, chips, zones: chips.map((c, i) => ({ id: 's' + i, label: String(i + 1), ico: '' })) };
}

/* 因果題：老師改了某一格的 cause 文字之後不用重算，zone id 不動。
   但如果他刪了一組，zones 與 chips 會對不起來 → 這裡重建一次。 */
function rcRepairBlock(block) {
  if (!block) return block;
  if (block.kind === 'sequence') return rcResequence(block);
  if (block.kind === 'cause-effect') {
    const chips = (block.chips || []).map((c, i) => ({ ...c, zone: 'c' + i }));
    const zones = chips.map((c, i) => {
      const old = (block.zones || [])[i];
      return { id: 'c' + i, label: (old && old.label) || '', ico: '⚡' };
    });
    return { ...block, chips, zones };
  }
  const ids = new Set((block.zones || []).map(z => z.id));
  const fb = (block.zones || [])[0];
  return { ...block, chips: (block.chips || []).map(c => ids.has(c.zone) ? c : { ...c, zone: fb ? fb.id : '' }) };
}

/* ⚠⚠ 因果題的 zones 與 chips 是「同一列的兩半」，位置對位置。
   只濾掉 chips（例如空白的、重複的）而不濾 zones，rcRepairBlock 會照位置重配 →
   CAUSE-B 會被配到 EFFECT-C，答案錯掉而且畫面上看不出來。
   凡是要丟掉卡片，一律走這個函式，不要自己 filter。 */
function rcFilterChips(block, keep) {
  if (!block) return block;
  const chips = block.chips || [];
  const idx = chips.map((c, i) => (keep(c, i) ? i : -1)).filter(i => i >= 0);
  const next = { ...block, chips: idx.map(i => chips[i]) };
  if (block.kind === 'cause-effect') next.zones = idx.map(i => (block.zones || [])[i]).filter(Boolean);
  return rcRepairBlock(next);
}

function rcValidBlock(block) {
  if (!block || !Array.isArray(block.chips)) return false;
  const chips = block.chips.filter(c => c && _rcTxt(c.text));
  if (chips.length !== (block.chips || []).length) return false;
  const lower = chips.map(c => c.text.toLowerCase());
  if (new Set(lower).size !== lower.length) return false;        // 卡片重複＝一定有一格放不進去
  const count = (z) => chips.filter(c => c.zone === z).length;
  if (block.kind === 'problem-solution') {
    return chips.length >= 4 && chips.length <= 8 && count('problem') >= 2 && count('solution') >= 2;
  }
  if (block.kind === 'cause-effect') {
    if (chips.length < 3 || chips.length > 5) return false;
    const zs = block.zones || [];
    if (zs.length !== chips.length) return false;
    if (zs.some(z => !_rcTxt(z.label))) return false;
    if (new Set(zs.map(z => _rcTxt(z.label).toLowerCase())).size !== zs.length) return false;
    return new Set(chips.map(c => c.zone)).size === chips.length;  // 一格一張，不能兩張同格
  }
  if (block.kind === 'sequence') return chips.length >= 5 && chips.length <= 8;
  return chips.length >= 6 && chips.length <= 9
    && count('left') >= 2 && count('right') >= 2 && count('both') >= 1
    && !!_rcTxt(block.leftLabel) && !!_rcTxt(block.rightLabel);   // !! ＝ 一定回 boolean，不要回字串
}

/* 修得掉的就修，不要為了小事重生一整輪（v382 學到的） */
function rcFixBlock(block) {
  if (!block) return block;
  let b = rcRepairBlock(block);
  // 卡片文字空白或重複 → 只留第一張（連同 zones 一起丟，見 rcFilterChips 的警告）
  const seen = new Set();
  b = rcFilterChips(b, (c) => {
    const k = _rcTxt(c && c.text).toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });
  if (b.kind === 'sequence') b = rcFilterChips(b, (_c, i) => i < 8);   // 挖太多從後面砍（前面才是主線）
  if (b.kind === 'cause-effect' && b.chips.length > 5) b = rcFilterChips(b, (_c, i) => i < 5);
  if (b.kind === 'problem-solution' && b.chips.length > 8) b = rcFilterChips(b, (_c, i) => i < 8);
  if (b.kind === 'compare-contrast' && b.chips.length > 9) b = rcFilterChips(b, (_c, i) => i < 9);
  return b;
}

/* ── 主要入口 ────────────────────────────────────────────────────────────
   opts: { passage, title, grade:'g2'..'g6', mcq:0|5|10|15|20, sa:0|3|5|8|10,
           skills:['problem-solution',…], onProgress(done,total,label) }
   回傳 { mcq:[…], sa:[…], blocks:[…] }（blocks 已是最終結構，可直接存） */
async function aiMakeReadingSet({ passage, title = '', grade = 'g4', mcq = 10, sa = 5, skills = [], onProgress } = {}) {
  const text = String(passage || '').trim();
  if (text.split(/\s+/).length < 40) throw new Error('文章太短了（至少要 40 個英文字），請貼完整的文字稿。');
  const gradeNote = RC_GRADES[grade] || RC_GRADES.g4;
  const nMcq = Math.max(0, +mcq || 0);
  const nSa = Math.max(0, +sa || 0);
  const kinds = (skills || []).filter(k => RC_SKILLS[k]);

  if (!nMcq && !nSa && !kinds.length) throw new Error('至少要勾一種：選擇題、閱讀簡答，或閱讀技巧。');

  const CHUNK = 5;
  const mcqRounds = Math.ceil(nMcq / CHUNK);
  const total = mcqRounds + (nSa ? 1 : 0) + kinds.length;
  let done = 0;
  const bump = (label) => { done++; if (onProgress) onProgress(done, total, label); };

  /* ── 選擇題：每 5 題一批，多要 2 題當備料，驗不過的丟掉 ──
     v392: 原本是「一輪等一輪」的兩層 for。改成一次把該打的輪次全部平行送出，
     回來後用完全相同的驗證／去重邏輯收題；不夠再發第二、三波
     （第二波之後會把已出過的題目塞進 prompt，因為同一篇文章平行問很容易撞題）。 */
  const mcqOut = [];
  const absorbMcq = (o) => {
    ((o && o.items) || []).forEach(raw => {
      if (mcqOut.length >= nMcq) return;
      const q = _rcFixAnswerIdx({
        q: _rcTxt(raw && raw.q),
        options: (raw && raw.options || []).map(_rcTxt).slice(0, 4),
        answer: raw && raw.answer,
        explain: _rcTxt(raw && raw.explain),
        skill: _rcTxt(raw && raw.skill) || 'detail',
      });
      if (q && _rcValidMcq(q) && !mcqOut.some(e => e.q.toLowerCase() === q.q.toLowerCase())) {
        mcqOut.push({ id: _rcId('rq'), ...q });
      }
    });
  };
  // 進度仍然是「每一輪回報一次」，總次數不變（mcqRounds 次），只是改由已收題數換算
  let mcqDone = 0;
  const mcqTick = () => {
    const r = Math.min(mcqRounds, Math.ceil(mcqOut.length / CHUNK));
    while (mcqDone < r) { mcqDone++; bump('選擇題 ' + Math.min(mcqOut.length, nMcq) + '/' + nMcq); }
  };
  for (let wave = 0; wave < 3 && mcqOut.length < nMcq; wave++) {
    const need = nMcq - mcqOut.length;
    const reqs = Math.min(mcqRounds, Math.ceil(need / CHUNK));
    const want = Math.min(CHUNK, need);
    const asked = mcqOut.map(q => q.q).join(' | ');      // 這一波共用同一份「已出過的題目」
    const before = mcqOut.length;
    await pMap(new Array(reqs).fill(0), async () => {
      /* ⚠ 這裡一定要各自 try：本來一次連線失敗就會把前面已經生好、驗過的題目
         全部丟掉，老師等了半天回到設定頁。改成這一發算了、其他照跑。 */
      let o = null;
      try {
        o = await _rcCall(_RC_SYS_MCQ(gradeNote, want + 2),
          _rcUser(text, title, asked ? 'Do NOT repeat or rephrase these questions:\n' + asked : ''), 3200);
      } catch (e) { return null; }
      absorbMcq(o); mcqTick();
      return true;
    }, Math.min(reqs, 12));
    if (mcqOut.length === before) break;                 // 一整波都沒收到新題＝再打也是白打
  }
  while (mcqDone < mcqRounds) { mcqDone++; bump('選擇題 ' + Math.min(mcqOut.length, nMcq) + '/' + nMcq); }

  // ── 閱讀簡答 ──
  const saOut = [];
  if (nSa) {
    for (let round = 0; round < 3 && saOut.length < nSa; round++) {
      const asked = saOut.map(q => q.question).join(' | ');
      let o = null;
      try {
        o = await _rcCall(_RC_SYS_SA(gradeNote, nSa - saOut.length + 1),
          _rcUser(text, title, asked ? 'Do NOT repeat these questions:\n' + asked : ''), 2200);
      } catch (e) { continue; }
      (o.items || []).forEach(raw => {
        if (saOut.length >= nSa) return;
        const q = { question: _rcTxt(raw && raw.question), keyPoints: _rcTxt(raw && raw.keyPoints) };
        if (_rcValidSa(q) && !saOut.some(e => e.question.toLowerCase() === q.question.toLowerCase())) {
          saOut.push({ id: _rcId('sa'), ...q });
        }
      });
    }
    bump('閱讀簡答 ' + saOut.length + '/' + nSa);
  }

  // ── 閱讀技巧 ──
  /* v392: 四種技巧彼此完全獨立，改成平行跑（每一種內部的三輪重試邏輯原封不動）。
     ⚠ pMap 回傳的陣列是照索引對位的，所以 blocks 的順序仍然＝老師勾選的順序。 */
  const blocks = (await pMap(kinds, async (kind) => {
    let best = null;
    for (let round = 0; round < 3 && !best; round++) {
      let cand = null;
      try {
        const o = await _rcCall(_RC_SYS_SKILL(kind, gradeNote), _rcUser(text, title,
          round ? 'Your last try did not follow the card-count rules. Follow them exactly this time.' : ''), 2200);
        cand = rcFixBlock(_rcBlockFrom(kind, o));
      } catch (e) { cand = null; }
      if (cand && rcValidBlock(cand)) best = cand;
      else if (round === 2 && cand) best = cand;   // 三次都不合格就先收下，讓老師在校稿頁改
    }
    bump(RC_SKILLS[kind].zh);
    return best;
  }, 4)).filter(Boolean);

  if (!mcqOut.length && !saOut.length && !blocks.length) throw new Error('AI 這次什麼都沒生出來，請再試一次。');
  return { mcq: mcqOut, sa: saOut, blocks };
}


/* ══════════════════════════════════════════════════════════════════════════
   v407：分段閱讀「每一段自動出題」
   （Alan：「分段閱讀我希望我匯入圖片或是文字或是檔案，能夠根據每一段自動生成題目
     …先從 reading comprehension 出題就好…最後統整可以配合 reading skill 也很好，
     但不能亂出，要真的符合文章」）
   ──────────────────────────────────────────────────────────────────────────
   跟 v386 的「📖 出閱讀理解」差在哪：那個是一整篇一次出；這個是「一段一題組」，
   而且題目只能問這一段裡寫的事——學生讀完一小段馬上答，問到後面的內容就是壞題。

   ⚠「不能亂出，要真的符合文章」不是靠 prompt 拜託，是靠程式驗（rcGroundedMcq /
   rcGroundedSa / rcGroundedBlock）。做法是利用 v386 就定下的規矩：
   選擇題的 explain 一定要「把文章裡的英文線索抄在「」裡面」。
   有那條規矩，就可以反過來檢查那句線索到底在不在這一段文章裡——
   在＝這題真的是從文章來的；不在＝AI 自己編的，丟掉重出。
   照片辨識出來的文字本來就會有幾個字母是錯的，所以比對是「實詞重疊率」而不是全等。
   ══════════════════════════════════════════════════════════════════════════ */

const _rcFlat = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/* explain 裡「」（或引號）括起來的那句英文線索 */
function _rcClue(explain) {
  const m = String(explain || '').match(/[「『"“]([^」』"”]{4,200})[」』"”]/);
  return m ? m[1] : '';
}
/* 這句話在不在文章裡。先試整串（去掉標點大小寫之後），不中再看
   「實詞（3 個字母以上）的重疊率」——AI 抄線索時常常會漏一兩個虛詞或換個時態。
   （照片段落的 OCR 錯字不用擔心：文章本身就是那些錯字，AI 是從那份文字抄的，
     所以錯字會一模一樣地對上。） */
function _rcInPassage(passage, phrase) {
  const t = _rcFlat(passage), p = _rcFlat(phrase);
  if (!p || !t) return false;
  if (t.indexOf(p) >= 0) return true;
  const ws = p.split(' ').filter(w => w.length > 2);
  if (ws.length < 2) return false;
  return ws.filter(w => t.indexOf(w) >= 0).length / ws.length >= 0.8;
}
/* 選擇題：線索句一定要在文章裡（這是主要的關卡），正解則只擋「整個不沾邊」的捏造。
   為什麼正解要放寬：正解本來就常常是改寫過的短句——文章寫
   「stay in the air for hours」，正解寫「It can fly for a long time」，
   一個字都對不上但完全正確。抓太緊會把好題目一起丟掉。
   ⚠ 正解這一關用「整字」比對，不是子字串：不然 with 會被 without 收下、
   gold 會被 golden 收下，等於沒擋。 */
function rcGroundedMcq(passage, q) {
  const clue = _rcClue(q && q.explain);
  if (!clue) return false;                       // 沒引用文章＝沒辦法證明它有根據
  if (!_rcInPassage(passage, clue)) return false;
  const words = new Set(_rcFlat(passage).split(' '));
  const ws = _rcFlat((q.options || [])[q.answer]).split(' ').filter(w => w.length > 2);
  if (!ws.length) return true;
  return ws.filter(w => words.has(w)).length / ws.length >= 0.4;
}
/* 簡答題：答案要點是改寫過的評分點，所以只要求「一半以上」找得到出處 */
function rcGroundedSa(passage, q) {
  const pts = String((q && q.keyPoints) || '').split('/').map(x => x.trim()).filter(Boolean);
  if (!pts.length) return false;
  return pts.filter(x => _rcInPassage(passage, x)).length >= Math.ceil(pts.length / 2);
}
/* 閱讀技巧：每一張卡片都要在文章裡找得到，找不到的整張丟掉
   （⚠ 一定要走 rcFilterChips——因果題的 zones 要跟卡片一起丟，不然答案會錯位） */
function rcGroundedBlock(passage, block) {
  if (!block) return block;
  return rcFilterChips(block, (c) => _rcInPassage(passage, c && c.text));
}

/* 選擇題轉成分段閱讀吃的格式。分段閱讀作答時不洗牌，所以在這裡就先打散
   （跟 grParseImport 的規矩一致）。 */
function _grQFromMcq(q) {
  const opts = (q.options || []).slice(0, 4);
  const correct = opts[q.answer];
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  while (opts.length < 4) opts.push('');
  return { id: _rcId('gq'), kind: 'mc', q: q.q, options: opts, answer: opts.indexOf(correct), explain: q.explain || '' };
}
const _grQFromSa = (q) => ({ id: _rcId('gq'), kind: 'short', q: q.question, keyPoints: q.keyPoints || '' });

/* 一段（或整篇）出一組題。mcq / sa 兩種同時送出，驗不過的重來一輪。 */
async function _rcOneChunk(text, { title, gradeNote, mcq, sa, where }) {
  const out = { mcq: [], sa: [], dropped: 0 };
  for (let round = 0; round < 2; round++) {
    const needM = mcq - out.mcq.length, needS = sa - out.sa.length;
    if (needM <= 0 && needS <= 0) break;
    const jobs = [];
    if (needM > 0) jobs.push(['mcq', _RC_SYS_MCQ(gradeNote, needM + 1), 2800]);
    if (needS > 0) jobs.push(['sa',  _RC_SYS_SA(gradeNote,  needS + 1), 1800]);
    const asked = out.mcq.map(q => q.q).concat(out.sa.map(q => q.question)).join(' | ');
    const extra = where +
      (asked ? '\n\nDo NOT repeat or rephrase these questions:\n' + asked : '') +
      (round ? '\n\nYour last try asked about things that are NOT written in the passage above. ' +
               'Every question, every correct option and every clue you quote must appear in that passage.' : '');
    /* ⚠ 各自 try：一發連線失敗不該把同一段已經收到的題目一起丟掉 */
    const got = await pMap(jobs, async ([k, sys, mx]) => {
      try { return [k, await _rcCall(sys, _rcUser(text, title, extra), mx)]; } catch (e) { return [k, null]; }
    }, 2);
    got.forEach(([k, o]) => {
      if (!o) return;
      ((o.items) || []).forEach(raw => {
        if (k === 'mcq') {
          if (out.mcq.length >= mcq) return;
          const q = _rcFixAnswerIdx({
            q: _rcTxt(raw && raw.q),
            options: ((raw && raw.options) || []).map(_rcTxt).slice(0, 4),
            answer: raw && raw.answer,
            explain: _rcTxt(raw && raw.explain),
            skill: _rcTxt(raw && raw.skill) || 'detail',
          });
          if (!q || !_rcValidMcq(q)) { out.dropped++; return; }
          if (!rcGroundedMcq(text, q)) { out.dropped++; return; }        // ← 不能亂出
          if (out.mcq.some(e => e.q.toLowerCase() === q.q.toLowerCase())) return;
          out.mcq.push(q);
        } else {
          if (out.sa.length >= sa) return;
          const q = { question: _rcTxt(raw && raw.question), keyPoints: _rcTxt(raw && raw.keyPoints) };
          if (!_rcValidSa(q)) { out.dropped++; return; }
          if (!rcGroundedSa(text, q)) { out.dropped++; return; }         // ← 不能亂出
          if (out.sa.some(e => e.question.toLowerCase() === q.question.toLowerCase())) return;
          out.sa.push(q);
        }
      });
    });
  }
  return out;
}

/* ── 主要入口 ────────────────────────────────────────────────────────────
   segments: [{ i, text }]（i ＝ 第幾段，用來對回編輯器的段落）
   回傳 { bySeg:{ [i]: [題目…] }, final:[題目…], blocks:[…], skipped:[i…], dropped, made } */
async function aiMakeGuidedQuestions({ segments, title = '', grade = 'g4',
  perMcq = 2, perSa = 1, finalMcq = 3, finalSa = 1, skills = [], onProgress } = {}) {
  const all = (segments || []).map((s, k) => ({
    i: (s && s.i != null) ? s.i : k,
    text: String((s && s.text) || '').replace(/\s+/g, ' ').trim(),
  }));
  /* 12 個英文字以下出不了一題像樣的題目（標題頁、圖說、只有一句的段落都在這裡被擋掉）。
     擋掉的段號會回報給老師，不是默默跳過。 */
  const segs = all.filter(s => s.text.split(' ').filter(Boolean).length >= 12);
  const skipped = all.filter(s => segs.indexOf(s) < 0).map(s => s.i);
  if (!segs.length) throw new Error('沒有一段有足夠的文字可以出題——照片段落要先按「🔍 辨識單字」，或直接把文字貼進段落裡。');

  const gradeNote = RC_GRADES[grade] || RC_GRADES.g4;
  const nMcq = Math.max(0, +perMcq || 0), nSa = Math.max(0, +perSa || 0);
  const fMcq = Math.max(0, +finalMcq || 0), fSa = Math.max(0, +finalSa || 0);
  const kinds = (skills || []).filter(k => RC_SKILLS[k]);
  if (!nMcq && !nSa && !fMcq && !fSa && !kinds.length) throw new Error('至少要選一種題目。');

  const wantFinal = !!(fMcq || fSa);
  const total = (nMcq || nSa ? segs.length : 0) + (wantFinal ? 1 : 0) + kinds.length;
  let done = 0;
  const bump = (label) => { done++; if (onProgress) onProgress(done, total, label); };

  const full = segs.map(s => s.text).join('\n\n');
  let dropped = 0;

  // ── 每一段（平行跑，一次最多 6 段；再多就開始排隊等 Worker） ──
  const bySeg = {};
  if (nMcq || nSa) {
    await pMap(segs, async (seg) => {
      const where = `The passage above is paragraph ${seg.i + 1} of ${all.length} of a longer article. ` +
        'Ask ONLY about what is written in THIS paragraph. The student has not read the later paragraphs yet.';
      const r = await _rcOneChunk(seg.text, { title, gradeNote, mcq: nMcq, sa: nSa, where });
      dropped += r.dropped;
      const qs = r.mcq.map(_grQFromMcq).concat(r.sa.map(_grQFromSa));
      if (qs.length) bySeg[seg.i] = qs;
      bump(`第 ${seg.i + 1} 段（${qs.length} 題）`);
    }, 6);
  }

  // ── 整篇綜合 ──
  let final = [];
  if (wantFinal) {
    const r = await _rcOneChunk(full, { title, gradeNote, mcq: fMcq, sa: fSa,
      where: 'The passage above is the WHOLE article. Ask about the article as a whole - ' +
             'the main idea, how the parts connect, and what it all adds up to. ' +
             'Do not ask about one small detail that sits in a single paragraph.' });
    dropped += r.dropped;
    final = r.mcq.map(_grQFromMcq).concat(r.sa.map(_grQFromSa));
    bump(`整篇綜合（${final.length} 題）`);
  }

  /* ── 閱讀技巧（選填）──
     卡片直接沿用 v386 那一套（_RC_SYS_SKILL ＋ rcFixBlock ＋ rcValidBlock），
     只是多加一層「每張卡片都要在文章裡找得到」。
     ⚠ 這一層可能把卡片數量刷到不合格（例：比較對照剩 4 張）——
     那就重生，寧可少一種技巧，也不要出一份跟文章對不上的。 */
  const blocks = kinds.length ? (await pMap(kinds, async (kind) => {
    let best = null;
    for (let round = 0; round < 3 && !best; round++) {
      try {
        const o = await _rcCall(_RC_SYS_SKILL(kind, gradeNote), _rcUser(full, title,
          round ? 'Your last try used sentences that are not in the passage. Every card must come from the passage above.' : ''), 2200);
        const cand = rcGroundedBlock(full, rcFixBlock(_rcBlockFrom(kind, o)));
        if (cand && rcValidBlock(cand)) best = cand;
      } catch (e) { /* 這一輪算了，還有兩輪 */ }
    }
    bump(RC_SKILLS[kind].zh);
    return best;                       // 三輪都對不上文章＝這一種不要，不硬湊
  }, 4)).filter(Boolean) : [];

  const made = Object.keys(bySeg).reduce((n, k) => n + bySeg[k].length, 0) + final.length;
  if (!made && !blocks.length) throw new Error('AI 這次沒有出到符合文章的題目，請再試一次。');
  return { bySeg, final, blocks, passage: full, skipped, dropped, made, segCount: segs.length };
}


// ── AI Short Answer Grading ───────────────────────────────────────────────
async function checkShortAnswer(question, keyPoints, passage, studentAnswer) {
  if (!studentAnswer?.trim()) return '請先寫下你的答案。';
  const endpoint = AI_WRITING_ENDPOINT || '';

  const systemPrompt =
`You are an elementary English reading comprehension teacher.
Grade objectively. Do not invent praise. Every Good Job item must point to something actually present in the student's answer.
If there is no clear objective strength, write: "目前還沒有明確答對的地方，先回到題目和文章找答案。"

Scoring standard (5 stars):
5★ = directly answers the question + matches the passage/key points + complete sentence + clear details + understandable grammar.
4★ = correct answer with one small missing detail or minor grammar issue.
3★ = partly answers the question but misses an important detail or evidence.
2★ = related to the topic but answer is incomplete or partly inaccurate.
1★ = does not answer the question, contradicts the passage, or is too unclear.

Reply bilingually in Traditional Chinese + simple English. Output ONLY these four sections.
Every section must include BOTH Chinese and English, even when the score is 4★ or 5★.
Do not output an English-only explanation. Do not output a Chinese-only explanation.

【Score】
Use exactly 5 star characters, e.g. ⭐⭐⭐☆☆ (3/5), then:
中文：one short objective reason in Traditional Chinese.
English: one short objective reason in simple English.

【Good Job】
List 1-2 specific, factual things the student actually answered correctly.
Each bullet must include:
中文：Traditional Chinese feedback.
English: simple English feedback.
If only one part is correct, name that exact part.

【To Improve】
List 1-2 objective fixes.
Each bullet must include:
中文：Traditional Chinese feedback.
English: simple English feedback.
Mention the missing answer point, missing evidence, incomplete sentence, wrong information, or grammar issue.

【Better Version】
English: Write a complete improved answer in simple English. Use the passage/key points if provided.
中文：Write the Traditional Chinese meaning/explanation of the improved answer.`;

  const passageSection = passage?.trim() ? `\n文章內容或相關段落：\n${passage.trim()}\n` : '';
  const keyPointSection = keyPoints?.trim() ? `\n答案要點：${keyPoints.trim()}\n` : '';
  const userMessage = `題目：${question.trim()}\n${passageSection}${keyPointSection}\n學生答案：${studentAnswer.trim()}`;

  if (endpoint) {
    try {
      // v392: fetchT 加 60 秒逾時——原本是裸 fetch，Worker 不回應時「批改中…」會永遠轉圈
      const res = await fetchT(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 700,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await res.json().catch(() => null);
      return data?.content?.[0]?.text || data?.feedback || data?.text || '批改完成，但回傳格式不符。';
    } catch(e) {
      if (e && e.name === 'AbortError') return 'AI 批改太久沒有回應，請再試一次。';
      return 'AI 批改服務暫時連不上，請稍後再試。';
    }
  }
  return '請設定 AI 批改端點（AI_WRITING_ENDPOINT）。';
}

// ── AI Opinion Essay Grading ──────────────────────────────────────────────
async function checkEssay(essayPrompt, studentEssay) {
  if (!studentEssay?.trim()) return '請先寫下你的 opinion essay。';
  const endpoint = AI_WRITING_ENDPOINT || '';
  const systemPrompt =
`You are an elementary English essay teacher. Grade the student's opinion essay.
Grade objectively. Do not invent praise. Every Good Job item must point to something actually present in the essay.
If there is no clear objective strength, write: "目前還沒有明確完成的段落，先寫出清楚的 claim。"

Scoring standard (5 stars):
5★ = clear claim + at least two relevant reasons + examples/details + conclusion + organized paragraphs + mostly correct grammar.
4★ = clear claim and support, but one part is thin or has several small grammar issues.
3★ = has an opinion but support/examples/organization are incomplete.
2★ = topic-related but claim or reasons are unclear.
1★ = too short, off-topic, or not understandable.

Reply bilingually in Traditional Chinese + simple English. Output ONLY these four sections.
Every section must include BOTH Chinese and English, even when the score is 4★ or 5★.
Do not output an English-only explanation. Do not output a Chinese-only explanation.

【Score】
Use exactly 5 star characters, e.g. ⭐⭐⭐☆☆ (3/5), then:
中文：one short objective reason in Traditional Chinese.
English: one short objective reason in simple English.

【Good Job】
List 1-2 specific, factual strengths.
Each bullet must include:
中文：Traditional Chinese feedback.
English: simple English feedback.
Mention the exact element, such as claim, reason, example, conclusion, organization, or grammar. Do not praise an element that is missing.

【To Improve】
List 1-2 objective fixes.
Each bullet must include:
中文：Traditional Chinese feedback.
English: simple English feedback.
Mention the exact part to improve: Claim, Reason, Example, Explanation, Conclusion, Organization, or Grammar.

【Better Version】
English: Write a better version of the essay keeping the student's main idea when possible. Use simple English suitable for elementary students.
中文：Write a Traditional Chinese meaning/explanation of the improved essay.`;

  const userMessage = `作文題目：\n${essayPrompt.trim()}\n\n學生作文：\n${studentEssay.trim()}`;

  if (endpoint) {
    try {
      // v392: fetchT 加 60 秒逾時——原本是裸 fetch，Worker 不回應時「批改中…」會永遠轉圈
      const res = await fetchT(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 900,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await res.json().catch(() => null);
      return data?.content?.[0]?.text || data?.feedback || data?.text || '批改完成，但回傳格式不符。';
    } catch(e) {
      if (e && e.name === 'AbortError') return 'AI 批改太久沒有回應，請再試一次。';
      return 'AI 批改服務暫時連不上，請稍後再試。';
    }
  }
  return '請設定 AI 批改端點（AI_WRITING_ENDPOINT）。';
}

function localWritingFeedback(word, sentence) {
  const s = sentence.trim();
  const lower = s.toLowerCase();
  const checks = [];
  const wordUsed = !!(word && lower.includes(String(word).toLowerCase()));
  const wordCount = s.split(/\s+/).filter(Boolean).length;
  if (word && !wordUsed) checks.push(`句子裡還沒有用到「${word}」。`);
  if (wordCount < 7) checks.push(`句子目前只有 ${wordCount} 個字，需要至少 7 個字。`);
  if (!/^[A-Z]/.test(s)) checks.push('英文句子開頭通常要大寫。');
  if (!/[.!?]$/.test(s)) checks.push('句尾記得加上句號、問號或驚嘆號。');
  if (/\bi\b/.test(s)) checks.push('單獨的 I 要大寫。');
  const stars = Math.max(1, 5 - checks.length);
  const starLine = `${'⭐'.repeat(stars)}${'☆'.repeat(5 - stars)} (${stars}/5)`;
  if (checks.length === 0) {
    return `【Score】\n${starLine}\n中文：有使用指定單字，句子長度、大小寫和標點都符合基本標準。\nEnglish: The sentence uses the target word and has enough words, capitalization, and punctuation.\n\n【Good Job】\n- 中文：句子有用到「${word}」。\n  English: You used the target word "${word}".\n- 中文：句子有至少 7 個字，並且有完整標點。\n  English: Your sentence has at least 7 words and correct punctuation.\n\n【To Improve】\n- 中文：可以加入更具體的時間、地點或原因，讓句子更生動。\n  English: You can add a time, place, or reason to make the sentence more specific.\n\n【Better Version】\nEnglish: ${s}\n中文：這句已經符合基本要求，可以再加入更多細節。`;
  }
  return `【Score】\n${starLine}\n中文：${checks[0]}\nEnglish: Please fix this first: ${checks[0]}\n\n【Good Job】\n${wordUsed ? `- 中文：句子有嘗試使用「${word}」。\n  English: You tried to use the target word "${word}".` : '- 中文：目前還沒有明確做到的地方，先把句子補完整。\n  English: There is not a clear complete sentence yet. Please complete the sentence first.'}\n\n【To Improve】\n${checks.map(x => `- 中文：${x}\n  English: ${x}`).join('\n')}\n\n【Better Version】\nEnglish: ${word ? `I can use ${word} in a clear sentence today.` : 'I can write a clear sentence today.'}\n中文：我可以今天寫出一個清楚完整的英文句子。`;
}

// ── AI Story Mountain Grading ─────────────────────────────────────────────
async function checkStoryMountain(prompt, passage, answers) {
  const { intro, rising, climax, falling, resolution } = answers || {};
  if (!intro && !rising && !climax && !falling && !resolution) return '請先完成所有五個部分。';
  const endpoint = AI_WRITING_ENDPOINT || '';

  const systemPrompt =
`You are an elementary English writing teacher. Grade the student's Story Mountain (Introduction → Rising Action → Climax → Falling Action → Resolution).
Grade objectively. Do not invent praise. Every Good Job item must point to something actually present in the student's five sections.
If a reference passage is provided, compare the Story Mountain with it and do not praise details that contradict the passage.
If there is no clear objective strength, write: "目前還沒有明確完成的部分，先補上 Introduction 和問題。"

Scoring standard (5 stars):
5★ = all five stages are complete + logical story arc + climax is clear + resolution connects to the problem + English is understandable.
4★ = all or most stages are present, with one weak or missing detail.
3★ = basic story is understandable, but 2+ stages are thin or unclear.
2★ = some stages are present but story logic is incomplete.
1★ = most stages are missing, off-topic, or too unclear.

Reply bilingually in Traditional Chinese + simple English. Output ONLY these four sections.
Every section must include BOTH Chinese and English, even when the score is 4★ or 5★.
Do not output an English-only explanation. Do not output a Chinese-only explanation.

【Score】
Use exactly 5 star characters, e.g. ⭐⭐⭐☆☆ (3/5), then:
中文：one short objective reason in Traditional Chinese.
English: one short objective reason in simple English.

【Good Job】
List 1-2 specific, factual strengths.
Each bullet must include:
中文：Traditional Chinese feedback.
English: simple English feedback.
Mention which stage: Introduction, Rising Action, Climax, Falling Action, or Resolution. Do not praise a missing stage.

【To Improve】
List 1-2 objective fixes.
Each bullet must include:
中文：Traditional Chinese feedback.
English: simple English feedback.
Mention exactly which stage is missing, unclear, illogical, too short, or grammatically hard to understand.

【Better Version】
English: Write a better full Story Mountain version keeping the student's main idea when possible. Keep it simple and natural for elementary students.
中文：Write a Traditional Chinese meaning/explanation of the improved Story Mountain.`;

  const passageSection = passage?.trim()
    ? `\n\n**Reference Story / Passage:**\n${passage.trim()}\n`
    : '';
  const promptSection = prompt?.trim() ? `**Writing Topic:** ${prompt.trim()}\n` : '';
  const userMessage =
    `${promptSection}${passageSection}\n**Student writing:**\n\n**Introduction:**\n${intro || '(not written)'}\n\n**Rising Action:**\n${rising || '(not written)'}\n\n**Climax:**\n${climax || '(not written)'}\n\n**Falling Action:**\n${falling || '(not written)'}\n\n**Resolution:**\n${resolution || '(not written)'}`;

  if (endpoint) {
    try {
      // v392: fetchT 加 60 秒逾時——原本是裸 fetch，Worker 不回應時「批改中…」會永遠轉圈
      const res = await fetchT(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 900,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await res.json().catch(() => null);
      return data?.content?.[0]?.text || data?.feedback || data?.text || '批改完成，但回傳格式不符。';
    } catch(e) {
      if (e && e.name === 'AbortError') return 'AI 批改太久沒有回應，請再試一次。';
      return 'AI 批改服務暫時連不上，請稍後再試。';
    }
  }
  return '請設定 AI 批改端點（AI_WRITING_ENDPOINT）。';
}


// ── Wrong Question Helpers ─────────────────────────────────────────────

// Flatten all wrong questions from a student's progress items into a list,
// reverse-lookup week/category, and deduplicate identical questions.
function collectWrongQuestions(progressItems, weeks, weekOrder) {
  const result = [];
  const seen = new Set();
  Object.entries(progressItems || {}).forEach(([itemKey, prog]) => {
    if (!prog?.wrongQuestions?.length) return;
    let weekLabel = '過往內容', cat = '', itemTitle = itemKey;
    if (itemKey.startsWith('review_')) {
      weekLabel = '🏆 總複習'; itemTitle = '總複習';
    } else
    outer: for (const wid of (weekOrder || [])) {
      const w = weeks && weeks[wid];
      if (!w) continue;
      for (const c of (CATEGORIES || [])) {
        const items = (w.items && w.items[c.id]) || [];
        const found = items.find(it =>
          itemKey === `${wid}_${it.id}` || itemKey === it.id || itemKey.endsWith('_' + it.id)
        );
        if (found) {
          weekLabel = w.label || wid;
          cat = c.titleZh;
          itemTitle = found.title || found.zh || found.id;
          break outer;
        }
      }
    }
    prog.wrongQuestions.forEach(wq => {
      const key = `${wq.q}|||${wq.answer}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({ q: wq.q, answer: wq.answer, itemId: itemKey, itemTitle, weekLabel, cat, type: prog.itemType || '',
        // v318 (#3): 帶出原始選項給重練用（舊資料沒有就 undefined，重練那邊會退回舊做法）
        ...(Array.isArray(wq.options) && typeof wq.correct === 'number' ? { options: wq.options, correct: wq.correct } : {}) });
    });
  });
  return result;
}

// Remove a single wrong question from a student's Firestore progress.
async function removeWrongQuestion(uid, itemId, q, answer) {
  if (!uid || !itemId) return;
  try {
    const ref = _db.collection('progress').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return;
    const existing = snap.data()?.items?.[itemId]?.wrongQuestions || [];
    const updated = existing.filter(wq => !(wq.q === q && wq.answer === answer));
    const u = {};
    u[`items.${itemId}.wrongQuestions`] = updated;
    u[`items.${itemId}.wrongCount`] = updated.length;
    await ref.update(u);
  } catch(e) { console.warn('removeWrongQuestion:', e); }
}

// ── Weekly Report Helpers ──────────────────────────────────────────────
// Build a structured report object for one student + one week.
function buildWeeklyReport(student, weeks, weekOrder, { weekId } = {}) {
  const targetWeekId = weekId || (weekOrder && weekOrder.length > 0 ? weekOrder[weekOrder.length - 1] : null);
  const empty = { weekLabel: '—', dateRange: '', completed: [], pending: [], weekVocab: [], completionRate: 0, avgScore: null, totalItems: 0, lateCount: 0, streak: { count: 0 }, xp: 0, badges: {}, wrongQuestions: [], weekId: targetWeekId };
  if (!targetWeekId || !weeks || !weeks[targetWeekId]) return empty;

  const week = weeks[targetWeekId];
  const its = student.items || {};

  /* v392: 「後綴 → 紀錄」的索引，讓最後那層 fallback 從 O(n) 變 O(1)。
     原本每一個沒對上的項目都要 Object.keys(its).find(k => k.endsWith('_'+itemId)) 掃一次，
     學生的 items 累積四十週之後就是上千個 key，而老師後台每一次重繪都會重跑一遍。
     ⚠ 一定要「用到才建」：前兩層命中時原本根本不會去掃，
       無條件先建索引反而會讓正常資料變慢（實測慢 20 倍以上）。 */
  let bySuffix = null;
  const suffixIndex = () => {
    if (bySuffix) return bySuffix;
    bySuffix = {};
    Object.keys(its).forEach(k => {
      /* 每一個「底線之後的尾巴」都建索引，等價於原本的 k.endsWith('_' + itemId)
         （週次 id 或項目 id 自己含底線時也不會漏掉）。
         同一個尾巴只留第一個 key，跟原本 Object.keys(...).find 取第一個的行為相同。 */
      for (let p = k.indexOf('_'); p >= 0; p = k.indexOf('_', p + 1)) {
        const b = k.slice(p + 1);
        if (!(b in bySuffix)) bySuffix[b] = its[k];
      }
    });
    return bySuffix;
  };

  /* ⚠ 優先序必須維持 progressId > 裸 itemId > 後綴，順序寫錯會讓
     「週次改過 id」的舊資料成績消失。 */
  const getProgress = (itemId) =>
    its[`${targetWeekId}_${itemId}`] || its[itemId] || suffixIndex()[itemId] || null;

  const completed = [], pending = [];
  let allWrongQ = [];
  const weekVocab = [];

  // v257: 遲交判定——有截止日的項目，在截止日當天 23:59 之後才完成的算「補交」
  const hw = week.homework || {};
  const dueEndOf = (itemId) => {
    const d = hw[itemId] && hw[itemId].dueDate;
    if (!d) return null;
    const t = new Date(d + 'T23:59:59').getTime();
    return Number.isNaN(t) ? null : t;
  };

  CATEGORIES.forEach(cat => {
    const items = (week.items && week.items[cat.id]) || [];
    items.forEach(item => {
      const prog = getProgress(item.id);
      const isDone = !!(prog && prog.done);
      const title = item.title || item.zh || item.id;
      if (cat.id === 'vocab') weekVocab.push(title);
      if (isDone) {
        const score = prog.score != null ? Math.min(100, Math.round(prog.score)) : null;
        const due = dueEndOf(item.id);
        const late = !!(due && typeof prog.done === 'number' && prog.done > due);
        completed.push({ cat: cat.titleZh, title, score, late, doneAt: typeof prog.done === 'number' ? prog.done : null });
        (prog.wrongQuestions || []).forEach(wq => allWrongQ.push(wq));
      } else {
        pending.push({ cat: cat.titleZh, title });
      }
    });
  });

  allWrongQ = allWrongQ.slice(0, 5);
  const totalItems = completed.length + pending.length;
  const completionRate = totalItems > 0 ? Math.round(completed.length / totalItems * 100) : 0;
  const scored = completed.filter(c => c.score != null);
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length) : null;
  const lateCount = completed.filter(c => c.late).length;

  return {
    weekId: targetWeekId,
    weekLabel: week.label || targetWeekId,
    dateRange: week.dateRange || '',
    completed, pending, weekVocab,
    completionRate, avgScore, totalItems, lateCount,
    streak: student.streak || { count: 0 },
    xp: student.xp || 0,
    badges: student.badges || {},
    wrongQuestions: allWrongQ,
  };
}

// Format a report object into plain text suitable for LINE.
function formatReportAsText(report, studentName) {
  const name = studentName || '學生';
  if (!report || report.totalItems === 0) {
    const weekPart = report ? `${report.weekLabel}${report.dateRange ? `（${report.dateRange}）` : ''}` : '本週';
    return `📚 Alan's English Class 學習週報\n👤 ${name} ｜ ${weekPart}\n\n本週尚未開始學習。\n\n— Alan 老師`;
  }
  const lines = [];
  lines.push(`📚 Alan's English Class 學習週報`);
  const datePart = report.dateRange ? `（${report.dateRange}）` : '';
  lines.push(`👤 ${name} ｜ ${report.weekLabel}${datePart}`);
  lines.push('');
  lines.push(`✅ 本週完成 ${report.completed.length}/${report.totalItems} 項（${report.completionRate}%）`);
  if (report.avgScore != null) lines.push(`⭐ 測驗平均：${report.avgScore} 分`);
  if (report.streak && report.streak.count > 1) lines.push(`🔥 連續學習：${report.streak.count} 天`);

  const bycat = {};
  report.completed.forEach(c => { (bycat[c.cat] = bycat[c.cat] || []).push(c.title); });
  if (Object.keys(bycat).length > 0) {
    lines.push(''); lines.push('本週學習內容：');
    Object.entries(bycat).forEach(([cat, titles]) => lines.push(`• ${cat}：${titles.join('、')}`));
  }
  if (report.pending.length > 0) {
    lines.push(''); lines.push(`📝 尚未完成（${report.pending.length} 項）：`);
    report.pending.forEach(p => lines.push(`• ${p.cat}：${p.title}`));
  }
  if (report.wrongQuestions && report.wrongQuestions.length > 0) {
    lines.push(''); lines.push('💪 建議加強（答錯的題目）：');
    report.wrongQuestions.forEach(wq => lines.push(`• ${wq.q} → ${wq.answer}`));
  }
  lines.push(''); lines.push('— Alan 老師');
  return lines.join('\n');
}

// Render a report object into a polished, mobile-first HTML page (for parents, share via LINE).
function buildReportHTML(report, studentName, teacherNote) {
  // ⚠ 單引號也要跳脫：這段 HTML 是用 window.open('') + document.write 渲染的
  //   （繼承 opener 來源），插進 attr='…' 裡的字串若沒跳脫就能跳出屬性。
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const name = esc(studentName || '學生');
  const weekLine = esc(`${report.weekLabel || ''}${report.dateRange ? ' · ' + report.dateRange : ''}`);
  const avg = report.avgScore;
  const hasScore = avg != null;
  const circ = 402;
  const off = hasScore ? Math.round(circ * (1 - Math.max(0, Math.min(100, avg)) / 100)) : circ;
  const compN = report.completed.length, totN = report.totalItems;
  const rate = report.completionRate;
  /* ⚠ streak 來自學生自己可寫的 progress/{uid}，count 若被塞成字串，
     「|| 0」是攔不住的（字串 truthy），而下面直接把它插進 HTML＝老師開週報時
     會在自己的 session 下執行。一律先 Number() 轉數字。 */
  const streakN = Number(report.streak && report.streak.count) || 0;

  const cm = {};
  report.completed.forEach(c => { if (c.score == null) return; (cm[c.cat] = cm[c.cat] || { s: 0, n: 0 }); cm[c.cat].s += c.score; cm[c.cat].n++; });
  const cats = Object.keys(cm).map(k => ({ cat: k, score: Math.round(cm[k].s / cm[k].n) })).sort((a, b) => b.score - a.score);
  const catRows = cats.map(c => {
    const warn = c.score < 80;
    return `<div class="skill ${warn ? 'warn' : 'good'}"><div class="skill-top"><span class="skill-name">${esc(c.cat)}</span><span class="skill-score">${c.score} 分${warn ? ' · 需加強' : ''}</span></div><div class="skill-bar"><div class="skill-fill" style="width:${c.score}%"></div></div></div>`;
  }).join('') || '<p style="font-size:13px;color:#8A8270;font-weight:600;">本週尚無已完成的測驗分數。</p>';

  const doneRows = report.completed.map(c => `<div class="hw hw-done"><div class="hw-ic">✓</div><div class="hw-name">${esc(c.title)}</div><div class="hw-tag">${c.score != null ? c.score + ' 分' : '已完成'}</div></div>`).join('');
  const pendRows = report.pending.map(p => `<div class="hw hw-wait"><div class="hw-ic">!</div><div class="hw-name">${esc(p.title)}</div><div class="hw-tag">尚未完成</div></div>`).join('');
  const hwRows = (doneRows + pendRows) || '<p style="font-size:13px;color:#8A8270;font-weight:600;">本週尚無練習項目。</p>';

  const wrongRows = (report.wrongQuestions || []).map(wq => `<div class="wrong-item"><span class="q">${esc(wq.q)}</span><br/>正解 <span class="a">${esc(wq.answer)}</span></div>`).join('');
  const wrongBox = wrongRows ? `<div class="wrong-box"><div class="wrong-head">📕 本週需複習的錯題</div>${wrongRows}</div>` : '';

  const note = teacherNote && teacherNote.trim() ? esc(teacherNote).replace(/\n/g, '<br/>') : '這週辛苦了！繼續保持，有任何問題都歡迎隨時問老師。';
  const scoreInner = hasScore
    ? `<b>${avg}</b><small>平均分數</small>`
    : `<b style="font-size:24px;">—</b><small>本週尚未測驗</small>`;

  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>學習週報 · ${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=Nunito:wght@400;600;700;800&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
:root{--paper:#F6F1E6;--card:#FBF8F1;--ink:#1F1B14;--ink-soft:#4A4439;--ink-muted:#8A8270;--accent:#8B3120;--terra:#B85A45;--moss:#5E8A57;--border:#E6DDC9;--border-soft:#EFE8D8;--serif:'Lora',Georgia,serif;--sans:'Nunito','Noto Sans TC',sans-serif;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#ECE4D2;font-family:var(--sans);color:var(--ink);-webkit-font-smoothing:antialiased;padding:18px 0 40px;}
.sheet{max-width:430px;margin:0 auto;padding:0 16px;}
.pr-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding:0 4px;}
.pr-brand{font-family:var(--serif);font-weight:600;font-size:15px;}.pr-brand .dot{color:var(--terra);}
.pr-sync{font-size:11px;font-weight:700;color:var(--accent);background:#F3E6E1;border:1px solid #E8D2CB;padding:3px 9px;border-radius:999px;}
.pr-hero-head{border-radius:20px;padding:20px 22px 18px;margin-bottom:14px;color:#fff;background:linear-gradient(135deg,#9A3A26 0%,#B85A45 100%);box-shadow:0 14px 30px -12px rgba(139,49,32,.5);}
.pr-eyebrow{font-size:12px;font-weight:700;letter-spacing:.04em;opacity:.85;margin-bottom:6px;}
.pr-title{font-family:var(--serif);font-size:23px;font-weight:600;line-height:1.2;}
.pr-stu{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;font-size:13px;}
.pr-stu span{background:rgba(255,255,255,.16);padding:4px 12px;border-radius:999px;font-weight:600;}
.card{background:var(--card);border:1.5px solid var(--border);border-radius:18px;padding:18px;margin-bottom:14px;box-shadow:0 6px 18px -12px rgba(31,27,20,.2);}
.card-label{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800;color:var(--ink-muted);margin-bottom:14px;}
.score-card{text-align:center;background:radial-gradient(120% 120% at 50% 0%,rgba(201,168,76,.16),transparent 62%),var(--card);}
.score-ring{position:relative;width:148px;height:148px;margin:2px auto 4px;}
.score-num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.score-num b{font-family:var(--serif);font-size:46px;font-weight:600;color:var(--accent);line-height:1;}
.score-num small{font-size:12px;color:var(--ink-muted);font-weight:700;margin-top:2px;}
.score-sub{font-size:12.5px;color:var(--ink-muted);margin-top:8px;font-weight:600;}
.stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0;}
.stat{background:var(--card);border:1.5px solid var(--border);border-radius:16px;padding:14px 6px;text-align:center;box-shadow:0 6px 18px -12px rgba(31,27,20,.2);}
.stat b{display:block;font-family:var(--serif);font-size:22px;font-weight:600;line-height:1;}.stat b small{font-size:13px;color:var(--ink-muted);}
.stat span{display:block;font-size:11.5px;color:var(--ink-muted);font-weight:700;margin-top:6px;}
.hw{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid var(--border-soft);}.hw:last-child{border-bottom:none;}
.hw-ic{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;font-weight:800;}
.hw-done .hw-ic{background:#EAF1E8;color:var(--moss);}.hw-wait .hw-ic{background:#FBF0DA;color:#B98A1E;}
.hw-name{flex:1;font-size:14.5px;font-weight:700;color:var(--ink-soft);}
.hw-tag{font-size:11.5px;font-weight:800;}.hw-done .hw-tag{color:var(--moss);}.hw-wait .hw-tag{color:#B98A1E;}
.skill{margin-bottom:13px;}.skill:last-child{margin-bottom:0;}
.skill-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.skill-name{font-size:14px;font-weight:800;color:var(--ink-soft);}
.skill-score{font-family:var(--serif);font-size:15px;font-weight:600;}
.skill-bar{height:9px;border-radius:999px;background:var(--border-soft);overflow:hidden;}.skill-fill{height:100%;border-radius:999px;}
.good .skill-score{color:var(--moss);}.good .skill-fill{background:linear-gradient(90deg,#7AA873,#5E8A57);}
.warn .skill-score{color:#C08A2A;}.warn .skill-fill{background:linear-gradient(90deg,#E0B24C,#C9982E);}
.wrong-box{margin-top:16px;background:#FBF4F2;border:1px solid #EEDAD4;border-radius:14px;padding:13px 14px;}
.wrong-head{font-size:12.5px;font-weight:800;color:var(--accent);margin-bottom:9px;}
.wrong-item{font-size:13px;color:var(--ink-soft);line-height:1.6;padding:6px 0;border-bottom:1px dashed #EAD9D3;}.wrong-item:last-child{border-bottom:none;}
.wrong-item .q{font-weight:700;}.wrong-item .a{color:var(--moss);font-weight:800;}
.note-card{background:linear-gradient(135deg,#FBF8F1,#F6EFE0);}
.note-head{display:flex;align-items:center;gap:11px;margin-bottom:12px;}
.note-avatar{width:46px;height:46px;border-radius:50%;background:#F3E6E1;border:1.5px solid #E8D2CB;object-fit:contain;flex-shrink:0;}
.note-by b{display:block;font-family:var(--serif);font-size:16px;font-weight:600;}.note-by span{font-size:11.5px;color:var(--ink-muted);font-weight:700;}
.note-body{font-size:14px;line-height:1.85;color:var(--ink-soft);font-weight:500;}
.pr-foot{text-align:center;margin-top:6px;padding:14px;}
.pr-foot-line{font-family:var(--serif);font-size:14px;font-weight:600;}
.pr-foot-sub{font-size:11.5px;color:var(--ink-muted);margin-top:4px;font-weight:600;}
</style></head><body><div class="sheet">
<div class="pr-top"><div class="pr-brand">Alan<span class="dot">.</span> English Class</div><div class="pr-sync">康橋進度同步</div></div>
<div class="pr-hero-head"><div class="pr-eyebrow">本週學習週報 · WEEKLY REPORT</div><div class="pr-title">${name} 這週的英文學習</div>
<div class="pr-stu"><span>👤 ${name}</span><span>${weekLine}</span></div></div>
<div class="card score-card"><div class="card-label" style="justify-content:center;"><span>📊</span>本週成績</div>
<div class="score-ring"><svg width="148" height="148" viewBox="0 0 148 148"><circle cx="74" cy="74" r="64" fill="none" stroke="#EFE8D8" stroke-width="12"/><circle cx="74" cy="74" r="64" fill="none" stroke="#B85A45" stroke-width="12" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 74 74)"/></svg>
<div class="score-num">${scoreInner}</div></div>
<div class="score-sub">本週完成 ${compN}/${totN} 項練習</div></div>
<div class="card-label" style="padding:0 6px;margin-bottom:10px;"><span>🏃</span>本週練習量</div>
<div class="stat-row"><div class="stat"><b>${compN}<small>/${totN}</small></b><span>完成練習</span></div><div class="stat"><b>${rate}<small>%</small></b><span>完成率</span></div><div class="stat"><b>${streakN}<small> 天</small></b><span>連續學習 🔥</span></div></div>
<div class="card"><div class="card-label"><span>📋</span>練習完成狀況</div>${hwRows}</div>
<div class="card"><div class="card-label"><span>🎯</span>學習狀況分析</div>${catRows}${wrongBox}</div>
<div class="card note-card"><div class="note-head"><img src="owl-proud.png" alt="" class="note-avatar"/><div class="note-by"><b>老師的話</b><span>Alan 老師 · 康橋英文</span></div></div><div class="note-body">${note}</div></div>
<div class="pr-foot"><div class="pr-foot-line">Alan's English Class</div><div class="pr-foot-sub">康橋進度同步學習系統 · 每週更新</div></div>
</div></body></html>`;
}

// ── v342: 集點（星星）───────────────────────────────────
// 取代 Alan 手寫在 Google Doc 的流水帳：stars/{學生email} =
//   { name, balance, entries: [{ id, date:'YYYY-MM-DD', amount, note, by, at }] }
// amount 可正可負（上課給星星＝正、兌換商品＝負）。balance 每次寫入時重算，不會累積誤差。
// 權限：只有老師能寫；學生只能讀自己那一筆（見 firestore.rules）。
function _starsDoc(email) { return _db.collection('stars').doc(_lc(email)); }
function _sumEntries(entries) {
  return (entries || []).reduce((n, e) => n + (Number(e.amount) || 0), 0);
}

// 學生端：訂閱自己的星星
function subscribeMyStars(email, callback, onError) {
  const id = _lc(email);
  if (!id) { callback({ balance: 0, entries: [] }); return () => {}; }
  return _starsDoc(id).onSnapshot(snap => {
    const d = snap.exists ? snap.data() : {};
    const entries = (d.entries || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    callback({ balance: _sumEntries(d.entries), entries, name: d.name || '' });
  }, onError || (() => {}));
}

// 老師端：訂閱全部學生的星星
function subscribeAllStars(callback, onError) {
  return _db.collection('stars').onSnapshot(snap => {
    const out = {};
    snap.forEach(doc => {
      const d = doc.data() || {};
      out[doc.id] = { email: doc.id, name: d.name || '', balance: _sumEntries(d.entries), entries: d.entries || [] };
    });
    callback(out);
  }, onError || (() => {}));
}

// 新增一筆（老師）。amount 可負；date 預設今天
async function addStarEntry(email, { amount, note, date, name }) {
  const id = _lc(email);
  if (!id || !id.includes('@')) throw new Error('invalid-email');
  const n = Number(amount);
  if (!n || !isFinite(n)) throw new Error('invalid-amount');
  const ref = _starsDoc(id);
  const snap = await ref.get();
  const cur = snap.exists ? (snap.data() || {}) : {};
  const entries = (cur.entries || []).concat([{
    id: 'e' + Date.now() + Math.random().toString(36).slice(2, 6),
    date: date || new Date().toISOString().slice(0, 10),
    amount: Math.round(n),
    note: String(note || '').trim(),
    by: (_auth.currentUser && _auth.currentUser.email) || '',
    at: Date.now(),
  }]);
  await ref.set({
    name: name || cur.name || '',
    entries,
    balance: _sumEntries(entries),
    updatedAt: Date.now(),
  }, { merge: true });
}

// 刪除一筆（打錯了要修正）
async function deleteStarEntry(email, entryId) {
  const ref = _starsDoc(email);
  const snap = await ref.get();
  if (!snap.exists) return;
  const entries = ((snap.data() || {}).entries || []).filter(e => e.id !== entryId);
  await ref.set({ entries, balance: _sumEntries(entries), updatedAt: Date.now() }, { merge: true });
}

// ── v343: 商店商品（老師自己維護）────────────────────────
// 存在 class/shop（class 集合＝公開可讀、只有老師可寫，沿用現成規則不必改）。
// items: [{ id, name, cost, tag, img, url, emoji }]
//   img = 上傳後的圖片網址（建議從蝦皮截圖上傳，最穩不會破圖）
//   url = 蝦皮商品連結（選填，學生可點「看商品」）
const _shopDoc = _db.collection('class').doc('shop');
function subscribeShop(callback, onError) {
  return _shopDoc.onSnapshot(snap => {
    const d = snap.exists ? (snap.data() || {}) : {};
    callback(Array.isArray(d.items) ? d.items : null);   // null＝老師還沒設定過（前端用內建範例）
  }, onError || (() => {}));
}
async function saveShopItems(items) {
  await _shopDoc.set({ items: items || [], updatedAt: Date.now() }, { merge: true });
}

// ── LINE 通知（老師發公告）─────────────────────────────
// 走「獨立」的 LINE Worker（跟 AI Worker 分開）。管理密碼由老師在後台輸入、
// 只存在該裝置 localStorage，不寫進這份公開程式碼。
// ⚠️ 部署 Worker 後，若你取的名字不是 alan-line，把下面網址改成你的。
const LINE_ENDPOINT = 'https://alan-line.alan07050445.workers.dev';
async function lineBroadcast(text, pass) {
  const res = await fetch(LINE_ENDPOINT + '/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-pass': pass || '' },
    body: JSON.stringify({ text: String(text || '') }),
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok || !data || !data.ok) {
    const err = new Error((data && data.error) || ('http_' + res.status));
    err.detail = data && data.detail;
    throw err;
  }
  return data;
}

// 共用的 LINE Worker 呼叫（帶管理密碼）
async function _lineCall(path, method, pass, body) {
  const opts = { method, headers: { 'x-admin-pass': pass || '' } };
  if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(LINE_ENDPOINT + path, opts);
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok || !data || !data.ok) {
    const err = new Error((data && data.error) || ('http_' + res.status));
    err.detail = data && data.detail;
    throw err;
  }
  return data;
}
// 發送給指定對象（target = {type:'all'|'grade'|'students', grade?, emails?}）
function linePush(target, text, pass) { return _lineCall('/push', 'POST', pass, { target, text: String(text || '') }); }
// 同步學生名單到 Worker（webhook 比對姓名用）
function lineSyncRoster(roster, pass) { return _lineCall('/sync-roster', 'POST', pass, { roster: roster || [] }); }
// 讀家長綁定狀態
function lineGetLinks(pass) { return _lineCall('/links', 'GET', pass); }
// 解除某筆綁定（email 省略＝整個 LINE 帳號解綁）
function lineUnlink(lineUserId, email, pass) { return _lineCall('/unlink', 'POST', pass, { lineUserId, email }); }
// 功能B：手動試跑作業提醒（dry=true 只預覽不發送）
function lineRunReminders(dry, pass) { return _lineCall('/run-reminders' + (dry ? '?dry=1' : ''), 'POST', pass); }

Object.assign(window, {
  CATEGORIES, SEED_WEEKS, DEFAULT_WEEK_ORDER, TYPE_META, ADMIN_EMAILS,
  // v342: 集點（星星）
  subscribeMyStars, subscribeAllStars, addStarEntry, deleteStarEntry,
  // v343: 商店商品（老師自己維護）
  subscribeShop, saveShopItems,
  // LINE 通知
  LINE_ENDPOINT, lineBroadcast, linePush, lineSyncRoster, lineGetLinks, lineUnlink, lineRunReminders,
  loadWeeks, saveWeeks, loadProgress, saveProgress, toYouTubeEmbed,
  loadWeekOrder, saveWeekOrder, suggestNextWeekId,
  subscribeToClassData, uploadPdfToStorage, uploadSubmissionPhoto, uploadReadingPhoto,
  // v336: 單字卡自訂圖片
  uploadFlashcardImage, compressImageBlob,
  // Companion
  loadCompanion,
  // Roster
  subscribeRoster, addRosterStudent, setRosterStudentActive, deleteRosterStudent,
  setRosterStudentTeacher,   // v339: 轉移學生給其他老師
  addLeaderboardEntry, deleteLeaderboardEntry, subscribeLeaderboard,
  // Auth
  signInWithGoogle, signInWithGoogleRedirect, signOutUser, subscribeAuth, isAdminUser,
  // v337: 多位老師共管
  OWNER_EMAILS, isOwnerUser, subscribeAdminStatus, subscribeAdmins, addAdmin, removeAdmin,
  // Per-user progress
  saveProgressItem, subscribeMyProgress, subscribeAllStudents, saveQuizMistakes,
  // Streak, Badges & XP
  BADGES, updateStreak, unlockBadge, subscribeUserProfile,
  getLevel,
  buildReportHTML,
  COMPANION_LINES, pickLine,
  // Sound & TTS
  dictHas, prefetchDict, readWorthyWords,
  playSound, speakText, speakTTS, ttsIsSpeaking, speakSentences, prefetchTts, unlockTtsAudio, getTtsMode, setTtsMode, grSpeechChunks, ttsPickVoice: _ttsPickVoice,
  aiMakeVocabExercises, aiMakeVocabStory, storyBlanks, storyCheck, storyFix, storyHint: _storyHint, aiMakeGrammarSet, GR_TENSES, grCountBlanks, grValidA: _grValidA, grValidB: _grValidB, grFixPassage: _grFixPassage, aiMakeLesson,
  // v386: 閱讀理解出題（選擇題＋簡答＋閱讀技巧）
  aiMakeReadingSet, aiMakeGuidedQuestions, rcGroundedMcq, rcGroundedSa, RC_SKILLS, RC_GRADES, rcValidBlock, rcFixBlock, rcRepairBlock, rcResequence, rcFilterChips, rcNewChip: () => ({ id: _rcId('rc'), text: '', zone: '', why: '' }), rcNewBlockId: () => _rcId('rb'),
  // v287/v288: 分段閱讀——OCR 單字資料（Firestore）＋點字查義
  saveReadingWords, fetchReadingWords, lookupWord, uploadReadingAudio, generateTtsAudio, grJoinReadLines, grReadTextFrom, grReadWordsFrom,
  // AI Writing, Short Answer, Essay & Story Mountain
  checkWriting, checkShortAnswer, checkEssay, checkStoryMountain,
  // Wrong questions
  collectWrongQuestions, removeWrongQuestion,
  // Weekly Report
  buildWeeklyReport, formatReportAsText,
});

/* ── 學校帳號自動分年級（v237）──
   康橋學號 email：le<NN>...@stu.kcislk...  年級 = LE_GRADE_BASE − NN
   2026 學年 base=16：le15→G1、le14→G2、le13→G3、le12→G4、le11→G5、le10→G6
   ⚠️ 每年開學要 +1（2027 學年改成 17）——非學校帳號回傳 null，不自動分類
   v399（開學）：學生端的年級改成「由這裡綁定、不能自己選」（app.jsx 的 boundGrade），
   所以這個函式現在是學生看到哪一班的唯一依據——算錯就是進錯教室。
   下限也從 2 放到 1，因為 v399 開了 G1 課程軌（le15 以前會回 null）。 */
const LE_GRADE_BASE = 16;
window.gradeFromEmail = function (email) {
  const m = String(email || '').toLowerCase().match(/^le(\d{2})/);
  if (!m) return null;
  const g = LE_GRADE_BASE - parseInt(m[1], 10);
  return (g >= 1 && g <= 6) ? ('g' + g) : null;
};


/* ── v359: 課程內容存檔防呆（G2–G6 沿用暑假題庫那套）─────────
   2026-08-13 暑假題庫被空白預設值蓋掉 87 個單元。學期各年級是一模一樣的寫法：
   loadWeeks() 讀不到本機快取就回 SEED_WEEKS，在雲端快照回來前存檔就會整份蓋掉。
   app.jsx 的 saveWeeksSafe 已經擋住「還沒載入就存」，這裡再加第二道：
   雲端本來有題目、這次卻要寫 0 題 → 直接拒絕。 */
const _cloudWeekCount = {};      // 年級 → 最近一次雲端快照的題數
function _countWeekItems(weeks) {
  return Object.values(weeks || {}).reduce((n, wk) =>
    n + Object.values((wk || {}).items || {}).reduce((m, arr) => m + ((arr && arr.length) || 0), 0), 0);
}
function noteCloudWeeks(key, weeks) { _cloudWeekCount[key] = _countWeekItems(weeks); }
function guardWeekSave(key, weeks) {
  const last = _cloudWeekCount[key];
  if (last === undefined) throw new Error('課程內容還沒從雲端載入完成，先等一下再存（避免把雲端的題目蓋掉）');
  const n = _countWeekItems(weeks);
  if (n === 0 && last > 0) {
    throw new Error(`擋下了一次危險的存檔：這次要寫入的是 0 題，但雲端現在有 ${last} 題。請重新整理後再試。`);
  }
  return n;
}
Object.assign(window, { noteCloudWeeks, guardWeekSave, countWeekItems: _countWeekItems });

/* ═══════════ v361: 完成練習自動集點 ═══════════════════════════
   Alan 訂的規則（老師／管理者不計）：
     · 單字卡：「學習模式」和「填空模式」都跑完 → +10
     · 填空(fillblank/cloze)：80 分以上 +10；滿分 +15
     · 簡答(short-answer)：平均 3 顆星以上 +10；4 顆以上 +20
     · 本週作業「全部完成且每一項都有達標」的額外獎金：
         ≤5 個 +10／超過 5 個 +15／超過 8 個 +20
   ⚠ 刻意「用進度算出來」而不是存一份星星數：
     ① 學生沒有 stars/ 的寫入權限（規則只開放老師），不必改 rules
     ② 分數改了、老師刪了某筆成績，星星自動跟著對，不會有一份對不起來的舊帳
     ③ 學生無法自己灌星星（沒有可寫的計數器） */
const AUTO_STAR_RULES = {
  flashcard: '學習＋測驗（選擇題）完成 +10；測驗的手寫題也全部答完再 +20',
  fillblank: '80 分 +10／100 分 +15',
  'def-match': '比照填空：80 分 +10／100 分 +15',
  'reading-skill': '比照填空：80 分 +10／100 分 +15',
  lesson: '教學卡讀完 +5',
  'short-answer': '平均 3 星 +10／4 星 +20',
  bonus: '本週作業全部達標：+10（超過 5 個 +15、超過 8 個 +20）',
};
// 分數取百分比。⚠ 兩種來源格式不同，一定要講清楚是哪一種：
//   學生端 qmProgress → { score, total } 是「分數/總分」（例 4/5 星）
//   老師端 progress.items → { score } 已經是 0–100 的百分比、total 是原始總分
function autoStarPct(prog, cloudShape) {
  if (!prog || prog.score == null) return null;
  if (cloudShape) return Math.round(Number(prog.score));
  if (!prog.total) return null;
  return Math.round(prog.score / prog.total * 100);
}
// 這一項「有沒有達到應有的分數」——作業獎金要求每一項都達標
function autoStarItemOk(item, prog, cloudShape) {
  if (!prog) return false;
  const type = (item && item.type) || prog.itemType || '';
  const pct = autoStarPct(prog, cloudShape);
  if (type === 'flashcard') return !!(prog.modes && prog.modes.learn && (prog.modes.test || prog.modes.fill));
  if (type === 'short-answer') return pct != null && pct >= 60;     // 5 星制的 3 星
  if (pct == null) return !!prog.done;                              // 上傳作業等沒有分數的
  return pct >= 80;
}
function autoStarsForItem(item, prog, cloudShape) {
  if (!prog) return 0;
  const type = (item && item.type) || prog.itemType || '';
  const pct = autoStarPct(prog, cloudShape);
  if (type === 'flashcard') {
    const m = prog.modes || {};
    if (!(m.learn && (m.test || m.fill))) return 0;
    return 10 + (m.written ? 20 : 0);   // v374: 測驗的手寫題全部答完再加 20
  }
  if (type === 'short-answer') { if (pct == null) return 0; return pct >= 80 ? 20 : (pct >= 60 ? 10 : 0); }
  if (type === 'lesson') return 5;   // v383: 教學卡讀完就給，重點是讓他先看
  if (type === 'fillblank' || type === 'cloze' || type === 'def-match' || type === 'reading-skill') { if (pct == null) return 0; return pct >= 100 ? 15 : (pct >= 80 ? 10 : 0); }
  return 0;
}
// weeks/weekOrder＝這位學生看得到的週次（暑假要先用 filterWeeksForPlan 過濾）
// progItems＝進度 map；opts.cloudShape=true 代表直接吃 progress 文件的 items
function computeAutoStars(weeks, weekOrder, progItems, opts) {
  const cloudShape = !!(opts && opts.cloudShape);
  const entries = [];
  let total = 0;
  const its = progItems || {};
  /* v409：已經算過的進度 key。第二輪（下面「以前教室賺的」）不可以再算一次。 */
  const used = new Set();
  const findKey = (wid, id) => {
    if (its[`${wid}_${id}`] !== undefined) return `${wid}_${id}`;
    if (its[id] !== undefined) return id;
    return Object.keys(its).find(k => k.endsWith('_' + id)) || '';
  };
  const getProg = (wid, id) => { const k = findKey(wid, id); return k ? its[k] : null; };
  const dateOf = (prog) => {
    const t = Number((prog && (prog.ts || prog.done)) || 0);
    return t > 1e11 ? new Date(t).toISOString().slice(0, 10) : '';
  };
  (weekOrder && weekOrder.length ? weekOrder : Object.keys(weeks || {})).forEach(wid => {
    const wk = (weeks || {})[wid];
    if (!wk) return;
    const all = [];
    Object.values(wk.items || {}).forEach(arr => (arr || []).forEach(it => all.push(it)));
    all.forEach(it => {
      const k = findKey(wid, it.id);
      if (k) used.add(k);
      const prog = getProg(wid, it.id);
      const n = autoStarsForItem(it, prog, cloudShape);
      if (n > 0) {
        total += n;
        entries.push({ id: `auto:${wid}_${it.id}`, auto: true, date: dateOf(prog),
                       amount: n, note: `完成「${it.title || it.id}」` });
      }
    });
    // 本週作業獎金：有設作業（暑假＝發派即作業）才算，而且每一項都要達標
    const hwIds = Object.keys(wk.homework || {});
    const hwItems = all.filter(it => hwIds.indexOf(it.id) >= 0);
    if (hwItems.length > 0 && hwItems.every(it => autoStarItemOk(it, getProg(wid, it.id), cloudShape))) {
      const bonus = hwItems.length > 8 ? 20 : (hwItems.length > 5 ? 15 : 10);
      total += bonus;
      entries.push({ id: `auto:bonus_${wid}`, auto: true, date: '',
                     amount: bonus, note: `${wk.label || wid} 作業全部完成 🎉` });
    }
  });

  /* ══ v409（學生回報：「暑假拿的星星，開學就不見了」）══════════════════════
     真的有 bug，而且每個學生都中。原因是上面那一圈只走「現在這個教室看得到的週次」：
     weeks / weekOrder 是跟著年級走的（class/data_g4、class/data_summer_lib… 各一份），
     開學之後學生被學號綁到自己的年級，暑假題庫那 9 週就再也不會被載進來
     → 在暑假賺的每一顆自動星星當場歸零（暑假題庫全做完上限 2370 顆）。
     封存(v398)或看別的年級也會踩到同一顆地雷。

     修法：**拿到的星星就是拿到了**。進度紀錄（progress/{uid}.items）是跟著「人」走的，
     不會因為換教室而消失，所以第二輪直接掃進度：上面沒算到的紀錄，用它自己存的
     itemType 算星星。這樣星星就跟「他做過什麼」綁在一起，而不是「他現在看得到什麼」。
     ⚠ 只認得出 itemType 的紀錄。純本機、沒有型別的舊紀錄算不出來也不會亂給
       （寧可少給也不要無中生有）——它們只要那一週還看得到，第一輪本來就算過了。
     ⚠ 作業獎金沒辦法補算（要有那一週的 homework 清單）。暑假 9 週都沒有設作業，
       所以這次一顆都沒差；封存的學期週次會少掉獎金那一筆。 */
  Object.keys(its).forEach(k => {
    if (used.has(k)) return;
    const prog = its[k];
    const n = autoStarsForItem(null, prog, cloudShape);
    if (n <= 0) return;
    total += n;
    entries.push({ id: `auto:${k}`, auto: true, past: true, date: dateOf(prog),
                   amount: n, note: `完成「${(prog && prog.itemTitle) || '之前的練習'}」` });
  });

  return { total, entries };
}
Object.assign(window, { computeAutoStars, autoStarsForItem, autoStarItemOk, AUTO_STAR_RULES });

/* 單字卡「學習／填空」模式完成 → 記在該單元的進度底下（雲端＋本機） */
async function markFlashcardMode(uid, displayName, email, progressKey, mode) {
  if (!uid || !progressKey || !mode) return;
  try {
    const ref = _db.collection('progress').doc(uid);
    const profileFields = { updatedAt: Date.now() };
    if (displayName && displayName.trim()) profileFields.name  = displayName.trim();
    if (email      && email.trim())        profileFields.email = email.trim();
    await ref.set(profileFields, { merge: true });
    await ref.update({
      [`items.${progressKey}.modes.${mode}`]: true,
      [`items.${progressKey}.itemType`]: 'flashcard',
    });
  } catch (e) { console.warn('markFlashcardMode:', e); }
}
window.markFlashcardMode = markFlashcardMode;

/* ═══════════ v362: 每日簽到 ═══════════════════════════════════
   規則（Alan 訂的）：每天簽到 +5；每一輪 28 天裡累積到 7/14/21/28 天
   各再給 +10/+20/+30/+40；整輪 28 天「一天都沒斷」再加 +50 全勤獎。
   存在學生自己的 progress 文件底下（規則本來就允許本人寫），
   星星一樣是「算出來的」，跟 v361 自動集點同一套邏輯，不另外存一份數字。 */
const CHECKIN_DAILY      = 5;
const CHECKIN_CYCLE      = 28;
const CHECKIN_MILESTONES = [[7, 10], [14, 20], [21, 30], [28, 40]];
const CHECKIN_PERFECT    = 50;

function checkinToday(d) {
  const x = d || new Date();
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function _ciDayNum(s) { const [y, m, d] = String(s).split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); }

async function checkInToday(uid, displayName, email) {
  if (!uid) throw new Error('not-signed-in');
  const date = checkinToday();
  const ref = _db.collection('progress').doc(uid);
  const profile = { updatedAt: Date.now() };
  if (displayName && displayName.trim()) profile.name  = displayName.trim();
  if (email      && email.trim())        profile.email = email.trim();
  await ref.set(profile, { merge: true });
  await ref.update({ [`checkin.dates.${date}`]: true, 'checkin.last': date });
  return date;
}

// 回傳 { days, streak, cycleDay, cycleDates, signedToday, total, entries }
function computeCheckin(checkin) {
  const map = (checkin && checkin.dates) || {};
  const dates = Object.keys(map).filter(k => map[k]).sort();
  const days  = dates.length;
  const today = checkinToday();
  const signedToday = !!map[today];

  // 目前連續幾天（以今天或昨天為結尾才算「還在連續中」）
  let streak = 0;
  if (days) {
    const last = dates[days - 1];
    const gap = _ciDayNum(today) - _ciDayNum(last);
    if (gap <= 1) {
      streak = 1;
      for (let i = days - 1; i > 0; i--) {
        if (_ciDayNum(dates[i]) - _ciDayNum(dates[i - 1]) === 1) streak++; else break;
      }
    }
  }

  const entries = [];
  let total = 0;
  if (days > 0) {
    total += days * CHECKIN_DAILY;
    entries.push({ id: 'chk:daily', auto: true, date: dates[days - 1],
                   amount: days * CHECKIN_DAILY, note: `每日簽到 ${days} 天` });
  }
  // 一輪 28 天結算一次
  const cycleCount = Math.ceil(days / CHECKIN_CYCLE) || 0;
  for (let c = 0; c < cycleCount; c++) {
    const chunk = dates.slice(c * CHECKIN_CYCLE, (c + 1) * CHECKIN_CYCLE);
    CHECKIN_MILESTONES.forEach(([need, bonus]) => {
      if (chunk.length >= need) {
        total += bonus;
        entries.push({ id: `chk:${c}:${need}`, auto: true, date: chunk[need - 1],
                       amount: bonus, note: `簽到累積 ${need} 天獎勵` });
      }
    });
    if (chunk.length === CHECKIN_CYCLE) {
      const perfect = chunk.every((d, i) => i === 0 || _ciDayNum(d) - _ciDayNum(chunk[i - 1]) === 1);
      if (perfect) {
        total += CHECKIN_PERFECT;
        entries.push({ id: `chk:${c}:perfect`, auto: true, date: chunk[CHECKIN_CYCLE - 1],
                       amount: CHECKIN_PERFECT, note: `28 天全勤獎 🏅` });
      }
    }
  }
  const cycleStart = Math.floor(Math.max(0, days - (signedToday ? 1 : 0)) / CHECKIN_CYCLE) * CHECKIN_CYCLE;
  return {
    days, streak, signedToday, total, entries,
    cycleDates: dates.slice(cycleStart, cycleStart + CHECKIN_CYCLE),
    cycleDay: days - cycleStart,     // 這一輪已經簽到幾天（1–28）
  };
}
Object.assign(window, {
  checkInToday, computeCheckin, checkinToday,
  CHECKIN_DAILY, CHECKIN_CYCLE, CHECKIN_MILESTONES, CHECKIN_PERFECT,
});
