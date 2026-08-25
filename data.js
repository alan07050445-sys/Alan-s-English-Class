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
async function lookupWord(word, context) {
  const w = String(word || '').trim().toLowerCase();
  if (!w) return '';
  const cache = _dictCache();
  if (cache[w]) return cache[w];
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
const _ttsAudioCache = {};   // 英文字串 → objectURL（OpenAI mp3）
let _ttsAudioEl = null;      // 共用 <audio>
let _ttsPlayToken = 0;       // 連點時只讓最後一次真的播
let _ttsUnlocked = false;    // v363: iOS 需要「在使用者手勢裡播過一次」才准之後自動播

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
    _ttsPending[t] = generateTtsAudio(t)
      .then(blob => { const u = URL.createObjectURL(blob); _ttsAudioCache[t] = u; delete _ttsPending[t]; return u; })
      .catch(e => { delete _ttsPending[t]; throw e; });
  }
  return _ttsPending[t];
}
async function prefetchTts(texts) {
  const list = (Array.isArray(texts) ? texts : [texts]).map(x => String(x || '').trim()).filter(Boolean);
  for (const t of list) {
    if (_ttsAudioCache[t]) continue;
    try { await _ttsFetchOnce(t); }
    catch (e) { return; }   // Worker 不通就不用再試了
  }
}

async function speakTTS(text, { lang = 'en-US', rate = 0.9 } = {}) {
  const t = String(text || '').trim();
  if (!t) return;
  // 中文/非英文 → 瀏覽器語音（Worker /tts 只有英文聲線）
  if (!/^en/i.test(lang)) { try { speakText(t, { lang, rate }); } catch(e) {} return; }
  // v363: 學生自己選了「內建語音」（多半是因為 iPhone 靜音開關）
  if (getTtsMode() === 'browser') { try { speakText(t, { lang, rate }); } catch(e) {} return; }
  // 先停掉正在講的（瀏覽器＋前一段 mp3），避免兩個聲音疊起來
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e) {}
  if (_ttsAudioEl) { try { _ttsAudioEl.pause(); } catch(e) {} }
  const token = ++_ttsPlayToken;
  try {
    let url = _ttsAudioCache[t];
    if (!url) url = await _ttsFetchOnce(t);     // Worker /tts → mp3（同字只抓一次）
    if (token !== _ttsPlayToken) return;         // 已被更新的點擊取代
    const a = _ttsAudioEl || (_ttsAudioEl = new Audio());
    a.playsInline = true;
    a.src = url;
    try { a.playbackRate = 0.92; } catch(e) {}   // 稍慢一點更清楚（單字/聽寫）
    await a.play();
  } catch (e) {
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
const ANTHROPIC_API_KEY = ''; // Key is stored in Cloudflare Worker env var  // browser-only fallback; safer to use the endpoint above.

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
      const res = await fetch(endpoint, {
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
    } catch(e) { return 'AI 批改服務暫時連不上，請稍後再試。'; }
  }
  if (!ANTHROPIC_API_KEY) return localWritingFeedback(word, sentence);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5', max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || '批改失敗，請再試一次。';
  } catch(e) { return '網路錯誤，請再試一次。'; }
}

