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
      return { q: qText, hint: 'Fill in the blank · 選出正確答案', options, correct, explain: q.explain || '' };
    }).filter(Boolean);
    return shuffleArr(mapped);
  }
  if (item.type === 'quiz' && (item.questions || []).length > 0) {
    const mapped = item.questions
      .filter(q => (q.options || []).length >= 2)
      .map(q => {
        const savedCorrect = q.answer !== undefined ? q.answer : 0;
        const correctText = typeof savedCorrect === 'number'
          ? q.options[savedCorrect]
          : savedCorrect;
        const shuffled = shuffleArr([...q.options]);           // shuffle options
        const newCorrect = shuffled.indexOf(correctText);      // find new index
        // Strip leading question numbers like "1. " / "1) " / "（1）"
        const qText = (q.q || q.text || '').replace(/^[\(（]?\d+[\)）\.\s、：:]+\s*/, '');
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
    (item.type === 'writing-practice' && item.linkedFlashcardId) ||
    (item.type === 'type-answer'      && (item.pairs || []).length >= 1) ||
    (item.type === 'short-answer'     && (item.saQuestions || []).length >= 1) ||
    (item.type === 'syllable-div'     && (item.sdWords || []).length >= 1) ||
    (item.type === 'word-sort'        && (item.sortWords || []).length >= 1 && (item.sortCategories || []).length >= 2)
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
function QuizModeBlocks({ week, weekId, onEnterCat, editMode, onUpdateWeek, onAddItem, categories }) {
  const activeCats = categories || window.CATEGORIES;
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
        {activeCats.map(cat => {
          const allCatItems = (week.items || {})[cat.id] || [];
          const quizItems = getQuizItems(allCatItems);
          // For special item types (non-MC), use their own word/question count
          const getItemTotal = (item) => {
            if (item.type === 'type-answer')  return (item.pairs || []).length;
            if (item.type === 'short-answer') return (item.saQuestions || []).length;
            if (item.type === 'syllable-div') return (item.sdWords || []).length;
            if (item.type === 'word-sort')    return (item.sortWords || []).length;
            if (item.type === 'writing-practice') return 1; // counts as 1 unit
            return getItemQuestions(item).length;
          };
          const total  = quizItems.reduce((s, it) => s + getItemTotal(it), 0);
          const done   = quizItems.reduce((s, it) => {
            const p = qmProg[`${weekId}_${it.id}`];
            return s + (p ? Math.min(p.done || 0, getItemTotal(it)) : 0);
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
                    <div className="qm-block-count">{quizItems.length} units · {total} {quizItems.some(it => it.type === 'syllable-div' || it.type === 'type-answer') ? 'words' : 'questions'}</div>
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
  const [progVersion,  setProgVersion]  = useQM(0);      // bumped after quiz completes → refreshes sidebar scores

  const quizItems = useQMM(() => getQuizItems(items), [items]);
  // Edit mode: show ALL items so teacher can see & edit non-quiz types too
  const sidebarItems = editMode ? (items || []) : quizItems;

  const selectItem = (item) => {
    setSelectedItem(item);
    setPhase('intro');
    setFlashItem(null);
    setPlayerKey(k => k + 1);
  };

  // Re-read localStorage every time a quiz finishes (progVersion bumps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const qmProg = useQMM(() => loadQMProg(), [progVersion]);
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
            const isWriting      = item.type === 'writing-practice';
            const isTypeAnswer   = item.type === 'type-answer';
            const isShortAnswer  = item.type === 'short-answer';
            const isSyllableDiv  = item.type === 'syllable-div';
            const isWordSort     = item.type === 'word-sort';
            const hasQuiz  = totalQ > 0 || isWriting || isTypeAnswer || isShortAnswer || isSyllableDiv || isWordSort;
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
                        {isWriting ? '✍ Writing Practice' : isTypeAnswer ? `⌨ ${(item.pairs||[]).length} words` : isShortAnswer ? `📖 ${(item.saQuestions||[]).length} questions` : isSyllableDiv ? `✂️ ${(item.sdWords||[]).length} words` : isWordSort ? `🗂 ${(item.sortWords||[]).length} words` : `${totalQ} questions`}
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
        ) : selectedItem?.type === 'type-answer' && phase === 'quiz' ? (
          <TypeAnswerPlayer
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'type-answer' && phase === 'intro' ? (
          <TypeAnswerIntro item={selectedItem} onStart={() => setPhase('quiz')} />
        ) : selectedItem?.type === 'writing-practice' && phase === 'quiz' ? (
          <WritingPracticePlayer
            item={selectedItem}
            catItems={items || []}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'writing-practice' && phase === 'intro' ? (
          <WritingPracticeIntro
            item={selectedItem}
            catItems={items || []}
            onStart={() => setPhase('quiz')}
          />
        ) : selectedItem?.type === 'short-answer' && phase === 'quiz' ? (
          <ShortAnswerPlayer
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'short-answer' && phase === 'intro' ? (
          <ShortAnswerIntro
            item={selectedItem}
            onStart={() => setPhase('quiz')}
          />
        ) : selectedItem?.type === 'syllable-div' && phase === 'quiz' ? (
          <SyllableDivPlayer
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'syllable-div' && phase === 'intro' ? (
          <SyllableDivIntro
            item={selectedItem}
            onStart={() => setPhase('quiz')}
          />
        ) : selectedItem?.type === 'word-sort' && phase === 'quiz' ? (
          <WordSortPlayer
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'word-sort' && phase === 'intro' ? (
          <WordSortIntro
            item={selectedItem}
            onStart={() => setPhase('quiz')}
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
            onQuizDone={() => setProgVersion(v => v + 1)}
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

// Render **bold** markdown inline
function renderMd(text) {
  if (!text || !text.includes('**')) return text;
  return text.split(/(\*\*.*?\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function WritingFeedback({ text }) {
  const lines = text.split('\n');
  const elements = [];
  let inExamples = false;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { inExamples = false; elements.push(<div key={i} className="wf-spacer"/>); return; }

    // ── Writing-practice format ──────────────────────────
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
      elements.push(<div key={i} className="wf-row"><span className="wf-key improve">改進</span><span className="wf-val improve-val">{renderMd(val)}</span></div>);
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

    // ── Short-answer format ──────────────────────────────
    if (trimmed.startsWith('理解')) {
      const rest = trimmed.replace(/^理解\s*/, '');
      const isCorrect = /CORRECT/i.test(rest) && !/INCORRECT/i.test(rest) && !/PARTIAL/i.test(rest);
      const isPartial = /PARTIAL/i.test(rest);
      const cls = isCorrect ? 'correct' : isPartial ? 'partial' : 'incorrect';
      const icon = isCorrect ? '✓' : isPartial ? '△' : '✗';
      const label = isCorrect ? 'CORRECT' : isPartial ? 'PARTIAL' : 'INCORRECT';
      elements.push(
        <div key={i} className={`wf-verdict ${cls}`}>
          <span className="wf-verdict-icon">{icon}</span>
          <span className="wf-verdict-label">理解度</span>
          <span className="wf-verdict-val">{label}</span>
        </div>
      );
      return;
    }
    if (trimmed.startsWith('建議')) {
      const val = trimmed.replace(/^建議\s*/, '');
      elements.push(
        <div key={i} className="wf-tip">
          <span className="wf-tip-icon">💡</span>
          <span className="wf-tip-text">{renderMd(val)}</span>
        </div>
      );
      return;
    }

    // ── Shared ───────────────────────────────────────────
    if (trimmed.startsWith('評分')) {
      const stars = trimmed.replace(/^評分\s*/, '');
      elements.push(
        <div key={i} className="wf-score">
          <span className="wf-key">評分</span>
          <span className="wf-stars">{stars}</span>
        </div>
      );
      return;
    }

    // Encouragement line — strip surrounding parentheses if present
    const encourage = trimmed.replace(/^\(?(.*?)\)?$/, '$1');
    elements.push(<div key={i} className="wf-encourage">{renderMd(encourage)}</div>);
  });

  return <div className="qm-writing-feedback wf-card">{elements}</div>;
}

/* ══════════════════════════════════════════════════════
   TYPE-ANSWER INTRO
══════════════════════════════════════════════════════ */
function TypeAnswerIntro({ item, onStart }) {
  const count = (item.pairs || []).length;
  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">⌨</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{count} words</div>
      <div className="qm-intro-rules">
        {item.instruction && (
          <div className="qm-intro-rule-row"><span>📋</span><span>{item.instruction}</span></div>
        )}
        <div className="qm-intro-rule-row"><span>✏️</span><span>看到提示單字，自己打出正確答案</span></div>
        <div className="qm-intro-rule-row"><span>✅</span><span>不分大小寫，拼對就算對</span></div>
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>
          開始練習 · Start →
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TYPE-ANSWER PLAYER
══════════════════════════════════════════════════════ */
function TypeAnswerPlayer({ item, progressKey, onBack }) {
  const pairs = useQMM(() => shuffleArr(item.pairs || []), [item.id]);
  const [idx,      setIdx]      = useQM(0);
  const [input,    setInput]    = useQM('');
  const [result,   setResult]   = useQM(null); // null | 'correct' | 'wrong'
  const [score,    setScore]    = useQM(0);
  const [screen,   setScreen]   = useQM('play'); // 'play' | 'done'
  const inputRef = React.useRef(null);

  const total   = pairs.length;
  const current = pairs[idx];
  const pct     = Math.round(idx / total * 100);

  React.useEffect(() => {
    if (result === null && inputRef.current) inputRef.current.focus();
  }, [idx, result]);

  const check = () => {
    if (!input.trim()) return;
    const correct = input.trim().toLowerCase() === (current.answer || '').trim().toLowerCase();
    setResult(correct ? 'correct' : 'wrong');
    if (correct) {
      setScore(s => s + 1);
      if (window.playSound) window.playSound('correct');
    } else {
      if (window.playSound) window.playSound('wrong');
    }
  };

  const next = () => {
    if (idx + 1 >= total) {
      const finalScore = score + (result === 'correct' ? 1 : 0);
      const prev = loadQMProg();
      prev[progressKey] = { done: total, score: finalScore, total, ts: Date.now() };
      saveQMProg(prev);
      if (window.playSound) window.playSound('complete');
      setScreen('done');
    } else {
      setIdx(i => i + 1);
      setInput('');
      setResult(null);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') { result === null ? check() : next(); }
  };

  /* ── Done screen ── */
  if (screen === 'done') {
    const finalScore = score;
    const finalPct   = Math.round(finalScore / total * 100);
    const emoji = finalPct === 100 ? '🏆' : finalPct >= 80 ? '🎉' : finalPct >= 60 ? '👍' : '💪';
    return (
      <div className="qm-result">
        <div className="qm-result-emoji">{emoji}</div>
        <div className="qm-result-cat-title">{item.title}</div>
        <div className="qm-result-score">
          <span className="qm-result-num">{finalScore}</span>
          <span className="qm-result-denom"> / {total}</span>
        </div>
        <div className="qm-result-pct">{finalPct}% correct</div>
        <div className="qm-result-btns">
          <button className="qm-btn secondary" onClick={() => { setIdx(0); setInput(''); setResult(null); setScore(0); setScreen('play'); }}>再試一次</button>
          <button className="qm-btn primary"   onClick={onBack}>← Back</button>
        </div>
      </div>
    );
  }

  /* ── Play screen ── */
  return (
    <div className="qm-player-shell">
      <div className="qm-player-head">
        <button className="qm-back-btn" onClick={onBack}><window.Icon name="close" size={16}/></button>
        <div className="qm-player-bar-wrap">
          <div className="qm-player-bar">
            <div className="qm-player-fill" style={{width: pct + '%'}}/>
          </div>
        </div>
        <span className="qm-player-counter">{idx + 1} / {total}</span>
      </div>

      <div className="qm-question-area">
        {item.instruction && <div className="qm-question-hint">{item.instruction}</div>}
        <div className="ta-prompt">{current?.prompt}</div>
      </div>

      <div className="ta-input-wrap">
        <input
          ref={inputRef}
          className={`ta-input${result === 'correct' ? ' correct' : result === 'wrong' ? ' wrong' : ''}`}
          value={input}
          onChange={e => { if (result === null) setInput(e.target.value); }}
          onKeyDown={handleKey}
          placeholder="Type your answer…"
          disabled={result !== null}
          autoComplete="off" autoCapitalize="none" spellCheck={false}
        />
        {result === 'wrong' && (
          <div className="ta-correct-ans">✓ {current.answer}</div>
        )}
      </div>

      <div className="qm-feedback" style={{marginTop: result ? 8 : 0}}>
        {result === null ? (
          <button className="qm-btn primary" onClick={check} disabled={!input.trim()}>
            確認 · Check →
          </button>
        ) : (
          <>
            <div className={`qm-feedback-banner ${result}`}>
              {result === 'correct' ? '✓ Correct! 答對了！' : `✗ The answer is: ${current.answer}`}
            </div>
            <button className="qm-btn primary" onClick={next}>
              {idx + 1 >= total ? '查看成績 →' : '下一題 →'}
            </button>
          </>
        )}
      </div>
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
function QuizModePlayer({ cat, item, questions, progressKey, weekId, allQuizItems, onBack, onQuizDone }) {
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
      // score state is already updated by handleSelect (no need to add last Q again)
      const finalScore = score;
      // Save progress
      const prev = loadQMProg();
      prev[progressKey] = { done: total, score: finalScore, total, ts: Date.now() };
      saveQMProg(prev);
      if (window.playSound) window.playSound('complete');
      const finalPctCalc = Math.round(finalScore / total * 100);
      if (finalPctCalc >= 70 && window.triggerStarBurst) window.triggerStarBurst();
      if (onQuizDone) onQuizDone(); // refreshes sidebar scores immediately
      const allWeekQuizDone = (allQuizItems || []).every(it => prev[`${weekId}_${it.id}`]);
      // Firestore sync
      const u = window._currentUser;
      if (u && window.saveProgressItem) {
        window.saveProgressItem(u.uid, u.displayName || '', u.email || '', progressKey, {
          done: Date.now(),
          score: finalPctCalc,
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
   WRITING PRACTICE INTRO
══════════════════════════════════════════════════════ */
function WritingPracticeIntro({ item, catItems, onStart }) {
  const allFc = (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0);
  const fc = item.linkedFlashcardId
    ? (allFc.find(it => it.id === item.linkedFlashcardId) || allFc[0])
    : allFc[0];
  const wordCount = fc ? (fc.cards || []).filter(c => (c.term || c.front || c.en || '').trim()).length : 0;

  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">✍</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{wordCount} words · AI 造句批改</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>📝</span><span>每個單字造一個英文句子</span></div>
        <div className="qm-intro-rule-row"><span>📏</span><span>至少 7 個字</span></div>
        <div className="qm-intro-rule-row"><span>✅</span><span>必須正確表達單字的意思</span></div>
        <div className="qm-intro-rule-row"><span>⭐</span><span>AI 評分，最高 5 顆星</span></div>
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>
          開始練習 · Start Writing →
        </button>
      </div>
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

/* ══════════════════════════════════════════════════════
   SHORT ANSWER — INTRO
══════════════════════════════════════════════════════ */
function ShortAnswerIntro({ item, onStart }) {
  const qCount = (item.saQuestions || []).length;
  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">📖</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{qCount} 題短答 · AI 閱讀理解批改</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>📄</span><span>先閱讀文章，再回答問題</span></div>
        <div className="qm-intro-rule-row"><span>✍</span><span>用英文打字回答，盡量完整</span></div>
        <div className="qm-intro-rule-row"><span>⭐</span><span>AI 評分，每題最高 3 顆星</span></div>
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>
          開始作答 · Start →
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SHORT ANSWER — PLAYER
══════════════════════════════════════════════════════ */
function ShortAnswerPlayer({ item, progressKey, onBack }) {
  const questions   = item.saQuestions || [];
  const passage     = item.passage || '';

  const [idx, setIdx]                   = useQM(0);
  const [answer, setAnswer]             = useQM('');
  const [feedback, setFeedback]         = useQM('');
  const [checking, setChecking]         = useQM(false);
  const [scores, setScores]             = useQM([]);
  const [done, setDone]                 = useQM(false);
  const [passageOpen, setPassageOpen]   = useQM(true);

  const current = questions[idx];
  const total   = questions.length;

  const extractStars = (text) => {
    const m = text.match(/[★☆]{1,3}/);
    if (!m) return 2;
    return (m[0].match(/★/g) || []).length;
  };

  const submit = async () => {
    if (!answer.trim()) return;
    setChecking(true);
    setFeedback('');
    const result = await window.checkShortAnswer(
      current.question, current.keyPoints || '', passage, answer
    );
    setFeedback(result);
    setScores(prev => [...prev, extractStars(result)]);
    setChecking(false);
  };

  const next = () => {
    if (idx + 1 >= total) { setDone(true); return; }
    setIdx(idx + 1);
    setAnswer('');
    setFeedback('');
  };

  const avg = scores.length ? (scores.reduce((a,b)=>a+b,0) / scores.length) : 0;

  if (!questions.length) return (
    <div className="wp-empty">
      <div className="wp-empty-icon">📖</div>
      <div className="wp-empty-msg">尚無問題</div>
      <div className="wp-empty-sub">請在編輯模式中新增問題</div>
    </div>
  );

  if (done) return (
    <div className="wp-done">
      <div className="wp-done-icon">✦</div>
      <div className="wp-done-title">Reading Complete!</div>
      <div className="wp-done-sub">已完成 {total} 題閱讀理解</div>
      <div className="wp-done-score">
        <span className="wp-done-avg">{avg.toFixed(1)}</span>
        <span className="wp-done-maxstar"> / 3 ★</span>
      </div>
      <div className="wp-done-breakdown">
        {questions.map((q, i) => (
          <div key={i} className="wp-done-row">
            <span className="wp-done-word" style={{flex:1,textAlign:'left',fontSize:12}}>{q.question}</span>
            <span className="wp-done-stars">{'★'.repeat(scores[i]||0)}{'☆'.repeat(3-(scores[i]||0))}</span>
          </div>
        ))}
      </div>
      <button className="qm-btn secondary" onClick={onBack} style={{marginTop:20}}>← 返回</button>
    </div>
  );

  return (
    <div className="wp-player sa-player">
      <div className="wp-progress-bar">
        <div className="wp-progress-fill" style={{width:`${(idx/total)*100}%`}}/>
      </div>
      <div className="wp-header">
        <button className="wp-back" onClick={onBack}>←</button>
        <span className="wp-counter">{idx+1} / {total}</span>
        {passage && (
          <button className="sa-toggle" onClick={() => setPassageOpen(v=>!v)}>
            {passageOpen ? '收起文章 ▲' : '展開文章 ▼'}
          </button>
        )}
      </div>

      {passage && passageOpen && (
        <div className="sa-passage">{passage}</div>
      )}

      <div className="wp-card">
        <div className="wp-instruction">Question {idx+1}</div>
        <div className="sa-question">{current.question}</div>
      </div>

      <textarea
        className="qm-writing-input wp-input sa-input"
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Write your answer here…"
        disabled={!!feedback}
        rows={4}
      />

      {!feedback ? (
        <button className="qm-btn primary wp-submit" onClick={submit} disabled={checking || !answer.trim()}>
          {checking ? '批改中…' : '送出答案 →'}
        </button>
      ) : (
        <>
          <WritingFeedback text={feedback}/>
          <button className="qm-btn primary wp-next" onClick={next}>
            {idx+1 >= total ? '完成 ✦' : '下一題 →'}
          </button>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SYLLABLE DIVISION — INTRO
══════════════════════════════════════════════════════ */
function SyllableDivIntro({ item, onStart }) {
  const count = (item.sdWords || []).length;
  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">✂️</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{count} words · 音節切割練習</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>👀</span><span>看到單字，找出音節切割點</span></div>
        <div className="qm-intro-rule-row"><span>✂️</span><span>點擊字母之間的縫隙來切割</span></div>
        <div className="qm-intro-rule-row"><span>🔄</span><span>再點一次可以取消切割</span></div>
        <div className="qm-intro-rule-row"><span>✅</span><span>切割位置完全正確才算答對</span></div>
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>
          開始練習 · Start →
        </button>
      </div>
    </div>
  );
}

/* ── Parse answer string into set of correct gap indices ── */
function parseSyllableCuts(answer) {
  // "sur/prise" → cut at gap index 2 (after letter[2], before letter[3])
  // "con/tract" → cut at gap index 2
  // "ath/let/ic" → cuts at gap index 2, 5
  // Spaces are stripped so "dis / trict" works same as "dis/trict"
  const cuts = new Set();
  let pos = 0;
  const normalized = (answer || '').replace(/\s+/g, ''); // remove all spaces
  const parts = normalized.split('/');
  for (let i = 0; i < parts.length - 1; i++) {
    pos += parts[i].length;
    cuts.add(pos - 1); // gap after letter at index (pos-1)
  }
  return cuts;
}

/* ══════════════════════════════════════════════════════
   SYLLABLE DIVISION — PLAYER
══════════════════════════════════════════════════════ */
function SyllableDivPlayer({ item, progressKey, onBack }) {
  const words = useQMM(() => item.sdWords || [], [item.id]);

  const [idx,       setIdx]       = useQM(0);
  const [cuts,      setCuts]      = useQM(() => new Set());
  const [submitted, setSubmitted] = useQM(false);
  const [scores,    setScores]    = useQM([]); // true/false per word
  const [done,      setDone]      = useQM(false);

  const total   = words.length;
  const current = words[idx];
  const pct     = Math.round(idx / total * 100);

  if (!total) return (
    <div className="wp-empty">
      <div className="wp-empty-icon">✂️</div>
      <div className="wp-empty-msg">尚無單字</div>
      <div className="wp-empty-sub">請在編輯模式中新增單字與切法</div>
    </div>
  );

  const letters      = current ? current.word.replace(/\s+/g, '').split('') : [];
  const correctCuts  = current ? parseSyllableCuts(current.answer) : new Set();

  const toggleCut = (gapIdx) => {
    if (submitted) return;
    setCuts(prev => {
      const next = new Set(prev);
      if (next.has(gapIdx)) next.delete(gapIdx); else next.add(gapIdx);
      return next;
    });
  };

  const submit = () => {
    const isCorrect = cuts.size === correctCuts.size && [...cuts].every(c => correctCuts.has(c));
    setScores(prev => [...prev, isCorrect]);
    if (window.playSound) window.playSound(isCorrect ? 'correct' : 'wrong');
    setSubmitted(true);
  };

  const next = () => {
    if (idx + 1 >= total) { setDone(true); return; }
    setIdx(i => i + 1);
    setCuts(new Set());
    setSubmitted(false);
  };

  /* ── Done screen ── */
  if (done) {
    const correct  = scores.filter(Boolean).length;
    const finalPct = Math.round(correct / total * 100);
    const emoji    = finalPct === 100 ? '🏆' : finalPct >= 80 ? '🎉' : finalPct >= 60 ? '👍' : '💪';
    const msg      = finalPct === 100 ? 'Perfect! 全對！' : finalPct >= 80 ? 'Excellent! 非常好！' : finalPct >= 60 ? 'Good job! 繼續練習！' : 'Keep going! 多練習！';
    // Save progress
    const prev = loadQMProg();
    prev[progressKey] = { done: total, score: correct, total, ts: Date.now() };
    saveQMProg(prev);
    return (
      <div className="qm-result">
        <div className="qm-result-emoji">{emoji}</div>
        <div className="qm-result-cat-title">{item.title}</div>
        <div className="qm-result-score">
          <span className="qm-result-num">{correct}</span>
          <span className="qm-result-denom"> / {total}</span>
        </div>
        <div className="qm-result-pct">{finalPct}% correct</div>
        <div className="qm-result-msg">{msg}</div>
        <div className="sd-done-breakdown">
          {words.map((w, i) => (
            <div key={i} className="sd-done-row">
              <span className={`sd-done-icon ${scores[i] ? 'correct' : 'wrong'}`}>{scores[i] ? '✓' : '✗'}</span>
              <span className="sd-done-word">{w.word}</span>
              <span className="sd-done-answer">{w.answer || '—'}</span>
            </div>
          ))}
        </div>
        <div className="qm-result-btns">
          <button className="qm-btn secondary" onClick={() => { setIdx(0); setCuts(new Set()); setSubmitted(false); setScores([]); setDone(false); }}>
            再試一次
          </button>
          <button className="qm-btn primary" onClick={onBack}>← Back</button>
        </div>
      </div>
    );
  }

  const isWordCorrect = submitted && cuts.size === correctCuts.size && [...cuts].every(c => correctCuts.has(c));

  /* ── Play screen ── */
  return (
    <div className="qm-player-shell">
      <div className="qm-player-head">
        <button className="qm-back-btn" onClick={onBack}><window.Icon name="close" size={16}/></button>
        <div className="qm-player-bar-wrap">
          <div className="qm-player-bar">
            <div className="qm-player-fill" style={{width: pct + '%'}}/>
          </div>
        </div>
        <span className="qm-player-counter">{idx + 1} / {total}</span>
      </div>

      <div className="qm-question-area" style={{paddingBottom:0}}>
        <div className="qm-question-hint">
          {submitted ? (isWordCorrect ? '✓ 切對了！' : '✗ 看看正確的切割位置') : '點擊字母之間的縫隙來切割音節'}
        </div>
      </div>

      {/* Interactive word display */}
      <div className="sd-word-display">
        {letters.map((letter, i) => {
          // Determine gap state after each letter (except last)
          let gapClass = '';
          let showSlash = false;
          if (i < letters.length - 1) {
            if (!submitted) {
              showSlash = cuts.has(i);
              gapClass  = cuts.has(i) ? 'cut' : '';
            } else {
              const studentCut = cuts.has(i);
              const shouldCut  = correctCuts.has(i);
              showSlash = studentCut || shouldCut;
              gapClass  = studentCut && shouldCut ? 'correct'
                        : shouldCut && !studentCut ? 'missed'
                        : studentCut && !shouldCut ? 'wrong-cut'
                        : '';
            }
          }
          return (
            <React.Fragment key={i}>
              <span className="sd-letter">{letter}</span>
              {i < letters.length - 1 && (
                <button
                  className={`sd-gap${submitted ? ' done' : ''}${gapClass ? ' ' + gapClass : ''}`}
                  onClick={() => toggleCut(i)}
                  disabled={submitted}
                  aria-label={`cut after ${letter}`}
                >
                  <span className="sd-gap-line"/>
                  {showSlash && <span className="sd-gap-slash">/</span>}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Legend after submit */}
      {submitted && !isWordCorrect && (
        <div className="sd-legend">
          {[...correctCuts].some(c => cuts.has(c)) && <span className="sd-leg correct">✓ 切對</span>}
          {[...correctCuts].some(c => !cuts.has(c)) && <span className="sd-leg missed">/ 漏切</span>}
          {[...cuts].some(c => !correctCuts.has(c)) && <span className="sd-leg wrong-cut">/ 切錯</span>}
        </div>
      )}

      <div className="qm-feedback" style={{marginTop:16}}>
        {!submitted ? (
          <button className="qm-btn primary" onClick={submit}>
            確認 · Check →
          </button>
        ) : (
          <>
            {!isWordCorrect && (
              <div className="sd-answer-reveal">
                <span className="sd-answer-label">正確答案</span>
                <span className="sd-answer-val">{current.answer}</span>
              </div>
            )}
            <button className="qm-btn primary" onClick={next}>
              {idx + 1 >= total ? '查看成績 →' : '下一個 →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   WORD SORT — INTRO
══════════════════════════════════════════════════════ */
/* Helper: combine stem + suffix category. Strips any trailing _ from stem first. */
function makeSuffixWord(stem, cat) {
  return stem.replace(/_+$/, '') + cat.replace(/^-/, '');
}

function WordSortIntro({ item, onStart }) {
  const cats       = item.sortCategories || [];
  const count      = (item.sortWords || []).length;
  const suffixMode = !!item.sortSuffixMode;
  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">🗂</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{count} words · {cats.length} categories</div>
      <div className="qm-intro-rules">
        {suffixMode ? (
          <>
            <div className="qm-intro-rule-row"><span>🔤</span><span>每個單字都有底線（字根），代表字尾還沒填上</span></div>
            <div className="qm-intro-rule-row"><span>👆</span><span>點一個字根，再點你覺得正確的字尾欄位</span></div>
            <div className="qm-intro-rule-row"><span>✨</span><span>放入後字尾會自動接上去，看看對不對！</span></div>
            <div className="qm-intro-rule-row"><span>🔄</span><span>點已放入的單字可以移回重新選</span></div>
          </>
        ) : (
          <>
            <div className="qm-intro-rule-row"><span>👀</span><span>看清楚每個分類的名稱</span></div>
            <div className="qm-intro-rule-row"><span>👆</span><span>點一個單字，再點它所屬的欄位</span></div>
            <div className="qm-intro-rule-row"><span>🔄</span><span>點已放入的單字可以移回重選</span></div>
            <div className="qm-intro-rule-row"><span>✅</span><span>全部放完才能提交</span></div>
          </>
        )}
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>
          開始分類 · Start →
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   WORD SORT — PLAYER
══════════════════════════════════════════════════════ */
function WordSortPlayer({ item, progressKey, onBack }) {
  const categories  = item.sortCategories || [];
  const suffixMode  = !!item.sortSuffixMode;
  const allWords    = useQMM(() => shuffleArr(item.sortWords || []), [item.id]);

  const [placements, setPlacements] = useQM({}); // wordId → category
  const [selected,   setSelected]   = useQM(null); // selected wordId (in pool)
  const [submitted,  setSubmitted]  = useQM(false);
  const [done,       setDone]       = useQM(false);

  const total     = allWords.length;
  const poolWords = allWords.filter(w => !placements[w.id]);
  const allPlaced = poolWords.length === 0;

  // Display helpers — strip trailing _ before any manipulation so teacher can type either "final" or "final_"
  const stem        = (w) => w.word.replace(/_+$/, '');
  const poolLabel   = (w) => suffixMode ? stem(w) + '_' : w.word;
  const placedLabel = (w, cat) => suffixMode ? makeSuffixWord(stem(w), cat) : w.word;
  const resultLabel = (w, cat) => suffixMode ? makeSuffixWord(stem(w), cat) : w.word;

  const wordsInCat = (cat) => allWords.filter(w => placements[w.id] === cat);

  const clickPoolWord = (wordId) => {
    if (submitted) return;
    setSelected(prev => prev === wordId ? null : wordId);
  };

  const clickPlacedWord = (wordId) => {
    if (submitted) return;
    setPlacements(prev => { const p = {...prev}; delete p[wordId]; return p; });
    setSelected(null);
  };

  const clickCategory = (cat) => {
    if (submitted || !selected) return;
    setPlacements(prev => ({ ...prev, [selected]: cat }));
    setSelected(null);
  };

  const submit = () => {
    let correct = 0;
    allWords.forEach(w => {
      if (placements[w.id] === w.category) correct++;
    });
    const prev = loadQMProg();
    prev[progressKey] = { done: total, score: correct, total, ts: Date.now() };
    saveQMProg(prev);
    if (window.playSound) window.playSound(correct === total ? 'complete' : 'wrong');
    setSubmitted(true);
  };

  /* ── After submit: check screen ── */
  if (submitted && !done) {
    const correct  = allWords.filter(w => placements[w.id] === w.category).length;
    const finalPct = Math.round(correct / total * 100);
    const allRight = correct === total;

    if (allRight) {
      if (window.playSound) window.playSound('complete');
    }

    return (
      <div className="ws-result">
        <div className="ws-result-head">
          <span className="ws-result-emoji">{allRight ? '🏆' : finalPct >= 70 ? '🎉' : '💪'}</span>
          <span className="ws-result-score">{correct} / {total}</span>
          <span className="ws-result-pct">{finalPct}%</span>
        </div>

        {/* Show all columns with correct/wrong marking */}
        <div className="ws-grid" style={{gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)`}}>
          {categories.map(cat => (
            <div key={cat} className="ws-col">
              <div className="ws-col-head">{cat}</div>
              <div className="ws-col-body">
                {allWords.filter(w => w.category === cat).map(w => {
                  const placed = placements[w.id] === cat;
                  return (
                    <div key={w.id} className={`ws-word-chip result ${placed ? 'correct' : 'missing'}`}>
                      {placed ? '✓' : '✗'} {resultLabel(w, cat)}
                    </div>
                  );
                })}
                {/* Words student put here that are wrong */}
                {allWords.filter(w => placements[w.id] === cat && w.category !== cat).map(w => (
                  <div key={w.id + '_wrong'} className="ws-word-chip result wrong">
                    ✗ {resultLabel(w, cat)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="ws-result-btns">
          <button className="qm-btn secondary" onClick={() => { setPlacements({}); setSelected(null); setSubmitted(false); }}>
            再試一次
          </button>
          <button className="qm-btn primary" onClick={onBack}>← Back</button>
        </div>
      </div>
    );
  }

  /* ── Play screen ── */
  return (
    <div className="ws-player">
      {/* Word Pool */}
      <div className="ws-pool-area">
        <div className="ws-pool-label">
          {allPlaced ? '✓ 全部放完了，可以提交！' : `${poolWords.length} 個單字待分類${selected ? ' · 點下方欄位放入' : ' · 點單字選取'}`}
        </div>
        <div className="ws-pool">
          {poolWords.map(w => (
            <button
              key={w.id}
              className={`ws-word-chip pool${selected === w.id ? ' selected' : ''}${suffixMode ? ' suffix' : ''}`}
              onClick={() => clickPoolWord(w.id)}
            >
              {poolLabel(w)}
            </button>
          ))}
          {allPlaced && <span className="ws-pool-done">🎉</span>}
        </div>
      </div>

      {/* Category Columns */}
      <div className="ws-grid" style={{gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)`}}>
        {categories.map(cat => (
          <div
            key={cat}
            className={`ws-col${selected ? ' droppable' : ''}`}
            onClick={() => clickCategory(cat)}
          >
            <div className="ws-col-head">{cat}</div>
            <div className="ws-col-body">
              {wordsInCat(cat).map(w => (
                <button
                  key={w.id}
                  className="ws-word-chip placed"
                  onClick={(e) => { e.stopPropagation(); clickPlacedWord(w.id); }}
                  title="點擊移回"
                >
                  {placedLabel(w, cat)}
                </button>
              ))}
              {selected && wordsInCat(cat).length === 0 && (
                <div className="ws-drop-hint">點此放入</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="ws-submit-area">
        <button
          className="qm-btn primary"
          onClick={submit}
          disabled={!allPlaced}
          style={{opacity: allPlaced ? 1 : 0.45}}
        >
          {allPlaced ? '提交答案 →' : `還有 ${poolWords.length} 個單字未分類`}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { QuizModeBlocks, QuizModeCategoryView, QuizModePlayer, getItemQuestions, getQuizItems, WritingPracticePlayer, TypeAnswerPlayer, ShortAnswerPlayer, SyllableDivPlayer, WordSortPlayer });
