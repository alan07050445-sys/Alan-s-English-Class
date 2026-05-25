// components-quiz-mode.jsx — Duolingo-style quiz mode

const { useState: useQM, useEffect: useQME, useMemo: useQMM } = React;

/* ── Helpers ─────────────────────────────────────────── */
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Auto-generate MC questions from a word list (both directions)
function generateVocabQuestions(words) {
  if (!words || words.length < 2) return [];
  const qs = [];
  words.forEach(word => {
    // English → Chinese
    const wrongZh = shuffleArr(words.filter(w => w.en !== word.en).map(w => w.zh)).slice(0, 3);
    const zhOpts  = shuffleArr([word.zh, ...wrongZh]);
    qs.push({ q: word.en, hint: 'Choose the correct meaning · 選出正確意思', options: zhOpts, correct: zhOpts.indexOf(word.zh) });

    // Chinese → English
    const wrongEn = shuffleArr(words.filter(w => w.en !== word.en).map(w => w.en)).slice(0, 3);
    const enOpts  = shuffleArr([word.en, ...wrongEn]);
    qs.push({ q: word.zh, hint: 'Choose the English word · 選出英文單字', options: enOpts, correct: enOpts.indexOf(word.en) });
  });
  return shuffleArr(qs);
}

// Aggregate all MC questions from items in a category
function getCategoryQuestions(items) {
  const qs = [];
  (items || []).forEach(item => {
    if (item.type === 'vocab-quiz' && (item.words || []).length >= 2) {
      qs.push(...generateVocabQuestions(item.words));
    } else if (item.type === 'quiz' && (item.questions || []).length > 0) {
      item.questions.forEach(q => {
        if ((q.options || []).length >= 2) {
          qs.push({ q: q.q, hint: '', options: q.options, correct: q.answer || 0, explain: q.explain || '' });
        }
      });
    }
  });
  return qs;
}

// Local progress for quiz mode (separate from main progress)
const QM_KEY = 'alans-qm-v1';
function loadQMProg()  { try { return JSON.parse(localStorage.getItem(QM_KEY) || '{}'); } catch(e) { return {}; } }
function saveQMProg(p) { try { localStorage.setItem(QM_KEY, JSON.stringify(p)); } catch(e) {} }

/* ── Category icons & colours ────────────────────────── */
const CAT_ICONS = { vocab: '📚', grammar: '✏️', word: '🔤', reading: '📖' };
const CAT_BG = {
  vocab:   'linear-gradient(135deg,#667eea,#764ba2)',
  grammar: 'linear-gradient(135deg,#f093fb,#f5576c)',
  word:    'linear-gradient(135deg,#4facfe,#00f2fe)',
  reading: 'linear-gradient(135deg,#43e97b,#38f9d7)',
};

