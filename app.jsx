// app.jsx — Top-level state + composition

const { useState: useAppState, useEffect: useAppEffect, useMemo: useAppMemo, useRef: useAppRef } = React;

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

  // ── Content state ───────────────────────────────────────
  // Seed from localStorage cache; Firestore subscription overwrites shortly after mount.
  const [weeks, setWeeks] = useAppState(() => window.loadWeeks());
  const [weekOrder, setWeekOrder] = useAppState(() => window.loadWeekOrder());
  const [progress, setProgress] = useAppState(() => window.loadProgress());
  const [weekIdx, setWeekIdx] = useAppState(() => bestWeekIdx(window.loadWeekOrder(), window.loadWeeks()));
  const [openCat, setOpenCat] = useAppState("vocab");
  const [editMode, setEditMode] = useAppState(false);
  const [editorOpen, setEditorOpen] = useAppState(false);
  const [editorDraft, setEditorDraft] = useAppState(null);
  const [editorCat, setEditorCat] = useAppState(null);
  const [weekModalOpen, setWeekModalOpen] = useAppState(false);
  const [toast, setToast] = useAppState(null);
  const getGridCols = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-cols').trim()) || 2;
  const [gridCols, setGridCols] = useAppState(getGridCols);

  const isTeacher = window.isAdminUser(user);

  // ── Quiz mode state ─────────────────────────────────
  const [quizMode, setQuizMode]   = useAppState(true); // default: new quiz mode
  const [quizSession, setQuizSession] = useAppState(null); // { cat, questions, progressKey }

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

  // ── Firestore real-time subscription ──────────────────
  // Replaces localStorage save-on-change for weeks & weekOrder.
  // progress stays in localStorage (per-device).
  useAppEffect(() => {
    const unsub = window.subscribeToClassData((newWeeks, newOrder) => {
      setWeeks(newWeeks);
      setWeekOrder(newOrder);
      setWeekIdx(bestWeekIdx(newOrder, newWeeks));
      // Keep localStorage cache in sync so next page load shows the right week immediately.
      try {
        localStorage.setItem("alans-english-data-v3", JSON.stringify(newWeeks));
        localStorage.setItem("alans-english-week-order-v1", JSON.stringify(newOrder));
      } catch (e) {}
    });
    return unsub;
  }, []);

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

  const allItems = useAppMemo(() => {
    return window.CATEGORIES.flatMap(c => (week.items[c.id] || []).map(it => ({...it, _cat: c.id})));
  }, [week]);

  const totalItems = allItems.length;
  const totalDone = allItems.filter(it => progress[it.id]).length;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const goPrevWeek = () => { setWeekIdx(i => Math.max(0, i - 1)); setOpenCat(null); setQuizSession(null); };
  const goNextWeek = () => { setWeekIdx(i => Math.min(weekOrder.length - 1, i + 1)); setOpenCat(null); setQuizSession(null); };

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

  const handleDeleteWeek = () => {
    if (weekOrder.length <= 1) { showToast("Can't delete the last week"); return; }
    if (!confirm(`Delete ${week.label} (${week.theme})? This can't be undone.`)) return;
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

  // ── Grid renderer ──────────────────────────────────────

  const renderGrid = () => {
    const cards = [];
    const openIdx = window.CATEGORIES.findIndex(c => c.id === openCat);

    for (let i = 0; i < window.CATEGORIES.length; i++) {
      const cat = window.CATEGORIES[i];
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

      const isEndOfRow = (i % gridCols === gridCols - 1) || (i === window.CATEGORIES.length - 1);
      const openIsInThisRow = openIdx >= 0 && Math.floor(openIdx / gridCols) === Math.floor(i / gridCols);
      if (isEndOfRow && openIsInThisRow && openCat) {
        const openCatObj = window.CATEGORIES[openIdx];
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
        onQuizMode={quizMode}
        onSwitchMode={() => { setQuizMode(m => !m); setQuizSession(null); }}
      />

      {/* ── QUIZ MODE ── */}
      {quizMode && !editMode ? (
        <div className="shell">
          {quizSession ? (
            <window.QuizModePlayer
              cat={quizSession.cat}
              questions={quizSession.questions}
              progressKey={quizSession.progressKey}
              onBack={() => setQuizSession(null)}
            />
          ) : (
            <window.QuizModeBlocks
              week={week}
              weekId={weekId}
              onStartQuiz={(cat, questions, progressKey) =>
                setQuizSession({ cat, questions, progressKey })
              }
            />
          )}
        </div>
      ) : (
        /* ── RESOURCE MODE (original) ── */
        <>
          <window.Hero
            week={week}
            totalItems={totalItems}
            totalDone={totalDone}
            editMode={editMode}
            onUpdateWeek={(patch) => {
              const w = JSON.parse(JSON.stringify(weeksRef.current));
              if (!w[weekId]) return;
              w[weekId] = { ...w[weekId], ...patch };
              setWeeks(w);
              window.saveWeeks(w);
            }}
          />
          <section>
            <div className="shell">
              <div className="section-head">
                <h2>The Four <em>Foundations</em></h2>
                <span className="meta">04 Categories · 四個學習面向</span>
              </div>
            </div>
            <div className="shell">
              <div className="cat-grid">{renderGrid()}</div>
            </div>
          </section>
        </>
      )}

      <window.Footer/>

      <window.EditorModal
        open={editorOpen}
        draft={editorDraft}
        weekId={weekId}
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

      {toast && <div className="toast">{toast}</div>}

      {dashOpen && isTeacher && (
        <window.TeacherDashboard
          onClose={() => setDashOpen(false)}
          weeks={weeks}
          weekOrder={weekOrder}
        />
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
