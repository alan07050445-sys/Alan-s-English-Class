// components.jsx — Building blocks for Alan's English Class

const { useState, useEffect, useRef, useMemo } = React;

/* ───────── Icons ───────── */
function Icon({ name, size = 16 }) {
  const s = size;
  const stroke = { stroke: "currentColor", strokeWidth: 1.5, fill: "none", strokeLinecap: "round", strokeLinejoin: "round", 'aria-hidden': 'true', focusable: 'false' };
  switch (name) {
    case "arrow-right":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case "arrow-left":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M19 12H5M11 5l-7 7 7 7" /></svg>;
    case "chevron-down":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M6 9l6 6 6-6" /></svg>;
    case "check":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M5 12l4 4 10-10" /></svg>;
    case "plus":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M12 5v14M5 12h14" /></svg>;
    case "edit":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M16 3l5 5L8 21H3v-5L16 3z" /></svg>;
    case "trash":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" /></svg>;
    case "copy":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
    case "external":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M14 4h6v6M20 4L10 14M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" /></svg>;
    case "close":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "lock":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><rect x="4" y="11" width="16" height="10" rx="1" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
    case "play":return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7L8 5z" /></svg>;
    case "download":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>;
    case "users":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
    case "list":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>;
    default:return null;
  }
}

/* ───────── Header ───────── */
/* v388（Alan：「我想要在用我的網頁的時候可以設定調整成全螢幕，不然上面的網址很礙眼」）
   ⚠ 平台差異很大，所以做成「能全螢幕就全螢幕，不能就教他加到主畫面」：
     · Chrome / Edge / Safari(Mac) / iPadOS Safari 16.4+ → Fullscreen API 可用
     · iPhone Safari 完全不支援元素全螢幕 → 只能靠 PWA（manifest 已經是 standalone）
   已經在主畫面 App 模式下開啟時，本來就沒有網址列 → 這顆鈕直接不顯示。 */
