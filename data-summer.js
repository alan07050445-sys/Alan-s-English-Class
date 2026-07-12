// data-summer.js — 暑假：共用題庫 + 每人一份派發清單（v209 重寫，取代六班表制）
//
// 概念：
//   題庫（'sl'）  — 唯一一份暑假內容（class/data_summer_lib），老師用一般編輯模式出題。
//   個人（'sme'） — 學生的暑假頁：題庫週次依「派發清單」過濾出只屬於他的單元。
//   派發清單     — class/summer_meta 的 students.{email} = { name, weeks: { SW01:[itemId…], … } }。
//   發派存的是「引用」：同一單元勾給多個學生 = 共用同一份題目，改題庫全員同步。

const _dbSum = firebase.firestore();

const SUMMER_LIB = 'sl';   // 題庫（老師）
const SUMMER_ME  = 'sme';  // 學生個人暑假

const SUMMER_CATEGORIES = [
  { id:'vocab',   num:'01', title:'Vocabulary',            titleZh:'單字',     desc:'Summer vocabulary — flashcards, matching and spelling.',            descZh:'暑假單字：字卡、配對與拼寫練習。' },
  { id:'grammar', num:'02', title:'Grammar',               titleZh:'文法',     desc:'Grammar practice — multiple choice, fill-in and sentence making.',  descZh:'文法練習：選擇、填空與造句。' },
  { id:'reading', num:'03', title:'Reading Comprehension', titleZh:'閱讀理解', desc:'Short passages with comprehension questions.',                      descZh:'短文閱讀與閱讀測驗。' },
];

// dateRange 用英文月份格式（app.jsx parseDateRange/bestWeekIdx 只認這種）
const SUMMER_WEEK_DEFS = [
  ['SW01', 'Jul 1 – Jul 5'],
  ['SW02', 'Jul 6 – Jul 12'],
  ['SW03', 'Jul 13 – Jul 19'],
  ['SW04', 'Jul 20 – Jul 26'],
  ['SW05', 'Jul 27 – Aug 2'],
  ['SW06', 'Aug 3 – Aug 9'],
  ['SW07', 'Aug 10 – Aug 16'],
  ['SW08', 'Aug 17 – Aug 23'],
  ['SW09', 'Aug 24 – Aug 31'],
];
const SUMMER_WEEK_SUFFIXES = SUMMER_WEEK_DEFS.map(([sfx]) => sfx);

function _libWeekId(sfx) { return `sl-2026-${sfx}`; }
function _libSeed() {
  const weeks = {};
  SUMMER_WEEK_DEFS.forEach(([sfx, range], i) => {
    const id = _libWeekId(sfx);
    weeks[id] = {
      id,
      label: `Summer Week ${i + 1}`,
      dateRange: range,
      theme: '', themeZh: '', subtitle: '', subtitleZh: '',
      items: { vocab: [], grammar: [], reading: [] },
    };
  });
  return weeks;
}
function _libOrder() { return SUMMER_WEEK_SUFFIXES.map(_libWeekId); }

const _libDoc  = _dbSum.collection('class').doc('data_summer_lib');
const _metaDoc = _dbSum.collection('class').doc('summer_meta');

function isSummerTrack(g) { return g === SUMMER_LIB || g === SUMMER_ME; }

// 週 id → SW 後綴（'sl-2026-SW03' → 'SW03'）
function summerWeekSuffix(weekId) {
  const m = String(weekId || '').match(/SW\d+$/);
  return m ? m[0] : null;
}

/* ── 題庫訂閱／存取 ─────────────────────────────────────── */
function _subscribeLib(callback, onError) {
  return _libDoc.onSnapshot(snap => {
    if (snap.exists) {
      const d = snap.data();
      const w = d.weeks || _libSeed();
      const o = Array.isArray(d.weekOrder) && d.weekOrder.length ? d.weekOrder : _libOrder();
      callback(w, o);
    } else {
      _libDoc.set({ weeks: _libSeed(), weekOrder: _libOrder() }).catch(() => {});
      callback(_libSeed(), _libOrder());
    }
  }, err => {
    console.warn('subscribeSummerLib:', err?.code);
    if (onError) onError(err);
  });
}

