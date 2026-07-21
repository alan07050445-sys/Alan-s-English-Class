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
function subscribeToClassData(callback, onError) {
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

async function addRosterStudent(email, name, grade) {
  const id = String(email || '').trim().toLowerCase();
  if (!id || !id.includes('@')) throw new Error('invalid-email');
  await _db.collection('roster').doc(id).set({
    name: (name || '').trim(),
    grade: grade || '',
    active: true,
    addedAt: Date.now(),
  });
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

// v263: 學生作業照片上傳（「上傳作業」題型）——存 submissions/{uid}/{progressKey}/
// ⚠ 需要 storage.rules 的 submissions 區塊已發布（Firebase Console → Storage → Rules）
async function uploadSubmissionPhoto(uid, progressKey, blob, idx) {
  const safeKey = String(progressKey).replace(/[^A-Za-z0-9_-]/g, '_');
  const ref = _storage.ref(`submissions/${uid}/${safeKey}/${Date.now()}_${idx}.jpg`);
  await ref.put(blob, { contentType: 'image/jpeg' });
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

// ── Companion / Coins / Daily Goal (localStorage — works for guests too) ──
const COMPANION_KEY = 'alan-companion';
const COINS_KEY     = 'alan-coins';
const DAILY_KEY     = 'alan-daily';
const DAILY_GOAL    = 3; // 每天完成幾個練習算達標

function loadCompanion() {
  try { const r = localStorage.getItem(COMPANION_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}
function saveCompanion(c) {
  try { localStorage.setItem(COMPANION_KEY, JSON.stringify({ ...c, createdAt: c.createdAt || Date.now() })); } catch(e) {}
  return loadCompanion();
}
function loadCoins() {
  try { return parseInt(localStorage.getItem(COINS_KEY) || '0', 10) || 0; } catch(e) { return 0; }
}
function addCoins(n) {
  const next = Math.max(0, loadCoins() + (n || 0));
  try { localStorage.setItem(COINS_KEY, String(next)); } catch(e) {}
  return next;
}
function _todayStr() { return new Date().toISOString().slice(0, 10); }
function loadDaily() {
  try {
    const d = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null');
    if (d && d.date === _todayStr()) return { date: d.date, done: d.done || 0, goal: DAILY_GOAL };
  } catch(e) {}
  return { date: _todayStr(), done: 0, goal: DAILY_GOAL };
}
// 完成一次練習 → 推進每日進度，回傳 { done, goal, justCompleted }
function bumpDaily(n = 1) {
  const cur = loadDaily();
  const before = cur.done;
  const done = Math.min(cur.goal, before + n);
  const rec = { date: cur.date, done, goal: cur.goal };
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(rec)); } catch(e) {}
  return { ...rec, justCompleted: before < cur.goal && done >= cur.goal };
}

// ── 商店 / 衣櫥（金幣換造型） ──────────────────────────
const WARDROBE_KEY = 'alan-wardrobe';
const SHOP_ITEMS = [
  { id: 'bow',   name: '蝴蝶結',  price: 20 },
  { id: 'party', name: '派對帽',  price: 30 },
  { id: 'grad',  name: '學士帽',  price: 50 },
  { id: 'cap',   name: '鴨舌帽',  price: 60 },
  { id: 'wizard',name: '魔法帽',  price: 90 },
  { id: 'crown', name: '皇冠',    price: 150 },
];
function loadWardrobe() {
  try {
    const r = JSON.parse(localStorage.getItem(WARDROBE_KEY) || 'null');
    if (r) return { owned: Array.isArray(r.owned) ? r.owned : [], equipped: r.equipped || null };
  } catch(e) {}
  return { owned: [], equipped: null };
}
function saveWardrobe(w) {
  try { localStorage.setItem(WARDROBE_KEY, JSON.stringify(w)); } catch(e) {}
  return loadWardrobe();
}
// 購買：扣金幣、加入衣櫥並自動穿上。回傳 { ok, coins, wardrobe, reason? }
function buyItem(id) {
  const item = SHOP_ITEMS.find(i => i.id === id);
  if (!item) return { ok: false, reason: 'bad-item' };
  const w = loadWardrobe();
  if (w.owned.includes(id)) { w.equipped = id; return { ok: true, coins: loadCoins(), wardrobe: saveWardrobe(w) }; }
  if (loadCoins() < item.price) return { ok: false, reason: 'broke', coins: loadCoins() };
  const coins = addCoins(-item.price);
  w.owned = [...w.owned, id];
  w.equipped = id;
  return { ok: true, coins, wardrobe: saveWardrobe(w) };
}
// 穿上 / 脫下（再點一次同件 = 脫下）
function equipItem(id) {
  const w = loadWardrobe();
  w.equipped = (w.equipped === id) ? null : id;
  return saveWardrobe(w);
}

// ── 個人每週任務（localStorage，每週一自動重置） ──────────
const QUESTS_KEY = 'alan-quests';
const WEEKLY_QUESTS = [
  { id: 'q_practice', label: '完成 12 個練習', goal: 12, metric: 'practices',    reward: 40 },
  { id: 'q_correct',  label: '答對 60 題',     goal: 60, metric: 'correct',      reward: 50 },
  { id: 'q_daily',    label: '達成 3 次每日目標', goal: 3, metric: 'dailyReached', reward: 60 },
];
function _weekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${wk}`;
}
function loadQuests() {
  let q;
  try { q = JSON.parse(localStorage.getItem(QUESTS_KEY) || 'null'); } catch(e) {}
  if (!q || q.weekKey !== _weekKey()) {
    q = { weekKey: _weekKey(), progress: { practices: 0, correct: 0, dailyReached: 0 }, claimed: [] };
    try { localStorage.setItem(QUESTS_KEY, JSON.stringify(q)); } catch(e) {}
  }
  return q;
}
function bumpQuests(delta) {
  const q = loadQuests();
  Object.keys(delta || {}).forEach(k => { q.progress[k] = (q.progress[k] || 0) + delta[k]; });
  try { localStorage.setItem(QUESTS_KEY, JSON.stringify(q)); } catch(e) {}
  return q;
}
function claimQuest(id) {
  const q = loadQuests();
  const def = WEEKLY_QUESTS.find(x => x.id === id);
  if (!def || q.claimed.includes(id)) return { ok: false, quests: q, coins: loadCoins() };
  if ((q.progress[def.metric] || 0) < def.goal) return { ok: false, quests: q, coins: loadCoins() };
  const coins = addCoins(def.reward);
  q.claimed.push(id);
  try { localStorage.setItem(QUESTS_KEY, JSON.stringify(q)); } catch(e) {}
  return { ok: true, quests: q, coins, reward: def.reward };
}

// ── 全班合作目標（Firestore 共享計數；學生貢獻需部署新版 rules） ──
const _coopDoc = _db.collection('coop').doc('current');
function subscribeCoop(callback, onError) {
  return _coopDoc.onSnapshot(
    snap => callback(snap.exists ? snap.data() : null),
    err => { if (onError) onError(err); }
  );
}
async function setCoopGoal(goal, reward) { // 老師專用
  await _coopDoc.set({ goal: Number(goal) || 0, reward: reward || '', weekKey: _weekKey(), count: 0, updatedAt: Date.now() }, { merge: true });
}
async function contributeCoop(n) { // 學生每次練習貢獻（失敗靜默）
  try {
    await _coopDoc.set({
      count: firebase.firestore.FieldValue.increment(n || 0),
      weekKey: _weekKey(),
    }, { merge: true });
  } catch(e) { /* 規則未部署或未授權時靜默略過 */ }
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
        xp: d.xp || 0,
        streak: d.streak || { count: 0 },
        badges: d.badges || {},
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
function speakText(text, { rate = 0.95, lang = 'en-US' } = {}) {
  try {
    if (!window.speechSynthesis || !text) return false;
    const synth = window.speechSynthesis;
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
      result.push({ q: wq.q, answer: wq.answer, itemId: itemKey, itemTitle, weekLabel, cat });
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

Object.assign(window, {
  CATEGORIES, SEED_WEEKS, DEFAULT_WEEK_ORDER, TYPE_META, ADMIN_EMAILS,
  loadWeeks, saveWeeks, loadProgress, saveProgress, toYouTubeEmbed,
  loadWeekOrder, saveWeekOrder, suggestNextWeekId,
  subscribeToClassData, uploadPdfToStorage, uploadSubmissionPhoto, uploadReadingPhoto,
  // Companion / Coins / Daily Goal
  loadCompanion, saveCompanion, loadCoins, addCoins, loadDaily, bumpDaily, DAILY_GOAL,
  // Shop / Wardrobe
  SHOP_ITEMS, loadWardrobe, saveWardrobe, buyItem, equipItem,
  // Quests / Co-op
  WEEKLY_QUESTS, loadQuests, bumpQuests, claimQuest,
  subscribeCoop, setCoopGoal, contributeCoop,
  // Roster
  subscribeRoster, addRosterStudent, setRosterStudentActive, deleteRosterStudent,
  addLeaderboardEntry, deleteLeaderboardEntry, subscribeLeaderboard,
  // Auth
  signInWithGoogle, signInWithGoogleRedirect, signOutUser, subscribeAuth, isAdminUser,
  // Per-user progress
  saveProgressItem, subscribeMyProgress, subscribeAllStudents, saveQuizMistakes,
  // Streak, Badges & XP
  BADGES, updateStreak, unlockBadge, subscribeUserProfile,
  getLevel, addXp,
  buildReportHTML,
  COMPANION_LINES, pickLine,
  // Sound & TTS
  playSound, speakText,
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
