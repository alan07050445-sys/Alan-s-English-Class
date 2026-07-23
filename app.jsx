// app.jsx — Top-level state + composition

const { useState: useAppState, useEffect: useAppEffect, useMemo: useAppMemo, useRef: useAppRef } = React;

// ── Capture G3 originals at module load (before any grade-switch overrides) ──
const _CATS_G3           = window.CATEGORIES;
const _saveWeeksG3       = window.saveWeeks;
const _saveWeekOrderG3   = window.saveWeekOrder;
const _subscribeG3       = window.subscribeToClassData;

// ── Grade helper: resolve grade-specific functions ─────────────────────────
// 暑假班表（s1–s6）也走這裡：map.summer 可以是值，或 (trackId) => 值 的函式
function _gradeOf(g, { g2, g4, g5, g6, g3, summer }) {
  if (summer !== undefined && window.isSummerTrack && window.isSummerTrack(g)) {
    return typeof summer === 'function' ? summer(g) : summer;
  }
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
  return { start, end };
}

// Find the best weekIdx: today within dateRange → latest past week → last week.
function bestWeekIdx(order, weeks) {
  if (!order || order.length === 0) return 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = 0; i < order.length; i++) {
    const w = weeks[order[i]];
    if (!w || !w.dateRange) continue;
    const year = parseInt(order[i]) || today.getFullYear();
    const range = parseDateRange(w.dateRange, year);
    if (!range) continue;
    range.end.setHours(23, 59, 59, 999);
    if (today >= range.start && today <= range.end) return i;
  }

  // No exact match — latest week whose start is on or before today
  let best = -1;
  for (let i = 0; i < order.length; i++) {
    const w = weeks[order[i]];
    if (!w || !w.dateRange) continue;
    const year = parseInt(order[i]) || today.getFullYear();
    const range = parseDateRange(w.dateRange, year);
    if (range && range.start <= today) best = i;
  }
  return best >= 0 ? best : Math.max(0, order.length - 1);
}

// ☀️ 暑假限定模式：有暑假任務的學生，門口頁只顯示暑假入口（怕誤點學期教室）。
// 開學時把這個改成 false 就恢復（或叫 Claude 改）。老師、沒有暑假任務的帳號不受影響。
const SUMMER_ONLY_DOOR = true;

