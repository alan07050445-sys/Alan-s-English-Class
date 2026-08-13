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

// v257: 今天落在哪個暑假週（門口頁進度環用）；暑假期間外回傳 null
const _SUMMER_WEEK_STARTS = [
  ['SW01', '2026-07-01'], ['SW02', '2026-07-06'], ['SW03', '2026-07-13'],
  ['SW04', '2026-07-20'], ['SW05', '2026-07-27'], ['SW06', '2026-08-03'],
  ['SW07', '2026-08-10'], ['SW08', '2026-08-17'], ['SW09', '2026-08-24'],
];
function summerCurrentSuffix(now) {
  const t = now || new Date();
  if (t >= new Date('2026-09-01T00:00:00') || t < new Date('2026-07-01T00:00:00')) return null;
  let cur = null;
  _SUMMER_WEEK_STARTS.forEach(([sfx, d]) => { if (t >= new Date(d + 'T00:00:00')) cur = sfx; });
  return cur;
}
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

/* ── v355：題庫防呆＋備份 ──────────────────────────────────
   2026-08-13 事故：老師在「本機沒有快取」的裝置（手機）進暑假題庫編輯模式，
   程式先用 `_libSeed()`（9 個空週）開場，接著任何一次存檔就把雲端整份題庫蓋成空的
   （saveWeeks 是 merge:true，但 weeks 底下每個「週」物件是整顆被換掉）。87 個單元全沒了。
   三道防線：
     ① 開機當下先把本機快取抄一份到記憶體 —— 之後雲端空資料回來覆蓋 localStorage 也救得回
     ② 只要雲端還沒回來過，一律不准存檔
     ③ 雲端本來有題目、這次要寫的卻是 0 題 → 直接擋下 */
const _LIB_KEY    = 'alans-summer-lib-data-v1';
const _LIB_BAK    = 'alans-summer-lib-backup-v1';
const _ME_KEY     = 'alans-summer-me-data-v1';     // v356: 學生裝置上的快取（他被指派到的單元，內容完整）
const _ME_BAK     = 'alans-summer-me-backup-v1';
function _countLibItems(weeks) {
  return Object.values(weeks || {}).reduce((n, wk) =>
    n + Object.values((wk || {}).items || {}).reduce((m, arr) => m + ((arr && arr.length) || 0), 0), 0);
}
// ① 開機快照（在 app.jsx 訂閱之前就跑完，所以抓得到「被覆蓋前」的那份）
//    v356: 學生端的快取也一起抄——題庫被寫空後，學生裝置上的那份是唯一還活著的內容。
const _libBoot = (() => {
  const read = (k) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
  const best = (...cands) => cands.reduce((a, b) => (_countLibItems(b) > _countLibItems(a) ? b : a), null);
  const libBak = read(_LIB_BAK) || {};
  const meBak  = read(_ME_BAK)  || {};
  const lib = best(read(_LIB_KEY), libBak.weeks);
  const me  = best(read(_ME_KEY),  meBak.weeks);
  const all = [lib, me].filter(w => _countLibItems(w) > 0);
  return {
    weeks: best(lib, me) || null,          // 單一來源（相容舊呼叫）
    sources: all,                          // 兩邊都要，還原時合併
    count: all.reduce((n, w) => n + _countLibItems(w), 0),
    libCount: _countLibItems(lib), meCount: _countLibItems(me),
    at: libBak.at || meBak.at || null,
  };
})();
let _lastLibCount = null;               // 最近一次雲端快照的題數（null＝雲端還沒回來過）
window.summerLibBoot = () => ({ ..._libBoot, cloudCount: _lastLibCount });

/* v356: 把開機快照裡「雲端沒有的單元」合併回題庫（只加不刪，可以一台一台裝置累積） */
function mergeSummerLibFromBoot(cloudWeeks) {
  const out = JSON.parse(JSON.stringify(cloudWeeks || {}));
  let added = 0;
  (_libBoot.sources || []).forEach(src => {
    Object.entries(src || {}).forEach(([wid, wk]) => {
      if (!out[wid]) out[wid] = { ...wk, items: {} };
      if (!out[wid].items) out[wid].items = {};
      Object.entries((wk || {}).items || {}).forEach(([cat, arr]) => {
        const list = out[wid].items[cat] || (out[wid].items[cat] = []);
        const have = new Set(list.map(x => x && x.id));
        (arr || []).forEach(it => { if (it && it.id && !have.has(it.id)) { list.push(it); have.add(it.id); added++; } });
      });
    });
  });
  return { weeks: out, added };
}
window.mergeSummerLibFromBoot = mergeSummerLibFromBoot;

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
      // v355: 記住雲端現在有幾題（存檔防呆要用），並把「有題目」的版本另存一份備份
      _lastLibCount = _countLibItems(w);
      if (_lastLibCount > 0) {
        try { localStorage.setItem(_LIB_BAK, JSON.stringify({ at: Date.now(), n: _lastLibCount, weeks: w })); } catch (e) {}
      }
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
    const mine = _filterWeeksForPlan(libWeeks, libOrder, plan);
    // v356: 學生裝置上也留一份「有題目」的備份——題庫萬一again被寫空，這是唯一的內容來源
    if (_countLibItems(mine) > 0) {
      try { localStorage.setItem(_ME_BAK, JSON.stringify({ at: Date.now(), n: _countLibItems(mine), weeks: mine })); } catch (e) {}
    }
    callback(mine, libOrder.slice());
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
    // v355: 兩道防呆——雲端還沒回來過不准寫；本來有題目卻要寫成 0 題也不准寫
    async saveWeeks(weeks) {
      if (!isLib) return;
      if (_lastLibCount === null) throw new Error('題庫還沒從雲端載入完成，先等一下再存（避免把雲端的題目蓋掉）');
      const n = _countLibItems(weeks);
      if (n === 0 && _lastLibCount > 0) {
        throw new Error(`擋下了一次危險的存檔：這次要寫入的題庫是 0 題，但雲端現在有 ${_lastLibCount} 題。請重新整理後再試。`);
      }
      await _libDoc.set({ weeks }, { merge: true });
    },
    // 從備份還原整份題庫（restoreSummerLib 用）
    async forceSaveWeeks(weeks) { if (isLib) await _libDoc.set({ weeks }, { merge: true }); },
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
  summerCurrentSuffix,
  summerLibWeekId: _libWeekId,
  summerApi,
  subscribeSummerMeta,
  saveSummerStudent,
  removeSummerStudent,
  filterWeeksForPlan: _filterWeeksForPlan, // v238: 後台按「發派給誰」過濾用
});
