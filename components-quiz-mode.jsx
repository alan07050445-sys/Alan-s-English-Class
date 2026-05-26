// components-quiz-mode.jsx — Quiz mode (main UI for students + teacher edit)

const { useState: useQM, useMemo: useQMM } = React;

/* ── Helpers ─────────────────────────────────────────── */
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Auto-generate MC questions from word pairs (both directions, mixed)
function generateVocabQuestions(words) {
  if (!words || words.length < 2) return [];
  const qs = [];
  words.forEach(word => {
    const wrongZh = shuffleArr(words.filter(w => w.en !== word.en).map(w => w.zh)).slice(0, 3);
    const zhOpts  = shuffleArr([word.zh, ...wrongZh]);
    qs.push({ q: word.en, hint: 'Choose the correct meaning · 選出正確意思', options: zhOpts, correct: zhOpts.indexOf(word.zh) });

    const wrongEn = shuffleArr(words.filter(w => w.en !== word.en).map(w => w.en)).slice(0, 3);
    const enOpts  = shuffleArr([word.en, ...wrongEn]);
    qs.push({ q: word.zh, hint: 'Choose the English word · 選出英文單字', options: enOpts, correct: enOpts.indexOf(word.en) });
  });
  return shuffleArr(qs);
}

// Get MC questions for a single item
// For 'quiz' type: correct answer is always stored at index 0 (teacher default),
// so we shuffle options + question order when the quiz starts.
function getItemQuestions(item) {
  if (!item) return [];
  if (item.type === 'vocab-quiz' && (item.words || []).length >= 2) {
    return generateVocabQuestions(item.words);
  }
  if (item.type === 'fillblank' && (item.questions || []).length >= 2) {
    const qs = (item.questions || []).filter(q => q.sentence && q.answer);
    if (qs.length < 2) return [];
    const allAnswers = qs.map(q => q.answer);
    const mapped = qs.map(q => {
      // Pick up to 3 wrong answers from sibling items
      const wrongPool = shuffleArr(allAnswers.filter(a => a !== q.answer));
      const wrongAnswers = wrongPool.slice(0, 3);
      if (wrongAnswers.length < 1) return null;
      const options = shuffleArr([q.answer, ...wrongAnswers]);
      const correct = options.indexOf(q.answer);
      // Strip leading number prefix; keep ___ visible as the blank
      const qText = (q.sentence || '').replace(/^[\(（]?\d+[\)）\.\s、：:]+\s*/, '');
      return { q: qText, hint: 'Fill in the blank · 選出正確答案', options, correct, explain: '' };
    }).filter(Boolean);
    return shuffleArr(mapped);
  }
  if (item.type === 'quiz' && (item.questions || []).length > 0) {
    const mapped = item.questions
      .filter(q => (q.options || []).length >= 2)
      .map(q => {
        const savedCorrect = q.answer !== undefined ? q.answer : 0;
        const correctText = q.options[savedCorrect];          // remember the right answer text
        const shuffled = shuffleArr([...q.options]);           // shuffle options
        const newCorrect = shuffled.indexOf(correctText);      // find new index
        // Strip leading question numbers like "1. " / "1) " / "（1）"
        const qText = (q.q || '').replace(/^[\(（]?\d+[\)）\.\s、：:]+\s*/, '');
        return { q: qText, hint: '', options: shuffled, correct: newCorrect, explain: q.explain || '' };
      });
    return shuffleArr(mapped); // also shuffle question order
  }
  return [];
}

// All quiz-able items in a category
function getQuizItems(items) {
  return (items || []).filter(item =>
    (item.type === 'vocab-quiz'       && (item.words || []).length >= 2) ||
    (item.type === 'fillblank'        && (item.questions || []).length >= 2) ||
    (item.type === 'quiz'             && (item.questions || []).length > 0) ||
    (item.type === 'writing-practice' && item.linkedFlashcardId)
  );
}

