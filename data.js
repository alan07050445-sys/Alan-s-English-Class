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

// ── 🔑 Teacher email — fill in YOUR Google account email here ──────────
// Only this account will see the Edit button and Class Report dashboard.
const ADMIN_EMAILS = ['alan07050445@gmail.com'];

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
function subscribeToClassData(callback) {
  return _classDoc.onSnapshot(snap => {
    if (snap.exists) {
      const d = snap.data();
      const savedWeeks = d.weeks || SEED_WEEKS;
      const order = Array.isArray(d.weekOrder) && d.weekOrder.length > 0
        ? d.weekOrder
        : (Object.keys(savedWeeks).length > 0 ? Object.keys(savedWeeks).sort() : DEFAULT_WEEK_ORDER.slice());
      callback(cleanWeeks(savedWeeks), order);
    } else {
      callback(SEED_WEEKS, DEFAULT_WEEK_ORDER.slice());
    }
  });
}

async function saveWeeks(weeks) {
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

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' }); // always show account picker
  return _auth.signInWithPopup(provider);
}

function signOutUser() { return _auth.signOut(); }

function subscribeAuth(callback) { return _auth.onAuthStateChanged(callback); }

function isAdminUser(user) {
  return !!(user && ADMIN_EMAILS.includes(user.email));
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
    callback(snap.exists ? (snap.data()?.items || {}) : {});
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
      });
    });
    all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(all);
  });
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
  xp_500:      { emoji:'🥈', name:'積分新星',   nameEn:'XP Rising Star', desc:'累積500 XP' },
  xp_1000:     { emoji:'🥇', name:'積分達人',   nameEn:'XP Expert',      desc:'累積1000 XP' },
  xp_3000:     { emoji:'👑', name:'英語之星',   nameEn:'English Star',   desc:'累積3000 XP' },
};

// ── XP helpers ─────────────────────────────────────────────────────────
function getLevel(xp) {
  if (xp >= 3000) return { level:5, name:'英語之星', icon:'👑', next:null,  prevXp:3000 };
  if (xp >= 1000) return { level:4, name:'英語高手', icon:'🌟', next:3000, prevXp:1000 };
  if (xp >= 500)  return { level:3, name:'進步王',   icon:'⚡', next:1000, prevXp:500  };
  if (xp >= 200)  return { level:2, name:'書蟲',     icon:'📚', next:500,  prevXp:200  };
  return           { level:1, name:'新苗',     icon:'🌱', next:200,  prevXp:0    };
}