/* ── 派發清單（meta）───────────────────────────────────── */
// callback({ students: { email: { name, weeks: {SW01:[ids]} } } })
function subscribeSummerMeta(callback, onError) {
  return _metaDoc.onSnapshot(snap => {
    const d = snap.exists ? snap.data() : {};
    callback({ students: d.students || {} });
  }, err => {
    console.warn('subscribeSummerMeta:', err?.code);
    if (onError) onError(err);
  });
}

// 寫入單一學生的完整清單（weeks 必須帶齊要保留的所有週，陣列整組覆蓋）
async function saveSummerStudent(email, plan) {
  const key = String(email || '').trim().toLowerCase();
  if (!key || !key.includes('@')) return;
  await _metaDoc.set({ students: { [key]: plan } }, { merge: true });
}
async function removeSummerStudent(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return;
  await _metaDoc.set({ students: { [key]: firebase.firestore.FieldValue.delete() } }, { merge: true });
}

/* ── 學生個人週次：題庫 × 派發清單 → 只留他的單元 ────────── */
function _filterWeeksForPlan(libWeeks, libOrder, plan) {
  const out = {};
  (libOrder || []).forEach(wid => {
    const w = libWeeks[wid];
    if (!w) return;
    const sfx = summerWeekSuffix(wid);
    const allowed = new Set((plan && plan.weeks && plan.weeks[sfx]) || []);
    const items = {};
    Object.entries(w.items || {}).forEach(([catId, arr]) => {
      items[catId] = (arr || []).filter(it => allowed.has(it.id));
    });
    // v252: 暑假邏輯＝「發派即任務」——所有派給這位學生的單元都進任務清單，
    // 題庫有釘 📌 的保留到期日等設定，沒釘的也照樣列為任務。
    const homework = {};
    allowed.forEach(itemId => {
      homework[itemId] = (w.homework && w.homework[itemId]) || {};
    });
    out[wid] = { ...w, items, homework };
  });
  return out;
}

function _subscribeMySummer(callback, onError) {
  const email = (window._currentUser && window._currentUser.email || '').toLowerCase();
  let libWeeks = null, libOrder = null, plan = undefined;
  const emit = () => {
    if (!libWeeks || plan === undefined) return;
    callback(_filterWeeksForPlan(libWeeks, libOrder, plan), libOrder.slice());
  };
  const unsubLib = _subscribeLib((w, o) => { libWeeks = w; libOrder = o; emit(); }, onError);
  const unsubMeta = subscribeSummerMeta(m => { plan = (m.students || {})[email] || null; emit(); }, onError);
  return () => { unsubLib(); unsubMeta(); };
}

/* ── 統一 API（app.jsx 的 _gradeOf summer 分支呼叫）────────── */
function summerApi(t) {
  const isLib = t === SUMMER_LIB;
  const storageKey = isLib ? 'alans-summer-lib-data-v1' : 'alans-summer-me-data-v1';
  const orderKey   = isLib ? 'alans-summer-lib-order-v1' : 'alans-summer-me-order-v1';
  return {
    storageKey,
    orderKey,
    subscribe: isLib ? _subscribeLib : _subscribeMySummer,
    // 只有題庫可寫；學生個人頁是唯讀的合成視圖
    async saveWeeks(weeks)  { if (isLib) await _libDoc.set({ weeks },        { merge: true }); },
    async saveWeekOrder(o)  { if (isLib) await _libDoc.set({ weekOrder: o }, { merge: true }); },
    loadWeeks() {
      try { const r = localStorage.getItem(storageKey); if (r) return JSON.parse(r); } catch (e) {}
      return _libSeed();
    },
    loadWeekOrder() {
      try { const r = localStorage.getItem(orderKey); if (r) { const a = JSON.parse(r); if (Array.isArray(a) && a.length) return a; } } catch (e) {}
      return _libOrder();
    },
  };
}

Object.assign(window, {
  SUMMER_LIB,
  SUMMER_ME,
  SUMMER_CATEGORIES,
  SUMMER_WEEK_SUFFIXES,
  isSummerTrack,
  summerWeekSuffix,
  summerApi,
  subscribeSummerMeta,
  saveSummerStudent,
  removeSummerStudent,
  filterWeeksForPlan: _filterWeeksForPlan, // v238: 後台按「發派給誰」過濾用
});
