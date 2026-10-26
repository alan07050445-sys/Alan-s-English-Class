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
    callback(d.items || {}, d.checkin || null, d.fixed || null);
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

/* v442（Alan：「我也有 G1 G2 的學生，生成出來的題目要簡單一點，
   所以我希望 AI 可以分級 G1G2 / G3G4 / G5G6，但一定都要給 context clue」）
   ⚠ 只有「句子的難度」跟著年級走；**線索一定要有**——那是這個題型的重點，
     低年級只是把線索講得更白話、句子更短。 */
const VOCAB_BANDS = {
  low:  { label: 'G1-G2', note: `Grades 1-2 (age 6-8, CEFR pre-A1).
- sentence: 8-12 words, ONE simple clause, present tense, only very common words (like, eat, play, happy, school).
- The clue must be a concrete, everyday picture a 7-year-old can see (food, animals, family, toys, weather).
- def: 5-8 words, use the simplest words you know.
- explain: Traditional Chinese, 15-30 characters, very plain wording.` },
  mid:  { label: 'G3-G4', note: `Grades 3-4 (age 9-10, CEFR A1-A2).
- sentence: 12-18 words, one or two clauses, simple past or present.
- def: 5-12 words.
- explain: Traditional Chinese, 20-40 characters.` },
  high: { label: 'G5-G6', note: `Grades 5-6 (age 11-12, CEFR A2).
- sentence: 14-22 words, may use because/when/so and richer vocabulary around the blank.
- def: 6-14 words.
- explain: Traditional Chinese, 25-45 characters.` },
};
const vocabBandOf = (g) => (g === 'g1' || g === 'g2' || g === 'low') ? 'low'
  : (g === 'g5' || g === 'g6' || g === 'high') ? 'high' : 'mid';
const AI_VOCAB_SYS =
`You write English exercises for Taiwanese elementary-school students (grades 2-6, CEFR A1-A2).
Output ONLY a JSON array. No prose, no markdown, no code fences.

For each target word output:
{"word":"<word> (<pos.>)","zh":"<Traditional Chinese meaning>","def":"<definition>","sentence":"<context sentence with ___>","answer":"<the word as it fills the blank>","explain":"<Traditional Chinese explanation>"}

RULES
- zh: the Traditional Chinese meaning of the word, 2-8 characters, no explanation (e.g. 遺產／移民／訪問).
- def: a kid-friendly ENGLISH definition, 5-14 words, no ending punctuation, and it must NOT contain the target word or any form of it.
- IF a target word comes with [TEACHER'S DEFINITION: "..."], copy that text into "def" EXACTLY, character for character.
  Do not rewrite it, shorten it, fix its grammar, or add punctuation. That is the wording the teacher will test,
  so every other field you write for that word (sentence, explain) must agree with it.
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

const WS_SYS = `You design a Word Study worksheet for Taiwanese elementary students,
in the style of a Kang Chiao (康橋) textbook Word Study page.
Output ONLY JSON:
{"topic":"","rule":"","ruleZh":"","check":{"kind":"vce|suffix|prefix|team|digraph","args":[""]},
 "groups":[{"label":"","arg":"","means":"","zh":"","words":[""]}],
 "yes":[""],"no":[""],
 "mcq":[{"q":"","options":["","","",""],"answer":0}],
 "build":[{"clue":"","base":"","answer":""}],
 "bases":{"safety":"safe"},
 "story":{"title":"","text":""}}
RULES
- check: how a computer can test the pattern. "vce" needs no args.
  For "suffix"/"prefix", args are the affixes ("-ty", "-ity", "-ic", "-ment").
  For "team"/"digraph", args are the letter groups ("ai", "ay", "ea", "ee", "oa").
  ⚠ LIST EVERY affix or team the topic covers — a word counts as following the pattern when it
  matches ANY of them. Missing one makes the whole worksheet wrong.
- rule: ONE sentence of simple English a 9-year-old reads, explaining the pattern.
- ruleZh: the same thing in spoken Traditional Chinese, ≤30 characters, keeping the English terms in English.
- groups: 2-4 sub-groups, each with 3-5 real words that belong ONLY to that group.
  (long a / long i / long o / long u … or -ty / -ity / -ic / -ment … or ai / ay / ea / ee …)
  "arg" is which one of your "check" args that group is for ("-ity", "ea"); leave it "" for vce groups.
  ⚠ "label" must be SHORT — just the affix or the letters ("-ity", "ea", "long a"), at most 10 characters.
  Put the meaning in "means" instead (English, ≤4 words: "quality of", "the sound in rain").
  "zh": how a teacher says that group out loud in Traditional Chinese, ≤20 characters, keeping the
  English part in English (「-ity 是『品質、狀態』，把動詞或形容詞變成名詞」).
  ⚠ EVERY group needs "means" and "zh" — the site reads them out in the lesson, so a missing one
  means the children never get told what that group is.
- mcq: when a question names ONE affix or team ("Which word has the ea vowel team?"), every option is
  judged against THAT one only — so exactly one option must have it and the others must not.
- yes: 8-12 words that DO follow the pattern. no: 8-12 that clearly do NOT.
  Mix them from everyday school words a 9-year-old meets.
- mcq: 4-6 questions. q is one short English question ("Which word has the VCe pattern?").
  options: four real words where EXACTLY ONE follows the pattern. answer: 0-based index.
- ⚠ For an AFFIX topic, every word inside "groups" must really be BASE + AFFIX
  (safety = safe + -ty). Words that merely END in those letters are NOT allowed there:
  "dirty", "empty", "plenty", "twenty", "music", "comic" have no base word, so they teach the
  wrong idea in a lesson about building words. Put look-alikes in "no" if you want them.
- ⚠ Each group's "means" must be different from the other groups'.
  For a sound topic (vce / team / digraph), "means" must be "the sound in <word>" where <word>
  is one of THAT group's own words — naming a word from another group teaches the wrong sound.
- bases: ONLY when the pattern is an affix (suffix/prefix). For EVERY word you listed in "groups",
  give the base word it was built from ("safety":"safe", "ability":"able", "basic":"base",
  "historic":"history", "enjoyment":"enjoy"). The children are shown "safe + -ty", so they can
  see where the word came from. Spell the base word as a real English word on its own.
  If the pattern is not an affix (vce / team / digraph), return {}.
- build: 4-6 items, only when the pattern is an affix. clue = the meaning in simple English
  ("relating to history"), base = the base word ("history"), answer = base + affix ("historic").
  If the pattern is not an affix, return an empty array.
- story: ONE short passage (60-110 words) a 9-year-old enjoys, containing 6-10 words that follow
  the pattern, spread across the whole passage. Give it a short title.
  ⚠ Every word in the passage must be spelled correctly and the English must be natural.
- Everything the student sees is ENGLISH. Only "ruleZh" is Chinese.
${_AI_MINIFY}`;

/* 程式把 AI 的產出整個驗一遍。AI 只負責「想題材」，對錯一律程式說了算。 */
/* v486（Alan：「這種類型一定要都給 base word，這樣小朋友才知道原來是從這個字變過來的」）：
   base word 不能純靠程式推——safety→safe 砍掉字尾就有，但 basic→base（要補 e）、
   historic→history（要補 y）、ability→able（il→le 的母音變化）都推不出來。
   所以照老規矩：**AI 給、程式驗**。驗不過的那一個字就不顯示 base，不要整份退回
   （少一個拆解只是少一點提示，給錯的拆解才是教錯）。 */
function _wsBaseOk(word, affix, base) {
  const w = String(word || '').toLowerCase();
  const b = String(base || '').toLowerCase();
  const a = String(affix || '').replace(/-/g, '').toLowerCase();
  if (!/^[a-z]{2,}$/.test(b) || !w || !a || b === w) return false;
  // 字尾／字首剝掉之後剩下的「字幹」
  const stem = w.endsWith(a) ? w.slice(0, -a.length) : (w.startsWith(a) ? w.slice(a.length) : '');
  if (stem.length < 2) return false;
  if (b === stem) return true;                                   // loyalty → loyal
  if (b === stem + 'e') return true;                             // basic → base、creativity → creative
  if (b === stem + 'y') return true;                             // historic → history
  if (stem.endsWith('i') && b === stem.slice(0, -1) + 'y') return true;   // happiness → happy
  if (stem.endsWith('il') && b === stem.slice(0, -2) + 'le') return true; // ability → able、possibility → possible
  if (stem.endsWith('ic') && b === stem.slice(0, -2) + 'y') return true;  // -ity 接在 -ic 後
  return false;
}

function wsValidPack(x) {
  const str = (v) => String(v == null ? '' : v).trim();
  const words = (a) => (Array.isArray(a) ? a : []).map(str).filter(w => /^[A-Za-z][A-Za-z'-]*$/.test(w));
  const check = { kind: str(x && x.check && x.check.kind).toLowerCase(), args: _wsArgs(x && x.check) };
  if (!WS_CHECKS[check.kind]) return null;                       // 程式不會判的規則，整份退回
  if (check.kind !== 'vce' && !check.args.length) return null;    // 除了 vce，一定要講明是哪些詞綴／字母
  const hit = (w, one) => wsCheck(w, check, one) === true;

  const rule = str(x && x.rule), ruleZh = _zhTW(str(x && x.ruleZh));
  if (!rule || _gnCJK.test(rule)) return null;

  // ① 圈出來：符合的留下、不符合的留下，兩邊都要程式驗過
  /* ⚠ 一定要寫成 `w => hit(w)`，不可以直接 `.filter(hit)`——
     Array.filter 會把「索引」當第二個參數傳進去，而 hit 的第二個參數是
     「只比哪一個 pattern」→ 第 2 個字以後都拿索引去比，全部判成不符合。 */
  const yes = [...new Set(words(x && x.yes).filter(w => hit(w)))];
  const no  = [...new Set(words(x && x.no).filter(w => !hit(w)))].filter(w => yes.indexOf(w) < 0);

  // ② 分一分：每個字都要真的符合規則，而且每一籃至少 2 個
  /* 每一籃可以指名自己的 pattern（「-ity」那一籃就只收 -ity 的字）。
     沒指名就從籃子名稱猜，猜不到才退回「符合任何一個」。 */
  const groups = (Array.isArray(x && x.groups) ? x.groups : []).map(g => {
    const lab = str(g && g.label);
    const one = str(g && g.arg)
      || check.args.find(a2 => lab.toLowerCase().indexOf(String(a2).replace(/^-|-$/g, '').toLowerCase()) >= 0)
      || '';
    /* 🔴 v485：籃子名稱**只放詞綴／字母**，意思放 means。
       v484 讓 AI 自己決定 label，它寫成「-ity (quality of)」→ 畫面上被切成「-ity (qu」。
       ⚠ 光靠提示詞擋不住，程式自己拆：括號裡的東西搬去 means，名稱只留前面那一段。 */
    const m = lab.match(/^([^(（]+)[(（]([^)）]*)[)）]?\s*$/);
    const short = (m ? m[1] : lab).trim().slice(0, 12);
    const means = str(g && g.means) || (m ? m[2].trim() : '');
    return { label: short, arg: one,
             means: means.slice(0, 40), zh: _zhTW(str(g && g.zh)).slice(0, 40),
             words: [...new Set(words(g && g.words).filter(w => hit(w, one || undefined)))] };
  }).filter(g => g.label && g.words.length >= 2);
  // 同一個字不可以出現在兩籃（不然分到哪都對）
  const seenG = new Set();
  groups.forEach(g => { g.words = g.words.filter(w => { const k = w.toLowerCase(); if (seenG.has(k)) return false; seenG.add(k); return true; }); });
  /* ⑥ v486 base word（Alan：「這種類型一定要都給 base word」）：
     AI 給、程式驗，驗不過的不收——`safety←safari` 這種假拆解比沒有還糟。
     ⚠ 順便擋掉「只是剛好那樣結尾」的字：dirty／empty／plenty 沒有 base word，
       放進「加 -ty 造新字」的籃子裡會教成錯的觀念（真 AI 第一次就塞了 dirty、empty）。
     不是詞綴的主題（VCe／母音組合）本來就沒有 base word，整段跳過。 */
  const bases = {};
  const affix = (check.kind === 'suffix' || check.kind === 'prefix');
  if (affix) {
    const src = (x && x.bases && typeof x.bases === 'object') ? x.bases : {};
    (Array.isArray(x && x.build) ? x.build : []).forEach(b => {
      const ans = str(b && b.answer); if (ans && !src[ans]) src[ans] = str(b && b.base);
    });
    /* ⚠ 只有「AI 真的有給 bases」時才拿它當門檻。整份都沒給就只是少了拆解提示，
       不該因此把分籃清空、連分一分都生不出來（第一版寫太嚴，整組單元就不見了）。
       沒給的情況交給下面的重試回饋去要。 */
    const strict = Object.keys(src).length > 0;
    groups.forEach(g => {
      g.words = g.words.filter(w => {
        if (!strict) return true;
        const got = str(src[w] || src[w.toLowerCase()]);
        const aff = g.arg || check.args.find(a => wsCheck(w, check, a) === true) || '';
        if (!got || !_wsBaseOk(w, aff, got)) return false;
        bases[w] = got.toLowerCase();
        return true;
      });
    });
  }

  /* v486：聲音類的 means 要用**這一籃自己的字**（真 AI 給過
     `long e → the sound in mile`——mile 是 long i，說明直接標錯）。
     AI 講的字不在這一籃裡就不要它，改用這一籃的第一個字自己拼。 */
  if (!affix) {
    groups.forEach(g => {
      const own = g.words.map(w => w.toLowerCase());
      const named = (g.means.toLowerCase().match(/[a-z']+/g) || []).some(t => own.indexOf(t) >= 0);
      if (!named && g.words.length) g.means = `the sound in ${g.words[0]}`;
    });
  }

  const goodGroups = groups.filter(g => g.words.length >= 2).slice(0, 4);

  // ③ 選擇題：四個選項裡**只能有一個**符合規則，而且正解要指對
  const mcq = (Array.isArray(x && x.mcq) ? x.mcq : []).map(q => {
    const opts = words(q && q.options);
    if (opts.length !== 4) return null;
    if (new Set(opts.map(o => o.toLowerCase())).size !== 4) return null;
    const qq = str(q && q.q);
    if (!qq || _gnCJK.test(qq)) return null;
    /* 🔴 v484：**題目問哪一個 pattern，就要照那一個算答案**。
       v482 只用「符合任何一個」算，實測出現
       「Which word has the ea vowel team? → straight」——straight 是 ai 不是 ea，正解是錯的。 */
    const lowQ = ' ' + qq.toLowerCase() + ' ';
    const named = check.args.filter(a2 => {
      const bare = String(a2).replace(/^-|-$/g, '').toLowerCase();
      return bare && (lowQ.indexOf('-' + bare) >= 0 || lowQ.indexOf(' ' + bare + ' ') >= 0 || lowQ.indexOf('"' + bare) >= 0);
    });
    if (named.length > 1) return null;                           // 一題問兩種，說不清楚要哪個
    const ok = opts.map(o => hit(o, named[0]));
    if (ok.filter(Boolean).length !== 1) return null;            // 只能有一個對
    return { q: qq, options: opts, answer: ok.indexOf(true) };
  }).filter(Boolean);

  // ④ 加字首字尾：答案一定要真的等於「base ＋ 那個詞綴」才收
  const build = (Array.isArray(x && x.build) ? x.build : []).map(b => {
    const clue = str(b && b.clue), base = str(b && b.base), ans = str(b && b.answer);
    if (!clue || !base || !ans || _gnCJK.test(clue + base + ans)) return null;
    if (!hit(ans)) return null;
    if (ans.toLowerCase() === base.toLowerCase()) return null;
    return { clue, base, answer: ans };
  }).filter(Boolean);

  // ⑤ 短文找字：程式自己從短文裡找出符合的字＝答案不可能錯
  const st = x && x.story;
  const text = str(st && st.text);
  let story = null;
  if (text && !_gnCJK.test(text)) {
    const toks = text.split(/\s+/).map(_GN_TOK).filter(Boolean);
    const found = [...new Set(toks.filter(w => hit(w)).map(w => w.toLowerCase()))];   // ⚠ 同上，不可以直接 .filter(hit)
    // 只留「整篇只出現一次」的（學生是一個字一個字點的，出現兩次就說不準點哪個）
    const once = found.filter(w => toks.filter(t => t.toLowerCase() === w).length === 1);
    const n = toks.length;
    if (once.length >= 4 && n >= 40 && n <= 160) {
      story = { title: str(st.title).slice(0, 40), text, answers: once.slice(0, 10) };
    }
  }

  const enough = (yes.length >= 4 && no.length >= 4) || goodGroups.length >= 2 || mcq.length >= 2 || !!story;
  if (!enough) return null;
  return { topic: str(x && x.topic).slice(0, 60), rule, ruleZh, check, bases,
           yes: yes.slice(0, 12), no: no.slice(0, 12), groups: goodGroups, mcq: mcq.slice(0, 8), build: build.slice(0, 8), story };
}

async function aiMakeWordStudy({ topic, words = '', grade = 'g4', teacherNote = '', onProgress } = {}) {
  const band = VOCAB_BANDS[vocabBandOf(grade)];
  const list = String(words || '').split(/[\n,、，]+/).map(w => w.trim()).filter(Boolean).slice(0, 40);
  const base = `LEVEL: ${band.label}\n${band.note}\n\n` +
    `WORD STUDY TOPIC: ${String(topic || '').trim()}\n` +
    _aiTeacherNote(teacherNote) +
    (list.length ? `The teacher's own spelling list for this lesson — use these words first, and add more of your own if you need:\n${list.join(', ')}\n` : '');
  let last = null, feedback = '';
  for (let round = 0; round < 3; round++) {
    if (onProgress) onProgress(round + 1, 3);
    let raw;
    try { raw = await _gnCall(WS_SYS, base + feedback, 3000); } catch (e) { last = e; continue; }
    const pack = wsValidPack(raw);
    if (pack) return pack;
    /* 跟 v480 同一個道理：擋掉就要講原因，不然重試只是再犯一次。 */
    feedback = '\n\nYour previous answer was REJECTED by a checker. Common reasons:\n' +
      '- "check" was missing or not one of vce / suffix / prefix / team / digraph\n' +
      '- a word you put in "yes" or in a group does NOT actually follow the pattern\n' +
      '- an MCQ had zero or more than one option following the pattern (exactly one must)\n' +
      '- the story had fewer than 4 pattern words that appear exactly once\n' +
      'Check every single word against the pattern yourself before answering.';
  }
  throw new Error('Word Study 題目產生失敗' + _aiUpstreamNote(last));
}

const AI_SENSE_SYS = `You write "which meaning is it here?" vocabulary questions for Taiwanese
elementary students, exactly like a Kang Chiao formative assessment.
Output ONLY a JSON array: [{"word":"","passage":"","title":"","q":"","options":["","","",""],"answer":0,"explain":""}]
RULES
- title: a SHORT headline, 2-5 words. Put it ONLY here.
- passage: 2-4 short sentences (25-55 words) that a 9-year-old enjoys.
  Do NOT repeat the title inside it and never start it with "Title:" — the site shows the title separately.
  The target word must appear in it EXACTLY ONCE, used in ONE clear meaning, and the sentences
  around it must make that meaning findable. Never define the word inside the passage.
  ⚠ Use the word NATURALLY — change its form if the sentence needs it (trap -> trapped, soar -> soaring).
  Every sentence must be perfect English. "it got trapping in the bushes" is wrong and unusable.
- q: always exactly "Based on the passage above, what does <word> mean?"
- options: FOUR definitions, 3-9 words each, no ending punctuation.
  ⚠⚠ The three wrong ones must be OTHER REAL MEANINGS OF THE SAME WORD, or meanings that sound
  close to it — never the definition of a different word, and never something silly.
  Example for "shade": "a cool place out of the sun" (right) / "a colour that is a little dark" /
  "a cover for a lamp" / "to hide something from someone".
  If the word honestly has only one meaning, use near-misses a child would really pick
  (too wide, too narrow, or the opposite).
- All four options must be about the SAME part of speech and similar length, so the longest one
  is not always the answer.
- options[0] is ALWAYS the correct definition, and "answer" is ALWAYS 0.
  Do NOT move it around — the website shuffles the positions itself afterwards.
- explain: very simple ENGLISH, ≤16 words, quoting the clue words from YOUR passage.
${_AI_MINIFY}`;

/* 回傳 [{word, title, passage, q, options, answer, explain}]。
   驗證的重點：目標字在短文裡只出現一次、四個選項不重複、答案位置要分散。

   🔴 v488（Alan：「我單字卡有 8 個，字義選擇只有 4 題」）：
   實測 8 個字只出 4~5 題，被擋掉的全是「出題者說 2、覆核說 0」。
   一度以為是覆核在亂判，但把同一題的正解輪流放到四個位置去問，
   覆核 12/12 全對——**沒有位置偏誤，是出題者自己標錯**。
   根因在提示詞：`Put the correct one in a DIFFERENT position each time`
   → 模型把正確定義寫在第 0 格，卻為了「換位置」宣稱答案是第 2 格。
   而位置**程式本來就會攤平**（_qsSpreadAnswers，v468 做的）＝這行指令既多餘又有害。
   改成「正解一律放第 0 格」，位置交給程式。
   ⭐ 通用原則：**程式自己會做的隨機化，不要再叫模型做一次**——
      模型為了服從而謊報，而那是程式看不出來的錯（跟 v417「選最長的就對」同一類）。 */
async function aiMakeVocabSense(words, { grade = 'g4', hint = '', teacherNote = '', avoid = [], onProgress } = {}) {
  const list = (words || []).map(w => (typeof w === 'string' ? { term: w } : w)).filter(w => w && w.term);
  if (!list.length) return [];
  /* 第一輪出完 → 交叉檢查 → 沒過的那幾個字**再出一次**。
     實測第一輪大約會被擋掉一半（都是真的標錯答案），直接丟掉的話老師貼 8 個字只拿到 4 題。 */
  let got = await _senseRound(list, { grade, hint, teacherNote, avoid, onProgress });
  const miss = list.filter(w => !got.some(g => g.word.toLowerCase() === w.term.toLowerCase()));
  if (miss.length) {
    const more = await _senseRound(miss, { grade, hint, teacherNote, avoid, onProgress: null });
    got = got.concat(more);
  }
  // 照老師貼的順序排回去，再把正解位置攤平
  const ix = (w) => list.findIndex(x => x.term.toLowerCase() === w.word.toLowerCase());
  got.sort((a, b) => ix(a) - ix(b));
  return _qsSpreadAnswers(got);
}

async function _senseRound(list, { grade = 'g4', hint = '', teacherNote = '', avoid = [], onProgress } = {}) {
  const band = VOCAB_BANDS[vocabBandOf(grade)];
  const parts = [];
  for (let i = 0; i < list.length; i += 2) parts.push(list.slice(i, i + 2));
  let done = 0;
  const packs = await pMap(parts, async (part) => {
    const msg = `LEVEL: ${band.label}\n${band.note}\n\n` +
      (hint ? `Topic: ${hint}\n` : '') + _aiTeacherNote(teacherNote) + _aiAvoidNote(avoid) +
      'Target words:\n' + part.map(w => `- ${w.term}${w.zh ? `  (${w.zh})` : ''}`).join('\n');
    try {
      return await _aiAsk({ model: 'claude-haiku-4-5', max_tokens: Math.max(900, part.length * 450),
        system: AI_SENSE_SYS, messages: [{ role: 'user', content: msg }] },
        (d) => { const a = JSON.parse(_aiStripFence(d?.content?.[0]?.text || '')); return Array.isArray(a) ? a : null; });
    } finally { done += part.length; if (onProgress) onProgress(Math.min(done, list.length), list.length); }
  }, 10);
  const cand0 = [];
  (packs || []).forEach(arr => (arr || []).forEach(x => { const v = qsValidSense(x); if (v) cand0.push(v); }));
  /* ⚠ v488：**先攤平位置、再送去覆核**。
     提示詞現在要求正解一律放第 0 格（見 aiMakeVocabSense 上面的說明），
     如果就這樣拿去問覆核，它每一題都只要回答「0」——萬一它偏好第一個選項，
     整個交叉檢查就變成蓋橡皮章。攤平之後正解平均落在 ABCD，它才真的要讀短文。 */
  const cand = _qsSpreadAnswers(cand0);
  /* ⚠⚠ 2026-10-06 實測：模型會**把答案標錯**（trapping 的正解是「catching or holding」，
     它標成「making a sound」）。這種錯程式看不出來——四個選項都像定義。
     所以讓另一個 AI 自己讀短文作答，對不上就丟掉那一題。
     跟 v431 選擇題、v444 找出來、v452 分一分、v467 整段改錯同一招：
     **單一正解的題型，一律要有第二個 AI 的意見。** */
  const checked = await pMap(cand, async (x) => {
    try {
      const pick = await _aiAsk({
        model: 'claude-haiku-4-5', max_tokens: 120,
        system: `You answer ONE multiple-choice vocabulary question. Output ONLY JSON: {"answer":0}
Read the passage, decide what the word means THERE, and give the 0-based index of the best option.`,
        messages: [{ role: 'user', content:
          `PASSAGE:\n${x.passage}\n\nQUESTION: ${x.q}\nOPTIONS:\n` +
          x.options.map((o, i) => `${i}. ${o}`).join('\n') }],
      }, (d) => { const o = JSON.parse(_aiStripFence(d?.content?.[0]?.text || '')); return (o && Number.isInteger(o.answer)) ? o : null; }, 30000);
      return pick.answer === x.answer ? x : null;     // 兩邊不同調＝這一題有問題，不要給學生
    } catch (e) { return x; }                         // 檢查器掛掉不擋住老師
  }, 6);
  return checked.filter(Boolean);
}

function qsValidSense(x) {
  const word = String((x && x.word) || '').trim();
  /* 🔴 v476（Alan：「文章內部又寫了一次標題」）：提示詞本來寫
     「passage … with a short "title"」，AI 就把標題寫進短文裡
     → 畫面上方一個標題、短文開頭又一個「Title: The Kind Neighbors」。
     提示詞已經改掉，這裡再清一次（AI 偶爾還是會寫，而且舊的也救得回來）。 */
  let passage = String((x && x.passage) || '').trim()
    .replace(/^\s*(title|標題)\s*[:：]\s*/i, '');
  const t0 = String((x && x.title) || '').trim();
  if (t0 && passage.toLowerCase().indexOf(t0.toLowerCase()) === 0) {
    passage = passage.slice(t0.length).replace(/^[\s.:：,，、-]+/, '');
  }
  const opts = (Array.isArray(x && x.options) ? x.options : []).map(o => String(o || '').trim()).filter(Boolean);
  const ai = Number(x && x.answer);
  if (!word || !passage || opts.length !== 4) return null;
  if (_gnCJK.test(passage + opts.join(''))) return null;
  if (!(ai >= 0 && ai < 4)) return null;
  if (new Set(opts.map(o => o.toLowerCase())).size !== 4) return null;      // 選項不可以重複
  // 目標字在短文裡只能出現一次，不然「哪一個用法」就不唯一了
  const toks = passage.split(/\s+/).map(_GN_TOK).filter(Boolean).map(t => t.toLowerCase());
  const base = word.toLowerCase();
  const hits = toks.filter(t => t === base || t === base + 's' || t === base + 'es' || t === base + 'ed' || t === base + 'ing').length;
  if (hits !== 1) return null;
  const n = toks.length;
  if (n < 20 || n > 70) return null;
  // 正解不可以永遠是最長的那一個（v417 的教訓：學生會發現「選最長的就對」）
  const lens = opts.map(o => o.split(/\s+/).length);
  if (lens[ai] > Math.max(...lens.filter((_, i) => i !== ai)) + 3) return null;
  return { word, title: String((x && x.title) || '').trim().slice(0, 40), passage,
           q: `Based on the passage above, what does ${word} mean?`,
           options: opts, answer: ai, explain: String((x && x.explain) || '').trim() };
}

/* 把正解位置攤平：模型很愛一直放同一格，學生兩題就看出來了。 */
function _qsSpreadAnswers(list) {
  return (list || []).map((x, i) => {
    const want = i % 4;
    if (x.answer === want) return x;
    const opts = x.options.slice();
    const right = opts[x.answer];
    opts[x.answer] = opts[want]; opts[want] = right;
    return { ...x, options: opts, answer: want };
  });
}

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
- ENGLISH ONLY. The passage and the title must contain no Chinese characters at all —
  not for translation, not for hints, not in brackets. A single Chinese character makes the whole story invalid.
- The story must use EVERY target word exactly once, and nothing else may be bracketed.
- 🔴 ONE WORD, ONE USE. Each target word appears EXACTLY ONCE in the whole story — one blank, no more.
  Never use the same word again anywhere else (not as a second blank, not as plain text, not in another form
  such as fluffy → fluffier). If you want to say it again, use a different word.
- 🔴 EVERY BLANK MUST BE WORK-OUT-ABLE. A child must be able to tell WHICH word goes there from the words around it,
  without being told. In the SAME sentence (or the one right next to it) give at least one real CLUE to the word's MEANING:
    · a definition or explanation:    "She used a [thermos] to keep her soup hot for hours."
    · a contrast or opposite:         "The path was [narrow], not wide, so only one person could pass."
    · an example or a result:         "He had to [waterproof] the bag, so no rain could get in."
    · what the thing does or looks like: "The [contour] of the hill — its smooth curved outline — ..."
  The clue must point to THIS word, not just to the right part of speech.
  BAD (many words fit — never write these):  "It was a very [fluffy] day."   "She felt [smoothly]."   "He liked the [system]."
  GOOD (only one word fits):                  "The cat's fur was so [fluffy] that her hand sank into it like a soft cloud."
- Do not choose a blank where another target word from the list could fit equally well.
- Wrap each target word in square brackets where it belongs: [word]
- If the word needs a different form, put the exact form the student types inside the brackets
  and the ending as a hint right after: [soaring](ing)  [attracts](s)  [trapped](ed)
- The hint in ( ) is ONLY ever a word ENDING. If the word is unchanged, write no hint at all.
  Never write a part of speech such as (n) (v) (adj) (adv) — the child is filling in a word, not labelling it.
- Never let a target word appear anywhere outside its own brackets (no giveaways).
- 🔴 LENGTH: 180-260 words and 10-14 sentences (count them — under 150 words is rejected). A story this short-and-thin is rejected: write a FULL story with three clear parts —
    · BEGINNING: who and where, what they want to do (2-3 sentences)
    · MIDDLE: what happens, with a small problem or a surprise, and the steps they take (4-8 sentences — this is where most blanks go)
    · END: how it turns out and what they feel or learn (2-3 sentences)
  Enough sentences around each blank is what makes its answer easy to work out.
- Every OTHER word must be simple, everyday vocabulary a 3rd grader knows.
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

/* ══ v445（Alan：「一鍵生成都可以自己跟 AI 協調，這次我可能要客製化某一些地方」）══
   老師在每個一鍵生成的視窗裡都可以寫一段「特別要求」，原封不動送給 AI。
   ⚠ 放在 user 訊息裡、而且明講「不可以破壞 JSON 格式」——格式一壞整份就沒了。 */
/* v466：把「上次已經出過的句子」攤給模型看，並明講不可以再用。
   只放前 24 句——再多會把 prompt 撐大又沒有額外效果（真的要避開的就是最近那一批）。 */
function _aiAvoidNote(avoid) {
  const list = (avoid || []).map(x => String(x || '').trim()).filter(Boolean).slice(0, 24);
  if (!list.length) return '';
  return `\nALREADY USED — this is a REVIEW round, so the student has seen these before.
Every sentence you write must be about a DIFFERENT situation from all of these.
Do not reuse their people, places, objects or verbs, and do not just swap one word:
${list.map(x => '  × ' + x).join('\n')}\n\n`;
}

function _aiTeacherNote(t) {
  const s2 = String(t || '').trim().slice(0, 600);
  if (!s2) return '';
  return "TEACHER'S SPECIAL REQUEST — follow it exactly, it outranks your own preferences.\n" +
    'It can change WHAT you write (the topic, the wording, which points to cover, how many),\n' +
    'but it can NEVER change the output FORMAT or the JSON rules above.\n\"\"\"\n' + s2 + '\n\"\"\"\n\n';
}

/* v604：短文最少幾個字才算夠長（要求是 150~260，留一點餘裕避免為了幾個字重打 AI） */
const STORY_MIN_WORDS = 130;
const _STORY_CJK_G = /[\u3400-\u9fff\uf900-\ufaff]/g;
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
function storyCheck(passage, words, opt) {
  const partial = !!(opt && opt.partial);      // v445：只挖 5 格，其他目標字留在文章裡（Word Bank 的誘答）
  const terms = (words || []).map(w => String((w && w.term) || w || '').trim()).filter(Boolean);
  const blanks = storyBlanks(passage);
  const used = [], missing = [];
  // 括號外面直接出現目標字＝答案被洩漏
  const bare = String(passage || '').replace(/\[[^\]]*\](?:\([^)]*\))?/g, ' ');
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const inBare = (t) => new RegExp('\\b' + esc(t) + '\\w*\\b', 'i').test(bare);
  terms.forEach(t => {
    const hasBlank = blanks.some(b => _storySame(b.answer, t));
    ((hasBlank || (partial && inBare(t))) ? used : missing).push(t);   // partial：有出現在文章裡就算用到了
  });
  const extra = blanks.filter(b => !terms.some(t => _storySame(b.answer, t))).map(b => b.answer);
  // partial：沒挖的字本來就會出現在文章裡，只有「挖了又出現」才是洩漏
  const leaked = terms.filter(t => (!partial || blanks.some(b => _storySame(b.answer, t))) &&
    new RegExp('\\b' + esc(t) + '\\b', 'i').test(bare));
  // v443（Alan：「短文一定只能英文，我不要中文的」）——整篇出現中文就是不合格，不是小瑕疵
  const zh = (String(passage || '').match(_STORY_CJK_G) || []).join('');
  /* 🔴 v603（Alan：「單字重複出現，一個 word 只會用一次」）：同一個字在整篇出現超過一次
     （挖了兩格、或挖一格＋括號外還有一次）。Word Bank 裡那個字只有一個，兩格都要它就一定有一格填不了。
     ⚠ 用嚴格版（本尊或認得出來的變化形）數括號外的字，不然 trapeze 會被當成 trap。 */
  const bareTokens = bare.match(/[A-Za-z]+/g) || [];
  const dupes = terms.filter(t =>
    blanks.filter(b => _storySame(b.answer, t)).length + bareTokens.filter(tok => _storyIsForm(t, tok)).length > 1);
  /* 🔴 v604（Alan：「文章要長一點，至少之前的兩倍，這樣文章結構才完整」）：以前 70~140 字、4~8 句，
     現在要 150~260 字、9~14 句。這裡把「太短」也當成不合格（低於 130 字），下一輪指名重寫。 */
  const wordCount = (String(passage || '').replace(/\[([^\]]+)\](?:\([^)]*\))?/g, '$1').match(/[A-Za-z][A-Za-z'’-]*/g) || []).length;
  return { blanks: blanks.length, used, missing, extra, leaked, zh, dupes, wordCount, short: wordCount < STORY_MIN_WORDS };
}
/* 分數越低越好——多輪重生時用來挑「最不糟的那一篇」 */
function _storyScore(c) {
  // 中文權重最重：寧可拿一篇漏字的英文，也不要一篇中文的
  return (c.zh ? 99 : 0) + (c.missing.length * 3) + (c.leaked.length * 2) + c.extra.length + ((c.dupes || []).length * 3) + (c.short ? 2 : 0);
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

  /* ② 目標字出現在括號外面 → 就地挖成空格（順便把字尾提示補上）
     🔴 v603：**只在這個字還沒有任何一格時才挖，而且只挖一格**。
     以前最多挖三格（_STORY_MAX_BLANK）——AI 把 fluffy 寫了兩次，這裡就把第二次也挖成空格，
     Word Bank 裡 fluffy 只有一個 → 兩格要同一個字、一定有一格填不了（Alan 截圖）。
     已經有一格的字，括號外多出來的那幾次不再補挖——留給 storyCheck 標成「重複用到」，
     讓下一輪重寫，或由 storyDropDupes 把那個句子拿掉。 */
  const wrapped = [];
  terms.forEach(t => {
    if (storyBlanks(p).some(b => _storySame(b.answer, t))) return;
    const hit = _storyFindBare(p, t);
    if (!hit) return;
    const h = _storyHint(t, hit.form);
    p = p.slice(0, hit.i) + '[' + hit.form + ']' + (h ? '(' + h + ')' : '') + p.slice(hit.i + hit.form.length);
    wrapped.push(hit.form);
  });
  if (wrapped.length) notes.push(`補挖成空格：${wrapped.join('、')}`);

  /* ③ v443：字尾提示一律由程式重算。
     實測 AI 會自己發明詞性標記——[storm](n)、[check](v)、[quiet](adj)——
     小朋友看到的是作業紙上的 ______(ing) 那種「字尾」提示，標詞性只會讓他們更混亂。
     沒有變化形的字就不該有提示（[storm](s) 也是錯的，storm 本來就沒有加 s）。 */
  const badHints = [];
  p = p.replace(/\[([^\]]+)\](\(([^)]*)\))?/g, (m, a, _h, hv) => {
    const t = terms.find(x => _storySame(x, a) || _storyIsForm(x, a));
    const want = t ? _storyHint(t, a) : '';
    const now = String(hv == null ? '' : hv).trim();
    if (now === want) return m;
    if (now) badHints.push(now);
    return '[' + a + ']' + (want ? '(' + want + ')' : '');
  });
  if (badHints.length) notes.push(`拿掉不對的字尾提示：${badHints.join('、')}`);

  return { passage: p, check: storyCheck(p, terms), notes };
}

/* 🔴 v603 把「重複用到同一個字」的句子拿掉（程式修，不用再等 AI）。
   規則：每個字留**第一次**出現的那個句子；之後又出現的句子，如果拿掉它不會讓任何字「唯一的一次」消失，就拿掉。
   ⚠ 句子裡同時有別的字的唯一出現處 → 不能拿（拿了會少一個字），留給重生去解。
   ⚠ 拿完至少要剩 3 句（故事要有頭有尾）；而且拿完用 storyCheck 驗一次，沒有變好就原樣還給。 */
function storyDropDupes(passage, words) {
  const terms = (words || []).map(w => String((w && w.term) || w || '').trim()).filter(Boolean);
  const before = storyCheck(passage, terms);
  if (!(before.dupes || []).length) return { passage, removed: [] };
  const split = (t) => String(t || '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  let sents = split(passage);
  const removed = [];
  const countIn = (sent, t) => {
    const blanks = storyBlanks(sent).filter(b => _storySame(b.answer, t)).length;
    const bare = (String(sent).replace(/\[[^\]]*\](?:\([^)]*\))?/g, ' ').match(/[A-Za-z]+/g) || []).filter(tok => _storyIsForm(t, tok)).length;
    return blanks + bare;
  };
  for (let guard = 0; guard < 6; guard++) {
    const first = {};
    terms.forEach(t => { first[t] = sents.findIndex(x => countIn(x, t) > 0); });
    let dropAt = -1;
    for (let i = 0; i < sents.length && dropAt < 0; i++) {
      const hasLater = terms.some(t => countIn(sents[i], t) > 0 && first[t] < i);
      if (!hasLater) continue;
      const soleHere = terms.some(t => countIn(sents[i], t) > 0 && first[t] === i);
      if (!soleHere) dropAt = i;
    }
    if (dropAt < 0 || sents.length <= 3) break;
    removed.push(sents[dropAt]);
    sents = sents.filter((_, i) => i !== dropAt);
  }
  if (!removed.length) return { passage, removed: [] };
  const out = sents.join(' ');
  const after = storyCheck(out, terms);
  if (after.missing.length > before.missing.length || (after.dupes || []).length >= (before.dupes || []).length) return { passage, removed: [] };
  return { passage: out, removed };
}

/* 🔴 v603（Alan：「很多單字的填空不合理，要能夠根據前後文推斷出單字意思」）
   「驗算」：另一個模型（不是寫故事的那個）**只看填空的樣子**——每格變成 (1)_____、給 Word Bank——
   把每一格填回去。填得出原本的答案＝前後文夠清楚；填成別的字＝這一格有好幾個字都說得通（或根本推不出來）。
   ⚠ 程式只負責比對，哪一格不夠清楚、怎麼改，是下一輪的 prompt 指名道姓告訴寫的人。
   ⚠ 驗算本身壞掉（沒回、格式不對）時**不擋**——寧可放行，也不要因為驗算失敗讓整篇出不來。 */
function _storyBlankView(passage) {
  let n = 0;
  return String(passage || '').replace(/\[([^\]]+)\](?:\(([^)]*)\))?/g, (m, a, h) => { n++; return `(${n})_____` + (h ? `(${h})` : ''); });
}
/* 純函式：expected＝[答案…]（依空格順序）、picks＝模型回的 {"1":"word",…}。回傳答錯的那幾格。 */
function _storyJudge(expected, picks, terms) {
  const wrong = [];
  (expected || []).forEach((ans, i) => {
    const got = String((picks && (picks[String(i + 1)] != null ? picks[String(i + 1)] : picks[i + 1])) || '').trim();
    const t = (terms || []).find(x => _storySame(x, ans)) || ans;
    if (!got || got === '?' || !(_storySame(got, t) || _storySame(got, ans))) wrong.push({ n: i + 1, expected: t, got: got || '?' });
  });
  return wrong;
}
async function _storySolve(passage, list, bank) {
  try {
    const terms = (list || []).map(w => String((w && w.term) || w || '').trim()).filter(Boolean);
    const blanks = storyBlanks(passage);
    if (!blanks.length) return { checked: false, wrong: [] };
    const pool = Array.from(new Set(terms.concat((bank || []).map(x => String((x && x.term) || x || '').trim()).filter(Boolean)))).slice(0, 16);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    const picks = await _aiAsk({
      model: GN_READ_MODEL, max_tokens: 400,
      system: 'You are a careful 3rd-grade English student doing a fill-in-the-blank test. You see a story with numbered blanks and a Word Bank. ' +
        'For each blank choose the ONE word from the Word Bank that fits, using ONLY the words around the blank. Each Word Bank word can be used at most once. ' +
        'If a blank ending like (ing) or (ed) is shown, the word is changed that way — still answer with the Word Bank word. ' +
        'If you cannot tell which word fits, or two words fit equally well, answer "?" for that blank. ' +
        'Reply ONLY a JSON object like {"1":"word","2":"?"} — no other text.',
      messages: [{ role: 'user', content: 'Word Bank: ' + pool.join(', ') + '\n\nStory:\n' + _storyBlankView(passage) }],
    }, (data) => {
      const txt = data?.content?.[0]?.text || data?.text || '';
      const o = JSON.parse(_aiStripFence(txt));
      return (o && typeof o === 'object') ? o : null;
    }, 45000);
    return { checked: true, wrong: _storyJudge(blanks.map(b => b.answer), picks, terms) };
  } catch (e) { return { checked: false, wrong: [] }; }
}
/* 給下一輪 prompt 看的：那一格長什麼樣（把別的空格縮成 ___，這一格標成 <<blank>>） */
function _storyBlankSentence(passage, n) {
  let k = 0;
  const marked = String(passage || '').replace(/\[([^\]]+)\](?:\([^)]*\))?/g, (m) => { k++; return k === n ? '<<BLANK>>' : '___'; });
  const sents = marked.split(/(?<=[.!?])\s+/);
  const i = sents.findIndex(x => x.indexOf('<<BLANK>>') >= 0);
  return i < 0 ? '' : sents.slice(Math.max(0, i - 1), i + 2).join(' ').replace('<<BLANK>>', '_____');
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

const QS_MAX_Q = 10;                 // 一般練習：一個單元最多 10 題
const QS_SPLIT = {
  /* 有自己規矩的題型（Alan 指名的兩種） */
  story: { per: 6, bank: 10 },       // 一篇挖 6 格；Word Bank 給 10 個字（多的當誘答）
  sense: { per: 8 },                 // 字義選擇要讀短文，比較累，一次 8 題
};
/* 切成每份最多 per 個，而且**盡量平均**（Alan：「幫我平均分散」）。
   ⚠ 24 個、上限 10 → 要 8/8/8，不是 10/10/4。
     直接 slice 會留下一個很短的尾巴，看起來像出錯了。 */
function qsChunkEven(list, per) {
  const arr = Array.isArray(list) ? list.slice() : [];
  const cap = Math.max(1, +per || QS_MAX_Q);
  if (arr.length <= cap) return arr.length ? [arr] : [];
  const n = Math.ceil(arr.length / cap);
  const out = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    /* 剩下的平均分給還沒切的份數——餘數會被前面幾份各多吃一個，
       所以每一份最多只差 1 個。 */
    const take = Math.ceil((arr.length - at) / (n - i));
    out.push(arr.slice(at, at + take));
    at += take;
  }
  return out;
}
/* 一份 N 份的標題：只有一份時**完全不要加字尾**（不要動到原本就好好的流程）。
   ⚠⚠ 加字尾就要同時提供「把字尾拿掉」——站上有好幾個地方是**用標題比對**
     來認題型的（qsKindsInGroup 的 `/字義選擇$/` 就是），
     標題後面多了「（1/3）」它就認不出來了，而且**不會報錯**，
     只會讓「只補漏掉的題型」重複生一份字義選擇。 */
function qsPartTitle(title, i, total) {
  return total > 1 ? `${title}（${i + 1}/${total}）` : title;
}
function qsStripPart(title) {
  return String(title || '').replace(/\s*[（(]\s*\d+\s*\/\s*\d+\s*[)）]\s*$/, '').trim();
}
/* 短文填空的 Word Bank：答案全放，再從整池抽誘答補到 want 個，然後洗牌。
   ⚠ 不洗牌的話答案會整排排在前面＝直接送分。 */
function qsStoryBank(answers, allTerms, want) {
  const norm = (x) => String(x || '').trim();
  const ans = (answers || []).map(norm).filter(Boolean);
  const low = ans.map(x => x.toLowerCase());
  const rest = (allTerms || []).map(norm).filter(x => x && low.indexOf(x.toLowerCase()) < 0);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
  const bank = ans.concat(rest.slice(0, Math.max(0, (+want || QS_SPLIT.story.bank) - ans.length)));
  for (let i = bank.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = bank[i]; bank[i] = bank[j]; bank[j] = t; }
  return bank;
}

const _STORY_PICK = 5;
function storyPick(passage, n) {
  const p = String(passage || '');
  const re = /\[([^\]]+)\](\([^)]*\))?/g;
  const hits = [];
  let m;
  while ((m = re.exec(p))) hits.push({ i: m.index, len: m[0].length, word: m[1], key: _storyNorm(m[1]) });
  if (hits.length <= n || n < 1) return p;
  /* ⚠ 同一個字要嘛整組留、要嘛整組還原。
     實測踩過：AI 寫了兩次 lights、兩格都挖，只留一格之後另一格變回原文
     ＝答案就寫在文章裡（真 AI 第一次跑就中）。所以這裡以「字」為單位挑，不是以「格」。 */
  const keys = [];
  hits.forEach(h => { if (keys.indexOf(h.key) < 0) keys.push(h.key); });
  const size = (k) => hits.filter(h => h.key === k).length;
  const keep = new Set();
  let total = 0;
  const want = Math.min(keys.length, Math.max(1, n));
  for (let k = 0; k < want && total < n; k++) {
    const key = keys[want === 1 ? 0 : Math.round(k * (keys.length - 1) / (want - 1))];
    if (keep.has(key)) continue;
    keep.add(key); total += size(key);
  }
  let out = '', last = 0;
  hits.forEach(h => {
    if (keep.has(h.key)) return;
    out += p.slice(last, h.i) + h.word;
    last = h.i + h.len;
  });
  return out + p.slice(last);
}

async function aiMakeVocabStory(words, { hint = '', grade = 'g4', rescue = null, rounds = 3, blanks = _STORY_PICK, teacherNote = '', avoid = [], bank = [] } = {}) {
  const band = VOCAB_BANDS[vocabBandOf(grade)];   // v442：短文也跟著年級（低年級句子更短更白話）
  const list = (words || []).map(w => (typeof w === 'string' ? { term: w } : w)).filter(w => w && w.term);
  if (list.length < 2) throw new Error('至少要 2 個單字才生得出短文。');
  /* v445：交出去之前只留幾格——挖太多格，前後文就不夠孩子推答案了 */
  const finish = (b) => {
    const nb = Math.max(2, +blanks || _STORY_PICK);
    const before = storyBlanks(b.passage).length;
    let picked = storyPick(b.passage, nb);
    // 保險絲：挑完如果反而洩漏了答案（同一個字挖一格、另一格變回原文），就整篇照原樣全挖
    if (storyCheck(picked, list, { partial: true }).leaked.length > storyCheck(b.passage, list).leaked.length) picked = b.passage;
    const n = storyBlanks(picked).length;
    return { ...b, passage: picked, full: b.passage, partial: true,
             check: storyCheck(picked, list, { partial: true }),
             fixes: (b.fixes || []).concat(n < before ? ['只留 ' + n + ' 個空格（Word Bank 還是全部 ' + list.length + ' 個字，其他當誘答）'] : []) };
  };
  const head =
    `LEVEL: ${band.label}\n${band.note}\nEvery blank must still be findable from the words around it — that rule never changes.\n\n` +
    (hint ? `Story topic / lesson title: ${hint}\n` : '') +
    _aiTeacherNote(teacherNote) +
    _aiAvoidNote(avoid) +          // v466：複習時不可以寫出跟上次一樣的短文
    'Target words (use each exactly once):\n' +
    list.map(w => `- ${w.term}${w.zh ? `  (${w.zh})` : ''}`).join('\n');

  let best = null, lastErr = null, note = '';
  for (let round = 0; round < Math.max(1, rounds); round++) {
    let r = null;
    try {
      /* max_tokens：一篇 260 字的故事約 450 token，留四倍餘裕（v604：本來 140 字 ／ 900）。
         ⚠ 不要砍太低——被 max_tokens 截斷的話 JSON 會壞掉，整批重試反而更慢。 */
      r = await _aiAsk({
        model: 'claude-haiku-4-5', max_tokens: 1800,
        system: AI_STORY_SYS,
        messages: [{ role: 'user', content: head + note }],
      }, (data) => {
        const txt = data?.content?.[0]?.text || data?.text || '';
        const o = JSON.parse(_aiStripFence(txt));
        // v443：中文的短文直接不收（_aiAsk 會自己再問一次，比整輪重來快）
        const bad = !o || typeof o.passage !== 'string' || o.passage.indexOf('[') < 0 || _STORY_CJK_G.test(o.passage);
        _STORY_CJK_G.lastIndex = 0;
        return bad ? null : o;
      });
    } catch (e) { lastErr = e; continue; }

    const fixed = storyFix(r.passage, list);
    const cand = {
      title: String(r.title || '').trim(),
      passage: fixed.passage, check: fixed.check, fixes: fixed.notes, rounds: round + 1,
    };
    /* v603：同一個字用了兩次 → 先試著把「多出來的那一句」拿掉（程式修，不用重打 AI） */
    if ((cand.check.dupes || []).length) {
      const dd = storyDropDupes(cand.passage, list);
      if (dd.removed.length) {
        const re = storyFix(dd.passage, list);
        cand.passage = re.passage; cand.check = re.check;
        cand.fixes = (cand.fixes || []).concat(re.notes, ['有字用了兩次，拿掉了重複的句子：' + dd.removed.map(x => x.slice(0, 40) + '…').join('；')]);
      }
    }
    /* 🔴 v603 驗算：程式檢查都過了，再讓另一個模型「只看填空」把每一格填回去。
       填不回原本的字＝前後文推不出來（或好幾個字都說得通）→ 下一輪指名道姓重寫那幾格。 */
    cand.amb = [];
    if (!_storyScore(cand.check)) {
      const sv = await _storySolve(cand.passage, list, bank);
      cand.amb = sv.wrong || [];
      if (!cand.amb.length) return finish(cand);                      // 完全乾淨且推得出來，收工（最後只留 5 格）
    }
    const candScore = _storyScore(cand.check) + cand.amb.length * 2;
    if (!best || candScore < _storyScore(best.check) + (best.amb || []).length * 2) best = cand;

    /* 下一輪把「這次哪裡不合格」原原本本告訴它。
       泛泛地說「請再試一次」沒有用（v382 學到的），要指名道姓。 */
    const c = cand.check;
    note = '\n\nYour previous attempt was rejected. Fix exactly these problems:\n' +
      (c.missing.length ? `- These target words were never used: ${c.missing.join(', ')}\n` : '') +
      (c.leaked.length  ? `- These target words appear OUTSIDE their brackets, which gives the answer away: ${c.leaked.join(', ')}\n` : '') +
      (c.extra.length   ? `- You bracketed words that are not targets: ${c.extra.join(', ')}\n` : '') +
      (c.zh             ? `- You wrote Chinese characters (${c.zh.slice(0, 20)}). The story must be 100% English.\n` : '') +
      (c.short ? `- The story is too short (${c.wordCount} words). Write 180-260 words in 10-14 sentences, with a clear beginning, middle and end.\n` : '') +
      ((c.dupes || []).length ? `- These target words were used MORE THAN ONCE (each word must appear exactly once in the whole story): ${c.dupes.join(', ')}\n` : '') +
      (cand.amb.length ? '- A student who saw ONLY the sentences could NOT work out these blanks. Rewrite the sentence so that only the right word fits, by adding a clear clue to its meaning in the same sentence:\n' +
        cand.amb.map(a => `    · "${a.expected}" — the student answered "${a.got}". Sentence: ${_storyBlankSentence(cand.passage, a.n)}\n`).join('') : '') +
      'Write a NEW story that uses every target word exactly once (one blank per word), each one inside brackets, every blank with a clear clue.';
  }

  if (!best) throw lastErr || new Error('AI 這次沒有生出短文，請再試一次。');
  if (best.amb && best.amb.length) {
    best = { ...best, fixes: (best.fixes || []).concat([`⚠ 驗算：有 ${best.amb.length} 格可能前後文不夠明確（${best.amb.map(a => a.expected + '→被填成 ' + a.got).join('；')}），請看一下這幾格，不滿意可以按「換一篇」`]) };
  }

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
  return finish(best);
}

/* ══ v542 📄 短文填空出好幾篇 ═══════════════════════════════════════
   Alan（合併 24 個單字）：「短文填空幫我出共三篇，都幫我挖空 6 格，
   Word Bank 每一篇給隨機 10 個單字」。

   ⭐⭐ **幾篇、哪幾個字、挖幾格，全部由程式決定**，AI 只負責把一篇寫好。
     他已經試過在「特別要求」裡叫 AI 拆三篇——做不到。
     （v417／v488 同一類：程式自己會做的事叫模型做，它為了服從會謊報。）
   ⚠ 每一篇都要**不一樣**：前面寫過的整篇當 avoid 餵下去
     （v466 學到的——只說「要不一樣」沒有用）。
   ⚠ 一篇失敗不可以拖垮其他篇，但要回報出來（v473 的教訓：
     .catch(()=>null) 會讓老師只看到「少一篇」卻不知道為什麼）。 */
async function aiMakeVocabStories(words, opts = {}) {
  const list = (words || []).map(w => (typeof w === 'string' ? { term: w } : w)).filter(w => w && w.term);
  const per = Math.max(2, +opts.per || QS_SPLIT.story.per);
  /* 幾篇＝照「一篇挖幾格」去切。⚠ 一篇故事要寫得順，字太少寫不成，
     所以每一批至少 3 個字（跟 canDo.story 的門檻一樣）。 */
  const batches = qsChunkEven(list, Math.max(3, per));
  const out = [];
  const seen = (opts.avoid || []).slice();
  for (let i = 0; i < batches.length; i++) {
    try {
      const st = await aiMakeVocabStory(batches[i], {
        ...opts, avoid: seen,
        bank: list,                    // v603：驗算時 Word Bank 要跟學生看到的一樣（含別篇的字當誘答）
        /* 這一批有幾個字就挖幾格（最多 per 格）——
           批次本來就是照 per 切的，所以通常剛好 */
        blanks: Math.min(per, batches[i].length),
      });
      if (st && st.passage) {
        out.push({ ...st, words: batches[i] });
        seen.push(String(st.full || st.passage || '').replace(/[\[\]]/g, ''));
      }
    } catch (e) {
      out.push({ error: (e && e.message) || '這一篇沒出來', words: batches[i] });
    }
  }
  return out;
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

/* words: [{ term, zh }]（zh 只是給 AI 當語意提示，可省略）
   回傳 [{ word, def, sentence, answer, explain }]，順序與輸入相同。 */
/* v392: 改成「先切成一堆小請求，再一次平行送出去」。
   chunk 從 10 縮成 2：延遲幾乎全是吐字時間（≈ output_tokens / 176），
   所以每個請求要吐的字變少＝每個請求本身就變快；再加上全部同時跑，
   20 個單字實測從 20.8 秒降到 3 秒上下。
   ⚠ 對回輸入順序的方式完全沒變（part.forEach((w,k) => parsed[k]），
   校稿頁看到的欄位、順序、中文解說都跟以前一樣。 */
/* v466（Alan：「我想製作一個複習的方式，但題目我又要重新生成，
   如果不生成題目又一樣，小朋友會背答案」）：
   avoid ＝ 上一次出過的句子。不傳進去的話，同一批單字再出一次，
   模型很可能寫出幾乎一樣的句子（v461 的分一分就實測過這件事：
   只說「要不一樣」沒有用，要把「不可以用的」直接攤在它面前）。 */
async function aiMakeVocabExercises(words, { onProgress, chunk = 2, hint = '', grade = 'g4', teacherNote = '', avoid = [], _noRetry = false } = {}) {
  const band = VOCAB_BANDS[vocabBandOf(grade)];
  const list = (words || []).map(w => (typeof w === 'string' ? { term: w } : w)).filter(w => w && w.term);
  if (!list.length) return [];
  const size = Math.max(1, +chunk || 1);
  const parts = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));

  let doneWords = 0;
  let timedOut = false;
  const packs = await pMap(parts, async (part) => {
    const userMsg =
      `LEVEL: ${band.label}\n${band.note}\nThe blank's sentence must ALWAYS contain a clue that makes the answer findable — that rule never changes.\n\n` +
      (hint ? `Context / topic: ${hint}\n` : '') +
      _aiTeacherNote(teacherNote) +
      _aiAvoidNote(avoid) +
      'Target words:\n' +
      /* v461（Alan：「有時候老師會直接給相對應的 definition，就直接用就可以了，
         不需要 AI 生成；但如果沒有就還是需要」）：老師貼了定義就原封不動送進 prompt，
         要求 AI 原樣抄回來。這樣「配對、選擇題、解說」用到的定義全部是老師的那一句，
         不會出現「配對是老師的講法、選擇題是 AI 另一套講法」。
         ⚠ 不能因此就整個字不送給 AI——例句（填空／短文）還是要它出。 */
      part.map(w => `- ${w.term}${w.zh ? `  (Chinese meaning: ${w.zh})` : ''}`
        + (w.def ? `  [TEACHER'S DEFINITION: "${String(w.def).replace(/"/g, "'")}"]` : '')).join('\n');
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
  /* 🔴 v476（Alan：「為什麼我的配對連線有一個是中文？」）：
     AI 偶爾會漏掉某個字的 def（Alan 那次是 remains）。下游 qsBuildItems 的退路是
     「沒有英文定義就用中文」→ 八個英文定義裡夾一個「n. 遺骸；殘留物」。
     與其在下游補一個不一致的東西，不如**把漏掉的那幾個再問一次**（跟 v468 同一招）。 */
  const missing = _noRetry ? [] : out.filter(r => !r.def);
  if (missing.length && missing.length < out.length) {
    try {
      const again = await aiMakeVocabExercises(missing.map(r => ({ term: r.term, zh: r.zh })),
        { chunk: Math.max(1, +chunk || 1), hint, grade, teacherNote, avoid, _noRetry: true });
      again.forEach(r2 => {
        if (!r2 || !r2.def) return;
        const hit = out.find(r => r.term === r2.term && !r.def);
        if (hit) { hit.def = r2.def; if (!hit.sentence) hit.sentence = r2.sentence; }
      });
    } catch (e) { /* 再問一次也失敗就算了——下游還有退路，不該整份出題跟著失敗 */ }
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
// 看照片用 Sonnet：v428 用同一張作業實測，兩個都讀到 10/10 題、都約 8 秒，
// 但 Haiku 把「你的書包裡有任何書嗎」讀成「有什麼書」，還自己填上作業沒印的答案；Sonnet 逐字照抄。
const GN_READ_MODEL = 'claude-sonnet-5';

const GN_READ_SYS = `You read ONE part of a Taiwanese elementary-school English teacher's GRAMMAR homework
(a photo of one page, or one section of pasted text). It usually has teaching NOTES, then QUESTIONS.
Output ONLY JSON:
{"unit":"","topic":"short English name of the grammar point in THIS part","topicZh":"繁體中文名稱","notes":"",
 "questions":[{"kind":"mcq|fill|translate|rewrite|identify|other","q":"","options":[],"find":"","answer":""}],"caseMatters":false}
RULES
- unit: the name of the WHOLE unit if you can see it (e.g. "Nouns"), else "".
- notes: every rule, pattern-table row and example sentence from the NOTES part, as plain text,
  one idea per line (use \\n). Copy the teacher's own examples word for word. Never invent content.
  Worked examples ("Example: … Answer: …") belong in notes, NOT in questions.
- questions: every question you can read, in order.
  * "Circle the correct answer: There (is / are) a book." → kind "mcq", q "There ________ a book.",
    options ["is","are"].
  * A group of words where the student writes or circles the one that is a ___ (e.g. "fans, audience, viewers")
    → kind "mcq", q "Which one is a collective noun?", options = the words.
  * "Underline / circle the ___ in each sentence" → kind "identify", q = ONLY the sentence,
    find = what to look for (e.g. "noun", "non-count noun", "proper noun").
  * A sentence with a blank line to fill → kind "fill", q with the blank written as ________ .
    If the section title lists words to use (e.g. is / are / isn't), put them in options.
    If the student writes a changed form of a word given in parentheses, put ________ where that word goes
    and the word in parentheses at the end: "the (dog) barking ____" → "the ________ barking (dog)".
  * A Chinese sentence to translate into English → kind "translate", q = the Chinese sentence.
  * "Rewrite / correct each sentence" → kind "rewrite", q = ONLY the sentence to fix (leave out the directions).
  * A multiple-choice question whose choices are whole sentences (e.g. "Circle the correct sentence" with A-D)
    → kind "mcq", q "Choose the correct answer.", options = the sentences (without the A/B/C/D labels).
  * Anything else → kind "other".
  * answer: only if the answer is printed or already written in; otherwise "".
- caseMatters: true ONLY if the grammar point of THIS part is CAPITAL LETTERS (capitalization rules), else false.
- Keep notes short: rules and examples only, no directions. If a photo is unreadable, return empty fields.
${_AI_MINIFY}`;

// v430：AI 寫到 max_tokens 被切斷時，JSON 尾巴不完整——把已經寫完的題目救回來（notes 在前面，通常是完整的）
function _gnSalvageJson(txt) {
  const t = String(txt || '').trim();
  try { return JSON.parse(t); } catch (e) { /* 往下救 */ }
  const s = t.indexOf('{');
  if (s < 0) return null;
  let tries = 0;
  for (let i = t.lastIndexOf('}'); i > s && tries < 60; i = t.lastIndexOf('}', i - 1), tries++) {
    for (const tail of [']}', '}', ']', '']) {
      try { const o = JSON.parse(t.slice(s, i + 1) + tail); if (o && typeof o === 'object' && !Array.isArray(o)) return o; } catch (e) { /* 再往前一個 } */ }
    }
  }
  return null;
}

// 「題目裡混著 A. … B. … C. …」→ 拆成選項（老師作業常見；AI 偶爾整串抄進 q）
function _gnInlineOpts(q) {
  const m = String(q || '').match(/^(.*?)(?:^|\s)[(（]?A[)）.．]\s+(.+?)\s+[(（]?B[)）.．]\s+(.+?)(?:\s+[(（]?C[)）.．]\s+(.+?))?(?:\s+[(（]?D[)）.．]\s+(.+?))?\s*$/);
  return m ? { stem: m[1].trim(), options: [m[2], m[3], m[4], m[5]].filter(Boolean).map(x => x.trim()) } : null;
}

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

/* v430：把貼上的長文字依大標題切段——Alan 的 Nouns 五大類（5800 字）一次讀，AI 寫到上限被切斷＝「讀不到」。
   大標題＝「1. Collective Nouns」「Part B」「Lesson 2 …」這種短行：大寫開頭、不以句號結尾（題目會以 . ? 結尾）。 */
function gnSplitText(text, max = 2400) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const isHead = (l) => {
    const t = l.trim();
    return t.length >= 4 && t.length <= 80 && !/[.?!。？！_]\s*$/.test(t) &&
      /^(?:\d{1,2}[.)．、]\s*[A-Z]|(?:part|unit|lesson|section|chapter)\s+[\w]+|[一二三四五六七八九十]+、)/i.test(t);
  };
  const secs = [];
  lines.forEach(l => { if (isHead(l) || !secs.length) secs.push([l]); else secs[secs.length - 1].push(l); });
  // 太短的（標題前的「老師把 Nouns 分成五大類」）併到下一段
  for (let i = 0; i < secs.length - 1; i++) {
    if (secs[i].join('\n').trim().length < 200) { secs[i + 1] = secs[i].concat(secs[i + 1]); secs.splice(i, 1); i--; }
  }
  // 太長的一段 → 在行之間切開，後面那塊帶上段落標題
  const out = [];
  secs.forEach(sec => {
    const head = sec.find(l => l.trim()) || '';
    let cur = [];
    sec.forEach(l => {
      if (cur.length && (cur.join('\n') + '\n' + l).length > max) { out.push(cur.join('\n')); cur = [`(continued) ${head.trim()}`]; }
      cur.push(l);
    });
    if (cur.join('').trim()) out.push(cur.join('\n'));
  });
  // 段數太多就把相鄰的小段併起來（同時送出的請求不要超過 8 個）
  while (out.length > 8) {
    let k = 0, best = Infinity;
    for (let i = 0; i < out.length - 1; i++) { const n = out[i].length + out[i + 1].length; if (n < best) { best = n; k = i; } }
    out.splice(k, 2, out[k] + '\n' + out[k + 1]);
  }
  return out.map(s => s.trim()).filter(Boolean);
}

function _gnReadOne(content) {
  return _aiAsk(
    { model: GN_READ_MODEL, max_tokens: 4000, system: GN_READ_SYS, messages: [{ role: 'user', content }] },
    (data) => {
      const txt = (data?.content || []).filter(b => b && b.type === 'text').map(b => b.text).join('') || data?.content?.[0]?.text || '';
      const o = _gnSalvageJson(_aiStripFence(txt));
      if (!o || typeof o !== 'object') return null;
      const qs = (Array.isArray(o.questions) ? o.questions : []).map(q => ({
        kind: ['mcq', 'fill', 'translate', 'rewrite', 'identify'].indexOf(q && q.kind) >= 0 ? q.kind : 'other',
        q: String((q && q.q) || '').trim(),
        options: Array.isArray(q && q.options) ? q.options.map(x => String(x).trim().replace(_gnOptLabel, '').trim()).filter(Boolean) : [],
        find: String((q && q.find) || '').trim(),
        answer: String((q && q.answer) || '').trim(),
      })).filter(q => q.q).map(q => {
        // 「There (is / are) a book.」這種圈選題：括號變空格、括號裡的字變選項
        const m = q.q.match(/[(（]([^()（）]*[\/／][^()（）]*)[)）]/);
        if ((q.kind === 'mcq' || q.kind === 'other') && m) {
          const opts = m[1].split(/[\/／]/).map(x => x.trim()).filter(Boolean);
          if (opts.length >= 2) return { ...q, kind: 'mcq', q: q.q.replace(m[0], '________'), options: opts };
        }
        // 選項整串寫在題目裡（「Circle the correct one. A. … B. …」）→ 拆出來
        if ((q.kind === 'mcq' || q.kind === 'other') && !q.options.length) {
          const io = _gnInlineOpts(q.q);
          if (io && io.options.length >= 2) return { ...q, kind: 'mcq', q: io.stem, options: io.options };
        }
        // 「Rewrite with the correct capital letters: my cousin junie…」→ 改寫題（只留要改的句子）
        const rw = q.kind === 'other' && q.q.match(/^(?:rewrite|correct|fix)[^:：]*[:：]\s*(.+)$/i);
        if (rw) return { ...q, kind: 'rewrite', q: rw[1].trim() };
        return q;
      }).map(q => (q.kind === 'mcq' ? { ...q, q: gnCleanStem(q.q, q.options) } : q));
      const notes = String(o.notes || '').trim();
      return { unit: String(o.unit || '').trim(), topic: String(o.topic || '').trim(), topicZh: String(o.topicZh || '').trim(),
               notes, questions: qs, caseMatters: o.caseMatters === true || /capital letter|大寫/i.test(notes) };
    }, 60000);
}

// images: [{ media_type:'image/jpeg', data:'<base64>' }]
// v430：每張照片一個請求、文字依大標題切段，全部同時送出再合併——一份再長也不會被切斷；
//       某一段讀不到只少那一段（missed 告訴老師是哪一張），不再整份「讀不懂」。
async function aiReadGrammarSheet({ images = [], text = '', onProgress } = {}) {
  const raw = String(text || '').trim().slice(0, 20000);
  const imgs = (images || []).slice(0, 6);
  const chunks = raw ? gnSplitText(raw) : [];
  const head = raw ? raw.split('\n').find(l => l.trim()).trim().slice(0, 120) : '';
  const parts = imgs.map((im, i) => ({
    label: `第 ${i + 1} 張照片`,
    content: [{ type: 'image', source: { type: 'base64', media_type: im.media_type || 'image/jpeg', data: im.data } },
              { type: 'text', text: imgs.length > 1 ? `This is page ${i + 1} of ${imgs.length}. Read only this page.` : 'Read the worksheet.' }],
  })).concat(chunks.map((c, i) => ({
    label: chunks.length > 1 ? `文字第 ${i + 1} 段` : '貼上的文字',
    content: [{ type: 'text', text: (chunks.length > 1
      ? `The teacher pasted a long worksheet; this is section ${i + 1} of ${chunks.length}.${i > 0 && head ? ` (The worksheet begins with: "${head}")` : ''}\n`
      : 'The teacher pasted this text:\n') + c }],
  })));
  if (!parts.length) parts.push({ label: '作業', content: [{ type: 'text', text: 'Read the worksheet.' }] });
  let done = 0;
  if (onProgress) onProgress(0, parts.length);
  const got = await Promise.all(parts.map(p => _gnReadOne(p.content)
    .then(v => ({ v }), e => ({ e }))
    .finally(() => { done++; if (onProgress) onProgress(done, parts.length); })));
  const ok = got.map((g, i) => ({ ...g, label: parts[i].label })).filter(g => g.v && (g.v.notes || g.v.questions.length));
  if (!ok.length) {
    const to = got.some(g => g.e && g.e.timeout);
    throw new Error(to ? '讀作業太久沒有回應，請再試一次。' : '讀不懂這份作業，請換清楚一點的照片，或直接貼文字。');
  }
  const missed = got.map((g, i) => (g.v && (g.v.notes || g.v.questions.length) ? null : parts[i].label)).filter(Boolean);
  if (ok.length === 1) return { ...ok[0].v, questions: ok[0].v.questions.map(q => ({ ...q, sec: 0 })), sections: [ok[0].v.topic], missed };
  // 合併：同一個主題（跨兩頁的同一段）併在一起；notes 每段加上【主題】，出題和教學才知道要照顧到每一段
  const secs = [];
  ok.forEach(({ v }) => {
    const last = secs[secs.length - 1];
    const k = (v.topic || '').toLowerCase();
    if (last && k && last.key === k) { last.notes.push(v.notes); last.qs.push(...v.questions); last.cm.push(v.caseMatters); return; }
    secs.push({ key: k, topic: v.topic, topicZh: v.topicZh, notes: [v.notes], qs: v.questions.slice(), cm: [v.caseMatters] });
  });
  const mode = (arr) => { const c = {}; let best = ''; arr.filter(Boolean).forEach(x => { c[x] = (c[x] || 0) + 1; if (!best || c[x] > c[best]) best = x; }); return best; };
  const unit = mode(ok.map(g => g.v.unit));
  const topics = secs.map(s => s.topic).filter(Boolean);
  const notes = secs.map(s => { const n = s.notes.filter(Boolean).join('\n').trim(); return n ? (s.topic ? `【${s.topic}】\n${n}` : n) : ''; })
    .filter(Boolean).join('\n\n');
  // 大小寫：只有「大部分段落」都在教大寫才算——Nouns 五段只有一段講大寫，不能讓整份都變成大寫單元
  const cmSecs = secs.filter(s => s.cm.some(Boolean)).length;
  return {
    unit, topic: unit || (secs.length === 1 ? secs[0].topic : topics.slice(0, 3).join(' / ')),
    topicZh: (secs.length === 1 ? secs[0].topicZh : '') || '',
    notes, sections: topics, missed,
    questions: secs.reduce((a, s, i) => a.concat(s.qs.map(q => ({ ...q, sec: i }))), []),
    caseMatters: cmSecs * 2 > secs.length,
  };
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

/* ── ② 出題 ─────────────────────────────────────────────── */
const GN_GRADE = {
  g1: 'Grade 1 (age 7). Tiny sentences of 3-5 words.', g2: 'Grade 2 (age 8). Very short sentences.',
  g3: 'Grade 3 (age 9, CEFR A1).', g4: 'Grade 4 (age 10, CEFR A1-A2).',
  g5: 'Grade 5 (age 11, CEFR A2).', g6: 'Grade 6 (age 12, CEFR A2).',
};
// v430：notes 由好幾段合併（【Collective Nouns】【Possessive Nouns】…）→ 回傳段數，否則 0
const _gnMultiSec = (notes) => { const n = (String(notes || '').match(/^【[^】\n]+】/gm) || []).length; return n >= 2 ? n : 0; };
const _GN_BASE = (grade, topic, notes, caseMatters, teacherNote) => `${_aiTeacherNote(teacherNote)}Students: Taiwanese elementary school, ${GN_GRADE[grade] || GN_GRADE.g4}
Grammar point: ${topic}
The teacher's notes (stay inside them — do not teach anything the notes do not cover):
${String(notes || '').slice(0, 9000)}
Use everyday topics a child knows: school, family, pets, food, sports, toys, parks.
⚠ COMPARATIVES — get this right, a checker rejects the whole batch otherwise:
  -er/-est ONLY for 1-syllable words (big, sweet, tall) and 2-syllable words ending in
  -y / -er / -ow / -le (happy->happier, clever, narrow, simple).
  more/most for EVERYTHING ELSE, including every 3-syllable word
  (more delicious, more beautiful, more expensive, more careful, more famous).
  "more delicious" and "the most beautiful" are CORRECT English — never present them as mistakes.
  Irregular: good/better/best, bad/worse/worst, far/farther/farthest.${_gnMultiSec(notes) ? `
The notes have ${_gnMultiSec(notes)} sections (each starts with 【…】). Cover EVERY section, spread evenly — do not stay on the first one.` : ''}${caseMatters ? `
IMPORTANT: this lesson is about CAPITAL LETTERS. Every question and interaction must test capitalization,
and every answer must be written with exactly the right capital letters.` : ''}`;

const GN_LESSON_SYS = `You design a VERY SHORT, INTERACTIVE warm-up that comes before practice.
It is NOT the whole worksheet — 3 rounds, the most important ideas only, then the child practises.
Explanations in spoken Traditional Chinese that KEEPS THE ENGLISH WORDS IN ENGLISH, examples in English.
Write the way a teacher talks to a 9-year-old: 「Noun 就是名字，分成四種：person、animal、place、thing」
— never a wall of Chinese, never grammar jargon.
Output ONLY JSON:
{"lead":"","steps":[
 {"kind":"learn","say":"","imgHint":"","examples":[{"en":"","hl":[""],"zh":""}]},
 {"kind":"pick","q":"","options":["",""],"answer":0,"why":""},
 {"kind":"tap","q":"","sentence":"","answers":[""],"why":""},
 {"kind":"sort","q":"","groups":[{"label":"","items":[""]}],"why":""},
 {"kind":"order","zh":"","words":[""]},
 {"kind":"fix","sentence":"","wrong":"","right":"","why":""}
],"outro":""}
RULES
- lead: ONE Traditional Chinese sentence, ≤25 characters, what this grammar is for.
- steps: EXACTLY 3 rounds (4 only if the notes truly cover four different ideas — never more, even if the
  notes have ten sections; pick the ideas the child needs before practising and drop the rest).
  Each round = ONE "learn" step immediately followed by ONE interaction that practises exactly what that learn step just said.
- CHOOSING THE INTERACTION — pick the one that really tests the idea, and use at least two different kinds:
  · "tap"   → the idea is "find the X in a sentence" (find the nouns / the verb / the adjective / the capital letter).
  · "sort"  → the idea has 2-3 groups (person/place/thing, common/proper, countable/uncountable, a/an, is/are).
  · "pick"  → one blank or one short question with 2-4 choices. Always safe.
  · "order" → ONLY when the notes teach WORD ORDER or sentence building. If the notes are about recognising
            or classifying words, do NOT use "order" — rearranging a sentence teaches nothing about it.
  · "fix"   → ONLY when a word can be WRONG because of THIS rule (taipei→Taipei, cat→cats, go→goes, a→an).
            The wrong word must break the rule you just taught. NEVER swap a word just because another word
            would sound nicer (cat→dog is NOT a mistake) — a checker rejects that and the whole lesson fails.
- learn.say: ONE idea only, ≤30 characters, spoken Chinese with the English terms left in English
  (「Noun 分成四種：person、animal、place、thing」／「專有名詞 proper noun 開頭要大寫」).
  A child must understand it out loud. No grammar jargon, no full-Chinese translation of English terms.
- ⚠ NEVER teach an instruction that only works on paper — colouring words, underlining, drawing lines,
  "places are blue, things are yellow". On a screen that means nothing. Teach the language point itself.
- learn.imgHint: 2-4 English words naming a PHOTO of WHAT THE FIRST EXAMPLE SENTENCE IS ABOUT.
  If the example is "The park is big." the hint is "big city park"; if it is "I have a pencil." the hint is "pencil on desk".
  The site fetches that photo automatically, so name a scene a stock photo would really show, and always reuse the
  main word from your own example — a photo that does not match the sentence confuses the child.
- learn.examples: 1-2 short English sentences (≤8 words). hl = the exact words in "en" to highlight
  (the grammar part). zh = the Chinese meaning.
- pick.q: EITHER one sentence with ________ for the missing part, OR a short question
  (e.g. "Which one is a proper noun?"). options: 2-4 short choices. answer: 0-based index.
  why: Traditional Chinese ≤30 characters.
- tap.q: a Traditional Chinese instruction, ≤20 characters (e.g. 「點出句子裡的名詞」).
  tap.sentence: ONE English sentence, 4-10 words. tap.answers: 1-3 words copied EXACTLY from that sentence
  (each word may appear only once in the sentence). Every other word in the sentence must clearly NOT be an answer.
  why: Traditional Chinese ≤30 characters.
- sort.q: a Traditional Chinese instruction, ≤20 characters (e.g. 「這些字是人、地方還是東西？」).
  sort.groups: 2 or 3 groups. label = Traditional Chinese, ≤6 characters. items = 2-3 SHORT English words each,
  6 items in total at most. why: Traditional Chinese ≤30 characters.
  ⚠⚠ Every item must fit ONE group only. Never use a word that belongs to two groups — the sense verbs
  (smell, taste, feel, look, sound) are BOTH linking and action verbs, so they can never be sorted;
  the same goes for any word your own lesson just called "both". A checker deletes such items.
- order.zh: a Chinese sentence. order.words: the English translation split into 3-8 word tiles IN THE CORRECT ORDER
  (keep the final punctuation on the last word).
- fix.sentence: an English sentence with exactly ONE wrong word. wrong: that word exactly as written. right: the correct word.
  A capital-letter mistake counts (wrong "taipei", right "Taipei"). why: Traditional Chinese ≤30 characters.
- Practise ONLY what the notes teach. If the notes are about capital letters, EVERY interaction must be about capital letters
  (never switch to a different grammar point such as articles or plurals).
- outro: ONE encouraging Traditional Chinese sentence, ≤25 characters, telling them the practice comes next.
- Every English sentence must be 100% grammatically correct. Use only simple COUNTABLE nouns (book, cat, apple, toy, pencil…);
  avoid uncountable nouns (water, milk, equipment, furniture, homework…) unless the notes are about them.
${_AI_MINIFY}`;

/* v444（Alan：「這邊沒有找出來和分一分的題目，也幫我加上去」）
   互動教學裡的 tap／sort 現在也能各自出成一個練習單元：
   · 找出來 → 沿用現成的「圈選題」(circle-answer)：一句話圈一個字，已經有計分、星星、只重做錯的
   · 分一分 → 沿用現成的「單字分類」(word-sort)：把字拖進 2-4 個籃子
   ⚠ 不新增題型，因為 v414 的教訓：新題型要補 AUTO_STAR_KIND、QM_TYPE_WORDS… 漏一個就整個單元沒星星。 */

/* 🔴 v461（Alan：「一鍵生成文法出來的題目都要是英文版本，只有先學學看維持原本的中英混合」）：
   練習題（選擇／填空／改寫／找出來／分一分）學生看得到的字一律英文——題幹、選項、
   指示語、分類籃子的標籤、答錯後的解說，全部。
   ⚠ 兩個例外，而且是題型本質，不能動：
     ① 🔤 中翻英：題目本來就是中文句子，要他翻成英文。
     ② 📘 先學一下（lesson）：Alan 要的就是「中英夾雜的口語講解」，維持原樣。 */
const GN_EN_ONLY = `LANGUAGE: every word the student sees must be ENGLISH — the question, the options,
the instruction, the basket labels and the explanation. No Chinese characters anywhere in your output.
Write the explanation in very simple English an 8-year-old reads (≤14 words).`;

const GN_SORT_SYS = `You design ONE sorting exercise for Taiwanese elementary-school students.
The child drags English words into 2-4 labelled baskets.
Output ONLY JSON: {"instruction":"","categories":["",""],"words":[{"word":"","category":""}]}
RULES
- categories: 2-4 baskets, ENGLISH labels, ≤3 words each, taken straight from the notes
  (e.g. Person / Place / Thing, Common Noun / Proper Noun, Countable / Uncountable, Singular / Plural).
- words: short English words (1-2 words each). "category" must be EXACTLY one of the labels you listed.
- ⚠⚠ EVERY word must belong to exactly ONE basket, with NO exceptions a teacher could argue about.
  English is full of words that sit in two baskets at once — the sense verbs (smell, taste, feel, look, sound)
  are BOTH linking verbs AND action verbs; "orange" is a colour AND a fruit; "play" is a verb AND a noun.
  Those words are unusable here, no matter how well they fit the lesson. Pick a word that can only go in one basket.
  A second checker re-reads every word and throws away the whole question if even one word fits two baskets.
- At least 2 words per basket, spread evenly, and never repeat a word.
- instruction: ONE short ENGLISH sentence, ≤12 words, telling the child what to do
  (e.g. "Put each word in the right basket.").
${GN_EN_ONLY}
${_AI_MINIFY}`;

const GN_Q_SYS = {
  mcq: `You write multiple-choice grammar questions.
Output ONLY a JSON array: [{"q":"","options":["","",""],"answer":0,"explain":""}]
RULES
- q: one English sentence with ________ for the missing part, OR a short question such as
  Which word is a noun? "Luna is a smart cat."  (options = 3 words from that sentence, exactly ONE is correct).
  If the options are whole sentences, q is just "Choose the correct answer."
- options: 3 short choices (sometimes 2 if the notes only have two forms, e.g. is/are). EXACTLY ONE may be correct:
  check every other option yourself and make sure a teacher would mark it wrong. If a sentence contains two words
  that both fit (e.g. "Rex, lie down and relax." has TWO intransitive verbs), pick a different sentence or different
  options — never let two options be acceptable.
- answer: 0-based index of the correct option. Put the correct option in a DIFFERENT position each time.
- explain: very simple ENGLISH, ≤14 words, why that answer.
${GN_EN_ONLY}
${_AI_MINIFY}`,
  fill: `You write fill-in-the-blank grammar questions (the student TYPES the answer).
Output ONLY a JSON array: [{"prompt":"","answer":"","accept":[],"explain":""}]
RULES
- prompt: one English sentence with exactly one ________ . If the student needs a hint (e.g. the base verb), put it
  in parentheses at the end: "She ________ to school every day. (walk)".
- answer: 1-3 words that go in the blank. accept: other forms that are ALSO correct (e.g. "is not" for "isn't"), or [].
- If one of the teacher's questions has TWO blanks, split it into two questions: each keeps one blank and has the other one filled in.
- If CAPITAL LETTERS are the grammar point: give the word(s) in lowercase in parentheses at the end, and the answer is the same
  word(s) with the correct capital letters. e.g. prompt "We live in ________. (taipei)", answer "Taipei". Only ONE correct answer.
- explain: very simple ENGLISH, ≤14 words.
${GN_EN_ONLY}
${_AI_MINIFY}`,
  circle: `You write "find the words" questions: the student reads a sentence and taps EVERY word of one kind,
exactly like the worksheet task "Read each sentence. Then underline the nouns."
Output ONLY a JSON array: [{"sentence":"","answers":[""],"find":"","findZh":"","explain":""}]
RULES
- EVERY question in your answer must ask for the SAME kind of word (all nouns, or all verbs, or all proper nouns…),
  because the children see one instruction above the whole exercise.
- find: that kind of word in English, 1-3 words ("noun", "proper noun", "action verb").
  findZh: v461 — this used to be Chinese; now write the SAME English words as "find".
  The children see it in the instruction above the exercise, and that instruction is English now.
- sentence: ONE English sentence, 4-12 words, everyday life, 100% correct English.
- answers: EVERY word in that sentence that qualifies — 1 to 4 of them, copied EXACTLY as written
  (same spelling, same capital letters), in the order they appear. A checker re-reads your sentence and
  throws the question away if you missed one, so count carefully: in "My sister goes to school every morning."
  the nouns are sister, school AND morning.
- Each answer word must be ONE word that appears only once in the sentence. If a target is two words
  (New York), choose a different sentence.
- explain: very simple ENGLISH, ≤14 words, why those words.
${GN_EN_ONLY}
${_AI_MINIFY}`,
  rewrite: `You write "correct the sentence" questions: the student rewrites a sentence that has mistakes.
Output ONLY a JSON array: [{"wrong":"","answer":"","explain":""}]
RULES
- wrong: one short English sentence (≤12 words) with 1-3 mistakes of EXACTLY the kind the notes teach
  (e.g. missing capital letters). Nothing else in the sentence may be wrong.
- answer: the same sentence, fully corrected. Change ONLY the mistakes.
⚠⚠ THE MISTAKE MUST BE FIXABLE FROM THE SENTENCE ITSELF. A checker rejects anything else.
  The corrected sentence must keep EXACTLY the same content words in the SAME order — only the
  grammar machinery may change (word endings, than/the/is, more/most, capital letters).
  You may NOT make the child invent information, and you may NOT ask about facts of the world.
  BAD: "My fish is more beautiful." -> "My fish is more beautiful than yours."
       (nothing in the sentence says what it is compared to — the child cannot know)
  BAD: "The cake is sweeter than the candy." -> "The candy is sweeter than the cake."
       (that is an opinion about food, not a grammar mistake)
  GOOD: "My dog is more big than your dog." -> "My dog is bigger than your dog."
  GOOD: "She is the happier student in class." -> "She is the happiest student in class."
  GOOD: "My bag is bigger yours." -> "My bag is bigger than yours."   (only "than" is added)
- explain: very simple ENGLISH, ≤14 words, what was fixed.
${GN_EN_ONLY}
${_AI_MINIFY}`,
  /* v462 ③（Alan 挑的第一個）：造句。
     前面六種題型都在問「選哪個／填哪個／改哪裡」——會選不等於會用。
     這一種給情境，要學生自己寫一句話，而且那句話一定要用到這個文法點，由 AI 批改。
     沿用現成的 writing-practice 單元（AI 造句批改、五星評分、星星規則都現成）。 */
  write: `You write "make a sentence" tasks that force the student to USE one grammar point.
Output ONLY a JSON array: [{"prompt":"","must":"","hint":"","explain":""}]
RULES
- prompt: ONE short English instruction telling the child what to write about, ≤16 words, from a child's
  own world (family, school, food, pets, weekend, festivals). It must be impossible to answer well
  WITHOUT using the grammar point. Each prompt must be about a DIFFERENT situation.
  GOOD (proper nouns): "Write one sentence about where you went last weekend. Name the real place."
  GOOD (simple past): "Write one sentence about something you ate yesterday."
  BAD: "Write a sentence using a proper noun." (that is the rule, not a situation — boring and vague)
- must: the grammar feature the sentence MUST contain, in English, ≤6 words ("a proper noun with a capital letter").
- hint: ONE short English pattern or example opening, ≤10 words ("Last Sunday I went to ___.").
- explain: very simple ENGLISH, ≤14 words, what a good answer shows.
${GN_EN_ONLY}
${_AI_MINIFY}`,

  /* v462 ②（Alan 挑的第二個）：句型轉換。
     「改寫句子」只能把錯的改對；轉換是「這句對，但換一個說法」——
     主動↔被動、直述↔疑問／否定、單數↔複數、兩句用 and/but/because 合成一句。
     康橋考卷最常出這一種，而且一個文法點可以出一整頁。
     沿用 type-answer（打字作答）＝寬鬆比對＋AI 判斷＋星星全部現成。 */
  transform: `You write "change the sentence" questions: the student rewrites a CORRECT sentence a different way.
Output ONLY a JSON array: [{"prompt":"","task":"","answer":"","accept":[],"explain":""}]
RULES
- prompt: ONE correct, natural English sentence, 4-12 words, everyday life. It must already be 100% correct
  — this is NOT a find-the-mistake question.
- task: what to change it into, in English, ≤8 words. Use ONLY changes the notes actually teach, e.g.
  "Make it a question." / "Make it negative." / "Make it plural." / "Join them with because."
- answer: the ONE sentence that results. It must be the only natural answer a teacher would accept.
  If two different sentences would both be right, pick a different prompt.
- accept: usually []. Only add a variant with EXACTLY the same meaning (e.g. the contraction "isn't" for "is not").
- The change must be the grammar point itself — do not just swap a word for a synonym.
- explain: very simple ENGLISH, ≤14 words, what changed and why.
${GN_EN_ONLY}
${_AI_MINIFY}`,

  /* ══ v467：康橋的三種招牌題型（2026-10-06 Alan 給了 G3/G4 真實考卷）══
     拆解見 memory/kangchiao-exam-format.md。這三種是他的考卷一直在考、而網站以前做不出來的。

     ① editpara ＝「整段改錯，而且明講錯幾個」
        兩份考卷出現三次：最高級 blog post、Run-on 段落（There are five mistakes）、
        大小寫段落（Find the 5 capitalization errors）。
        ⚠ 跟現有的「改寫句子」不一樣——那是單句，這是**一整段**，而且學生事先知道有幾個錯。 */
  editpara: `You write ONE "edit the paragraph" exercise, exactly like a Kang Chiao formative assessment:
the child reads a short paragraph that contains a stated number of mistakes, finds them, and writes the corrections.
Output ONLY JSON: {"title":"","paragraph":"","errors":[{"wrong":"","right":"","why":""}]}
RULES
- paragraph: 4-7 short sentences, ONE connected story a 9-year-old would enjoy
  (a school trip, a pet, a weekend, a festival). 45-90 words. Give it a short "title".
- EVERY mistake must be the grammar point being taught — nothing else in the paragraph may be wrong.
  Spelling, punctuation and other grammar must be perfect, or the child cannot tell which N are the mistakes.
- errors: list EVERY mistake you planted, in paragraph order. Aim for about the number asked for —
  getting the exact count is less important than every listed item being a REAL mistake.
- Each "wrong" is 1 to 3 words, copied EXACTLY as it appears in the paragraph
  (a superlative mistake is often two words: "most tallest", "most good").
- ⚠⚠ That exact wording must appear in the paragraph EXACTLY ONCE, and each of its words must appear
  only once in ITS OWN sentence — the child crosses the words out, so a repeat makes the question unanswerable.
  If something would repeat, rewrite that sentence with different words.
- "right" is the corrected wording. It must be DIFFERENT from "wrong".
- Every error must be a REAL mistake. Never list something that is already correct.
- why: very simple ENGLISH, ≤12 words, explaining the fix. Never write notes to yourself in this field.
${GN_EN_ONLY}
${_AI_MINIFY}`,

  /* ② diagnose ＝「先判斷錯在哪一類，再改正」（康橋 G3 的 Subjects and Predicates 那一題）
        圈 (Missing Subject / Missing Predicate) → 再把句子改完整。兩段式。 */
  diagnose: `You write "what is wrong with this sentence?" questions, exactly like a Kang Chiao
formative assessment: the child first picks WHAT KIND of mistake it is, then rewrites the sentence correctly.
Output ONLY JSON: [{"broken":"","kinds":["",""],"answer":0,"fixed":"","why":""}]
RULES
- broken: ONE sentence that is wrong in exactly ONE way, 4-12 words, everyday child topics.
- kinds: 2 or 3 short ENGLISH labels for the possible problems, ≤3 words each
  (e.g. "Missing Subject" / "Missing Predicate", or "Run-on" / "Fragment").
  Use the labels the notes actually teach. Exactly ONE is right; the others must be real,
  plausible labels for this lesson — never a silly option.
- answer: 0-based index of the correct label. Vary which position is correct.
- fixed: the corrected sentence. It must still be about the same thing, and must fix ONLY that problem.
- why: very simple ENGLISH, ≤12 words.
${GN_EN_ONLY}
${_AI_MINIFY}`,

  /* v462 ①（Alan 挑的第四個）：排順序。
     語序類文法（疑問句、形容詞順序、there is/are、副詞位置）用選擇題練不到。
     ⚠ 出題時最怪的失敗是「打散之後其實有兩種排法都對」
       （"I often play basketball." vs "Often I play basketball."）——明講不可以。 */
  order: `You write "put the words in order" questions: the child sees the words of ONE sentence
shuffled as tiles and taps them into the right order.
Output ONLY a JSON array: [{"words":[""],"hint":"","explain":""}]
RULES
- words: the sentence split into tiles, IN THE CORRECT ORDER, 4-10 tiles.
  Each tile is one word, except that punctuation stays attached to its word ("basketball." , "you?").
  Keep the capital letter on the first word only — that is one of the clues the child uses.
- ⚠⚠ There must be EXACTLY ONE order that a teacher would accept. English often allows two
  ("I often play basketball." and "Often I play basketball." are both fine) — those sentences are
  unusable here. Avoid movable adverbs (often, usually, sometimes, yesterday, today) unless the
  notes are specifically about where they go, and avoid sentences where a phrase could move.
- Use the grammar point in every sentence, and everyday child topics.
- hint: ONE short ENGLISH clue, ≤8 words, about the pattern ("Questions start with Do or Does."). May be "".
- explain: very simple ENGLISH, ≤14 words, why that order.
${GN_EN_ONLY}
${_AI_MINIFY}`,

  translate: `You write Chinese-to-English translation questions that practise the grammar point.
Output ONLY a JSON array: [{"zh":"","answer":"","accept":[],"hint":"","explain":""}]
RULES
- zh: a natural Traditional Chinese sentence a child would say.
- answer: the best English translation, 4-10 words, ending with . or ? . It MUST use the grammar point.
- accept: usually []. Only add a variant if it has EXACTLY the same meaning AND still uses the grammar point
  (e.g. the contraction "There's" for "There is"). Never add a sentence that avoids the grammar point
  ("I have a dog" does NOT practise "There is"). The system already has an AI checker for other wordings.
- Every English sentence must be 100% grammatically correct; avoid uncountable nouns unless the notes are about them.
- hint: the grammar pattern to use, e.g. "There are + 複數名詞". Short.
- explain: Traditional Chinese, ≤30 characters.
${_AI_MINIFY}`,
};

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
function gnValidLesson(o) {
  const steps = (o && Array.isArray(o.steps) ? o.steps : []).map(gnValidStep).filter(Boolean);
  const learn = steps.filter(s => s.kind === 'learn').length;
  const act = steps.length - learn;
  if (learn < 2 || act < 2) return null;
  return { lead: _zhTW((o && o.lead) || '').trim(), steps, outro: _zhTW((o && o.outro) || '').trim() };
}
// 「A. My family visited…」「(B) …」→ 拿掉標號（老師作業的選項常常帶著）
const _gnOptLabel = /^\s*(?:[(（]?[A-Da-d][)）.．、:]|[○◯●]\s*[A-Da-d][.．)）]?)\s+/;
function gnValidMcq(x) {
  const opts = (Array.isArray(x && x.options) ? x.options : []).map(o => String(o).trim().replace(_gnOptLabel, '').trim()).filter(Boolean);
  let a = x && x.answer;
  if (typeof a === 'string') {
    const t = a.trim().replace(_gnOptLabel, '').trim();
    a = opts.indexOf(t);                                                  // 先比完全一樣（大小寫單元靠這個）
    if (a < 0 && /^[A-Da-d]$/.test(t)) a = 'abcd'.indexOf(t.toLowerCase()); // 答案寫成「B」
    if (a < 0) a = opts.findIndex(o => o.toLowerCase() === t.toLowerCase());
  }
  const q = gnCleanStem(_gnBlank(x && x.q), opts);
  // v429：「taipei zoo」和「Taipei Zoo」是兩個不同的選項——大寫單元的選擇題就是在考這個。
  //       以前比對時轉小寫，Alan 作業 Part B 的選項全被當成重複，整題丟掉。
  const uniq = new Set(opts).size === opts.length;
  // v430：「Which word is a noun? "Luna is a smart cat."」→ 選項一定要是引號裡那句話的字（實測出現過句子裡沒有的 woman、
  //       還有「park(common), Elm Street(proper)」這種組合選項）
  const qt = q.match(/^Which\s+(?:word|one|words)\b[^"“]*["“]([^"”]+)["”]/i);
  const fromSent = !qt || opts.every(o => o.split(/\s+/).length <= 3 && !/[()（）,]/.test(o) &&
    new RegExp('(^|[^A-Za-z])' + o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)', 'i').test(qt[1]));
  return q && opts.length >= 2 && opts.length <= 4 && uniq && fromSent && Number.isInteger(a) && a >= 0 && a < opts.length
    ? { q, options: opts, answer: a, explain: String((x && x.explain) || '').trim() } : null;
}
/* v444 找出來：句子＋一個要圈的字。答案一定要在句子裡只出現一次（不然圈哪個都算） */
function gnValidCircle(x) {
  const sentence = String((x && x.sentence) || '').trim();
  const raw = (Array.isArray(x && x.answers) ? x.answers : [x && x.answer]).map(a => _GN_TOK(String(a || ''))).filter(Boolean);
  const find = String((x && x.find) || '').trim().slice(0, 30);
  const findZh = _zhTW((x && x.findZh) || '').trim().slice(0, 8);
  const toks = sentence.split(/\s+/).map(_GN_TOK).filter(Boolean);
  const lower = raw.map(a => a.toLowerCase());
  const uniq = new Set(lower).size === lower.length;
  // 每個答案都要是句子裡「只出現一次」的完整單字，不然點哪一個都對／都不對
  const once = raw.length >= 1 && raw.length <= 4 && uniq &&
    raw.every(a => toks.filter(t => t.toLowerCase() === a.toLowerCase()).length === 1);
  // 照句子的順序排（學生端會照順序亮起來，看起來才不會亂）
  const answers = raw.slice().sort((a, b) => toks.findIndex(t => t.toLowerCase() === a.toLowerCase()) - toks.findIndex(t => t.toLowerCase() === b.toLowerCase()));
  return sentence && find && findZh && once && toks.length >= 3 && toks.length <= 16
    ? { sentence, answers, answer: answers[0], find, findZh, explain: _zhTW((x && x.explain) || '').trim() } : null;
}
/* v444 分一分：2-4 個籃子，每個字只能屬於一個籃子、每籃至少兩個字 */
function gnValidSortSet(o, n) {
  const cats = (Array.isArray(o && o.categories) ? o.categories : [])
    .map(c => _zhTW(c).trim().slice(0, 8)).filter(Boolean);
  const uniqCats = [...new Set(cats)];
  if (uniqCats.length !== cats.length || cats.length < 2 || cats.length > 4) return null;
  const seen = new Set(), words = [];
  (Array.isArray(o && o.words) ? o.words : []).forEach(w => {
    const word = String((w && w.word) || '').trim().slice(0, 24);
    const cat = _zhTW((w && w.category) || '').trim().slice(0, 8);
    const k = word.toLowerCase();
    if (!word || cats.indexOf(cat) < 0 || seen.has(k)) return;
    seen.add(k); words.push({ word, category: cat });
  });
  /* v452：要砍到 n 個字的時候「每一籃輪流拿」，不要直接切前面幾個——
     直接 slice 會把最後一籃整個切光，整組就因為「有一籃不到兩個字」被判不合格。 */
  const cap = Math.max(4, n || 8);
  const byCat = {};
  words.forEach(w => { (byCat[w.category] = byCat[w.category] || []).push(w); });
  const kept = [];
  for (let r = 0; kept.length < cap; r++) {
    let added = false;
    for (const c of cats) {
      const arr = byCat[c] || [];
      if (arr[r] && kept.length < cap) { kept.push(arr[r]); added = true; }
    }
    if (!added) break;
  }
  // 每一籃至少兩個字，而且每一籃都要有人（不然畫面上會出現空欄）
  const per = cats.map(c => kept.filter(w => w.category === c).length);
  if (kept.length < 4 || per.some(k => k < 2)) return null;
  return { instruction: _zhTW((o && o.instruction) || '').trim().slice(0, 30) || '把這些字分到正確的籃子裡', categories: cats, words: kept };
}
function gnValidFill(x) {
  const answer = String((x && x.answer) || '').trim();
  // 括號提示如果就是答案本身（「Is there ____ cat? (a)」答案 a）→ 等於送分，拿掉提示
  let prompt = _gnBlank(x && (x.prompt || x.q));
  const hint = prompt.match(/\s*[(（]([^()（）]+)[)）]\s*$/);
  // （只拿掉「完全一樣」的；大寫單元的「(taipei) → Taipei」提示是小寫、答案是大寫，那是題目本身，要留著）
  if (hint && answer && hint[1].trim() === answer) prompt = prompt.slice(0, hint.index).trim();
  const blanks = (prompt.match(/________/g) || []).length;
  return blanks === 1 && answer && answer.split(/\s+/).length <= 4
    ? { prompt, answer, accept: (Array.isArray(x.accept) ? x.accept : []).map(a => String(a).trim()).filter(Boolean).slice(0, 4),
        explain: String(x.explain || '').trim() } : null;
}
function gnValidRewrite(x) {
  const wrong = String((x && (x.wrong || x.q || x.prompt)) || '').trim();
  const answer = String((x && x.answer) || '').trim();
  const nw = wrong.split(/\s+/).length, na = answer.split(/\s+/).length;
  if (!(wrong && answer && wrong !== answer && !_gnCJK.test(wrong + answer) && nw <= 18 && Math.abs(nw - na) <= 2)) return null;
  /* 🔴 v480（Alan 截到兩題都無解）：錯的地方一定要**從句子本身就改得回來**。
     「My fish is more beautiful.」→「…than yours.」：句子裡沒說跟誰比，學生不可能知道。
     「The cake is sweeter than the candy.」→「The candy is sweeter than the cake.」：
       那是在比哪個比較甜，是常識題不是文法題。 */
  if (!_gnFixableFromSentence(wrong, answer)) return null;
  if (!_gnCmpClaimOk(wrong, answer)) return null;          // v479：比較級的方向也要對
  return { wrong, answer, explain: String(x.explain || '').trim() };
}
/* v462 ③：造句。沒有標準答案（AI 批改），所以能驗的就是「題目本身像不像一題」：
   要有情境、要講清楚必須用到什麼、而且不可以出現中文（v461 的規則）。 */
function gnValidWrite(x) {
  const prompt = String((x && (x.prompt || x.q)) || '').trim();
  const must = String((x && x.must) || '').trim();
  const n = prompt.split(/\s+/).length;
  if (!prompt || _gnCJK.test(prompt + must)) return null;
  if (n < 4 || n > 22) return null;                       // 太短＝沒有情境；太長＝小朋友讀不完
  if (!must) return null;                                 // 沒寫「一定要用到什麼」就沒辦法批改
  return { prompt, must, hint: String((x && x.hint) || '').trim().slice(0, 60),
           explain: String((x && x.explain) || '').trim() };
}

/* v462 ②：句型轉換。原句一定要跟答案不一樣，而且長度不能差太多
   （差太多通常是模型自己寫了一句不相干的）。 */
/* v467 ①：整段改錯。這一種最容易出的兩個問題，都要程式擋：
     ① 錯字在段落裡出現不只一次 → 學生點了也不知道算不算到
     ② 錯的數量跟題目說的不一樣 → 題目寫「有 5 個錯」卻只有 4 個，學生會一直找
   ⚠ 回傳的是「一整包」不是一題一題，所以不走 _gnMakeKind。 */
/* ══ 🔴 v479：比較級／最高級的「真的錯了嗎」把關 ═══════════════════════════
   Alan 2026-10-07 截到一題：句子是 "That pizza is more delicious than this pizza."
   ——這句**完全正確**，AI 卻說它錯，理由還寫「Delicious is short, so add -er, not more.」
   delicious 是三音節，本來就該用 more。這種錯不能允許：它教的是錯的文法。

   模型對「短形容詞加 -er、長形容詞用 more」這條規則不可靠，所以程式自己判一次。
   規則（小學課本的版本）：
     · 一音節 → -er（big, sweet, tall）
     · 兩音節且字尾 y / er / ow / le → -er（happy, clever, narrow, simple）
     · 其他兩音節、三音節以上 → more（careful, delicious, beautiful）
     · 不規則另記（good/better、bad/worse…）
   ⚠ 音節用母音群粗估就夠（silent e 要扣掉）。判不出來就回 null＝不擋，
     寧可放過也不要把正確的題目誤殺。 */
const _GN_IRREG_CMP = { good: 'better', bad: 'worse', far: 'farther', little: 'less', many: 'more', much: 'more' };
const _GN_CMP_MORE = new Set(('careful famous modern helpful useful honest boring tired afraid common active '
  + 'polite nervous eager cruel certain public private fluent patient').split(' '));
function _gnSyl(w) {
  let t = String(w || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!t) return 0;
  t = t.replace(/e$/, '');                               // silent e
  const m = t.match(/[aeiouy]+/g);
  return m ? m.length : 1;
}
/* 'er' / 'more' / null（判不出來）。 */
function _gnDegreeKind(adj) {
  const w = String(adj || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return null;
  if (_GN_IRREG_CMP[w]) return 'irregular';
  if (_GN_CMP_MORE.has(w)) return 'more';
  const n = _gnSyl(w);
  if (n <= 1) return 'er';
  if (n === 2) return /(y|er|ow|le)$/.test(w) ? 'er' : 'more';
  return 'more';
}
/* 一句話裡「比較級的寫法」有沒有被改錯方向。
   回傳 false＝這一題在教錯的東西，整題丟掉。判不出來一律回 true（不擋）。 */
function _gnCmpClaimOk(broken, fixed) {
  const B = String(broken || '').toLowerCase().match(/[a-z]+/g) || [];
  const F = String(fixed || '').toLowerCase().match(/[a-z]+/g) || [];
  if (!B.length || !F.length) return true;
  const has = (arr, w) => arr.indexOf(w) >= 0;
  // ① 原句是「more X」，改完卻變成 -er 形（或 more 被整個拿掉）＝主張「X 該用 -er」
  for (let i = 0; i < B.length - 1; i++) {
    if (B[i] !== 'more' && B[i] !== 'most') continue;
    const adj = B[i + 1];
    /* ⚠ 「more crunchier」「the most yummiest」＝雙重比較級，那是**真的錯**，
       而且後面那個字已經是 -er／-est 形，不是基本形容詞——這條規則不適用，跳過。
       （沒跳過的話，整段改錯最常出的這一類會被我自己誤殺光。） */
    if (/(er|est)$/.test(adj)) continue;
    if (_gnDegreeKind(adj) !== 'more') continue;     // 本來就該用 -er，那 AI 說得對
    /* ⚠ 加 -er 的拼字會變：happy→happier、expensive→expensiver（字尾 e 要去掉）。
       少算一種，那一種的錯題就擋不住。 */
    const y = adj.replace(/y$/, 'i'), e = adj.replace(/e$/, '');
    if ([adj, y, e].reduce((a2, x) => a2.concat([x + 'er', x + 'est']), []).some(f => has(F, f))) return false;
    /* ⚠ 「more → most」只是從比較級換成最高級，不是在主張用法錯，不要誤殺。
       只有 more／most 兩個都不見、形容詞還光禿禿地留著，才是「叫他拿掉 more」。 */
    if (!has(F, 'more') && !has(F, 'most') && has(F, adj)) return false;
  }
  // ② 原句是「Xer / Xest」，改成「more X / most X」＝主張「X 該用 more」
  for (let i = 0; i < B.length; i++) {
    const m = B[i].match(/^(.+?)(er|est)$/);
    if (!m) continue;
    if (!has(F, 'more') && !has(F, 'most')) continue;
    /* ⚠ happier 還原是 happi，不是 happy——不還原回去就認不出它是 -er 派的字。 */
    const cands = [m[1], m[1] + 'e', m[1].replace(/i$/, 'y')];
    const base = cands.find(x => has(F, x));
    if (!base) continue;
    if (_gnDegreeKind(base) === 'er') return false;  // 本來就該用 -er，卻被改成 more
  }
  return true;
}

/* ══ 🔴 v480：改寫題「從句子本身就要改得回來」══════════════════════════════
   Alan 2026-10-07 截到兩題，兩題都無解：
     ① "My fish is more beautiful." → 正解 "My fish is more beautiful than yours."
        句子裡**沒有任何線索**說是跟誰比，學生不可能知道要補 "than yours"。
     ② "The cake is sweeter than the candy." → 正解 "The candy is sweeter than the cake."
        理由還寫「Candy is actually sweeter than cake」——那是**常識題，不是文法題**。

   Alan 的原則（而且他說要套用到所有文法點）：
   改寫題只能改「句子裡本來就看得出來的文法錯」——比較級的形式、than、the、more/most…
   → 程式判得出來的版本：
     · 加進去的字只能是**功能詞**（than／the／is…），不可以憑空多一個實詞（yours）
     · 實詞的**順序不可以換**（cake↔candy 對調＝在改內容，不是在改文法）
     · 實詞只能變形（sweet→sweeter、good→better），不可以換成別的字
   判不出來就放行——寧可放過，也不要把正常的題目誤殺。 */
const _GN_FN_WORDS = new Set(('a an the this that these those my your his her its our their '
  + 'is am are was were be been being do does did have has had will would can could shall should may might must '
  + 'than then as of to in on at by for from with and or but so not no yes very too also just only '
  + 'more most less least much many few little there here it he she they we you i me him them us'
).split(' '));
function _gnStem(w) {
  let t = String(w || '').toLowerCase().replace(/[^a-z']/g, '');
  if (_GN_IRREG_CMP[t]) return t;
  for (const [a, b] of [[/iest$/, 'y'], [/ier$/, 'y'], [/est$/, ''], [/er$/, ''], [/ies$/, 'y'],
                        [/es$/, ''], [/s$/, ''], [/ed$/, ''], [/ing$/, '']]) {
    if (a.test(t) && t.replace(a, b).length >= 3) { t = t.replace(a, b); break; }
  }
  /* ⚠ big→bigger、hot→hotter、sad→sadder：加 -er 時最後一個子音會重複，
     剝掉 -er 之後剩 "bigg"，跟 "big" 對不起來。收掉重複的那一個。 */
  t = t.replace(/([bdfglmnprt])\1$/, '$1');
  return t.replace(/e$/, '');
}
function _gnSameWord(a, b) {
  const x = String(a || '').toLowerCase().replace(/[^a-z']/g, '');
  const y = String(b || '').toLowerCase().replace(/[^a-z']/g, '');
  if (!x || !y) return false;
  if (x === y) return true;
  // good/better/best、far/farther 這種比較級家族，算同一個字的不同形式
  const fam = [['good', 'better', 'best'], ['bad', 'worse', 'worst'], ['far', 'farther', 'farthest', 'further', 'furthest'],
               ['many', 'more', 'most'], ['much', 'more', 'most'], ['little', 'less', 'least']];
  if (fam.some(f => f.indexOf(x) >= 0 && f.indexOf(y) >= 0)) return true;
  const sx = _gnStem(x), sy = _gnStem(y);
  if (sx === sy) return true;
  /* 不規則動詞／名詞（buy/bought、child/children…）直接用現成那一份對照表，
     不要在這裡再寫第二份——兩份遲早會走鐘。 */
  /* ⚠ 學生寫錯的形式五花八門（goed / buyed / childs），詞幹規則不一定剝得回去
     （goed 去掉 -ed 只剩兩個字母，會被長度保護擋下）。查表時多試幾種還原形。 */
  const bases = (w) => [w, _gnStem(w), w.replace(/(ed|s|es)$/, ''), w.replace(/ed$/, 'e')].filter(Boolean);
  const bx = bases(x), by = bases(y);
  return _GN_FIX_IRREG.some(([p1, p2]) => {
    const c1 = bases(p1), c2 = bases(p2);
    const hit = (u, v) => u.some(t => v.indexOf(t) >= 0);
    return (hit(bx, c1) && hit(by, c2)) || (hit(bx, c2) && hit(by, c1));
  });
}
/* 🔴 v481：診斷題（「這句哪裡錯？」）的那一關要比改寫題鬆一點，但不能鬆到沒有。
   康橋真的有「Missing Subject」：ran across the line. → My dad ran across the line.
   ——那是**補**一個實詞，句子本來就缺，合法。
   但「My sister's shoes are the most expensive toy. → …expensive shoes.」
   （理由寫「shoes are not toys」）是**換掉**一個實詞——那是在改意思，不是改文法。
   → 判準：原句的實詞必須原封不動、照原順序出現在改好的句子裡（只准插入，不准換、不准對調）。 */
function _gnOnlyAdds(wrong, answer) {
  const tok = (t) => String(t || '').toLowerCase().match(/[a-z']+/g) || [];
  const A = tok(wrong).filter(w => !_GN_FN_WORDS.has(w));
  const B = tok(answer).filter(w => !_GN_FN_WORDS.has(w));
  if (!A.length) return true;
  let j = 0;
  for (let i = 0; i < A.length; i++) {
    while (j < B.length && !_gnSameWord(A[i], B[j])) j++;
    if (j >= B.length) return false;      // 這個實詞不見了＝被換掉或被調走
    j++;
  }
  return true;
}

function _gnFixableFromSentence(wrong, answer) {
  const tok = (t) => String(t || '').toLowerCase().match(/[a-z']+/g) || [];
  const content = (arr) => arr.filter(w => !_GN_FN_WORDS.has(w));
  let A = content(tok(wrong));
  const B = content(tok(answer));
  if (!A.length || !B.length) return true;                 // 判不出來就放行
  /* ⚠ 「This toy is the best toy I have.」→「This is the best toy I have.」
     ——刪掉重複的 toy 是合法的，而且從句子本身就看得出來。
     所以允許「少一個**重複**的實詞」，但**不允許憑空多一個新的**（🔴 than yours）。 */
  if (A.length === B.length + 1) {
    const dup = A.findIndex((w, i) => A.some((v, j) => j !== i && _gnSameWord(w, v)));
    if (dup < 0) return false;
    A = A.slice(0, dup).concat(A.slice(dup + 1));
  }
  if (A.length !== B.length) return false;                 // 憑空多／少一個實詞
  for (let i = 0; i < A.length; i++) if (!_gnSameWord(A[i], B[i])) return false;  // 換字或換順序（🔴 cake↔candy）
  return true;
}

/* 🔴 v479（Alan：「第一題應該是圈 more 就好，crunchier 沒錯啊；
   第二題只要把 good 圈起來就好，than 沒錯啊」）：
   以前把整個詞組的每一個字都當成「錯的字」→ 正確的字也被要求圈起來。
   真正錯的是「wrong 改成 right 時，**真的變動到的那幾個字**」，
   所以直接比對前後，把兩頭沒變的字剝掉。
     more crunchier → crunchier   ：剝掉共同結尾 → 只有 more 要圈
     good than      → better than ：剝掉共同結尾 → 只有 good 要圈
     more sweet     → sweeter     ：兩頭都不一樣 → more 跟 sweet 都要圈（本來就兩個字都得改）
   ⚠ 圈選用 mark，寫答案還是用整個詞組（康橋的答案欄寫的是改好的整個詞組）。 */
function _gnChangedWords(wrong, right) {
  const A = String(wrong || '').split(/\s+/).filter(Boolean);
  const B = String(right || '').split(/\s+/).filter(Boolean);
  const same = (x, y) => String(x).toLowerCase().replace(/[^a-z0-9']/g, '')
                      === String(y).toLowerCase().replace(/[^a-z0-9']/g, '');
  let i = 0, j = 0;
  while (i < A.length && i < B.length && same(A[i], B[i])) i++;                       // 共同開頭
  while (j < A.length - i && j < B.length - i && same(A[A.length - 1 - j], B[B.length - 1 - j])) j++;  // 共同結尾
  const mid = A.slice(i, A.length - j);
  return mid.length ? mid : A;        // 整個都一樣（理論上不會）就退回原本的
}

function gnValidEditPara(x, want) {
  const paragraph = String((x && x.paragraph) || '').trim();
  const title = String((x && x.title) || '').trim().slice(0, 40);
  const seenW = new Set();
  const errs = (Array.isArray(x && x.errors) ? x.errors : [])
    .map(e => ({ wrong: String((e && e.wrong) || '').trim(),
                 right: String((e && e.right) || '').trim(),
                 why:   String((e && e.why) || '').trim() }))
    .filter(e => e.wrong && e.right && e.wrong !== e.right)
    /* right 要像「改好的字」，不是一句解釋——實測模型會把 why 寫進 right
       （"good is irregular; use best, not most good."）。 */
    .filter(e => e.right.split(/\s+/).length <= 4 && !/[.;:!?]$/.test(e.right))
    /* ⚠ 實測：模型常常把冠詞一起框進來（"the most good" → "the best"）。
       康橋的答案欄寫的是「most high」不是「the most high」，而且 the 在一句裡通常不只一個，
       會害下面「句內唯一」那一關誤殺。兩邊一起把開頭的冠詞拿掉。 */
    .map(e => {
      const strip = (t) => t.replace(/^(the|a|an)\s+/i, '').trim();
      const w = strip(e.wrong), r = strip(e.right);
      return (w && r && w !== r) ? { ...e, wrong: w, right: r } : e;
    })
    .filter(e => e.wrong !== e.right)
    .filter(e => { const k = e.wrong.toLowerCase(); if (seenW.has(k)) return false; seenW.add(k); return true; });
  if (!paragraph || _gnCJK.test(paragraph)) return null;
  if (errs.some(e => _gnCJK.test(e.wrong + e.right))) return null;
  /* ⚠ 2026-10-06 實測的教訓：一開始我寫死「一個錯＝一個字」，結果最高級整個出不來——
     「most tallest → tallest」本來就是兩個字，康橋考卷上也是（most high → highest）。
     規則不能跟考點打架。改成詞組（1~3 個字）。 */
  if (errs.some(e => e.wrong.split(/\s+/).length > 3)) return null;
  const words = paragraph.split(/\s+/).map(_GN_TOK).filter(Boolean);
  if (words.length < 35 || words.length > 120) return null;
  const low = ' ' + words.map(w => w.toLowerCase()).join(' ') + ' ';
  const phr = (e) => e.wrong.split(/\s+/).map(_GN_TOK).filter(Boolean).map(w => w.toLowerCase()).join(' ');
  // 這個詞組在整段裡只能出現一次（不然學生劃掉哪一處都說不準）
  const countIn = (hay, needle) => hay.split(' ' + needle + ' ').length - 1;
  if (!errs.every(e => phr(e) && countIn(low, phr(e)) === 1)) return null;
  // 而且它的每一個字在「自己那一句」裡也只能出現一次（學生端是一個字一個字點的）
  const sents = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean);
  const sentOf = (e) => sents.find(x => (' ' + x.split(/\s+/).map(_GN_TOK).join(' ').toLowerCase() + ' ').indexOf(' ' + phr(e) + ' ') >= 0) || '';
  const okInSent = errs.every(e => {
    const st = sentOf(e); if (!st) return false;
    const tk = st.split(/\s+/).map(_GN_TOK).filter(Boolean).map(w => w.toLowerCase());
    return e.wrong.split(/\s+/).map(_GN_TOK).filter(Boolean)
      .every(w => tk.filter(t => t === w.toLowerCase()).length === 1);
  });
  if (!okInSent) return null;
  if (new Set(errs.map(e => e.wrong.toLowerCase())).size !== errs.length) return null;
  const n = Math.max(2, Math.min(8, +want || errs.length));
  if (want && errs.length !== n) return null;                            // want=0 ＝ 數量交給呼叫端決定
  // 照在段落裡出現的順序排（學生端是照順序亮起來的）
  errs.sort((p, q) => low.indexOf(' ' + phr(p) + ' ') - low.indexOf(' ' + phr(q) + ' '));
  errs.forEach(e => { e.sentence = sentOf(e); });                        // 學生端一句一題
  /* 🔴 v479：圈選只圈「真的改到的那幾個字」（crunchier、than 本來就沒錯）。 */
  errs.forEach(e => { e.mark = _gnChangedWords(e.wrong, e.right); });
  /* 🔴 v479：比較級的主張要先對過——「more delicious → deliciouser」整題丟掉。
     ⚠ 用整句比（e.sentence vs 改好的那一句），不是只比詞組：
       「more sweet → sweeter」單看詞組是對的，要放在句子裡才看得出沒問題。 */
  const bad = errs.filter(e => !_gnCmpClaimOk(e.sentence || e.wrong,
                                              (e.sentence || e.wrong).replace(e.wrong, e.right)));
  if (bad.length) return null;
  return { title, paragraph, errors: errs };
}

/* v467 ②：先判斷錯誤類型再改正。 */
function gnValidDiagnose(x) {
  const broken = String((x && x.broken) || '').trim();
  const fixed = String((x && x.fixed) || '').trim();
  const kinds = (Array.isArray(x && x.kinds) ? x.kinds : []).map(k => String(k || '').trim()).filter(Boolean);
  const ai = Number(x && x.answer);
  if (!broken || !fixed || gnNorm(broken) === gnNorm(fixed)) return null;   // 沒改就不是題目
  if (_gnCJK.test(broken + fixed + kinds.join(''))) return null;
  if (kinds.length < 2 || kinds.length > 3) return null;
  if (new Set(kinds.map(k => k.toLowerCase())).size !== kinds.length) return null;
  if (!(ai >= 0 && ai < kinds.length)) return null;
  const nb = broken.split(/\s+/).length, nf = fixed.split(/\s+/).length;
  if (nb > 16 || nf > 20) return null;
  /* 🔴 v479：「more delicious」被說成錯的——整題丟掉。教錯的文法比少一題嚴重得多。 */
  if (!_gnCmpClaimOk(broken, fixed)) return null;
  /* 🔴 v480：這一題「改成正確的句子」那一步出不出得來。
     ⚠ 不可以直接整題丟掉——康橋真的有「Missing Subject」這種題
       （"ran across the line." → "My dad ran across the line."），
       主詞本來就要學生自己想，**那是合法的「看出錯在哪」題**。
       但它不能用「標準答案比對」來改（學生寫 "The boy ran…" 也對）。
     → 所以：判斷題照出，改寫那一步只收「從句子本身就改得回來」的。 */
  /* 🔴 v481：實詞被**換掉**（shoes are not toys）＝在考常識不是考文法，整題丟掉。
     只是**補**一個實詞（Missing Subject）則照收——它是合法的「看出錯在哪」題。 */
  if (!_gnOnlyAdds(broken, fixed)) return null;
  const canRewrite = _gnFixableFromSentence(broken, fixed);
  return { broken, kinds, answer: ai, fixed, canRewrite, why: String((x && x.why) || '').trim() };
}

/* v462 ①：排順序。能程式驗的：字塊數量、沒有中文、沒有重複的字塊
   （重複的字塊會讓「哪一塊排哪裡」變成有兩種答案都對）。 */
function gnValidOrder(x) {
  const words = (Array.isArray(x && x.words) ? x.words : []).map(w => String(w || '').trim()).filter(Boolean);
  if (words.length < 4 || words.length > 10) return null;
  const joined = words.join(' ');
  if (_gnCJK.test(joined)) return null;
  if (words.some(w => w.split(/\s+/).length > 1)) return null;          // 一塊只能一個字
  const low = words.map(w => w.toLowerCase().replace(/[.,!?]/g, ''));
  if (new Set(low).size !== low.length) return null;                    // 有重複的字塊＝答案不唯一
  return { words, hint: String((x && x.hint) || '').trim().slice(0, 60),
           explain: String((x && x.explain) || '').trim() };
}

function gnValidTransform(x) {
  const prompt = String((x && (x.prompt || x.q || x.from)) || '').trim();
  const task = String((x && (x.task || x.instruction)) || '').trim();
  const answer = String((x && x.answer) || '').trim();
  if (!prompt || !answer || !task) return null;
  if (_gnCJK.test(prompt + answer + task)) return null;
  if (gnNorm(prompt) === gnNorm(answer)) return null;     // 沒變就不是轉換題
  const np = prompt.split(/\s+/).length, na = answer.split(/\s+/).length;
  if (np > 18 || na > 20 || Math.abs(np - na) > 6) return null;
  return { prompt, task, answer,
           accept: (Array.isArray(x.accept) ? x.accept : []).map(a2 => String(a2).trim()).filter(a2 => a2 && !_gnCJK.test(a2)).slice(0, 4),
           explain: String((x && x.explain) || '').trim() };
}

function gnValidTranslate(x) {
  const zh = String((x && (x.zh || x.q)) || '').trim();
  const answer = String((x && x.answer) || '').trim();
  const n = answer.split(/\s+/).length;
  return zh && _gnCJK.test(zh) && answer && !_gnCJK.test(answer) && n >= 2 && n <= 16
    ? { zh, answer, accept: (Array.isArray(x.accept) ? x.accept : []).map(a => String(a).trim()).filter(a => a && !_gnCJK.test(a)).slice(0, 4),
        hint: String(x.hint || '').trim().slice(0, 40), explain: String(x.explain || '').trim() } : null;
}

async function _gnCall(system, user, maxTokens) {
  return _aiAsk({ model: GN_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] },
    (data) => { const o = JSON.parse(_aiStripFence(data?.content?.[0]?.text || '')); return o == null ? null : o; }, 60000);
}

/* 出一種題型到 n 題：老師原本的題目先收（請 AI 補答案、照原文），不夠再請 AI 另外出；
   驗不過的丟掉、不夠就再出一輪（最多兩輪）。 */
/* v430：選擇題交叉檢查——實測 AI 把「Luna is a smart cat.」的名詞標成 is。
   v431（Alan 圖1「relax 跟 lie 都是答案」）：只比對答案還不夠——要問「有幾個選項是對的」。
   請另一次 AI 不看答案、自己把每一題**所有**說得通的選項列出來：
     · 列出來只有一個、而且就是出題的答案 → 收
     · 列出兩個以上（兩個答案都對）或跟出題的答案不一樣 → 丟掉，下一輪補
   檢查本身失敗（網路）→ 不擋，全部照收。回傳要丟掉的題目索引。 */
async function _gnCheckMcq(items, base) {
  if (!items.length) return new Set();
  const sys = `You are checking a quiz for a Taiwanese elementary English class.
For EVERY question, list the 0-based index of EVERY option a teacher would have to accept as correct.
A question must have exactly ONE correct option. If two options are both acceptable, list them both —
e.g. in 'Which word is an intransitive verb? "Rex, lie down and relax."' both "lie" and "relax" are
intransitive verbs, so you list both. Judge each option on its own; do not assume only one is right.
Output ONLY a JSON array of arrays, one per question, in order. e.g. [[2],[0,3],[1]]`;
  const list = items.map((x, i) => `${i + 1}. ${x.q}\n${x.options.map((o, k) => `   ${k}) ${o}`).join('\n')}`).join('\n');
  try {
    const got = await _gnCall(sys, `${base}\n\nQUESTIONS\n${list}`, 600);
    if (!Array.isArray(got) || got.length !== items.length) return new Set();
    return new Set(items.map((x, i) => {
      const a = Array.isArray(got[i]) ? got[i].map(Number).filter(n => Number.isInteger(n)) : [Number(got[i])];
      return (a.length === 1 && a[0] === x.answer) ? -1 : i;     // 只有一個對、而且就是答案才收
    }).filter(i => i >= 0));
  } catch (e) { return new Set(); }
}
/* v444：找出來也要防「兩個答案都對」——問另一個 AI「這句話裡符合的字有哪些」，多於一個就丟掉。
   跟 v431 的選擇題交叉檢查同一招（那次也是「lie 和 relax 都對」）。 */
async function _gnCheckCircle(items, base) {
  if (!items.length) return new Set();
  const sys = `You are checking a "find the words" exercise for a Taiwanese elementary English class.
For EVERY item you get a sentence and what the child must find.
List EVERY word in that sentence a teacher would have to accept — if three words qualify, list all three.
Judge each word on its own; do not stop at the first one.
Output ONLY a JSON array of arrays of words, one per item, in order. e.g. [["cat"],["Tom","park"],["is"]]`;
  const list = items.map((x, i) => `${i + 1}. find: ${x.find}\n   sentence: ${x.sentence}`).join('\n');
  try {
    const got = await _gnCall(sys, `${base}\n\nITEMS\n${list}`, 900);
    if (!Array.isArray(got) || got.length !== items.length) return new Set();
    const norm = (t) => String(t || '').trim().toLowerCase().replace(/[^a-z0-9']/g, '');
    return new Set(items.map((x, i) => {
      const a = [...new Set((Array.isArray(got[i]) ? got[i] : [got[i]]).map(norm).filter(Boolean))].sort();
      const want = [...new Set((x.answers || [x.answer]).map(norm))].sort();
      // 兩邊的字要完全一樣——少寫一個（漏掉的名詞）或多寫一個（不是名詞）都丟掉
      return (a.length === want.length && a.every((t, k) => t === want[k])) ? -1 : i;
    }).filter(i => i >= 0));
  } catch (e) { return new Set(); }
}
/* ══ v452（Alan：「先學一下才剛講到某些字既可以是 linking 也可以是 action，
   像是感官動詞就有兩種，那出這種題目也是應該有兩種選項」）═══════════════════
   「分一分」只有一個正確籃子，所以**凡是能放進兩個籃子的字都不能用**
   （smells 既是連綴動詞也是動作動詞——它被丟進「連綴動詞」，孩子放「動作動詞」就被判錯，
     而那正是前一頁剛教過的事）。跟選擇題（v431）、找出來（v444）同一招：
   再問一個 AI「這個字可以放進哪幾個籃子」，答案不只一個就整個字丟掉。 */
async function _gnCheckSort(categories, words, base) {
  if (!words.length) return new Set();
  const sys = `You are checking a sorting exercise for a Taiwanese elementary English class.
The child must drag each word into exactly ONE basket, so a word that honestly belongs in two baskets is unusable.
For EVERY word, list EVERY basket label a teacher would have to accept.
Be strict: English sense verbs (smell, taste, feel, look, sound) are BOTH linking verbs AND action verbs, so list both.
Output ONLY a JSON array of arrays of basket labels, one per word, in order. e.g. [["人"],["地方","東西"],["人"]]`;
  const list = words.map((w, i) => `${i + 1}. ${w.word}`).join('\n');
  try {
    const got = await _gnCall(sys, `${base}\n\nBASKETS: ${categories.join(' / ')}\n\nWORDS\n${list}`, 700);
    if (!Array.isArray(got) || got.length !== words.length) return new Set();
    const norm = (t) => _zhTW(String(t || '')).trim();
    return new Set(words.map((w, i) => {
      const a = [...new Set((Array.isArray(got[i]) ? got[i] : [got[i]]).map(norm).filter(Boolean))];
      return (a.length === 1 && a[0] === norm(w.category)) ? -1 : i;   // 只能放一個籃子、而且就是我們給的那個
    }).filter(i => i >= 0));
  } catch (e) { return new Set(); }
}
function _gnSpread(list, n) {
  const by = new Map();
  list.forEach(q => { const k = q.sec || 0; if (!by.has(k)) by.set(k, []); by.get(k).push(q); });
  const groups = [...by.values()], out = [];
  for (let i = 0; out.length < n && groups.some(g => i < g.length); i++) groups.forEach(g => { if (i < g.length && out.length < n) out.push(g[i]); });
  return out;
}
async function _gnMakeKind(kind, { n, base, teacherQs, caseMatters }) {
  if (!n || n <= 0) return [];
  const v0 = { mcq: gnValidMcq, fill: gnValidFill, translate: gnValidTranslate, rewrite: gnValidRewrite,
               circle: gnValidCircle, write: gnValidWrite, transform: gnValidTransform,
               order: gnValidOrder, diagnose: gnValidDiagnose }[kind];   // v462 / v467
  // 大寫單元的填空：答案一定要有大寫字母（實測 AI 會出「My friend ____ lives in Taipei. → teacher」這種跟大寫無關、答案又不唯一的題）
  const valid = (kind === 'fill' && caseMatters) ? (x) => { const v = v0(x); return v && /[A-Z]/.test(v.answer) ? v : null; } : v0;
  // v430：老師題目各段輪流挑（不然 8 題全出自第一段）；「底線畫出名詞」這種 identify 題改成選擇題
  const tq = _gnSpread((teacherQs || []).filter(q => q.kind === kind || (kind === 'mcq' && q.kind === 'identify')), n);
  const hasId = tq.some(q => q.kind === 'identify');
  const out = [], seen = new Set();
  // 選擇題的題幹常常一模一樣（「Circle the sentence with the correct capital letters.」）→ 連選項一起比
  /* ⚠ v467 實測踩到：新題型如果沒有被這一行認出來，所有題目的 key 都會變成空字串、
     然後被「去重」砍到只剩一題（diagnose 要 3 題只出 1 題就是這樣）。
     加新題型時，它的題幹欄位一定要列進來；最後再加一道保險，認不出來就用整個物件當 key。 */
  const key = (x) => {
    const stem = String(x.q || x.prompt || x.zh || x.wrong || x.sentence || x.broken
      || (x.words || []).join(' ') || '');
    const rest = (x.options || x.kinds || []).join('|') + '|' + (x.task || '') + '|' + (x.fixed || '');
    const k = (stem + '|' + rest).replace(/\s+/g, ' ').trim();
    return k === '|' ? JSON.stringify(x) : k;
  };
  /* 🔴 v480：被擋掉的要**告訴 AI 為什麼**。
     本來重試第二輪送的是一模一樣的提示詞 → 它當然再犯一次同樣的錯，
     然後整個題型就「產生失敗」。Alan 說得對：給它合理的提示就好。 */
  const dropped = [];
  const whyBad = (x) => {
    const a1 = String((x && (x.wrong || x.broken)) || '').trim();
    const b1 = String((x && (x.answer || x.fixed)) || '').trim();
    if (a1 && b1) {
      if (!_gnFixableFromSentence(a1, b1))
        return 'the child cannot fix it from the sentence alone — your correction adds, removes or swaps a content word';
      if (!_gnCmpClaimOk(a1, b1))
        return 'the comparative rule is backwards (remember: -er only for short adjectives; more/most for long ones)';
    }
    return 'it breaks the RULES';
  };
  const take = (arr, from) => (Array.isArray(arr) ? arr : []).forEach(x => {
    const v = valid(x);
    if (!v) { if (dropped.length < 4) dropped.push(`- ${JSON.stringify(x).slice(0, 170)}\n  WHY: ${whyBad(x)}`); return; }
    const k = key(v); if (!k || seen.has(k)) return;
    seen.add(k); out.push(Object.assign(v, { from }));
  });
  for (let round = 0; round < 2 && out.length < n; round++) {
    const need = n - out.length;
    const teacherPart = (round === 0 && tq.length)
      ? `FIRST include these ${tq.length} questions from the teacher's worksheet, keeping their wording (fill in the correct answer yourself):\n` +
        tq.map((q, i) => `${i + 1}. ${q.kind === 'identify' ? `[identify: find the ${q.find || 'target word'}] ` : ''}${q.q}${q.options.length ? '  [' + q.options.join(' / ') + ']' : ''}${q.answer ? '  (answer: ' + q.answer + ')' : ''}`).join('\n') +
        (hasId ? `\nItems marked [identify] come from "underline the …" exercises. Turn each into: q = Which word is a <X>? "<the sentence>" ,` +
          ' options = 3 words taken from that sentence, where exactly ONE is a <X> and the other two clearly are not.' +
          ' If an item asks for two kinds (e.g. common and proper nouns), ask about only ONE kind — alternate between them.' : '') +
        `\nTHEN write ${Math.max(0, need - tq.length)} NEW questions of the same kind.`
      : `Write ${need + 2} questions.`;
    // v480：第二輪把「上一輪被擋掉的那幾題＋原因」一起送回去
    const fb = (round > 0 && dropped.length)
      ? `\n\nYour previous answer was REJECTED by a checker. These were thrown away:\n${dropped.join('\n')}\nDo not make those mistakes again.`
      : '';
    try {
      const arr = await _gnCall(GN_Q_SYS[kind], `${base}\n\n${teacherPart}${fb}`, 2600);
      const before = out.length;
      take(arr, round === 0 && tq.length ? 'mixed' : 'ai');
      if (kind === 'mcq' && out.length > before) {
        const bad = await _gnCheckMcq(out.slice(before), base);
        for (let i = out.length - 1; i >= before; i--) if (bad.has(i - before)) out.splice(i, 1);
      }
      if (kind === 'circle' && out.length > before) {
        const bad = await _gnCheckCircle(out.slice(before), base);
        for (let i = out.length - 1; i >= before; i--) if (bad.has(i - before)) out.splice(i, 1);
      }
    } catch (e) { if (round === 1) throw e; }
  }
  if (kind === 'circle' && out.length > 1) {
    // 學生端整份只有一句指示語（「把名詞圈出來」）→ 只留最多數的那一種，問別種的丟掉
    const tally = {};
    out.forEach(x => { tally[x.findZh] = (tally[x.findZh] || 0) + 1; });
    const main = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
    return out.filter(x => x.findZh === main).slice(0, n);
  }
  return out.slice(0, n);
}

/* v467：整段改錯也是「一整包」（一段文章＋N 個錯），跟分一分同理，自己一支。
   出不來就帶著回饋重試——這一種對模型比較難（要剛好 N 個錯、每個錯字只能出現一次）。 */
/* ⚠⚠ 2026-10-06 實測，這一種有三個真實的失敗模式，三個都要程式處理：
     ① 叫它「剛好 5 個」它給 4 個——模型數不準。
        → 不要逼它數。改成「大概幾個」，**真正的題數由驗證過的結果決定**。
     ② 同一個錯列兩次（一次的 right 還寫成一句解釋）。→ 程式去重＋丟掉不像答案的。
     ③ 把沒錯的當成錯（「the prettiest girl」→「the prettiest girl in her class」）。
        → 這個程式看不出來，要**第二個 AI 重讀一次段落、自己列出所有錯**再比對
        （跟 v444 找出來、v452 分一分同一招：單一正解的題型都要有「還有沒有別的答案」的檢查）。 */
const GN_EDIT_CHECK_SYS = `You proofread ONE short paragraph for a single kind of grammar mistake.
Output ONLY JSON: {"mistakes":[""]}
- List the exact wording of EVERY place in the paragraph that is wrong for THAT grammar point, in order.
- Copy the wording exactly as it appears. 1-3 words each.
- Do not list anything that is already correct, and do not list other kinds of mistakes.
- If the paragraph has none, output {"mistakes":[]}.
${_AI_MINIFY}`;

async function aiMakeGrammarEditPara({ base, n = 5, rounds = 3, topic = '' } = {}) {
  let feedback = '', lastErr = null;
  for (let i = 0; i < Math.max(1, rounds); i++) {
    let raw;
    try {
      raw = await _gnCall(GN_Q_SYS.editpara,
        /* ⚠ 多種幾個：實測模型種 5 個、能用的常常只剩 2~3 個
           （有的是別種文法的錯、有的 right 寫成一句解釋）。多種一點，過濾完才夠數。 */
        `${base}${feedback}\n\nPlant about ${n + 2} mistakes in the paragraph.`, 1600);
    } catch (e) { lastErr = e; continue; }
    const v = gnValidEditPara(raw, 0);          // 0 ＝ 不檢查數量，先看格式
    if (v) {
      /* 交叉檢查：另一個 AI 重讀段落、自己把錯找出來。
         它找到的必須跟我們的答案「完全一樣」——它少找到表示我們列了沒錯的，
         它多找到表示段落裡還有沒列進答案的錯（學生會找到卻被判錯）。 */
      let seen = null;
      try {
        const chk = await _gnCall(GN_EDIT_CHECK_SYS,
          `GRAMMAR POINT: ${topic || 'the lesson above'}\n\nPARAGRAPH:\n${v.paragraph}`, 700);
        seen = (chk && Array.isArray(chk.mistakes)) ? chk.mistakes.map(m => _gnNormPhrase(m)).filter(Boolean) : null;
      } catch (e) { seen = null; }               // 檢查器掛掉不要擋住老師，就當作沒意見
      if (seen) {
        const mine = v.errors.map(e => _gnNormPhrase(e.wrong));
        const same = seen.length === mine.length && mine.every(m => seen.indexOf(m) >= 0);
        if (!same) {
          feedback = `\n\nYour last paragraph was rejected: a second proofreader found these mistakes in it — ` +
            `${seen.map(x => '"' + x + '"').join(', ') || '(none)'} — but your answer key listed ` +
            `${mine.map(x => '"' + x + '"').join(', ')}. Every mistake in the paragraph must be in the key, ` +
            `and nothing in the key may already be correct. Write a NEW paragraph and be exact.`;
          continue;
        }
      }
      if (v.errors.length >= 3 && v.errors.length <= 8) return v;   // 題數＝驗證過的真實數量
      feedback = `\n\nYour last attempt had ${v.errors.length} usable mistakes. Write a new paragraph with about ${n}.`;
      continue;
    }
    feedback = `\n\nYour last attempt was rejected: a listed mistake did not appear in the paragraph exactly once, ` +
      `or a "right" value was an explanation instead of the corrected wording, ` +
      `or something other than the grammar point was wrong. Rewrite the whole paragraph.`;
  }
  throw lastErr || new Error('整段改錯出不來，請再試一次。');
}
/* 比對兩邊的用詞時，冠詞要一起拿掉——不然檢查器說「the goodest」、我們說「goodest」
   會被當成不一樣，明明是同一個錯。 */
const _gnNormPhrase = (t) => String(t || '').split(/\s+/).map(_GN_TOK).filter(Boolean).join(' ')
  .toLowerCase().replace(/^(the|a|an)\s+/, '').trim();

/* v444：分一分是「一整組」而不是一題一題，所以不走 _gnMakeKind，自己一個小迴圈。 */
async function aiMakeGrammarSortSet({ base, n = 8, rounds = 3 } = {}) {
  let feedback = '', lastErr = null;
  for (let i = 0; i < Math.max(1, rounds); i++) {
    let raw;
    try { raw = await _gnCall(GN_SORT_SYS, `${base}${feedback}\n\nMake ${n + 2} words in total.`, 1400); } catch (e) { lastErr = e; continue; }
    let v = gnValidSortSet(raw, n + 2);
    if (v) {
      /* v452：再問一個 AI「這個字可以放幾個籃子」，能放兩個的（smells…）整個丟掉。
         故意多要 2 個字，丟掉之後通常還夠用，不必整組重出。 */
      const bad = await _gnCheckSort(v.categories, v.words, base);
      if (bad.size) {
        const dropped = v.words.filter((w, k) => bad.has(k)).map(w => w.word);
        v = gnValidSortSet({ ...v, words: v.words.filter((w, k) => !bad.has(k)) }, n);
        feedback = '\n\nYour previous answer was REJECTED: these words fit TWO baskets at once, ' +
          `so a child who sorted them correctly would still be marked wrong: ${dropped.join(', ')}.\n` +
          'Replace them with words that can only ever go in ONE basket.';
      } else {
        v = gnValidSortSet({ ...v, words: v.words.slice(0, n) }, n);
      }
      if (v) return v;
      continue;                                    // 丟完剩太少 → 換一輪重出（回饋已經寫好）
    }
    feedback = '\n\nYour previous answer was REJECTED: ' +
      'you need 2-4 Chinese basket labels, at least 2 words in EVERY basket, no repeated word, ' +
      'and every word\'s "category" must be exactly one of the labels you listed.';
  }
  throw new Error((lastErr && lastErr.timeout ? '分一分太久沒有回應' : '分一分這次沒有產生成功') + _aiUpstreamNote(lastErr));
}

/* ══ v443：這一課該用哪幾種互動？（Alan：「圖4 為什麼要組合句子」）══
   「什麼是名詞」這種「認出來／分類」的單元，排句子跟找錯字都答非所問。
   用主題字判斷，禁掉不合適的題型，並在 prompt 裡直接講清楚要用哪幾種。 */
const _GN_IDENTIFY_RE = /(noun|verb|adjective|adverb|pronoun|preposition|conjunction|article|part[s]?\s*of\s*speech|名詞|動詞|形容詞|副詞|代名詞|介系詞|冠詞|詞性)/i;
const _GN_ORDER_RE = /(word\s*order|sentence\s*(order|structure|building|pattern)|question\s*form|語序|句型|句子結構|造句|重組|疑問句)/i;
const _GN_RULEY_RE = /(tense|past|present|future|plural|singular|capital|letter|agreement|comparative|superlative|spelling|時態|過去|現在|未來|複數|單數|大寫|比較級|最高級)/i;
/* v471：三種會動的講解長什麼樣子。只有用得到的那一課會把對應那一段放進提示詞
   （不適用就連提都不提——AI 不會想用，也省 token）。 */
const _GN_ANIM_SHAPE = {
  timeline:
    '  · "timeline" {"kind":"timeline","q":"","points":[{"when":"past|now|future","en":"","hl":[""],"zh":""}],"why":""}\n' +
    '    2-3 points showing THE SAME action at different times. when: exactly "past", "now" or "future", each used once.\n' +
    '    The English sentences must really differ (that difference IS the lesson) and each should carry its own time clue\n' +
    '    ("I walked to school yesterday." / "I walk to school every day." / "I will walk to school tomorrow.").\n' +
    '    hl = the words that changed, copied exactly from that sentence. q: Traditional Chinese ≤20 characters.',
  forms:
    '  · "forms" {"kind":"forms","q":"","forms":[{"type":"affirmative|negative|question","en":"","hl":[""],"zh":""}],"why":""}\n' +
    '    2-3 versions of THE SAME sentence. type: exactly "affirmative", "negative" or "question", each used once.\n' +
    '    Keep the subject and the main idea identical and change only what the grammar makes you change\n' +
    '    ("She likes cats." / "She does not like cats." / "Does she like cats?").\n' +
    '    A "question" MUST end with a question mark. hl = the words that changed. q: Traditional Chinese ≤20 characters.',
  degree:
    '  · "degree" {"kind":"degree","q":"","levels":[{"form":"","en":"","zh":""}],"why":""}\n' +
    '    EXACTLY 3 levels of ONE adjective, in this order: plain, comparative, superlative (tall / taller / tallest,\n' +
    '    good / better / best, beautiful / more beautiful / the most beautiful).\n' +
    '    Every "en" must actually CONTAIN its own "form" word, the comparative sentence needs "than" (or an -er/more form)\n' +
    '    and the superlative sentence needs "the" (or an -est/most form) — otherwise the example does not show the point.\n' +
    '    q: Traditional Chinese ≤20 characters.',
};

/* v471：三種「會動的講解」各自綁死在它真正適用的文法點上。
   v443 的教訓：不綁的話，教「什麼是名詞」也會跑出一條時態時間軸。
   ⚠ 做法是「不適用就連提都不提」——提示詞裡不出現，AI 就不會想用，
     比起先讓它生出來再擋掉，省 token 也少一輪重試。 */
const _GN_TENSE_RE  = /(tense|past|present|future|simple\s*(past|present|future)|continuous|progressive|perfect|時態|過去式|現在式|未來式|進行式|完成式)/i;
const _GN_DEGREE_RE = /(comparative|superlative|比較級|最高級|\ber\s*\/\s*est\b|more\s*\/\s*most)/i;
const _GN_FORMS_RE  = /(negative|question|affirmative|yes\s*\/\s*no|do(es)?\s*not|don'?t|doesn'?t|auxiliar|helping\s*verb|否定|疑問|問句|肯定句|助動詞|be\s*動詞)/i;

function _gnLessonPlan(topic, notes) {
  const t = String(topic || '').trim() || String(notes || '').slice(0, 200);
  const all = t + ' ' + String(notes || '').slice(0, 600);
  // 「什麼是名詞」＝認出來／分類；「名詞的複數」「過去式」＝有規則可以違反，找錯字與排句子都合理
  const identify = _GN_IDENTIFY_RE.test(t) && !_GN_RULEY_RE.test(t + ' ' + String(notes || '').slice(0, 200));
  const ordery = _GN_ORDER_RE.test(t);

  /* v471：這一課可以用哪幾種會動的講解？時態才有時間軸、比較級才有長條圖、
     有講到否定／疑問才有三種句型。都看「主題＋筆記」，不是只看標題。 */
  const showTimeline = _GN_TENSE_RE.test(all);
  const showDegree   = _GN_DEGREE_RE.test(all);
  const showForms    = _GN_FORMS_RE.test(all) || _GN_TENSE_RE.test(all);   // 時態一定會教到否定與疑問
  const SHOW = { timeline: showTimeline, forms: showForms, degree: showDegree };
  const anim = Object.keys(SHOW).filter(k => SHOW[k]);
  const ban = Object.keys(SHOW).filter(k => !SHOW[k]);                     // 不適用的直接當不合格

  const animText = anim.length ? ('\n\nANIMATED EXPLANATIONS available for THIS grammar point: ' +
    anim.map(k => '"' + k + '"').join(', ') + '.\n' +
    'They are a richer kind of "learn" step — the site animates them, so the child SEES the change happen.\n' +
    'Use one in place of a plain "learn" step for the round where SEEING the change matters most. ' +
    'A second one is fine only if it teaches a genuinely different idea ' +
    '(e.g. "degree" once for short adjectives and once for long more/most adjectives) — never the same idea twice.\n' +
    'They have no right answer, so they still need an interaction step after them, exactly like "learn".\n' +
    anim.map(k => _GN_ANIM_SHAPE[k]).join('\n')) : '';

  if (identify && !ordery) ban.push('order');
  const text = (identify && !ordery
    ? '\n\nLESSON PLAN: this grammar point is about RECOGNISING and CLASSIFYING words.\n' +
      'Use "tap" (find the target words inside a sentence) and "sort" (put words into 2-3 groups) for most rounds; "pick" is also fine.\n' +
      'Do NOT use "order" at all — rearranging a sentence does not show whether a child can recognise these words.\n' +
      'Use "fix" only if a word can really be WRONG because of this rule (e.g. a capital letter, a missing -s).'
    : '\n\nLESSON PLAN: choose for every round the interaction that really tests what that round just taught.\n' +
      'Use at least two different interaction kinds, and prefer "tap" or "sort" whenever the idea is "find it" or "which group".')
    + animText;
  return { ban, text, anim };
}
/* imgHint 要講的是「例句在說什麼」，不是抽象的文法概念——
   v442 的自動配圖抓的就是 imgHint，AI 給了「classroom」而例句在講公園，圖片就完全不相干。 */
const _GN_STOP = new Set(('a an the is are am was were be been being do does did have has had can will would should could ' +
  'i you he she it we they me him her us them my your his its our their this that these those there here to of in on at ' +
  'and or but not with for from by as so very too what which who how why when where one two some any no yes ' +
  // 常見動詞：拿來當圖片關鍵字沒有用（stock photo 搜「loves」搜不到東西），留名詞才找得到圖
  'like likes love loves play plays go goes went run runs eat eats see sees get gets make makes take takes ' +
  'read reads want wants need needs say says put give gives come comes look looks find finds live lives ' +
  'work works walk walks sit sits drink drinks help helps know knows think thinks feel feels').split(' '));
function _gnHintWords(en) {
  return String(en || '').toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/)
    .filter(w => w && w.length > 1 && !_GN_STOP.has(w));
}
function _gnFixImgHint(st) {
  if (!st || st.kind !== 'learn') return st;
  const words = (st.examples || []).reduce((a, e) => a.concat(_gnHintWords(e.en)), []);
  if (!words.length) return st;
  const hint = String(st.imgHint || '').toLowerCase();
  const related = hint && _gnHintWords(hint).some(h => words.some(w => w === h || w.indexOf(h) === 0 || h.indexOf(w) === 0));
  if (related) return st;
  // 用第一句例句自己的實詞當關鍵字（「The park is big.」→「park big」），圖片至少跟句子有關
  const first = _gnHintWords((st.examples[0] || {}).en).slice(0, 3).join(' ');
  return first ? Object.assign({}, st, { imgHint: first }) : st;
}

// v429：互動教學獨立出來（校稿頁也能單獨按「重新產生」）
async function aiMakeGrammarLesson({ topic, topicZh = '', notes, grade = 'g4', caseMatters = false, teacherNote = '' } = {}) {
  const plan = _gnLessonPlan(topic + ' ' + topicZh, notes);                      // v443
  const base = _GN_BASE(grade, topic + (topicZh ? `（${topicZh}）` : ''), notes, caseMatters, teacherNote) + plan.text;
  // 這一課用不到的題型（例：「什麼是名詞」不該出「排句子」）直接當成不合格，讓 AI 換一種
  const keep = (st) => { const v = gnValidStep(st); return v && plan.ban.indexOf(v.kind) < 0 ? v : null; };
  let feedback = '', best = null, lastErr = null;
  for (let i = 0; i < 3; i++) {
    let raw;
    try { raw = await _gnCall(GN_LESSON_SYS, base + feedback, _gnMultiSec(notes) ? 3800 : 2400); } catch (e) { lastErr = e; continue; }
    const steps = raw && Array.isArray(raw.steps) ? raw.steps : [];
    let valid = steps.map(keep).filter(Boolean).map(_gnFixImgHint);
    /* v452（Alan：「才剛講到感官動詞兩種都可以，那出這種題目也應該有兩種選項」）：
       教學裡的「分一分」也要過同一關——能放進兩個籃子的字（smells…）先丟掉，
       丟到某一籃不夠兩個字就整步不要（寧可少一步，也不要考一題一定會被誤判的題目）。 */
    let sortBad = [];
    for (let k = 0; k < valid.length; k++) {
      const st = valid[k];
      if (!st || st.kind !== 'sort') continue;
      const flat = [].concat.apply([], st.groups.map(g => g.items.map(x => ({ word: x, category: g.label }))));
      const bad = await _gnCheckSort(st.groups.map(g => g.label), flat, base);
      if (!bad.size) continue;
      sortBad = sortBad.concat(flat.filter((w, i) => bad.has(i)).map(w => w.word));
      const drop = {};
      flat.forEach((w, i) => { if (bad.has(i)) drop[w.word] = 1; });
      const groups = st.groups.map(g => ({ ...g, items: g.items.filter(x => !drop[x]) }));
      const left = groups.reduce((n2, g) => n2 + g.items.length, 0);
      valid[k] = (groups.every(g => g.items.length >= 2) && left >= 4) ? { ...st, groups } : null;
    }
    valid = valid.filter(Boolean);
    // 最後一步是「學」＝學完沒得練就結束了，砍掉（互動教學的重點就是動手）
    let trimmed = false;
    while (valid.length && gnIsTeachStep(valid[valid.length - 1])) { valid.pop(); trimmed = true; }
    /* v445（Alan：「不需要這麼多頁講解，講解不是越多越好」）——最多 4 輪（8 步）。
       多出來的整輪砍掉，寧可少講兩頁也不要小朋友翻十頁。 */
    if (valid.length > 8) valid.length = 8;
    while (valid.length && gnIsTeachStep(valid[valid.length - 1])) valid.pop();
    const l = valid.filter(gnIsTeachStep).length >= 2 && valid.filter(s2 => !gnIsTeachStep(s2)).length >= 2
      ? { lead: _zhTW((raw && raw.lead) || '').trim(), steps: valid, outro: _zhTW((raw && raw.outro) || '').trim() } : null;
    if (l) return l;
    if (!best || valid.length > best.steps.length) best = { lead: _zhTW((raw && raw.lead) || '').trim(), steps: valid, outro: _zhTW((raw && raw.outro) || '').trim() };
    const why = (st) => {
      if (gnValidStep(st)) return `kind "${st.kind}" does not suit this grammar point — use tap / sort / pick instead`;
      if (st && st.kind === 'fix') return 'the "wrong" word is not a grammar mistake (or does not appear exactly once)';
      if (st && st.kind === 'tap') return 'the answers must be words that appear exactly once in the sentence';
      if (st && st.kind === 'sort') return 'need 2-3 groups, 3-9 items in total, every item in exactly one group';
      return 'it breaks the RULES';
    };
    const bad = steps.map((st, k) => (keep(st) ? null : `- step ${k + 1} (${why(st)}): ${JSON.stringify(st).slice(0, 160)}`)).filter(Boolean);
    if (trimmed) bad.push('- the lesson ended with a teaching step: every "learn" (and every animated explanation) must be followed by an interaction');
    if (sortBad.length) bad.push('- a "sort" step used words that belong to TWO groups at once (a child who sorts them ' +
      `correctly would still be marked wrong): ${sortBad.join(', ')}. Sense verbs (smell/taste/feel/look/sound) are ` +
      'both linking and action verbs — never put them in a sorting question.');
    feedback = `\n\nYour previous answer was REJECTED by the checker. Problem steps:\n${bad.join('\n') || '- not enough valid steps'}\n` +
      'Fix them. You need at least 2 "learn" steps and 2 interaction steps, and every step must follow the RULES exactly.';
  }
  // 三次都不完美 → 只要有「學」也有「動手」，就先用驗過的那幾步（總比整個失敗好）
  if (best && best.steps.some(gnIsTeachStep) && best.steps.some(s => !gnIsTeachStep(s))) return best;
  throw new Error((lastErr && lastErr.timeout ? '互動教學太久沒有回應' : '互動教學產生失敗') + _aiUpstreamNote(lastErr));
}

/* ══════════════════════════════════════════════════════════════════════════
   v462 ⑦（Alan 挑的第三個）：依文法主題自動挑題型
   ──────────────────────────────────────────────────────────────────────────
   現在不管教什麼，八種題型都是同一組預設值。但它們根本不等價：
     · 教「名詞分類」→ 找出來、分一分最有用，改寫句子出不出得來都沒意義
     · 教「時態」    → 填空、句型轉換最有用，分一分沒東西可分
     · 教「語序」    → 要排順序才練得到，選擇題練不到
   所以先讓 AI 判斷「這是哪一類文法點」，再給一份建議的題型與題數，老師再微調。
   ⚠ AI 只負責「判斷類型」這件它擅長的事；真正的題數是程式照對照表給的，
     不讓模型自己編數字（它會給出 0 或 50 這種沒道理的值）。
   ══════════════════════════════════════════════════════════════════════════ */
const GN_PLAN_SYS = `You classify ONE English grammar point so a teacher knows which exercises fit it.
Output ONLY JSON: {"type":"","why":"","findWhat":"","sortBy":""}
RULES
- type: EXACTLY one of
  "identify"  = the student must recognise or label words (noun / verb / proper noun / adjective…)
  "form"      = the student must change a word's form (verb tense, plurals, comparatives, a/an…)
  "order"     = the student must get the word order right (questions, adjective order, there is/are, adverb position)
  "usage"     = the student must choose the right word for the meaning (prepositions, conjunctions, pronouns…)
  "sentence"  = the point only shows up across a whole sentence (punctuation, capital letters, joining two sentences)
- why: ONE Traditional Chinese sentence, ≤30 characters, telling the TEACHER why you picked that type.
- findWhat: if the lesson can ask "find every X in this sentence", what is X, in English, ≤3 words. Else "".
- sortBy: if the lesson can ask "put these words into baskets", what are the baskets, in English,
  "A / B" or "A / B / C". Else "".
${_AI_MINIFY}`;

/* 每一類適合哪些題型、各出幾題。數字是「一節課寫得完」的量，老師可以自己改。
   0 ＝ 這一類不要出這一種（例如教名詞分類不要出句型轉換）。 */
const GN_PLAN_PRESET = {
  identify: { nOrd: 0, nMcq: 6, nFill: 4, nTr: 0, nRw: 0, nWrite: 3, nTf: 0, nCircle: 6, nSort: 8, nCircleSets: 2, nSortSets: 1 },
  form:     { nOrd: 4, nMcq: 6, nFill: 8, nTr: 4, nRw: 5, nWrite: 3, nTf: 6, nCircle: 0, nSort: 6, nCircleSets: 1, nSortSets: 1 },
  order:    { nOrd: 8, nMcq: 4, nFill: 4, nTr: 5, nRw: 4, nWrite: 3, nTf: 6, nCircle: 0, nSort: 0, nCircleSets: 1, nSortSets: 1 },
  usage:    { nOrd: 4, nMcq: 8, nFill: 8, nTr: 4, nRw: 0, nWrite: 3, nTf: 4, nCircle: 4, nSort: 6, nCircleSets: 1, nSortSets: 1 },
  sentence: { nOrd: 5, nMcq: 6, nFill: 4, nTr: 3, nRw: 8, nWrite: 4, nTf: 5, nCircle: 4, nSort: 0, nCircleSets: 1, nSortSets: 1 },
};
const GN_PLAN_ZH = { identify: '認出來型', form: '變化形式型', order: '語序型', usage: '用對字型', sentence: '整句型' };

async function aiPlanGrammarKinds({ topic, topicZh = '', notes, grade = 'g4' } = {}) {
  const body = `GRAMMAR POINT: ${topic}${topicZh ? `（${topicZh}）` : ''}\nTEACHER'S NOTES:\n${String(notes || '').slice(0, 2500)}`;
  let plan = null;
  try {
    plan = await _gnCall(GN_PLAN_SYS, body, 400);
  } catch (e) { /* 判斷失敗不該擋住老師——退回通用的預設值 */ }
  const type = (plan && GN_PLAN_PRESET[plan.type]) ? plan.type : 'usage';
  const findWhat = String((plan && plan.findWhat) || '').trim();
  const sortBy   = String((plan && plan.sortBy) || '').trim();
  const preset = { ...GN_PLAN_PRESET[type] };
  /* AI 已經回報「這一課能不能問『找出所有的 X』」「能不能分籃子」——那是它看完
     教學重點之後的判斷，比我們的對照表知道得多。它說不行就關掉，不要硬出。
     （實測：教 Do/Does 問句時 findWhat 是空的——句子裡沒有「一種可以全部找出來的字」。） */
  if (!findWhat) preset.nCircle = 0;
  if (!sortBy)   preset.nSort = 0;
  return {
    type, zh: GN_PLAN_ZH[type],
    why: String((plan && plan.why) || '').trim() || '看不出特別偏向哪一種，先給通用的一組。',
    findWhat, sortBy,
    guessed: !plan,                       // true ＝ AI 沒判斷成功，這是退回的預設值
    ...preset,
  };
}

/* v461（Alan：「一鍵生成文法只能出一組找出來、分一分，但有時候我想出兩組三組」）：
   要出好幾組的時候，每一組都要真的不一樣——同一個 prompt 送三次，模型很可能給你
   三份幾乎一樣的句子。這裡明講「這是第幾組、跟別組不可以重複」。 */
/* ⚠ 2026-09-30 實測：只說「要跟別組不一樣」不夠——分一分兩組 6 個字裡重複了 4 個
   （teacher / bicycle / Friday / pizza 這種最順手的字，模型每次都先想到它們）。
   平行送出去的請求彼此看不到對方，所以要給每一組**各自不同的題材範圍**，
   靠題材把字分開才可靠。 */
const _GN_SET_THEMES = [
  'school and family life (classroom, homework, brother, grandmother, teacher, pencil)',
  'food, animals and the night market (noodles, mango, rabbit, parrot, dumpling, market)',
  'travel, weather and sport (mountain, typhoon, swimming, bicycle race, airport, umbrella)',
];
function _gnSetHint(k, total) {
  if (!total || total <= 1) return '';
  const theme = _GN_SET_THEMES[k % _GN_SET_THEMES.length];
  return `\n\nThis is SET ${k + 1} of ${total} for the same lesson, and the sets are written at the same time
by different writers who cannot see each other. To keep them from overlapping, THIS set must draw every
sentence and every word from ONE subject area only: ${theme}.
Do not use words or names from outside that area, and do not use the textbook's own examples.`;
}

async function aiMakeGrammarPack({ topic, topicZh = '', notes, teacherQs = [], grade = 'g4', nMcq = 8, nFill = 8, nTr = 5, nRw = 0,
                                   nCircle = 0, nSort = 0, nCircleSets = 1, nSortSets = 1,
                                   nWrite = 0, nTf = 0, nOrd = 0,             // v462 ③造句 ②句型轉換 ①排順序
                                   nEdit = 0, nDiag = 0,                     // v467 康橋：整段改錯（幾個錯）／先判斷再改正（幾題）
                                   caseMatters = false, teacherNote = '', avoid = [], onProgress } = {}) {
  if (!String(notes || '').trim() && !String(topic || '').trim()) throw new Error('沒有教學內容，請先上傳照片或貼上文字。');
  /* v469：複習時把「上次出過的句子」送進去說不可以再用（跟 v466 單字那邊同一套）。 */
  const base = _GN_BASE(grade, topic + (topicZh ? `（${topicZh}）` : ''), notes, caseMatters, teacherNote)
    + _aiAvoidNote(avoid);
  const cSets = nCircle > 0 ? Math.max(1, Math.min(3, +nCircleSets || 1)) : 0;
  const sSets = nSort   > 0 ? Math.max(1, Math.min(3, +nSortSets   || 1)) : 0;
  let done = 0;
  const total = 1 + [nMcq, nFill, nTr, nRw, nWrite, nTf, nOrd, nEdit, nDiag].filter(Boolean).length + cSets + sSets;
  const tick = (label) => { done++; if (onProgress) onProgress(done, total, label); };
  // v429：每一份各自成敗——以前互動教學一失敗，Promise.all 整個丟掉，連已經出好的題目都沒了
  const settle = (p, label, n) => p.then(v => ({ v }), e => ({ e })).finally(() => { if (n === undefined || n > 0) tick(label); });
  const nm = (zh, k, tot) => tot > 1 ? `${zh} ${k + 1}` : zh;
  const circleJobs = Array.from({ length: cSets }, (_, k) =>
    settle(_gnMakeKind('circle', { n: nCircle, base: base + _gnSetHint(k, cSets), teacherQs, caseMatters }), nm('找出來', k, cSets), nCircle));
  const sortJobs = Array.from({ length: sSets }, (_, k) =>
    settle(aiMakeGrammarSortSet({ base: base + _gnSetHint(k, sSets), n: nSort }), nm('分一分', k, sSets), nSort));
  const [L, M, F, T, R, W, X, O, E, D, Cs, Ss] = await Promise.all([
    settle(aiMakeGrammarLesson({ topic, topicZh, notes, grade, caseMatters, teacherNote }), '互動教學'),
    settle(_gnMakeKind('mcq', { n: nMcq, base, teacherQs, caseMatters }), '選擇題', nMcq),
    settle(_gnMakeKind('fill', { n: nFill, base, teacherQs, caseMatters }), '填空題', nFill),
    settle(_gnMakeKind('translate', { n: nTr, base, teacherQs, caseMatters }), '中翻英', nTr),
    settle(_gnMakeKind('rewrite', { n: nRw, base, teacherQs, caseMatters }), '改寫句子', nRw),
    settle(_gnMakeKind('write', { n: nWrite, base, teacherQs, caseMatters }), '造句', nWrite),
    settle(_gnMakeKind('transform', { n: nTf, base, teacherQs, caseMatters }), '句型轉換', nTf),
    settle(_gnMakeKind('order', { n: nOrd, base, teacherQs, caseMatters }), '排順序', nOrd),
    settle(nEdit > 0 ? aiMakeGrammarEditPara({ base, n: nEdit, topic: topic + (topicZh ? `（${topicZh}）` : '') }) : Promise.resolve(null), '整段改錯', nEdit),
    settle(_gnMakeKind('diagnose', { n: nDiag, base, teacherQs, caseMatters }), '先判斷再改正', nDiag),
    Promise.all(circleJobs),
    Promise.all(sortJobs),
  ]);
  const errors = [];
  if (L.e) errors.push('互動教學');
  [[M, '選擇題', nMcq], [F, '填空題', nFill], [T, '中翻英', nTr], [R, '改寫句子', nRw],
   [W, '造句', nWrite], [X, '句型轉換', nTf], [O, '排順序', nOrd],
   [E, '整段改錯', nEdit], [D, '先判斷再改正', nDiag]]
    .forEach(([x, name, n]) => { if (n && x.e) errors.push(name); });
  Cs.forEach((x, k) => { if (x.e) errors.push(nm('找出來', k, cSets)); });
  Ss.forEach((x, k) => { if (x.e) errors.push(nm('分一分', k, sSets)); });
  // 每一組各自一個單元；circle／sort 仍然是「第一組」，舊的呼叫端與校稿畫面完全不用改
  const circleSets = Cs.map(x => x.v || []).filter(a => a.length);
  const sortSets   = Ss.map(x => x.v || null).filter(Boolean);
  const out = { lesson: L.v || null, mcq: M.v || [], fill: F.v || [], tr: T.v || [], rw: R.v || [],
                write: W.v || [], tf: X.v || [], ord: O.v || [],   // v462
                edit: E.v || null, diag: D.v || [],                // v467 康橋
                circle: circleSets[0] || [], sort: sortSets[0] || null,
                circleSets, sortSets, caseMatters, errors };
  if (!out.lesson && !out.mcq.length && !out.fill.length && !out.tr.length && !out.rw.length
      && !out.write.length && !out.tf.length && !out.ord.length && !out.edit && !out.diag.length
      && !circleSets.length && !sortSets.length) {
    throw new Error('全部都沒有產生成功，請再試一次。');
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   v436：📖 閱讀理解的「先備知識」互動教學（Alan：「還缺少了一開始的 background
   給學生的背景知識…我希望可以跟 grammar 一樣有互動式學習，讓小朋友可以提前知道
   一些重要知識，這樣對網站來說更有意義」）
   ──────────────────────────────────────────────────────────────────────────
   刻意沿用 ✏️ 出文法那一套 lesson.steps（learn／pick）＝ 學生端 StepLesson 不用改，
   星星、進度、鎖（requires）也全部沿用。差別只在內容：教的是「讀這篇之前要先知道的事」。
   ⚠ 不能爆雷：背景知識不可以直接回答文章的理解題（prompt 有寫）。
   ══════════════════════════════════════════════════════════════════════════ */
const RC_BG_SYS = `You write a SHORT interactive briefing a Taiwanese elementary student reads
BEFORE the article, so they know what this text is about and what to look for.
Output ONLY JSON:
{"lead":"","steps":[
 {"kind":"learn","say":"","imgHint":"","examples":[{"en":"","hl":[""],"zh":""}]},
 {"kind":"pick","q":"","options":["",""],"answer":0,"why":""}
],"outro":""}
RULES
- lead: ONE Traditional Chinese sentence, ≤30 characters, saying what the whole article is about —
  like a one-line summary: 「這篇在講化石獵人 Mary Anning 的一生」.
- steps: 3 or 4 rounds. Each round = ONE "learn" immediately followed by ONE "pick" that checks it.
- ROUND 1 MUST BE THE OVERVIEW: learn.say = the main point of the article in ONE Traditional Chinese
  sentence (≤30 characters): who/what it is about and why that person or thing matters.
  e.g. 「Mary Anning 是兩百年前英國的化石獵人」.
- ROUNDS 2-4: the other things the child should know before reading — who the key people are,
  where the place is, what the key idea means, or what big thing happened.
  Adding true, relevant background beyond the article is fine when it helps (年代、地點、為什麼重要).
- learn.say: ONE idea, Traditional Chinese, ≤30 characters, no jargon.
- learn.examples: 1-2 short English sentences (≤10 words) from the article or built from its words.
  hl = the exact words in "en" to highlight. zh = the Chinese meaning.
- learn.imgHint: 2-4 English words naming a photo that would help (the teacher adds the photo).
- pick.q: a short question in Traditional Chinese, OR one English sentence with ________ .
  options: 2-4 short choices. answer: 0-based index. why: Traditional Chinese ≤30 characters.
- Give the big picture, NOT every detail: leave the story's details, dates and numbers for the child
  to find while reading. Never write 課文提到／文章說 — they have not read it yet.
- Everything must be true. Do not invent facts about the people or places.
- outro: ONE encouraging Traditional Chinese sentence, ≤25 characters, telling them to start reading.
${_AI_MINIFY}`;

/* 有沒有「爆雷／講得像已經讀過」——實測 AI 會寫「課文提到他們留下美國國旗」 */
const _rcBgSpoiler = (l) => JSON.stringify(l || {}).match(/課文(提到|說|裡|中)|文章(說|提到)/g) || [];

async function aiMakeReadingBackground({ passage, title = '', grade = 'g4', teacherNote = '', onProgress } = {}) {
  const _rcUser = (pg, ti, ex) => _rcUserBase(pg, ti, [_aiTeacherNote(teacherNote).trim(), ex].filter(Boolean).join('\n\n'));
  const text = String(passage || '').trim();
  if (text.split(/\s+/).length < 40) throw new Error('文章太短了（至少要 40 個英文字）。');
  const base = `Students: Taiwanese elementary school, ${RC_GRADES[grade] || RC_GRADES.g4}
Article title: ${title || '(untitled)'}
The article:
${text.slice(0, 6000)}`;
  let feedback = '', best = null, lastErr = null;
  for (let i = 0; i < 3; i++) {
    if (onProgress) onProgress(i + 1, 3, '背景知識');
    let raw;
    try { raw = await _gnCall(RC_BG_SYS, base + feedback, 2600); } catch (e) { lastErr = e; continue; }
    const l = gnValidLesson(raw);
    const spoil = l ? _rcBgSpoiler(l) : [];
    if (l && !spoil.length) return l;
    const steps = raw && Array.isArray(raw.steps) ? raw.steps : [];
    const valid = steps.map(gnValidStep).filter(Boolean);
    if (!best || valid.length > best.steps.length) {
      best = { lead: _zhTW((raw && raw.lead) || '').trim(), steps: valid, outro: _zhTW((raw && raw.outro) || '').trim() };
    }
    if (l && spoil.length) {           // 步驟都合格，只是講得像已經讀過 → 換個講法重出
      feedback = '\n\nYour previous answer was REJECTED: it mentioned 課文/文章 (' + spoil.join('、') +
        '). The child has NOT read the article yet — teach the background as general knowledge instead.';
      continue;
    }
    const bad = steps.map((st, k) => (gnValidStep(st) ? null : `- step ${k + 1}: ${JSON.stringify(st).slice(0, 180)}`)).filter(Boolean);
    feedback = `\n\nYour previous answer was REJECTED by the checker. Problem steps:\n${bad.join('\n') || '- not enough valid steps'}\n` +
      'Fix them. You need at least 2 "learn" steps and 2 "pick" steps, and every step must follow the RULES exactly.';
  }
  if (best && best.steps.some(s => s.kind === 'learn') && best.steps.some(s => s.kind !== 'learn')) return best;
  throw new Error((lastErr && lastErr.timeout ? '背景知識太久沒有回應' : '背景知識產生失敗') + _aiUpstreamNote(lastErr));
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

/* ══════════════════════════════════════════════════════════════════════════
   v415：閱讀技巧「題目」（Alan：「我可以自己勾選我這次要什麼 reading skill 的題目」）
   ──────────────────────────────────────────────────────────────────────────
   ⚠ 跟上面的 RC_SKILLS 不是同一件事，兩個都要留著：
     · RC_SKILLS  ＝ 拖卡片的「活動」（問題/解決兩個框、因果配對、排序、文氏圖）
     · RC_QSKILLS ＝ 一般的選擇題／簡答題，只是「問的角度」指定成某一種閱讀技巧
   Alan 的課本頁邊就是印這些：Use Text Evidence／Make Inferences／
   Explain Author's Purpose／Vocabulary in Context…，所以是題目不是活動。
   ══════════════════════════════════════════════════════════════════════════ */
const RC_QSKILLS = {
  'main-idea':        { zh: '主旨大意',     en: 'Main Idea',             ico: '🌟' },
  'text-evidence':    { zh: '找出文本證據', en: 'Use Text Evidence',     ico: '🔎' },
  'inference':        { zh: '推論',         en: 'Make Inferences',       ico: '💡' },
  'cause-effect':     { zh: '因果關係',     en: 'Cause & Effect',        ico: '⚡' },
  'problem-solution': { zh: '問題與解決',   en: 'Problem & Solution',    ico: '🧩' },
  'character':        { zh: '描述角色',     en: 'Describe a Character',  ico: '🧍' },
  'compare-contrast': { zh: '比較對照',     en: 'Compare & Contrast',    ico: '⚖️' },
  'author-purpose':   { zh: '作者目的',     en: "Explain Author's Purpose", ico: '🎯' },
  'vocabulary':       { zh: '上下文猜字',   en: 'Vocabulary in Context', ico: '🔤' },
};
/* 每一種到底該問什麼——寫給 AI 看的。寫得越具體，出來的題目越像那一種技巧。 */
const RC_QSKILL_RULE = {
  'main-idea':        'Ask what the passage is MOSTLY about. The three wrong options should be details that are true but too small to be the main idea.',
  'text-evidence':    'Ask which detail from the passage BEST shows or proves a given statement. Every option must be a short quote or a close paraphrase of a real sentence in the passage, and all four must be about the same length - trim the correct one if you have to.',
  'inference':        'Ask something the passage strongly implies but never says outright; the student must put two facts together. Never require outside knowledge.',
  'cause-effect':     'Name one event from the passage and ask WHY it happened, or ask what that event caused. Both sides must be in the passage.',
  'problem-solution': 'Ask what problem someone faced, or how a problem was fixed. Both the problem and the solution must be stated in the passage.',
  'character':        'Ask what a person in the passage is like - a trait, a feeling, or why they did something - and make the answer provable from what they DO or SAY in the passage.',
  'compare-contrast': 'Ask how two things, people, places or times in the passage are alike or different. Both must appear in the passage.',
  'author-purpose':   'Ask WHY the author wrote this, or why the author included one particular detail or paragraph (to inform / to entertain / to persuade / to show something).',
  'vocabulary':       'Pick a word that really appears in the passage and ask what it means AS USED there. The student must work it out from the sentence around it.',
};
/* 把「這次要考哪幾種」變成一段 prompt。round-robin 分配，題數不夠時只出前幾種。 */
function _rcFocusBlock(qskills, n) {
  const ks = (qskills || []).filter(k => RC_QSKILLS[k]);
  if (!ks.length || !n) return '';
  const plan = Array.from({ length: n }, (_, i) => ks[i % ks.length]);
  return '\n\nTHIS SET MUST PRACTISE THESE READING SKILLS.\n' +
    ks.map(k => `- ${RC_QSKILLS[k].en}: ${RC_QSKILL_RULE[k]}`).join('\n') +
    '\nWrite the items in exactly this order:\n' +
    plan.map((k, i) => `  ${i + 1}. ${RC_QSKILLS[k].en}`).join('\n') +
    '\nPut the matching key in the "skill" field: ' + ks.join(', ') + '.';
}
/* 有兩種技巧「說得出來就驗得到」，程式再確認一次（其餘靠 grounding 那一關）：
   · 找證據：正解必須真的是文章裡的句子（不是改寫得面目全非的東西）
   · 上下文猜字：題目裡問的那個字，必須真的出現在文章裡 */
function rcQSkillOk(passage, q, skill) {
  if (skill === 'text-evidence') {
    const ans = (q.options || [])[q.answer];
    return _rcInPassage(passage, ans);
  }
  if (skill === 'vocabulary') {
    const quoted = String(q.q || '').match(/["'“‘]([A-Za-z][A-Za-z'-]{2,})["'”’]/);
    const w = quoted ? quoted[1] : '';
    if (!w) return true;                       // 沒用引號標出來就不強求
    return new RegExp('\\b' + w + '\\b', 'i').test(String(passage || ''));
  }
  return true;
}

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

/* ══ v417（Alan：「選擇題的答案選項都是最長的為答案，小朋友用猜的也猜得到」）══
   量過他截圖裡的 4 題：4 題的正解都是最長的 → 只要「選最長的」正確率 100%（隨便猜 25%），
   而且正解比第二長的多 15／17／42／48 個字元——那是一眼就看得出來的差距。

   實測三種寫法之後才定案（都是打 Worker、同一篇課文各出 6 題）：
     · 只寫「similar length」（原本就有這句）→ 正解最長 6/6，差 15~48 字元
     · 改成用「字元數」下指令              → 正解最長 6/6，差 1~13 字元（模型數不準字元）
     · 改成用「詞數」下相對指令            → 一般題最大只差 3 個字元、找證據最大 13
   ⚠ 結論：**要模型數「詞」不要數「字元」**，而且要相對（四個選項詞數一樣），
     不要給絕對值——短答案（例：On an island）被逼到 8 個字會很不自然。

   程式這一關只擋「看得出來」的：差 12 個字元以上、或整整多 2 個詞。
   差 1~6 個字元的不擋——那在畫面上根本分不出長短，擋了只是白花錢重生。 */
const _RC_LEN_REMIND = '\n\nSome of your last items were thrown away because the correct answer was ' +
  'clearly the LONGEST option - a child could pick it without reading. Count the WORDS in each option: ' +
  'all four must have the same number of words, give or take one, and the correct answer must not be the longest.';
function rcOptionLenOk(q) {
  const opts = ((q && q.options) || []).map(o => String(o || '').trim());
  if (opts.length !== 4 || opts.some(o => !o)) return false;
  const C = opts.map(o => o.length);
  const W = opts.map(o => o.split(/\s+/).length);
  const i = q.answer;
  if (!(C[i] > 0)) return false;
  const oc = C.filter((_, k) => k !== i), ow = W.filter((_, k) => k !== i);
  const hiC = Math.max.apply(null, oc), loC = Math.min.apply(null, oc);
  const hiW = Math.max.apply(null, ow), loW = Math.min.apply(null, ow);
  const visible = (dc, dw) => dc >= 12 || dw >= 2;      // 「看得出來」的門檻
  if (C[i] > hiC && visible(C[i] - hiC, W[i] - hiW)) return false;   // 明顯最長＝選最長就對
  if (C[i] < loC && visible(loC - C[i], loW - W[i])) return false;   // 明顯最短＝反向的破綻
  return true;
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
  if (!rcOptionLenOk(q)) return false;             // v417: 正解不可以是「明顯最長的那一個」
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

function _RC_SYS_MCQ(gradeNote, n, focus) {
  return _RC_SYS_BASE + '\n\n' +
`Student level: ${gradeNote}

Return: {"items":[{"q":"","options":["","","",""],"answer":0,"explain":"","skill":"detail"}]}
Generate ${n} items.

RULES
- q: ONE English question about the passage, 6-18 words. Answerable from the passage alone.
- options: EXACTLY 4 short English choices, all plausible. Exactly ONE is correct.
  The three wrong ones must be wrong because of the passage, not because they are silly.
  Never use "All of the above" or "None of the above".
- SAME-LENGTH RULE (a program checks this and throws the item away if it fails):
  Count the WORDS in each of the four options. All four must have the same number of words,
  give or take one word. Write the three wrong options FIRST and give them just as much detail
  as the right one; then make the correct answer the same length.
  The correct answer must NOT be the longest option.
  A child who cannot read the passage must not be able to spot the answer just by its length.
- answer: the 0-BASED INDEX (0,1,2,3) of the correct option. A number, never the text.
- explain: Traditional Chinese, 20-45 characters. Quote the English clue phrase from the passage
  inside the Chinese quotation marks, then say what it means, then give the answer.
  GOOD: 「the deer ate too much grass and leaves」說鹿把草和樹葉都吃光了，所以島上的食物變少。
  GOOD: 「the wolves left the healthy deer alone」說狼只吃虛弱的鹿，所以鹿群反而變健康。
  BAD:  文章有提到相關內容，所以選 B。
  BAD:  quoting nothing from the passage.
- Keep every word simple enough for the student level above.` +
    /* ⚠ v415：老師指定了要考哪些技巧時，這兩條一定要拿掉——
       底稿要求「混合 main-idea / vocabulary / inference」，跟指定的技巧會互相打架，
       出來的題目就會一半聽老師的、一半聽底稿的。 */
    (focus ? focus : `
- skill: one of "main-idea", "detail", "vocabulary", "inference", "sequence", "cause-effect".
- Mix the skills: at least one "main-idea", at least one "vocabulary" (a word used in the passage,
  asked in context), at least one "inference". The rest can be "detail".`);
}

function _RC_SYS_SA(gradeNote, n, focus) {
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
- Ask about different parts of the passage - do not ask two questions about the same sentence.` + (focus || '');
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

function _rcUserBase(passage, title, extra) {
  return (title ? 'Title: ' + title + '\n\n' : '') +
    'Passage:\n"""\n' + String(passage || '').trim() + '\n"""' +
    (extra ? '\n\n' + extra : '');
}
const _rcUser = _rcUserBase;      // 沒有特別要求時就是原本的（各函式內部會自己蓋掉）

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
async function aiMakeReadingSet({ passage, title = '', grade = 'g4', mcq = 10, sa = 5,
  skills = [], qSkills = [], qSkillN = 2, teacherNote = '', onProgress } = {}) {
  // v445：老師的「特別要求」跟著每一個請求走（題目、簡答、閱讀技巧都算）
  const _rcUser = (pg, ti, ex) => _rcUserBase(pg, ti, [_aiTeacherNote(teacherNote).trim(), ex].filter(Boolean).join('\n\n'));
  const text = String(passage || '').trim();
  if (text.split(/\s+/).length < 40) throw new Error('文章太短了（至少要 40 個英文字），請貼完整的文字稿。');
  const gradeNote = RC_GRADES[grade] || RC_GRADES.g4;
  const nMcq = Math.max(0, +mcq || 0);
  const nSa = Math.max(0, +sa || 0);
  const kinds = (skills || []).filter(k => RC_SKILLS[k]);
  // v415: 閱讀技巧「題目」（跟上面拖卡片的活動是兩回事）
  const qsk = (qSkills || []).filter(k => RC_QSKILLS[k]);
  const nQS = Math.max(0, +qSkillN || 0);

  if (!nMcq && !nSa && !kinds.length && !(qsk.length && nQS)) {
    throw new Error('至少要勾一種：選擇題、閱讀簡答、閱讀技巧活動，或閱讀技巧題。');
  }

  const CHUNK = 5;
  const mcqRounds = Math.ceil(nMcq / CHUNK);
  const total = mcqRounds + (nSa ? 1 : 0) + kinds.length + (nQS ? qsk.length : 0);
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
          _rcUser(text, title, (asked ? 'Do NOT repeat or rephrase these questions:\n' + asked : '')
            + (wave ? _RC_LEN_REMIND : '')), 3200);
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

  /* ── v415：閱讀技巧題（Alan：「這個也幫我多加額外的 reading skill 題目」）──
     一種技巧一個請求：這樣「這一題是哪一種」是由請求本身決定的，
     不用去猜 AI 自己標的 skill 對不對，也不會幾種混在一起互相排擠。
     驗證跟一般選擇題完全一樣（格式 → 有沒有根據 → 找證據/猜字再多驗一關）。 */
  const skillQs = nQS && qsk.length ? [].concat(...(await pMap(qsk, async (kind) => {
    const got = [];
    for (let round = 0; round < 2 && got.length < nQS; round++) {
      const need = nQS - got.length;
      const asked = got.map(q => q.q).join(' | ');
      let o = null;
      try {
        o = await _rcCall(
          _RC_SYS_MCQ(gradeNote, need + 1, _rcFocusBlock([kind], need + 1)),
          _rcUser(text, title, (asked ? 'Do NOT repeat or rephrase these questions:\n' + asked : '')
            + (round ? _RC_LEN_REMIND : '')), 3000);
      } catch (e) { continue; }
      ((o && o.items) || []).forEach(raw => {
        if (got.length >= nQS) return;
        const q = _rcFixAnswerIdx({
          q: _rcTxt(raw && raw.q),
          options: ((raw && raw.options) || []).map(_rcTxt).slice(0, 4),
          answer: raw && raw.answer,
          explain: _rcTxt(raw && raw.explain),
          skill: kind,
        });
        if (!q || !_rcValidMcq(q)) return;
        if (!rcGroundedMcq(text, q, kind)) return;           // 不能亂出
        if (!rcQSkillOk(text, q, kind)) return;              // 找證據／猜字再多驗一關
        if (got.some(e => e.q.toLowerCase() === q.q.toLowerCase())) return;
        got.push({ id: _rcId('rq'), ...q });
      });
    }
    bump(RC_QSKILLS[kind].zh);
    return got;
  }, 4))) : [];

  if (!mcqOut.length && !saOut.length && !blocks.length && !skillQs.length) throw new Error('AI 這次什麼都沒生出來，請再試一次。');
  return { mcq: mcqOut, sa: saOut, blocks, skillQs };
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
/* v415：有幾種技巧的「正解」天生就是抽象敘述，不會重用文章的字——
   例：作者目的的答案是「To show how his early experiences led to his interest in flight」，
   跟文章只有 3/11 個實詞重疊，會被下面那一關誤擋（實測就擋掉了一題好題目）。
   這幾種只驗線索句那一關（那本來就是主要的關卡，而且是真的比對文章）。 */
const _RC_ABSTRACT_ANSWER = { 'author-purpose': 1, 'main-idea': 1, 'inference': 1, 'character': 1 };
function rcGroundedMcq(passage, q, skill) {
  const clue = _rcClue(q && q.explain);
  if (!clue) return false;                       // 沒引用文章＝沒辦法證明它有根據
  if (!_rcInPassage(passage, clue)) return false;
  if (_RC_ABSTRACT_ANSWER[skill || (q && q.skill)]) return true;
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
  return { id: _rcId('gq'), kind: 'mc', q: q.q, options: opts, answer: opts.indexOf(correct),
           explain: q.explain || '', skill: q.skill || '' };
}
const _grQFromSa = (q) => ({ id: _rcId('gq'), kind: 'short', q: q.question, keyPoints: q.keyPoints || '' });

/* 一段（或整篇）出一組題。mcq / sa 兩種同時送出，驗不過的重來一輪。 */
async function _rcOneChunk(text, { title, gradeNote, mcq, sa, where, qskills }) {
  const out = { mcq: [], sa: [], dropped: 0 };
  for (let round = 0; round < 2; round++) {
    const needM = mcq - out.mcq.length, needS = sa - out.sa.length;
    if (needM <= 0 && needS <= 0) break;
    const jobs = [];
    // v415: 老師勾了閱讀技巧 → 把「每一題要問哪一種」寫進 prompt（round-robin 分配）
    if (needM > 0) jobs.push(['mcq', _RC_SYS_MCQ(gradeNote, needM + 1, _rcFocusBlock(qskills, needM + 1)), 3000]);
    if (needS > 0) jobs.push(['sa',  _RC_SYS_SA(gradeNote,  needS + 1, _rcFocusBlock(qskills, needS + 1)), 2000]);
    const asked = out.mcq.map(q => q.q).concat(out.sa.map(q => q.question)).join(' | ');
    const extra = where +
      (asked ? '\n\nDo NOT repeat or rephrase these questions:\n' + asked : '') +
      /* v417：重生的回饋要指名道姓（v382 的老教訓）。上一輪最常被丟掉的兩個原因都寫出來：
         說了文章裡沒有的事、以及「正解是最長的那一個」。 */
      (round ? '\n\nYour last try was rejected. Two things to fix:\n' +
               '1. Everything - the question, the correct option, and the clue you quote in "explain" - ' +
               'must appear in the passage above.\n' +
               '2. Count the WORDS in the four options - they must all have the same number of words, ' +
               'give or take one. Last time the correct answer was clearly the longest, so a child could ' +
               'pick it without reading. Make the three wrong options just as detailed as the right one.' : '');
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
          if (!rcGroundedMcq(text, q, q.skill)) { out.dropped++; return; }   // ← 不能亂出
          /* v415：技巧標籤是 AI 自己講的，光看標籤不算驗證；
             但「找證據」與「上下文猜字」這兩種說得出來就驗得到，程式再確認一次。 */
          if (!rcQSkillOk(text, q, q.skill)) { out.dropped++; return; }
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
/* v415：每段要出幾題——'auto' 就照這一段的長度給（Alan 本來就是這樣人工判斷的：
   「視每段的長度以及有沒有重點」2~5 題）。短段只出 1 題，長段最多 4 題。 */
function _rcAutoN(text, cap) {
  const w = String(text || '').split(/\s+/).filter(Boolean).length;
  const n = w < 45 ? 1 : w < 100 ? 2 : w < 180 ? 3 : 4;
  return Math.min(n, cap == null ? 4 : cap);
}
async function aiMakeGuidedQuestions({ segments, title = '', grade = 'g4',
  perMcq = 2, perSa = 1, finalMcq = 3, finalSa = 1, skills = [], qSkills = [], onProgress, teacherNote = '' } = {}) {
  const _rcUser = (pg, ti, ex) => _rcUserBase(pg, ti, [_aiTeacherNote(teacherNote).trim(), ex].filter(Boolean).join('\n\n'));
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
  const autoMcq = perMcq === 'auto';                       // v415: 每段題數照長度給
  const nMcq = autoMcq ? 4 : Math.max(0, +perMcq || 0);
  const nSa = Math.max(0, +perSa || 0);
  const qsk = (qSkills || []).filter(k => RC_QSKILLS[k]);
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
      const want = autoMcq ? _rcAutoN(seg.text) : nMcq;
      const r = await _rcOneChunk(seg.text, { title, gradeNote, mcq: want, sa: nSa, where, qskills: qsk });
      dropped += r.dropped;
      const qs = r.mcq.map(_grQFromMcq).concat(r.sa.map(_grQFromSa));
      if (qs.length) bySeg[seg.i] = qs;
      bump(`第 ${seg.i + 1} 段（${qs.length} 題）`);
    }, 8);   // v453：一次 6 段 → 8 段（Worker 扛得住，11 段的文章少等一輪）
  }

  // ── 整篇綜合 ──
  let final = [];
  if (wantFinal) {
    const r = await _rcOneChunk(full, { title, gradeNote, mcq: fMcq, sa: fSa, qskills: qsk,
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
  // v449：一題都沒出來時，先講「是不是 AI 服務不通」——不然老師會以為是自己的文章有問題
  if (!made && !blocks.length) throw new Error('AI 這次沒有出到符合文章的題目，請再試一次。' + _aiUpstreamNote(null));
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

/* 上一次出過哪些句子——這一組所有單元裡「學生看得到的英文句子」都算。
   漏掉任何一種，那一種就有機會原封不動再出一次。 */
function reviewSeenSentences(items) {
  const out = [];
  const push = (t) => { const v = String(t || '').trim(); if (v && /[A-Za-z]/.test(v)) out.push(v); };
  (items || []).forEach(it => {
    if (!it) return;
    (it.cards || []).forEach(c => push(c.example));                       // 單字卡例句
    (it.questions || []).forEach(q => push(q.q || q.sentence));           // 選擇題／填空
    (it.pairs || []).forEach(q => push(q.prompt));                        // 打字題（填空／改寫／中翻英的英文答案不算題目）
    (it.circleQuestions || []).forEach(q => push(q.sentence));            // 找出來
    (it.spellWords || []).forEach(w => push(w.sentence));                 // 聽寫的例句
    if (it.passage) push(String(it.passage).replace(/\[[^\]]*\]/g, '___'));   // 短文填空（把答案拿掉再比對）
    (it.orderQuestions || []).forEach(q => push((q.words || []).join(' ')));    // 排順序
  });
  return [...new Set(out)];
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

// ── Weekly Report Helpers ──────────────────────────────────────────────
// Build a structured report object for one student + one week.
/* 🔴 v596：同一個單元 id 出現在好幾週（「沿用到別週」複製出來的 id 相同）時，
   進度只認「週次_單元id」那一筆——不能再用「任何一週的後綴相同」當作做完了。
   （LINE 提醒少提醒就是這個；老師後台與聊天室「誰沒做完」用的是同一套判斷，所以數字一起錯。）
   ⚠ 只有「有重複」的 id 才嚴格；全年級只有一個的 id 照舊寬鬆，那是為了週次 id 改過的舊進度。 */
const _sharedCache = new WeakMap();
function sharedItemIds(weeks, order) {
  if (!weeks || typeof weeks !== 'object') return new Set();
  const c = _sharedCache.get(weeks);
  if (c && c.order === order) return c.set;
  const cnt = {};
  (order && order.length ? order : Object.keys(weeks)).forEach(wid => {
    const seen = new Set();
    Object.values((weeks[wid] || {}).items || {}).forEach(arr => (arr || []).forEach(it => {
      if (it && it.id && !seen.has(it.id)) { seen.add(it.id); cnt[it.id] = (cnt[it.id] || 0) + 1; }
    }));
  });
  const set = new Set(Object.keys(cnt).filter(k => cnt[k] > 1));
  _sharedCache.set(weeks, { order, set });
  return set;
}
/* 這個單元在學生進度裡對得上的 key（順序＝優先序：週次_id → 裸 id → 後綴）。it＝{ id, progressId, shared } */
function progKeysFor(its, it) {
  const keys = [];
  if (!its || !it) return keys;
  if (it.progressId && its[it.progressId]) keys.push(it.progressId);
  if (its[it.id] && keys.indexOf(it.id) < 0) keys.push(it.id);
  if (!it.shared) Object.keys(its).forEach(k => { if (k.endsWith('_' + it.id) && keys.indexOf(k) < 0) keys.push(k); });
  return keys;
}

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
  const shared = sharedItemIds(weeks, weekOrder);   // v596：有重複的 id 不走後綴那一層
  const getProgress = (itemId) =>
    its[`${targetWeekId}_${itemId}`] || its[itemId] || (shared.has(itemId) ? null : suffixIndex()[itemId]) || null;

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
// 自動提醒（每天 18:00 照規則發）——老師端只用來預覽「今晚會發什麼」
function lineRunReminders(dry, pass) { return _lineCall('/run-reminders' + (dry ? '?dry=1' : ''), 'POST', pass); }
// v426：老師主動提醒（跟自動提醒完全分開）target = {type:'all'|'grade'|'students', grade?, emails?}
function lineManual(target, note, dry, pass) {
  return _lineCall('/manual' + (dry ? '?dry=1' : ''), 'POST', pass, { target, note: String(note || '') });
}
// v460：最近 10 次自動提醒「實際發了什麼」
// （用 Messaging API 推出去的訊息不會進 LINE 官方帳號後台的聊天室——那裡只留
//   「從聊天室手動打的」與「家長傳進來的」，所以老師本來完全沒有紀錄可看。）
function lineRunLog(pass) { return _lineCall('/run-log', 'GET', pass); }
// v425：最近 30 則 LINE 訊息「怎麼處理、有沒有回成功」
function lineDiag(pass) { return _lineCall('/diag', 'GET', pass); }

Object.assign(window, {
  aiReadGrammarSheet, aiMakeGrammarPack, aiMakeGrammarLesson, aiJudgeTranslation, gnAnswerOk, gnNorm, gnValidLesson, gnValidStep,
  gnIsTeachStep, GN_TEACH_KINDS,                 // v471：「這一步是講解還是動手」只有一份判斷
  gnValidRewrite, gnCleanStem,
  gnFixPairOk: _gnFixPairOk, gnLessonPlan: _gnLessonPlan, gnFixImgHint: _gnFixImgHint,
  gnValidCircle, gnValidSortSet, aiMakeGrammarSortSet,
  gnValidWrite, gnValidTransform, gnValidOrder,    // v462 ③造句 ②句型轉換 ①排順序
  gnValidEditPara, gnValidDiagnose,               // v467 康橋：整段改錯／先判斷再改正
  aiPlanGrammarKinds, GN_PLAN_PRESET, GN_PLAN_ZH,   // v462 ⑦ 依主題自動挑題型
  CATEGORIES, SEED_WEEKS, DEFAULT_WEEK_ORDER, TYPE_META, ADMIN_EMAILS,
  // v342: 集點（星星）
  subscribeMyStars, subscribeAllStars, addStarEntry, deleteStarEntry,
  // v343: 商店商品（老師自己維護）
  subscribeShop, saveShopItems,
  // LINE 通知
  LINE_ENDPOINT, lineBroadcast, linePush, lineSyncRoster, lineGetLinks, lineUnlink, lineRunReminders, lineManual, lineDiag, lineRunLog,
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
  aiMakeVocabExercises, aiMakeVocabStory, aiMakeVocabStories,
  AUTO_NEXT_SPEED, autoNextMs, QS_MAX_Q, QS_SPLIT, qsChunkEven, qsPartTitle, qsStripPart, qsStoryBank,
  storyBlanks, storyCheck, storyFix, storyDropDupes, storyJudge: _storyJudge, storyBlankView: _storyBlankView, storyHint: _storyHint, aiMakeGrammarSet, GR_TENSES, grCountBlanks, grValidA: _grValidA, grValidB: _grValidB, grFixPassage: _grFixPassage, aiMakeLesson,
  // v386: 閱讀理解出題（選擇題＋簡答＋閱讀技巧）
  vocabBandOf, VOCAB_BANDS, aiMakeReadingSet, aiMakeReadingBackground, aiMakeGuidedQuestions, rcGroundedMcq, rcGroundedSa, rcQSkillOk, rcOptionLenOk,
  RC_SKILLS, RC_QSKILLS, RC_GRADES, rcValidBlock, rcFixBlock, rcRepairBlock, rcResequence, rcFilterChips, rcNewChip: () => ({ id: _rcId('rc'), text: '', zone: '', why: '' }), rcNewBlockId: () => _rcId('rb'),
  // v287/v288: 分段閱讀——OCR 單字資料（Firestore）＋點字查義
  saveReadingWords, fetchReadingWords, lookupWord, uploadReadingAudio, generateTtsAudio, grJoinReadLines, grReadTextFrom, grReadWordsFrom, grWordsText, grSayNumber, grWordsBefore,
  // AI Writing, Short Answer, Essay & Story Mountain
  checkWriting, checkShortAnswer, checkEssay, checkStoryMountain,
  // Wrong questions
  collectWrongQuestions, removeWrongQuestion,
  reviewWordsOf, reviewSeenSentences,          // v466：複習用（同一批字、不一樣的題目）
  reviewGrammarOf,                             // v469：文法也能排複習
  qsKindsInGroup,                              // v475：這一組已經有哪些題型（只補漏掉的）
  mxSmartLine,                                 // v477：吉祥物看情況說話
  aiMakeVocabSense, qsValidSense,              // v468 康橋：字義選擇題
  aiMakeWordStudy, wsValidPack, wsCheck, WS_CHECKS,   // v482 📘 一鍵出 Word Study
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
Object.assign(window, { sharedItemIds, progKeysFor, noteCloudWeeks, guardWeekSave, weeksWithDeletes, countWeekItems: _countWeekItems });

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
  ['hat', 'item'].forEach(k => {       // v505：fx / voice 下架，身上只剩頭飾與配件
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
  if (!it || it.free) return { ok: false, reason: 'bad-id' };
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
/* 老師端：把買過的東西整理成一列一列（有紀錄的用紀錄的時間，舊資料沒時間就留空） */
function mxPurchases(mx) {
  const log = (mx && Array.isArray(mx.log)) ? mx.log : [];
  const byId = {};
  log.forEach(e => { if (e && e.id && !byId[e.id]) byId[e.id] = e; });
  const out = mxOwnedList(mx).map(id => {
    const it = MX_BY_ID[id], e = byId[id] || {};
    return { id, zh: (it && it.zh) || id, kind: (it && it.kind) || '', cost: (it && it.cost) || 0, at: e.at || 0 };
  });
  const paid = mxRenamesPaid(mx);
  for (let i = 0; i < paid; i++) {
    const e = (log.filter(x => x && x.id === '__rename')[i]) || {};
    out.push({ id: '__rename', zh: '改名卡', kind: 'rename', cost: MX_RENAME_COST, at: e.at || 0 });
  }
  return out.sort((a, b) => (b.at || 0) - (a.at || 0));
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
/* 退費：拿掉一件（改名卡就把次數減一）。回傳新的 mx，畫面可以馬上更新。 */
async function mxRefund(uid, id, mx) {
  if (!uid) return { ok: false, reason: 'no-user' };
  const cur = mx || {};
  let owned = mxOwnedList(cur), renames = (+cur.renames || 0);
  let cost = 0;
  if (id === '__rename') {
    if (mxRenamesPaid(cur) <= 0) return { ok: false, reason: 'not-owned' };
    renames = Math.max(0, renames - 1);
    cost = MX_RENAME_COST;
  } else {
    if (owned.indexOf(id) < 0) return { ok: false, reason: 'not-owned' };
    cost = (MX_BY_ID[id] && MX_BY_ID[id].cost) || 0;
    owned = owned.filter(x => x !== id);
  }
  // 身上正穿著的就順手脫掉（不然畫面會戴著一個已經不屬於他的東西）
  const wear = Object.assign({}, cur.wear || {});
  Object.keys(wear).forEach(k => { if (wear[k] === id) wear[k] = ''; });
  const log = mxLogAdd(cur, { id, cost: -cost, refund: true });
  try {
    await _db.collection('progress').doc(uid).set({ mx: { owned, wear, renames, log } }, { merge: true });
    return { ok: true, cost, mx: Object.assign({}, cur, { owned, wear, renames, log }) };
  } catch (e) { return { ok: false, reason: 'save', err: e }; }
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
Object.assign(window, { mxPurchases, mxRefund, mxLogAdd, mxStarRows,
  MX_SHOP, MX_KINDS, mxItemOf, mxOwnedList, mxHasItem, mxSpent, mxWearOf, mxBuy, mxSetWear,
  mxOwnedPets, mxPetItem, mxRename, mxRenameCost, MX_RENAME_COST });

/* ══════════════════════════════════════════════════════════════════════════
   v517 💬 用講的就好 —— 聽得懂老師在說什麼，去按對的那顆按鈕
   ──────────────────────────────────────────────────────────────────────────
   Alan：「我可以給他文字 或是截圖 不需要有任何匯入方式 我用對話的他就可以幫我生成
          單字 文法 word study reading comprehension 之類的…我都有所有模板了對吧？」

   ⭐ 他說得對：13 個產生器（＝「手」）早就做好了，而且都吃預填參數。
     缺的只是一個**路由器**。所以這一版刻意**不新寫任何出題邏輯**：
       AI 只決定「要做哪一件事、參數是什麼」
       → 程式打開**現成的那個視窗**並且填好
       → 出題、校稿、存檔走的全是已經驗過上百次的舊路。

   🔴 它不會自己存。中間一定有一張確認卡。
     週次的內容是整個年級共用一份文件，聽錯一句話就寫進去可能蓋掉別的東西
     （v447「我做的單元不見了」）。多按一下，換「它絕對不會自己亂動課程」。

   🔴 聽不懂就說聽不懂。寧可回一句「你是要出單字還是 Word Study？」
     也不要亂猜一個最接近的去做——猜錯的成本是老師花十分鐘校稿完才發現方向就錯了。
   ══════════════════════════════════════════════════════════════════════════ */

/* ══ v570 聊天室「找那一組」要找對（Alan 合併 Barbed Wire Baseball 與 Barbed Wire Baseball — Part 2 沒成功）══
   🔴 以前是「第一個符合就用」：名字只要**包含**他講的、或他講的包含它，就算中。
      兩組名字一個是另一個的前半段時（A 與 A — Part 2），找「A — Part 2」會先撞到 A（A 被包含在裡面），
      於是兩次都指到同一組——合併出來只有一組的字，看起來像「沒合併」。
      （程式註解還寫「完全一樣最好」，但實際沒有優先選完全一樣的。）
   → 改成**打分數**：完全一樣 ＞ 他講的是名字的開頭 ＞ 名字包含他講的 ＞ 他講的包含名字（而且名字愈長愈好），
     整週所有類別一起比，取最高分。同分取字數最接近的。
   ⚠ 純函式，items 傳 week.items，norm 傳比對用的正規化函式——方便單獨測。 */
function askBestGroup(weekItems, name, norm) {
  /* 標點全部當空白（「Part 2」「— Part 2」「- Part 2」是同一個意思；他打字不會記得放破折號） */
  const N0 = norm || ((t) => String(t || '').toLowerCase());
  const N = (t) => N0(t).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const q = N(name);
  if (!q) return null;
  const score = (n) => {
    if (!n) return 0;
    if (n === q) return 1000;
    if (n.startsWith(q)) return 800 - (n.length - q.length);        // 他講了前半段：A → A — Part 2 也算，但字愈少愈接近
    if (n.indexOf(q) >= 0) return 600 - (n.length - q.length);
    if (q.indexOf(n) >= 0 && n.length >= 3) return 400 + n.length;  // 他講得比組名長：組名愈長愈像
    return 0;
  };
  let best = null, bestScore = 0;
  const items = weekItems || {};
  Object.keys(items).forEach(cid => {
    const groups = {};
    (items[cid] || []).forEach(it => {
      const g = (it.group || '').trim();
      if (g) (groups[g] = groups[g] || []).push(it);
    });
    Object.keys(groups).forEach(g => {
      const sc = score(N(g));
      if (sc > bestScore) { bestScore = sc; best = { catId: cid, name: g, items: groups[g] }; }
    });
  });
  if (best) return best;
  /* 他常講的是**單元名**不是組名——用單元名找，回傳它所屬的那一組（同樣打分數） */
  Object.keys(items).forEach(cid => {
    const groups = {};
    (items[cid] || []).forEach(it => {
      const g = (it.group || '').trim();
      if (g) (groups[g] = groups[g] || []).push(it);
    });
    (items[cid] || []).forEach(it => {
      const sc = score(N(it.title || ''));
      if (sc > bestScore) {
        bestScore = sc;
        const g = (it.group || '').trim();
        best = g && groups[g] ? { catId: cid, name: g, items: groups[g] } : { catId: cid, name: it.title || '', items: [it] };
      }
    });
  });
  return best;
}
/* v570 整組換類別（純函式，直接改傳進來的 week 物件；呼叫端負責先 clone）。
   ⚠ 只動「放在哪一類」：單元 id 不變 → 進度（weekId_itemId）、作業日期（homework[id]）、requires／linked 都不用搬。
   📎 groupRes 的 key 是「類別::組名」，一起換。回傳搬了幾個單元。 */
function moveGroupCatInWeek(wk, fromCat, itemIds, toCat, groupName, resKey) {
  const ids = new Set((itemIds || []).filter(Boolean));
  if (!wk || !wk.items || !Array.isArray(wk.items[fromCat]) || !ids.size || !toCat || fromCat === toCat) return 0;
  const moving = wk.items[fromCat].filter(it => it && ids.has(it.id));
  if (!moving.length) return 0;
  wk.items[fromCat] = wk.items[fromCat].filter(it => !(it && ids.has(it.id)));
  if (!Array.isArray(wk.items[toCat])) wk.items[toCat] = [];
  wk.items[toCat] = wk.items[toCat].concat(moving);
  const g = String(groupName || '').trim();
  const rk = resKey || ((c, n) => `${c}::${String(n || '').trim()}`);
  if (wk.groupRes && g) {
    const from = rk(fromCat, g), to = rk(toCat, g);
    if (wk.groupRes[from]) {
      wk.groupRes[to] = { ...(wk.groupRes[to] || {}), ...wk.groupRes[from] };
      // v572：只搬單一單元時，原類別若還有同組的單元，參考資料要留一份在原處
      if (!wk.items[fromCat].some(it => it && String(it.group || '').trim() === g)) delete wk.groupRes[from];
    }
  }
  return moving.length;
}
Object.assign(window, { askBestGroup, moveGroupCatInWeek });

/* 它會做的事就這幾件。AI 只能從這裡面挑，挑別的一律當 unknown。 */
const ASK_JOBS = {
  vocab:     { zh: '一鍵出單字', ico: '📚', need: 'words', where: 'editor' },
  wordstudy: { zh: '一鍵出 Word Study', ico: '📘', need: 'topic', where: 'editor' },
  grammar:   { zh: '一鍵出文法', ico: '✏️', need: 'text', where: 'editor' },
  reading:   { zh: '出閱讀理解', ico: '📖', need: 'text', where: 'editor' },
  exam:      { zh: '拍考卷 → 互動版', ico: '📸', need: 'images', where: 'editor' },
  lesson:    { zh: '擬上課紀錄草稿', ico: '🪄', need: 'student', where: 'dash' },
  weak:      { zh: '弱點分析 → 針對性練習', ico: '🎯', need: 'student', where: 'dash' },
  /* ══ v531（Alan：「我要他做到任何事情，就要可以做到」）══════════════
     把剩下的 6 個也接進來。做法跟前面 7 個一樣：**聊天室不自己生內容**，
     它只負責聽懂要做哪一件事、把參數掏出來，然後把對應的畫面開起來、欄位填好。
     ⚠ 這一點是刻意的——生成的程式只有一份，聊天室走的跟按按鈕走的是同一條路，
       所以不會出現「用講的生出來的東西跟用按的不一樣」（v520 就是這樣漏了一個單元）。 */
  guided:    { zh: '分段閱讀', ico: '📑', need: 'text', where: 'editor' },
  exampaper: { zh: '出一份新考卷', ico: '📝', need: 'side', where: 'editor' },
  /* v561：跟 AI 一來一往出一份有配分的大考考卷（他說考哪些字／文法／文章，AI 擬草稿，他再提意見） */
  examdraft: { zh: '跟 AI 出大考考卷', ico: '🗣', need: '', where: 'editor' },
  tense:     { zh: '五大時態題庫出題', ico: '🎞', need: '', where: 'editor' },
  review:    { zh: '排一份複習到別週', ico: '🔁', need: 'group', where: 'editor' },
  group:     { zh: '整組操作', ico: '📦', need: 'group', where: 'editor' },
  marking:   { zh: '申論批改', ico: '📋', need: '', where: 'dash' },
  /* ══ v533（Alan：「把哪一週的內容複製到哪裡、合併哪些單字卡、合併之後再出題、
     我需要多少題目」）══ 前面兩個以前**整個網站都做不到**，不只是聊天室叫不動。 */
  copyweek:  { zh: '整週內容複製到別週', ico: '🗓', need: 'toWeek', where: 'editor' },
  merge:     { zh: '合併單字再出題', ico: '🧩', need: 'groups', where: 'editor' },
  /* ══ v534（Alan 又加的五件）══════════════════════════════════════ */
  assign:    { zh: '設定作業期限', ico: '📌', need: 'group', where: 'editor' },
  notify:    { zh: '發 LINE 公告', ico: '📢', need: 'text', where: 'dash' },
  /* ══ v547（Alan：「聽你的」——查詢類最值得，其次是改固定課表）══════════
     query    ＝直接**回答**問題（不是開畫面）。數字一律由程式算，AI 只負責聽懂在問什麼。
     timetable＝改固定課表的某一堂（星期幾／幾點到幾點）。 */
  query:     { zh: '直接回答問題', ico: '🔎', need: '', where: 'chat' },
  timetable: { zh: '改固定課表', ico: '🗓', need: 'student', where: 'dash' },
  /* ══ v548（Alan：「接續做」——v547 沒做完的那幾項）══════════════════
     remind＝把「這週沒做完」的孩子**選好**在 LINE 提醒那一頁（送出由他按，這是會響家長手機的東西）
     stars ＝給／扣一位孩子的星星　roster＝停用／恢復／新增學生　unit＝改／刪**單一個**單元 */
  remind:    { zh: '提醒沒做完的家長', ico: '🔔', need: '', where: 'dash' },
  stars:     { zh: '給／扣星星', ico: '⭐', need: 'student', where: 'chat' },
  roster:    { zh: '學生名單', ico: '👥', need: '', where: 'chat' },
  unit:      { zh: '改／刪單一個單元', ico: '✏️', need: 'group', where: 'editor' },
  /* ══ v592：v591 做的兩個工具也叫得動（一樣只開畫面、填好，按下去還是他按）══ */
  compose:   { zh: '組合複習／模擬考', ico: '📚', need: '', where: 'editor' },
  qmove:     { zh: '搬題目到別的單元', ico: '↔', need: 'group', where: 'editor' },
};

/* ══ 📌 v521：出完順手指派 ══════════════════════════════════════════════
   Alan：「出完順手指派」——那是他每天都在做、最機械的一步。
   ⚠ **日期一律由程式算**，AI 只負責回一個受控的詞。
     模型算日期常常差一天（時區、週幾的定義），而「到期日差一天」
     家長跟小孩都會被影響。這裡跟 lessonISO 一樣用本地時間，絕不用 toISOString。 */
const ASK_DUE_WORDS = ['none', 'today', 'tomorrow',
  'this-mon', 'this-tue', 'this-wed', 'this-thu', 'this-fri', 'this-sat', 'this-sun',
  'next-mon', 'next-tue', 'next-wed', 'next-thu', 'next-fri', 'next-sat', 'next-sun'];
const _ASK_DOW = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
function askDueDate(hint, now) {
  const h = String(hint || '').trim().toLowerCase();
  const base = now instanceof Date ? new Date(now) : new Date();
  base.setHours(0, 0, 0, 0);
  if (!h || h === 'none') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(h)) return h;              // 他直接講了日期
  if (h === 'today') return lessonISO(base);
  if (h === 'tomorrow') { base.setDate(base.getDate() + 1); return lessonISO(base); }
  const plus = /^\+(\d{1,2})d$/.exec(h);
  if (plus) { base.setDate(base.getDate() + Math.min(60, +plus[1])); return lessonISO(base); }
  const wk = /^(this|next)-(sun|mon|tue|wed|thu|fri|sat)$/.exec(h);
  if (wk) {
    const want = _ASK_DOW[wk[2]];
    if (wk[1] === 'this') {
      /* 「這週三」如果今天已經是週三或更後面，指的是**下一個**週三——
         不是今天，也不是上週。差一天就是作業到期日錯一天。 */
      let add = (want - base.getDay() + 7) % 7;
      if (add === 0) add = 7;
      base.setDate(base.getDate() + add);
      return lessonISO(base);
    }
    /* 🔴 v535（實測抓到）：「下週一」本來是算成「接下來那個週一再加七天」——
       今天是週三時會變成 11/02，但他說的是 **10/26**，整整差一週。
       作業到期日晚一週，小孩就是晚一週才寫。
       → 「下週X」＝**下一個日曆週（週一起算）的那一天**，這樣：
         今天週三 → 下週一 = 10/26、下週五 = 10/30、下週三 = 10/28
       ⚠ 那個星期幾如果這週已經過了，「這週X」與「下週X」會指到同一天
         （今天週三說「這週一」跟「下週一」都是 10/26）——那是對的，
         中文本來就這樣講。 */
    const mondayDelta = (8 - base.getDay()) % 7 || 7;   // 到「下一個週一」要幾天
    const nextMon = new Date(base);
    nextMon.setDate(nextMon.getDate() + mondayDelta);
    nextMon.setDate(nextMon.getDate() + ((want + 6) % 7));   // 週一=0、週二=1…週日=6
    return lessonISO(nextMon);
  }
  return '';
}
/* 沒特別講時的預設：**這個週日**（大部分作業都是一週）。
   🔴 v535（實測抓到）：本來寫成 askDueDate('next-sun') ＝下下個週日，
     但按鈕那條路（QuickSetModal）用的是「這個週日」——
     **用講的跟用按的差了一整週**。兩條路一定要給同一個答案。 */
function askDueDefault(now) {
  const d = now instanceof Date ? new Date(now) : new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return lessonISO(d);
}

/* 一鍵出單字真的做得出來的題型（跟 components-editor.jsx 的 QS_KINDS 同一份 id）。
   ⚠ 這裡寫死是為了程式驗得到——AI 自己發明的 id 丟進 qsBuildItems 會安靜地少一個單元。 */
const ASK_VOCAB_KINDS = ['flashcard', 'def-match', 'spelling', 'quiz', 'fillblank', 'story', 'sense'];

const ASK_SYS = `You are the assistant inside a Taiwanese one-on-one English tutor's own teaching website.
He talks to you in Traditional Chinese. Your ONLY job is to work out WHICH of his existing tools he wants
and pull the parameters out of what he typed or pasted. You never write the exercises yourself.

The tools:
  vocab     — make a full vocabulary set (flashcards, quiz, matching, cloze, dictation…) from a WORD LIST.
  wordstudy — make a Word Study worksheet from a TOPIC like "prefixes mis-, en-, & em-" or "-VCe words".
  grammar   — make an interactive grammar lesson + practice from a worksheet's TEXT or PHOTO.
  reading   — make reading-comprehension questions from a PASSAGE.
  exam      — turn PHOTOS of a printed exam paper into an interactive exam.
  lesson    — write today's lesson record for ONE named student.
              🔴 If he told you WHAT he taught, put it in "text" — that is the whole point of
              the request. Keep his own wording and his own structure (中師 / 外師 on
              separate lines, the numbered reading skills as he numbered them). Drop only the
              chatty opening ("今天Nick我的上課內容是:"). Never summarise, never translate,
              never add a topic he did not teach.
  weak      — look at ONE named student's mistakes and make targeted practice.
  guided    — split a LONG passage into chunks, question after each chunk (分段閱讀).
  examdraft — draft a SCORED exam paper (100 points, sections, hand-in-then-score) together with him,
              from what HE says is on the test: words, grammar points, a passage ("這次大考考這幾個字…",
              "幫我出一份大考考卷"). Put EVERYTHING he said about the content in "text", verbatim.
              Use this — not "exampaper" — whenever he describes the content himself.
  exampaper — build a NEW practice exam from the words/topics of the last few weeks (考前複習包).
              Only when he did NOT say what is on it and wants it taken from the school schedule.
              He says which teacher's side: "外師" = it, "中師" = lt.
  tense     — open the five-tenses question bank generator (only grades that have that track).
  review    — take an EXISTING group of exercises and make a DIFFERENT set from the same words,
              for another week ("把 Barbed Wire Baseball 排一份複習到第 9 週").
  group     — do something to a whole EXISTING group: copy / move it to another week,
              add one more exercise to it, RENAME it, or delete it.
              Renaming is common right after merging several units — the merged name is the old
              names joined together and he wants something short
              ("把那組改名叫 Unit 1–3 期中複習").
  marking   — open the marking screen for the written (申論) answers.
  copyweek  — copy EVERYTHING in one week to another week ("把第 7 週的內容複製到第 9 週").
  merge     — collect the words from SEVERAL existing groups (or several weeks), merge them into
              one list (duplicates removed) and make a new set from it
              ("把 Unit 1 跟 Unit 2 的單字卡合併起來再出一份").
  assign    — set (or clear) the homework deadline on an EXISTING group
              ("Barbed Wire Baseball 那組設成下週三到期").
  notify    — send a LINE announcement to parents
              ("跟家長說這週三停課一次" / "跟 G4 的家長說…").
  query     — he is ASKING a question and wants the ANSWER, not a screen.
              "qtype" is exactly one of:
                unfinished（這週誰還沒做完／誰沒交）
                notstarted（誰這週完全沒開始）
                student   （某一位學生這週做得怎麼樣——needs "student"）
                mistakes  （某一位學生目前錯題最多的是哪些——needs "student"）
              🔴 You do NOT answer. You only pick the qtype; the website computes the numbers.
              If he wants you to MAKE practice from the mistakes ("針對 Nick 的弱點出練習"),
              that is "weak", not "query". Asking WHAT / WHO / HOW MANY ＝ query.
              A grade ("G4 誰沒做完") goes in "gradeId".
  remind    — get the parents of students who have NOT finished this week's work ready to be
              reminded on LINE ("提醒這週沒做完的人" / "提醒 G4 沒做完的家長" / "提醒 Nick 的家長").
              🔴 You never send anything. The website only selects the right children on the
              reminder screen and HE presses send. "gradeId" limits to one grade; "student" to one
              child (leave both empty for everyone who is unfinished). Put any extra line he wants
              in the message in "note", in his own words.
  stars     — give or take away stars for ONE student ("Nick 加 10 顆星星" / "扣 Eric 5 顆").
              "student" = who; "amount" = a signed whole number (+10, -5); "note" = the reason
              he gave ("上課表現好"), else "". Never invent an amount he did not say.
  roster    — change the student list. "rop" is exactly one of: deactivate（停用）activate（恢復）
              add（新增）. For add, "student" = the child's name, "newEmail" = the Google account
              he gave, "gradeId" = the grade if he said. Never invent an email.
  unit      — rename or delete ONE single exercise (not a whole set). "group" = the exercise's
              title as he said it; "op" = rename（改名）or delete（刪掉）; for rename put the NEW
              title in "title". If he is talking about the whole set of exercises, use "group".
  timetable — change ONE student's regular weekly lesson slot in the fixed timetable
              ("Nick 週三改成 17:30" / "把 Eric 週二的課改到週四 18:00 到 19:30").
              "student" = who; "fromDay" = the weekday he is moving FROM (0=日…6=六, -1 if he
              did not say); "toDay" = the weekday it becomes (-1 if unchanged);
              "start"/"end" = new times as "HH:MM" 24-hour ("" if he did not say).
              If he only gave a start time, leave "end" empty — the website keeps the length.
              🔴 This is the PERMANENT weekly slot. If he said it is only for ONE time
              ("這週三改成週四" / "下週一那堂換時間"), set "once": true — the website will say it
              cannot do a one-time change yet. If you cannot tell, use "unknown" and ask:
              "是固定課表都改，還是只改這一次？".
  compose   — build a new review / mock-exam set by picking existing exercises from DIFFERENT weeks
              and copying them into one week ("把第 1 到 3 週的測驗組成期中複習" / "把 Unit 1 跟 Unit 3
              那兩組放到新的一週"). "weeks" = week numbers he named; "groups" = group names if he
              named specific ones (leave empty = everything in those weeks); "toWeek" = the target
              week number if he said one, 0 = make a NEW week; "title" = the name for the new week
              or the group name ("期中複習"); "due" as usual. You never copy anything — the website
              opens the picker with his choices ticked and HE presses the button.
  qmove     — move (or copy) some QUESTIONS from one exercise into another exercise of the same kind
              ("Unit 1 測驗的第 2、3 題搬到 Unit 2 測驗"). "group" = the SOURCE exercise's title;
              "toGroup" = the DESTINATION exercise's title; "qnums" = the question numbers as he said
              them (1-based list); "qall": true if he said all of them; "toWeek" = the week number
              of the destination if it is another week, else 0; "copy": true only if he said copy
              ("複製"), false for move. If he did not say which questions, leave qnums empty and set
              intent "unknown" asking which ones. This is about single questions, not whole exercises:
              moving a whole exercise is "unit"/"group".

Rules:
- "intent" MUST be exactly one of: vocab wordstudy grammar reading exam lesson weak
  guided exampaper examdraft tense review group marking copyweek merge assign notify query timetable remind stars roster unit compose qmove unknown
- "side": for exampaper, and for vocab / merge when he says whose vocabulary it is. "it" if he said 外師/IT,
  "lt" if he said 中師/LT. If he did not say, "". (中師單字 is its own category on the website.)
- "group": the name of the existing group he is talking about, copied exactly
  (usually a unit title like "Barbed Wire Baseball — Part 2"). Only for review / group.
- "op": ONLY for intent "group". One of:
    copy（沿用到別週）move（搬過去＝搬到別的一週）again（再出一份）rename（改名字）delete（刪掉）
    recat（換類別＝同一週內，把整組搬到另一個類別，例如「把外師單字那組移到中師單字」）
  For "recat", put the target category in "toCat": one of
    vocab（外師單字）ltvocab（中師單字）grammar（文法）word（字彙學習／字根字首）reading（閱讀寫作）mock（綜合考卷）
  If he did not say which category, use op "recat" and leave "toCat" empty — the website asks.
  For "rename", put the NEW name in "title", exactly as he said it. If he asked to rename
  but did not say the new name, use op "rename" and leave "title" empty — the website asks.
- "toWeek": when he named a target week, the number only ("第 9 週" → 9). Otherwise 0.
- "fromWeek": ONLY for copyweek, the SOURCE week number. If he did not say one, 0
  (the website then uses the week he is looking at).
- "groups": ONLY for merge. The names of the groups he wants merged, copied exactly, as a list.
  If he said whole weeks instead ("第 5 到第 7 週的單字"), leave groups empty and put the
  week numbers in "weeks" instead.
- "weeks": ONLY for merge, a list of week NUMBERS when he named weeks rather than groups.
- "nQ": how many questions / words he asked for ("出 10 題就好", "只要 12 個字").
  0 when he did not say. This trims the list; it never invents extra words.
- "target": ONLY for notify. "all"（全班）/ "grade"（某個年級）/ "students"（指定的孩子）.
  Default "all" when he did not say.
- "gradeId": ONLY for notify with target "grade" — g1…g6, copied from what he said.
- 🔴 For "notify", put the ANNOUNCEMENT HE WANTS SENT in "text", written the way a parent
  should read it. Do NOT add anything he did not say — no greetings he did not write,
  no times he did not give. He will see it and press send himself.
- "group" also works when he names ONE unit instead of a whole group
  ("Barbed Wire Baseball 的單字卡再加幾種題目") — just copy the name he said.
- For "exampaper", anything he said the paper must contain goes in "note", in his own words
  ("要包含現在完成式跟比較級，閱讀那一段用動物的主題").
- If you are not sure, use "unknown" and put ONE short Traditional-Chinese question in "ask".
  Guessing wrong costs him ten minutes of proofreading before he notices, so ASK.
- "words": only when he gave an actual word list. Each: {"term":"...","zh":"...(if he gave it)"}
  Never invent words he did not give. If he only named a unit ("Barbed Wire Baseball"), leave words empty
  and set intent "unknown" with ask "要出哪幾個單字？貼給我就好".
- "topic": the Word Study focus, copied in English exactly as he wrote it.
- "text": the passage / worksheet text he pasted, copied verbatim. Never summarise or rewrite it.
  For intent "lesson" this is WHAT HE TAUGHT TODAY, in his own words — see the tool note above.
- "title": a short unit name, in the language he used. If he did not say one, leave it "".
- "student": the child's name exactly as he typed it (usually an English first name).
- "kinds": ONLY for vocab. Which exercise types he asked for, from exactly these ids:
     flashcard（單字卡） def-match（配對連線） spelling（聽寫） quiz（選擇題）
     fillblank（填空） story（短文填空） sense（字義選擇）
  If he named specific ones ("我只要選擇題和填空") list just those.
  If he did not say, leave it [] — the website will use its own default set.
- "note": any extra instruction he gave about HOW the questions should be ("難一點",
  "多出一些推論題", "例句要跟棒球有關"). Copy his own words. This goes straight to the
  question-writing AI. If he did not ask for anything special, leave it "".
- "nMcq" / "nSa": ONLY for reading, when he said how many ("出 8 題選擇、3 題問答").
  Otherwise 0 and the website uses its defaults.
- "due": when he said the homework is due. ONE of:
    none | today | tomorrow | +3d (any number of days)
    this-mon…this-sun | next-mon…next-sun | or an exact 2026-10-26
  🔴 Do NOT work out the actual date yourself — the website does that. Just pass the word.
  If he did not mention a deadline at all, use "" and the website uses its own default.
  If he said he does NOT want it set as homework ("先不要指派"), use "none".
- "say": one short friendly Traditional-Chinese sentence telling him what you are about to do.
- 🔴 "delete" is the only thing here that throws work away. If he was not clearly asking to delete
  ("把那組刪掉"), do NOT use op "delete" — ask instead.

Output ONLY JSON:
{"intent":"vocab","title":"Barbed Wire Baseball","words":[{"term":"pursued","zh":"追趕"}],
 "topic":"","text":"","student":"","kinds":["quiz","fillblank"],"note":"例句要跟棒球有關",
 "nMcq":0,"nSa":0,"ask":"","say":"好，我用這 8 個字出選擇題和填空。"}`;

/* 程式驗：AI 說的每一件事都要對得上真實的東西，對不上就降級成「我不確定」。 */
function askVerify(got, { categories = [], roster = [], nImages = 0 } = {}) {
  const o = got || {};
  const intent = ASK_JOBS[o.intent] ? o.intent : 'unknown';
  const words = (Array.isArray(o.words) ? o.words : [])
    .map(w => ({ term: String((w && w.term) || '').trim(), zh: String((w && w.zh) || '').trim() }))
    /* ⚠ 只收看起來真的是英文單字的——模型偶爾會把句子或中文塞進來，
       那種丟進 qsBuildItems 會生出一堆壞題目（單字卡正面出現一整句話）。
       ⚠ 允許空白是為了 "ice cream" 這種，但**最多兩個字**——
         第一版寫成 [A-Za-z '-]{0,38} 就把 "I ran fast today" 整句收進去了。 */
    .filter(w => /^[A-Za-z][A-Za-z'-]{0,19}( [A-Za-z][A-Za-z'-]{0,19})?$/.test(w.term));
  const out = {
    intent, words,
    title: String(o.title || '').trim().slice(0, 80),
    topic: String(o.topic || '').trim().slice(0, 120),
    text: String(o.text || '').trim().slice(0, 12000),
    student: String(o.student || '').trim().slice(0, 40),
    say: String(o.say || '').trim().slice(0, 120),
    ask: String(o.ask || '').trim().slice(0, 120),
    /* v518：題型只能是真的存在的那幾種——模型自己發明一個 'matching2' 之類的，
       丟進 qsBuildItems 只會安靜地少一個單元（v473 的教訓）。 */
    kinds: (Array.isArray(o.kinds) ? o.kinds : [])
      .map(k => String(k || '').trim())
      .filter(k => ASK_VOCAB_KINDS.indexOf(k) >= 0),
    note: String(o.note || '').trim().slice(0, 600),
    nMcq: Math.max(0, Math.min(20, +o.nMcq || 0)),
    nSa: Math.max(0, Math.min(10, +o.nSa || 0)),
    /* v521：只收受控的詞或 +Nd 或明確日期；其他一律當「沒講」，由畫面用預設。 */
    due: (() => {
      const d = String(o.due || '').trim().toLowerCase();
      if (ASK_DUE_WORDS.indexOf(d) >= 0) return d;
      if (/^\+\d{1,2}d$/.test(d)) return d;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      return '';
    })(),
    /* v531 新增的三個參數，一樣全部夾回受控的值——
       模型亂填一個 side 或 op，程式照著做就會動到不該動的東西。 */
    side: (o.side === 'it' || o.side === 'lt') ? o.side : '',
    group: String(o.group || '').trim().slice(0, 120),
    op: ['copy', 'move', 'again', 'rename', 'delete', 'recat'].indexOf(String(o.op || '').trim()) >= 0
      ? String(o.op).trim() : '',
    /* v570：換類別的目標——只收網站真的有的類別 id（亂填就當沒講，網站會問） */
    toCat: ['vocab', 'ltvocab', 'grammar', 'word', 'reading', 'mock'].indexOf(String(o.toCat || '').trim()) >= 0
      ? String(o.toCat).trim() : '',
    toWeek: Math.max(0, Math.min(40, Math.round(+o.toWeek || 0))),
    fromWeek: Math.max(0, Math.min(40, Math.round(+o.fromWeek || 0))),
    /* ⚠ 一樣夾回受控值：組名最多 8 個、週次最多 12 週、題數最多 60。
       模型回一個 500 題，程式照做就會把瀏覽器卡死。 */
    groups: (Array.isArray(o.groups) ? o.groups : [])
      .map(g => String(g || '').trim()).filter(Boolean).slice(0, 8),
    weeks: (Array.isArray(o.weeks) ? o.weeks : [])
      .map(n => Math.round(+n || 0)).filter(n => n > 0 && n <= 40).slice(0, 12),
    nQ: Math.max(0, Math.min(60, Math.round(+o.nQ || 0))),
    target: ['all', 'grade', 'students'].indexOf(String(o.target || '').trim()) >= 0
      ? String(o.target).trim() : 'all',
    gradeId: /^g[1-6]$/.test(String(o.gradeId || '').trim().toLowerCase())
      ? String(o.gradeId).trim().toLowerCase() : '',
    /* v547：全部夾回受控值——模型亂填一個 qtype 或 25:99，程式照做就會算錯、存錯。 */
    qtype: ['unfinished', 'notstarted', 'student', 'mistakes'].indexOf(String(o.qtype || '').trim()) >= 0
      ? String(o.qtype).trim() : '',
    fromDay: (() => { const n = Math.round(+o.fromDay); return (n >= 0 && n <= 6) ? n : -1; })(),
    toDay:   (() => { const n = Math.round(+o.toDay);   return (n >= 0 && n <= 6) ? n : -1; })(),
    start: (() => { const t = String(o.start || '').trim(); return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t) ? t.padStart(5, '0') : ''; })(),
    end:   (() => { const t = String(o.end || '').trim();   return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t) ? t.padStart(5, '0') : ''; })(),
    once: o.once === true,
    /* v592：搬題目／組合複習的參數——全部夾回受控值 */
    toGroup: String(o.toGroup || '').trim().slice(0, 120),
    qnums: (Array.isArray(o.qnums) ? o.qnums : []).map(n => Math.round(+n || 0)).filter(n => n >= 1 && n <= 200).slice(0, 40),
    qall: o.qall === true,
    copy: o.copy === true,
    /* v548：金額只收整數且上限 200——模型寫成 10000 或 NaN，程式照做就會把某個孩子的星星弄壞。 */
    amount: (() => { const n = Math.round(+o.amount); return (isFinite(n) && Math.abs(n) <= 200) ? n : 0; })(),
    rop: ['deactivate', 'activate', 'add'].indexOf(String(o.rop || '').trim()) >= 0 ? String(o.rop).trim() : '',
    newEmail: (() => { const e = String(o.newEmail || '').trim().toLowerCase();
                       return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ''; })(),
  };
  /* 認學生：名字要真的在名單裡，不然「幫 Jack 寫紀錄」會安靜地對到空氣。 */
  if (out.student && !(out.intent === 'roster' && out.rop === 'add')) {
    const hit = (roster || []).find(r => {
      const n = String((r && r.name) || '').toLowerCase();
      return n && (n === out.student.toLowerCase() || n.split(/\s+/)[0] === out.student.toLowerCase());
    });
    out.email = hit ? hit.email : '';
    if (!hit) {
      /* v592（Alan：「打錯一個字就沒辦法了，真的 AI 應該可以理解，或是至少問是不是哪一個」）
         以前這裡直接放棄。現在：找長得像的，列成按鈕問「你是說…？」。
         ⚠ 還是不替他選——Elroy 跟 Elory 只差一個字母位置，猜錯會記到別的孩子身上；
           列出來讓他點一下，才是又聰明又安全。
         raw＝模型原本的回答，他點選之後用同一份重新驗一次（不另寫一套流程）。 */
      const opts = askSuggest(out.student, (roster || []).map(r => r && r.name));
      out.intent = 'unknown';
      if (opts.length) {
        out.dym = { field: 'student', wrong: out.student, options: opts, raw: o };
        out.ask = `名單裡沒有「${out.student}」——你是說${opts.length > 1 ? '哪一位？' : ` ${opts[0]} 嗎？`}`;
      } else out.ask = `名單裡找不到「${out.student}」——是哪一位？`;
    }
  }
  /* 該有的東西沒有 → 不要硬做，改成問他。
     ⚠ 文法與考卷可以只給照片不給文字——照片本身就是內容（v428 讀作業、v516 讀考卷）。 */
  /* v531：整組操作沒說要做什麼就先問清楚——「把那組弄一下」不能自己猜。 */
  if (out.intent === 'group' && !out.op) {
    out.intent = 'unknown';
    out.ask = `「${out.group || '那一組'}」要做什麼？沿用到別週／搬到別週／換類別／再出一份／刪掉`;
  }
  /* v547：query 沒說問什麼、或該有學生卻沒有 → 問，不要亂猜。 */
  if (out.intent === 'query') {
    if (!out.qtype) {
      out.intent = 'unknown';
      out.ask = out.ask || '想查什麼？「這週誰還沒做完」、「Nick 這週做得怎麼樣」、「Nick 錯最多的是哪些」我都查得到。';
    } else if ((out.qtype === 'student' || out.qtype === 'mistakes') && !out.student) {
      out.intent = 'unknown';
      out.ask = '要查哪一位學生？';
    }
  }
  if (out.intent === 'stars') {
    if (!out.amount) { out.intent = 'unknown'; out.ask = `要給 ${out.student || '他'} 幾顆？（加或扣都可以，一次最多 200）`; }
  }
  if (out.intent === 'roster') {
    if (!out.rop) { out.intent = 'unknown'; out.ask = '要做什麼？停用／恢復／新增學生'; }
    else if (out.rop === 'add' && (!out.student || !out.newEmail)) {
      out.intent = 'unknown'; out.ask = '新增學生要有名字跟他的 Google 帳號（email），兩個都給我。';
    } else if (out.rop !== 'add' && !out.email) {
      out.intent = 'unknown'; out.ask = out.ask || '要停用／恢復哪一位？';
    }
  }
  if (out.intent === 'unit' && ['rename', 'delete'].indexOf(out.op) < 0) {
    out.intent = 'unknown'; out.ask = `「${out.group || '那個單元'}」要改名還是刪掉？`;
  }
  if (out.intent === 'unit' && out.op === 'rename' && !out.title) {
    out.intent = 'unknown'; out.ask = `「${out.group}」要改叫什麼？`;
  }
  if (out.intent === 'compose' && !out.weeks.length && !out.groups.length) {
    out.intent = 'unknown'; out.ask = out.ask || '要從哪幾週（或哪幾組）挑？例如「第 1 到 3 週」。';
  }
  if (out.intent === 'qmove') {
    if (!out.toGroup) { out.intent = 'unknown'; out.ask = out.ask || `要搬到哪一個單元？`; }
    else if (!out.qnums.length && !out.qall) {
      out.intent = 'unknown'; out.ask = out.ask || `要搬「${out.group}」的第幾題？（例如「第 2、3 題」，或說全部）`;
    }
  }
  if (out.intent === 'timetable' && !out.once && out.toDay < 0 && !out.start && !out.end) {
    out.intent = 'unknown';
    out.ask = `${out.student || '他'}要改成星期幾、幾點？`;
  }
  const need = (ASK_JOBS[out.intent] || {}).need;
  if (need === 'words' && !out.words.length) { out.intent = 'unknown'; out.ask = out.ask || '要出哪幾個單字？直接貼給我就好。'; }
  if (need === 'topic' && !out.topic)        { out.intent = 'unknown'; out.ask = out.ask || '這次的 Word Study 主題是什麼？'; }
  if (need === 'text' && !out.text && !nImages) { out.intent = 'unknown'; out.ask = out.ask || '把文章或作業的內容貼給我，或拍一張照片。'; }
  if (need === 'images' && !nImages)         { out.intent = 'unknown'; out.ask = out.ask || '把考卷拍給我——一頁一張，整頁入鏡。'; }
  if (need === 'student' && !out.email)      { out.intent = 'unknown'; out.ask = out.ask || '要幫哪一位學生？'; }
  if (need === 'side' && !out.side)          { out.intent = 'unknown'; out.ask = out.ask || '要出外師還是中師那一份？'; }
  if (need === 'group' && !out.group)        { out.intent = 'unknown'; out.ask = out.ask || '是哪一組？把那一組的名字講給我就好。'; }
  if (need === 'toWeek' && !out.toWeek)      { out.intent = 'unknown'; out.ask = out.ask || '要複製到第幾週？'; }
  /* 📢 公告：他要發的字就是要送到家長手機上的東西——空的不可以放行。 */
  if (out.intent === 'notify' && out.target === 'grade' && !out.gradeId) {
    out.intent = 'unknown'; out.ask = '要發給哪一個年級？';
  }
  if (need === 'groups' && !out.groups.length && !out.weeks.length) {
    out.intent = 'unknown';
    out.ask = out.ask || '要合併哪幾組的單字？講組名或週次都可以。';
  }
  return out;
}

/* 聽一句話（可以帶截圖）。回傳驗過的結果。 */
async function aiRouteCommand({ text = '', images = [], categories = [], roster = [], history = [] } = {}) {
  const imgs = (images || []).slice(0, 4);
  const content = imgs.map(im => ({ type: 'image',
    source: { type: 'base64', media_type: im.media_type || 'image/jpeg', data: im.data } }));
  const names = (roster || []).map(r => r && r.name).filter(Boolean).slice(0, 40).join('、');
  const hist = (history || []).slice(-4).map(h => `${h.me ? '老師' : '你'}：${h.text}`).join('\n');
  content.push({ type: 'text', text:
    (names ? `（他的學生名單：${names}）\n` : '')
    + (hist ? `（前幾句）\n${hist}\n\n` : '')
    + (imgs.length ? `（他附了 ${imgs.length} 張圖，先看圖再讀下面這句話）\n` : '')
    + '老師說：\n' + String(text || '').trim() });

  let got = null;
  try {
    got = await _aiAsk({ model: GN_READ_MODEL, max_tokens: 3000, system: ASK_SYS,
      messages: [{ role: 'user', content }] },
      (d) => {
        const t = (d?.content || []).filter(b => b && b.type === 'text').map(b => b.text).join('')
          || d?.content?.[0]?.text || '';
        const o = _gnSalvageJson(_aiStripFence(t));
        return (o && typeof o === 'object') ? o : null;
      }, 60000);
  } catch (e) {
    return { intent: 'unknown', ask: '我這邊連不上，等一下再說一次。', words: [], title: '', topic: '', text: '', student: '', say: '' };
  }
  return askVerify(got, { categories, roster, nImages: imgs.length });
}

/* ══ v592 打錯字也聽得懂：找「長得像的」名字 ═══════════════════════════
   Alan：「打錯一個字 AI 助手就沒辦法了…真的 AI 應該可以理解，或是至少問是不是哪一個」。
   ⚠ 這個函式**只列候選，不替他選**：名單裡真的有 Elroy 跟 Elory（只差兩個字母對調），
     自動選最像的會把課記到別的孩子身上而且不報錯——所以呼叫端一律拿去問「你是說…？」。
   比對：忽略大小寫與標點；跟「整個名字」「名字裡的每一個詞」「名字開頭同長度那一段」各算一次
   編輯距離（換字、少打、多打、相鄰兩字對調都算 1），取最小；允許的距離隨長度放寬。
   中文也適用（「期末複習」→「期中複習」差一個字）。 */
function _askNormName(t) { return String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
function _askEditDist(a, b) {
  const al = a.length, bl = b.length;
  if (!al) return bl; if (!bl) return al;
  const d = [];
  for (let i = 0; i <= al; i++) { d[i] = [i]; }
  for (let j = 0; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) for (let j = 1; j <= bl; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[al][bl];
}
function askSuggest(query, names, max) {
  const q = _askNormName(query);
  if (!q) return [];
  const allow = q.length <= 2 ? 0 : q.length <= 5 ? 1 : q.length <= 9 ? 2 : 3;
  const seen = new Set(), scored = [];
  (names || []).forEach(raw => {
    const orig = String(raw || '').trim();
    const n = _askNormName(orig);
    if (!n || seen.has(n)) return;
    seen.add(n);
    if (n === q) return;                                   // 完全一樣就不是「打錯」，不列
    const parts = n.split(' ').filter(Boolean);
    let best = _askEditDist(q, n);
    parts.forEach(p => { best = Math.min(best, _askEditDist(q, p)); });
    if (n.length > q.length) best = Math.min(best, _askEditDist(q, n.slice(0, q.length)) + 1);   // 打到一半
    const contains = (q.length >= 3 || (q.length >= 2 && /[\u4e00-\u9fff]/.test(q))) && (n.indexOf(q) >= 0 || q.indexOf(n) >= 0);
    if (best <= allow || contains) scored.push({ orig, score: contains && best > allow ? allow + 0.5 : best, len: Math.abs(n.length - q.length) });
  });
  scored.sort((a, b) => a.score - b.score || a.len - b.len || (a.orig < b.orig ? -1 : 1));
  return scored.slice(0, max || 4).map(x => x.orig);
}

Object.assign(window, { ASK_JOBS, ASK_SYS, ASK_VOCAB_KINDS, ASK_DUE_WORDS,
  askDueDate, askDueDefault, askVerify, aiRouteCommand, askSuggest });

/* ══════════════════════════════════════════════════════════════════════════
   v516 📸 拍考卷照片 → 變成互動版
   ──────────────────────────────────────────────────────────────────────────
   Alan 手上有一疊考過的 Formative。v515 做好了「考卷」這個容器，
   這一版負責把紙變成資料。整套讀照片的機制沿用 v428~v430 的 aiReadGrammarSheet：
     · 一張照片一個請求、全部同時送 → 再長也不會被 max_tokens 切斷（v430 的教訓）
     · 某一頁讀不到只少那一頁，會告訴老師是哪一張，不是整份「讀不懂」

   🔴 這份照片跟作業照片最大的不同：**上面滿滿都是學生的手寫答案與老師的紅筆**。
      所以提示詞要很明確：讀印刷的題目，不要讀手寫的；
      而且**不要抓學生姓名與分數**——那是別人家小孩的成績，沒有理由進我們的資料庫。

   ⭐ 讀完不另外寫驗證：直接丟進 v515 的 examWarnings()。
      同一件判斷只留一份——老師手打的卷子跟 AI 讀的卷子吃同一組檢查。
   ══════════════════════════════════════════════════════════════════════════ */

const EXAM_READ_SYS = `You convert a photo of a printed English exam paper (Kang Chiao / 康橋 elementary
"Formative") into JSON so it can be re-taken on a website.

🔴 READ THE PRINTED QUESTIONS ONLY.
   These papers have a student's handwritten answers and a teacher's red marks all over them.
   Ignore ALL handwriting and red pen. You are reconstructing the BLANK paper.
🔴 NEVER output the student's name, class or score. Leave them out entirely.

Output ONE page's worth. Keep every English word exactly as printed — never translate, never rewrite.

"parts" may ONLY use these kinds. Anything else goes in "skipped".
  "circle"  — "Read and Circle N <pattern> words" over a passage.
              "check" must be one of: vce | team | digraph | suffix | prefix | diphthong
                 "diphthong sounds /aʊ/ /ɔɪ/" (circle the words) -> "check":"diphthong", "checkArg":"ou ow oi oy". It judges by PRONUNCIATION: ou/ow as in shout, brown = /aʊ/ (same sound); snow, know (/oʊ/) are NOT counted unless checkArg is "ow:long".
              With several patterns, separate them with SPACES in "checkArg": "mis- en- em-".
                 "-VCe words"            -> "check":"vce"
                 "vowel team inside"     -> "check":"team"
                 "digraph"               -> "check":"digraph"
                 "words ending in -ing"  -> "check":"suffix", "checkArg":"-ing"
              "need" = how many they must circle. "passage" = the whole passage, exactly as printed.
  "cloze"   — a word bank + sentences with a blank.
              "bank" = every word in the box.
              🔴 The sentences go in a field called "items" (NOT "sentences", NOT "questions").
              Each item: {"text":"Mark ___ on the test.","answer":"struggled"} — write the blank as ___
              and "answer" = the word from the bank that fits. YOU choose the answer from the bank
              by reading the sentence — do not copy the student's handwriting.
  "quiz"    — multiple choice. 🔴 ONE part holds ALL the questions of that Part, in a
              "questions" ARRAY. Do NOT emit one part per question.
              Each entry: {"q":"...","options":[...in printed order...],"answer":<0-based index>}
              "pts" is the TOTAL for the whole Part (e.g. "/18"), not per question.
              Do not number the questions; the website numbers them.
              If the passage they refer to is printed on the paper, put it in "passage" (the whole text).
  "affix"   — "Make two words using two of the suffixes below, then write a sentence for each."
              "affixes" = every suffix/prefix in the box, written WITH its hyphen: ["-ity","-ty","-ic","-ment"]
              (a prefix is written the other way round: "un-", "mis-").
              "need" = how many words they must make. "minWords" = the minimum sentence length
              if one is printed ("5 or more words" -> 5).
  "usewords"— "Write N sentences using words from the box" where they just USE the word
              (they do NOT build a new word from a suffix — that is "affix").
              "bank" = every word in the box. "need" = how many sentences.
              "minWords" = the printed minimum ("at least six words long" -> 6).
  "genq"    — "Using the story you just read, make two questions (not on the page)".
              "passage" = the story they read. "need" = how many questions.
  "storymap"— a Beginning / Middle / End chart (sometimes drawn as three boxes with arrows).
              "passage" = the text the chart is about.
              "need" = how many sentences per box ("Write 2 sentences per section" -> 2).
  "fixbox"  — "Find the N mistakes and write the corrected words in the boxes" (usually
              capitalization or punctuation). The answer sheet is a ROW OF BOXES, not a rewrite.
              "answers" = the corrected words in the order they appear in the text,
              WITH the correct capital letters: ["Taipei","I","Monday"].
              "passage" = the paragraph exactly as printed (mistakes left in).
  "evidence"— "Use N specific details from the text to explain/support ...".
              "question" = the question they must answer, exactly as printed.
              "passage" = the text the details must come from.
              "need" = how many details. "minWords" = printed minimum sentence length, else 5.
  "essay"   — one long piece of writing (a story, a letter, an opinion paragraph) with ONE prompt.
              "prompt" = the printed writing task, exactly as printed.
              "vocab" = any list of words they are told to use (else []).
              "paras" / "sentsPerPara" = if the paper says "5 paragraphs" / "4 sentences each",
              put 5 and 4. "pts" = the printed total. Add "rubricSet":"writing" when the Kang Chiao
              writing criteria are printed. 🔴 Use "essay", not "short", when it is ONE long piece.
  "order"   — "Number the events 1-5 in the order they happened". The sentences are printed in a
              MIXED order with a blank in front of each. 🔴 "events" = the sentences in the CORRECT
              chronological order (earliest first) — YOU work that out by reading the passage; do not
              copy the order they are printed in. "passage" = the passage they come from if it is on
              the page (else ""). "pts" = the printed total for this part.
  "table"   — a written answer TABLE with column headings and a fixed number of empty rows, e.g. "Find three
              descriptive words or phrases. Write each on the left. Explain what it helps you imagine on the
              right (3 pts. each)". "headers" = the column headings exactly as printed (2 or 3 of them),
              "rows" = how many rows, "passage" = the excerpt the child must look at if one is printed above it
              (else ""). "pts" = rows × points each.
  "draw"    — a blank box where the child must DRAW ("Draw the final scene", "Scene Picture"). "prompt" = the
              printed drawing task exactly as printed, "pts" = its points. NEVER put a drawing box in "short".
  "checkin" — the warm-up at the top: "How are you feeling right now?" + "What is your goal
              for this test?". "goals" = the printed goal choices, exactly as printed.
              "pts" is 0 — it is not scored.
  "short"   — any question the child writes a long answer to. Give "pts" and, if a marking
              rubric is printed, a one-line "rubric".
              🔴 ALWAYS include "questions":[{"q":"<the printed task, exactly as printed>","pts":N}].
              A "Summarize the text / write three important details" task is a "short" with
              "rubricSet":"summary" (see below), even though it is a part of a bigger Part 2.
              🔴 If the printed rubric has the Kang Chiao writing criteria (Content, Details,
              Creativity, Text Structure, Length, Grammar, Vocabulary) add "rubricSet":"writing".
              If it has Explanation / Relevant / Effort, add "rubricSet":"basic" and "rubricMax":N, where N is the
              biggest point value in that criteria table (columns "5 Points ... 0 Points" -> 5).
              🔴 "Read the text below and answer the questions" followed by written answers (e.g. "What is the author's
              purpose? (5pts.)" and "Write one detail from the story ... then explain how it supports ... (15pts.)")
              is ONE "short" part: "passage" = the text, "pts" = the printed total (20), and EVERY written question in
              "questions" with its own "pts". Do NOT use "evidence" for that — "evidence" is only for "use N details".
              🔴 ALWAYS copy the whole reading text into "passage" of the part that says "Read the text below" — the
              text is part of the exam; never leave it out, even when the questions are on the next page.
              🔴 If the text is on THIS page but its questions are on the NEXT page, still output the part:
              "kind":"short", its title, "pts", the "passage", and "questions":[] (empty). The next page then outputs the
              questions as a "short" part with no title and the passage left out.
              🔴 A reading text that comes AFTER a quiz belongs to the part printed right above it ("Read the text below"),
              NOT to the multiple-choice quiz before it. Put the passage in THAT part.
              If it is a "Summary Writing Rubric" (details from the beginning / middle / end, chronological
              order, complete sentences, own words), add "rubricSet":"summary".

If a page shows ONLY a marking-criteria table (rows like Explanation / Relevant / Effort, columns "5 Points ... 0 Points"),
it has no sections: output "sections":[] and a top-level "rubricMax":N (the biggest point value, e.g. 5).

🔴 ANSWER KEY PAGE — a page titled "Answer Key" / "Answers" (it lists the right answers; it is NOT an exam page).
It has no sections: output "sections":[] and an "answerKey" object, copied exactly as printed — never work answers out yourself:
  "answerKey":{"mc":[{"n":1,"letter":"D"},{"n":2,"letter":"B"}],
               "written":[{"n":4,"sample":"<the Sample Answer text, exactly as printed>",
                           "others":["<each 'Other acceptable…' line, exactly as printed>"]}],
               "note":"<the Teacher Note text, exactly as printed, else empty>"}
  "n" = the question number printed beside it. A line like "1. D — Keeping Their Eggs Safe" is {"n":1,"letter":"D"}.
  A line like "4. Sample Answer" followed by a paragraph is a "written" entry. If several written questions each have
  a sample answer, give one entry per question number.

A written question that only says "Use evidence from the passage and describe two ... Explain ..." and has lines to
write on is "evidence" (need = 2) — give "question" exactly as printed. Its reading text is usually on ANOTHER page:
leave "passage" empty rather than guessing; the website attaches it.

A page that has ONLY a reading selection (a title, maybe a photo, numbered paragraphs) and says
"Read the selection. Then complete Part 1 and Part 2" has no questions of its own. Do NOT put it in
"skipped". Output it as a section with "parts":[] and a "passage" field holding the whole selection
(include its title as the first line), keeping the Section heading exactly as printed.

PICTURES — "figure": if the page has an ILLUSTRATION, COMIC or PHOTO that belongs to the reading (a picture above or
beside a passage or a question — NOT a logo, border, line or decoration), add it on that section (the one holding the
passage) or on that part:
  "figure":{"box":[x0,y0,x1,y1],"caption":"<the printed caption / photo credit line, or empty>"}
  box = the picture's rectangle as FRACTIONS of the WHOLE image you are looking at: [0,0] is its top-left corner,
  [1,1] its bottom-right. Draw it TIGHT around the picture only (not the caption, not the passage text).
  If there is no such picture, leave "figure" out. Never describe the picture, only locate it.

If a part is still something else, do NOT guess — put a short description in "skipped".

Points: copy the printed numbers ("(4 pts. each)", "/32", "(30%)"). Never invent them.
If a number is not printed, use 0 and let the teacher fill it in.

Output ONLY JSON. Note how ONE quiz part holds SIX questions:
{"title":"Grade 4 Formative 1",
 "sections":[
   {"name":"Section 1: Word Study","pct":30,
    "parts":[{"kind":"circle","title":"Part 2: Read and Circle 10 -VCe words","pts":20,"need":10,
              "check":"vce","checkArg":"","instruction":"","passage":"Captain Jeff was ready ..."}]},
   {"name":"Section 2: Vocabulary","pct":32,
    "parts":[{"kind":"cloze","title":"Part 3: Fill in the blanks","pts":32,
              "bank":["struggled","challenge"],
              "items":[{"text":"Mark ___ on the test.","answer":"struggled"},
                       {"text":"The hill was a hard ___.","answer":"challenge"}]}]},
   {"name":"Section 3: Reading Skill and Comprehension","pct":38,
    "parts":[{"kind":"quiz","title":"Part 4: Color the circle next to the most correct answer.","pts":18,
              "questions":[
                {"q":"What nickname did his sister give him?","options":["Ace","Buzz","Doc"],"answer":1},
                {"q":"Which quality did Buzz worship?","options":["Determination","Sadness","Business"],"answer":0}
              ]}]}
 ],
 "skipped":[]}`;

/* v571 插圖位置：AI 給的 box 是「整張圖的比例」[x0,y0,x1,y1]。夾回 0~1、太小或幾乎整頁都不收
   （整頁＝它根本沒找到圖，裁下來只是把整張考卷當插圖）。 */
function _examFigureOf(f) {
  if (!f || !Array.isArray(f.box) || f.box.length !== 4) return null;
  const b = f.box.map(x => Math.max(0, Math.min(1, +x)));
  if (b.some(x => !isFinite(x))) return null;
  const w = b[2] - b[0], h = b[3] - b[1];
  if (w < 0.08 || h < 0.05 || w * h < 0.02 || w * h > 0.85) return null;
  return { box: b, caption: String(f.caption || '').trim().slice(0, 160) };
}
/* 🔴 v605（Alan 給的 Unseen Reading 考卷：文章＋選擇題＋問答題＋最後一頁「Answer Key」）
   解答頁：選擇題的字母、問答題的參考答案與「其他可接受的證據」。清洗成 { mc:[{n,idx}], written:[{n,sample,others[]}], note }。
   ⚠ 只收長得對的：字母要在 A~H、題號要是正整數；整份什麼都沒有就回 null。 */
function _examCleanKey(k) {
  if (!k || typeof k !== 'object') return null;
  const L = 'ABCDEFGH';
  const mc = (Array.isArray(k.mc) ? k.mc : []).map(x => {
    const n = Math.round(+(x && (x.n != null ? x.n : x.q)));
    const idx = L.indexOf(String((x && (x.letter != null ? x.letter : x.answer)) || '').trim().charAt(0).toUpperCase());
    return (n >= 1 && n <= 99 && idx >= 0) ? { n, idx } : null;
  }).filter(Boolean);
  const written = (Array.isArray(k.written) ? k.written : []).map(x => {
    const n = Math.round(+(x && x.n));
    const sample = String((x && (x.sample || x.answer)) || '').trim().slice(0, 2000);
    const others = (Array.isArray(x && x.others) ? x.others : []).map(o => String(o || '').trim()).filter(Boolean).slice(0, 12);
    return (n >= 1 && n <= 99 && (sample || others.length)) ? { n, sample, others } : null;
  }).filter(Boolean);
  const note = String(k.note || '').trim().slice(0, 600);
  return (mc.length || written.length) ? { mc, written, note } : null;
}
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

/* ══ v607 ② 交卷後的解析（AI 幫選擇題寫「為什麼是這個答案」）══════════════════════════════════
   學生考完只知道對錯，不知道**為什麼**——沒有學到東西。
   ⭐ 每一題要「指得出文章裡的依據」：模型要回 quote（逐字抄文章裡的 3~12 個字），程式驗 quote 真的在文章裡才收；
     抄不到＝它在憑空解釋，這一題不收（寧可沒有解析，也不要一段看似合理的錯誤說明）。
   ⭐ 順便當第二道把關：模型如果認為「老師給的答案」不對，會回 disagree——不寫解析，回報給老師看。
   ⚠ 只做有文章的選擇題（沒有文章就沒有「依據」可以引）。壞掉的呼叫跳過那一題，不擋整份。 */
const _exNorm = (t) => String(t || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
async function examExplain(secs, { onProgress } = {}) {
  const jobs = [];
  (secs || []).forEach((sc, si) => {
    const fallback = ((sc.parts || []).find(x => x.readText || x.passage) || {});
    (sc.parts || []).forEach((pt, pi) => {
      if (pt.kind !== 'quiz') return;
      const passage = String(pt.readText || pt.passage || fallback.readText || fallback.passage || '').trim();
      const qs = (pt.questions || []).map((q, i) => ({ q, i })).filter(({ q }) => !q.explain && (q.options || []).length >= 2);
      if (passage && qs.length) jobs.push({ pt, passage, qs, si, pi });
    });
  });
  const L = 'ABCDEF';
  const added = [], disputed = [];
  let done = 0;
  await pMap(jobs, async (j) => {
    try {
      const body = `PASSAGE:\n${j.passage}\n\nQUESTIONS (with the teacher's correct answer):\n` + j.qs.map(({ q, i }) =>
        `${i + 1}. ${q.q}\n` + q.options.map((o, k) => `   ${L[k]}. ${o}`).join('\n') + `\n   CORRECT: ${L[q.answer]}`).join('\n\n');
      const got = await _aiAsk({
        model: GN_READ_MODEL, max_tokens: 1800,
        system: 'You write answer explanations for Taiwanese 4th-grade English learners after a reading test. For EACH question write ONE or TWO short sentences in Traditional Chinese (at most 70 characters) saying WHY the correct answer is right, pointing at the clue in the passage. ' +
          'Also give "quote": 3 to 12 words copied EXACTLY (same spelling) from the passage — the words that contain the clue. ' +
          'If you are sure the teacher\'s CORRECT answer is wrong, set "disagree":true and say which letter you think is right in "think", and write no explanation. ' +
          'Reply ONLY JSON: {"items":[{"n":1,"explain":"…","quote":"…"},{"n":2,"disagree":true,"think":"B"}]} — "n" is the question number given.',
        messages: [{ role: 'user', content: body }],
      }, (data) => {
        const o = JSON.parse(_aiStripFence((data?.content || []).filter(b => b && b.type === 'text').map(b => b.text).join('') || data?.text || ''));   // 這個模型第一個區塊是 thinking，文字在後面
        return o && Array.isArray(o.items) ? o : null;
      }, 60000);
      const hay = _exNorm(j.passage);
      (got.items || []).forEach(it => {
        const hit = j.qs.find(({ i }) => i + 1 === Math.round(+it.n));
        if (!hit) return;
        if (it.disagree) { disputed.push({ si: j.si, pi: j.pi, i: hit.i, q: hit.q.q, key: L[hit.q.answer], think: String(it.think || '?').toUpperCase().charAt(0) }); return; }
        const explain = String(it.explain || '').trim(), quote = String(it.quote || '').trim();
        const grounded = quote && _exNorm(quote).length >= 8 && hay.indexOf(_exNorm(quote)) >= 0;
        if (!explain || explain.length > 160 || !/[一-鿿]/.test(explain) || !grounded) return;
        hit.q.explain = explain; hit.q.quote = quote;
        added.push(hit.q.q);
      });
    } catch (e) { /* 這一批壞了就跳過，不擋整份 */ }
    done++; if (onProgress) onProgress(done, jobs.length);
  }, 3);
  return { added: added.length, disputed, parts: jobs.length };
}
/* 老師端按鈕用：回傳補好解析的新 sections（不動傳進來的） */
async function aiExplainExam(item, opts) {
  const sections = JSON.parse(JSON.stringify((item && item.sections) || []));
  const r = await examExplain(sections, opts);
  return { sections, ...r };
}

/* 🔴 v606 沒有解答頁時，選擇題的答案是「讀考卷的那個模型」邊讀邊猜的——而且會猜錯。
   實測 Alan 的 Taiwan Biographies（學生版，沒附解答）：Yang 那篇第 2 題「Which statement correctly compares Yang and Johnson?」
   文章明明寫 Yang 跑跳強、Johnson 投擲強，它卻選了「Yang 投擲強」。答案錯的考卷最糟：學生答對還被扣分。
   → 有文章的選擇題（沒有解答頁的），**另外獨立解兩次**（選項順序正著給一次、反著給一次，排除「偏愛某個位置」）。
     兩次都選同一個、而且跟讀卷時選的不一樣 → 改成那個，並明講請老師確認；只有一次不一樣或兩次不一致 → 不動，但提醒。
   ⚠ 解題用的是**只看文章與題目**的獨立呼叫，不是把上一個答案餵給它（不然只是蓋橡皮章）。
   ⚠ 驗算本身壞掉（沒回、格式不對）不擋——跳過那一題。 */
async function _examSolveMC(passage, q, rev) {
  const idx = (q.options || []).map((_, i) => i); if (rev) idx.reverse();
  const L = 'ABCDEF';
  const got = await _aiAsk({
    model: GN_READ_MODEL, max_tokens: 200,
    system: 'You are a careful teacher answering a multiple-choice reading question. Use ONLY the passage. Reply ONLY JSON {"answer":"A"} — one letter.',
    messages: [{ role: 'user', content: `PASSAGE:\n${passage}\n\nQUESTION: ${q.q}\n` + idx.map((oi, k) => `${L[k]}. ${q.options[oi]}`).join('\n') }],
  }, (data) => {
    const txt = data?.content?.[0]?.text || data?.text || '';
    const o = JSON.parse(_aiStripFence(txt));
    const k = L.indexOf(String((o && o.answer) || '').trim().toUpperCase().charAt(0));
    return (k >= 0 && k < idx.length) ? { oi: idx[k] } : null;
  }, 45000);
  return got ? got.oi : -1;
}
async function examVerifyQuiz(secs) {
  const notes = [], jobs = [];
  let n = 0;
  (secs || []).forEach(sc => (sc.parts || []).forEach(pt => {
    if (pt.kind === 'quiz') (pt.questions || []).forEach(q => { n++; if (!q._keyed && pt.readText && (q.options || []).length >= 2) jobs.push({ pt, q, n }); });
    else if (pt.kind === 'short') n += (pt.questions || []).length;
    else if (pt.kind === 'evidence' || pt.kind === 'essay') n++;
  }));
  await pMap(jobs, async (j) => {
    try {
      const [a, b] = await Promise.all([_examSolveMC(j.pt.readText, j.q, false), _examSolveMC(j.pt.readText, j.q, true)]);
      if (a < 0 || b < 0) return;
      const L = 'ABCDEF', now = j.q.answer;
      if (a === now && b === now) return;
      if (a === b) {
        j.q.answer = a;
        notes.push(`第 ${j.n} 題：讀考卷時選的是 ${L[now] || '?'}，但另外獨立解題兩次（選項順序正著、反著）都選 ${L[a]}——已改成 ${L[a]}，沒有解答頁可以對，請你確認。`);
      } else notes.push(`第 ${j.n} 題的答案不太確定（讀考卷時選 ${L[now] || '?'}，獨立解題兩次分別選 ${L[a]}、${L[b]}），沒有解答頁可以對，請你確認。`);
    } catch (e) { /* 驗算壞掉就跳過這一題 */ }
  }, 6);
  (secs || []).forEach(sc => (sc.parts || []).forEach(pt => (pt.questions || []).forEach(q => { delete q._keyed; })));
  if (jobs.length && !notes.length) notes.push(`沒有解答頁，選擇題答案另外獨立驗算過（${jobs.length} 題），跟讀卷時一致。`);
  return notes;
}

/* 把解答套回考卷（純函式，直接改傳進來的 sections，回傳要告訴老師的事）。
   題號＝考卷上印的那種：選擇題、問答題**依序連續編號**（康橋這份：A 部分 1~6，B 部分 7~8）。
   ⚠ 選擇題答案以解答頁為準（老師的話，不是模型讀文章猜的）；對不上就不動，並回報。
   ⚠ 問答題的參考答案放進 keyPoints——AI 批改建議（aiGradeRubric）本來就會吃這個欄位。 */
function examApplyKey(sections, key) {
  const notes = [];
  if (!key) return notes;
  const flat = [];          // 依序：{ kind:'mc', q, part } ｜ { kind:'w', q?, part }
  (sections || []).forEach(sc => (sc.parts || []).forEach(pt => {
    if (pt.kind === 'quiz') (pt.questions || []).forEach(q => flat.push({ kind: 'mc', q, part: pt }));
    else if (pt.kind === 'short') (pt.questions || []).forEach(q => flat.push({ kind: 'w', q, part: pt }));
    else if (pt.kind === 'evidence' || pt.kind === 'essay') flat.push({ kind: 'w', q: null, part: pt });
  }));
  let applied = 0;
  (key.mc || []).forEach(m => {
    const t = flat[m.n - 1];
    if (!t || t.kind !== 'mc') { notes.push(`解答頁第 ${m.n} 題的選擇題答案對不到考卷上的題目，沒有套用`); return; }
    const opts = (t.q.options || []).length;
    if (m.idx >= opts) { notes.push(`解答頁第 ${m.n} 題的答案超出選項，沒有套用`); return; }
    t.q._keyed = true;                  // 這一題的答案來自解答頁，不必再驗算（examVerifyQuiz 看這個旗標）
    if (t.q.answer !== m.idx) {
      notes.push(`第 ${m.n} 題：照解答頁把答案改成 ${'ABCDEFGH'[m.idx]}（模型讀文章時選的是 ${'ABCDEFGH'[t.q.answer] || '?'}）`);
      t.q.answer = m.idx;
    }
    applied++;
  });
  (key.written || []).forEach(w => {
    const t = flat[w.n - 1];
    if (!t || t.kind !== 'w') { notes.push(`解答頁第 ${w.n} 題的參考答案對不到考卷上的問答題，沒有套用`); return; }
    const text = [w.sample].concat((w.others || []).map(o => '• ' + o)).filter(Boolean).join('\n');
    const tgt = t.q || t.part;
    tgt.keyPoints = text;
    tgt.sample = w.sample;
    if (key.note) tgt.teacherNote = key.note;
    applied++;
  });
  if (applied) notes.unshift(`解答頁已套用（${applied} 題）`);
  return notes;
}

function _examReadOne(content) {
  return _aiAsk(
    { model: GN_READ_MODEL, max_tokens: 4000, system: EXAM_READ_SYS, messages: [{ role: 'user', content }] },
    (data) => {
      const txt = (data?.content || []).filter(b => b && b.type === 'text').map(b => b.text).join('')
        || data?.content?.[0]?.text || '';
      const o = _gnSalvageJson(_aiStripFence(txt));
      if (!o || typeof o !== 'object') return null;
      const dropped = [];
      const secs = (Array.isArray(o.sections) ? o.sections : []).map(sc => ({
        name: String((sc && sc.name) || '').trim(),
        pct: +((sc && sc.pct) || 0) || 0,
        /* v560：只有文章、沒有題目的那一頁（「Read the selection. Then complete Part 1 and 2」） */
        passage: String((sc && sc.passage) || '').trim(),
        figure: _examFigureOf(sc && sc.figure),
        parts: (Array.isArray(sc && sc.parts) ? sc.parts : []).map(pt => {
          /* v585：「Read the text below…」這一大題的題目在下一頁——只有標題與文章，沒有題目。
             不能讓清洗把標題本身當成一題（那會多出一個假題目，而且分數會重複算）。 */
          const noQs = !(Array.isArray(pt && pt.questions) && pt.questions.length);
          const isHeadShort = !!pt && pt.kind === 'short' && noQs && !String(pt.question || pt.prompt || '').trim()
            && (Array.isArray(pt.questions)
                || (/\b(read|use what you read|answer the questions)\b/i.test(String(pt.title || pt.instruction || '')) && !/\?\s*$/.test(String(pt.title || '')) && !/summar|write|explain|describe/i.test(String(pt.title || '') + ' ' + String(pt.instruction || ''))));
          let c;
          if (isHeadShort) {
            c = _examCleanPart({ ...pt, questions: [{ q: '_', pts: 0 }] });
            if (c) c = { ...c, questions: [], _cont: 'questions' };
          } else c = _examCleanPart(pt);
          /* v582：考卷跨頁時，續頁只有「後半段」——填空沒有詞庫（詞庫在上一頁）、自己出問題沒有文章（文章在前面那頁）。
             每一頁是分開讀的，所以先收下來標成 _cont，等合併時再接回前面的大題。 */
          if (!c && pt && pt.kind === 'cloze' && Array.isArray(pt.items || pt.sentences) && !(Array.isArray(pt.bank) && pt.bank.length)) {
            c = _examCleanPart({ ...pt, bank: ['_'] });
            if (c) c = { ...c, bank: [], _cont: 'bank' };
          }
          /* v605：「Use evidence from the passage and describe two…」題目在這一頁、文章在另一頁——
             每一頁是分開讀的，沒有文章不是這題壞掉，是等合併時再接回前面那一頁的文章。 */
          if (!c && pt && pt.kind === 'evidence' && !String(pt.passage || '').trim()) {
            c = _examCleanPart({ ...pt, passage: '_' });
            if (c) c = { ...c, passage: '', _cont: 'passage' };
          }
          if (!c && pt && (pt.kind === 'genq' || pt.kind === 'storymap') && !String(pt.passage || '').trim()) {
            c = _examCleanPart({ ...pt, passage: '_' });
            if (c) c = { ...c, passage: '', _cont: 'passage' };
          }
          /* ⚠ 讀進來卻被清洗丟掉的，一定要告訴老師——以前是整題消失、什麼都不說 */
          if (!c && pt && (pt.title || pt.kind)) dropped.push(`「${String(pt.title || pt.kind).slice(0, 40)}」讀到了但內容不完整，沒收進來`);
          return c;
        }).filter(Boolean),
      })).filter(sc => sc.parts.length || sc.passage || sc.figure);
      return { title: String(o.title || '').trim(), sections: secs, rubricMax: Math.max(0, Math.min(10, Math.round(+o.rubricMax || 0))),
               answerKey: _examCleanKey(o.answerKey),
               skipped: (Array.isArray(o.skipped) ? o.skipped : []).map(x => String(x).trim()).filter(Boolean).concat(dropped) };
    }, 90000);
}

/* 一大題的清洗：型別不認得、或內容根本湊不成一題的，直接不要。
   🔴 v516 實測：模型很愛把選擇題**一題拆成一個 part**，options／answer 直接放在 part 上
     （沒有 questions 陣列）。照原本的寫法整頁會被清成 0 大題，然後回報「這一張讀不出東西」
     ——一半的考卷就這樣消失，而且畫面上只說「讀不懂」。
   → 提示詞已經把形狀講死；這裡再撿一次：形狀不對但東西都在的，包回陣列。 */
function _examCleanPart(p) {
  if (!p || !EXAM_KINDS[p.kind]) return null;
  /* 🔴 實測兩種「型別對、形狀不對」的回法，都要撿回來而不是整段丟掉：
       ① 選擇題一題一個 part，options／answer 直接掛在 part 上（沒有 questions 陣列）
       ② 填空的句子放在 "sentences" 而不是 "items"
     兩種都會讓整個 Section 被清成空的，然後回報「這一張讀不出東西」——
     照片明明讀對了，東西卻在我自己的清洗裡消失。 */
  if (p.kind === 'quiz' && !Array.isArray(p.questions) && Array.isArray(p.options)) {
    p = { ...p, questions: [{ q: String(p.q || p.instruction || '').trim(), options: p.options, answer: p.answer }] };
  }
  if (p.kind === 'cloze' && !Array.isArray(p.items)) {
    const alt = [p.sentences, p.questions, p.blanks].find(Array.isArray);
    if (alt) p = { ...p, items: alt };
  }
  if (p.kind === 'circle' && !p.passage) {
    const alt = [p.text, p.story, p.paragraph].find(x => typeof x === 'string' && x.trim());
    if (alt) p = { ...p, passage: alt };
  }
  /* v560：摘要題實測——模型回的是「一個 short、沒有 questions 陣列」（只有 title／need／rubric），
     而下面的 short 分支要 questions，結果整題無聲無息被丟掉（連「跳過」都沒列）。
     撿回來：用印出來的題目當那一題，並認出「摘要」就掛上摘要評分表。 */
  if (p.kind === 'short' && !(Array.isArray(p.questions) && p.questions.length)) {
    const task = String(p.question || p.prompt || p.instruction || p.title || '').trim();
    if (task) {
      const sumLike = /summar/i.test(task + ' ' + (p.rubric || '') + ' ' + (p.rubricSet || ''));
      p = { ...p, questions: [{ q: task, pts: +p.pts || 0, rubric: String(p.rubric || '') }],
            ...(sumLike && !p.rubricSet ? { rubricSet: 'summary' } : {}) };
    }
  }
  const base = { kind: p.kind, title: String(p.title || '').trim(),
                 instruction: String(p.instruction || '').trim(), pts: +p.pts || 0,
                 ...(_examFigureOf(p.figure) ? { figure: _examFigureOf(p.figure) } : {}) };
  if (p.kind === 'circle') {
    const check = String(p.check || '').trim().toLowerCase();
    if (!WS_CHECKS[check]) return null;                    // 程式判不出來的規則不要收
    const passage = String(p.passage || '').trim();
    if (!passage) return null;
    return { ...base, check, checkArg: String(p.checkArg || '').trim(), need: +p.need || 0, passage };
  }
  if (p.kind === 'cloze') {
    const bank = (Array.isArray(p.bank) ? p.bank : []).map(x => String(x).trim()).filter(Boolean);
    const items = (Array.isArray(p.items) ? p.items : []).map(q => ({
      text: String((q && (q.text || q.sentence || q.q)) || '').trim(),
      answer: String((q && (q.answer || q.word)) || '').trim(),
    })).filter(q => q.text);
    if (!bank.length || !items.length) return null;
    return { ...base, bank, items };
  }
  if (p.kind === 'order') {
    const events = (Array.isArray(p.events) ? p.events : []).map(x => String(x).trim()).filter(Boolean);
    if (events.length < 2) return null;                    // 一件事沒有「順序」可言
    return { ...base, events: events.slice(0, 10), readText: String(p.passage || p.readText || '').trim() };
  }
  if (p.kind === 'quiz') {
    const questions = (Array.isArray(p.questions) ? p.questions : []).map(q => {
      const options = (Array.isArray(q && q.options) ? q.options : []).map(x => String(x).trim()).filter(Boolean);
      const a = +((q && q.answer) || 0);
      if (!q || !String(q.q || '').trim() || options.length < 2) return null;
      if (!(a >= 0 && a < options.length)) return null;     // 正解超出範圍＝這題不要
      /* v607：交卷後要顯示的「為什麼是這個答案」（explain）與文章裡的依據（quote）要留著——
         以前這裡只收 q／options／answer，貼上整份考卷與讀考卷都會把解析洗掉。 */
      const explain = String((q && q.explain) || '').trim().slice(0, 300), quote = String((q && q.quote) || '').trim().slice(0, 200);
      return { q: String(q.q).trim(), options, answer: a, ...(explain ? { explain } : {}), ...(quote ? { quote } : {}) };
    }).filter(Boolean);
    if (!questions.length) return null;
    const rt = String(p.passage || p.readText || '').trim();
    return { ...base, questions, ...(rt ? { readText: rt } : {}) };
  }
  /* ══ v537：v522／v536 新增的四種也要收得進來 ══════════════════════
     ⚠ 提示詞教會模型認這幾種之後，這裡一定要跟著收——不然它讀出來了，
       在這一關被 return null 丟掉，畫面上還是少一大題（而且完全不報錯）。 */
  if (p.kind === 'affix') {
    const affixes = (Array.isArray(p.affixes) ? p.affixes : []).map(x => String(x).trim()).filter(Boolean);
    /* 字尾要看得出是字首還是字尾（-ing／un-），寫成光禿禿的 ing 程式判不出來 */
    if (affixes.length < 2 || !affixes.every(a => /^-|-$/.test(a))) return null;
    return { ...base, affixes, need: Math.max(2, +p.need || 2), minWords: +p.minWords || 5 };
  }
  if (p.kind === 'usewords') {
    const bank = (Array.isArray(p.bank) ? p.bank : []).map(x => String(x).trim()).filter(Boolean);
    const need = Math.max(1, +p.need || 2);
    if (bank.length < need) return null;                   // 詞庫比要造的句子少＝這題出不出來
    return { ...base, bank, need, minWords: +p.minWords || 6 };
  }
  if (p.kind === 'genq' || p.kind === 'storymap') {
    const passage = String(p.passage || '').trim();
    if (!passage) return null;                             // 沒有文章，學生沒東西可以依據
    return { ...base, passage, need: Math.max(1, +p.need || 2),
             ...(p.kind === 'storymap' ? { minWords: +p.minWords || 4 } : {}) };
  }
  /* ══ v538：剩下的四種 ══════════════════════════════════════════ */
  if (p.kind === 'fixbox') {
    const answers = (Array.isArray(p.answers) ? p.answers : []).map(x => String(x).trim()).filter(Boolean);
    const passage = String(p.passage || '').trim();
    if (!answers.length || !passage) return null;
    /* ⚠ 答案一定要真的出現在那段文章裡（大小寫不算）——
         模型會「順手把句子改對」然後給一個文章裡沒有的字，
         那樣孩子照文章找永遠找不到，而且老師看答案也看不出哪裡怪。 */
    const low = passage.toLowerCase();
    const ok = answers.filter(a => low.indexOf(a.toLowerCase()) >= 0);
    if (ok.length < 2) return null;
    return { ...base, answers: ok, passage, need: ok.length };
  }
  if (p.kind === 'evidence') {
    const passage = String(p.passage || '').trim();
    if (!passage) return null;                             // 沒有文章就沒有「證據」可以引用
    return { ...base, passage, question: String(p.question || p.q || '').trim(),
             need: Math.max(1, +p.need || 2), minWords: +p.minWords || 5,
             ...(String(p.keyPoints || '').trim() ? { keyPoints: String(p.keyPoints).trim().slice(0, 2000) } : {}),
             ...(String(p.sample || '').trim() ? { sample: String(p.sample).trim().slice(0, 2000) } : {}) };
  }
  if (p.kind === 'table') {
    const headers = (Array.isArray(p.headers) ? p.headers : (Array.isArray(p.columns) ? p.columns : []))
      .map(x => String(x || '').trim()).filter(Boolean).slice(0, 3);
    if (headers.length < 2) return null;                   // 沒有欄名，學生不知道每一格要寫什麼
    const rows = Math.max(1, Math.min(12, +p.rows || +p.need || (Array.isArray(p.items) ? p.items.length : 0) || 3));
    const rt = String(p.passage || p.readText || '').trim();
    return { ...base, headers, need: rows, rubricSet: 'table', rubricMax: EXAM_RUBRIC_SETS.table.max,
             ...(rt ? { readText: rt } : {}) };
  }
  if (p.kind === 'draw') {
    const prompt = String(p.prompt || p.question || p.instruction || p.title || '').trim();
    if (!prompt) return null;
    return { ...base, prompt, rubricSet: 'draw', rubricMax: EXAM_RUBRIC_SETS.draw.max };
  }
  if (p.kind === 'essay') {
    const prompt = String(p.prompt || p.q || p.instruction || '').trim();
    if (!prompt) return null;                              // 沒有題目，孩子不知道要寫什麼
    const rsE = String(p.rubricSet || '').trim();
    return { ...base, prompt,
             vocab: (Array.isArray(p.vocab) ? p.vocab : []).map(x => String(x).trim()).filter(Boolean),
             paras: +p.paras || 5, sentsPerPara: +p.sentsPerPara || 4,
             rubric: String(p.rubric || '').trim(),
             ...(EXAM_RUBRIC_SETS[rsE] ? { rubricSet: rsE, rubricMax: EXAM_RUBRIC_SETS[rsE].max } : {}) };
  }
  if (p.kind === 'checkin') {
    const goals = (Array.isArray(p.goals) ? p.goals : []).map(x => String(x).trim()).filter(Boolean);
    return { ...base, pts: 0, goals };                     // 不計分，配分一律歸零
  }

  const questions = (Array.isArray(p.questions) ? p.questions : []).map(q => ({
    q: String((q && q.q) || '').trim(), pts: +((q && q.pts) || 0) || 0,
    rubric: String((q && q.rubric) || '').trim(),
    rows: Math.max(2, Math.min(12, Math.round(+(q && q.rows) || 4))),
    /* v606：老師給的參考答案（keyPoints）要留著——AI 批改建議會參考它（aiGradeRubric 的 keyPoints）。
       以前貼上整份考卷這條路會把它洗掉，只剩題目。 */
    ...(q && String(q.keyPoints || '').trim() ? { keyPoints: String(q.keyPoints).trim().slice(0, 2000) } : {}),
    ...(q && String(q.sample || '').trim() ? { sample: String(q.sample).trim().slice(0, 2000) } : {}),
  })).filter(q => q.q);
  if (!questions.length) return null;
  /* 印在卷子上的 rubric 是哪一套（七項寫作／三項）——認不得就不設，用預設的三項 */
  const rs = String(p.rubricSet || '').trim();
  const rubricSet = EXAM_RUBRIC_SETS[rs] ? rs : '';
  const rtShort = String(p.passage || p.readText || '').trim();
  return { ...base, passage: rtShort, ...(rtShort ? { readText: rtShort } : {}), questions,
           ...(rubricSet ? { rubricSet, rubricMax: EXAM_RUBRIC_SETS[rubricSet].max } : {}) };
}

/* 把幾張照片讀成一份考卷。回傳 { item, skipped, missed, warnings } */
/* 從一張（base64）圖裁出一塊，回傳 JPEG blob。box＝[x0,y0,x1,y1]（整張圖的比例）。
   ⭐ v571 實測：AI 畫的框只是「大概在哪」——上緣少一截、下面多帶標題與第一段文字。
     所以拿它當搜尋範圍（往外多看 8%），再用像素找真正的圖片邊緣：
     圖片（照片、漫畫）幾乎整片都有顏色，文字行大部分是白紙。找不到明顯的圖就老實用 AI 的框。 */
function _examRefineBox(el, box) {
  const W = el.naturalWidth, H = el.naturalHeight;
  const ex = 0.08;
  const x0 = Math.max(0, box[0] - ex), y0 = Math.max(0, box[1] - ex), x1 = Math.min(1, box[2] + ex), y1 = Math.min(1, box[3] + ex);
  const sw = Math.max(8, (x1 - x0) * W), sh = Math.max(8, (y1 - y0) * H);
  const k = Math.min(1, 420 / sw);
  const cw = Math.max(4, Math.round(sw * k)), ch = Math.max(4, Math.round(sh * k));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  /* ⚠ 一定要關掉平滑：縮小時預設會把整行文字「平均」成一片灰，文字行就被當成圖片的一部分（實測圖下面的說明文字被一起裁進來）。
       不平滑＝直接取點，文字行只剩零星幾個黑點，密度很低。 */
  cx.imageSmoothingEnabled = false;
  cx.drawImage(el, x0 * W, y0 * H, sw, sh, 0, 0, cw, ch);
  const px = cx.getImageData(0, 0, cw, ch).data;
  const inkAt = (x, y) => { const i = (y * cw + x) * 4; return px[i] < 232 || px[i + 1] < 232 || px[i + 2] < 232; };
  /* 橫的：每一列有多少比例不是白紙 */
  const rowD = new Array(ch).fill(0);
  for (let y = 0; y < ch; y++) { let n = 0; for (let x = 0; x < cw; x++) if (inkAt(x, y)) n++; rowD[y] = n / cw; }
  const bands = []; let st = -1, gap = 0; const maxGap = Math.max(2, Math.round(ch * 0.03));
  for (let y = 0; y < ch; y++) {
    if (rowD[y] >= 0.5) { if (st < 0) st = y; gap = 0; }
    else if (st >= 0) { gap++; if (gap > maxGap) { bands.push([st, y - gap]); st = -1; gap = 0; } }
  }
  if (st >= 0) bands.push([st, ch - 1 - gap]);
  if (!bands.length) return box;
  const band = bands.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  if ((band[1] - band[0] + 1) < ch * 0.12) return box;          // 太矮＝只是一條線
  /* 圖片的邊緣列幾乎整列都有顏色；緊貼著圖的那行說明文字密度只有它的一半左右。
     把帶子上下兩端「比這條帶子的中間值稀疏很多」的列修掉（說明文字不要被裁進圖裡，它另外存成文字）。 */
  const sorted = rowD.slice(band[0], band[1] + 1).sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  /* 下緣（說明文字常在圖的下面）用 0.82；上緣只修「明顯是文字」的列（0.5）——圖頂常是淡淡的天空，不能誤切 */
  while (band[1] > band[0] && rowD[band[1]] < med * 0.82) band[1]--;
  while (band[0] < band[1] && rowD[band[0]] < med * 0.5) band[0]++;
  /* 直的：在這個高度範圍裡，每一欄有多少比例不是白紙 */
  const bh = band[1] - band[0] + 1;
  const colOk = new Array(cw).fill(false);
  for (let x = 0; x < cw; x++) { let n = 0; for (let y = band[0]; y <= band[1]; y++) if (inkAt(x, y)) n++; colOk[x] = n / bh >= 0.4; }
  let cs = -1, ce = -1, best = 0, i = 0;
  while (i < cw) {
    if (!colOk[i]) { i++; continue; }
    let j = i, g = 0, last = i;
    while (j < cw && g <= 3) { if (colOk[j]) { last = j; g = 0; } else g++; j++; }
    if (last - i + 1 > best) { best = last - i + 1; cs = i; ce = last; }
    i = last + 1;
  }
  if (cs < 0 || best < cw * 0.2) return box;
  const rb = [x0 + (cs / cw) * (x1 - x0), y0 + (band[0] / ch) * (y1 - y0), x0 + ((ce + 1) / cw) * (x1 - x0), y0 + ((band[1] + 1) / ch) * (y1 - y0)];
  const area = (b) => (b[2] - b[0]) * (b[3] - b[1]);
  return (area(rb) >= area(box) * 0.3 && area(rb) >= 0.02) ? rb : box;
}
async function _examCropFigure(img, box) {
  const el = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = () => rej(new Error('image'));
    im.src = `data:${(img && img.media_type) || 'image/jpeg'};base64,${img && img.data}`;
  });
  const W = el.naturalWidth, H = el.naturalHeight, pad = 0.003;
  let rb = box;
  try { rb = _examRefineBox(el, box); } catch (e) { rb = box; }
  const x0 = Math.max(0, rb[0] - pad) * W, y0 = Math.max(0, rb[1] - pad) * H;
  const x1 = Math.min(1, rb[2] + pad) * W, y1 = Math.min(1, rb[3] + pad) * H;
  const sw = Math.max(8, x1 - x0), sh = Math.max(8, y1 - y0);
  const k = Math.min(1, 1200 / sw);
  const cv = document.createElement('canvas');
  cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
  cv.getContext('2d').drawImage(el, x0, y0, sw, sh, 0, 0, cv.width, cv.height);
  return await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('toBlob')), 'image/jpeg', 0.88));
}
async function aiReadExamSheet({ images = [], onProgress } = {}) {
  const imgs = (images || []).slice(0, 8);
  if (!imgs.length) throw new Error('請先選幾張考卷照片。');
  const parts = imgs.map((im, i) => ({
    label: `第 ${i + 1} 張`,
    content: [{ type: 'image', source: { type: 'base64', media_type: im.media_type || 'image/jpeg', data: im.data } },
              /* 🔴 v516 實測：Alan 是把攤開的卷子一次拍一張——**一張照片上有左右兩頁**。
                 原本寫「this is page N, read only this page」，模型就真的只讀其中一邊，
                 Section 2 的 Word Bank 填空（32 分）時有時無。
                 改成「這張照片上看得到的全部都要讀，左頁先、右頁後」。 */
              { type: 'text', text: `Read EVERYTHING visible in this photo${imgs.length > 1 ? ` (photo ${i + 1} of ${imgs.length} of one exam paper)` : ''}. `
                + 'A photo often shows TWO facing pages of an open booklet — read the LEFT page first, then the RIGHT page, '
                + 'and output every Section and Part you can see on either side. '
                + 'Every reading text (story / article / paragraphs) printed on the page MUST be copied word for word into a "passage" field '
                + '(on the part that says "Read the text below", or on the section) — never leave a printed reading text out.' }],
  }));
  let done = 0;
  if (onProgress) onProgress(0, parts.length);
  const got = await Promise.all(parts.map(p => _examReadOne(p.content)
    .then(v => ({ v }), e => ({ e }))
    .finally(() => { done++; if (onProgress) onProgress(done, parts.length); })));

  /* 🔴 v605：有一頁偶爾整頁讀成空的（實測同一份卷子重跑，第 3 頁的問答題有時有、有時沒有）。
     空的那幾頁**再讀一次**（只重打那幾頁），還是空才報「讀不到」。 */
  const empty = (g) => !g.v || !(g.v.sections.length || g.v.rubricMax || g.v.answerKey);
  const again = got.map((g, i) => i).filter(i => empty(got[i]));
  if (again.length) {
    await Promise.all(again.map(i => _examReadOne(parts[i].content).then(v => { if (v && !empty({ v })) got[i] = { v }; }, () => {})));
  }

  /* v571：每一段、每一大題記得「它在第幾張」——之後從那一張把插圖裁出來 */
  got.forEach((g, i) => {
    if (!g.v) return;
    g.v.sections.forEach(sc => {
      sc.pg = i; if (sc.figure) sc.figure.pg = i;
      sc.parts.forEach(p => { p.pg = i; if (p.figure) p.figure.pg = i; });
    });
  });
  const ok = got.filter(g => g.v && g.v.sections.length);
  /* v585：只有「評分標準表」的那一頁沒有大題，但它告訴我們 rubric 每項最高幾分（康橋 G4 Formative 1：5 分） */
  const printedRubricMax = Math.max(0, ...got.map(g => (g.v && g.v.rubricMax) || 0));
  if (!ok.length) {
    const to = got.some(g => g.e && g.e.timeout);
    throw new Error(to ? '讀考卷太久沒有回應，請再試一次。'
                       : '讀不懂這幾張照片——請拍正一點、光線亮一點，整頁都要入鏡。');
  }
  const missed = got.map((g, i) => (g.v && (g.v.sections.length || g.v.rubricMax || g.v.answerKey) ? null : parts[i].label)).filter(Boolean);
  const answerKey = (() => { const ks = got.map(g => g.v && g.v.answerKey).filter(Boolean); if (!ks.length) return null;
    return { mc: ks.flatMap(k => k.mc), written: ks.flatMap(k => k.written), note: ks.map(k => k.note).filter(Boolean).join(' ') }; })();

  /* 合併：同名的 Section 接起來（一個 Section 常常跨兩頁）。 */
  const secs = [];
  const skipped = [];
  ok.forEach(({ v }) => {
    skipped.push(...v.skipped);
    v.sections.forEach(sc => {
      /* v583：同一個 Section 在不同頁常寫成不同樣子（"Section 2: Vocabulary (32%)" 與 "Section 2: Vocabulary"）——
         有 Section 編號就用編號當身分；沒有就把括號裡的百分比拿掉再比。 */
      const num = /^\s*section\s*(\d+)/i.exec(sc.name);
      const key = num ? 'section' + num[1] : sc.name.toLowerCase().replace(/\([^)]*\)/g, '').replace(/\s+/g, '');
      /* v582：沒有名字的段落（續頁開頭沒有 Section 標題）＝接在前一個 Section 後面 */
      const hit = key ? secs.find(x => x.key === key) : (secs.length ? secs[secs.length - 1] : null);
      if (hit) { hit.parts.push(...sc.parts); if (!hit.pct) hit.pct = sc.pct; if (sc.passage && !hit.passage) hit.passage = sc.passage; if (sc.figure && !hit.figure) hit.figure = sc.figure; return; }
      secs.push({ key, name: sc.name, pct: sc.pct, passage: sc.passage || '', figure: sc.figure || null, parts: sc.parts.slice() });
    });
  });
  /* 模型把一個 Part 拆成好幾個（一題一個）時，連續的同型大題併回去。
     ⚠ 只併「後面那個沒有自己的標題」的——真的有兩個 Part 4 / Part 5 的卷子不可以被併掉。 */
  secs.forEach(sc => {
    const merged = [];
    sc.parts.forEach(pt => {
      const last = merged[merged.length - 1];
      /* v582 填空續頁：沒有詞庫的那段，接到最近一個填空大題上（詞庫、題號、配分都用前面那個的） */
      /* 模型看不到詞庫時偶爾會「自己編一個」——所以沒有標題、又接在填空後面的填空，一律當續頁，用前面那個的詞庫 */
      const prevCloze = () => { let pv = null; for (const s2 of secs) for (const q of (s2 === sc ? merged : s2.parts)) if (q.kind === 'cloze' && !q._cont && q !== pt) pv = q; return pv; };
      if (pt._cont === 'bank' || (pt.kind === 'cloze' && !pt.title && prevCloze())) {
        const prev = prevCloze();
        if (prev) {
          prev._fixAns = true;                                        // 續頁的答案要照前面的詞庫重選
          prev.items = (prev.items || []).concat(pt.items || []);
          const each = /\(\s*(\d+(?:\.\d+)?)\s*pts?\.?\s*each\s*\)/i.exec((prev.title || '') + ' ' + (prev.instruction || ''));
          if (each) prev.pts = Math.round(+each[1] * prev.items.length * 10) / 10;
          return;
        }
        skipped.push('有一段填空沒有詞庫（可能是上一頁沒讀到），請自己補上');
        return;
      }
      const same = last && last.kind === pt.kind && (pt.kind === 'quiz' || pt.kind === 'short');
      if (same && !pt.title) {
        const headed = last._cont === 'questions';           // 前一頁只有文章與標題、題目在這一頁
        last.questions = (last.questions || []).concat(pt.questions || []);
        last.pts = headed ? (+last.pts || +pt.pts || 0) : (+last.pts || 0) + (+pt.pts || 0);
        const qp = (last.questions || []).map(q => +q.pts || 0);
        if (last.questions.length && qp.every(v => v > 0)) last.pts = qp.reduce((a, b) => a + b, 0);   // 每題都有配分 → 總分照加
        if (headed) delete last._cont;
        if (!last.passage && pt.passage) last.passage = pt.passage;
        return;
      }
      merged.push({ ...pt });
    });
    sc.parts = merged;
  });
  /* v560 ① 「只有文章」的那一頁：文章接到後面第一個要先讀文章的大題上（選擇題／排順序／摘要／長文），
         而且模型常把同一個 Section 拆成名字不一樣的幾段（"Section: Reading Skills"、"Part 2: …"），
         沒有自己 Section 編號的、配分比例是 0 的，併回前面那個有編號的 Section。 */
  /* v586：只有標題與文章、後面沒有等到它的題目（例如文章後面接的是選擇題）→ 那篇文章改當 Section 的文章，
     等一下依題目內容掛到真正在問它的那一大題 */
  secs.forEach(sc => {
    sc.parts = sc.parts.filter(pt => {
      if (pt._cont !== 'questions') return true;
      if ((pt.questions || []).length) { delete pt._cont; return true; }
      const rt = String(pt.readText || pt.passage || '').trim();
      if (rt && !sc.passage) sc.passage = rt;
      if (pt.figure && !sc.figure) sc.figure = pt.figure;
      return false;
    });
  });
  const NEEDS_READ = { quiz: 1, order: 1, short: 1, essay: 1, evidence: 1 };   // v605：evidence（問答題要引用文章）也要接文章
  for (let i = 0; i < secs.length; i++) {
    const sc = secs[i];
    if (!sc.passage) continue;
    /* 後面連續幾段「沒有自己的 Section 編號、配分比例是 0」的，全部是同一個 Section 的內容 */
    while (secs[i + 1] && !(+secs[i + 1].pct) && !/^section\s*\d/i.test(secs[i + 1].name)) {
      sc.parts = sc.parts.concat(secs[i + 1].parts); secs.splice(i + 1, 1);
    }
    /* v585：文章要掛在「問的是這篇」的那一題上，不是第一個遇到的。
       康橋 G4 Formative 1：Part 4 的選擇題問的是另一篇（Buzz），這一頁的文章（Kjell）是後面 Part 5 的——
       所以比對題目與文章共用多少實詞；全部都是 0 才退而求其次，掛在最後一個候選。 */
    const cands = sc.parts.filter(pt => NEEDS_READ[pt.kind] && !pt.readText && !pt.passage);
    const srcW = new Set(_examContentWords(sc.passage));
    const score = (pt) => {
      const txt = (pt.questions || []).map(q => [q.q].concat(q.options || []).join(' ')).join(' ') + ' ' + (pt.events || []).join(' ') + ' ' + (pt.question || '');
      return _examContentWords(txt).filter(w => srcW.has(w)).length;
    };
    let tgt = null, best = 0;
    cands.forEach(pt => { const sc2 = score(pt); if (sc2 > best) { best = sc2; tgt = pt; } });
    if (!tgt && cands.length) tgt = cands.length > 1 && cands.some(pt => !(pt.questions || []).length === false) ? cands[cands.length - 1] : cands[0];
    /* 🔴 v605：同一篇文章常常有好幾大題都要讀它（Alan 的 Unseen Reading：選擇題＋問答題都問這篇）。
       以前只接給「最像的那一題」，問答題就沒有文章。現在：跟文章共用的實詞數 ≥ 2、而且至少是最像那題的一半 → 都接。
       ⚠ 門檻是為了 v585 那個情況——Part 4 問的是**另一篇**（Buzz），不能因為撞到一兩個常見字就拿到這篇（Kjell）。 */
    const givePassage = (pt) => { if (pt.kind === 'evidence') pt.passage = sc.passage; else pt.readText = sc.passage; };
    if (tgt) {
      givePassage(tgt); sc._figTarget = tgt;
      cands.forEach(pt => { if (pt !== tgt && best >= 2 && score(pt) >= Math.max(2, best / 2)) givePassage(pt); });
    }
    else skipped.push('有一篇文章（' + sc.passage.slice(0, 30).replace(/\n/g, ' ') + '…）找不到要接在哪一題，請自己貼上');
  }
  /* v582：續頁的填空，答案是模型沒看到詞庫時猜的——照前面的詞庫請它重選一次（選不出在詞庫裡的就留給老師） */
  for (const sc of secs) for (const pt of sc.parts) {
    if (!pt._fixAns) continue;
    delete pt._fixAns;
    const inBank = (w) => (pt.bank || []).some(b => String(b).toLowerCase() === String(w || '').toLowerCase());
    if (pt.items.every(q => inBank(q.answer))) continue;
    try {
      const got = await _gnCall('You are checking a fill-in-the-blank exercise for elementary students. For EACH sentence pick the ONE word from the word bank that best completes it (each bank word is used at most once). '
        + 'Return ONLY JSON: {"answers":["word for sentence 1","word for sentence 2",...]} — exactly one entry per sentence, each copied exactly from the word bank.',
        `WORD BANK: ${pt.bank.join(', ')}\n\nSENTENCES:\n` + pt.items.map((q, i) => `${i + 1}. ${q.text}`).join('\n'), 500);
      const ans = got && Array.isArray(got.answers) ? got.answers : [];
      pt.items.forEach((q, i) => { const w = (pt.bank || []).find(b => String(b).toLowerCase() === String(ans[i] || '').toLowerCase()); if (w) q.answer = w; });
    } catch (e) {}
    pt.items.forEach((q, i) => { if (!inBank(q.answer)) skipped.push(`填空第 ${i + 1} 句的答案不在詞庫裡，請自己確認`); });
  }
  /* v582：「自己出問題」續頁沒有文章——用同一個 Section 裡最近讀到的那一篇（選擇題上的 readText 或整段文章） */
  secs.forEach((sc, si) => {
    sc.parts = sc.parts.filter(pt => {
      if (pt._cont !== 'passage') return true;
      let src = '';
      for (let k = si; k >= 0 && !src; k--) {
        const list = k === si ? sc.parts : secs[k].parts;
        for (const q of list) { if (q !== pt && (q.readText || q.passage)) src = String(q.readText || q.passage); }
        if (!src && secs[k].passage) src = secs[k].passage;
      }
      if (!src) { skipped.push(`「${String(pt.title || pt.kind).slice(0, 40)}」要用到一篇文章，但找不到，請自己貼上`); return false; }
      pt.passage = src;
      return true;
    });
    sc.parts.forEach(pt => { delete pt._cont; });
  });
  /* v560 ② 配分保險：模型有時只回「(3 pts. each)」沒回總分 → 自己乘出來 */
  secs.forEach(sc => sc.parts.forEach(pt => {
    if (+pt.pts > 0 || (EXAM_KINDS[pt.kind] || {}).noScore) return;
    const m = /\(\s*(\d+(?:\.\d+)?)\s*pts?\.?\s*each\s*\)/i.exec((pt.title || '') + ' ' + (pt.instruction || ''));
    const n = examPartN(pt);
    if (m && n) { pt.pts = Math.round(+m[1] * n * 10) / 10; return; }
    /* 問答題的分數常寫在題目後面：「Why does the author…? (2 pts.)」 */
    if (pt.kind === 'short') {
      const tot = (pt.questions || []).reduce((a, q) => {
        const mm = /\(\s*(\d+(?:\.\d+)?)\s*pts?\.?\s*\)/i.exec(String((q && q.q) || ''));
        return a + (mm ? +mm[1] : (+q.pts || 0));
      }, 0);
      if (tot > 0) pt.pts = tot;
    }
  }));
  /* 🔴 v605：整份卷子**完全沒有印配分**（Alan 自己出的 Unseen Reading 練習卷：選擇題＋問答題，沒有分數）。
     全部是 0 分的話，交卷會是「0/0」、完成判定與星星都沒有依據。
     所以只在「整份一個分數都沒有」時才補預設：選擇題每題 1 分、問答題每題 4 分，並**明講是預設**，老師在校稿頁改。
     ⚠ 只要卷子上有任何一個印出來的分數，就一律不補——不可以替老師編分數。 */
  const scored = [];
  secs.forEach(sc => sc.parts.forEach(pt => { if (!(EXAM_KINDS[pt.kind] || {}).noScore) scored.push(pt); }));
  let defaultPts = false;
  if (scored.length && scored.every(pt => !(+pt.pts > 0)) && !secs.some(sc => +sc.pct > 0)) {
    scored.forEach(pt => {
      if (pt.kind === 'quiz') pt.pts = (pt.questions || []).length;
      else if (pt.kind === 'short') pt.pts = (pt.questions || []).length * 4;
      else if (pt.kind === 'evidence' || pt.kind === 'essay') pt.pts = 4;
    });
    defaultPts = scored.some(pt => +pt.pts > 0);
  }
  /* v585 評分標準表（Explanation／Relevant／Effort，每項最高 5 分）：套到沒有指定評分表的手寫題上 */
  if (printedRubricMax > 0) {
    secs.forEach(sc => sc.parts.forEach(pt => {
      if (pt.kind === 'short' && (!pt.rubricSet || pt.rubricSet === 'basic')) { pt.rubricSet = 'basic'; pt.rubricMax = printedRubricMax; }
    }));
  }
  /* v571 🖼 插圖：從那一張把 AI 指的那塊裁出來、上傳、掛在那篇文章（或那一大題）上。
     ⚠ 上傳失敗不能讓整份考卷讀不出來——記一句，讓老師自己在編輯單元補圖。 */
  secs.forEach(sc => {
    if (sc.figure) {
      const t = sc._figTarget || sc.parts.find(p => NEEDS_READ[p.kind]) || sc.parts[0];
      if (t && !t._fig) t._fig = sc.figure;
    }
    sc.parts.forEach(p => { if (p.figure && !p._fig) p._fig = p.figure; });
  });
  for (const sc of secs) {
    for (const p of sc.parts) {
      if (!p._fig) continue;
      try {
        const src = imgs[p._fig.pg];
        const blob = await _examCropFigure(src, p._fig.box);
        const url = await uploadFlashcardImage(blob);
        p.img = url;
        if (p._fig.caption) p.imgCap = p._fig.caption;
      } catch (e) {
        skipped.push('讀到一張插圖' + (p._fig.caption ? '（' + p._fig.caption.slice(0, 40) + '）' : '') + '，但裁切或上傳失敗，請在編輯單元自己加圖');
      }
    }
  }
  /* v583：大題都被併到別處（續頁併回前面）的 Section 會變成空殼——沒有大題就不要留標題 */
  for (let i = secs.length - 1; i >= 0; i--) if (!secs[i].parts.length) secs.splice(i, 1);
  /* 🔴 v605 解答頁：選擇題答案以解答頁為準、問答題的參考答案放進 keyPoints（AI 批改建議會參考）。 */
  const keyNotes = examApplyKey(secs, answerKey).concat(await examVerifyQuiz(secs));
  /* v607 解析：有文章的選擇題交卷後要能看到「為什麼」。壞掉不擋讀卷。 */
  try {
    const ex = await examExplain(secs);
    if (ex.added) keyNotes.push(`AI 幫 ${ex.added} 題選擇題寫了解析（每一則都附文章裡的依據，已逐字核對過）。`);
    ex.disputed.forEach(d => keyNotes.push(`⚠ 第 ${d.i + 1} 題（${d.q.slice(0, 40)}…）：AI 覺得答案應該是 ${d.think}，不是現在的 ${d.key}——請你看一下。`));
  } catch (e) {}
  const title = (ok.map(g => g.v.title).find(Boolean) || '模擬考卷').trim();
  const item = {
    type: 'exam', title, examMood: true,
    sections: secs.map(({ key, passage, figure, _figTarget, pg, ...rest }) => ({
      ...rest, parts: rest.parts.map(({ figure: _f, _fig, pg: _pg, ...pt }) => pt),
    })),
  };
  /* ⭐ 不另外寫驗證——丟進 v515 老師手打考卷用的同一組檢查。 */
  return { item, skipped: [...new Set(skipped)], missed, warnings: examWarnings(item).concat(keyNotes, defaultPts ? ['這份卷子沒有印配分，先用預設：選擇題每題 1 分、問答題每題 4 分——請在校稿頁改成你要的分數。'] : []) };
}

/* ══ v540 📋 貼上整份考卷 ═══════════════════════════════════════════
   出一份卷子有六大題，一題一題貼要設六次「題型／標題／配分」。
   ⭐ 走的是**跟拍照讀考卷完全同一條清洗路線**（_examCleanPart）——
     不另寫一份驗證，不然哪天改了其中一邊，另一邊會安靜地放行壞資料。
   ⚠ 貼進來的東西要當成「可能是任何東西」：不是 JSON、是一個陣列、
     parts 包在別的地方、題型根本不存在——每一種都要講得出原因，
     不可以只回「讀不到」（老師會不知道要改哪裡）。 */
function examPaperFromText(text) {
  const raw = String(text || '').trim();
  if (!raw) return { error: '沒有貼上任何東西。' };
  /* 連 ```json 圍欄一起貼進來是最常見的（從對話框複製就會帶著） */
  const body = raw.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  /* ⚠ **先照原樣試一次**，失敗才去掐頭去尾。
     第一版直接「抓第一個 { 到最後一個 }」，結果整份貼一個 **陣列**
     （[{…},{…}]）會被切成 `{…},{…}` ＝本來讀得進來的東西反而壞掉。 */
  const tries = [body];
  const a = body.indexOf('{'), b = body.lastIndexOf('}');
  if (a > 0 || (b >= 0 && b < body.length - 1)) tries.push(body.slice(a, b + 1));
  const a2 = body.indexOf('['), b2 = body.lastIndexOf(']');
  if (a2 >= 0 && b2 > a2) tries.push(body.slice(a2, b2 + 1));
  let data = null, err = '';
  for (const t of tries) {
    if (!t || !t.trim()) continue;
    try { data = JSON.parse(t); break; } catch (e) { err = err || (e.message || ''); }
  }
  if (data == null) return { error: '這不是一份完整的考卷資料（JSON 解析失敗）：' + err };
  if (Array.isArray(data)) data = { sections: data };
  if (!data || typeof data !== 'object') return { error: '讀到的東西不是一份考卷。' };
  let secsIn = data.sections || data.Sections || data.item && data.item.sections;
  if (!Array.isArray(secsIn)) return { error: '裡面沒有 sections（一份考卷至少要有一個 Section）。' };

  const skipped = [];
  const sections = secsIn.map((sc, si) => {
    const partsIn = Array.isArray(sc && sc.parts) ? sc.parts : [];
    const parts = partsIn.map(p => {
      const got = _examCleanPart(p);
      if (!got) {
        const k = (p && p.kind) || '(沒寫題型)';
        skipped.push(`第 ${si + 1} 區的「${(p && p.title) || k}」：`
          + (EXAM_KINDS[k] ? '內容不完整，收不進來' : `沒有「${k}」這種題型`));
      }
      return got;
    }).filter(Boolean);
    return { name: String((sc && sc.name) || '').trim() || `Section ${si + 1}`,
             pct: +(sc && sc.pct) || 0, parts };
  }).filter(sc => sc.parts.length);

  if (!sections.length) return { error: '一大題都沒收到。' + (skipped[0] ? '（' + skipped[0] + '）' : '') };
  const item = { type: 'exam', title: String(data.title || '').trim(),
                 examKicker: String(data.examKicker || '').trim(), sections };
  /* ⭐ 一樣丟進老師手打考卷用的那組檢查，配分對不對馬上看得到 */
  return { item, sections, title: item.title, examKicker: item.examKicker,
           skipped, warnings: examWarnings(item),
           n: sections.reduce((x, sc) => x + sc.parts.length, 0) };
}


/* ══════════════════════════════════════════════════════════════════════════
   v561 🗣 跟 AI 一來一往出一份大考考卷（Alan：「我要可以跟 AI 溝通說題目應該怎麼出，
        以及出了之後哪邊需要改」）
   ──────────────────────────────────────────────────────────────────────────
   ⭐ 分工（跟其他地方同一個原則）：AI 只負責「擬草稿、照老師的意見改草稿」，
     對不對、夠不夠、有沒有照他說的做，一律**程式**檢查（examDraftChecks）：
       · 🔴 程式查得出來的錯（答案不在詞庫裡、配分不是 100、他指定要考的字沒出現…）
         → 一定要改，畫面上紅色
       · 🟡 程式查不出來的（選擇題的答案是 AI 讀文章判斷的、句子通不通順）
         → 請老師看過，畫面上黃色
   ⚠ 草稿每一輪都是**整份重送**（目前草稿 ＋ 他的新意見 → 新草稿），
     不是只傳差異——模型改一題時順手動到別題的風險，由「改前改後比對」顯示出來。
   ⚠ 它不會自己存。老師按「存成考卷」才會進週次，之後在編輯單元裡還能手改。 */
const EXAM_DRAFT_SYS = `You help a Taiwanese elementary English teacher (Tr. Alan, Kang Chiao school) DRAFT a
scored exam paper for his students, in a back-and-forth conversation. You output the WHOLE current draft
every time, as JSON. The teacher reads it, tells you what to change, and you output the whole draft again.

THE TEACHER'S WORDS ARE THE SPEC
- When he lists words, grammar points, or pastes a passage, use EXACTLY those. Never swap in other words,
  never invent a passage when he gave one, never drop a word he asked for.
- "words": copy back the list of vocabulary words he said MUST be tested (empty if he gave none).
  The website checks that each one really appears in the draft.
- If he did not say how many questions or how many points, pick a sensible default AND say so in "reply".
- If something essential is missing (no passage for a reading section, no words for a vocabulary section),
  do NOT make it up: leave that section out and ask ONE short question in "ask".
- Total must be 100 points unless he says otherwise. Copy the style of Kang Chiao Formative papers:
  Section 1 Word Study, Section 2 Vocabulary, Section 3 Reading, with a "pct" for each section.

"parts" may ONLY use these kinds (write every English word exactly):
  "circle"   passage + "check" (vce|team|digraph|suffix|prefix|diphthong) + "checkArg" (patterns separated by SPACES) + "need" N.
             The passage MUST really contain at least N matching words.
  "cloze"    "bank":[...], "items":[{"text":"The workers drove a ___ to clear the dirt.","answer":"bulldozer"}].
             🔴 Every answer MUST be in the bank; each bank word is used ONCE; as many items as bank words
             unless he says otherwise; the sentence must have only ONE bank word that fits.
  "quiz"     "questions":[{"q":"...","options":[4 options],"answer":<0-based index>}], optional "passage".
             🔴 Every question must be answerable from the passage. Spread the correct answers over A/B/C/D.
  "order"    "events":[sentences in the CORRECT chronological order], optional "passage".
  "affix"    "affixes":["mis-","en-"], "need" N, "minWords" 5.
  "usewords" "bank":[...], "need" N, "minWords" 6.
  "fixbox"   "passage" with mistakes left in, "answers":[the corrected words with correct capitals].
  "evidence" "question", "passage", "need" N, "minWords" 5.
  "genq"     "passage", "need" N.
  "storymap" "passage", "need" N.
  "essay"    "prompt", "vocab":[...], "paras", "sentsPerPara", "rubricSet":"writing".
  "short"    "questions":[{"q":"...","pts":N}], "rubricSet":"summary" for a summary task. Marked by the teacher.
Every part: "title" (e.g. "Part 1: Fill in the blanks."), "pts" (the TOTAL for the part), and any
"instruction". Anything the teacher wants that none of these can do: say so in "reply", do not fake it.

NOTES FOR THE TEACHER — "notes":[{"at":"Section 2 · Part 1","why":"..."}]
List what he should double-check yourself: answers you decided by reading, a sentence you are unsure
reads naturally, a point total you chose, a guess about the level. One short Traditional Chinese sentence each.
Do NOT list generic things. If you have nothing to flag, notes is [].

REPLY — "reply": 1–3 short Traditional Chinese sentences to the teacher: what you did this round, what you
assumed (default numbers!), and what changed compared to the previous draft. Never say you checked
something the website checks (spelling of answers, 100 points) — the website does that.

Output ONLY JSON:
{"reply":"","ask":"","title":"","words":[],
 "sections":[{"name":"Section 2: Vocabulary","pct":32,"parts":[ ... ]}],
 "notes":[{"at":"","why":""}]}
If you are only asking a question, return "sections": null and put the question in "ask".
When you are given a CURRENT DRAFT and an instruction, change ONLY what the instruction asks.`;

/* 草稿 → 一份 exam 單元（走跟拍考卷同一條清洗路線） */
function _examDraftItem(o, prevTitle) {
  const secs = (Array.isArray(o.sections) ? o.sections : []).map(sc => ({
    name: String((sc && sc.name) || '').trim(),
    pct: +((sc && sc.pct) || 0) || 0,
    parts: (Array.isArray(sc && sc.parts) ? sc.parts : []).map(pt => {
      const c = _examCleanPart(pt);
      return c ? { ...c, ...(String(pt && pt.passage || '').trim() && (c.kind === 'quiz' || c.kind === 'order' || c.kind === 'short')
                            ? { readText: String(pt.passage).trim() } : {}) } : null;
    }).filter(Boolean),
  })).filter(sc => sc.parts.length);
  const dropped = [];
  (Array.isArray(o.sections) ? o.sections : []).forEach(sc => (Array.isArray(sc && sc.parts) ? sc.parts : []).forEach(pt => {
    if (pt && !_examCleanPart(pt)) dropped.push(String(pt.title || pt.kind || '一大題').slice(0, 40));
  }));
  return { item: { type: 'exam', title: String(o.title || prevTitle || '').trim() || '大考考卷', examMood: true, sections: secs }, dropped };
}

/* 程式把關：回傳 [{ level:'bad'|'check', at, why }]。
   'bad' 是程式**確定**有問題；'check' 是程式查不出來、要老師看過的。 */
function examDraftChecks(item, mustWords, aiNotes) {
  const out = [];
  const norm = (t) => String(t || '').trim().toLowerCase();
  /* examWarnings 裡「第幾大題第幾句」那幾條，下面各大題的檢查會講得更清楚，這裡不重複 */
  (examWarnings(item) || []).filter(w => !/大題第 \d+ 句/.test(w)).forEach(w => out.push({ level: 'bad', at: '整份', why: w }));
  const allText = [];
  (item.sections || []).forEach((sc, si) => (sc.parts || []).forEach((pt, pi) => {
    const at = `${sc.name || 'Section ' + (si + 1)} · ${pt.title ? pt.title.split(/[:：.—-]/)[0].trim() : 'Part ' + (pi + 1)}`;
    const push = (level, why) => out.push({ level, at, why, si, pi });
    allText.push(JSON.stringify(pt).toLowerCase());
    if (pt.kind === 'cloze') {
      const bank = (pt.bank || []).map(norm);
      const used = {};
      (pt.items || []).forEach((it, i) => {
        const a = norm(it.answer);
        if (!a) push('bad', `第 ${i + 1} 句沒有答案。`);
        else if (bank.indexOf(a) < 0) push('bad', `第 ${i + 1} 句的答案「${it.answer}」不在詞庫裡。`);
        else if (used[a]) push('bad', `「${it.answer}」被用了兩次（詞庫每個字只能用一次）。`);
        used[a] = 1;
        if (!/_{2,}/.test(it.text || '')) push('bad', `第 ${i + 1} 句沒有空格（___）。`);
      });
      const unused = bank.filter(b => !used[b]);
      if (unused.length && (pt.items || []).length >= bank.length) push('bad', `詞庫的「${unused.join('、')}」沒有任何一句用到。`);
      push('check', '每一句是不是「只有一個字填得進去」，程式判不出來，請你快速看過。');
    }
    if (pt.kind === 'quiz') {
      const qs = pt.questions || [];
      const dist = {}; qs.forEach(q => { dist[q.answer] = (dist[q.answer] || 0) + 1; });
      if (qs.length >= 4 && Object.keys(dist).length === 1) push('bad', '所有選擇題的正確答案都是同一個選項（' + 'ABCD'[qs[0].answer] + '），學生一猜就中。');
      qs.forEach((q, i) => {
        const o = (q.options || []).map(norm);
        if (new Set(o).size < o.length) push('bad', `第 ${i + 1} 題有兩個一模一樣的選項。`);
      });
      if (!pt.readText) push('check', '這一大題沒有附文章——如果題目要「根據文章」回答，請在上方補上。');
      push('check', '正確答案是 AI 讀文章判斷的，請你至少看過一遍（尤其是推論題）。');
    }
    if (pt.kind === 'order') push('check', '事件順序是 AI 讀文章排出來的，請確認哪個先、哪個後。');
    if (pt.kind === 'circle') push('check', '短文裡符合的字數程式已經數過；通不通順請你看一下。');
    if (pt.kind === 'short' || pt.kind === 'essay') push('check', '這一大題由你批改，不會自動給分。');
  }));
  /* 他指定要考的字，真的出現在草稿裡嗎？（比對字根，tests／tested 都算） */
  const hay = allText.join(' ');
  (mustWords || []).map(norm).filter(Boolean).forEach(w => {
    const stem = w.length > 4 ? w.replace(/(ing|ed|es|s|e)$/, '') : w;
    if (hay.indexOf(w) < 0 && hay.indexOf(stem) < 0) out.push({ level: 'bad', at: '你指定的字', why: `你說要考「${w}」，但草稿裡找不到它。` });
  });
  (aiNotes || []).forEach(n => { if (n && n.why) out.push({ level: 'check', at: String(n.at || 'AI 提醒'), why: String(n.why) }); });
  return out;
}

/* 一輪對話：history＝[{role:'user'|'ai', text}]，draft＝目前的 exam 單元（或 null）。
   回傳 { reply, ask, item, notes, words, checks, dropped }；AI 連不上就丟錯。 */
async function aiDraftExam({ message, history, draft, mustWords, grade }) {
  const hist = (history || []).slice(-8).map(h => `${h.role === 'user' ? 'TEACHER' : 'YOU'}: ${h.text}`).join('\n');
  const cur = draft && (draft.sections || []).length
    ? '\n\nCURRENT DRAFT (output the whole thing again, changing only what he asks):\n' + JSON.stringify({ title: draft.title, sections: draft.sections.map(sc => ({ name: sc.name, pct: sc.pct, parts: sc.parts.map(p => { const { readText, ...r } = p; return readText ? { ...r, passage: readText } : r; }) })) })
    : '\n\n(There is no draft yet.)';
  const user = `Grade: ${grade || 'unknown'}\n${hist ? 'CONVERSATION SO FAR:\n' + hist + '\n' : ''}\nTEACHER NOW SAYS:\n${message}${cur}`;
  const o = await _aiAsk(
    { model: GN_READ_MODEL, max_tokens: 9000, system: EXAM_DRAFT_SYS, messages: [{ role: 'user', content: user }] },
    (data) => {
      const txt = (data?.content || []).filter(b => b && b.type === 'text').map(b => b.text).join('') || data?.content?.[0]?.text || '';
      const j = _gnSalvageJson(_aiStripFence(txt));
      return (j && typeof j === 'object') ? j : null;
    }, 150000);
  if (!o) throw new Error('AI 沒有回應，請再送一次。');
  const words = (Array.isArray(o.words) ? o.words : (mustWords || [])).map(x => String(x).trim()).filter(Boolean);
  const hasDraft = Array.isArray(o.sections) && o.sections.length;
  if (!hasDraft) return { reply: String(o.reply || '').trim(), ask: String(o.ask || '').trim(), item: draft || null, notes: [], words, checks: draft ? examDraftChecks(draft, words, []) : [], dropped: [], same: true };
  const { item, dropped } = _examDraftItem(o, draft && draft.title);
  const notes = (Array.isArray(o.notes) ? o.notes : []).filter(n => n && n.why).slice(0, 12);
  return { reply: String(o.reply || '').trim(), ask: String(o.ask || '').trim(), item, notes, words,
           checks: examDraftChecks(item, words, notes), dropped, same: false };
}

Object.assign(window, { aiReadExamSheet, EXAM_READ_SYS, examPaperFromText, aiDraftExam, examDraftChecks, EXAM_DRAFT_SYS, examApplyKey, examVerifyQuiz, examExplain, aiExplainExam, examCleanKey: _examCleanKey });

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
  quiz:   { zh: '選擇題', auto: true },         // Part 4：閱讀理解
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
  if (part.kind === 'cloze')  return (part.items || []).length;
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
/* 一項準則可以給哪些分數：整套有等第就用等第；沒有就是 0 ~ 這一項的滿分 */
function examBandsOf(R, c) {
  if (c && c.max && !(R && R.hasBands)) {
    return Array.from({ length: c.max + 1 }, (_, i) => ({ n: c.max - i, zh: '' }));
  }
  return (R && R.bands) || [];
}
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

/* ── 大題內容的文字格式（編輯器用）────────────────────────────────────
   站上其他編輯器都是「一行一筆」的純文字，考卷沿用同一套習慣，
   老師可以直接貼、直接改，不用面對一堆巢狀表單。

     circle   第一行＝要圈什麼（vce / team / digraph / suffix:-ing）
              第二行以後＝短文
     cloze    第一行＝詞庫（逗號分隔）
              之後每行＝ 句子（用 ___ 當空格） | 答案
     quiz     每行＝ 題目 | 選項1 | 選項2 | 選項3 | 正解編號(從1算)
     short    每行＝ 題目 | 配分 | 評分重點(可省略)
   ⚠ 一律用「|」分欄：康橋的題目裡逗號很多，用逗號分欄一定出事。 */
function examPartText(part) {
  const p = part || {};
  if (p.kind === 'circle') return [p.check + (p.checkArg ? ':' + p.checkArg : ''), p.passage || ''].join('\n');
  if (p.kind === 'cloze') return [(p.bank || []).join(', ')]
    .concat((p.items || []).map(q => `${q.text || ''} | ${q.answer || ''}`)).join('\n');
  if (p.kind === 'quiz') return (p.questions || [])
    .map(q => [q.q].concat(q.options || []).concat([(+q.answer || 0) + 1]).join(' | ')).join('\n');
  if (p.kind === 'short') return (p.questions || [])
    .map(q => [q.q, q.pts || '', q.rubric || ''].join(' | ').replace(/\s*\|\s*$/, '')).join('\n');
  if (p.kind === 'affix') return (p.affixes || []).join(' ');
  if (p.kind === 'genq') return String(p.passage || '');
  if (p.kind === 'storymap') return String(p.passage || '');
  if (p.kind === 'usewords') return (p.bank || []).join(' ');
  if (p.kind === 'fixbox') return [(p.answers || []).join(', '), '', String(p.passage || '')].join('\n');
  if (p.kind === 'order') return (p.events || []).join('\n');
  if (p.kind === 'evidence') return [String(p.question || ''), '', String(p.passage || '')].join('\n');
  if (p.kind === 'essay') return [String(p.prompt || ''), '', (p.vocab || []).join(', ')].join('\n');
  if (p.kind === 'table') return [(p.headers || []).join(' | '), String(examPartN(p))].join('\n');
  if (p.kind === 'draw') return String(p.prompt || '');
  if (p.kind === 'checkin') return (p.goals || []).join('\n');
  return '';
}
function examParsePart(kind, text) {
  const lines = String(text || '').split('\n').map(l => l.replace(/\s+$/, ''));
  const nonEmpty = lines.filter(l => l.trim());
  if (kind === 'circle') {
    const head = (nonEmpty[0] || '').trim();
    const i = head.indexOf(':');
    return { check: (i >= 0 ? head.slice(0, i) : head).trim().toLowerCase(),
             checkArg: i >= 0 ? head.slice(i + 1).trim() : '',
             passage: lines.slice(lines.indexOf(nonEmpty[0]) + 1).join('\n').trim() };
  }
  if (kind === 'cloze') {
    const bank = (nonEmpty[0] || '').split(/[,，]/).map(x => x.trim()).filter(Boolean);
    const items = nonEmpty.slice(1).map(l => {
      const c = l.split('|');
      return { text: (c[0] || '').trim(), answer: (c[1] || '').trim() };
    }).filter(q => q.text && q.answer);
    return { bank, items };
  }
  if (kind === 'quiz') {
    const questions = nonEmpty.map(l => {
      const c = l.split('|').map(x => x.trim());
      const ansNo = parseInt(c[c.length - 1], 10);
      const opts = c.slice(1, -1).filter(Boolean);
      if (!c[0] || opts.length < 2 || !(ansNo >= 1 && ansNo <= opts.length)) return null;
      return { q: c[0], options: opts, answer: ansNo - 1 };
    }).filter(Boolean);
    return { questions };
  }
  if (kind === 'affix') {
    /* 一行就是字尾表：-ing -ed -s -est（空白或逗號分開） */
    return { affixes: (nonEmpty.join(' ').split(/[\s,，]+/).map(x => x.trim()).filter(Boolean)).slice(0, 8) };
  }
  if (kind === 'genq' || kind === 'storymap') {
    return { passage: lines.join('\n').trim() };
  }
  if (kind === 'order') {
    /* 一行一個事件，**照正確的順序**寫（最早的在最上面）。畫面上會自動打亂給學生。 */
    return { events: nonEmpty.map(l => l.trim()).slice(0, 10) };
  }
  if (kind === 'fixbox') {
    /* 第一行＝改好的那幾個字（逗號分開），空一行之後是那一段文章 */
    const answers = (nonEmpty[0] || '').split(/[,，]/).map(x => x.trim()).filter(Boolean);
    const i = lines.indexOf(nonEmpty[0]);
    return { answers, passage: lines.slice(i + 1).join('\n').trim(), need: answers.length };
  }
  if (kind === 'evidence') {
    /* 第一行＝要問的問題，空一行之後＝那篇文章。
       ⚠ 只存 passage 的話，學生畫面上會變成「兩個空格、沒有題目」。 */
    const gap = lines.findIndex((l, i) => i > 0 && !l.trim());
    return { question: (gap > 0 ? lines.slice(0, gap) : [lines[0] || '']).join(' ').trim(),
             passage: (gap > 0 ? lines.slice(gap + 1) : lines.slice(1)).join('\n').trim() };
  }
  if (kind === 'table') {
    /* 第一行＝欄名（用 | 分開，2~3 欄），第二行＝幾列 */
    const headers = (nonEmpty[0] || '').split('|').map(x => x.trim()).filter(Boolean).slice(0, 3);
    const rows = Math.max(1, Math.min(12, parseInt(nonEmpty[1], 10) || 3));
    return { headers, need: rows };
  }
  if (kind === 'draw') return { prompt: lines.join('\n').trim() };
  if (kind === 'essay') {
    /* 第一行（到空行為止）＝題目，空行之後那一行＝這一課的單字（逗號分開） */
    const gap = lines.findIndex((l, i) => i > 0 && !l.trim());
    const prompt = (gap > 0 ? lines.slice(0, gap) : lines).join('\n').trim();
    const vocabLine = gap > 0 ? (lines.slice(gap + 1).find(l => l.trim()) || '') : '';
    return { prompt, vocab: vocabLine.split(/[,，]/).map(x => x.trim()).filter(Boolean) };
  }
  if (kind === 'checkin') {
    return { goals: nonEmpty.map(l => l.trim()) };
  }
  if (kind === 'usewords') {
    /* 一行就是詞庫，空白或逗號分開 */
    return { bank: (nonEmpty[0] || '').split(/[\s,，]+/).map(x => x.trim()).filter(Boolean) };
  }
  if (kind === 'short') {
    const questions = nonEmpty.map(l => {
      const c = l.split('|').map(x => x.trim());
      if (!c[0]) return null;
      return { q: c[0], pts: +c[1] || 0, rubric: c[2] || '' };
    }).filter(Boolean);
    return { questions };
  }
  return {};
}
/* 出卷時的自我檢查——老師最常犯的三件事，直接寫在畫面上 */
function examWarnings(item) {
  const w = [];
  const T = examTotals(item);
  if (!T.parts) { w.push('這份卷子還沒有任何大題。'); return w; }
  if (T.total !== 100) w.push(`配分加起來是 ${T.total} 分，不是 100 分。`);
  (item.sections || []).forEach((sec, si) => (sec.parts || []).forEach((pt, pi) => {
    const where = `${sec.name || '第 ' + (si + 1) + ' 區'} 的第 ${pi + 1} 大題`;
    const n = examPartN(pt);
    if (pt.kind !== 'checkin') {
      if (!n) w.push(`${where}一題都沒有。`);
      if (!(examPtsOf(pt) > 0)) w.push(`${where}沒有配分。`);
    }
    /* v586：題目在問「the text／the passage／the author」，卻沒有附任何文章 → 學生沒東西可讀（卷子上那篇不在這份 PDF 裡時最常發生） */
    if ((pt.kind === 'quiz' || pt.kind === 'short') && !(sec.parts || []).some(x => String(x.readText || x.passage || '').trim())
        && (pt.questions || []).some(q => /\b(according to the (text|passage|story)|the (text|passage|story|selection)|the author|in the (text|passage|story))\b/i.test(String((q && q.q) || '')))) {
      w.push(`${where}的題目在問一篇文章（the text／the author），但沒有附文章——請在編輯單元貼上那篇文章。`);
    }
    /* v536 的兩種新題型 */
    if (pt.kind === 'storymap' && !String(pt.passage || '').trim()) {
      w.push(`${where}沒有文章——學生看不到故事，就沒辦法填開頭／中間／結尾。`);
    }
    if (pt.kind === 'fixbox') {
      /* ⭐ 真的去文章裡找——老師說「改好是 Monday」，文章裡卻沒有 monday，
         那學生永遠找不到（跟圈選那一題同一種檢查）。 */
      const low = String(pt.passage || '').toLowerCase();
      const miss = (pt.answers || []).filter(a => low.indexOf(String(a).toLowerCase()) < 0);
      if (!String(pt.passage || '').trim()) w.push(`${where}沒有那一段文章。`);
      else if (miss.length) w.push(`${where}的答案「${miss.join('、')}」在文章裡找不到。`);
    }
    if (pt.kind === 'table' && (pt.headers || []).length < 2) w.push(`${where}要有至少兩個欄名（例如：左邊找字詞、右邊寫說明）。`);
    if (pt.kind === 'draw' && !String(pt.prompt || '').trim()) w.push(`${where}沒有寫要畫什麼。`);
    if (pt.kind === 'order') {
      const ev = (pt.events || []).filter(Boolean);
      if (ev.length < 2) w.push(`${where}至少要兩個事件才排得出順序。`);
      if (new Set(ev.map(x => x.toLowerCase())).size < ev.length) w.push(`${where}有兩個一樣的事件。`);
    }
    if (pt.kind === 'evidence' && !String(pt.passage || '').trim()) {
      w.push(`${where}沒有文章——學生沒辦法「從文章裡找細節」。`);
    }
    if (pt.kind === 'essay' && !String(pt.prompt || '').trim()) {
      w.push(`${where}沒有寫作題目。`);
    }
    if (pt.kind === 'usewords') {
      const bank = (pt.bank || []).filter(Boolean);
      const need = +pt.need || 2;
      if (bank.length < need) w.push(`${where}要造 ${need} 個句子，但詞庫只有 ${bank.length} 個字。`);
    }
    if (pt.kind === 'short' && pt.rubricSet === 'writing' && (pt.questions || []).length > 1) {
      w.push(`${where}用的是「寫作七項」rubric，通常只會有一題（整篇作文）。`);
    }
    if (pt.kind === 'circle') {
      if (!WS_CHECKS[String(pt.check || '').toLowerCase()]) w.push(`${where}的「要圈什麼」程式看不懂：${pt.check || '(空的)'}`);
      else {
        /* ⭐ 真的拿檢查器去數短文裡有幾個符合——老師說要圈 10 個，
           文章裡只有 7 個的話，學生永遠圈不滿。 */
        const words = examTokens(pt.passage).filter(t => t.w).map(t => t.t);
        const hit = words.filter(x => examCircleHit(x, pt) === true);
        const need = +pt.need || n;
        if (hit.length < need) w.push(`${where}要圈 ${need} 個，但短文裡只有 ${hit.length} 個符合。`);
      }
    }
    if (pt.kind === 'affix') {
      const aff = pt.affixes || [];
      if (aff.length < 2) w.push(`${where}的字尾表至少要兩個（考卷寫「two of the suffixes」）。`);
      aff.forEach(a => { if (!/^-|-$/.test(String(a))) w.push(`${where}的「${a}」沒有寫成 -ing 或 un- 這種形式，程式判不出來是字首還是字尾。`); });
      if ((+pt.need || 2) > aff.length) w.push(`${where}要造 ${+pt.need || 2} 個字，但字尾表只有 ${aff.length} 個。`);
    }
    if (pt.kind === 'genq' && !String(pt.passage || '').trim()) {
      w.push(`${where}沒有文章——「自己出問題」要有東西可以讀。`);
    }
    if (pt.kind === 'cloze') {
      (pt.items || []).forEach((q, i) => {
        if (String(q.text || '').indexOf('___') < 0) w.push(`${where}第 ${i + 1} 句沒有 ___ 空格。`);
        if ((pt.bank || []).every(b => String(b).toLowerCase() !== String(q.answer).toLowerCase()))
          w.push(`${where}第 ${i + 1} 句的答案「${q.answer}」不在詞庫裡。`);
      });
    }
  }));
  return w;
}

Object.assign(window, { examLoadDict, examNeedsDict, examAffixDetect, examAffixZh, examWordFormRe, examOrderShuffle, EXAM_KINDS, examPartN, examTotals, examScorePart, examScore, examTokens,
  examPartText, examParsePart, examWarnings, examAffixOne, examGenqOne,
  EXAM_STORY_SECTIONS, examStoryOne, examUseWordOne,
  examFixBoxScore, examEvidenceOne, examEssayStats, examPtsOf, _evSentences,
  examCircleCheck, examCircleHit,
  EXAM_RUBRIC, EXAM_RUBRIC_MAX, EXAM_RUBRIC_SETS, examRubricOf, examBandsOf, EXAM_ERR_RULE, examErrDeduct,
  examRubricPoints, examRubricPart, aiGradeRubric, examAiMarkPart });

/* ══════════════════════════════════════════════════════════════════════════
   v513（Alan 的 AI 清單第三順位）📝 考前複習包
   ──────────────────────────────────────────────────────────────────────────
   外師每 3 週、中師每 4 週一次 formative（Alan 親口講的），
   而 pacingNextFormative 早就知道下一次在第幾週。缺的只是
   「那一次考試涵蓋哪幾週、那幾週教過哪些字」——把它接起來，考前複習就幾乎免費。

   ⭐ 這一版刻意**不新寫一套出題 AI**：
     題目交給已經驗過很多次的 QuickSetModal（一鍵出單字 7 種題型，
     而且 v466 的 avoid 機制會讓題目跟原本那幾週不一樣）。
     這裡只負責 AI 做不好、程式做得準的那一段：**算範圍、把字撈齊**。
   ══════════════════════════════════════════════════════════════════════════ */

/* 下一次 formative 涵蓋哪幾週。
   涵蓋範圍＝「上一次 formative 之後」到「這一次」為止；
   前面沒有考過就從第 1 週算起。 */
function examRange(pace, weekId, side) {
  const n = pacingWeekNo(weekId);
  if (!n || !Array.isArray(pace)) return null;
  const rows = pace.filter(w => w[side] && w[side].assess).sort((a, b) => a.n - b.n);
  const next = rows.find(w => w.n >= n);
  if (!next) return null;
  const prev = rows.filter(w => w.n < next.n).pop();
  return {
    side, wk: next.n, name: next[side].assess,
    from: prev ? prev.n + 1 : 1, to: next.n,
    in: next.n - n,
  };
}

/* 那幾週教過的字與主題——純程式，不花錢也不會編。
   單字從每一週每一類的單元反推（reviewWordsOf 本來就會：
   沒有單字卡時從配對／聽寫／短文填空挖出來）。 */
function examSource(weeks, weekOrder, range, categories) {
  const out = { words: [], topics: [], weeks: [], dup: 0 };
  if (!range || !weeks || !weekOrder) return out;
  const cats = (categories && categories.length) ? categories : (CATEGORIES || []);
  const seen = new Map();
  weekOrder.forEach(wid => {
    const n = pacingWeekNo(wid);
    if (!n || n < range.from || n > range.to) return;
    const w = weeks[wid];
    if (!w || w.archived) return;
    let got = 0;
    cats.forEach(c => {
      const items = (w.items || {})[c.id] || [];
      if (!items.length) return;
      /* 一週一類裡可能有好幾組（一課一組），照組收才不會只拿到第一組 */
      const groups = (window.qmGroupByArticle ? window.qmGroupByArticle(items) : [{ items }]);
      groups.forEach(g => {
        const list = g.items || (g.single ? [g.single] : []);
        if (!list.length) return;
        if (g.name && out.topics.indexOf(g.name) < 0) out.topics.push(g.name);
        (reviewWordsOf(list) || []).forEach(x => {
          const k = String(x.term || '').toLowerCase().trim();
          if (!k) return;
          if (seen.has(k)) { out.dup++; return; }        // 同一個字跨週重複出現只收一次
          seen.set(k, x); out.words.push(x); got++;
        });
      });
    });
    out.weeks.push({ wid, n, label: w.label || wid, n_words: got });
  });
  return out;
}

/* 丟給 QuickSetModal 的貼上格式：英文 - 中文 - 例句 - 英文定義
   （跟 app.jsx「在這一組再出一份」用的格式一模一樣，不另外發明一種） */
function examPasteText(words) {
  return (words || []).map(w => [w.term, w.zh, w.example, w.def]
    .map(x => String(x || '').trim()).filter(Boolean).join(' - ')).join('\n');
}

Object.assign(window, { examRange, examSource, examPasteText });

/* ══════════════════════════════════════════════════════════════════════════
   v512（Alan 的 AI 清單第二順位）🪄 上課紀錄自動擬草稿
   ──────────────────────────────────────────────────────────────────────────
   他一週要填 20 筆（10 個孩子 × 2 堂），全部手打。材料其實全都已經在系統裡：
     · 上一堂寫的「下次進度」          （v496 已經自動帶進「這次上了什麼」）
     · 學校那一週的進度表              （v493~v503，含書名與頁碼、粗體只教那幾頁）
     · 下一週的學校進度                （拿來寫「下次進度」）
     · 上一堂交代的功課 ＋ 這次複習做了沒
   以前是把這些用「、」串起來貼進去；現在讓 AI 寫成老師會寫的句子，
   而且**連回家功課與下次進度一起擬**——那兩欄本來每次都要重打。

   🔴 這個功能最危險的地方不是寫得好不好，是**頁碼編出來**。
      「LAW p20-23」寫成「LAW p99-105」，家長照著做、小孩寫錯整份，
      而且畫面上看起來完全正常。
   → lessonDraftBadPages()：把草稿裡提到的頁碼跟學校進度表比對，
     對不上的直接標紅給 Alan 看。不自動刪（刪了會把句子弄壞），但絕不放它安靜過去。
   ══════════════════════════════════════════════════════════════════════════ */

/* 一段頁碼字串（"20-23"、"p.8, 10"）裡所有「被涵蓋到」的頁數 */
function _paceNums(s) {
  const out = new Set();
  String(s || '').replace(/(\d+)\s*[-–—~]\s*(\d+)|(\d+)/g, (m, a, b, c) => {
    if (a && b) {
      const lo = Math.min(+a, +b), hi = Math.max(+a, +b);
      if (hi - lo <= 80) for (let i = lo; i <= hi; i++) out.add(i);
    } else if (c) out.add(+c);
    return m;
  });
  return out;
}
/* 學校進度表「允許出現」的頁碼。可以給一週，也可以給好幾週
   （「下次進度」本來就會寫到下一週的頁數——只比對這一週會誤報）。 */
function pacingPageSet(wk) {
  const set = new Set();
  const weeks = Array.isArray(wk) ? wk : [wk];
  weeks.forEach(w => [w && w.it, w && w.lt].forEach(side => {
    if (!side) return;
    pacingBooks(side).forEach(b => _paceNums(b.pages).forEach(n => set.add(n)));
    (side.grammarBold || []).forEach(n => set.add(+n));
  }));
  return set;
}
/* 草稿裡提到、但學校進度表上沒有的頁碼 */
function lessonDraftBadPages(text, wk) {
  const allow = pacingPageSet(wk);
  if (!allow.size) return [];                       // 沒進度表可比對就不要亂標紅
  const bad = [];
  String(text || '').replace(/(?:pp?\.?\s*|頁\s*)(\d+)(?:\s*[-–—~]\s*(\d+))?/gi, (m, a, b) => {
    [a, b].filter(Boolean).map(Number).forEach(n => {
      if (!allow.has(n) && bad.indexOf(n) < 0) bad.push(n);
    });
    return m;
  });
  return bad;
}

const AI_LESSON_SYS = `You are helping a Taiwanese one-on-one English tutor write his own lesson record,
in Traditional Chinese, in his own terse style. You are writing a DRAFT he will edit — not a report.

His style (copy it):
  這次上了什麼: "Prefixes mis-, en-, & em-\\nComplex Sentences & Subordinating Conjunctions"
  回家功課:     "Prefixes mis-, en-, & em- 學習單\\nLAW p20-23"
  下次進度:     "複習Feathers Not Just For Flying 單字\\n文法\\nUnseen Reading about informational text"

Rules:
- Keep English book titles, unit names and grammar terms in ENGLISH exactly as given.
  Only the connecting words are Chinese. Never translate a unit name.
- One item per line. No bullets, no numbering, no full sentences, no praise, no filler.
- 回家功課 must be things a child can actually go home and do: a worksheet, a workbook page range,
  vocabulary to memorise. Use the book names and page numbers you were given.
- 🔴 NEVER invent a page number. Only use page numbers that appear in SCHOOL PROGRESS below.
  If you are not given a page number for something, just name the book or the worksheet without pages.
- 下次進度 should continue from this lesson and look at NEXT WEEK's school progress.
- If the child did not finish last time's homework, carry it into 下次進度.

Output ONLY JSON: {"did":"…","hw":"…","next":"…"}`;

/* ctx = { name, grade, dateISO, weekNo, cur, nextWk, prev, review } */
async function aiDraftLesson(ctx) {
  const c = ctx || {};
  const side = (lab, sd) => {
    if (!sd) return '';
    const bk = pacingBooks(sd).map(b => `${b.book} ${b.pages}`).join('、');
    const bits = [
      sd.reading && `課文 ${pacingClean(sd.reading)}`,
      sd.vocab && `單字 ${pacingClean(sd.vocab)}`,
      sd.wordStudy && `Word Study ${pacingClean(sd.wordStudy)}`,
      sd.skill && `技巧 ${pacingClean(sd.skill)}`,
      sd.grammar && `文法 ${pacingClean(sd.grammar)}`,
      sd.grammarHw && sd._carry && `（文法作業沿用 ${pacingClean(sd.grammarHw)}）`,
      (sd.grammarBold || []).length && `只教 pp. ${sd.grammarBold.join(', ')}`,
      bk && `書本頁數：${bk}`,
    ].filter(Boolean);
    return bits.length ? `${lab}\n  ` + bits.join('\n  ') : '';
  };
  const msg = [
    `STUDENT: ${c.name || ''}  (${c.grade || ''})`,
    `THIS LESSON: ${c.dateISO || ''}${c.weekNo ? `  = school week ${c.weekNo}` : ''}`,
    '',
    'SCHOOL PROGRESS — THIS WEEK',
    side('外師 (foreign teacher)', c.cur && c.cur.it),
    side('中師 (local teacher)', c.cur && c.cur.lt),
    '',
    'SCHOOL PROGRESS — NEXT WEEK',
    side('外師 (foreign teacher)', c.nextWk && c.nextWk.it),
    side('中師 (local teacher)', c.nextWk && c.nextWk.lt),
    '',
    'LAST LESSON',
    c.prev ? `  上了: ${c.prev.did || '—'}\n  功課: ${c.prev.hw || '—'}\n  當時寫的下次進度: ${c.prev.next || '—'}` : '  （沒有上一堂）',
    c.review ? `  這次來，上次的複習／功課: ${c.review}` : '',
  ].filter(x => x !== '').join('\n');

  let got = null;
  try { got = await _gnCall(AI_LESSON_SYS, msg, 900); } catch (e) { return null; }
  if (!got || typeof got !== 'object') return null;
  const clean = (t) => String(t == null ? '' : t).replace(/\r/g, '').split('\n')
    .map(l => l.replace(/^\s*[-•*\d.、]+\s*/, '').trim()).filter(Boolean).slice(0, 6).join('\n').slice(0, 400);
  const out = { did: clean(got.did), hw: clean(got.hw), next: clean(got.next) };
  if (!out.did && !out.hw && !out.next) return null;
  /* 🔴 頁碼對不上學校進度表就標出來。
     ⚠ 分開比：「這次上了什麼／回家功課」只能用**這一週**的頁數，
       「下次進度」本來就會提到下一週的頁數——混在一起比會把對的也標成錯的
       （實測第一版就是這樣誤報下一週的 Grammar WB p13-16）。 */
  const bad = lessonDraftBadPages([out.did, out.hw].join('\n'), c.cur)
    .concat(lessonDraftBadPages(out.next, [c.cur, c.nextWk]));
  out.badPages = [...new Set(bad)];
  return out;
}

Object.assign(window, { aiDraftLesson, lessonDraftBadPages, pacingPageSet });

/* ══════════════════════════════════════════════════════════════════════════
   v511（Alan：「有哪些也可以使用到 AI 的地方 可以幫助學習」→ 第一順位）
   🎯 錯題 → 針對性練習
   ──────────────────────────────────────────────────────────────────────────
   做這個之前，網站上 13 個 AI 功能**全部都在「出題」這一端**
   （aiMakeVocabExercises / aiMakeGrammarPack / aiMakeWordStudy …），
   沒有任何一個 AI 在看「這個小孩實際做得怎麼樣」。這一組是第一個。

   三層，由便宜到貴：
     ① mkStats()           程式分群：哪一科、同一個答案錯幾次、哪一種題型。免費、即時。
     ② aiDiagnoseMistakes() AI 看**真實的錯答**說出「他為什麼錯」。
     ③ aiMakeFixSet()      針對那個毛病出 5 題新的。

   ⭐ 跟全站同一條規矩：**AI 產出一律程式驗**。
      ② 的把關：AI 舉的例子必須真的出現在他的錯題裡（比對 answer），
        至少兩筆才算數——不然它會「說得頭頭是道但其實是編的」。
      ③ 的把關：選項數／不重複／答案在範圍／rcOptionLenOk（正解不能最長），
        再加 _gnCheckMcq 第二個 AI 交叉檢查（單一正解的題型一律要有，v431/v444/v452）。
   ══════════════════════════════════════════════════════════════════════════ */

/* ① 程式先分群——不花錢、不會錯，而且本身就看得出東西 */
function mkStats(rows) {
  const list = (rows || []).filter(r => r && r.answer);
  const byCat = {}, byAnswer = {}, byType = {};
  list.forEach(r => {
    const c = r.catId || '_other';
    byCat[c] = (byCat[c] || 0) + 1;
    byType[r.type || '_'] = (byType[r.type || '_'] || 0) + 1;
    const k = String(r.answer).toLowerCase().trim();
    (byAnswer[k] = byAnswer[k] || { answer: r.answer, n: 0, picked: [] }).n++;
    if (r.picked && byAnswer[k].picked.indexOf(r.picked) < 0) byAnswer[k].picked.push(r.picked);
  });
  const repeats = Object.values(byAnswer).filter(x => x.n >= 2).sort((a, b) => b.n - a.n);
  return { n: list.length, byCat, byType, repeats };
}

const AI_DIAG_SYS = `You are an experienced elementary-school English teacher in Taiwan looking at ONE child's
actual wrong answers, to work out WHAT KIND of mistake they keep making.

You get rows of: the question, the correct answer, and (when available) what the child actually chose.
What the child chose is the most important signal — it tells you the DIRECTION of the error.

Find at most 3 patterns. A pattern is a teachable weakness, not a list of words.
  GOOD: "過去式動詞一律加 -ed，不規則動詞沒有背起來"（he picked eated / runned / goed）
  GOOD: "母音組合 ea 與 ee 分不出來"
  BAD : "單字不熟"（too vague to practise）
  BAD : "他錯了 5 題"（that is a count, not a pattern）

Rules:
- "examples" MUST be copied EXACTLY from the "correct answer" column of the rows you were given.
  Never invent a word that is not in the rows. If you cannot find at least 2 real rows for a
  pattern, do not report that pattern at all.
- "zh" is what the teacher reads: one short Traditional-Chinese phrase (<= 18 characters).
- "why" is one Traditional-Chinese sentence explaining the misunderstanding behind it.
- "drill" is a short English instruction describing exactly what kind of practice would fix it.

Output ONLY JSON:
[{"zh":"…","why":"…","examples":["ate","ran"],"drill":"Irregular past-tense verbs: give the base form, ask for the past form."}]`;

/* ② 診斷。回傳 [{ zh, why, examples, drill, rows }]；驗不過的直接不回。 */
async function aiDiagnoseMistakes(rows, { grade = 'g4', max = 3 } = {}) {
  const list = (rows || []).filter(r => r && r.q && r.answer).slice(0, 60);
  if (list.length < 3) return [];                 // 太少看不出模式，不要硬掰
  const band = VOCAB_BANDS[vocabBandOf(grade)];
  const body = list.map((r, i) =>
    `${i + 1}. Q: ${r.q}\n   correct: ${r.answer}${r.picked ? `\n   child chose: ${r.picked}` : ''}${r.cat ? `\n   subject: ${r.cat}` : ''}`
  ).join('\n');
  let got = null;
  try {
    got = await _gnCall(AI_DIAG_SYS, `LEVEL: ${band.label}\n${band.note}\n\nTHIS CHILD'S WRONG ANSWERS\n${body}`, 1200);
  } catch (e) { return []; }
  if (!Array.isArray(got)) return [];

  /* ⭐ 把關：AI 舉的例子必須真的在他的錯題裡。
     不驗的話它會講出一套很有道理、但例子是編的診斷——老師照著出題就全錯方向。 */
  const have = new Map();
  list.forEach(r => have.set(String(r.answer).toLowerCase().trim(), r));
  const out = [];
  got.forEach(p => {
    if (!p || !p.zh || !Array.isArray(p.examples)) return;
    const real = [], hitRows = [];
    p.examples.forEach(e => {
      const r = have.get(String(e || '').toLowerCase().trim());
      if (r && real.indexOf(r.answer) < 0) { real.push(r.answer); hitRows.push(r); }
    });
    if (real.length < 2) return;                  // 舉不出兩個真的例子 → 這個診斷不算數
    out.push({
      zh: String(p.zh).slice(0, 40),
      why: String(p.why || '').slice(0, 120),
      drill: String(p.drill || '').slice(0, 300),
      examples: real.slice(0, 6),
      rows: hitRows,
      catId: hitRows[0].catId || '',
      cat: hitRows[0].cat || '',
    });
  });
  return out.slice(0, max);
}

const AI_FIXSET_SYS = `You write short multiple-choice practice for ONE Taiwanese elementary student who keeps
making a specific mistake. You are told exactly what the mistake is.

Every question must practise THAT mistake. Do not drift to general vocabulary.
Use the child's own trouble words where it helps, but also include NEW words of the same kind,
so they learn the rule rather than memorising those words.

Hard rules (the website checks these and throws away anything that breaks them):
- Exactly 4 options. Exactly ONE is acceptable. The other three must be clearly wrong to a teacher.
- options[0] is ALWAYS the correct one and "answer" is ALWAYS 0.
  Do NOT move it around — the website shuffles the positions itself afterwards.
- Do not make the correct option the longest one; keep all four a similar length.
- The wrong options should be the mistake the child actually makes (e.g. "eated" for "ate"),
  not random unrelated words.
- "explain" is ONE short Traditional-Chinese sentence saying why, written to the child.

Output ONLY JSON:
[{"q":"…","options":["correct","wrong","wrong","wrong"],"answer":0,"explain":"…"}]`;

/* ③ 針對一個診斷出 n 題。程式驗 → 第二個 AI 交叉檢查 → 攤平正解位置。 */
async function aiMakeFixSet(pattern, { grade = 'g4', n = 5 } = {}) {
  if (!pattern || !pattern.drill) return [];
  const band = VOCAB_BANDS[vocabBandOf(grade)];
  const ex = (pattern.rows || []).slice(0, 8).map(r =>
    `- correct: ${r.answer}${r.picked ? `  (the child wrote: ${r.picked})` : ''}`).join('\n');
  const msg = `LEVEL: ${band.label}\n${band.note}\n\n` +
    `THE MISTAKE: ${pattern.zh}\n${pattern.why ? pattern.why + '\n' : ''}` +
    `WHAT TO PRACTISE: ${pattern.drill}\n\n` +
    `THE CHILD'S OWN WRONG ANSWERS ON THIS:\n${ex}\n\n` +
    `Write ${n} questions.`;
  let got = null;
  try { got = await _gnCall(AI_FIXSET_SYS, msg, Math.max(900, n * 260)); } catch (e) { return []; }
  if (!Array.isArray(got)) return [];

  // 程式驗
  const seen = new Set();
  let ok = got.map(x => {
    if (!x || !x.q || !Array.isArray(x.options)) return null;
    const opts = x.options.map(o => String(o == null ? '' : o).trim());
    if (opts.length !== 4 || opts.some(o => !o)) return null;
    if (new Set(opts.map(o => o.toLowerCase())).size !== 4) return null;   // 選項不可重複
    const q = String(x.q).trim();
    const key = q.toLowerCase();
    if (seen.has(key)) return null; seen.add(key);                          // 題目不可重複
    const item = { q, options: opts, answer: 0, explain: String(x.explain || '').slice(0, 120) };
    if (!rcOptionLenOk(item)) return null;                                  // 正解不可以是最長的那個
    return item;
  }).filter(Boolean);
  if (!ok.length) return [];

  // 第二個 AI：單一正解的題型一律要有（v431/v444/v452 都是這樣抓到「兩個都對」的）
  const bad = await _gnCheckMcq(ok, `The student is practising: ${pattern.zh}`);
  ok = ok.filter((_, i) => !bad.has(i));
  return _mkSpread(ok);
}

/* 正解一律在第 0 格出題、位置由程式攤平（跟 v488 字義選擇同一招：
   叫模型自己隨機化，它會為了服從而謊報位置）。 */
function _mkSpread(items) {
  return items.map((it, i) => {
    const to = i % 4;
    if (to === 0) return it;
    const opts = it.options.slice();
    const t = opts[0]; opts[0] = opts[to]; opts[to] = t;
    return { ...it, options: opts, answer: to };
  });
}

/* ══ 存／讀：針對性練習的「個人收件匣」 ═══════════════════════════════════
   ⚠ 為什麼不直接寫進那一週的單元？
     一般週次的內容是整個年級共用一份文件（class/data…），寫進去的話
     同年級的其他孩子也會看到「Eric 的加強練習」——而這個功能的賣點
     正是「專門為你出的」。而且從後台寫那份文件，一手滑就會蓋掉整週的課程
     （data.js 有 guardWeekSave 擋空白覆蓋就是因為出過事）。
   → 另開 practice/{email}：老師寫、學生只讀自己那一份。跟 lessonsPublic 同一個模式。
   ⚠ 要先貼新版 firestore.rules，不然老師存不進去、學生也讀不到。 */
async function savePracticeSet(email, set) {
  const id = String(email || '').trim().toLowerCase();
  if (!id || !set || !(set.questions || []).length) return false;
  const key = 'p' + Date.now().toString(36);
  await _db.collection('practice').doc(id).set({
    sets: { [key]: { ...set, id: key, at: Date.now() } },
  }, { merge: true });
  return key;
}
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
/* ── v530 📋 申論題的批改結果 ───────────────────────────────
   也放 practice/{email}：老師寫、學生只讀自己那一份——跟加強練習同一條路，
   **不用再加 Firestore 規則**（這條最重要，不然 Alan 又要去 Console 貼一次）。
   ⚠ 學生寫的答案在 progress（他自己寫的），老師的分數在 practice（老師寫的）。
     兩邊分開是故意的：規則上學生不能改自己的分數，老師也不能改學生的作答。 */
async function saveExamMarks(email, progressKey, mark) {
  const id = String(email || '').trim().toLowerCase();
  if (!id || !progressKey) return false;
  await _db.collection('practice').doc(id).set({
    marks: { [progressKey]: { ...mark, at: Date.now() } },
  }, { merge: true });
  return true;
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

Object.assign(window, { mkStats, aiDiagnoseMistakes, aiMakeFixSet,
  savePracticeSet, deletePracticeSet, subscribePractice, practiceSets,
  saveExamMarks, examMarkOf });

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
  checkInToday, computeCheckin, checkinToday, EXAM_CHECKIN, askFindStudent, renameGroupItems, askQueryAnswer, askLoadQueryData, ttMoveSlot, askMatchUnits,
  CHECKIN_DAILY, CHECKIN_CYCLE, CHECKIN_MILESTONES, CHECKIN_PERFECT,
});

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

Object.assign(window, { hwDoubleOn, hwDoubleAt, earnedAtOf, HW_DOUBLE, festOn, festIs, festNow, festApply, festSetOverride, festOverride,
  festIsDay, festDaysTo, festCountText, festCountParts, FESTS, FEST_1010 });

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

const PACE_KEY = 'pacing';          // 存在 class/{pacing_g4} 之類的文件

/* 🔴 v494（Alan 給了 G3 與 G6 的表）：**三個年級的欄位都不一樣**，
   v493 照 G4 的欄位位置寫死，拿去讀 G3／G6 會整排錯位。
     · G3 多一欄 High Frequency Words（Alan：不用管），中師作業欄叫 Homework
     · G6 外師是 Writing（沒有 LAW／Word Study WB），中師叫 Grammar Skills
   → 改成**照欄位名稱對**。下面是「我們要的東西」→「學校可能怎麼寫」的對照表。
   ⚠ 比對時一律去掉空白與括號內容（`LAW (E1&E2)` → `law`），
     學校改括號裡的字不會害我們讀不到。 */
const _PACE_COLS = {
  it: {
    unit:      ['unit'],
    reading:   ['reading'],
    wordStudy: ['wordstudy'],
    vocab:     ['vocabulary'],
    skill:     ['readingskills', 'readingskill'],
    law:       ['law', 'writing'],              // G6 這一欄叫 Writing
    wsWb:      ['wordstudywb'],
    assess:    ['assessments', 'assessment'],
  },
  lt: {
    unit:    ['unit'],
    reading: ['reading'],
    vocab:   ['vocabulary'],
    grammar: ['languageandconventions', 'grammarskills'],   // G6 叫 Grammar Skills
    skill:   ['readingskills', 'readingskill'],
    law:     ['law', 'homework'],                            // G3 這一欄叫 Homework
    gramWb:  ['grammarwb'],
    assess:  ['assessments', 'assessment'],
  },
};
/* Alan：「G3 不用管 high frequency word 那一欄」 */
const _PACE_SKIP = ['highfrequencywords', 'highfrequencyword'];
const _paceNorm = (s) => String(s || '').replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
/* 欄位標題 → 拿來當書名顯示：`LAW (E1&E2)` → `LAW`、`Word Study WB (E1,E2+E3)` → `Word Study WB` */
const _paceLabel = (s) => String(s || '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();

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

/* 只留 Formative（Alan：Summative 不用看）。
   「Formative 1」「Grammar (Summative 1)」「-」都可能出現，認不出來就當沒有。 */
function _paceFormative(s) {
  const t = String(s || '').trim();
  if (!t || t === '-') return '';
  return /formative/i.test(t) ? t : '';
}

/* ══ 讀 .xlsx ══════════════════════════════════════════════════════════
   🔴 v494：**一定要讀檔，不能貼上。**
   Alan：「G6 的 Grammar 那邊顯示很多頁數，但老師實際上只會教粗體的頁數」
   → 粗體是**一格裡面部分文字**才粗（G6 有 19 格是這樣），
     從 Excel 複製出來的 TSV 會把粗體整個丟掉＝那份資訊救不回來。
   xlsx 本身就是一個 zip，瀏覽器內建 DecompressionStream 解得開，
   所以**不用載 SheetJS（400KB）**，只要抓兩個檔案出來。 */
async function _paceUnzip(buf, want) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  let eo = -1;
  for (let i = u8.length - 22; i >= 0 && i > u8.length - 66000; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  }
  if (eo < 0) throw new Error('這不像是 Excel 檔（.xlsx）');
  const n = dv.getUint16(eo + 10, true);
  let p = dv.getUint32(eo + 16, true);
  const out = {};
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + el + cl;
    if (want.indexOf(name) < 0) continue;
    /* ⚠ 本地檔頭的「名稱長度／extra 長度」可能跟中央目錄不同，一定要重讀，
       不然起點會算錯幾個 byte，解壓就整個爛掉。 */
    const lnl = dv.getUint16(lho + 26, true), lel = dv.getUint16(lho + 28, true);
    const raw = u8.subarray(lho + 30 + lnl + lel, lho + 30 + lnl + lel + csize);
    if (method === 0) { out[name] = new TextDecoder().decode(raw); continue; }
    const ab = await new Response(new Blob([raw]).stream()
      .pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    out[name] = new TextDecoder().decode(ab);
  }
  return out;
}

const _paceXML = (t) => new DOMParser().parseFromString(t, 'application/xml');

/* 把 .xlsx 讀成「每一列 → {欄位字母: {t, bold}}」。
   bold ＝ 這一格裡面「有被加粗的那幾段文字」（G6 的重點）。 */
async function pacingReadXlsx(arrayBuffer) {
  const f = await _paceUnzip(arrayBuffer, ['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml']);
  if (!f['xl/worksheets/sheet1.xml']) throw new Error('Excel 裡找不到工作表');
  const sst = [];
  if (f['xl/sharedStrings.xml']) {
    const d = _paceXML(f['xl/sharedStrings.xml']);
    Array.from(d.getElementsByTagName('si')).forEach(si => {
      const runs = Array.from(si.getElementsByTagName('r'));
      if (runs.length) {
        const parts = runs.map(r => {
          const tt = r.getElementsByTagName('t')[0];
          const pr = r.getElementsByTagName('rPr')[0];
          return { t: (tt && tt.textContent) || '', b: !!(pr && pr.getElementsByTagName('b').length) };
        });
        sst.push({ t: parts.map(x => x.t).join(''), bold: parts.filter(x => x.b).map(x => x.t) });
      } else {
        sst.push({ t: Array.from(si.getElementsByTagName('t')).map(x => x.textContent).join(''), bold: [] });
      }
    });
  }
  const sd = _paceXML(f['xl/worksheets/sheet1.xml']);
  const rows = {};
  Array.from(sd.getElementsByTagName('c')).forEach(c => {
    const ref = c.getAttribute('r') || '';
    const m = /^([A-Z]+)(\d+)$/.exec(ref);
    const v = c.getElementsByTagName('v')[0];
    if (!m || !v) return;
    const cell = c.getAttribute('t') === 's'
      ? (sst[Number(v.textContent)] || { t: '', bold: [] })
      : { t: v.textContent, bold: [] };
    (rows[Number(m[2])] = rows[Number(m[2])] || {})[m[1]] = cell;
  });
  return rows;
}

/* 從一格裡抓出「被加粗的頁碼」。
   G6 例：`**NOUNS**- … (GPW pp. **1**, 3, 4, **6**, **139**)` → ['1','6','139']
   ⚠ 類別名稱（NOUNS／VERBS…）也是粗體，但那只是標題樣式不是頁碼 → 只收純數字那幾段。

   ⭐ Alan 2026-10-12 確認的規則：
     · 有粗體 → **只教粗體那幾頁**
     · 整格都沒粗體 → **列出來的全部都教**
   所以沒粗體時**刻意回空陣列**，讓上層不要顯示「只教 pp. X」——
   整格文字本來就都看得到，不另外宣稱才是對的。
   ⚠ 也刻意**不沿用**上一週的粗體頁數（grammarHw 會沿用、bold 不會）：
     沿用會在「這週其實是 Writing Activity」的格子上宣稱要教某幾頁，那是沒根據的。 */
function pacingBoldPages(bold) {
  const out = [];
  (bold || []).forEach(seg => {
    (String(seg).match(/\d+(?:\s*-\s*\d+)?/g) || []).forEach(x => {
      const v = x.replace(/\s+/g, '');
      if (out.indexOf(v) < 0) out.push(v);
    });
  });
  return out;
}

/* 共用的「一列一列讀出來」——吃的是 {列: {欄: {t,bold}}}。
   ⭐ v494 改成**照欄位名稱對**（_PACE_COLS），不再照位置，
     因為 G3／G4／G6 的欄位根本不一樣。
   分左右兩半：兩個 WK 之間是外師，第二個 WK 之後是中師。 */
function pacingFromRows(rows) {
  const at = (r, c) => (rows[r] && rows[r][c]) || null;
  const txt = (r, c) => { const x = at(r, c); return x ? String(x.t || '').trim() : ''; };
  const colsOf = (r) => Object.keys(rows[r] || {});
  const cnum = (c) => c.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
  const byNum = (a, b) => cnum(a) - cnum(b);

  let hRow = -1, wkCols = [];
  for (const r of Object.keys(rows).map(Number).sort((a, b) => a - b)) {
    const w = colsOf(r).filter(c => _paceNorm(txt(r, c)) === 'wk').sort(byNum);
    if (w.length >= 2) { hRow = r; wkCols = w; break; }
  }
  if (hRow < 0) return null;

  const allCols = colsOf(hRow).sort(byNum);
  const noteCol = allCols.find(c => /^notes?$/.test(_paceNorm(txt(hRow, c))));
  const itStart = cnum(wkCols[0]), ltStart = cnum(wkCols[1]);
  /* 欄位名稱 → 我們的欄位 key。同一個名稱在左右兩半各出現一次（Unit、Reading…），
     所以要先決定這一欄屬於哪一半，再去那一半的對照表找。 */
  const map = { it: {}, lt: {} };
  allCols.forEach(c => {
    const n = _paceNorm(txt(hRow, c));
    if (!n || n === 'wk' || _PACE_SKIP.indexOf(n) >= 0) return;
    const side = cnum(c) > ltStart ? 'lt' : (cnum(c) > itStart ? 'it' : null);
    if (!side) return;
    for (const key of Object.keys(_PACE_COLS[side])) {
      if (_PACE_COLS[side][key].indexOf(n) >= 0 && !map[side][key]) { map[side][key] = c; return; }
    }
  });

  const out = [];
  Object.keys(rows).map(Number).sort((a, b) => a - b).forEach(r => {
    if (r <= hRow) return;
    const wk = txt(r, wkCols[0]) || txt(r, wkCols[1]);
    const m = /^W\s*(\d{1,2})$/i.exec(wk);
    if (!m) return;
    const grab = (side) => {
      const o = {};
      Object.keys(_PACE_COLS[side]).forEach(k => { o[k] = map[side][k] ? txt(r, map[side][k]) : ''; });
      /* 🔴 v503（Alan：「請把什麼 book 寫清楚，像是 LAW、Word Study WB、Grammar WB」）：
         光寫 `p20-23 · p14-16` 根本看不出是哪一本。書名**從 Excel 的欄位標題帶**，
         不要寫死——G6 外師那欄叫 Writing、G3 中師那欄叫 Homework。 */
      ['law', 'wsWb', 'gramWb'].forEach(k => {
        if (map[side][k]) o[k + 'Label'] = _paceLabel(txt(hRow, map[side][k]));
      });
      /* G6 的重點：中師文法那一格裡，老師實際上只教**粗體**的頁數 */
      const gc = map[side].grammar && at(r, map[side].grammar);
      if (gc) { const b = pacingBoldPages(gc.bold); if (b.length) o.grammarBold = b; }
      o.assess = _paceFormative(o.assess);
      return o;
    };
    out.push({ n: Number(m[1]), note: noteCol ? txt(r, noteCol).replace(/\n+/g, ' ／ ') : '',
               it: grab('it'), lt: grab('lt') });
  });
  return out.length ? pacingFill(out) : null;
}

/* 保留「貼上 TSV」當後備（讀檔失敗、或老師手上只有複製來的內容）。
   ⚠ 貼上**一定沒有粗體**，所以 G6 的「只教粗體頁數」用貼的會拿不到——
     介面上要講清楚，不要讓老師以為兩條路一樣。 */
function pacingParse(tsv) {
  const lines = String(tsv || '').replace(/\r\n?/g, '\n').split('\n');
  const rows = {};
  lines.forEach((l, i) => {
    const cells = l.split('\t');
    const o = {};
    cells.forEach((v, k) => {
      let c = '', n = k + 1;
      while (n > 0) { c = String.fromCharCode(65 + (n - 1) % 26) + c; n = Math.floor((n - 1) / 26); }
      o[c] = { t: v, bold: [] };
    });
    rows[i + 1] = o;
  });
  return pacingFromRows(rows);
}

/* 把兩條「沿用」規則套上去（見檔頭說明）。
   ⚠ 一定要在存檔前做完，不要留到顯示時才算——
     「同一件判斷只能有一份邏輯」（v460 的教訓）。 */
function pacingFill(weeks) {
  const carry = (side, keys) => {
    const last = {};
    weeks.forEach(w => {
      const o = w[side];
      keys.forEach(k => {
        const v = String(o[k] || '').trim();
        if (v && v !== '-') { last[k] = v; o['_own_' + k] = true; }
        else if (last[k]) { o[k] = last[k]; o['_own_' + k] = false; }
      });
    });
  };
  // 規則 1：Unit／Reading 只寫在循環第一週
  carry('it', ['unit', 'reading']);
  carry('lt', ['unit', 'reading', 'vocab']);
  // 規則 2：中師的文法主題——課堂在上 Writing Activity 時，作業還是沿用上一個文法主題
  const isTopic = (s) => {
    const t = String(s || '').trim();
    return !!t && t !== '-' && !/writing activity/i.test(t);
  };
  let lastG = '';
  weeks.forEach(w => {
    const now = w.lt.grammar;
    if (isTopic(now)) { lastG = now; w.lt.grammarHw = now; w.lt._carry = false; }
    else { w.lt.grammarHw = lastG; w.lt._carry = !!lastG && !!w.lt.gramWb; }
  });
  return weeks;
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

Object.assign(window, { pacingParse, pacingFill, pacingForWeek, pacingWeekNo, pacingReadXlsx, pacingFromRows, pacingBoldPages,
                        pacingClean, pacingBooks,
                        pacingNextFormative, savePacing, loadPacing, subscribePacing });

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

const _LS_TERM_START = new Date(2026, 7, 31);   // 2026-08-31 開學（跟 app.jsx 的 TERM_START 同一天）
const _lsDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/* 'YYYY-MM-DD'。⚠ 不要用 toISOString()——那是 UTC，台灣早上會算成前一天。 */
function lessonISO(d) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
/* 日期 → 學校第幾週（W1 = 開學那一週）。開學前回 0。 */
function lessonWeekOf(dateISO) {
  const d = _lsDay(new Date(dateISO + 'T00:00:00'));
  const diff = Math.floor((d - _lsDay(_LS_TERM_START)) / 86400000);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}
/* 下一個固定時段的日期（含今天）。沒設時段就回今天。 */
function lessonNextDate(slot, from) {
  const base = _lsDay(from ? new Date(from) : new Date());
  if (!slot || slot.day == null) return lessonISO(base);
  const want = Number(slot.day);
  const d = new Date(base);
  d.setDate(d.getDate() + ((want - d.getDay() + 7) % 7));
  return lessonISO(d);
}
/* 排好序的課堂清單（新的在前）。 */
function lessonRows(doc) {
  const log = (doc && doc.log) || {};
  return Object.keys(log).sort().reverse().map(date => ({ date, ...log[date] }));
}
/* 上一堂（比 dateISO 早的最近一堂，且不是請假）——用來接「下次進度」。 */
function lessonPrev(doc, dateISO) {
  return lessonRows(doc).find(r => r.date < dateISO && r.kind !== 'off') || null;
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

/* 存一堂課。
   ⭐ v499：**同時寫一份給家長看的**（lessonsPublic/{email}）。
     Firestore 的規則沒辦法只擋某幾個欄位，所以「不給家長看 note」只能靠
     **另存一份不含 note 的**——這是 v496 就寫在 firestore.rules 裡的結論。
   ⚠ 兩份都要寫成功才算數：家長那份失敗的話要講出來，
     不然老師以為家長看得到、家長其實看到舊的。 */
async function saveLesson(email, dateISO, rec) {
  const id = String(email || '').trim().toLowerCase();
  const full = { ...rec, at: Date.now() };
  await _db.collection('lessons').doc(id).set({ log: { [dateISO]: full } }, { merge: true });
  const { note, ...pub } = full;          // 家長那份：把老師私人備註拿掉
  await _db.collection('lessonsPublic').doc(id).set({ log: { [dateISO]: pub } }, { merge: true });
}
async function deleteLesson(email, dateISO) {
  const id = String(email || '').trim().toLowerCase();
  const gone = firebase.firestore.FieldValue.delete();
  await _db.collection('lessons').doc(id).set({ log: { [dateISO]: gone } }, { merge: true });
  // ⚠ 家長那份也要一起刪——不然老師刪掉了，家長還看得到
  await _db.collection('lessonsPublic').doc(id).set({ log: { [dateISO]: gone } }, { merge: true });
}
async function saveLessonSlot(email, slot) {
  const id = String(email || '').trim().toLowerCase();
  await _db.collection('lessons').doc(id).set({ slot: slot || null }, { merge: true });
}
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

function subscribeLessons(email, cb) {
  const id = String(email || '').trim().toLowerCase();
  try {
    return _db.collection('lessons').doc(id)
      .onSnapshot(s => cb(s.exists ? s.data() : null), () => cb(null));
  } catch (e) { cb(null); return () => {}; }
}

/* 給家長看的摘要（Alan：「之後也要出家長可以看的」）。
   ⚠ **刻意不含 note**——那是老師自己的備註。
   先做成「一鍵複製的文字」，他貼到 LINE 就好；之後要做家長頁面再用同一份資料。 */
function lessonParentText(rec, who, pace) {
  if (!rec) return '';
  const L = [];
  const k = LESSON_KINDS.find(x => x.id === rec.kind);
  L.push(`${who ? who + ' · ' : ''}${rec.date}${k && k.id !== 'normal' ? `（${k.zh}）` : ''}`);
  if (pace && pace.it && pace.it.reading) L.push(`🏫 學校進度：${pace.it.reading}${pace.it.vocab ? ' · ' + pace.it.vocab : ''}`);
  if (rec.did)  L.push(`\n📘 今天上了\n${rec.did}`);
  if (typeof rec.pct === 'number') L.push(`\n📊 熟悉程度：${rec.pct}%`);
  if (rec.review) {
    const r = REVIEW_STATES.find(x => x.id === rec.review);
    if (r) L.push(`\n🔁 上次的複習：${r.ico} ${r.zh}`);
  }
  if (rec.prev) L.push(`\n🔭 先預習了\n${rec.prev}`);
  if (rec.hw)   L.push(`\n📕 回家功課\n${rec.hw}`);
  if (rec.next) L.push(`\n➡️ 下次進度\n${rec.next}`);
  return L.join('\n');
}

Object.assign(window, { LESSON_KINDS, REVIEW_STATES, subscribeLessonsPublic, backfillLessonsPublic,
                        lessonISO, lessonWeekOf, lessonNextDate, lessonRows,
                        lessonPrev, lessonAvgPct, lessonDateParts, saveLesson, deleteLesson, saveLessonSlot,
                        subscribeLessons, lessonParentText });

/* ══════════════════════════════════════════════════════════════════════════
   📅 v497 固定課表（Timetable）
   ──────────────────────────────────────────────────────────────────────────
   Alan 2026-10-13 給了整份固定課表，裡面有兩件事打掉 v496 的假設：
     ① 他說「我是一對一」，但實際上**有三組是兩個人一起**
        （Elvis & Elory／Eric & Tayler／Joyce & Lydia）
     ② v496 假設每人每週一堂，實際上**多數人每週兩堂**
        （Eric & Tayler 二＋四、Nick 三＋日、Elroy 一＋日、Elvis & Elory 一＋六）

   → 課表另外存一份 class/timetable（整週一份，不是每人一份）：
     一次讀完就能畫出整週、也能算「今天有哪幾堂」。
     { slots: [{ id, day, start, end, students: ['a@x','b@x'] }] }
   上課紀錄仍然是 lessons/{email} 一人一份——
   **同一個時段的兩個人，共用的內容一樣，但掌握度與備註各自記**。
═══════════════════════════════════════════════════════════════════════════ */

const TT_DOC = 'timetable';
const TT_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

/* 貼上課表就建好（Alan 自己就是用這個格式寫給我的）：
     星期一
     Elroy：18:00–20:00
     Elvis & Elory：20:00–22:00
   ⚠ 時間的分隔符號可能是 – — ~ - 任何一種；冒號可能是全形。
   ⚠ 名字用 & 或 、或 + 分隔；比對名單時**不分大小寫、去掉空白**。 */
function timetableParse(text, roster) {
  const byName = {};
  (roster || []).forEach(s => {
    const k = String(s.name || '').trim().toLowerCase();
    if (k) byName[k] = s.email;
    // 「王小明Elroy Wang」這種中英混寫：也用第一個英文字當 key
    const en = String(s.name || '').match(/[A-Za-z][A-Za-z'-]*/);
    if (en) { const k2 = en[0].toLowerCase(); if (!byName[k2]) byName[k2] = s.email; }
  });
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const out = []; let day = null; const unknown = [];
  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) return;
    const dm = /^(?:星期|週|禮拜)\s*([日一二三四五六天])/.exec(line);
    if (dm) { const c = dm[1] === '天' ? '日' : dm[1]; day = TT_DAYS.indexOf(c); return; }
    if (day == null || day < 0) return;
    /* 名字：起–迄 */
    const m = /^(.+?)\s*[:：]\s*(\d{1,2})\s*[:：]\s*(\d{2})\s*[–—~\-到至]+\s*(\d{1,2})\s*[:：]\s*(\d{2})/.exec(line);
    if (!m) return;
    const names = m[1].split(/\s*[&、＋+和]\s*/).map(x => x.trim()).filter(Boolean);
    const hhmm = (h, mi) => String(Number(h)).padStart(2, '0') + ':' + mi;
    const emails = [];
    names.forEach(n => {
      const hit = byName[n.toLowerCase()];
      if (hit) emails.push(hit); else unknown.push(n);
    });
    /* ⚠ Alan 2026-10-13 更正：「這邊只有 Elvis & Elory、Joyce & Lydia 一起上課」
       ——同一個時段寫兩個名字**不一定是一起上**（Eric & Tayler 排在同一個
       3 小時的區塊裡，但是分開上的）。
       所以 together 只是**預設值**，每個時段都能在畫面上切換；
       一起上＝記一次、共用內容複製給兩人（掌握度與備註仍各自填）。 */
    out.push({ id: 's' + day + m[2] + m[3] + Math.random().toString(36).slice(2, 5),
               day, start: hhmm(m[2], m[3]), end: hhmm(m[4], m[5]),
               names, students: emails, together: emails.length > 1 });
  });
  if (!out.length) return null;
  out.sort((a, b) => a.day - b.day || (a.start < b.start ? -1 : 1));
  /* ⚠⚠ Alan 的名單裡真的有 **Elroy（G6，自己上）** 和 **Elory（G4，跟 Elvis 一起）**——
     只差一個字母的位置。這種名字打錯不會報錯，只會**把課記到別的孩子身上**，
     而且要等家長問起來才會發現。
     → 課表裡只要出現「名單中有長得很像的名字」，就把那組挑出來請老師確認。 */
  const twins = _ttLookAlikes((roster || []).map(r => String(r.name || '').trim()).filter(Boolean),
                              out.flatMap(s => s.names));
  return { slots: out, unknown: [...new Set(unknown)], twins };
}

/* ══ v547 🔎 聊天室直接回答問題 ═══════════════════════════════════════
   Alan：「這週誰還沒做完」「Nick 最近錯最多的是什麼」——以前聊天室只會把畫面打開，
   他還要自己點進去找。現在直接回答。

   ⭐⭐ **數字一律由程式算，AI 一個字都不寫**（AI 只選 qtype）。
     算法用後台總覽**同一支** buildWeeklyReport，所以聊天室說的跟後台看到的一定對得上。
   ⚠ 名單上有、但**從沒登入過**（沒有進度文件）的孩子不可以消失——
     那正是最需要被找出來的人（v500：靜靜地少一個比直接失敗更難發現）。
   ⚠ 每個孩子用**自己年級**的那一份作業（v434 的教訓，一份資料當成全部）。
   ⚠ 只算學期課程，不含暑假發派——答案裡要講明。 */
function askQueryAnswer(plan, ctx) {
  const c = ctx || {};
  const roster = (c.roster || []).filter(r => r && r.email && r.active !== false);
  const byEmail = new Map((c.students || []).map(x => [String(x.email || '').toLowerCase(), x]));
  const gradeOf = (r) => (r.grade || (window.gradeFromEmail ? window.gradeFromEmail(r.email) : '') || '').toString().toLowerCase();
  const cur = c.currentWeekId || (() => null);
  const gdOf = (g) => { const d = (c.gradeData || {})[g]; return (d && d.order && d.order.length) ? d : null; };
  const stuOf = (r) => byEmail.get(String(r.email).toLowerCase())
    || { email: r.email, name: r.name, items: {}, streak: { count: 0 }, _noDoc: true };
  const weekOf = (g) => { const d = gdOf(g); return d ? { d, wid: cur(d.weeks, d.order) } : null; };
  const catCount = (pending) => {
    const m = {}; pending.forEach(x => { m[x.cat] = (m[x.cat] || 0) + 1; });
    return Object.keys(m).map(k => `${k} ${m[k]} 項`).join('、');
  };
  const BASIS = '算法跟後台「總覽」同一套（這週所有練習；只算學期課程，不含暑假發派）。';

  if (plan.qtype === 'unfinished' || plan.qtype === 'notstarted') {
    const rows = [], noGrade = [], noTask = [];
    let n = 0, weekLabels = new Set();
    roster.forEach(r => {
      const g = gradeOf(r);
      if (plan.gradeId && g !== plan.gradeId) return;
      n++;
      const wk = weekOf(g);
      if (!wk || !wk.wid) { noGrade.push(r.name || r.email); return; }
      const rep = buildWeeklyReport(stuOf(r), wk.d.weeks, wk.d.order, { weekId: wk.wid });
      weekLabels.add(`${g.toUpperCase()} ${rep.weekLabel}`);
      if (!rep.totalItems) { noTask.push(r.name || r.email); return; }
      const done = rep.completed.length;
      const hit = plan.qtype === 'notstarted' ? done === 0 : done < rep.totalItems;
      if (hit) rows.push({ name: r.name || r.email, email: r.email, grade: g, done, total: rep.totalItems, pct: rep.completionRate,
        text: `${done}/${rep.totalItems}（${rep.completionRate}%）${done < rep.totalItems ? ' · 還差 ' + catCount(rep.pending) : ''}`,
        noDoc: !!stuOf(r)._noDoc, tone: done === 0 ? 'bad' : 'warn' });
    });
    rows.sort((a, b) => a.pct - b.pct || String(a.name).localeCompare(String(b.name)));
    rows.forEach(x => { if (x.noDoc) x.text += ' · 還沒登入過'; });
    const scope = plan.gradeId ? `${plan.gradeId.toUpperCase()} ` : '';
    const label = [...weekLabels].join('、') || '這週';
    const head = rows.length
      ? `${scope}${plan.qtype === 'notstarted' ? '這週完全沒開始' : '這週還沒做完'}的有 ${rows.length} 位（共 ${n - noGrade.length - noTask.length} 位有作業的，${label}）`
      : `${scope}${plan.qtype === 'notstarted' ? '這週每位都開始做了' : '這週每位都做完了'}（${label}）🎉`;
    const foot = [
      noGrade.length ? `⚠ 找不到作業資料所以沒算到：${noGrade.join('、')}` : '',
      noTask.length ? `這週沒有作業：${noTask.slice(0, 6).join('、')}${noTask.length > 6 ? '…' : ''}` : '',
      BASIS].filter(Boolean).join('\n');
    return { head, rows, foot };
  }

  /* 以下兩種都要先找到那位學生 */
  const who = askFindStudent(plan.student, roster);
  if (!who || !who.email) {
    return { head: who && who.many ? `名單裡有兩個「${plan.student}」，說全名我才知道是誰。`
                                    : `名單裡找不到「${plan.student}」。`, rows: [], foot: '' };
  }
  const r = roster.find(x => String(x.email).toLowerCase() === String(who.email).toLowerCase());
  const g = gradeOf(r), wk = weekOf(g), stu = stuOf(r);
  const twin = (who.twins || []).length ? `⚠ 名單裡有長得很像的名字（${who.twins.join('、')}），確認一下是不是 ${who.name}。\n` : '';

  if (plan.qtype === 'student') {
    if (!wk || !wk.wid) return { head: `找不到 ${who.name} 這個年級的作業資料。`, rows: [], foot: twin };
    const rep = buildWeeklyReport(stu, wk.d.weeks, wk.d.order, { weekId: wk.wid });
    if (!rep.totalItems) return { head: `${who.name} 這週（${rep.weekLabel}）沒有作業。`, rows: [], foot: twin + BASIS };
    const rows = [{ name: '完成', text: `${rep.completed.length}/${rep.totalItems}（${rep.completionRate}%）`,
                    tone: rep.completionRate >= 80 ? 'ok' : rep.completionRate > 0 ? 'warn' : 'bad' }];
    if (rep.avgScore != null) rows.push({ name: '平均分數', text: `${rep.avgScore} 分` });
    if (rep.lateCount) rows.push({ name: '補交', text: `${rep.lateCount} 項` });
    if (rep.pending.length) rows.push({ name: '還差', text: catCount(rep.pending), tone: 'warn' });
    if (stu._noDoc) rows.push({ name: '注意', text: '這位還沒登入過', tone: 'bad' });
    return { head: `${who.name}（${g.toUpperCase()} ${rep.weekLabel}）`, rows, foot: twin + BASIS };
  }

  if (plan.qtype === 'mistakes') {
    const d = wk && wk.d;
    const list = (typeof collectWrongQuestions === 'function' && d)
      ? collectWrongQuestions(stu.items, d.weeks, d.order, typeof CATEGORIES !== 'undefined' ? CATEGORIES : []) : [];
    if (!list.length) return { head: `${who.name} 目前沒有還沒訂正的錯題 👍`, rows: [], foot: twin };
    const m = new Map();
    list.forEach(q => {
      const k = `${q.weekLabel}｜${q.itemTitle}`;
      if (!m.has(k)) m.set(k, { weekLabel: q.weekLabel, title: q.itemTitle, n: 0, sample: q.q });
      m.get(k).n++;
    });
    const top = [...m.values()].sort((a, b) => b.n - a.n).slice(0, 5);
    return { head: `${who.name} 目前還沒訂正的錯題共 ${list.length} 題，集中在：`,
      rows: top.map(x => ({ name: `${x.n} 題`, text: `${x.weekLabel} · ${x.title}`, tone: x.n >= 4 ? 'bad' : 'warn' })),
      foot: twin + '這是「還沒訂正」的累積，不是某段時間內的（題目答錯的時間沒有記錄）。\n想針對這些出練習，跟我說「針對 ' + who.name + ' 的弱點出練習」。' };
  }
  return { head: '我不知道怎麼查這個。', rows: [], foot: '' };
}

/* 一次性讀「全部學生進度＋六個年級的作業」（60 秒內重複問不重讀）。
   ⚠ 用既有的訂閱函式讀第一次回來的那一筆就取消訂閱——不另外寫一套 Firestore 讀取。
   ⚠ 8 秒讀不到就放棄那一份，回 null 讓答案老實說「沒算到」。 */
let _askQueryCache = null;
function askLoadQueryData() {
  if (_askQueryCache && Date.now() - _askQueryCache.at < 60000) return Promise.resolve(_askQueryCache.v);
  const once = (sub) => new Promise(res => {
    let un = null, done = false;
    const fin = (v) => { if (done) return; done = true; try { un && un(); } catch (e) {} res(v); };
    try { un = sub(fin); if (done) { try { un && un(); } catch (e) {} } } catch (e) { fin(null); }
    setTimeout(() => fin(null), 8000);
  });
  const G = { g1: 'subscribeToClassDataG1', g2: 'subscribeToClassDataG2', g3: 'subscribeToClassData',
              g4: 'subscribeToClassDataG4', g5: 'subscribeToClassDataG5', g6: 'subscribeToClassDataG6' };
  return Promise.all([
    once(cb => subscribeAllStudents(cb)),
    ...Object.keys(G).map(g => once(cb => (window[G[g]] ? window[G[g]]((w, o) => cb({ weeks: w || {}, order: (o || []).slice() }), () => cb(null)) : (cb(null), null)))),
  ]).then(([students, ...grades]) => {
    const gradeData = {};
    Object.keys(G).forEach((g, i) => { if (grades[i]) gradeData[g] = grades[i]; });
    const v = { students: students || [], gradeData };
    _askQueryCache = { at: Date.now(), v };
    return v;
  });
}

/* ══ v548 在這一週裡找「單一個單元」（「測驗（2/4）」「Unit 1 字義選擇」）══════════
   ⚠ 比對一律要**唯一**才動手：同一週常常有「測驗（1/4）」「測驗（2/4）」…，
     他只說「測驗」的話，刪錯一個是救不回來的。→ 多個符合就回候選清單叫他說清楚。
   ⚠ 完全相同的優先（標題一樣就不是「包含」），不然「Unit 1」會同時命中「Unit 10」。 */
function askMatchUnits(flat, name) {
  const norm = (t) => String(t || '').toLowerCase().replace(/[—–-]/g, '-').replace(/[（）()]/g, m => m === '（' || m === '(' ? '(' : ')').replace(/\s+/g, ' ').trim();
  const q = norm(name);
  if (!q) return [];
  const all = (flat || []).filter(x => x && x.item);
  const exact = all.filter(x => norm(x.item.title) === q);
  if (exact.length) return exact;
  return all.filter(x => { const t = norm(x.item.title); return t && (t.indexOf(q) >= 0 || q.indexOf(t) >= 0); });
}

/* ══ v547 🗓 聊天室改固定課表 ═══════════════════════════════════════
   「Nick 週三改成 17:30」——改的是**每週固定**的那一堂（不是只改這一次）。
   ⚠ 一個時段可能有好幾個孩子（Elvis & Elory 一起上）——改時段會一起動，
     所以回傳 others 讓畫面在按下去之前就講清楚。
   ⚠ 同一天、時間重疊的另一堂要回報（老師只有一個人），但不擋——他可能就是要這樣。
   ⚠ 一週不只一堂又沒說是哪一天 → 問，不要猜（Nick 週三＋週日）。 */
function ttMoveSlot(tt, op) {
  const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const mins = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
  const hhmm = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  const show = (sl) => `週${DAYS[sl.day]} ${sl.start}–${sl.end}`;
  const slots = timetableOfStudent(tt, op.email);
  if (!slots.length) return { error: `課表裡沒有 ${op.name || '這位學生'}——要先把他排進固定課表。` };
  let cand = slots;
  if (op.fromDay >= 0) cand = slots.filter(x => Number(x.day) === op.fromDay);
  if (!cand.length) return { error: `${op.name || '他'}週${DAYS[op.fromDay]}沒有課。他的課是：${slots.map(show).join('、')}` };
  if (cand.length > 1) return { ask: `${op.name || '他'}一週有 ${cand.length} 堂（${cand.map(show).join('、')}），要改哪一堂？` };
  const old = cand[0];
  const len = Math.max(15, mins(old.end) - mins(old.start));
  const day = op.toDay >= 0 ? op.toDay : Number(old.day);
  const start = op.start || old.start;
  const end = op.end || (op.start ? hhmm(Math.min(24 * 60 - 1, mins(op.start) + len)) : old.end);
  if (mins(end) <= mins(start)) return { error: `結束時間（${end}）要比開始時間（${start}）晚。` };
  if (day === Number(old.day) && start === old.start && end === old.end) return { error: '跟現在一樣，沒有要改的。' };
  const next = { ...old, day, start, end };
  const clash = ((tt && tt.slots) || []).filter(x => x.id !== old.id && Number(x.day) === day
    && mins(x.start) < mins(end) && mins(start) < mins(x.end));
  const names = (sl) => (sl.names && sl.names.length ? sl.names : sl.students || []);
  return {
    tt: { ...tt, slots: ((tt && tt.slots) || []).map(x => x.id === old.id ? next : x) },
    before: show(old), after: show(next),
    others: names(old).filter(n => String(n).toLowerCase() !== String(op.name || '').toLowerCase()),
    clash: clash.map(x => `${names(x).join('、') || '（沒有名字）'}（${show(x)}）`),
  };
}

/* ══ v544 ✏️ 整組改名字 ═══════════════════════════════════════════
   Alan 合併了 6 組單字，組名變成六個名字串在一起
   （「Reaching for the moon - week1 + Reaching for the moon - week2 + …」），
   連單元標題都是那一長串——學生點進去滿螢幕都是標題。

   ⭐ 改名要改**三個地方**，少一個就會出現「看起來正常但其實壞掉」：
     ① 每個單元的 group（側欄靠它歸戶）
     ② 每個單元的 title（標題本來就是用組名拼出來的：
        「組名」「組名 · 字義選擇（1/3）」「組名 · 選擇題」）
     ③ 群組的參考資料 groupRes，它的 key 是 `分類::組名`
        —— ⚠ 不搬的話 📎 參考資料會**整個消失**，而且不會報錯。
   ⚠ 老師自己改過標題的單元（標題裡沒有舊組名）一律不動——那是他故意取的名字。 */
function renameGroupItems(items, oldName, newName) {
  const a = String(oldName || '').trim();
  const b = String(newName || '').trim();
  if (!a || !b || a === b) return { items: items || [], n: 0, kept: 0 };
  let n = 0, kept = 0;
  const out = (items || []).map(it => {
    if (!it) return it;
    const t = String(it.title || '');
    let title = t;
    if (t === a) { title = b; n++; }
    else if (t.indexOf(a) === 0) { title = b + t.slice(a.length); n++; }   // 保留「 · 字義選擇（1/3）」這種字尾
    else kept++;                                                           // 老師自己取的名字，不動
    return { ...it, group: b, title };
  });
  return { items: out, n, kept };
}

/* ══ v543 聊天室說的名字 → 名單裡的那個孩子 ════════════════════════
   🔴 `plan.email` 從 v517 做好到現在**從來沒有被設定過**——router 只給 `plan.student`
     （名字），app.jsx 卻寫 `email: plan.email || ''`，所以永遠是空的。
     Alan 說「今天 Nick 的上課內容是…」，後台開起來但**連 Nick 都沒選到**。
   ⚠⚠ 絕對不可以「猜最像的那一個」：名單裡真的有 Elroy(G6) 和 Elory(G4)，
     只差一個字母的位置——猜錯會把整堂課記到別的孩子身上，而且不報錯。
     → 對不到就回 null（讓畫面老實說找不到）；對到了但有長得像的，一起回報。 */
function askFindStudent(name, roster) {
  const norm = (x) => String(x || '').trim().toLowerCase();
  const n = norm(name);
  if (!n) return null;
  const all = (roster || []).filter(r => r && r.email);
  let hits = all.filter(r => norm(r.name) === n);
  if (!hits.length) hits = all.filter(r => norm(r.email).split('@')[0] === n);
  if (hits.length !== 1) {
    /* 兩個人同名，或一個都沒有——都不要猜 */
    return { email: '', name: String(name || ''), many: hits.length > 1,
             twins: _ttLookAlikes(all.map(r => String(r.name || '')), [name]) };
  }
  return { email: hits[0].email, name: hits[0].name || hits[0].email,
           many: false, twins: _ttLookAlikes(all.map(r => String(r.name || '')), [name]) };
}

/* 找出「用到的名字」裡，有沒有跟名單中另一個名字長得很像的（距離 1 以內）。
   ⚠ 只比對**真的被用到**的名字，不然整份名單兩兩比會吵死人。 */
function _ttLookAlikes(all, used) {
  const norm = (x) => String(x || '').trim().toLowerCase();
  const near = (a, b) => {
    if (a === b) return false;
    if (Math.abs(a.length - b.length) > 1) return false;
    if (a.length === b.length) {
      // 換一個字母（Elroy/Elrey）或相鄰兩個字母對調（Elroy/Elory）
      const d = [];
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d.push(i);
      if (d.length === 1) return true;
      return d.length === 2 && d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]];
    }
    const [lo, hi] = a.length < b.length ? [a, b] : [b, a];   // 差一個字母
    for (let i = 0; i <= lo.length; i++) {
      if (lo.slice(0, i) + hi[i] + lo.slice(i) === hi) return true;
    }
    return false;
  };
  const out = [];
  [...new Set(used.map(norm))].forEach(u => {
    all.forEach(n => { if (near(u, norm(n))) {
      const pair = [u, norm(n)].sort().join(' / ');
      if (out.indexOf(pair) < 0) out.push(pair);
    } });
  });
  return out;
}

/* 某一天有哪幾堂（0=日 … 6=六）。 */
function timetableOfDay(tt, day) {
  return ((tt && tt.slots) || []).filter(s => Number(s.day) === Number(day))
    .sort((a, b) => (a.start < b.start ? -1 : 1));
}
/* 這位學生每週有哪幾堂（v496 的單一 slot 換成這個）。 */
function timetableOfStudent(tt, email) {
  const id = String(email || '').toLowerCase();
  return ((tt && tt.slots) || []).filter(s => (s.students || []).indexOf(id) >= 0)
    .sort((a, b) => a.day - b.day || (a.start < b.start ? -1 : 1));
}
/* 這位學生「下一次上課」是哪一天（含今天）。
   ⚠ v496 只看一個固定時段，但他多數學生一週兩堂 → 要在所有時段裡挑最近的那一個。 */
function timetableNextDate(tt, email, from) {
  const slots = timetableOfStudent(tt, email);
  if (!slots.length) return window.lessonISO(from ? new Date(from) : new Date());
  const base = from ? new Date(from + 'T00:00:00') : new Date();
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  let best = null;
  slots.forEach(s => {
    const d = new Date(b);
    d.setDate(d.getDate() + ((Number(s.day) - d.getDay() + 7) % 7));
    if (!best || d < best) best = d;
  });
  return window.lessonISO(best);
}
/* 這一堂跟誰一起上（只有標記 together 的才算）。 */
function timetableBuddies(tt, email, slotId) {
  const id = String(email || '').toLowerCase();
  const s = ((tt && tt.slots) || []).find(x => x.id === slotId);
  if (!s || !s.together) return [];
  return (s.students || []).filter(e => e !== id);
}
/* 這位學生在某一天的那一堂（用來知道「今天這堂跟誰一起」）。 */
function timetableSlotOn(tt, email, dateISO) {
  const d = new Date(dateISO + 'T00:00:00').getDay();
  const id = String(email || '').toLowerCase();
  return timetableOfDay(tt, d).find(s => (s.students || []).indexOf(id) >= 0) || null;
}

/* 一週總時數——Alan 可以一眼看出這學期排了多少課。 */
function timetableHours(tt) {
  const mins = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
  return (((tt && tt.slots) || []).reduce((a, s) => a + Math.max(0, mins(s.end) - mins(s.start)), 0) / 60);
}

async function saveTimetable(tt) {
  await _db.collection('class').doc(TT_DOC).set({ slots: (tt && tt.slots) || [], at: Date.now() });
}
function subscribeTimetable(cb) {
  try {
    return _db.collection('class').doc(TT_DOC)
      .onSnapshot(s => cb(s.exists ? s.data() : null), () => cb(null));
  } catch (e) { cb(null); return () => {}; }
}

Object.assign(window, { TT_DAYS, timetableParse, timetableOfDay, timetableOfStudent,
                        timetableNextDate, timetableHours, timetableBuddies, timetableSlotOn,
                        saveTimetable, subscribeTimetable });

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
/* 給老師看的一行文字：每種題型欄位名不一樣，找得到的第一個就用 */
function qmoveLabel(q) {
  if (!q) return '';
  const t = q.q || q.question || q.sentence || q.prompt || q.text || q.word || q.en
    || (Array.isArray(q.words) ? q.words.join(' ') : '');
  const extra = (q.def && q.word) ? ` = ${q.def}` : '';
  return (String(t || '').replace(/\s+/g, ' ').trim() + extra) || '（空白）';
}
/* 只有「同樣題型、同樣 variant」才搬得過去：填空和改寫的資料長得一樣但教的東西不同 */
function qmoveCompatible(a, b) {
  return !!(a && b && qmoveInfo(a) && a.type === b.type && (a.variant || '') === (b.variant || ''));
}
function qmoveFind(weeks, weekId, itemId) {
  const wk = weeks && weeks[weekId];
  if (!wk || !wk.items) return null;
  for (const catId of Object.keys(wk.items)) {
    const it = (wk.items[catId] || []).find(x => x && x.id === itemId);
    if (it) return { catId, item: it, week: wk };
  }
  return null;
}
/* idx＝要搬的題目在來源單元裡的位置。copy＝複製（來源不動）。
   force＝來源會少到玩不了也照做。回傳 { ok, error, weeks, moved, left, need } */
function qmoveApply(weeks, { src, dst, idx, copy, force } = {}) {
  const w = JSON.parse(JSON.stringify(weeks || {}));
  const s = src && qmoveFind(w, src.weekId, src.itemId);
  const d = dst && qmoveFind(w, dst.weekId, dst.itemId);
  if (!s || !d) return { ok: false, error: 'notfound' };
  if (s.item === d.item || (src.weekId === dst.weekId && src.itemId === dst.itemId)) return { ok: false, error: 'same' };
  if (!qmoveCompatible(s.item, d.item)) return { ok: false, error: 'type' };
  const si = qmoveInfo(s.item), di = qmoveInfo(d.item);
  const pick = Array.from(new Set((idx || []).map(Number))).filter(i => i >= 0 && i < si.list.length).sort((a, b) => a - b);
  if (!pick.length) return { ok: false, error: 'empty' };
  const left = copy ? si.list.length : si.list.length - pick.length;
  if (!copy && left < si.min && !force) return { ok: false, error: 'unplayable', left, need: si.min };
  if (!Array.isArray(d.item[di.field])) d.item[di.field] = [];
  const dstList = d.item[di.field];
  const taken = new Set(dstList.map(q => q && q.id).filter(Boolean));
  pick.forEach(i => {
    const q = JSON.parse(JSON.stringify(si.list[i]));
    if (q && q.id) {
      let id = q.id, n = 2;
      while (taken.has(id)) { id = `${q.id}-${n}`; n++; }
      taken.add(id); q.id = id;
    }
    dstList.push(q);
  });
  if (!copy) {
    const gone = new Set(pick);
    s.item[si.field] = si.list.filter((_, i) => !gone.has(i));
  }
  return { ok: true, weeks: w, moved: pick.length, left: copy ? si.list.length : s.item[si.field].length };
}

/* 挑單元組成新的一份：勾了「需要先學完」的教學卡或「對應單字卡」的練習，
   那張卡也要一起帶，不然複製過去之後它指向一個不存在的單元 */
function composeClosure(weeks, picks) {
  const out = [], seen = new Set();
  const key = p => p.weekId + '\u0001' + p.itemId;
  const add = p => {
    if (seen.has(key(p))) return;
    const f = qmoveFind(weeks, p.weekId, p.itemId);
    if (!f) return;
    seen.add(key(p)); out.push({ weekId: p.weekId, itemId: p.itemId, auto: !!p.auto });
    [f.item.requires, f.item.linkedFlashcardId].forEach(id => { if (id) add({ weekId: p.weekId, itemId: id, auto: true }); });
  };
  (picks || []).forEach(add);
  return out;
}
/* picks＝[{ weekId, itemId }]（來源週＋單元）。target＝目標週 id（要已經存在）。
   group 有填就把複製過去的單元都歸到這個組名；dueDate 有填就同時設成作業。 */
function composeApply(weeks, { picks, target, group, dueDate } = {}) {
  const w = JSON.parse(JSON.stringify(weeks || {}));
  const dst = w[target];
  if (!dst) return { ok: false, error: 'notarget' };
  const list = composeClosure(w, picks);
  if (!list.length) return { ok: false, error: 'empty' };
  if (!dst.items) dst.items = {};
  const taken = new Set(Object.values(dst.items).flat().map(it => it && it.id).filter(Boolean));
  const map = {};              // 'weekId\u0001舊id' → 新 id
  const made = [];
  list.forEach(p => {
    const f = qmoveFind(w, p.weekId, p.itemId);
    if (!f) return;
    const clone = JSON.parse(JSON.stringify(f.item));
    let id = f.item.id, n = 2;
    while (taken.has(id)) { id = `${f.item.id}-${n}`; n++; }
    taken.add(id); clone.id = id;
    map[p.weekId + '\u0001' + p.itemId] = id;
    clone.__from = p.weekId;
    if (group) clone.group = group;
    if (!Array.isArray(dst.items[f.catId])) dst.items[f.catId] = [];
    dst.items[f.catId].push(clone);
    made.push(clone);
  });
  let dropped = 0;
  made.forEach(c => {
    ['requires', 'linkedFlashcardId'].forEach(k => {
      if (!c[k]) return;
      const nid = map[c.__from + '\u0001' + c[k]];
      if (nid) c[k] = nid; else { delete c[k]; dropped++; }
    });
    delete c.__from;
  });
  if (dueDate) {
    if (!dst.homework) dst.homework = {};
    made.forEach(c => { dst.homework[c.id] = { dueDate }; });
  }
  return { ok: true, weeks: w, copied: made.length, auto: list.filter(p => p.auto).length, dropped };
}
/* 新增一週用的 id：最後一週的尾巴數字 +1（保留位數），撞到就一直加到不撞 */
function composeNextWeekId(weekOrder) {
  const ids = weekOrder || [];
  const last = ids[ids.length - 1] || 'week-00';
  const m = /^(.*?)(\d+)$/.exec(last);
  if (!m) { let n = 2; while (ids.includes(`${last}-${n}`)) n++; return `${last}-${n}`; }
  let num = parseInt(m[2], 10) + 1;
  const pad = m[2].length;
  let id = m[1] + String(num).padStart(pad, '0');
  while (ids.includes(id)) { num++; id = m[1] + String(num).padStart(pad, '0'); }
  return id;
}
Object.assign(window, { QMOVE_LISTS, qmoveInfo, qmoveLabel, qmoveCompatible, qmoveFind, qmoveApply,
                        composeClosure, composeApply, composeNextWeekId });

/* ══════════════════════════════════════════════════════════════════
   v593 🗑 垃圾桶（Alan 清單第 1 項：「刪單元、刪整組、搬移之後可以復原」）
   以前刪掉就真的沒了——而且網站上有好幾條路會刪（單元的垃圾桶鈕、整組刪、聊天室、
   刪整週），全部都走 handleDeleteItems／handleDeleteWeek，所以只要在這兩個出口
   先拍一張快照，就一個都不會漏。
   ⭐ 存在 `class/trash_<年級>`——class 集合的規則本來就是「老師可寫」，
     **不用再改 Firestore 規則**（開新集合要 Alan 重貼規則，卡過好幾個功能）。
   ⚠ 每筆的內容序列化成一個字串存（Firestore 不收「陣列裡面直接放陣列」，
     題目資料裡有這種形狀；字串最單純，也不會被 undefined 弄壞）。
   ⚠ 學生做過的紀錄本來就留著（key＝週次_單元 id）→ 復原時**用原本的 id**，
     成績就跟著回來。id 已經被占用就當作「已經在了」不重複放。
   ⚠ 刪除時別的單元身上「需要先學完這一個」「對應這張單字卡」的指向會被解掉，
     復原時要接回去——所以快照要把 links 一起記。 */
const TRASH_MAX = 30, TRASH_TTL = 30 * 24 * 3600 * 1000, TRASH_MAX_BYTES = 600000;
function _trashId() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function trashSnapshotUnits(weeks, weekId, ids) {
  const wk = weeks && weeks[weekId];
  const set = new Set((ids || []).filter(Boolean));
  if (!wk || !wk.items || !set.size) return null;
  const items = [], links = [], homework = {};
  Object.keys(wk.items).forEach(catId => (wk.items[catId] || []).forEach(it => {
    if (!it) return;
    if (set.has(it.id)) {
      items.push({ catId, item: JSON.parse(JSON.stringify(it)) });
      if (wk.homework && wk.homework[it.id]) homework[it.id] = JSON.parse(JSON.stringify(wk.homework[it.id]));
    } else {
      ['requires', 'linkedFlashcardId'].forEach(key => { if (it[key] && set.has(it[key])) links.push({ itemId: it.id, key, to: it[key] }); });
    }
  }));
  if (!items.length) return null;
  const titles = items.map(x => x.item.title || x.item.id);
  const groups = Array.from(new Set(items.map(x => String(x.item.group || '').trim()).filter(Boolean)));
  const label = items.length === 1 ? titles[0]
    : (groups.length === 1 ? `${groups[0]}（${items.length} 個單元）` : `${titles[0]} 等 ${items.length} 個單元`);
  return { id: _trashId(), at: Date.now(), kind: 'units', n: items.length, label,
           weekLabel: wk.label || weekId, data: { weekId, items, links, homework } };
}
function trashRestoreUnits(weeks, entry) {
  const d = entry && entry.data;
  const w = JSON.parse(JSON.stringify(weeks || {}));
  const wk = d && w[d.weekId];
  if (!wk) return { ok: false, error: 'noweek' };
  if (!wk.items) wk.items = {};
  const have = new Set(Object.values(wk.items).flat().map(it => it && it.id).filter(Boolean));
  const back = new Set();
  let skipped = 0;
  (d.items || []).forEach(({ catId, item }) => {
    if (!item || !item.id) return;
    if (have.has(item.id)) { skipped++; return; }
    if (!Array.isArray(wk.items[catId])) wk.items[catId] = [];
    wk.items[catId].push(JSON.parse(JSON.stringify(item)));
    have.add(item.id); back.add(item.id);
  });
  if (!back.size && skipped) return { ok: false, error: 'already' };
  if (!wk.homework) wk.homework = {};
  Object.keys(d.homework || {}).forEach(id => { if (back.has(id) && !wk.homework[id]) wk.homework[id] = d.homework[id]; });
  let relinked = 0;
  (d.links || []).forEach(l => {
    if (!back.has(l.to)) return;
    const other = Object.values(wk.items).flat().find(it => it && it.id === l.itemId);
    if (other && !other[l.key]) { other[l.key] = l.to; relinked++; }
  });
  return { ok: true, weeks: w, restored: back.size, skipped, relinked };
}
function trashSnapshotWeek(weeks, order, weekId) {
  const wk = weeks && weeks[weekId];
  if (!wk) return null;
  const n = Object.values(wk.items || {}).reduce((s, a) => s + ((a || []).length), 0);
  return { id: _trashId(), at: Date.now(), kind: 'week', n, label: wk.label || weekId, weekLabel: wk.label || weekId,
           data: { weekId, week: JSON.parse(JSON.stringify(wk)), index: (order || []).indexOf(weekId) } };
}
function trashRestoreWeek(weeks, order, entry) {
  const d = entry && entry.data;
  if (!d || !d.week) return { ok: false, error: 'bad' };
  if (weeks && weeks[d.weekId]) return { ok: false, error: 'exists' };
  const w = { ...(weeks || {}), [d.weekId]: JSON.parse(JSON.stringify(d.week)) };
  const o = (order || []).slice();
  const at = d.index >= 0 ? Math.min(d.index, o.length) : o.length;
  o.splice(at, 0, d.weekId);
  return { ok: true, weeks: w, order: o };
}
/* 過期（30 天）、太多（30 筆）、太大（整份 600KB）都從最舊的丟——文件有 1MB 上限，寫不進去比丟舊的更糟 */
function trashTrim(list, { now = Date.now(), max = TRASH_MAX, ttl = TRASH_TTL, maxBytes = TRASH_MAX_BYTES } = {}) {
  let out = (list || []).filter(e => e && e.id && now - (e.at || 0) < ttl).sort((a, b) => b.at - a.at).slice(0, max);
  const size = (xs) => JSON.stringify(xs).length;
  while (out.length > 1 && size(out) > maxBytes) out.pop();
  return out;
}
function trashPack(e) { const { data, ...meta } = e; return { ...meta, json: JSON.stringify(data) }; }
function trashUnpack(r) { try { const { json, ...meta } = r; return { ...meta, data: JSON.parse(json) }; } catch (x) { return null; } }
const _trashDoc = (grade) => _db.collection('class').doc('trash_' + String(grade || 'g3'));
async function trashLoad(grade) {
  const s = await _trashDoc(grade).get();
  const rows = (s.exists && s.data().entries) || [];
  return trashTrim(rows.map(trashUnpack).filter(Boolean));
}
/* 讀了再寫要用交易：另一個 session 同時也在刪東西的話，不能互相蓋掉對方剛放進去的那一筆 */
async function trashPush(grade, entry) {
  const ref = _trashDoc(grade);
  await _db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const cur = ((s.exists && s.data().entries) || []).map(trashUnpack).filter(Boolean);
    tx.set(ref, { entries: trashTrim([entry].concat(cur)).map(trashPack) });
  });
}
async function trashRemove(grade, id) {
  const ref = _trashDoc(grade);
  await _db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const cur = ((s.exists && s.data().entries) || []).map(trashUnpack).filter(Boolean).filter(e => e.id !== id);
    tx.set(ref, { entries: trashTrim(cur).map(trashPack) });
  });
}
async function trashClear(grade) { await _trashDoc(grade).set({ entries: [] }); }
Object.assign(window, { TRASH_MAX, trashSnapshotUnits, trashRestoreUnits, trashSnapshotWeek, trashRestoreWeek, trashTrim,
                        trashPack, trashUnpack, trashLoad, trashPush, trashRemove, trashClear });
