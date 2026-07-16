// components-dashboard.jsx — Teacher class-report panel

const { useState: useDash, useEffect: useDashE, useMemo: useDashM } = React;

/* ── Weekly Report Modal (single student) ─────────────── */
function WeeklyReportModal({ student, weeks, weekOrder, initialWeekId, onClose }) {
  const [selWeekId, setSelWeekId] = useDash(() =>
    initialWeekId || (weekOrder && weekOrder.length > 0 ? weekOrder[weekOrder.length - 1] : null)
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
function AllClassReportModal({ students, weeks, weekOrder, weeksFor, initialWeekId, onClose }) {
  const [selWeekId, setSelWeekId] = useDash(() =>
    initialWeekId || (weekOrder && weekOrder.length > 0 ? weekOrder[weekOrder.length - 1] : null)
  );
  const [copied, setCopied] = useDash(false);

  const allText = useDashM(() => {
    if (!selWeekId || !students.length) return '尚無學生資料。';
    return students.map(s => {
      const r = window.buildWeeklyReport(s, weeksFor ? weeksFor(s) : weeks, weekOrder, { weekId: selWeekId });
      return window.formatReportAsText(r, friendlyName(s));
    }).join('\n\n' + '－'.repeat(28) + '\n\n');
  }, [students, weeks, weekOrder, selWeekId, weeksFor]);

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
function ClassWeekOverview({ students, weeks, weekOrder, weeksFor, onSelect, selWeekId, setSelWeekId }) {
  // v251: selWeekId 由 TeacherDashboard 統一管理（進學生詳情返回不再重置、預設=今天所在週）
  const [gradeFilter, setGradeFilter] = useDash('all'); // v237: 年級篩選
  const [q, setQ] = useDash('');                         // v237: 學生搜尋

  const rows = useDashM(() => {
    if (!selWeekId) return [];
    return students.map(s => {
      const r = window.buildWeeklyReport(s, weeksFor ? weeksFor(s) : weeks, weekOrder, { weekId: selWeekId }); // v238: 暑假=只算派給他的
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
      return { s, name: friendlyName(s), grade: window.gradeFromEmail(s.email), done, total, pct: r.completionRate, avg: r.avgScore, status, cats, last: s.updatedAt, late: r.lateCount || 0 };
    });
  }, [students, weeks, weekOrder, selWeekId, weeksFor]);

  const orderRank = { red: 0, yellow: 1, none: 2, green: 3 };
  const sorted = useDashM(() =>
    [...rows].sort((a, b) =>
      (orderRank[a.status] - orderRank[b.status]) || (a.pct - b.pct) || a.name.localeCompare(b.name)
    ), [rows]);

  // v237: 年級篩選 + 搜尋（KPI 跟著篩選後的名單計算）
  const gradeChips = useDashM(() => {
    const present = new Set(rows.map(r => r.grade).filter(Boolean));
    const chips = ['all', ...['g2', 'g3', 'g4', 'g5', 'g6'].filter(g => present.has(g))];
    if (rows.some(r => !r.grade)) chips.push('other');
    return chips;
  }, [rows]);
  const shown = useDashM(() => sorted.filter(r =>
    (gradeFilter === 'all' || (gradeFilter === 'other' ? !r.grade : r.grade === gradeFilter)) &&
    (!q.trim() || (r.name + ' ' + (r.s.email || '')).toLowerCase().includes(q.trim().toLowerCase()))
  ), [sorted, gradeFilter, q]);

  const sum = useDashM(() => {
    let green = 0, yellow = 0, red = 0, none = 0, sp = 0, n = 0;
    shown.forEach(r => {
      if (r.status === 'green') green++; else if (r.status === 'yellow') yellow++;
      else if (r.status === 'red') red++; else none++;
      if (r.total > 0) { sp += r.pct; n++; }
    });
    return { green, yellow, red, none, avgPct: n ? Math.round(sp / n) : 0, items: rows.reduce((m, r) => Math.max(m, r.total), 0) };
  }, [shown, rows]);

  const fmtLast = (t) => {
    if (!t) return '—';
    const days = Math.floor((Date.now() - t) / 86400000);
    return days <= 0 ? '今天' : days === 1 ? '昨天' : days < 7 ? `${days} 天前`
      : new Date(t).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  const exportCsv = () => {
    const head = ['姓名', 'Email', '年級', '完成', '總數', '完成率%', '平均分', '補交', '最後活動'];
    const lines = shown.map(r => [r.name, r.s.email || '', r.grade ? r.grade.toUpperCase() : '',
      r.done, r.total, r.pct, r.avg != null ? r.avg : '', r.late || 0, r.last ? new Date(r.last).toLocaleDateString('zh-TW') : '']);
    const csv = '\uFEFF' + [head, ...lines].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const aEl = document.createElement('a');
    aEl.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    aEl.download = `班級總覽_${(weeks[selWeekId] && weeks[selWeekId].label) || selWeekId || ''}.csv`;
    document.body.appendChild(aEl); aEl.click(); aEl.remove();
  };

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
        {gradeChips.length > 2 && (
          <div className="cwo-fchips">
            {gradeChips.map(g => (
              <button key={g} className={`cwo-fchip${gradeFilter === g ? ' on' : ''}`} onClick={() => setGradeFilter(g)}>
                {g === 'all' ? '全部' : g === 'other' ? '其他' : g.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        <input className="cwo-search" placeholder="🔍 搜尋學生…" value={q} onChange={e => setQ(e.target.value)}/>
        <button className="cwo-export" onClick={exportCsv} title="下載目前名單的 CSV（Excel 可開）">⬇ CSV</button>
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
          {shown.map(r => (
            <div key={r.s.uid} className={`cwo-row st-${r.status}`} onClick={() => onSelect(r.s)} title="點擊查看詳情與週報">
              <span className={`cwo-light st-${r.status}`}/>
              <div className="cwo-name-wrap">
                <span className="cwo-name">{r.name}{r.grade && <span className="dash-grade">{r.grade.toUpperCase()}</span>}{r.late > 0 && <span className="cwo-late" title="截止日之後才完成的項目數">⏰ {r.late} 補交</span>}</span>
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

/* ── v251 週次工具：解析 "Jul 1 – Jul 5" 日期區間、找「今天所在的週」 ── */
function _dashParseRange(dr) {
  if (!dr) return null;
  const parts = String(dr).split(/[–—]|-(?= )/).map(x => x.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const yr = new Date().getFullYear();
  const start = new Date(parts[0] + ' ' + yr);
  const end = new Date(parts[1] + ' ' + yr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function dashCurrentWeekId(weeks, order) {
  const now = new Date();
  let lastStarted = null;
  for (const wid of (order || [])) {
    const r = _dashParseRange(weeks[wid] && weeks[wid].dateRange);
    if (!r) continue;
    if (now >= r.start && now <= r.end) return wid;
    if (r.start <= now) lastStarted = wid;
  }
  return lastStarted || (order && order.length ? order[order.length - 1] : null);
}

/* ── 暑假發派（v251：週次 × 單元×學生 勾選矩陣——一眼看全班、整列批次發派）──── */
function SummerAdmin() {
  const [roster, setRoster] = useDash([]);
  const [meta, setMeta]     = useDash({ students: {} });
  const [lib, setLib]       = useDash({ weeks: null, order: [] });
  const [sfx, setSfx]       = useDash(null);   // 當前週 suffix（SW01…）
  const [err, setErr]       = useDash(null);
  const [busy, setBusy]     = useDash(false);

  useDashE(() => window.subscribeRoster(setRoster, () => setErr('讀取名單失敗')), []);
  useDashE(() => (window.subscribeSummerMeta ? window.subscribeSummerMeta(setMeta, () => setErr('讀取暑假設定失敗')) : undefined), []);
  useDashE(() => {
    if (!window.summerApi) return;
    return window.summerApi(window.SUMMER_LIB || 'sl')
      .subscribe((w, o) => setLib({ weeks: w, order: o }), () => setErr('讀取題庫失敗'));
  }, []);

  const suffixes = window.SUMMER_WEEK_SUFFIXES || [];
  const cats     = window.SUMMER_CATEGORIES || [];
  const active   = roster.filter(st => st.active !== false).slice().sort((a, b) => {
    const ga = window.gradeFromEmail(a.email) || a.grade || 'zz';
    const gb = window.gradeFromEmail(b.email) || b.grade || 'zz';
    return String(ga).localeCompare(String(gb)) || String(a.name || a.email).localeCompare(String(b.name || b.email), 'zh-Hant');
  });

  const libWeekOf = (suffix) => {
    const wid = (lib.order || []).find(id => String(id).endsWith(suffix));
    return (wid && lib.weeks && lib.weeks[wid]) || null;
  };

  // 預設選「今天所在的暑假週」
  useDashE(() => {
    if (sfx || !lib.order || !lib.order.length) return;
    const wid = dashCurrentWeekId(lib.weeks || {}, lib.order);
    const suf = wid ? suffixes.find(x => String(wid).endsWith(x)) : null;
    setSfx(suf || suffixes[0] || null);
  }, [lib.order]);

  const groups = useDashM(() => {
    if (!sfx) return [];
    const w = libWeekOf(sfx);
    if (!w) return [];
    return cats.map(c => ({ cat: c, items: (w.items || {})[c.id] || [] })).filter(g => g.items.length > 0);
  }, [lib, sfx]);
  const allIds = groups.flatMap(g => g.items.map(it => it.id));

  // v251b: 樂觀更新——連續快速勾選時不等 Firestore 快照回來，避免互相蓋寫
  const [optimistic, setOptimistic] = useDash({}); // email → weeks map（本地最新意圖）
  const planOf = (email) => (meta.students || {})[String(email || '').toLowerCase()] || null;
  const weeksOf = (stu) => optimistic[String(stu.email).toLowerCase()] || ((planOf(stu.email) || {}).weeks || {});
  const setOf  = (stu) => new Set((weeksOf(stu) || {})[sfx] || []);
  const shortName = (stu) => {
    const m = String(stu.name || '').match(/[A-Za-z]+/);
    return m ? m[0] : String(stu.name || stu.email).slice(0, 4);
  };

  // 寫回這位學生「本週」的完整清單（其他週保留原樣）
  const writePlan = async (stu, ids) => {
    const base = weeksOf(stu);
    const full = {};
    suffixes.forEach(x => { full[x] = base[x] || []; });
    full[sfx] = ids;
    setOptimistic(prev => ({ ...prev, [String(stu.email).toLowerCase()]: full }));
    try {
      await window.saveSummerStudent(stu.email, {
        name: stu.name || String(stu.email).split('@')[0],
        weeks: full,
      });
    } catch (e) { alert('儲存失敗：' + ((e && e.message) || e)); }
  };
  const toggleCell = (stu, itemId) => {
    const cur = setOf(stu);
    if (cur.has(itemId)) cur.delete(itemId); else cur.add(itemId);
    writePlan(stu, Array.from(cur));
  };
  const toggleRow = async (itemId) => {         // 整列：這個單元 → 全班發派／全班取消
    const everyone = active.length > 0 && active.every(stu => setOf(stu).has(itemId));
    setBusy(true);
    await Promise.all(active.map(stu => {
      const cur = setOf(stu);
      if (everyone) cur.delete(itemId); else cur.add(itemId);
      return writePlan(stu, Array.from(cur));
    }));
    setBusy(false);
  };
  const toggleCol = (stu) => {                  // 整欄：這位學生本週 全選／清空
    const cur = setOf(stu);
    writePlan(stu, cur.size >= allIds.length ? [] : allIds.slice());
  };

  // v253: 「＋出題給他」——從學生視角直接出題：存進題庫＋自動發派給這位學生
  const [compose, setCompose] = useDash(null); // { stu, catId?, draft? }
  const startCompose = (catId) => setCompose(prev => ({
    ...prev,
    catId,
    draft: {
      id: catId[0] + Date.now() + Math.random().toString(36).slice(2, 6),
      _isNew: true,
      type: 'flashcard',
      title: '', zh: '', duration: '', url: '', embed: '', body: '',
    },
  }));
  const saveCompose = async (form) => {
    const { _isNew, ...clean } = form;
    const wid = (lib.order || []).find(id => String(id).endsWith(sfx));
    if (!wid || !lib.weeks) { alert('題庫還沒載入，稍等再試。'); return; }
    const w = JSON.parse(JSON.stringify(lib.weeks));
    if (!w[wid].items) w[wid].items = {};
    const list = w[wid].items[compose.catId] || [];
    w[wid].items[compose.catId] = [...list, clean];
    try {
      await window.summerApi(window.SUMMER_LIB || 'sl').saveWeeks(w);
    } catch (e) { alert('儲存失敗：' + ((e && e.message) || e)); return; }
    setLib(prev => ({ ...prev, weeks: w })); // 樂觀更新（快照回來會覆蓋成一致）
    const cur = setOf(compose.stu);
    cur.add(clean.id);
    await writePlan(compose.stu, Array.from(cur));
    setCompose(null);
  };

  return (
    <div className="sa">
      {err && <div className="sa-err">{err}</div>}
      <div className="sa-hint">
        先到「暑假題庫」出題，再回這裡勾選發派。同一單元發給多位學生時<b>共用同一份內容</b>——題庫改了，所有人同步更新。
      </div>

      <div className="sa-weeks">
        {suffixes.map((x, i) => {
          const w = libWeekOf(x);
          if (!w) return null;
          const has = cats.some(c => ((w.items || {})[c.id] || []).length > 0);
          if (!has) return null;
          return (
            <button key={x} className={`sa-wchip${sfx === x ? ' on' : ''}`} onClick={() => setSfx(x)}>
              <b>Week {i + 1}</b>
              {w.dateRange ? <span>{w.dateRange}</span> : null}
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div className="sa-empty">這一週題庫還沒有內容——先到暑假題庫出題，這裡就會出現可勾選的單元。</div>
      ) : active.length === 0 ? (
        <div className="sa-empty">名單是空的——先到「學生名單」新增學生。</div>
      ) : (
        <div className="sa-mx-wrap">
          <table className="sa-mx">
            <thead>
              <tr>
                <th className="sa-mx-unitcol">單元 × 學生</th>
                {active.map(stu => (
                  <th key={stu.email}>
                    <div className="sa-mx-stuwrap">
                      <button className="sa-mx-stu" onClick={() => toggleCol(stu)} title={`${stu.name || stu.email}：點一下＝本週全選／清空`}>
                        <b>{shortName(stu)}</b>
                        <span className={setOf(stu).size > 0 ? 'on' : ''}>{setOf(stu).size}/{allIds.length}</span>
                      </button>
                      <button className="sa-mx-add" title={`出題給 ${shortName(stu)}：新單元存進題庫並直接發派給他`} onClick={() => setCompose({ stu })}>＋</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <React.Fragment key={g.cat.id}>
                  <tr className="sa-mx-cat"><td colSpan={active.length + 1}>{g.cat.titleZh}</td></tr>
                  {g.items.map(it => (
                    <tr key={it.id}>
                      <td className="sa-mx-unitcol">
                        <span className="sa-mx-title">{it.title}</span>
                        {/* v259: 空項目提示——沒有題目的單元就算發派了，學生頁也不會顯示 */}
                        {window.getQuizItems && window.getQuizItems([it]).length === 0 && (
                          <span className="sa-mx-empty" title="這個單元還沒有題目，學生頁不會顯示。到題庫點鉛筆補題目。">⚠ 沒有題目</span>
                        )}
                        <button className="sa-mx-all" disabled={busy} onClick={() => toggleRow(it.id)} title="這個單元：全班一鍵發派／取消">全班</button>
                      </td>
                      {active.map(stu => {
                        const onIt = setOf(stu).has(it.id);
                        return (
                          <td key={stu.email} className="sa-mx-cell">
                            <button
                              className={`sa-mx-chk${onIt ? ' on' : ''}`}
                              onClick={() => toggleCell(stu, it.id)}
                              aria-label={`${stu.name || stu.email} · ${it.title}${onIt ? '（已發派）' : ''}`}
                            >{onIt ? '✓' : ''}</button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="cwo-hint">格子打勾＝發派給該學生；「全班」＝整列一鍵發派／取消；點學生名字＝該生本週全選／清空；欄頭「＋」＝直接出題給他。</p>

      {compose && !compose.catId && (
        <div className="report-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCompose(null); }}>
          <div className="report-modal sa-compose">
            <div className="report-modal-head">
              <h3 className="report-modal-title">＋ 出題給 {shortName(compose.stu)}</h3>
              <button className="icon-btn" onClick={() => setCompose(null)}><window.Icon name="close" size={16}/></button>
            </div>
            <p className="sa-compose-hint">
              選擇分類後開啟出題編輯器——儲存後會存進題庫，並<b>自動發派給 {shortName(compose.stu)}</b>（之後也能在矩陣勾給其他學生）。
            </p>
            <div className="sa-compose-cats">
              {cats.map(c => (
                <button key={c.id} onClick={() => startCompose(c.id)}>{c.titleZh}</button>
              ))}
            </div>
          </div>
        </div>
      )}
      {compose && compose.catId && compose.draft && window.EditorModal && (
        <window.EditorModal
          open={true}
          draft={compose.draft}
          weekId={(lib.order || []).find(id => String(id).endsWith(sfx)) || ''}
          catItems={(libWeekOf(sfx) && libWeekOf(sfx).items && libWeekOf(sfx).items[compose.catId]) || []}
          onClose={() => setCompose(null)}
          onSave={saveCompose}
          onDelete={() => setCompose(null)}
        />
      )}
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
          placeholder="學生 Google email（學校帳號會自動帶年級）"
          value={email}
          onChange={e => {
            const v = e.target.value;
            setEmail(v);
            const g = window.gradeFromEmail(v);
            if (g) setGrade(g); // leNN 開頭 → 自動選對年級
          }}
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

  // v251: 範圍切換——「教室（目前年級）」／「☀️ 暑假」，後台自己訂閱暑假題庫，不必出去繞一圈
  const appIsSummer = useDashM(
    () => (weekOrder || []).some(wid => window.isSummerTrack && window.isSummerTrack(String(wid).split('-')[0])),
    [weekOrder]
  );
  const [scope, setScope] = useDash('app'); // 'app' | 'summer'
  const [sumLib, setSumLib] = useDash({ weeks: null, order: [] });
  useDashE(() => {
    if (!window.summerApi) return;
    return window.summerApi(window.SUMMER_LIB || 'sl')
      .subscribe((w, o) => setSumLib({ weeks: w, order: o }), () => {});
  }, []);
  const useSummerScope = scope === 'summer' && !appIsSummer;
  const dWeeks = useSummerScope ? (sumLib.weeks || {}) : weeks;
  const dOrder = useSummerScope ? (sumLib.order || []) : (weekOrder || []);

  // v251: 選中的週統一管理——進學生詳情按 Back 不再重置；預設＝今天所在的週
  const [selWeekId, setSelWeekId] = useDash(null);
  useDashE(() => {
    if (!dOrder.length) return;
    if (selWeekId && dOrder.indexOf(selWeekId) !== -1) return;
    setSelWeekId(dashCurrentWeekId(dWeeks, dOrder));
  }, [dOrder, scope]);

  // v238: 暑假發派名單——暑假模式下，每個學生的總數只算「發派給他」的單元
  const [summerMeta, setSummerMeta] = useDash({ students: {} });
  useDashE(() => (window.subscribeSummerMeta ? window.subscribeSummerMeta(setSummerMeta, () => {}) : undefined), []);
  const isSummerData = useSummerScope || appIsSummer;
  const weeksForStudent = (s) => {
    if (!isSummerData || !window.filterWeeksForPlan) return dWeeks;
    const plan = (summerMeta.students || {})[String((s && s.email) || '').toLowerCase()] || null;
    return window.filterWeeksForPlan(dWeeks, dOrder, plan);
  };
  const allItemsFor = (s) => {
    const w = weeksForStudent(s);
    return dOrder.flatMap(wid => {
      const wk = w[wid];
      if (!wk) return [];
      return window.CATEGORIES.flatMap(c =>
        (wk.items[c.id] || []).map(it => ({
          id: it.id,
          progressId: `${wid}_${it.id}`,
          title: it.title || it.id,
          weekLabel: wk.label,
          cat: c.title,
          dueDate: ((wk.homework || {})[it.id] || {}).dueDate || null, // v257: 遲交判定用
        }))
      );
    });
  };
  useDashE(() => {
    if (!selected) return;
    const fresh = students.find(s => s.uid === selected.uid);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [students, selected?.uid]);

  // Flatten all items across every week (for "X / total" calculation)
  const allItems = useDashM(() => {
    return dOrder.flatMap(wid => {
      const w = dWeeks[wid];
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
  }, [dWeeks, dOrder]);

  const total = allItems.length;

  // v239: 常錯題只統計「目前範圍」的項目（暑假模式=暑假題庫），不再混到學期舊紀錄
  const currentIds = useDashM(() => new Set(allItems.map(it => it.id)), [allItems]);
  const questionStats = useDashM(() => {
    const map = {};
    students.forEach(s => {
      Object.entries(s.items || {}).forEach(([itemId, prog]) => {
        const bare = itemId.includes('_') ? itemId.slice(itemId.lastIndexOf('_') + 1) : itemId;
        if (!currentIds.has(bare) && !currentIds.has(itemId)) return;
        (prog?.wrongQuestions || []).forEach(w => {
          const key = `${itemId}::${w.q}::${w.answer}`;
          if (!map[key]) map[key] = { itemId, q: w.q, answer: w.answer, count: 0 };
          map[key].count += 1;
        });
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [students, currentIds]);

  const stats = (s) => {
    const its = s.items || {};
    const list = allItemsFor(s); // v238: 暑假模式只算發派給這位學生的

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
    const done = list.filter(isDone).length;

    // Score: only count items that also have 'done' (avoids ghost scores from deleted items)
    // and cap at 100 to prevent impossible percentages from data corruption
    // v239: 平均分只算目前範圍內（且派給他）的項目——學期舊成績不會混進暑假報告
    const progFor = (it) => its[it.progressId] || its[it.id] ||
      its[Object.keys(its).find(k => k.endsWith('_' + it.id)) || ''] || null;
    const scores = list.map(progFor).filter(pr => pr && pr.done && pr.score != null).map(pr => Math.min(100, pr.score || 0));
    const avg = scores.length ? Math.round(scores.reduce((acc, v) => acc + v, 0) / scores.length) : null;
    const last = s.updatedAt
      ? new Date(s.updatedAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
      : '—';
    return { done, avg, last, total: list.length };
  };

  // v236: 專業後台外殼——側欄導覽 + 頂列，內容元件不變
  // v257: 「學習報告」分頁與總覽重複（同樣是學生×完成度×平均分）——合併：
  // 總覽＝紅黃綠燈＋全班常錯題；個人成績細節在學生詳情、家長版在週報。
  const NAV = [
    { id: 'overview', ico: '🚦', label: '總覽', sub: '完成度與常錯題' },
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
                {selected ? '個人完成度、分數與錯題' : cur.sub}
              </span>
            </div>
            {window.summerApi && !appIsSummer && (
              <div className="tdash-scope" role="tablist" aria-label="資料範圍">
                <button role="tab" aria-selected={scope === 'app'} className={scope === 'app' ? 'on' : ''} onClick={() => setScope('app')}>教室</button>
                <button role="tab" aria-selected={scope === 'summer'} className={scope === 'summer' ? 'on' : ''} onClick={() => setScope('summer')}>☀️ 暑假</button>
              </div>
            )}
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
              allItems={allItemsFor(selected)}
              weeks={weeksForStudent(selected)}
              weekOrder={dOrder}
              selWeekId={selWeekId}
              onBack={() => setSelected(null)}
            />
          ) : (
            /* ── 總覽（v257: 併入原「學習報告」的全班常錯題）── */
            <>
              <ClassWeekOverview
                students={students}
                weeks={dWeeks}
                weekOrder={dOrder}
                weeksFor={weeksForStudent}
                onSelect={setSelected}
                selWeekId={selWeekId}
                setSelWeekId={setSelWeekId}
              />
              <div className="dash-hot">
                <div className="dash-section-title">全班常錯題 · Most Missed</div>
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
            </>
          )}
          </div>
        </main>

        {allReportOpen && (
          <AllClassReportModal
            students={students}
            weeks={dWeeks}
            weekOrder={dOrder}
            weeksFor={weeksForStudent}
            initialWeekId={selWeekId}
            onClose={() => setAllReportOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

/* ── Per-student detail view ───────────────────────────── */
function StudentDetail({ student, allItems, weeks, weekOrder, selWeekId, onBack }) {
  const [reportOpen, setReportOpen] = useDash(false);
  const [wrongOpen, setWrongOpen] = useDash(null); // v251: 展開中的錯題單元 id

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
          initialWeekId={selWeekId}
          onClose={() => setReportOpen(false)}
        />
      )}

      {Object.entries(byWeek).map(([weekLabel, items]) => (
        <div key={weekLabel} className="sdetail-week">
          <p className="sdetail-wlabel">{weekLabel}</p>
          <div className="sdetail-items">
            {items.map(it => {
              // Fuzzy match: try progressId, bare id, or any key ending in _itemId
              // v257: 把「所有」對得上的 key 都找出來——刪除單筆成績時要整組刪乾淨
              const progKeys = [...new Set([
                its[it.progressId] ? it.progressId : null,
                its[it.id] ? it.id : null,
                ...Object.keys(its).filter(k => k.endsWith('_' + it.id)),
              ].filter(Boolean))];
              const prog = progKeys.length ? its[progKeys[0]] : null;
              const isDone = !!prog?.done;
              const score  = prog?.score != null ? Math.min(100, prog.score) : null;
              const wrongs = prog?.wrongQuestions || [];
              const wOpen  = wrongOpen === it.id;
              // v257: 遲交——截止日 23:59 之後才完成
              const dueEnd = it.dueDate ? new Date(it.dueDate + 'T23:59:59').getTime() : null;
              const isLate = !!(isDone && dueEnd && typeof prog.done === 'number' && prog.done > dueEnd);
              const doneDay = isDone && typeof prog.done === 'number'
                ? new Date(prog.done).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
                : null;
              return (
                <React.Fragment key={it.id}>
                  <div className={`sdetail-item${isDone ? ' done' : ''}`}>
                    <span className={`sdetail-check${isDone ? ' done' : ''}`}>
                      {isDone ? '✓' : '○'}
                    </span>
                    {/* v257: chip／錯題鈕都收在名稱欄裡——row 是固定欄位的 grid，多一格就會爆行 */}
                    <span className="sdetail-iname">
                      {it.title}
                      {isLate && (
                        <span className="sdetail-late" title={`截止 ${it.dueDate}，${doneDay} 才完成`}>
                          ⏰ 補交 · {doneDay}
                        </span>
                      )}
                      {wrongs.length > 0 && (
                        <button
                          className={`sdetail-wrongbtn${wOpen ? ' on' : ''}`}
                          onClick={() => setWrongOpen(wOpen ? null : it.id)}
                          title="看這個單元錯了哪些題"
                        >✗ 錯 {wrongs.length} 題 {wOpen ? '⌃' : '⌄'}</button>
                      )}
                    </span>
                    <span className="sdetail-cat">{it.cat}</span>
                    <span className="sdetail-score">
                      {score != null ? score + '%' : ''}
                    </span>
                    {prog ? (
                      <button
                        className="sdetail-del"
                        title="刪除這筆成績（清除誤登入／共用電腦造成的錯誤紀錄）"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!window.confirm(`確定刪除 ${friendlyName(student)} 的「${it.title}」這筆成績？\n\n刪除後無法復原（用來清掉共用電腦誤登入造成的錯誤紀錄）。`)) return;
                          progKeys.forEach(k => window.saveProgressItem(student.uid, '', '', k, null));
                        }}
                      >✕</button>
                    ) : <span/>}
                  </div>
                  {wOpen && (
                    <div className="sdetail-wrongs">
                      {wrongs.map((w, wi) => (
                        <div className="sdetail-wrong-row" key={wi}>
                          <span className="sdetail-wrong-q">{w.q}</span>
                          <span className="sdetail-wrong-a">正解：{w.answer}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

Object.assign(window, { TeacherDashboard });
