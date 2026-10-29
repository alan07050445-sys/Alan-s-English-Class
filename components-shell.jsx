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

/* ══ v446（Alan：「我原本有製作 G3 living in the desert 的一鍵生成，但現在不見了」）══
   單元其實一直都在——在第 1 週，而網站開起來停在「今天這一週」，那一週是空的。
   這支是「用名字找單元」的純比對：整個年級的每一週、每一類都找，同名的併成一列。 */
function findUnitsIn(weekOrder, weeks, q) {
  const key = String(q || '').trim().toLowerCase();
  if (key.length < 2) return [];
  const seen = {}, out = [];
  (weekOrder || []).forEach((id) => {
    const w = (weeks || {})[id];
    if (!w) return;
    Object.keys(w.items || {}).forEach((cat) => {
      (w.items[cat] || []).forEach((it) => {
        const name = String((it && it.group) || (it && it.title) || '');
        if (!name) return;
        if ((name + ' ' + String((it && it.title) || '')).toLowerCase().indexOf(key) < 0) return;
        const k = id + '|' + cat + '|' + name;
        if (seen[k]) { seen[k].n++; return; }
        seen[k] = { id, cat, name, n: 1, label: w.label || id, range: w.dateRange || '' };
        out.push(seen[k]);
      });
    });
  });
  return out.slice(0, 12);
}

