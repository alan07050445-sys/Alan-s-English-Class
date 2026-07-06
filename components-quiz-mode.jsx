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

// Generate listening (hear word → pick the word) questions from word pairs.
// Capped so long word lists don't bloat the quiz.
function generateListeningQuestions(words, cap = 8) {
  if (!words || words.length < 4 || !window.speechSynthesis) return [];
  return shuffleArr(words).slice(0, cap).map(word => {
    const wrongEn = shuffleArr(words.filter(w => w.en !== word.en).map(w => w.en)).slice(0, 3);
    const opts = shuffleArr([word.en, ...wrongEn]);
    return {
      qtype: 'listening',
      word: word.en,
      q: `🔊 聽音選字：${word.en}`, // stored in wrongQuestions as-is; never displayed during the quiz
      hint: 'Listen and choose · 聽聽看，選出你聽到的字',
      options: opts,
      correct: opts.indexOf(word.en),
    };
  });
}

// Auto-generate MC questions from word pairs (both directions + listening, mixed)
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
  qs.push(...generateListeningQuestions(words));
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
    (item.type === 'flashcard'        && (item.cards || []).length >= 1) || // v233: 單字卡也是可完成的練習
    (item.type === 'vocab-quiz'       && (item.words || []).length >= 2) ||
    (item.type === 'fillblank'        && (item.questions || []).length >= 2) ||
    (item.type === 'quiz'             && (item.questions || []).length > 0) ||
    (item.type === 'writing-practice' && (item.linkedFlashcardId || (item.writingPrompts || []).some(p => p.word))) ||
    (item.type === 'type-answer'      && (item.pairs || []).length >= 1) ||
    (item.type === 'short-answer'     && (item.saQuestions || []).length >= 1) ||
    (item.type === 'syllable-div'     && (item.sdWords || []).length >= 1) ||
    (item.type === 'word-sort'        && (item.sortWords || []).length >= 1 && (item.sortCategories || []).length >= 2) ||
    (item.type === 'essay'            && !!(item.essayPrompt || '').trim()) ||
    (item.type === 'story-mountain'   && !!(item.smPrompt || item.smPassage || '')) ||
    (item.type === 'cloze'            && (item.passage || '').includes('[')) ||
    (item.type === 'circle-answer'    && (item.circleQuestions || []).some(q => q.sentence && q.answer))
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

/* ── 續做（resume）：測驗做到一半離開，下次從同一題接著做 ── */
const QM_RESUME_KEY = 'alans-qm-resume-v1';
function loadResumeMap() { try { return JSON.parse(localStorage.getItem(QM_RESUME_KEY) || '{}'); } catch(e) { return {}; } }
function getResume(progressKey, questionCount) {
  const r = loadResumeMap()[progressKey];
  if (!r || !r.deck || r.deckPos == null) return null;
  if (r.deckPos < 1 || r.deckPos >= r.deck.length) return null;
  if (questionCount != null && r.uniqueTotal !== questionCount) return null; // 老師改過題目 → 作廢
  if (Date.now() - (r.ts || 0) > 7 * 24 * 60 * 60 * 1000) return null;       // 一週後過期
  return r;
}
function saveResume(progressKey, data) {
  try { const m = loadResumeMap(); m[progressKey] = { ...data, ts: Date.now() }; localStorage.setItem(QM_RESUME_KEY, JSON.stringify(m)); } catch(e) {}
}
function clearResume(progressKey) {
  try { const m = loadResumeMap(); if (m[progressKey] !== undefined) { delete m[progressKey]; localStorage.setItem(QM_RESUME_KEY, JSON.stringify(m)); } } catch(e) {}
}

// 星級精熟：用最佳分數決定 0~3 星，鼓勵回去重練拿滿星（驅動複習）
function starsFromScore(pct) {
  if (pct == null) return 0;
  if (pct >= 100) return 3;
  if (pct >= 80)  return 2;
  if (pct >= 50)  return 1;
  return 0;
}
function StarMastery({ pct, size = 13 }) {
  const n = starsFromScore(pct);
  return (
    <span className="qm-stars" style={{ fontSize: size }} title={`精熟度 ${n}/3 星`}>
      {[0,1,2].map(i => <span key={i} className={`qm-star${i < n ? ' on' : ''}`}>★</span>)}
    </span>
  );
}

function getTodayInputValue(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function getQuizItemTotal(item) {
  if (!item) return 0;
  if (item.type === 'flashcard')    return (item.cards || []).length;
  if (item.type === 'type-answer')  return (item.pairs || []).length;
  if (item.type === 'short-answer') return (item.saQuestions || []).length;
  if (item.type === 'syllable-div') return (item.sdWords || []).length;
  if (item.type === 'word-sort')    return (item.sortWords || []).length;
  if (item.type === 'essay') return 1;
  if (item.type === 'story-mountain') return 1;
  if (item.type === 'cloze') return ((item.passage || '').match(/\[[^\]]+\]/g) || []).length;
  if (item.type === 'circle-answer') return (item.circleQuestions || []).filter(q => q.sentence && q.answer).length;
  if (item.type === 'writing-practice') return 1;
  return getItemQuestions(item).length;
}

