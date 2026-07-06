// components-boss.jsx — ⚔️ 大魔王挑戰（個人小遊戲，重用總複習出題引擎）
// 答對攻擊魔王、答錯被咬。限血量打倒魔王 → 金幣獎勵。

const { useState: useBoss, useEffect: useBossE } = React;

/* ── 可愛字怪 SVG ── */
function BossMonster({ mood = 'idle', size = 130 }) {
  const hurt = mood === 'hurt';
  const dead = mood === 'defeated';
  const body = dead ? '#9A93A8' : '#6D5BD0';
  const belly = dead ? '#CFC9DA' : '#8E7EE0';
  return (
    <span className={`boss-mon boss-mon-${mood}`} style={{ width: size, height: size, display: 'inline-block' }}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        {/* horns */}
        <path d="M30 30 L24 10 L40 26 Z" fill="#4A3C89"/>
        <path d="M90 30 L96 10 L80 26 Z" fill="#4A3C89"/>
        {/* body */}
        <ellipse cx="60" cy="64" rx="42" ry="40" fill={body}/>
        <ellipse cx="60" cy="74" rx="26" ry="24" fill={belly}/>
        {/* arms */}
        <ellipse cx="16" cy="66" rx="9" ry="15" fill={body}/>
        <ellipse cx="104" cy="66" rx="9" ry="15" fill={body}/>
        {/* eyes */}
        {dead ? (
          <g stroke="#3A2E6E" strokeWidth="4" strokeLinecap="round">
            <path d="M40 48 l12 12 M52 48 l-12 12"/>
            <path d="M68 48 l12 12 M80 48 l-12 12"/>
          </g>
        ) : hurt ? (
          <g stroke="#3A2E6E" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M40 54 Q46 48 52 54"/><path d="M68 54 Q74 48 80 54"/>
          </g>
        ) : (
          <g>
            <circle cx="46" cy="52" r="11" fill="#FBF8F1"/>
            <circle cx="74" cy="52" r="11" fill="#FBF8F1"/>
            <circle cx="46" cy="54" r="5.5" fill="#15130E"/>
            <circle cx="74" cy="54" r="5.5" fill="#15130E"/>
            <circle cx="48" cy="51" r="2" fill="#fff"/>
            <circle cx="76" cy="51" r="2" fill="#fff"/>
          </g>
        )}
        {/* mouth + fangs */}
        {dead ? (
          <path d="M50 80 Q60 74 70 80" stroke="#3A2E6E" strokeWidth="3" fill="none" strokeLinecap="round"/>
        ) : (
          <g>
            <path d="M48 72 Q60 86 72 72 Z" fill="#3A2E6E"/>
            <path d="M52 73 L55 80 L58 73 Z" fill="#fff"/>
            <path d="M62 73 L65 80 L68 73 Z" fill="#fff"/>
          </g>
        )}
      </svg>
    </span>
  );
}

function _bossPool(weeks, weekOrder) {
  const len = weekOrder.length;
  const startIdx = Math.max(0, len - 6);
  const cats = (window.CATEGORIES || []).map(c => c.id).filter(id => ['vocab', 'grammar', 'word'].includes(id));
  let pool = window.buildReviewQuestions(weeks, weekOrder, {
    startIdx, endIdx: len - 1, cats: cats.length ? cats : ['vocab'], count: 'all', includeListening: false,
  });
  return pool.slice(0, 10);
}

