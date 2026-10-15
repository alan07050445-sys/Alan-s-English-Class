// components-mistakes.jsx — 學生錯題本 + 重練模式

var {
  useState: useMK,
  useMemo: useMKM,
  useEffect: useMKE
} = React;
function _mkShuffle(arr) {
  var a = [...arr];
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Mistake types that must NOT be flattened into synthetic multiple-choice.
// (Their "answer" is a spelling / sentence / structure, so a 4-way MC misleads.)
// Anything NOT listed here — including missing/empty/unknown legacy types whose
// answer is a real word — is treated as MC-drillable.
var MK_REVEAL_ONLY = ['spelling', 'syllable-div', 'cloze', 'essay', 'story-mountain', 'short-answer', 'writing-practice', 'word-sort', 'sentence-order', 'reading-skill' // v386: 答案是「該放哪一格」，做成四選一會誤導
];

/* ── Single wrong-question row (answer hidden until tap) ── */
function MistakeItem({
  q
}) {
  var [revealed, setRevealed] = useMK(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "mk-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-item-q"
  }, q.q), q.cat && /*#__PURE__*/React.createElement("span", {
    className: "mk-item-cat"
  }, q.cat), /*#__PURE__*/React.createElement("button", {
    className: `mk-item-answer${revealed ? ' revealed' : ''}`,
    onClick: () => setRevealed(r => !r)
  }, revealed ? `→ ${q.answer}` : '點擊查看答案'));
}

/* ── Reveal-only review row (non-MC types in the drill) ── */
/* Same reveal pattern as MistakeItem, plus a "我已複習 ✓" button that removes
   the mistake via the SAME path as the MC branch. */
function MistakeReview({
  q,
  onReviewed
}) {
  var [revealed, setRevealed] = useMK(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "mk-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-item-q"
  }, q.q), q.cat && /*#__PURE__*/React.createElement("span", {
    className: "mk-item-cat"
  }, q.cat), /*#__PURE__*/React.createElement("button", {
    className: `mk-item-answer${revealed ? ' revealed' : ''}`,
    onClick: () => setRevealed(r => !r)
  }, revealed ? `正解：${q.answer}` : '點擊查看答案'), /*#__PURE__*/React.createElement("button", {
    className: "mk-next-btn",
    style: {
      marginTop: 8
    },
    onClick: onReviewed
  }, "\u6211\u5DF2\u8907\u7FD2 \u2713"));
}

