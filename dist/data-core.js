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
/* 🔴 v550（Alan：「用 iPad Safari 登入時，很常會跳回之前刪掉和封存的 week，要重新整理才會好」）
   iPad／iPhone 的 Safari 有一個已知的毛病：Firestore 預設用的串流連線（WebChannel）
   會被內容過濾、省電模式或某些網路**悄悄擋掉**——不報錯、onSnapshot 就是**永遠不回資料**。
   這時畫面只能停在「本機快取，沒有快取就是種子資料」（G4 的種子就是 Week 1~8，全是空的），
   重新整理換一條新連線才會好。
   ⭐ 官方建議的解法：讓它自己偵測，串流不通就改用長輪詢（long polling）。
   ⚠ 一定要在**第一次使用 Firestore 之前**設定（這裡就是第一行），晚了會直接丟錯。 */
try { _db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) { console.warn('firestore settings:', e); }
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
    id: "ltvocab",
    num: "02",
    title: "LT Vocabulary",
    titleZh: "中師單字",
    desc: "Chinese-teacher (LT) lesson vocabulary — flashcards, matching, spelling and quiz practice.",
    descZh: "本週中師課堂單字，透過字卡、配對、聽寫與測驗反覆練習。",
  },
  {
    id: "grammar",
    num: "03",
    title: "Grammar",
    titleZh: "文法",
    desc: "Sentence patterns and grammar drills. Watch the explanation, then practice.",
    descZh: "本週文法重點：例句說明、影片解析、線上練習與評量。",
  },
  {
    id: "word",
    num: "04",
    title: "Word Study",
    titleZh: "字根字首",
    desc: "Roots, prefixes, suffixes — learn how words are built so you can decode unfamiliar ones.",
    descZh: "從字根字首認識單字結構，學會自己拆解陌生單字。",
  },
  {
    id: "reading",
    num: "05",
    title: "Reading Comprehension",
    titleZh: "閱讀理解",
    desc: "Short passages with comprehension questions. Read first, then answer.",
    descZh: "短文閱讀加上閱讀測驗題目，培養閱讀理解的速度與準確度。",
  },
  {
    id: "mock",
    num: "06",
    title: "Comprehensive Exam",
    titleZh: "綜合考卷",
    desc: "Full practice exam papers — word study, vocabulary and reading in one scored paper.",
    descZh: "整份有配分的綜合考卷：字詞、詞彙、閱讀一次考，交卷才公布分數。",
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

// 轉移學生給另一位老師（只有擁有者會用到）
async function setRosterStudentTeacher(email, teacher) {
  const id = String(email || '').trim().toLowerCase();
  await _db.collection('roster').doc(id).set({ teacher: String(teacher || '').toLowerCase() }, { merge: true });
}

async function saveWeeks(weeks) {
  guardWeekSave('g3', weeks);                      // v359: 不准把有題目的蓋成空的
  await _classDoc.set({ weeks: weeksWithDeletes('g3', weeks) }, { merge: true });   // v595：少掉的 key 要真的刪
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
    /* v453：行尾斷詞（coast- / line）接回成一個字。
       ⚠ 這件事本來只有「朗讀用的文字」那一邊做，字清單這邊沒做 → 兩邊的字數不一樣，
       逐字高亮就整段對不上（Alan：「螢光完全沒有跟著語速」）。 */
    const prev = out[out.length - 1];
    if (prev && /[A-Za-z]-$/.test(prev.t) && /^[A-Za-z]/.test(t)) {
      prev.t = prev.t.replace(/-$/, '') + t;
      prev.r = prev.t;
      prev.w = Math.max(prev.w || 0, ((w.x || 0) + (w.w || 0)) - (prev.x || 0));   // 兩個框併成一個
      return;
    }
    out.push({ t: t, r: w.r || t, x: w.x, y: w.y, w: w.w, h: w.h });
  });
  return out;
}

/* v453：照片段落的「朗讀文字」直接用字清單接起來——跟逐字高亮吃的是同一份資料，
   所以第 N 個字一定就是第 N 個框。以前朗讀文字走另一條路（沒有框選區域時甚至是
   grJoinReadLines 的行資料），兩邊的字序不同，高亮從第一個字就開始偏。 */
