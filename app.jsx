// app.jsx — Top-level state + composition

const { useState: useAppState, useEffect: useAppEffect, useMemo: useAppMemo, useRef: useAppRef } = React;

// ── Capture G3 originals at module load (before any grade-switch overrides) ──
const _CATS_G3           = window.CATEGORIES;
const _saveWeeksG3       = window.saveWeeks;
const _saveWeekOrderG3   = window.saveWeekOrder;
const _subscribeG3       = window.subscribeToClassData;

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

  // ── Content state ───────────────────────────────────────
  // Seed from localStorage cache; Firestore subscription overwrites shortly after mount.
  const [weeks, setWeeks] = useAppState(() => {
    const g = (() => { try { return localStorage.getItem('alan-grade'); } catch(e) { return null; } })();
    return g === 'g2' ? window.loadWeeksG2() : window.loadWeeks();
  });
  const [weekOrder, setWeekOrder] = useAppState(() => {
    const g = (() => { try { return localStorage.getItem('alan-grade'); } catch(e) { return null; } })();
    return g === 'g2' ? window.loadWeekOrderG2() : window.loadWeekOrder();
  });
  const [progress, setProgress] = useAppState(() => window.loadProgress());
  const [weekIdx, setWeekIdx] = useAppState(() => {
    const g = (() => { try { return localStorage.getItem('alan-grade'); } catch(e) { return null; } })();
    const ord = g === 'g2' ? window.loadWeekOrderG2() : window.loadWeekOrder();
    const wks = g === 'g2' ? window.loadWeeksG2()     : window.loadWeeks();
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
  const [userProfile, setUserProfile] = useAppState({ streak: { count: 0 }, badges: {} });
  const [badgesOpen,  setBadgesOpen]  = useAppState(false);
  const [badgeToast,  setBadgeToast]  = useAppState(null); // { id, ...badgeData }
  const prevBadgeKeys = useAppRef(null);

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

  // ── Sync Firestore progress when user is logged in ──────
  useAppEffect(() => {
    if (!user) return;
    const unsub = window.subscribeMyProgress(user.uid, (firestoreItems) => {
      // Convert Firestore format { itemId: {done, score?, time?} } → app format { itemId: timestamp }
      const appProgress = {};
      Object.entries(firestoreItems).forEach(([id, val]) => {
        if (val?.done) appProgress[id] = val.done;
      });
      setProgress(appProgress);
    });
    return unsub;
  }, [user?.uid]);

  // Always-fresh ref to weeks — prevents stale-closure bugs in CRUD handlers.
  const weeksRef = useAppRef(weeks);
  useAppEffect(() => { weeksRef.current = weeks; }, [weeks]);

  // ── Firestore real-time subscription (grade-aware) ────
  // Switches between G2 and G3 Firestore collections based on active grade.
  // Also points window.saveWeeks / saveWeekOrder at the right collection.
  useAppEffect(() => {
    if (!grade) return; // wait until grade is chosen
    const isG2        = grade === 'g2';
    window.saveWeeks     = isG2 ? window.saveWeeksG2     : _saveWeeksG3;
    window.saveWeekOrder = isG2 ? window.saveWeekOrderG2 : _saveWeekOrderG3;

    const subscribeFn = isG2 ? window.subscribeToClassDataG2 : _subscribeG3;
    const storageKey  = isG2 ? 'alans-english-g2-data-v1'    : 'alans-english-data-v3';
    const orderKey    = isG2 ? 'alans-english-g2-order-v1'   : 'alans-english-week-order-v1';

    const unsub = subscribeFn((newWeeks, newOrder) => {
      setWeeks(newWeeks);
      setWeekOrder(newOrder);
      setWeekIdx(bestWeekIdx(newOrder, newWeeks));
      try {
        localStorage.setItem(storageKey, JSON.stringify(newWeeks));
        localStorage.setItem(orderKey,   JSON.stringify(newOrder));
      } catch(e) {}
    });
    return unsub;
  }, [grade]);

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

  // Active categories — switches between G2 and G3 definitions on grade change
  const activeCategories = grade === 'g2' ? (window.CATEGORIES_G2 || _CATS_G3) : _CATS_G3;

  const allItems = useAppMemo(() => {
    const cats = grade === 'g2' ? (window.CATEGORIES_G2 || _CATS_G3) : _CATS_G3;
    return cats.flatMap(c => (week.items[c.id] || []).map(it => ({...it, _cat: c.id})));
  }, [week, grade]);

  const weekQuizItems = useAppMemo(() => {
    if (!window.getQuizItems) return [];
    const cats = grade === 'g2' ? (window.CATEGORIES_G2 || _CATS_G3) : _CATS_G3;
    return cats.flatMap(c => window.getQuizItems((week.items || {})[c.id] || []));
  }, [week, grade]);

  const totalItems = allItems.length;
  const totalDone = allItems.filter(it => progress[it.id]).length;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const goPrevWeek = () => { setWeekIdx(i => Math.max(0, i - 1)); setOpenCat(null); setCatView(null); };
  const goNextWeek = () => { setWeekIdx(i => Math.min(weekOrder.length - 1, i + 1)); setOpenCat(null); setCatView(null); };

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

  // ── Quiz complete handler (streak + badges) ─────────────
  window._onQuizComplete = async (score, total, wrongList, meta = {}) => {
    const u = window._currentUser;
    if (!u) return;
    // Update streak
    const { count, isNew } = await window.updateStreak(u.uid);
    if (isNew) window.playSound('streak');
    await window.unlockBadge(u.uid, 'first_quiz');
    // Badge: perfect score
    if (Math.round(score / total * 100) === 100) await window.unlockBadge(u.uid, 'perfect');
    if (meta.itemId && window.saveQuizMistakes) {
      await window.saveQuizMistakes(u.uid, u.displayName || '', u.email || '', meta.itemId, wrongList || []);
    }
    if (meta.allWeekQuizDone) await window.unlockBadge(u.uid, 'scholar');
    // Badge: streak milestones
    if (count >= 3) await window.unlockBadge(u.uid, 'streak_3');
    if (count >= 7) await window.unlockBadge(u.uid, 'streak_7');
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

  // Show loading spinner until Firebase Auth resolves (avoids flash of login screen)
  if (!authReady) {
    return <div className="login-loading">Loading…</div>;
  }

  // Show login screen if not logged in and hasn't chosen guest
  if (!user && !skippedLogin) {
    return (
      <window.LoginScreen
        onLogin={() => window.signInWithGoogle()}
        onSkip={() => {
          try { sessionStorage.setItem('alan-guest', '1'); } catch(e) {}
          setSkippedLogin(true);
        }}
      />
    );
  }

  // ── Grade selector (shown once after login, stored in localStorage) ──
  const handleSelectGrade = (g) => {
    try { localStorage.setItem('alan-grade', g); } catch(e) {}
    setGrade(g);
    setWeekIdx(0);
    setOpenCat('vocab');
    setCatView(null);
  };

  if (!grade) {
    return <window.GradeSelector onSelect={handleSelectGrade} />;
  }

  return (
    <div className="page">
      <window.Header
        week={week}
        weekOrder={weekOrder}
        weekIdx={weekIdx}
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
        streak={userProfile.streak}
        badges={userProfile.badges}
        onShowBadges={() => setBadgesOpen(true)}
        onEditWeek={() => setWeekEditOpen(true)}
        grade={grade}
        onSwitchGrade={() => {
          try { localStorage.removeItem('alan-grade'); } catch(e) {}
          setGrade(null);
          setCatView(null);
        }}
      />

      {/* ── QUIZ MODE (always shown; edit controls appear when editMode=true) ── */}
      {catView ? (
        <window.QuizModeCategoryView
          cat={catView}
          items={(week.items || {})[catView.id] || []}
          weekId={weekId}
          onBack={() => setCatView(null)}
          editMode={editMode}
          onAddItem={handleAddItem}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          onMoveItem={(itemId, dir) => handleMoveItem(catView.id, itemId, dir)}
          homework={week.homework || {}}
          onSetHomework={handleSetHomework}
          weekQuizItems={weekQuizItems}
        />
      ) : (
        <div className="shell">
          <window.QuizModeBlocks
            week={week}
            weekId={weekId}
            onEnterCat={(cat) => setCatView(cat)}
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
        </div>
      )}

      <window.Footer/>

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

      {dashOpen && isTeacher && (
        <window.TeacherDashboard
          onClose={() => setDashOpen(false)}
          weeks={weeks}
          weekOrder={weekOrder}
        />
      )}

      {badgesOpen && (
        <window.BadgesModal badges={userProfile.badges} onClose={() => setBadgesOpen(false)}/>
      )}

      {badgeToast && (
        <window.BadgeToast badge={badgeToast} onDone={() => setBadgeToast(null)}/>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