/* ── Drill mode ─────────────────────────────────────────── */
function MistakesDrill({
  questions,
  subjLabel,
  user,
  onClose,
  onAllCleared
}) {
  // Snapshot questions at mount — prevents live Firestore updates from
  // changing the question list mid-drill.
  // MC-drillable subset only (legacy/unknown types included — see MK_REVEAL_ONLY).
  var [mcQuestions] = useMK(() => {
    var mcSrc = questions.filter(q => !MK_REVEAL_ONLY.includes(q.type));
    var allAnswers = mcSrc.map(q => q.answer);
    return _mkShuffle(mcSrc.map(q => {
      // v318 (#3): 若有存原題的原始選項 → 直接用（重新洗牌變換位置），才是「原題原選項」的有效複習。
      // 只有舊資料（沒存 options）才退回下面的「同類湊題」。
      if (Array.isArray(q.options) && q.options.length >= 2 && typeof q.correct === 'number' && q.correct >= 0 && q.correct < q.options.length) {
        var ans = q.options[q.correct];
        var shuffled = _mkShuffle(q.options);
        return {
          ...q,
          options: shuffled,
          correct: shuffled.indexOf(ans)
        };
      }
      // Prefer distractors from SAME category/type siblings, so a grammar
      // item isn't offered three vocabulary words (a giveaway). Only if
      // there aren't ≥3 same-category siblings do we top up from the full pool.
      var sameCat = mcSrc.filter(o => o !== q && o.cat === q.cat && o.type === q.type && o.answer !== q.answer).map(o => o.answer);
      var pool = _mkShuffle(sameCat);
      if (pool.length < 3) {
        var rest = _mkShuffle(allAnswers.filter(a => a !== q.answer && !pool.includes(a)));
        pool = pool.concat(rest);
      }
      var distractors = pool.slice(0, 3);
      while (distractors.length < 3) distractors.push(distractors[0] || '—');
      var options = _mkShuffle([q.answer, ...distractors]);
      return {
        ...q,
        options,
        correct: options.indexOf(q.answer)
      };
    }));
  });

  // Reveal-only subset — kept unmodified, reviewed & removed one-by-one.
  var [revealItems, setRevealItems] = useMK(() => questions.filter(q => MK_REVEAL_ONLY.includes(q.type)));
  var [idx, setIdx] = useMK(0);
  var [selected, setSelected] = useMK(null);
  var [cleared, setCleared] = useMK(0);
  var [done, setDone] = useMK(false);
  var current = mcQuestions[idx];
  var handleSelect = async optIdx => {
    if (selected !== null) return;
    setSelected(optIdx);
    var correct = optIdx === current.correct;
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
  var handleNext = () => {
    if (idx < mcQuestions.length - 1) {
      setIdx(i => i + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  };

  // Reveal-only "我已複習 ✓" → same removal path as the MC branch; drop locally
  // so the reveal list (and header mistakes-count on return) updates.
  var handleReviewed = q => {
    window.playSound('correct');
    if (user?.uid) {
      window.removeWrongQuestion(user.uid, q.itemId, q.q, q.answer);
      if (window.markMistakeFixed) window.markMistakeFixed(user.uid, user.displayName || '', user.email || ''); // v465
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
    return /*#__PURE__*/React.createElement("div", {
      className: "mk-overlay"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-drill-head"
    }, subjLabel && /*#__PURE__*/React.createElement("span", {
      className: "mk-drill-subj"
    }, subjLabel), /*#__PURE__*/React.createElement("span", {
      className: "mk-drill-progress"
    }, idx + 1, " / ", mcQuestions.length), /*#__PURE__*/React.createElement("div", {
      className: "mk-drill-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-drill-bar-fill",
      style: {
        width: `${idx / mcQuestions.length * 100}%`
      }
    })), /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(window.Icon, {
      name: "close",
      size: 16
    }))), /*#__PURE__*/React.createElement("div", {
      className: "mk-drill-q"
    }, /*#__PURE__*/React.createElement("p", {
      className: "mk-drill-q-text"
    }, current.q), current.cat && /*#__PURE__*/React.createElement("span", {
      className: "mk-item-cat"
    }, current.cat)), /*#__PURE__*/React.createElement("div", {
      className: "mk-drill-options"
    }, current.options.map((opt, i) => {
      var cls = 'mk-drill-option';
      if (selected !== null) {
        if (i === current.correct) cls += ' mk-opt-correct';else if (i === selected) cls += ' mk-opt-wrong';else cls += ' mk-opt-dim';
      }
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        className: cls,
        onClick: () => handleSelect(i),
        disabled: selected !== null
      }, /*#__PURE__*/React.createElement("span", {
        className: "mk-opt-label"
      }, String.fromCharCode(65 + i)), opt);
    })), selected !== null && /*#__PURE__*/React.createElement("div", {
      className: "mk-drill-feedback"
    }, selected === current.correct ? /*#__PURE__*/React.createElement("span", {
      className: "mk-fb-correct"
    }, "\u2713 \u7B54\u5C0D\u4E86\uFF01\u5DF2\u5F9E\u932F\u984C\u672C\u79FB\u9664") : /*#__PURE__*/React.createElement("span", {
      className: "mk-fb-wrong"
    }, "\u2717 \u6B63\u78BA\u7B54\u6848\uFF1A", current.options[current.correct]), /*#__PURE__*/React.createElement("button", {
      className: "mk-next-btn",
      onClick: handleNext
    }, idx < mcQuestions.length - 1 ? '下一題 →' : revealItems.length > 0 ? '下一步 →' : '查看結果'))));
  }

  // ── 2) Reveal-only review section (訂正這些，照原本方式複習) ──
  if (revealItems.length > 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "mk-overlay"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-head"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "mk-title"
    }, "\u270D\uFE0F \u8A02\u6B63\u9019\u4E9B"), /*#__PURE__*/React.createElement("button", {
      className: "icon-btn",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(window.Icon, {
      name: "close",
      size: 16
    }))), /*#__PURE__*/React.createElement("div", {
      className: "mk-summary"
    }, mcQuestions.length > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u9078\u64C7\u984C\u7B54\u5C0D ", /*#__PURE__*/React.createElement("strong", null, cleared), " / ", mcQuestions.length, " \u984C \xB7 \u4EE5\u4E0B\u984C\u578B\u8ACB\u7167\u539F\u672C\u65B9\u5F0F\u8907\u7FD2") : /*#__PURE__*/React.createElement(React.Fragment, null, "\u4EE5\u4E0B\u984C\u578B\u4E0D\u9069\u5408\u9078\u64C7\u984C\uFF0C\u8ACB\u7167\u539F\u672C\u65B9\u5F0F\u8907\u7FD2\u5F8C\u9EDE\u300C\u6211\u5DF2\u8907\u7FD2\u300D")), /*#__PURE__*/React.createElement("div", {
      className: "mk-list"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-group"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-group-label"
    }, "\u8A02\u6B63\u9019\u4E9B\uFF08\u7167\u539F\u672C\u65B9\u5F0F\u8907\u7FD2\uFF09"), revealItems.map((q, i) => /*#__PURE__*/React.createElement(MistakeReview, {
      key: `${q.itemId}-${i}`,
      q: q,
      onReviewed: () => handleReviewed(q)
    })))), /*#__PURE__*/React.createElement("button", {
      className: "mk-drill-btn",
      onClick: onClose
    }, "\u5B8C\u6210")));
  }

  // ── 3) MC completion screen (had MC questions, no reveal items left) ──
  if (mcQuestions.length > 0) {
    var allCleared = cleared === mcQuestions.length;
    return /*#__PURE__*/React.createElement("div", {
      className: "mk-overlay"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-panel mk-panel-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-complete-icon"
    }, allCleared ? '🎯' : '💪'), /*#__PURE__*/React.createElement("h3", {
      className: "mk-complete-title"
    }, allCleared ? '全部答對！錯題本清空了！' : '重練完成！'), /*#__PURE__*/React.createElement("p", {
      className: "mk-complete-stat"
    }, "\u7B54\u5C0D ", cleared, " / ", mcQuestions.length, " \u984C", allCleared ? '' : ' · 答對的已從錯題本移除'), /*#__PURE__*/React.createElement("button", {
      className: "mk-drill-btn",
      onClick: allCleared ? onAllCleared : onClose
    }, allCleared ? '太棒了！' : '繼續加油 →')));
  }

  // ── 4) Nothing to drill (both subsets empty) — simple close ──
  return /*#__PURE__*/React.createElement("div", {
    className: "mk-overlay"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-panel mk-panel-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-complete-icon"
  }, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("h3", {
    className: "mk-complete-title"
  }, "\u932F\u984C\u672C\u6E05\u7A7A\u4E86\uFF01"), /*#__PURE__*/React.createElement("button", {
    className: "mk-drill-btn",
    onClick: onAllCleared || onClose
  }, "\u592A\u68D2\u4E86\uFF01")));
}

