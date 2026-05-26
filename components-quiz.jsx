// components-quiz.jsx — Self-made online quiz: take it, get scored, see explanations.

const { useState: useQS, useEffect: useQE, useMemo: useQM } = React;

const QUIZ_STORAGE = "alans-english-quiz-attempts-v1";

function loadAttempts() {
  try { return JSON.parse(localStorage.getItem(QUIZ_STORAGE) || "{}"); } catch (e) { return {}; }
}
function saveAttempts(a) {
  try { localStorage.setItem(QUIZ_STORAGE, JSON.stringify(a)); } catch (e) {}
}

/* Fisher–Yates shuffle returning an index permutation */
function shuffleIdx(n) {
  const a = Array.from({length: n}, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Parse pasted table (TSV from spreadsheet, or comma-CSV).
   Row format: Question \t OptionA(=correct) \t OptionB \t OptionC? \t OptionD? \t Explanation?
   Returns { questions: [...], errors: [...] } */
function parseQuizTable(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);
  const out = [];
  const errors = [];
  // detect delimiter — tab if any line has a tab, else comma
  const hasTab = lines.some(l => l.includes("\t"));
  const splitRow = (line) => {
    if (hasTab) return line.split("\t").map(c => c.trim());
    // simple CSV: respects double-quoted cells
    const cells = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };
  lines.forEach((line, idx) => {
    // skip obvious header rows
    if (idx === 0 && /question|題目|题目/i.test(line)) return;
    const cells = splitRow(line);
    if (cells.length < 3) { errors.push(`Row ${idx + 1}: A 和 B 選項是必填，至少需要 3 欄`); return; }
    const [q, ...rest] = cells;
    // Column layout:
    //   3 cols total → Q, A, B          (no C/D, no explanation)
    //   4 cols total → Q, A, B, C       (no explanation)
    //   5 cols total → Q, A, B, C, Expl (C optional; explanation in col 5)
    //   6 cols total → Q, A, B, C, D, Expl
    //   7+ cols      → Q, A, B, C, D, Expl (extra joined)
    let opts, explain;
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
    if (opts.length < 2) { errors.push(`Row ${idx + 1}: 至少需要 A 和 B 兩個選項`); return; }
    out.push({
      q,
      options: opts,
      answer: 0, // first option is always correct at import time
      explain,
    });
  });
  return { questions: out, errors };
}

/* ════════════════════════════════
   QUIZ PLAYER — student view
   ════════════════════════════════ */
function QuizPlayer({ item, onComplete }) {
  const questions = item.questions || [];
  const shuffleEnabled = item.shuffle !== false; // default ON
  const attemptsAll = useQM(() => loadAttempts(), []);
  const lastAttempt = attemptsAll[item.id];

  // Build a per-question option permutation. Stored in sessionStorage so refresh doesn't re-shuffle.
  const shuffleKey = "quiz-shuf-" + item.id;
  const [perms, setPerms] = useQS(() => {
    if (lastAttempt?.perms) return lastAttempt.perms;
    try {
      const cached = sessionStorage.getItem(shuffleKey);
      if (cached) {
        const p = JSON.parse(cached);
        if (Array.isArray(p) && p.length === questions.length) return p;
      }
    } catch (e) {}
    return questions.map(q => shuffleEnabled ? shuffleIdx((q.options || []).length) : (q.options || []).map((_, i) => i));
  });

  useQE(() => {
    try { sessionStorage.setItem(shuffleKey, JSON.stringify(perms)); } catch (e) {}
  }, [perms]);

  const [answers, setAnswers] = useQS(() => lastAttempt?.answers || {});
  const [submitted, setSubmitted] = useQS(() => !!lastAttempt);

  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] !== undefined);

  const score = useQM(() => {
    if (!questions.length) return { correct: 0, total: 0, pct: 0 };
    let c = 0;
    questions.forEach((q, i) => {
      const perm = perms[i] || [];
      const userPickShuffled = answers[i];
      // map shuffled pick back to original option index
      const userPickOriginal = userPickShuffled !== undefined ? perm[userPickShuffled] : undefined;
      if (userPickOriginal === q.answer) c++;
    });
    return { correct: c, total: questions.length, pct: Math.round(c / questions.length * 100) };
  }, [answers, questions, perms]);

  const select = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const submit = () => {
    if (!allAnswered) {
      alert("還有題目未作答 · Please answer all questions first.");
      return;
    }
    const attempts = loadAttempts();
    attempts[item.id] = { answers, perms, submittedAt: Date.now(), score: score.correct, total: score.total };
    saveAttempts(attempts);
    setSubmitted(true);
    if (onComplete) onComplete(item.id);
    // Save score to Firestore if user is logged in
    const _u = window._currentUser;
    if (_u && window.saveProgressItem) {
      window.saveProgressItem(_u.uid, _u.displayName || '', _u.email || '', item.id, {
        done: Date.now(), score: score.pct, time: null,
      });
    }
  };

  const reset = () => {
    if (!confirm("Retake this quiz? · 重新作答嗎？")) return;
    const attempts = loadAttempts();
    delete attempts[item.id];
    saveAttempts(attempts);
    try { sessionStorage.removeItem(shuffleKey); } catch (e) {}
    setAnswers({});
    setSubmitted(false);
    // Re-shuffle
    setPerms(questions.map(q => shuffleEnabled ? shuffleIdx((q.options || []).length) : (q.options || []).map((_, i) => i)));
  };

  if (questions.length === 0) {
    return <div className="quiz-empty">尚未出題 · No questions added yet. Use teacher mode to add questions.</div>;
  }

  return (
    <div className="quiz-player">
      {submitted && (
        <div className="quiz-result-banner">
          <div className="quiz-result-left">
            <div className="quiz-result-label mono">Your Score · 成績</div>
            <div className="quiz-result-score serif">
              {score.correct}<span className="of">/{score.total}</span>
            </div>
            <div className="quiz-result-pct mono">{score.pct}% correct</div>
          </div>
          <div className="quiz-result-right">
            <div className="quiz-result-message serif">
              {score.pct === 100 ? "Perfect! 滿分！" :
               score.pct >= 80 ? "Excellent! 非常好！" :
               score.pct >= 60 ? "Good effort. 加油！" : "Keep practicing. 多練習一下！"}
            </div>
            <button className="btn" onClick={reset}>↻ Retake · 重做</button>
          </div>
        </div>
      )}

      <div className="quiz-questions">
        {questions.map((q, qi) => {
          const perm = perms[qi] || (q.options || []).map((_, i) => i);
          const shuffledOptions = perm.map(i => (q.options || [])[i]);
          const correctShuffledIdx = perm.indexOf(q.answer);
          const userAns = answers[qi]; // shuffled-index space
          const isCorrect = submitted && userAns === correctShuffledIdx;
          const showFeedback = submitted;
          return (
            <div key={qi} className={"quiz-q " + (showFeedback ? (isCorrect ? "correct" : "wrong") : "")}>
              <div className="quiz-q-head">
                <span className="quiz-q-num mono">Q{String(qi + 1).padStart(2, "0")}</span>
                {showFeedback && (
                  <span className={"quiz-q-mark mono " + (isCorrect ? "ok" : "bad")}>
                    {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                  </span>
                )}
              </div>
              <div className="quiz-q-text serif">{q.q}</div>
              <div className="quiz-options">
                {shuffledOptions.map((opt, oi) => {
                  const selected = userAns === oi;
                  const isAnswer = correctShuffledIdx === oi;
                  let cls = "quiz-option";
                  if (submitted) {
                    if (isAnswer) cls += " answer";
                    if (selected && !isAnswer) cls += " wrong-pick";
                  } else if (selected) cls += " selected";
                  return (
                    <button
                      key={oi}
                      className={cls}
                      onClick={() => select(qi, oi)}
                      disabled={submitted}
                    >
                      <span className="quiz-option-letter mono">{String.fromCharCode(65 + oi)}</span>
                      <span className="quiz-option-text">{opt}</span>
                      {submitted && isAnswer && <span className="quiz-option-icon">✓</span>}
                      {submitted && selected && !isAnswer && <span className="quiz-option-icon">✗</span>}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explain && (
                <div className="quiz-explain">
                  <div className="quiz-explain-label mono">詳解 · Explanation</div>
                  <div className="quiz-explain-body">{q.explain}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <div className="quiz-submit-row">
          <span className="mono" style={{color: "var(--ink-muted)"}}>
            {Object.keys(answers).length} / {questions.length} answered
          </span>
          <button
            className="btn primary"
            onClick={submit}
            disabled={!allAnswered}
          >
            Submit · 交卷
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   QUIZ EDITOR — teacher view
   ════════════════════════════════ */
function QuizEditor({ questions, onChange }) {
  const list = questions || [];
  const [importOpen, setImportOpen] = useQS(false);
  const [importText, setImportText] = useQS("");
  const [importMode, setImportMode] = useQS("append"); // append | replace

  const importPreview = useQM(() => { try { return parseQuizTable(importText); } catch(e) { return {questions:[], errors:[]}; } }, [importText]);

  const applyImport = () => {
    if (importPreview.questions.length === 0) {
      alert("No questions found. Check format. · 未讀到題目，請檢查格式。");
      return;
    }
    const next = importMode === "replace"
      ? importPreview.questions
      : [...list, ...importPreview.questions];
    onChange(next);
    setImportText("");
    setImportOpen(false);
  };

  const update = (idx, patch) => {
    const next = list.map((q, i) => i === idx ? { ...q, ...patch } : q);
    onChange(next);
  };
  const updateOption = (qIdx, oIdx, val) => {
    const q = list[qIdx];
    const opts = [...(q.options || ["", "", "", ""])];
    opts[oIdx] = val;
    update(qIdx, { options: opts });
  };
  const addQ = () => {
    onChange([...list, { q: "", options: ["", "", "", ""], answer: 0, explain: "" }]);
  };
  const removeQ = (idx) => {
    if (!confirm("Delete this question?")) return;
    onChange(list.filter((_, i) => i !== idx));
  };
  const moveQ = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  return (
    <div className="quiz-editor">
      <div className="qe-toolbar">
        <button type="button" className="qe-import-btn" onClick={() => setImportOpen(o => !o)}>
          ☰  {importOpen ? "Hide import · 關閉匯入" : "Import from spreadsheet · 從表格匯入"}
        </button>
      </div>

      {importOpen && (
        <div className="qe-import-panel">
          <div className="qe-import-help">
            從試算表複製貼上，每列一題：
            <span className="qe-import-tag">題目</span>
            <span className="qe-import-sep">[TAB]</span>
            <span className="qe-import-tag">A — 正解 ✦必填</span>
            <span className="qe-import-sep">[TAB]</span>
            <span className="qe-import-tag">B ✦必填</span>
            <span className="qe-import-sep">[TAB]</span>
            <span className="qe-import-tag" style={{opacity:0.6}}>C（選填）</span>
            <span className="qe-import-sep">[TAB]</span>
            <span className="qe-import-tag" style={{opacity:0.6}}>D（選填）</span>
            <span className="qe-import-sep">[TAB]</span>
            <span className="qe-import-tag" style={{opacity:0.6}}>詳解（選填）</span>
            <span style={{color:"var(--ink-3)",display:'block',marginTop:4}}>· 第一個選項（A）預設為正解 · C/D 省略時詳解自動移到第五欄</span>
          </div>
          <textarea
            className="qe-import-textarea"
            value={importText}
            onChange={e => setImportText(e.target.value)}
            rows={7}
            placeholder={"What does 'fable' mean?\tA short story with a moral\tA type of song\tA kind of poem\t寓言故事是有教訓意義的短篇故事。\nWhich word means 'very tired'?\tExhausted\tHungry\tExcited\nThe opposite of 'safe' is ___.\tDangerous\tHappy\tSmall\tBrave\tOpposites are words with contrasting meanings."}
          />
          <div className="qe-import-foot2">
            <button type="button" className="qe-import-cancel" onClick={() => { setImportOpen(false); setImportText(""); }}>
              CANCEL
            </button>
            <button type="button" className="qe-import-confirm" onClick={applyImport} disabled={importPreview.questions.length === 0}>
              IMPORT {importPreview.questions.length > 0 ? `${importPreview.questions.length} QUESTIONS` : ''}
            </button>
          </div>
        </div>
      )}

      {list.length === 0 && !importOpen && (
        <div className="quiz-editor-empty">No questions yet. Add manually below or import from a spreadsheet.</div>
      )}
      {list.map((q, qi) => (
        <div key={qi} className="qe-block">
          <div className="qe-block-head">
            <span className="mono">Question {qi + 1}</span>
            <div className="qe-block-tools">
              <button type="button" onClick={() => moveQ(qi, -1)} disabled={qi === 0} title="Move up">↑</button>
              <button type="button" onClick={() => moveQ(qi, 1)} disabled={qi === list.length - 1} title="Move down">↓</button>
              <button type="button" onClick={() => removeQ(qi)} title="Delete" className="danger">×</button>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Question · 題目</label>
            <input
              value={q.q || ""}
              onChange={e => update(qi, { q: e.target.value })}
              placeholder="e.g. What does 'biology' mean?"
            />
          </div>

          <div className="field">
            <label className="field-label">Options · 選項（點圓圈設為正解）</label>
            <div className="qe-options">
              {(q.options || ["", "", "", ""]).map((opt, oi) => (
                <div key={oi} className="qe-option-row">
                  <button
                    type="button"
                    className={"qe-radio " + (q.answer === oi ? "checked" : "")}
                    onClick={() => update(qi, { answer: oi })}
                    title="Mark as correct answer"
                  >
                    {q.answer === oi && "✓"}
                  </button>
                  <span className="qe-letter mono">{String.fromCharCode(65 + oi)}</span>
                  <input
                    value={opt}
                    onChange={e => updateOption(qi, oi, e.target.value)}
                    placeholder={"Option " + String.fromCharCode(65 + oi)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Explanation · 詳解（學生交卷後會看到）</label>
            <textarea
              value={q.explain || ""}
              onChange={e => update(qi, { explain: e.target.value })}
              placeholder="說明為什麼這是正確答案，可中英文混用。"
              rows={3}
            />
          </div>
        </div>
      ))}

      <button type="button" className="qe-add" onClick={addQ}>
        + Add Question · 新增題目
      </button>
    </div>
  );
}

Object.assign(window, { QuizPlayer, QuizEditor });
