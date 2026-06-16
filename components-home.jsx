// components-home.jsx — 學習旅程首頁（學習者為中心，取代「內容目錄」感）
// LearnHero：問候 + 等級環 + 連勝 + 今日進度
// WeekJourney：水平週次旅程，一眼看出走到哪、下一步是什麼

const { useMemo: useHomeM } = React;

/* 計算單一週的完成度（沿用 quiz-mode 的進度邏輯，確保和分類卡一致） */
function _weekProgress(week, weekId, categories, qmProg) {
  let done = 0, total = 0;
  (categories || []).forEach(c => {
    const items = window.getQuizItems((week.items || {})[c.id] || []);
    items.forEach(it => {
      const t = window.getQuizItemTotal(it);
      total += t;
      const p = qmProg[`${weekId}_${it.id}`];
      done += p ? Math.min(p.done || 0, t) : 0;
    });
  });
  return { done, total, pct: total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0 };
}

/* ── 圓形進度環（SVG） ── */
function ProgressRing({ pct, size = 64, stroke = 6, color = 'var(--accent)', children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="lh-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="lh-ring-svg">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={stroke}/>
        <circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="lh-ring-center">{children}</div>
    </div>
  );
}

/* ── 學習者英雄區（含學習夥伴 + 每日目標環） ── */
function LearnHero({ user, xp, streak, coins, daily, companion, equipped, weekProg, weekLabel, nextLabel, onContinue, onShowBadges, onShowMistakes, onShowShop, mistakesCount }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安';
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || '同學';
  const lvl = window.getLevel ? window.getLevel(xp || 0) : { level: 1, name: '新苗', icon: '🌱' };
  const streakN = streak?.count || 0;

  const d = daily || { done: 0, goal: 3 };
  const dailyPct = d.goal > 0 ? Math.round(d.done / d.goal * 100) : 0;
  const reached = d.done >= d.goal;
  const remaining = Math.max(0, d.goal - d.done);
  const petName = companion?.name || '夥伴';
  const petType = companion?.type || 'owl';
  const canContinue = !!nextLabel;
  const speech = reached
    ? `今天達標了！${petName}好開心 🎉`
    : d.done > 0
      ? `再 ${remaining} 個練習就達標囉！`
      : `${greet}！一起完成今天的目標吧 💪`;

  return (
    <div className="lh-hero">
      <div className="lh-hero-main">
        {/* Student companion + daily goal ring */}
        <button className="lh-pet-wrap" onClick={onShowBadges} title={`${petName} · Lv.${lvl.level} ${lvl.name}`}>
          <ProgressRing pct={reached ? 100 : dailyPct} size={132} stroke={8} color={reached ? 'var(--moss)' : 'var(--accent)'}>
            <window.CompanionAvatar type={petType} size={92} mood={reached ? 'celebrate' : 'idle'} accessory={equipped}/>
          </ProgressRing>
          <span className="lh-pet-daily">{reached ? '✓ 今日達標' : `今日 ${d.done}/${d.goal}`}</span>
        </button>

        <div className="lh-hero-text">
          <div className="lh-speech">{speech}</div>
          <div className="lh-greet-hi">{greet}，{firstName} 👋</div>
          <div className="lh-pet-name">{petName} · Lv.{lvl.level} {lvl.name}</div>
          <button className="lh-continue" onClick={onContinue} disabled={!canContinue}>
            <span className="lh-continue-label">{canContinue ? '繼續學習' : '本週準備中'}</span>
            <span className="lh-continue-week">{canContinue ? `下一步 · ${nextLabel}` : '老師很快就會放上練習'}</span>
          </button>
        </div>
      </div>

      <div className="lh-stats">
        <div className="lh-stat">
          <div className="lh-stat-big lh-streak">🔥 {streakN}</div>
          <span className="lh-stat-label">天連勝</span>
        </div>
        <div className="lh-stat">
          <div className="lh-stat-big">⚡ {xp || 0}</div>
          <span className="lh-stat-label">XP</span>
        </div>
        <button className="lh-stat lh-stat-btn" onClick={onShowShop} title="造型商店">
          <div className="lh-stat-big lh-coins">🪙 {coins || 0}</div>
          <span className="lh-stat-label">商店 🎁</span>
        </button>
        {onShowMistakes && (
          <button className="lh-stat lh-stat-btn" onClick={onShowMistakes} title="我的錯題">
            <div className="lh-stat-big">📕 {mistakesCount || 0}</div>
            <span className="lh-stat-label">錯題複習</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ── 週次旅程（水平 stepper） ── */
function WeekJourney({ weeks, weekOrder, weekIdx, categories, onSelectWeek }) {
  const qmProg = useHomeM(() => (window.loadQMProg ? window.loadQMProg() : {}), [weekIdx]);

  const nodes = useHomeM(() => weekOrder.map((wid, i) => {
    const w = weeks[wid];
    const prog = w ? _weekProgress(w, wid, categories, qmProg) : { pct: 0, total: 0 };
    return { wid, i, label: w?.label || wid, theme: w?.theme || w?.themeZh || '', pct: prog.pct, hasContent: prog.total > 0 };
  }), [weeks, weekOrder, categories, qmProg]);

  const scrollerRef = React.useRef(null);
  React.useEffect(() => {
    // Keep the current week centered horizontally without moving the whole page.
    const el = scrollerRef.current?.querySelector('.wj-node.current');
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    const left = el.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [weekIdx]);

  return (
    <div className="wj-wrap">
      <div className="wj-head">
        <span className="wj-title">學習旅程</span>
        <span className="wj-sub">Week {weekIdx + 1} / {weekOrder.length}</span>
      </div>
      <div className="wj-scroller" ref={scrollerRef}>
        <div className="wj-track">
          {nodes.map((n, i) => {
            const isCurrent = n.i === weekIdx;
            const isDone = n.pct >= 100 && n.hasContent;
            const state = isCurrent ? 'current' : isDone ? 'done' : n.pct > 0 ? 'progress' : 'todo';
            return (
              <button
                key={n.wid}
                className={`wj-node ${state}`}
                onClick={() => onSelectWeek(n.i)}
                title={n.label}
              >
                <ProgressRing
                  pct={isDone ? 100 : n.pct}
                  size={isCurrent ? 66 : 54}
                  color={isCurrent ? 'var(--accent)' : isDone ? 'var(--moss)' : 'var(--c-vocab,#6D5BD0)'}
                >
                  <span className="wj-node-icon">
                    {isDone ? '✓' : isCurrent ? '📍' : (i + 1)}
                  </span>
                </ProgressRing>
                <span className="wj-node-label">{n.label}</span>
                {n.theme && <span className="wj-node-theme">{n.theme}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LearnHero, WeekJourney });