/* ── Main MistakesPanel ─────────────────────────────────── */
/* v465（Alan：「我覺得要加上獎勵比較合理」）：訂正一題 +1⭐，一天上限 10 顆。
   順便把這張面板的三個問題一起修掉（都是實測看出來的）：
     ① 一次丟「開始重練（18 題）」——看到數字就不想開始，而且真實學生可能累積 50+。
        → 一次只給 5 題，做完再問「還要再 5 題嗎」。可完成、有節奏。
     ② 照「週次」分，不是照「你哪裡不會」分——同一個字在聽寫、配對、填空都錯過，
        現在是三筆不相干的紀錄。→ 照**答案**歸戶，一個答案一張卡，寫清楚在哪幾種練習裡錯過。
     ③ 看不到獎勵。→ 標題寫「訂正一題 +1⭐」，今天還能拿幾顆也寫出來。 */
var MK_BATCH = 5; // 一次練幾題

/* v505（Alan：「錯題本要分成單字錯題、文法錯題，以此類推去做分類，
     不然小朋友哪會想要做，全部都擠在一起，讓小朋友知道這次的主題是什麼」）
   ⚠ 用 catId 分（不是中文名）：同一個 word 分類在 G4 叫「字彙學習」、
     在預設那份叫「字根字首」，拿中文名分會分成兩堆。
   ⚠ 對不到分類的（文法軌、總複習、已經被刪掉的單元）統一落到 '_other'，
     不要靜靜地消失——學生還是要看得到那些錯題。 */