// Generate flashcard data from any quiz-able item
function getFlashcardData(item) {
  if (!item) return [];
  if (item.type === 'vocab-quiz' && item.words) {
    return item.words.map(w => ({ front: w.en, back: w.zh }));
  }
  if (item.type === 'fillblank' && item.questions) {
    return (item.questions || [])
      .filter(q => q.sentence && q.answer)
      .map(q => ({ front: q.sentence, back: q.answer }));
  }
  if (item.type === 'quiz' && item.questions) {
    return (item.questions || [])
      .filter(q => q.q && q.options && q.options.length > 0)
      .map(q => ({ front: q.q, back: q.options[q.answer !== undefined ? q.answer : 0] }));
  }
  return [];
}

// Progress persistence (localStorage)
const QM_KEY = 'alans-qm-v1';
function loadQMProg()  { try { return JSON.parse(localStorage.getItem(QM_KEY) || '{}'); } catch(e) { return {}; } }
function saveQMProg(p) { try { localStorage.setItem(QM_KEY, JSON.stringify(p)); } catch(e) {} }

function getTodayInputValue(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/* ── Visual config ───────────────────────────────────── */
const CAT_ICONS = { vocab: '📚', grammar: '✏️', word: '🔤', reading: '📖' };
const CAT_BG    = {
  vocab:   'linear-gradient(135deg,#667eea,#764ba2)',
  grammar: 'linear-gradient(135deg,#f093fb,#f5576c)',
  word:    'linear-gradient(135deg,#4facfe,#00f2fe)',
  reading: 'linear-gradient(135deg,#43e97b,#38f9d7)',
};

/* ══════════════════════════════════════════════════════
   MAIN SCREEN — 4 blocks
   editMode=true → show edit controls + week metadata editing
══════════════════════════════════════════════════════ */
function QuizModeBlocks({ week, weekId, onEnterCat, editMode, onUpdateWeek, onAddItem }) {
  const qmProg = loadQMProg();
  const ET = window.EditableText;

  return (
    <>
      <div className="qm-week-banner">
        <div className="qm-week-eyebrow">
          <span className="dot"/>
          <span>{weekId}{week.dateRange ? ' · ' : ''}</span>
          <ET
            value={week.dateRange || ''}
            placeholder="May 17 – May 23"
            editMode={editMode}
            className="mono"
            onChange={v => onUpdateWeek({ dateRange: v })}
          />
        </div>
        <h1 className="qm-week-title">
          <ET
            value={week.theme || week.label || ''}
            placeholder="Week theme…"
            editMode={editMode}
            onChange={v => onUpdateWeek({ theme: v })}
          />
        </h1>
        {(week.subtitle || editMode) && (
          <p className="qm-week-sub">
            <ET
              value={week.subtitle || ''}
              placeholder="English subtitle…"
              editMode={editMode}
              onChange={v => onUpdateWeek({ subtitle: v })}
            />
          </p>
        )}
      </div>

      <div className="qm-blocks">
        {window.CATEGORIES.map(cat => {
          const allCatItems = (week.items || {})[cat.id] || [];
          const quizItems = getQuizItems(allCatItems);
          const total  = quizItems.reduce((s, it) => s + getItemQuestions(it).length, 0);
          const done   = quizItems.reduce((s, it) => {
            const p = qmProg[`${weekId}_${it.id}`];
            return s + (p ? Math.min(p.done, getItemQuestions(it).length) : 0);
          }, 0);
          const pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
          const clickable = total > 0 || editMode;

          return (
            <div
              key={cat.id}
              className={`qm-block${!clickable ? ' empty' : ''}`}
              onClick={() => clickable && onEnterCat(cat)}
            >
              <div className="qm-block-icon" style={{ background: CAT_BG[cat.id] }}>
                {CAT_ICONS[cat.id]}
              </div>
              <div className="qm-block-content">
                <div className="qm-block-title">{cat.title}</div>
                <div className="qm-block-title-zh">{cat.titleZh}</div>
                {total > 0 ? (
                  <>
                    <div className="qm-block-count">{quizItems.length} units · {total} questions</div>
                    <div className="qm-block-progress">
                      <div className="qm-progress-bar">
                        <div className="qm-progress-fill" style={{ width: pct + '%' }}/>
                      </div>
                      <span className="qm-pct">{pct}%</span>
                    </div>
                  </>
                ) : editMode ? (
                  <div className="qm-block-count">{allCatItems.length} items · no quiz yet</div>
                ) : (
                  <div className="qm-block-empty">No quiz yet</div>
                )}
              </div>
              {editMode ? (
                <button
                  className="qm-edit-add-btn"
                  onClick={(e) => { e.stopPropagation(); onAddItem(cat.id); }}
                  title={`Add item to ${cat.title}`}
                >＋</button>
              ) : total > 0 ? (
                <div className="qm-block-arrow">›</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   CATEGORY VIEW — left sidebar + right quiz
   editMode=true → show all items (not just quiz-able), add/edit buttons
══════════════════════════════════════════════════════ */
function QuizModeCategoryView({ cat, items, weekId, onBack, editMode, onAddItem, onEditItem, onDeleteItem, onMoveItem, homework, onSetHomework, weekQuizItems }) {
  const [selectedItem, setSelectedItem] = useQM(null);
  const [phase,        setPhase]        = useQM('intro'); // 'intro' | 'flashcards' | 'quiz'
  const [flashItem,    setFlashItem]    = useQM(null);   // flashcard item to review
  const [playerKey,    setPlayerKey]    = useQM(0);

  const quizItems = useQMM(() => getQuizItems(items), [items]);
  // Edit mode: show ALL items so teacher can see & edit non-quiz types too
  const sidebarItems = editMode ? (items || []) : quizItems;

  const selectItem = (item) => {
    setSelectedItem(item);
    setPhase('intro');
    setFlashItem(null);
    setPlayerKey(k => k + 1);
  };

  const qmProg = loadQMProg();
  const hasSelection = !!selectedItem;

  return (
    <div className={`qm-cat-view${hasSelection ? ' has-selection' : ''}`}>

      {/* ── Left sidebar ── */}
      <div className="qm-sidebar">
        <button className="qm-sidebar-back" onClick={onBack}>
          <window.Icon name="arrow-left" size={14}/> All categories
        </button>

        <div className="qm-sidebar-cat">
          <span className="qm-sidebar-cat-icon" style={{ background: CAT_BG[cat.id] }}>
            {CAT_ICONS[cat.id]}
          </span>
          <div>
            <div className="qm-sidebar-cat-name">{cat.title}</div>
            <div className="qm-sidebar-cat-zh">{cat.titleZh}</div>
          </div>
        </div>

        <div className="qm-unit-list">
          {editMode && (
            <button className="qm-unit-add-btn" onClick={() => onAddItem(cat.id)}>
              <window.Icon name="plus" size={12}/> Add item
            </button>
          )}
          {sidebarItems.length === 0 && (
            <div className="qm-unit-empty">
              {editMode
                ? 'No items yet. Click "+ Add item" above!'
                : 'No quiz items yet.\nAsk your teacher to add some!'}
            </div>
          )}
          {sidebarItems.map(item => {
            const progKey  = `${weekId}_${item.id}`;
            const prog     = qmProg[progKey];
            const totalQ   = getItemQuestions(item).length;
            const scorePct = prog ? Math.round(prog.score / prog.total * 100) : null;
            const isDone   = !!prog;
            const isActive = selectedItem?.id === item.id;
            const isWriting = item.type === 'writing-practice';
            const hasQuiz  = totalQ > 0 || isWriting;
            const hw       = (homework || {})[item.id]; // { dueDate }
            const dueLabel = hw?.dueDate ? (() => {
              const d = new Date(hw.dueDate + 'T00:00:00');
              const diff = Math.ceil((d - new Date()) / 86400000);
              return diff > 0 ? `📌 ${diff}天` : diff === 0 ? '📌 今天到期' : '📌 已過期';
            })() : null;

            return (
              <div
                key={item.id}
                className={`qm-unit-row${isActive ? ' active' : ''}${isDone ? ' done' : ''}${!hasQuiz && !editMode ? ' disabled' : ''}`}
                onClick={() => (hasQuiz || editMode) && selectItem(item)}
              >
                <div className="qm-unit-row-info">
                  <div className="qm-unit-row-title">
                    {item.title}
                    {dueLabel && !editMode && <span className={`qm-hw-badge${isDone ? ' done' : ''}`}>{isDone ? '✓ 作業完成' : dueLabel}</span>}
                  </div>
                  <div className="qm-unit-row-meta">
                    {editMode ? (
                      <span className="qm-type-badge">{item.type}{totalQ > 0 ? ` · ${totalQ}q` : ''}</span>
                    ) : (
                      <>
                        {isWriting ? '✍ Writing Practice' : `${totalQ} questions`}
                        {scorePct !== null && !isWriting && <span className="qm-unit-score-badge">{scorePct}%</span>}
                      </>
                    )}
                  </div>
                </div>
                <div style={{display:'flex',gap:'4px',alignItems:'center',flexShrink:0}}>
                  {editMode ? (
                    <>
                      <div className="qm-unit-move-btns">
                        <button
                          className="qm-unit-move-btn"
                          onClick={(e) => { e.stopPropagation(); onMoveItem && onMoveItem(item.id, -1); }}
                          title="Move up"
                          disabled={sidebarItems.indexOf(item) === 0}
                        >▲</button>
                        <button
                          className="qm-unit-move-btn"
                          onClick={(e) => { e.stopPropagation(); onMoveItem && onMoveItem(item.id, 1); }}
                          title="Move down"
                          disabled={sidebarItems.indexOf(item) === sidebarItems.length - 1}
                        >▼</button>
                      </div>
                      <button
                        className={`qm-unit-hw-btn${hw ? ' active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hw) {
                            if (confirm(`取消「${item.title}」的本週作業？`)) onSetHomework(item.id, null);
                            return;
                          }
                          const dueDate = prompt('作業截止日 YYYY-MM-DD', getTodayInputValue(7));
                          if (dueDate) onSetHomework(item.id, { dueDate });
                        }}
                        title={hw ? `作業: ${hw.dueDate}` : '設為作業'}
                      >📌</button>
                      <button
                        className="qm-unit-edit-btn"
                        onClick={(e) => { e.stopPropagation(); onEditItem(item); }}
                        title="Edit item"
                      ><window.Icon name="edit" size={12}/></button>
                      <button
                        className="qm-unit-del-btn"
                        onClick={(e) => { e.stopPropagation(); if(confirm(`Delete "${item.title}"?`)) onDeleteItem(item.id); }}
                        title="Delete item"
                      ><window.Icon name="trash" size={12}/></button>
                    </>
                  ) : (
                    <span className={`qm-unit-row-status${isDone ? ' done' : ''}`}>
                      {isDone ? '✓' : hasQuiz ? '›' : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: intro / flashcards / quiz / placeholder ── */}
      <div className="qm-quiz-area">
        {!selectedItem ? (
          <div className="qm-placeholder">
            <div className="qm-placeholder-icon">👈</div>
            <div className="qm-placeholder-msg">Select a unit to start</div>
            <div className="qm-placeholder-sub">選擇一個單元開始練習</div>
          </div>
        ) : selectedItem && editMode && getItemQuestions(selectedItem).length === 0 ? (
          <div className="qm-placeholder">
            <div className="qm-placeholder-icon">📝</div>
            <div className="qm-placeholder-msg">{selectedItem.title}</div>
            <div className="qm-placeholder-sub">Type: {selectedItem.type} · No quiz questions yet</div>
            <button className="qm-btn secondary" style={{marginTop:'16px'}} onClick={() => onEditItem(selectedItem)}>
              ✎ Edit this item
            </button>
          </div>
        ) : selectedItem?.type === 'writing-practice' ? (
          <WritingPracticePlayer
            item={selectedItem}
            catItems={items || []}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setSelectedItem(null)}
          />
        ) : phase === 'intro' ? (
          <QuizIntroScreen
            item={selectedItem}
            questions={getItemQuestions(selectedItem)}
            catItems={items || []}
            onFlashcards={(fi) => { setFlashItem(fi); setPhase('flashcards'); }}
            onStartQuiz={() => setPhase('quiz')}
          />
        ) : phase === 'flashcards' && flashItem ? (
          <div className="qm-fc-player-wrap">
            <div className="qm-fc-player-bar">
              <span className="qm-fc-player-title">{flashItem.title}</span>
              <button className="qm-btn primary" style={{padding:'7px 18px',fontSize:13}} onClick={() => setPhase('quiz')}>
                開始測驗 →
              </button>
            </div>
            <window.FlashcardPlayer
              item={flashItem}
              onComplete={() => setPhase('quiz')}
            />
          </div>
        ) : (
          <QuizModePlayer
            key={playerKey}
            cat={cat}
            item={selectedItem}
            questions={getItemQuestions(selectedItem)}
            progressKey={`${weekId}_${selectedItem.id}`}
            weekId={weekId}
            allQuizItems={weekQuizItems || quizItems}
            onBack={() => setPhase('intro')}
          />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PRE-QUIZ INTRO SCREEN
══════════════════════════════════════════════════════ */
function QuizIntroScreen({ item, questions, catItems, onFlashcards, onStartQuiz }) {
  // If this quiz/fillblank has a linked flashcard, show only that one.
  // Otherwise show all available flashcard items.
  const linkedFcItem = item.linkedFlashcardId
    ? (catItems || []).find(it => it.id === item.linkedFlashcardId && it.type === 'flashcard')
    : null;
  const fcItems = linkedFcItem
    ? [linkedFcItem]
    : (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0);

  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">
        {item.type === 'vocab-quiz' ? '📚' : item.type === 'fillblank' ? '✏️' : '📝'}
      </div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{questions.length} questions</div>
      <div className="qm-intro-btns">
        {fcItems.length > 0 && (
          <div className="qm-intro-fc-group">
            <div className="qm-intro-fc-label">📖 先複習單字卡 · Review first</div>
            {fcItems.map(fc => (
              <button key={fc.id} className="qm-btn secondary qm-intro-fc-btn" onClick={() => onFlashcards(fc)}>
                {fc.title} <span className="qm-intro-fc-count">({(fc.cards||[]).length} 張)</span>
              </button>
            ))}
          </div>
        )}
        <button className="qm-btn primary" onClick={onStartQuiz}>
          開始測驗 · Start Quiz →
        </button>
      </div>
    </div>
  );
}

function WritingFeedback({ text }) {
  const lines = text.split('\n');
  const elements = [];
  let inExamples = false;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { inExamples = false; elements.push(<div key={i} className="wf-spacer"/>); return; }

    if (trimmed.startsWith('文法')) {
      const isCorrect = /CORRECT/i.test(trimmed) && !/INCORRECT/i.test(trimmed);
      elements.push(
        <div key={i} className={`wf-verdict ${isCorrect ? 'correct' : 'incorrect'}`}>
          <span className="wf-verdict-icon">{isCorrect ? '✓' : '✗'}</span>
          <span className="wf-verdict-label">文法</span>
          <span className="wf-verdict-val">{isCorrect ? 'CORRECT' : 'INCORRECT'}</span>
        </div>
      );
      return;
    }
    if (trimmed.startsWith('意思')) {
      const val = trimmed.replace(/^意思\s*/, '');
      elements.push(<div key={i} className="wf-row"><span className="wf-key">意思</span><span className="wf-val meaning">{val}</span></div>);
      return;
    }
    if (trimmed.startsWith('修正')) {
      const val = trimmed.replace(/^修正\s*/, '');
      elements.push(<div key={i} className="wf-row"><span className="wf-key">修正</span><span className="wf-val correction">{val}</span></div>);
      return;
    }
    if (trimmed.startsWith('改進')) {
      const val = trimmed.replace(/^改進\s*/, '');
      elements.push(<div key={i} className="wf-row"><span className="wf-key improve">改進</span><span className="wf-val improve-val">{val}</span></div>);
      return;
    }
    if (trimmed === '範例') {
      inExamples = true;
      elements.push(<div key={i} className="wf-examples-title">範例</div>);
      return;
    }
    if (trimmed.startsWith('·') || trimmed.startsWith('•')) {
      const val = trimmed.replace(/^[·•]\s*/, '');
      elements.push(<div key={i} className="wf-example-row"><span className="wf-bullet">·</span><span>{val}</span></div>);
      return;
    }
    if (trimmed.startsWith('評分')) {
      const stars = trimmed.replace(/^評分\s*/, '');
      elements.push(<div key={i} className="wf-score"><span className="wf-key">評分</span><span className="wf-stars">{stars}</span></div>);
      return;
    }
    // encouragement / other text
    elements.push(<div key={i} className="wf-encourage">{trimmed}</div>);
  });

  return <div className="qm-writing-feedback wf-card">{elements}</div>;
}

function WritingPractice({ item }) {
  const words = useQMM(() => {
    if (item?.type === 'vocab-quiz') return (item.words || []).map(w => w.en).filter(Boolean);
    if (item?.type === 'fillblank') return (item.questions || []).map(q => q.answer).filter(Boolean);
    return [];
  }, [item]);
  const [word, setWord] = useQM(words[0] || item?.title || '');
  const [sentence, setSentence] = useQM('');
  const [feedback, setFeedback] = useQM('');
  const [checking, setChecking] = useQM(false);

  React.useEffect(() => { setWord(words[0] || item?.title || ''); setSentence(''); setFeedback(''); }, [item?.id]);
  if (!words.length && !item?.title) return null;

  const submit = async () => {
    setChecking(true);
    setFeedback('');
    const result = await window.checkWriting(word, sentence);
    setFeedback(result);
    setChecking(false);
  };

  return (
    <div className="qm-writing">
      <div className="qm-writing-head">
        <span>AI 造句批改</span>
        <small>Use the word in one sentence</small>
      </div>
      {words.length > 0 && (
        <div className="qm-word-chips">
          {words.slice(0, 8).map(w => (
            <button key={w} className={w === word ? 'active' : ''} onClick={() => setWord(w)}>{w}</button>
          ))}
        </div>
      )}
      <textarea
        className="qm-writing-input"
        value={sentence}
        onChange={e => setSentence(e.target.value)}
        placeholder={`Write a sentence with "${word}"...`}
      />
      <button className="qm-btn secondary qm-writing-btn" onClick={submit} disabled={checking || !sentence.trim()}>
        {checking ? '批改中...' : '送出批改'}
      </button>
      {feedback && <WritingFeedback text={feedback} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   QUICK FLASHCARD REVIEW
══════════════════════════════════════════════════════ */
function QuickFlashcardReview({ item, onDone }) {
  const cards = useQMM(() => shuffleArr(getFlashcardData(item)), [item]);
  const [idx,     setIdx]     = useQM(0);
  const [flipped, setFlipped] = useQM(false);

  if (cards.length === 0) { onDone(); return null; }

  const card   = cards[idx];
  const isLast = idx === cards.length - 1;
  const pct    = Math.round(idx / cards.length * 100);

  const next = () => {
    if (isLast) { onDone(); }
    else { setIdx(i => i + 1); setFlipped(false); }
  };

  return (
    <div className="qm-fc-wrap">
      {/* Header */}
      <div className="qm-fc-header">
        <div className="qm-player-bar" style={{flex:1,marginRight:16}}>
          <div className="qm-player-fill" style={{width: pct + '%'}}/>
        </div>
        <span className="qm-player-counter">{idx + 1} / {cards.length}</span>
        <button className="qm-btn secondary" style={{marginLeft:16,padding:'6px 14px',fontSize:12}} onClick={onDone}>
          跳過 → 開始測驗
        </button>
      </div>

      {/* Card */}
      <div className={`qm-fc-card${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(f => !f)}>
        <div className="qm-fc-side qm-fc-front">
          <div className="qm-fc-text">{card.front}</div>
          <div className="qm-fc-tap">點擊翻面 · tap to flip</div>
        </div>
        <div className="qm-fc-side qm-fc-back">
          <div className="qm-fc-text">{card.back}</div>
        </div>
      </div>

      {/* Next button — only visible after flip */}
      {flipped && (
        <div style={{textAlign:'center'}}>
          <button className="qm-btn primary" style={{width:'auto',minWidth:160}} onClick={next}>
            {isLast ? '完成！開始測驗 →' : '下一張 →'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   QUIZ PLAYER
══════════════════════════════════════════════════════ */
function QuizModePlayer({ cat, item, questions, progressKey, weekId, allQuizItems, onBack }) {
  const [idx,       setIdx]      = useQM(0);
  const [selected,  setSelected] = useQM(null);
  const [score,     setScore]    = useQM(0);
  const [screen,    setScreen]   = useQM('quiz');
  const [wrongList, setWrongList]= useQM([]);

  const q     = questions[idx];
  const total = questions.length;
  const pct   = Math.round(idx / total * 100);
  const isLast= idx === total - 1;

  if (!q) return null;

  const handleSelect = (optIdx) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const correct = optIdx === q.correct;
    if (window.playSound) window.playSound(correct ? 'correct' : 'wrong');
    if (correct) setScore(s => s + 1);
    else setWrongList(prev => [...prev, q]);
  };

  const handleNext = () => {
    if (isLast) {
      const finalScore = score + (selected === q.correct ? 1 : 0);
      // Save progress
      const prev = loadQMProg();
      prev[progressKey] = { done: total, score: finalScore, total, ts: Date.now() };
      saveQMProg(prev);
      if (window.playSound) window.playSound('complete');
      const allWeekQuizDone = (allQuizItems || []).every(it => prev[`${weekId}_${it.id}`]);
      // Firestore sync
      const u = window._currentUser;
      if (u && window.saveProgressItem) {
        window.saveProgressItem(u.uid, u.displayName || '', u.email || '', progressKey, {
          done: Date.now(),
          score: Math.round(finalScore / total * 100),
          wrongQuestions: wrongList.map(wq => ({ q: wq.q, answer: wq.options[wq.correct] })),
          wrongCount: wrongList.length,
        });
      }
      if (window._onQuizComplete) {
        window._onQuizComplete(finalScore, total, wrongList, {
          weekId,
          itemId: progressKey,
          itemTitle: item?.title || '',
          allWeekQuizDone,
        });
      }
      setScreen('result');
    } else {
      setIdx(i => i + 1);
      setSelected(null);
    }
  };

  const restart = () => {
    setIdx(0); setSelected(null); setScore(0); setScreen('quiz'); setWrongList([]);
  };

  /* ── Result ── */
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
        <div className="qm-result-cat-title">{item?.title || cat.title}</div>
        <div className="qm-result-score">
          <span className="qm-result-num">{finalScore}</span>
          <span className="qm-result-denom"> / {total}</span>
        </div>
        <div className="qm-result-pct">{finalPct}% correct</div>
        <div className="qm-result-msg">{msg}</div>
        <div className="qm-result-btns">
          <button className="qm-btn secondary" onClick={restart}>再試一次</button>
          <button className="qm-btn primary"   onClick={onBack}>← Back</button>
        </div>
        {wrongList.length > 0 && (
          <div className="qm-wrong-list">
            <div className="qm-wrong-title">需要複習 · Review ({wrongList.length})</div>
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

  /* ── Quiz ── */
  return (
    <div className="qm-player-shell">
      <div className="qm-player-head">
        <button className="qm-back-btn" onClick={onBack} title="Back to units">
          <window.Icon name="close" size={16}/>
        </button>
        <div className="qm-player-bar-wrap">
          <div className="qm-player-bar">
            <div className="qm-player-fill" style={{ width: pct + '%' }}/>
          </div>
        </div>
        <span className="qm-player-counter">{idx + 1} / {total}</span>
      </div>

      <div className="qm-question-area">
        {q.hint && <div className="qm-question-hint">{q.hint}</div>}
        <div className="qm-question-text">{q.q}</div>
      </div>

      <div className="qm-options">
        {q.options.map((opt, i) => {
          let cls = 'qm-option';
          if (selected !== null) {
            if (i === q.correct) cls += ' correct';
            else if (i === selected) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)}>
              <span className="qm-opt-letter">{['A','B','C','D'][i]}</span>
              <span className="qm-opt-text">{opt}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="qm-feedback">
          <div className={`qm-feedback-banner ${selected === q.correct ? 'correct' : 'wrong'}`}>
            {selected === q.correct ? '✓ Correct! 答對了！' : `✗ The answer is: ${q.options[q.correct]}`}
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

/* ══════════════════════════════════════════════════════
   WRITING PRACTICE PLAYER
══════════════════════════════════════════════════════ */
function WritingPracticePlayer({ item, catItems, progressKey, onBack }) {
  // Get words from linked flashcard
  const words = useQMM(() => {
    const allFc = (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0);
    // Try linked flashcard first, then fall back to first available
    const fc = item.linkedFlashcardId
      ? (allFc.find(it => it.id === item.linkedFlashcardId) || allFc[0])
      : allFc[0];
    if (!fc) return [];
    return (fc.cards || []).map(c => ({
      word: c.term || c.front || c.en || '',
      zh: c.zh || c.back || '',
    })).filter(c => c.word.trim());
  }, [item, catItems]);

  const [idx, setIdx]           = useQM(0);
  const [sentence, setSentence] = useQM('');
  const [feedback, setFeedback] = useQM('');
  const [checking, setChecking] = useQM(false);
  const [scores, setScores]     = useQM([]); // array of star counts (1-5)
  const [done, setDone]         = useQM(false);

  const current = words[idx];
  const total   = words.length;

  const extractStars = (text) => {
    const m = text.match(/[★☆]{1,5}/);
    if (!m) return 3;
    return (m[0].match(/★/g) || []).length;
  };

  const submit = async () => {
    if (!sentence.trim()) return;
    setChecking(true);
    setFeedback('');
    const result = await window.checkWriting(current.word, sentence);
    setFeedback(result);
    const stars = extractStars(result);
    setScores(prev => [...prev, stars]);
    setChecking(false);
  };

  const next = () => {
    if (idx + 1 >= total) { setDone(true); return; }
    setIdx(idx + 1);
    setSentence('');
    setFeedback('');
  };

  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const avgDisplay = scores.length ? avg.toFixed(1) : '—';

  if (!words.length) return (
    <div className="wp-empty">
      <div className="wp-empty-icon">✍</div>
      <div className="wp-empty-msg">找不到單字卡</div>
      <div className="wp-empty-sub">請在編輯模式中為此練習綁定一組單字卡</div>
    </div>
  );

  if (done) return (
    <div className="wp-done">
      <div className="wp-done-icon">✦</div>
      <div className="wp-done-title">Writing Practice Complete</div>
      <div className="wp-done-sub">已完成 {total} 個單字造句</div>
      <div className="wp-done-score">
        <span className="wp-done-avg">{avgDisplay}</span>
        <span className="wp-done-maxstar"> / 5 ★</span>
      </div>
      <div className="wp-done-breakdown">
        {words.map((w, i) => (
          <div key={i} className="wp-done-row">
            <span className="wp-done-word">{w.word}</span>
            <span className="wp-done-stars">{'★'.repeat(scores[i] || 0)}{'☆'.repeat(5 - (scores[i] || 0))}</span>
          </div>
        ))}
      </div>
      <button className="qm-btn secondary" onClick={onBack} style={{marginTop:20}}>← 返回</button>
    </div>
  );

  return (
    <div className="wp-player">
      <div className="wp-progress-bar">
        <div className="wp-progress-fill" style={{width: `${(idx / total) * 100}%`}}/>
      </div>
      <div className="wp-header">
        <button className="wp-back" onClick={onBack}>←</button>
        <span className="wp-counter">{idx + 1} / {total}</span>
        <span className="wp-avg">{scores.length > 0 ? `avg ${avgDisplay}★` : ''}</span>
      </div>
      <div className="wp-card">
        <div className="wp-instruction">Use the word in a sentence</div>
        <div className="wp-word">{current.word}</div>
        <div className="wp-rules">
          <span>· Must clearly express the word's meaning</span>
          <span>· At least 7 words</span>
        </div>
      </div>
      <textarea
        className="qm-writing-input wp-input"
        value={sentence}
        onChange={e => setSentence(e.target.value)}
        placeholder={`Write a sentence using "${current.word}"…`}
        disabled={!!feedback}
      />
      {!feedback ? (
        <button className="qm-btn primary wp-submit" onClick={submit} disabled={checking || !sentence.trim()}>
          {checking ? '批改中…' : '送出批改 →'}
        </button>
      ) : (
        <>
          <WritingFeedback text={feedback} />
          <button className="qm-btn primary wp-next" onClick={next}>
            {idx + 1 >= total ? '完成 ✦' : '下一個單字 →'}
          </button>
        </>
      )}
    </div>
  );
}

Object.assign(window, { QuizModeBlocks, QuizModeCategoryView, QuizModePlayer, getItemQuestions, getQuizItems, WritingPracticePlayer });
