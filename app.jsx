// app.jsx — Top-level state + composition

const { useState: useAppState, useEffect: useAppEffect, useMemo: useAppMemo, useRef: useAppRef } = React;

// ── Capture G3 originals at module load (before any grade-switch overrides) ──
const _CATS_G3           = window.CATEGORIES;
const _saveWeeksG3       = window.saveWeeks;
const _saveWeekOrderG3   = window.saveWeekOrder;
const _subscribeG3       = window.subscribeToClassData;

// ── Grade helper: resolve grade-specific functions ─────────────────────────
// 暑假班表（s1–s6）也走這裡：map.summer 可以是值，或 (trackId) => 值 的函式
/* ⚠⚠ 約定：summer / grammar 這兩格如果放的是「函式」，會被當成**工廠**，
   在這裡直接以 `fn(g)` 呼叫、拿回傳值當結果（暑假那條就是靠這個依 track 取 API）。
   所以要傳「API 函式本身」時，一定要包成 `() => 那個函式`。
   v383 的災情就是這樣來的：`grammar: window.saveWeekOrderGR` 在接線當下就被呼叫，
   把 weekOrder 寫成字串 'gr'，訂閱也沒接上 → 老師建立的內容從來沒進雲端。 */
function _gradeOf(g, { g1, g2, g4, g5, g6, g3, summer, grammar }) {
  // v381: 五大時態核心題庫是獨立的一條 track（跟暑假一樣），不屬於任何年級
  if (grammar !== undefined && window.isGrammarTrack && window.isGrammarTrack(g)) {
    return typeof grammar === 'function' ? grammar(g) : grammar;
  }
  if (summer !== undefined && window.isSummerTrack && window.isSummerTrack(g)) {
    return typeof summer === 'function' ? summer(g) : summer;
  }
  if (g === 'g1' && g1 !== undefined) return g1;   // v399: 新增一年級
  if (g === 'g2') return g2;
  if (g === 'g4' && g4 !== undefined) return g4;
  if (g === 'g5') return g5;
  if (g === 'g6' && g6 !== undefined) return g6;
  return g3;
}

// Parse "May 17 – May 23" → { start: Date, end: Date } using the given year.
function parseDateRange(str, year) {
  const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  if (!str) return null;
  const parts = str.split(/\s*[–—-]\s*/);
  if (parts.length < 2) return null;
  function parse(s, fallbackMonth) {
    const m = s.trim().match(/([A-Za-z]+)\s+(\d+)/);
    if (m && MONTHS[m[1]] !== undefined) return new Date(year, MONTHS[m[1]], +m[2]);
    const n = s.trim().match(/(\d+)/);
    if (n && fallbackMonth !== undefined) return new Date(year, fallbackMonth, +n[1]);
    return null;
  }
  const start = parse(parts[0]);
  if (!start) return null;
  const end = parse(parts[1], start.getMonth());
  if (!end) return null;
  // v377: 跨年的一週（例 "Dec 28 – Jan 3"）結束日要算成隔年，否則 end < start 永遠對不上
  if (end < start) end.setFullYear(end.getFullYear() + 1);
  return { start, end };
}

// Find the best weekIdx: today within dateRange → latest past week → last week.
/* v377: 週次上有真正的日期（startISO/endISO）就用它——最準。
   舊的週次沒有這兩個欄位，才退回去解析 dateRange 文字。 */
function weekRangeOf(w, id, today) {
  if (w && w.startISO && w.endISO) {
    const a = new Date(w.startISO + 'T00:00:00'), b = new Date(w.endISO + 'T23:59:59');
    if (!isNaN(a) && !isNaN(b)) return { start: a, end: b };
  }
  if (!w || !w.dateRange) return null;
  const m = String(id).match(/(\d{4})/);
  return parseDateRange(w.dateRange, (m ? +m[1] : 0) || today.getFullYear());
}

/* 學生端「看得到的週次」＝有內容 且 沒被封存。
   v377（Alan：#1 清掉空的）：還沒放內容的週次學生端不顯示——這樣才能
   「先把一整個學期 20 週開好、內容慢慢補」而不會讓學生看到一排空白。
   v398：再加上「已封存」。
   這個判斷原本抄在三個地方（雲端第一次載入、切年級、viewOrder），
   加了封存旗標之後三處只要有一處沒跟上，weekIdx 就會指到別週
   （weekIdx 是 viewOrder 的索引，不是 weekOrder 的）——所以集中成一個函式。
   老師（含編輯模式）一律拿到完整清單，行為完全沒變。 */
/* v550：各年級課程資料在 localStorage 的快取 key（訂閱 effect 與載入畫面共用，不要各寫一份）。 */
const _CLOUD_CACHE_KEYS = { g1: 'alans-english-g1-data-v1', g2: 'alans-english-g2-data-v1', g3: 'alans-english-data-v3',
  g4: 'alans-english-g4-data-v1', g5: 'alans-english-g5-data-v1', g6: 'alans-english-g6-data-v1' };

function visibleWeekOrder(isTeacher, order, weeks) {
  if (isTeacher) return order || [];
  return (order || []).filter(id => {
    const w = weeks && weeks[id];
    if (!w || w.archived) return false;
    return !!w.items && Object.keys(w.items).some(k => Array.isArray(w.items[k]) && w.items[k].length > 0);
  });
}

function bestWeekIdx(order, weeks) {
  if (!order || order.length === 0) return 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = 0; i < order.length; i++) {
    const w = weeks[order[i]];
    if (!w || !w.dateRange) continue;
    const range = weekRangeOf(w, order[i], today);
    if (!range) continue;
    range.end.setHours(23, 59, 59, 999);
    if (today >= range.start && today <= range.end) return i;
  }

  // No exact match — latest week whose start is on or before today
  let best = -1, anyRange = false;
  for (let i = 0; i < order.length; i++) {
    const w = weeks[order[i]];
    if (!w || !w.dateRange) continue;
    const range = weekRangeOf(w, order[i], today);
    if (!range) continue;
    anyRange = true;
    if (range.start <= today) best = i;
  }
  if (best >= 0) return best;
  // v377: 整個學期都還沒開始（例：8/23 看 8/31 開學的課表）→ 停在第 1 週，
  //       不要跳到第 20 週。沒有任何日期資訊時才維持舊行為（停最後一週）。
  return anyRange ? 0 : Math.max(0, order.length - 1);
}

/* ☀️ 暑假限定模式：有暑假任務的學生，門口頁只顯示暑假入口（怕誤點學期教室）。
   v377: 本來是寫死 true、要記得手動改成 false——8/31 開學那天忘了改，
   暑假的學生就進不去新學期的教室。改成「開學日一到自動失效」。
   要提前或延後，改下面這個日期就好（月份是 0 起算：7 = 8 月）。
   ⚠ v392: 這個日期每學期都要「手動」改一次。理想做法是搬到 Firestore 的設定值
   （老師端 forTeacher 後台就能改，不用等我改程式再 deploy）——先記在這裡。 */
const TERM_START = new Date(2026, 7, 31);      // 2026-08-31 開學
/* v392: 本來這裡是 `const SUMMER_ONLY_DOOR = new Date() < TERM_START;`——模組頂層常數，
   只在 JS 首次執行時算一次。但 manifest 是 standalone，學生把 app 加到主畫面後
   多半只是「切出去再切回來」（背景喚醒），不會重新執行模組：8/30 晚上開著、
   8/31 早上切回來的人，門口頁仍停在暑假限定，進不去新學期教室。
   → 改成在 render 時才算（見 App 裡的 summerOnlyDoor / nowTick）。 */