async function addXp(uid, amount) {
  if (!uid || !amount) return { xp: 0 };
  try {
    const ref = _db.collection('progress').doc(uid);
    const snap = await ref.get();
    const d = snap.exists ? (snap.data() || {}) : {};
    const newXp = (d.xp || 0) + amount;
    await ref.set({ xp: newXp }, { merge: true });
    return { xp: newXp };
  } catch(e) { return { xp: 0 }; }
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
  const wrongQuestions = (wrongList || []).map(q => ({
    q: String(q.q || '').slice(0, 180),
    answer: String((q.options || [])[q.correct] || '').slice(0, 120),
  })).filter(q => q.q);
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

async function checkWriting(word, sentence) {
  if (!sentence || !sentence.trim()) return '請先寫一個英文句子。';
  const endpoint = AI_WRITING_ENDPOINT || localStorage.getItem('alan-ai-writing-endpoint') || '';

  const systemPrompt =
`You are an elementary English teacher grading a student's sentence using the word "${word}".
Grade objectively. Do not invent praise. Every Good Job item must point to something actually present in the student's sentence.
If there is no clear objective strength, write: "目前還沒有明確做到的地方，先把句子補完整。"

Scoring standard (5 stars):
5★ = target word is used with its real meaning + grammar is correct + at least 7 words + capitalization/punctuation are correct + sentence is specific/clear.
4★ = mostly correct, with one small issue.
3★ = understandable, but has a grammar issue, weak detail, or only basic word usage.
2★ = target word is present but usage/grammar/completeness is weak.
1★ = missing target word, wrong meaning, fragment, or too unclear.

Reply in Traditional Chinese (繁體中文). Output ONLY these four sections:

【Score】
Use exactly 5 star characters, e.g. ⭐⭐⭐☆☆ (3/5), then one short objective reason.

【Good Job】
List 1-2 specific, factual things the student actually did well. Do not say "good grammar" unless grammar is correct. Do not say "used the word well" unless "${word}" is used with the correct meaning.

【To Improve】
List 1-2 objective fixes. Mention exact issues such as missing target word, wrong word meaning, grammar error, fewer than 7 words, missing capital letter, missing punctuation, or not enough detail.

【Better Version】
Write one improved sentence using "${word}" correctly. Keep the student's idea when possible. The sentence must be at least 7 words, natural, and suitable for elementary students.`;

  const userMessage = `指定單字：${word}\n\n學生句子：${sentence.trim()}`;

  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 500,
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
        model: 'claude-haiku-4-5', max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || '批改失敗，請再試一次。';
  } catch(e) { return '網路錯誤，請再試一次。'; }
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

Reply in Traditional Chinese (繁體中文). Output ONLY these four sections:

【Score】
Use exactly 5 star characters, e.g. ⭐⭐⭐☆☆ (3/5), then one short objective reason.

【Good Job】
List 1-2 specific, factual things the student actually answered correctly. If only one part is correct, name that exact part.

【To Improve】
List 1-2 objective fixes. Mention the missing answer point, missing evidence, incomplete sentence, wrong information, or grammar issue.

【Better Version】
Write a complete improved answer in simple English. Use the passage/key points if provided.`;

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
          max_tokens: 500,
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

Reply in Traditional Chinese (繁體中文). Output ONLY these four sections:

【Score】
Use exactly 5 star characters, e.g. ⭐⭐⭐☆☆ (3/5), then one short objective reason.

【Good Job】
List 1-2 specific, factual strengths. Mention the exact element, such as claim, reason, example, conclusion, organization, or grammar. Do not praise an element that is missing.

【To Improve】
List 1-2 objective fixes. Mention the exact part to improve: Claim, Reason, Example, Explanation, Conclusion, Organization, or Grammar.

【Better Version】
Write a better version of the essay keeping the student's main idea when possible. Use simple English suitable for elementary students.`;

  const userMessage = `作文題目：\n${essayPrompt.trim()}\n\n學生作文：\n${studentEssay.trim()}`;

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
    return `【Score】\n${starLine} — 有使用指定單字，句子長度、大小寫和標點都符合基本標準。\n\n【Good Job】\n- 句子有用到「${word}」。\n- 句子有至少 7 個字，並且有完整標點。\n\n【To Improve】\n- 可以加入更具體的時間、地點或原因，讓句子更生動。\n\n【Better Version】\n${s}`;
  }
  return `【Score】\n${starLine} — ${checks[0]}\n\n【Good Job】\n${wordUsed ? `- 句子有嘗試使用「${word}」。` : '- 目前還沒有明確做到的地方，先把句子補完整。'}\n\n【To Improve】\n${checks.map(x => `- ${x}`).join('\n')}\n\n【Better Version】\n${word ? `I can use ${word} in a clear sentence today.` : 'I can write a clear sentence today.'}`;
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

Reply in Traditional Chinese (繁體中文). Output ONLY these four sections:

【Score】
Use exactly 5 star characters, e.g. ⭐⭐⭐☆☆ (3/5), then one short objective reason.

【Good Job】
List 1-2 specific, factual strengths. Mention which stage: Introduction, Rising Action, Climax, Falling Action, or Resolution. Do not praise a missing stage.

【To Improve】
List 1-2 objective fixes. Mention exactly which stage is missing, unclear, illogical, too short, or grammatically hard to understand.

【Better Version】
Write a better full Story Mountain version keeping the student's main idea when possible. Keep it simple and natural for elementary students.`;

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

Object.assign(window, {
  CATEGORIES, SEED_WEEKS, DEFAULT_WEEK_ORDER, TYPE_META, ADMIN_EMAILS,
  loadWeeks, saveWeeks, loadProgress, saveProgress, toYouTubeEmbed,
  loadWeekOrder, saveWeekOrder, suggestNextWeekId,
  subscribeToClassData, uploadPdfToStorage,
  addLeaderboardEntry, deleteLeaderboardEntry, subscribeLeaderboard,
  // Auth
  signInWithGoogle, signOutUser, subscribeAuth, isAdminUser,
  // Per-user progress
  saveProgressItem, subscribeMyProgress, subscribeAllStudents, saveQuizMistakes,
  // Streak, Badges & XP
  BADGES, updateStreak, unlockBadge, subscribeUserProfile,
  getLevel, addXp,
  // Sound
  playSound,
  // AI Writing, Short Answer, Essay & Story Mountain
  checkWriting, checkShortAnswer, checkEssay, checkStoryMountain,
});
