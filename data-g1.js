// data-g1.js — G1 grade data for Alan's English Class PWA
// Loaded after data.js; Firebase is already initialized.
//
// v399（2026-08-31 開學）：新增一年級。學號 le15 算出來就是 G1，
// 在這之前 gradeFromEmail 只認 G2–G6，一年級的學生會判不出年級。
// 結構完全照 data-g4.js 那一套（class/data_g1 一份文件，_version 1）。

/* ─── Firestore ─────────────────────────────────────────────────────────── */
const _dbG1       = firebase.firestore();
const _classDocG1 = _dbG1.collection('class').doc('data_g1');

/* ─── Storage keys ──────────────────────────────────────────────────────── */
const G1_STORAGE_KEY = 'alans-english-g1-data-v1';
const G1_ORDER_KEY   = 'alans-english-g1-order-v1';
const G1_DATA_VERSION = 1;

/* ─── Categories（沿用 G2 的四類——一年級跟二年級是同一種課表）────────── */
const CATEGORIES_G1 = [
  { id:'vocab',   num:'01', title:'CET Vocabulary',        titleZh:'中師單字',  desc:'CET lesson vocabulary — flashcards and fill-in-the-blank practice.', descZh:'本週中師課堂單字，透過字卡和填空練習建立字彙基礎。' },
  { id:'word',    num:'02', title:'FET Vocabulary',        titleZh:'外師單字',  desc:'FET lesson vocabulary — flashcards and fill-in-the-blank practice.', descZh:'本週外師課堂單字，透過字卡和填空練習熟悉單字用法。' },
  { id:'grammar', num:'03', title:'Grammar',               titleZh:'文法',      desc:'Sentence patterns and grammar drills for young learners.',          descZh:'本週文法重點：句型與基礎文法練習。' },
  { id:'reading', num:'04', title:'Reading Comprehension', titleZh:'閱讀理解',  desc:'Short passages with comprehension questions.',                       descZh:'短文閱讀加上閱讀測驗，培養閱讀理解能力。' },
];

/* ─── Default week order ────────────────────────────────────────────────── */
/* 2026 學年上學期第 1–10 週。id／label／dateRange 是用 components-editor.jsx 的
   termWeekPlan('2026-08-31', 10, 'g1-', 'F') 產生的，跟老師按
   「📅 建立一整個學期」開出來的格式完全一樣（之後要續開第 11 週以後就按那顆）。 */
const G1_DEFAULT_WEEK_ORDER = [
  'g1-2026F-W01', 'g1-2026F-W02', 'g1-2026F-W03', 'g1-2026F-W04', 'g1-2026F-W05',
  'g1-2026F-W06', 'g1-2026F-W07', 'g1-2026F-W08', 'g1-2026F-W09', 'g1-2026F-W10',
];

