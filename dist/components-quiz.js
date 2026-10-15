// components-quiz.jsx — Self-made online quiz: take it, get scored, see explanations.

var {
  useState: useQS,
  useEffect: useQE,
  useMemo: useQM
} = React;
var QUIZ_STORAGE = "alans-english-quiz-attempts-v1";
function loadAttempts() {
  try {
    return JSON.parse(localStorage.getItem(QUIZ_STORAGE) || "{}");
  } catch (e) {
    return {};
  }
}
function saveAttempts(a) {
  try {
    localStorage.setItem(QUIZ_STORAGE, JSON.stringify(a));
  } catch (e) {}
}

/* Fisher–Yates shuffle returning an index permutation */
function shuffleIdx(n) {
  var a = Array.from({
    length: n
  }, (_, i) => i);
  for (var i = n - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Parse pasted table (TSV from spreadsheet, or comma-CSV).
   Row format: Question \t OptionA(=correct) \t OptionB \t OptionC? \t OptionD? \t Explanation?
   Returns { questions: [...], errors: [...] } */
function parseQuizTable(text) {
  var lines = text.replace(/\r\n/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);
  var out = [];
  var errors = [];
  // detect delimiter — tab if any line has a tab, else comma
  var hasTab = lines.some(l => l.includes("\t"));
  var splitRow = line => {
    if (hasTab) return line.split("\t").map(c => c.trim());
    // simple CSV: respects double-quoted cells
    var cells = [];
    var cur = "";
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) {
        cells.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };
  lines.forEach((line, idx) => {
    // skip obvious header rows
    if (idx === 0 && /question|題目|题目/i.test(line)) return;
    var cells = splitRow(line);
    if (cells.length < 3) {
      errors.push(`Row ${idx + 1}: A 和 B 選項是必填，至少需要 3 欄`);
      return;
    }
    var [q, ...rest] = cells;
    // Column layout:
    //   3 cols total → Q, A, B          (no C/D, no explanation)
    //   4 cols total → Q, A, B, C       (no explanation)
    //   5 cols total → Q, A, B, C, Expl (C optional; explanation in col 5)
    //   6 cols total → Q, A, B, C, D, Expl
    //   7+ cols      → Q, A, B, C, D, Expl (extra joined)
    var opts, explain;
    if (rest.length <= 3) {
      // 3-4 total cols: all non-Q cells are options, no explanation
      opts = rest.filter(c => c.length > 0);
      explain = "";
    } else {
      // 5+ total cols: last cell(s) after the options are explanation
      // max 4 options (A-D), anything beyond is explanation
      opts = rest.slice(0, 4).filter(c => c.length > 0);
      explain = rest.slice(4).join(" ").trim();
      // Special case: if only 3 options provided (rest.length === 4),
      // the 4th non-Q cell is explanation (col 5 in teacher's view)
      if (rest.length === 4) {
        opts = rest.slice(0, 3).filter(c => c.length > 0);
        explain = rest[3] || "";
      }
    }
    if (opts.length < 2) {
      errors.push(`Row ${idx + 1}: 至少需要 A 和 B 兩個選項`);
      return;
    }
    out.push({
      q,
      options: opts,
      answer: 0,
      // first option is always correct at import time
      explain
    });
  });
  return {
    questions: out,
    errors
  };
}

/* ════════════════════════════════
   QUIZ PLAYER — student view
   ════════════════════════════════ */
function QuizPlayer({
  item,
  onComplete
}) {
  var questions = item.questions || [];
  var shuffleEnabled = item.shuffle !== false; // default ON
  var attemptsAll = useQM(() => loadAttempts(), []);
  var lastAttempt = attemptsAll[item.id];

  // Build a per-question option permutation. Stored in sessionStorage so refresh doesn't re-shuffle.
  var shuffleKey = "quiz-shuf-" + item.id;
  var [perms, setPerms] = useQS(() => {
    if (lastAttempt?.perms) return lastAttempt.perms;
    try {
      var cached = sessionStorage.getItem(shuffleKey);
      if (cached) {
        var p = JSON.parse(cached);
        if (Array.isArray(p) && p.length === questions.length) return p;
      }
    } catch (e) {}
    return questions.map(q => shuffleEnabled ? shuffleIdx((q.options || []).length) : (q.options || []).map((_, i) => i));
  });
  useQE(() => {
    try {
      sessionStorage.setItem(shuffleKey, JSON.stringify(perms));
    } catch (e) {}
  }, [perms]);
  var [answers, setAnswers] = useQS(() => lastAttempt?.answers || {});
  var [submitted, setSubmitted] = useQS(() => !!lastAttempt);
  var [cut, setCut] = useQS(null); // 過關/失敗 過場

  var allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] !== undefined);
  var score = useQM(() => {
    if (!questions.length) return {
      correct: 0,
      total: 0,
      pct: 0
    };
    var c = 0;
    questions.forEach((q, i) => {
      var perm = perms[i] || [];
      var userPickShuffled = answers[i];
      // map shuffled pick back to original option index
      var userPickOriginal = userPickShuffled !== undefined ? perm[userPickShuffled] : undefined;
      if (userPickOriginal === q.answer) c++;
    });
    return {
      correct: c,
      total: questions.length,
      pct: Math.round(c / questions.length * 100)
    };
  }, [answers, questions, perms]);
  var select = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [qIdx]: optIdx
    }));
  };
  var submit = () => {
    if (!allAnswered) {
      alert("還有題目未作答 · Please answer all questions first.");
      return;
    }
    var attempts = loadAttempts();
    attempts[item.id] = {
      answers,
      perms,
      submittedAt: Date.now(),
      score: score.correct,
      total: score.total
    };
    saveAttempts(attempts);
    setSubmitted(true);
    setCut({
      pct: score.pct
    }); // 觸發過關/失敗過場
    if (onComplete) onComplete(item.id);
    // Celebrate good scores with stars
    if (score.pct >= 70 && window.triggerStarBurst) window.triggerStarBurst();
    if (window.playSound) window.playSound(score.pct === 100 ? 'complete' : score.pct >= 60 ? 'complete' : 'wrong');
    // Save score to Firestore if user is logged in
    var _u = window._currentUser;
    if (_u && window.saveProgressItem) {
      window.saveProgressItem(_u.uid, _u.displayName || '', _u.email || '', item.id, {
        done: Date.now(),
        score: score.pct,
        time: null
      });
    }
  };
  var reset = () => {
    if (!confirm("Retake this quiz? · 重新作答嗎？")) return;
    var attempts = loadAttempts();
    delete attempts[item.id];
    saveAttempts(attempts);
    try {
      sessionStorage.removeItem(shuffleKey);
    } catch (e) {}
    setAnswers({});
    setSubmitted(false);
    // Re-shuffle
    setPerms(questions.map(q => shuffleEnabled ? shuffleIdx((q.options || []).length) : (q.options || []).map((_, i) => i)));
  };
  if (questions.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "quiz-empty"
    }, "\u5C1A\u672A\u51FA\u984C \xB7 No questions added yet. Use teacher mode to add questions.");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "quiz-player"
  }, cut && window.GameResultCutscene && /*#__PURE__*/React.createElement(window.GameResultCutscene, {
    pct: cut.pct,
    companion: window.loadCompanion ? window.loadCompanion() : null,
    onRetry: () => {
      setCut(null);
      reset();
    },
    onClose: () => setCut(null)
  }), submitted && /*#__PURE__*/React.createElement("div", {
    className: "quiz-result-banner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "quiz-result-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "quiz-result-label mono"
  }, "Your Score \xB7 \u6210\u7E3E"), /*#__PURE__*/React.createElement("div", {
    className: "quiz-result-score serif"
  }, score.correct, /*#__PURE__*/React.createElement("span", {
    className: "of"
  }, "/", score.total)), /*#__PURE__*/React.createElement("div", {
    className: "quiz-result-pct mono"
  }, score.pct, "% correct")), /*#__PURE__*/React.createElement("div", {
    className: "quiz-result-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "quiz-result-message serif"
  }, score.pct === 100 ? "Perfect! 滿分！🏆" : score.pct >= 80 ? "Excellent! 非常好！" : score.pct >= 60 ? "Good effort. 加油！" : "Keep practicing. 多練習！"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "xp-earned"
  }, "+", score.pct === 100 ? 100 : 50, " XP \u26A1")), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: reset
  }, "\u21BB Retake \xB7 \u91CD\u505A"))), /*#__PURE__*/React.createElement("div", {
    className: "quiz-questions"
  }, questions.map((q, qi) => {
    var perm = perms[qi] || (q.options || []).map((_, i) => i);
    var shuffledOptions = perm.map(i => (q.options || [])[i]);
    var correctShuffledIdx = perm.indexOf(q.answer);
    var userAns = answers[qi]; // shuffled-index space
    var isCorrect = submitted && userAns === correctShuffledIdx;
    var showFeedback = submitted;
    return /*#__PURE__*/React.createElement("div", {
      key: qi,
      className: "quiz-q " + (showFeedback ? isCorrect ? "correct" : "wrong" : "")
    }, /*#__PURE__*/React.createElement("div", {
      className: "quiz-q-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "quiz-q-num mono"
    }, "Q", String(qi + 1).padStart(2, "0")), showFeedback && /*#__PURE__*/React.createElement("span", {
      className: "quiz-q-mark mono " + (isCorrect ? "ok" : "bad")
    }, isCorrect ? "✓ Correct" : "✗ Incorrect")), /*#__PURE__*/React.createElement("div", {
      className: "quiz-q-text serif"
    }, q.q), /*#__PURE__*/React.createElement("div", {
      className: "quiz-options"
    }, shuffledOptions.map((opt, oi) => {
      var selected = userAns === oi;
      var isAnswer = correctShuffledIdx === oi;
      var cls = "quiz-option";
      if (submitted) {
        if (isAnswer) cls += " answer";
        if (selected && !isAnswer) cls += " wrong-pick";
      } else if (selected) cls += " selected";
      return /*#__PURE__*/React.createElement("button", {
        key: oi,
        className: cls,
        onClick: () => select(qi, oi),
        disabled: submitted
      }, /*#__PURE__*/React.createElement("span", {
        className: "quiz-option-letter mono"
      }, String.fromCharCode(65 + oi)), /*#__PURE__*/React.createElement("span", {
        className: "quiz-option-text"
      }, opt), submitted && isAnswer && /*#__PURE__*/React.createElement("span", {
        className: "quiz-option-icon"
      }, "\u2713"), submitted && selected && !isAnswer && /*#__PURE__*/React.createElement("span", {
        className: "quiz-option-icon"
      }, "\u2717"));
    })), submitted && q.explain && /*#__PURE__*/React.createElement("div", {
      className: "quiz-explain"
    }, /*#__PURE__*/React.createElement("div", {
      className: "quiz-explain-label mono"
    }, "\u8A73\u89E3 \xB7 Explanation"), /*#__PURE__*/React.createElement("div", {
      className: "quiz-explain-body"
    }, q.explain)));
  })), !submitted && /*#__PURE__*/React.createElement("div", {
    className: "quiz-submit-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--ink-muted)"
    }
  }, Object.keys(answers).length, " / ", questions.length, " answered"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: submit,
    disabled: !allAnswered
  }, "Submit \xB7 \u4EA4\u5377")));
}

