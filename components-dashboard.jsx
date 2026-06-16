// components-dashboard.jsx — Teacher class-report panel

const { useState: useDash, useEffect: useDashE, useMemo: useDashM } = React;

/* ── Weekly Report Modal (single student) ─────────────── */
function WeeklyReportModal({ student, weeks, weekOrder, onClose }) {
  const [selWeekId, setSelWeekId] = useDash(() =>
    weekOrder && weekOrder.length > 0 ? weekOrder[weekOrder.length - 1] : null
  );
  const [copied, setCopied] = useDash(false);
  const [note, setNote] = useDash('');

  const report = useDashM(() =>
    window.buildWeeklyReport(student, weeks, weekOrder, { weekId: selWeekId }),
    [student, weeks, weekOrder, selWeekId]
  );
  const name = friendlyName(student);
  const textReport = useDashM(() => window.formatReportAsText(report, name), [report, name]);

  const handleCopy = () => {
    navigator.clipboard.writeText(textReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  };

  const openVisual = () => {
    if (!window.buildReportHTML) return;
    const html = window.buildReportHTML(report, name, note);
    const w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  };

  return (
    <div className="report-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="report-modal">
        <div className="report-modal-head">
          <h3 className="report-modal-title">📋 學習週報 — {name}</h3>
          <button className="icon-btn" onClick={onClose}><window.Icon name="close" size={16}/></button>
        </div>
        <div className="report-modal-controls">
          <label className="report-week-label">週次</label>
          <select className="report-week-select" value={selWeekId || ''} onChange={e => setSelWeekId(e.target.value)}>
            {(weekOrder || []).slice().reverse().map(wid => (
              <option key={wid} value={wid}>
                {weeks[wid]?.label || wid}{weeks[wid]?.dateRange ? `  (${weeks[wid].dateRange})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="report-note-field">
          <label className="report-week-label">老師的話（會出現在圖文週報，可留空）</label>
          <textarea
            className="report-note-input"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="例如：語桐這週單字進步很多，文法的第三人稱單數再多練習就更穩了！"
            rows={3}
          />
        </div>
        <button className="report-visual-btn" onClick={openVisual}>
          🖼️ 開啟圖文週報（給家長 · 截圖傳 LINE）
        </button>
        <div className="report-preview">
          <pre className="report-preview-text">{textReport}</pre>
        </div>
        <button className={`report-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
          {copied ? '已複製 ✓' : '📋 複製文字版（貼到 LINE）'}
        </button>
      </div>
    </div>
  );
}

/* ── All-Class Report Modal ────────────────────────────── */
function AllClassReportModal({ students, weeks, weekOrder, onClose }) {
  const [selWeekId, setSelWeekId] = useDash(() =>
    weekOrder && weekOrder.length > 0 ? weekOrder[weekOrder.length - 1] : null
  );
  const [copied, setCopied] = useDash(false);

  const allText = useDashM(() => {
    if (!selWeekId || !students.length) return '尚無學生資料。';
    return students.map(s => {
      const r = window.buildWeeklyReport(s, weeks, weekOrder, { weekId: selWeekId });
      return window.formatReportAsText(r, friendlyName(s));
    }).join('\n\n' + '－'.repeat(28) + '\n\n');
  }, [students, weeks, weekOrder, selWeekId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(allText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  };

  return (
    <div className="report-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="report-modal report-modal-wide">
        <div className="report-modal-head">
          <h3 className="report-modal-title">📋 全班週報</h3>
          <button className="icon-btn" onClick={onClose}><window.Icon name="close" size={16}/></button>
        </div>
        <div className="report-modal-controls">
          <label className="report-week-label">週次</label>
          <select className="report-week-select" value={selWeekId || ''} onChange={e => setSelWeekId(e.target.value)}>
            {(weekOrder || []).slice().reverse().map(wid => (
              <option key={wid} value={wid}>
                {weeks[wid]?.label || wid}{weeks[wid]?.dateRange ? `  (${weeks[wid].dateRange})` : ''}
              </option>
            ))}
          </select>
          <span className="report-student-count">{students.length} 位學生</span>
        </div>
        <div className="report-preview report-preview-tall">
          <pre className="report-preview-text">{allText}</pre>
        </div>
        <button className={`report-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
          {copied ? '已複製 ✓' : '📋 複製全班週報'}
        </button>
      </div>
    </div>
  );
}

/* ── Detect Firebase-UID-like strings (28 chars [A-Za-z0-9]) ── */
function isUid(str) {
  return !str || /^[A-Za-z0-9]{20,}$/.test(str.trim());
}
function friendlyName(s) {
  if (!isUid(s.name)) return s.name;
  // Fall back to email prefix, then "未命名學生"
  return s.email ? s.email.split('@')[0] : '未命名學生';
}

/* ── Roster management tab (學生名單) ──────────────────── */
function RosterManager() {
  const [roster, setRoster]   = useDash([]);
  const [email, setEmail]     = useDash('');
  const [name, setName]       = useDash('');
  const [grade, setGrade]     = useDash('g3');
  const [err, setErr]         = useDash(null);
  const [busy, setBusy]       = useDash(false);

  useDashE(() => window.subscribeRoster(setRoster, () => setErr('讀取名單失敗 — 請先到 Firebase Console 部署新版 firestore.rules')), []);

  const handleAdd = async () => {
    setErr(null);
    if (!email.trim().includes('@')) { setErr('請輸入有效的 email'); return; }
    setBusy(true);
    try {
      await window.addRosterStudent(email, name, grade);
      setEmail(''); setName('');
    } catch(e) { setErr('新增失敗：' + (e.code || e.message)); }
    setBusy(false);
  };

  return (
    <div className="roster-wrap">
      <div className="roster-form">
        <input
          className="roster-input"
          placeholder="學生 Google email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input
          className="roster-input roster-input-name"
          placeholder="姓名"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <select className="roster-input roster-input-grade" value={grade} onChange={e => setGrade(e.target.value)}>
          {['g2','g3','g4','g5','g6'].map(g => <option key={g} value={g}>{g.toUpperCase()}</option>)}
        </select>
        <button className="roster-add-btn" onClick={handleAdd} disabled={busy}>＋ 新增</button>
      </div>
      {err && <div className="roster-err">⚠️ {err}</div>}

      <div className="roster-hint">
        名單在「部署新版 firestore.rules」後才會生效 — 屆時只有名單內（啟用中）的學生能看到課程內容。
      </div>

      {roster.length === 0 ? (
        <div className="dt-empty"><p>名單是空的</p><p className="dt-empty-hint">把學生的 Google email 加進來，部署規則後就只有他們能使用。</p></div>
      ) : (
        <div className="roster-list">
          {roster.map(s => (
            <div key={s.email} className={`roster-row${s.active === false ? ' inactive' : ''}`}>
              <div className="roster-row-info">
                <span className="roster-row-name">{s.name || '—'}</span>
                <span className="roster-row-email">{s.email}</span>
              </div>
              <span className="roster-row-grade">{(s.grade || '').toUpperCase()}</span>
              <button
                className="roster-toggle-btn"
                onClick={() => window.setRosterStudentActive(s.email, s.active === false)}
                title={s.active === false ? '重新啟用' : '停用（保留資料）'}
              >{s.active === false ? '已停用' : '啟用中'}</button>
              <button
                className="roster-del-btn"
                onClick={() => { if (confirm(`確定刪除 ${s.email}？`)) window.deleteRosterStudent(s.email); }}
                title="刪除"
              ><window.Icon name="trash" size={13}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Student list overview ─────────────────────────────── */
function TeacherDashboard({ onClose, weeks, weekOrder }) {
  const [students,       setStudents]      = useDash([]);
  const [selected,       setSelected]      = useDash(null);
  const [refreshKey,     setRefreshKey]    = useDash(0);
  const [allReportOpen,  setAllReportOpen] = useDash(false);
  const [tab,            setTab]           = useDash('report'); // 'report' | 'roster'

  useDashE(() => window.subscribeAllStudents(setStudents), [refreshKey]);
  useDashE(() => {
    if (!selected) return;
    const fresh = students.find(s => s.uid === selected.uid);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [students, selected?.uid]);

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
            <div className="dash-tabs">
              <button
                className={`dash-tab${tab === 'report' ? ' on' : ''}`}
                onClick={() => { setTab('report'); setSelected(null); }}
              >📊 學習報告</button>
              <button
                className={`dash-tab${tab === 'roster' ? ' on' : ''}`}
                onClick={() => { setTab('roster'); setSelected(null); }}
              >👥 學生名單</button>
            </div>
            {tab === 'report' && (
              <p className="dash-meta">
                {students.length} students · {total} total items · {questionStats.length} hot questions
              </p>
            )}
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button
              className="btn ghost"
              style={{fontSize:12,padding:'5px 12px'}}
              onClick={() => setAllReportOpen(true)}
              title="產生全班週報"
            >📋 全班週報</button>
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
          {tab === 'roster' ? (
            <RosterManager/>
          ) : !selected ? (
            /* ── Overview table ── */
              <>
              {window.CoopGoalSetter && <window.CoopGoalSetter/>}
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
              weeks={weeks}
              weekOrder={weekOrder}
              onBack={() => setSelected(null)}
            />
          )}
        </div>
      </div>

      {allReportOpen && (
        <AllClassReportModal
          students={students}
          weeks={weeks}
          weekOrder={weekOrder}
          onClose={() => setAllReportOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Per-student detail view ───────────────────────────── */
function StudentDetail({ student, allItems, weeks, weekOrder, onBack }) {
  const [reportOpen, setReportOpen] = useDash(false);

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
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
        <button className="dash-back" onClick={onBack} style={{marginBottom:0}}>
          <window.Icon name="arrow-left" size={14}/> Back
        </button>
        <button className="report-gen-btn" onClick={() => setReportOpen(true)} title="產生學習週報">
          📋 產生週報
        </button>
      </div>

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

      {reportOpen && (
        <WeeklyReportModal
          student={student}
          weeks={weeks}
          weekOrder={weekOrder}
          onClose={() => setReportOpen(false)}
        />
      )}

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