var MK_CAT_ORDER = ['vocab', 'grammar', 'word', 'reading'];
var MK_CAT_ICO = {
  vocab: '📚',
  grammar: '✏️',
  word: '🔤',
  reading: '📖'
};
var mkSubjOf = q => q.catId || '_other';

/* 照「答案」歸戶：同一個答案在幾種練習裡錯過就併成一張卡。
   ⚠ 用 gnNorm 正規化（大小寫、標點不算差別），不然 "pursued" 和 "Pursued" 會變兩張。 */
function mkByAnswer(list) {
  var norm = t => window.gnNorm ? window.gnNorm(String(t || '')) : String(t || '').toLowerCase().trim();
  var m = new Map();
  (list || []).forEach(q => {
    var k = norm(q.answer) || '__' + q.q;
    if (!m.has(k)) m.set(k, {
      answer: q.answer,
      items: [],
      kinds: new Set(),
      weeks: new Set()
    });
    var g = m.get(k);
    g.items.push(q);
    if (q.itemTitle) g.kinds.add(window.QM_TYPE_ZH_PUBLIC ? window.QM_TYPE_ZH_PUBLIC[q.type] || q.cat : q.cat || '');
    if (q.weekLabel) g.weeks.add(q.weekLabel);
  });
  // 錯過愈多次的排前面——那才是「他真的不會」的
  return [...m.values()].sort((x, y) => y.items.length - x.items.length);
}
function MistakesPanel({
  user,
  progressItems,
  weeks,
  weekOrder,
  categories,
  fixed,
  onClose
}) {
  var [drillMode, setDrillMode] = useMK(false);
  var [drillQuestions, setDrillQuestions] = useMK(null);
  var [subj, setSubj] = useMK('all');
  var allWrong = useMKM(() => window.collectWrongQuestions(progressItems, weeks, weekOrder, categories), [progressItems, weeks, weekOrder, categories]);

  // 有錯題的科目才列出來（沒有錯的科目不該佔一個按鈕）
  var subjects = useMKM(() => {
    var m = new Map();
    allWrong.forEach(q => {
      var id = mkSubjOf(q);
      if (!m.has(id)) m.set(id, {
        id,
        label: q.cat || '其他練習',
        n: 0
      });
      m.get(id).n++;
    });
    var rank = id => {
      var i = MK_CAT_ORDER.indexOf(id);
      return i < 0 ? 99 : i;
    };
    return [...m.values()].sort((a, b) => rank(a.id) - rank(b.id) || b.n - a.n);
  }, [allWrong]);

  // 答對完某一科之後那一科會消失 → 選取要跟著回到「全部」，不然畫面會空掉
  useMKE(() => {
    if (subj !== 'all' && !subjects.some(x => x.id === subj)) setSubj('all');
  }, [subjects, subj]);
  var pool = useMKM(() => subj === 'all' ? allWrong : allWrong.filter(q => mkSubjOf(q) === subj), [allWrong, subj]);
  var sections = useMKM(() => (subj === 'all' ? subjects : subjects.filter(x => x.id === subj)).map(sec => ({
    ...sec,
    rows: mkByAnswer(allWrong.filter(q => mkSubjOf(q) === sec.id))
  })), [allWrong, subjects, subj]);
  var subjLabel = subj === 'all' ? '' : (subjects.find(x => x.id === subj) || {}).label || '';
  var perSection = subj === 'all' ? 4 : 12; // 看全部時每科只先露幾個，不要又變成一長串

  var f = window.computeFixedStars ? window.computeFixedStars(fixed) : {
    todayLeft: 0,
    todayN: 0
  };
  var perStar = window.FIX_STAR || 1;
  var startDrill = () => {
    setDrillQuestions(pool.slice(0, MK_BATCH)); // v465：一次只練 5 題；v505：只抽選到的那一科
    setDrillMode(true);
  };
  if (drillMode && drillQuestions) {
    return /*#__PURE__*/React.createElement(MistakesDrill, {
      questions: drillQuestions,
      subjLabel: subjLabel,
      user: user,
      onClose: () => {
        setDrillMode(false);
        setDrillQuestions(null);
      },
      onAllCleared: onClose
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "mk-overlay",
    onClick: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "mk-title"
  }, "\uD83D\uDCD5 \u6211\u7684\u932F\u984C"), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), allWrong.length === 0 ?
  /*#__PURE__*/
  /* Empty state */
  React.createElement("div", {
    className: "mk-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-empty-check",
    "aria-hidden": "true"
  }, "\u2713"), /*#__PURE__*/React.createElement("p", {
    className: "mk-empty-msg"
  }, "\u592A\u68D2\u4E86\uFF01\u76EE\u524D\u6C92\u6709\u932F\u984C"), /*#__PURE__*/React.createElement("p", {
    className: "mk-empty-sub"
  }, "\u7B54\u932F\u7684\u984C\u76EE\u6703\u81EA\u52D5\u6536\u9032\u4F86\uFF0C\u65B9\u4FBF\u96A8\u6642\u8907\u7FD2")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mk-summary"
  }, "\u9084\u6709 ", /*#__PURE__*/React.createElement("strong", null, allWrong.length), " \u984C\u53EF\u4EE5\u8A02\u6B63", /*#__PURE__*/React.createElement("span", {
    className: "mk-reward"
  }, "\u8A02\u6B63\u4E00\u984C ", /*#__PURE__*/React.createElement("b", null, "+", perStar, "\u2B50"), f.todayLeft > 0 ? `　今天還可以拿 ${f.todayLeft} 顆` : '　今天的已經拿滿了，明天再來 👍')), subjects.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "mk-subj"
  }, /*#__PURE__*/React.createElement("button", {
    className: 'mk-subj-chip' + (subj === 'all' ? ' on' : ''),
    onClick: () => setSubj('all')
  }, "\u5168\u90E8", /*#__PURE__*/React.createElement("i", null, allWrong.length)), subjects.map(x => /*#__PURE__*/React.createElement("button", {
    key: x.id,
    className: 'mk-subj-chip' + (subj === x.id ? ' on' : ''),
    onClick: () => setSubj(x.id)
  }, /*#__PURE__*/React.createElement("span", null, MK_CAT_ICO[x.id] || '📕'), x.label, /*#__PURE__*/React.createElement("i", null, x.n)))), /*#__PURE__*/React.createElement("div", {
    className: "mk-list"
  }, sections.map(sec => /*#__PURE__*/React.createElement("div", {
    className: "mk-sec",
    key: sec.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-sec-ico"
  }, MK_CAT_ICO[sec.id] || '📕'), /*#__PURE__*/React.createElement("b", null, sec.label), /*#__PURE__*/React.createElement("i", null, sec.n, " \u984C")), sec.rows.slice(0, perSection).map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "mk-ans"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-ans-head"
  }, /*#__PURE__*/React.createElement("b", {
    className: "mk-ans-word"
  }, g.answer || '（看題目）'), g.items.length > 1 && /*#__PURE__*/React.createElement("span", {
    className: "mk-ans-n"
  }, "\u932F\u904E ", g.items.length, " \u6B21")), /*#__PURE__*/React.createElement("div", {
    className: "mk-ans-where"
  }, [...g.weeks].slice(0, 3).join('、'), g.items.length > 1 && /*#__PURE__*/React.createElement("span", null, "\u3000\xB7\u3000", [...new Set(g.items.map(x => x.cat).filter(Boolean))].join('、'))))), sec.rows.length > perSection && /*#__PURE__*/React.createElement("button", {
    className: "mk-ans-more",
    onClick: () => setSubj(sec.id)
  }, "\u2026\u9084\u6709 ", sec.rows.length - perSection, " \u500B\uFF0C\u53EA\u770B", sec.label, " \u2192")))), /*#__PURE__*/React.createElement("button", {
    className: "mk-drill-btn",
    onClick: startDrill
  }, "\u21BB \u7DF4 ", Math.min(MK_BATCH, pool.length), " \u984C", subjLabel ? `：${subjLabel}` : '', f.todayLeft > 0 && /*#__PURE__*/React.createElement("span", {
    className: "mk-drill-star"
  }, "\u3000\u6700\u591A +", Math.min(MK_BATCH, pool.length, f.todayLeft) * perStar, "\u2B50")))));
}
Object.assign(window, {
  MistakesPanel
});