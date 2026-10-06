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

// Mistake types that must NOT be flattened into synthetic multiple-choice.
// (Their "answer" is a spelling / sentence / structure, so a 4-way MC misleads.)
// Anything NOT listed here — including missing/empty/unknown legacy types whose
// answer is a real word — is treated as MC-drillable.
const MK_REVEAL_ONLY = [
  'spelling', 'syllable-div', 'cloze', 'essay',
  'story-mountain', 'short-answer', 'writing-practice', 'word-sort', 'sentence-order',
  'reading-skill'   // v386: 答案是「該放哪一格」，做成四選一會誤導
];

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

/* ── Reveal-only review row (non-MC types in the drill) ── */
/* Same reveal pattern as MistakeItem, plus a "我已複習 ✓" button that removes
   the mistake via the SAME path as the MC branch. */
function MistakeReview({ q, onReviewed }) {
  const [revealed, setRevealed] = useMK(false);
  return (
    <div className="mk-item">
      <div className="mk-item-q">{q.q}</div>
      {q.cat && <span className="mk-item-cat">{q.cat}</span>}
      <button
        className={`mk-item-answer${revealed ? ' revealed' : ''}`}
        onClick={() => setRevealed(r => !r)}
      >
        {revealed ? `正解：${q.answer}` : '點擊查看答案'}
      </button>
      <button
        className="mk-next-btn"
        style={{ marginTop: 8 }}
        onClick={onReviewed}
      >
        我已複習 ✓
      </button>
    </div>
  );
}

