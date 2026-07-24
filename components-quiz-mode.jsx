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
  if (item.type === 'spelling') return (item.spellWords || []).filter(w => w && w.word); // v254
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

/* ── v276 分段閱讀 guided-reading：資料 helpers ──
   段落 = { id, text, questions:[{ kind:'mc', q, options[4], answer:idx } | { kind:'short', q, keyPoints }] }
   有效題目定義三處共用（可玩判定/總題數/播放器），避免計數不一致 */
function grValidQs(seg) {
  return (seg && Array.isArray(seg.questions) ? seg.questions : []).filter(q => {
    if (!q || !(q.q || '').trim()) return false;
    if (q.kind === 'short') return true;
    const opts = (q.options || []).map(o => String(o || '').trim());
    return opts.filter(Boolean).length >= 2 && !!opts[q.answer != null ? q.answer : 0];
  });
}
function grSegs(item) {
  return (item && Array.isArray(item.grSegments) ? item.grSegments : [])
    .filter(s => s && ((s.text || '').trim() || (s.img && s.img.url) || grValidQs(s).length > 0));
}
function grFinalQs(item) { // v281: 全部讀完後的整篇綜合題（item.grFinal）
  return grValidQs({ questions: (item && item.grFinal) || [] });
}
function grTotalQ(item) {
  return grSegs(item).reduce((n, s) => n + grValidQs(s).length, 0) + grFinalQs(item).length;
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
    (item.type === 'spelling'         && (item.spellWords || []).length >= 1) || // v254: 聽寫
    (item.type === 'short-answer'     && (item.saQuestions || []).length >= 1) ||
    (item.type === 'syllable-div'     && (item.sdWords || []).length >= 1) ||
    (item.type === 'word-sort'        && (item.sortWords || []).length >= 1 && (item.sortCategories || []).length >= 2) ||
    (item.type === 'essay'            && !!(item.essayPrompt || '').trim()) ||
    (item.type === 'story-mountain'   && !!(item.smPrompt || item.smPassage || '')) ||
    (item.type === 'cloze'            && (item.passage || '').includes('[')) ||
    (item.type === 'circle-answer'    && (item.circleQuestions || []).some(q => q.sentence && q.answer)) ||
    (item.type === 'upload') || // v263: 上傳作業——單元本身就是任務，不需要題目
    (item.type === 'guided-reading' && grTotalQ(item) >= 1) // v276: 分段閱讀——至少一題才可玩
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
// v257: key 按帳號隔離——共用電腦上換帳號，不會再看到（或繼承）別人的紀錄。
// 舊的全機共用 key（無後綴）從此不再讀寫；雲端 progress 才是每人的真資料。
const QM_KEY = 'alans-qm-v1';
function qmScope() {
  const u = window._currentUser;
  return u && u.uid ? ':u:' + u.uid : ':anon';
}
function loadQMProg()  { try { return JSON.parse(localStorage.getItem(QM_KEY + qmScope()) || '{}'); } catch(e) { return {}; } }
function saveQMProg(p) { try { localStorage.setItem(QM_KEY + qmScope(), JSON.stringify(p)); } catch(e) {} }

/* ── 續做（resume）：測驗做到一半離開，下次從同一題接著做 ── */
const QM_RESUME_KEY = 'alans-qm-resume-v1';
function loadResumeMap() { try { return JSON.parse(localStorage.getItem(QM_RESUME_KEY + qmScope()) || '{}'); } catch(e) { return {}; } }
function getResume(progressKey, questionCount) {
  const r = loadResumeMap()[progressKey];
  if (!r || !r.deck || r.deckPos == null) return null;
  if (r.deckPos < 1 || r.deckPos >= r.deck.length) return null;
  if (questionCount != null && r.uniqueTotal !== questionCount) return null; // 老師改過題目 → 作廢
  if (Date.now() - (r.ts || 0) > 7 * 24 * 60 * 60 * 1000) return null;       // 一週後過期
  return r;
}
function saveResume(progressKey, data) {
  try { const m = loadResumeMap(); m[progressKey] = { ...data, ts: Date.now() }; localStorage.setItem(QM_RESUME_KEY + qmScope(), JSON.stringify(m)); } catch(e) {}
}
function clearResume(progressKey) {
  try { const m = loadResumeMap(); if (m[progressKey] !== undefined) { delete m[progressKey]; localStorage.setItem(QM_RESUME_KEY + qmScope(), JSON.stringify(m)); } } catch(e) {}
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

/* v272: 題型中文名＋短名——任務清單、側欄、作答頁三處用同一套稱呼，
   學生點「聽寫」進去，看到的每一層都叫「聽寫」 */
const QM_TYPE_ZH = {
  flashcard: '單字卡', spelling: '聽寫', fillblank: '填空', quiz: '測驗',
  'vocab-quiz': '單字測驗', 'type-answer': '打字練習', 'short-answer': '簡答',
  cloze: '克漏字', 'circle-answer': '圈選', 'syllable-div': '音節切分',
  'word-sort': '單字分類', essay: '寫作', 'story-mountain': '故事山',
  'writing-practice': '造句', upload: '上傳作業', 'guided-reading': '分段閱讀',
};
const QM_TYPE_ICO = {
  flashcard: '🃏', spelling: '🔊', fillblank: '✏️', quiz: '📝', 'vocab-quiz': '📚',
  'type-answer': '⌨', 'short-answer': '📖', cloze: '📝', 'circle-answer': '⭕',
  'syllable-div': '✂️', 'word-sort': '🗂', essay: '✍', 'story-mountain': '🏔',
  'writing-practice': '✍', upload: '📎', 'guided-reading': '📖',
};
/* v273: 學習順序——先複習（單字卡）、再認讀（選擇/填空）、最後產出（拼寫/手寫）
   任務清單與學生側欄都按這個順序排；老師編輯模式維持原始順序 */
const QM_TYPE_ORDER = {
  flashcard: 0,
  'vocab-quiz': 1, quiz: 1,
  fillblank: 2, cloze: 3, 'guided-reading': 3, 'circle-answer': 4,
  spelling: 5, 'type-answer': 5, 'syllable-div': 5, 'word-sort': 5,
  'short-answer': 6, 'writing-practice': 6,
  essay: 7, 'story-mountain': 7,
  upload: 8,
};
const qmTypeRank = (t) => (QM_TYPE_ORDER[t] !== undefined ? QM_TYPE_ORDER[t] : 9);

/* v274: 粗略音節拆解——「子音+母音群」切塊、多子音群首字歸前節
   （adapt→a·dapt、happen→hap·pen、survive→sur·vi·ve）。教學提示用，非嚴格音節。 */
function qmSyllables(word) {
  const w = String(word || '').trim();
  if (w.length <= 3 || /[^A-Za-z]/.test(w)) return [w];
  const chunks = w.match(/[^aeiouyAEIOUY]*[aeiouyAEIOUY]+/g) || [w];
  const used = chunks.join('').length;
  if (used < w.length) chunks[chunks.length - 1] += w.slice(used);
  for (let i = 1; i < chunks.length; i++) {
    if (/^[^aeiouyAEIOUY]{2,}/.test(chunks[i])) {
      chunks[i - 1] += chunks[i][0];
      chunks[i] = chunks[i].slice(1);
    }
  }
  return chunks.filter(Boolean);
}

function qmShortLabel(item, groupName) {
  const title = item.title || '';
  if (groupName && title.toLowerCase().startsWith(String(groupName).toLowerCase())) {
    const rest = title.slice(String(groupName).length).replace(/^[\s\-–—_·．.。,，]+/, '').trim();
    if (rest) {
      if (!/[A-Za-z一-鿿]/.test(rest)) {
        const tz = QM_TYPE_ZH[item.type];
        return tz ? `${tz} ${rest}` : rest;
      }
      return rest;
    }
    const tz = QM_TYPE_ZH[item.type];
    if (tz) return tz;
  }
  return title;
}

/* v266: 完成頁導航——各題型共用：「下一個任務 →」＋「回今天的任務」（沒有任務脈絡時退回 onBack） */
function QmDoneNavBtns({ onBack, onBackToTasks, onNextTask, backLabel }) {
  return (
    <>
      {onNextTask ? (
        <button className="qm-btn primary" onClick={onNextTask}>下一個任務 →</button>
      ) : null}
      {onBackToTasks ? (
        <button className={'qm-btn ' + (onNextTask ? 'secondary' : 'primary')} onClick={onBackToTasks}>回今天的任務</button>
      ) : (
        <button className={'qm-btn ' + (onNextTask ? 'secondary' : 'primary')} onClick={onBack}>{backLabel || '← Back'}</button>
      )}
    </>
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
  if (item.type === 'spelling')     return (item.spellWords || []).length; // v254
  if (item.type === 'short-answer') return (item.saQuestions || []).length;
  if (item.type === 'syllable-div') return (item.sdWords || []).length;
  if (item.type === 'word-sort')    return (item.sortWords || []).length;
  if (item.type === 'essay') return 1;
  if (item.type === 'story-mountain') return 1;
  if (item.type === 'cloze') return ((item.passage || '').match(/\[[^\]]+\]/g) || []).length;
  if (item.type === 'circle-answer') return (item.circleQuestions || []).filter(q => q.sentence && q.answer).length;
  if (item.type === 'writing-practice') return 1;
  if (item.type === 'upload') return 1; // v263: 上傳作業＝一件事
  if (item.type === 'guided-reading') return grTotalQ(item); // v276: 分段閱讀＝全部段落的題數
  return getItemQuestions(item).length;
}

function getCategoryCountLabel(cat) {
  const title = `${cat?.title || ''} ${cat?.titleZh || ''}`.toLowerCase();
  return (title.includes('word study') || title.includes('字根') || title.includes('字首'))
    ? 'words'
    : 'questions';
}

function saveQuizModeCompletion(progressKey, item, { doneCount = 1, score = null, total = 1, wrongQuestions = [], extra = null } = {}) {
  const ts = Date.now();
  const localTotal = total || doneCount || 1;
  const localScore = typeof score === 'number' ? score : null;
  const prev = loadQMProg();
  // v255: 重做取「最好的一次」——考更好會更新，考差不會把好成績蓋掉
  const old = prev[progressKey];
  const newPct = localScore != null ? localScore / localTotal : null;
  const oldPct = (old && old.score != null && old.total) ? old.score / old.total : null;
  const keepOld = !!(old && oldPct != null && newPct != null && oldPct > newPct);
  prev[progressKey] = keepOld
    ? { ...old, ts }
    : { done: doneCount || localTotal, score: localScore, total: localTotal, ts };
  saveQMProg(prev);
  if (window._bumpQmProgress) window._bumpQmProgress(); // 大廳（今天的任務）即時刷新——所有題型都會走這裡

  const u = window._currentUser;
  if (u && !keepOld && window.saveProgressItem) {
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
    if (extra) Object.assign(payload, extra); // v263: 題型自帶欄位（上傳作業的照片清單等）
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
function QuizModeBlocks({ week, weekId, onEnterCat, editMode, onUpdateWeek, onAddItem, categories, cloudProg }) {
  const activeCats = categories || window.CATEGORIES;
  // v265: 優先用 app.jsx 傳下來的「本機＋雲端合併」進度——只看本機會漏掉
  // 換裝置（或 v257 本機 key 換新）之前做完、只存在雲端的紀錄
  const qmProg = cloudProg || loadQMProg();
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
            const sp = (p && p.score != null && p.total) ? Math.round(p.score / p.total * 100) : null; // v270
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
                        .filter(p => p && p.score != null && p.total > 0); // v270: 無分數不列入
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

/* ── v253: 標題歸戶（與 TodayTasks v235 同法）——老師題庫側欄「依文章分組」用 ── */
const QM_TYPE_WORDS = /(單字卡|單字聽寫|聽寫|拼字|單字練習|手寫練習|選擇題|簡答題|短答題|填空題|填空|造句|練習|測驗|單字|文法|閱讀|quiz|flashcards?|test|short answer|spelling)/gi;
function qmGroupByArticle(items) {
  const keyOf = (t) => String(t || '').toLowerCase().replace(QM_TYPE_WORDS, '').replace(/[\s\-–—_·．.。,，()（）0-9０-９]+/g, '');
  // v254: 老師手動分組（item.group）優先；沒設才用標題自動歸戶
  const kOf = (it) => {
    const manual = String(it.group || '').trim();
    return manual ? 'm:' + manual.toLowerCase() : keyOf(it.title);
  };
  const map = new Map();
  (items || []).forEach(it => {
    const k = kOf(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  });
  const out = [];
  const seen = new Set();
  (items || []).forEach(it => {
    const k = kOf(it);
    if (seen.has(k)) return;
    seen.add(k);
    const arr = map.get(k);
    if (k.indexOf('m:') === 0) { // 手動組：永遠成組（就算只有 1 個），名字照老師打的
      out.push({ key: k, name: String(arr[0].group || '').trim(), items: arr });
      return;
    }
    if (k.length < 3 || arr.length < 2) { arr.forEach(x => out.push({ single: x })); return; }
    let name = arr[0].title || '';
    for (const x of arr) {
      const t = x.title || '';
      let i = 0;
      while (i < name.length && i < t.length && name[i] === t[i]) i++;
      name = name.slice(0, i);
    }
    name = name.replace(QM_TYPE_WORDS, '').replace(/[\s\-–—_·．.。,，()（）]+$/g, '').trim() || (arr[0].title || '').slice(0, 14);
    out.push({ key: k, name, items: arr });
  });
  return out;
}

/* ══════════════════════════════════════════════════════
   CATEGORY VIEW — left sidebar + right quiz
   editMode=true → show all items (not just quiz-able), add/edit buttons
══════════════════════════════════════════════════════ */
function QuizModeCategoryView({ cat, items, weekId, onBack, editMode, onAddItem, onEditItem, onDeleteItem, onMoveItem, weekChoices, onCopyToWeeks, homework, onSetHomework, weekQuizItems, initialItemId, cloudProg, getNextTask, onOpenTask }) {
  const [selectedItem, setSelectedItem] = useQM(null);
  const [phase,        setPhase]        = useQM('intro'); // 'intro' | 'flashcards' | 'quiz'
  const [flashItem,    setFlashItem]    = useQM(null);   // flashcard item to review
  const [playerKey,    setPlayerKey]    = useQM(0);
  const [progVersion,  setProgVersion]  = useQM(0);      // bumped after quiz completes → refreshes sidebar scores
  const [copyItem,     setCopyItem]     = useQM(null);   // v294: 「沿用到其他週」的題目
  const [copySel,      setCopySel]      = useQM([]);     // v294: 勾選的目標週 id

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
    // v261: 題庫視角不自動選第一個單元——自動選會連帶展開它的分組，Alan 要「進來時全部收合」
    if (String(weekId || '').startsWith('sl')) return;
    const firstMain = sidebarItems.find(it =>
      explicitMainIds.has(it.id) ||
      homeworkMainIds.has(it.id) ||
      it.id === fallbackMainId
    );
    selectItem(firstMain || sidebarItems[0]);
  }, [cat.id, editMode, sidebarItems.length, fallbackMainId]);

  // Re-read localStorage every time a quiz finishes (progVersion bumps)
  // v265: 優先用 app.jsx 的「本機＋雲端合併」進度——分類頁只看本機的話，
  // 換裝置（或本機 key 更新）前做完、只存在雲端的紀錄會顯示成未完成
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const qmProg = useQMM(() => cloudProg || loadQMProg(), [progVersion, cloudProg]);
  const hasSelection = !!selectedItem;

  // v253: 老師視角（editMode 或 暑假題庫）——側欄依文章分組收合＋題庫學生濾鏡
  const isLibView = String(weekId || '').startsWith('sl');
  const groupsView = editMode || isLibView;
  const [openGroups, setOpenGroups] = useQM({});
  const [libMeta, setLibMeta] = useQM(null);
  const [stuFilter, setStuFilter] = useQM('all'); // 'all' | 'none' | email
  useQME(() => {
    if (!isLibView || !window.subscribeSummerMeta) return;
    return window.subscribeSummerMeta(setLibMeta, () => {});
  }, [isLibView]);
  const libSfx = isLibView ? String(weekId).split('-').pop() : null;
  const assignedOf = useQMM(() => {
    // itemId → Set(emails)（只看當前週）
    const m = new Map();
    if (!isLibView || !libMeta) return m;
    Object.entries(libMeta.students || {}).forEach(([email, plan]) => {
      (((plan || {}).weeks || {})[libSfx] || []).forEach(id => {
        if (!m.has(id)) m.set(id, new Set());
        m.get(id).add(email);
      });
    });
    return m;
  }, [isLibView, libMeta, libSfx, weekId]);
  const viewItems = useQMM(() => {
    if (!isLibView || stuFilter === 'all') return sidebarItems;
    if (stuFilter === 'none') return sidebarItems.filter(it => !assignedOf.has(it.id));
    return sidebarItems.filter(it => assignedOf.has(it.id) && assignedOf.get(it.id).has(stuFilter));
  }, [sidebarItems, isLibView, stuFilter, assignedOf]);
  const grouped = useQMM(() => (groupsView ? qmGroupByArticle(viewItems) : null), [groupsView, viewItems]);
  useQME(() => {
    // 選中單元時自動展開它所在的組
    if (!grouped || !selectedItem) return;
    const g = grouped.find(x => x.items && x.items.some(it => it.id === selectedItem.id));
    if (g && !openGroups[g.key]) setOpenGroups(o => ({ ...o, [g.key]: true }));
  }, [selectedItem && selectedItem.id, grouped]);
  const filterStudents = useQMM(() => {
    if (!isLibView || !libMeta) return [];
    return Object.entries(libMeta.students || {})
      .filter(([, plan]) => Object.values((plan || {}).weeks || {}).some(a => a && a.length))
      .map(([email, plan]) => {
        const m = String((plan || {}).name || '').match(/[A-Za-z]+/);
        return { email, name: m ? m[0] : email.split('@')[0] };
      });
  }, [isLibView, libMeta]);
  const quizSwapKey = selectedItem ? `${selectedItem.id}-${phase}-${playerKey}` : 'empty';

  // v265: intro 的續做資訊（各題型用自己的題數驗證），與「重新開始」＝清紀錄直接進場
  const resumeFor = (countFn) => selectedItem
    ? ((getResume(`${weekId}_${selectedItem.id}`, countFn(selectedItem)) || {}).deckPos || null)
    : null;
  const restartFresh = () => {
    if (selectedItem) clearResume(`${weekId}_${selectedItem.id}`);
    setPlayerKey(k => k + 1);
    setPhase('quiz');
  };

  // v266: 完成頁導航——「回今天的任務」（作業項目）＋「下一個任務 →」（還有未完成作業時）
  const nextTaskTarget = (!editMode && getNextTask && selectedItem) ? getNextTask(selectedItem.id) : null;
  const onNextTask = (nextTaskTarget && onOpenTask)
    ? () => onOpenTask(nextTaskTarget.cat, nextTaskTarget.itemId)
    : null;
  const onBackToTasksShared = !editMode && homework && selectedItem && homework[selectedItem.id] ? onBack : null;

  // v272: 選中單元後，側欄自動捲到那張卡（從任務點進來時卡可能在列表下方）
  useQME(() => {
    if (!selectedItem) return;
    const el = document.querySelector('.qm-unit-row.active');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [selectedItem && selectedItem.id]);

  // v266: 同分類跳下一題——initialItemId 變了就切換單元（跨分類靠 remount 的 mount effect）
  useQME(() => {
    if (!initialItemId) return;
    const wanted = sidebarItems.find(it => it.id === initialItemId);
    if (wanted && (!selectedItem || selectedItem.id !== wanted.id)) selectItem(wanted);
  }, [initialItemId]);

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
          {isLibView && filterStudents.length > 0 && (
            <div className="qm-stufilter" aria-label="依學生篩選">
              <button className={stuFilter === 'all' ? 'on' : ''} onClick={() => setStuFilter('all')}>全部</button>
              <button className={stuFilter === 'none' ? 'on' : ''} onClick={() => setStuFilter('none')}>未發派</button>
              {filterStudents.map(f => (
                <button key={f.email} className={stuFilter === f.email ? 'on' : ''} onClick={() => setStuFilter(stuFilter === f.email ? 'all' : f.email)}>{f.name}</button>
              ))}
            </div>
          )}
          {editMode && (
            <button className="qm-unit-add-btn" onClick={() => onAddItem(cat.id)}>
              <window.Icon name="plus" size={14}/> 出新題目 · Add item
            </button>
          )}
          {viewItems.length === 0 && (
            <div className="qm-unit-empty">
              {editMode
                ? 'No items yet. Click "+ Add item" above!'
                : 'No quiz items yet.\nAsk your teacher to add some!'}
            </div>
          )}
          {(() => {
            const renderUnitRow = (item, groupName) => {
            const progKey  = `${weekId}_${item.id}`;
            const prog     = qmProg[progKey];
            const totalQ   = getItemQuestions(item).length;
            const scorePct = (prog && prog.score != null) ? Math.round(prog.score / prog.total * 100) : null; // 單字卡完成無分數 → 不顯示 %
            const isDone   = !!prog;
            const isActive = selectedItem?.id === item.id;
            const isWriting      = item.type === 'writing-practice';
            const isTypeAnswer   = item.type === 'type-answer';
            const isSpelling     = item.type === 'spelling'; // v254
            const isShortAnswer  = item.type === 'short-answer';
            const isGuided       = item.type === 'guided-reading'; // v276
            const isSyllableDiv  = item.type === 'syllable-div';
            const isWordSort     = item.type === 'word-sort';
            const isEssay        = item.type === 'essay';
            const isStoryMtn     = item.type === 'story-mountain';
            const isCloze        = item.type === 'cloze';
            const isCircle       = item.type === 'circle-answer';
            const isFlashcard    = item.type === 'flashcard';
            const isUpload       = item.type === 'upload'; // v263
            const hasQuiz  = totalQ > 0 || isWriting || isTypeAnswer || isSpelling || isShortAnswer || (isGuided && grTotalQ(item) > 0) || isSyllableDiv || isWordSort || isEssay || isStoryMtn || isCloze || isCircle || isUpload || (isFlashcard && (item.cards || []).length > 0);
            const hw       = (homework || {})[item.id]; // { dueDate }
            const isMainMission = !editMode && (
              explicitMainIds.has(item.id) ||
              homeworkMainIds.has(item.id) ||
              item.id === fallbackMainId
            );
            const dueLabel = hw?.dueDate ? (() => {
              const d = new Date(hw.dueDate + 'T00:00:00');
              const diff = Math.ceil((d - new Date()) / 86400000);
              return diff > 0 ? `📌 ${diff}天` : diff === 0 ? '📌 今天到期' : diff >= -7 ? '📌 已過期' : '已結束'; // v266
            })() : null;

            return (
              <div
                key={item.id}
                className={`qm-unit-row${isActive ? ' active' : ''}${isDone ? ' done' : ''}${!hasQuiz && !editMode ? ' disabled' : ''}`}
                onClick={() => (hasQuiz || editMode) && selectItem(item)}
              >
                <div className="qm-unit-row-info">
                  <div className="qm-unit-row-title">
                    {/* v272: 同組之下用短名（聽寫/填空 2…）——跟任務清單一致，四張同名卡不再分不出誰是誰 */}
                    {!editMode && groupName ? qmShortLabel(item, groupName) : item.title}
                    {dueLabel && !editMode && <span className={`qm-hw-badge${isDone ? ' done' : ''}${dueLabel === '已結束' ? ' ended' : ''}`}>{isDone ? '✓ 作業完成' : dueLabel}</span>}
                  </div>
                  <div className="qm-unit-row-meta">
                    {editMode ? (
                      <>
                        <span className="qm-type-badge">{item.type}{(() => { const n = totalQ || getQuizItemTotal(item); return n > 0 ? ` · ${n}q` : ''; })()}</span>
                        {/* v259: 空項目學生頁會被濾掉——老師端要看得到警告，不然像消失了 */}
                        {getQuizItems([item]).length === 0 && (
                          <span className="qm-empty-badge" title="這個單元還沒有題目，學生頁不會顯示。點鉛筆進去新增題目。">⚠ 沒有題目 · 學生看不到</span>
                        )}
                      </>
                    ) : (
                      <>
                        {isFlashcard ? `🃏 ${(item.cards||[]).length} 張單字卡` : isUpload ? '📎 拍照上傳作業' : isGuided ? `📖 ${grSegs(item).length} 段 · ${grTotalQ(item)} 題` : isStoryMtn ? '🏔 故事山寫作' : isEssay ? '✍ 意見寫作' : isWriting ? `✍ ${getWritingPracticePrompts(item, items || []).length} 個題目` : isTypeAnswer ? `⌨ ${(item.pairs||[]).length} 個單字` : isSpelling ? `🔊 ${(item.spellWords||[]).length} 個聽寫` : isShortAnswer ? `📖 ${(item.saQuestions||[]).length} 題` : isSyllableDiv ? `✂️ ${(item.sdWords||[]).length} 個單字` : isWordSort ? `🗂 ${(item.sortWords||[]).length} 個單字` : isCloze ? `📝 ${((item.passage||'').match(/\[[^\]]+\]/g)||[]).length} 格` : isCircle ? `⭕ ${(item.circleQuestions||[]).length} 題` : `${totalQ} 題`}
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
                      {onCopyToWeeks && (weekChoices || []).length > 0 && (
                        <button
                          className="qm-unit-copy-btn"
                          onClick={(e) => { e.stopPropagation(); setCopySel([]); setCopyItem(item); }}
                          title="沿用到其他週"
                        ><window.Icon name="copy" size={12}/></button>
                      )}
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
          };
            if (!grouped) return viewItems.map(it => renderUnitRow(it));
            return grouped.map((g, gi) => g.items ? (
              <div className={`qm-ugroup${openGroups[g.key] ? ' open' : ''}`} key={g.key || gi}>
                <button
                  className="qm-ugroup-head"
                  onClick={() => setOpenGroups(o => ({ ...o, [g.key]: !o[g.key] }))}
                  aria-expanded={!!openGroups[g.key]}
                >
                  <span className="qm-ugroup-chev">{openGroups[g.key] ? '▾' : '▸'}</span>
                  <span className="qm-ugroup-name">{g.name}</span>
                  <span className="qm-ugroup-count">{g.items.length}</span>
                </button>
                {openGroups[g.key] ? (editMode ? g.items : [...g.items].sort((a, b) => qmTypeRank(a.type) - qmTypeRank(b.type))).map(it => renderUnitRow(it, g.name)) : null}
              </div>
            ) : renderUnitRow(g.single));
          })()}
        </div>
      </div>

      {/* ── Right: intro / flashcards / quiz / placeholder ── */}
      <div className="qm-quiz-area">
        {/* v272: 題型章——學生點「聽寫」進來，第一眼就看到「🔊 聽寫」確認沒點錯 */}
        {selectedItem && !editMode && phase === 'intro' && QM_TYPE_ZH[selectedItem.type] && (
          <div className="qm-type-chip">{QM_TYPE_ICO[selectedItem.type] || ''} {QM_TYPE_ZH[selectedItem.type]}</div>
        )}
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
        ) : selectedItem?.type === 'spelling' && phase === 'quiz' ? (
          <SpellingPlayer
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'spelling' && phase === 'intro' ? (
          <SpellingIntro
            item={selectedItem}
            onStart={() => setPhase('quiz')}
            resumeAt={resumeFor(it => (it.spellWords || []).filter(w => w && w.word).length)}
            onRestart={restartFresh}
          />
        ) : selectedItem?.type === 'upload' ? (
          /* v263: 上傳作業——單一畫面（說明＋拍照上傳＋已交/批改狀態），不分 intro/quiz */
          <UploadHomeworkPlayer
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={onBack}
          />
        ) : selectedItem?.type === 'type-answer' && phase === 'quiz' ? (
          <TypeAnswerPlayer
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'type-answer' && phase === 'intro' ? (
          <TypeAnswerIntro
            item={selectedItem}
            onStart={() => setPhase('quiz')}
            resumeAt={resumeFor(it => (it.pairs || []).length)}
            onRestart={restartFresh}
          />
        ) : selectedItem?.type === 'writing-practice' && phase === 'quiz' ? (
          <WritingPracticePlayer
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
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
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
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
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'syllable-div' && phase === 'intro' ? (
          <SyllableDivIntro
            item={selectedItem}
            onStart={() => setPhase('quiz')}
            resumeAt={resumeFor(it => (it.sdWords || []).length)}
            onRestart={restartFresh}
          />
        ) : selectedItem?.type === 'word-sort' && phase === 'quiz' ? (
          <WordSortPlayer
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
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
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
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
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'cloze' && phase === 'quiz' ? (
          <ClozePlayer
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'cloze' && phase === 'intro' ? (
          <ClozeIntro item={selectedItem} onStart={() => setPhase('quiz')} />
        ) : selectedItem?.type === 'circle-answer' && phase === 'quiz' ? (
          <CircleAnswerPlayer
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'circle-answer' && phase === 'intro' ? (
          <CircleAnswerIntro item={selectedItem} onStart={() => setPhase('quiz')} />
        ) : selectedItem?.type === 'guided-reading' && phase === 'quiz' ? (
          <GuidedReadingPlayer
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
            key={playerKey}
            item={selectedItem}
            progressKey={`${weekId}_${selectedItem.id}`}
            onBack={() => setPhase('intro')}
          />
        ) : selectedItem?.type === 'guided-reading' && phase === 'intro' ? (
          <GuidedReadingIntro
            item={selectedItem}
            onStart={() => setPhase('quiz')}
            resumeAt={resumeFor(it => grTotalQ(it))}
            onRestart={restartFresh}
            catItems={items || []}
            onFlashcards={(fi) => { setFlashItem(fi); setPhase('flashcards'); }}
          />
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
            onRestart={restartFresh}
          />
        ) : phase === 'flashcards' && flashItem ? (
          <div className="qm-fc-player-wrap">
            <div className="qm-fc-player-bar">
              <span className="qm-fc-player-title">{flashItem.title}</span>
              <button className="qm-fc-start-btn" onClick={() => setPhase('quiz')}>
                {selectedItem?.type === 'guided-reading' ? '開始閱讀 →' : '開始測驗 →'}
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
            onBackToTasks={onBackToTasksShared}
            onNextTask={onNextTask}
          />
        )}
        </div>
      </div>

      {/* v294: 沿用題目到其他週——勾選目標週，複製一份過去（各週獨立） */}
      {copyItem && ReactDOM.createPortal(
        <div className="qm-copy-overlay" onClick={() => setCopyItem(null)}>
          <div className="qm-copy-modal" onClick={e => e.stopPropagation()}>
            <div className="qm-copy-head">
              <div className="qm-copy-title">沿用到其他週</div>
              <button className="qm-copy-x" onClick={() => setCopyItem(null)} aria-label="關閉"><window.Icon name="close" size={16}/></button>
            </div>
            <div className="qm-copy-sub">把「{copyItem.title}」複製到你勾選的週。<b>各週獨立</b>——哪一週想微調就改哪週，成績也分開算。</div>
            <div className="qm-copy-list">
              {(weekChoices || []).map(wc => {
                const on = copySel.includes(wc.id);
                return (
                  <button key={wc.id} type="button" className={'qm-copy-wk' + (on ? ' on' : '')}
                    onClick={() => setCopySel(s => on ? s.filter(x => x !== wc.id) : [...s, wc.id])}>
                    <span className="qm-copy-wk-check">{on ? '✓' : ''}</span>
                    <span className="qm-copy-wk-info">
                      <span className="qm-copy-wk-label">{wc.label}</span>
                      {wc.sub ? <span className="qm-copy-wk-sub">{wc.sub}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="qm-copy-actions">
              <button className="qm-copy-cancel" onClick={() => setCopyItem(null)}>取消</button>
              <button className="qm-copy-go" disabled={!copySel.length}
                onClick={() => { onCopyToWeeks(copyItem, copySel); setCopyItem(null); }}>
                沿用到 {copySel.length || ''} 週
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
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
function QuizIntroScreen({ item, cat, questions, catItems, onFlashcards, onStartQuiz, resumeAt, onRestart }) {
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
            {/* v274: 小朋友看不到低調的複習入口——改成醒目的金色卡片 */}
            {fcItems.map(fc => (
              <button key={fc.id} className="qm-fcb" onClick={() => onFlashcards(fc)}>
                <span className="qm-fcb-ico" aria-hidden="true">🃏</span>
                <span className="qm-fcb-text">
                  <b>先複習單字卡</b>
                  <span>{fc.title} · {(fc.cards || []).length} 張</span>
                </span>
                <span className="qm-fcb-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        )}
        <button className="qm-btn primary qm-intro-start" onClick={onStartQuiz}>
          {resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始測驗 →'}
        </button>
        {/* v265: 有續做紀錄時，也可以選擇重新開始 */}
        {resumeAt && onRestart ? (
          <button className="qm-btn secondary qm-intro-restart" onClick={onRestart}>↻ 重新開始</button>
        ) : null}
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
/* ── v254: Spelling 聽寫——聽發音、打拼字 ── */
function SpellingIntro({ item, onStart, resumeAt, onRestart }) {
  const count = (item.spellWords || []).filter(w => w && w.word).length;
  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">🔊</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{count} 個單字</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>🔊</span><span>先聽發音（可以按喇叭重聽，不限次數）</span></div>
        <div className="qm-intro-rule-row"><span>⌨</span><span>把聽到的單字拼出來</span></div>
        <div className="qm-intro-rule-row"><span>✅</span><span>不分大小寫，拼對就算對</span></div>
      </div>
      <div className="qm-intro-btns">
        <button className="qm-btn primary" onClick={onStart}>
          {resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始聽寫 · Start →'}
        </button>
        {resumeAt && onRestart ? (
          <button className="qm-btn secondary qm-intro-restart" onClick={onRestart}>↻ 重新開始</button>
        ) : null}
        {resumeAt ? <div className="qm-intro-resume">上次做到一半，進度已幫你保留 ✓</div> : null}
      </div>
    </div>
  );
}

function SpellingPlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
  const base = useQMM(() => (item.spellWords || []).filter(w => w && w.word), [item.id]);
  // v265: 續做——上次的題目順序、做到第幾題、得分、錯題都接回來
  const rz = useQMM(() => {
    const r = getResume(progressKey, base.length);
    return (r && Array.isArray(r.deck) && r.deck.length === base.length && r.deck.every(i => Number.isInteger(i) && base[i]))
      ? r : null;
  }, [item.id]);
  const words = useQMM(() => (rz ? rz.deck.map(i => base[i]) : shuffleArr(base.slice())), [item.id]);
  const [idx,    setIdx]    = useQM(rz ? rz.deckPos : 0);
  const [input,  setInput]  = useQM('');
  const [result, setResult] = useQM(null); // null | 'correct' | 'wrong'
  const [score,  setScore]  = useQM(rz ? (rz.score || 0) : 0);
  const [screen, setScreen] = useQM('play');
  const [redo,   setRedo]   = useQM(false); // v274: 答錯 → 看音節照著拼一次才過關
  const [redoTry, setRedoTry] = useQM(0);   // 訂正又拼錯的搖晃動畫 key
  const wrongsRef = React.useRef(rz && Array.isArray(rz.wrongs) ? rz.wrongs.slice() : []);
  const inputRef  = React.useRef(null);

  const total   = words.length;
  const current = words[idx];
  const pct     = Math.round(idx / total * 100);
  const showZh  = item.spellShowZh !== false;

  const speak = () => {
    if (current && window.speakText) window.speakText(current.word, { lang: 'en-US', rate: 0.82 });
  };
  React.useEffect(() => { speak(); }, [idx]); // 每題自動唸一次（進場點擊已是手勢，iOS OK）
  React.useEffect(() => {
    if (result === null && inputRef.current) inputRef.current.focus();
  }, [idx, result]);

  const check = () => {
    if (!input.trim()) return;
    const target = (current.word || '').trim().toLowerCase();
    // v274: 訂正模式——看著音節照拼一次（不影響分數，拼對才前進）
    if (redo) {
      if (input.trim().toLowerCase() === target) {
        if (window.playSound) window.playSound('correct');
        setRedo(false);
        next();
      } else {
        if (window.playSound) window.playSound('wrong');
        setRedoTry(k => k + 1);
        setInput('');
      }
      return;
    }
    const correct = input.trim().toLowerCase() === target;
    setResult(correct ? 'correct' : 'wrong');
    if (correct) {
      const nextScore = score + 1;
      setScore(nextScore);
      if (window.playSound) window.playSound('correct');
      setTimeout(() => next(nextScore), 650);
    } else {
      wrongsRef.current.push({ q: '🔊 聽寫' + (current.zh ? '：' + current.zh : ''), answer: current.word });
      if (window.playSound) window.playSound('wrong');
      setRedo(true);
      setInput('');
    }
  };

  const next = (scoreOverride = null) => {
    const finalScoreBase = typeof scoreOverride === 'number' ? scoreOverride : score;
    if (idx + 1 >= total) {
      clearResume(progressKey); // v265: 做完 → 清掉續做紀錄
      saveQuizModeCompletion(progressKey, item, { doneCount: total, score: finalScoreBase, total, wrongQuestions: wrongsRef.current });
      if (window.playSound) window.playSound('complete');
      setScreen('done');
    } else {
      // v265: 每前進一題就存續做進度——中途離開，下次從同一題接著做
      saveResume(progressKey, {
        deck: words.map(w => base.indexOf(w)),
        deckPos: idx + 1,
        uniqueTotal: total,
        score: finalScoreBase,
        wrongs: wrongsRef.current,
      });
      setIdx(i => i + 1);
      setInput('');
      setResult(null);
      setRedo(false); // v274
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      if (result === null || redo) check();
      else if (result === 'wrong') next();
    }
  };

  if (screen === 'done') {
    const finalPct = Math.round(score / total * 100);
    const emoji = finalPct === 100 ? '🏆' : finalPct >= 80 ? '🎉' : finalPct >= 60 ? '👍' : '💪';
    return (
      <div className="qm-result">
        <div className="qm-result-emoji">{emoji}</div>
        <div className="qm-result-cat-title">{item.title}</div>
        <div className="qm-result-score">
          <span className="qm-result-num">{score}</span>
          <span className="qm-result-denom"> / {total}</span>
        </div>
        <div className="qm-result-pct">答對率 {finalPct}%</div>
        <div className="qm-result-btns">
          <button className="qm-btn secondary" onClick={() => { wrongsRef.current = []; setIdx(0); setInput(''); setResult(null); setScore(0); setScreen('play'); }}>再試一次</button>
          <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask}/>
        </div>
      </div>
    );
  }

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
        <div className="qm-question-hint">SPELLING · 聽發音，拼出單字</div>
        <button type="button" className="sp-speak" onClick={speak} aria-label="再聽一次發音">
          <span className="sp-speak-ic">🔊</span>
          <span className="sp-speak-lbl">再聽一次</span>
        </button>
        {showZh && current?.zh && <div className="sp-zh">{current.zh}</div>}
      </div>

      <div className="ta-input-wrap">
        <span key={redoTry} className={redoTry ? 'sp-shake-wrap' : undefined} style={{ display: 'block' }}>
          <input
            ref={inputRef}
            className={`ta-input${result === 'correct' ? ' correct' : result === 'wrong' && !redo ? ' wrong' : ''}`}
            value={input}
            onChange={e => { if (result === null || redo) setInput(e.target.value); }}
            onKeyDown={handleKey}
            placeholder={redo ? '看著上面的音節，照著拼一次…' : '把聽到的單字拼出來…'}
            disabled={result !== null && !redo}
            autoComplete="off" autoCapitalize="none" spellCheck={false}
          />
        </span>
      </div>

      <div className="qm-feedback" style={{marginTop: result ? 8 : 0}}>
        {result === null ? (
          <button className="qm-btn primary" onClick={check} disabled={!input.trim()}>
            確認 · Check →
          </button>
        ) : result === 'wrong' ? (
          <>
            {/* v274: 音節拆解——一節一節彈出來，看著拼一次才過關 */}
            <div className="sp-redo" key={current.word}>
              <div className="sp-redo-title">✗ 正確拼法是</div>
              <div className="sp-syllables" aria-label={`正確拼法 ${current.word}`}>
                {qmSyllables(current.word).map((syl, si) => (
                  <React.Fragment key={si}>
                    {si > 0 && <span className="sp-syl-dot" style={{ animationDelay: (si * 0.22 - 0.08) + 's' }}>·</span>}
                    <span className="sp-syl" style={{ animationDelay: (si * 0.22) + 's' }}>{syl}</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="sp-redo-hint">跟著唸一唸，照著拼一次就過關！</div>
            </div>
            <button className="qm-result-alt sp-skip" onClick={() => next()}>先跳過這題 →</button>
          </>
        ) : (
          <div className="qm-feedback-banner correct">✓ Correct! 答對了！</div>
        )}
      </div>
    </div>
  );
}

function TypeAnswerIntro({ item, onStart, resumeAt, onRestart }) {
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
          {resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始練習 · Start →'}
        </button>
        {resumeAt && onRestart ? (
          <button className="qm-btn secondary qm-intro-restart" onClick={onRestart}>↻ 重新開始</button>
        ) : null}
        {resumeAt ? <div className="qm-intro-resume">上次做到一半，進度已幫你保留 ✓</div> : null}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TYPE-ANSWER PLAYER
══════════════════════════════════════════════════════ */
function TypeAnswerPlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
  const base = useQMM(() => (item.pairs || []), [item.id]);
  // v265: 續做——順序、進度、得分、錯題
  const rz = useQMM(() => {
    const r = getResume(progressKey, base.length);
    return (r && Array.isArray(r.deck) && r.deck.length === base.length && r.deck.every(i => Number.isInteger(i) && base[i]))
      ? r : null;
  }, [item.id]);
  const pairs = useQMM(() => (rz ? rz.deck.map(i => base[i]) : shuffleArr(base.slice())), [item.id]);
  const [idx,      setIdx]      = useQM(rz ? rz.deckPos : 0);
  const [input,    setInput]    = useQM('');
  const [result,   setResult]   = useQM(null); // null | 'correct' | 'wrong'
  const [score,    setScore]    = useQM(rz ? (rz.score || 0) : 0);
  const [screen,   setScreen]   = useQM('play'); // 'play' | 'done'
  const inputRef = React.useRef(null);
  const wrongsRef = React.useRef(rz && Array.isArray(rz.wrongs) ? rz.wrongs.slice() : []); // v258: 錯題記錄（老師端＋錯題本）

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
      wrongsRef.current.push({ q: current.prompt || '(打字題)', answer: current.answer || '' });
      if (window.playSound) window.playSound('wrong');
    }
  };

  const next = (scoreOverride = null) => {
    const finalScoreBase = typeof scoreOverride === 'number' ? scoreOverride : score;
    if (idx + 1 >= total) {
      clearResume(progressKey); // v265
      saveQuizModeCompletion(progressKey, item, { doneCount: total, score: finalScoreBase, total, wrongQuestions: wrongsRef.current });
      if (window.playSound) window.playSound('complete');
      setScreen('done');
    } else {
      // v265: 每前進一題存續做進度
      saveResume(progressKey, {
        deck: pairs.map(p => base.indexOf(p)),
        deckPos: idx + 1,
        uniqueTotal: total,
        score: finalScoreBase,
        wrongs: wrongsRef.current,
      });
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
          <button className="qm-btn secondary" onClick={() => { wrongsRef.current = []; setIdx(0); setInput(''); setResult(null); setScore(0); setScreen('play'); }}>再試一次</button>
          <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask}/>
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
function QuizResultScreen({ finalScore, total, finalPct, title, wrongList, onRestart, onBack, onBackToTasks, onNextTask }) {
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
        <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask} backLabel="回單元列表 →"/>
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

function QuizModePlayer({ cat, item, questions, progressKey, weekId, allQuizItems, onBack, onQuizDone, onBackToTasks, onNextTask }) {
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

  // v234: 鍵盤作答——1~4（或 A~D）選答案，Enter 下一題
  useQME(() => {
    const onKey = (e) => {
      if (screen !== 'quiz') return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const cur = deck[deckPos];
      if (!cur || !cur.options) return;
      const letterMap = { a: 0, b: 1, c: 2, d: 3 };
      const idx = /^[1-9]$/.test(e.key) ? parseInt(e.key, 10) - 1
                : letterMap[e.key.toLowerCase()] !== undefined ? letterMap[e.key.toLowerCase()]
                : -1;
      if (idx >= 0 && idx < cur.options.length && selected === null) { handleSelect(idx); return; }
      if (e.key === 'Enter' && selected !== null && selected !== cur.correct) handleNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

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
        onNextTask={onNextTask}
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
function WritingPracticePlayer({ item, catItems, progressKey, onBack, onBackToTasks, onNextTask }) {
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
      <div className="qm-result-btns" style={{marginTop:20}}><QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask} backLabel="← 返回"/></div>
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
function ShortAnswerPlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
  const questions   = item.saQuestions || [];
  const passage     = item.passage || '';

  const [idx, setIdx]         = useQM(0);
  const [answer, setAnswer]   = useQM('');
  const [feedback, setFeedback] = useQM('');
  const [checking, setChecking] = useQM(false);
  const [scores, setScores]   = useQM([]);
  const [done, setDone]       = useQM(false);
  const wrongsRef = React.useRef([]); // v258: AI 評 2 星以下＝需要加強的題目

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
    const stars = extractStars(result);
    setScores(prev => [...prev, stars]);
    if (stars <= 2) {
      wrongsRef.current.push({ q: current.question, answer: current.keyPoints || '（參考 AI 回饋）' });
    }
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
      saveQuizModeCompletion(progressKey, item, { doneCount: 1, score: avgStars, total: 5, wrongQuestions: wrongsRef.current });
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
      <div className="qm-result-btns" style={{marginTop:20}}><QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask} backLabel="← 返回"/></div>
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
   GUIDED READING 分段閱讀 — INTRO + PLAYER (v276)
   長文切小段：每讀完一小段馬上答題（注意力有錨點）；
   短文＝一段、問題在最後。讀過的段落留在上面可回頭看。
══════════════════════════════════════════════════════ */
function grExtractStars(text) {
  const filled = (String(text || '').match(/⭐/g) || []).length;
  if (filled > 0) return Math.min(5, filled);
  const m = String(text || '').match(/[★☆]{1,5}/);
  if (!m) return 3;
  return (m[0].match(/★/g) || []).length;
}
// 選項照老師順序（不洗牌——閱讀理解常有「以上皆是」型選項）；空白選項剔除後修正正解索引
function grNormalizeQ(q) {
  if (q.kind === 'short') return q;
  const opts = (q.options || []).map(o => String(o || '').trim());
  const ansTxt = opts[q.answer != null ? q.answer : 0];
  const kept = opts.filter(Boolean);
  return { ...q, options: kept, correct: Math.max(0, kept.indexOf(ansTxt)) };
}

/* v277: 段落照片切片——只存裁切範圍 {url, ar, y0, y1}（0~1 高度比例），
   不產生新圖片：CSS 高度=寬×ar×(y1-y0)、img translateY(-y0%) 顯示該帶。 */
function GrImgCrop({ img, onZoom, className, onWord, onSide }) {
  const y0 = img.y0 || 0;
  const y1 = img.y1 == null ? 1 : img.y1;
  const band = Math.max(0.02, y1 - y0);
  const ar = img.ar || 1.3;
  // v282: 載入前 shimmer、載完淡入。⚠ 不能用 loading="lazy"——瀏覽器會刻意延後載入，
  // 就是 Alan 抱怨「圖片要跑一小段時間」的元凶之一
  const [loaded, setLoaded] = useQM(false);
  // v287: 點字查義——OCR 字框疊在照片上（只疊這個裁切帶內的字）
  const [wdata, setWdata] = useQM(null);
  const imgRef = React.useRef(null);
  useQME(() => { if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth) setLoaded(true); }, []);
  const wkey = img.wordsId || img.wordsUrl;
  useQME(() => {
    let dead = false;
    if (wkey && onWord) grFetchWords(wkey).then(d => { if (!dead && d) setWdata(d); });
    return () => { dead = true; };
  }, [wkey, !!onWord]);
  const bandWords = (onWord && wdata && wdata.words ? wdata.words : [])
    .filter(w => { const cy = w.y + (w.h || 0) / 2; return cy >= y0 && cy <= y1; });
  return (
    <div className={'grd-img' + (loaded ? ' loaded' : '') + (className ? ' ' + className : '')}
      style={{ paddingBottom: (ar * band * 100) + '%' }}
      onClick={onZoom} title={onZoom ? '點一下放大' : undefined}>
      <img ref={imgRef} src={img.url} style={{ transform: `translateY(-${y0 * 100}%)` }}
        alt="文章段落" decoding="async" onLoad={() => setLoaded(true)}/>
      {bandWords.map((w, i) => (
        <button key={i} className="grd-word" aria-label={`查 ${w.t}`}
          style={{ left: (w.x * 100) + '%', top: (((w.y - y0) / band) * 100) + '%', width: (w.w * 100) + '%', height: ((w.h / band) * 100) + '%' }}
          onClick={(e) => { e.stopPropagation(); onWord(w.t, e); }}/>
      ))}
      {/* v290: 附註框的 🔊 ——點了單獨聽這一塊（caption/圖說） */}
      {(onSide ? (img.readRects || []) : [])
        .filter(r => r.kind === 'side')
        .filter(r => { const cy = r.y + r.h / 2; return cy >= y0 && cy <= y1; })
        .map((r, i) => (
          <button key={'sd' + i} className="grd-side-btn" title="聽這一塊"
            style={{ left: `calc(${Math.min(r.x + r.w, 0.99) * 100}% - 26px)`, top: (((r.y - y0) / band) * 100) + '%' }}
            onClick={(e) => { e.stopPropagation(); onSide(r); }}>🔊</button>
        ))}
    </div>
  );
}

// v282: 把整篇文章的圖片預先抓下來（intro 停留時就開始）——翻頁時圖幾乎都已在快取
function grPreloadImgs(item) {
  const urls = [...new Set(grSegs(item).map(s => s.img && s.img.url).filter(Boolean))];
  urls.forEach(u => { const im = new Image(); im.src = u; });
  // v287: 順便預抓 OCR 單字檔（點字查義＋照片朗讀）
  grSegs(item).forEach(s => { if (s.img && (s.img.wordsId || s.img.wordsUrl)) grFetchWords(s.img.wordsId || s.img.wordsUrl); });
}

// v290: 行是否落在框內（主文/附註框選；舊資料沒 x 就只看 y）
function grLineInRect(l, r) {
  if (l.y < r.y || l.y > r.y + r.h) return false;
  if (l.x == null) return true;
  return (l.x + (l.w || 0)) > r.x && l.x < r.x + r.w;
}

// v287: OCR 單字檔快取（{words:[{t,x,y,w,h}], lines:[{t,y}]}，座標＝整張圖比例）
const grWordsCache = {};
function grFetchWords(key) { // v288: grwords_* → Firestore（不經 CORS）；舊 http URL 盡力 fetch
  if (!key) return Promise.resolve(null);
  if (!grWordsCache[key]) {
    grWordsCache[key] = (window.fetchReadingWords ? window.fetchReadingWords(key) : Promise.resolve(null)).catch(() => null);
  }
  return grWordsCache[key];
}

function GuidedReadingIntro({ item, onStart, resumeAt, onRestart, catItems, onFlashcards }) {
  const segs = grSegs(item);
  const finalN = grFinalQs(item).length;
  const total = grTotalQ(item);
  const hasShort = segs.some(s => grValidQs(s).some(q => q.kind === 'short')) || grFinalQs(item).some(q => q.kind === 'short');
  useQME(() => { grPreloadImgs(item); }, [item && item.id]); // 停在說明頁時就先抓圖
  // v286: 綁定單字卡——先練文章單字再開始讀（Alan 要的流程）
  const linkedFc = item.linkedFlashcardId
    ? (catItems || []).find(it => it.id === item.linkedFlashcardId && it.type === 'flashcard' && (it.cards || []).length > 0)
    : null;
  return (
    <div className="qm-intro">
      <div className="qm-intro-icon">📖</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">{segs.length > 1 ? `${segs.length} 段文章 · ` : ''}{total} 題</div>
      <div className="qm-intro-rules">
        <div className="qm-intro-rule-row"><span>📖</span><span>{segs.length > 1 ? '一次讀一段——讀完按「完成閱讀」，再回答這段的問題' : '讀完文章按「完成閱讀」，再回答問題'}</span></div>
        <div className="qm-intro-rule-row"><span>👀</span><span>答題時忘了內容，按「回頭看文章」就能再看一次</span></div>
        {finalN > 0 && <div className="qm-intro-rule-row"><span>📚</span><span>全部讀完後，還有 {finalN} 題整篇文章的綜合題</span></div>}
        <div className="qm-intro-rule-row"><span>⭐</span><span>{hasShort ? '選擇題自動改分；簡答題 AI 批改' : '答對加一分，答錯會告訴你正確答案'}</span></div>
      </div>
      <div className="qm-intro-btns">
        {linkedFc && onFlashcards ? (
          <div className="qm-intro-fc-group">
            <button className="qm-fcb" onClick={() => onFlashcards(linkedFc)}>
              <span className="qm-fcb-ico" aria-hidden="true">🃏</span>
              <span className="qm-fcb-text">
                <b>先練習本文章單字</b>
                <span>{linkedFc.title} · {(linkedFc.cards || []).length} 張</span>
              </span>
              <span className="qm-fcb-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}
        <button className="qm-btn primary" onClick={onStart}>
          {resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始閱讀 · Start →'}
        </button>
        {resumeAt && onRestart ? (
          <button className="qm-btn secondary" onClick={onRestart}>↻ 重新開始</button>
        ) : null}
        {resumeAt ? <div className="qm-intro-resume">上次做到一半，進度已幫你保留 ✓</div> : null}
      </div>
    </div>
  );
}

function GuidedReadingPlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
  const segs     = useQMM(() => grSegs(item), [item]);
  const segQs    = useQMM(() => segs.map(s => grValidQs(s)), [segs]);
  const finalQs  = useQMM(() => grFinalQs(item), [item]);
  const segTotal = useQMM(() => segQs.reduce((n, qs) => n + qs.length, 0), [segQs]);
  const total    = segTotal + finalQs.length;

  /* v283: 翻頁式流程——「文章頁」讀完按「完成閱讀」→「問題頁」
     一題一題答（可展開「回頭看文章」）→ 下一段文章頁 → … → 綜合題過場 → 綜合題 → 完成 */
  const [segIdx, setSegIdx]     = useQM(0);
  const [mode, setMode]         = useQM('read');  // 'read' | 'quiz' | 'final-intro' | 'final'
  const [qIdx, setQIdx]         = useQM(0);
  const [res, setRes]           = useQM({});      // 全域題序 -> { pts }
  const [selected, setSelected] = useQM(null);
  const [answer, setAnswer]     = useQM('');
  const [feedback, setFeedback] = useQM('');
  const [checking, setChecking] = useQM(false);
  const [peek, setPeek]         = useQM(false);   // 答題頁展開「回頭看文章」
  const [done, setDone]         = useQM(false);
  const [zoom, setZoom]         = useQM(null);
  const [dict, setDict]         = useQM(null);    // v287: 點字查義 {word, text|null}
  const [speaking, setSpeaking] = useQM(false);   // v287: 朗讀中
  const [ttsText, setTtsText]   = useQM('');      // v287: 這一段可朗讀的文字（文字段落或 OCR）
  const [readRate, setReadRate] = useQM(() => {   // v293: 朗讀速度（放慢＝更自然）——記住學生的選擇
    const v = parseFloat(localStorage.getItem('alan-read-rate') || '');
    return (v >= 0.5 && v <= 1) ? v : 0.8;
  });
  const wrongsRef = React.useRef([]);
  const autoRef   = React.useRef(null);
  const topRef    = React.useRef(null);
  const audioRef  = React.useRef(null);   // v289: 課文音檔——掛在翻頁容器外，換段不重置進度
  const segAudioRef = React.useRef(null); // v293: 每段 AI 音檔——同樣要套用朗讀速度
  const speakStopRef = React.useRef(null);// v293: 逐句朗讀的中止函式

  // v289: 進答題/綜合題就暫停音檔（讀下一段時從剛才的位置繼續）
  useQME(() => {
    if (mode !== 'read' && audioRef.current && !audioRef.current.paused) audioRef.current.pause();
  }, [mode]);

  // v293: 朗讀速度——套到課文音檔＋每段 AI 音檔（保留原音色，只放慢節奏，唸起來更自然）。
  const applyRate = (el) => {
    if (!el) return;
    try { el.playbackRate = readRate; } catch (e) {}
    try { el.preservesPitch = true; el.mozPreservesPitch = true; el.webkitPreservesPitch = true; } catch (e) {}
  };
  useQME(() => {
    applyRate(audioRef.current);
    applyRate(segAudioRef.current);
    try { localStorage.setItem('alan-read-rate', String(readRate)); } catch (e) {}
  }, [readRate, mode, segIdx, item.grAudioUrl]);

  // v287: 點單字 → 唸給他聽＋AI 查中文意思（localStorage 快取，同字秒回）
  // v289: 小卡貼著被點的單字（上方空間不夠就開在下面），不再固定頁尾
  const openWord = (w, ctx, evt) => {
    const word = String(w || '').replace(/^[^A-Za-z'’-]+|[^A-Za-z'’-]+$/g, '');
    if (!word) return;
    if (window.speakText) window.speakText(word);
    let pos = null;
    try {
      const el = evt && (evt.currentTarget || evt.target);
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (r) {
        const vw = window.innerWidth, vh = window.innerHeight;
        const half = Math.min(170, vw / 2 - 12);
        const above = r.bottom > vh - 250;
        pos = {
          x: Math.min(Math.max(r.left + r.width / 2, half + 12), vw - half - 12),
          y: above ? Math.max(12, r.top - 10) : Math.min(vh - 12, r.bottom + 10),
          above,
        };
      }
    } catch (e) {}
    setDict({ word, text: null, pos });
    if (window.lookupWord) {
      window.lookupWord(word, ctx || '').then(t => {
        setDict(d => (d && d.word === word) ? { ...d, text: t } : d);
      });
    }
  };

  // v289: 點小卡以外的地方就關掉（點別的單字＝換字，不算關）
  useQME(() => {
    if (!dict) return;
    const close = (e) => {
      if (e.target && e.target.closest && e.target.closest('.gr-word-pop, .grd-tword, .grd-word')) return;
      setDict(null);
    };
    const t = setTimeout(() => window.addEventListener('click', close), 0);
    return () => { clearTimeout(t); window.removeEventListener('click', close); };
  }, [dict && dict.word]);

  // v287: 朗讀——文字段落直接唸；照片段落唸 OCR 行（只唸這個裁切帶內的）
  const stopSpeak = () => {
    if (speakStopRef.current) { try { speakStopRef.current(); } catch (e) {} speakStopRef.current = null; }
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    setSpeaking(false);
  };
  useQME(() => {
    let dead = false;
    stopSpeak();
    setTtsText('');
    if (mode !== 'read' || !segs[segIdx]) return;
    const seg = segs[segIdx];
    if ((seg.text || '').trim()) { setTtsText(seg.text); return; }
    if (seg.img && (seg.img.wordsId || seg.img.wordsUrl)) {
      grFetchWords(seg.img.wordsId || seg.img.wordsUrl).then(d => {
        if (dead || !d) return;
        const zy0 = seg.img.y0 || 0, zy1 = seg.img.y1 == null ? 1 : seg.img.y1;
        const main = (seg.img.readRects || []).find(r => r.kind === 'main'); // v290: 有框主文就只唸主文
        const t = window.grReadTextFrom(d, zy0, zy1, main || null); // v292: 字層級過濾（行會跨欄）
        if (t.trim()) setTtsText(t);
      });
    }
    return () => { dead = true; };
  }, [segIdx, mode]);

  // v293: 瀏覽器朗讀的語速——跟著學生選的速度，但夾在語音合成聽起來自然的範圍內
  const speechRate = () => Math.max(0.7, Math.min(0.95, readRate));

  // v290: 附註（side 框）——學生點照片上的 🔊 單獨聽那一塊
  const speakSideRect = async (img2, rect) => {
    const d = await grFetchWords(img2.wordsId || img2.wordsUrl);
    if (!d) return;
    const t = window.grReadTextFrom(d, 0, 1, rect); // v292: 字層級——附註框也拆得乾淨
    if (t.trim() && window.speakSentences) window.speakSentences(t, { rate: speechRate() });
  };

  // v293: 逐句朗讀——遇標點停頓、放慢語速，比一口氣唸完自然許多
  const speakSeg = () => {
    if (!window.speechSynthesis || !ttsText) return;
    if (speaking) { stopSpeak(); return; }
    setSpeaking(true);
    speakStopRef.current = window.speakSentences(ttsText, {
      rate: speechRate(),
      onDone: () => { speakStopRef.current = null; setSpeaking(false); },
    });
  };

  // v293: 朗讀速度小控制——放在音檔旁，學生可再調慢／回原速（記住選擇）
  const speedCtl = () => (
    <div className="gr-rate" role="group" aria-label="朗讀速度">
      <span className="gr-rate-cap">速度</span>
      {[['🐢 慢', 0.7], ['適中', 0.8], ['原速', 1]].map(([lab, r]) => (
        <button key={r} type="button"
          className={'gr-rate-btn' + (Math.abs(readRate - r) < 0.02 ? ' on' : '')}
          onClick={() => setReadRate(r)}>{lab}</button>
      ))}
    </div>
  );

  useQME(() => {
    const r = getResume(progressKey, total);
    if (r && r.gr && typeof r.gr.segIdx === 'number') {
      setSegIdx(Math.min(r.gr.segIdx, Math.max(0, segs.length - 1)));
      setMode(r.gr.mode === 'final' && finalQs.length
        ? 'final'
        : (r.gr.mode === 'final-intro' && finalQs.length
          ? 'final-intro'
          : (r.gr.mode === 'quiz' ? 'quiz' : 'read')));
      setQIdx(r.gr.qIdx || 0);
      setRes(r.gr.res || {});
      wrongsRef.current = Array.isArray(r.gr.wrongs) ? r.gr.wrongs : [];
    }
    return () => {
      clearTimeout(autoRef.current);
      if (speakStopRef.current) { try { speakStopRef.current(); } catch (e) {} speakStopRef.current = null; }
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    };
  }, []);

  // 每翻一頁（換段落或換模式）捲回頁頂
  useQME(() => {
    if (topRef.current && topRef.current.scrollIntoView) topRef.current.scrollIntoView({ block: 'start' });
  }, [segIdx, mode]);

  // v282: 圖片預載——進播放器就把整篇的圖抓齊，翻頁不再等圖
  useQME(() => { grPreloadImgs(item); }, [item && item.id]);

  const curQs = mode === 'final' ? finalQs : (segQs[segIdx] || []);
  const gIdxOf = (si, qi) => segQs.slice(0, si).reduce((n, qs) => n + qs.length, 0) + qi;
  const curGIdx = mode === 'final' ? segTotal + qIdx : gIdxOf(segIdx, qIdx);
  const answered = Object.keys(res).length;
  const score = Object.values(res).reduce((s, r) => s + (r.pts || 0), 0);

  const resetQState = () => { setSelected(null); setAnswer(''); setFeedback(''); setPeek(false); };

  const savePosition = (nres, nSeg, nMode, nQ) => {
    const count = Object.keys(nres).length;
    if (count < 1 || count >= total) return;
    saveResume(progressKey, {
      deck: Array.from({ length: total }, (_, i) => i),
      deckPos: count,
      uniqueTotal: total,
      gr: { segIdx: nSeg, mode: nMode, qIdx: nQ, res: nres, wrongs: wrongsRef.current },
    });
  };

  const persist = (nres) => {
    // 存「下一個未答題」的位置
    let nSeg = segIdx, nMode = mode, nQ = qIdx + 1;
    if (nMode === 'quiz' && nQ >= (segQs[nSeg] || []).length) {
      if (nSeg + 1 < segs.length) { nSeg += 1; nMode = 'read'; nQ = 0; }
      else if (finalQs.length) { nMode = 'final-intro'; nQ = 0; }
    }
    savePosition(nres, nSeg, nMode, nQ);
  };

  const finish = (nres) => {
    const finalScore = Object.values(nres).reduce((s, r) => s + (r.pts || 0), 0);
    // v287: 每段答對統計——老師後台看「哪一段全班最卡」
    const segStats = segQs.map((qs2, si) => ({
      ok: qs2.reduce((n, _, qi) => n + (((nres[gIdxOf(si, qi)] || {}).pts) || 0), 0),
      total: qs2.length,
    }));
    const grStats = { segs: segStats };
    if (finalQs.length) {
      grStats.final = {
        ok: finalQs.reduce((n, _, qi) => n + (((nres[segTotal + qi] || {}).pts) || 0), 0),
        total: finalQs.length,
      };
    }
    saveQuizModeCompletion(progressKey, item, { doneCount: total, score: finalScore, total, wrongQuestions: wrongsRef.current, extra: { grStats } });
    clearResume(progressKey);
    setDone(true);
  };

  const advance = (nres) => {
    clearTimeout(autoRef.current);
    resetQState();
    if (qIdx + 1 < curQs.length) { setQIdx(qIdx + 1); return; }
    if (mode === 'final') { finish(nres); return; }
    if (segIdx + 1 < segs.length) { setSegIdx(segIdx + 1); setMode('read'); setQIdx(0); return; }
    if (finalQs.length) { setMode('final-intro'); setQIdx(0); return; }
    finish(nres);
  };

  // 「✅ 完成閱讀」——這段有題進答題頁；沒題直接下一段/綜合題/完成
  const finishReading = () => {
    resetQState();
    if ((segQs[segIdx] || []).length) { setMode('quiz'); setQIdx(0); return; }
    if (segIdx + 1 < segs.length) { setSegIdx(segIdx + 1); setMode('read'); setQIdx(0); return; }
    if (finalQs.length) { setMode('final-intro'); setQIdx(0); return; }
    finish(res);
  };

  const startFinal = () => {
    resetQState();
    savePosition(res, segIdx, 'final', 0);
    setMode('final');
    setQIdx(0);
  };

  const handlePick = (i) => {
    if (selected !== null) return;
    const q = grNormalizeQ(curQs[qIdx]);
    setSelected(i);
    const ok = i === q.correct;
    if (!ok) wrongsRef.current.push({ q: q.q, answer: q.options[q.correct] });
    const nres = { ...res, [curGIdx]: { pts: ok ? 1 : 0 } };
    setRes(nres);
    persist(nres);
    if (ok) autoRef.current = setTimeout(() => advance(nres), 900);
  };

  const submitShort = async () => {
    if (!answer.trim() || checking || feedback) return;
    const q = curQs[qIdx];
    // 綜合題給 AI 整篇文字當依據；段落題給該段文字
    const passage = mode === 'final'
      ? segs.map(s => s.text || '').filter(Boolean).join('\n\n')
      : (segs[segIdx].text || '');
    setChecking(true);
    const result = await window.checkShortAnswer(q.q, q.keyPoints || '', passage, answer);
    const stars = grExtractStars(result);
    if (stars <= 2) wrongsRef.current.push({ q: q.q, answer: q.keyPoints || '（參考 AI 回饋）' });
    const nres = { ...res, [curGIdx]: { pts: stars >= 3 ? 1 : 0 } };
    setRes(nres);
    persist(nres);
    setFeedback(result);
    setChecking(false);
  };

  // 鍵盤：文章頁 Enter＝完成閱讀；答題頁 1–4 選選項、Enter 下一題
  useQME(() => {
    const onKey = (e) => {
      if (done || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      if (mode === 'read') { if (e.key === 'Enter') finishReading(); return; }
      if (mode === 'final-intro') { if (e.key === 'Enter') startFinal(); return; }
      if (qIdx >= curQs.length) return;
      const q = grNormalizeQ(curQs[qIdx]);
      if (q.kind === 'short') return;
      if (selected === null && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < q.options.length) handlePick(i);
      } else if (selected !== null && e.key === 'Enter') {
        advance(res);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!segs.length) return (
    <div className="wp-empty">
      <div className="wp-empty-icon">📖</div>
      <div className="wp-empty-msg">尚無內容</div>
      <div className="wp-empty-sub">請在編輯模式中新增段落與問題</div>
    </div>
  );

  if (done) return (
    <div className="wp-done">
      <div className="wp-done-icon">✦</div>
      <div className="wp-done-title">Reading Complete!</div>
      <div className="wp-done-sub">讀完 {segs.length > 1 ? `${segs.length} 段文章` : '文章'} · 回答 {total} 題{finalQs.length ? '（含綜合題）' : ''}</div>
      <div className="wp-done-score">
        <span className="wp-done-avg">{score}</span>
        <span className="wp-done-maxstar"> / {total}</span>
      </div>
      {wrongsRef.current.length > 0 && (
        <div className="gr-done-note">答錯的 {wrongsRef.current.length} 題已幫你收進錯題本 📔</div>
      )}
      <div className="qm-result-btns" style={{marginTop:20}}>
        <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask} backLabel="← 返回"/>
      </div>
    </div>
  );

  // v287: 文字段落每個英文字都可點——點了唸給他聽＋查中文意思
  const renderParas = (text) => String(text || '').split(/\n+/).map(t => t.trim()).filter(Boolean)
    .map((t, i) => (
      <p key={i}>
        {t.split(/([A-Za-z][A-Za-z'’-]*)/g).map((tok, j) =>
          /^[A-Za-z]/.test(tok) && tok.length > 1
            ? <span key={j} className="grd-tword" onClick={(e) => openWord(tok, t, e)}>{tok}</span>
            : tok
        )}
      </p>
    ));

  const renderSegContent = (seg, allowZoom) => (
    <>
      {seg.img && seg.img.url ? (
        <GrImgCrop img={seg.img} onZoom={allowZoom ? () => setZoom(seg.img) : null}
          onWord={(w, e) => openWord(w, '', e)}
          onSide={(r) => speakSideRect(seg.img, r)}/>
      ) : null}
      {(seg.text || '').trim() ? <div className="gr-seg-text">{renderParas(seg.text)}</div> : null}
    </>
  );

  const renderQuestion = () => {
    const q = grNormalizeQ(curQs[qIdx]);
    return (
      <div className="gr-q" key={`q-${mode}-${segIdx}-${qIdx}`}>
        <div className="gr-q-count">問題 {qIdx + 1} / {curQs.length}</div>
        <div className="gr-q-text qm-question-swap">{q.q}</div>
        {q.kind === 'short' ? (
          <>
            <textarea
              className="qm-writing-input wp-input sa-input"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !feedback && !checking) { e.preventDefault(); submitShort(); } }}
              placeholder="Write your answer here…"
              disabled={!!feedback}
              rows={4}
            />
            {!feedback ? (
              <button className="qm-btn primary wp-submit" onClick={submitShort} disabled={checking || !answer.trim()}>
                {checking ? '🤖 批改中…' : '送出答案 →'}
              </button>
            ) : (
              <>
                <WritingFeedback text={feedback}/>
                <button className="qm-btn primary wp-next" onClick={() => advance(res)}>
                  {qIdx + 1 >= curQs.length && (mode === 'final' || (segIdx + 1 >= segs.length && !finalQs.length)) ? '完成 ✦' : '下一題 →'}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <div className="qm-options qm-options-swap">
              {q.options.map((opt, i) => {
                let cls = 'qm-option';
                if (selected !== null) {
                  if (i === q.correct) cls += ' correct';
                  else if (i === selected) cls += ' wrong';
                  else cls += ' dim';
                }
                return (
                  <button key={i} className={cls} onClick={() => handlePick(i)}>
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
                {selected === q.correct ? (
                  <div className="qm-auto-next">答對了，自動下一題…</div>
                ) : (
                  <button className="qm-btn primary" onClick={() => advance(res)}>下一題 →</button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="gr-player" ref={topRef}>
      <div className="wp-progress-bar">
        <div className="wp-progress-fill" style={{width:`${total ? (answered/total)*100 : 0}%`}}/>
      </div>
      <div className="wp-header">
        <button className="wp-back" onClick={onBack}>←</button>
        <span className="wp-counter">
          {mode === 'final' || mode === 'final-intro' ? '📚 綜合練習 · ' : (segs.length > 1 ? `第 ${segIdx + 1} / ${segs.length} 段 · ` : '')}
          {total ? `${answered} / ${total} 題` : ''}
        </span>
      </div>

      {/* v289: 課文音檔（課本配音）——非閱讀頁隱藏但不卸載，播放位置一路保留 */}
      {item.grAudioUrl ? (
        <div className={'gr-audio' + (mode === 'read' && !(segs[segIdx] && segs[segIdx].audioUrl) ? '' : ' hide')}>
          <span className="gr-audio-label">🎧 課文朗讀</span>
          <audio ref={audioRef} controls preload="metadata" src={item.grAudioUrl}
            onLoadedMetadata={(e) => applyRate(e.target)}/>
          {speedCtl()}
        </div>
      ) : null}

      {/* v284: 換頁時整頁淡入上滑——key 換了就重播動畫 */}
      <div key={`pg-${mode}-${segIdx}`} className={'gr-page gr-page-' + (mode === 'read' ? 'read' : mode === 'final-intro' ? 'intro' : 'quiz')}>
      {mode === 'read' ? (
        /* ── 文章頁：只有這一段的內容＋「完成閱讀」── */
        <>
          {segs[segIdx].audioUrl ? (
            <div className="gr-audio gr-audio-seg">
              <span className="gr-audio-label">🎧 課文朗讀</span>
              <audio ref={segAudioRef} controls preload="metadata" src={segs[segIdx].audioUrl}
                onLoadedMetadata={(e) => applyRate(e.target)}/>
              {speedCtl()}
            </div>
          ) : null}
          {segs.length > 1 && (
            <div className="gr-dots" aria-hidden="true">
              {segs.map((_, i) => (
                <span key={i} className={i < segIdx ? 'past' : i === segIdx ? 'cur' : ''}/>
              ))}
            </div>
          )}
          <div className="gr-seg cur">
            <div className="gr-read-head">
              {segs.length > 1 ? <div className="gr-seg-label">第 {segIdx + 1} 段</div> : <span/>}
              {ttsText && !item.grAudioUrl && !segs[segIdx].audioUrl ? (
                <button className={'gr-peek-btn gr-tts-btn' + (speaking ? ' on' : '')} onClick={speakSeg}>
                  {speaking ? '⏹ 停止朗讀' : '🔊 聽這一段'}
                </button>
              ) : null}
            </div>
            {renderSegContent(segs[segIdx], true)}
            {((segs[segIdx].text || '').trim() || (segs[segIdx].img && (segs[segIdx].img.wordsId || segs[segIdx].img.wordsUrl))) ? (
              <div className="gr-tap-hint">💡 不會的單字點一下，聽發音、看意思</div>
            ) : null}
          </div>
          <div className="gr-continue">
            <button className="qm-btn primary gr-readdone" onClick={finishReading}>✅ 完成閱讀</button>
          </div>
        </>
      ) : mode === 'final-intro' ? (
        /* ── 文章與綜合題之間的過場：讓學生明確知道閱讀階段已完成 ── */
        <div className="qm-intro gr-final-intro">
          <div className="qm-intro-icon">✅</div>
          <div className="qm-intro-title">已經讀完文章！</div>
          <div className="qm-intro-meta">接下來開始做綜合練習</div>
          <div className="qm-intro-rules">
            <div className="qm-intro-rule-row"><span>📚</span><span>用剛才讀完的整篇文章，完成最後 {finalQs.length} 題綜合題。</span></div>
            <div className="qm-intro-rule-row"><span>👀</span><span>忘記內容時，可以按「回頭看文章」再次查看。</span></div>
          </div>
          <div className="qm-intro-btns">
            <button className="qm-btn primary" onClick={startFinal}>開始綜合練習 →</button>
          </div>
        </div>
      ) : (
        /* ── 問題頁：一題一題答；可展開「回頭看文章」── */
        <div className="gr-seg cur">
          <div className="gr-quiz-head">
            <div className="gr-seg-label">{mode === 'final' ? '📚 綜合題 · 關於整篇文章' : `第 ${segIdx + 1} 段的問題`}</div>
            <button className="gr-peek-btn" onClick={() => setPeek(p => !p)}>
              {peek ? '收起文章 ▴' : '📖 回頭看文章 ▾'}
            </button>
          </div>
          {peek && (
            <div className="gr-peek-panel">
              {(mode === 'final' ? segs : [segs[segIdx]]).map((seg, i) => (
                <div key={i} className="gr-peek-seg">
                  {mode === 'final' && segs.length > 1 && <div className="gr-seg-label">第 {i + 1} 段</div>}
                  {renderSegContent(seg, true)}
                </div>
              ))}
            </div>
          )}
          {renderQuestion()}
        </div>
      )}
      </div>{/* end .gr-page */}

      {/* v287: 點字查義小卡（點單字出現；自動唸一次，可再按 🔊） */}
      {dict && (
        <div className={'gr-word-pop' + (dict.pos ? ' anch' : '')} role="dialog" aria-label={`單字 ${dict.word}`}
          style={dict.pos ? { left: dict.pos.x, top: dict.pos.y, bottom: 'auto', transform: dict.pos.above ? 'translate(-50%, -100%)' : 'translateX(-50%)' } : undefined}>
          <div className="gr-word-pop-head">
            <b>{dict.word}</b>
            <button className="gr-word-say" onClick={() => window.speakText && window.speakText(dict.word)} title="再聽一次">🔊</button>
            <span style={{flex:1}}/>
            <button className="gr-word-x" onClick={() => setDict(null)}>✕</button>
          </div>
          <div className="gr-word-pop-body">
            {dict.text == null
              ? <span className="gr-word-loading">查詢中…</span>
              : dict.text.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}

      {zoom && (
        <div className="gr-lightbox" onClick={() => setZoom(null)}>
          <div className="gr-lightbox-in">
            <GrImgCrop img={zoom} onWord={(w, e) => openWord(w, '', e)} onSide={(r) => speakSideRect(zoom, r)}/>
            <div className="gr-lightbox-hint">點單字＝查意思 · 點其他地方關閉</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SYLLABLE DIVISION — INTRO
══════════════════════════════════════════════════════ */
function SyllableDivIntro({ item, onStart, resumeAt, onRestart }) {
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
          {resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始練習 · Start →'}
        </button>
        {resumeAt && onRestart ? (
          <button className="qm-btn secondary qm-intro-restart" onClick={onRestart}>↻ 重新開始</button>
        ) : null}
        {resumeAt ? <div className="qm-intro-resume">上次做到一半，進度已幫你保留 ✓</div> : null}
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
function SyllableDivPlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
  const words = useQMM(() => item.sdWords || [], [item.id]);
  // v265: 續做——做到第幾個字＋每個字的對錯
  const rz = useQMM(() => {
    const r = getResume(progressKey, (item.sdWords || []).length);
    return (r && Array.isArray(r.scores) && r.scores.length === r.deckPos) ? r : null;
  }, [item.id]);

  const [idx,       setIdx]       = useQM(rz ? rz.deckPos : 0);
  const [cuts,      setCuts]      = useQM(() => new Set());
  const [submitted, setSubmitted] = useQM(false);
  const [scores,    setScores]    = useQM(rz ? rz.scores.slice() : []); // true/false per word
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
    const nextScores = [...scores, isCorrect];
    setScores(nextScores);
    if (window.playSound) window.playSound(isCorrect ? 'correct' : 'wrong');
    setSubmitted(true);
    if (isCorrect) {
      // v258: 把最新的 scores 一起帶過去——setTimeout 裡的 next 是舊 render 的閉包，
      // 直接讀 state 會少算剛答對的最後一題（滿分被存成少一題）
      setTimeout(() => next(nextScores), 650);
    }
  };

  const next = (scoresOverride = null) => {
    const s = scoresOverride || scores;
    if (idx + 1 >= total) {
      clearResume(progressKey); // v265
      const correct = s.filter(Boolean).length;
      // v258: 錯題記錄——切錯的單字＋正確切法
      const wrongList = words.filter((w, i) => !s[i]).map(w => ({ q: w.word, answer: w.answer || '' }));
      saveQuizModeCompletion(progressKey, item, { doneCount: total, score: correct, total, wrongQuestions: wrongList });
      setDone(true);
      return;
    }
    // v265: 每前進一題存續做進度（音節題不打亂順序，deck＝原始索引）
    saveResume(progressKey, {
      deck: words.map((_, i) => i),
      deckPos: idx + 1,
      uniqueTotal: total,
      scores: s,
    });
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
          <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask}/>
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
function WordSortPlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
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
    // v258: 錯題記錄——放錯欄位的單字＋正確答案（字尾模式記完整單字，一般模式記正確分類）
    const wrongList = allWords
      .filter(w => placements[w.id] !== w.category)
      .map(w => ({
        q: suffixMode ? stem(w) + '_' : w.word,
        answer: suffixMode ? makeSuffixWord(stem(w), w.category) : w.category,
      }));
    saveQuizModeCompletion(progressKey, item, { doneCount: total, score: correct, total, wrongQuestions: wrongList });
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
          <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask}/>
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
function EssayPlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
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
            <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask}/>
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
function StoryMountainPlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
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
          <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask}/>
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

function CircleAnswerPlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
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
            <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask}/>
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

function ClozePlayer({ item, progressKey, onBack, onBackToTasks, onNextTask }) {
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
            <QmDoneNavBtns onBack={onBack} onBackToTasks={onBackToTasks} onNextTask={onNextTask}/>
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
function WeekHero({ week, weekIdx, weekOrder, done, total, who, onPrevWeek, onNextWeek, weekAvg, onOpenGrowth }) {
  const pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
  const weekNum = ((week.label || '').match(/(\d+)\s*$/) || [])[1] || (weekIdx + 1);
  const title = week.themeZh || week.theme || (who ? `${who} 的第 ${weekNum} 週任務` : `第 ${weekNum} 週的練習`);
  let enTheme = week.themeZh ? week.theme : '';
  // v296: 濾掉跟上方 kicker 重複的英文主題（Alan 資料常填「W16 - 本週進度」之類）
  if (enTheme && /^\s*W?\d+\s*[-–—]?\s*本週進度\s*$/i.test(enTheme)) enTheme = '';
  const R = 48, CIRC = 2 * Math.PI * R;   // v296: 進度環放大，更像主角
  const allDone = total > 0 && done >= total;

  // v296: 圓環進度動畫＋數字 count-up（回到大廳時重播；reduced-motion 直接定住）
  const ringRef = React.useRef(null);
  const pctRef  = React.useRef(null);
  const doneRef = React.useRef(null);
  useQME(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = ringRef.current;
    if (el) {
      if (reduce) { el.style.strokeDashoffset = CIRC * (1 - pct / 100); }
      else {
        el.style.transition = 'none';
        el.style.strokeDashoffset = CIRC;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.style.transition = 'stroke-dashoffset 1s cubic-bezier(.3,.7,.2,1) .2s';
          el.style.strokeDashoffset = CIRC * (1 - pct / 100);
        }));
      }
    }
    const countUp = (node, target, suffix) => {
      if (!node) return;
      if (reduce || !target) { node.textContent = target + (suffix || ''); return; }
      const dur = 950; let t0 = null;
      const step = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        node.textContent = Math.round(target * e) + (suffix || '');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    countUp(pctRef.current, pct, '%');
    countUp(doneRef.current, done, '');
  }, []);

  return (
    <section className="wh" aria-label="本週總覽">
      <div className="wh-info">
        <div className="wh-kicker">
          <span className="wh-pill">Week {weekNum}</span>
          <span className="wh-kick-txt">{who ? `${who} 的暑假` : '本週進度'}</span>
          {/* v257: 手機版 header 不再放週切換——改到這裡（桌機以 CSS 隱藏） */}
          {onPrevWeek && onNextWeek && (
            <span className="wh-weeknav">
              <button onClick={onPrevWeek} disabled={weekIdx <= 0} aria-label="上一週">‹</button>
              <button onClick={onNextWeek} disabled={weekIdx >= (weekOrder ? weekOrder.length : 1) - 1} aria-label="下一週">›</button>
            </span>
          )}
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
              <svg className="wh-ring" viewBox="0 0 110 110">
                <circle className="wh-ring-bg" cx="55" cy="55" r={R}/>
                <circle ref={ringRef} className="wh-ring-fill" cx="55" cy="55" r={R}
                  strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct / 100)}/>
              </svg>
              <span className="wh-ring-num"><b ref={pctRef}>{pct}%</b><i>完成度</i></span>
            </div>
            <div className="wh-side-info">
              <span className="wh-count">完成 <b ref={doneRef}>{done}</b> / {total} 個練習</span>
              {allDone && <span className="wh-done-msg">🎉 本週練習全部完成！</span>}
              {/* v268: 家長共看畫面——本週平均＋成長報告入口 */}
              {weekAvg != null && onOpenGrowth && (
                <button className="wh-growth-link" onClick={onOpenGrowth}>本週平均 {weekAvg} 分 · 看成長報告 →</button>
              )}
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
  const [ttOpen, setTtOpen] = useQM({}); // v267: 分組收合狀態（未動過＝全完成收、未完成開）
  const note = week.parentNote || '';
  const hw = week.homework || {};
  const itemById = {};
  (allItems || []).forEach(it => { itemById[it.id] = it; });
  const dueText = (d) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000);
    return diff > 1 ? `${diff} 天後到期` : diff === 1 ? '明天到期' : diff === 0 ? '今天到期' : diff >= -7 ? '已過期' : '已結束'; // v266: 過期 7 天以上＝已結束（灰色）
  };
  const tasks = Object.keys(hw).map(id => {
    const it = itemById[id];
    if (!it) return null;
    if (getQuizItems([it]).length === 0) return null; // v261: 空單元（0 題）不進任務清單——點進去也沒東西可做
    const prog = (qmProg || {})[`${weekId}_${id}`];
    const done = !!(prog && prog.done);
    const pct  = (done && prog.total && prog.score != null) ? Math.round(prog.score / prog.total * 100) : null;
    const resume = !done ? getResume(`${weekId}_${id}`, null) : null;
    const cat = (categories || []).find(c => c.id === it._cat);
    return { id, it, cat, dueDate: hw[id] && hw[id].dueDate, done, pct, resumeAt: resume ? resume.deckPos : null };
  }).filter(Boolean);
  const doneN = tasks.filter(t => t.done).length;
  const allDone = tasks.length > 0 && doneN === tasks.length;

  // v268: 完成慶祝——這週任務第一次全部完成時，回到大廳給一個收尾儀式
  // （每週（含任務數）只慶祝一次；flag 按帳號隔離存本機）
  const [cele, setCele] = useQM(false);
  useQME(() => {
    if (!allDone) return;
    const store = 'alan-tt-cele' + ((window._currentUser && window._currentUser.uid) ? ':u:' + window._currentUser.uid : ':anon');
    const key = `${weekId}:${tasks.length}`;
    let seen = {};
    try { seen = JSON.parse(localStorage.getItem(store) || '{}'); } catch (e) {}
    if (seen[key]) return;
    seen[key] = 1;
    try { localStorage.setItem(store, JSON.stringify(seen)); } catch (e) {}
    setCele(true);
    if (window.triggerStarBurst) window.triggerStarBurst();
    if (window.playSound) window.playSound('complete');
  }, [allDone, tasks.length, weekId]);
  const celeScores = tasks.filter(t => t.pct != null).map(t => t.pct);
  const celeAvg = celeScores.length ? Math.round(celeScores.reduce((a, b) => a + b, 0) / celeScores.length) : null;

  // ── v235: 依「文章／主題」分組——同一篇文章的題目收在同一個標題下 ──
  // 沒有資料欄位可用，所以用標題歸戶：去掉題型字眼與編號後相同 → 同一篇
  const TYPE_WORDS = /(單字卡|單字聽寫|聽寫|拼字|單字練習|手寫練習|選擇題|簡答題|填空題|填空|造句|練習|測驗|單字|文法|閱讀|quiz|flashcards?|test|spelling)/gi;
  const SEP_TRIM = /[\s\-–—_·．.。,，()（）0-9０-９]+$/;
  const keyOf = (t) => String(t || '').toLowerCase().replace(TYPE_WORDS, '').replace(/[\s\-–—_·．.。,，()（）0-9０-９]+/g, '');
  const lcpOf = (arr) => {
    let pfx = arr[0] || '';
    for (const str of arr.slice(1)) {
      let i = 0;
      while (i < pfx.length && i < str.length && pfx[i] === str[i]) i++;
      pfx = pfx.slice(0, i);
    }
    return pfx;
  };
  const byKey = {};
  tasks.forEach(t => {
    const manual = String(t.it.group || '').trim(); // v254: 老師手動分組優先
    const k = manual ? `m:${manual.toLowerCase()}` : (keyOf(t.it.title) || `_${t.id}`);
    (byKey[k] = byKey[k] || []).push(t);
  });
  const sortRows = (a, b) => (a.done - b.done) || (qmTypeRank(a.it.type) - qmTypeRank(b.it.type)) || String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')); // v273: 組內按學習順序
  const entries = Object.values(byKey).map(group => {
    group.sort(sortRows);
    const manualName = String(group[0].it.group || '').trim(); // v254
    if (manualName) return { group: true, name: manualName, tasks: group };
    if (group.length < 2) return { group: false, tasks: group };
    let name = lcpOf(group.map(t => t.it.title)).replace(TYPE_WORDS, '').replace(SEP_TRIM, '').trim();
    if (name.length < 2) name = '';
    return name ? { group: true, name, tasks: group } : { group: false, tasks: group };
  });
  // 攤平非分組的（各自一列）；排序：未完成的組在前、依最早到期
  const flat = [];
  entries.forEach(e => {
    if (e.group) flat.push(e);
    else e.tasks.forEach(t => flat.push({ group: false, name: null, tasks: [t] }));
  });
  flat.sort((a, b) => {
    const ad = a.tasks.every(t => t.done) ? 1 : 0, bd = b.tasks.every(t => t.done) ? 1 : 0;
    if (ad !== bd) return ad - bd;
    const adu = String((a.tasks.find(t => !t.done) || a.tasks[0]).dueDate || '9999');
    const bdu = String((b.tasks.find(t => !t.done) || b.tasks[0]).dueDate || '9999');
    return adu.localeCompare(bdu);
  });

  // v272: 改用共用的 qmShortLabel——任務清單與側欄稱呼一致
  const rowLabel = (t, groupName) => groupName ? qmShortLabel(t.it, groupName) : t.it.title;

  const renderRow = (t, groupName) => {
    const due = dueText(t.dueDate);
    return (
      <button key={t.id} className={`tt-row${t.done ? ' tt-done' : ''}${groupName ? ' in-group' : ''}`} onClick={() => t.cat && onOpenTask(t.cat, t.id)}>
        {t.it.type === 'upload'
          ? <span className="tt-ic tt-ic-upload" aria-hidden="true">📎</span>
          : <CatIcon catId={t.cat ? t.cat.id : 'vocab'} className="tt-ic"/>}
        <span className="tt-body">
          <b className="tt-name">{rowLabel(t, groupName)}</b>
          <span className="tt-meta">
            {t.it.type === 'upload' ? '上傳作業 · 拍照繳交' : t.cat ? (t.cat.titleZh || t.cat.title) : ''}
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
  };

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
          {flat.map((e, i) => {
            if (!e.group) return renderRow(e.tasks[0], null);
            // v267: 分組可收合——全部完成的組預設收起來（一行帶 ✓），任務再多也不會佔滿頁面
            const gDone = e.tasks.filter(t => t.done).length;
            const gAll  = gDone === e.tasks.length && e.tasks.length > 0;
            const gKey  = 'g:' + (e.name || i);
            const open  = ttOpen[gKey] !== undefined ? ttOpen[gKey] : !gAll;
            return (
              <div className={`tt-group${open ? ' open' : ''}`} key={`g${i}`}>
                <button
                  className="tt-group-name"
                  onClick={() => setTtOpen(o => ({ ...o, [gKey]: !open }))}
                  aria-expanded={open}
                >
                  <span className={`tt-group-chev${open ? ' open' : ''}`} aria-hidden="true">▸</span>
                  <span className="tt-group-ico" aria-hidden="true">📄</span>
                  <span className="tt-group-title">{e.name}</span>
                  {gAll
                    ? <span className="tt-group-count all-done">✓ 全部完成</span>
                    : <span className="tt-group-count">{gDone} / {e.tasks.length}</span>}
                </button>
                {/* v264: 子項目包一層——縮排＋左側直線，階層一眼看懂 */}
                {open && (
                  <div className="tt-group-rows">
                    {e.tasks.map(t => renderRow(t, e.name))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {allDone && <div className="tt-alldone">🎉 今天的作業都完成了，太棒了！</div>}
      {/* v268: 一天的收尾儀式 */}
      {cele && (
        <div className="tt-cele-overlay" onClick={() => setCele(false)}>
          <div className="tt-cele" onClick={e => e.stopPropagation()}>
            <div className="tt-cele-emoji" aria-hidden="true">🎉</div>
            <div className="tt-cele-title">任務全部完成！</div>
            <div className="tt-cele-sub">
              完成 {tasks.length} 項{celeAvg != null ? ` · 平均 ${celeAvg} 分` : ''}，明天見！
            </div>
            <button className="qm-btn primary" onClick={() => setCele(false)}>太棒了 ✓</button>
          </div>
        </div>
      )}
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
    const pct  = (prog && prog.score != null && prog.total) ? Math.round(prog.score / prog.total * 100) : null; // v270
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
    return diff > 0 ? `${diff} 天後到期` : diff === 0 ? '今天到期' : diff >= -7 ? '已過期' : '已結束'; // v266
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
            // v270: 沒有分數的完成（單字卡、待批改的上傳作業）不列入平均——否則被當 0 分拉低
            if (p.score != null && p.total) {
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
    // v271: 最後一週還沒全做完＝進行中（曲線與列表都特別標示，不讓它看起來像退步）
    perWeek.forEach((p, i) => { p.inProgress = (i === perWeek.length - 1 && p.done < p.total); });
    const scoredWeeks = perWeek.filter(p => p.avg != null);
    const lastScored = scoredWeeks[scoredWeeks.length - 1] || null;
    const prevScored = scoredWeeks[scoredWeeks.length - 2] || null;
    return {
      perWeek, totalDone, scoredWeeks,
      thisWeekAvg: lastScored ? lastScored.avg : null,
      delta: (lastScored && prevScored) ? lastScored.avg - prevScored.avg : null,
      avgScore: gN ? Math.round(gSum / gN) : null,
    };
  }, [weeks, weekOrder, qmProg, categories]);

  const pw = data.perWeek;
  const hasData = data.totalDone > 0;

  // ── SVG line chart geometry ──
  // v271: 主軸改「每週平均分數」（家長最在意的成果）；只畫有分數的週
  const cw = data.scoredWeeks;
  const W = 640, H = 200, padL = 14, padR = 14, padT = 26, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB, baseline = padT + innerH;
  const n = cw.length;
  const xAt = (i) => n > 1 ? padL + i * innerW / (n - 1) : padL + innerW / 2;
  const yAt = (v) => padT + (1 - v / 100) * innerH;
  // 進行中的那一點用虛線接入：實線只畫到倒數第二點
  const lastInProg = n > 1 && cw[n - 1].inProgress;
  const solidPts = (lastInProg ? cw.slice(0, n - 1) : cw).map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.avg).toFixed(1)}`).join(' ');
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
              <div className="growth-stats growth-stats-3">
                <div className="growth-stat">
                  <div className="growth-stat-num">{data.thisWeekAvg != null ? data.thisWeekAvg : '—'}<em>分</em></div>
                  <div className="growth-stat-label">本週平均</div>
                  {data.delta != null && data.delta !== 0 && (
                    <div className={`growth-stat-delta${data.delta > 0 ? ' up' : ' down'}`}>
                      {data.delta > 0 ? '▲' : '▼'} 較上週 {data.delta > 0 ? '+' : ''}{data.delta} 分
                    </div>
                  )}
                  {data.delta === 0 && <div className="growth-stat-delta">與上週持平</div>}
                </div>
                <div className="growth-stat">
                  <div className="growth-stat-num">{data.avgScore != null ? data.avgScore : '—'}<em>分</em></div>
                  <div className="growth-stat-label">整體平均</div>
                </div>
                <div className="growth-stat">
                  <div className="growth-stat-num">{data.totalDone}<em>項</em></div>
                  <div className="growth-stat-label">完成練習</div>
                </div>
              </div>

              {n > 0 && (
                <div className="growth-chart-wrap">
                  <div className="growth-chart-title">每週平均分數</div>
                  <svg className="growth-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="每週平均分數折線圖">
                    {[0, 25, 50, 75, 100].map(g => (
                      <g key={g}>
                        <line x1={padL} y1={yAt(g)} x2={W - padR} y2={yAt(g)} className="growth-grid"/>
                        <text x={padL - 2} y={yAt(g) - 2} className="growth-axis-y">{g}</text>
                      </g>
                    ))}
                    {n > 1 && <polyline points={solidPts} className="growth-line"/>}
                    {lastInProg && (
                      <line
                        x1={xAt(n - 2)} y1={yAt(cw[n - 2].avg)}
                        x2={xAt(n - 1)} y2={yAt(cw[n - 1].avg)}
                        className="growth-line growth-line-dash"
                      />
                    )}
                    {cw.map((p, i) => (
                      <g key={p.wid}>
                        <circle cx={xAt(i)} cy={yAt(p.avg)} r="4.5" className={`growth-dot${p.inProgress ? ' live' : ''}`}/>
                        {/* 邊緣的分數標籤往內靠，避免壓到座標軸／被裁掉 */}
                        <text
                          x={xAt(i) + (i === 0 ? 14 : i === n - 1 ? -14 : 0)}
                          y={yAt(p.avg) - 9}
                          className="growth-dot-num"
                        >{p.avg}</text>
                        {(i % labelStep === 0 || i === n - 1) && (
                          <text
                            x={xAt(i)}
                            y={H - 10}
                            className="growth-axis-x"
                            style={i === n - 1 ? { textAnchor: 'end' } : i === 0 ? { textAnchor: 'start' } : undefined}
                          >{shortLabel(p.label)}{p.inProgress ? '·進行中' : ''}</text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
              )}

              <div className="growth-weeks">
                {pw.slice().reverse().map(p => (
                  <div className={`growth-wrow${p.inProgress ? ' inprog' : ''}`} key={p.wid}>
                    <div className="growth-wrow-head">
                      <span className="growth-wrow-label">{p.label}</span>
                      {p.dateRange && <span className="growth-wrow-date">{p.dateRange}</span>}
                      {p.inProgress && <span className="growth-wrow-live">進行中</span>}
                      <span className="growth-wrow-score">
                        {p.avg != null ? <>平均 <b>{p.avg}</b> 分</> : '尚無分數'}
                      </span>
                    </div>
                    <div className="growth-wrow-bar">
                      <div className="growth-wrow-fill" style={{ width: p.pct + '%' }}/>
                    </div>
                    <div className="growth-wrow-meta">
                      <span className="growth-wrow-pct">完成 {p.done}/{p.total}（{p.pct}%）{p.inProgress ? ' · 這週還在進行' : ''}</span>
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

/* ══════════════════════════════════════════════════════
   UPLOAD HOMEWORK — v263「上傳作業」題型
   紙本作業拍照上傳：學生拍照/選圖 → 縮圖預覽 → 送出（自動縮小後傳
   Firebase Storage）→ 老師在後台學生詳情看照片、打分數。
══════════════════════════════════════════════════════ */
function UploadHomeworkPlayer({ item, progressKey, onBack }) {
  const [pending,   setPending]   = useQM([]);   // [{ file, url }] 還沒送出的
  const [busy,      setBusy]      = useQM(false);
  const [upMsg,     setUpMsg]     = useQM('');   // v266: 上傳進度「2/3」
  const [err,       setErr]       = useQM('');
  const [cloudProg, setCloudProg] = useQM(null); // 雲端這一筆（已交照片/分數）
  const u = window._currentUser;

  // 已交過的照片與批改結果：聽自己的雲端 progress（老師打完分數會即時看到）
  useQME(() => {
    if (!u || !window.subscribeMyProgress) return;
    return window.subscribeMyProgress(u.uid, items => setCloudProg(items[progressKey] || null));
  }, []);

  const submitted = (cloudProg && cloudProg.files) || [];
  const score     = cloudProg && cloudProg.score != null ? cloudProg.score : null;

  // 照片縮小到最長邊 1600px 的 JPEG——平板原圖動輒 5-10MB，上傳太慢
  const shrink = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      const k = Math.min(1, MAX / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => b ? resolve(b) : reject(new Error('無法處理這張圖片')), 'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('圖片讀取失敗')); };
    img.src = URL.createObjectURL(file);
  });

  const pickFiles = (e) => {
    const files = Array.from(e.target.files || []).filter(f => /^image\//.test(f.type));
    if (!files.length) return;
    setErr('');
    setPending(prev => [...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f) }))]);
    e.target.value = ''; // 同一張可以再選
  };
  const removePending = (i) => setPending(prev => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, j) => j !== i); });

  const submit = async () => {
    if (!u) { setErr('要先登入才能交作業喔！'); return; }
    if (!pending.length || busy) return;
    setBusy(true); setErr('');
    try {
      const urls = [];
      for (let i = 0; i < pending.length; i++) {
        setUpMsg(`${i + 1}/${pending.length}`); // v266: 讓學生知道傳到第幾張
        const blob = await shrink(pending[i].file);
        urls.push(await window.uploadSubmissionPhoto(u.uid, progressKey, blob, i));
      }
      const all = [...submitted, ...urls];
      saveQuizModeCompletion(progressKey, item, {
        doneCount: 1, score: null, total: 1,
        extra: { files: all, graded: false, submittedAt: Date.now() },
      });
      pending.forEach(p => URL.revokeObjectURL(p.url));
      setPending([]);
      if (window.playSound) window.playSound('complete');
    } catch (e) {
      const denied = e && (e.code === 'storage/unauthorized' || /permission|unauthorized/i.test(String(e && e.message)));
      setErr(denied
        ? '上傳被擋下來了——請告訴老師「上傳權限還沒開」。'
        : '上傳失敗，請檢查網路再試一次。' + (e && e.message ? `（${e.message}）` : ''));
    }
    setBusy(false);
    setUpMsg('');
  };

  // v266: 未批改前可以刪掉自己傳錯的照片；全部刪光＝視同還沒繳交
  const removeSubmitted = (url) => {
    if (!u || busy || score != null) return;
    if (!window.confirm('刪掉這張照片？（刪掉後老師就看不到它了）')) return;
    const rest = submitted.filter(x => x !== url);
    if (rest.length) {
      saveQuizModeCompletion(progressKey, item, {
        doneCount: 1, score: null, total: 1,
        extra: { files: rest, graded: false, submittedAt: (cloudProg && cloudProg.submittedAt) || Date.now() },
      });
    } else {
      window.saveProgressItem(u.uid, u.displayName || '', u.email || '', progressKey, null);
      try {
        const m = loadQMProg();
        if (m[progressKey] !== undefined) { delete m[progressKey]; saveQMProg(m); }
        if (window._bumpQmProgress) window._bumpQmProgress();
      } catch (e) {}
    }
  };

  return (
    <div className="qm-intro uh">
      <div className="qm-intro-icon">📎</div>
      <div className="qm-intro-title">{item.title}</div>
      <div className="qm-intro-meta">拍照上傳作業</div>
      {item.instruction && (
        <div className="uh-instruction">📋 {item.instruction}</div>
      )}

      {submitted.length > 0 && (
        <div className="uh-block">
          <div className="uh-block-title">
            {score != null
              ? <span className="uh-graded">✓ 老師改好了：{score} 分</span>
              : <span className="uh-waiting">已交 {submitted.length} 張 · 等老師批改 ⏳</span>}
          </div>
          {/* v266: 老師評語 */}
          {score != null && cloudProg && cloudProg.comment ? (
            <div className="uh-comment">💬 老師說：{cloudProg.comment}</div>
          ) : null}
          <div className="uh-grid">
            {submitted.map((url, i) => (
              <span key={i} className="uh-thumb">
                <a href={url} target="_blank" rel="noreferrer" title="點開看大圖">
                  <img src={url} alt={`已交作業 ${i + 1}`}/>
                </a>
                {/* v266: 未批改前可刪掉傳錯的照片 */}
                {score == null && (
                  <button className="uh-thumb-del" onClick={() => removeSubmitted(url)} aria-label="刪掉這張">✕</button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="uh-block">
          <div className="uh-block-title">還沒送出（{pending.length} 張）</div>
          <div className="uh-grid">
            {pending.map((p, i) => (
              <span key={i} className="uh-thumb uh-thumb-pending">
                <img src={p.url} alt={`預覽 ${i + 1}`}/>
                <button className="uh-thumb-del" onClick={() => removePending(i)} aria-label="移除這張">✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {err && <div className="uh-err">⚠ {err}</div>}

      <div className="uh-btns">
        <label className={`qm-btn secondary uh-pick${busy ? ' disabled' : ''}`}>
          📷 拍照或選照片
          <input type="file" accept="image/*" multiple onChange={pickFiles} disabled={busy} style={{ display: 'none' }}/>
        </label>
        <button className="qm-btn primary" onClick={submit} disabled={busy || pending.length === 0}>
          {busy ? `上傳中 ${upMsg}…` : submitted.length > 0 ? '補交這幾張 →' : '送出作業 →'}
        </button>
      </div>
      <div className="uh-hint">可以一次選好幾張；交出去之後還是可以再補交。</div>
    </div>
  );
}

Object.assign(window, { SpellingPlayer, SpellingIntro, QuizModeBlocks, QuizModeCategoryView, QuizModePlayer, getItemQuestions, getQuizItems, generateListeningQuestions, loadQMProg, getQuizItemTotal, CAT_ICONS, WritingPracticePlayer, TypeAnswerPlayer, ShortAnswerPlayer, SyllableDivPlayer, WordSortPlayer, EssayPlayer, StoryMountainPlayer, CircleAnswerPlayer, CircleAnswerIntro, ClozePlayer, ClozeIntro, UploadHomeworkPlayer, GuidedReadingPlayer, GuidedReadingIntro, WeeklyContactBook, TodayTasks, GrowthReport, WeekHero });