function App() {
  // ── Auth state ──────────────────────────────────────────
  const [user, setUser]           = useAppState(null);
  const [authReady, setAuthReady] = useAppState(false); // show loading until Firebase resolves
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

  // ── Content state ───────────────────────────────────────
  // Seed from localStorage cache; Firestore subscription overwrites shortly after mount.
  const [weeks, setWeeks] = useAppState(() => {
    const g = (() => { try { return localStorage.getItem('alan-grade'); } catch(e) { return null; } })();
    return _gradeOf(g, { g2: window.loadWeeksG2(), g4: window.loadWeeksG4(), g5: window.loadWeeksG5(), g6: window.loadWeeksG6(), g3: window.loadWeeks(), summer: (t) => window.summerApi(t).loadWeeks() });
  });
  const [weekOrder, setWeekOrder] = useAppState(() => {
    const g = (() => { try { return localStorage.getItem('alan-grade'); } catch(e) { return null; } })();
    return _gradeOf(g, { g2: window.loadWeekOrderG2(), g4: window.loadWeekOrderG4(), g5: window.loadWeekOrderG5(), g6: window.loadWeekOrderG6(), g3: window.loadWeekOrder(), summer: (t) => window.summerApi(t).loadWeekOrder() });
  });
  const [progress, setProgress] = useAppState(() => window.loadProgress());
  const [qmProgressVersion, setQmProgressVersion] = useAppState(0);
  const [weekIdx, setWeekIdx] = useAppState(() => {
    const g = (() => { try { return localStorage.getItem('alan-grade'); } catch(e) { return null; } })();
    const ord = _gradeOf(g, { g2: window.loadWeekOrderG2(), g4: window.loadWeekOrderG4(), g5: window.loadWeekOrderG5(), g6: window.loadWeekOrderG6(), g3: window.loadWeekOrder(), summer: (t) => window.summerApi(t).loadWeekOrder() });
    const wks = _gradeOf(g, { g2: window.loadWeeksG2(),     g4: window.loadWeeksG4(),     g5: window.loadWeeksG5(),     g6: window.loadWeeksG6(),     g3: window.loadWeeks(),     summer: (t) => window.summerApi(t).loadWeeks() });
    return bestWeekIdx(ord, wks);
  });
  const [openCat, setOpenCat] = useAppState("vocab");
  const [editMode, setEditMode] = useAppState(false);
  const [editorOpen, setEditorOpen] = useAppState(false);
  const [editorDraft, setEditorDraft] = useAppState(null);
  const [editorCat, setEditorCat] = useAppState(null);
  const [weekModalOpen, setWeekModalOpen] = useAppState(false);
  const [weekEditOpen,  setWeekEditOpen]  = useAppState(false);
  const [toast, setToast] = useAppState(null);
  const getGridCols = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cols').trim()) || 2;
  const [gridCols, setGridCols] = useAppState(getGridCols);

  // ── Gamification state ──────────────────────────────
  const [userProfile, setUserProfile] = useAppState({ streak: { count: 0 }, badges: {}, xp: 0 });
  const [badgesOpen,  setBadgesOpen]  = useAppState(false);
  const [badgeToast,  setBadgeToast]  = useAppState(null); // { id, ...badgeData }
  const prevBadgeKeys = useAppRef(null);
  const [starBurst,   setStarBurst]   = useAppState(false);
  const [streakToast, setStreakToast] = useAppState(null); // { count } — shown briefly

  // ── Mistakes state ──────────────────────────────────
  const [mistakesOpen,    setMistakesOpen]    = useAppState(false);
  const [growthOpen,      setGrowthOpen]      = useAppState(false);
  const [welcomeOpen,     setWelcomeOpen]     = useAppState(false); // 文字版（門口頁連結／導覽 fallback）
  const [tourOpen,        setTourOpen]        = useAppState(false); // 實境導覽（大廳聚光燈）
  const [viewLanding,     setViewLanding]     = useAppState(false); // 從 app 內點 logo 回落地頁
  const [myProgressItems, setMyProgressItems] = useAppState({}); // raw Firestore items (incl. wrongQuestions)

  // ── Review state ────────────────────────────────────
  const [reviewSetupOpen, setReviewSetupOpen] = useAppState(false);
  const [reviewSession,   setReviewSession]   = useAppState(null); // { questions, startWid, endWid }

  // ── Access lock (firestore.rules 部署後，未在名單內 → 鎖定頁) ──
  const [accessLocked, setAccessLocked] = useAppState(false);

  // ── Companion / Coins / Daily goal (gamification) ──
  const [companion, setCompanion] = useAppState(() => window.loadCompanion());
  const [coins,     setCoins]     = useAppState(() => window.loadCoins());
  const [daily,     setDaily]     = useAppState(() => window.loadDaily());
  const [goalToast, setGoalToast] = useAppState(false);
  const [wardrobe,  setWardrobe]  = useAppState(() => window.loadWardrobe());
  const [shopOpen,  setShopOpen]  = useAppState(false);
  const [profileOpen, setProfileOpen] = useAppState(false);
  const [bossOpen,  setBossOpen]  = useAppState(false);
  const [mapOpen,   setMapOpen]   = useAppState(false);
  const [intro,     setIntro]     = useAppState(false); // 選年級後開場動畫
  const [tutorialSeen, setTutorialSeen] = useAppState(() => {
    try { return localStorage.getItem('alan-tutorial-done') === '1'; } catch(e) { return false; }
  });
  const [quests,    setQuests]    = useAppState(() => window.loadQuests());
  const [coop,      setCoop]      = useAppState(null);

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

  // ── Loading screen state ────────────────────────────
  // showLoader stays true until auth resolves + 480ms (fade-out animation time)
  const [showLoader,  setShowLoader]  = useAppState(true);
  const [loaderFading,setLoaderFading]= useAppState(false);
  // pageKey — incremented each time we navigate INTO the main page, forcing
  // the .page div to remount and replay its fade-in animation
  const [pageKey, setPageKey] = useAppState(0);
  const loaderStartRef = useAppRef(Date.now());
  useAppEffect(() => {
    if (authReady) {
      const elapsed = Date.now() - loaderStartRef.current;
      const minShow = 1400; // minimum display time so animation always completes
      const waitMs  = Math.max(0, minShow - elapsed);
      // 開始淡出的同時 bump pageKey → 讓門口頁／首頁在載入畫面底下先掛載的
      // 進場動畫重新播放（否則動畫早在 loader 蓋住時就跑完了，使用者看不到）
      const t1 = setTimeout(() => { setLoaderFading(true); setPageKey(k => k + 1); }, waitMs); // fade-out
      const t2 = setTimeout(() => setShowLoader(false), waitMs + 680);     // unmount
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [authReady]);

  const isTeacher = window.isAdminUser(user);

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

  // ── Subscribe to streak + badges ───────────────────────
  useAppEffect(() => {
    if (!user) { setUserProfile({ streak: { count: 0 }, badges: {} }); prevBadgeKeys.current = null; return; }
    const unsub = window.subscribeUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
      // Detect newly unlocked badges and show toast
      const newKeys = Object.keys(profile.badges || {});
      if (prevBadgeKeys.current !== null) {
        const added = newKeys.filter(k => !prevBadgeKeys.current.includes(k));
        if (added.length > 0 && window.BADGES[added[0]]) {
          setBadgeToast({ id: added[0], ...window.BADGES[added[0]] });
        }
      }
      prevBadgeKeys.current = newKeys;
    });
    return unsub;
  }, [user?.uid]);

  useAppEffect(() => {
    if (!user) return;
    window.updateStreak(user.uid).then(({ count, isNew }) => {
      if (!isNew) return;
      if (count >= 3) window.unlockBadge(user.uid, 'streak_3');
      if (count >= 7) window.unlockBadge(user.uid, 'streak_7');
    });
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
    if (!user) return;
    const unsub = window.subscribeMyProgress(user.uid, (firestoreItems) => {
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

  // ── Subscribe to class co-op goal (shared Firestore doc) ──
  useAppEffect(() => {
    if (!window.subscribeCoop) return;
    const unsub = window.subscribeCoop(setCoop, () => setCoop(null));
    return unsub;
  }, []);

  // Always-fresh ref to weeks — prevents stale-closure bugs in CRUD handlers.
  const weeksRef = useAppRef(weeks);
  useAppEffect(() => { weeksRef.current = weeks; }, [weeks]);

  // ── Firestore real-time subscription (grade-aware) ────
  // Switches between G2 and G3 Firestore collections based on active grade.
  // Also points window.saveWeeks / saveWeekOrder at the right collection.
  useAppEffect(() => {
    if (!grade) return; // wait until grade is chosen
    window.saveWeeks     = _gradeOf(grade, { g2: window.saveWeeksG2,     g4: window.saveWeeksG4,     g5: window.saveWeeksG5,     g6: window.saveWeeksG6,     g3: _saveWeeksG3,     summer: (t) => window.summerApi(t).saveWeeks });
    window.saveWeekOrder = _gradeOf(grade, { g2: window.saveWeekOrderG2, g4: window.saveWeekOrderG4, g5: window.saveWeekOrderG5, g6: window.saveWeekOrderG6, g3: _saveWeekOrderG3, summer: (t) => window.summerApi(t).saveWeekOrder });

    const subscribeFn = _gradeOf(grade, { g2: window.subscribeToClassDataG2, g4: window.subscribeToClassDataG4, g5: window.subscribeToClassDataG5, g6: window.subscribeToClassDataG6, g3: _subscribeG3, summer: (t) => window.summerApi(t).subscribe });
    const storageKey  = _gradeOf(grade, { g2: 'alans-english-g2-data-v1', g4: 'alans-english-g4-data-v1', g5: 'alans-english-g5-data-v1', g6: 'alans-english-g6-data-v1', g3: 'alans-english-data-v3', summer: (t) => window.summerApi(t).storageKey });
    const orderKey    = _gradeOf(grade, { g2: 'alans-english-g2-order-v1', g4: 'alans-english-g4-order-v1', g5: 'alans-english-g5-order-v1', g6: 'alans-english-g6-order-v1', g3: 'alans-english-week-order-v1', summer: (t) => window.summerApi(t).orderKey });

    const unsub = subscribeFn((newWeeks, newOrder) => {
      setAccessLocked(false);
      setWeeks(newWeeks);
      setWeekOrder(newOrder);
      setWeekIdx(bestWeekIdx(newOrder, newWeeks));
      try {
        localStorage.setItem(storageKey, JSON.stringify(newWeeks));
        localStorage.setItem(orderKey,   JSON.stringify(newOrder));
      } catch(e) {}
    }, (err) => {
      // permission-denied → 名單外或未登入（rules 部署後才會發生）
      if (err?.code === 'permission-denied' && !window.isAdminUser(window._currentUser)) {
        setAccessLocked(true);
      }
    });
    return unsub;
  }, [grade, user?.uid]);

  // ── 暑假 meta（每人一份派發清單；v209 題庫＋個人清單制）────
  const [summerMeta, setSummerMeta] = useAppState({ students: {} });
  useAppEffect(() => {
    if (!window.subscribeSummerMeta) return;
    return window.subscribeSummerMeta(setSummerMeta, () => {});
  }, [user?.uid]);
  const isSummer = !!(window.isSummerTrack && window.isSummerTrack(grade));
  const isSummerLib = grade === (window.SUMMER_LIB || 'sl');
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
    if (weekOrder.length === 0 || weekIdx >= weekOrder.length) {
      setWeekIdx(Math.max(0, weekOrder.length - 1));
    }
  }, [weekOrder, weekIdx]);

  const weekId = weekOrder[weekIdx] || weekOrder[0] || "";
  const week = weeks[weekId] || {
    id: weekId, label: weekId || "—", dateRange: "—", theme: "—", themeZh: "", items: {vocab:[], grammar:[], word:[], reading:[]}
  };

  // Active categories — switches between grade definitions on grade change
  const activeCategories = _gradeOf(grade, {
    g2: window.CATEGORIES_G2 || _CATS_G3,
    g4: window.CATEGORIES_G4 || _CATS_G3,
    g5: window.CATEGORIES_G5 || _CATS_G3,
    g6: window.CATEGORIES_G6 || _CATS_G3,
    g3: _CATS_G3,
    summer: window.SUMMER_CATEGORIES || _CATS_G3,
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

  const qmProgress = useAppMemo(() => {
    // v257: 改讀「這個帳號自己的」本機紀錄（loadQMProg 內建帳號隔離）
    let local = {};
    try { local = window.loadQMProg ? window.loadQMProg() : {}; } catch(e) {}
    // v255: 併入雲端成績（跨裝置一致），同一單元取「較好的一次」
    const pctOf = (p) => (p && p.score != null && p.total) ? p.score / p.total : (p && p.done ? -1 : -2);
    Object.entries(myProgressItems || {}).forEach(([key, fp]) => {
      if (!fp || !fp.done) return;
      const remote = { done: 1, score: fp.score != null ? fp.score : null, total: fp.score != null ? 100 : (fp.total || 1), ts: fp.done };
      const cur = local[key];
      if (!cur || pctOf(remote) > pctOf(cur)) local[key] = remote;
    });
    return local;
  }, [qmProgressVersion, weekId, grade, myProgressItems, user?.uid]);

  const totalItems = weekQuizItems.length || allItems.length;
  const totalDone = weekQuizItems.length
    ? weekQuizItems.filter(it => progress[it.id] || qmProgress[`${weekId}_${it.id}`]).length
    : allItems.filter(it => progress[it.id]).length;

  const getCategoryProgress = (cat) => {
    const quizItems = window.getQuizItems ? window.getQuizItems((week.items || {})[cat.id] || []) : [];
    if (!quizItems.length) return { total: 0, done: 0 };
    const done = quizItems.reduce((sum, it) => {
      const key = `${weekId}_${it.id}`;
      return sum + ((progress[it.id] || qmProgress[key]) ? 1 : 0);
    }, 0);
    return { total: quizItems.length, done };
  };

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
        && !(progress[c.id] || qmProgress[`${weekId}_${c.id}`])
        && window.getQuizItems && window.getQuizItems([c.it]).length > 0)
      .sort((a, b) => a.due.localeCompare(b.due));
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

  // v249: 從行銷頁按「開始學習」登入 → 留在首頁（CTA 變「進入課程」）；
  // 其他情況（重新整理自動恢復登入等）不動──學生日常仍直達門口頁。
  const loginFromLandingRef = useAppRef(false);
  useAppEffect(() => {
    if (!user) return;
    if (loginFromLandingRef.current) {
      loginFromLandingRef.current = false;
      setViewLanding(true);   // 留在首頁，敘述換成「進入課程」
    } else if (viewLanding) {
      // 舊行為保留：非首頁發起的登入完成時，把殘留的行銷頁關掉
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

  const goPrevWeek = () => { setSlideDir('right'); setWeekIdx(i => Math.max(0, i - 1)); setOpenCat(null); setCatView(null); scrollPageToTop(); };
  const goNextWeek = () => { setSlideDir('left');  setWeekIdx(i => Math.min(weekOrder.length - 1, i + 1)); setOpenCat(null); setCatView(null); scrollPageToTop(); };

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
    window.saveWeeks(nextWeeks);
    window.saveWeekOrder(nextOrder);
    setWeekIdx(nextOrder.indexOf(id));
    setOpenCat(null);
    setWeekModalOpen(false);
    showToast("Week added");
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
      window.saveWeeks(w); window.saveWeekOrder(nextOrder);
      setWeekIdx(nextOrder.indexOf(newId));
    } else {
      // Update in-place (no ID change)
      w[newId] = { ...w[newId], label: form.label || form.id, dateRange: form.dateRange || '', theme: form.theme || '', themeZh: form.themeZh || '' };
      setWeeks(w);
      window.saveWeeks(w);
    }
    setWeekEditOpen(false);
    showToast("已儲存 ✓");
  };

  const handleDeleteWeek = () => {
    if (weekOrder.length <= 1) { showToast("Can't delete the last week"); return; }
    const nextWeeks = { ...weeksRef.current };
    delete nextWeeks[weekId];
    const nextOrder = weekOrder.filter(id => id !== weekId);
    setWeeks(nextWeeks);
    setWeekOrder(nextOrder);
    window.saveWeeks(nextWeeks);
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

  const handleAddItem = (catId) => {
    // Pre-generate final ID so the PDF storage path is stable before save.
    // Include random suffix to avoid collisions if called rapidly.
    const newId = catId[0] + Date.now() + Math.random().toString(36).slice(2, 6);
    setEditorCat(catId);
    setEditorDraft({
      id: newId,
      _isNew: true,
      type: "quizlet",
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
    setEditorDraft({...item});
    setEditorOpen(true);
  };

  const handleSaveItem = (form) => {
    const { _isNew, ...cleanForm } = form;
    const isNew = !!_isNew;
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) {
      w[weekId] = {...week, items: {vocab:[], grammar:[], word:[], reading:[]}};
    }
    const list = w[weekId].items[editorCat] || [];
    w[weekId].items[editorCat] = isNew
      ? [...list, cleanForm]
      : list.map(it => it.id === cleanForm.id ? cleanForm : it);
    setWeeks(w);
    window.saveWeeks(w);
    setEditorOpen(false);
    showToast(isNew ? "Item added" : "Item saved");
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
    window.saveWeeks(w);
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
    window.saveWeeks(w);
  };

  const handleDeleteItem = (itemId) => {
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    Object.keys(w[weekId].items).forEach(k => {
      w[weekId].items[k] = w[weekId].items[k].filter(it => it.id !== itemId);
    });
    setWeeks(w);
    window.saveWeeks(w);
    setEditorOpen(false);
    showToast("Item deleted");
  };

  // ── Homework handler ────────────────────────────────────
  const handleSetHomework = (itemId, hwData) => {
    // hwData = { dueDate: 'YYYY-MM-DD' } to set, null to remove
    const w = JSON.parse(JSON.stringify(weeksRef.current));
    if (!w[weekId]) return;
    if (!w[weekId].homework) w[weekId].homework = {};
    if (hwData) w[weekId].homework[itemId] = hwData;
    else delete w[weekId].homework[itemId];
    setWeeks(w);
    window.saveWeeks(w);
    showToast(hwData ? "設定作業 ✓" : "取消作業");
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
    window.saveWeeks(w);
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

    // ── Coins + Daily goal (works without login — guests too) ──
    const pctLocal = total > 0 ? Math.round(score / total * 100) : 0;
    const earned = Math.max(3, Math.round((score / Math.max(1, total)) * 10) + (pctLocal === 100 ? 5 : 0));
    setCoins(window.addCoins(earned));
    const dres = window.bumpDaily(1);
    setDaily(dres);
    if (dres.justCompleted) {
      window.addCoins(10);                 // 達標獎勵金幣
      setCoins(window.loadCoins());
      if (window.playSound) window.playSound('complete');
      if (window.triggerStarBurst) window.triggerStarBurst();
      setGoalToast(true);
      setTimeout(() => setGoalToast(false), 3600);
    }

    // ── 每週任務進度 + 全班合作貢獻 ──
    window.bumpQuests({ practices: 1, correct: score });
    if (dres.justCompleted) window.bumpQuests({ dailyReached: 1 });
    setQuests(window.loadQuests());
    window.contributeCoop(score); // 盡力而為，未部署規則時靜默略過

    if (!u) return;
    const pct = total > 0 ? Math.round(score / total * 100) : 0;
    // Award XP — perfect = 100, otherwise 50
    const xpGain = pct === 100 ? 100 : 50;
    const { xp: newXp } = await window.addXp(u.uid, xpGain);
    // XP milestone badges
    if (newXp >= 500)  await window.unlockBadge(u.uid, 'xp_500');
    if (newXp >= 1000) await window.unlockBadge(u.uid, 'xp_1000');
    if (newXp >= 3000) await window.unlockBadge(u.uid, 'xp_3000');
    // Update streak
    const { count, isNew } = await window.updateStreak(u.uid);
    if (isNew) window.playSound('streak');
    await window.unlockBadge(u.uid, 'first_quiz');
    // Badge: perfect score
    if (pct === 100) await window.unlockBadge(u.uid, 'perfect');
    if (meta.itemId && window.saveQuizMistakes) {
      await window.saveQuizMistakes(u.uid, u.displayName || '', u.email || '', meta.itemId, wrongList || []);
    }
    if (meta.allWeekQuizDone) await window.unlockBadge(u.uid, 'scholar');
    // Badge: streak milestones
    if (count >= 3)  await window.unlockBadge(u.uid, 'streak_3');
    if (count >= 7)  await window.unlockBadge(u.uid, 'streak_7');
    if (count >= 30) await window.unlockBadge(u.uid, 'streak_30');
  };

  // ── Grid renderer ──────────────────────────────────────

  const renderGrid = () => {
    const cards = [];
    const openIdx = activeCategories.findIndex(c => c.id === openCat);

    for (let i = 0; i < activeCategories.length; i++) {
      const cat = activeCategories[i];
      const items = week.items[cat.id] || [];
      const doneCount = items.filter(it => progress[it.id]).length;

      cards.push(
        <window.CategoryCard
          key={cat.id}
          cat={cat}
          items={items}
          doneCount={doneCount}
          isOpen={openCat === cat.id}
          onClick={() => setOpenCat(prev => prev === cat.id ? null : cat.id)}
        />
      );

      const isEndOfRow = (i % gridCols === gridCols - 1) || (i === activeCategories.length - 1);
      const openIsInThisRow = openIdx >= 0 && Math.floor(openIdx / gridCols) === Math.floor(i / gridCols);
      if (isEndOfRow && openIsInThisRow && openCat) {
        const openCatObj = activeCategories[openIdx];
        cards.push(
          <window.CategoryDetail
            key={"detail-" + openCat}
            cat={openCatObj}
            items={week.items[openCat] || []}
            progress={progress}
            onToggleCheck={toggleCheck}
            editMode={editMode}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onMoveItem={handleMoveItem}
            onMoveTypeGroup={handleMoveTypeGroup}
          />
        );
      }
    }
    return cards;
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
    const newWeeks = _gradeOf(g, { g2: window.loadWeeksG2(), g4: window.loadWeeksG4(), g5: window.loadWeeksG5(), g6: window.loadWeeksG6(), g3: window.loadWeeks(), summer: (t) => window.summerApi(t).loadWeeks() });
    const newOrder = _gradeOf(g, { g2: window.loadWeekOrderG2(), g4: window.loadWeekOrderG4(), g5: window.loadWeekOrderG5(), g6: window.loadWeekOrderG6(), g3: window.loadWeekOrder(), summer: (t) => window.summerApi(t).loadWeekOrder() });
    try { localStorage.setItem('alan-grade', g); } catch(e) {}
    setGrade(g);
    setWeeks(newWeeks);
    setWeekOrder(newOrder);
    setWeekIdx(bestWeekIdx(newOrder, newWeeks));
    setOpenCat('vocab');
    setCatView(null);
    setPageKey(k => k + 1); // force .page remount → replay fade-in
    scrollPageToTop();
  };

  const handleSelectGrade = (g) => {
    applyGradeData(g);
    // 記住這個帳號的專屬年級（暑假/題庫不算）；標記本 session 已進入
    if (/^g\d$/.test(g)) { try { localStorage.setItem(homeGradeKey(), g); } catch(e) {} }
    setEntered(true);
    try { sessionStorage.setItem('alan-entered', '1'); } catch(e) {}
  };

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
    const hg = readHomeGrade() || (user ? window.gradeFromEmail(user.email) : null);
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
          onLogout={user ? () => { window.signOutUser(); try { sessionStorage.removeItem('alan-guest'); } catch(e) {} setSkippedLogin(false); } : null}
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
      const homeGrade = readHomeGrade() || (user ? window.gradeFromEmail(user.email) : null);
      appContent = (
        <window.GradeSelector
          key={pageKey}
          onSelect={(g) => runWave(() => handleSelectGrade(g))}
          homeGrade={homeGrade}
          who={user ? _englishName(user.displayName) : null}
          summerOnly={SUMMER_ONLY_DOOR && !isTeacher && hasSummerPlan}
          onOpenAdmin={isTeacher ? () => setDashOpen(true) : null}
          onChangeGrade={(g) => {
            // 換年級 → 回門口頁（教室卡換成新年級），不直接進教室（太突兀）
            applyGradeData(g); // 會 bump pageKey → 門口頁 remount、進場動畫重播
            if (/^g\d$/.test(g)) { try { localStorage.setItem(homeGradeKey(), g); } catch(e) {} }
            // 保險：不管從哪條路進來換年級（logo／年級章），都不能殘留「已進入」
            setEntered(false);
            try { sessionStorage.removeItem('alan-entered'); } catch(e) {}
          }}
          summer={(isTeacher || hasSummerPlan) ? { lib: isTeacher, mine: hasSummerPlan, who: summerWho, prog: doorSummerProg } : null}
          onViewLanding={() => runWave(() => setViewLanding(true))}
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
      {/* App content — null while loading, then login/grade/main as auth resolves */}
      {appContent ? appContent : (authReady && grade && (
        <div key={pageKey} className={`page${!catView && !editMode ? ' page-lobby' : ''}${catView && !editMode ? ' page-mission' : ''}${isSummer ? ' page-summer' : ''}`}>
          <window.Header
            week={week}
            weekOrder={weekOrder}
            weekIdx={weekIdx}
            onHome={() => {
              if (user) {
                // 已登入：logo = 回門口頁（進入教室／暑假），不是行銷首頁——v254 加泡泡
                runWave(() => {
                  setCatView(null);
                  setOpenCat(null);
                  setEntered(false);
                  try { sessionStorage.removeItem('alan-entered'); } catch(e) {}
                  scrollPageToTop();
                });
              } else {
                setCatView(null);
                setOpenCat(null);
                setViewLanding(true);
              }
            }}
            onPrevWeek={goPrevWeek}
            onNextWeek={goNextWeek}
            canEdit={isTeacher}
            editMode={editMode}
            onToggleEdit={() => setEditMode(e => !e)}
            onAddWeek={() => setWeekModalOpen(true)}
            onDeleteWeek={handleDeleteWeek}
            progress={{done: totalDone, total: totalItems}}
            user={user}
            onLogin={() => window.signInWithGoogle()}
            onLogout={() => {
              if (confirm('Sign out?')) {
                window.signOutUser();
                try { sessionStorage.removeItem('alan-guest'); } catch(e) {}
                setSkippedLogin(false);
              }
            }}
            onShowDashboard={() => setDashOpen(true)}
            streak={localStreak.count > 0 ? localStreak : (user ? userProfile.streak : localStreak)}
            badges={userProfile.badges}
            xp={userProfile.xp || 0}
            onShowBadges={() => setBadgesOpen(true)}
            onEditWeek={() => setWeekEditOpen(true)}
            mistakesCount={mistakesCount}
            onShowMistakes={user ? () => setMistakesOpen(true) : null}
            grade={grade}
            compactLobby={!catView && !editMode}
            onSwitchGrade={() => runWave(() => {
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
              cat={catView}
              initialItemId={catView.itemId || null}
              items={(week.items || {})[catView.id] || []}
              weekId={weekId}
              cloudProg={qmProgress}
              onBack={() => { setCatView(null); setMainKey(k => k + 1); scrollPageToTop(); }}
              editMode={editMode}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onMoveItem={(itemId, dir) => handleMoveItem(catView.id, itemId, dir)}
              weekChoices={weekOrder.filter(id => id !== weekId).map(id => ({
                id,
                label: (weeks[id] && (weeks[id].label || weeks[id].id)) || id,
                sub: weeks[id] ? [weeks[id].dateRange, weeks[id].theme].filter(Boolean).join(' · ') : '',
              }))}
              onCopyToWeeks={(item, targetIds) => handleCopyItemToWeeks(catView.id, item, targetIds)}
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
                >← 上一頁</button>
              )}
              {/* v234: 暑假進出改由門口頁引導（呼吸箭頭＋開學標註），大廳橫幅移除 */}
              {!editMode && (
                <window.WeekHero
                  week={week}
                  weekIdx={weekIdx}
                  weekOrder={weekOrder}
                  done={totalDone}
                  total={totalItems}
                  who={isSummer && !isSummerLib ? summerWho : null}
                  onPrevWeek={goPrevWeek}
                  onNextWeek={goNextWeek}
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
                    window.saveWeeks(w);
                  }}
                />
              ) : isSummerLib ? (
                /* 題庫視角：這裡的 homework 是「全部學生任務的總集合」，
                   長得像學生頁會誤導（也會爆量）→ 換成老師提示 */
                <div className="tt tt-libhint">
                  <div className="tt-head"><span className="tt-title">📌 題庫模式</span></div>
                  <div className="tt-empty">
                    這裡是暑假題庫的完整內容（所有學生任務的總集合）。
                    每個學生只會看到你在後台「☀️ 暑假發派」勾給他的任務，不會像這頁全部列出。
                  </div>
                </div>
              ) : (
                <window.TodayTasks
                  week={week}
                  allItems={allItems}
                  qmProg={qmProgress}
                  weekId={weekId}
                  categories={activeCategories}
                  onOpenTask={(cat, itemId) => { setCatView({ ...cat, itemId }); scrollPageToTop(); }}
                />
              )}
              <window.QuizModeBlocks
                week={week}
                weekId={weekId}
                cloudProg={qmProgress}
                onEnterCat={(cat) => { setCatView(cat); scrollPageToTop(); }}
                editMode={editMode}
                categories={activeCategories}
                onUpdateWeek={(patch) => {
                  const w = JSON.parse(JSON.stringify(weeksRef.current));
                  if (!w[weekId]) return;
                  w[weekId] = { ...w[weekId], ...patch };
                  setWeeks(w);
                  window.saveWeeks(w);
                }}
                onAddItem={handleAddItem}
              />
              {!editMode && (
                <button className="growth-entry" onClick={() => setGrowthOpen(true)}>
                  <span className="growth-entry-ico">📈</span>
                  <span className="growth-entry-text">
                    <span className="growth-entry-title">學習成長</span>
                    <span className="growth-entry-sub">{isSummer ? '看看這個暑假的進步軌跡' : '看看這學期的進步軌跡'}</span>
                  </span>
                  <span className="growth-entry-chev">›</span>
                </button>
              )}
            </div>
          )}
          </div>{/* end week-slide wrapper */}

          {(!catView || editMode) && <window.Footer onOpenGuide={() => setTourOpen(true)}/>}

          {(catView || editMode) && (
            <window.MobileNav
              week={week}
              weekIdx={weekIdx}
              weekOrder={weekOrder}
              onPrevWeek={goPrevWeek}
              onNextWeek={goNextWeek}
              catView={catView}
              onBackFromCat={() => { setCatView(null); scrollPageToTop(); }}
              onShowBadges={() => setBadgesOpen(true)}
              user={user}
            />
          )}

          <window.EditorModal
            open={editorOpen}
            draft={editorDraft}
            weekId={weekId}
            catItems={editorCat ? (week.items[editorCat] || []) : []}
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
          <window.WeekModal
            open={weekEditOpen}
            existingIds={weekOrder}
            onClose={() => setWeekEditOpen(false)}
            onSave={handleEditWeekSave}
            editWeek={{ id: weekId, label: week.label || '', dateRange: week.dateRange || '', theme: week.theme || '', themeZh: week.themeZh || '' }}
          />

          {toast && <div className="toast">{toast}</div>}

          {mistakesOpen && user && (
            <window.MistakesPanel
              user={user}
              progressItems={myProgressItems}
              weeks={weeks}
              weekOrder={weekOrder}
              onClose={() => setMistakesOpen(false)}
            />
          )}

          {growthOpen && (
            <window.GrowthReport
              weeks={weeks}
              weekOrder={weekOrder}
              qmProg={qmProgress}
              categories={activeCategories}
              studentName={user ? (user.displayName || '') : ''}
              onClose={() => setGrowthOpen(false)}
            />
          )}

          {tourOpen && (
            <window.SpotlightTour
              onClose={dismissTour}
              onEmpty={() => { setTourOpen(false); setWelcomeOpen(true); }}
            />
          )}

          {reviewSetupOpen && (
            <window.ReviewSetupModal
              weeks={weeks}
              weekOrder={weekOrder}
              onClose={() => setReviewSetupOpen(false)}
              onStart={(session) => { setReviewSetupOpen(false); setReviewSession(session); }}
            />
          )}

          {reviewSession && (
            <window.ReviewPlayer
              questions={reviewSession.questions}
              startWid={reviewSession.startWid}
              endWid={reviewSession.endWid}
              user={user}
              onClose={() => setReviewSession(null)}
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
        />
      )}

      {/* LoadingScreen is always the LAST child of this Fragment.
          Keeping it in the same tree position prevents unmount/remount
          and preserves the CSS brand animation across re-renders. */}
      {showLoader && <window.LoadingScreen fading={loaderFading}/>}
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
