// data-g6.js — G6 grade data for Alan's English Class PWA
// Loaded after data.js; Firebase is already initialized.

/* ─── Firestore ─────────────────────────────────────────────────────────── */
const _dbG6       = firebase.firestore();
const _classDocG6 = _dbG6.collection('class').doc('data_g6');

/* ─── Storage keys ──────────────────────────────────────────────────────── */
const G6_STORAGE_KEY = 'alans-english-g6-data-v1';
const G6_ORDER_KEY   = 'alans-english-g6-order-v1';
const G6_DATA_VERSION = 1;

/* ─── Categories ────────────────────────────────────────────────────────── */
const CATEGORIES_G6 = [
  {
    id: 'vocab',
    num: '01',
    title: 'FET Vocabulary',
    titleZh: '外師單字',
    desc: 'FET lesson vocabulary — flashcards, fill-in-the-blank, and quiz practice.',
    descZh: '本週外師課堂單字，透過字卡、填空與測驗全面練習字彙。',
  },
  {
    id: 'grammar',
    num: '02',
    title: 'Grammar',
    titleZh: '文法',
    desc: 'Grammar focus for the week — multiple choice, type-answer, and writing practice.',
    descZh: '本週文法重點練習，包含選擇題、打字作答與造句練習。',
  },
  {
    id: 'word',
    num: '03',
    title: 'Word Study',
    titleZh: '字彙學習',
    desc: 'Syllable division, suffix/prefix study, and word classification activities.',
    descZh: '音節切割、字首字尾分析與單字分類，深化字彙理解。',
  },
  {
    id: 'reading',
    num: '04',
    title: 'Reading & Writing',
    titleZh: '閱讀寫作',
    desc: 'Reading passages with comprehension questions and writing practice.',
    descZh: '閱讀短文加上理解測驗與造句寫作，全面提升閱讀與寫作能力。',
  },
];

/* ─── Default week order ────────────────────────────────────────────────── */
const G6_DEFAULT_WEEK_ORDER = [
  'g6-2026-W01', 'g6-2026-W02', 'g6-2026-W03', 'g6-2026-W04',
  'g6-2026-W05', 'g6-2026-W06', 'g6-2026-W07', 'g6-2026-W08',
];

/* ─── Seed weeks (empty, teacher fills in) ───────────────────────────────── */
const G6_SEED_WEEKS = {
  'g6-2026-W01': { id: 'g6-2026-W01', label: 'G6 Week 1',  dateRange: '—', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], grammar: [], word: [], reading: [] } },
  'g6-2026-W02': { id: 'g6-2026-W02', label: 'G6 Week 2',  dateRange: '—', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], grammar: [], word: [], reading: [] } },
  'g6-2026-W03': { id: 'g6-2026-W03', label: 'G6 Week 3',  dateRange: '—', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], grammar: [], word: [], reading: [] } },
  'g6-2026-W04': { id: 'g6-2026-W04', label: 'G6 Week 4',  dateRange: '—', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], grammar: [], word: [], reading: [] } },
  'g6-2026-W05': { id: 'g6-2026-W05', label: 'G6 Week 5',  dateRange: '—', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], grammar: [], word: [], reading: [] } },
  'g6-2026-W06': { id: 'g6-2026-W06', label: 'G6 Week 6',  dateRange: '—', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], grammar: [], word: [], reading: [] } },
  'g6-2026-W07': { id: 'g6-2026-W07', label: 'G6 Week 7',  dateRange: '—', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], grammar: [], word: [], reading: [] } },
  'g6-2026-W08': { id: 'g6-2026-W08', label: 'G6 Week 8',  dateRange: '—', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], grammar: [], word: [], reading: [] } },
};

/* ─── Firestore subscribe ────────────────────────────────────────────────── */
function subscribeToClassDataG6(callback, onError) {
  return _classDocG6.onSnapshot(snap => {
    if (snap.exists) {
      const d = snap.data();
      if (!d._version || d._version < G6_DATA_VERSION) {
        const existingWeeks = d.weeks || {};
        const merged = _mergeG6WithSeed(existingWeeks, G6_SEED_WEEKS);
        const mergedOrder = Array.isArray(d.weekOrder) && d.weekOrder.length > 0
          ? d.weekOrder : G6_DEFAULT_WEEK_ORDER.slice();
        _classDocG6.set({ _version: G6_DATA_VERSION, weeks: merged, weekOrder: mergedOrder }, { merge: true }).catch(() => {});
        callback(merged, mergedOrder);
        return;
      }
      const w = d.weeks || G6_SEED_WEEKS;
      const o = Array.isArray(d.weekOrder) && d.weekOrder.length > 0
        ? d.weekOrder : Object.keys(w).sort();
      callback(w, o);
    } else {
      _classDocG6.set({ _version: G6_DATA_VERSION, weeks: G6_SEED_WEEKS, weekOrder: G6_DEFAULT_WEEK_ORDER }).catch(() => {});
      callback(G6_SEED_WEEKS, G6_DEFAULT_WEEK_ORDER.slice());
    }
  }, err => {
    console.warn('subscribeToClassDataG6:', err?.code);
    if (onError) onError(err);
  });
}

/* ─── Smart merge (preserve teacher edits, fill empty items from seed) ───── */
function _mergeG6WithSeed(existing, seed) {
  const result = JSON.parse(JSON.stringify(seed));
  Object.entries(existing).forEach(([wid, ew]) => {
    if (!result[wid]) { result[wid] = ew; return; }
    const rw = result[wid];
    ['label','dateRange','theme','themeZh','subtitle','subtitleZh'].forEach(f => {
      if (ew[f] !== undefined) rw[f] = ew[f];
    });
    Object.keys(rw.items).forEach(cat => {
      if (ew.items && ew.items[cat] && ew.items[cat].length > 0) {
        rw.items[cat] = ew.items[cat];
      }
    });
    if (ew.items) {
      Object.keys(ew.items).forEach(cat => {
        if (!rw.items[cat]) rw.items[cat] = ew.items[cat];
      });
    }
  });
  return result;
}

/* ─── Save / Load ────────────────────────────────────────────────────────── */
async function saveWeeksG6(weeks)    { await _classDocG6.set({ weeks },        { merge: true }); }
async function saveWeekOrderG6(o)    { await _classDocG6.set({ weekOrder: o }, { merge: true }); }

function loadWeeksG6() {
  try {
    const r = localStorage.getItem(G6_STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch(e) {}
  return G6_SEED_WEEKS;
}
function loadWeekOrderG6() {
  try {
    const r = localStorage.getItem(G6_ORDER_KEY);
    if (r) { const a = JSON.parse(r); if (Array.isArray(a) && a.length) return a; }
  } catch(e) {}
  return G6_DEFAULT_WEEK_ORDER.slice();
}

/* ─── Exports ───────────────────────────────────────────────────────────── */
Object.assign(window, {
  CATEGORIES_G6,
  G6_DEFAULT_WEEK_ORDER,
  subscribeToClassDataG6,
  saveWeeksG6,
  saveWeekOrderG6,
  loadWeeksG6,
  loadWeekOrderG6,
});