/* ════════════════════════════════
   QUIZ EDITOR — teacher view
   ════════════════════════════════ */
function QuizEditor({
  questions,
  onChange
}) {
  var list = questions || [];
  var [importOpen, setImportOpen] = useQS(false);
  var [importText, setImportText] = useQS("");
  var [importMode, setImportMode] = useQS("append"); // append | replace

  var importPreview;
  try {
    var _r = parseQuizTable(importText);
    importPreview = _r && Array.isArray(_r.questions) ? _r : {
      questions: [],
      errors: []
    };
  } catch (_e) {
    importPreview = {
      questions: [],
      errors: []
    };
  }
  var previewQs = importPreview.questions;
  var applyImport = () => {
    if (!previewQs || previewQs.length === 0) {
      alert("No questions found. Check format. · 未讀到題目，請檢查格式。");
      return;
    }
    var next = importMode === "replace" ? previewQs : [...list, ...previewQs];
    onChange(next);
    setImportText("");
    setImportOpen(false);
  };
  var update = (idx, patch) => {
    var next = list.map((q, i) => i === idx ? {
      ...q,
      ...patch
    } : q);
    onChange(next);
  };
  var updateOption = (qIdx, oIdx, val) => {
    var q = list[qIdx];
    var opts = [...(q.options || ["", "", "", ""])];
    opts[oIdx] = val;
    update(qIdx, {
      options: opts
    });
  };
  var addQ = () => {
    onChange([...list, {
      q: "",
      options: ["", "", "", ""],
      answer: 0,
      explain: ""
    }]);
  };
  var removeQ = idx => {
    if (!confirm("Delete this question?")) return;
    onChange(list.filter((_, i) => i !== idx));
  };
  var moveQ = (idx, dir) => {
    var j = idx + dir;
    if (j < 0 || j >= list.length) return;
    var next = [...list];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "quiz-editor"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qe-toolbar"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "qe-import-btn",
    onClick: () => setImportOpen(o => !o)
  }, importOpen ? "✕ CLOSE" : "↓ IMPORT")), importOpen && /*#__PURE__*/React.createElement("div", {
    className: "qe-import-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qe-import-help"
  }, "\u5F9E\u8A66\u7B97\u8868\u8907\u88FD\u8CBC\u4E0A\uFF0C\u6BCF\u5217\u4E00\u984C\uFF1A", /*#__PURE__*/React.createElement("span", {
    className: "qe-import-tag"
  }, "\u984C\u76EE"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-sep"
  }, "[TAB]"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-tag"
  }, "A \u2014 \u6B63\u89E3 \u2726\u5FC5\u586B"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-sep"
  }, "[TAB]"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-tag"
  }, "B \u2726\u5FC5\u586B"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-sep"
  }, "[TAB]"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-tag",
    style: {
      opacity: 0.6
    }
  }, "C\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-sep"
  }, "[TAB]"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-tag",
    style: {
      opacity: 0.6
    }
  }, "D\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-sep"
  }, "[TAB]"), /*#__PURE__*/React.createElement("span", {
    className: "qe-import-tag",
    style: {
      opacity: 0.6
    }
  }, "\u8A73\u89E3\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-3)",
      display: 'block',
      marginTop: 4
    }
  }, "\xB7 \u7B2C\u4E00\u500B\u9078\u9805\uFF08A\uFF09\u9810\u8A2D\u70BA\u6B63\u89E3 \xB7 C/D \u7701\u7565\u6642\u8A73\u89E3\u81EA\u52D5\u79FB\u5230\u7B2C\u4E94\u6B04")), /*#__PURE__*/React.createElement("textarea", {
    className: "qe-import-textarea",
    value: importText,
    onChange: e => setImportText(e.target.value),
    rows: 7,
    placeholder: "What does 'fable' mean?\tA short story with a moral\tA type of song\tA kind of poem\t寓言故事是有教訓意義的短篇故事。\nWhich word means 'very tired'?\tExhausted\tHungry\tExcited\nThe opposite of 'safe' is ___.\tDangerous\tHappy\tSmall\tBrave\tOpposites are words with contrasting meanings."
  }), importText.trim().length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      padding: '6px 2px',
      color: previewQs && previewQs.length > 0 ? 'var(--green,#3a7d44)' : 'var(--accent)',
      lineHeight: 1.6
    }
  }, previewQs && previewQs.length > 0 ? `✓ 偵測到 ${previewQs.length} 題，可以匯入` : importText.includes('\t') ? (() => {
    var errs = importPreview.errors || [];
    var firstErr = errs[0] || '格式有誤';
    var lines = importText.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
    var firstLine = lines[0] || '';
    var cols = firstLine.split('\t').length;
    return `✗ 偵測到 ${lines.length} 列 / 第1列 ${cols} 欄。${firstErr}`;
  })() : `✗ 沒有偵測到 Tab 字元 — 請從 Google 試算表或 Excel 複製`), /*#__PURE__*/React.createElement("div", {
    className: "qe-import-foot2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "qe-import-cancel",
    onClick: () => {
      setImportOpen(false);
      setImportText("");
    }
  }, "CANCEL"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "qe-import-confirm",
    onClick: applyImport,
    disabled: !previewQs || previewQs.length === 0
  }, "IMPORT ", previewQs && previewQs.length > 0 ? `${previewQs.length} QUESTIONS` : ''))), list.length === 0 && !importOpen && /*#__PURE__*/React.createElement("div", {
    className: "quiz-editor-empty"
  }, "No questions yet. Add one below or import."), list.map((q, qi) => /*#__PURE__*/React.createElement("div", {
    key: qi,
    className: "qe-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qe-block-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "Question ", qi + 1), /*#__PURE__*/React.createElement("div", {
    className: "qe-block-tools"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => moveQ(qi, -1),
    disabled: qi === 0,
    title: "Move up"
  }, "\u2191"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => moveQ(qi, 1),
    disabled: qi === list.length - 1,
    title: "Move down"
  }, "\u2193"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => removeQ(qi),
    title: "Delete",
    className: "danger"
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Question \xB7 \u984C\u76EE"), /*#__PURE__*/React.createElement("input", {
    value: q.q || "",
    onChange: e => update(qi, {
      q: e.target.value
    }),
    placeholder: "e.g. What does 'biology' mean?"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Options \xB7 \u9078\u9805\uFF08\u9EDE\u5713\u5708\u8A2D\u70BA\u6B63\u89E3\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "qe-options"
  }, (q.options || ["", "", "", ""]).map((opt, oi) => /*#__PURE__*/React.createElement("div", {
    key: oi,
    className: "qe-option-row"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "qe-radio " + (q.answer === oi ? "checked" : ""),
    onClick: () => update(qi, {
      answer: oi
    }),
    title: "Mark as correct answer"
  }, q.answer === oi && "✓"), /*#__PURE__*/React.createElement("span", {
    className: "qe-letter mono"
  }, String.fromCharCode(65 + oi)), /*#__PURE__*/React.createElement("input", {
    value: opt,
    onChange: e => updateOption(qi, oi, e.target.value),
    placeholder: "Option " + String.fromCharCode(65 + oi)
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Explanation \xB7 \u8A73\u89E3\uFF08\u5B78\u751F\u4EA4\u5377\u5F8C\u6703\u770B\u5230\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    value: q.explain || "",
    onChange: e => update(qi, {
      explain: e.target.value
    }),
    placeholder: "\u8AAA\u660E\u70BA\u4EC0\u9EBC\u9019\u662F\u6B63\u78BA\u7B54\u6848\uFF0C\u53EF\u4E2D\u82F1\u6587\u6DF7\u7528\u3002",
    rows: 3
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "qe-add",
    onClick: addQ
  }, "+ Add Question \xB7 \u65B0\u589E\u984C\u76EE"));
}
Object.assign(window, {
  QuizPlayer,
  QuizEditor
});