// components-review.jsx — 跨週總複習（考前總複習）
// 出題重用 quiz-mode 的 getQuizItems / getItemQuestions / generateListeningQuestions，
// 完成後不寫入任何週次 item 進度 — 只記錯題（itemId: review_起_訖）+ XP。

const { useState: useRV, useMemo: useRVM, useEffect: useRVE } = React;

function _rvShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Build the mixed question pool from a week range ───── */
function buildReviewQuestions(weeks, weekOrder, { startIdx, endIdx, cats, count, includeListening }) {
  const pool = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const wid = weekOrder[i];
    const w = weeks[wid];
    if (!w) continue;
    cats.forEach(catId => {
      const items = (w.items && w.items[catId]) || [];
      window.getQuizItems(items).forEach(item => {
        window.getItemQuestions(item).forEach(q => {
          // Skip per-item listening; review-level listening is generated below
          if (q.qtype === 'listening') return;
          pool.push({ ...q, weekLabel: w.label || wid, weekId: wid });
        });
        if (includeListening && item.type === 'vocab-quiz' && (item.words || []).length >= 4) {
          window.generateListeningQuestions(item.words, 4).forEach(q => {
            pool.push({ ...q, weekLabel: w.label || wid, weekId: wid });
          });
        }
      });
    });
  }
  const shuffled = _rvShuffle(pool);
  return count === 'all' ? shuffled : shuffled.slice(0, count);
}