function grWordsText(words) {
  return (words || []).map(w => String(w.t || w.r || '').trim()).filter(Boolean).join(' ').replace(/\s{2,}/g, ' ').trim();
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
/* ══ v411：預抓改成「一次問一批」（Alan：「AI 能不能再更快」）════════════════
   量出來的數字（打 Alan 的 Worker 實測）：
     · 固定成本 ≈ 915ms —— 連線來回＋模型開口前的時間，一個 token 的回答也要這麼久。
       所以「把一個字查快」沒什麼空間可壓（單字查一次 1.3~1.8 秒，其中 0.9 秒是這個）。
     · 但一次問 15 個字只要 5.06 秒 ＝ **338ms/字**，是一個一個問的 1/4。
   結論：讓「點下去要等」這件事變少，比讓「等的時候變快」實際。
   所以預抓改成批次：一批 12 個字、最多兩批同時跑，一整段（約 14 個字）約 5 秒就全暖好。
   ⚠ 請求數也從 14 次降到 1~2 次——省錢，也不會跟圖片、語音搶連線。 */
const DICT_BATCH_SIZE = 12;
const DICT_BATCH_PARALLEL = 2;
const _DICT_BATCH_SYS =
`You are a dictionary for Taiwanese elementary school students learning English.
Output ONLY a JSON object mapping every word I give you to its entry. No prose, no markdown, no code fences.
{"<word>":{"z":"<Traditional Chinese meaning, 2-6 characters>","e":"<one very simple English definition an 8-year-old understands, max 12 words>","s":"<one short natural example sentence using the word, max 10 words>"}}
Include every word exactly as I spelled it. If a word is not real English, use {"z":"（這個字讀不出來）","e":"","s":""}.`;

// 批次回來的資料 → 跟單字查詢一模一樣的三行格式（兩邊存進同一份快取，學生看不出差別）
function _dictFromEntry(o) {
  const z = String((o && o.z) || '').trim();
  if (!z) return '';
  const e = String((o && o.e) || '').trim();
  const x = String((o && o.s) || '').trim();
  return `【中文】${z}` + (e ? `\n【英文】${e}` : '') + (x ? `\n【例句】${x}` : '');
}
async function _dictBatch(words) {
  const endpoint = AI_WRITING_ENDPOINT || '';
  if (!endpoint || !words.length) return;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5', max_tokens: 140 * words.length + 200,
      system: _DICT_BATCH_SYS,
      messages: [{ role: 'user', content: 'Words: ' + words.join(', ') }],
    }),
  });
  const data = await res.json().catch(() => null);
  const txt = data?.content?.[0]?.text || '';
  let obj = null;
  try { obj = JSON.parse(_aiStripFence(txt)); } catch (e) { obj = null; }   // 解析不了就整批放棄，點下去再單獨查
  if (!obj || typeof obj !== 'object') return;
  const c = _dictCache();
  let n = 0;
  Object.keys(obj).forEach(k => {
    const w = String(k || '').trim().toLowerCase();
    const line = _dictFromEntry(obj[k]);
    if (!w || !line || c[w]) return;
    c[w] = line; n++;
  });
  if (!n) return;
  const keys = Object.keys(c);
  if (keys.length > 600) keys.slice(0, 200).forEach(k => delete c[k]);      // 快取上限，跟單字查詢同一條規則
  try { localStorage.setItem(DICT_CACHE_KEY, JSON.stringify(c)); } catch (e) {}
}
function prefetchDict(words, { limit = 60, size = DICT_BATCH_SIZE, parallel = DICT_BATCH_PARALLEL } = {}) {
  const cache = _dictCache();
  const list = readWorthyWords(words, 0).filter(w => !cache[w]).slice(0, limit);
  const groups = [];
  for (let i = 0; i < list.length; i += size) groups.push(list.slice(i, i + size));
  let stop = false, g = 0;
  const run = async () => {
    while (!stop) {
      const batch = groups[g++];
      if (batch === undefined) return;
      try { await _dictBatch(batch); } catch (e) { /* 這一批算了，繼續下一批 */ }
    }
  };
  if (groups.length) {
    const n = Math.min(parallel, groups.length);
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
    /* v589：保留「第一次完成」的時間（first）——節慶星星雙倍看它（見 earnedAtOf）。
       這一筆是**整個被換掉**的，而 done 每次完成都會更新成最新那次；
       不留 first 的話，11 月重做一個萬聖節完成的練習，雙倍就消失、星星變少。
       ⚠ 舊資料沒有 first：用舊的 done 當第一次（最接近的已知值）。
       ⚠ 多讀一次文件，但**只在「完成」時**才讀（不是每次作答）；讀失敗就不帶 first，不影響存檔。 */
    if (data && data.done) {
      try {
        const snap = await ref.get();
        const old = snap.exists ? ((snap.data() || {}).items || {})[itemId] : null;
        const t = (v) => (Number(v) > 1e11 ? Number(v) : 0);
        const first = t(old && old.first) || t(old && old.done) || t(data.done) || t(data.ts);
        if (first) data = { ...data, first };
      } catch (e) { /* 讀不到就照舊存，只是這一筆沒有 first */ }
    }
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
    // v362: 第二個＝每日簽到；v465: 第三個＝訂正錯題的紀錄（星星要用）
    callback(d.items || {}, d.checkin || null, d.fixed || null, d.treat || null);   // v612：第四個＝Trick or Treat 的領取紀錄
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
        fixed: d.fixed || null,       // v612：後台以前沒算訂正錯題的星星，跟學生端對不起來
        treat: d.treat || null,       // v612：Trick or Treat
        mx: d.mx || {},               // v448：後台要看得到「買過哪些裝扮」才算得出真正的星星數
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
/* v453（Alan：「有些單字還是會唸錯或是少念，尤其是阿拉伯數字，像是年份」）
   ── 年份唸成「seventeen ninety-nine」而不是「one thousand seven hundred ninety-nine」，
   長串數字改成一個一個唸（12345678 整串被跳過是實測過的老問題）。
   ⚠ 一個 token 換成一個詞組＝**字數不變**，逐字高亮的對應關係才不會跑掉。 */
const _ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const _TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const _TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function _say2(n) {                                   // 0~99
  if (n < 10) return _ONES[n];
  if (n < 20) return _TEENS[n - 10];
  return _TENS[Math.floor(n / 10)] + (n % 10 ? '-' + _ONES[n % 10] : '');
}
function grSayNumber(tok) {
  const raw = String(tok || '');
  const m = raw.match(/^(\D*)(\d+)(\D*)$/);
  if (!m) return raw;
  const [, pre, digits, post] = m;
  const n = +digits;
  let said;
  if (digits.length === 4 && n >= 1000 && n <= 2999) {
    const hi = Math.floor(n / 100), lo = n % 100;      // 1799 → seventeen ninety-nine
    said = lo === 0 ? _say2(hi) + ' hundred'
      : lo < 10 ? _say2(hi) + ' oh ' + _ONES[lo]       // 1805 → eighteen oh five
      : _say2(hi) + ' ' + _say2(lo);
  } else if (digits.length > 4) {
    said = digits.split('').map(d => _ONES[+d]).join(' ');   // 長串數字一個一個唸
  } else {
    return raw;                                        // 一般數字交給語音引擎（它唸得好）
  }
  return pre + said + post;
}
function grSpeechChunks(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const sents = s.match(/[^.!?]+[.!?]+["'”’)]*|[^.!?]+$/g) || [s];
  const out = [];
  /* v453：每一塊記下「從第幾個字開始、有幾個字」——朗讀時就能把 onboundary 的字元位置
     換算成「現在唸到第幾個字」，逐字高亮才會真的跟著聲音走（以前是用整段的字元比例估的）。 */
  const WRE = /[A-Za-z0-9][A-Za-z0-9'’\-]*/g;
  let wSeen = 0;
  sents.forEach(sent => {
    const clauses = sent.match(/[^,;:—–]+[,;:—–]?/g) || [sent];
    clauses.forEach(cl => {
      const t = cl.trim();
      if (!t || !/[A-Za-z0-9]/.test(t)) return;
      const endSent = /[.!?]["'”’)]*$/.test(t);
      const endClause = /[,;:—–]$/.test(t);
      const words = t.match(WRE) || [];
      const say = t.replace(WRE, (w) => grSayNumber(w));       // 數字換成唸得出來的寫法
      out.push({ t, say, pause: endSent ? 420 : endClause ? 230 : 130, w0: wSeen, wn: words.length });
      wSeen += words.length;
    });
  });
  if (out.length) out[out.length - 1].pause = 0;
  return out;
}
/* 這一塊裡、字元位置 charIndex 之前有幾個「完整唸過」的字（給逐字高亮用） */
function grWordsBefore(t, charIndex) {
  const s = String(t || '').slice(0, Math.max(0, charIndex || 0));
  return (s.match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length;
}

// v293: 逐句朗讀（瀏覽器語音）——句子之間留自然停頓、語速放慢，比一口氣唸完自然得多。
// 回傳 stop() 讓呼叫端中止；朗讀完（或被中止）呼叫 onDone。全站同時只跑一個朗讀
// （_activeSpeak）——連點單字／附註／整段不會兩段聲音疊在一起。
let _activeSpeak = null;
// v301: onProgress(fraction 0~1)——朗讀到哪個字，回報進度（給「逐字亮起來」用）
function speakSentences(text, { rate = 0.82, lang = 'en-US', onDone, onProgress, onWord } = {}) {
  const synth = window.speechSynthesis;
  const chunks = grSpeechChunks(text);
  if (_activeSpeak) { try { _activeSpeak(); } catch (e) {} }
  _activeSpeak = null;
  if (!synth || !chunks.length) { if (onDone) onDone(); return () => {}; }
  try { synth.cancel(); } catch (e) {}
  const totalChars = chunks.reduce((n, c) => n + c.t.length, 0) || 1;
  const before = []; let acc = 0; chunks.forEach(c => { before.push(acc); acc += c.t.length; });
  const totalWords = chunks.reduce((n, c) => n + (c.wn || 0), 0);   // v453：逐字高亮改用「第幾個字」
  let i = 0, stopped = false, done = false;
  // v306+: iOS/iPadOS WebKit 幾乎不觸發 onboundary → 逐字亮起來會整段不動。用估時 timer 當後備推進；
  // 只要真的收到一次 onboundary（boundarySeen=true），就讓真實邊界接手，timer 立刻退讓。
  let boundarySeen = false, tick = null;
  const clearTick = () => { if (tick) { clearInterval(tick); tick = null; } };
  const report = (f) => { if (onProgress) { try { onProgress(Math.max(0, Math.min(1, f))); } catch (e) {} } };
  /* v453（Alan：「螢光完全沒有跟著語速」）：把「唸到第幾個字」直接報出去。
     以前只報整段的字元比例，呼叫端再用加權字數反推 → 一路累積誤差；
     現在用 onboundary 給的字元位置換算成這一塊裡的第幾個字，是精準的。 */
  const reportWord = (i2) => { if (onWord && totalWords) { try { onWord(Math.max(0, Math.min(totalWords - 1, i2))); } catch (e) {} } };
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
    const u = new SpeechSynthesisUtterance(c.say || c.t);      // v453：數字唸成年份／逐位數
    u.lang = lang; u.rate = rate; u.pitch = 1;
    if (v) u.voice = v;
    if (onProgress || onWord) u.onboundary = (e) => {
      boundarySeen = true;
      report((before[idx] + (e.charIndex || 0)) / totalChars);
      // say 與 t 的「字數」一樣（一個 token 換一個詞組），所以數 say 裡的字就等於數 t 裡的字
      reportWord((c.w0 || 0) + Math.min((c.wn || 1) - 1, grWordsBefore(c.say || c.t, e.charIndex || 0)));
    };
    u.onend = () => {
      clearTick(); report((before[idx] + c.t.length) / totalChars);
      reportWord((c.w0 || 0) + (c.wn || 1) - 1);
      i += 1; if (!stopped) setTimeout(step, c.pause);
    };
    u.onerror = () => { clearTick(); i += 1; if (!stopped) setTimeout(step, c.pause); };
    try { synth.resume(); } catch (e) {}
    synth.speak(u);
    // 估時後備：onboundary 沒動時，用約 14 字/秒（隨 rate 調整）在本段內線性推進，
    // 上限剛好是本段結尾 (before[idx]+c.t.length)/totalChars，永遠不會超過。
    if (onProgress || onWord) {
      clearTick();
      const startT = Date.now();
      const estMs = Math.max(1, (c.t.length / (14 * rate)) * 1000);
      tick = setInterval(() => {
        if (stopped || boundarySeen) return;
        const frac = Math.min(1, (Date.now() - startT) / estMs);
        report((before[idx] + frac * c.t.length) / totalChars);
        // iOS 幾乎不給 onboundary → 在這一塊裡依時間平均推進（只在塊內估，不會整段漂掉）
        reportWord((c.w0 || 0) + Math.min((c.wn || 1) - 1, Math.floor(frac * (c.wn || 1))));
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
    // v511：他當下選的那一個（針對性出題就是靠這個看出「錯的方向」）
    if (typeof q._picked === 'number' && (q.options || [])[q._picked] != null) {
      o.picked = String(q.options[q._picked]).slice(0, 120);
    }
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
      mx:     d.mx     || {},          // v431：吉祥物裝扮（買到什麼、身上穿什麼）
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

/* ══════════════════════════════════════════════════════════════════════════
   v468：康橋單字考卷的第 1 大題——「字義選擇題」
   ──────────────────────────────────────────────────────────────────────────
   Alan 2026-10-06 給的 G3/G4 考卷，Section I 的 A 一定是這一種（10%、5 題）：
     · 第 1 題：給一個句子 →「Which definition matches how **shade** is used in the sentence?」
     · 第 2~5 題：先一段 3~4 句的短文（有小標題），文中把目標字粗體 →
       「Based on the passage above, what does **soaring** mean?」
     · 四個選項**全部都是定義**，干擾項是**這個字的其他語意**
       （shade：A 有點暗的顏色／B 躲太陽的涼爽地方／C 燈罩／D 把玩具藏起來）

   ⚠⚠ 這跟現有的「配對連線」**不是同一件事**：
     配對是「字 ↔ 它的定義」，這一種是「同一個字的好幾個語意裡，挑出在這個語境用的那一個」。
     干擾項如果換成別的單字的定義，就變回配對題了，考點整個不見。
   ══════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   v482 📘 一鍵出 Word Study（Alan 2026-10-07 給了康橋課本第 5~13 頁）
   ──────────────────────────────────────────────────────────────────────────
   康橋每一課都有 Word Study，主題每次不同（VCe 音節、後綴 -ty/-ity/-ic/-ment、
   母音組合 ai/ay/ea/ee…），但**題型永遠是那幾種**：
     ① 從一張字表裡圈出符合規則的字（p5）
     ② 把字分到子類（long a / long i…、-ty / -ity / -ic / -ment、ai / ay / ea…）（p8、p12）
     ③ 四選一「哪個字符合規則」（p7、p13）
     ④ 看定義寫出加了後綴的字（p8）／base word ↔ word with suffix 對照（p9）
     ⑤ 讀一篇短文，把符合規則的字找出來（Alan 自己出的那一張）

   ⭐ 這個題型跟文法最大的不同：**答案程式驗得出來**。
     「impose 是不是 VCe」「enjoyment 是不是 -ment」「meadow 有沒有 ea」
     都是拼字規則，不需要靠 AI 的判斷。所以這裡的把關比文法那邊硬得多——
     AI 只負責想題材（挑哪些字、寫短文），**是非對錯一律程式說了算**。
   ══════════════════════════════════════════════════════════════════════════ */

/* 規則檢查器。AI 回傳 check:{kind, arg}，程式自己判每個字符不符合。
   判不出來的（kind 不認得）就整份退回——寧可不出，也不要出錯的答案。 */
const WS_FALSE_PREFIX = new Set(('enemy enemies energy energetic empty emptied engine engines english enough enter entered entering '
  + 'entire entirely entrance entry entries envelope environment enormous ensure embassy ember emerald emergency emotion emotions end ends ended ending endless employ employee employer employed '
  + 'emperor empire empress emphasis miss missed misses missing mission missions missile mist misty mister mistress '
  + 'mice mile miles milk mill million mind mine mint minute minus mirror').split(' '));
/* ══ v564 真正的字首／字尾：拿掉之後，剩下的要是一個真的英文字（Alan：「要是真正的 prefix」）══════
   只看開頭字母一樣是不夠的：en+emy 不是 enemy 的拆法、en+ergy 也不是、em+pty 更不是。
   v559 我用「例外字清單」擋，那是補丁——列不完（entire？employ？）。
   → 現在用英文字表（data-words.js，約 3.8 萬個常用字）判斷：
       字首：en- ＋ large ✓（enlarge）／en- ＋ emy ✗（enemy）／mis- ＋ place ✓（misplace）
       字尾（只管「加在原來那個字後面」的變化：-s -es -ed -ing -er -est -ly）：
            run ＋ ning 要認得 runn → run、hope ＋ d → hop+e、happy ＋ ness → happi → happy
            ⚠ -ity／-ty／-ic／-ment 這種會改字形的衍生字尾（able → ability）**不**用字典擋，維持原本的規則——
              擋的話真的對的字會被判錯，比放過一個假朋友傷害大。
   ⚠ 字表還沒載入（網路慢）時退回舊規則（開頭一樣＋例外清單），所以交卷前會先等它載入（examLoadDict）。 */
const _EN_INFLECT = ['s', 'es', 'ed', 'd', 'ing', 'er', 'est', 'ly'];
/* 前面那塊至少要幾個字母——-d／-er／-est／-ly 的假朋友特別多（be+d、on+ly、for+est、und+er），要求 3 個字母以上 */
/* 字典也擋不掉的「剛好前面是個字」的假朋友（paper＝pap+er、forest＝for+est、morning＝morn+ing…）。
   這份列的是常見的；不在這裡的少數假朋友仍可能漏過——老師看得到結果，可以手改分數。 */
const WS_FALSE_SUFFIX = new Set(('paper forest number dinner butter letter hammer finger corner winter summer sister monster poster '
  + 'morning evening spring string during ceiling darling pudding wedding this his was has yes bus gas always across early '
  + 'only family jelly belly hundred sacred naked wicked').split(' '));
const _EN_MIN_BASE = { s: 2, es: 2, ed: 2, ing: 2, d: 3, er: 3, est: 3, ly: 3 };
function _enReady() { return typeof window !== 'undefined' && !!window.EN_DICT; }
function _enHas(w) { return _enReady() && window.EN_DICT.has(w); }
/* 一個「加了字尾之前的樣子」是不是真的字：原樣、+e、i→y、重複字母還原 */
function _enBaseOk(b, minLen) {
  if (!b || b.length < (minLen || 2)) return false;
  if (_enHas(b)) return true;
  /* hop+ed→hope（丟掉 e）：前面要 ≥3 個字母，否則 th+e＝the（thing）、se+e＝see（seed）會被當成真的拆法；
     唯一的短例外 us→use（using） */
  if ((b.length >= 3 || b === 'us') && _enHas(b + 'e')) return true;
  if (/i$/.test(b) && _enHas(b.slice(0, -1) + 'y')) return true;      // happi → happy
  if (/ie$/.test(b) && b.length > 3 && _enHas(b.slice(0, -2) + 'y')) return true;   // citie（cities）→ city
  if (/([a-z])\1$/.test(b) && _enHas(b.slice(0, -1))) return true;
  return false;
}
/* 字首後面剩下的那一塊是不是真的字（本身，或它再加了常見變化：couraged → courage） */
function _enRealRest(r) {
  if (!r || r.length < 3) return false;
  if (_enHas(r)) return true;
  return _EN_INFLECT.some(sf => r.length > sf.length + 2 && r.endsWith(sf) && _enBaseOk(r.slice(0, -sf.length), _EN_MIN_BASE[sf]));
}
const WS_CHECKS = {
  /* VCe：母音-子音-e 結尾，而且那個母音前面不能再有母音
     （pause 的 au 是母音組合，不是 VCe；tissue 的 ue 也不是）。
     ⚠ w/x/y 不算這裡的子音（owe、axe、eye 都不是課本要的那種）。 */
  vce: (w) => /[^aeiou][aeiou][^aeiouwxy]e$/i.test(String(w || '').trim()),
  // 後綴：-ty / -ity / -ic / -ment / -ful / -less…
  suffix: (w, arg) => {
    const a = String(arg || '').replace(/^-/, '').toLowerCase();
    const x = String(w || '').trim().toLowerCase();
    if (!(!!a && x.length > a.length && x.endsWith(a))) return false;
    /* v564：只有「加在原來那個字後面」的變化字尾才要求前面是真的字（ring ≠ r+ing、king ≠ k+ing） */
    if (_enReady() && _EN_INFLECT.indexOf(a) >= 0) return !WS_FALSE_SUFFIX.has(x) && _enBaseOk(x.slice(0, -a.length), _EN_MIN_BASE[a]);
    return true;
  },
  // 字首：un- / re- / pre-…
  prefix: (w, arg) => {
    const a = String(arg || '').replace(/-$/, '').toLowerCase();
    const x = String(w || '').trim().toLowerCase();
    /* v559：只看開頭字母會把 enemy／energy／empty／mission 都當成有字首——
       它們只是剛好開頭一樣，不是「字首＋字根」。常見的假朋友列在這裡。 */
    if (WS_FALSE_PREFIX.has(x)) return false;
    if (!(!!a && x.length > a.length && x.startsWith(a))) return false;
    /* v564：拿掉字首，剩下的要是真的字（en+large ✓、en+emy ✗）。字表還沒載入就維持上面的舊規則。 */
    if (_enReady()) return _enRealRest(x.slice(a.length));
    return true;
  },
  // 母音組合／雙字母：ai / ay / ea / ee / ei / ie / oa / ue / aw / oo…
  team: (w, arg) => {
    const a = String(arg || '').toLowerCase();
    /* v582：考卷只寫「a vowel team inside」、沒列是哪幾種（康橋 G4 Formative 2）→ 用常見的母音組合。 */
    if (!a) return /(ai|ay|ea|ee|ie|oa|oe|ue|ui|oo|ou|ow|oi|oy|au|aw|ew)/.test(String(w || '').toLowerCase());
    return String(w || '').toLowerCase().indexOf(a) >= 0;
  },
  // 子音連綴／雙字母子音：ch / sh / th / ph / ck…（位置不限）；沒列是哪幾種 → 常見的子音雙字母
  digraph: (w, arg) => String(arg || '').trim()
    ? WS_CHECKS.team(w, arg)
    : /(ch|sh|th|ph|wh|ck|ng|kn|wr)/.test(String(w || '').toLowerCase()),
  /* v571 雙母音 diphthong（康橋 G3：圈出 /aʊ/ 或 /ɔɪ/ 的字）——看**讀音**，不是只看拼法。
     /aʊ/：ou（shout、sound）、ow（brown、down、flower）——兩種拼法同一個音。
     ⚠ ou 不唸 /aʊ/：could／you／young／country／touch／-ous／-ough…；
       ow 唸 /oʊ/（snow、know、grow、yellow、window…）也不是 /aʊ/，要另外用 arg「ow:long」才算。
     /ɔɪ/：oi／oy。沒給 arg ＝ ou ow oi oy（/aʊ/ 與 /ɔɪ/）。 */
  diphthong: (w, arg) => {
    const x = String(w || '').trim().toLowerCase();
    if (!/^[a-z'-]{2,}$/.test(x)) return false;
    const a = String(arg || '').toLowerCase();
    const long = /ow:long|oʊ/.test(a);
    const pats = long ? ['ow:long'] : (a ? [a] : ['ou', 'ow', 'oi', 'oy']);
    return pats.some(p => {
      if (p === 'ow:long') return /ow/.test(x) && WS_OW_LONG.test(x);
      if (x.indexOf(p) < 0) return false;
      if (p === 'ow') return !WS_OW_LONG.test(x);
      if (p === 'ou') {
        if (WS_NOT_OU.test(x)) return false;
        if (/ous(ly|ness)?$/.test(x)) return false;
        if (/ough/.test(x) && !/^(bough|boughs|plough|ploughs|drought|droughts)$/.test(x)) return false;
        return true;
      }
      if (p === 'oi') return !/^(choir|choirs|tortoise|tortoises|porpoise|porpoises)$/.test(x);
      return true;
    });
  },
};
/* ow 唸 /oʊ/（長 o）的常見字——這些不算 /aʊ/。 */
const WS_OW_LONG = /^(snow\w*|know\w*|known|grow\w*|grown|blow\w*|(?:flow|flows|flowed|flowing)|low|lower|lowest|slow\w*|(?:show|shows|showed|shown|showing)|throw\w*|thrown|own\w*|bowl\w*|yellow\w*|window\w*|pillow\w*|follow\w*|tomorrow|borrow\w*|narrow|shadow\w*|arrow\w*|elbow\w*|rainbow\w*|below|crow|crows|glow\w*|mow|mowed|sow|swallow\w*|sparrow\w*|willow\w*|marshmallow\w*|scarecrow\w*|row|rows|bow|bows|tow|towed|stow|stowed|mellow|fellow|hollow|widow|minnow|winnow|bungalow|gallows|rowboat|snowman|snowmen|owe|owed|owes|owing|owner\w*)$/;
const WS_NOT_OU = /^(could|would|should|couldn't|wouldn't|shouldn't|you|your|yours|youth|young|younger|youngest|country|countries|couple|cousin|touch|touched|touches|double|trouble|troubled|soul|souls|shoulder|shoulders|four|pour|poured|court|courts|course|courses|source|route|routes|group|groups|soup|soups|through|coupon|wound|rough|tough|enough|famous)$/;
/* 🔴 v484：一課可以有**好幾個** pattern——康橋的 Word Study 本來就是
   「Suffixes -ty, -ity, -ic, -ment」「Vowel Teams ai, ay, ea, ee, oa」這種。
   v482 我逼 AI「只能挑一個」，結果：
     · 後綴那課只認 -ment → ability／basic／economic 全被當成「不符合」
     · 母音那課只認 ai → 題目問「ea」但程式照 ai 算答案 → **出了錯的正解**
   所以 check 改成帶一串 args，符合其中**任何一個**就算。 */
function _wsArgs(check) {
  const a = (check && (Array.isArray(check.args) ? check.args : [check.arg])) || [];
  return a.map(x => String(x || '').trim()).filter(Boolean);
}
/* one＝只比這一個 pattern（分籃、題目指名某一個時用）；不給就是「任何一個都算」 */
function wsCheck(word, check, one) {
  const fn = WS_CHECKS[String((check && check.kind) || '').toLowerCase()];
  if (!fn) return null;                                 // null＝這條規則程式不會判
  if (one) return !!fn(word, one);
  const args = _wsArgs(check);
  if (!args.length) return !!fn(word, '');              // vce 這種不需要參數
  return args.some(a => fn(word, a));
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

/* v445（Alan：「只抽五個單字填空，但 word bank 還是全部單字，這樣才有難度」）
   文章照樣每個字都挖（產生與驗證完全不變），最後只留 n 格、其他還原成原本的字。
   平均分散著留，不然五格會全擠在前面。 */
/* ══ v542 🔢 一次練習最多幾題 ══════════════════════════════════════
   Alan（合併 24 個單字之後）：
     「字義選擇不可能一次的練習就 24 題，這樣也太久，小孩會沒耐心」
     「短文填空肯定要多幾篇啊」
   ⭐⭐ 這是**程式的工作，不是 AI 的**。他已經在「這次的特別要求」裡叫 AI
     拆成三篇／三大題，AI 做不到——跟 v417／v488 同一類：
     程式自己會做的事叫模型做，它為了服從會亂回報。
     所以 AI 只負責「生足夠的題材」，切成幾份由程式決定。 */
/* ══ v549 答對之後換下一題的速度 ═══════════════════════════════════
   Alan：「學習模式答對換下一題速度快一點，如果現在是 10 分，幫我快一點變成 12 分；
          測驗模式、字義也都是，加快」＝**快 20%**＝等待時間 ÷ 1.2。
   ⭐ 倍率只放這一份：單字卡（學習／測驗）與所有測驗（含字義選擇）都走 autoNextMs，
     以後再覺得快或慢，改這一個數字就全站一起動。
   ⚠ 只縮「答對之後自動跳」的等待；答錯停在原地等學生自己按，那個不動。 */
/* v602：Alan 又說「現在如果是 10 分，幫我增加到 13 分」＝以**現在這個速度**為 10，再快 30%＝等待時間再 ÷ 1.3。
   累計：v549 的 1.2 × 1.3 ＝ 1.56（相對 v549 以前的速度）。同樣只改這一個數字。 */
const AUTO_NEXT_SPEED = 1.56;
function autoNextMs(ms) { return Math.max(200, Math.round(Number(ms) / AUTO_NEXT_SPEED)); }
function qsStripPart(title) {
  return String(title || '').replace(/\s*[（(]\s*\d+\s*\/\s*\d+\s*[)）]\s*$/, '').trim();
}

function _aiStripFence(t) {
  const s = String(t || '').trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : s).trim();
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
/* v458：多一段退避（本來 3 段＝3 次機會）。實測代理會間歇性回 403，
   量過 30 發有 10 發被擋（約 1/3），3 次機會還是會漏掉約 3.6%；4 次就降到 1.2%。 */
const _AI_BACKOFF = [400, 1200, 3000, 6000];
/* 🔴 v483：2026-10-08 終於查出 403 的真正原因——**跟機房有關，不是跟時間有關**。
   直接打代理 12 次，cf-ray 的機房代碼與結果 100% 對應：
     NRT（東京）→ 400 ＋ 有 request_id ＝ 真的送到 Anthropic
     HKG（香港）→ 403、沒有 request_id ＝ 根本沒出得去
   Cloudflare Worker 在哪個機房執行，它對外的 fetch 就從那裡出去 →
   **在香港重試幾次都一樣**（Worker 內那 4 次重試對這個狀況完全沒用）。
   台灣的流量本來就常被導到香港，所以老師與學生會常常踩到。
   ⚠ v458b 我猜「沒帶 user-agent 被當成機器人」——**那個猜測是錯的**，跟 UA 無關。
   ⚠ 2026-10-08 開了 Cloudflare Smart Placement 也沒有改善（量過兩輪，被擋比例還是 1/3~1/2）。

   真正有機會換到別的機房的，是**網站重新發一次請求**。
   ⚠⚠ 但那不是「八次獨立抽籤」——anycast 的路由在短時間內是穩定的：
     · 同時打 12 發（間隔 150ms）→ 全部落在同一個機房，成功 0/12
     · 間隔 6 秒單發 → HKG、HKG、TPE，第三發就換到台北了
   所以 403 的重試**要把間隔拉開**才有意義，一直用 150ms 連打是白打。
   代價只落在「倒楣的那一發」身上（第一次就成功的完全不受影響）。 */
const _AI_403_TRIES = 8;
const _AI_403_WAIT = [250, 700, 1600, 3000, 5000, 7000, 9000];   // 第 1~7 次失敗後各等多久
const _aiSleep = (ms) => new Promise(r => setTimeout(r, ms));
/* 只有「連線／逾時例外」或「403 / 429 / 500 / 529」才值得等一下再試；
   400 那種是我們自己的格式錯誤，等再久也一樣，直接進下一輪。
   ⚠ v458（2026-09-28 01:30 實測）：403「Request not allowed」是**間歇性**的——
   同一秒內連打，有的 200 有的 403，403 只花 0.17 秒就回來（根本沒到模型那邊），
   帶不帶瀏覽器標頭都一樣（9~10/15 成功）。所以它不是「金鑰壞了」而是「這一發被擋」，
   等一下再送就會過 → 一定要重試，不然老師會隨機看到「AI 產生失敗」。 */
function _aiShouldBackoff(status) { return status === 403 || status === 429 || status === 500 || status === 529; }

/* _aiAsk：全站 AI 呼叫的單一入口（逾時＋退避重試都在這裡）。
   pick(json) 把回傳整理成呼叫端要的東西；回 null／undefined 或丟例外
   就當「這一發沒中」，換下一輪（格式錯誤不等待，直接重打）。
   三次都沒中才丟錯，錯誤物件上帶 .timeout 讓 UI 能給不同文案。 */
/* v449（Alan：「分段閱讀沒辦法 AI 生成背景知識以及題目」）
   實測那天 AI 供應商對所有請求回 403 {"error":{"type":"forbidden","message":"Request not allowed"}}
   ——網站每一個 AI 功能都不通，畫面上卻只寫「產生失敗」，看起來像是這一篇文章的問題。
   ⚠ 這裡把「上游到底回了什麼」記下來，往上丟，讓老師一眼看出是 AI 服務不通還是內容不合格。 */
let _aiLastUpstream = null;              // { status, type, message, at }
function _aiUpstreamNote(e) {
  // 只認「這次的」或「兩分鐘內剛發生的」——不然幾小時前的一次失敗會被拿來誤導老師
  const fresh = _aiLastUpstream && (Date.now() - (_aiLastUpstream.at || 0) < 120000) ? _aiLastUpstream : null;
  const u = (e && e.upstream) || fresh;
  if (!u || !u.status) return '';
  /* ⚠ 實測 2026-09-15 晚上：403 也可能只是「暫時被擋」——那一晚全站 AI 都 403，
     隔天早上什麼都沒改就自己好了。所以 403 先請老師等幾分鐘，不要一開口就叫他去換金鑰。 */
  const zh = u.status === 403 ? '代理間歇性擋掉請求（網站已經自動重試 4 次還是沒過）——再按一次通常就會成功；一直這樣就要看 Cloudflare Worker 的程式與 Anthropic 額度'
    : u.status === 401 ? '金鑰不正確（Worker 的 API 金鑰要重設）'
    : u.status === 429 ? '請求太密集（等一下再試）'
    : (u.status >= 500 ? 'AI 服務暫時出問題（等一下再試）' : '');
  return `\n\n⚠ 這不是你的內容有問題：AI 服務回了 ${u.status}${u.message ? '「' + u.message + '」' : ''}${zh ? ' ＝ ' + zh : ''}。` +
         '\n（網站所有 AI 功能都會一起不通——一鍵出單字／文法／閱讀理解也是。）';
}
function _aiNoteUpstream(status, data) {
  const err = (data && data.error) || {};
  _aiLastUpstream = { status, type: err.type || '', message: String(err.message || '').slice(0, 120), at: Date.now() };
  return _aiLastUpstream;
}
/* ══ v458（Alan：「有時候晚上不能用」）═══════════════════════════════════
   2026-09-28 01:20~01:40 實測代理：單發大多 200（0.7 秒），但會**間歇性**回 403
   「Request not allowed」，而且 0.17 秒就回來＝根本沒送到模型。
   量出來的重點：
     · 30 發裡有 10 發被擋（約 1/3），帶不帶瀏覽器標頭都一樣 → 網站本身也會中。
     · **打得愈兇擋得愈兇**：連續打了約 150 發之後，有一小段時間幾乎全擋（12 發全失敗）；
       停 45 秒再打就恢復成 6 發 5 中。
   結論：這是「量」觸發的保護，不是金鑰壞掉。網站能做的兩件事：
     ① 被擋就重試（短間隔，見 _aiShouldBackoff）
     ② **主動把量壓下來**：全站同時最多 4 個請求，而且一看到 403 就先冷卻一下再送。
        一鍵生成本來會一口氣丟 6~10 個請求出去，正是最容易踩到的情境。 */
const _AI_MAX_INFLIGHT = 4;
let _aiInflight = 0, _aiCoolUntil = 0;
async function _aiGate() {
  for (;;) {
    const now = Date.now();
    if (now < _aiCoolUntil) { await _aiSleep(_aiCoolUntil - now + Math.floor(Math.random() * 140)); continue; }
    if (_aiInflight < _AI_MAX_INFLIGHT) { _aiInflight++; return; }
    await _aiSleep(60 + Math.floor(Math.random() * 90));
  }
}
function _aiRelease() { if (_aiInflight > 0) _aiInflight--; }

async function _aiAsk(body, pick, timeoutMs) {
  let timedOut = false, upstream = null;
  /* v483：一般的失敗照原本 4 次；**只要遇到 403 就把次數加到 8**
     ——那是「這一發落在被擋的機房」，換一次連線就有機會過，而且失敗只要 0.17 秒。 */
  let max = _AI_BACKOFF.length;
  for (let attempt = 0; attempt < max; attempt++) {
    let wait = false;
    await _aiGate();                                    // v458：全站同時最多 4 個請求
    try {
      const res = await fetchT(AI_WRITING_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }, timeoutMs || 60000);
      try {
        const data = await res.json();
        if (!res.ok || (data && data.error)) upstream = _aiNoteUpstream(res.status, data);
        const got = pick(data);
        if (got != null) { _aiLastUpstream = null; return got; }   // finally 會把名額還回去
      } catch (e) { if (!res.ok) upstream = _aiNoteUpstream(res.status, null); }
      // v458：被擋了就讓「所有」還沒送出去的請求也跟著等一下，不要一起撞上去
      if (res.status === 403) { _aiCoolUntil = Math.max(_aiCoolUntil, Date.now() + 900); max = _AI_403_TRIES; }
      wait = !res.ok && _aiShouldBackoff(res.status);   // 403/429/500/529 值得等
    } catch (e) {
      if (e && e.name === 'AbortError') timedOut = true;
      wait = true;                                      // 連線失敗／逾時 → 退避後再試
    } finally { _aiRelease(); }
    if (wait && attempt < max - 1) {
      /* v458：403 是「這一發被擋」，0.17 秒就回來、根本沒送到模型——
         等 3 秒沒有意義（測過同一秒內重送就會過），等太久反而讓一鍵生成整組變慢。
         429／5xx 才是真的塞車，照原本的階梯等。 */
      const quick = upstream && upstream.status === 403;
      /* v483：403 的間隔要**愈等愈久**——不是為了讓對方喘口氣，
         是為了讓 anycast 有機會把下一發送到別的機房（量過：150ms 連打永遠同一個機房）。 */
      await _aiSleep(quick
        ? _AI_403_WAIT[Math.min(attempt, _AI_403_WAIT.length - 1)] + Math.floor(Math.random() * 250)
        : _AI_BACKOFF[Math.min(attempt, _AI_BACKOFF.length - 1)] + Math.floor(Math.random() * 300));
    }
  }
  const err = new Error((timedOut
    ? 'AI 太久沒有回應，請再試一次。'
    : (upstream && upstream.status
        ? `AI 服務拒絕了這次請求（${upstream.status}${upstream.message ? '：' + upstream.message : ''}）。`
        : 'AI 出題失敗（回傳格式看不懂），請再試一次。')) + (upstream ? _aiUpstreamNote({ upstream }) : ''));
  err.timeout = timedOut;
  err.upstream = upstream;
  throw err;
}

/* ══════════════════════════════════════════════════════════════════════════
   v428：✏️ 出文法——老師上傳作業照片／貼文字 → 簡單互動教學 → 選擇＋填空＋中翻英
   ──────────────────────────────────────────────────────────────────────────
   Alan：「我會上傳老師的作業圖片檔 或是文字 老師的圖片或是文字主要就是分成教學 notes
          再來就是題目…我希望一開始有簡單教學 越簡單越好不要複雜 一定要是互動式的學習
          可以跟學生有互動的，學習完成才開始正式練習題目測驗，可以包含選擇題，填空題，
          以及中翻英」
   ① aiReadGrammarSheet：看照片（Claude 看圖）＋貼的文字 → 教學重點＋老師原本的題目
   ② aiMakeGrammarPack：依教學重點出「互動教學步驟」＋三種題目（老師的題目優先收進去）
   ⚠ 沿用 v382 的教訓：AI 產出一律程式驗，驗不過的丟掉或重出，絕不整批信任。
   ══════════════════════════════════════════════════════════════════════════ */
const GN_MODEL = 'claude-haiku-4-5';

// v430：選項本身就是完整句子（「選出正確的句子」）→ 題目只要一句 Choose the correct answer.
//       Alan：「應該問題只要顯示Choose the correct answer就好了吧？ 不然太亂了」
//       ⚠ 有空格的題目、選項是單字的題目（Which word is a noun? "Luna is a smart cat."）不動。
function gnCleanStem(q, options) {
  const s = String(q || '').trim();
  const opts = (options || []).map(o => String(o).trim()).filter(Boolean);
  if (!s || /_{3,}/.test(s) || opts.length < 2) return s;
  const long = opts.filter(o => o.split(/\s+/).length >= 3);
  const inStem = long.filter(o => s.toLowerCase().indexOf(o.toLowerCase().replace(/[.!?]+$/, '')) >= 0).length;
  if (long.length === opts.length || inStem >= 2 || /(^|\s)[(（]?[A-D][)）.．]\s+\S/.test(s) && /(^|\s)[(（]?B[)）.．]\s/.test(s)) {
    return 'Choose the correct answer.';
  }
  return s;
}

/* ── 學生答案比對：不分大小寫、標點，縮寫當作一樣（isn't = is not），另外收老師／AI 給的其他正確說法 ── */
const _GN_CONTRACT = [
  [/\bcan't\b/g, 'cannot'], [/\bcan not\b/g, 'cannot'], [/\bwon't\b/g, 'will not'], [/\bshan't\b/g, 'shall not'],
  [/\b(is|are|was|were|do|does|did|has|have|had|would|should|could|must)n't\b/g, '$1 not'],
  [/\bcant\b/g, 'cannot'], [/\bwont\b/g, 'will not'],
  [/\b(is|are|was|were|do|does|did|has|have|had)nt\b/g, '$1 not'],
  [/\bim\b/g, 'i am'], [/\b(there|that|what|where)s\b/g, '$1 is'],
  [/\bi'm\b/g, 'i am'], [/\b(you|we|they)'re\b/g, '$1 are'], [/\b(he|she|it|there|that|what|who|where|here)'s\b/g, '$1 is'],
  [/\b(i|you|we|they)'ve\b/g, '$1 have'], [/\b(i|you|he|she|it|we|they)'ll\b/g, '$1 will'], [/\b(i|you|he|she|it|we|they)'d\b/g, '$1 would'],
];
// opts.caseSensitive：v429——教「專有名詞／大寫」的單元，大小寫就是考點，不能忽略
function gnNorm(s, opts) {
  let t = String(s || '').replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"');
  if (!(opts && opts.caseSensitive)) {
    t = t.toLowerCase();
    _GN_CONTRACT.forEach(([re, to]) => { t = t.replace(re, to); });
  }
  return t.replace(/[.,!?;:"()\[\]…。，！？；：、]/g, ' ').replace(/\s+/g, ' ').trim();
}
function gnAnswerOk(user, answer, accept, opts) {
  const u = gnNorm(user, opts);
  if (!u) return false;
  return [answer].concat(Array.isArray(accept) ? accept : []).some(a => a && gnNorm(a, opts) === u);
}

/* ── 中翻英：程式比對不過時，請 AI 判斷「意思對、文法對」的其他說法（只在答錯時才問，平常不花時間）── */
async function aiJudgeTranslation({ zh, answer, user, topic = '' } = {}) {
  const sys = `You check a Taiwanese elementary student's Chinese-to-English translation.
Target grammar point: ${topic || '(see the model answer)'}.
Say ok:true ONLY if the student's English is grammatically correct, means the same as the Chinese,
AND uses the target grammar point correctly. Ignore capital letters and final punctuation.
A spelling mistake or a wrong word form is NOT ok.
Output ONLY JSON: {"ok":true|false,"tip":"繁體中文，30 字以內。不對：只講一個要改的地方；對：一句稱讚"}`;
  try {
    return await _aiAsk(
      { model: GN_MODEL, max_tokens: 120, system: sys,
        messages: [{ role: 'user', content: `Chinese: ${zh}\nModel answer: ${answer}\nStudent: ${user}` }] },
      (data) => {
        const o = JSON.parse(_aiStripFence(data?.content?.[0]?.text || ''));
        if (!o || typeof o.ok !== 'boolean') return null;
        // 模型偶爾會把欄位說明抄進來（實測出現過「Traditional Chinese: …」）
        const tip = String(o.tip || '').replace(/^\s*(traditional chinese|繁體中文|繁中)\s*[:：]\s*/i, '').trim();
        return { ok: o.ok, tip: tip.slice(0, 60) };
      }, 12000);
  } catch (e) { return null; }       // 判不出來＝照程式的結果（算錯），不讓學生卡住
}

/* v436：AI 生成的中文偶爾會混進簡體字（實測：「人類怎样第一次登上月球？」）。
   這是給台灣小朋友看的，一個簡體字就很突兀。這裡只收「一對一、不會歧義」的常用字，
   像 发（發/髮）、后（後/后）、干（乾/幹）這種一對多的**刻意不放**，寧可漏也不要轉錯。 */
const _ZH_S2T = {
  '们':'們','这':'這','个':'個','来':'來','说':'說','时':'時','过':'過','点':'點','无':'無','还':'還',
  '当':'當','学':'學','习':'習','实':'實','现':'現','见':'見','门':'門','问':'問','题':'題','样':'樣',
  '儿':'兒','马':'馬','与':'與','关':'關','开':'開','觉':'覺','让':'讓','记':'記','认':'認','识':'識',
  '语':'語','话':'話','读':'讀','写':'寫','听':'聽','会':'會','长':'長','东':'東','车':'車','风':'風',
  '飞':'飛','鸟':'鳥','鱼':'魚','岁':'歲','边':'邊','应':'應','该':'該','对':'對','难':'難','爱':'愛',
  '变':'變','电':'電','单':'單','双':'雙','号':'號','图':'圖','团':'團','国':'國','园':'園','场':'場',
  '声':'聲','备':'備','总':'總','经':'經','级':'級','练':'練','结':'結','给':'給','续':'續','线':'線',
  '组':'組','细':'細','织':'織','终':'終','纸':'紙','类':'類','简':'簡','节':'節','药':'藥','视':'視',
  '试':'試','谁':'誰','请':'請','讲':'講','论':'論','计':'計','设':'設','证':'證','词':'詞','译':'譯',
  '谢':'謝','员':'員','质':'質','购':'購','费':'費','资':'資','赛':'賽','转':'轉','输':'輸','运':'運',
  '远':'遠','选':'選','连':'連','进':'進','岛':'島','热':'熱','冷':'冷','乐':'樂','兴':'興','动':'動',
  '带':'帶','帮':'幫','觉':'覺','两':'兩','从':'從','众':'眾','丽':'麗','义':'義','乡':'鄉','书':'書',
  '买':'買','卖':'賣','龙':'龍','鸡':'雞','鸭':'鴨','猫':'貓','树':'樹','叶':'葉',
  '头':'頭','师':'師','医':'醫','观':'觀','间':'間','尔':'爾','军':'軍','农':'農','极':'極','标':'標',
  '检':'檢','验':'驗','显':'顯','传':'傳','统':'統','术':'術','机':'機','权':'權','断':'斷','责':'責',
  '报':'報','战':'戰','历':'歷','独':'獨','环':'環','济':'濟','张':'張','陈':'陳','华':'華','汉':'漢',
  '湾':'灣','丝':'絲','纪':'紀','罗':'羅','鲜':'鮮','鲸':'鯨','龟':'龜','鹅':'鵝','虾':'蝦','鲨':'鯊',
  '态':'態','脑':'腦','气':'氣','汽':'汽','层':'層','养':'養','产':'產','协':'協','丰':'豐','际':'際',
  '亚':'亞','库':'庫','岗':'崗','础':'礎','积':'積','测':'測','确':'確','负':'負',
  '陆':'陸','温':'溫','录':'錄','卫':'衛','严':'嚴','满':'滿','减':'減','灭':'滅','烧':'燒','势':'勢',
  '妈':'媽','爷':'爺','体':'體','举':'舉','达':'達','适':'適','遗':'遺','邻':'鄰','郑':'鄭','处':'處',
  '阳':'陽','阴':'陰','队':'隊','险':'險','静':'靜','龄':'齡','齿':'齒','亿':'億','键':'鍵','银':'銀',
  '铁':'鐵','钟':'鐘','针':'針','铅':'鉛','锁':'鎖','错':'錯','镜':'鏡','钱':'錢','丢':'丟',
  '么':'麼','为':'為','万':'萬','专':'專','业':'業','区':'區','厂':'廠','厅':'廳','县':'縣','叹':'嘆',
  '吗':'嗎','启':'啟','响':'響','圆':'圓','圣':'聖','坏':'壞','块':'塊','坚':'堅','执':'執','墙':'牆',
  '壮':'壯','夺':'奪','奖':'獎','妇':'婦','孙':'孫','宁':'寧','宝':'寶','审':'審','宫':'宮','宽':'寬',
  '尘':'塵','属':'屬','岭':'嶺','币':'幣','帐':'帳','决':'決','况':'況','净':'淨','凤':'鳳','击':'擊',
  '则':'則','刚':'剛','创':'創','剑':'劍','劝':'勸','务':'務','劳':'勞','兰':'蘭','党':'黨','优':'優',
  '价':'價','伟':'偉','伤':'傷','仅':'僅','亲':'親','争':'爭','乌':'烏','糧':'糧','红':'紅','绿':'綠',
  '缩':'縮','网':'網','罚':'罰','肠':'腸','脱':'脫','腾':'騰','艺':'藝','苹':'蘋','营':'營','蓝':'藍',
  '虽':'雖','补':'補','规':'規','览':'覽','训':'訓','议':'議','讯':'訊','诉':'訴','诚':'誠','课':'課',
  '谈':'談','贵':'貴','贴':'貼','赞':'讚','跃':'躍','轮':'輪','软':'軟','违':'違','邮':'郵','释':'釋',
  '铃':'鈴','链':'鏈','锅':'鍋','镇':'鎮','闪':'閃','闭':'閉','闻':'聞','阅':'閱','阶':'階','隐':'隱',
  '雾':'霧','页':'頁','顶':'頂','顺':'順','须':'須','预':'預','领':'領','颗':'顆','飘':'飄','饭':'飯',
  '饮':'飲','饱':'飽','饿':'餓','馆':'館','驾':'駕','骑':'騎','鸣':'鳴','鹰':'鷹','齐':'齊',
};
/* 一對多的字（发/后/干/复/里…）沒辦法逐字轉——先用「詞」對一遍，剩下的再逐字。
   沒對到的就維持原樣（寧可留一個簡體字，也不要轉成錯字）。 */
const _ZH_WORD = [
  ['头发', '頭髮'], ['干净', '乾淨'], ['干燥', '乾燥'], ['干杯', '乾杯'], ['干嘛', '幹嘛'], ['干什么', '幹什麼'],
  ['以后', '以後'], ['然后', '然後'], ['最后', '最後'], ['后来', '後來'], ['后面', '後面'], ['之后', '之後'],
  ['发现', '發現'], ['发生', '發生'], ['发明', '發明'], ['发展', '發展'], ['发出', '發出'], ['出发', '出發'],
  ['复习', '複習'], ['重复', '重複'], ['复杂', '複雜'], ['恢复', '恢復'], ['答复', '答覆'],
  ['里面', '裡面'], ['这里', '這裡'], ['那里', '那裡'], ['哪里', '哪裡'], ['心里', '心裡'], ['家里', '家裡'],
  ['制作', '製作'], ['制造', '製造'], ['只是', '只是'], ['台风', '颱風'], ['卷起', '捲起'],
];
const _zhTW = (t) => {
  let out = String(t == null ? '' : t);
  _ZH_WORD.forEach(([a, b]) => { if (out.indexOf(a) >= 0) out = out.split(a).join(b); });
  return out.replace(/[\u4e00-\u9fff]/g, (c) => _ZH_S2T[c] || c);
};
const _gnCJK = /[一-鿿]/;
const _gnBlank = (t) => String(t || '').replace(/_{2,}|＿{2,}|\(\s*\)|（\s*）/g, '________');
/* ══ v443：互動教學的題型（Alan：「noun 主要是讓小朋友判斷什麼是 noun、從句子中找到、以及分類」）══
   ① tap  ＝ 在句子裡點出目標字（找名詞／找動詞／找大寫）
   ② sort ＝ 把字分到 2-3 個籃子（人／地方／東西、普通名詞／專有名詞）
   ③ fix  ＝ 加上「這個錯誤真的是文法錯嗎」的把關：AI 很愛把 cat 改成 dog（那是喜好不是錯）。 */
const _GN_TOK = (t) => String(t || '').replace(/^[\s"'“”‘’(\[]+|[\s"'“”‘’)\].,!?;:]+$/g, '');
/* 功能詞／介系詞：這些字互換（a↔an、is↔are、in↔on）本來就是文法錯，一律放行 */
const _GN_FIX_FN = new Set(('a an the is are am was were be been do does did done don\'t doesn\'t didn\'t isn\'t aren\'t wasn\'t weren\'t ' +
  'has have had he she it they them him her his hers their theirs this that these those i me my mine we us our ours you your yours ' +
  'in on at to of for from by with under over above below behind near next between into about after before during through ' +
  'much many some any a lot few little more most and but or so because there their they\'re its it\'s who whom whose which what where when why how').split(' '));
/* 不規則變化（單複數／過去式）——字尾規則抓不到，但它們是貨真價實的文法錯 */
const _GN_FIX_IRREG = ('child/children man/men woman/women foot/feet tooth/teeth mouse/mice goose/geese person/people ' +
  'leaf/leaves knife/knives wolf/wolves life/lives shelf/shelves ' +
  'go/went eat/ate see/saw run/ran take/took come/came get/got make/made buy/bought bring/brought think/thought ' +
  'write/wrote give/gave find/found know/knew say/said sit/sat sleep/slept swim/swam teach/taught tell/told ' +
  'good/better good/best bad/worse bad/worst').split(' ').map(x => x.split('/'));
function _gnFixPairOk(wrong, right) {
  const w = String(wrong || '').trim(), r = String(right || '').trim();
  if (!w || !r || w === r) return false;
  const lw = w.toLowerCase(), lr = r.toLowerCase();
  if (lw === lr) return true;                                                     // 只差大小寫＝大寫單元
  if (_GN_FIX_FN.has(lw) && _GN_FIX_FN.has(lr)) return true;
  if (_GN_FIX_IRREG.some(([a, b]) => (a === lw && b === lr) || (a === lr && b === lw))) return true;
  const short = lw.length <= lr.length ? lw : lr, long = lw.length <= lr.length ? lr : lw;
  const tail = (base) => (long.startsWith(base) ? long.slice(base.length) : null);
  const suf = /^(s|es|ed|d|ing|ies|ied|er|est|n't|'s)$/;
  if (suf.test(tail(short) || '')) return true;                                   // walk→walks、play→played
  if (short.length >= 3 && suf.test(tail(short.slice(0, -1)) || '')) return true;  // study→studies、make→making
  if (short.length >= 3 && suf.test(tail(short + short.slice(-1)) || '')) return true; // run→running、big→bigger
  return false;
}
/* v471：哪些步驟是「講解」（沒有對錯，看完就可以往下）。
   ⚠ 這件事會在五個地方被問到（算幾個互動、最後一步不能是講解、
     至少兩個講解兩個互動、學生端可不可以按下一步、按鈕要寫什麼）。
     只留一份，不然加新步驟時一定會漏掉其中一處。 */
const GN_TEACH_KINDS = ['learn', 'timeline', 'forms', 'degree'];
function gnIsTeachStep(st) {
  return !!st && GN_TEACH_KINDS.indexOf(typeof st === 'string' ? st : st.kind) >= 0;
}

function gnValidStep(st) {
  if (!st || typeof st !== 'object') return null;
  if (st.kind === 'learn') {
    const say = _zhTW(st.say).trim();
    const ex = (Array.isArray(st.examples) ? st.examples : []).map(e => {
      const en = String((e && e.en) || '').trim();
      const hl = (Array.isArray(e && e.hl) ? e.hl : []).map(h => String(h).trim()).filter(h => h && en.toLowerCase().indexOf(h.toLowerCase()) >= 0);
      return en ? { en, hl, zh: _zhTW((e && e.zh) || '').trim() } : null;
    }).filter(Boolean).slice(0, 2);
    /* v436：learn 多兩個選用欄位——img＝老師自己放的圖片網址、imgHint＝AI 建議找什麼圖。
       （閱讀的「背景知識」很吃圖：講南極就該看到南極。） */
    const img = String(st.img || '').trim();
    const imgHint = String(st.imgHint || '').trim().slice(0, 60);
    return say && say.length <= 60 && ex.length
      ? Object.assign({ kind: 'learn', say, examples: ex }, img ? { img } : {}, imgHint ? { imgHint } : {})
      : null;
  }
  if (st.kind === 'pick') {
    const opts = (Array.isArray(st.options) ? st.options : []).map(o => String(o).trim()).filter(Boolean);
    let a = st.answer;
    if (typeof a === 'string') a = opts.findIndex(o => o.toLowerCase() === a.trim().toLowerCase());
    const q = _gnBlank(st.q).trim();
    // 選項只差大小寫（taipei／Taipei）也算不同——大寫單元就是在考這個
    const uniq = new Set(opts).size === opts.length;
    return q && opts.length >= 2 && opts.length <= 4 && uniq && Number.isInteger(a) && a >= 0 && a < opts.length
      ? { kind: 'pick', q: _zhTW(q), options: opts.map(_zhTW), answer: a, why: _zhTW(st.why).trim() } : null;
  }
  if (st.kind === 'order') {
    const words = (Array.isArray(st.words) ? st.words : []).map(w => String(w).trim()).filter(Boolean);
    const zh = _zhTW(st.zh).trim();
    return zh && _gnCJK.test(zh) && words.length >= 3 && words.length <= 9 ? { kind: 'order', zh, words } : null;
  }
  if (st.kind === 'tap') {
    // v443：在句子裡點出目標字。答案一定要是句子裡「只出現一次」的完整單字，不然點哪個都對
    const sentence = String(st.sentence || '').trim();
    const toks = sentence.split(/\s+/).map(_GN_TOK).filter(Boolean);
    const ans = (Array.isArray(st.answers) ? st.answers : []).map(a => _GN_TOK(a)).filter(Boolean);
    const uniq = ans.length === new Set(ans.map(a => a.toLowerCase())).size;
    const once = ans.every(a => toks.filter(t => t.toLowerCase() === a.toLowerCase()).length === 1);
    const q = _zhTW(st.q).trim() || '點出句子裡正確的字';
    return sentence && toks.length >= 3 && toks.length <= 14 && ans.length >= 1 && ans.length <= 4 && uniq && once
      ? { kind: 'tap', q, sentence, answers: ans, why: _zhTW(st.why).trim() } : null;
  }
  if (st.kind === 'sort') {
    // v443：把字分到 2-3 個籃子。同一個字只能屬於一個籃子（不然分到哪都算錯）
    const groups = (Array.isArray(st.groups) ? st.groups : []).map(g => {
      const label = _zhTW((g && g.label) || '').trim().slice(0, 8);
      const items = (Array.isArray(g && g.items) ? g.items : []).map(x => String(x).trim()).filter(Boolean).slice(0, 4);
      return label && items.length ? { label, items } : null;
    }).filter(Boolean);
    const all = groups.reduce((a, g) => a.concat(g.items.map(x => x.toLowerCase())), []);
    const labels = groups.map(g => g.label);
    const ok = groups.length >= 2 && groups.length <= 3 && all.length >= 3 && all.length <= 9 &&
      new Set(all).size === all.length && new Set(labels).size === labels.length;
    return ok ? { kind: 'sort', q: _zhTW(st.q).trim() || '把這些字分到正確的地方', groups, why: _zhTW(st.why).trim() } : null;
  }
  /* ══ v471：三種「會動的講解」————————————————————————————————
     它們是「學」的強化版：有動畫示範、小朋友可以點，但**沒有對錯**。
     好處是不會引進新的答案正確性風險（v443／v452 那類坑），
     而且剛好填「每輪 learn + 一個互動」的 learn 那一半。
     ⚠ 雖然沒有對錯，程式還是要驗——講錯的文法比答錯一題更糟。
     ══════════════════════════════════════════════════════════════ */

  /* ⏳ 時態時間軸：同一件事在過去／現在／未來怎麼說 */
  if (st.kind === 'timeline') {
    const ORDER = ['past', 'now', 'future'];
    const pts = (Array.isArray(st.points) ? st.points : []).map(p => {
      const when = String((p && p.when) || '').trim().toLowerCase();
      const en = String((p && p.en) || '').trim();
      if (ORDER.indexOf(when) < 0 || !en) return null;
      const hl = (Array.isArray(p && p.hl) ? p.hl : []).map(h => String(h).trim())
        .filter(h => h && en.toLowerCase().indexOf(h.toLowerCase()) >= 0);
      return { when, en, hl, zh: _zhTW((p && p.zh) || '').trim() };
    }).filter(Boolean);
    // 時間點不能重複，而且一定要照時間排——不信任 AI 給的順序，程式自己排
    const whens = pts.map(p => p.when);
    const uniq = new Set(whens).size === whens.length;
    // 三個時間點講同一句話＝完全沒有示範到「變化」，整步不要
    const ens = pts.map(p => p.en.toLowerCase().replace(/[.!?]+$/, ''));
    const varied = new Set(ens).size === ens.length;
    pts.sort((a, b) => ORDER.indexOf(a.when) - ORDER.indexOf(b.when));
    return pts.length >= 2 && pts.length <= 3 && uniq && varied
      ? { kind: 'timeline', q: _zhTW(st.q).trim() || '同一件事，什麼時候怎麼說', points: pts, why: _zhTW(st.why).trim() } : null;
  }

  /* 🔀 肯定／否定／疑問：同一句話的三種長相 */
  if (st.kind === 'forms') {
    const ORDER = ['affirmative', 'negative', 'question'];
    const fs = (Array.isArray(st.forms) ? st.forms : []).map(f => {
      const type = String((f && f.type) || '').trim().toLowerCase();
      const en = String((f && f.en) || '').trim();
      if (ORDER.indexOf(type) < 0 || !en) return null;
      const hl = (Array.isArray(f && f.hl) ? f.hl : []).map(h => String(h).trim())
        .filter(h => h && en.toLowerCase().indexOf(h.toLowerCase()) >= 0);
      return { type, en, hl, zh: _zhTW((f && f.zh) || '').trim() };
    }).filter(Boolean);
    const types = fs.map(f => f.type);
    const uniq = new Set(types).size === types.length;
    const ens = fs.map(f => f.en.toLowerCase().replace(/[.!?]+$/, ''));
    const varied = new Set(ens).size === ens.length;
    // 疑問句沒有問號＝AI 根本沒改成疑問句（最常見的錯）
    const qOk = fs.every(f => f.type !== 'question' || /\?\s*$/.test(f.en));
    fs.sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
    return fs.length >= 2 && fs.length <= 3 && uniq && varied && qOk
      ? { kind: 'forms', q: _zhTW(st.q).trim() || '同一句話的三種長相', forms: fs, why: _zhTW(st.why).trim() } : null;
  }

  /* 📊 比較級：原級 → 比較級 → 最高級，長條圖跟著長高 */
  if (st.kind === 'degree') {
    const lv = (Array.isArray(st.levels) ? st.levels : []).map(x => {
      const form = String((x && x.form) || '').trim();
      const en = String((x && x.en) || '').trim();
      // 例句裡一定要真的出現那個字，不然「taller」配一句沒有 taller 的句子，等於沒示範
      return form && en && en.toLowerCase().indexOf(form.toLowerCase()) >= 0
        ? { form, en, zh: _zhTW((x && x.zh) || '').trim() } : null;
    }).filter(Boolean);
    if (lv.length !== 3) return null;
    const forms = lv.map(x => x.form.toLowerCase());
    if (new Set(forms).size !== 3) return null;
    /* 比較級那一句要看得出是在比較（than／-er／more），
       最高級那一句要看得出是最高（the／-est／most）。
       AI 最常見的錯就是給三句不相干的話，這兩條擋得住。 */
    const cmpOk = /\bthan\b/i.test(lv[1].en) || /er$/i.test(forms[1]) || /^more\s/i.test(forms[1]);
    const supOk = /\bthe\b/i.test(lv[2].en) || /est$/i.test(forms[2]) || /^most\s/i.test(forms[2]);
    return cmpOk && supOk
      ? { kind: 'degree', q: _zhTW(st.q).trim() || '一個比一個更…', levels: lv, why: _zhTW(st.why).trim() } : null;
  }

  if (st.kind === 'fix') {
    const sentence = String(st.sentence || '').trim(), wrong = String(st.wrong || '').trim(), right = String(st.right || '').trim();
    const toks = sentence.split(/\s+/).map(w => w.replace(/[.,!?;:]+$/, ''));
    // v429：只改大小寫（taipei → Taipei）也是一種錯——以前被當成「沒改」丟掉，整份教學就不夠步數而失敗
    const exact = toks.filter(w => w === wrong).length;
    const hits = exact || toks.filter(w => w.toLowerCase() === wrong.toLowerCase()).length;
    // v443：「cat → dog」不是錯字，是換一個字。錯的那個字一定要因為文法規則而錯（大小寫／單複數／時態／功能詞）
    return sentence && wrong && right && hits === 1 && _gnFixPairOk(wrong, right)
      ? { kind: 'fix', sentence, wrong, right, why: _zhTW(st.why).trim() } : null;
  }
  return null;
}

async function _gnCall(system, user, maxTokens) {
  return _aiAsk({ model: GN_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] },
    (data) => { const o = JSON.parse(_aiStripFence(data?.content?.[0]?.text || '')); return o == null ? null : o; }, 60000);
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
/* ══════════════════════════════════════════════════════════════════════════
   v466：複習——同一批單字，重出一份不一樣的題目
   ──────────────────────────────────────────────────────────────────────────
   Alan：「單字那一課只會在那一週出現，我想每隔一週就讓他們複習。
          單字卡當然不用再換，但 fill in the blank 或故事型的題目就可以換。」
   ⚠ 關鍵是「真的不一樣」：所以要把上一次出過的句子挖出來餵進 prompt（_aiAvoidNote）。
   ══════════════════════════════════════════════════════════════════════════ */

/* 這一組的單字從哪來：單字卡本來就存了 term / zh / example，重出題目要的全都在。 */
function reviewWordsOf(items) {
  const fc = (items || []).find(it => it && it.type === 'flashcard' && (it.cards || []).length);
  if (fc) {
    return (fc.cards || [])
      /* 🔴 v475（Alan：「複製過去的單字卡怎麼沒有圖片？這很簡單吧？」）：
         圖片欄位叫 imageUrl，本來沒帶出來 → 複習那一份的單字卡全是白的。
         圖片是老師自己挑或 AI 配好的，照抄最省事也最正確。 */
      .map(c => ({ term: String(c.term || '').trim(), zh: String(c.zh || '').trim(),
                   example: String(c.example || '').trim(), def: String(c.def || '').trim(),
                   imageUrl: String(c.imageUrl || '').trim() }))
      .filter(w => w.term);
  }
  /* 🔴 v474：沒有單字卡也要找得出這一組在教哪些字。
     v473 之後「複習組」預設就不放單字卡——結果複習組自己不能再排複習，
     也不能「在這一組再出一份題目」（因為找不到單字）。
     → 退而從其他單元反推：配對連線有「字＋英文定義」、聽寫有「字＋中文」、
       短文填空的 [挖空] 也是字。合起來通常比單字卡少一個例句，但夠用。 */
  const by = new Map();
  const put = (term, extra) => {
    const t = String(term || '').trim();
    if (!t) return;
    const k = t.toLowerCase();
    const cur = by.get(k) || { term: t, zh: '', example: '', def: '' };
    Object.keys(extra || {}).forEach(f => {
      const v = String(extra[f] == null ? '' : extra[f]).trim();
      if (!cur[f] && v) cur[f] = v;
    });
    by.set(k, cur);
  };
  (items || []).forEach(it => {
    if (!it) return;
    /* ⚠ v476：配對連線的定義**可能是中文**（AI 漏給 def 時的舊退路）。
       把它當成「老師寫的英文定義」餵回去，下一份又會多一個中文——錯誤會一直傳下去。
       中文的就不要當 def，讓 AI 重新寫一句英文的。 */
    (it.defPairs || []).forEach(p => {
      if (!p) return;
      put(p.word, /[\u4e00-\u9fff]/.test(String(p.def || '')) ? {} : { def: p.def });
    });                                                                    // 配對連線
    (it.spellWords || []).forEach(x => { if (x) put(x.word, { zh: x.zh, example: x.sentence }); });  // 聽寫
    // 短文填空：[word] 或 [word|提示]
    String(it.passage || '').replace(/\[([^\]]+)\]/g, (m, w) => { put(String(w).split('|')[0], {}); return m; });
  });
  return [...by.values()];
}

/* v475（Alan：「我只是這一組忘記生成哪一個，不應該全部重刪掉再生成一次」）：
   這一組已經有哪些題型。回傳的是「一鍵出單字」那張清單上的 id，
   所以畫面可以直接把「已經有的」取消勾選、只補還沒有的。
   ⚠ 字義選擇與測驗都是 type:'quiz'，只能靠標題分（v473 加的「· 字義選擇」字尾）。 */
function qsKindsInGroup(items) {
  const have = new Set();
  (items || []).forEach(it => {
    if (!it) return;
    const t = it.type;
    if (t === 'flashcard' && (it.cards || []).length) have.add('flashcard');
    else if (t === 'def-match' && (it.defPairs || []).length) have.add('def-match');
    else if (t === 'spelling' && (it.spellWords || []).length) have.add('spelling');
    else if (t === 'fillblank') have.add('fillblank');
    else if (t === 'cloze') have.add('story');
    /* ⚠ v542：標題可能帶「（1/3）」的字尾，比對前一定要先拿掉 */
    else if (t === 'quiz') have.add(/字義選擇$/.test(qsStripPart(it.title)) ? 'sense' : 'quiz');
  });
  return [...have];
}

/* v469：文法的複習素材。
   v466 已經讓教學單元存下 srcTopic / srcNotes，所以之後出的文法都能重出。
   ⚠ v466 之前出的沒有 srcNotes——那就退回用互動教學的內容反推教學重點。
     會比較粗（它是「講解」不是「老師的原始筆記」），但總比不能複習好，
     而且畫面上會老實告訴老師這一組是用反推的。 */
function reviewGrammarOf(items) {
  const ls = (items || []).find(it => it && it.type === 'lesson' && (it.steps || []).length);
  if (!ls) return null;
  const topic = String(ls.srcTopic || ls.group || ls.title || '').replace(/\s*·.*$/, '').trim();
  const notes = String(ls.srcNotes || '').trim();
  if (notes) return { topic, notes, fromNotes: true };
  // 反推：把互動教學講過的話與例句接起來，當成教學重點
  const bits = [String(ls.lead || '').trim()];
  (ls.steps || []).forEach(st => {
    if (st.say) bits.push(String(st.say).trim());
    (st.examples || []).forEach(ex => { if (ex && ex.en) bits.push(String(ex.en).trim()); });
    if (st.q) bits.push(String(st.q).trim());
    if (st.why) bits.push(String(st.why).trim());
  });
  const back = bits.filter(Boolean).join('\n').slice(0, 3000);
  return back ? { topic, notes: back, fromNotes: false } : null;
}

/* v505（Alan：「錯題本要分成單字錯題、文法錯題，以此類推去做分類，
     不然小朋友哪會想要做，全部都擠在一起，讓小朋友知道這次的主題是什麼」）：
   ⭐ 多帶一個 catId 出來。本來只有 cat（中文名），但中文名每個年級軌不一樣
     （G4 的 word 叫「字彙學習」、預設那份叫「字根字首」），拿中文名分類會分成兩堆。
   ⭐ categories 改成可以傳進來——本來寫死全域 CATEGORIES，
     文法軌（t1~t5）完全對不到，那些錯題的 cat 一直是空字串。 */
function collectWrongQuestions(progressItems, weeks, weekOrder, categories) {
  const cats = (categories && categories.length) ? categories : (CATEGORIES || []);
  const result = [];
  const seen = new Set();
  Object.entries(progressItems || {}).forEach(([itemKey, prog]) => {
    if (!prog?.wrongQuestions?.length) return;
    let weekLabel = '過往內容', cat = '', catId = '', itemTitle = itemKey;
    if (itemKey.startsWith('review_')) {
      weekLabel = '🏆 總複習'; itemTitle = '總複習';
    } else
    outer: for (const wid of (weekOrder || [])) {
      const w = weeks && weeks[wid];
      if (!w) continue;
      for (const c of cats) {
        const items = (w.items && w.items[c.id]) || [];
        const found = items.find(it =>
          itemKey === `${wid}_${it.id}` || itemKey === it.id || itemKey.endsWith('_' + it.id)
        );
        if (found) {
          weekLabel = w.label || wid;
          cat = c.titleZh; catId = c.id;
          itemTitle = found.title || found.zh || found.id;
          break outer;
        }
      }
    }
    prog.wrongQuestions.forEach(wq => {
      const key = `${wq.q}|||${wq.answer}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({ q: wq.q, answer: wq.answer, picked: wq.picked || '', itemId: itemKey, itemTitle, weekLabel, cat, catId, type: prog.itemType || '',
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

Object.assign(window, { aiJudgeTranslation, gnAnswerOk, gnNorm, gnValidStep, gnIsTeachStep, GN_TEACH_KINDS, gnCleanStem, CATEGORIES, SEED_WEEKS, DEFAULT_WEEK_ORDER, TYPE_META, ADMIN_EMAILS, subscribeMyStars, subscribeShop, loadWeeks, saveWeeks, loadProgress, saveProgress, toYouTubeEmbed, loadWeekOrder, saveWeekOrder, subscribeToClassData, uploadPdfToStorage, uploadSubmissionPhoto, uploadFlashcardImage, compressImageBlob, loadCompanion, subscribeRoster, setRosterStudentTeacher, addLeaderboardEntry, deleteLeaderboardEntry, subscribeLeaderboard, signInWithGoogle, signInWithGoogleRedirect, signOutUser, subscribeAuth, isAdminUser, OWNER_EMAILS, isOwnerUser, subscribeAdminStatus, saveProgressItem, subscribeMyProgress, subscribeAllStudents, saveQuizMistakes, BADGES, updateStreak, unlockBadge, subscribeUserProfile, getLevel, COMPANION_LINES, pickLine, dictHas, prefetchDict, readWorthyWords, playSound, speakText, speakTTS, ttsIsSpeaking, speakSentences, prefetchTts, unlockTtsAudio, getTtsMode, setTtsMode, grSpeechChunks, AUTO_NEXT_SPEED, autoNextMs, qsStripPart, storyHint: _storyHint, fetchReadingWords, lookupWord, generateTtsAudio, grJoinReadLines, grReadTextFrom, grReadWordsFrom, grWordsText, grSayNumber, grWordsBefore, checkWriting, checkShortAnswer, checkEssay, checkStoryMountain, collectWrongQuestions, removeWrongQuestion, reviewWordsOf, reviewGrammarOf, qsKindsInGroup, mxSmartLine, wsCheck, WS_CHECKS });

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
/* ══ 🔴 v595 「刪掉的東西永遠回來」——藏了很久的存檔 bug ═══════════════════════
   所有年級存課程都是 `doc.set({ weeks }, { merge: true })`。⚠ Firestore 的 merge 會**逐層合併 map**：
   本機把 weeks.w1.homework.b 拿掉再存，雲端那一筆**根本不會被刪**（陣列才是整個換掉）。
   用真的 Firestore SDK 離線實測過（tests/t-v595 有同一份重現）：
     items 陣列少了 b ✔　但 homework.b 還在 ✘
   後果（都不會報錯，所以沒人發現）：
     · 取消作業／刪單元後清掉的作業，雲端永遠留著 → 線上六個年級有 87 筆「幽靈作業」
       （v486 的 pruneGhostHomework 每次存檔都在清，但清的只是本機那份，雲端從來沒少過）
     · 取消封存（delete week.archived）存不進去 → 學生還是看不到那一週
     · 刪整週只是從順序拿掉，週次本身留在雲端（六個年級共 26 個孤兒週）
   修法：存之前拿「這台最後一次看到的雲端」當對照，**本機明確少掉的 key** 改寫成 FieldValue.delete()。
   ⚠ 只刪「我看過、現在沒了」的——別台剛加的 key 我沒看過，不會被刪（merge 原本保護的就是這個）。
   ⚠ 不自動刪整週（depth 0）：萬一本機只載到一部分週次，就會把雲端的週次刪光。
   ⚠ 週次層的欄位（label、startISO…）也不自動刪，只有 archived 例外；有些地方會用「只有已知欄位」
     重新組一個週次物件，那種情況刪欄位會把真資料弄丟。 */
const _cloudSkel = {};
function _skel(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return 1;
  const o = {}; Object.keys(v).forEach(k => { o[k] = _skel(v[k]); }); return o;
}
function noteCloudWeeks(key, weeks) {
  _cloudWeekCount[key] = _countWeekItems(weeks);
  try { _cloudSkel[key] = _skel(weeks); } catch (e) { delete _cloudSkel[key]; }   // 只記「有哪些 key」，不留資料
}
function weeksWithDeletes(key, weeks, del) {
  const old = _cloudSkel[key];
  if (!old || !weeks || typeof weeks !== 'object') return weeks;
  const DEL = del !== undefined ? del : firebase.firestore.FieldValue.delete();
  const isMap = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const walk = (o, n, depth) => {
    const out = {};
    Object.keys(n).forEach(k => { out[k] = (isMap(n[k]) && isMap(o[k])) ? walk(o[k], n[k], depth + 1) : n[k]; });
    Object.keys(o).forEach(k => {
      if (k in n) return;
      if (depth === 0) return;                        // 整週不自動刪
      if (depth === 1 && k !== 'archived') return;    // 週次層的欄位只認 archived
      out[k] = DEL;
    });
    return out;
  };
  return walk(old, weeks, 0);
}
function guardWeekSave(key, weeks) {
  const last = _cloudWeekCount[key];
  if (last === undefined) throw new Error('課程內容還沒從雲端載入完成，先等一下再存（避免把雲端的題目蓋掉）');
  const n = _countWeekItems(weeks);
  if (n === 0 && last > 0) {
    throw new Error(`擋下了一次危險的存檔：這次要寫入的是 0 題，但雲端現在有 ${last} 題。請重新整理後再試。`);
  }
  return n;
}
Object.assign(window, { noteCloudWeeks, guardWeekSave, weeksWithDeletes, countWeekItems: _countWeekItems });

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
/* ══ v414（Alan：「他們完成作業都應該有加分吧？有學生說沒有！」）═══════════
   學生說得對。舊的規則只列了 6 種題型，autoStarsForItem 最後一行是 `return 0`
   —— 也就是**沒列到的題型，做得再好也是零顆**。實際上 17 種題型裡有 11 種掛零：
     聽寫、選擇題、分段閱讀、打答案、圈選題、切音節、分類排序、
     AI 造句、意見文寫作、故事山、上傳作業。
   暑假題庫 167 個單元裡就有 65 個（39%）屬於這些型別。
   現在改成「有列表就一定有規則」，而且分成三種算法，新的題型只要歸類就好。 */
const AUTO_STAR_KIND = {
  // ① 分數型：80 分 +10、滿分 +15（沿用原本填空的標準，沒有調鬆也沒有調緊）
  quiz: 'pct', spelling: 'pct', fillblank: 'pct', cloze: 'pct', 'def-match': 'pct',
  'reading-skill': 'pct', 'type-answer': 'pct', 'circle-answer': 'pct',
  'syllable-div': 'pct', 'word-sort': 'pct', 'sentence-order': 'pct', 'guided-reading': 'pct',   // v462 ①
  exam: 'pct',   // v515 📄 模擬考卷
  // ② AI 批改的五星型：3 星 +10、4 星 +20（沿用原本閱讀簡答的標準）
  'short-answer': 'stars', 'writing-practice': 'stars', essay: 'stars', 'story-mountain': 'stars',
  // ③ 沒有分數可言的：做完就給
  lesson: 'done5',      // 教學卡：讀完 +5（v383 原本就是這樣）
  upload: 'done10',     // 上傳作業：拍照交上來就是完成 +10
};
const AUTO_STAR_RULES = {
  flashcard: '學習＋測驗（選擇題）完成 +10；測驗的手寫題也全部答完再 +20',
  quiz: '80 分 +10／100 分 +15',
  exam: '自動計分的部分 80 分 +10／100 分 +15（老師手改的那幾題不算）',
  spelling: '80 分 +10／100 分 +15',
  fillblank: '80 分 +10／100 分 +15',
  cloze: '80 分 +10／100 分 +15',
  'def-match': '比照填空：80 分 +10／100 分 +15',
  'reading-skill': '比照填空：80 分 +10／100 分 +15',
  'type-answer': '80 分 +10／100 分 +15',
  'circle-answer': '80 分 +10／100 分 +15',
  'syllable-div': '80 分 +10／100 分 +15',
  'word-sort': '80 分 +10／100 分 +15',
  'sentence-order': '80 分 +10／100 分 +15',
  'guided-reading': '有題目：80 分 +10／100 分 +15；純閱讀：整篇讀完 +10',
  lesson: '教學卡讀完 +5',
  upload: '上傳作業交出來 +10',
  'short-answer': '平均 3 星 +10／4 星 +20',
  'writing-practice': '平均 3 星 +10／4 星 +20',
  essay: '平均 3 星 +10／4 星 +20',
  'story-mountain': '平均 3 星 +10／4 星 +20',
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
  /* v414: AI 批改的五星型一律用「3 星（60 分）」當達標線，跟給星星的規則同一條。
     本來只寫死 short-answer，造句／意見文／故事山被拿去跟分數型比 80 分，
     等於同樣是 3 星，一個算達標、一個不算。 */
  if (AUTO_STAR_KIND[type] === 'stars') return pct != null && pct >= 60;
  if (pct == null) return !!prog.done;                              // 上傳作業等沒有分數的
  return pct >= 80;
}
function autoStarsForItem(item, prog, cloudShape) {
  if (!prog) return 0;
  const type = (item && item.type) || prog.itemType || '';
  const pct = autoStarPct(prog, cloudShape);
  // 單字卡自成一格：它沒有分數，看的是「兩個模式都跑完了沒」
  if (type === 'flashcard') {
    const m = prog.modes || {};
    if (!(m.learn && (m.test || m.fill))) return 0;
    return 10 + (m.written ? 20 : 0);   // v374: 測驗的手寫題全部答完再加 20
  }
  const kind = AUTO_STAR_KIND[type];
  if (!kind) return 0;                       // 真的認不得的型別才是 0（例如舊資料沒存型別）
  if (kind === 'done5')  return 5;           // v383: 教學卡讀完就給，重點是讓他先看
  if (kind === 'done10') return prog.done ? 10 : 0;
  if (kind === 'stars')  { if (pct == null) return 0; return pct >= 80 ? 20 : (pct >= 60 ? 10 : 0); }
  // 'pct'
  if (pct == null) {
    /* 沒有分數的分段閱讀＝純閱讀（v387 那種沒出題的），整篇讀完就給。
       ⚠ 其他分數型沒有分數＝資料不完整，不給——寧可少給也不要無中生有。 */
    return (type === 'guided-reading' && prog.done) ? 10 : 0;
  }
  return pct >= 100 ? 15 : (pct >= 80 ? 10 : 0);
}
// weeks/weekOrder＝這位學生看得到的週次（暑假要先用 filterWeeksForPlan 過濾）
// progItems＝進度 map；opts.cloudShape=true 代表直接吃 progress 文件的 items
/* ══ v477：吉祥物「看情況說話」（Alan：「我的吉祥物可以再智能化一點，更像 AI，
   可以跟你的舉動互動，而不是固定的幾套台詞」）══════════════════════════════
   做法**不是**每句話都去叫 AI：那很慢（一句話等兩秒）、要花錢、而且對小朋友講的話
   不該是每次都不一樣的即興句。真正讓人覺得「牠知道我在幹嘛」的，是**講的事情跟我
   現在的狀況有關、而且帶真實數字**——「連對 7 題」「再 20 顆就買得起小兔」
   「只剩 1 個就整組完成」。這個用規則做得又快又穩，而且永遠不會講出奇怪的話。

   回傳 { key, text, act }；key 給呼叫端做「同一件事不要連講兩次」。
   沒有任何情況成立就回 null → 退回原本的固定台詞（照 v451 的語音包）。
   ⚠ 順序＝優先權：愈「此時此刻跟我有關」的愈前面。 */
function mxSmartLine(ctx) {
  const c = ctx || {};
  const n = (v) => Number(v || 0);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const R = [];

  // ① 正在發生的事（答題中）——最有感
  if (n(c.streak) >= 10) R.push({ key: 'streak10', act: 'cheer',
    text: pick([`連對 ${n(c.streak)} 題！你今天手感超好`, `${n(c.streak)} 題全對，我都看傻了`, `哇…連對 ${n(c.streak)} 題，繼續！`]) });
  else if (n(c.streak) >= 5) R.push({ key: 'streak5', act: 'nod',
    text: pick([`連對 ${n(c.streak)} 題了！`, `${n(c.streak)} 題沒錯過，穩`, `一口氣對 ${n(c.streak)} 題，厲害`]) });
  if (n(c.wrongRun) >= 3) R.push({ key: 'wrongRun', act: 'idle',
    text: pick(['這一段有點難齁…慢慢來，我陪你', '錯幾題沒關係，想清楚再按', '先深呼吸一下，再看一次題目']) });

  // ② 快完成了——差一點點最有動力
  const left = n(c.groupLeft);
  if (left === 1) R.push({ key: 'grp1', act: 'jump',
    text: pick([`只剩 1 個就整組完成了，會多拿星星喔！`, `最後一個了！撐住`, `剩一個！做完整組有獎勵`]) });
  else if (left === 2 || left === 3) R.push({ key: 'grpN', act: 'nod',
    text: pick([`再 ${left} 個就整組完成，會多拿星星`, `還剩 ${left} 個，快了`]) });

  // ③ 星星快夠了——他自己正在存的那樣東西
  if (c.nearBuy && n(c.nearBuy.need) > 0 && n(c.nearBuy.need) <= 60) R.push({ key: 'nearBuy', act: 'nod',
    text: pick([`再 ${n(c.nearBuy.need)} 顆就買得起${c.nearBuy.label}了`,
                `${c.nearBuy.label} 只差 ${n(c.nearBuy.need)} 顆⭐`,
                `存到 ${n(c.stars) + n(c.nearBuy.need)} 顆就能換${c.nearBuy.label}`]) });

  // ④ 今天第一次見面
  if (c.firstToday) {
    const d = n(c.daysAway);
    /* ⚠ 每一句都要帶真實數字——「你終於來了」那種泛泛的話，
       跟原本的固定台詞沒兩樣，就白做了。 */
    if (d >= 7) R.push({ key: 'longAway', act: 'jump', text: pick([`好久不見！我等你 ${d} 天了`, `${d} 天沒看到你…我都生灰塵了`]) });
    else if (d >= 3) R.push({ key: 'away', act: 'jump', text: pick([`${d} 天沒看到你了，想你`, `欸，${d} 天不見！`]) });
    else if (n(c.checkinDays) >= 3) R.push({ key: 'checkin', act: 'cheer',
      text: pick([`連續 ${n(c.checkinDays)} 天來報到，厲害`, `${n(c.checkinDays)} 天了，這個習慣很棒`]) });
    else {
      const h = n(c.hour);
      if (h >= 5 && h < 11) R.push({ key: 'morning', act: 'idle', text: pick(['早安！今天先做哪一個？', '早起的人最強']) });
      else if (h >= 21 || h < 5) R.push({ key: 'night', act: 'idle', text: pick(['這麼晚還在練，認真', '做完這個就去睡喔']) });
    }
  }

  // ⑤ 訂正錯題——最值得被看見的努力
  if (n(c.fixedToday) >= 3) R.push({ key: 'fixed', act: 'cheer',
    text: pick([`今天訂正了 ${n(c.fixedToday)} 題，這才是真的進步`, `錯的都改掉了 ${n(c.fixedToday)} 題，很可以`]) });

  if (!R.length) return null;
  /* 同一件事剛講過就換下一個；**真的沒得換就閉嘴**（回 null → 退回原本的固定台詞）。
     連講兩次同一類比講一句普通的話更像壞掉。 */
  const fresh = R.filter(x => x.key !== c.lastKey);
  return fresh.length ? fresh[0] : null;
}

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
      const base = autoStarsForItem(it, prog, cloudShape);
      const dbl = base > 0 && hwDoubleAt(earnedAtOf(prog));
      const n = dbl ? base * HW_DOUBLE.mult : base;
      if (n > 0) {
        total += n;
        entries.push({ id: `auto:${wid}_${it.id}`, auto: true, date: dateOf(prog),
                       amount: n, note: `完成「${it.title || it.id}」` + (dbl ? ' 🎃雙倍' : '') });
      }
    });
    /* ✨ v477（Alan：「一整組單字或是文法都完成並且通過門檻，有沒有額外加分？」）
       ——本來沒有，只有下面那個「整週作業」獎金。現在補上「整組」。
       一組＝同一個 item.group（一鍵生成時就寫進去了）。
       ⚠ 只算生成時有分組的；老師手捏、沒有 group 的單元不要被硬湊成一組。
       ⚠ 至少要 3 個單元才算一組——兩個單元就給獎金太好賺。
       ⚠ 用的是 autoStarItemOk（跟作業獎金同一把尺）：不是「做完」就好，是要**過門檻**。 */
    const byGroup = {};
    all.forEach(it => {
      const g = String((it && it.group) || '').trim();
      if (!g) return;
      (byGroup[g] = byGroup[g] || []).push(it);
    });
    Object.keys(byGroup).forEach(g => {
      const gItems = byGroup[g];
      if (gItems.length < 3) return;
      if (!gItems.every(it => autoStarItemOk(it, getProg(wid, it.id), cloudShape))) return;
      const bonus = gItems.length >= 6 ? 15 : 10;
      total += bonus;
      entries.push({ id: `auto:grp_${wid}_${g}`, auto: true, date: '',
                     amount: bonus, note: `「${g}」整組完成 🏅` });
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
    const base = autoStarsForItem(null, prog, cloudShape);
    if (base <= 0) return;
    const dbl = hwDoubleAt(earnedAtOf(prog));
    const n = dbl ? base * HW_DOUBLE.mult : base;
    total += n;
    entries.push({ id: `auto:${k}`, auto: true, past: true, date: dateOf(prog),
                   amount: n, note: `完成「${(prog && prog.itemTitle) || '之前的練習'}」` + (dbl ? ' 🎃雙倍' : '') });
  });

  return { total, entries };
}
Object.assign(window, { computeAutoStars, autoStarsForItem, autoStarItemOk, AUTO_STAR_RULES, AUTO_STAR_KIND });

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
/* ══════════════════════════════════════════════════════════════════════════
   v431 ④：吉祥物裝扮（Alan：「我想讓小朋友可以購買吉祥物的裝扮…頭飾 語音 特效 動作跳舞之類的」）
   ──────────────────────────────────────────────────────────────────────────
   為什麼買賣要放在 progress/{uid}，不放 stars/{email}：
     firestore.rules 寫得很清楚——stars 只有老師寫得了（學生只能讀自己那一筆），
     這是刻意的（不然小朋友可以自己加星星）。progress/{uid} 本來就是「學生自己可寫」，
     所以「買了什麼」記在這裡，星星本身一顆都不會被學生改到。
   花掉多少星星不是存一個數字，而是**由買到的東西反算**（mxSpent）：
     存數字會有「改數字＝白拿」的漏洞，反算就不可能對不上。
   ⚠ 舊的兩頂帽子（v385，老師手動扣點）仍然算數：那是老師扣的，不能再扣一次，
     所以 legacy 的 party／crown 走 window.__mxHats，不進 owned、也不進 mxSpent。
   ══════════════════════════════════════════════════════════════════════════ */
const MX_KINDS = [
  { kind: 'hat',   zh: '頭飾', ico: '🎩', tip: '戴在頭上' },
  { kind: 'item',  zh: '配件', ico: '🧣', tip: '穿在身上' },
  { kind: 'dance', zh: '動作', ico: '💃', tip: '按一下就表演' },
  { kind: 'pet',   zh: '夥伴', ico: '🐾', tip: '換一隻陪你' },
  { kind: 'costume', zh: '造型', ico: '🎃', tip: '整身裝扮（限定）', limitedOnly: true },   // v615：只有擁有限定造型的人才看得到這個分頁
];
const MX_SHOP = [
  /* 頭飾 */
  { id: 'hat_cap',    kind: 'hat',   zh: '鴨舌帽',   emoji: '🧢', cost: 100,  legacy: '' },
  { id: 'hat_flower', kind: 'hat',   zh: '小花',     emoji: '🌸', cost: 100 },
  { id: 'hat_party',  kind: 'hat',   zh: '派對帽',   emoji: '🎉', cost: 150,  legacy: 'party' },
  { id: 'hat_grad',   kind: 'hat',   zh: '畢業帽',   emoji: '🎓', cost: 150 },
  { id: 'hat_bunny',  kind: 'hat',   zh: '兔耳朵',   emoji: '🐰', cost: 200 },
  { id: 'hat_horn',   kind: 'hat',   zh: '小鹿角',   emoji: '🦌', cost: 200 },
  { id: 'hat_star',   kind: 'hat',   zh: '星星髮箍', emoji: '⭐', cost: 250 },
  { id: 'hat_crown',  kind: 'hat',   zh: '皇冠',     emoji: '👑', cost: 250,  legacy: 'crown' },
  /* v613 🎃 萬聖節限定（Alan：「再做一個萬聖節驚喜」）：只有 10/31～11/2 打開 Trick or Treat 的孩子拿得到，
     之後不賣、不能買（mxBuy 擋 limited），裝扮室裡也只有「已經有的人」才看得到那一格——絕版才稀有。
     女巫帽是大獎（南瓜開出 ⭐400 以上）才有的。cost 0＝不影響星星餘額。 */
  /* v615（Alan：「做整身造型，每一隻都要合身」）：兩頂限定帽升級成整身造型（帽子＋身上＋腳）。
     kind 'costume'：穿上以後帽子與配件先收起來（整套就是一個造型），萬聖節吸血鬼期間也照樣穿得到。 */
  { id: 'cos_pumpkin', kind: 'costume', zh: '限定南瓜裝', emoji: '🎃', cost: 0, limited: 'hw2026' },
  { id: 'cos_witch',   kind: 'costume', zh: '限定女巫裝', emoji: '🧙', cost: 0, limited: 'hw2026', rare: true },
  /* 配件 */
  { id: 'it_bow',     kind: 'item',  zh: '蝴蝶結',   emoji: '🎀', cost: 100 },
  { id: 'it_scarf',   kind: 'item',  zh: '圍巾',     emoji: '🧣', cost: 100 },
  { id: 'it_glass',   kind: 'item',  zh: '墨鏡',     emoji: '🕶️', cost: 150 },
  /* v508（Alan：「書包這個裝飾刪掉」）：下架。買過的孩子那 150 顆星星會自己回去
     （mxOwnedList 只認得出來的 id，認不得的就不再算進 mxSpent）。 */
  { id: 'it_cape',    kind: 'item',  zh: '英雄披風', emoji: '🦸', cost: 200 },
  { id: 'it_wand',    kind: 'item',  zh: '魔法棒',   emoji: '🪄', cost: 250 },
  /* 🔴 v505（Alan：「把特效跟語音都刪掉，沒有用的功能」）
     答對特效（彩帶／星星雨／愛心雨／泡泡／煙火）與語音包（八種口氣）整組下架。
     答對照樣灑彩帶、吉祥物照樣講自己的台詞——那本來就是「什麼都沒買時的樣子」，
     只是不再是可以買的東西，所以連 fx / voice 這兩個分類都不留。
     ⚠ 下架之後，本來買過 fx_* / vo_* 的孩子**星星會自己回去**：
       星星是「賺到的 − 花掉的」算出來的，而 mxOwnedList 只認得出來的 id，
       認不得的那幾筆就不再算進 mxSpent。這是 v431 當初就設計好的行為，不用另外退費。
     ⚠ 舊帳號 mx.wear 裡殘留的 fx / voice 欄位不用清，mxWearOf 不再讀它。 */
  /* 動作（買了就能叫牠表演） */
  { id: 'dc_wave',    kind: 'dance', zh: '揮揮手',   emoji: '👋', cost: 100 },
  { id: 'dc_spin',    kind: 'dance', zh: '轉圈圈',   emoji: '🌀', cost: 100 },
  { id: 'dc_dance',   kind: 'dance', zh: '跳舞',     emoji: '🕺', cost: 150 },
  { id: 'dc_flip',    kind: 'dance', zh: '後空翻',   emoji: '🤸', cost: 200 },
  { id: 'dc_moon',    kind: 'dance', zh: '月球漫步', emoji: '🌙', cost: 250 },
  /* v435（Alan：「初始的角色都是 Claudius，其他都要買，這樣才有稀有的感覺」）
     夥伴本身也變成商品；Claudius 免費、永遠都在。id 對應 components-fx.jsx 的 MX_PETS。 */
  { id: 'pet_clay',   kind: 'pet',   zh: 'Claudius', emoji: '🟤', cost: 0, free: true, pet: 'clay' },
  { id: 'pet_rock',   kind: 'pet',   zh: '阿石',     emoji: '🪨', cost: 500,  pet: 'rock' },
  { id: 'pet_sprout', kind: 'pet',   zh: '小芽',     emoji: '🌱', cost: 500,  pet: 'sprout' },
  { id: 'pet_owl',    kind: 'pet',   zh: '咕咕',     emoji: '🦉', cost: 500,  pet: 'owl' },
  { id: 'pet_flame',  kind: 'pet',   zh: '小焰',     emoji: '🔥', cost: 800, pet: 'flame' },
  /* v455（Alan 給了一張白兔子的參考圖）：小兔——招牌是「吃紅蘿蔔＋跳超高」，
     跳到半個畫面高，所以定價 300（比其他夥伴貴一點點，但看得到的東西最多）。 */
  { id: 'pet_bun',    kind: 'pet',   zh: '小兔',     emoji: '🐰', cost: 300, pet: 'bun' },
];
const MX_BY_ID = {};
MX_SHOP.forEach(it => { MX_BY_ID[it.id] = it; });
function mxItemOf(id) { return MX_BY_ID[id] || null; }
/* v613：限定品「已經有的人」才看得到那一格（裝扮室、商店都用這個）。 */
function mxShopVisible(mx) { return MX_SHOP.filter(it => !it.limited || mxHasItem(mx, it.id)); }
/* 買到的東西：只認得出來的 id（將來下架某一件，也不會讓畫面壞掉或把星星算錯） */
function mxOwnedList(mx) {
  const raw = (mx && Array.isArray(mx.owned)) ? mx.owned : [];
  const seen = {}, out = [];
  raw.forEach(id => { if (MX_BY_ID[id] && !seen[id]) { seen[id] = 1; out.push(id); } });
  return out;
}
// 免費的（彩帶／原音）不用買就有
function mxHasItem(mx, id) {
  const it = MX_BY_ID[id];
  if (!it) return false;
  if (it.free) return true;
  if (it.limited && window.__mxPreviewLimited) return true;   // v615：老師帳號隨時可試穿限定造型（不寫進 owned）
  if (it.legacy && (window.__mxHats || []).indexOf(it.legacy) >= 0) return true;   // 老師以前扣點買的
  return mxOwnedList(mx).indexOf(id) >= 0;
}
/* v442（Alan：「可以取名字，但一旦取了只能免費更改一次，如果要換要花 50 買改名卡」）
   第一次取名免費，之後每改一次 50 顆星。改了幾次記在 progress/{uid}.mx.renames，
   花掉的星星一樣是「反算」出來的（買到的東西 ＋ 改名的次數），不存數字。 */
const MX_RENAME_COST = 50;
function mxRenamesPaid(mx) {
  return Math.max(0, ((mx && +mx.renames) || 0) - 1);   // 第一次免費
}
function mxRenameCost(mx) {
  return ((mx && +mx.renames) || 0) === 0 ? 0 : MX_RENAME_COST;
}
function mxSpent(mx) {
  return mxOwnedList(mx).reduce((n, id) => n + (MX_BY_ID[id].cost || 0), 0)
    + mxRenamesPaid(mx) * MX_RENAME_COST;
}
/* 身上穿的：只留「真的有」的（下架或資料怪怪的就當沒穿），動作不算穿戴 */
/* 夥伴：買到哪幾隻（Claudius 永遠有）。給吉祥物那一層判斷「這一隻能不能選」用。 */
function mxOwnedPets(mx) {
  return MX_SHOP.filter(it => it.kind === 'pet' && mxHasItem(mx, it.id)).map(it => it.pet);
}
function mxPetItem(petId) {
  return MX_SHOP.find(it => it.kind === 'pet' && it.pet === petId) || null;
}
function mxWearOf(mx) {
  const w = (mx && mx.wear) || {};
  const out = {};
  ['hat', 'item', 'costume'].forEach(k => {       // v615 加 costume；v505：fx / voice 下架，身上只剩頭飾與配件
    const id = w[k];
    const it = id && MX_BY_ID[id];
    out[k] = (it && it.kind === k && mxHasItem(mx, id)) ? id : '';
  });
  return out;
}
/* 買一件。balance＝現在有幾顆星星（含自動集點，由 app.jsx 算好傳進來）。
   回傳 { ok, reason }；reason：'no-user'｜'bad-id'｜'owned'｜'poor'｜'save' */
async function mxBuy(uid, id, balance, mx) {
  const it = MX_BY_ID[id];
  if (!uid) return { ok: false, reason: 'no-user' };
  if (!it || it.free || it.limited) return { ok: false, reason: 'bad-id' };   // v613：限定品不能買
  if (mxHasItem(mx, id)) return { ok: false, reason: 'owned' };
  if ((balance || 0) < (it.cost || 0)) return { ok: false, reason: 'poor', short: (it.cost || 0) - (balance || 0) };
  const owned = mxOwnedList(mx).concat([id]);
  const log = mxLogAdd(mx, { id, cost: it.cost || 0 });     // v448：老師要看得到誰買了什麼
  try {
    await _db.collection('progress').doc(uid).set({ mx: { owned, wear: (mx && mx.wear) || {}, log } }, { merge: true });
    return { ok: true, owned, item: it };
  } catch (e) { return { ok: false, reason: 'save' }; }
}

/* ══ v448（Alan：「Tayler 亂買東西要退掉」）═══════════════════════════════
   購買紀錄 mx.log：[{ id, cost, at }]，最多留 120 筆（夠看，也不會把文件撐大）。
   退費＝把東西從 owned 拿掉；星星是「賺到的 − 花掉的」算出來的，
   所以東西一拿掉，點數自己就回去了（不用、也不能去改 stars，那是另一本帳）。 */
const MX_LOG_MAX = 120;
function mxLogAdd(mx, ent) {
  const log = (mx && Array.isArray(mx.log)) ? mx.log.slice() : [];
  log.push(Object.assign({ at: Date.now() }, ent));
  return log.slice(-MX_LOG_MAX);
}
/* v451（Alan：「集點紀錄那邊除了集點紀錄也順便包含扣點或是買了什麼東西，全部都標示上去」）
   把「買裝扮／改名卡／老師退費」整理成跟集點紀錄同一個形狀（date / amount / note），
   學生端與老師端就能跟手動、自動的紀錄排在同一張清單裡。
   ⚠ 只負責「顯示」——餘額一律還是 mxSpent 算的，不要拿這裡的數字加總。 */
function mxStarRows(mx) {
  const rows = [];
  const day = (at) => { try { return at ? new Date(at).toISOString().slice(0, 10) : ''; } catch (e) { return ''; } };
  const zhOf = (id) => (id === '__rename' ? '改名卡' : ((MX_BY_ID[id] && MX_BY_ID[id].zh) || id));
  const log = (mx && Array.isArray(mx.log)) ? mx.log : [];
  log.forEach((e, i) => {
    if (!e || !e.id) return;
    const cost = +e.cost || 0;
    if (!cost) return;
    rows.push(cost < 0
      ? { id: 'mxr' + i, date: day(e.at), amount: -cost, note: `↩️ 老師把「${zhOf(e.id)}」退掉了`, mx: true }
      : { id: 'mxb' + i, date: day(e.at), amount: -cost, note: `🧸 買了「${zhOf(e.id)}」`, mx: true });
  });
  // 還沒有購買紀錄（v448 以前買的）也要看得到，只是沒有日期
  const logged = {};
  log.forEach(e => { if (e && e.id && (+e.cost || 0) > 0) logged[e.id] = 1; });
  mxOwnedList(mx).forEach((id, i) => {
    if (logged[id]) return;
    const cost = (MX_BY_ID[id] && MX_BY_ID[id].cost) || 0;
    if (cost) rows.push({ id: 'mxo' + i, date: '', amount: -cost, note: `🧸 買了「${zhOf(id)}」`, mx: true });
  });
  const paidRenames = mxRenamesPaid(mx) - log.filter(e => e && e.id === '__rename' && (+e.cost || 0) > 0).length;
  for (let i = 0; i < paidRenames; i++) rows.push({ id: 'mxn' + i, date: '', amount: -MX_RENAME_COST, note: '✏️ 買了「改名卡」', mx: true });
  return rows;
}
/* 取名字／改名字。第一次免費，之後要 50 顆星（Alan 的「改名卡」）。 */
async function mxRename(uid, name, balance, mx) {
  const nm = String(name || '').trim().slice(0, 8);
  if (!uid) return { ok: false, reason: 'no-user' };
  if (!nm) return { ok: false, reason: 'empty' };
  const cost = mxRenameCost(mx);
  if (cost && (balance || 0) < cost) return { ok: false, reason: 'poor', short: cost - (balance || 0) };
  const renames = (((mx && +mx.renames) || 0) + 1);
  const log = cost ? mxLogAdd(mx, { id: '__rename', cost }) : ((mx && mx.log) || []);   // v448：免費那次不算購買
  try {
    await _db.collection('progress').doc(uid).set({
      mx: { owned: mxOwnedList(mx), wear: (mx && mx.wear) || {}, name: nm, renames, log },
    }, { merge: true });
    return { ok: true, name: nm, cost, renames };
  } catch (e) { return { ok: false, reason: 'save' }; }
}

/* 穿上／脫下（id 空字串＝脫掉）。只寫 wear，不動 owned。 */
async function mxSetWear(uid, kind, id, mx) {
  if (!uid) return { ok: false, reason: 'no-user' };
  const it = id ? MX_BY_ID[id] : null;
  if (id && (!it || it.kind !== kind || !mxHasItem(mx, id))) return { ok: false, reason: 'bad-id' };
  const wear = Object.assign({}, (mx && mx.wear) || {});
  wear[kind] = id || '';
  try {
    await _db.collection('progress').doc(uid).set({ mx: { owned: mxOwnedList(mx), wear } }, { merge: true });
    return { ok: true, wear };
  } catch (e) { return { ok: false, reason: 'save' }; }
}
Object.assign(window, { mxLogAdd, mxStarRows, MX_SHOP, MX_KINDS, mxItemOf, mxOwnedList, mxHasItem, mxSpent, mxWearOf, mxBuy, mxSetWear, mxOwnedPets, mxPetItem, mxRename, mxRenameCost, MX_RENAME_COST });
Object.assign(window, { mxShopVisible });



/* ══ v607 ① 作答自動保存（Alan：「作答中途不小心離開，整份要重寫」）══════════════════════════════
   ExamPlayer 的答案本來只放在畫面記憶體——iPad 切到別的 App 被系統收掉分頁、不小心重新整理、
   Safari 自己重載，長文與問答寫到一半就**整份消失**（程式裡沒有任何存檔）。
   ⭐ 存在這台裝置的 localStorage，key 帶帳號與單元（共用電腦換人不會看到別人的）。
   ⚠ 卷子內容的「簽章」（每大題的型別／標題／題數）對不上就不套用：老師中途改了卷子，舊草稿的格子就會錯位。
   ⚠ 放 14 天就丟；交卷完成就清掉；畫圖的 dataURL 太大不存（不然會把 5MB 額度吃光，連文字也存不進去）。
   ⚠ 只存這一台——刻意不同步到雲端：progress 文件整筆覆寫會洗掉成績（saveProgressItem 的 items.<id> 是整個換掉）。 */
const EXAM_DRAFT_TTL = 14 * 24 * 3600 * 1000;
function examDraftSig(item) {
  const bits = [];
  ((item && item.sections) || []).forEach(sc => (sc.parts || []).forEach(p => bits.push([p.kind, p.title || '', examPartN(p)].join('~'))));
  const str = bits.join('|');
  let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ':' + bits.length;
}
function examDraftHas(v) {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return true;
  if (Array.isArray(v)) return v.some(examDraftHas);
  if (typeof v === 'object') return Object.keys(v).some(k => examDraftHas(v[k]));
  return false;
}
function _examDraftKey(progressKey) {
  const u = (typeof window !== 'undefined' && window._currentUser && window._currentUser.uid) || 'anon';
  return 'alans-exam-draft:' + u + ':' + progressKey;
}
function examDraftLoad(progressKey, item) {
  try {
    const raw = localStorage.getItem(_examDraftKey(progressKey));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.sig !== examDraftSig(item)) return null;
    if (Date.now() - (d.at || 0) > EXAM_DRAFT_TTL) { localStorage.removeItem(_examDraftKey(progressKey)); return null; }
    return examDraftHas(d.ans) || examDraftHas(d.mood) ? d : null;
  } catch (e) { return null; }
}
function examDraftSave(progressKey, item, { ans, mood } = {}) {
  try {
    const slim = {};
    Object.keys(ans || {}).forEach(k => { const v = ans[k]; if (!(typeof v === 'string' && v.length > 150000)) slim[k] = v; });   // 畫圖的圖不存
    if (!examDraftHas(slim) && !examDraftHas(mood)) { localStorage.removeItem(_examDraftKey(progressKey)); return false; }
    localStorage.setItem(_examDraftKey(progressKey), JSON.stringify({ v: 1, sig: examDraftSig(item), at: Date.now(), ans: slim, mood: mood == null ? null : mood }));
    return true;
  } catch (e) { return false; }
}
function examDraftClear(progressKey) { try { localStorage.removeItem(_examDraftKey(progressKey)); } catch (e) {} }
Object.assign(window, { examDraftSig, examDraftHas, examDraftLoad, examDraftSave, examDraftClear, EXAM_DRAFT_TTL });



/* ══════════════════════════════════════════════════════════════════════════
   v515 📄 模擬考卷（Alan 給了兩張真的 G4 Formative，要做成互動版）
   ──────────────────────────────────────────────────────────────────────────
   他缺的不是題型——圈 -VCe 字、Word Bank 填空、閱讀選擇題，站上**本來就有**。
   缺的是「一份考卷」這個容器：

     現在的單元                    一份 Formative
     隨時做、分開做、順序隨意   →  一次坐下來做完
     每個單元各自一個分數       →  一個 100 分，分區加權 30/32/38
     做完馬上對答案             →  交卷才知道

   Nick 那張 95/100 才是他跟家長真正在看的數字。

   ⚠ 配分照學校的寫法：每一大題有自己的滿分（Part 2 是 20 分、2 分一題）。
     不要自己發明百分比——老師要能把網站的分數跟紙本對起來。
   ⚠ 申論題（Part 5 那題 15 分）這一版**不自動給分**：學校是老師拿 rubric 手改的，
     網站假裝改得出來只會給出一個假分數。先收答案、標成「老師會親自改」，
     自動分與手改分在結果頁分開寫清楚。
   ══════════════════════════════════════════════════════════════════════════ */

/* 一份考卷能放哪幾種大題（都對得上站上現成的題型） */
const EXAM_KINDS = {
  circle: { zh: '圈出符合的字', auto: true },   // Part 2：短文裡圈 N 個 -VCe／vowel team
  cloze:  { zh: 'Word Bank 填空', auto: true }, // Part 3：給詞庫，一句一格
  quiz:   { zh: '選擇題', auto: true },
  vcewrite: { zh: 'VCe 自己選字造字＋造句', auto: true },   // v620：Long a/i/o/u 各選兩個 VCe 字並造句
  spell:  { zh: '拼字填寫（輸入答案）', auto: true },   // v619：Suffixes 加字尾／還原／填正確形式——沒有詞庫、自己打字
         // Part 4：閱讀理解
  /* v522：康橋 Formative 的 Part 1——從字尾表裡挑兩個，造字，再各造一個 5 字以上的句子。
     ⭐ 這一題**程式全部驗得出來**，而且驗的就是考卷自己寫的規則：
       · 造出來的字真的有那個字尾（WS_CHECKS.suffix／prefix）
       · 兩個字尾要不一樣（考卷寫 "two of the suffixes"）
       · 句子裡真的用到那個字
       · 句子至少 N 個字（考卷寫 "5 or more words"）
     ⚠ 拼字對不對、是不是真的英文字，程式判不了——那本來就是老師改的部分。 */
  affix:  { zh: '造字＋造句', auto: true },
  /* v522：Part 2 Generate Questions——「用剛讀的故事，自己出兩個**文章上沒有**的問題」。
     程式驗得了最常見的三種失分（沒有問號、直接抄文章、太短），
     「這個問題跟故事有沒有關」才需要 AI——所以這一題半自動，給老師一個建議分。 */
  genq:   { zh: '自己出問題（AI／老師改）', auto: false },
  /* ══ v536：Alan 的康橋考卷上還有這兩種 ══════════════════════════ */
  storymap: { zh: '故事結構圖（開頭／中間／結尾）', auto: true },
  usewords: { zh: '用詞庫的字造句', auto: true },
  /* ══ v538：Alan 那疊卷子上剩下的四種 ══════════════════════════════ */
  fixbox:   { zh: '找出錯的字，填進格子', auto: true },
  evidence: { zh: '用文章裡的 N 個細節回答', auto: true },
  essay:    { zh: '長文寫作（老師改）', auto: false },
  checkin:  { zh: '開頭的心情與目標', auto: true, noScore: true },  // 不計分
  /* v557：康橋 Grade 4 的 "Chronological Order"——把 5 個事件照發生的順序標 1~5 */
  order:    { zh: '事件排順序（標 1~N）', auto: true },
  /* v571（康橋 G3 IT Formative）：兩種老師改的題型
     table：「左欄找描述字詞、右欄寫它讓你想像到什麼」這種填表（每列 N 分）
     draw ：「Draw the final scene」——學生在畫板上畫，老師看圖給分 */
  table:    { zh: '表格填寫（老師改）', auto: false },
  draw:     { zh: '畫圖（老師改）', auto: false },
  short:  { zh: '問答（老師改）', auto: false },// Part 5：申論，照 rubric 手改
};

/* v538 😊 開場的心情與目標。
   ⚠ 這份清單只能有**一份**：item.examMood（v515 就有的開場區）
     與 checkin 這一大題用的是同一個 EXAM_CHECKIN，
     兩邊各寫一份的話，改了一邊另一邊不會動（v526 的倒數時鐘就是這樣）。 */
const EXAM_CHECKIN = {
  moodQ: 'How are you feeling right now?',
  faces: ['😟', '😐', '🙂'],
  goalQ: 'What is your goal for this test?',
  goals: [
    'Read every question carefully.',
    'Take my time and do not rush.',
    'Stay calm and do my best.',
  ],
};

/* v541 圈選題「要圈什麼」——⭐ 只能有這一份（算分與出卷頁的檢查都用它）。
   🔴 本來兩邊都寫 `wsCheck(w, { kind, args: checkArg }, checkArg)`，
     而 wsCheck 的第三個參數是「**只**比這一個」——所以老師寫
     「digraph:sh ch th」（康橋 G3 Word Study 最常見的寫法）時，
     程式拿整串 'sh ch th' 去比對，**一個字都不符合**。
   ⚠ 它不是安靜壞掉（出卷頁會說「短文裡只有 0 個符合」），
     但老師看不出為什麼，所以這裡直接讓它支援。 */
function examCircleCheck(part) {
  /* v560：模型有時寫 mis-/en-/em- 或 mis- or en-——斜線、頓號、or 都當分隔 */
  const args = String((part && part.checkArg) || '').split(/[\s,，、\/|]+|\bor\b/i).map(x => x.trim()).filter(Boolean);
  return { kind: String((part && part.check) || '').toLowerCase(), args };
}
function examCircleHit(word, part) {
  /* ⚠ 一定要走 args 這條（不要傳第三個參數），否則又變成「只比這一整串」 */
  return window.wsCheck ? window.wsCheck(word, examCircleCheck(part)) : null;
}

/* 一大題「算幾分」——⭐ 只能有這一份。
   ⚠ 心情與目標不計分：examTotals（老師看到的合計）與 examScore（學生的滿分）
     各自判一次的話，老師會看到 60 分、學生拿到的滿分卻是 55，
     而且兩邊都「看起來正常」。 */
function examPtsOf(part) {
  if (!part || (EXAM_KINDS[part.kind] || {}).noScore) return 0;
  return +part.pts || 0;
}

/* 一大題有幾小題（算分用） */
function examPartN(part) {
  if (!part) return 0;
  if (part.kind === 'circle') return +part.need || (part.answers || []).length || 0;
  if (part.kind === 'cloze' || part.kind === 'spell') return (part.items || []).length;
  if (part.kind === 'vcewrite') return (part.groups || []).length * (+part.per || 2);
  if (part.kind === 'quiz')   return (part.questions || []).length;
  if (part.kind === 'short')  return (part.questions || []).length;
  if (part.kind === 'affix' || part.kind === 'genq') return +part.need || 2;
  /* 故事結構圖：三個格子各寫 N 句 → 總格數 = 區塊數 × 每格句數 */
  if (part.kind === 'storymap') return ((part.sections || EXAM_STORY_SECTIONS).length) * (+part.need || 2);
  if (part.kind === 'usewords') return +part.need || 2;
  if (part.kind === 'fixbox')   return (part.answers || []).length || +part.need || 5;
  if (part.kind === 'evidence') return +part.need || 2;
  if (part.kind === 'table')    return Math.max(1, Math.min(12, +part.need || +part.rows || 3));
  if (part.kind === 'draw')     return 1;
  if (part.kind === 'order')    return (part.events || []).length;
  if (part.kind === 'essay')    return 1;
  if (part.kind === 'checkin')  return 0;          // 不是題目，不計入題數
  return 0;
}

/* ── v522 ① 造字＋造句：一格的評分 ──────────────────────────────────
   回傳 { ok, why[] }。why 是「哪裡不符合考卷的規則」，結果頁要逐條寫給學生看。
   ⚠ 一格兩件事（字、句子）各算一半——只造出字沒寫句子不該是 0 分，
     那跟完全空白是不一樣的。 */
/* ══ v563 造字＋造句判分的三個 bug（Alan 拿真的題目測：empower 被判錯、misunderstand 被判錯）══════
   🔴 ① 本來要學生「先點一個字首按鈕」才算——沒點就是「沒有選字尾」（連這題考的是字首都寫成字尾），
        點的跟字不一樣（點 en-、造 empower）就是「empower 沒有 en-」。
        考卷上根本沒有「選按鈕」這一步，那是網站多加的。
      → 現在**從字本身認出用了哪個字首／字尾**（examAffixDetect），按鈕只是輔助、不再當條件。
   🔴 ② 句子裡寫 empowers／misunderstood… 被判「沒有用到 empower」——要吃變化形（examWordFormRe）。
   🔴 ③ 訊息一律寫「字尾」——現在字首就寫字首。 */
function examLoadDict() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.EN_DICT) return Promise.resolve(window.EN_DICT);
  if (window.__enDictP) return window.__enDictP;
  window.__enDictP = new Promise((resolve) => {
    const build = () => { window.EN_DICT = new Set(String(window.EN_WORDS_STR || '').split(' ')); resolve(window.EN_DICT); };
    if (window.EN_WORDS_STR) return build();
    const src = ((document.querySelector('script[src*="data.js"]') || {}).src || '');
    const v = (src.match(/\?v=\d+/) || [''])[0];                    // 跟網站同一個版本號，才不會吃到舊快取
    const sc = document.createElement('script');
    sc.src = 'data-words.js' + v;
    sc.onload = build;
    sc.onerror = () => { window.__enDictP = null; resolve(null); };  // 載不到就退回舊規則，下次再試
    document.head.appendChild(sc);
  });
  return window.__enDictP;
}
/* 這份考卷要不要先把字表載好才能公平計分？ */
function examNeedsDict(item) {
  return ((item && item.sections) || []).some(sc => (sc.parts || []).some(pt =>
    pt.kind === 'affix' || (pt.kind === 'circle' && /^(prefix|suffix)$/i.test(String(pt.check || '')))));
}
function examAffixZh(affixes) {
  const a = (affixes || []).map(x => String(x || '').trim()).filter(Boolean);
  const pre = a.filter(x => /-$/.test(x)).length, suf = a.filter(x => /^-/.test(x)).length;
  return pre && !suf ? '字首' : suf && !pre ? '字尾' : '字首／字尾';
}
/* 這個字用了清單裡的哪一個字首／字尾？沒有就回 ''。取最長的那個（un- 與 under- 不要搞混）。 */
function examAffixDetect(word, affixes) {
  const w = String(word || '').trim().toLowerCase();
  if (!/^[a-z'-]{3,}$/.test(w)) return '';
  let best = '';
  (affixes || []).map(x => String(x || '').trim()).filter(Boolean).forEach(a => {
    const kind = /^-/.test(a) ? 'suffix' : /-$/.test(a) ? 'prefix' : '';
    if (!kind || !WS_CHECKS[kind](w, a)) return;
    if (a.replace(/-/g, '').length > best.replace(/-/g, '').length) best = a;
  });
  return best;
}
/* 「這個字在句子裡有沒有出現」——吃常見的變化形：
   empower → empowers／empowered／empowering；misplace → misplaced／misplacing；carry → carries／carried */
function examWordFormRe(word) {
  const w = String(word || '').trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!w) return null;
  const alts = [w, w + '(?:s|es|ed|d|ing|ly)?'];
  if (/e$/.test(w)) alts.push(w.slice(0, -1) + '(?:ing|ed)');
  if (/y$/.test(w)) alts.push(w.slice(0, -1) + '(?:ies|ied|ying)');
  if (/([^aeiou])([aeiou])([^aeiouwxy])$/.test(w)) alts.push(w + w.slice(-1) + '(?:ed|ing)');   // stop → stopped／stopping
  return new RegExp('\\b(?:' + alts.join('|') + ')\\b', 'i');
}
function examAffixOne(slot, part) {
  const minW = +part.minWords || 5;
  const affixes = part.affixes || [];
  const picked = String((slot && slot.affix) || '').trim();      // 學生點的按鈕（只當輔助）
  const word = String((slot && slot.word) || '').trim();
  const sent = String((slot && slot.sentence) || '').trim();
  const zh = examAffixZh(affixes);
  const why = [];
  let half1 = false, half2 = false, affix = '';

  if (!word) why.push('沒有造字');
  else if (!/^[A-Za-z'-]{3,}$/.test(word)) why.push(`「${word}」看起來不是一個英文字`);
  else {
    affix = examAffixDetect(word, affixes);
    /* 清單裡認不出來、但他點的那個按鈕確實符合 → 也算（老師的清單可能沒列全） */
    if (!affix && picked) {
      const kind = /^-/.test(picked) ? 'suffix' : /-$/.test(picked) ? 'prefix' : '';
      if (kind && WS_CHECKS[kind](word, picked)) affix = picked;
    }
    if (!affix) {
      /* 開頭／結尾字母一樣，但拿掉之後剩下的不是字 → 講清楚為什麼（enemy ≠ en + emy） */
      const lw = word.toLowerCase();
      const near = _enReady() && affixes.map(a => String(a).trim()).find(a =>
        (/-$/.test(a) && lw.startsWith(a.replace(/-$/, '')) && lw.length > a.length - 1) ||
        (/^-/.test(a) && lw.endsWith(a.replace(/^-/, '')) && lw.length > a.length - 1));
      if (near) {
        const rest = /-$/.test(near) ? lw.slice(near.replace(/-$/, '').length) : lw.slice(0, lw.length - near.replace(/^-/, '').length);
        why.push(`「${word}」不算有 ${near}：拿掉 ${near} 之後剩下「${rest}」，不是一個英文字（${zh.split('／')[0]}要加在一個真的字上）`);
      } else {
        why.push(`「${word}」沒有用到 ${affixes.join('、')} 其中任何一個${zh.split('／')[0]}`);
      }
    } else half1 = true;
  }

  if (!sent) why.push('沒有造句');
  else {
    const n = sent.split(/\s+/).filter(Boolean).length;
    const re = examWordFormRe(word);
    const used = !!(re && re.test(sent));
    if (!used) why.push(`句子裡沒有用到「${word || '那個字'}」`);
    else if (n < minW) why.push(`句子只有 ${n} 個字，要 ${minW} 個字以上`);
    else half2 = true;
  }
  return { ok: half1 && half2, half1, half2, why, affix };
}

/* ── v522 ③ Generate Questions：程式驗得了的三件事 ──────────────────
   沒有問號／直接抄文章／太短。剩下「跟故事有沒有關」要 AI，不在這裡判。 */
function examGenqOne(text, part) {
  const q = String(text || '').trim();
  const why = [];
  if (!q) return { ok: false, why: ['沒有寫'] };
  if (!/[?？]\s*$/.test(q)) why.push('不是問句（要有問號）');
  const n = q.split(/\s+/).filter(Boolean).length;
  if (n < 4) why.push('太短了');
  /* 「not on the page」＝不可以整句抄文章。
     ⚠ 比對要把標點與大小寫拿掉，不然抄了只改一個逗號就躲過去。 */
  const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const pg = norm(part && part.passage);
  const qn = norm(q);
  if (qn && pg && qn.length > 12 && pg.indexOf(qn.replace(/\s*\?*$/, '')) >= 0) why.push('這句話是直接從文章抄下來的');
  return { ok: why.length === 0, why };
}

/* ══ v530 📋 Rubric 三項評分（康橋 Formative 的申論題就是這樣改的）════
   Alan 要的三項：Explanation（說明清楚）／Relevant（切題）／Effort（用心）。

   ⭐ 分工說得很清楚：
     · **程式**算總分（三項加起來照比例換算成這一題的分數）
     · **AI** 只給「建議」——每一項幾分、為什麼，而且要引用孩子自己寫的字
     · **老師**是最後一關，AI 的建議只是先填好，改幾分都可以
   ⚠ AI 的建議在老師按下確認之前，學生一個字都看不到。申論題是會被拿去
     跟家長討論的東西，不能讓沒人看過的機器分數直接變成成績。 */
const EXAM_RUBRIC = [
  { id: 'explain',  zh: '說明清楚', en: 'Explanation', tip: '有沒有把想法講完整、講得懂' },
  { id: 'relevant', zh: '切題',     en: 'Relevant',    tip: '有沒有回答到題目問的事' },
  { id: 'effort',   zh: '用心',     en: 'Effort',      tip: '有沒有認真寫、寫得夠' },
];
const EXAM_RUBRIC_MAX = 4;          // 每一項的滿分（老師可以在出卷時改）

/* ══ v536 多準則 Rubric（Alan 的 G5 寫作卷佔 45%，有七項）══════════
   ⭐ 康橋的寫作 rubric 不是 0~4 的連續分，是**四個等第**：
     Working Above(7) / Working At(5) / Working Below(3) / None(0)。
     硬塞成 0~7 的連續分，老師改的時候要自己換算，很容易點錯。
   ⚠ 準則清單與等第都存在**那一大題身上**——不同卷子的 rubric 不一樣，
     寫死在程式裡的話，下次他拿到別的格式又要改程式。 */
const EXAM_RUBRIC_SETS = {
  basic: {
    zh: '三項（說明／切題／用心）', max: 4, criteria: EXAM_RUBRIC,
    aiHint: 'Give FULL marks when the answer sensibly answers the question and says WHY / WHAT the question asks, even if it is short and simple (for example: descriptive language helps the reader picture, imagine or feel the scene). Do not ask for more length or detail than the question needs. '
      + 'Typical cases: (1) "What is the author\'s purpose?" — naming the purpose (to inform / entertain / persuade, or the same idea in the child\'s own words) is already a full-mark answer; a reason is a bonus, not required. '
      + '(2) "Write one detail from the story, then explain how it supports the purpose" — if the child gives ONE real detail from the passage (a quote or a paraphrase) and says, in any simple way, how it shows or supports the purpose, give top marks on all three criteria. '
      + '"Explanation" is full when the child says what the detail shows; "Relevant" is full when the detail really is in the passage and fits the question; "Effort" is full for a complete, readable answer — it does not need to be long or perfect. '
      + 'A short answer to a short question is NOT low effort: give "Effort" 5 whenever the child wrote a real, readable answer to what was asked, and never below 4 for that. '
      + 'If the child names the purpose in loose words ("to tell about him", "to teach us") that counts as naming it — give full marks. '
      + 'If the child gives a real detail AND says anything about what it shows, "Explanation" is 5 (do not hold back a point for style). '
      + 'Only go low when the answer is blank, off topic, a detail that is NOT in the passage, or has no explanation at all.',
  },
  writing: {
    zh: '康橋寫作七項', max: 7,
    bands: [
      { n: 7, zh: '很好',   en: 'Working Above' },
      { n: 5, zh: '達標',   en: 'Working At' },
      { n: 3, zh: '要加強', en: 'Working Below' },
      { n: 0, zh: '沒作答', en: 'None' },
    ],
    criteria: [
      { id: 'content',   zh: '內容',   en: 'Content',        tip: '旅程有沒有寫清楚' },
      { id: 'details',   zh: '細節',   en: 'Details',        tip: '場景／人物／旅程三樣寫了幾樣' },
      { id: 'creative',  zh: '創意',   en: 'Creativity',     tip: '讀起來有沒有吸引人' },
      { id: 'structure', zh: '結構',   en: 'Text Structure', tip: '開頭、事件順序、結尾' },
      { id: 'length',    zh: '長度',   en: 'Length',         tip: '五段，每段四句以上' },
      { id: 'grammar',   zh: '文法拼字', en: 'Grammar',      tip: '錯誤有沒有影響讀懂' },
      { id: 'vocab',     zh: '用字',   en: 'Vocabulary',     tip: '用到幾個這一課的單字' },
    ],
  },
};
/* v557 📝 摘要評分表（康橋 Grade 4：Summary Writing Rubric，共 10 分）
   ⭐ 跟前兩套不同：**每一項的滿分不一樣**（2/2/2/2/1/1），所以準則自己帶 max。
     沒帶 max 的準則照整套的 max（舊的兩套完全不受影響）。 */
EXAM_RUBRIC_SETS.summary = {
  zh: '摘要六項（康橋 Summary Rubric，10 分）', max: 2,
  aiHint: 'This is a SUMMARY of the passage. For beginning / middle / end: give FULL marks when the child clearly states that part (the cause, what happened, the result) in simple words — no extra detail is needed. "order" is full if the events go roughly in story order. "sent" is full if each detail is a sentence. "own" is full unless it is copied word for word. Go low ONLY when a part is truly missing, the text is copied, or it is absurd / unrelated to the passage.',
  criteria: [
    { id: 'begin',  zh: '開頭細節', en: 'Detail from the beginning', tip: '起因：有沒有寫到文章開頭的重要事情（寫到就給滿分，不用寫得很完整）', max: 2 },
    { id: 'middle', zh: '中間細節', en: 'Detail from the middle',    tip: '經過：有沒有寫到中間發生的重要事情', max: 2 },
    { id: 'end',    zh: '結尾細節', en: 'Detail from the end',       tip: '結果：有沒有寫到最後的結果', max: 2 },
    { id: 'order',  zh: '時間順序', en: 'Chronological order',       tip: '細節有沒有照事情發生的順序寫', max: 2 },
    { id: 'sent',   zh: '完整句子', en: 'Complete sentences',        tip: '每個細節是不是一句話（不是只有幾個字）。文法拼字錯誤不在這裡扣', max: 1 },
    { id: 'own',    zh: '自己的話', en: "Student's own words",       tip: '有沒有用自己的話寫，不是照抄',   max: 1 },
  ],
};
/* v571：表格填寫（每列 3 分＝找得對 1 ＋ 說得清楚 2）、畫圖（3 分＝細節 2 ＋ 場景 1）。
   ⚠ 跟摘要一樣每項滿分不同，所以準則自己帶 max。 */
EXAM_RUBRIC_SETS.table = {
  zh: '表格填寫（找字詞＋說明，每列 3 分）', max: 2,
  aiHint: 'Each answer is ONE row of a table: "descriptive word or phrase  ➜  what it helps me imagine". "find" is full if the left part is a reasonable descriptive wording that really appears in (or closely matches) the passage — an adjective, a vivid verb, a comparison. "explain" is full when the right part says, in any simple words, what it makes the reader see / hear / feel / imagine (for "blazing suns": "very hot and bright"). Do not demand a perfect sentence. Go low ONLY if the left part is not from the passage or not descriptive, or the right part is empty, unrelated, or just repeats the left.',
  criteria: [
    { id: 'find',    zh: '找得對',   en: 'Right word or phrase', tip: '左欄寫的是不是文章裡真的有的描述性字詞（形容詞、生動的動詞、比喻）', max: 1 },
    { id: 'explain', zh: '說得清楚', en: 'Clear explanation',    tip: '右欄有沒有說出這個字詞讓人想像到什麼（看到、聽到、感覺到）', max: 2 },
  ],
};
EXAM_RUBRIC_SETS.draw = {
  zh: '畫圖（細節＋場景，3 分）', max: 2,
  criteria: [
    { id: 'details', zh: '細節', en: 'Details from the sentences', tip: '有沒有畫出句子裡提到的東西', max: 2 },
    { id: 'scene',   zh: '場景', en: 'The final scene',            tip: '畫的是不是「最後那一句之後」的樣子', max: 1 },
  ],
};
/* v583（康橋 G4 Formative 2：Generate Questions，每題 7 分；Teacher's Marking Guide 四級 6-7／4-5／2-3／1）
   ⭐ 一題一個等第（7／5／3／1／0），跟寫作卷同一種「整套等第」。 */
EXAM_RUBRIC_SETS.genq = {
  zh: '自己出問題（根據文章，每題 7 分）', max: 7,
  bands: [
    { n: 7, zh: '清楚根據文章', en: 'Clearly about the story' },
    { n: 5, zh: '有問題但跟文章關係不大', en: 'A question, not really connected' },
    { n: 3, zh: '缺少重要資訊或抄別題', en: 'Missing vital info / copied' },
    { n: 1, zh: '沒寫問題或跟文章無關', en: 'None / not about the story' },
    { n: 0, zh: '沒作答', en: 'Blank' },
  ],
  criteria: [
    { id: 'story', zh: '根據文章', en: 'Question about the story', tip: '是不是一個合理、根據這篇文章資訊的問題' },
  ],
  aiHint: 'The child was asked to write ONE question about the passage (a question that is not already printed on the page). Give 7 whenever it is a real, sensible question that is clearly about information in THIS passage — even a simple who / what / where / why / how question, and even with small spelling or grammar mistakes (those are listed separately). Do not ask for a clever or hard question. Give 5 only if it is a question but hardly connected to the passage. Give 3 if it is missing vital information so it cannot be understood, or it is a sentence copied from the passage. Give 1 if it is not a question about the passage.',
};
/* 一大題要用哪一套 rubric。
   ⚠ 認不得就回 basic——不要回 undefined，下游會整個炸掉。 */
function examRubricOf(part) {
  const set = EXAM_RUBRIC_SETS[(part && part.rubricSet) || 'basic'] || EXAM_RUBRIC_SETS.basic;
  const max = +((part || {}).rubricMax) || set.max;
  /* 等第：有給就用給的，沒給就是 0~max 的整數（舊的三項卷照舊） */
  const bands = set.bands && set.bands.length
    ? set.bands
    : Array.from({ length: max + 1 }, (_, i) => ({ n: max - i, zh: '' }));
  return { key: (part && part.rubricSet) || 'basic', zh: set.zh, max, bands, criteria: set.criteria, aiHint: set.aiHint || '',
           hasBands: !!(set.bands && set.bands.length) };
}

/* ══ v565 文法／拼字的扣分（Alan：「不要設定太嚴格…文法錯誤、拼錯三個小錯才扣一分，不是一個錯扣一分」）══
   ⭐ 內容（起因／經過／結果、有沒有答到）照準則給分，**拼字文法不進準則**；
     小錯另外數，每 per 個扣 1 分，而且有上限（摘要題最多扣 1 分，其他寫作題最多 2 分）。
   ⚠ 「分」是這一題實際的 1 分，不是準則的一級。
   ⚠ 小錯的個數老師看得到、改得動（AI 數的只是建議）。 */
const EXAM_ERR_RULE = { per: 3, cap: { summary: 1, default: 2 } };
function examErrDeduct(n, rubricSet) {
  const cap = EXAM_ERR_RULE.cap[rubricSet] != null ? EXAM_ERR_RULE.cap[rubricSet] : EXAM_ERR_RULE.cap.default;
  return Math.min(cap, Math.floor(Math.max(0, +n || 0) / EXAM_ERR_RULE.per));
}
/* 一題的 rubric 分數 → 這一題拿幾分。
   ⚠ 三項都沒給分（老師還沒改）回 null，不要回 0——「還沒改」跟「改完 0 分」
     是兩件事，混在一起的話，沒改的孩子看起來就像被當掉了。 */
function examRubricPoints(mark, pts, max, criteria, rubricSet) {
  const cs = (criteria && criteria.length) ? criteria : EXAM_RUBRIC;
  const m = max || EXAM_RUBRIC_MAX;
  if (!mark) return null;
  const vals = cs.map(c => mark[c.id]);
  if (vals.every(v => v == null || v === '')) return null;
  /* v557：每一項可以有自己的滿分（摘要評分表 2/2/2/2/1/1）；沒寫 max 的照整套的 */
  const capOf = (c) => +c.max || m;
  const sum = cs.reduce((a, c, i) => a + Math.max(0, Math.min(capOf(c), +vals[i] || 0)), 0);
  const full = cs.reduce((a, c) => a + capOf(c), 0);
  const base = (+pts || 0) * sum / full;
  const ded = examErrDeduct(mark._errN, rubricSet);          // v565：小錯每 3 個扣 1 分（有上限）
  return Math.max(0, Math.round((base - ded) * 10) / 10);
}

/* 整個 short 大題：每一小題的 rubric 加起來。回傳 { got, max, done, per[] } */
function examRubricPart(part, marks) {
  const qs = (part && part.questions) || [];
  const R = examRubricOf(part);
  const max = R.max;
  const each = qs.length ? (+part.pts || 0) / qs.length : 0;
  const per = qs.map((q, i) => examRubricPoints((marks || {})[i], +q.pts || each, max, R.criteria, part.rubricSet));
  const done = per.filter(v => v != null).length;
  return {
    got: Math.round(per.reduce((a, v) => a + (v || 0), 0) * 10) / 10,
    max: +part.pts || 0, done, total: qs.length, per,
  };
}

const AI_RUBRIC_SYS = `You help a Taiwanese elementary English teacher mark one piece of student writing.
You give a SUGGESTION only; the teacher decides the final mark.

Score each of these. Allowed scores: {BANDS}
{CRITERIA}

🔴 BE GENEROUS. The teacher's rule: "if the answer reaches the standard it should have, give a HIGH score."
- For every criterion, give the TOP score whenever the child clearly does what the criterion asks. Go lower only
  when the requirement is clearly MISSING or clearly wrong — not because it could be better, longer, or fancier.
- Judge the CONTENT and the THINKING. The writer is 8–12 and learning English. A short, simple, correct answer
  deserves full marks. Never lower a content score because of spelling, grammar, handwriting-style or word choice.
- When two scores are both defensible, pick the higher one.
- "Meets the standard" = the TOP score. If the bands have names like "Working At" or 達標 and the child meets
  that standard, give the highest band — keep the lower bands for answers that clearly fall short of it.
- A criterion about grammar / spelling / mistakes: do NOT lower it for a few small errors (those are listed
  separately below and handled by the website). Lower it only when the errors make the writing hard to understand.
- Generous is NOT the same as inventing. If a required element is simply NOT in the child's text (for example the
  child never says how it ended or who won, or never mentions the beginning), that criterion is NOT met: score it
  low, however nice the rest is. Check each required element against the actual words before you give it full marks.
- A summary / story only needs its cause (起因), what happened (經過) and the result (結果) to be clearly stated,
  in the child's own simple words, to earn full marks on those.

SPELLING & GRAMMAR are NOT part of the scores above. Instead, list the small errors you see in "errors":
- Only REAL small errors: a misspelled word, a wrong verb form, a missing "s", a missing capital at the start
  of a sentence, a missing period. Not style, not "could be better", not different-but-correct phrasing.
- Each: {"w":"<the wrong words EXACTLY as the child wrote them, 1-4 words>","fix":"<the correct form>"}.
  "w" MUST be copied letter for letter from the child's text. At most 12. If there are none, [].
- Do NOT count the same mistake twice. Do NOT list things that are correct.
The website turns the number of errors into a small deduction (3 small errors = 1 point). You do not do that.

"why" for each score: ONE short Traditional Chinese sentence (≤22 characters), said kindly, to the teacher.
"quote": copy 3 to 8 words EXACTLY as the child wrote them (same spelling, even if wrong).
  Pick the words your scores are based on. If the answer is too short to quote, use "".
"next": ONE short Traditional Chinese sentence (≤24 characters) — one kind thing to tell the child.
Return ONLY JSON — one key per criterion id listed above, plus "errors", "quote" and "next":
{"<id>":{"n":0,"why":""}, ..., "errors":[{"w":"","fix":""}], "quote":"", "next":""}`;

/* AI 先改一題。回 null ＝「這題 AI 不給建議」，老師自己改。
   ⚠⚠ 一定要驗 quote：把「引用孩子寫的字」當成**接地檢查**——
     引不出孩子真的寫過的連續字串，就代表它在憑空評論，整份建議作廢。
     （跟 v407 的分段閱讀出題用同一招。） */
/* v565：等第名稱（Working Above／At／Below）會讓 AI 把「達標」放在中間，結果合格的孩子只拿到次高等第。
   老師的規則是「達到應有的標準就給高分」——所以給 AI 看的等第說明改成：最高＝達到或超過標準。
   ⚠ 只改給 AI 看的文字；老師畫面上的等第名稱與分數不變。 */
const LENIENT_BAND_TEXT = {
  6: ['TOP: the basic requirement is met (meets OR beats the standard for a child this age)', 'met, with one small gap', 'partly met', 'weak: simple and missing some details', 'mostly off topic or hard to read', 'nothing written'],
  5: ['TOP: a reasonable question clearly about the passage', 'a question, but hardly connected', 'missing vital information or copied', 'not a question about the passage', 'nothing written'],
  4: ['TOP: meets OR beats the standard expected of a child this age', 'almost there — one clear gap', 'well below the standard', 'nothing written / off-topic'],
};
async function aiGradeRubric(question, answer, { max = EXAM_RUBRIC_MAX, keyPoints = '', part = null, passage = '' } = {}) {
  /* v536：準則不再寫死三項——那一大題用哪一套就照哪一套問。 */
  const R = examRubricOf(part || { rubricMax: max });
  const ans = String(answer == null ? '' : answer).trim();
  const words = ans.split(/\s+/).filter(Boolean);
  /* 幾乎空白的就不要問 AI 了——問了也只會得到「請再寫多一點」，白花一次呼叫 */
  if (words.length < 3) {
    const zero = { ai: true, quote: '', next: '先試著寫一句完整的話。' };
    R.criteria.forEach(c => { zero[c.id] = { n: 0, why: '幾乎沒有寫' }; });
    return zero;
  }
  const sys = AI_RUBRIC_SYS
    .replace('{BANDS}', R.criteria.some(c => c.max) && !R.hasBands
      ? 'each criterion has its own range, given after it'
      : R.bands.map((b, bi) => b.n + (LENIENT_BAND_TEXT[R.bands.length] ? ` (${LENIENT_BAND_TEXT[R.bands.length][bi]})` : (b.en ? ` (${b.en})` : ''))).join(' / '))
    .replace('{CRITERIA}', R.criteria.map(c => `- ${c.id} : ${c.en} — ${c.tip}` + (c.max && !R.hasBands ? ` (allowed: 0 to ${c.max})` : '')).join('\n'))
    .replace(/\{MAX\}/g, String(R.max))
    + (R.aiHint ? `\n\nSPECIAL RULE FOR THIS KIND OF ANSWER (the teacher wants generous marking):\n${R.aiHint}` : '')
    + (part && part.aiRule ? `\n\nTHE TEACHER'S OWN RULE FOR THIS QUESTION (follow it; it overrides the generic rules above, but never invent things the child did not write):\n${String(part.aiRule).slice(0, 600)}` : '');
  /* v565：孩子讀的那一篇也給 AI——沒有它，AI 不知道這篇的「起因／經過／結果」是什麼，
     孩子寫沒寫到它只能憑感覺放（實測：完全沒寫結果的摘要也拿到結果項滿分）。 */
  const msg = (passage ? `THE PASSAGE THE CHILD READ (use it to check what the beginning, middle and end really are):\n${String(passage).slice(0, 4000)}\n\n` : '') +
    `QUESTION: ${question || ''}\n` +
    (keyPoints ? `WHAT A GOOD ANSWER MENTIONS: ${keyPoints}\n` : '') +
    `\nTHE CHILD WROTE:\n${ans}`;
  let got = null;
  /* v565：多了小錯清單（最多 12 條）＋每項的理由，500 會被截斷、整份 JSON 讀不出來 */
  try { got = await _gnCall(sys, msg, 1400); } catch (e) { return null; }
  if (!got || typeof got !== 'object') return null;

  const out = { ai: true };
  const allowed = new Set(R.bands.map(b => +b.n));
  for (const c of R.criteria) {
    const r = got[c.id];
    if (!r || r.n == null) return null;
    const n = Math.round(+r.n);
    /* ⚠ 不只要在範圍內，還要是**允許的等第**——康橋寫作卷只有 7/5/3/0，
       模型回一個 6 的話老師在畫面上根本點不到那一格。 */
    const okN = (c.max && !R.hasBands) ? (n >= 0 && n <= c.max) : allowed.has(n);
    if (!isFinite(n) || !okN) return null;
    out[c.id] = { n, why: String(r.why || '').trim().slice(0, 40) };
    if (!out[c.id].why) return null;
  }
  /* 接地：引用的字要真的出現在孩子寫的東西裡（忽略大小寫與標點） */
  const flat = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const q = flat(got.quote);
  /* v571：引用至少幾個字，看孩子寫了多少——表格每一格只有兩三個字（"blazing suns"），
     硬要引 3 個字以上，AI 只好引到別格或編一段，整份建議就被丟掉（實測：好答案回「不可靠」）。
     短答案引 1~2 個字就夠；長答案才要 3 個字以上。引的字仍然必須是孩子真的寫過的。 */
  const aw = words.length, minQ = aw <= 10 ? 1 : (aw <= 25 ? 2 : 3);
  /* v575：表格的答案是「左欄 ➜ 右欄」串起來的——AI 常把兩欄的字接成一句引用（跳過中間的箭頭）。
     表格答案改成「引用的每個字都要按順序出現在孩子寫的字裡」，仍然不能編孩子沒寫過的字。 */
  const inOrder = (qq, aa) => { let i = 0; const A = aa.split(' '); for (const w of qq.split(' ')) { const j = A.indexOf(w, i); if (j < 0) return false; i = j + 1; } return true; };
  const grounded = flat(ans).indexOf(q) >= 0 || (/➜/.test(ans) && inOrder(q, flat(ans)));
  if (!q || q.split(' ').length < minQ || !grounded) return null;
  out.quote = String(got.quote).trim();
  out.next = String(got.next || '').trim().slice(0, 40);
  /* v565：小錯清單也要「接地」——AI 說的錯，必須是孩子真的寫過的字（而且跟它給的改正不同），
     不然憑空編出幾個錯就會害孩子被扣分。查不到的整條丟掉，數量以查得到的為準。 */
  const seen = new Set();
  out._errList = (Array.isArray(got.errors) ? got.errors : []).map(e => ({
    w: String((e && e.w) || '').trim(), fix: String((e && e.fix) || '').trim(),
  })).filter(e => {
    const k = flat(e.w);
    if (!k || k === flat(e.fix) || seen.has(k) || flat(ans).indexOf(k) < 0) return false;
    seen.add(k); return true;
  }).slice(0, 12);
  out._errN = out._errList.length;
  /* 寫作七項裡有一項「文法」：小錯已經另外算（3 個扣 1 分），這裡再扣一次就是扣兩次。
     小錯 5 個以內 → 這一項給最高等第；錯到影響閱讀才讓 AI 自己的判斷留著。
     ⚠ 這是程式決定的，不靠 AI 聽不聽話。 */
  const gc = R.criteria.find(c => c.id === 'grammar');
  if (gc && out.grammar && out._errN <= 5) {
    const top = Math.max.apply(null, R.bands.map(b => +b.n));
    if (out.grammar.n < top) out.grammar = { n: top, why: '拼字文法的小錯另外計算，這一項不重複扣' };
  }
  return out;
}

/* v575（Alan：「記住要 AI 改，給 AI 設定規則」）：交卷時就由 AI 把手寫題先改好。
   w ＝ examWritten 的一大題（{ passage, rubricSet, rubricMax, qs:[{q,keyPoints,a}] }）。
   回傳 byPart 陣列（跟老師批改存的格式一樣：每題 { 各準則分數, note, _ai, _errN, _errList… }），
   某一題 AI 沒給出可靠的結果就是 null（那題照舊等老師改）。畫圖不改。 */
async function examAiMarkPart(w) {
  if (!w || w.rubricSet === 'draw') return null;
  const R = examRubricOf(w);
  const qs = w.qs || [];
  const out = await Promise.all(qs.map(async (q) => {
    if (q.img) return null;
    try {
      const ask = () => aiGradeRubric(q.q, q.a, { max: R.max, keyPoints: q.keyPoints, part: w, passage: w.passage || '' });
      /* AI 偶爾引用不到孩子真的寫過的字（建議作廢）——再問一次，兩次都不行才留給老師 */
      const got = (await ask()) || (await ask());
      if (!got) return null;
      const m = { note: got.next || '', _ai: true };
      R.criteria.forEach(c => { m[c.id] = got[c.id] ? got[c.id].n : 0; });
      m._why = R.criteria.map(c => `${c.zh}：${(got[c.id] || {}).why || ''}`).join('　');
      m._quote = got.quote || '';
      m._errN = got._errN || 0;
      m._errList = got._errList || [];
      return m;
    } catch (e) { return null; }
  }));
  return out.some(Boolean) ? out : null;
}

/* ══ v536 📊 故事結構圖（Beginning / Middle / End）════════════════
   Alan 的 G5 期中卷 Part II：三個格子，每格寫 2 句，佔 15%。
   ⭐ 程式驗得出來的是**形式**：寫滿了沒、是不是完整的句子、夠不夠長，
     以及「有沒有真的在講這篇文章」（句子裡至少要出現文章裡的一個實詞）。
   ⚠ 「寫得對不對」程式判不了——那是老師看的，所以這一題的分數只給到
     「有沒有照規則寫」，跟老師在紙上一格一個勾是同一件事。 */
const EXAM_STORY_SECTIONS = [
  { id: 'begin',  zh: '開頭', en: 'Beginning', q: 'What happens in the beginning?' },
  { id: 'middle', zh: '中間', en: 'Middle',    q: 'What happens in the middle?' },
  { id: 'end',    zh: '結尾', en: 'End',       q: 'What happens in the end?' },
];
/* 文章裡「值得當作接地依據」的字：去掉常見虛詞，只留實詞。 */
const _EXAM_STOP = new Set(('a an the and or but so of to in on at for with from by as is are was were be been '
  + 'this that these those it its he she they them his her their you your i we our not no do does did have has had '
  + 'will would can could should may might there here when while after before then than').split(' '));
/* ⚠⚠ 比對一定要用**字根**，不要用整個字。
   實測：文章寫 painting / painted，孩子寫 "She became a famous painter."
   用整字比對會判成「不是在講這篇文章」——但那是**他自己用話講出來**的，
   正是摘要題要的東西。（v415 的「抽象型答案被 grounding 誤擋」同一類。） */
function _examStem(w) {
  return String(w).replace(/(iness|ingly|ness|ment|ing|ers|er|est|ed|es|s|y|ies)$/i, '')
    .replace(/i$/, '') || String(w);
}
function _examContentWords(t) {
  return [...new Set(String(t || '').toLowerCase().match(/[a-z']{3,}/g) || [])]
    .filter(w => !_EXAM_STOP.has(w))
    .map(_examStem)
    .filter(w => w.length >= 3);
}
function examStoryOne(text, part) {
  const t = String(text == null ? '' : text).trim();
  const minW = +part.minWords || 4;
  const why = [];
  if (!t) return { ok: false, why: ['沒有寫'] };
  const n = t.split(/\s+/).filter(Boolean).length;
  if (n < minW) why.push(`只有 ${n} 個字，要 ${minW} 個字以上`);
  /* ⚠ 一格只能寫**一句**——兩句擠在一格會讓老師沒辦法一句一句看。
     判斷用句號/問號/驚嘆號，而且結尾那一個不算。 */
  const ends = (t.replace(/[.!?]+\s*$/, '').match(/[.!?]/g) || []).length;
  if (ends > 0) why.push('一格寫一句就好');
  /* 接地：有給文章的話，句子裡至少要有文章裡的一個實詞（比字根）。
     ⚠ 只有在「一個都對不上」而且他真的寫了幾個實詞時才算——
       寫得太短本來就會被上面那條字數規則抓到，不要罰兩次。 */
  const src = new Set(_examContentWords(part.passage));
  if (src.size) {
    const mine = _examContentWords(t);
    if (mine.length >= 2 && !mine.some(w => src.has(w))) why.push('這句話好像不是在講這篇文章');
  }
  return { ok: why.length === 0, why };
}

/* ══ v536 ✍️ 用詞庫的字造句 ══════════════════════════════════════
   Alan 的文法卷 C：從 extreme / protect / shelter 裡挑，每句至少 6 個字，
   可以加連接詞。跟 v522 的「造字＋造句」不同——這裡**不用造字**。 */
/* v620 VCe 自己選字造字＋造句：第 i 格屬於第 floor(i/per) 個母音。
   字要符合 VCe（WS_CHECKS.vce）、中間那個母音要對（Long a → a_e）、不能用 Part A 的字（exclude）、
   同一個字不能用兩次；句子要用到那個字（吃變化形）而且夠長。 */
function examVceWriteOne(slot, part, i, used) {
  const per = +part.per || 2, minW = +part.minWords || 3;
  const vow = (part.groups || [])[Math.floor(i / per)] || '';
  const word = String((slot && slot.word) || '').trim();
  const sent = String((slot && slot.sentence) || '').trim();
  const key = word.toLowerCase();
  const why = [];
  if (!word) why.push('沒有寫字');
  else if (!/^[A-Za-z]{3,}$/.test(word)) why.push(`「${word}」看起來不是一個英文字`);
  else if (!WS_CHECKS.vce(word)) why.push(`「${word}」不是 VCe（母音-子音-e 結尾）`);
  else if (vow && key.replace(/e$/, '').slice(-2, -1) !== vow) why.push(`「${word}」的長母音不是 ${vow}`);
  else if ((part.exclude || []).indexOf(key) >= 0) why.push(`「${word}」是 Part A 的字，這題要自己想別的`);
  else if (used && used.has(key)) why.push(`「${word}」前面已經用過了`);
  const wordOk = why.length === 0;
  if (!sent) why.push('沒有造句');
  else {
    const n = sent.split(/\s+/).filter(Boolean).length;
    const re = examWordFormRe(word);
    if (!(re && re.test(sent))) why.push(`句子裡沒有用到「${word || '那個字'}」`);
    else if (n < minW) why.push(`句子只有 ${n} 個字，要 ${minW} 個字以上`);
  }
  if (wordOk && word && used) used.add(key);
  return { ok: why.length === 0, why, vow };
}

function examUseWordOne(slot, part) {
  const minW = +part.minWords || 6;
  const bank = (part.bank || []).map(w => String(w || '').trim()).filter(Boolean);
  const word = String((slot && slot.word) || '').trim();
  const sent = String((slot && slot.sentence) || '').trim();
  const why = [];
  if (!word) why.push('沒有挑字');
  else if (bank.length && !bank.some(b => b.toLowerCase() === word.toLowerCase())) {
    why.push(`「${word}」不在詞庫裡`);
  }
  if (!sent) why.push('沒有造句');
  else {
    const n = sent.split(/\s+/).filter(Boolean).length;
    /* ⚠ 要比對的是「這個字的任何變化」——protect / protects / protected 都算，
       不然孩子寫對了卻被判沒用到。 */
    const stem = word.replace(/(ing|ed|es|s)$/i, '');
    const used = word && new RegExp('\\b' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]{0,3}\\b', 'i').test(sent);
    if (!used) why.push(`句子裡沒有用到「${word || '那個字'}」`);
    else if (n < minW) why.push(`句子只有 ${n} 個字，要 ${minW} 個字以上`);
  }
  return { ok: why.length === 0, why };
}

/* ══ v538 📦 找出錯的字，填進格子 ═════════════════════════════════
   Alan 的文法卷 C：「找出 5 個大小寫錯誤，把改好的字寫進格子裡」。
   跟 v467 的「整段改錯」不同——那個是整段重寫，這個的作答是**一排格子**。
   ⚠ 比對要**不管順序**：孩子從頭讀下來，找到的順序不一定跟老師寫答案的順序一樣，
     照順序比的話第一個找錯位置後面就全錯了（那不是他的錯）。
   ⚠ 大小寫**要比**——這一題考的就是大小寫，忽略大小寫等於這題沒意義。 */
function examFixBoxScore(part, ans) {
  const want = (part.answers || []).map(x => String(x || '').trim()).filter(Boolean);
  const got = (Array.isArray(ans) ? ans : []).map(x => String(x || '').trim());
  const left = want.slice();
  return got.map(g => {
    if (!g) return { got: g, ok: false, why: ['沒有寫'] };
    const i = left.findIndex(w => w === g);                 // ⚠ 這一題大小寫要一模一樣
    if (i >= 0) { left.splice(i, 1); return { got: g, ok: true, why: [] }; }
    const loose = want.findIndex(w => w.toLowerCase() === g.toLowerCase());
    return { got: g, ok: false,
             why: [loose >= 0 ? '這個字對了，但大小寫不對' : '這個字不在答案裡'] };
  });
}

/* ══ v538 🔍 用文章裡的 N 個細節回答 ═══════════════════════════════
   Alan 的企鵝卷：「Use two specific details from the text to explain…」
   ⭐ 程式驗得出來的正是這題的重點：**有沒有真的從文章裡抄出證據**
     （連續三個字以上出現在原文裡），以及是不是完整的句子。
   ⚠ 兩格引用同一句話不算兩個細節——「兩個」就是兩個。 */
function _evSentences(passage) {
  /* 把文章切成句子。⭐ 判「是不是同一個細節」要以**句子**為單位，
     不是以字串像不像為單位——見下面 examEvidenceOne 的說明。 */
  const flat = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  return String(passage || '').split(/(?<=[.!?])\s+/)
    .map(x => flat(x)).filter(Boolean);
}
function examEvidenceOne(text, part, usedQuotes) {
  const t = String(text == null ? '' : text).trim();
  const why = [];
  if (!t) return { ok: false, why: ['沒有寫'], quote: '' };
  const minW = +part.minWords || 5;
  const n = t.split(/\s+/).filter(Boolean).length;
  if (n < minW) why.push(`只有 ${n} 個字，要寫完整的句子（${minW} 個字以上）`);
  /* 找出他引用了原文的哪一段（最長的那一段連續字） */
  const flat = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const src = flat(part.passage);
  const mine = flat(t).split(' ').filter(Boolean);
  let best = '';
  for (let i = 0; i < mine.length; i++) {
    for (let j = i + 3; j <= mine.length; j++) {
      const seg = mine.slice(i, j).join(' ');
      if (src.indexOf(seg) < 0) break;
      if (seg.length > best.length) best = seg;
    }
  }
  /* 這段引用是文章裡的**第幾句**——「兩個細節」就是兩句話講的兩件事。
     🔴 這裡換過兩次做法，兩次都被真的作答打敗：
       ① 只比字串相等：一句引到 …fat called blubber、一句引到 …fat，
          字串不同就放過了。
       ② 改成「有包含關係就算重複」：還是擋不掉**同一句的前半與後半**——
          「use the sun and the pull of the earth」＋「to find the same trees」
          兩段在原文裡根本不重疊，卻是同一件事。
     ⭐ 所以改成問「你指的是文章裡的哪一句」：同一句＝同一個細節。
     ⚠ 這是一條**要講出來**的規則（學生端寫了「兩個細節要來自不同的句子」），
       不能當成暗樁——不然孩子只會覺得「我明明有寫為什麼不給分」。 */
  const sents = _evSentences(part.passage);
  const si = best ? sents.findIndex(x => x.indexOf(best) >= 0) : -1;
  if (!src) { /* 沒給文章就不驗引用 */ }
  else if (!best) why.push('這一句沒有從文章裡找證據');
  else if (usedQuotes && [...usedQuotes].some(u => {
    const q = typeof u === 'string' ? u : u.q;
    const s2 = typeof u === 'string' ? -1 : u.si;
    if (si >= 0 && s2 >= 0 && si === s2) return true;          // 同一句＝同一個細節
    return q.indexOf(best) >= 0 || best.indexOf(q) >= 0;       // 一段包住另一段
  })) {
    why.push('這個細節前面已經用過了，要換文章裡另一句話');
  }
  return { ok: why.length === 0, why, quote: best, si };
}

/* ══ v538 ✍️ 長文寫作：段落與句數（老師改，程式只幫忙數）═══════════
   Alan 的 G5 寫作卷佔 45%，rubric 裡的 Length 寫的是「5 段 AND 每段 4 句」。
   ⚠ 這一題**不自動給分**——寫得好不好是老師看的。程式只把「幾段、每段幾句、
     用了幾個這一課的單字」算給他看，那正是 rubric 裡數得出來的那幾項。 */
function examEssayStats(text, part) {
  const paras = String(text || '').split(/\n\s*\n|\n/).map(x => x.trim()).filter(Boolean);
  const sents = paras.map(p => (p.match(/[^.!?]+[.!?]/g) || (p ? [p] : [])).length);
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  const bank = (part.vocab || []).map(w => String(w || '').trim()).filter(Boolean);
  const low = String(text || '').toLowerCase();
  const used = bank.filter(w => new RegExp('\\b' + w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]{0,3}\\b').test(low));
  return {
    paras: paras.length, sents, words, used,
    needParas: +part.paras || 5, needSents: +part.sentsPerPara || 4,
    shortParas: sents.filter(n => n < (+part.sentsPerPara || 4)).length,
  };
}

/* 整份考卷的配分盤點——老師要能一眼看出「這份加起來是不是 100 分」 */
function examTotals(item) {
  const secs = (item && item.sections) || [];
  let auto = 0, manual = 0, parts = 0;
  secs.forEach(sec => (sec.parts || []).forEach(pt => {
    parts++;
    const pts = examPtsOf(pt);
    if ((EXAM_KINDS[pt.kind] || {}).auto) auto += pts; else manual += pts;
  }));
  return { auto, manual, total: auto + manual, sections: secs.length, parts };
}

/* v557 事件排順序：給學生看的「打亂後的順序」。
   ⭐ 用事件文字做種子的固定洗牌——同一題每次重畫都一樣（不然每打一個字題目就重新洗牌），
     而且保證**不會剛好等於正確順序**（等於把答案直接送給他）。
   回傳原始索引的陣列，例如 [2,0,3,1]＝畫面第一列放第 2 個事件。 */
function examOrderShuffle(events) {
  const n = (events || []).length;
  const idx = Array.from({ length: n }, (_, i) => i);
  let h = 2166136261;
  String((events || []).join('|')).split('').forEach(c => { h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; });
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; h = (h ^ (h >>> 16)) >>> 0; return h / 4294967296; };
  for (let k = 0; k < 8; k++) {
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    if (n < 2 || idx.some((v, i) => v !== i)) break;
  }
  if (n >= 2 && idx.every((v, i) => v === i)) idx.push(idx.shift());   // 最後保底
  return idx;
}

/* 一大題算幾分。回傳 { got, max, n, right, detail }
   detail 是每一小題對不對，結果頁要逐題標。 */
function examScorePart(part, ans) {
  const max = examPtsOf(part);
  const n = examPartN(part);
  const out = { got: 0, max, n, right: 0, detail: [] };
  /* ⚠ 心情與目標要寫在 `if (!n)` **前面**：它的題數本來就是 0
     （不是題目），被那一行攔下來就等於這個分支永遠跑不到。 */
  if (part.kind === 'checkin') {
    out.detail = [{ ok: null, got: ans || null }];   // 收下來給老師看，不給分
    return out;
  }
  if (!n) return out;
  const norm = (t) => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9']/g, '');

  if (part.kind === 'circle') {
    /* 圈選：圈對幾個就幾分。⚠ 圈錯的要扣回來，不然整篇全部圈起來就滿分。
       ⚠ wsCheck 的簽名是 (word, check, one)，而且 check 是**物件**不是字串
         —— 傳錯會一路回 null，然後每一個字都被當成圈錯（第一版就是這樣 0 分）。
       ⚠ null ＝「這條規則程式判不出來」，那種不能算學生錯。 */
    const picked = Array.isArray(ans) ? ans : [];
    const ok = (w) => examCircleHit(w, part);
    let right = 0, wrong = 0;
    picked.forEach(w => { const v = ok(w); if (v === true) right++; else if (v === false) wrong++; });
    out.right = Math.max(0, right - wrong);
    out.detail = picked.map(w => ({ text: w, ok: ok(w) }));
  } else if (part.kind === 'spell') {
    (part.items || []).forEach((q, i) => {
      const got = norm((ans || [])[i]);
      const good = !!got && [q.answer].concat(q.accept || []).some(a => norm(a) === got);
      if (good) out.right++;
      out.detail.push({ text: q.answer, ok: good, got: (ans || [])[i] || '' });
    });
  } else if (part.kind === 'cloze') {
    (part.items || []).forEach((q, i) => {
      const good = norm((ans || [])[i]) === norm(q.answer);
      if (good) out.right++;
      out.detail.push({ text: q.answer, ok: good, got: (ans || [])[i] || '' });
    });
  } else if (part.kind === 'quiz') {
    (part.questions || []).forEach((q, i) => {
      const good = (ans || [])[i] === q.answer;
      if (good) out.right++;
      out.detail.push({ text: (q.options || [])[q.answer], ok: good,
                        got: (q.options || [])[(ans || [])[i]] || '' });
    });
  } else if (part.kind === 'affix') {
    /* 一格兩半：造字一半、造句一半。右邊那半要用到左邊造的字，所以順序不能顛倒。 */
    let halves = 0;
    for (let i = 0; i < n; i++) {
      const r = examAffixOne((ans || [])[i], part);
      halves += (r.half1 ? 1 : 0) + (r.half2 ? 1 : 0);
      out.detail.push({ ok: r.ok, why: r.why, got: (ans || [])[i] || null, affix: r.affix || '' });
    }
    /* 考卷寫 "two of the suffixes" ——兩格選同一個字尾不算兩種。
       ⚠ 這是**整大題**的問題，不是某一格的問題，所以記在 note 上，
         不要把兩格都標成錯（學生會以為自己兩個字都造錯了）。 */
    /* v563：用「從字認出來的」，不是他點的按鈕——他可能根本沒點 */
    const picked = out.detail.map(d => d.affix).filter(Boolean);
    const dup = picked.length > new Set(picked).size;
    if (dup) out.note = `這一大題要用「兩個不一樣的${examAffixZh(part.affixes)}」，你兩個字用了同一個（${picked[0]}）。`;
    out.right = Math.round(halves / 2 * 10) / 10;
    out.got = Math.round(max * (halves / (n * 2)) * (dup ? 0.5 : 1));
    return out;
  } else if (part.kind === 'genq') {
    for (let i = 0; i < n; i++) {
      const r = examGenqOne((ans || [])[i], part);
      if (r.ok) out.right++;
      out.detail.push({ ok: r.ok, why: r.why, got: (ans || [])[i] || '' });
    }
    out.got = Math.round(max * (out.right / n));
    return out;
  } else if (part.kind === 'storymap') {
    /* 三個格子 × 每格 N 句，一格一分。ans = { begin:[...], middle:[...], end:[...] } */
    const secs = part.sections || EXAM_STORY_SECTIONS;
    const per = +part.need || 2;
    secs.forEach(sec => {
      const got = ((ans || {})[sec.id]) || [];
      for (let i = 0; i < per; i++) {
        const r = examStoryOne(got[i], part);
        if (r.ok) out.right++;
        out.detail.push({ sec: sec.id, ok: r.ok, why: r.why, got: got[i] || '' });
      }
    });
    out.got = Math.round(max * (out.right / n));
    return out;
  } else if (part.kind === 'vcewrite') {
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const slot = (ans || [])[i] || {};
      const r = examVceWriteOne(slot, part, i, used);
      if (r.ok) out.right++;
      out.detail.push({ ok: r.ok, why: r.why, got: [slot.word, slot.sentence].filter(Boolean).join('：') });
    }
    out.got = Math.round(max * (out.right / n));
    return out;
  } else if (part.kind === 'usewords') {
    /* ⚠ 同一個字不可以用兩次（考卷寫的是「挑兩個」）——重複的那一格不給分。 */
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const slot = (ans || [])[i] || {};
      const r = examUseWordOne(slot, part);
      const key = String(slot.word || '').toLowerCase();
      const dup = !!key && used.has(key);
      if (key) used.add(key);
      if (dup) r.why = (r.why || []).concat(['這個字前面已經用過了']);
      const okk = r.ok && !dup;
      if (okk) out.right++;
      out.detail.push({ ok: okk, why: r.why, got: slot.sentence || '' });
    }
    out.got = Math.round(max * (out.right / n));
    return out;
  } else if (part.kind === 'order') {
    /* v557：ans[i] = 學生寫在「第 i 個事件（正確順序）」旁邊的數字；對＝剛好是 i+1。
       ⚠ 空白、小數、超出範圍都算錯；不扣重複——重複的數字本來就不可能每個都對。 */
    (part.events || []).forEach((ev, i) => {
      const got = parseInt(String((ans || [])[i] == null ? '' : (ans || [])[i]).trim(), 10);
      const good = got === i + 1;
      if (good) out.right++;
      out.detail.push({ ok: good, text: ev, got: isFinite(got) ? String(got) : '', why: good ? [] : ['應該是 ' + (i + 1)] });
    });
  } else if (part.kind === 'fixbox') {
    out.detail = examFixBoxScore(part, ans);
    out.right = out.detail.filter(d => d.ok).length;
    out.got = Math.round(max * (out.right / n));
    return out;
  } else if (part.kind === 'evidence') {
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const r = examEvidenceOne((ans || [])[i], part, used);
      if (r.quote) used.add({ q: r.quote, si: r.si });
      if (r.ok) out.right++;
      out.detail.push({ ok: r.ok, why: r.why, got: (ans || [])[i] || '', quote: r.quote });
    }
    out.got = Math.round(max * (out.right / n));
    return out;
  } else if (part.kind === 'table' || part.kind === 'draw') {
    /* v571：表格與畫圖都是老師改的——程式只把作答收起來，不給分 */
    out.detail = [{ ok: null, got: part.kind === 'draw' ? (ans ? '（有畫）' : '') : (Array.isArray(ans) ? ans.map(r => [].concat(r || []).join(' ➜ ')).join(' ／ ') : '') }];
    return out;
  } else if (part.kind === 'essay') {
    /* 長文：不自動給分，但把數得出來的（幾段、每段幾句、用了幾個單字）帶給老師 */
    out.detail = [{ ok: null, got: String(ans || ''), stats: examEssayStats(ans, part) }];
    return out;
  } else {
    // short：收答案，不給分（老師拿 rubric 手改）
    out.detail = (part.questions || []).map((q, i) => ({ text: '', ok: null, got: (ans || [])[i] || '' }));
    return out;
  }
  out.got = Math.round(max * (out.right / n));
  return out;
}

/* 整份考卷。回傳每一大題的結果 ＋ 自動分／手改分分開。 */
function examScore(item, answers) {
  const secs = (item && item.sections) || [];
  const res = { parts: [], auto: 0, autoMax: 0, manualMax: 0, bySection: [] };
  secs.forEach((sec, si) => {
    let sGot = 0, sMax = 0, sManual = 0;
    (sec.parts || []).forEach((pt, pi) => {
      const key = si + '_' + pi;
      const r = examScorePart(pt, (answers || {})[key]);
      res.parts.push({ si, pi, key, part: pt, ...r, auto: !!(EXAM_KINDS[pt.kind] || {}).auto });
      if ((EXAM_KINDS[pt.kind] || {}).auto) { sGot += r.got; sMax += r.max; res.auto += r.got; res.autoMax += r.max; }
      else { sManual += r.max; res.manualMax += r.max; }
    });
    res.bySection.push({ name: sec.name || `Section ${si + 1}`, got: sGot, max: sMax, manual: sManual });
  });
  res.pct = res.autoMax ? Math.round(res.auto / res.autoMax * 100) : 0;
  return res;
}

/* 考卷的短文要能點字——把一段文章切成「字」與「不是字」的小塊。
   ⚠ 標點要留在自己的塊裡，不然圈起來會把句號一起圈進去（v485 踩過）。 */
function examTokens(passage) {
  const out = [];
  String(passage || '').split(/(\s+)/).forEach(chunk => {
    if (!chunk) return;
    if (/^\s+$/.test(chunk)) { out.push({ t: chunk, w: false }); return; }
    const m = /^([^A-Za-z']*)([A-Za-z][A-Za-z']*)([^A-Za-z']*)$/.exec(chunk);
    if (!m) { out.push({ t: chunk, w: false }); return; }
    if (m[1]) out.push({ t: m[1], w: false });
    out.push({ t: m[2], w: true });
    if (m[3]) out.push({ t: m[3], w: false });
  });
  return out;
}

Object.assign(window, { examLoadDict, examNeedsDict, examAffixDetect, examAffixZh, examWordFormRe, examOrderShuffle, EXAM_KINDS, examPartN, examTotals, examScorePart, examScore, examTokens, examAffixOne, examGenqOne, EXAM_STORY_SECTIONS, examStoryOne, examUseWordOne, examFixBoxScore, examEvidenceOne, examEssayStats, examPtsOf, _evSentences, examCircleCheck, examCircleHit, EXAM_RUBRIC, EXAM_RUBRIC_MAX, EXAM_RUBRIC_SETS, examRubricOf, EXAM_ERR_RULE, examErrDeduct, examRubricPoints, examRubricPart, aiGradeRubric, examAiMarkPart });

/* 丟給 QuickSetModal 的貼上格式：英文 - 中文 - 例句 - 英文定義
   （跟 app.jsx「在這一組再出一份」用的格式一模一樣，不另外發明一種） */
function examPasteText(words) {
  return (words || []).map(w => [w.term, w.zh, w.example, w.def]
    .map(x => String(x || '').trim()).filter(Boolean).join(' - ')).join('\n');
}

Object.assign(window, { examPasteText });


async function deletePracticeSet(email, key) {
  const id = String(email || '').trim().toLowerCase();
  if (!id || !key) return;
  await _db.collection('practice').doc(id).update({ [`sets.${key}`]: firebase.firestore.FieldValue.delete() });
}
function subscribePractice(email, cb) {
  const id = String(email || '').trim().toLowerCase();
  if (!id) { cb(null); return () => {}; }
  return _db.collection('practice').doc(id)
    .onSnapshot(d => cb(d.exists ? d.data() : null), () => cb(null));
}
function examMarkOf(doc, progressKey) {
  return ((doc && doc.marks) || {})[progressKey] || null;
}

/* 收件匣 → 畫面要的清單（新的排前面） */
function practiceSets(doc) {
  const sets = (doc && doc.sets) || {};
  return Object.values(sets)
    .filter(s => s && (s.questions || []).length)
    .sort((a, b) => (b.at || 0) - (a.at || 0));
}

Object.assign(window, { deletePracticeSet, subscribePractice, practiceSets, examMarkOf });

/* ══════════════════════════════════════════════════════════════════════════
   v465（Alan：「錯題那個也幫我做，我覺得要加上獎勵比較合理」）
   ──────────────────────────────────────────────────────────────────────────
   錯題本其實 v394 就上線了（header 的 📕），但沒有任何獎勵——小朋友沒有理由去點它。
   加上：訂正一題 +1⭐，一天最多 +10⭐。

   ⚠ 為什麼要有上限：沒有上限就變成「錯愈多賺愈多」。
     不過其實也很難刻意刷——故意答錯會讓那一份的分數掉到 80 以下，
     直接少掉 +10~15 顆完成星，比訂正拿回來的多得多。上限只是保險。

   ⚠ 為什麼要另外存一份紀錄：這個網站的星星是**從「做過什麼」反算**的（v409），
     而「訂正」做完的動作是**把錯題刪掉**——刪掉就沒有東西可以反算了。
     所以要留一筆 progress/{uid}.fixed.days['YYYY-MM-DD'] = 幾題。
     它跟 items 一樣掛在人身上，換年級、封存都不會消失（v409 的教訓）。
   ⚠ 紀錄存「真正訂正了幾題」，上限是算星星時才套用——
     以後想調上限，歷史資料不用重算。
   ══════════════════════════════════════════════════════════════════════════ */
const FIX_STAR = 1;        // 訂正一題幾顆
const FIX_DAILY_CAP = 10;  // 一天最多幾顆

function computeFixedStars(fixed) {
  const days = (fixed && fixed.days) || {};
  const entries = [];
  let total = 0, n = 0;
  Object.keys(days).sort().forEach(d => {
    const cnt = Math.max(0, Number(days[d]) || 0);
    if (!cnt) return;
    n += cnt;
    total += Math.min(cnt * FIX_STAR, FIX_DAILY_CAP);
  });
  if (n > 0) {
    entries.push({ id: 'fix:total', auto: true, date: Object.keys(days).sort().pop() || '',
                   amount: total, note: `訂正錯題 ${n} 題` });
  }
  const today = checkinToday();
  const todayN = Math.max(0, Number(days[today]) || 0);
  return { total, entries, todayN,
           todayLeft: Math.max(0, Math.floor(FIX_DAILY_CAP / FIX_STAR) - todayN) };
}

/* 訂正了一題 → 記一筆（雲端）。回傳今天還可以再拿幾顆，給畫面顯示。 */
async function markMistakeFixed(uid, displayName, email) {
  if (!uid) return;
  try {
    const ref = _db.collection('progress').doc(uid);
    const profileFields = { updatedAt: Date.now() };
    if (displayName && displayName.trim()) profileFields.name  = displayName.trim();
    if (email      && email.trim())        profileFields.email = email.trim();
    await ref.set(profileFields, { merge: true });
    await ref.update({ [`fixed.days.${checkinToday()}`]: firebase.firestore.FieldValue.increment(1) });
  } catch (e) { console.warn('markMistakeFixed:', e); }
}
/* ⚠ 一定要掛在這裡（定義之後）。FIX_STAR / FIX_DAILY_CAP 是 const，
   寫進檔案上方那張匯出表會 TDZ 爆掉——v451 踩過同一個坑。 */
Object.assign(window, { computeFixedStars, markMistakeFixed, FIX_STAR, FIX_DAILY_CAP });


/* ══════════════════════════════════════════════════════════════════════════
   v612 🎃 Trick or Treat（Alan：「倒數歸零的 Trick or Treat 動畫，南瓜的獎品 100~500 顆星星」（v625 起 100~1000））
   ──────────────────────────────────────────────────────────────────────────
   跟簽到（v362）、訂正（v465）同一套做法：**星星是算出來的，不是存的**。
   ⭐ 學生自己的 progress/{uid}.treat.<活動> 只存「他按下去的時間」；**獎品是由帳號反算的**
     （treatPrize：uid＋活動名 → 固定的一個數字）。所以：
       · 重新整理、換裝置、清快取都不會重抽（抽不到更好的）
       · 想在主控台自己寫一個「500」進去也沒用——存的數字根本不被讀
   ⚠ 只認「領取時間落在活動期間」的紀錄；期間之外寫進去的不算。
   ⚠ 領取期間比倒數歸零（10/31 00:00）多給兩天：週末沒上線的孩子不會白白錯過。
   ⚠ 獎品權重偏低（v625 起 100~1000，平均約 ⭐220 ≒ NT$11；星星＝NT$×20）——這是真的會花掉的錢，
     想調高調低只要改 TREAT_TABLE，已領的人下次算星星就會跟著變。 */
const TREATS = {
  hw2026: { from: '2026-10-31', until: '2026-11-02', zh: '萬聖節 Trick or Treat 🎃' },
};
const TREAT_TABLE = [[100, 26], [150, 20], [200, 16], [250, 12], [300, 9], [350, 6], [400, 4], [450, 2.5], [500, 1.8], [600, 1.2], [700, 0.8], [800, 0.4], [900, 0.2], [1000, 0.1]];   // [星星, 權重]
function treatPrize(uid, key) {
  let h = 2166136261;
  const str = String(uid || '') + '|' + String(key || '');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const u = ((h >>> 0) / 4294967296) * TREAT_TABLE.reduce((a, r) => a + r[1], 0);
  let acc = 0;
  for (const [stars, w] of TREAT_TABLE) { acc += w; if (u < acc) return stars; }
  return TREAT_TABLE[0][0];
}
function _treatDay(t) { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
/* 現在（或某個時間）這個活動能不能領 */
/* 還沒開放時，離開放還有幾毫秒（已開放或過期回 0）——倒數用 */
function treatMsToOpen(key, now) {
  const c = TREATS[key]; if (!c) return 0;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.from);
  return Math.max(0, new Date(+m[1], +m[2] - 1, +m[3]).getTime() - (now == null ? Date.now() : now));
}
function treatOpenAt(key, t) {
  const c = TREATS[key]; if (!c) return false;
  const d = _treatDay(t == null ? Date.now() : t);
  return d >= c.from && d <= c.until;
}
function computeTreatStars(treat, uid) {
  const entries = []; let total = 0;
  Object.keys(TREATS).forEach(key => {
    const at = Number(treat && treat[key]);
    if (!(at > 1e11) || !treatOpenAt(key, at)) return;
    const n = treatPrize(uid, key);
    total += n;
    entries.push({ id: 'treat:' + key, auto: true, date: _treatDay(at), amount: n, note: TREATS[key].zh + ' 南瓜獎勵' });
  });
  return { total, entries };
}
/* 按下南瓜 → 記一筆（雲端）。已經領過就不蓋掉第一次的時間。 */
async function claimTreat(uid, displayName, email, key) {
  if (!uid || !TREATS[key]) throw new Error('bad-claim');
  const ref = _db.collection('progress').doc(uid);
  const snap = await ref.get();
  const had = snap.exists && snap.data() && snap.data().treat && Number(snap.data().treat[key]) > 1e11;
  if (had) return false;
  const profile = { updatedAt: Date.now() };
  if (displayName && displayName.trim()) profile.name  = displayName.trim();
  if (email      && email.trim())        profile.email = email.trim();
  await ref.set(profile, { merge: true });
  /* 領取時間＋限定裝扮用同一次 update（不會只領到一半）；arrayUnion 不必先讀 mx，也不會蓋掉他已經買的 */
  const gifts = treatGifts(treatPrize(uid, key), key);
  const upd = { [`treat.${key}`]: Date.now() };
  if (gifts.length) upd['mx.owned'] = firebase.firestore.FieldValue.arrayUnion(...gifts);
  await ref.update(upd);
  return true;
}
/* 這一份獎品順便送哪幾件限定裝扮 */
function treatGifts(prize, key) {
  return MX_SHOP.filter(it => it.limited === key && (!it.rare || prize >= 400)).map(it => it.id);
}
Object.assign(window, { TREATS, TREAT_TABLE, treatGifts, treatPrize, treatOpenAt, treatMsToOpen, computeTreatStars, claimTreat });

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
Object.assign(window, { checkInToday, computeCheckin, checkinToday, EXAM_CHECKIN, CHECKIN_DAILY, CHECKIN_CYCLE, CHECKIN_MILESTONES, CHECKIN_PERFECT });

/* ══ 🎊 節慶限定外觀 ══════════════════════════════════════════════
   v489 雙十國慶（Alan：「這幾天是台灣國慶日，我想幫我的網站換個風格」）
   v523 萬聖節（Alan 2026-10-20：「一直到 halloween 結束，全部都要改變」）

   ⭐ 核心設計沒變：**它自己會開，也自己會關**。
     Alan 不用記得十一月要去關掉——忘記的話學生會在聖誕節看到南瓜。
   ⭐ v523 從「寫死一個節慶」改成**一張表**。理由很實際：
     上一次換季是把整份 1010 的判斷複製一份出來改，兩份日期一定會走鐘；
     現在加一個節慶＝表裡多一列 ＋ 一個 CSS 檔，其他一行都不用動。
   ⚠ 用本地時間判斷（學生都在台灣），不要用 UTC——UTC 的 10/20 00:00
     在台灣已經是早上 8 點，等於少了整整一個早上。
   ⚠ 區間不可以重疊；重疊的話 find() 只會拿到第一個，另一個靜靜地不見。 */
const FESTS = [
  { id: '1010', from: '10-08', to: '10-12', peak: '10-10',
    cls: 'fest-1010', css: 'styles-holiday.css',
    emoji: '🇹🇼', zh: '國慶外觀', day: '10.10', name: '雙十國慶',
    hi: '雙十國慶快樂', hiDay: '今天是雙十國慶' },
  { id: 'hw',   from: '10-20', to: '10-31', peak: '10-31',
    cls: 'fest-hw',   css: 'styles-holiday-hw.css',
    emoji: '🎃', zh: '萬聖節外觀', day: '10.31', name: '萬聖節',
    hi: '萬聖節快樂', hiDay: '今天是萬聖節' },
];
const FEST_1010 = FESTS[0];                      // 舊名字留著，別處還在用
const FEST_KEY  = 'alan-fest-override';          // 老師自己的開關（只影響這台裝置）

function _festMD(d) {
  return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* 現在該用哪一套？回傳 FESTS 裡的那一筆，或 null（＝平常的樣子）。
   老師可以在自己的裝置上強制開／關（提早預覽、或自己看膩了）：
     'off'      永遠關　　'on' 強制開（日期沒中就用最後一套）
     '1010'/'hw' 指定哪一套（他要先看看萬聖節長怎樣）
   學生不會動到這個，他們看到的永遠是日期判斷的結果。 */
function festNow(now) {
  let ov = null;
  try { ov = localStorage.getItem(FEST_KEY); } catch (e) {}
  if (ov === 'off') return null;
  const byDate = FESTS.find(f => {
    const md = _festMD(now || new Date());
    return md >= f.from && md <= f.to;
  }) || null;
  if (ov && ov !== 'auto' && ov !== 'on') {
    const pick = FESTS.find(f => f.id === ov);
    if (pick) return pick;
  }
  if (ov === 'on') return byDate || FESTS[FESTS.length - 1];
  return byDate;
}
function festOn(now)      { return !!festNow(now); }
function festIs(id, now)  { const f = festNow(now); return !!f && f.id === id; }

/* ══ v552 🎃 萬聖節限時星星雙倍（Alan：「halloween 限時分數雙倍」）══════════
   在 10/20～10/31 之間「完成的」練習，自動集點的星星 ×2。
   ⭐ 用**完成當下的時間戳**判斷，不是用「現在幾號」：
     星星是由進度算出來的（v361），如果用現在的日期，11/1 一到所有人的星星
     會一起縮水一半。用 prog.ts，雙倍期間賺到的就永遠是雙倍。
   ⚠ 跟 festNow 的老師開關無關：老師預覽萬聖節外觀，不可以讓星星跟著變。
   ⚠ 年份用「現在」的年份；沒有時間戳（舊的本機紀錄）就不加倍，寧可少給。 */
/* 🔴 v589 修兩個會讓學生星星「變少」的洞（Alan 的「限時雙倍」功能本身的缺陷）：
   ① 年份：本來用「現在的年份」比對——2027/01/01 一到，今年萬聖節賺到的雙倍**全部同時消失**
      （實測 20 → 10）。雙倍是「2026 年這一次活動」，年份要釘在活動本身（year），不是跟著今天走。
      ⚠ 明年的萬聖節要不要雙倍是新的決定（加一筆），不是自動延續。
   ② 時間：本來看 prog.ts——那是**最後一次存檔**的時間。10/25 完成、11/05 重做一次，
      ts 變成 11/05，雙倍就掉了（實測 20 → 10）；反過來 9/15 完成、10/25 重做會被算成雙倍。
      → 看 earnedAtOf（第一次完成的時間，見下）。 */
const HW_DOUBLE = { year: 2026, from: '10-20', to: '10-31', mult: 2 };
/* 這一筆進度是「什麼時候第一次完成」的。
   優先序：first（第一次完成，v589 起每次存檔都保留）＞ done（雲端存的完成時間）＞ ts。
   ⚠ 本機那份的 done 是「做對幾題」的**數字**不是時間，所以每一個都要 > 1e11 才當時間用。
   ⚠ 舊資料沒有 first：用 done（最接近的已知值）；之後第一次重做時 saveProgressItem 會把它記成 first。 */
function earnedAtOf(prog) {
  if (!prog) return 0;
  for (const k of ['first', 'done', 'ts']) { const t = Number(prog[k]); if (t > 1e11) return t; }
  return 0;
}
function hwDoubleAt(t) {
  const n = Number(t || 0);
  if (!(n > 1e11)) return false;
  const d = new Date(n);
  if (d.getFullYear() !== HW_DOUBLE.year) return false;
  const md = _festMD(d);
  return md >= HW_DOUBLE.from && md <= HW_DOUBLE.to;
}
function hwDoubleOn(now) {
  const md = _festMD(now || new Date());
  return md >= HW_DOUBLE.from && md <= HW_DOUBLE.to;
}

/* 掛在 <html> 上，對應的 styles-holiday*.css 才會生效。
   ⚠ 掛在 <html> 不是 <body>：有些浮層（放大圖、裝扮室）是 createPortal 到 body 的，
     掛 body 也會吃到，但 <html> 連 body 自己的背景都蓋得到。
   ⚠ 每一套的 class 都要處理——只加不減的話，從國慶切到萬聖節會兩套疊在一起。 */
function festApply() {
  try {
    const f = festNow();
    FESTS.forEach(x => document.documentElement.classList.toggle(x.cls, !!f && x.id === f.id));
    return !!f;
  } catch (e) { return false; }
}

/* 老師端的開關：'auto'（跟日期走）／'on'／'off'／節慶 id */
function festSetOverride(mode) {
  try {
    if (mode === 'auto') localStorage.removeItem(FEST_KEY);
    else localStorage.setItem(FEST_KEY, String(mode));
  } catch (e) {}
  return festApply();
}
function festOverride() {
  try { return localStorage.getItem(FEST_KEY) || 'auto'; } catch (e) { return 'auto'; }
}
/* 今天是不是節慶當天（10/10、10/31）——問候語要用 */
function festIsDay(now) {
  const f = festNow(now);
  return !!f && _festMD(now || new Date()) === f.peak;
}

/* 距離節慶當天還有幾天（Alan v525：「改成倒數距離萬聖節，小朋友比較喜歡」）。
   ⚠ 一定要「把兩個日期都歸零到當天 00:00」再相減。
     直接用毫秒差除以一天，下午四點看到的會是 10.x 天 → Math.floor 變 10，
     但其實只剩 11 天——**差一天的 bug 在倒數上特別明顯**，小朋友會自己算。
   ⚠ 不要用 toISOString()（那是 UTC，台灣的晚上八點在它眼中已經是明天）。 */
function festDaysTo(now) {
  const f = festNow(now);
  if (!f) return null;
  const d = now || new Date();
  const [pm, pd] = f.peak.split('-').map(Number);
  const today  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const target = new Date(d.getFullYear(), pm - 1, pd);
  return Math.round((target - today) / 86400000);
}
/* 明確到秒的倒數（Alan v526：「改成像那張圖右下角，明確時間倒數，比較酷」）。
   目標＝節慶當天的 00:00。到了（或過了）就回 null＝不要再倒數。
   ⚠ 這跟 festDaysTo 的「天」是**兩個不同的問題**，不要硬湊成同一個數字：
     10/30 下午四點，festDaysTo 是 1 天（還要睡一覺），這裡是 0 天 8 小時。
     兩個在各自的場合都是對的——徽章要講「還有幾天」，倒數鐘要講「還有多久」。 */
function festCountParts(now) {
  const f = festNow(now);
  if (!f) return null;
  const d = now || new Date();
  const [pm, pd] = f.peak.split('-').map(Number);
  let ms = new Date(d.getFullYear(), pm - 1, pd, 0, 0, 0, 0) - d;
  if (ms <= 0) return null;
  const day = Math.floor(ms / 86400000); ms -= day * 86400000;
  const hr  = Math.floor(ms / 3600000);  ms -= hr * 3600000;
  const min = Math.floor(ms / 60000);    ms -= min * 60000;
  return { d: day, h: hr, m: min, s: Math.floor(ms / 1000) };
}

/* 徽章上那行字。當天就不要再倒數了（倒數到 0 還寫「還有 0 天」很奇怪）。 */
function festCountText(now) {
  const n = festDaysTo(now);
  const f = festNow(now);
  if (!f || n === null) return '';
  if (n > 0)  return `距離${f.name}還有 ${n} 天`;
  if (n === 0) return `${f.name}快樂`;
  return f.hi;                                  // 當天過了之後（例如 11/01 還開著）
}

Object.assign(window, { hwDoubleOn, hwDoubleAt, earnedAtOf, HW_DOUBLE, festOn, festIs, festNow, festApply, festSetOverride, festOverride, festIsDay, festDaysTo, festCountText, festCountParts, FESTS, FEST_1010 });

/* 一載入就套用——要在 React 掛載**之前**，不然學生會先看到原本的樣子再閃一下變色。
   data.js 比 app.jsx 早載入，所以這裡是最早能動手的地方。 */
festApply();

/* ══════════════════════════════════════════════════════════════════════════
   🏫 v493 學校進度表（Pacing Guide）
   ──────────────────────────────────────────────────────────────────────────
   Alan 2026-10-12：「我想要製作可以記錄學生進度的頁面，像是每次上課上了什麼，
   以及這週的學校進度是什麼（學校都有發布每週進度）」，並給了
   「SY26-27 Grade 4 Term 1-2.xlsx」＋逐欄講解。

   ⭐ 最重要的發現：**網站的週次跟學校的週次已經 1:1 對上**
     （網站 g4-2026F-W07 = Oct 12–18，學校 W7 也是 Oct 12–18，20 週全部吻合）
     → 進度表直接掛在現有週次上，不需要另外做對照表。

   表的長相（第 3 列是欄位名）：
     A..I  行事曆（月／一~日／Notes＝連假與活動）
     J..R  IT 外師：WK Unit Reading WordStudy Vocabulary ReadingSkills LAW WordStudyWB Assessments
     S..AA LT 中師：WK Unit Reading Vocabulary LanguageAndConventions ReadingSkills LAW GrammarWB Assessments

   🔑 兩條「沿用」規則（Alan 親自講解的，表上看不出來）：
     1. Unit／Reading 只寫在循環的第一週 → 後面幾週要往回沿用
        （外師 3 週一循環：Part 1 → Part 2 → Unit Review；中師 4 週 Part 1、4 週 Part 2）
     2. 中師的「Language and Conventions」有時候寫 `-` 或 `Unit 1 Writing Activity`，
        但 Grammar WB 還是有頁數 → **那份作業的文法主題要往回沿用最近一個真的文法主題**。
        例：W7 課堂教 Writing Activity，但 Grammar WB P14-17 是 W6 的
        「U2W2 - Complex Sentences & Subordinating Conjunctions」。

   ⚠ Alan 2026-10-12 指定：**考試只看 Formative，Summative 一律忽略**
     （外師 3 週一次 W3/W6/W9…，中師 4 週一次 W4/W8…）。
═══════════════════════════════════════════════════════════════════════════ */

const PACE_KEY = 'pacing';

/* 🔴 v503（Alan：「U1W1 這個不用特別寫出來，因為根本沒人看，我只需要看重點」）：
   拿掉 `U1W5 - `、`U2W2 - `、`Skill 1 - ` 這種編號前綴，只留真正的內容。
   ⚠ 只在**顯示**時拿掉，存的資料保持原樣——哪天要對回學校的表還找得到編號。 */
function pacingClean(s) {
  return String(s || '')
    .replace(/^\s*U\s*\d+\s*W\s*\d+\s*[-–—:：]\s*/i, '')
    .replace(/^\s*Skills?\s*\d+\s*[-–—:：]\s*/i, '')
    .trim();
}
/* 這一側的作業：回傳 [{ book, pages }]，book 來自 Excel 的欄位標題。 */
function pacingBooks(side) {
  if (!side) return [];
  const out = [];
  [['law', 'LAW'], ['wsWb', 'Word Study WB'], ['gramWb', 'Grammar WB']].forEach(([k, dft]) => {
    const v = String(side[k] || '').trim();
    if (v && v !== '-') out.push({ book: side[k + 'Label'] || dft, pages: v });
  });
  return out;
}

/* 這一週的進度（weekId 例：g4-2026F-W07 → 第 7 週）。 */
function pacingWeekNo(weekId) {
  const m = /-W(\d{1,3})$/i.exec(String(weekId || ''));
  return m ? Number(m[1]) : null;
}
function pacingForWeek(pace, weekId) {
  const n = pacingWeekNo(weekId);
  if (!n || !Array.isArray(pace)) return null;
  return pace.find(w => w.n === n) || null;
}

/* 下一次 Formative 還有幾週（Alan：外師 3 週一次、中師 4 週一次，
   那正是該加強複習的時間點）。回傳 { it: {in, name}, lt: {...} }，沒有就 null。 */
function pacingNextFormative(pace, weekId) {
  const n = pacingWeekNo(weekId);
  if (!n || !Array.isArray(pace)) return null;
  const find = (side) => {
    for (const w of pace) {
      if (w.n >= n && w[side] && w[side].assess) return { in: w.n - n, name: w[side].assess, wk: w.n };
    }
    return null;
  };
  return { it: find('it'), lt: find('lt') };
}

async function savePacing(gradeKey, weeks) {
  await _db.collection('class').doc(PACE_KEY + '_' + String(gradeKey)).set({ weeks, at: Date.now() });
}
async function loadPacing(gradeKey) {
  try {
    const s = await _db.collection('class').doc(PACE_KEY + '_' + String(gradeKey)).get();
    return s.exists ? (s.data().weeks || null) : null;
  } catch (e) { return null; }
}
function subscribePacing(gradeKey, cb) {
  try {
    return _db.collection('class').doc(PACE_KEY + '_' + String(gradeKey))
      .onSnapshot(s => cb(s.exists ? (s.data().weeks || null) : null), () => cb(null));
  } catch (e) { cb(null); return () => {}; }
}

/* ══════════════════════════════════════════════════════════════════════════
   🗺️ v618 期中考總複習地圖（Alan：「做一個 picture，按照步驟：Word Study 1~5 → Vocabulary → Reading，
   全部完成才算期中考總複習；學生也要知道這次考試的重點、會發生什麼事」）
   ──────────────────────────────────────────────────────────────────────────
   · 存在 class/reviewpath_{年級}（跟 pacing 同一個模式：公開可讀、只有老師可寫）。
   · 每一關只存「指到既有題目」的指標 { w:週次id, c:分類id, i:題目id }，**不複製題目**——
     題目改了、刪了，地圖自己跟著變；做過沒有看的是學生既有的完成紀錄（qmProgress 的 .done）。
   · 完成條件＝每一關裡的每一題都做過（Alan 選的；不鎖順序、不設及格分）。
   ⚠ 不給星星：星星是真的錢（NT$×20），這裡只給徽章與慶祝，要發獎勵由老師決定。 */
const REVIEW_KEY = 'reviewpath';
const REVIEW_KINDS = {
  word:    { ico: '🔤', zh: 'Word Study' },
  vocab:   { ico: '📚', zh: 'Vocabulary' },
  reading: { ico: '📖', zh: 'Reading' },
  grammar: { ico: '✏️', zh: 'Grammar' },
  exam:    { ico: '📝', zh: '模擬考' },
  other:   { ico: '⭐', zh: '其他' },
};
function reviewKindOf(name) {
  const t = String(name || '').toLowerCase();
  if (/word\s*study|字根|字首/.test(t)) return 'word';
  if (/vocab|單字|字彙/.test(t)) return 'vocab';
  if (/read|閱讀/.test(t)) return 'reading';
  if (/gram|文法/.test(t)) return 'grammar';
  if (/exam|mock|考卷|模擬/.test(t)) return 'exam';
  return 'other';
}
function reviewTemplate() {
  const mk = (name, focus) => ({ id: 's' + Math.random().toString(36).slice(2, 8), name, kind: reviewKindOf(name), focus, items: [] });
  return {
    title: '期中考總複習', published: false,
    info: { date: '', scope: '', format: '', flow: '', tips: '' },
    steps: [1, 2, 3, 4, 5].map(n => mk('Word Study ' + n, '')).concat([mk('Vocabulary', ''), mk('Reading', '')]),
  };
}
function reviewClean(path) {
  if (!path || typeof path !== 'object') return null;
  const str = (v, n) => String(v == null ? '' : v).slice(0, n || 400);
  const info = path.info || {};
  const steps = (Array.isArray(path.steps) ? path.steps : []).slice(0, 30).map((st, k) => ({
    id: str(st && st.id, 24) || ('s' + k),
    name: str(st && st.name, 40) || ('第 ' + (k + 1) + ' 關'),
    kind: REVIEW_KINDS[st && st.kind] ? st.kind : reviewKindOf(st && st.name),
    focus: str(st && st.focus, 200),
    items: (Array.isArray(st && st.items) ? st.items : []).slice(0, 60)
      .filter(it => it && it.w && it.c && it.i)
      .map(it => ({ w: str(it.w, 60), c: str(it.c, 40), i: str(it.i, 80), t: str(it.t, 80) })),
  }));
  return {
    title: str(path.title, 40) || '期中考總複習',
    published: !!path.published,
    since: Number(path.since) > 1e11 ? Number(path.since) : 0,
    info: { date: str(info.date, 10), scope: str(info.scope, 600), format: str(info.format, 600), flow: str(info.flow, 800), tips: str(info.tips, 800) },
    steps,
  };
}
async function saveReviewPath(gradeKey, path) {
  const clean = reviewClean(path);
  await _db.collection('class').doc(REVIEW_KEY + '_' + String(gradeKey)).set({ path: clean, at: Date.now() });
  return clean;
}
function subscribeReviewPath(gradeKey, cb) {
  try {
    return _db.collection('class').doc(REVIEW_KEY + '_' + String(gradeKey))
      .onSnapshot(s => cb(s.exists ? reviewClean(s.data().path) : null), () => cb(null));
  } catch (e) { cb(null); return () => {}; }
}
/* 算進度。isDone(週次id, 題目id) 由呼叫端提供（app.jsx 的 qmProgress／舊版 progress）。 */
/* v622（Alan：「不管你之前有沒有完成 都要重新再做一次」）：只算 since 之後做的。
   老師按「讓大家從頭開始」會更新 since；沒設過就從 2026-10-29 起算（地圖上線時舊紀錄一律不算）。 */
const REVIEW_DEFAULT_SINCE = 1793203200000;
function reviewProgress(path, weeks, isDone) {
  const p = reviewClean(path);
  if (!p) return null;
  const since = p.since || REVIEW_DEFAULT_SINCE;
  const steps = p.steps.map(st => {
    const items = st.items.map(it => {
      const list = (weeks && weeks[it.w] && weeks[it.w].items && weeks[it.w].items[it.c]) || [];
      const found = list.find(x => x && x.id === it.i);
      return Object.assign({}, it, {
        exists: !!found,
        title: found ? String(found.title || found.zh || it.i) : (it.t || it.i),
        done: !!(found && isDone && isDone(it.w, it.i, since)),
      });
    });
    const total = items.length, done = items.filter(x => x.done).length;
    return Object.assign({}, st, { items, total, done, complete: total > 0 && done === total });
  });
  const total = steps.reduce((a, s) => a + s.total, 0), done = steps.reduce((a, s) => a + s.done, 0);
  const firstOpen = steps.findIndex(s => !s.complete);
  return Object.assign({}, p, { steps, total, done, complete: steps.length > 0 && total > 0 && steps.every(s => s.complete),
                                stepsDone: steps.filter(s => s.complete).length, next: firstOpen });
}
/* 離考試還有幾天（date＝'YYYY-MM-DD'；沒填或格式不對回 null；考完回負數） */
function reviewDaysLeft(dateISO, now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateISO || ''));
  if (!m) return null;
  const t = new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  const n = now ? new Date(now) : new Date();
  const d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.round((t - d0) / 86400000);
}
Object.assign(window, { REVIEW_DEFAULT_SINCE, REVIEW_KINDS, reviewKindOf, reviewTemplate, reviewClean, saveReviewPath, subscribeReviewPath, reviewProgress, reviewDaysLeft });

Object.assign(window, { pacingForWeek, pacingWeekNo, pacingClean, pacingBooks, pacingNextFormative, savePacing, loadPacing, subscribePacing });

/* ══════════════════════════════════════════════════════════════════════════
   📒 v496 上課紀錄（Lesson Log）
   ──────────────────────────────────────────────────────────────────────────
   Alan 2026-10-12：「我是一對一，給我自己看就好，三個年級都要，之後也要出家長
   可以看的，而且還要寫這次上課這位小朋友掌握度幾 percentage、以及有什麼功課、
   以及下次上課進度。」

   資料長相：lessons/{學生email}
     { slot: { day: 3, time: '17:00' },      // 固定時段（0=日 … 6=六）
       log: { '2026-10-15': {
                wk, kind, pct, did, hw, next, note, at } } }

   ⚠ 一個學生一份文件（不是一堂課一份）：一學期約 40 堂、資料很小，
     一次讀完、一個訂閱就夠，比開一個 collection 簡單太多。

   ⭐ 設計重點（省 Alan 的時間，不是堆欄位）：
     1. 新增一堂時，日期**自動帶出下一個固定時段**（他說「學生通常都是每週固定時間」）
     2. **上一堂寫的「下次進度」→ 自動填進這一堂的「這次上了什麼」**
        ——這是整個功能最省力的地方，課堂之間自己接起來
     3. 學校那一週在教什麼自動帶出來（接 v493 的進度表）
     4. 連假會提醒（進度表的 note），那正是會打亂固定時段的日子

   ⚠⚠ 家長頁面（Alan：「之後也要出家長可以看的」）**不能直接把這份開給家長讀**：
     note 是老師的私人備註，而 Firestore 的規則**沒辦法只擋某幾個欄位**——
     開了 read 就是整份都給。正確做法是另開 lessonsPublic/{email}
     （存檔時同時寫一份不含 note 的），家長只讀那一份。
     現在先不做（他說「之後」），但 firestore.rules 裡已經寫下這條限制。
     要做的時候：saveLesson 多寫一份 ＋ 把既有紀錄補寫過去（量很小，一次跑完）。
═══════════════════════════════════════════════════════════════════════════ */

const LESSON_KINDS = [
  { id: 'normal', zh: '正常上課', ico: '📘' },
  { id: 'makeup', zh: '補課',     ico: '🔁' },
  { id: 'extra',  zh: '加課',     ico: '➕' },
  { id: 'off',    zh: '請假／停課', ico: '🏖️' },
];
/* 排好序的課堂清單（新的在前）。 */
function lessonRows(doc) {
  const log = (doc && doc.log) || {};
  return Object.keys(log).sort().reverse().map(date => ({ date, ...log[date] }));
}
/* 平均掌握度（只算有填 pct 的正常/補課/加課）。 */
function lessonAvgPct(doc, lastN) {
  const got = lessonRows(doc).filter(r => r.kind !== 'off' && typeof r.pct === 'number');
  const use = lastN ? got.slice(0, lastN) : got;
  if (!use.length) return null;
  return Math.round(use.reduce((a, r) => a + r.pct, 0) / use.length);
}

/* v504：家長那張卡上的日期要「看起來像日期」，不要像一行機器輸出。
   把 2026-10-14 拆成 10 / 14 / 週二，讓版面自己排，壞掉的字串就原樣退回去。 */
function lessonDateParts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  if (!m) return { y: '', md: String(iso || ''), wd: '', ok: false };
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return { y: m[1], md: `${+m[2]}/${+m[3]}`, wd: `週${wd}`, ok: true };
}

/* 上次交代的複習／功課做了沒（Alan：「以及有沒有完成複習之類的」）。 */
const REVIEW_STATES = [
  { id: 'done', zh: '完成', ico: '✅' },
  { id: 'part', zh: '部分',  ico: '◐' },
  { id: 'none', zh: '沒做',  ico: '✗' },
];
/* 學生／家長自己看的那一份（不含老師備註）。 */
function subscribeLessonsPublic(email, cb) {
  const id = String(email || '').trim().toLowerCase();
  try {
    return _db.collection('lessonsPublic').doc(id)
      .onSnapshot(s => cb(s.exists ? s.data() : null), () => cb(null));
  } catch (e) { cb(null); return () => {}; }
}
/* 把既有紀錄補寫一份到 lessonsPublic（v499 之前存的那些沒有鏡像）。 */
async function backfillLessonsPublic(email) {
  const id = String(email || '').trim().toLowerCase();
  const snap = await _db.collection('lessons').doc(id).get();
  if (!snap.exists) return 0;
  const log = (snap.data() || {}).log || {};
  const pub = {};
  Object.keys(log).forEach(d => { const { note, ...rest } = log[d] || {}; pub[d] = rest; });
  if (!Object.keys(pub).length) return 0;
  await _db.collection('lessonsPublic').doc(id).set({ log: pub }, { merge: true });
  return Object.keys(pub).length;
}

Object.assign(window, { LESSON_KINDS, REVIEW_STATES, subscribeLessonsPublic, backfillLessonsPublic, lessonRows, lessonAvgPct, lessonDateParts });
/* 這一堂跟誰一起上（只有標記 together 的才算）。 */
function timetableBuddies(tt, email, slotId) {
  const id = String(email || '').toLowerCase();
  const s = ((tt && tt.slots) || []).find(x => x.id === slotId);
  if (!s || !s.together) return [];
  return (s.students || []).filter(e => e !== id);
}

Object.assign(window, { timetableBuddies });

/* ══════════════════════════════════════════════════════════════════
   v591（Alan：「跨週挑單元組成複習／模擬考」＋「單題搬到別的單元」）
   純資料函式，不碰畫面也不存檔——呼叫端拿到新的 weeks 再自己存一次。
   ⚠ 一律深拷貝：搬題目、複製單元都不可以讓兩個單元共用同一個物件，
     不然改一邊另一邊跟著變。
   ⚠ 單元之間互相指向的 id（requires 教學卡的鎖、linkedFlashcardId 單字卡）
     複製後一定要換成新 id；指不到的就拿掉——指向不存在的單元會把學生鎖死。 */
const QMOVE_LISTS = {
  'quiz':           { field: 'questions',       min: 1 },
  'fillblank':      { field: 'questions',       min: 2 },
  'type-answer':    { field: 'pairs',           min: 1 },
  'circle-answer':  { field: 'circleQuestions', min: 1 },
  'sentence-order': { field: 'orderQuestions',  min: 1 },
  'short-answer':   { field: 'saQuestions',     min: 1 },
  'spelling':       { field: 'spellWords',      min: 1 },
  'def-match':      { field: 'defPairs',        min: 2 },
  'vocab-quiz':     { field: 'words',           min: 2 },
  'syllable-div':   { field: 'sdWords',         min: 1 },
};
function qmoveInfo(item) {
  const d = item && QMOVE_LISTS[item.type];
  if (!d) return null;
  return { field: d.field, min: d.min, list: Array.isArray(item[d.field]) ? item[d.field] : [] };
}
Object.assign(window, { QMOVE_LISTS, qmoveInfo });
const _trashDoc = (grade) => _db.collection('class').doc('trash_' + String(grade || 'g3'));
async function trashClear(grade) { await _trashDoc(grade).set({ entries: [] }); }
Object.assign(window, { trashClear });
