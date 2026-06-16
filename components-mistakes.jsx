// components-mistakes.jsx — 學生錯題本 + 重練模式

const { useState: useMK, useMemo: useMKM, useEffect: useMKE } = React;

function _mkShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Single wrong-question row (answer hidden until tap) ── */
function MistakeItem({ q }) {
  const [revealed, setRevealed] = useMK(false);
  return (
    <div className="mk-item">
      <div className="mk-item-q">{q.q}</div>
      {q.cat && <span className="mk-item-cat">{q.cat}</span>}
      <button
        className={`mk-item-answer${revealed ? ' revealed' : ''}`}
        onClick={() => setRevealed(r => !r)}
      >
        {revealed ? `→ ${q.answer}` : '點擊查看答案'}
      </button>
    </div>
  );
}

/* ── Drill mode ─────────────────────────────────────────── */
function MistakesDrill({ questions, user, onClose, onAllCleared }) {
  // Snapshot questions at mount — prevents live Firestore updates from
  // changing the question list mid-drill.
  const [mcQuestions] = useMK(() => {
    const allAnswers = questions.map(q => q.answer);
    return _mkShuffle(questions.map(q => {
      const pool = _mkShuffle(allAnswers.filter(a => a !== q.answer));
      const distractors = pool.slice(0, 3);
      while (distractors.length < 3) distractors.push(distractors[0] || '—');
      const options = _mkShuffle([q.answer, ...distractors]);
      return { ...q, options, correct: options.indexOf(q.answer) };
    }));
  });

  const [idx, setIdx]         = useMK(0);
  const [selected, setSelected] = useMK(null);
  const [cleared, setCleared]   = useMK(0);
  const [xpEarned, setXpEarned] = useMK(0);
  const [done, setDone]         = useMK(false);

  const current = mcQuestions[idx];

  const handleSelect = async (optIdx) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const correct = optIdx === current.correct;
    window.playSound(correct ? 'correct' : 'wrong');
    if (correct) {
      setCleared(c => c + 1);
      if (user?.uid) {
        window.removeWrongQuestion(user.uid, current.itemId, current.q, current.answer);
        window.addXp(user.uid, 5);
        setXpEarned(x => x + 5);
      }
    }
  };

  const handleNext = () => {
    if (idx < mcQuestions.length - 1) {
      setIdx(i => i + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  };

  useMKE(() => {
    if (done && cleared === mcQuestions.length && user?.uid) {
      window.unlockBadge(user.uid, 'mistake_master');
      window.playSound('complete');
    }
  }, [done]);

  if (done) {
    const allCleared = cleared === mcQuestions.length;
    return (
      <div className="mk-overlay">
        <div className="mk-panel mk-panel-center">
          <div className="mk-complete-icon">{allCleared ? '🎯' : '💪'}</div>
          <h3 className="mk-complete-title">
            {allCleared ? '全部答對！錯題本已清空！' : '重練完成！'}
          </h3>
          <p className="mk-complete-stat">答對 {cleared} / {mcQuestions.length} 題</p>
          {xpEarned > 0 && <p className="mk-complete-xp">+{xpEarned} XP 獲得！</p>}
          {allCleared && (
            <p className="mk-complete-badge">🏆 解鎖徽章：錯題終結者！</p>
          )}
          <button
            className="mk-drill-btn"
            onClick={allCleared ? onAllCleared : onClose}
          >
            {allCleared ? '太棒了！' : '繼續加油 →'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mk-overlay">
      <div className="mk-panel">
        {/* Header */}
        <div className="mk-drill-head">
          <span className="mk-drill-progress">{idx + 1} / {mcQuestions.length}</span>
          <div className="mk-drill-bar">
            <div className="mk-drill-bar-fill" style={{width: `${(idx / mcQuestions.length) * 100}%`}}/>
          </div>
          <button className="icon-btn" onClick={onClose}><window.Icon name="close" size={16}/></button>
        </div>

        {/* Question */}
        <div className="mk-drill-q">
          <p className="mk-drill-q-text">{current.q}</p>
          {current.cat && <span className="mk-item-cat">{current.cat}</span>}
        </div>

        {/* Options */}
        <div className="mk-drill-options">
          {current.options.map((opt, i) => {
            let cls = 'mk-drill-option';
            if (selected !== null) {
              if (i === current.correct) cls += ' mk-opt-correct';
              else if (i === selected)   cls += ' mk-opt-wrong';
              else                       cls += ' mk-opt-dim';
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
              >
                <span className="mk-opt-label">{String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Feedback + Next */}
        {selected !== null && (
          <div className="mk-drill-feedback">
            {selected === current.correct
              ? <span className="mk-fb-correct">✓ 答對了！+5 XP</span>
              : <span className="mk-fb-wrong">✗ 正確答案：{current.options[current.correct]}</span>
            }
            <button className="mk-next-btn" onClick={handleNext}>
              {idx < mcQuestions.length - 1 ? '下一題 →' : '查看結果'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main MistakesPanel ─────────────────────────────────── */
function MistakesPanel({ user, progressItems, weeks, weekOrder, onClose }) {
  const [drillMode,      setDrillMode]      = useMK(false);
  const [drillQuestions, setDrillQuestions] = useMK(null);

  const allWrong = useMKM(
    () => window.collectWrongQuestions(progressItems, weeks, weekOrder),
    [progressItems, weeks, weekOrder]
  );

  // Group by weekLabel
  const grouped = useMKM(() => {
    const g = {};
    allWrong.forEach(q => {
      (g[q.weekLabel] = g[q.weekLabel] || []).push(q);
    });
    return g;
  }, [allWrong]);

  const startDrill = () => {
    setDrillQuestions([...allWrong]); // snapshot at click time
    setDrillMode(true);
  };

  if (drillMode && drillQuestions) {
    return (
      <MistakesDrill
        questions={drillQuestions}
        user={user}
        onClose={() => { setDrillMode(false); setDrillQuestions(null); }}
        onAllCleared={onClose}
      />
    );
  }

  return (
    <div className="mk-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mk-panel">
        {/* Header */}
        <div className="mk-head">
          <h2 className="mk-title">📕 我的錯題</h2>
          <button className="icon-btn" onClick={onClose}><window.Icon name="close" size={16}/></button>
        </div>

        {allWrong.length === 0 ? (
          /* Empty state */
          <div className="mk-empty">
            <img src="owl-proud.png" alt="" className="mk-empty-art"/>
            <p className="mk-empty-msg">太棒了！目前沒有錯題</p>
            <p className="mk-empty-sub">Keep it up! 繼續保持！</p>
          </div>
        ) : (
          <>
            <div className="mk-summary">
              共 <strong>{allWrong.length}</strong> 道錯題需要複習
            </div>

            <div className="mk-list">
              {Object.entries(grouped).map(([weekLabel, qs]) => (
                <div key={weekLabel} className="mk-group">
                  <div className="mk-group-label">{weekLabel}</div>
                  {qs.map((q, i) => (
                    <MistakeItem key={`${q.itemId}-${i}`} q={q}/>
                  ))}
                </div>
              ))}
            </div>

            <button className="mk-drill-btn" onClick={startDrill}>
              🚀 開始重練（{allWrong.length} 題）
            </button>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MistakesPanel });