function FullscreenBtn() {
  const [on, setOn] = React.useState(false);
  const [tip, setTip] = React.useState('');
  const el = () => document.documentElement;
  // 有方法還不夠——iframe 內嵌或被政策擋住時 fullscreenEnabled 會是 false
  const can = !!(el().requestFullscreen || el().webkitRequestFullscreen)
    && (document.fullscreenEnabled !== false) && (document.webkitFullscreenEnabled !== false);
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true;

  React.useEffect(() => {
    const sync = () => setOn(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  if (standalone) return null;   // 已經是 App 模式，沒有網址列可以擋

  const toggle = async () => {
    if (!can) {
      setTip('這台裝置的瀏覽器不支援全螢幕。請用分享選單的「加入主畫面」，開起來就沒有網址列了。');
      setTimeout(() => setTip(''), 6000);
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
      } else {
        await (el().requestFullscreen ? el().requestFullscreen() : el().webkitRequestFullscreen());
        /* ⚠ 有些環境（內嵌瀏覽器、部分平板）requestFullscreen 會「乖乖 resolve 但什麼都沒發生」——
           不補這一段的話，學生按了沒反應也不知道為什麼。實測過就是這種情況。 */
        setTimeout(() => {
          if (!(document.fullscreenElement || document.webkitFullscreenElement)) {
            setTip('這台裝置擋住了全螢幕。請用分享選單的「加入主畫面」，開起來就沒有網址列了。');
            setTimeout(() => setTip(''), 6000);
          }
        }, 400);
      }
    } catch (e) {
      setTip('全螢幕被瀏覽器擋住了。可以改用「加入主畫面」。');
      setTimeout(() => setTip(''), 6000);
    }
  };

  return (
    <>
      <button className={'fs-btn' + (on ? ' on' : '')} onClick={toggle}
        title={on ? '離開全螢幕' : '全螢幕（把上面的網址列收起來）'} aria-label="全螢幕">
        {on ? '⛶' : '⛶'}
      </button>
      {tip && <div className="fs-tip">{tip}</div>}
    </>
  );
}

/* v389（Alan：「上方列的 Alan English Class 暑假那一列也要可以縮起來，
   但我覺得可以用一個全螢幕的 button，只有在做練習的時候可以縮起來」）
   ── 專心模式 ──
   只在「正在做某一個練習」時才掛出來（由 QuizModeCategoryView 決定），
   按下去把整條 header 收起來，把那 72px 讓給題目與圖片。
   順便試一次全螢幕（成功更好，失敗也無所謂——收起上方列本身就有效果）。
   ⚠ 收起／展開不會改變視窗大小，useFitHeight 不會自己重算 →
      一定要補一個 resize 事件，卡片才會用新的可用高度重新量。 */
function FocusBtn() {
  const [on, setOn] = React.useState(false);

  // 離開練習（元件卸載）一定要還原，不然回到清單頁會沒有 header
  React.useEffect(() => () => {
    document.documentElement.classList.remove('focus-on');
    window.dispatchEvent(new Event('resize'));
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    document.documentElement.classList.toggle('focus-on', next);
    try {
      const el = document.documentElement;
      if (next && !document.fullscreenElement && el.requestFullscreen && document.fullscreenEnabled) {
        el.requestFullscreen().catch(() => {});
      } else if (!next && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) { /* 全螢幕失敗不影響收起上方列 */ }
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  };

  return (
    <button className={'focus-btn' + (on ? ' on' : '')} onClick={toggle} aria-pressed={on}
      title={on ? '顯示上方列' : '收起上方列，專心練習'} aria-label="專心模式">
      {on ? '\u2921' : '\u26F6'}
    </button>
  );
}

function Header({
  week, weekOrder, weekIdx, onPrevWeek, onNextWeek,
  onShowCheckin, checkinDone, checkinStreak,
  canEdit, editMode, onToggleEdit, onAddWeek, onDeleteWeek, onArchiveWeek, weekArchived, onExport, onEditWeek, onTermSetup, onQuickSet, onGrammarGen, onReadingGen,
  progress,
  // Auth props
  user, onLogin, onLogout, onShowDashboard, onHome,
  // Mistakes
  mistakesCount, onShowMistakes,
  // Grade
  grade, onSwitchGrade,
  compactLobby,
  starBalance, onShowStars,   // v342: 集點
}) {
  const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
  const atStart = weekIdx <= 0;
  const atEnd = weekIdx >= (weekOrder?.length || 1) - 1;

  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || '';

  return (
    <header className={'header' + (editMode && canEdit ? ' edit-mode' : '')}>
      <div className="shell">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mono">EST · 2026</span>
            {onHome
              ? <button className="brand-name brand-home" onClick={onHome} title="回首頁" aria-label="回首頁">Alan<em>'s</em> English Class</button>
              : <span className="brand-name">Alan<em>'s</em> English Class</span>}
            {grade && (
              <button className="grade-chip" onClick={onSwitchGrade} title="Switch grade" aria-label="切換年級">
                {window.isSummerTrack && window.isSummerTrack(grade) ? '☀️ 暑假' : grade.toUpperCase()}
              </button>
            )}
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
            {!compactLobby && (
              <div className="progress-pill">
                <span>{progress.done}/{progress.total} done</span>
                <div className="progress-track"><div className="progress-fill" style={{ width: pct + "%" }}/></div>
              </div>
            )}

            {/* v319: Alan 選「先移除錯題複習功能」——拿掉 header 的 📕 錯題入口（大廳複習區也一起移除）。
                錯題仍照常記錄、MistakesPanel 元件保留＝要加回改這裡就好。 */}

            {/* Auth area */}
            <div className="header-auth">
              {/* v388: 全螢幕——放最前面，學生老師都用得到 */}
              <FullscreenBtn/>
              {/* v394: 錯題本入口——v319 把 📕 拿掉之後，app.jsx 仍然一直傳 onShowMistakes，
                  但 Header 沒有任何地方會呼叫它 ＝ mistakesOpen 永遠是 false ＝
                  學生答錯的題目一直在收集、卻永遠打不開來複習。把入口加回來。
                  有錯題才顯示，沒有錯題不佔位置。 */}
              {user && onShowMistakes && mistakesCount > 0 && (
                <button className="mistakes-btn" onClick={onShowMistakes}
                  title={`錯題本 · ${mistakesCount} 題等你複習`} aria-label="錯題本">
                  <span aria-hidden="true">📕</span>
                  <span className="mistakes-btn-num">{mistakesCount}</span>
                </button>
              )}
              {/* v342: 集點——學生看得到自己的星星，點開是紀錄＋商店 */}
              {user && onShowStars && (
                <button className="stars-btn" onClick={onShowStars} title="我的星星與商店"
                  aria-label={`我的星星與商店，目前 ${(starBalance || 0).toLocaleString()} 顆`}>
                  <span className="stars-btn-ico" aria-hidden="true">⭐</span>
                  <span className="stars-btn-num">{(starBalance || 0).toLocaleString()}</span>
                </button>
              )}
              {/* v362: 每日簽到——沒簽到會有紅點提醒 */}
              {user && onShowCheckin && (
                <button className={'checkin-btn' + (checkinDone ? ' done' : '')} onClick={onShowCheckin}
                  title={checkinDone ? '今天已簽到' : '今天還沒簽到！'}
                  aria-label={checkinDone ? `今天已簽到，連續 ${checkinStreak} 天` : '今天還沒簽到'}>
                  <span aria-hidden="true">📅</span>
                  {checkinStreak > 0 && <span className="checkin-btn-num">{checkinStreak}</span>}
                  {!checkinDone && <span className="checkin-btn-dot" aria-hidden="true"/>}
                </button>
              )}
              {canEdit && (
                <button
                  className={"icon-btn " + (editMode ? "active" : "")}
                  onClick={onToggleEdit}
                  title={editMode ? "Exit edit mode" : "Teacher edit mode"}
                  aria-pressed={!!editMode}
                  aria-label={editMode ? "離開老師編輯模式" : "進入老師編輯模式"}>
                  <Icon name={editMode ? "lock" : "edit"} size={14}/>
                </button>
              )}
              {canEdit && (
                <button className="dashboard-btn" onClick={onShowDashboard} title="Class Report" aria-label="班級學習報表">
                  <Icon name="users" size={13}/> <span className="db-label">Report</span>
                </button>
              )}
              {user ? (
                <button type="button" className="user-chip" onClick={onLogout} aria-label={`登出 ${user.email}`}>
                  {user.photoURL
                    ? <img src={user.photoURL} className="user-avatar" referrerPolicy="no-referrer" alt=""/>
                    : <span className="user-initials">{(user.displayName || user.email || '?')[0].toUpperCase()}</span>
                  }
                  <span className="user-name">{firstName}</span>
                </button>
              ) : (
                <button className="signin-btn" onClick={onLogin}>登入</button>
              )}
            </div>
          </div>
        </div>
      </div>
      {editMode && canEdit &&
        <div className="edit-banner">
          <div className="shell edit-banner-inner">
            <span>● Teacher Edit Mode</span>
            {/* v398：封存中的週次，老師端一定要一眼看得出來——不然會以為學生也看得到 */}
            {weekArchived && <span className="edit-banner-archived">📦 這一週已封存 · 學生看不到</span>}
            <div className="edit-banner-tools">
              {onGrammarGen && (
                <button className="banner-btn gr" onClick={onGrammarGen}>✨ 出時態題目</button>
              )}
              {onReadingGen && (
                <button className="banner-btn rc" onClick={onReadingGen}>📖 出閱讀理解</button>
              )}
              {onQuickSet && (
                <button className="banner-btn quick" onClick={onQuickSet}>⚡ 貼單字 · 一次建立整套</button>
              )}
              {onTermSetup && (
                <button className="banner-btn term" onClick={onTermSetup}>📅 建立一整個學期</button>
              )}
              <button className="banner-btn" onClick={onAddWeek}><Icon name="plus" size={12}/> New Week</button>
              {/* v398：把 ExportModal 接回來——期末整理的第一步是「先備份」，
                  在這之前 UI 完全沒有備份的入口。 */}
              {onExport && (
                <button className="banner-btn" onClick={onExport}>💾 匯出備份</button>
              )}
              {/* v398：期末整理用的「封存」——內容一個字都不刪，只是學生端看不到。
                  刻意排在 Delete 前面：要藏舊學期時，正確答案永遠是這一顆。 */}
              {onArchiveWeek && (
                <button className="banner-btn arch" onClick={onArchiveWeek}>
                  {weekArchived ? '↩ 取消封存' : '📦 封存這一週'}
                </button>
              )}
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
// v392: 舊版 8 段行銷長頁 LoginScreenLegacy 已整段刪除（連同它專用、刪後再無呼叫點的
//       TeacherOverlay／PrivacyOverlay）。原因：v296 起就改用下方 window.LoginScreen
//       （單頁卡片扇形封面），legacy 從此沒有任何呼叫點，卻仍佔整支檔案 56%（約 62KB）——
//       在這個沒有 build step、靠瀏覽器端 Babel 即時轉譯的專案裡，等於每次載入都白白
//       多轉譯 62KB，而且它內部還帶著每幀改寫捲動容器 backgroundColor 的捲動處理器、
//       滑鼠光暈 rAF 與 HUD。要找回舊版：git show legacy-landing-v391:components-shell.jsx
//       （styles-auth.css 的 .ll-* / .login-landing / .lldm-* 規則這次刻意保留，CSS 另外處理，
//         這樣萬一要回退只需要回退 JSX。）
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

/* ───────── Grade Selector ───────── */
function GradeSelector({ onSelect, summer, homeGrade, who, onChangeGrade, onViewLanding, onOpenGuide, onLogout, summerOnly, onOpenAdmin }) {
  const grades = [
    { id: 'g2', n: 'G2', zh: '二年級' },
    { id: 'g3', n: 'G3', zh: '三年級' },
    { id: 'g4', n: 'G4', zh: '四年級' },
    { id: 'g5', n: 'G5', zh: '五年級' },
    { id: 'g6', n: 'G6', zh: '六年級' },
  ];
  const home = grades.find(g => g.id === homeGrade) || null;
  const [showAll, setShowAll] = React.useState(!home); // 有專屬年級 → 門口模式；否則完整選單
  const doorMode = home && !showAll;

  // v257: 時段問候＋今天日期＋暑假第幾週
  const hourNow = new Date().getHours();
  const greet = hourNow < 5 ? '晚安' : hourNow < 11 ? '早安' : hourNow < 18 ? '午安' : '晚安';
  const dateLine = new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
  const sfxNow = window.summerCurrentSuffix ? window.summerCurrentSuffix() : null;
  const summerWeekNo = sfxNow ? parseInt(sfxNow.slice(2), 10) : null;

  // v257: 老師卡即時資訊——今天已有幾位學生練習過（只有老師會掛這個訂閱）
  // v268: 加上「⏳ N 份作業待批改」——開門就知道今天要不要改作業
  const [todayActive, setTodayActive] = React.useState(null);
  const [pendingGrade, setPendingGrade] = React.useState(0);
  React.useEffect(() => {
    if (!onOpenAdmin || !window.subscribeAllStudents) return;
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    try {
      return window.subscribeAllStudents(all => {
        setTodayActive(all.filter(s => (s.updatedAt || 0) >= t0.getTime()).length);
        let pg = 0;
        all.forEach(s => Object.values(s.items || {}).forEach(p => {
          if (p && p.files && p.files.length && p.score == null) pg++;
        }));
        setPendingGrade(pg);
      });
    } catch(e) {}
  }, []);

  // v257: 暑假卡進度環——優先顯示本週任務，本週沒派任務就看整個暑假
  const prog = summer && summer.prog;
  const ringScope = prog && prog.wkTotal > 0
    ? { done: prog.wkDone, total: prog.wkTotal, label: '本週任務' }
    : (prog && prog.allTotal > 0 ? { done: prog.allDone, total: prog.allTotal, label: '暑假任務' } : null);
  const ringPct = ringScope ? ringScope.done / ringScope.total : 0;
  const RING_C = 2 * Math.PI * 17;

  // 游標暖光：緩慢漂向滑鼠位置（僅滑鼠裝置、尊重 reduced-motion）
  React.useEffect(() => {
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    const root = document.querySelector('.grade-selector');
    if (!root) return;
    let tx = 50, ty = 40, cx = 50, cy = 40, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      root.style.setProperty('--gsx', cx.toFixed(2) + '%');
      root.style.setProperty('--gsy', cy.toFixed(2) + '%');
      raf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e) => {
      tx = e.clientX / window.innerWidth * 100;
      ty = e.clientY / window.innerHeight * 100;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    root.addEventListener('mousemove', onMove);
    return () => { root.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="grade-selector">
      <div className="gs-decor" aria-hidden="true">
        <span className="gs-blob gs-blob-a"/>
        <span className="gs-blob gs-blob-b"/>
        <svg className="gs-spark gs-spark-1" viewBox="0 0 24 24"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
        <svg className="gs-spark gs-spark-2" viewBox="0 0 24 24"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
        {/* v249: 首頁「學習深海」幽靈字延伸到門口頁（靜態、更淡）——三頁同一片海 */}
        <span className="deep-lite dl-a">Aa</span>
        <span className="deep-lite dl-b">read</span>
        <span className="deep-lite dl-c">✓</span>
      </div>
      <div className="grade-selector-inner">
        <img src="icon.svg" alt="Alan's English Class" className="grade-sel-logo-img"/>
        <div className="gs-kicker">Alan’s English Class</div>
        <h1 className="grade-sel-title">{doorMode ? (who ? `${greet}，${who}！` : `${greet}！`) : '現在讀幾年級呢？'}</h1>
        <p className="grade-sel-sub">
          {doorMode
            ? <><span className="gs-date">{dateLine}</span><span className="gs-date-dot">·</span>今天要從哪裡開始呢？</>
            : '選好就直接帶你進入這一週的練習。'}
        </p>
        {onOpenAdmin && (
          <button className="gs-card gs-card-admin" onClick={onOpenAdmin}>
            <span className="gs-card-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/>
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>
              </svg>
            </span>
            <span className="gs-card-text">
              <b>老師後台</b>
              <span>
                {todayActive != null ? `今天已有 ${todayActive} 位學生練習過` : '總覽 · 學生 · 發派 · 報告'}
                {pendingGrade > 0 && <em className="gs-admin-pending"> · ⏳ {pendingGrade} 份作業待批改</em>}
              </span>
            </span>
            <span className="gs-card-cta">進入 →</span>
          </button>
        )}
        {/* v261: 暑假期間題庫是老師的主要工作區——排在後台正下方、用暑假金黃主題 */}
        {summer && summer.lib && (
          <button className="gs-card gs-card-lib" onClick={() => onSelect(window.SUMMER_LIB || 'sl')}>
            <span className="gs-card-ico gs-card-ico-lib" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13H6.5A2.5 2.5 0 004 19.5z"/>
                <path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/>
                <path d="M9 8.5h7M9 12h4.5"/>
              </svg>
            </span>
            <span className="gs-card-text">
              <b>暑假題庫</b>
              <span>老師專用 · 出題後到後台發派給學生</span>
            </span>
            <span className="gs-card-cta">進入 →</span>
          </button>
        )}
        {summer && summer.mine && (
          <button className="gs-card gs-card-summer" onClick={() => onSelect(window.SUMMER_ME || 'sme')}>
            {ringScope ? (
              <span className="gs-card-ico gs-ring" aria-hidden="true">
                <svg viewBox="0 0 44 44">
                  <circle className="gs-ring-track" cx="22" cy="22" r="17"/>
                  <circle
                    className="gs-ring-fill"
                    cx="22" cy="22" r="17"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C * (1 - ringPct)}
                  />
                </svg>
                <em>{ringScope.done}/{ringScope.total}</em>
              </span>
            ) : (
              <span className="gs-card-ico gs-card-ico-sun" aria-hidden="true">☀️</span>
            )}
            <span className="gs-card-text">
              <b>{summer.who || '我'} 的暑假任務</b>
              <span>
                {ringScope
                  ? (ringScope.done >= ringScope.total
                      ? `${ringScope.label}全部完成，太棒了！🎉`
                      : `${ringScope.label}完成 ${ringScope.done}/${ringScope.total}${summerWeekNo ? ` · 暑假第 ${summerWeekNo} 週` : ''}`)
                  : 'Alan 老師為你安排的暑假練習 · 7/1 – 8/31'}
              </span>
            </span>
            <span className="gs-card-cta gs-card-cta-brand">{ringScope && ringScope.done > 0 && ringScope.done < ringScope.total ? '繼續 →' : '進入 →'}</span>
          </button>
        )}
        {/* v381: 五大時態核心題庫——不是每週更換的作業，是一定要練熟的常設題庫。
            放在年級入口上面，因為它跨年級共用。 */}
        {/* ⚠ 題庫還沒放內容之前只給老師看得到（onOpenAdmin 只有老師會拿到）——
            免得學生點進去是空的。內容進去之後把 onOpenAdmin && 拿掉即可對全體開放。 */}
        {!summerOnly && onOpenAdmin && (
          <button className="gs-card gs-card-gr" onClick={() => onSelect(window.GRAMMAR_TRACK || 'gr')}>
            <span className="gs-card-ico gs-card-ico-gr" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18"/><path d="M5 7h14"/><path d="M7 12h10"/><path d="M9 17h6"/>
              </svg>
            </span>
            <span className="gs-card-text">
              <b>五大時態 · 核心題庫</b>
              <span>現在／過去／未來／進行／完成 — 練到熟為止，不隨週次更換</span>
            </span>
            <span className="gs-card-cta">進入 →</span>
          </button>
        )}
        {summerOnly ? null : doorMode ? (
          <>
            <button className="gs-card gs-card-room" onClick={() => onSelect(home.id)}>
              <span className="gs-card-ico gs-card-badge">{home.n}</span>
              <span className="gs-card-text">
                <b>進入 {home.n} 教室</b>
                <span>{home.zh} · {summer && summer.mine ? '開學後再從這裡進教室' : '每週跟著學校進度練'}</span>
              </span>
              <span className="gs-card-cta gs-card-cta-brand">進入 →</span>
            </button>
            <button className="gs-switch" onClick={() => setShowAll(true)}>不是{home.zh}了嗎？改選其他年級</button>
          </>
        ) : (
          <>
            <div className="grade-sel-cards">
              {grades.map((g, i) => (
                <button key={g.id} className="grade-sel-card" style={{ '--i': i }} onClick={() => (home && onChangeGrade) ? onChangeGrade(g.id) : onSelect(g.id)}>
                  <span className="grade-sel-badge">{g.n}</span>
                  <span className="grade-sel-card-label">{g.zh}</span>
                </button>
              ))}
            </div>
            <p className="gs-hint">之後隨時可以從右上角的年級標籤切換</p>
          </>
        )}
        {!summerOnly && (onOpenGuide || (who && onLogout)) && (
          <div className="gs-links">
            {onOpenGuide && (
              <button className="gs-switch gs-landing-link" onClick={onOpenGuide}>新手教學</button>
            )}
            {who && onLogout && (
              <button className="gs-switch gs-landing-link" onClick={onLogout}>不是{who}？換帳號</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Lock Screen（名單外 / 未授權） ───────── */
function LockScreen({ user, onLogin, onLogout }) {
  return (
    <div className="login-screen">
      <div className="login-card lock-card">
        <div className="lock-icon">🔒</div>
        <h1 className="login-title">需要授權才能使用</h1>
        {user ? (
          <>
            <p className="lock-msg">
              這個帳號（<strong>{user.email}</strong>）目前不在學生名單內。
            </p>
            <p className="lock-sub">
              請確認你用的是<strong>報名時提供的 Google 帳號</strong>。<br/>
              如果還沒報名，歡迎聯絡 Alan 老師！
            </p>
            <button className="google-btn lock-btn" onClick={onLogout}>
              換一個帳號登入
            </button>
          </>
        ) : (
          <>
            <p className="lock-msg">課程內容僅開放給已報名的學生。</p>
            <p className="lock-sub">請使用報名時提供的 Google 帳號登入。</p>
            <button className="google-btn lock-btn" onClick={onLogin}>
              使用 Google 登入
            </button>
          </>
        )}
        <p className="lock-contact">📩 聯絡 Alan 老師：alan07050445@gmail.com</p>
      </div>
    </div>
  );
}

/* ════ StarBurst — ⭐ celebration animation (Web Animations API) ════ */
function StarBurst({ count = 20, onDone }) {
  const containerRef = React.useRef(null);
  const cx = typeof window !== 'undefined' ? window.innerWidth  / 2 : 200;
  const cy = typeof window !== 'undefined' ? window.innerHeight * 0.38 : 150;

  // Generate star data once (random, no memo needed — rendered once then removed)
  const EMOJIS = ['⭐','✨','🌟','💫','⭐','🌟'];
  const stars = React.useRef(
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * 360 + (Math.random() - 0.5) * (360 / count);
      const dist  = 90 + Math.random() * 160;
      const rad   = angle * Math.PI / 180;
      return {
        id:    i,
        tx:    Math.round(Math.cos(rad) * dist),
        ty:    Math.round(Math.sin(rad) * dist),
        sz:    Math.round(14 + Math.random() * 14),
        delay: Math.round(Math.random() * 220),
        dur:   Math.round(700 + Math.random() * 500),
        tr:    Math.round((Math.random() - 0.5) * 240),
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      };
    })
  ).current;

  React.useEffect(() => {
    // Use Web Animations API — reliable across all browsers, no CSS var hack needed
    const els = containerRef.current?.querySelectorAll('.star-burst-particle');
    if (els) {
      stars.forEach((s, i) => {
        const el = els[i];
        if (!el) return;
        el.animate(
          [
            { transform: 'translate(-50%,-50%) scale(1.3) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${s.tx}px), calc(-50% + ${s.ty}px)) scale(0) rotate(${s.tr}deg)`, opacity: 0 },
          ],
          { duration: s.dur, delay: s.delay, easing: 'cubic-bezier(.25,.46,.45,.94)', fill: 'forwards' }
        );
      });
    }
    const t = setTimeout(() => onDone && onDone(), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={containerRef} className="star-burst-container">
      {stars.map(s => (
        <div
          key={s.id}
          className="star-burst-particle"
          style={{ left: cx + 'px', top: cy + 'px', fontSize: s.sz + 'px', opacity: 1 }}
        >{s.emoji}</div>
      ))}
    </div>
  );
}

/* ════ MobileNav — fixed bottom bar (mobile only) ════ */
function MobileNav({ week, weekIdx, weekOrder, onPrevWeek, onNextWeek, catView, onBackFromCat, user }) {
  const atStart = weekIdx <= 0;
  const atEnd   = weekIdx >= (weekOrder?.length || 1) - 1;
  const inCat   = !!catView;
  const weekLabel = week?.label || (weekOrder?.[weekIdx] || `Week ${weekIdx + 1}`);

  // When inside a category: show Back | cat name | nothing
  // When on main screen: show ← Week | home dot | Week →
  return (
    <nav className="mobile-nav" aria-label="Navigation">
      {inCat ? (
        <>
          <button className="mobile-nav-btn active" onClick={onBackFromCat}>
            <span className="mobile-nav-icon">←</span>
            <span>返回</span>
          </button>
          <div className="mobile-nav-divider"/>
          <button className="mobile-nav-btn" style={{flex:2, fontSize:'10px', color:'var(--ink)', letterSpacing:'0.02em', textTransform:'none', fontFamily:'var(--sans)', fontWeight:700}} disabled>
            <span className="mobile-nav-icon">{catView?.id === 'vocab' ? '📚' : catView?.id === 'grammar' ? '✏️' : catView?.id === 'word' ? '🔤' : '📖'}</span>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{catView?.titleZh || catView?.title || ''}</span>
          </button>
          <div style={{flex:1}}/>
        </>
      ) : (
        <>
          <button className="mobile-nav-btn" onClick={onPrevWeek} disabled={atStart}>
            <span className="mobile-nav-icon">←</span>
            <span>Prev</span>
          </button>
          <div className="mobile-nav-divider"/>
          <button className="mobile-nav-btn active" disabled>
            <span className="mobile-nav-icon">📅</span>
            <span>{weekLabel}</span>
          </button>
          <div className="mobile-nav-divider"/>
          <button className="mobile-nav-btn" onClick={onNextWeek} disabled={atEnd}>
            <span className="mobile-nav-icon">→</span>
            <span>Next</span>
          </button>
        </>
      )}
    </nav>
  );
}

/* ════ LoadingScreen — brand logo fade-in overlay ════ */
function LoadingScreen({ fading }) {
  return (
    <div className={`ls-screen${fading ? ' ls-fading' : ''}`} aria-label="Loading">
      {/* Subtle decorative radial glow */}
      <div className="ls-glow"/>
      <div className="ls-brand">
        <svg className="ls-spark ls-spark-1" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
        <svg className="ls-spark ls-spark-2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
        <img src="icon.svg" alt="Alan's English Class" className="ls-logo"/>
        <div className="ls-est">EST · 2026</div>
        <div className="ls-name">Alan<em>'s</em> English Class</div>
        <div className="ls-underline" aria-hidden="true"/>
      </div>
    </div>
  );
}

/* ───────── v252: 海綿寶寶泡泡轉場——純 DOM 直接生成（點擊下一幀就出現，不等 React render）───────── */
function spawnPageWave(ttl) {
  try {
    const B = [
      [4, 120, 0, 1.15, 'A'], [12, 54, .12, 1.0, ''], [18, 88, .05, 1.2, 'b'], [24, 140, .18, 1.3, 'C'],
      [30, 46, .02, .95, ''], [36, 96, .22, 1.15, 'd'], [42, 64, .08, 1.05, 'E'], [48, 150, .15, 1.35, ''],
      [54, 80, .03, 1.1, 'f'], [60, 110, .2, 1.25, 'G'], [66, 50, .1, .95, ''], [72, 132, .06, 1.3, 'h'],
      [78, 70, .25, 1.05, 'I'], [84, 100, .02, 1.2, ''], [90, 58, .16, 1.0, 'j'], [95, 86, .09, 1.15, 'K'],
      [8, 72, .3, 1.05, 'L'], [16, 118, .26, 1.3, ''], [26, 60, .33, 1.0, 'm'], [34, 90, .28, 1.2, 'N'],
      [44, 52, .35, .95, ''], [52, 124, .3, 1.35, 'o'], [62, 76, .27, 1.1, 'P'], [70, 98, .34, 1.25, ''],
      [80, 56, .29, 1.0, 'q'], [88, 136, .32, 1.35, 'R'], [94, 66, .26, 1.05, ''], [2, 94, .31, 1.2, 's'],
      [22, 48, .38, .9, ''], [38, 104, .4, 1.25, 'T'], [58, 62, .42, 1.0, 'u'], [76, 116, .38, 1.3, 'V'],
      [10, 44, .45, .9, ''], [46, 84, .44, 1.15, 'w'], [68, 58, .47, 1.0, 'X'], [86, 92, .42, 1.2, 'y'],
    ];
    const root = document.createElement('div');
    root.className = 'pw';
    root.setAttribute('aria-hidden', 'true');
    const veil = document.createElement('div');
    veil.className = 'pw-veil';
    root.appendChild(veil);
    B.forEach(b => {
      const sp = document.createElement('span');
      sp.className = 'pwb';
      sp.style.left = b[0] + '%';
      sp.style.width = b[1] + 'px';
      sp.style.height = b[1] + 'px';
      sp.style.animationDelay = b[2] + 's';
      sp.style.animationDuration = b[3] + 's';
      sp.style.fontSize = Math.round(b[1] * .42) + 'px';
      if (b[4]) sp.textContent = b[4];
      root.appendChild(sp);
    });
    document.body.appendChild(root);
    setTimeout(() => { try { root.remove(); } catch (e) {} }, ttl || 1900);
    return root;
  } catch (e) { return null; }
}

/* ───────── First-time welcome / onboarding ───────── */
function WelcomeGuide({ onClose }) {
  // v240: 首步改用品牌 logo（AI 插畫已移除），後三步沿用功能 icon
  const steps = [
    { img: 'icon.svg',        kick: '歡迎',      title: '歡迎來到 Alan’s English Class',
      body: '這裡的練習對齊康橋國際學校的每週進度——在家練的，就是學校正在教的。每週打開一次，跟著練就對了。' },
    { img: 'feat-week.png',   kick: '每週練習',   title: '每週一個目標，跟著練',
      body: '最上面是本週進度，點「開始練習」就會帶你到下一個該練的項目；也可以自己從單字、文法、字根字首、閱讀寫作挑一個開始。' },
    { img: 'feat-mark.png',   kick: '本週聯絡簿', title: '老師指定的作業，都在聯絡簿',
      body: '打開「本週聯絡簿」就能看到老師指定的作業、截止日與完成狀態；全部做完會亮起綠色的勾勾。' },
    { img: 'feat-record.png', kick: '家長看這裡', title: '每一週的進步，都看得到',
      body: '點「學習成長」可以看到每週完成率與平均分數的變化；答錯的題目會自動收進錯題本，複習最有效率。' },
  ];
  const [step, setStep] = React.useState({ i: 0, dir: 1 });
  const i = step.i;
  const last = i === steps.length - 1;
  const go = (k) => { if (k !== i) setStep({ i: k, dir: k > i ? 1 : -1 }); };

  const finish = () => { onClose(); };
  const next = () => { if (last) finish(); else go(i + 1); };

  // 預載後面幾步的插畫，切換時不閃白
  React.useEffect(() => {
    steps.forEach(s => { const im = new Image(); im.src = s.img; });
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft' && i > 0) go(i - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [i]);

  const s = steps[i];
  return (
    <div className="wg-overlay">
      <div className="wg-sheet" role="dialog" aria-modal="true" aria-label="新手教學">
        <span className="wg-blob" aria-hidden="true"/>
        <button className="wg-skip" onClick={finish}>略過</button>
        <div className="wg-count">新手教學 · {i + 1} / {steps.length}</div>
        <div className={`wg-stage${step.dir < 0 ? ' wg-rev' : ''}`} key={i}>
          <div className="wg-art"><img src={s.img} alt=""/></div>
          <div className="wg-kick">{s.kick}</div>
          <h2 className="wg-title">{s.title}</h2>
          <p className="wg-body">{s.body}</p>
        </div>
        <div className="wg-dots">
          {steps.map((_, k) => (
            <button key={k} className={`wg-dot${k === i ? ' on' : ''}`} onClick={() => go(k)} aria-label={`第 ${k + 1} 步`}/>
          ))}
        </div>
        <div className="wg-actions">
          {i > 0 && <button className="wg-back" onClick={() => go(i - 1)}>上一步</button>}
          <button className="wg-next" onClick={next}>{last ? '開始學習 →' : '下一步 →'}</button>
        </div>
      </div>
    </div>
  );
}

/* ───────── 實境導覽（spotlight tour）─────────
   小朋友版新手教學，四段式：
   ① tour：聚光燈圈大廳「真的」元素，一句大字，點哪都能下一站
   ② handoff 實際演練：聚光燈圈「真的」按鈕、只有它按得下去——
      點開始練習 → 看左側任務清單（info 站）→ 親手按開始測驗，
      真的測驗開始、導覽悄悄退場。（v224: 範例題移除，直接實戰）
   文字版 WelcomeGuide 只當 fallback（大廳空空時）。 */
function SpotlightTour({ onClose, onEmpty }) {
  // v324: Alan 指定的 8 站亮燈導覽（照他的順序）——純聚光燈＋說明，走完就結束（不再接「換你操作」）。
  const DEFS = [
    { sel: '.tt',              fb: '.wh',                 t: '① 老師出的作業在這裡', s: '這週老師派的作業都在這，點一條就開始，做完會打勾 ✓' },
    { sel: '.qm-blocks',       fb: null,                  t: '② 想自己多練？點這些卡片', s: '作業做完還想練，就點進這些卡片——單字、文法、字根字首、閱讀寫作，自己挑一個練' },
    { sel: '.growth-inline',   fb: '.growth-summary-row', t: '③ 你的成長曲線', s: '每一週的平均成績都在這，看得到自己的進步' },
    { sel: '.wh',              fb: null,                  t: '④ 本週完成度', s: '這裡看你完成多少、還有哪些作業沒做完' },
    { sel: '.week-nav',        fb: '.wh-weeknav',         t: '⑤ 換到不同週', s: '用這裡的箭頭往前、往後，看不同週的作業' },
    { sel: '.lobby-back',      fb: null,                  t: '⑥ 回大廳', s: '想回到入口（換教室或暑假專區），就點這裡' },
    { sel: '.user-chip',       fb: '.signin-btn',         t: '⑦ 登出', s: '要登出的話，點你的名字（頭像）就可以' },
    { sel: '.ll-foot2-contact', fb: '.ll-foot2-btn-line', t: '⑧ 聯絡老師', s: '有問題想找 Alan 老師？從這裡加 LINE 或寄 Email' },
  ];
  // 實際演練：click 站＝只有被圈住的真元素點得動；info 站＝看說明按下一步
  const HDEFS = [
    { sel: '.tt-row:not(.tt-done)', fb: '.qm-block:not(.empty)', mode: 'click',
      t: '換你了！點這裡開始', s: '你的第一次練習，就從這裡開始' },
    { sel: '.qm-unit-list', fb: '.qm-sidebar', mode: 'info',
      t: '這一類的任務都在這裡', s: '由上往下一個一個完成。文法、字根字首、閱讀寫作，也是同樣的做法！' },
    { sel: '.qm-intro .qm-btn.primary', fb: null, mode: 'click',
      t: '就是這裡！', s: '點下去，開始今天的練習 💪' },
  ];
  // ⚠️ 元素一律「用的時候現查」（不能在 render 期間抓一次存起來——
  // .page 以 pageKey remount 時，render 期查到的是即將被拆掉的舊 DOM）
  // v324: 挑「看得見」的那個——mobile 的 .week-nav 是 display:none（但 DOM 還在），
  // 直接回它會讓聚光燈卡住等不到尺寸；改成沒尺寸就退回 fb（.wh-weeknav）。
  const pick = (sel) => { const el = sel && document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return (r.width || r.height) ? el : null; };
  const getEl = (d) => pick(d.sel) || pick(d.fb);
  const [stops, setStops] = React.useState([]);
  const [i, setI] = React.useState(0);
  const [phase, setPhase] = React.useState('tour'); // tour → handoff
  const [hi, setHi] = React.useState(0);            // handoff 第幾站
  const holeRef = React.useRef(null);
  const bubbleRef = React.useRef(null);
  const posRef = React.useRef(null);     // 聚光燈目前位置（JS lerp，換站時滑過去）
  const scrolledRef = React.useRef(false); // 這一站是否已找到目標並捲進畫面
  const last = i === stops.length - 1;

  const finish = () => onClose();
  // v324: Alan 版導覽＝純 8 站亮燈，走完直接結束（不再進「換你操作」handoff 階段）。
  const next = () => { if (last) finish(); else setI(i + 1); };
  const nextH = () => { if (hi < HDEFS.length - 1) setHi(hi + 1); else finish(); };

  // mount 後（DOM 已 commit）才決定有哪些站；大廳空空的（極少見）→ 退回文字版
  React.useEffect(() => {
    // v324: 8 站都「現在畫面上真的有」才留下（例如訪客沒有 .user-chip → 退回 .signin-btn；
    // 某元素完全不存在就跳過那站）。全空（極少見）→ 退回文字版。
    const found = DEFS.filter(d => getEl(d));
    if (!found.length) { if (onEmpty) onEmpty(); return; }
    setStops(found);
  }, []);

  // 每一幀跟著目標走（捲動、縮放、remount、換站都黏得住）。
  // handoff 的目標可能「等頁面切完才出現」→ 找到的那一幀才捲動置中。
  React.useEffect(() => {
    if (phase !== 'tour' && phase !== 'handoff') return;
    const stop = phase === 'handoff' ? HDEFS[hi] : stops[i];
    if (!stop) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PAD = 10;
    let raf = 0;
    scrolledRef.current = false;
    // handoff 站的目標一直沒出現 → info 站直接跳下一站（例如某版面沒有側欄）；
    // click 站則安靜收尾（例如第一個單元是特殊題型、沒有開始按鈕）——
    // 小朋友已經在正確的頁面上了
    const guard = phase === 'handoff'
      ? setTimeout(() => {
          if (scrolledRef.current) return;
          if (stop.mode === 'info' && hi < HDEFS.length - 1) setHi(hi + 1);
          else finish();
        }, stop.mode === 'info' ? 2500 : 8000)
      : null;
    const tick = () => {
      const hole = holeRef.current, b = bubbleRef.current;
      if (!hole || !b) return;
      const liveEl = getEl(stop);
      if (!liveEl) { raf = requestAnimationFrame(tick); return; }
      const r = liveEl.getBoundingClientRect();
      if (!r.width && !r.height) { raf = requestAnimationFrame(tick); return; }
      if (!scrolledRef.current) {
        scrolledRef.current = true;
        try { liveEl.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } catch(e) {}
      }
      const tgt = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
      let p = posRef.current;
      if (!p || reduce) { p = posRef.current = { ...tgt }; }
      else {
        p.x += (tgt.x - p.x) * 0.22; p.y += (tgt.y - p.y) * 0.22;
        p.w += (tgt.w - p.w) * 0.22; p.h += (tgt.h - p.h) * 0.22;
      }
      hole.style.transform = `translate(${p.x}px, ${p.y}px)`;
      hole.style.width = p.w + 'px';
      hole.style.height = p.h + 'px';
      // 泡泡：目標下方優先，放不下改上方；水平置中並夾在視窗內
      const bw = b.offsetWidth, bh = b.offsetHeight;
      const vw = window.innerWidth, vh = window.innerHeight;
      const below = p.y + p.h + 14 + bh < vh - 12;
      const by = below ? p.y + p.h + 14 : Math.max(12, p.y - bh - 14);
      const bx = Math.min(Math.max(12, p.x + p.w / 2 - bw / 2), vw - bw - 12);
      b.style.transform = `translate(${bx}px, ${by}px)`;
      b.style.opacity = '1';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (guard) clearTimeout(guard); };
  }, [i, stops, phase, hi]);

  // handoff：捕獲層全域過濾——click 站只有被圈住的真元素點得動；
  // info 站只是「看這裡」，連目標本身也不能點（按泡泡的下一步前進）
  React.useEffect(() => {
    if (phase !== 'handoff') return;
    const stop = HDEFS[hi];
    const onDocClick = (e) => {
      const el = stop.mode === 'click' ? getEl(stop) : null;
      if (el && (e.target === el || el.contains(e.target))) {
        // 真的點到了！讓 app 正常處理（進分類頁／開始測驗），我們再前進
        if (hi < HDEFS.length - 1) setTimeout(() => setHi(hi + 1), 60);
        else setTimeout(() => finish(), 350); // 測驗開始的轉場先跑，再悄悄收掉導覽
        return;
      }
      if (e.target.closest && (e.target.closest('.st-bubble') || e.target.closest('.st-skip'))) return;
      e.stopPropagation(); e.preventDefault();
      // 點錯地方 → 泡泡搖一下提示「點亮亮的地方」
      const b = bubbleRef.current;
      if (b && !b.classList.contains('st-deny')) {
        b.classList.add('st-deny');
        setTimeout(() => b.classList.remove('st-deny'), 450);
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [phase, hi]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { finish(); return; }
      if (phase !== 'tour') return; // 換你操作階段不能用鍵盤跳站
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [i, stops, phase]);

  if (!stops.length) return null;
  const s = stops[i];
  const h = HDEFS[hi];
  return (
    <div className={`st-root${phase === 'handoff' ? ' st-mode-handoff' : ''}`} role="dialog" aria-modal="true" aria-label="新手導覽">
      <div className="st-overlay" onClick={phase === 'tour' ? next : undefined}/>
      <div className="st-hole" ref={holeRef} aria-hidden="true">
        {phase === 'handoff' && h.mode === 'click' && <span className="st-point">👆</span>}
      </div>
      <button className="st-skip" onClick={finish}>略過導覽 ✕</button>
      {phase === 'tour' && (
        <div className="st-bubble" ref={bubbleRef} onClick={(e) => e.stopPropagation()}>
          <div className="st-inner" key={i}>
            <span className="st-count">{i + 1} / {stops.length}</span>
            <div className="st-title">{s.t}</div>
            <div className="st-sub">{s.s}</div>
            <button className="st-next" onClick={next}>{last ? '我知道了 ✓' : '下一步 →'}</button>
          </div>
        </div>
      )}
      {phase === 'handoff' && (
        <div className="st-bubble" ref={bubbleRef} onClick={(e) => e.stopPropagation()}>
          <div className="st-inner" key={'h' + hi}>
            <span className="st-count">換你操作 · {hi + 1} / {HDEFS.length}</span>
            <div className="st-title">{h.t}</div>
            <div className="st-sub">{h.s}</div>
            {h.mode === 'info' && <button className="st-next" onClick={nextH}>下一步 →</button>}
            <button className="st-later" onClick={finish}>先跳過，我自己來</button>
          </div>
        </div>
      )}
    </div>
  );
}

// v296: 新首頁——單頁品牌封面＋登入（取代舊 8 段長頁）。登入後停在封面顯示「進入課程」。
function LoginScreen({ onLogin, onSkip, onBack, loggedIn, userName, onLogout }) {
  const [loading, setLoading] = React.useState(false);
  const [slow, setSlow] = React.useState(false);
  const enterMode = loggedIn && onBack;   // 已登入且在封面 → 顯示「進入課程」
  const handleLogin = async () => {
    setLoading(true);
    setTimeout(() => { setSlow(true); setLoading(false); }, 12000); // 卡住的備援（unmount 換頁即消失）
    try { await onLogin(); } catch (e) { console.error(e); setLoading(false); }
  };
  return (
    <div className="login-screen lc-cover lc-hero">
      {onBack && !enterMode && <button className="lc-back" onClick={onBack}>← 返回課程</button>}
      <h1 className="lc-title">Alan's English Class</h1>
      <div className="lc-under2" aria-hidden="true"/>
      <p className="lc-subtitle">康橋每週進度</p>
      {/* v392: 扇形封面四張卡——只有第一張（單字）維持 loading="eager"，其餘三張改 lazy。
          原因：這四張在扇形排列裡本來就有大半被旁邊的卡片蓋住，而且實測時間軸顯示它們要到
          t=3113ms 才開始下載，等於一起搶頻寬卻沒有一起被看到。改 lazy 之後瀏覽器會把它們
          降到較低優先度、排在首屏該先拿的資源後面（在視窗內的 lazy 圖仍然會載入，只是不搶跑），
          第一張照舊第一時間抓，扇形展開的第一眼不會開天窗。 */}
      <div className="lc-fan" aria-hidden="true">
        <div className="lc-card" style={{ '--x': '-243px', '--y': '30px', '--r': '-15deg', '--d': '.62s' }}>
          <img src="cards/vocab.jpg" alt="" loading="eager"/><div className="lc-ov"/>
          <div className="lc-lab"><div className="lc-k">VOCABULARY</div><div className="lc-zh">單字</div></div>
        </div>
        <div className="lc-card" style={{ '--x': '-82px', '--y': '-8px', '--r': '-5deg', '--d': '.71s' }}>
          <img src="cards/grammar.jpg" alt="" loading="lazy"/><div className="lc-ov"/>
          <div className="lc-lab"><div className="lc-k">GRAMMAR</div><div className="lc-zh">文法</div></div>
        </div>
        <div className="lc-card" style={{ '--x': '82px', '--y': '-8px', '--r': '5deg', '--d': '.8s' }}>
          <img src="cards/word.jpg" alt="" loading="lazy"/><div className="lc-ov"/>
          <div className="lc-lab"><div className="lc-k">WORD STUDY</div><div className="lc-zh">字根字首</div></div>
        </div>
        <div className="lc-card" style={{ '--x': '243px', '--y': '30px', '--r': '15deg', '--d': '.89s' }}>
          <img src="cards/reading.jpg" alt="" loading="lazy"/><div className="lc-ov"/>
          <div className="lc-lab"><div className="lc-k">READING</div><div className="lc-zh">閱讀寫作</div></div>
        </div>
      </div>
      {enterMode ? (
        <div className="lc-cta-wrap">
          {userName && <p className="lc-welcome">歡迎回來，{userName} 👋</p>}
          <button className="lc-cta" onClick={onBack}>進入課程 →</button>
          {onLogout && <button className="lc-logout" onClick={onLogout}>登出</button>}
        </div>
      ) : (
        <div className="lc-cta-wrap">
          <button className="lc-cta" onClick={handleLogin} disabled={loading}>
            <span className="lc-gg">G</span> {loading ? '登入中…' : '使用 Google 登入'}
          </button>
          {slow && (
            <button className="lc-slow" onClick={() => { try { window.signInWithGoogleRedirect && window.signInWithGoogleRedirect(); } catch (e) {} }}>
              登入卡住了？改用這個方式 →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   v342: 我的星星 + 商店（學生端）
   星星由老師在後台給／扣；商店先放範例商品（娃娃、文具），
   兌換＝送出申請給老師（老師確認後在後台扣點）。
══════════════════════════════════════════════════════ */
const SHOP_ITEMS = [
  /* v385: 吉祥物的帽子＝虛擬商品。老師在後台扣點的那一筆就是「買到了」的憑證，
     app.jsx 會從星星紀錄算出擁有哪幾頂（見 window.__mxHats）。 */
  { id:'hat_party', emoji:'🎉', name:'吉祥物的派對帽', cost:500,  tag:'吉祥物', virtual:true },
  { id:'hat_crown', emoji:'👑', name:'吉祥物的皇冠',   cost:1000, tag:'吉祥物', virtual:true },
  { id:'labubu',   emoji:'🧸', name:'Labubu 公仔',        cost:3000,  tag:'娃娃' },
  { id:'capy_big', emoji:'🦫', name:'50 公分大卡皮巴拉',  cost:3000,  tag:'娃娃' },
  { id:'capy_sm',  emoji:'🧸', name:'小卡皮巴拉吊飾',      cost:800,   tag:'娃娃' },
  { id:'turtle',   emoji:'🐢', name:'烏龜後背包',          cost:5000,  tag:'娃娃' },
  { id:'beyblade', emoji:'🌀', name:'戰鬥陀螺',            cost:7000,  tag:'玩具' },
  { id:'watch',    emoji:'⌚', name:'極巨腕戴',            cost:8000,  tag:'玩具' },
  { id:'pen',      emoji:'🖊️', name:'酷炫中性筆',          cost:300,   tag:'文具' },
  { id:'pencase',  emoji:'🎒', name:'筆袋',                cost:1200,  tag:'文具' },
  { id:'notebook', emoji:'📒', name:'筆記本',              cost:500,   tag:'文具' },
  { id:'sticker',  emoji:'✨', name:'貼紙包',              cost:200,   tag:'文具' },
  { id:'eraser',   emoji:'🧽', name:'造型橡皮擦',          cost:150,   tag:'文具' },
  { id:'ruler',    emoji:'📏', name:'尺組',                cost:250,   tag:'文具' },
];


/* ── v362: 每日簽到 ───────────────────────────────────────
   Alan 指定的規則：每天 +5；一輪 28 天內累積 7/14/21/28 天各再 +10/20/30/40；
   整輪一天不漏再 +50 全勤獎。視覺沿用站上的暖色卡片風（不是參考圖那種鮮黃色）。 */
function CheckinPanel({ user, checkin, onClose, onDone }) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr]   = React.useState(null);
  const [burst, setBurst] = React.useState(0);
  // v362: 樂觀更新——按下去就先當作簽到了，不必等雲端快照繞回來（離線也看得到反應）
  const [justSigned, setJustSigned] = React.useState(false);
  const info = React.useMemo(() => {
    if (!window.computeCheckin) return { days: 0, streak: 0, signedToday: false, total: 0, cycleDay: 0, cycleDates: [] };
    const base = { ...(checkin || {}) };
    if (justSigned) base.dates = { ...(base.dates || {}), [window.checkinToday()]: true };
    return window.computeCheckin(base);
  }, [checkin, justSigned]);
  const CYCLE = window.CHECKIN_CYCLE || 28;
  const MILES = window.CHECKIN_MILESTONES || [[7,10],[14,20],[21,30],[28,40]];
  const milestoneAt = (n) => (MILES.find(m => m[0] === n) || [])[1] || 0;

  const doCheckIn = async () => {
    if (!user || info.signedToday || busy) return;
    setBusy(true); setErr(null);
    try {
      await window.checkInToday(user.uid, user.displayName || '', user.email || '');
      setJustSigned(true);
      setBurst(b => b + 1);
      if (window.playSound) window.playSound('complete');
      if (onDone) onDone();
    } catch (e) {
      setErr('簽到失敗，請檢查網路後再試一次');
    }
    setBusy(false);
  };

  // 這一輪的 28 格：已簽到的打勾，今天那一格可以按
  const cells = [];
  for (let i = 1; i <= CYCLE; i++) {
    const bonus = milestoneAt(i);
    const done  = i <= info.cycleDay;
    const isToday = info.signedToday ? i === info.cycleDay : i === info.cycleDay + 1;
    cells.push({ i, bonus, done, isToday });
  }

  return ReactDOM.createPortal(
    <div className="ci-overlay" onClick={onClose}>
      <div className="ci-panel" onClick={e => e.stopPropagation()}>
        <button className="ci-x" onClick={onClose} aria-label="關閉"><Icon name="close" size={16}/></button>

        <div className="ci-head">
          <div className="ci-kicker">DAILY CHECK-IN</div>
          <h2 className="ci-title">每日簽到</h2>
          <p className="ci-sub">
            {info.streak > 0
              ? <>已經連續 <b>{info.streak}</b> 天沒斷過{info.streak >= 3 ? '，很厲害！' : '，繼續保持'}</>
              : '今天簽到，開始累積連續天數吧'}
          </p>
        </div>

        {/* 里程碑進度條 */}
        <div className="ci-rail">
          <div className="ci-rail-line"><i style={{ width: Math.min(100, (info.cycleDay / CYCLE) * 100) + '%' }}/></div>
          <div className="ci-rail-marks">
            {MILES.map(([need, bonus]) => (
              <div key={need} className={'ci-mark' + (info.cycleDay >= need ? ' on' : '')} style={{ left: (need / CYCLE) * 100 + '%' }}>
                <span className="ci-mark-dot"/>
                <span className="ci-mark-lab">{need} 天<em>+{bonus}</em></span>
              </div>
            ))}
          </div>
        </div>

        <div className="ci-grid">
          {cells.map(c => (
            <div key={c.i} className={'ci-cell' + (c.done ? ' done' : '') + (c.isToday ? ' today' : '') + (c.bonus ? ' bonus' : '')}>
              <span className="ci-cell-n">{c.i}</span>
              <span className="ci-cell-ico">{c.done ? '✓' : (c.bonus ? '🎁' : '⭐')}</span>
              <span className="ci-cell-amt">+{c.bonus ? c.bonus + (window.CHECKIN_DAILY || 5) : (window.CHECKIN_DAILY || 5)}</span>
            </div>
          ))}
        </div>

        <div className="ci-foot">
          <div className="ci-foot-info">
            共簽到 <b>{info.days}</b> 天 · 已累積 <b>{info.total.toLocaleString()}</b>⭐
            <span className="ci-foot-hint">整輪 28 天一天都沒漏，再加 50⭐ 全勤獎 🏅</span>
          </div>
          <button className={'ci-btn' + (info.signedToday ? ' done' : '')} onClick={doCheckIn} disabled={info.signedToday || busy || !user}>
            {info.signedToday ? '✓ 今天已簽到' : (busy ? '簽到中…' : `簽到領 ${window.CHECKIN_DAILY || 5}⭐`)}
          </button>
        </div>
        {err && <div className="ci-err">{err}</div>}
        {burst > 0 && <div className="ci-burst" key={burst}>+{window.CHECKIN_DAILY || 5}⭐</div>}
      </div>
    </div>,
    document.body
  );
}

function StarsPanel({ user, onClose, weeks, weekOrder, progItems, checkin }) {
  const [tab, setTab]   = React.useState('me');   // 'me' | 'shop'
  const [data, setData] = React.useState({ balance: 0, entries: [] });
  const [filter, setFilter] = React.useState('全部');
  const [shopItems, setShopItems] = React.useState(null); // null＝還沒載到／老師沒設定 → 用內建範例

  React.useEffect(() => {
    if (!user || !user.email || !window.subscribeMyStars) return;
    return window.subscribeMyStars(user.email, setData, () => {});
  }, [user && user.email]);

  // v343: 商品改由老師在後台維護（含蝦皮截圖與連結）；還沒設定就先用內建範例
  React.useEffect(() => {
    if (!window.subscribeShop) return;
    return window.subscribeShop(setShopItems, () => {});
  }, []);

  // v361: 完成練習自動集點——跟老師後台用同一個函式，兩邊數字一定一致
  const auto = React.useMemo(() => {
    const a = window.computeAutoStars ? window.computeAutoStars(weeks || {}, weekOrder || [], progItems || {}) : { total: 0, entries: [] };
    // v362: 每日簽到的星星也算進來
    const c = window.computeCheckin ? window.computeCheckin(checkin) : { total: 0, entries: [] };
    return { total: a.total + c.total, entries: [...a.entries, ...c.entries] };
  }, [weeks, weekOrder, progItems, checkin]);
  const bal   = (data.balance || 0) + auto.total;   // v361: 手動 + 自動
  const items = (shopItems && shopItems.length) ? shopItems : SHOP_ITEMS;
  const tags  = ['全部', ...Array.from(new Set(items.map(i => i.tag).filter(Boolean)))];
  const shown = filter === '全部' ? items : items.filter(i => i.tag === filter);

  const redeem = (it) => {
    if (bal < it.cost) {
      alert(`還差 ${(it.cost - bal).toLocaleString()} 顆星星才能換「${it.name}」，繼續加油！⭐`);
      return;
    }
    // v392: 文案改成誠實的說法。這個函式從頭到尾只跳 alert，沒有任何 Firestore 寫入，
    //       老師端 ShopManager 也看不到任何待兌換清單——原本開頭寫「已記下你想換…」，
    //       學生按完會以為申請已經送出去、老師那邊看得到，其實沒有，只能靠學生自己去講。
    //       所以改成不會誤導的問句，後面「跟 Alan 老師說一聲」才是真正生效的那一步。
    //       （要真的送出申請是新功能，需要 data.js 的儲存函式＋老師端清單，另外議。）
    alert(it.virtual
      ? `想換「${it.name}」（${it.cost.toLocaleString()}🌟）嗎？\n\n跟 Alan 老師說一聲，老師扣點之後，你的吉祥物就會戴上它 🎩\n（長按吉祥物可以換帽子）`
      : `想換「${it.name}」（${it.cost.toLocaleString()}🌟）嗎？\n\n下次上課跟 Alan 老師說一聲，老師確認後就會幫你扣點、把東西給你 🎁`);
  };

  return ReactDOM.createPortal(
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-panel" onClick={e => e.stopPropagation()}>
        <div className="sp-head">
          <div className="sp-bal">
            <span className="sp-bal-label">我的星星</span>
            <span className="sp-bal-num">{bal.toLocaleString()}<em>⭐</em></span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="關閉"><Icon name="close" size={16}/></button>
        </div>

        <div className="sp-tabs">
          <button className={tab === 'me' ? 'on' : ''} onClick={() => setTab('me')}>⭐ 集點紀錄</button>
          <button className={tab === 'shop' ? 'on' : ''} onClick={() => setTab('shop')}>🛍️ 商店</button>
        </div>

        {tab === 'me' ? (
          <div className="sp-body">
            {(data.entries.length + auto.entries.length) === 0 ? (
              <div className="sp-empty">還沒有集點紀錄——上課認真表現、把練習做完就會拿到星星喔！⭐</div>
            ) : (
              <div className="sp-list">
                {/* v361: 老師手動記的 + 完成練習自動給的，一起依日期排 */}
                {[...data.entries, ...auto.entries]
                  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                  .map(en => (
                  <div key={en.id} className={'sp-row' + (en.amount < 0 ? ' minus' : '') + (en.auto ? ' auto' : '')}>
                    <span className="sp-row-date">{en.date || '—'}</span>
                    <span className="sp-row-amt">{en.amount > 0 ? '+' : ''}{en.amount.toLocaleString()}⭐</span>
                    <span className="sp-row-note">{en.auto ? '⚡ ' : ''}{en.note || (en.amount < 0 ? '兌換' : '集點')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="sp-body">
            <div className="sp-filter">
              {tags.map(t => (
                <button key={t} className={filter === t ? 'on' : ''} onClick={() => setFilter(t)}>{t}</button>
              ))}
            </div>
            <div className="sp-shop">
              {shown.map(it => {
                const ok = bal >= (it.cost || 0);
                return (
                  <div key={it.id} className={'sp-item' + (ok ? '' : ' locked')}>
                    {/* v343: 有上傳圖片就用真實商品照，沒有才退回 emoji */}
                    <div className="sp-item-img" aria-hidden={!it.img}>
                      {it.img
                        ? <img src={it.img} alt={it.name} loading="lazy"/>
                        : (it.emoji || '🎁')}
                    </div>
                    <div className="sp-item-name">{it.name}</div>
                    <div className="sp-item-cost">{Number(it.cost || 0).toLocaleString()}⭐</div>
                    {it.url && (
                      <a className="sp-item-link" href={it.url} target="_blank" rel="noopener noreferrer"
                         onClick={e => e.stopPropagation()}>看商品 ↗</a>
                    )}
                    <button className="sp-item-btn" onClick={() => redeem(it)}>
                      {ok ? '兌換' : `還差 ${((it.cost || 0) - bal).toLocaleString()}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="sp-shop-note">商品會不定期更新。想換的話按「兌換」，下次上課跟老師說一聲就可以囉 🎁</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// v392: 舊版行銷長頁的元件已從這份匯出名單移除（函式本體同時刪除，見檔案上方 v392 註解）
Object.assign(window, { FullscreenBtn, FocusBtn, Icon, Header, Hero, LoginScreen, LockScreen, EditableText, GradeSelector, StarBurst, MobileNav, LoadingScreen, WelcomeGuide, SpotlightTour, spawnPageWave, StarsPanel, CheckinPanel, SHOP_ITEMS });