// ── v379: AI 出題（配對連線的英文定義／填空的情境例句＋中文解說）────────────
// Alan 本來的做法是把單字貼給 ChatGPT、拿回來再匯入。
// alan-ai-proxy 這個 Worker 本來就是「通用的 Anthropic 代理」（收 system+messages 原樣轉送），
// 所以不用重新部署，直接換一組 prompt 就能在網站裡出題。
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
- Return the words in the same order they were given, one object per word.`;

function _aiStripFence(t) {
  const s = String(t || '').trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : s).trim();
}

/* words: [{ term, zh }]（zh 只是給 AI 當語意提示，可省略）
   回傳 [{ word, def, sentence, answer, explain }]，順序與輸入相同。 */
async function aiMakeVocabExercises(words, { onProgress, chunk = 10, hint = '' } = {}) {
  const list = (words || []).map(w => (typeof w === 'string' ? { term: w } : w)).filter(w => w && w.term);
  if (!list.length) return [];
  const out = [];
  for (let i = 0; i < list.length; i += chunk) {
    const part = list.slice(i, i + chunk);
    const userMsg =
      (hint ? `Context / topic: ${hint}\n` : '') +
      'Target words:\n' +
      part.map(w => `- ${w.term}${w.zh ? `  (Chinese meaning: ${w.zh})` : ''}`).join('\n');
    let parsed = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        const res = await fetch(AI_WRITING_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5', max_tokens: 4000,
            system: AI_VOCAB_SYS,
            messages: [{ role: 'user', content: userMsg }],
          }),
        });
        const data = await res.json();
        const txt = data?.content?.[0]?.text || data?.text || '';
        const arr = JSON.parse(_aiStripFence(txt));
        if (Array.isArray(arr)) parsed = arr;
      } catch (e) { /* 再試一次；兩次都失敗就丟錯誤 */ }
    }
    if (!parsed) throw new Error('AI 出題失敗（回傳格式看不懂），請再試一次。');
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
    if (onProgress) onProgress(Math.min(i + chunk, list.length), list.length);
  }
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
    BAD:  \`Tom [has never been](be) to the zoo.\`  → write \`Tom has never [been](be) to the zoo.\``}`;
};

async function _grCall(system, user, maxTokens) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(AI_WRITING_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: maxTokens || 3000, system, messages: [{ role: 'user', content: user }] }),
      });
      const data = await res.json();
      const arr = JSON.parse(_aiStripFence(data?.content?.[0]?.text || ''));
      if (arr && Array.isArray(arr.items)) return arr.items;
    } catch (e) { /* 再試一次 */ }
  }
  throw new Error('AI 出題失敗（回傳格式看不懂），請再試一次。');
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

/* 產生一個時態的整套題目。
   typeA: 幾「組」×10 題；typeB: 幾篇短文。回傳 { A:[[10題],[10題],…], B:[篇,…] } */
async function aiMakeGrammarSet({ tense, aGroups = 3, bCount = 5, onProgress } = {}) {
  if (!GR_TENSES[tense]) throw new Error('不認得這個時態');
  const total = aGroups + bCount;
  let done = 0;
  const bump = (label) => { done++; if (onProgress) onProgress(done, total, label); };
  const A = [];
  for (let g = 0; g < aGroups; g++) {
    const keep = [];
    for (let round = 0; round < 4 && keep.length < 10; round++) {
      const seen = A.flat().concat(keep).map(x => x.answer).join(', ');
      const items = await _grCall(_GR_SYS(tense, 'A', 12),
        `Generate 12 items.${seen ? ` Do NOT reuse these answers: ${seen}.` : ''}`, 3400);
      items.map(x => ({
        prompt: String(x.prompt || '').trim(),
        answer: String(x.answer || '').trim(),
        explain: String(x.explain || '').trim(),
      })).forEach(x => { if (keep.length < 10 && _grValidA(x) && _grTenseOk(tense, x)) keep.push(x); });
    }
    A.push(keep);
    bump(`單句填空 ${g + 1}/${aGroups}`);
  }
  const B = [];
  for (let i = 0; i < bCount; i++) {
    let best = null;
    for (let round = 0; round < 4 && !best; round++) {
      const seen = B.map(x => x.title).join(', ');
      const items = await _grCall(_GR_SYS(tense, 'B', 1),
        `Generate 1 passage.${seen ? ` Use a different situation from: ${seen}.` : ''}`, 2000);
      const p = items[0] || {};
      const cand = { title: String(p.title || '').trim(), passage: _grFixPassage(String(p.passage || '').trim()) };
      const blanksOk = (cand.passage.match(/\[([^\]]+)\]/g) || [])
        .every(m => _grTenseOk(tense, { prompt: cand.passage, answer: m.slice(1, -1) }));
      if (_grValidB(cand) && blanksOk) best = cand;
      else if (round === 3) best = cand;      // 四次都不合格就先收下，讓老師在校稿頁改
    }
    B.push(best);
    bump(`短文填空 ${i + 1}/${bCount}`);
  }
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
- Everything must be simple enough for a 10-year-old. Use school, family, food, animals, sport.`;

