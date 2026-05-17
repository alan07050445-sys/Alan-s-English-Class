// app.jsx — Top-level state + composition

const { useState: useAppState, useEffect: useAppEffect, useMemo: useAppMemo } = React;

// Teacher mode is gated by URL: ?edit=1 (or hash #edit). Once on, persists in this tab.
const IS_TEACHER = (() => {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get("edit") === "1") return true;
    if ((window.location.hash || "").toLowerCase().includes("edit")) return true;
  } catch (e) {}
  return false;
})();

function App() {
  const [weeks, setWeeks] = useAppState(() => window.loadWeeks());
  const [weekOrder, setWeekOrder] = useAppState(() => window.loadWeekOrder());
  const [progress, setProgress] = useAppState(() => window.loadProgress());
  const [weekIdx, setWeekIdx] = useAppState(() => {
    const initial = window.loadWeekOrder();
    const idx = initial.indexOf("2025-W14");
    return idx >= 0 ? idx : Math.max(0, initial.length - 1);
  });
  const [openCat, setOpenCat] = useAppState("vocab");
  const [editMode, setEditMode] = useAppState(false);
  const [editorOpen, setEditorOpen] = useAppState(false);
  const [editorDraft, setEditorDraft] = useAppState(null);
  const [editorCat, setEditorCat] = useAppState(null);
  const [weekModalOpen, setWeekModalOpen] = useAppState(false);
  const [exportOpen, setExportOpen] = useAppState(false);
  const [toast, setToast] = useAppState(null);

  useAppEffect(() => { window.saveWeeks(weeks); }, [weeks]);
  useAppEffect(() => { window.saveProgress(progress); }, [progress]);
  useAppEffect(() => { window.saveWeekOrder(weekOrder); }, [weekOrder]);

  // Clamp weekIdx if the order shrinks
  useAppEffect(() => {
    if (weekIdx >= weekOrder.length) setWeekIdx(Math.max(0, weekOrder.length - 1));
  }, [weekOrder, weekIdx]);

  const weekId = weekOrder[weekIdx];
  const week = weeks[weekId] || {
    id: weekId, label: weekId, dateRange: "—", theme: "—", themeZh: "", items: {vocab:[], grammar:[], word:[], reading:[]}
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

  const goPrevWeek = () => {
    setWeekIdx(i => Math.max(0, i - 1));
    setOpenCat(null);
  };
  const goNextWeek = () => {
    setWeekIdx(i => Math.min(weekOrder.length - 1, i + 1));
    setOpenCat(null);
  };

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
    // Insert in chronological order by ID
    const nextOrder = [...weekOrder, id].sort();
    setWeeks(prev => ({ ...prev, [id]: newWeek }));
    setWeekOrder(nextOrder);
    setWeekIdx(nextOrder.indexOf(id));
    setOpenCat(null);
    setWeekModalOpen(false);
    showToast("Week added");
  };

  const handleDeleteWeek = () => {
    if (weekOrder.length <= 1) { showToast("Can't delete the last week"); return; }
    if (!confirm(`Delete ${week.label} (${week.theme})? This can't be undone.`)) return;
    setWeeks(prev => {
      const next = { ...prev };
      delete next[weekId];
      return next;
    });
    setWeekOrder(prev => prev.filter(id => id !== weekId));
    setWeekIdx(i => Math.max(0, i - 1));
    setOpenCat(null);
    showToast("Week deleted");
  };

  const toggleCheck = (itemId) => {
    setProgress(prev => {
      const next = { ...prev };
      if (next[itemId]) delete next[itemId];
      else next[itemId] = Date.now();
      return next;
    });
  };

  const handleAddItem = (catId) => {
    setEditorCat(catId);
    setEditorDraft({
      id: "new-" + Date.now(),
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
    setWeeks(prev => {
      const w = JSON.parse(JSON.stringify(prev));
      if (!w[weekId]) {
        w[weekId] = {...week, items: {vocab:[], grammar:[], word:[], reading:[]}};
      }
      const list = w[weekId].items[editorCat] || [];
      const isNew = !list.find(it => it.id === form.id);
      const cleanId = isNew ? (editorCat[0] + Date.now()) : form.id;
      const cleanForm = {...form, id: cleanId};
      if (isNew) {
        w[weekId].items[editorCat] = [...list, cleanForm];
      } else {
        w[weekId].items[editorCat] = list.map(it => it.id === form.id ? cleanForm : it);
      }
      return w;
    });
    setEditorOpen(false);
    showToast(form.id?.startsWith("new-") ? "Item added" : "Item saved");
  };

  const handleMoveItem = (catId, itemId, dir) => {
    setWeeks(prev => {
      const w = JSON.parse(JSON.stringify(prev));
      const list = w[weekId]?.items?.[catId];
      if (!list) return prev;
      const i = list.findIndex(it => it.id === itemId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return prev;
      [list[i], list[j]] = [list[j], list[i]];
      return w;
    });
  };

  const handleDeleteItem = (itemId) => {
    setWeeks(prev => {
      const w = JSON.parse(JSON.stringify(prev));
      Object.keys(w[weekId].items).forEach(k => {
        w[weekId].items[k] = w[weekId].items[k].filter(it => it.id !== itemId);
      });
      return w;
    });
    setEditorOpen(false);
    showToast("Item deleted");
  };

  // Render category grid with detail row inserted after the open one
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

      // Insert detail row at end of the row containing the open card.
      // 2-column grid → rows are pairs (0,1), (2,3)
      const isEndOfRow = (i % 2 === 1) || (i === window.CATEGORIES.length - 1);
      const openIsInThisRow = openIdx >= 0 && Math.floor(openIdx / 2) === Math.floor(i / 2);
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
          />
        );
      }
    }
    return cards;
  };

  return (
    <div className="page">
      <window.Header
        week={week}
        weekOrder={weekOrder}
        weekIdx={weekIdx}
        onPrevWeek={goPrevWeek}
        onNextWeek={goNextWeek}
        canEdit={IS_TEACHER}
        editMode={editMode}
        onToggleEdit={() => setEditMode(e => !e)}
        onAddWeek={() => setWeekModalOpen(true)}
        onDeleteWeek={handleDeleteWeek}
        onExport={() => setExportOpen(true)}
        progress={{done: totalDone, total: totalItems}}
      />

      <window.Hero
        week={week}
        totalItems={totalItems}
        totalDone={totalDone}
        editMode={editMode}
        onUpdateWeek={(patch) => {
          setWeeks(prev => {
            const w = JSON.parse(JSON.stringify(prev));
            if (!w[weekId]) return prev;
            w[weekId] = { ...w[weekId], ...patch };
            return w;
          });
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

      <window.Footer/>

      <window.EditorModal
        open={editorOpen}
        draft={editorDraft}
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

      <window.ExportModal
        open={exportOpen}
        weeks={weeks}
        weekOrder={weekOrder}
        onClose={() => setExportOpen(false)}
        showToast={showToast}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
