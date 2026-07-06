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
    <div className="lh-hero lh-hero-slim">
      <div className="lh-hero-main">
        {/* Student companion + daily goal ring (compact) */}
        <button className="lh-pet-wrap" onClick={onShowBadges} title={`${petName} · Lv.${lvl.level} ${lvl.name}`}>
          <ProgressRing pct={reached ? 100 : dailyPct} size={88} stroke={6} color={reached ? 'var(--moss)' : 'var(--accent)'}>
            <window.CompanionAvatar type={petType} size={60} mood={reached ? 'celebrate' : 'idle'} accessory={equipped}/>
          </ProgressRing>
          <span className="lh-pet-daily">{reached ? '✓ 達標' : `今日 ${d.done}/${d.goal}`}</span>
        </button>

        <div className="lh-hero-text">
          <div className="lh-greet-hi">{greet}，{firstName} 👋</div>
          <div className="lh-pet-name">{petName} · Lv.{lvl.level} {lvl.name} · 🔥{streakN} · ⚡{xp || 0}</div>
        </div>

        <button className="lh-continue" onClick={onContinue} disabled={!canContinue}>
          <span className="lh-continue-label">{canContinue ? '繼續' : '準備中'}</span>
          <span className="lh-continue-week">{canContinue ? nextLabel : '老師很快放上'}</span>
        </button>
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

