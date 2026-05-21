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
const _classDoc = _db.collection('class').doc('data');

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
  quizlet:  { label: "Quizlet",  zh: "字卡",   embed: true,  cta: "Play →" },
  wordwall: { label: "Wordwall", zh: "遊戲",   embed: true,  cta: "Play →" },
  youtube:  { label: "Video",    zh: "影片",   embed: true,  cta: "Watch →" },
  form:     { label: "Quiz",     zh: "小考",   embed: true,  cta: "Take →" },
  pdf:      { label: "PDF",      zh: "練習卷", embed: false, cta: "Download ↓" },
  note:     { label: "Notes",    zh: "筆記",   embed: false, cta: "Read →" },
  image:    { label: "Image",    zh: "圖片",   embed: false, cta: "View →" },
  quiz:     { label: "Quiz",     zh: "測驗",   embed: false, cta: "Start →" },
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

Object.assign(window, {
  CATEGORIES, SEED_WEEKS, DEFAULT_WEEK_ORDER, TYPE_META,
  loadWeeks, saveWeeks, loadProgress, saveProgress, toYouTubeEmbed,
  loadWeekOrder, saveWeekOrder, suggestNextWeekId,
  subscribeToClassData, uploadPdfToStorage,
});