/* ── Drill mode ─────────────────────────────────────────── */
function MistakesDrill({ questions, user, onClose, onAllCleared }) {
  // Snapshot questions at mount — prevents live Firestore updates from
  // changing the question list mid-drill.
  // MC-drillable subset only (legacy/unknown types included — see MK_REVEAL_ONLY).
  const [mcQuestions] = useMK(() => {
    const mcSrc = questions.filter(q => !MK_REVEAL_ONLY.includes(q.type));
    const allAnswers = mcSrc.map(q => q.answer);
    return _mkShuffle(mcSrc.map(q => {
      // v318 (#3): 若有存原題的原始選項 → 直接用（重新洗牌變換位置），才是「原題原選項」的有效複習。
      // 只有舊資料（沒存 options）才退回下面的「同類湊題」。
      if (Array.isArray(q.options) && q.options.length >= 2 &&
          typeof q.correct === 'number' && q.correct >= 0 && q.correct < q.options.length) {
        const ans = q.options[q.correct];
        const shuffled = _mkShuffle(q.options);
        return { ...q, options: shuffled, correct: shuffled.indexOf(ans) };
      }
      // Prefer distractors from SAME category/type siblings, so a grammar
      // item isn't offered three vocabulary words (a giveaway). Only if
      // there aren't ≥3 same-category siblings do we top up from the full pool.
      const sameCat = mcSrc
        .filter(o => o !== q && o.cat === q.cat && o.type === q.type && o.answer !== q.answer)
        .map(o => o.answer);
      let pool = _mkShuffle(sameCat);
      if (pool.length < 3) {
        const rest = _mkShuffle(allAnswers.filter(a => a !== q.answer && !pool.includes(a)));
        pool = pool.concat(rest);
      }
      const distractors = pool.slice(0, 3);
      while (distractors.length < 3) distractors.push(distractors[0] || '—');
      const options = _mkShuffle([q.answer, ...distractors]);
      return { ...q, options, correct: options.indexOf(q.answer) };
    }));
  });

  // Reveal-only subset — kept unmodified, reviewed & removed one-by-one.
  const [revealItems, setRevealItems] = useMK(() =>
    questions.filter(q => MK_REVEAL_ONLY.includes(q.type))
  );

  const [idx, setIdx]         = useMK(0);
  const [selected, setSelected] = useMK(null);
  const [cleared, setCleared]   = useMK(0);
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
        // v465：訂正一題 +1⭐（一天上限在 computeFixedStars 裡套，這裡只負責記「真的訂正了一題」）
        if (window.markMistakeFixed) window.markMistakeFixed(user.uid, user.displayName || '', user.email || '');
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

  // Reveal-only "我已複習 ✓" → same removal path as the MC branch; drop locally
  // so the reveal list (and header mistakes-count on return) updates.
  const handleReviewed = (q) => {
    window.playSound('correct');
    if (user?.uid) {
      window.removeWrongQuestion(user.uid, q.itemId, q.q, q.answer);
      if (window.markMistakeFixed) window.markMistakeFixed(user.uid, user.displayName || '', user.email || '');   // v465
    }
    setRevealItems(items => items.filter(it => it !== q));
  };

  useMKE(() => {
    if (done && cleared === mcQuestions.length) {
      window.playSound('complete');
    }
  }, [done]);

  // ── 1) Sequential MC drill (while MC-drillable questions remain) ──
  if (mcQuestions.length > 0 && !done) {
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
                ? <span className="mk-fb-correct">✓ 答對了！已從錯題本移除</span>
                : <span className="mk-fb-wrong">✗ 正確答案：{current.options[current.correct]}</span>
              }
              <button className="mk-next-btn" onClick={handleNext}>
                {idx < mcQuestions.length - 1
                  ? '下一題 →'
                  : (revealItems.length > 0 ? '下一步 →' : '查看結果')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 2) Reveal-only review section (訂正這些，照原本方式複習) ──
  if (revealItems.length > 0) {
    return (
      <div className="mk-overlay">
        <div className="mk-panel">
          <div className="mk-head">
            <h2 className="mk-title">✍️ 訂正這些</h2>
            <button className="icon-btn" onClick={onClose}><window.Icon name="close" size={16}/></button>
          </div>

          <div className="mk-summary">
            {mcQuestions.length > 0
              ? <>選擇題答對 <strong>{cleared}</strong> / {mcQuestions.length} 題 · 以下題型請照原本方式複習</>
              : <>以下題型不適合選擇題，請照原本方式複習後點「我已複習」</>}
          </div>

          <div className="mk-list">
            <div className="mk-group">
              <div className="mk-group-label">訂正這些（照原本方式複習）</div>
              {revealItems.map((q, i) => (
                <MistakeReview
                  key={`${q.itemId}-${i}`}
                  q={q}
                  onReviewed={() => handleReviewed(q)}
                />
              ))}
            </div>
          </div>

          <button className="mk-drill-btn" onClick={onClose}>完成</button>
        </div>
      </div>
    );
  }

  // ── 3) MC completion screen (had MC questions, no reveal items left) ──
  if (mcQuestions.length > 0) {
    const allCleared = cleared === mcQuestions.length;
    return (
      <div className="mk-overlay">
        <div className="mk-panel mk-panel-center">
          <div className="mk-complete-icon">{allCleared ? '🎯' : '💪'}</div>
          <h3 className="mk-complete-title">
            {allCleared ? '全部答對！錯題本清空了！' : '重練完成！'}
          </h3>
          <p className="mk-complete-stat">
            答對 {cleared} / {mcQuestions.length} 題
            {allCleared ? '' : ' · 答對的已從錯題本移除'}
          </p>
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

  // ── 4) Nothing to drill (both subsets empty) — simple close ──
  return (
    <div className="mk-overlay">
      <div className="mk-panel mk-panel-center">
        <div className="mk-complete-icon">🎯</div>
        <h3 className="mk-complete-title">錯題本清空了！</h3>
        <button className="mk-drill-btn" onClick={onAllCleared || onClose}>太棒了！</button>
      </div>
    </div>
  );
}

/* ── Main MistakesPanel ─────────────────────────────────── */
/* v465（Alan：「我覺得要加上獎勵比較合理」）：訂正一題 +1⭐，一天上限 10 顆。
   順便把這張面板的三個問題一起修掉（都是實測看出來的）：
     ① 一次丟「開始重練（18 題）」——看到數字就不想開始，而且真實學生可能累積 50+。
        → 一次只給 5 題，做完再問「還要再 5 題嗎」。可完成、有節奏。
     ② 照「週次」分，不是照「你哪裡不會」分——同一個字在聽寫、配對、填空都錯過，
        現在是三筆不相干的紀錄。→ 照**答案**歸戶，一個答案一張卡，寫清楚在哪幾種練習裡錯過。
     ③ 看不到獎勵。→ 標題寫「訂正一題 +1⭐」，今天還能拿幾顆也寫出來。 */
const MK_BATCH = 5;   // 一次練幾題

function MistakesPanel({ user, progressItems, weeks, weekOrder, fixed, onClose }) {
  const [drillMode,      setDrillMode]      = useMK(false);
  const [drillQuestions, setDrillQuestions] = useMK(null);

  const allWrong = useMKM(
    () => window.collectWrongQuestions(progressItems, weeks, weekOrder),
    [progressItems, weeks, weekOrder]
  );

  /* 照「答案」歸戶：同一個答案在幾種練習裡錯過就併成一張卡。
     ⚠ 用 gnNorm 正規化（大小寫、標點不算差別），不然 "pursued" 和 "Pursued" 會變兩張。 */
  const byAnswer = useMKM(() => {
    const norm = (t) => (window.gnNorm ? window.gnNorm(String(t || '')) : String(t || '').toLowerCase().trim());
    const m = new Map();
    allWrong.forEach(q => {
      const k = norm(q.answer) || ('__' + q.q);
      if (!m.has(k)) m.set(k, { answer: q.answer, items: [], kinds: new Set(), weeks: new Set() });
      const g = m.get(k);
      g.items.push(q);
      if (q.itemTitle) g.kinds.add(window.QM_TYPE_ZH_PUBLIC ? window.QM_TYPE_ZH_PUBLIC[q.type] || q.cat : (q.cat || ''));
      if (q.weekLabel) g.weeks.add(q.weekLabel);
    });
    // 錯過愈多次的排前面——那才是「他真的不會」的
    return [...m.values()].sort((x, y) => y.items.length - x.items.length);
  }, [allWrong]);

  const f = window.computeFixedStars ? window.computeFixedStars(fixed) : { todayLeft: 0, todayN: 0 };
  const perStar = window.FIX_STAR || 1;

  const startDrill = () => {
    setDrillQuestions(allWrong.slice(0, MK_BATCH));   // v465：一次只練 5 題
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
            <div className="mk-empty-check" aria-hidden="true">✓</div>
            <p className="mk-empty-msg">太棒了！目前沒有錯題</p>
            <p className="mk-empty-sub">答錯的題目會自動收進來，方便隨時複習</p>
          </div>
        ) : (
          <>
            <div className="mk-summary">
              還有 <strong>{allWrong.length}</strong> 題可以訂正
              <span className="mk-reward">訂正一題 <b>+{perStar}⭐</b>
                {f.todayLeft > 0 ? `　今天還可以拿 ${f.todayLeft} 顆` : '　今天的已經拿滿了，明天再來 👍'}</span>
            </div>

            {/* v465：照「答案」歸戶——同一個字在幾種練習裡錯過就併成一張，
                錯最多次的排最前面。這才回答得了「我到底哪裡不會」。 */}
            <div className="mk-list">
              {byAnswer.slice(0, 12).map((g, i) => (
                <div key={i} className="mk-ans">
                  <div className="mk-ans-head">
                    <b className="mk-ans-word">{g.answer || '（看題目）'}</b>
                    {g.items.length > 1 && <span className="mk-ans-n">錯過 {g.items.length} 次</span>}
                  </div>
                  <div className="mk-ans-where">
                    {[...g.weeks].slice(0, 3).join('、')}
                    {g.items.length > 1 && <span>　·　{[...new Set(g.items.map(x => x.cat).filter(Boolean))].join('、')}</span>}
                  </div>
                </div>
              ))}
              {byAnswer.length > 12 && <div className="mk-ans-more">…還有 {byAnswer.length - 12} 個</div>}
            </div>

            <button className="mk-drill-btn" onClick={startDrill}>
              ↻ 先練 {Math.min(MK_BATCH, allWrong.length)} 題
              {f.todayLeft > 0 && <span className="mk-drill-star">　最多 +{Math.min(MK_BATCH, allWrong.length, f.todayLeft) * perStar}⭐</span>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MistakesPanel });