/* ── 冒險地圖（全螢幕遊戲地圖，週=據點）──────────────── */
function AdventureMap({ weeks, weekOrder, weekIdx, categories, companion, equipped, onSelectWeek, onOpenBoss, onClose }) {
  const qmProg = useHomeM(() => (window.loadQMProg ? window.loadQMProg() : {}), [weekIdx]);
  const nodes = useHomeM(() => weekOrder.map((wid, i) => {
    const w = weeks[wid];
    const prog = w ? _weekProgress(w, wid, categories, qmProg) : { pct: 0, total: 0 };
    return { wid, i, label: w?.label || wid, theme: w?.theme || w?.themeZh || '', pct: prog.pct, hasContent: prog.total > 0 };
  }), [weeks, weekOrder, categories, qmProg]);

  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    const el = scrollRef.current?.querySelector('.am-node-wrap.current');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  const petType = companion?.type || 'owl';

  // 計算每個關卡的座標，畫一條滿版、會亮起來的 RPG 主線路徑。
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 900;
  const W = Math.min(980, Math.max(360, viewportW - 32));
  const STEP = viewportW < 560 ? 150 : 170;
  const AMP = W * (viewportW < 560 ? 0.24 : 0.32);
  const CENTER = W / 2;
  const PAD = viewportW < 560 ? 96 : 120;
  const H = Math.max(680, nodes.length * STEP + PAD + 120);
  const pts = nodes.map((n, idx) => ({ x: CENTER + Math.sin(idx * 0.9) * AMP, y: PAD + idx * STEP }));
  const trailD = pts.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)).join(' ');
  const litPts = pts.slice(0, Math.min(weekIdx + 2, pts.length));
  const litD = litPts.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)).join(' ');

  return (
    <div className="am-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="am-panel">
        <div className="am-top">
          <div>
            <div className="am-title">冒險地圖</div>
            <div className="am-subtitle">亮起來的路，就是你目前的冒險進度</div>
          </div>
          <button className="am-close" onClick={onClose} aria-label="關閉"><window.Icon name="close" size={16}/></button>
        </div>
        <div className="am-scroll" ref={scrollRef}>
          <div className="am-path" style={{ position: 'relative', width: W + 'px', height: H + 'px', margin: '0 auto' }}>
            <svg className="am-trail" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
              <path className="am-trail-base" d={trailD} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              {litD && <path className="am-trail-lit" d={litD} fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
              {litD && <path className="am-trail-sparks" d={litD} fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
            </svg>
            {nodes.map((n, idx) => {
              const p = pts[idx];
              const isCurrent = n.i === weekIdx;
              const isPast = n.i < weekIdx;
              const isDone = isPast || (n.pct >= 100 && n.hasContent);
              const state = isCurrent ? 'current' : isDone ? 'done' : n.pct > 0 ? 'progress' : 'todo';
              return (
                <div
                  key={n.wid}
                  className={`am-node-wrap${isCurrent ? ' current' : ''}`}
                  style={{ left: p.x + 'px', top: p.y + 'px', animationDelay: `${idx * 55}ms` }}
                >
                  {isCurrent && <span className="am-here">目前位置</span>}
                  <button className={`am-node ${state}`} onClick={() => { onSelectWeek(n.i); onClose(); }} title={n.label}>
                    {isCurrent ? (
                      <window.CompanionAvatar type={petType} size={48} mood="happy" accessory={equipped}/>
                    ) : (
                      <span className="am-node-num">{isDone ? '✓' : (idx + 1)}</span>
                    )}
                  </button>
                  <span className="am-node-label">{n.label}</span>
                  {n.theme && <span className="am-node-theme">{n.theme}</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="am-boss-dock">
          <button
            className="am-boss-btn"
            onClick={() => { onClose(); if (onOpenBoss) onOpenBoss(); }}
          >
            <img src="boss-monster.png" alt="" className="am-boss-img"/>
            <span className="am-boss-text">
              <span className="am-boss-title">地圖 Boss</span>
              <span className="am-boss-sub">打倒魔王 · 贏金幣</span>
            </span>
            <span className="am-boss-arrow">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TutorialOverlay({ companion, onDone }) {
  const [step, setStep] = React.useState(0);
  const petType = companion?.type || 'owl';
  const petName = companion?.name || '貓頭鷹夥伴';
  const steps = [
    {
      key: 'cards',
      title: '先選一個冒險入口',
      body: '這四張卡就是四種關卡。想練單字、文法、字根或閱讀，直接點卡片進去。',
    },
    {
      key: 'map',
      title: '用地圖切換週次',
      body: '點右上角小地圖，就能看到你走到哪一週，也能從地圖挑戰 Boss。',
    },
    {
      key: 'avatar',
      title: '角色資料都在這裡',
      body: '右下角頭像可以打開造型、商店、錯題本和成就。',
    },
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;
  return (
    <div className={`tutorial-overlay tutorial-guide step-${current.key}`}>
      <button className="tutorial-skip" onClick={onDone}>跳過</button>
      <div className={`tutorial-spotlight ${current.key}`}/>
      <div className={`tutorial-arrow ${current.key}`}>
        <span>{step + 1}</span>
      </div>
      <div className="tutorial-panel">
        <div className="tutorial-buddy">
          <window.CompanionAvatar type={petType} size={104} mood="happy"/>
        </div>
        <div className="tutorial-bubble">
          <div className="tutorial-name">{petName}</div>
          <h2 className="tutorial-title">{current.title}</h2>
          <p className="tutorial-copy">{current.body}</p>
          <div className="tutorial-dots">
            {steps.map((s, i) => <span key={s.key} className={i === step ? 'on' : ''}/>)}
          </div>
          <div className="tutorial-actions">
            {step > 0 && <button className="tutorial-back" onClick={() => setStep(s => s - 1)}>上一步</button>}
            <button className="tutorial-start" onClick={() => isLast ? onDone() : setStep(s => s + 1)}>
              {isLast ? '開始冒險' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({ user, companion, wardrobe, coins, xp, streak, badges, mistakesCount, onClose, onOpenShop, onOpenMistakes, onOpenBadges }) {
  const petType = companion?.type || 'owl';
  const petName = companion?.name || '貓頭鷹夥伴';
  const lvl = window.getLevel ? window.getLevel(xp || 0) : { level: 1, name: '新苗' };
  const badgeCount = Object.keys(badges || {}).length;
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || '冒險者';

  return (
    <div className="profile-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="profile-panel">
        <div className="profile-head">
          <div className="profile-title">我的角色</div>
          <button className="profile-close" onClick={onClose} aria-label="關閉"><window.Icon name="close" size={16}/></button>
        </div>

        <div className="profile-hero">
          <window.CompanionAvatar type={petType} size={118} mood="happy" accessory={wardrobe?.equipped}/>
          <div className="profile-info">
            <div className="profile-name">{firstName}</div>
            <div className="profile-pet">{petName} · Lv.{lvl.level} {lvl.name}</div>
            <div className="profile-stats">
              <span>🪙 {coins || 0}</span>
              <span>⚡ {xp || 0}</span>
              <span>🔥 {streak?.count || 0}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button onClick={() => { onClose(); onOpenShop(); }}>
            <span className="profile-action-ic">🎩</span>
            <span><strong>造型 / 商店</strong><small>換裝、花金幣</small></span>
          </button>
          <button onClick={() => { onClose(); onOpenMistakes && onOpenMistakes(); }} disabled={!onOpenMistakes}>
            <span className="profile-action-ic">📕</span>
            <span><strong>錯題本</strong><small>{onOpenMistakes ? `${mistakesCount || 0} 題需要複習` : '登入後可使用'}</small></span>
          </button>
          <button onClick={() => { onClose(); onOpenBadges(); }}>
            <span className="profile-action-ic">🏆</span>
            <span><strong>成就</strong><small>已解鎖 {badgeCount} 個徽章</small></span>
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LearnHero, WeekJourney, AdventureMap, TutorialOverlay, ProfilePanel });