/* ─── Seed weeks（空的，老師自己填）──────────────────────────────────── */
const G1_SEED_WEEKS = {
  'g1-2026F-W01': { id: 'g1-2026F-W01', label: 'Week 1', dateRange: 'Aug 31 – Sep 6', startISO: '2026-08-31', endISO: '2026-09-06', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
  'g1-2026F-W02': { id: 'g1-2026F-W02', label: 'Week 2', dateRange: 'Sep 7 – Sep 13', startISO: '2026-09-07', endISO: '2026-09-13', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
  'g1-2026F-W03': { id: 'g1-2026F-W03', label: 'Week 3', dateRange: 'Sep 14 – Sep 20', startISO: '2026-09-14', endISO: '2026-09-20', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
  'g1-2026F-W04': { id: 'g1-2026F-W04', label: 'Week 4', dateRange: 'Sep 21 – Sep 27', startISO: '2026-09-21', endISO: '2026-09-27', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
  'g1-2026F-W05': { id: 'g1-2026F-W05', label: 'Week 5', dateRange: 'Sep 28 – Oct 4', startISO: '2026-09-28', endISO: '2026-10-04', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
  'g1-2026F-W06': { id: 'g1-2026F-W06', label: 'Week 6', dateRange: 'Oct 5 – Oct 11', startISO: '2026-10-05', endISO: '2026-10-11', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
  'g1-2026F-W07': { id: 'g1-2026F-W07', label: 'Week 7', dateRange: 'Oct 12 – Oct 18', startISO: '2026-10-12', endISO: '2026-10-18', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
  'g1-2026F-W08': { id: 'g1-2026F-W08', label: 'Week 8', dateRange: 'Oct 19 – Oct 25', startISO: '2026-10-19', endISO: '2026-10-25', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
  'g1-2026F-W09': { id: 'g1-2026F-W09', label: 'Week 9', dateRange: 'Oct 26 – Nov 1', startISO: '2026-10-26', endISO: '2026-11-01', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
  'g1-2026F-W10': { id: 'g1-2026F-W10', label: 'Week 10', dateRange: 'Nov 2 – Nov 8', startISO: '2026-11-02', endISO: '2026-11-08', theme: '', themeZh: '', subtitle: '', subtitleZh: '', items: { vocab: [], word: [], grammar: [], reading: [] } },
};

/* ─── Firestore subscribe ────────────────────────────────────────────────── */
function subscribeToClassDataG1(callback, onError) {
  return _classDocG1.onSnapshot(snap => {
    if (snap.exists) {
      const d = snap.data();
      if (!d._version || d._version < G1_DATA_VERSION) {
        const existingWeeks = d.weeks || {};
        const merged = _mergeG1WithSeed(existingWeeks, G1_SEED_WEEKS);
        const mergedOrder = Array.isArray(d.weekOrder) && d.weekOrder.length > 0
          ? d.weekOrder : G1_DEFAULT_WEEK_ORDER.slice();
        _classDocG1.set({ _version: G1_DATA_VERSION, weeks: merged, weekOrder: mergedOrder }, { merge: true }).catch(() => {});
        callback(merged, mergedOrder);
        return;
      }
      const w = d.weeks || G1_SEED_WEEKS;
      const o = Array.isArray(d.weekOrder) && d.weekOrder.length > 0
        ? d.weekOrder : Object.keys(w).sort();
      window.noteCloudWeeks && window.noteCloudWeeks('g1', w);   // v359 存檔防呆
      callback(w, o);
    } else {
      _classDocG1.set({ _version: G1_DATA_VERSION, weeks: G1_SEED_WEEKS, weekOrder: G1_DEFAULT_WEEK_ORDER }).catch(() => {});
      callback(G1_SEED_WEEKS, G1_DEFAULT_WEEK_ORDER.slice());
    }
  }, err => {
    console.warn('subscribeToClassDataG1:', err?.code);
    if (onError) onError(err);
  });
}

/* ─── Smart merge（保留老師改過的內容，只把空的欄位補上 seed）─────────── */
function _mergeG1WithSeed(existing, seed) {
  const result = JSON.parse(JSON.stringify(seed));
  Object.entries(existing).forEach(([wid, ew]) => {
    if (!result[wid]) { result[wid] = ew; return; }
    const rw = result[wid];
    ['label','dateRange','theme','themeZh','subtitle','subtitleZh','archived'].forEach(f => {
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
async function saveWeeksG1(weeks)    { window.guardWeekSave && window.guardWeekSave('g1', weeks); await _classDocG1.set({ weeks },        { merge: true }); }
async function saveWeekOrderG1(o)    { await _classDocG1.set({ weekOrder: o }, { merge: true }); }

function loadWeeksG1() {
  try {
    const r = localStorage.getItem(G1_STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch(e) {}
  return G1_SEED_WEEKS;
}
function loadWeekOrderG1() {
  try {
    const r = localStorage.getItem(G1_ORDER_KEY);
    if (r) { const a = JSON.parse(r); if (Array.isArray(a) && a.length) return a; }
  } catch(e) {}
  return G1_DEFAULT_WEEK_ORDER.slice();
}

/* ─── Exports ───────────────────────────────────────────────────────────── */
Object.assign(window, {
  CATEGORIES_G1,
  G1_DEFAULT_WEEK_ORDER,
  subscribeToClassDataG1,
  saveWeeksG1,
  saveWeekOrderG1,
  loadWeeksG1,
  loadWeekOrderG1,
});
