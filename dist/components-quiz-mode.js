function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// components-quiz-mode.jsx — Quiz mode (main UI for students + teacher edit)

var {
  useState: useQM,
  useMemo: useQMM,
  useEffect: useQME,
  useLayoutEffect: useQML
} = React;

/* ══════════════════════════════════════════════════════
   v392：作答節奏統一（所有逐題型 Player 共用）

   為什麼要統一：本來延遲值有 650 / 700 / 900 / 1200 / 2800ms 五種，
   而且同樣是選擇題，type:'quiz' 有解說完全不自動跳、type:'fillblank' 卻 2.8 秒就跳，
   學生無從得知「為什麼有時候會自己跳、有時候要按」。新規則只有四條：
     1. 答對、沒解說 → 1000ms 自動跳。
        （原本 650ms 幾乎看不見：光是 .qm-feedback 的 feedback-rise 進場就 280ms，
          加上下一題 questionSwap 260ms，學生實際只看到約 0.37 秒的綠色回饋。）
     2. 答對、有解說 → 4000ms，且點畫面／按鍵就取消倒數。
        （v375 Alan 指定的 2800ms 由這條取代：實測 138 條 explain 長度中位數 50、
          最長 77 字元且全是整句英文，沒有一條能在 2.8 秒讀完。）
     3. 答對一律「同時」給一顆「下一題 →」按鈕——iPad 沒有鍵盤，
        原本只靠 Enter 快捷等於沒有出口。
     4. 最後一題不自動跳、答錯永遠不自動跳。

   ⚠ v375 踩過的坑：只要「答對也給按鈕」，就一定要在
   「按鈕 onClick」「鍵盤 Enter」「onBack」「unmount」四個入口都清 timer，
   少一個都會連跳兩題（或人已離開畫面，彩帶還在放）。
══════════════════════════════════════════════════════ */
/* v461（Alan：「答對跳下一題再快一點，原本是 10 分的話改成 13 分左右」）：
   ＝ 大約快三成 → 等待時間乘以 10/13。
   有解說的那一種本來就可以「點畫面直接跳過」，所以縮短不會來不及看。
   ⚠ 全站所有題型的自動前進都吃這兩個常數（選擇／填空／中翻英／圈選／分類…），
     改這裡就是全部一起改。 */
/* v549：再快 20%（Alan：「10 分變 12 分」）——倍率在 data.js 的 AUTO_NEXT_SPEED，全站只有一份。 */
var _qmFast = ms => window.autoNextMs ? window.autoNextMs(ms) : ms;
var QM_AUTO_MS_PLAIN = _qmFast(760); // 答對、沒有解說（原 760 → 633）
var QM_AUTO_MS_EXPLAIN = _qmFast(3050); // 答對、有解說（原 3050 → 2542，可被點畫面取消）
// 答錯的題目往後第幾題再考一次（對齊 components-flashcard.jsx 的 RETRY_GAP）
var QM_RETRY_GAP = 4;

/* 自動跳下一題：一定回傳「可取消」的 timer，並在 unmount 自動清掉。
   （沒有這層保護時，學生答對後 650ms 內按返回，timer 仍會跑完 → 人已回到單元列表，
     彩帶和 fanfare 卻在那裡放。） */
function useAutoNext() {
  var ref = React.useRef(null);
  var clearAuto = React.useCallback(() => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);
  var scheduleAuto = React.useCallback((fn, ms) => {
    clearAuto();
    if (!ms) return;
    ref.current = setTimeout(() => {
      ref.current = null;
      fn();
    }, ms);
  }, [clearAuto]);
  useQME(() => () => clearAuto(), []);
  return {
    scheduleAuto,
    clearAuto
  };
}

/* 答對後的提示文字。kind: 'plain'（1 秒後自動跳）／'explain'（4 秒，讀完可自己按）／
   其他（最後一題等不自動跳的情況）＝不顯示。按鈕永遠另外給，不靠這行。 */
function QmAutoHint({
  kind
}) {
  if (kind === 'plain') return /*#__PURE__*/React.createElement("div", {
    className: "qm-auto-next"
  }, "\u7B54\u5C0D\u4E86\uFF0C\u81EA\u52D5\u4E0B\u4E00\u984C\u2026");
  if (kind === 'explain') return /*#__PURE__*/React.createElement("div", {
    className: "qm-auto-next"
  }, "\u770B\u5B8C\u6309\u4E0B\u4E00\u984C \u2192");
  return null;
}

/* ── Count-up animation hook ─────────────────────────── */
function useCountUp(target, duration, delay) {
  duration = duration || 900;
  delay = delay || 0;
  var [val, setVal] = useQM(0);
  useQME(() => {
    if (!target) {
      setVal(0);
      return;
    }
    var rafId;
    var tid = setTimeout(() => {
      var t0 = null;
      var tick = now => {
        if (!t0) t0 = now;
        var pct = Math.min((now - t0) / duration, 1);
        var eased = pct === 1 ? 1 : 1 - Math.pow(2, -10 * pct); // easeOutExpo
        setVal(Math.round(eased * target));
        if (pct < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(tid);
      cancelAnimationFrame(rafId);
    };
  }, [target]);
  return val;
}

/* ── Helpers ─────────────────────────────────────────── */
function shuffleArr(arr) {
  var a = [...arr];
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate listening (hear word → pick the word) questions from word pairs.
// Capped so long word lists don't bloat the quiz.
function generateListeningQuestions(words, cap = 8) {
  if (!words || words.length < 4 || !window.speechSynthesis) return [];
  return shuffleArr(words).slice(0, cap).map(word => {
    var wrongEn = shuffleArr(words.filter(w => w.en !== word.en).map(w => w.en)).slice(0, 3);
    var opts = shuffleArr([word.en, ...wrongEn]);
    return {
      qtype: 'listening',
      word: word.en,
      q: `🔊 聽音選字：${word.en}`,
      // stored in wrongQuestions as-is; never displayed during the quiz
      hint: 'Listen and choose · 聽聽看，選出你聽到的字',
      options: opts,
      correct: opts.indexOf(word.en)
    };
  });
}

// Auto-generate MC questions from word pairs (both directions + listening, mixed)
function generateVocabQuestions(words) {
  if (!words || words.length < 2) return [];
  var qs = [];
  words.forEach(word => {
    var wrongZh = shuffleArr(words.filter(w => w.en !== word.en).map(w => w.zh)).slice(0, 3);
    var zhOpts = shuffleArr([word.zh, ...wrongZh]);
    qs.push({
      q: word.en,
      hint: 'Choose the correct meaning · 選出正確意思',
      options: zhOpts,
      correct: zhOpts.indexOf(word.zh)
    });
    var wrongEn = shuffleArr(words.filter(w => w.en !== word.en).map(w => w.en)).slice(0, 3);
    var enOpts = shuffleArr([word.en, ...wrongEn]);
    qs.push({
      q: word.zh,
      hint: 'Choose the English word · 選出英文單字',
      options: enOpts,
      correct: enOpts.indexOf(word.en)
    });
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
    var qs = (item.questions || []).filter(q => q.sentence && q.answer);
    if (qs.length < 2) return [];
    var allAnswers = qs.map(q => q.answer);
    var mapped = qs.map(q => {
      // Pick up to 3 wrong answers from sibling items
      var wrongPool = shuffleArr(allAnswers.filter(a => a !== q.answer));
      var wrongAnswers = wrongPool.slice(0, 3);
      if (wrongAnswers.length < 1) return null;
      var options = shuffleArr([q.answer, ...wrongAnswers]);
      var correct = options.indexOf(q.answer);
      // Strip leading number prefix; keep ___ visible as the blank
      var qText = (q.sentence || '').replace(/^[\(（]?\d+[\)）\.\s、：:]+\s*/, '');
      return {
        q: qText,
        hint: 'Fill in the blank · 選出正確答案',
        options,
        correct,
        explain: q.explain || ''
      };
    }).filter(Boolean);
    return shuffleArr(mapped);
  }
  if (item.type === 'quiz' && (item.questions || []).length > 0) {
    var _mapped = item.questions.filter(q => (q.options || []).length >= 2).map(q => {
      var savedCorrect = q.answer !== undefined ? q.answer : 0;
      var correctText = typeof savedCorrect === 'number' ? q.options[savedCorrect] : savedCorrect;
      var shuffled = shuffleArr([...q.options]); // shuffle options
      var newCorrect = shuffled.indexOf(correctText); // find new index
      // Strip leading question numbers like "1. " / "1) " / "（1）"
      var qText = (q.q || q.text || '').replace(/^[\(（]?\d+[\)）\.\s、：:]+\s*/, '');
      return {
        q: qText,
        hint: '',
        options: shuffled,
        correct: newCorrect,
        explain: q.explain || ''
      };
    });
    return shuffleArr(_mapped); // also shuffle question order
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
    var opts = (q.options || []).map(o => String(o || '').trim());
    return opts.filter(Boolean).length >= 2 && !!opts[q.answer != null ? q.answer : 0];
  });
}
function grSegs(item) {
  return (item && Array.isArray(item.grSegments) ? item.grSegments : []).filter(s => s && ((s.text || '').trim() || s.img && s.img.url || grValidQs(s).length > 0));
}
function grFinalQs(item) {
  // v281: 全部讀完後的整篇綜合題（item.grFinal）
  return grValidQs({
    questions: item && item.grFinal || []
  });
}
function grTotalQ(item) {
  return grSegs(item).reduce((n, s) => n + grValidQs(s).length, 0) + grFinalQs(item).length;
}

// All quiz-able items in a category
function getQuizItems(items) {
  return (items || []).filter(item => item.type === 'exam' && (item.sections || []).some(x => (x.parts || []).length) ||
  // v515 📄 模擬考卷
  item.type === 'lesson' ||
  // v383: 教學卡＝讀完＋小試身手，也是一件要完成的事
  item.type === 'flashcard' && (item.cards || []).length >= 1 ||
  // v233: 單字卡也是可完成的練習
  item.type === 'vocab-quiz' && (item.words || []).length >= 2 || item.type === 'fillblank' && (item.questions || []).length >= 2 || item.type === 'quiz' && (item.questions || []).length > 0 || item.type === 'writing-practice' && (item.linkedFlashcardId || (item.writingPrompts || []).some(p => p.word)) || item.type === 'type-answer' && (item.pairs || []).length >= 1 || item.type === 'spelling' && (item.spellWords || []).length >= 1 ||
  // v254: 聽寫
  item.type === 'short-answer' && (item.saQuestions || []).length >= 1 || item.type === 'syllable-div' && (item.sdWords || []).length >= 1 || item.type === 'word-sort' && (item.sortWords || []).length >= 1 && (item.sortCategories || []).length >= 2 || item.type === 'sentence-order' && (item.orderQuestions || []).some(q => (q.words || []).length >= 3) ||
  // v462 ①
  item.type === 'def-match' && (item.defPairs || []).filter(p => p && p.word && p.def).length >= 2 || item.type === 'reading-skill' && rsChipTotal(item) >= 2 ||
  // v386: 閱讀技巧
  item.type === 'essay' && !!(item.essayPrompt || '').trim() || item.type === 'story-mountain' && !!(item.smPrompt || item.smPassage || '') || item.type === 'cloze' && (item.passage || '').includes('[') || item.type === 'circle-answer' && (item.circleQuestions || []).some(q => q.sentence && (q.answer || (q.answers || []).length)) || item.type === 'upload' ||
  // v263: 上傳作業——單元本身就是任務，不需要題目
  /* v387（Alan：「分段閱讀不一定一定要有題目 才能新增」）：
     改成「有段落就能玩」——純閱讀（只有課文/掃描頁、沒有題目）本身就是一件任務，
     跟上面的 upload 同一個道理。有題目的行為完全不變。 */
  item.type === 'guided-reading' && (grSegs(item).length >= 1 || grTotalQ(item) >= 1));
}

// Generate flashcard data from any quiz-able item
function getFlashcardData(item) {
  if (!item) return [];
  if (item.type === 'vocab-quiz' && item.words) {
    return item.words.map(w => ({
      front: w.en,
      back: w.zh
    }));
  }
  if (item.type === 'fillblank' && item.questions) {
    return (item.questions || []).filter(q => q.sentence && q.answer).map(q => ({
      front: q.sentence,
      back: q.answer
    }));
  }
  if (item.type === 'quiz' && item.questions) {
    return (item.questions || []).filter(q => q.q && q.options && q.options.length > 0).map(q => ({
      front: q.q,
      back: q.options[q.answer !== undefined ? q.answer : 0]
    }));
  }
  return [];
}

// Progress persistence (localStorage)
// v257: key 按帳號隔離——共用電腦上換帳號，不會再看到（或繼承）別人的紀錄。
// 舊的全機共用 key（無後綴）從此不再讀寫；雲端 progress 才是每人的真資料。
var QM_KEY = 'alans-qm-v1';
function qmScope() {
  var u = window._currentUser;
  return u && u.uid ? ':u:' + u.uid : ':anon';
}
function loadQMProg() {
  try {
    return JSON.parse(localStorage.getItem(QM_KEY + qmScope()) || '{}');
  } catch (e) {
    return {};
  }
}
function saveQMProg(p) {
  try {
    localStorage.setItem(QM_KEY + qmScope(), JSON.stringify(p));
  } catch (e) {}
}
// v298: 側欄收合——學生自己控制、記住選擇（per-uid），不自動收
var QM_SIDEBAR_KEY = 'alans-qm-sidebar-collapsed-v1';
function loadSidebarCollapsed() {
  try {
    return localStorage.getItem(QM_SIDEBAR_KEY + qmScope()) === '1';
  } catch (e) {
    return false;
  }
}
function saveSidebarCollapsed(v) {
  try {
    localStorage.setItem(QM_SIDEBAR_KEY + qmScope(), v ? '1' : '0');
  } catch (e) {}
}

/* ── 續做（resume）：測驗做到一半離開，下次從同一題接著做 ── */
var QM_RESUME_KEY = 'alans-qm-resume-v1';
function loadResumeMap() {
  try {
    return JSON.parse(localStorage.getItem(QM_RESUME_KEY + qmScope()) || '{}');
  } catch (e) {
    return {};
  }
}
/* v392: 從「已經讀好的一張表」裡取續做紀錄。
   大廳（TodayTasks）一次要問十幾份作業，本來每一份都各跑一次 getResume
   ＝ 每次重繪都做「作業數 × 一次同步 localStorage 讀取＋JSON.parse」。
   驗證條件與 getResume 完全一致，只是 map 由呼叫端提供。 */
function resumeFromMap(map, progressKey, questionCount) {
  var r = map && map[progressKey];
  if (!r || !r.deck || r.deckPos == null) return null;
  if (r.deckPos < 1 || r.deckPos >= r.deck.length) return null;
  if (questionCount != null && r.uniqueTotal !== questionCount) return null; // 老師改過題目 → 作廢
  if (Date.now() - (r.ts || 0) > 7 * 24 * 60 * 60 * 1000) return null; // 一週後過期
  return r;
}
function getResume(progressKey, questionCount) {
  return resumeFromMap(loadResumeMap(), progressKey, questionCount);
}
function saveResume(progressKey, data) {
  try {
    var m = loadResumeMap();
    m[progressKey] = {
      ...data,
      ts: Date.now()
    };
    localStorage.setItem(QM_RESUME_KEY + qmScope(), JSON.stringify(m));
  } catch (e) {}
}
function clearResume(progressKey) {
  try {
    var m = loadResumeMap();
    if (m[progressKey] !== undefined) {
      delete m[progressKey];
      localStorage.setItem(QM_RESUME_KEY + qmScope(), JSON.stringify(m));
    }
  } catch (e) {}
}

// 星級精熟：用最佳分數決定 0~3 星，鼓勵回去重練拿滿星（驅動複習）
function starsFromScore(pct) {
  if (pct == null) return 0;
  if (pct >= 100) return 3;
  if (pct >= 80) return 2;
  if (pct >= 50) return 1;
  return 0;
}
function StarMastery({
  pct,
  size = 13
}) {
  var n = starsFromScore(pct);
  return /*#__PURE__*/React.createElement("span", {
    className: "qm-stars",
    style: {
      fontSize: size
    },
    title: `精熟度 ${n}/3 星`
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `qm-star${i < n ? ' on' : ''}`
  }, "\u2605")));
}

/* v272: 題型中文名＋短名——任務清單、側欄、作答頁三處用同一套稱呼，
   學生點「聽寫」進去，看到的每一層都叫「聽寫」 */
var QM_TYPE_ZH = {
  lesson: '教學',
  flashcard: '單字卡',
  spelling: '聽寫',
  fillblank: '填空',
  quiz: '測驗',
  'vocab-quiz': '單字測驗',
  'type-answer': '打字練習',
  'short-answer': '簡答',
  cloze: '克漏字',
  'circle-answer': '圈選',
  'syllable-div': '音節切分',
  'word-sort': '單字分類',
  'sentence-order': '排順序',
  essay: '寫作',
  'story-mountain': '故事山',
  'writing-practice': '造句',
  upload: '上傳作業',
  'guided-reading': '分段閱讀',
  'def-match': '配對連線',
  'reading-skill': '閱讀技巧',
  exam: '模擬考卷'
};
var QM_TYPE_ICO = {
  lesson: '📘',
  flashcard: '🃏',
  spelling: '🔊',
  fillblank: '✏️',
  quiz: '📝',
  'vocab-quiz': '📚',
  'type-answer': '⌨',
  'short-answer': '📖',
  cloze: '📝',
  'circle-answer': '⭕',
  'syllable-div': '✂️',
  'word-sort': '🗂',
  'sentence-order': '🧩',
  essay: '✍',
  'story-mountain': '🏔',
  'writing-practice': '✍',
  upload: '📎',
  'guided-reading': '📖',
  'def-match': '🔗',
  'reading-skill': '🔍',
  exam: '📄'
};
/* v273: 學習順序——先複習（單字卡）、再認讀（選擇/填空）、最後產出（拼寫/手寫）
   任務清單與學生側欄都按這個順序排；老師編輯模式維持原始順序 */
var QM_TYPE_ORDER = {
  lesson: -1,
  // v383: 先教再練——教學卡一定排在最前面
  flashcard: 0,
  'vocab-quiz': 1,
  quiz: 1,
  'def-match': 1.5,
  fillblank: 2,
  cloze: 3,
  'guided-reading': 3,
  'reading-skill': 3.5,
  'circle-answer': 4,
  spelling: 5,
  'type-answer': 5,
  'syllable-div': 5,
  'word-sort': 5,
  'sentence-order': 5,
  'short-answer': 6,
  'writing-practice': 6,
  essay: 7,
  'story-mountain': 7,
  upload: 8,
  exam: 9 // v515：考卷是整合性的，排最後
};
var qmTypeRank = t => QM_TYPE_ORDER[t] !== undefined ? QM_TYPE_ORDER[t] : 9;
/* v383: 單元可以自己指定順序（item.order）——同一組裡「先教 → 單句 → 短文 → 驗收」
   沒辦法只靠題型排（type-answer 的預設順位在 cloze 後面，驗收又跟單句同型別）。
   沒寫 order 的單元一律沿用題型預設，舊資料完全不受影響。 */
var qmItemRank = it => it && typeof it.order === 'number' ? it.order : qmTypeRank(it && it.type);

/* v274: 粗略音節拆解——「子音+母音群」切塊、多子音群首字歸前節
   （adapt→a·dapt、happen→hap·pen、survive→sur·vi·ve）。教學提示用，非嚴格音節。 */
function qmSyllables(word) {
  var w = String(word || '').trim();
  if (w.length <= 3 || /[^A-Za-z]/.test(w)) return [w];
  var chunks = w.match(/[^aeiouyAEIOUY]*[aeiouyAEIOUY]+/g) || [w];
  var used = chunks.join('').length;
  if (used < w.length) chunks[chunks.length - 1] += w.slice(used);
  for (var i = 1; i < chunks.length; i++) {
    if (/^[^aeiouyAEIOUY]{2,}/.test(chunks[i])) {
      chunks[i - 1] += chunks[i][0];
      chunks[i] = chunks[i].slice(1);
    }
  }
  return chunks.filter(Boolean);
}

/* v475：字義選擇的題目＝一段短文 ＋ 一個「這個字在這裡是什麼意思」。
   以前整串塞進 q，用 52px 的題目字級印出來＝一整屏的大字（Alan 截圖）。
   v475 之後的新單元有 q.passage；**v475 以前建好的沒有，就從 q 切出來**
   （最後一個空行之後是問題，前面是標題＋短文）——這樣舊單元不用重出也會變乾淨。 */
function qmSenseParts(q) {
  if (!q) return null;
  if (q.passage) {
    return {
      title: q.passageTitle || '',
      passage: q.passage,
      ask: q.ask || q.q || '',
      word: q.word || ''
    };
  }
  var t = String(q.q || '');
  var i = t.lastIndexOf('\n\n');
  if (i < 0) return null;
  var head = t.slice(0, i).trim(),
    ask = t.slice(i + 2).trim();
  if (!head || !ask) return null;
  // 只有「讀短文選字義」這一種長這樣；別的題型不要被誤判
  if (!/what does\s+(.+?)\s+mean/i.test(ask)) return null;
  var nl = head.indexOf('\n');
  var m = ask.match(/what does\s+(.+?)\s+mean/i);
  return {
    title: nl > 0 ? head.slice(0, nl).trim() : '',
    passage: nl > 0 ? head.slice(nl + 1).trim() : head,
    ask,
    word: m ? m[1].trim().replace(/^["'“”]|["'“”]$/g, '') : ''
  };
}
/* 把短文裡的目標字標起來（Alan：「螢光筆或是粗體之類的都可以」）。
   字會變形（pursue → pursued），所以用字首比對，至少抓得到。 */
function qmMarkWord(text, word) {
  var w = String(word || '').trim();
  if (!w) return text;
  var stem = w.length > 4 ? w.slice(0, w.length - 1) : w;
  var re = new RegExp('(' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*)', 'gi');
  var out = [];
  var last = 0,
    m2;
  while ((m2 = re.exec(text)) !== null) {
    if (m2.index > last) out.push(text.slice(last, m2.index));
    out.push(/*#__PURE__*/React.createElement("mark", {
      key: m2.index,
      className: "qm-sense-mark"
    }, m2[0]));
    last = m2.index + m2[0].length;
    if (re.lastIndex === m2.index) re.lastIndex++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : text;
}

/* v479：題幹裡把「要改的那一段」標出來（不是整句都標）。
   找不到就原樣顯示——寧可沒標，也不要把句子弄壞。 */
function taMarkWrong(text, part) {
  var t = String(text || ''),
    p = String(part || '').trim();
  if (!p) return t;
  var i = t.toLowerCase().indexOf(p.toLowerCase());
  if (i < 0) return t;
  return [t.slice(0, i), /*#__PURE__*/React.createElement("mark", {
    key: "m",
    className: "ta-wrong-mark"
  }, t.slice(i, i + p.length)), t.slice(i + p.length)];
}

/* 作業到期還有幾天——小組標頭與單元列用**同一份**（兩邊各算一次會走鐘） */
function qmDueText(dueDate) {
  if (!dueDate) return null;
  var d = new Date(dueDate + 'T00:00:00');
  var diff = Math.ceil((d - new Date()) / 86400000);
  return diff > 0 ? `${diff}天` : diff === 0 ? '今天到期' : diff >= -7 ? '已過期' : '已結束';
}

/* v545：把「測驗（1/4）測驗（2/4）…」收成一小組。
   ⭐ 判斷用的是**畫面上真的顯示的那個標籤**（qmShortLabel），不是 item.title——
     標籤才是學生看到的東西，而且同一個標題在不同組會顯示成不同的標籤。
   ⚠ 只有「同一個題型名稱、而且真的有（n/m）」才收；
     沒有編號的單元一律維持原樣，不要憑空多一層。 */
function qmSubGroups(list, groupName) {
  var out = [];
  (list || []).forEach(it => {
    var lab = qmShortLabel(it, groupName);
    var m = String(lab).match(/^(.*?)\s*[（(]\s*\d+\s*\/\s*\d+\s*[)）]\s*$/);
    var base = m ? m[1].trim() : '';
    var last = out[out.length - 1];
    if (base && last && last.base === base) {
      last.items.push(it);
      return;
    }
    out.push({
      base,
      items: [it]
    });
  });
  return out;
}
function qmShortLabel(item, groupName) {
  var title = item.title || '';
  if (groupName && title.toLowerCase().startsWith(String(groupName).toLowerCase())) {
    var rest = title.slice(String(groupName).length).replace(/^[\s\-–—_·．.。,，?？!！:：;；~～]+/, '').trim();
    if (rest) {
      if (!/[A-Za-z一-鿿]/.test(rest)) {
        var _tz = QM_TYPE_ZH[item.type];
        return _tz ? `${_tz} ${rest}` : rest;
      }
      return rest;
    }
    var tz = QM_TYPE_ZH[item.type];
    if (tz) return tz;
  }
  return title;
}

/* v266: 完成頁導航——各題型共用：「下一個任務 →」＋「回今天的任務」（沒有任務脈絡時退回 onBack）
   v338: 同一組（同篇文章）做完 → 顯示「接著做：XXX」並倒數自動進入，小朋友不用自己點。
         倒數期間碰畫面任何地方就取消，想留在成績頁看的孩子不會被拉走。 */
function QmDoneNavBtns({
  onBack,
  onBackToTasks,
  onNextTask,
  backLabel
}) {
  var label = onNextTask && onNextTask.label || '下一個任務 →';
  var canAuto = !!(onNextTask && onNextTask.auto);
  var [left, setLeft] = React.useState(6);
  var [stopped, setStopped] = React.useState(!canAuto);
  React.useEffect(() => {
    if (stopped || !canAuto) return;
    // 碰畫面（點、滑、按鍵）就取消自動接續
    var cancel = () => setStopped(true);
    window.addEventListener('pointerdown', cancel, {
      once: true
    });
    window.addEventListener('keydown', cancel, {
      once: true
    });
    window.addEventListener('wheel', cancel, {
      once: true,
      passive: true
    });
    return () => {
      window.removeEventListener('pointerdown', cancel);
      window.removeEventListener('keydown', cancel);
      window.removeEventListener('wheel', cancel);
    };
  }, [stopped, canAuto]);
  React.useEffect(() => {
    if (stopped || !canAuto) return;
    if (left <= 0) {
      onNextTask && onNextTask();
      return;
    }
    var t = setTimeout(() => setLeft(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, stopped, canAuto]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, onNextTask ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onNextTask
  }, label, !stopped && canAuto ? `（${left}）` : '') : null, onBackToTasks ? /*#__PURE__*/React.createElement("button", {
    className: 'qm-btn ' + (onNextTask ? 'secondary' : 'primary'),
    onClick: onBackToTasks
  }, "\u56DE\u4ECA\u5929\u7684\u4EFB\u52D9") : /*#__PURE__*/React.createElement("button", {
    className: 'qm-btn ' + (onNextTask ? 'secondary' : 'primary'),
    onClick: onBack
  }, backLabel || '← 返回'));
}
function getTodayInputValue(offsetDays = 0) {
  var d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function getQuizItemTotal(item) {
  if (!item) return 0;
  if (item.type === 'lesson') return Math.max(1, Array.isArray(item.steps) && item.steps.length ? item.steps.filter(x => x && x.kind !== 'learn').length : (item.check || []).length);
  if (item.type === 'flashcard') return (item.cards || []).length;
  if (item.type === 'type-answer') return (item.pairs || []).length;
  if (item.type === 'spelling') return (item.spellWords || []).length; // v254
  if (item.type === 'short-answer') return (item.saQuestions || []).length;
  if (item.type === 'syllable-div') return (item.sdWords || []).length;
  if (item.type === 'word-sort') return (item.sortWords || []).length;
  if (item.type === 'sentence-order') return (item.orderQuestions || []).length; // v462 ①
  if (item.type === 'def-match') return (item.defPairs || []).filter(p => p && p.word && p.def).length;
  if (item.type === 'reading-skill') return rsChipTotal(item); // v386
  if (item.type === 'guided-reading' && grTotalQ(item) === 0) return Math.max(1, grSegs(item).length); // v387: 純閱讀
  /* v515：考卷的「幾題」＝有幾個**自動計分**的大題。
     ⚠ 不要用小題總數——那會讓側欄寫「60 題」，看起來像做不完。 */
  /* v538 ⚠ 不計分的大題（開頭的心情與目標）不算一題。
     側欄的「幾題」與交卷時寫的 doneCount 要用**同一條**判斷，
     一邊算一邊不算就會變成 4/3 這種永遠做不完的進度。 */
  if (item.type === 'exam') return (item.sections || []).reduce((n, sc) => n + (sc.parts || []).filter(p => examCountsAsTask(p)).length, 0);
  if (item.type === 'essay') return 1;
  if (item.type === 'story-mountain') return 1;
  if (item.type === 'cloze') return ((item.passage || '').match(/\[[^\]]+\]/g) || []).length;
  if (item.type === 'circle-answer') return (item.circleQuestions || []).filter(q => q.sentence && (q.answer || (q.answers || []).length)).length;
  if (item.type === 'writing-practice') return 1;
  if (item.type === 'upload') return 1; // v263: 上傳作業＝一件事
  if (item.type === 'guided-reading') return grTotalQ(item); // v276: 分段閱讀＝全部段落的題數
  return getItemQuestions(item).length;
}
function getCategoryCountLabel(cat) {
  var title = `${cat?.title || ''} ${cat?.titleZh || ''}`.toLowerCase();
  return title.includes('word study') || title.includes('字根') || title.includes('字首') ? 'words' : 'questions';
}

/* 考卷裡「算一題」的大題：自動計分的，而且不是不計分的那種（心情與目標）。
   側欄的題數與交卷寫進度都走這一份。 */
function examCountsAsTask(p) {
  var K = (window.EXAM_KINDS || {})[p && p.kind];
  return !!K && !!K.auto && !K.noScore;
}
function saveQuizModeCompletion(progressKey, item, {
  doneCount = 1,
  score = null,
  total = 1,
  wrongQuestions = [],
  extra = null
} = {}) {
  var ts = Date.now();
  var localTotal = total || doneCount || 1;
  var localScore = typeof score === 'number' ? score : null;
  var prev = loadQMProg();
  // v255: 重做取「最好的一次」——考更好會更新，考差不會把好成績蓋掉
  var old = prev[progressKey];
  var newPct = localScore != null ? localScore / localTotal : null;
  var oldPct = old && old.score != null && old.total ? old.score / old.total : null;
  var keepOld = !!(old && oldPct != null && newPct != null && oldPct > newPct);
  // v311 (#21): 只有 80 分以上才算「完成」（done）。無分數型（單字卡、上傳作業 score=null）照算完成；
  // 未達 80 仍把分數/錯題記下來（best-of、「上次 X 分」、老師端看得到），只是 done 留空、不計入完成度/✓。
  var scorePct = localScore == null ? null : Math.round(localScore / localTotal * 100);
  var qualifies = scorePct == null || scorePct >= 80;
  prev[progressKey] = keepOld ? {
    ...old,
    ts
  } : {
    done: qualifies ? doneCount || localTotal : 0,
    score: localScore,
    total: localTotal,
    ts
  };
  saveQMProg(prev);
  if (window._bumpQmProgress) window._bumpQmProgress(); // 大廳（今天的任務）即時刷新——所有題型都會走這裡

  var u = window._currentUser;
  if (u && !keepOld && window.saveProgressItem) {
    var payload = {
      done: qualifies ? ts : null,
      score: scorePct,
      total: localTotal,
      itemTitle: item?.title || '',
      itemType: item?.type || ''
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

/* v361: 單字卡「學習／填空」模式完成 → 記進度（集點用：兩個都完成才 +10 星） */
function markFlashcardModeLocal(progressKey, mode) {
  if (!progressKey || !mode) return;
  var u = window._currentUser;
  if (window.isAdminUser && window.isAdminUser(u)) return; // 老師／管理者不計點
  var prev = loadQMProg();
  var cur = prev[progressKey] || {};
  if (cur.modes && cur.modes[mode]) return; // 已經記過就不重複寫
  prev[progressKey] = {
    ...cur,
    modes: {
      ...(cur.modes || {}),
      [mode]: true
    }
  };
  saveQMProg(prev);
  if (window._bumpQmProgress) window._bumpQmProgress();
  if (u && window.markFlashcardMode) {
    window.markFlashcardMode(u.uid, u.displayName || '', u.email || '', progressKey, mode);
  }
}

/* ── Visual config ───────────────────────────────────── */
var CAT_ICONS = {
  vocab: '📚',
  grammar: '✏️',
  word: '🔤',
  reading: '📖'
};
var CAT_IMG = {
  vocab: 'icon-vocab.webp',
  grammar: 'icon-grammar.webp',
  word: 'icon-word.webp',
  reading: 'icon-reading.webp'
};
var CAT_BG = {
  vocab: 'linear-gradient(135deg,#667eea,#764ba2)',
  grammar: 'linear-gradient(135deg,#f093fb,#f5576c)',
  word: 'linear-gradient(135deg,#4facfe,#00f2fe)',
  reading: 'linear-gradient(135deg,#43e97b,#38f9d7)'
};
/* 分類圖示：優先使用 AI 插畫圖，找不到時回退 emoji + 漸層 */
function CatIcon({
  catId,
  className
}) {
  var img = CAT_IMG[catId];
  if (img) {
    return /*#__PURE__*/React.createElement("div", {
      className: className
    }, /*#__PURE__*/React.createElement("img", {
      src: img,
      alt: "",
      className: "qm-cat-img"
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      background: CAT_BG[catId]
    }
  }, CAT_ICONS[catId]);
}

/* ══════════════════════════════════════════════════════
   MAIN SCREEN — 4 blocks
   editMode=true → show edit controls + week metadata editing
══════════════════════════════════════════════════════ */
function QuizModeBlocks({
  week,
  weekId,
  onEnterCat,
  editMode,
  onUpdateWeek,
  onAddItem,
  categories,
  cloudProg
}) {
  var activeCats = categories || window.CATEGORIES;
  // v265: 優先用 app.jsx 傳下來的「本機＋雲端合併」進度——只看本機會漏掉
  // 換裝置（或 v257 本機 key 換新）之前做完、只存在雲端的紀錄
  var qmProg = cloudProg || loadQMProg();
  var ET = window.EditableText;

  /* v505（Alan：「把可以先複習這個功能刪掉，不需要，小朋友要複習自己會回去；
     如果我要他們複習，我會再設置作業」）：v464 的「可以先複習 Week N」整組拿掉。
     空分類就老實寫「這週還沒有安排」，不要自作主張把學生帶回舊的一週。 */

  return /*#__PURE__*/React.createElement(React.Fragment, null, editMode && /*#__PURE__*/React.createElement("div", {
    className: "qm-week-banner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-week-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", null, weekId, week.dateRange ? ' · ' : ''), /*#__PURE__*/React.createElement(ET, {
    value: week.dateRange || '',
    placeholder: "May 17 \u2013 May 23",
    editMode: editMode,
    className: "mono",
    onChange: v => onUpdateWeek({
      dateRange: v
    })
  })), /*#__PURE__*/React.createElement("h1", {
    className: "qm-week-title"
  }, /*#__PURE__*/React.createElement(ET, {
    value: week.theme || week.label || '',
    placeholder: "Week theme\u2026",
    editMode: editMode,
    onChange: v => onUpdateWeek({
      theme: v
    })
  })), (week.subtitle || editMode) && /*#__PURE__*/React.createElement("p", {
    className: "qm-week-sub"
  }, /*#__PURE__*/React.createElement(ET, {
    value: week.subtitle || '',
    placeholder: "English subtitle\u2026",
    editMode: editMode,
    onChange: v => onUpdateWeek({
      subtitle: v
    })
  }))), editMode ? /*#__PURE__*/React.createElement("div", {
    className: "qm-blocks-head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "qm-blocks-title"
  }, "\u672C\u9031\u7DF4\u7FD2"), /*#__PURE__*/React.createElement("span", {
    className: "qm-blocks-hint"
  }, "\u7DE8\u8F2F\u5206\u985E\u5167\u5BB9")) : /*#__PURE__*/React.createElement("div", {
    className: "qm-blocks-head qm-blocks-head-view"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "qm-blocks-title"
  }, /^sl-/.test(weekId) ? '我的暑假練習' : '自由練習')), /*#__PURE__*/React.createElement("div", {
    className: "qm-blocks"
  }, activeCats.map(cat => {
    var allCatItems = (week.items || {})[cat.id] || [];
    var quizItems = getQuizItems(allCatItems);
    // For special item types (non-MC), use their own word/question count
    var total = quizItems.reduce((s, it) => s + getQuizItemTotal(it), 0);
    var done = quizItems.reduce((s, it) => {
      var p = qmProg[`${weekId}_${it.id}`];
      return s + (p ? Math.min(p.done || 0, getQuizItemTotal(it)) : 0);
    }, 0);
    var pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
    var catStars = quizItems.reduce((s, it) => {
      var p = qmProg[`${weekId}_${it.id}`];
      var sp = p && p.score != null && p.total ? Math.round(p.score / p.total * 100) : null; // v270
      return s + starsFromScore(sp);
    }, 0);
    var maxStars = quizItems.length * 3;
    var clickable = total > 0 || editMode;
    var countLabel = getCategoryCountLabel(cat);
    var BlockTag = editMode ? 'div' : 'button';
    var blockProps = editMode ? {} : {
      type: 'button',
      disabled: !clickable,
      'aria-label': total > 0 ? `${cat.titleZh || cat.title} ${cat.title}, ${quizItems.length} units, ${total} ${countLabel}, ${pct}% complete` : `${cat.titleZh || cat.title} ${cat.title}, coming soon`
    };
    return /*#__PURE__*/React.createElement(BlockTag, _extends({
      key: cat.id,
      className: `qm-block${!clickable ? ' empty' : ''}`,
      onClick: () => {
        if (clickable) onEnterCat(cat);
      }
    }, blockProps), /*#__PURE__*/React.createElement(CatIcon, {
      catId: cat.id,
      className: "qm-block-icon"
    }), /*#__PURE__*/React.createElement("div", {
      className: "qm-block-content"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-block-title"
    }, cat.titleZh || cat.title), cat.titleZh && /*#__PURE__*/React.createElement("div", {
      className: "qm-block-title-zh"
    }, cat.title), total > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "qm-block-count"
    }, (() => {
      // v311 (#21): 達 80 才算完成——看 .done，不看紀錄是否存在
      var doneUnits = quizItems.filter(it => {
        var p = qmProg[`${weekId}_${it.id}`];
        return p && p.done;
      }).length;
      return doneUnits >= quizItems.length ? '本週練習完成 ✓' : `完成 ${doneUnits} / ${quizItems.length}`;
    })()), /*#__PURE__*/React.createElement("div", {
      className: "qm-block-progress"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-progress-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-progress-fill",
      style: {
        width: pct + '%'
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "qm-pct"
    }, pct, "%")), !editMode && (() => {
      // 接下來要練的單元＋已練平均分（有才顯示）
      var nextItem = quizItems.find(it => {
        var p = qmProg[`${weekId}_${it.id}`];
        return !(p && p.done);
      });
      var scored = quizItems.map(it => qmProg[`${weekId}_${it.id}`]).filter(p => p && p.score != null && p.total > 0); // v270: 無分數不列入
      var avg = scored.length ? Math.round(scored.reduce((s, p) => s + p.score / p.total * 100, 0) / scored.length) : null;
      var parts = [];
      if (nextItem) parts.push(`接下來：${nextItem.title}`);
      if (avg != null) parts.push(`已練平均 ${avg} 分`);
      return parts.length ? /*#__PURE__*/React.createElement("div", {
        className: "qm-block-meta"
      }, parts.join(' · ')) : null;
    })()) : editMode ? /*#__PURE__*/React.createElement("div", {
      className: "qm-block-count"
    }, allCatItems.length, " items \xB7 no quiz yet") : /*#__PURE__*/React.createElement("div", {
      className: "qm-block-empty"
    }, /^sl-/.test(weekId) ? '這週沒有安排這類練習' : '即將開放 · 老師正在準備本週內容')), editMode ? /*#__PURE__*/React.createElement("button", {
      className: "qm-edit-add-btn",
      onClick: e => {
        e.stopPropagation();
        onAddItem(cat.id);
      },
      title: `Add item to ${cat.title}`
    }, "\uFF0B") : total > 0 ? /*#__PURE__*/React.createElement("div", {
      className: "qm-block-arrow"
    }, "\u203A") : null);
  })));
}

/* ── v253: 標題歸戶（與 TodayTasks v235 同法）——側欄「依文章分組」用 ── */
/* 歸戶的作法：把標題裡的「題型字」拿掉，剩下的就是「這是哪一篇文章」。
   ⚠ v403：這份清單原本停在早期的幾種題型，後來新增的（配對連線、克漏字、圈選、
     音節切分、故事山、分段閱讀、閱讀技巧、上傳作業、教學卡…）一個都沒補進來。
     結果就是：同一篇文章的「配對」被算成另一篇，自己落單在群組外面
     （Alan 圖片裡那一列孤零零的 "Living in the desert - we…" 就是它）。
     這裡照 QM_TYPE_ZH 的每一種題型補齊。
   ⚠ 順序很重要：長的要排在短的前面。全域取代是由左往右試，
     「配對」若排在「配對連線」前面，就會先吃掉「配對」、留下沒人認得的「連線」。
   ⚠ 拿掉之後只剩不到 3 個字的標題會被 qmGroupByArticle 判成「單張卡」平鋪，
     所以就算某個標題整個被吃光也不會亂分組。 */
var QM_TYPE_WORDS = /(模擬考卷|考卷|單字聽寫|單字練習|單字測驗|單字分類|字義選擇|短文填空|手寫練習|打字練習|閱讀理解|閱讀技巧|分段閱讀|配對連線|上傳作業|音節切分|音節切割|改寫句子|排順序|句型轉換|造句|互動教學|選擇題|簡答題|短答題|填空題|圈選題|克漏字|故事山|教學卡|單字卡|找出來|分一分|中翻英|聽寫|拼字|配對|連線|圈選|寫作|造句|填空|練習|測驗|教學|上傳|單字|文法|閱讀|quiz|flashcards?|matching|dictation|spelling|short answer|writing|reading|lesson|cloze|essay|test)/gi;
/* v400：週次 id 是「學期代碼-W週數」（2026-W16 → 2026、g4-2026F-W03 → g4-2026F）。
   v464：本來只寫在 TodayTasks 裡面，現在大廳的空分類也要用——同一個判斷只留一份。 */
function qmTermKey(id) {
  var m = String(id || '').match(/^(.*)-W\d{1,3}$/i);
  return m ? m[1] : null;
}
function qmGroupByArticle(items) {
  var keyOf = t => String(t || '').toLowerCase().replace(QM_TYPE_WORDS, '').replace(/[\s\-–—_·．.。,，()（）0-9０-９]+/g, '');
  // v254: 老師手動分組（item.group）優先；沒設才用標題自動歸戶
  var kOf = it => {
    var manual = String(it.group || '').trim();
    return manual ? 'm:' + manual.toLowerCase() : keyOf(it.title);
  };
  var map = new Map();
  (items || []).forEach(it => {
    var k = kOf(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  });
  var out = [];
  var seen = new Set();
  (items || []).forEach(it => {
    var k = kOf(it);
    if (seen.has(k)) return;
    seen.add(k);
    var arr = map.get(k);
    if (k.indexOf('m:') === 0) {
      // 手動組：永遠成組（就算只有 1 個），名字照老師打的
      out.push({
        key: k,
        name: String(arr[0].group || '').trim(),
        items: arr
      });
      return;
    }
    if (k.length < 3 || arr.length < 2) {
      arr.forEach(x => out.push({
        single: x
      }));
      return;
    }
    var name = arr[0].title || '';
    for (var x of arr) {
      var t = x.title || '';
      var i = 0;
      while (i < name.length && i < t.length && name[i] === t[i]) i++;
      name = name.slice(0, i);
    }
    name = name.replace(QM_TYPE_WORDS, '').replace(/[\s\-–—_·．.。,，()（）]+$/g, '').trim() || (arr[0].title || '').slice(0, 14);
    out.push({
      key: k,
      name,
      items: arr
    });
  });
  return out;
}

/* ══════════════════════════════════════════════════════
   CATEGORY VIEW — left sidebar + right quiz
   editMode=true → show all items (not just quiz-able), add/edit buttons
══════════════════════════════════════════════════════ */
function QuizModeCategoryView({
  cat,
  items,
  weekId,
  onBack,
  editMode,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  onReorderItems,
  openAssignFor,
  onAssignOpened,
  weekAllItems,
  onAutoLinkFlashcards,
  groupRes,
  onSaveGroupRes,
  weekChoices,
  onCopyToWeeks,
  onCopyGroupToWeeks,
  homework,
  onSetHomework,
  onSetHomeworkMany,
  onRegenGroup,
  onReviewGroup,
  onDeleteGroup,
  onRenameGroup,
  weekQuizItems,
  initialItemId,
  cloudProg,
  getNextTask,
  onOpenTask
}) {
  var [selectedItem, setSelectedItem] = useQM(null);
  var [phase, setPhase] = useQM('intro'); // 'intro' | 'flashcards' | 'quiz'
  var [flashItem, setFlashItem] = useQM(null); // flashcard item to review
  var [playerKey, setPlayerKey] = useQM(0);
  var [progVersion, setProgVersion] = useQM(0); // bumped after quiz completes → refreshes sidebar scores
  var [copyItem, setCopyItem] = useQM(null); // v294: 「沿用到其他週」的題目
  /* v477（Alan：「我出錯 week 了，我想整組調整到 week6，但沒有這個選項」）：
     本來只有「沿用」＝複製一份過去、原本那一週照樣留著。加上「搬過去」。
     ⚠ 搬只能搬到一個地方，所以切成搬的時候只保留最後點的那一週。 */
  var [copyMove, setCopyMove] = useQM(false);
  var [copySel, setCopySel] = useQM([]); // v294: 勾選的目標週 id
  var [dueEditFor, setDueEditFor] = useQM(null); // v306+: 正在編輯截止日的 item.id（老師端 inline 日期選擇）
  /* v454（Alan：「我只能一個一個去改日期…但我也希望可以一整包一起去改，因為這是一整包一起生成的」）
     整組操作：設／取消截止日、沿用到其他週（可順便在那一週也設成作業）。 */
  var [grpMenu, setGrpMenu] = useQM(null); // 打開選單的那一組（group key）
  var [grpDue, setGrpDue] = useQM(''); // 整組截止日輸入框
  var dueInputRef = React.useRef(null);
  var [sidebarHidden, setSidebarHidden] = useQM(() => loadSidebarCollapsed()); // v298: 學生自控側欄收合
  var toggleSidebar = () => setSidebarHidden(v => {
    var n = !v;
    saveSidebarCollapsed(n);
    return n;
  });
  var quizItems = useQMM(() => getQuizItems(items), [items]);
  // Edit mode: show ALL items so teacher can see & edit non-quiz types too
  var sidebarItems = editMode ? items || [] : quizItems;
  var explicitMainIds = useQMM(() => new Set((sidebarItems || []).filter(it => it?.mission === 'main' || it?.missionType === 'main' || it?.required === true || it?.isMain === true).map(it => it.id)), [sidebarItems]);
  var homeworkMainIds = useQMM(() => new Set(Object.keys(homework || {})), [homework]);
  var fallbackMainId = !editMode && explicitMainIds.size === 0 && homeworkMainIds.size === 0 ? sidebarItems[0]?.id : null;
  var selectItem = item => {
    setSelectedItem(item);
    setPhase('intro');
    setFlashItem(null);
    setPlayerKey(k => k + 1);
    /* v397（Alan：「捲下去點比較下面的單元，題目頁應該自動幫我捲上去」）
       側邊欄很長，捲到下面點一個單元時，右邊已經換成新題目了，
       但畫面還停在原本的捲動位置 → 學生要自己捲回去才看得到題目。
       v398（Alan：「還不夠頂端，大概只到 8/10」）：v397 只捲到「題目區的上緣」，
       上面的頁首那一段還留在畫面外。改成真的回到整頁最頂端（scrollY = 0），
       跟 app.jsx 的 scrollPageToTop 同一個標準。
       順便拿掉 requestAnimationFrame——v397 要等下一幀是因為它得先量「上緣在哪」，
       現在目標是絕對的 0，不必量任何東西，而 rAF 在被遮住／背景的分頁根本不會觸發。 */
    (() => {
      try {
        var area = document.querySelector('.qm-quiz-area');
        if (area && area.scrollTop) area.scrollTop = 0;
        if (window.scrollY <= 0) return;
        /* 收尾硬補一次的理由（實測）：
           1) 有些環境 behavior:'smooth' 根本不生效（測試瀏覽器就是，scrollTo 完全不動）；
           2) 新題目畫上去後版面高度會變，smooth 有時會停在半路。
           但使用者若在這半秒內自己動了滾輪／手指／方向鍵，就不要跟他搶。 */
        var userMoved = false;
        var cancel = () => {
          userMoved = true;
        };
        var evs = ['wheel', 'touchmove', 'keydown'];
        evs.forEach(ev => window.addEventListener(ev, cancel, {
          passive: true
        }));
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
        setTimeout(() => {
          try {
            if (!userMoved && window.scrollY > 0) window.scrollTo({
              top: 0,
              left: 0,
              behavior: 'auto'
            });
          } catch (e) {}
          evs.forEach(ev => window.removeEventListener(ev, cancel));
        }, 480);
      } catch (e) {}
    })();
  };
  var autoPickRef = React.useRef(false); // v510：這次的選取是「自動選的」還是人點的
  useQME(() => {
    if (editMode || selectedItem || sidebarItems.length === 0) return;
    // 從「今天的任務」點進來 → 直接打開那一個單元（這算「人點的」，要展開讓他看到自己在哪）
    var wanted = initialItemId && sidebarItems.find(it => it.id === initialItemId);
    if (wanted) {
      selectItem(wanted);
      return;
    }
    // v261: 題庫視角不自動選第一個單元——自動選會連帶展開它的分組，Alan 要「進來時全部收合」
    if (String(weekId || '').startsWith('sl')) return;
    // v306+: 手機直向自由練習——不自動選單元，讓學生落在「單元列表」而不是被鎖在某一個單元
    // v315: 放寬到 900 涵蓋 iPad 直式（一次一畫面流程，先看單元列表）
    if (!initialItemId && window.matchMedia && window.matchMedia('(max-width:900px)').matches) return;
    var firstMain = sidebarItems.find(it => explicitMainIds.has(it.id) || homeworkMainIds.has(it.id) || it.id === fallbackMainId);
    /* 🔴 v510（Alan：「側邊欄還是沒改」）：這一行就是原因。
       桌機進分類時會**自動**選第一個單元，而「選中就展開它所在的組」的規則
       緊接著把那一組打開——所以一進來永遠是展開的，跟 v505 改的預設值無關。
       （同一個坑 v261 在題庫視角就踩過，上面那行註解寫得清清楚楚：
         「自動選會連帶展開它的分組，Alan 要『進來時全部收合』」，
         我 v505 只看預設值沒看這裡。）
       做記號：自動選的不要展開分組；學生自己點、或從作業點進來的才展開。 */
    autoPickRef.current = true;
    selectItem(firstMain || sidebarItems[0]);
  }, [cat.id, editMode, sidebarItems.length, fallbackMainId]);

  // Re-read localStorage every time a quiz finishes (progVersion bumps)
  // v265: 優先用 app.jsx 的「本機＋雲端合併」進度——分類頁只看本機的話，
  // 換裝置（或本機 key 更新）前做完、只存在雲端的紀錄會顯示成未完成
  // eslint-disable-next-line react-hooks/exhaustive-deps
  var qmProg = useQMM(() => cloudProg || loadQMProg(), [progVersion, cloudProg]);
  var hasSelection = !!selectedItem;
  // v306+: 手機直向時，選了單元後需要一個「回單元列表」出口
  // v315: 放寬到 900——iPad 直式也走一次一畫面，選了單元收側欄後才有鈕可回列表
  var isMobileView = !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:900px)').matches);

  // v253: 老師視角（editMode 或 暑假題庫）——側欄依文章分組收合＋題庫學生濾鏡
  var isLibView = String(weekId || '').startsWith('sl');
  /* v403（Alan：「開學課程怎麼沒有 group 的功能？都要跟暑假一樣」）：
     分組本來只在「編輯模式」或「暑假題庫（sl-…）」才打開，學期的週次是攤平的一長串——
     同一篇文章的五個練習標題一模一樣（"Living in the desert - week1…" 被截斷五次），
     學生根本分不出哪個是單字卡、哪個是聽寫。
     打開之後學期週次一次拿到暑假那邊本來就有的三件事：
       ① 側欄依文章收合成一組，組內用短標題（單字卡／配對／練習1／聽寫）
       ② 做完一個自動接同組的下一個（nextInGroup 也是靠 grouped 才算得出來）
       ③ 每一組可以掛「參考資料」（影片／課文檔案／老師的話）——groupRes 本來就一直傳進來了
     ⚠ 分組本身完全不看身分：群組標頭裡的老師專用鈕（📎 參考資料、整組上下移）
       各自有 editMode 的判斷，學生看不到。
     ⚠ 沒有共同前綴、或同組只有 1 個的項目仍然是「單張卡」平鋪（qmGroupByArticle 的規則），
       所以只有一兩個項目的分類看起來跟以前一樣。 */
  var groupsView = true;
  // ⚠ v338 隱私修正：學生的暑假週次 id 也是 'sl-…' 開頭，isLibView 對學生同樣成立，
  //   導致「依學生篩選」的名字標籤（其他同學的名字）漏到學生端。
  //   發派濾鏡＝老師專用，一律另外用身分判斷；分組顯示（groupsView）維持給學生用。
  var isTeacherView = !!(window.isAdminUser && window.isAdminUser(window._currentUser));
  var libAdminView = isLibView && isTeacherView;
  var [openGroups, setOpenGroups] = useQM({});
  /* v545（Alan：「如果有題目類型有分 1234 之類的就再分組，不然全部展開也太長」）
     v542 之後一組可能有 4 份測驗、5 份字義選擇、4 篇短文……29 個單元攤開要捲很久。
     → 同一種題型的「（1/4）（2/4）…」收成一個小組，點一下才展開。 */
  var [openSubs, setOpenSubs] = useQM({});
  /* 選了另一個練習（例如從「下一個」跳過去）：之前**明確收合**的記錄清掉，
     讓新選的那份所在的小組自動打開。⚠ 只在「選的練習換了」才清——
     停在同一個練習時，使用者自己按的收合要算數。 */
  var selIdForSubs = selectedItem ? selectedItem.id : null;
  useQME(() => {
    setOpenSubs(x => {
      var keep = {};
      Object.keys(x).forEach(k => {
        if (x[k] === true) keep[k] = true;
      });
      return Object.keys(keep).length === Object.keys(x).length ? x : keep;
    });
  }, [selIdForSubs]);
  var [libMeta, setLibMeta] = useQM(null);
  var [stuFilter, setStuFilter] = useQM('all'); // 'all' | 'none' | email
  // v350: 直接在單元列指派學生（不必透過「暑假發派」頁，也不必設成作業）
  var [assignItem, setAssignItem] = useQM(null); // 正在指派的單元
  var [assignRoster, setAssignRoster] = useQM([]); // 全班名單（老師才訂閱）
  var [assignBusy, setAssignBusy] = useQM(false);
  // v367: 群組參考資料（影片／課文檔案／說明）
  var [resView, setResView] = useQM(null); // 學生看的
  var [resEdit, setResEdit] = useQM(null); // 老師編輯的

  // v339: 多位老師共用題庫——側欄可切「我的單元／全部」。
  // 非擁有者的老師預設只看自己的（不會被別人的題庫洗版），需要沿用時再切「全部」。
  var myEmail = String(window._currentUser && window._currentUser.email || '').toLowerCase();
  var isOwnerTeacher = !!(window.isOwnerUser && window.isOwnerUser(window._currentUser));
  var ownerOf = it => String(it.owner || '').toLowerCase(); // 舊資料沒 owner ＝ 擁有者的
  var hasOthersItems = useQMM(() => isTeacherView && sidebarItems.some(it => ownerOf(it) !== myEmail), [sidebarItems, myEmail, isTeacherView]);
  var [ownerFilter, setOwnerFilter] = useQM(isOwnerTeacher ? 'all' : 'mine'); // 'all' | 'mine'
  useQME(() => {
    if (!libAdminView || !window.subscribeSummerMeta) return; // 學生不訂閱＝不會拿到全班發派名單
    return window.subscribeSummerMeta(setLibMeta, () => {});
  }, [libAdminView]);
  // 指派用的全班名單（同樣只有老師訂閱）
  useQME(() => {
    if (!libAdminView || !window.subscribeRoster) return;
    return window.subscribeRoster(setAssignRoster, () => {});
  }, [libAdminView]);

  // 勾/取消勾一位學生 → 直接改暑假發派清單（單元就會出現在他的篩選底下）
  var toggleAssign = async (item, stu) => {
    if (!libSfx || !item) return;
    var email = String(stu.email || '').toLowerCase();
    setAssignBusy(true);
    try {
      var plan = ((libMeta || {}).students || {})[email] || {};
      var weeks = {
        ...(plan.weeks || {})
      };
      var cur = new Set(weeks[libSfx] || []);
      if (cur.has(item.id)) cur.delete(item.id);else cur.add(item.id);
      weeks[libSfx] = Array.from(cur);
      await window.saveSummerStudent(email, {
        ...plan,
        name: plan.name || stu.name || '',
        weeks
      });
    } catch (e) {/* 失敗就維持原狀，畫面會跟著 meta 訂閱回復 */}
    setAssignBusy(false);
  };
  var libSfx = isLibView ? String(weekId).split('-').pop() : null;
  var assignedOf = useQMM(() => {
    // itemId → Set(emails)（只看當前週）
    var m = new Map();
    if (!libAdminView || !libMeta) return m;
    Object.entries(libMeta.students || {}).forEach(([email, plan]) => {
      (((plan || {}).weeks || {})[libSfx] || []).forEach(id => {
        if (!m.has(id)) m.set(id, new Set());
        m.get(id).add(email);
      });
    });
    return m;
  }, [libAdminView, libMeta, libSfx, weekId]);
  var viewItems = useQMM(() => {
    // ① 先套「我的單元／全部」（只在老師端；學生永遠看全部＝老師派給他的）
    var base = sidebarItems;
    if (isTeacherView && ownerFilter === 'mine' && myEmail) {
      base = base.filter(it => ownerOf(it) === myEmail);
    }
    // ② 再套暑假發派濾鏡
    if (!libAdminView || stuFilter === 'all') return base;
    if (stuFilter === 'none') return base.filter(it => !assignedOf.has(it.id));
    return base.filter(it => assignedOf.has(it.id) && assignedOf.get(it.id).has(stuFilter));
  }, [sidebarItems, libAdminView, stuFilter, assignedOf, isTeacherView, ownerFilter, myEmail]);
  var grouped = useQMM(() => groupsView ? qmGroupByArticle(viewItems) : null, [groupsView, viewItems]);
  /* v477（Alan：「吉祥物可以再智能化一點，跟你的舉動互動」）：
     「再 1 個就整組完成」這件事只有這裡知道（要同時有這一組的單元與進度）。
     把「最接近完成的那一組還差幾個」寫給吉祥物——牠才講得出
     「只剩 1 個就整組完成了，會多拿星星喔！」這種真的跟你有關的話。
     ⚠ 只算學生端（編輯模式下老師不需要被鼓勵）。 */
  useQME(() => {
    if (editMode) return;
    try {
      var best = 0;
      (grouped || []).forEach(g => {
        var its = g && g.items || [];
        if (its.length < 3) return; // 跟整組獎金同一條線
        var left = its.filter(it => !(qmProg[`${weekId}_${it.id}`] || {}).done).length;
        if (left > 0 && (best === 0 || left < best)) best = left;
      });
      window.__mxCtx = Object.assign({}, window.__mxCtx, {
        groupLeft: best
      });
    } catch (e) {}
    return () => {
      try {
        window.__mxCtx = Object.assign({}, window.__mxCtx, {
          groupLeft: 0
        });
      } catch (e) {}
    };
  }, [grouped, qmProg, weekId, editMode]);
  /* v364: 分段閱讀可以綁「單字」分類的單字卡，而且可以設成「必須先練完學習模式」。
     這裡算出「擋住現在這篇文章的那份單字卡」——null＝沒擋（沒綁、沒設必須、或已經練完）。 */
  var fcGate = useQMM(() => {
    var it = selectedItem;
    if (!it || isTeacherView) return null; // 老師不擋
    if (it.type !== 'guided-reading' || !it.linkedFcRequired || !it.linkedFlashcardId) return null;
    var pool = weekAllItems && weekAllItems.length ? weekAllItems : items || [];
    var fc = pool.find(x => x.id === it.linkedFlashcardId && x.type === 'flashcard' && (x.cards || []).length > 0);
    if (!fc) return null; // 綁的卡被刪了就不要卡住學生
    var p = qmProg[`${weekId}_${fc.id}`];
    return p && p.modes && p.modes.learn ? null : fc; // 學習模式跑完就放行
  }, [selectedItem && selectedItem.id, qmProg, weekAllItems, items, weekId, isTeacherView]);

  /* v428：✏️ 出文法的練習都帶 requires（互動教學的 id）——學生沒學完就先鎖著。
     null＝沒擋（老師、沒設、教學被刪了、或已經學完）。 */
  var lessonOf = it => {
    if (!it || isTeacherView || !it.requires) return null;
    var pool = weekAllItems && weekAllItems.length ? weekAllItems : items || [];
    var ls = pool.find(x => x.id === it.requires && x.type === 'lesson');
    if (!ls) return null;
    var p = qmProg[`${weekId}_${ls.id}`];
    return p && p.done ? null : ls;
  };
  var lessonGate = useQMM(() => lessonOf(selectedItem), [selectedItem && selectedItem.id, qmProg, weekAllItems, items, weekId, isTeacherView]);

  /* ── v360: 排序（群組內互換單元／整組上下移）──────────────
     一律以「完整清單的 id 排列」送回去，即使畫面正在依學生篩選，也不會弄丟沒列到的單元。 */
  var fullIds = () => (sidebarItems || []).map(it => it.id);
  var swapItems = (idA, idB) => {
    if (!onReorderItems || !idA || !idB) return;
    var ids = fullIds();
    var i = ids.indexOf(idA),
      j = ids.indexOf(idB);
    if (i < 0 || j < 0) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onReorderItems(ids);
  };
  // 把 blockIds 整塊搬到 anchorId 的前面／後面
  var moveBlock = (blockIds, anchorId, placeAfter) => {
    if (!onReorderItems || !blockIds.length || !anchorId) return;
    var block = new Set(blockIds);
    var rest = fullIds().filter(id => !block.has(id));
    var at = rest.indexOf(anchorId);
    if (at < 0) return;
    if (placeAfter) at += 1;
    onReorderItems([...rest.slice(0, at), ...blockIds, ...rest.slice(at)]);
  };
  var entryIds = g => g.items ? g.items.map(x => x.id) : [g.single.id];
  var moveGroup = (gi, dir) => {
    if (!grouped) return;
    var target = grouped[gi + dir];
    if (!target) return;
    var tIds = entryIds(target);
    moveBlock(entryIds(grouped[gi]), dir < 0 ? tIds[0] : tIds[tIds.length - 1], dir > 0);
  };

  // v360: 新增單元存檔後，自動打開「指派給哪些學生」——一次可以勾多位
  useQME(() => {
    if (!openAssignFor || !libAdminView) return;
    var it = (sidebarItems || []).find(x => x.id === openAssignFor);
    if (!it) return;
    setAssignItem(it);
    if (onAssignOpened) onAssignOpened();
  }, [openAssignFor, sidebarItems.length, libAdminView]);
  /* 🔴 v505（Alan：「每次點開每個 item 都是被點開的狀態，不要這樣，預設縮起來，
       不然如果今天有很多題目那不就太滿了？之前被打開一旦跳出去一樣回到縮回去狀態」）
     本來 openGroups 是**只進不出**的：從作業點進某一課 → 那一組自動展開，
     退回清單時沒有人關掉它；再點下一課 → 又展開一組。
     一個下午做下來整個側欄就全開了，正是他看到的畫面。
     改兩件事：
       ① 手風琴——同一時間只有一組是開的（展開新的就關掉舊的）
       ② 換分類／換週次就全部收回去（＝他說的「跳出去就回到縮回去狀態」）
     ⚠ 自動展開「選中單元所在的組」要留著，否則從作業點進來會看不到自己在哪。 */
  useQME(() => {
    setOpenGroups({});
  }, [cat && cat.id, weekId]);
  useQME(() => {
    if (!grouped || !selectedItem) return;
    // v510：自動選的那一次不展開——不然「預設收起來」永遠看不到效果
    if (autoPickRef.current) {
      autoPickRef.current = false;
      return;
    }
    var g = grouped.find(x => x.items && x.items.some(it => it.id === selectedItem.id));
    if (g && !openGroups[g.key]) setOpenGroups({
      [g.key]: true
    });
  }, [selectedItem && selectedItem.id, grouped]);
  var filterStudents = useQMM(() => {
    if (!libAdminView || !libMeta) return [];
    return Object.entries(libMeta.students || {}).filter(([, plan]) => Object.values((plan || {}).weeks || {}).some(a => a && a.length)).map(([email, plan]) => {
      var m = String((plan || {}).name || '').match(/[A-Za-z]+/);
      return {
        email,
        name: m ? m[0] : email.split('@')[0]
      };
    });
  }, [libAdminView, libMeta]);
  var quizSwapKey = selectedItem ? `${selectedItem.id}-${phase}-${playerKey}` : 'empty';

  // v265: intro 的續做資訊（各題型用自己的題數驗證），與「重新開始」＝清紀錄直接進場
  var resumeFor = countFn => selectedItem ? (getResume(`${weekId}_${selectedItem.id}`, countFn(selectedItem)) || {}).deckPos || null : null;
  var restartFresh = () => {
    if (selectedItem) clearResume(`${weekId}_${selectedItem.id}`);
    setPlayerKey(k => k + 1);
    setPhase('quiz');
  };

  // v338: 同一組（同一篇文章／老師分的組）做完就接著下一個——小朋友不用回列表自己點。
  //       只挑「同組、排在後面、還沒完成」的第一個；整組做完就不再接續。
  var nextInGroup = useQMM(() => {
    if (editMode || !grouped || !selectedItem) return null;
    var g = grouped.find(x => x.items && x.items.some(it => it.id === selectedItem.id));
    if (!g || !g.items) return null; // 沒分組的單張卡不接續
    var idx = g.items.findIndex(it => it.id === selectedItem.id);
    if (idx < 0) return null;
    var nx = g.items.slice(idx + 1).find(it => {
      var p = qmProg[`${weekId}_${it.id}`];
      return !(p && p.done);
    });
    return nx ? {
      item: nx,
      groupName: g.name || ''
    } : null;
  }, [grouped, selectedItem && selectedItem.id, qmProg, weekId, editMode]);

  // v266: 完成頁導航——「回今天的任務」（作業項目）＋「下一個任務 →」（還有未完成作業時）
  var nextTaskTarget = !editMode && getNextTask && selectedItem && homework && homework[selectedItem.id] ? getNextTask(selectedItem.id) : null;
  // 同組接續優先（同一篇文章的練習一氣呵成），沒有才退回原本的「下一個作業」
  var onNextTask = nextInGroup ? () => selectItem(nextInGroup.item) : nextTaskTarget && onOpenTask ? () => onOpenTask(nextTaskTarget.cat, nextTaskTarget.itemId) : null;
  // 把「按鈕文字」與「要不要自動接續」掛在 function 上——所有題型都已經在傳 onNextTask，
  // 這樣不必再改十幾個呼叫點。只有同組接續才自動（一般的下一個作業維持手動）。
  if (onNextTask && nextInGroup) {
    onNextTask.label = `接著做：${qmShortLabel(nextInGroup.item, nextInGroup.groupName)} →`;
    onNextTask.auto = true;
  }
  var onBackToTasksShared = !editMode && homework && selectedItem && homework[selectedItem.id] ? onBack : null;

  // v272: 選中單元後，側欄自動捲到那張卡（從任務點進來時卡可能在列表下方）
  useQME(() => {
    if (!selectedItem) return;
    var el = document.querySelector('.qm-unit-row.active');
    if (el && el.scrollIntoView) el.scrollIntoView({
      block: 'nearest'
    });
  }, [selectedItem && selectedItem.id]);

  // v266: 同分類跳下一題——initialItemId 變了就切換單元（跨分類靠 remount 的 mount effect）
  useQME(() => {
    if (!initialItemId) return;
    var wanted = sidebarItems.find(it => it.id === initialItemId);
    if (wanted && (!selectedItem || selectedItem.id !== wanted.id)) selectItem(wanted);
  }, [initialItemId]);
  return /*#__PURE__*/React.createElement("div", {
    className: `qm-cat-view qm-cat-enter${hasSelection ? ' has-selection' : ''}${sidebarHidden ? ' sidebar-hidden' : ''}`
  }, !editMode && (sidebarHidden || isMobileView && hasSelection) && /*#__PURE__*/React.createElement("button", {
    className: "qm-sidebar-reopen",
    onClick: () => {
      if (sidebarHidden) {
        toggleSidebar();
      } else {
        setSelectedItem(null);
      }
    },
    title: "\u5C55\u958B\u55AE\u5143\u5217\u8868"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "list",
    size: 15
  }), " \u55AE\u5143\u5217\u8868"), /*#__PURE__*/React.createElement("div", {
    className: "qm-sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-sidebar-top"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-sidebar-back",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "arrow-left",
    size: 14
  }), " \u8FD4\u56DE\u5927\u5EF3"), !editMode && /*#__PURE__*/React.createElement("button", {
    className: "qm-sidebar-collapse",
    onClick: toggleSidebar,
    title: "\u6536\u5408\u55AE\u5143\u5217\u8868\uFF08\u5C08\u5FC3\u4F5C\u7B54\uFF09",
    "aria-label": "\u6536\u5408\u55AE\u5143\u5217\u8868"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "arrow-left",
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    className: "qm-collapse-lab"
  }, "\u6536\u5408"))), /*#__PURE__*/React.createElement("div", {
    className: "qm-sidebar-cat"
  }, /*#__PURE__*/React.createElement(CatIcon, {
    catId: cat.id,
    className: "qm-sidebar-cat-icon"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "qm-sidebar-cat-name"
  }, cat.titleZh || cat.title), cat.titleZh && /*#__PURE__*/React.createElement("div", {
    className: "qm-sidebar-cat-zh"
  }, cat.title))), !editMode && quizItems.length > 0 && (() => {
    var doneN = quizItems.filter(it => {
      var p = qmProg[`${weekId}_${it.id}`];
      return p && p.done;
    }).length; // v311(#21): 達 80 才算完成
    var pct = Math.round(doneN / quizItems.length * 100);
    return /*#__PURE__*/React.createElement("div", {
      className: "qm-sidebar-prog",
      "aria-label": `本分類完成 ${doneN} / ${quizItems.length}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-sidebar-prog-bar"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: pct + '%'
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "qm-sidebar-prog-lbl"
    }, doneN === quizItems.length ? '✓ 全部完成' : `完成 ${doneN} / ${quizItems.length}`));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "qm-unit-list"
  }, isTeacherView && hasOthersItems && /*#__PURE__*/React.createElement("div", {
    className: "qm-ownerfilter",
    "aria-label": "\u4F9D\u5EFA\u7ACB\u8005\u7BE9\u9078"
  }, /*#__PURE__*/React.createElement("button", {
    className: ownerFilter === 'mine' ? 'on' : '',
    onClick: () => setOwnerFilter('mine')
  }, "\u6211\u7684\u55AE\u5143"), /*#__PURE__*/React.createElement("button", {
    className: ownerFilter === 'all' ? 'on' : '',
    onClick: () => setOwnerFilter('all')
  }, "\u5168\u90E8\uFF08\u5171\u7528\u984C\u5EAB\uFF09")), libAdminView && filterStudents.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "qm-stufilter",
    "aria-label": "\u4F9D\u5B78\u751F\u7BE9\u9078"
  }, /*#__PURE__*/React.createElement("button", {
    className: stuFilter === 'all' ? 'on' : '',
    onClick: () => setStuFilter('all')
  }, "\u5168\u90E8"), /*#__PURE__*/React.createElement("button", {
    className: stuFilter === 'none' ? 'on' : '',
    onClick: () => setStuFilter('none')
  }, "\u672A\u767C\u6D3E"), filterStudents.map(f => /*#__PURE__*/React.createElement("button", {
    key: f.email,
    className: stuFilter === f.email ? 'on' : '',
    onClick: () => setStuFilter(stuFilter === f.email ? 'all' : f.email)
  }, f.name))), editMode && onAutoLinkFlashcards && (viewItems || []).some(it => it.type === 'guided-reading') && /*#__PURE__*/React.createElement("button", {
    className: "qm-autolink-btn",
    onClick: onAutoLinkFlashcards,
    title: "\u4F9D\u55AE\u5143\u540D\u7A31\uFF08Unit 21\u3001Unit 22\u2026\uFF09\u628A\u6587\u7AE0\u8DDF\u540C\u540D\u7684\u55AE\u5B57\u5361\u81EA\u52D5\u7D81\u5728\u4E00\u8D77"
  }, "\u26A1 \u81EA\u52D5\u914D\u5C0D\u55AE\u5B57\u5361\uFF08\u4F9D Unit \u540D\u7A31\uFF09"), editMode && (() => {
    var forStu = libAdminView && stuFilter !== 'all' && stuFilter !== 'none' ? filterStudents.find(f => f.email === stuFilter) || {
      email: stuFilter,
      name: String(stuFilter).split('@')[0]
    } : null;
    return /*#__PURE__*/React.createElement("button", {
      className: `qm-unit-add-btn${forStu ? ' for-student' : ''}`,
      onClick: () => onAddItem(cat.id, forStu ? forStu.email : null, Array.from(new Set((viewItems || []).map(it => String(it.group || '').trim()).filter(Boolean)))),
      title: forStu ? `新題目會直接指派給 ${forStu.name}` : '新增一個單元'
    }, /*#__PURE__*/React.createElement(window.Icon, {
      name: "plus",
      size: 14
    }), " ", forStu ? `出新題目給 ${forStu.name}` : '出新題目 · Add item');
  })(), viewItems.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "qm-unit-empty"
  }, editMode ? 'No items yet. Click "+ Add item" above!' : 'No quiz items yet.\nAsk your teacher to add some!'), (() => {
    var renderUnitRow = (item, groupName, gctx) => {
      var progKey = `${weekId}_${item.id}`;
      var prog = qmProg[progKey];
      var totalQ = getItemQuestions(item).length;
      var scorePct = prog && prog.score != null ? Math.round(prog.score / prog.total * 100) : null; // 單字卡完成無分數 → 不顯示 %
      var isDone = !!(prog && prog.done); // v311(#21): 達 80 才算完成（未達 80 仍顯示上次分數，但不打勾）
      var isActive = selectedItem?.id === item.id;
      var lockLs = !editMode ? lessonOf(item) : null; // v428：教學還沒學完 → 🔒
      var isWriting = item.type === 'writing-practice';
      var isTypeAnswer = item.type === 'type-answer';
      var isSpelling = item.type === 'spelling'; // v254
      var isShortAnswer = item.type === 'short-answer';
      var isGuided = item.type === 'guided-reading'; // v276
      var isSyllableDiv = item.type === 'syllable-div';
      var isWordSort = item.type === 'word-sort';
      var isSentOrder = item.type === 'sentence-order';
      var isExam = item.type === 'exam'; // v515 📄 模擬考卷   // v462 ①
      var isEssay = item.type === 'essay';
      var isStoryMtn = item.type === 'story-mountain';
      var isCloze = item.type === 'cloze';
      var isCircle = item.type === 'circle-answer';
      var isFlashcard = item.type === 'flashcard';
      var isUpload = item.type === 'upload'; // v263
      var isDefMatch = item.type === 'def-match'; // v366
      var isLesson = item.type === 'lesson'; // v386: v383 漏掉這一行 → 教學卡顯示 0 題、整列變灰點不進去
      var isReadSkill = item.type === 'reading-skill'; // v386
      var hasQuiz = totalQ > 0 || isWriting || isTypeAnswer || isSpelling || isShortAnswer || isGuided && (grSegs(item).length > 0 || grTotalQ(item) > 0) || isSyllableDiv || isWordSort || isSentOrder || isExam || isEssay || isStoryMtn || isCloze || isCircle || isUpload || isDefMatch || isLesson || isReadSkill || isFlashcard && (item.cards || []).length > 0;
      var hw = (homework || {})[item.id]; // { dueDate }
      var isMainMission = !editMode && (explicitMainIds.has(item.id) || homeworkMainIds.has(item.id) || item.id === fallbackMainId);
      var dueLabel = hw?.dueDate ? qmDueText(hw.dueDate) === '已結束' ? '已結束' : `📌 ${qmDueText(hw.dueDate)}` // v266
      : null;

      // v390: 學生端整列改成 <button>，鍵盤才進得去（老師端維持 div——裡面有巢狀按鈕）
      var RowTag = editMode ? 'div' : 'button';
      return /*#__PURE__*/React.createElement(RowTag, _extends({
        key: item.id,
        className: `qm-unit-row${isActive ? ' active' : ''}${isDone ? ' done' : ''}${!hasQuiz && !editMode ? ' disabled' : ''}${lockLs ? ' gnl-locked' : ''}`,
        onClick: () => (hasQuiz || editMode) && selectItem(item)
      }, editMode ? {} : {
        type: 'button',
        disabled: !hasQuiz
      }), /*#__PURE__*/React.createElement("div", {
        className: "qm-unit-row-info"
      }, /*#__PURE__*/React.createElement("div", {
        className: "qm-unit-row-title"
      }, !editMode && groupName ? qmShortLabel(item, groupName) : item.title, lockLs && /*#__PURE__*/React.createElement("span", {
        className: "gnl-lock-badge"
      }, "\uD83D\uDD12 \u5148\u5B78\u4E00\u4E0B"), dueLabel && !editMode && /*#__PURE__*/React.createElement("span", {
        className: `qm-hw-badge${isDone ? ' done' : ''}${dueLabel === '已結束' ? ' ended' : ''}`
      }, isDone ? '✓ 作業完成' : dueLabel)), /*#__PURE__*/React.createElement("div", {
        className: "qm-unit-row-meta"
      }, editMode ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "qm-type-badge"
      }, item.type, (() => {
        var n = totalQ || getQuizItemTotal(item);
        return n > 0 ? ` · ${n}q` : '';
      })()), getQuizItems([item]).length === 0 && /*#__PURE__*/React.createElement("span", {
        className: "qm-empty-badge",
        title: "\u9019\u500B\u55AE\u5143\u9084\u6C92\u6709\u984C\u76EE\uFF0C\u5B78\u751F\u9801\u4E0D\u6703\u986F\u793A\u3002\u9EDE\u925B\u7B46\u9032\u53BB\u65B0\u589E\u984C\u76EE\u3002"
      }, "\u26A0 \u6C92\u6709\u984C\u76EE \xB7 \u5B78\u751F\u770B\u4E0D\u5230")) : /*#__PURE__*/React.createElement(React.Fragment, null, isFlashcard ? `🃏 ${(item.cards || []).length} 張單字卡` : isUpload ? '📎 拍照上傳作業' : isGuided ? grTotalQ(item) ? `📖 ${grSegs(item).length} 段 · ${grTotalQ(item)} 題` : `📖 ${grSegs(item).length} 段 · 純閱讀` : isStoryMtn ? '🏔 故事山寫作' : isEssay ? '✍ 意見寫作' : isWriting ? `✍ ${getWritingPracticePrompts(item, items || []).length} 個題目` : isTypeAnswer ? item.variant === 'translate' ? `🔤 ${(item.pairs || []).length} 題中翻英` : item.variant === 'fill' ? `✏️ ${(item.pairs || []).length} 題填空` : item.variant === 'rewrite' ? `✍️ ${(item.pairs || []).length} 題改寫` : item.variant === 'word' ? `🖊 ${(item.pairs || []).length} 題改成正確的` : item.variant === 'transform' ? `🔄 ${(item.pairs || []).length} 題句型轉換` : `⌨ ${(item.pairs || []).length} 個單字` : isSpelling ? `🔊 ${(item.spellWords || []).length} 個聽寫` : isShortAnswer ? `📖 ${(item.saQuestions || []).length} 題` : isSyllableDiv ? `✂️ ${(item.sdWords || []).length} 個單字` : isWordSort ? `🗂 ${(item.sortWords || []).length} 個單字` : isExam ? `📄 ${window.examTotals ? window.examTotals(item).total : 0} 分 · ${(item.sections || []).length} 大題` : isSentOrder ? `🧩 ${(item.orderQuestions || []).length} 句排順序` : isCloze ? `📝 ${((item.passage || '').match(/\[[^\]]+\]/g) || []).length} 格` : isCircle ? `⭕ ${(item.circleQuestions || []).length} 題` : isDefMatch ? `🔗 ${getQuizItemTotal(item)} 組配對` : isLesson ? Array.isArray(item.steps) && item.steps.length ? `📘 互動教學 · ${item.steps.length} 步` : `📘 先教再練 · ${(item.check || []).length} 題小試身手` : isReadSkill ? `🔍 ${rsBlocks(item).length} 種技巧 · ${rsChipTotal(item)} 張卡` : `${totalQ} 題`, scorePct !== null && !isWriting && /*#__PURE__*/React.createElement("span", {
        className: "qm-unit-score-badge"
      }, scorePct, "%"), scorePct !== null && !isWriting && /*#__PURE__*/React.createElement(StarMastery, {
        pct: scorePct
      })))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          flexShrink: 0,
          position: 'relative'
        }
      }, editMode ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "qm-unit-move-btns"
      }, /*#__PURE__*/React.createElement("button", {
        className: "qm-unit-move-btn",
        onClick: e => {
          e.stopPropagation();
          if (gctx) swapItems(item.id, gctx.list[gctx.idx - 1].id);else if (onMoveItem) onMoveItem(item.id, -1);
        },
        title: gctx ? '跟上面那個單元交換' : 'Move up',
        disabled: gctx ? gctx.idx === 0 : sidebarItems.indexOf(item) === 0
      }, "\u25B2"), /*#__PURE__*/React.createElement("button", {
        className: "qm-unit-move-btn",
        onClick: e => {
          e.stopPropagation();
          if (gctx) swapItems(item.id, gctx.list[gctx.idx + 1].id);else if (onMoveItem) onMoveItem(item.id, 1);
        },
        title: gctx ? '跟下面那個單元交換' : 'Move down',
        disabled: gctx ? gctx.idx === gctx.list.length - 1 : sidebarItems.indexOf(item) === sidebarItems.length - 1
      }, "\u25BC")), /*#__PURE__*/React.createElement("button", {
        className: `qm-unit-hw-btn${hw ? ' active' : ''}`,
        onClick: e => {
          e.stopPropagation();
          setDueEditFor(dueEditFor === item.id ? null : item.id);
        },
        title: hw ? `作業: ${hw.dueDate}` : '設為作業'
      }, "\uD83D\uDCCC"), dueEditFor === item.id && /*#__PURE__*/React.createElement("div", {
        className: "qm-due-popover",
        onClick: e => e.stopPropagation()
      }, /*#__PURE__*/React.createElement("div", {
        className: "qm-due-popover-label"
      }, "\u4F5C\u696D\u622A\u6B62\u65E5"), /*#__PURE__*/React.createElement("input", {
        type: "date",
        className: "qm-due-input",
        ref: dueInputRef,
        defaultValue: hw?.dueDate || getTodayInputValue(7),
        min: getTodayInputValue(0),
        onClick: e => e.stopPropagation()
      }), /*#__PURE__*/React.createElement("div", {
        className: "qm-due-actions"
      }, /*#__PURE__*/React.createElement("button", {
        className: "qm-due-save",
        onClick: e => {
          e.stopPropagation();
          var v = dueInputRef.current ? dueInputRef.current.value : '';
          if (/^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + 'T00:00:00'))) {
            onSetHomework(item.id, {
              dueDate: v
            });
            setDueEditFor(null);
          }
        }
      }, "\u5132\u5B58"), /*#__PURE__*/React.createElement("button", {
        className: "qm-due-cancel",
        onClick: e => {
          e.stopPropagation();
          setDueEditFor(null);
        }
      }, "\u53D6\u6D88"), hw && /*#__PURE__*/React.createElement("button", {
        className: "qm-due-remove",
        onClick: e => {
          e.stopPropagation();
          onSetHomework(item.id, null);
          setDueEditFor(null);
        }
      }, "\u53D6\u6D88\u4F5C\u696D"))), libAdminView && /*#__PURE__*/React.createElement("button", {
        className: "qm-unit-assign-btn",
        onClick: e => {
          e.stopPropagation();
          setAssignItem(item);
        },
        title: "\u6307\u6D3E\u7D66\u54EA\u4E9B\u5B78\u751F"
      }, "\uD83D\uDC64", (assignedOf.get(item.id) || new Set()).size > 0 && /*#__PURE__*/React.createElement("b", null, (assignedOf.get(item.id) || new Set()).size)), onCopyToWeeks && (weekChoices || []).length > 0 && /*#__PURE__*/React.createElement("button", {
        className: "qm-unit-copy-btn",
        onClick: e => {
          e.stopPropagation();
          setCopySel([]);
          setCopyItem(item);
        },
        title: "\u6CBF\u7528\u5230\u5176\u4ED6\u9031"
      }, /*#__PURE__*/React.createElement(window.Icon, {
        name: "copy",
        size: 12
      })), /*#__PURE__*/React.createElement("button", {
        className: "qm-unit-edit-btn",
        onClick: e => {
          e.stopPropagation();
          onEditItem(item);
        },
        title: "Edit item"
      }, /*#__PURE__*/React.createElement(window.Icon, {
        name: "edit",
        size: 12
      })), /*#__PURE__*/React.createElement("button", {
        className: "qm-unit-del-btn",
        onClick: e => {
          e.stopPropagation();
          if (confirm(`Delete "${item.title}"?`)) onDeleteItem(item.id);
        },
        title: "Delete item"
      }, /*#__PURE__*/React.createElement(window.Icon, {
        name: "trash",
        size: 12
      }))) : /*#__PURE__*/React.createElement("span", {
        className: `qm-unit-row-status${isDone ? ' done' : ''}`
      }, isDone ? '✓' : hasQuiz ? '›' : '')));
    };
    if (!grouped) return viewItems.map(it => renderUnitRow(it));
    return grouped.map((g, gi) => g.items ? /*#__PURE__*/React.createElement("div", {
      className: `qm-ugroup${openGroups[g.key] ? ' open' : ''}`,
      key: g.key || gi
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-ugroup-headrow"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-ugroup-head",
      onClick: () => setOpenGroups(o => o[g.key] ? {} : {
        [g.key]: true
      }),
      "aria-expanded": !!openGroups[g.key]
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-ugroup-chev"
    }, openGroups[g.key] ? '▾' : '▸'), /*#__PURE__*/React.createElement("span", {
      className: "qm-ugroup-name"
    }, g.name), /*#__PURE__*/React.createElement("span", {
      className: "qm-ugroup-count"
    }, g.items.length)), editMode && onSaveGroupRes && /*#__PURE__*/React.createElement("button", {
      className: "qm-ugroup-res",
      title: "\u9019\u500B\u7FA4\u7D44\u7684\u53C3\u8003\u8CC7\u6599\uFF08\u5F71\u7247\uFF0F\u8AB2\u6587\uFF09",
      onClick: e => {
        e.stopPropagation();
        setResEdit(g.name);
      }
    }, "\uD83D\uDCCE", (groupRes || {})[`${cat.id}::${g.name}`] ? /*#__PURE__*/React.createElement("i", null) : null), editMode && /*#__PURE__*/React.createElement("button", {
      className: 'qm-ugroup-more' + (grpMenu === g.key ? ' on' : ''),
      title: "\u6574\u7D44\u4E00\u8D77\u6539\uFF1A\u622A\u6B62\u65E5\u3001\u6CBF\u7528\u5230\u5176\u4ED6\u9031\u3001\u518D\u51FA\u4E00\u4EFD\u984C\u76EE",
      onClick: e => {
        e.stopPropagation();
        setGrpMenu(k => k === g.key ? null : g.key);
        setGrpDue('');
      }
    }, "\u22EF \u6574\u7D44"), editMode && onReorderItems && /*#__PURE__*/React.createElement("div", {
      className: "qm-ugroup-move"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-unit-move-btn",
      title: "\u6574\u7D44\u5F80\u4E0A\u79FB",
      onClick: e => {
        e.stopPropagation();
        moveGroup(gi, -1);
      },
      disabled: gi === 0
    }, "\u25B2"), /*#__PURE__*/React.createElement("button", {
      className: "qm-unit-move-btn",
      title: "\u6574\u7D44\u5F80\u4E0B\u79FB",
      onClick: e => {
        e.stopPropagation();
        moveGroup(gi, 1);
      },
      disabled: gi === grouped.length - 1
    }, "\u25BC"))), editMode && grpMenu === g.key && /*#__PURE__*/React.createElement("div", {
      className: "qm-grp-menu",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-grp-menu-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-grp-menu-lab"
    }, "\uD83D\uDCCC \u9019\u4E00\u7D44 ", g.items.length, " \u500B\u55AE\u5143\u7684\u622A\u6B62\u65E5"), /*#__PURE__*/React.createElement("input", {
      type: "date",
      className: "qm-grp-date",
      value: grpDue,
      onChange: e => setGrpDue(e.target.value)
    }), /*#__PURE__*/React.createElement("button", {
      className: "qm-grp-go",
      disabled: !grpDue,
      onClick: () => {
        onSetHomeworkMany(g.items.map(it => it.id), {
          dueDate: grpDue
        });
        setGrpMenu(null);
      }
    }, "\u6574\u7D44\u8A2D\u70BA\u4F5C\u696D"), /*#__PURE__*/React.createElement("button", {
      className: "qm-grp-ghost",
      onClick: () => {
        onSetHomeworkMany(g.items.map(it => it.id), null);
        setGrpMenu(null);
      }
    }, "\u6574\u7D44\u53D6\u6D88\u4F5C\u696D")), /*#__PURE__*/React.createElement("div", {
      className: "qm-grp-menu-row"
    }, onRenameGroup && /*#__PURE__*/React.createElement("button", {
      className: "qm-grp-ghost",
      onClick: () => {
        var b = prompt(`這一組（${g.items.length} 個單元）要改叫什麼？`, g.name);
        if (b == null) return;
        if (!String(b).trim()) {
          alert('名字不能是空的。');
          return;
        }
        setGrpMenu(null);
        onRenameGroup(g.name, String(b).trim());
      },
      title: "\u6539\u9019\u4E00\u7D44\u7684\u540D\u5B57\u2014\u2014\u5E95\u4E0B\u6BCF\u500B\u55AE\u5143\u7684\u6A19\u984C\u4E5F\u6703\u8DDF\u8457\u6539"
    }, "\u270F\uFE0F \u6539\u540D\u5B57\u2026"), onCopyGroupToWeeks && (weekChoices || []).length > 0 && /*#__PURE__*/React.createElement("button", {
      className: "qm-grp-ghost",
      onClick: () => {
        setCopyItem({
          __group: true,
          name: g.name,
          items: g.items
        });
        setCopySel([]);
        setGrpMenu(null);
      }
    }, "\uD83D\uDCC4 \u6574\u7D44\u6CBF\u7528\u5230\u5176\u4ED6\u9031\u2026"), onRegenGroup && /*#__PURE__*/React.createElement("button", {
      className: "qm-grp-ghost",
      onClick: () => {
        setGrpMenu(null);
        onRegenGroup(cat.id, g.name, g.items);
      },
      title: "\u7528\u540C\u4E00\u4EFD\u8A2D\u5B9A\u518D\u51FA\u4E00\u4EFD\u65B0\u984C\u76EE\uFF0C\u76F4\u63A5\u52A0\u9032\u9019\u4E00\u7D44\uFF08\u4E0D\u6703\u8B8A\u6210\u53E6\u4E00\u7D44\uFF09"
    }, "\u2728 \u5728\u9019\u4E00\u7D44\u518D\u51FA\u4E00\u4EFD\u984C\u76EE"), onReviewGroup && (window.reviewWordsOf && window.reviewWordsOf(g.items).length >= 2 || window.reviewGrammarOf && window.reviewGrammarOf(g.items)) && /*#__PURE__*/React.createElement("button", {
      className: "qm-grp-ghost",
      onClick: () => {
        setGrpMenu(null);
        onReviewGroup(cat.id, g.name, g.items);
      },
      title: "\u7528\u540C\u4E00\u6279\u55AE\u5B57\uFF0F\u540C\u4E00\u500B\u6587\u6CD5\u91CD\u9EDE\u91CD\u51FA\u4E00\u4EFD\u4E0D\u4E00\u6A23\u7684\u984C\u76EE\uFF0C\u6392\u5230\u4E4B\u5F8C\u7684\u67D0\u4E00\u9031\u7576\u8907\u7FD2"
    }, "\uD83D\uDD01 \u6392\u4E00\u4EFD\u8907\u7FD2\u5230\u5225\u9031\u2026"), onDeleteGroup && /*#__PURE__*/React.createElement("button", {
      className: "qm-grp-ghost danger",
      onClick: () => {
        if (!confirm(`刪掉「${g.name}」整組 ${g.items.length} 個單元？\n\n學生做過的紀錄會留著，但這些單元會從這一週消失，而且救不回來。`)) return;
        setGrpMenu(null);
        onDeleteGroup(g.name, g.items);
      },
      title: "\u628A\u9019\u4E00\u7D44\u6240\u6709\u55AE\u5143\u5F9E\u9019\u4E00\u9031\u522A\u6389"
    }, "\uD83D\uDDD1 \u6574\u7D44\u522A\u6389"))), openGroups[g.key] && (groupRes || {})[`${cat.id}::${g.name}`] ? /*#__PURE__*/React.createElement("button", {
      className: "qm-gres-card",
      onClick: () => setResView(g.name)
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-gres-ic"
    }, groupRes[`${cat.id}::${g.name}`].yt ? '📺' : '📄'), /*#__PURE__*/React.createElement("span", {
      className: "qm-gres-tx"
    }, /*#__PURE__*/React.createElement("b", null, "\u53C3\u8003\u8CC7\u6599"), /*#__PURE__*/React.createElement("span", null, [groupRes[`${cat.id}::${g.name}`].yt ? '影片' : null, groupRes[`${cat.id}::${g.name}`].fileUrl ? '課文檔案' : null, groupRes[`${cat.id}::${g.name}`].note ? '老師的話' : null].filter(Boolean).join(' · ') || '點開來看')), /*#__PURE__*/React.createElement("span", {
      className: "qm-gres-go"
    }, "\u2192")) : null, openGroups[g.key] ? (() => {
      var rows = editMode ? g.items : [...g.items].sort((a, b) => qmItemRank(a) - qmItemRank(b));
      /* ⚠ 編輯模式維持**攤平**：老師要在這裡上下移、刪單一個單元，
         多一層收合只會擋路（而且他本來就是來處理個別單元的）。 */
      if (editMode) return rows.map((it, ii, arr) => renderUnitRow(it, g.name, {
        list: arr,
        idx: ii
      }));
      return qmSubGroups(rows, g.name).map((sub, si) => {
        if (!sub.base || sub.items.length < 2) return sub.items.map(it => renderUnitRow(it, g.name, null));
        var sk = `${g.key}::${sub.base}`;
        /* 正在做的那一份在裡面就自動打開——不要讓他點進去之後找不到自己在哪 */
        var hasSel = sub.items.some(it => selectedItem && selectedItem.id === it.id);
        /* 🔴 v546（Alan：「按下其中一個練習就無法收合了」）
           本來寫 `openSubs[sk] || hasSel`：使用者按收合寫進去的 false，
           被後面的「正在做的那份在裡面就強制打開」蓋掉——所以一點進練習就再也收不起來。
           ⭐ 使用者**明確按過**的永遠贏；沒按過（undefined）才看 hasSel。 */
        var open = openSubs[sk] !== undefined ? openSubs[sk] : hasSel;
        var done = sub.items.filter(it => (qmProg[`${weekId}_${it.id}`] || {}).done).length;
        /* 整組同一個截止日才顯示一次；不同就讓每一份自己顯示 */
        var dues = [...new Set(sub.items.map(it => ((homework || {})[it.id] || {}).dueDate).filter(Boolean))];
        return /*#__PURE__*/React.createElement("div", {
          className: 'qm-sub' + (open ? ' open' : ''),
          key: 'sub' + si
        }, /*#__PURE__*/React.createElement("button", {
          className: "qm-sub-head",
          onClick: () => setOpenSubs(x => ({
            ...x,
            [sk]: !open
          }))
        }, /*#__PURE__*/React.createElement("span", {
          className: "qm-sub-chev"
        }, open ? '▾' : '▸'), /*#__PURE__*/React.createElement("span", {
          className: "qm-sub-name"
        }, sub.base), /*#__PURE__*/React.createElement("span", {
          className: "qm-sub-n"
        }, sub.items.length, " \u4EFD"), dues.length === 1 && /*#__PURE__*/React.createElement("span", {
          className: "qm-sub-due"
        }, "\uD83D\uDCCC ", qmDueText(dues[0])), /*#__PURE__*/React.createElement("span", {
          className: 'qm-sub-done' + (done === sub.items.length ? ' all' : '')
        }, done === sub.items.length ? '✓ 做完了' : `${done}/${sub.items.length}`)), open && /*#__PURE__*/React.createElement("div", {
          className: "qm-sub-rows"
        }, sub.items.map(it => renderUnitRow(it, g.name, null))));
      });
    })() : null) : renderUnitRow(g.single));
  })())), /*#__PURE__*/React.createElement("div", {
    className: "qm-quiz-area"
  }, selectedItem && !editMode && /*#__PURE__*/React.createElement(window.FocusBtn, null), selectedItem && !editMode && phase === 'intro' && QM_TYPE_ZH[selectedItem.type] && /*#__PURE__*/React.createElement("div", {
    className: "qm-type-chip"
  }, QM_TYPE_ICO[selectedItem.type] || '', " ", QM_TYPE_ZH[selectedItem.type]), /*#__PURE__*/React.createElement("div", {
    key: quizSwapKey,
    className: "qm-quiz-swap"
  }, selectedItem && lessonGate ? /*#__PURE__*/React.createElement("div", {
    className: "qm-intro gnl-gate"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, selectedItem.title), /*#__PURE__*/React.createElement("div", {
    className: "gnl-gate-msg"
  }, "\u5148\u5B8C\u6210\u300C", /*#__PURE__*/React.createElement("b", null, lessonGate.title), "\u300D\uFF0C\u5B78\u6703\u4E86\u624D\u80FD\u958B\u59CB\u7DF4\u7FD2\u5594\uFF01"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: () => selectItem(lessonGate)
  }, "\uD83D\uDCD8 \u53BB\u5B78\u4E00\u4E0B \u2192"))) : !selectedItem ? /*#__PURE__*/React.createElement("div", {
    className: "qm-placeholder"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-placeholder-icon"
  }, "\uD83D\uDC48"), /*#__PURE__*/React.createElement("div", {
    className: "qm-placeholder-msg"
  }, "Select a unit to start"), /*#__PURE__*/React.createElement("div", {
    className: "qm-placeholder-sub"
  }, "\u9078\u64C7\u4E00\u500B\u55AE\u5143\u958B\u59CB\u7DF4\u7FD2")) : selectedItem && editMode && getItemQuestions(selectedItem).length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "qm-placeholder"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-placeholder-icon"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("div", {
    className: "qm-placeholder-msg"
  }, selectedItem.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-placeholder-sub"
  }, "Type: ", selectedItem.type, " \xB7 No quiz questions yet"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    style: {
      marginTop: '16px'
    },
    onClick: () => onEditItem(selectedItem)
  }, "\u270E Edit this item")) : selectedItem?.type === 'flashcard' && phase === 'intro' ? /*#__PURE__*/React.createElement(FlashcardStandaloneIntro, {
    item: selectedItem,
    cat: cat,
    done: (() => {
      var p = qmProg[`${weekId}_${selectedItem.id}`];
      return !!(p && p.done);
    })(),
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'flashcard' ? /*#__PURE__*/React.createElement(FlashcardStandalone, {
    key: quizSwapKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`
    /* v459（Alan：「有學生反應補交作業不會顯示已完成並且消掉」）：
       單字卡本來只從 localStorage 讀「學習／測驗做過沒」，
       所以換一台裝置（學校 iPad ↔ 家裡）就全部歸零、「完成練習」一直鎖著
       ——學生做完了卻永遠按不下去，看起來就是「作業不會消掉」。
       qmProg 是已經把雲端併進來的那一份，改用它才跨裝置。 */,
    cloudModes: ((qmProg || {})[`${weekId}_${selectedItem.id}`] || {}).modes || null,
    isHomework: !editMode && !!(homework || {})[selectedItem.id],
    onDone: goTasks => {
      setProgVersion(v => v + 1);
      if (goTasks) onBack();else setPhase('intro');
    }
  }) : selectedItem?.type === 'spelling' && phase === 'quiz' ? /*#__PURE__*/React.createElement(SpellingPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'spelling' && phase === 'intro' ? /*#__PURE__*/React.createElement(SpellingIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
    /* v442（Alan）：聽寫不給「繼續上一次」——跳出去查答案再回來就沒意義了 */,
    resumeAt: null,
    onRestart: null
  }) : selectedItem?.type === 'upload' ?
  /*#__PURE__*/
  /* v263: 上傳作業——單一畫面（說明＋拍照上傳＋已交/批改狀態），不分 intro/quiz */
  React.createElement(UploadHomeworkPlayer, {
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: onBack
  }) : selectedItem?.type === 'type-answer' && phase === 'quiz' ? /*#__PURE__*/React.createElement(TypeAnswerPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'type-answer' && phase === 'intro' ? /*#__PURE__*/React.createElement(TypeAnswerIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz'),
    resumeAt: resumeFor(it => (it.pairs || []).length),
    onRestart: restartFresh
  }) : selectedItem?.type === 'writing-practice' && phase === 'quiz' ? /*#__PURE__*/React.createElement(WritingPracticePlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    item: selectedItem,
    catItems: items || [],
    linkPool: weekAllItems || items || [],
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'writing-practice' && phase === 'intro' ? /*#__PURE__*/React.createElement(WritingPracticeIntro, {
    item: selectedItem,
    catItems: items || [],
    linkPool: weekAllItems || items || [],
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'short-answer' && phase === 'quiz' ? /*#__PURE__*/React.createElement(ShortAnswerPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'short-answer' && phase === 'intro' ? /*#__PURE__*/React.createElement(ShortAnswerIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'syllable-div' && phase === 'quiz' ? /*#__PURE__*/React.createElement(SyllableDivPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'syllable-div' && phase === 'intro' ? /*#__PURE__*/React.createElement(SyllableDivIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz'),
    resumeAt: resumeFor(it => (it.sdWords || []).length),
    onRestart: restartFresh
  }) : selectedItem?.type === 'lesson' ?
  /*#__PURE__*/
  /* v383: 教學卡沒有 intro／quiz 兩段——本身就是一步一步走的畫面 */
  React.createElement(LessonPlayer, {
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro'),
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask
  }) : selectedItem?.type === 'reading-skill' && phase === 'quiz' ? /*#__PURE__*/React.createElement(ReadingSkillPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'reading-skill' && phase === 'intro' ? /*#__PURE__*/React.createElement(ReadingSkillIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'def-match' && phase === 'quiz' ? /*#__PURE__*/React.createElement(DefMatchPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'def-match' && phase === 'intro' ? /*#__PURE__*/React.createElement(DefMatchIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'exam' ?
  /*#__PURE__*/
  /* 📄 v515：考卷沒有 intro —— 真的考試不會先給你一頁「準備好了嗎」。
     開場的心情／目標那兩題就長在卷子最上面，跟學校的一模一樣。 */
  React.createElement(ExamPlayer, {
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setSelectedItem(null),
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask
  }) : selectedItem?.type === 'sentence-order' && phase === 'quiz' ? /*#__PURE__*/React.createElement(SentenceOrderPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'sentence-order' && phase === 'intro' ? /*#__PURE__*/React.createElement(SentenceOrderIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'word-sort' && phase === 'quiz' ? /*#__PURE__*/React.createElement(WordSortPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'word-sort' && phase === 'intro' ? /*#__PURE__*/React.createElement(WordSortIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'story-mountain' && phase === 'quiz' ? /*#__PURE__*/React.createElement(StoryMountainPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'story-mountain' && phase === 'intro' ? /*#__PURE__*/React.createElement(StoryMountainIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'essay' && phase === 'quiz' ? /*#__PURE__*/React.createElement(EssayPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'cloze' && phase === 'quiz' ? /*#__PURE__*/React.createElement(ClozePlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'cloze' && phase === 'intro' ? /*#__PURE__*/React.createElement(ClozeIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'circle-answer' && phase === 'quiz' ? /*#__PURE__*/React.createElement(CircleAnswerPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'circle-answer' && phase === 'intro' ? /*#__PURE__*/React.createElement(CircleAnswerIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
  }) : selectedItem?.type === 'guided-reading' && phase === 'quiz' ? /*#__PURE__*/React.createElement(GuidedReadingPlayer, {
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask,
    key: playerKey,
    item: selectedItem,
    progressKey: `${weekId}_${selectedItem.id}`,
    onBack: () => setPhase('intro')
  }) : selectedItem?.type === 'guided-reading' && phase === 'intro' ? /*#__PURE__*/React.createElement(GuidedReadingIntro, {
    item: selectedItem,
    onStart: () => setPhase('quiz'),
    resumeAt: resumeFor(it => grTotalQ(it)),
    onRestart: restartFresh,
    catItems: items || [],
    linkPool: weekAllItems || items || [],
    blockedBy: fcGate,
    onFlashcards: fi => {
      setFlashItem(fi);
      setPhase('flashcards');
    }
  }) : selectedItem?.type === 'essay' && phase === 'intro' ? /*#__PURE__*/React.createElement(EssayIntro, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    onStart: () => setPhase('quiz')
  }) : phase === 'intro' ? /*#__PURE__*/React.createElement(QuizIntroScreen, {
    item: selectedItem,
    prog: qmProg[`${weekId}_${selectedItem.id}`],
    cat: cat,
    questions: getItemQuestions(selectedItem),
    catItems: items || [],
    linkPool: weekAllItems || items || [],
    onFlashcards: fi => {
      setFlashItem(fi);
      setPhase('flashcards');
    },
    onStartQuiz: () => setPhase('quiz'),
    resumeAt: (getResume(`${weekId}_${selectedItem.id}`, getItemQuestions(selectedItem).length) || {}).deckPos || null,
    onRestart: restartFresh
  }) : phase === 'flashcards' && flashItem ? /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-player-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-player-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "qm-fc-player-title"
  }, flashItem.title), /*#__PURE__*/React.createElement("button", {
    className: "qm-fc-start-btn",
    onClick: () => setPhase('quiz'),
    disabled: !!fcGate && flashItem && fcGate.id === flashItem.id,
    title: fcGate ? '完成「📖 學習」模式後就會解鎖' : undefined
  }, !!fcGate && flashItem && fcGate.id === flashItem.id ? '🔒 完成「學習」模式後解鎖' : selectedItem?.type === 'guided-reading' ? '開始閱讀 →' : '開始測驗 →')), /*#__PURE__*/React.createElement(window.FlashcardPlayer, {
    item: flashItem,
    onComplete: () => setPhase('quiz'),
    onModeDone: m => markFlashcardModeLocal(`${weekId}_${flashItem.id}`, m)
  })) : /*#__PURE__*/React.createElement(QuizModePlayer, {
    key: playerKey,
    cat: cat,
    item: selectedItem,
    questions: getItemQuestions(selectedItem),
    progressKey: `${weekId}_${selectedItem.id}`,
    weekId: weekId,
    allQuizItems: weekQuizItems || quizItems,
    onBack: () => setPhase('intro'),
    onQuizDone: () => setProgVersion(v => v + 1),
    onBackToTasks: onBackToTasksShared,
    onNextTask: onNextTask
  }))), resView && (groupRes || {})[`${cat.id}::${resView}`] && /*#__PURE__*/React.createElement(GroupResViewer, {
    name: resView,
    res: groupRes[`${cat.id}::${resView}`],
    onClose: () => setResView(null)
  }), resEdit && /*#__PURE__*/React.createElement(GroupResEditor, {
    name: resEdit,
    res: (groupRes || {})[`${cat.id}::${resEdit}`] || {},
    weekId: weekId,
    onSave: patch => onSaveGroupRes && onSaveGroupRes(resEdit, patch),
    onClose: () => setResEdit(null)
  }), assignItem && ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "qm-copy-overlay",
    onClick: () => setAssignItem(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-title"
  }, "\u6307\u6D3E\u7D66\u54EA\u4E9B\u5B78\u751F"), /*#__PURE__*/React.createElement("button", {
    className: "qm-copy-x",
    onClick: () => setAssignItem(null),
    "aria-label": "\u95DC\u9589"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-sub"
  }, "\u52FE\u9078\u5F8C\uFF0C\u300C", assignItem.title, "\u300D\u5C31\u6703\u51FA\u73FE\u5728\u90A3\u4F4D\u5B78\u751F\u7684\u6E05\u55AE\u8207\u7BE9\u9078\u5E95\u4E0B\u3002", /*#__PURE__*/React.createElement("b", null, "\u4E0D\u7528\u8A2D\u6210\u4F5C\u696D\u4E5F\u53EF\u4EE5"), "\u2014\u2014\u8981\u7576\u4F5C\u696D\u518D\u53E6\u5916\u8A2D\u622A\u6B62\u65E5\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-list"
  }, assignRoster.filter(s => s.active !== false).length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "qm-unit-empty"
  }, "\u540D\u55AE\u662F\u7A7A\u7684\u2014\u2014\u5148\u5230\u5F8C\u53F0\u300C\u5B78\u751F\u540D\u55AE\u300D\u65B0\u589E\u3002") : assignRoster.filter(s => s.active !== false).map(s => {
    var email = String(s.email || '').toLowerCase();
    var on = (assignedOf.get(assignItem.id) || new Set()).has(email);
    return /*#__PURE__*/React.createElement("button", {
      key: email,
      type: "button",
      disabled: assignBusy,
      className: 'qm-copy-wk' + (on ? ' on' : ''),
      onClick: () => toggleAssign(assignItem, s)
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-copy-wk-check"
    }, on ? '✓' : ''), /*#__PURE__*/React.createElement("span", {
      className: "qm-copy-wk-info"
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-copy-wk-label"
    }, s.name || email), s.grade ? /*#__PURE__*/React.createElement("span", {
      className: "qm-copy-wk-sub"
    }, String(s.grade).toUpperCase()) : null));
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-copy-go",
    onClick: () => setAssignItem(null)
  }, "\u5B8C\u6210")))), document.body), copyItem && ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "qm-copy-overlay",
    onClick: () => setCopyItem(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-title"
  }, "\u6CBF\u7528\u5230\u5176\u4ED6\u9031"), /*#__PURE__*/React.createElement("button", {
    className: "qm-copy-x",
    onClick: () => setCopyItem(null),
    "aria-label": "\u95DC\u9589"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-sub"
  }, copyItem.__group ? copyMove ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u628A\u300C", copyItem.name, "\u300D\u9019\u4E00\u7D44\u7684 ", /*#__PURE__*/React.createElement("b", null, copyItem.items.length, " \u500B\u55AE\u5143"), /*#__PURE__*/React.createElement("b", null, "\u642C"), "\u5230\u4F60\u9078\u7684\u90A3\u4E00\u9031\u2014\u2014", /*#__PURE__*/React.createElement("b", null, "\u9019\u4E00\u9031\u5C31\u4E0D\u7559\u4E86"), "\u3002\u5B78\u751F\u505A\u904E\u7684\u7D00\u9304\u6703\u7559\u8457\u3002") : /*#__PURE__*/React.createElement(React.Fragment, null, "\u628A\u300C", copyItem.name, "\u300D\u9019\u4E00\u7D44\u7684 ", /*#__PURE__*/React.createElement("b", null, copyItem.items.length, " \u500B\u55AE\u5143"), "\u6574\u5305\u8907\u88FD\u5230\u4F60\u52FE\u9078\u7684\u9031\uFF08\u9019\u4E00\u9031\u7167\u6A23\u7559\u8457\uFF09\u3002") : /*#__PURE__*/React.createElement(React.Fragment, null, "\u628A\u300C", copyItem.title, "\u300D\u8907\u88FD\u5230\u4F60\u52FE\u9078\u7684\u9031\u3002"), /*#__PURE__*/React.createElement("b", null, "\u5404\u9031\u7368\u7ACB"), "\u2014\u2014\u54EA\u4E00\u9031\u60F3\u5FAE\u8ABF\u5C31\u6539\u54EA\u9031\uFF0C\u6210\u7E3E\u4E5F\u5206\u958B\u7B97\u3002"), copyItem.__group && /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-mode"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'qm-copy-mode-b' + (!copyMove ? ' on' : ''),
    onClick: () => setCopyMove(false)
  }, "\uD83D\uDCC4 \u6CBF\u7528\u4E00\u4EFD\u904E\u53BB"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'qm-copy-mode-b' + (copyMove ? ' on' : ''),
    onClick: () => {
      setCopyMove(true);
      setCopySel(x => x.slice(-1));
    }
  }, "\uD83D\uDCE6 \u642C\u904E\u53BB\uFF08\u51FA\u932F\u9031\u4E86\uFF09")), copyItem.__group && !copyMove && /*#__PURE__*/React.createElement("label", {
    className: "qm-copy-due"
  }, /*#__PURE__*/React.createElement("span", null, "\u5230\u4E86\u90A3\u4E00\u9031\u4E5F\u76F4\u63A5\u8A2D\u6210\u4F5C\u696D\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: grpDue,
    onChange: e => setGrpDue(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-list"
  }, (weekChoices || []).map(wc => {
    var on = copySel.includes(wc.id);
    return /*#__PURE__*/React.createElement("button", {
      key: wc.id,
      type: "button",
      className: 'qm-copy-wk' + (on ? ' on' : ''),
      onClick: () => setCopySel(s => on ? s.filter(x => x !== wc.id) : copyMove ? [wc.id] : [...s, wc.id])
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-copy-wk-check"
    }, on ? '✓' : ''), /*#__PURE__*/React.createElement("span", {
      className: "qm-copy-wk-info"
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-copy-wk-label"
    }, wc.label), wc.sub ? /*#__PURE__*/React.createElement("span", {
      className: "qm-copy-wk-sub"
    }, wc.sub) : null));
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-copy-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-copy-cancel",
    onClick: () => {
      setCopyItem(null);
      setCopyMove(false);
    }
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "qm-copy-go",
    disabled: !copySel.length,
    onClick: () => {
      if (copyItem.__group) {
        if (copyMove && !confirm(`把「${copyItem.name}」整組 ${copyItem.items.length} 個單元搬過去？\n\n這一週就不會再有這一組了。`)) return;
        onCopyGroupToWeeks(copyItem.items, copySel, copyMove ? '' : grpDue || '', copyMove);
      } else onCopyToWeeks(copyItem, copySel);
      setCopyItem(null);
      setGrpDue('');
      setCopyMove(false);
    }
  }, copyMove ? '搬過去 →' : `沿用到 ${copySel.length || ''} 週`)))), document.body));
}

/* ══════════════════════════════════════════════════════
   單字卡獨立練習（v233）——flashcard 自己就是一份功課：
   intro → FlashcardPlayer（卡片/配對/拼字自由玩）→「完成練習」寫進度。
   完全不動題庫資料，只寫學生自己的完成紀錄。
══════════════════════════════════════════════════════ */
function FlashcardStandaloneIntro({
  item,
  cat,
  done,
  onStart
}) {
  var n = (item.cards || []).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, cat ? /*#__PURE__*/React.createElement(CatIcon, {
    catId: cat.id,
    className: "qm-intro-caticon"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83C\uDCCF"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, n, " \u5F35\u55AE\u5B57\u5361"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDCCF"), /*#__PURE__*/React.createElement("span", null, "\u7FFB\u5361\u7247\u8A18\u55AE\u5B57\uFF0C\u4E5F\u53EF\u4EE5\u73A9\u914D\u5C0D\u3001\u62FC\u5B57\u5C0F\u904A\u6232")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2713"), /*#__PURE__*/React.createElement("span", null, "\u7DF4\u719F\u4E4B\u5F8C\uFF0C\u6309\u4E0A\u65B9\u7684\u300C\u5B8C\u6210\u7DF4\u7FD2\u300D\u5C31\u5B8C\u6210\u4E86"))), done && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-fcdone"
  }, "\u2713 \u5DF2\u7D93\u5B8C\u6210\u904E\u2014\u2014\u518D\u7DF4\u4E00\u6B21\uFF0C\u55AE\u5B57\u66F4\u719F\uFF01"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary qm-intro-start",
    onClick: onStart
  }, "\u958B\u59CB\u7DF4\u7FD2 \u2192")));
}
function FlashcardStandalone({
  item,
  progressKey,
  isHomework,
  onDone,
  cloudModes
}) {
  /* v372(#2): 要「學習」和「測驗」兩個模式都跑完，才能按「完成練習」（也才拿得到星星）。
     已經做過的從進度讀回來，換裝置或重新進來不用重做。
     v459：以前只讀 localStorage，所以「換裝置不用重做」其實從來沒有成立過——
     換一台就整個歸零、按鈕鎖死。cloudModes 是合併過雲端的那一份，兩邊聯集才對。 */
  var [modes, setModes] = useQM(() => {
    var local = {};
    try {
      local = (loadQMProg()[progressKey] || {}).modes || {};
    } catch (e) {}
    return {
      ...local,
      ...(cloudModes || {})
    };
  });
  /* v459：雲端那一筆可能比這個畫面晚到（訂閱是非同步的）。晚到也要算數，
     不然學生會看著「還要完成：學習、測驗」但其實昨天在別台已經做過了。
     只加不減——這個畫面裡剛做完的不可以被舊的雲端資料蓋回去。 */
  useQME(() => {
    if (!cloudModes) return;
    setModes(m => {
      var next = {
        ...m,
        ...cloudModes
      };
      return Object.keys(next).length === Object.keys(m).length ? m : next;
    });
  }, [cloudModes]);
  // v373: 測驗＝真正的 test 模式（v372 一度誤指到填空）；舊的 fill 紀錄仍然算數，不讓昨天做過的白做
  var needLearn = !modes.learn,
    needTest = !(modes.test || modes.fill);
  var ready = !needLearn && !needTest;
  var finish = () => {
    if (!ready) return;
    var n = (item.cards || []).length || 1;
    saveQuizModeCompletion(progressKey, item, {
      doneCount: n,
      score: null,
      total: n
    });
    fireCelebration(null); // v375(#7)
    onDone(isHomework);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-player-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-player-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "qm-fc-player-title"
  }, item.title), !ready && /*#__PURE__*/React.createElement("span", {
    className: "qm-fc-need"
  }, "\u9084\u8981\u5B8C\u6210\uFF1A", [needLearn ? '📖 學習' : null, needTest ? '📝 測驗' : null].filter(Boolean).join('、')), /*#__PURE__*/React.createElement("button", {
    className: "qm-fc-start-btn",
    onClick: finish,
    disabled: !ready,
    title: ready ? undefined : '學習和測驗兩個模式都跑完才能完成'
  }, ready ? `✓ 完成練習${isHomework ? ' · 回今天的任務' : ''}` : '🔒 完成練習')), /*#__PURE__*/React.createElement(window.FlashcardPlayer, {
    item: item,
    onModeDone: m => {
      markFlashcardModeLocal(progressKey, m);
      setModes(o => ({
        ...o,
        [m]: true
      }));
    }
  }));
}

/* v306+: 完成過的 intro 顯示「✓ 已完成 · 上次 N 分」；v311(#21/#8): 做過但未達 80 顯示「上次 N 分 · 再拚到 80 分就完成」 */
function QmIntroDoneHint({
  prog
}) {
  if (!prog) return null;
  var pct = prog.score != null && prog.total ? Math.round(prog.score / prog.total * 100) : null;
  if (prog.done) {
    return /*#__PURE__*/React.createElement("div", {
      className: "qm-intro-done-hint"
    }, "\u2713 \u5DF2\u5B8C\u6210", pct != null ? ` · 上次 ${pct} 分` : '');
  }
  if (pct != null) {
    return /*#__PURE__*/React.createElement("div", {
      className: "qm-intro-done-hint tried"
    }, "\u4E0A\u6B21 ", pct, " \u5206 \xB7 \u518D\u62DA\u5230 80 \u5206\u5C31\u5B8C\u6210 \u2B50");
  }
  return null;
}

/* ══════════════════════════════════════════════════════
   PRE-QUIZ INTRO SCREEN
══════════════════════════════════════════════════════ */
function QuizIntroScreen({
  item,
  cat,
  questions,
  catItems,
  onFlashcards,
  onStartQuiz,
  resumeAt,
  onRestart,
  prog
}) {
  // If this quiz/fillblank has a linked flashcard, show only that one.
  // Otherwise show all available flashcard items.
  var linkedFcItem = item.linkedFlashcardId ? (catItems || []).find(it => it.id === item.linkedFlashcardId && it.type === 'flashcard') : null;
  var fcItems = linkedFcItem ? [linkedFcItem] : (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, cat ? /*#__PURE__*/React.createElement(CatIcon, {
    catId: cat.id,
    className: "qm-intro-caticon"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, item.type === 'vocab-quiz' ? '📚' : item.type === 'fillblank' ? '✏️' : '📝'), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, questions.length, " \u984C"), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, fcItems.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-fc-group"
  }, fcItems.map(fc => /*#__PURE__*/React.createElement("button", {
    key: fc.id,
    className: "qm-fcb",
    onClick: () => onFlashcards(fc)
  }, /*#__PURE__*/React.createElement("span", {
    className: "qm-fcb-ico",
    "aria-hidden": "true"
  }, "\uD83C\uDCCF"), /*#__PURE__*/React.createElement("span", {
    className: "qm-fcb-text"
  }, /*#__PURE__*/React.createElement("b", null, "\u5148\u8907\u7FD2\u55AE\u5B57\u5361"), /*#__PURE__*/React.createElement("span", null, fc.title, " \xB7 ", (fc.cards || []).length, " \u5F35")), /*#__PURE__*/React.createElement("span", {
    className: "qm-fcb-arrow",
    "aria-hidden": "true"
  }, "\u2192")))), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary qm-intro-start",
    onClick: onStartQuiz
  }, resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始測驗 →'), resumeAt && onRestart ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary qm-intro-restart",
    onClick: onRestart
  }, "\u21BB \u91CD\u65B0\u958B\u59CB") : null, resumeAt ? /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-resume"
  }, "\u4E0A\u6B21\u505A\u5230\u4E00\u534A\uFF0C\u9032\u5EA6\u5DF2\u5E6B\u4F60\u4FDD\u7559 \u2713") : null));
}

// Render **bold** markdown inline
function renderMd(text) {
  if (!text || !text.includes('**')) return text;
  return text.split(/(\*\*.*?\*\*)/).map((part, i) => part.startsWith('**') && part.endsWith('**') ? /*#__PURE__*/React.createElement("strong", {
    key: i
  }, part.slice(2, -2)) : part);
}

/* ── Shared section-based feedback renderer ────────────── */
function SectionFeedback({
  text,
  config
}) {
  // config: array of { key, label, icon, style }
  // style: 'score' | 'green' | 'blue' | 'purple' | 'orange' | 'comment' | 'default'
  var sections = parseEssaySections(text);
  var scoreText = sections['Score'] || sections['Overall Score'] || '';
  var starCount = countStars(scoreText);
  var scoreDesc = scoreText.replace(/[⭐★☆✩\s]+/g, c => /\s/.test(c) ? c : '').trim();
  return /*#__PURE__*/React.createElement("div", {
    className: "sf-feedback"
  }, scoreText && /*#__PURE__*/React.createElement("div", {
    className: "sf-score-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sf-stars"
  }, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `sf-star ${i <= starCount ? 'filled' : 'empty'}`
  }, i <= starCount ? '⭐' : '☆'))), scoreDesc && /*#__PURE__*/React.createElement("div", {
    className: "sf-score-desc"
  }, scoreDesc)), config.map(({
    key,
    label,
    icon,
    style
  }) => {
    var body = sections[key];
    if (!body) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      className: `sf-section sf-${style || 'default'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "sf-sec-title"
    }, icon, " ", label), /*#__PURE__*/React.createElement("div", {
      className: "sf-sec-body"
    }, body));
  }));
}

/* Writing Practice feedback config */
var WF_CONFIG = [{
  key: 'Word Usage',
  label: 'Word Usage',
  icon: '📝',
  style: 'default'
}, {
  key: 'Grammar',
  label: 'Grammar',
  icon: '✏️',
  style: 'default'
}, {
  key: 'Teacher Comment',
  label: 'Teacher Comment',
  icon: '💬',
  style: 'comment'
}, {
  key: 'Corrected Sentence',
  label: 'Corrected Sentence',
  icon: '📋',
  style: 'blue'
}, {
  key: 'Better Sentence',
  label: 'Better Sentence',
  icon: '🌟',
  style: 'purple'
}];

/* Short Answer feedback config */
var SA_CONFIG = [{
  key: 'Answer Check',
  label: 'Answer Check',
  icon: '✅',
  style: 'default'
}, {
  key: 'Text Evidence',
  label: 'Text Evidence',
  icon: '📖',
  style: 'default'
}, {
  key: 'Needs Improvement',
  label: 'Needs Improvement',
  icon: '🔸',
  style: 'orange'
}, {
  key: 'Teacher Comment',
  label: 'Teacher Comment',
  icon: '💬',
  style: 'comment'
}, {
  key: 'Corrected Answer',
  label: 'Corrected Answer',
  icon: '📋',
  style: 'blue'
}, {
  key: 'Better Answer',
  label: 'Better Answer',
  icon: '🌟',
  style: 'purple'
}];

/* ── Unified 3-card writing feedback (all writing types) ── */
function WritingFeedback({
  text
}) {
  if (!text) return null;
  var secs = parseEssaySections(text);
  var scoreText = secs['Score'] || secs['Overall Score'];
  var hasGood = secs['Good Job'];
  var hasImprove = secs['To Improve'];
  var hasBetter = secs['Better Version'] || secs['Example Answer'] || secs['Better Answer'];
  var hasSections = scoreText || hasGood || hasImprove || hasBetter;
  if (!hasSections) {
    // Fallback: raw text
    return /*#__PURE__*/React.createElement("div", {
      className: "wf3-raw"
    }, text);
  }
  var starCount = scoreText ? countStars(scoreText) : 0;
  var scoreDesc = scoreText ? scoreText.replace(/[⭐★☆✩\s()0-9/]+/g, ' ').replace(/\s+/g, ' ').replace(/^[-—:：]\s*/, '').trim() : '';
  return /*#__PURE__*/React.createElement("div", {
    className: "wf3-feedback"
  }, scoreText && /*#__PURE__*/React.createElement("div", {
    className: "wf3-card wf3-score"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wf3-title"
  }, "\u2B50 Score"), /*#__PURE__*/React.createElement("div", {
    className: "wf3-stars",
    "aria-label": `${starCount} out of 5 stars`
  }, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: i <= starCount ? 'filled' : 'empty'
  }, i <= starCount ? '⭐' : '☆'))), scoreDesc && /*#__PURE__*/React.createElement("div", {
    className: "wf3-body"
  }, scoreDesc)), hasGood && /*#__PURE__*/React.createElement("div", {
    className: "wf3-card wf3-green"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wf3-title"
  }, "\u2705 Good Job!"), /*#__PURE__*/React.createElement("div", {
    className: "wf3-body"
  }, hasGood)), hasImprove && /*#__PURE__*/React.createElement("div", {
    className: "wf3-card wf3-orange"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wf3-title"
  }, "\uD83D\uDD38 To Improve"), /*#__PURE__*/React.createElement("div", {
    className: "wf3-body"
  }, hasImprove)), hasBetter && /*#__PURE__*/React.createElement("div", {
    className: "wf3-card wf3-blue"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wf3-title"
  }, "\uD83D\uDCDD Better Version"), /*#__PURE__*/React.createElement("div", {
    className: "wf3-body"
  }, hasBetter)));
}

/* ══════════════════════════════════════════════════════
   TYPE-ANSWER INTRO
══════════════════════════════════════════════════════ */
/* ── v254: Spelling 聽寫——聽發音、打拼字 ── */
function SpellingIntro({
  item,
  onStart,
  resumeAt,
  onRestart,
  prog
}) {
  var count = (item.spellWords || []).filter(w => w && w.word).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83D\uDD0A"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, count, " \u500B\u55AE\u5B57"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD0A"), /*#__PURE__*/React.createElement("span", null, "\u5148\u807D\u767C\u97F3\uFF08\u53EF\u4EE5\u6309\u5587\u53ED\u91CD\u807D\uFF0C\u4E0D\u9650\u6B21\u6578\uFF09")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2328"), /*#__PURE__*/React.createElement("span", null, "\u628A\u807D\u5230\u7684\u55AE\u5B57\u62FC\u51FA\u4F86")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u4E0D\u5206\u5927\u5C0F\u5BEB\uFF0C\u62FC\u5C0D\u5C31\u7B97\u5C0D"))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始聽寫 · Start →'), resumeAt && onRestart ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary qm-intro-restart",
    onClick: onRestart
  }, "\u21BB \u91CD\u65B0\u958B\u59CB") : null, resumeAt ? /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-resume"
  }, "\u4E0A\u6B21\u505A\u5230\u4E00\u534A\uFF0C\u9032\u5EA6\u5DF2\u5E6B\u4F60\u4FDD\u7559 \u2713") : null));
}
function SpellingPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var base = useQMM(() => (item.spellWords || []).filter(w => w && w.word), [item.id]);
  /* v265 的「續做」在 v442 被 Alan 關掉了（聽寫專屬）：
     「不要讓小朋友有機會跳出去去找答案再回來」——聽寫一離開就是從頭開始。
     ⚠ 這裡順手把舊的紀錄清掉，不然升版前存的還會被接回來。 */
  var rz = null;
  React.useEffect(() => {
    clearResume(progressKey);
  }, [item.id]);
  var words = useQMM(() => rz ? rz.deck.map(i => base[i]) : shuffleArr(base.slice()), [item.id]);
  var [idx, setIdx] = useQM(rz ? rz.deckPos : 0);
  var [input, setInput] = useQM('');
  var [result, setResult] = useQM(null); // null | 'correct' | 'wrong'
  var [score, setScore] = useQM(rz ? rz.score || 0 : 0);
  var [screen, setScreen] = useQM('play');
  var [redo, setRedo] = useQM(false); // v274: 答錯 → 看音節照著拼一次才過關
  var [redoTry, setRedoTry] = useQM(0); // 訂正又拼錯的搖晃動畫 key
  var wrongsRef = React.useRef(rz && Array.isArray(rz.wrongs) ? rz.wrongs.slice() : []);
  var inputRef = React.useRef(null);
  // v392: 本來是裸 setTimeout，答對後 650ms 內按返回，timer 照樣跑完 → 學生已回到單元列表，
  //       彩帶和 fanfare 卻在那裡放。改成可取消的 timer（unmount 自動清）。
  var {
    scheduleAuto,
    clearAuto
  } = useAutoNext();
  var total = words.length;
  var current = words[idx];
  var pct = Math.round(idx / total * 100);
  var showZh = item.spellShowZh !== false;
  var isLast = idx + 1 >= total;
  var speak = () => {
    if (current && window.speakText) (window.speakTTS || window.speakText)(current.word, {
      lang: 'en-US',
      rate: 0.82
    });
  };
  React.useEffect(() => {
    speak();
  }, [idx]); // 每題自動唸一次
  // v363: 先把整份的發音抓下來放快取——播放時就不必等網路，
  //       iOS 才不會因為「await 之後已離開使用者手勢」而擋掉播放（Elroy 回報聽寫沒聲音）
  React.useEffect(() => {
    if (window.prefetchTts) window.prefetchTts(words.map(w => w && w.word));
  }, [item.id]);
  // v363: 還是聽不到 → 改用裝置內建語音（iPhone/iPad 側邊靜音開關會讓 mp3 沒聲音，內建語音不受影響）
  var [ttsMode, setTtsModeS] = useQM(() => window.getTtsMode ? window.getTtsMode() : 'auto');
  var switchVoice = () => {
    var nx = ttsMode === 'browser' ? 'auto' : 'browser';
    if (window.setTtsMode) window.setTtsMode(nx);
    setTtsModeS(nx);
    setTimeout(speak, 60);
  };
  React.useEffect(() => {
    if (result === null && inputRef.current) inputRef.current.focus();
  }, [idx, result]);
  var check = () => {
    if (!input.trim()) return;
    var target = (current.word || '').trim().toLowerCase();
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
    var correct = input.trim().toLowerCase() === target;
    setResult(correct ? 'correct' : 'wrong');
    if (correct) {
      var nextScore = score + 1;
      setScore(nextScore);
      if (window.playSound) window.playSound('correct');
      /* v392: 統一節奏——聽寫沒有解說欄位，所以固定 1 秒；
         最後一題一律不自動跳，停在「✓ 答對了！」由學生自己按「查看成績 →」
         （原本 650ms 就閃到結果頁，等於「答對了」沒看到，彩帶還會跟答對音效撞在一起）。 */
      if (!isLast) scheduleAuto(() => next(nextScore), QM_AUTO_MS_PLAIN);
    } else {
      wrongsRef.current.push({
        q: '🔊 聽寫' + (current.zh ? '：' + current.zh : ''),
        answer: current.word
      });
      if (window.playSound) window.playSound('wrong');
      setRedo(true);
      setInput('');
    }
  };
  var next = (scoreOverride = null) => {
    clearAuto(); // v392: 手動前進也要清 timer，否則會連跳兩題
    var finalScoreBase = typeof scoreOverride === 'number' ? scoreOverride : score;
    if (idx + 1 >= total) {
      clearResume(progressKey); // v265: 做完 → 清掉續做紀錄
      saveQuizModeCompletion(progressKey, item, {
        doneCount: total,
        score: finalScoreBase,
        total,
        wrongQuestions: wrongsRef.current
      });
      fireCelebration(total ? Math.round(finalScoreBase / total * 100) : null); // v375(#7)
      setScreen('done');
    } else {
      /* v442（Alan）：聽寫刻意**不存**續做進度——中途離開就是從頭開始，
         不然小朋友可以聽到不會的字就跳出去查，再回來接著拼。 */
      clearResume(progressKey);
      setIdx(i => i + 1);
      setInput('');
      setResult(null);
      setRedo(false); // v274
    }
  };
  var handleKey = e => {
    if (e.key === 'Enter') {
      if (result === null || redo) check();else next(); // v392: next() 自己會清 timer（四個入口之一：鍵盤 Enter）
    }
  };
  if (screen === 'done') {
    var finalPct = Math.round(score / total * 100);
    var emoji = finalPct === 100 ? '🏆' : finalPct >= 80 ? '🎉' : finalPct >= 60 ? '👍' : '💪';
    return /*#__PURE__*/React.createElement("div", {
      className: "qm-result"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-result-emoji"
    }, emoji), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-cat-title"
    }, item.title), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-score"
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-result-num"
    }, score), /*#__PURE__*/React.createElement("span", {
      className: "qm-result-denom"
    }, " / ", total)), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-pct"
    }, "\u7B54\u5C0D\u7387 ", finalPct, "%"), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-btns"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary",
      onClick: () => {
        wrongsRef.current = [];
        setIdx(0);
        setInput('');
        setResult(null);
        setScore(0);
        setScreen('play');
      }
    }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask
    })));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-player-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
    onClick: () => {
      clearAuto();
      onBack();
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-fill",
    style: {
      width: pct + '%'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "qm-player-counter"
  }, idx + 1, " / ", total)), /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "qm-question-area qm-question-swap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-question-hint"
  }, "SPELLING \xB7 \u807D\u767C\u97F3\uFF0C\u62FC\u51FA\u55AE\u5B57"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sp-speak",
    onClick: speak,
    "aria-label": "\u518D\u807D\u4E00\u6B21\u767C\u97F3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sp-speak-ic"
  }, "\uD83D\uDD0A"), /*#__PURE__*/React.createElement("span", {
    className: "sp-speak-lbl"
  }, "\u518D\u807D\u4E00\u6B21")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sp-voice-alt",
    onClick: switchVoice
  }, ttsMode === 'browser' ? '目前用裝置內建語音 · 換回原本的聲音' : '還是聽不到？換一種聲音試試'), showZh && current?.zh && /*#__PURE__*/React.createElement("div", {
    className: "sp-zh"
  }, current.zh)), /*#__PURE__*/React.createElement("div", {
    className: "ta-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    key: redoTry,
    className: redoTry ? 'sp-shake-wrap' : undefined,
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    className: `ta-input${result === 'correct' ? ' correct' : result === 'wrong' && !redo ? ' wrong' : ''}`,
    value: input,
    onChange: e => {
      if (result === null || redo) setInput(e.target.value);
    },
    onKeyDown: handleKey,
    placeholder: redo ? '看著上面的音節，照著拼一次…' : '把聽到的單字拼出來…',
    disabled: result !== null && !redo,
    autoComplete: "off",
    autoCapitalize: "none",
    spellCheck: false
  }))), /*#__PURE__*/React.createElement("div", {
    className: "qm-feedback",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    style: {
      marginTop: result ? 8 : 0
    }
  }, result === null ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: check,
    disabled: !input.trim()
  }, "\u78BA\u8A8D \xB7 Check \u2192") : result === 'wrong' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sp-redo",
    key: current.word
  }, /*#__PURE__*/React.createElement("div", {
    className: "sp-redo-title"
  }, "\u2717 \u6B63\u78BA\u62FC\u6CD5\u662F"), /*#__PURE__*/React.createElement("div", {
    className: "sp-syllables",
    "aria-label": `正確拼法 ${current.word}`
  }, qmSyllables(current.word).map((syl, si) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: si
  }, si > 0 && /*#__PURE__*/React.createElement("span", {
    className: "sp-syl-dot",
    style: {
      animationDelay: si * 0.22 - 0.08 + 's'
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "sp-syl",
    style: {
      animationDelay: si * 0.22 + 's'
    }
  }, syl)))), /*#__PURE__*/React.createElement("div", {
    className: "sp-redo-hint"
  }, "\u8DDF\u8457\u5538\u4E00\u5538\uFF0C\u7167\u8457\u62FC\u4E00\u6B21\u5C31\u904E\u95DC\uFF01")), /*#__PURE__*/React.createElement("button", {
    className: "qm-result-alt sp-skip",
    onClick: () => next()
  }, "\u5148\u8DF3\u904E\u9019\u984C \u2192")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-feedback-banner correct"
  }, "\u2713 Correct! \u7B54\u5C0D\u4E86\uFF01"), /*#__PURE__*/React.createElement(QmAutoHint, {
    kind: isLast ? null : 'plain'
  }), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: () => next()
  }, isLast ? '查看成績 →' : '下一題 →'))));
}
function TypeAnswerIntro({
  item,
  onStart,
  resumeAt,
  onRestart,
  prog
}) {
  var count = (item.pairs || []).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, item.variant === 'translate' ? '🔤' : item.variant === 'fill' ? '✏️' : item.variant === 'rewrite' ? '✍️' : item.variant === 'word' ? '🖊' : item.variant === 'transform' ? '🔄' : '⌨'), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, item.variant === 'translate' ? `${count} 題中翻英` : item.variant === 'fill' ? `${count} 題填空` : item.variant === 'rewrite' ? `${count} 題改寫` : item.variant === 'word' ? `${count} 題改成正確的` : item.variant === 'transform' ? `${count} 題句型轉換` : `${count} words`), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, item.instruction && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("span", null, item.instruction)), item.variant === 'transform' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD04"), /*#__PURE__*/React.createElement("span", null, "\u4E0A\u9762\u662F\u539F\u672C\u7684\u53E5\u5B50\uFF0C\u4E0B\u9762\u5BEB\u8457\u8981\u6539\u6210\u4EC0\u9EBC")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2328"), /*#__PURE__*/React.createElement("span", null, "\u628A\u6539\u597D\u7684\u6574\u53E5\u6253\u51FA\u4F86")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u5927\u5C0F\u5BEB\u3001\u53E5\u5C3E\u6A19\u9EDE\u3001isn't\uFF0Fis not \u90FD\u4E0D\u5F71\u97FF\u5C0D\u932F"))) : item.variant === 'translate' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDDF9\uD83C\uDDFC"), /*#__PURE__*/React.createElement("span", null, "\u770B\u4E2D\u6587\uFF0C\u6253\u51FA\u82F1\u6587\u53E5\u5B50\uFF1B\u5361\u4F4F\u4E86\u53EF\u4EE5\u6309\u300C\uD83D\uDCA1 \u63D0\u793A\u300D")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u5927\u5C0F\u5BEB\u3001\u53E5\u5C3E\u6A19\u9EDE\u4E0D\u5F71\u97FF\uFF1B\u610F\u601D\u5C0D\u3001\u6587\u6CD5\u5C0D\u7684\u5176\u4ED6\u8AAA\u6CD5\u4E5F\u7B97\u5C0D"))) : item.variant === 'fill' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("span", null, "\u628A ________ \u586B\u4E0A\u6B63\u78BA\u7684\u5B57")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, item.caseSensitive ? '大寫小寫要寫對喔！' : "不分大小寫；isn't 和 is not 都算對"))) : item.variant === 'word' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD8A"), /*#__PURE__*/React.createElement("span", null, "\u53E5\u5B50\u88E1\u6A19\u8D77\u4F86\u7684\u90A3\u4E00\u6BB5\u5BEB\u932F\u4E86\u2014\u2014\u628A\u5B83\u6539\u5C0D")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\u53EA\u8981\u5BEB\u90A3\u5E7E\u500B\u5B57"), "\uFF0C\u4E0D\u7528\u628A\u6574\u53E5\u91CD\u6253\u4E00\u6B21")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2B50"), /*#__PURE__*/React.createElement("span", null, "\u5927\u5C0F\u5BEB\u3001\u6A19\u9EDE\u4E0D\u7B97\u932F\uFF1B\u7B54\u932F\u6703\u544A\u8A34\u4F60\u6B63\u78BA\u5BEB\u6CD5"))) : item.variant === 'rewrite' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u270D\uFE0F"), /*#__PURE__*/React.createElement("span", null, "\u53E5\u5B50\u5DF2\u7D93\u5E6B\u4F60\u6253\u597D\u4E86\uFF0C\u628A\u932F\u7684\u5730\u65B9\u6539\u5C0D\u5C31\u597D")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, item.caseSensitive ? '大寫小寫要改對才算對！' : '改對就算對'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("span", null, "\u770B\u5230\u63D0\u793A\u55AE\u5B57\uFF0C\u81EA\u5DF1\u6253\u51FA\u6B63\u78BA\u7B54\u6848")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u4E0D\u5206\u5927\u5C0F\u5BEB\uFF0C\u62FC\u5C0D\u5C31\u7B97\u5C0D")))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始練習 · Start →'), resumeAt && onRestart ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary qm-intro-restart",
    onClick: onRestart
  }, "\u21BB \u91CD\u65B0\u958B\u59CB") : null, resumeAt ? /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-resume"
  }, "\u4E0A\u6B21\u505A\u5230\u4E00\u534A\uFF0C\u9032\u5EA6\u5DF2\u5E6B\u4F60\u4FDD\u7559 \u2713") : null));
}

/* ══════════════════════════════════════════════════════
   TYPE-ANSWER PLAYER
══════════════════════════════════════════════════════ */
function TypeAnswerPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var base = useQMM(() => item.pairs || [], [item.id]);
  // v265: 續做——順序、進度、得分、錯題
  var rz = useQMM(() => {
    var r = getResume(progressKey, base.length);
    return r && Array.isArray(r.deck) && r.deck.length === base.length && r.deck.every(i => Number.isInteger(i) && base[i]) ? r : null;
  }, [item.id]);
  var pairs = useQMM(() => rz ? rz.deck.map(i => base[i]) : shuffleArr(base.slice()), [item.id]);
  var [idx, setIdx] = useQM(rz ? rz.deckPos : 0);
  var [input, setInput] = useQM('');
  var [result, setResult] = useQM(null); // null | 'correct' | 'wrong'
  var [score, setScore] = useQM(rz ? rz.score || 0 : 0);
  var [screen, setScreen] = useQM('play'); // 'play' | 'done'
  var [judging, setJudging] = useQM(false); // v428：中翻英 AI 判斷中
  var [tip, setTip] = useQM(''); // v428：AI 給的一句話回饋
  var [showHint, setShowHint] = useQM(false);
  var isTr = item.variant === 'translate';
  var isRw = item.variant === 'rewrite'; // v429：把句子改對
  var isTf = item.variant === 'transform'; // v462 ②：把句子換一種說法（題幹是「原句 → 要改成什麼」兩行）
  /* 🔴 v479（Alan：「改成正確的跟改寫句子有什麼差別？怎麼長一樣」）：
     康橋原卷的「整段改錯」第二步只要寫**改好的那幾個字**，不是整句。
     所以題幹裡把錯的地方標出來，輸入框也只放一個詞——跟「整句重寫」一眼就分得出來。 */
  var isWd = item.variant === 'word';
  var cs = {
    caseSensitive: !!item.caseSensitive
  }; // v429：大小寫是考點的單元
  var inputRef = React.useRef(null);
  var wrongsRef = React.useRef(rz && Array.isArray(rz.wrongs) ? rz.wrongs.slice() : []); // v258: 錯題記錄（老師端＋錯題本）
  // v392: 同 SpellingPlayer——本來是裸 setTimeout，答對後按返回會在單元列表放彩帶
  var {
    scheduleAuto,
    clearAuto
  } = useAutoNext();
  var total = pairs.length;
  var current = pairs[idx];
  var pct = Math.round(idx / total * 100);
  var isLast = idx + 1 >= total;
  React.useEffect(() => {
    if (result === null && inputRef.current) inputRef.current.focus();
  }, [idx, result]);
  // v429：改寫題——有錯的句子先打在輸入框裡，孩子只要改錯的地方（不用整句重打）
  React.useEffect(() => {
    if (isRw && current) setInput(current.prompt || '');
  }, [idx, item.id]);
  // v479：只寫幾個字的那一種不要預填整句（要寫的本來就只有一小段）
  React.useEffect(() => {
    if (isWd) setInput('');
  }, [idx, item.id]);
  var check = async () => {
    if (!input.trim() || judging) return;
    // v428：大小寫、標點不算錯；isn't＝is not；老師校稿時列的其他正確寫法也算對
    var correct = window.gnAnswerOk ? window.gnAnswerOk(input, current.answer, current.accept, cs) : cs.caseSensitive ? input.trim() === (current.answer || '').trim() : input.trim().toLowerCase() === (current.answer || '').trim().toLowerCase();
    setTip('');
    // 中翻英：程式比不上的，再請 AI 判斷「意思對、文法對」的其他說法（平常答對不花這個時間）
    if (!correct && isTr && window.aiJudgeTranslation) {
      setJudging(true);
      var j = await window.aiJudgeTranslation({
        zh: current.prompt,
        answer: current.answer,
        user: input,
        topic: item.topic || item.group || ''
      });
      setJudging(false);
      if (j) {
        correct = !!j.ok;
        setTip(j.tip || '');
      }
    }
    setResult(correct ? 'correct' : 'wrong');
    /* v442：一作答就把「下一題」存起來——不然答完離開、回來還是同一題（可以先去查答案） */
    if (!isLast) {
      saveResume(progressKey, {
        deck: pairs.map(p => base.indexOf(p)),
        deckPos: idx + 1,
        uniqueTotal: total,
        score: score + (correct ? 1 : 0),
        wrongs: wrongsRef.current
      });
    }
    if (correct) {
      var nextScore = score + 1;
      setScore(nextScore);
      if (window.playSound) window.playSound('correct');
      /* v392: 統一節奏——沒解說 1 秒、有解說 4 秒（點回饋區就取消倒數）；
         最後一題一律不自動跳。取代 v306 的「有解說就完全不跳」。 */
      if (!isLast) scheduleAuto(() => next(nextScore), current.explain ? QM_AUTO_MS_EXPLAIN : QM_AUTO_MS_PLAIN);
    } else {
      wrongsRef.current.push({
        q: current.prompt || '(打字題)',
        answer: current.answer || ''
      });
      if (window.playSound) window.playSound('wrong');
    }
  };
  var next = (scoreOverride = null) => {
    clearAuto(); // v392: 手動前進也要清 timer，否則會連跳兩題
    var finalScoreBase = typeof scoreOverride === 'number' ? scoreOverride : score;
    if (idx + 1 >= total) {
      clearResume(progressKey); // v265
      saveQuizModeCompletion(progressKey, item, {
        doneCount: total,
        score: finalScoreBase,
        total,
        wrongQuestions: wrongsRef.current
      });
      fireCelebration(total ? Math.round(finalScoreBase / total * 100) : null); // v375(#7)
      setScreen('done');
    } else {
      // v265: 每前進一題存續做進度
      saveResume(progressKey, {
        deck: pairs.map(p => base.indexOf(p)),
        deckPos: idx + 1,
        uniqueTotal: total,
        score: finalScoreBase,
        wrongs: wrongsRef.current
      });
      setIdx(i => i + 1);
      setInput('');
      setResult(null);
      setTip('');
      setShowHint(false);
    }
  };
  var handleKey = e => {
    if (e.key === 'Enter') {
      if (result === null) check();else next(); // v392: next() 自己會清 timer（四個入口之一：鍵盤 Enter）
    }
  };

  /* ── Done screen ── */
  if (screen === 'done') {
    var finalScore = score;
    var finalPct = Math.round(finalScore / total * 100);
    var emoji = finalPct === 100 ? '🏆' : finalPct >= 80 ? '🎉' : finalPct >= 60 ? '👍' : '💪';
    return /*#__PURE__*/React.createElement("div", {
      className: "qm-result"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-result-emoji"
    }, emoji), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-cat-title"
    }, item.title), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-score"
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-result-num"
    }, finalScore), /*#__PURE__*/React.createElement("span", {
      className: "qm-result-denom"
    }, " / ", total)), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-pct"
    }, finalPct, "% correct"), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-btns"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary",
      onClick: () => {
        wrongsRef.current = [];
        setIdx(0);
        setInput('');
        setResult(null);
        setScore(0);
        setScreen('play');
      }
    }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask
    })));
  }

  /* ── Play screen ── */
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-player-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
    onClick: () => {
      clearAuto();
      onBack();
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-fill",
    style: {
      width: pct + '%'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "qm-player-counter"
  }, idx + 1, " / ", total)), /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "qm-question-area qm-question-swap"
  }, item.instruction && !isRw && !isTf && /*#__PURE__*/React.createElement("div", {
    className: "qm-question-hint"
  }, item.instruction), isTr && /*#__PURE__*/React.createElement("div", {
    className: "qm-question-hint"
  }, "\u7FFB\u6210\u82F1\u6587\uFF1A"), isRw && /*#__PURE__*/React.createElement("div", {
    className: "qm-question-hint"
  }, "\u628A\u53E5\u5B50\u88E1\u932F\u7684\u5730\u65B9\u6539\u5C0D", item.caseSensitive ? '（大寫小寫要注意！）' : '', "\uFF1A"), isTf && /*#__PURE__*/React.createElement("div", {
    className: "qm-question-hint"
  }, "\u628A\u53E5\u5B50\u63DB\u4E00\u7A2E\u8AAA\u6CD5\uFF1A"), isWd && /*#__PURE__*/React.createElement("div", {
    className: "qm-question-hint"
  }, "\u6A19\u8D77\u4F86\u7684\u5730\u65B9\u8A72\u600E\u9EBC\u5BEB\uFF1F", /*#__PURE__*/React.createElement("b", null, "\u53EA\u8981\u5BEB\u90A3\u5E7E\u500B\u5B57"), "\uFF0C\u4E0D\u7528\u5BEB\u6574\u53E5"), /*#__PURE__*/React.createElement("div", {
    className: 'ta-prompt' + (isTr ? ' tr' : '') + (isTf ? ' tf' : '') + (isWd ? ' wd' : '')
  }, isWd && current?.wrongPart ? taMarkWrong(current.prompt, current.wrongPart) : current?.prompt), isTr && (current?.hint || current?.answer) && result === null && (showHint ? /*#__PURE__*/React.createElement("div", {
    className: "ta-hint"
  }, "\uD83D\uDCA1 ", current.hint || '', current.hint ? '　' : '', "\uFF08\u5171 ", String(current.answer || '').split(/\s+/).length, " \u500B\u5B57\uFF09") : /*#__PURE__*/React.createElement("button", {
    className: "ta-hint-btn",
    onClick: () => setShowHint(true)
  }, "\uD83D\uDCA1 \u63D0\u793A"))), /*#__PURE__*/React.createElement("div", {
    className: "ta-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    className: `ta-input${isTr || isRw || isTf ? ' tr long' : ''}${isWd ? ' wd' : ''}${result === 'correct' ? ' correct' : result === 'wrong' ? ' wrong' : ''}`,
    value: input,
    onChange: e => {
      if (result === null) setInput(e.target.value);
    },
    onKeyDown: handleKey,
    placeholder: isTr ? 'Type the English sentence…' : isRw ? 'Rewrite the sentence…' : isTf ? 'Type the new sentence…' : isWd ? '只寫改好的那幾個字…' : 'Type your answer…',
    disabled: result !== null || judging,
    autoComplete: "off",
    autoCapitalize: "none",
    spellCheck: false
  }), result === 'wrong' && /*#__PURE__*/React.createElement("div", {
    className: "ta-correct-ans"
  }, "\u2713 ", current.answer)), /*#__PURE__*/React.createElement("div", {
    className: "qm-feedback",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    style: {
      marginTop: result ? 8 : 0
    },
    onPointerDown: clearAuto,
    onKeyDown: clearAuto
  }, result === null ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: check,
    disabled: !input.trim() || judging
  }, judging ? '🤖 老師小幫手檢查中…' : '確認 · Check →') : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: `qm-feedback-banner ${result}`
  }, result === 'correct' ? '✓ Correct! 答對了！' : `✗ 正解：${current.answer}`), tip && /*#__PURE__*/React.createElement("div", {
    className: 'ta-ai-tip' + (result === 'correct' ? ' ok' : '')
  }, "\uD83E\uDD16 ", tip), current.explain && /*#__PURE__*/React.createElement("div", {
    className: "ta-explain"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ta-explain-icon"
  }, "\uD83D\uDCA1"), /*#__PURE__*/React.createElement("span", null, current.explain)), /*#__PURE__*/React.createElement(QmAutoHint, {
    kind: result !== 'correct' || isLast ? null : current.explain ? 'explain' : 'plain'
  }), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: () => next()
  }, isLast ? '查看成績 →' : '下一題 →'))));
}

/* ══════════════════════════════════════════════════════
   QUICK FLASHCARD REVIEW
══════════════════════════════════════════════════════ */
function QuickFlashcardReview({
  item,
  onDone
}) {
  var cards = useQMM(() => shuffleArr(getFlashcardData(item)), [item]);
  var [idx, setIdx] = useQM(0);
  var [flipped, setFlipped] = useQM(false);
  if (cards.length === 0) {
    onDone();
    return null;
  }
  var card = cards[idx];
  var isLast = idx === cards.length - 1;
  var pct = Math.round(idx / cards.length * 100);
  var next = () => {
    if (isLast) {
      onDone();
    } else {
      setIdx(i => i + 1);
      setFlipped(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar",
    style: {
      flex: 1,
      marginRight: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-fill",
    style: {
      width: pct + '%'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "qm-player-counter"
  }, idx + 1, " / ", cards.length), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    style: {
      marginLeft: 16,
      padding: '6px 14px',
      fontSize: 12
    },
    onClick: onDone
  }, "\u8DF3\u904E \u2192 \u958B\u59CB\u6E2C\u9A57")), /*#__PURE__*/React.createElement("div", {
    className: `qm-fc-card${flipped ? ' flipped' : ''}`,
    onClick: () => setFlipped(f => !f)
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-side qm-fc-front"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-text"
  }, card.front), /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-tap"
  }, "\u9EDE\u64CA\u7FFB\u9762 \xB7 tap to flip")), /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-side qm-fc-back"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-fc-text"
  }, card.back))), flipped && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    style: {
      width: 'auto',
      minWidth: 160
    },
    onClick: () => next()
  }, isLast ? '完成！開始測驗 →' : '下一張 →')));
}

/* ══════════════════════════════════════════════════════
   QUIZ PLAYER
══════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════
   QUIZ RESULT SCREEN — animated Duolingo-style
══════════════════════════════════════════════════════ */
/* v375(#7): 練習做完的小慶祝——音效＋彩帶＋星星（吉祥物聽到音效也會自己跳起來）。
   pct 省略＝當成有達標。fireCelebration 給「不是結果頁」的完成點直接呼叫；
   結果頁一律包 <QmCelebrate>，掛載時放一次，不會因為重繪放好幾次。 */
var QM_CHEER_EN = ['Great job!', 'Well done!', 'Awesome work!', 'Fantastic!', 'You did it!', 'Excellent!'];
var QM_TRY_EN = ['Nice try!', 'Good effort!', 'Keep going!', 'Almost there!'];
function fireCelebration(pct) {
  var great = pct == null || pct >= 80;
  if (window.playSound) window.playSound(great ? 'fanfare' : 'complete');
  if (window.spawnConfetti) window.spawnConfetti({
    big: great
  });
  if (great && window.triggerStarBurst) window.triggerStarBurst();
  // v375(#7): 「配音」——做完唸一句英文稱讚（等音效走完再唸，不會疊在一起）
  var line = (great ? QM_CHEER_EN : QM_TRY_EN)[Math.floor(Math.random() * (great ? QM_CHEER_EN : QM_TRY_EN).length)];
  setTimeout(() => {
    try {
      (window.speakTTS || window.speakText)(line, {
        lang: 'en-US'
      });
    } catch (e) {}
  }, 900);
}
function QmCelebrate({
  pct,
  children
}) {
  useQME(() => {
    fireCelebration(pct);
  }, []);
  return children;
}
function QuizResultScreen({
  finalScore,
  total,
  finalPct,
  title,
  wrongList,
  onRestart,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var starCount = starsFromScore(finalPct);
  var reached = finalPct >= 80; // v311 (#21): 80 分達成任務
  // v311 (#8): 每個孩子做完都先被肯定「你完成了這一輪」，再誠實顯示達標狀態——低分也不冷。
  var msg = finalPct === 100 ? '滿分！一題都沒錯 ⭐' : finalPct >= 80 ? '很棒，達標了！' : finalPct >= 60 ? '快到了，再拚一下就達標！' : '做完囉！多看幾次會更熟 💪';
  var animScore = useCountUp(finalScore, 900, 400);
  var animPct = useCountUp(finalPct, 900, 400);
  return /*#__PURE__*/React.createElement(QmCelebrate, {
    pct: finalPct
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-result"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-result-stars"
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `qm-result-star ${i < starCount ? 'earned' : 'empty'}`,
    style: {
      animationDelay: `${0.1 + i * 0.25}s`
    }
  }, i < starCount ? '⭐' : '☆'))), /*#__PURE__*/React.createElement("div", {
    className: "qm-result-cat-title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "qm-result-score"
  }, /*#__PURE__*/React.createElement("span", {
    className: "qm-result-num"
  }, animScore), /*#__PURE__*/React.createElement("span", {
    className: "qm-result-denom"
  }, " / ", total)), /*#__PURE__*/React.createElement("div", {
    className: "qm-result-pct"
  }, "\u7B54\u5C0D\u7387 ", animPct, "%"), /*#__PURE__*/React.createElement("div", {
    className: `qm-result-goal${reached ? ' reached' : ''}`
  }, reached ? '🎉 達成任務！這一項完成了' : `再 ${Math.max(1, 80 - finalPct)} 分就達成任務 ⭐`), window.hwDoubleOn && window.hwDoubleOn() && /*#__PURE__*/React.createElement("div", {
    className: "hw-x2-chip",
    role: "note"
  }, "\uD83C\uDF83 \u842C\u8056\u7BC0\u9650\u6642 \xB7 \u9019\u6B21\u7684\u661F\u661F ", /*#__PURE__*/React.createElement("b", null, "\xD72")), /*#__PURE__*/React.createElement("div", {
    className: "qm-result-msg"
  }, msg), /*#__PURE__*/React.createElement("div", {
    className: "qm-result-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: onRestart
  }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
    onBack: onBack,
    onBackToTasks: onBackToTasks,
    onNextTask: onNextTask,
    backLabel: "\u56DE\u55AE\u5143\u5217\u8868 \u2192"
  })), onBackToTasks && /*#__PURE__*/React.createElement("button", {
    className: "qm-result-alt",
    onClick: onBack
  }, "\u7559\u5728\u9019\u4E00\u985E\uFF0C\u770B\u55AE\u5143\u5217\u8868 \u2192"), wrongList && wrongList.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "qm-wrong-list"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-wrong-title"
  }, "\u9700\u8981\u8907\u7FD2\uFF08", wrongList.length, "\uFF09"), wrongList.map((wq, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "qm-wrong-item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "qm-wrong-q"
  }, wq.q), /*#__PURE__*/React.createElement("span", {
    className: "qm-wrong-a"
  }, wq.options[wq.correct]))))));
}
function QuizModePlayer({
  cat,
  item,
  questions,
  progressKey,
  weekId,
  allQuizItems,
  onBack,
  onQuizDone,
  onBackToTasks,
  onNextTask
}) {
  // Adaptive deck: wrong questions are reinserted QM_RETRY_GAP (4) positions later
  // （v392: 註解本來寫 3，實際 splice 是 +4——現在統一走同一個常數，不會再對不上）
  var uniqueTotal = questions.length;
  // 有做到一半的紀錄 → 從那一題接著做（deck 含補考題、對錯數都還原）
  var resume = useQMM(() => getResume(progressKey, questions.length), []);
  var [deck, setDeck] = useQM(() => resume ? resume.deck : [...questions]);
  var [deckPos, setDeckPos] = useQM(() => resume ? resume.deckPos : 0);
  var [selected, setSelected] = useQM(null);
  var [firstRight, setFirstRight] = useQM(() => resume ? resume.firstRight : 0); // correct on FIRST attempt (for score)
  var [screen, setScreen] = useQM('quiz');
  var [wrongList, setWrongList] = useQM(() => resume ? resume.wrongList || [] : []);
  var [plusOneKey, setPlusOneKey] = useQM(0);
  var [lastRight, setLastRight] = useQM(null);
  /* v375(#1) → v392: 改用共用的 useAutoNext。
     原本的 autoOnExplain（只有 type:'fillblank' 才自動跳）已刪除——
     同樣是選擇題卻一個會自己跳、一個要按，學生根本猜不到規則。現在兩者一模一樣。 */
  var {
    scheduleAuto,
    clearAuto
  } = useAutoNext();
  var q = deck[deckPos];
  var total = uniqueTotal;
  var isLast = deckPos >= deck.length - 1;
  // Progress = first-try correct / unique total
  var pct = Math.round(firstRight / total * 100);

  // Auto-play listening questions when they appear (may silently fail on iOS
  // before the first user gesture — the 🔊 button always works as fallback).
  useQME(() => {
    var cur = deck[deckPos];
    if (cur?.qtype === 'listening' && screen === 'quiz') {
      (window.speakTTS || window.speakText)(cur.word);
    }
  }, [deckPos, screen]);

  // 每前進一題就把進度存起來——中途關掉，下次不用重來
  useQME(() => {
    if (screen !== 'quiz' || deckPos <= 0) return;
    saveResume(progressKey, {
      deck,
      deckPos,
      firstRight,
      wrongList,
      uniqueTotal
    });
  }, [deckPos]);

  // v234: 鍵盤作答——1~4（或 A~D）選答案，Enter 下一題
  useQME(() => {
    var onKey = e => {
      if (screen !== 'quiz') return;
      var t = e.target;
      /* v390 修正：本來把「所有按鍵 × 所有按鈕」全擋掉，結果是
         「用滑鼠點了選項之後，1~4 與 Enter 全部失效」——因為瀏覽器會把焦點留在
         那顆 .qm-option 按鈕上。真正要防的只有「Enter/空白鍵落在按鈕上時，
         原生 click 已經觸發過一次」這一種雙重觸發，所以只擋這一種。 */
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.key === 'Enter' || e.key === ' ') && t && t.closest && t.closest('button, a[href], [role="button"]')) return;
      var cur = deck[deckPos];
      if (!cur || !cur.options) return;
      var letterMap = {
        a: 0,
        b: 1,
        c: 2,
        d: 3
      };
      var idx = /^[1-9]$/.test(e.key) ? parseInt(e.key, 10) - 1 : letterMap[e.key.toLowerCase()] !== undefined ? letterMap[e.key.toLowerCase()] : -1;
      if (idx >= 0 && idx < cur.options.length && selected === null) {
        handleSelect(idx);
        return;
      }
      if (e.key === 'Enter' && selected !== null) handleNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  if (!q) return null;
  var goToNextQuestion = () => {
    clearAuto();
    setDeckPos(i => i + 1);
    setSelected(null);
    setLastRight(null);
  };
  var completeQuiz = (fs = firstRight, finalWrongList = wrongList) => {
    clearAuto();
    clearResume(progressKey); // 做完了 → 清掉中途紀錄
    var wrongQuestions = finalWrongList.map(wq => ({
      q: wq.q,
      answer: wq.options[wq.correct]
    }));
    var prev = saveQuizModeCompletion(progressKey, item, {
      doneCount: total,
      score: fs,
      total,
      wrongQuestions
    });
    // v375: 音效／彩帶／星星改由結果頁的 <QmCelebrate> 統一放（不然會放兩次）
    if (onQuizDone) onQuizDone();
    var allWeekQuizDone = (allQuizItems || []).every(it => prev[`${weekId}_${it.id}`]);
    if (window._onQuizComplete) {
      window._onQuizComplete(fs, total, finalWrongList, {
        weekId,
        itemId: progressKey,
        itemTitle: item?.title || '',
        allWeekQuizDone
      });
    }
    setScreen('result');
  };

  /* ⚠ v442（Alan 的學生找到的）：「答錯直接跳出去，再回來按繼續上一題，
     還是剛剛錯的那一題」——續做紀錄本來只在「換到下一題」時才存，
     所以答完就離開＝停在同一題，回來可以先去查答案再作答一次。
     改成**一作答就先把下一題的位置存起來**（最後一題沒有下一題，維持原樣）。 */
  var saveAfterAnswer = (nextDeck, nextFirstRight, nextWrongList) => {
    if (isLast) return;
    saveResume(progressKey, {
      deck: nextDeck,
      deckPos: deckPos + 1,
      firstRight: nextFirstRight,
      wrongList: nextWrongList,
      uniqueTotal
    });
  };
  var handleSelect = optIdx => {
    if (selected !== null) return;
    setSelected(optIdx);
    var correct = optIdx === q.correct;
    if (window.playSound) window.playSound(correct ? 'correct' : 'wrong');
    if (correct) {
      var nextFirstRight = !q._retry ? firstRight + 1 : firstRight;
      setFirstRight(nextFirstRight);
      setPlusOneKey(k => k + 1);
      setLastRight(true);
      saveAfterAnswer(deck, nextFirstRight, wrongList);
      /* v392: 統一節奏——沒解說 1 秒、有解說 4 秒（碰到回饋區就取消倒數）；
         最後一題一律不自動跳，停在「✓ 答對了！」讓學生自己按「查看成績 →」，
         結果頁的彩帶才不會跟答對音效撞在一起。 */
      if (!isLast) scheduleAuto(goToNextQuestion, q.explain ? QM_AUTO_MS_EXPLAIN : QM_AUTO_MS_PLAIN);
      return;
    }

    /* v511：連「他選了哪一個」一起記下來。
       「他把 ate 寫成 eated」比「他答錯了 ate」有用太多——
       針對性出題要診斷的是**錯的方向**，不是錯的次數。 */
    var nextWrongList = !q._retry ? [...wrongList, {
      ...q,
      _picked: optIdx
    }] : wrongList;
    setWrongList(nextWrongList);
    var nextDeck = [...deck];
    nextDeck.splice(Math.min(deckPos + QM_RETRY_GAP, nextDeck.length), 0, {
      ...q,
      _retry: true
    });
    setDeck(nextDeck);
    setLastRight(false);
    saveAfterAnswer(nextDeck, firstRight, nextWrongList);
  };
  var handleNext = () => {
    if (isLast) {
      completeQuiz(firstRight, wrongList);
    } else {
      goToNextQuestion();
    }
  };
  var restart = () => {
    setDeck([...questions]);
    setDeckPos(0);
    setSelected(null);
    setFirstRight(0);
    setScreen('quiz');
    setWrongList([]);
    setLastRight(null);
    setPlusOneKey(0);
  };

  /* ── Result ── */
  if (screen === 'result') {
    var finalScore = firstRight;
    var finalPct = Math.round(finalScore / total * 100);
    return /*#__PURE__*/React.createElement(QuizResultScreen, {
      finalScore: finalScore,
      total: total,
      finalPct: finalPct,
      title: item?.title || cat.title,
      wrongList: wrongList,
      onRestart: restart,
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask
    });
  }

  /* ── Quiz ── */
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-player-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
    onClick: () => {
      clearAuto();
      onBack();
    },
    title: "Back to units"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-fill",
    style: {
      width: pct + '%'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "qm-player-counter"
  }, "\u9084\u5269 ", uniqueTotal - firstRight, " \u984C"), /*#__PURE__*/React.createElement(QmPassageDrawer, {
    text: item && item.passage,
    title: item && item.title,
    compact: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-score-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: `qm-score-badge${lastRight === false ? ' shake' : ''}`
  }, "\u2B50 ", firstRight), lastRight === true && /*#__PURE__*/React.createElement("span", {
    key: plusOneKey,
    className: "qm-plus-one"
  }, "+1"))), /*#__PURE__*/React.createElement("div", {
    key: deckPos,
    className: "qm-question-area qm-question-swap"
  }, q.hint && /*#__PURE__*/React.createElement("div", {
    className: "qm-question-hint"
  }, q.hint), q.qtype === 'listening' ? /*#__PURE__*/React.createElement("button", {
    className: "qm-listen-btn",
    onClick: () => (window.speakTTS || window.speakText)(q.word),
    title: "\u518D\u807D\u4E00\u6B21"
  }, /*#__PURE__*/React.createElement("span", {
    className: "qm-listen-icon"
  }, "\uD83D\uDD0A"), /*#__PURE__*/React.createElement("span", {
    className: "qm-listen-label"
  }, "\u9EDE\u64CA\u91CD\u807D \xB7 Tap to replay")) : (() => {
    // v475：字義選擇＝短文排小、目標字標起來、問題才用題目的字級
    var sp = qmSenseParts(q);
    if (sp) return /*#__PURE__*/React.createElement("div", {
      className: "qm-sense"
    }, sp.title && /*#__PURE__*/React.createElement("div", {
      className: "qm-sense-title"
    }, sp.title), /*#__PURE__*/React.createElement("div", {
      className: "qm-sense-passage"
    }, qmMarkWord(sp.passage, sp.word)), /*#__PURE__*/React.createElement("div", {
      className: "qm-sense-ask"
    }, sp.ask));
    return /*#__PURE__*/React.createElement("div", {
      className: "qm-question-text"
    }, item && /^gn/.test(String(item.id || '')) && window.gnCleanStem ? window.gnCleanStem(q.q, q.options) : q.q);
  })()), /*#__PURE__*/React.createElement("div", {
    key: `opts-${deckPos}`,
    className: "qm-options qm-options-swap"
  }, q.options.map((opt, i) => {
    var cls = 'qm-option';
    if (selected !== null) {
      if (i === q.correct) cls += ' correct';else if (i === selected) cls += ' wrong';else cls += ' dim';
    }
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      className: cls,
      onClick: () => handleSelect(i)
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-opt-letter"
    }, ['A', 'B', 'C', 'D'][i]), /*#__PURE__*/React.createElement("span", {
      className: "qm-opt-text"
    }, opt));
  })), selected !== null &&
  /*#__PURE__*/
  /* v392: 碰到回饋區（或在裡面按鍵）就取消倒數——解說最長 77 個字元，
     讀到一半被跳走比不自動跳還糟 */
  React.createElement("div", {
    className: "qm-feedback",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    onPointerDown: clearAuto,
    onKeyDown: clearAuto
  }, /*#__PURE__*/React.createElement("div", {
    className: `qm-feedback-banner ${selected === q.correct ? 'correct' : 'wrong'}`
  }, selected === q.correct ? '✓ Correct! 答對了！' : `✗ 正解：${q.options[q.correct]}`), q.explain && /*#__PURE__*/React.createElement("div", {
    className: "qm-explain"
  }, q.explain), /*#__PURE__*/React.createElement(QmAutoHint, {
    kind: selected !== q.correct || isLast ? null : q.explain ? 'explain' : 'plain'
  }), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: handleNext
  }, isLast ? '查看成績 →' : '下一題 →')));
}

/* ══════════════════════════════════════════════════════
   WRITING PRACTICE INTRO
══════════════════════════════════════════════════════ */
function getWritingPracticePrompts(item, catItems) {
  var allFc = (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0);
  var fc = item.linkedFlashcardId ? allFc.find(it => it.id === item.linkedFlashcardId) || allFc[0] : null;
  var fromFlashcard = fc ? (fc.cards || []).map(c => ({
    word: c.term || c.front || c.en || '',
    zh: c.zh || c.back || '',
    instruction: 'Use the word in a sentence',
    source: 'flashcard'
  })).filter(c => c.word.trim()) : [];
  var custom = (item.writingPrompts || []).map(p => ({
    word: p.word || p.prompt || '',
    zh: p.zh || '',
    instruction: p.instruction || '',
    source: 'custom'
  })).filter(p => p.word.trim());
  return [...fromFlashcard, ...custom];
}
function WritingPracticeIntro({
  item,
  catItems,
  onStart
}) {
  var prompts = getWritingPracticePrompts(item, catItems);
  var wordCount = prompts.length;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\u270D"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, wordCount, " prompts \xB7 AI \u9020\u53E5\u6279\u6539"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("span", null, "\u6BCF\u500B\u984C\u76EE\u9020\u4E00\u500B\u82F1\u6587\u53E5\u5B50")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCF"), /*#__PURE__*/React.createElement("span", null, "\u81F3\u5C11 7 \u500B\u5B57")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u5FC5\u9808\u7B26\u5408\u984C\u76EE\u8981\u6C42\u6216\u6B63\u78BA\u8868\u9054\u55AE\u5B57\u610F\u601D")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2B50"), /*#__PURE__*/React.createElement("span", null, "AI \u8A55\u5206\uFF0C\u6700\u9AD8 5 \u9846\u661F"))), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, "\u958B\u59CB\u7DF4\u7FD2 \xB7 Start Writing \u2192")));
}

/* ══════════════════════════════════════════════════════
   WRITING PRACTICE PLAYER
══════════════════════════════════════════════════════ */
function WritingPracticePlayer({
  item,
  catItems,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var words = useQMM(() => getWritingPracticePrompts(item, catItems), [item, catItems]);
  var [idx, setIdx] = useQM(0);
  var [sentence, setSentence] = useQM('');
  var [feedback, setFeedback] = useQM('');
  var [gradeErr, setGradeErr] = useQM(''); // v306: 批改失敗訊息（不計分、可重送）
  var [checking, setChecking] = useQM(false);
  var [scores, setScores] = useQM([]); // array of star counts (1-5)
  var [done, setDone] = useQM(false);
  var current = words[idx];
  var total = words.length;
  var extractStars = text => {
    var filled = (text.match(/⭐/g) || []).length;
    if (filled > 0) return Math.min(5, filled);
    var m = text.match(/[★☆]{1,5}/);
    if (!m) return 3;
    return (m[0].match(/★/g) || []).length;
  };
  var submit = async () => {
    if (!sentence.trim() || checking || feedback) return;
    setChecking(true);
    setFeedback('');
    setGradeErr('');
    var result = await window.checkWriting(current.word, sentence, current.instruction || '', current.zh || '');
    if (!gradeSucceeded(result)) {
      // v306: AI 連不上→不計分、不存、留著讓學生再送一次
      setGradeErr(result || 'AI 批改暫時連不上，請再送一次。');
      setChecking(false);
      return;
    }
    setFeedback(result);
    var stars = extractStars(result);
    setScores(prev => [...prev, stars]);
    setChecking(false);
  };
  var handleSentenceKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey && !feedback && !checking) {
      e.preventDefault();
      submit();
    }
  };
  var next = () => {
    if (idx + 1 >= total) {
      var avgStars = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      saveQuizModeCompletion(progressKey, item, {
        doneCount: 1,
        score: avgStars,
        total: 5
      });
      setDone(true);
      return;
    }
    setIdx(idx + 1);
    setSentence('');
    setFeedback('');
  };
  var avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  var avgDisplay = scores.length ? avg.toFixed(1) : '—';
  if (!words.length) return /*#__PURE__*/React.createElement("div", {
    className: "wp-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-icon"
  }, "\u270D"), /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-msg"
  }, "\u627E\u4E0D\u5230\u9020\u53E5\u984C"), /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-sub"
  }, "\u8ACB\u7D81\u5B9A\u55AE\u5B57\u5361\uFF0C\u6216\u5728\u7DE8\u8F2F\u6A21\u5F0F\u4E2D\u65B0\u589E\u81EA\u8A02\u9020\u53E5\u984C"));
  if (done) return /*#__PURE__*/React.createElement("div", {
    className: "wp-done"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-done-icon"
  }, "\u2726"), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-title"
  }, "Writing Practice Complete"), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-sub"
  }, "\u5DF2\u5B8C\u6210 ", total, " \u984C\u9020\u53E5"), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-score"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wp-done-avg"
  }, avgDisplay), /*#__PURE__*/React.createElement("span", {
    className: "wp-done-maxstar"
  }, " / 5 \u2605")), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-breakdown"
  }, words.map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wp-done-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wp-done-word"
  }, w.word), /*#__PURE__*/React.createElement("span", {
    className: "wp-done-stars"
  }, '★'.repeat(scores[i] || 0), '☆'.repeat(5 - (scores[i] || 0)))))), /*#__PURE__*/React.createElement("div", {
    className: "qm-result-btns",
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(QmDoneNavBtns, {
    onBack: onBack,
    onBackToTasks: onBackToTasks,
    onNextTask: onNextTask,
    backLabel: "\u2190 \u8FD4\u56DE"
  })));
  return /*#__PURE__*/React.createElement("div", {
    className: "wp-player"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-progress-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-progress-fill",
    style: {
      width: `${idx / total * 100}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "wp-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "wp-back",
    "aria-label": "\u4E0A\u4E00\u6B65",
    onClick: onBack
  }, "\u2190"), /*#__PURE__*/React.createElement("span", {
    className: "wp-counter"
  }, idx + 1, " / ", total), /*#__PURE__*/React.createElement("span", {
    className: "wp-avg"
  }, scores.length > 0 ? `avg ${avgDisplay}★` : '')), /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "wp-card qm-question-swap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-instruction"
  }, current.instruction || 'Use this prompt in a sentence'), /*#__PURE__*/React.createElement("div", {
    className: "wp-word"
  }, current.word), current.zh && /*#__PURE__*/React.createElement("div", {
    className: "wp-zh"
  }, current.zh), /*#__PURE__*/React.createElement("div", {
    className: "wp-rules"
  }, /*#__PURE__*/React.createElement("span", null, "\xB7 Must clearly answer the prompt"), /*#__PURE__*/React.createElement("span", null, "\xB7 At least 7 words"))), /*#__PURE__*/React.createElement("textarea", {
    className: "qm-writing-input wp-input",
    value: sentence,
    onChange: e => setSentence(e.target.value),
    onKeyDown: handleSentenceKeyDown,
    placeholder: `Write a sentence for "${current.word}"…`,
    disabled: !!feedback
  }), !feedback ? /*#__PURE__*/React.createElement(React.Fragment, null, gradeErr && /*#__PURE__*/React.createElement("div", {
    className: "qm-grade-err"
  }, "\u26A0 ", gradeErr), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary wp-submit",
    onClick: submit,
    disabled: checking || !sentence.trim()
  }, checking ? '批改中…' : gradeErr ? '再送一次 →' : '送出批改 →')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(WritingFeedback, {
    text: feedback
  }), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary wp-next",
    onClick: () => next()
  }, idx + 1 >= total ? '完成 ✦' : '下一題 →')));
}

/* ══════════════════════════════════════════════════════
   SHORT ANSWER — INTRO
══════════════════════════════════════════════════════ */
function ShortAnswerIntro({
  item,
  onStart,
  prog
}) {
  var qCount = (item.saQuestions || []).length;
  var ytUrl = item.saYoutube || '';
  var embedSrc = ytUrl ? window.toYouTubeEmbed(ytUrl) : '';
  return /*#__PURE__*/React.createElement("div", {
    className: `qm-intro${embedSrc ? ' sa-intro-wide' : ''}`
  }, embedSrc ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sa-intro-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon",
    style: {
      fontSize: 28
    }
  }, "\uD83D\uDCFA"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title",
    style: {
      marginBottom: 4
    }
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, qCount, " \u984C\u77ED\u7B54 \xB7 \u5148\u770B\u5F71\u7247\u8907\u7FD2\u518D\u958B\u59CB"))), /*#__PURE__*/React.createElement("div", {
    className: "sa-intro-video"
  }, /*#__PURE__*/React.createElement("iframe", {
    src: embedSrc,
    frameBorder: "0",
    allowFullScreen: true,
    allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    style: {
      width: '100%',
      height: '100%',
      borderRadius: 8
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules",
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCFA"), /*#__PURE__*/React.createElement("span", null, "\u770B\u5B8C\u5F71\u7247\u5F8C\u518D\u958B\u59CB\u4F5C\u7B54")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u270D"), /*#__PURE__*/React.createElement("span", null, "\u7528\u82F1\u6587\u6253\u5B57\u56DE\u7B54\uFF0C\u76E1\u91CF\u5B8C\u6574")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2B50"), /*#__PURE__*/React.createElement("span", null, "AI \u8A55\u5206\uFF0C\u6BCF\u984C\u6700\u9AD8 5 \u9846\u661F")))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, qCount, " \u984C\u77ED\u7B54 \xB7 AI \u95B1\u8B80\u7406\u89E3\u6279\u6539"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u270D"), /*#__PURE__*/React.createElement("span", null, "\u7528\u82F1\u6587\u6253\u5B57\u56DE\u7B54\uFF0C\u76E1\u91CF\u5B8C\u6574")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2B50"), /*#__PURE__*/React.createElement("span", null, "AI \u8A55\u5206\uFF0C\u6BCF\u984C\u6700\u9AD8 5 \u9846\u661F")))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, embedSrc ? '✅ 看完了，開始作答 →' : '開始作答 · Start →')));
}

/* ══════════════════════════════════════════════════════
   SHORT ANSWER — PLAYER
══════════════════════════════════════════════════════ */
function ShortAnswerPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var questions = item.saQuestions || [];
  var passage = item.passage || '';
  var [idx, setIdx] = useQM(0);
  var [answer, setAnswer] = useQM('');
  var [feedback, setFeedback] = useQM('');
  var [gradeErr, setGradeErr] = useQM(''); // v306: 批改失敗（不計分、可重送）
  var [checking, setChecking] = useQM(false);
  var [scores, setScores] = useQM([]);
  var [done, setDone] = useQM(false);
  var wrongsRef = React.useRef([]); // v258: AI 評 2 星以下＝需要加強的題目

  var current = questions[idx];
  var total = questions.length;
  var extractStars = text => {
    // New format: count ⭐ from 【Score】 block (1-5 scale)
    var filled = (text.match(/⭐/g) || []).length;
    if (filled > 0) return Math.min(5, filled);
    // Legacy fallback: ★ stars
    var m = text.match(/[★☆]{1,5}/);
    if (!m) return 3;
    return (m[0].match(/★/g) || []).length;
  };
  var submit = async () => {
    if (!answer.trim() || checking || feedback) return;
    setChecking(true);
    setFeedback('');
    setGradeErr('');
    var result = await window.checkShortAnswer(current.question, current.keyPoints || '', passage, answer);
    if (!gradeSucceeded(result)) {
      // v306: AI 連不上→不計分、不存、可重送
      setGradeErr(result || 'AI 批改暫時連不上，請再送一次。');
      setChecking(false);
      return;
    }
    setFeedback(result);
    var stars = extractStars(result);
    setScores(prev => [...prev, stars]);
    if (stars <= 2) {
      wrongsRef.current.push({
        q: current.question,
        answer: current.keyPoints || '（參考 AI 回饋）'
      });
    }
    setChecking(false);
  };
  var handleShortAnswerKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey && !feedback && !checking) {
      e.preventDefault();
      submit();
    }
  };
  var next = () => {
    if (idx + 1 >= total) {
      var avgStars = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      saveQuizModeCompletion(progressKey, item, {
        doneCount: 1,
        score: avgStars,
        total: 5,
        wrongQuestions: wrongsRef.current
      });
      setDone(true);
      return;
    }
    setIdx(idx + 1);
    setAnswer('');
    setFeedback('');
  };
  var avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  if (!questions.length) return /*#__PURE__*/React.createElement("div", {
    className: "wp-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-icon"
  }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-msg"
  }, "\u5C1A\u7121\u554F\u984C"), /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-sub"
  }, "\u8ACB\u5728\u7DE8\u8F2F\u6A21\u5F0F\u4E2D\u65B0\u589E\u554F\u984C"));
  if (done) return /*#__PURE__*/React.createElement("div", {
    className: "wp-done"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-done-icon"
  }, "\u2726"), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-title"
  }, "Reading Complete!"), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-sub"
  }, "\u5DF2\u5B8C\u6210 ", total, " \u984C\u95B1\u8B80\u7406\u89E3"), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-score"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wp-done-avg"
  }, avg.toFixed(1)), /*#__PURE__*/React.createElement("span", {
    className: "wp-done-maxstar"
  }, " / 5 \u2605")), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-breakdown"
  }, questions.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "wp-done-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wp-done-word",
    style: {
      flex: 1,
      textAlign: 'left',
      fontSize: 12
    }
  }, q.question), /*#__PURE__*/React.createElement("span", {
    className: "wp-done-stars"
  }, '★'.repeat(scores[i] || 0), '☆'.repeat(5 - (scores[i] || 0)))))), /*#__PURE__*/React.createElement("div", {
    className: "qm-result-btns",
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(QmDoneNavBtns, {
    onBack: onBack,
    onBackToTasks: onBackToTasks,
    onNextTask: onNextTask,
    backLabel: "\u2190 \u8FD4\u56DE"
  })));
  return /*#__PURE__*/React.createElement("div", {
    className: "wp-player sa-player"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-progress-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-progress-fill",
    style: {
      width: `${idx / total * 100}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "wp-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "wp-back",
    "aria-label": "\u4E0A\u4E00\u6B65",
    onClick: onBack
  }, "\u2190"), /*#__PURE__*/React.createElement("span", {
    className: "wp-counter"
  }, idx + 1, " / ", total)), item.saShowPassage && /*#__PURE__*/React.createElement(QmPassageDrawer, {
    text: item.passage,
    title: item.title
  }), /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "wp-card qm-question-swap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-instruction"
  }, "Question ", idx + 1), /*#__PURE__*/React.createElement("div", {
    className: "sa-question"
  }, current.question)), /*#__PURE__*/React.createElement("textarea", {
    className: "qm-writing-input wp-input sa-input",
    value: answer,
    onChange: e => setAnswer(e.target.value),
    onKeyDown: handleShortAnswerKeyDown,
    placeholder: "Write your answer here\u2026",
    disabled: !!feedback,
    rows: 4
  }), !feedback ? /*#__PURE__*/React.createElement(React.Fragment, null, gradeErr && /*#__PURE__*/React.createElement("div", {
    className: "qm-grade-err"
  }, "\u26A0 ", gradeErr), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary wp-submit",
    onClick: submit,
    disabled: checking || !answer.trim()
  }, checking ? '🤖 批改中…' : gradeErr ? '再送一次 →' : '送出答案 →')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(WritingFeedback, {
    text: feedback
  }), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary wp-next",
    onClick: () => next()
  }, idx + 1 >= total ? '完成 ✦' : '下一題 →')));
}

/* ══════════════════════════════════════════════════════
   GUIDED READING 分段閱讀 — INTRO + PLAYER (v276)
   長文切小段：每讀完一小段馬上答題（注意力有錨點）；
   短文＝一段、問題在最後。讀過的段落留在上面可回頭看。
══════════════════════════════════════════════════════ */
function grExtractStars(text) {
  var filled = (String(text || '').match(/⭐/g) || []).length;
  if (filled > 0) return Math.min(5, filled);
  var m = String(text || '').match(/[★☆]{1,5}/);
  if (!m) return 3;
  return (m[0].match(/★/g) || []).length;
}
// 選項照老師順序（不洗牌——閱讀理解常有「以上皆是」型選項）；空白選項剔除後修正正解索引
function grNormalizeQ(q) {
  if (q.kind === 'short') return q;
  var opts = (q.options || []).map(o => String(o || '').trim());
  var ansTxt = opts[q.answer != null ? q.answer : 0];
  var kept = opts.filter(Boolean);
  return {
    ...q,
    options: kept,
    correct: Math.max(0, kept.indexOf(ansTxt))
  };
}

/* v277: 段落照片切片——只存裁切範圍 {url, ar, y0, y1}（0~1 高度比例），
   不產生新圖片：CSS 高度=寬×ar×(y1-y0)、img translateY(-y0%) 顯示該帶。 */
/* v410（Alan：「取消放大功能 這很麻煩」）：拿掉整張圖的「點一下放大」。
   點圖放大原本會蓋掉整個畫面，而字本來就點得到（下面的 .grd-word 一個字一個框），
   放大反而多一層要關掉的東西，還會把「想點字卻點到空白」變成開燈箱。 */
function GrImgCrop({
  img,
  className,
  onWord,
  onSide,
  sideBusy,
  hlRect
}) {
  var y0 = img.y0 || 0;
  var y1 = img.y1 == null ? 1 : img.y1;
  var band = Math.max(0.02, y1 - y0);
  var ar = img.ar || 1.3;
  // v282: 載入前 shimmer、載完淡入。⚠ 不能用 loading="lazy"——瀏覽器會刻意延後載入，
  // 就是 Alan 抱怨「圖片要跑一小段時間」的元凶之一
  var [loaded, setLoaded] = useQM(false);
  // v287: 點字查義——OCR 字框疊在照片上（只疊這個裁切帶內的字）
  var [wdata, setWdata] = useQM(null);
  var imgRef = React.useRef(null);
  useQME(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth) setLoaded(true);
  }, []);
  var wkey = img.wordsId || img.wordsUrl;
  useQME(() => {
    var dead = false;
    if (wkey && onWord) grFetchWords(wkey).then(d => {
      if (!dead && d) setWdata(d);
    });
    return () => {
      dead = true;
    };
  }, [wkey, !!onWord]);
  var bandWords = (onWord && wdata && wdata.words ? wdata.words : []).filter(w => {
    var cy = w.y + (w.h || 0) / 2;
    return cy >= y0 && cy <= y1;
  });
  return (
    /*#__PURE__*/
    /* v412: 外面多包一層 .grd-fit 專門負責「最寬可以多寬」。
       ⚠ 不能直接在 .grd-img 上面加 max-width：它的高度是 padding-bottom 百分比撐出來的，
         而百分比是對「外層的寬度」算的，不是對自己——加了 max-width 只會讓它變窄卻一樣高
         （實測 731×553，比例整個跑掉）。包一層之後百分比就是對這一層算，比例才對。
       --gr-ar ＝ 這一張（裁切後）的長寬比，CSS 用它由高度反推最大寬度。 */
    React.createElement("div", {
      className: "grd-fit",
      style: {
        '--gr-ar': ar * band
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: 'grd-img' + (loaded ? ' loaded' : '') + (className ? ' ' + className : ''),
      style: {
        paddingBottom: ar * band * 100 + '%'
      }
    }, /*#__PURE__*/React.createElement("img", {
      ref: imgRef,
      src: img.url,
      style: {
        transform: `translateY(-${y0 * 100}%)`
      },
      alt: "\u6587\u7AE0\u6BB5\u843D",
      decoding: "async",
      onLoad: () => setLoaded(true)
    }), bandWords.map((w, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      className: "grd-word",
      "aria-label": `查 ${w.t}`,
      style: {
        left: w.x * 100 + '%',
        top: (w.y - y0) / band * 100 + '%',
        width: w.w * 100 + '%',
        height: w.h / band * 100 + '%'
      },
      onClick: e => {
        e.stopPropagation();
        onWord(w.t, e);
      }
    })), hlRect && /*#__PURE__*/React.createElement("div", {
      className: "grd-hlbox",
      "aria-hidden": "true",
      style: {
        left: hlRect.x * 100 + '%',
        top: (hlRect.y - y0) / band * 100 + '%',
        width: hlRect.w * 100 + '%',
        height: hlRect.h / band * 100 + '%'
      }
    }), (onSide ? img.readRects || [] : []).filter(r => r.kind === 'side').filter(r => {
      var cy = r.y + r.h / 2;
      return cy >= y0 && cy <= y1;
    }).map((r, i) => {
      var busy = sideBusy && sideBusy === r.x.toFixed(4) + ',' + r.y.toFixed(4);
      return /*#__PURE__*/React.createElement("button", {
        key: 'sd' + i,
        className: 'grd-side-btn' + (busy ? ' busy' : ''),
        title: "\u807D\u9019\u4E00\u584A",
        disabled: busy,
        style: {
          left: `calc(${Math.min(r.x + r.w, 0.99) * 100}% - 26px)`,
          top: (r.y - y0) / band * 100 + '%'
        },
        onClick: e => {
          e.stopPropagation();
          onSide(r);
        }
      }, busy ? '⏳' : '🔊');
    })))
  );
}

// v282: 把整篇文章的圖片預先抓下來（intro 停留時就開始）——翻頁時圖幾乎都已在快取
function grPreloadImgs(item) {
  var urls = [...new Set(grSegs(item).map(s => s.img && s.img.url).filter(Boolean))];
  urls.forEach(u => {
    var im = new Image();
    im.src = u;
  });
  // v287: 順便預抓 OCR 單字檔（點字查義＋照片朗讀）
  grSegs(item).forEach(s => {
    if (s.img && (s.img.wordsId || s.img.wordsUrl)) grFetchWords(s.img.wordsId || s.img.wordsUrl);
  });
}

// v290: 行是否落在框內（主文/附註框選；舊資料沒 x 就只看 y）
function grLineInRect(l, r) {
  if (l.y < r.y || l.y > r.y + r.h) return false;
  if (l.x == null) return true;
  return l.x + (l.w || 0) > r.x && l.x < r.x + r.w;
}

// v287: OCR 單字檔快取（{words:[{t,x,y,w,h}], lines:[{t,y}]}，座標＝整張圖比例）
var grWordsCache = {};
var grSideTtsCache = {}; // v298: 附註文字 → OpenAI mp3 objectURL（真人聲音快取）
function grFetchWords(key) {
  // v288: grwords_* → Firestore（不經 CORS）；舊 http URL 盡力 fetch
  if (!key) return Promise.resolve(null);
  if (!grWordsCache[key]) {
    grWordsCache[key] = (window.fetchReadingWords ? window.fetchReadingWords(key) : Promise.resolve(null)).catch(() => null);
  }
  return grWordsCache[key];
}
function GuidedReadingIntro({
  item,
  onStart,
  resumeAt,
  onRestart,
  catItems,
  linkPool,
  onFlashcards,
  blockedBy
}) {
  var segs = grSegs(item);
  var finalN = grFinalQs(item).length;
  var total = grTotalQ(item);
  var hasShort = segs.some(s => grValidQs(s).some(q => q.kind === 'short')) || grFinalQs(item).some(q => q.kind === 'short');
  useQME(() => {
    grPreloadImgs(item);
  }, [item && item.id]); // 停在說明頁時就先抓圖
  // v286: 綁定單字卡——先練文章單字再開始讀（Alan 要的流程）
  var linkedFc = item.linkedFlashcardId ? (linkPool && linkPool.length ? linkPool : catItems || []).find(it => it.id === item.linkedFlashcardId && it.type === 'flashcard' && (it.cards || []).length > 0) : null;
  var must = !!blockedBy; // v364: 設了「必須」而且還沒把學習模式跑完
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, segs.length > 1 ? `${segs.length} 段文章 · ` : '', total ? `${total} 題` : '純閱讀 · 沒有題目'), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("span", null, !total ? segs.length > 1 ? '一次讀一段——「下一頁」換下一段，「上一頁」可以回去重看' : '把文章讀完，按「完成閱讀」就結束' : segs.length > 1 ? '一次讀一段——「下一頁」接著回答這段的問題，「上一頁」可以回去重看' : '讀完文章按「下一頁」，再回答問題')), total > 0 && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC40"), /*#__PURE__*/React.createElement("span", null, "\u7B54\u984C\u6642\u5FD8\u4E86\u5167\u5BB9\uFF0C\u6309\u300C\u56DE\u982D\u770B\u6587\u7AE0\u300D\u5C31\u80FD\u518D\u770B\u4E00\u6B21")), finalN > 0 && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDA"), /*#__PURE__*/React.createElement("span", null, "\u5168\u90E8\u8B80\u5B8C\u5F8C\uFF0C\u9084\u6709 ", finalN, " \u984C\u6574\u7BC7\u6587\u7AE0\u7684\u7D9C\u5408\u984C")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2B50"), /*#__PURE__*/React.createElement("span", null, !total ? '這一份沒有題目——讀完就算完成' : hasShort ? '選擇題自動改分；簡答題 AI 批改' : '答對加一分，答錯會告訴你正確答案'))), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, linkedFc && onFlashcards ? /*#__PURE__*/React.createElement("div", {
    className: 'qm-intro-fc-group' + (must ? ' must' : '')
  }, must && /*#__PURE__*/React.createElement("div", {
    className: "qm-fcb-must"
  }, "\u5148\u628A\u55AE\u5B57\u7DF4\u719F\u518D\u8B80\u6587\u7AE0 \xB7 \u5B8C\u6210\u300C\uD83D\uDCD6 \u5B78\u7FD2\u300D\u5C31\u6703\u89E3\u9396"), /*#__PURE__*/React.createElement("button", {
    className: 'qm-fcb' + (must ? ' must' : ''),
    onClick: () => onFlashcards(linkedFc)
  }, /*#__PURE__*/React.createElement("span", {
    className: "qm-fcb-ico",
    "aria-hidden": "true"
  }, "\uD83C\uDCCF"), /*#__PURE__*/React.createElement("span", {
    className: "qm-fcb-text"
  }, /*#__PURE__*/React.createElement("b", null, "\u5148\u7DF4\u7FD2\u672C\u6587\u7AE0\u55AE\u5B57"), /*#__PURE__*/React.createElement("span", null, linkedFc.title, " \xB7 ", (linkedFc.cards || []).length, " \u5F35")), /*#__PURE__*/React.createElement("span", {
    className: "qm-fcb-arrow",
    "aria-hidden": "true"
  }, "\u2192"))) : null, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart,
    disabled: must,
    title: must ? '先完成上面的單字卡（學習模式）才能開始讀' : undefined
  }, must ? '🔒 先練完單字卡才能開始' : resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始閱讀 · Start →'), resumeAt && onRestart ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: onRestart
  }, "\u21BB \u91CD\u65B0\u958B\u59CB") : null, resumeAt ? /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-resume"
  }, "\u4E0A\u6B21\u505A\u5230\u4E00\u534A\uFF0C\u9032\u5EA6\u5DF2\u5E6B\u4F60\u4FDD\u7559 \u2713") : null));
}

// v301: 逐字朗讀高亮——把一段文字切成 token（word / 非word），每個 word 依長度＋標點停頓
// 給一個「時間權重」。播放時用 目前秒數/總長 的比例，回推現在唸到第幾個 word。
function grBuildWordModel(text) {
  var s = String(text || '');
  var tokens = [];
  var re = /[A-Za-z0-9][A-Za-z0-9'’\-]*/g;
  var last = 0,
    m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) tokens.push({
      text: s.slice(last, m.index),
      isWord: false
    });
    tokens.push({
      text: m[0],
      isWord: true
    });
    last = m.index + m[0].length;
  }
  if (last < s.length) tokens.push({
    text: s.slice(last),
    isWord: false
  });
  var weights = [];
  var wi = 0;
  tokens.forEach((t, idx) => {
    if (!t.isWord) return;
    t.wi = wi++;
    var w = t.text.length + 1;
    var nxt = tokens[idx + 1];
    if (nxt && !nxt.isWord) {
      if (/[.!?]/.test(nxt.text)) w += 6;else if (/[,;:—–]/.test(nxt.text)) w += 3;
    }
    weights.push(w);
  });
  var cumEnd = [];
  var acc = 0;
  weights.forEach(w => {
    acc += w;
    cumEnd.push(acc);
  });
  return {
    tokens,
    count: weights.length,
    total: acc || 1,
    cumEnd
  };
}
function grWordAtFraction(model, f) {
  if (!model || !model.count) return -1;
  var target = Math.max(0, Math.min(1, f)) * model.total;
  for (var i = 0; i < model.cumEnd.length; i++) {
    if (target < model.cumEnd[i]) return i;
  }
  return model.count - 1;
}
// v301: 照片段落的逐字模型——直接吃 grReadWordsFrom 回來的字物件清單（跟 TTS 文字同一套）
function grWeightWords(words) {
  var weights = (words || []).map(w => {
    var t = String(w.r || w.t || '');
    var x = t.replace(/[^A-Za-z0-9]/g, '').length + 1;
    if (/[.!?]["'”’)]?$/.test(t)) x += 6;else if (/[,;:—–]$/.test(t)) x += 3;
    return x;
  });
  var cumEnd = [];
  var acc = 0;
  weights.forEach(w => {
    acc += w;
    cumEnd.push(acc);
  });
  return {
    count: weights.length,
    total: acc || 1,
    cumEnd
  };
}
function GuidedReadingPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var segs = useQMM(() => grSegs(item), [item]);
  var segQs = useQMM(() => segs.map(s => grValidQs(s)), [segs]);
  var finalQs = useQMM(() => grFinalQs(item), [item]);
  var segTotal = useQMM(() => segQs.reduce((n, qs) => n + qs.length, 0), [segQs]);
  var total = segTotal + finalQs.length;

  /* v283: 翻頁式流程——「文章頁」讀完按「完成閱讀」→「問題頁」
     一題一題答（可展開「回頭看文章」）→ 下一段文章頁 → … → 綜合題過場 → 綜合題 → 完成 */
  var [segIdx, setSegIdx] = useQM(0);
  var [mode, setMode] = useQM('read'); // 'read' | 'quiz' | 'final-intro' | 'final'
  var [qIdx, setQIdx] = useQM(0);
  var [res, setRes] = useQM({}); // 全域題序 -> { pts }
  var [selected, setSelected] = useQM(null);
  var [answer, setAnswer] = useQM('');
  var [feedback, setFeedback] = useQM('');
  var [grErr, setGrErr] = useQM(''); // v306: 分段閱讀簡答批改失敗（不計分、可重送）
  var [checking, setChecking] = useQM(false);
  var [peek, setPeek] = useQM(false); // 答題頁展開「回頭看文章」
  var maxSegRef = React.useRef(0); // v411: 讀到最遠的那一段（往回讀時圓點不倒退）
  var [done, setDone] = useQM(false);
  var [dict, setDict] = useQM(null); // v287: 點字查義 {word, text|null}
  var [speaking, setSpeaking] = useQM(false); // v287: 朗讀中
  var [ttsText, setTtsText] = useQM(''); // v287: 這一段可朗讀的文字（文字段落或 OCR）
  var [readRate, setReadRate] = useQM(() => {
    // v293: 朗讀速度（放慢＝更自然）——記住學生的選擇
    var v = parseFloat(localStorage.getItem('alan-read-rate') || '');
    return v >= 0.5 && v <= 1 ? v : 0.8;
  });
  var [activeWord, setActiveWord] = useQM(-1); // v301: 逐字朗讀高亮——目前唸到第幾個字
  var [readWords, setReadWords] = useQM([]); // v301: 照片段落的 OCR 讀字清單（含座標，給逐字高亮）
  // 文字段落的逐字模型；照片段落改用 readWords 建模。照片/文字擇一有效。
  var wordModel = useQMM(() => grBuildWordModel(segs[segIdx] && segs[segIdx].text || ''), [segIdx, segs]);
  var photoModel = useQMM(() => grWeightWords(readWords), [readWords]);
  var activeModel = wordModel.count ? wordModel : photoModel;
  var wrongsRef = React.useRef([]);
  // v392: 自動跳題改用共用的 useAutoNext（原本的 autoRef 由 hook 內部保管，unmount 也會自己清）
  var {
    scheduleAuto,
    clearAuto
  } = useAutoNext();
  var topRef = React.useRef(null);
  var audioRef = React.useRef(null); // v289: 課文音檔——掛在翻頁容器外，換段不重置進度
  var segAudioRef = React.useRef(null); // v293: 每段 AI 音檔——同樣要套用朗讀速度
  var sideAudioRef = React.useRef(null); // v298: 附註 OpenAI 真人聲音播放
  var [sideBusy, setSideBusy] = useQM(null); // v298: 哪個附註框正在載入語音（顯示 ⏳）
  var speakStopRef = React.useRef(null); // v293: 逐句朗讀的中止函式

  // v289: 進答題/綜合題就暫停音檔（讀下一段時從剛才的位置繼續）
  useQME(() => {
    if (mode !== 'read' && audioRef.current && !audioRef.current.paused) audioRef.current.pause();
  }, [mode]);

  // v293: 朗讀速度——套到課文音檔＋每段 AI 音檔（保留原音色，只放慢節奏，唸起來更自然）。
  var applyRate = el => {
    if (!el) return;
    try {
      el.playbackRate = readRate;
    } catch (e) {}
    try {
      el.preservesPitch = true;
      el.mozPreservesPitch = true;
      el.webkitPreservesPitch = true;
    } catch (e) {}
  };
  useQME(() => {
    applyRate(audioRef.current);
    applyRate(segAudioRef.current);
    try {
      localStorage.setItem('alan-read-rate', String(readRate));
    } catch (e) {}
  }, [readRate, mode, segIdx, item.grAudioUrl]);

  // v287: 點單字 → 唸給他聽＋AI 查中文意思（localStorage 快取，同字秒回）
  // v289: 小卡貼著被點的單字（上方空間不夠就開在下面），不再固定頁尾
  var openWord = (w, ctx, evt) => {
    var word = String(w || '').replace(/^[^A-Za-z'’-]+|[^A-Za-z'’-]+$/g, '');
    if (!word) return;
    if (window.speakText) (window.speakTTS || window.speakText)(word);
    var pos = null;
    try {
      var el = evt && (evt.currentTarget || evt.target);
      var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (r) {
        var vw = window.innerWidth,
          vh = window.innerHeight;
        var half = Math.min(170, vw / 2 - 12);
        var above = r.bottom > vh - 250;
        pos = {
          x: Math.min(Math.max(r.left + r.width / 2, half + 12), vw - half - 12),
          y: above ? Math.max(12, r.top - 10) : Math.min(vh - 12, r.bottom + 10),
          above
        };
      }
    } catch (e) {}
    setDict({
      word,
      text: null,
      pos
    });
    if (window.lookupWord) {
      window.lookupWord(word, ctx || '').then(t => {
        setDict(d => d && d.word === word ? {
          ...d,
          text: t
        } : d);
      });
    }
  };

  /* ══ v412：小卡畫出來之後「量一次、超出畫面就拉回來」════════════════════
     Alan 第二次回報「字典又跑到最右邊」。v410 修掉了根因（進場動畫把 translateX(-50%)
     蓋掉），但這種「算好座標就放手」的寫法本來就很脆弱——半寬是寫死的 170、
     沒有考慮 iPad 雙指放大之後的可視範圍、往上開的時候也可能整張衝出畫面上緣，
     任何一個估錯就是一張看不完整的卡片。
     改成不再靠預測：畫出來之後量它真正的位置，哪一邊出界就往回推多少。
     ⚠ 用 margin 推，不要動 transform——transform 是置中用的，動了又會變成另一個 bug。
     ⚠ 要量兩次（字查回來之前／之後）：內容變多會把卡片撐高，所以 deps 有 dict.text。 */
  var popRef = React.useRef(null);
  useQML(() => {
    var el = popRef.current;
    if (!el || !dict) return;
    el.style.marginLeft = '';
    el.style.marginTop = ''; // 先歸零再量，不然會疊加
    var vv = window.visualViewport;
    var vw = vv && vv.width || window.innerWidth;
    var vh = vv && vv.height || window.innerHeight;
    var ox = vv && vv.offsetLeft || 0,
      oy = vv && vv.offsetTop || 0;
    var M = 8; // 邊緣至少留 8px
    var r = el.getBoundingClientRect();
    var dx = 0,
      dy = 0;
    if (r.right > ox + vw - M) dx = ox + vw - M - r.right;
    if (r.left + dx < ox + M) dx = ox + M - r.left; // 左邊優先（寧可右邊被切也要看得到開頭）
    if (r.bottom > oy + vh - M) dy = oy + vh - M - r.bottom;
    if (r.top + dy < oy + M) dy = oy + M - r.top;
    if (dx) el.style.marginLeft = Math.round(dx) + 'px';
    if (dy) el.style.marginTop = Math.round(dy) + 'px';
  }, [dict && dict.word, dict && dict.text]);

  // v289: 點小卡以外的地方就關掉（點別的單字＝換字，不算關）
  useQME(() => {
    if (!dict) return;
    var close = e => {
      if (e.target && e.target.closest && e.target.closest('.gr-word-pop, .grd-tword, .grd-word')) return;
      setDict(null);
    };
    var t = setTimeout(() => window.addEventListener('click', close), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('click', close);
    };
  }, [dict && dict.word]);

  // v287: 朗讀——文字段落直接唸；照片段落唸 OCR 行（只唸這個裁切帶內的）
  var stopSpeak = () => {
    if (speakStopRef.current) {
      try {
        speakStopRef.current();
      } catch (e) {}
      speakStopRef.current = null;
    }
    try {
      window.speechSynthesis && window.speechSynthesis.cancel();
    } catch (e) {}
    setSpeaking(false);
    setActiveWord(-1); // v301: 停止朗讀＝清掉逐字高亮
  };
  useQME(() => {
    if (segIdx > maxSegRef.current) maxSegRef.current = segIdx; // v411
    var dead = false;
    stopSpeak();
    setTtsText('');
    setReadWords([]);
    setActiveWord(-1); // 換段/換模式＝重置高亮
    if (mode !== 'read' || !segs[segIdx]) return;
    var seg = segs[segIdx];
    if ((seg.text || '').trim()) {
      setTtsText(seg.text);
      return;
    }
    if (seg.img && (seg.img.wordsId || seg.img.wordsUrl)) {
      grFetchWords(seg.img.wordsId || seg.img.wordsUrl).then(d => {
        if (dead || !d) return;
        var zy0 = seg.img.y0 || 0,
          zy1 = seg.img.y1 == null ? 1 : seg.img.y1;
        var main = (seg.img.readRects || []).find(r => r.kind === 'main'); // v290: 有框主文就只唸主文
        var t = window.grReadTextFrom(d, zy0, zy1, main || null); // v292: 字層級過濾（行會跨欄）
        if (t.trim()) setTtsText(t);
        // v301: 同一套過濾拿「有座標的字」——照片段落逐字高亮
        /* v453：逐字高亮與朗讀文字要來自**同一份**字清單，第 N 個字才會對到第 N 個框。
           以前朗讀文字另外走 grReadTextFrom（沒框選朗讀區域時甚至是整行的資料），
           兩邊字序不同 → 高亮從第一個字就開始偏（Alan：「完全沒有跟著語速」）。 */
        var ws = window.grReadWordsFrom ? window.grReadWordsFrom(d, zy0, zy1, main || null) : [];
        setReadWords(ws);
        if (ws.length && window.grWordsText) {
          var wt = window.grWordsText(ws);
          if (wt.trim()) setTtsText(wt);
        }
      });
    }
    return () => {
      dead = true;
    };
  }, [segIdx, mode]);

  /* ══ v410：進到一段就先在背景把「聲音」與「字典」暖好 ══════════════════════
     Alan：「點下去 聲音很慢才出來 以及字典功能也很慢」。
     查下去發現分段閱讀從頭到尾就沒有做過預抓——單字卡、聽寫、配對連線都有
     （都呼叫 window.prefetchTts），只有這裡沒有。所以每點一個字都是一次冷的來回：
       · 語音：跟 Worker 要 MP3，實測 1.3~2.3 秒
       · 字典：問 AI，約 1.8 秒
     進到一段就先把這一段值得暖的字暖起來，真的點下去多半已經是現成的（約 1ms）。
     ⚠ 三個節制：① 慢 600ms 再開始，先把頻寬讓給圖片與 OCR
                 ② 只暖「值得暖的字」（readWorthyWords 濾掉 the/and/was 這種）
                 ③ 換段一定要把還沒跑完的收掉，不然翻頁翻很快會有好幾段一起搶頻寬 */
  useQME(() => {
    if (mode !== 'read' || !segs[segIdx]) return;
    var seg = segs[segIdx];
    var dead = false,
      cancelDict = null;
    var warm = raw => {
      if (dead || !window.readWorthyWords) return;
      var list = window.readWorthyWords(raw, 0);
      if (!list.length) return;
      // 語音一個字就是一個 MP3，抓太多是浪費頻寬 → 只暖前 40 個；字典便宜，放到 60
      if (window.prefetchTts) {
        try {
          window.prefetchTts(list.slice(0, 40));
        } catch (e) {}
      }
      if (window.prefetchDict) {
        try {
          cancelDict = window.prefetchDict(list, {
            limit: 60
          });
        } catch (e) {}
      }
    };
    // 一段的字：貼上的文字直接切；照片段落用 OCR 的字（只取這個裁切帶內的）
    var wordsOf = sg => {
      var txt = (sg.text || '').trim();
      if (txt) return Promise.resolve(txt.match(/[A-Za-z'\u2019-]{2,}/g) || []);
      var key = sg.img && (sg.img.wordsId || sg.img.wordsUrl);
      if (!key) return Promise.resolve([]);
      return grFetchWords(key).then(d => {
        if (!d || !d.words) return [];
        var y0 = sg.img.y0 || 0,
          y1 = sg.img.y1 == null ? 1 : sg.img.y1;
        return d.words.filter(w => {
          var cy = w.y + (w.h || 0) / 2;
          return cy >= y0 && cy <= y1;
        }).map(w => w.t);
      }).catch(() => []);
    };
    // v411: 600ms → 250ms。字典改成批次之後請求數少很多，不會再跟圖片搶連線
    var t = setTimeout(() => {
      if (dead) return;
      wordsOf(seg).then(ws => warm(ws));
    }, 250);
    /* v411：順便把「下一段」也暖起來——現在有上一頁／下一頁，翻頁很快，
       等翻過去才開始暖就等於每一段都要再等一次。等這一段暖得差不多了再開始。 */
    var nextSeg = segs[segIdx + 1];
    var t2 = nextSeg ? setTimeout(() => {
      if (dead) return;
      wordsOf(nextSeg).then(ws => {
        if (dead || !window.readWorthyWords) return;
        var list = window.readWorthyWords(ws, 0);
        if (!list.length) return;
        if (window.prefetchTts) {
          try {
            window.prefetchTts(list.slice(0, 40));
          } catch (e) {}
        }
        if (window.prefetchDict) {
          try {
            window.prefetchDict(list, {
              limit: 60
            });
          } catch (e) {}
        }
      });
    }, 5000) : null;
    return () => {
      dead = true;
      clearTimeout(t);
      if (t2) clearTimeout(t2);
      /* 這一段的預抓：學生已經離開，沒跑完的就別花錢了。
         ⚠ 但「下一段」的那一份刻意不取消——會啟動它就表示學生在這一段待了 5 秒以上，
            接下來多半就是翻過去，取消掉等於白暖一場、翻過去還要再要一次。 */
      if (cancelDict) cancelDict();
    };
  }, [segIdx, mode]);

  // v293: 瀏覽器朗讀的語速——跟著學生選的速度，但夾在語音合成聽起來自然的範圍內
  var speechRate = () => Math.max(0.7, Math.min(0.95, readRate));

  // v290: 附註（side 框）——學生點照片上的 🔊 單獨聽那一塊
  // v298: 附註（side 框）也改用 OpenAI 真人聲音——打 Worker /tts 拿 mp3 播放（快取＋載入中⏳），
  // 失敗才退回瀏覽器語音，所以一定有聲音。
  var speakSideRect = async (img2, rect) => {
    var d = await grFetchWords(img2.wordsId || img2.wordsUrl);
    if (!d) return;
    var t = window.grReadTextFrom(d, 0, 1, rect); // v292: 字層級——附註框也拆得乾淨
    if (!t.trim()) return;
    var key = rect.x.toFixed(4) + ',' + rect.y.toFixed(4);
    if (sideAudioRef.current) {
      try {
        sideAudioRef.current.pause();
      } catch (e) {}
    }
    try {
      var url = grSideTtsCache[t];
      if (!url) {
        setSideBusy(key);
        var blob = await window.generateTtsAudio(t); // Worker /tts → mp3 Blob
        url = URL.createObjectURL(blob);
        grSideTtsCache[t] = url;
      }
      var a = sideAudioRef.current || (sideAudioRef.current = new Audio());
      a.src = url;
      applyRate(a);
      a.onloadedmetadata = () => applyRate(a);
      await a.play();
    } catch (e) {
      if (window.speakSentences) window.speakSentences(t, {
        rate: speechRate()
      }); // 退回瀏覽器語音
    } finally {
      setSideBusy(null);
    }
  };

  // v293: 逐句朗讀——遇標點停頓、放慢語速，比一口氣唸完自然許多
  var speakSeg = () => {
    if (!window.speechSynthesis || !ttsText) return;
    if (speaking) {
      stopSpeak();
      return;
    }
    setSpeaking(true);
    speakStopRef.current = window.speakSentences(ttsText, {
      rate: speechRate(),
      // v453：直接用「唸到第幾個字」（speakSentences 由 onboundary 的字元位置換算），
      //       比 v301 的「整段字元比例 → 加權反推」準得多；沒有 onWord 的舊路徑才退回比例。
      onWord: i2 => setActiveWord(i2),
      onDone: () => {
        speakStopRef.current = null;
        setSpeaking(false);
        setTimeout(() => setActiveWord(-1), 500);
      }
    });
  };

  // v301: MP3 課文音檔——用 目前秒數/總長 的比例回推唸到第幾個字（closed-loop，比較準）。
  // ⚠ 整篇音檔(item.grAudioUrl)只有「單段文章」時對得上（多段時音檔橫跨全部，不逐字亮）。
  var onSegAudioTime = el => {
    if (!el || !activeModel.count || !el.duration || !isFinite(el.duration)) return;
    setActiveWord(grWordAtFraction(activeModel, el.currentTime / el.duration));
  };
  var onWholeAudioTime = el => {
    if (segs.length === 1) onSegAudioTime(el);
  };
  var onAudioEnd = () => {
    if (activeModel.count) {
      setActiveWord(activeModel.count - 1);
      setTimeout(() => setActiveWord(-1), 600);
    }
  };

  // v293: 朗讀速度小控制——放在音檔旁，學生可再調慢／回原速（記住選擇）
  var speedCtl = () => /*#__PURE__*/React.createElement("div", {
    className: "gr-rate",
    role: "group",
    "aria-label": "\u6717\u8B80\u901F\u5EA6"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gr-rate-cap"
  }, "\u901F\u5EA6"), [['🐢 慢', 0.7], ['適中', 0.8], ['原速', 1]].map(([lab, r]) => /*#__PURE__*/React.createElement("button", {
    key: r,
    type: "button",
    className: 'gr-rate-btn' + (Math.abs(readRate - r) < 0.02 ? ' on' : ''),
    onClick: () => setReadRate(r)
  }, lab)));
  useQME(() => {
    var r = getResume(progressKey, total);
    if (r && r.gr && typeof r.gr.segIdx === 'number') {
      setSegIdx(Math.min(r.gr.segIdx, Math.max(0, segs.length - 1)));
      setMode(r.gr.mode === 'final' && finalQs.length ? 'final' : r.gr.mode === 'final-intro' && finalQs.length ? 'final-intro' : r.gr.mode === 'quiz' ? 'quiz' : 'read');
      setQIdx(r.gr.qIdx || 0);
      setRes(r.gr.res || {});
      wrongsRef.current = Array.isArray(r.gr.wrongs) ? r.gr.wrongs : [];
    }
    return () => {
      clearAuto(); // v392
      if (speakStopRef.current) {
        try {
          speakStopRef.current();
        } catch (e) {}
        speakStopRef.current = null;
      }
      try {
        window.speechSynthesis && window.speechSynthesis.cancel();
      } catch (e) {}
    };
  }, []);

  // 每翻一頁（換段落或換模式）捲回頁頂
  useQME(() => {
    if (topRef.current && topRef.current.scrollIntoView) topRef.current.scrollIntoView({
      block: 'start'
    });
  }, [segIdx, mode]);

  // v282: 圖片預載——進播放器就把整篇的圖抓齊，翻頁不再等圖
  useQME(() => {
    grPreloadImgs(item);
  }, [item && item.id]);
  var curQs = mode === 'final' ? finalQs : segQs[segIdx] || [];
  var gIdxOf = (si, qi) => segQs.slice(0, si).reduce((n, qs) => n + qs.length, 0) + qi;
  var curGIdx = mode === 'final' ? segTotal + qIdx : gIdxOf(segIdx, qIdx);
  var answered = Object.keys(res).length;
  var score = Object.values(res).reduce((s, r) => s + (r.pts || 0), 0);
  /* v392: 這一題答完就直接進結果頁嗎？（＝按鈕寫「完成 ✦」的那一題）
     最後一題一律不自動跳，讓學生自己按。 */
  var isLastQ = qIdx + 1 >= curQs.length && (mode === 'final' || segIdx + 1 >= segs.length && !finalQs.length);
  var resetQState = () => {
    setSelected(null);
    setAnswer('');
    setFeedback('');
    setPeek(false);
  };
  var savePosition = (nres, nSeg, nMode, nQ) => {
    var count = Object.keys(nres).length;
    if (count < 1 || count >= total) return;
    saveResume(progressKey, {
      deck: Array.from({
        length: total
      }, (_, i) => i),
      deckPos: count,
      uniqueTotal: total,
      gr: {
        segIdx: nSeg,
        mode: nMode,
        qIdx: nQ,
        res: nres,
        wrongs: wrongsRef.current
      }
    });
  };
  var persist = nres => {
    // 存「下一個未答題」的位置
    var nSeg = segIdx,
      nMode = mode,
      nQ = qIdx + 1;
    if (nMode === 'quiz' && nQ >= (segQs[nSeg] || []).length) {
      if (nSeg + 1 < segs.length) {
        nSeg += 1;
        nMode = 'read';
        nQ = 0;
      } else if (finalQs.length) {
        nMode = 'final-intro';
        nQ = 0;
      }
    }
    savePosition(nres, nSeg, nMode, nQ);
  };
  var finish = nres => {
    var finalScore = Object.values(nres).reduce((s, r) => s + (r.pts || 0), 0);
    // v287: 每段答對統計——老師後台看「哪一段全班最卡」
    var segStats = segQs.map((qs2, si) => ({
      ok: qs2.reduce((n, _, qi) => n + ((nres[gIdxOf(si, qi)] || {}).pts || 0), 0),
      total: qs2.length
    }));
    var grStats = {
      segs: segStats
    };
    if (finalQs.length) {
      grStats.final = {
        ok: finalQs.reduce((n, _, qi) => n + ((nres[segTotal + qi] || {}).pts || 0), 0),
        total: finalQs.length
      };
    }
    /* v387: 沒有題目的純閱讀＝沒有分數可言。
       這裡若照傳 score:0/total:0，saveQuizModeCompletion 會算成 0 分 → 不算完成
       （學生把 12 頁讀完卻記 0%）。無分數型一律傳 score:null，跟單字卡／上傳作業一致。 */
    saveQuizModeCompletion(progressKey, item, total > 0 ? {
      doneCount: total,
      score: finalScore,
      total,
      wrongQuestions: wrongsRef.current,
      extra: {
        grStats
      }
    } : {
      doneCount: 1,
      score: null,
      total: 1,
      extra: {
        grStats
      }
    });
    clearResume(progressKey);
    setDone(true);
  };
  var advance = nres => {
    clearAuto(); // v392: 手動前進（按鈕／Enter）也要清 timer，否則會連跳兩題
    resetQState();
    if (qIdx + 1 < curQs.length) {
      setQIdx(qIdx + 1);
      return;
    }
    if (mode === 'final') {
      finish(nres);
      return;
    }
    if (segIdx + 1 < segs.length) {
      setSegIdx(segIdx + 1);
      setMode('read');
      setQIdx(0);
      return;
    }
    if (finalQs.length) {
      setMode('final-intro');
      setQIdx(0);
      return;
    }
    finish(nres);
  };

  /* ══ v411：文章頁可以往回讀（Alan：「現在都只能一路往後」）═══════════════
     ⚠ 往回讀之後再往前，不可以叫學生把答過的題目再答一次——
        會讓已經拿到的分數被第二次作答蓋掉。所以「這一段的題目答完了沒」要看 res，
        答完的就直接跳過去下一段。 */
  var segAnswered = si => {
    var qs = segQs[si] || [];
    return qs.every((_, k) => res[gIdxOf(si, k)] !== undefined);
  };
  var firstUnansweredQ = si => {
    var qs = segQs[si] || [];
    var k = qs.findIndex((_, i) => res[gIdxOf(si, i)] === undefined);
    return k < 0 ? 0 : k;
  };
  /* 讀完這一頁之後還有沒有東西——沒有才叫「完成閱讀」 */
  var moreAfterRead = (segQs[segIdx] || []).length > 0 && !segAnswered(segIdx) || segIdx + 1 < segs.length || finalQs.length > 0;
  var goPrevPage = () => {
    if (segIdx <= 0) return;
    clearAuto();
    resetQState();
    setSegIdx(segIdx - 1);
    setMode('read');
    setQIdx(0);
  };

  // 「下一頁 →」／最後一頁的「✅ 完成閱讀」
  var goNextPage = () => {
    resetQState();
    if ((segQs[segIdx] || []).length && !segAnswered(segIdx)) {
      setMode('quiz');
      setQIdx(firstUnansweredQ(segIdx));
      return;
    }
    if (segIdx + 1 < segs.length) {
      setSegIdx(segIdx + 1);
      setMode('read');
      setQIdx(0);
      return;
    }
    if (finalQs.length) {
      setMode('final-intro');
      setQIdx(0);
      return;
    }
    finish(res);
  };
  var startFinal = () => {
    resetQState();
    savePosition(res, segIdx, 'final', 0);
    setMode('final');
    setQIdx(0);
  };
  var handlePick = i => {
    if (selected !== null) return;
    var q = grNormalizeQ(curQs[qIdx]);
    setSelected(i);
    var ok = i === q.correct;
    if (!ok) wrongsRef.current.push({
      q: q.q,
      answer: q.options[q.correct]
    });
    var nres = {
      ...res,
      [curGIdx]: {
        pts: ok ? 1 : 0
      }
    };
    setRes(nres);
    persist(nres);
    /* v392: 統一節奏——原本固定 900ms 且不管有沒有解說。
       改成沒解說 1 秒、有解說 4 秒（碰到回饋區就取消）；最後一題不自動跳。 */
    if (ok && !isLastQ) scheduleAuto(() => advance(nres), q.explain ? QM_AUTO_MS_EXPLAIN : QM_AUTO_MS_PLAIN);
  };
  var submitShort = async () => {
    if (!answer.trim() || checking || feedback) return;
    var q = curQs[qIdx];
    // 綜合題給 AI 整篇文字當依據；段落題給該段文字
    var passage = mode === 'final' ? segs.map(s => s.text || '').filter(Boolean).join('\n\n') : segs[segIdx].text || '';
    setChecking(true);
    setGrErr('');
    var result = await window.checkShortAnswer(q.q, q.keyPoints || '', passage, answer);
    if (!gradeSucceeded(result)) {
      // v306: AI 連不上→不計分、不存、可重送
      setGrErr(result || 'AI 批改暫時連不上，請再送一次。');
      setChecking(false);
      return;
    }
    var stars = grExtractStars(result);
    if (stars <= 2) wrongsRef.current.push({
      q: q.q,
      answer: q.keyPoints || '（參考 AI 回饋）'
    });
    var nres = {
      ...res,
      [curGIdx]: {
        pts: stars >= 3 ? 1 : 0
      }
    };
    setRes(nres);
    persist(nres);
    setFeedback(result);
    setChecking(false);
  };

  // 鍵盤：文章頁 Enter／→＝下一頁、←＝上一頁；答題頁 1–4 選選項、Enter 下一題
  useQME(() => {
    var onKey = e => {
      /* v390 修正：同上——本來擋掉「所有按鍵 × 所有按鈕」，
         會讓學生用滑鼠點過選項之後 1~4 全部失效。只擋 Enter/空白鍵的雙重觸發。 */
      var t = e.target;
      if (done) return;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.key === 'Enter' || e.key === ' ') && t && t.closest && t.closest('button, a[href], [role="button"]')) return;
      if (mode === 'read') {
        // v411: 方向鍵翻頁（桌機），Enter 維持「往下一頁」
        if (e.key === 'Enter' || e.key === 'ArrowRight') goNextPage();else if (e.key === 'ArrowLeft') goPrevPage();
        return;
      }
      if (mode === 'final-intro') {
        if (e.key === 'Enter') startFinal();
        return;
      }
      if (qIdx >= curQs.length) return;
      var q = grNormalizeQ(curQs[qIdx]);
      if (q.kind === 'short') return;
      if (selected === null && /^[1-9]$/.test(e.key)) {
        var i = Number(e.key) - 1;
        if (i < q.options.length) handlePick(i);
      } else if (selected !== null && e.key === 'Enter') {
        advance(res);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  if (!segs.length) return /*#__PURE__*/React.createElement("div", {
    className: "wp-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-icon"
  }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-msg"
  }, "\u5C1A\u7121\u5167\u5BB9"), /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-sub"
  }, "\u8ACB\u5728\u7DE8\u8F2F\u6A21\u5F0F\u4E2D\u65B0\u589E\u6BB5\u843D\u8207\u554F\u984C"));
  if (done) return /*#__PURE__*/React.createElement("div", {
    className: "wp-done"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-done-icon"
  }, "\u2726"), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-title"
  }, "Reading Complete!"), /*#__PURE__*/React.createElement("div", {
    className: "wp-done-sub"
  }, "\u8B80\u5B8C ", segs.length > 1 ? `${segs.length} 段文章` : '文章', total ? ` · 回答 ${total} 題${finalQs.length ? '（含綜合題）' : ''}` : ''), total > 0 && /*#__PURE__*/React.createElement("div", {
    className: "wp-done-score"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wp-done-avg"
  }, score), /*#__PURE__*/React.createElement("span", {
    className: "wp-done-maxstar"
  }, " / ", total)), wrongsRef.current.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "gr-done-note"
  }, "\u7B54\u932F\u7684 ", wrongsRef.current.length, " \u984C\u5DF2\u5E6B\u4F60\u6536\u9032\u932F\u984C\u672C \uD83D\uDCD4"), /*#__PURE__*/React.createElement("div", {
    className: "qm-result-btns",
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(QmDoneNavBtns, {
    onBack: onBack,
    onBackToTasks: onBackToTasks,
    onNextTask: onNextTask,
    backLabel: "\u2190 \u8FD4\u56DE"
  })));

  // v287: 文字段落每個英文字都可點——點了唸給他聽＋查中文意思
  // v301: 每個字包 span 並帶「word 索引」——朗讀到哪個字就亮起來（gr-hw-*）；其餘變淡。
  //       word 的切法要跟 grBuildWordModel 一致，索引才對得上。
  var renderParas = (text, highlight) => {
    var hl = typeof highlight === 'number' && highlight >= 0 ? highlight : null;
    var wn = -1; // 跨整段文字的 word 累計索引
    return String(text || '').split(/\n+/).map(t => t.trim()).filter(Boolean).map((para, i) => /*#__PURE__*/React.createElement("p", {
      key: i
    }, para.split(/([A-Za-z0-9][A-Za-z0-9'’\-]*)/g).map((tok, j) => {
      if (tok && /^[A-Za-z0-9]/.test(tok)) {
        wn += 1;
        var wi = wn;
        var alpha = /[A-Za-z]/.test(tok) && tok.length > 1;
        var cls = alpha ? 'grd-tword' : 'gr-plainword';
        if (hl != null) cls += ' gr-hw ' + (wi === hl ? 'gr-hw-now' : wi < hl ? 'gr-hw-done' : 'gr-hw-ahead');
        return alpha ? /*#__PURE__*/React.createElement("span", {
          key: j,
          className: cls,
          onClick: e => openWord(tok, para, e)
        }, tok) : /*#__PURE__*/React.createElement("span", {
          key: j,
          className: cls
        }, tok);
      }
      return tok;
    })));
  };
  var renderSegContent = (seg, highlight) => {
    var hl = typeof highlight === 'number' && highlight >= 0 ? highlight : null;
    // 照片段落逐字高亮：只在「當前正在讀的這一段」且有 readWords 時，把當前字的框傳給 GrImgCrop
    var hlRect = hl != null && seg === segs[segIdx] && readWords[hl] ? readWords[hl] : null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, seg.img && seg.img.url ? /*#__PURE__*/React.createElement(GrImgCrop, {
      img: seg.img,
      onWord: (w, e) => openWord(w, '', e),
      hlRect: hlRect,
      onSide: r => speakSideRect(seg.img, r),
      sideBusy: sideBusy
    }) : null, (seg.text || '').trim() ? /*#__PURE__*/React.createElement("div", {
      className: "gr-seg-text"
    }, renderParas(seg.text, highlight)) : null);
  };
  var renderQuestion = () => {
    var q = grNormalizeQ(curQs[qIdx]);
    return /*#__PURE__*/React.createElement("div", {
      className: "gr-q",
      key: `q-${mode}-${segIdx}-${qIdx}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "gr-q-count"
    }, "\u554F\u984C ", qIdx + 1, " / ", curQs.length), /*#__PURE__*/React.createElement("div", {
      className: "gr-q-text qm-question-swap"
    }, q.q), q.kind === 'short' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
      className: "qm-writing-input wp-input sa-input",
      value: answer,
      onChange: e => setAnswer(e.target.value),
      onKeyDown: e => {
        if (e.key === 'Enter' && !e.shiftKey && !feedback && !checking) {
          e.preventDefault();
          submitShort();
        }
      },
      placeholder: "Write your answer here\u2026",
      disabled: !!feedback,
      rows: 4
    }), !feedback ? /*#__PURE__*/React.createElement(React.Fragment, null, grErr && /*#__PURE__*/React.createElement("div", {
      className: "qm-grade-err"
    }, "\u26A0 ", grErr), /*#__PURE__*/React.createElement("button", {
      className: "qm-btn primary wp-submit",
      onClick: submitShort,
      disabled: checking || !answer.trim()
    }, checking ? '🤖 批改中…' : grErr ? '再送一次 →' : '送出答案 →')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(WritingFeedback, {
      text: feedback
    }), /*#__PURE__*/React.createElement("button", {
      className: "qm-btn primary wp-next",
      onClick: () => advance(res)
    }, qIdx + 1 >= curQs.length && (mode === 'final' || segIdx + 1 >= segs.length && !finalQs.length) ? '完成 ✦' : '下一題 →'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "qm-options qm-options-swap"
    }, q.options.map((opt, i) => {
      var cls = 'qm-option';
      if (selected !== null) {
        if (i === q.correct) cls += ' correct';else if (i === selected) cls += ' wrong';else cls += ' dim';
      }
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        className: cls,
        onClick: () => handlePick(i)
      }, /*#__PURE__*/React.createElement("span", {
        className: "qm-opt-letter"
      }, ['A', 'B', 'C', 'D'][i]), /*#__PURE__*/React.createElement("span", {
        className: "qm-opt-text"
      }, opt));
    })), selected !== null &&
    /*#__PURE__*/
    /* v392: 碰到回饋區就取消倒數，學生才讀得完解說 */
    React.createElement("div", {
      className: "qm-feedback",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      onPointerDown: clearAuto,
      onKeyDown: clearAuto
    }, /*#__PURE__*/React.createElement("div", {
      className: `qm-feedback-banner ${selected === q.correct ? 'correct' : 'wrong'}`
    }, selected === q.correct ? '✓ Correct! 答對了！' : `✗ 正解：${q.options[q.correct]}`), q.explain && /*#__PURE__*/React.createElement("div", {
      className: "qm-explain"
    }, q.explain), /*#__PURE__*/React.createElement(QmAutoHint, {
      kind: selected !== q.correct || isLastQ ? null : q.explain ? 'explain' : 'plain'
    }), /*#__PURE__*/React.createElement("button", {
      className: "qm-btn primary",
      onClick: () => advance(res)
    }, isLastQ ? '完成 ✦' : '下一題 →'))));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "gr-player",
    ref: topRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-progress-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-progress-fill",
    style: {
      width: `${total ? answered / total * 100 : 0}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "wp-header"
  }, /*#__PURE__*/React.createElement("button", {
    className: "wp-back",
    "aria-label": "\u4E0A\u4E00\u6B65",
    onClick: () => {
      clearAuto();
      onBack();
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("span", {
    className: "wp-counter"
  }, mode === 'final' || mode === 'final-intro' ? '📚 綜合練習 · ' : segs.length > 1 ? `第 ${segIdx + 1} / ${segs.length} 段 · ` : '', total ? `${answered} / ${total} 題` : '')), item.grAudioUrl ? /*#__PURE__*/React.createElement("div", {
    className: 'gr-audio' + (mode === 'read' && !(segs[segIdx] && segs[segIdx].audioUrl) ? '' : ' hide')
  }, /*#__PURE__*/React.createElement("span", {
    className: "gr-audio-label"
  }, "\uD83C\uDFA7 \u8AB2\u6587\u6717\u8B80"), /*#__PURE__*/React.createElement("audio", {
    ref: audioRef,
    controls: true,
    preload: "metadata",
    src: item.grAudioUrl,
    onLoadedMetadata: e => applyRate(e.target),
    onTimeUpdate: e => onWholeAudioTime(e.target),
    onEnded: onAudioEnd
  }), speedCtl()) : null, /*#__PURE__*/React.createElement("div", {
    key: `pg-${mode}-${segIdx}`,
    className: 'gr-page gr-page-' + (mode === 'read' ? 'read' : mode === 'final-intro' ? 'intro' : 'quiz')
  }, mode === 'read' ?
  /*#__PURE__*/
  /* ── 文章頁：只有這一段的內容＋「完成閱讀」── */
  React.createElement(React.Fragment, null, segs[segIdx].audioUrl ? /*#__PURE__*/React.createElement("div", {
    className: "gr-audio gr-audio-seg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gr-audio-label"
  }, "\uD83C\uDFA7 \u8AB2\u6587\u6717\u8B80"), /*#__PURE__*/React.createElement("audio", {
    ref: segAudioRef,
    controls: true,
    preload: "metadata",
    src: segs[segIdx].audioUrl,
    onLoadedMetadata: e => applyRate(e.target),
    onTimeUpdate: e => onSegAudioTime(e.target),
    onEnded: onAudioEnd
  }), speedCtl()) : null, segs.length > 1 &&
  /*#__PURE__*/
  /* v411: 圓點看「讀到最遠哪一段」，不是「現在在第幾段」——
     不然往回讀的時候後面的點會全部熄掉，看起來像進度倒退了。 */
  React.createElement("div", {
    className: "gr-dots",
    "aria-hidden": "true"
  }, segs.map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: i === segIdx ? 'cur' : i <= maxSegRef.current ? 'past' : ''
  }))), /*#__PURE__*/React.createElement("div", {
    className: "gr-seg cur"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-read-head"
  }, segs.length > 1 ? /*#__PURE__*/React.createElement("div", {
    className: "gr-seg-label"
  }, "\u7B2C ", segIdx + 1, " \u6BB5") : /*#__PURE__*/React.createElement("span", null), ttsText && !item.grAudioUrl && !segs[segIdx].audioUrl ? /*#__PURE__*/React.createElement("button", {
    className: 'gr-peek-btn gr-tts-btn' + (speaking ? ' on' : ''),
    onClick: speakSeg
  }, speaking ? '⏹ 停止朗讀' : '🔊 聽這一段') : null), renderSegContent(segs[segIdx], activeWord), (segs[segIdx].text || '').trim() || segs[segIdx].img && (segs[segIdx].img.wordsId || segs[segIdx].img.wordsUrl) ? /*#__PURE__*/React.createElement("div", {
    className: "gr-tap-hint"
  }, "\uD83D\uDCA1 \u4E0D\u6703\u7684\u55AE\u5B57\u9EDE\u4E00\u4E0B\uFF0C\u807D\u767C\u97F3\u3001\u770B\u610F\u601D") : null), /*#__PURE__*/React.createElement("div", {
    className: "gr-continue gr-nav"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn ghost gr-prev",
    onClick: goPrevPage,
    disabled: segIdx === 0,
    "aria-label": "\u4E0A\u4E00\u9801"
  }, "\u2190 \u4E0A\u4E00\u9801"), segs.length > 1 && /*#__PURE__*/React.createElement("span", {
    className: "gr-nav-pos"
  }, segIdx + 1, " / ", segs.length), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary gr-readdone",
    onClick: goNextPage
  }, moreAfterRead ? '下一頁 →' : '✅ 完成閱讀'))) : mode === 'final-intro' ?
  /*#__PURE__*/
  /* ── 文章與綜合題之間的過場：讓學生明確知道閱讀階段已完成 ── */
  React.createElement("div", {
    className: "qm-intro gr-final-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\u2705"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, "\u5DF2\u7D93\u8B80\u5B8C\u6587\u7AE0\uFF01"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, "\u63A5\u4E0B\u4F86\u958B\u59CB\u505A\u7D9C\u5408\u7DF4\u7FD2"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCDA"), /*#__PURE__*/React.createElement("span", null, "\u7528\u525B\u624D\u8B80\u5B8C\u7684\u6574\u7BC7\u6587\u7AE0\uFF0C\u5B8C\u6210\u6700\u5F8C ", finalQs.length, " \u984C\u7D9C\u5408\u984C\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC40"), /*#__PURE__*/React.createElement("span", null, "\u5FD8\u8A18\u5167\u5BB9\u6642\uFF0C\u53EF\u4EE5\u6309\u300C\u56DE\u982D\u770B\u6587\u7AE0\u300D\u518D\u6B21\u67E5\u770B\u3002"))), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: startFinal
  }, "\u958B\u59CB\u7D9C\u5408\u7DF4\u7FD2 \u2192"))) :
  /*#__PURE__*/
  /* ── 問題頁：一題一題答；可展開「回頭看文章」── */
  React.createElement("div", {
    className: "gr-seg cur"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-quiz-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-seg-label"
  }, mode === 'final' ? '📚 綜合題 · 關於整篇文章' : `第 ${segIdx + 1} 段的問題`), /*#__PURE__*/React.createElement("button", {
    className: "gr-peek-btn",
    onClick: () => setPeek(p => !p)
  }, peek ? '收起文章 ▴' : '📖 回頭看文章 ▾')), peek && /*#__PURE__*/React.createElement("div", {
    className: "gr-peek-panel"
  }, (mode === 'final' ? segs : [segs[segIdx]]).map((seg, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gr-peek-seg"
  }, mode === 'final' && segs.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "gr-seg-label"
  }, "\u7B2C ", i + 1, " \u6BB5"), renderSegContent(seg)))), renderQuestion())), dict && /*#__PURE__*/React.createElement("div", {
    ref: popRef,
    className: 'gr-word-pop' + (dict.pos ? ' anch' : ''),
    role: "dialog",
    "aria-label": `單字 ${dict.word}`,
    style: dict.pos ? {
      left: dict.pos.x,
      top: dict.pos.y,
      bottom: 'auto',
      transform: dict.pos.above ? 'translate(-50%, -100%)' : 'translateX(-50%)'
    } : undefined
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-word-pop-head"
  }, /*#__PURE__*/React.createElement("b", null, dict.word), /*#__PURE__*/React.createElement("button", {
    className: "gr-word-say",
    onClick: () => window.speakText && (window.speakTTS || window.speakText)(dict.word),
    title: "\u518D\u807D\u4E00\u6B21"
  }, "\uD83D\uDD0A"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "gr-word-x",
    onClick: () => setDict(null)
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "gr-word-pop-body"
  }, dict.text == null ? /*#__PURE__*/React.createElement("span", {
    className: "gr-word-loading"
  }, "\u67E5\u8A62\u4E2D\u2026") : dict.text.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, l)))));
}

/* ══════════════════════════════════════════════════════
   SYLLABLE DIVISION — INTRO
══════════════════════════════════════════════════════ */
function SyllableDivIntro({
  item,
  onStart,
  resumeAt,
  onRestart,
  prog
}) {
  var count = (item.sdWords || []).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\u2702\uFE0F"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, count, " words \xB7 \u97F3\u7BC0\u5207\u5272\u7DF4\u7FD2"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC40"), /*#__PURE__*/React.createElement("span", null, "\u770B\u5230\u55AE\u5B57\uFF0C\u627E\u51FA\u97F3\u7BC0\u5207\u5272\u9EDE")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2702\uFE0F"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u64CA\u5B57\u6BCD\u4E4B\u9593\u7684\u7E2B\u9699\u4F86\u5207\u5272")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD04"), /*#__PURE__*/React.createElement("span", null, "\u518D\u9EDE\u4E00\u6B21\u53EF\u4EE5\u53D6\u6D88\u5207\u5272")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u5207\u5272\u4F4D\u7F6E\u5B8C\u5168\u6B63\u78BA\u624D\u7B97\u7B54\u5C0D"))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, resumeAt ? `▶ 繼續上一次 · 從第 ${resumeAt + 1} 題 →` : '開始練習 · Start →'), resumeAt && onRestart ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary qm-intro-restart",
    onClick: onRestart
  }, "\u21BB \u91CD\u65B0\u958B\u59CB") : null, resumeAt ? /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-resume"
  }, "\u4E0A\u6B21\u505A\u5230\u4E00\u534A\uFF0C\u9032\u5EA6\u5DF2\u5E6B\u4F60\u4FDD\u7559 \u2713") : null));
}

/* ── Parse answer string into set of correct gap indices ── */
function parseSyllableCuts(answer) {
  // "sur/prise" → cut at gap index 2 (after letter[2], before letter[3])
  // "con/tract" → cut at gap index 2
  // "ath/let/ic" → cuts at gap index 2, 5
  // Spaces are stripped so "dis / trict" works same as "dis/trict"
  var cuts = new Set();
  var pos = 0;
  var normalized = (answer || '').replace(/\s+/g, ''); // remove all spaces
  var parts = normalized.split('/');
  for (var i = 0; i < parts.length - 1; i++) {
    pos += parts[i].length;
    cuts.add(pos - 1); // gap after letter at index (pos-1)
  }
  return cuts;
}

/* ══════════════════════════════════════════════════════
   SYLLABLE DIVISION — PLAYER
══════════════════════════════════════════════════════ */
function SyllableDivPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var words = useQMM(() => item.sdWords || [], [item.id]);
  // v265: 續做——做到第幾個字＋每個字的對錯
  var rz = useQMM(() => {
    var r = getResume(progressKey, (item.sdWords || []).length);
    return r && Array.isArray(r.scores) && r.scores.length === r.deckPos ? r : null;
  }, [item.id]);
  var [idx, setIdx] = useQM(rz ? rz.deckPos : 0);
  var [cuts, setCuts] = useQM(() => new Set());
  var [submitted, setSubmitted] = useQM(false);
  var [scores, setScores] = useQM(rz ? rz.scores.slice() : []); // true/false per word
  var [done, setDone] = useQM(false);
  // v392: 本來是裸 setTimeout——切對最後一個字後 650ms 內按返回，
  //       timer 仍會跑完 saveQuizModeCompletion，學生人已在單元列表
  var {
    scheduleAuto,
    clearAuto
  } = useAutoNext();
  var total = words.length;
  var current = words[idx];
  var pct = Math.round(idx / total * 100);
  var isLast = idx + 1 >= total;
  if (!total) return /*#__PURE__*/React.createElement("div", {
    className: "wp-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-icon"
  }, "\u2702\uFE0F"), /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-msg"
  }, "\u5C1A\u7121\u55AE\u5B57"), /*#__PURE__*/React.createElement("div", {
    className: "wp-empty-sub"
  }, "\u8ACB\u5728\u7DE8\u8F2F\u6A21\u5F0F\u4E2D\u65B0\u589E\u55AE\u5B57\u8207\u5207\u6CD5"));
  var letters = current ? current.word.replace(/\s+/g, '').split('') : [];
  var correctCuts = current ? parseSyllableCuts(current.answer) : new Set();
  var toggleCut = gapIdx => {
    if (submitted) return;
    setCuts(prev => {
      var next = new Set(prev);
      if (next.has(gapIdx)) next.delete(gapIdx);else next.add(gapIdx);
      return next;
    });
  };
  var submit = () => {
    var isCorrect = cuts.size === correctCuts.size && [...cuts].every(c => correctCuts.has(c));
    var nextScores = [...scores, isCorrect];
    setScores(nextScores);
    if (window.playSound) window.playSound(isCorrect ? 'correct' : 'wrong');
    setSubmitted(true);
    if (isCorrect && !isLast) {
      // v258: 把最新的 scores 一起帶過去——setTimeout 裡的 next 是舊 render 的閉包，
      // 直接讀 state 會少算剛答對的最後一題（滿分被存成少一題）
      // v392: 改成可取消的 1 秒；最後一個字不自動跳，停在「✓ 切對了！」讓學生自己按
      scheduleAuto(() => next(nextScores), QM_AUTO_MS_PLAIN);
    }
  };
  var next = (scoresOverride = null) => {
    clearAuto(); // v392: 手動前進也要清 timer，否則會連跳兩題
    /* ⚠ scoresOverride 只接受陣列。這裡曾經因為 onClick={next} 把 React 的 SyntheticEvent
       傳進來（event 是 truthy），s 變成 event 物件 → s.filter is not a function 直接 crash，
       非最後一題時則把 event 存進 localStorage、整份續做進度靜默存不了。
       全檔的按鈕都已改成 onClick={() => next()}，這裡再擋一層保險。 */
    var s = Array.isArray(scoresOverride) ? scoresOverride : scores;
    if (idx + 1 >= total) {
      clearResume(progressKey); // v265
      var correct = s.filter(Boolean).length;
      // v258: 錯題記錄——切錯的單字＋正確切法
      var wrongList = words.filter((w, i) => !s[i]).map(w => ({
        q: w.word,
        answer: w.answer || ''
      }));
      saveQuizModeCompletion(progressKey, item, {
        doneCount: total,
        score: correct,
        total,
        wrongQuestions: wrongList
      });
      setDone(true);
      return;
    }
    // v265: 每前進一題存續做進度（音節題不打亂順序，deck＝原始索引）
    saveResume(progressKey, {
      deck: words.map((_, i) => i),
      deckPos: idx + 1,
      uniqueTotal: total,
      scores: s
    });
    setIdx(i => i + 1);
    setCuts(new Set());
    setSubmitted(false);
  };

  /* ── Done screen ── */
  if (done) {
    var correct = scores.filter(Boolean).length;
    var finalPct = Math.round(correct / total * 100);
    var emoji = finalPct === 100 ? '🏆' : finalPct >= 80 ? '🎉' : finalPct >= 60 ? '👍' : '💪';
    var msg = finalPct === 100 ? 'Perfect! 全對！' : finalPct >= 80 ? 'Excellent! 非常好！' : finalPct >= 60 ? 'Good job! 繼續練習！' : 'Keep going! 多練習！';
    return /*#__PURE__*/React.createElement("div", {
      className: "qm-result"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-result-emoji"
    }, emoji), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-cat-title"
    }, item.title), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-score"
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-result-num"
    }, correct), /*#__PURE__*/React.createElement("span", {
      className: "qm-result-denom"
    }, " / ", total)), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-pct"
    }, finalPct, "% correct"), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-msg"
    }, msg), /*#__PURE__*/React.createElement("div", {
      className: "sd-done-breakdown"
    }, words.map((w, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "sd-done-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: `sd-done-icon ${scores[i] ? 'correct' : 'wrong'}`
    }, scores[i] ? '✓' : '✗'), /*#__PURE__*/React.createElement("span", {
      className: "sd-done-word"
    }, w.word), /*#__PURE__*/React.createElement("span", {
      className: "sd-done-answer"
    }, w.answer || '—')))), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-btns"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary",
      onClick: () => {
        setIdx(0);
        setCuts(new Set());
        setSubmitted(false);
        setScores([]);
        setDone(false);
      }
    }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask
    })));
  }
  var isWordCorrect = submitted && cuts.size === correctCuts.size && [...cuts].every(c => correctCuts.has(c));

  /* ── Play screen ── */
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-player-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
    onClick: () => {
      clearAuto();
      onBack();
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-fill",
    style: {
      width: pct + '%'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "qm-player-counter"
  }, idx + 1, " / ", total)), /*#__PURE__*/React.createElement("div", {
    className: "qm-question-area",
    style: {
      paddingBottom: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-question-hint"
  }, submitted ? isWordCorrect ? '✓ 切對了！' : '✗ 看看正確的切割位置' : '點擊字母之間的縫隙來切割音節')), /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "sd-word-display qm-question-swap"
  }, letters.map((letter, i) => {
    // Determine gap state after each letter (except last)
    var gapClass = '';
    var showSlash = false;
    if (i < letters.length - 1) {
      if (!submitted) {
        showSlash = cuts.has(i);
        gapClass = cuts.has(i) ? 'cut' : '';
      } else {
        var studentCut = cuts.has(i);
        var shouldCut = correctCuts.has(i);
        showSlash = studentCut || shouldCut;
        gapClass = studentCut && shouldCut ? 'correct' : shouldCut && !studentCut ? 'missed' : studentCut && !shouldCut ? 'wrong-cut' : '';
      }
    }
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "sd-letter"
    }, letter), i < letters.length - 1 && /*#__PURE__*/React.createElement("button", {
      className: `sd-gap${submitted ? ' done' : ''}${gapClass ? ' ' + gapClass : ''}`,
      onClick: () => toggleCut(i),
      disabled: submitted,
      "aria-label": `cut after ${letter}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "sd-gap-line"
    }), showSlash && /*#__PURE__*/React.createElement("span", {
      className: "sd-gap-slash"
    }, "/")));
  })), submitted && !isWordCorrect && /*#__PURE__*/React.createElement("div", {
    className: "sd-legend"
  }, [...correctCuts].some(c => cuts.has(c)) && /*#__PURE__*/React.createElement("span", {
    className: "sd-leg correct"
  }, "\u2713 \u5207\u5C0D"), [...correctCuts].some(c => !cuts.has(c)) && /*#__PURE__*/React.createElement("span", {
    className: "sd-leg missed"
  }, "/ \u6F0F\u5207"), [...cuts].some(c => !correctCuts.has(c)) && /*#__PURE__*/React.createElement("span", {
    className: "sd-leg wrong-cut"
  }, "/ \u5207\u932F")), /*#__PURE__*/React.createElement("div", {
    className: "qm-feedback",
    style: {
      marginTop: 16
    }
  }, !submitted ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: submit
  }, "\u78BA\u8A8D \xB7 Check \u2192") : /*#__PURE__*/React.createElement(React.Fragment, null, !isWordCorrect && /*#__PURE__*/React.createElement("div", {
    className: "sd-answer-reveal"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sd-answer-label"
  }, "\u6B63\u78BA\u7B54\u6848"), /*#__PURE__*/React.createElement("span", {
    className: "sd-answer-val"
  }, current.answer)), isWordCorrect && !isLast && /*#__PURE__*/React.createElement("div", {
    className: "qm-auto-next"
  }, "\u5207\u5C0D\u4E86\uFF0C\u81EA\u52D5\u4E0B\u4E00\u500B\u2026"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: () => next()
  }, isLast ? '查看成績 →' : '下一個 →'))));
}

/* ══════════════════════════════════════════════════════
   WORD SORT — INTRO
══════════════════════════════════════════════════════ */
/* Helper: combine stem + suffix category. Strips any trailing _ from stem first. */
function makeSuffixWord(stem, cat) {
  return stem.replace(/_+$/, '') + cat.replace(/^-/, '');
}
function WordSortIntro({
  item,
  onStart,
  prog
}) {
  var cats = item.sortCategories || [];
  var count = (item.sortWords || []).length;
  var suffixMode = !!item.sortSuffixMode;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83D\uDDC2"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, count, " words \xB7 ", cats.length, " categories"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, suffixMode ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD24"), /*#__PURE__*/React.createElement("span", null, "\u6BCF\u500B\u55AE\u5B57\u90FD\u6709\u5E95\u7DDA\uFF08\u5B57\u6839\uFF09\uFF0C\u4EE3\u8868\u5B57\u5C3E\u9084\u6C92\u586B\u4E0A")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC46"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u4E00\u500B\u5B57\u6839\uFF0C\u518D\u9EDE\u4F60\u89BA\u5F97\u6B63\u78BA\u7684\u5B57\u5C3E\u6B04\u4F4D")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2728"), /*#__PURE__*/React.createElement("span", null, "\u653E\u5165\u5F8C\u5B57\u5C3E\u6703\u81EA\u52D5\u63A5\u4E0A\u53BB\uFF0C\u770B\u770B\u5C0D\u4E0D\u5C0D\uFF01")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD04"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u5DF2\u653E\u5165\u7684\u55AE\u5B57\u53EF\u4EE5\u79FB\u56DE\u91CD\u65B0\u9078"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC40"), /*#__PURE__*/React.createElement("span", null, "\u770B\u6E05\u695A\u6BCF\u500B\u5206\u985E\u7684\u540D\u7A31")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC46"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u4E00\u500B\u55AE\u5B57\uFF0C\u518D\u9EDE\u5B83\u6240\u5C6C\u7684\u6B04\u4F4D")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD04"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u5DF2\u653E\u5165\u7684\u55AE\u5B57\u53EF\u4EE5\u79FB\u56DE\u91CD\u9078")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u5168\u90E8\u653E\u5B8C\u624D\u80FD\u63D0\u4EA4")))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, "\u958B\u59CB\u5206\u985E \xB7 Start \u2192")));
}

/* ══════════════════════════════════════════════════════
   WORD SORT — PLAYER
══════════════════════════════════════════════════════ */
function WordSortPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var categories = item.sortCategories || [];
  /* v485：欄位的小字說明（-ity → quality of…）。名稱塞不下就切掉，所以分開放。 */
  var sortHints = item.sortHints || {};
  var suffixMode = !!item.sortSuffixMode;
  var [redoWrongIds, setRedoWrongIds] = useQM(null); // v306+: 非 null＝只重做這些錯的（ephemeral，不覆蓋最佳成績）
  var allWords = useQMM(() => {
    var base = shuffleArr(item.sortWords || []);
    return redoWrongIds ? base.filter(w => redoWrongIds.includes(w.id)) : base;
  }, [item.id, redoWrongIds]);
  var [placements, setPlacements] = useQM({}); // wordId → category
  var [selected, setSelected] = useQM(null); // selected wordId (in pool)
  var [submitted, setSubmitted] = useQM(false);
  var [done, setDone] = useQM(false);
  var [showAnswer, setShowAnswer] = useQM(false); // result screen tab

  var total = allWords.length;
  var poolWords = allWords.filter(w => !placements[w.id]);
  var allPlaced = poolWords.length === 0;

  // Display helpers — strip trailing _ before any manipulation so teacher can type either "final" or "final_"
  var stem = w => w.word.replace(/_+$/, '');
  var poolLabel = w => suffixMode ? stem(w) + '_' : w.word;
  var placedLabel = (w, cat) => suffixMode ? makeSuffixWord(stem(w), cat) : w.word;
  var resultLabel = (w, cat) => suffixMode ? makeSuffixWord(stem(w), cat) : w.word;
  var wordsInCat = cat => allWords.filter(w => placements[w.id] === cat);
  var clickPoolWord = wordId => {
    if (submitted) return;
    setSelected(prev => prev === wordId ? null : wordId);
  };
  var clickPlacedWord = wordId => {
    if (submitted) return;
    setPlacements(prev => {
      var p = {
        ...prev
      };
      delete p[wordId];
      return p;
    });
    setSelected(null);
    if (window.playSound) window.playSound('match');
  };
  var clickCategory = cat => {
    if (submitted || !selected) return;
    setPlacements(prev => ({
      ...prev,
      [selected]: cat
    }));
    setSelected(null);
    if (window.playSound) window.playSound('match');
  };
  var submit = () => {
    var correct = 0;
    allWords.forEach(w => {
      if (placements[w.id] === w.category) correct++;
    });
    // v258: 錯題記錄——放錯欄位的單字＋正確答案（字尾模式記完整單字，一般模式記正確分類）
    var wrongList = allWords.filter(w => placements[w.id] !== w.category).map(w => ({
      q: suffixMode ? stem(w) + '_' : w.word,
      answer: suffixMode ? makeSuffixWord(stem(w), w.category) : w.category
    }));
    // v306+: 只重做錯的那一輪不寫入完成紀錄（避免用子集題數覆蓋最佳成績）
    if (!redoWrongIds) saveQuizModeCompletion(progressKey, item, {
      doneCount: total,
      score: correct,
      total,
      wrongQuestions: wrongList
    });
    if (correct !== total && window.playSound) window.playSound('wrong'); // 全對的慶祝交給結果頁的 QmCelebrate
    setSubmitted(true);
  };

  /* ── After submit: check screen ── */
  if (submitted && !done) {
    var correct = allWords.filter(w => placements[w.id] === w.category).length;
    var finalPct = Math.round(correct / total * 100);
    var allRight = correct === total;
    var colCount = `repeat(${Math.min(categories.length, 4)}, 1fr)`;
    return /*#__PURE__*/React.createElement(QmCelebrate, {
      pct: finalPct
    }, /*#__PURE__*/React.createElement("div", {
      className: "ws-result"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ws-result-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ws-result-emoji"
    }, allRight ? '🏆' : finalPct >= 70 ? '🎉' : '💪'), /*#__PURE__*/React.createElement("span", {
      className: "ws-result-score"
    }, correct, " / ", total), /*#__PURE__*/React.createElement("span", {
      className: "ws-result-pct"
    }, finalPct, "%")), /*#__PURE__*/React.createElement("div", {
      className: "ws-result-tabs"
    }, /*#__PURE__*/React.createElement("button", {
      className: `ws-result-tab${!showAnswer ? ' active' : ''}`,
      onClick: () => setShowAnswer(false)
    }, "\u4F60\u7684\u7B54\u6848"), /*#__PURE__*/React.createElement("button", {
      className: `ws-result-tab${showAnswer ? ' active' : ''}`,
      onClick: () => setShowAnswer(true)
    }, "\u2705 \u6B63\u78BA\u7B54\u6848")), !showAnswer && /*#__PURE__*/React.createElement("div", {
      className: "ws-grid",
      style: {
        gridTemplateColumns: colCount
      }
    }, categories.map(cat => /*#__PURE__*/React.createElement("div", {
      key: cat,
      className: "ws-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ws-col-head"
    }, cat, sortHints[cat] ? /*#__PURE__*/React.createElement("span", {
      className: "ws-col-hint"
    }, sortHints[cat]) : null), /*#__PURE__*/React.createElement("div", {
      className: "ws-col-body"
    }, allWords.filter(w => w.category === cat).map(w => {
      var placed = placements[w.id] === cat;
      return /*#__PURE__*/React.createElement("div", {
        key: w.id,
        className: `ws-word-chip result ${placed ? 'correct' : 'missing'}`
      }, placed ? '✓' : '✗', " ", resultLabel(w, cat));
    }), allWords.filter(w => placements[w.id] === cat && w.category !== cat).map(w => /*#__PURE__*/React.createElement("div", {
      key: w.id + '_wrong',
      className: "ws-word-chip result wrong"
    }, "\u2717 ", resultLabel(w, cat))))))), showAnswer && /*#__PURE__*/React.createElement("div", {
      className: "ws-grid",
      style: {
        gridTemplateColumns: colCount
      }
    }, categories.map(cat => /*#__PURE__*/React.createElement("div", {
      key: cat,
      className: "ws-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ws-col-head"
    }, cat, sortHints[cat] ? /*#__PURE__*/React.createElement("span", {
      className: "ws-col-hint"
    }, sortHints[cat]) : null), /*#__PURE__*/React.createElement("div", {
      className: "ws-col-body"
    }, allWords.filter(w => w.category === cat).map(w => /*#__PURE__*/React.createElement("div", {
      key: w.id,
      className: "ws-word-chip result correct"
    }, "\u2713 ", resultLabel(w, cat))))))), /*#__PURE__*/React.createElement("div", {
      className: "ws-result-btns"
    }, !allRight && /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary ws-result-btn",
      onClick: () => {
        var wrongIds = allWords.filter(w => placements[w.id] !== w.category).map(w => w.id);
        setRedoWrongIds(wrongIds);
        setPlacements({});
        setSelected(null);
        setSubmitted(false);
        setShowAnswer(false);
        setDone(false);
      }
    }, "\u53EA\u91CD\u505A\u932F\u7684 ", total - correct, " \u984C"), /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary ws-result-btn",
      onClick: () => {
        setRedoWrongIds(null);
        setPlacements({});
        setSelected(null);
        setSubmitted(false);
        setShowAnswer(false);
        setDone(false);
      }
    }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask
    }))));
  }

  /* ── Play screen ── */
  return /*#__PURE__*/React.createElement("div", {
    className: "ws-player"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ws-pool-area"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ws-pool-label"
  }, allPlaced ? '✓ 全部放完了，可以提交！' : `${poolWords.length} 個單字待分類${selected ? ' · 點下方欄位放入' : ' · 點單字選取'}`), /*#__PURE__*/React.createElement("div", {
    className: "ws-pool"
  }, poolWords.map(w => /*#__PURE__*/React.createElement("button", {
    key: w.id,
    className: `ws-word-chip pool${selected === w.id ? ' selected' : ''}${suffixMode ? ' suffix' : ''}`,
    onClick: () => clickPoolWord(w.id)
  }, poolLabel(w))), allPlaced && /*#__PURE__*/React.createElement("span", {
    className: "ws-pool-done"
  }, "\uD83C\uDF89"))), /*#__PURE__*/React.createElement("div", {
    className: "ws-grid",
    style: {
      gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)`
    }
  }, categories.map(cat => /*#__PURE__*/React.createElement("div", {
    key: cat,
    className: `ws-col${selected ? ' droppable' : ''}`,
    onClick: () => clickCategory(cat)
  }, /*#__PURE__*/React.createElement("div", {
    className: "ws-col-head"
  }, cat, sortHints[cat] ? /*#__PURE__*/React.createElement("span", {
    className: "ws-col-hint"
  }, sortHints[cat]) : null), /*#__PURE__*/React.createElement("div", {
    className: "ws-col-body"
  }, wordsInCat(cat).map(w => /*#__PURE__*/React.createElement("button", {
    key: w.id,
    className: "ws-word-chip placed",
    onClick: e => {
      e.stopPropagation();
      clickPlacedWord(w.id);
    },
    title: "\u9EDE\u64CA\u79FB\u56DE"
  }, placedLabel(w, cat))), selected && wordsInCat(cat).length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "ws-drop-hint"
  }, "\u9EDE\u6B64\u653E\u5165"))))), /*#__PURE__*/React.createElement("div", {
    className: "ws-submit-area"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: submit,
    disabled: !allPlaced,
    style: {
      opacity: allPlaced ? 1 : 0.45
    }
  }, allPlaced ? '提交答案 →' : `還有 ${poolWords.length} 個單字未分類`)));
}

/* ══════════════════════════════════════════════════════
   OPINION ESSAY — INTRO
══════════════════════════════════════════════════════ */
function EssayIntro({
  item,
  onStart,
  prog
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\u270D"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, "Opinion Essay \xB7 AI 7-criteria grading"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("span", null, "\u95B1\u8B80\u984C\u76EE\uFF0C\u60F3\u597D\u4F60\u7684\u7ACB\u5834\uFF08Claim\uFF09")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCA1"), /*#__PURE__*/React.createElement("span", null, "\u5BEB\u51FA 2 \u500B Reasons\uFF0C\u6BCF\u500B Reason \u642D\u914D Example")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD1A"), /*#__PURE__*/React.createElement("span", null, "\u6700\u5F8C\u5BEB Conclusion\uFF0C\u7E3D\u7D50\u4F60\u7684 Opinion")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("span", null, "AI \u6279\u6539 7 \u9805\uFF1AClaim \xB7 Reasons \xB7 Examples \xB7 Explanation \xB7 Conclusion \xB7 Organization \xB7 Grammar"))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, "\u958B\u59CB\u5BEB\u4F5C \xB7 Start Writing \u2192")));
}

/* ── Parse 【Section】 blocks from AI response ── */
function parseEssaySections(text) {
  var sections = {};
  var regex = /【([^】]+)】([\s\S]*?)(?=【|$)/g;
  var m;
  while ((m = regex.exec(text)) !== null) {
    sections[m[1].trim()] = m[2].trim();
  }
  return sections;
}

/* ── Count stars in AI overall score text ── */
function countStars(text) {
  var filled = (text.match(/[⭐★]/g) || []).length;
  return Math.min(5, Math.max(1, filled));
}
// v306: 判斷 AI 批改是不是「真的批改到了」——成功的回饋一定含星等（⭐/★/☆）；
// 連不上時回的是純中文錯誤字串、沒有星。用來擋掉「把錯誤訊息當分數存進成績」。
function gradeSucceeded(text) {
  return typeof text === 'string' && /[⭐★☆]/.test(text);
}
window.gradeSucceeded = gradeSucceeded;

/* ══════════════════════════════════════════════════════
   OPINION ESSAY — PLAYER
══════════════════════════════════════════════════════ */
function EssayPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var [essay, setEssay] = useQM('');
  var [feedback, setFeedback] = useQM('');
  var [gradeErr, setGradeErr] = useQM(''); // v306: 批改失敗（不計分、可重送）
  var [checking, setChecking] = useQM(false);
  var [submitted, setSubmitted] = useQM(false);
  var [activeTab, setActiveTab] = useQM('strengths'); // for detailed feedback tabs

  var wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  var prompt = item.essayPrompt || '';
  var scaffold = item.essayScaffold || '';
  var submit = async () => {
    if (!essay.trim() || checking) return;
    setChecking(true);
    var result = await window.checkEssay(prompt, essay);
    if (!gradeSucceeded(result)) {
      // v306: AI 連不上→不計分、不存、可重送
      setGradeErr(result || 'AI 批改暫時連不上，請再送一次。');
      setChecking(false);
      return;
    }
    setGradeErr('');
    setFeedback(result);
    setChecking(false);
    setSubmitted(true);
    saveQuizModeCompletion(progressKey, item, {
      doneCount: 1,
      score: countStars(result),
      total: 5
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "essay-player"
  }, /*#__PURE__*/React.createElement("div", {
    className: "essay-prompt-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "essay-prompt-label"
  }, "\u270D Essay Prompt"), /*#__PURE__*/React.createElement("div", {
    className: "essay-prompt-text"
  }, prompt), scaffold && /*#__PURE__*/React.createElement("div", {
    className: "essay-scaffold"
  }, /*#__PURE__*/React.createElement("div", {
    className: "essay-scaffold-label"
  }, "\uD83D\uDCCB Writing Guide"), /*#__PURE__*/React.createElement("pre", {
    className: "essay-scaffold-body"
  }, scaffold))), !submitted && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
    className: "essay-input",
    value: essay,
    onChange: e => setEssay(e.target.value),
    placeholder: "Start writing your opinion essay here\u2026 Begin with your Claim (\u7ACB\u5834), then give Reasons with Examples, and finish with a Conclusion.",
    rows: 12,
    disabled: checking
  }), /*#__PURE__*/React.createElement("div", {
    className: "essay-meta-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "essay-word-count"
  }, wordCount, " words"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: submit,
    disabled: wordCount < 10 || checking,
    style: {
      opacity: wordCount < 10 ? 0.45 : 1
    }
  }, checking ? '🤖 AI 批改中…' : gradeErr ? '再送一次 →' : '送出批改 →')), gradeErr && /*#__PURE__*/React.createElement("div", {
    className: "qm-grade-err"
  }, "\u26A0 ", gradeErr), checking && /*#__PURE__*/React.createElement("div", {
    className: "essay-checking-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "essay-checking-fill"
  }))), submitted && feedback && /*#__PURE__*/React.createElement("div", {
    className: "essay-feedback"
  }, /*#__PURE__*/React.createElement(WritingFeedback, {
    text: feedback
  }), /*#__PURE__*/React.createElement("div", {
    className: "essay-result-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: () => {
      setSubmitted(false);
      setFeedback('');
      setGradeErr('');
    }
  }, "\u91CD\u65B0\u5BEB\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
    onBack: onBack,
    onBackToTasks: onBackToTasks,
    onNextTask: onNextTask
  }))));
}

/* ══════════════════════════════════════════════════════
   STORY MOUNTAIN — constants
══════════════════════════════════════════════════════ */
var SM_STAGES = [{
  key: 'intro',
  label: 'Introduction',
  short: 'Intro',
  num: '1',
  cx: 70,
  cy: 215,
  emoji: '🏠'
}, {
  key: 'rising',
  label: 'Rising Action',
  short: 'Rising',
  num: '2',
  cx: 175,
  cy: 138,
  emoji: '📈'
}, {
  key: 'climax',
  label: 'Climax',
  short: 'Climax',
  num: '3',
  cx: 280,
  cy: 55,
  emoji: '⭐'
}, {
  key: 'falling',
  label: 'Falling Action',
  short: 'Falling',
  num: '4',
  cx: 385,
  cy: 138,
  emoji: '📉'
}, {
  key: 'resolution',
  label: 'Resolution',
  short: 'End',
  num: '5',
  cx: 490,
  cy: 215,
  emoji: '🏁'
}];

/* Bezier segments between consecutive stages */
var SM_SEGMENTS = ['M 70,215 C 100,210 145,143 175,138', 'M 175,138 C 205,133 250,60 280,55', 'M 280,55 C 310,50 355,133 385,138', 'M 385,138 C 415,143 460,210 490,215'];

/* ── SVG Mountain Diagram ── */
function StoryMountainSVG({
  activeKey,
  doneKeys
}) {
  var allReached = [...doneKeys, activeKey];
  var fullPath = 'M 70,215 C 100,210 145,143 175,138 C 205,133 250,60 280,55 C 310,50 355,133 385,138 C 415,143 460,210 490,215';
  var fillPath = fullPath + ' L 490,240 L 70,240 Z';
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 560 275",
    className: "sm-svg"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "sm-mtn-grad",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#8b3120",
    stopOpacity: "0.09"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#8b3120",
    stopOpacity: "0.02"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "sm-glow"
  }, /*#__PURE__*/React.createElement("feGaussianBlur", {
    stdDeviation: "3",
    result: "blur"
  }), /*#__PURE__*/React.createElement("feMerge", null, /*#__PURE__*/React.createElement("feMergeNode", {
    in: "blur"
  }), /*#__PURE__*/React.createElement("feMergeNode", {
    in: "SourceGraphic"
  })))), /*#__PURE__*/React.createElement("path", {
    d: fillPath,
    fill: "url(#sm-mtn-grad)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "30",
    y1: "238",
    x2: "530",
    y2: "238",
    stroke: "#e2ddd9",
    strokeWidth: "1.5",
    strokeDasharray: "4 4"
  }), /*#__PURE__*/React.createElement("path", {
    d: fullPath,
    fill: "none",
    stroke: "#ddd8d2",
    strokeWidth: "4",
    strokeLinecap: "round"
  }), SM_SEGMENTS.map((d, i) => {
    var from = SM_STAGES[i];
    var to = SM_STAGES[i + 1];
    if (!from || !to) return null;
    var fromOk = allReached.includes(from.key);
    var toOk = allReached.includes(to.key);
    if (!fromOk || !toOk) return null;
    return /*#__PURE__*/React.createElement("path", {
      key: i,
      d: d,
      fill: "none",
      stroke: "var(--accent,#8b3120)",
      strokeWidth: "4",
      strokeLinecap: "round",
      opacity: "0.85"
    });
  }), SM_STAGES.map(s => {
    var done = doneKeys.includes(s.key);
    var active = activeKey === s.key;
    var fill = done ? '#16a34a' : active ? 'var(--accent,#8b3120)' : '#ccc8c2';
    var textFill = done ? '#166534' : active ? 'var(--accent,#8b3120)' : '#999';
    var above = s.cy < 140; // Climax label goes above
    var labelY = above ? s.cy - 32 : s.cy + 36;
    return /*#__PURE__*/React.createElement("g", {
      key: s.key
    }, active && /*#__PURE__*/React.createElement("circle", {
      cx: s.cx,
      cy: s.cy,
      r: "30",
      fill: "var(--accent,#8b3120)",
      opacity: "0.15"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: s.cx,
      cy: s.cy + 3,
      r: "22",
      fill: "#000",
      opacity: "0.08"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: s.cx,
      cy: s.cy,
      r: "22",
      fill: fill,
      stroke: "#fff",
      strokeWidth: "3",
      filter: active ? 'url(#sm-glow)' : undefined
    }), /*#__PURE__*/React.createElement("text", {
      x: s.cx,
      y: s.cy + 6,
      textAnchor: "middle",
      fontSize: "15",
      fontWeight: "700",
      fill: "#fff",
      fontFamily: "system-ui,sans-serif"
    }, done ? '✓' : s.num), /*#__PURE__*/React.createElement("text", {
      x: s.cx,
      y: labelY,
      textAnchor: "middle",
      fontSize: "13",
      fontWeight: active ? '700' : '500',
      fill: textFill,
      fontFamily: "system-ui,sans-serif"
    }, s.label), !above && /*#__PURE__*/React.createElement("text", {
      x: s.cx,
      y: labelY + 16,
      textAnchor: "middle",
      fontSize: "11",
      fill: "#bbb",
      fontFamily: "system-ui,sans-serif"
    }));
  }));
}

/* ── Parse ### sections from AI response ── */
function parseHashSections(text) {
  // Robust split: handle ### at start of text or after newline
  var sections = {};
  if (!text) return sections;
  var normalized = /^###/.test(text.trim()) ? '\n' + text.trim() : text;
  var parts = normalized.split(/\n###\s+/);
  parts.forEach((part, i) => {
    if (i === 0) return; // text before first ### heading
    var nl = part.indexOf('\n');
    if (nl === -1) {
      sections[part.trim()] = '';
      return;
    }
    var key = part.slice(0, nl).trim();
    var body = part.slice(nl + 1).trim();
    if (key) sections[key] = body;
  });
  return sections;
}

/* ── Parse markdown table → { headers, rows } ── */
function parseMdTable(text) {
  var lines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 3) return null;
  var headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
  var rows = lines.slice(2).map(l => l.split('|').slice(1, -1).map(c => c.trim()));
  return {
    headers,
    rows
  };
}

/* ══════════════════════════════════════════════════════
   STORY MOUNTAIN — INTRO
══════════════════════════════════════════════════════ */
function StoryMountainIntro({
  item,
  onStart,
  prog
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro",
    style: {
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83C\uDFD4"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, "Story Mountain \xB7 5 stages \xB7 AI 10-point grading"), /*#__PURE__*/React.createElement(StoryMountainSVG, {
    activeKey: "intro",
    doneKeys: []
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFE0"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Introduction"), " \u2014 characters, setting, situation")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC8"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Rising Action"), " \u2014 the problem builds up")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2B50"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Climax"), " \u2014 the most exciting moment")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC9"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Falling Action"), " \u2014 things start to calm down")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFC1"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Resolution"), " \u2014 the story ends clearly"))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, "\u958B\u59CB\u5BEB\u4F5C \xB7 Start Writing \u2192")));
}

/* ══════════════════════════════════════════════════════
   STORY MOUNTAIN — PLAYER
══════════════════════════════════════════════════════ */
function StoryMountainPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var [stageIdx, setStageIdx] = useQM(0);
  var [answers, setAnswers] = useQM({
    intro: '',
    rising: '',
    climax: '',
    falling: '',
    resolution: ''
  });
  var [screen, setScreen] = useQM('write'); // 'write' | 'review' | 'checking' | 'result'
  var [feedback, setFeedback] = useQM('');
  var [gradeErr, setGradeErr] = useQM(''); // v306: 批改失敗（不計分、可重送）
  var [activeTab, setActiveTab] = useQM('checklist');
  var current = SM_STAGES[stageIdx];
  var hints = item.smHints || {};
  var doneKeys = SM_STAGES.slice(0, stageIdx).map(s => s.key);
  var wordCount = (answers[current?.key] || '').trim().split(/\s+/).filter(Boolean).length;
  var goNext = () => {
    if (stageIdx < SM_STAGES.length - 1) setStageIdx(i => i + 1);else setScreen('review');
  };
  var goPrev = () => {
    if (stageIdx > 0) setStageIdx(i => i - 1);
  };
  var submit = async () => {
    setScreen('checking');
    var result = await window.checkStoryMountain(item.smPrompt, item.smPassage, answers);
    if (!gradeSucceeded(result)) {
      // v306: AI 連不上→不計分、不存、回到檢視頁可重送
      setGradeErr(result || 'AI 批改暫時連不上，請再送一次。');
      setScreen('review');
      return;
    }
    setGradeErr('');
    setFeedback(result);
    saveQuizModeCompletion(progressKey, item, {
      doneCount: 1,
      score: countStars(result),
      total: 5
    });
    setScreen('result');
  };

  /* ── Checking screen ── */
  if (screen === 'checking') return /*#__PURE__*/React.createElement("div", {
    className: "sm-checking"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-checking-icon"
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("div", {
    className: "sm-checking-msg"
  }, "AI \u6B63\u5728\u6279\u6539\u4F60\u7684 Story Mountain\u2026"), /*#__PURE__*/React.createElement("div", {
    className: "sm-checking-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-checking-fill"
  })));

  /* ── Result screen ── */
  if (screen === 'result' && feedback) {
    var retryFn = () => {
      setScreen('write');
      setStageIdx(0);
      setFeedback('');
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "sm-result"
    }, /*#__PURE__*/React.createElement(WritingFeedback, {
      text: feedback
    }), /*#__PURE__*/React.createElement("div", {
      className: "sm-result-btns"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary",
      onClick: retryFn
    }, "\u91CD\u65B0\u5BEB\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask
    })));
  }

  /* ── Review screen ── */
  if (screen === 'review') return /*#__PURE__*/React.createElement("div", {
    className: "sm-review"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-review-title"
  }, "\uD83D\uDCCB Review your Story Mountain"), SM_STAGES.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    className: "sm-review-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-review-stage-head"
  }, s.emoji, " ", s.label), /*#__PURE__*/React.createElement("div", {
    className: "sm-review-stage-body"
  }, answers[s.key] || /*#__PURE__*/React.createElement("em", {
    style: {
      color: 'var(--ink-muted)'
    }
  }, "\uFF08\u672A\u586B\u5BEB\uFF09")))), gradeErr && /*#__PURE__*/React.createElement("div", {
    className: "qm-grade-err"
  }, "\u26A0 ", gradeErr), /*#__PURE__*/React.createElement("div", {
    className: "sm-review-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: () => {
      setStageIdx(SM_STAGES.length - 1);
      setScreen('write');
    }
  }, "\u2190 \u4FEE\u6539"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: submit
  }, gradeErr ? '🤖 再送一次 →' : '🤖 送出 AI 批改 →')));

  /* ── Write screen ── */
  return /*#__PURE__*/React.createElement("div", {
    className: "sm-player"
  }, /*#__PURE__*/React.createElement("div", {
    key: current.key,
    className: "qm-question-swap"
  }, /*#__PURE__*/React.createElement(StoryMountainSVG, {
    activeKey: current.key,
    doneKeys: doneKeys
  })), item.smPrompt && /*#__PURE__*/React.createElement("div", {
    className: "sm-prompt-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-prompt-label"
  }, "\u270D Topic"), /*#__PURE__*/React.createElement("span", {
    className: "sm-prompt-text"
  }, item.smPrompt)), /*#__PURE__*/React.createElement("div", {
    className: "sm-stage-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm-stage-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sm-stage-emoji"
  }, current.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sm-stage-label"
  }, current.label), /*#__PURE__*/React.createElement("div", {
    className: "sm-stage-step"
  }, "Step ", stageIdx + 1, " of ", SM_STAGES.length))), hints[current.key] && /*#__PURE__*/React.createElement("div", {
    className: "sm-stage-hint"
  }, "\uD83D\uDCA1 ", hints[current.key]), /*#__PURE__*/React.createElement("textarea", {
    className: "sm-textarea",
    value: answers[current.key],
    onChange: e => setAnswers(prev => ({
      ...prev,
      [current.key]: e.target.value
    })),
    placeholder: `Write your ${current.label} here…`,
    rows: 6,
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "sm-word-count"
  }, wordCount, " words")), /*#__PURE__*/React.createElement("div", {
    className: "sm-nav"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: goPrev,
    disabled: stageIdx === 0
  }, "\u2190 Previous"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: goNext
  }, stageIdx < SM_STAGES.length - 1 ? 'Next →' : 'Review & Submit →')));
}

/* ══════════════════════════════════════════════════════
   CIRCLE ANSWER
══════════════════════════════════════════════════════ */
function normalizeCircleValue(value) {
  return String(value || '').trim().toLowerCase().replace(/[\u2018\u2019\u02bc\uff07`]/g, "'").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}
function tokenizeCircleSentence(sentence) {
  return String(sentence || '').match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\p{L}\p{N}\s]+|\s+/gu) || [];
}
function CircleAnswerIntro({
  item,
  onStart,
  prog
}) {
  var questions = (item.circleQuestions || []).filter(q => q.sentence && (q.answer || (q.answers || []).length));
  var hasClassification = questions.some(q => q.label);
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\u2B55"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), item.zh && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, item.zh), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, questions.length, " questions \xB7 \u5708\u51FA\u7B54\u6848"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2B55"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u9078\u53E5\u5B50\u4E2D\u7684\u6B63\u78BA\u55AE\u5B57\uFF0C\u628A\u5B83\u5708\u8D77\u4F86")), hasClassification && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("span", null, "\u5708\u9078\u5F8C\uFF0C\u518D\u5B8C\u6210\u55AE\u5B57\u5206\u985E")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD0D"), /*#__PURE__*/React.createElement("span", null, "\u4EA4\u5377\u524D\u53EF\u4EE5\u96A8\u6642\u66F4\u6539\u7B54\u6848"))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, "\u958B\u59CB\u4F5C\u7B54 \xB7 Start \u2192")));
}
function CircleAnswerPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var [redoKeys, setRedoKeys] = useQM(null); // v306+: 非 null＝只重做這些錯的（ephemeral，不覆蓋最佳成績）
  var questions = useQMM(() => {
    var base = (item.circleQuestions || []).filter(q => q.sentence && (q.answer || (q.answers || []).length)).map((q, index) => ({
      ...q,
      _circleKey: q.id || `circle-${index}`
    }));
    return redoKeys ? base.filter(q => redoKeys.includes(q._circleKey)) : base;
  }, [item.id, redoKeys]);
  var labels = useQMM(() => {
    var configured = (item.circleLabels || []).map(v => String(v).trim()).filter(Boolean);
    var fromQuestions = questions.map(q => String(q.label || '').trim()).filter(Boolean);
    return [...new Set([...configured, ...fromQuestions])];
  }, [item.id, questions]);
  var [selectedWords, setSelectedWords] = useQM({});
  var [selectedLabels, setSelectedLabels] = useQM({});
  var [submitted, setSubmitted] = useQM(false);
  var [score, setScore] = useQM(0);

  /* v444：一句話可以圈「好幾個字」（Alan 的作業就是「Read each sentence. Then underline the nouns.」——
     答案是 Amira, Rhode Island, week 三個）。selectedWords[key] 一律存成陣列；
     只有一個答案的舊題目行為完全一樣（點第二個字會換掉第一個）。 */
  var answersOf = q => ((q.answers || []).length ? q.answers : [q.answer]).filter(Boolean);
  var pickedOf = q => selectedWords[q._circleKey] || [];
  var isQuestionComplete = q => pickedOf(q).length === answersOf(q).length && (!q.label || !!selectedLabels[q._circleKey]);
  var completedCount = questions.filter(isQuestionComplete).length;
  /* 🔴 v486：整篇文章模式的「進度」不能用 x/7——
     那個 x 是「有幾句**剛好圈對個數**」，等於一邊作答一邊告訴學生每句有幾個，
     而且交卷鈕要 7 句全中才解鎖＝沒猜對個數就永遠交不出去（Alan 圖2 的灰色 Submit）。
     整篇找字只要「圈了幾個字」，圈到至少一個就能交卷，對不對交卷才算。 */
  var proseMode = !!item.circleProse;
  var prosePicks = proseMode ? questions.reduce((n, q) => n + pickedOf(q).length, 0) : 0;
  var canSubmit = proseMode ? prosePicks > 0 : completedCount >= questions.length;
  var isCircleCorrect = q => {
    var tokens = tokenizeCircleSentence(q.sentence);
    var want = answersOf(q).map(normalizeCircleValue).sort();
    var got = pickedOf(q).map(i => normalizeCircleValue(tokens[i])).sort();
    return want.length > 0 && want.length === got.length && want.every((w, i) => w === got[i]);
  };
  var isLabelCorrect = q => !q.label || normalizeCircleValue(selectedLabels[q._circleKey]) === normalizeCircleValue(q.label);
  var isQuestionCorrect = q => isCircleCorrect(q) && isLabelCorrect(q);
  var handleSubmit = () => {
    var correct = questions.filter(isQuestionCorrect).length;
    var wrongList = questions.reduce((list, q, index) => {
      if (!isQuestionCorrect(q)) {
        list.push({
          q: `Question ${index + 1}: ${q.sentence}`,
          answer: q.label ? `${answersOf(q).join(', ')} · ${q.label}` : answersOf(q).join(', ')
        });
      }
      return list;
    }, []);
    setScore(correct);
    setSubmitted(true);
    // v306+: 只重做錯的那一輪不寫入完成紀錄（避免用子集題數覆蓋最佳成績）
    if (!redoKeys) {
      saveQuizModeCompletion(progressKey, item, {
        doneCount: questions.length,
        score: correct,
        total: questions.length,
        wrongQuestions: wrongList
      });
      if (window._onQuizComplete) window._onQuizComplete(correct, questions.length, wrongList, {
        itemId: progressKey
      });
    }
  };
  var reset = () => {
    setRedoKeys(null);
    setSelectedWords({});
    setSelectedLabels({});
    setSubmitted(false);
    setScore(0);
  };

  // v306+: 只重做這一輪答錯的題目（不寫入完成紀錄）
  var redoWrongOnly = () => {
    var wrongKeys = questions.filter(q => !isQuestionCorrect(q)).map(q => q._circleKey);
    setRedoKeys(wrongKeys);
    setSelectedWords({});
    setSelectedLabels({});
    setSubmitted(false);
    setScore(0);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "circle-player"
  }, /*#__PURE__*/React.createElement("div", {
    className: "circle-topbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("span", {
    className: "circle-instruction"
  }, item.circleInstruction || 'Circle the correct answer in each sentence.'), /*#__PURE__*/React.createElement("span", {
    className: "circle-progress"
  }, submitted ? `${score}/${questions.length}` : proseMode ? `已圈 ${prosePicks} 個字` : `${completedCount}/${questions.length}`)), item.circleProse ? /*#__PURE__*/React.createElement("div", {
    className: "circle-prose-wrap"
  }, item.storyTitle && /*#__PURE__*/React.createElement("div", {
    className: "circle-prose-title"
  }, item.storyTitle), /*#__PURE__*/React.createElement("div", {
    className: "circle-prose"
  }, questions.map((q, qIndex) => {
    var tokens = tokenizeCircleSentence(q.sentence);
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: q._circleKey
    }, qIndex > 0 && ' ', tokens.map((token, tokenIndex) => {
      if (/^\s+$/.test(token)) return /*#__PURE__*/React.createElement("span", {
        key: tokenIndex
      }, token);
      if (!/[\p{L}\p{N}]/u.test(token)) return /*#__PURE__*/React.createElement("span", {
        key: tokenIndex
      }, token);
      var picked = pickedOf(q);
      var selected = picked.indexOf(tokenIndex) >= 0;
      var want = answersOf(q).map(normalizeCircleValue);
      var correctAnswer = submitted && want.indexOf(normalizeCircleValue(token)) >= 0;
      return /*#__PURE__*/React.createElement("button", {
        key: tokenIndex,
        className: `circle-word${selected ? ' selected' : ''}${submitted && selected ? correctAnswer ? ' correct' : ' wrong' : ''}${correctAnswer ? ' answer' : ''}`
        /* 🔴 v486（Alan：「只能螢光一個，按第二個前一個會取消，有時候又不會」）：
           整篇文章模式不能沿用「一句一題」的選法。那一套是
           `need === 1 ? [tokenIndex] : cur.length >= need ? cur : …`——
           ① 那一句只有 1 個答案時，按第二個字會**把第一個換掉**（＝只能圈一個）；
           ② 剛好有 2 個答案的句子就不會 → 同一篇裡時好時壞；
           ③ 圈滿就按不動，等於偷偷告訴學生這一句有幾個
              （Alan 一開始就說「不一定會給有幾個」）。
           整篇找字就是**想圈幾個圈幾個、再按一下取消**，對不對交卷才算。 */,
        onClick: () => !submitted && setSelectedWords(prev => {
          var cur = prev[q._circleKey] || [];
          return {
            ...prev,
            [q._circleKey]: cur.indexOf(tokenIndex) >= 0 ? cur.filter(i => i !== tokenIndex) : cur.concat(tokenIndex)
          };
        }),
        disabled: submitted
      }, token);
    }));
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "circle-question-list"
  }, questions.map((q, qIndex) => {
    var tokens = tokenizeCircleSentence(q.sentence);
    var circleCorrect = submitted && isCircleCorrect(q);
    var labelCorrect = submitted && isLabelCorrect(q);
    var questionCorrect = submitted && circleCorrect && labelCorrect;
    return /*#__PURE__*/React.createElement("div", {
      key: q._circleKey,
      className: `circle-question${submitted ? questionCorrect ? ' correct' : ' wrong' : ''}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "circle-question-number"
    }, qIndex + 1), /*#__PURE__*/React.createElement("div", {
      className: "circle-question-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "circle-sentence"
    }, tokens.map((token, tokenIndex) => {
      if (/^\s+$/.test(token)) return /*#__PURE__*/React.createElement("span", {
        key: tokenIndex
      }, token);
      if (!/[\p{L}\p{N}]/u.test(token)) return /*#__PURE__*/React.createElement("span", {
        key: tokenIndex
      }, token);
      var picked = pickedOf(q);
      var selected = picked.indexOf(tokenIndex) >= 0;
      var want = answersOf(q).map(normalizeCircleValue);
      var correctAnswer = submitted && want.indexOf(normalizeCircleValue(token)) >= 0;
      var need = want.length;
      return /*#__PURE__*/React.createElement("button", {
        key: tokenIndex,
        className: `circle-word${selected ? ' selected' : ''}${submitted && selected ? correctAnswer ? ' correct' : ' wrong' : ''}${correctAnswer ? ' answer' : ''}`,
        onClick: () => !submitted && setSelectedWords(prev => {
          var cur = prev[q._circleKey] || [];
          if (cur.indexOf(tokenIndex) >= 0) return {
            ...prev,
            [q._circleKey]: cur.filter(i => i !== tokenIndex)
          };
          // 只要一個答案時：點新的就換掉舊的；要好幾個時：點滿了就先取消一個
          var next = need === 1 ? [tokenIndex] : cur.length >= need ? cur : cur.concat(tokenIndex);
          return {
            ...prev,
            [q._circleKey]: next
          };
        }),
        disabled: submitted
      }, token);
    })), q.label && /*#__PURE__*/React.createElement("div", {
      className: "circle-classify"
    }, /*#__PURE__*/React.createElement("span", {
      className: "circle-classify-label"
    }, "Classify:"), /*#__PURE__*/React.createElement("div", {
      className: "circle-label-options"
    }, labels.map(label => {
      var selected = selectedLabels[q._circleKey] === label;
      var correctAnswer = submitted && normalizeCircleValue(label) === normalizeCircleValue(q.label);
      return /*#__PURE__*/React.createElement("button", {
        key: label,
        className: `circle-label-option${selected ? ' selected' : ''}${submitted && selected ? labelCorrect ? ' correct' : ' wrong' : ''}${correctAnswer ? ' answer' : ''}`,
        onClick: () => !submitted && setSelectedLabels(prev => ({
          ...prev,
          [q._circleKey]: label
        })),
        disabled: submitted
      }, label);
    }))), submitted && !questionCorrect && /*#__PURE__*/React.createElement("div", {
      className: "circle-correction"
    }, "Correct answer: ", /*#__PURE__*/React.createElement("strong", null, answersOf(q).join(', ')), q.label ? /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 ", /*#__PURE__*/React.createElement("strong", null, q.label)) : null, q.explain && /*#__PURE__*/React.createElement("span", {
      className: "circle-explain"
    }, " \xB7 ", q.explain))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "circle-footer"
  }, !submitted ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: handleSubmit,
    disabled: !canSubmit
  }, "Submit \xB7 \u4EA4\u5377 (", proseMode ? `已圈 ${prosePicks} 個字` : `${completedCount}/${questions.length}`, ")") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "circle-result"
  }, score, " / ", questions.length, " correct"), score < questions.length && /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: redoWrongOnly
  }, "\u53EA\u91CD\u505A\u932F\u7684 ", questions.length - score, " \u984C"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: reset
  }, "Try again"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
    onBack: onBack,
    onBackToTasks: onBackToTasks,
    onNextTask: onNextTask
  }))));
}

/* ══════════════════════════════════════════════════════
   v462 ①（Alan 挑的第四個）：🧩 排順序（句子重組）
   ──────────────────────────────────────────────────────
   語序類的文法（疑問句、形容詞順序、there is/are、副詞位置）用選擇題練不到——
   要自己把打散的字排成一句，才知道順序對不對。

   ⚠ 這是「新題型」，v414 的教訓是新題型要補的地方一個都不能漏：
     getQuizItems／AUTO_STAR_KIND／QM_TYPE_WORDS／QM_TYPE_ZH／QM_TYPE_ICON／
     qmItemRank／getQuizItemTotal／單元列的徽章／編輯器／LINE Worker 的 playableItem。
     t-v462.mjs 會把這些全部檢查一遍。
   字塊的樣式沿用互動教學的 .gnl-tile／.gnl-line／.gnl-pool，不另外寫一套。
   ══════════════════════════════════════════════════════ */
function soQuestions(item) {
  return (item.orderQuestions || []).map((q, i) => ({
    ...q,
    _k: q.id || 'so' + i,
    words: (q.words || []).map(w => String(w || '').trim()).filter(Boolean)
  })).filter(q => q.words.length >= 3);
}
/* 打散，但不可以「剛好排成正確答案」——那樣學生點一下交卷就滿分。
   seed 固定＝同一題每次打開順序一樣，學生重做時不會覺得題目變了。 */
function soShuffle(n, seed) {
  var a = Array.from({
    length: n
  }, (_, i) => i);
  var r = seed * 9301 + 49297;
  for (var i = n - 1; i > 0; i--) {
    r = (r * 9301 + 49297) % 233280;
    var j = Math.floor(r / 233280 * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.every((v, i) => v === i) && n > 1) {
    [a[0], a[1]] = [a[1], a[0]];
  }
  return a;
}
function SentenceOrderIntro({
  item,
  onStart,
  prog
}) {
  var qs = soQuestions(item);
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83E\uDDE9"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, qs.length, " sentences \xB7 \u6392\u9806\u5E8F"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC46"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u4E0B\u9762\u7684\u5B57\uFF0C\u4E00\u500B\u4E00\u500B\u6392\u6210\u4E00\u53E5\u8A71")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD04"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u6392\u597D\u7684\u5B57\u53EF\u4EE5\u628A\u5B83\u62FF\u56DE\u4F86")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u6BCF\u4E00\u53E5\u90FD\u6392\u5B8C\u624D\u80FD\u4EA4\u5377")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2B50"), /*#__PURE__*/React.createElement("span", null, "80 \u5206 +10 \u9846\u661F\u3001100 \u5206 +15 \u9846\u661F"))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, "\u958B\u59CB\u6392 \xB7 Start \u2192")));
}
function SentenceOrderPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var all = useQMM(() => soQuestions(item), [item.id]);
  var [redoKeys, setRedoKeys] = useQM(null);
  var questions = useQMM(() => redoKeys ? all.filter(q => redoKeys.indexOf(q._k) >= 0) : all, [all, redoKeys]);
  var [picked, setPicked] = useQM({}); // _k → [字塊編號…]
  var [submitted, setSubmitted] = useQM(false);
  var [score, setScore] = useQM(0);
  var tilesOf = useQMM(() => {
    var m = {};
    questions.forEach((q, i) => {
      m[q._k] = soShuffle(q.words.length, (q._k.length + i + 3) * 7);
    });
    return m;
  }, [questions]);
  var builtOf = q => (picked[q._k] || []).map(i => q.words[tilesOf[q._k][i]]);
  var isRight = q => {
    var got = builtOf(q).join(' '),
      want = q.words.join(' ');
    return window.gnNorm ? window.gnNorm(got) === window.gnNorm(want) : got === want;
  };
  var doneCount = questions.filter(q => (picked[q._k] || []).length === q.words.length).length;
  var submit = () => {
    var correct = questions.filter(isRight).length;
    var wrongList = questions.filter(q => !isRight(q)).map(q => ({
      q: builtOf(q).join(' ') || '（沒排）',
      answer: q.words.join(' ')
    }));
    setScore(correct);
    setSubmitted(true);
    // v306+：只重做錯的那一輪不寫進完成紀錄，免得用子集的題數蓋掉最佳成績
    if (!redoKeys) {
      saveQuizModeCompletion(progressKey, item, {
        doneCount: questions.length,
        score: correct,
        total: questions.length,
        wrongQuestions: wrongList
      });
      if (window._onQuizComplete) window._onQuizComplete(correct, questions.length, wrongList, {
        itemId: progressKey
      });
    }
    if (correct !== questions.length && window.playSound) window.playSound('wrong');
  };
  var reset = () => {
    setRedoKeys(null);
    setPicked({});
    setSubmitted(false);
    setScore(0);
  };
  var redoWrongOnly = () => {
    setRedoKeys(questions.filter(q => !isRight(q)).map(q => q._k));
    setPicked({});
    setSubmitted(false);
    setScore(0);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "circle-player"
  }, /*#__PURE__*/React.createElement("div", {
    className: "circle-topbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("span", {
    className: "circle-instruction"
  }, item.instruction || 'Put the words in the right order.'), /*#__PURE__*/React.createElement("span", {
    className: "circle-progress"
  }, submitted ? `${score}/${questions.length}` : `${doneCount}/${questions.length}`)), /*#__PURE__*/React.createElement("div", {
    className: "circle-question-list"
  }, questions.map((q, qi) => {
    var built = builtOf(q);
    var mine = picked[q._k] || [];
    var right = submitted && isRight(q);
    return /*#__PURE__*/React.createElement("div", {
      key: q._k,
      className: `circle-question so-q${submitted ? right ? ' correct' : ' wrong' : ''}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "circle-question-number"
    }, qi + 1), /*#__PURE__*/React.createElement("div", {
      className: "circle-question-body"
    }, q.hint && /*#__PURE__*/React.createElement("div", {
      className: "so-hint"
    }, q.hint), /*#__PURE__*/React.createElement("div", {
      className: 'gnl-line so-line' + (submitted ? right ? ' ok' : ' no' : '')
    }, built.length ? built.map((w, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      className: "gnl-tile in",
      disabled: submitted,
      onClick: () => setPicked(p => ({
        ...p,
        [q._k]: mine.filter((_, j) => j !== i)
      }))
    }, w)) : /*#__PURE__*/React.createElement("span", {
      className: "gnl-line-ph"
    }, "\u9EDE\u4E0B\u9762\u7684\u5B57\uFF0C\u6392\u6210\u82F1\u6587\u53E5\u5B50")), !submitted && /*#__PURE__*/React.createElement("div", {
      className: "gnl-pool"
    }, tilesOf[q._k].map((wi, i) => mine.indexOf(i) >= 0 ? /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "gnl-tile ghost"
    }, q.words[wi]) : /*#__PURE__*/React.createElement("button", {
      key: i,
      className: "gnl-tile",
      onClick: () => setPicked(p => ({
        ...p,
        [q._k]: (p[q._k] || []).concat(i)
      }))
    }, q.words[wi]))), submitted && !right && /*#__PURE__*/React.createElement("div", {
      className: "so-ans"
    }, "\u2705 ", q.words.join(' ')), submitted && q.explain && /*#__PURE__*/React.createElement("div", {
      className: "so-why"
    }, q.explain)));
  })), /*#__PURE__*/React.createElement("div", {
    className: "circle-footer"
  }, !submitted ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: submit,
    disabled: doneCount < questions.length
  }, "Submit \xB7 \u4EA4\u5377 (", doneCount, "/", questions.length, ")") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "circle-result"
  }, score, " / ", questions.length, " correct"), score < questions.length && /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: redoWrongOnly
  }, "\u53EA\u91CD\u505A\u932F\u7684 ", questions.length - score, " \u984C"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: reset
  }, "Try again"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
    onBack: onBack,
    onBackToTasks: onBackToTasks,
    onNextTask: onNextTask
  }))));
}

/* ══════════════════════════════════════════════════════
   CLOZE TEST
══════════════════════════════════════════════════════ */
function parseClozePassage(passage) {
  var regex = /\[([^\]]+)\](?:\(([^)]*)\))?/g;
  var parts = [];
  var lastIndex = 0;
  var match;
  var blankNum = 0;
  while ((match = regex.exec(passage)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        text: passage.slice(lastIndex, match.index)
      });
    }
    blankNum++;
    parts.push({
      type: 'blank',
      num: blankNum,
      answer: match[1].trim(),
      hint: match[2] ? match[2].trim() : null
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < passage.length) {
    parts.push({
      type: 'text',
      text: passage.slice(lastIndex)
    });
  }
  return parts;
}
function ClozeIntro({
  item,
  onStart,
  prog
}) {
  var blankCount = ((item.passage || '').match(/\[[^\]]+\]/g) || []).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), item.zh && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, item.zh), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, blankCount, " blanks \xB7 \u6BB5\u843D\u586B\u7A7A"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("span", null, "\u95B1\u8B80\u6574\u6BB5\u6587\u7AE0\uFF0C\u5728\u7A7A\u683C\u4E2D\u586B\u5165\u6B63\u78BA\u7B54\u6848")), (item.wordBank || []).length >= 2 && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD24"), /*#__PURE__*/React.createElement("span", null, "\u4E0A\u9762\u6709 ", /*#__PURE__*/React.createElement("b", null, "Word Bank"), "\uFF0C", (item.wordBank || []).length, " \u500B\u5B57\u53EF\u4EE5\u9078\uFF0C\u9EDE\u4E00\u4E0B\u5C31\u586B\u9032\u7A7A\u683C")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCA1"), /*#__PURE__*/React.createElement("span", null, "\u62EC\u865F\u5167\u662F\u539F\u5F62\u63D0\u793A\uFF0C\u586B\u5165\u6B63\u78BA\u7684\u52D5\u8A5E\u8B8A\u5316")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u4E0D\u5206\u5927\u5C0F\u5BEB\uFF0C\u62FC\u5C0D\u5C31\u7B97\u5C0D"))), /*#__PURE__*/React.createElement(QmIntroDoneHint, {
    prog: prog
  }), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, "\u958B\u59CB\u586B\u7A7A \xB7 Start \u2192")));
}
function normalizeClozeAnswer(answer) {
  return String(answer || '').trim().toLowerCase().replace(/[\u2018\u2019\u02bc\uff07`]/g, "'").replace(/\s+/g, ' ');
}
function ClozePlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var parts = useQMM(() => parseClozePassage(item.passage || ''), [item.id]);
  var blanks = useQMM(() => parts.filter(p => p.type === 'blank'), [parts]);
  var total = blanks.length;
  var [inputs, setInputs] = useQM({});
  var [submitted, setSubmitted] = useQM(false);
  var [score, setScore] = useQM(0);
  var inputRefs = React.useRef({});
  var handleInput = (num, val) => setInputs(prev => ({
    ...prev,
    [num]: val
  }));

  /* ══ v408：Word Bank（Alan：「頭上要給 word bank，這樣小朋友才知道有什麼單字可以填入」）══
     ⚠ 只有 item.wordBank 真的有東西才出現。文法時態的克漏字沒有這個欄位——
     那種題目把答案列出來就等於送分，所以絕對不能「沒有就自動從答案生一份」。
     順序每次進來都重洗：word bank 的位置本身不可以變成第幾格的提示。 */
  var bank = useQMM(() => {
    var list = (item.wordBank || []).map(w => String(w || '').trim()).filter(Boolean);
    if (list.length < 2) return [];
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [item.id]);

  /* 這一格填的是不是這個字（含變化形）。變化形的判斷直接用 data.js 那份白名單，
     跟出題時挖空格用的是同一套規則，兩邊才不會各自走鐘。 */
  var bankNorm = x => String(x || '').toLowerCase().replace(/[^a-z]/g, '');
  var bankSame = (base, typed) => {
    var a = bankNorm(base),
      b = bankNorm(typed);
    if (!a || !b) return false;
    if (a === b) return true;
    return !!(window.storyHint && window.storyHint(base, typed));
  };
  /* 點一下就填進空格——iPad 上這比叫二年級生自己打字實際得多。
     目標格的規則（兩種用法都要成立）：
       · 正在打的那一格是空的（或根本沒在打任何一格）→ 填第一個空的
       · 正在打的那一格已經有字 → 換成新的（小朋友自己點進去要改）
     ⚠ 填完一定要把游標移到「下一個空格」。小朋友是一個字一個字連著點的，
        如果游標留在剛填好的那一格，第二個字就會把第一個字蓋掉（實測過）。 */
  var putBankWord = w => {
    if (submitted) return;
    /* 🔴 v476（Alan：「我選了 skeleton，它被劃掉了，但還是可以繼續選」）：
       本來「已經用過」只是把按鈕畫上刪除線，按鈕照樣按得下去
       → 連點五下，五個空格全變成同一個字（Alan 截圖）。
       改成：這個字已經填在某一格了 → 再點一下是**拿回來**，不是再填一次。
       （比直接鎖住好：小朋友填錯想換位置，一下就拿得回來。） */
    var usedAt = blanks.find(b => bankSame(w, inputs[b.num]));
    if (usedAt) {
      handleInput(usedAt.num, '');
      var el0 = inputRefs.current[usedAt.num];
      if (el0) el0.focus();
      if (window.playSound) window.playSound('tap');
      return;
    }
    var active = blanks.find(b => inputRefs.current[b.num] === document.activeElement);
    var target = active && (inputs[active.num] || '').trim() ? active : blanks.find(b => !(inputs[b.num] || '').trim()) || active || blanks[0];
    if (!target) return;
    handleInput(target.num, w);
    var next = blanks.find(b => b.num !== target.num && !(inputs[b.num] || '').trim());
    var el = inputRefs.current[(next || target).num];
    if (el) {
      el.focus();
      try {
        var n = el.value.length;
        el.setSelectionRange(n, n);
      } catch (e) {}
    }
    if (window.playSound) window.playSound('tap');
  };
  var handleKeyDown = (e, num) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      var nextRef = inputRefs.current[num + 1];
      if (nextRef) nextRef.focus();
    }
  };
  var handleSubmit = () => {
    // v306: 還有空格沒填就提醒（沒填的會算錯）——避免小朋友手滑交卷吃全錯
    var unfilled = total - answeredCount;
    if (unfilled > 0 && !window.confirm(`還有 ${unfilled} 格沒填（沒填的會算錯），確定交卷嗎？`)) return;
    var correct = 0;
    var wrongList = [];
    blanks.forEach(b => {
      var userVal = normalizeClozeAnswer(inputs[b.num]);
      if (userVal === normalizeClozeAnswer(b.answer)) {
        correct++;
      } else {
        wrongList.push({
          q: `Blank ${b.num}${b.hint ? ` (${b.hint})` : ''}`,
          answer: b.answer
        });
      }
    });
    setScore(correct);
    setSubmitted(true);
    saveQuizModeCompletion(progressKey, item, {
      doneCount: total,
      score: correct,
      total,
      wrongQuestions: wrongList
    });
    if (window._onQuizComplete) window._onQuizComplete(correct, total, wrongList, {
      itemId: progressKey
    });
  };

  // v306+: 完整重做——全部清空重來
  var restart = () => {
    setInputs({});
    setSubmitted(false);
    setScore(0);
  };
  // v306+: 只重做錯的——把答錯的空格清空、答對的保留，重新作答（整段一起再交，總題數不變＝best-score 不受影響）
  var redoWrongOnly = () => {
    setInputs(prev => {
      var next = {
        ...prev
      };
      blanks.forEach(b => {
        if (normalizeClozeAnswer(prev[b.num]) !== normalizeClozeAnswer(b.answer)) next[b.num] = '';
      });
      return next;
    });
    setSubmitted(false);
    setScore(0);
  };
  var answeredCount = blanks.filter(b => (inputs[b.num] || '').trim()).length;
  var pct = total > 0 ? Math.round(score / total * 100) : 0;
  var wrongCount = total - score;
  var renderPassage = () => parts.map((part, i) => {
    if (part.type === 'text') {
      return part.text.split('\n').reduce((acc, line, j, arr) => {
        if (j > 0) acc.push(/*#__PURE__*/React.createElement("br", {
          key: `br-${i}-${j}`
        }));
        if (line) acc.push(/*#__PURE__*/React.createElement("span", {
          key: `t-${i}-${j}`
        }, line));
        return acc;
      }, []);
    }
    var b = part;
    var userVal = inputs[b.num] || '';
    var isCorrect = submitted && normalizeClozeAnswer(userVal) === normalizeClozeAnswer(b.answer);
    var isWrong = submitted && !isCorrect;
    return /*#__PURE__*/React.createElement("span", {
      key: `b-${i}`,
      className: "cloze-blank-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "cloze-blank-num"
    }, b.num), submitted ? /*#__PURE__*/React.createElement("span", {
      className: `cloze-blank-result ${isCorrect ? 'correct' : 'wrong'}`
    }, isCorrect ? /*#__PURE__*/React.createElement(React.Fragment, null, userVal, " ", /*#__PURE__*/React.createElement("span", {
      className: "cloze-check"
    }, "\u2713")) : /*#__PURE__*/React.createElement(React.Fragment, null, userVal && /*#__PURE__*/React.createElement("span", {
      className: "cloze-wrong-ans"
    }, userVal || '—'), /*#__PURE__*/React.createElement("span", {
      className: "cloze-right-ans"
    }, b.answer))) : /*#__PURE__*/React.createElement("input", {
      ref: el => {
        inputRefs.current[b.num] = el;
      },
      className: "cloze-input",
      value: userVal,
      onChange: e => handleInput(b.num, e.target.value),
      onKeyDown: e => handleKeyDown(e, b.num),
      placeholder: "___",
      autoComplete: "off",
      autoCorrect: "off",
      spellCheck: false
    }), b.hint && /*#__PURE__*/React.createElement("span", {
      className: "cloze-hint"
    }, "(", b.hint, ")"));
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "cloze-player"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cloze-topbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    onClick: onBack
  }, "\u2190 Back"), submitted ? /*#__PURE__*/React.createElement("span", {
    className: `cloze-score-badge ${pct >= 80 ? 'great' : pct >= 60 ? 'ok' : 'low'}`
  }, score, "/", total, " \xB7 ", pct, "%") : /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12,
      color: 'var(--ink-muted)'
    }
  }, answeredCount, " / ", total, " filled")), bank.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "cloze-bank"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cloze-bank-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cloze-bank-lab"
  }, "\uD83D\uDD24 Word Bank"), !submitted && /*#__PURE__*/React.createElement("span", {
    className: "cloze-bank-hint"
  }, "\u9EDE\u4E00\u4E0B\u5C31\u586B\u9032\u7A7A\u683C\uFF0C\u518D\u9EDE\u4E00\u4E0B\u53EF\u4EE5\u62FF\u56DE\u4F86 \xB7 \u7A7A\u683C\u5F8C\u9762\u7684 (ing)\u3001(s) \u8981\u81EA\u5DF1\u6539\u6210\u6B63\u78BA\u7684\u5F62\u5F0F")), /*#__PURE__*/React.createElement("div", {
    className: "cloze-bank-words"
  }, bank.map((w, i) => {
    var used = blanks.some(b => bankSame(w, inputs[b.num]));
    return /*#__PURE__*/React.createElement("button", {
      key: w + i,
      type: "button",
      className: 'cloze-bank-w' + (used ? ' used' : '')
      /* ⚠ 一定要擋掉 mousedown 的預設行為：不然點按鈕會先把輸入框的
         焦點搶走，document.activeElement 變成按鈕本身，
         「填進正在打的那一格」就永遠找不到目標。 */,
      onMouseDown: e => e.preventDefault(),
      onClick: () => putBankWord(w),
      disabled: submitted,
      "aria-label": (used ? '拿回來：' : '填入：') + w,
      title: submitted ? '' : used ? '已經填進去了——點一下拿回來' : '點一下填進空格'
    }, w);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cloze-passage"
  }, renderPassage()), /*#__PURE__*/React.createElement("div", {
    className: "cloze-footer"
  }, !submitted ? /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: handleSubmit,
    disabled: answeredCount === 0
  }, "Submit \xB7 \u4EA4\u5377 (", answeredCount, "/", total, ")") : /*#__PURE__*/React.createElement("div", {
    className: "cloze-result-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cloze-result-emoji"
  }, pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'), /*#__PURE__*/React.createElement("span", {
    className: "cloze-result-text"
  }, score, " / ", total, " correct \xB7 ", pct, "%"), wrongCount > 0 && /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: redoWrongOnly
  }, "\u53EA\u91CD\u505A\u932F\u7684 ", wrongCount, " \u984C"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: restart
  }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
    onBack: onBack,
    onBackToTasks: onBackToTasks,
    onNextTask: onNextTask
  }))));
}

/* ══════════════════════════════════════════════════════
   WEEKLY CONTACT BOOK — 本週聯絡簿（家長看的指定作業清單）
   來源：老師用 📌 標成作業的項目（week.homework）＋ 老師留言（week.parentNote）
   狀態：從 qmProg 抓孩子的完成/分數。可收合。
══════════════════════════════════════════════════════ */
/* ── 本週總覽 hero：週次/主題/日期 + 完成度圓環 + 繼續練習 ── */
function WeekHero({
  week,
  weekIdx,
  weekOrder,
  done,
  total,
  who,
  onPrevWeek,
  onNextWeek,
  weekAvg,
  onOpenGrowth
}) {
  var pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
  var weekNum = ((week.label || '').match(/(\d+)\s*$/) || [])[1] || weekIdx + 1;
  var title = week.themeZh || week.theme || (who ? `${who} 的第 ${weekNum} 週任務` : `第 ${weekNum} 週的練習`);
  var enTheme = week.themeZh ? week.theme : '';
  // v296: 濾掉跟上方 kicker 重複的英文主題（Alan 資料常填「W16 - 本週進度」之類）
  if (enTheme && /^\s*W?\d+\s*[-–—]?\s*本週進度\s*$/i.test(enTheme)) enTheme = '';
  var R = 48,
    CIRC = 2 * Math.PI * R; // v296: 進度環放大，更像主角
  var allDone = total > 0 && done >= total;

  // v296: 圓環進度動畫＋數字 count-up（回到大廳時重播；reduced-motion 直接定住）
  var ringRef = React.useRef(null);
  var pctRef = React.useRef(null);
  var doneRef = React.useRef(null);
  useQME(() => {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var el = ringRef.current;
    if (el) {
      if (reduce) {
        el.style.strokeDashoffset = CIRC * (1 - pct / 100);
      } else {
        el.style.transition = 'none';
        el.style.strokeDashoffset = CIRC;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.style.transition = 'stroke-dashoffset 1s cubic-bezier(.3,.7,.2,1) .2s';
          el.style.strokeDashoffset = CIRC * (1 - pct / 100);
        }));
      }
    }
    var countUp = (node, target, suffix) => {
      if (!node) return;
      if (reduce || !target) {
        node.textContent = target + (suffix || '');
        return;
      }
      var dur = 950;
      var t0 = null;
      var step = ts => {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur),
          e = 1 - Math.pow(1 - p, 3);
        node.textContent = Math.round(target * e) + (suffix || '');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    countUp(pctRef.current, pct, '%');
    countUp(doneRef.current, done, '');
  }, []);
  return /*#__PURE__*/React.createElement("section", {
    className: "wh",
    "aria-label": "\u672C\u9031\u7E3D\u89BD"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wh-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wh-kicker"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wh-pill"
  }, "Week ", weekNum), /*#__PURE__*/React.createElement("span", {
    className: "wh-kick-txt"
  }, who ? `${who} 的暑假` : '本週進度'), onPrevWeek && onNextWeek && /*#__PURE__*/React.createElement("span", {
    className: "wh-weeknav"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onPrevWeek,
    disabled: weekIdx <= 0,
    "aria-label": "\u4E0A\u4E00\u9031"
  }, "\u2039"), /*#__PURE__*/React.createElement("button", {
    onClick: onNextWeek,
    disabled: weekIdx >= (weekOrder ? weekOrder.length : 1) - 1,
    "aria-label": "\u4E0B\u4E00\u9031"
  }, "\u203A"))), /*#__PURE__*/React.createElement("h1", {
    className: "wh-title"
  }, title), (enTheme || week.dateRange && week.dateRange !== '—') && /*#__PURE__*/React.createElement("div", {
    className: "wh-meta"
  }, enTheme && /*#__PURE__*/React.createElement("span", {
    className: "wh-theme-en"
  }, enTheme), week.dateRange && week.dateRange !== '—' && /*#__PURE__*/React.createElement("span", {
    className: "wh-date"
  }, week.dateRange))), /*#__PURE__*/React.createElement("div", {
    className: "wh-side"
  }, total > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "wh-ring-wrap",
    role: "img",
    "aria-label": `本週完成度 ${pct}%`
  }, /*#__PURE__*/React.createElement("svg", {
    className: "wh-ring",
    viewBox: "0 0 110 110"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "wh-ring-bg",
    cx: "55",
    cy: "55",
    r: R
  }), /*#__PURE__*/React.createElement("circle", {
    ref: ringRef,
    className: "wh-ring-fill",
    cx: "55",
    cy: "55",
    r: R,
    strokeDasharray: CIRC,
    strokeDashoffset: CIRC * (1 - pct / 100)
  })), /*#__PURE__*/React.createElement("span", {
    className: "wh-ring-num"
  }, /*#__PURE__*/React.createElement("b", {
    ref: pctRef
  }, pct, "%"), /*#__PURE__*/React.createElement("i", null, "\u5B8C\u6210\u5EA6"))), /*#__PURE__*/React.createElement("div", {
    className: "wh-side-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wh-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wh-stat"
  }, /*#__PURE__*/React.createElement("b", {
    ref: doneRef
  }, done), /*#__PURE__*/React.createElement("i", null, "\u5DF2\u5B8C\u6210")), /*#__PURE__*/React.createElement("div", {
    className: "wh-stat"
  }, /*#__PURE__*/React.createElement("b", null, total), /*#__PURE__*/React.createElement("i", null, "\u672C\u9031\u7DF4\u7FD2"))), allDone && /*#__PURE__*/React.createElement("span", {
    className: "wh-done-msg"
  }, "\uD83C\uDF89 \u672C\u9031\u5168\u90E8\u5B8C\u6210\uFF01"))) : /*#__PURE__*/React.createElement("span", {
    className: "wh-empty"
  }, "\u8001\u5E2B\u6B63\u5728\u6E96\u5099\u672C\u9031\u5167\u5BB9\uFF0C\u53EF\u4EE5\u5148\u56DE\u9867\u524D\u5E7E\u9031")));
}

/* ══════════════════════════════════════════════════════
   今天的任務（v229）——學習頁主角：老師指定作業攤平成待辦清單，
   點一條直達該單元；做到一半顯示「繼續」；完成打勾。
   （老師編輯模式仍用下面的 WeeklyContactBook 來釘作業/寫給家長的話）
══════════════════════════════════════════════════════ */
function TodayTasks({
  week,
  allItems,
  qmProg,
  weekId,
  categories,
  onOpenTask,
  weeks,
  weekOrder,
  onOpenPastTask
}) {
  /* 🔴 v509（Alan：「一樣預設都是合起來的，不然太長了，小朋友自己點開即可；
       以及如果跳出頁面再回來，一樣要合起來」）
     ⚠ v505 我修錯地方了：Alan 給的圖是**側欄**，我就只改了側欄的 qm-ugroup，
       但他真正每天看到的是這張「今天的任務」清單，用的是另一套 tt-group，
       預設值寫 `!gAll`＝只要還沒全做完就展開——也就是**永遠展開**。
     現在一律預設收起來，標題列照樣寫著 0/7，點一下才打開。 */
  var [ttOpen, setTtOpen] = useQM({});
  useQME(() => {
    setTtOpen({});
  }, [weekId]); // 換週次就全部收回去
  /* 🔴 v463（a）（實測 G3：一個還沒開始做的學生會看到 42 項、預設展開）：
     量過了——逾期區在桌機 1180×820 佔 2.7 個畫面、iPad 直式佔 2.1 個，
     「今天的任務」被推到第 2.6～3.2 個畫面，整頁 4.1 個畫面。收起來之後整頁剩 2.1 個。
     v341 當初預設展開是為了「不要讓小朋友以為作業不見了」——
     標題列那一行永遠在（會寫「之前還有 N 項」），所以收起來並不會讓它消失，
     只是不再把今天該做的事擠到三個畫面以下。 */
  var [pastOpen, setPastOpen] = useQM(false);
  /* v463（b）：展開之後再照週次收合——每一列現在多了一行（題型＋分類），
     42 列全攤開會變成 3.2 個畫面，比改之前還長。
     預設只開「最近的那一週」（最該補的），其他週收成一行，點了才展開。 */
  var [pastWk, setPastWk] = useQM({});

  // v340: 之前週次還沒完成的作業——週次一往前推，舊作業就從畫面消失，
  // 小朋友會說「作業不見了」。這裡一律列出來，可以直接點回去補做。
  /* v400（Alan 開學第一天回報）：新學期第 1 週，卻還在催「上學期 Week 16 的 2 項作業」。
     原本只要是排在前面的週次就一律往回撈，於是跨過了學期的界線。兩道防線：
     ① 封存過的週次不撈——v398 的「📦 封存」本來就是「這個學期已經退場」的意思。
        （老師端特別明顯：老師的 viewOrder 是完整清單、看得到封存的週次，
          所以圖 1 那個畫面只有老師會遇到；學生的 viewOrder 已經濾掉封存的了。）
     ② 不跨學期：週次 id 是「學期代碼-W週數」（2026-W16 → 2026、2026F-W01 → 2026F、
        g4-2026F-W03 → g4-2026F）。學期代碼不同就是上一個學期，不催。
        ⚠ 兩邊 id 只要有一個解析不出學期代碼就不套用這條——寧可多提醒，
          也不要把「這學期真的還沒做完的作業」默默藏起來（那才是 v340 當初要修的 bug）。 */
  var termKeyOf = qmTermKey; // v464：提到模組層，大廳的空分類也要用同一份
  var pastDue = useQMM(() => {
    var out = [];
    if (!weeks || !weekOrder || !weekOrder.length) return out;
    var curIdx = weekOrder.indexOf(weekId);
    if (curIdx <= 0) return out; // 已經是第一週就沒有「之前」
    var curTerm = termKeyOf(weekId);
    /* v463（c）：新的排前面。本來是 Week 1 在最上面（最舊的先看到）——
       但最該補的是「最接近現在教的那一週」，而且一打開就看到最早的失敗最打擊人。 */
    var _loop = function () {
        var wid = weekOrder[i];
        var w = weeks[wid];
        if (!w) return 0; // continue
        if (w.archived) return 0; // continue
        // v400 ①：封存＝已退場的學期
        var wTerm = termKeyOf(wid); // v400 ②：不跨學期
        if (curTerm && wTerm && wTerm !== curTerm) return 0; // continue
        var whw = w.homework || {};
        if (!Object.keys(whw).length) return 0; // continue
        var byId = {};
        (categories || []).forEach(c => ((w.items || {})[c.id] || []).forEach(it => {
          byId[it.id] = {
            it,
            catId: c.id
          };
        }));
        Object.keys(whw).forEach(id => {
          var hit = byId[id];
          if (!hit) return;
          if (getQuizItems([hit.it]).length === 0) return; // 空單元不算
          var p = (qmProg || {})[`${wid}_${id}`];
          if (p && p.done) return; // 已完成就不提醒
          /* v459（Alan：「有學生反應補交作業不會顯示已完成並且消掉」）：
             其中一種不是 bug——是「做了但沒到 80 分，所以不算完成」。
             以前這一列只寫「補做 →」，學生做完回來看到它還在，就以為壞掉了。
             把上次幾分帶出來，原因就寫在臉上。 */
          var lastPct = p && p.total && p.score != null ? Math.round(p.score / p.total * 100) : null;
          out.push({
            key: wid + '_' + id,
            wid,
            id,
            it: hit.it,
            lastPct,
            weekLabel: w.label || wid,
            cat: (categories || []).find(c => c.id === hit.catId)
          });
        });
      },
      _ret;
    for (var i = curIdx - 1; i >= 0; i--) {
      _ret = _loop();
      if (_ret === 0) continue;
    }
    return out;
  }, [weeks, weekOrder, weekId, qmProg, categories]);

  /* 🔴 v463（b）：逾期清單改用「今天的任務」那一套版型。
     實測問題：42 列裡「How Raven Brought Light To The World - Week1」原封不動重複 5 次，
     而且一個字都沒寫是哪一種題型——學生做完一個回來，五列長得一模一樣，
     根本不知道剛剛做的是哪個、還剩哪幾個。
     解法：先照週次分段，每一段再用 qmGroupByArticle（跟今天的任務、側欄同一套）
     歸成「一課一組」，列上顯示題型（qmShortLabel）。
     實測 42 列 → 5 個週次段、18 組。 */
  var pastByWeek = useQMM(() => {
    var byWeek = [];
    var seen = {};
    pastDue.forEach(t => {
      if (!seen[t.wid]) {
        seen[t.wid] = {
          wid: t.wid,
          label: t.weekLabel,
          rows: []
        };
        byWeek.push(seen[t.wid]);
      }
      seen[t.wid].rows.push(t);
    });
    return byWeek.map(wk => {
      var byKey = {};
      wk.rows.forEach(t => {
        byKey[t.id] = t;
      });
      var groups = qmGroupByArticle(wk.rows.map(t => t.it)).map(g => g.single ? {
        name: null,
        rows: [byKey[g.single.id]].filter(Boolean)
      } : {
        name: g.name,
        rows: g.items.map(it => byKey[it.id]).filter(Boolean)
      }).filter(g => g.rows.length);
      return {
        ...wk,
        n: wk.rows.length,
        groups
      };
    });
  }, [pastDue]);
  var note = week.parentNote || '';
  var hw = week.homework || {};
  /* v392: 大廳的重繪成本——本來 itemById、tasks.map、分組、排序全部裸寫在 render body，
     而且每一張作業卡都各呼叫一次 getResume（＝一次同步 localStorage 讀取＋JSON.parse），
     一次重繪就是「作業數 × 一次同步讀取」。app.jsx 的 qmProgressVersion／星星訂閱／
     簽到訂閱任何一個推播都會重繪大廳，十幾份作業就會明顯卡頓。
     這裡改成：續做表一次讀好，tasks→分組→排序整段包進 useMemo（結果與改前完全一致）。
     （getResume 內含「一週後過期」的時間判斷，改成 memo 後會凍結在 memo 建立那一刻——
       實務上沒差，沒有人會停在大廳一整週。） */
  var resumeMap = useQMM(() => loadResumeMap(), [qmProg, weekId]);
  var {
    tasks,
    flat
  } = useQMM(() => {
    var itemById = {};
    (allItems || []).forEach(it => {
      itemById[it.id] = it;
    });
    var tasks = Object.keys(hw).map(id => {
      var it = itemById[id];
      if (!it) return null;
      if (getQuizItems([it]).length === 0) return null; // v261: 空單元（0 題）不進任務清單——點進去也沒東西可做
      var prog = (qmProg || {})[`${weekId}_${id}`];
      var done = !!(prog && prog.done);
      // v311 (#21/#8): 未達 80 不算完成，但把「上次分數」留著，任務列顯示「再拚到 80」提示
      var lastPct = prog && prog.total && prog.score != null ? Math.round(prog.score / prog.total * 100) : null;
      var pct = done ? lastPct : null;
      var resume = !done ? resumeFromMap(resumeMap, `${weekId}_${id}`, null) : null;
      var cat = (categories || []).find(c => c.id === it._cat);
      return {
        id,
        it,
        cat,
        dueDate: hw[id] && hw[id].dueDate,
        done,
        pct,
        lastPct,
        resumeAt: resume ? resume.deckPos : null
      };
    }).filter(Boolean);

    // ── v235: 依「文章／主題」分組——同一篇文章的題目收在同一個標題下 ──
    // 沒有資料欄位可用，所以用標題歸戶：去掉題型字眼與編號後相同 → 同一篇
    /* v403：這裡本來自己抄了一份題型字清單，跟上面 qmGroupByArticle 用的
       QM_TYPE_WORDS 是同一件事——兩份就會走鐘，實際上也真的走鐘了
       （兩份都漏掉「配對」等新題型，側欄與任務清單各自把配對踢出群組）。
       改成共用同一份，以後補題型只要改一個地方。
       ⚠ 這是 /g 的正則，但只拿來 .replace（replace 會自己重設 lastIndex），
         不會有跨次呼叫的狀態問題；千萬不要改用 .test()。 */
    var TYPE_WORDS = QM_TYPE_WORDS;
    var SEP_TRIM = /[\s\-–—_·．.。,，()（）0-9０-９]+$/;
    var keyOf = t => String(t || '').toLowerCase().replace(TYPE_WORDS, '').replace(/[\s\-–—_·．.。,，()（）0-9０-９]+/g, '');
    var lcpOf = arr => {
      var pfx = arr[0] || '';
      for (var str of arr.slice(1)) {
        var i = 0;
        while (i < pfx.length && i < str.length && pfx[i] === str[i]) i++;
        pfx = pfx.slice(0, i);
      }
      return pfx;
    };
    var byKey = {};
    tasks.forEach(t => {
      var manual = String(t.it.group || '').trim(); // v254: 老師手動分組優先
      var k = manual ? `m:${manual.toLowerCase()}` : keyOf(t.it.title) || `_${t.id}`;
      (byKey[k] = byKey[k] || []).push(t);
    });
    // v371: 組內順序＝「先分類、再題型」。
    //   原本只看題型，於是閱讀理解的『測驗』(quiz rank 1) 會插到單字的配對連線(1.5)、填空(2) 前面
    //   ——Alan 要的是「單字全部做完才進閱讀理解」。分類順序就用 CATEGORIES 的順序
    //   （單字 → 文法 → 字根 → 閱讀理解）。
    //   另外拿掉「做完的排後面」：這是一條學習路徑，做完就跳位會讓順序一直變；
    //   完成的那列本來就有綠勾＋淺綠底，不必再靠位置區分。
    var catRank = t => {
      var i = (categories || []).findIndex(c => c.id === (t.cat && t.cat.id));
      return i < 0 ? 99 : i;
    };
    var sortRows = (a, b) => catRank(a) - catRank(b) || qmItemRank(a.it) - qmItemRank(b.it) || String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'));
    var entries = Object.values(byKey).map(group => {
      group.sort(sortRows);
      var manualName = String(group[0].it.group || '').trim(); // v254
      if (manualName) return {
        group: true,
        name: manualName,
        tasks: group
      };
      if (group.length < 2) return {
        group: false,
        tasks: group
      };
      var name = lcpOf(group.map(t => t.it.title)).replace(TYPE_WORDS, '').replace(SEP_TRIM, '').trim();
      if (name.length < 2) name = '';
      return name ? {
        group: true,
        name,
        tasks: group
      } : {
        group: false,
        tasks: group
      };
    });
    // 攤平非分組的（各自一列）；排序：未完成的組在前、依最早到期
    var flat = [];
    entries.forEach(e => {
      if (e.group) flat.push(e);else e.tasks.forEach(t => flat.push({
        group: false,
        name: null,
        tasks: [t]
      }));
    });
    flat.sort((a, b) => {
      var ad = a.tasks.every(t => t.done) ? 1 : 0,
        bd = b.tasks.every(t => t.done) ? 1 : 0;
      if (ad !== bd) return ad - bd;
      var adu = String((a.tasks.find(t => !t.done) || a.tasks[0]).dueDate || '9999');
      var bdu = String((b.tasks.find(t => !t.done) || b.tasks[0]).dueDate || '9999');
      return adu.localeCompare(bdu);
    });
    return {
      tasks,
      flat
    };
  }, [hw, allItems, qmProg, weekId, categories, resumeMap]);
  var dueText = d => {
    if (!d) return null;
    var diff = Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000);
    return diff > 1 ? `${diff} 天後到期` : diff === 1 ? '明天到期' : diff === 0 ? '今天到期' : diff >= -7 ? '已過期' : '已結束'; // v266: 過期 7 天以上＝已結束（灰色）
  };
  var doneN = tasks.filter(t => t.done).length;
  var allDone = tasks.length > 0 && doneN === tasks.length;

  // v268: 完成慶祝——這週任務第一次全部完成時，回到大廳給一個收尾儀式
  // （每週（含任務數）只慶祝一次；flag 按帳號隔離存本機）
  var [cele, setCele] = useQM(false);
  useQME(() => {
    if (!allDone) return;
    var store = 'alan-tt-cele' + (window._currentUser && window._currentUser.uid ? ':u:' + window._currentUser.uid : ':anon');
    var key = `${weekId}:${tasks.length}`;
    var seen = {};
    try {
      seen = JSON.parse(localStorage.getItem(store) || '{}');
    } catch (e) {}
    if (seen[key]) return;
    seen[key] = 1;
    try {
      localStorage.setItem(store, JSON.stringify(seen));
    } catch (e) {}
    setCele(true);
    fireCelebration(null); // v375(#7): 音效＋彩帶＋星星
  }, [allDone, tasks.length, weekId]);
  var celeScores = tasks.filter(t => t.pct != null).map(t => t.pct);
  var celeAvg = celeScores.length ? Math.round(celeScores.reduce((a, b) => a + b, 0) / celeScores.length) : null;

  // v272: 改用共用的 qmShortLabel——任務清單與側欄稱呼一致
  var rowLabel = (t, groupName) => groupName ? qmShortLabel(t.it, groupName) : t.it.title;
  var renderRow = (t, groupName) => {
    var due = dueText(t.dueDate);
    return (
      /*#__PURE__*/
      // v302: 任務列改成「完成打勾＋百分比徽章＋再練一次」的樣式（Alan 喜歡的圖4）
      React.createElement("button", {
        key: t.id,
        className: `tt-row${t.done ? ' tt-done' : ''}${groupName ? ' in-group' : ''}`,
        onClick: () => t.cat && onOpenTask(t.cat, t.id)
      }, /*#__PURE__*/React.createElement("span", {
        className: `tt-check${t.done ? ' on' : ''}`,
        "aria-hidden": "true"
      }, t.done ? '✓' : ''), t.it.type === 'upload' ? /*#__PURE__*/React.createElement("span", {
        className: "tt-ic tt-ic-upload",
        "aria-hidden": "true"
      }, "\uD83D\uDCCE") : /*#__PURE__*/React.createElement(CatIcon, {
        catId: t.cat ? t.cat.id : 'vocab',
        className: "tt-ic"
      }), /*#__PURE__*/React.createElement("span", {
        className: "tt-body"
      }, /*#__PURE__*/React.createElement("b", {
        className: "tt-name"
      }, rowLabel(t, groupName), t.done && t.pct != null && /*#__PURE__*/React.createElement("span", {
        className: "tt-pct"
      }, t.pct, "%")), /*#__PURE__*/React.createElement("span", {
        className: "tt-meta"
      }, t.it.type === 'upload' ? '上傳作業 · 拍照繳交' : t.cat ? t.cat.titleZh || t.cat.title : '', t.done ? /*#__PURE__*/React.createElement("span", null, " \xB7 \u5DF2\u5B8C\u6210") : !t.resumeAt && t.lastPct != null ? /*#__PURE__*/React.createElement("span", {
        className: "tt-tried"
      }, " \xB7 \u4E0A\u6B21 ", t.lastPct, " \u5206\uFF0C\u518D\u62DA\u5230 80") : due ? /*#__PURE__*/React.createElement("span", {
        className: due === '已過期' ? ' tt-late' : ''
      }, " \xB7 ", due) : null)), /*#__PURE__*/React.createElement("span", {
        className: "tt-state"
      }, t.done ? /*#__PURE__*/React.createElement("span", {
        className: "tt-s-again"
      }, "\u518D\u7DF4\u4E00\u6B21 \u2192") : t.resumeAt ? /*#__PURE__*/React.createElement("span", {
        className: "tt-s-resume"
      }, "\u25B6 \u7E7C\u7E8C \xB7 \u7B2C ", t.resumeAt + 1, " \u984C") : t.lastPct != null ? /*#__PURE__*/React.createElement("span", {
        className: "tt-s-todo"
      }, "\u518D\u62DA 80 \u5206 \u2192") : /*#__PURE__*/React.createElement("span", {
        className: "tt-s-todo"
      }, "\u958B\u59CB \u2192")))
    );
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "tt",
    "aria-label": "\u4ECA\u5929\u7684\u4EFB\u52D9"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tt-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tt-title"
  }, "\uD83D\uDCCC \u4ECA\u5929\u7684\u4EFB\u52D9"), tasks.length > 0 && !allDone && /*#__PURE__*/React.createElement("span", {
    className: "tt-count"
  }, "\u5B8C\u6210 ", doneN, " / ", tasks.length)), note && /*#__PURE__*/React.createElement("div", {
    className: "tt-note"
  }, "\uD83D\uDCAC \u8001\u5E2B\u7684\u8A71\uFF1A", note), pastDue.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: 'tt-past' + (pastOpen ? '' : ' closed')
  }, /*#__PURE__*/React.createElement("button", {
    className: "tt-past-head",
    onClick: () => setPastOpen(o => !o),
    "aria-expanded": pastOpen
  }, /*#__PURE__*/React.createElement("span", {
    className: "tt-past-chev",
    "aria-hidden": "true"
  }, pastOpen ? '▾' : '▸'), /*#__PURE__*/React.createElement("span", {
    className: "tt-past-headtext"
  }, /*#__PURE__*/React.createElement("b", null, "\u26A0\uFE0F \u4E4B\u524D\u9084\u6709 ", pastDue.length, " \u9805\u4F5C\u696D\u6C92\u5B8C\u6210"), /*#__PURE__*/React.createElement("span", null, pastOpen ? '補做完才算完成喔！' : '點一下看是哪幾項'))), pastOpen && /*#__PURE__*/React.createElement("div", {
    className: "tt-past-list"
  }, pastByWeek.map((wk, wi) => {
    var open = pastWk[wk.wid] !== undefined ? pastWk[wk.wid] : wi === 0; // 預設只開最近的那一週
    return /*#__PURE__*/React.createElement("div", {
      className: "tt-past-wkblock",
      key: wk.wid
    }, /*#__PURE__*/React.createElement("button", {
      className: "tt-past-wkhead",
      onClick: () => setPastWk(m => ({
        ...m,
        [wk.wid]: !open
      })),
      "aria-expanded": open
    }, /*#__PURE__*/React.createElement("span", {
      className: "tt-past-chev",
      "aria-hidden": "true"
    }, open ? '▾' : '▸'), /*#__PURE__*/React.createElement("b", null, wk.label), /*#__PURE__*/React.createElement("span", null, "\u9084\u6709 ", wk.n, " \u9805")), open && wk.groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
      className: 'tt-past-grp' + (g.name ? '' : ' solo'),
      key: g.name || gi
    }, g.name && /*#__PURE__*/React.createElement("div", {
      className: "tt-past-grpname"
    }, /*#__PURE__*/React.createElement("span", {
      className: "tt-past-grpdoc",
      "aria-hidden": "true"
    }, "\uD83D\uDCC4"), g.name, /*#__PURE__*/React.createElement("em", null, g.rows.length, " \u9805")), g.rows.map(t => /*#__PURE__*/React.createElement("button", {
      key: t.key,
      className: 'tt-past-row' + (g.name ? ' in-group' : ''),
      onClick: () => onOpenPastTask && onOpenPastTask(t.wid, t.cat, t.id)
    }, t.it.type === 'upload' ? /*#__PURE__*/React.createElement("span", {
      className: "tt-ic tt-ic-upload",
      "aria-hidden": "true"
    }, "\uD83D\uDCCE") : /*#__PURE__*/React.createElement(CatIcon, {
      catId: t.cat ? t.cat.id : 'vocab',
      className: "tt-ic"
    }), /*#__PURE__*/React.createElement("span", {
      className: "tt-past-name"
    }, /*#__PURE__*/React.createElement("b", null, g.name ? qmShortLabel(t.it, g.name) : t.it.title || t.id), /*#__PURE__*/React.createElement("span", {
      className: "tt-past-meta"
    }, t.cat ? t.cat.titleZh || t.cat.title : '', t.lastPct != null && /*#__PURE__*/React.createElement("em", {
      className: "tt-past-tried"
    }, " \xB7 \u4E0A\u6B21 ", t.lastPct, " \u5206\uFF0C\u8981 80 \u5206\u624D\u7B97\u5B8C\u6210"))), /*#__PURE__*/React.createElement("span", {
      className: "tt-past-go"
    }, "\u88DC\u505A \u2192"))))));
  }))), tasks.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "tt-empty"
  }, "\u9019\u9031\u8001\u5E2B\u6C92\u6709\u6307\u5B9A\u4F5C\u696D\u2014\u2014\u5F9E\u4E0B\u9762\u6311\u4E00\u500B\u81EA\u7531\u7DF4\u7FD2\u5427\uFF01") : /*#__PURE__*/React.createElement("div", {
    className: "tt-list"
  }, flat.map((e, i) => {
    if (!e.group) return renderRow(e.tasks[0], null);
    // v509：一律預設收起來（本來是「沒全做完就展開」＝幾乎永遠展開）
    var gDone = e.tasks.filter(t => t.done).length;
    var gAll = gDone === e.tasks.length && e.tasks.length > 0;
    var gKey = 'g:' + (e.name || i);
    var open = !!ttOpen[gKey];
    return /*#__PURE__*/React.createElement("div", {
      className: `tt-group${open ? ' open' : ''}`,
      key: `g${i}`
    }, /*#__PURE__*/React.createElement("button", {
      className: "tt-group-name",
      onClick: () => setTtOpen(o => ({
        ...o,
        [gKey]: !open
      })),
      "aria-expanded": open
    }, /*#__PURE__*/React.createElement("span", {
      className: `tt-group-chev${open ? ' open' : ''}`,
      "aria-hidden": "true"
    }, "\u25B8"), /*#__PURE__*/React.createElement("span", {
      className: "tt-group-ico",
      "aria-hidden": "true"
    }, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("span", {
      className: "tt-group-title"
    }, e.name), gAll ? /*#__PURE__*/React.createElement("span", {
      className: "tt-group-count all-done"
    }, "\u2713 \u5168\u90E8\u5B8C\u6210") : /*#__PURE__*/React.createElement("span", {
      className: "tt-group-count"
    }, gDone, " / ", e.tasks.length)), open && /*#__PURE__*/React.createElement("div", {
      className: "tt-group-rows"
    }, e.tasks.map(t => renderRow(t, e.name))));
  })), allDone && /*#__PURE__*/React.createElement("div", {
    className: "tt-alldone"
  }, "\uD83C\uDF89 \u4ECA\u5929\u7684\u4F5C\u696D\u90FD\u5B8C\u6210\u4E86\uFF0C\u592A\u68D2\u4E86\uFF01"), cele && /*#__PURE__*/React.createElement("div", {
    className: "tt-cele-overlay",
    onClick: () => setCele(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "tt-cele",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "tt-cele-emoji",
    "aria-hidden": "true"
  }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("div", {
    className: "tt-cele-title"
  }, "\u4EFB\u52D9\u5168\u90E8\u5B8C\u6210\uFF01"), /*#__PURE__*/React.createElement("div", {
    className: "tt-cele-sub"
  }, "\u5B8C\u6210 ", tasks.length, " \u9805", celeAvg != null ? ` · 平均 ${celeAvg} 分` : '', "\uFF0C\u660E\u5929\u898B\uFF01"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: () => setCele(false)
  }, "\u592A\u68D2\u4E86 \u2713"))));
}
function WeeklyContactBook({
  week,
  allItems,
  qmProg,
  weekId,
  categories,
  onEnterCat,
  editMode,
  onUpdateWeek
}) {
  var CB_KEY = 'alan-cb-collapsed';
  var [collapsed, setCollapsed] = useQM(() => {
    try {
      return localStorage.getItem(CB_KEY) !== '0';
    } catch (e) {
      return true;
    }
  });
  var toggle = () => setCollapsed(c => {
    var n = !c;
    try {
      localStorage.setItem(CB_KEY, n ? '1' : '0');
    } catch (e) {}
    return n;
  });
  var ET = window.EditableText;
  var note = week.parentNote || '';
  var hw = week.homework || {};
  var hwIds = Object.keys(hw);
  var itemById = {};
  (allItems || []).forEach(it => {
    itemById[it.id] = it;
  });

  /* 🔴 v486（Alan：「如圖1 這是什麼？太醜了吧」）：
     整排 qs1791348746400sp 這種亂碼＝幽靈作業（單元刪了、homework 裡的 id 還在）。
     任務清單與逾期清單早就 `if (!it) return null` 略過了，只有這裡還拿 id 當標題頂上去。
     ⭐ 原則跟別的清單一致：**找不到單元就不是一件作業**，直接不算。
     老師看得到有幾筆（學生／家長看不到），按一下就清掉。 */
  var ghostIds = hwIds.filter(id => !itemById[id]);
  var assignments = hwIds.filter(id => itemById[id]).map(id => {
    var it = itemById[id];
    var prog = (qmProg || {})[`${weekId}_${id}`];
    var done = !!(prog && prog.done);
    var pct = prog && prog.score != null && prog.total ? Math.round(prog.score / prog.total * 100) : null; // v270
    var cat = (categories || []).find(c => c.id === (it && it._cat));
    return {
      id,
      title: it.title,
      catTitle: cat ? cat.title : '',
      cat,
      dueDate: hw[id] && hw[id].dueDate,
      done,
      pct
    };
  });
  var total = assignments.length;
  var doneCount = assignments.filter(a => a.done).length;
  var allDone = total > 0 && doneCount === total;

  // 沒作業也保留收合條——家長才知道有這個功能（v203）

  var dueText = d => {
    if (!d) return '待完成';
    var diff = Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000);
    return diff > 0 ? `${diff} 天後到期` : diff === 0 ? '今天到期' : diff >= -7 ? '已過期' : '已結束'; // v266
  };
  return /*#__PURE__*/React.createElement("div", {
    className: `cb${collapsed ? '' : ' open'}`
  }, /*#__PURE__*/React.createElement("button", {
    className: "cb-bar",
    onClick: toggle,
    "aria-expanded": !collapsed
  }, /*#__PURE__*/React.createElement("span", {
    className: "cb-bar-title"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cb-ico"
  }, "\uD83D\uDCD3"), " \u672C\u9031\u806F\u7D61\u7C3F"), collapsed && total > 0 && !allDone && (() => {
    // 收合時直接預覽下一項作業（依到期日先後）
    var next = assignments.filter(a => !a.done).sort((a, b) => String(a.dueDate || '9999') < String(b.dueDate || '9999') ? -1 : 1)[0];
    return next ? /*#__PURE__*/React.createElement("span", {
      className: "cb-next"
    }, "\u4E0B\u4E00\u9805\uFF1A", next.title, next.dueDate ? ` · ${dueText(next.dueDate)}` : '') : null;
  })(), /*#__PURE__*/React.createElement("span", {
    className: "cb-bar-right"
  }, allDone ? /*#__PURE__*/React.createElement("span", {
    className: "cb-status done"
  }, "\u2713 \u672C\u9031\u4F5C\u696D\u90FD\u5B8C\u6210\u4E86\uFF01") : total > 0 ? /*#__PURE__*/React.createElement("span", {
    className: "cb-status"
  }, doneCount, " / ", total, " \u5B8C\u6210") : /*#__PURE__*/React.createElement("span", {
    className: "cb-status muted"
  }, "\u5C1A\u672A\u6307\u5B9A\u4F5C\u696D"), /*#__PURE__*/React.createElement("span", {
    className: `cb-chev${collapsed ? '' : ' open'}`
  }, "\u2304"))), !collapsed && /*#__PURE__*/React.createElement("div", {
    className: "cb-body"
  }, (note || editMode) && /*#__PURE__*/React.createElement("div", {
    className: "cb-note"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cb-note-ico"
  }, "\uD83D\uDCAC"), editMode ? /*#__PURE__*/React.createElement(ET, {
    value: note,
    editMode: true,
    multiline: true,
    placeholder: "\u7D66\u5BB6\u9577\u7684\u8A71\u2026\uFF08\u4F8B\uFF1A\u661F\u671F\u4E94\u524D\u5B8C\u6210\u9020\u53E5\uFF0C\u4E0B\u9031\u5C0F\u8003\u6703\u8003\uFF09",
    onChange: v => onUpdateWeek({
      parentNote: v
    }),
    className: "cb-note-input"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "cb-note-text"
  }, note)), editMode && ghostIds.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "cb-ghost"
  }, /*#__PURE__*/React.createElement("span", null, "\u26A0\uFE0F \u6709 ", /*#__PURE__*/React.createElement("b", null, ghostIds.length), " \u7B46\u4F5C\u696D\u6307\u5411\u5DF2\u7D93\u522A\u6389\u7684\u55AE\u5143\uFF08\u5B78\u751F\u770B\u4E0D\u5230\uFF0C\u4F46 LINE \u9084\u662F\u6703\u50AC\uFF09"), /*#__PURE__*/React.createElement("button", {
    className: "cb-ghost-btn",
    onClick: () => onUpdateWeek({
      homework: Object.fromEntries(Object.entries(hw).filter(([k]) => !ghostIds.includes(k)))
    })
  }, "\u6E05\u6389")), total === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "cb-empty"
  }, editMode ? '在各分類用 📌 把練習指定為作業，就會出現在這裡' : '本週尚未指定作業') : /*#__PURE__*/React.createElement("div", {
    className: "cb-list"
  }, assignments.map(a => /*#__PURE__*/React.createElement("button", {
    key: a.id,
    className: `cb-row${a.done ? ' done' : ''}`,
    onClick: () => a.cat && onEnterCat(a.cat)
  }, /*#__PURE__*/React.createElement("span", {
    className: `cb-check${a.done ? ' done' : ''}`
  }, a.done ? '✓' : ''), /*#__PURE__*/React.createElement("span", {
    className: "cb-row-info"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cb-row-title"
  }, a.title), /*#__PURE__*/React.createElement("span", {
    className: "cb-row-cat"
  }, a.catTitle)), a.done ? /*#__PURE__*/React.createElement("span", {
    className: "cb-row-status done"
  }, a.pct != null ? `完成 · ${a.pct}分` : '完成') : /*#__PURE__*/React.createElement("span", {
    className: "cb-row-due"
  }, dueText(a.dueDate)))))));
}

/* ══ 📒 v499 老師的上課紀錄（學生／家長看的）═══════════════════════════
   Alan：「然後家長也可以同步看到」。
   家長在家用的就是孩子的帳號，所以直接長在學生的首頁上。
   ⚠ 讀的是 **lessonsPublic**，那一份在**存檔時**就已經把老師的私人備註拿掉了
     ——Firestore 的規則沒辦法只擋某幾個欄位，所以不能直接開 lessons。 */
function TeacherLog({
  email
}) {
  var [doc, setDoc] = React.useState(null);
  var [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!email || !window.subscribeLessonsPublic) return;
    return window.subscribeLessonsPublic(email, setDoc);
  }, [email]);
  var rows = window.lessonRows ? window.lessonRows(doc) : [];
  if (!rows.length) return null; // 老師還沒記就不要佔版面
  var show = open ? rows : rows.slice(0, 2);
  var avg = window.lessonAvgPct ? window.lessonAvgPct(doc, 5) : null;
  var kindOf = k => (window.LESSON_KINDS || []).find(x => x.id === k) || null;
  var revOf = r => (window.REVIEW_STATES || []).find(x => x.id === r) || null;
  var pctCls = p => p >= 85 ? 'hi' : p >= 60 ? 'mid' : 'lo';
  var dparts = window.lessonDateParts || (x => ({
    md: String(x || ''),
    wd: '',
    y: ''
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: "tlog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tlog-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tlog-ttl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tlog-kicker"
  }, "Lesson Record"), /*#__PURE__*/React.createElement("b", null, "\u8001\u5E2B\u7684\u4E0A\u8AB2\u7D00\u9304")), avg != null && /*#__PURE__*/React.createElement("div", {
    className: 'tlog-avg ' + pctCls(avg)
  }, /*#__PURE__*/React.createElement("span", null, "\u8FD1 5 \u5802\u719F\u6089\u5EA6"), /*#__PURE__*/React.createElement("b", null, avg, /*#__PURE__*/React.createElement("i", null, "%")), /*#__PURE__*/React.createElement("div", {
    className: "tlog-bar"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: Math.max(0, Math.min(100, avg)) + '%'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "tlog-list"
  }, show.map((r, i) => {
    var k = kindOf(r.kind),
      rv = revOf(r.review),
      d = dparts(r.date);
    // v504：欄位先收成一份清單，版面才排得成兩欄（不然只能一行一行往下長）
    var fields = [r.did && {
      id: 'did',
      ico: '📘',
      zh: '上課內容',
      v: r.did
    }, r.prev && {
      id: 'prev',
      ico: '🔭',
      zh: '先預習了',
      v: r.prev
    }, r.hw && {
      id: 'hw',
      ico: '📕',
      zh: '回家功課',
      v: r.hw
    }, r.next && {
      id: 'next',
      ico: '➡️',
      zh: '下次進度',
      v: r.next
    }].filter(Boolean);
    return /*#__PURE__*/React.createElement("div", {
      key: r.date,
      className: 'tlog-row' + (r.kind === 'off' ? ' off' : '') + (i === 0 ? ' now' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "tlog-top"
    }, /*#__PURE__*/React.createElement("div", {
      className: "tlog-date"
    }, /*#__PURE__*/React.createElement("b", null, d.md), /*#__PURE__*/React.createElement("span", null, [d.wd, d.y].filter(Boolean).join(' · '))), /*#__PURE__*/React.createElement("div", {
      className: "tlog-tags"
    }, k && k.id !== 'normal' && /*#__PURE__*/React.createElement("span", {
      className: "tlog-k"
    }, k.ico, " ", k.zh), typeof r.pct === 'number' && /*#__PURE__*/React.createElement("span", {
      className: 'tlog-p ' + pctCls(r.pct)
    }, "\u719F\u6089\u5EA6 ", r.pct, "%"), rv && /*#__PURE__*/React.createElement("span", {
      className: 'tlog-rv ' + r.review
    }, rv.ico, " \u4E0A\u6B21\u8907\u7FD2", rv.zh))), fields.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "tlog-fs"
    }, fields.map(f => /*#__PURE__*/React.createElement("div", {
      key: f.id,
      className: 'tlog-f ' + f.id
    }, /*#__PURE__*/React.createElement("em", null, /*#__PURE__*/React.createElement("i", null, f.ico), f.zh), /*#__PURE__*/React.createElement("p", null, f.v)))));
  })), rows.length > 2 && /*#__PURE__*/React.createElement("button", {
    className: "tlog-more",
    onClick: () => setOpen(v => !v)
  }, open ? '收起' : `看全部 ${rows.length} 堂`, /*#__PURE__*/React.createElement("i", null, open ? '⌃' : '⌄')));
}

/* ══ 📄 v515 模擬考卷 ════════════════════════════════════════════════════
   Alan 給了兩張真的 G4 Formative，要做成互動版。
   跟站上其他題型最大的不同：**這是一份卷子，不是一個練習**
     · 整份在同一頁往下捲（像紙本），不是一題一畫面
     · 中途不給任何對錯回饋 —— 交卷才結算
     · 一個 100 分，分區加權；自動計分與老師手改分開寫清楚
   ⚠ 所以沒有沿用現成的播放器：它們都是「一題一畫面＋立刻回饋」，
     硬塞進考卷只會兩邊都彆扭。這裡自己畫，但計分全部交給 data.js 的 examScore。 */
/* v538 😊 心情與目標。
   開場區（item.examMood，v515 就有）與 checkin 這一大題用的是**同一塊**，
   題目與預設目標在 data.js 的 EXAM_CHECKIN 只寫一份。 */
function ExamCheckin({
  goals,
  value,
  onChange,
  disabled
}) {
  var C = window.EXAM_CHECKIN || {
    faces: ['😟', '😐', '🙂'],
    goals: []
  };
  var list = (goals && goals.length ? goals : C.goals) || [];
  var val = value && typeof value === 'object' ? value : {};
  var picked = val.goals || {};
  return /*#__PURE__*/React.createElement("div", {
    className: "ex-mood"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ex-mood-q"
  }, /*#__PURE__*/React.createElement("span", null, "1. ", C.moodQ), /*#__PURE__*/React.createElement("span", {
    className: "ex-faces"
  }, C.faces.map((f, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: 'ex-face' + (val.mood === i ? ' on' : ''),
    disabled: disabled,
    onClick: () => onChange({
      ...val,
      mood: val.mood === i ? null : i
    })
  }, f)))), /*#__PURE__*/React.createElement("div", {
    className: "ex-mood-q col"
  }, /*#__PURE__*/React.createElement("span", null, "2. ", C.goalQ), list.map((g, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: 'ex-goal' + (picked[i] ? ' on' : ''),
    disabled: disabled,
    onClick: () => onChange({
      ...val,
      goals: {
        ...picked,
        [i]: !picked[i]
      }
    })
  }, /*#__PURE__*/React.createElement("i", null, picked[i] ? '☑' : '☐'), g))));
}
function ExamPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  /* v564：這份考卷有造字／圈字首字尾的題目 → 先把字表載好（打字時的「✓ 用了 em-」提示也要靠它） */
  var [, setDictOn] = useQM(!!window.EN_DICT);
  useQME(() => {
    if (window.examNeedsDict && window.examNeedsDict(item) && window.examLoadDict) {
      window.examLoadDict().then(() => setDictOn(true));
    }
  }, [item]);
  var [ans, setAns] = useQM({});
  /* v530 📋 老師改好的申論分數（practice/{email}，老師寫、學生只讀自己的）。
     ⚠ 老師沒改之前這裡是 null，畫面上就維持「老師還沒改」——
       不可以拿 AI 的建議先頂著，那還沒有人看過。 */
  var [teacherMark, setTeacherMark] = useQM(null);
  useQME(() => {
    var em = String((window._currentUser || {}).email || '').toLowerCase();
    if (!em || !window.subscribePractice) return;
    return window.subscribePractice(em, doc => {
      setTeacherMark(window.examMarkOf ? window.examMarkOf(doc, progressKey) : null);
    });
  }, [progressKey]);
  var [mood, setMood] = useQM(null); // 開場區的心情與目標（{ mood, goals }）
  var [focus, setFocus] = useQM(null); // cloze：現在在填哪一格（點詞庫要知道填去哪）
  var focusRef = React.useRef(null); // 同上，但「永遠是最新的」——見下面 put 的說明
  var [sent, setSent] = useQM(false);
  var [res, setRes] = useQM(null);
  var topRef = React.useRef(null);
  var secs = item.sections || [];
  var T = window.examTotals ? window.examTotals(item) : {
    auto: 0,
    manual: 0,
    total: 0
  };
  /* 🔴 作答一律用「函式版」更新，不可以用這一輪 render 拿到的值去算下一個值。
     實測：連點五個字只留下最後一個、填空填到別格去、選擇題只記得最後一題——
     因為五次點擊發生在同一個 render 週期裡，每一次都拿到**同一份舊的** ans，
     後面的蓋掉前面的。小朋友手快一點就會遇到，而且畫面上看起來像「點了沒反應」。 */
  var put = (key, fn) => setAns(a => ({
    ...a,
    [key]: typeof fn === 'function' ? fn(a[key]) : fn
  }));
  var setFocusBoth = i => {
    focusRef.current = i;
    setFocus(i);
  };

  /* 作答了幾大題——交卷前提醒用（不強制，紙本也可以空著交） */
  var answered = window.examScore ? window.examScore(item, ans).parts.filter(p => {
    var v = ans[p.key];
    return Array.isArray(v) ? v.some(x => x !== undefined && x !== '') : v != null;
  }).length : 0;
  var submit = async () => {
    /* v564：造字／圈字首字尾要靠字表判「剩下的是不是真的字」——交卷前確定字表載好了，
       不然會用舊規則（開頭一樣就算）給出不同的分數。最多等 8 秒，載不到就用舊規則。 */
    if (window.examNeedsDict && window.examNeedsDict(item) && window.examLoadDict && !window.EN_DICT) {
      await Promise.race([window.examLoadDict(), new Promise(r => setTimeout(r, 8000))]);
    }
    var r = window.examScore(item, ans);
    setRes(r);
    setSent(true);
    try {
      if (topRef.current) topRef.current.scrollIntoView({
        block: 'start'
      });
    } catch (e) {}
    /* 寫進度：⚠ 用「自動計分的部分」當分數。把老師還沒改的 20 分算成 0
       會讓每個孩子的成績看起來都很慘，而且星星也會算錯。 */
    var wrongList = [];
    r.parts.forEach(pp => {
      if (!pp.auto) return;
      pp.detail.forEach(d => {
        if (d.ok === false) wrongList.push({
          q: pp.part.title || '',
          answer: d.text || ''
        });
      });
    });
    /* v530 📋 申論題：把孩子寫的字一起存起來，老師才改得到。
       ⚠ 存在 progress 底下（學生寫自己的、老師讀得到）——這條路規則早就開好了，
         開新的 collection 就要 Alan 再去 Firebase 貼一次 rules。
       ⚠ 只存「老師要改的那幾大題」，自動計分的不用留（它們已經有分數了）。 */
    var written = {};
    /* v565：批改要知道「孩子讀的是哪一篇」才判得出他有沒有寫到起因／經過／結果。
       文章常掛在同一個 Section 前面的選擇題上，所以整個 Section 裡找得到的第一篇都帶上。 */
    var passageOf = pp => {
      var own = pp.part.readText || pp.part.passage;
      if (own) return String(own).slice(0, 4000);
      var sec = (item.sections || [])[pp.si] || {};
      var hit = (sec.parts || []).find(x => x.readText || x.passage);
      return hit ? String(hit.readText || hit.passage).slice(0, 4000) : '';
    };
    r.parts.forEach(pp => {
      if (pp.auto) return;
      var v = ans[pp.key];
      /* v538 ✍️ 長文寫作也是老師改的，但它的作答是**一段字串**不是陣列——
         ⚠ 少了這一段，孩子寫滿五段交出去，老師端的批改清單裡什麼都沒有
           （畫面上完全看不出來少了，因為那一大題本來就寫「老師會親自改」）。 */
      if (pp.part.kind === 'essay') {
        var t = String(v || '').trim();
        if (t) written[pp.key] = {
          passage: passageOf(pp),
          title: pp.part.title || '',
          pts: +pp.part.pts || 0,
          rubricMax: +pp.part.rubricMax || window.EXAM_RUBRIC_MAX || 4,
          rubricSet: pp.part.rubricSet || 'basic',
          qs: [{
            q: pp.part.prompt || '',
            keyPoints: pp.part.rubric || '',
            a: t
          }]
        };
        return;
      }
      if (Array.isArray(v) && v.some(x => String(x || '').trim())) {
        written[pp.key] = {
          passage: passageOf(pp),
          title: pp.part.title || '',
          pts: +pp.part.pts || 0,
          rubricMax: +pp.part.rubricMax || window.EXAM_RUBRIC_MAX || 4,
          /* v536：用哪一套 rubric 也要帶過去，不然老師端只看得到三項 */
          rubricSet: pp.part.rubricSet || 'basic',
          qs: (pp.part.questions || []).map((q, i) => ({
            q: q.q || '',
            keyPoints: q.keyPoints || q.rubric || '',
            a: String(v[i] || '').trim()
          }))
        };
      }
    });
    saveQuizModeCompletion(progressKey, item, {
      doneCount: r.parts.filter(p => examCountsAsTask(p.part)).length,
      score: r.auto,
      total: r.autoMax,
      wrongQuestions: wrongList,
      extra: Object.keys(written).length ? {
        examWritten: written,
        examTitle: item.title || ''
      } : null
    });
    if (window._onQuizComplete) window._onQuizComplete(r.auto, r.autoMax, wrongList, {
      itemId: progressKey
    });
  };

  /* ── 老師改好的分數與評語（申論與長文寫作共用）──
     v530 做給申論、v538 長文寫作也要同一塊。
     ⚠ 抽出來的原因不只是少打字：兩邊各寫一份，改了 rubric 的顯示方式
       只有一邊會動（v526 的倒數時鐘就吃過這個虧）。 */
  var examMarkBlock = (pt, key, qs) => {
    var by = teacherMark && teacherMark.byPart && teacherMark.byPart[key] || null;
    /* v536：準則與滿分照那一大題自己的設定（寫作卷是七項） */
    var RS = window.examRubricOf ? window.examRubricOf(pt) : {
      criteria: window.EXAM_RUBRIC || [],
      max: 4
    };
    var R = RS.criteria;
    var max = RS.max;
    var marked = by && by.some(m => m && R.some(c => m[c.id] != null));
    if (!marked) return /*#__PURE__*/React.createElement("div", {
      className: "ex-manual"
    }, "\u270D\uFE0F \u9019\u4E00\u984C\u8001\u5E2B\u6703\u89AA\u81EA\u6539\uFF0C\u4E0D\u6703\u81EA\u52D5\u7D66\u5206\u3002");
    var rp = window.examRubricPart({
      pts: pt.pts,
      questions: qs,
      rubricMax: max,
      rubricSet: pt.rubricSet
    }, by);
    return /*#__PURE__*/React.createElement("div", {
      className: "ex-marked"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ex-marked-h"
    }, "\u8001\u5E2B\u6539\u597D\u4E86 ", /*#__PURE__*/React.createElement("b", null, rp.got, " / ", pt.pts)), qs.map((q, i) => {
      var m = by[i];
      if (!m) return null;
      return /*#__PURE__*/React.createElement("div", {
        className: "ex-marked-q",
        key: i
      }, /*#__PURE__*/React.createElement("span", {
        className: "ex-marked-n"
      }, i + 1), /*#__PURE__*/React.createElement("span", {
        className: "ex-marked-cr"
      }, R.map(c => /*#__PURE__*/React.createElement("em", {
        key: c.id
      }, c.zh, " ", /*#__PURE__*/React.createElement("b", null, m[c.id] == null ? '—' : m[c.id]), "/", c.max || max))), (+m._errN || 0) >= 3 && window.examErrDeduct && window.examErrDeduct(m._errN, pt.rubricSet) > 0 && /*#__PURE__*/React.createElement("span", {
        className: "ex-marked-note"
      }, "\u62FC\u5B57\uFF0F\u6587\u6CD5\u6709 ", m._errN, " \u500B\u5C0F\u932F\uFF0C\u6263 ", window.examErrDeduct(m._errN, pt.rubricSet), " \u5206"), m.note && /*#__PURE__*/React.createElement("span", {
        className: "ex-marked-note"
      }, m.note));
    }));
  };

  /* ── 一大題 ── */
  var renderPart = (pt, key, pr) => {
    var n = window.examPartN ? window.examPartN(pt) : 0;
    var v = ans[key];
    return /*#__PURE__*/React.createElement("div", {
      className: 'ex-part' + (sent ? ' done' : ''),
      key: key
    }, /*#__PURE__*/React.createElement("div", {
      className: "ex-part-h"
    }, /*#__PURE__*/React.createElement("b", null, pt.title || (window.EXAM_KINDS[pt.kind] || {}).zh), (() => {
      var pts = window.examPtsOf ? window.examPtsOf(pt) : +pt.pts || 0;
      /* ⚠ 只有「本來就不計分」的題型才寫不計分。
         老師忘記填配分的那種要維持「0 分」——
         寫成不計分就看不出來是漏填的了（出卷頁的警告也在講這件事）。 */
      if ((window.EXAM_KINDS[pt.kind] || {}).noScore) return /*#__PURE__*/React.createElement("span", {
        className: "ex-pts soft"
      }, "\u4E0D\u8A08\u5206");
      return /*#__PURE__*/React.createElement("span", {
        className: "ex-pts"
      }, sent && pr ? pr.auto ? `${pr.got} / ${pts}` : `__ / ${pts}` : `${pts} 分`, !sent && n > 1 ? `（${Math.round(pts / n * 10) / 10} 分一題）` : '');
    })()), pt.instruction && /*#__PURE__*/React.createElement("p", {
      className: "ex-inst"
    }, pt.instruction), pt.img && /*#__PURE__*/React.createElement("figure", {
      className: "ex-fig"
    }, /*#__PURE__*/React.createElement("img", {
      src: pt.img,
      alt: "",
      loading: "lazy"
    }), pt.imgCap && /*#__PURE__*/React.createElement("figcaption", null, pt.imgCap)), pt.readText && /*#__PURE__*/React.createElement("div", {
      className: "ex-read"
    }, pt.readText), pt.kind === 'order' && (() => {
      var evs = pt.events || [];
      var nums = Array.isArray(v) ? v : [];
      var shown = window.examOrderShuffle ? window.examOrderShuffle(evs) : evs.map((_, i) => i);
      return /*#__PURE__*/React.createElement(React.Fragment, null, !sent && /*#__PURE__*/React.createElement("p", {
        className: "ex-hint"
      }, "\u4F9D\u7167", /*#__PURE__*/React.createElement("b", null, "\u4E8B\u60C5\u767C\u751F\u7684\u9806\u5E8F"), "\uFF0C\u5728\u53E5\u5B50\u524D\u9762\u5BEB 1\uFF5E", evs.length, "\uFF08\u6700\u65E9\u7684\u5BEB ", /*#__PURE__*/React.createElement("b", null, "1"), "\uFF09\u3002"), /*#__PURE__*/React.createElement("ul", {
        className: "ex-order"
      }, shown.map(oi => {
        var d = sent ? pr && pr.detail[oi] || {} : null;
        return /*#__PURE__*/React.createElement("li", {
          key: oi,
          className: 'ex-ord' + (sent ? d.ok ? ' ok' : ' bad' : '')
        }, /*#__PURE__*/React.createElement("input", {
          className: "ex-ord-n",
          inputMode: "numeric",
          maxLength: 2,
          disabled: sent,
          value: nums[oi] == null ? '' : nums[oi],
          placeholder: "__",
          onChange: e => {
            var t = e.target.value.replace(/[^0-9]/g, '');
            put(key, prev => {
              var g = Array.isArray(prev) ? prev.slice() : [];
              g[oi] = t;
              return g;
            });
          }
        }), /*#__PURE__*/React.createElement("span", {
          className: "ex-ord-t"
        }, evs[oi]), sent && !d.ok && /*#__PURE__*/React.createElement("u", null, (d.why || [])[0]));
      })));
    })(), pt.kind === 'circle' && (() => {
      var picked = Array.isArray(v) ? v : [];
      var toks = window.examTokens ? window.examTokens(pt.passage) : [];
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "ex-need"
      }, "\u5708\u51FA ", /*#__PURE__*/React.createElement("b", null, pt.need || n), " \u500B\u3000", /*#__PURE__*/React.createElement("i", null, "\u5DF2\u5708 ", picked.length)), /*#__PURE__*/React.createElement("p", {
        className: "ex-passage"
      }, toks.map((tk, i) => {
        if (!tk.w) return /*#__PURE__*/React.createElement("span", {
          key: i
        }, tk.t);
        var on = picked.indexOf(tk.t) >= 0;
        var mark = sent && on ? (pr.detail.find(d => d.text === tk.t) || {}).ok ? ' ok' : ' bad' : '';
        return /*#__PURE__*/React.createElement("button", {
          key: i,
          className: 'ex-w' + (on ? ' on' : '') + mark,
          disabled: sent,
          onClick: () => put(key, prev => {
            var p = Array.isArray(prev) ? prev : [];
            return p.indexOf(tk.t) >= 0 ? p.filter(x => x !== tk.t) : p.concat([tk.t]);
          })
        }, tk.t);
      })));
    })(), pt.kind === 'cloze' && (() => {
      var got = Array.isArray(v) ? v : [];
      var used = new Set(got.filter(Boolean).map(x => String(x).toLowerCase()));
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "ex-bank"
      }, (pt.bank || []).map((w, i) => /*#__PURE__*/React.createElement("button", {
        key: i,
        className: 'ex-bw' + (used.has(String(w).toLowerCase()) ? ' used' : ''),
        disabled: sent,
        onClick: () => {
          var at = focusRef.current;
          if (at == null) return;
          put(key, prev => {
            var g = Array.isArray(prev) ? prev.slice() : [];
            g[at] = w;
            return g;
          });
          setFocusBoth(null);
        }
      }, w))), /*#__PURE__*/React.createElement("ol", {
        className: "ex-cl"
      }, (pt.items || []).map((q, i) => {
        var d = sent ? pr.detail[i] || {} : null;
        var parts2 = String(q.text || '').split('___');
        return /*#__PURE__*/React.createElement("li", {
          key: i,
          className: sent ? d.ok ? 'ok' : 'bad' : ''
        }, parts2[0], /*#__PURE__*/React.createElement("button", {
          className: 'ex-blank' + (focus === i && !sent ? ' focus' : '') + (got[i] ? ' filled' : ''),
          disabled: sent,
          onClick: () => {
            put(key, prev => {
              var g = Array.isArray(prev) ? prev.slice() : [];
              if (g[i]) g[i] = '';
              return g;
            });
            setFocusBoth(i);
          }
        }, got[i] || '＿＿＿＿'), parts2.slice(1).join('___'), sent && !d.ok && /*#__PURE__*/React.createElement("em", {
          className: "ex-fix"
        }, "\u6B63\u89E3\uFF1A", d.text));
      })), !sent && /*#__PURE__*/React.createElement("p", {
        className: "ex-hint"
      }, "\u9EDE\u4E00\u4E0B\u7A7A\u683C\uFF0C\u518D\u9EDE\u4E0A\u9762\u7684\u5B57\u5C31\u586B\u9032\u53BB\uFF1B\u518D\u9EDE\u7A7A\u683C\u4E00\u4E0B\u53EF\u4EE5\u62FF\u56DE\u4F86\u3002"));
    })(), pt.kind === 'quiz' && /*#__PURE__*/React.createElement("ol", {
      className: "ex-q"
    }, (pt.questions || []).map((q, i) => {
      var d = sent ? pr.detail[i] || {} : null;
      return /*#__PURE__*/React.createElement("li", {
        key: i,
        className: sent ? d.ok ? 'ok' : 'bad' : ''
      }, /*#__PURE__*/React.createElement("p", {
        className: "ex-qt"
      }, q.q), (q.options || []).map((o, oi) => {
        var on = (Array.isArray(v) ? v[i] : undefined) === oi;
        var isAns = sent && oi === q.answer;
        return /*#__PURE__*/React.createElement("button", {
          key: oi,
          className: 'ex-opt' + (on ? ' on' : '') + (isAns ? ' ans' : ''),
          disabled: sent,
          onClick: () => put(key, prev => {
            var g = Array.isArray(prev) ? prev.slice() : [];
            g[i] = oi;
            return g;
          })
        }, /*#__PURE__*/React.createElement("i", null, on ? '●' : '○'), o);
      }));
    })), pt.kind === 'affix' && (() => {
      var slots = Array.isArray(v) ? v : [];
      var setSlot = (i, patch) => put(key, prev => {
        var g = Array.isArray(prev) ? prev.map(x => ({
          ...x
        })) : [];
        g[i] = {
          ...(g[i] || {}),
          ...patch
        };
        return g;
      });
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "ex-affixbox"
      }, (pt.affixes || []).map((a, i) => /*#__PURE__*/React.createElement("span", {
        key: i
      }, a))), Array.from({
        length: n
      }, (_, i) => {
        var sl = slots[i] || {};
        var d = sent ? pr.detail[i] || {} : null;
        /* v563：用了哪個字首／字尾由「字本身」認出來，按鈕只是輔助——自動亮起來給他看 */
        var det = window.examAffixDetect ? window.examAffixDetect(sl.word, pt.affixes) : '';
        return /*#__PURE__*/React.createElement("div", {
          className: 'ex-af' + (sent ? d.ok ? ' ok' : ' bad' : ''),
          key: i
        }, /*#__PURE__*/React.createElement("div", {
          className: "ex-af-row"
        }, /*#__PURE__*/React.createElement("label", null, "Word:"), /*#__PURE__*/React.createElement("span", {
          className: "ex-af-picks"
        }, (pt.affixes || []).map((a, k) => /*#__PURE__*/React.createElement("button", {
          key: k,
          className: 'ex-af-p' + ((det ? det === a : sl.affix === a) ? ' on' : ''),
          disabled: sent,
          onClick: () => setSlot(i, {
            affix: sl.affix === a ? '' : a
          })
        }, a))), /*#__PURE__*/React.createElement("input", {
          className: "ex-af-w",
          disabled: sent,
          value: sl.word || '',
          placeholder: "\u4F60\u9020\u7684\u5B57\uFF08\u4E0D\u7528\u5148\u9EDE\u6309\u9215\uFF09",
          onChange: e => setSlot(i, {
            word: e.target.value
          })
        }), !sent && det && /*#__PURE__*/React.createElement("em", {
          className: "ex-af-det"
        }, "\u2713 \u7528\u4E86 ", det), !sent && !det && String(sl.word || '').trim().length >= 4 && window.EN_DICT && /*#__PURE__*/React.createElement("em", {
          className: "ex-af-det warn"
        }, "\u9084\u6C92\u7528\u5230 ", (pt.affixes || []).join('、'), "\uFF08\u62FF\u6389\u4E4B\u5F8C\u8981\u5269\u4E0B\u4E00\u500B\u771F\u7684\u5B57\uFF09")), /*#__PURE__*/React.createElement("div", {
          className: "ex-af-row"
        }, /*#__PURE__*/React.createElement("label", null, "Sentence:"), /*#__PURE__*/React.createElement("input", {
          className: "ex-af-s",
          disabled: sent,
          value: sl.sentence || '',
          placeholder: `用這個字造一個句子（${pt.minWords || 5} 個字以上）`,
          onChange: e => setSlot(i, {
            sentence: e.target.value
          })
        }), !sent && /*#__PURE__*/React.createElement("em", {
          className: "ex-af-n"
        }, String(sl.sentence || '').split(/\s+/).filter(Boolean).length, " \u5B57")), sent && (d.why || []).length > 0 && /*#__PURE__*/React.createElement("ul", {
          className: "ex-why"
        }, d.why.map((w, k) => /*#__PURE__*/React.createElement("li", {
          key: k
        }, w))));
      }), sent && pr && pr.note && /*#__PURE__*/React.createElement("div", {
        className: "ex-partnote"
      }, "\u26A0 ", pr.note));
    })(), pt.kind === 'genq' && (() => {
      var got = Array.isArray(v) ? v : [];
      return /*#__PURE__*/React.createElement(React.Fragment, null, pt.passage && /*#__PURE__*/React.createElement("div", {
        className: "ex-read"
      }, pt.passage), /*#__PURE__*/React.createElement("ol", {
        className: "ex-genq"
      }, Array.from({
        length: n
      }, (_, i) => {
        var d = sent ? pr.detail[i] || {} : null;
        return /*#__PURE__*/React.createElement("li", {
          className: sent ? d.ok ? 'ok' : 'bad' : '',
          key: i
        }, /*#__PURE__*/React.createElement("input", {
          disabled: sent,
          value: got[i] || '',
          placeholder: "\u5BEB\u4E00\u500B\u6587\u7AE0\u4E0A\u6C92\u6709\u7684\u554F\u984C\u2026",
          onChange: e => {
            var t = e.target.value;
            put(key, prev => {
              var g = Array.isArray(prev) ? prev.slice() : [];
              g[i] = t;
              return g;
            });
          }
        }), sent && (d.why || []).length > 0 && /*#__PURE__*/React.createElement("ul", {
          className: "ex-why"
        }, d.why.map((w, k) => /*#__PURE__*/React.createElement("li", {
          key: k
        }, w))));
      })), !sent && /*#__PURE__*/React.createElement("p", {
        className: "ex-hint"
      }, "\u554F\u984C\u8981\u8DDF\u9019\u500B\u6545\u4E8B\u6709\u95DC\uFF0C\u800C\u4E14", /*#__PURE__*/React.createElement("b", null, "\u7B54\u6848\u4E0D\u80FD\u76F4\u63A5\u5BEB\u5728\u6587\u7AE0\u4E0A"), "\u3002"));
    })(), pt.kind === 'storymap' && (() => {
      var secs = pt.sections || window.EXAM_STORY_SECTIONS || [];
      var per = +pt.need || 2;
      var got = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
      var di = 0; // detail 是攤平的，要照同樣順序對回去
      return /*#__PURE__*/React.createElement(React.Fragment, null, pt.passage && /*#__PURE__*/React.createElement("div", {
        className: "ex-read"
      }, pt.passage), /*#__PURE__*/React.createElement("div", {
        className: "ex-story"
      }, secs.map(sec => /*#__PURE__*/React.createElement("div", {
        className: "ex-story-box",
        key: sec.id
      }, /*#__PURE__*/React.createElement("div", {
        className: "ex-story-h"
      }, /*#__PURE__*/React.createElement("b", null, sec.zh), /*#__PURE__*/React.createElement("span", null, sec.q)), Array.from({
        length: per
      }, (_, i) => {
        var d = sent ? pr.detail[di] || {} : null;
        di++;
        return /*#__PURE__*/React.createElement("div", {
          className: 'ex-story-row' + (sent ? d.ok ? ' ok' : ' bad' : ''),
          key: i
        }, /*#__PURE__*/React.createElement("textarea", {
          rows: 2,
          disabled: sent,
          value: (got[sec.id] || [])[i] || '',
          placeholder: sent ? '' : '寫一句…',
          onChange: e => {
            var t = e.target.value;
            put(key, prev => {
              var o = prev && typeof prev === 'object' && !Array.isArray(prev) ? {
                ...prev
              } : {};
              var arr = (o[sec.id] || []).slice();
              arr[i] = t;
              o[sec.id] = arr;
              return o;
            });
          }
        }), sent && (d.why || []).length > 0 && /*#__PURE__*/React.createElement("ul", {
          className: "ex-why"
        }, d.why.map((x, k) => /*#__PURE__*/React.createElement("li", {
          key: k
        }, x))));
      })))), !sent && /*#__PURE__*/React.createElement("p", {
        className: "ex-hint"
      }, "\u6BCF\u4E00\u683C\u5BEB ", /*#__PURE__*/React.createElement("b", null, "\u4E00\u53E5"), "\uFF0C\u81F3\u5C11 ", pt.minWords || 4, " \u500B\u5B57\uFF0C\u8981\u662F", /*#__PURE__*/React.createElement("b", null, "\u9019\u7BC7\u6587\u7AE0\u88E1\u7684\u4E8B"), "\u3002"));
    })(), pt.kind === 'usewords' && (() => {
      /* ⚠ 樣式照 affix 那一段原本的結構：.ex-affixbox 是詞庫整排、
         .ex-af 是「一題」、.ex-af-picks 是選字那一排、.ex-af-p 是單一顆。
         第一版我把 .ex-bw（單一個字塊）當成容器用，整排字就黏在一起了。 */
      var bank = pt.bank || [];
      var slots = Array.isArray(v) ? v : [];
      var setSlot = (i, patch) => put(key, prev => {
        var g = Array.isArray(prev) ? prev.map(x => ({
          ...x
        })) : [];
        g[i] = {
          ...(g[i] || {}),
          ...patch
        };
        return g;
      });
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "ex-affixbox"
      }, bank.map((bw, i) => /*#__PURE__*/React.createElement("span", {
        key: i
      }, bw))), Array.from({
        length: n
      }, (_, i) => {
        var sl = slots[i] || {};
        var d = sent ? pr.detail[i] || {} : null;
        var words = String(sl.sentence || '').split(/\s+/).filter(Boolean).length;
        return /*#__PURE__*/React.createElement("div", {
          className: 'ex-af' + (sent ? d.ok ? ' ok' : ' bad' : ''),
          key: i
        }, /*#__PURE__*/React.createElement("div", {
          className: "ex-af-row"
        }, /*#__PURE__*/React.createElement("label", null, "\u6311\u4E00\u500B\u5B57\uFF1A"), /*#__PURE__*/React.createElement("span", {
          className: "ex-af-picks"
        }, bank.map((bw, k) => /*#__PURE__*/React.createElement("button", {
          key: k,
          className: 'ex-af-p' + (sl.word === bw ? ' on' : ''),
          disabled: sent,
          onClick: () => setSlot(i, {
            word: sl.word === bw ? '' : bw
          })
        }, bw)))), /*#__PURE__*/React.createElement("div", {
          className: "ex-af-row"
        }, /*#__PURE__*/React.createElement("label", null, "Sentence:"), /*#__PURE__*/React.createElement("input", {
          className: "ex-af-s",
          disabled: sent,
          value: sl.sentence || '',
          placeholder: `用這個字造一句（至少 ${pt.minWords || 6} 個字）`,
          onChange: e => setSlot(i, {
            sentence: e.target.value
          })
        }), !sent && /*#__PURE__*/React.createElement("i", {
          className: "ex-af-n"
        }, words, " \u500B\u5B57")), sent && (d.why || []).length > 0 && /*#__PURE__*/React.createElement("ul", {
          className: "ex-why"
        }, d.why.map((x, k) => /*#__PURE__*/React.createElement("li", {
          key: k
        }, x))));
      }), !sent && /*#__PURE__*/React.createElement("p", {
        className: "ex-hint"
      }, "\u6BCF\u500B\u5B57\u53EA\u80FD\u7528", /*#__PURE__*/React.createElement("b", null, "\u4E00\u6B21"), "\uFF1B\u53EF\u4EE5\u52A0 when / because / and / but / so \u8B93\u53E5\u5B50\u9577\u4E00\u9EDE\u3002"));
    })(), pt.kind === 'fixbox' && (() => {
      var boxes = Array.isArray(v) ? v : [];
      return /*#__PURE__*/React.createElement(React.Fragment, null, pt.passage && /*#__PURE__*/React.createElement("div", {
        className: "ex-read ex-read-fix"
      }, pt.passage), /*#__PURE__*/React.createElement("div", {
        className: "ex-fixgrid"
      }, Array.from({
        length: n
      }, (_, i) => {
        var d = sent ? pr && pr.detail[i] || {} : null;
        return /*#__PURE__*/React.createElement("div", {
          className: 'ex-fixbox' + (sent ? d.ok ? ' ok' : ' bad' : ''),
          key: i
        }, /*#__PURE__*/React.createElement("i", {
          className: "ex-fixn"
        }, i + 1), /*#__PURE__*/React.createElement("input", {
          disabled: sent,
          value: boxes[i] || '',
          placeholder: "\u2026",
          onChange: e => {
            var t = e.target.value;
            put(key, prev => {
              var g = Array.isArray(prev) ? prev.slice() : [];
              g[i] = t;
              return g;
            });
          }
        }), sent && (d.why || []).length > 0 && /*#__PURE__*/React.createElement("u", null, d.why[0]));
      })), !sent && /*#__PURE__*/React.createElement("p", {
        className: "ex-hint"
      }, "\u628A", /*#__PURE__*/React.createElement("b", null, "\u6539\u597D\u7684\u5B57"), "\u5BEB\u9032\u683C\u5B50\u88E1\uFF08\u9806\u5E8F\u6C92\u95DC\u4FC2\uFF0C\u627E\u5230\u5C31\u5BEB\uFF09\u3002\u5927\u5C0F\u5BEB\u8981\u5BEB\u5C0D\u3002"), sent && pt.answers && /*#__PURE__*/React.createElement("p", {
        className: "ex-hint"
      }, "\u6B63\u78BA\u7B54\u6848\uFF1A", /*#__PURE__*/React.createElement("b", null, (pt.answers || []).join('　'))));
    })(), pt.kind === 'evidence' && (() => {
      var rows = Array.isArray(v) ? v : [];
      return /*#__PURE__*/React.createElement(React.Fragment, null, pt.passage && /*#__PURE__*/React.createElement("div", {
        className: "ex-read"
      }, pt.passage), pt.question && /*#__PURE__*/React.createElement("p", {
        className: "ex-qt"
      }, pt.question), Array.from({
        length: n
      }, (_, i) => {
        var d = sent ? pr && pr.detail[i] || {} : null;
        var words = String(rows[i] || '').split(/\s+/).filter(Boolean).length;
        return /*#__PURE__*/React.createElement("div", {
          className: 'ex-ev' + (sent ? d.ok ? ' ok' : ' bad' : ''),
          key: i
        }, /*#__PURE__*/React.createElement("label", null, "Detail ", i + 1), /*#__PURE__*/React.createElement("textarea", {
          rows: 2,
          disabled: sent,
          value: rows[i] || '',
          placeholder: sent ? '' : `用文章裡的話寫完整的句子（至少 ${pt.minWords || 5} 個字）`,
          onChange: e => {
            var t = e.target.value;
            put(key, prev => {
              var g = Array.isArray(prev) ? prev.slice() : [];
              g[i] = t;
              return g;
            });
          }
        }), !sent && /*#__PURE__*/React.createElement("i", {
          className: "ex-af-n"
        }, words, " \u500B\u5B57"), sent && d.quote && /*#__PURE__*/React.createElement("u", {
          className: "ex-ev-q"
        }, "\u5F15\u7528\u5230\uFF1A\u2026", d.quote, "\u2026"), sent && (d.why || []).length > 0 && /*#__PURE__*/React.createElement("ul", {
          className: "ex-why"
        }, d.why.map((x, k) => /*#__PURE__*/React.createElement("li", {
          key: k
        }, x))));
      }), !sent && /*#__PURE__*/React.createElement("p", {
        className: "ex-hint"
      }, "\u6BCF\u4E00\u683C\u8981", /*#__PURE__*/React.createElement("b", null, "\u5F9E\u6587\u7AE0\u88E1\u627E\u4E00\u53E5\u8A71\u7576\u8B49\u64DA"), "\uFF0C\u800C\u4E14\u6BCF\u4E00\u683C\u8981\u7528", /*#__PURE__*/React.createElement("b", null, "\u6587\u7AE0\u88E1\u4E0D\u540C\u7684\u53E5\u5B50"), "\u2014\u2014 \u540C\u4E00\u53E5\u8A71\u7684\u524D\u534A\u548C\u5F8C\u534A\u7B97\u540C\u4E00\u500B\u7D30\u7BC0\u3002"));
    })(), pt.kind === 'essay' && (() => {
      var text = typeof v === 'string' ? v : '';
      var st = window.examEssayStats ? window.examEssayStats(text, pt) : null;
      return /*#__PURE__*/React.createElement(React.Fragment, null, pt.prompt && /*#__PURE__*/React.createElement("p", {
        className: "ex-qt ex-essay-q"
      }, pt.prompt), (pt.vocab || []).length > 0 && /*#__PURE__*/React.createElement("div", {
        className: "ex-affixbox"
      }, (pt.vocab || []).map((w, i) => /*#__PURE__*/React.createElement("span", {
        key: i,
        className: st && st.used.indexOf(w) >= 0 ? 'used' : ''
      }, w))), /*#__PURE__*/React.createElement("textarea", {
        className: "ex-essay",
        rows: 14,
        disabled: sent,
        value: text,
        placeholder: sent ? '' : `寫 ${pt.paras || 5} 段，每段至少 ${pt.sentsPerPara || 4} 句。段落之間空一行。`,
        onChange: e => put(key, e.target.value)
      }), st &&
      /*#__PURE__*/
      /* ⭐ 這幾項就是 rubric 裡「數得出來」的那幾項，交卷前先讓他自己看到。
         ⚠ 這不是分數——寫得好不好是老師看的，所以不給對錯顏色。 */
      React.createElement("div", {
        className: "ex-essay-stat"
      }, /*#__PURE__*/React.createElement("span", {
        className: st.paras >= st.needParas ? 'hit' : ''
      }, st.paras, " / ", st.needParas, " \u6BB5"), /*#__PURE__*/React.createElement("span", {
        className: st.shortParas === 0 && st.paras > 0 ? 'hit' : ''
      }, "\u6BCF\u6BB5\u53E5\u6578 ", st.sents.join('·') || '—', "\uFF08\u8981 ", st.needSents, " \u53E5\uFF09"), /*#__PURE__*/React.createElement("span", null, st.words, " \u500B\u5B57"), (pt.vocab || []).length > 0 && /*#__PURE__*/React.createElement("span", {
        className: st.used.length >= (pt.vocab || []).length ? 'hit' : ''
      }, "\u7528\u5230 ", st.used.length, " / ", (pt.vocab || []).length, " \u500B\u55AE\u5B57")), examMarkBlock(pt, key, [{
        q: pt.prompt || '',
        rubric: pt.rubric || ''
      }]));
    })(), pt.kind === 'checkin' && /*#__PURE__*/React.createElement(ExamCheckin, {
      goals: pt.goals,
      value: v,
      disabled: sent,
      onChange: x => put(key, x)
    }), pt.kind === 'short' && /*#__PURE__*/React.createElement(React.Fragment, null, pt.passage && /*#__PURE__*/React.createElement("div", {
      className: "ex-read"
    }, pt.passage), (pt.questions || []).map((q, i) => /*#__PURE__*/React.createElement("div", {
      className: "ex-sa",
      key: i
    }, /*#__PURE__*/React.createElement("p", {
      className: "ex-qt"
    }, q.q, q.pts ? /*#__PURE__*/React.createElement("span", {
      className: "ex-sapts"
    }, "\uFF08", q.pts, " \u5206\uFF09") : null), /*#__PURE__*/React.createElement("textarea", {
      rows: q.rows || 4,
      disabled: sent,
      value: (Array.isArray(v) ? v[i] : '') || '',
      placeholder: sent ? '' : '寫在這裡…',
      onChange: e => {
        var t = e.target.value;
        put(key, prev => {
          var g = Array.isArray(prev) ? prev.slice() : [];
          g[i] = t;
          return g;
        });
      }
    }), q.rubric && /*#__PURE__*/React.createElement("div", {
      className: "ex-rub"
    }, "\u8A55\u5206\u91CD\u9EDE\uFF1A", q.rubric))), examMarkBlock(pt, key, pt.questions || [])));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "ex-paper",
    ref: topRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "ex-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "ex-kicker"
  }, item.examKicker || '康橋國際學校'), /*#__PURE__*/React.createElement("h2", null, item.title)), /*#__PURE__*/React.createElement("div", {
    className: "ex-score"
  }, sent && res ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    className: res.pct >= 80 ? 'hi' : res.pct >= 60 ? 'mid' : 'lo'
  }, res.auto), /*#__PURE__*/React.createElement("span", null, "/ ", res.autoMax)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", null, T.total), /*#__PURE__*/React.createElement("span", null, "\u5206")))), sent && res && /*#__PURE__*/React.createElement("div", {
    className: "ex-result"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ex-res-rows"
  }, res.bySection.map((sc, i) => /*#__PURE__*/React.createElement("div", {
    className: "ex-res-row",
    key: i
  }, /*#__PURE__*/React.createElement("b", null, sc.name), /*#__PURE__*/React.createElement("span", null, sc.max ? `${sc.got} / ${sc.max}` : '—'), sc.manual > 0 && /*#__PURE__*/React.createElement("i", null, "\uFF0B", sc.manual, " \u5206\u8001\u5E2B\u6539")))), res.manualMax > 0 && /*#__PURE__*/React.createElement("p", {
    className: "ex-res-note"
  }, "\u9019\u4EFD\u5377\u5B50\u6709 ", /*#__PURE__*/React.createElement("b", null, res.manualMax, " \u5206"), "\u662F\u554F\u7B54\u984C\uFF0C\u8001\u5E2B\u6703\u7167 rubric \u89AA\u81EA\u6539\u2014\u2014 \u4E0A\u9762\u7684 ", res.auto, "/", res.autoMax, " \u53EA\u662F\u81EA\u52D5\u8A08\u5206\u7684\u90E8\u5206\u3002")), item.examMood && !sent && /*#__PURE__*/React.createElement(ExamCheckin, {
    value: mood,
    onChange: setMood
  }), secs.map((sec, si) => /*#__PURE__*/React.createElement("section", {
    className: "ex-sec",
    key: si
  }, /*#__PURE__*/React.createElement("div", {
    className: "ex-sec-h"
  }, /*#__PURE__*/React.createElement("b", null, sec.name || `Section ${si + 1}`), sec.pct ? /*#__PURE__*/React.createElement("span", null, "(", sec.pct, "%)") : null), (sec.parts || []).map((pt, pi) => {
    var key = si + '_' + pi;
    var pr = sent && res ? res.parts.find(x => x.key === key) : null;
    return renderPart(pt, key, pr);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ex-foot"
  }, !sent ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "ex-submit",
    onClick: () => {
      var tot = res ? res.parts.length : window.examScore ? window.examScore(item, ans).parts.length : 0;
      if (answered < tot && !confirm(`還有 ${tot - answered} 大題沒作答，確定要交卷嗎？`)) return;
      submit();
    }
  }, "\u4EA4\u5377"), /*#__PURE__*/React.createElement("span", {
    className: "ex-foot-n"
  }, "\u4EA4\u5377\u4E4B\u5F8C\u624D\u6703\u77E5\u9053\u5206\u6578\uFF0C\u4E2D\u9014\u4E0D\u6703\u544A\u8A34\u4F60\u5C0D\u4E0D\u5C0D\u2014\u2014\u8DDF\u771F\u7684\u8003\u8A66\u4E00\u6A23\u3002")) : /*#__PURE__*/React.createElement(React.Fragment, null, onNextTask && /*#__PURE__*/React.createElement("button", {
    className: "ex-submit",
    onClick: onNextTask
  }, "\u4E0B\u4E00\u500B\u7DF4\u7FD2 \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn",
    onClick: onBackToTasks || onBack
  }, "\u56DE\u6E05\u55AE"))));
}

/* ── Growth data (shared by the full report + the inline learning-page card) ── */
function computeGrowthData(weeks, weekOrder, qmProg, categories) {
  var perWeek = [];
  var totalDone = 0,
    gSum = 0,
    gN = 0;
  (weekOrder || []).forEach(wid => {
    var w = weeks[wid];
    if (!w) return;
    var total = 0,
      done = 0,
      sSum = 0,
      sN = 0;
    (categories || []).forEach(c => {
      (w.items && w.items[c.id] || []).forEach(it => {
        total++;
        var p = (qmProg || {})[`${wid}_${it.id}`];
        if (p && p.done) {
          done++;
          totalDone++;
          // v270: 沒有分數的完成（單字卡、待批改的上傳作業）不列入平均——否則被當 0 分拉低
          if (p.score != null && p.total) {
            var pct = Math.min(100, Math.round(p.score / p.total * 100));
            sSum += pct;
            sN++;
            gSum += pct;
            gN++;
          }
        }
      });
    });
    if (total === 0) return;
    perWeek.push({
      wid,
      label: w.label || wid,
      dateRange: w.dateRange || '',
      theme: w.themeZh || w.theme || '',
      total,
      done,
      pct: Math.round(done / total * 100),
      avg: sN ? Math.round(sSum / sN) : null
    });
  });
  // v271: 最後一週還沒全做完＝進行中（曲線與列表都特別標示，不讓它看起來像退步）
  perWeek.forEach((p, i) => {
    p.inProgress = i === perWeek.length - 1 && p.done < p.total;
  });
  var scoredWeeks = perWeek.filter(p => p.avg != null);
  var lastScored = scoredWeeks[scoredWeeks.length - 1] || null;
  var prevScored = scoredWeeks[scoredWeeks.length - 2] || null;
  return {
    perWeek,
    totalDone,
    scoredWeeks,
    thisWeekAvg: lastScored ? lastScored.avg : null,
    delta: lastScored && prevScored ? lastScored.avg - prevScored.avg : null,
    avgScore: gN ? Math.round(gSum / gN) : null
  };
}

/* ── Growth Report (parent-facing, cross-week progress) ──── */
function GrowthReport({
  weeks,
  weekOrder,
  qmProg,
  categories,
  studentName,
  onClose
}) {
  React.useEffect(() => {
    var onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  var data = React.useMemo(() => computeGrowthData(weeks, weekOrder, qmProg, categories), [weeks, weekOrder, qmProg, categories]);
  var pw = data.perWeek;
  var hasData = data.totalDone > 0;
  // v298: 數字 count-up（跟 WeekHero 一致的質感）
  var cuWeek = useCountUp(data.thisWeekAvg || 0, 900, 400);
  var cuAvg = useCountUp(data.avgScore || 0, 900, 520);
  var cuDone = useCountUp(data.totalDone || 0, 900, 640);

  // ── SVG line chart geometry ──
  // v271: 主軸改「每週平均分數」（家長最在意的成果）；只畫有分數的週
  var cw = data.scoredWeeks;
  var W = 640,
    H = 200,
    padL = 14,
    padR = 14,
    padT = 26,
    padB = 30;
  var innerW = W - padL - padR,
    innerH = H - padT - padB,
    baseline = padT + innerH;
  var n = cw.length;
  var xAt = i => n > 1 ? padL + i * innerW / (n - 1) : padL + innerW / 2;
  var yAt = v => padT + (1 - v / 100) * innerH;
  // 進行中的那一點用虛線接入：實線只畫到倒數第二點
  var lastInProg = n > 1 && cw[n - 1].inProgress;
  var solidPts = (lastInProg ? cw.slice(0, n - 1) : cw).map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.avg).toFixed(1)}`).join(' ');
  var labelStep = n <= 7 ? 1 : Math.ceil(n / 6);
  var shortLabel = l => (l || '').replace(/Week\s*/i, 'W');
  return /*#__PURE__*/React.createElement("div", {
    className: "growth-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "growth-sheet",
    onClick: e => e.stopPropagation(),
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "\u5B78\u7FD2\u6210\u9577"
  }, /*#__PURE__*/React.createElement("header", {
    className: "growth-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "growth-kicker"
  }, "\uD83D\uDCC8 \u5B78\u7FD2\u6210\u9577"), /*#__PURE__*/React.createElement("h2", {
    className: "growth-title"
  }, studentName ? `${studentName} 的進步軌跡` : '這學期的進步軌跡')), /*#__PURE__*/React.createElement("button", {
    className: "growth-x",
    onClick: onClose,
    "aria-label": "\u95DC\u9589"
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "growth-body"
  }, !hasData ? /*#__PURE__*/React.createElement("div", {
    className: "growth-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "growth-empty-ico"
  }, "\uD83C\uDF31"), /*#__PURE__*/React.createElement("p", {
    className: "growth-empty-title"
  }, "\u9084\u6C92\u6709\u5B78\u7FD2\u7D00\u9304"), /*#__PURE__*/React.createElement("p", {
    className: "growth-empty-sub"
  }, "\u5B8C\u6210\u7DF4\u7FD2\u5F8C\uFF0C\u9019\u88E1\u6703\u756B\u51FA\u6BCF\u9031\u7684\u6210\u9577\u8ECC\u8DE1\uFF0C\u770B\u5F97\u5230\u4E00\u6574\u5B78\u671F\u7684\u9032\u6B65\u3002")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "growth-stats growth-stats-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "growth-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "growth-stat-num"
  }, data.thisWeekAvg != null ? cuWeek : '—', /*#__PURE__*/React.createElement("em", null, "\u5206")), /*#__PURE__*/React.createElement("div", {
    className: "growth-stat-label"
  }, "\u672C\u9031\u5E73\u5747"), data.delta != null && data.delta !== 0 && /*#__PURE__*/React.createElement("div", {
    className: `growth-stat-delta${data.delta > 0 ? ' up' : ' down'}`
  }, data.delta > 0 ? '▲' : '▼', " \u8F03\u4E0A\u9031 ", data.delta > 0 ? '+' : '', data.delta, " \u5206"), data.delta === 0 && /*#__PURE__*/React.createElement("div", {
    className: "growth-stat-delta"
  }, "\u8207\u4E0A\u9031\u6301\u5E73")), /*#__PURE__*/React.createElement("div", {
    className: "growth-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "growth-stat-num"
  }, data.avgScore != null ? cuAvg : '—', /*#__PURE__*/React.createElement("em", null, "\u5206")), /*#__PURE__*/React.createElement("div", {
    className: "growth-stat-label"
  }, "\u6574\u9AD4\u5E73\u5747")), /*#__PURE__*/React.createElement("div", {
    className: "growth-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "growth-stat-num"
  }, cuDone, /*#__PURE__*/React.createElement("em", null, "\u9805")), /*#__PURE__*/React.createElement("div", {
    className: "growth-stat-label"
  }, "\u5B8C\u6210\u7DF4\u7FD2"))), n > 0 && /*#__PURE__*/React.createElement("div", {
    className: "growth-chart-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "growth-chart-title"
  }, "\u6BCF\u9031\u5E73\u5747\u5206\u6578"), /*#__PURE__*/React.createElement("svg", {
    className: "growth-chart",
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: "none",
    role: "img",
    "aria-label": "\u6BCF\u9031\u5E73\u5747\u5206\u6578\u6298\u7DDA\u5716"
  }, [0, 25, 50, 75, 100].map(g => /*#__PURE__*/React.createElement("g", {
    key: g
  }, /*#__PURE__*/React.createElement("line", {
    x1: padL,
    y1: yAt(g),
    x2: W - padR,
    y2: yAt(g),
    className: "growth-grid"
  }), /*#__PURE__*/React.createElement("text", {
    x: padL - 2,
    y: yAt(g) - 2,
    className: "growth-axis-y"
  }, g))), n > 1 && /*#__PURE__*/React.createElement("polyline", {
    points: solidPts,
    className: "growth-line"
  }), lastInProg && /*#__PURE__*/React.createElement("line", {
    x1: xAt(n - 2),
    y1: yAt(cw[n - 2].avg),
    x2: xAt(n - 1),
    y2: yAt(cw[n - 1].avg),
    className: "growth-line growth-line-dash"
  }), cw.map((p, i) => /*#__PURE__*/React.createElement("g", {
    key: p.wid
  }, /*#__PURE__*/React.createElement("circle", {
    cx: xAt(i),
    cy: yAt(p.avg),
    r: "4.5",
    className: `growth-dot${p.inProgress ? ' live' : ''}`
  }), /*#__PURE__*/React.createElement("text", {
    x: xAt(i) + (i === 0 ? 14 : i === n - 1 ? -14 : 0),
    y: yAt(p.avg) - 9,
    className: "growth-dot-num"
  }, p.avg), (i % labelStep === 0 || i === n - 1) && /*#__PURE__*/React.createElement("text", {
    x: xAt(i),
    y: H - 10,
    className: "growth-axis-x",
    style: i === n - 1 ? {
      textAnchor: 'end'
    } : i === 0 ? {
      textAnchor: 'start'
    } : undefined
  }, shortLabel(p.label), p.inProgress ? '·進行中' : ''))))), /*#__PURE__*/React.createElement("div", {
    className: "growth-weeks"
  }, pw.slice().reverse().map(p => /*#__PURE__*/React.createElement("div", {
    className: `growth-wrow${p.inProgress ? ' inprog' : ''}`,
    key: p.wid
  }, /*#__PURE__*/React.createElement("div", {
    className: "growth-wrow-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "growth-wrow-label"
  }, p.label), p.dateRange && /*#__PURE__*/React.createElement("span", {
    className: "growth-wrow-date"
  }, p.dateRange), p.inProgress && /*#__PURE__*/React.createElement("span", {
    className: "growth-wrow-live"
  }, "\u9032\u884C\u4E2D"), /*#__PURE__*/React.createElement("span", {
    className: "growth-wrow-score"
  }, p.avg != null ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u5E73\u5747 ", /*#__PURE__*/React.createElement("b", null, p.avg), " \u5206") : '尚無分數')), /*#__PURE__*/React.createElement("div", {
    className: "growth-wrow-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "growth-wrow-fill",
    style: {
      width: p.pct + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "growth-wrow-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "growth-wrow-pct"
  }, "\u5B8C\u6210 ", p.done, "/", p.total, "\uFF08", p.pct, "%\uFF09", p.inProgress ? ' · 這週還在進行' : ''))))))), /*#__PURE__*/React.createElement("footer", {
    className: "growth-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "growth-foot-hint"
  }, "\u5BB6\u9577\u53EF\u622A\u5716\u4FDD\u5B58 \xB7 \u7D00\u9304\u5B58\u5728\u9019\u53F0\u88DD\u7F6E\u8207\u5E33\u865F"), /*#__PURE__*/React.createElement("button", {
    className: "growth-done",
    onClick: onClose
  }, "\u95DC\u9589"))));
}

/* v301: 學習頁「學習成長」改成內嵌卡片（像 Alan 貼的圖4）——直接看到每週平均折線，
   點卡片才展開完整報告；不再是一顆大 button。 */
function GrowthInlineCard({
  weeks,
  weekOrder,
  qmProg,
  categories,
  isSummer,
  onOpen
}) {
  var data = React.useMemo(() => computeGrowthData(weeks, weekOrder, qmProg, categories), [weeks, weekOrder, qmProg, categories]);
  var cw = data.scoredWeeks;
  var n = cw.length;
  var cuWeek = useCountUp(data.thisWeekAvg || 0, 900, 250);

  // ⚠ v349 修白畫面：舊版用 totalDone > 0 就往下畫圖，但折線畫的是「有分數的週」(scoredWeeks)。
  //   單字卡與拍照上傳作業「沒有分數」（見 computeGrowthData 的 v270 註解），
  //   所以只做過這兩種的學生 → totalDone > 0 但 scoredWeeks 是空的 → cw[n-1] 是 undefined
  //   → 讀 .avg 直接 crash，整個課程頁變白畫面（Alan 回報 Eric、Tayler 打不開）。
  //   改成以「有沒有分數」決定要不要畫圖。
  if (n === 0) {
    return /*#__PURE__*/React.createElement("button", {
      className: "growth-inline growth-inline-empty",
      onClick: onOpen
    }, /*#__PURE__*/React.createElement("span", {
      className: "gi-empty-ico"
    }, "\uD83C\uDF31"), /*#__PURE__*/React.createElement("span", {
      className: "gi-empty-text"
    }, /*#__PURE__*/React.createElement("b", null, "\u5B78\u7FD2\u6210\u9577"), /*#__PURE__*/React.createElement("span", null, data.totalDone > 0 ? '做完有計分的練習（測驗、填空、閱讀…），這裡就會畫出進步軌跡' : isSummer ? '完成練習後，這裡會畫出這個暑假的成長軌跡' : '完成練習後，這裡會畫出每週的進步軌跡')), /*#__PURE__*/React.createElement("span", {
      className: "gi-chev"
    }, "\u203A"));
  }
  var W = 520,
    H = 150,
    padL = 8,
    padR = 8,
    padT = 16,
    padB = 14;
  var innerW = W - padL - padR,
    innerH = H - padT - padB;
  var vals = cw.map(p => p.avg);
  var minV = Math.max(0, Math.min.apply(null, vals) - 8);
  var maxV = Math.min(100, Math.max.apply(null, vals) + 6);
  var span = Math.max(1, maxV - minV);
  var xAt = i => n > 1 ? padL + i * innerW / (n - 1) : padL + innerW / 2;
  var yAt = v => padT + (1 - (v - minV) / span) * innerH;
  var linePts = cw.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.avg).toFixed(1)}`).join(' ');
  var areaPts = `${padL},${(padT + innerH).toFixed(1)} ${linePts} ${xAt(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)}`;
  var lastX = xAt(n - 1),
    lastY = yAt(cw[n - 1].avg);
  return /*#__PURE__*/React.createElement("button", {
    className: "growth-inline",
    onClick: onOpen
  }, /*#__PURE__*/React.createElement("div", {
    className: "gi-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gi-kicker"
  }, "\u5B78\u7FD2\u6210\u9577 \xB7 \u6BCF\u9031\u5E73\u5747"), /*#__PURE__*/React.createElement("span", {
    className: "gi-more"
  }, "\u770B\u5B8C\u6574\u5831\u544A \u2192")), /*#__PURE__*/React.createElement("div", {
    className: "gi-chart-wrap"
  }, n > 1 ? /*#__PURE__*/React.createElement("svg", {
    className: "gi-chart",
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "giFill",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "rgba(122,168,126,.36)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "rgba(122,168,126,0)"
  }))), /*#__PURE__*/React.createElement("line", {
    x1: padL,
    y1: lastY.toFixed(1),
    x2: W - padR,
    y2: lastY.toFixed(1),
    className: "gi-baseline"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: areaPts,
    fill: "url(#giFill)"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: linePts,
    className: "gi-line"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: lastX.toFixed(1),
    cy: lastY.toFixed(1),
    r: "5.5",
    className: "gi-dot"
  })) : /*#__PURE__*/React.createElement("div", {
    className: "gi-single"
  }, "\u5DF2\u7D93\u958B\u59CB\u7D2F\u7A4D\u7D00\u9304\u2014\u2014\u518D\u591A\u505A\u5E7E\u9031\uFF0C\u9019\u88E1\u5C31\u6703\u756B\u51FA\u6210\u9577\u66F2\u7DDA \uD83C\uDF31")), /*#__PURE__*/React.createElement("div", {
    className: "gi-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gi-big"
  }, data.thisWeekAvg != null ? cuWeek : '—', /*#__PURE__*/React.createElement("em", null, " \u5206")), /*#__PURE__*/React.createElement("div", {
    className: "gi-foot-r"
  }, data.delta != null && data.delta !== 0 ? /*#__PURE__*/React.createElement("span", {
    className: 'gi-delta' + (data.delta > 0 ? ' up' : ' down')
  }, data.delta > 0 ? '▲' : '▼', " \u8F03\u4E0A\u9031 ", data.delta > 0 ? '+' : '', data.delta) : data.delta === 0 ? /*#__PURE__*/React.createElement("span", {
    className: "gi-delta flat"
  }, "\u8207\u4E0A\u9031\u6301\u5E73") : /*#__PURE__*/React.createElement("span", {
    className: "gi-delta muted"
  }, "\u672C\u9031\u5E73\u5747"))));
}

/* v302: 本週摘要——四個數字磚（完成率／本週平均／連續練習／待完成），像 Alan 貼的圖1。
   放在成長曲線右邊（左曲線右摘要）。 */
function WeekSummaryTiles({
  done,
  total,
  avg,
  streak
}) {
  var pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
  var pending = Math.max(0, (total || 0) - (done || 0));
  var cuPct = useCountUp(pct, 900, 200);
  var cuAvg = useCountUp(avg || 0, 900, 320);
  var cuStreak = useCountUp(streak || 0, 900, 440);
  var cuPending = useCountUp(pending, 900, 560);
  return /*#__PURE__*/React.createElement("div", {
    className: "wk-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wk-sum-title"
  }, "\u672C\u9031\u6458\u8981"), /*#__PURE__*/React.createElement("div", {
    className: "wk-sum-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wk-tile"
  }, /*#__PURE__*/React.createElement("b", {
    className: "accent"
  }, cuPct, /*#__PURE__*/React.createElement("em", null, "%")), /*#__PURE__*/React.createElement("i", null, "\u5B8C\u6210\u7387")), /*#__PURE__*/React.createElement("div", {
    className: "wk-tile"
  }, /*#__PURE__*/React.createElement("b", null, avg != null ? cuAvg : '—', avg != null ? /*#__PURE__*/React.createElement("em", null, " \u5206") : null), /*#__PURE__*/React.createElement("i", null, "\u672C\u9031\u5E73\u5747")), /*#__PURE__*/React.createElement("div", {
    className: "wk-tile"
  }, /*#__PURE__*/React.createElement("b", null, cuStreak, /*#__PURE__*/React.createElement("em", null, " \u5929")), /*#__PURE__*/React.createElement("i", null, "\u9023\u7E8C\u7DF4\u7FD2")), /*#__PURE__*/React.createElement("div", {
    className: "wk-tile"
  }, /*#__PURE__*/React.createElement("b", null, cuPending, /*#__PURE__*/React.createElement("em", null, " \u4EFD")), /*#__PURE__*/React.createElement("i", null, "\u5F85\u5B8C\u6210"))));
}

/* ══════════════════════════════════════════════════════
   UPLOAD HOMEWORK — v263「上傳作業」題型
   紙本作業拍照上傳：學生拍照/選圖 → 縮圖預覽 → 送出（自動縮小後傳
   Firebase Storage）→ 老師在後台學生詳情看照片、打分數。
══════════════════════════════════════════════════════ */
// v340: 依 Alan 決定拿掉自動掃描（OpenCV 邊界偵測、手動框四角）——手機上又慢又常出問題。
// 改成單純拍照/選圖上傳：縮圖後直接送出，穩定就好。
function UploadHomeworkPlayer({
  item,
  progressKey,
  onBack
}) {
  var [pending, setPending] = useQM([]); // [{ uid, file, url, outBlob }] 待送出
  var [busy, setBusy] = useQM(false);
  var [upMsg, setUpMsg] = useQM(''); // v266: 上傳進度「2/3」
  var [err, setErr] = useQM('');
  var [cloudProg, setCloudProg] = useQM(null); // 雲端這一筆（已交照片/分數）
  var u = window._currentUser;
  var seqRef = React.useRef(0);

  // 已交過的照片與批改結果：聽自己的雲端 progress（老師打完分數會即時看到）
  useQME(() => {
    if (!u || !window.subscribeMyProgress) return;
    return window.subscribeMyProgress(u.uid, items => setCloudProg(items[progressKey] || null));
  }, []);
  var submitted = cloudProg && cloudProg.files || [];
  var score = cloudProg && cloudProg.score != null ? cloudProg.score : null;

  // 照片縮小到最長邊 1600px 的 JPEG——平板原圖動輒 5-10MB，上傳太慢
  var shrink = file => new Promise((resolve, reject) => {
    var img = new Image();
    img.onload = () => {
      var MAX = 1600;
      var k = Math.min(1, MAX / Math.max(img.width, img.height));
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => b ? resolve(b) : reject(new Error('無法處理這張圖片')), 'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('圖片讀取失敗'));
    };
    img.src = URL.createObjectURL(file);
  });

  // v340: 單純上傳——選好圖就縮圖收下，沒有掃描、不會卡（Alan 決定拿掉掃描功能）
  var pickFiles = async e => {
    var files = Array.from(e.target.files || []).filter(f => /^image\//.test(f.type));
    e.target.value = ''; // 同一張可以再選
    if (!files.length) return;
    setErr('');
    var added = [];
    for (var f of files) {
      var b = void 0;
      try {
        b = await shrink(f);
      } catch (_) {
        b = f;
      }
      added.push({
        uid: ++seqRef.current,
        file: f,
        outBlob: b,
        url: URL.createObjectURL(b)
      });
    }
    setPending(prev => [...prev, ...added]);
  };
  var removePending = i => setPending(prev => {
    try {
      URL.revokeObjectURL(prev[i].url);
    } catch (e) {}
    return prev.filter((_, j) => j !== i);
  });
  var submit = async () => {
    if (!u) {
      setErr('要先登入才能交作業喔！');
      return;
    }
    if (!pending.length || busy) return;
    setBusy(true);
    setErr('');
    try {
      var urls = [];
      for (var i = 0; i < pending.length; i++) {
        setUpMsg(`${i + 1}/${pending.length}`); // v266: 讓學生知道傳到第幾張
        var blob = pending[i].outBlob || (await shrink(pending[i].file));
        urls.push(await window.uploadSubmissionPhoto(u.uid, progressKey, blob, i));
      }
      var all = [...submitted, ...urls];
      saveQuizModeCompletion(progressKey, item, {
        doneCount: 1,
        score: null,
        total: 1,
        extra: {
          files: all,
          graded: false,
          submittedAt: Date.now()
        }
      });
      pending.forEach(p => {
        try {
          URL.revokeObjectURL(p.url);
        } catch (e) {}
      });
      setPending([]);
      if (window.playSound) window.playSound('complete');
    } catch (e) {
      var denied = e && (e.code === 'storage/unauthorized' || /permission|unauthorized/i.test(String(e && e.message)));
      setErr(denied ? '上傳被擋下來了——請告訴老師「上傳權限還沒開」。' : '上傳失敗，請檢查網路再試一次。' + (e && e.message ? `（${e.message}）` : ''));
    }
    setBusy(false);
    setUpMsg('');
  };

  // v266: 未批改前可以刪掉自己傳錯的照片；全部刪光＝視同還沒繳交
  var removeSubmitted = url => {
    if (!u || busy || score != null) return;
    if (!window.confirm('刪掉這張照片？（刪掉後老師就看不到它了）')) return;
    var rest = submitted.filter(x => x !== url);
    if (rest.length) {
      saveQuizModeCompletion(progressKey, item, {
        doneCount: 1,
        score: null,
        total: 1,
        extra: {
          files: rest,
          graded: false,
          submittedAt: cloudProg && cloudProg.submittedAt || Date.now()
        }
      });
    } else {
      window.saveProgressItem(u.uid, u.displayName || '', u.email || '', progressKey, null);
      try {
        var m = loadQMProg();
        if (m[progressKey] !== undefined) {
          delete m[progressKey];
          saveQMProg(m);
        }
        if (window._bumpQmProgress) window._bumpQmProgress();
      } catch (e) {}
    }
  };
  var canSubmit = !busy && pending.length > 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro uh"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83D\uDCCE"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, "\u62CD\u7167\u4E0A\u50B3\u4F5C\u696D"), item.instruction && /*#__PURE__*/React.createElement("div", {
    className: "uh-instruction"
  }, "\uD83D\uDCCB ", item.instruction), submitted.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "uh-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "uh-block-title"
  }, score != null ? /*#__PURE__*/React.createElement("span", {
    className: "uh-graded"
  }, "\u2713 \u8001\u5E2B\u6539\u597D\u4E86\uFF1A", score, " \u5206") : /*#__PURE__*/React.createElement("span", {
    className: "uh-waiting"
  }, "\u5DF2\u4EA4 ", submitted.length, " \u5F35 \xB7 \u7B49\u8001\u5E2B\u6279\u6539 \u23F3")), score != null && cloudProg && cloudProg.comment ? /*#__PURE__*/React.createElement("div", {
    className: "uh-comment"
  }, "\uD83D\uDCAC \u8001\u5E2B\u8AAA\uFF1A", cloudProg.comment) : null, /*#__PURE__*/React.createElement("div", {
    className: "uh-grid"
  }, submitted.map((url, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "uh-thumb"
  }, /*#__PURE__*/React.createElement("a", {
    href: url,
    target: "_blank",
    rel: "noreferrer",
    title: "\u9EDE\u958B\u770B\u5927\u5716"
  }, /*#__PURE__*/React.createElement("img", {
    src: url,
    alt: `已交作業 ${i + 1}`
  })), score == null && /*#__PURE__*/React.createElement("button", {
    className: "uh-thumb-del",
    onClick: () => removeSubmitted(url),
    "aria-label": "\u522A\u6389\u9019\u5F35"
  }, "\u2715"))))), pending.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "uh-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "uh-block-title"
  }, "\u6E96\u5099\u9001\u51FA\uFF08", pending.length, " \u5F35\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "uh-grid"
  }, pending.map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: p.uid != null ? p.uid : i,
    className: "uh-thumb uh-thumb-pending"
  }, /*#__PURE__*/React.createElement("img", {
    src: p.url,
    alt: `預覽 ${i + 1}`
  }), /*#__PURE__*/React.createElement("button", {
    className: "uh-thumb-del",
    onClick: () => removePending(i),
    "aria-label": "\u79FB\u9664\u9019\u5F35"
  }, "\u2715"))))), err && /*#__PURE__*/React.createElement("div", {
    className: "uh-err"
  }, "\u26A0 ", err), /*#__PURE__*/React.createElement("div", {
    className: "uh-btns"
  }, /*#__PURE__*/React.createElement("label", {
    className: `qm-btn secondary uh-pick${busy ? ' disabled' : ''}`
  }, "\uD83D\uDCF7 \u62CD\u7167\u6216\u9078\u7167\u7247", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: pickFiles,
    disabled: busy,
    style: {
      display: 'none'
    }
  })), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: submit,
    disabled: !canSubmit
  }, busy ? `上傳中 ${upMsg}…` : submitted.length > 0 ? '補交這幾張 →' : '送出作業 →')), /*#__PURE__*/React.createElement("div", {
    className: "uh-hint"
  }, "\uD83D\uDCF7 \u53EF\u4EE5\u4E00\u6B21\u9078\u591A\u5F35\u3002\u62CD\u7684\u6642\u5019\u628A\u7D19\u653E\u5E73\u3001\u56DB\u500B\u89D2\u90FD\u5165\u93E1\u3001\u5149\u7DDA\u8DB3\u5920\uFF0C\u8001\u5E2B\u624D\u770B\u5F97\u6E05\u695A\u3002"));
}

/* ══════════════════════════════════════════════════════════════
   v365: 配對連線（Definition Match）／v375 改成「交卷才對答案」
   左邊單字、右邊解釋（打亂），小朋友點一邊再點另一邊就會連起來。
   · 點左再點右、點右再點左都可以（小朋友不用記順序）
   · 連線只是「我的答案」，不判對錯——再點一次任一端就拆掉重連
   · 全部連完才能按「交卷」，這時才一次公布：對的綠色、錯的紅色
   · 分數＝交卷時連對的題數（一次定生死，不能一個一個試出來）
   線是 SVG 疊在上面畫的，位置用 getBoundingClientRect 量，
   換方向／捲動／視窗變大都會重算。
   ══════════════════════════════════════════════════════════════ */
/* v375: 交卷前的線只是「我的答案」，顏色不能有暗示——所以拿掉綠色與紅色，
   改成藍／紫／靛的中性色盤（綠＝對、紅＝錯留給交卷後用）。 */
var DM_HUES = ['#2E4F7E', '#7A4FA8', '#1F7A8C', '#4C5BA8', '#5E6B7A', '#8A4F7A'];

/* ══════════════════════════════════════════════════════════════
   v383：教學卡（lesson）——每個單元開頭的「先教，再練」
   Alan：「每一個文法前面都要有完成教學以及指引，可以先用文字，再用簡單題目當作範例」。
   刻意做成通用型別（不只文法），任何單元都能掛一張。

   一張教學卡分四步，學生一步一步走完才算讀完：
     ① 這是什麼／什麼時候用   ② 長什麼樣子（形式表＋提示詞）
     ③ 看老師示範（有答案、有解說的範例題）  ④ 小試身手（即時回饋，答完才算完成）
   ══════════════════════════════════════════════════════════════ */
/* v428：教學卡有 steps（✏️ 出文法做的）→ 一步一步的互動教學；沒有 → 原本的教學卡（五大時態） */
function LessonPlayer(props) {
  var it = props.item;
  if (!(it && Array.isArray(it.steps) && it.steps.length)) return /*#__PURE__*/React.createElement(LessonPlayerClassic, props);
  // v440：閱讀的背景知識用「簡報式」（brief），✏️ 出文法維持一頁一個重點
  return it.brief ? /*#__PURE__*/React.createElement(BriefLesson, props) : /*#__PURE__*/React.createElement(StepLesson, props);
}

/* ══════════════════════════════════════════════════════
   v428：互動教學（Alan：「越簡單越好…一定要是互動式的學習」）
   一次只講一件事（learn），緊接著馬上動手：👆 選一選／🧩 排句子／🔍 找錯字。
   答錯可以再試、會告訴他為什麼；每一步都答對才能往下。學完才解鎖後面的練習。
══════════════════════════════════════════════════════ */
function gnlShuffle(n, seed) {
  var idx = Array.from({
    length: n
  }, (_, i) => i);
  var x = seed * 9301 + 49297;
  for (var i = n - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    var j = Math.floor(x / 233280 * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (n > 2 && idx.every((v, i) => v === i)) idx.push(idx.shift()); // 不要剛好就是正確順序
  return idx;
}
function GnlMark({
  text,
  hl
}) {
  // 把要強調的字（There is / are…）標出來
  var words = (hl || []).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!words.length) return /*#__PURE__*/React.createElement(React.Fragment, null, text);
  var re = new RegExp('(' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  return /*#__PURE__*/React.createElement(React.Fragment, null, String(text).split(re).map((part, i) => i % 2 ? /*#__PURE__*/React.createElement("mark", {
    key: i,
    className: "gnl-hl"
  }, part) : /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, part)));
}
/* ══════════════════════════════════════════════════════
   v440：簡報式（Alan：「分段閱讀的互動式不需要像 grammar 一樣一頁一個重點…
   像是簡報一樣的直接呈現 summary 重點出來 當然要包含圖片」）
   ──────────────────────────────────────────────────────
   資料結構跟互動教學一模一樣（steps: learn／pick），只是**畫法**不同：
   重點一次全部攤在同一頁（圖＋一句話＋例句），最後附一小段「快速確認」，
   就在同一頁作答、不用翻頁。閱讀的背景知識用這個；✏️ 出文法維持一頁一個重點。
══════════════════════════════════════════════════════ */
function BriefLesson({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var steps = useQMM(() => (item.steps || []).map(st => window.gnValidStep ? window.gnValidStep(st) : st).filter(Boolean), [item.id]);
  var learns = useQMM(() => steps.filter(s => s.kind === 'learn'), [steps]);
  var picks = useQMM(() => steps.filter(s => s.kind === 'pick'), [steps]);
  var [ans, setAns] = useQM({}); // 第 i 題 → { ok, wrong: [] }
  var [done, setDone] = useQM(false);
  var nOk = picks.filter((_, i) => ans[i] && ans[i].ok).length;
  var allOk = nOk >= picks.length;
  var say = t => {
    try {
      (window.speakTTS || window.speakText)(t, {
        lang: 'en-US',
        rate: 0.85
      });
    } catch (e) {}
  };
  var sound = ok => {
    if (window.playSound) window.playSound(ok ? 'correct' : 'wrong');
  };
  useQME(() => {
    if (!done) return;
    // 看完就算完成（跟互動教學一樣不看分數——不然答錯的孩子會被鎖在外面）
    saveQuizModeCompletion(progressKey, item, {
      doneCount: Math.max(1, picks.length),
      score: null,
      total: Math.max(1, picks.length)
    });
    fireCelebration(null);
  }, [done]);
  if (done) {
    return /*#__PURE__*/React.createElement("div", {
      className: "ls-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ls-card ls-enter ls-done"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ls-done-ico"
    }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("h2", {
      className: "ls-title"
    }, "\u6E96\u5099\u597D\u4E86\uFF01"), picks.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "ls-done-score"
    }, "\u5C0F\u554F\u984C\u7B54\u5C0D ", nOk, " / ", picks.length), /*#__PURE__*/React.createElement("p", {
      className: "ls-lead"
    }, item.outro || '接下來開始讀這篇文章吧！'), /*#__PURE__*/React.createElement("div", {
      className: "gnl-unlocked"
    }, "\uD83D\uDD13 \u5F8C\u9762\u7684\u7DF4\u7FD2\u5DF2\u7D93\u89E3\u9396\u4E86"), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-btns"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary",
      onClick: () => {
        setAns({});
        setDone(false);
      }
    }, "\u518D\u770B\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask,
      backLabel: "\u958B\u59CB\u8B80 \u2192"
    }))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "ls-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "ls-step-n"
  }, "\u8B80\u4E4B\u524D\u5148\u77E5\u9053")), /*#__PURE__*/React.createElement("div", {
    className: "ls-card ls-enter gnb-card"
  }, item.lead && /*#__PURE__*/React.createElement("div", {
    className: "gnb-lead"
  }, item.lead), /*#__PURE__*/React.createElement("div", {
    className: "gnb-points"
  }, learns.map((st, i) => /*#__PURE__*/React.createElement("div", {
    className: "gnb-point",
    key: i
  }, st.img && /*#__PURE__*/React.createElement("img", {
    className: "gnb-img",
    src: st.img,
    alt: "",
    loading: "lazy",
    decoding: "async"
  }), /*#__PURE__*/React.createElement("div", {
    className: "gnb-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gnb-say"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gnb-n"
  }, i + 1), st.say), (st.examples || []).map((e, k) => /*#__PURE__*/React.createElement("button", {
    key: k,
    type: "button",
    className: "gnb-ex",
    onClick: () => say(e.en),
    title: "\u9EDE\u4E00\u4E0B\u807D\u767C\u97F3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gnb-ex-en"
  }, /*#__PURE__*/React.createElement(GnlMark, {
    text: e.en,
    hl: e.hl
  })), e.zh && /*#__PURE__*/React.createElement("span", {
    className: "gnb-ex-zh"
  }, e.zh), /*#__PURE__*/React.createElement("span", {
    className: "gnb-ex-say"
  }, "\uD83D\uDD0A"))))))), picks.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "gnb-check"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gnb-check-head"
  }, "\u2705 \u5FEB\u901F\u78BA\u8A8D ", /*#__PURE__*/React.createElement("em", null, nOk, " / ", picks.length)), picks.map((p, i) => {
    var a = ans[i] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'gnb-q' + (a.ok ? ' ok' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "gnb-q-t"
    }, p.q), /*#__PURE__*/React.createElement("div", {
      className: "gnb-opts"
    }, p.options.map((o, k) => {
      var wrong = (a.wrong || []).indexOf(k) >= 0;
      var cls = 'gnb-opt' + (a.ok && k === p.answer ? ' ok' : '') + (wrong ? ' no' : '');
      return /*#__PURE__*/React.createElement("button", {
        key: k,
        type: "button",
        className: cls,
        disabled: a.ok || wrong,
        onClick: () => {
          var ok = k === p.answer;
          sound(ok);
          setAns(s0 => ({
            ...s0,
            [i]: ok ? {
              ...(s0[i] || {}),
              ok: true
            } : {
              ...(s0[i] || {}),
              wrong: ((s0[i] || {}).wrong || []).concat(k)
            }
          }));
        }
      }, o);
    })), a.ok && p.why && /*#__PURE__*/React.createElement("div", {
      className: "gnb-why"
    }, p.why));
  })), /*#__PURE__*/React.createElement("button", {
    className: "gnb-go",
    disabled: !allOk,
    onClick: () => setDone(true)
  }, allOk ? '我看完了，開始讀 →' : `還有 ${picks.length - nOk} 個小問題`)));
}
function StepLesson({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var steps = useQMM(() => (item.steps || []).map(st => window.gnValidStep ? window.gnValidStep(st) : st).filter(Boolean), [item.id]);
  // v471：講解型步驟（learn／時間軸／三種句型／比較級）不算「動手做的題數」
  var isTeach = st => window.gnIsTeachStep ? window.gnIsTeachStep(st) : st && st.kind === 'learn';
  var acts = steps.filter(st => !isTeach(st)).length;
  var [si, setSi] = useQM(0);
  var [st, setSt] = useQM({}); // 這一步的作答狀態
  var [firstOk, setFirstOk] = useQM({}); // 第幾步第一次就答對
  var done = si >= steps.length;
  var cur = steps[Math.min(si, steps.length - 1)];
  var sound = ok => {
    if (window.playSound) window.playSound(ok ? 'correct' : 'wrong');
  };
  var say = t => {
    try {
      (window.speakTTS || window.speakText)(t, {
        lang: 'en-US',
        rate: 0.85
      });
    } catch (e) {}
  };
  var markFirst = ok => setFirstOk(f => si in f ? f : {
    ...f,
    [si]: ok
  });
  var next = () => {
    setSi(i => i + 1);
    setSt({});
    try {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } catch (e) {}
  };
  var solved = !cur || isTeach(cur) || !!st.ok;
  useQME(() => {
    if (!done) return;
    // 學完就算完成（不看分數）——不然答錯幾題的孩子會被鎖在練習外面
    saveQuizModeCompletion(progressKey, item, {
      doneCount: Math.max(1, acts),
      score: null,
      total: Math.max(1, acts)
    });
    fireCelebration(null);
  }, [done]);
  var tiles = useQMM(() => cur && cur.kind === 'order' ? gnlShuffle(cur.words.length, si + 7) : [], [si, item.id]);
  if (done) {
    var n1 = Object.values(firstOk).filter(Boolean).length;
    return /*#__PURE__*/React.createElement("div", {
      className: "ls-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ls-card ls-enter ls-done"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ls-done-ico"
    }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("h2", {
      className: "ls-title"
    }, "\u5B78\u6703\u4E86\uFF01"), acts > 0 && /*#__PURE__*/React.createElement("div", {
      className: "ls-done-score"
    }, "\u4E00\u6B21\u5C31\u7B54\u5C0D ", n1, " / ", acts, " \u984C"), /*#__PURE__*/React.createElement("p", {
      className: "ls-lead"
    }, item.outro || '接下來開始練習，把它練熟！'), /*#__PURE__*/React.createElement("div", {
      className: "gnl-unlocked"
    }, "\uD83D\uDD13 \u5F8C\u9762\u7684\u7DF4\u7FD2\u5DF2\u7D93\u89E3\u9396\u4E86"), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-btns"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary",
      onClick: () => {
        setSi(0);
        setSt({});
        setFirstOk({});
      }
    }, "\u518D\u5B78\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask,
      backLabel: "\u958B\u59CB\u7DF4\u7FD2 \u2192"
    }))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "ls-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "ls-steps"
  }, steps.map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: 'ls-dot' + (i === si ? ' on' : '') + (i < si ? ' done' : '')
  }))), /*#__PURE__*/React.createElement("span", {
    className: "ls-step-n"
  }, si + 1, " / ", steps.length)), /*#__PURE__*/React.createElement("div", {
    key: si,
    className: "ls-card ls-enter gnl-card"
  }, si === 0 && item.lead && /*#__PURE__*/React.createElement("div", {
    className: "gnl-lead"
  }, item.lead), cur.kind === 'learn' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ls-kicker"
  }, "\uD83D\uDCD6 \u5B78\u4E00\u500B\u91CD\u9EDE"), /*#__PURE__*/React.createElement("div", {
    className: "gnl-say"
  }, cur.say), cur.img && /*#__PURE__*/React.createElement("img", {
    className: "gnl-img",
    src: cur.img,
    alt: "",
    loading: "lazy"
  }), /*#__PURE__*/React.createElement("div", {
    className: "gnl-exs"
  }, cur.examples.map((e, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    className: "gnl-ex",
    onClick: () => say(e.en),
    title: "\u9EDE\u4E00\u4E0B\u807D\u767C\u97F3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gnl-ex-en"
  }, /*#__PURE__*/React.createElement(GnlMark, {
    text: e.en,
    hl: e.hl
  })), e.zh && /*#__PURE__*/React.createElement("span", {
    className: "gnl-ex-zh"
  }, e.zh), /*#__PURE__*/React.createElement("span", {
    className: "gnl-ex-say"
  }, "\uD83D\uDD0A"))))), cur.kind === 'pick' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ls-kicker"
  }, "\uD83D\uDC46 \u9078\u4E00\u9078"), /*#__PURE__*/React.createElement("div", {
    className: "gnl-q"
  }, cur.q.split('________').map((part, i, arr) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, part, i < arr.length - 1 && /*#__PURE__*/React.createElement("span", {
    className: 'gnl-blank' + (st.ok ? ' ok' : '')
  }, st.ok ? cur.options[cur.answer] : '？')))), /*#__PURE__*/React.createElement("div", {
    className: "gnl-opts"
  }, cur.options.map((o, k) => {
    var wrong = (st.wrong || []).indexOf(k) >= 0;
    var cls = 'gnl-opt' + (st.ok && k === cur.answer ? ' ok' : '') + (wrong ? ' no' : '');
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      className: cls,
      disabled: st.ok || wrong,
      onClick: () => {
        var ok = k === cur.answer;
        sound(ok);
        markFirst(ok);
        setSt(s0 => ok ? {
          ...s0,
          ok: true
        } : {
          ...s0,
          wrong: (s0.wrong || []).concat(k)
        });
      }
    }, o);
  })), (st.ok || (st.wrong || []).length > 0) && cur.why && /*#__PURE__*/React.createElement("div", {
    className: 'gnl-why' + (st.ok ? ' ok' : '')
  }, st.ok ? '✓ ' : '再想想看：', cur.why)), cur.kind === 'order' && (() => {
    var picked = st.picked || [];
    var built = picked.map(i => cur.words[tiles[i]]);
    var full = picked.length === cur.words.length;
    var check = () => {
      var ok = window.gnNorm ? window.gnNorm(built.join(' ')) === window.gnNorm(cur.words.join(' ')) : built.join(' ') === cur.words.join(' ');
      sound(ok);
      markFirst(ok);
      setSt(s0 => ok ? {
        ...s0,
        ok: true
      } : {
        ...s0,
        bad: true,
        tries: (s0.tries || 0) + 1
      });
    };
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "ls-kicker"
    }, "\uD83E\uDDE9 \u6392\u53E5\u5B50"), /*#__PURE__*/React.createElement("div", {
      className: "gnl-zh"
    }, cur.zh), /*#__PURE__*/React.createElement("div", {
      className: 'gnl-line' + (st.ok ? ' ok' : st.bad ? ' no' : '')
    }, built.length ? built.map((w, i) =>
    /*#__PURE__*/
    /* v470：key 用固定的池子編號，不是陣列位置。
       用位置的話，拿掉中間一個字會讓後面的字全部重新掛載＝
       「積木落位」那段動畫整排莫名其妙重播一次。 */
    React.createElement("button", {
      key: picked[i],
      className: "gnl-tile in",
      disabled: st.ok,
      onClick: () => setSt(s0 => ({
        ...s0,
        bad: false,
        picked: picked.filter((_, j) => j !== i)
      }))
    }, w)) : /*#__PURE__*/React.createElement("span", {
      className: "gnl-line-ph"
    }, "\u9EDE\u4E0B\u9762\u7684\u5B57\uFF0C\u6392\u6210\u82F1\u6587\u53E5\u5B50")), !st.ok && /*#__PURE__*/React.createElement("div", {
      className: "gnl-pool"
    }, tiles.map((wi, i) => picked.indexOf(i) >= 0 ? /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "gnl-tile ghost"
    }, cur.words[wi]) : /*#__PURE__*/React.createElement("button", {
      key: i,
      className: "gnl-tile",
      onClick: () => setSt(s0 => ({
        ...s0,
        bad: false,
        picked: (s0.picked || []).concat(i)
      }))
    }, cur.words[wi]))), !st.ok && full && !st.bad && /*#__PURE__*/React.createElement("button", {
      className: "qm-btn primary gnl-check",
      onClick: check
    }, "\u78BA\u8A8D \u2192"), st.bad && /*#__PURE__*/React.createElement("div", {
      className: "gnl-why"
    }, "\u9806\u5E8F\u4E0D\u592A\u5C0D\uFF0C\u518D\u8A66\u4E00\u6B21\uFF01", (st.tries || 0) >= 2 && /*#__PURE__*/React.createElement("div", {
      className: "gnl-ans"
    }, "\u6B63\u78BA\u662F\uFF1A", /*#__PURE__*/React.createElement("b", null, cur.words.join(' '))), /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary gnl-retry",
      onClick: () => setSt(s0 => ({
        ...s0,
        bad: false,
        picked: []
      }))
    }, "\u21BA \u91CD\u65B0\u6392")), st.ok && /*#__PURE__*/React.createElement("div", {
      className: "gnl-why ok"
    }, "\u2713 \u6392\u5C0D\u4E86\uFF01", /*#__PURE__*/React.createElement("button", {
      className: "gnl-say-btn",
      onClick: () => say(cur.words.join(' '))
    }, "\uD83D\uDD0A")));
  })(), cur.kind === 'tap' && (() => {
    var toks = cur.sentence.split(/\s+/);
    var bare = t => t.replace(/^["'“”‘’(\[]+|["'“”‘’)\].,!?;:]+$/g, '');
    var isAns = t => cur.answers.some(a => a.toLowerCase() === bare(t).toLowerCase());
    var got = st.got || [];
    var left = cur.answers.length - got.length;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "ls-kicker"
    }, "\uD83D\uDC49 \u627E\u51FA\u4F86"), /*#__PURE__*/React.createElement("div", {
      className: "gnl-sub"
    }, cur.q, cur.answers.length > 1 && /*#__PURE__*/React.createElement("b", null, "\uFF08", cur.answers.length, " \u500B\uFF09")), /*#__PURE__*/React.createElement("div", {
      className: "gnl-fix gnl-tap"
    }, toks.map((t, i) => {
      var hit = got.indexOf(i) >= 0,
        missed = (st.miss || []).indexOf(i) >= 0;
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        className: 'gnl-word' + (hit ? ' got' : '') + (missed ? ' no' : ''),
        disabled: st.ok || hit || missed,
        onClick: () => {
          var ok = isAns(t);
          sound(ok);
          if (!ok) {
            markFirst(false);
            setSt(s0 => ({
              ...s0,
              bad: true,
              miss: (s0.miss || []).concat(i)
            }));
            return;
          }
          setSt(s0 => {
            var g = (s0.got || []).concat(i);
            var done2 = g.length >= cur.answers.length;
            if (done2) markFirst(!(s0.miss || []).length);
            return {
              ...s0,
              bad: false,
              got: g,
              ok: done2
            };
          });
        }
      }, t);
    })), st.ok ? /*#__PURE__*/React.createElement("div", {
      className: "gnl-why ok"
    }, "\u2713 \u5168\u90E8\u627E\u5230\u4E86\uFF01", cur.why || '', /*#__PURE__*/React.createElement("button", {
      className: "gnl-say-btn",
      onClick: () => say(cur.sentence)
    }, "\uD83D\uDD0A")) : /*#__PURE__*/React.createElement("div", {
      className: "gnl-why"
    }, st.bad ? '這個不是喔，再看看～' : `還要找 ${left} 個`));
  })(), cur.kind === 'sort' && (() => {
    var items = cur.groups.reduce((a, g, gi) => a.concat(g.items.map(x => ({
      x,
      gi
    }))), []);
    var order = gnlShuffle(items.length, si + 11);
    var done2 = st.n || 0;
    var box = st.box || {}; // item index → 放進哪一籃
    var curItem = done2 < items.length ? items[order[done2]] : null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "ls-kicker"
    }, "\uD83D\uDDC2 \u5206\u4E00\u5206"), /*#__PURE__*/React.createElement("div", {
      className: "gnl-sub"
    }, cur.q), curItem
    /* v470：key 帶上「第幾個」，下一個字才會重新掛載＝滑進來的動畫才會播。
       同一個 <div> 只換文字的話，CSS 動畫不會重新觸發。 */ ? /*#__PURE__*/React.createElement("div", {
      key: done2,
      className: 'gnl-chip-now' + (st.bad ? ' no' : '')
    }, curItem.x) : /*#__PURE__*/React.createElement("div", {
      className: "gnl-chip-now ok"
    }, "\u5168\u90E8\u5206\u5B8C\u4E86\uFF01"), /*#__PURE__*/React.createElement("div", {
      className: "gnl-bins"
    }, cur.groups.map((g, gi) => /*#__PURE__*/React.createElement("button", {
      key: gi,
      className: "gnl-bin",
      disabled: !curItem,
      onClick: () => {
        if (!curItem) return;
        var ok = gi === curItem.gi;
        sound(ok);
        if (!ok) {
          markFirst(false);
          setSt(s0 => ({
            ...s0,
            bad: true,
            everBad: true
          }));
          return;
        }
        setSt(s0 => {
          var n2 = (s0.n || 0) + 1;
          if (n2 >= items.length) markFirst(!s0.everBad);
          return {
            ...s0,
            bad: false,
            n: n2,
            box: {
              ...(s0.box || {}),
              [order[s0.n || 0]]: gi
            },
            ok: n2 >= items.length
          };
        });
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "gnl-bin-lab"
    }, g.label), /*#__PURE__*/React.createElement("span", {
      className: "gnl-bin-items"
    }, items.map((it, ii) => box[ii] === gi ? /*#__PURE__*/React.createElement("em", {
      key: ii
    }, it.x) : null))))), st.ok ? /*#__PURE__*/React.createElement("div", {
      className: "gnl-why ok"
    }, "\u2713 \u5206\u5C0D\u4E86\uFF01", cur.why || '') : /*#__PURE__*/React.createElement("div", {
      className: "gnl-why"
    }, st.bad ? '這一個不是放這裡喔，再想想～' : `還有 ${items.length - done2} 個`));
  })(), cur.kind === 'timeline' && (() => {
    var WHEN = {
      past: {
        zh: '過去',
        ico: '⏪'
      },
      now: {
        zh: '現在',
        ico: '▶️'
      },
      future: {
        zh: '未來',
        ico: '⏩'
      }
    };
    var at = st.at == null ? 0 : st.at;
    var p = cur.points[at];
    var seenAll = (st.seen || [0]).length >= cur.points.length;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "ls-kicker"
    }, "\u23F3 \u770B\u6642\u9593\u600E\u9EBC\u6539\u8B8A\u53E5\u5B50"), /*#__PURE__*/React.createElement("div", {
      className: "gnl-sub"
    }, cur.q), /*#__PURE__*/React.createElement("div", {
      className: "gnl-tl"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gnl-tl-rail"
    }), cur.points.map((pt, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      className: 'gnl-tl-dot' + (i === at ? ' on' : '') + ((st.seen || [0]).indexOf(i) >= 0 ? ' seen' : ''),
      onClick: () => setSt(s0 => ({
        ...s0,
        at: i,
        seen: (s0.seen || [0]).concat(i)
      }))
    }, /*#__PURE__*/React.createElement("span", {
      className: "gnl-tl-ico"
    }, WHEN[pt.when].ico), /*#__PURE__*/React.createElement("span", {
      className: "gnl-tl-lab"
    }, WHEN[pt.when].zh)))), /*#__PURE__*/React.createElement("div", {
      key: at,
      className: "gnl-tl-say"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "gnl-tl-en",
      onClick: () => say(p.en),
      title: "\u9EDE\u4E00\u4E0B\u807D\u767C\u97F3"
    }, /*#__PURE__*/React.createElement(GnlMark, {
      text: p.en,
      hl: p.hl
    }), /*#__PURE__*/React.createElement("span", {
      className: "gnl-ex-say"
    }, "\uD83D\uDD0A")), p.zh && /*#__PURE__*/React.createElement("div", {
      className: "gnl-ex-zh"
    }, p.zh)), /*#__PURE__*/React.createElement("div", {
      className: 'gnl-why' + (seenAll ? ' ok' : '')
    }, seenAll ? cur.why ? '✓ ' + cur.why : '✓ 看完了！' : '👆 點上面的時間，看看句子怎麼變'));
  })(), cur.kind === 'forms' && (() => {
    var TY = {
      affirmative: '肯定',
      negative: '否定',
      question: '疑問'
    };
    var at = st.at == null ? 0 : st.at;
    var f = cur.forms[at];
    var seenAll = (st.seen || [0]).length >= cur.forms.length;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "ls-kicker"
    }, "\uD83D\uDD00 \u540C\u4E00\u53E5\u8A71\uFF0C\u4E09\u7A2E\u9577\u76F8"), /*#__PURE__*/React.createElement("div", {
      className: "gnl-sub"
    }, cur.q), /*#__PURE__*/React.createElement("div", {
      className: "gnl-ftabs"
    }, cur.forms.map((x, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      className: 'gnl-ftab' + (i === at ? ' on' : ''),
      onClick: () => setSt(s0 => ({
        ...s0,
        at: i,
        seen: (s0.seen || [0]).concat(i)
      }))
    }, TY[x.type]))), /*#__PURE__*/React.createElement("div", {
      key: at,
      className: "gnl-tl-say"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "gnl-tl-en",
      onClick: () => say(f.en),
      title: "\u9EDE\u4E00\u4E0B\u807D\u767C\u97F3"
    }, /*#__PURE__*/React.createElement(GnlMark, {
      text: f.en,
      hl: f.hl
    }), /*#__PURE__*/React.createElement("span", {
      className: "gnl-ex-say"
    }, "\uD83D\uDD0A")), f.zh && /*#__PURE__*/React.createElement("div", {
      className: "gnl-ex-zh"
    }, f.zh)), /*#__PURE__*/React.createElement("div", {
      className: 'gnl-why' + (seenAll ? ' ok' : '')
    }, seenAll ? cur.why ? '✓ ' + cur.why : '✓ 三種都看過了！' : '👆 點上面三種，看看句子哪裡不一樣'));
  })(), cur.kind === 'degree' && (() => {
    var at = st.at == null ? 0 : st.at;
    var lv = cur.levels[at];
    var seenAll = (st.seen || [0]).length >= cur.levels.length;
    var H = [46, 72, 100]; // 三根長條的高度（%），讓「更…」一眼看得出來
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "ls-kicker"
    }, "\uD83D\uDCCA \u4E00\u500B\u6BD4\u4E00\u500B\u66F4\u2026"), /*#__PURE__*/React.createElement("div", {
      className: "gnl-sub"
    }, cur.q), /*#__PURE__*/React.createElement("div", {
      className: "gnl-bars"
    }, cur.levels.map((x, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      className: 'gnl-bar-col' + (i === at ? ' on' : ''),
      onClick: () => setSt(s0 => ({
        ...s0,
        at: i,
        seen: (s0.seen || [0]).concat(i)
      }))
    }, /*#__PURE__*/React.createElement("span", {
      className: "gnl-bar-slot"
    }, /*#__PURE__*/React.createElement("span", {
      className: "gnl-bar",
      style: {
        height: H[i] + '%',
        animationDelay: i * 0.09 + 's'
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "gnl-bar-lab"
    }, x.form), x.zh && /*#__PURE__*/React.createElement("span", {
      className: "gnl-bar-zh"
    }, x.zh)))), /*#__PURE__*/React.createElement("div", {
      key: at,
      className: "gnl-tl-say"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "gnl-tl-en",
      onClick: () => say(lv.en),
      title: "\u9EDE\u4E00\u4E0B\u807D\u767C\u97F3"
    }, /*#__PURE__*/React.createElement(GnlMark, {
      text: lv.en,
      hl: [lv.form]
    }), /*#__PURE__*/React.createElement("span", {
      className: "gnl-ex-say"
    }, "\uD83D\uDD0A")), lv.zh && /*#__PURE__*/React.createElement("div", {
      className: "gnl-ex-zh"
    }, lv.zh)), /*#__PURE__*/React.createElement("div", {
      className: 'gnl-why' + (seenAll ? ' ok' : '')
    }, seenAll ? cur.why ? '✓ ' + cur.why : '✓ 三種都看過了！' : '👆 點長條，看看句子怎麼說'));
  })(), cur.kind === 'fix' && (() => {
    var toks = cur.sentence.split(/\s+/);
    var bare = t => t.replace(/[.,!?;:]+$/, '');
    // v429：先找「大小寫完全一樣」的那個字（大寫單元：taipei → Taipei，句子裡可能還有別的 Taipei）
    var exact = toks.some(t => bare(t) === cur.wrong);
    var isWrongTok = t => exact ? bare(t) === cur.wrong : bare(t).toLowerCase() === cur.wrong.toLowerCase();
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "ls-kicker"
    }, "\uD83D\uDD0D \u627E\u932F\u5B57"), /*#__PURE__*/React.createElement("div", {
      className: "gnl-sub"
    }, "\u9019\u53E5\u8A71\u6709\u4E00\u500B\u5B57\u932F\u4E86\uFF0C\u9EDE\u5B83\uFF01"), /*#__PURE__*/React.createElement("div", {
      className: "gnl-fix"
    }, toks.map((t, i) => {
      var isWrong = isWrongTok(t);
      var missed = (st.miss || []).indexOf(i) >= 0;
      if (st.ok && isWrong) {
        return /*#__PURE__*/React.createElement("span", {
          key: i,
          className: "gnl-word fixed"
        }, /*#__PURE__*/React.createElement("s", null, bare(t)), " ", /*#__PURE__*/React.createElement("b", null, cur.right), t.slice(bare(t).length));
      }
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        className: 'gnl-word' + (missed ? ' no' : ''),
        disabled: st.ok || missed,
        onClick: () => {
          sound(isWrong);
          markFirst(isWrong);
          setSt(s0 => isWrong ? {
            ...s0,
            ok: true
          } : {
            ...s0,
            miss: (s0.miss || []).concat(i)
          });
        }
      }, t);
    })), (st.ok || (st.miss || []).length > 0) && /*#__PURE__*/React.createElement("div", {
      className: 'gnl-why' + (st.ok ? ' ok' : '')
    }, st.ok ? `✓ 找到了！${cur.why || ''}` : '這個字沒有錯，再找找看～'));
  })()), /*#__PURE__*/React.createElement("div", {
    className: "ls-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    disabled: si === 0,
    onClick: () => {
      setSi(i => Math.max(0, i - 1));
      setSt({});
    }
  }, "\u2190 \u4E0A\u4E00\u6B65"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    disabled: !solved,
    onClick: next
  }, isTeach(cur) ? '我懂了 →' : solved ? si + 1 >= steps.length ? '完成 🎉' : '下一步 →' : '先答對才能往下')));
}
function LessonPlayerClassic({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var uses = (item.uses || []).filter(u => u && (u.zh || u.en));
  var forms = (item.forms || []).filter(f => f && f.subj);
  var clues = (item.clues || []).filter(Boolean);
  var mistakes = (item.mistakes || []).filter(m => m && m.good);
  var examples = (item.examples || []).filter(e => e && e.q);
  var checks = (item.check || []).filter(c => c && c.q && (c.options || []).length >= 2);
  var steps = ['intro', 'form', examples.length ? 'demo' : null, checks.length ? 'check' : null, 'done'].filter(Boolean);
  var [si, setSi] = useQM(0);
  var step = steps[Math.min(si, steps.length - 1)];
  var [shown, setShown] = useQM({}); // 範例題：按了才顯示答案
  var [picked, setPicked] = useQM({}); // 小試身手：選了哪個
  var answered = checks.filter((_, i) => picked[i] !== undefined).length;
  var rightN = checks.filter((c, i) => picked[i] === c.answer).length;
  var go = d => {
    setSi(i => Math.max(0, Math.min(steps.length - 1, i + d)));
    scrollToTopSoon();
  };
  var scrollToTopSoon = () => {
    try {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } catch (e) {}
  };
  var finish = () => {
    var n = Math.max(1, checks.length);
    saveQuizModeCompletion(progressKey, item, {
      doneCount: n,
      score: checks.length ? rightN : null,
      total: n
    });
    fireCelebration(checks.length ? Math.round(rightN / checks.length * 100) : null);
  };
  useQME(() => {
    if (step === 'done') finish();
  }, [step]);
  return /*#__PURE__*/React.createElement("div", {
    className: "ls-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "ls-steps"
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: s,
    className: 'ls-dot' + (i === si ? ' on' : '') + (i < si ? ' done' : '')
  }))), /*#__PURE__*/React.createElement("span", {
    className: "ls-step-n"
  }, si + 1, " / ", steps.length)), step === 'intro' && /*#__PURE__*/React.createElement("div", {
    className: "ls-card ls-enter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-kicker"
  }, "\u5148\u641E\u61C2\u9019\u662F\u4EC0\u9EBC"), /*#__PURE__*/React.createElement("h2", {
    className: "ls-title"
  }, item.title), item.lead && /*#__PURE__*/React.createElement("p", {
    className: "ls-lead"
  }, item.lead), uses.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ls-sub"
  }, "\u4EC0\u9EBC\u6642\u5019\u7528\uFF1F"), /*#__PURE__*/React.createElement("div", {
    className: "ls-uses"
  }, uses.map((u, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ls-use"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ls-use-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, u.zh), u.en && /*#__PURE__*/React.createElement("div", {
    className: "ls-use-eg"
  }, u.en, u.enZh ? /*#__PURE__*/React.createElement("em", null, " \u2014 ", u.enZh) : null))))))), step === 'form' && /*#__PURE__*/React.createElement("div", {
    className: "ls-card ls-enter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-kicker"
  }, "\u9577\u4EC0\u9EBC\u6A23\u5B50"), forms.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ls-forms"
  }, forms.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ls-form"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-form-subj"
  }, f.subj), /*#__PURE__*/React.createElement("div", {
    className: "ls-form-arrow"
  }, "\u2192"), /*#__PURE__*/React.createElement("div", {
    className: "ls-form-body"
  }, /*#__PURE__*/React.createElement("b", null, f.form), f.eg && /*#__PURE__*/React.createElement("div", {
    className: "ls-form-eg"
  }, f.eg))))), clues.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ls-sub"
  }, "\u770B\u5230\u9019\u4E9B\u5B57\uFF0C\u5C31\u77E5\u9053\u662F\u5B83"), /*#__PURE__*/React.createElement("div", {
    className: "ls-clues"
  }, clues.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, c)))), mistakes.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ls-sub"
  }, "\u6700\u5BB9\u6613\u932F\u7684\u5730\u65B9"), mistakes.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ls-mis"
  }, m.bad && /*#__PURE__*/React.createElement("div", {
    className: "ls-mis-bad"
  }, "\u2717 ", m.bad), /*#__PURE__*/React.createElement("div", {
    className: "ls-mis-good"
  }, "\u2713 ", m.good), m.why && /*#__PURE__*/React.createElement("div", {
    className: "ls-mis-why"
  }, m.why))))), step === 'demo' && /*#__PURE__*/React.createElement("div", {
    className: "ls-card ls-enter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-kicker"
  }, "\u770B\u8001\u5E2B\u793A\u7BC4"), /*#__PURE__*/React.createElement("div", {
    className: "ls-sub",
    style: {
      marginTop: 0
    }
  }, "\u5148\u81EA\u5DF1\u60F3\u60F3\u770B\uFF0C\u518D\u9EDE\u958B\u7B54\u6848"), examples.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ls-demo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-demo-q"
  }, e.q), shown[i] ? /*#__PURE__*/React.createElement("div", {
    className: "ls-demo-a"
  }, /*#__PURE__*/React.createElement("b", null, e.a), e.why && /*#__PURE__*/React.createElement("span", null, e.why)) : /*#__PURE__*/React.createElement("button", {
    className: "ls-reveal",
    onClick: () => setShown(o => ({
      ...o,
      [i]: true
    }))
  }, "\u770B\u7B54\u6848")))), step === 'check' && /*#__PURE__*/React.createElement("div", {
    className: "ls-card ls-enter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-kicker"
  }, "\u5C0F\u8A66\u8EAB\u624B"), /*#__PURE__*/React.createElement("div", {
    className: "ls-sub",
    style: {
      marginTop: 0
    }
  }, answered, " / ", checks.length, " \u984C \xB7 \u7B54\u932F\u6C92\u95DC\u4FC2\uFF0C\u6703\u544A\u8A34\u4F60\u70BA\u4EC0\u9EBC"), checks.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "ls-check"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-check-q"
  }, c.q), /*#__PURE__*/React.createElement("div", {
    className: "ls-check-opts"
  }, c.options.map((o, oi) => {
    var cls = 'ls-opt';
    if (picked[i] !== undefined) {
      if (oi === c.answer) cls += ' ok';else if (oi === picked[i]) cls += ' no';else cls += ' dim';
    }
    return /*#__PURE__*/React.createElement("button", {
      key: oi,
      className: cls,
      disabled: picked[i] !== undefined,
      onClick: () => {
        setPicked(p => ({
          ...p,
          [i]: oi
        }));
        if (window.playSound) window.playSound(oi === c.answer ? 'correct' : 'wrong');
      }
    }, o);
  })), picked[i] !== undefined && c.why && /*#__PURE__*/React.createElement("div", {
    className: 'ls-check-why' + (picked[i] === c.answer ? ' ok' : '')
  }, c.why)))), step === 'done' && /*#__PURE__*/React.createElement("div", {
    className: "ls-card ls-enter ls-done"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-done-ico"
  }, checks.length && rightN === checks.length ? '🎉' : '✅'), /*#__PURE__*/React.createElement("h2", {
    className: "ls-title"
  }, "\u8B80\u5B8C\u4E86\uFF01"), checks.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ls-done-score"
  }, "\u5C0F\u8A66\u8EAB\u624B ", rightN, " / ", checks.length), /*#__PURE__*/React.createElement("p", {
    className: "ls-lead"
  }, item.outro || '接下來就用練習把它練熟——先從單句填空開始。'), /*#__PURE__*/React.createElement("div", {
    className: "qm-result-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: () => {
      setSi(0);
      setShown({});
      setPicked({});
    }
  }, "\u518D\u770B\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
    onBack: onBack,
    onBackToTasks: onBackToTasks,
    onNextTask: onNextTask,
    backLabel: "\u958B\u59CB\u7DF4\u7FD2 \u2192"
  }))), step !== 'done' && /*#__PURE__*/React.createElement("div", {
    className: "ls-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    disabled: si === 0,
    onClick: () => go(-1)
  }, "\u2190 \u4E0A\u4E00\u6B65"), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    disabled: step === 'check' && answered < checks.length,
    onClick: () => go(1)
  }, step === 'check' ? answered < checks.length ? `還有 ${checks.length - answered} 題沒作答` : '完成 →' : '下一步 →')));
}
function DefMatchIntro({
  item,
  prog,
  onStart
}) {
  var pairs = (item.defPairs || []).filter(p => p && p.word && p.def);
  var done = prog && prog.done;
  var pct = prog && prog.score != null && prog.total ? Math.round(prog.score / prog.total * 100) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83D\uDD17"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, pairs.length, " \u7D44\u914D\u5C0D", pairs.length > 10 ? ` · 分 ${Math.ceil(pairs.length / 10)} 回合，一次連 ${Math.ceil(pairs.length / Math.ceil(pairs.length / 10))} 組` : ''), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC46"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u5DE6\u908A\u7684\u55AE\u5B57\uFF0C\u518D\u9EDE\u53F3\u908A\u5B83\u7684\u610F\u601D\u2014\u2014\u9023\u8D77\u4F86\u7684\u540C\u6642\u6703\u5538\u7D66\u4F60\u807D")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u21A9\uFE0F"), /*#__PURE__*/React.createElement("span", null, "\u60F3\u6539\uFF1F\u518D\u9EDE\u4E00\u6B21\u90A3\u689D\u7DDA\u7684\u4EFB\u4E00\u7AEF\u5C31\u62C6\u6389\uFF0C\u91CD\u65B0\u9023")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("span", null, "\u5168\u90E8\u9023\u5B8C\u6309\u300C\u4EA4\u5377\u300D\uFF0C\u624D\u6703\u516C\u5E03\u5206\u6578\u548C\u9023\u932F\u7684\u5730\u65B9"))), done && pct != null && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-done"
  }, "\u2713 \u4E0A\u6B21 ", pct, " \u5206"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, "\u958B\u59CB\u914D\u5C0D \xB7 Start \u2192")));
}

/* v375（Alan #2/#3）：改成「交卷才對答案」。
   舊版連一條線就馬上判對錯 → 小朋友把每個選項都試一遍就能過關，等於沒在練。
   現在：連線只是「我的答案」（可以拆掉重連），全部連完按交卷才一次公布，
   錯的地方在板子上標紅、成績頁再放大列出來。連線時順便唸出那個英文字。 */
function DefMatchPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var allPairs = useQMM(() => (item.defPairs || []).filter(p => p && p.word && p.def).map((p, i) => ({
    ...p,
    id: p.id || 'dm' + i
  })), [item.id]);
  /* v372(#4): 一次連 20 組太難也太長——超過 10 組就自動平均切成幾輪
     （20 → 2 輪各 10；13 → 2 輪 7/6；25 → 3 輪 9/8/8）。分數累計、一輪一輪過。 */
  var rounds = useQMM(() => {
    var n = allPairs.length;
    if (n <= 10) return [allPairs];
    var k = Math.ceil(n / 10); // 輪數
    var size = Math.ceil(n / k); // 每輪最多幾組
    var shuffled = shuffleArr(allPairs.slice());
    var out = [];
    for (var i = 0; i < n; i += size) out.push(shuffled.slice(i, i + size));
    return out;
  }, [item.id, allPairs]);
  var [roundIdx, setRoundIdx] = useQM(0);
  var [bank, setBank] = useQM({
    correct: 0,
    wrong: []
  }); // 已完成回合的累計
  var pairs = rounds[Math.min(roundIdx, rounds.length - 1)] || [];
  var rights = useQMM(() => shuffleArr(pairs.slice()), [item.id, roundIdx]);
  var [sel, setSel] = useQM(null); // { side:'L'|'R', id }
  var [conn, setConn] = useQM({}); // 左邊 pairId → 右邊 pairId（學生的答案，不判對錯）
  var [order, setOrder] = useQM([]); // 連線先後（配色用）
  var [graded, setGraded] = useQM(null); // 交卷後：{ correct, wrongList }
  var [done, setDone] = useQM(false);
  var wrapRef = React.useRef(null);
  var [lines, setLines] = useQM([]); // 畫線用的座標
  var [tick, setTick] = useQM(0); // 觸發重算

  var total = pairs.length;
  var linkedN = Object.keys(conn).length;
  var allLinked = total > 0 && linkedN >= total;

  /* 連線時要唸出英文——先把這一輪的音檔抓好，點下去才不會等網路（iOS 也才播得出來） */
  useQME(() => {
    if (!window.prefetchTts) return;
    try {
      window.prefetchTts(pairs.map(p => p.word));
    } catch (e) {}
  }, [item.id, roundIdx]);
  var say = w => {
    var f = window.speakTTS || window.speakText;
    if (f) {
      try {
        f(w, {
          lang: 'en-US'
        });
      } catch (e) {}
    }
  };

  // 量位置畫線
  var measure = () => {
    var wrap = wrapRef.current;
    if (!wrap) return;
    var base = wrap.getBoundingClientRect();
    var out = [];
    Object.keys(conn).forEach(lid => {
      var rid = conn[lid];
      var l = wrap.querySelector(`[data-dm-l="${lid}"]`);
      var r = wrap.querySelector(`[data-dm-r="${rid}"]`);
      if (!l || !r) return;
      var a = l.getBoundingClientRect(),
        b = r.getBoundingClientRect();
      var ok = lid === rid;
      out.push({
        lid,
        x1: a.right - base.left,
        y1: a.top - base.top + a.height / 2,
        x2: b.left - base.left,
        y2: b.top - base.top + b.height / 2,
        color: graded ? ok ? '#2E7D5B' : '#D6533C' : DM_HUES[Math.max(0, order.indexOf(lid)) % DM_HUES.length],
        bad: !!(graded && !ok)
      });
    });
    setLines(out);
  };
  useQME(() => {
    measure();
  }, [conn, order, graded, tick]);
  useQME(() => {
    var on = () => setTick(t => t + 1);
    window.addEventListener('resize', on);
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(on) : null;
    if (ro && wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      window.removeEventListener('resize', on);
      if (ro) ro.disconnect();
    };
  }, []);
  var connect = (lid, rid) => {
    setConn(prev => {
      var next = {};
      // 一個字只能連一條線、一個解釋也只能被連一次 → 舊的自動讓位
      Object.keys(prev).forEach(k => {
        if (k !== lid && prev[k] !== rid) next[k] = prev[k];
      });
      next[lid] = rid;
      return next;
    });
    setOrder(prev => prev.indexOf(lid) >= 0 ? prev : prev.concat(lid));
    setSel(null);
    if (window.playSound) window.playSound('match');
    var p = pairs.find(x => x.id === lid);
    if (p) say(p.word); // v375(#3): 連線也要有配音
  };
  var unlink = lid => {
    setConn(prev => {
      var n = {
        ...prev
      };
      delete n[lid];
      return n;
    });
    setOrder(prev => prev.filter(x => x !== lid));
    setSel(null);
  };
  var pick = (side, id) => {
    if (done || graded) return;
    // 已經連好的再點一次＝拆掉重連（交卷前都可以改）
    var linkedLeft = side === 'L' ? conn[id] ? id : null : Object.keys(conn).filter(k => conn[k] === id)[0];
    if (linkedLeft) {
      unlink(linkedLeft);
      return;
    }
    if (side === 'L') {
      var p = pairs.find(x => x.id === id);
      if (p) say(p.word);
    }
    if (!sel) {
      setSel({
        side,
        id
      });
      return;
    }
    if (sel.side === side) {
      setSel({
        side,
        id
      });
      return;
    } // 同一邊＝改選
    if (side === 'R') connect(sel.id, id);else connect(id, sel.id);
  };
  var submit = () => {
    if (!allLinked || graded) return;
    var wrongList = pairs.filter(p => conn[p.id] !== p.id).map(p => ({
      q: p.word,
      answer: p.def
    }));
    var correct = total - wrongList.length;
    setGraded({
      correct,
      wrongList
    });
    setSel(null);
    if (window.playSound) window.playSound(correct === total ? 'complete' : 'wrong');
  };
  var afterGrade = () => {
    if (!graded) return;
    var accC = bank.correct + graded.correct;
    var accW = bank.wrong.concat(graded.wrongList);
    if (roundIdx < rounds.length - 1) {
      // 還有下一輪
      setBank({
        correct: accC,
        wrong: accW
      });
      setConn({});
      setOrder([]);
      setSel(null);
      setGraded(null);
      setRoundIdx(roundIdx + 1);
      return;
    }
    var grand = allPairs.length;
    saveQuizModeCompletion(progressKey, item, {
      doneCount: grand,
      score: accC,
      total: grand,
      wrongQuestions: accW
    });
    setBank({
      correct: accC,
      wrong: accW
    });
    setDone(true);
  };
  var restart = () => {
    setConn({});
    setOrder([]);
    setSel(null);
    setGraded(null);
    setDone(false);
    setRoundIdx(0);
    setBank({
      correct: 0,
      wrong: []
    });
    setTick(t => t + 1);
  };
  if (done) {
    var correct = bank.correct;
    var grand = allPairs.length;
    var pct = Math.round(correct / grand * 100);
    return /*#__PURE__*/React.createElement(QmCelebrate, {
      pct: pct
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-result"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-result-emoji"
    }, pct === 100 ? '🏆' : pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-cat-title"
    }, item.title), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-score"
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-result-num"
    }, correct), /*#__PURE__*/React.createElement("span", {
      className: "qm-result-denom"
    }, " / ", grand)), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-pct"
    }, "\u914D\u5C0D\u6B63\u78BA ", pct, "%"), bank.wrong.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "dm-review"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dm-review-head"
    }, "\u2717 \u9019 ", bank.wrong.length, " \u7D44\u9023\u932F\u4E86\u2014\u2014\u6B63\u78BA\u7B54\u6848\u662F\uFF1A"), bank.wrong.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "dm-review-row"
    }, /*#__PURE__*/React.createElement("b", null, m.q), /*#__PURE__*/React.createElement("span", {
      className: "dm-review-eq"
    }, "\uFF1D"), /*#__PURE__*/React.createElement("span", null, m.answer)))), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-btns"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary",
      onClick: restart
    }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask
    }))));
  }
  var rightOwner = rid => Object.keys(conn).filter(k => conn[k] === rid)[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-player-shell dm-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-fill",
    style: {
      width: (bank.correct + linkedN) / Math.max(1, allPairs.length) * 100 + '%'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "qm-player-counter"
  }, rounds.length > 1 ? `第 ${roundIdx + 1}/${rounds.length} 組 · ` : '', linkedN, " / ", total)), /*#__PURE__*/React.createElement("div", {
    className: "dm-hint"
  }, graded ? '綠色＝連對了，紅色＝連錯了。看完按下面的按鈕。' : '把左邊的單字，連到右邊正確的意思——連錯不會馬上告訴你，再點一次可以拆掉重連'), /*#__PURE__*/React.createElement("div", {
    className: 'dm-wrap' + (graded ? ' graded' : ''),
    ref: wrapRef
  }, /*#__PURE__*/React.createElement("svg", {
    className: "dm-svg",
    "aria-hidden": "true"
  }, lines.map(ln => /*#__PURE__*/React.createElement("path", {
    key: ln.lid,
    d: `M ${ln.x1} ${ln.y1} C ${ln.x1 + Math.max(28, (ln.x2 - ln.x1) * 0.42)} ${ln.y1}, ${ln.x2 - Math.max(28, (ln.x2 - ln.x1) * 0.42)} ${ln.y2}, ${ln.x2} ${ln.y2}`,
    className: 'dm-line' + (ln.bad ? ' bad' : ''),
    style: {
      stroke: ln.color
    }
  }))), pairs.map((p, i) => {
    var isLinked = !!conn[p.id];
    var ok = graded && conn[p.id] === p.id;
    return /*#__PURE__*/React.createElement("button", {
      key: 'L' + p.id,
      "data-dm-l": p.id,
      type: "button",
      style: {
        gridColumn: 1,
        gridRow: i + 1,
        ...(isLinked && !graded ? {
          '--dm-c': DM_HUES[Math.max(0, order.indexOf(p.id)) % DM_HUES.length]
        } : null)
      },
      className: 'dm-chip dm-word' + (isLinked ? ' linked' : '') + (sel && sel.side === 'L' && sel.id === p.id ? ' sel' : '') + (graded ? ok ? ' ok' : ' bad' : ''),
      onClick: () => pick('L', p.id)
    }, graded && /*#__PURE__*/React.createElement("span", {
      className: 'dm-mark ' + (ok ? 'ok' : 'bad')
    }, ok ? '✓' : '✗'), /*#__PURE__*/React.createElement("span", {
      className: "dm-txt"
    }, p.word), /*#__PURE__*/React.createElement("span", {
      className: "dm-dot"
    }));
  }), rights.map((p, i) => {
    var owner = rightOwner(p.id);
    var isLinked = !!owner;
    var ok = graded && owner === p.id;
    return /*#__PURE__*/React.createElement("button", {
      key: 'R' + p.id,
      "data-dm-r": p.id,
      type: "button",
      style: {
        gridColumn: 2,
        gridRow: i + 1,
        ...(isLinked && !graded ? {
          '--dm-c': DM_HUES[Math.max(0, order.indexOf(owner)) % DM_HUES.length]
        } : null)
      },
      className: 'dm-chip dm-def' + (isLinked ? ' linked' : '') + (sel && sel.side === 'R' && sel.id === p.id ? ' sel' : '') + (graded ? ok ? ' ok' : ' bad' : ''),
      onClick: () => pick('R', p.id)
    }, /*#__PURE__*/React.createElement("span", {
      className: "dm-dot"
    }), /*#__PURE__*/React.createElement("span", {
      className: "dm-txt"
    }, p.def), graded && /*#__PURE__*/React.createElement("span", {
      className: 'dm-mark ' + (ok ? 'ok' : 'bad')
    }, ok ? '✓' : '✗'));
  })), /*#__PURE__*/React.createElement("div", {
    className: "dm-foot"
  }, graded ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: 'dm-foot-score' + (graded.correct === total ? ' perfect' : '')
  }, graded.correct === total ? '🎉 這一回合全對！' : `這一回合對 ${graded.correct} / ${total} · 紅色的是連錯的`), /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary dm-submit",
    onClick: afterGrade
  }, roundIdx < rounds.length - 1 ? '下一回合 →' : '查看成績 →')) : /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary dm-submit",
    onClick: submit,
    disabled: !allLinked
  }, allLinked ? `交卷 · 對答案（${total} 組）` : `還有 ${total - linkedN} 組沒連`)));
}

/* ══════════════════════════════════════════════════════════════
   v367: 群組參考資料（文章影片／檔案／說明）
   一個群組（例：Grandma and the great gourd）底下可能有選擇題、手寫題、
   reading skill 分析……讓老師在群組最上面掛一次文章來源，全部共用。
   ══════════════════════════════════════════════════════════════ */
function GroupResViewer({
  name,
  res,
  onClose
}) {
  var embed = res.yt && window.toYouTubeEmbed ? window.toYouTubeEmbed(res.yt) : '';
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "gres-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "gres-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "gres-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "gres-kicker"
  }, "\u53C3\u8003\u8CC7\u6599"), /*#__PURE__*/React.createElement("b", null, name)), /*#__PURE__*/React.createElement("button", {
    className: "gres-x",
    onClick: onClose,
    "aria-label": "\u95DC\u9589"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "gres-body"
  }, embed ? /*#__PURE__*/React.createElement("div", {
    className: "gres-video"
  }, /*#__PURE__*/React.createElement("iframe", {
    src: embed,
    frameBorder: "0",
    allowFullScreen: true,
    allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  })) : null, res.note ? /*#__PURE__*/React.createElement("div", {
    className: "gres-note"
  }, res.note) : null, res.fileUrl ? /*#__PURE__*/React.createElement("a", {
    className: "gres-file",
    href: res.fileUrl,
    target: "_blank",
    rel: "noopener noreferrer"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("span", null, res.fileName || '開啟課文檔案'), /*#__PURE__*/React.createElement("span", {
    className: "gres-file-go"
  }, "\u2197")) : null, !embed && !res.note && !res.fileUrl && /*#__PURE__*/React.createElement("div", {
    className: "qm-unit-empty"
  }, "\u8001\u5E2B\u9084\u6C92\u653E\u53C3\u8003\u8CC7\u6599\u3002")))), document.body);
}
function GroupResEditor({
  name,
  res,
  weekId,
  onSave,
  onClose
}) {
  var [yt, setYt] = useQM(res.yt || '');
  var [note, setNote] = useQM(res.note || '');
  var [fileUrl, setFileUrl] = useQM(res.fileUrl || '');
  var [fileName, setFileName] = useQM(res.fileName || '');
  var [busy, setBusy] = useQM(false);
  var [err, setErr] = useQM('');
  var fileRef = React.useRef(null);
  var pick = async e => {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      var key = 'group_' + String(name).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40) + '_' + Date.now();
      var url = await window.uploadPdfToStorage(weekId, key, f);
      setFileUrl(url);
      setFileName(f.name);
    } catch (ex) {
      setErr('上傳失敗：' + (ex && ex.message || ''));
    }
    setBusy(false);
  };
  var save = () => {
    var v = String(yt).trim();
    if (v && window.toYouTubeEmbed && !window.toYouTubeEmbed(v)) {
      setErr('這個 YouTube 連結看不懂——貼影片網址（youtube.com/watch?v=… 或 youtu.be/…）');
      return;
    }
    onSave({
      yt: v,
      note: String(note).trim(),
      fileUrl,
      fileName
    });
    onClose();
  };
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "gres-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "gres-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "gres-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "gres-kicker"
  }, "\u9019\u500B\u7FA4\u7D44\u7684\u53C3\u8003\u8CC7\u6599"), /*#__PURE__*/React.createElement("b", null, name)), /*#__PURE__*/React.createElement("button", {
    className: "gres-x",
    onClick: onClose,
    "aria-label": "\u95DC\u9589"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "gres-body gres-edit"
  }, /*#__PURE__*/React.createElement("label", {
    className: "gres-lab"
  }, "\uD83D\uDCFA YouTube \u5F71\u7247\u9023\u7D50"), /*#__PURE__*/React.createElement("input", {
    className: "gres-in",
    value: yt,
    onChange: e => {
      setYt(e.target.value);
      setErr('');
    },
    placeholder: "https://www.youtube.com/watch?v=\u2026\uFF08\u7559\u7A7A\uFF1D\u6C92\u6709\u5F71\u7247\uFF09"
  }), /*#__PURE__*/React.createElement("label", {
    className: "gres-lab"
  }, "\uD83D\uDCC4 \u8AB2\u6587\u6A94\u6848\uFF08PDF\uFF0F\u5716\u7247\uFF09"), fileUrl ? /*#__PURE__*/React.createElement("div", {
    className: "gres-filerow"
  }, /*#__PURE__*/React.createElement("a", {
    href: fileUrl,
    target: "_blank",
    rel: "noopener noreferrer"
  }, fileName || '已上傳的檔案'), /*#__PURE__*/React.createElement("button", {
    className: "gres-btn ghost",
    onClick: () => {
      setFileUrl('');
      setFileName('');
    }
  }, "\u79FB\u9664")) : /*#__PURE__*/React.createElement("button", {
    className: "gres-btn",
    disabled: busy,
    onClick: () => fileRef.current && fileRef.current.click()
  }, busy ? '上傳中…' : '⬆ 選擇檔案上傳'), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".pdf,image/*",
    style: {
      display: 'none'
    },
    onChange: pick
  }), /*#__PURE__*/React.createElement("label", {
    className: "gres-lab"
  }, "\uD83D\uDCDD \u7D66\u5B78\u751F\u7684\u8AAA\u660E\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    className: "gres-in gres-ta",
    rows: 3,
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "\u4F8B\uFF1A\u5148\u770B\u5F71\u7247\uFF0C\u518D\u56DE\u7B54\u4E0B\u9762\u7684\u984C\u76EE\u3002\u4E0D\u61C2\u7684\u55AE\u5B57\u53EF\u4EE5\u5148\u505A\u4E0A\u9762\u7684\u55AE\u5B57\u5361\u3002"
  }), err && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg err"
  }, "\u26A0\uFE0F ", err), /*#__PURE__*/React.createElement("div", {
    className: "gres-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "gres-btn primary",
    onClick: save,
    disabled: busy
  }, "\u5132\u5B58"), /*#__PURE__*/React.createElement("button", {
    className: "gres-btn ghost",
    onClick: onClose
  }, "\u53D6\u6D88")), /*#__PURE__*/React.createElement("div", {
    className: "gres-help"
  }, "\u5B58\u597D\u4E4B\u5F8C\uFF0C\u9019\u500B\u7FA4\u7D44\u6700\u4E0A\u9762\u6703\u51FA\u73FE\u4E00\u5F35\u300C\u53C3\u8003\u8CC7\u6599\u300D\u5361\uFF0C\u5B78\u751F\u9EDE\u958B\u5C31\u80FD\u770B\u5F71\u7247\u6216\u8AB2\u6587\u3002")))), document.body);
}

/* ══════════════════════════════════════════════════════════════════════════
   v386: 閱讀技巧 reading-skill
   ──────────────────────────────────────────────────────────────────────────
   學校的閱讀理解除了選擇題與 short answer，還會考 reading skill：
   Problem & Solution／Cause & Effect／Sequencing／Compare & Contrast。
   Alan 的紙本講義是四個大題（含一張 Venn 圖），這裡做成「一個單元、四個步驟」。

   🔑 設計上最重要的一件事：四種技巧在畫面上長得完全不一樣，
      但底下都是同一件事——「把卡片放到正確的格子裡」。
      所以資料統一成 { kind, zones:[{id,label,ico}], chips:[{id,text,zone,why}] }，
      播放器只寫一套、四種都能用（bug 面積只有四分之一）。
        · 問題與解決 → 兩個框（Problem／Solution）
        · 因果關係   → 每個 cause 一格，把 effect 放進去（一格一張）
        · 事件排序   → 格子就是 1,2,3…（一格一張）
        · 比較對照   → Venn 圖的三塊（只有左／兩邊都有／只有右）

   ⚠ 一律「點一下選、再點一下放」，不用 HTML5 drag & drop：
      學生大多在 iPad 上，原生拖曳在觸控上又難按又常失效（v385 吉祥物也踩過拖曳的坑）。
   ══════════════════════════════════════════════════════════════════════════ */

var RS_KIND_META = {
  'problem-solution': {
    ico: '🧩',
    en: 'Problem & Solution',
    zh: '問題與解決',
    tip: '把每一張句子卡放到「問題」或「解決方法」'
  },
  'cause-effect': {
    ico: '⚡',
    en: 'Cause & Effect',
    zh: '因果關係',
    tip: '左邊是原因，把它造成的結果放到右邊'
  },
  'sequence': {
    ico: '🔢',
    en: 'Sequencing',
    zh: '事件排序',
    tip: '照故事發生的先後，把事件放進 1、2、3…'
  },
  'compare-contrast': {
    ico: '⚖️',
    en: 'Compare & Contrast',
    zh: '比較對照',
    tip: '只有左邊有的放左圈、只有右邊有的放右圈、兩邊都有的放中間'
  }
};
function rsChips(b) {
  return (b && b.chips || []).filter(c => c && String(c.text || '').trim());
}
function rsBlocks(item) {
  /* 只算「有字」的卡片：老師編到一半存檔會留下空白卡，
     算進去的話學生會看到一張放不進任何格子的空卡（永遠過不了關）。 */
  return (item && item.rsBlocks || []).map(b => b && rsChips(b).length !== (b.chips || []).length ? {
    ...b,
    chips: rsChips(b)
  } : b).filter(b => {
    if (!b || !RS_KIND_META[b.kind] || (b.chips || []).length < 2) return false;
    var zs = (b.zones || []).filter(z => z && z.id);
    if (zs.length < 2) return false;
    // 因果／排序是「一格一張」——格子比卡片少的話，學生永遠放不完＝卡死沒有出口
    if (b.kind === 'cause-effect' || b.kind === 'sequence') return zs.length >= b.chips.length;
    return b.chips.every(c => zs.some(z => z.id === c.zone));
  });
}
function rsChipTotal(item) {
  return rsBlocks(item).reduce((n, b) => n + b.chips.length, 0);
}

/* v386: 「再看一次文章」抽屜——閱讀技巧、選擇題、閱讀簡答共用。
   compact=true 只給一顆小 📖（放在標題列），否則是置中的一條按鈕。 */
function QmPassageDrawer({
  text,
  title,
  compact
}) {
  var [open, setOpen] = useQM(false);
  var body = String(text || '').trim();
  if (!body) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, compact ? /*#__PURE__*/React.createElement("button", {
    className: "rs-mini",
    onClick: () => setOpen(true),
    title: "\u518D\u770B\u4E00\u6B21\u6587\u7AE0"
  }, "\uD83D\uDCD6") : /*#__PURE__*/React.createElement("div", {
    className: "qm-read-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-read-btn",
    onClick: () => setOpen(true)
  }, "\uD83D\uDCD6 \u770B\u6587\u7AE0 Read the passage")), open && /*#__PURE__*/React.createElement("div", {
    className: "rs-pass-back",
    onClick: () => setOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "rs-pass",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "rs-pass-head"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCD6 ", title || 'Passage'), /*#__PURE__*/React.createElement("button", {
    className: "rs-pass-x",
    onClick: () => setOpen(false)
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "rs-pass-body"
  }, body))));
}
function ReadingSkillIntro({
  item,
  prog,
  onStart
}) {
  var blocks = rsBlocks(item);
  var done = prog && prog.done;
  var pct = prog && prog.score != null && prog.total ? Math.round(prog.score / prog.total * 100) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-intro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-icon"
  }, "\uD83D\uDD0D"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-title"
  }, item.title), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-meta"
  }, blocks.length, " \u7A2E\u95B1\u8B80\u6280\u5DE7 \xB7 \u5171 ", rsChipTotal(item), " \u5F35\u5361\u7247"), /*#__PURE__*/React.createElement("div", {
    className: "rs-intro-list"
  }, blocks.map((b, i) => {
    var m = RS_KIND_META[b.kind];
    return /*#__PURE__*/React.createElement("div", {
      key: b.id || i,
      className: "rs-intro-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rs-intro-n"
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      className: "rs-intro-ico"
    }, m.ico), /*#__PURE__*/React.createElement("span", {
      className: "rs-intro-txt"
    }, /*#__PURE__*/React.createElement("b", null, m.en), /*#__PURE__*/React.createElement("em", null, m.zh)), /*#__PURE__*/React.createElement("span", {
      className: "rs-intro-cnt"
    }, b.chips.length, " \u5F35"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rules"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC46"), /*#__PURE__*/React.createElement("span", null, "\u9EDE\u4E00\u5F35\u5361\u7247\uFF0C\u518D\u9EDE\u4F60\u8981\u653E\u7684\u683C\u5B50\u2014\u2014\u653E\u932F\u4E86\u518D\u9EDE\u5361\u7247\u5C31\u62FF\u56DE\u4F86")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("span", null, "\u5168\u90E8\u653E\u5B8C\u6309\u300C\u6AA2\u67E5\u7B54\u6848\u300D\uFF0C\u653E\u5C0D\u7684\u6703\u9396\u8D77\u4F86\u3001\u653E\u932F\u7684\u9000\u56DE\u4F86\u91CD\u60F3")), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-rule-row"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCAF"), /*#__PURE__*/React.createElement("span", null, "\u5206\u6578\u53EA\u7B97", /*#__PURE__*/React.createElement("b", null, "\u7B2C\u4E00\u6B21\u6AA2\u67E5"), "\u653E\u5C0D\u5E7E\u5F35\uFF0C\u6162\u6162\u60F3\u518D\u6309\u6BD4\u8F03\u5212\u7B97"))), done && pct != null && /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-done"
  }, "\u2713 \u4E0A\u6B21 ", pct, " \u5206"), /*#__PURE__*/React.createElement("div", {
    className: "qm-intro-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: onStart
  }, "\u958B\u59CB\u7DF4\u7FD2 \xB7 Start \u2192")));
}

/* Venn 圖：用 preserveAspectRatio="none" 讓兩個橢圓跟著容器拉伸，
   不管卡片多高，圈圈永遠包得住裡面的內容（不用算高度）。
   手機版（CSS）會把 svg 收起來、三塊改成上下堆疊的彩色卡。 */
function RsVennArt() {
  return /*#__PURE__*/React.createElement("svg", {
    className: "rs-venn-art",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "32",
    cy: "50",
    rx: "34",
    ry: "48",
    className: "rs-venn-l"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "68",
    cy: "50",
    rx: "34",
    ry: "48",
    className: "rs-venn-r"
  }));
}
function ReadingSkillPlayer({
  item,
  progressKey,
  onBack,
  onBackToTasks,
  onNextTask
}) {
  var blocks = useQMM(() => rsBlocks(item), [item]);
  var totalChips = useQMM(() => blocks.reduce((n, b) => n + b.chips.length, 0), [blocks]);
  var [bi, setBi] = useQM(0);
  var [place, setPlace] = useQM({}); // chipId -> zoneId（'' 或沒有這個 key ＝ 還在下面的置物區）
  var [lock, setLock] = useQM({}); // chipId -> true（已經判定正確，鎖住不能動）
  var [sel, setSel] = useQM(null); // 目前選起來的卡片 id
  var [checks, setChecks] = useQM(0); // 這一塊按了幾次「檢查答案」
  var [bad, setBad] = useQM([]); // 上一次檢查放錯的卡片（下面會列出提示）
  var [revealed, setRevealed] = useQM(false);
  var [say, setSay] = useQM(false); // 🔊 選卡片時唸出來
  var [done, setDone] = useQM(false);
  var [shake, setShake] = useQM(0);

  /* 成績用 ref 累計：最後一塊做完要「馬上」拿到總分存檔，
     用 state 的話這一輪還讀不到剛剛 setBank 的值。 */
  var bankRef = React.useRef({
    correct: 0,
    wrong: []
  });
  var bankedRef = React.useRef(false); // 這一塊的分數記過了沒（比 checks 可靠：state 是非同步的）
  useQME(() => {
    bankRef.current = {
      correct: 0,
      wrong: []
    };
    bankedRef.current = false;
  }, [item && item.id]);
  var biC = Math.min(bi, Math.max(0, blocks.length - 1)); // 夾住：blocks 若中途變少，別讓進度條爆表
  var block = blocks[biC];
  var kind = block ? block.kind : '';
  var meta = RS_KIND_META[kind] || RS_KIND_META['problem-solution'];
  var single = kind === 'cause-effect' || kind === 'sequence'; // 一格只能放一張

  // 每一塊進場打亂一次；同一塊重繪不會再亂（不然放到一半卡片會跳位）
  var chipKey = (block && block.chips || []).map(c => c && c.id).join('|');
  var order = useQMM(() => shuffleArr((block && block.chips || []).map(c => c.id)), [chipKey]);
  var chipOf = useQMM(() => {
    var m = {};
    (block && block.chips || []).forEach(c => {
      m[c.id] = c;
    });
    return m;
  }, [chipKey]);
  var zoneLabel = zid => {
    var z = (block && block.zones || []).find(x => x.id === zid);
    return z ? z.label : '';
  };
  var tray = order.filter(id => !place[id]);
  var placedN = order.length - tray.length;
  var lockedN = order.filter(id => lock[id]).length;
  var beforeN = blocks.slice(0, biC).reduce((n, b) => n + b.chips.length, 0);
  var allRight = order.length > 0 && order.every(id => lock[id]);
  var pickChip = id => {
    if (lock[id]) return;
    if (place[id]) {
      // 已經放進格子 → 拿回置物區，並順手選起來（一下就能改放別格）
      setPlace(p => {
        var n = {
          ...p
        };
        delete n[id];
        return n;
      });
      setSel(id);
    } else {
      setSel(s => s === id ? null : id);
    }
    setBad(b => b.filter(x => x !== id));
    if (say && !lock[id] && chipOf[id]) {
      try {
        (window.speakTTS || window.speakText)(chipOf[id].text, {
          lang: 'en-US',
          rate: 0.85
        });
      } catch (e) {}
    }
  };

  // 一格一張的題型：這一格已經放著「鎖住的正確答案」就不讓動（不然會一格疊兩張）
  var zoneLocked = zid => single && order.some(id => lock[id] && place[id] === zid);
  var tapZone = zid => {
    if (!sel || zoneLocked(zid)) return;
    setPlace(p => {
      var n = {
        ...p,
        [sel]: zid
      };
      if (single) {
        // 這一格本來有人 → 把他請回置物區（等於交換）
        order.forEach(id => {
          if (id !== sel && n[id] === zid) delete n[id];
        });
      }
      return n;
    });
    setSel(null);
  };
  var check = () => {
    var right = order.filter(id => chipOf[id] && chipOf[id].zone === place[id]);
    var wrong = order.filter(id => right.indexOf(id) < 0);
    if (!bankedRef.current) {
      // ⭐ 分數只認第一次，之後怎麼改都不加分
      bankedRef.current = true;
      bankRef.current = {
        correct: bankRef.current.correct + right.length,
        wrong: bankRef.current.wrong.concat(wrong.map(id => {
          var lab = zoneLabel((chipOf[id] || {}).zone) || '';
          return {
            q: (chipOf[id] || {}).text || '',
            // 排序題的格子叫「3」，單獨列在錯題本看不懂 → 補成完整的一句
            answer: kind === 'sequence' ? `${meta.zh}：第 ${lab} 個` : `${meta.zh}：${lab}`
          };
        }))
      };
    }
    setChecks(c => c + 1);
    setLock(l => {
      var n = {
        ...l
      };
      right.forEach(id => {
        n[id] = true;
      });
      return n;
    });
    setBad(wrong);
    setPlace(p => {
      var n = {
        ...p
      };
      wrong.forEach(id => {
        delete n[id];
      });
      return n;
    });
    setSel(null);
    if (wrong.length) {
      setShake(s => s + 1);
      if (window.playSound) window.playSound('wrong');
    } else if (window.playSound) window.playSound('correct');
  };
  var reveal = () => {
    var n = {};
    var l = {};
    order.forEach(id => {
      n[id] = (chipOf[id] || {}).zone;
      l[id] = true;
    });
    setPlace(n);
    setLock(l);
    setBad([]);
    setSel(null);
    setRevealed(true);
  };
  var nextBlock = () => {
    if (bi + 1 >= blocks.length) {
      var b = bankRef.current;
      saveQuizModeCompletion(progressKey, item, {
        doneCount: totalChips,
        score: b.correct,
        total: totalChips || 1,
        wrongQuestions: b.wrong
      });
      setDone(true);
      return;
    }
    setBi(i => i + 1);
    bankedRef.current = false;
    setPlace({});
    setLock({});
    setSel(null);
    setChecks(0);
    setBad([]);
    setRevealed(false);
    setShake(0);
  };
  var restart = () => {
    bankRef.current = {
      correct: 0,
      wrong: []
    };
    bankedRef.current = false;
    setBi(0);
    setPlace({});
    setLock({});
    setSel(null);
    setChecks(0);
    setBad([]);
    setRevealed(false);
    setDone(false);
    setShake(0);
  };
  if (!blocks.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "qm-player-shell rs-shell"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-player-head"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-back-btn",
      "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
      onClick: onBack
    }, /*#__PURE__*/React.createElement(window.Icon, {
      name: "close",
      size: 16
    }))), /*#__PURE__*/React.createElement("div", {
      className: "rs-empty"
    }, "\u9019\u500B\u55AE\u5143\u9084\u6C92\u6709\u984C\u76EE\uFF0C\u8ACB\u8001\u5E2B\u88DC\u4E0A\u3002"));
  }
  if (done) {
    var b = bankRef.current;
    var pct = Math.round(b.correct / Math.max(1, totalChips) * 100);
    return /*#__PURE__*/React.createElement(QmCelebrate, {
      pct: pct
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-result"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qm-result-emoji"
    }, pct === 100 ? '🏆' : pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-cat-title"
    }, item.title), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-score"
    }, /*#__PURE__*/React.createElement("span", {
      className: "qm-result-num"
    }, b.correct), /*#__PURE__*/React.createElement("span", {
      className: "qm-result-denom"
    }, " / ", totalChips)), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-pct"
    }, "\u7B2C\u4E00\u6B21\u5C31\u653E\u5C0D ", pct, "%"), b.wrong.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "rs-review"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rs-review-head"
    }, "\u2717 \u9019 ", b.wrong.length, " \u5F35\u7B2C\u4E00\u6B21\u653E\u932F\u4E86\u2014\u2014\u6B63\u78BA\u4F4D\u7F6E\u662F\uFF1A"), b.wrong.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "rs-review-row"
    }, /*#__PURE__*/React.createElement("b", null, m.q), /*#__PURE__*/React.createElement("span", {
      className: "rs-review-eq"
    }, "\u2192"), /*#__PURE__*/React.createElement("span", null, m.answer)))), /*#__PURE__*/React.createElement("div", {
      className: "qm-result-btns"
    }, /*#__PURE__*/React.createElement("button", {
      className: "qm-btn secondary",
      onClick: restart
    }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement(QmDoneNavBtns, {
      onBack: onBack,
      onBackToTasks: onBackToTasks,
      onNextTask: onNextTask
    }))));
  }
  var chipEl = (id, extraCls) => {
    var c = chipOf[id];
    if (!c) return null;
    var cls = 'rs-chip' + (sel === id ? ' sel' : '') + (lock[id] ? ' locked' : '') + (bad.indexOf(id) >= 0 ? ' bad' : '') + (extraCls ? ' ' + extraCls : '');
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      className: cls,
      onClick: () => pickChip(id),
      disabled: !!lock[id]
    }, lock[id] && /*#__PURE__*/React.createElement("span", {
      className: "rs-chip-tick"
    }, "\u2713"), /*#__PURE__*/React.createElement("span", {
      className: "rs-chip-tx"
    }, c.text));
  };
  var zoneBox = (z, cls) => {
    var inside = order.filter(id => place[id] === z.id);
    return /*#__PURE__*/React.createElement("div", {
      key: z.id,
      className: 'rs-zone' + (cls ? ' ' + cls : '') + (sel && !zoneLocked(z.id) ? ' drop' : '') + (inside.length ? ' has' : ''),
      onClick: () => tapZone(z.id)
    }, /*#__PURE__*/React.createElement("div", {
      className: "rs-zone-head"
    }, z.ico ? /*#__PURE__*/React.createElement("span", {
      className: "rs-zone-ico"
    }, z.ico) : null, /*#__PURE__*/React.createElement("span", null, z.label)), /*#__PURE__*/React.createElement("div", {
      className: "rs-zone-body"
    }, inside.map(id => chipEl(id)), !inside.length && /*#__PURE__*/React.createElement("span", {
      className: "rs-zone-ph"
    }, sel ? '點這裡放進來' : '點一張卡片再點這裡')));
  };
  var board = () => {
    var zones = block.zones || [];
    if (kind === 'cause-effect') {
      return /*#__PURE__*/React.createElement("div", {
        className: "rs-ce"
      }, zones.map((z, i) => {
        var inside = order.filter(id => place[id] === z.id);
        return /*#__PURE__*/React.createElement("div", {
          key: z.id,
          className: "rs-ce-row"
        }, /*#__PURE__*/React.createElement("div", {
          className: "rs-ce-cause"
        }, /*#__PURE__*/React.createElement("span", {
          className: "rs-ce-tag"
        }, "Cause ", i + 1), z.label), /*#__PURE__*/React.createElement("div", {
          className: "rs-ce-arrow"
        }, "\u2192"), /*#__PURE__*/React.createElement("div", {
          className: 'rs-ce-slot' + (sel && !zoneLocked(z.id) ? ' drop' : '') + (inside.length ? ' has' : ''),
          onClick: () => tapZone(z.id)
        }, inside.length ? inside.map(id => chipEl(id)) : /*#__PURE__*/React.createElement("span", {
          className: "rs-zone-ph"
        }, "Effect\uFF1A", sel ? '點這裡放' : '放結果')));
      }));
    }
    if (kind === 'sequence') {
      return /*#__PURE__*/React.createElement("div", {
        className: "rs-seq"
      }, zones.map(z => {
        var inside = order.filter(id => place[id] === z.id);
        return /*#__PURE__*/React.createElement("div", {
          key: z.id,
          className: "rs-seq-row"
        }, /*#__PURE__*/React.createElement("span", {
          className: "rs-seq-n"
        }, z.label), /*#__PURE__*/React.createElement("div", {
          className: 'rs-seq-slot' + (sel && !zoneLocked(z.id) ? ' drop' : '') + (inside.length ? ' has' : ''),
          onClick: () => tapZone(z.id)
        }, inside.length ? inside.map(id => chipEl(id)) : /*#__PURE__*/React.createElement("span", {
          className: "rs-zone-ph"
        }, sel ? '點這裡放' : '第 ' + z.label + ' 件事')));
      }));
    }
    if (kind === 'compare-contrast') {
      var zl = zones.find(z => z.id === 'left') || zones[0];
      var zb = zones.find(z => z.id === 'both') || zones[1];
      var zr = zones.find(z => z.id === 'right') || zones[2];
      return /*#__PURE__*/React.createElement("div", {
        className: "rs-venn"
      }, /*#__PURE__*/React.createElement(RsVennArt, null), /*#__PURE__*/React.createElement("div", {
        className: "rs-venn-grid"
      }, zl && zoneBox(zl, 'rs-v-l'), zb && zoneBox(zb, 'rs-v-b'), zr && zoneBox(zr, 'rs-v-r')));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "rs-zones rs-two"
    }, zones.map(z => zoneBox(z, 'rs-ps-' + z.id)));
  };
  var hints = bad.map(id => chipOf[id]).filter(c => c && c.why);
  return /*#__PURE__*/React.createElement("div", {
    className: "qm-player-shell rs-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qm-back-btn",
    "aria-label": "\u8FD4\u56DE\u55AE\u5143\u5217\u8868",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qm-player-fill",
    style: {
      width: (beforeN + lockedN) / Math.max(1, totalChips) * 100 + '%'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "qm-player-counter"
  }, "\u6280\u5DE7 ", biC + 1, " / ", blocks.length)), /*#__PURE__*/React.createElement("div", {
    className: "rs-steps"
  }, blocks.map((b, i) => /*#__PURE__*/React.createElement("span", {
    key: (b.id || '') + i,
    className: 'rs-step' + (i === biC ? ' on' : '') + (i < biC ? ' past' : '')
  }, RS_KIND_META[b.kind].ico))), /*#__PURE__*/React.createElement("div", {
    className: "rs-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rs-head-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rs-head-en"
  }, meta.ico, " ", meta.en), /*#__PURE__*/React.createElement("div", {
    className: "rs-head-zh"
  }, meta.zh, " \xB7 ", meta.tip)), /*#__PURE__*/React.createElement("div", {
    className: "rs-head-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: 'rs-mini' + (say ? ' on' : ''),
    onClick: () => setSay(v => !v),
    title: "\u9078\u5361\u7247\u6642\u5538\u51FA\u4F86"
  }, "\uD83D\uDD0A"), /*#__PURE__*/React.createElement(QmPassageDrawer, {
    text: item.rsPassage,
    title: item.title,
    compact: true
  }))), /*#__PURE__*/React.createElement("div", {
    className: 'rs-board' + (shake ? ' k' + shake % 2 : '')
  }, board()), /*#__PURE__*/React.createElement("div", {
    className: "rs-tray-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rs-tray-lab"
  }, tray.length ? `還有 ${tray.length} 張要放` : allRight ? '全部放對了！' : '都放完了，按下面檢查答案'), /*#__PURE__*/React.createElement("div", {
    className: "rs-tray"
  }, tray.map(id => chipEl(id)), !tray.length && /*#__PURE__*/React.createElement("span", {
    className: "rs-tray-empty"
  }, "\u2713 \u5361\u7247\u90FD\u653E\u5B8C\u4E86"))), checks > 0 && !allRight && /*#__PURE__*/React.createElement("div", {
    className: "rs-fb bad"
  }, /*#__PURE__*/React.createElement("b", null, lockedN, " \u5F35\u653E\u5C0D\u4E86"), "\uFF0C\u9084\u6709 ", order.length - lockedN, " \u5F35\u9000\u56DE\u4F86\u4E86\u2014\u2014\u518D\u60F3\u60F3\u770B\u3002", hints.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "rs-fb-hints"
  }, hints.map((c, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("b", null, c.text), " \u2014 ", c.why)))), allRight && /*#__PURE__*/React.createElement("div", {
    className: "rs-fb good"
  }, revealed ? '答案在上面了，讀一次再繼續。' : checks === 1 ? '🎉 一次就全對！' : '✓ 全部放對了！'), /*#__PURE__*/React.createElement("div", {
    className: "rs-foot"
  }, !allRight && /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    disabled: tray.length > 0,
    onClick: check
  }, tray.length > 0 ? `還有 ${tray.length} 張沒放` : '檢查答案'), !allRight && checks >= 2 && /*#__PURE__*/React.createElement("button", {
    className: "qm-btn secondary",
    onClick: reveal
  }, "\u770B\u7B54\u6848"), allRight && /*#__PURE__*/React.createElement("button", {
    className: "qm-btn primary",
    onClick: nextBlock
  }, bi + 1 >= blocks.length ? '完成 · 看成績 →' : '下一個技巧 →')));
}
Object.assign(window, {
  ExamPlayer,
  TeacherLog,
  ReadingSkillPlayer,
  ReadingSkillIntro,
  rsBlocks,
  rsChipTotal,
  QmPassageDrawer,
  LessonPlayer,
  GroupResViewer,
  GroupResEditor,
  DefMatchPlayer,
  DefMatchIntro,
  SpellingPlayer,
  SpellingIntro,
  QuizModeBlocks,
  QuizModeCategoryView,
  QuizModePlayer,
  getItemQuestions,
  getQuizItems,
  generateListeningQuestions,
  loadQMProg,
  getQuizItemTotal,
  CAT_ICONS,
  WritingPracticePlayer,
  TypeAnswerPlayer,
  ShortAnswerPlayer,
  SyllableDivPlayer,
  WordSortPlayer,
  EssayPlayer,
  StoryMountainPlayer,
  CircleAnswerPlayer,
  CircleAnswerIntro,
  ClozePlayer,
  ClozeIntro,
  UploadHomeworkPlayer,
  GuidedReadingPlayer,
  GuidedReadingIntro,
  WeeklyContactBook,
  TodayTasks,
  GrowthReport,
  GrowthInlineCard,
  WeekSummaryTiles,
  WeekHero,
  qmTypeRank,
  qmItemRank,
  QM_TYPE_ORDER,
  qmGroupByArticle
});