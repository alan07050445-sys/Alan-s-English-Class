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
    case "users":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
    default:return null;
  }
}

/* ───────── Header ───────── */
function Header({
  week, weekOrder, weekIdx, onPrevWeek, onNextWeek,
  canEdit, editMode, onToggleEdit, onAddWeek, onDeleteWeek, onEditWeek,
  progress,
  // Auth props
  user, onLogin, onLogout, onShowDashboard,
  // Gamification
  streak, badges, onShowBadges,
}) {
  const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
  const atStart = weekIdx <= 0;
  const atEnd = weekIdx >= (weekOrder?.length || 1) - 1;

  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || '';

  return (
    <header className="header">
      <div className="shell">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mono">EST · 2026</span>
            <span className="brand-name">Alan<em>'s</em> English Class</span>
          </div>
          <div className="week-nav">
            <button onClick={onPrevWeek} aria-label="Previous week" disabled={atStart}><Icon name="arrow-left" size={14}/></button>
            <span className="label" style={{display:'flex',alignItems:'center',gap:6}}>
              {week.label}
              {editMode && canEdit && (
                <button
                  onClick={onEditWeek}
                  title="Edit week ID / label / dates"
                  style={{background:'none',border:'1px solid var(--border)',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontSize:10,color:'var(--ink-3)',lineHeight:1.4}}
                >✎</button>
              )}
            </span>
            <button onClick={onNextWeek} aria-label="Next week" disabled={atEnd}><Icon name="arrow-right" size={14}/></button>
          </div>
          <div className="header-right">
            <div className="progress-pill">
              <span>{progress.done}/{progress.total} done</span>
              <div className="progress-track"><div className="progress-fill" style={{ width: pct + "%" }}/></div>
            </div>

            {/* Streak + Badges */}
            {user && (
              <div className="header-gamification">
                {streak?.count > 0 && (
                  <div className="streak-pill" title={`${streak.count} 天連續學習！`}>
                    🔥 {streak.count}
                  </div>
                )}
                {badges && Object.keys(badges).length > 0 && (
                  <button className="badges-pill" onClick={onShowBadges} title="我的成就">
                    ⭐ {Object.keys(badges).length}
                  </button>
                )}
              </div>
            )}

            {/* Auth area */}
            <div className="header-auth">
              {canEdit && (
                <button
                  className={"icon-btn " + (editMode ? "active" : "")}
                  onClick={onToggleEdit}
                  title={editMode ? "Exit edit mode" : "Teacher edit mode"}>
                  <Icon name={editMode ? "lock" : "edit"} size={14}/>
                </button>
              )}
              {canEdit && (
                <button className="dashboard-btn" onClick={onShowDashboard} title="Class Report">
                  <Icon name="users" size={13}/> Report
                </button>
              )}
              {user ? (
                <div className="user-chip" onClick={onLogout} title={`Sign out — ${user.email}`}>
                  {user.photoURL
                    ? <img src={user.photoURL} className="user-avatar" referrerPolicy="no-referrer" alt=""/>
                    : <span className="user-initials">{(user.displayName || user.email || '?')[0].toUpperCase()}</span>
                  }
                  <span className="user-name">{firstName}</span>
                </div>
              ) : (
                <button className="signin-btn" onClick={onLogin}>Sign in</button>
              )}
            </div>
          </div>
        </div>
      </div>
      {editMode && canEdit &&
        <div className="edit-banner">
          <div className="shell edit-banner-inner">
            <span>● Teacher Edit Mode</span>
            <div className="edit-banner-tools">
              <button className="banner-btn" onClick={onAddWeek}><Icon name="plus" size={12}/> New Week</button>
              <button className="banner-btn danger" onClick={onDeleteWeek}><Icon name="trash" size={12}/> Delete this Week</button>
              <button className="banner-btn" onClick={onToggleEdit}>Done editing →</button>
            </div>
          </div>
        </div>
      }
    </header>
  );
}

/* ───────── Login Screen ───────── */
function LoginScreen({ onLogin, onSkip }) {
  const [loading, setLoading] = React.useState(false);
  const handleLogin = async () => {
    setLoading(true);
    try { await onLogin(); } catch(e) { console.error(e); setLoading(false); }
  };
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          A<span className="login-logo-dot"/>
        </div>
        <h1 className="login-title">Alan's English Class</h1>
        <p className="login-sub">
          登入後自動記錄學習進度<br/>
          <span style={{fontSize:'11px'}}>Sign in to track your progress across devices</span>
        </p>
        <button className="google-btn" onClick={handleLogin} disabled={loading}>
          <svg className="google-icon" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
        <div className="login-skip">
          <button onClick={onSkip}>Continue as guest (no progress tracking)</button>
        </div>
      </div>
    </div>
  );
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

/* ───────── Badges Modal ───────── */
function BadgesModal({ badges, onClose }) {
  const BADGES = window.BADGES || {};
  const ALL_IDS = Object.keys(BADGES);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:440}}>
        <div className="modal-head">
          <h3>我的<em>成就</em></h3>
          <button className="modal-close" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>
        <div className="modal-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {ALL_IDS.map(id => {
            const b = BADGES[id];
            const unlocked = !!badges?.[id];
            return (
              <div key={id} className={`badge-card${unlocked ? ' unlocked' : ' locked'}`}>
                <span className="badge-emoji">{unlocked ? b.emoji : '🔒'}</span>
                <span className="badge-name">{b.name}</span>
                <span className="badge-desc">{b.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────── Badge Unlock Toast ───────── */
function BadgeToast({ badge, onDone }) {
  React.useEffect(() => {
    window.playSound && window.playSound('badge');
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="badge-toast" onClick={onDone}>
      <span className="badge-toast-emoji">{badge.emoji}</span>
      <div>
        <div className="badge-toast-title">成就解鎖！</div>
        <div className="badge-toast-name">{badge.name} — {badge.desc}</div>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Header, Hero, LoginScreen, EditableText, BadgesModal, BadgeToast });