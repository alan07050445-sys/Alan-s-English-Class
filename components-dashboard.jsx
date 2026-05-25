// components-dashboard.jsx — Teacher class-report panel

const { useState: useDash, useEffect: useDashE, useMemo: useDashM } = React;

/* ── Student list overview ─────────────────────────────── */
function TeacherDashboard({ onClose, weeks, weekOrder }) {
  const [students, setStudents] = useDash([]);
  const [selected, setSelected]  = useDash(null);

  useDashE(() => window.subscribeAllStudents(setStudents), []);

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
    const done  = allItems.filter(it => its[it.progressId]?.done || its[it.id]?.done).length;
    const scored = Object.keys(its).filter(id => its[id]?.score != null);
    const avg = scored.length
      ? Math.round(scored.reduce((acc, id) => acc + (its[id].score || 0), 0) / scored.length)
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
          <button className="icon-btn" onClick={onClose} title="Close">
            <window.Icon name="close" size={16}/>
          </button>
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
                  <p>No students have signed in yet.</p>
                  <p className="dt-empty-hint">Students appear here after they sign in with Google.</p>
                </div>
              ) : students.map(s => {
                const { done, avg, last } = stats(s);
                const pct = total > 0 ? Math.round(done / total * 100) : 0;
                return (
                  <div key={s.uid} className="dt-row" onClick={() => setSelected(s)}>
                    <div className="dt-student-info">
                      <span className="dt-sname">{s.name}</span>
                      <span className="dt-semail">{s.email}</span>
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
  const done = Object.keys(its).filter(id => its[id]?.done).length;

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
          <h3 className="sdetail-name">{student.name}</h3>
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
              const prog = its[it.progressId] || its[it.id];
              const isDone = !!prog?.done;
              const score  = prog?.score;
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