/* ── Setup modal ────────────────────────────────────────── */
function ReviewSetupModal({ weeks, weekOrder, onStart, onClose }) {
  const lastIdx = Math.max(0, weekOrder.length - 1);
  const [startIdx, setStartIdx] = useRV(Math.max(0, lastIdx - 3)); // 預設最近 4 週
  const [endIdx,   setEndIdx]   = useRV(lastIdx);
  const [cats,     setCats]     = useRV(['vocab']);
  const [count,    setCount]    = useRV(20);
  const [withListening, setWithListening] = useRV(true);
  const [warn, setWarn] = useRV(null);

  const toggleCat = (id) => {
    setCats(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
    setWarn(null);
  };

  const availableCount = useRVM(() => {
    if (cats.length === 0) return 0;
    return buildReviewQuestions(weeks, weekOrder, {
      startIdx: Math.min(startIdx, endIdx),
      endIdx:   Math.max(startIdx, endIdx),
      cats, count: 'all', includeListening: withListening,
    }).length;
  }, [weeks, weekOrder, startIdx, endIdx, cats, withListening]);

  const handleStart = () => {
    if (cats.length === 0) { setWarn('請至少選一個分類'); return; }
    if (availableCount < 4) { setWarn('這個範圍的題目太少了，請換個範圍或分類'); return; }
    const s = Math.min(startIdx, endIdx), e = Math.max(startIdx, endIdx);
    const questions = buildReviewQuestions(weeks, weekOrder, {
      startIdx: s, endIdx: e, cats,
      count: count === 'all' ? 'all' : Math.min(count, availableCount),
      includeListening: withListening,
    });
    onStart({ questions, startWid: weekOrder[s], endWid: weekOrder[e] });
  };

  const weekOpt = (wid) =>
    `${weeks[wid]?.label || wid}${weeks[wid]?.dateRange && weeks[wid].dateRange !== '—' ? ` (${weeks[wid].dateRange})` : ''}`;

  return (
    <div className="rv-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rv-panel">
        <div className="rv-head">
          <h2 className="rv-title">🏆 總複習 Review</h2>
          <button className="icon-btn" onClick={onClose}><window.Icon name="close" size={16}/></button>
        </div>

        <div className="rv-body">
          {/* 範圍 */}
          <div className="rv-field">
            <label className="rv-label">複習範圍 · Week range</label>
            <div className="rv-range-row">
              <select className="rv-select" value={startIdx} onChange={e => { setStartIdx(+e.target.value); setWarn(null); }}>
                {weekOrder.map((wid, i) => <option key={wid} value={i}>{weekOpt(wid)}</option>)}
              </select>
              <span className="rv-range-sep">→</span>
              <select className="rv-select" value={endIdx} onChange={e => { setEndIdx(+e.target.value); setWarn(null); }}>
                {weekOrder.map((wid, i) => <option key={wid} value={i}>{weekOpt(wid)}</option>)}
              </select>
            </div>
          </div>

          {/* 分類 */}
          <div className="rv-field">
            <label className="rv-label">分類 · Categories</label>
            <div className="rv-cat-chips">
              {(window.CATEGORIES || []).map(c => (
                <button
                  key={c.id}
                  className={`rv-chip${cats.includes(c.id) ? ' on' : ''}`}
                  onClick={() => toggleCat(c.id)}
                >{c.titleZh}</button>
              ))}
            </div>
          </div>

          {/* 題數 */}
          <div className="rv-field">
            <label className="rv-label">題數 · Questions</label>
            <div className="rv-cat-chips">
              {[10, 20, 'all'].map(n => (
                <button
                  key={n}
                  className={`rv-chip${count === n ? ' on' : ''}`}
                  onClick={() => setCount(n)}
                >{n === 'all' ? '全部' : `${n} 題`}</button>
              ))}
            </div>
          </div>

          {/* 聽力 */}
          <label className="rv-listen-toggle">
            <input
              type="checkbox"
              checked={withListening}
              onChange={e => setWithListening(e.target.checked)}
            />
            <span>包含聽力題 🔊（聽音選字）</span>
          </label>

          <div className="rv-available">
            範圍內共有 <strong>{availableCount}</strong> 題可複習
          </div>
          {warn && <div className="rv-warn">⚠️ {warn}</div>}
        </div>

        <button className="rv-start-btn" onClick={handleStart}>開始複習 →</button>
      </div>
    </div>
  );
}

/* ── Review player (one pass, qm-* visual style) ────────── */
function ReviewPlayer({ questions, startWid, endWid, user, onClose }) {
  const [idx, setIdx]           = useRV(0);
  const [selected, setSelected] = useRV(null);
  const [right, setRight]       = useRV(0);
  const [wrongList, setWrongList] = useRV([]);
  const [done, setDone]         = useRV(false);
  const savedRef = React.useRef(false);

  const q = questions[idx];
  const total = questions.length;
  const pct = Math.round(idx / total * 100);

  useRVE(() => {
    if (q?.qtype === 'listening' && !done) window.speakText(q.word);
  }, [idx, done]);

  // Save results exactly once when finished
  useRVE(() => {
    if (!done || savedRef.current) return;
    savedRef.current = true;
    window.playSound('complete');
    if (user?.uid) {
      if (right > 0) window.addXp(user.uid, right * 2);
      if (wrongList.length > 0) {
        window.saveQuizMistakes(
          user.uid, user.displayName || '', user.email || '',
          `review_${startWid}_${endWid}`, wrongList
        );
      }
    }
  }, [done]);

  const handleSelect = (optIdx) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const correct = optIdx === q.correct;
    window.playSound(correct ? 'correct' : 'wrong');
    if (correct) {
      setRight(r => r + 1);
      setTimeout(() => handleNext(), 650);
    } else {
      setWrongList(w => [...w, q]);
    }
  };

  const handleNext = () => {
    setSelected(null);
    if (idx >= total - 1) setDone(true);
    else setIdx(i => i + 1);
  };

  /* ── Result ── */
  if (done) {
    const finalPct = Math.round(right / total * 100);
    // Per-week wrong distribution
    const byWeek = {};
    questions.forEach(qq => { byWeek[qq.weekLabel] = byWeek[qq.weekLabel] || { total: 0, wrong: 0 }; byWeek[qq.weekLabel].total++; });
    wrongList.forEach(w => { if (byWeek[w.weekLabel]) byWeek[w.weekLabel].wrong++; });
    const weakest = Object.entries(byWeek)
      .filter(([, v]) => v.wrong > 0)
      .sort((a, b) => b[1].wrong - a[1].wrong)[0];

    return (
      <div className="rv-overlay">
        <div className="rv-panel rv-panel-result">
          <div className="rv-result-icon">{finalPct >= 80 ? '🏆' : finalPct >= 60 ? '💪' : '📚'}</div>
          <h3 className="rv-result-title">複習完成！</h3>
          <div className="rv-result-score">{finalPct}<span className="rv-result-pct">%</span></div>
          <p className="rv-result-stat">答對 {right} / {total} 題{user && right > 0 ? ` · +${right * 2} XP` : ''}</p>

          {Object.keys(byWeek).length > 1 && (
            <div className="rv-week-stats">
              {Object.entries(byWeek).map(([wk, v]) => (
                <div key={wk} className="rv-week-stat-row">
                  <span className="rv-week-stat-label">{wk}</span>
                  <div className="rv-week-stat-bar">
                    <div
                      className="rv-week-stat-fill"
                      style={{ width: `${v.total > 0 ? Math.round((v.total - v.wrong) / v.total * 100) : 0}%` }}
                    />
                  </div>
                  <span className="rv-week-stat-num">{v.total - v.wrong}/{v.total}</span>
                </div>
              ))}
            </div>
          )}

          {weakest && (
            <p className="rv-weakest">💡 {weakest[0]} 錯最多（{weakest[1].wrong} 題）— 建議回去複習！</p>
          )}
          {wrongList.length > 0 && user && (
            <p className="rv-mistake-note">錯的 {wrongList.length} 題已加入 📕 我的錯題</p>
          )}

          <button className="rv-start-btn" onClick={onClose}>完成</button>
        </div>
      </div>
    );
  }

  /* ── Quiz ── */
  return (
    <div className="rv-overlay">
      <div className="rv-panel rv-panel-play">
        <div className="rv-play-head">
          <span className="rv-play-week">{q.weekLabel}</span>
          <div className="rv-play-bar"><div className="rv-play-fill" style={{ width: pct + '%' }}/></div>
          <span className="rv-play-count">{idx + 1}/{total}</span>
          <button className="icon-btn" onClick={onClose}><window.Icon name="close" size={16}/></button>
        </div>

        <div key={idx} className="qm-question-area qm-question-swap rv-question-pad">
          {q.hint && <div className="qm-question-hint">{q.hint}</div>}
          {q.qtype === 'listening' ? (
            <button className="qm-listen-btn" onClick={() => window.speakText(q.word)} title="再聽一次">
              <span className="qm-listen-icon">🔊</span>
              <span className="qm-listen-label">點擊重聽 · Tap to replay</span>
            </button>
          ) : (
            <div className="qm-question-text">{q.q}</div>
          )}
        </div>

        <div key={`opts-${idx}`} className="qm-options qm-options-swap rv-options-pad">
          {q.options.map((opt, i) => {
            let cls = 'qm-option';
            if (selected !== null) {
              if (i === q.correct) cls += ' correct';
              else if (i === selected) cls += ' wrong';
              else cls += ' dim';
            }
            return (
              <button key={i} className={cls} onClick={() => handleSelect(i)}>
                <span className="qm-opt-letter">{['A','B','C','D'][i] || '·'}</span>
                <span className="qm-opt-text">{opt}</span>
              </button>
            );
          })}
        </div>

        {selected !== null && selected !== q.correct && (
          <div className="qm-feedback rv-feedback-pad">
            <div className="qm-feedback-banner wrong">✗ The answer is: {q.options[q.correct]}</div>
            {q.explain && <div className="qm-explain">{q.explain}</div>}
            <button className="qm-btn primary" onClick={handleNext}>
              {idx >= total - 1 ? '查看成績 →' : '下一題 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ReviewSetupModal, ReviewPlayer, buildReviewQuestions });