function getCategoryCountLabel(cat) {
  const title = `${cat?.title || ''} ${cat?.titleZh || ''}`.toLowerCase();
  return (title.includes('word study') || title.includes('字根') || title.includes('字首'))
    ? 'words'
    : 'questions';
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
const CAT_IMG   = {
  vocab:   'icon-vocab.png',
  grammar: 'icon-grammar.png',
  word:    'icon-word.png',
  reading: 'icon-reading.png',
};
const CAT_BG    = {
  vocab:   'linear-gradient(135deg,#667eea,#764ba2)',
  grammar: 'linear-gradient(135deg,#f093fb,#f5576c)',
  word:    'linear-gradient(135deg,#4facfe,#00f2fe)',
  reading: 'linear-gradient(135deg,#43e97b,#38f9d7)',
};
/* 分類圖示：優先使用 AI 插畫圖，找不到時回退 emoji + 漸層 */
function CatIcon({ catId, className }) {
  const img = CAT_IMG[catId];
  if (img) {
    return <div className={className}><img src={img} alt="" className="qm-cat-img"/></div>;
  }
  return <div className={className} style={{ background: CAT_BG[catId] }}>{CAT_ICONS[catId]}</div>;
}

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
      {editMode && (
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
      )}

      {editMode ? (
        <div className="qm-blocks-head">
          <h2 className="qm-blocks-title">本週練習</h2>
          <span className="qm-blocks-hint">編輯分類內容</span>
        </div>
      ) : (
        <div className="qm-blocks-head qm-blocks-head-view">
          <h2 className="qm-blocks-title">{/^sl-/.test(weekId) ? '我的暑假練習' : '自由練習'}</h2>
        </div>
      )}
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
          const catStars = quizItems.reduce((s, it) => {
            const p = qmProg[`${weekId}_${it.id}`];
            const sp = (p && p.total) ? Math.round(p.score / p.total * 100) : null;
            return s + starsFromScore(sp);
          }, 0);
          const maxStars = quizItems.length * 3;
          const clickable = total > 0 || editMode;
          const countLabel = getCategoryCountLabel(cat);
          const BlockTag = editMode ? 'div' : 'button';
          const blockProps = editMode ? {} : {
            type: 'button',
            disabled: !clickable,
            'aria-label': total > 0
              ? `${cat.titleZh || cat.title} ${cat.title}, ${quizItems.length} units, ${total} ${countLabel}, ${pct}% complete`
              : `${cat.titleZh || cat.title} ${cat.title}, coming soon`,
          };

          return (
            <BlockTag
              key={cat.id}
              className={`qm-block${!clickable ? ' empty' : ''}`}
              onClick={() => clickable && onEnterCat(cat)}
              {...blockProps}
            >
              <CatIcon catId={cat.id} className="qm-block-icon"/>
              <div className="qm-block-content">
                <div className="qm-block-title">{cat.titleZh || cat.title}</div>
                {cat.titleZh && <div className="qm-block-title-zh">{cat.title}</div>}
                {total > 0 ? (
                  <>
                    <div className="qm-block-count">{(() => {
                      const doneUnits = quizItems.filter(it => qmProg[`${weekId}_${it.id}`]).length;
                      return doneUnits >= quizItems.length ? '本週練習完成 ✓' : `完成 ${doneUnits} / ${quizItems.length}`;
                    })()}</div>
                    <div className="qm-block-progress">
                      <div className="qm-progress-bar">
                        <div className="qm-progress-fill" style={{ width: pct + '%' }}/>
                      </div>
                      <span className="qm-pct">{pct}%</span>
                    </div>
                    {!editMode && (() => {
                      // 接下來要練的單元＋已練平均分（有才顯示）
                      const nextItem = quizItems.find(it => !qmProg[`${weekId}_${it.id}`]);
                      const scored = quizItems
                        .map(it => qmProg[`${weekId}_${it.id}`])
                        .filter(p => p && p.total > 0);
                      const avg = scored.length
                        ? Math.round(scored.reduce((s, p) => s + p.score / p.total * 100, 0) / scored.length)
                        : null;
                      const parts = [];
                      if (nextItem) parts.push(`接下來：${nextItem.title}`);
                      if (avg != null) parts.push(`已練平均 ${avg} 分`);
                      return parts.length ? <div className="qm-block-meta">{parts.join(' · ')}</div> : null;
                    })()}
                  </>
                ) : editMode ? (
                  <div className="qm-block-count">{allCatItems.length} items · no quiz yet</div>
                ) : (
                  <div className="qm-block-empty">{/^sl-/.test(weekId) ? '這週沒有安排這類練習' : '即將開放 · 老師正在準備本週內容'}</div>
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
            </BlockTag>
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
function QuizModeCategoryView({ cat, items, weekId, onBack, editMode, onAddItem, onEditItem, onDeleteItem, onMoveItem, homework, onSetHomework, weekQuizItems, initialItemId }) {
  const [selectedItem, setSelectedItem] = useQM(null);
  const [phase,        setPhase]        = useQM('intro'); // 'intro' | 'flashcards' | 'quiz'
  const [flashItem,    setFlashItem]    = useQM(null);   // flashcard item to review
  const [playerKey,    setPlayerKey]    = useQM(0);
  const [progVersion,  setProgVersion]  = useQM(0);      // bumped after quiz completes → refreshes sidebar scores

  const quizItems = useQMM(() => getQuizItems(items), [items]);
  // Edit mode: show ALL items so teacher can see & edit non-quiz types too
  const sidebarItems = editMode ? (items || []) : quizItems;
  const explicitMainIds = useQMM(() => new Set((sidebarItems || [])
    .filter(it => it?.mission === 'main' || it?.missionType === 'main' || it?.required === true || it?.isMain === true)
    .map(it => it.id)), [sidebarItems]);
  const homeworkMainIds = useQMM(() => new Set(Object.keys(homework || {})), [homework]);
  const fallbackMainId = !editMode && explicitMainIds.size === 0 && homeworkMainIds.size === 0
    ? sidebarItems[0]?.id
    : null;

  const selectItem = (item) => {
    setSelectedItem(item);
    setPhase('intro');
    setFlashItem(null);
    setPlayerKey(k => k + 1);
  };

  useQME(() => {
    if (editMode || selectedItem || sidebarItems.length === 0) return;
    // 從「今天的任務」點進來 → 直接打開那一個單元
    const wanted = initialItemId && sidebarItems.find(it => it.id === initialItemId);
    if (wanted) { selectItem(wanted); return; }
    const firstMain = sidebarItems.find(it =>
      explicitMainIds.has(it.id) ||
      homeworkMainIds.has(it.id) ||
      it.id === fallbackMainId
    );
    selectItem(firstMain || sidebarItems[0]);
  }, [cat.id, editMode, sidebarItems.length, fallbackMainId]);

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
          <window.Icon name="arrow-left" size={14}/> 返回大廳
        </button>

        <div className="qm-sidebar-cat">
          <CatIcon catId={cat.id} className="qm-sidebar-cat-icon"/>
          <div>
            <div className="qm-sidebar-cat-name">{cat.titleZh || cat.title}</div>
            {cat.titleZh && <div className="qm-sidebar-cat-zh">{cat.title}</div>}
          </div>
        </div>

        {!editMode && quizItems.length > 0 && (() => {
          const doneN = quizItems.filter(it => qmProg[`${weekId}_${it.id}`]).length;
          const pct = Math.round(doneN / quizItems.length * 100);
          return (
            <div className="qm-sidebar-prog" aria-label={`本分類完成 ${doneN} / ${quizItems.length}`}>
              <div className="qm-sidebar-prog-bar"><i style={{ width: pct + '%' }}/></div>
              <span className="qm-sidebar-prog-lbl">{doneN === quizItems.length ? '✓ 全部完成' : `完成 ${doneN} / ${quizItems.length}`}</span>
            </div>
          );
        })()}

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
            const scorePct = (prog && prog.score != null) ? Math.round(prog.score / prog.total * 100) : null; // 單字卡完成無分數 → 不顯示 %
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
            const isCircle       = item.type === 'circle-answer';
            const isFlashcard    = item.type === 'flashcard';
            const hasQuiz  = totalQ > 0 || isWriting || isTypeAnswer || isShortAnswer || isSyllableDiv || isWordSort || isEssay || isStoryMtn || isCloze || isCircle || (isFlashcard && (item.cards || []).length > 0);
            const hw       = (homework || {})[item.id]; // { dueDate }
            const isMainMission = !editMode && (
              explicitMainIds.has(item.id) ||
              homeworkMainIds.has(item.id) ||
              item.id === fallbackMainId
            );
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
                        {isFlashcard ? `🃏 ${(item.cards||[]).length} 張單字卡` : isStoryMtn ? '🏔 故事山寫作' : isEssay ? '✍ 意見寫作' : isWriting ? `✍ ${getWritingPracticePrompts(item, items || []).length} 個題目` : isTypeAnswer ? `⌨ ${(item.pairs||[]).length} 個單字` : isShortAnswer ? `📖 ${(item.saQuestions||[]).length} 題` : isSyllableDiv ? `✂️ ${(item.sdWords||[]).length} 個單字` : isWordSort ? `🗂 ${(item.sortWords||[]).length} 個單字` : isCloze ? `📝 ${((item.passage||'').match(/\[[^\]]+\]/g)||[]).length} 格` : isCircle ? `⭕ ${(item.circleQuestions||[]).length} 題` : `${totalQ} 題`}
                        {scorePct !== null && !isWriting && <span className="qm-unit-score-badge">{scorePct}%</span>}
                        {scorePct !== null && !isWriting && <StarMastery pct={scorePct}/>}
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
        ) : selectedItem?.type === 'flashcard' && phase === 'intro' ? (
          <FlashcardStandaloneIntro
            item={selectedItem}
            cat={cat}
            done={!!qmProg[`${weekId}_${selectedItem.id}`]}
            onStart={() => setPhase('quiz')}
          />
        ) : selectedItem?.type === 'flashcard' ? (
          <FlashcardStandalone
            key={quizSwapKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            isHomework={!editMode && !!((homework || {})[selectedItem.id])}
            onDone={(goTasks) => {
              setProgVersion(v => v + 1);
              if (goTasks) onBack(); else setPhase('intro');
            }}
          />
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
        ) : selectedItem?.type === 'circle-answer' && phase === 'quiz' ? (
          <CircleAnswerPlayer
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'circle-answer' && phase === 'intro' ? (
          <CircleAnswerIntro item={selectedItem} onStart={() => setPhase('quiz')} />
        ) : selectedItem?.type === 'essay' && phase === 'intro' ? (
          <EssayIntro
            item={selectedItem}
            onStart={() => setPhase('quiz')}
          />
        ) : phase === 'intro' ? (
          <QuizIntroScreen
            item={selectedItem}
            cat={cat}
            questions={getItemQuestions(selectedItem)}
            catItems={items || []}
            onFlashcards={(fi) => { setFlashItem(fi); setPhase('flashcards'); }}
            onStartQuiz={() => setPhase('quiz')}
            resumeAt={(getResume(`${weekId}_${selectedItem.id}`, getItemQuestions(selectedItem).length) || {}).deckPos || null}
          />
        ) : phase === 'flashcards' && flashItem ? (
          <div className="qm-fc-player-wrap">
            <div className="qm-fc-player-bar">
              <span className="qm-fc-player-title">{flashItem.title}</span>
              <button className="qm-fc-start-btn" onClick={() => setPhase('quiz')}>
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
            onBackToTasks={!editMode && homework && selectedItem && homework[selectedItem.id] ? onBack : null}
          />
        )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   單字卡獨立練習（v233）——flashcard 自己就是一份功課：
   intro → FlashcardPlayer（卡片/配對/拼字自由玩）→「完成練習」寫進度。
   完全不動題庫資料，只寫學生自己的完成紀錄。
══════════════════════════════════════════════════════ */
function FlashcardStandaloneIntro({ item, cat, done, onStart }) {
  const n = (item.cards || []).length;
  return (
    <div className="qm-intro">
      {cat ? <CatIcon catId={cat.id} className="qm-intro-caticon"/> : <div className="qm-intro-icon">🃏</div>}
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{n} 張單字卡</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>🃏</span><span>翻卡片記單字，也可以玩配對、拼字小遊戲</span></div>
        <div className="qm-intro-rule-row"><span>✓</span><span>練熟之後，按上方的「完成練習」就完成了</span></div>
      </div>
      {done && <div className="qm-intro-fcdone">✓ 已經完成過——再練一次，單字更熟！</div>}
      <div className="qm-intro-btns">
        <button className="qm-btn primary qm-intro-start" onClick={onStart}>開始練習 →</button>
      </div>
    </div>
  );
}

function FlashcardStandalone({ item, progressKey, isHomework, onDone }) {
  const finish = () => {
    const n = (item.cards || []).length || 1;
    saveQuizModeCompletion(progressKey, item, { doneCount: n, score: null, total: n });
    if (window.playSound) window.playSound('complete');
    onDone(isHomework);
  };
  return (
    <div className="qm-fc-player-wrap">
      <div className="qm-fc-player-bar">
        <span className="qm-fc-player-title">{item.title}</span>
        <button className="qm-fc-start-btn" onClick={finish}>✓ 完成練習{isHomework ? ' · 回今天的任務' : ''}</button>
      </div>
      <window.FlashcardPlayer item={item}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PRE-QUIZ INTRO SCREEN
══════════════════════════════════════════════════════ */
function QuizIntroScreen({ item, cat, questions, catItems, onFlashcards, onStartQuiz, resumeAt }) {
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
      {cat ? (
        <CatIcon catId={cat.id} className="qm-intro-caticon"/>
      ) : (
        <div className="qm-intro-icon">
          {item.type === 'vocab-quiz' ? '📚' : item.type === 'fillblank' ? '✏️' : '📝'}
        </div>
      )}
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{questions.length} 題</div>
      <div className="qm-intro-btns">
        {fcItems.length > 0 && (
          <div className="qm-intro-fc-group">
            <div className="qm-intro-fc-label">📖 先複習單字卡</div>
            {fcItems.map(fc => (
              <button key={fc.id} className="qm-btn secondary qm-intro-fc-btn" onClick={() => onFlashcards(fc)}>
                {fc.title} <span className="qm-intro-fc-count">({(fc.cards||[]).length} 張)</span>
              </button>
            ))}
          </div>
        )}
        <button className="qm-btn primary qm-intro-start" onClick={onStartQuiz}>
          {resumeAt ? `繼續測驗 · 從第 ${resumeAt + 1} 題 →` : '開始測驗 →'}
        </button>
        {resumeAt ? <div className="qm-intro-resume">上次做到一半，進度已幫你保留 ✓</div> : null}
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
function QuizResultScreen({ finalScore, total, finalPct, title, wrongList, onRestart, onBack, onBackToTasks }) {
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
      <div className="qm-result-pct">答對率 {animPct}%</div>

      <div className="qm-result-msg">{msg}</div>

      <div className="qm-result-btns">
        <button className="qm-btn secondary" onClick={onRestart}>再試一次</button>
        {onBackToTasks
          ? <button className="qm-btn primary" onClick={onBackToTasks}>回今天的任務 →</button>
          : <button className="qm-btn primary" onClick={onBack}>回單元列表 →</button>}
      </div>
      {onBackToTasks && (
        <button className="qm-result-alt" onClick={onBack}>留在這一類，看單元列表 →</button>
      )}

      {wrongList && wrongList.length > 0 && (
        <div className="qm-wrong-list">
          <div className="qm-wrong-title">需要複習（{wrongList.length}）</div>
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

function QuizModePlayer({ cat, item, questions, progressKey, weekId, allQuizItems, onBack, onQuizDone, onBackToTasks }) {
  // Adaptive deck: wrong questions are reinserted 3 positions later
  const uniqueTotal = questions.length;
  // 有做到一半的紀錄 → 從那一題接著做（deck 含補考題、對錯數都還原）
  const resume = useQMM(() => getResume(progressKey, questions.length), []);
  const [deck,       setDeck]      = useQM(() => resume ? resume.deck : [...questions]);
  const [deckPos,    setDeckPos]   = useQM(() => resume ? resume.deckPos : 0);
  const [selected,   setSelected]  = useQM(null);
  const [firstRight, setFirstRight]= useQM(() => resume ? resume.firstRight : 0);  // correct on FIRST attempt (for score)
  const [screen,     setScreen]    = useQM('quiz');
  const [wrongList,  setWrongList] = useQM(() => resume ? (resume.wrongList || []) : []);
  const [plusOneKey, setPlusOneKey]= useQM(0);
  const [lastRight,  setLastRight] = useQM(null);

  const q      = deck[deckPos];
  const total  = uniqueTotal;
  const isLast = deckPos >= deck.length - 1;
  // Progress = first-try correct / unique total
  const pct    = Math.round(firstRight / total * 100);

  // Auto-play listening questions when they appear (may silently fail on iOS
  // before the first user gesture — the 🔊 button always works as fallback).
  useQME(() => {
    const cur = deck[deckPos];
    if (cur?.qtype === 'listening' && screen === 'quiz') {
      window.speakText(cur.word);
    }
  }, [deckPos, screen]);

  // 每前進一題就把進度存起來——中途關掉，下次不用重來
  useQME(() => {
    if (screen !== 'quiz' || deckPos <= 0) return;
    saveResume(progressKey, { deck, deckPos, firstRight, wrongList, uniqueTotal });
  }, [deckPos]);

  if (!q) return null;

  const goToNextQuestion = () => {
    setDeckPos(i => i + 1);
    setSelected(null);
    setLastRight(null);
  };

  const completeQuiz = (fs = firstRight, finalWrongList = wrongList) => {
    clearResume(progressKey); // 做完了 → 清掉中途紀錄
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
        onBackToTasks={onBackToTasks}
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
        {q.qtype === 'listening' ? (
          <button className="qm-listen-btn" onClick={() => window.speakText(q.word)} title="再聽一次">
            <span className="qm-listen-icon">🔊</span>
            <span className="qm-listen-label">點擊重聽 · Tap to replay</span>
          </button>
        ) : (
          <div className="qm-question-text">{q.q}</div>
        )}
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
function getWritingPracticePrompts(item, catItems) {
  const allFc = (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0);
  const fc = item.linkedFlashcardId
    ? (allFc.find(it => it.id === item.linkedFlashcardId) || allFc[0])
    : null;
  const fromFlashcard = fc
    ? (fc.cards || []).map(c => ({
        word: c.term || c.front || c.en || '',
        zh: c.zh || c.back || '',
        instruction: 'Use the word in a sentence',
        source: 'flashcard',
      })).filter(c => c.word.trim())
    : [];
  const custom = (item.writingPrompts || []).map(p => ({
    word: p.word || p.prompt || '',
    zh: p.zh || '',
    instruction: p.instruction || '',
    source: 'custom',
  })).filter(p => p.word.trim());
  return [...fromFlashcard, ...custom];
}

function WritingPracticeIntro({ item, catItems, onStart }) {
  const prompts = getWritingPracticePrompts(item, catItems);
  const wordCount = prompts.length;

  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">✍</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{wordCount} prompts · AI 造句批改</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>📝</span><span>每個題目造一個英文句子</span></div>
        <div className="qm-intro-rule-row"><span>📏</span><span>至少 7 個字</span></div>
        <div className="qm-intro-rule-row"><span>✅</span><span>必須符合題目要求或正確表達單字意思</span></div>
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
  const words = useQMM(() => getWritingPracticePrompts(item, catItems), [item, catItems]);

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
    const result = await window.checkWriting(current.word, sentence, current.instruction || '', current.zh || '');
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
      <div className="wp-empty-msg">找不到造句題</div>
      <div className="wp-empty-sub">請綁定單字卡，或在編輯模式中新增自訂造句題</div>
    </div>
  );

  if (done) return (
    <div className="wp-done">
      <div className="wp-done-icon">✦</div>
      <div className="wp-done-title">Writing Practice Complete</div>
      <div className="wp-done-sub">已完成 {total} 題造句</div>
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
        <div className="wp-instruction">{current.instruction || 'Use this prompt in a sentence'}</div>
        <div className="wp-word">{current.word}</div>
        {current.zh && <div className="wp-zh">{current.zh}</div>}
        <div className="wp-rules">
          <span>· Must clearly answer the prompt</span>
          <span>· At least 7 words</span>
        </div>
      </div>
      <textarea
        className="qm-writing-input wp-input"
        value={sentence}
        onChange={e => setSentence(e.target.value)}
        onKeyDown={handleSentenceKeyDown}
        placeholder={`Write a sentence for "${current.word}"…`}
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
            {idx + 1 >= total ? '完成 ✦' : '下一題 →'}
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
   CIRCLE ANSWER
══════════════════════════════════════════════════════ */
function normalizeCircleValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc\uff07`]/g, "'")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function tokenizeCircleSentence(sentence) {
  return String(sentence || '').match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\p{L}\p{N}\s]+|\s+/gu) || [];
}

function CircleAnswerIntro({ item, onStart }) {
  const questions = (item.circleQuestions || []).filter(q => q.sentence && q.answer);
  const hasClassification = questions.some(q => q.label);
  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">⭕</div>
      <div className="qm-intro-title">{item.title}</div>
      {item.zh && <div className="qm-intro-meta">{item.zh}</div>}
      <div className="qm-intro-meta">{questions.length} questions · 圈出答案</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>⭕</span><span>點選句子中的正確單字，把它圈起來</span></div>
        {hasClassification && <div className="qm-intro-rule-row"><span>✏️</span><span>圈選後，再完成單字分類</span></div>}
        <div className="qm-intro-rule-row"><span>🔍</span><span>交卷前可以隨時更改答案</span></div>
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>開始作答 · Start →</button>
      </div>
    </div>
  );
}

function CircleAnswerPlayer({ item, progressKey, onBack }) {
  const questions = useQMM(
    () => (item.circleQuestions || [])
      .filter(q => q.sentence && q.answer)
      .map((q, index) => ({ ...q, _circleKey: q.id || `circle-${index}` })),
    [item.id]
  );
  const labels = useQMM(() => {
    const configured = (item.circleLabels || []).map(v => String(v).trim()).filter(Boolean);
    const fromQuestions = questions.map(q => String(q.label || '').trim()).filter(Boolean);
    return [...new Set([...configured, ...fromQuestions])];
  }, [item.id, questions]);
  const [selectedWords, setSelectedWords] = useQM({});
  const [selectedLabels, setSelectedLabels] = useQM({});
  const [submitted, setSubmitted] = useQM(false);
  const [score, setScore] = useQM(0);

  const isQuestionComplete = q => selectedWords[q._circleKey] !== undefined && (!q.label || !!selectedLabels[q._circleKey]);
  const completedCount = questions.filter(isQuestionComplete).length;

  const isCircleCorrect = q => {
    const tokens = tokenizeCircleSentence(q.sentence);
    return normalizeCircleValue(tokens[selectedWords[q._circleKey]]) === normalizeCircleValue(q.answer);
  };
  const isLabelCorrect = q => !q.label || normalizeCircleValue(selectedLabels[q._circleKey]) === normalizeCircleValue(q.label);
  const isQuestionCorrect = q => isCircleCorrect(q) && isLabelCorrect(q);

  const handleSubmit = () => {
    const correct = questions.filter(isQuestionCorrect).length;
    const wrongList = questions.reduce((list, q, index) => {
      if (!isQuestionCorrect(q)) {
        list.push({
          q: `Question ${index + 1}: ${q.sentence}`,
          answer: q.label ? `${q.answer} · ${q.label}` : q.answer
        });
      }
      return list;
    }, []);
    setScore(correct);
    setSubmitted(true);
    saveQuizModeCompletion(progressKey, item, {
      doneCount: questions.length,
      score: correct,
      total: questions.length,
      wrongQuestions: wrongList
    });
    if (window._onQuizComplete) window._onQuizComplete(correct, questions.length, wrongList, { itemId: progressKey });
  };

  const reset = () => {
    setSelectedWords({});
    setSelectedLabels({});
    setSubmitted(false);
    setScore(0);
  };

  return (
    <div className="circle-player">
      <div className="circle-topbar">
        <button className="qm-back-btn" onClick={onBack}>← Back</button>
        <span className="circle-instruction">
          {item.circleInstruction || 'Circle the correct answer in each sentence.'}
        </span>
        <span className="circle-progress">{submitted ? `${score}/${questions.length}` : `${completedCount}/${questions.length}`}</span>
      </div>

      <div className="circle-question-list">
        {questions.map((q, qIndex) => {
          const tokens = tokenizeCircleSentence(q.sentence);
          const circleCorrect = submitted && isCircleCorrect(q);
          const labelCorrect = submitted && isLabelCorrect(q);
          const questionCorrect = submitted && circleCorrect && labelCorrect;
          return (
            <div key={q._circleKey} className={`circle-question${submitted ? questionCorrect ? ' correct' : ' wrong' : ''}`}>
              <div className="circle-question-number">{qIndex + 1}</div>
              <div className="circle-question-body">
                <div className="circle-sentence">
                  {tokens.map((token, tokenIndex) => {
                    if (/^\s+$/.test(token)) return <span key={tokenIndex}>{token}</span>;
                    if (!/[\p{L}\p{N}]/u.test(token)) return <span key={tokenIndex}>{token}</span>;
                    const selected = selectedWords[q._circleKey] === tokenIndex;
                    const correctAnswer = submitted && normalizeCircleValue(token) === normalizeCircleValue(q.answer);
                    return (
                      <button
                        key={tokenIndex}
                        className={`circle-word${selected ? ' selected' : ''}${submitted && selected ? circleCorrect ? ' correct' : ' wrong' : ''}${correctAnswer ? ' answer' : ''}`}
                        onClick={() => !submitted && setSelectedWords(prev => ({...prev, [q._circleKey]: tokenIndex}))}
                        disabled={submitted}
                      >
                        {token}
                      </button>
                    );
                  })}
                </div>

                {q.label && (
                  <div className="circle-classify">
                    <span className="circle-classify-label">Classify:</span>
                    <div className="circle-label-options">
                      {labels.map(label => {
                        const selected = selectedLabels[q._circleKey] === label;
                        const correctAnswer = submitted && normalizeCircleValue(label) === normalizeCircleValue(q.label);
                        return (
                          <button
                            key={label}
                            className={`circle-label-option${selected ? ' selected' : ''}${submitted && selected ? labelCorrect ? ' correct' : ' wrong' : ''}${correctAnswer ? ' answer' : ''}`}
                            onClick={() => !submitted && setSelectedLabels(prev => ({...prev, [q._circleKey]: label}))}
                            disabled={submitted}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {submitted && !questionCorrect && (
                  <div className="circle-correction">
                    Correct answer: <strong>{q.answer}</strong>{q.label ? <> · <strong>{q.label}</strong></> : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="circle-footer">
        {!submitted ? (
          <button className="qm-btn primary" onClick={handleSubmit} disabled={completedCount < questions.length}>
            Submit · 交卷 ({completedCount}/{questions.length})
          </button>
        ) : (
          <>
            <div className="circle-result">{score} / {questions.length} correct</div>
            <button className="qm-btn secondary" onClick={reset}>Try again</button>
            <button className="qm-btn secondary" onClick={onBack}>← Back</button>
          </>
        )}
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

/* ══════════════════════════════════════════════════════
   WEEKLY CONTACT BOOK — 本週聯絡簿（家長看的指定作業清單）
   來源：老師用 📌 標成作業的項目（week.homework）＋ 老師留言（week.parentNote）
   狀態：從 qmProg 抓孩子的完成/分數。可收合。
══════════════════════════════════════════════════════ */
/* ── 本週總覽 hero：週次/主題/日期 + 完成度圓環 + 繼續練習 ── */
function WeekHero({ week, weekIdx, weekOrder, done, total, who }) {
  const pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
  const weekNum = ((week.label || '').match(/(\d+)\s*$/) || [])[1] || (weekIdx + 1);
  const title = week.themeZh || week.theme || (who ? `${who} 的第 ${weekNum} 週任務` : `第 ${weekNum} 週的練習`);
  const enTheme = week.themeZh ? week.theme : '';
  const R = 26, CIRC = 2 * Math.PI * R;
  const allDone = total > 0 && done >= total;

  // 圓環進度動畫：從 0 畫到目前完成度（回到大廳時重播；reduced-motion 直接定住）
  const ringRef = React.useRef(null);
  useQME(() => {
    const el = ringRef.current;
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    el.style.transition = 'none';
    el.style.strokeDashoffset = CIRC;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1) .15s';
      el.style.strokeDashoffset = CIRC * (1 - pct / 100);
    }));
  }, []);

  return (
    <section className="wh" aria-label="本週總覽">
      <div className="wh-info">
        <div className="wh-kicker">
          <span className="wh-pill">Week {weekNum}</span>
          <span className="wh-kick-txt">{who ? `${who} 的暑假` : '本週進度'}</span>
        </div>
        <h1 className="wh-title">{title}</h1>
        {(enTheme || (week.dateRange && week.dateRange !== '—')) && (
          <div className="wh-meta">
            {enTheme && <span className="wh-theme-en">{enTheme}</span>}
            {week.dateRange && week.dateRange !== '—' && <span className="wh-date">{week.dateRange}</span>}
          </div>
        )}
      </div>
      <div className="wh-side">
        {total > 0 ? (
          <>
            <div className="wh-ring-wrap" role="img" aria-label={`本週完成度 ${pct}%`}>
              <svg className="wh-ring" viewBox="0 0 64 64">
                <circle className="wh-ring-bg" cx="32" cy="32" r={R}/>
                <circle ref={ringRef} className="wh-ring-fill" cx="32" cy="32" r={R}
                  strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct / 100)}/>
              </svg>
              <span className="wh-ring-num">{pct}%</span>
            </div>
            <div className="wh-side-info">
              <span className="wh-count">完成 {done} / {total} 個練習</span>
              {allDone && <span className="wh-done-msg">🎉 本週練習全部完成！</span>}
            </div>
          </>
        ) : (
          <span className="wh-empty">老師正在準備本週內容，可以先回顧前幾週</span>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   今天的任務（v229）——學習頁主角：老師指定作業攤平成待辦清單，
   點一條直達該單元；做到一半顯示「繼續」；完成打勾。
   （老師編輯模式仍用下面的 WeeklyContactBook 來釘作業/寫給家長的話）
══════════════════════════════════════════════════════ */
function TodayTasks({ week, allItems, qmProg, weekId, categories, onOpenTask }) {
  const note = week.parentNote || '';
  const hw = week.homework || {};
  const itemById = {};
  (allItems || []).forEach(it => { itemById[it.id] = it; });
  const dueText = (d) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000);
    return diff > 1 ? `${diff} 天後到期` : diff === 1 ? '明天到期' : diff === 0 ? '今天到期' : '已過期';
  };
  const tasks = Object.keys(hw).map(id => {
    const it = itemById[id];
    if (!it) return null;
    const prog = (qmProg || {})[`${weekId}_${id}`];
    const done = !!(prog && prog.done);
    const pct  = (done && prog.total && prog.score != null) ? Math.round(prog.score / prog.total * 100) : null;
    const resume = !done ? getResume(`${weekId}_${id}`, null) : null;
    const cat = (categories || []).find(c => c.id === it._cat);
    return { id, it, cat, dueDate: hw[id] && hw[id].dueDate, done, pct, resumeAt: resume ? resume.deckPos : null };
  }).filter(Boolean);
  // 未完成在前（先到期的先做），完成的沉底
  tasks.sort((a, b) => (a.done - b.done) || String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));
  const doneN = tasks.filter(t => t.done).length;
  const allDone = tasks.length > 0 && doneN === tasks.length;

  return (
    <section className="tt" aria-label="今天的任務">
      <div className="tt-head">
        <span className="tt-title">📌 今天的任務</span>
        {tasks.length > 0 && !allDone && <span className="tt-count">完成 {doneN} / {tasks.length}</span>}
      </div>
      {note && <div className="tt-note">💬 老師的話：{note}</div>}
      {tasks.length === 0 ? (
        <div className="tt-empty">這週老師沒有指定作業——從下面挑一個自由練習吧！</div>
      ) : (
        <div className="tt-list">
          {tasks.map(t => {
            const due = dueText(t.dueDate);
            return (
              <button key={t.id} className={`tt-row${t.done ? ' tt-done' : ''}`} onClick={() => t.cat && onOpenTask(t.cat, t.id)}>
                <CatIcon catId={t.cat ? t.cat.id : 'vocab'} className="tt-ic"/>
                <span className="tt-body">
                  <b className="tt-name">{t.it.title}</b>
                  <span className="tt-meta">
                    {t.cat ? (t.cat.titleZh || t.cat.title) : ''}
                    {due && !t.done ? <span className={due === '已過期' ? ' tt-late' : ''}> · {due}</span> : null}
                  </span>
                </span>
                <span className="tt-state">
                  {t.done
                    ? <span className="tt-s-ok">✓ {t.pct != null ? `${t.pct} 分` : '完成'}</span>
                    : t.resumeAt
                      ? <span className="tt-s-resume">▶ 繼續 · 第 {t.resumeAt + 1} 題</span>
                      : <span className="tt-s-todo">開始 →</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {allDone && <div className="tt-alldone">🎉 今天的作業都完成了，太棒了！</div>}
    </section>
  );
}

function WeeklyContactBook({ week, allItems, qmProg, weekId, categories, onEnterCat, editMode, onUpdateWeek }) {
  const CB_KEY = 'alan-cb-collapsed';
  const [collapsed, setCollapsed] = useQM(() => {
    try { return localStorage.getItem(CB_KEY) !== '0'; } catch(e) { return true; }
  });
  const toggle = () => setCollapsed(c => {
    const n = !c;
    try { localStorage.setItem(CB_KEY, n ? '1' : '0'); } catch(e) {}
    return n;
  });

  const ET = window.EditableText;
  const note = week.parentNote || '';
  const hw = week.homework || {};
  const hwIds = Object.keys(hw);

  const itemById = {};
  (allItems || []).forEach(it => { itemById[it.id] = it; });

  const assignments = hwIds.map(id => {
    const it   = itemById[id];
    const prog = (qmProg || {})[`${weekId}_${id}`];
    const done = !!(prog && prog.done);
    const pct  = (prog && prog.total) ? Math.round(prog.score / prog.total * 100) : null;
    const cat  = (categories || []).find(c => c.id === (it && it._cat));
    return { id, title: it ? it.title : id, catTitle: cat ? cat.title : '', cat, dueDate: hw[id] && hw[id].dueDate, done, pct };
  });
  const total     = assignments.length;
  const doneCount = assignments.filter(a => a.done).length;
  const allDone   = total > 0 && doneCount === total;

  // 沒作業也保留收合條——家長才知道有這個功能（v203）

  const dueText = (d) => {
    if (!d) return '待完成';
    const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000);
    return diff > 0 ? `${diff} 天後到期` : diff === 0 ? '今天到期' : '已過期';
  };

  return (
    <div className={`cb${collapsed ? '' : ' open'}`}>
      <button className="cb-bar" onClick={toggle} aria-expanded={!collapsed}>
        <span className="cb-bar-title"><span className="cb-ico">📓</span> 本週聯絡簿</span>
        {collapsed && total > 0 && !allDone && (() => {
          // 收合時直接預覽下一項作業（依到期日先後）
          const next = assignments
            .filter(a => !a.done)
            .sort((a, b) => String(a.dueDate || '9999') < String(b.dueDate || '9999') ? -1 : 1)[0];
          return next ? (
            <span className="cb-next">
              下一項：{next.title}{next.dueDate ? ` · ${dueText(next.dueDate)}` : ''}
            </span>
          ) : null;
        })()}
        <span className="cb-bar-right">
          {allDone
            ? <span className="cb-status done">✓ 本週作業都完成了！</span>
            : total > 0
              ? <span className="cb-status">{doneCount} / {total} 完成</span>
              : <span className="cb-status muted">尚未指定作業</span>}
          <span className={`cb-chev${collapsed ? '' : ' open'}`}>⌄</span>
        </span>
      </button>
      {!collapsed && (
        <div className="cb-body">
          {(note || editMode) && (
            <div className="cb-note">
              <span className="cb-note-ico">💬</span>
              {editMode
                ? <ET value={note} editMode multiline placeholder="給家長的話…（例：星期五前完成造句，下週小考會考）" onChange={v => onUpdateWeek({ parentNote: v })} className="cb-note-input"/>
                : <span className="cb-note-text">{note}</span>}
            </div>
          )}
          {total === 0 ? (
            <div className="cb-empty">{editMode ? '在各分類用 📌 把練習指定為作業，就會出現在這裡' : '本週尚未指定作業'}</div>
          ) : (
            <div className="cb-list">
              {assignments.map(a => (
                <button key={a.id} className={`cb-row${a.done ? ' done' : ''}`} onClick={() => a.cat && onEnterCat(a.cat)}>
                  <span className={`cb-check${a.done ? ' done' : ''}`}>{a.done ? '✓' : ''}</span>
                  <span className="cb-row-info">
                    <span className="cb-row-title">{a.title}</span>
                    <span className="cb-row-cat">{a.catTitle}</span>
                  </span>
                  {a.done
                    ? <span className="cb-row-status done">{a.pct != null ? `完成 · ${a.pct}分` : '完成'}</span>
                    : <span className="cb-row-due">{dueText(a.dueDate)}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Growth Report (parent-facing, cross-week progress) ──── */
function GrowthReport({ weeks, weekOrder, qmProg, categories, studentName, onClose }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const data = React.useMemo(() => {
    const perWeek = [];
    let totalDone = 0, gSum = 0, gN = 0;
    (weekOrder || []).forEach(wid => {
      const w = weeks[wid];
      if (!w) return;
      let total = 0, done = 0, sSum = 0, sN = 0;
      (categories || []).forEach(c => {
        ((w.items && w.items[c.id]) || []).forEach(it => {
          total++;
          const p = (qmProg || {})[`${wid}_${it.id}`];
          if (p && p.done) {
            done++; totalDone++;
            if (p.total) {
              const pct = Math.min(100, Math.round(p.score / p.total * 100));
              sSum += pct; sN++; gSum += pct; gN++;
            }
          }
        });
      });
      if (total === 0) return;
      perWeek.push({
        wid, label: w.label || wid, dateRange: w.dateRange || '',
        theme: w.themeZh || w.theme || '',
        total, done, pct: Math.round(done / total * 100), avg: sN ? Math.round(sSum / sN) : null,
      });
    });
    return {
      perWeek, totalDone,
      activeWeeks: perWeek.filter(p => p.done > 0).length,
      avgScore: gN ? Math.round(gSum / gN) : null,
      bestPct: perWeek.reduce((m, p) => Math.max(m, p.pct), 0),
    };
  }, [weeks, weekOrder, qmProg, categories]);

  const pw = data.perWeek;
  const hasData = data.totalDone > 0;

  // ── SVG line chart geometry ──
  const W = 640, H = 200, padL = 14, padR = 14, padT = 16, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB, baseline = padT + innerH;
  const n = pw.length;
  const xAt = (i) => n > 1 ? padL + i * innerW / (n - 1) : padL + innerW / 2;
  const yAt = (pct) => padT + (1 - pct / 100) * innerH;
  const linePts = pw.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.pct).toFixed(1)}`).join(' ');
  const areaPts = n > 0 ? `${xAt(0).toFixed(1)},${baseline} ${linePts} ${xAt(n - 1).toFixed(1)},${baseline}` : '';
  const labelStep = n <= 7 ? 1 : Math.ceil(n / 6);
  const shortLabel = (l) => (l || '').replace(/Week\s*/i, 'W');

  return (
    <div className="growth-overlay" onClick={onClose}>
      <div className="growth-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="學習成長">
        <header className="growth-head">
          <div>
            <div className="growth-kicker">📈 學習成長</div>
            <h2 className="growth-title">{studentName ? `${studentName} 的進步軌跡` : '這學期的進步軌跡'}</h2>
          </div>
          <button className="growth-x" onClick={onClose} aria-label="關閉">×</button>
        </header>

        <div className="growth-body">
          {!hasData ? (
            <div className="growth-empty">
              <div className="growth-empty-ico">🌱</div>
              <p className="growth-empty-title">還沒有學習紀錄</p>
              <p className="growth-empty-sub">完成練習後，這裡會畫出每週的成長軌跡，看得到一整學期的進步。</p>
            </div>
          ) : (
            <>
              <div className="growth-stats">
                <div className="growth-stat">
                  <div className="growth-stat-num">{data.totalDone}</div>
                  <div className="growth-stat-label">完成練習</div>
                </div>
                <div className="growth-stat">
                  <div className="growth-stat-num">{data.activeWeeks}</div>
                  <div className="growth-stat-label">學習週數</div>
                </div>
                <div className="growth-stat">
                  <div className="growth-stat-num">{data.avgScore != null ? data.avgScore : '—'}</div>
                  <div className="growth-stat-label">平均分數</div>
                </div>
                <div className="growth-stat">
                  <div className="growth-stat-num">{data.bestPct}%</div>
                  <div className="growth-stat-label">最佳單週</div>
                </div>
              </div>

              <div className="growth-chart-wrap">
                <div className="growth-chart-title">每週完成率</div>
                <svg className="growth-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="每週完成率折線圖">
                  {[0, 25, 50, 75, 100].map(g => (
                    <g key={g}>
                      <line x1={padL} y1={yAt(g)} x2={W - padR} y2={yAt(g)} className="growth-grid"/>
                      <text x={padL - 2} y={yAt(g) - 2} className="growth-axis-y">{g}</text>
                    </g>
                  ))}
                  {areaPts && <polygon points={areaPts} className="growth-area"/>}
                  {n > 1 && <polyline points={linePts} className="growth-line"/>}
                  {pw.map((p, i) => (
                    <g key={p.wid}>
                      <circle cx={xAt(i)} cy={yAt(p.pct)} r="4" className="growth-dot"/>
                      {(i % labelStep === 0 || i === n - 1) && (
                        <text x={xAt(i)} y={H - 10} className="growth-axis-x">{shortLabel(p.label)}</text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>

              <div className="growth-weeks">
                {pw.slice().reverse().map(p => (
                  <div className="growth-wrow" key={p.wid}>
                    <div className="growth-wrow-head">
                      <span className="growth-wrow-label">{p.label}</span>
                      {p.dateRange && <span className="growth-wrow-date">{p.dateRange}</span>}
                    </div>
                    <div className="growth-wrow-bar">
                      <div className="growth-wrow-fill" style={{ width: p.pct + '%' }}/>
                    </div>
                    <div className="growth-wrow-meta">
                      <span className="growth-wrow-pct">{p.done}/{p.total}（{p.pct}%）</span>
                      {p.avg != null && <span className="growth-wrow-avg">平均 {p.avg} 分</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <footer className="growth-foot">
          <span className="growth-foot-hint">家長可截圖保存 · 紀錄存在這台裝置與帳號</span>
          <button className="growth-done" onClick={onClose}>關閉</button>
        </footer>
      </div>
    </div>
  );
}

Object.assign(window, { QuizModeBlocks, QuizModeCategoryView, QuizModePlayer, getItemQuestions, getQuizItems, generateListeningQuestions, loadQMProg, getQuizItemTotal, CAT_ICONS, WritingPracticePlayer, TypeAnswerPlayer, ShortAnswerPlayer, SyllableDivPlayer, WordSortPlayer, EssayPlayer, StoryMountainPlayer, CircleAnswerPlayer, CircleAnswerIntro, ClozePlayer, ClozeIntro, WeeklyContactBook, TodayTasks, GrowthReport, WeekHero });
