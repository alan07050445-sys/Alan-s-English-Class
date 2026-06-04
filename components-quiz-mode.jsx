// components-quiz-mode.jsx — Quiz mode (main UI for students + teacher edit)

const { useState: useQM, useMemo: useQMM, useEffect: useQME } = React;

/* ── Count-up animation hook ─────────────────────────── */
function useCountUp(target, duration, delay) {
  duration = duration || 900;
  delay    = delay    || 0;
  const [val, setVal] = useQM(0);
  useQME(() => {
    if (!target) { setVal(0); return; }
    let rafId;
    const tid = setTimeout(() => {
      let t0 = null;
      const tick = (now) => {
        if (!t0) t0 = now;
        const pct = Math.min((now - t0) / duration, 1);
        const eased = pct === 1 ? 1 : 1 - Math.pow(2, -10 * pct); // easeOutExpo
        setVal(Math.round(eased * target));
        if (pct < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(tid); cancelAnimationFrame(rafId); };
  }, [target]);
  return val;
}

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
    (item.type === 'word-sort'        && (item.sortWords || []).length >= 1 && (item.sortCategories || []).length >= 2) ||
    (item.type === 'essay'            && !!(item.essayPrompt || '').trim()) ||
    (item.type === 'story-mountain'   && !!(item.smPrompt || item.smPassage || '')) ||
    (item.type === 'cloze'            && (item.passage || '').includes('['))
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

function getQuizItemTotal(item) {
  if (!item) return 0;
  if (item.type === 'type-answer')  return (item.pairs || []).length;
  if (item.type === 'short-answer') return (item.saQuestions || []).length;
  if (item.type === 'syllable-div') return (item.sdWords || []).length;
  if (item.type === 'word-sort')    return (item.sortWords || []).length;
  if (item.type === 'essay') return 1;
  if (item.type === 'story-mountain') return 1;
  if (item.type === 'cloze') return ((item.passage || '').match(/\[[^\]]+\]/g) || []).length;
  if (item.type === 'writing-practice') return 1;
  return getItemQuestions(item).length;
}

function saveQuizModeCompletion(progressKey, item, { doneCount = 1, score = null, total = 1, wrongQuestions = [] } = {}) {
  const ts = Date.now();
  const localTotal = total || doneCount || 1;
  const localScore = typeof score === 'number' ? score : null;
  const prev = loadQMProg();
  prev[progressKey] = { done: doneCount || localTotal, score: localScore, total: localTotal, ts };
  saveQMProg(prev);

  const u = window._currentUser;
  if (u && window.saveProgressItem) {
    const scorePct = localScore == null ? null : Math.round((localScore / localTotal) * 100);
    const payload = {
      done: ts,
      score: scorePct,
      total: localTotal,
      itemTitle: item?.title || '',
      itemType: item?.type || '',
    };
    if (wrongQuestions.length) {
      payload.wrongQuestions = wrongQuestions;
      payload.wrongCount = wrongQuestions.length;
    }
    window.saveProgressItem(u.uid, u.displayName || '', u.email || '', progressKey, payload);
  }
  return prev;
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
          const total  = quizItems.reduce((s, it) => s + getQuizItemTotal(it), 0);
          const done   = quizItems.reduce((s, it) => {
            const p = qmProg[`${weekId}_${it.id}`];
            return s + (p ? Math.min(p.done || 0, getQuizItemTotal(it)) : 0);
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
  const quizSwapKey = selectedItem ? `${selectedItem.id}-${phase}-${playerKey}` : 'empty';

  return (
    <div className={`qm-cat-view qm-cat-enter${hasSelection ? ' has-selection' : ''}`}>

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
            const isEssay        = item.type === 'essay';
            const isStoryMtn     = item.type === 'story-mountain';
            const isCloze        = item.type === 'cloze';
            const hasQuiz  = totalQ > 0 || isWriting || isTypeAnswer || isShortAnswer || isSyllableDiv || isWordSort || isEssay || isStoryMtn || isCloze;
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
                        {isStoryMtn ? '🏔 Story Mountain' : isEssay ? '✍ Opinion Essay' : isWriting ? '✍ Writing Practice' : isTypeAnswer ? `⌨ ${(item.pairs||[]).length} words` : isShortAnswer ? `📖 ${(item.saQuestions||[]).length} questions` : isSyllableDiv ? `✂️ ${(item.sdWords||[]).length} words` : isWordSort ? `🗂 ${(item.sortWords||[]).length} words` : isCloze ? `📝 ${((item.passage||'').match(/\[[^\]]+\]/g)||[]).length} blanks` : `${totalQ} questions`}
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
        <div key={quizSwapKey} className="qm-quiz-swap">
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
        ) : selectedItem?.type === 'story-mountain' && phase === 'quiz' ? (
          <StoryMountainPlayer
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'story-mountain' && phase === 'intro' ? (
          <StoryMountainIntro
            item={selectedItem}
            onStart={() => setPhase('quiz')}
          />
        ) : selectedItem?.type === 'essay' && phase === 'quiz' ? (
          <EssayPlayer
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'cloze' && phase === 'quiz' ? (
          <ClozePlayer
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'cloze' && phase === 'intro' ? (
          <ClozeIntro item={selectedItem} onStart={() => setPhase('quiz')} />
        ) : selectedItem?.type === 'essay' && phase === 'intro' ? (
          <EssayIntro
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
              <button className="qm-fc-start-btn" onClick={() => setPhase('quiz')}>
                開始測驗 <span>Start Quiz</span>
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

/* ── Shared section-based feedback renderer ────────────── */
function SectionFeedback({ text, config }) {
  // config: array of { key, label, icon, style }
  // style: 'score' | 'green' | 'blue' | 'purple' | 'orange' | 'comment' | 'default'
  const sections = parseEssaySections(text);
  const scoreText = sections['Score'] || sections['Overall Score'] || '';
  const starCount = countStars(scoreText);
  const scoreDesc = scoreText.replace(/[⭐★☆✩\s]+/g, c => /\s/.test(c) ? c : '').trim();

  return (
    <div className="sf-feedback">
      {/* Score card */}
      {scoreText && (
        <div className="sf-score-card">
          <div className="sf-stars">
            {[1,2,3,4,5].map(i => (
              <span key={i} className={`sf-star ${i <= starCount ? 'filled' : 'empty'}`}>
                {i <= starCount ? '⭐' : '☆'}
              </span>
            ))}
          </div>
          {scoreDesc && <div className="sf-score-desc">{scoreDesc}</div>}
        </div>
      )}

      {/* Each configured section */}
      {config.map(({ key, label, icon, style }) => {
        const body = sections[key];
        if (!body) return null;
        return (
          <div key={key} className={`sf-section sf-${style || 'default'}`}>
            <div className="sf-sec-title">{icon} {label}</div>
            <div className="sf-sec-body">{body}</div>
          </div>
        );
      })}
    </div>
  );
}

/* Writing Practice feedback config */
const WF_CONFIG = [
  { key: 'Word Usage',         label: 'Word Usage',         icon: '📝', style: 'default' },
  { key: 'Grammar',            label: 'Grammar',            icon: '✏️', style: 'default' },
  { key: 'Teacher Comment',    label: 'Teacher Comment',    icon: '💬', style: 'comment' },
  { key: 'Corrected Sentence', label: 'Corrected Sentence', icon: '📋', style: 'blue'    },
  { key: 'Better Sentence',    label: 'Better Sentence',    icon: '🌟', style: 'purple'  },
];

/* Short Answer feedback config */
const SA_CONFIG = [
  { key: 'Answer Check',      label: 'Answer Check',      icon: '✅', style: 'default' },
  { key: 'Text Evidence',     label: 'Text Evidence',     icon: '📖', style: 'default' },
  { key: 'Needs Improvement', label: 'Needs Improvement', icon: '🔸', style: 'orange'  },
  { key: 'Teacher Comment',   label: 'Teacher Comment',   icon: '💬', style: 'comment' },
  { key: 'Corrected Answer',  label: 'Corrected Answer',  icon: '📋', style: 'blue'    },
  { key: 'Better Answer',     label: 'Better Answer',     icon: '🌟', style: 'purple'  },
];

/* ── Unified 3-card writing feedback (all writing types) ── */
function WritingFeedback({ text }) {
  if (!text) return null;
  const secs = parseEssaySections(text);
  const scoreText = secs['Score'] || secs['Overall Score'];
  const hasGood    = secs['Good Job'];
  const hasImprove = secs['To Improve'];
  const hasBetter  = secs['Better Version'] || secs['Example Answer'] || secs['Better Answer'];
  const hasSections = scoreText || hasGood || hasImprove || hasBetter;

  if (!hasSections) {
    // Fallback: raw text
    return <div className="wf3-raw">{text}</div>;
  }
  const starCount = scoreText ? countStars(scoreText) : 0;
  const scoreDesc = scoreText
    ? scoreText.replace(/[⭐★☆✩\s()0-9/]+/g, ' ').replace(/\s+/g, ' ').replace(/^[-—:：]\s*/, '').trim()
    : '';
  return (
    <div className="wf3-feedback">
      {scoreText && (
        <div className="wf3-card wf3-score">
          <div className="wf3-title">⭐ Score</div>
          <div className="wf3-stars" aria-label={`${starCount} out of 5 stars`}>
            {[1,2,3,4,5].map(i => (
              <span key={i} className={i <= starCount ? 'filled' : 'empty'}>
                {i <= starCount ? '⭐' : '☆'}
              </span>
            ))}
          </div>
          {scoreDesc && <div className="wf3-body">{scoreDesc}</div>}
        </div>
      )}
      {hasGood && (
        <div className="wf3-card wf3-green">
          <div className="wf3-title">✅ Good Job!</div>
          <div className="wf3-body">{hasGood}</div>
        </div>
      )}
      {hasImprove && (
        <div className="wf3-card wf3-orange">
          <div className="wf3-title">🔸 To Improve</div>
          <div className="wf3-body">{hasImprove}</div>
        </div>
      )}
      {hasBetter && (
        <div className="wf3-card wf3-blue">
          <div className="wf3-title">📝 Better Version</div>
          <div className="wf3-body">{hasBetter}</div>
        </div>
      )}
    </div>
  );
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
      const nextScore = score + 1;
      setScore(nextScore);
      if (window.playSound) window.playSound('correct');
      setTimeout(() => next(nextScore), 650);
    } else {
      if (window.playSound) window.playSound('wrong');
    }
  };

  const next = (scoreOverride = null) => {
    const finalScoreBase = typeof scoreOverride === 'number' ? scoreOverride : score;
    if (idx + 1 >= total) {
      saveQuizModeCompletion(progressKey, item, { doneCount: total, score: finalScoreBase, total });
      if (window.playSound) window.playSound('complete');
      setScreen('done');
    } else {
      setIdx(i => i + 1);
      setInput('');
      setResult(null);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      if (result === null) check();
      else if (result === 'wrong') next();
    }
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

      <div key={idx} className="qm-question-area qm-question-swap">
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
            {current.explain && (
              <div className="ta-explain">
                <span className="ta-explain-icon">💡</span>
                <span>{current.explain}</span>
              </div>
            )}
            {result === 'correct' ? (
              <div className="qm-auto-next">
                {idx + 1 >= total ? '答對了，自動查看成績…' : '答對了，自動下一題…'}
              </div>
            ) : (
              <button className="qm-btn primary" onClick={() => next()}>
                {idx + 1 >= total ? '查看成績 →' : '下一題 →'}
              </button>
            )}
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
/* ══════════════════════════════════════════════════════
   QUIZ RESULT SCREEN — animated Duolingo-style
══════════════════════════════════════════════════════ */
function QuizResultScreen({ finalScore, total, finalPct, title, wrongList, onRestart, onBack }) {
  const starCount  = finalPct === 100 ? 3 : finalPct >= 70 ? 2 : finalPct >= 40 ? 1 : 0;
  const xpGain     = finalPct === 100 ? 100 : 50;
  const msg        = finalPct === 100 ? 'Perfect! 滿分！'
                   : finalPct >= 80   ? 'Excellent! 非常好！'
                   : finalPct >= 60   ? 'Good job! 繼續加油！'
                   :                    'Keep practicing! 多練習！';

  const animScore = useCountUp(finalScore, 900, 400);
  const animPct   = useCountUp(finalPct,   900, 400);
  const animXp    = useCountUp(xpGain,     700, 650);

  return (
    <div className="qm-result">
      {/* Stars — fly in one by one */}
      <div className="qm-result-stars">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className={`qm-result-star ${i < starCount ? 'earned' : 'empty'}`}
            style={{ animationDelay: `${0.1 + i * 0.25}s` }}
          >
            {i < starCount ? '⭐' : '☆'}
          </span>
        ))}
      </div>

      <div className="qm-result-cat-title">{title}</div>

      {/* Count-up score */}
      <div className="qm-result-score">
        <span className="qm-result-num">{animScore}</span>
        <span className="qm-result-denom"> / {total}</span>
      </div>
      <div className="qm-result-pct">{animPct}% correct</div>

      {/* XP gain */}
      <div className="qm-result-xp-row">
        <span className="qm-result-xp">+{animXp} XP</span>
        {finalPct === 100 && <span className="qm-result-xp-badge">✨ Perfect Bonus!</span>}
      </div>

      <div className="qm-result-msg">{msg}</div>

      <div className="qm-result-btns">
        <button className="qm-btn secondary" onClick={onRestart}>再試一次</button>
        <button className="qm-btn primary"   onClick={onBack}>← Back</button>
      </div>

      {wrongList && wrongList.length > 0 && (
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

function QuizModePlayer({ cat, item, questions, progressKey, weekId, allQuizItems, onBack, onQuizDone }) {
  // Adaptive deck: wrong questions are reinserted 3 positions later
  const uniqueTotal = questions.length;
  const [deck,       setDeck]      = useQM(() => [...questions]);
  const [deckPos,    setDeckPos]   = useQM(0);
  const [selected,   setSelected]  = useQM(null);
  const [firstRight, setFirstRight]= useQM(0);  // correct on FIRST attempt (for score)
  const [screen,     setScreen]    = useQM('quiz');
  const [wrongList,  setWrongList] = useQM([]);
  const [plusOneKey, setPlusOneKey]= useQM(0);
  const [lastRight,  setLastRight] = useQM(null);

  const q      = deck[deckPos];
  const total  = uniqueTotal;
  const isLast = deckPos >= deck.length - 1;
  // Progress = first-try correct / unique total
  const pct    = Math.round(firstRight / total * 100);

  if (!q) return null;

  const goToNextQuestion = () => {
    setDeckPos(i => i + 1);
    setSelected(null);
    setLastRight(null);
  };

  const completeQuiz = (fs = firstRight, finalWrongList = wrongList) => {
    const wrongQuestions = finalWrongList.map(wq => ({ q: wq.q, answer: wq.options[wq.correct] }));
    const prev = saveQuizModeCompletion(progressKey, item, {
      doneCount: total,
      score: fs,
      total,
      wrongQuestions,
    });
    if (window.playSound) window.playSound('complete');
    const finalPctCalc = Math.round(fs / total * 100);
    if (finalPctCalc >= 70 && window.triggerStarBurst) window.triggerStarBurst();
    if (onQuizDone) onQuizDone();
    const allWeekQuizDone = (allQuizItems || []).every(it => prev[`${weekId}_${it.id}`]);
    if (window._onQuizComplete) {
      window._onQuizComplete(fs, total, finalWrongList, {
        weekId, itemId: progressKey, itemTitle: item?.title || '', allWeekQuizDone,
      });
    }
    setScreen('result');
  };

  const handleSelect = (optIdx) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const correct = optIdx === q.correct;
    if (window.playSound) window.playSound(correct ? 'correct' : 'wrong');
    if (correct) {
      const nextFirstRight = !q._retry ? firstRight + 1 : firstRight;
      setFirstRight(nextFirstRight);
      setPlusOneKey(k => k + 1);
      setLastRight(true);
      setTimeout(() => {
        if (isLast) completeQuiz(nextFirstRight, wrongList);
        else goToNextQuestion();
      }, 650);
      return;
    }

    const nextWrongList = !q._retry ? [...wrongList, q] : wrongList;
    setWrongList(nextWrongList);
    setDeck(prev => {
      const next = [...prev];
      next.splice(Math.min(deckPos + 4, next.length), 0, {...q, _retry: true});
      return next;
    });
    setLastRight(false);
  };

  const handleNext = () => {
    if (isLast) {
      completeQuiz(firstRight, wrongList);
    } else {
      goToNextQuestion();
    }
  };

  const restart = () => {
    setDeck([...questions]); setDeckPos(0); setSelected(null);
    setFirstRight(0); setScreen('quiz'); setWrongList([]); setLastRight(null); setPlusOneKey(0);
  };

  /* ── Result ── */
  if (screen === 'result') {
    const finalScore = firstRight;
    const finalPct   = Math.round(finalScore / total * 100);
    return (
      <QuizResultScreen
        finalScore={finalScore} total={total} finalPct={finalPct}
        title={item?.title || cat.title}
        wrongList={wrongList}
        onRestart={restart} onBack={onBack}
      />
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
        {/* Live score badge with +1 float */}
        <div className="qm-score-wrap">
          <span className={`qm-score-badge${lastRight === false ? ' shake' : ''}`}>
            ⭐ {firstRight}
          </span>
          {lastRight === true && (
            <span key={plusOneKey} className="qm-plus-one">+1</span>
          )}
        </div>
      </div>

      <div key={deckPos} className="qm-question-area qm-question-swap">
        {q.hint && <div className="qm-question-hint">{q.hint}</div>}
        <div className="qm-question-text">{q.q}</div>
      </div>

      <div key={`opts-${deckPos}`} className="qm-options qm-options-swap">
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
          {selected === q.correct ? (
            <div className="qm-auto-next">答對了，自動下一題…</div>
          ) : (
            <button className="qm-btn primary" onClick={handleNext}>
              {isLast ? '查看成績 →' : '下一題 →'}
            </button>
          )}
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
    const filled = (text.match(/⭐/g) || []).length;
    if (filled > 0) return Math.min(5, filled);
    const m = text.match(/[★☆]{1,5}/);
    if (!m) return 3;
    return (m[0].match(/★/g) || []).length;
  };

  const submit = async () => {
    if (!sentence.trim() || checking || feedback) return;
    setChecking(true);
    setFeedback('');
    const result = await window.checkWriting(current.word, sentence);
    setFeedback(result);
    const stars = extractStars(result);
    setScores(prev => [...prev, stars]);
    setChecking(false);
  };

  const handleSentenceKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !feedback && !checking) {
      e.preventDefault();
      submit();
    }
  };

  const next = () => {
    if (idx + 1 >= total) {
      const avgStars = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      saveQuizModeCompletion(progressKey, item, { doneCount: 1, score: avgStars, total: 5 });
      setDone(true);
      return;
    }
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
      <div key={idx} className="wp-card qm-question-swap">
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
        onKeyDown={handleSentenceKeyDown}
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
  const qCount   = (item.saQuestions || []).length;
  const ytUrl    = item.saYoutube || '';
  const embedSrc = ytUrl ? window.toYouTubeEmbed(ytUrl) : '';

  return (
    <div className={`qm-intro${embedSrc ? ' sa-intro-wide' : ''}`}>
      {embedSrc ? (
        <>
          <div className="sa-intro-header">
            <div className="qm-intro-icon" style={{fontSize:28}}>📺</div>
            <div>
              <div className="qm-intro-title" style={{marginBottom:4}}>{item.title}</div>
              <div className="qm-intro-meta">{qCount} 題短答 · 先看影片複習再開始</div>
            </div>
          </div>
          <div className="sa-intro-video">
            <iframe
              src={embedSrc}
              frameBorder="0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              style={{width:'100%', height:'100%', borderRadius:8}}
            />
          </div>
          <div className="qm-intro-rules" style={{marginTop:16}}>
            <div className="qm-intro-rule-row"><span>📺</span><span>看完影片後再開始作答</span></div>
            <div className="qm-intro-rule-row"><span>✍</span><span>用英文打字回答，盡量完整</span></div>
            <div className="qm-intro-rule-row"><span>⭐</span><span>AI 評分，每題最高 5 顆星</span></div>
          </div>
        </>
      ) : (
        <>
          <div className="qm-intro-icon">📖</div>
          <div className="qm-intro-title">{item.title}</div>
          <div className="qm-intro-meta">{qCount} 題短答 · AI 閱讀理解批改</div>
          <div className="qm-intro-rules">
            <div className="qm-intro-rule-row"><span>✍</span><span>用英文打字回答，盡量完整</span></div>
            <div className="qm-intro-rule-row"><span>⭐</span><span>AI 評分，每題最高 5 顆星</span></div>
          </div>
        </>
      )}
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>
          {embedSrc ? '✅ 看完了，開始作答 →' : '開始作答 · Start →'}
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

  const [idx, setIdx]         = useQM(0);
  const [answer, setAnswer]   = useQM('');
  const [feedback, setFeedback] = useQM('');
  const [checking, setChecking] = useQM(false);
  const [scores, setScores]   = useQM([]);
  const [done, setDone]       = useQM(false);

  const current = questions[idx];
  const total   = questions.length;

  const extractStars = (text) => {
    // New format: count ⭐ from 【Score】 block (1-5 scale)
    const filled = (text.match(/⭐/g) || []).length;
    if (filled > 0) return Math.min(5, filled);
    // Legacy fallback: ★ stars
    const m = text.match(/[★☆]{1,5}/);
    if (!m) return 3;
    return (m[0].match(/★/g) || []).length;
  };

  const submit = async () => {
    if (!answer.trim() || checking || feedback) return;
    setChecking(true);
    setFeedback('');
    const result = await window.checkShortAnswer(
      current.question, current.keyPoints || '', passage, answer
    );
    setFeedback(result);
    setScores(prev => [...prev, extractStars(result)]);
    setChecking(false);
  };

  const handleShortAnswerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !feedback && !checking) {
      e.preventDefault();
      submit();
    }
  };

  const next = () => {
    if (idx + 1 >= total) {
      const avgStars = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      saveQuizModeCompletion(progressKey, item, { doneCount: 1, score: avgStars, total: 5 });
      setDone(true);
      return;
    }
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
        <span className="wp-done-maxstar"> / 5 ★</span>
      </div>
      <div className="wp-done-breakdown">
        {questions.map((q, i) => (
          <div key={i} className="wp-done-row">
            <span className="wp-done-word" style={{flex:1,textAlign:'left',fontSize:12}}>{q.question}</span>
            <span className="wp-done-stars">{'★'.repeat(scores[i]||0)}{'☆'.repeat(5-(scores[i]||0))}</span>
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
        </div>

      <div key={idx} className="wp-card qm-question-swap">
        <div className="wp-instruction">Question {idx+1}</div>
        <div className="sa-question">{current.question}</div>
      </div>

      <textarea
        className="qm-writing-input wp-input sa-input"
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={handleShortAnswerKeyDown}
        placeholder="Write your answer here…"
        disabled={!!feedback}
        rows={4}
      />

      {!feedback ? (
        <button className="qm-btn primary wp-submit" onClick={submit} disabled={checking || !answer.trim()}>
          {checking ? '🤖 批改中…' : '送出答案 →'}
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
    if (isCorrect) {
      setTimeout(() => next(), 650);
    }
  };

  const next = () => {
    if (idx + 1 >= total) {
      const correct = scores.filter(Boolean).length;
      saveQuizModeCompletion(progressKey, item, { doneCount: total, score: correct, total });
      setDone(true);
      return;
    }
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
      <div key={idx} className="sd-word-display qm-question-swap">
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
            {isWordCorrect ? (
              <div className="qm-auto-next">
                {idx + 1 >= total ? '切對了，自動查看成績…' : '切對了，自動下一個…'}
              </div>
            ) : (
              <button className="qm-btn primary" onClick={next}>
                {idx + 1 >= total ? '查看成績 →' : '下一個 →'}
              </button>
            )}
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

  const [placements,  setPlacements]  = useQM({}); // wordId → category
  const [selected,    setSelected]    = useQM(null); // selected wordId (in pool)
  const [submitted,   setSubmitted]   = useQM(false);
  const [done,        setDone]        = useQM(false);
  const [showAnswer,  setShowAnswer]  = useQM(false); // result screen tab

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
    if (window.playSound) window.playSound('match');
  };

  const clickCategory = (cat) => {
    if (submitted || !selected) return;
    setPlacements(prev => ({ ...prev, [selected]: cat }));
    setSelected(null);
    if (window.playSound) window.playSound('match');
  };

  const submit = () => {
    let correct = 0;
    allWords.forEach(w => {
      if (placements[w.id] === w.category) correct++;
    });
    saveQuizModeCompletion(progressKey, item, { doneCount: total, score: correct, total });
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

    const colCount = `repeat(${Math.min(categories.length, 4)}, 1fr)`;

    return (
      <div className="ws-result">
        {/* Score header */}
        <div className="ws-result-head">
          <span className="ws-result-emoji">{allRight ? '🏆' : finalPct >= 70 ? '🎉' : '💪'}</span>
          <span className="ws-result-score">{correct} / {total}</span>
          <span className="ws-result-pct">{finalPct}%</span>
        </div>

        {/* Tab toggle */}
        <div className="ws-result-tabs">
          <button
            className={`ws-result-tab${!showAnswer ? ' active' : ''}`}
            onClick={() => setShowAnswer(false)}
          >你的答案</button>
          <button
            className={`ws-result-tab${showAnswer ? ' active' : ''}`}
            onClick={() => setShowAnswer(true)}
          >✅ 正確答案</button>
        </div>

        {/* Student's answer view */}
        {!showAnswer && (
          <div className="ws-grid" style={{gridTemplateColumns: colCount}}>
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
                  {allWords.filter(w => placements[w.id] === cat && w.category !== cat).map(w => (
                    <div key={w.id + '_wrong'} className="ws-word-chip result wrong">
                      ✗ {resultLabel(w, cat)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Correct answer view */}
        {showAnswer && (
          <div className="ws-grid" style={{gridTemplateColumns: colCount}}>
            {categories.map(cat => (
              <div key={cat} className="ws-col">
                <div className="ws-col-head">{cat}</div>
                <div className="ws-col-body">
                  {allWords.filter(w => w.category === cat).map(w => (
                    <div key={w.id} className="ws-word-chip result correct">
                      ✓ {resultLabel(w, cat)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Buttons — equal size */}
        <div className="ws-result-btns">
          <button className="qm-btn secondary ws-result-btn"
            onClick={() => { setPlacements({}); setSelected(null); setSubmitted(false); setShowAnswer(false); setDone(false); }}>
            再試一次
          </button>
          <button className="qm-btn primary ws-result-btn" onClick={onBack}>← Back</button>
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

/* ══════════════════════════════════════════════════════
   OPINION ESSAY — INTRO
══════════════════════════════════════════════════════ */
function EssayIntro({ item, onStart }) {
  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">✍</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">Opinion Essay · AI 7-criteria grading</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>📋</span><span>閱讀題目，想好你的立場（Claim）</span></div>
        <div className="qm-intro-rule-row"><span>💡</span><span>寫出 2 個 Reasons，每個 Reason 搭配 Example</span></div>
        <div className="qm-intro-rule-row"><span>🔚</span><span>最後寫 Conclusion，總結你的 Opinion</span></div>
        <div className="qm-intro-rule-row"><span>🤖</span><span>AI 批改 7 項：Claim · Reasons · Examples · Explanation · Conclusion · Organization · Grammar</span></div>
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>開始寫作 · Start Writing →</button>
      </div>
    </div>
  );
}

/* ── Parse 【Section】 blocks from AI response ── */
function parseEssaySections(text) {
  const sections = {};
  const regex = /【([^】]+)】([\s\S]*?)(?=【|$)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    sections[m[1].trim()] = m[2].trim();
  }
  return sections;
}

/* ── Count stars in AI overall score text ── */
function countStars(text) {
  const filled = (text.match(/[⭐★]/g) || []).length;
  return Math.min(5, Math.max(1, filled));
}

/* ══════════════════════════════════════════════════════
   OPINION ESSAY — PLAYER
══════════════════════════════════════════════════════ */
function EssayPlayer({ item, progressKey, onBack }) {
  const [essay,     setEssay]     = useQM('');
  const [feedback,  setFeedback]  = useQM('');
  const [checking,  setChecking]  = useQM(false);
  const [submitted, setSubmitted] = useQM(false);
  const [activeTab, setActiveTab] = useQM('strengths'); // for detailed feedback tabs

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const prompt    = item.essayPrompt  || '';
  const scaffold  = item.essayScaffold || '';

  const submit = async () => {
    if (!essay.trim() || checking) return;
    setChecking(true);
    const result = await window.checkEssay(prompt, essay);
    setFeedback(result);
    setChecking(false);
    setSubmitted(true);
    saveQuizModeCompletion(progressKey, item, { doneCount: 1, score: countStars(result), total: 5 });
  };

  return (
    <div className="essay-player">
      {/* Prompt */}
      <div className="essay-prompt-card">
        <div className="essay-prompt-label">✍ Essay Prompt</div>
        <div className="essay-prompt-text">{prompt}</div>
        {scaffold && (
          <div className="essay-scaffold">
            <div className="essay-scaffold-label">📋 Writing Guide</div>
            <pre className="essay-scaffold-body">{scaffold}</pre>
          </div>
        )}
      </div>

      {/* Writing area (hide after submit) */}
      {!submitted && (
        <>
          <textarea
            className="essay-input"
            value={essay}
            onChange={e => setEssay(e.target.value)}
            placeholder="Start writing your opinion essay here…&#10;&#10;Begin with your Claim (立場), then give Reasons with Examples, and finish with a Conclusion."
            rows={12}
            disabled={checking}
          />
          <div className="essay-meta-row">
            <span className="essay-word-count">{wordCount} words</span>
            <button
              className="qm-btn primary"
              onClick={submit}
              disabled={wordCount < 10 || checking}
              style={{opacity: wordCount < 10 ? 0.45 : 1}}
            >
              {checking ? '🤖 AI 批改中…' : '送出批改 →'}
            </button>
          </div>
          {checking && <div className="essay-checking-bar"><div className="essay-checking-fill"/></div>}
        </>
      )}

      {/* Feedback — unified 3-card display */}
      {submitted && feedback && (
        <div className="essay-feedback">
          <WritingFeedback text={feedback}/>
          <div className="essay-result-btns">
            <button className="qm-btn secondary" onClick={() => { setSubmitted(false); setFeedback(''); setEssay(''); }}>
              重新寫一次
            </button>
            <button className="qm-btn primary" onClick={onBack}>← Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   STORY MOUNTAIN — constants
══════════════════════════════════════════════════════ */
const SM_STAGES = [
  { key:'intro',      label:'Introduction',   short:'Intro',   num:'1', cx:70,  cy:215 },
  { key:'rising',     label:'Rising Action',  short:'Rising',  num:'2', cx:175, cy:138 },
  { key:'climax',     label:'Climax',         short:'Climax',  num:'3', cx:280, cy:55  },
  { key:'falling',    label:'Falling Action', short:'Falling', num:'4', cx:385, cy:138 },
  { key:'resolution', label:'Resolution',     short:'End',     num:'5', cx:490, cy:215 },
];

/* Bezier segments between consecutive stages */
const SM_SEGMENTS = [
  'M 70,215 C 100,210 145,143 175,138',
  'M 175,138 C 205,133 250,60 280,55',
  'M 280,55 C 310,50 355,133 385,138',
  'M 385,138 C 415,143 460,210 490,215',
];

/* ── SVG Mountain Diagram ── */
function StoryMountainSVG({ activeKey, doneKeys }) {
  const allReached = [...doneKeys, activeKey];
  const fullPath = 'M 70,215 C 100,210 145,143 175,138 C 205,133 250,60 280,55 C 310,50 355,133 385,138 C 415,143 460,210 490,215';
  const fillPath = fullPath + ' L 490,240 L 70,240 Z';

  return (
    <svg viewBox="0 0 560 275" className="sm-svg">
      <defs>
        <linearGradient id="sm-mtn-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b3120" stopOpacity="0.09"/>
          <stop offset="100%" stopColor="#8b3120" stopOpacity="0.02"/>
        </linearGradient>
        <filter id="sm-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Mountain fill */}
      <path d={fillPath} fill="url(#sm-mtn-grad)"/>

      {/* Base line */}
      <line x1="30" y1="238" x2="530" y2="238" stroke="#e2ddd9" strokeWidth="1.5" strokeDasharray="4 4"/>

      {/* Mountain outline — grey */}
      <path d={fullPath} fill="none" stroke="#ddd8d2" strokeWidth="4" strokeLinecap="round"/>

      {/* Highlighted segments (completed path) */}
      {SM_SEGMENTS.map((d, i) => {
        const from = SM_STAGES[i];
        const to   = SM_STAGES[i+1];
        if (!from || !to) return null;
        const fromOk = allReached.includes(from.key);
        const toOk   = allReached.includes(to.key);
        if (!fromOk || !toOk) return null;
        return <path key={i} d={d} fill="none" stroke="var(--accent,#8b3120)"
          strokeWidth="4" strokeLinecap="round" opacity="0.85"/>;
      })}

      {/* Stage nodes */}
      {SM_STAGES.map(s => {
        const done   = doneKeys.includes(s.key);
        const active = activeKey === s.key;
        const fill   = done ? '#16a34a' : active ? 'var(--accent,#8b3120)' : '#ccc8c2';
        const textFill = done ? '#166534' : active ? 'var(--accent,#8b3120)' : '#999';
        const above  = s.cy < 140; // Climax label goes above
        const labelY = above ? s.cy - 32 : s.cy + 36;

        return (
          <g key={s.key}>
            {/* glow ring on active */}
            {active && <circle cx={s.cx} cy={s.cy} r="30" fill="var(--accent,#8b3120)" opacity="0.15"/>}
            {/* node shadow */}
            <circle cx={s.cx} cy={s.cy+3} r="22" fill="#000" opacity="0.08"/>
            {/* node */}
            <circle cx={s.cx} cy={s.cy} r="22" fill={fill} stroke="#fff" strokeWidth="3"
              filter={active ? 'url(#sm-glow)' : undefined}/>
            {/* number or check */}
            <text x={s.cx} y={s.cy+6} textAnchor="middle" fontSize="15"
              fontWeight="700" fill="#fff" fontFamily="system-ui,sans-serif">
              {done ? '✓' : s.num}
            </text>
            {/* stage label */}
            <text x={s.cx} y={labelY} textAnchor="middle" fontSize="13"
              fontWeight={active ? '700' : '500'} fill={textFill} fontFamily="system-ui,sans-serif">
              {s.label}
            </text>
            {/* short sub-label for bottom nodes */}
            {!above && (
              <text x={s.cx} y={labelY+16} textAnchor="middle" fontSize="11"
                fill="#bbb" fontFamily="system-ui,sans-serif">
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Parse ### sections from AI response ── */
function parseHashSections(text) {
  // Robust split: handle ### at start of text or after newline
  const sections = {};
  if (!text) return sections;
  const normalized = /^###/.test(text.trim()) ? '\n' + text.trim() : text;
  const parts = normalized.split(/\n###\s+/);
  parts.forEach((part, i) => {
    if (i === 0) return; // text before first ### heading
    const nl = part.indexOf('\n');
    if (nl === -1) { sections[part.trim()] = ''; return; }
    const key  = part.slice(0, nl).trim();
    const body = part.slice(nl + 1).trim();
    if (key) sections[key] = body;
  });
  return sections;
}

/* ── Parse markdown table → { headers, rows } ── */
function parseMdTable(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 3) return null;
  const headers = lines[0].split('|').slice(1,-1).map(h => h.trim());
  const rows    = lines.slice(2).map(l => l.split('|').slice(1,-1).map(c => c.trim()));
  return { headers, rows };
}

/* ══════════════════════════════════════════════════════
   STORY MOUNTAIN — INTRO
══════════════════════════════════════════════════════ */
function StoryMountainIntro({ item, onStart }) {
  return (
    <div className="qm-intro" style={{maxWidth:560}}>
      <div className="qm-intro-icon">🏔</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">Story Mountain · 5 stages · AI 10-point grading</div>
      <StoryMountainSVG activeKey="intro" doneKeys={[]}/>
      <div className="qm-intro-rules" style={{marginTop:12}}>
        <div className="qm-intro-rule-row"><span>🏠</span><span><strong>Introduction</strong> — characters, setting, situation</span></div>
        <div className="qm-intro-rule-row"><span>📈</span><span><strong>Rising Action</strong> — the problem builds up</span></div>
        <div className="qm-intro-rule-row"><span>⭐</span><span><strong>Climax</strong> — the most exciting moment</span></div>
        <div className="qm-intro-rule-row"><span>📉</span><span><strong>Falling Action</strong> — things start to calm down</span></div>
        <div className="qm-intro-rule-row"><span>🏁</span><span><strong>Resolution</strong> — the story ends clearly</span></div>
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>開始寫作 · Start Writing →</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   STORY MOUNTAIN — PLAYER
══════════════════════════════════════════════════════ */
function StoryMountainPlayer({ item, progressKey, onBack }) {
  const [stageIdx,   setStageIdx]   = useQM(0);
  const [answers,    setAnswers]    = useQM({ intro:'', rising:'', climax:'', falling:'', resolution:'' });
  const [screen,     setScreen]     = useQM('write'); // 'write' | 'review' | 'checking' | 'result'
  const [feedback,   setFeedback]   = useQM('');
  const [activeTab,  setActiveTab]  = useQM('checklist');

  const current  = SM_STAGES[stageIdx];
  const hints    = item.smHints || {};
  const doneKeys = SM_STAGES.slice(0, stageIdx).map(s => s.key);
  const wordCount = (answers[current?.key] || '').trim().split(/\s+/).filter(Boolean).length;

  const goNext = () => {
    if (stageIdx < SM_STAGES.length - 1) setStageIdx(i => i + 1);
    else setScreen('review');
  };
  const goPrev = () => {
    if (stageIdx > 0) setStageIdx(i => i - 1);
  };

  const submit = async () => {
    setScreen('checking');
    const result = await window.checkStoryMountain(item.smPrompt, item.smPassage, answers);
    setFeedback(result);
    saveQuizModeCompletion(progressKey, item, { doneCount: 1, score: countStars(result), total: 5 });
    setScreen('result');
  };

  /* ── Checking screen ── */
  if (screen === 'checking') return (
    <div className="sm-checking">
      <div className="sm-checking-icon">🤖</div>
      <div className="sm-checking-msg">AI 正在批改你的 Story Mountain…</div>
      <div className="sm-checking-bar"><div className="sm-checking-fill"/></div>
    </div>
  );

  /* ── Result screen ── */
  if (screen === 'result' && feedback) {
    const retryFn = () => { setScreen('write'); setStageIdx(0); setFeedback(''); setAnswers({intro:'',rising:'',climax:'',falling:'',resolution:''}); };
    return (
      <div className="sm-result">
        <WritingFeedback text={feedback}/>
        <div className="sm-result-btns">
          <button className="qm-btn secondary" onClick={retryFn}>重新寫一次</button>
          <button className="qm-btn primary" onClick={onBack}>← Back</button>
        </div>
      </div>
    );
  }

  /* ── Review screen ── */
  if (screen === 'review') return (
    <div className="sm-review">
      <div className="sm-review-title">📋 Review your Story Mountain</div>
      {SM_STAGES.map(s => (
        <div key={s.key} className="sm-review-stage">
          <div className="sm-review-stage-head">{s.emoji} {s.label}</div>
          <div className="sm-review-stage-body">{answers[s.key] || <em style={{color:'var(--ink-muted)'}}>（未填寫）</em>}</div>
        </div>
      ))}
      <div className="sm-review-btns">
        <button className="qm-btn secondary" onClick={() => { setStageIdx(SM_STAGES.length-1); setScreen('write'); }}>
          ← 修改
        </button>
        <button className="qm-btn primary" onClick={submit}>
          🤖 送出 AI 批改 →
        </button>
      </div>
    </div>
  );

  /* ── Write screen ── */
  return (
    <div className="sm-player">
      {/* Mountain diagram */}
      <div key={current.key} className="qm-question-swap">
        <StoryMountainSVG activeKey={current.key} doneKeys={doneKeys}/>
      </div>

      {/* Writing prompt (if any) */}
      {item.smPrompt && (
        <div className="sm-prompt-card">
          <span className="sm-prompt-label">✍ Topic</span>
          <span className="sm-prompt-text">{item.smPrompt}</span>
        </div>
      )}

      {/* Stage card */}
      <div className="sm-stage-card">
        <div className="sm-stage-head">
          <span className="sm-stage-emoji">{current.emoji}</span>
          <div>
            <div className="sm-stage-label">{current.label}</div>
            <div className="sm-stage-step">Step {stageIdx+1} of {SM_STAGES.length}</div>
          </div>
        </div>
        {hints[current.key] && (
          <div className="sm-stage-hint">💡 {hints[current.key]}</div>
        )}
        <textarea
          className="sm-textarea"
          value={answers[current.key]}
          onChange={e => setAnswers(prev => ({...prev, [current.key]: e.target.value}))}
          placeholder={`Write your ${current.label} here…`}
          rows={6}
          autoFocus
        />
        <div className="sm-word-count">{wordCount} words</div>
      </div>

      {/* Navigation */}
      <div className="sm-nav">
        <button className="qm-btn secondary" onClick={goPrev} disabled={stageIdx === 0}>
          ← Previous
        </button>
        <button className="qm-btn primary" onClick={goNext}>
          {stageIdx < SM_STAGES.length - 1 ? 'Next →' : 'Review & Submit →'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CLOZE TEST
══════════════════════════════════════════════════════ */
function parseClozePassage(passage) {
  const regex = /\[([^\]]+)\](?:\(([^)]*)\))?/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let blankNum = 0;
  while ((match = regex.exec(passage)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: passage.slice(lastIndex, match.index) });
    }
    blankNum++;
    parts.push({ type: 'blank', num: blankNum, answer: match[1].trim(), hint: match[2] ? match[2].trim() : null });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < passage.length) {
    parts.push({ type: 'text', text: passage.slice(lastIndex) });
  }
  return parts;
}

function ClozeIntro({ item, onStart }) {
  const blankCount = ((item.passage || '').match(/\[[^\]]+\]/g) || []).length;
  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">📝</div>
      <div className="qm-intro-title">{item.title}</div>
      {item.zh && <div className="qm-intro-meta">{item.zh}</div>}
      <div className="qm-intro-meta">{blankCount} blanks · 段落填空</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>📖</span><span>閱讀整段文章，在空格中填入正確答案</span></div>
        <div className="qm-intro-rule-row"><span>💡</span><span>括號內是原形提示，填入正確的動詞變化</span></div>
        <div className="qm-intro-rule-row"><span>✅</span><span>不分大小寫，拼對就算對</span></div>
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>開始填空 · Start →</button>
      </div>
    </div>
  );
}

function normalizeClozeAnswer(answer) {
  return String(answer || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc\uff07`]/g, "'")
    .replace(/\s+/g, ' ');
}

function ClozePlayer({ item, progressKey, onBack }) {
  const parts   = useQMM(() => parseClozePassage(item.passage || ''), [item.id]);
  const blanks  = useQMM(() => parts.filter(p => p.type === 'blank'), [parts]);
  const total   = blanks.length;
  const [inputs,    setInputs]    = useQM({});
  const [submitted, setSubmitted] = useQM(false);
  const [score,     setScore]     = useQM(0);
  const inputRefs = React.useRef({});

  const handleInput = (num, val) => setInputs(prev => ({...prev, [num]: val}));

  const handleKeyDown = (e, num) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const nextRef = inputRefs.current[num + 1];
      if (nextRef) nextRef.focus();
    }
  };

  const handleSubmit = () => {
    let correct = 0;
    const wrongList = [];
    blanks.forEach(b => {
      const userVal = normalizeClozeAnswer(inputs[b.num]);
      if (userVal === normalizeClozeAnswer(b.answer)) {
        correct++;
      } else {
        wrongList.push({ q: `Blank ${b.num}${b.hint ? ` (${b.hint})` : ''}`, answer: b.answer });
      }
    });
    setScore(correct);
    setSubmitted(true);
    saveQuizModeCompletion(progressKey, item, { doneCount: total, score: correct, total, wrongQuestions: wrongList });
    if (window._onQuizComplete) window._onQuizComplete(correct, total, wrongList, { itemId: progressKey });
  };

  const answeredCount = blanks.filter(b => (inputs[b.num] || '').trim()).length;
  const pct = total > 0 ? Math.round(score / total * 100) : 0;

  const renderPassage = () => parts.map((part, i) => {
    if (part.type === 'text') {
      return part.text.split('\n').reduce((acc, line, j, arr) => {
        if (j > 0) acc.push(<br key={`br-${i}-${j}`}/>);
        if (line) acc.push(<span key={`t-${i}-${j}`}>{line}</span>);
        return acc;
      }, []);
    }
    const b = part;
    const userVal   = inputs[b.num] || '';
    const isCorrect = submitted && normalizeClozeAnswer(userVal) === normalizeClozeAnswer(b.answer);
    const isWrong   = submitted && !isCorrect;
    return (
      <span key={`b-${i}`} className="cloze-blank-wrap">
        <span className="cloze-blank-num">{b.num}</span>
        {submitted ? (
          <span className={`cloze-blank-result ${isCorrect ? 'correct' : 'wrong'}`}>
            {isCorrect
              ? <>{userVal} <span className="cloze-check">✓</span></>
              : <>{userVal && <span className="cloze-wrong-ans">{userVal || '—'}</span>}<span className="cloze-right-ans">{b.answer}</span></>
            }
          </span>
        ) : (
          <input
            ref={el => { inputRefs.current[b.num] = el; }}
            className="cloze-input"
            value={userVal}
            onChange={e => handleInput(b.num, e.target.value)}
            onKeyDown={e => handleKeyDown(e, b.num)}
            placeholder="___"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
        {b.hint && <span className="cloze-hint">({b.hint})</span>}
      </span>
    );
  });

  return (
    <div className="cloze-player">
      <div className="cloze-topbar">
        <button className="qm-back-btn" onClick={onBack}>← Back</button>
        {submitted
          ? <span className={`cloze-score-badge ${pct >= 80 ? 'great' : pct >= 60 ? 'ok' : 'low'}`}>
              {score}/{total} · {pct}%
            </span>
          : <span className="mono" style={{fontSize:12,color:'var(--ink-muted)'}}>
              {answeredCount} / {total} filled
            </span>
        }
      </div>

      <div className="cloze-passage">
        {renderPassage()}
      </div>

      <div className="cloze-footer">
        {!submitted ? (
          <button className="qm-btn primary" onClick={handleSubmit} disabled={answeredCount === 0}>
            Submit · 交卷 ({answeredCount}/{total})
          </button>
        ) : (
          <div className="cloze-result-row">
            <span className="cloze-result-emoji">{pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'}</span>
            <span className="cloze-result-text">{score} / {total} correct · {pct}%</span>
            <button className="qm-btn secondary" onClick={onBack}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { QuizModeBlocks, QuizModeCategoryView, QuizModePlayer, getItemQuestions, getQuizItems, WritingPracticePlayer, TypeAnswerPlayer, ShortAnswerPlayer, SyllableDivPlayer, WordSortPlayer, EssayPlayer, StoryMountainPlayer, ClozePlayer, ClozeIntro });
