// app.jsx — Top-level state + composition

var {
  useState: useAppState,
  useEffect: useAppEffect,
  useMemo: useAppMemo,
  useRef: useAppRef
} = React;

// ── Capture G3 originals at module load (before any grade-switch overrides) ──
var _CATS_G3 = window.CATEGORIES;
var _saveWeeksG3 = window.saveWeeks;
var _saveWeekOrderG3 = window.saveWeekOrder;
var _subscribeG3 = window.subscribeToClassData;

// ── Grade helper: resolve grade-specific functions ─────────────────────────
// 暑假班表（s1–s6）也走這裡：map.summer 可以是值，或 (trackId) => 值 的函式
/* ⚠⚠ 約定：summer / grammar 這兩格如果放的是「函式」，會被當成**工廠**，
   在這裡直接以 `fn(g)` 呼叫、拿回傳值當結果（暑假那條就是靠這個依 track 取 API）。
   所以要傳「API 函式本身」時，一定要包成 `() => 那個函式`。
   v383 的災情就是這樣來的：`grammar: window.saveWeekOrderGR` 在接線當下就被呼叫，
   把 weekOrder 寫成字串 'gr'，訂閱也沒接上 → 老師建立的內容從來沒進雲端。 */
function _gradeOf(g, {
  g1,
  g2,
  g4,
  g5,
  g6,
  g3,
  summer,
  grammar
}) {
  // v381: 五大時態核心題庫是獨立的一條 track（跟暑假一樣），不屬於任何年級
  if (grammar !== undefined && window.isGrammarTrack && window.isGrammarTrack(g)) {
    return typeof grammar === 'function' ? grammar(g) : grammar;
  }
  if (summer !== undefined && window.isSummerTrack && window.isSummerTrack(g)) {
    return typeof summer === 'function' ? summer(g) : summer;
  }
  if (g === 'g1' && g1 !== undefined) return g1; // v399: 新增一年級
  if (g === 'g2') return g2;
  if (g === 'g4' && g4 !== undefined) return g4;
  if (g === 'g5') return g5;
  if (g === 'g6' && g6 !== undefined) return g6;
  return g3;
}

// Parse "May 17 – May 23" → { start: Date, end: Date } using the given year.
function parseDateRange(str, year) {
  var MONTHS = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
  };
  if (!str) return null;
  var parts = str.split(/\s*[–—-]\s*/);
  if (parts.length < 2) return null;
  function parse(s, fallbackMonth) {
    var m = s.trim().match(/([A-Za-z]+)\s+(\d+)/);
    if (m && MONTHS[m[1]] !== undefined) return new Date(year, MONTHS[m[1]], +m[2]);
    var n = s.trim().match(/(\d+)/);
    if (n && fallbackMonth !== undefined) return new Date(year, fallbackMonth, +n[1]);
    return null;
  }
  var start = parse(parts[0]);
  if (!start) return null;
  var end = parse(parts[1], start.getMonth());
  if (!end) return null;
  // v377: 跨年的一週（例 "Dec 28 – Jan 3"）結束日要算成隔年，否則 end < start 永遠對不上
  if (end < start) end.setFullYear(end.getFullYear() + 1);
  return {
    start,
    end
  };
}

// Find the best weekIdx: today within dateRange → latest past week → last week.
/* v377: 週次上有真正的日期（startISO/endISO）就用它——最準。
   舊的週次沒有這兩個欄位，才退回去解析 dateRange 文字。 */
