// components-dashboard.jsx — Teacher class-report panel

const { useState: useDash, useEffect: useDashE, useMemo: useDashM } = React;

/* ── Detect Firebase-UID-like strings (28 chars [A-Za-z0-9]) ── */
function isUid(str) {
  return !str || /^[A-Za-z0-9]{20,}$/.test(str.trim());
}
function friendlyName(s) {
  if (!isUid(s.name)) return s.name;
  // Fall back to email prefix, then "未命名學生"
  return s.email ? s.email.split('@')[0] : '未命名學生';
}

/* ── Student list overview ─────────────────────────────── */
function TeacherDashboard({ onClose, weeks, weekOrder }) {
  const [students,   setStudents]  = useDash([]);
  const [selected,   setSelected]  = useDash(null);
  const [refreshKey, setRefreshKey]= useDash(0);

  useDashE(() => window.subscribeAllStudents(setStudents), [refreshKey]);

  // Flatten all items across every week (for "X / total" calculation)
  const allItems = useDashM(() => {
    return weekOrder.flatMap(wid => {
      const w = weeks[wid];
      if (!w) return [];
      return window.CATEGORIES.flatMap(c =>
        (w.items[c.id] || []).map(it => ({
          id: it.id,
          progressId: `${wid}_${it.id}`,
          title: it.title || it.id,
          weekLabel: w.label,
          cat: c.title,
        }))
      );
    });
  }, [weeks, weekOrder]);

  const total = allItems.length;

  const questionStats = useDashM(() => {
    const map = {};
    students.forEach(s => {
      Object.entries(s.items || {}).forEach(([itemId, prog]) => {
        (prog?.wrongQuestions || []).forEach(w => {
          const key = `${itemId}::${w.q}::${w.answer}`;
          if (!map[key]) map[key] = { itemId, q: w.q, answer: w.answer, count: 0 };
          map[key].count += 1;
        });
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [students]);

  const stats = (s) => {
    const its = s.items || {};

    // Match by progressId (weekId_itemId), bare itemId, OR any key ending in _itemId
    // — handles cases where weekId changed (week rebuilt / grade switched)
    const isDone = (it) => {
      if (its[it.progressId]?.done) return true;
      if (its[it.id]?.done) return true;
      // Fuzzy: find any stored key whose suffix matches the itemId
      return Object.keys(its).some(
        k => (k === it.id || k.endsWith('_' + it.id)) && its[k]?.done
      );
    };
    const done = allItems.filter(isDone).length;

    // Score: only count items that also have 'done' (avoids ghost scores from deleted items)
    // and cap at 100 to prevent impossible percentages from data corruption
    const scored = Object.keys(its).filter(id => its[id]?.score != null && its[id]?.done);
    const avg = scored.length
      ? Math.min(100, Math.round(scored.reduce((acc, id) => acc + Math.min(100, its[id].score || 0), 0) / scored.length))
      : null;
    const last = s.updatedAt
      ? new Date(s.updatedAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
      : '—';
    return { done, avg, last };
  };

  return (
    <div
      className="dash-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dash-panel">
        {/* Header */}
        <div className="dash-head">
          <div>
            <h2 className="dash-title">Class Report</h2>
            <p className="dash-meta">
              {students.length} students · {total} total items · {questionStats.length} hot questions
            </p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button
              className="btn ghost"
              style={{fontSize:12,padding:'5px 12px'}}
              onClick={() => setRefreshKey(k => k + 1)}
              title="重新載入學生資料"
            >↻ 重新整理</button>
            <button className="icon-btn" onClick={onClose} title="Close">
              <window.Icon name="close" size={16}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="dash-body">
          {!selected ? (
            /* ── Overview table ── */
              <>
              <div className="dash-hot">
                <div className="dash-section-title">Most Missed Questions</div>
                {questionStats.length === 0 ? (
                  <div className="dash-hot-empty">學生完成測驗後，這裡會顯示全班最常錯的題目。</div>
                ) : questionStats.map((q, i) => (
                  <div key={`${q.itemId}-${i}`} className="dash-hot-row">
                    <span className="dash-hot-rank">{i + 1}</span>
                    <span className="dash-hot-q">{q.q}</span>
                    <span className="dash-hot-a">{q.answer}</span>
                    <span className="dash-hot-count">{q.count}x</span>
                  </div>
                ))}
              </div>
              <div className="dash-table">
              <div className="dt-head">
                <span>Student</span>
                <span>Completed</span>
                <span>Avg Score</span>
                <span>Last Active</span>
              </div>

              {students.length === 0 ? (
                <div className="dt-empty">
                  <p>還沒有學生資料</p>
                  <p className="dt-empty-hint">學生必須用 Google 帳號登入，完成題目後才會出現在這裡。</p>
                </div>
              ) : students.map(s => {
                const { done, avg, last } = stats(s);
                const pct = total > 0 ? Math.round(done / total * 100) : 0;
                return (
                  <div key={s.uid} className="dt-row" onClick={() => setSelected(s)}>
                    <div className="dt-student-info">
                      <span className="dt-sname">{friendlyName(s)}</span>
                      <span className="dt-semail">{s.email || s.uid.slice(0, 12) + '…'}</span>
                    </div>
                    <div className="dt-progress">
                      <span className="dt-count">{done} / {total}</span>
                      <div className="dt-bar">
                        <div className="dt-bar-fill" style={{ width: pct + '%' }}/>
                      </div>
                    </div>
                    <span className="dt-score">{avg != null ? avg + '%' : '—'}</span>
                    <span className="dt-last">{last}</span>
                  </div>
                );
              })}
              </div>
              </>
          ) : (
            /* ── Individual student detail ── */
            <StudentDetail
              student={selected}
              allItems={allItems}
              onBack={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Per-student detail view ───────────────────────────── */
function StudentDetail({ student, allItems, onBack }) {
  const its = student.items || {};
  const done = allItems.filter(it =>
    (its[it.progressId]?.done) || (its[it.id]?.done) ||
    Object.keys(its).some(k => k.endsWith('_' + it.id) && its[k]?.done)
  ).length;

  // Group items by week
  const byWeek = {};
  allItems.forEach(it => {
    if (!byWeek[it.weekLabel]) byWeek[it.weekLabel] = [];
    byWeek[it.weekLabel].push(it);
  });

  return (
    <>
      <button className="dash-back" onClick={onBack}>
        <window.Icon name="arrow-left" size={14}/> Back
      </button>

      <div className="sdetail-header">
        <div>
          <h3 className="sdetail-name">{friendlyName(student)}</h3>
          <p className="sdetail-email">{student.email}</p>
        </div>
        <div className="sdetail-stat">
          <span className="sdetail-count">{done}<span style={{fontSize:'14px',fontFamily:'var(--mono)',color:'var(--ink-3)'}}> / {allItems.length}</span></span>
          <span className="sdetail-count-label">items done</span>
        </div>
      </div>

      {Object.entries(byWeek).map(([weekLabel, items]) => (
        <div key={weekLabel} className="sdetail-week">
          <p className="sdetail-wlabel">{weekLabel}</p>
          <div className="sdetail-items">
            {items.map(it => {
              // Fuzzy match: try progressId, bare id, or any key ending in _itemId
              const prog = its[it.progressId] || its[it.id] ||
                its[Object.keys(its).find(k => k.endsWith('_' + it.id)) || ''] || null;
              const isDone = !!prog?.done;
              const score  = prog?.score != null ? Math.min(100, prog.score) : null;
              return (
                <div key={it.id} className={`sdetail-item${isDone ? ' done' : ''}`}>
                  <span className={`sdetail-check${isDone ? ' done' : ''}`}>
                    {isDone ? '✓' : '○'}
                  </span>
                  <span className="sdetail-iname">{it.title}</span>
                  <span className="sdetail-cat">{it.cat}</span>
                  <span className="sdetail-score">
                    {score != null ? score + '%' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

Object.assign(window, { TeacherDashboard });
