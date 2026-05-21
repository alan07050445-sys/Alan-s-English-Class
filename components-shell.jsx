// components.jsx — Building blocks for Alan's English Class

const { useState, useEffect, useRef, useMemo } = React;

/* ───────── Icons ───────── */
function Icon({ name, size = 16 }) {
  const s = size;
  const stroke = { stroke: "currentColor", strokeWidth: 1.5, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "arrow-right":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case "arrow-left":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M19 12H5M11 5l-7 7 7 7" /></svg>;
    case "chevron-down":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M6 9l6 6 6-6" /></svg>;
    case "check":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M5 12l4 4 10-10" /></svg>;
    case "plus":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M12 5v14M5 12h14" /></svg>;
    case "edit":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M16 3l5 5L8 21H3v-5L16 3z" /></svg>;
    case "trash":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" /></svg>;
    case "external":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M14 4h6v6M20 4L10 14M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" /></svg>;
    case "close":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "lock":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><rect x="4" y="11" width="16" height="10" rx="1" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
    case "play":return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z" /></svg>;
    case "download":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>;
    default:return null;
  }
}

/* ───────── Header ───────── */
function Header({ week, weekOrder, weekIdx, onPrevWeek, onNextWeek, canEdit, editMode, onToggleEdit, onAddWeek, onDeleteWeek, onExport, progress }) {
  const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
  const atStart = weekIdx <= 0;
  const atEnd = weekIdx >= (weekOrder?.length || 1) - 1;
  return (
    <header className="header">
      <div className="shell">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mono">EST · 2026</span>
            <span className="brand-name">Alan<em>'s</em> English Class</span>
          </div>
          <div className="week-nav">
            <button onClick={onPrevWeek} aria-label="Previous week" disabled={atStart}><Icon name="arrow-left" size={14} /></button>
            <span className="label">{week.label}</span>
            <button onClick={onNextWeek} aria-label="Next week" disabled={atEnd}><Icon name="arrow-right" size={14} /></button>
          </div>
          <div className="header-right">
            <div className="progress-pill">
              <span>{progress.done}/{progress.total} done</span>
              <div className="progress-track"><div className="progress-fill" style={{ width: pct + "%" }} /></div>
            </div>
            {canEdit && (
              <button
                className={"icon-btn " + (editMode ? "active" : "")}
                onClick={onToggleEdit}
                title={editMode ? "Exit edit mode" : "Teacher edit mode"}>
                <Icon name={editMode ? "lock" : "edit"} size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      {editMode && canEdit &&
      <div className="edit-banner">
          <div className="shell edit-banner-inner">
            <span>● Teacher Edit Mode</span>
            <div className="edit-banner-tools">
              <button className="banner-btn" onClick={onAddWeek}>
                <Icon name="plus" size={12}/> New Week
              </button>
              <button className="banner-btn danger" onClick={onDeleteWeek}>
                <Icon name="trash" size={12}/> Delete this Week
              </button>
              <button className="banner-btn" onClick={onToggleEdit}>Done editing →</button>
            </div>
          </div>
        </div>
      }
    </header>);

}

/* ───────── Hero ───────── */
function EditableText({ value, placeholder, onChange, className, multiline, editMode }) {
  // View mode  -> plain <span>
  // Edit mode  -> a real React-controlled <input> / <textarea> (no contentEditable).
  //               Standard form-field UX, no browser quirks, no duplication.
  const [draft, setDraft] = React.useState(value || "");
  React.useEffect(() => { setDraft(value || ""); }, [value, editMode]);

  const taRef = React.useRef(null);
  React.useEffect(() => {
    if (!multiline || !taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = taRef.current.scrollHeight + "px";
  }, [draft, editMode, multiline]);

  if (!editMode) {
    return <span className={className}>{value}</span>;
  }

  const commit = () => {
    const next = (draft || "").trim();
    if (next !== (value || "")) onChange(next);
  };

  const shared = {
    className: (className || "") + " editable-input",
    value: draft,
    placeholder,
    spellCheck: false,
    onChange: (e) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e) => {
      if (!multiline && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
      if (e.key === "Escape") { setDraft(value || ""); e.currentTarget.blur(); }
    },
  };

  return multiline
    ? <textarea ref={taRef} rows={1} {...shared}/>
    : <input type="text" {...shared}/>;
}

function Hero({ week, totalItems, totalDone, editMode, onUpdateWeek }) {
  const pct = totalItems > 0 ? Math.round(totalDone / totalItems * 100) : 0;
  return (
    <section className="hero">
      <div className="shell">
        <div className="hero-eyebrow">
          <span className="dot" />
          <span className="mono">This Week · 本週進度</span>
          <EditableText
            value={week.dateRange || ""}
            placeholder="May 17 – May 23"
            editMode={editMode}
            className="mono"
            onChange={(v) => onUpdateWeek({ dateRange: v })} />
        </div>
        <h1 className="hero-title">
          <EditableText
            value={week.theme || ""}
            placeholder="Week theme…"
            editMode={editMode}
            onChange={(v) => onUpdateWeek({ theme: v })} />
          
          {!editMode && <em></em>}
        </h1>
        <p className="hero-sub">
          <EditableText
            value={week.subtitle || ""}
            placeholder="English subtitle…"
            editMode={editMode}
            multiline
            onChange={(v) => onUpdateWeek({ subtitle: v })} />
          
          <span className="zh">
            <EditableText
              value={week.subtitleZh || ""}
              placeholder="中文副標…"
              editMode={editMode}
              multiline
              onChange={(v) => onUpdateWeek({ subtitleZh: v })} />
            
          </span>
        </p>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">Week</span>
            <span className="stat-value serif">{(week.label || "—").replace("Week ", "")}<span className="unit">/ 2026</span></span>
          </div>
          <div className="stat">
            <span className="stat-label">Items</span>
            <span className="stat-value serif">{totalItems}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Completed</span>
            <span className="stat-value serif">{totalDone}<span className="unit">/ {totalItems}</span></span>
          </div>
          <div className="stat">
            <span className="stat-label">Progress</span>
            <span className="stat-value serif">{pct}<span className="unit">%</span></span>
          </div>
        </div>
      </div>
    </section>);

}

Object.assign(window, { Icon, Header, Hero });