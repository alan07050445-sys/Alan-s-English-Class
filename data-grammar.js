// data-grammar.js — 五大時態核心題庫（不是每週更換的練習，是一定要練熟的常設題庫）
// Loaded after data.js; Firebase is already initialized.
// 結構刻意沿用年級那一套（週次 → 分類 → 單元），這樣所有現成的播放器、
// 編輯器、指派、集點、成長曲線都直接可用，不必為它另外寫一套。
//   · 「週次」只有一個：gr-core（核心題庫），不會換。
//   · 「分類」＝五個時態。
//   · 每個時態底下：Type A 單句填空(type-answer)、Type B 短文填空(cloze)、
//     以及過去式的不規則動詞、現在完成式的過去分詞（單字卡／配對／聽寫）。

/* ─── Firestore ─────────────────────────────────────────────────────────── */
const _dbGR       = firebase.firestore();
const _classDocGR = _dbGR.collection('class').doc('data_grammar');

/* ─── Track id ──────────────────────────────────────────────────────────── */
const GRAMMAR_TRACK = 'gr';
function isGrammarTrack(g) { return g === GRAMMAR_TRACK; }

/* ─── Storage keys ──────────────────────────────────────────────────────── */
const GR_STORAGE_KEY = 'alans-english-gr-data-v1';
const GR_ORDER_KEY   = 'alans-english-gr-order-v1';
const GR_DATA_VERSION = 1;

/* ─── 分類 ＝ 五大時態 ──────────────────────────────────────────────────── */
const CATEGORIES_GR = [
  { id: 't1', num: '01', title: 'Simple Present',      titleZh: '現在簡單式',
    desc: 'Habits, routines, facts. He/She/It + -s.',
    descZh: '習慣、固定行程、事實與普遍真理。三單加 -s／-es。' },
  { id: 't2', num: '02', title: 'Simple Past',         titleZh: '過去簡單式',
    desc: 'Finished actions in the past. -ed and irregular verbs.',
    descZh: '已經在過去結束的動作。規則加 -ed，還有不規則動詞要背。' },
  { id: 't3', num: '03', title: 'Simple Future',       titleZh: '未來簡單式',
    desc: 'will + base form. Predictions, promises, plans.',
    descZh: 'will + 原形動詞。預測、承諾、臨時決定與未來事件。' },
  { id: 't4', num: '04', title: 'Present Progressive', titleZh: '現在進行式',
    desc: 'am/is/are + V-ing. Happening right now.',
    descZh: 'am/is/are + V-ing。現在正在發生的動作。' },
  { id: 't5', num: '05', title: 'Present Perfect',     titleZh: '現在完成式',
    desc: 'have/has + past participle. Experience and results.',
    descZh: 'have/has + 過去分詞。經驗、剛完成、持續到現在。' },
];

/* ─── 只有一個「週次」：核心題庫 ─────────────────────────────────────────── */
const GR_CORE_ID = 'gr-core';
const GR_DEFAULT_WEEK_ORDER = [GR_CORE_ID];
const GR_SEED_WEEKS = {
  [GR_CORE_ID]: {
    id: GR_CORE_ID, label: '核心題庫', dateRange: '—',
    theme: 'Five Essential Tenses', themeZh: '五大時態',
    subtitle: '', subtitleZh: '每個時態都要練到熟——這不是每週更換的作業。',
    items: { t1: [], t2: [], t3: [], t4: [], t5: [] },
  },
};

/* ─── Firestore subscribe ────────────────────────────────────────────────── */
function subscribeToClassDataGR(callback, onError) {
  return _classDocGR.onSnapshot(snap => {
    if (snap.exists) {
      const d = snap.data();
      if (!d._version || d._version < GR_DATA_VERSION) {
        const merged = _mergeGRWithSeed(d.weeks || {}, GR_SEED_WEEKS);
        const mergedOrder = Array.isArray(d.weekOrder) && d.weekOrder.length > 0
          ? d.weekOrder : GR_DEFAULT_WEEK_ORDER.slice();
        _classDocGR.set({ _version: GR_DATA_VERSION, weeks: merged, weekOrder: mergedOrder }, { merge: true }).catch(() => {});
        callback(merged, mergedOrder);
        return;
      }
      const w = d.weeks || GR_SEED_WEEKS;
      const o = Array.isArray(d.weekOrder) && d.weekOrder.length > 0 ? d.weekOrder : Object.keys(w).sort();
      window.noteCloudWeeks && window.noteCloudWeeks('gr', w);   // v359 防呆
      callback(w, o);
    } else {
      _classDocGR.set({ _version: GR_DATA_VERSION, weeks: GR_SEED_WEEKS, weekOrder: GR_DEFAULT_WEEK_ORDER }).catch(() => {});
      callback(GR_SEED_WEEKS, GR_DEFAULT_WEEK_ORDER.slice());
    }
  }, err => {
    console.warn('subscribeToClassDataGR:', err?.code);
    if (onError) onError(err);
  });
}

/* ─── Smart merge（保留老師編輯過的內容，只補空的） ───────────────────────── */
function _mergeGRWithSeed(existing, seed) {
  const result = JSON.parse(JSON.stringify(seed));
  Object.entries(existing).forEach(([wid, ew]) => {
    if (!result[wid]) { result[wid] = ew; return; }
    const rw = result[wid];
    ['label','dateRange','theme','themeZh','subtitle','subtitleZh'].forEach(f => {
      if (ew[f] !== undefined) rw[f] = ew[f];
    });
    if (ew.items) {
      Object.keys(ew.items).forEach(cat => {
        if (Array.isArray(ew.items[cat]) && ew.items[cat].length > 0) rw.items[cat] = ew.items[cat];
        else if (!rw.items[cat]) rw.items[cat] = ew.items[cat];
      });
    }
    if (ew.homework) rw.homework = ew.homework;
  });
  return result;
}

/* ─── Save / Load ────────────────────────────────────────────────────────── */
async function saveWeeksGR(weeks) {
  window.guardWeekSave && window.guardWeekSave('gr', weeks);   // v359: 防「寫成 0 題」
  await _classDocGR.set({ weeks }, { merge: true });
}
async function saveWeekOrderGR(o) { await _classDocGR.set({ weekOrder: o }, { merge: true }); }

function loadWeeksGR() {
  try { const r = localStorage.getItem(GR_STORAGE_KEY); if (r) return JSON.parse(r); } catch (e) {}
  return GR_SEED_WEEKS;
}
function loadWeekOrderGR() {
  try { const r = localStorage.getItem(GR_ORDER_KEY); if (r) { const a = JSON.parse(r); if (Array.isArray(a) && a.length) return a; } } catch (e) {}
  return GR_DEFAULT_WEEK_ORDER.slice();
}

/* ─── Exports ───────────────────────────────────────────────────────────── */
Object.assign(window, {
  GRAMMAR_TRACK, isGrammarTrack,
  CATEGORIES_GR, GR_CORE_ID, GR_DEFAULT_WEEK_ORDER,
  GR_STORAGE_KEY, GR_ORDER_KEY,
  subscribeToClassDataGR, saveWeeksGR, saveWeekOrderGR, loadWeeksGR, loadWeekOrderGR,
});