function weekRangeOf(w, id, today) {
  if (w && w.startISO && w.endISO) {
    var a = new Date(w.startISO + 'T00:00:00'),
      b = new Date(w.endISO + 'T23:59:59');
    if (!isNaN(a) && !isNaN(b)) return {
      start: a,
      end: b
    };
  }
  if (!w || !w.dateRange) return null;
  var m = String(id).match(/(\d{4})/);
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
function visibleWeekOrder(isTeacher, order, weeks) {
  if (isTeacher) return order || [];
  return (order || []).filter(id => {
    var w = weeks && weeks[id];
    if (!w || w.archived) return false;
    return !!w.items && Object.keys(w.items).some(k => Array.isArray(w.items[k]) && w.items[k].length > 0);
  });
}
function bestWeekIdx(order, weeks) {
  if (!order || order.length === 0) return 0;
  var today = new Date();
  today.setHours(12, 0, 0, 0);
  for (var i = 0; i < order.length; i++) {
    var w = weeks[order[i]];
    if (!w || !w.dateRange) continue;
    var range = weekRangeOf(w, order[i], today);
    if (!range) continue;
    range.end.setHours(23, 59, 59, 999);
    if (today >= range.start && today <= range.end) return i;
  }

  // No exact match — latest week whose start is on or before today
  var best = -1,
    anyRange = false;
  for (var _i = 0; _i < order.length; _i++) {
    var _w = weeks[order[_i]];
    if (!_w || !_w.dateRange) continue;
    var _range = weekRangeOf(_w, order[_i], today);
    if (!_range) continue;
    anyRange = true;
    if (_range.start <= today) best = _i;
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
var TERM_START = new Date(2026, 7, 31); // 2026-08-31 開學
/* v392: 本來這裡是 `const SUMMER_ONLY_DOOR = new Date() < TERM_START;`——模組頂層常數，
   只在 JS 首次執行時算一次。但 manifest 是 standalone，學生把 app 加到主畫面後
   多半只是「切出去再切回來」（背景喚醒），不會重新執行模組：8/30 晚上開著、
   8/31 早上切回來的人，門口頁仍停在暑假限定，進不去新學期教室。
   → 改成在 render 時才算（見 App 裡的 summerOnlyDoor / nowTick）。 */

function App() {
  // ── Auth state ──────────────────────────────────────────
  var [user, setUser] = useAppState(null);
  var [adminVer, setAdminVer] = useAppState(0); // v337: 管理者狀態解析後觸發重繪
  var [starBalance, setStarBalance] = useAppState(0); // v342: 集點——老師手動給/扣的那些
  var [starsOpen, setStarsOpen] = useAppState(false); // v342: 星星／商店面板
  var [authReady, setAuthReady] = useAppState(false); // show loading until Firebase resolves
  // v322: 暑假派發清單是否已載入。登入的學生要等它回來才揭曉門口頁，否則載入畫面會在
  // 暑假資料回來前就淡出→先閃過 G1~G6 選年級畫面(~0.5s)再跳回暑假入口（Alan 回報的 bug）。
  var [summerMetaReady, setSummerMetaReady] = useAppState(false);
  var [skippedLogin, setSkippedLogin] = useAppState(() => {
    try {
      return !!sessionStorage.getItem('alan-guest');
    } catch (e) {
      return false;
    }
  });
  var [dashOpen, setDashOpen] = useAppState(false);

  // ── Grade state ─────────────────────────────────────────
  var [grade, setGrade] = useAppState(() => {
    try {
      return localStorage.getItem('alan-grade') || null;
    } catch (e) {
      return null;
    }
  });
  // 門口頁：每次開啟 app（新 session）都先讓學生選「進入教室」或「暑假專區」
  var [entered, setEntered] = useAppState(() => {
    try {
      return sessionStorage.getItem('alan-entered') === '1';
    } catch (e) {
      return false;
    }
  });

  /* v392: 「現在幾點」的心跳。app 加到主畫面後常常是背景喚醒（不重新執行 JS），
     所以每次畫面重新可見就 +1，逼所有「跟今天日期有關」的判斷重算一次。 */
  var [nowTick, setNowTick] = useAppState(0);
  useAppEffect(() => {
    var on = () => {
      if (!document.hidden) setNowTick(t => t + 1);
    };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  /* 開學日一到，門口頁就要自動從「暑假限定」變回「看得到年級教室」——
     不能靠使用者自己重新整理（v377 那次災情就是這樣發生的）。 */
  var summerOnlyDoor = useAppMemo(() => new Date() < TERM_START, [nowTick]);

  // ── Content state ───────────────────────────────────────
  // Seed from localStorage cache; Firestore subscription overwrites shortly after mount.
  var [weeks, setWeeks] = useAppState(() => {
    var g = (() => {
      try {
        return localStorage.getItem('alan-grade');
      } catch (e) {
        return null;
      }
    })();
    return _gradeOf(g, {
      g1: window.loadWeeksG1(),
      g2: window.loadWeeksG2(),
      g4: window.loadWeeksG4(),
      g5: window.loadWeeksG5(),
      g6: window.loadWeeksG6(),
      g3: window.loadWeeks(),
      summer: t => window.summerApi(t).loadWeeks(),
      grammar: window.loadWeeksGR()
    });
  });
  var [weekOrder, setWeekOrder] = useAppState(() => {
    var g = (() => {
      try {
        return localStorage.getItem('alan-grade');
      } catch (e) {
        return null;
      }
    })();
    return _gradeOf(g, {
      g1: window.loadWeekOrderG1(),
      g2: window.loadWeekOrderG2(),
      g4: window.loadWeekOrderG4(),
      g5: window.loadWeekOrderG5(),
      g6: window.loadWeekOrderG6(),
      g3: window.loadWeekOrder(),
      summer: t => window.summerApi(t).loadWeekOrder(),
      grammar: window.loadWeekOrderGR()
    });
  });
  var [progress, setProgress] = useAppState(() => window.loadProgress());
  var [qmProgressVersion, setQmProgressVersion] = useAppState(0);
  var [weekIdx, setWeekIdx] = useAppState(() => {
    var g = (() => {
      try {
        return localStorage.getItem('alan-grade');
      } catch (e) {
        return null;
      }
    })();
    var ord = _gradeOf(g, {
      g1: window.loadWeekOrderG1(),
      g2: window.loadWeekOrderG2(),
      g4: window.loadWeekOrderG4(),
      g5: window.loadWeekOrderG5(),
      g6: window.loadWeekOrderG6(),
      g3: window.loadWeekOrder(),
      summer: t => window.summerApi(t).loadWeekOrder(),
      grammar: window.loadWeekOrderGR()
    });
    var wks = _gradeOf(g, {
      g1: window.loadWeeksG1(),
      g2: window.loadWeeksG2(),
      g4: window.loadWeeksG4(),
      g5: window.loadWeeksG5(),
      g6: window.loadWeeksG6(),
      g3: window.loadWeeks(),
      summer: t => window.summerApi(t).loadWeeks()
    });
    return bestWeekIdx(ord, wks);
  });
  var [openCat, setOpenCat] = useAppState("vocab");
  var [editMode, setEditMode] = useAppState(false);
  var [editorOpen, setEditorOpen] = useAppState(false);
  var [editorDraft, setEditorDraft] = useAppState(null);
  var [editorCat, setEditorCat] = useAppState(null);
  // v351: 在「某位學生」的篩選底下按「出新題目」→ 存檔後自動指派給他（不必再去勾一次）
  var [editorAssign, setEditorAssign] = useAppState(null); // 學生 email 或 null
  // v360: 新增單元存檔後，自動打開「指派給哪些學生」讓老師一次勾多人
  var [assignAfterSave, setAssignAfterSave] = useAppState(null);
  var [editorGroups, setEditorGroups] = useAppState(null); // v374(#5): 新增時要提供哪些分組選項
  var [weekModalOpen, setWeekModalOpen] = useAppState(false);
  var [termOpen, setTermOpen] = useAppState(false); // v377: 一鍵建立一整個學期
  /* v398：匯出備份。ExportModal 早就寫好了（components-editor.jsx），
     但從 UI 沒有任何入口進得去＝等於不存在。期末整理的第一步就是「先備份」，
     所以把它接回編輯列。 */
  var [exportOpen, setExportOpen] = useAppState(false);
  var [quickSetOpen, setQuickSetOpen] = useAppState(false); // v377: 貼單字→一次建立整套
  var [qsRoster, setQsRoster] = useAppState([]); // v380: 指派用的學生名單
  var [grGenOpen, setGrGenOpen] = useAppState(false); // v382: 五大時態出題
  var [rcGenOpen, setRcGenOpen] = useAppState(false); // v386: 貼文字稿→出閱讀理解
  var [gnGenOpen, setGnGenOpen] = useAppState(false); // v428: 上傳老師作業→互動教學＋選擇／填空／中翻英
  /* v454（Alan：「如果我發現有些題目出的不太好，也可以在那個 group 底下再生成一次新的題目，
     不然又要重新生成並且又是不同 group」）：記住「要加進哪一組」，一鍵生成的標題就先填好，
     建出來的單元 group 一樣＝直接落在同一組底下。 */
  var [regenFor, setRegenFor] = useAppState(null); // { catId, name }
  var [wsGenOpen, setWsGenOpen] = useAppState(false); // v482：📘 一鍵出 Word Study
  var [reviewFor, setReviewFor] = useAppState(null); // v466：{ catId, name, items } 排複習
  var [weekEditOpen, setWeekEditOpen] = useAppState(false);
  var [toast, setToast] = useAppState(null);
  var getGridCols = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cols').trim()) || 2;
  var [gridCols, setGridCols] = useAppState(getGridCols);

  // ── Streak state (badges / XP / coins removed in v307 — no longer shown anywhere) ──
  var [userProfile, setUserProfile] = useAppState({
    streak: {
      count: 0
    },
    badges: {},
    xp: 0
  });
  var [starBurst, setStarBurst] = useAppState(false);
  var [streakToast, setStreakToast] = useAppState(null); // { count } — shown briefly

  // ── Mistakes state ──────────────────────────────────
  var [mistakesOpen, setMistakesOpen] = useAppState(false);
  var [growthOpen, setGrowthOpen] = useAppState(false);
  var [reviewOpen, setReviewOpen] = useAppState(false); // v313 (#3): 複習標星單字視窗
  var [welcomeOpen, setWelcomeOpen] = useAppState(false); // 文字版（門口頁連結／導覽 fallback）
  var [tourOpen, setTourOpen] = useAppState(false); // 實境導覽（大廳聚光燈）
  // v325: Alan 要「每次重新載入都回封面頁」（比較直覺）——viewLanding 一律以 true 起始，
  //       不再從 sessionStorage 還原上次停在哪頁（推翻 v301 的「停在原本那頁」）。
  var [viewLanding, setViewLanding] = useAppState(true);
  var [farewell, setFarewell] = useAppState(false); // v301: 登出「期待下次見面」過場（別太突兀）
  var [myProgressItems, setMyProgressItems] = useAppState({}); // raw Firestore items (incl. wrongQuestions)
  // v362: 每日簽到
  var [myCheckin, setMyCheckin] = useAppState(null);
  var [myFixed, setMyFixed] = useAppState(null); // v465：訂正錯題的紀錄（星星要用）
  var [checkinOpen, setCheckinOpen] = useAppState(false);

  // ── Access lock (firestore.rules 部署後，未在名單內 → 鎖定頁) ──
  var [accessLocked, setAccessLocked] = useAppState(false);

  // ── Grade-intro / tutorial state ──
  var [intro, setIntro] = useAppState(false); // 選年級後開場動畫
  var [tutorialSeen, setTutorialSeen] = useAppState(() => {
    try {
      return localStorage.getItem('alan-tutorial-done') === '1';
    } catch (e) {
      return false;
    }
  });

  // ── Local streak helpers (works without Firebase login) ─
  var getLocalStreak = () => {
    try {
      var today = new Date().toISOString().slice(0, 10);
      var yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      var d = JSON.parse(localStorage.getItem('alan-local-streak') || '{"count":0,"lastDate":null}');
      return d.lastDate === today || d.lastDate === yest ? {
        count: d.count
      } : {
        count: 0
      };
    } catch {
      return {
        count: 0
      };
    }
  };
  var updateLocalStreak = () => {
    try {
      var today = new Date().toISOString().slice(0, 10);
      var yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      var d = JSON.parse(localStorage.getItem('alan-local-streak') || '{"count":0,"lastDate":null}');
      if (d.lastDate === today) return {
        count: d.count,
        isNew: false
      };
      var count = d.lastDate === yest ? d.count + 1 : 1;
      localStorage.setItem('alan-local-streak', JSON.stringify({
        count,
        lastDate: today
      }));
      return {
        count,
        isNew: true
      };
    } catch {
      return {
        count: 1,
        isNew: true
      };
    }
  };
  var [localStreak, setLocalStreak] = useAppState(() => getLocalStreak());
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
    var escape = false;
    try {
      escape = localStorage.getItem('alan-mx-teacher') === '1';
    } catch (e) {}
    var teacherWorking = window.isAdminUser(user) && (editMode || dashOpen) && !escape;
    window.__mxAllow = !!user && !teacherWorking;
  }, [user, adminVer, editMode, dashOpen]);

  // ── Loading screen state ────────────────────────────
  // showLoader stays true until auth resolves + 480ms (fade-out animation time)
  var [showLoader, setShowLoader] = useAppState(true);
  var [loaderFading, setLoaderFading] = useAppState(false);
  // pageKey — incremented each time we navigate INTO the main page, forcing
  // the .page div to remount and replay its fade-in animation
  var [pageKey, setPageKey] = useAppState(0);
  var loaderStartRef = useAppRef(Date.now());
  // v322: 揭曉條件＝Firebase 解析完 ＋（老師／或暑假清單已載入）。學生要等暑假清單才不會閃過選年級畫面；
  // 老師端門口頁本來就是完整版（含年級）＝不用等。summerMetaReady 有 3 秒防呆（見下方）＝永不卡死。
  var revealReady = authReady && (window.isAdminUser(user) || summerMetaReady);
  useAppEffect(() => {
    if (revealReady) {
      var elapsed = Date.now() - loaderStartRef.current;
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
      var minShow = 460;
      var waitMs = Math.max(0, minShow - elapsed);
      // 開始淡出的同時 bump pageKey → 讓門口頁／首頁在載入畫面底下先掛載的
      // 進場動畫重新播放（否則動畫早在 loader 蓋住時就跑完了，使用者看不到）
      var t1 = setTimeout(() => {
        setLoaderFading(true);
        setPageKey(k => k + 1);
      }, waitMs); // fade-out
      var t2 = setTimeout(() => setShowLoader(false), waitMs + 400); // unmount
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [revealReady]);
  var isTeacher = window.isAdminUser(user);

  /* ── v399（開學）：學生的年級改成「由學號綁定」，不能自己選 ──────────────
     康橋學號信箱 leNN…→ gradeFromEmail 直接算出年級（le15→G1 … le10→G6）。
     · 老師不綁：要能巡所有年級（門口頁的年級選單、右上角年級章都照舊）。
     · 非學校帳號（自己的 Gmail 等）算不出年級 → 維持「自己選一次」，
       不然沒有學校信箱的人會被鎖在門外。
     ⚠ 這個值一旦有，就是唯一真相——去年自己選過、存在 localStorage 的舊年級不能贏
       （le13 去年是 G2、今年就是 G3，開學當天要自己跳過去）。 */
  var boundGrade = !isTeacher && user ? window.gradeFromEmail(user.email) : null;

  // v380: 指派名單只有老師需要，學生不要多打一次 Firestore
  useAppEffect(() => {
    if (!isTeacher || !window.subscribeRoster) return;
    return window.subscribeRoster(list => setQsRoster((list || []).filter(r => r && r.email && r.active !== false).map(r => ({
      email: String(r.email).toLowerCase(),
      name: r.name || r.email
    }))));
  }, [isTeacher]);
  var isTeacherRef = useAppRef(isTeacher);
  useAppEffect(() => {
    isTeacherRef.current = isTeacher;
  }, [isTeacher]);
  /* v398：封存（＝學期結束後把舊內容藏起來，但一個字都不刪）。
     開學整理的第三步「最後才隱藏」就是靠這個旗標——weeks[id].archived = true。
     資料照樣留在 Firestore（隨時可以按「取消封存」放回來），只是學生端看不到。
     ⚠ 刻意不用「刪除這一週」來達成：刪除是把 weeks[id] 整包移除，救不回來。 */
  var weekArchived = w => !!(w && w.archived);
  var viewOrder = useAppMemo(() => visibleWeekOrder(isTeacher, weekOrder, weeks), [weekOrder, weeks, isTeacher]);

  // ── Category view state (quiz mode navigation) ──────
  var [catView, setCatView] = useAppState(null); // null = main blocks, { cat } = inside a category

  useAppEffect(() => {
    var handler = () => setGridCols(getGridCols());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Firebase Auth subscription ──────────────────────────
  useAppEffect(() => {
    var unsub = window.subscribeAuth(u => {
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
    var unsub = window.subscribeAdminStatus(user, () => setAdminVer(v => v + 1));
    return unsub;
  }, [user?.email]);

  // ── v342: 訂閱自己的星星（老師在後台給/扣，這裡即時更新 header 上的數字）──
  useAppEffect(() => {
    if (!user || !user.email || !window.subscribeMyStars) {
      setStarBalance(0);
      window.__mxHats = [];
      return;
    }
    return window.subscribeMyStars(user.email, d => {
      setStarBalance(d.balance || 0);
      /* v385: 吉祥物的帽子＝虛擬商品。老師扣點的那一筆就是憑證——
         從紀錄裡找「扣點 + 註記提到帽子名稱」的項目，算出擁有哪幾頂。 */
      var owned = [];
      (d.entries || []).forEach(en => {
        if (!en || (en.amount || 0) >= 0) return;
        var note = String(en.note || '');
        if (/派對帽|hat_party/i.test(note) && owned.indexOf('party') < 0) owned.push('party');
        if (/皇冠|hat_crown/i.test(note) && owned.indexOf('crown') < 0) owned.push('crown');
      });
      window.__mxHats = owned;
    }, () => {
      setStarBalance(0);
      window.__mxHats = [];
    });
  }, [user?.email]);

  // ── Subscribe to streak (for the streak count shown to logged-in students) ──
  useAppEffect(() => {
    if (!user) {
      setUserProfile({
        streak: {
          count: 0
        },
        badges: {}
      });
      return;
    }
    var unsub = window.subscribeUserProfile(user.uid, setUserProfile);
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
    var unsub = window.subscribeMyProgress(user.uid, (firestoreItems, checkin, fixed) => {
      setMyFixed(fixed); // v465
      setMyCheckin(checkin || null); // v362
      // Convert Firestore format { itemId: {done, score?, time?} } → app format { itemId: timestamp }
      var appProgress = {};
      Object.entries(firestoreItems).forEach(([id, val]) => {
        if (val?.done) appProgress[id] = val.done;
      });
      setProgress(appProgress);
      setMyProgressItems(firestoreItems); // keep raw items for wrong-question count + mistakes panel
    });
    return unsub;
  }, [user?.uid]);

  // Always-fresh ref to weeks — prevents stale-closure bugs in CRUD handlers.
  var weeksRef = useAppRef(weeks);
  useAppEffect(() => {
    weeksRef.current = weeks;
  }, [weeks]);
  // v340: 週次「只在第一次載入時自動跳到本週」，之後保留使用者選的那一週（提前備課不會被彈回）
  var weekPickedRef = useAppRef(false);
  // v355: 雲端課程資料回來過了沒。沒回來之前 weeks 是「本機快取或空白預設值」，
  //       這時候存檔會把雲端整份蓋掉（2026-08-13 暑假題庫 87 個單元就是這樣沒的）。
  var cloudReadyRef = useAppRef(false);
  var weekOrderRef = useAppRef(viewOrder);
  useAppEffect(() => {
    weekOrderRef.current = viewOrder;
  }, [viewOrder]);
  // v341: 去補做「之前沒完成的作業」時，記住原本在哪一週——補完返回就回到原來那一週，
  // 不會被丟在舊的週次（Alan：人在 week7 補 week5 的作業，不該被留在 week5）
  var returnWeekRef = useAppRef(null);

  // ── Firestore real-time subscription (grade-aware) ────
  // Switches between G2 and G3 Firestore collections based on active grade.
  // Also points window.saveWeeks / saveWeekOrder at the right collection.
  useAppEffect(() => {
    if (!grade) return; // wait until grade is chosen
    weekPickedRef.current = false; // v340: 換年級/換教室 → 重新自動跳到本週
    window.saveWeeks = _gradeOf(grade, {
      g1: window.saveWeeksG1,
      g2: window.saveWeeksG2,
      g4: window.saveWeeksG4,
      g5: window.saveWeeksG5,
      g6: window.saveWeeksG6,
      g3: _saveWeeksG3,
      summer: t => window.summerApi(t).saveWeeks,
      grammar: () => window.saveWeeksGR
    });
    window.saveWeekOrder = _gradeOf(grade, {
      g1: window.saveWeekOrderG1,
      g2: window.saveWeekOrderG2,
      g4: window.saveWeekOrderG4,
      g5: window.saveWeekOrderG5,
      g6: window.saveWeekOrderG6,
      g3: _saveWeekOrderG3,
      summer: t => window.summerApi(t).saveWeekOrder,
      grammar: () => window.saveWeekOrderGR
    });
    var subscribeFn = _gradeOf(grade, {
      g1: window.subscribeToClassDataG1,
      g2: window.subscribeToClassDataG2,
      g4: window.subscribeToClassDataG4,
      g5: window.subscribeToClassDataG5,
      g6: window.subscribeToClassDataG6,
      g3: _subscribeG3,
      summer: t => window.summerApi(t).subscribe,
      grammar: () => window.subscribeToClassDataGR
    });
    var storageKey = _gradeOf(grade, {
      g1: 'alans-english-g1-data-v1',
      g2: 'alans-english-g2-data-v1',
      g4: 'alans-english-g4-data-v1',
      g5: 'alans-english-g5-data-v1',
      g6: 'alans-english-g6-data-v1',
      g3: 'alans-english-data-v3',
      summer: t => window.summerApi(t).storageKey,
      grammar: window.GR_STORAGE_KEY
    });
    var orderKey = _gradeOf(grade, {
      g1: 'alans-english-g1-order-v1',
      g2: 'alans-english-g2-order-v1',
      g4: 'alans-english-g4-order-v1',
      g5: 'alans-english-g5-order-v1',
      g6: 'alans-english-g6-order-v1',
      g3: 'alans-english-week-order-v1',
      summer: t => window.summerApi(t).orderKey,
      grammar: window.GR_ORDER_KEY
    });
    cloudReadyRef.current = false; // v355: 換年級／換教室 → 重新等雲端
    var unsub = subscribeFn((newWeeks, newOrder) => {
      setAccessLocked(false);
      cloudReadyRef.current = true;
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
          var curId = weekOrderRef.current[i];
          var keep = curId ? newOrder.indexOf(curId) : -1; // 用「週次 id」定位，順序變動也不會亂跳
          return keep >= 0 ? keep : Math.min(i, Math.max(0, newOrder.length - 1));
        });
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(newWeeks));
        localStorage.setItem(orderKey, JSON.stringify(newOrder));
        // v359: 每個年級也留一份「有題目」的備份。萬一雲端again被寫空，
        //       這份不會被空資料覆蓋，還救得回來（暑假題庫就是靠這招救回 51 個單元）。
        var n = window.countWeekItems ? window.countWeekItems(newWeeks) : 0;
        if (n > 0) localStorage.setItem(storageKey + ':bak', JSON.stringify({
          at: Date.now(),
          n,
          weeks: newWeeks
        }));
      } catch (e) {}
    }, err => {
      // permission-denied → 名單外或未登入（rules 部署後才會發生）
      if (err?.code === 'permission-denied' && !window.isAdminUser(window._currentUser)) {
        setAccessLocked(true);
      }
    });
    return unsub;
  }, [grade, user?.uid]);

  // ── 暑假 meta（每人一份派發清單；v209 題庫＋個人清單制）────
  var [summerMeta, setSummerMeta] = useAppState({
    students: {}
  });
  var summerMetaRef = useAppRef(summerMeta);
  useAppEffect(() => {
    summerMetaRef.current = summerMeta;
  }, [summerMeta]);
  useAppEffect(() => {
    /* v399：沒登入就不要去讀 class/summer_meta。
       這份文件（暑假派發清單）含 11 位學生的真名與學校信箱，安全規則發布後
       已經改成「要登入才能讀」——未登入還去訂閱只會固定拿到 permission-denied，
       白打一次 Firestore、還在每個訪客的 console 留一行紅字。
       ⚠ 一定要順手 setSummerMetaReady(true)：載入畫面的揭曉條件等的就是它，
         不設的話訪客要等 3 秒的防呆逾時才看得到首頁。 */
    if (!user || !window.subscribeSummerMeta) {
      setSummerMetaReady(true);
      return;
    }
    // v322: 資料回來（或出錯）都標記 ready，載入畫面才知道可以揭曉了
    return window.subscribeSummerMeta(m => {
      setSummerMeta(m);
      setSummerMetaReady(true);
    }, () => setSummerMetaReady(true));
  }, [user?.uid]); // user 從 null→有值時會重跑，登入後才真的去訂閱
  // v322: 防呆——暑假清單 3 秒內沒回來也先揭曉（退回一般門口頁），永不卡在載入畫面
  useAppEffect(() => {
    if (summerMetaReady) return;
    var t = setTimeout(() => setSummerMetaReady(true), 3000);
    return () => clearTimeout(t);
  }, [summerMetaReady]);
  var isSummer = !!(window.isSummerTrack && window.isSummerTrack(grade));
  var isSummerLib = grade === (window.SUMMER_LIB || 'sl');

  // v362: 每天第一次進到課程頁 → 自動打開簽到（領完或關掉，當天就不再跳）
  useAppEffect(() => {
    if (!user || viewLanding || !entered) return;
    if (window.isAdminUser && window.isAdminUser(user)) return; // 老師不用簽到
    if (!window.computeCheckin) return;
    var info = window.computeCheckin(myCheckin);
    if (info.signedToday) return;
    var key = 'alan-checkin-popped:' + user.uid;
    var today = window.checkinToday();
    try {
      if (localStorage.getItem(key) === today) return;
    } catch (e) {}
    // 真的跳出來的當下才記「今天跳過了」——中途離開頁面的話下次進來還會跳
    var t = setTimeout(() => {
      try {
        localStorage.setItem(key, today);
      } catch (e) {}
      setCheckinOpen(true);
    }, 900); // 讓頁面先畫出來再跳
    return () => clearTimeout(t);
  }, [user?.uid, viewLanding, entered, myCheckin]);

  // v355: 所有課程內容的存檔都走這裡——雲端還沒回來就不准寫，寫失敗要讓老師看得到。
  //       （以前是直接呼叫 window.saveWeeks，失敗只會靜靜地變成 unhandled rejection。）
  /* v447（Alan：「分段不見了」）：存檔失敗以前只跳一次 alert，畫面上的東西還在
     ——他以為存好了，重新整理才發現沒有。現在改成「失敗就一直掛在畫面上，可以再試一次」，
     而且整份內容先寫進 localStorage，重新整理也還在。 */
  var [saveFail, setSaveFail] = useAppState(null); // { msg, at, weeks }
  var markSaveFail = (w, e) => {
    var msg = e && e.message || String(e || '存檔失敗');
    try {
      localStorage.setItem('alan-unsaved-weeks', JSON.stringify({
        t: Date.now(),
        grade,
        weeks: w
      }));
    } catch (x) {}
    setSaveFail({
      msg,
      at: Date.now(),
      weeks: w
    });
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
  var pruneGhostHomework = w => {
    var n = 0;
    Object.values(w || {}).forEach(wk => {
      var hw = wk && wk.homework;
      if (!hw || !Object.keys(hw).length) return;
      var ids = new Set();
      Object.values(wk && wk.items || {}).forEach(arr => {
        (arr || []).forEach(it => {
          if (it && it.id) ids.add(it.id);
        });
      });
      if (!ids.size) return; // 空週次不動（可能只是還沒載完）
      Object.keys(hw).forEach(id => {
        if (!ids.has(id)) {
          delete hw[id];
          n++;
        }
      });
    });
    return n;
  };

  /* ══ 🏫 v493 學校進度表 ══════════════════════════════════════════════
     每個年級一份（class/pacing_g4）。訂閱而不是讀一次——Alan 可能在別台電腦重匯入。
     ⚠ 沒匯入的年級 pacing 就是 null，畫面上完全不顯示（不要留一條空的）。 */
  var [pacing, setPacing] = useAppState(null);
  var [examSide, setExamSide] = useAppState(null); // v513：考前複習包（'it' / 'lt'）
  var [paceOpen, setPaceOpen] = useAppState(false);
  useAppEffect(() => {
    setPacing(null);
    if (!window.subscribePacing || !grade) return;
    return window.subscribePacing(grade, setPacing);
  }, [grade]);
  /* 這一週的進度 ＋ 下一次 Formative（Alan：Summative 不用看）。 */
  var paceWeek = useAppMemo(() => window.pacingForWeek ? window.pacingForWeek(pacing, weekId) : null, [pacing, weekId]);
  var paceNextF = useAppMemo(() => pacing && window.pacingNextFormative ? window.pacingNextFormative(pacing, weekId) : null, [pacing, weekId]);
  var saveWeeksSafe = w => {
    if (!cloudReadyRef.current) {
      alert('資料還在從雲端載入中，先等兩秒再存一次。\n（這是為了避免把雲端已經有的內容蓋掉）');
      return false;
    }
    pruneGhostHomework(w); // v486：存進去的永遠不帶幽靈作業
    try {
      var p = window.saveWeeks(w);
      if (p && p.then) p.then(() => {
        setSaveFail(null);
        try {
          localStorage.removeItem('alan-unsaved-weeks');
        } catch (x) {}
      }, e => markSaveFail(w, e));
    } catch (e) {
      markSaveFail(w, e);
    }
    return true;
  };
  var mySummerPlan = user && user.email && (summerMeta.students || {})[user.email.toLowerCase()] || null;
  var hasSummerPlan = !!(mySummerPlan && Object.values(mySummerPlan.weeks || {}).some(a => a && a.length));
  // 名單姓名格式是「王騰樂Tayler Wang」→ 抽英文名（Tayler）進標題
  var _englishName = n => {
    var m = String(n || '').match(/[A-Za-z][A-Za-z .'-]*/);
    return m ? m[0].trim().split(/\s+/)[0] : String(n || '');
  };
  var summerWho = _englishName(mySummerPlan && mySummerPlan.name) || (user && user.displayName ? user.displayName.split(' ')[0] : '') || '我';

  // v257: 門口頁進度環——本週（或整個暑假）派給我的任務完成了幾項
  var doorSummerProg = useAppMemo(() => {
    if (!mySummerPlan) return null;
    var local = {};
    try {
      local = window.loadQMProg ? window.loadQMProg() : {};
    } catch (e) {}
    var sfxNow = window.summerCurrentSuffix ? window.summerCurrentSuffix() : null;
    var wkDone = 0,
      wkTotal = 0,
      allDone = 0,
      allTotal = 0;
    Object.entries(mySummerPlan.weeks || {}).forEach(([sfx, ids]) => {
      (ids || []).forEach(id => {
        var wid = window.summerLibWeekId ? window.summerLibWeekId(sfx) : `sl-2026-${sfx}`;
        var key = `${wid}_${id}`;
        var d = !!(myProgressItems[key] && myProgressItems[key].done || local[key] && local[key].done);
        allTotal++;
        if (d) allDone++;
        if (sfx === sfxNow) {
          wkTotal++;
          if (d) wkDone++;
        }
      });
    });
    return {
      wkDone,
      wkTotal,
      allDone,
      allTotal
    };
  }, [mySummerPlan, myProgressItems, qmProgressVersion, user?.uid]);

  // Progress — keep in localStorage as offline cache.
  // When logged in, Firestore is the source of truth (see subscribeMyProgress above).
  useAppEffect(() => {
    window.saveProgress(progress);
  }, [progress]);

  // Clamp weekIdx if the order shrinks (also handles empty weekOrder gracefully)
  useAppEffect(() => {
    if (viewOrder.length === 0 || weekIdx >= viewOrder.length) {
      setWeekIdx(Math.max(0, viewOrder.length - 1));
    }
  }, [viewOrder, weekIdx]);
  var weekId = viewOrder[weekIdx] || viewOrder[0] || "";
  /* v377: 可見週次清單變動時（例：老師身分確認後從「只看有內容的」變成「全部」、
     或某一週剛被放進內容），用「週次 id」把位置定回去，不要莫名跳到別週。 */
  var lastWeekIdRef = useAppRef('');
  useAppEffect(() => {
    if (weekId) lastWeekIdRef.current = weekId;
  }, [weekId]);
  useAppEffect(() => {
    var id = lastWeekIdRef.current;
    if (!id || viewOrder.length === 0) return;
    var i = viewOrder.indexOf(id);
    if (i >= 0 && i !== weekIdx) setWeekIdx(i);
  }, [viewOrder]);
  var week = weeks[weekId] || {
    id: weekId,
    label: weekId || "—",
    dateRange: "—",
    theme: "—",
    themeZh: "",
    items: {
      vocab: [],
      grammar: [],
      word: [],
      reading: []
    }
  };

  // Active categories — switches between grade definitions on grade change
  var activeCategories = _gradeOf(grade, {
    g1: window.CATEGORIES_G1 || _CATS_G3,
    g2: window.CATEGORIES_G2 || _CATS_G3,
    g4: window.CATEGORIES_G4 || _CATS_G3,
    g5: window.CATEGORIES_G5 || _CATS_G3,
    g6: window.CATEGORIES_G6 || _CATS_G3,
    g3: _CATS_G3,
    summer: window.SUMMER_CATEGORIES || _CATS_G3,
    grammar: window.CATEGORIES_GR || _CATS_G3
  });
  var allItems = useAppMemo(() => {
    var cats = activeCategories;
    return cats.flatMap(c => (week.items[c.id] || []).map(it => ({
      ...it,
      _cat: c.id
    })));
  }, [week, grade]);
  var weekQuizItems = useAppMemo(() => {
    if (!window.getQuizItems) return [];
    var cats = activeCategories;
    return cats.flatMap(c => window.getQuizItems((week.items || {})[c.id] || []));
  }, [week, grade]);

  // v364: 整週「所有分類」的單元——閱讀理解要綁「單字」分類的單字卡，
  //        原本只看同一個分類，所以綁定選單在閱讀理解裡根本不會出現。
  var weekAllItems = useAppMemo(() => Object.values(week && week.items || {}).flat(), [week]);
  var qmProgress = useAppMemo(() => {
    // v257: 改讀「這個帳號自己的」本機紀錄（loadQMProg 內建帳號隔離）
    var local = {};
    try {
      local = window.loadQMProg ? window.loadQMProg() : {};
    } catch (e) {}
    // v255: 併入雲端成績（跨裝置一致），同一單元取「較好的一次」
    var pctOf = p => p && p.score != null && p.total ? p.score / p.total : p && p.done ? -1 : -2;
    Object.entries(myProgressItems || {}).forEach(([key, fp]) => {
      if (!fp) return;
      // v361: 沒達 80 分（done 是空的）但有分數的也要併進來——短答 3 顆星就是這種，集點要用；
      //       單字卡的 modes（學習/填空跑完沒）也要跟著過來，換裝置才不會漏算。
      if (!fp.done && fp.score == null && !fp.modes) return;
      var remote = {
        done: fp.done ? 1 : 0,
        score: fp.score != null ? fp.score : null,
        total: fp.score != null ? 100 : fp.total || 1,
        ts: fp.done || 0
      };
      var cur = local[key];
      var modes = {
        ...(cur && cur.modes || {}),
        ...(fp.modes || {})
      };
      var base = !cur || pctOf(remote) > pctOf(cur) ? remote : cur;
      /* v459（Alan：「有學生反應補交作業不會顯示已完成並且消掉」）：
         上面那一行是「同一單元取分數比較好的一次」——但它把 done 也一起換掉了。
         done（有沒有做完）跟分數高低是兩件事，不該互相覆蓋。
         實際會爆的情形：單字卡與上傳作業完成時 score 是 null（pctOf 只給 -1），
         所以本機任何一筆「考過但沒到 80 分」的舊紀錄都會贏過雲端那筆「已完成」
         → 換一台裝置打開，明明做完了卻沒有打勾、也不會從「還沒完成」清單消失。
         做完就是做完：兩邊只要有一邊完成，合併後就是完成。 */
      var doneVal = base.done || cur && cur.done || remote.done || 0;
      /* v409：型別與標題一定要帶過來。它們是「這一筆是什麼」的描述，跟挑哪一邊的分數無關，
         而本機那份（loadQMProg）從來只存 done/score/total/ts，根本沒有這兩個欄位。
         沒有 itemType，computeAutoStars 就認不出「以前教室賺的」那些紀錄
         ——暑假的星星就是這樣不見的。 */
      var meta = {};
      if (fp.itemType) meta.itemType = fp.itemType;
      if (fp.itemTitle) meta.itemTitle = fp.itemTitle;
      local[key] = {
        ...base,
        done: doneVal,
        ...(Object.keys(modes).length ? {
          modes
        } : {}),
        ...meta
      };
    });
    return local;
  }, [qmProgressVersion, weekId, grade, myProgressItems, user?.uid]);

  /* v409：右上角那顆 ⭐ 本來只顯示 stars/{email}.balance ＝「老師手動給的」，
     完全沒有把 v361 的自動集點與 v362 的每日簽到算進去——所以 header 的數字一直
     比面板裡的小一大截（點開才會變多）。兩邊改用同一組函式算，不可能再對不起來。 */
  var autoStarTotal = useAppMemo(() => {
    if (!user) return 0;
    var a = window.computeAutoStars ? window.computeAutoStars(weeks, viewOrder, qmProgress) : {
      total: 0
    };
    var c = window.computeCheckin ? window.computeCheckin(myCheckin) : {
      total: 0
    };
    var f = window.computeFixedStars ? window.computeFixedStars(myFixed) : {
      total: 0
    }; // v465：訂正錯題
    return (a.total || 0) + (c.total || 0) + (f.total || 0);
  }, [user, weeks, viewOrder, qmProgress, myCheckin, myFixed]);

  /* v431 ④：買裝扮花掉的星星要扣掉——由「買到哪幾件」反算，不是存一個數字（見 data.js mxSpent）。
     header、集點面板、裝扮室三個地方都用這一個數，不可能對不起來。 */
  var mxSpentStars = useAppMemo(() => window.mxSpent ? window.mxSpent(userProfile.mx) : 0, [userProfile.mx]);
  var starsTotal = Math.max(0, starBalance + autoStarTotal - mxSpentStars);

  /* 吉祥物（components-fx.jsx）是獨立的一層，拿不到 React 的狀態——
     用 window 當橋：牠只讀這三個，買／穿都回到這裡來寫 Firestore。 */
  useAppEffect(() => {
    window.__mxStars = starsTotal;
    window.__mxData = userProfile.mx || {};
    /* v477：吉祥物要講「跟現在的你有關」的話，就得知道現在的你是什麼狀況。
       ⚠ 只放「網站這一層才算得出來」的東西——連對幾題是吉祥物自己數的，不要重複。
       「剩幾個整組完成」在單元列表那一層才知道，由它自己寫進這同一包。 */
    try {
      var ci = window.computeCheckin ? window.computeCheckin(myCheckin) : null;
      var fx = myFixed && myFixed.days || {};
      var today = window.checkinToday ? window.checkinToday() : '';
      var dates = Object.keys(myCheckin && myCheckin.dates || {}).filter(k => k).sort();
      var last = dates.filter(d => d !== today).pop() || '';
      var dayNum = d => Math.floor(new Date(d + 'T00:00:00').getTime() / 86400000);
      window.__mxCtx = Object.assign({}, window.__mxCtx, {
        checkinDays: ci && ci.streak || 0,
        fixedToday: Number(fx[today] || 0),
        firstToday: !!(ci && !ci.signedToday),
        // 今天還沒簽到＝今天第一次見面
        daysAway: last && today ? Math.max(0, dayNum(today) - dayNum(last)) : 0
      });
    } catch (e) {}
    window.__mxBuy = id => user && window.mxBuy ? window.mxBuy(user.uid, id, starsTotal, userProfile.mx) : Promise.resolve({
      ok: false,
      reason: 'no-user'
    });
    window.__mxWear = (kind, id) => user && window.mxSetWear ? window.mxSetWear(user.uid, kind, id, userProfile.mx) : Promise.resolve({
      ok: false,
      reason: 'no-user'
    });
    // v442：取名字／改名字（第一次免費，之後 50 顆星）
    window.__mxRename = name => user && window.mxRename ? window.mxRename(user.uid, name, starsTotal, userProfile.mx) : Promise.resolve({
      ok: false,
      reason: 'no-user'
    });
  }, [user, starsTotal, userProfile.mx, myCheckin, myFixed]); // v477：簽到／訂正變了，吉祥物要知道

  // v311 (#21): 只計「真的完成」——qmProgress 記錄存在不代表完成（未達 80 分 done 會是 0）；一律看 .done
  var qmIsDone = id => {
    var p = qmProgress[`${weekId}_${id}`];
    return !!(p && p.done);
  };
  var totalItems = weekQuizItems.length || allItems.length;
  var totalDone = weekQuizItems.length ? weekQuizItems.filter(it => progress[it.id] || qmIsDone(it.id)).length : allItems.filter(it => progress[it.id]).length;
  var getCategoryProgress = cat => {
    var quizItems = window.getQuizItems ? window.getQuizItems((week.items || {})[cat.id] || []) : [];
    if (!quizItems.length) return {
      total: 0,
      done: 0
    };
    var done = quizItems.reduce((sum, it) => sum + (progress[it.id] || qmIsDone(it.id) ? 1 : 0), 0);
    return {
      total: quizItems.length,
      done
    };
  };

  // v313 (#3): 跨週收集學生標星的單字——大廳「複習」卡（catView 變動時重算，離開單元後回大廳就更新）
  var reviewWords = useAppMemo(() => window.collectStarredWords ? window.collectStarredWords(weeks) : [], [weeks, catView, qmProgressVersion, user?.uid]);

  // v268: 本週平均分——WeekHero 給家長掃一眼用
  var weekAvgScore = useAppMemo(() => {
    var sum = 0,
      n = 0;
    weekQuizItems.forEach(it => {
      var p = qmProgress[`${weekId}_${it.id}`];
      if (p && p.done && p.score != null && p.total) {
        sum += Math.min(100, Math.round(p.score / p.total * 100));
        n++;
      }
    });
    return n ? Math.round(sum / n) : null;
  }, [weekQuizItems, qmProgress, weekId]);

  // v266: 完成一題後的「下一個任務」——本週作業裡還沒完成的下一項（依到期日排）
  var getNextTask = excludeId => {
    var hw = week.homework || {};
    var byId = {};
    allItems.forEach(it => {
      byId[it.id] = it;
    });
    var candidates = Object.keys(hw).filter(id => id !== excludeId).map(id => ({
      id,
      it: byId[id],
      due: String(hw[id] && hw[id].dueDate || '9999')
    })).filter(c => c.it && !(progress[c.id] || qmIsDone(c.id)) && window.getQuizItems && window.getQuizItems([c.it]).length > 0).sort((a, b) => a.due.localeCompare(b.due) || (window.qmTypeRank ? window.qmTypeRank(a.it.type) : 9) - (window.qmTypeRank ? window.qmTypeRank(b.it.type) : 9));
    if (!candidates.length) return null;
    var cat = activeCategories.find(c => c.id === candidates[0].it._cat);
    return cat ? {
      cat,
      itemId: candidates[0].id
    } : null;
  };
  var getNextStudyCategory = () => {
    var withProgress = activeCategories.map(cat => ({
      cat,
      ...getCategoryProgress(cat)
    }));
    var next = withProgress.find(c => c.total > 0 && c.done < c.total);
    if (next) return next.cat;
    return withProgress.find(c => c.total > 0)?.cat || null;
  };
  var showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };
  var finishTutorial = () => {
    try {
      localStorage.setItem('alan-tutorial-done', '1');
    } catch (e) {}
    setTutorialSeen(true);
  };

  // First-time onboarding — 每個帳號各看一次（共用電腦的手足互不影響）；
  // 老師不自動跳（可從門口頁／footer 手動打開）。等真正進到教室再出現，
  // 並稍等大廳進場動畫落定，才不會兩個動畫打架。
  // 自動跳的是「實境導覽」（聚光燈圈真的元素，小朋友不用讀字）；
  // 文字版 WelcomeGuide 留給門口頁連結與導覽的 fallback。
  var welcomeKey = () => user && user.uid ? 'alan-welcome-v2:' + user.uid : 'alan-welcome-v2';
  useAppEffect(() => {
    if (!authReady || !grade || !entered || isTeacher) return;
    var seen = false;
    try {
      seen = localStorage.getItem(welcomeKey()) === '1';
    } catch (e) {}
    if (seen) return;
    var t = setTimeout(() => setTourOpen(true), 700);
    return () => clearTimeout(t);
  }, [authReady, grade, entered, isTeacher, user?.uid]);
  var dismissWelcome = () => {
    try {
      localStorage.setItem(welcomeKey(), '1');
    } catch (e) {}
    setWelcomeOpen(false);
  };
  var dismissTour = () => {
    try {
      localStorage.setItem(welcomeKey(), '1');
    } catch (e) {}
    setTourOpen(false);
  };

  // v249: 從行銷頁按「開始學習」登入 → 留在首頁（CTA 變「進入課程」）。
  // v325: 不再把 viewLanding 同步進 sessionStorage——每次重新載入一律回封面頁（viewLanding 起始 true）。
  var loginFromLandingRef = useAppRef(false);
  var firstAuthResolveRef = useAppRef(true);
  useAppEffect(() => {
    if (!user) return;
    var firstResolve = firstAuthResolveRef.current;
    firstAuthResolveRef.current = false;
    if (loginFromLandingRef.current) {
      loginFromLandingRef.current = false;
      setViewLanding(true); // 留在首頁，敘述換成「進入課程」
    } else if (viewLanding && !firstResolve) {
      // 非首頁發起的「新」登入完成時，把殘留的行銷頁關掉；
      // 但「重新整理自動還原登入」(firstResolve) 不算——那要停在原本那頁。
      setViewLanding(false);
    }
  }, [user]);

  // v252: 泡泡轉場改純 DOM（spawnPageWave）——點擊下一幀就出現，不等 App re-render（後台很重時會頓）
  var wavingRef = useAppRef(false);
  var runWave = cb => {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || wavingRef.current || !window.spawnPageWave) {
      cb();
      return;
    }
    wavingRef.current = true;
    window.spawnPageWave(1900);
    setTimeout(cb, 560); // 泡泡最密、紗幕全遮的瞬間切頁
    setTimeout(() => {
      wavingRef.current = false;
    }, 1850);
  };

  /* v301: 登出時先淡出一個「期待下次見面」的過場，才真的登出——
     比「按下去畫面瞬間跳掉」有質感許多。所有登出入口都走這裡。
     v402（Alan：登入登出想再快一點）：1050+620 → 700+360，整段從約 1.67 秒收到
     約 1.06 秒。過場本身（.app-farewell 0.7s 淡入、夥伴 1.4s 揮手）在 700ms 時
     已經完全顯形、手也揮到一半，看得出來是「在跟你道別」而不是被切掉。 */
  var farewellRef = useAppRef(false);
  var signOutWithFarewell = cleanup => {
    if (farewellRef.current) return;
    farewellRef.current = true;
    setFarewell(true);
    setTimeout(() => {
      try {
        window.signOutUser();
      } catch (e) {}
      try {
        sessionStorage.removeItem('alan-guest');
      } catch (e) {}
      try {
        sessionStorage.removeItem('alan-entered');
      } catch (e) {}
      setSkippedLogin(false);
      if (cleanup) {
        try {
          cleanup();
        } catch (e) {}
      }
      // 稍留一下讓封面在紗幕底下先掛載，再淡開過場
      setTimeout(() => {
        setFarewell(false);
        farewellRef.current = false;
      }, 360);
    }, 700);
  };
  var scrollPageToTop = () => {
    var jump = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto'
      });
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
    } catch (e) {
      try {
        window.scrollTo(0, 0);
      } catch (_) {}
    }
  };
  var [slideDir, setSlideDir] = useAppState(null); // 'left' | 'right'
  var [mainKey, setMainKey] = useAppState(0); // increments on back-to-main

  useAppEffect(() => {
    scrollPageToTop();
  }, [grade, weekIdx, catView?.id || '', mainKey, pageKey]);

  // v341: 手動切週 → 清掉「補完要回去的那一週」，免得之後返回時被莫名帶走
  // v360: 在練習頁換週次 → 留在同一個分類，只換成那一週的單元（原本會被踢回大廳）。
  //       itemId 清掉＝不要去開上一週的那個單元。
  var keepCatOnWeekChange = () => setCatView(c => c ? {
    ...c,
    itemId: null
  } : null);
  var goPrevWeek = () => {
    returnWeekRef.current = null;
    setSlideDir('right');
    setWeekIdx(i => Math.max(0, i - 1));
    setOpenCat(null);
    keepCatOnWeekChange();
    scrollPageToTop();
  };
  var goNextWeek = () => {
    returnWeekRef.current = null;
    setSlideDir('left');
    setWeekIdx(i => Math.min(viewOrder.length - 1, i + 1));
    setOpenCat(null);
    keepCatOnWeekChange();
    scrollPageToTop();
  };
  /* v446（Alan：「我原本做的 desert 一鍵生成不見了」）：直接跳到某一週（順便開那一類）。
     東西其實一直在第 1 週——網站開起來停在「今天這一週」，那一週是空的，看起來就像不見了。 */
  var goWeekId = (id, cat) => {
    var j = viewOrder.indexOf(id);
    if (j < 0) return;
    returnWeekRef.current = null;
    setSlideDir(j > weekIdx ? 'left' : 'right');
    setWeekIdx(j);
    setCatView(null);
    setOpenCat(cat || null);
    scrollPageToTop();
  };

  // ── Week CRUD ──────────────────────────────────────────

  var handleAddWeek = form => {
    var id = (form.id || "").trim();
    if (!id) {
      showToast("Week ID is required");
      return;
    }
    if (weekOrder.includes(id)) {
      showToast("Week ID already exists");
      return;
    }
    var newWeek = {
      id,
      label: form.label?.trim() || id,
      dateRange: form.dateRange?.trim() || "—",
      theme: form.theme?.trim() || "—",
      themeZh: form.themeZh?.trim() || "",
      subtitle: "",
      subtitleZh: "",
      items: {
        vocab: [],
        grammar: [],
        word: [],
        reading: []
      }
    };
    var nextOrder = [...weekOrder, id].sort();
    var nextWeeks = {
      ...weeksRef.current,
      [id]: newWeek
    };
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
  var handleCreateTerm = (list, cats) => {
    if (!list || !list.length) {
      setTermOpen(false);
      return;
    }
    var emptyItems = () => {
      var o = {};
      (cats || []).forEach(c => {
        o[c.id] = [];
      });
      if (!Object.keys(o).length) {
        o.vocab = [];
        o.grammar = [];
        o.word = [];
        o.reading = [];
      }
      return o;
    };
    var nextWeeks = {
      ...weeksRef.current
    };
    var added = [];
    list.forEach(p => {
      if (nextWeeks[p.id]) return; // 已存在＝跳過
      nextWeeks[p.id] = {
        id: p.id,
        label: p.label,
        dateRange: p.dateRange,
        startISO: p.startISO,
        endISO: p.endISO,
        // 真實日期＝「這一週」判斷才會準
        theme: '',
        themeZh: '',
        subtitle: '',
        subtitleZh: '',
        items: emptyItems()
      };
      added.push(p.id);
    });
    if (!added.length) {
      setTermOpen(false);
      return;
    }
    var nextOrder = [...weekOrder, ...added].sort();
    setWeeks(nextWeeks);
    setWeekOrder(nextOrder);
    saveWeeksSafe(nextWeeks);
    window.saveWeekOrder(nextOrder);
    setTermOpen(false);
    showToast(`已建立 ${added.length} 週 · 內容還沒放的週次學生看不到`);
  };

  // Edit existing week (label, dateRange, theme) — or rename its ID
  var handleEditWeekSave = (form, oldId) => {
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    var newId = form.id.trim();
    if (!newId) return;
    if (oldId && oldId !== newId) {
      // Rename: copy data to new ID, delete old
      // Use weekOrder (not data keys) as truth; exclude the old ID itself
      var takenIds = weekOrder.filter(id => id !== oldId);
      if (takenIds.includes(newId)) {
        showToast("ID 已存在");
        return;
      }
      w[newId] = {
        ...w[oldId],
        id: newId,
        label: form.label || form.id,
        dateRange: form.dateRange || '',
        theme: form.theme || '',
        themeZh: form.themeZh || ''
      };
      delete w[oldId];
      var nextOrder = weekOrder.map(id => id === oldId ? newId : id);
      setWeeks(w);
      setWeekOrder(nextOrder);
      saveWeeksSafe(w);
      window.saveWeekOrder(nextOrder);
      setWeekIdx(nextOrder.indexOf(newId));
    } else {
      // Update in-place (no ID change)
      w[newId] = {
        ...w[newId],
        label: form.label || form.id,
        dateRange: form.dateRange || '',
        theme: form.theme || '',
        themeZh: form.themeZh || ''
      };
      setWeeks(w);
      saveWeeksSafe(w);
    }
    setWeekEditOpen(false);
    showToast("已儲存 ✓");
  };

  /* v398：封存／取消封存這一週。跟 Delete 的差別是「只加一個旗標」——
     items、成績、作業全部原封不動留著，按第二次就整週回到學生端。 */
  var handleArchiveWeek = () => {
    var w = {
      ...weeksRef.current
    };
    var cur = w[weekId];
    if (!cur) return;
    var next = !cur.archived;
    if (next && !confirm(`要把「${cur.label || weekId}」封存嗎？\n\n學生端會看不到這一週（內容不會被刪除，隨時可以取消封存）。`)) return;
    w[weekId] = {
      ...cur,
      archived: next
    };
    if (!next) delete w[weekId].archived; // 取消封存就把旗標清乾淨，不留 false
    setWeeks(w);
    if (!saveWeeksSafe(w)) return;
    showToast(next ? '已封存 · 學生看不到這一週 📦' : '已取消封存 · 學生看得到了 ✓');
  };
  var handleDeleteWeek = () => {
    if (weekOrder.length <= 1) {
      showToast("Can't delete the last week");
      return;
    }
    var nextWeeks = {
      ...weeksRef.current
    };
    delete nextWeeks[weekId];
    var nextOrder = weekOrder.filter(id => id !== weekId);
    setWeeks(nextWeeks);
    setWeekOrder(nextOrder);
    saveWeeksSafe(nextWeeks);
    window.saveWeekOrder(nextOrder);
    setWeekIdx(i => Math.max(0, i - 1));
    setOpenCat(null);
    showToast("Week deleted");
  };
  var toggleCheck = itemId => {
    setProgress(prev => {
      var next = {
        ...prev
      };
      var wasChecked = !!next[itemId];
      if (wasChecked) {
        delete next[itemId];
        // Remove from Firestore if logged in
        if (user) window.saveProgressItem(user.uid, user.displayName || '', user.email || '', itemId, null);
      } else {
        next[itemId] = Date.now();
        // Save to Firestore if logged in
        if (user) window.saveProgressItem(user.uid, user.displayName || '', user.email || '', itemId, {
          done: next[itemId]
        });
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
  var handleWordStudy = ({
    items,
    cat,
    assign
  }) => {
    if (!items || !items.length) {
      showToast('沒有產生任何單元');
      return;
    }
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) {
      showToast('請先選一個週次');
      return;
    }
    if (!w[weekId].items) w[weekId].items = {};
    if (!Array.isArray(w[weekId].items[cat])) w[weekId].items[cat] = [];
    w[weekId].items[cat] = w[weekId].items[cat].concat(items);
    var note = '';
    if (assign && assign.dueDate) {
      if (!w[weekId].homework) w[weekId].homework = {};
      items.forEach(it => {
        w[weekId].homework[it.id] = {
          dueDate: assign.dueDate
        };
      });
      note = ` · 已設為作業（${assign.dueDate} 到期）`;
    }
    setWeeks(w);
    saveWeeksSafe(w);
    if (assign && assign.students && assign.students.length && window.saveSummerStudent) {
      var suffix = String(weekId).split('-').pop();
      var metaNow = summerMetaRef.current && summerMetaRef.current.students || {};
      Promise.all(assign.students.map(email => {
        var key = String(email).toLowerCase();
        var prev = metaNow[key] || {
          name: '',
          weeks: {}
        };
        var weeksMap = {
          ...(prev.weeks || {})
        };
        var have = Array.isArray(weeksMap[suffix]) ? weeksMap[suffix] : [];
        weeksMap[suffix] = have.concat(items.map(it => it.id).filter(id => have.indexOf(id) < 0));
        return window.saveSummerStudent(key, {
          ...prev,
          weeks: weeksMap
        });
      })).then(() => showToast(`已指派給 ${assign.students.length} 位學生`)).catch(() => showToast('指派失敗，請到後台再指派一次'));
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
  var handleQuickSet = ({
    words,
    title,
    cat,
    kinds,
    ai,
    story,
    sense,
    assign
  }) => {
    // 校稿時改過的中文要回填（老師沒貼中文、AI 補的那種）
    var merged = (words || []).map(w => {
      var a = (ai || []).find(r => r.term === w.term);
      return !w.zh && a && a.zh ? {
        ...w,
        zh: a.zh
      } : w;
    });
    var items = window.qsBuildItems({
      words: merged,
      title,
      kinds,
      ai,
      story,
      sense
    }); // v406: story＝短文填空／v487: sense＝字義選擇
    /* 🔴 v487：本來一聲不吭就關掉——老師看到的就是「按了確認，什麼都沒發生」。
       跟 v473 同一個教訓：生不出來不可以安靜地少一個單元，一定要講出來。 */
    if (!items.length) {
      setQuickSetOpen(false);
      setRegenFor(null);
      showToast('這次沒有生出任何單元——勾的題型都還沒有題目，請先按「AI 出題」再建立');
      return;
    }
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) {
      showToast('請先選一個週次');
      return;
    }
    if (!w[weekId].items) w[weekId].items = {};
    if (!Array.isArray(w[weekId].items[cat])) w[weekId].items[cat] = [];
    w[weekId].items[cat] = w[weekId].items[cat].concat(items);

    /* v380: 整組一次指派——不用建好之後再一份一份設。
       學期＝整組設成本週作業（同一個截止日）；暑假題庫＝寫進每位學生的派發清單。 */
    var assignedNote = '';
    if (assign && assign.dueDate) {
      if (!w[weekId].homework) w[weekId].homework = {};
      items.forEach(it => {
        w[weekId].homework[it.id] = {
          dueDate: assign.dueDate
        };
      });
      assignedNote = ` · 已設為作業（${assign.dueDate} 到期）`;
    }
    setWeeks(w);
    saveWeeksSafe(w);
    if (assign && assign.students && assign.students.length && window.saveSummerStudent) {
      var suffix = String(weekId).split('-').pop(); // 例 sl-2026-SW08 → SW08
      var metaNow = summerMetaRef.current && summerMetaRef.current.students || {};
      Promise.all(assign.students.map(email => {
        var key = String(email).toLowerCase();
        var prev = metaNow[key] || {
          name: '',
          weeks: {}
        };
        var weeksMap = {
          ...(prev.weeks || {})
        };
        var have = Array.isArray(weeksMap[suffix]) ? weeksMap[suffix] : [];
        weeksMap[suffix] = have.concat(items.map(it => it.id).filter(id => have.indexOf(id) < 0));
        return window.saveSummerStudent(key, {
          ...prev,
          weeks: weeksMap
        });
      })).then(() => showToast(`已指派給 ${assign.students.length} 位學生`)).catch(() => showToast('指派失敗，請到後台再指派一次'));
      assignedNote = ` · 指派中…`;
    }
    setQuickSetOpen(false);
    setOpenCat(cat);
    showToast(`已建立 ${items.length} 個練習 · ${merged.length} 個單字${assignedNote}`);
  };

  /* v382: 時態出題完成 → 建立成多個單元（Type A→type-answer、Type B→cloze），
     全部丟進「該時態」那個分類底下，並掛同一個 group。 */
  /* v386: 閱讀理解出題完成 → 建立 1~4 個單元（選擇題 / 閱讀技巧題 / 閱讀技巧活動 / 閱讀簡答），
     全部掛同一個 group（＝文章標題），順序交給 QM_TYPE_ORDER 排。
     指派的兩條路跟 handleQuickSet 一樣：學期年級用 week.homework，暑假用 summer_meta。 */
  var handleReadingCreate = ({
    title,
    cat,
    passage,
    mcq,
    sa,
    blocks,
    skillQs,
    background,
    assign,
    prebuilt
  }) => {
    // v415: skillQs ＝ 閱讀技巧題（多一個 quiz 單元）
    // v428: ✏️ 出文法也走這裡（prebuilt＝已經建好的單元）——存檔、作業期限、指派的邏輯一模一樣
    // v436：background＝讀之前的互動式背景知識（會變成一個 lesson 單元，其他單元要學完才解鎖）
    var items = prebuilt || window.rcBuildItems({
      title,
      passage,
      mcq,
      sa,
      blocks,
      skillQs,
      background
    });
    if (!items.length) {
      showToast('沒有可以建立的題目');
      return;
    }
    // 蓋上作者：後台「只看我的」會依 owner 篩，沒蓋的話老師看不到自己剛生的單元
    var me = (user && user.email || '').toLowerCase();
    if (me) items.forEach(it => {
      it.owner = me;
    });
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) {
      showToast('請先選一個週次');
      return;
    }
    if (!w[weekId].items) w[weekId].items = {};
    if (!Array.isArray(w[weekId].items[cat])) w[weekId].items[cat] = [];
    w[weekId].items[cat] = w[weekId].items[cat].concat(items);
    var note = '';
    if (assign && assign.dueDate) {
      if (!w[weekId].homework) w[weekId].homework = {};
      items.forEach(it => {
        w[weekId].homework[it.id] = {
          dueDate: assign.dueDate
        };
      });
      note = ` · 已設為作業（${assign.dueDate} 到期）`;
    }
    setWeeks(w);
    saveWeeksSafe(w);
    if (assign && assign.students && assign.students.length && window.saveSummerStudent) {
      var suffix = String(weekId).split('-').pop();
      var metaNow = summerMetaRef.current && summerMetaRef.current.students || {};
      Promise.all(assign.students.map(email => {
        var key = String(email).toLowerCase();
        var prev = metaNow[key] || {
          name: '',
          weeks: {}
        };
        var weeksMap = {
          ...(prev.weeks || {})
        };
        var have = Array.isArray(weeksMap[suffix]) ? weeksMap[suffix] : [];
        weeksMap[suffix] = have.concat(items.map(it => it.id).filter(id => have.indexOf(id) < 0));
        return window.saveSummerStudent(key, {
          ...prev,
          weeks: weeksMap
        });
      })).then(() => showToast(`已指派給 ${assign.students.length} 位學生`)).catch(() => showToast('指派失敗，請到後台再指派一次'));
      note = ' · 指派中…';
    }
    setRcGenOpen(false);
    setGnGenOpen(false);
    setOpenCat(cat);
    var names = items.map(it => it.type === 'type-answer' ? it.variant === 'translate' ? '中翻英' : '填空' : {
      quiz: '選擇題',
      'reading-skill': '閱讀技巧',
      'short-answer': '閱讀簡答',
      lesson: '互動教學'
    }[it.type] || it.type).join('、');
    showToast(`已建立 ${items.length} 個單元 · ${names}${note}`);
  };

  // v428: ✏️ 出文法
  var handleGrammarNotesCreate = payload => {
    var items = window.gnBuildItems(payload);
    handleReadingCreate({
      cat: payload.cat,
      assign: payload.assign,
      prebuilt: items
    });
  };
  var handleGrammarCreate = payload => {
    var items = window.grBuildItems(payload);
    if (!items.length) {
      setGrGenOpen(false);
      return;
    }
    var cat = payload.tense; // 分類 id 就是 t1~t5
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) {
      showToast('找不到題庫週次');
      return;
    }
    if (!w[weekId].items) w[weekId].items = {};
    if (!Array.isArray(w[weekId].items[cat])) w[weekId].items[cat] = [];
    w[weekId].items[cat] = w[weekId].items[cat].concat(items);
    setWeeks(w);
    saveWeeksSafe(w);
    setGrGenOpen(false);
    setOpenCat(cat);
    var nA = items.filter(i => i.type === 'type-answer').length;
    var nB = items.filter(i => i.type === 'cloze').length;
    showToast(`已建立 ${items.length} 個單元 · 單句 ${nA} 組、短文 ${nB} 篇`);
  };
  var handleAddItem = (catId, assignEmail, groupOptions) => {
    // Pre-generate final ID so the PDF storage path is stable before save.
    // Include random suffix to avoid collisions if called rapidly.
    var newId = catId[0] + Date.now() + Math.random().toString(36).slice(2, 6);
    setEditorCat(catId);
    setEditorAssign(assignEmail || null); // v351: 篩選到某位學生時出的題目 → 存檔後直接指派給他
    // v374(#5): 分組選單只列「目前畫面上看得到的」分組——在某位學生底下出題時，
    //           就只會出現他有的那幾組，不用從全班所有分組裡面找
    setEditorGroups(Array.isArray(groupOptions) ? groupOptions : null);
    setEditorDraft({
      id: newId,
      _isNew: true,
      type: "flashcard",
      // v306: 原本預設 quizlet（已下架、學生看不到）→ 改成會顯示的單字卡
      title: "",
      zh: "",
      duration: "",
      url: "",
      embed: "",
      body: ""
    });
    setEditorOpen(true);
  };
  var handleEditItem = item => {
    var catId = Object.keys(week.items).find(k => week.items[k].some(it => it.id === item.id));
    setEditorCat(catId);
    setEditorAssign(null); // 編輯既有單元不動指派（要改指派用單元列的 👤）
    setEditorGroups(null); // 編輯既有單元＝列出整個分類的分組（不限縮）
    setEditorDraft({
      ...item
    });
    setEditorOpen(true);
  };
  var handleSaveItem = form => {
    /* v407：__side ＝「順便一起建立的別種單元」。目前只有一個來源——
       分段閱讀的 🤖 AI 自動出題勾了「閱讀技巧」，而閱讀技巧是另一個 type，
       塞不進 grSegments/grFinal。⚠ 一定要在這裡解構掉，不然會被存進 Firestore。 */
    var {
      _isNew,
      __side,
      ...cleanForm
    } = form;
    var isNew = !!_isNew;
    // v339: 多位老師共用題庫——記下是誰建立的，側欄才能「只看我的單元」。
    // 舊資料沒有 owner，一律視為擁有者(Alan)的。
    if (isNew && !cleanForm.owner) {
      var me = window._currentUser && window._currentUser.email;
      if (me) cleanForm.owner = String(me).toLowerCase();
    }
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) {
      w[weekId] = {
        ...week,
        items: {
          vocab: [],
          grammar: [],
          word: [],
          reading: []
        }
      };
    }
    var list = w[weekId].items[editorCat] || [];
    var saved = isNew ? [...list, cleanForm] : list.map(it => it.id === cleanForm.id ? cleanForm : it);
    /* 附帶單元接在本體後面，owner 跟著本體走（側欄的「只看我的單元」才篩得到）。
       id 撞到就不加——重複 id 會讓側欄與作答進度整個對不上。 */
    var side = (Array.isArray(__side) ? __side : []).filter(x => x && x.id && x.type).filter(x => !saved.some(it => it.id === x.id)).map(x => cleanForm.owner && !x.owner ? {
      ...x,
      owner: cleanForm.owner
    } : x);
    w[weekId].items[editorCat] = saved.concat(side);
    setWeeks(w);
    saveWeeksSafe(w);
    setEditorOpen(false);
    // v351: 在某位學生的篩選底下出的新題目 → 直接寫進他的暑假發派清單，
    //       存完就出現在他的篩選（也就是他的任務）底下，不必再勾一次 👤。
    var assignedName = '';
    if (isNew && editorAssign && String(weekId || '').startsWith('sl') && window.saveSummerStudent) {
      var email = String(editorAssign).toLowerCase();
      var sfx = window.summerWeekSuffix ? window.summerWeekSuffix(weekId) : String(weekId).split('-').pop();
      var plan = (summerMeta.students || {})[email] || {};
      var weeksPlan = {
        ...(plan.weeks || {})
      };
      var cur = new Set(weeksPlan[sfx] || []);
      cur.add(cleanForm.id);
      weeksPlan[sfx] = Array.from(cur);
      assignedName = _englishName(plan.name || '') || email.split('@')[0];
      Promise.resolve(window.saveSummerStudent(email, {
        ...plan,
        name: plan.name || '',
        weeks: weeksPlan
      })).catch(() => showToast(`已存檔，但指派給 ${assignedName} 失敗——請用單元列的 👤 再試一次`));
    }
    setEditorAssign(null);
    // v360: 新出的單元在暑假題庫 → 直接把「指派給哪些學生」打開，一次勾多人
    if (isNew && String(weekId || '').startsWith('sl') && window.isAdminUser && window.isAdminUser(window._currentUser)) {
      setAssignAfterSave(cleanForm.id);
    }
    var nSide = side.length; // 用真的加進去的數量，不是 __side 的長度（重存時會被去重擋掉）
    showToast(nSide ? `已存檔，另外建立了 ${nSide} 個附帶單元` : isNew ? assignedName ? `已新增並指派給 ${assignedName}` : "Item added" : "Item saved");
  };

  // v360: 依「完整的 id 順序」重排單元——群組內互換、整組上下移都走這裡。
  //       只接受「完整排列」（跟現有清單同一組 id），避免篩選中的畫面把沒列到的單元弄丟。
  var handleReorderItems = (catId, orderedIds) => {
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    var list = w[weekId]?.items?.[catId];
    if (!list || !Array.isArray(orderedIds)) return;
    var byId = new Map(list.map(it => [it.id, it]));
    if (orderedIds.length !== list.length || orderedIds.some(id => !byId.has(id))) return; // 不是完整排列＝不動
    w[weekId].items[catId] = orderedIds.map(id => byId.get(id));
    setWeeks(w);
    saveWeeksSafe(w);
  };

  // v364: 依單元名稱（Unit 21、Unit 22…）自動把文章跟同名的單字卡配對，一次配完整個分類
  var unitKeyOf = it => {
    var m = String(it && (it.group || it.title) || '').match(/unit\s*0*(\d+)/i);
    return m ? 'u' + m[1] : null;
  };
  var handleAutoLinkFlashcards = catId => {
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    var wk = w[weekId];
    if (!wk) return;
    var all = Object.values(wk.items || {}).flat();
    var fcByKey = new Map();
    all.filter(it => it.type === 'flashcard' && (it.cards || []).length > 0).forEach(f => {
      var k = unitKeyOf(f);
      if (k && !fcByKey.has(k)) fcByKey.set(k, f);
    });
    // ⚠ 只靠 Unit 編號配對會出事：實際資料裡「Unit 21 食物鏈」的文章會配到「Unit 21 固體液體」
    //   的單字卡（兩套教材都用 Unit 編號）。所以一律先把配對結果攤開來讓老師確認再寫。
    var pairs = [],
      miss = [];
    (wk.items[catId] || []).forEach(it => {
      if (it.type !== 'guided-reading') return;
      var k = unitKeyOf(it);
      var fc = k ? fcByKey.get(k) : null;
      if (!fc) {
        miss.push(it.title || it.id);
        return;
      }
      if (it.linkedFlashcardId === fc.id) return; // 已經是這張了
      pairs.push({
        it,
        fc
      });
    });
    if (!pairs.length) {
      showToast(miss.length ? '找不到同編號的單字卡（單元名稱要含 Unit 數字）' : '都已經配對好了');
      return;
    }
    var lines = pairs.map(p => `・${p.it.title || p.it.id}\n    → ${p.fc.title || p.fc.id}`).join('\n');
    if (!confirm(`依 Unit 編號找到 ${pairs.length} 組配對，請先確認主題對不對：\n\n${lines}\n\n` + (miss.length ? `（${miss.length} 篇沒有 Unit 編號，會略過）\n\n` : '') + `⚠️ 編號一樣不代表內容一樣——不對的話按取消，改用每篇自己選。\n確定要綁定嗎？`)) return;
    pairs.forEach(p => {
      p.it.linkedFlashcardId = p.fc.id;
    });
    setWeeks(w);
    saveWeeksSafe(w);
    showToast(`已配對 ${pairs.length} 篇文章`);
  };

  // v367: 群組層級的參考資料——一個群組（例：Grandma and the great gourd）最上面
  //        可以掛文章的 YouTube／檔案／說明，底下的選擇題、手寫題、reading skill 共用。
  //        存在 week.groupRes，key = `分類::群組名`（同名群組可能同時存在不同分類）。
  var groupResKey = (catId, group) => `${catId}::${String(group || '').trim()}`;
  var handleSaveGroupRes = (catId, group, patch) => {
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    var wk = w[weekId];
    if (!wk) return;
    if (!wk.groupRes) wk.groupRes = {};
    var k = groupResKey(catId, group);
    var next = {
      ...(wk.groupRes[k] || {}),
      ...patch
    };
    // 三個欄位都空了就整筆刪掉，不要留空殼
    if (!next.yt && !next.fileUrl && !String(next.note || '').trim()) delete wk.groupRes[k];else wk.groupRes[k] = next;
    setWeeks(w);
    saveWeeksSafe(w);
  };
  var handleMoveItem = (catId, itemId, dir) => {
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    var list = w[weekId]?.items?.[catId];
    if (!list) return;
    var i = list.findIndex(it => it.id === itemId);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setWeeks(w);
    saveWeeksSafe(w);
  };
  var handleMoveTypeGroup = (catId, type, dir) => {
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    var list = w[weekId]?.items?.[catId];
    if (!list) return;
    var seenTypes = [];
    list.forEach(it => {
      if (!seenTypes.includes(it.type)) seenTypes.push(it.type);
    });
    var ti = seenTypes.indexOf(type);
    var si = ti + dir;
    if (ti < 0 || si < 0 || si >= seenTypes.length) return;
    [seenTypes[ti], seenTypes[si]] = [seenTypes[si], seenTypes[ti]];
    var byType = {};
    list.forEach(it => {
      (byType[it.type] = byType[it.type] || []).push(it);
    });
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
  var stripItemsFrom = (wk, ids) => {
    if (!wk || !wk.items || !ids || !ids.size) return;
    Object.keys(wk.items).forEach(k => {
      wk.items[k] = (wk.items[k] || []).filter(it => !ids.has(it.id));
    });
    ids.forEach(id => {
      if (wk.homework && wk.homework[id]) delete wk.homework[id];
    });
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
  var handleDeleteItems = itemIds => {
    var ids = new Set((itemIds || []).filter(Boolean));
    if (!ids.size) return;
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    stripItemsFrom(w[weekId], ids); // 單元＋孤兒作業＋別人指向它的鎖，一起清
    setWeeks(w);
    saveWeeksSafe(w);
    setEditorOpen(false);
    showToast(ids.size > 1 ? `已刪掉 ${ids.size} 個單元` : 'Item deleted');
  };
  var handleDeleteItem = itemId => handleDeleteItems([itemId]);

  // ── Homework handler ────────────────────────────────────
  var handleSetHomework = (itemId, hwData) => {
    // hwData = { dueDate: 'YYYY-MM-DD' } to set, null to remove
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) return;
    if (!w[weekId].homework) w[weekId].homework = {};
    if (hwData) w[weekId].homework[itemId] = hwData;else delete w[weekId].homework[itemId];
    setWeeks(w);
    saveWeeksSafe(w);
    showToast(hwData ? "設定作業 ✓" : "取消作業");
  };

  /* v454（Alan：「我只能一個一個去改日期…希望可以一整包一起去改」）：
     一次設／取消一整組的截止日——只寫一次 Firestore（一個一個設會存 N 次）。 */
  var handleSetHomeworkMany = (itemIds, hwData) => {
    var ids = (itemIds || []).filter(Boolean);
    if (!ids.length) return;
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) return;
    if (!w[weekId].homework) w[weekId].homework = {};
    ids.forEach(id => {
      if (hwData) w[weekId].homework[id] = hwData;else delete w[weekId].homework[id];
    });
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
  var handleCreateReview = ({
    targetWeekId,
    catId,
    groupName,
    words,
    ai,
    story,
    sense,
    kinds,
    dueDate,
    grammar,
    topic
  }) => {
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[targetWeekId]) {
      showToast('找不到那一週');
      return;
    }
    var title = `${groupName} · 複習`;
    /* v469：文法的複習走 gnBuildItems。
       ⚠ lesson 傳 null＝不重出互動教學（那一課教的東西沒變），
         所以也不會有 requires，學生進去就能直接練。 */
    var built = grammar ? window.gnBuildItems({
      title,
      topic,
      srcNotes: '',
      lesson: null,
      mcq: grammar.mcq,
      fill: grammar.fill,
      tr: grammar.tr,
      rw: grammar.rw,
      write: grammar.write,
      tf: grammar.tf,
      ord: grammar.ord,
      edit: grammar.edit,
      diag: grammar.diag,
      circle: grammar.circle,
      sort: grammar.sort,
      circleSets: grammar.circleSets,
      sortSets: grammar.sortSets,
      caseMatters: grammar.caseMatters
    }) : window.qsBuildItems({
      words,
      title,
      kinds,
      ai,
      story,
      sense
    }); // v473：字義選擇也要傳下去
    if (!built.length) {
      showToast('沒有產生任何單元');
      return;
    }
    if (!w[targetWeekId].items) w[targetWeekId].items = {
      vocab: [],
      grammar: [],
      word: [],
      reading: []
    };
    if (!w[targetWeekId].items[catId]) w[targetWeekId].items[catId] = [];
    if (dueDate && !w[targetWeekId].homework) w[targetWeekId].homework = {};
    var taken = new Set(Object.values(w[targetWeekId].items).flat().map(it => it.id));
    built.forEach(it => {
      var id = it.id,
        n = 2;
      while (taken.has(id)) {
        id = `${it.id}-${n}`;
        n++;
      }
      taken.add(id);
      w[targetWeekId].items[catId].push({
        ...it,
        id
      });
      if (dueDate) w[targetWeekId].homework[id] = {
        dueDate
      };
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
  var handleCopyGroupToWeeks = (catId, items, targetWeekIds, dueDate, move) => {
    var list = (items || []).filter(x => x && x.id);
    if (!list.length || !(targetWeekIds || []).length) return;
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    var copied = 0,
      weeksTouched = 0;
    targetWeekIds.forEach(tw => {
      if (!w[tw]) return;
      if (!w[tw].items) w[tw].items = {
        vocab: [],
        grammar: [],
        word: [],
        reading: []
      };
      if (!w[tw].items[catId]) w[tw].items[catId] = [];
      if (dueDate && !w[tw].homework) w[tw].homework = {};
      var any = false;
      list.forEach(item => {
        var taken = new Set(Object.values(w[tw].items).flat().map(it => it.id));
        var id = item.id,
          n = 2;
        while (taken.has(id)) {
          id = `${item.id}-${n}`;
          n++;
        }
        var clone = JSON.parse(JSON.stringify(item));
        clone.id = id;
        /* ⚠ 組內互相指向的 id（教學卡的鎖 requires、單字卡的 linkedFlashcardId）
           要跟著換成複製後的新 id，不然到了新的一週會鎖著一個不存在的單元。 */
        clone.__oldId = item.id;
        w[tw].items[catId].push(clone);
        if (dueDate) w[tw].homework[id] = {
          dueDate
        };
        copied++;
        any = true;
      });
      // 第二輪：把 requires／linkedFlashcardId 對到這一週的新 id
      var map = {};
      w[tw].items[catId].forEach(it => {
        if (it.__oldId) map[it.__oldId] = it.id;
      });
      w[tw].items[catId].forEach(it => {
        if (!it.__oldId) return;
        if (it.requires && map[it.requires]) it.requires = map[it.requires];
        if (it.linkedFlashcardId && map[it.linkedFlashcardId]) it.linkedFlashcardId = map[it.linkedFlashcardId];
        delete it.__oldId;
      });
      if (any) weeksTouched++;
    });
    if (!copied) {
      showToast('沒有可沿用的週');
      return;
    }
    if (move) stripItemsFrom(w[weekId], new Set(list.map(it => it.id)));
    setWeeks(w);
    saveWeeksSafe(w);
    var toLabel = w[targetWeekIds[0]] && (w[targetWeekIds[0]].label || targetWeekIds[0]) || targetWeekIds[0];
    showToast(move ? `整組 ${list.length} 個單元已搬到「${toLabel}」✓` : `整組 ${list.length} 個單元已沿用到 ${weeksTouched} 週${dueDate ? '，並設成作業' : ''} ✓`);
  };

  // v294: 沿用題目到其他週——深拷貝一份（各週獨立；進度分開算，因 key = weekId_itemId）。
  // 只帶內容，不自動設為作業（老師到目標週再用 📌 指派）。
  var handleCopyItemToWeeks = (catId, item, targetWeekIds) => {
    if (!item || !targetWeekIds || !targetWeekIds.length) return;
    var w = JSON.parse(JSON.stringify(weeksRef.current));
    var copied = 0;
    targetWeekIds.forEach(tw => {
      if (!w[tw]) return; // 只沿用到已存在的週
      if (!w[tw].items) w[tw].items = {
        vocab: [],
        grammar: [],
        word: [],
        reading: []
      };
      if (!w[tw].items[catId]) w[tw].items[catId] = [];
      var taken = new Set(Object.values(w[tw].items).flat().map(it => it.id));
      var id = item.id,
        n = 2;
      while (taken.has(id)) {
        id = `${item.id}-${n}`;
        n++;
      } // 目標週內 id 撞了就換一個
      var clone = JSON.parse(JSON.stringify(item));
      clone.id = id;
      w[tw].items[catId].push(clone);
      copied++;
    });
    if (!copied) {
      showToast('沒有可沿用的週');
      return;
    }
    setWeeks(w);
    saveWeeksSafe(w);
    showToast(`已沿用到 ${copied} 週 ✓`);
  };

  // v255: 所有題型完成時刷新大廳進度（saveQuizModeCompletion 會呼叫）
  window._bumpQmProgress = () => setQmProgressVersion(v => v + 1);

  // ── Quiz complete handler (streak + XP + badges) ────────
  window._onQuizComplete = async (score, total, wrongList, meta = {}) => {
    var u = window._currentUser;
    setQmProgressVersion(v => v + 1);

    // ── Local streak (works without login) ──
    var localResult = updateLocalStreak();
    setLocalStreak({
      count: localResult.count
    });
    if (localResult.isNew) {
      if (window.playSound) window.playSound('streak');
      setStreakToast({
        count: localResult.count
      });
      setTimeout(() => setStreakToast(null), 3200);
    }
    if (!u) return;
    // Update streak (Firestore — feeds the streak count shown to logged-in students)
    var {
      isNew
    } = await window.updateStreak(u.uid);
    if (isNew) window.playSound('streak');
    // Save wrong answers into the mistakes notebook
    if (meta.itemId && window.saveQuizMistakes) {
      await window.saveQuizMistakes(u.uid, u.displayName || '', u.email || '', meta.itemId, wrongList || []);
    }
  };

  // ── Grade selector handler ─────────────────────────────
  // 專屬年級記憶「跟著帳號走」：每個 Google 帳號一把 key（訪客用共用 key）
  var homeGradeKey = () => user && user.uid ? 'alan-home-grade:' + user.uid : 'alan-home-grade';
  var readHomeGrade = () => {
    try {
      return localStorage.getItem(homeGradeKey());
    } catch (e) {
      return null;
    }
  };

  // 只切資料，不動「已進入」狀態（門口頁 / 帳號切換共用）
  var applyGradeData = g => {
    // Immediately load the correct grade's data so the page never
    // flashes the previous grade's content while Firestore syncs.
    var newWeeks = _gradeOf(g, {
      g1: window.loadWeeksG1(),
      g2: window.loadWeeksG2(),
      g4: window.loadWeeksG4(),
      g5: window.loadWeeksG5(),
      g6: window.loadWeeksG6(),
      g3: window.loadWeeks(),
      summer: t => window.summerApi(t).loadWeeks(),
      grammar: window.loadWeeksGR()
    });
    var newOrder = _gradeOf(g, {
      g1: window.loadWeekOrderG1(),
      g2: window.loadWeekOrderG2(),
      g4: window.loadWeekOrderG4(),
      g5: window.loadWeekOrderG5(),
      g6: window.loadWeekOrderG6(),
      g3: window.loadWeekOrder(),
      summer: t => window.summerApi(t).loadWeekOrder(),
      grammar: window.loadWeekOrderGR()
    });
    try {
      localStorage.setItem('alan-grade', g);
    } catch (e) {}
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
  var handleSelectGrade = g => {
    /* v399: 有綁定就一律以綁定為準（防呆——正常情況下畫面上根本不會出現別的年級）。
       只擋「年級教室」與「暑假」這兩種；五大時態（gr）是跨年級的常設題庫，不屬於任何一班，
       之後對學生開放時不能被綁定擋在門外。 */
    var gradeLike = /^g\d$/.test(g) || !!(window.isSummerTrack && window.isSummerTrack(g));
    var target = boundGrade && gradeLike ? boundGrade : g;
    applyGradeData(target);
    // 記住這個帳號的專屬年級（暑假/題庫不算）；標記本 session 已進入
    if (/^g\d$/.test(target)) {
      try {
        localStorage.setItem(homeGradeKey(), target);
      } catch (e) {}
    }
    setEntered(true);
    try {
      sessionStorage.setItem('alan-entered', '1');
    } catch (e) {}
  };

  /* v399：把「現在在哪一班」拉回綁定的年級。會走到這裡的三種情況：
     ① 升年級（去年選過 G2、今年學號算出來是 G3）
     ② 暑假結束還停在 ☀️ 暑假 track
     ③ 有人手動改了 localStorage
     applyGradeData 會把 grade 設成 boundGrade，effect 再跑一次就相等、自然停住。 */
  useAppEffect(() => {
    if (!boundGrade) return;
    try {
      localStorage.setItem(homeGradeKey(), boundGrade);
    } catch (e) {}
    if (grade && grade !== boundGrade && !(window.isGrammarTrack && window.isGrammarTrack(grade))) applyGradeData(boundGrade);
  }, [boundGrade, grade]);

  // ── 帳號切換（登入／登出／換人）→ 回門口頁、載入「這個帳號」的年級 ──
  var prevUidRef = useAppRef(undefined);
  useAppEffect(() => {
    if (!authReady) return;
    var uid = user ? user.uid : null;
    if (prevUidRef.current === undefined) {
      prevUidRef.current = uid;
      return;
    } // 首次解析，不重置
    if (prevUidRef.current === uid) return;
    prevUidRef.current = uid;
    setEntered(false);
    try {
      sessionStorage.removeItem('alan-entered');
    } catch (e) {}
    setCatView(null);
    var hg = user && !window.isAdminUser(user) && window.gradeFromEmail(user.email) || readHomeGrade() || (user ? window.gradeFromEmail(user.email) : null);
    if (hg && /^g\d$/.test(hg)) {
      applyGradeData(hg); // 有自己的年級 → 門口頁顯示「進入 Gx 教室」
    } else {
      try {
        localStorage.removeItem('alan-grade');
      } catch (e) {}
      setGrade(null); // 新帳號第一次 → 選年級
    }
  }, [authReady, user?.uid]);

  // ── 暑假進出 ───────────────────────────────────────────
  var enterSummer = () => {
    if (!hasSummerPlan) return;
    try {
      if (grade && !window.isSummerTrack(grade)) localStorage.setItem('alan-sem-grade', grade);
    } catch (e) {}
    handleSelectGrade(window.SUMMER_ME || 'sme');
  };
  var backToSemester = () => {
    var g = null;
    try {
      g = localStorage.getItem('alan-sem-grade');
    } catch (e) {}
    if (!g) g = readHomeGrade();
    if (g && !(window.isSummerTrack && window.isSummerTrack(g))) {
      handleSelectGrade(g);
    } else {
      // 不知道原本年級 → 回到選年級畫面
      try {
        localStorage.removeItem('alan-grade');
      } catch (e) {}
      setGrade(null);
      setCatView(null);
      scrollPageToTop();
    }
  };

  // ── Determine what to render under the loading overlay ──────────────
  // LoadingScreen MUST stay in one fixed tree-position (Fragment child #1)
  // so React never unmounts/remounts it — that would reset its CSS animations.
  // All "early return" logic is folded into appContent below.
  var appContent = null;
  if (authReady) {
    if (viewLanding) {
      // "回首頁" from inside the app — show the landing again, with a way back.
      appContent = /*#__PURE__*/React.createElement(window.LoginScreen, {
        onLogin: () => {
          loginFromLandingRef.current = true;
          window.signInWithGoogle();
        },
        onSkip: () => {
          try {
            sessionStorage.setItem('alan-guest', '1');
          } catch (e) {}
          setSkippedLogin(true);
          setEntered(false);
          try {
            sessionStorage.removeItem('alan-entered');
          } catch (e) {}
          setViewLanding(false);
        },
        onBack: grade || skippedLogin || user ? () => runWave(() => setViewLanding(false)) : null,
        loggedIn: !!user,
        userName: user ? _englishName(user.displayName) || user.displayName || null : null,
        onLogout: user ? () => {
          if (confirm('要登出嗎？')) signOutWithFarewell(() => setViewLanding(false));
        } : null
      });
    } else if (accessLocked && !isTeacher) {
      appContent = /*#__PURE__*/React.createElement(window.LockScreen, {
        user: user,
        onLogin: () => window.signInWithGoogle(),
        onLogout: () => {
          window.signOutUser();
          try {
            sessionStorage.removeItem('alan-guest');
          } catch (e) {}
          setSkippedLogin(false);
          setAccessLocked(false);
        }
      });
    } else if (!user && !skippedLogin) {
      appContent = /*#__PURE__*/React.createElement(window.LoginScreen, {
        key: pageKey,
        onLogin: () => {
          loginFromLandingRef.current = true;
          window.signInWithGoogle();
        },
        onSkip: () => {
          try {
            sessionStorage.setItem('alan-guest', '1');
          } catch (e) {}
          setSkippedLogin(true);
          // 「先逛逛」一律先到門口頁
          setEntered(false);
          try {
            sessionStorage.removeItem('alan-entered');
          } catch (e) {}
        }
      });
    } else if (!grade || !entered) {
      // 門口頁：第一次選年級；之後每次開啟顯示「進入教室／暑假專區」
      // 年級記憶跟著帳號走（共用電腦的手足各自獨立）
      // 學校帳號（leNN…）自動判定年級 → 新同學第一次登入就直接看到自己的教室卡
      var homeGrade = boundGrade || readHomeGrade() || (user ? window.gradeFromEmail(user.email) : null);
      appContent = /*#__PURE__*/React.createElement(window.GradeSelector, {
        key: pageKey,
        onSelect: g => runWave(() => handleSelectGrade(g)),
        homeGrade: homeGrade,
        who: user ? _englishName(user.displayName) : null,
        summerOnly: summerOnlyDoor && !isTeacher && hasSummerPlan,
        onOpenAdmin: isTeacher ? () => setDashOpen(true) : null,
        onChangeGrade: g => {
          // 換年級 → 回門口頁（教室卡換成新年級），不直接進教室（太突兀）
          applyGradeData(g); // 會 bump pageKey → 門口頁 remount、進場動畫重播
          if (/^g\d$/.test(g)) {
            try {
              localStorage.setItem(homeGradeKey(), g);
            } catch (e) {}
          }
          // 保險：不管從哪條路進來換年級（logo／年級章），都不能殘留「已進入」
          setEntered(false);
          try {
            sessionStorage.removeItem('alan-entered');
          } catch (e) {}
        }
        /* v399（開學）：暑假入口從學生端收起來——開學後門口頁只留自己的教室。
           老師端保留「暑假題庫」（要回去看／改暑假的內容）。
           ⚠ 只是不顯示入口，暑假的資料完全沒動。 */,
        summer: isTeacher ? {
          lib: true,
          mine: hasSummerPlan,
          who: summerWho,
          prog: doorSummerProg
        } : summerOnlyDoor && hasSummerPlan ? {
          lib: false,
          mine: true,
          who: summerWho,
          prog: doorSummerProg
        } : null,
        lockedGrade: !!boundGrade,
        onViewLanding: () => runWave(() => setViewLanding(true)),
        onLogout: user ? () => {
          if (confirm('要換帳號嗎？')) signOutWithFarewell();
        } : null,
        onOpenGuide: homeGrade ? () => {
          // 門口頁「新手教學」→ 直接進自己的教室跑實境導覽
          // （還沒選過年級的人選完年級本來就會自動看到導覽，不顯示此連結）
          handleSelectGrade(homeGrade);
          setTimeout(() => setTourOpen(true), 400); // 等 scrollPageToTop / 進場落定
        } : null
      });
    }
  }

  // If authReady + grade, fall through to render the full .page below.
  // appContent stays null in that case.

  // Count wrong questions for the header badge (simple sum, no dedup needed for the count)
  var mistakesCount = useAppMemo(() => {
    var n = 0;
    Object.values(myProgressItems).forEach(p => {
      n += p?.wrongQuestions?.length || 0;
    });
    return n;
  }, [myProgressItems]);

  // ── Single return — LoadingScreen always at the same Fragment position ──
  // IMPORTANT: LoadingScreen must never change its tree position between renders.
  // If it does, React unmounts+remounts it and the CSS animations reset.
  // Solution: one Fragment, appContent slot first, LoadingScreen always last.
  return /*#__PURE__*/React.createElement(React.Fragment, null, farewell && /*#__PURE__*/React.createElement("div", {
    className: "app-farewell",
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-farewell-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-farewell-wave",
    "aria-hidden": "true"
  }, (() => {
    try {
      var P = window.mxPetOf && window.mxPetOf(window.mxGetPet());
      if (P && P.art) {
        var Art = P.art;
        return /*#__PURE__*/React.createElement(Art, {
          size: 66
        });
      }
    } catch (e) {}
    return '👋';
  })()), /*#__PURE__*/React.createElement("div", {
    className: "app-farewell-title"
  }, "\u671F\u5F85\u4E0B\u6B21\u898B\u9762"), /*#__PURE__*/React.createElement("div", {
    className: "app-farewell-sub"
  }, "\u6B63\u5728\u767B\u51FA\u2026"))), appContent ? appContent : authReady && grade && /*#__PURE__*/React.createElement("div", {
    key: pageKey,
    className: `page${!catView && !editMode ? ' page-lobby' : ''}${catView && !editMode ? ' page-mission' : ''}${isSummer ? ' page-summer' : ''}`
  }, /*#__PURE__*/React.createElement(window.Header, {
    week: week,
    weekOrder: viewOrder,
    weekIdx: weekIdx,
    onHome: () => {
      // v302: 品牌 logo 一律直接回「首頁封面」（Alan 指定）——不再回門口頁
      setCatView(null);
      setOpenCat(null);
      runWave(() => setViewLanding(true));
    },
    onPrevWeek: goPrevWeek,
    onNextWeek: goNextWeek,
    weeks: weeks,
    onGoWeek: goWeekId,
    canEdit: isTeacher,
    editMode: editMode,
    onToggleEdit: () => setEditMode(e => !e),
    onAddWeek: () => setWeekModalOpen(true),
    onTermSetup: window.isSummerTrack && window.isSummerTrack(grade) || window.isGrammarTrack && window.isGrammarTrack(grade) ? null : () => setTermOpen(true),
    onQuickSet: () => setQuickSetOpen(true),
    onGrammarGen: window.isGrammarTrack && window.isGrammarTrack(grade) ? () => setGrGenOpen(true) : null,
    onReadingGen: window.isGrammarTrack && window.isGrammarTrack(grade) ? null : () => setRcGenOpen(true),
    onGrammarNotes: window.isGrammarTrack && window.isGrammarTrack(grade) ? null : () => setGnGenOpen(true),
    onWordStudy: window.isGrammarTrack && window.isGrammarTrack(grade) ? null : () => setWsGenOpen(true),
    pace: paceWeek,
    nextF: paceNextF,
    onPacing: /^g[1-6]$/.test(String(grade)) ? () => setPaceOpen(true) : null
    /* 📝 v513：formative 那兩塊點下去＝考前複習包 */,
    onExamPrep: pacing && window.ExamPrepModal ? sd => setExamSide(sd) : null,
    onDeleteWeek: handleDeleteWeek,
    onArchiveWeek: handleArchiveWeek,
    onExport: () => setExportOpen(true),
    weekArchived: weekArchived(weeks[weekId]),
    progress: {
      done: totalDone,
      total: totalItems
    },
    user: user,
    onLogin: () => window.signInWithGoogle(),
    onLogout: () => {
      if (confirm('要登出嗎？')) {
        signOutWithFarewell(() => {
          setCatView(null);
          setEntered(false);
        });
      }
    },
    onShowDashboard: () => setDashOpen(true),
    streak: localStreak.count > 0 ? localStreak : user ? userProfile.streak : localStreak,
    onEditWeek: () => setWeekEditOpen(true),
    mistakesCount: mistakesCount,
    onShowMistakes: user ? () => setMistakesOpen(true) : null,
    grade: grade,
    compactLobby: !catView && !editMode,
    starBalance: starsTotal,
    onShowCheckin: user && !(window.isAdminUser && window.isAdminUser(user)) ? () => setCheckinOpen(true) : null,
    checkinDone: !!(window.computeCheckin && window.computeCheckin(myCheckin).signedToday),
    checkinStreak: window.computeCheckin ? window.computeCheckin(myCheckin).streak : 0,
    onShowStars: () => setStarsOpen(true)
    /* v399：年級由學號綁定的學生，右上角的年級章只是一個標籤，不能點去換班。 */,
    onSwitchGrade: boundGrade ? null : () => runWave(() => {
      try {
        localStorage.removeItem('alan-grade');
      } catch (e) {}
      setGrade(null);
      setCatView(null);
      // 跟 logo 一樣要清「已進入」——否則從門口改選年級會直接跳進教室
      setEntered(false);
      try {
        sessionStorage.removeItem('alan-entered');
      } catch (e) {}
      scrollPageToTop();
    })
  }), !catView && !editMode && /*#__PURE__*/React.createElement("div", {
    className: "lobby-deep",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: "deep-lite dl-a"
  }, "Aa"), /*#__PURE__*/React.createElement("span", {
    className: "deep-lite dl-c"
  }, "\u2713")), /*#__PURE__*/React.createElement("div", {
    key: weekId,
    className: slideDir ? `week-slide-${slideDir}` : ''
  }, catView ? /*#__PURE__*/React.createElement(window.QuizModeCategoryView, {
    key: `${catView.id}-${weekId}` /* v360: 換週次時重新掛載，才會吃到新那一週的單元 */,
    cat: catView,
    initialItemId: catView.itemId || null,
    items: (week.items || {})[catView.id] || [],
    weekId: weekId,
    cloudProg: qmProgress,
    onBack: () => {
      // v341: 剛剛是去補做舊週次的作業 → 返回時回到原本那一週
      if (returnWeekRef.current != null) {
        setWeekIdx(returnWeekRef.current);
        returnWeekRef.current = null;
      }
      setCatView(null);
      setMainKey(k => k + 1);
      scrollPageToTop();
    },
    editMode: editMode,
    onAddItem: handleAddItem,
    onEditItem: handleEditItem,
    onDeleteItem: handleDeleteItem,
    onMoveItem: (itemId, dir) => handleMoveItem(catView.id, itemId, dir),
    onReorderItems: ids => handleReorderItems(catView.id, ids),
    weekAllItems: weekAllItems,
    onAutoLinkFlashcards: () => handleAutoLinkFlashcards(catView.id),
    groupRes: week && week.groupRes || {},
    onSaveGroupRes: (g, patch) => handleSaveGroupRes(catView.id, g, patch),
    openAssignFor: assignAfterSave,
    onAssignOpened: () => setAssignAfterSave(null),
    weekChoices: weekOrder.filter(id => id !== weekId).map(id => ({
      id,
      label: weeks[id] && (weeks[id].label || weeks[id].id) || id,
      sub: weeks[id] ? [weeks[id].dateRange, weeks[id].theme].filter(Boolean).join(' · ') : ''
    })),
    onCopyToWeeks: (item, targetIds) => handleCopyItemToWeeks(catView.id, item, targetIds),
    onCopyGroupToWeeks: (items, targetIds, due, move) => handleCopyGroupToWeeks(catView.id, items, targetIds, due, move)
    /* 🔴 v474（Alan：「這份很明顯就是單字，幹嘛還要選？」
           「選完之後我還要再貼一次單字？這太笨了，因為我本來就有單字了啊」）：
       看得出這一組在教什麼，就直接開那一個生成視窗，而且把現成的內容先填好。
       ⚠ 真的認不出來才退回「要出哪一種」那個選單。 */,
    onDeleteGroup: (gName, gItems) => handleDeleteItems((gItems || []).map(it => it.id)),
    onRegenGroup: (catId, name, gItems) => {
      var ws = window.reviewWordsOf && window.reviewWordsOf(gItems) || [];
      if (ws.length >= 2) {
        // 單字組：單字表照 QuickSetModal 吃的格式組回去（英文 - 中文 - 例句 - 英文定義）
        var text = ws.map(x => [x.term, x.zh, x.example, x.def].filter(Boolean).join(' - ')).join('\n');
        /* v475（Alan：「我只是這一組忘記生成哪一個，不應該全部重刪掉再生成一次」）：
           已經有的題型先取消勾選，預設只補還沒有的。
           ⚠ 圖片沒辦法用文字帶（單字表是純文字），所以另外給一張「單字→圖片」對照表，
             解析完再貼回去——不然補出來的單字卡又是白的。 */
        var imgs = {};
        ws.forEach(x => {
          if (x.imageUrl) imgs[String(x.term).toLowerCase()] = x.imageUrl;
        });
        setRegenFor({
          catId,
          name,
          pick: false,
          text,
          images: imgs,
          have: window.qsKindsInGroup && window.qsKindsInGroup(gItems) || []
        });
        setQuickSetOpen(true);
        return;
      }
      var gm = window.reviewGrammarOf && window.reviewGrammarOf(gItems) || null;
      if (gm) {
        setRegenFor({
          catId,
          name,
          pick: false,
          text: gm.notes || ''
        });
        setGnGenOpen(true);
        return;
      }
      setRegenFor({
        catId,
        name,
        pick: true
      });
    },
    onReviewGroup: (catId, name, gItems) => setReviewFor({
      catId,
      name,
      items: gItems
    }),
    onSetHomeworkMany: handleSetHomeworkMany,
    homework: week.homework || {},
    onSetHomework: handleSetHomework,
    weekQuizItems: weekQuizItems,
    getNextTask: getNextTask,
    onOpenTask: (cat, itemId) => {
      setCatView({
        ...cat,
        itemId
      });
      scrollPageToTop();
    }
  }) : /*#__PURE__*/React.createElement("div", {
    key: mainKey,
    className: "shell main-enter"
  }, !editMode && /*#__PURE__*/React.createElement("button", {
    className: "lobby-back",
    onClick: () => runWave(() => {
      setCatView(null);
      setOpenCat(null);
      setEntered(false);
      try {
        sessionStorage.removeItem('alan-entered');
      } catch (e) {}
      scrollPageToTop();
    })
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u2190"), "\u4E0A\u4E00\u9801"), !editMode && (isTeacher || viewOrder.length > 0) && /*#__PURE__*/React.createElement(window.WeekHero, {
    week: week,
    weekIdx: weekIdx,
    weekOrder: viewOrder,
    done: totalDone,
    total: totalItems,
    who: isSummer && !isSummerLib ? summerWho : null,
    onPrevWeek: goPrevWeek,
    onNextWeek: goNextWeek,
    weeks: weeks,
    onGoWeek: goWeekId,
    weekAvg: weekAvgScore,
    onOpenGrowth: () => setGrowthOpen(true)
  }), !editMode && !isSummerLib && getNextTask(null) && /*#__PURE__*/React.createElement("div", {
    className: "wh-task-cue",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "26",
    height: "26",
    stroke: "currentColor",
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 9l7 7 7-7"
  }))), editMode ? /*#__PURE__*/React.createElement(window.WeeklyContactBook, {
    week: week,
    allItems: allItems,
    qmProg: qmProgress,
    weekId: weekId,
    categories: activeCategories,
    onEnterCat: cat => {
      setCatView(cat);
      scrollPageToTop();
    },
    editMode: editMode,
    onUpdateWeek: patch => {
      var w = JSON.parse(JSON.stringify(weeksRef.current));
      if (!w[weekId]) return;
      w[weekId] = {
        ...w[weekId],
        ...patch
      };
      setWeeks(w);
      saveWeeksSafe(w);
    }
  }) : isSummerLib ? (/* v317 (#6): Alan 要求移除「📌 題庫模式」說明卡（不必要）。 */
  null) : !isTeacher && viewOrder.length === 0 ? null : /*#__PURE__*/React.createElement(window.TodayTasks, {
    week: week,
    allItems: allItems,
    qmProg: qmProgress,
    weekId: weekId,
    categories: activeCategories,
    onOpenTask: (cat, itemId) => {
      setCatView({
        ...cat,
        itemId
      });
      scrollPageToTop();
    }
    /* v340: 之前週次沒完成的作業也要看得到（不然週次一過就「作業不見了」） */,
    weeks: weeks,
    weekOrder: viewOrder,
    onOpenPastTask: (wid, cat, itemId) => {
      var idx = viewOrder.indexOf(wid);
      if (idx >= 0 && idx !== weekIdx) {
        returnWeekRef.current = weekIdx; // 記住原本這一週，補完就回來
        setWeekIdx(idx);
      }
      setCatView({
        ...cat,
        itemId
      });
      scrollPageToTop();
    }
  }), !isTeacher && viewOrder.length === 0 ?
  /*#__PURE__*/
  /* v377: 這個年級一週內容都還沒有 → 講清楚，不要顯示一排空白週次 */
  React.createElement("div", {
    className: "week-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "week-empty-ico"
  }, "\uD83D\uDCDA"), /*#__PURE__*/React.createElement("div", {
    className: "week-empty-title"
  }, "\u8001\u5E2B\u6B63\u5728\u6E96\u5099\u9019\u500B\u5E74\u7D1A\u7684\u5167\u5BB9"), /*#__PURE__*/React.createElement("div", {
    className: "week-empty-sub"
  }, "\u8AB2\u7A0B\u4E00\u653E\u4E0A\u4F86\uFF0C\u9019\u88E1\u5C31\u6703\u51FA\u73FE\u672C\u9031\u8981\u7DF4\u7684\u6771\u897F\u3002"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: () => runWave(() => setViewLanding(true))
  }, "\u2190 \u56DE\u9996\u9801")) : /*#__PURE__*/React.createElement(window.QuizModeBlocks, {
    week: week,
    weekId: weekId,
    cloudProg: qmProgress
    /* v505：v464 的「可以先複習上一週」Alan 要求拿掉，這條路一起收掉 */,
    onEnterCat: cat => {
      setCatView(cat);
      scrollPageToTop();
    },
    editMode: editMode,
    categories: activeCategories,
    onUpdateWeek: patch => {
      var w = JSON.parse(JSON.stringify(weeksRef.current));
      if (!w[weekId]) return;
      w[weekId] = {
        ...w[weekId],
        ...patch
      };
      setWeeks(w);
      saveWeeksSafe(w);
    },
    onAddItem: handleAddItem
  }), !editMode && viewOrder.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "growth-summary-row"
  }, !editMode && user && window.TeacherLog && /*#__PURE__*/React.createElement(window.TeacherLog, {
    email: String(user.email || '').toLowerCase()
  }), /*#__PURE__*/React.createElement(window.GrowthInlineCard, {
    weeks: weeks,
    weekOrder: viewOrder,
    qmProg: qmProgress,
    categories: activeCategories,
    isSummer: isSummer,
    onOpen: () => setGrowthOpen(true)
  }), /*#__PURE__*/React.createElement(window.WeekSummaryTiles, {
    done: totalDone,
    total: totalItems,
    avg: weekAvgScore,
    streak: localStreak.count || (user && userProfile.streak ? userProfile.streak.count : 0)
  })))), (!catView || editMode) && /*#__PURE__*/React.createElement(window.Footer, {
    onOpenGuide: () => setTourOpen(true)
  }), (catView || editMode) && /*#__PURE__*/React.createElement(window.MobileNav, {
    week: week,
    weekIdx: weekIdx,
    weekOrder: viewOrder,
    onPrevWeek: goPrevWeek,
    onNextWeek: goNextWeek,
    weeks: weeks,
    onGoWeek: goWeekId,
    catView: catView,
    onBackFromCat: () => {
      setCatView(null);
      scrollPageToTop();
    },
    user: user
  }), /*#__PURE__*/React.createElement(window.EditorModal, {
    open: editorOpen,
    draft: editorDraft,
    weekId: weekId,
    catItems: editorCat ? week.items[editorCat] || [] : [],
    weekItems: weekAllItems,
    groupOptions: editorGroups,
    onClose: () => setEditorOpen(false),
    onSave: handleSaveItem,
    onDelete: handleDeleteItem
  }), /*#__PURE__*/React.createElement(window.WeekModal, {
    open: weekModalOpen,
    existingIds: weekOrder,
    onClose: () => setWeekModalOpen(false),
    onSave: handleAddWeek
  }), /*#__PURE__*/React.createElement(window.GrammarGenModal, {
    open: grGenOpen,
    defaultTense: openCat && /^t[1-5]$/.test(openCat) ? openCat : 't1',
    onClose: () => setGrGenOpen(false),
    onCreate: handleGrammarCreate
  }), window.PacingImportModal && /*#__PURE__*/React.createElement(window.PacingImportModal, {
    open: paceOpen,
    gradeKey: grade,
    gradeName: String(grade).toUpperCase(),
    existing: pacing,
    onClose: () => setPaceOpen(false),
    onSave: async (g, weeks) => {
      await window.savePacing(g, weeks);
      showToast(`🏫 學校進度表已存（${weeks.length} 週）`);
    }
  }), window.WordStudyModal && /*#__PURE__*/React.createElement(window.WordStudyModal, {
    open: wsGenOpen,
    categories: activeCategories,
    defaultGrade: /^g[1-6]$/.test(String(grade)) ? grade : 'g4',
    perStudent: !!(window.isSummerTrack && window.isSummerTrack(grade)),
    roster: qsRoster,
    defaultCat: openCat || (activeCategories.find(c => c.id === 'word') ? 'word' : activeCategories[0] && activeCategories[0].id) || 'word'
    /* v493：學校這週的 Word Study 主題先填好（例 W7 ＝ Prefixes mis-, en-, & em-）。
       Alan 本來要自己開 Excel 查再手打，打錯週次就白生一次。 */,
    defaultTopic: paceWeek && paceWeek.it.wordStudy || '',
    onClose: () => setWsGenOpen(false),
    onCreate: handleWordStudy
  }), window.GrammarNotesModal && /*#__PURE__*/React.createElement(window.GrammarNotesModal, {
    open: gnGenOpen,
    categories: activeCategories,
    defaultGrade: /^g[1-6]$/.test(String(grade)) ? grade : 'g4',
    perStudent: !!(window.isSummerTrack && window.isSummerTrack(grade)),
    roster: qsRoster,
    defaultCat: regenFor && regenFor.catId || openCat || (activeCategories.find(c => c.id === 'grammar') ? 'grammar' : activeCategories[0] && activeCategories[0].id) || 'grammar',
    defaultTitle: regenFor ? regenFor.name : ''
    /* v474：原本的教學重點先填好／v493：沒有的話用學校這週的文法主題。
       ⚠ 用 grammarHw 不是 grammar——上 Writing Activity 那週，
         要練的是沿用過來的那個文法主題（Alan 親自講解的規則）。 */,
    defaultText: regenFor && regenFor.text || paceWeek && paceWeek.lt.grammarHw || '',
    onClose: () => {
      setGnGenOpen(false);
      setRegenFor(null);
    },
    onCreate: handleGrammarNotesCreate
  }), /*#__PURE__*/React.createElement(window.ReadingGenModal, {
    open: rcGenOpen,
    categories: activeCategories,
    perStudent: !!(window.isSummerTrack && window.isSummerTrack(grade)),
    roster: qsRoster,
    defaultCat: regenFor && regenFor.catId || openCat || (activeCategories.find(c => c.id === 'reading') ? 'reading' : activeCategories[0] && activeCategories[0].id) || 'reading',
    defaultTitle: regenFor ? regenFor.name : '',
    onClose: () => {
      setRcGenOpen(false);
      setRegenFor(null);
    },
    onCreate: handleReadingCreate
  }), window.ExamPrepModal && /*#__PURE__*/React.createElement(window.ExamPrepModal, {
    open: !!examSide,
    side: examSide,
    pace: pacing,
    weeks: weeks,
    weekOrder: viewOrder,
    weekId: weekId,
    categories: activeCategories,
    onClose: () => setExamSide(null),
    onGenerate: ({
      words,
      title
    }) => {
      setExamSide(null);
      /* 走「在這一組再出一份」那條既有的路：單字先填好，題型預設全開。
         ⚠ 用 regenFor 是因為 QuickSetModal 的 defaultText／defaultTitle 都吃它。 */
      setRegenFor({
        name: title,
        catId: 'vocab',
        text: window.examPasteText ? window.examPasteText(words) : ''
      });
      setQuickSetOpen(true);
    }
  }), /*#__PURE__*/React.createElement(window.QuickSetModal, {
    open: quickSetOpen,
    categories: activeCategories,
    perStudent: !!(window.isSummerTrack && window.isSummerTrack(grade)),
    roster: qsRoster,
    defaultCat: regenFor && regenFor.catId || openCat || activeCategories[0] && activeCategories[0].id || 'vocab',
    defaultGrade: grade,
    defaultTitle: regenFor ? regenFor.name : '',
    defaultText: regenFor && regenFor.text || '' /* v474：現成的單字先填好，不用再貼一次 */,
    defaultImages: regenFor && regenFor.images || null /* v475：圖片照抄 */,
    alreadyHave: regenFor && regenFor.have || null /* v475：已經有的題型先取消勾選 */,
    onClose: () => {
      setQuickSetOpen(false);
      setRegenFor(null);
    },
    onCreate: handleQuickSet
  }), /*#__PURE__*/React.createElement(window.TermSetupModal, {
    open: termOpen,
    existingIds: weekOrder,
    gradeLabel: _gradeOf(grade, {
      g1: '一年級',
      g2: '二年級',
      g4: '四年級',
      g5: '五年級',
      g6: '六年級',
      g3: '三年級',
      summer: '暑假',
      grammar: '文法核心'
    }),
    prefix: _gradeOf(grade, {
      g1: 'g1-',
      g2: 'g2-',
      g4: 'g4-',
      g5: 'g5-',
      g6: 'g6-',
      g3: '',
      summer: 'sl-',
      grammar: 'gr-'
    }),
    categories: activeCategories,
    onClose: () => setTermOpen(false),
    onCreate: handleCreateTerm
  }), /*#__PURE__*/React.createElement(window.ExportModal, {
    open: exportOpen,
    weeks: weeks,
    weekOrder: weekOrder,
    onClose: () => setExportOpen(false),
    showToast: showToast
  }), /*#__PURE__*/React.createElement(window.WeekModal, {
    open: weekEditOpen,
    existingIds: weekOrder,
    onClose: () => setWeekEditOpen(false),
    onSave: handleEditWeekSave,
    editWeek: {
      id: weekId,
      label: week.label || '',
      dateRange: week.dateRange || '',
      theme: week.theme || '',
      themeZh: week.themeZh || ''
    }
  }), reviewFor && window.ReviewGroupModal && /*#__PURE__*/React.createElement(window.ReviewGroupModal, {
    open: true,
    groupName: reviewFor.name,
    catId: reviewFor.catId,
    items: reviewFor.items,
    curWeekId: weekId,
    grade: grade,
    weekChoices: viewOrder.map(id => ({
      id,
      label: weeks[id] && (weeks[id].label || weeks[id].id) || id
    })),
    onClose: () => setReviewFor(null),
    onCreate: handleCreateReview
  }), regenFor && regenFor.pick && /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: () => setRegenFor(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\u518D\u51FA\u4E00\u4EFD\u984C\u76EE ", /*#__PURE__*/React.createElement("em", null, "\u52A0\u9032\u300C", regenFor.name, "\u300D\u9019\u4E00\u7D44")), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: () => setRegenFor(null)
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 12
    }
  }, "\u51FA\u597D\u7684\u55AE\u5143\u6703\u7528\u540C\u4E00\u500B\u540D\u5B57\uFF0C", /*#__PURE__*/React.createElement("b", null, "\u76F4\u63A5\u6392\u5728\u9019\u4E00\u7D44\u5E95\u4E0B"), "\u2014\u2014\u4E0D\u6703\u8B8A\u6210\u53E6\u5916\u4E00\u7D44\u3002 \u539F\u672C\u7684\u984C\u76EE\u4E00\u984C\u90FD\u4E0D\u6703\u52D5\uFF0C\u4F60\u53EF\u4EE5\u51FA\u5B8C\u518D\u628A\u4E0D\u597D\u7684\u522A\u6389\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "edit-make"
  }, /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn quick",
    onClick: () => {
      setRegenFor(r => ({
        ...r,
        pick: false
      }));
      setQuickSetOpen(true);
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\uD83D\uDD24"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u4E00\u9375\u51FA\u55AE\u5B57"), /*#__PURE__*/React.createElement("em", null, "\u8CBC\u55AE\u5B57\u8868 \u2192 \u55AE\u5B57\u5361\u30FB\u6E2C\u9A57\u30FB\u914D\u5C0D\u30FB\u586B\u7A7A\u30FB\u807D\u5BEB"))), /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn gn",
    onClick: () => {
      setRegenFor(r => ({
        ...r,
        pick: false
      }));
      setGnGenOpen(true);
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u4E00\u9375\u51FA\u6587\u6CD5"), /*#__PURE__*/React.createElement("em", null, "\u4E0A\u50B3\u4F5C\u696D\u7167\u7247\uFF0F\u8CBC\u6587\u5B57 \u2192 \u4E92\u52D5\u6559\u5B78\u30FB\u9078\u64C7\u30FB\u586B\u7A7A\u30FB\u4E2D\u7FFB\u82F1"))), /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn rc",
    onClick: () => {
      setRegenFor(r => ({
        ...r,
        pick: false
      }));
      setRcGenOpen(true);
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u4E00\u9375\u51FA\u95B1\u8B80\u7406\u89E3"), /*#__PURE__*/React.createElement("em", null, "\u8CBC\u6587\u7AE0 \u2192 \u80CC\u666F\u77E5\u8B58\u30FB\u9078\u64C7\u30FB\u7C21\u7B54\u30FB\u95B1\u8B80\u6280\u5DE7"))))))), toast && /*#__PURE__*/React.createElement("div", {
    className: "toast"
  }, toast), saveFail && /*#__PURE__*/React.createElement("div", {
    className: "save-fail-bar"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\u26A0 \u525B\u525B\u90A3\u6B21\u8B8A\u66F4\u6C92\u6709\u5B58\u9032\u96F2\u7AEF"), "\uFF1A", saveFail.msg), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      var w = saveFail.weeks;
      setSaveFail(null);
      saveWeeksSafe(w);
    }
  }, "\u518D\u5B58\u4E00\u6B21"), /*#__PURE__*/React.createElement("button", {
    className: "ghost",
    onClick: () => setSaveFail(null)
  }, "\u5148\u95DC\u6389")), mistakesOpen && user && /*#__PURE__*/React.createElement(window.MistakesPanel, {
    user: user,
    progressItems: myProgressItems,
    weeks: weeks,
    weekOrder: viewOrder,
    categories: activeCategories,
    fixed: myFixed,
    onClose: () => setMistakesOpen(false)
  }), starsOpen && user && /*#__PURE__*/React.createElement(window.StarsPanel, {
    user: user,
    onClose: () => setStarsOpen(false),
    weeks: weeks,
    weekOrder: viewOrder,
    progItems: qmProgress,
    checkin: myCheckin,
    fixed: myFixed,
    mx: userProfile.mx,
    onOpenDress: () => {
      setStarsOpen(false);
      if (window.mxOpenDress) window.mxOpenDress();
    }
  }), checkinOpen && window.CheckinPanel && /*#__PURE__*/React.createElement(window.CheckinPanel, {
    user: user,
    checkin: myCheckin,
    onClose: () => setCheckinOpen(false)
  }), growthOpen && /*#__PURE__*/React.createElement(window.GrowthReport, {
    weeks: weeks,
    weekOrder: viewOrder,
    qmProg: qmProgress,
    categories: activeCategories,
    studentName: user ? user.displayName || '' : '',
    onClose: () => setGrowthOpen(false)
  }), reviewOpen && window.ReviewFlashcardModal && /*#__PURE__*/React.createElement(window.ReviewFlashcardModal, {
    words: reviewWords,
    onClose: () => setReviewOpen(false)
  }), tourOpen && /*#__PURE__*/React.createElement(window.SpotlightTour, {
    onClose: dismissTour,
    onEmpty: () => {
      setTourOpen(false);
      setWelcomeOpen(true);
    }
  })), welcomeOpen && /*#__PURE__*/React.createElement(window.WelcomeGuide, {
    onClose: dismissWelcome
  }), dashOpen && isTeacher && /*#__PURE__*/React.createElement(window.TeacherDashboard, {
    onClose: () => runWave(() => setDashOpen(false)),
    weeks: weeks,
    weekOrder: weekOrder,
    grade: grade
  }), starBurst && /*#__PURE__*/React.createElement(window.StarBurst, {
    onDone: () => setStarBurst(false)
  }), showLoader && /*#__PURE__*/React.createElement(window.LoadingScreen, {
    fading: loaderFading
  }));
}
var root = ReactDOM.createRoot(document.getElementById("root"));
root.render(/*#__PURE__*/React.createElement(App, null));