function Header({
  week, weekOrder, weekIdx, onPrevWeek, onNextWeek,
  onShowCheckin, checkinDone, checkinStreak,
  canEdit, editMode, onToggleEdit, onAsk, onAddWeek, onCompose, onTrash, onDeleteWeek, onArchiveWeek, weekArchived, onExport, onEditWeek, onTermSetup, onQuickSet, onGrammarGen, onReadingGen, onGrammarNotes, onWordStudy, onExamScan, onExamDraft, pace, nextF, onPacing, onExamPrep,
  progress,
  // Auth props
  user, onLogin, onLogout, onShowDashboard, onHome,
  // Mistakes
  mistakesCount, onShowMistakes,
  // Grade
  grade, onSwitchGrade,
  compactLobby,
  starBalance, onShowStars,   // v342: 集點
  weeks, onGoWeek,            // v446：找單元／跳到有內容的那一週
}) {
  // v442：編輯列的「⋯ 更多」預設收起來（其他老師最常用的是三顆一鍵生成）
  const [moreOpen, setMoreOpen] = React.useState(false);
  /* v489：國慶外觀的開關是寫在 <html> 的 class 上（不是 React state），
     按完 React 不知道要重畫 → 用這個計數器逼它重畫一次按鈕文字。 */
  const [festTick, setFestTick] = React.useState(0);
  /* ══ v446（Alan：「我原本有製作 G3 living in the desert 的一鍵生成，但現在不見了」）══
     東西沒有不見——它在第 1 週，而網站開起來會停在「今天這一週」，那一週剛好是空的。
     所以補兩件事：① 空的一週直接告訴老師最近有內容的是哪一週 ② 用名字搜尋整個年級的單元。 */
  const [findQ, setFindQ] = React.useState('');
  const weekMap = weeks || {};
  const weekItems = React.useCallback((id) => {
    const w = weekMap[id];
    return w ? [].concat.apply([], Object.keys(w.items || {}).map(c => (w.items[c] || []).map(it => ({ it, cat: c })))) : [];
  }, [weekMap]);
  const curEmpty = !!(canEdit && week && week.id && weekMap[week.id] && weekItems(week.id).length === 0);
  // 最近一個「有內容」的週次（先往回找，沒有再往後找）
  const nearest = React.useMemo(() => {
    if (!curEmpty) return null;
    const ord = weekOrder || [];
    for (let d = 1; d < ord.length; d++) {
      for (const j of [weekIdx - d, weekIdx + d]) {
        if (j < 0 || j >= ord.length) continue;
        if (weekItems(ord[j]).length) return { id: ord[j], w: weekMap[ord[j]] || {} };
      }
    }
    return null;
  }, [curEmpty, weekIdx, weekOrder, weekMap]);
  const findHits = React.useMemo(() => findUnitsIn(weekOrder, weekMap, findQ), [findQ, weekOrder, weekMap]);
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
            {/* v399：年級由學號綁定的學生拿不到 onSwitchGrade——那就不該是一顆按鈕
                （點了沒反應比看起來不能點更糟），改成純標籤。老師端完全沒變。 */}
            {grade && (onSwitchGrade
              ? <button className="grade-chip" onClick={onSwitchGrade} title="Switch grade" aria-label="切換年級">
                  {window.isSummerTrack && window.isSummerTrack(grade) ? '☀️ 暑假' : grade.toUpperCase()}
                </button>
              : <span className="grade-chip grade-chip-fixed" aria-label={`年級 ${grade.toUpperCase()}`}>
                  {window.isSummerTrack && window.isSummerTrack(grade) ? '☀️ 暑假' : grade.toUpperCase()}
                </span>
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
        /* ══ v442（Alan：「因為我要給其他老師用了，所以這個 edit 介面做清楚一點——
           主要就是一鍵生成單字／文法／閱讀理解，其他功能比較少用到」）══
           三顆一鍵生成放最上面、各自寫清楚「貼什麼進去、會生出什麼」；
           其餘（學期、新增一週、備份、封存、刪除）收在「⋯ 更多」裡，需要才打開。
           ⚠ 這個檔案裡有兩個 `{editMode && canEdit &&`（另一個在週次標題旁邊）——
             改這一段一定要從檔案後面找，不要用「第一個符合的」。 */
        <div className="edit-banner">
          <div className="shell edit-banner-inner">
            <div className="edit-banner-top">
              <span className="edit-banner-tag">● 老師編輯模式</span>
              {weekArchived && <span className="edit-banner-archived">📦 這一週已封存 · 學生看不到</span>}
              <span className="edit-banner-gap"/>
              <button className="banner-btn" onClick={() => setMoreOpen(v => !v)}>
                {moreOpen ? '收起其他功能' : '⋯ 更多（學期／備份／封存）'}
              </button>
              <button className="banner-btn done" onClick={onToggleEdit}>完成編輯 →</button>
            </div>

            {/* v446：用名字找回自己做過的單元（做完那一週之後就很難翻） */}
            <div className="find-unit">
              <input className="find-unit-in" value={findQ} onChange={e => setFindQ(e.target.value)}
                placeholder="🔍 找單元（打名字就好，例：desert）"/>
              {findQ.trim().length >= 2 && (
                <div className="find-unit-res">
                  {findHits.length === 0
                    ? <div className="find-unit-none">這個年級找不到「{findQ.trim()}」——可能在別的年級（右上角切換）</div>
                    : findHits.map((h, i) => (
                      <button key={i} className="find-unit-row" onClick={() => { setFindQ(''); if (onGoWeek) onGoWeek(h.id, h.cat); }}>
                        <b>{h.name}</b>
                        <span>{h.label}{h.range ? '（' + h.range + '）' : ''} · {h.n} 個單元</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* ══ 🏫 v493：學校這週在教什麼 ══════════════════════════════
                Alan 本來要自己開 Excel 查「這週外師教哪一課、中師的文法作業是哪個主題」。
                週次已經跟學校 1:1 對上，所以直接長在這裡。
                ⚠ 沒有匯入進度表的年級就完全不顯示（不要留一條空的）。 */}
            {pace && (() => {
              /* v503：跟後台的上課紀錄用同一套顯示規則——
                 拿掉 U1W5／Skill 1 這種編號前綴，頁數一律帶書名（書名來自 Excel 欄位標題）。
                 ⚠ 兩邊顯示規則要一致，不然同一件事在兩個畫面長不一樣。 */
              const C = window.pacingClean || (x => x);
              const B = window.pacingBooks || (() => []);
              const books = (side) => B(side).map((x, i) => (
                <span key={i} className="sw-bk"><em>{x.book}</em>{x.pages}</span>
              ));
              return (
              <div className="sw-bar">
                <div className="sw-row">
                  <span className="sw-tag it">外師</span>
                  <b className="sw-main">{pace.it.reading || '—'}</b>
                  {pace.it.vocab && <span className="sw-part">{pace.it.vocab}</span>}
                  {pace.it.wordStudy && <span className="sw-chip">{C(pace.it.wordStudy)}</span>}
                  {pace.it.skill && <span className="sw-dim">{C(pace.it.skill)}</span>}
                  {B(pace.it).length > 0 && <span className="sw-hw">📕 {books(pace.it)}</span>}
                </div>
                <div className="sw-row">
                  <span className="sw-tag lt">中師</span>
                  <b className="sw-main">{C(pace.lt.grammar) || '—'}</b>
                  {/* ⭐ Alan 特別講的眉角：上 Writing Activity 那週，作業是沿用上一個文法主題 */}
                  {pace.lt._carry && pace.lt.grammarHw && (
                    <span className="sw-chip carry">↩ 作業是 {C(pace.lt.grammarHw)}</span>
                  )}
                  {/* 🔴 v494（Alan：「G6 的 Grammar 顯示很多頁數，但老師實際上只會教粗體的頁數」） */}
                  {pace.lt.grammarBold && (
                    <span className="sw-bold">✏️ 只教 pp. {pace.lt.grammarBold.join(', ')}</span>
                  )}
                  {B(pace.lt).length > 0 && <span className="sw-hw">📕 {books(pace.lt)}</span>}
                </div>
                {(pace.note || nextF) && (
                  <div className="sw-row sw-foot">
                    {/* v513：這兩塊本來只是文字。點下去 → 考前複習包
                        （範圍跟那幾週教過的字，程式自己算得出來）。 */}
                    {nextF && nextF.it && (
                      <button className={'sw-f' + (nextF.it.in <= 1 ? ' near' : '') + (onExamPrep ? ' go' : '')}
                        onClick={onExamPrep ? () => onExamPrep('it') : null} disabled={!onExamPrep}
                        title={onExamPrep ? '把這次考試範圍的單字撈出來，一鍵出複習題' : ''}>
                        🧪 外師 {nextF.it.name}：{nextF.it.in === 0 ? '就是這週' : `還有 ${nextF.it.in} 週`}
                        {onExamPrep && <i>　📝 出複習</i>}
                      </button>
                    )}
                    {nextF && nextF.lt && (
                      <button className={'sw-f' + (nextF.lt.in <= 1 ? ' near' : '') + (onExamPrep ? ' go' : '')}
                        onClick={onExamPrep ? () => onExamPrep('lt') : null} disabled={!onExamPrep}
                        title={onExamPrep ? '把這次考試範圍的單字撈出來，一鍵出複習題' : ''}>
                        🧪 中師 {nextF.lt.name}：{nextF.lt.in === 0 ? '就是這週' : `還有 ${nextF.lt.in} 週`}
                        {onExamPrep && <i>　📝 出複習</i>}
                      </button>
                    )}
                    {pace.note && <span className="sw-note">📅 {pace.note}</span>}
                  </div>
                )}
              </div>
              );
            })()}

            <div className="edit-make">
              {onQuickSet && (
                <button className="edit-make-btn quick" onClick={onQuickSet}>
                  <span className="emk-ico">🔤</span>
                  <span className="emk-txt"><b>一鍵出單字</b><em>貼單字表 → 單字卡・測驗・配對・填空・聽寫</em></span>
                </button>
              )}
              {onGrammarNotes && (
                <button className="edit-make-btn gn" onClick={onGrammarNotes}>
                  <span className="emk-ico">✏️</span>
                  <span className="emk-txt"><b>一鍵出文法</b><em>上傳作業照片／貼文字 → 互動教學・選擇・填空・中翻英</em></span>
                </button>
              )}
              {/* 💬 v517：不用找按鈕，直接講。它只負責挑工具＋填參數，不自己出題也不自己存 */}
              {onAsk && (
                <button className="edit-make-btn ask" onClick={onAsk}>
                  <span className="emk-ico">💬</span>
                  <span className="emk-txt"><b>用講的就好</b><em>說一句話或丟截圖 → 它幫你打開對的工具、填好</em></span>
                </button>
              )}
              {/* 📸 v516：Alan 手上有一疊考過的 Formative，拍一拍就變成互動版 */}
              {onExamScan && (
                <button className="edit-make-btn exs" onClick={onExamScan}>
                  <span className="emk-ico">📸</span>
                  <span className="emk-txt"><b>拍考卷</b><em>拍學校的 Formative → 一份有配分的互動考卷</em></span>
                </button>
              )}
              {/* 🗣 v561：跟 AI 一來一往出一份大考考卷（他說考什麼、哪裡要改，AI 改草稿） */}
              {onExamDraft && (
                <button className="edit-make-btn exs" onClick={onExamDraft}>
                  <span className="emk-ico">🗣</span>
                  <span className="emk-txt"><b>跟 AI 出大考考卷</b><em>說這次考什麼 → AI 擬草稿 → 你說哪裡要改 → 有配分的考卷</em></span>
                </button>
              )}
              {/* v482：📘 Word Study——康橋每一課都有，主題每次不同但題型固定那幾種 */}
              {onWordStudy && (
                <button className="edit-make-btn ws" onClick={onWordStudy}>
                  <span className="emk-ico">📘</span>
                  <span className="emk-txt"><b>一鍵出 Word Study</b><em>打上這次的規則 → 圈出來・分一分・選擇・短文找字</em></span>
                </button>
              )}
              {onReadingGen && (
                <button className="edit-make-btn rc" onClick={onReadingGen}>
                  <span className="emk-ico">📖</span>
                  <span className="emk-txt"><b>一鍵出閱讀理解</b><em>貼文章 → 背景知識・選擇・簡答・閱讀技巧</em></span>
                </button>
              )}
            </div>

            {moreOpen && (
              <div className="edit-banner-tools">
                {onGrammarGen && (
                  <button className="banner-btn gr" onClick={onGrammarGen}>✨ 出時態題目</button>
                )}
                {onTermSetup && (
                  <button className="banner-btn term" onClick={onTermSetup}>📅 建立一整個學期</button>
                )}
                <button className="banner-btn" onClick={onAddWeek}><Icon name="plus" size={12}/> 新增一週</button>
                {onCompose && (
                  <button className="banner-btn" onClick={onCompose}>📚 組合複習／模擬考</button>
                )}
                {onTrash && (
                  <button className="banner-btn" onClick={onTrash}>🗑 垃圾桶（救回刪掉的）</button>
                )}
                {onExport && (
                  <button className="banner-btn" onClick={onExport}>💾 匯出備份</button>
                )}
                {onArchiveWeek && (
                  <button className="banner-btn arch" onClick={onArchiveWeek}>
                    {weekArchived ? '↩ 取消封存' : '📦 封存這一週'}
                  </button>
                )}
                {/* v489：節慶外觀的開關。平常不顯示——只有「現在是節慶期間」或
                    「老師自己強制開著」時才出現，免得一年到頭掛著一顆沒用的按鈕。
                    ⚠ 只影響按的人這台裝置（學生看到的永遠是日期判斷的結果）。
                    ⚠ v523：名稱跟著當季節慶走，不要再寫死「國慶」——
                      關掉的時候 festNow() 是 null，所以名字要從節慶表裡撈。 */}
                {window.festOn && (window.festOn() || (window.festOverride && window.festOverride() !== 'auto')) && (() => {
                  const f = window.festNow && window.festNow();
                  const season = f || (window.FESTS || []).find(x => {
                    const d = new Date();
                    const md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                    return md >= x.from && md <= x.to;
                  }) || (window.FESTS || [])[(window.FESTS || []).length - 1] || { emoji: '🎊', zh: '節慶外觀' };
                  return (
                    <button className="banner-btn fest" onClick={() => {
                      window.festSetOverride(f ? 'off' : 'on');
                      setFestTick(t => t + 1);
                    }}>
                      {season.emoji} {season.zh}：{f ? '開（按一下關掉）' : '關（按一下打開）'}
                    </button>
                  );
                })()}
                {onPacing && (
                  <button className="banner-btn pace" onClick={onPacing}>
                    🏫 {pace ? '學校進度表' : '匯入學校進度表'}
                  </button>
                )}
                <button className="banner-btn danger" onClick={onDeleteWeek}><Icon name="trash" size={12}/> 刪除這一週</button>
              </div>
            )}
          </div>
        </div>
      }
      {/* v446：老師打開網站會停在「今天這一週」，那一週常常還是空的——直接指路，
          不然做過的東西看起來就像不見了（Alan 的 desert 單字其實一直在第 1 週）。 */}
      {curEmpty && nearest && (
        <div className="week-empty-bar">
          <span>這一週（{week.label}）還沒有內容。</span>
          <button onClick={() => onGoWeek && onGoWeek(nearest.id)}>
            最近有內容的是 {nearest.w.label || nearest.id}{nearest.w.dateRange ? `（${nearest.w.dateRange}）` : ''} →
          </button>
        </div>
      )}
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
/* ══ 🛟 v502 不要整頁白掉 ═══════════════════════════════════════════════
   Alan：「匯入進去直接跑出這個 bug」——畫面整片空白，只剩左上角一點殘影。
   React 預設行為就是這樣：render 裡丟出例外 → **整棵樹卸載**＝全白，
   使用者什麼線索都沒有，只能截一張白畫面給我。

   ⭐ 這一層讓它改成：壞掉的那一塊顯示「哪裡壞了＋錯誤訊息＋怎麼繼續」，
     其他地方照常能用。錯誤訊息直接印在畫面上，Alan 截圖就等於把 console 給我了。 */
class Boom extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    try { console.error('[Boom]', this.props.where || '', err, info && info.componentStack); } catch (e) {}
  }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = String((this.state.err && this.state.err.message) || this.state.err);
    return (
      <div className="boom">
        <b>⚠️ 這一塊壞掉了{this.props.where ? `（${this.props.where}）` : ''}</b>
        <code>{msg}</code>
        <span>其他功能還能用。<b>把這段文字截圖給 Claude</b> 就能直接修。</span>
        <button onClick={() => this.setState({ err: null })}>再試一次</button>
      </div>
    );
  }
}

function GradeSelector({ onSelect, summer, homeGrade, who, onChangeGrade, onViewLanding, onOpenGuide, onLogout, summerOnly, onOpenAdmin, lockedGrade }) {
  const grades = [
    { id: 'g1', n: 'G1', zh: '一年級' },
    { id: 'g2', n: 'G2', zh: '二年級' },
    { id: 'g3', n: 'G3', zh: '三年級' },
    { id: 'g4', n: 'G4', zh: '四年級' },
    { id: 'g5', n: 'G5', zh: '五年級' },
    { id: 'g6', n: 'G6', zh: '六年級' },
  ];
  const home = grades.find(g => g.id === homeGrade) || null;
  const [stashOpen, setStashOpen] = React.useState(false);   // v402: 其他題庫抽屜（預設收起來）
  /* v399：lockedGrade ＝ 這個人的年級是學號算出來的，不給改。
     鎖定時 showAll 永遠是 false，「改選其他年級」那顆也不會出現。 */
  const [showAll, setShowAll] = React.useState(!home); // 有專屬年級 → 門口模式；否則完整選單
  const doorMode = home && (lockedGrade || !showAll);

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

  /* v402：收進抽屜的卡片。維持原本的顯示條件，只是改成先收集起來再一起畫。 */
  const stashCards = [];
  const stashNames = [];
  if (summer && summer.lib) {
    stashNames.push('暑假題庫');
    stashCards.push(
      <button key="lib" className="gs-card gs-card-lib" onClick={() => onSelect(window.SUMMER_LIB || 'sl')}>
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
    );
  }
  if (!summerOnly && onOpenAdmin) {
    stashNames.push('五大時態');
    stashCards.push(
      <button key="gr" className="gs-card gs-card-gr" onClick={() => onSelect(window.GRAMMAR_TRACK || 'gr')}>
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
    );
  }

  return (
    <div className="grade-selector">
      {/* v490（Alan：「門口頁也是！要有過節的感覺」）——跟封面同一套飄帶。
          v523 起飄帶長相由當季的 CSS 決定（國慶＝國旗、萬聖節＝南瓜田），
          這裡的 markup 一行都不用改。 */}
      {window.festOn && window.festOn() && (
        <div className="fest-ribbon" aria-hidden="true"><i/></div>
      )}
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
            /* v489：國慶期間問候語換成節慶版（10/10 當天講「今天」，前後幾天講「快樂」）。
               ⚠ 這個標籤跟主題外觀綁同一個判斷（window.festOn），
                 不要另外再寫一份日期判斷——兩份一定會走鐘。 */
            ? <><span className="gs-date">{dateLine}</span><span className="gs-date-dot">·</span>
                今天要從哪裡開始呢？</>
            : '選好就直接帶你進入這一週的練習。'}
        </p>
        {/* v526：倒數從句子裡搬出來自己站一排（Alan 要「放大顯示」）。
            ⚠ 跟外觀共用同一個 festOn，平常這一段等於不存在。 */}
        {window.festOn && window.festOn() && (
          <div className="fest-day-wrap"><FestCountdown big/></div>
        )}
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
            {/* v399：年級綁學號之後，學生不再有「改選其他年級」（老師端照舊） */}
            {!lockedGrade && (
              <button className="gs-switch" onClick={() => setShowAll(true)}>不是{home.zh}了嗎？改選其他年級</button>
            )}
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
        {/* v399（Alan 指定）：門口頁底下就這三條——新手教學／回到主頁／換帳號。
            「回到主頁」＝回到首頁封面；onViewLanding 這個 prop 其實 app.jsx 一直都有傳，
            但從來沒有被畫出來（寫好卻沒有呼叫點的死 prop）。
            換帳號排最後：它是唯一「會把人踢出去」的動作，放在最右邊最不容易誤觸。 */}
        {/* ══ v402（Alan：開學了，這兩個暫時用不到，收起來）══
            暑假題庫與五大時態核心題庫都是「常設工作區」，不是每天要用的東西。
            開學後它們卡在教室卡上面，等於每天都要先跳過兩張大卡才看到今天要進的教室。
            改成收在一條細細的抽屜裡、預設關著，需要時點開——卡片本身完全沒改，
            只是換了位置與預設狀態。（兩張都只有老師拿得到，學生端看不見這一條。） */}
        {stashCards.length > 0 && (
          <div className={'gs-stash' + (stashOpen ? ' open' : '')}>
            <button className="gs-stash-bar" onClick={() => setStashOpen(o => !o)}
              aria-expanded={stashOpen}>
              <span className="gs-stash-ico" aria-hidden="true">🗄</span>
              <span className="gs-stash-lbl">其他題庫<em>{stashNames.join(' · ')}</em></span>
              <span className="gs-stash-caret" aria-hidden="true">{stashOpen ? '收起 ▴' : '展開 ▾'}</span>
            </button>
            {stashOpen && <div className="gs-stash-body">{stashCards}</div>}
          </div>
        )}
        {!summerOnly && (onOpenGuide || onViewLanding || (who && onLogout)) && (
          <div className="gs-links">
            {onOpenGuide && (
              <button className="gs-switch gs-landing-link" onClick={onOpenGuide}>新手教學</button>
            )}
            {onViewLanding && (
              <button className="gs-switch gs-landing-link" onClick={onViewLanding}>回到主頁</button>
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
  const EMOJIS = (window.festIs && window.festIs('hw')) ? ['🎃','🎃','🦇','👻','🎃','✨'] : ['⭐','✨','🌟','💫','⭐','🌟'];
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
            <span className="mobile-nav-icon">{catView?.id === 'vocab' ? '📚' : catView?.id === 'grammar' ? '✏️' : catView?.id === 'word' ? '🔤' : catView?.id === 'ltvocab' ? '📕' : catView?.id === 'mock' ? '📝' : '📖'}</span>
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
/* ───────── v526 ⏳ 倒數鐘（Alan：「改成明確時間倒數，比較酷，並且放大顯示」）─────────
   ⚠ 每秒更新但**不重新 render**：數字直接寫進四個 ref 的 textContent。
     走 state 的話整個封面（含四張扇形卡、滑鼠拖尾那層）每秒都會被 React 重算一次，
     而且 useFestCursor 掛在同一個容器上、那些節點不是 React 建的，反覆 render 有風險。
   ⚠ 只有「倒數結束」才真的換畫面（一次 setState），之後 interval 自己停。 */
function FestCountdown({ big }) {
  const f = window.festNow && window.festNow();
  const dRef = React.useRef(null), hRef = React.useRef(null);
  const mRef = React.useRef(null), sRef = React.useRef(null);
  const first = React.useMemo(
    () => (window.festCountParts ? window.festCountParts() : null), []);
  const [over, setOver] = React.useState(!first);

  React.useEffect(() => {
    if (over || !window.festCountParts) return;
    const pad = (n) => String(n).padStart(2, '0');
    const id = setInterval(() => {
      const p = window.festCountParts();
      if (!p) { setOver(true); return; }
      if (dRef.current) dRef.current.textContent = p.d;
      if (hRef.current) hRef.current.textContent = pad(p.h);
      if (mRef.current) mRef.current.textContent = pad(p.m);
      if (sRef.current) sRef.current.textContent = pad(p.s);
    }, 1000);
    return () => clearInterval(id);
  }, [over]);

  if (!f) return null;
  if (over) return <span className="fest-day"><b>{f.day}</b> {f.hi}</span>;
  const pad = (n) => String(n).padStart(2, '0');
  const cells = [
    [dRef, String(first.d), '天'], [hRef, pad(first.h), '時'],
    [mRef, pad(first.m), '分'],    [sRef, pad(first.s), '秒'],
  ];
  return (
    <div className={'fest-tick' + (big ? ' fest-tick-big' : '')}
      role="timer" aria-label={`距離${f.name}的倒數`}>
      <span className="fest-tick-lab">{f.emoji} 距離{f.name}</span>
      <span className="fest-tick-row">
        {cells.map(([ref, v, lab], i) => (
          <span className="fest-tick-c" key={lab}>
            <b ref={ref}>{v}</b><i>{lab}</i>
          </span>
        ))}
      </span>
    </div>
  );
}

/* ───────── v525 ④ 滑鼠特效（v528 擴到門口頁與大廳）─────────
   滑過去會留下一串小蝙蝠／小鬼／月亮，自己飄走。

   ⚠ 三個條件都要擋，不然會變成「幫倒忙」：
     ① 只在節慶期間（平常這個 effect 等於不存在）
     ② `pointer: fine`＝有滑鼠才做。平板點一下會送一個 pointermove，
        手指移動也會——在觸控裝置上等於一路噴圖案蓋住內容。
     ③ prefers-reduced-motion 一律不做。
   ⚠ 用節流**距離**不是節流時間：慢慢移動時時間節流一樣會一直噴，
     但視覺上根本沒移動，結果是在原地疊一坨。
   ⚠ 直接操作 DOM，不走 React state——這是每秒幾十次的事件，
     進 state 會讓整個畫面重新 render。

   ⭐ v528 改成「裝在 document 上、圖案放進自己的固定層」：
     本來是綁在封面那個容器上（useFestCursor(ref)），要擴到門口頁與大廳
     就得三個地方各掛一次，而大廳是 app.jsx 畫的、拿不到同一個 ref。
     改成一個全域監聽 ＋ 用 closest() 判斷滑鼠在不在這三頁上，
     而且圖案用 position:fixed 放進自己的層 → **不用管那三個容器是不是
     position:relative，也不會被 overflow:hidden 裁掉**。 */
/* v529：加上作答頁；而且把「要移動多遠才生一個」從 46 調到 30
   ——Alan 回報封面「鼠標沒了」，實測其實有在跑，只是慢慢移動時太稀疏，
   看起來就像沒反應。密一點才看得出來是一串跟著走的東西。 */
const FEST_CURSOR_ON = '.lc-cover, .grade-selector, .page-lobby, .page-mission';
/* ⚠ 不做成 React hook：封面、門口頁、大廳是三個不同的元件，而且大廳是
   app.jsx 畫的——做成 hook 就要在三個地方各掛一次，而且元件一卸載就失效。
   它本來就不需要 React（只監聽 document ＋ 自己管 DOM），所以改成
   「載入時裝一次」，剩下的交給 closest() 判斷滑鼠在不在這三頁上。 */
function installFestCursor() {
  {
    if (!(window.festOn && window.festOn())) return;
    let fine = false, calm = true;
    try {
      fine = window.matchMedia('(pointer: fine)').matches;
      calm = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    if (!fine || !calm) return;

    const host = document.createElement('div');
    host.className = 'hw-trail-layer';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
    /* 🔴 v551（Alan：「第二頁、第三頁的鼠標都有萬聖節主題，但我的首頁怎麼沒有變」）
       封面（.lc-cover）是 position:fixed、z-index:300 的整頁蓋板，
       而上面那一層只有 z-index:4 → 圖案**有生出來，但整個被封面蓋在底下**。
       第二、三頁是一般版面（沒有蓋板）所以看得到。
       v528／v529 我是用「數 DOM 節點」驗證的（生出 8 個），所以當時回報「有在跑」，
       其實肉眼看不見——⭐ 驗證特效要問「那個位置最上面的元素是誰」，不是「有沒有生出來」。
       ⚠ 不能把整層一起抬高：閱讀與單字卡的全螢幕層同樣是 z-index:300，
         抬高會讓蝙蝠飛到小朋友正在讀的內容上（v528 刻意不做）。
         所以**只有封面**用一層比它高一點的（.hw-trail-top）。 */
    const hostTop = document.createElement('div');
    hostTop.className = 'hw-trail-layer hw-trail-top';
    hostTop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hostTop);

    const KINDS = ['bat', 'ghost', 'star', 'bat', 'star'];
    let last = null, i = 0;
    const timers = new Set();
    const onMove = (e) => {
      const t = e.target;
      if (!(t && t.closest && t.closest(FEST_CURSOR_ON))) { last = null; return; }
      const x = e.clientX, y = e.clientY;
      if (last && Math.hypot(x - last[0], y - last[1]) < 30) return;
      last = [x, y];
      const sp = document.createElement('span');
      sp.className = 'hw-trail hw-trail-' + KINDS[i++ % KINDS.length];
      sp.style.left = x + 'px';
      sp.style.top = y + 'px';
      sp.style.setProperty('--dx', (Math.random() * 36 - 18).toFixed(1) + 'px');
      sp.style.setProperty('--rot', (Math.random() * 50 - 25).toFixed(1) + 'deg');
      (t.closest('.lc-cover') ? hostTop : host).appendChild(sp);
      const tm = setTimeout(() => { try { sp.remove(); } catch (er) {} timers.delete(tm); }, 1200);
      timers.add(tm);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    /* 換頁時把還在飄的清掉，免得它們留在 DOM 上 */
    window.addEventListener('pagehide', () => {
      try { document.querySelectorAll('.hw-trail-layer .hw-trail').forEach(n => n.remove()); } catch (er) {}
      timers.forEach(clearTimeout);
    });
  }
}
try { installFestCursor(); } catch (e) {}

/* ══ v555 🎃 萬聖節：全站的「星星」都換成南瓜（Alan：「所有的星星也都改成這個特效，包括商店、完成獲得的特效星星」）
   做法是在 DOM 層把文字裡的 ⭐ 🌟 換成 🎃——商店、星星餘額、結算、老師後台一次全包，
   不用逐一去改 100 多個地方，而且之後新加的星星也自動變南瓜。
   ⚠ 只在萬聖節外觀開著的時候做（festIs('hw')）；節慶一過就不裝，什麼都不會變。
   ⚠ 只改「顯示」：input／textarea／可編輯區不碰，資料裡存的字一個都沒動。
   ⚠ 只換 ⭐🌟 兩個 emoji。★☆（5 星評分的實心／空心）換了會對不上，不動。 */
function installFestStars() {
  if (typeof document === 'undefined' || window.__festStars) return;
  if (!(window.festIs && window.festIs('hw'))) return;
  window.__festStars = true;
  const RE = /[\u2B50\u{1F31F}]\uFE0F?/gu;
  const SKIP = 'script,style,textarea,input,select,[contenteditable="true"]';
  const fix = (n) => {
    if (n.nodeType === 3) {
      const v = n.nodeValue;
      if (v && RE.test(v)) {
        RE.lastIndex = 0;
        const p = n.parentElement;
        if (p && p.closest(SKIP)) return;
        n.nodeValue = v.replace(RE, '🎃');
      }
      RE.lastIndex = 0;
    } else if (n.nodeType === 1 && !n.matches(SKIP)) {
      const w = document.createTreeWalker(n, window.NodeFilter.SHOW_TEXT);
      let t; while ((t = w.nextNode())) fix(t);
    }
  };
  let busy = false;
  const mo = new MutationObserver((muts) => {
    if (busy) return;
    busy = true;
    try {
      muts.forEach(m => {
        if (m.type === 'characterData') fix(m.target);
        else m.addedNodes.forEach(fix);
      });
    } finally { busy = false; }
  });
  const start = () => {
    fix(document.body);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}
try { installFestStars(); } catch (e) {}

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
      {/* v490（Alan：「登入封面也要很明顯過節的感覺」）：
          v489 只換了顏色，他看不出來在過節 → 加飄帶＋主角圖案＋日期徽章。
          ⚠ 只在節慶期間才 render，平常這兩行等於不存在（跟外觀共用同一個 festOn）。 */}
      {window.festOn && window.festOn() && (
        <div className="fest-ribbon" aria-hidden="true"><i/></div>
      )}
      {onBack && !enterMode && <button className="lc-back" onClick={onBack}>← 返回課程</button>}
      <h1 className="lc-title">Alan's English Class</h1>
      <div className="lc-under2" aria-hidden="true"/>
      <p className="lc-subtitle">康橋每週進度</p>
      {/* v525（Alan：「改成倒數距離萬聖節，這樣小朋友比較喜歡」）
          ⚠ 天數是每次 render 算的，不是存起來的——跨午夜不會停在昨天的數字。 */}
      {window.festOn && window.festOn() && (
        <div className="fest-day-wrap"><FestCountdown big/></div>
      )}
      {/* v552（Alan：「首頁特別提到像遊戲一樣、漂亮特效」）：限時雙倍的遊戲式橫幅。
          ⚠ 只在 10/20～10/31 才 render，跟星星加倍用同一個 hwDoubleOn。 */}
      {window.hwDoubleOn && window.hwDoubleOn() && (
        <div className="hw-x2-banner" aria-label="萬聖節限時星星雙倍">
          <i className="hw-x2-sp s1">✦</i><i className="hw-x2-sp s2">🦇</i>
          <i className="hw-x2-sp s3">✦</i><i className="hw-x2-sp s4">🎃</i>
          <span className="hw-x2-tag">LIMITED EVENT · 限時活動</span>
          <span className="hw-x2-main">🎃 萬聖節 <b>星星 ×2</b> 🎃</span>
        </div>
      )}
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
  /* v385 的兩頂帽子已經搬到 v431 的「吉祥物裝扮」區（data.js MX_SHOP）——
     那邊是按了就買到、馬上換上，不用再麻煩老師扣點。以前老師扣過點的人仍然算擁有。 */
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

function StarsPanel({ user, onClose, weeks, weekOrder, progItems, checkin, fixed, treat, mx, onOpenDress }) {
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
    // v465：訂正錯題的星星也算進來（跟 header 右上角那顆 ⭐ 用同一組函式）
    const f = window.computeFixedStars ? window.computeFixedStars(fixed) : { total: 0, entries: [] };
    const tr = window.computeTreatStars ? window.computeTreatStars(treat, user && user.uid) : { total: 0, entries: [] };   // v612
    return { total: a.total + c.total + f.total + tr.total, entries: [...a.entries, ...c.entries, ...f.entries, ...tr.entries] };
  }, [weeks, weekOrder, progItems, checkin, fixed, treat]);
  /* v431 ④：買吉祥物裝扮花掉的星星要扣掉。花了多少由「買到哪幾件」反算（data.js mxSpent），
     跟 header 右上角那顆 ⭐ 用的是同一個算法，兩邊不可能對不起來。 */
  const spent = window.mxSpent ? window.mxSpent(mx) : 0;
  const bal   = Math.max(0, (data.balance || 0) + auto.total - spent);   // v361: 手動 + 自動 − 裝扮
  /* v451（Alan：「集點紀錄除了集點也要包含扣點或是買了什麼東西，全部都標示上去」）：
     買裝扮／改名卡／老師退費也排進同一張清單（data.js mxStarRows，跟餘額同一份資料算出來）。 */
  const mxRows = React.useMemo(() => (window.mxStarRows ? window.mxStarRows(mx) : []), [mx]);
  const allRows = React.useMemo(
    () => [...data.entries, ...auto.entries, ...mxRows]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    [data.entries, auto.entries, mxRows]);
  const items = (shopItems && shopItems.length) ? shopItems : SHOP_ITEMS;
  const tags  = ['全部', '吉祥物', ...Array.from(new Set(items.map(i => i.tag).filter(Boolean)))];
  const shown = filter === '全部' ? items : filter === '吉祥物' ? [] : items.filter(i => i.tag === filter);
  // v431：吉祥物的裝扮是「按了就買到、馬上換上」的虛擬商品，跟實體商品分開一區
  const cosmetics = (filter === '全部' || filter === '吉祥物') ? (window.mxShopVisible ? window.mxShopVisible(mx) : (window.MX_SHOP || [])).filter(it => !it.free) : [];
  const buyCosmetic = async (it) => {
    if (window.mxHasItem && window.mxHasItem(mx, it.id)) { if (onOpenDress) onOpenDress(); return; }
    if (bal < it.cost) { alert(`還差 ${(it.cost - bal).toLocaleString()} 顆星星才能買「${it.zh}」，繼續加油！⭐`); return; }
    if (!window.confirm(`要用 ${it.cost.toLocaleString()} 顆星星買「${it.zh}」嗎？\n買了馬上就可以換上，之後也能隨時換。`)) return;
    const r = await (window.__mxBuy ? window.__mxBuy(it.id) : Promise.resolve({ ok: false, reason: 'no-user' }));
    if (!r.ok) { alert(r.reason === 'poor' ? `還差 ${(r.short || 0).toLocaleString()} 顆星星` : '沒買成功，等一下再試一次。'); return; }
    if (window.__mxWear && it.kind !== 'dance') window.__mxWear(it.kind, it.id);
    alert(`買到「${it.zh}」了！🎉\n長按吉祥物 → 👕 裝扮室，隨時可以換。`);
  };

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
            {allRows.length === 0 ? (
              <div className="sp-empty">還沒有集點紀錄——上課認真表現、把練習做完就會拿到星星喔！⭐</div>
            ) : (
              <>
                <div className="sp-sum">
                  賺到 {((data.entries || []).filter(e => e.amount > 0).reduce((n, e) => n + e.amount, 0) + auto.total).toLocaleString()}⭐
                  ・花掉 {(spent + (data.entries || []).filter(e => e.amount < 0).reduce((n, e) => n - e.amount, 0)).toLocaleString()}⭐
                  ＝ 現在有 <b>{bal.toLocaleString()}⭐</b>
                </div>
                <div className="sp-list">
                  {/* v361: 老師手動記的 ＋ 完成練習自動給的；v451：再加上買裝扮／改名卡／退費 */}
                  {allRows.map(en => (
                    <div key={en.id} className={'sp-row' + (en.amount < 0 ? ' minus' : '') + (en.auto ? ' auto' : '') + (en.mx ? ' mx' : '')}>
                      <span className="sp-row-date">{en.date || '—'}</span>
                      <span className="sp-row-amt">{en.amount > 0 ? '+' : ''}{en.amount.toLocaleString()}⭐</span>
                      <span className="sp-row-note">{en.auto ? '⚡ ' : ''}{en.note || (en.amount < 0 ? '兌換' : '集點')}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="sp-body">
            <div className="sp-filter">
              {tags.map(t => (
                <button key={t} className={filter === t ? 'on' : ''} onClick={() => setFilter(t)}>{t}</button>
              ))}
            </div>
            {cosmetics.length > 0 && (
              <React.Fragment>
                <div className="sp-shop-head">🧸 吉祥物裝扮 · 買了馬上換上（長按吉祥物可以再換）</div>
                <div className="sp-shop sp-shop-mx">
                  {cosmetics.map(it => {
                    const have = !!(window.mxHasItem && window.mxHasItem(mx, it.id));
                    const ok2  = have || bal >= (it.cost || 0);
                    /* v505（Alan：「圖片要是本人的照片啦」）：夥伴畫牠本人，不要用 emoji 代打 */
                    const PetArt = it.kind === 'pet'
                      ? (((window.MX_PETS || []).find(p => p.id === it.pet) || {}).art || null) : null;
                    return (
                      <div key={it.id} className={'sp-item' + (ok2 ? '' : ' locked')}>
                        <div className="sp-item-img" aria-hidden="true">{PetArt ? <PetArt size={46}/> : it.emoji}</div>
                        <div className="sp-item-name">{it.zh}</div>
                        <div className="sp-item-cost">{have ? '已擁有' : Number(it.cost || 0).toLocaleString() + '⭐'}</div>
                        <button className="sp-item-btn" onClick={() => buyCosmetic(it)}>
                          {have ? '去換上' : ok2 ? '買下來' : `還差 ${((it.cost || 0) - bal).toLocaleString()}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {shown.length > 0 && <div className="sp-shop-head">🎁 跟老師換的禮物</div>}
              </React.Fragment>
            )}
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
/* v594：Footer 本來住在 components-editor.jsx，但它是**學生頁**也會畫的元件——
   editor 改成只有老師才載之後，它必須搬到學生一定會載的這個檔案。 */
/* Footer — v275: 跟行銷頁同一套 .ll-foot2 樣式（styles-auth.css 全站都有載） */
function Footer({ onOpenGuide }) {
  const gmailUrl = "https://mail.google.com/mail/?view=cm&fs=1&to=alan07050445%40gmail.com";
  const lineUrl = "https://line.me/R/ti/p/~9161791608";

  return (
    <footer className="ll-foot2 app-foot2">
      <div className="ll-foot2-top">
        <div className="ll-foot2-brand">
          <b>Alan’s English Class<i>.</i></b>
          <p>對齊康橋國際學校每週進度的英文練習平台——在家練的就是學校在教的。</p>
        </div>
        <div className="ll-foot2-cols">
          <div className="ll-foot2-col">
            <b>學習項目</b>
            <span>單字</span>
            <span>文法</span>
            <span>字根字首</span>
            <span>閱讀寫作</span>
          </div>
          <div className="ll-foot2-col">
            <b>使用說明</b>
            {onOpenGuide && <button onClick={onOpenGuide}>新手教學</button>}
          </div>
        </div>
        <div className="ll-foot2-contact">
          <b>聯絡 Alan 老師</b>
          <a className="ll-foot2-btn" href={gmailUrl} target="_blank" rel="noopener noreferrer" aria-label="使用 Gmail 聯絡 Alan 老師">✉️ Email 聯絡</a>
          <a className="ll-foot2-btn ll-foot2-btn-line" href={lineUrl} target="_blank" rel="noopener noreferrer" aria-label="加 Alan 老師的 LINE 好友">💬 LINE 加好友</a>
        </div>
      </div>
      <div className="ll-foot2-bar">
        <span>© {new Date().getFullYear()} Alan’s English Class</span>
        <span className="ll-foot2-mini">對齊康橋國際學校每週進度 · 用心製作</span>
      </div>
    </footer>
  );
}


/* ───────── v612 🎃 Trick or Treat（倒數歸零之後，點南瓜領 ⭐100~1000）─────────
   ⚠ 獎品不是這裡抽的——是 data.js treatPrize(uid, 活動) 反算的固定數字（重整不會重抽、改雲端的數字也沒用）。
   ⚠ treat === undefined＝雲端還沒回來；這時候不能跳（領過的孩子會先看到一下南瓜又消失）。
   ⚠ 老師預覽：活動還沒開始（10/31 前）老師帳號每次載入都會看到南瓜；**預覽不寫雲端、不給星星**，獎品是隨機抽給你看的。
     不想看：主控台 localStorage.setItem('alan-treat-preview','0')；活動期間也想預覽：設成 '1'。 */
function TrickOrTreat({ user, treat, isTeacher }) {
  const KEY = 'hw2026';
  const preview = (() => { try { const f = localStorage.getItem('alan-treat-preview'); return !!isTeacher && f !== '0' && (f === '1' || !(window.treatOpenAt && window.treatOpenAt(KEY))); } catch (e) { return false; } })();
  const [, setTick] = React.useState(0);
  React.useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);   // 倒數歸零的那一秒要自己冒出來
  const [phase, setPhase] = React.useState('idle');     // idle → shake → reveal
  const [closed, setClosed] = React.useState(false);
  const [mini, setMini] = React.useState(() => { try { return sessionStorage.getItem('alan-treat-mini') === '1'; } catch (e) { return false; } });
  const [err, setErr] = React.useState('');
  const [demo] = React.useState(() => { const t = window.TREAT_TABLE || [[100, 1]]; return t[Math.floor(Math.random() * t.length)][0]; });
  const numRef = React.useRef(null);
  const confetti = React.useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    e: ['⭐', '🎃', '🦇', '✨'][i % 4], l: Math.round(Math.random() * 100), d: (Math.random() * 1.2).toFixed(2), t: (2.4 + Math.random() * 2).toFixed(2),
  })), []);
  const prize = preview ? demo : (window.treatPrize ? window.treatPrize(user && user.uid, KEY) : 0);
  const prizeRef = React.useRef(prize); prizeRef.current = prize;
  const gifts = (window.treatGifts ? window.treatGifts(prize, KEY) : []).map(id => (window.mxItemOf ? window.mxItemOf(id) : null)).filter(Boolean);

  React.useEffect(() => {
    if (phase !== 'reveal') return;
    const el = numRef.current, to = prizeRef.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1800; let raf;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (!window.treatOpenAt || !user || closed) return null;
  const msLeft = window.treatMsToOpen ? window.treatMsToOpen(KEY) : 0;
  const waiting = !preview && msLeft > 0;     // v625：倒數中——南瓜先出來、還不能開
  if (!preview && !waiting && (!window.treatOpenAt(KEY) || treat === undefined)) return null;
  if (waiting && (treat === undefined)) return null;
  const at = Number(treat && treat[KEY]);
  const claimed = at > 1e11 && window.treatOpenAt(KEY, at);
  if (!preview && claimed && phase === 'idle') return null;

  const crack = () => {
    if (phase !== 'idle') return;
    setErr(''); setPhase('shake');
    const wait = new Promise(r => setTimeout(r, 1400));
    const save = preview ? Promise.resolve() : window.claimTreat(user.uid, user.displayName, user.email, KEY);
    Promise.all([save, wait]).then(() => setPhase('reveal'))
      .catch(() => { setPhase('idle'); setErr('網路不太穩，南瓜沒打開，再點一次試試看'); });
  };
  const later = () => { setMini(true); try { sessionStorage.setItem('alan-treat-mini', '1'); } catch (e) {} };
  const reopen = () => { setMini(false); try { sessionStorage.removeItem('alan-treat-mini'); } catch (e) {} };

  const cd = (() => { const t = Math.floor(msLeft / 1000), d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), sc = t % 60;
    const p2 = n => String(n).padStart(2, '0'); return (d > 0 ? d + ' 天 ' : '') + p2(h) + ':' + p2(m) + ':' + p2(sc); })();
  if (waiting && mini) {
    return <button className="tot-fab tot-fab-wait" onClick={reopen} aria-label={'Trick or Treat 倒數 ' + cd}>🎃<span>倒數 {cd}</span></button>;
  }
  if (waiting) {
    return (
      <div className="tot-back tot-idle tot-wait" role="dialog" aria-modal="true" aria-label="Trick or Treat 倒數中">
        <div className="tot-stage">
          <div className="tot-bats" aria-hidden="true"><i>🦇</i><i>🦇</i><i>🦇</i></div>
          <h2 className="tot-title">Trick or Treat!</h2>
          <p className="tot-sub">南瓜裡藏了一份神祕禮物（⭐100 ~ 1000），要等倒數歸零才能打開</p>
          <div className="tot-pumpkin tot-locked" aria-hidden="true"><span className="tot-glow"/><b>🎃</b></div>
          <div className="tot-count" aria-live="off"><small>離開啟還有</small><b>{cd}</b></div>
          <p className="tot-sub">10/31 一到，回來點南瓜！</p>
          <button className="tot-later" onClick={later}>好，我等</button>
        </div>
      </div>
    );
  }
  if (mini && phase === 'idle') {
    return <button className="tot-fab" onClick={reopen} aria-label="Trick or Treat！點我領南瓜獎勵">🎃<span>Trick or Treat</span></button>;
  }
  return (
    <div className={'tot-back tot-' + phase} role="dialog" aria-modal="true" aria-label="Trick or Treat">
      <div className="tot-stage">
        {phase === 'reveal' && <div className="tot-rain" aria-hidden="true">
          {confetti.map((c, i) => <i key={i} style={{ left: c.l + '%', animationDelay: c.d + 's', animationDuration: c.t + 's' }}>{c.e}</i>)}
        </div>}
        {phase !== 'reveal' ? (
          <>
            <div className="tot-bats" aria-hidden="true"><i>🦇</i><i>🦇</i><i>🦇</i></div>
            <h2 className="tot-title">Trick or Treat!</h2>
            <p className="tot-sub">萬聖節快樂！南瓜裡藏了一份禮物，點一下打開它</p>
            <button className="tot-pumpkin" onClick={crack} disabled={phase !== 'idle'} aria-label="打開南瓜">
              <span className="tot-glow" aria-hidden="true"/>
              <b>🎃</b>
            </button>
            {err && <p className="tot-err">{err}</p>}
            {phase === 'idle' && <button className="tot-later" onClick={later}>等一下再開</button>}
          </>
        ) : (
          <div className="tot-win">
            <div className="tot-burst" aria-hidden="true">🎃</div>
            <p className="tot-got">你得到了</p>
            <div className="tot-num"><span ref={numRef}>0</span><em>⭐</em></div>
            <p className="tot-sub">{prize >= 400 ? '哇！超級大獎！' : prize >= 250 ? '好棒！手氣很好喔！' : '星星已經放進你的口袋了！'}</p>
            {gifts.length > 0 && (
              <div className="tot-gift">
                <span className="tot-gift-h">🎁 還有限定整身造型！</span>
                {gifts.map(g => <span key={g.id} className="tot-gift-i"><b>{g.emoji}</b>{g.zh}</span>)}
                <span className="tot-gift-s">已放進裝扮室（長按吉祥物 → 👕 → 造型），穿上整身造型就會變裝！只有現在拿得到，過了 11/2 就絕版囉</span>
              </div>
            )}
            {preview && <p className="tot-err">（預覽：這不會寫入、也不會給星星）</p>}
            <button className="tot-ok" onClick={() => setClosed(true)}>收下 🎉</button>
          </div>
        )}
      </div>
    </div>
  );
}


/* ───────── v618 🗺️ 期中考總複習地圖（學生端）─────────
   資料與進度邏輯在 data.js（reviewProgress）；這裡只負責畫：
   · ReviewPathCard：大廳裡一張入口卡（進度條＋下一關是什麼）
   · ReviewPathMap：整頁地圖——最上面是「考試資訊卡」，下面一關一關往下走，最後是終點。
   ⚠ 不鎖順序（Alan：每一關都做過就算）；只是用「📍 下一關」提示該從哪裡開始。 */
function ReviewPathCard({ rp, isTeacher, onOpen, onEdit }) {
  if (!rp) return isTeacher ? (
    <div className="rp-card rp-card-empty">
      <div className="rp-card-ico">🗺️</div>
      <div className="rp-card-body"><b>期中考總複習地圖</b><span>還沒建立——做一張「Word Study → Vocabulary → Reading」的闖關地圖給學生</span></div>
      <button className="rp-btn" onClick={onEdit}>建立地圖</button>
    </div>
  ) : null;
  if (!rp.published && !isTeacher) return null;
  const pct = rp.total ? Math.round(rp.done / rp.total * 100) : 0;
  const nxt = rp.next >= 0 ? rp.steps[rp.next] : null;
  const days = window.reviewDaysLeft ? window.reviewDaysLeft(rp.info.date) : null;
  return (
    <div className={'rp-card' + (rp.complete ? ' rp-card-done' : '')}>
      <div className="rp-card-ico">{rp.complete ? '🏆' : '🗺️'}</div>
      <div className="rp-card-body">
        <b>{rp.title}{!rp.published && <em className="rp-draft">未公開</em>}</b>
        <span>
          {rp.complete ? '全部完成了！你已經準備好了 🎉'
            : nxt ? `下一關：${nxt.name}（已完成 ${rp.stepsDone}/${rp.steps.length} 關）` : '老師還在放題目'}
          {days != null && days >= 0 && !rp.complete && <> · 距離考試 {days === 0 ? '就是今天' : days + ' 天'}</>}
        </span>
        <div className="rp-bar" aria-hidden="true"><i style={{ width: pct + '%' }}/></div>
      </div>
      <div className="rp-card-actions">
        <button className="rp-btn" onClick={onOpen}>{rp.complete ? '看地圖' : '開始闖關'}</button>
        {isTeacher && <button className="rp-btn rp-btn-ghost" onClick={onEdit}>編輯</button>}
      </div>
    </div>
  );
}

function ReviewPathMap({ rp, isTeacher, just, onClose, onOpenItem, onEdit }) {
  const justStep = just ? rp.steps.findIndex(st => st.items.some(it => (it.w + '|' + it.c + '|' + it.i) === just)) : -1;
  const [open, setOpen] = React.useState(() => ({ [justStep >= 0 ? justStep : rp.next >= 0 ? rp.next : 0]: true }));
  React.useEffect(() => {
    const el = document.querySelector('.rp-pop-item') || document.querySelector('.rp-now');
    if (el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
  }, []);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  const kinds = window.REVIEW_KINDS || {};
  const info = rp.info || {};
  const days = window.reviewDaysLeft ? window.reviewDaysLeft(info.date) : null;
  const rows = [
    ['📅', '考試日期', info.date ? (info.date.replace(/-/g, '/') + (days == null ? '' : days > 0 ? `（還有 ${days} 天）` : days === 0 ? '（就是今天！）' : '（已經考完了）')) : ''],
    ['📌', '考試範圍', info.scope], ['📝', '題型與配分', info.format], ['🧭', '考試當天會發生的事', info.flow], ['💡', '小提醒', info.tips],
  ].filter(r => r[2]);
  const pct = rp.total ? Math.round(rp.done / rp.total * 100) : 0;
  return ReactDOM.createPortal(
    <div className="rp-back" role="dialog" aria-modal="true" aria-label={rp.title} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rp-sheet">
        <div className="rp-top">
          <button className="rp-x" onClick={onClose} aria-label="關閉">✕</button>
          <h2>🗺️ {rp.title}</h2>
          <p>照著地圖一關一關走，全部完成就準備好了！</p>
          <div className="rp-prog"><div className="rp-bar"><i style={{ width: pct + '%' }}/></div><span>{rp.stepsDone} / {rp.steps.length} 關</span></div>
          {isTeacher && <button className="rp-btn rp-btn-ghost rp-edit" onClick={onEdit}>編輯地圖</button>}
        </div>
        {rows.length > 0 && (
          <div className="rp-info">
            <h3>📋 考試資訊</h3>
            {rows.map(([ico, h, t]) => (
              <div className="rp-info-row" key={h}><span className="rp-info-h">{ico} {h}</span><span className="rp-info-t">{t}</span></div>
            ))}
          </div>
        )}
        <ol className="rp-path">
          {rp.steps.map((st, k) => {
            const state = st.complete ? 'done' : k === rp.next ? 'now' : 'todo';
            const isOpen = !!open[k];
            const kd = kinds[st.kind] || { ico: '⭐' };
            return (
              <li key={st.id} className={'rp-step rp-' + state + ' rp-k-' + st.kind + (k === justStep ? ' rp-just' : '')}>
                <div className="rp-node" aria-hidden="true">{st.complete ? '✓' : kd.ico}{k === justStep && <i className="rp-burst"><u/><u/><u/><u/><u/><u/></i>}</div>
                <div className="rp-body">
                  <span className="rp-num">第 {k + 1} 關 · {kd.zh}</span>
                  <button className="rp-head" aria-expanded={isOpen} onClick={() => setOpen(o => Object.assign({}, o, { [k]: !o[k] }))}>
                    <b>{st.name}</b>
                    <span className="rp-count">{st.total ? `${st.done}/${st.total}` : '準備中'}</span>
                    {state === 'now' && <span className="rp-here">📍 下一關</span>}
                  </button>
                  {st.focus && <p className="rp-focus">🎯 {st.focus}</p>}
                  {isOpen && (
                    <ul className="rp-items">
                      {st.items.length === 0 && <li className="rp-none">老師還在準備這一關的題目</li>}
                      {st.items.map(it => (
                        <li key={it.w + it.c + it.i}>
                          <button className={'rp-item' + (it.done ? ' on' : '') + (just === (it.w + '|' + it.c + '|' + it.i) ? ' rp-pop-item' : '')} disabled={!it.exists} onClick={() => onOpenItem(it, st)}>
                            <span className="rp-chk" aria-hidden="true">{it.done ? '✓' : ''}</span>
                            <span className="rp-it-t">{it.title}</span>
                            <span className="rp-go">{!it.exists ? '還沒開放' : it.done ? '再練一次' : '去做 →'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
          <li className={'rp-step rp-end' + (rp.complete ? ' rp-done' : '')}>
            <div className="rp-node" aria-hidden="true">{rp.complete ? '🏆' : '🏁'}</div>
            <div className="rp-body">
              <div className="rp-head rp-head-end"><b>{rp.complete ? '期中考總複習完成！' : '終點：期中考總複習完成'}</b></div>
              <p className="rp-focus">{rp.complete ? '每一關都走完了，帶著自信去考試吧 💪' : '把上面每一關的題目都做過，就會在這裡拿到徽章'}</p>
            </div>
          </li>
        </ol>
      </div>
    </div>, document.body);
}

Object.assign(window, { ReviewPathCard, ReviewPathMap, Boom, Footer, TrickOrTreat, findUnitsIn, FullscreenBtn, FocusBtn, Icon, Header, Hero, LoginScreen, LockScreen, EditableText, GradeSelector, StarBurst, MobileNav, LoadingScreen, WelcomeGuide, SpotlightTour, spawnPageWave, StarsPanel, CheckinPanel, SHOP_ITEMS });
