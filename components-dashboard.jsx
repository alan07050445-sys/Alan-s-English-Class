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

/* ── Class week overview (traffic-light, at-a-glance) ──── */
const CWO_CATS = [
  { id: 'vocab',   short: '單字' },
  { id: 'grammar', short: '文法' },
  { id: 'word',    short: '字根' },
  { id: 'reading', short: '閱讀' },
];
function ClassWeekOverview({ students, weeks, weekOrder, onSelect }) {
  const [selWeekId, setSelWeekId] = useDash(() =>
    weekOrder && weekOrder.length > 0 ? weekOrder[weekOrder.length - 1] : null
  );

  const rows = useDashM(() => {
    if (!selWeekId) return [];
    return students.map(s => {
      const r = window.buildWeeklyReport(s, weeks, weekOrder, { weekId: selWeekId });
      const catMap = {};
      (window.CATEGORIES || []).forEach(c => { catMap[c.titleZh] = { done: 0, total: 0 }; });
      r.completed.forEach(x => { if (catMap[x.cat]) { catMap[x.cat].done++; catMap[x.cat].total++; } });
      r.pending.forEach(x => { if (catMap[x.cat]) { catMap[x.cat].total++; } });
      const done = r.completed.length, total = r.totalItems;
      const status = total === 0 ? 'none' : (done === 0 ? 'red' : (r.completionRate >= 80 ? 'green' : 'yellow'));
      const cats = (window.CATEGORIES || []).map((c, i) => {
        const m = catMap[c.titleZh] || { done: 0, total: 0 };
        const st = m.total === 0 ? 'none' : (m.done === 0 ? 'red' : (m.done >= m.total ? 'green' : 'yellow'));
        return { short: (CWO_CATS[i] || {}).short || c.titleZh, ...m, st };
      });
      return { s, name: friendlyName(s), done, total, pct: r.completionRate, avg: r.avgScore, status, cats, last: s.updatedAt };
    });
  }, [students, weeks, weekOrder, selWeekId]);

  const orderRank = { red: 0, yellow: 1, none: 2, green: 3 };
  const sorted = useDashM(() =>
    [...rows].sort((a, b) =>
      (orderRank[a.status] - orderRank[b.status]) || (a.pct - b.pct) || a.name.localeCompare(b.name)
    ), [rows]);

  const sum = useDashM(() => {
    let green = 0, yellow = 0, red = 0, none = 0, sp = 0, n = 0;
    rows.forEach(r => {
      if (r.status === 'green') green++; else if (r.status === 'yellow') yellow++;
      else if (r.status === 'red') red++; else none++;
      if (r.total > 0) { sp += r.pct; n++; }
    });
    return { green, yellow, red, none, avgPct: n ? Math.round(sp / n) : 0, items: rows[0]?.total || 0 };
  }, [rows]);

  const fmtLast = (t) => t ? new Date(t).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="cwo">
      <div className="cwo-controls">
        <label className="report-week-label">週次</label>
        <select className="report-week-select" value={selWeekId || ''} onChange={e => setSelWeekId(e.target.value)}>
          {(weekOrder || []).slice().reverse().map(wid => (
            <option key={wid} value={wid}>
              {weeks[wid]?.label || wid}{weeks[wid]?.dateRange ? `  (${weeks[wid].dateRange})` : ''}
            </option>
          ))}
        </select>
        <span className="cwo-itemcount">本週 {sum.items} 項練習</span>
      </div>

      <div className="cwo-summary">
        <div className="cwo-stat cwo-stat-big">
          <div className="cwo-stat-num">{sum.avgPct}%</div>
          <div className="cwo-stat-label">全班平均完成率</div>
        </div>
        <div className="cwo-stat st-green"><div className="cwo-stat-num">{sum.green}</div><div className="cwo-stat-label">🟢 完成</div></div>
        <div className="cwo-stat st-yellow"><div className="cwo-stat-num">{sum.yellow}</div><div className="cwo-stat-label">🟡 進行中</div></div>
        <div className="cwo-stat st-red"><div className="cwo-stat-num">{sum.red}</div><div className="cwo-stat-label">🔴 未開始</div></div>
      </div>

      {students.length === 0 ? (
        <div className="dt-empty">
          <p>還沒有學生資料</p>
          <p className="dt-empty-hint">學生用 Google 帳號登入並完成題目後，就會出現在這裡。</p>
        </div>
      ) : (
        <div className="cwo-list">
          {sorted.map(r => (
            <div key={r.s.uid} className={`cwo-row st-${r.status}`} onClick={() => onSelect(r.s)} title="點擊查看詳情與週報">
              <span className={`cwo-light st-${r.status}`}/>
              <div className="cwo-name-wrap">
                <span className="cwo-name">{r.name}</span>
                <span className="cwo-email">{r.s.email || ''}</span>
              </div>
              <div className="cwo-prog">
                <div className="cwo-prog-top">
                  <span className="cwo-count">{r.done}/{r.total}</span>
                  <span className="cwo-pct">{r.pct}%</span>
                </div>
                <div className="cwo-bar"><div className={`cwo-bar-fill st-${r.status}`} style={{ width: r.pct + '%' }}/></div>
              </div>
              <div className="cwo-cats">
                {r.cats.map((c, i) => (
                  <span key={i} className={`cwo-cat st-${c.st}`} title={`${c.short} ${c.done}/${c.total}`}>{c.short}</span>
                ))}
              </div>
              <span className="cwo-avg">{r.avg != null ? r.avg + '分' : '—'}</span>
              <span className="cwo-last">{fmtLast(r.last)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="cwo-hint">依「需要關注」排序：未開始 → 進行中 → 完成。點任一位學生可看詳情並產生家長週報。</p>
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

/* ── 暑假發派 tab（v209：題庫單元 → 逐一勾選發派給學生）──── */
function SummerAdmin() {
  const [roster, setRoster]   = useDash([]);
  const [meta, setMeta]       = useDash({ students: {} });
  const [lib, setLib]         = useDash({ weeks: null, order: [] });
  const [openStu, setOpenStu] = useDash(null);  // 展開中的學生 email
  const [openWeek, setOpenWeek] = useDash(null); // 展開中的週（v234: 週次收合，介面才不會爆炸）
  const [err, setErr]         = useDash(null);

  useDashE(() => window.subscribeRoster(setRoster, () => setErr('讀取名單失敗')), []);
  useDashE(() => (window.subscribeSummerMeta ? window.subscribeSummerMeta(setMeta, () => setErr('讀取暑假設定失敗')) : undefined), []);
  useDashE(() => {
    if (!window.summerApi) return;
    return window.summerApi(window.SUMMER_LIB || 'sl')
      .subscribe((w, o) => setLib({ weeks: w, order: o }), () => setErr('讀取題庫失敗'));
  }, []);

  const suffixes = window.SUMMER_WEEK_SUFFIXES || [];
  const cats     = window.SUMMER_CATEGORIES || [];
  const active   = roster.filter(s => s.active !== false);

  const planOf  = (email) => (meta.students || {})[String(email || '').toLowerCase()] || null;
  const countOf = (plan) => plan ? Object.values(plan.weeks || {}).reduce((s, a) => s + (a ? a.length : 0), 0) : 0;

  // 取某週的題庫內容（依分類分組；空分類不顯示）
  const libWeekOf = (sfx) => {
    const wid = (lib.order || []).find(id => String(id).endsWith(sfx));
    return (wid && lib.weeks && lib.weeks[wid]) || null;
  };
  const weekGroups = (sfx) => {
    const w = libWeekOf(sfx);
    if (!w) return [];
    return cats
      .map(c => ({ cat: c, items: (w.items || {})[c.id] || [] }))
      .filter(g => g.items.length > 0);
  };
  const libHasContent = suffixes.some(sfx => weekGroups(sfx).length > 0);

  // 完整寫回（每週都帶陣列，取消勾選才會確實覆蓋）
  const writePlan = async (stu, weeksMap) => {
    const full = {};
    suffixes.forEach(sfx => { full[sfx] = (weeksMap && weeksMap[sfx]) || []; });
    try {
      await window.saveSummerStudent(stu.email, {
        name: stu.name || String(stu.email).split('@')[0],
        weeks: full,
      });
    } catch (e) { alert('儲存失敗：' + ((e && e.message) || e)); }
  };

  const toggleItem = (stu, sfx, itemId) => {
    const plan = planOf(stu.email);
    const cur = new Set((plan && plan.weeks && plan.weeks[sfx]) || []);
    if (cur.has(itemId)) cur.delete(itemId); else cur.add(itemId);
    writePlan(stu, { ...((plan && plan.weeks) || {}), [sfx]: Array.from(cur) });
  };

  const toggleWeekAll = (stu, sfx) => {
    const all = weekGroups(sfx).flatMap(g => g.items.map(it => it.id));
    const plan = planOf(stu.email);
    const cur = (plan && plan.weeks && plan.weeks[sfx]) || [];
    const next = cur.length >= all.length ? [] : all;
    writePlan(stu, { ...((plan && plan.weeks) || {}), [sfx]: next });
  };

  const applyFrom = (stu, fromEmail) => {
    const src = planOf(fromEmail);
    if (!src) return;
    if (!confirm(`把「${src.name || fromEmail}」的清單套用到「${stu.name || stu.email}」？（會覆蓋現有勾選；套用的是同一份題目的引用，不是複製）`)) return;
    writePlan(stu, src.weeks || {});
  };

  return (
    <div className="sa">
      {err && <div className="sa-err">{err}</div>}
      <div className="sa-hint">
        先到「暑假題庫」出題（登出年級後選年級頁的 ☀️ 入口），再回這裡勾選發派。
        同一單元發給多位學生時<b>共用同一份內容</b>——題庫改了，所有人同步更新。
      </div>
      {!libHasContent && lib.weeks && (
        <div className="sa-empty">題庫還沒有內容——先到暑假題庫出題，這裡就會出現可勾選的單元。</div>
      )}
      {active.length === 0 && <div className="sa-empty">名單是空的——先到「學生名單」新增學生。</div>}

      {active.map(stu => {
        const plan = planOf(stu.email);
        const n = countOf(plan);
        const open = openStu === stu.email;
        const others = active.filter(o => o.email !== stu.email && countOf(planOf(o.email)) > 0);
        return (
          <div className={`sa-stu2${open ? ' open' : ''}`} key={stu.email}>
            <button className="sa-stu2-head" onClick={() => { setOpenStu(open ? null : stu.email); setOpenWeek(null); }}>
              <span className="sa-stu2-name">☀️ {stu.name || stu.email}</span>
              <span className="sa-stu2-email">{stu.email}</span>
              <span className={`sa-stu2-count${n > 0 ? ' on' : ''}`}>{n > 0 ? `已派 ${n} 項` : '未發派'}</span>
              <span className="sa-stu2-chev">{open ? '⌃' : '⌄'}</span>
            </button>
            {open && (
              <div className="sa-stu2-body">
                {others.length > 0 && (
                  <div className="sa-apply">
                    <span>快速套用其他學生的清單：</span>
                    <select defaultValue="" onChange={e => { const v = e.target.value; e.target.value = ''; if (v) applyFrom(stu, v); }}>
                      <option value="">選擇學生…</option>
                      {others.map(o => (
                        <option key={o.email} value={o.email}>
                          {o.name || o.email}（{countOf(planOf(o.email))} 項）
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {suffixes.map((sfx, i) => {
                  const groups = weekGroups(sfx);
                  if (!groups.length) return null;
                  const w = libWeekOf(sfx);
                  const sel = new Set((plan && plan.weeks && plan.weeks[sfx]) || []);
                  const allIds = groups.flatMap(g => g.items.map(it => it.id));
                  const wOpen = openWeek === sfx;
                  return (
                    <div className={`sa-week${wOpen ? '' : ' closed'}`} key={sfx}>
                      <button className="sa-week-head sa-week-head-btn" onClick={() => setOpenWeek(wOpen ? null : sfx)}>
                        <span className="sa-week-title">Week {i + 1}<em>{w && w.dateRange}</em></span>
                        <span className={`sa-week-count${sel.size > 0 ? ' on' : ''}`}>
                          {sel.size > 0 ? `已派 ${sel.size} / ${allIds.length}` : `未發派 · ${allIds.length} 個單元`}
                        </span>
                        <span className="sa-week-chev">{wOpen ? '⌃' : '⌄'}</span>
                      </button>
                      {wOpen && (
                        <>
                          <div className="sa-week-tools">
                            <button className="sa-week-all" onClick={() => toggleWeekAll(stu, sfx)}>
                              {sel.size >= allIds.length ? '清空本週' : '全選本週'}
                            </button>
                          </div>
                          {groups.map(g => (
                            <div className="sa-cat" key={g.cat.id}>
                              <span className="sa-cat-lbl">{g.cat.titleZh}</span>
                              <div className="sa-chips">
                                {g.items.map(it => (
                                  <label className={`sa-chip${sel.has(it.id) ? ' on' : ''}`} key={it.id}>
                                    <input
                                      type="checkbox"
                                      checked={sel.has(it.id)}
                                      onChange={() => toggleItem(stu, sfx, it.id)}
                                    />
                                    <span>{it.title}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
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
  const [tab,            setTab]           = useDash('overview'); // 'overview' | 'report' | 'roster'

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

  // v236: 專業後台外殼——側欄導覽 + 頂列，內容元件不變
  const NAV = [
    { id: 'overview', ico: '🚦', label: '總覽', sub: '誰需要關心' },
    { id: 'report',   ico: '📊', label: '學習報告', sub: '成績與常錯題' },
    { id: 'roster',   ico: '👥', label: '學生名單', sub: '帳號管理' },
    { id: 'summer',   ico: '☀️', label: '暑假發派', sub: '每人任務清單' },
  ];
  const cur = NAV.find(n => n.id === tab) || NAV[0];

  return (
    <div className="dash-overlay tdash">
      <div className="tdash-shell">
        <aside className="tdash-side">
          <div className="tdash-brand">
            <span className="tdash-brand-a">A<i>.</i></span>
            <span className="tdash-brand-t">老師後台<em>Admin Console</em></span>
          </div>
          <nav className="tdash-nav">
            {NAV.map(n => (
              <button
                key={n.id}
                className={`tdash-nav-item${tab === n.id ? ' on' : ''}`}
                onClick={() => { setTab(n.id); setSelected(null); }}
              >
                <span className="tdash-nav-ico">{n.ico}</span>
                <span className="tdash-nav-txt">{n.label}<em>{n.sub}</em></span>
              </button>
            ))}
          </nav>
          <div className="tdash-side-foot">
            <button className="tdash-side-btn" onClick={() => setAllReportOpen(true)}>📋 全班週報</button>
            <button className="tdash-side-btn" onClick={() => setRefreshKey(k => k + 1)}>↻ 重新整理</button>
            <button className="tdash-side-btn tdash-exit" onClick={onClose}>← 回到網站</button>
          </div>
        </aside>

        <main className="tdash-main">
          <header className="tdash-top">
            <div className="tdash-top-title">
              <h2>{selected ? `${selected.name || '學生'} 的學習紀錄` : cur.label}</h2>
              <span className="tdash-top-meta">
                {selected ? '個人完成度、分數與錯題' : tab === 'report'
                  ? `${students.length} 位學生 · ${total} 個項目`
                  : cur.sub}
              </span>
            </div>
            <button className="tdash-close" onClick={onClose} title="關閉後台">
              <window.Icon name="close" size={16}/>
            </button>
          </header>

          {/* Body */}
          <div className="dash-body tdash-content">
          {tab === 'roster' ? (
            <RosterManager/>
          ) : tab === 'summer' ? (
            <SummerAdmin/>
          ) : selected ? (
            /* ── Individual student detail ── */
            <StudentDetail
              student={selected}
              allItems={allItems}
              weeks={weeks}
              weekOrder={weekOrder}
              onBack={() => setSelected(null)}
            />
          ) : tab === 'overview' ? (
            <ClassWeekOverview
              students={students}
              weeks={weeks}
              weekOrder={weekOrder}
              onSelect={setSelected}
            />
          ) : (
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
          )}
          </div>
        </main>

        {allReportOpen && (
          <AllClassReportModal
            students={students}
            weeks={weeks}
            weekOrder={weekOrder}
            onClose={() => setAllReportOpen(false)}
          />
        )}
      </div>
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