/* ══════════════════════════════════════════════════════
   4-BLOCK MAIN SCREEN
══════════════════════════════════════════════════════ */
function QuizModeBlocks({ week, weekId, onStartQuiz }) {
  const qmProg = loadQMProg();

  return (
    <>
      {/* Week banner */}
      <div className="qm-week-banner">
        <div className="qm-week-eyebrow">
          <span className="dot"/>
          <span>{weekId} · {week.dateRange || ''}</span>
        </div>
        <h1 className="qm-week-title">{week.theme || week.label}</h1>
        {week.subtitle && <p className="qm-week-sub">{week.subtitle}</p>}
      </div>

      {/* 4 blocks */}
      <div className="qm-blocks">
        {window.CATEGORIES.map(cat => {
          const items = (week.items || {})[cat.id] || [];
          const questions = getCategoryQuestions(items);
          const total = questions.length;
          const key   = `${weekId}_${cat.id}`;
          const prog  = qmProg[key] || { done: 0 };
          const pct   = total > 0 ? Math.min(100, Math.round(prog.done / total * 100)) : 0;

          return (
            <div
              key={cat.id}
              className={`qm-block${total === 0 ? ' empty' : ''}`}
              onClick={() => total > 0 && onStartQuiz(cat, questions, key)}
            >
              <div className="qm-block-icon" style={{ background: CAT_BG[cat.id] }}>
                {CAT_ICONS[cat.id]}
              </div>
              <div className="qm-block-content">
                <div className="qm-block-title">{cat.title}</div>
                <div className="qm-block-title-zh">{cat.titleZh}</div>
                {total > 0 ? (
                  <>
                    <div className="qm-block-count">{total} questions</div>
                    <div className="qm-block-progress">
                      <div className="qm-progress-bar">
                        <div className="qm-progress-fill" style={{ width: pct + '%' }}/>
                      </div>
                      <span className="qm-pct">{pct}%</span>
                    </div>
                  </>
                ) : (
                  <div className="qm-block-empty">No quiz yet</div>
                )}
              </div>
              {total > 0 && <div className="qm-block-arrow">›</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   QUIZ PLAYER
══════════════════════════════════════════════════════ */
function QuizModePlayer({ cat, questions, progressKey, onBack }) {
  const [idx,       setIdx]      = useQM(0);
  const [selected,  setSelected] = useQM(null); // index of chosen option or null
  const [score,     setScore]    = useQM(0);
  const [screen,    setScreen]   = useQM('quiz'); // 'quiz' | 'result'
  const [wrongList, setWrongList]= useQM([]);

  const q     = questions[idx];
  const total = questions.length;
  const isLast= idx === total - 1;
  const pct   = Math.round(idx / total * 100);

  const handleSelect = (optIdx) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const correct = optIdx === q.correct;
    if (correct) setScore(s => s + 1);
    else         setWrongList(prev => [...prev, q]);
  };

  const handleNext = () => {
    if (isLast) {
      const finalScore = score + (selected === q.correct ? 1 : 0);
      // Save to localStorage
      const prev = loadQMProg();
      prev[progressKey] = { done: total, score: finalScore, total, ts: Date.now() };
      saveQMProg(prev);
      // Save to Firestore if logged in
      const u = window._currentUser;
      if (u && window.saveProgressItem) {
        const scorePct = Math.round(finalScore / total * 100);
        window.saveProgressItem(u.uid, u.displayName || '', u.email || '', progressKey, {
          done: Date.now(), score: scorePct,
        });
      }
      setScreen('result');
    } else {
      setIdx(i => i + 1);
      setSelected(null);
    }
  };

  const restart = () => {
    setIdx(0); setSelected(null); setScore(0);
    setScreen('quiz'); setWrongList([]);
  };

  /* ── Result screen ── */
  if (screen === 'result') {
    const finalScore = score;
    const finalPct   = Math.round(finalScore / total * 100);
    const emoji = finalPct === 100 ? '🏆' : finalPct >= 80 ? '🎉' : finalPct >= 60 ? '👍' : '💪';
    const msg   = finalPct === 100 ? 'Perfect! 滿分！'
                : finalPct >= 80   ? 'Excellent! 非常好！'
                : finalPct >= 60   ? 'Good job! 繼續加油！'
                :                    'Keep practicing! 多練習！';
    return (
      <div className="qm-result">
        <div className="qm-result-emoji">{emoji}</div>
        <div className="qm-result-cat-title">{cat.title} · {cat.titleZh}</div>
        <div className="qm-result-score">
          <span className="qm-result-num">{finalScore}</span>
          <span className="qm-result-denom"> / {total}</span>
        </div>
        <div className="qm-result-pct">{finalPct}% correct</div>
        <div className="qm-result-msg">{msg}</div>
        <div className="qm-result-btns">
          <button className="qm-btn secondary" onClick={restart}>再試一次</button>
          <button className="qm-btn primary"   onClick={onBack}>回主畫面</button>
        </div>
        {wrongList.length > 0 && (
          <div className="qm-wrong-list">
            <div className="qm-wrong-title">需要複習 · Review these ({wrongList.length})</div>
            {wrongList.map((wq, i) => (
              <div key={i} className="qm-wrong-item">
                <span className="qm-wrong-q">{wq.q}</span>
                <span className="qm-wrong-a">{wq.options[wq.correct]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Quiz screen ── */
  return (
    <div className="qm-player-shell">
      {/* Header: back + progress */}
      <div className="qm-player-head">
        <button className="qm-back-btn" onClick={onBack} title="Back">
          <window.Icon name="close" size={18}/>
        </button>
        <div className="qm-player-bar-wrap">
          <div className="qm-player-bar">
            <div className="qm-player-fill" style={{ width: pct + '%' }}/>
          </div>
        </div>
        <span className="qm-player-counter">{idx + 1} / {total}</span>
      </div>

      {/* Question */}
      <div className="qm-question-area">
        {q.hint && <div className="qm-question-hint">{q.hint}</div>}
        <div className="qm-question-text">{q.q}</div>
      </div>

      {/* Options */}
      <div className="qm-options">
        {q.options.map((opt, i) => {
          let cls = 'qm-option';
          if (selected !== null) {
            if (i === q.correct) cls += ' correct';
            else if (i === selected) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={selected !== null && i !== q.correct && i !== selected}>
              <span className="qm-opt-letter">{['A','B','C','D'][i]}</span>
              <span className="qm-opt-text">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback + next */}
      {selected !== null && (
        <div className="qm-feedback">
          <div className={`qm-feedback-banner ${selected === q.correct ? 'correct' : 'wrong'}`}>
            {selected === q.correct
              ? '✓ Correct! 答對了！'
              : `✗ The answer is: ${q.options[q.correct]}`}
          </div>
          {q.explain && <div className="qm-explain">{q.explain}</div>}
          <button className="qm-btn primary" onClick={handleNext}>
            {isLast ? '查看成績 →' : '下一題 →'}
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { QuizModeBlocks, QuizModePlayer, getCategoryQuestions });