async function aiMakeLesson({ topic, notes = '', tense = '' } = {}) {
  const T = tense && GR_TENSES[tense];
  const user = T
    ? `Topic: ${T.en}（${T.zh}）\nThe student must learn:\n${T.must}\nMust avoid:\n${T.avoid}`
    : `Topic: ${topic}\n${notes ? `Teacher notes: ${notes}` : ''}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(AI_WRITING_ENDPOINT, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 2600, system: _LS_SYS, messages: [{ role: 'user', content: user }] }),
      });
      const data = await res.json();
      const o = JSON.parse(_aiStripFence(data?.content?.[0]?.text || ''));
      if (o && (o.lead || o.uses)) {
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
    } catch (e) { /* 再試一次 */ }
  }
  throw new Error('教學卡產生失敗，請再試一次。');
}

function grCountBlanks(passage) {
  return (String(passage || '').match(/\[[^\]]+\]/g) || []).length;
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
      const res = await fetch(endpoint, {
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
    } catch(e) { return 'AI 批改服務暫時連不上，請稍後再試。'; }
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
      const res = await fetch(endpoint, {
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
    } catch(e) { return 'AI 批改服務暫時連不上，請稍後再試。'; }
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
      const res = await fetch(endpoint, {
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
    } catch(e) { return 'AI 批改服務暫時連不上，請稍後再試。'; }
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

  const getProgress = (itemId) => {
    const pk = `${targetWeekId}_${itemId}`;
    return its[pk] || its[itemId] ||
      its[Object.keys(its).find(k => k.endsWith('_' + itemId)) || ''] || null;
  };

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
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const name = esc(studentName || '學生');
  const weekLine = esc(`${report.weekLabel || ''}${report.dateRange ? ' · ' + report.dateRange : ''}`);
  const avg = report.avgScore;
  const hasScore = avg != null;
  const circ = 402;
  const off = hasScore ? Math.round(circ * (1 - Math.max(0, Math.min(100, avg)) / 100)) : circ;
  const compN = report.completed.length, totN = report.totalItems;
  const rate = report.completionRate;
  const streakN = (report.streak && report.streak.count) || 0;

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
  playSound, speakText, speakTTS, speakSentences, prefetchTts, unlockTtsAudio, getTtsMode, setTtsMode, grSpeechChunks, ttsPickVoice: _ttsPickVoice,
  aiMakeVocabExercises, aiMakeGrammarSet, GR_TENSES, grCountBlanks, grValidA: _grValidA, grValidB: _grValidB, grFixPassage: _grFixPassage, aiMakeLesson,
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
   2026 學年 base=16：le13→G3、le12→G4、le11→G5、le10→G6
   ⚠️ 每年開學要 +1（2027 學年改成 17）——非學校帳號回傳 null，不自動分類 */
const LE_GRADE_BASE = 16;
window.gradeFromEmail = function (email) {
  const m = String(email || '').toLowerCase().match(/^le(\d{2})/);
  if (!m) return null;
  const g = LE_GRADE_BASE - parseInt(m[1], 10);
  return (g >= 2 && g <= 6) ? ('g' + g) : null;
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
  if (type === 'fillblank' || type === 'cloze' || type === 'def-match') { if (pct == null) return 0; return pct >= 100 ? 15 : (pct >= 80 ? 10 : 0); }
  return 0;
}
// weeks/weekOrder＝這位學生看得到的週次（暑假要先用 filterWeeksForPlan 過濾）
// progItems＝進度 map；opts.cloudShape=true 代表直接吃 progress 文件的 items
function computeAutoStars(weeks, weekOrder, progItems, opts) {
  const cloudShape = !!(opts && opts.cloudShape);
  const entries = [];
  let total = 0;
  const getProg = (wid, id) => {
    const its = progItems || {};
    return its[`${wid}_${id}`] || its[id] ||
           its[Object.keys(its).find(k => k.endsWith('_' + id)) || ''] || null;
  };
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