function App() {
  // ── Auth state ──────────────────────────────────────────
  const [user, setUser]           = useAppState(null);
  const [adminVer, setAdminVer]   = useAppState(0); // v337: 管理者狀態解析後觸發重繪
  const [starBalance, setStarBalance] = useAppState(0);     // v342: 集點——老師手動給/扣的那些
  const [starsOpen, setStarsOpen]     = useAppState(false); // v342: 星星／商店面板
  const [authReady, setAuthReady] = useAppState(false); // show loading until Firebase resolves
  // v322: 暑假派發清單是否已載入。登入的學生要等它回來才揭曉門口頁，否則載入畫面會在
  // 暑假資料回來前就淡出→先閃過 G1~G6 選年級畫面(~0.5s)再跳回暑假入口（Alan 回報的 bug）。
  const [summerMetaReady, setSummerMetaReady] = useAppState(false);
  const [skippedLogin, setSkippedLogin] = useAppState(() => {
    try { return !!sessionStorage.getItem('alan-guest'); } catch(e) { return false; }
  });
  const [dashOpen, setDashOpen]   = useAppState(false);

  // ── Grade state ─────────────────────────────────────────
  const [grade, setGrade] = useAppState(() => {
    try { return localStorage.getItem('alan-grade') || null; } catch(e) { return null; }
  });
  // 門口頁：每次開啟 app（新 session）都先讓學生選「進入教室」或「暑假專區」
  const [entered, setEntered] = useAppState(() => {
    try { return sessionStorage.getItem('alan-entered') === '1'; } catch(e) { return false; }
  });

  /* v392: 「現在幾點」的心跳。app 加到主畫面後常常是背景喚醒（不重新執行 JS），
     所以每次畫面重新可見就 +1，逼所有「跟今天日期有關」的判斷重算一次。 */
  const [nowTick, setNowTick] = useAppState(0);
  useAppEffect(() => {
    const on = () => { if (!document.hidden) setNowTick(t => t + 1); };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  /* 開學日一到，門口頁就要自動從「暑假限定」變回「看得到年級教室」——
     不能靠使用者自己重新整理（v377 那次災情就是這樣發生的）。 */
  const summerOnlyDoor = useAppMemo(() => new Date() < TERM_START, [nowTick]);

  // ── Content state ───────────────────────────────────────
  // Seed from localStorage cache; Firestore subscription overwrites shortly after mount.
  const [weeks, setWeeks] = useAppState(() => {
    const g = (() => { try { return localStorage.getItem('alan-grade'); } catch(e) { return null; } })();
    return _gradeOf(g, { g1: window.loadWeeksG1(), g2: window.loadWeeksG2(), g4: window.loadWeeksG4(), g5: window.loadWeeksG5(), g6: window.loadWeeksG6(), g3: window.loadWeeks(), summer: (t) => window.summerApi(t).loadWeeks(), grammar: window.loadWeeksGR() });
  });
  const [weekOrder, setWeekOrder] = useAppState(() => {
    const g = (() => { try { return localStorage.getItem('alan-grade'); } catch(e) { return null; } })();
    return _gradeOf(g, { g1: window.loadWeekOrderG1(), g2: window.loadWeekOrderG2(), g4: window.loadWeekOrderG4(), g5: window.loadWeekOrderG5(), g6: window.loadWeekOrderG6(), g3: window.loadWeekOrder(), summer: (t) => window.summerApi(t).loadWeekOrder(), grammar: window.loadWeekOrderGR() });
  });
  const [progress, setProgress] = useAppState(() => window.loadProgress());
  const [qmProgressVersion, setQmProgressVersion] = useAppState(0);
  const [weekIdx, setWeekIdx] = useAppState(() => {
    const g = (() => { try { return localStorage.getItem('alan-grade'); } catch(e) { return null; } })();
    const ord = _gradeOf(g, { g1: window.loadWeekOrderG1(), g2: window.loadWeekOrderG2(), g4: window.loadWeekOrderG4(), g5: window.loadWeekOrderG5(), g6: window.loadWeekOrderG6(), g3: window.loadWeekOrder(), summer: (t) => window.summerApi(t).loadWeekOrder(), grammar: window.loadWeekOrderGR() });
    const wks = _gradeOf(g, { g1: window.loadWeeksG1(), g2: window.loadWeeksG2(),     g4: window.loadWeeksG4(),     g5: window.loadWeeksG5(),     g6: window.loadWeeksG6(),     g3: window.loadWeeks(),     summer: (t) => window.summerApi(t).loadWeeks() });
    return bestWeekIdx(ord, wks);
  });
  const [openCat, setOpenCat] = useAppState("vocab");
  const [editMode, setEditMode] = useAppState(false);
  const [editorOpen, setEditorOpen] = useAppState(false);
  const [editorDraft, setEditorDraft] = useAppState(null);
  const [editorCat, setEditorCat] = useAppState(null);
  // v351: 在「某位學生」的篩選底下按「出新題目」→ 存檔後自動指派給他（不必再去勾一次）
  const [editorAssign, setEditorAssign] = useAppState(null); // 學生 email 或 null
  // v360: 新增單元存檔後，自動打開「指派給哪些學生」讓老師一次勾多人
  const [assignAfterSave, setAssignAfterSave] = useAppState(null);
  const [editorGroups, setEditorGroups] = useAppState(null);   // v374(#5): 新增時要提供哪些分組選項
  const [weekModalOpen, setWeekModalOpen] = useAppState(false);
  const [termOpen, setTermOpen] = useAppState(false);   // v377: 一鍵建立一整個學期
  /* v398：匯出備份。ExportModal 早就寫好了（components-editor.jsx），
     但從 UI 沒有任何入口進得去＝等於不存在。期末整理的第一步就是「先備份」，
     所以把它接回編輯列。 */
  const [exportOpen, setExportOpen] = useAppState(false);
  const [quickSetOpen, setQuickSetOpen] = useAppState(false); // v377: 貼單字→一次建立整套
  const [qsRoster, setQsRoster] = useAppState([]);            // v380: 指派用的學生名單
  const [grGenOpen, setGrGenOpen] = useAppState(false);       // v382: 五大時態出題
  const [rcGenOpen, setRcGenOpen] = useAppState(false);       // v386: 貼文字稿→出閱讀理解
  const [gnGenOpen, setGnGenOpen] = useAppState(false);       // v428: 上傳老師作業→互動教學＋選擇／填空／中翻英
  /* v454（Alan：「如果我發現有些題目出的不太好，也可以在那個 group 底下再生成一次新的題目，
     不然又要重新生成並且又是不同 group」）：記住「要加進哪一組」，一鍵生成的標題就先填好，
     建出來的單元 group 一樣＝直接落在同一組底下。 */
  const [regenFor, setRegenFor] = useAppState(null);          // { catId, name }
  const [wsGenOpen, setWsGenOpen] = useAppState(false);       // v482：📘 一鍵出 Word Study
  const [reviewFor, setReviewFor] = useAppState(null);        // v466：{ catId, name, items } 排複習
  const [weekEditOpen,  setWeekEditOpen]  = useAppState(false);
  const [toast, setToast] = useAppState(null);
  const getGridCols = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cols').trim()) || 2;
  const [gridCols, setGridCols] = useAppState(getGridCols);

  // ── Streak state (badges / XP / coins removed in v307 — no longer shown anywhere) ──
  const [userProfile, setUserProfile] = useAppState({ streak: { count: 0 }, badges: {}, xp: 0 });
  const [starBurst,   setStarBurst]   = useAppState(false);
  const [streakToast, setStreakToast] = useAppState(null); // { count } — shown briefly

  // ── Mistakes state ──────────────────────────────────
  const [mistakesOpen,    setMistakesOpen]    = useAppState(false);
  const [growthOpen,      setGrowthOpen]      = useAppState(false);
  const [reviewOpen,      setReviewOpen]      = useAppState(false); // v313 (#3): 複習標星單字視窗
  const [welcomeOpen,     setWelcomeOpen]     = useAppState(false); // 文字版（門口頁連結／導覽 fallback）
  const [tourOpen,        setTourOpen]        = useAppState(false); // 實境導覽（大廳聚光燈）
  // v325: Alan 要「每次重新載入都回封面頁」（比較直覺）——viewLanding 一律以 true 起始，
  //       不再從 sessionStorage 還原上次停在哪頁（推翻 v301 的「停在原本那頁」）。
  const [viewLanding,     setViewLanding]     = useAppState(true);
  const [farewell,        setFarewell]        = useAppState(false); // v301: 登出「期待下次見面」過場（別太突兀）
  const [myProgressItems, setMyProgressItems] = useAppState({}); // raw Firestore items (incl. wrongQuestions)
  // v362: 每日簽到
  const [myCheckin, setMyCheckin] = useAppState(null);
  const [myFixed, setMyFixed] = useAppState(null);   // v465：訂正錯題的紀錄（星星要用）
  const [checkinOpen, setCheckinOpen] = useAppState(false);

  // ── Access lock (firestore.rules 部署後，未在名單內 → 鎖定頁) ──
  const [accessLocked, setAccessLocked] = useAppState(false);

  // ── Grade-intro / tutorial state ──
  const [intro,     setIntro]     = useAppState(false); // 選年級後開場動畫
  const [tutorialSeen, setTutorialSeen] = useAppState(() => {
    try { return localStorage.getItem('alan-tutorial-done') === '1'; } catch(e) { return false; }
  });

  // ── Local streak helpers (works without Firebase login) ─
  const getLocalStreak = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const yest  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const d     = JSON.parse(localStorage.getItem('alan-local-streak') || '{"count":0,"lastDate":null}');
      return (d.lastDate === today || d.lastDate === yest) ? { count: d.count } : { count: 0 };
    } catch { return { count: 0 }; }
  };
  const updateLocalStreak = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const yest  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const d     = JSON.parse(localStorage.getItem('alan-local-streak') || '{"count":0,"lastDate":null}');
      if (d.lastDate === today) return { count: d.count, isNew: false };
      const count = d.lastDate === yest ? d.count + 1 : 1;
      localStorage.setItem('alan-local-streak', JSON.stringify({ count, lastDate: today }));
      return { count, isNew: true };
    } catch { return { count: 1, isNew: true }; }
  };
  const [localStreak, setLocalStreak] = useAppState(() => getLocalStreak());
  window.triggerStarBurst = () => setStarBurst(true);

  /* v375(#8): 吉祥物只在「已登入的學習畫面」出現——登入頁是家長第一眼看到的地方，
     維持乾淨。components-fx.jsx 每秒讀一次這個旗標。 */
  /* v392: 老師端預設不要吉祥物——編輯器與後台儀表板都是「在工作」的畫面（而且一定是大螢幕），
     有隻東西走來走去只會擋住表格與按鈕。
     ⚠ deps 一定要帶 adminVer：「擁有者以外的老師」是非同步從 admins 名單解析出來的，
       不帶就會停在「還不知道我是老師」的舊值，吉祥物照樣冒出來。
     逃生門：Alan 自己想看的時候 localStorage.setItem('alan-mx-teacher','1') 再重整。 */
  /* v399（Alan：「我的吉祥物消失了」）：v392 是「老師端一律不出現」，
     但 Alan 用同一個帳號也會用學生的畫面看內容——對他來說就是整隻不見了。
     真正該讓開的只有「在工作的畫面」：編輯模式與老師後台（表格、按鈕密集）。
     一般的學習畫面（大廳／練習）跟學生看到的一樣，牠就該在。
     逃生門保留：localStorage.setItem('alan-mx-teacher','1') ＝ 連工作畫面也要牠。 */
  useAppEffect(() => {
    let escape = false;
    try { escape = localStorage.getItem('alan-mx-teacher') === '1'; } catch(e) {}
    const teacherWorking = window.isAdminUser(user) && (editMode || dashOpen) && !escape;
    window.__mxAllow = !!user && !teacherWorking;
  }, [user, adminVer, editMode, dashOpen]);

  // ── Loading screen state ────────────────────────────
  // showLoader stays true until auth resolves + 480ms (fade-out animation time)
  const [showLoader,  setShowLoader]  = useAppState(true);
  const [loaderFading,setLoaderFading]= useAppState(false);
  // pageKey — incremented each time we navigate INTO the main page, forcing
  // the .page div to remount and replay its fade-in animation
  const [pageKey, setPageKey] = useAppState(0);
  const loaderStartRef = useAppRef(Date.now());
  // v322: 揭曉條件＝Firebase 解析完 ＋（老師／或暑假清單已載入）。學生要等暑假清單才不會閃過選年級畫面；
  // 老師端門口頁本來就是完整版（含年級）＝不用等。summerMetaReady 有 3 秒防呆（見下方）＝永不卡死。
  /* 🔴 v550：載入畫面本來只等「登入」，**不等課程資料**。
     雲端資料晚到（或在 iPad Safari 上卡住），畫面就先露出本機快取；沒有快取時露出**種子資料**
     （G4 的種子是 Week 1~8，全是空的「老師正在準備」）——看起來像是舊的週次又跳回來了。
     ⭐ 沒有快取（沒東西可以先顯示）時，載入畫面要等到雲端資料回來，最多等 5 秒。
     有快取就照舊立刻顯示（那份快取就是上次看到的雲端資料，通常是對的）。 */
  const [cloudSeen, setCloudSeen]           = useAppState(false);   // 這個年級的雲端資料回來過了
  const [cloudWaitedOut, setCloudWaitedOut] = useAppState(false);   // 等了 5 秒還沒回來——不再擋載入畫面
  const [cloudSlow, setCloudSlow]           = useAppState(false);   // 等了 4 秒——畫面上要講
  const [cloudRetry, setCloudRetry]         = useAppState(0);       // 重連次數
  /* 沒有快取＝沒東西可以先顯示＝一定要等雲端。
     ⚠ 在 render 時**直接算**，不放進 effect 裡 setState：effect 比 render 晚一步，
       中間那一拍載入畫面可能已經開始淡出了。只管六個一般年級（暑假／文法有自己的載入流程）。 */
  const cloudNeeded = useAppMemo(() => {
    const k = _CLOUD_CACHE_KEYS[grade];
    if (!k) return false;
    try { return localStorage.getItem(k) == null; } catch (e) { return false; }
  }, [grade, cloudSeen, cloudRetry]);
  const revealReady = authReady && (window.isAdminUser(user) || summerMetaReady)
    && (!cloudNeeded || cloudSeen || cloudWaitedOut);
  useAppEffect(() => {
    if (revealReady) {
      const elapsed = Date.now() - loaderStartRef.current;
      /* v392: 本來是 1400ms（＋680ms 淡出）＝就算 Firebase 100ms 就回來，
         也一定要在載入畫面前坐滿 2,080ms；加上 Babel 轉譯，最順的情況也要
         2.8 秒才看得到內容。等資料是有意義的等待，湊時間不是。
         先試 500ms，但實際把 .ls-screen 定格看過（styles-auth.css:431~477）：
         校名 .ls-name 是 0.45s 延遲 + 0.9s 動畫，500ms 時字距還開著、透明度才一半，
         這時候開始淡出＝明顯被砍斷。800ms 時校名已經完全收攏、實心，
         淡出看起來是「收掉」而不是「被切掉」→ 取 800。
         代價：底線 .ls-underline（0.9s 起跑、1.8s 才畫完）改成在淡出期間畫，
         幾乎看不到——它是裝飾，換 900ms 的等待值得。 */
      /* v402（Alan：登入再快一點）：800 → 460。
         單純砍 minShow 會把品牌動畫切斷，所以是「連 .ls-* 的進場動畫一起壓縮」：
         logo .7s→.45s、est .7s/.15s→.45s/.1s、校名 .9s/.45s→.6s/.22s（820ms 收完）。
         460ms 時校名走完的比例（用同一條 cubic-bezier 前傾曲線）跟舊版 800ms 時
         幾乎一樣，所以看起來還是「收掉」不是「被切掉」。
         淡出也從 680 → 400（CSS 的 ls-out 一起改成 .38s）。
         合計每次進站少等約 620ms。 */
      const minShow = 460;
      const waitMs  = Math.max(0, minShow - elapsed);
      // 開始淡出的同時 bump pageKey → 讓門口頁／首頁在載入畫面底下先掛載的
      // 進場動畫重新播放（否則動畫早在 loader 蓋住時就跑完了，使用者看不到）
      const t1 = setTimeout(() => { setLoaderFading(true); setPageKey(k => k + 1); }, waitMs); // fade-out
      const t2 = setTimeout(() => setShowLoader(false), waitMs + 400);     // unmount
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [revealReady]);

  const isTeacher = window.isAdminUser(user);

  /* ── v399（開學）：學生的年級改成「由學號綁定」，不能自己選 ──────────────
     康橋學號信箱 leNN…→ gradeFromEmail 直接算出年級（le15→G1 … le10→G6）。
     · 老師不綁：要能巡所有年級（門口頁的年級選單、右上角年級章都照舊）。
     · 非學校帳號（自己的 Gmail 等）算不出年級 → 維持「自己選一次」，
       不然沒有學校信箱的人會被鎖在門外。
     ⚠ 這個值一旦有，就是唯一真相——去年自己選過、存在 localStorage 的舊年級不能贏
       （le13 去年是 G2、今年就是 G3，開學當天要自己跳過去）。 */
  const boundGrade = (!isTeacher && user) ? window.gradeFromEmail(user.email) : null;

  // v380: 指派名單只有老師需要，學生不要多打一次 Firestore
  useAppEffect(() => {
    if (!isTeacher || !window.subscribeRoster) return;
    return window.subscribeRoster(list => setQsRoster(
      (list || []).filter(r => r && r.email && r.active !== false)
        .map(r => ({ email: String(r.email).toLowerCase(), name: r.name || r.email }))
    ));
  }, [isTeacher]);

  const isTeacherRef = useAppRef(isTeacher);
  useAppEffect(() => { isTeacherRef.current = isTeacher; }, [isTeacher]);
  /* v398：封存（＝學期結束後把舊內容藏起來，但一個字都不刪）。
     開學整理的第三步「最後才隱藏」就是靠這個旗標——weeks[id].archived = true。
     資料照樣留在 Firestore（隨時可以按「取消封存」放回來），只是學生端看不到。
     ⚠ 刻意不用「刪除這一週」來達成：刪除是把 weeks[id] 整包移除，救不回來。 */
  const weekArchived = (w) => !!(w && w.archived);
  const viewOrder = useAppMemo(
    () => visibleWeekOrder(isTeacher, weekOrder, weeks),
    [weekOrder, weeks, isTeacher]
  );

  // ── Category view state (quiz mode navigation) ──────
  const [catView, setCatView] = useAppState(null); // null = main blocks, { cat } = inside a category

  useAppEffect(() => {
    const handler = () => setGridCols(getGridCols());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Firebase Auth subscription ──────────────────────────
  useAppEffect(() => {
    const unsub = window.subscribeAuth(u => {
      setUser(u);
      setAuthReady(true);
      window._currentUser = u; // global access for quiz/fillblank score saving
      if (!u) setEditMode(false); // clear edit mode on sign-out
    });
    return unsub;
  }, []);

  // ── v337: 訂閱「我是不是管理者」（擁有者以外的老師存在資料庫 admins 名單）──
  // 解析完要重新 render，後台入口才會出現；學生讀不到就當一般使用者。
  useAppEffect(() => {
    const unsub = window.subscribeAdminStatus(user, () => setAdminVer(v => v + 1));
    return unsub;
  }, [user?.email]);

  // ── v342: 訂閱自己的星星（老師在後台給/扣，這裡即時更新 header 上的數字）──
  useAppEffect(() => {
    if (!user || !user.email || !window.subscribeMyStars) { setStarBalance(0); window.__mxHats = []; return; }
    return window.subscribeMyStars(user.email, (d) => {
      setStarBalance(d.balance || 0);
      /* v385: 吉祥物的帽子＝虛擬商品。老師扣點的那一筆就是憑證——
         從紀錄裡找「扣點 + 註記提到帽子名稱」的項目，算出擁有哪幾頂。 */
      const owned = [];
      (d.entries || []).forEach(en => {
        if (!en || (en.amount || 0) >= 0) return;
        const note = String(en.note || '');
        if (/派對帽|hat_party/i.test(note) && owned.indexOf('party') < 0) owned.push('party');
        if (/皇冠|hat_crown/i.test(note)   && owned.indexOf('crown') < 0) owned.push('crown');
      });
      window.__mxHats = owned;
    }, () => { setStarBalance(0); window.__mxHats = []; });
  }, [user?.email]);

  // ── Subscribe to streak (for the streak count shown to logged-in students) ──
  useAppEffect(() => {
    if (!user) { setUserProfile({ streak: { count: 0 }, badges: {} }); return; }
    const unsub = window.subscribeUserProfile(user.uid, setUserProfile);
    return unsub;
  }, [user?.uid]);

  useAppEffect(() => {
    if (!user) return;
    window.updateStreak(user.uid);
  }, [user?.uid]);

  // v257: 舊的「backfill」已移除——它會把這台電腦全機共用的舊紀錄，
  // 整包上傳到「任何一個登入的帳號」的雲端成績（共用電腦上 A 的成績變成 B 的）。
  // 現在完成當下就會同步雲端（saveQuizModeCompletion），不需要回填。

  // ── Sync Firestore progress when user is logged in ──────
  // IMPORTANT: clear progress FIRST on any user change to prevent
  // cross-account data leakage when switching accounts on same device.
  useAppEffect(() => {
    setProgress({});
    setMyProgressItems({});
    setMyCheckin(null);
    if (!user) return;
    const unsub = window.subscribeMyProgress(user.uid, (firestoreItems, checkin, fixed) => {
      setMyFixed(fixed);   // v465
      setMyCheckin(checkin || null);   // v362
      // Convert Firestore format { itemId: {done, score?, time?} } → app format { itemId: timestamp }
      const appProgress = {};
      Object.entries(firestoreItems).forEach(([id, val]) => {
        if (val?.done) appProgress[id] = val.done;
      });
      setProgress(appProgress);
      setMyProgressItems(firestoreItems); // keep raw items for wrong-question count + mistakes panel
    });
    return unsub;
  }, [user?.uid]);

  // Always-fresh ref to weeks — prevents stale-closure bugs in CRUD handlers.
  const weeksRef = useAppRef(weeks);
  useAppEffect(() => { weeksRef.current = weeks; }, [weeks]);
  // v340: 週次「只在第一次載入時自動跳到本週」，之後保留使用者選的那一週（提前備課不會被彈回）
  const weekPickedRef = useAppRef(false);
  // v355: 雲端課程資料回來過了沒。沒回來之前 weeks 是「本機快取或空白預設值」，
  //       這時候存檔會把雲端整份蓋掉（2026-08-13 暑假題庫 87 個單元就是這樣沒的）。
  const cloudReadyRef = useAppRef(false);
  const weekOrderRef  = useAppRef(viewOrder);
  useAppEffect(() => { weekOrderRef.current = viewOrder; }, [viewOrder]);
  // v341: 去補做「之前沒完成的作業」時，記住原本在哪一週——補完返回就回到原來那一週，
  // 不會被丟在舊的週次（Alan：人在 week7 補 week5 的作業，不該被留在 week5）
  const returnWeekRef = useAppRef(null);

  // ── Firestore real-time subscription (grade-aware) ────
  // Switches between G2 and G3 Firestore collections based on active grade.
  // Also points window.saveWeeks / saveWeekOrder at the right collection.
  useAppEffect(() => {
    if (!grade) return; // wait until grade is chosen
    weekPickedRef.current = false;   // v340: 換年級/換教室 → 重新自動跳到本週
    window.saveWeeks     = _gradeOf(grade, { g1: window.saveWeeksG1, g2: window.saveWeeksG2,     g4: window.saveWeeksG4,     g5: window.saveWeeksG5,     g6: window.saveWeeksG6,     g3: _saveWeeksG3,     summer: (t) => window.summerApi(t).saveWeeks, grammar: () => window.saveWeeksGR });
    window.saveWeekOrder = _gradeOf(grade, { g1: window.saveWeekOrderG1, g2: window.saveWeekOrderG2, g4: window.saveWeekOrderG4, g5: window.saveWeekOrderG5, g6: window.saveWeekOrderG6, g3: _saveWeekOrderG3, summer: (t) => window.summerApi(t).saveWeekOrder, grammar: () => window.saveWeekOrderGR });

    const subscribeFn = _gradeOf(grade, { g1: window.subscribeToClassDataG1, g2: window.subscribeToClassDataG2, g4: window.subscribeToClassDataG4, g5: window.subscribeToClassDataG5, g6: window.subscribeToClassDataG6, g3: _subscribeG3, summer: (t) => window.summerApi(t).subscribe, grammar: () => window.subscribeToClassDataGR });
    const storageKey  = _gradeOf(grade, { ..._CLOUD_CACHE_KEYS, summer: (t) => window.summerApi(t).storageKey, grammar: window.GR_STORAGE_KEY });
    const orderKey    = _gradeOf(grade, { g1: 'alans-english-g1-order-v1', g2: 'alans-english-g2-order-v1', g4: 'alans-english-g4-order-v1', g5: 'alans-english-g5-order-v1', g6: 'alans-english-g6-order-v1', g3: 'alans-english-week-order-v1', summer: (t) => window.summerApi(t).orderKey, grammar: window.GR_ORDER_KEY });

    cloudReadyRef.current = false;          // v355: 換年級／換教室 → 重新等雲端
    /* v550：換年級／重新訂閱時把等待狀態歸零（有沒有快取見 cloudNeeded）。
       ⚠ 重連（cloudRetry > 0）時不要把狀態重設回去，不然會一直重新開始計時。 */
    if (cloudRetry === 0) { setCloudSeen(false); setCloudSlow(false); setCloudWaitedOut(false); }
    /* 4 秒沒回來：畫面上講出來並重連一次（最多兩次）；5 秒：不再擋載入畫面（永不卡死）。
       ⚠ 重連＝取消舊的訂閱、重新訂一次——Safari 上卡住的那條連線不會自己活過來。 */
    const slowT  = setTimeout(() => { if (!cloudReadyRef.current) { setCloudSlow(true); if (cloudRetry < 2) setCloudRetry(n => n + 1); } }, 4000 * (cloudRetry + 1));
    const waitT  = setTimeout(() => setCloudWaitedOut(true), 5000);
    const unsub = subscribeFn((newWeeks, newOrder) => {
      setAccessLocked(false);
      cloudReadyRef.current = true;
      setCloudSeen(true); setCloudSlow(false);
      setWeeks(newWeeks);
      setWeekOrder(newOrder);
      // v340: 只在「這個年級第一次載入」時自動跳到本週。
      // 舊版每次資料更新（連自己存檔都算）都重設 → 提前備課 week7 一存檔就被彈回 week6（Alan 回報）。
      // 之後的更新一律保留使用者當下看的那一週；只在該週消失時才退回最後一週。
      if (!weekPickedRef.current) {
        weekPickedRef.current = true;
        setWeekIdx(bestWeekIdx(visibleWeekOrder(isTeacherRef.current, newOrder, newWeeks), newWeeks));
      } else {
        setWeekIdx(i => {
          const curId = weekOrderRef.current[i];
          const keep  = curId ? newOrder.indexOf(curId) : -1;   // 用「週次 id」定位，順序變動也不會亂跳
          return keep >= 0 ? keep : Math.min(i, Math.max(0, newOrder.length - 1));
        });
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(newWeeks));
        localStorage.setItem(orderKey,   JSON.stringify(newOrder));
        // v359: 每個年級也留一份「有題目」的備份。萬一雲端again被寫空，
        //       這份不會被空資料覆蓋，還救得回來（暑假題庫就是靠這招救回 51 個單元）。
        const n = window.countWeekItems ? window.countWeekItems(newWeeks) : 0;
        if (n > 0) localStorage.setItem(storageKey + ':bak', JSON.stringify({ at: Date.now(), n, weeks: newWeeks }));
      } catch(e) {}
    }, (err) => {
      // permission-denied → 名單外或未登入（rules 部署後才會發生）
      if (err?.code === 'permission-denied' && !window.isAdminUser(window._currentUser)) {
        setAccessLocked(true);
      }
    });
    return () => { clearTimeout(slowT); clearTimeout(waitT); try { unsub && unsub(); } catch (e) {} };
  }, [grade, user?.uid, cloudRetry]);

  // ── 暑假 meta（每人一份派發清單；v209 題庫＋個人清單制）────
  const [summerMeta, setSummerMeta] = useAppState({ students: {} });
  const summerMetaRef = useAppRef(summerMeta);
  useAppEffect(() => { summerMetaRef.current = summerMeta; }, [summerMeta]);
  useAppEffect(() => {
    /* v399：沒登入就不要去讀 class/summer_meta。
       這份文件（暑假派發清單）含 11 位學生的真名與學校信箱，安全規則發布後
       已經改成「要登入才能讀」——未登入還去訂閱只會固定拿到 permission-denied，
       白打一次 Firestore、還在每個訪客的 console 留一行紅字。
       ⚠ 一定要順手 setSummerMetaReady(true)：載入畫面的揭曉條件等的就是它，
         不設的話訪客要等 3 秒的防呆逾時才看得到首頁。 */
    if (!user || !window.subscribeSummerMeta) { setSummerMetaReady(true); return; }
    // v322: 資料回來（或出錯）都標記 ready，載入畫面才知道可以揭曉了
    return window.subscribeSummerMeta(
      (m) => { setSummerMeta(m); setSummerMetaReady(true); },
      () => setSummerMetaReady(true)
    );
  }, [user?.uid]);   // user 從 null→有值時會重跑，登入後才真的去訂閱
  // v322: 防呆——暑假清單 3 秒內沒回來也先揭曉（退回一般門口頁），永不卡在載入畫面
  useAppEffect(() => {
    if (summerMetaReady) return;
    const t = setTimeout(() => setSummerMetaReady(true), 3000);
    return () => clearTimeout(t);
  }, [summerMetaReady]);
  const isSummer = !!(window.isSummerTrack && window.isSummerTrack(grade));
  const isSummerLib = grade === (window.SUMMER_LIB || 'sl');

  // v362: 每天第一次進到課程頁 → 自動打開簽到（領完或關掉，當天就不再跳）
  useAppEffect(() => {
    if (!user || viewLanding || !entered) return;
    if (window.isAdminUser && window.isAdminUser(user)) return;   // 老師不用簽到
    if (!window.computeCheckin) return;
    const info = window.computeCheckin(myCheckin);
    if (info.signedToday) return;
    const key = 'alan-checkin-popped:' + user.uid;
    const today = window.checkinToday();
    try { if (localStorage.getItem(key) === today) return; } catch (e) {}
    // 真的跳出來的當下才記「今天跳過了」——中途離開頁面的話下次進來還會跳
    const t = setTimeout(() => {
      try { localStorage.setItem(key, today); } catch (e) {}
      setCheckinOpen(true);
    }, 900);   // 讓頁面先畫出來再跳
    return () => clearTimeout(t);
  }, [user?.uid, viewLanding, entered, myCheckin]);

  // v355: 所有課程內容的存檔都走這裡——雲端還沒回來就不准寫，寫失敗要讓老師看得到。
  //       （以前是直接呼叫 window.saveWeeks，失敗只會靜靜地變成 unhandled rejection。）
  /* v447（Alan：「分段不見了」）：存檔失敗以前只跳一次 alert，畫面上的東西還在
     ——他以為存好了，重新整理才發現沒有。現在改成「失敗就一直掛在畫面上，可以再試一次」，
     而且整份內容先寫進 localStorage，重新整理也還在。 */
  const [saveFail, setSaveFail] = useAppState(null);   // { msg, at, weeks }
  const markSaveFail = (w, e) => {
    const msg = (e && e.message) || String(e || '存檔失敗');
    try { localStorage.setItem('alan-unsaved-weeks', JSON.stringify({ t: Date.now(), grade, weeks: w })); } catch (x) {}
    setSaveFail({ msg, at: Date.now(), weeks: w });
  };
  /* 🔴 v486（Alan 截到聯絡簿整排都是 qs1791348746400sp 這種亂碼）：
     那些是「幽靈作業」——單元早就刪了，week.homework 裡那一筆 id 還留著。
     2026-10-08 查線上資料：六個年級共 73 筆，G4 Week 6 的 41 筆裡有 35 筆是。

     v460 已經在「刪單元」那條路清過一次，v474／v477 新增的批次刪除也都有清，
     但昨天（10/07）還是又長出 7 整批——代表**還有一條我找不到的路**會把單元弄不見。
     與其一條一條去堵，不如把判斷收到唯一的出口：
     **「作業指向一個不存在的單元」本身就永遠是錯的**，所以每次存檔前掃一次。
     這樣不管是誰弄掉的，下一次存檔就自己好了。

     ⚠ 只掃「還有單元的週次」。週次整個是空的有兩種可能——真的清空了，
       或是資料還沒載完；後者把作業清掉就回不來了，寧可不動。 */
  const pruneGhostHomework = (w) => {
    let n = 0;
    Object.values(w || {}).forEach(wk => {
      const hw = wk && wk.homework;
      if (!hw || !Object.keys(hw).length) return;
      const ids = new Set();
      Object.values((wk && wk.items) || {}).forEach(arr => {
        (arr || []).forEach(it => { if (it && it.id) ids.add(it.id); });
      });
      if (!ids.size) return;                    // 空週次不動（可能只是還沒載完）
      Object.keys(hw).forEach(id => { if (!ids.has(id)) { delete hw[id]; n++; } });
    });
    return n;
  };

  /* ══ 🏫 v493 學校進度表 ══════════════════════════════════════════════
     每個年級一份（class/pacing_g4）。訂閱而不是讀一次——Alan 可能在別台電腦重匯入。
     ⚠ 沒匯入的年級 pacing 就是 null，畫面上完全不顯示（不要留一條空的）。 */
  const [pacing, setPacing] = useAppState(null);
  const [examSide, setExamSide] = useAppState(null);   // v513：考前複習包（'it' / 'lt'）
  const [examScanOpen, setExamScanOpen] = useAppState(false);   // v516：拍考卷
  const [examDraft, setExamDraft] = useAppState(null);            // v561：跟 AI 出大考考卷（{ brief } 或 null）
  const [askOpen, setAskOpen] = useAppState(false);             // v517：💬 用講的就好
  const [askRoster, setAskRoster] = useAppState([]);            // 認名字用（「幫 Eric 寫紀錄」）
  const [askTopic, setAskTopic] = useAppState('');              // 💬 帶進 Word Study 的主題
  const [askText, setAskText] = useAppState(null);              // 💬 帶進文法／閱讀的文字
  const [paceOpen, setPaceOpen] = useAppState(false);
  useAppEffect(() => {
    setPacing(null);
    if (!window.subscribePacing || !grade) return;
    return window.subscribePacing(grade, setPacing);
  }, [grade]);
  /* 這一週的進度 ＋ 下一次 Formative（Alan：Summative 不用看）。 */
  const paceWeek = useAppMemo(
    () => (window.pacingForWeek ? window.pacingForWeek(pacing, weekId) : null), [pacing, weekId]);
  const paceNextF = useAppMemo(
    () => (pacing && window.pacingNextFormative ? window.pacingNextFormative(pacing, weekId) : null), [pacing, weekId]);

  const saveWeeksSafe = (w) => {
    if (!cloudReadyRef.current) {
      alert('資料還在從雲端載入中，先等兩秒再存一次。\n（這是為了避免把雲端已經有的內容蓋掉）');
      return false;
    }
    pruneGhostHomework(w);   // v486：存進去的永遠不帶幽靈作業
    try {
      const p = window.saveWeeks(w);
      if (p && p.then) p.then(() => {
        setSaveFail(null);
        try { localStorage.removeItem('alan-unsaved-weeks'); } catch (x) {}
      }, e => markSaveFail(w, e));
    } catch (e) { markSaveFail(w, e); }
    return true;
  };

  const mySummerPlan = (user && user.email && (summerMeta.students || {})[user.email.toLowerCase()]) || null;
  const hasSummerPlan = !!(mySummerPlan && Object.values(mySummerPlan.weeks || {}).some(a => a && a.length));
  // 名單姓名格式是「王騰樂Tayler Wang」→ 抽英文名（Tayler）進標題
  const _englishName = (n) => {
    const m = String(n || '').match(/[A-Za-z][A-Za-z .'-]*/);
    return m ? m[0].trim().split(/\s+/)[0] : String(n || '');
  };
  const summerWho = _englishName(mySummerPlan && mySummerPlan.name)
    || (user && user.displayName ? user.displayName.split(' ')[0] : '')
    || '我';

  // v257: 門口頁進度環——本週（或整個暑假）派給我的任務完成了幾項
  const doorSummerProg = useAppMemo(() => {
    if (!mySummerPlan) return null;
    let local = {};
    try { local = window.loadQMProg ? window.loadQMProg() : {}; } catch(e) {}
    const sfxNow = window.summerCurrentSuffix ? window.summerCurrentSuffix() : null;
    let wkDone = 0, wkTotal = 0, allDone = 0, allTotal = 0;
    Object.entries(mySummerPlan.weeks || {}).forEach(([sfx, ids]) => {
      (ids || []).forEach(id => {
        const wid = window.summerLibWeekId ? window.summerLibWeekId(sfx) : `sl-2026-${sfx}`;
        const key = `${wid}_${id}`;
        const d = !!((myProgressItems[key] && myProgressItems[key].done) || (local[key] && local[key].done));
        allTotal++; if (d) allDone++;
        if (sfx === sfxNow) { wkTotal++; if (d) wkDone++; }
      });
    });
    return { wkDone, wkTotal, allDone, allTotal };
  }, [mySummerPlan, myProgressItems, qmProgressVersion, user?.uid]);

  // Progress — keep in localStorage as offline cache.
  // When logged in, Firestore is the source of truth (see subscribeMyProgress above).
  useAppEffect(() => { window.saveProgress(progress); }, [progress]);

  // Clamp weekIdx if the order shrinks (also handles empty weekOrder gracefully)
  useAppEffect(() => {
    if (viewOrder.length === 0 || weekIdx >= viewOrder.length) {
      setWeekIdx(Math.max(0, viewOrder.length - 1));
    }
  }, [viewOrder, weekIdx]);

  const weekId = viewOrder[weekIdx] || viewOrder[0] || "";
  /* v377: 可見週次清單變動時（例：老師身分確認後從「只看有內容的」變成「全部」、
     或某一週剛被放進內容），用「週次 id」把位置定回去，不要莫名跳到別週。 */
  const lastWeekIdRef = useAppRef('');
  useAppEffect(() => { if (weekId) lastWeekIdRef.current = weekId; }, [weekId]);
  useAppEffect(() => {
    const id = lastWeekIdRef.current;
    if (!id || viewOrder.length === 0) return;
    const i = viewOrder.indexOf(id);
    if (i >= 0 && i !== weekIdx) setWeekIdx(i);
  }, [viewOrder]);
  const week = weeks[weekId] || {
    id: weekId, label: weekId || "—", dateRange: "—", theme: "—", themeZh: "", items: {vocab:[], grammar:[], word:[], reading:[]}
  };

  // Active categories — switches between grade definitions on grade change
  const activeCategories = _gradeOf(grade, {
    g1: window.CATEGORIES_G1 || _CATS_G3,
    g2: window.CATEGORIES_G2 || _CATS_G3,
    g4: window.CATEGORIES_G4 || _CATS_G3,
    g5: window.CATEGORIES_G5 || _CATS_G3,
    g6: window.CATEGORIES_G6 || _CATS_G3,
    g3: _CATS_G3,
    summer: window.SUMMER_CATEGORIES || _CATS_G3,
    grammar: window.CATEGORIES_GR || _CATS_G3,
  });

  const allItems = useAppMemo(() => {
    const cats = activeCategories;
    return cats.flatMap(c => (week.items[c.id] || []).map(it => ({...it, _cat: c.id})));
  }, [week, grade]);

  const weekQuizItems = useAppMemo(() => {
    if (!window.getQuizItems) return [];
    const cats = activeCategories;
    return cats.flatMap(c => window.getQuizItems((week.items || {})[c.id] || []));
  }, [week, grade]);

  // v364: 整週「所有分類」的單元——閱讀理解要綁「單字」分類的單字卡，
  //        原本只看同一個分類，所以綁定選單在閱讀理解裡根本不會出現。
  const weekAllItems = useAppMemo(
    () => Object.values((week && week.items) || {}).flat(),
    [week]
  );

  const qmProgress = useAppMemo(() => {
    // v257: 改讀「這個帳號自己的」本機紀錄（loadQMProg 內建帳號隔離）
    let local = {};
    try { local = window.loadQMProg ? window.loadQMProg() : {}; } catch(e) {}
    // v255: 併入雲端成績（跨裝置一致），同一單元取「較好的一次」
    const pctOf = (p) => (p && p.score != null && p.total) ? p.score / p.total : (p && p.done ? -1 : -2);
    Object.entries(myProgressItems || {}).forEach(([key, fp]) => {
      if (!fp) return;
      // v361: 沒達 80 分（done 是空的）但有分數的也要併進來——短答 3 顆星就是這種，集點要用；
      //       單字卡的 modes（學習/填空跑完沒）也要跟著過來，換裝置才不會漏算。
      if (!fp.done && fp.score == null && !fp.modes) return;
      const remote = { done: fp.done ? 1 : 0, score: fp.score != null ? fp.score : null, total: fp.score != null ? 100 : (fp.total || 1), ts: fp.done || 0 };
      const cur = local[key];
      const modes = { ...((cur && cur.modes) || {}), ...(fp.modes || {}) };
      const base = (!cur || pctOf(remote) > pctOf(cur)) ? remote : cur;
      /* v459（Alan：「有學生反應補交作業不會顯示已完成並且消掉」）：
         上面那一行是「同一單元取分數比較好的一次」——但它把 done 也一起換掉了。
         done（有沒有做完）跟分數高低是兩件事，不該互相覆蓋。
         實際會爆的情形：單字卡與上傳作業完成時 score 是 null（pctOf 只給 -1），
         所以本機任何一筆「考過但沒到 80 分」的舊紀錄都會贏過雲端那筆「已完成」
         → 換一台裝置打開，明明做完了卻沒有打勾、也不會從「還沒完成」清單消失。
         做完就是做完：兩邊只要有一邊完成，合併後就是完成。 */
      const doneVal = base.done || (cur && cur.done) || remote.done || 0;
      /* v409：型別與標題一定要帶過來。它們是「這一筆是什麼」的描述，跟挑哪一邊的分數無關，
         而本機那份（loadQMProg）從來只存 done/score/total/ts，根本沒有這兩個欄位。
         沒有 itemType，computeAutoStars 就認不出「以前教室賺的」那些紀錄
         ——暑假的星星就是這樣不見的。 */
      const meta = {};
      if (fp.itemType)  meta.itemType  = fp.itemType;
      if (fp.itemTitle) meta.itemTitle = fp.itemTitle;
      local[key] = { ...base, done: doneVal, ...(Object.keys(modes).length ? { modes } : {}), ...meta };
    });
    return local;
  }, [qmProgressVersion, weekId, grade, myProgressItems, user?.uid]);

  /* v409：右上角那顆 ⭐ 本來只顯示 stars/{email}.balance ＝「老師手動給的」，
     完全沒有把 v361 的自動集點與 v362 的每日簽到算進去——所以 header 的數字一直
     比面板裡的小一大截（點開才會變多）。兩邊改用同一組函式算，不可能再對不起來。 */
  const autoStarTotal = useAppMemo(() => {
    if (!user) return 0;
    const a = window.computeAutoStars ? window.computeAutoStars(weeks, viewOrder, qmProgress) : { total: 0 };
    const c = window.computeCheckin   ? window.computeCheckin(myCheckin) : { total: 0 };
    const f = window.computeFixedStars ? window.computeFixedStars(myFixed) : { total: 0 };   // v465：訂正錯題
    return (a.total || 0) + (c.total || 0) + (f.total || 0);
  }, [user, weeks, viewOrder, qmProgress, myCheckin, myFixed]);

  /* v431 ④：買裝扮花掉的星星要扣掉——由「買到哪幾件」反算，不是存一個數字（見 data.js mxSpent）。
     header、集點面板、裝扮室三個地方都用這一個數，不可能對不起來。 */
  const mxSpentStars = useAppMemo(
    () => (window.mxSpent ? window.mxSpent(userProfile.mx) : 0),
    [userProfile.mx]);
  const starsTotal = Math.max(0, starBalance + autoStarTotal - mxSpentStars);

  /* 吉祥物（components-fx.jsx）是獨立的一層，拿不到 React 的狀態——
     用 window 當橋：牠只讀這三個，買／穿都回到這裡來寫 Firestore。 */
  useAppEffect(() => {
    window.__mxStars = starsTotal;
    window.__mxData  = userProfile.mx || {};
    /* v477：吉祥物要講「跟現在的你有關」的話，就得知道現在的你是什麼狀況。
       ⚠ 只放「網站這一層才算得出來」的東西——連對幾題是吉祥物自己數的，不要重複。
       「剩幾個整組完成」在單元列表那一層才知道，由它自己寫進這同一包。 */
    try {
      const ci = window.computeCheckin ? window.computeCheckin(myCheckin) : null;
      const fx = (myFixed && myFixed.days) || {};
      const today = window.checkinToday ? window.checkinToday() : '';
      const dates = Object.keys((myCheckin && myCheckin.dates) || {}).filter(k => k).sort();
      const last = dates.filter(d => d !== today).pop() || '';
      const dayNum = (d) => Math.floor(new Date(d + 'T00:00:00').getTime() / 86400000);
      window.__mxCtx = Object.assign({}, window.__mxCtx, {
        checkinDays: (ci && ci.streak) || 0,
        fixedToday: Number(fx[today] || 0),
        firstToday: !!(ci && !ci.signedToday),      // 今天還沒簽到＝今天第一次見面
        daysAway: (last && today) ? Math.max(0, dayNum(today) - dayNum(last)) : 0,
      });
    } catch (e) {}
    window.__mxBuy   = (id) => (user && window.mxBuy
      ? window.mxBuy(user.uid, id, starsTotal, userProfile.mx)
      : Promise.resolve({ ok: false, reason: 'no-user' }));
    window.__mxWear  = (kind, id) => (user && window.mxSetWear
      ? window.mxSetWear(user.uid, kind, id, userProfile.mx)
      : Promise.resolve({ ok: false, reason: 'no-user' }));
    // v442：取名字／改名字（第一次免費，之後 50 顆星）
    window.__mxRename = (name) => (user && window.mxRename
      ? window.mxRename(user.uid, name, starsTotal, userProfile.mx)
      : Promise.resolve({ ok: false, reason: 'no-user' }));
  }, [user, starsTotal, userProfile.mx, myCheckin, myFixed]);   // v477：簽到／訂正變了，吉祥物要知道

  // v311 (#21): 只計「真的完成」——qmProgress 記錄存在不代表完成（未達 80 分 done 會是 0）；一律看 .done
  const qmIsDone = (id) => { const p = qmProgress[`${weekId}_${id}`]; return !!(p && p.done); };
  const totalItems = weekQuizItems.length || allItems.length;
  const totalDone = weekQuizItems.length
    ? weekQuizItems.filter(it => progress[it.id] || qmIsDone(it.id)).length
    : allItems.filter(it => progress[it.id]).length;

  const getCategoryProgress = (cat) => {
    const quizItems = window.getQuizItems ? window.getQuizItems((week.items || {})[cat.id] || []) : [];
    if (!quizItems.length) return { total: 0, done: 0 };
    const done = quizItems.reduce((sum, it) => sum + ((progress[it.id] || qmIsDone(it.id)) ? 1 : 0), 0);
    return { total: quizItems.length, done };
  };

  // v313 (#3): 跨週收集學生標星的單字——大廳「複習」卡（catView 變動時重算，離開單元後回大廳就更新）
  const reviewWords = useAppMemo(() => (window.collectStarredWords ? window.collectStarredWords(weeks) : []), [weeks, catView, qmProgressVersion, user?.uid]);

  // v268: 本週平均分——WeekHero 給家長掃一眼用
  const weekAvgScore = useAppMemo(() => {
    let sum = 0, n = 0;
    weekQuizItems.forEach(it => {
      const p = qmProgress[`${weekId}_${it.id}`];
      if (p && p.done && p.score != null && p.total) {
        sum += Math.min(100, Math.round(p.score / p.total * 100));
        n++;
      }
    });
    return n ? Math.round(sum / n) : null;
  }, [weekQuizItems, qmProgress, weekId]);

  // v266: 完成一題後的「下一個任務」——本週作業裡還沒完成的下一項（依到期日排）
  const getNextTask = (excludeId) => {
    const hw = week.homework || {};
    const byId = {};
    allItems.forEach(it => { byId[it.id] = it; });
    const candidates = Object.keys(hw)
      .filter(id => id !== excludeId)
      .map(id => ({ id, it: byId[id], due: String((hw[id] && hw[id].dueDate) || '9999') }))
      .filter(c => c.it
        && !(progress[c.id] || qmIsDone(c.id))
        && window.getQuizItems && window.getQuizItems([c.it]).length > 0)
      .sort((a, b) => a.due.localeCompare(b.due) || ((window.qmTypeRank ? window.qmTypeRank(a.it.type) : 9) - (window.qmTypeRank ? window.qmTypeRank(b.it.type) : 9)));
    if (!candidates.length) return null;
    const cat = activeCategories.find(c => c.id === candidates[0].it._cat);
    return cat ? { cat, itemId: candidates[0].id } : null;
  };

  const getNextStudyCategory = () => {
    const withProgress = activeCategories.map(cat => ({ cat, ...getCategoryProgress(cat) }));
    const next = withProgress.find(c => c.total > 0 && c.done < c.total);
    if (next) return next.cat;
    return withProgress.find(c => c.total > 0)?.cat || null;
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const finishTutorial = () => {
    try { localStorage.setItem('alan-tutorial-done', '1'); } catch(e) {}
    setTutorialSeen(true);
  };

  // First-time onboarding — 每個帳號各看一次（共用電腦的手足互不影響）；
  // 老師不自動跳（可從門口頁／footer 手動打開）。等真正進到教室再出現，
  // 並稍等大廳進場動畫落定，才不會兩個動畫打架。
  // 自動跳的是「實境導覽」（聚光燈圈真的元素，小朋友不用讀字）；
  // 文字版 WelcomeGuide 留給門口頁連結與導覽的 fallback。
  const welcomeKey = () => (user && user.uid) ? ('alan-welcome-v2:' + user.uid) : 'alan-welcome-v2';
  useAppEffect(() => {
    if (!authReady || !grade || !entered || isTeacher) return;
    let seen = false;
    try { seen = localStorage.getItem(welcomeKey()) === '1'; } catch(e) {}
    if (seen) return;
    const t = setTimeout(() => setTourOpen(true), 700);
    return () => clearTimeout(t);
  }, [authReady, grade, entered, isTeacher, user?.uid]);

  const dismissWelcome = () => {
    try { localStorage.setItem(welcomeKey(), '1'); } catch(e) {}
    setWelcomeOpen(false);
  };
  const dismissTour = () => {
    try { localStorage.setItem(welcomeKey(), '1'); } catch(e) {}
    setTourOpen(false);
  };

  // v249: 從行銷頁按「開始學習」登入 → 留在首頁（CTA 變「進入課程」）。
  // v325: 不再把 viewLanding 同步進 sessionStorage——每次重新載入一律回封面頁（viewLanding 起始 true）。
  const loginFromLandingRef = useAppRef(false);
  const firstAuthResolveRef = useAppRef(true);
  useAppEffect(() => {
    if (!user) return;
    const firstResolve = firstAuthResolveRef.current;
    firstAuthResolveRef.current = false;
    if (loginFromLandingRef.current) {
      loginFromLandingRef.current = false;
      setViewLanding(true);   // 留在首頁，敘述換成「進入課程」
    } else if (viewLanding && !firstResolve) {
      // 非首頁發起的「新」登入完成時，把殘留的行銷頁關掉；
      // 但「重新整理自動還原登入」(firstResolve) 不算——那要停在原本那頁。
      setViewLanding(false);
    }
  }, [user]);

  // v252: 泡泡轉場改純 DOM（spawnPageWave）——點擊下一幀就出現，不等 App re-render（後台很重時會頓）
  const wavingRef = useAppRef(false);
  const runWave = (cb) => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || wavingRef.current || !window.spawnPageWave) { cb(); return; }
    wavingRef.current = true;
    window.spawnPageWave(1900);
    setTimeout(cb, 560);                      // 泡泡最密、紗幕全遮的瞬間切頁
    setTimeout(() => { wavingRef.current = false; }, 1850);
  };

  /* v301: 登出時先淡出一個「期待下次見面」的過場，才真的登出——
     比「按下去畫面瞬間跳掉」有質感許多。所有登出入口都走這裡。
     v402（Alan：登入登出想再快一點）：1050+620 → 700+360，整段從約 1.67 秒收到
     約 1.06 秒。過場本身（.app-farewell 0.7s 淡入、夥伴 1.4s 揮手）在 700ms 時
     已經完全顯形、手也揮到一半，看得出來是「在跟你道別」而不是被切掉。 */
  const farewellRef = useAppRef(false);
  const signOutWithFarewell = (cleanup) => {
    if (farewellRef.current) return;
    farewellRef.current = true;
    setFarewell(true);
    setTimeout(() => {
      try { window.signOutUser(); } catch(e) {}
      try { sessionStorage.removeItem('alan-guest'); } catch(e) {}
      try { sessionStorage.removeItem('alan-entered'); } catch(e) {}
      setSkippedLogin(false);
      if (cleanup) { try { cleanup(); } catch(e) {} }
      // 稍留一下讓封面在紗幕底下先掛載，再淡開過場
      setTimeout(() => { setFarewell(false); farewellRef.current = false; }, 360);
    }, 700);
  };

  const scrollPageToTop = () => {
    const jump = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    try {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      jump();
      requestAnimationFrame(() => {
        jump();
        requestAnimationFrame(jump);
      });
      setTimeout(jump, 80);
      setTimeout(jump, 180);
    } catch(e) {
      try { window.scrollTo(0, 0); } catch(_) {}
    }
  };

  const [slideDir, setSlideDir] = useAppState(null); // 'left' | 'right'
  const [mainKey,  setMainKey]  = useAppState(0);    // increments on back-to-main

  useAppEffect(() => {
    scrollPageToTop();
  }, [grade, weekIdx, catView?.id || '', mainKey, pageKey]);

  // v341: 手動切週 → 清掉「補完要回去的那一週」，免得之後返回時被莫名帶走
  // v360: 在練習頁換週次 → 留在同一個分類，只換成那一週的單元（原本會被踢回大廳）。
  //       itemId 清掉＝不要去開上一週的那個單元。
  const keepCatOnWeekChange = () => setCatView(c => (c ? { ...c, itemId: null } : null));
  const goPrevWeek = () => { returnWeekRef.current = null; setSlideDir('right'); setWeekIdx(i => Math.max(0, i - 1)); setOpenCat(null); keepCatOnWeekChange(); scrollPageToTop(); };
  const goNextWeek = () => { returnWeekRef.current = null; setSlideDir('left');  setWeekIdx(i => Math.min(viewOrder.length - 1, i + 1)); setOpenCat(null); keepCatOnWeekChange(); scrollPageToTop(); };
  /* v446（Alan：「我原本做的 desert 一鍵生成不見了」）：直接跳到某一週（順便開那一類）。
     東西其實一直在第 1 週——網站開起來停在「今天這一週」，那一週是空的，看起來就像不見了。 */
  const goWeekId = (id, cat) => {
    const j = viewOrder.indexOf(id);
    if (j < 0) return;
    returnWeekRef.current = null;
    setSlideDir(j > weekIdx ? 'left' : 'right');
    setWeekIdx(j);
    setCatView(null);
    setOpenCat(cat || null);
    scrollPageToTop();
  };

  // ── Week CRUD ──────────────────────────────────────────

  const handleAddWeek = (form) => {
    const id = (form.id || "").trim();
    if (!id) { showToast("Week ID is required"); return; }
    if (weekOrder.includes(id)) { showToast("Week ID already exists"); return; }
    const newWeek = {
      id,
      label: form.label?.trim() || id,
      dateRange: form.dateRange?.trim() || "—",
      theme: form.theme?.trim() || "—",
      themeZh: form.themeZh?.trim() || "",
      subtitle: "",
      subtitleZh: "",
      items: { vocab: [], grammar: [], word: [], reading: [] },
    };
    const nextOrder = [...weekOrder, id].sort();
    const nextWeeks = { ...weeksRef.current, [id]: newWeek };
    setWeeks(nextWeeks);
    setWeekOrder(nextOrder);
    saveWeeksSafe(nextWeeks);
    window.saveWeekOrder(nextOrder);
    setWeekIdx(nextOrder.indexOf(id));
    setOpenCat(null);
    setWeekModalOpen(false);
    showToast("Week added");
  };

  /* v377: 一鍵建立一整個學期的週次。
     ⚠ 只補上「還不存在」的 id，已經有的完全不碰（不會覆蓋任何現有內容）。 */
  const handleCreateTerm = (list, cats) => {
    if (!list || !list.length) { setTermOpen(false); return; }
    const emptyItems = () => {
      const o = {};
      (cats || []).forEach(c => { o[c.id] = []; });
      if (!Object.keys(o).length) { o.vocab = []; o.grammar = []; o.word = []; o.reading = []; }
      return o;
    };
    const nextWeeks = { ...weeksRef.current };
    const added = [];
    list.forEach(p => {
      if (nextWeeks[p.id]) return;                     // 已存在＝跳過
      nextWeeks[p.id] = {
        id: p.id, label: p.label, dateRange: p.dateRange,
        startISO: p.startISO, endISO: p.endISO,   // 真實日期＝「這一週」判斷才會準
        theme: '', themeZh: '', subtitle: '', subtitleZh: '',
        items: emptyItems(),
      };
      added.push(p.id);
    });
    if (!added.length) { setTermOpen(false); return; }
    const nextOrder = [...weekOrder, ...added].sort();
    setWeeks(nextWeeks);
    setWeekOrder(nextOrder);
    saveWeeksSafe(nextWeeks);
    window.saveWeekOrder(nextOrder);
    setTermOpen(false);
    showToast(`已建立 ${added.length} 週 · 內容還沒放的週次學生看不到`);
  };

  // Edit existing week (label, dateRange, theme) — or rename its ID
  const handleEditWeekSave = (form, oldId) => {
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    const newId = form.id.trim();
    if (!newId) return;
    if (oldId && oldId !== newId) {
      // Rename: copy data to new ID, delete old
      // Use weekOrder (not data keys) as truth; exclude the old ID itself
      const takenIds = weekOrder.filter(id => id !== oldId);
      if (takenIds.includes(newId)) { showToast("ID 已存在"); return; }
      w[newId] = { ...w[oldId], id: newId, label: form.label || form.id, dateRange: form.dateRange || '', theme: form.theme || '', themeZh: form.themeZh || '' };
      delete w[oldId];
      const nextOrder = weekOrder.map(id => id === oldId ? newId : id);
      setWeeks(w); setWeekOrder(nextOrder);
      saveWeeksSafe(w); window.saveWeekOrder(nextOrder);
      setWeekIdx(nextOrder.indexOf(newId));
    } else {
      // Update in-place (no ID change)
      w[newId] = { ...w[newId], label: form.label || form.id, dateRange: form.dateRange || '', theme: form.theme || '', themeZh: form.themeZh || '' };
      setWeeks(w);
      saveWeeksSafe(w);
    }
    setWeekEditOpen(false);
    showToast("已儲存 ✓");
  };

  /* v398：封存／取消封存這一週。跟 Delete 的差別是「只加一個旗標」——
     items、成績、作業全部原封不動留著，按第二次就整週回到學生端。 */
  const handleArchiveWeek = () => {
    const w = { ...weeksRef.current };
    const cur = w[weekId];
    if (!cur) return;
    const next = !cur.archived;
    if (next && !confirm(`要把「${cur.label || weekId}」封存嗎？\n\n學生端會看不到這一週（內容不會被刪除，隨時可以取消封存）。`)) return;
    w[weekId] = { ...cur, archived: next };
    if (!next) delete w[weekId].archived;   // 取消封存就把旗標清乾淨，不留 false
    setWeeks(w);
    if (!saveWeeksSafe(w)) return;
    showToast(next ? '已封存 · 學生看不到這一週 📦' : '已取消封存 · 學生看得到了 ✓');
  };

  const handleDeleteWeek = () => {
    if (weekOrder.length <= 1) { showToast("Can't delete the last week"); return; }
    const nextWeeks = { ...weeksRef.current };
    delete nextWeeks[weekId];
    const nextOrder = weekOrder.filter(id => id !== weekId);
    setWeeks(nextWeeks);
    setWeekOrder(nextOrder);
    saveWeeksSafe(nextWeeks);
    window.saveWeekOrder(nextOrder);
    setWeekIdx(i => Math.max(0, i - 1));
    setOpenCat(null);
    showToast("Week deleted");
  };

  const toggleCheck = (itemId) => {
    setProgress(prev => {
      const next = { ...prev };
      const wasChecked = !!next[itemId];
      if (wasChecked) {
        delete next[itemId];
        // Remove from Firestore if logged in
        if (user) window.saveProgressItem(user.uid, user.displayName || '', user.email || '', itemId, null);
      } else {
        next[itemId] = Date.now();
        // Save to Firestore if logged in
        if (user) window.saveProgressItem(user.uid, user.displayName || '', user.email || '', itemId, { done: next[itemId] });
        if (user) window.updateStreak(user.uid);
      }
      return next;
    });
  };

  // ── Item CRUD ──────────────────────────────────────────

  /* v377③: 貼一次單字 → 一次建立整套練習（單字卡／配對連線／聽寫／選擇題／填空）
     全部掛同一個 group，並綁到那份單字卡上，學生端會自動排成一組。 */
  /* v482 📘 一鍵出 Word Study：視窗已經把單元組好、也驗過了，這裡只負責放進週次。
     ⚠ 刻意跟 handleQuickSet 走同一套「寫進去＋指派」的流程（學期＝設作業、暑假＝派給學生），
       不要另寫一份——那兩段邏輯一分家就會有一邊忘了更新。 */
  const handleWordStudy = ({ items, cat, assign }) => {
    if (!items || !items.length) { showToast('沒有產生任何單元'); return; }
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) { showToast('請先選一個週次'); return; }
    if (!w[weekId].items) w[weekId].items = {};
    if (!Array.isArray(w[weekId].items[cat])) w[weekId].items[cat] = [];
    w[weekId].items[cat] = w[weekId].items[cat].concat(items);
    let note = '';
    if (assign && assign.dueDate) {
      if (!w[weekId].homework) w[weekId].homework = {};
      items.forEach(it => { w[weekId].homework[it.id] = { dueDate: assign.dueDate }; });
      note = ` · 已設為作業（${assign.dueDate} 到期）`;
    }
    setWeeks(w);
    saveWeeksSafe(w);
    if (assign && assign.students && assign.students.length && window.saveSummerStudent) {
      const suffix = String(weekId).split('-').pop();
      const metaNow = (summerMetaRef.current && summerMetaRef.current.students) || {};
      Promise.all(assign.students.map(email => {
        const key = String(email).toLowerCase();
        const prev = metaNow[key] || { name: '', weeks: {} };
        const weeksMap = { ...(prev.weeks || {}) };
        const have = Array.isArray(weeksMap[suffix]) ? weeksMap[suffix] : [];
        weeksMap[suffix] = have.concat(items.map(it => it.id).filter(id => have.indexOf(id) < 0));
        return window.saveSummerStudent(key, { ...prev, weeks: weeksMap });
      })).then(() => showToast(`已指派給 ${assign.students.length} 位學生`))
        .catch(() => showToast('指派失敗，請到後台再指派一次'));
      note = ' · 指派中…';
    }
    setWsGenOpen(false);
    showToast(`📘 Word Study：建立了 ${items.length} 個單元${note}`);
  };

  /* 🔴 v487（Alan：「我新增字義選擇，結果按完確認沒有顯示」）：
     視窗把 sense 算好交出來了，但這裡**沒有解構出來**，傳下去就是 undefined
     → qsBuildItems 的 `(sense||[]).length >= 2` 永遠不成立 → 單元靜靜地不見。
     ⚠ 複習那條路（handleCreateReview）v473 就補過了，主路一直漏著，
       所以「字義選擇」從 v468 做好到現在，只有排複習生得出來。
     通用原則：資料從視窗交到 handler 要「一路點名」，中間少一個欄位沒有人會報錯。 */
  const handleQuickSet = ({ words, title, cat, kinds, ai, story, stories, sense, maxQ, assign }) => {
    // 校稿時改過的中文要回填（老師沒貼中文、AI 補的那種）
    const merged = (words || []).map(w => {
      const a = (ai || []).find(r => r.term === w.term);
      return (!w.zh && a && a.zh) ? { ...w, zh: a.zh } : w;
    });
    /* v406: story＝短文填空／v487: sense＝字義選擇
       v542: stories＝好幾篇短文、maxQ＝一個練習最多幾題（程式照這個切）
       ⚠ 這幾個欄位要「一路點名」——中間漏一個不會報錯，單元會安靜地不見（v487 的教訓）。 */
    const items = window.qsBuildItems({ words: merged, title, kinds, ai, story, stories, sense, maxQ });
    /* 🔴 v487：本來一聲不吭就關掉——老師看到的就是「按了確認，什麼都沒發生」。
       跟 v473 同一個教訓：生不出來不可以安靜地少一個單元，一定要講出來。 */
    if (!items.length) {
      setQuickSetOpen(false); setRegenFor(null);
      showToast('這次沒有生出任何單元——勾的題型都還沒有題目，請先按「AI 出題」再建立');
      return;
    }
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) { showToast('請先選一個週次'); return; }
    if (!w[weekId].items) w[weekId].items = {};
    if (!Array.isArray(w[weekId].items[cat])) w[weekId].items[cat] = [];
    w[weekId].items[cat] = w[weekId].items[cat].concat(items);

    /* v380: 整組一次指派——不用建好之後再一份一份設。
       學期＝整組設成本週作業（同一個截止日）；暑假題庫＝寫進每位學生的派發清單。 */
    let assignedNote = '';
    if (assign && assign.dueDate) {
      if (!w[weekId].homework) w[weekId].homework = {};
      items.forEach(it => { w[weekId].homework[it.id] = { dueDate: assign.dueDate }; });
      assignedNote = ` · 已設為作業（${assign.dueDate} 到期）`;
    }
    setWeeks(w);
    saveWeeksSafe(w);

    if (assign && assign.students && assign.students.length && window.saveSummerStudent) {
      const suffix = String(weekId).split('-').pop();     // 例 sl-2026-SW08 → SW08
      const metaNow = (summerMetaRef.current && summerMetaRef.current.students) || {};
      Promise.all(assign.students.map(email => {
        const key = String(email).toLowerCase();
        const prev = metaNow[key] || { name: '', weeks: {} };
        const weeksMap = { ...(prev.weeks || {}) };
        const have = Array.isArray(weeksMap[suffix]) ? weeksMap[suffix] : [];
        weeksMap[suffix] = have.concat(items.map(it => it.id).filter(id => have.indexOf(id) < 0));
        return window.saveSummerStudent(key, { ...prev, weeks: weeksMap });
      })).then(() => showToast(`已指派給 ${assign.students.length} 位學生`))
        .catch(() => showToast('指派失敗，請到後台再指派一次'));
      assignedNote = ` · 指派中…`;
    }

    setQuickSetOpen(false);
    setOpenCat(cat);
    showToast(`已建立 ${items.length} 個練習 · ${merged.length} 個單字${assignedNote}`);
  };

  /* 📸 v516：已經做好的單元直接寫進這一週（拍考卷用）。
     ⚠ 刻意不借 handleQuickSet——那支是「單字表 → 生出一堆單元」，
       借過來要塞一堆空參數，下一個看到的人會以為考卷也是從單字生出來的。 */
  useAppEffect(() => {
    if (!askOpen || !window.subscribeRoster) return;
    return window.subscribeRoster(setAskRoster, () => {});
  }, [askOpen]);

  /* 💬 v518（Alan：「他要先回答我檢查沒問題，確定這些題目沒問題，我就會說幫我直接出出來」）
     在聊天室裡直接出題。⭐ 一樣**不新寫出題邏輯**——呼叫的是視窗裡本來就在用的那幾支，
     組單元用的也是同一支 qsBuildItems／rcBuildItems。
     ⚠ 出完只是放在畫面上，他按「存進本週」才真的寫。 */
  const askGenerate = async (plan, say) => {
    const g = /^g[1-6]$/.test(String(grade)) ? grade : 'g4';
    const note = plan.note || '';
    if (plan.intent === 'vocab') {
      const words = plan.words.map(w => ({ term: w.term, zh: w.zh || '' }));
      const title = plan.title || words[0].term;
      const kinds = plan.kinds.length ? plan.kinds : ['flashcard', 'quiz', 'def-match', 'fillblank', 'spelling'];
      say('出題中…（單字練習）');
      const ai = await window.aiMakeVocabExercises(words, { hint: title, grade: g, teacherNote: note });
      /* 短文填空與字義選擇比較慢，而且**失敗不可以拖垮其他已經出好的**（v473 的教訓）。 */
      let story = null, sense = null;
      /* v542：合併很多字的時候短文要出好幾篇（幾篇由程式算） */
      let stories = [];
      if (kinds.indexOf('story') >= 0 && window.aiMakeVocabStories) {
        say('出題中…（短文填空）');
        stories = await window.aiMakeVocabStories(words, { hint: title, grade: g, teacherNote: note })
          .catch(() => []);
        stories = (stories || []).filter(x => x && !x.error);
      }
      if (kinds.indexOf('sense') >= 0 && window.aiMakeVocabSense) {
        say('出題中…（字義選擇）');
        sense = await window.aiMakeVocabSense(words, { hint: title, grade: g, teacherNote: note }).catch(() => null);
      }
      return window.qsBuildItems({ words, title, kinds, ai, story, stories, sense });
    }
    if (plan.intent === 'reading') {
      const title = plan.title || '閱讀理解';
      say('出題中…（讀文章、出題目）');
      /* 🔴 v520：第一版這裡 background 寫死 null ——
         ReadingGenModal 的「讀之前先知道」預設是**開著的**，所以用聊天室出的閱讀理解
         會比按按鈕出的**少一個單元**，而且畫面上完全看不出來。
         （v473 同一個教訓：安靜地少一個單元最難發現。）
         ⚠ 背景知識失敗不可以拖垮題目——沒有就沒有，題目照常建立。 */
      const [r, bg] = await Promise.all([
        window.aiMakeReadingSet({
          passage: plan.text, title, grade: g,
          mcq: plan.nMcq || 8, sa: plan.nSa || 3, teacherNote: note,
        }),
        window.aiMakeReadingBackground
          ? window.aiMakeReadingBackground({ passage: plan.text, title, grade: g, teacherNote: note }).catch(() => null)
          : Promise.resolve(null),
      ]);
      return window.rcBuildItems({ title, passage: plan.text, mcq: r.mcq, sa: r.sa,
        blocks: r.blocks, skillQs: r.skillQs, background: bg });
    }
    if (plan.intent === 'wordstudy') {
      say('出題中…（Word Study）');
      const pack = await window.aiMakeWordStudy({ topic: plan.topic, grade: g, teacherNote: note });
      const title = plan.title || plan.topic;
      return window.wsBuildItems({ pack, title, kinds: ['lesson', 'circle', 'sort', 'mcq', 'build', 'story'] });
    }
    if (plan.intent === 'grammar') {
      /* 文法是兩段：先把作業（文字或照片）讀成「教學重點＋老師原本的題目」，再出題。
         ⚠ 照片走的是 v428~v430 那支 aiReadGrammarSheet，所以拍照也能直接在這裡做完。 */
      say('讀作業中…');
      const sheet = await window.aiReadGrammarSheet({
        images: (plan.images || []).map(i => ({ media_type: i.media_type, data: i.data })),
        text: plan.text || '',
      });
      if (!sheet.notes && !sheet.questions.length) throw new Error('讀不到教學重點或題目，換一張清楚的照片或直接貼文字。');
      say(`讀到了：${sheet.topic || '文法'}，開始出題`);
      const pack = await window.aiMakeGrammarPack({
        topic: sheet.topic || plan.title, topicZh: sheet.topicZh,
        notes: sheet.notes || plan.text, teacherQs: sheet.questions,
        grade: g, caseMatters: !!sheet.caseMatters, teacherNote: note,
      });
      const title = plan.title || (sheet.topicZh ? `${sheet.topic}（${sheet.topicZh}）` : (sheet.topic || '文法練習'));
      return window.gnBuildItems({ title, topic: sheet.topic, srcNotes: sheet.notes, ...pack,
        caseMatters: !!sheet.caseMatters });
    }
    if (plan.intent === 'exam') {
      /* 📸 考卷：aiReadExamSheet 本來就直接吐一份完整的 exam 單元，不用再出題。 */
      say('讀考卷中…');
      const r = await window.aiReadExamSheet({
        images: (plan.images || []).map(i => ({ media_type: i.media_type, data: i.data })),
        onProgress: (a, b) => say(`讀考卷中… ${a}/${b} 張`),
      });
      const warn = (r.warnings || []).concat((r.skipped || []).map(x => '跳過：' + x));
      return [{ ...r.item, id: 'ex' + Date.now().toString(36), _warn: warn }];
    }
    return [];
  };

  /* 💬 v517：聽懂之後**只做一件事**——打開現成的那個視窗並填好。
     這裡刻意不碰任何出題邏輯，也不直接寫進週次。 */
  /* v531：聊天室要找「那一組」——分組就是同一個 group 欄位（或同一個單元名）。
     ⚠ 比對要寬鬆（忽略大小寫、全半形破折號、前後空白），Alan 不會一個字不差地打出來。 */
  const askNorm = (t) => String(t || '').toLowerCase().replace(/[—–-]/g, '-').replace(/\s+/g, ' ').trim();
  const askGroupNames = () => {
    const w = weeksRef.current[weekId] || {};
    const out = [];
    Object.keys(w.items || {}).forEach(cid => (w.items[cid] || []).forEach(it => {
      const g = (it.group || '').trim();
      if (g && out.indexOf(g) < 0) out.push(g);
    }));
    return out;
  };
  /* weekId → 第幾週（label 裡的數字）。 */
  const askWeekNo = (id) => {
    const w = weeksRef.current[id] || {};
    const m = /(\d+)/.exec(String(w.label || w.id || id));
    return m ? +m[1] : 0;
  };
  /* 「第 9 週」→ 真正的 weekId。⚠ 只在目前這個年級的週次裡找，不跨學期。 */
  const askFindWeek = (n, allowCurrent) => {
    if (!n) return '';
    const hit = (weekOrder || []).find(id => askWeekNo(id) === +n);
    /* ⚠ 搬家的目標不可以是「現在這一週」（搬了等於沒搬）；
       但複製的**來源**可以是現在這一週，所以多一個開關。 */
    return hit && (allowCurrent || hit !== weekId) ? hit : '';
  };
  const askFindGroup = (name) => {
    const q = askNorm(name);
    if (!q) return null;
    const w = weeksRef.current[weekId] || {};
    let best = null;
    Object.keys(w.items || {}).forEach(cid => {
      const groups = {};
      (w.items[cid] || []).forEach(it => {
        const g = (it.group || '').trim();
        if (g) (groups[g] = groups[g] || []).push(it);
      });
      Object.keys(groups).forEach(g => {
        const n = askNorm(g);
        /* 完全一樣最好；其次是「包含」（他可能只講了前半段） */
        if (!best && (n === q || n.indexOf(q) >= 0 || q.indexOf(n) >= 0)) {
          best = { catId: cid, name: g, items: groups[g] };
        }
      });
      /* v534：他常常講的是**單元名**不是組名（「Barbed Wire Baseball 的單字卡
         再加幾種題目」）——用單元名也找得到，回傳它所屬的那一組。 */
      if (!best) {
        (w.items[cid] || []).forEach(it => {
          if (best) return;
          const t = askNorm(it.title || '');
          if (t && (t === q || t.indexOf(q) >= 0 || q.indexOf(t) >= 0)) {
            const g = (it.group || '').trim();
            best = g && groups[g]
              ? { catId: cid, name: g, items: groups[g] }
              : { catId: cid, name: it.title || '', items: [it] };
          }
        });
      }
    });
    return best;
  };

  const runAskPlan = (plan) => {
    if (!plan) return;
    const cat0 = openCat || (activeCategories[0] && activeCategories[0].id) || 'vocab';
    if (plan.intent === 'vocab') {
      /* v533：「我只要 10 題」＝只用前 10 個字（單字題的題數是跟著字數走的）。
         ⚠ 只會**裁短**，絕對不會去湊——湊出來的字不是他要教的。 */
      const ws = (plan.nQ && plan.words.length > plan.nQ) ? plan.words.slice(0, plan.nQ) : plan.words;
      /* v567：他說「中師單字」→ 放進中師單字那一類（有這一類才放） */
      const vcat = (plan.side === 'lt' && activeCategories.find(c => c.id === 'ltvocab')) ? 'ltvocab' : cat0;
      setRegenFor({ name: plan.title || '', catId: vcat,
        text: ws.map(w => [w.term, w.zh].filter(Boolean).join(' - ')).join('\n') });
      setQuickSetOpen(true);
      if (ws.length < plan.words.length) showToast(`照你說的只用前 ${ws.length} 個字`);
    } else if (plan.intent === 'wordstudy') {
      setAskTopic(plan.topic); setWsGenOpen(true);
    } else if (plan.intent === 'grammar') {
      setAskText({ text: plan.text, title: plan.title, note: plan.note }); setGnGenOpen(true);
    } else if (plan.intent === 'reading') {
      setAskText({ text: plan.text, title: plan.title, note: plan.note }); setRcGenOpen(true);
    } else if (plan.intent === 'exam') {
      setExamScanOpen(true);
    } else if (plan.intent === 'examdraft') {
      /* 🗣 v561：他說的內容原封不動帶進去當第一句話，AI 直接開始擬稿 */
      setExamDraft({ brief: [plan.text, plan.note].filter(Boolean).join('\n') });
    } else if (plan.intent === 'lesson' || plan.intent === 'weak' || plan.intent === 'marking') {
      /* 這三件事住在後台（📒 上課紀錄 / 🎯 弱點分析 / 📋 申論批改）——開後台並指到那一頁。
         🔴 v543：這裡本來寫 `email: plan.email || ''`，但 **router 從來沒有產生過
           plan.email**（它只給 plan.student 名字）——所以從 v517 到現在，
           Alan 說「今天 Nick 的上課內容是…」，後台開起來**連 Nick 都沒選到**，
           他打的內容也完全沒有被帶過去，等於什麼都沒做。 */
      const found = plan.student && window.askFindStudent
        ? window.askFindStudent(plan.student, askRoster) : null;
      if (plan.student && (!found || !found.email)) {
        /* ⚠ 對不到就老實說，不要猜最像的那一個——
           名單裡真的有 Elroy(G6) 跟 Elory(G4)，猜錯會把整堂課記到別的孩子身上。 */
        showToast(found && found.many
          ? `名單裡有兩個「${plan.student}」，請自己點一下是哪一位`
          : `名單裡找不到「${plan.student}」`);
      } else if (found && (found.twins || []).length) {
        showToast(`⚠ 名單裡有「${found.twins.join('、')}」這種很像的名字，確認一下是不是 ${found.name}`);
      }
      setDashOpen(true);
      const tab = plan.intent === 'lesson' ? 'lessons'
                : plan.intent === 'marking' ? 'marking' : 'roster';
      try {
        window.__dashGoto = { tab, email: (found && found.email) || '' };
        /* v543（Alan：「他卻不會幫我打好，我點進去還是要手動打，那我還要 AI 幹嘛？」）
           把他打的上課內容一起帶過去，後台會**直接開一堂新的紀錄並填好「這次上了什麼」**。
           ⚠ 只填他自己說的那段字——功課與下次進度維持空白，
             那兩欄按「🪄 幫我擬草稿」才會由 AI 依學校進度表擬（有頁碼把關）。 */
        window.__lessonDraft = (plan.intent === 'lesson' && found && found.email)
          ? { email: found.email, did: String(plan.text || '').trim() } : null;
      } catch (e) {}

    /* ══ v531：剩下的 5 個也接進來 ══════════════════════════════
       ⚠ 一律走「開既有的畫面、把欄位填好」，不要在這裡另外寫一套生成邏輯——
         生成的程式只有一份，用講的跟用按的才會得到一模一樣的結果。 */
    } else if (plan.intent === 'guided') {
      /* 📑 分段閱讀：開單元編輯器，型別與文章先填好，✂ 分段與 🤖 出題在那裡做。 */
      setEditorCat(cat0);
      setEditorAssign(null); setEditorGroups(null);
      setEditorDraft({
        id: cat0[0] + Date.now() + Math.random().toString(36).slice(2, 6),
        _isNew: true, type: 'guided-reading',
        title: plan.title || '', zh: '', duration: '', url: '', embed: '', body: '',
        segments: [{ id: 'g' + Date.now().toString(36), text: plan.text || '', questions: [] }],
      });
      setEditorOpen(true);

    } else if (plan.intent === 'exampaper') {
      /* 📝 考前複習包：它自己會從學校進度表抓這幾週的單字與主題。
         v534：他說「題目需包含…」的話，原話帶進去當這次的特別要求
         （跟每一個一鍵生成的「💬 這次的特別要求」同一個欄位）。 */
      if (plan.note) setAskText({ text: '', title: '', note: plan.note });
      setExamSide(plan.side || 'it');

    } else if (plan.intent === 'tense') {
      setGrGenOpen(true);

    } else if (plan.intent === 'copyweek') {
      /* 🗓 整週複製。來源沒講就是現在這一週。 */
      const from = plan.fromWeek ? askFindWeek(plan.fromWeek, true) : weekId;
      const to = askFindWeek(plan.toWeek, true);
      if (!from) { showToast(`找不到第 ${plan.fromWeek} 週。`); }
      else if (!to) { showToast(`找不到第 ${plan.toWeek} 週。`); }
      else if (from === to) { showToast('來源跟目標是同一週。'); }
      else if (window.confirm(
        `要把「${(weeksRef.current[from] || {}).label || from}」的全部內容複製到「${
          (weeksRef.current[to] || {}).label || to}」嗎？（目標週原本的東西會保留）`)) {
        handleCopyWholeWeek(from, to);
      }

    } else if (plan.intent === 'merge') {
      /* 🧩 合併單字再出題：把字接起來、去重、（有講的話）裁到他要的題數，
         然後開「一鍵出單字」並把單字表填好。 */
      let ws = askMergeWords({ groups: plan.groups, weeks: plan.weeks });
      /* v534（Alan：「文法題目再加上 或是合併」）：那幾組如果不是單字組，
         就把它們的文法筆記接起來，開「一鍵出文法」。
         ⚠ 文法沒有「單字」可以合併，能合併的是**出題的依據**（srcNotes）。 */
      if (!ws.length) {
        const notes = (plan.groups || []).map(g => {
          const f = askFindGroup(g);
          const gm = f && window.reviewGrammarOf ? window.reviewGrammarOf(f.items) : null;
          return gm && gm.notes ? gm.notes : '';
        }).filter(Boolean);
        if (notes.length) {
          setAskText({ text: notes.join('\n\n'), title: plan.title || (plan.groups || []).join(' + '),
                       note: plan.note || '' });
          setGnGenOpen(true);
          showToast(`合併了 ${notes.length} 組的文法重點`);
          setAskOpen(false);
          return;
        }
      }
      if (!ws.length) {
        const names = askGroupNames();
        showToast(names.length
          ? `這幾組裡找不到單字。這一週有的是：${names.slice(0, 4).join('、')}`
          : '找不到可以合併的單字。');
      } else {
        const cut = plan.nQ && ws.length > plan.nQ;
        if (cut) ws = ws.slice(0, plan.nQ);
        const text = ws.map(x => [x.term, x.zh, x.example, x.def].filter(Boolean).join(' - ')).join('\n');
        const imgs = {};
        ws.forEach(x => { if (x.imageUrl) imgs[String(x.term).toLowerCase()] = x.imageUrl; });
        setRegenFor({ catId: cat0, name: plan.title || (plan.groups || []).join(' + ') || '合併複習',
                      pick: false, text, images: imgs });
        setQuickSetOpen(true);
        showToast(`合併了 ${ws.length} 個字${cut ? `（照你說的只取前 ${plan.nQ} 個）` : ''}`);
      }

    } else if (plan.intent === 'assign') {
      /* 📌 設定作業期限（Alan：「並且設定期限」）。
         ⚠ 沒講日期就用預設（下一個週日），跟出完順手指派同一套規則。
         ⚠ 他說「不要當作業」的話 due 會是 none → 取消指派。 */
      const found = askFindGroup(plan.group);
      if (!found) {
        const names = askGroupNames();
        showToast(names.length
          ? `這一週沒有「${plan.group}」。有的是：${names.slice(0, 4).join('、')}`
          : '這一週還沒有任何分組。');
      } else {
        const due = plan.due === 'none' ? ''
          : (window.askDueDate && window.askDueDate(plan.due))
            || (window.askDueDefault && window.askDueDefault()) || '';
        handleSetHomeworkMany(found.items.map(it => it.id), due ? { dueDate: due } : null);
      }

    } else if (plan.intent === 'remind') {
      /* 🔔 v548：把「這週沒做完」的孩子**選好**在提醒那一頁——送出一定是他按。
         ⚠ 這是會直接響在家長手機上的東西，聊天室不可以替他送出去（跟 LINE 公告同一條規矩）。
         ⚠ 人選是用 askQueryAnswer 算的，跟「這週誰沒做完」那個答案同一份——
           他剛看到的名單跟這裡選好的一定一樣。 */
      (async () => {
        let emails = [], names = [];
        if (plan.student) {
          const f = window.askFindStudent && window.askFindStudent(plan.student, askRoster);
          if (!f || !f.email) { showToast(f && f.many ? `名單裡有兩個「${plan.student}」，說全名我才知道是誰。` : `名單裡找不到「${plan.student}」`); return; }
          emails = [f.email]; names = [f.name];
        } else {
          const data = await window.askLoadQueryData();
          const ans = window.askQueryAnswer({ qtype: 'unfinished', gradeId: plan.gradeId || '', student: '' },
            { roster: askRoster, students: data.students, gradeData: data.gradeData, currentWeekId: window.dashCurrentWeekId });
          emails = (ans.rows || []).map(r => r.email).filter(Boolean);
          names = (ans.rows || []).map(r => r.name);
        }
        if (!emails.length) { showToast('這週沒有人需要提醒 🎉'); return; }
        try { window.__dashGoto = { tab: 'hwremind', remind: { emails, note: plan.note || '' } }; } catch (e) {}
        setDashOpen(true);
        showToast(`已選好 ${emails.length} 位（${names.slice(0, 4).join('、')}${names.length > 4 ? '…' : ''}）——到「作業提醒」按預覽，確認再發`);
      })();
      setAskOpen(false);

    } else if (plan.intent === 'stars') {
      /* ⭐ v548：給／扣一位孩子的星星。⚠ 星星是他們在乎的東西，寫之前一定確認一次。 */
      const f = window.askFindStudent && window.askFindStudent(plan.student, askRoster);
      if (!f || !f.email) {
        showToast(f && f.many ? `名單裡有兩個「${plan.student}」，說全名我才知道是誰。` : `名單裡找不到「${plan.student}」`);
      } else {
        const msg = [`${f.name}：${plan.amount > 0 ? '加' : '扣'} ${Math.abs(plan.amount)} 顆星星`,
          plan.note ? `原因：${plan.note}` : '',
          (f.twins || []).length ? `\n⚠ 名單裡有長得很像的名字（${f.twins.join('、')}），確認是 ${f.name} 沒錯。` : '',
          '\n確定嗎？'].filter(Boolean).join('\n');
        if (window.confirm(msg)) {
          window.addStarEntry(f.email, { amount: plan.amount, note: plan.note || '（聊天室）', name: f.name })
            .then(() => showToast(`${f.name} ${plan.amount > 0 ? '+' : ''}${plan.amount} ⭐ 已記下`))
            .catch(() => showToast('寫入失敗，星星沒有動。'));
        }
      }
      setAskOpen(false);

    } else if (plan.intent === 'roster') {
      /* 👥 v548 學生名單。三種都先確認；⚠ 停用不是刪除（資料與進度都留著，隨時能恢復）。 */
      const me = String((window._currentUser && window._currentUser.email) || '').toLowerCase();
      if (plan.rop === 'add') {
        const exists = (askRoster || []).find(r => String(r.email || '').toLowerCase() === plan.newEmail);
        if (exists) showToast(`${exists.name || plan.newEmail} 已經在名單裡了。`);
        else {
          const g = plan.gradeId || (window.gradeFromEmail ? window.gradeFromEmail(plan.newEmail) : '') || '';
          if (window.confirm(`新增學生：${plan.student}\n帳號：${plan.newEmail}\n年級：${g ? g.toUpperCase() : '（沒有，之後可以補）'}\n\n確定嗎？`)) {
            window.addRosterStudent(plan.newEmail, plan.student, g, me)
              .then(() => showToast(`已新增 ${plan.student}`))
              .catch(() => showToast('新增失敗。'));
          }
        }
      } else {
        const f = window.askFindStudent && window.askFindStudent(plan.student, askRoster);
        if (!f || !f.email) showToast(f && f.many ? `名單裡有兩個「${plan.student}」，說全名我才知道是誰。` : `名單裡找不到「${plan.student}」`);
        else {
          const on = plan.rop === 'activate';
          if (window.confirm(`${on ? '恢復' : '停用'} ${f.name}？\n\n${on ? '他會重新出現在名單與統計裡。' : '停用不是刪除：進度與星星都留著，隨時可以恢復。\n他不會再出現在名單、課表統計與提醒裡。'}`)) {
            window.setRosterStudentActive(f.email, on)
              .then(() => showToast(`${f.name} 已${on ? '恢復' : '停用'}`))
              .catch(() => showToast('沒有成功。'));
          }
        }
      }
      setAskOpen(false);

    } else if (plan.intent === 'unit') {
      /* ✏️ v548 改／刪**單一個**單元。⚠ 要**唯一**符合才動手——同一週常有「測驗（1/4）（2/4）…」，
         他只說「測驗」就刪的話，刪錯一個是救不回來的。 */
      const wk = weeksRef.current[weekId] || {};
      const flat = [];
      Object.keys(wk.items || {}).forEach(cid => (wk.items[cid] || []).forEach(it => flat.push({ catId: cid, item: it })));
      const hits = window.askMatchUnits(flat, plan.group);
      if (!hits.length) showToast(`這一週找不到「${plan.group}」`);
      else if (hits.length > 1) {
        showToast(`符合的有 ${hits.length} 個：${hits.slice(0, 4).map(h => h.item.title).join('、')}${hits.length > 4 ? '…' : ''}——說清楚是哪一個`);
      } else {
        const h = hits[0];
        if (plan.op === 'delete') {
          if (window.confirm(`刪掉「${h.item.title}」這一個單元嗎？\n\n學生做過的紀錄會留著，但單元會從這一週消失，救不回來。`)) {
            handleDeleteItem(h.item.id);
            showToast(`已刪掉「${h.item.title}」`);
          }
        } else if (handleRenameUnit(h.catId, h.item.id, plan.title)) {
          showToast(`改好了：${h.item.title} → ${plan.title}`);
        }
      }
      setAskOpen(false);

    } else if (plan.intent === 'timetable') {
      /* 🗓 v547 改固定課表（Alan：「改時間」）。
         ⚠ 這會改到孩子的固定上課時段，所以**一定先問**——而且要把「一起上的還有誰」
           「跟誰撞時間」在按確定之前就講出來。
         ⚠ 只改每週固定的那一堂；「只改這一次」現在做不到，要老實說，不可以偷偷改成固定的。 */
      if (plan.once) {
        showToast('「只改這一次」我還不會——上課紀錄裡有「補課」可以記一次性的課。要改固定課表的話跟我說就好。');
      } else {
        (async () => {
          const found = window.askFindStudent && window.askFindStudent(plan.student, askRoster);
          if (!found || !found.email) {
            showToast(found && found.many ? `名單裡有兩個「${plan.student}」，說全名我才知道是誰。` : `名單裡找不到「${plan.student}」`);
            return;
          }
          const tt = await new Promise(res => {
            let un = null, done = false;
            const fin = (v) => { if (done) return; done = true; try { un && un(); } catch (e) {} res(v); };
            try { un = window.subscribeTimetable(fin); if (done) { try { un && un(); } catch (e) {} } } catch (e) { fin(null); }
            setTimeout(() => fin(null), 6000);
          });
          if (!tt || !(tt.slots || []).length) { showToast('還沒有固定課表——先到「上課紀錄」貼上課表。'); return; }
          const r = window.ttMoveSlot(tt, { email: found.email, name: found.name,
            fromDay: plan.fromDay, toDay: plan.toDay, start: plan.start, end: plan.end });
          if (r.error) { showToast(r.error); return; }
          if (r.ask) { showToast(r.ask); return; }
          const msg = [`把 ${found.name} 的固定課表：`, `  ${r.before}  →  ${r.after}`,
            r.others.length ? `\n⚠ 這一堂還有 ${r.others.join('、')} 一起上，他們也會一起改。` : '',
            r.clash.length ? `\n⚠ 跟這幾堂時間重疊：${r.clash.join('；')}` : '',
            '\n確定要改嗎？'].filter(Boolean).join('\n');
          if (!window.confirm(msg)) return;
          try {
            await window.saveTimetable(r.tt);
            showToast(`改好了：${found.name} ${r.after}`);
          } catch (e) { showToast('存檔失敗，課表沒有改。'); }
        })();
      }
      setAskOpen(false);

    } else if (plan.intent === 'notify') {
      /* 📢 LINE 公告：把稿子先打好、對象先選好，**送出那一下還是他自己按**。
         ⚠ 這是會直接送到家長手機上的東西，不可以由聊天室替他送出去。 */
      setDashOpen(true);
      try {
        window.__dashGoto = { tab: 'notify', notify: {
          text: plan.text || '', target: plan.target || 'all', grade: plan.gradeId || '' } };
      } catch (e) {}

    } else if (plan.intent === 'review' || plan.intent === 'group') {
      /* 🔁 排複習到別週 ／ 📦 整組操作：先在目前這一週把那一組找出來。
         ⚠ 找不到不要安靜地什麼都不做——把這一週有哪些組列給他看（v500 的教訓：
           「靜靜地少做一半比直接失敗更難發現」）。 */
      const found = askFindGroup(plan.group);
      if (!found) {
        const names = askGroupNames();
        showToast(names.length
          ? `這一週沒有「${plan.group}」這一組。有的是：${names.slice(0, 4).join('、')}`
          : '這一週還沒有任何分組。');
      } else if (plan.intent === 'review') {
        setReviewFor({ catId: found.catId, name: found.name, items: found.items });
      } else if (plan.op === 'again') {
        /* 走「在這一組再出一份」那條既有的路（跟單元列的選單同一個 handler）。 */
        const ws = (window.reviewWordsOf && window.reviewWordsOf(found.items)) || [];
        if (ws.length >= 2) {
          const text = ws.map(x => [x.term, x.zh, x.example, x.def].filter(Boolean).join(' - ')).join('\n');
          const imgs = {};
          ws.forEach(x => { if (x.imageUrl) imgs[String(x.term).toLowerCase()] = x.imageUrl; });
          setRegenFor({ catId: found.catId, name: found.name, pick: false, text, images: imgs,
                        have: (window.qsKindsInGroup && window.qsKindsInGroup(found.items)) || [] });
          setQuickSetOpen(true);
        } else {
          setRegenFor({ catId: found.catId, name: found.name, pick: true });
        }
      } else if (plan.op === 'rename') {
        /* v544：改名字（跟單元列的「✏️ 改名字…」走同一個 handler）。
           ⚠ 他沒講新名字就不要自己取一個。 */
        const b = String(plan.title || '').trim();
        if (!b) showToast(`「${found.name}」要改叫什麼？跟我說新名字就好。`);
        else handleRenameGroup(found.catId, found.name, b);
      } else if (plan.op === 'delete') {
        /* 🔴 唯一一件會把東西丟掉的事——一定要他自己按下去確認。
           聊天室打錯一個字就刪掉一整組，那是救不回來的。 */
        if (window.confirm(`要刪掉「${found.name}」這一組的 ${found.items.length} 個單元嗎？這個動作救不回來。`)) {
          handleDeleteItems(found.items.map(it => it.id));
        }
      } else {
        /* copy（沿用到別週）／ move（搬過去）：要知道搬去哪一週。
           ⚠ 他沒講週次就不要自己挑一個——把可以選的列給他。 */
        const target = askFindWeek(plan.toWeek);
        if (!target) {
          showToast(plan.toWeek
            ? `找不到第 ${plan.toWeek} 週。`
            : '要沿用到第幾週？跟我說週次就好。');
        } else {
          handleCopyGroupToWeeks(found.catId, found.items, [target], plan.due
            ? (window.askDueDate ? window.askDueDate(plan.due) : '') : '', plan.op === 'move');
          showToast(`${plan.op === 'move' ? '已搬到' : '已沿用到'}${
            (weeksRef.current[target] && weeksRef.current[target].label) || target}`);
        }
      }
    }
    setAskOpen(false);
  };

  const handleAddBuiltItems = (list, cat, dueDate) => {
    /* ⚠ _warn 是給聊天室畫面看的校稿提醒，不可以跟著寫進課程資料。 */
    const items = (list || []).filter(Boolean).map(({ _warn, ...it }) => it);
    if (!items.length) { showToast('沒有東西可以存'); return; }
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) { showToast('請先選一個週次'); return; }
    if (!w[weekId].items) w[weekId].items = {};
    if (!Array.isArray(w[weekId].items[cat])) w[weekId].items[cat] = [];
    w[weekId].items[cat] = w[weekId].items[cat].concat(items);
    /* 📌 v521：出完順手指派——跟 handleQuickSet 寫同一個地方（week.homework），
       不要另外發明一種存法。 */
    let note = '';
    if (dueDate) {
      if (!w[weekId].homework) w[weekId].homework = {};
      items.forEach(it => { w[weekId].homework[it.id] = { dueDate }; });
      note = ` · 已設為作業（${dueDate} 到期）`;
    }
    setWeeks(w);
    saveWeeksSafe(w);
    setOpenCat(cat);
    showToast(`已建立 ${items.length} 個單元${note}`);
  };

  /* v382: 時態出題完成 → 建立成多個單元（Type A→type-answer、Type B→cloze），
     全部丟進「該時態」那個分類底下，並掛同一個 group。 */
  /* v386: 閱讀理解出題完成 → 建立 1~4 個單元（選擇題 / 閱讀技巧題 / 閱讀技巧活動 / 閱讀簡答），
     全部掛同一個 group（＝文章標題），順序交給 QM_TYPE_ORDER 排。
     指派的兩條路跟 handleQuickSet 一樣：學期年級用 week.homework，暑假用 summer_meta。 */
  const handleReadingCreate = ({ title, cat, passage, mcq, sa, blocks, skillQs, background, assign, prebuilt }) => {
    // v415: skillQs ＝ 閱讀技巧題（多一個 quiz 單元）
    // v428: ✏️ 出文法也走這裡（prebuilt＝已經建好的單元）——存檔、作業期限、指派的邏輯一模一樣
    // v436：background＝讀之前的互動式背景知識（會變成一個 lesson 單元，其他單元要學完才解鎖）
    const items = prebuilt || window.rcBuildItems({ title, passage, mcq, sa, blocks, skillQs, background });
    if (!items.length) { showToast('沒有可以建立的題目'); return; }
    // 蓋上作者：後台「只看我的」會依 owner 篩，沒蓋的話老師看不到自己剛生的單元
    const me = (user && user.email || '').toLowerCase();
    if (me) items.forEach(it => { it.owner = me; });
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) { showToast('請先選一個週次'); return; }
    if (!w[weekId].items) w[weekId].items = {};
    if (!Array.isArray(w[weekId].items[cat])) w[weekId].items[cat] = [];
    w[weekId].items[cat] = w[weekId].items[cat].concat(items);

    let note = '';
    if (assign && assign.dueDate) {
      if (!w[weekId].homework) w[weekId].homework = {};
      items.forEach(it => { w[weekId].homework[it.id] = { dueDate: assign.dueDate }; });
      note = ` · 已設為作業（${assign.dueDate} 到期）`;
    }
    setWeeks(w);
    saveWeeksSafe(w);

    if (assign && assign.students && assign.students.length && window.saveSummerStudent) {
      const suffix = String(weekId).split('-').pop();
      const metaNow = (summerMetaRef.current && summerMetaRef.current.students) || {};
      Promise.all(assign.students.map(email => {
        const key = String(email).toLowerCase();
        const prev = metaNow[key] || { name: '', weeks: {} };
        const weeksMap = { ...(prev.weeks || {}) };
        const have = Array.isArray(weeksMap[suffix]) ? weeksMap[suffix] : [];
        weeksMap[suffix] = have.concat(items.map(it => it.id).filter(id => have.indexOf(id) < 0));
        return window.saveSummerStudent(key, { ...prev, weeks: weeksMap });
      })).then(() => showToast(`已指派給 ${assign.students.length} 位學生`))
        .catch(() => showToast('指派失敗，請到後台再指派一次'));
      note = ' · 指派中…';
    }

    setRcGenOpen(false);
    setGnGenOpen(false);
    setOpenCat(cat);
    const names = items.map(it => it.type === 'type-answer' ? (it.variant === 'translate' ? '中翻英' : '填空')
      : ({ quiz: '選擇題', 'reading-skill': '閱讀技巧', 'short-answer': '閱讀簡答', lesson: '互動教學' })[it.type] || it.type).join('、');
    showToast(`已建立 ${items.length} 個單元 · ${names}${note}`);
  };

  // v428: ✏️ 出文法
  const handleGrammarNotesCreate = (payload) => {
    const items = window.gnBuildItems(payload);
    handleReadingCreate({ cat: payload.cat, assign: payload.assign, prebuilt: items });
  };

  const handleGrammarCreate = (payload) => {
    const items = window.grBuildItems(payload);
    if (!items.length) { setGrGenOpen(false); return; }
    const cat = payload.tense;                       // 分類 id 就是 t1~t5
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) { showToast('找不到題庫週次'); return; }
    if (!w[weekId].items) w[weekId].items = {};
    if (!Array.isArray(w[weekId].items[cat])) w[weekId].items[cat] = [];
    w[weekId].items[cat] = w[weekId].items[cat].concat(items);
    setWeeks(w);
    saveWeeksSafe(w);
    setGrGenOpen(false);
    setOpenCat(cat);
    const nA = items.filter(i => i.type === 'type-answer').length;
    const nB = items.filter(i => i.type === 'cloze').length;
    showToast(`已建立 ${items.length} 個單元 · 單句 ${nA} 組、短文 ${nB} 篇`);
  };

  const handleAddItem = (catId, assignEmail, groupOptions) => {
    // Pre-generate final ID so the PDF storage path is stable before save.
    // Include random suffix to avoid collisions if called rapidly.
    const newId = catId[0] + Date.now() + Math.random().toString(36).slice(2, 6);
    setEditorCat(catId);
    setEditorAssign(assignEmail || null); // v351: 篩選到某位學生時出的題目 → 存檔後直接指派給他
    // v374(#5): 分組選單只列「目前畫面上看得到的」分組——在某位學生底下出題時，
    //           就只會出現他有的那幾組，不用從全班所有分組裡面找
    setEditorGroups(Array.isArray(groupOptions) ? groupOptions : null);
    setEditorDraft({
      id: newId,
      _isNew: true,
      type: "flashcard", // v306: 原本預設 quizlet（已下架、學生看不到）→ 改成會顯示的單字卡
      title: "",
      zh: "",
      duration: "",
      url: "",
      embed: "",
      body: "",
    });
    setEditorOpen(true);
  };

  const handleEditItem = (item) => {
    const catId = Object.keys(week.items).find(k => week.items[k].some(it => it.id === item.id));
    setEditorCat(catId);
    setEditorAssign(null); // 編輯既有單元不動指派（要改指派用單元列的 👤）
    setEditorGroups(null); // 編輯既有單元＝列出整個分類的分組（不限縮）
    setEditorDraft({...item});
    setEditorOpen(true);
  };

  const handleSaveItem = (form) => {
    /* v407：__side ＝「順便一起建立的別種單元」。目前只有一個來源——
       分段閱讀的 🤖 AI 自動出題勾了「閱讀技巧」，而閱讀技巧是另一個 type，
       塞不進 grSegments/grFinal。⚠ 一定要在這裡解構掉，不然會被存進 Firestore。 */
    const { _isNew, __side, ...cleanForm } = form;
    const isNew = !!_isNew;
    // v339: 多位老師共用題庫——記下是誰建立的，側欄才能「只看我的單元」。
    // 舊資料沒有 owner，一律視為擁有者(Alan)的。
    if (isNew && !cleanForm.owner) {
      const me = window._currentUser && window._currentUser.email;
      if (me) cleanForm.owner = String(me).toLowerCase();
    }
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) {
      w[weekId] = {...week, items: {vocab:[], grammar:[], word:[], reading:[]}};
    }
    const list = w[weekId].items[editorCat] || [];
    const saved = isNew
      ? [...list, cleanForm]
      : list.map(it => it.id === cleanForm.id ? cleanForm : it);
    /* 附帶單元接在本體後面，owner 跟著本體走（側欄的「只看我的單元」才篩得到）。
       id 撞到就不加——重複 id 會讓側欄與作答進度整個對不上。 */
    const side = (Array.isArray(__side) ? __side : []).filter(x => x && x.id && x.type)
      .filter(x => !saved.some(it => it.id === x.id))
      .map(x => (cleanForm.owner && !x.owner) ? { ...x, owner: cleanForm.owner } : x);
    w[weekId].items[editorCat] = saved.concat(side);
    setWeeks(w);
    saveWeeksSafe(w);
    setEditorOpen(false);
    // v351: 在某位學生的篩選底下出的新題目 → 直接寫進他的暑假發派清單，
    //       存完就出現在他的篩選（也就是他的任務）底下，不必再勾一次 👤。
    let assignedName = '';
    if (isNew && editorAssign && String(weekId || '').startsWith('sl') && window.saveSummerStudent) {
      const email = String(editorAssign).toLowerCase();
      const sfx = window.summerWeekSuffix ? window.summerWeekSuffix(weekId) : String(weekId).split('-').pop();
      const plan = (summerMeta.students || {})[email] || {};
      const weeksPlan = { ...(plan.weeks || {}) };
      const cur = new Set(weeksPlan[sfx] || []);
      cur.add(cleanForm.id);
      weeksPlan[sfx] = Array.from(cur);
      assignedName = _englishName(plan.name || '') || email.split('@')[0];
      Promise.resolve(window.saveSummerStudent(email, { ...plan, name: plan.name || '', weeks: weeksPlan }))
        .catch(() => showToast(`已存檔，但指派給 ${assignedName} 失敗——請用單元列的 👤 再試一次`));
    }
    setEditorAssign(null);
    // v360: 新出的單元在暑假題庫 → 直接把「指派給哪些學生」打開，一次勾多人
    if (isNew && String(weekId || '').startsWith('sl') && window.isAdminUser && window.isAdminUser(window._currentUser)) {
      setAssignAfterSave(cleanForm.id);
    }
    const nSide = side.length;   // 用真的加進去的數量，不是 __side 的長度（重存時會被去重擋掉）
    showToast(nSide
      ? `已存檔，另外建立了 ${nSide} 個附帶單元`
      : (isNew ? (assignedName ? `已新增並指派給 ${assignedName}` : "Item added") : "Item saved"));
  };

  // v360: 依「完整的 id 順序」重排單元——群組內互換、整組上下移都走這裡。
  //       只接受「完整排列」（跟現有清單同一組 id），避免篩選中的畫面把沒列到的單元弄丟。
  const handleReorderItems = (catId, orderedIds) => {
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    const list = w[weekId]?.items?.[catId];
    if (!list || !Array.isArray(orderedIds)) return;
    const byId = new Map(list.map(it => [it.id, it]));
    if (orderedIds.length !== list.length || orderedIds.some(id => !byId.has(id))) return; // 不是完整排列＝不動
    w[weekId].items[catId] = orderedIds.map(id => byId.get(id));
    setWeeks(w);
    saveWeeksSafe(w);
  };

  // v364: 依單元名稱（Unit 21、Unit 22…）自動把文章跟同名的單字卡配對，一次配完整個分類
  const unitKeyOf = (it) => {
    const m = String((it && (it.group || it.title)) || '').match(/unit\s*0*(\d+)/i);
    return m ? 'u' + m[1] : null;
  };
  const handleAutoLinkFlashcards = (catId) => {
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    const wk = w[weekId];
    if (!wk) return;
    const all = Object.values(wk.items || {}).flat();
    const fcByKey = new Map();
    all.filter(it => it.type === 'flashcard' && (it.cards || []).length > 0).forEach(f => {
      const k = unitKeyOf(f);
      if (k && !fcByKey.has(k)) fcByKey.set(k, f);
    });
    // ⚠ 只靠 Unit 編號配對會出事：實際資料裡「Unit 21 食物鏈」的文章會配到「Unit 21 固體液體」
    //   的單字卡（兩套教材都用 Unit 編號）。所以一律先把配對結果攤開來讓老師確認再寫。
    const pairs = [], miss = [];
    (wk.items[catId] || []).forEach(it => {
      if (it.type !== 'guided-reading') return;
      const k = unitKeyOf(it);
      const fc = k ? fcByKey.get(k) : null;
      if (!fc) { miss.push(it.title || it.id); return; }
      if (it.linkedFlashcardId === fc.id) return;      // 已經是這張了
      pairs.push({ it, fc });
    });
    if (!pairs.length) {
      showToast(miss.length ? '找不到同編號的單字卡（單元名稱要含 Unit 數字）' : '都已經配對好了');
      return;
    }
    const lines = pairs.map(p => `・${p.it.title || p.it.id}\n    → ${p.fc.title || p.fc.id}`).join('\n');
    if (!confirm(
      `依 Unit 編號找到 ${pairs.length} 組配對，請先確認主題對不對：\n\n${lines}\n\n` +
      (miss.length ? `（${miss.length} 篇沒有 Unit 編號，會略過）\n\n` : '') +
      `⚠️ 編號一樣不代表內容一樣——不對的話按取消，改用每篇自己選。\n確定要綁定嗎？`
    )) return;
    pairs.forEach(p => { p.it.linkedFlashcardId = p.fc.id; });
    setWeeks(w);
    saveWeeksSafe(w);
    showToast(`已配對 ${pairs.length} 篇文章`);
  };

  // v367: 群組層級的參考資料——一個群組（例：Grandma and the great gourd）最上面
  //        可以掛文章的 YouTube／檔案／說明，底下的選擇題、手寫題、reading skill 共用。
  //        存在 week.groupRes，key = `分類::群組名`（同名群組可能同時存在不同分類）。
  const groupResKey = (catId, group) => `${catId}::${String(group || '').trim()}`;
  const handleSaveGroupRes = (catId, group, patch) => {
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    const wk = w[weekId];
    if (!wk) return;
    if (!wk.groupRes) wk.groupRes = {};
    const k = groupResKey(catId, group);
    const next = { ...(wk.groupRes[k] || {}), ...patch };
    // 三個欄位都空了就整筆刪掉，不要留空殼
    if (!next.yt && !next.fileUrl && !String(next.note || '').trim()) delete wk.groupRes[k];
    else wk.groupRes[k] = next;
    setWeeks(w);
    saveWeeksSafe(w);
  };

  /* v544（Alan：「群組缺少一個功能 就是改名字」）
     他合併了 6 組，組名變成六個名字串在一起，連單元標題都是那一長串。
     ⚠ 要一起搬的有三樣：單元的 group、單元的 title、以及**群組的參考資料**
       （groupRes 的 key 是 `分類::組名`——不搬的話 📎 參考資料會整個消失，而且不報錯）。 */
  const handleRenameGroup = (catId, oldName, newName) => {
    const a = String(oldName || '').trim(), b = String(newName || '').trim();
    if (!a || !b || a === b) return;
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    const wk = w[weekId];
    if (!wk || !wk.items || !Array.isArray(wk.items[catId])) return;
    /* ⚠ 同一週已經有同名的另一組＝兩組會被合在一起（側欄靠 group 歸戶）。
       那不一定是他要的，所以先問一句。 */
    const clash = wk.items[catId].some(it => it && String(it.group || '').trim() === b);
    if (clash && !confirm(`這一週已經有一組叫「${b}」了。\n\n改下去兩組會變成同一組，確定嗎？`)) return;
    const mine = wk.items[catId].filter(it => it && String(it.group || '').trim() === a);
    const res = window.renameGroupItems(mine, a, b);
    const byId = new Map(res.items.map(it => [it.id, it]));
    wk.items[catId] = wk.items[catId].map(it => byId.get(it && it.id) || it);
    /* 📎 參考資料跟著搬 */
    if (wk.groupRes) {
      const from = groupResKey(catId, a), to = groupResKey(catId, b);
      if (wk.groupRes[from]) { wk.groupRes[to] = { ...(wk.groupRes[to] || {}), ...wk.groupRes[from] }; delete wk.groupRes[from]; }
    }
    setWeeks(w);
    saveWeeksSafe(w);
    showToast(res.kept
      ? `改好了：${res.n} 個單元跟著改名，${res.kept} 個你自己取過名字的沒有動`
      : `改好了：${res.items.length} 個單元都改成「${b}」`);
  };

  /* v548 只改**一個**單元的標題（聊天室「把測驗（2/4）改名叫…」）。
     ⚠ 只動 title，不動 group——它還是留在原本那一組。 */
  const handleRenameUnit = (catId, itemId, newTitle) => {
    const b = String(newTitle || '').trim();
    if (!b) return false;
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    const list = w[weekId] && w[weekId].items && w[weekId].items[catId];
    const it = Array.isArray(list) && list.find(x => x && x.id === itemId);
    if (!it) return false;
    it.title = b;
    setWeeks(w);
    saveWeeksSafe(w);
    return true;
  };

  const handleMoveItem = (catId, itemId, dir) => {
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    const list = w[weekId]?.items?.[catId];
    if (!list) return;
    const i = list.findIndex(it => it.id === itemId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setWeeks(w);
    saveWeeksSafe(w);
  };

  const handleMoveTypeGroup = (catId, type, dir) => {
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    const list = w[weekId]?.items?.[catId];
    if (!list) return;
    const seenTypes = [];
    list.forEach(it => { if (!seenTypes.includes(it.type)) seenTypes.push(it.type); });
    const ti = seenTypes.indexOf(type);
    const si = ti + dir;
    if (ti < 0 || si < 0 || si >= seenTypes.length) return;
    [seenTypes[ti], seenTypes[si]] = [seenTypes[si], seenTypes[ti]];
    const byType = {};
    list.forEach(it => { (byType[it.type] = byType[it.type] || []).push(it); });
    w[weekId].items[catId] = seenTypes.flatMap(t => byType[t] || []);
    setWeeks(w);
    saveWeeksSafe(w);
  };

  /* v477：把「從某一週拿掉這些單元」抽出來——刪掉整組、搬到別週都要做同一件事。
     🔴 v460（Alan：「家長說作業都做完了，為什麼還在傳未交提醒」）：
       單元拿掉了，homework 裡那一筆 id 要一起拿掉，不然會變成孤兒。
       網站自己到處都會略過這種孤兒（學生看不到、點不進去），所以在網站上完全看不出問題，
       但 LINE 的作業提醒是照 homework 清單算的 → 變成學生**永遠做不掉**的作業，天天催。
       2026-09-29 查線上資料：六個年級共有 38 份這種幽靈（G1 的 34 份裡有 21 份是）。
     ⚠ 只改傳進來的那一週，不存檔——呼叫端做完自己的事再一起存一次。 */
  const stripItemsFrom = (wk, ids) => {
    if (!wk || !wk.items || !ids || !ids.size) return;
    Object.keys(wk.items).forEach(k => {
      wk.items[k] = (wk.items[k] || []).filter(it => !ids.has(it.id));
    });
    ids.forEach(id => { if (wk.homework && wk.homework[id]) delete wk.homework[id]; });
    // 別的單元若「需要先學完這一個」，那個鎖也要解掉（不然學生被一個不存在的教學卡鎖住）
    Object.keys(wk.items).forEach(k => {
      (wk.items[k] || []).forEach(it => {
        if (it && ids.has(it.requires)) delete it.requires;
        if (it && ids.has(it.linkedFlashcardId)) delete it.linkedFlashcardId;
      });
    });
  };

  /* v474：整組刪掉也走這裡（Alan：「整組無法直接刪掉」）。
     ⚠ 不要寫成「迴圈呼叫 handleDeleteItem」——那會存 N 次，
       而且每次都重讀 weeksRef，中間的 setWeeks 還沒生效就會互相蓋掉。
       同一份清理邏輯只留一份，一次處理完再存一次。 */
  const handleDeleteItems = (itemIds) => {
    const ids = new Set((itemIds || []).filter(Boolean));
    if (!ids.size) return;
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    stripItemsFrom(w[weekId], ids);   // 單元＋孤兒作業＋別人指向它的鎖，一起清
    setWeeks(w);
    saveWeeksSafe(w);
    setEditorOpen(false);
    showToast(ids.size > 1 ? `已刪掉 ${ids.size} 個單元` : 'Item deleted');
  };
  const handleDeleteItem = (itemId) => handleDeleteItems([itemId]);

  // ── Homework handler ────────────────────────────────────
  const handleSetHomework = (itemId, hwData) => {
    // hwData = { dueDate: 'YYYY-MM-DD' } to set, null to remove
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) return;
    if (!w[weekId].homework) w[weekId].homework = {};
    if (hwData) w[weekId].homework[itemId] = hwData;
    else delete w[weekId].homework[itemId];
    setWeeks(w);
    saveWeeksSafe(w);
    showToast(hwData ? "設定作業 ✓" : "取消作業");
  };

  /* v454（Alan：「我只能一個一個去改日期…希望可以一整包一起去改」）：
     一次設／取消一整組的截止日——只寫一次 Firestore（一個一個設會存 N 次）。 */
  const handleSetHomeworkMany = (itemIds, hwData) => {
    const ids = (itemIds || []).filter(Boolean);
    if (!ids.length) return;
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) return;
    if (!w[weekId].homework) w[weekId].homework = {};
    ids.forEach(id => { if (hwData) w[weekId].homework[id] = hwData; else delete w[weekId].homework[id]; });
    setWeeks(w);
    saveWeeksSafe(w);
    showToast(hwData ? `${ids.length} 個單元都設成作業 ✓` : `${ids.length} 個單元取消作業`);
  };

  /* v454：整組沿用到其他週（Alan：「功課要延續到下週當功課」）——
     一次把整組複製過去，dueDate 有值的話在目標週也直接設成作業。 */
  /* v466（Alan：「我想製作一個複習的方式，但題目我又要重新生成」）：
     同一批單字重出一份新題目 → 寫進目標週，組名加「· 複習」。
     ⚠ 單字卡是**照抄**原本那一張（Alan：「單字卡當然不用再換」），
       但 id 要換新的，不然跟原本那一週同 id，學生做完會互相蓋掉進度。 */
  const handleCreateReview = ({ targetWeekId, catId, groupName, words, ai, story, stories, sense, kinds, dueDate, grammar, topic }) => {
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[targetWeekId]) { showToast('找不到那一週'); return; }
    const title = `${groupName} · 複習`;
    /* v469：文法的複習走 gnBuildItems。
       ⚠ lesson 傳 null＝不重出互動教學（那一課教的東西沒變），
         所以也不會有 requires，學生進去就能直接練。 */
    const built = grammar
      ? window.gnBuildItems({ title, topic, srcNotes: '', lesson: null,
          mcq: grammar.mcq, fill: grammar.fill, tr: grammar.tr, rw: grammar.rw,
          write: grammar.write, tf: grammar.tf, ord: grammar.ord,
          edit: grammar.edit, diag: grammar.diag,
          circle: grammar.circle, sort: grammar.sort,
          circleSets: grammar.circleSets, sortSets: grammar.sortSets,
          caseMatters: grammar.caseMatters })
      : window.qsBuildItems({ words, title, kinds, ai, story, stories, sense });   // v473：字義選擇也要傳下去／v542：短文好幾篇
    if (!built.length) { showToast('沒有產生任何單元'); return; }
    if (!w[targetWeekId].items) w[targetWeekId].items = { vocab: [], grammar: [], word: [], reading: [] };
    if (!w[targetWeekId].items[catId]) w[targetWeekId].items[catId] = [];
    if (dueDate && !w[targetWeekId].homework) w[targetWeekId].homework = {};
    const taken = new Set(Object.values(w[targetWeekId].items).flat().map(it => it.id));
    built.forEach(it => {
      let id = it.id, n = 2;
      while (taken.has(id)) { id = `${it.id}-${n}`; n++; }
      taken.add(id);
      w[targetWeekId].items[catId].push({ ...it, id });
      if (dueDate) w[targetWeekId].homework[id] = { dueDate };
    });
    setWeeks(w);
    saveWeeksSafe(w);
    setReviewFor(null);
    showToast(`已排 ${built.length} 個複習單元到「${w[targetWeekId].label || targetWeekId}」${dueDate ? '，並設成作業' : ''} ✓`);
  };

  /* v477（Alan：「我出錯 week 了，我想整組調整到 week6」）：
     本來只有「沿用」＝複製一份過去、原本那一週照樣留著。
     加上 move＝搬過去（複製完把原本那一週的拿掉）。
     ⚠ 一定要在同一個 w 上做完再存一次——分成兩次存的話，
       中間 setWeeks 還沒生效就會互相蓋掉（v474 已經踩過）。 */
  const handleCopyGroupToWeeks = (catId, items, targetWeekIds, dueDate, move) => {
    const list = (items || []).filter(x => x && x.id);
    if (!list.length || !(targetWeekIds || []).length) return;
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    let copied = 0, weeksTouched = 0;
    targetWeekIds.forEach(tw => {
      if (!w[tw]) return;
      if (!w[tw].items) w[tw].items = { vocab: [], grammar: [], word: [], reading: [] };
      if (!w[tw].items[catId]) w[tw].items[catId] = [];
      if (dueDate && !w[tw].homework) w[tw].homework = {};
      let any = false;
      list.forEach(item => {
        const taken = new Set(Object.values(w[tw].items).flat().map(it => it.id));
        let id = item.id, n = 2;
        while (taken.has(id)) { id = `${item.id}-${n}`; n++; }
        const clone = JSON.parse(JSON.stringify(item));
        clone.id = id;
        /* ⚠ 組內互相指向的 id（教學卡的鎖 requires、單字卡的 linkedFlashcardId）
           要跟著換成複製後的新 id，不然到了新的一週會鎖著一個不存在的單元。 */
        clone.__oldId = item.id;
        w[tw].items[catId].push(clone);
        if (dueDate) w[tw].homework[id] = { dueDate };
        copied++; any = true;
      });
      // 第二輪：把 requires／linkedFlashcardId 對到這一週的新 id
      const map = {};
      w[tw].items[catId].forEach(it => { if (it.__oldId) map[it.__oldId] = it.id; });
      w[tw].items[catId].forEach(it => {
        if (!it.__oldId) return;
        if (it.requires && map[it.requires]) it.requires = map[it.requires];
        if (it.linkedFlashcardId && map[it.linkedFlashcardId]) it.linkedFlashcardId = map[it.linkedFlashcardId];
        delete it.__oldId;
      });
      if (any) weeksTouched++;
    });
    if (!copied) { showToast('沒有可沿用的週'); return; }
    if (move) stripItemsFrom(w[weekId], new Set(list.map(it => it.id)));
    setWeeks(w);
    saveWeeksSafe(w);
    const toLabel = (w[targetWeekIds[0]] && (w[targetWeekIds[0]].label || targetWeekIds[0])) || targetWeekIds[0];
    showToast(move
      ? `整組 ${list.length} 個單元已搬到「${toLabel}」✓`
      : `整組 ${list.length} 個單元已沿用到 ${weeksTouched} 週${dueDate ? '，並設成作業' : ''} ✓`);
  };

  /* ══ 🗓 v533：整週內容複製到別週 ════════════════════════════════
     Alan：「我說把哪一週的內容複製到哪裡」——以前**整個網站都做不到**，
     只能一組一組沿用（v454）。
     ⚠ 一次做完一次存：照著分類一個一個呼叫 handleCopyGroupToWeeks 的話，
       會連存好幾次雲端，中間任何一次失敗就變成「複製到一半」。
     ⚠ 組內互相指向的 id（教學卡的鎖 requires、單字卡的 linkedFlashcardId）
       要跟著換成新 id——跟整組沿用同一個道理，少做這一步到了新的一週
       就會鎖著一個不存在的單元。
     ⚠ 目標週已經有的東西**不動**（是「加進去」不是「蓋掉」）——
       蓋掉的話他一句話就能把一整週的課程洗掉。 */
  const handleCopyWholeWeek = (fromId, toId) => {
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    const src = w[fromId], dst = w[toId];
    if (!src || !dst) { showToast('找不到那一週'); return 0; }
    if (!dst.items) dst.items = { vocab: [], grammar: [], word: [], reading: [] };
    let n = 0;
    Object.keys(src.items || {}).forEach(catId => {
      const list = (src.items[catId] || []).filter(x => x && x.id);
      if (!list.length) return;
      if (!Array.isArray(dst.items[catId])) dst.items[catId] = [];
      const taken = new Set(Object.values(dst.items).flat().map(it => it && it.id).filter(Boolean));
      const map = {};
      list.forEach(item => {
        let id = item.id, k = 2;
        while (taken.has(id)) { id = `${item.id}-${k}`; k++; }
        taken.add(id);
        const clone = JSON.parse(JSON.stringify(item));
        clone.id = id;
        map[item.id] = id;
        dst.items[catId].push(clone);
        n++;
      });
      dst.items[catId].forEach(it => {
        if (it.requires && map[it.requires]) it.requires = map[it.requires];
        if (it.linkedFlashcardId && map[it.linkedFlashcardId]) it.linkedFlashcardId = map[it.linkedFlashcardId];
      });
    });
    if (!n) { showToast('那一週沒有東西可以複製'); return 0; }
    setWeeks(w);
    saveWeeksSafe(w);
    showToast(`已把「${src.label || fromId}」的 ${n} 個單元複製到「${dst.label || toId}」✓`);
    return n;
  };

  /* ══ 🧩 v533：把好幾組的單字合併起來，再出一份 ══════════════════
     Alan：「合併哪些單字卡，合併之後再出題，然後我需要多少題目」。
     ⭐ 零件本來就有：reviewWordsOf 會從任何一組反推出單字（沒有單字卡時
       也會從配對／聽寫／短文填空挖出來），qsBuildItems 會把單字變成題目。
       以前沒有的只是「把好幾組的字接起來、去掉重複」這一段。
     ⚠ 去重要用小寫比對，不然 Pursued 跟 pursued 會變成兩個字。
     ⚠ 中文／例句／圖片以**第一次出現**的那一份為準——後面同一個字再出現時
       不要覆蓋，不然他後來補的翻譯會被舊的蓋回去。 */
  const askMergeWords = ({ groups = [], weeks: wkNos = [] }) => {
    const all = [];
    const seen = new Map();
    const take = (items) => {
      const ws = (window.reviewWordsOf && window.reviewWordsOf(items)) || [];
      ws.forEach(x => {
        const k = String(x.term || '').toLowerCase().trim();
        if (!k || seen.has(k)) return;
        seen.set(k, true);
        all.push(x);
      });
    };
    if (wkNos.length) {
      wkNos.forEach(no => {
        const wid = askFindWeek(no) || ((weeksRef.current[weekId] && askWeekNo(weekId) === no) ? weekId : '');
        const w = weeksRef.current[wid] || null;
        if (!w) return;
        Object.keys(w.items || {}).forEach(cid => take(w.items[cid] || []));
      });
    }
    groups.forEach(gName => {
      const found = askFindGroup(gName);
      if (found) take(found.items);
    });
    return all;
  };

  // v294: 沿用題目到其他週——深拷貝一份（各週獨立；進度分開算，因 key = weekId_itemId）。
  // 只帶內容，不自動設為作業（老師到目標週再用 📌 指派）。
  const handleCopyItemToWeeks = (catId, item, targetWeekIds) => {
    if (!item || !targetWeekIds || !targetWeekIds.length) return;
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    let copied = 0;
    targetWeekIds.forEach(tw => {
      if (!w[tw]) return; // 只沿用到已存在的週
      if (!w[tw].items) w[tw].items = { vocab: [], grammar: [], word: [], reading: [] };
      if (!w[tw].items[catId]) w[tw].items[catId] = [];
      const taken = new Set(Object.values(w[tw].items).flat().map(it => it.id));
      let id = item.id, n = 2;
      while (taken.has(id)) { id = `${item.id}-${n}`; n++; } // 目標週內 id 撞了就換一個
      const clone = JSON.parse(JSON.stringify(item));
      clone.id = id;
      w[tw].items[catId].push(clone);
      copied++;
    });
    if (!copied) { showToast('沒有可沿用的週'); return; }
    setWeeks(w);
    saveWeeksSafe(w);
    showToast(`已沿用到 ${copied} 週 ✓`);
  };

  // v255: 所有題型完成時刷新大廳進度（saveQuizModeCompletion 會呼叫）
  window._bumpQmProgress = () => setQmProgressVersion(v => v + 1);

  // ── Quiz complete handler (streak + XP + badges) ────────
  window._onQuizComplete = async (score, total, wrongList, meta = {}) => {
    const u = window._currentUser;
    setQmProgressVersion(v => v + 1);

    // ── Local streak (works without login) ──
    const localResult = updateLocalStreak();
    setLocalStreak({ count: localResult.count });
    if (localResult.isNew) {
      if (window.playSound) window.playSound('streak');
      setStreakToast({ count: localResult.count });
      setTimeout(() => setStreakToast(null), 3200);
    }

    if (!u) return;
    // Update streak (Firestore — feeds the streak count shown to logged-in students)
    const { isNew } = await window.updateStreak(u.uid);
    if (isNew) window.playSound('streak');
    // Save wrong answers into the mistakes notebook
    if (meta.itemId && window.saveQuizMistakes) {
      await window.saveQuizMistakes(u.uid, u.displayName || '', u.email || '', meta.itemId, wrongList || []);
    }
  };


  // ── Grade selector handler ─────────────────────────────
  // 專屬年級記憶「跟著帳號走」：每個 Google 帳號一把 key（訪客用共用 key）
  const homeGradeKey = () => (user && user.uid) ? ('alan-home-grade:' + user.uid) : 'alan-home-grade';
  const readHomeGrade = () => {
    try { return localStorage.getItem(homeGradeKey()); } catch(e) { return null; }
  };

  // 只切資料，不動「已進入」狀態（門口頁 / 帳號切換共用）
  const applyGradeData = (g) => {
    // Immediately load the correct grade's data so the page never
    // flashes the previous grade's content while Firestore syncs.
    const newWeeks = _gradeOf(g, { g1: window.loadWeeksG1(), g2: window.loadWeeksG2(), g4: window.loadWeeksG4(), g5: window.loadWeeksG5(), g6: window.loadWeeksG6(), g3: window.loadWeeks(), summer: (t) => window.summerApi(t).loadWeeks(), grammar: window.loadWeeksGR() });
    const newOrder = _gradeOf(g, { g1: window.loadWeekOrderG1(), g2: window.loadWeekOrderG2(), g4: window.loadWeekOrderG4(), g5: window.loadWeekOrderG5(), g6: window.loadWeekOrderG6(), g3: window.loadWeekOrder(), summer: (t) => window.summerApi(t).loadWeekOrder(), grammar: window.loadWeekOrderGR() });
    try { localStorage.setItem('alan-grade', g); } catch(e) {}
    setGrade(g);
    setWeeks(newWeeks);
    setWeekOrder(newOrder);
    /* v398：這裡本來一律用完整的 newOrder 算，但 weekIdx 是 viewOrder 的索引——
       學生的 viewOrder 會少掉「沒內容」與「已封存」的那幾週，索引就對不上了。 */
    setWeekIdx(bestWeekIdx(visibleWeekOrder(isTeacherRef.current, newOrder, newWeeks), newWeeks));
    setOpenCat('vocab');
    setCatView(null);
    setPageKey(k => k + 1); // force .page remount → replay fade-in
    scrollPageToTop();
  };

  const handleSelectGrade = (g) => {
    /* v399: 有綁定就一律以綁定為準（防呆——正常情況下畫面上根本不會出現別的年級）。
       只擋「年級教室」與「暑假」這兩種；五大時態（gr）是跨年級的常設題庫，不屬於任何一班，
       之後對學生開放時不能被綁定擋在門外。 */
    const gradeLike = /^g\d$/.test(g) || !!(window.isSummerTrack && window.isSummerTrack(g));
    const target = (boundGrade && gradeLike) ? boundGrade : g;
    applyGradeData(target);
    // 記住這個帳號的專屬年級（暑假/題庫不算）；標記本 session 已進入
    if (/^g\d$/.test(target)) { try { localStorage.setItem(homeGradeKey(), target); } catch(e) {} }
    setEntered(true);
    try { sessionStorage.setItem('alan-entered', '1'); } catch(e) {}
  };

  /* v399：把「現在在哪一班」拉回綁定的年級。會走到這裡的三種情況：
     ① 升年級（去年選過 G2、今年學號算出來是 G3）
     ② 暑假結束還停在 ☀️ 暑假 track
     ③ 有人手動改了 localStorage
     applyGradeData 會把 grade 設成 boundGrade，effect 再跑一次就相等、自然停住。 */
  useAppEffect(() => {
    if (!boundGrade) return;
    try { localStorage.setItem(homeGradeKey(), boundGrade); } catch(e) {}
    if (grade && grade !== boundGrade
        && !(window.isGrammarTrack && window.isGrammarTrack(grade))) applyGradeData(boundGrade);
  }, [boundGrade, grade]);

  // ── 帳號切換（登入／登出／換人）→ 回門口頁、載入「這個帳號」的年級 ──
  const prevUidRef = useAppRef(undefined);
  useAppEffect(() => {
    if (!authReady) return;
    const uid = user ? user.uid : null;
    if (prevUidRef.current === undefined) { prevUidRef.current = uid; return; } // 首次解析，不重置
    if (prevUidRef.current === uid) return;
    prevUidRef.current = uid;
    setEntered(false);
    try { sessionStorage.removeItem('alan-entered'); } catch(e) {}
    setCatView(null);
    const hg = (user && !window.isAdminUser(user) && window.gradeFromEmail(user.email)) || readHomeGrade() || (user ? window.gradeFromEmail(user.email) : null);
    if (hg && /^g\d$/.test(hg)) {
      applyGradeData(hg);       // 有自己的年級 → 門口頁顯示「進入 Gx 教室」
    } else {
      try { localStorage.removeItem('alan-grade'); } catch(e) {}
      setGrade(null);           // 新帳號第一次 → 選年級
    }
  }, [authReady, user?.uid]);

  // ── 暑假進出 ───────────────────────────────────────────
  const enterSummer = () => {
    if (!hasSummerPlan) return;
    try { if (grade && !window.isSummerTrack(grade)) localStorage.setItem('alan-sem-grade', grade); } catch(e) {}
    handleSelectGrade(window.SUMMER_ME || 'sme');
  };
  const backToSemester = () => {
    let g = null;
    try { g = localStorage.getItem('alan-sem-grade'); } catch(e) {}
    if (!g) g = readHomeGrade();
    if (g && !(window.isSummerTrack && window.isSummerTrack(g))) {
      handleSelectGrade(g);
    } else {
      // 不知道原本年級 → 回到選年級畫面
      try { localStorage.removeItem('alan-grade'); } catch(e) {}
      setGrade(null);
      setCatView(null);
      scrollPageToTop();
    }
  };

  // ── Determine what to render under the loading overlay ──────────────
  // LoadingScreen MUST stay in one fixed tree-position (Fragment child #1)
  // so React never unmounts/remounts it — that would reset its CSS animations.
  // All "early return" logic is folded into appContent below.
  let appContent = null;
  if (authReady) {
    if (viewLanding) {
      // "回首頁" from inside the app — show the landing again, with a way back.
      appContent = (
        <window.LoginScreen
          onLogin={() => { loginFromLandingRef.current = true; window.signInWithGoogle(); }}
          onSkip={() => {
            try { sessionStorage.setItem('alan-guest', '1'); } catch(e) {}
            setSkippedLogin(true);
            setEntered(false);
            try { sessionStorage.removeItem('alan-entered'); } catch(e) {}
            setViewLanding(false);
          }}
          onBack={(grade || skippedLogin || user) ? () => runWave(() => setViewLanding(false)) : null}
          loggedIn={!!user}
          userName={user ? (_englishName(user.displayName) || user.displayName || null) : null}
          onLogout={user ? () => { if (confirm('要登出嗎？')) signOutWithFarewell(() => setViewLanding(false)); } : null}
        />
      );
    } else if (accessLocked && !isTeacher) {
      appContent = (
        <window.LockScreen
          user={user}
          onLogin={() => window.signInWithGoogle()}
          onLogout={() => {
            window.signOutUser();
            try { sessionStorage.removeItem('alan-guest'); } catch(e) {}
            setSkippedLogin(false);
            setAccessLocked(false);
          }}
        />
      );
    } else if (!user && !skippedLogin) {
      appContent = (
        <window.LoginScreen
          key={pageKey}
          onLogin={() => { loginFromLandingRef.current = true; window.signInWithGoogle(); }}
          onSkip={() => {
            try { sessionStorage.setItem('alan-guest', '1'); } catch(e) {}
            setSkippedLogin(true);
            // 「先逛逛」一律先到門口頁
            setEntered(false);
            try { sessionStorage.removeItem('alan-entered'); } catch(e) {}
          }}
        />
      );
    } else if (!grade || !entered) {
      // 門口頁：第一次選年級；之後每次開啟顯示「進入教室／暑假專區」
      // 年級記憶跟著帳號走（共用電腦的手足各自獨立）
      // 學校帳號（leNN…）自動判定年級 → 新同學第一次登入就直接看到自己的教室卡
      const homeGrade = boundGrade || readHomeGrade() || (user ? window.gradeFromEmail(user.email) : null);
      appContent = (
        <window.GradeSelector
          key={pageKey}
          onSelect={(g) => runWave(() => handleSelectGrade(g))}
          homeGrade={homeGrade}
          who={user ? _englishName(user.displayName) : null}
          summerOnly={summerOnlyDoor && !isTeacher && hasSummerPlan}
          onOpenAdmin={isTeacher ? () => setDashOpen(true) : null}
          onChangeGrade={(g) => {
            // 換年級 → 回門口頁（教室卡換成新年級），不直接進教室（太突兀）
            applyGradeData(g); // 會 bump pageKey → 門口頁 remount、進場動畫重播
            if (/^g\d$/.test(g)) { try { localStorage.setItem(homeGradeKey(), g); } catch(e) {} }
            // 保險：不管從哪條路進來換年級（logo／年級章），都不能殘留「已進入」
            setEntered(false);
            try { sessionStorage.removeItem('alan-entered'); } catch(e) {}
          }}
          /* v399（開學）：暑假入口從學生端收起來——開學後門口頁只留自己的教室。
             老師端保留「暑假題庫」（要回去看／改暑假的內容）。
             ⚠ 只是不顯示入口，暑假的資料完全沒動。 */
          summer={isTeacher ? { lib: true, mine: hasSummerPlan, who: summerWho, prog: doorSummerProg }
                : (summerOnlyDoor && hasSummerPlan) ? { lib: false, mine: true, who: summerWho, prog: doorSummerProg }
                : null}
          lockedGrade={!!boundGrade}
          onViewLanding={() => runWave(() => setViewLanding(true))}
          onLogout={user ? () => { if (confirm('要換帳號嗎？')) signOutWithFarewell(); } : null}
          onOpenGuide={homeGrade ? () => {
            // 門口頁「新手教學」→ 直接進自己的教室跑實境導覽
            // （還沒選過年級的人選完年級本來就會自動看到導覽，不顯示此連結）
            handleSelectGrade(homeGrade);
            setTimeout(() => setTourOpen(true), 400); // 等 scrollPageToTop / 進場落定
          } : null}
        />
      );
    }
  }

  // If authReady + grade, fall through to render the full .page below.
  // appContent stays null in that case.

  // Count wrong questions for the header badge (simple sum, no dedup needed for the count)
  const mistakesCount = useAppMemo(() => {
    let n = 0;
    Object.values(myProgressItems).forEach(p => { n += (p?.wrongQuestions?.length || 0); });
    return n;
  }, [myProgressItems]);

  // ── Single return — LoadingScreen always at the same Fragment position ──
  // IMPORTANT: LoadingScreen must never change its tree position between renders.
  // If it does, React unmounts+remounts it and the CSS animations reset.
  // Solution: one Fragment, appContent slot first, LoadingScreen always last.
  return (
    <React.Fragment>
      {/* v301: 登出過場——柔和淡入的「期待下次見面」，約 1 秒後才真的登出 */}
      {farewell && (
        <div className="app-farewell" role="status" aria-live="polite">
          <div className="app-farewell-in">
            {/* v402（Alan）：原本是一隻 👋 emoji，改成「小朋友自己挑的那隻夥伴」
                來道別。components-fx.jsx 比 app.jsx 晚載入，但這裡是執行時才畫，
                所以拿得到；真的拿不到（例如特效層掛掉）就退回原本的 👋。 */}
            <div className="app-farewell-wave" aria-hidden="true">
              {(() => {
                try {
                  const P = window.mxPetOf && window.mxPetOf(window.mxGetPet());
                  if (P && P.art) { const Art = P.art; return <Art size={66}/>; }
                } catch (e) {}
                return '👋';
              })()}
            </div>
            <div className="app-farewell-title">期待下次見面</div>
            <div className="app-farewell-sub">正在登出…</div>
          </div>
        </div>
      )}
      {/* App content — null while loading, then login/grade/main as auth resolves */}
      {appContent ? appContent : (authReady && grade && (
        <div key={pageKey} className={`page${!catView && !editMode ? ' page-lobby' : ''}${catView && !editMode ? ' page-mission' : ''}${isSummer ? ' page-summer' : ''}`}>
          <window.Header
            week={week}
            weekOrder={viewOrder}
            weekIdx={weekIdx}
            onHome={() => {
              // v302: 品牌 logo 一律直接回「首頁封面」（Alan 指定）——不再回門口頁
              setCatView(null);
              setOpenCat(null);
              runWave(() => setViewLanding(true));
            }}
            onPrevWeek={goPrevWeek}
            onNextWeek={goNextWeek}
            weeks={weeks}
            onGoWeek={goWeekId}
            canEdit={isTeacher}
            editMode={editMode}
            onToggleEdit={() => setEditMode(e => !e)}
            onAddWeek={() => setWeekModalOpen(true)}
            onTermSetup={(window.isSummerTrack && window.isSummerTrack(grade)) || (window.isGrammarTrack && window.isGrammarTrack(grade)) ? null : () => setTermOpen(true)}
            onQuickSet={() => setQuickSetOpen(true)}
            onAsk={window.AskPanel ? () => setAskOpen(true) : null}   /* 💬 v517 */
            onGrammarGen={(window.isGrammarTrack && window.isGrammarTrack(grade)) ? () => setGrGenOpen(true) : null}
            onReadingGen={(window.isGrammarTrack && window.isGrammarTrack(grade)) ? null : () => setRcGenOpen(true)}
            onGrammarNotes={(window.isGrammarTrack && window.isGrammarTrack(grade)) ? null : () => setGnGenOpen(true)}
            /* 📸 v516：拍考卷 → 互動版 */
            onExamScan={window.ExamScanModal ? () => setExamScanOpen(true) : null}
            onExamDraft={window.ExamDraftModal ? () => setExamDraft({ brief: '' }) : null}
            onWordStudy={(window.isGrammarTrack && window.isGrammarTrack(grade)) ? null : () => setWsGenOpen(true)}
            pace={paceWeek}
            nextF={paceNextF}
            onPacing={/^g[1-6]$/.test(String(grade)) ? () => setPaceOpen(true) : null}
            /* 📝 v513：formative 那兩塊點下去＝考前複習包 */
            onExamPrep={(pacing && window.ExamPrepModal) ? (sd => setExamSide(sd)) : null}
            onDeleteWeek={handleDeleteWeek}
            onArchiveWeek={handleArchiveWeek}
            onExport={() => setExportOpen(true)}
            weekArchived={weekArchived(weeks[weekId])}
            progress={{done: totalDone, total: totalItems}}
            user={user}
            onLogin={() => window.signInWithGoogle()}
            onLogout={() => {
              if (confirm('要登出嗎？')) {
                signOutWithFarewell(() => { setCatView(null); setEntered(false); });
              }
            }}
            onShowDashboard={() => setDashOpen(true)}
            streak={localStreak.count > 0 ? localStreak : (user ? userProfile.streak : localStreak)}
            onEditWeek={() => setWeekEditOpen(true)}
            mistakesCount={mistakesCount}
            onShowMistakes={user ? () => setMistakesOpen(true) : null}
            grade={grade}
            compactLobby={!catView && !editMode}
            starBalance={starsTotal}
            onShowCheckin={user && !(window.isAdminUser && window.isAdminUser(user)) ? () => setCheckinOpen(true) : null}
            checkinDone={!!(window.computeCheckin && window.computeCheckin(myCheckin).signedToday)}
            checkinStreak={(window.computeCheckin ? window.computeCheckin(myCheckin).streak : 0)}
            onShowStars={() => setStarsOpen(true)}
            /* v399：年級由學號綁定的學生，右上角的年級章只是一個標籤，不能點去換班。 */
            onSwitchGrade={boundGrade ? null : () => runWave(() => {
              try { localStorage.removeItem('alan-grade'); } catch(e) {}
              setGrade(null);
              setCatView(null);
              // 跟 logo 一樣要清「已進入」——否則從門口改選年級會直接跳進教室
              setEntered(false);
              try { sessionStorage.removeItem('alan-entered'); } catch(e) {}
              scrollPageToTop();
            })}
          />

          {/* v249: 首頁深海幽靈字延伸到教室（極淡、靜態，不干擾練習） */}
          {!catView && !editMode && (
            <div className="lobby-deep" aria-hidden="true">
              <span className="deep-lite dl-a">Aa</span>
              <span className="deep-lite dl-c">✓</span>
            </div>
          )}

          {/* ── QUIZ MODE ── */}
          <div key={weekId} className={slideDir ? `week-slide-${slideDir}` : ''}>
          {catView ? (
            <window.QuizModeCategoryView
              key={`${catView.id}-${weekId}`}   /* v360: 換週次時重新掛載，才會吃到新那一週的單元 */
              cat={catView}
              initialItemId={catView.itemId || null}
              items={(week.items || {})[catView.id] || []}
              weekId={weekId}
              cloudProg={qmProgress}
              onBack={() => {
                // v341: 剛剛是去補做舊週次的作業 → 返回時回到原本那一週
                if (returnWeekRef.current != null) { setWeekIdx(returnWeekRef.current); returnWeekRef.current = null; }
                setCatView(null); setMainKey(k => k + 1); scrollPageToTop();
              }}
              editMode={editMode}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onMoveItem={(itemId, dir) => handleMoveItem(catView.id, itemId, dir)}
              onReorderItems={(ids) => handleReorderItems(catView.id, ids)}
              weekAllItems={weekAllItems}
              onAutoLinkFlashcards={() => handleAutoLinkFlashcards(catView.id)}
              groupRes={(week && week.groupRes) || {}}
              onSaveGroupRes={(g, patch) => handleSaveGroupRes(catView.id, g, patch)}
              openAssignFor={assignAfterSave}
              onAssignOpened={() => setAssignAfterSave(null)}
              weekChoices={weekOrder.filter(id => id !== weekId).map(id => ({
                id,
                label: (weeks[id] && (weeks[id].label || weeks[id].id)) || id,
                sub: weeks[id] ? [weeks[id].dateRange, weeks[id].theme].filter(Boolean).join(' · ') : '',
              }))}
              onCopyToWeeks={(item, targetIds) => handleCopyItemToWeeks(catView.id, item, targetIds)}
              onCopyGroupToWeeks={(items, targetIds, due, move) => handleCopyGroupToWeeks(catView.id, items, targetIds, due, move)}
              /* 🔴 v474（Alan：「這份很明顯就是單字，幹嘛還要選？」
                     「選完之後我還要再貼一次單字？這太笨了，因為我本來就有單字了啊」）：
                 看得出這一組在教什麼，就直接開那一個生成視窗，而且把現成的內容先填好。
                 ⚠ 真的認不出來才退回「要出哪一種」那個選單。 */
              onDeleteGroup={(gName, gItems) => handleDeleteItems((gItems || []).map(it => it.id))}
              onRenameGroup={(gName, newName) => handleRenameGroup(catView.id, gName, newName)}
              onRegenGroup={(catId, name, gItems) => {
                const ws = (window.reviewWordsOf && window.reviewWordsOf(gItems)) || [];
                if (ws.length >= 2) {
                  // 單字組：單字表照 QuickSetModal 吃的格式組回去（英文 - 中文 - 例句 - 英文定義）
                  const text = ws.map(x => [x.term, x.zh, x.example, x.def].filter(Boolean).join(' - ')).join('\n');
                  /* v475（Alan：「我只是這一組忘記生成哪一個，不應該全部重刪掉再生成一次」）：
                     已經有的題型先取消勾選，預設只補還沒有的。
                     ⚠ 圖片沒辦法用文字帶（單字表是純文字），所以另外給一張「單字→圖片」對照表，
                       解析完再貼回去——不然補出來的單字卡又是白的。 */
                  const imgs = {};
                  ws.forEach(x => { if (x.imageUrl) imgs[String(x.term).toLowerCase()] = x.imageUrl; });
                  setRegenFor({ catId, name, pick: false, text, images: imgs,
                                have: (window.qsKindsInGroup && window.qsKindsInGroup(gItems)) || [] });
                  setQuickSetOpen(true);
                  return;
                }
                const gm = (window.reviewGrammarOf && window.reviewGrammarOf(gItems)) || null;
                if (gm) {
                  setRegenFor({ catId, name, pick: false, text: gm.notes || '' });
                  setGnGenOpen(true);
                  return;
                }
                setRegenFor({ catId, name, pick: true });
              }}
              onReviewGroup={(catId, name, gItems) => setReviewFor({ catId, name, items: gItems })}
              onSetHomeworkMany={handleSetHomeworkMany}
              homework={week.homework || {}}
              onSetHomework={handleSetHomework}
              weekQuizItems={weekQuizItems}
              getNextTask={getNextTask}
              onOpenTask={(cat, itemId) => { setCatView({ ...cat, itemId }); scrollPageToTop(); }}
            />
          ) : (
            <div key={mainKey} className="shell main-enter">
              {/* v254: 明確的「上一頁」——小朋友不用知道要點 logo 才能回門口 */}
              {!editMode && (
                <button
                  className="lobby-back"
                  onClick={() => runWave(() => {
                    setCatView(null);
                    setOpenCat(null);
                    setEntered(false);
                    try { sessionStorage.removeItem('alan-entered'); } catch(e) {}
                    scrollPageToTop();
                  })}
                ><span aria-hidden="true">←</span>上一頁</button>
              )}
              {/* v234: 暑假進出改由門口頁引導（呼吸箭頭＋開學標註），大廳橫幅移除 */}
              {!editMode && (isTeacher || viewOrder.length > 0) && (
                <window.WeekHero
                  week={week}
                  weekIdx={weekIdx}
                  weekOrder={viewOrder}
                  done={totalDone}
                  total={totalItems}
                  who={isSummer && !isSummerLib ? summerWho : null}
                  onPrevWeek={goPrevWeek}
                  onNextWeek={goNextWeek}
                  weeks={weeks}
                  onGoWeek={goWeekId}
                  weekAvg={weekAvgScore}
                  onOpenGrowth={() => setGrowthOpen(true)}
                />
              )}
              {/* v269: 還有未完成任務時，一個呼吸的金色箭頭輕輕指向任務清單（全做完就消失） */}
              {!editMode && !isSummerLib && getNextTask(null) && (
                <div className="wh-task-cue" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 9l7 7 7-7"/>
                  </svg>
                </div>
              )}
              {editMode ? (
                <window.WeeklyContactBook
                  week={week}
                  allItems={allItems}
                  qmProg={qmProgress}
                  weekId={weekId}
                  categories={activeCategories}
                  onEnterCat={(cat) => { setCatView(cat); scrollPageToTop(); }}
                  editMode={editMode}
                  onUpdateWeek={(patch) => {
                    const w = JSON.parse(JSON.stringify(weeksRef.current));
                    if (!w[weekId]) return;
                    w[weekId] = { ...w[weekId], ...patch };
                    setWeeks(w);
                    saveWeeksSafe(w);
                  }}
                />
              ) : isSummerLib ? (
                /* v317 (#6): Alan 要求移除「📌 題庫模式」說明卡（不必要）。 */
                null
              ) : (!isTeacher && viewOrder.length === 0) ? null : (
                <window.TodayTasks
                  week={week}
                  allItems={allItems}
                  qmProg={qmProgress}
                  weekId={weekId}
                  categories={activeCategories}
                  onOpenTask={(cat, itemId) => { setCatView({ ...cat, itemId }); scrollPageToTop(); }}
                  /* v340: 之前週次沒完成的作業也要看得到（不然週次一過就「作業不見了」） */
                  weeks={weeks}
                  weekOrder={viewOrder}
                  onOpenPastTask={(wid, cat, itemId) => {
                    const idx = viewOrder.indexOf(wid);
                    if (idx >= 0 && idx !== weekIdx) {
                      returnWeekRef.current = weekIdx;   // 記住原本這一週，補完就回來
                      setWeekIdx(idx);
                    }
                    setCatView({ ...cat, itemId });
                    scrollPageToTop();
                  }}
                />
              )}
              {/* v319: Alan 選「先移除加強複習功能」——大廳不放複習區、header 也拿掉 📕（見 components-shell）。
                  錯題資料照常收集、MistakesPanel/ReviewFlashcardModal 元件都留著＝之後想加回很快。
                  星號複習改由單字卡的「⭐ 星號單字」分頁（v318）提供。 */}
              {(!isTeacher && viewOrder.length === 0) ? (
                /* v377: 這個年級一週內容都還沒有 → 講清楚，不要顯示一排空白週次 */
                <div className="week-empty">
                  <div className="week-empty-ico">📚</div>
                  <div className="week-empty-title">老師正在準備這個年級的內容</div>
                  <div className="week-empty-sub">課程一放上來，這裡就會出現本週要練的東西。</div>
                  <button className="qm-btn secondary" onClick={() => runWave(() => setViewLanding(true))}>← 回首頁</button>
                </div>
              ) : (
              <window.QuizModeBlocks
                week={week}
                weekId={weekId}
                cloudProg={qmProgress}
                /* v505：v464 的「可以先複習上一週」Alan 要求拿掉，這條路一起收掉 */
                onEnterCat={(cat) => { setCatView(cat); scrollPageToTop(); }}
                editMode={editMode}
                categories={activeCategories}
                onUpdateWeek={(patch) => {
                  const w = JSON.parse(JSON.stringify(weeksRef.current));
                  if (!w[weekId]) return;
                  w[weekId] = { ...w[weekId], ...patch };
                  setWeeks(w);
                  saveWeeksSafe(w);
                }}
                onAddItem={handleAddItem}
              />
              )}
              {!editMode && viewOrder.length > 0 && (
                <div className="growth-summary-row">
                  {/* v499（Alan：「然後家長也可以同步看到」）：家長在家用的就是孩子的帳號 */}
                  {!editMode && user && window.TeacherLog && <window.TeacherLog email={String(user.email || '').toLowerCase()}/>}
                  <window.GrowthInlineCard
                    weeks={weeks}
                    weekOrder={viewOrder}
                    qmProg={qmProgress}
                    categories={activeCategories}
                    isSummer={isSummer}
                    onOpen={() => setGrowthOpen(true)}
                  />
                  <window.WeekSummaryTiles
                    done={totalDone}
                    total={totalItems}
                    avg={weekAvgScore}
                    streak={localStreak.count || (user && userProfile.streak ? userProfile.streak.count : 0)}
                  />
                </div>
              )}
            </div>
          )}
          </div>{/* end week-slide wrapper */}

          {(!catView || editMode) && <window.Footer onOpenGuide={() => setTourOpen(true)}/>}

          {/* ══ 💬 v532：小助手常駐在右下角（Alan：「不需要再按編輯再開起來」）══
              ⚠ 只有老師看得到——學生不該有「幫我出一份考卷」這種入口。
              ⚠ 面板打開時就把它收起來（.ask-wrap 本來就釘在同一個角落，
                不收的話按鈕會從面板底下露出一角）。
              ⭐ 13 個生成視窗本來就各自獨立 render（靠自己的 open 控制），
                所以從這裡叫得動，不用先進編輯模式。 */}
          {isTeacher && window.AskPanel && !askOpen && (
            <button className={'ask-fab' + ((catView || editMode) ? ' with-nav' : '')}
              onClick={() => setAskOpen(true)}
              title="跟小助手說一句話" aria-label="跟小助手說一句話">
              <span className="ask-fab-ico" aria-hidden="true">💬</span>
              <span className="ask-fab-txt">小助手</span>
            </button>
          )}

          {(catView || editMode) && (
            <window.MobileNav
              week={week}
              weekIdx={weekIdx}
              weekOrder={viewOrder}
              onPrevWeek={goPrevWeek}
              onNextWeek={goNextWeek}
              weeks={weeks}
              onGoWeek={goWeekId}
              catView={catView}
              onBackFromCat={() => { setCatView(null); scrollPageToTop(); }}
              user={user}
            />
          )}

          <window.EditorModal
            open={editorOpen}
            draft={editorDraft}
            weekId={weekId}
            catItems={editorCat ? (week.items[editorCat] || []) : []}
            weekItems={weekAllItems}
            groupOptions={editorGroups}
            onClose={() => setEditorOpen(false)}
            onSave={handleSaveItem}
            onDelete={handleDeleteItem}
          />

          <window.WeekModal
            open={weekModalOpen}
            existingIds={weekOrder}
            onClose={() => setWeekModalOpen(false)}
            onSave={handleAddWeek}
          />
          <window.GrammarGenModal
            open={grGenOpen}
            defaultTense={openCat && /^t[1-5]$/.test(openCat) ? openCat : 't1'}
            onClose={() => setGrGenOpen(false)}
            onCreate={handleGrammarCreate}
          />
          {window.PacingImportModal && <window.PacingImportModal
            open={paceOpen}
            gradeKey={grade}
            gradeName={String(grade).toUpperCase()}
            existing={pacing}
            onClose={() => setPaceOpen(false)}
            onSave={async (g, weeks) => { await window.savePacing(g, weeks); showToast(`🏫 學校進度表已存（${weeks.length} 週）`); }}
          />}
          {window.WordStudyModal && <window.WordStudyModal
            open={wsGenOpen}
            categories={activeCategories}
            defaultGrade={/^g[1-6]$/.test(String(grade)) ? grade : 'g4'}
            perStudent={!!(window.isSummerTrack && window.isSummerTrack(grade))}
            roster={qsRoster}
            defaultCat={openCat || (activeCategories.find(c => c.id === 'word') ? 'word' : (activeCategories[0] && activeCategories[0].id)) || 'word'}
            /* v493：學校這週的 Word Study 主題先填好（例 W7 ＝ Prefixes mis-, en-, & em-）。
               Alan 本來要自己開 Excel 查再手打，打錯週次就白生一次。 */
            defaultTopic={askTopic || (paceWeek && paceWeek.it.wordStudy) || ''}   /* v517：💬 講的主題最優先 */
            onClose={() => { setWsGenOpen(false); setAskTopic(''); }}
            onCreate={handleWordStudy}
          />}
          {window.GrammarNotesModal && <window.GrammarNotesModal
            open={gnGenOpen}
            categories={activeCategories}
            defaultGrade={/^g[1-6]$/.test(String(grade)) ? grade : 'g4'}
            perStudent={!!(window.isSummerTrack && window.isSummerTrack(grade))}
            roster={qsRoster}
            defaultCat={(regenFor && regenFor.catId) || openCat || (activeCategories.find(c => c.id === 'grammar') ? 'grammar' : (activeCategories[0] && activeCategories[0].id)) || 'grammar'}
            defaultTitle={(askText && askText.title) || (regenFor ? regenFor.name : '')}
            /* v474：原本的教學重點先填好／v493：沒有的話用學校這週的文法主題。
               ⚠ 用 grammarHw 不是 grammar——上 Writing Activity 那週，
                 要練的是沿用過來的那個文法主題（Alan 親自講解的規則）。 */
            defaultText={(askText && askText.text) || (regenFor && regenFor.text) || (paceWeek && paceWeek.lt.grammarHw) || ''}   /* v517：💬 貼的最優先 */
            onClose={() => { setGnGenOpen(false); setRegenFor(null); setAskText(null); }}
            onCreate={handleGrammarNotesCreate}
          />}
          <window.ReadingGenModal
            open={rcGenOpen}
            categories={activeCategories}
            perStudent={!!(window.isSummerTrack && window.isSummerTrack(grade))}
            roster={qsRoster}
            defaultCat={(regenFor && regenFor.catId) || openCat || (activeCategories.find(c => c.id === 'reading') ? 'reading' : (activeCategories[0] && activeCategories[0].id)) || 'reading'}
            defaultTitle={(askText && askText.title) || (regenFor ? regenFor.name : '')}
            /* v517：💬 直接貼一篇文章進來就能出閱讀理解（本來只能在視窗裡貼） */
            defaultText={(askText && askText.text) || ''}
            onClose={() => { setRcGenOpen(false); setRegenFor(null); setAskText(null); }}
            onCreate={handleReadingCreate}
          />
          {/* 💬 v517：用講的就好——聽懂之後打開現成的那個視窗並填好 */}
          {window.AskPanel && (
            <window.AskPanel
              open={askOpen}
              categories={activeCategories}
              roster={askRoster}
              grade={grade}
              onClose={() => setAskOpen(false)}
              onRun={runAskPlan}
              onGenerate={askGenerate}
              onSave={(items, plan, dueDate) => {
                const cat = openCat
                  || (plan.intent === 'reading' && activeCategories.find(c => c.id === 'reading') ? 'reading' : '')
                  || (plan.intent === 'exam' && activeCategories.find(c => c.id === 'mock') ? 'mock' : '')
                  || (plan.intent === 'vocab' && plan.side === 'lt' && activeCategories.find(c => c.id === 'ltvocab') ? 'ltvocab' : '')
                  || (activeCategories[0] && activeCategories[0].id) || 'vocab';
                handleAddBuiltItems(items, cat, dueDate);
              }}
            />
          )}

          {/* 📸 v516：拍考卷照片 → 一份有配分的互動考卷 */}
          {window.ExamScanModal && (
            <window.ExamScanModal
              open={examScanOpen}
              categories={activeCategories}
              defaultCat={activeCategories.find(c => c.id === 'mock') ? 'mock' : (openCat || 'reading')}
              defaultGrade={grade}
              onClose={() => setExamScanOpen(false)}
              onCreate={({ _cat, ...item }) => {
                setExamScanOpen(false);
                handleAddBuiltItems([item], _cat || 'reading');
              }}
            />
          )}

          {/* 🗣 v561：跟 AI 一來一往出大考考卷 */}
          {window.ExamDraftModal && (
            <window.ExamDraftModal
              open={!!examDraft} brief={examDraft && examDraft.brief}
              categories={activeCategories}
              defaultCat={activeCategories.find(c => c.id === 'mock') ? 'mock' : (openCat || 'reading')}
              defaultGrade={grade}
              onClose={() => setExamDraft(null)}
              onCreate={({ _cat, ...item }) => {
                setExamDraft(null);
                handleAddBuiltItems([item], _cat || 'reading');
              }}
            />
          )}

          {/* 📝 v513：考前複習包——算範圍、撈字，題目交給下面的 QuickSetModal 出 */}
          {window.ExamPrepModal && (
            <window.ExamPrepModal
              open={!!examSide} side={examSide}
              pace={pacing} weeks={weeks} weekOrder={viewOrder} weekId={weekId}
              categories={activeCategories}
              onClose={() => setExamSide(null)}
              onGenerate={({ words, title }) => {
                setExamSide(null);
                /* 走「在這一組再出一份」那條既有的路：單字先填好，題型預設全開。
                   ⚠ 用 regenFor 是因為 QuickSetModal 的 defaultText／defaultTitle 都吃它。 */
                setRegenFor({ name: title, catId: 'vocab',
                  text: window.examPasteText ? window.examPasteText(words) : '' });
                setQuickSetOpen(true);
              }}
            />
          )}
          <window.QuickSetModal
            open={quickSetOpen}
            categories={activeCategories}
            perStudent={!!(window.isSummerTrack && window.isSummerTrack(grade))}
            roster={qsRoster}
            defaultCat={(regenFor && regenFor.catId) || openCat || (activeCategories[0] && activeCategories[0].id) || 'vocab'}
            defaultGrade={grade}
            defaultTitle={regenFor ? regenFor.name : ''}
            defaultText={(regenFor && regenFor.text) || ''}      /* v474：現成的單字先填好，不用再貼一次 */
            defaultImages={(regenFor && regenFor.images) || null}  /* v475：圖片照抄 */
            alreadyHave={(regenFor && regenFor.have) || null}      /* v475：已經有的題型先取消勾選 */
            onClose={() => { setQuickSetOpen(false); setRegenFor(null); }}
            onCreate={handleQuickSet}
          />
          <window.TermSetupModal
            open={termOpen}
            existingIds={weekOrder}
            gradeLabel={_gradeOf(grade, { g1: '一年級', g2: '二年級', g4: '四年級', g5: '五年級', g6: '六年級', g3: '三年級', summer: '暑假', grammar: '文法核心' })}
            prefix={_gradeOf(grade, { g1: 'g1-', g2: 'g2-', g4: 'g4-', g5: 'g5-', g6: 'g6-', g3: '', summer: 'sl-', grammar: 'gr-' })}
            categories={activeCategories}
            onClose={() => setTermOpen(false)}
            onCreate={handleCreateTerm}
          />
          <window.ExportModal
            open={exportOpen}
            weeks={weeks}
            weekOrder={weekOrder}
            onClose={() => setExportOpen(false)}
            showToast={showToast}
          />
          <window.WeekModal
            open={weekEditOpen}
            existingIds={weekOrder}
            onClose={() => setWeekEditOpen(false)}
            onSave={handleEditWeekSave}
            editWeek={{ id: weekId, label: week.label || '', dateRange: week.dateRange || '', theme: week.theme || '', themeZh: week.themeZh || '' }}
          />

          {/* v454：「在這一組再出一份題目」——先問要出哪一種，名字已經幫你填好，出來就落在同一組 */}
          {/* v461：這一個沒有輸入欄位（只是選要重出哪一種），點背景關掉不會弄丟東西 */}
          {/* v466：🔁 排一份複習到別週 */}
          {reviewFor && window.ReviewGroupModal && (
            <window.ReviewGroupModal
              open={true}
              groupName={reviewFor.name}
              catId={reviewFor.catId}
              items={reviewFor.items}
              curWeekId={weekId}
              grade={grade}
              weekChoices={viewOrder.map(id => ({
                id,
                label: (weeks[id] && (weeks[id].label || weeks[id].id)) || id,
              }))}
              onClose={() => setReviewFor(null)}
              onCreate={handleCreateReview}
            />
          )}

          {regenFor && regenFor.pick && (
            <div className="modal-backdrop" onClick={() => setRegenFor(null)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                  <h3>再出一份題目 <em>加進「{regenFor.name}」這一組</em></h3>
                  <button className="modal-close" aria-label="關閉" onClick={() => setRegenFor(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="field-help" style={{ marginBottom: 12 }}>
                    出好的單元會用同一個名字，<b>直接排在這一組底下</b>——不會變成另外一組。
                    原本的題目一題都不會動，你可以出完再把不好的刪掉。
                  </div>
                  <div className="edit-make">
                    <button className="edit-make-btn quick" onClick={() => { setRegenFor(r => ({ ...r, pick: false })); setQuickSetOpen(true); }}>
                      <span className="emk-ico">🔤</span>
                      <span className="emk-txt"><b>一鍵出單字</b><em>貼單字表 → 單字卡・測驗・配對・填空・聽寫</em></span>
                    </button>
                    <button className="edit-make-btn gn" onClick={() => { setRegenFor(r => ({ ...r, pick: false })); setGnGenOpen(true); }}>
                      <span className="emk-ico">✏️</span>
                      <span className="emk-txt"><b>一鍵出文法</b><em>上傳作業照片／貼文字 → 互動教學・選擇・填空・中翻英</em></span>
                    </button>
                    <button className="edit-make-btn rc" onClick={() => { setRegenFor(r => ({ ...r, pick: false })); setRcGenOpen(true); }}>
                      <span className="emk-ico">📖</span>
                      <span className="emk-txt"><b>一鍵出閱讀理解</b><em>貼文章 → 背景知識・選擇・簡答・閱讀技巧</em></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {toast && <div className="toast">{toast}</div>}
          {/* v447：存檔沒成功就一直掛著，不要讓老師以為存好了（他的分段閱讀就是這樣不見的） */}
          {/* v550：雲端資料 4 秒還沒回來——畫面上要講，不要讓人以為這就是最新的課程 */}
          {cloudSlow && !cloudSeen && (
            <div className="save-fail-bar cloud-slow-bar">
              <span><b>⚠ 還沒連上雲端</b>：現在看到的可能不是最新的週次與作業。</span>
              <button onClick={() => { try { location.reload(); } catch (e) {} }}>重新載入</button>
            </div>
          )}
          {saveFail && (
            <div className="save-fail-bar">
              <span><b>⚠ 剛剛那次變更沒有存進雲端</b>：{saveFail.msg}</span>
              <button onClick={() => { const w = saveFail.weeks; setSaveFail(null); saveWeeksSafe(w); }}>再存一次</button>
              <button className="ghost" onClick={() => setSaveFail(null)}>先關掉</button>
            </div>
          )}

          {mistakesOpen && user && (
            <window.MistakesPanel
              user={user}
              progressItems={myProgressItems}
              weeks={weeks}
              weekOrder={viewOrder}
              categories={activeCategories}
              fixed={myFixed}
              onClose={() => setMistakesOpen(false)}
            />
          )}

          {/* v342: 我的星星 + 商店 */}
          {starsOpen && user && (
            <window.StarsPanel user={user} onClose={() => setStarsOpen(false)}
              weeks={weeks} weekOrder={viewOrder} progItems={qmProgress} checkin={myCheckin} fixed={myFixed}
              mx={userProfile.mx} onOpenDress={() => { setStarsOpen(false); if (window.mxOpenDress) window.mxOpenDress(); }}/>
          )}
          {checkinOpen && window.CheckinPanel && (
            <window.CheckinPanel user={user} checkin={myCheckin} onClose={() => setCheckinOpen(false)}/>
          )}

          {growthOpen && (
            <window.GrowthReport
              weeks={weeks}
              weekOrder={viewOrder}
              qmProg={qmProgress}
              categories={activeCategories}
              studentName={user ? (user.displayName || '') : ''}
              onClose={() => setGrowthOpen(false)}
            />
          )}

          {reviewOpen && window.ReviewFlashcardModal && (
            <window.ReviewFlashcardModal
              words={reviewWords}
              onClose={() => setReviewOpen(false)}
            />
          )}

          {tourOpen && (
            <window.SpotlightTour
              onClose={dismissTour}
              onEmpty={() => { setTourOpen(false); setWelcomeOpen(true); }}
            />
          )}

        </div>
      ))}

      {/* 新手教學 — top-level so it can overlay the door page too (門口頁的
          「新手教學」連結、老師預覽都會用到)，不只 .page 內 */}
      {welcomeOpen && <window.WelcomeGuide onClose={dismissWelcome} />}

      {/* 老師後台 — top-level：門口頁的「老師後台」卡也能直接開 */}
      {dashOpen && isTeacher && (
        <window.TeacherDashboard
          onClose={() => runWave(() => setDashOpen(false))}
          weeks={weeks}
          weekOrder={weekOrder}
          grade={grade}
        />
      )}

      {/* v375(#7): ⭐ 慶祝動畫——本來 starBurst 這個 state 從來沒被畫出來，
          所以全站的 triggerStarBurst() 其實什麼都沒發生。補上。 */}
      {starBurst && <window.StarBurst onDone={() => setStarBurst(false)}/>}

      {/* LoadingScreen is always the LAST child of this Fragment.
          Keeping it in the same tree position prevents unmount/remount
          and preserves the CSS brand animation across re-renders. */}
      {showLoader && <window.LoadingScreen fading={loaderFading}/>}
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