function BossModal({ weeks, weekOrder, user, onClose, onReward }) {
  const [questions] = useBoss(() => _bossPool(weeks, weekOrder));
  const [phase, setPhase]   = useBoss('intro'); // intro | fight | win | lose
  const [idx, setIdx]       = useBoss(0);
  const [hp, setHp]         = useBoss(questions.length);
  const [hearts, setHearts] = useBoss(3);
  const [selected, setSelected] = useBoss(null);
  const [mood, setMood]     = useBoss('idle');
  const [react, setReact]   = useBoss(null); // 夥伴反應 {kind, line}
  const savedRef = React.useRef(false);

  const maxHp = questions.length;
  const q = questions[idx];
  const petType = (window.loadCompanion && window.loadCompanion()?.type) || 'owl';

  useBossE(() => {
    if (phase === 'win' && !savedRef.current) {
      savedRef.current = true;
      const reward = 30 + hearts * 10;
      window.addCoins(reward);
      if (window.playSound) window.playSound('complete');
      if (window.triggerStarBurst) window.triggerStarBurst();
      if (onReward) onReward(reward);
    }
    if (phase === 'lose' && window.playSound) window.playSound('wrong');
  }, [phase]);

  if (questions.length < 4) {
    return (
      <div className="boss-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="boss-panel boss-center">
          <div className="boss-intro-art boss-art-sm">
            <img src="owl-sleeping.png" alt="" className="boss-intro-img"/>
          </div>
          <h3 className="boss-title">魔王還在睡覺…</h3>
          <p className="boss-sub">這幾週的題目還不夠多，先去完成一些練習，再回來挑戰大魔王！</p>
          <button className="boss-btn" onClick={onClose}>知道了</button>
        </div>
      </div>
    );
  }

  const answer = (oi) => {
    if (selected !== null) return;
    setSelected(oi);
    const correct = oi === q.correct;
    if (correct) {
      window.playSound && window.playSound('correct');
      const nhp = hp - 1;
      setHp(nhp);
      setMood('hurt');
      setReact({ kind: 'correct', line: window.pickLine ? window.pickLine('correct') : '答對了！' });
      setTimeout(() => {
        if (nhp <= 0) { setPhase('win'); return; }
        setMood('idle'); setSelected(null); setReact(null); setIdx(i => (i + 1) % questions.length);
      }, 800);
    } else {
      window.playSound && window.playSound('wrong');
      const nh = hearts - 1;
      setHearts(nh);
      setMood('idle');
      setReact({ kind: 'wrong', line: window.pickLine ? window.pickLine('wrong') : '再試一次！' });
      setTimeout(() => {
        if (nh <= 0) { setPhase('lose'); return; }
        setSelected(null); setReact(null); setIdx(i => (i + 1) % questions.length);
      }, 1200);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="boss-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="boss-panel boss-center">
          <div className="boss-intro-tag">⚔️ 大魔王挑戰</div>
          <div className="boss-intro-art">
            <img src="boss-monster.png" alt="單字大魔王" className="boss-intro-img"/>
          </div>
          <h3 className="boss-title">單字大魔王出現了！</h3>
          <p className="boss-sub">答對 {maxHp} 題打倒牠，你有 ❤️❤️❤️ 三條命。準備好了嗎？</p>
          <button className="boss-btn boss-btn-go" onClick={() => setPhase('fight')}>開始戰鬥 →</button>
          <button className="boss-link" onClick={onClose}>下次再來</button>
        </div>
      </div>
    );
  }

  if (phase === 'win' || phase === 'lose') {
    const win = phase === 'win';
    return (
      <div className="boss-overlay">
        <div className="boss-panel boss-center">
          <div className="boss-intro-art">
            <img src={win ? 'owl-celebrate.png' : 'owl-sleeping.png'} alt="" className="boss-intro-img"/>
          </div>
          <h3 className="boss-title">{win ? '🎉 打倒大魔王了！' : '💥 魔王太強了…'}</h3>
          <p className="boss-sub">
            {win ? `太厲害了！獲得 ${30 + hearts * 10} 金幣 🪙` : '再多練習幾題，下次一定打得贏！'}
          </p>
          <button className="boss-btn" onClick={onClose}>{win ? '收下獎勵' : '再接再厲'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="boss-overlay">
      <div className="boss-panel">
        <div className="boss-fight-head">
          <button className="icon-btn" onClick={onClose}><window.Icon name="close" size={16}/></button>
          <div className="boss-hearts">{[0,1,2].map(i => <span key={i} className={i < hearts ? 'on' : 'off'}>{i < hearts ? '❤️' : '🖤'}</span>)}</div>
        </div>

        <div className="boss-stage">
          <BossMonster mood={mood} size={120}/>
          <div className="boss-buddy">
            {react && <div className={`boss-buddy-bubble ${react.kind}`}>{react.line}</div>}
            <window.CompanionAvatar type={petType} size={58} mood={react?.kind === 'correct' ? 'celebrate' : 'idle'}/>
          </div>
          <div className="boss-hpbar">
            <div className="boss-hpbar-fill" style={{ width: `${Math.round((hp / maxHp) * 100)}%` }}/>
          </div>
          <div className="boss-hp-label">魔王血量 {hp}/{maxHp}</div>
        </div>

        <div className="boss-q">{q.q}</div>
        <div className="boss-options">
          {q.options.map((opt, i) => {
            let cls = 'qm-option boss-option';
            if (selected !== null) {
              if (i === q.correct) cls += ' correct';
              else if (i === selected) cls += ' wrong';
              else cls += ' dim';
            }
            return (
              <button key={i} className={cls} onClick={() => answer(i)} disabled={selected !== null}>
                <span className="qm-opt-letter">{['A','B','C','D'][i] || '·'}</span>
                <span className="qm-opt-text">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BossModal, BossMonster });
