// components-editor.jsx — Editor modal for adding/editing items

var {
  useState: useS,
  useEffect: useE
} = React;

/* 🔴 v461（Alan：「所有的一鍵生成，我滑鼠點到視窗外面就直接跳出來，我剛剛打的都消失了」）
   這些是長表單（貼單字、寫特別要求、校稿逐題改），點一下背景就把人家打的東西整批丟掉，
   代價完全不對等。改成：**背景點下去不關閉**，只讓視窗輕輕晃一下，告訴你「要關請按 ✕」。
   ⚠ 一定要同時保留 ✕ 與「取消」兩個明確的出口，不然會變成關不掉。 */
function useModalNudge() {
  var [on, setOn] = useS(false);
  var t = React.useRef(null);
  React.useEffect(() => () => clearTimeout(t.current), []);
  var nudge = () => {
    setOn(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setOn(false), 420);
  };
  return [on ? ' modal-nudge' : '', nudge];
}

/* v377（Alan：「太多 item、太多沒什麼用的功能、也很亂」）
   拉了線上真實資料來看：248 個單元裡，單字卡 72／填空 53／選擇題 28／聽寫 23
   ＝ 這 4 種就佔 71%；其餘 12 種加起來只有 14 次，「圈出答案」一次都沒用過。
   → 一個都不刪（之後想用還在），但把常用的 4 種放最上面，其餘收進「更多題型」。
   zh = 中文名（原本清單一半英文一半中文，掃過去認不出來）。 */
var TYPE_COMMON = ['flashcard', 'fillblank', 'quiz', 'spelling'];
var TYPE_ZH = {
  flashcard: '單字卡',
  fillblank: '填空',
  quiz: '選擇題',
  spelling: '聽寫',
  'writing-practice': 'AI 造句批改',
  'type-answer': '打答案',
  'guided-reading': '分段閱讀',
  upload: '上傳作業',
  'short-answer': '閱讀簡答',
  cloze: '段落填空',
  'def-match': '配對連線',
  lesson: '教學卡',
  'reading-skill': '閱讀技巧',
  essay: '意見文寫作',
  'syllable-div': '切音節',
  'word-sort': '分類排序',
  'story-mountain': '故事山脈',
  'circle-answer': '圈出答案',
  'sentence-order': '排順序',
  // v462 ①
  exam: '模擬考卷' // v515 📄
};
var TYPE_OPTIONS = [{
  id: "quiz",
  label: "Quiz",
  hint: "Build a multiple-choice quiz with explanations"
}, {
  id: "flashcard",
  label: "Flashcard",
  hint: "自製單字卡組 — 支援圖片搜尋、匯入、三種練習模式"
}, {
  id: "fillblank",
  label: "Fill Blank",
  hint: "填空題 — 自訂句子填空，支援主題換色"
}, {
  id: "writing-practice",
  label: "Writing Practice",
  hint: "✍ AI 造句批改 — 學生逐題造句，AI 給星評分"
}, {
  id: "type-answer",
  label: "Type Answer",
  hint: "⌨ 看提示打答案 — 例：base form → past tense，老師自訂題目與答案"
}, {
  id: "spelling",
  label: "Spelling 聽寫",
  hint: "🔊 聽單字拼出來 — 匯入單字清單，學生聽發音自己拼字，自動批改"
}, {
  id: "short-answer",
  label: "Short Answer",
  hint: "📖 閱讀理解短答題 — 貼文章，學生逐題打字回答，AI 批改 0–3 星"
}, {
  id: "guided-reading",
  label: "分段閱讀 📖",
  hint: "📖 分段閱讀 — 匯入掃描 PDF（每頁一段）／上傳照片／貼文字，✂ 可自動裁切分段；長文切小段、每讀完一小段馬上答題（選擇＋簡答），小朋友不放空；短文一段搞定。"
}, {
  id: "syllable-div",
  label: "Syllable Cut",
  hint: "✂️ 切音節練習 — 輸入單字與切法，學生點擊字母縫隙自己切，系統自動批改"
}, {
  id: "word-sort",
  label: "Word Sort",
  hint: "🗂 分類排序 — 設定分類欄位，學生把單字拖進正確欄位，系統自動批改"
}, {
  id: "essay",
  label: "Opinion Essay",
  hint: "✍ 意見文寫作 — 學生寫 opinion essay，AI 依照 7 項標準批改（Claim / Reasons / Examples / Explanation / Conclusion / Organization / Grammar）"
}, {
  id: "story-mountain",
  label: "Story Mountain",
  hint: "🏔 故事山脈 — 逐步填寫 Introduction → Rising Action → Climax → Falling Action → Resolution，AI 批改結構與文法（10 分制）"
}, {
  id: "cloze",
  label: "Cloze Test",
  hint: "📝 段落填空 — 貼入完整文章，用 [答案] 或 [答案](提示) 標記空格，學生一次看整段填空並打字作答"
}, {
  id: "circle-answer",
  label: "Circle Answer",
  hint: "⭕ 圈出答案 — 學生點選句子中的正確單字，可選擇再回答分類題"
}, {
  id: "sentence-order",
  label: "Sentence Order",
  hint: "🧩 排順序 — 一句話打散成字塊，學生點成正確順序；語序類文法（疑問句、形容詞順序）用這個練最直接"
}, {
  id: "exam",
  label: "Exam Paper",
  hint: "📄 模擬考卷 — 把圈選／Word Bank 填空／選擇題／問答串成一份有配分的卷子；交卷才給分，格式照康橋 Formative"
}, {
  id: "def-match",
  label: "配對連線 🔗",
  hint: "🔗 配對連線 — 左邊單字、右邊解釋（自動打亂），學生點一點連起來，系統自動批改"
}, {
  id: "lesson",
  label: "教學卡 📘",
  hint: "📘 教學卡 — 單元開頭的「先教再練」：這是什麼／什麼時候用／形式表／常見錯誤／老師示範／小試身手"
}, {
  id: "reading-skill",
  label: "閱讀技巧 🔍",
  hint: "🔍 閱讀技巧 — 學校會考的 Cause & Effect／Problem & Solution／Sequencing／Compare & Contrast（Venn 圖）。點一下卡片、再點格子放進去，自動批改。"
}, {
  id: "upload",
  label: "上傳作業 📎",
  hint: "📎 紙本作業拍照上傳 — 學生拍照繳交（可多張），老師在後台看照片打分數"
}];

/* ══ v447（Alan：「living in deserts 的分段不見了」）═══════════════════════════
   查線上資料的結果：那一份從來沒有寫進雲端（G3 的 class/data 自 9/11 起就沒被寫過），
   但 Storage 裡留著三組沒人認領的課文照片（9/14 兩組各 11 張、9/15 一組 9 張）——
   也就是「照片都上傳好了、單元卻還沒存」就不見了（重新整理、當掉、或不小心關掉）。
   ⚠ 照片是一上傳就進 Storage，編輯中的段落／題目卻只活在記憶體裡。
   這裡補上「邊改邊留底」：每次改動都寫進 localStorage，下次打開同一週的編輯器時問他要不要接回來。 */
var ED_DRAFT_PREFIX = 'alan-edraft:';
var ED_DRAFT_KEEP_MS = 14 * 24 * 3600 * 1000;
var edDraftKey = (weekId, id) => ED_DRAFT_PREFIX + (weekId || '?') + ':' + (id || 'new');
/* 有沒有東西值得留（空白的新單元不要留底，不然下次會被問「上次有一份沒存到」但裡面什麼都沒有） */
function edDraftHasContent(form) {
  if (!form) return false;
  if (String(form.title || '').trim()) return true;
  return ['grSegments', 'grFinal', 'cards', 'questions', 'pairs', 'saQuestions', 'spellWords', 'defPairs', 'circleQuestions', 'sortWords', 'sdWords', 'steps', 'writingPrompts', 'orderQuestions', 'sections', 'examMood', 'examKicker'] // v515 📄 模擬考卷
  .some(k => Array.isArray(form[k]) && form[k].length > 0) || !!String(form.passage || form.essayPrompt || form.smPrompt || '').trim();
}
function edDraftSave(weekId, form) {
  try {
    if (!form || !form.id) return;
    if (!edDraftHasContent(form)) {
      localStorage.removeItem(edDraftKey(weekId, form.id));
      return;
    }
    var body = JSON.stringify({
      t: Date.now(),
      weekId,
      form
    });
    if (body.length > 2000000) return; // 太大就不留（localStorage 會直接爆掉）
    localStorage.setItem(edDraftKey(weekId, form.id), body);
  } catch (e) {/* 無痕模式／容量滿了：留不了底就算了，不能影響編輯 */}
}
function edDraftClear(weekId, id) {
  try {
    localStorage.removeItem(edDraftKey(weekId, id));
  } catch (e) {}
}
/* 找「這一週還沒存成功」的草稿：id 已經在這一週的單元裡＝存過了，不要再問。 */
function edDraftFind(weekId, existingIds, type) {
  var out = [];
  try {
    var have = new Set(existingIds || []);
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(ED_DRAFT_PREFIX) !== 0) continue;
      var d = null;
      try {
        d = JSON.parse(localStorage.getItem(k));
      } catch (e) {
        continue;
      }
      if (!d || !d.form || !d.form.id) continue;
      if (Date.now() - (d.t || 0) > ED_DRAFT_KEEP_MS) {
        localStorage.removeItem(k);
        i--;
        continue;
      }
      if (d.weekId !== weekId) continue;
      if (have.has(d.form.id)) {
        localStorage.removeItem(k);
        i--;
        continue;
      } // 已經存進去了
      if (type && d.form.type !== type) continue;
      out.push(d);
    }
  } catch (e) {}
  return out.sort((a, b) => (b.t || 0) - (a.t || 0));
}
/* 草稿裡有多少東西——講給老師聽的那一句（「11 段課文・8 題」） */
function edDraftSummary(form) {
  var bits = [];
  var n = a => Array.isArray(a) ? a.length : 0;
  if (n(form.grSegments)) bits.push(`${n(form.grSegments)} 段課文`);
  if (n(form.cards)) bits.push(`${n(form.cards)} 張單字卡`);
  if (n(form.questions)) bits.push(`${n(form.questions)} 題`);
  if (n(form.pairs)) bits.push(`${n(form.pairs)} 題`);
  if (n(form.saQuestions)) bits.push(`${n(form.saQuestions)} 題簡答`);
  if (n(form.spellWords)) bits.push(`${n(form.spellWords)} 個聽寫`);
  if (n(form.defPairs)) bits.push(`${n(form.defPairs)} 組配對`);
  if (n(form.grFinal)) bits.push(`${n(form.grFinal)} 題總結`);
  if (n(form.circleQuestions)) bits.push(`${n(form.circleQuestions)} 題找出來`);
  if (n(form.sortWords)) bits.push(`${n(form.sortWords)} 個分類`);
  return bits.join('・') || '還沒有題目';
}
function EditorModal({
  open,
  draft,
  weekId,
  catItems,
  weekItems,
  groupOptions,
  onClose,
  onSave,
  onDelete
}) {
  var [form, setForm] = useS(draft);
  var [moreTypes, setMoreTypes] = useS(false);
  /* v540 📋 貼上整份考卷：null＝沒打開，否則 { text, res } */
  var [pastePaper, setPastePaper] = useS(null);
  /* v447：沒存到的編輯，下次打開時接回來 */
  var [recover, setRecover] = useS(null);
  useE(() => {
    if (!open || !draft) {
      setRecover(null);
      return;
    }
    var ids = (weekItems || []).map(x => x && x.id);
    var found = edDraftFind(weekId, ids, draft.type).filter(d => d.form.id !== draft.id);
    setRecover(found[0] || null);
  }, [open, draft && draft.id]);
  useE(() => {
    if (!open || !form) return;
    var t = setTimeout(() => edDraftSave(weekId, form), 700); // 邊改邊留底（慢一點寫，不要每個鍵盤事件都寫）
    return () => clearTimeout(t);
  }, [form, open]);
  useE(() => {
    setForm(draft);
  }, [draft]);
  // 編輯既有單元、而且它不是那 4 種常用題型 → 直接把「更多題型」展開，不然會找不到自己
  useE(() => {
    if (draft && draft.type && TYPE_COMMON.indexOf(draft.type) < 0) setMoreTypes(true);
  }, [draft && draft.type]);
  if (!open || !form) return null;
  var isNew = !!form._isNew;
  var meta = TYPE_OPTIONS.find(t => t.id === form.type) || TYPE_OPTIONS[0];
  var update = (k, v) => setForm(prev => ({
    ...prev,
    [k]: v
  }));
  var extractSrc = raw => {
    if (!raw) return raw;
    var m = raw.match(/src\s*=\s*["']([^"']+)["']/i);
    return m ? m[1] : raw;
  };
  var updateEmbed = v => update("embed", extractSrc(v.trim()));
  var handleSave = () => {
    if (!form.title?.trim()) {
      alert("Please enter a title");
      return;
    }
    // v260: 空單元防呆——存檔時 0 題（學生頁不會顯示），先問一聲；upload 例外（本身就是任務）
    if (form.type !== 'upload' && window.getQuizItems && window.getQuizItems([form]).length === 0) {
      if (!window.confirm('⚠ 這個單元目前是 0 題，儲存後學生頁「不會顯示」它。\n\n（題目清單會標「⚠ 沒有題目」提醒你補題）\n\n仍要儲存嗎？')) return;
    }
    edDraftClear(weekId, form.id); // v447：存出去了就不用留底了
    onSave(form);
  };
  return (
    /*#__PURE__*/
    // v261: 點到編輯器外面「不再」直接關閉——出到一半的題目會全部不見（Alan 踩過）。
    // 要離開請按右上 ✕ 或 Cancel。
    React.createElement("div", {
      className: "modal-backdrop"
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal " + (form.type === "quiz" || form.type === "flashcard" || form.type === "fillblank" || form.type === "type-answer" || form.type === "spelling" || form.type === "cloze" || form.type === "circle-answer" || form.type === "guided-reading" || form.type === "def-match" || form.type === "reading-skill" ? "wide" : ""),
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal-head"
    }, /*#__PURE__*/React.createElement("h3", null, isNew ? "Add" : "Edit", " ", /*#__PURE__*/React.createElement("em", null, "item")), /*#__PURE__*/React.createElement("button", {
      className: "modal-close",
      "aria-label": "\u95DC\u9589",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "close",
      size: 14
    }))), /*#__PURE__*/React.createElement("div", {
      className: "modal-body"
    }, recover && /*#__PURE__*/React.createElement("div", {
      className: "ed-recover"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ed-recover-tx"
    }, /*#__PURE__*/React.createElement("b", null, "\u26A0 \u4E0A\u6B21\u6709\u4E00\u4EFD\u300C", TYPE_ZH[recover.form.type] || recover.form.type, "\u300D\u6C92\u6709\u5B58\u5230"), /*#__PURE__*/React.createElement("span", null, recover.form.title || '（沒有標題）', " \xB7 ", edDraftSummary(recover.form), " \xB7 ", new Date(recover.t).toLocaleString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "btn primary",
      onClick: () => {
        setForm({
          ...recover.form,
          _isNew: true
        });
        setRecover(null);
      }
    }, "\u63A5\u56DE\u4F86\u7E7C\u7E8C\u6539"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "btn ghost",
      onClick: () => {
        edDraftClear(recover.weekId, recover.form.id);
        setRecover(null);
      }
    }, "\u4E0D\u8981\u4E86")), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u984C\u578B"), /*#__PURE__*/React.createElement("div", {
      className: "type-picker"
    }, TYPE_OPTIONS.filter(o => TYPE_COMMON.indexOf(o.id) >= 0).sort((a, b) => TYPE_COMMON.indexOf(a.id) - TYPE_COMMON.indexOf(b.id)).map(opt => /*#__PURE__*/React.createElement("button", {
      key: opt.id,
      className: 'tp-big' + (form.type === opt.id ? " active" : ""),
      onClick: () => update("type", opt.id)
    }, TYPE_ZH[opt.id] || opt.label))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "tp-more-toggle",
      onClick: () => setMoreTypes(v => !v)
    }, moreTypes ? '▾ 收起其他題型' : '▸ 更多題型（12 種）'), moreTypes && /*#__PURE__*/React.createElement("div", {
      className: "type-picker tp-more"
    }, TYPE_OPTIONS.filter(o => TYPE_COMMON.indexOf(o.id) < 0).map(opt => /*#__PURE__*/React.createElement("button", {
      key: opt.id,
      className: form.type === opt.id ? "active" : "",
      onClick: () => update("type", opt.id)
    }, TYPE_ZH[opt.id] || opt.label))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, meta.hint)), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Title \xB7 \u82F1\u6587\u6A19\u984C"), /*#__PURE__*/React.createElement("input", {
      value: form.title || "",
      onChange: e => update("title", e.target.value),
      placeholder: "e.g. Animals & Habitats \u2014 Set A"
    })), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u4E2D\u6587\u8AAA\u660E"), /*#__PURE__*/React.createElement("input", {
      value: form.zh || "",
      onChange: e => update("zh", e.target.value),
      placeholder: "\u4F8B\uFF1A20 \u500B\u672C\u9031\u6838\u5FC3\u55AE\u5B57"
    })), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u5206\u7D44 \xB7 Group\uFF08\u6587\u7AE0\u540D\uFF0C\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("input", {
      value: form.group || "",
      onChange: e => update("group", e.target.value),
      placeholder: "\u4F8B\uFF1AEmotional Blackmail \u2014 \u540C\u7D44\u55AE\u5143\u6703\u6536\u5728\u4E00\u8D77",
      list: "qm-group-datalist"
    }), /*#__PURE__*/React.createElement("datalist", {
      id: "qm-group-datalist"
    }, (groupOptions && groupOptions.length ? groupOptions : Array.from(new Set((catItems || []).map(it => String(it.group || '').trim()).filter(Boolean)))).map(g => /*#__PURE__*/React.createElement("option", {
      key: g,
      value: g
    }))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u5B78\u751F\u4EFB\u52D9\u6E05\u55AE\u8207\u984C\u5EAB\u5074\u6B04\u6703\u4F9D\u9019\u500B\u540D\u5B57\u5206\u7D44\uFF1B\u7559\u7A7A\uFF1D\u4F9D\u6A19\u984C\u81EA\u52D5\u6B78\u6236\u3002", groupOptions && groupOptions.length ? `（目前只列出這位學生的 ${groupOptions.length} 組）` : '')), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Duration \xB7 \u9810\u4F30\u6642\u9577"), /*#__PURE__*/React.createElement("input", {
      value: form.duration || "",
      onChange: e => update("duration", e.target.value),
      placeholder: "e.g. 15 min"
    })), form.type === "flashcard" ? /*#__PURE__*/React.createElement(window.FlashcardEditor, {
      cards: form.cards || [],
      onChange: cards => update("cards", cards)
    }) : form.type === "fillblank" ? /*#__PURE__*/React.createElement(React.Fragment, null, (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0).length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Linked Flashcard \xB7 \u7D81\u5B9A\u55AE\u5B57\u5361"), /*#__PURE__*/React.createElement("select", {
      value: form.linkedFlashcardId || "",
      onChange: e => update("linkedFlashcardId", e.target.value || undefined),
      style: {
        width: "100%",
        padding: "9px 12px",
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: "var(--ink)",
        borderRadius: 2,
        fontSize: 14
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 \u4E0D\u7D81\u5B9A (None) \u2014"), (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0).map(fc => /*#__PURE__*/React.createElement("option", {
      key: fc.id,
      value: fc.id
    }, fc.title, " (", (fc.cards || []).length, " \u5F35)"))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u5B78\u751F\u9032\u5165\u6E2C\u9A57\u524D\u6703\u76F4\u63A5\u770B\u5230\u9019\u7D44\u55AE\u5B57\u5361\uFF0C\u4E0D\u7528\u81EA\u5DF1\u9078\u3002")), /*#__PURE__*/React.createElement(window.FillBlankEditor, {
      questions: form.questions || [],
      onChange: questions => update("questions", questions)
    })) : form.type === "writing-practice" ? /*#__PURE__*/React.createElement(WritingPracticeEditor, {
      catItems: catItems || [],
      linkedFlashcardId: form.linkedFlashcardId || '',
      prompts: form.writingPrompts || [],
      onChangeLinkedFlashcardId: v => update("linkedFlashcardId", v || undefined),
      onChangePrompts: prompts => update("writingPrompts", prompts)
    }) : form.type === "spelling" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "toggle-row"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.spellShowZh !== false,
      onChange: e => update("spellShowZh", e.target.checked)
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\u986F\u793A\u4E2D\u6587\u63D0\u793A \xB7 \u807D\u5BEB\u6642\u540C\u6642\u986F\u793A\u4E2D\u6587\u610F\u601D"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        color: "var(--ink-muted)",
        fontSize: 12,
        marginTop: 2
      }
    }, "\u95DC\u9589\uFF1D\u7D14\u807D\u529B\u62FC\u5BEB\uFF0C\u96E3\u5EA6\u66F4\u9AD8\u3002")))), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Words \xB7 \u807D\u5BEB\u55AE\u5B57"), /*#__PURE__*/React.createElement(SpellingEditor, {
      words: form.spellWords || [],
      onChange: ws => update("spellWords", ws)
    }))) : form.type === "type-answer" ? /*#__PURE__*/React.createElement(TypeAnswerEditor, {
      pairs: form.pairs || [],
      instruction: form.instruction || '',
      onChangePairs: pairs => update("pairs", pairs),
      onChangeInstruction: v => update("instruction", v)
    }) : form.type === "upload" ?
    /*#__PURE__*/
    /* v263: 上傳作業——只需要一段給學生看的說明 */
    React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u4F5C\u696D\u8AAA\u660E \xB7 Instruction"), /*#__PURE__*/React.createElement("textarea", {
      value: form.instruction || "",
      onChange: e => update("instruction", e.target.value),
      rows: 4,
      placeholder: "例：完成講義 p.12–13，寫完整頁拍照上傳（字要拍清楚喔！）",
      style: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        color: 'var(--ink)',
        borderRadius: 4,
        fontSize: 14,
        fontFamily: 'inherit',
        resize: 'vertical',
        boxSizing: 'border-box',
        lineHeight: 1.6
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u5B78\u751F\u6703\u5728\u4E0A\u50B3\u9801\u770B\u5230\u9019\u6BB5\u8AAA\u660E\uFF0C\u62CD\u7167\uFF08\u53EF\u591A\u5F35\uFF09\u9001\u51FA\u5F8C\u4F60\u5C31\u80FD\u5728\u5F8C\u53F0\u300C\u5B78\u751F\u8A73\u60C5\u300D\u770B\u7167\u7247\u3001\u6253\u5206\u6578\u3002 \u622A\u6B62\u65E5\u4E00\u6A23\u7528\u984C\u76EE\u6E05\u55AE\u4E0A\u7684 \uD83D\uDCCC \u8A2D\u5B9A\u3002")) : form.type === "guided-reading" ? /*#__PURE__*/React.createElement(GuidedReadingEditor, {
      itemId: form.id,
      itemTitle: form.title || '',
      itemGroup: form.group || ''
      /* v407：AI 出題若順便做了「閱讀技巧」，它是另一個型別的單元、
         塞不進分段閱讀的資料結構 → 掛在 __side，存檔時由 app.jsx 一起建立。 */,
      onSideItems: items => update("__side", items),
      sideItems: form.__side || []
      /* v437：分段閱讀也可以先教背景知識——鎖用的是 requires（跟單字卡的鎖是兩回事，可以並存） */,
      requiresId: form.requires || '',
      onChangeRequires: v => update("requires", v || undefined),
      catItems: catItems || [],
      weekItems: weekItems || [],
      linkedFlashcardId: form.linkedFlashcardId || '',
      onChangeLinked: v => update("linkedFlashcardId", v || undefined),
      linkedFcRequired: !!form.linkedFcRequired,
      onChangeRequired: v => update("linkedFcRequired", v || undefined),
      audioUrl: form.grAudioUrl || '',
      onChangeAudio: v => update("grAudioUrl", v || undefined),
      segments: form.grSegments || [],
      onChange: segs => update("grSegments", segs),
      finalQs: form.grFinal || [],
      onChangeFinal: qs => update("grFinal", qs)
    }) : form.type === "short-answer" ? /*#__PURE__*/React.createElement(ShortAnswerEditor, {
      passage: form.passage || '',
      questions: form.saQuestions || [],
      saYoutube: form.saYoutube || '',
      onChangePassage: v => update("passage", v),
      onChangeQuestions: qs => update("saQuestions", qs),
      onChangeSaYoutube: v => update("saYoutube", v)
    }) : form.type === "syllable-div" ? /*#__PURE__*/React.createElement(SyllableDivEditor, {
      words: form.sdWords || [],
      onChangeWords: ws => update("sdWords", ws)
    }) : form.type === "def-match" ? /*#__PURE__*/React.createElement(DefMatchEditor, {
      pairs: form.defPairs || [],
      onChangePairs: ps => update("defPairs", ps)
    }) : form.type === "word-sort" ? /*#__PURE__*/React.createElement(WordSortEditor, {
      categories: form.sortCategories || [],
      words: form.sortWords || [],
      suffixMode: !!form.sortSuffixMode,
      onChangeCategories: cats => update("sortCategories", cats),
      onChangeWords: ws => update("sortWords", ws),
      onChangeSuffixMode: v => update("sortSuffixMode", v)
    }) : form.type === "essay" ? /*#__PURE__*/React.createElement(EssayEditor, {
      prompt: form.essayPrompt || '',
      scaffold: form.essayScaffold || '',
      onChangePrompt: v => update("essayPrompt", v),
      onChangeScaffold: v => update("essayScaffold", v)
    }) : form.type === "cloze" ? /*#__PURE__*/React.createElement(ClozeEditor, {
      passage: form.passage || '',
      onChangePassage: v => update("passage", v),
      wordBank: form.wordBank || [],
      onChangeWordBank: v => update("wordBank", v && v.length ? v : undefined)
    }) : form.type === "exam" ? (
    /* ══ 📄 v515 模擬考卷 ══════════════════════════════════════════
       沿用站上其他編輯器的習慣：一行一筆的純文字，老師可以直接貼、直接改，
       不用面對一堆巢狀表單。格式說明寫在每個框底下。
       ⚠ 真正好用的出卷方式是「📸 拍照變考卷」（下一版），這裡是手改與校稿。 */
    (() => {
      var secs = form.sections || [];
      var setSecs = next => update('sections', next);
      var patchPart = (si, pi, patch) => setSecs(secs.map((sc, i) => i !== si ? sc : {
        ...sc,
        parts: (sc.parts || []).map((pt, k) => k !== pi ? pt : {
          ...pt,
          ...patch
        })
      }));
      var T = window.examTotals ? window.examTotals(form) : {
        total: 0,
        auto: 0,
        manual: 0
      };
      var warns = window.examWarnings ? window.examWarnings(form) : [];
      var HINT = {
        circle: '第一行＝要圈什麼（vce／team／digraph／suffix:-ing），第二行以後＝短文',
        cloze: '第一行＝詞庫（逗號分隔）；之後每行＝ 句子（用 ___ 當空格） | 答案',
        quiz: '每行＝ 題目 | 選項1 | 選項2 | 選項3 | 正解編號（從 1 算）。⚠ 不用自己加題號，畫面會自己編。',
        short: '每行＝ 題目 | 配分 | 評分重點（可省略）。這一種不自動給分——' + '勾「三項評分」就照 Explanation／Relevant／Effort 在後台改，AI 會先給建議。',
        affix: '一行就是字尾表，空白分開：-ing -ed -s -est（字首寫成 un- 這種）。上面的「個」＝要造幾個字。',
        genq: '貼文章。學生要自己出「文章上沒有」的問題。上面的「個」＝要出幾個問題。',
        storymap: '貼文章。學生要填開頭／中間／結尾三格。上面的「個」＝每一格寫幾句。',
        usewords: '一行就是詞庫，空白或逗號分開：extreme protect shelter。上面的「個」＝要造幾個句子。',
        /* ══ v538 ══ */
        fixbox: '第一行＝改好的那幾個字（逗號分開）：Taipei, I, Monday, English, May。' + '空一行，再貼那一段文章。格子數＝答案的個數，大小寫要寫對才算對。',
        evidence: '第一行＝要問的問題（Why can penguins live in the cold?）。' + '空一行，再貼那篇文章。上面的「個」＝要寫幾個細節，每一個都要引用文章裡的話。',
        essay: '第一行（到空行為止）＝寫作題目。空一行，下一行＝這一課的單字（逗號分開，要他用進去）。' + '上面的「段／句」＝要幾段、每段幾句。這一種老師改，勾 Rubric 選「康橋寫作七項」。',
        checkin: '一行一個目標，學生自己勾。留空就用預設的三個。這一種不計分，配分填 0。'
      };
      return /*#__PURE__*/React.createElement("div", {
        className: "field"
      }, /*#__PURE__*/React.createElement("div", {
        className: "exed-top"
      }, /*#__PURE__*/React.createElement("label", {
        className: "exed-chk"
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: !!form.examMood,
        onChange: e => update('examMood', e.target.checked)
      }), "\u958B\u982D\u653E\u300C\u4ECA\u5929\u5FC3\u60C5\uFF0F\u9019\u6B21\u7684\u76EE\u6A19\u300D\uFF08\u5B78\u6821\u5377\u5B50\u4E0A\u5C31\u6709\uFF09"), /*#__PURE__*/React.createElement("span", {
        className: "exed-sp"
      }), /*#__PURE__*/React.createElement("button", {
        className: "exed-paste-btn",
        onClick: () => setPastePaper(p => p ? null : {
          text: '',
          res: null
        })
      }, "\uD83D\uDCCB \u8CBC\u4E0A\u6574\u4EFD\u8003\u5377"), /*#__PURE__*/React.createElement("span", {
        className: 'exed-total' + (T.total === 100 ? ' ok' : '')
      }, "\u5408\u8A08 ", T.total, " \u5206\uFF08\u81EA\u52D5 ", T.auto, "\uFF0F\u8001\u5E2B\u6539 ", T.manual, "\uFF09")), pastePaper && /*#__PURE__*/React.createElement("div", {
        className: "exed-paste"
      }, /*#__PURE__*/React.createElement("textarea", {
        rows: 6,
        value: pastePaper.text,
        placeholder: "\u628A\u6574\u4EFD\u8003\u5377\u7684\u8CC7\u6599\u8CBC\u9032\u4F86\uFF08\u524D\u5F8C\u9ECF\u8457\u8AAA\u660E\u6587\u5B57\u6216 ``` \u570D\u6B04\u90FD\u6C92\u95DC\u4FC2\uFF09",
        onChange: e => {
          var text = e.target.value;
          var res = text.trim() && window.examPaperFromText ? window.examPaperFromText(text) : null;
          setPastePaper({
            text,
            res
          });
        }
      }), pastePaper.res && pastePaper.res.error && /*#__PURE__*/React.createElement("div", {
        className: "exed-paste-bad"
      }, "\u2717 ", pastePaper.res.error), pastePaper.res && !pastePaper.res.error && (() => {
        var r = pastePaper.res;
        var tot = window.examTotals ? window.examTotals(r.item) : {
          total: 0
        };
        return /*#__PURE__*/React.createElement("div", {
          className: "exed-paste-ok"
        }, /*#__PURE__*/React.createElement("b", null, "\u8B80\u5230 ", r.sections.length, " \u500B Section\u3001", r.n, " \u5927\u984C\uFF0C\u5408\u8A08 ", tot.total, " \u5206"), /*#__PURE__*/React.createElement("ul", null, r.sections.map((sc, i) => /*#__PURE__*/React.createElement("li", {
          key: i
        }, sc.name, "\uFF08", sc.pct, "%\uFF09\uFF1A", sc.parts.map(pt => (window.EXAM_KINDS[pt.kind] || {}).zh).join('、')))), r.skipped.length > 0 && /*#__PURE__*/React.createElement("div", {
          className: "exed-paste-skip"
        }, "\u26A0 \u9019\u5E7E\u984C\u6C92\u6536\u9032\u4F86\uFF1A", r.skipped.map((x, i) => /*#__PURE__*/React.createElement("span", {
          key: i
        }, x))), r.warnings.length > 0 && /*#__PURE__*/React.createElement("div", {
          className: "exed-paste-skip"
        }, "\u26A0 ", r.warnings.join('　')), /*#__PURE__*/React.createElement("div", {
          className: "exed-paste-go"
        }, /*#__PURE__*/React.createElement("button", {
          onClick: () => {
            if (secs.length && !confirm(`現在這份卷子已經有 ${secs.length} 個 Section，要全部換成貼上的嗎？`)) return;
            setSecs(r.sections);
            if (r.title && !String(form.title || '').trim()) update('title', r.title);
            if (r.examKicker) update('examKicker', r.examKicker);
            setPastePaper(null);
          }
        }, secs.length ? '換成這一份' : '就用這一份'), secs.length > 0 && /*#__PURE__*/React.createElement("button", {
          className: "ghost",
          onClick: () => {
            setSecs(secs.concat(r.sections));
            setPastePaper(null);
          }
        }, "\u63A5\u5728\u5F8C\u9762"), /*#__PURE__*/React.createElement("button", {
          className: "ghost",
          onClick: () => setPastePaper(null)
        }, "\u53D6\u6D88")));
      })()), warns.length > 0 && /*#__PURE__*/React.createElement("div", {
        className: "exed-warn"
      }, warns.map((w, i) => /*#__PURE__*/React.createElement("div", {
        key: i
      }, "\u26A0 ", w))), secs.map((sc, si) => /*#__PURE__*/React.createElement("div", {
        className: "exed-sec",
        key: si
      }, /*#__PURE__*/React.createElement("div", {
        className: "exed-sec-h"
      }, /*#__PURE__*/React.createElement("input", {
        value: sc.name || '',
        placeholder: "Section 1: Word Study",
        onChange: e => setSecs(secs.map((x, i) => i === si ? {
          ...x,
          name: e.target.value
        } : x))
      }), /*#__PURE__*/React.createElement("input", {
        className: "exed-pct",
        type: "number",
        value: sc.pct || '',
        placeholder: "30",
        onChange: e => setSecs(secs.map((x, i) => i === si ? {
          ...x,
          pct: +e.target.value || 0
        } : x))
      }), /*#__PURE__*/React.createElement("span", null, "%"), /*#__PURE__*/React.createElement("button", {
        className: "exed-x",
        title: "\u522A\u6389\u9019\u4E00\u5340",
        onClick: () => {
          if (confirm('刪掉這一區？')) setSecs(secs.filter((_, i) => i !== si));
        }
      }, "\u2715")), (sc.parts || []).map((pt, pi) => /*#__PURE__*/React.createElement("div", {
        className: "exed-part",
        key: pi
      }, /*#__PURE__*/React.createElement("div", {
        className: "exed-part-h"
      }, /*#__PURE__*/React.createElement("select", {
        value: pt.kind,
        onChange: e => patchPart(si, pi, {
          kind: e.target.value
        })
      }, Object.keys(window.EXAM_KINDS || {}).map(k => /*#__PURE__*/React.createElement("option", {
        key: k,
        value: k
      }, window.EXAM_KINDS[k].zh))), /*#__PURE__*/React.createElement("input", {
        value: pt.title || '',
        placeholder: "Part 2: Read and Circle 10 -VCe words",
        onChange: e => patchPart(si, pi, {
          title: e.target.value
        })
      }), /*#__PURE__*/React.createElement("input", {
        className: "exed-pts",
        type: "number",
        value: pt.pts || '',
        placeholder: "20",
        onChange: e => patchPart(si, pi, {
          pts: +e.target.value || 0
        })
      }), /*#__PURE__*/React.createElement("span", null, "\u5206"), (pt.kind === 'short' || pt.kind === 'essay') && /*#__PURE__*/React.createElement("label", {
        className: "exed-chk exed-rub"
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: !!pt.rubricMax,
        onChange: e => patchPart(si, pi, {
          rubricMax: e.target.checked ? window.EXAM_RUBRIC_MAX || 4 : 0,
          rubricSet: e.target.checked ? pt.rubricSet || 'basic' : ''
        })
      }), /*#__PURE__*/React.createElement("span", null, "Rubric"), !!pt.rubricMax && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("select", {
        value: pt.rubricSet || 'basic',
        onChange: e => {
          var k = e.target.value;
          var set = (window.EXAM_RUBRIC_SETS || {})[k] || {};
          patchPart(si, pi, {
            rubricSet: k,
            rubricMax: set.max || 4
          });
        }
      }, Object.keys(window.EXAM_RUBRIC_SETS || {}).map(k => /*#__PURE__*/React.createElement("option", {
        key: k,
        value: k
      }, window.EXAM_RUBRIC_SETS[k].zh))), /*#__PURE__*/React.createElement("input", {
        className: "exed-pts",
        type: "number",
        min: "1",
        max: "10",
        value: pt.rubricMax,
        onChange: e => patchPart(si, pi, {
          rubricMax: Math.max(1, +e.target.value || 1)
        })
      }), /*#__PURE__*/React.createElement("span", null, "\u5206\u6EFF"))), (pt.kind === 'affix' || pt.kind === 'usewords' || pt.kind === 'storymap' || pt.kind === 'evidence') && /*#__PURE__*/React.createElement("label", {
        className: "exed-chk exed-rub"
      }, /*#__PURE__*/React.createElement("input", {
        className: "exed-pts",
        type: "number",
        min: "1",
        max: "30",
        value: pt.minWords || '',
        placeholder: pt.kind === 'usewords' ? '6' : pt.kind === 'evidence' ? '5' : '4',
        onChange: e => patchPart(si, pi, {
          minWords: +e.target.value || 0
        })
      }), /*#__PURE__*/React.createElement("span", null, "\u5B57\u4EE5\u4E0A")), pt.kind === 'essay' && /*#__PURE__*/React.createElement("label", {
        className: "exed-chk exed-rub"
      }, /*#__PURE__*/React.createElement("input", {
        className: "exed-pts",
        type: "number",
        min: "1",
        max: "12",
        value: pt.paras || '',
        placeholder: "5",
        onChange: e => patchPart(si, pi, {
          paras: +e.target.value || 0
        })
      }), /*#__PURE__*/React.createElement("span", null, "\u6BB5 \xD7"), /*#__PURE__*/React.createElement("input", {
        className: "exed-pts",
        type: "number",
        min: "1",
        max: "12",
        value: pt.sentsPerPara || '',
        placeholder: "4",
        onChange: e => patchPart(si, pi, {
          sentsPerPara: +e.target.value || 0
        })
      }), /*#__PURE__*/React.createElement("span", null, "\u53E5")), (pt.kind === 'circle' || pt.kind === 'affix' || pt.kind === 'genq' || pt.kind === 'usewords' || pt.kind === 'storymap' || pt.kind === 'evidence') && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
        className: "exed-pts",
        type: "number",
        value: pt.need || '',
        placeholder: "10",
        onChange: e => patchPart(si, pi, {
          need: +e.target.value || 0
        })
      }), /*#__PURE__*/React.createElement("span", null, "\u500B")), /*#__PURE__*/React.createElement("button", {
        className: "exed-x",
        title: "\u522A\u6389\u9019\u4E00\u5927\u984C",
        onClick: () => setSecs(secs.map((x, i) => i !== si ? x : {
          ...x,
          parts: x.parts.filter((_, k) => k !== pi)
        }))
      }, "\u2715")), /*#__PURE__*/React.createElement("textarea", {
        rows: pt.kind === 'circle' ? 5 : 6,
        value: window.examPartText ? window.examPartText(pt) : '',
        onChange: e => patchPart(si, pi, window.examParsePart(pt.kind, e.target.value)),
        placeholder: HINT[pt.kind]
      }), /*#__PURE__*/React.createElement("div", {
        className: "field-help"
      }, HINT[pt.kind]))), /*#__PURE__*/React.createElement("button", {
        className: "exed-add",
        onClick: () => setSecs(secs.map((x, i) => i !== si ? x : {
          ...x,
          parts: (x.parts || []).concat([{
            kind: 'quiz',
            title: '',
            pts: 0,
            questions: []
          }])
        }))
      }, "\uFF0B \u52A0\u4E00\u5927\u984C"))), /*#__PURE__*/React.createElement("button", {
        className: "exed-add sec",
        onClick: () => setSecs(secs.concat([{
          name: '',
          pct: 0,
          parts: []
        }]))
      }, "\uFF0B \u52A0\u4E00\u500B Section"), /*#__PURE__*/React.createElement("div", {
        className: "field-help"
      }, "\u26A0 \u914D\u5206\u7167\u5B78\u6821\u7684\u5BEB\u6CD5\uFF08Part 2 \u662F 20 \u5206\u30012 \u5206\u4E00\u984C\uFF09\uFF0C\u4E0D\u8981\u81EA\u5DF1\u63DB\u7B97\u6210\u767E\u5206\u6BD4\u2014\u2014 \u8001\u5E2B\u8981\u80FD\u628A\u7DB2\u7AD9\u7684\u5206\u6578\u8DDF\u7D19\u672C\u5C0D\u8D77\u4F86\u3002"));
    })()) : form.type === "sentence-order" ?
    /*#__PURE__*/
    /* v462 ①：一行一句，每一句用空白分開每一塊。
       ⚠ 不要做成「輸入整句再自動切」——標點要跟著前面那個字（basketball.），
         自動切會把句點切成獨立一塊，學生就多一塊不知道放哪的點。 */
    React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u53E5\u5B50\uFF08\u4E00\u884C\u4E00\u53E5\uFF0C\u7528\u7A7A\u767D\u5206\u958B\u6BCF\u4E00\u584A\uFF1B\u6A19\u9EDE\u8DDF\u8457\u524D\u9762\u90A3\u500B\u5B57\uFF09"), /*#__PURE__*/React.createElement("textarea", {
      rows: 8,
      value: (form.orderQuestions || []).map(q => (q.words || []).join(' ')).join('\n'),
      onChange: e => update('orderQuestions', e.target.value.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => {
        var old = (form.orderQuestions || [])[i] || {};
        return {
          id: old.id || 'o' + Date.now() + i,
          words: l.split(/\s+/).filter(Boolean),
          hint: old.hint || '',
          explain: old.explain || ''
        };
      })),
      placeholder: 'Do you like ice cream?\nShe walks to school every day.'
    }), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u5B78\u751F\u770B\u5230\u7684\u662F\u6253\u6563\u7684\u5B57\u584A\u3002", /*#__PURE__*/React.createElement("b", null, "\u6BCF\u4E00\u53E5\u90FD\u8981\u53EA\u6709\u4E00\u7A2E\u6B63\u78BA\u6392\u6CD5"), "\u2014\u2014 \u50CF\u300CI often play basketball.\u300D\u6709\u5169\u7A2E\u6392\u6CD5\u90FD\u5C0D\uFF0C\u90A3\u7A2E\u4E0D\u8981\u7528\u3002 \u76EE\u524D ", (form.orderQuestions || []).filter(q => window.gnValidOrder && window.gnValidOrder(q)).length, " / ", (form.orderQuestions || []).length, " \u53E5\u662F\u5B78\u751F\u7AEF\u6703\u6536\u7684\u3002")) : form.type === "circle-answer" ? /*#__PURE__*/React.createElement(CircleAnswerEditor, {
      questions: form.circleQuestions || [],
      instruction: form.circleInstruction || '',
      labels: form.circleLabels || [],
      onChangeQuestions: questions => update("circleQuestions", questions),
      onChangeInstruction: v => update("circleInstruction", v),
      onChangeLabels: labels => update("circleLabels", labels)
    }) : form.type === "story-mountain" ? /*#__PURE__*/React.createElement(StoryMountainEditor, {
      prompt: form.smPrompt || '',
      passage: form.smPassage || '',
      hints: form.smHints || {},
      onChangePrompt: v => update("smPrompt", v),
      onChangePassage: v => update("smPassage", v),
      onChangeHints: h => update("smHints", h)
    }) : form.type === "reading-skill" ?
    /*#__PURE__*/
    /* v386: 閱讀技巧。跟 ReadingGenModal 的校稿頁用同一組 RsBlockEditor，兩邊一定一致。 */
    React.createElement(ReadingSkillEditor, {
      passage: form.rsPassage || '',
      blocks: form.rsBlocks || [],
      onChangePassage: v => update('rsPassage', v),
      onChangeBlocks: b => update('rsBlocks', b)
    }) : form.type === "lesson" ?
    /*#__PURE__*/
    /* v383: 教學卡。前兩欄常改，其餘用 JSON 一次editing（老師很少動，動了也看得懂）。 */
    React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u4E00\u53E5\u8A71\u8AAA\u660E\uFF08\u5B78\u751F\u7B2C\u4E00\u773C\u770B\u5230\u7684\uFF09"), /*#__PURE__*/React.createElement("input", {
      value: form.lead || '',
      onChange: e => update('lead', e.target.value),
      placeholder: "\u4F8B\uFF1A\u5B78\u73FE\u5728\u7C21\u55AE\u5F0F\uFF0C\u8AAA\u51FA\u6BCF\u5929\u505A\u7684\u4E8B\u548C\u4E8B\u5BE6\u3002"
    })), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u6700\u5F8C\u9F13\u52F5\u7684\u8A71"), /*#__PURE__*/React.createElement("input", {
      value: form.outro || '',
      onChange: e => update('outro', e.target.value),
      placeholder: "\u4F8B\uFF1A\u592A\u597D\u4E86\uFF01\u63A5\u4E0B\u4F86\u7528\u7DF4\u7FD2\u628A\u5B83\u7DF4\u719F\u3002"
    })), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u5167\u5BB9\uFF08\u4EC0\u9EBC\u6642\u5019\u7528\uFF0F\u5F62\u5F0F\u8868\uFF0F\u63D0\u793A\u8A5E\uFF0F\u5E38\u898B\u932F\u8AA4\uFF0F\u793A\u7BC4\u984C\uFF0F\u5C0F\u8A66\u8EAB\u624B\uFF09"), /*#__PURE__*/React.createElement("textarea", {
      rows: 16,
      style: {
        fontFamily: 'var(--mono, monospace)',
        fontSize: 13,
        lineHeight: 1.8
      },
      value: JSON.stringify({
        uses: form.uses || [],
        forms: form.forms || [],
        clues: form.clues || [],
        mistakes: form.mistakes || [],
        examples: form.examples || [],
        check: form.check || []
      }, null, 2),
      onChange: e => {
        try {
          var o = JSON.parse(e.target.value);
          setForm(prev => ({
            ...prev,
            ...o
          }));
        } catch (err) {/* 打到一半還不是合法 JSON——先不動，不會存壞 */}
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u683C\u5F0F\u4E0D\u5C0D\u6642\u4E0D\u6703\u5B58\u9032\u53BB\uFF08\u756B\u9762\u4E0A\u7684\u5B57\u7167\u6A23\u53EF\u4EE5\u7E7C\u7E8C\u6253\uFF09\u3002", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("code", null, "uses"), " \u4EC0\u9EBC\u6642\u5019\u7528 \xB7 ", /*#__PURE__*/React.createElement("code", null, "forms"), " \u5F62\u5F0F\u8868 \xB7 ", /*#__PURE__*/React.createElement("code", null, "clues"), " \u63D0\u793A\u8A5E \xB7", /*#__PURE__*/React.createElement("code", null, "mistakes"), " \u5E38\u898B\u932F\u8AA4 \xB7 ", /*#__PURE__*/React.createElement("code", null, "examples"), " \u8001\u5E2B\u793A\u7BC4 \xB7 ", /*#__PURE__*/React.createElement("code", null, "check"), " \u5C0F\u8A66\u8EAB\u624B\uFF08answer \u662F\u9078\u9805\u7684\u5E8F\u865F\uFF0C0 \u958B\u59CB\uFF09"))) : form.type === "note" ? /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Notes Body \xB7 \u7B46\u8A18\u5167\u5BB9"), /*#__PURE__*/React.createElement("textarea", {
      value: form.body || "",
      onChange: e => update("body", e.target.value),
      placeholder: "Write your notes here...",
      rows: 6
    })) : form.type === "quiz" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Options \xB7 \u8A2D\u5B9A"), /*#__PURE__*/React.createElement("label", {
      className: "toggle-row"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: form.shuffle !== false,
      onChange: e => update("shuffle", e.target.checked)
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Shuffle options each time \xB7 \u6BCF\u6B21\u4F5C\u7B54\u968F\u6A5F\u6253\u4E82\u9078\u9805"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        color: "var(--ink-muted)",
        fontSize: 12,
        marginTop: 2
      }
    }, "\u5B78\u751F\u6C92\u8FA6\u6CD5\u80CC \u300CA \u662F\u7B54\u6848\u300D\u3002\u95DC\u95ED\u5247\u4FDD\u6301\u539F\u59CB\u9806\u5E8F\u3002")))), (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0).length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Linked Flashcard \xB7 \u7D81\u5B9A\u55AE\u5B57\u5361"), /*#__PURE__*/React.createElement("select", {
      value: form.linkedFlashcardId || "",
      onChange: e => update("linkedFlashcardId", e.target.value || undefined),
      style: {
        width: "100%",
        padding: "9px 12px",
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: "var(--ink)",
        borderRadius: 2,
        fontSize: 14
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\u2014 \u4E0D\u7D81\u5B9A (None) \u2014"), (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0).map(fc => /*#__PURE__*/React.createElement("option", {
      key: fc.id,
      value: fc.id
    }, fc.title, " (", (fc.cards || []).length, " \u5F35)"))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u5B78\u751F\u9032\u5165\u6E2C\u9A57\u524D\u6703\u76F4\u63A5\u770B\u5230\u9019\u7D44\u55AE\u5B57\u5361\uFF0C\u4E0D\u7528\u81EA\u5DF1\u9078\u3002")), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Questions \xB7 \u984C\u76EE"), /*#__PURE__*/React.createElement(window.QuizEditor, {
      questions: form.questions || [],
      onChange: qs => update("questions", qs)
    }))) : form.type === "pdf" ? /*#__PURE__*/React.createElement(PdfUpload, {
      file: form.fileData ? {
        name: form.fileName,
        dataUrl: form.fileData,
        size: form.fileSize
      } : null,
      url: form.url || "",
      weekId: weekId,
      itemId: form.id,
      onUrl: v => update("url", v),
      onFile: f => setForm(prev => ({
        ...prev,
        fileName: f?.name || "",
        fileSize: f?.size || 0,
        fileData: f?.dataUrl || "",
        url: f ? "" : prev.url
      }))
    }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Link \xB7 \u9023\u7D50\u7DB2\u5740"), /*#__PURE__*/React.createElement("input", {
      value: form.url || "",
      onChange: e => update("url", e.target.value),
      placeholder: form.type === "youtube" ? "https://www.youtube.com/watch?v=..." : "Public URL to the resource"
    })), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Embed URL \xB7 \u5D4C\u5165\u9023\u7D50 (optional)"), /*#__PURE__*/React.createElement("input", {
      value: form.embed || "",
      onChange: e => updateEmbed(e.target.value),
      placeholder: form.type === "quizlet" ? "https://quizlet.com/XXX/match/embed" : form.type === "wordwall" ? "https://wordwall.net/embed/XXX" : form.type === "form" ? "https://docs.google.com/forms/.../viewform?embedded=true" : "Leave blank for YouTube — auto-detected"
    }), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, form.type === "youtube" ? "Auto-generated from YouTube URL — leave blank." : "Paste the full <iframe…> embed code OR just the src URL — we'll auto-extract it.")))), /*#__PURE__*/React.createElement("div", {
      className: "modal-foot"
    }, !isNew ? /*#__PURE__*/React.createElement("button", {
      className: "btn danger",
      onClick: () => onDelete(form.id)
    }, "Delete") : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: onClose
    }, "Cancel"), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: handleSave
    }, isNew ? "Add Item" : "Save")))))
  );
}

/* ───── PDF upload — uploads to Firebase Storage ───── */
function PdfUpload({
  file,
  url,
  weekId,
  itemId,
  onUrl,
  onFile
}) {
  var [drag, setDrag] = useS(false);
  var [uploading, setUploading] = useS(false);
  var [err, setErr] = useS("");
  var inputRef = React.useRef(null);
  var MAX_BYTES = 10 * 1024 * 1024; // 10 MB (Firebase Storage, no localStorage limit)

  var handleFile = async f => {
    setErr("");
    if (!f) return;
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) {
      setErr("請上傳 PDF 檔 · Please upload a PDF file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setErr(`檔案太大 (${formatBytes(f.size)}) · 上限 ${formatBytes(MAX_BYTES)}。請壓縮 PDF。`);
      return;
    }
    setUploading(true);
    try {
      var downloadUrl = await window.uploadPdfToStorage(weekId, itemId, f);
      onFile({
        name: f.name,
        size: f.size,
        dataUrl: downloadUrl
      });
    } catch (e) {
      setErr("上傳失敗 · Upload failed. 請再試一次。");
    } finally {
      setUploading(false);
    }
  };
  var onDrop = e => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "PDF File \xB7 \u7DF4\u7FD2\u5377"), file?.dataUrl ? /*#__PURE__*/React.createElement("div", {
    className: "pdf-uploaded"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-uploaded-icon"
  }, "PDF"), /*#__PURE__*/React.createElement("div", {
    className: "pdf-uploaded-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-uploaded-name"
  }, file.name || "document.pdf"), /*#__PURE__*/React.createElement("div", {
    className: "pdf-uploaded-meta mono"
  }, formatBytes(file.size), " \xB7 stored in cloud \u2601")), /*#__PURE__*/React.createElement("div", {
    className: "pdf-uploaded-tools"
  }, /*#__PURE__*/React.createElement("a", {
    className: "item-action ghost",
    href: file.dataUrl,
    target: "_blank",
    rel: "noopener"
  }, "Preview"), /*#__PURE__*/React.createElement("button", {
    className: "item-action ghost",
    onClick: () => onFile(null)
  }, "Remove"))) : /*#__PURE__*/React.createElement("div", {
    className: "pdf-drop " + (drag ? "drag" : "") + (uploading ? " reading" : ""),
    onDragOver: e => {
      e.preventDefault();
      setDrag(true);
    },
    onDragLeave: () => setDrag(false),
    onDrop: onDrop,
    onClick: () => !uploading && inputRef.current?.click()
  }, /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    type: "file",
    accept: "application/pdf,.pdf",
    style: {
      display: "none"
    },
    onChange: e => handleFile(e.target.files?.[0])
  }), uploading ? /*#__PURE__*/React.createElement("div", {
    className: "pdf-drop-status"
  }, "Uploading to cloud\u2026 \u2601") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "pdf-drop-icon"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "40",
    height: "40",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v12M7 10l5 5 5-5M5 21h14"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-drop-title serif"
  }, drag ? "Drop your PDF here" : "Drag a PDF here, or click to choose"), /*#__PURE__*/React.createElement("div", {
    className: "pdf-drop-sub mono"
  }, "\u62D6\u66F3\u6A94\u6848\u5230\u9019\u88E1\uFF0C\u6216\u9EDE\u9078\u6A94 \xB7 PDF \xB7 max 10 MB"))), err && /*#__PURE__*/React.createElement("div", {
    className: "pdf-err mono"
  }, "\u26A0 ", err), /*#__PURE__*/React.createElement("div", {
    className: "pdf-or"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "OR \xB7 \u6216"), /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Link to PDF \xB7 \u8CBC\u4E0A\u5916\u90E8\u9023\u7D50 (optional)"), /*#__PURE__*/React.createElement("input", {
    value: url,
    onChange: e => onUrl(e.target.value),
    placeholder: "https://drive.google.com/\u2026 or any public PDF URL"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "If you have a Google Drive / Dropbox link, paste it here \u2014 no upload needed."));
}
function formatBytes(b) {
  if (!b) return "0 B";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(2) + " MB";
}

/* Footer — v275: 跟行銷頁同一套 .ll-foot2 樣式（styles-auth.css 全站都有載） */
function Footer({
  onOpenGuide
}) {
  var gmailUrl = "https://mail.google.com/mail/?view=cm&fs=1&to=alan07050445%40gmail.com";
  var lineUrl = "https://line.me/R/ti/p/~9161791608";
  return /*#__PURE__*/React.createElement("footer", {
    className: "ll-foot2 app-foot2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ll-foot2-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ll-foot2-brand"
  }, /*#__PURE__*/React.createElement("b", null, "Alan\u2019s English Class", /*#__PURE__*/React.createElement("i", null, ".")), /*#__PURE__*/React.createElement("p", null, "\u5C0D\u9F4A\u5EB7\u6A4B\u570B\u969B\u5B78\u6821\u6BCF\u9031\u9032\u5EA6\u7684\u82F1\u6587\u7DF4\u7FD2\u5E73\u53F0\u2014\u2014\u5728\u5BB6\u7DF4\u7684\u5C31\u662F\u5B78\u6821\u5728\u6559\u7684\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "ll-foot2-cols"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ll-foot2-col"
  }, /*#__PURE__*/React.createElement("b", null, "\u5B78\u7FD2\u9805\u76EE"), /*#__PURE__*/React.createElement("span", null, "\u55AE\u5B57"), /*#__PURE__*/React.createElement("span", null, "\u6587\u6CD5"), /*#__PURE__*/React.createElement("span", null, "\u5B57\u6839\u5B57\u9996"), /*#__PURE__*/React.createElement("span", null, "\u95B1\u8B80\u5BEB\u4F5C")), /*#__PURE__*/React.createElement("div", {
    className: "ll-foot2-col"
  }, /*#__PURE__*/React.createElement("b", null, "\u4F7F\u7528\u8AAA\u660E"), onOpenGuide && /*#__PURE__*/React.createElement("button", {
    onClick: onOpenGuide
  }, "\u65B0\u624B\u6559\u5B78"))), /*#__PURE__*/React.createElement("div", {
    className: "ll-foot2-contact"
  }, /*#__PURE__*/React.createElement("b", null, "\u806F\u7D61 Alan \u8001\u5E2B"), /*#__PURE__*/React.createElement("a", {
    className: "ll-foot2-btn",
    href: gmailUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": "\u4F7F\u7528 Gmail \u806F\u7D61 Alan \u8001\u5E2B"
  }, "\u2709\uFE0F Email \u806F\u7D61"), /*#__PURE__*/React.createElement("a", {
    className: "ll-foot2-btn ll-foot2-btn-line",
    href: lineUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": "\u52A0 Alan \u8001\u5E2B\u7684 LINE \u597D\u53CB"
  }, "\uD83D\uDCAC LINE \u52A0\u597D\u53CB"))), /*#__PURE__*/React.createElement("div", {
    className: "ll-foot2-bar"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 ", new Date().getFullYear(), " Alan\u2019s English Class"), /*#__PURE__*/React.createElement("span", {
    className: "ll-foot2-mini"
  }, "\u5C0D\u9F4A\u5EB7\u6A4B\u570B\u969B\u5B78\u6821\u6BCF\u9031\u9032\u5EA6 \xB7 \u7528\u5FC3\u88FD\u4F5C")));
}

/* ───── Week Modal ───── */
/* ══════════════════════════════════════════════════════════════
   v377 ③：貼一次單字 → 一次做出整套練習
   為什麼要有這個：線上資料顯示 72 份單字卡、881 張卡，而且有 76 個單元是
   「綁在單字卡上的」——Alan 實際的做法就是「一份單字，再配上填空／聽寫／測驗」，
   但現在得一個一個手動建。這裡把它變成一次完成。
   同時也讓別的老師不用搞懂 16 種題型，只要會貼單字就能開一個班。
   ══════════════════════════════════════════════════════════════ */
var QS_KINDS = [{
  id: 'flashcard',
  zh: '單字卡',
  note: '翻卡片記單字（含學習與測驗模式）',
  always: true
}, {
  id: 'def-match',
  zh: '配對連線',
  note: '左邊英文、右邊解釋，連連看'
}, {
  id: 'spelling',
  zh: '聽寫',
  note: '聽發音把單字拼出來'
}, {
  id: 'quiz',
  zh: '選擇題',
  note: '看中文選英文'
}, {
  id: 'fillblank',
  zh: '填空',
  note: '情境句子挖空＋中文解說'
},
/* v406（Alan：學校作業右半邊的 Part B 就長這樣）：一篇小故事，
   把這一課的每個單字各挖一格，學生讀上下文填回去。只有開 AI 才生得出來。 */
/* v542：單字多的時候會自動拆成好幾篇（Alan 合併 24 個字那次） */
{
  id: 'story',
  zh: '短文填空',
  note: '小故事挖空填回去（像作業紙的 Part B）；單字多就自動拆成好幾篇',
  ai: true
},
/* v468（Alan 2026-10-06 給的康橋考卷，Section I 的 A 一定是這一種）：
   短文裡一個目標字 →「在這篇文章裡這個字是什麼意思？」四個選項**全是定義**，
   干擾項是**同一個字的其他語意**。⚠ 跟「配對連線」不是同一件事。 */
{
  id: 'sense',
  zh: '字義選擇',
  note: '短文＋「這個字在這裡是什麼意思」，像康橋考卷第一大題；一份最多 8 題',
  ai: true
}];
/* 🔴 v487：預設勾哪些，本來是手寫的一份清單，新增題型時沒人記得補
   → 「字義選擇」從 v468 做好到現在一次都沒有被預設勾起來。
   改成**從 QS_KINDS 自己長出來**，以後加新題型不會再漏。 */
var QS_DEFAULT_KINDS = QS_KINDS.map(k => k.id);

/* 一行一個字：英文 [Tab | ｜ | 逗號 | " - "] 中文 [同樣分隔] 例句 */
/* ══ v445（Alan：「一鍵生成都可以在自己跟 AI 協調和溝通，這次我可能要客製化某一些地方」）══
   三個一鍵生成視窗共用的「特別要求」欄。寫什麼就原封不動送給 AI（只限內容，不能改格式）。
   預設收起來——不寫的老師完全不受影響。 */
function AiNoteBox({
  value,
  onChange,
  examples
}) {
  var [open, setOpen] = useS(!!String(value || '').trim());
  return /*#__PURE__*/React.createElement("div", {
    className: "ai-note"
  }, !open ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ai-note-open",
    onClick: () => setOpen(true)
  }, "\uD83D\uDCAC \u9019\u6B21\u6709\u7279\u5225\u8981\u6C42\u55CE\uFF1F\uFF08\u53EF\u7559\u7A7A\uFF09") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\uD83D\uDCAC \u9019\u6B21\u7684\u7279\u5225\u8981\u6C42\uFF08\u76F4\u63A5\u8DDF AI \u8AAA\uFF0C\u7528\u4E2D\u6587\u5C31\u53EF\u4EE5\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    className: "ai-note-in",
    rows: 3,
    value: value,
    onChange: e => onChange(e.target.value.slice(0, 600)),
    placeholder: examples || '例：只講重點就好，不要講太多頁'
  }), /*#__PURE__*/React.createElement("div", {
    className: "ai-note-tip"
  }, "\u4F8B\uFF1A", (examples || '').split('｜').map((x, i) => /*#__PURE__*/React.createElement("b", {
    key: i
  }, x)), /*#__PURE__*/React.createElement("span", null, "\u3000\uFF08", String(value || '').length, "/600\uFF09"))));
}
function qsParseWords(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
    var cols = (line.includes('\t') ? line.split('\t') : line.includes('|') ? line.split('|') : /\s+-\s+/.test(line) ? line.split(/\s+-\s+/) : line.includes(',') ? line.split(',') : [line]).map(c => c.trim().replace(/^["']|["']$/g, ''));
    // v445（Alan：「老師已經有自己會考的 definition，就可以直接複製上去」）：第四欄＝英文定義
    return {
      term: cols[0] || '',
      zh: cols[1] || '',
      example: cols[2] || '',
      def: cols[3] || '',
      _i: i
    };
  }).filter(w => w.term);
}

/* 把例句裡的那個單字挖成空格（認得 -s/-ed/-ing 等字尾變化） */
function qsBlank(example, term) {
  var t = String(term || '').trim();
  if (!t || !example) return '';
  var esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp('\\b' + esc + '(s|es|ed|ing|d)?\\b', 'i');
  return re.test(example) ? example.replace(re, '_____') : '';
}

/* ══════════════════════════════════════════════════════════════
   v382：五大時態核心題庫的出題工具
   一次出一個時態：Type A 幾組×10 題 + Type B 幾篇短文 → 校稿 → 建立成多個單元。
   Type A → type-answer（打字作答）；Type B → cloze（[答案](原形)）。
   ══════════════════════════════════════════════════════════════ */
function GrammarGenModal({
  open,
  defaultTense,
  onClose,
  onCreate
}) {
  var [nudgeCls, nudge] = useModalNudge(); // v461：點背景不關閉，只晃一下
  var T = window.GR_TENSES || {};
  var [tense, setTense] = useS(defaultTense || 't1');
  var [aG, setAG] = useS(3);
  var [bC, setBC] = useS(5);
  var [wantLesson, setWantLesson] = useS(true); // v383: 單元開頭的教學卡
  var [wantCheck, setWantCheck] = useS(true); // v383: 單元最後的驗收
  var [busy, setBusy] = useS(null); // { done, total, label }
  var [err, setErr] = useS('');
  var [res, setRes] = useS(null); // { A:[[…]], B:[…] }
  var [tab, setTab] = useS(0); // 校稿頁：看第幾個單元

  useE(() => {
    if (open) {
      setTense(defaultTense || 't1');
      setAG(3);
      setBC(5);
      setBusy(null);
      setErr('');
      setRes(null);
      setTab(0);
      setWantLesson(true);
      setWantCheck(true);
    }
  }, [open]);
  if (!open) return null;
  var meta = T[tense] || {};
  var totalUnits = (wantLesson ? 1 : 0) + +aG + +bC + (wantCheck ? 1 : 0);
  var run = async () => {
    setErr('');
    var done = 0;
    var tick = label => {
      done++;
      setBusy({
        done,
        total: totalUnits,
        label
      });
    };
    setBusy({
      done: 0,
      total: totalUnits,
      label: '準備中'
    });
    try {
      var lesson = null;
      if (wantLesson) {
        lesson = await window.aiMakeLesson({
          tense
        });
        tick('教學卡');
      }
      var r = await window.aiMakeGrammarSet({
        // 驗收＝多出一組，最後改名
        tense,
        aGroups: +aG + (wantCheck ? 1 : 0),
        bCount: +bC,
        onProgress: (_d, _t, label) => tick(label)
      });
      var check = wantCheck ? r.A.pop() : null;
      setRes({
        lesson,
        A: r.A,
        B: r.B,
        check
      });
      setTab(0);
    } catch (e) {
      setErr(e && e.message || 'AI 出題失敗，請再試一次。');
    }
    setBusy(null);
  };
  var updA = (g, i, k, v) => setRes(r => ({
    ...r,
    A: r.A.map((grp, gi) => gi !== g ? grp : grp.map((x, xi) => xi !== i ? x : {
      ...x,
      [k]: v
    }))
  }));
  var updC = (i, k, v) => setRes(r => ({
    ...r,
    check: r.check.map((x, xi) => xi !== i ? x : {
      ...x,
      [k]: v
    })
  }));
  var updAny = (cur, i, k, v) => cur.kind === 'C' ? updC(i, k, v) : updA(cur.i, i, k, v);
  var updB = (i, k, v) => setRes(r => ({
    ...r,
    B: r.B.map((x, xi) => xi !== i ? x : {
      ...x,
      [k]: v
    })
  }));

  /* ── 第 1 步：設定 ── */
  if (!res) {
    return /*#__PURE__*/React.createElement("div", {
      className: "modal-backdrop",
      onClick: nudge
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal" + nudgeCls,
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal-head"
    }, /*#__PURE__*/React.createElement("h3", null, "\u51FA", /*#__PURE__*/React.createElement("em", null, "\u6642\u614B\u984C\u76EE")), /*#__PURE__*/React.createElement("button", {
      className: "modal-close",
      "aria-label": "\u95DC\u9589",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "close",
      size: 14
    }))), /*#__PURE__*/React.createElement("div", {
      className: "modal-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u54EA\u4E00\u500B\u6642\u614B"), /*#__PURE__*/React.createElement("div", {
      className: "gr-tense-pick"
    }, Object.keys(T).map(k => /*#__PURE__*/React.createElement("button", {
      key: k,
      className: tense === k ? 'active' : '',
      onClick: () => setTense(k)
    }, T[k].zh))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, meta.en)), /*#__PURE__*/React.createElement("div", {
      className: "gr-num-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u55AE\u53E5\u586B\u7A7A"), /*#__PURE__*/React.createElement("select", {
      value: aG,
      onChange: e => setAG(+e.target.value)
    }, [1, 2, 3, 4, 5].map(n => /*#__PURE__*/React.createElement("option", {
      key: n,
      value: n
    }, n, " \u7D44 \xB7 \u5171 ", n * 10, " \u984C"))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u4E00\u7D44 10 \u984C\uFF1D\u4E00\u500B\u55AE\u5143")), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u77ED\u6587\u586B\u7A7A"), /*#__PURE__*/React.createElement("select", {
      value: bC,
      onChange: e => setBC(+e.target.value)
    }, [1, 2, 3, 4, 5, 6].map(n => /*#__PURE__*/React.createElement("option", {
      key: n,
      value: n
    }, n, " \u7BC7"))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u4E00\u7BC7 5\u20138 \u500B\u7A7A\uFF1D\u4E00\u500B\u55AE\u5143"))), /*#__PURE__*/React.createElement("div", {
      className: "gr-extra"
    }, /*#__PURE__*/React.createElement("label", {
      className: wantLesson ? 'on' : ''
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: wantLesson,
      onChange: e => setWantLesson(e.target.checked)
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDCD8 \u6559\u5B78\u5361\uFF08\u653E\u6700\u524D\u9762\uFF09"), "\u9019\u662F\u4EC0\u9EBC\uFF0F\u4EC0\u9EBC\u6642\u5019\u7528\uFF0F\u5F62\u5F0F\u8868\uFF0F\u5E38\u898B\u932F\u8AA4\uFF0F\u8001\u5E2B\u793A\u7BC4\uFF0F\u5C0F\u8A66\u8EAB\u624B")), /*#__PURE__*/React.createElement("label", {
      className: wantCheck ? 'on' : ''
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: wantCheck,
      onChange: e => setWantCheck(e.target.checked)
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\uD83C\uDFC1 \u9A57\u6536\uFF08\u653E\u6700\u5F8C\u9762\uFF09"), "\u518D 10 \u984C\u6DF7\u5408\u7DF4\u7FD2\uFF0C80 \u5206\u624D\u7B97\u904E\u95DC"))), /*#__PURE__*/React.createElement("div", {
      className: "field-help",
      style: {
        marginTop: 10
      }
    }, "\u6703\u5EFA\u7ACB ", /*#__PURE__*/React.createElement("b", null, totalUnits), " \u500B\u55AE\u5143\uFF0C\u9806\u5E8F\u662F\u300C\u5148\u6559 \u2192 \u518D\u7DF4 \u2192 \u6700\u5F8C\u9A57\u6536\u300D\u3002\u51FA\u5B8C\u5148\u8B93\u4F60\u9010\u984C\u6821\u7A3F\uFF0C\u78BA\u8A8D\u4E86\u624D\u5BEB\u9032\u984C\u5EAB\u3002 AI \u51FA\u7684\u984C\u76EE\u4E00\u5B9A\u8981\u770B\u904E\u2014\u2014\u8A9E\u610F\u3001\u4ECB\u7CFB\u8A5E\u3001\u6642\u9593\u63D0\u793A\u90FD\u53EF\u80FD\u6709\u5C0F\u554F\u984C\u3002"), err && /*#__PURE__*/React.createElement("div", {
      className: "notify-msg err",
      style: {
        marginTop: 10
      }
    }, "\u26A0\uFE0F ", err), busy && /*#__PURE__*/React.createElement("div", {
      className: "gr-busy"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gr-busy-bar"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: busy.done / busy.total * 100 + '%'
      }
    })), /*#__PURE__*/React.createElement("span", null, "\u51FA\u984C\u4E2D\u2026 ", busy.done, "/", busy.total, " \xB7 ", busy.label))), /*#__PURE__*/React.createElement("div", {
      className: "modal-foot"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: onClose
    }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      disabled: !!busy,
      onClick: run
    }, busy ? '出題中…' : `✨ 開始出題（${totalUnits} 個單元）→`))));
  }

  /* ── 第 2 步：校稿 ── */
  var units = (res.lesson ? [{
    kind: 'L',
    i: 0,
    n: (res.lesson.check || []).length,
    name: '📘 教學卡'
  }] : []).concat(res.A.map((g, i) => ({
    kind: 'A',
    i,
    n: g.length,
    name: `單句填空 ${i + 1}`
  }))).concat(res.B.map((b, i) => ({
    kind: 'B',
    i,
    n: window.grCountBlanks(b.passage),
    name: `短文 ${i + 1}`
  }))).concat(res.check ? [{
    kind: 'C',
    i: 0,
    n: res.check.length,
    name: '🏁 驗收'
  }] : []);
  var cur = units[Math.min(tab, units.length - 1)];
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: nudge
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal wide" + nudgeCls,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\u6821\u7A3F \xB7 ", /*#__PURE__*/React.createElement("em", null, meta.zh)), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-tabs"
  }, units.map((u, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: i === tab ? 'active' : '',
    onClick: () => setTab(i)
  }, u.name, /*#__PURE__*/React.createElement("em", null, u.n)))), cur.kind === 'L' ? /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 10
    }
  }, "\u9019\u662F\u5B78\u751F\u6309\u9032\u55AE\u5143\u7B2C\u4E00\u773C\u770B\u5230\u7684\u6559\u5B78\u9801\u3002\u6587\u5B57\u90FD\u53EF\u4EE5\u76F4\u63A5\u6539\uFF1B\u7A7A\u767D\u7684\u5340\u584A\u4E0D\u6703\u986F\u793A\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u4E00\u53E5\u8A71\u8AAA\u660E"), /*#__PURE__*/React.createElement("input", {
    value: res.lesson.lead || '',
    onChange: e => setRes(r => ({
      ...r,
      lesson: {
        ...r.lesson,
        lead: e.target.value
      }
    }))
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u6700\u5F8C\u9F13\u52F5\u7684\u8A71"), /*#__PURE__*/React.createElement("input", {
    value: res.lesson.outro || '',
    onChange: e => setRes(r => ({
      ...r,
      lesson: {
        ...r.lesson,
        outro: e.target.value
      }
    }))
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u5176\u9918\u5167\u5BB9\uFF08\u4EC0\u9EBC\u6642\u5019\u7528\uFF0F\u5F62\u5F0F\u8868\uFF0F\u63D0\u793A\u8A5E\uFF0F\u5E38\u898B\u932F\u8AA4\uFF0F\u793A\u7BC4\u984C\uFF0F\u5C0F\u8A66\u8EAB\u624B\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    className: "gr-passage",
    rows: 14,
    value: JSON.stringify({
      uses: res.lesson.uses,
      forms: res.lesson.forms,
      clues: res.lesson.clues,
      mistakes: res.lesson.mistakes,
      examples: res.lesson.examples,
      check: res.lesson.check
    }, null, 2),
    onChange: e => {
      try {
        var o = JSON.parse(e.target.value);
        setRes(r => ({
          ...r,
          lesson: {
            ...r.lesson,
            ...o
          }
        }));
      } catch (err) {/* 打到一半還不是合法 JSON——先不動 */}
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u6539\u58DE\u4E86\u4E5F\u4E0D\u8981\u7DCA\uFF1A\u683C\u5F0F\u4E0D\u5C0D\u5C31\u4E0D\u6703\u5B58\u9032\u53BB\uFF0C\u56DE\u4E0A\u4E00\u6B65\u91CD\u51FA\u4E00\u6B21\u5373\u53EF\u3002"))) : cur.kind === 'A' || cur.kind === 'C' ? /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, (cur.kind === 'C' ? res.check : res.A[cur.i]).map((x, i) => {
    var ok = window.grValidA(x);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'gq-row' + (ok ? '' : ' bad')
    }, /*#__PURE__*/React.createElement("span", {
      className: "gq-row-n"
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      className: "gq-row-f"
    }, /*#__PURE__*/React.createElement("textarea", {
      rows: 2,
      value: x.prompt,
      onChange: e => updAny(cur, i, 'prompt', e.target.value)
    }), /*#__PURE__*/React.createElement("div", {
      className: "gq-row-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u7B54\u6848"), /*#__PURE__*/React.createElement("input", {
      value: x.answer,
      onChange: e => updAny(cur, i, 'answer', e.target.value)
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u4E2D\u6587\u89E3\u8AAA"), /*#__PURE__*/React.createElement("input", {
      value: x.explain,
      onChange: e => updAny(cur, i, 'explain', e.target.value)
    }))), !ok && /*#__PURE__*/React.createElement("div", {
      className: "gr-warn"
    }, "\u26A0 \u9019\u984C\u4E0D\u7B26\u5408\u898F\u5247\uFF1A\u4E00\u53E5\u53EA\u80FD\u4E00\u500B ________\u3001\u53E5\u5C3E\u8981\u6709 (\u539F\u5F62\u52D5\u8A5E)\u3001\u7B54\u6848\u4E0D\u80FD\u542B already/never/not \u9019\u985E\u8A5E")));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u6A19\u984C"), /*#__PURE__*/React.createElement("input", {
    value: res.B[cur.i].title,
    onChange: e => updB(cur.i, 'title', e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u77ED\u6587\uFF08\u7A7A\u683C\u5BEB\u6210 ", /*#__PURE__*/React.createElement("code", null, "[\u7B54\u6848](\u539F\u5F62\u52D5\u8A5E)"), "\uFF0C\u62EC\u865F\u6703\u986F\u793A\u5728\u7A7A\u683C\u65C1\u908A\u7576\u63D0\u793A\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    className: "gr-passage",
    rows: 11,
    value: res.B[cur.i].passage,
    onChange: e => updB(cur.i, 'passage', e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u76EE\u524D ", /*#__PURE__*/React.createElement("b", null, window.grCountBlanks(res.B[cur.i].passage)), " \u500B\u7A7A\u683C", window.grValidB(res.B[cur.i]) ? ' ✓' : ' ⚠ 建議 5–8 個，且 [ ] 裡不要包含 already／never 這類副詞')))), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => setRes(null)
  }, "\u2190 \u91CD\u65B0\u8A2D\u5B9A"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: () => onCreate({
      tense,
      zh: meta.zh,
      lesson: res.lesson,
      A: res.A,
      B: res.B,
      check: res.check
    })
  }, "\u5EFA\u7ACB ", units.length, " \u500B\u55AE\u5143 \u2192"))));
}

/* 把校稿完的結果變成真正的單元（Type A → type-answer；Type B → cloze） */
function grBuildItems({
  tense,
  zh,
  lesson,
  A,
  B,
  check
}) {
  var stamp = Date.now();
  var rnd = () => Math.random().toString(36).slice(2, 5);
  var out = [];
  if (lesson) {
    out.push({
      id: 'gr' + stamp + 'ls' + rnd(),
      type: 'lesson',
      group: zh,
      title: `${zh} · 先看這裡`,
      zh: '這是什麼、怎麼用、常見錯誤、小試身手',
      order: 0,
      lead: lesson.lead || '',
      uses: lesson.uses || [],
      forms: lesson.forms || [],
      clues: lesson.clues || [],
      mistakes: lesson.mistakes || [],
      examples: lesson.examples || [],
      check: lesson.check || [],
      outro: lesson.outro || ''
    });
  }
  (A || []).forEach((grp, g) => {
    var items = (grp || []).filter(x => x.prompt && x.answer);
    if (!items.length) return;
    out.push({
      id: 'gr' + stamp + 'a' + g + rnd(),
      type: 'type-answer',
      group: zh,
      order: 1 + g / 100,
      title: `${zh} · 單句填空 ${g + 1}`,
      zh: `${items.length} 題 · 看句子打出正確的動詞形式`,
      pairs: items.map((x, i) => ({
        id: 'p' + stamp + g + i + rnd(),
        prompt: x.prompt,
        answer: x.answer,
        explain: x.explain || ''
      }))
    });
  });
  if (check && check.length) {
    out.push({
      id: 'gr' + stamp + 'ck' + rnd(),
      type: 'type-answer',
      group: zh,
      order: 9,
      title: `${zh} · 🏁 驗收`,
      zh: `${check.length} 題混合 · 80 分過關`,
      pairs: check.filter(x => x.prompt && x.answer).map((x, i) => ({
        id: 'p' + stamp + 'c' + i + rnd(),
        prompt: x.prompt,
        answer: x.answer,
        explain: x.explain || ''
      }))
    });
  }
  (B || []).forEach((p, i) => {
    if (!p || !p.passage) return;
    out.push({
      id: 'gr' + stamp + 'b' + i + rnd(),
      type: 'cloze',
      group: zh,
      order: 2 + i / 100,
      title: `${zh} · 短文填空 ${i + 1}${p.title ? `（${p.title}）` : ''}`,
      zh: `${window.grCountBlanks(p.passage)} 個空格 · 讀短文填動詞`,
      passage: p.passage
    });
  });
  return out;
}
function QuickSetModal({
  open,
  categories,
  defaultCat,
  existingGroups,
  roster,
  perStudent,
  defaultGrade,
  defaultTitle,
  defaultText,
  defaultImages,
  alreadyHave,
  onClose,
  onCreate
}) {
  var [nudgeCls, nudge] = useModalNudge(); // v461：點背景不關閉，只晃一下
  var [text, setText] = useS('');
  var [title, setTitle] = useS('');
  var [cat, setCat] = useS(defaultCat || 'vocab');
  var [picked, setPicked] = useS({
    flashcard: true,
    'def-match': true,
    spelling: true,
    quiz: true,
    fillblank: true,
    story: true
  });
  /* v379：AI 出題。Alan 的配對連線是「英文單字 → 英文定義」、填空是「情境例句＋中文解說」，
     不是單字表就能生出來的東西——他本來都貼給 ChatGPT 再匯入。
     出完先進「校稿」畫面，每一格都可以改，確認了才寫進週次。 */
  var [useAI, setUseAI] = useS(true);
  /* v442（Alan：「我也有 G1 G2 的學生，生成出來的題目要簡單一點…分級 G1G2／G3G4／G5G6，
     但一定都要給 context clue」）：句子的難度跟著年級走，線索一律都要有。 */
  var [grade, setGrade] = useS(defaultGrade || 'g4');
  var [busy, setBusy] = useS(0); // 0=沒在跑，否則是已完成的字數
  // v476：單字題目做完之後，短文填空／字義選擇還在跑——畫面要講出來，不要停在 8/8
  var [slow, setSlow] = useS([]);
  var [aiErr, setAiErr] = useS('');
  var [aiNote, setAiNote] = useS(''); // v445：這次的特別要求（直接寫給 AI）
  var [rows, setRows] = useS(null); // AI 回來的結果（校稿中）
  /* v542：短文填空從「一篇」變成「一疊」——合併 24 個單字時要出好幾篇。
     ⚠ 舊的 story 欄位還留在 qsBuildItems 收得到的範圍內（別條路還在用）。 */
  var [stories, setStories] = useS([]); // v406: AI 出的短文填空（校稿中一起改）
  /* v542（Alan：「盡量每一次練習都是在 10 題內」）：一個練習最多幾題，程式照這個切 */
  var [maxQ, setMaxQ] = useS(window.QS_MAX_Q || 10);
  var [reStoryAt, setReStoryAt] = useS(-1); // 正在重生第幾篇
  var [sense, setSense] = useS([]); // v468: 字義選擇題（康橋考卷第一大題）
  /* v380（Alan：「不用一整包要一份一份指定」）：建立的同時就指派出去。
     學期＝整組設為本週作業（含截止日）；暑假題庫＝勾選要給哪些學生。 */
  var [assign, setAssign] = useS(true);
  var [due, setDue] = useS('');
  var [who, setWho] = useS([]); // 只有 perStudent 模式用得到
  useE(() => {
    if (open) {
      setText(defaultText || ''); /* v474：連現成的單字也先填好，不用再貼一次 */
      setTitle(defaultTitle || ''); /* v454：在同一組再出一份＝名字先填好 */
      /* 🔴 v475（Alan：「我只是這一組忘記生成哪一個，不應該全部重刪掉再生成一次」）：
         這一組已經有的題型先取消勾選 → 按下去就只補漏掉的那幾個。
         老師還是可以自己勾回去（他可能就是想重出一份不一樣的）。 */
      /* 🔴 v487：這個 setPicked 本來在同一個 effect 的**最後面又寫了一次**
         （`setPicked({flashcard:true, …})`），把上面這段無條件蓋掉 →
         v475 的「只補漏掉的那一個題型」從上線起就沒生效過，
         而且那份預設清單裡沒有 sense，所以「字義選擇」永遠是沒勾的。
         ⚠ 同一個狀態在同一個 effect 裡設兩次，後面那次一定贏；
           jsxcheck 抓不到這種（兩行都是合法的）。 */
      if (alreadyHave && alreadyHave.length) {
        setPicked(QS_KINDS.reduce((a3, k) => {
          a3[k.id] = alreadyHave.indexOf(k.id) < 0;
          return a3;
        }, {}));
      } else {
        setPicked(QS_DEFAULT_KINDS.reduce((a3, k) => {
          a3[k] = true;
          return a3;
        }, {}));
      }
      setCat(defaultCat || 'vocab');
      setRows(null);
      setStories([]);
      setSense([]);
      setReStoryAt(-1);
      setAiErr('');
      setBusy(0);
      setUseAI(true);
      setAssign(true);
      setWho([]);
      // 預設截止日＝這個週日（大部分作業都是一週）
      var d = new Date();
      d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
      setDue(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }, [open]);
  if (!open) return null;
  var words = qsParseWords(text);
  var withZh = words.filter(w => w.zh);
  var withEx = words.filter(w => qsBlank(w.example, w.term));
  var withDef = words.filter(w => w.def); // v445：老師自己寫的英文定義
  /* ⚠ 開了 AI 就不需要自己先寫中文／例句——句子和定義都是 AI 出的。
     沒開 AI 才需要：配對要有中文、填空要有例句。 */
  var canDo = {
    flashcard: words.length >= 1,
    'def-match': (useAI ? words.length : withZh.length) >= 2,
    spelling: words.length >= 1,
    quiz: (useAI ? words.length : withZh.length) >= 2,
    fillblank: (useAI ? words.length : withEx.length) >= 2,
    // v406: 短文填空一定要 AI（要寫一整篇故事），而且太少字寫不成故事
    story: useAI && words.length >= 3,
    /* 🔴 v473：v468 做了「字義選擇」卻漏了這一行 → canDo.sense 是 undefined
       → 選項永遠是灰的、寫著「資料不夠」，做出來到現在一次都按不下去。
       它要 AI（干擾項是同一個字的其他語意，程式生不出來），
       而且 qsBuildItems 至少要 2 題才會建單元。 */
    sense: useAI && words.length >= 2
  };
  var chosen = QS_KINDS.filter(k => picked[k.id] && canDo[k.id]);
  var ready = title.trim() && words.length >= 1 && chosen.length >= 1;
  var wantAI = useAI && (picked['def-match'] || picked.fillblank || picked.story || picked.sense);
  var runAI = async () => {
    setAiErr('');
    setBusy(0.0001);
    try {
      /* v406：單字題目與短文同時送出去（兩個獨立請求）。
         AI 的延遲幾乎全是「吐字時間」，並行送出總時間就是比較慢的那一個，
         不是兩個相加。短文失敗不影響單字題目——它只是少一個練習。
         v407：短文的第三層保底要用到「填空題」的例句，所以把同一個 promise
         當 rescue 傳進去——它只在真的漏字時才會 await，並行完全沒被打斷。 */
      var exP = window.aiMakeVocabExercises(words, {
        hint: title.trim(),
        grade,
        teacherNote: aiNote,
        onProgress: done => setBusy(done)
      });
      var drop = n2 => setSlow(xs => xs.filter(x => x !== n2));
      var seP = picked.sense && canDo.sense && window.aiMakeVocabSense ? window.aiMakeVocabSense(words, {
        hint: title.trim(),
        grade,
        teacherNote: aiNote
      }).catch(e => e).then(x => {
        drop('字義選擇');
        return x;
      }) : Promise.resolve(null);
      /* v542：一次出好幾篇（幾篇由程式照單字數算，不是叫 AI 自己拆——
         Alan 試過在「特別要求」裡叫 AI 拆三篇，做不到）。 */
      var stP = picked.story && canDo.story && window.aiMakeVocabStories ? window.aiMakeVocabStories(words, {
        hint: title.trim(),
        grade,
        teacherNote: aiNote,
        per: Math.min(maxQ, window.QS_SPLIT && window.QS_SPLIT.story.per || 6),
        rescue: () => exP
      }).catch(e => e).then(x => {
        drop('短文填空');
        return x;
      }) : Promise.resolve(null);
      exP.then(() => setSlow([picked.story && canDo.story && '短文填空', picked.sense && canDo.sense && '字義選擇'].filter(Boolean)));
      var [r, st0, se0] = await Promise.all([exP, stP, seP]);
      setSlow([]);
      /* 🔴 v473：本來是 .catch(() => null)——短文或字義選擇失敗時**悄悄少一個單元**，
         老師只看得到「短文填空不見了」，完全不知道發生什麼事（Alan 就是這樣回報的）。
         它們失敗不該拖垮其他已經出好的練習，但一定要講出來。 */
      var soft = [];
      var st = st0 instanceof Error ? (soft.push('短文填空'), []) : st0 || [];
      var se = se0 instanceof Error ? (soft.push('字義選擇'), null) : se0;
      /* ⚠ 一篇失敗不可以拖垮其他篇，但失敗的那幾篇要講出來（v473 的教訓） */
      var bad = st.filter(x => x && x.error).length;
      if (bad) soft.push(`短文填空有 ${bad} 篇`);
      setRows(r);
      setStories(st.filter(x => x && !x.error));
      setSense(se || []);
      if (soft.length) setAiErr(`其他都出好了，只有${soft.join('、')}這次沒出來（AI 回得不乾淨）。想要的話再按一次。`);
    } catch (e) {
      setAiErr(e && e.message || 'AI 出題失敗，請再試一次。');
    }
    setSlow([]);
    setBusy(0); // v476：失敗也要歸零，不然按鈕永遠卡在「還在出…」
  };
  var updRow = (i, k, v) => setRows(rs => rs.map((r, j) => j === i ? {
    ...r,
    [k]: v
  } : r));
  /* v475：單字表是純文字帶不了圖片，所以用「單字→圖片」對照表解析完再貼回去。
     不然「再出一份」補出來的單字卡又是白的。 */
  var withImgs = defaultImages ? words.map(w => {
    var u = defaultImages[String(w.term || '').toLowerCase()];
    return u && !w.imageUrl ? {
      ...w,
      imageUrl: u
    } : w;
  }) : words;
  var payload = extra => ({
    words: withImgs,
    title: title.trim(),
    cat,
    kinds: chosen.map(k => k.id),
    stories,
    sense,
    maxQ,
    assign: assign ? perStudent ? {
      students: who
    } : {
      dueDate: due
    } : null,
    ...extra
  });

  /* ⚠ 不要寫成 `const AssignBox = () => …` 再用 <AssignBox/> 那種寫法：
     那樣每次重繪都是一個新的元件型別，React 會把整段拆掉重掛，
     勾第二個學生時第一個已經被換成新的 DOM 節點＝點不到（實測踩過）。
     這裡是「回傳 JSX 的普通函式」，等同直接內嵌。 */
  var assignBox = () => /*#__PURE__*/React.createElement("div", {
    className: 'qs-assign' + (assign ? ' on' : '')
  }, /*#__PURE__*/React.createElement("label", {
    className: "qs-assign-head"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: assign,
    onChange: e => setAssign(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, "\u5EFA\u7ACB\u5F8C", /*#__PURE__*/React.createElement("b", null, "\u6574\u7D44\u76F4\u63A5\u6307\u6D3E"), "\uFF08", chosen.length, " \u500B\u7DF4\u7FD2\u4E00\u6B21\u6D3E\u51FA\u53BB\uFF0C\u4E0D\u7528\u4E00\u4EFD\u4E00\u4EFD\u8A2D\uFF09")), assign && (perStudent ? /*#__PURE__*/React.createElement("div", {
    className: "qs-who"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qs-who-bar"
  }, /*#__PURE__*/React.createElement("span", null, "\u6307\u6D3E\u7D66\uFF08", who.length, "/", (roster || []).length, "\uFF09"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setWho((roster || []).map(r => r.email))
  }, "\u5168\u9078"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setWho([])
  }, "\u5168\u4E0D\u9078")), /*#__PURE__*/React.createElement("div", {
    className: "qs-who-list"
  }, (roster || []).map(r => /*#__PURE__*/React.createElement("label", {
    key: r.email,
    className: 'qs-who-item' + (who.indexOf(r.email) >= 0 ? ' on' : '')
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: who.indexOf(r.email) >= 0,
    onChange: e => setWho(w => e.target.checked ? w.concat(r.email) : w.filter(x => x !== r.email))
  }), r.name || r.email)), !(roster || []).length && /*#__PURE__*/React.createElement("span", {
    className: "qs-who-empty"
  }, "\u540D\u55AE\u9084\u6C92\u8F09\u5165"))) : /*#__PURE__*/React.createElement("div", {
    className: "qs-due"
  }, /*#__PURE__*/React.createElement("label", null, "\u622A\u6B62\u65E5"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: due,
    onChange: e => setDue(e.target.value)
  }), /*#__PURE__*/React.createElement("span", {
    className: "qs-due-n"
  }, "\u6574\u7D44\u6703\u51FA\u73FE\u5728\u5B78\u751F\u7684\u300C\u4ECA\u5929\u7684\u4EFB\u52D9\u300D"))));

  /* ── 第 2 步：AI 出完了，逐題校稿 ── */
  if (rows) {
    return /*#__PURE__*/React.createElement("div", {
      className: "modal-backdrop",
      onClick: nudge
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal wide" + nudgeCls,
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal-head"
    }, /*#__PURE__*/React.createElement("h3", null, "\u6821\u7A3F \xB7 ", /*#__PURE__*/React.createElement("em", null, title)), /*#__PURE__*/React.createElement("button", {
      className: "modal-close",
      "aria-label": "\u95DC\u9589",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "close",
      size: 14
    }))), /*#__PURE__*/React.createElement("div", {
      className: "modal-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "field-help",
      style: {
        marginBottom: 10
      }
    }, "AI \u51FA\u597D\u4E86 ", /*#__PURE__*/React.createElement("b", null, rows.length), " \u500B\u5B57\u3002", /*#__PURE__*/React.createElement("b", null, "\u6BCF\u4E00\u683C\u90FD\u53EF\u4EE5\u76F4\u63A5\u6539"), "\uFF0C\u78BA\u8A8D\u6C92\u554F\u984C\u518D\u5EFA\u7ACB\u3002 \u7A7A\u767D\u7684\u6B04\u4F4D\u6703\u81EA\u52D5\u8DF3\u904E\u90A3\u4E00\u984C\u3002"), assignBox(), picked.story && canDo.story && (() => {
      /* v542：短文填空變成**一疊**（合併 24 個字要出好幾篇）。
         每一篇各自校稿、各自「換一篇」——換掉一篇不要動到其他篇。 */
      var nWant = window.qsChunkEven ? window.qsChunkEven(words, Math.max(3, Math.min(maxQ, window.QS_SPLIT && window.QS_SPLIT.story.per || 6))).length : 1;
      var upd = (si, patch) => setStories(xs => xs.map((x, j) => j === si ? {
        ...x,
        ...patch
      } : x));
      return /*#__PURE__*/React.createElement("div", {
        className: "qs-story"
      }, /*#__PURE__*/React.createElement("div", {
        className: "qs-story-head"
      }, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDCD6 \u77ED\u6587\u586B\u7A7A"), /*#__PURE__*/React.createElement("span", {
        className: 'qs-story-n' + (stories.length ? '' : ' warn')
      }, stories.length ? `${stories.length} 篇` : '這次沒生出來', stories.length && stories.length < nWant ? `（少了 ${nWant - stories.length} 篇）` : '')), !stories.length && /*#__PURE__*/React.createElement("div", {
        className: "qs-story-warn"
      }, "\u26A0 \u9019\u6B21\u6C92\u751F\u51FA\u4F86\uFF08\u5176\u4ED6 ", Math.max(0, chosen.length - 1), " \u500B\u7DF4\u7FD2\u4E0D\u53D7\u5F71\u97FF\uFF09\u2014\u2014 \u518D\u6309\u4E00\u6B21\u300CAI \u51FA\u984C\u300D\uFF0C\u6216\u76F4\u63A5\u5EFA\u7ACB\u3001\u4E4B\u5F8C\u518D\u88DC\u3002"), stories.map((story, si) => {
        var mine = (story.words || []).length ? story.words : words;
        var nb = ((story.passage || '').match(/\[[^\]]+\]/g) || []).length;
        var c = story.check || {};
        var bad = [];
        if ((c.missing || []).length) bad.push(`短文裡沒有出現：${c.missing.join('、')}`);
        if ((c.extra || []).length) bad.push(`挖到不是這一課的字：${c.extra.join('、')}`);
        if ((c.leaked || []).length) bad.push(`答案出現在括號外面：${c.leaked.join('、')}`);
        return /*#__PURE__*/React.createElement("div", {
          className: "qs-story-one",
          key: si
        }, /*#__PURE__*/React.createElement("div", {
          className: "qs-story-head"
        }, /*#__PURE__*/React.createElement("span", {
          className: "qs-story-i"
        }, stories.length > 1 ? `第 ${si + 1} 篇` : '短文'), /*#__PURE__*/React.createElement("span", {
          className: "qs-story-n"
        }, nb, " \u500B\u7A7A\u683C"), /*#__PURE__*/React.createElement("span", {
          style: {
            flex: 1
          }
        }), /*#__PURE__*/React.createElement("button", {
          type: "button",
          className: "qs-story-re",
          disabled: reStoryAt >= 0,
          onClick: async () => {
            setReStoryAt(si);
            try {
              var st2 = await window.aiMakeVocabStory(mine, {
                hint: title.trim(),
                grade,
                teacherNote: aiNote,
                blanks: Math.min(maxQ, window.QS_SPLIT && window.QS_SPLIT.story.per || 6),
                avoid: stories.filter((_, j) => j !== si).map(x => String(x.full || x.passage || '')),
                rescue: () => rows
              });
              if (st2) upd(si, {
                ...st2,
                words: mine
              });
            } catch (e) {/* 失敗就維持原本那一篇，不要把老師手上的東西弄不見 */}
            setReStoryAt(-1);
          }
        }, reStoryAt === si ? '生成中…' : '🔁 換一篇')), /*#__PURE__*/React.createElement("label", {
          className: "qs-story-lab"
        }, "\u6A19\u984C"), /*#__PURE__*/React.createElement("input", {
          value: story.title || '',
          onChange: e => upd(si, {
            title: e.target.value
          })
        }), /*#__PURE__*/React.createElement("label", {
          className: "qs-story-lab"
        }, "\u77ED\u6587\uFF08", /*#__PURE__*/React.createElement("code", null, "[\u7B54\u6848]"), " \u662F\u7A7A\u683C\uFF0C\u5F8C\u9762\u53EF\u4EE5\u52A0 ", /*#__PURE__*/React.createElement("code", null, "(\u63D0\u793A)"), "\uFF0C \u4F8B\uFF1A", /*#__PURE__*/React.createElement("code", null, "[soaring](ing)"), "\uFF09", /*#__PURE__*/React.createElement("span", {
          className: "qs-story-sub"
        }, "\xB7 \u6316 ", nb, " \u683C\uFF0CWord Bank \u7D66 ", Math.min(window.QS_SPLIT && window.QS_SPLIT.story.bank || 10, words.length), " \u500B\u5B57 \uFF08\u5176\u4ED6\u7576\u8A98\u7B54\uFF09\u2014\u2014\u60F3\u591A\u6316\u5C31\u81EA\u5DF1\u52A0 ", /*#__PURE__*/React.createElement("code", null, "[ ]"))), /*#__PURE__*/React.createElement("textarea", {
          rows: 7,
          value: story.passage || '',
          onChange: e => upd(si, {
            passage: e.target.value,
            check: window.storyCheck ? window.storyCheck(e.target.value, mine, {
              partial: true
            }) : c
          })
        }), bad.length ? /*#__PURE__*/React.createElement("div", {
          className: "qs-story-warn"
        }, "\u26A0 ", bad.join('；')) : /*#__PURE__*/React.createElement("div", {
          className: "qs-story-ok"
        }, "\u2713 \u9019\u4E00\u7BC7\u7684\u55AE\u5B57\u90FD\u5728\u3001\u6316\u4E86 ", nb, " \u683C\uFF0C\u6C92\u6709\u6D29\u6F0F\u7B54\u6848"), (story.fixes || []).length > 0 && /*#__PURE__*/React.createElement("div", {
          className: "qs-story-fix"
        }, "\uD83D\uDD27 \u5DF2\u81EA\u52D5\u4FEE\u597D\uFF1A", story.fixes.join('；')));
      }));
    })(), (sense || []).length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "qs-story",
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "qs-story-head"
    }, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDD0D \u5B57\u7FA9\u9078\u64C7"), /*#__PURE__*/React.createElement("span", {
      className: "qs-story-n"
    }, sense.length, " \u984C"), sense.length < words.length && /*#__PURE__*/React.createElement("span", {
      className: "qs-story-n warn"
    }, words.length - sense.length, " \u500B\u5B57\u6C92\u51FA\u6210\u529F\uFF08\u7B54\u6848\u5C0D\u4E0D\u4E0A\u5C31\u4E0D\u7D66\u5B78\u751F\uFF09")), sense.map((x, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "qs-sense-q"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qs-sense-head"
    }, /*#__PURE__*/React.createElement("b", null, x.word), x.title && /*#__PURE__*/React.createElement("em", null, x.title)), /*#__PURE__*/React.createElement("textarea", {
      rows: 2,
      value: x.passage,
      onChange: e => setSense(ss => ss.map((y, j) => j === i ? {
        ...y,
        passage: e.target.value
      } : y))
    }), x.options.map((o, oi) => /*#__PURE__*/React.createElement("label", {
      key: oi,
      className: 'qs-sense-opt' + (oi === x.answer ? ' on' : '')
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      checked: oi === x.answer,
      onChange: () => setSense(ss => ss.map((y, j) => j === i ? {
        ...y,
        answer: oi
      } : y))
    }), /*#__PURE__*/React.createElement("input", {
      value: o,
      onChange: e => setSense(ss => ss.map((y, j) => j === i ? {
        ...y,
        options: y.options.map((z, k) => k === oi ? e.target.value : z)
      } : y))
    }))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, x.explain))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u26A0 \u56DB\u500B\u9078\u9805\u8981", /*#__PURE__*/React.createElement("b", null, "\u5168\u90E8\u90FD\u662F\u5B9A\u7FA9"), "\uFF0C\u800C\u4E14\u932F\u7684\u4E09\u500B\u8981\u662F", /*#__PURE__*/React.createElement("b", null, "\u9019\u500B\u5B57\u7684\u5176\u4ED6\u610F\u601D"), "\uFF08\u50CF\u8003\u5377\u4E0A\u7684 shade\uFF1A\u6DBC\u723D\u8655\uFF0F\u504F\u6697\u7684\u984F\u8272\uFF0F\u71C8\u7F69\uFF0F\u628A\u6771\u897F\u85CF\u8D77\u4F86\uFF09\u3002 \u63DB\u6210\u5225\u7684\u55AE\u5B57\u7684\u5B9A\u7FA9\u5C31\u8B8A\u56DE\u914D\u5C0D\u984C\u4E86\u3002")), /*#__PURE__*/React.createElement("div", {
      className: "qs-proof",
      style: {
        marginTop: 12
      }
    }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "qs-proof-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "qs-proof-w"
    }, /*#__PURE__*/React.createElement("input", {
      value: r.word,
      onChange: e => updRow(i, 'word', e.target.value)
    }), /*#__PURE__*/React.createElement("input", {
      className: "qs-proof-zhin",
      value: r.zh,
      placeholder: "\u4E2D\u6587\u610F\u601D",
      onChange: e => updRow(i, 'zh', e.target.value)
    })), /*#__PURE__*/React.createElement("div", {
      className: "qs-proof-f"
    }, /*#__PURE__*/React.createElement("label", null, "\u82F1\u6587\u5B9A\u7FA9\uFF08\u914D\u5C0D\u9023\u7DDA\u7528\uFF09"), /*#__PURE__*/React.createElement("textarea", {
      rows: 2,
      value: r.def,
      onChange: e => updRow(i, 'def', e.target.value)
    }), /*#__PURE__*/React.createElement("label", null, "\u60C5\u5883\u4F8B\u53E5\uFF08\u586B\u7A7A\u7528\uFF0C\u7A7A\u683C\u8ACB\u7559 ", /*#__PURE__*/React.createElement("code", null, "___"), "\uFF09"), /*#__PURE__*/React.createElement("textarea", {
      rows: 2,
      value: r.sentence,
      onChange: e => updRow(i, 'sentence', e.target.value)
    }), /*#__PURE__*/React.createElement("div", {
      className: "qs-proof-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u7B54\u6848"), /*#__PURE__*/React.createElement("input", {
      value: r.answer,
      onChange: e => updRow(i, 'answer', e.target.value)
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u4E2D\u6587\u89E3\u8AAA"), /*#__PURE__*/React.createElement("textarea", {
      rows: 2,
      value: r.explain,
      onChange: e => updRow(i, 'explain', e.target.value)
    })))))))), /*#__PURE__*/React.createElement("div", {
      className: "modal-foot"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: () => setRows(null)
    }, "\u2190 \u56DE\u4E0A\u4E00\u6B65"), /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: runAI,
      disabled: !!busy
    }, busy ? '重新出題中…' : '↻ 重新出一次'), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: () => onCreate(payload({
        ai: rows
      }))
    }, "\u5EFA\u7ACB ", chosen.length, " \u500B\u7DF4\u7FD2", assign ? '並指派' : '', " \u2192"))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: nudge
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal wide" + nudgeCls,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\u8CBC\u4E00\u6B21\u55AE\u5B57\uFF0C", /*#__PURE__*/React.createElement("em", null, "\u4E00\u6B21\u5EFA\u7ACB\u6574\u5957\u7DF4\u7FD2")), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qs-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u55AE\u5B57\u6E05\u55AE"), /*#__PURE__*/React.createElement("textarea", {
    className: "qs-ta",
    rows: 11,
    value: text,
    onChange: e => setText(e.target.value),
    placeholder: "一行一個字：英文 - 中文 - 例句 - 英文定義（中文之後都可以省略）\n也可以直接從 Excel／Google 試算表整段貼過來\n\npharaoh - 法老 - The pharaoh ruled ancient Egypt. - a king in ancient Egypt\npyramid - 金字塔 - They built a huge pyramid.\ntomb - 墳墓"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u5206\u9694\u7B26\u865F Tab\uFF0F", /*#__PURE__*/React.createElement("code", null, "|"), "\uFF0F\u9017\u865F\uFF0F", /*#__PURE__*/React.createElement("code", null, " - "), " \u90FD\u5403\u3002 \u76EE\u524D ", /*#__PURE__*/React.createElement("b", null, words.length), " \u500B\u5B57\uFF08\u6709\u4E2D\u6587 ", withZh.length, "\u3001\u6709\u4F8B\u53E5 ", withEx.length, "\u3001\u6709\u5B9A\u7FA9 ", withDef.length, "\uFF09\u3002", withDef.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, "\u3000\u4F60\u5BEB\u7684 ", withDef.length, " \u500B\u5B9A\u7FA9\u6703", /*#__PURE__*/React.createElement("b", null, "\u539F\u5C01\u4E0D\u52D5"), "\u4F7F\u7528\uFF08\u914D\u5C0D\u3001\u9078\u64C7\u984C\u3001\u89E3\u8AAA\u90FD\u7528\u540C\u4E00\u53E5\uFF09\uFF0CAI \u4E0D\u6703\u53E6\u5916\u6539\u5BEB\uFF1B\u6C92\u5BEB\u5B9A\u7FA9\u7684\u90A3\u5E7E\u500B\u624D\u7531 AI \u88DC\u3002")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u9019\u4E00\u7D44\u53EB\u4EC0\u9EBC"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "\u4F8B\uFF1AUnit 5 \xB7 Ancient Egypt"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u6240\u6709\u7DF4\u7FD2\u90FD\u6703\u7528\u9019\u500B\u540D\u5B57\uFF0C\u4E26\u81EA\u52D5\u6B78\u6210\u540C\u4E00\u7D44\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u653E\u5728\u54EA\u4E00\u985E"), /*#__PURE__*/React.createElement("select", {
    className: "qs-sel",
    value: cat,
    onChange: e => setCat(e.target.value)
  }, (categories || []).map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.zh || c.titleZh || c.title || c.id)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u8981\u5EFA\u7ACB\u54EA\u4E9B\u7DF4\u7FD2"), alreadyHave && alreadyHave.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "field-help qs-have"
  }, "\u9019\u4E00\u7D44\u5DF2\u7D93\u6709\uFF1A", /*#__PURE__*/React.createElement("b", null, QS_KINDS.filter(k => alreadyHave.indexOf(k.id) >= 0).map(k => k.zh).join('、')), "\u3002 \u4E0B\u9762\u53EA\u5148\u52FE", /*#__PURE__*/React.createElement("b", null, "\u9084\u6C92\u6709\u7684"), "\u2014\u2014\u6309\u4E0B\u53BB\u5C31\u53EA\u88DC\u90A3\u5E7E\u500B\uFF0C\u539F\u672C\u7684\u4E00\u984C\u90FD\u4E0D\u6703\u52D5\u3002 \u60F3\u91CD\u51FA\u4E00\u4EFD\u4E0D\u4E00\u6A23\u7684\uFF0C\u81EA\u5DF1\u52FE\u56DE\u53BB\u5C31\u597D\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "qs-kinds"
  }, QS_KINDS.map(k => {
    var ok = canDo[k.id];
    var has = !!(alreadyHave && alreadyHave.indexOf(k.id) >= 0);
    return /*#__PURE__*/React.createElement("label", {
      key: k.id,
      className: 'qs-kind' + (picked[k.id] && ok ? ' on' : '') + (ok ? '' : ' off')
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      disabled: !ok,
      checked: !!picked[k.id] && ok,
      onChange: e => setPicked(p => ({
        ...p,
        [k.id]: e.target.checked
      }))
    }), /*#__PURE__*/React.createElement("span", {
      className: "qs-kind-zh"
    }, k.zh, has && /*#__PURE__*/React.createElement("em", {
      className: "qs-kind-has"
    }, "\u5DF2\u7D93\u6709\u4E86")), /*#__PURE__*/React.createElement("span", {
      className: "qs-kind-note"
    }, ok ? k.note : '資料不夠：' + k.note));
  })), /*#__PURE__*/React.createElement("div", {
    className: "qs-split"
  }, /*#__PURE__*/React.createElement("label", {
    className: "qs-split-l"
  }, "\u4E00\u500B\u7DF4\u7FD2\u6700\u591A"), /*#__PURE__*/React.createElement("input", {
    className: "qs-split-n",
    type: "number",
    min: "2",
    max: "40",
    value: maxQ,
    onChange: e => setMaxQ(Math.max(2, Math.min(40, +e.target.value || 10)))
  }), /*#__PURE__*/React.createElement("span", {
    className: "qs-split-l"
  }, "\u984C"), /*#__PURE__*/React.createElement("span", {
    className: "qs-split-n2"
  }, (() => {
    var n = words.length;
    if (!n) return '貼上單字之後會算給你看';
    var g = window.qsChunkEven ? window.qsChunkEven(words, maxQ) : [words];
    var sePer = Math.min(maxQ, window.QS_SPLIT && window.QS_SPLIT.sense.per || 8);
    var sg = window.qsChunkEven ? window.qsChunkEven(words, sePer) : [words];
    var stPer = Math.max(3, Math.min(maxQ, window.QS_SPLIT && window.QS_SPLIT.story.per || 6));
    var st = window.qsChunkEven ? window.qsChunkEven(words, stPer) : [words];
    var bits = [`${n} 個字 → 測驗／填空／聽寫各 ${g.length} 份（${g.map(x => x.length).join('+')} 題）`];
    if (picked.sense && canDo.sense) bits.push(`字義選擇 ${sg.length} 份`);
    if (picked.story && canDo.story) bits.push(`短文 ${st.length} 篇（每篇挖 ${Math.min(stPer, st[0].length)} 格）`);
    bits.push('單字卡不切');
    return bits.join('　·　');
  })()))))), /*#__PURE__*/React.createElement("label", {
    className: 'qs-ai' + (useAI ? ' on' : '')
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: useAI,
    onChange: e => setUseAI(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", {
    className: "qs-ai-t"
  }, "\u2728 \u7528 AI \u51FA\u984C\uFF08\u914D\u5C0D\u9023\u7DDA\u7684", /*#__PURE__*/React.createElement("b", null, "\u82F1\u6587\u5B9A\u7FA9"), "\u3001\u586B\u7A7A\u7684", /*#__PURE__*/React.createElement("b", null, "\u60C5\u5883\u4F8B\u53E5\uFF0B\u4E2D\u6587\u89E3\u8AAA"), "\uFF09"), /*#__PURE__*/React.createElement("span", {
    className: "qs-ai-n"
  }, "\u51FA\u5B8C\u6703\u5148\u8B93\u4F60\u9010\u984C\u6821\u7A3F\u518D\u5EFA\u7ACB\u3002\u4E0D\u52FE\u7684\u8A71\uFF1A\u914D\u5C0D\uFF1D\u55AE\u5B57\u5C0D\u4E2D\u6587\u3001\u586B\u7A7A\uFF1D\u628A\u4F60\u8CBC\u7684\u4F8B\u53E5\u6316\u7A7A\u3002")), useAI && /*#__PURE__*/React.createElement("div", {
    className: "qs-band"
  }, /*#__PURE__*/React.createElement("span", {
    className: "qs-band-l"
  }, "\u96E3\u5EA6"), [['g1', 'G1–G2', '句子最短最簡單'], ['g3', 'G3–G4', '一般'], ['g5', 'G5–G6', '句子長一點、用字多一點']].map(([g, t, n]) => /*#__PURE__*/React.createElement("button", {
    key: g,
    type: "button",
    className: 'qs-band-b' + ((window.vocabBandOf ? window.vocabBandOf(grade) === window.vocabBandOf(g) : grade === g) ? ' on' : ''),
    onClick: () => setGrade(g)
  }, /*#__PURE__*/React.createElement("b", null, t), /*#__PURE__*/React.createElement("em", null, n))), /*#__PURE__*/React.createElement("span", {
    className: "qs-band-note"
  }, "\u4E0D\u7BA1\u54EA\u4E00\u7D1A\uFF0C\u4F8B\u53E5\u4E00\u5B9A\u6703\u7559\u7DDA\u7D22\u8B93\u5B69\u5B50\u731C\u5F97\u51FA\u7B54\u6848\u3002")), wantAI && /*#__PURE__*/React.createElement(AiNoteBox, {
    value: aiNote,
    onChange: setAiNote,
    examples: "\u77ED\u6587\u7528\u842C\u8056\u7BC0\u7576\u80CC\u666F\uFF5C\u4F8B\u53E5\u90FD\u7528\u5B78\u6821\u751F\u6D3B\uFF5C\u5B9A\u7FA9\u5BEB\u7C21\u55AE\u4E00\u9EDE\uFF0C\u4E09\u5E74\u7D1A\u770B\u5F97\u61C2\uFF5C\u77ED\u6587\u53EA\u6316 3 \u683C"
  }), aiErr && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg err",
    style: {
      marginTop: 8
    }
  }, "\u26A0\uFE0F ", aiErr), !wantAI && assignBox()), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onClose
  }, "\u53D6\u6D88"), wantAI ? /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: !ready || !!busy,
    onClick: runAI
  }, busy ? slow.length ? `${slow.join('、')}還在出…（要多檢查一輪）` : `AI 出題中… ${Math.floor(busy)}/${words.length}` : ready ? `✨ AI 出題（${words.length} 個字）→` : '先貼單字並取個名字') : /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: !ready,
    onClick: () => onCreate(payload())
  }, ready ? `建立 ${chosen.length} 個練習${assign ? '並指派' : ''} →` : '先貼單字並取個名字'))));
}

/* ══════════════════════════════════════════════════════════════════════════
   v466：🔁 排一份複習到別週
   ──────────────────────────────────────────────────────────────────────────
   Alan：「單字那一課只會在那一週出現，我想每隔一週就讓他們複習。
          單字卡當然不用再換，但 fill in the blank 或故事型的題目就可以換。」
   做法：單字從這一組的單字卡拿（term/zh/example 都在），
        把「上次出過的所有句子」餵進 prompt 說不可以再用，重出一份新題目放到目標週。
   ⚠ 單字卡本身照抄一份過去（同一批字，學生複習前可以先看一遍）——Alan 明講不用換。
   ══════════════════════════════════════════════════════════════════════════ */
function ReviewGroupModal({
  open,
  groupName,
  catId,
  items,
  weekChoices,
  curWeekId,
  grade,
  onClose,
  onCreate
}) {
  var [nudgeCls, nudge] = useModalNudge();
  var w = window.reviewWordsOf ? window.reviewWordsOf(items) : [];
  var seen = window.reviewSeenSentences ? window.reviewSeenSentences(items) : [];
  /* v469：這一組是單字還是文法？單字看有沒有單字卡，文法看有沒有互動教學。 */
  var gram = w.length >= 2 ? null : window.reviewGrammarOf ? window.reviewGrammarOf(items) : null;
  var isGram = !!gram;
  /* 預設排到「兩週後」——Alan 要的是「每隔一週複習一次」。
     找不到就退回清單裡第一個比現在晚的週次。 */
  var later = (weekChoices || []).filter(c => c.id !== curWeekId);
  var curIx = (weekChoices || []).findIndex(c => c.id === curWeekId);
  var defWeek = (weekChoices || [])[curIx + 2] || (weekChoices || [])[curIx + 1] || later[0] || null;
  var [week, setWeek] = useS(defWeek ? defWeek.id : '');
  var [kinds, setKinds] = useS(['quiz', 'fillblank', 'story', 'sense', 'def-match', 'spelling']);
  // v469：文法複習要出幾題（跟一鍵出文法同一組題型，只是不重出互動教學）
  var [gN, setGN] = useS({
    nMcq: 6,
    nFill: 6,
    nRw: 4,
    nTr: 3,
    nEdit: 5,
    nDiag: 0,
    nOrd: 0,
    nTf: 4,
    nWrite: 0,
    nCircle: 0,
    nSort: 0
  });
  var [asHw, setAsHw] = useS(true);
  var [due, setDue] = useS('');
  var [busy, setBusy] = useS(0);
  /* 🔴 v476（Alan：「重出題目中卡在 8/8 也太久」）：busy 只數「單字題目」做到第幾個字，
     8/8 之後還在等短文填空與字義選擇——那兩個都要「出題 → 另一個 AI 交叉檢查 →
     沒過的再出一次」，本來就比較久，但畫面什麼都不說，看起來就像當掉。
     改成明講還在等誰，等完一個就從清單裡拿掉。 */
  var [slow, setSlow] = useS([]);
  var [err, setErr] = useS('');
  var [note, setNote] = useS('');

  /* 🔴 v473（Alan 回報三件事）：
     ① 單字卡本來是「打勾且不能取消」，但 kinds 的預設值裡根本沒有 flashcard
        → 畫面說「會照抄一份過去」，實際上**從來沒有抄**。說一套做一套。
        Alan：「不需要出額外單字卡，但如果學生忘記，至少要給『是否複習單字卡』這個選項。」
        → 改成真的選項，預設不勾；勾了才複製一份過去。
     ② 短文填空出不來——見下面 run() 裡的說明（生出來又被丟掉）。
     ③ 字義選擇（v468 的康橋第一大題）本來就沒有出現在這個清單裡。 */
  var KINDS = [['quiz', '📝 測驗（新題目）', false], ['fillblank', '✏️ 填空（新句子）', false], ['story', '📖 短文填空（新短文）', false], ['sense', '🔎 字義選擇（康橋第一大題）', false], ['def-match', '🔗 配對連線', false], ['spelling', '🔊 聽寫', false], ['flashcard', '🃏 也放一份單字卡（怕學生忘記）', false]];
  var toggle = k => setKinds(ks => ks.indexOf(k) >= 0 ? ks.filter(x => x !== k) : ks.concat(k));
  var run = async () => {
    if (!week) {
      setErr('請先選要排到哪一週');
      return;
    }
    setErr('');
    setBusy(0.0001);
    try {
      if (isGram) {
        /* v469 文法複習：用同一個教學重點重出一份題目，
           並把上次出過的句子當 avoid 送進去（跟單字那邊同一套）。
           ⚠ 互動教學不重出——那一課教的東西沒變，重出只會讓學生再看一次一樣的講解。 */
        var pack = await window.aiMakeGrammarPack({
          topic: gram.topic,
          notes: gram.notes,
          grade,
          teacherNote: note,
          avoid: seen,
          ...gN,
          onProgress: (d, t) => setBusy(Math.max(0.0001, d))
        });
        onCreate({
          targetWeekId: week,
          catId,
          groupName,
          grammar: pack,
          topic: gram.topic,
          dueDate: asHw ? due || null : null
        });
        setBusy(0);
        return;
      }
      var wantStory = kinds.indexOf('story') >= 0;
      var wantSense = kinds.indexOf('sense') >= 0;
      var exP = window.aiMakeVocabExercises(w, {
        hint: groupName,
        grade,
        teacherNote: note,
        avoid: seen,
        onProgress: d => setBusy(d)
      });
      var drop = n2 => setSlow(xs => xs.filter(x => x !== n2));
      /* v542：複習一整組（可能是合併來的好幾十個字）也要拆成好幾篇 */
      var stP = wantStory && window.aiMakeVocabStories ? window.aiMakeVocabStories(w, {
        hint: groupName,
        grade,
        teacherNote: note,
        avoid: seen,
        rescue: () => exP
      }).catch(e => e).then(r => {
        drop('短文填空');
        return r;
      }) : Promise.resolve(null);
      // v473：字義選擇也要能複習（avoid 一樣送進去，短文不會跟上次一樣）
      var seP = wantSense && window.aiMakeVocabSense ? window.aiMakeVocabSense(w, {
        hint: groupName,
        grade,
        teacherNote: note,
        avoid: seen
      }).catch(e => e).then(r => {
        drop('字義選擇');
        return r;
      }) : Promise.resolve(null);
      // 單字題目一做完，就換成「還在等這幾種」——不要讓畫面停在 8/8 不動
      exP.then(() => setSlow([wantStory && '短文填空', wantSense && '字義選擇'].filter(Boolean)));
      var [ai, story0, sense0] = await Promise.all([exP, stP, seP]);
      setSlow([]);
      /* ⚠ 這兩種失敗了不該整份停掉（其他練習都好了），但也**不可以默默消失**——
         本來是 .catch(() => null)，老師只會看到「短文填空不見了」卻不知道為什麼。 */
      var soft = [];
      var st = story0 instanceof Error ? (soft.push('短文填空'), []) : story0 || [];
      var stories = st.filter(x => x && !x.error);
      if (st.length - stories.length) soft.push(`短文填空有 ${st.length - stories.length} 篇`);
      var sense = sense0 instanceof Error ? (soft.push('字義選擇'), null) : sense0;
      onCreate({
        targetWeekId: week,
        catId,
        groupName,
        words: w,
        ai,
        stories,
        sense,
        /* 🔴 v473：本來寫 kinds.filter(k => k !== 'story')，把 story 濾掉了——
           但 qsBuildItems 要靠 kinds 裡有 'story' 才會建那個單元。
           結果是：短文真的生出來了（花了一次 AI 請求），然後被丟掉。 */
        kinds,
        dueDate: asHw ? due || null : null
      });
      if (soft.length) setErr(`其他都出好了，只有${soft.join('、')}這次沒出來（AI 回得不乾淨）。想要的話再按一次。`);
    } catch (e) {
      setErr(e && e.message || '重出題目失敗，請再試一次。');
    }
    setSlow([]);
    setBusy(0); // v476：失敗也要歸零
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: nudge
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal wide" + nudgeCls,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\uD83D\uDD01 \u6392\u4E00\u4EFD\u8907\u7FD2 ", /*#__PURE__*/React.createElement("em", null, groupName)), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: onClose
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, isGram ? /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 12
    }
  }, "\u7528", /*#__PURE__*/React.createElement("b", null, "\u540C\u4E00\u500B\u6587\u6CD5\u91CD\u9EDE"), "\uFF08", gram.topic, "\uFF09\u91CD\u51FA\u4E00\u4EFD", /*#__PURE__*/React.createElement("b", null, "\u4E0D\u4E00\u6A23"), "\u7684\u984C\u76EE\uFF0C\u6392\u5230\u4E4B\u5F8C\u7684\u67D0\u4E00\u9031\u3002 \u4E0A\u6B21\u51FA\u904E\u7684 ", seen.length, " \u500B\u53E5\u5B50\u6703\u9001\u9032\u53BB\u544A\u8A34 AI\u300C\u4E0D\u53EF\u4EE5\u518D\u7528\u300D\u3002", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "\u4E92\u52D5\u6559\u5B78\u4E0D\u6703\u91CD\u51FA"), "\u2014\u2014\u90A3\u4E00\u8AB2\u6559\u7684\u6771\u897F\u6C92\u8B8A\uFF0C\u518D\u770B\u4E00\u6B21\u4E00\u6A23\u7684\u8B1B\u89E3\u6C92\u610F\u7FA9\u3002", !gram.fromNotes && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "\u26A0 \u9019\u4E00\u7D44\u662F v466 \u4E4B\u524D\u51FA\u7684\uFF0C\u6C92\u6709\u7559\u4E0B\u4F60\u539F\u672C\u7684\u6559\u5B78\u91CD\u9EDE"), "\uFF0C \u6211\u662F\u5F9E\u4E92\u52D5\u6559\u5B78\u7684\u5167\u5BB9\u53CD\u63A8\u7684\uFF0C\u51FA\u4F86\u7684\u984C\u76EE\u53EF\u80FD\u504F\u6389\u3002\u4E0D\u6EFF\u610F\u5C31\u7528\u300C\uD83D\uDCAC \u9019\u6B21\u7684\u7279\u5225\u8981\u6C42\u300D\u88DC\u4E00\u53E5\u3002")) : /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 12
    }
  }, "\u7528", /*#__PURE__*/React.createElement("b", null, "\u540C\u4E00\u6279 ", w.length, " \u500B\u55AE\u5B57"), "\u91CD\u51FA\u4E00\u4EFD", /*#__PURE__*/React.createElement("b", null, "\u4E0D\u4E00\u6A23"), "\u7684\u984C\u76EE\uFF0C\u6392\u5230\u4E4B\u5F8C\u7684\u67D0\u4E00\u9031\u3002 \u4E0A\u6B21\u51FA\u904E\u7684 ", seen.length, " \u500B\u53E5\u5B50\u6703\u9001\u9032\u53BB\u544A\u8A34 AI\u300C\u4E0D\u53EF\u4EE5\u518D\u7528\u300D\uFF0C\u6240\u4EE5\u5C0F\u670B\u53CB\u6C92\u8FA6\u6CD5\u80CC\u7B54\u6848\u3002", /*#__PURE__*/React.createElement("br", null), "\u9810\u8A2D", /*#__PURE__*/React.createElement("b", null, "\u4E0D"), "\u653E\u55AE\u5B57\u5361\uFF08\u540C\u4E00\u6279\u5B57\u4E0D\u7528\u770B\u5169\u6B21\uFF09\u3002\u6015\u5B78\u751F\u5FD8\u8A18\u7684\u8A71\uFF0C\u4E0B\u9762\u53EF\u4EE5\u52FE\u300C\u4E5F\u653E\u4E00\u4EFD\u55AE\u5B57\u5361\u300D\u3002"), !isGram && w.length < 2 && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, "\u9019\u4E00\u7D44\u627E\u4E0D\u5230\u55AE\u5B57\u5361\uFF0C\u4E5F\u627E\u4E0D\u5230\u4E92\u52D5\u6559\u5B78\uFF0C\u6C92\u8FA6\u6CD5\u6392\u8907\u7FD2\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u6392\u5230\u54EA\u4E00\u9031"), /*#__PURE__*/React.createElement("select", {
    value: week,
    onChange: e => setWeek(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\uFF08\u9078\u4E00\u9031\uFF09"), later.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.label, c.id === (defWeek && defWeek.id) ? '（建議・隔一週）' : '')))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u8981\u51FA\u54EA\u4E9B"), isGram ? /*#__PURE__*/React.createElement("div", {
    className: "gn-count-grid"
  }, [['📝 選擇題', 'nMcq', 15], ['✏️ 填空題', 'nFill', 15], ['✍️ 改寫句子', 'nRw', 10], ['🔤 中翻英', 'nTr', 10], ['📝 整段改錯', 'nEdit', 8], ['🔎 錯在哪裡', 'nDiag', 8], ['🔄 句型轉換', 'nTf', 10], ['🧩 排順序', 'nOrd', 10]].map(([lb, key, max]) => /*#__PURE__*/React.createElement("div", {
    className: "field",
    key: key
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, lb), /*#__PURE__*/React.createElement("select", {
    value: gN[key],
    onChange: e => setGN(g => ({
      ...g,
      [key]: +e.target.value
    }))
  }, Array.from({
    length: max + 1
  }, (_, n) => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n ? n + ' 題' : '不要')))))) : /*#__PURE__*/React.createElement("div", {
    className: "gn-count-grid"
  }, KINDS.map(([k, label, fixed]) => /*#__PURE__*/React.createElement("label", {
    key: k,
    className: "rv-kind"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: fixed || kinds.indexOf(k) >= 0,
    disabled: fixed,
    onChange: () => toggle(k)
  }), /*#__PURE__*/React.createElement("span", null, label))))), /*#__PURE__*/React.createElement(window.AiNoteBox, {
    value: note,
    onChange: setNote,
    examples: "\u9019\u6B21\u7684\u53E5\u5B50\u63DB\u6210\u6821\u5712\u751F\u6D3B\uFF5C\u4E0D\u8981\u518D\u7528\u52D5\u7269\u7576\u4E3B\u89D2\uFF5C\u53E5\u5B50\u9577\u4E00\u9EDE"
  }), /*#__PURE__*/React.createElement("label", {
    className: "rv-hw"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: asHw,
    onChange: e => setAsHw(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, "\u9806\u4FBF\u8A2D\u6210\u90A3\u4E00\u9031\u7684\u4F5C\u696D"), asHw && /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: due,
    onChange: e => setDue(e.target.value),
    onClick: e => e.stopPropagation()
  })), err && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, err)), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onClose
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: !week || !isGram && w.length < 2 || !!busy,
    onClick: run
  }, busy ? isGram ? '重出題目中…' : slow.length ? `${slow.join('、')}還在出…（要多檢查一輪）` : `重出題目中… ${Math.floor(busy)}/${w.length}` : `✨ 重出一份並排進去 →`))));
}

/* 真正產生各個單元的資料。抽出來是為了好測。 */
/* ══ v482 📘 一鍵出 Word Study ════════════════════════════════════════════
   Alan：「老師都會出給一個 story 要學生圈出這次的 word study 的單字，
   但不一定會給有幾個——主要就是要知道這次的 word study 是什麼並且找出來。」
   老師只要打「這次教什麼」（＋選填課本的 spelling list），剩下全自動。 */
var WS_KINDS = [{
  id: 'lesson',
  zh: '📘 先學一下',
  note: '用一句話講清楚這次的規則，學完才解鎖練習'
}, {
  id: 'circle',
  zh: '⭕ 圈出來',
  note: '一列字裡，把符合規則的點出來（課本的第一題）'
}, {
  id: 'sort',
  zh: '🗂 分一分',
  note: '照子類分籃：long a／long i…、-ty／-ity／-ic／-ment…'
}, {
  id: 'mcq',
  zh: '📝 選擇題',
  note: '四選一「哪一個符合規則」（康橋測驗頁就是這種）'
}, {
  id: 'build',
  zh: '✏️ 加字尾',
  note: '看意思寫出加了字尾的字（只有字首字尾類才有）'
}, {
  id: 'story',
  zh: '📖 短文找字',
  note: '讀一篇短文，把這次的 word study 單字找出來'
}];

/* v493：defaultTopic ＝ 學校進度表幫忙填好的主題（例 W7 的 Prefixes mis-, en-, & em-）。
   老師還是可以改——它只是免得每次手打、打錯週次。 */
/* ══ 🏫 v493 學校進度表匯入 ══════════════════════════════════════════════
   Alan 每學期會收到學校發的 Excel（SY26-27 Grade 4 Term 1-2.xlsx）。
   ⚠ 刻意做成「從 Excel 複製整張表貼過來」而不是上傳 .xlsx：
     解析 xlsx 要多載一個 400KB 的函式庫，但這件事**一學期只做一次**。
     Excel 複製出來的 TSV 會保留空格子，正好是「沿用」規則需要的資訊。
   ⚠ 解析完先**把 20 週全部列給老師看**，他確認了才存——
     學校哪天改版面，才不會靜靜地讀錯一整個學期。 */
function PacingImportModal({
  open,
  gradeKey,
  gradeName,
  existing,
  onClose,
  onSave
}) {
  var [tsv, setTsv] = useS('');
  var [pace, setPace] = useS(null);
  var [err, setErr] = useS('');
  var [busy, setBusy] = useS(false);
  var [paste, setPaste] = useS(false); // 讀檔失敗時的後備
  var fileRef = React.useRef(null);
  useE(() => {
    if (open) {
      setTsv('');
      setPace(null);
      setErr('');
      setBusy(false);
      setPaste(false);
    }
  }, [open]);
  if (!open) return null;

  /* 🔴 v494：**讀檔才拿得到粗體**。
     Alan：「G6 的 Grammar 那邊顯示很多頁數，但老師實際上只會教粗體的頁數」——
     粗體是「一格裡面部分文字」才粗，從 Excel 複製出來的 TSV 一定丟掉。 */
  var readFile = async f => {
    if (!f) return;
    setErr('');
    setBusy(true);
    try {
      var rows = await window.pacingReadXlsx(await f.arrayBuffer());
      var got = window.pacingFromRows(rows);
      if (!got) throw new Error('讀不到進度表——這份 Excel 裡找不到「WK / Unit / Reading」那一列標題。');
      setPace(got);
    } catch (e) {
      setErr(e && e.message || '讀檔失敗');
    }
    setBusy(false);
  };
  var readPaste = () => {
    setErr('');
    var got = window.pacingParse(tsv);
    if (!got) {
      setErr('讀不出來——請確認是「整張表一起複製」（含 WK / Unit / Reading 那一列標題）。');
      return;
    }
    setPace(got);
  };
  var cell = v => v && v !== '-' ? v : '—';
  var anyBold = pace && pace.some(w => w.lt.grammarBold);

  /* 🔴 v502（Alan：「匯入進去直接跑出這個 bug」）：
     `.modal-backdrop` 是 z-index:100，但老師後台 `.dash-overlay.tdash` 是 z-index:900
     → 從後台開這個視窗，它會開在後台**底下**，等於看不見。
     ⚠ 光調 z-index 不夠：後台是 position:fixed 的全螢幕容器，
       祖先只要有 transform 就會綁架子層的 fixed（v461 踩過）。
     → 跟 v433 的裝扮室一樣，**一律 createPortal 到 body**。 */
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop pace-top",
    onMouseDown: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal pace-modal",
    onMouseDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\uD83C\uDFEB \u5B78\u6821\u9032\u5EA6\u8868 \xB7 ", gradeName), /*#__PURE__*/React.createElement("button", {
    className: "modal-x",
    onClick: onClose
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, !pace ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "pace-drop"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pace-drop-ico"
  }, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", {
    className: "pace-drop-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u628A\u5B78\u6821\u767C\u7684 Excel \u9078\u9032\u4F86\u5C31\u597D"), /*#__PURE__*/React.createElement("em", null, "\u76F4\u63A5\u8B80\u6A94\u6848\u2014\u2014\u9019\u6A23\u624D\u8B80\u5F97\u5230", /*#__PURE__*/React.createElement("b", null, "\u7C97\u9AD4"), "\uFF08G6 \u7684\u300C\u53EA\u6559\u7C97\u9AD4\u9801\u6578\u300D\u9760\u5B83\uFF09")), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: busy,
    onClick: () => fileRef.current && fileRef.current.click()
  }, busy ? '讀取中…' : '選擇 .xlsx 檔'), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".xlsx",
    style: {
      display: 'none'
    },
    onChange: e => {
      readFile(e.target.files && e.target.files[0]);
      e.target.value = '';
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "pace-alt"
  }, /*#__PURE__*/React.createElement("button", {
    className: "link-btn",
    onClick: () => setPaste(v => !v)
  }, paste ? '收起' : '讀不進去？改用複製貼上')), paste && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "pace-warn"
  }, "\u26A0\uFE0F \u8CBC\u4E0A\u7684\u5167\u5BB9", /*#__PURE__*/React.createElement("b", null, "\u6C92\u6709\u7C97\u9AD4"), "\u2014\u2014G6\u300C\u53EA\u6559\u7C97\u9AD4\u9801\u6578\u300D\u9019\u4EF6\u4E8B\u6703\u62FF\u4E0D\u5230\uFF0C\u5176\u4ED6\u90FD\u4E00\u6A23\u3002"), /*#__PURE__*/React.createElement("textarea", {
    className: "field-input pace-in",
    value: tsv,
    onChange: e => setTsv(e.target.value),
    placeholder: "\u5728 Excel \u5168\u9078\uFF08\u2318/Ctrl + A\uFF09\u2192 \u8907\u88FD \u2192 \u8CBC\u5728\u9019\u88E1"
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    disabled: !tsv.trim(),
    onClick: readPaste
  }, "\u8B80\u8B80\u770B \u2192")), existing && /*#__PURE__*/React.createElement("div", {
    className: "pace-warn"
  }, "\u9019\u500B\u5E74\u7D1A\u5DF2\u7D93\u6709\u4E00\u4EFD\u9032\u5EA6\u8868\uFF08", existing.length, " \u9031\uFF09\u2014\u2014\u5B58\u6A94\u6703\u6574\u4EFD\u84CB\u6389\u3002"), err && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg err",
    style: {
      marginTop: 8
    }
  }, "\u26A0\uFE0F ", err)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "pace-ok"
  }, "\u2705 \u8B80\u5230 ", /*#__PURE__*/React.createElement("b", null, pace.length), " \u9031\u3002", /*#__PURE__*/React.createElement("b", null, "\u8ACB\u5148\u78BA\u8A8D\u4E0B\u9762\u9019\u5F35\u8868\u8DDF\u5B78\u6821\u767C\u7684\u4E00\u6A23"), "\uFF0C\u518D\u6309\u5132\u5B58\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "pace-tbl-wrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "pace-tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "\u9031"), /*#__PURE__*/React.createElement("th", null, "\u5916\u5E2B \xB7 \u8AB2\u6587"), /*#__PURE__*/React.createElement("th", null, "Part"), /*#__PURE__*/React.createElement("th", null, "\u5916\u5E2B \xB7 Word Study"), /*#__PURE__*/React.createElement("th", null, "\u4F5C\u696D"), /*#__PURE__*/React.createElement("th", null, "\u4E2D\u5E2B \xB7 \u8AB2\u5802"), /*#__PURE__*/React.createElement("th", null, "\u4E2D\u5E2B \xB7 \u6587\u6CD5\u4F5C\u696D"), /*#__PURE__*/React.createElement("th", null, "\u4F5C\u696D"), /*#__PURE__*/React.createElement("th", null, "Formative"))), /*#__PURE__*/React.createElement("tbody", null, pace.map(w => {
    var f = [w.it.assess && '外師 ' + w.it.assess, w.lt.assess && '中師 ' + w.lt.assess].filter(Boolean).join(' · ');
    return /*#__PURE__*/React.createElement("tr", {
      key: w.n,
      className: f ? 'has-f' : ''
    }, /*#__PURE__*/React.createElement("td", {
      className: "pw"
    }, "W", w.n), /*#__PURE__*/React.createElement("td", {
      className: w.it._own_reading ? '' : 'carry'
    }, cell(w.it.reading)), /*#__PURE__*/React.createElement("td", null, cell(w.it.vocab)), /*#__PURE__*/React.createElement("td", null, cell(w.it.wordStudy)), /*#__PURE__*/React.createElement("td", {
      className: "pp"
    }, [w.it.law, w.it.wsWb].filter(x => x && x !== '-').join(' · ') || '—'), /*#__PURE__*/React.createElement("td", null, cell(w.lt.grammar)), /*#__PURE__*/React.createElement("td", {
      className: w.lt._carry ? 'carry' : ''
    }, cell(w.lt.grammarHw), w.lt._carry ? ' ↩' : '', w.lt.grammarBold && /*#__PURE__*/React.createElement("b", {
      className: "pb"
    }, "\u53EA\u6559 pp. ", w.lt.grammarBold.join(', '))), /*#__PURE__*/React.createElement("td", {
      className: "pp"
    }, [w.lt.law, w.lt.gramWb].filter(x => x && x !== '-').join(' · ') || '—'), /*#__PURE__*/React.createElement("td", {
      className: "pf"
    }, f || '—'));
  })))), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginTop: 8
    }
  }, "\u7070\u5B57\uFF1D\u8868\u4E0A\u90A3\u4E00\u683C\u662F\u7A7A\u7684\u3001\u6211\u7167\u898F\u5247\u6CBF\u7528\u524D\u4E00\u9031\uFF1B", /*#__PURE__*/React.createElement("b", null, "\u21A9"), "\uFF1D\u90A3\u9031\u8AB2\u5802\u5728\u4E0A Writing Activity\uFF0C\u4F5C\u696D\u6CBF\u7528\u4E0A\u4E00\u500B\u6587\u6CD5\u4E3B\u984C\u3002", anyBold && /*#__PURE__*/React.createElement(React.Fragment, null, " ", /*#__PURE__*/React.createElement("b", {
    className: "pb"
  }, "\u53EA\u6559 pp."), " \uFF1D\u90A3\u4E00\u683C\u88E1", /*#__PURE__*/React.createElement("b", null, "\u52A0\u7C97"), "\u7684\u9801\u6578\uFF1B", /*#__PURE__*/React.createElement("b", null, "\u6574\u683C\u90FD\u6C92\u6709\u52A0\u7C97\u7684\u90A3\u5E7E\u9031\uFF1D\u5217\u51FA\u4F86\u7684\u5168\u90E8\u90FD\u8981\u6559"), "\uFF08Alan 2026-10-12 \u78BA\u8A8D\uFF09\u3002"), ' ', "\u8003\u8A66\u53EA\u5217 Formative\uFF08Summative \u4F9D\u4F60\u7684\u6307\u793A\u5FFD\u7565\uFF09\u3002"))), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onClose
  }, "\u53D6\u6D88"), pace && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setPace(null)
  }, "\u2190 \u63DB\u4E00\u4EFD"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: busy,
    onClick: async () => {
      setBusy(true);
      try {
        await onSave(gradeKey, pace);
        onClose();
      } catch (e) {
        setErr(e && e.message || '存檔失敗');
        setBusy(false);
      }
    }
  }, busy ? '存檔中…' : `沒問題，存起來（${pace.length} 週）`))))), document.body);
}
function WordStudyModal({
  open,
  categories,
  defaultCat,
  defaultGrade,
  perStudent,
  roster,
  defaultTitle,
  defaultTopic,
  onClose,
  onCreate
}) {
  var [nudgeCls, nudge] = useModalNudge();
  var [topic, setTopic] = useS('');
  var [words, setWords] = useS('');
  var [title, setTitle] = useS('');
  var [cat, setCat] = useS(defaultCat || 'word');
  var [grade, setGrade] = useS(defaultGrade || 'g4');
  var [note, setNote] = useS('');
  var [picked, setPicked] = useS(WS_KINDS.reduce((a, k) => (a[k.id] = true, a), {}));
  var [busy, setBusy] = useS(0);
  var [err, setErr] = useS('');
  var [res, setRes] = useS(null);
  var [assign, setAssign] = useS(true);
  var [due, setDue] = useS('');
  var [who, setWho] = useS([]);
  useE(() => {
    if (!open) return;
    setTopic(defaultTopic || '');
    setWords('');
    setTitle(defaultTitle || '');
    setCat(defaultCat || 'word');
    setGrade(defaultGrade || 'g4');
    setNote('');
    setBusy(0);
    setErr('');
    setRes(null);
    setPicked(WS_KINDS.reduce((a, k) => (a[k.id] = true, a), {}));
    setAssign(true);
    setWho([]);
    var d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    setDue(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }, [open]);
  if (!open) return null;
  var run = async () => {
    if (!topic.trim()) {
      setErr('先打「這次教什麼」，例如 Syllable Pattern VCe');
      return;
    }
    setErr('');
    setBusy(0.0001);
    try {
      var pack = await window.aiMakeWordStudy({
        topic: topic.trim(),
        words,
        grade,
        teacherNote: note,
        onProgress: d => setBusy(d)
      });
      setRes(pack);
      if (!title.trim()) setTitle(pack.topic || topic.trim());
    } catch (e) {
      setErr(e && e.message || 'Word Study 題目產生失敗，請再試一次。');
    }
    setBusy(0);
  };
  var kinds = WS_KINDS.filter(k => picked[k.id]).map(k => k.id);
  var built = res ? window.wsBuildItems({
    pack: res,
    title: title.trim() || res.topic || topic.trim(),
    kinds
  }) : [];

  /* ⚠ 不要寫成 `const AssignBox = () => …` 再用 <AssignBox/>（v380 踩過）：
     每次重繪都是新的元件型別，React 會整段拆掉重掛，勾第二個學生時第一個就點不到。 */
  var assignBox = () => /*#__PURE__*/React.createElement("div", {
    className: 'qs-assign' + (assign ? ' on' : '')
  }, /*#__PURE__*/React.createElement("label", {
    className: "qs-assign-head"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: assign,
    onChange: e => setAssign(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, "\u5EFA\u7ACB\u5F8C", /*#__PURE__*/React.createElement("b", null, "\u6574\u7D44\u76F4\u63A5\u6307\u6D3E"))), assign && (perStudent ? /*#__PURE__*/React.createElement("div", {
    className: "qs-who"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qs-who-bar"
  }, /*#__PURE__*/React.createElement("span", null, "\u6307\u6D3E\u7D66\uFF08", who.length, "/", (roster || []).length, "\uFF09"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setWho((roster || []).map(r => r.email))
  }, "\u5168\u9078"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setWho([])
  }, "\u5168\u4E0D\u9078")), /*#__PURE__*/React.createElement("div", {
    className: "qs-who-list"
  }, (roster || []).map(r => /*#__PURE__*/React.createElement("label", {
    key: r.email,
    className: 'qs-who-item' + (who.indexOf(r.email) >= 0 ? ' on' : '')
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: who.indexOf(r.email) >= 0,
    onChange: e => setWho(w => e.target.checked ? w.concat(r.email) : w.filter(x => x !== r.email))
  }), r.name || r.email)), !(roster || []).length && /*#__PURE__*/React.createElement("span", {
    className: "qs-who-empty"
  }, "\u540D\u55AE\u9084\u6C92\u8F09\u5165"))) : /*#__PURE__*/React.createElement("div", {
    className: "qs-due"
  }, /*#__PURE__*/React.createElement("label", null, "\u622A\u6B62\u65E5"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: due,
    onChange: e => setDue(e.target.value)
  }), /*#__PURE__*/React.createElement("span", {
    className: "qs-due-n"
  }, "\u6574\u7D44\u6703\u51FA\u73FE\u5728\u5B78\u751F\u7684\u300C\u4ECA\u5929\u7684\u4EFB\u52D9\u300D"))));
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: nudge
  }, /*#__PURE__*/React.createElement("div", {
    className: 'modal wide' + nudgeCls,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\uD83D\uDCD8 \u4E00\u9375\u51FA Word Study"), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: onClose
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, !res ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 12
    }
  }, "\u6253\u4E0A", /*#__PURE__*/React.createElement("b", null, "\u9019\u6B21\u6559\u4EC0\u9EBC"), "\u5C31\u597D\u2014\u2014VCe \u97F3\u7BC0\u3001\u5F8C\u7DB4 -ty/-ity/-ic/-ment\u3001\u6BCD\u97F3\u7D44\u5408 ai/ay/ea\u2026\u90FD\u53EF\u4EE5\u3002", /*#__PURE__*/React.createElement("br", null), "\u8AB2\u672C\u7684 spelling list \u8CBC\u4E0A\u4F86\u7684\u8A71\uFF0C\u51FA\u4F86\u7684\u984C\u76EE\u6703\u76F4\u63A5\u7528\u90A3\u4E9B\u5B57\u3002", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "\u7B54\u6848\u5168\u90E8\u7531\u7A0B\u5F0F\u6AA2\u67E5"), "\uFF08\u662F\u4E0D\u662F VCe\u3001\u6709\u6C92\u6709\u90A3\u500B\u5B57\u5C3E\u3001\u542B\u4E0D\u542B\u90A3\u500B\u6BCD\u97F3\u7D44\u5408\uFF09\uFF0C\u4E0D\u662F\u9760 AI \u8AAA\u4E86\u7B97\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u9019\u6B21\u6559\u4EC0\u9EBC"), /*#__PURE__*/React.createElement("input", {
    value: topic,
    onChange: e => setTopic(e.target.value),
    placeholder: "\u4F8B\uFF1ASyllable Pattern VCe\uFF0FSuffixes -ty, -ity, -ic, -ment\uFF0FVowel Teams ai, ay, ea, ee"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u8AB2\u672C\u7684 spelling list\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    rows: 4,
    value: words,
    onChange: e => setWords(e.target.value),
    placeholder: "\u4E00\u884C\u4E00\u500B\u6216\u7528\u9017\u865F\u5206\u958B\uFF1Acooperate, acquire, envelope, participate\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u4E0D\u586B\u4E5F\u53EF\u4EE5\uFF0CAI \u6703\u81EA\u5DF1\u6311\u9019\u500B\u5E74\u7D1A\u8B80\u5F97\u61C2\u7684\u5B57\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u5E74\u7D1A"), /*#__PURE__*/React.createElement("select", {
    value: grade,
    onChange: e => setGrade(e.target.value)
  }, ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map(x => /*#__PURE__*/React.createElement("option", {
    key: x,
    value: x
  }, x.toUpperCase())))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u653E\u5728\u54EA\u4E00\u985E"), /*#__PURE__*/React.createElement("select", {
    value: cat,
    onChange: e => setCat(e.target.value)
  }, (categories || []).map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.zh || c.titleZh || c.title || c.id))))), /*#__PURE__*/React.createElement(window.AiNoteBox, {
    value: note,
    onChange: setNote,
    placeholder: "\u4F8B\uFF1A\u53EA\u7528\u8AB2\u672C\u90A3 20 \u500B\u5B57\uFF0F\u77ED\u6587\u8ACB\u5BEB\u5B78\u6821\u751F\u6D3B"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("b", null, res.rule), /*#__PURE__*/React.createElement("br", null), res.ruleZh, /*#__PURE__*/React.createElement("br", null), "\u7A0B\u5F0F\u600E\u9EBC\u5224\uFF1A", /*#__PURE__*/React.createElement("code", null, res.check.kind, res.check.arg ? `(${res.check.arg})` : ''), "\u3000\u7B26\u5408\u7684 ", res.yes.length, " \u500B\u3001\u4E0D\u7B26\u5408\u7684 ", res.no.length, " \u500B", res.story && /*#__PURE__*/React.createElement(React.Fragment, null, "\u3000\u77ED\u6587\u88E1\u8981\u627E ", /*#__PURE__*/React.createElement("b", null, res.story.answers.length), " \u500B\u5B57")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u9019\u4E00\u7D44\u53EB\u4EC0\u9EBC"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u8981\u51FA\u54EA\u4E9B"), /*#__PURE__*/React.createElement("div", {
    className: "qs-kinds"
  }, WS_KINDS.map(k => {
    var can = k.id === 'build' ? (res.build || []).length >= 2 : k.id === 'sort' ? (res.groups || []).length >= 2 : k.id === 'story' ? !!res.story : k.id === 'mcq' ? (res.mcq || []).length >= 2 : k.id === 'circle' ? res.yes.length >= 4 && res.no.length >= 4 : true;
    return /*#__PURE__*/React.createElement("label", {
      key: k.id,
      className: 'qs-kind' + (picked[k.id] && can ? ' on' : '') + (can ? '' : ' off')
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      disabled: !can,
      checked: !!picked[k.id] && can,
      onChange: e => setPicked(x => ({
        ...x,
        [k.id]: e.target.checked
      }))
    }), /*#__PURE__*/React.createElement("span", {
      className: "qs-kind-zh"
    }, k.zh), /*#__PURE__*/React.createElement("span", {
      className: "qs-kind-note"
    }, can ? k.note : '這一次出不了：' + k.note));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u6703\u5EFA\u7ACB ", /*#__PURE__*/React.createElement("b", null, built.length), " \u500B\u55AE\u5143\uFF1A", built.map(b => b.title.replace(/^.*· /, '')).join('、') || '（還沒勾）'), assignBox()), err && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, err)), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onClose
  }, "\u53D6\u6D88"), !res ? /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: !topic.trim() || !!busy,
    onClick: run
  }, busy ? `出題中…（${Math.min(3, Math.ceil(busy))}/3）` : '✨ 出題 →') : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => {
      setRes(null);
      setErr('');
    }
  }, "\u21BB \u91CD\u51FA\u4E00\u6B21"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: !built.length,
    onClick: () => {
      onCreate({
        items: built,
        cat,
        assign: assign ? perStudent ? {
          students: who
        } : {
          dueDate: due
        } : null
      });
      onClose();
    }
  }, "\u5EFA\u7ACB ", built.length, " \u500B\u55AE\u5143 \u2192")))));
}

/* ══ v482 📘 Word Study：把驗過的產出組成單元 ══════════════════════════════
   全部沿用既有題型（圈選／分一分／選擇題／打字／教學卡），
   不新增題型——v414 的教訓：新題型要補 AUTO_STAR_KIND、QM_TYPE_WORDS…漏一個就沒星星。
   ⭐ 這裡的互動教學是**程式直接拼的**，不是 AI 生的：規則與字都已經被程式驗過，
     所以不會有「教錯」的風險（跟一鍵出文法最大的差別）。 */
function wsBuildItems({
  pack,
  title,
  kinds
}) {
  var stamp = Date.now();
  var rnd = () => Math.random().toString(36).slice(2, 6);
  var g = title;
  var base = {
    group: g,
    zh: '',
    duration: ''
  };
  var out = [];
  var on = k => (kinds || []).indexOf(k) >= 0;
  var p = pack || {};

  /* 📘 先學一下
     🔴 v485（Alan：「根本沒有全部解釋完，還有 ic、ment 以及很多的 examples 呢？
       都要講解出來啊，這樣小朋友才能跟著念跟學」）：
       v482 只有**一步**，而且只給兩個例子 → 四種字尾只講到前面那一種。
       改成**一組一步**：-ty 一步、-ity 一步、-ic 一步、-ment 一步，
       每一步都用那一組自己的字當例子，最後才是分一分與小試身手。 */
  if (on('lesson') && p.rule) {
    var steps = [];
    var gs = (p.groups || []).filter(x => x && x.words && x.words.length);
    /* v486（Alan：「講解定義的時候除了中文你一定要放英文，因為老師就是考英文，
       老師不會考試的時候還給你中文解釋；而且這種類型一定要都給 base word，
       這樣小朋友才知道原來是從這個字變過來的」）：
       ① 標題中英一起給（英文在前，中文只是幫他讀懂）
       ② 例字底下寫「safe + -ty」——base word 是 wsValidPack 驗過的才會有，
          驗不過的字就只顯示那個字，不要編一個假的拆解。 */
    var bases = p.bases || {};
    var exOf = (w, affix) => {
      var b = bases[w] || bases[String(w).toLowerCase()];
      var a = String(affix || '').trim();
      return {
        en: w,
        hl: [w],
        zh: b && a ? `${b} + ${a}` : b ? b : ''
      };
    };
    var headOf = (label, means, zh) => {
      var en = means ? `${label} = ${means}` : String(label || '');
      return (zh ? `${en}　${zh}` : en).slice(0, 80);
    };
    if (gs.length >= 2) {
      gs.slice(0, 5).forEach(x => {
        steps.push({
          kind: 'learn',
          say: headOf(x.label, x.means, x.zh),
          examples: x.words.slice(0, 3).map(w => exOf(w, x.arg || x.label))
        });
      });
    } else {
      var one = gs[0];
      steps.push({
        kind: 'learn',
        say: one ? headOf(one.label, one.means, one.zh) : `${p.rule}　${p.ruleZh || ''}`.trim().slice(0, 80),
        examples: (one && one.words || p.yes || []).slice(0, 3).map(w => exOf(w, one ? one.arg || one.label : ''))
      });
    }
    // 講完每一種之後，才動手分分看
    if (gs.length >= 2) {
      steps.push({
        kind: 'sort',
        q: '把這些字分到正確的地方',
        groups: gs.slice(0, 3).map(x => ({
          label: x.label,
          items: x.words.slice(0, 3)
        })),
        why: p.ruleZh || ''
      });
    }
    // 最後一題小試身手：挑出符合規則的那一個
    if ((p.yes || []).length && (p.no || []).length >= 2) {
      steps.push({
        kind: 'pick',
        q: 'Which word follows the pattern?',
        options: [p.yes[0], p.no[0], p.no[1]].filter((v, i, a2) => v && a2.indexOf(v) === i),
        answer: 0,
        why: p.ruleZh || ''
      });
    }
    if (steps.length >= 2) {
      out.push({
        ...base,
        id: 'ws' + stamp + 'ls' + rnd(),
        type: 'lesson',
        order: 0,
        title: `${g} · 先學一下`,
        zh: `互動教學 · ${steps.length} 步 · 學完才能開始練習`,
        srcTopic: p.topic || g,
        srcNotes: p.rule || '',
        lead: p.ruleZh || '',
        steps,
        outro: ''
      });
    }
  }
  var lsId = out[0] && out[0].type === 'lesson' ? out[0].id : null;
  var req = lsId ? {
    requires: lsId
  } : {};

  // ⭕ 圈出來：一列五個字，把符合規則的點出來（課本 p5 那張表）
  if (on('circle') && (p.yes || []).length >= 4 && (p.no || []).length >= 4) {
    var rows = [];
    var ys = p.yes.slice(0, 10),
      ns = p.no.slice(0, 10);
    for (var i = 0; i < Math.min(5, Math.ceil((ys.length + ns.length) / 5)); i++) {
      var pickY = ys.slice(i * 2, i * 2 + 2),
        pickN = ns.slice(i * 3, i * 3 + 3);
      var row = [...pickY, ...pickN];
      if (pickY.length < 1 || row.length < 4) break;
      // 洗一下，不然答案永遠在前面兩格
      for (var j = row.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        [row[j], row[k]] = [row[k], row[j]];
      }
      rows.push({
        id: 'c' + stamp + i + rnd(),
        sentence: row.join(' '),
        answers: pickY,
        answer: pickY[0],
        explain: p.rule
      });
    }
    if (rows.length >= 2) out.push({
      ...base,
      id: 'ws' + stamp + 'ci' + rnd(),
      type: 'circle-answer',
      order: 1,
      ...req,
      title: `${g} · 圈出來`,
      zh: `${rows.length} 題 · ${p.rule}`,
      circleInstruction: `Tap every word that follows the pattern. ${p.rule}`,
      circleQuestions: rows
    });
  }

  // 🗂 分一分（課本 p8／p12 的分類）
  if (on('sort') && (p.groups || []).length >= 2) {
    var ws = [];
    p.groups.forEach(x => x.words.forEach(w => ws.push({
      id: 'w' + stamp + ws.length + rnd(),
      word: w,
      category: x.label
    })));
    if (ws.length >= 4) out.push({
      ...base,
      id: 'ws' + stamp + 'so' + rnd(),
      type: 'word-sort',
      order: 2,
      ...req,
      title: `${g} · 分一分`,
      zh: `${ws.length} 個字 · Sort the words`,
      sortCategories: p.groups.map(x => x.label),
      sortWords: ws,
      /* v485：欄位名稱只放詞綴（-ity），意思（quality of…）另外放小字。
         以前整句塞在名稱裡，窄欄位切成「-ity (qu」——Alan 截到了。 */
      sortHints: p.groups.reduce((a, x) => {
        var h = (x.means || x.zh || '').trim();
        if (h) a[x.label] = h.slice(0, 40);
        return a;
      }, {})
    });
  }

  // 📝 選擇題（課本 p7／p13）
  if (on('mcq') && (p.mcq || []).length >= 2) {
    out.push({
      ...base,
      id: 'ws' + stamp + 'mc' + rnd(),
      type: 'quiz',
      order: 3,
      ...req,
      title: `${g} · 選擇題`,
      zh: `${p.mcq.length} 題 · 哪一個符合規則？`,
      questions: p.mcq.map((q, i) => ({
        id: 'q' + stamp + i + rnd(),
        q: q.q,
        options: q.options,
        answer: q.answer,
        explain: p.rule
      }))
    });
  }

  // ✏️ 加詞綴：看定義寫出那個字（課本 p8 下半）
  if (on('build') && (p.build || []).length >= 2) {
    out.push({
      ...base,
      id: 'ws' + stamp + 'bd' + rnd(),
      type: 'type-answer',
      variant: 'fill',
      order: 4,
      ...req,
      title: `${g} · 加字尾`,
      zh: `${p.build.length} 題 · 看意思寫出正確的字`,
      instruction: 'Write the word that matches the meaning.',
      pairs: p.build.map((b, i) => ({
        id: 'p' + stamp + i + rnd(),
        prompt: `${b.clue}  (${b.base} + ?)`,
        answer: b.answer,
        accept: [b.answer],
        explain: p.rule
      }))
    });
  }

  // 📖 短文找字（Alan 自己出的那一張：給一篇文章，把這次的 word study 單字找出來）
  if (on('story') && p.story && (p.story.answers || []).length >= 4) {
    var st = p.story;
    var sents = String(st.text).split(/(?<=[.!?])\s+/).filter(Boolean);
    var _rows = sents.map((sen, i) => {
      var ans = st.answers.filter(a => (' ' + sen.toLowerCase() + ' ').indexOf(a.toLowerCase()) >= 0);
      return ans.length ? {
        id: 'p' + stamp + i + rnd(),
        sentence: sen,
        answers: ans,
        answer: ans[0],
        explain: p.rule
      } : null;
    }).filter(Boolean);
    /* 🔴 v485（Alan：「短文找字是真的一整個文章，不是一句一句，就用正常文章的格式，
       不要很突兀的每個字分那麼開」）：circleProse ＝ 學生端把整篇排成一段文章，
       不要一句一個框、也不要把每個字撐開。 */
    if (_rows.length >= 2) out.push({
      ...base,
      id: 'ws' + stamp + 'st' + rnd(),
      type: 'circle-answer',
      order: 5,
      ...req,
      title: `${g} · 短文找字`,
      zh: `${st.answers.length} 個字 · ${st.title || 'Find the words'}`,
      circleInstruction: `Read the passage and tap every word that follows the pattern.`,
      circleProse: true,
      storyTitle: st.title || '',
      passage: st.text,
      circleQuestions: _rows
    });
  }
  return out;
}
function qsBuildItems({
  words,
  title,
  kinds,
  ai,
  story,
  stories,
  sense,
  maxQ
}) {
  var aiOf = term => (ai || []).find(r => r.term === term) || null;
  var rnd = () => Math.random().toString(36).slice(2, 6);
  var stamp = Date.now();
  var out = [];
  var fcId = 'qs' + stamp + 'fc';
  var base = {
    group: title,
    zh: '',
    duration: ''
  };
  /* ══ v542 一次練習最多幾題 ════════════════════════════════════════
     Alan 合併 24 個單字之後：「字義選擇不可能一次的練習就 24 題，小孩會沒耐心」。
     ⭐ 切幾份是**程式**算的（qsChunkEven 會平均分，24 → 8/8/8 不是 10/10/4）。
     ⚠ 只有一份時完全不加字尾，原本就好好的流程一行都不要動。
     ⚠ 單字卡**不切**：它是這一組的底本（所有練習都 linkedFlashcardId 指著它），
       切開會讓複習／再出一份那幾條路找不到完整的單字表。 */
  var cap = Math.max(1, +maxQ || window.QS_MAX_Q || 10);
  var chunk = (list, per) => window.qsChunkEven ? window.qsChunkEven(list, per || cap) : list.length ? [list] : [];
  var partTitle = (t, i, n) => window.qsPartTitle ? window.qsPartTitle(t, i, n) : t;
  if (kinds.indexOf('flashcard') >= 0) {
    out.push({
      ...base,
      id: fcId,
      type: 'flashcard',
      title,
      cards: words.map((w, i) => {
        var a = aiOf(w.term);
        return {
          id: 'c' + stamp + i + rnd(),
          term: w.term,
          zh: w.zh || a && a.zh || '',
          example: w.example || (a && a.sentence ? a.sentence.replace('___', w.term) : ''),
          // v475：圖片照抄（複習／再出一份時不用重挑一次圖）
          imageUrl: w.imageUrl || ''
        };
      })
    });
  }
  if (kinds.indexOf('def-match') >= 0) {
    // 有 AI 出的英文定義就用它（Alan 的風格），沒有才退回「單字 → 中文」
    var pairs = words.map((w, i) => {
      var a = aiOf(w.term);
      // v445：老師自己貼的定義最優先（他有自己要考的講法），沒貼才用 AI 的、再沒有才用中文
      // v461：老師貼的定義永遠最優先——prompt 已經要 AI 原樣抄，這裡再保一次，
      //        就算 AI 自作主張改寫了也蓋不掉老師的原文。
      var def = w.def || a && a.def || w.zh;
      return def ? {
        id: 'p' + stamp + i + rnd(),
        word: a && a.word || w.term,
        def
      } : null;
    }).filter(Boolean);
    /* 🔴 v476（Alan：「為什麼我的配對連線有一個是中文？」）：
       上面的退路是「沒有英文定義就用中文」。大部分都是英文時，夾一個中文
       看起來就是壞掉的（而且那一題變成送分——它一眼就跟其他的不一樣）。
       → 整組要嘛全英文、要嘛全中文；少數派直接拿掉，寧可少一組配對。
       ⚠ 真正的修在 data.js：漏掉 def 的字會再問 AI 一次。這裡是最後一道。 */
    var cjk = t => /[\u4e00-\u9fff]/.test(String(t || ''));
    var nZh = pairs.filter(p => cjk(p.def)).length;
    if (nZh > 0 && nZh < pairs.length) {
      var dropZh = nZh <= pairs.length / 2; // 少數派是哪一邊，就拿掉哪一邊
      for (var k = pairs.length - 1; k >= 0; k--) {
        if (cjk(pairs[k].def) === dropZh) pairs.splice(k, 1);
      }
    }
    var dmParts = chunk(pairs.length >= 2 ? pairs : []);
    dmParts.forEach((ps, k) => {
      if (ps.length >= 2) out.push({
        ...base,
        id: 'qs' + stamp + 'dm' + k,
        type: 'def-match',
        title: partTitle(title, k, dmParts.length),
        linkedFlashcardId: fcId,
        defPairs: ps
      });
    });
  }
  if (kinds.indexOf('fillblank') >= 0) {
    var qs = words.map((w, i) => {
      var a = aiOf(w.term);
      // AI 的情境例句優先；沒有才把老師貼的例句挖空
      var sentence = a && a.sentence && a.sentence.indexOf('___') >= 0 ? a.sentence : qsBlank(w.example, w.term);
      if (!sentence) return null;
      var answer = a && a.answer || w.term;
      var explain = a && a.explain || (w.zh ? `${w.term} = ${w.zh}` : '');
      return {
        id: 'q' + stamp + i + rnd(),
        sentence,
        answer,
        explain
      };
    }).filter(Boolean);
    var fbParts = chunk(qs.length >= 2 ? qs : []);
    fbParts.forEach((g, k) => {
      if (g.length >= 2) out.push({
        ...base,
        id: 'qs' + stamp + 'fb' + k,
        type: 'fillblank',
        title: partTitle(title, k, fbParts.length),
        linkedFlashcardId: fcId,
        questions: g
      });
    });
  }
  /* v468 康橋考卷第一大題：字義選擇。
     沿用 quiz（不新增題型——v414 的教訓）。短文放在題幹裡，學生先讀再選。
     ⚠ 不能 shuffle 選項：正解位置已經由程式攤平過（_qsSpreadAnswers），
       再洗一次會把那份安排打亂。 */
  if (kinds.indexOf('quiz') >= 0) {
    var pool = words.map(w => ({
      ...w,
      zh: w.zh || (aiOf(w.term) || {}).zh || ''
    })).filter(w => w.zh);
    var _qs = pool.map((w, i) => {
      var others = pool.filter(x => x.term !== w.term).map(x => x.term);
      // 洗牌後取 3 個當誘答
      for (var j = others.length - 1; j > 0; j--) {
        var _k = Math.floor(Math.random() * (j + 1));
        var t = others[j];
        others[j] = others[_k];
        others[_k] = t;
      }
      var opts = [w.term].concat(others.slice(0, 3));
      if (opts.length < 2) return null;
      return {
        id: 'q' + stamp + i + rnd(),
        q: `「${w.zh}」的英文是哪一個？`,
        options: opts,
        answer: 0,
        explain: w.example || ''
      };
    }).filter(Boolean);
    var qzParts = chunk(_qs.length >= 2 ? _qs : []);
    qzParts.forEach((g, k) => {
      if (g.length >= 2) out.push({
        ...base,
        id: 'qs' + stamp + 'qz' + k,
        type: 'quiz',
        title: partTitle(title, k, qzParts.length),
        linkedFlashcardId: fcId,
        questions: g
      });
    });
  }
  /* v406: 短文填空 → cloze 題型。passage 裡的 [答案](提示) 就是空格，
     格式跟 components-quiz-mode.jsx 的 parseClozePassage 完全一致。 */
  /* v477（Alan：「字義選擇和測驗順序幫我顛倒，我想要先測驗再字義選擇」）：
     側欄的順序就是這裡 push 的順序。字義選擇要讀一段短文、比較難，
     排在一般測驗後面比較合理。 */
  if (kinds.indexOf('sense') >= 0 && (sense || []).length >= 2) {
    /* v542（Alan：「字義選擇也是幫我出三大題，不要一大題就 24 題」）
       ⚠ 它要讀一段短文才能選，比一般測驗累——所以上限比別的更小（8）。 */
    var sePer = Math.min(cap, window.QS_SPLIT && window.QS_SPLIT.sense.per || 8);
    var seParts = chunk(sense, sePer);
    /* 🔴 v473：本來標題跟「測驗」那個單元一模一樣（兩個都是 type:'quiz'），
       側欄會並排兩個「測驗」，老師與學生都分不出哪個是哪個。
       ⚠ 加了字尾就要同時補 QM_TYPE_WORDS，否則側欄歸戶會把它當成另一組。 */
    seParts.forEach((grp, k) => out.push({
      ...base,
      id: 'qs' + stamp + 'se' + k,
      type: 'quiz',
      title: partTitle(`${title} · 字義選擇`, k, seParts.length),
      linkedFlashcardId: fcId,
      zh: `${grp.length} 題 · 讀短文，選出這個字在這裡的意思`,
      instruction: 'Read each passage, then choose what the word means there.',
      /* 🔴 v475（Alan：「字體小一點、排版好一點，該單字要特別標起來」）：
         本來把「標題＋整段短文＋問題」塞成一整串 q，而題目的字級是 52px
         ——一整屏的大字。改成分開存，播放器才能把短文排小、把目標字標出來。
         ⚠ q 還是留著完整內容：舊版播放器（和複習／沿用時的其他路徑）看得懂。 */
      questions: grp.map((x, i) => ({
        id: 'q' + stamp + 's' + k + '_' + i + rnd(),
        q: `${x.title ? x.title + '\n' : ''}${x.passage}\n\n${x.q}`,
        passage: x.passage,
        passageTitle: x.title || '',
        word: x.word || '',
        ask: x.q,
        options: x.options,
        answer: x.answer,
        explain: x.explain || ''
      }))
    }));
  }

  /* v542（Alan：「我這次有 24 個單字，短文填空肯定要多幾篇啊」）
     ⚠ 舊的呼叫端只給一篇（story），新的給一疊（stories）——兩種都要收，
       不然複習／再出一份那幾條路會安靜地少一個單元。 */
  var storyList = (stories && stories.length ? stories : story ? [story] : []).filter(st => st && !st.error && String(st.passage || '').indexOf('[') >= 0);
  if (kinds.indexOf('story') >= 0) storyList.forEach((story, k) => {
    var nBlank = ((story.passage || '').match(/\[[^\]]+\]/g) || []).length;
    /* v408（Alan：「頭上要給 word bank，這樣小朋友才知道有什麼單字可以填入」）
       ⚠ 存的是老師輸入的「原形」，不是文章裡的變化形——作業紙上的 word bank 就是原形，
       空格後面的 (ing)/(s) 才是叫學生自己變出正確形式的地方。
       只有這裡（一鍵出單字的短文填空）會寫 wordBank；文法時態的克漏字沒有這個欄位，
       所以它們不會突然冒出一排答案把時態送分掉。 */
    /* v542 Word Bank：答案全放，再從整池抽誘答補到 10 個，然後洗牌。
       ⚠ 本來是「這一組**全部**的字」——合併 24 個字的時候，
         一篇挖 6 格卻給 24 個選項，小朋友根本挑不動。 */
    var ansWords = ((story.passage || '').match(/\[([^\]]+)\]/g) || []).map(x => x.slice(1, -1));
    var allTerms = words.map(w => String(w.term || '').trim()).filter(Boolean);
    out.push({
      ...base,
      id: 'qs' + stamp + 'st' + k,
      type: 'cloze',
      title: partTitle(`${title} · 短文填空`, k, storyList.length),
      zh: `${nBlank} 個空格 · 讀短文把單字填回去`,
      linkedFlashcardId: fcId,
      passage: story.passage,
      wordBank: window.qsStoryBank ? window.qsStoryBank((story.words || []).map(w => w.term).filter(Boolean).length ? (story.words || []).map(w => w.term) : ansWords, allTerms, window.QS_SPLIT && window.QS_SPLIT.story.bank || 10) : allTerms
    });
  });
  if (kinds.indexOf('spelling') >= 0) {
    var sw = words.map((w, i) => ({
      id: 'sp' + stamp + i + rnd(),
      word: w.term,
      zh: w.zh || (aiOf(w.term) || {}).zh || ''
    }));
    var spParts = chunk(sw);
    spParts.forEach((g, k) => out.push({
      ...base,
      id: 'qs' + stamp + 'sp' + k,
      type: 'spelling',
      title: partTitle(title, k, spParts.length),
      linkedFlashcardId: fcId,
      spellWords: g
    }));
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════
   v377：一鍵建立一整個學期的週次（Alan：8/31 開學、連續 20 週到寒假）
   一週一週手動開太慢，而且 dateRange 要打成 bestWeekIdx 讀得懂的格式
   （"Aug 31 – Sep 6"）才會自動跳到「這一週」。這裡統一產生。
   ⚠ 只會「補上不存在的」週次，已經有的一律不動（不覆蓋任何內容）。
   ══════════════════════════════════════════════════════════════ */
var TERM_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* 依「開學日 + 第幾週」算出這一週的 id／名稱／日期範圍 */
function termWeekPlan(startISO, count, prefix, tag) {
  var out = [];
  var [y, m, d] = String(startISO || '').split('-').map(Number);
  if (!y || !m || !d) return out;
  var base = new Date(y, m - 1, d);
  for (var i = 0; i < count; i++) {
    var s = new Date(base.getTime());
    s.setDate(base.getDate() + i * 7);
    var e = new Date(s.getTime());
    e.setDate(s.getDate() + 6);
    var nn = String(i + 1).padStart(2, '0');
    var iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      id: `${prefix}${y}${tag}-W${nn}`,
      label: `Week ${i + 1}`,
      dateRange: `${TERM_MON[s.getMonth()]} ${s.getDate()} – ${TERM_MON[e.getMonth()]} ${e.getDate()}`,
      zhRange: `${s.getMonth() + 1}/${s.getDate()}–${e.getMonth() + 1}/${e.getDate()}`,
      /* ⚠ 一定要存真正的日期：週次 id 只有「學期開始的年份」（2026F），
         但第 19、20 週其實是 2027 年 1 月——只靠 id 推年份會把它算成 2026/1，
         變成「已經過去的一週」，一進來就跳到第 20 週。 */
      startISO: iso(s),
      endISO: iso(e),
      n: i + 1
    });
  }
  return out;
}
function TermSetupModal({
  open,
  existingIds,
  gradeLabel,
  prefix,
  categories,
  onClose,
  onCreate
}) {
  var [nudgeCls, nudge] = useModalNudge(); // v461：點背景不關閉，只晃一下
  var [start, setStart] = useS('2026-08-31');
  var [count, setCount] = useS(20);
  var [tag, setTag] = useS('F'); // F = 上學期(Fall)，S = 下學期(Spring)
  useE(() => {
    if (open) {
      setStart('2026-08-31');
      setCount(20);
      setTag('F');
    }
  }, [open]);
  if (!open) return null;
  var plan = termWeekPlan(start, Math.max(1, Math.min(40, +count || 0)), prefix || '', tag);
  var have = new Set(existingIds || []);
  var fresh = plan.filter(p => !have.has(p.id));
  var dup = plan.length - fresh.length;
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: nudge
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal wide" + nudgeCls,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\u5EFA\u7ACB", /*#__PURE__*/React.createElement("em", null, "\u4E00\u6574\u500B\u5B78\u671F"), "\u7684\u9031\u6B21 \xB7 ", gradeLabel), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "term-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u958B\u5B78\u65E5\uFF08\u7B2C 1 \u9031\u7684\u661F\u671F\u4E00\uFF09"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: start,
    onChange: e => setStart(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u7E3D\u5171\u5E7E\u9031"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "40",
    value: count,
    onChange: e => setCount(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u5B78\u671F"), /*#__PURE__*/React.createElement("select", {
    value: tag,
    onChange: e => setTag(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "F"
  }, "\u4E0A\u5B78\u671F\uFF08\u79CB\uFF09"), /*#__PURE__*/React.createElement("option", {
    value: "S"
  }, "\u4E0B\u5B78\u671F\uFF08\u6625\uFF09")))), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 10
    }
  }, "\u6703\u5EFA\u7ACB ", /*#__PURE__*/React.createElement("b", null, plan.length), " \u9031", dup > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 \u5176\u4E2D ", /*#__PURE__*/React.createElement("b", null, dup), " \u9031\u5DF2\u7D93\u5B58\u5728\uFF08", /*#__PURE__*/React.createElement("b", null, "\u4E0D\u6703\u52D5\u5230"), "\uFF0C\u53EA\u88DC\u4E0A\u7F3A\u7684 ", fresh.length, " \u9031\uFF09"), plan.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 ", plan[0].zhRange, " \u5230 ", plan[plan.length - 1].zhRange)), /*#__PURE__*/React.createElement("div", {
    className: "term-preview"
  }, plan.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: 'term-chip' + (have.has(p.id) ? ' dup' : '')
  }, /*#__PURE__*/React.createElement("b", null, "\u7B2C ", p.n, " \u9031"), /*#__PURE__*/React.createElement("span", null, p.zhRange), have.has(p.id) && /*#__PURE__*/React.createElement("em", null, "\u5DF2\u5B58\u5728")))), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginTop: 12
    }
  }, "\uD83D\uDCA1 \u9031\u6B21\u5148\u958B\u597D\u3001\u5167\u5BB9\u6162\u6162\u88DC\u5C31\u597D\u2014\u2014", /*#__PURE__*/React.createElement("b", null, "\u9084\u6C92\u653E\u6771\u897F\u7684\u9031\u6B21\uFF0C\u5B78\u751F\u7AEF\u4E0D\u6703\u770B\u5230"), "\uFF0C \u6240\u4EE5\u4E0D\u6703\u51FA\u73FE\u4E00\u6574\u6392\u7A7A\u767D\u3002\uFF08\u8001\u5E2B\u6A21\u5F0F\u770B\u5F97\u5230\u5168\u90E8\u3002\uFF09")), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onClose
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: fresh.length === 0,
    onClick: () => onCreate(fresh, categories)
  }, fresh.length === 0 ? '沒有需要新增的週次' : `建立 ${fresh.length} 週 →`))));
}
function WeekModal({
  open,
  existingIds,
  onClose,
  onSave,
  editWeek
}) {
  var [nudgeCls, nudge] = useModalNudge(); // v461：點背景不關閉，只晃一下
  // editWeek = { id, label, dateRange, theme, themeZh } for editing existing week
  var isEdit = !!editWeek;
  var [form, setForm] = useS(null);
  useE(() => {
    if (open) {
      setForm(isEdit ? {
        ...editWeek
      } : {
        id: window.suggestNextWeekId(existingIds || []),
        label: "",
        dateRange: "",
        theme: "",
        themeZh: ""
      });
    }
  }, [open]);
  if (!open || !form) return null;
  var update = (k, v) => setForm(prev => ({
    ...prev,
    [k]: v
  }));
  var autoLabel = () => {
    var m = form.id.match(/W(\d{1,2})/i);
    return m ? `Week ${parseInt(m[1], 10)}` : form.id;
  };
  var handleSave = () => {
    var payload = {
      ...form,
      label: form.label?.trim() || autoLabel()
    };
    onSave(payload, isEdit ? editWeek.id : null); // pass oldId when renaming
  };
  var conflict = !isEdit && existingIds?.includes(form.id);
  var idChanged = isEdit && form.id !== editWeek.id;
  // Exclude the week's own current ID so renaming to a truly new ID never false-fires
  var otherIds = (existingIds || []).filter(id => id !== (editWeek?.id || ''));
  var idConflict = idChanged && otherIds.includes(form.id);
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: nudge
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal" + nudgeCls,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, isEdit ? 'Edit' : 'Add', " ", /*#__PURE__*/React.createElement("em", null, isEdit ? 'week' : 'new week')), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Week ID \xB7 \u9031\u6B21\u4EE3\u78BC"), /*#__PURE__*/React.createElement("input", {
    value: form.id,
    onChange: e => update("id", e.target.value.trim()),
    placeholder: "e.g. 2025-W16",
    style: {
      fontFamily: "var(--font-mono, monospace)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u683C\u5F0F\uFF1A", /*#__PURE__*/React.createElement("code", null, "YYYY-WNN"), "\uFF08\u4F8B ", /*#__PURE__*/React.createElement("code", null, "2026-W16"), "\uFF09\u3002\u7528\u4F86\u6392\u5E8F\u8207\u8B58\u5225\u3002", (conflict || idConflict) && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#c0392b",
      display: "block",
      marginTop: 4
    }
  }, "\u26A0 \u9019\u500B ID \u5DF2\u7D93\u5B58\u5728"), idChanged && !idConflict && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#b45309",
      display: "block",
      marginTop: 4
    }
  }, "\u26A0 \u5C07\u6703\u628A\u6240\u6709\u8CC7\u6599\u642C\u5230\u65B0 ID\u300C", form.id, "\u300D\u4E26\u522A\u9664\u820A\u7684"))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Label \xB7 \u986F\u793A\u540D\u7A31"), /*#__PURE__*/React.createElement("input", {
    value: form.label,
    onChange: e => update("label", e.target.value),
    placeholder: autoLabel()
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u7559\u7A7A\u6703\u81EA\u52D5\u7528\u300C", autoLabel(), "\u300D")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Date Range \xB7 \u65E5\u671F\u5340\u9593"), /*#__PURE__*/React.createElement("input", {
    value: form.dateRange,
    onChange: e => update("dateRange", e.target.value),
    placeholder: "e.g. Apr 14 \u2013 Apr 20"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Theme \xB7 \u672C\u9031\u4E3B\u984C (English)"), /*#__PURE__*/React.createElement("input", {
    value: form.theme,
    onChange: e => update("theme", e.target.value),
    placeholder: "e.g. Food & Cooking"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u4E2D\u6587\u4E3B\u984C"), /*#__PURE__*/React.createElement("input", {
    value: form.themeZh,
    onChange: e => update("themeZh", e.target.value),
    placeholder: "\u4F8B\uFF1A\u98DF\u7269\u8207\u6599\u7406"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: handleSave,
    disabled: conflict || idConflict || !form.id
  }, isEdit ? 'Save Changes' : 'Add Week')))));
}

/* ───── Export Modal ───── */
function ExportModal({
  open,
  weeks,
  weekOrder,
  onClose,
  showToast
}) {
  var [nudgeCls, nudge] = useModalNudge(); // v461：點背景不關閉，只晃一下
  /* v398：預設改成 Raw JSON。這顆的用途是「期末備份」，而 data.js (legacy) 那個
     格式裡的 CATEGORIES／helper 是寫死的舊版樣板，拿去覆蓋現在的 data.js 會壞。
     備份要的是純資料，所以一打開就停在 JSON。 */
  var [mode, setMode] = useS("json");
  var [copied, setCopied] = useS(false);
  useE(() => {
    if (open) {
      setMode("json");
      setCopied(false);
    }
  }, [open]);
  if (!open) return null;
  var jsonPayload = {
    weekOrder,
    weeks
  };
  var jsonStr = JSON.stringify(jsonPayload, null, 2);
  var seedJs = JSON.stringify(weeks, null, 2);
  var orderJs = JSON.stringify(weekOrder);
  var dataJsSnippet = `// data.js — Seed content + storage helpers
// Generated by Teacher Export on ${new Date().toISOString().slice(0, 19).replace("T", " ")}
// Drop in to replace the entire file.

const CATEGORIES = [
  {
    id: "vocab",
    num: "01",
    title: "FET Vocabulary",
    titleZh: "外師單字",
    desc: "Build vocabulary through Quizlet flashcards and Wordwall games — words from this week's FET lesson.",
    descZh: "本週外師課堂單字練習，透過 Quizlet 與 Wordwall 反覆練習，建立紮實的字彙基礎。",
  },
  {
    id: "grammar",
    num: "02",
    title: "Grammar",
    titleZh: "文法",
    desc: "Sentence patterns and grammar drills. Watch the explanation, then practice.",
    descZh: "本週文法重點：例句說明、影片解析、線上練習與評量。",
  },
  {
    id: "word",
    num: "03",
    title: "Word Study",
    titleZh: "字根字首",
    desc: "Roots, prefixes, suffixes — learn how words are built so you can decode unfamiliar ones.",
    descZh: "從字根字首認識單字結構，學會自己拆解陌生單字。",
  },
  {
    id: "reading",
    num: "04",
    title: "Reading Comprehension",
    titleZh: "閱讀理解",
    desc: "Short passages with comprehension questions. Read first, then answer.",
    descZh: "短文閱讀加上閱讀測驗題目，培養閱讀理解的速度與準確度。",
  },
];

// ───── Weeks (exported from teacher edits) ─────
const SEED_WEEKS = ${seedJs};

const DEFAULT_WEEK_ORDER = ${orderJs};

const WEEK_ORDER_KEY = "alans-english-week-order-v1";

function loadWeekOrder() {
  try {
    const raw = localStorage.getItem(WEEK_ORDER_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) {}
  return DEFAULT_WEEK_ORDER.slice();
}
function saveWeekOrder(order) {
  try { localStorage.setItem(WEEK_ORDER_KEY, JSON.stringify(order)); } catch (e) {}
}

function suggestNextWeekId(existingIds) {
  const parsed = existingIds
    .map(id => {
      const m = String(id).match(/^(\\d{4})-W(\\d{1,2})$/i);
      return m ? { year: +m[1], week: +m[2], id } : null;
    })
    .filter(Boolean);
  if (parsed.length === 0) {
    const d = new Date();
    return \`\${d.getFullYear()}-W01\`;
  }
  parsed.sort((a, b) => a.year - b.year || a.week - b.week);
  const last = parsed[parsed.length - 1];
  let nextYear = last.year, nextWeek = last.week + 1;
  if (nextWeek > 53) { nextYear += 1; nextWeek = 1; }
  return \`\${nextYear}-W\${String(nextWeek).padStart(2, "0")}\`;
}

const TYPE_META = {
  quizlet:  { label: "Quizlet",  zh: "字卡",   embed: true,  cta: "Close ×" },
  wordwall: { label: "Wordwall", zh: "遊戲",   embed: true,  cta: "Play →" },
  youtube:  { label: "Video",    zh: "影片",   embed: true,  cta: "Watch →" },
  form:     { label: "Quiz",     zh: "小考",   embed: true,  cta: "Take →" },
  pdf:      { label: "PDF",      zh: "練習卷", embed: false, cta: "Download ↓" },
  note:     { label: "Notes",    zh: "筆記",   embed: false, cta: "Read →" },
  image:    { label: "Image",    zh: "圖片",   embed: false, cta: "View →" },
  quiz:     { label: "Quiz",     zh: "測驗",   embed: false, cta: "Start →" },
  "circle-answer": { label: "Circle Answer", zh: "圈選題", embed: false, cta: "Start →" },
};

const STORAGE_KEY = "alans-english-data-v3";
const PROGRESS_KEY = "alans-english-progress-v1";

function dedupeDoubled(s) {
  if (typeof s !== "string" || s.length < 4) return s;
  const half = s.length / 2;
  if (Number.isInteger(half) && s.slice(0, half) === s.slice(half)) return s.slice(0, half);
  return s;
}
function cleanWeeks(weeks) {
  try {
    const out = JSON.parse(JSON.stringify(weeks));
    Object.values(out).forEach(w => {
      ;["theme", "themeZh", "subtitle", "subtitleZh", "label", "dateRange"].forEach(k => {
        if (w && typeof w[k] === "string") w[k] = dedupeDoubled(w[k]);
      });
    });
    return out;
  } catch (e) { return weeks; }
}

function loadWeeks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return cleanWeeks(JSON.parse(raw));
  } catch (e) {}
  return SEED_WEEKS;
}
function saveWeeks(weeks) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks)); } catch (e) {}
}
function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}
function saveProgress(prog) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(prog)); } catch (e) {}
}

function toYouTubeEmbed(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return "https://www.youtube.com/embed" + u.pathname;
    const v = u.searchParams.get("v");
    if (v) return "https://www.youtube.com/embed/" + v;
  } catch (e) {}
  return url;
}

Object.assign(window, {
  CATEGORIES, SEED_WEEKS, DEFAULT_WEEK_ORDER, TYPE_META,
  loadWeeks, saveWeeks, loadProgress, saveProgress, toYouTubeEmbed,
  loadWeekOrder, saveWeekOrder, suggestNextWeekId,
});
`;
  var content = mode === "dataJs" ? dataJsSnippet : jsonStr;
  var filename = mode === "dataJs" ? "data.js" : "weeks.json";
  var handleDownload = () => {
    var blob = new Blob([content], {
      type: "text/plain;charset=utf-8"
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast && showToast("Downloaded " + filename);
  };
  var handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      var ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (e2) {
        showToast && showToast("Copy failed");
      }
      document.body.removeChild(ta);
    }
  };
  var weekCount = weekOrder.length;
  var itemCount = 0;
  Object.values(weeks).forEach(w => {
    if (!w?.items) return;
    Object.values(w.items).forEach(arr => {
      itemCount += arr?.length || 0;
    });
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: nudge
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal wide" + nudgeCls,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "Export ", /*#__PURE__*/React.createElement("em", null, "data")), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px",
      background: "var(--bg-cream, #f7f3eb)",
      border: "1px solid var(--rule, #e6e0d2)",
      borderRadius: 3,
      fontSize: 13,
      lineHeight: 1.55,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("strong", null, weekCount, " weeks"), " \xB7 ", /*#__PURE__*/React.createElement("strong", null, itemCount, " items"), " \u76EE\u524D\u5132\u5B58\u5728\u96F2\u7AEF\u3002", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-muted)"
    }
  }, "\u9019\u4EFD JSON \u5099\u4EFD\u53EF\u7528\u4F86\u9084\u539F\u8CC7\u6599\uFF0C\u6216\u5728\u65B0\u7684 Firebase \u5C08\u6848\u91CD\u65B0\u532F\u5165\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Format \xB7 \u683C\u5F0F"), /*#__PURE__*/React.createElement("div", {
    className: "type-picker"
  }, /*#__PURE__*/React.createElement("button", {
    className: mode === "dataJs" ? "active" : "",
    onClick: () => setMode("dataJs")
  }, "data.js (legacy)"), /*#__PURE__*/React.createElement("button", {
    className: mode === "json" ? "active" : "",
    onClick: () => setMode("json")
  }, "Raw JSON")), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, mode === "dataJs" ? "舊版靜態 data.js 格式（不含 Firebase sync）— 純備份用。" : "純資料 JSON — 備份或之後匯入用。")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Preview \xB7 \u9810\u89BD"), /*#__PURE__*/React.createElement("textarea", {
    readOnly: true,
    value: content,
    rows: 12,
    style: {
      fontFamily: "var(--font-mono, ui-monospace, monospace)",
      fontSize: 11.5,
      lineHeight: 1.5,
      background: "#1a1a1a",
      color: "#e8e4d8",
      border: "1px solid #2a2a2a",
      borderRadius: 3,
      padding: 12,
      whiteSpace: "pre",
      width: "100%",
      resize: "vertical"
    },
    onClick: e => e.target.select()
  }))), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--ink-muted)",
      fontFamily: "var(--mono, monospace)"
    }
  }, filename), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: handleCopy
  }, copied ? "✓ Copied" : "Copy"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: handleDownload
  }, "Download")))));
}

/* ── WritingPracticeEditor ── */
function WritingPracticeEditor({
  catItems,
  linkedFlashcardId,
  prompts,
  onChangeLinkedFlashcardId,
  onChangePrompts
}) {
  var [importing, setImporting] = useS(false);
  var [importText, setImportText] = useS('');
  var [importErr, setImportErr] = useS('');
  var flashcards = (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0);
  var addPrompt = () => onChangePrompts([...prompts, {
    id: 'wp' + Date.now() + Math.random().toString(36).slice(2, 5),
    word: '',
    zh: '',
    instruction: ''
  }]);
  var updatePrompt = (id, field, value) => onChangePrompts(prompts.map(p => p.id === id ? {
    ...p,
    [field]: value
  } : p));
  var deletePrompt = id => onChangePrompts(prompts.filter(p => p.id !== id));
  var doImport = () => {
    var parsed = [];
    importText.split('\n').map(line => line.trim()).filter(Boolean).forEach((line, index) => {
      // v251: 統一分隔符——Tab／|／「 - 」都吃
      var cols = (line.includes('\t') ? line.split('\t') : line.includes('|') ? line.split('|') : /\s+-\s+/.test(line) ? line.split(/\s+-\s+/) : [line]).map(c => c.trim().replace(/^"|"$/g, ''));
      var word = cols[0] || '';
      if (!word) return;
      parsed.push({
        id: 'wp' + Date.now() + index + Math.random().toString(36).slice(2, 4),
        word,
        zh: cols[1] || '',
        instruction: cols[2] || ''
      });
    });
    if (!parsed.length) {
      setImportErr('沒有可匯入的題目。格式：造句要求 [Tab] 中文提示（選填） [Tab] 補充規則（選填）');
      return;
    }
    onChangePrompts([...prompts, ...parsed]);
    setImportText('');
    setImportErr('');
    setImporting(false);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Mode \xB7 \u51FA\u984C\u65B9\u5F0F"), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 8
    }
  }, "\u53EF\u4EE5\u7D81\u5B9A\u55AE\u5B57\u5361\uFF0C\u4E5F\u53EF\u4EE5\u5728\u4E0B\u65B9\u76F4\u63A5\u65B0\u589E\u9020\u53E5\u984C\uFF1B\u5169\u7A2E\u53EF\u4EE5\u540C\u6642\u5B58\u5728\u3002"), /*#__PURE__*/React.createElement("select", {
    value: linkedFlashcardId || '',
    onChange: e => onChangeLinkedFlashcardId(e.target.value),
    style: {
      width: "100%",
      padding: "9px 12px",
      border: "1px solid var(--border)",
      background: "var(--bg)",
      color: "var(--ink)",
      borderRadius: 2,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 \u4E0D\u7D81\u5B9A\u55AE\u5B57\u5361\uFF0C\u4F7F\u7528\u81EA\u8A02\u984C\u76EE \u2014"), flashcards.map(fc => /*#__PURE__*/React.createElement("option", {
    key: fc.id,
    value: fc.id
  }, fc.title, " (", (fc.cards || []).length, " \u5F35)"))), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u82E5\u6709\u7D81\u5B9A\u55AE\u5B57\u5361\uFF0C\u5B78\u751F\u6703\u5148\u505A\u55AE\u5B57\u5361\u9020\u53E5\uFF1B\u4E0B\u65B9\u81EA\u8A02\u984C\u6703\u63A5\u5728\u5F8C\u9762\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      margin: 0
    }
  }, "Custom writing prompts \xB7 \u81EA\u8A02\u9020\u53E5\u984C (", prompts.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => {
      setImporting(v => !v);
      setImportErr('');
    }
  }, importing ? '✕ 取消' : '⬇ Import'), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '5px 12px'
    },
    onClick: addPrompt
  }, "+ Add"))), importing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 8,
      lineHeight: 1.7
    }
  }, "\u6BCF\u884C\u4E00\u984C\u3002\u53EF\u5F9E\u8A66\u7B97\u8868\u8CBC\u4E0A\uFF1A\u9020\u53E5\u8981\u6C42 / \u4E2D\u6587\u63D0\u793A / \u88DC\u5145\u898F\u5247\u3002"), /*#__PURE__*/React.createElement("textarea", {
    value: importText,
    onChange: e => {
      setImportText(e.target.value);
      setImportErr('');
    },
    placeholder: 'because\t因為\tWrite a sentence using because.\nmy favorite animal\t我最喜歡的動物\tWrite at least 8 words.',
    rows: 7,
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 13,
      fontFamily: 'var(--mono)',
      resize: 'vertical',
      boxSizing: 'border-box'
    }
  }), importErr && /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#dc2626',
      fontSize: 12,
      marginTop: 5
    }
  }, importErr), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '6px 16px'
    },
    onClick: doImport,
    disabled: !importText.trim()
  }, "Import prompts"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '0.8fr 0.8fr 1.2fr auto',
      gap: '6px 8px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)'
    }
  }, "Prompt / Word"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)'
    }
  }, "\u4E2D\u6587\u63D0\u793A"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)'
    }
  }, "Instruction\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("div", null), prompts.map(p => /*#__PURE__*/React.createElement(React.Fragment, {
    key: p.id
  }, /*#__PURE__*/React.createElement("input", {
    value: p.word || '',
    onChange: e => updatePrompt(p.id, 'word', e.target.value),
    placeholder: "because / my favorite animal",
    style: {
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: p.zh || '',
    onChange: e => updatePrompt(p.id, 'zh', e.target.value),
    placeholder: "\u56E0\u70BA / \u6211\u6700\u559C\u6B61\u7684\u52D5\u7269",
    style: {
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: p.instruction || '',
    onChange: e => updatePrompt(p.id, 'instruction', e.target.value),
    placeholder: "Write at least 8 words.",
    style: {
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => deletePrompt(p.id),
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      borderRadius: 2,
      background: 'none',
      cursor: 'pointer',
      color: 'var(--ink-3)',
      fontSize: 13
    },
    title: "Delete"
  }, "\u2715")))), prompts.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      textAlign: 'center',
      color: 'var(--ink-faint)',
      fontSize: 13
    }
  }, "\u5C1A\u672A\u65B0\u589E\u81EA\u8A02\u984C\u3002\u82E5\u4E0D\u7D81\u55AE\u5B57\u5361\uFF0C\u8ACB\u81F3\u5C11\u65B0\u589E\u4E00\u984C\u3002")));
}

/* ── v254: SpellingEditor —— 聽寫單字清單（匯入 Tab/|/「 - 」＋逐列編輯＋試聽）── */
function SpellingEditor({
  words,
  onChange
}) {
  var [importing, setImporting] = useS(false);
  var [importText, setImportText] = useS('');
  var upd = (id, field, val) => onChange(words.map(w => w.id === id ? {
    ...w,
    [field]: val
  } : w));
  var del = id => onChange(words.filter(w => w.id !== id));
  var add = () => onChange([...words, {
    id: 'sp' + Date.now() + Math.random().toString(36).slice(2, 4),
    word: '',
    zh: ''
  }]);
  var doImport = () => {
    var parsed = importText.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
      var cols = (line.includes('\t') ? line.split('\t') : line.includes('|') ? line.split('|') : /\s+-\s+/.test(line) ? line.split(/\s+-\s+/) : [line]).map(c => c.trim().replace(/^"|"$/g, ''));
      return {
        id: 'sp' + Date.now() + i + Math.random().toString(36).slice(2, 4),
        word: cols[0] || '',
        zh: cols[1] || ''
      };
    }).filter(w => w.word);
    if (!parsed.length) return;
    onChange([...words, ...parsed]);
    setImportText('');
    setImporting(false);
  };
  var hear = w => {
    if (window.speakText && w.word) window.speakText(w.word, {
      lang: 'en-US',
      rate: 0.82
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "spe"
  }, /*#__PURE__*/React.createElement("div", {
    className: "spe-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: "var(--ink-muted)"
    }
  }, words.length, " \u500B\u55AE\u5B57"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost" + (importing ? " active" : ""),
    style: {
      padding: "6px 12px",
      fontSize: 11
    },
    onClick: () => setImporting(v => !v)
  }, "\u2B07 Import"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn primary",
    style: {
      padding: "6px 12px",
      fontSize: 11
    },
    onClick: add
  }, "+ \u52A0\u4E00\u500B"))), importing && /*#__PURE__*/React.createElement("div", {
    className: "fc-import-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 10,
      color: "var(--ink-muted)",
      marginBottom: 8
    }
  }, "\u6BCF\u884C\u4E00\u500B\u55AE\u5B57\uFF0C\u6B04\u4F4D\u7528 Tab\uFF08\u8A66\u7B97\u8868\u76F4\u8CBC\uFF09\u3001| \u6216\u300C - \u300D\u5206\u9694\uFF1A\u82F1\u6587\uFF0F\u4E2D\u6587\u63D0\u793A\uFF08\u4E2D\u6587\u53EF\u7701\u7565\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    className: "fc-import-ta",
    rows: 7,
    value: importText,
    onChange: e => setImportText(e.target.value),
    placeholder: "apple - 蘋果\nqueen - 女王\nbeautiful"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 8,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost",
    onClick: () => {
      setImporting(false);
      setImportText('');
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn primary",
    onClick: doImport,
    disabled: !importText.trim()
  }, "Import"))), words.length === 0 && !importing && /*#__PURE__*/React.createElement("div", {
    className: "fc-card-empty mono"
  }, "\u9084\u6C92\u6709\u55AE\u5B57 \u2014 \u9EDE\u300C+ \u52A0\u4E00\u500B\u300D\u6216 Import \u532F\u5165"), words.map((w, i) => /*#__PURE__*/React.createElement("div", {
    className: "spe-row",
    key: w.id
  }, /*#__PURE__*/React.createElement("span", {
    className: "spe-num mono"
  }, i + 1), /*#__PURE__*/React.createElement("input", {
    className: "spe-word",
    value: w.word,
    placeholder: "\u82F1\u6587\u55AE\u5B57",
    onChange: e => upd(w.id, 'word', e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "spe-zh",
    value: w.zh || '',
    placeholder: "\u4E2D\u6587\u63D0\u793A\uFF08\u9078\u586B\uFF09",
    onChange: e => upd(w.id, 'zh', e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost spe-hear",
    title: "\u8A66\u807D\u767C\u97F3",
    onClick: () => hear(w)
  }, "\uD83D\uDD0A"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost spe-del",
    title: "\u522A\u9664",
    onClick: () => del(w.id)
  }, "\u2715"))));
}

/* ── TypeAnswerEditor ── */
function TypeAnswerEditor({
  pairs,
  instruction,
  onChangePairs,
  onChangeInstruction
}) {
  var [importing, setImporting] = useS(false);
  var [importText, setImportText] = useS('');
  var [importErr, setImportErr] = useS('');
  var addPair = () => onChangePairs([...pairs, {
    id: Date.now().toString(),
    prompt: '',
    answer: '',
    explain: ''
  }]);
  var delPair = id => onChangePairs(pairs.filter(p => p.id !== id));
  var updPair = (id, field, val) => onChangePairs(pairs.map(p => p.id === id ? {
    ...p,
    [field]: val
  } : p));
  var doImport = () => {
    var lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    var parsed = [];
    var bad = [];
    lines.forEach((line, i) => {
      // v251: 統一分隔符——Tab／|／「 - 」，最後才試逗號（舊格式相容）
      var cols = (line.includes('\t') ? line.split('\t') : line.includes('|') ? line.split('|') : /\s+-\s+/.test(line) ? line.split(/\s+-\s+/) : line.split(',')).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2 || !cols[0] || !cols[1]) {
        bad.push(i + 1);
        return;
      }
      parsed.push({
        id: Date.now().toString() + i,
        prompt: cols[0],
        answer: cols[1],
        explain: cols[2] || ''
      });
    });
    if (parsed.length === 0) {
      setImportErr('沒有可匯入的資料，請確認格式（每行：題目 TAB 答案）');
      return;
    }
    onChangePairs([...pairs, ...parsed]);
    setImportText('');
    setImporting(false);
    setImportErr('');
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Instruction \xB7 \u6307\u793A\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: instruction,
    onChange: e => onChangeInstruction(e.target.value),
    placeholder: "e.g. Type the irregular past tense",
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u5B78\u751F\u4F5C\u7B54\u6642\u6703\u770B\u5230\u9019\u884C\u8AAA\u660E\uFF08\u4E0D\u586B\u5247\u53EA\u986F\u793A\u984C\u76EE\uFF09\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      margin: 0
    }
  }, "\u984C\u76EE \xB7 Pairs (", pairs.length, ")"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '4px 10px'
    },
    onClick: () => {
      setImporting(i => !i);
      setImportErr('');
    }
  }, importing ? '✕ 取消' : '📋 貼上匯入')), importing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-cream,#f7f3eb)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)',
      marginBottom: 8
    }
  }, "\u5F9E Excel / Google Sheets \u8907\u88FD\uFF0C\u8CBC\u4E0A\u5F8C\u6309\u300C\u532F\u5165\u300D\u3002", /*#__PURE__*/React.createElement("br", null), "\u683C\u5F0F\uFF1A", /*#__PURE__*/React.createElement("strong", null, "\u7B2C\u4E00\u6B04 = Prompt"), "\uFF0C", /*#__PURE__*/React.createElement("strong", null, "\u7B2C\u4E8C\u6B04 = Answer"), "\uFF0C", /*#__PURE__*/React.createElement("strong", null, "\u7B2C\u4E09\u6B04 = Explain\uFF08\u9078\u586B\uFF09"), "\uFF0CTab \u5206\u9694\u3002"), /*#__PURE__*/React.createElement("textarea", {
    value: importText,
    onChange: e => {
      setImportText(e.target.value);
      setImportErr('');
    },
    placeholder: 'go\twent\nThe dog ____ fast. (run)\truns\t"The dog" is singular → runs',
    rows: 6,
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 13,
      fontFamily: 'var(--mono)',
      resize: 'vertical',
      boxSizing: 'border-box'
    }
  }), importErr && /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#dc2626',
      fontSize: 12,
      marginTop: 4
    }
  }, importErr), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '6px 16px'
    },
    onClick: doImport,
    disabled: !importText.trim()
  }, "\u532F\u5165 ", importText.trim() ? `(${importText.split('\n').filter(l => l.trim()).length} 行)` : ''), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '6px 14px'
    },
    onClick: () => {
      setImporting(false);
      setImportErr('');
    }
  }, "\u53D6\u6D88"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 0.7fr 1.2fr auto',
      gap: '6px 8px',
      alignItems: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)',
      paddingLeft: 2
    }
  }, "Prompt\uFF08\u984C\u76EE\uFF09"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)',
      paddingLeft: 2
    }
  }, "Answer\uFF08\u7B54\u6848\uFF09"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)',
      paddingLeft: 2
    }
  }, "Explain\uFF08\u8A73\u89E3\uFF0C\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("div", null), pairs.map(p => /*#__PURE__*/React.createElement(React.Fragment, {
    key: p.id
  }, /*#__PURE__*/React.createElement("input", {
    value: p.prompt,
    onChange: e => updPair(p.id, 'prompt', e.target.value),
    placeholder: "The dog ____ fast. (run)",
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: p.answer,
    onChange: e => updPair(p.id, 'answer', e.target.value),
    placeholder: "runs",
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: p.explain || '',
    onChange: e => updPair(p.id, 'explain', e.target.value),
    placeholder: "e.g. singular subject \u2192 verb+s",
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink-soft)',
      borderRadius: 2,
      fontSize: 12,
      fontStyle: 'italic'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => delPair(p.id),
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      borderRadius: 2,
      background: 'none',
      cursor: 'pointer',
      color: 'var(--ink-3)',
      fontSize: 13
    },
    title: "Delete"
  }, "\u2715")))), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '6px 14px'
    },
    onClick: addPair
  }, "\uFF0B Add pair"), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "Explain \u6B04\uFF08\u9078\u586B\uFF09\uFF1A\u7B54\u984C\u5F8C\u986F\u793A\u7D66\u5B78\u751F\uFF0C\u8AAA\u660E\u8A9E\u6CD5\u898F\u5247\u6216\u7B54\u984C\u908F\u8F2F\u3002")));
}

/* ── ShortAnswerEditor ── */
function ShortAnswerEditor({
  passage,
  questions,
  saYoutube,
  onChangePassage,
  onChangeQuestions,
  onChangeSaYoutube
}) {
  var [importing, setImporting] = useS(false);
  var [importText, setImportText] = useS('');
  var [importErr, setImportErr] = useS('');
  var addQ = () => {
    var id = 'sa' + Date.now() + Math.random().toString(36).slice(2, 5);
    onChangeQuestions([...questions, {
      id,
      question: '',
      keyPoints: ''
    }]);
  };
  var updateQ = (id, patch) => onChangeQuestions(questions.map(q => q.id === id ? {
    ...q,
    ...patch
  } : q));
  var deleteQ = id => onChangeQuestions(questions.filter(q => q.id !== id));
  var doImport = () => {
    var lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      setImportErr('沒有內容可匯入');
      return;
    }
    var parsed = lines.map((line, i) => {
      var parts = line.split('\t');
      var question = parts[0]?.trim() || '';
      var keyPoints = parts[1]?.trim() || '';
      if (!question) return null;
      return {
        id: 'sa' + Date.now() + i + Math.random().toString(36).slice(2, 4),
        question,
        keyPoints
      };
    }).filter(Boolean);
    if (!parsed.length) {
      setImportErr('請確認格式：每行至少一欄（問題）');
      return;
    }
    onChangeQuestions([...questions, ...parsed]);
    setImportText('');
    setImporting(false);
    setImportErr('');
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u25B6 \u8907\u7FD2\u5F71\u7247 YouTube URL\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: saYoutube || '',
    onChange: e => onChangeSaYoutube(e.target.value),
    placeholder: "https://www.youtube.com/watch?v=...",
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 14,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u586B\u5165\u5F8C\uFF0C\u5B78\u751F\u5728\u958B\u59CB\u6E2C\u9A57\u524D\u7684\u300C\u6E96\u5099\u300D\u756B\u9762\u53EF\u4EE5\u5148\u770B\u9019\u652F\u5F71\u7247\u8907\u7FD2\u3002\u9032\u5165\u4F5C\u7B54\u5F8C\u5F71\u7247\u4E0D\u6703\u518D\u986F\u793A\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\uD83D\uDCC4 AI \u53C3\u8003\u6587\u7AE0 Passage\uFF08\u5B78\u751F\u4E0D\u53EF\u898B\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    value: passage,
    onChange: e => onChangePassage(e.target.value),
    placeholder: "\u8CBC\u4E0A\u6587\u7AE0\u6587\u5B57\uFF0CAI \u6279\u6539\u6642\u6703\u53C3\u8003\u9019\u6BB5\u5167\u5BB9\u5224\u65B7\u7B54\u6848\u662F\u5426\u6B63\u78BA\u2026",
    rows: 8,
    style: {
      width: '100%',
      fontFamily: 'var(--sans)',
      fontSize: 14,
      padding: '10px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      resize: 'vertical',
      lineHeight: 1.7,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u26A0 \u9019\u6BB5\u6587\u5B57\u53EA\u4F9B AI \u6279\u6539\u7528\uFF0C\u5B78\u751F\u4F5C\u7B54\u6642\u4E0D\u6703\u770B\u5230\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      margin: 0
    }
  }, "\u554F\u984C Questions (", questions.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => {
      setImporting(v => !v);
      setImportErr('');
    }
  }, importing ? '✕ 取消' : '⬇ Import'), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '5px 12px'
    },
    onClick: addQ
  }, "+ Add"))), importing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 8
    }
  }, "\u5F9E Excel / Google Sheets \u8907\u88FD\u8CBC\u4E0A\uFF1A", /*#__PURE__*/React.createElement("code", {
    style: {
      background: 'var(--border-soft)',
      padding: '1px 4px',
      borderRadius: 2,
      marginLeft: 4
    }
  }, "\u554F\u984C [Tab] \u7B54\u6848\u8981\u9EDE\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 4,
      color: 'var(--ink-faint)'
    }
  }, "\xB7 \u6BCF\u884C\u4E00\u984C\uFF0C\u7B54\u6848\u8981\u9EDE\u90A3\u6B04\u53EF\u4EE5\u7559\u7A7A")), /*#__PURE__*/React.createElement("textarea", {
    value: importText,
    onChange: e => {
      setImportText(e.target.value);
      setImportErr('');
    },
    placeholder: "What did the boy do when he saw the fire?\tHe called 119 / He ran for help\nWhere did the family go after the flood?\tThey went to a shelter\nWhy was the dog barking?",
    rows: 6,
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 12,
      fontFamily: 'var(--mono)',
      resize: 'vertical',
      boxSizing: 'border-box',
      lineHeight: 1.6
    }
  }), importErr && /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#dc2626',
      fontSize: 12,
      marginTop: 4
    }
  }, importErr), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '6px 14px'
    },
    onClick: () => {
      setImporting(false);
      setImportText('');
      setImportErr('');
    }
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '6px 16px'
    },
    onClick: doImport,
    disabled: !importText.trim()
  }, "\u532F\u5165 ", importText.trim() ? `(${importText.split('\n').filter(l => l.trim()).length} 題)` : ''))), /*#__PURE__*/React.createElement("div", {
    className: "fc-card-list"
  }, questions.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "fc-card-empty mono"
  }, "\u5C1A\u672A\u65B0\u589E\u554F\u984C \u2014 \u9EDE\u9078\u53F3\u4E0A\u65B9 Add"), questions.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: q.id,
    className: "fc-card-row open"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-card-row-head",
    style: {
      cursor: 'default'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: 'var(--ink-faint)',
      fontSize: 10,
      minWidth: 18,
      flexShrink: 0
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    className: "fc-row-term",
    style: {
      fontSize: 13
    }
  }, q.question || /*#__PURE__*/React.createElement("em", {
    style: {
      color: 'var(--ink-faint)'
    }
  }, "\u672A\u586B\u5BEB")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm('Delete?')) deleteQ(q.id);
    },
    style: {
      color: 'var(--accent)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      flexShrink: 0
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "fc-card-row-body",
    style: {
      gridTemplateColumns: '1fr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-card-fields"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u554F\u984C Question"), /*#__PURE__*/React.createElement("input", {
    value: q.question,
    onChange: e => updateQ(q.id, {
      question: e.target.value
    }),
    placeholder: "What did the boy do when he saw the fire?"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u7B54\u6848\u8981\u9EDE Key Points", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      textTransform: 'none',
      color: 'var(--ink-muted)',
      marginLeft: 6
    }
  }, "(AI \u8A55\u5206\u4F9D\u64DA\uFF0C\u9078\u586B)")), /*#__PURE__*/React.createElement("input", {
    value: q.keyPoints || '',
    onChange: e => updateQ(q.id, {
      keyPoints: e.target.value
    }),
    placeholder: "He called 119 / He ran to get help / He stayed calm"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u7528 / \u5206\u9694\u591A\u500B\u8981\u9EDE\u3002AI \u6703\u53C3\u8003\u9019\u4E9B\u8981\u9EDE\u6C7A\u5B9A\u7D66\u5E7E\u9846\u661F\u3002")))))))));
}

/* ── 分段閱讀共用 helpers（v281 抽出：段落題與綜合題共用同一套題目編輯/匯入）── */
var grMkId = p => p + Date.now() + Math.random().toString(36).slice(2, 5);

/* v290: OCR 的「行」是否落在框內——y 中心在框的縱向範圍且 x 有重疊（舊資料沒 x 就只看 y） */
function grLineInRect(l, r) {
  if (l.y < r.y || l.y > r.y + r.h) return false;
  if (l.x == null) return true;
  return l.x + (l.w || 0) > r.x && l.x < r.x + r.w;
}

/* v287: OCR——照片/PDF 的「點字查義＋朗讀」資料來源。Tesseract.js 用到才從 CDN 載。 */
var loadTesseract = () => new Promise((resolve, reject) => {
  if (window.Tesseract) return resolve(window.Tesseract);
  var s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
  s.onload = () => resolve(window.Tesseract);
  s.onerror = () => reject(new Error('OCR 元件載入失敗，請確認網路'));
  document.head.appendChild(s);
});
async function grOcrWorker() {
  var T = await loadTesseract();
  var worker = await T.createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  return worker;
}
// 座標一律存成整張圖的比例（0~1）——裁切段落顯示時換算成該帶內位置
async function grOcrCanvas(worker, cv) {
  var {
    data
  } = await worker.recognize(cv);
  var W = cv.width,
    H = cv.height;
  var r4 = n => Math.round(n * 10000) / 10000;
  var words = (data.words || []).filter(w => w.confidence > 50 && w.bbox && /[A-Za-z]/.test(w.text)).map(w => ({
    t: String(w.text).replace(/^[^A-Za-z'’-]+|[^A-Za-z'’-]+$/g, ''),
    r: String(w.text).trim().replace(/[|_~•·¤©®°§\\<>{}*#@^=+]+/g, ''),
    // v292: 含標點原文（朗讀用）
    x: r4(w.bbox.x0 / W),
    y: r4(w.bbox.y0 / H),
    w: r4((w.bbox.x1 - w.bbox.x0) / W),
    h: r4((w.bbox.y1 - w.bbox.y0) / H)
  })).filter(w => w.t.length > 1);
  var lines = (data.lines || []).filter(l => l.bbox && String(l.text || '').trim()).map(l => ({
    t: String(l.text).trim(),
    y: r4((l.bbox.y0 + l.bbox.y1) / 2 / H),
    x: r4(l.bbox.x0 / W),
    w: r4((l.bbox.x1 - l.bbox.x0) / W) // v290: 朗讀區域框選需要水平位置
  }));
  return {
    words,
    lines
  };
}

// v299: OCR 移到背景跑——共用一個「暖」worker（15MB 模型只載一次，不再每次匯入重載）；
// OCR 前把 canvas 縮到 1200px（座標存 0~1 比例，縮圖不影響定位）＝辨識更快。
var _grWarmWorkerP = null;
function grWarmWorker() {
  if (!_grWarmWorkerP) _grWarmWorkerP = grOcrWorker().catch(e => {
    _grWarmWorkerP = null;
    throw e;
  });
  return _grWarmWorkerP;
}
function grOcrScaled(cv) {
  var MAX = 1200,
    k = Math.min(1, MAX / Math.max(cv.width, cv.height));
  if (k >= 1) return cv;
  var c2 = document.createElement('canvas');
  c2.width = Math.round(cv.width * k);
  c2.height = Math.round(cv.height * k);
  c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height);
  return c2;
}

/* v387（Alan：「分段閱讀上傳 PDF 太久了」）——記憶體那一半的修法。
   原本 srcCache 存的是「整張已解碼的畫布」：1600×2264 × 4 bytes ＝ 一頁 14.5MB，
   20 頁就 290MB，40 頁 580MB。iPad 上會 GC 抖動、畫布被系統回收、甚至整頁掛掉，
   而且越後面的頁越慢——這正是「太久」的體感來源之一。
   改成存壓好的 JPEG blob（一頁約 0.5MB，少 24 倍），
   背景 OCR 要用的時候再解碼，而且直接解到 1200px（OCR 本來就只吃這個大小）。 */
async function grDecodeScaled(blob, MAX) {
  var url = URL.createObjectURL(blob);
  try {
    var img = await new Promise((res, rej) => {
      var i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('圖片解碼失敗'));
      i.src = url;
    });
    var w = img.naturalWidth || img.width,
      h = img.naturalHeight || img.height;
    var k = Math.min(1, (MAX || 1200) / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 匯入解析——沿用測驗題慣例「第一個選項＝正解」；0–1 個選項欄＝簡答題；
// 分段閱讀作答時不洗牌，所以匯入當下就把選項打散。
function grParseImport(text) {
  var lines = String(text || '').split('\n').map(l => l.replace(/\r/g, '')).filter(l => l.trim());
  var errs = [],
    adds = [];
  lines.forEach((line, li) => {
    var cols = line.split('\t').map(c => c.trim());
    var q = cols[0] || '';
    if (!q) {
      errs.push(`第 ${li + 1} 行：沒有題目文字`);
      return;
    }
    var rest = cols.slice(1).filter(Boolean);
    if (rest.length >= 2) {
      var options = rest.slice(0, 4);
      var correctText = options[0];
      for (var i = options.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      var answer = options.indexOf(correctText);
      while (options.length < 4) options.push('');
      adds.push({
        id: grMkId('gq'),
        kind: 'mc',
        q,
        options,
        answer
      });
    } else {
      adds.push({
        id: grMkId('gq'),
        kind: 'short',
        q,
        keyPoints: rest[0] || ''
      });
    }
  });
  return {
    errs,
    adds
  };
}

/* 題目清單編輯器——段落題與綜合題共用：題目卡＋新增＋⬇ 匯入面板 */
function GrQuestionsEditor({
  qs,
  onChange,
  impOpen,
  onToggleImp,
  impText,
  onImpText,
  previewLabel,
  inputStyle,
  aiHint
}) {
  var addQ = kind => onChange([...qs, kind === 'short' ? {
    id: grMkId('gq'),
    kind: 'short',
    q: '',
    keyPoints: ''
  } : {
    id: grMkId('gq'),
    kind: 'mc',
    q: '',
    options: ['', '', '', ''],
    answer: 0
  }]);
  var updQ = (qi, patch) => onChange(qs.map((q, i) => i === qi ? {
    ...q,
    ...patch
  } : q));
  var delQ = qi => onChange(qs.filter((_, i) => i !== qi));
  var {
    errs,
    adds
  } = impOpen ? grParseImport(impText) : {
    errs: [],
    adds: []
  };
  var mcN = adds.filter(a => a.kind === 'mc').length;
  var doImp = () => {
    if (errs.length || !adds.length) return;
    onChange([...qs, ...adds]);
    onImpText('');
    onToggleImp();
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, qs.map((q, qi) => /*#__PURE__*/React.createElement("div", {
    key: q.id || qi,
    style: {
      border: '1px dashed var(--border)',
      borderRadius: 6,
      padding: '10px 12px',
      marginTop: 8,
      background: 'var(--bg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)'
    }
  }, q.kind === 'short' ? '✍ 簡答' : '🅰 選擇', " Q", qi + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm('刪除這一題？')) delQ(qi);
    },
    style: {
      color: 'var(--accent)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: 13
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("input", {
    value: q.q || '',
    onChange: e => updQ(qi, {
      q: e.target.value
    }),
    placeholder: q.kind === 'short' ? 'Why did the fox let the balloon go?' : 'What did the fox find in the forest?',
    style: inputStyle
  }), q.kind === 'short' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: q.keyPoints || '',
    onChange: e => updQ(qi, {
      keyPoints: e.target.value
    }),
    placeholder: "\u7B54\u6848\u8981\u9EDE\uFF08AI \u8A55\u5206\u4F9D\u64DA\uFF0C\u7528 / \u5206\u9694\uFF0C\u9078\u586B\uFF09",
    style: {
      ...inputStyle,
      marginTop: 6
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginTop: 4
    }
  }, aiHint || 'AI 會拿「這一段的文字＋答案要點」批改，給 1–5 星。')) : /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      display: 'grid',
      gap: 6
    }
  }, (q.options || ['', '', '', '']).map((opt, oi) => /*#__PURE__*/React.createElement("label", {
    key: oi,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    checked: (q.answer || 0) === oi,
    onChange: () => updQ(qi, {
      answer: oi
    }),
    title: "\u6B63\u78BA\u7B54\u6848"
  }), /*#__PURE__*/React.createElement("input", {
    value: opt,
    onChange: e => {
      var os = [...(q.options || ['', '', '', ''])];
      os[oi] = e.target.value;
      updQ(qi, {
        options: os
      });
    },
    placeholder: `選項 ${['A', 'B', 'C', 'D'][oi]}${oi >= 2 ? '（選填）' : ''}`,
    style: inputStyle
  }))), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      margin: 0
    }
  }, "\u9EDE\u5DE6\u908A\u5713\u5708\uFF1D\u6B63\u78BA\u7B54\u6848\u3002\u81F3\u5C11\u586B A\u3001B \u5169\u500B\u9078\u9805\uFF1B\u9078\u9805\u7167\u4F60\u6392\u7684\u9806\u5E8F\u986F\u793A\uFF08\u4E0D\u6D17\u724C\uFF09\u3002")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => addQ('mc')
  }, "\uFF0B \u9078\u64C7\u984C"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => addQ('short')
  }, "\uFF0B \u7C21\u7B54\u984C"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => {
      onImpText('');
      onToggleImp();
    }
  }, impOpen ? '✕ 取消' : '⬇ 匯入')), impOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      padding: '10px 12px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 6,
      lineHeight: 1.8
    }
  }, "\u5F9E Excel / Google Sheets \u8907\u88FD\u8CBC\u4E0A\uFF0C\u6BCF\u884C\u4E00\u984C\uFF1A", /*#__PURE__*/React.createElement("br", null), "\u9078\u64C7\u984C\uFF1A", /*#__PURE__*/React.createElement("code", {
    style: {
      background: 'var(--border-soft)',
      padding: '1px 4px',
      borderRadius: 2
    }
  }, "\u984C\u76EE [Tab] \u6B63\u89E3 [Tab] \u5176\u4ED6\u9078\u9805\u2026"), "\uFF08\u8DDF\u6E2C\u9A57\u984C\u4E00\u6A23", /*#__PURE__*/React.createElement("b", null, "\u7B2C\u4E00\u500B\uFF1D\u6B63\u89E3"), "\uFF0C\u6700\u591A 4 \u500B\uFF0C\u532F\u5165\u6642\u81EA\u52D5\u6253\u6563\u9806\u5E8F\uFF09", /*#__PURE__*/React.createElement("br", null), "\u7C21\u7B54\u984C\uFF1A", /*#__PURE__*/React.createElement("code", {
    style: {
      background: 'var(--border-soft)',
      padding: '1px 4px',
      borderRadius: 2
    }
  }, "\u984C\u76EE [Tab] \u7B54\u6848\u8981\u9EDE\uFF08\u9078\u586B\uFF0C\u7528 / \u5206\u9694\uFF09"), "\u2014\u2014\u9078\u9805\u6B04\u53EA\u6709 0\u20131 \u500B\u5C31\u7B97\u7C21\u7B54"), /*#__PURE__*/React.createElement("textarea", {
    value: impText,
    onChange: e => onImpText(e.target.value),
    rows: 5,
    placeholder: "What did the fox find?\tA red balloon\tA kite\tA hat\nWhy was the fox happy?\tHe found a balloon / He liked red",
    style: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 12,
      fontFamily: 'var(--mono)',
      resize: 'vertical',
      boxSizing: 'border-box',
      lineHeight: 1.6
    }
  }), errs.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#dc2626',
      fontSize: 12,
      marginTop: 4,
      whiteSpace: 'pre-line'
    }
  }, errs.slice(0, 5).join('\n')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--ink-muted)'
    }
  }, adds.length ? `${previewLabel}：${mcN} 題選擇＋${adds.length - mcN} 題簡答` : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '5px 12px'
    },
    onClick: () => {
      onImpText('');
      onToggleImp();
    }
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '5px 14px'
    },
    onClick: doImp,
    disabled: !adds.length || errs.length > 0
  }, "\u532F\u5165", adds.length ? `（${adds.length} 題）` : ''))));
}

/* ── GuidedReadingEditor 分段閱讀（v276；v277 照片＋裁切；v278 PDF；v281 綜合題）──
   段落 = { id, text, img?:{url, ar, y0, y1}, questions:[{kind:'mc',q,options[4],answer} | {kind:'short',q,keyPoints}] }
   grFinal = 全部讀完後的整篇綜合題（同題目格式）；img 只存裁切範圍，不產生新圖檔 */
function GuidedReadingEditor({
  itemId,
  itemTitle,
  itemGroup,
  onSideItems,
  sideItems,
  requiresId,
  onChangeRequires,
  catItems,
  weekItems,
  linkedFlashcardId,
  onChangeLinked,
  linkedFcRequired,
  onChangeRequired,
  audioUrl,
  onChangeAudio,
  segments,
  onChange,
  finalQs,
  onChangeFinal
}) {
  // v364: 單字卡多半在「單字」分類，只找同分類會找不到 → 改看整週所有分類
  var fcOptions = (weekItems && weekItems.length ? weekItems : catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0);
  var [pasting, setPasting] = useS(false);
  var [pasteText, setPasteText] = useS('');
  var [uploading, setUploading] = useS('');
  var [upErr, setUpErr] = useS('');
  var [cropSeg, setCropSeg] = useS(null); // 開啟裁切視窗的段落
  /* v407（Alan：「能夠根據每一段自動生成題目」）——AI 自動出題的設定 */
  var [aiOpen, setAiOpen] = useS(false);
  var [aiGrade, setAiGrade] = useS('g4');
  var [aiPerM, setAiPerM] = useS(2); // 每段幾題選擇
  var [aiPerS, setAiPerS] = useS(1); // 每段幾題簡答
  var [aiFinM, setAiFinM] = useS(3); // 整篇綜合幾題選擇
  var [aiFinS, setAiFinS] = useS(1); // 整篇綜合幾題簡答
  var [aiSkills, setAiSkills] = useS([]);
  var [aiQSkills, setAiQSkills] = useS([]); // v415: 題目要偏哪些閱讀技巧（空＝一般閱讀理解）
  var [aiReplace, setAiReplace] = useS(false);
  var [aiNote, setAiNote] = useS(''); // v445：這次的特別要求（直接寫給 AI）
  var [aiRun, setAiRun] = useS(''); // 進度文字（空字串＝沒在跑）
  var [aiErr, setAiErr] = useS('');
  var [aiInfo, setAiInfo] = useS(''); // 跑完的回報（出了幾題、跳過哪幾段、擋掉幾題）
  /* v437（Alan：「分段閱讀也一起加上去」）：讀之前先教背景知識。
     做法跟 📖 出閱讀理解一樣——產生一個 lesson 單元掛在 __side，
     分段閱讀本身帶 requires 指向它（跟「必須先練完單字卡」那個鎖可以並存）。 */
  /* ⚠ 這個檔案裡已經有一個 bgBusy 了（背景 OCR 的 ref，:2563）——名字撞到會直接壞掉，
     所以背景知識這一組一律用 bkn（background knowledge）開頭。 */
  var [bknBusy, setBknBusy] = useS(false);
  var [bknErr, setBknErr] = useS('');
  var side = Array.isArray(sideItems) ? sideItems : [];
  var bgItem = side.find(x => x && x.type === 'lesson') || null;
  /* 這一份存過之後，背景知識已經是同一週的一個單元了（__side 會被清掉）——
     這時只要認得出「已經有了」就好，不要讓老師又生一份重複的。 */
  var bgSaved = !bgItem && requiresId ? (weekItems || []).find(x => x && x.id === requiresId && x.type === 'lesson') || null : null;
  /* ⚠ v437b（Alan：「我已經上傳完 11 張課文圖片了 為什麼還不能產生背景知識？」）：
     照片段落的文字**不在 seg.text**，而是在 OCR 的結果裡（img.wordsId → fetchReadingWords，
     還要照「朗讀區域」只取主文）。AI 出題那條路本來就是用 grSegMainText 拿的，
     這裡一開始只讀 seg.text ＝ 照片段落一律當成空的 → 永遠說「文字不夠」。 */
  var bgPassage = async () => {
    var list = segRef.current || segments || [];
    var out = [];
    for (var sg of list) {
      var t = '';
      try {
        t = await grSegMainText(sg);
      } catch (e) {
        t = '';
      }
      if (t && t.trim()) out.push(t.trim());
    }
    return out.join('\n\n');
  };
  var setSide = next => {
    if (onSideItems) onSideItems(next);
  };
  var putBg = lesson => {
    if (!lesson || !(lesson.steps || []).length) return;
    var id = bgItem && bgItem.id || 'gr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + 'bg';
    var item = {
      id,
      type: 'lesson',
      group: itemGroup || undefined,
      brief: true,
      // v440：簡報式
      title: (itemTitle || '分段閱讀') + ' · 讀之前先知道',
      zh: `背景知識 · ${lesson.steps.length} 個重點 · 看完才開始讀`,
      lead: lesson.lead || '',
      steps: lesson.steps,
      outro: lesson.outro || ''
    };
    setSide(side.filter(x => x && x.type !== 'lesson').concat([item]));
    if (onChangeRequires) onChangeRequires(id);
  };
  var removeBg = () => {
    setSide(side.filter(x => x && x.type !== 'lesson'));
    if (onChangeRequires && bgItem && requiresId === bgItem.id) onChangeRequires('');
  };
  var runBg = async () => {
    setBknErr('');
    setBknBusy(true);
    try {
      var text = await bgPassage(); // 照片段落要等 OCR 的文字抓回來
      if (text.split(/\s+/).filter(Boolean).length < 40) {
        setBknErr('讀不到足夠的文字（至少 40 個英文字）——照片段落要先按「🔍 辨識單字」（辨識好會顯示「點字查義 ✓」），或把文字貼進段落的「補充文字」裡。');
        setBknBusy(false);
        return;
      }
      var l = await window.aiMakeReadingBackground({
        passage: text,
        title: itemTitle || '',
        grade: aiGrade
      });
      putBg(l);
    } catch (e) {
      setBknErr(String(e && e.message || e));
    }
    setBknBusy(false);
  };
  var [bulkOpen, setBulkOpen] = useS(false); // v387: 一次匯入所有段落的題目
  var [bulkText, setBulkText] = useS('');
  var [bulkReplace, setBulkReplace] = useS(false);
  var [impSeg, setImpSeg] = useS(null); // 哪個匯入面板打開（段索引 | 'final'）
  var [impText, setImpText] = useS('');
  var [reOcrSeg, setReOcrSeg] = useS(null); // v288: 等老師重選原始檔辨識的段落
  var [regSeg, setRegSeg] = useS(null); // v290: 開啟「朗讀區域」框選的段落
  var fileRef = React.useRef(null);
  var pdfRef = React.useRef(null);
  var reOcrRef = React.useRef(null);
  var audioRef = React.useRef(null);
  // v299: OCR 不再卡住匯入——背景跑。canvasCache 留著剛匯入的畫布（避開 Storage CORS）；
  // segRef 永遠指向最新 segments，背景回填才不會蓋掉老師同時在改的內容。
  var canvasCache = React.useRef(new Map()); // v387: img.url -> 壓好的 JPEG blob（本來存整張畫布，太吃記憶體）
  /* ⚠ v417（Alan：「每次上傳完之後 AI 辨識單字沒辦法直接辨識，我還要再重新上傳一次」）
     本來背景辨識完會無條件 `canvasCache.delete(url)`（註解寫「避免卡死迴圈」）——
     於是剛上傳的照片只要背景那一輪沒成功（或老師手快、在背景輪到它之前就按了 🔍），
     手上就已經沒有照片了，只剩「去雲端抓」這條路，而 Storage 沒有 CORS 標頭 → 讀不到像素
     → 跳出「請重選原始照片」。老師的體感就是「要再上傳一次」。
     改成「試過的記在 triedOcr，但照片本身留著」：迴圈照樣不會卡住，
     而 🔍 永遠有本機的照片可以用，不必碰網路。 */
  var triedOcr = React.useRef(new Set());
  var segRef = React.useRef(segments);
  segRef.current = segments;
  var bgBusy = React.useRef(false);
  var [ocrStatus, setOcrStatus] = useS(''); // 非阻塞的小提示（不 disable 匯入鈕）
  var queueBgOcr = async () => {
    if (bgBusy.current) return; // 已有一個背景任務在跑；它會邊跑邊撿新加進來的
    bgBusy.current = true;
    var worker = null;
    try {
      var _loop = async function () {
          var todo = s2 => s2.img && s2.img.url && !s2.img.wordsId && canvasCache.current.has(s2.img.url) && !triedOcr.current.has(s2.img.url);
          var cur = (segRef.current || []).find(todo);
          if (!cur) return 0; // break
          var left = (segRef.current || []).filter(todo).length;
          setOcrStatus(`背景辨識單字中…還有 ${left} 張（可繼續編輯）`);
          if (!worker) {
            try {
              worker = await grWarmWorker();
            } catch (e) {
              return 0; // break
            }
          } // 載不動就跳過，閱讀本身不受影響
          var src = canvasCache.current.get(cur.img.url);
          var wordsId;
          try {
            // v387: 快取存的是 blob → 現解碼成 OCR 要的大小（1200px）；舊路徑若還是畫布也照吃
            var cv = src && src.getContext ? grOcrScaled(src) : await grDecodeScaled(src, 1200);
            wordsId = await ocrAndSave(worker, cv);
          } catch (e) {}
          triedOcr.current.add(cur.img.url); // 這一張背景試過了（不論成敗），迴圈不會卡住
          if (wordsId) {
            canvasCache.current.delete(cur.img.url); // 成功了才真的把照片放掉
            onChange((segRef.current || []).map(s => s.img && s.img.url === cur.img.url ? {
              ...s,
              img: {
                ...s.img,
                wordsId
              }
            } : s));
          }
        },
        _ret;
      while (true) {
        _ret = await _loop();
        if (_ret === 0) break;
      }
    } finally {
      bgBusy.current = false;
      /* v417：背景那一輪如果有沒辨識成功的，講出來——本來是靜靜跳過，
         老師只會看到「有些照片可以點字、有些不行」卻不知道為什麼。
         照片還留在本機（見上面 triedOcr），所以按 🔍 就能重試，不用重新上傳。 */
      var left = (segRef.current || []).filter(s2 => s2.img && s2.img.url && !s2.img.wordsId && canvasCache.current.has(s2.img.url)).length;
      setOcrStatus(left ? `有 ${left} 張還沒辨識出來——按那張照片下面的「🔍 辨識單字」再試一次就好（照片還在，不用重傳）` : '');
    }
  };

  /* ⚠⚠ v417（Alan：「每次上傳完之後 AI 辨識單字沒辦法直接辨識」）——真正的根因就在這裡。
     本來是 `onChange([...新的段落]); queueBgOcr();` 寫在同一行。
     但 segRef.current 是在「重繪時」才被指到新的 segments，而 onChange 只是排一次更新，
     同一個 tick 裡 segRef.current 還是**上傳前的舊陣列** →
     queueBgOcr 的 find 找不到剛加進去的段落 → while 迴圈第一圈就 break → **背景辨識從來沒跑過**。
     老師於是每次都只能按 🔍，而 🔍 以前只會去雲端抓圖（Storage 沒有 CORS）→ 讀不到 →
     叫他重選原始照片，體感就是「要重新上傳一次」。
     改成用 effect：等 React 把 segments 更新完、segRef 也指到新的之後才跑。
     ⚠ 不要改回「onChange 後面直接呼叫」。 */
  useE(() => {
    queueBgOcr();
  }, [segments]);

  /* v387（Alan：「12 頁我就要上傳 12 次題目，想用匯入的方式一次搞定」）
   ── 一次匯入所有段落的題目 ──
   行格式在原本的基礎上，最前面多一欄「段號」：
       段號 [Tab] 題目 [Tab] 正解 [Tab] 其他選項…
   段號寫 0 / final / 綜合 ＝ 放到「整篇綜合題」。
   選擇題／簡答的判斷、第一個選項＝正解、匯入時打散、補滿 4 格——
   全部沿用 grParseImport 的規則（同一套，不另立門戶）。 */
  function grParseBulk(text, segCount) {
    var lines = String(text || '').split('\n').map(l => l.replace(/\r/g, '')).filter(l => l.trim());
    var errs = [],
      bySeg = {},
      finalAdds = [];
    var total = 0;
    lines.forEach((line, li) => {
      var cols = line.split('\t').map(c => c.trim());
      var tag = (cols[0] || '').trim();
      var q = cols[1] || '';
      if (!tag) {
        errs.push(`第 ${li + 1} 行：最前面要先寫段號`);
        return;
      }
      if (!q) {
        errs.push(`第 ${li + 1} 行：沒有題目文字`);
        return;
      }
      var isFinal = /^(0|final|綜合|整篇)$/i.test(tag);
      var idx = -1;
      if (!isFinal) {
        var m = tag.match(/\d+/); // 「第3段」「P3」「3.」都吃
        if (!m) {
          errs.push(`第 ${li + 1} 行：看不懂段號「${tag}」`);
          return;
        }
        idx = parseInt(m[0], 10) - 1;
        if (idx < 0 || idx >= segCount) {
          errs.push(`第 ${li + 1} 行：沒有第 ${m[0]} 段（目前只有 ${segCount} 段）`);
          return;
        }
      }
      var rest = cols.slice(2).filter(Boolean);
      var item;
      if (rest.length >= 2) {
        var options = rest.slice(0, 4);
        var correctText = options[0];
        for (var i = options.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        var answer = options.indexOf(correctText);
        while (options.length < 4) options.push('');
        item = {
          id: grMkId('gq'),
          kind: 'mc',
          q,
          options,
          answer
        };
      } else {
        item = {
          id: grMkId('gq'),
          kind: 'short',
          q,
          keyPoints: rest[0] || ''
        };
      }
      total++;
      if (isFinal) finalAdds.push(item);else (bySeg[idx] = bySeg[idx] || []).push(item);
    });
    return {
      errs,
      bySeg,
      finalAdds,
      total
    };
  }

  // v290: 取一段的「主文」文字——有框選就只拿主文框內的行；沒框就整個裁切帶
  var grSegMainText = async s => {
    if ((s.text || '').trim()) return s.text.trim();
    if (!s.img || !s.img.wordsId) return '';
    var d = await window.fetchReadingWords(s.img.wordsId);
    if (!d) return '';
    var zy0 = s.img.y0 || 0,
      zy1 = s.img.y1 == null ? 1 : s.img.y1;
    var main = (s.img.readRects || []).find(r => r.kind === 'main');
    // v292: 字層級過濾——OCR 的行會跨欄黏到圖說，行過濾擋不乾淨
    return window.grReadTextFrom(d, zy0, zy1, main || null);
  };

  // v290: AI 產生自然朗讀——每段產生一個 MP3（seg.audioUrl），只餵主文
  var genAiAudio = async () => {
    setUpErr('');
    var targets = segments.map((s, i) => ({
      s,
      i
    })).filter(({
      s
    }) => (s.text || '').trim() || s.img && s.img.wordsId);
    if (!targets.length) {
      setUpErr('沒有可朗讀的內容——請先加文字，或幫照片「🔍 辨識單字」。');
      return;
    }
    try {
      var out = [...segments];
      for (var k = 0; k < targets.length; k++) {
        var {
          s,
          i
        } = targets[k];
        setUploading(`AI 產生朗讀 ${k + 1}/${targets.length}…`);
        var text = await grSegMainText(s);
        if (!text.trim()) continue;
        var blob = await window.generateTtsAudio(text);
        var url = await window.uploadReadingAudio(itemId || 'gr', new File([blob], `seg${i + 1}.mp3`, {
          type: 'audio/mpeg'
        }));
        out[i] = {
          ...out[i],
          audioUrl: url
        };
      }
      onChange(out);
    } catch (err) {
      var msg = String(err && err.message || err);
      setUpErr(msg === 'tts-missing' ? '🗣 AI 語音還沒開通——需要在你的 Cloudflare Worker 貼一小段程式（步驟我已經給你，照著做一次就永久有效）。' : 'AI 朗讀產生失敗：' + msg);
    }
    setUploading('');
  };

  /* ══ v407：AI 依「每一段」自動出題 ═══════════════════════════════════════
     Alan：「分段閱讀我希望我匯入圖片或是文字或是檔案，能夠根據每一段自動生成題目。
             先從 reading comprehension 出題就好。最後統整…配合 reading skill 也很好，
             但不能亂出，要真的符合文章」
      文字從哪裡來：直接用 grSegMainText——貼的文字就用文字，照片就用 OCR 的結果
     （跟「AI 產生朗讀」同一條路，所以照片段落只要背景辨識跑完就有文字，
       不用再多做一次 OCR）。還沒有文字的段落會被跳過，而且會明確報段號。
      「不能亂出」是 data.js 那邊用程式擋的（rcGroundedMcq / rcGroundedSa /
     rcGroundedBlock：AI 引用的線索句必須真的在文章裡）——這裡只負責把
     「擋掉了幾題」誠實回報，不要讓老師以為每次都剛好出滿。 */
  var AI_SKILL_LIST = Object.keys(window.RC_SKILLS || {});
  var aiSegN = n => segments.length * (+n || 0);
  /* v453（Alan：「我如果重新標註框，又要重新再跑一次，太麻煩」）：
     onlySeg ＝ 只重出這一段的題目（改了裁切／朗讀區域之後就只補那一段），
     其他段落與整篇綜合題原封不動。 */
  var runAiQuestions = async onlySeg => {
    var one = typeof onlySeg === 'number';
    setAiErr('');
    setAiInfo('');
    setAiRun(one ? `讀取第 ${onlySeg + 1} 段…` : '讀取每一段的文字…');
    try {
      var list = segRef.current || [];
      var texts = [];
      for (var i = 0; i < list.length; i++) {
        if (one && i !== onlySeg) continue;
        var t = '';
        try {
          t = await grSegMainText(list[i]);
        } catch (e) {
          t = '';
        }
        texts.push({
          i,
          text: t
        });
      }
      var r = await window.aiMakeGuidedQuestions({
        segments: texts,
        title: itemTitle || '',
        grade: aiGrade,
        perMcq: aiPerM,
        perSa: aiPerS,
        finalMcq: one ? 0 : aiFinM,
        finalSa: one ? 0 : aiFinS,
        // v453：只重出一段時不動整篇綜合題
        skills: one ? [] : aiSkills,
        qSkills: aiQSkills,
        teacherNote: aiNote,
        onProgress: (d, tot, label) => setAiRun(`出題中 ${d}/${tot}${label ? ' · ' + label : ''}`)
      });

      // 寫回段落（segRef 永遠是最新的——老師在等待時可能又改了東西）
      onChange((segRef.current || []).map((sg, i) => {
        if (one && i !== onlySeg) return sg; // v453：只動這一段
        var adds = r.bySeg[i];
        var replace = one ? true : aiReplace; // 只重出一段＝就是要換掉那一段的舊題目
        if (!adds) return replace ? {
          ...sg,
          questions: []
        } : sg;
        return {
          ...sg,
          questions: (replace ? [] : sg.questions || []).concat(adds)
        };
      }));
      if (!one && (r.final.length || aiReplace)) onChangeFinal((aiReplace ? [] : finalQs || []).concat(r.final));

      /* 閱讀技巧是另一個型別的單元，塞不進分段閱讀 → 交給 EditorModal 掛在 __side，
         存檔時跟這一份分段閱讀一起建立（同一週、同一個分組）。 */
      if (!one && r.blocks.length && onSideItems) {
        var nChips = r.blocks.reduce((n, b) => n + (b.chips || []).length, 0);
        // v437：保留已經做好的背景知識（以前是整個蓋掉，兩個功能會互相洗掉）
        onSideItems((sideItems || []).filter(x => x && x.type === 'lesson').concat([{
          id: 'gr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + 'rs',
          type: 'reading-skill',
          group: itemGroup || undefined,
          title: (itemTitle || '分段閱讀') + ' · 閱讀技巧',
          zh: `${r.blocks.length} 種技巧 · ${nChips} 張卡片`,
          rsPassage: r.passage || '',
          rsBlocks: r.blocks
        }]));
      }
      var bits = [`出了 ${r.made} 題`];
      if (r.blocks.length) bits.push(`另外做了一份「閱讀技巧」單元（${r.blocks.length} 種，存檔時一起建立）`);
      if (aiSkills.length && !r.blocks.length) bits.push('閱讀技巧這次對不上文章，沒有硬做（寧可不出）');
      if (r.skipped.length) bits.push(`第 ${r.skipped.map(i => i + 1).join('、')} 段字太少或還沒辨識出文字，已跳過`);
      if (r.dropped) bits.push(`另有 ${r.dropped} 題因為「文章裡找不到根據」被程式擋掉`);
      setAiInfo(bits.join('；') + '。題目都在下面，可以直接改。');
      setAiOpen(false);
    } catch (e) {
      setAiErr(String(e && e.message || e));
    }
    setAiRun('');
  };
  var mkId = grMkId;

  // 照片縮到最長邊 1600px JPEG（同上傳作業的做法），順便量長寬比
  var shrinkPhoto = file => new Promise((resolve, reject) => {
    var img = new Image();
    img.onload = () => {
      var MAX = 1600;
      var k = Math.min(1, MAX / Math.max(img.width, img.height));
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => b ? resolve({
        blob: b,
        ar: cv.height / cv.width,
        cv
      }) : reject(new Error('無法處理這張圖片')), 'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('圖片讀取失敗'));
    };
    img.src = URL.createObjectURL(file);
  });

  // v287: 上傳後順手 OCR（點字查義＋朗讀用）——失敗不擋上傳，之後可按「🔍 辨識單字」補
  // v288: 改存 Firestore（Storage 下載沒有 CORS 標頭，學生端 fetch 會被瀏覽器擋）
  var ocrAndSave = async (worker, cv) => {
    try {
      var wl = await grOcrCanvas(worker, cv);
      if (!wl.words.length) return undefined;
      return await window.saveReadingWords(wl);
    } catch (e) {
      return undefined;
    }
  };
  var pickPhotos = async e => {
    var files = Array.from(e.target.files || []).filter(f => /^image\//.test(f.type));
    e.target.value = '';
    if (!files.length) return;
    setUpErr('');
    var added = [];
    try {
      for (var i = 0; i < files.length; i++) {
        setUploading(`上傳中 ${i + 1}/${files.length}…`);
        var {
          blob,
          ar
        } = await shrinkPhoto(files[i]);
        var url = await window.uploadReadingPhoto(itemId || 'gr', blob);
        canvasCache.current.set(url, blob); // v299/v387: 留著給背景 OCR（避開下載 CORS）；存 blob 不存畫布
        added.push({
          id: mkId('gs'),
          text: '',
          img: {
            url,
            ar,
            y0: 0,
            y1: 1
          },
          questions: []
        });
      }
    } catch (err) {
      setUpErr('上傳失敗：' + (err && err.message || err) + '——請確認你是用老師帳號登入。');
    }
    if (added.length) onChange([...segRef.current, ...added]); // 段落立刻出現；OCR 由下面那個 effect 接手
    setUploading('');
  };

  // v278: 匯入掃描 PDF——pdf.js（用到才從 CDN 載）把每頁畫成 1600px JPEG，
  // 之後跟照片完全同一條路：一頁＝一段，太長再 ✂ 裁切
  var loadPdfJs = () => new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      } catch (e) {}
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error('PDF 元件載入失敗，請確認網路'));
    document.head.appendChild(s);
  });
  var pickPdf = async e => {
    var file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    setUpErr('');
    var added = [];
    var pageErrs = [];
    try {
      setUploading('讀取 PDF…');
      var pdfjs = await loadPdfJs();
      var buf = await file.arrayBuffer();
      var pdf = await pdfjs.getDocument({
        data: buf
      }).promise;
      var N = pdf.numPages;
      /* v387（Alan：「上傳 PDF 太久了」）——原本是「算圖→上傳→算圖→上傳」整條都是序列的，
         而上傳（含 getDownloadURL 那一趟）才是最花時間的一段，網路等待期間 CPU 完全閒著。
         改成「一次算 3 頁 → 這 3 頁同時上傳 → 再算下 3 頁」。
         為什麼是分批而不是全開：全部一起丟會同時佔住記憶體與頻寬，
         而且錯誤處理很難寫對；分批的順序天然是對的（組內再依頁碼排一次）。
         單一頁失敗不再讓整份匯入前功盡棄——記下來，其他頁照樣建立。 */
      var LIMIT = 3;
      for (var start = 1; start <= N; start += LIMIT) {
        var group = [];
        var _loop2 = async function () {
          setUploading(`轉換第 ${p}/${N} 頁…`);
          var page = await pdf.getPage(p);
          var vp1 = page.getViewport({
            scale: 1
          });
          // v387: 1600 → 1400。OCR 本來就只吃 1200px，1600 純粹是多算多傳；
          //       1400 仍比 OCR 需要的大，學生放大看也還夠清楚。
          var vp = page.getViewport({
            scale: Math.min(3, 1400 / vp1.width)
          });
          var cv = document.createElement('canvas');
          cv.width = Math.round(vp.width);
          cv.height = Math.round(vp.height);
          await page.render({
            canvasContext: cv.getContext('2d'),
            viewport: vp
          }).promise;
          var blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('頁面轉檔失敗')), 'image/jpeg', 0.85));
          var ar = cv.height / cv.width;
          cv.width = cv.height = 0; // 立刻把這張畫布的記憶體還回去
          try {
            page.cleanup();
          } catch (e2) {} // pdf.js 也會留著解碼後的影像
          group.push({
            p,
            blob,
            ar
          });
        };
        for (var p = start; p < start + LIMIT && p <= N; p++) {
          await _loop2();
        }
        var last = Math.min(start + LIMIT - 1, N);
        setUploading(`上傳第 ${start}${last > start ? '–' + last : ''}/${N} 頁…`);
        var done = await Promise.all(group.map(async g => {
          try {
            var url = await window.uploadReadingPhoto(itemId || 'gr', g.blob);
            canvasCache.current.set(url, g.blob); // v387: 存 blob 給背景 OCR
            return {
              p: g.p,
              seg: {
                id: mkId('gs'),
                text: '',
                img: {
                  url,
                  ar: g.ar,
                  y0: 0,
                  y1: 1
                },
                questions: []
              }
            };
          } catch (err) {
            pageErrs.push(g.p);
            return null;
          }
        }));
        done.filter(Boolean).sort((a, b) => a.p - b.p).forEach(r => added.push(r.seg));
      }
      try {
        pdf.destroy();
      } catch (e2) {}
    } catch (err) {
      setUpErr('PDF 匯入失敗：' + (err && err.message || err));
    }
    if (pageErrs.length) setUpErr(`第 ${pageErrs.join('、')} 頁上傳失敗（其餘 ${added.length} 頁已建立），可以再匯入一次補這幾頁。`);
    if (added.length) onChange([...segRef.current, ...added]); // 頁面立刻出現；OCR 由下面那個 effect 接手
    setUploading('');
  };

  // v287: 舊照片（還沒有單字資料的）補辨識——同一張照片的所有段落共用同一份
  // v288: Storage 檔案下載沒有 CORS 標頭→雲端照片讀不到像素。先試一次（帶 cache-buster），
  //       失敗就請老師重選「原始照片檔」在本機辨識（只辨識、不重新上傳照片）。
  var finishOcr = async (seg, cv) => {
    var worker = null;
    try {
      worker = await grOcrWorker();
      var wl = await grOcrCanvas(worker, cv);
      if (!wl.words.length) throw new Error('辨識不到英文字（照片太模糊或沒有英文）');
      var wordsId = await window.saveReadingWords(wl);
      onChange(segments.map(s => s.img && s.img.url === seg.img.url ? {
        ...s,
        img: {
          ...s.img,
          wordsId
        }
      } : s));
      setReOcrSeg(null);
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (e2) {}
      }
    }
  };
  var ocrExisting = async seg => {
    setUpErr('');
    /* v417：先用「上傳當下留在本機的那張照片」。這是最常見的情況
       （剛上傳完就按 🔍），完全不用碰網路，也就沒有 CORS 的問題。 */
    var cached = canvasCache.current.get(seg.img && seg.img.url);
    if (cached) {
      try {
        setUploading('辨識單字中…（第一次會多等幾秒）');
        var cv = cached && cached.getContext ? cached : await grDecodeScaled(cached, 1200);
        await finishOcr(seg, cv);
        canvasCache.current.delete(seg.img.url);
        setUploading('');
        return;
      } catch (err) {
        setUpErr('辨識失敗：' + (err && err.message || err));
        setUploading('');
        return;
      }
    }
    try {
      setUploading('辨識單字中…（第一次會多等幾秒）');
      var img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('cors'));
        img.src = seg.img.url + '&r=' + Date.now();
      });
      var _cv = document.createElement('canvas');
      _cv.width = img.naturalWidth;
      _cv.height = img.naturalHeight;
      _cv.getContext('2d').drawImage(img, 0, 0);
      await finishOcr(seg, _cv);
    } catch (err) {
      if (String(err && err.message) === 'cors') {
        setReOcrSeg(seg);
        setUpErr('瀏覽器擋住了雲端照片的讀取——請按照片下方新出現的「📁 選原始照片來辨識」，選你當初的同一張照片（只用來辨識，不會重新上傳）。');
      } else {
        setUpErr('辨識失敗：' + (err && err.message || err));
      }
    }
    setUploading('');
  };

  // v289: 課文音檔——課本配音/老師自錄；學生閱讀頁優先播這個（取代機器人 TTS）
  var pickAudio = async e => {
    var file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setUpErr('音檔太大（上限 20MB）——請先壓成 MP3');
      return;
    }
    setUpErr('');
    try {
      setUploading('上傳音檔中…');
      var url = await window.uploadReadingAudio(itemId || 'gr', file);
      onChangeAudio(url);
    } catch (err) {
      setUpErr('音檔上傳失敗：' + (err && err.message || err));
    }
    setUploading('');
  };
  var pickReOcr = async e => {
    var file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file || !reOcrSeg) return;
    setUpErr('');
    try {
      setUploading('辨識單字中…');
      var {
        cv
      } = await shrinkPhoto(file);
      await finishOcr(reOcrSeg, cv);
    } catch (err) {
      setUpErr('辨識失敗：' + (err && err.message || err));
    }
    setUploading('');
  };

  // 裁切確認：同一張照片的所有段落照新裁切線重建；原本各段的題目/文字按順序保留
  var applyCrop = bands => {
    var url = cropSeg.img.url;
    var isSame = s => s.img && s.img.url === url;
    var groupSegs = segments.filter(isSame).sort((a, b) => (a.img.y0 || 0) - (b.img.y0 || 0));
    var gi = segments.findIndex(isSame);
    var rest = segments.filter(s => !isSame(s));
    var insertAt = segments.slice(0, gi).filter(s => !isSame(s)).length;
    var rebuilt = bands.map((b, i) => {
      var prev = groupSegs[i];
      // v306: 裁切重建段落時，保留同一張照片的 OCR 辨識(wordsId/Url)、朗讀區域(readRects)、
      // 以及已產生的每段 AI 音檔(audioUrl)——座標都是整圖比例，重切後仍然有效，不該整批丟掉。
      var img = {
        url,
        ar: cropSeg.img.ar,
        y0: b[0],
        y1: b[1]
      };
      if (cropSeg.img.wordsId) img.wordsId = cropSeg.img.wordsId;
      if (cropSeg.img.wordsUrl) img.wordsUrl = cropSeg.img.wordsUrl;
      var rects = prev && prev.img && prev.img.readRects || cropSeg.img.readRects;
      if (rects) img.readRects = rects;
      var seg = {
        id: prev && prev.id || mkId('gs'),
        text: prev && prev.text || '',
        img,
        questions: prev && prev.questions || []
      };
      if (prev && prev.audioUrl) seg.audioUrl = prev.audioUrl;
      return seg;
    });
    onChange([...rest.slice(0, insertAt), ...rebuilt, ...rest.slice(insertAt)]);
    setCropSeg(null);
  };
  var upd = (i, patch) => onChange(segments.map((s, si) => si === i ? {
    ...s,
    ...patch
  } : s));
  var delSeg = i => onChange(segments.filter((_, si) => si !== i));
  var moveSeg = (i, d) => {
    var j = i + d;
    if (j < 0 || j >= segments.length) return;
    var a = [...segments];
    [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };
  var addSeg = () => onChange([...segments, {
    id: mkId('gs'),
    text: '',
    questions: []
  }]);

  // v387: 一次匯入所有段落的題目
  var bulk = bulkOpen ? grParseBulk(bulkText, segments.length) : {
    errs: [],
    bySeg: {},
    finalAdds: [],
    total: 0
  };
  var doBulk = () => {
    if (bulk.errs.length || !bulk.total) return;
    onChange(segments.map((s, i) => {
      var adds = bulk.bySeg[i];
      if (!adds) return bulkReplace ? {
        ...s,
        questions: []
      } : s;
      return {
        ...s,
        questions: (bulkReplace ? [] : s.questions || []).concat(adds)
      };
    }));
    if (bulk.finalAdds.length || bulkReplace) {
      onChangeFinal((bulkReplace ? [] : finalQs || []).concat(bulk.finalAdds));
    }
    setBulkText('');
    setBulkOpen(false);
    setBulkReplace(false);
  };
  var pasteChunks = pasteText.split(/\n\s*\n+/).map(t => t.trim()).filter(Boolean);
  var doPaste = () => {
    if (!pasteChunks.length) return;
    onChange([...segments, ...pasteChunks.map(t => ({
      id: mkId('gs'),
      text: t,
      questions: []
    }))]);
    setPasteText('');
    setPasting(false);
  };
  var inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--ink)',
    borderRadius: 3,
    fontSize: 13,
    boxSizing: 'border-box'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, fcOptions.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "field",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\uD83C\uDCCF \u7D81\u5B9A\u55AE\u5B57\u5361 \xB7 \u8B80\u6587\u7AE0\u524D\u5148\u7DF4\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("select", {
    value: linkedFlashcardId || '',
    onChange: e => onChangeLinked(e.target.value),
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 3,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 \u4E0D\u7D81\u5B9A (None) \u2014"), fcOptions.map(fc => /*#__PURE__*/React.createElement("option", {
    key: fc.id,
    value: fc.id
  }, fc.title, "\uFF08", (fc.cards || []).length, " \u5F35\uFF09"))), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u7D81\u5B9A\u5F8C\uFF0C\u5B78\u751F\u7684\u958B\u59CB\u9801\u6703\u591A\u4E00\u5F35\u91D1\u8272\u300C\u5148\u7DF4\u7FD2\u672C\u6587\u7AE0\u55AE\u5B57\u300D\u5361\u3002"), linkedFlashcardId && /*#__PURE__*/React.createElement("label", {
    className: "gr-fc-must"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!linkedFcRequired,
    onChange: e => onChangeRequired(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\u5FC5\u9808\u5148\u7DF4\u5B8C\u624D\u80FD\u958B\u59CB\u8B80"), "\u2014\u2014\u6C92\u628A\u55AE\u5B57\u5361\u7684\u300C\uD83D\uDCD6 \u5B78\u7FD2\u300D\u6A21\u5F0F\u8DD1\u5B8C\uFF0C\u300C\u958B\u59CB\u95B1\u8B80\u300D\u6703\u9396\u4F4F\u3002\u4E0D\u52FE\uFF1D\u53EF\u4EE5\u76F4\u63A5\u8DF3\u904E\u53BB\u8B80\u3002"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      margin: 0
    }
  }, "\u6BB5\u843D Segments (", segments.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '5px 12px'
    },
    onClick: () => pdfRef.current && pdfRef.current.click(),
    disabled: !!uploading
  }, uploading || '📄 匯入 PDF'), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => fileRef.current && fileRef.current.click(),
    disabled: !!uploading
  }, "\uD83D\uDCF7 \u7167\u7247"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => setPasting(v => !v)
  }, pasting ? '✕ 取消' : '⬇ 貼文字'), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost gr-ai-btn",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    disabled: !segments.length || !!aiRun,
    onClick: () => {
      setAiErr('');
      setAiOpen(v => !v);
    },
    title: "\u6BCF\u4E00\u6BB5\u5404\u51FA\u5E7E\u984C\u95B1\u8B80\u7406\u89E3\uFF0C\u6700\u5F8C\u518D\u51FA\u4E00\u7D44\u6574\u7BC7\u7D9C\u5408\u984C"
  }, aiRun || (aiOpen ? '✕ 取消' : '🤖 AI 自動出題')), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    disabled: !segments.length,
    onClick: () => setBulkOpen(v => !v),
    title: "12 \u9801\u4E0D\u7528\u958B 12 \u6B21\u2014\u2014\u4E00\u6B21\u628A\u6BCF\u4E00\u9801\u7684\u984C\u76EE\u90FD\u8CBC\u9032\u4F86"
  }, bulkOpen ? '✕ 取消' : '📋 一次匯入所有題目'))), /*#__PURE__*/React.createElement("div", {
    className: "gr-bk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-bk-head"
  }, /*#__PURE__*/React.createElement("b", null, "\uD83E\uDDE0 \u8B80\u4E4B\u524D\u5148\u77E5\u9053"), /*#__PURE__*/React.createElement("span", {
    className: "gr-bk-sub"
  }, "\u4E92\u52D5\u5F0F\u80CC\u666F\u77E5\u8B58\uFF1A\u5148\u8A8D\u8B58\u4EBA\u3001\u5730\u3001\u95DC\u9375\u5B57\uFF0C\u5B78\u5B8C\u624D\u89E3\u9396\u9019\u7BC7\u6587\u7AE0"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), (bgItem || bgSaved) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: removeBg
  }, bgSaved ? '不要鎖了' : '移除'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '5px 12px'
    },
    disabled: bknBusy,
    onClick: runBg
  }, bknBusy ? '產生中…' : bgItem || bgSaved ? '🔄 重新產生' : '✨ 產生背景知識')), bknErr && /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-err"
  }, bknErr), bgSaved && /*#__PURE__*/React.createElement("div", {
    className: "gr-bk-note"
  }, "\u5DF2\u7D93\u6709\u4E00\u4EFD\uFF1A", /*#__PURE__*/React.createElement("b", null, bgSaved.title), "\uFF08\u5728\u540C\u4E00\u9031\u7684\u55AE\u5143\u5217\u8868\u88E1\uFF0C\u9EDE\u9032\u53BB\u5C31\u80FD\u6539\uFF09\u3002 \u9019\u7BC7\u6587\u7AE0\u6703\u9396\u5230\u5B78\u751F\u5B78\u5B8C\u70BA\u6B62\uFF1B\u6309\u300C\uD83D\uDD04 \u91CD\u65B0\u7522\u751F\u300D\u6703\u505A\u4E00\u4EFD\u65B0\u7684\u4F86\u53D6\u4EE3\u3002"), bgItem && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "gr-bk-note"
  }, "\u5B58\u6A94\u6642\u6703\u4E00\u8D77\u5EFA\u7ACB\u6210\u300C", bgItem.title, "\u300D\uFF1B\u5B78\u751F\u5B78\u5B8C\u624D\u6703\u89E3\u9396\u9019\u7BC7\u5206\u6BB5\u95B1\u8B80\u3002"), /*#__PURE__*/React.createElement(BgStepsEditor, {
    bg: bgItem,
    onErr: setBknErr,
    onChange: next => (next.steps || []).length ? putBg(next) : removeBg()
  }))), aiOpen && /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-note"
  }, "\u6BCF\u4E00\u6BB5\u5404\u51FA\u5E7E\u984C", /*#__PURE__*/React.createElement("b", null, "\u95B1\u8B80\u7406\u89E3"), "\uFF0C\u6700\u5F8C\u518D\u51FA\u4E00\u7D44", /*#__PURE__*/React.createElement("b", null, "\u6574\u7BC7\u7D9C\u5408\u984C"), "\u3002 \u984C\u76EE\u53EA\u6703\u554F\u300C\u90A3\u4E00\u6BB5\u88E1\u5BEB\u7684\u4E8B\u300D\u2014\u2014\u5B78\u751F\u9084\u6C92\u8B80\u5230\u5F8C\u9762\uFF0C\u554F\u5F8C\u9762\u5C31\u662F\u58DE\u984C\u3002", /*#__PURE__*/React.createElement("br", null), "AI \u51FA\u5B8C\u6703\u7531", /*#__PURE__*/React.createElement("b", null, "\u7A0B\u5F0F\u518D\u9A57\u4E00\u6B21"), "\uFF1A\u5B83\u5F15\u7528\u7684\u7DDA\u7D22\u53E5\u5FC5\u9808\u771F\u7684\u5728\u6587\u7AE0\u88E1\uFF0C \u5C0D\u4E0D\u4E0A\u7684\u6574\u984C\u4E1F\u6389\u91CD\u51FA\uFF08", /*#__PURE__*/React.createElement("b", null, "\u4E0D\u6703\u786C\u6E4A\u984C\u6578"), "\uFF0C\u6700\u5F8C\u6703\u544A\u8A34\u4F60\u64CB\u6389\u5E7E\u984C\uFF09\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-grid"
  }, /*#__PURE__*/React.createElement("label", null, "\u5B78\u751F\u7A0B\u5EA6", /*#__PURE__*/React.createElement("select", {
    value: aiGrade,
    onChange: e => setAiGrade(e.target.value)
  }, ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map(g => /*#__PURE__*/React.createElement("option", {
    key: g,
    value: g
  }, g.toUpperCase())))), /*#__PURE__*/React.createElement("label", null, "\u6BCF\u6BB5 \xB7 \u9078\u64C7\u984C", /*#__PURE__*/React.createElement("select", {
    value: aiPerM,
    onChange: e => setAiPerM(e.target.value === 'auto' ? 'auto' : +e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "auto"
  }, "\u81EA\u52D5\uFF08\u4F9D\u9577\u5EA6 1~4 \u984C\uFF09"), [0, 1, 2, 3].map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n, " \u984C")))), /*#__PURE__*/React.createElement("label", null, "\u6BCF\u6BB5 \xB7 \u7C21\u7B54\u984C", /*#__PURE__*/React.createElement("select", {
    value: aiPerS,
    onChange: e => setAiPerS(+e.target.value)
  }, [0, 1, 2].map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n, " \u984C")))), /*#__PURE__*/React.createElement("label", null, "\u6574\u7BC7\u7D9C\u5408 \xB7 \u9078\u64C7\u984C", /*#__PURE__*/React.createElement("select", {
    value: aiFinM,
    onChange: e => setAiFinM(+e.target.value)
  }, [0, 2, 3, 5].map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n, " \u984C")))), /*#__PURE__*/React.createElement("label", null, "\u6574\u7BC7\u7D9C\u5408 \xB7 \u7C21\u7B54\u984C", /*#__PURE__*/React.createElement("select", {
    value: aiFinS,
    onChange: e => setAiFinS(+e.target.value)
  }, [0, 1, 2].map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n, " \u984C"))))), /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-skills"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-skills-head"
  }, "\uD83C\uDFAF \u6BCF\u4E00\u6BB5\u7684\u984C\u76EE\u8981\u8003\u54EA\u4E9B\u95B1\u8B80\u6280\u5DE7\uFF08\u4E0D\u52FE\uFF1D\u4E00\u822C\u95B1\u8B80\u7406\u89E3\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-chips"
  }, Object.keys(window.RC_QSKILLS || {}).map(k => {
    var sk = (window.RC_QSKILLS || {})[k] || {};
    var on = aiQSkills.indexOf(k) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      type: "button",
      className: 'gr-ai-chip' + (on ? ' on' : ''),
      onClick: () => setAiQSkills(v => on ? v.filter(x => x !== k) : v.concat(k)),
      title: sk.en
    }, sk.ico, " ", sk.zh);
  })), /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-hint"
  }, "\u52FE\u4E86\u5E7E\u7A2E\u5C31", /*#__PURE__*/React.createElement("b", null, "\u8F2A\u6D41\u51FA"), "\uFF08\u7B2C 1 \u984C\u56E0\u679C\u3001\u7B2C 2 \u984C\u63A8\u8AD6\u2026\uFF09\uFF0C\u984C\u76EE\u672C\u8EAB\u9084\u662F\u9078\u64C7\u984C\uFF0F\u7C21\u7B54\u984C\u3002 \u300C\u627E\u51FA\u6587\u672C\u8B49\u64DA\u300D\u8207\u300C\u4E0A\u4E0B\u6587\u731C\u5B57\u300D\u9019\u5169\u7A2E\u7A0B\u5F0F\u6703", /*#__PURE__*/React.createElement("b", null, "\u518D\u591A\u9A57\u4E00\u95DC"), "\uFF08\u6B63\u89E3\u5FC5\u9808\u771F\u7684\u662F\u6587\u7AE0\u88E1\u7684\u53E5\u5B50\uFF0F\u554F\u7684\u90A3\u500B\u5B57\u5FC5\u9808\u771F\u7684\u51FA\u73FE\u5728\u6587\u7AE0\u88E1\uFF09\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-skills"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-skills-head"
  }, "\uD83D\uDD0D \u8B80\u5B8C\u6574\u7BC7\u4E4B\u5F8C\uFF0C\u9806\u4FBF\u505A\u4E00\u4EFD\u300C\u62D6\u5361\u7247\u300D\u7684\u95B1\u8B80\u6280\u5DE7\u55AE\u5143\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-chips"
  }, AI_SKILL_LIST.map(k => {
    var sk = (window.RC_SKILLS || {})[k] || {};
    var on = aiSkills.indexOf(k) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      type: "button",
      className: 'gr-ai-chip' + (on ? ' on' : ''),
      onClick: () => setAiSkills(v => on ? v.filter(x => x !== k) : v.concat(k))
    }, sk.ico, " ", sk.zh);
  })), /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-hint"
  }, "\u52FE\u8D77\u4F86\u7684\u6703\u5408\u6210", /*#__PURE__*/React.createElement("b", null, "\u4E00\u500B"), "\u300C\u95B1\u8B80\u6280\u5DE7\u300D\u55AE\u5143\uFF0C\u8DDF\u9019\u4EFD\u5206\u6BB5\u95B1\u8B80\u4E00\u8D77\u5EFA\u7ACB\uFF08\u540C\u4E00\u9031\u3001\u540C\u4E00\u7D44\uFF09\u3002 \u5361\u7247\u4E00\u5F35\u4E00\u5F35\u6BD4\u5C0D\u904E\u6587\u7AE0\uFF0C\u627E\u4E0D\u5230\u51FA\u8655\u7684\u6574\u5F35\u4E1F\u6389\uFF1B\u67D0\u4E00\u7A2E\u4E09\u8F2A\u90FD\u5C0D\u4E0D\u4E0A\u5C31", /*#__PURE__*/React.createElement("b", null, "\u4E0D\u505A\u90A3\u4E00\u7A2E"), "\u3002")), /*#__PURE__*/React.createElement("label", {
    className: "gr-ai-rep"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: aiReplace,
    onChange: e => setAiReplace(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, "\u84CB\u6389\u539F\u672C\u7684\u984C\u76EE\uFF08\u4E0D\u52FE\uFF1D\u52A0\u5728\u539F\u672C\u7684\u5F8C\u9762\uFF09")), /*#__PURE__*/React.createElement(AiNoteBox, {
    value: aiNote,
    onChange: setAiNote,
    examples: "\u591A\u554F\u4EBA\u7269\u7684\u5FC3\u60C5\uFF5C\u6BCF\u6BB5\u90FD\u8981\u6709\u4E00\u984C\u554F\u7D30\u7BC0\uFF5C\u4E0D\u8981\u8003\u5E74\u4EFD\u6578\u5B57\uFF5C\u7C21\u7B54\u984C\u8981\u5F15\u7528\u6587\u7AE0\u7684\u53E5\u5B50"
  }), aiErr && /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-err"
  }, aiErr), /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gr-ai-sum"
  }, segments.length, " \u6BB5 \xB7 \u9810\u8A08 ", aiPerM === 'auto' ? `${segments.length * 1 + aiSegN(aiPerS) + aiFinM + aiFinS}~${segments.length * 4 + aiSegN(aiPerS) + aiFinM + aiFinS}` : segments.length * (aiPerM + aiPerS) + aiFinM + aiFinS, " \u984C", aiQSkills.length ? ` · ${aiQSkills.length} 種技巧輪流` : '', aiSkills.length ? ` ＋ ${aiSkills.length} 種拖卡片技巧` : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '5px 12px'
    },
    onClick: () => setAiOpen(false),
    disabled: !!aiRun
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '5px 14px'
    },
    onClick: runAiQuestions,
    disabled: !!aiRun || aiPerM !== 'auto' && !aiPerM && !aiPerS && !aiFinM && !aiFinS && !aiSkills.length
  }, aiRun || '🤖 開始出題'))), aiInfo && !aiOpen && /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-done"
  }, "\u2713 ", aiInfo, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setAiInfo(''),
    "aria-label": "\u95DC\u9589"
  }, "\u2715")), aiErr && !aiOpen && /*#__PURE__*/React.createElement("div", {
    className: "gr-ai-err"
  }, aiErr), bulkOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '10px 12px',
      margin: '0 0 10px',
      background: 'var(--bg-paper,#FBF8F1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      lineHeight: 1.75,
      color: 'var(--ink-2,#5c554a)',
      marginBottom: 7
    }
  }, "\u4E00\u884C\u4E00\u984C\uFF0C\u6700\u524D\u9762\u591A\u5BEB\u4E00\u500B", /*#__PURE__*/React.createElement("b", null, "\u6BB5\u865F"), "\uFF08\u5C31\u662F\u4E0B\u9762\u6BCF\u6BB5\u6A19\u984C\u7684\u300C\u7B2C N \u6BB5\u300D\uFF09\uFF1A", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("code", null, "\u6BB5\u865F [Tab] \u984C\u76EE [Tab] \u6B63\u89E3 [Tab] \u5176\u4ED6\u9078\u9805\u2026"), "\uFF08\u9078\u64C7\u984C\uFF0C\u7B2C\u4E00\u500B\uFF1D\u6B63\u89E3\uFF0C\u6700\u591A 4 \u500B\uFF0C\u532F\u5165\u6642\u81EA\u52D5\u6253\u6563\uFF09", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("code", null, "\u6BB5\u865F [Tab] \u984C\u76EE [Tab] \u7B54\u6848\u8981\u9EDE"), "\uFF08\u7C21\u7B54\u984C\u2014\u2014\u9078\u9805\u6B04\u53EA\u6709 0\u20131 \u500B\u5C31\u7B97\u7C21\u7B54\uFF09", /*#__PURE__*/React.createElement("br", null), "\u6BB5\u865F\u5BEB ", /*#__PURE__*/React.createElement("code", null, "0"), " \u6216 ", /*#__PURE__*/React.createElement("code", null, "\u7D9C\u5408"), " \uFF1D \u653E\u5230\u6700\u5F8C\u7684\u6574\u7BC7\u7D9C\u5408\u984C\u3002\u53EF\u4EE5\u76F4\u63A5\u5F9E Excel\uFF0FGoogle \u8A66\u7B97\u8868\u6574\u6BB5\u8907\u88FD\u8CBC\u4E0A\u3002"), /*#__PURE__*/React.createElement("textarea", {
    rows: 7,
    value: bulkText,
    onChange: e => setBulkText(e.target.value),
    placeholder: '1\tWhere did the wolves live?\tOn an island\tIn a city\tIn a cave\n1\tWhy did the pups get on the raft?\tThey were curious / it looked strange\n2\tWhat happened to the deer?\tThere were too many\tThey all died\tThey left\n0\tWhat is the main idea of the whole story?\tnature needs balance / wolves keep the deer in check',
    style: {
      width: '100%',
      fontFamily: 'var(--mono,monospace)',
      fontSize: 12,
      lineHeight: 1.6,
      padding: '8px 10px',
      border: '1px solid var(--border)',
      background: '#fff',
      color: 'var(--ink)',
      borderRadius: 8,
      resize: 'vertical',
      boxSizing: 'border-box'
    }
  }), bulk.errs.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: '#dc2626',
      whiteSpace: 'pre-wrap',
      marginTop: 6
    }
  }, bulk.errs.slice(0, 6).join('\n'), bulk.errs.length > 6 ? `\n…還有 ${bulk.errs.length - 6} 個問題` : ''), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: 'var(--ink-3,#6b6455)'
    }
  }, bulk.total ? Object.keys(bulk.bySeg).sort((a, b) => a - b).map(i => `第${+i + 1}段 ${bulk.bySeg[i].length}題`).concat(bulk.finalAdds.length ? [`綜合 ${bulk.finalAdds.length}題`] : []).join(' · ') : '貼上之後這裡會顯示每一段會拿到幾題'), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11.5,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: bulkReplace,
    onChange: e => setBulkReplace(e.target.checked)
  }), "\u8986\u84CB\u539F\u672C\u7684\u984C\u76EE\uFF08\u4E0D\u52FE\uFF1D\u52A0\u5728\u5F8C\u9762\uFF09"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '5px 12px'
    },
    onClick: () => {
      setBulkText('');
      setBulkOpen(false);
    }
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '5px 14px'
    },
    onClick: doBulk,
    disabled: !bulk.total || bulk.errs.length > 0
  }, "\u532F\u5165", bulk.total ? `（共 ${bulk.total} 題）` : ''))), ocrStatus && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: '#8a6d1c',
      background: '#fbf3de',
      border: '1px solid #ead9ae',
      borderRadius: 8,
      padding: '5px 11px',
      margin: '6px 0 0',
      display: 'inline-block'
    }
  }, "\u23F3 ", ocrStatus), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    style: {
      display: 'none'
    },
    onChange: pickPhotos
  }), /*#__PURE__*/React.createElement("input", {
    ref: pdfRef,
    type: "file",
    accept: "application/pdf,.pdf",
    style: {
      display: 'none'
    },
    onChange: pickPdf
  }), /*#__PURE__*/React.createElement("input", {
    ref: reOcrRef,
    type: "file",
    accept: "image/*",
    style: {
      display: 'none'
    },
    onChange: pickReOcr
  }), /*#__PURE__*/React.createElement("input", {
    ref: audioRef,
    type: "file",
    accept: "audio/*,.mp3,.m4a",
    style: {
      display: 'none'
    },
    onChange: pickAudio
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      margin: '0 0 10px',
      flexWrap: 'wrap'
    }
  }, audioUrl ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: '#2e7d32',
      fontWeight: 700
    }
  }, "\uD83C\uDFA7 \u8AB2\u6587\u97F3\u6A94 \u2713"), /*#__PURE__*/React.createElement("audio", {
    controls: true,
    preload: "none",
    src: audioUrl,
    style: {
      height: 30,
      maxWidth: 280
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '3px 8px',
      color: 'var(--accent)'
    },
    onClick: () => {
      if (confirm('移除音檔？（學生會改聽機器語音）')) onChangeAudio('');
    }
  }, "\u2715 \u79FB\u9664")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '5px 12px'
    },
    disabled: !!uploading,
    onClick: genAiAudio,
    title: "\u7528 AI \u795E\u7D93\u8A9E\u97F3\u628A\u6BCF\u6BB5\u4E3B\u6587\u5538\u6210 MP3\u2014\u2014\u7522\u751F\u4E00\u6B21\uFF0C\u5B78\u751F\u64AD\u653E\u4E0D\u7528\u9322"
  }, "\uD83D\uDDE3 AI \u7522\u751F\u6717\u8B80\uFF08\u81EA\u7136\u4EBA\u8072\uFF09"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    disabled: !!uploading,
    onClick: () => audioRef.current && audioRef.current.click()
  }, "\uD83C\uDFA7 \u6216\u4E0A\u50B3\u97F3\u6A94"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--ink-muted)'
    }
  }, "\u7167\u7247\u5148\u300C\uD83D\uDD0D \u8FA8\u8B58\u55AE\u5B57\u300D\uFF0B\u6846\u597D\u300C\uD83D\uDDE3 \u6717\u8B80\u5340\u57DF\u300D\uFF0CAI \u5C31\u53EA\u5538\u4E3B\u6587\u3001\u4E0D\u5538\u65C1\u908A\u5C0F\u5B57"))), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 10
    }
  }, "\u6383\u63CF PDF\uFF1A\u6BCF\u4E00\u9801\u81EA\u52D5\u8B8A\u4E00\u6BB5\uFF1B\u7167\u7247\uFF1A\u4E00\u5F35\uFF1D\u4E00\u6BB5\u3002\u592A\u9577\u7684\u9801\u9762\u9EDE\u300C\u2702 \u88C1\u5207\u300D\u518D\u5207\u7D30\uFF0C\u6BCF\u6BB5\u914D 1\u20132 \u984C\uFF0C\u5C0F\u670B\u53CB\u8B80\u4E00\u5C0F\u6BB5\u5C31\u7B54\u984C\u3001\u4E0D\u653E\u7A7A\u3002"), upErr && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#dc2626',
      marginBottom: 8
    }
  }, upErr), pasting && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 8
    }
  }, "\u8CBC\u4E0A\u6574\u7BC7\u6587\u7AE0\u2014\u2014", /*#__PURE__*/React.createElement("b", null, "\u7A7A\u4E00\u884C"), "\u7684\u5730\u65B9\u6703\u81EA\u52D5\u5207\u6210\u65B0\u7684\u6BB5\u843D\uFF0C\u5207\u597D\u5F8C\u518D\u5E6B\u6BCF\u6BB5\u52A0\u984C\u76EE\u3002"), /*#__PURE__*/React.createElement("textarea", {
    value: pasteText,
    onChange: e => setPasteText(e.target.value),
    rows: 8,
    placeholder: "One day, a little fox found a red balloon in the forest…\n\nThe fox carried the balloon to the river. There, he met an old turtle…\n\nSuddenly, the wind blew very hard…",
    style: {
      ...inputStyle,
      fontSize: 12,
      fontFamily: 'var(--mono)',
      resize: 'vertical',
      lineHeight: 1.6
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '6px 14px'
    },
    onClick: () => {
      setPasting(false);
      setPasteText('');
    }
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '6px 16px'
    },
    onClick: doPaste,
    disabled: !pasteChunks.length
  }, "\u5206\u6BB5\u532F\u5165", pasteChunks.length ? `（${pasteChunks.length} 段）` : ''))), segments.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "fc-card-empty mono",
    style: {
      marginBottom: 10
    }
  }, "\u5C1A\u672A\u65B0\u589E\u6BB5\u843D \u2014 \u9EDE\u300C\uFF0B \u65B0\u589E\u6BB5\u843D\u300D\u6216\u300C\u2B07 \u8CBC\u6574\u7BC7\u6587\u7AE0\u81EA\u52D5\u5206\u6BB5\u300D"), segments.map((seg, si) => /*#__PURE__*/React.createElement("div", {
    key: seg.id || si,
    style: {
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '12px 14px',
      marginBottom: 14,
      background: 'var(--bg-paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 13
    }
  }, "\u7B2C ", si + 1, " \u6BB5"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--ink-muted)'
    }
  }, (seg.questions || []).length, " \u984C"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '3px 8px'
    },
    disabled: !!aiRun,
    onClick: () => runAiQuestions(si),
    title: "\u53EA\u7528\u9019\u4E00\u6BB5\u7684\u6587\u5B57\u91CD\u65B0\u51FA\u984C\uFF08\u5176\u4ED6\u6BB5\u843D\u8207\u7D9C\u5408\u984C\u4E0D\u52D5\uFF09"
  }, aiRun ? '…' : '🤖 重出這段'), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '3px 8px'
    },
    onClick: () => moveSeg(si, -1),
    disabled: si === 0
  }, "\u25B2"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '3px 8px'
    },
    onClick: () => moveSeg(si, 1),
    disabled: si === segments.length - 1
  }, "\u25BC"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '3px 8px',
      color: 'var(--accent)'
    },
    onClick: () => {
      if (confirm('刪除這一段（含底下的題目）？')) delSeg(si);
    }
  }, "\u2715")), seg.img && seg.img.url ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(GrEdCropThumb, {
    img: seg.img
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 6,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '4px 10px'
    },
    onClick: () => setCropSeg(seg)
  }, "\u2702 \u88C1\u5207\u9019\u5F35\u7167\u7247"), seg.img.wordsId ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#2e7d32'
    }
  }, "\uD83D\uDD0D \u9EDE\u5B57\u67E5\u7FA9 \u2713"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '4px 10px'
    },
    disabled: !!uploading,
    onClick: () => setRegSeg(seg),
    title: "\u6846\u51FA\u4E3B\u6587\u8207\u65C1\u908A\u5C0F\u5B57\u2014\u2014AI \u6717\u8B80\u53EA\u5538\u4E3B\u6587\uFF1B\u5C0F\u5B57\u8B8A\u6210\u5B78\u751F\u53EF\u9EDE\u7684 \uD83D\uDD0A"
  }, "\uD83D\uDDE3 \u6717\u8B80\u5340\u57DF", (seg.img.readRects || []).length ? ` ✓（${(seg.img.readRects || []).length} 框）` : '')) : /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '4px 10px'
    },
    disabled: !!uploading,
    onClick: () => ocrExisting(seg),
    title: "\u8FA8\u8B58\u7167\u7247\u88E1\u7684\u82F1\u6587\u5B57\uFF0C\u5B78\u751F\u5C31\u80FD\u9EDE\u55AE\u5B57\u67E5\u610F\u601D\u3001\u807D\u6717\u8B80"
  }, "\uD83D\uDD0D \u8FA8\u8B58\u55AE\u5B57\uFF08\u9EDE\u5B57\u67E5\u7FA9\uFF09"), reOcrSeg && reOcrSeg.img && seg.img.url === reOcrSeg.img.url && !seg.img.wordsId ? /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '4px 10px'
    },
    disabled: !!uploading,
    onClick: () => reOcrRef.current && reOcrRef.current.click()
  }, "\uD83D\uDCC1 \u9078\u539F\u59CB\u7167\u7247\u4F86\u8FA8\u8B58") : null)) : null, seg.audioUrl ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#2e7d32',
      fontWeight: 700
    }
  }, "\uD83C\uDFA7 \u9019\u6BB5\u7684\u6717\u8B80 \u2713"), /*#__PURE__*/React.createElement("audio", {
    controls: true,
    preload: "none",
    src: seg.audioUrl,
    style: {
      height: 28,
      maxWidth: 240
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '3px 8px',
      color: 'var(--accent)'
    },
    onClick: () => {
      if (!confirm('移除這段的朗讀音檔？')) return;
      // v292: 用段落 id 比對＋顯式 delete——舊寫法不生效（Alan 回報「移除不了」）
      onChange(segments.map(s2 => {
        if ((s2.id || s2) !== (seg.id || seg)) return s2;
        var n = {
          ...s2
        };
        delete n.audioUrl;
        return n;
      }));
    }
  }, "\u2715")) : null, /*#__PURE__*/React.createElement("textarea", {
    value: seg.text || '',
    onChange: e => upd(si, {
      text: e.target.value
    }),
    rows: seg.img && seg.img.url ? 2 : 5,
    placeholder: seg.img && seg.img.url ? '補充文字（選填，顯示在照片下方）' : '這一段的文章內容…（學生會看到；空行＝換段落顯示）',
    style: {
      ...inputStyle,
      fontSize: 14,
      lineHeight: 1.7,
      resize: 'vertical',
      fontFamily: 'inherit'
    }
  }), /*#__PURE__*/React.createElement(GrQuestionsEditor, {
    qs: seg.questions || [],
    onChange: qs2 => upd(si, {
      questions: qs2
    }),
    impOpen: impSeg === si,
    onToggleImp: () => setImpSeg(impSeg === si ? null : si),
    impText: impText,
    onImpText: setImpText,
    previewLabel: `將加進第 ${si + 1} 段`,
    inputStyle: inputStyle
  }))), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '7px 16px'
    },
    onClick: addSeg
  }, "\uFF0B \u65B0\u589E\u6BB5\u843D"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      padding: '12px 14px',
      border: '1.5px solid var(--border)',
      borderRadius: 8,
      background: 'var(--bg-paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 13
    }
  }, "\uD83D\uDCDA \u7D9C\u5408\u984C\uFF08\u5168\u90E8\u8B80\u5B8C\u5F8C\uFF09"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--ink-muted)'
    }
  }, (finalQs || []).length, " \u984C")), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 4
    }
  }, "\u5B78\u751F\u628A\u6BCF\u4E00\u6BB5\u90FD\u8B80\u5B8C\u3001\u7B54\u5B8C\u5F8C\uFF0C\u6700\u5F8C\u51FA\u73FE\u7684\u6574\u7BC7\u6587\u7AE0\u7D9C\u5408\u984C\uFF08\u9078\u586B\uFF09\u3002\u7B54\u984C\u6642\u53EF\u5C55\u958B\u6574\u7BC7\u6587\u7AE0\u56DE\u982D\u770B\u3002"), /*#__PURE__*/React.createElement(GrQuestionsEditor, {
    qs: finalQs || [],
    onChange: onChangeFinal,
    impOpen: impSeg === 'final',
    onToggleImp: () => setImpSeg(impSeg === 'final' ? null : 'final'),
    impText: impText,
    onImpText: setImpText,
    previewLabel: "\u5C07\u52A0\u9032\u7D9C\u5408\u984C",
    inputStyle: inputStyle,
    aiHint: "\u7D9C\u5408\u984C\u7684\u7C21\u7B54\uFF1AAI \u6703\u62FF\u300C\u6574\u7BC7\u6587\u7AE0\u7684\u6587\u5B57\uFF0B\u7B54\u6848\u8981\u9EDE\u300D\u6279\u6539\uFF0C\u7D66 1\u20135 \u661F\u3002"
  })), cropSeg && /*#__PURE__*/React.createElement(GrCropModal, {
    url: cropSeg.img.url,
    group: segments.filter(s => s.img && s.img.url === cropSeg.img.url),
    onCancel: () => setCropSeg(null),
    onConfirm: applyCrop
  }), regSeg && /*#__PURE__*/React.createElement(GrRegionModal, {
    seg: regSeg,
    onCancel: () => setRegSeg(null),
    onConfirm: rects => {
      onChange(segments.map(s => s.id === regSeg.id ? {
        ...s,
        img: {
          ...s.img,
          readRects: rects
        }
      } : s));
      setRegSeg(null);
    }
  }));
}

/* ── 朗讀區域框選（v290）——在這段的裁切畫面上拖出方框：
   第一框＝主文（金色，AI/機器朗讀只唸這裡）；其餘＝附註（藍色，學生端變 🔊 可點）。
   座標存整張圖比例（同 words），顯示時換算到裁切帶內。 */
function GrRegionModal({
  seg,
  onCancel,
  onConfirm
}) {
  var img = seg.img;
  var zy0 = img.y0 || 0;
  var zy1 = img.y1 == null ? 1 : img.y1;
  var band = Math.max(0.02, zy1 - zy0);
  var [rects, setRects] = useS(() => (img.readRects || []).map(r => ({
    ...r
  })));
  var [draft, setDraft] = useS(null); // band 內比例 {x0,y0,x1,y1}
  var wrapRef = React.useRef(null);
  var startRef = React.useRef(null);
  var toFrac = e => {
    var r = wrapRef.current.getBoundingClientRect();
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.min(1, Math.max(0, (cx - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (cy - r.top) / r.height))
    };
  };
  var down = e => {
    if (e.target.closest && e.target.closest('.gr-reg-x')) return;
    e.preventDefault();
    var p = toFrac(e);
    startRef.current = p;
    setDraft({
      x0: p.x,
      y0: p.y,
      x1: p.x,
      y1: p.y
    });
  };
  useE(() => {
    if (!startRef.current) return;
    var move = e => {
      if (!startRef.current) return;
      if (e.touches) e.preventDefault();
      var p = toFrac(e);
      setDraft({
        x0: startRef.current.x,
        y0: startRef.current.y,
        x1: p.x,
        y1: p.y
      });
    };
    var up = () => {
      var s0 = startRef.current;
      startRef.current = null;
      setDraft(d => {
        if (d && s0) {
          var w = Math.abs(d.x1 - d.x0),
            h = Math.abs(d.y1 - d.y0);
          if (w > 0.04 && h > 0.02) {
            // band 比例 → 整張圖比例
            setRects(rs => [...rs, {
              x: Math.min(d.x0, d.x1),
              w,
              y: zy0 + Math.min(d.y0, d.y1) * band,
              h: h * band
            }]);
          }
        }
        return null;
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, {
      passive: false
    });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [draft != null]);

  // 存檔時第一框標 main、其餘 side
  var finalize = () => onConfirm(rects.map((r, i) => ({
    ...r,
    kind: i === 0 ? 'main' : 'side'
  })));
  var bandTop = y => (y - zy0) / band * 100;
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 300,
      background: 'rgba(24,18,10,.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    },
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg,#fff)',
      borderRadius: 10,
      maxWidth: 620,
      width: '100%',
      maxHeight: '92vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 16px',
      boxSizing: 'border-box'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 14
    }
  }, "\uD83D\uDDE3 \u6717\u8B80\u5340\u57DF"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '4px 10px'
    },
    onClick: () => setRects([]),
    disabled: !rects.length
  }, "\u6E05\u9664\u5168\u90E8")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--ink-muted)',
      marginBottom: 6,
      lineHeight: 1.7
    }
  }, "\u5728\u7167\u7247\u4E0A", /*#__PURE__*/React.createElement("b", null, "\u62D6\u51FA\u65B9\u6846"), "\uFF1A\u7B2C\u4E00\u500B\u6846\uFF1D", /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#a07d1c'
    }
  }, "\u4E3B\u6587"), "\uFF08\u6717\u8B80\u53EA\u5538\u9019\u88E1\uFF09\uFF1B \u518D\u6846\u7684\uFF1D", /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#3b6ea5'
    }
  }, "\u9644\u8A3B"), "\uFF08\u5B78\u751F\u9EDE \uD83D\uDD0A \u53EF\u55AE\u7368\u807D\uFF09\u3002\u6846\u932F\u9EDE \u2715 \u91CD\u62C9\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'auto',
      flex: 1,
      minHeight: 0,
      border: '1px solid var(--border)',
      borderRadius: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: wrapRef,
    style: {
      position: 'relative',
      cursor: 'crosshair',
      height: 0,
      overflow: 'hidden',
      paddingBottom: (img.ar || 1.3) * band * 100 + '%'
    },
    onMouseDown: down,
    onTouchStart: down
  }, /*#__PURE__*/React.createElement("img", {
    src: img.url,
    alt: "",
    draggable: false,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      display: 'block',
      userSelect: 'none',
      pointerEvents: 'none',
      transform: `translateY(-${zy0 * 100}%)`
    }
  }), rects.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'absolute',
      left: r.x * 100 + '%',
      top: bandTop(r.y) + '%',
      width: r.w * 100 + '%',
      height: r.h / band * 100 + '%',
      border: `2.5px solid ${i === 0 ? '#c9a84c' : '#3b6ea5'}`,
      background: i === 0 ? 'rgba(201,168,76,.12)' : 'rgba(59,110,165,.10)',
      borderRadius: 6,
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 4,
      top: 2,
      fontSize: 10,
      fontWeight: 800,
      color: i === 0 ? '#a07d1c' : '#3b6ea5',
      background: 'rgba(255,255,255,.85)',
      borderRadius: 3,
      padding: '0 4px',
      pointerEvents: 'none'
    }
  }, i === 0 ? '主文' : `附註 ${i}`), /*#__PURE__*/React.createElement("button", {
    className: "gr-reg-x",
    onClick: e => {
      e.stopPropagation();
      setRects(rs => rs.filter((_, j) => j !== i));
    },
    onMouseDown: e => e.stopPropagation(),
    onTouchStart: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      right: -10,
      top: -10,
      width: 22,
      height: 22,
      borderRadius: '50%',
      border: 'none',
      background: i === 0 ? '#c9a84c' : '#3b6ea5',
      color: '#fff',
      fontSize: 11,
      cursor: 'pointer',
      lineHeight: '22px',
      padding: 0
    }
  }, "\u2715"))), draft && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: Math.min(draft.x0, draft.x1) * 100 + '%',
      top: Math.min(draft.y0, draft.y1) * 100 + '%',
      width: Math.abs(draft.x1 - draft.x0) * 100 + '%',
      height: Math.abs(draft.y1 - draft.y0) * 100 + '%',
      border: '2px dashed #B85A45',
      borderRadius: 6,
      boxSizing: 'border-box',
      pointerEvents: 'none'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onCancel
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: finalize
  }, "\u2705 \u5B8C\u6210\uFF08", rects.length, " \u6846\uFF09")))), document.body);
}

/* ── 編輯器：段落照片縮圖（固定寬，px 計算高度）── */
function GrEdCropThumb({
  img
}) {
  var y0 = img.y0 || 0;
  var y1 = img.y1 == null ? 1 : img.y1;
  var W = 300;
  var h = Math.max(8, W * (img.ar || 1.3) * Math.max(0.02, y1 - y0));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      maxWidth: '100%',
      height: h,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 6,
      border: '1px solid var(--border)',
      background: '#f5f1e8'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: img.url,
    alt: "",
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      transform: `translateY(-${y0 * 100}%)`,
      display: 'block'
    }
  }));
}

/* ── 照片裁切視窗（v277）──
   點照片＝加線、拖線＝微調、✕＝刪線；🪄 自動偵測＝掃描橫列亮度，
   段落間的空白（比行距明顯大的白帶）自動畫線。只存比例，不產生新圖。 */
function GrCropModal({
  url,
  group,
  onCancel,
  onConfirm
}) {
  var sorted = [...group].sort((a, b) => (a.img.y0 || 0) - (b.img.y0 || 0));
  var init = sorted.slice(0, -1).map(s => s.img.y1 == null ? 1 : s.img.y1).filter(y => y > 0 && y < 1);
  var [lines, setLines] = useS(init);
  var [busy, setBusy] = useS(false);
  var [err, setErr] = useS('');
  var wrapRef = React.useRef(null);
  var dragRef = React.useRef(null);
  var yFromClient = clientY => {
    var r = wrapRef.current.getBoundingClientRect();
    return Math.min(0.98, Math.max(0.02, (clientY - r.top) / r.height));
  };
  var addLineAt = e => setLines(ls => [...ls, yFromClient(e.clientY)].sort((a, b) => a - b));
  var startDrag = i => e => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = i;
  };
  useE(() => {
    var move = e => {
      if (dragRef.current == null || !wrapRef.current) return;
      if (e.touches) e.preventDefault();
      var cy = e.touches ? e.touches[0].clientY : e.clientY;
      var i = dragRef.current;
      var y = yFromClient(cy);
      setLines(ls => ls.map((v, j) => j === i ? y : v));
    };
    var up = () => {
      if (dragRef.current != null) {
        dragRef.current = null;
        setLines(ls => [...ls].sort((a, b) => a - b));
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, {
      passive: false
    });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, []);
  var autoDetect = () => {
    setBusy(true);
    setErr('');
    var img = new Image();
    img.crossOrigin = 'anonymous'; // Firebase Storage 下載 URL 有 CORS *，canvas 讀得到
    img.onload = () => {
      try {
        var W = 400;
        var H = Math.max(1, Math.round(W * (img.naturalHeight / img.naturalWidth)));
        var cv = document.createElement('canvas');
        cv.width = W;
        cv.height = H;
        var cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0, W, H);
        var d = cx.getImageData(0, 0, W, H).data;
        var isText = new Array(H);
        for (var y = 0; y < H; y++) {
          var c = 0;
          for (var x = 0; x < W; x += 2) {
            var i = (y * W + x) * 4;
            if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 140) c++;
          }
          isText[y] = c / (W / 2) > 0.02;
        }
        // 連續「非文字列」＝空白帶；行距的白帶小、段落間的白帶大 → 取明顯大於中位數的
        var gaps = [];
        var s = null;
        for (var _y = 0; _y <= H; _y++) {
          var t = _y < H ? isText[_y] : true;
          if (!t && s == null) s = _y;
          if (t && s != null) {
            gaps.push({
              start: s,
              len: _y - s
            });
            s = null;
          }
        }
        var interior = gaps.filter(g => g.start > 0 && g.start + g.len < H);
        if (!interior.length) {
          setErr('偵測不到段落空隙——請直接點照片手動加線。');
          setBusy(false);
          return;
        }
        var lens = interior.map(g => g.len).sort((a, b) => a - b);
        var med = lens[Math.floor(lens.length / 2)];
        var cuts = interior.filter(g => g.len >= Math.max(med * 1.7, H * 0.012)).map(g => (g.start + g.len / 2) / H).filter(y => y > 0.03 && y < 0.97);
        cuts = cuts.filter((c, i) => i === 0 || c - cuts[i - 1] > 0.04).slice(0, 12);
        if (!cuts.length) {
          setErr('空隙都差不多大，自動分不出段落——請直接點照片手動加線。');
          setBusy(false);
          return;
        }
        setLines(cuts);
      } catch (e2) {
        setErr('這張照片無法自動偵測——請直接點照片手動加線。');
      }
      setBusy(false);
    };
    img.onerror = () => {
      setErr('照片載入失敗——請直接點照片手動加線。');
      setBusy(false);
    };
    img.src = url;
  };
  var bands = (() => {
    var ys = [0, ...lines, 1];
    var out = [];
    for (var i = 0; i + 1 < ys.length; i++) if (ys[i + 1] - ys[i] > 0.02) out.push([ys[i], ys[i + 1]]);
    return out;
  })();

  // v290: portal 到 body——.modal 的 transform 會把 fixed 困在彈窗裡（containing block）
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 300,
      background: 'rgba(24,18,10,.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    },
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg,#fff)',
      borderRadius: 10,
      maxWidth: 560,
      width: '100%',
      maxHeight: '92vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 16px',
      boxSizing: 'border-box'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 14
    }
  }, "\u2702 \u88C1\u5207\u7167\u7247"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '4px 10px'
    },
    onClick: autoDetect,
    disabled: busy
  }, busy ? '偵測中…' : '🪄 自動偵測段落'), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '4px 10px'
    },
    onClick: () => setLines([]),
    disabled: !lines.length
  }, "\u6E05\u9664\u7DDA")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--ink-muted)',
      marginBottom: 6
    }
  }, "\u9EDE\u7167\u7247\uFF1D\u52A0\u4E00\u689D\u88C1\u5207\u7DDA\uFF1B\u62D6\u7DDA\uFF1D\u5FAE\u8ABF\uFF1B\u9EDE\u7DDA\u4E0A\u7684 \u2715\uFF1D\u522A\u9664\u3002\u5169\u689D\u7DDA\u4E4B\u9593\uFF1D\u4E00\u6BB5\u3002"), err && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#dc2626',
      marginBottom: 6
    }
  }, err), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'auto',
      flex: 1,
      minHeight: 0,
      border: '1px solid var(--border)',
      borderRadius: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: wrapRef,
    style: {
      position: 'relative',
      cursor: 'crosshair'
    },
    onClick: addLineAt
  }, /*#__PURE__*/React.createElement("img", {
    src: url,
    alt: "",
    style: {
      width: '100%',
      display: 'block',
      userSelect: 'none',
      pointerEvents: 'none'
    }
  }), lines.map((y, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: `${y * 100}%`,
      borderTop: '2px dashed #B85A45',
      cursor: 'ns-resize',
      height: 14,
      marginTop: -7,
      paddingTop: 7,
      boxSizing: 'border-box'
    },
    onMouseDown: startDrag(i),
    onTouchStart: startDrag(i),
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 6,
      top: -9,
      background: '#B85A45',
      color: '#fff',
      fontSize: 10,
      borderRadius: 3,
      padding: '0 5px',
      pointerEvents: 'none'
    }
  }, "\u2702 ", i + 1), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setLines(ls => ls.filter((_, j) => j !== i));
    },
    onMouseDown: e => e.stopPropagation(),
    onTouchStart: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      right: 6,
      top: -11,
      background: '#B85A45',
      color: '#fff',
      border: 'none',
      borderRadius: '50%',
      width: 22,
      height: 22,
      fontSize: 11,
      cursor: 'pointer',
      lineHeight: '22px',
      padding: 0
    }
  }, "\u2715"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onCancel
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: () => onConfirm(bands)
  }, "\u2705 \u5B8C\u6210\u88C1\u5207\uFF08", bands.length, " \u6BB5\uFF09")))), document.body);
}

/* ── SyllableDivEditor ── */
/* v365: 配對連線編輯器——一行一組「單字 [Tab] 解釋」，跟聽寫一樣可以從 Excel 直接貼 */
function DefMatchEditor({
  pairs,
  onChangePairs
}) {
  var [importing, setImporting] = useS(false);
  var [importText, setImportText] = useS('');
  var [importErr, setImportErr] = useS('');
  var add = () => onChangePairs([...pairs, {
    id: 'dm' + Date.now(),
    word: '',
    def: ''
  }]);
  var del = id => onChangePairs(pairs.filter(p => p.id !== id));
  var upd = (id, field, val) => onChangePairs(pairs.map(p => p.id === id ? {
    ...p,
    [field]: val
  } : p));
  var move = (id, dir) => {
    var i = pairs.findIndex(p => p.id === id),
      j = i + dir;
    if (i < 0 || j < 0 || j >= pairs.length) return;
    var arr = pairs.slice();
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChangePairs(arr);
  };
  var doImport = () => {
    var parsed = [];
    importText.split('\n').map(l => l.trim()).filter(Boolean).forEach((line, i) => {
      // 支援 Tab、逗號、破折號、冒號分隔（Excel 貼上多半是 Tab）
      var m = line.split('\t');
      var word = '',
        def = '';
      if (m.length >= 2) {
        word = m[0].trim();
        def = m.slice(1).join(' ').trim();
      } else {
        var m2 = line.match(/^(.+?)\s*[:：\-–—]\s*(.+)$/);
        if (m2) {
          word = m2[1].trim();
          def = m2[2].trim();
        }
      }
      if (word && def) parsed.push({
        id: 'dm' + Date.now() + i,
        word,
        def
      });
    });
    if (!parsed.length) {
      setImportErr('沒有解析到資料——一行一組，中間用 Tab（或冒號、破折號）隔開');
      return;
    }
    onChangePairs([...pairs, ...parsed]);
    setImportText('');
    setImporting(false);
    setImportErr('');
  };
  var bad = pairs.filter(p => !p.word || !p.def).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      margin: 0
    }
  }, "\u914D\u5C0D\u7D44\u6578\uFF08", pairs.length, "\uFF09"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => {
      setImporting(v => !v);
      setImportErr('');
    }
  }, importing ? '✕ 取消' : '⬇ 貼上匯入'), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '5px 12px'
    },
    onClick: add
  }, "+ Add"))), importing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-paper,#f9f7f2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 8
    }
  }, "\u5F9E Excel / Google Sheets \u8907\u88FD\u8CBC\u4E0A\uFF1A", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("code", {
    style: {
      background: 'rgba(0,0,0,0.06)',
      padding: '1px 5px',
      borderRadius: 2
    }
  }, "\u55AE\u5B57 [Tab] \u89E3\u91CB"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 4,
      color: 'var(--ink-faint)'
    }
  }, "\u4E5F\u53EF\u4EE5\u6253 ", /*#__PURE__*/React.createElement("code", null, "producer: an organism that makes its own food"), "\uFF08\u5192\u865F\u6216\u7834\u6298\u865F\u9694\u958B\uFF09")), /*#__PURE__*/React.createElement("textarea", {
    value: importText,
    onChange: e => {
      setImportText(e.target.value);
      setImportErr('');
    },
    rows: 6,
    placeholder: 'producer\tan organism that makes its own food\nconsumer\tan animal that eats other living things\npredator\tan animal that hunts other animals\nprey\tan animal that is hunted for food',
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 12,
      fontFamily: 'var(--mono)',
      resize: 'vertical',
      boxSizing: 'border-box',
      lineHeight: 1.6
    }
  }), importErr && /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#dc2626',
      fontSize: 12,
      marginTop: 4
    }
  }, importErr), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      marginTop: 8,
      fontSize: 12
    },
    onClick: doImport
  }, "\u52A0\u5165\u6E05\u55AE")), pairs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u9084\u6C92\u6709\u914D\u5C0D\u2014\u2014\u6309\u300C+ Add\u300D\u4E00\u7D44\u4E00\u7D44\u6253\uFF0C\u6216\u7528\u300C\u2B07 \u8CBC\u4E0A\u532F\u5165\u300D\u6574\u6279\u8CBC\u9032\u4F86\u3002\u81F3\u5C11\u8981 2 \u7D44\u3002") : /*#__PURE__*/React.createElement("div", {
    className: "dme-list"
  }, pairs.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "dme-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dme-n"
  }, i + 1), /*#__PURE__*/React.createElement("input", {
    className: "dme-in dme-word",
    value: p.word,
    placeholder: "\u55AE\u5B57 word",
    onChange: e => upd(p.id, 'word', e.target.value)
  }), /*#__PURE__*/React.createElement("span", {
    className: "dme-link"
  }, "\uD83D\uDD17"), /*#__PURE__*/React.createElement("input", {
    className: "dme-in dme-def",
    value: p.def,
    placeholder: "\u89E3\u91CB definition",
    onChange: e => upd(p.id, 'def', e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "dme-tools"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => move(p.id, -1),
    disabled: i === 0,
    title: "\u4E0A\u79FB"
  }, "\u25B2"), /*#__PURE__*/React.createElement("button", {
    onClick: () => move(p.id, 1),
    disabled: i === pairs.length - 1,
    title: "\u4E0B\u79FB"
  }, "\u25BC"), /*#__PURE__*/React.createElement("button", {
    className: "dme-del",
    onClick: () => del(p.id),
    title: "\u522A\u9664"
  }, "\u2715"))))), bad > 0 && /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      color: '#b23c27'
    }
  }, "\u26A0\uFE0F \u6709 ", bad, " \u7D44\u9084\u6C92\u586B\u5B8C\uFF0C\u6C92\u586B\u5B8C\u7684\u4E0D\u6703\u51FA\u73FE\u5728\u984C\u76EE\u88E1\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u5B78\u751F\u770B\u5230\u7684\u53F3\u908A\u89E3\u91CB\u6703\u81EA\u52D5\u6253\u4E82\u9806\u5E8F\uFF0C\u4E0D\u7528\u81EA\u5DF1\u6392\u3002"));
}
function SyllableDivEditor({
  words,
  onChangeWords
}) {
  var [importing, setImporting] = useS(false);
  var [importText, setImportText] = useS('');
  var [importErr, setImportErr] = useS('');
  var addWord = () => onChangeWords([...words, {
    id: Date.now().toString(),
    word: '',
    answer: ''
  }]);
  var delWord = id => onChangeWords(words.filter(w => w.id !== id));
  var updWord = (id, field, val) => onChangeWords(words.map(w => w.id === id ? {
    ...w,
    [field]: val
  } : w));
  var doImport = () => {
    var lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    var parsed = [];
    lines.forEach((line, i) => {
      var parts = line.split('\t');
      var word = parts[0]?.trim() || '';
      var answer = parts[1]?.trim() || '';
      if (!word) return;
      parsed.push({
        id: Date.now().toString() + i,
        word,
        answer
      });
    });
    if (!parsed.length) {
      setImportErr('沒有可匯入的資料，請確認格式');
      return;
    }
    onChangeWords([...words, ...parsed]);
    setImportText('');
    setImporting(false);
    setImportErr('');
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      margin: 0
    }
  }, "\u55AE\u5B57 Words (", words.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => {
      setImporting(v => !v);
      setImportErr('');
    }
  }, importing ? '✕ 取消' : '⬇ Import'), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '5px 12px'
    },
    onClick: addWord
  }, "+ Add"))), importing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-paper,#f9f7f2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 8
    }
  }, "\u5F9E Excel / Google Sheets \u8907\u88FD\u8CBC\u4E0A\uFF1A", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("code", {
    style: {
      background: 'rgba(0,0,0,0.06)',
      padding: '1px 5px',
      borderRadius: 2
    }
  }, "\u55AE\u5B57 [Tab] \u5207\u6CD5\uFF08\u4F8B sur/prise\uFF09"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 4,
      color: 'var(--ink-faint)'
    }
  }, "\xB7 \u5207\u6CD5\u6B04\u53EF\u4EE5\u5148\u7559\u7A7A\uFF0C\u4E4B\u5F8C\u5728\u8868\u683C\u88E1\u88DC\u4E0A", /*#__PURE__*/React.createElement("br", null), "\xB7 \u7528 / \u6A19\u793A\u5207\u5272\u9EDE\uFF1Acon/tract\u3001mon/ster")), /*#__PURE__*/React.createElement("textarea", {
    value: importText,
    onChange: e => {
      setImportText(e.target.value);
      setImportErr('');
    },
    placeholder: 'surprise\tsur/prise\nmonster\tmon/ster\nhundred\thun/dred\ncontract\tcon/tract',
    rows: 6,
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 12,
      fontFamily: 'var(--mono)',
      resize: 'vertical',
      boxSizing: 'border-box',
      lineHeight: 1.6
    }
  }), importErr && /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#dc2626',
      fontSize: 12,
      marginTop: 4
    }
  }, importErr), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '6px 14px'
    },
    onClick: () => {
      setImporting(false);
      setImportText('');
      setImportErr('');
    }
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '6px 16px'
    },
    onClick: doImport,
    disabled: !importText.trim()
  }, "\u532F\u5165 ", importText.trim() ? `(${importText.split('\n').filter(l => l.trim()).length} 個)` : ''))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr auto',
      gap: '6px 8px',
      alignItems: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)',
      paddingLeft: 2
    }
  }, "Word\uFF08\u55AE\u5B57\uFF09"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)',
      paddingLeft: 2
    }
  }, "Answer\uFF08\u5207\u6CD5 \xB7 \u7528 / \u5206\u9694\uFF09"), /*#__PURE__*/React.createElement("div", null), words.map(w => /*#__PURE__*/React.createElement(React.Fragment, {
    key: w.id
  }, /*#__PURE__*/React.createElement("input", {
    value: w.word,
    onChange: e => updWord(w.id, 'word', e.target.value),
    placeholder: "surprise",
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 14
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: w.answer,
    onChange: e => updWord(w.id, 'answer', e.target.value),
    placeholder: "sur/prise",
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 14,
      fontFamily: 'var(--mono)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => delWord(w.id),
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      borderRadius: 2,
      background: 'none',
      cursor: 'pointer',
      color: 'var(--ink-3)',
      fontSize: 13
    }
  }, "\u2715")))), words.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px',
      textAlign: 'center',
      color: 'var(--ink-faint)',
      fontStyle: 'italic',
      fontSize: 13
    }
  }, "\u5C1A\u672A\u65B0\u589E\u55AE\u5B57 \u2014 \u9EDE\u9078\u53F3\u4E0A\u65B9 Add \u6216 Import"), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "Answer \u6B04\u4F4D\u7528 / \u6A19\u793A\u5207\u5272\u9EDE\uFF0C\u4F8B\u5982\uFF1A", /*#__PURE__*/React.createElement("code", null, "sur/prise"), "\u3001", /*#__PURE__*/React.createElement("code", null, "mon/ster"), "\u3001", /*#__PURE__*/React.createElement("code", null, "hun/dred"), "\u3002\u53EF\u6709\u591A\u500B\u5207\u5272\u9EDE\uFF1A", /*#__PURE__*/React.createElement("code", null, "ath/let/ic"), "\u3002")));
}

/* ── WordSortEditor ── */
function WordSortEditor({
  categories,
  words,
  suffixMode,
  onChangeCategories,
  onChangeWords,
  onChangeSuffixMode
}) {
  var [catInput, setCatInput] = useS(categories.join(', '));
  var [importing, setImporting] = useS(false);
  var [importText, setImportText] = useS('');
  var [importErr, setImportErr] = useS('');

  // Sync catInput → categories on blur
  var commitCats = () => {
    var cats = catInput.split(/[,\n]+/).map(c => c.trim()).filter(Boolean);
    onChangeCategories(cats);
  };
  var addWord = () => onChangeWords([...words, {
    id: Date.now().toString(),
    word: '',
    category: categories[0] || ''
  }]);
  var delWord = id => onChangeWords(words.filter(w => w.id !== id));
  var updWord = (id, field, val) => onChangeWords(words.map(w => w.id === id ? {
    ...w,
    [field]: val
  } : w));
  var doImport = () => {
    var lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    var parsed = [];
    lines.forEach((line, i) => {
      var parts = line.split('\t');
      var word = parts[0]?.trim() || '';
      var category = parts[1]?.trim() || '';
      if (!word) return;
      parsed.push({
        id: Date.now().toString() + i,
        word,
        category
      });
    });
    if (!parsed.length) {
      setImportErr('請確認格式');
      return;
    }
    onChangeWords([...words, ...parsed]);
    setImportText('');
    setImporting(false);
    setImportErr('');
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u5206\u985E\u6B04\u4F4D Categories"), /*#__PURE__*/React.createElement("input", {
    value: catInput,
    onChange: e => setCatInput(e.target.value),
    onBlur: commitCats,
    placeholder: "-le, -ture, -ive, -ize",
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u7528\u9017\u865F\u5206\u9694\u6BCF\u500B\u5206\u985E\u540D\u7A31\uFF0C\u4F8B\u5982\uFF1A", /*#__PURE__*/React.createElement("code", null, "-le, -ture, -ive, -ize"), " \u6216 ", /*#__PURE__*/React.createElement("code", null, "VV, VCV, VCCV"))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: suffixMode,
    onChange: e => onChangeSuffixMode(e.target.checked),
    style: {
      width: 16,
      height: 16,
      accentColor: 'var(--accent)',
      cursor: 'pointer'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600
    }
  }, "\u5B57\u5C3E\u7D44\u5408\u6A21\u5F0F Suffix Mode")), suffixMode ? /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginTop: 6
    }
  }, "\u2705 \u5DF2\u958B\u555F\uFF1A\u55AE\u5B57\u586B\u5165", /*#__PURE__*/React.createElement("strong", null, "\u5B57\u6839"), "\uFF08\u4E0D\u542B\u5E95\u7DDA\uFF09\uFF0C\u4F8B\u5982 ", /*#__PURE__*/React.createElement("code", null, "final"), "\u3001", /*#__PURE__*/React.createElement("code", null, "cap"), "\u3002", /*#__PURE__*/React.createElement("br", null), "\u5206\u985E\u540D\u7A31\u8A2D\u5B9A\u5B57\u5C3E\uFF0C\u4F8B\u5982 ", /*#__PURE__*/React.createElement("code", null, "-le, -ture"), "\u3002", /*#__PURE__*/React.createElement("br", null), "\u5B78\u751F\u770B\u5230 ", /*#__PURE__*/React.createElement("code", null, "final_"), "\uFF0C\u653E\u9032 ", /*#__PURE__*/React.createElement("code", null, "-le"), " \u6B04\u5F8C\u81EA\u52D5\u986F\u793A ", /*#__PURE__*/React.createElement("code", null, "finale"), "\u3002") : /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginTop: 6
    }
  }, "\u95DC\u9589\uFF1A\u55AE\u5B57\u539F\u6A23\u986F\u793A\uFF08\u4E00\u822C\u5206\u985E\u6A21\u5F0F\uFF09\u3002\u958B\u555F\u5F8C\u53EF\u505A\u5B57\u5C3E\u62FC\u63A5\u7DF4\u7FD2\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      margin: 0
    }
  }, "\u55AE\u5B57 Words (", words.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => {
      setImporting(v => !v);
      setImportErr('');
    }
  }, importing ? '✕ 取消' : '⬇ Import'), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '5px 12px'
    },
    onClick: addWord
  }, "+ Add"))), importing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-paper,#f9f7f2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 8
    }
  }, "\u5F9E Excel / Google Sheets \u8907\u88FD\u8CBC\u4E0A\uFF1A", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("code", {
    style: {
      background: 'rgba(0,0,0,0.06)',
      padding: '1px 5px',
      borderRadius: 2
    }
  }, suffixMode ? '字根 [Tab] 分類名稱' : '單字 [Tab] 分類名稱'), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 4,
      color: 'var(--ink-faint)'
    }
  }, "\u5206\u985E\u540D\u7A31\u8981\u548C\u4E0A\u65B9\u7684\u6B04\u4F4D\u540D\u7A31\u5B8C\u5168\u4E00\u81F4\uFF0C\u4F8B\u5982\uFF1A", /*#__PURE__*/React.createElement("code", null, suffixMode ? 'final [Tab] -le' : 'candle [Tab] -le'))), /*#__PURE__*/React.createElement("textarea", {
    value: importText,
    onChange: e => {
      setImportText(e.target.value);
      setImportErr('');
    },
    placeholder: suffixMode ? 'final\t-le\ncap\t-ture\nposit\t-ive\nvisual\t-ize' : 'candle\t-le\ncreature\t-ture\nactive\t-ive\nfinalize\t-ize',
    rows: 6,
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 12,
      fontFamily: 'var(--mono)',
      resize: 'vertical',
      boxSizing: 'border-box',
      lineHeight: 1.6
    }
  }), importErr && /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#dc2626',
      fontSize: 12,
      marginTop: 4
    }
  }, importErr), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '6px 14px'
    },
    onClick: () => {
      setImporting(false);
      setImportText('');
      setImportErr('');
    }
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '6px 16px'
    },
    onClick: doImport,
    disabled: !importText.trim()
  }, "\u532F\u5165 ", importText.trim() ? `(${importText.split('\n').filter(l => l.trim()).length} 個)` : ''))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr auto',
      gap: '6px 8px',
      alignItems: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)',
      paddingLeft: 2
    }
  }, suffixMode ? '字根 Stem（不含底線）' : 'Word（單字）'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)',
      paddingLeft: 2
    }
  }, "Category\uFF08\u5206\u985E\uFF09"), /*#__PURE__*/React.createElement("div", null), words.map(w => /*#__PURE__*/React.createElement(React.Fragment, {
    key: w.id
  }, /*#__PURE__*/React.createElement("input", {
    value: w.word,
    onChange: e => updWord(w.id, 'word', e.target.value),
    placeholder: suffixMode ? "final（字根，不含底線）" : "candle",
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 14
    }
  }), categories.length > 0 ? /*#__PURE__*/React.createElement("select", {
    value: w.category,
    onChange: e => updWord(w.id, 'category', e.target.value),
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 \u9078\u5206\u985E \u2014"), categories.map(cat => /*#__PURE__*/React.createElement("option", {
    key: cat,
    value: cat
  }, cat))) : /*#__PURE__*/React.createElement("input", {
    value: w.category,
    onChange: e => updWord(w.id, 'category', e.target.value),
    placeholder: "\u5148\u8F38\u5165\u4E0A\u65B9\u5206\u985E\u6B04\u4F4D",
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 14
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => delWord(w.id),
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      borderRadius: 2,
      background: 'none',
      cursor: 'pointer',
      color: 'var(--ink-3)',
      fontSize: 13
    }
  }, "\u2715")))), words.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px',
      textAlign: 'center',
      color: 'var(--ink-faint)',
      fontStyle: 'italic',
      fontSize: 13
    }
  }, "\u5C1A\u672A\u65B0\u589E\u55AE\u5B57 \u2014 \u9EDE\u9078\u53F3\u4E0A\u65B9 Add \u6216 Import"), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u9810\u89BD\uFF1A\u5B78\u751F\u5C07\u770B\u5230\u6240\u6709\u55AE\u5B57\u6253\u4E82\u5F8C\uFF0C\u9010\u4E00\u9EDE\u9078\u5206\u5230\u6B63\u78BA\u6B04\u4F4D\u3002")));
}

/* ── EssayEditor ── */
function EssayEditor({
  prompt,
  scaffold,
  onChangePrompt,
  onChangeScaffold
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u270D \u4F5C\u6587\u984C\u76EE Essay Prompt"), /*#__PURE__*/React.createElement("textarea", {
    value: prompt,
    onChange: e => onChangePrompt(e.target.value),
    placeholder: "\u4F8B\uFF1ADo you think students should have less homework? Give your opinion with reasons and examples.",
    rows: 4,
    style: {
      width: '100%',
      fontFamily: 'var(--sans)',
      fontSize: 14,
      padding: '10px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      resize: 'vertical',
      lineHeight: 1.7,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u5B78\u751F\u4F5C\u7B54\u6642\u6703\u770B\u5230\u9019\u500B\u984C\u76EE\u3002\u8ACB\u7528\u5B8C\u6574\u82F1\u6587\u53E5\u5B50\u63CF\u8FF0\u984C\u76EE\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\uD83D\uDCCB \u5BEB\u4F5C\u67B6\u69CB\u63D0\u793A Scaffold\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    value: scaffold,
    onChange: e => onChangeScaffold(e.target.value),
    placeholder: `例：\nClaim → Reason 1 → Example 1 → Reason 2 → Example 2 → Conclusion\n\nUseful words: First, Also, For example, That is why, In conclusion`,
    rows: 5,
    style: {
      width: '100%',
      fontFamily: 'var(--mono)',
      fontSize: 13,
      padding: '10px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      resize: 'vertical',
      lineHeight: 1.7,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u9078\u586B\u3002\u5B78\u751F\u4F5C\u7B54\u9801\u9762\u6703\u986F\u793A\u9019\u6BB5\u67B6\u69CB\u63D0\u793A\uFF0C\u5E6B\u52A9\u4ED6\u5011\u7D44\u7E54\u6587\u7AE0\u3002 \u53EF\u4EE5\u5217\u51FA\u7D50\u69CB\u3001\u6709\u7528\u7684\u9023\u63A5\u8A5E\u6216\u8A55\u5206\u6A19\u6E96\u3002")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: 6,
      fontSize: 13,
      color: '#166534',
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("strong", null, "AI \u6279\u6539\u6A19\u6E96\uFF08\u81EA\u52D5\u5957\u7528\uFF09\uFF1A"), /*#__PURE__*/React.createElement("br", null), "Claim \xB7 Reasons \xB7 Examples \xB7 Explanation \xB7 Conclusion \xB7 Organization \xB7 Grammar", /*#__PURE__*/React.createElement("br", null), "AI \u6703\u7D66\u51FA Score \u2B50\u2B50\u2B50\u2B50\u2B50\u3001Good Job\uFF08\u5BA2\u89C0\u512A\u9EDE\uFF09\u3001To Improve\uFF08\u5BA2\u89C0\u6539\u9032\u9EDE\uFF09\u3001Better Version\u3002"));
}

/* ── StoryMountainEditor ── */
var SM_STAGE_KEYS = ['intro', 'rising', 'climax', 'falling', 'resolution'];
var SM_STAGE_LABELS = {
  intro: 'Introduction',
  rising: 'Rising Action',
  climax: 'Climax',
  falling: 'Falling Action',
  resolution: 'Resolution'
};
var SM_STAGE_EMOJIS = {
  intro: '🏠',
  rising: '📈',
  climax: '⭐',
  falling: '📉',
  resolution: '🏁'
};
function StoryMountainEditor({
  prompt,
  passage,
  hints,
  onChangePrompt,
  onChangePassage,
  onChangeHints
}) {
  var updateHint = (key, val) => onChangeHints({
    ...hints,
    [key]: val
  });
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\uD83C\uDFD4 \u5BEB\u4F5C\u984C\u76EE Writing Topic"), /*#__PURE__*/React.createElement("textarea", {
    value: prompt,
    onChange: e => onChangePrompt(e.target.value),
    placeholder: "\u4F8B\uFF1AWrite a story about a brave student who faced a big challenge at school.",
    rows: 3,
    style: {
      width: '100%',
      fontFamily: 'var(--sans)',
      fontSize: 14,
      padding: '10px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      resize: 'vertical',
      lineHeight: 1.7,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u5B78\u751F\u4F5C\u7B54\u6642\u770B\u5230\u7684\u984C\u76EE\u3002\u5982\u679C\u662F\u95B1\u8B80\u5206\u6790\uFF08\u5B78\u751F\u6839\u64DA\u6587\u7AE0\u586B\u5BEB\uFF09\uFF0C\u53EF\u4EE5\u4E0D\u586B\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\uD83D\uDCC4 \u53C3\u8003\u6587\u7AE0\u6587\u5B57\u7A3F\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    value: passage,
    onChange: e => onChangePassage(e.target.value),
    placeholder: "\u8CBC\u4E0A\u8AB2\u5802\u6545\u4E8B\u6216\u95B1\u8B80\u6587\u7AE0\u3002AI \u6279\u6539\u6642\u6703\u7528\u9019\u7BC7\u6587\u7AE0\u5224\u65B7\u5B78\u751F\u7684 Story Mountain \u662F\u5426\u6B63\u78BA...",
    rows: 6,
    style: {
      width: '100%',
      fontFamily: 'var(--sans)',
      fontSize: 13,
      padding: '10px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      resize: 'vertical',
      lineHeight: 1.7,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u2705 ", /*#__PURE__*/React.createElement("strong", null, "\u95B1\u8B80\u5206\u6790"), "\uFF1A\u8CBC\u4E0A\u6587\u7AE0\uFF0CAI \u6BD4\u5C0D\u5B78\u751F\u7684 Story Mountain \u662F\u5426\u7B26\u5408\u539F\u6587", /*#__PURE__*/React.createElement("br", null), "\u2705 ", /*#__PURE__*/React.createElement("strong", null, "\u5275\u610F\u5BEB\u4F5C"), "\uFF1A\u4E0D\u586B\uFF0CAI \u76F4\u63A5\u6839\u64DA\u6545\u4E8B\u672C\u8EAB\u5224\u65B7\u908F\u8F2F")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\uD83D\uDCA1 \u5404\u968E\u6BB5\u63D0\u793A\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 10
    }
  }, "\u6BCF\u500B\u968E\u6BB5\u53EF\u8A2D\u5B9A\u63D0\u793A\u8A9E\uFF0C\u5F15\u5C0E\u5B78\u751F\u77E5\u9053\u8981\u5BEB\u4EC0\u9EBC\u3002"), SM_STAGE_KEYS.map(key => /*#__PURE__*/React.createElement("div", {
    key: key,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      width: 130,
      flexShrink: 0,
      paddingTop: 9,
      color: 'var(--ink)'
    }
  }, SM_STAGE_EMOJIS[key], " ", SM_STAGE_LABELS[key]), /*#__PURE__*/React.createElement("input", {
    value: hints[key] || '',
    onChange: e => updateHint(key, e.target.value),
    placeholder: key === 'intro' ? 'Who are the main characters? Where does the story happen?' : key === 'rising' ? 'What problem or challenge starts to appear?' : key === 'climax' ? 'What is the most exciting or most difficult moment?' : key === 'falling' ? 'How does the character start to deal with the problem?' : 'How does the story end? What did the character learn?',
    style: {
      flex: 1,
      padding: '7px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 13
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: 6,
      fontSize: 13,
      color: '#166534',
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("strong", null, "AI \u6279\u6539\u6A19\u6E96\uFF08\u81EA\u52D5\u5957\u7528\uFF09\uFF1A"), /*#__PURE__*/React.createElement("br", null), "Score \u2B50\u2B50\u2B50\u2B50\u2B50 \xB7 Good Job\uFF08\u5BA2\u89C0\u512A\u9EDE\uFF09\xB7 To Improve\uFF08\u5BA2\u89C0\u6539\u9032\u9EDE\uFF09\xB7 Better Version"));
}

/* ── CircleAnswerEditor ── */
function CircleAnswerEditor({
  questions,
  instruction,
  labels,
  onChangeQuestions,
  onChangeInstruction,
  onChangeLabels
}) {
  var [labelText, setLabelText] = useS((labels || []).join(', '));
  var [importing, setImporting] = useS(false);
  var [importText, setImportText] = useS('');
  var [importErr, setImportErr] = useS('');
  useE(() => {
    setLabelText((labels || []).join(', '));
  }, [JSON.stringify(labels || [])]);
  var commitLabels = (raw = labelText) => {
    var next = raw.split(/[,\n]+/).map(v => v.trim()).filter(Boolean);
    onChangeLabels([...new Set(next)]);
  };
  var addQuestion = () => onChangeQuestions([...questions, {
    id: 'circle' + Date.now() + Math.random().toString(36).slice(2, 5),
    sentence: '',
    answer: '',
    label: ''
  }]);
  var updateQuestion = (id, field, value) => onChangeQuestions(questions.map(q => q.id === id ? {
    ...q,
    [field]: value
  } : q));
  var deleteQuestion = id => onChangeQuestions(questions.filter(q => q.id !== id));
  var doImport = () => {
    var parsed = [];
    var foundLabels = [];
    importText.split('\n').map(line => line.trim()).filter(Boolean).forEach((line, index) => {
      var separator = line.includes('\t') ? '\t' : line.includes('|') ? '|' : null;
      if (!separator) return;
      var cols = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
      if (!cols[0] || !cols[1]) return;
      parsed.push({
        id: 'circle' + Date.now() + index + Math.random().toString(36).slice(2, 4),
        sentence: cols[0],
        answer: cols[1],
        label: cols[2] || ''
      });
      if (cols[2]) foundLabels.push(cols[2]);
    });
    if (!parsed.length) {
      setImportErr('沒有可匯入的題目。請使用：句子 [Tab] 要圈的答案 [Tab] 分類答案（選填）');
      return;
    }
    onChangeQuestions([...questions, ...parsed]);
    if (foundLabels.length) {
      var nextLabels = [...new Set([...(labels || []), ...foundLabels])];
      onChangeLabels(nextLabels);
      setLabelText(nextLabels.join(', '));
    }
    setImportText('');
    setImportErr('');
    setImporting(false);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Instruction \xB7 \u4F5C\u7B54\u6307\u793A"), /*#__PURE__*/React.createElement("input", {
    value: instruction,
    onChange: e => onChangeInstruction(e.target.value),
    placeholder: "Circle the adjective or adverb in the sentence."
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "Optional classification choices \xB7 \u7B2C\u4E8C\u6B65\u5206\u985E\u9078\u9805\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: labelText,
    onChange: e => setLabelText(e.target.value),
    onBlur: () => commitLabels(),
    placeholder: "adjective, adverb"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u7559\u7A7A\u6642\u5B78\u751F\u53EA\u8981\u5708\u7B54\u6848\uFF1B\u586B\u5165\u9078\u9805\u5F8C\uFF0C\u5B78\u751F\u9084\u9700\u8981\u5B8C\u6210\u7B2C\u4E8C\u6B65\u5206\u985E\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      margin: 0
    }
  }, "Questions \xB7 \u984C\u76EE (", questions.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 11,
      padding: '5px 10px'
    },
    onClick: () => {
      setImporting(v => !v);
      setImportErr('');
    }
  }, importing ? '✕ 取消' : '⬇ Import'), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 11,
      padding: '5px 12px'
    },
    onClick: addQuestion
  }, "+ Add"))), importing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12,
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 8,
      lineHeight: 1.7
    }
  }, "\u5F9E Excel / Google Sheets \u8CBC\u4E0A\u4E09\u6B04\uFF1A\u53E5\u5B50\u3001\u8981\u5708\u7684\u7B54\u6848\u3001\u5206\u985E\u7B54\u6848\uFF08\u9078\u586B\uFF09\u3002"), /*#__PURE__*/React.createElement("textarea", {
    value: importText,
    onChange: e => {
      setImportText(e.target.value);
      setImportErr('');
    },
    placeholder: 'The tiny bird sat on the tree.\ttiny\tadjective\nWe will clean the room soon.\tsoon\tadverb',
    rows: 7,
    style: {
      width: '100%',
      padding: '9px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      fontSize: 13,
      fontFamily: 'var(--mono)',
      resize: 'vertical',
      boxSizing: 'border-box'
    }
  }), importErr && /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#dc2626',
      fontSize: 12,
      marginTop: 5
    }
  }, importErr), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '6px 16px'
    },
    onClick: doImport,
    disabled: !importText.trim()
  }, "Import questions"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.8fr .55fr .65fr auto',
      gap: '6px 8px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)'
    }
  }, "Sentence \xB7 \u53E5\u5B50"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)'
    }
  }, "Circle \xB7 \u5708\u51FA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)'
    }
  }, "Classify \xB7 \u5206\u985E"), /*#__PURE__*/React.createElement("div", null), questions.map(q => /*#__PURE__*/React.createElement(React.Fragment, {
    key: q.id
  }, /*#__PURE__*/React.createElement("input", {
    value: q.sentence || '',
    onChange: e => updateQuestion(q.id, 'sentence', e.target.value),
    placeholder: "The tiny bird sat on the tree.",
    style: {
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: q.answer || '',
    onChange: e => updateQuestion(q.id, 'answer', e.target.value),
    placeholder: "tiny",
    style: {
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: q.label || '',
    onChange: e => updateQuestion(q.id, 'label', e.target.value),
    placeholder: "optional",
    list: "circle-label-options",
    style: {
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => deleteQuestion(q.id),
    style: {
      padding: '7px 10px',
      border: '1px solid var(--border)',
      borderRadius: 2,
      background: 'none',
      cursor: 'pointer',
      color: 'var(--ink-3)',
      fontSize: 13
    },
    title: "Delete"
  }, "\u2715")))), /*#__PURE__*/React.createElement("datalist", {
    id: "circle-label-options"
  }, (labels || []).map(label => /*#__PURE__*/React.createElement("option", {
    key: label,
    value: label
  }))), questions.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      textAlign: 'center',
      color: 'var(--ink-faint)',
      fontSize: 13
    }
  }, "\u5C1A\u672A\u65B0\u589E\u984C\u76EE \u2014 \u4F7F\u7528 Add \u6216 Import")));
}

/* ── ClozeEditor ── */
function ClozeEditor({
  passage,
  onChangePassage,
  wordBank,
  onChangeWordBank
}) {
  var [importing, setImporting] = useS(false);
  var [importPassage, setImportPassage] = useS('');
  var [importAnswers, setImportAnswers] = useS('');
  var [importErr, setImportErr] = useS('');
  var blankCount = (passage.match(/\[[^\]]+\]/g) || []).length;
  var doImport = () => {
    setImportErr('');
    var passageText = importPassage.trim();
    if (!passageText) {
      setImportErr('請貼上文章內容');
      return;
    }

    // Find all ___ (with optional hint like (have))
    var blankRegex = /___(?:\s*\(([^)]*)\))?/g;
    var blanksFound = [...passageText.matchAll(blankRegex)];
    if (blanksFound.length === 0) {
      setImportErr('在文章中找不到 ___ 空格，請確認格式');
      return;
    }

    // Parse answers (one per line, ignore empty lines)
    var answers = importAnswers.split('\n').map(l => l.trim()).filter(Boolean);
    if (answers.length === 0) {
      setImportErr('請在右欄填入答案（每行一個）');
      return;
    }
    if (answers.length !== blanksFound.length) {
      setImportErr(`空格數 (${blanksFound.length}) 與答案數 (${answers.length}) 不符，請確認`);
      return;
    }

    // Replace each ___ with [answer](hint) or [answer]
    var idx = 0;
    var result = passageText.replace(/___(?:\s*\(([^)]*)\))?/g, (match, hint) => {
      var ans = answers[idx++] || '';
      return hint ? `[${ans}](${hint})` : `[${ans}]`;
    });
    onChangePassage(result);
    setImporting(false);
    setImportPassage('');
    setImportAnswers('');
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label",
    style: {
      margin: 0
    }
  }, "\u6587\u7AE0\u5167\u5BB9 Passage"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost" + (importing ? " active" : ""),
    style: {
      fontSize: 11,
      padding: '4px 12px'
    },
    onClick: () => {
      setImporting(v => !v);
      setImportErr('');
    }
  }, importing ? '✕ 取消' : '⬇ Import')), importing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14,
      padding: '14px 16px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 12,
      lineHeight: 1.7
    }
  }, "\u5DE6\u6B04\u8CBC\u5165\u539F\u59CB\u6587\u7AE0\uFF08\u7528 ", /*#__PURE__*/React.createElement("code", {
    style: {
      background: 'rgba(0,0,0,0.06)',
      padding: '1px 4px',
      borderRadius: 2
    }
  }, "___"), " \u7576\u7A7A\u683C\uFF0C\u62EC\u865F\u63D0\u793A\u4FDD\u7559\uFF09\uFF1B \u53F3\u6B04\u6BCF\u884C\u8CBC\u4E00\u500B\u7B54\u6848\uFF0C\u9806\u5E8F\u9700\u8207\u7A7A\u683C\u4E00\u81F4\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 4
    }
  }, "\u6587\u7AE0\uFF08___ \u7576\u7A7A\u683C\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    value: importPassage,
    onChange: e => {
      setImportPassage(e.target.value);
      setImportErr('');
    },
    rows: 10,
    placeholder: "Two summers ago we ___ (have) a holiday in Scotland. We ___ (drive) there from London, but our car ___ (break) down on the motorway and we ___ (spend) the first night in Birmingham.",
    style: {
      width: '100%',
      fontFamily: 'var(--sans)',
      fontSize: 13,
      padding: '9px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      resize: 'vertical',
      lineHeight: 1.8,
      boxSizing: 'border-box'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontFamily: 'var(--mono)',
      color: 'var(--ink-muted)',
      marginBottom: 4
    }
  }, "\u7B54\u6848\uFF08\u6BCF\u884C\u4E00\u500B\uFF0C\u7167\u9806\u5E8F\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    value: importAnswers,
    onChange: e => {
      setImportAnswers(e.target.value);
      setImportErr('');
    },
    rows: 10,
    placeholder: "had\ndrove\nbroke\nspent",
    style: {
      width: '100%',
      fontFamily: 'var(--mono)',
      fontSize: 14,
      padding: '9px 10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      resize: 'vertical',
      lineHeight: 1.9,
      boxSizing: 'border-box'
    }
  }))), importErr && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--accent)',
      fontSize: 12,
      marginTop: 8,
      fontFamily: 'var(--mono)'
    }
  }, "\u26A0 ", importErr), importPassage && importAnswers && (() => {
    var blanks = [...importPassage.matchAll(/___(?:\s*\([^)]*\))?/g)].length;
    var ans = importAnswers.split('\n').filter(l => l.trim()).length;
    return blanks > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: blanks === ans ? 'var(--moss)' : 'var(--accent)',
        marginTop: 6,
        fontFamily: 'var(--mono)'
      }
    }, blanks === ans ? `✅ ${blanks} 個空格 · ${ans} 個答案 — 可以匯入` : `⚠ ${blanks} 個空格 vs ${ans} 個答案 — 數量不符`);
  })(), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 10,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      fontSize: 12,
      padding: '6px 14px'
    },
    onClick: () => {
      setImporting(false);
      setImportPassage('');
      setImportAnswers('');
      setImportErr('');
    }
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      fontSize: 12,
      padding: '6px 16px'
    },
    onClick: doImport,
    disabled: !importPassage.trim() || !importAnswers.trim()
  }, "\u532F\u5165 \u2192"))), /*#__PURE__*/React.createElement("textarea", {
    value: passage,
    onChange: e => onChangePassage(e.target.value),
    rows: 10,
    placeholder: "Two summers ago we [had](have) a holiday in Scotland. We [drove](drive) there from London...\n\n（也可以用上方 Import 按鈕，分別貼入文章和答案，自動合成格式）",
    style: {
      width: '100%',
      fontFamily: 'var(--sans)',
      fontSize: 14,
      padding: '10px 12px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      resize: 'vertical',
      lineHeight: 1.9,
      boxSizing: 'border-box'
    }
  }), blankCount > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginTop: 6,
      color: 'var(--moss)'
    }
  }, "\u2705 \u5DF2\u5075\u6E2C\u5230 ", /*#__PURE__*/React.createElement("strong", null, blankCount), " \u500B\u7A7A\u683C") : passage.trim() ? /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginTop: 6,
      color: 'var(--accent)'
    }
  }, "\u26A0 \u5C1A\u672A\u5075\u6E2C\u5230\u7A7A\u683C\uFF0C\u8ACB\u7528 [\u7B54\u6848] \u6A19\u8A18\uFF0C\u6216\u4F7F\u7528\u4E0A\u65B9 Import") : null), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\uD83D\uDD24 Word Bank\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: (wordBank || []).join(', '),
    onChange: e => onChangeWordBank(e.target.value.split(/[,、\n\t]+/).map(x => x.trim()).filter(Boolean)),
    placeholder: "soar, prey, shade, feather, attract, distract, brittle, trap",
    style: {
      width: '100%',
      fontFamily: 'var(--sans)',
      fontSize: 14,
      padding: '9px 11px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--ink)',
      borderRadius: 2,
      boxSizing: 'border-box'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginTop: 6
    }
  }, "\u586B\u4E86\u4E4B\u5F8C\uFF0C\u5B78\u751F\u7684\u4F5C\u7B54\u756B\u9762\u6700\u4E0A\u9762\u6703\u51FA\u73FE\u4E00\u6392\u55AE\u5B57\uFF08", /*#__PURE__*/React.createElement("b", null, "\u9EDE\u4E00\u4E0B\u5C31\u586B\u9032\u7A7A\u683C"), "\uFF0C\u9806\u5E8F\u6BCF\u6B21\u90FD\u6703\u6253\u6563\uFF09\u3002", /*#__PURE__*/React.createElement("b", null, "\u5BEB\u539F\u5F62\u5C31\u597D"), "\u2014\u2014\u50CF\u4F5C\u696D\u7D19\u4E00\u6A23\uFF0C\u7A7A\u683C\u5F8C\u9762\u7684 ", /*#__PURE__*/React.createElement("code", null, "(ing)"), "\u3001", /*#__PURE__*/React.createElement("code", null, "(s)"), " \u624D\u662F\u8981\u5B78\u751F\u81EA\u5DF1\u8B8A\u5316\u7684\u5730\u65B9\u3002", (wordBank || []).length > 0 && blankCount > 0 && (wordBank || []).length !== blankCount && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "\u26A0 Word Bank \u6709 ", (wordBank || []).length, " \u500B\u5B57\u3001\u6587\u7AE0\u6709 ", blankCount, " \u500B\u7A7A\u683C\u2014\u2014 \u6578\u91CF\u4E0D\u540C\u4E0D\u6703\u58DE\u6389\uFF08\u6709\u4E9B\u5B57\u53EF\u80FD\u6316\u4E86\u5169\u683C\uFF09\uFF0C\u53EA\u662F\u78BA\u8A8D\u4E00\u4E0B\u662F\u4E0D\u662F\u4F60\u8981\u7684\u3002")))));
}

/* ══════════════════════════════════════════════════════════════════════════
   v386: 閱讀技巧的編輯器（reading-skill）
   ──────────────────────────────────────────────────────────────────────────
   ⚠ 這一組 RsBlockEditor 同時被兩個地方用：
     ① EditorModal 的 reading-skill 分支（老師事後想改）
     ② ReadingGenModal 的校稿頁（AI 出完先看過再建立）
   只寫一份，兩邊行為一定一致（v382 的教訓：校稿頁跟編輯器長不一樣＝老師會困惑）。
   ══════════════════════════════════════════════════════════════════════════ */

var RS_ZH = {
  'problem-solution': '🧩 問題與解決 Problem & Solution',
  'cause-effect': '⚡ 因果關係 Cause & Effect',
  'sequence': '🔢 事件排序 Sequencing',
  'compare-contrast': '⚖️ 比較對照 Compare & Contrast'
};
function rsBlankBlock(kind) {
  var mk = () => window.rcNewChip ? window.rcNewChip() : {
    id: 'rc' + Math.random().toString(36).slice(2, 8),
    text: '',
    zone: '',
    why: ''
  };
  var id = window.rcNewBlockId ? window.rcNewBlockId() : 'rb' + Math.random().toString(36).slice(2, 8);
  if (kind === 'problem-solution') {
    return {
      id,
      kind,
      zones: [{
        id: 'problem',
        label: 'Problem 問題',
        ico: '⚠️'
      }, {
        id: 'solution',
        label: 'Solution 解決方法',
        ico: '💡'
      }],
      chips: [{
        ...mk(),
        zone: 'problem'
      }, {
        ...mk(),
        zone: 'problem'
      }, {
        ...mk(),
        zone: 'solution'
      }, {
        ...mk(),
        zone: 'solution'
      }]
    };
  }
  if (kind === 'cause-effect') {
    return window.rcRepairBlock({
      id,
      kind,
      zones: [{
        id: 'c0',
        label: '',
        ico: '⚡'
      }, {
        id: 'c1',
        label: '',
        ico: '⚡'
      }, {
        id: 'c2',
        label: '',
        ico: '⚡'
      }],
      chips: [mk(), mk(), mk()]
    });
  }
  if (kind === 'sequence') {
    return window.rcResequence({
      id,
      kind,
      zones: [],
      chips: [mk(), mk(), mk(), mk(), mk()]
    });
  }
  // ⚠ 至少 6 張，不然老師把空白格全部填完，這一塊還是紅的（rcValidBlock 要求 6–9）
  return {
    id,
    kind,
    leftLabel: '',
    rightLabel: '',
    zones: [{
      id: 'left',
      label: '',
      ico: '🔵'
    }, {
      id: 'both',
      label: '兩邊都有 Both',
      ico: '🟣'
    }, {
      id: 'right',
      label: '',
      ico: '🟠'
    }],
    chips: [{
      ...mk(),
      zone: 'left'
    }, {
      ...mk(),
      zone: 'left'
    }, {
      ...mk(),
      zone: 'both'
    }, {
      ...mk(),
      zone: 'both'
    }, {
      ...mk(),
      zone: 'right'
    }, {
      ...mk(),
      zone: 'right'
    }]
  };
}
function RsBlockEditor({
  block,
  onChange,
  onDelete
}) {
  if (!block) return null;
  var kind = block.kind;
  var chips = block.chips || [];
  var zones = block.zones || [];
  var bad = !window.rcValidBlock(block);
  var setChip = (i, k, v) => onChange({
    ...block,
    chips: chips.map((c, j) => j === i ? {
      ...c,
      [k]: v
    } : c)
  });
  var setZone = (i, v) => onChange({
    ...block,
    zones: zones.map((z, j) => j === i ? {
      ...z,
      label: v
    } : z)
  });
  var addChip = () => {
    var nc = window.rcNewChip();
    var next = {
      ...block,
      chips: chips.concat([{
        ...nc,
        zone: kind === 'problem-solution' ? 'problem' : kind === 'compare-contrast' ? 'left' : ''
      }])
    };
    if (kind === 'cause-effect') next.zones = zones.concat([{
      id: 'c' + zones.length,
      label: '',
      ico: '⚡'
    }]);
    onChange(window.rcRepairBlock(next));
  };
  var delChip = i => onChange(window.rcFilterChips(block, (_c, j) => j !== i));
  var move = (i, d) => {
    var j = i + d;
    if (j < 0 || j >= chips.length) return;
    var arr = chips.slice();
    var t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
    var next = {
      ...block,
      chips: arr
    };
    if (kind === 'cause-effect') {
      var zs = zones.slice();
      var tz = zs[i];
      zs[i] = zs[j];
      zs[j] = tz;
      next.zones = zs;
    }
    onChange(window.rcRepairBlock(next));
  };
  var setSide = (side, v) => {
    var zid = side === 'left' ? 'left' : 'right';
    onChange({
      ...block,
      [side + 'Label']: v,
      zones: zones.map(z => z.id === zid ? {
        ...z,
        label: v
      } : z)
    });
  };
  var zoneSel = (i, c) => /*#__PURE__*/React.createElement("select", {
    className: "rc-z",
    value: c.zone || '',
    onChange: e => setChip(i, 'zone', e.target.value)
  }, kind === 'problem-solution' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("option", {
    value: "problem"
  }, "\u26A0\uFE0F Problem"), /*#__PURE__*/React.createElement("option", {
    value: "solution"
  }, "\uD83D\uDCA1 Solution")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("option", {
    value: "left"
  }, "\uD83D\uDD35 \u53EA\u6709 ", block.leftLabel || '左邊'), /*#__PURE__*/React.createElement("option", {
    value: "both"
  }, "\uD83D\uDFE3 \u5169\u908A\u90FD\u6709"), /*#__PURE__*/React.createElement("option", {
    value: "right"
  }, "\uD83D\uDFE0 \u53EA\u6709 ", block.rightLabel || '右邊')));
  return /*#__PURE__*/React.createElement("div", {
    className: 'rc-block' + (bad ? ' bad' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "rc-block-head"
  }, /*#__PURE__*/React.createElement("b", null, RS_ZH[kind] || kind), /*#__PURE__*/React.createElement("span", {
    className: "rc-block-n"
  }, chips.length, " \u5F35\u5361"), onDelete && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-x",
    "aria-label": "\u522A\u9664\u9019\u500B\u6280\u5DE7",
    onClick: onDelete,
    title: "\u522A\u6389\u9019\u500B\u6280\u5DE7"
  }, "\u2715")), bad && /*#__PURE__*/React.createElement("div", {
    className: "rc-warn"
  }, "\u26A0 \u9019\u4E00\u584A\u9084\u4E0D\u80FD\u7528\uFF1A", kind === 'problem-solution' && '需要 4–8 張卡，Problem 與 Solution 各至少 2 張，文字不可重複或空白。', kind === 'cause-effect' && '需要 3–5 組，每組的 Cause 與 Effect 都要填、而且不可重複。', kind === 'sequence' && '需要 5–8 個事件，文字不可重複或空白。', kind === 'compare-contrast' && '需要 6–9 張卡（左≥2、右≥2、兩邊都有≥1），兩邊的標題都要填。'), kind === 'compare-contrast' && /*#__PURE__*/React.createElement("div", {
    className: "rc-two"
  }, /*#__PURE__*/React.createElement("label", {
    className: "rc-lab"
  }, "\uD83D\uDD35 \u5DE6\u908A\u662F\u4EC0\u9EBC", /*#__PURE__*/React.createElement("input", {
    value: block.leftLabel || '',
    onChange: e => setSide('left', e.target.value),
    placeholder: "After the wolves left"
  })), /*#__PURE__*/React.createElement("label", {
    className: "rc-lab"
  }, "\uD83D\uDFE0 \u53F3\u908A\u662F\u4EC0\u9EBC", /*#__PURE__*/React.createElement("input", {
    value: block.rightLabel || '',
    onChange: e => setSide('right', e.target.value),
    placeholder: "After the wolves returned"
  }))), kind === 'cause-effect' ? chips.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    className: "rc-row rc-row-ce"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rc-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "rc-row-f"
  }, /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: zones[i] && zones[i].label || '',
    onChange: e => setZone(i, e.target.value),
    placeholder: "Cause\uFF08\u539F\u56E0\uFF09\u4F8B\uFF1AThe wolves left the island."
  }), /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: c.text,
    onChange: e => setChip(i, 'text', e.target.value),
    placeholder: "Effect\uFF08\u7D50\u679C\uFF09\u4F8B\uFF1AThere were too many deer."
  }), /*#__PURE__*/React.createElement("input", {
    className: "rc-in rc-why",
    value: c.why || '',
    onChange: e => setChip(i, 'why', e.target.value),
    placeholder: "\u4E2D\u6587\u63D0\u793A\uFF08\u9078\u586B\uFF09\u2014\u2014\u653E\u932F\u6642\u7D66\u5B78\u751F\u770B"
  })), /*#__PURE__*/React.createElement("div", {
    className: "rc-ud"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => move(i, -1),
    disabled: i === 0
  }, "\u25B2"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => move(i, 1),
    disabled: i === chips.length - 1
  }, "\u25BC"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-x",
    onClick: () => delChip(i)
  }, "\u2715")))) : kind === 'sequence' ? chips.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    className: "rc-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rc-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "rc-row-f"
  }, /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: c.text,
    onChange: e => setChip(i, 'text', e.target.value),
    placeholder: `第 ${i + 1} 件發生的事`
  })), /*#__PURE__*/React.createElement("div", {
    className: "rc-ud"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => move(i, -1),
    disabled: i === 0
  }, "\u25B2"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => move(i, 1),
    disabled: i === chips.length - 1
  }, "\u25BC"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-x",
    onClick: () => delChip(i)
  }, "\u2715")))) : chips.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    className: "rc-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rc-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "rc-row-f"
  }, /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: c.text,
    onChange: e => setChip(i, 'text', e.target.value),
    placeholder: "\u4E00\u53E5\u8A71\u7684\u5361\u7247\u5167\u5BB9\uFF08\u82F1\u6587\uFF09"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rc-row-2"
  }, zoneSel(i, c), /*#__PURE__*/React.createElement("input", {
    className: "rc-in rc-why",
    value: c.why || '',
    onChange: e => setChip(i, 'why', e.target.value),
    placeholder: "\u4E2D\u6587\u63D0\u793A\uFF08\u9078\u586B\uFF09"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "rc-ud"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-x",
    onClick: () => delChip(i)
  }, "\u2715")))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-add",
    onClick: addChip
  }, "\uFF0B \u65B0\u589E\u4E00", kind === 'cause-effect' ? '組' : '張'), kind === 'sequence' && /*#__PURE__*/React.createElement("div", {
    className: "rc-note"
  }, "\u4E0A\u9762\u7684\u9806\u5E8F\uFF1D\u6B63\u78BA\u7B54\u6848\u3002\u5B78\u751F\u770B\u5230\u7684\u662F\u6253\u4E82\u7684\u3002"));
}

/* EditorModal 用的整段：文章 + 幾個技巧 */
function ReadingSkillEditor({
  passage,
  blocks,
  onChangePassage,
  onChangeBlocks
}) {
  var list = blocks || [];
  var [addKind, setAddKind] = useS('problem-solution');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\uD83D\uDCD6 \u6587\u7AE0\uFF0F\u6587\u5B57\u7A3F\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    rows: 5,
    value: passage || '',
    onChange: e => onChangePassage(e.target.value),
    placeholder: "\u8CBC\u4E0A\u6587\u7AE0\uFF0C\u5B78\u751F\u5728\u7DF4\u7FD2\u6642\u53EF\u4EE5\u6309 \uD83D\uDCD6 \u518D\u770B\u4E00\u6B21\u3002\u4E0D\u8CBC\u4E5F\u53EF\u4EE5\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u5B78\u751F\u9EDE\u53F3\u4E0A\u89D2\u7684 \uD83D\uDCD6 \u5C31\u80FD\u53EB\u51FA\u4F86\u5C0D\u7167\uFF0C\u4E0D\u7528\u9000\u51FA\u53BB\u91CD\u8B80\u3002")), list.map((b, i) => /*#__PURE__*/React.createElement(RsBlockEditor, {
    key: b.id || i,
    block: b,
    onChange: nb => onChangeBlocks(list.map((x, j) => j === i ? nb : x)),
    onDelete: () => onChangeBlocks(list.filter((_, j) => j !== i))
  })), /*#__PURE__*/React.createElement("div", {
    className: "rc-addblock"
  }, /*#__PURE__*/React.createElement("select", {
    value: addKind,
    onChange: e => setAddKind(e.target.value)
  }, Object.keys(RS_ZH).map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, RS_ZH[k]))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost",
    onClick: () => onChangeBlocks(list.concat([rsBlankBlock(addKind)]))
  }, "\uFF0B \u52A0\u4E00\u7A2E\u6280\u5DE7")));
}

/* ══════════════════════════════════════════════════════════════════════════
   v386: 📖 出閱讀理解 —— 貼文字稿，一次生「選擇題＋閱讀簡答＋閱讀技巧」
   流程沿用 v382 出時態題目那一套：設定 → 出題（進度條）→ 分頁校稿 → 建立。
   ══════════════════════════════════════════════════════════════════════════ */
/* 校稿頁的紅框、擋按鈕、以及 rcBuildItems 的過濾，全部用這一個判斷——
   三個地方各寫一套的話，一定會出現「畫面說可以、建立時被丟掉」。 */
function rcMcqOk(q) {
  if (!q || !String(q.q || '').trim()) return false;
  var o = (q.options || []).map(x => String(x || '').trim());
  if (o.length !== 4 || o.some(x => !x)) return false;
  if (new Set(o.map(x => x.toLowerCase())).size !== 4) return false; // 選項重複 → 播放時 indexOf 會判錯
  return q.answer >= 0 && q.answer < 4;
}

/* ═════════════════════════════════════════════════════════════════════════
   v428: ✏️ 出文法 —— 上傳老師的作業照片（或貼文字）→ 簡單互動教學 → 選擇＋填空＋中翻英
   ─────────────────────────────────────────────────────────────────────────
   Alan：「我會上傳老師的作業圖片檔 或是文字…希望一開始有簡單教學 越簡單越好不要複雜
          一定要是互動式的學習…學習完成才開始正式練習題目測驗，可以包含選擇題，填空題，以及中翻英」
   建出來的單元：📘 互動教學（lesson＋steps）→ 📝 選擇題（quiz）→ ✏️ 填空（type-answer/fill）
   → 🔤 中翻英（type-answer/translate）。後三個都帶 requires＝教學的 id：沒學完鎖著。
   ═════════════════════════════════════════════════════════════════════════ */
var GN_KIND_ZH = {
  learn: '📖 學',
  pick: '👆 選一選',
  tap: '👉 找出來',
  sort: '🗂 分一分',
  order: '🧩 排句子',
  fix: '🔍 找錯字',
  /* v471：三種會動的講解（跟 learn 一樣沒有對錯，看完就能往下） */
  timeline: '⏳ 時態時間軸',
  forms: '🔀 三種句型',
  degree: '📊 比較級'
};
async function gnFileToImage(file) {
  var cv = await grDecodeScaled(file, 1600); // 1600px：字看得清楚、上傳也不會太大
  var url = cv.toDataURL('image/jpeg', 0.82);
  return {
    media_type: 'image/jpeg',
    data: url.split(',')[1],
    preview: url
  };
}

/* ══ 📸 v516 拍考卷照片 → 變成互動版 ═══════════════════════════════════════
   Alan 手上有一疊考過的 Formative。v515 做好了「考卷」這個容器，這裡把紙變成資料。
   讀照片的機制沿用 v428~v430（一張一個請求、同時送、壞一頁只少一頁）。
   ⭐ 讀完的校稿檢查直接用 examWarnings()——跟老師手打考卷吃同一組檢查，不另外寫一份。
   🔴 這些照片上滿滿都是學生的手寫答案與老師的紅筆，而且有名字跟分數。
     提示詞已經寫明「只讀印刷的、不要抓姓名與分數」，但校稿頁還是把讀到的東西
     整個攤開讓 Alan 看過再存。 */

/* ══ 💬 v517 用講的就好 ════════════════════════════════════════════════════
   Alan：「我用對話的他就可以幫我生成 單字 文法 word study reading comprehension…
          我都有所有模板了對吧？應該很容易做到」

   ⭐ 他說得對，所以這裡**一行出題邏輯都沒有**。它只做兩件事：
     ① 聽懂要做哪一件事、把參數抓出來（data.js 的 aiRouteCommand，程式再驗一次）
     ② 打開**現成的那個視窗**並且填好
   出題、校稿、存檔走的全是舊路。
   🔴 它不會自己存——中間一定有一張確認卡（週次是整個年級共用一份文件）。 */

/* v518：出完的題目攤出來給 Alan 看——他說「檢查沒問題」才存。
   ⚠ 不是完整校稿頁（那在各自的視窗裡），是「夠他判斷方向對不對」的份量：
     每個單元幾題、前兩題長什麼樣。方向錯的話重出一份比校稿快。 */
function AskPreview({
  items
}) {
  var [open, setOpen] = useS({});
  var peek = it => {
    var q = it.questions || it.saQuestions || [];
    if (q.length) return q.slice(0, 2).map(x => x.q || x.question).filter(Boolean);
    if ((it.cards || []).length) return it.cards.slice(0, 4).map(c => `${c.term}${c.zh ? ' — ' + c.zh : ''}`);
    if ((it.pairs || []).length) return it.pairs.slice(0, 2).map(p => `${p.q || p.word} → ${p.a || p.answer || ''}`);
    if ((it.defPairs || []).length) return it.defPairs.slice(0, 2).map(p => `${p.word} — ${p.def}`);
    if ((it.spellWords || []).length) return [it.spellWords.slice(0, 6).map(w => w.term || w).join('、')];
    if ((it.sections || []).length) return it.sections.flatMap(sc => (sc.parts || []).map(pt => `${sc.name || ''}｜${pt.title || ''}（${pt.pts} 分）`)).slice(0, 6);
    if (it.passage) return [String(it.passage).slice(0, 120) + '…'];
    if ((it.steps || []).length) return it.steps.slice(0, 3).map(x => x.title || x.text || x.kind).filter(Boolean);
    if ((it.circleQuestions || []).length) return it.circleQuestions.slice(0, 2).map(q => q.sentence).filter(Boolean);
    if ((it.sortWords || []).length) return [it.sortWords.slice(0, 8).map(w => w.word || w.term || w).join('、')];
    return [];
  };
  /* 考卷有自己的校稿檢查（配分對不對、圈幾個、答案在不在詞庫裡）——
     那些比「前兩題長什麼樣」重要得多，要擺在最前面。 */
  var warn = [].concat(...items.map(it => it._warn || []));
  return /*#__PURE__*/React.createElement("div", {
    className: "ask-prev"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ask-prev-h"
  }, "\u51FA\u597D\u4E86\uFF1A", /*#__PURE__*/React.createElement("b", null, items.length), " \u500B\u55AE\u5143"), warn.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ask-prev-warn"
  }, warn.map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, "\u26A0 ", w)), /*#__PURE__*/React.createElement("em", null, "\u5B58\u8D77\u4F86\u4E4B\u5F8C\u5728\u300C\u7DE8\u8F2F\u55AE\u5143\u300D\u88E1\u53EF\u4EE5\u76F4\u63A5\u6539\u3002")), items.map((it, i) => {
    var n = window.getQuizItemTotal ? window.getQuizItemTotal(it) : 0;
    var lines = peek(it);
    return /*#__PURE__*/React.createElement("div", {
      className: "ask-prev-it",
      key: i
    }, /*#__PURE__*/React.createElement("button", {
      className: "ask-prev-t",
      onClick: () => setOpen(o => ({
        ...o,
        [i]: !o[i]
      }))
    }, /*#__PURE__*/React.createElement("i", null, (window.QM_TYPE_ICO || {})[it.type] || '•'), /*#__PURE__*/React.createElement("b", null, it.title), /*#__PURE__*/React.createElement("span", null, n, " \u984C"), /*#__PURE__*/React.createElement("em", null, open[i] ? '⌃' : '⌄')), open[i] && lines.length > 0 && /*#__PURE__*/React.createElement("ul", {
      className: "ask-prev-q"
    }, lines.map((l, k) => /*#__PURE__*/React.createElement("li", {
      key: k
    }, l))));
  }));
}

/* v518（Alan：「他要先回答我檢查沒問題，確定這些題目沒問題，我就會說幫我直接出出來」）：
   確認卡按下去之後**直接在這裡出題**，把題目攤出來給他看，他說「存」才存。
   ⚠ 兩段確認是故意的：第一段確認「要做什麼」，第二段確認「題目對不對」。
     中間真的會花錢跑 AI，但不會動到他的課程——存是最後一步。 */
function AskPanel({
  open,
  categories,
  roster,
  grade,
  onClose,
  onRun,
  onGenerate,
  onSave
}) {
  var [msgs, setMsgs] = useS([]); // { me, text, plan?, images? }
  var [text, setText] = useS('');
  var [imgs, setImgs] = useS([]);
  var [busy, setBusy] = useS(false);
  var [gen, setGen] = useS({}); // i → { busy, label, items, err }
  var fileRef = React.useRef(null);
  var endRef = React.useRef(null);
  useE(() => {
    if (endRef.current) try {
      endRef.current.scrollIntoView({
        block: 'end'
      });
    } catch (e) {}
  }, [msgs, busy]);
  if (!open) return null;
  var addFiles = async files => {
    var list = [...(files || [])].slice(0, 4 - imgs.length);
    if (!list.length) return;
    try {
      var made = await Promise.all(list.map(f => gnFileToImage(f)));
      setImgs(v => v.concat(made));
    } catch (e) {}
  };
  var send = async () => {
    var t = text.trim();
    if (!t && !imgs.length || busy) return;
    var shots = imgs.slice();
    setMsgs(m => m.concat([{
      me: true,
      text: t || '（圖片）',
      images: shots
    }]));
    setText('');
    setImgs([]);
    setBusy(true);
    var plan = await window.aiRouteCommand({
      text: t,
      images: shots.map(i => ({
        media_type: i.media_type,
        data: i.data
      })),
      categories,
      roster,
      history: msgs.slice(-4).map(m => ({
        me: m.me,
        text: m.text
      }))
    });
    setBusy(false);
    /* ⚠ 照片要留給產生器用——文法與考卷是直接拿原圖再讀一次，
       不是靠路由器轉述（轉述會掉細節，而且題目要照原文）。 */
    plan.images = shots;
    /* v547 🔎 查詢是「直接回答」，不是開畫面，也不用確認卡（它什麼都不會動）。
       ⚠ 數字全由程式算（askQueryAnswer 用的是後台總覽同一支 buildWeeklyReport），
         AI 只選 qtype。讀資料要一點時間，先放一則「查詢中」讓他知道有在動。 */
    if (plan.intent === 'query' && window.askQueryAnswer) {
      setMsgs(m => m.concat([{
        me: false,
        text: '好，我查一下…',
        pending: true
      }]));
      var ans;
      try {
        var data = await window.askLoadQueryData();
        ans = window.askQueryAnswer(plan, {
          roster,
          students: data.students,
          gradeData: data.gradeData,
          currentWeekId: window.dashCurrentWeekId
        });
      } catch (e) {
        ans = {
          head: '查詢失敗，等一下再問一次。',
          rows: [],
          foot: ''
        };
      }
      /* ⚠ 他一句話裡常常「查＋做」一起講（「誰沒做完，順便提醒他們」）。
         查的這一半我做得到，做的那一半（提醒）聊天室還不會——
         如果什麼都不說，他會以為已經提醒了（安靜地少做一半是最難發現的）。 */
      if (/提醒|催|通知|傳給|發給/.test(t)) {
        ans.foot = (ans.foot ? ans.foot + '\n' : '') + '你也提到要提醒／通知——這一半我還不會幫你做。後台「作業提醒」可以手動發給沒做完的家長。';
      }
      setMsgs(m => m.filter(x => !x.pending).concat([{
        me: false,
        text: ans.head,
        answer: ans
      }]));
      return;
    }
    setMsgs(m => m.concat([{
      me: false,
      text: plan.intent === 'unknown' ? plan.ask || '我不太確定你要做哪一件事。' : plan.say || '',
      plan
    }]));
  };
  var JOBS = window.ASK_JOBS || {};
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "ask-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ask-head"
  }, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDCAC \u8DDF\u6211\u8AAA\u4E00\u53E5\u8A71"), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ask-body"
  }, !msgs.length && /*#__PURE__*/React.createElement("div", {
    className: "ask-hello"
  }, /*#__PURE__*/React.createElement("p", null, "\u76F4\u63A5\u8AAA\u4F60\u60F3\u505A\u4EC0\u9EBC\uFF0C\u6216\u628A\u55AE\u5B57\u8868\uFF0F\u6587\u7AE0\uFF0F\u4F5C\u696D\u7167\u7247\u4E1F\u9032\u4F86\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "ask-eg"
  }, ['這課單字幫我出一份：pursued 追趕、barbed 有刺的、glanced 瞥了一眼', '這週 Word Study 是 prefixes mis-, en-, & em-', '幫我擬 Eric 今天的上課紀錄', '這週誰還沒做完？', 'Nick 這週做得怎麼樣？', 'Nick 錯最多的是哪些？', '針對 Nick 的弱點出練習', 'Nick 週三的課改成 17:30', /* v531：新接進來的 6 件事也給例句——不然他不會知道現在講得動了 */
  '這篇文章做成分段閱讀（貼上文章）', '出一份外師的考前複習卷', '把 Barbed Wire Baseball 排一份複習到第 9 週', '把 Barbed Wire Baseball 那組沿用到第 10 週', '我要改申論題', '把第 7 週的內容複製到第 9 週', '把 Unit 1 跟 Unit 2 的單字合併再出一份，只要 12 題', 'Barbed Wire Baseball 那組設成下週三到期', '跟 G4 的家長說這週三停課一次', '出一份外師的考卷，題目要包含現在完成式跟比較級'].map((x, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setText(x)
  }, x))), /*#__PURE__*/React.createElement("details", {
    className: "ask-can"
  }, /*#__PURE__*/React.createElement("summary", null, "\u6211\u73FE\u5728\u6703\u505A\u9019 ", Object.keys(JOBS).length, " \u4EF6\u4E8B"), /*#__PURE__*/React.createElement("ul", null, Object.keys(JOBS).map(k => /*#__PURE__*/React.createElement("li", {
    key: k
  }, JOBS[k].ico, " ", JOBS[k].zh))))), msgs.map((m, i) => /*#__PURE__*/React.createElement("div", {
    className: 'ask-row' + (m.me ? ' me' : ''),
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "ask-bub"
  }, m.images && m.images.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ask-thumbs"
  }, m.images.map((im, k) => /*#__PURE__*/React.createElement("img", {
    key: k,
    src: im.preview,
    alt: ""
  }))), /*#__PURE__*/React.createElement("span", null, m.text), m.answer && (m.answer.rows || []).length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "ask-ans"
  }, m.answer.rows.map((r, k) => /*#__PURE__*/React.createElement("li", {
    key: k,
    className: r.tone ? 'tone-' + r.tone : ''
  }, /*#__PURE__*/React.createElement("b", null, r.name), /*#__PURE__*/React.createElement("span", null, r.text)))), m.answer && m.answer.foot && /*#__PURE__*/React.createElement("div", {
    className: "ask-ans-foot"
  }, m.answer.foot), m.plan && m.plan.intent !== 'unknown' && m.plan.intent !== 'query' && (() => {
    var J = JOBS[m.plan.intent] || {};
    return /*#__PURE__*/React.createElement("div", {
      className: "ask-plan"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ask-plan-h"
    }, /*#__PURE__*/React.createElement("i", null, J.ico), /*#__PURE__*/React.createElement("b", null, J.zh)), /*#__PURE__*/React.createElement("ul", null, m.plan.title && /*#__PURE__*/React.createElement("li", null, "\u6A19\u984C\uFF1A", /*#__PURE__*/React.createElement("b", null, m.plan.title)), m.plan.topic && /*#__PURE__*/React.createElement("li", null, "\u4E3B\u984C\uFF1A", /*#__PURE__*/React.createElement("b", null, m.plan.topic)), m.plan.student && /*#__PURE__*/React.createElement("li", null, "\u5B78\u751F\uFF1A", /*#__PURE__*/React.createElement("b", null, m.plan.student)), m.plan.words.length > 0 && /*#__PURE__*/React.createElement("li", null, "\u55AE\u5B57 ", /*#__PURE__*/React.createElement("b", null, m.plan.words.length), " \u500B\uFF1A", m.plan.words.slice(0, 10).map(w => w.term).join('、'), m.plan.words.length > 10 ? '…' : ''), m.plan.text && (m.plan.intent === 'lesson' ? /*#__PURE__*/React.createElement("li", null, "\u9019\u6B21\u4E0A\u4E86\u4EC0\u9EBC\uFF1A", /*#__PURE__*/React.createElement("b", {
      className: "ask-plan-did"
    }, m.plan.text)) : /*#__PURE__*/React.createElement("li", null, "\u6587\u5B57 ", /*#__PURE__*/React.createElement("b", null, m.plan.text.length), " \u5B57"))), (() => {
      var g = gen[i] || {};
      /* v519：五種都能在這裡做完了（剩下兩種住在後台，照樣是開後台指路）。 */
      var canHere = !!onGenerate && ['vocab', 'reading', 'wordstudy', 'grammar', 'exam'].indexOf(m.plan.intent) >= 0;
      if (m.saved) return /*#__PURE__*/React.createElement("div", {
        className: "ask-done"
      }, "\u2705 \u5DF2\u7D93\u5B58\u9032\u672C\u9031\u4E86", m.hw ? `，而且設成作業（${m.hw} 到期）` : '');
      if (m.done) return /*#__PURE__*/React.createElement("div", {
        className: "ask-done"
      }, m.plan.intent === 'lesson' ? '✅ 已經開好那一堂，內容也填進去了——功課與下次進度按 🪄 擬草稿' : '✅ 開好了，接下來照原本的流程走');
      if (g.items) {
        /* 📌 v521：出完順手指派。預設開著（他每次都要設），日期可以直接改。
           ⚠ 他如果說「先不要指派」，路由器會給 due: 'none'，這裡就預設關掉。 */
        var noAssign = m.plan.due === 'none';
        var hw = g.hw !== undefined ? g.hw : noAssign ? '' : window.askDueDate(m.plan.due) || window.askDueDefault();
        return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AskPreview, {
          items: g.items
        }), /*#__PURE__*/React.createElement("div", {
          className: "ask-hw"
        }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
          type: "checkbox",
          checked: !!hw,
          onChange: e => setGen(x => ({
            ...x,
            [i]: {
              ...g,
              hw: e.target.checked ? window.askDueDate(m.plan.due) || window.askDueDefault() : ''
            }
          }))
        }), "\u8A2D\u6210\u9019\u9031\u4F5C\u696D"), hw && /*#__PURE__*/React.createElement("input", {
          type: "date",
          value: hw,
          onChange: e => setGen(x => ({
            ...x,
            [i]: {
              ...g,
              hw: e.target.value
            }
          }))
        }), hw ? /*#__PURE__*/React.createElement("em", null, hw, " \u5230\u671F") : /*#__PURE__*/React.createElement("em", null, "\u53EA\u5EFA\u7ACB\uFF0C\u4E0D\u8A2D\u4F5C\u696D")), /*#__PURE__*/React.createElement("div", {
          className: "ask-plan-btn"
        }, /*#__PURE__*/React.createElement("button", {
          className: "btn primary",
          onClick: () => {
            onSave(g.items, m.plan, hw);
            setMsgs(x => x.map((y, k) => k === i ? {
              ...y,
              saved: true,
              hw
            } : y));
          }
        }, "\u5C31\u9019\u4E9B\uFF0C\u5B58\u9032\u672C\u9031"), /*#__PURE__*/React.createElement("button", {
          className: "btn ghost",
          onClick: () => {
            setGen(x => ({
              ...x,
              [i]: {}
            }));
          }
        }, "\u21BB \u91CD\u51FA\u4E00\u4EFD")));
      }
      if (g.busy) return /*#__PURE__*/React.createElement("div", {
        className: "ask-gen"
      }, "\u23F3 ", g.label || '出題中…');
      return /*#__PURE__*/React.createElement("div", {
        className: "ask-plan-btn"
      }, canHere && /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        onClick: async () => {
          setGen(x => ({
            ...x,
            [i]: {
              busy: true,
              label: '出題中…'
            }
          }));
          try {
            var items = await onGenerate(m.plan, label => setGen(x => ({
              ...x,
              [i]: {
                busy: true,
                label
              }
            })));
            if (!items || !items.length) throw new Error('這次沒有出出任何題目。');
            setGen(x => ({
              ...x,
              [i]: {
                items
              }
            }));
          } catch (e) {
            setGen(x => ({
              ...x,
              [i]: {}
            }));
            setMsgs(y => y.concat([{
              me: false,
              text: '出題失敗：' + (e.message || '再試一次')
            }]));
          }
        }
      }, "\u51FA\u984C\u7D66\u6211\u770B"), /*#__PURE__*/React.createElement("button", {
        className: 'btn ' + (canHere ? 'ghost' : 'primary'),
        onClick: () => {
          setMsgs(x => x.map((y, k) => k === i ? {
            ...y,
            done: true
          } : y));
          onRun(m.plan);
        }
      }, canHere ? '我自己開視窗調' : '就這樣做'), /*#__PURE__*/React.createElement("span", null, canHere ? '出完給你看過，你說存才存' : '它不會自己存，打開之後你還能改'));
    })());
  })()))), busy && /*#__PURE__*/React.createElement("div", {
    className: "ask-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ask-bub"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ask-dots"
  }, "\u5728\u60F3\u2026"))), /*#__PURE__*/React.createElement("div", {
    ref: endRef
  })), /*#__PURE__*/React.createElement("div", {
    className: "ask-foot"
  }, imgs.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ask-thumbs pend"
  }, imgs.map((im, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, /*#__PURE__*/React.createElement("img", {
    src: im.preview,
    alt: ""
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setImgs(v => v.filter((_, k) => k !== i))
  }, "\u2715")))), /*#__PURE__*/React.createElement("div", {
    className: "ask-input"
  }, /*#__PURE__*/React.createElement("button", {
    className: "ask-clip",
    title: "\u52A0\u7167\u7247",
    disabled: imgs.length >= 4,
    onClick: () => fileRef.current && fileRef.current.click()
  }, "\uD83D\uDCCE"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    style: {
      display: 'none'
    },
    onChange: e => {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }), /*#__PURE__*/React.createElement("textarea", {
    rows: 2,
    value: text,
    placeholder: "\u4F8B\u5982\uFF1A\u9019\u8AB2\u55AE\u5B57\u5E6B\u6211\u51FA\u4E00\u4EFD\uFF0C\u7136\u5F8C\u628A\u55AE\u5B57\u8868\u8CBC\u5728\u4E0B\u9762",
    onChange: e => setText(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        send();
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn primary ask-send",
    disabled: busy || !text.trim() && !imgs.length,
    onClick: send
  }, "\u9001\u51FA")))), document.body);
}
function ExamScanModal({
  open,
  categories,
  defaultCat,
  defaultGrade,
  onClose,
  onCreate
}) {
  var [nudgeCls, nudge] = useModalNudge();
  var [imgs, setImgs] = useS([]);
  var [busy, setBusy] = useS(false);
  var [prog, setProg] = useS([0, 0]);
  var [err, setErr] = useS('');
  var [got, setGot] = useS(null); // { item, skipped, missed, warnings }
  var [cat, setCat] = useS(defaultCat || 'reading');
  var fileRef = React.useRef(null);
  useE(() => {
    if (open) {
      setImgs([]);
      setGot(null);
      setErr('');
      setBusy(false);
      setCat(defaultCat || 'reading');
    }
  }, [open]);
  if (!open) return null;
  var addFiles = async files => {
    var list = [...(files || [])].slice(0, 8 - imgs.length);
    if (!list.length) return;
    setErr('');
    try {
      var made = await Promise.all(list.map(f => gnFileToImage(f).then(x => ({
        ...x,
        name: f.name
      }))));
      setImgs(v => v.concat(made));
    } catch (e) {
      setErr('這幾張照片讀不進來，換一張試試。');
    }
  };
  var read = async () => {
    if (!imgs.length) return;
    setBusy(true);
    setErr('');
    setGot(null);
    try {
      var r = await window.aiReadExamSheet({
        images: imgs.map(i => ({
          media_type: i.media_type,
          data: i.data
        })),
        onProgress: (a, b) => setProg([a, b])
      });
      setGot(r);
    } catch (e) {
      setErr(e.message || '讀不懂這幾張照片。');
    }
    setBusy(false);
  };
  var save = () => {
    if (!got) return;
    var T = window.examTotals(got.item);
    if (!T.parts) {
      setErr('沒有讀到任何大題。');
      return;
    }
    onCreate({
      ...got.item,
      id: 'ex' + Date.now().toString(36),
      _cat: cat
    });
  };
  var T = got ? window.examTotals(got.item) : null;
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: e => {
      if (e.target === e.currentTarget) nudge();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: 'modal wide ' + nudgeCls,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\uD83D\uDCF8 \u62CD\u8003\u5377 ", /*#__PURE__*/React.createElement("em", null, "\u2192 \u4E92\u52D5\u7248")), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u8003\u5377\u7167\u7247\uFF08\u4E00\u9801\u4E00\u5F35\uFF0C\u6700\u591A 8 \u5F35\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "exs-shots"
  }, imgs.map((im, i) => /*#__PURE__*/React.createElement("div", {
    className: "exs-shot",
    key: i
  }, /*#__PURE__*/React.createElement("img", {
    src: im.preview,
    alt: ""
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setImgs(v => v.filter((_, k) => k !== i))
  }, "\u2715"))), imgs.length < 8 && /*#__PURE__*/React.createElement("button", {
    className: "exs-add",
    onClick: () => fileRef.current && fileRef.current.click()
  }, "\uFF0B", /*#__PURE__*/React.createElement("span", null, "\u52A0\u7167\u7247"))), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    style: {
      display: 'none'
    },
    onChange: e => {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help"
  }, "\u6574\u9801\u90FD\u8981\u5165\u93E1\u3001\u62CD\u6B63\u4E00\u9EDE\u3002", /*#__PURE__*/React.createElement("b", null, "\u5B78\u751F\u5BEB\u7684\u7B54\u6848\u8207\u8001\u5E2B\u7684\u7D05\u7B46\u4E0D\u6703\u88AB\u8B80\u9032\u53BB"), "\u2014\u2014 \u5B83\u8B80\u7684\u662F\u5370\u5237\u7684\u984C\u76EE\uFF0C\u59D3\u540D\u8207\u5206\u6578\u4E5F\u4E0D\u6703\u5B58\u3002")), err && /*#__PURE__*/React.createElement("div", {
    className: "exs-err"
  }, "\u26A0 ", err), !got && /*#__PURE__*/React.createElement("button", {
    className: "btn primary exs-go",
    disabled: !imgs.length || busy,
    onClick: read
  }, busy ? `讀取中… ${prog[0]}/${prog[1]} 張` : imgs.length ? `讀這 ${imgs.length} 張` : '先加幾張照片'), got && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "exs-sum"
  }, /*#__PURE__*/React.createElement("b", null, got.item.title), /*#__PURE__*/React.createElement("span", {
    className: T.total === 100 ? 'ok' : ''
  }, T.sections, " \u5340 \xB7 ", T.parts, " \u5927\u984C \xB7 \u5408\u8A08 ", T.total, " \u5206\uFF08\u81EA\u52D5 ", T.auto, "\uFF0F\u8001\u5E2B\u6539 ", T.manual, "\uFF09")), got.missed.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "exs-warn"
  }, "\uD83D\uDCC4 \u9019\u5E7E\u5F35\u6C92\u8B80\u51FA\u6771\u897F\uFF1A", got.missed.join('、'), "\u2014\u2014\u53EF\u4EE5\u55AE\u7368\u518D\u62CD\u4E00\u6B21\u88DC\u4E0A\u3002"), got.skipped.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "exs-warn skip"
  }, "\u23ED \u9019\u5E7E\u5927\u984C\u7DB2\u7AD9\u9084\u505A\u4E0D\u51FA\u4F86\uFF0C\u5148\u8DF3\u904E\u4E86\uFF1A", /*#__PURE__*/React.createElement("ul", null, got.skipped.map((x, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, x)))), got.warnings.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "exs-warn bad"
  }, got.warnings.map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, "\u26A0 ", w)), /*#__PURE__*/React.createElement("em", null, "\u5B58\u8D77\u4F86\u4E4B\u5F8C\u5728\u300C\u7DE8\u8F2F\u55AE\u5143\u300D\u88E1\u53EF\u4EE5\u76F4\u63A5\u6539\u3002")), (got.item.sections || []).map((sc, si) => /*#__PURE__*/React.createElement("div", {
    className: "exs-sec",
    key: si
  }, /*#__PURE__*/React.createElement("div", {
    className: "exs-sec-h"
  }, /*#__PURE__*/React.createElement("b", null, sc.name || `Section ${si + 1}`), sc.pct ? /*#__PURE__*/React.createElement("span", null, "(", sc.pct, "%)") : null), (sc.parts || []).map((pt, pi) => /*#__PURE__*/React.createElement("div", {
    className: "exs-part",
    key: pi
  }, /*#__PURE__*/React.createElement("div", {
    className: "exs-part-h"
  }, /*#__PURE__*/React.createElement("i", null, (window.EXAM_KINDS[pt.kind] || {}).zh), /*#__PURE__*/React.createElement("b", null, pt.title || '（沒讀到標題）'), /*#__PURE__*/React.createElement("span", null, pt.pts, " \u5206 \xB7 ", window.examPartN(pt), " \u984C")), /*#__PURE__*/React.createElement("pre", {
    className: "exs-pre"
  }, window.examPartText(pt)))))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u653E\u5230\u54EA\u4E00\u985E"), /*#__PURE__*/React.createElement("select", {
    value: cat,
    onChange: e => setCat(e.target.value)
  }, (categories || []).map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.titleZh || c.title)))), /*#__PURE__*/React.createElement("div", {
    className: "exs-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => {
      setGot(null);
      setErr('');
    }
  }, "\u21A9 \u91CD\u8B80"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: save
  }, "\u5B58\u6210\u4E00\u4EFD\u8003\u5377")))))), document.body);
}
function GrammarNotesModal({
  open,
  categories,
  defaultCat,
  defaultGrade,
  perStudent,
  roster,
  defaultTitle,
  defaultText,
  onClose,
  onCreate
}) {
  var [nudgeCls, nudge] = useModalNudge(); // v461：點背景不關閉，只晃一下
  var [title, setTitle] = useS('');
  var [text, setText] = useS('');
  var [imgs, setImgs] = useS([]); // [{ media_type, data, preview, name }]
  var [cat, setCat] = useS(defaultCat || 'grammar');
  var [grade, setGrade] = useS(defaultGrade || 'g4');
  var [nMcq, setNMcq] = useS(8);
  var [nFill, setNFill] = useS(8);
  /* v542：一個練習最多幾題（跟一鍵出單字同一個預設值、同一條切法） */
  var [gnMaxQ, setGnMaxQ] = useS(window.QS_MAX_Q || 10);
  var [nTr, setNTr] = useS(5);
  var [nRw, setNRw] = useS(5); // v429：改寫句子（例：把大小寫改對）
  var [nCircle, setNCircle] = useS(6); // v444：找出來（在句子裡圈出名詞／動詞）
  var [nSort, setNSort] = useS(8); // v444：分一分（把字分到 2-4 個籃子）
  // v461（Alan：「有時候我想出兩組三組」）：找出來／分一分各自可以出 1~3 組，每組一個單元
  var [cSets, setCSets] = useS(1);
  var [sSets, setSSets] = useS(1);
  // v462：Alan 挑的四個新題型
  var [nWrite, setNWrite] = useS(0); // ③ 造句（AI 批改）
  var [nTf, setNTf] = useS(0); // ② 句型轉換
  var [nOrd, setNOrd] = useS(0); // ① 排順序
  // v467 康橋的兩種招牌題型（2026-10-06 Alan 給了 G3/G4 真實考卷）
  var [nEdit, setNEdit] = useS(0); // 整段改錯：段落裡種幾個錯
  var [nDiag, setNDiag] = useS(0); // 先判斷錯誤類型再改正：幾題
  var [plan, setPlan] = useS(null); // ⑦ AI 判斷出來的「這是哪一類文法」
  var [planBusy, setPlanBusy] = useS(false);
  var [aiNote, setAiNote] = useS(''); // v445：這次的特別要求（直接寫給 AI）
  var [lsBusy, setLsBusy] = useS(false); // v429：校稿頁單獨重出互動教學
  /* v442：互動教學的「AI 自動配圖」——只補還沒有圖的 learn 步驟 */
  var [lsImg, setLsImg] = useS(false);
  var autoLessonImages = async () => {
    if (!window.autoFindImage || !res || !res.lesson) return;
    setLsImg(true);
    var arr = (res.lesson.steps || []).slice();
    var got = 0;
    for (var i = 0; i < arr.length; i++) {
      var st = arr[i];
      if (!st || st.kind !== 'learn' || st.img) continue;
      try {
        var url = await window.autoFindImage(st.imgHint || st.examples && st.examples[0] && st.examples[0].en || '');
        if (url) {
          arr[i] = {
            ...st,
            img: url
          };
          got++;
        }
      } catch (e) {/* 這一步找不到就跳過 */}
    }
    setRes(r => ({
      ...r,
      lesson: {
        ...r.lesson,
        steps: arr
      }
    }));
    setLsImg(false);
    if (!got) setErr('圖庫這次沒找到合適的圖——可以改一下「建議的情境圖」關鍵字，或自己上傳。');
  };
  var runRef = React.useRef(0); // v429：失敗之後，還在跑的請求不准再把「處理中…」叫回來
  var [busy, setBusy] = useS(null); // { done, total, label }
  var [err, setErr] = useS('');
  var [res, setRes] = useS(null); // { sheet, lesson, mcq, fill, tr }
  var [tab, setTab] = useS('lesson');
  var [assign, setAssign] = useS(true);
  var [due, setDue] = useS('');
  var [who, setWho] = useS([]);
  var fileRef = React.useRef(null);
  useE(() => {
    if (!open) return;
    setTitle(defaultTitle || '');
    setText(defaultText || ''); /* v474：原本的教學重點先填好 */
    setImgs([]);
    setCat(defaultCat || 'grammar');
    setGrade(defaultGrade || 'g4'); // v454
    setNMcq(8);
    setNFill(8);
    setNTr(5);
    setNRw(5);
    setBusy(null);
    setErr('');
    setRes(null);
    setTab('lesson');
    setLsBusy(false);
    runRef.current++;
    setAssign(true);
    setWho([]);
    var d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    setDue(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }, [open]);
  if (!open) return null;
  var addFiles = async files => {
    setErr('');
    var list = Array.from(files || []).filter(f => /^image\//.test(f.type)).slice(0, 6 - imgs.length);
    if (!list.length) {
      if ((files || []).length) setErr('只收照片（JPG／PNG）。PDF 請先截圖。');
      return;
    }
    try {
      var out = [];
      for (var f of list) out.push(Object.assign(await gnFileToImage(f), {
        name: f.name
      }));
      setImgs(v => v.concat(out).slice(0, 6));
    } catch (e) {
      setErr('有照片讀不出來，請換一張試試。');
    }
  };
  var ready = (imgs.length > 0 || text.trim().length >= 20) && nMcq + nFill + nTr + nRw + nCircle + nSort > 0;
  var run = async () => {
    var id = ++runRef.current;
    var live = () => runRef.current === id;
    setErr('');
    setBusy({
      done: 0,
      total: 6,
      label: imgs.length ? '讀作業照片中（約 10 秒）' : '讀文字中'
    });
    try {
      // v430：照片／長文字拆成好幾段同時讀——進度條顯示讀到第幾段
      var sheet = await window.aiReadGrammarSheet({
        images: imgs.map(i => ({
          media_type: i.media_type,
          data: i.data
        })),
        text,
        onProgress: (d, t) => {
          if (live() && t > 1) setBusy({
            done: d / t,
            total: 6,
            label: `讀作業中（${d}/${t} 段，約 10 秒）`
          });
        }
      });
      if (!live()) return;
      if (!sheet.notes && !sheet.questions.length) throw new Error('照片裡讀不到教學重點或題目，請換清楚一點的照片，或直接貼文字。');
      setBusy({
        done: 1,
        total: 6,
        label: `讀到了：${sheet.topic || '文法'}${(sheet.sections || []).length > 1 ? `（${sheet.sections.length} 段、${sheet.questions.length} 題）` : ''}，開始出題`
      });
      var pack = await window.aiMakeGrammarPack({
        topic: sheet.topic || title,
        topicZh: sheet.topicZh,
        notes: sheet.notes || text,
        teacherQs: sheet.questions,
        grade,
        nMcq,
        nFill,
        nTr,
        nRw,
        nCircle,
        nSort,
        nCircleSets: cSets,
        nSortSets: sSets,
        nWrite,
        nTf,
        nOrd,
        // v462
        nEdit,
        nDiag,
        // v467 康橋
        caseMatters: !!sheet.caseMatters,
        teacherNote: aiNote,
        onProgress: (d, t, label) => {
          if (live()) setBusy({
            done: 1 + d,
            total: 1 + t,
            label
          });
        }
      });
      if (!live()) return;
      if (!title.trim()) setTitle(sheet.topicZh ? `${sheet.topic}（${sheet.topicZh}）` : sheet.topic || '文法練習');
      // 一律先開「互動教學」分頁——沒產生成功時，老師第一眼就看到提示和「🔄 重新產生」按鈕
      setRes({
        sheet,
        ...pack
      });
      setTab('lesson');
      // 有一部分沒出成功：其他的照樣可以用，那一部分在校稿頁可以單獨重出
      var warn = [];
      if (sheet.missed && sheet.missed.length) warn.push(`${sheet.missed.join('、')}沒有讀到（其他都讀好了），要的話可以換一張清楚的照片再出一次。`);
      if (pack.errors && pack.errors.length) warn.push(`「${pack.errors.join('、')}」這次沒有產生成功——其他的都好了，可以在校稿頁按「🔄 重新產生」。`);
      if (warn.length) setErr(warn.join(' '));
    } catch (e) {
      if (live()) setErr(e && e.message || 'AI 出題失敗，請再試一次。');
    }
    if (live()) setBusy(null);
  };
  var redoLesson = async () => {
    setLsBusy(true);
    setErr('');
    try {
      var lesson = await window.aiMakeGrammarLesson({
        topic: res.sheet.topic || title,
        topicZh: res.sheet.topicZh,
        notes: res.sheet.notes || text,
        grade,
        caseMatters: !!res.caseMatters,
        teacherNote: aiNote
      });
      setRes(r => ({
        ...r,
        lesson,
        errors: (r.errors || []).filter(x => x !== '互動教學')
      }));
    } catch (e) {
      setErr('互動教學還是沒有產生成功，請再按一次；或先建立練習（練習就不會上鎖）。');
    }
    setLsBusy(false);
  };

  // ── 校稿用的更新函式 ──
  var updStep = (i, patch) => setRes(r => ({
    ...r,
    lesson: {
      ...r.lesson,
      steps: r.lesson.steps.map((s, j) => j === i ? {
        ...s,
        ...patch
      } : s)
    }
  }));
  var delStep = i => setRes(r => ({
    ...r,
    lesson: {
      ...r.lesson,
      steps: r.lesson.steps.filter((_, j) => j !== i)
    }
  }));
  var upd = (key, i, patch) => setRes(r => ({
    ...r,
    [key]: r[key].map((x, j) => j === i ? {
      ...x,
      ...patch
    } : x)
  }));
  var del = (key, i) => setRes(r => ({
    ...r,
    [key]: r[key].filter((_, j) => j !== i)
  }));
  var csv = a => (a || []).join(' / ');
  var uncsv = t => String(t || '').split('/').map(x => x.trim()).filter(Boolean);
  var assignBox = () => /*#__PURE__*/React.createElement("div", {
    className: 'qs-assign' + (assign ? ' on' : '')
  }, /*#__PURE__*/React.createElement("label", {
    className: "qs-assign-head"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: assign,
    onChange: e => setAssign(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, "\u5EFA\u7ACB\u5F8C", /*#__PURE__*/React.createElement("b", null, "\u6574\u7D44\u76F4\u63A5\u6307\u6D3E"), "\uFF08\u6559\u5B78\uFF0B\u4E09\u4EFD\u7DF4\u7FD2\u4E00\u6B21\u6D3E\u51FA\u53BB\uFF09")), assign && (perStudent ? /*#__PURE__*/React.createElement("div", {
    className: "qs-who"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qs-who-bar"
  }, /*#__PURE__*/React.createElement("span", null, "\u6307\u6D3E\u7D66\uFF08", who.length, "/", (roster || []).length, "\uFF09"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setWho((roster || []).map(r => r.email))
  }, "\u5168\u9078"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setWho([])
  }, "\u5168\u4E0D\u9078")), /*#__PURE__*/React.createElement("div", {
    className: "qs-who-list"
  }, (roster || []).map(r => /*#__PURE__*/React.createElement("label", {
    key: r.email,
    className: 'qs-who-item' + (who.indexOf(r.email) >= 0 ? ' on' : '')
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: who.indexOf(r.email) >= 0,
    onChange: e => setWho(w => e.target.checked ? w.concat(r.email) : w.filter(x => x !== r.email))
  }), r.name || r.email)))) : /*#__PURE__*/React.createElement("div", {
    className: "qs-due"
  }, /*#__PURE__*/React.createElement("label", null, "\u622A\u6B62\u65E5"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: due,
    onChange: e => setDue(e.target.value)
  }), /*#__PURE__*/React.createElement("span", {
    className: "qs-due-n"
  }, "\u6574\u7D44\u6703\u51FA\u73FE\u5728\u5B78\u751F\u7684\u300C\u4ECA\u5929\u7684\u4EFB\u52D9\u300D"))));

  // ───────────────────────── 設定畫面 ─────────────────────────
  if (!res) {
    return /*#__PURE__*/React.createElement("div", {
      className: "modal-backdrop",
      onClick: nudge
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal wide" + nudgeCls,
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal-head"
    }, /*#__PURE__*/React.createElement("h3", null, "\u270F\uFE0F \u51FA\u6587\u6CD5 ", /*#__PURE__*/React.createElement("em", null, "\u4E0A\u50B3\u8001\u5E2B\u7684\u4F5C\u696D\uFF0C\u4E00\u6B21\u505A\u597D\u300C\u4E92\u52D5\u6559\u5B78\uFF0B\u9078\u64C7\uFF0B\u586B\u7A7A\uFF0B\u4E2D\u7FFB\u82F1\u300D")), /*#__PURE__*/React.createElement("button", {
      className: "modal-close",
      "aria-label": "\u95DC\u9589",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "close",
      size: 14
    }))), /*#__PURE__*/React.createElement("div", {
      className: "modal-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u8001\u5E2B\u7684\u4F5C\u696D\uFF08\u6559\u5B78 notes\uFF0B\u984C\u76EE\uFF09"), /*#__PURE__*/React.createElement("div", {
      className: 'gn-drop' + (imgs.length ? ' has' : ''),
      onDragOver: e => e.preventDefault(),
      onDrop: e => {
        e.preventDefault();
        addFiles(e.dataTransfer.files);
      },
      onClick: () => fileRef.current && fileRef.current.click()
    }, /*#__PURE__*/React.createElement("input", {
      ref: fileRef,
      type: "file",
      accept: "image/*",
      multiple: true,
      hidden: true,
      onChange: e => {
        addFiles(e.target.files);
        e.target.value = '';
      }
    }), imgs.length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "gn-drop-empty"
    }, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDCF7 \u9EDE\u9019\u88E1\u9078\u7167\u7247"), "\uFF0C\u6216\u628A\u7167\u7247\u62D6\u9032\u4F86\uFF08\u6700\u591A 6 \u5F35\uFF09") : /*#__PURE__*/React.createElement("div", {
      className: "gn-thumbs",
      onClick: e => e.stopPropagation()
    }, imgs.map((im, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "gn-thumb"
    }, /*#__PURE__*/React.createElement("img", {
      src: im.preview,
      alt: im.name || ''
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": "\u79FB\u9664",
      onClick: () => setImgs(v => v.filter((_, j) => j !== i))
    }, "\xD7"))), imgs.length < 6 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "gn-thumb-add",
      onClick: () => fileRef.current && fileRef.current.click()
    }, "\uFF0B"))), /*#__PURE__*/React.createElement("textarea", {
      className: "gr-passage",
      rows: 4,
      placeholder: "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u8CBC\u6587\u5B57\uFF08\u6559\u5B78\u91CD\u9EDE\u3001\u984C\u76EE\u90FD\u53EF\u4EE5\uFF1B\u8DDF\u7167\u7247\u4E00\u8D77\u7528\u4E5F\u884C\uFF09",
      value: text,
      onChange: e => setText(e.target.value),
      style: {
        marginTop: 8
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "gr-num-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u55AE\u5143\u540D\u7A31\uFF08\u7559\u7A7A\uFF1D\u7528 AI \u8B80\u5230\u7684\u6587\u6CD5\u540D\u7A31\uFF09"), /*#__PURE__*/React.createElement("input", {
      value: title,
      onChange: e => setTitle(e.target.value),
      placeholder: "\u4F8B\uFF1AThere is / There are"
    })), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u5E74\u7D1A"), /*#__PURE__*/React.createElement("select", {
      value: grade,
      onChange: e => setGrade(e.target.value)
    }, ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map(g => /*#__PURE__*/React.createElement("option", {
      key: g,
      value: g
    }, g.toUpperCase())))), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u653E\u5728\u54EA\u500B\u5206\u985E"), /*#__PURE__*/React.createElement("select", {
      value: cat,
      onChange: e => setCat(e.target.value)
    }, (categories || []).map(c => /*#__PURE__*/React.createElement("option", {
      key: c.id,
      value: c.id
    }, c.titleZh || c.title || c.id))))), /*#__PURE__*/React.createElement("div", {
      className: "gn-plan"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "btn ghost gn-plan-btn",
      disabled: planBusy || !(title.trim() || text.trim()),
      onClick: async () => {
        setPlanBusy(true);
        try {
          var pl = await window.aiPlanGrammarKinds({
            topic: title.trim(),
            topicZh: '',
            notes: text.trim(),
            grade
          });
          setPlan(pl);
          setNMcq(pl.nMcq);
          setNFill(pl.nFill);
          setNTr(pl.nTr);
          setNRw(pl.nRw);
          setNCircle(pl.nCircle);
          setNSort(pl.nSort);
          setCSets(pl.nCircleSets);
          setSSets(pl.nSortSets);
          setNWrite(pl.nWrite);
          setNTf(pl.nTf);
          setNOrd(pl.nOrd);
        } catch (e) {
          setPlan({
            why: '判斷失敗，題數維持原來的。',
            zh: '',
            guessed: true
          });
        }
        setPlanBusy(false);
      }
    }, planBusy ? '判斷中…' : '🤖 這一課該出哪些題型？幫我決定'), !(title.trim() || text.trim()) && !plan && /*#__PURE__*/React.createElement("div", {
      className: "gn-plan-say guessed"
    }, "\u5148\u6253\u4E0A\u9762\u7684\u300C\u55AE\u5143\u540D\u7A31\u300D\u6216\u8CBC\u4E0A\u6559\u5B78\u91CD\u9EDE\uFF0C\u6211\u624D\u77E5\u9053\u9019\u4E00\u8AB2\u5728\u6559\u4EC0\u9EBC\u3002"), plan && /*#__PURE__*/React.createElement("div", {
      className: 'gn-plan-say' + (plan.guessed ? ' guessed' : '')
    }, plan.zh && /*#__PURE__*/React.createElement("b", null, plan.zh), " ", plan.why, plan.findWhat && /*#__PURE__*/React.createElement(React.Fragment, null, "\u3000", /*#__PURE__*/React.createElement("span", null, "\u627E\u51FA\u4F86\u6703\u627E\uFF1A", /*#__PURE__*/React.createElement("b", null, plan.findWhat))), plan.sortBy && /*#__PURE__*/React.createElement(React.Fragment, null, "\u3000", /*#__PURE__*/React.createElement("span", null, "\u5206\u4E00\u5206\u7684\u7C43\u5B50\uFF1A", /*#__PURE__*/React.createElement("b", null, plan.sortBy))), /*#__PURE__*/React.createElement("span", {
      className: "gn-plan-note"
    }, "\u4E0B\u9762\u7684\u984C\u6578\u5DF2\u7D93\u5E6B\u4F60\u586B\u597D\u4E86\uFF0C\u4E0D\u6EFF\u610F\u76F4\u63A5\u6539\u3002"))), /*#__PURE__*/React.createElement("div", {
      className: "gr-num-row"
    }, [['👉 找出來', nCircle, setNCircle, 12], ['🗂 分一分', nSort, setNSort, 12], ['📝 選擇題', nMcq, setNMcq, 15], ['✏️ 填空題', nFill, setNFill, 15], ['✍️ 改寫句子', nRw, setNRw, 10], ['🔤 中翻英', nTr, setNTr, 10], ['🧩 排順序', nOrd, setNOrd, 10], ['🔄 句型轉換', nTf, setNTf, 10], ['✍ 造句', nWrite, setNWrite, 8], ['📝 整段改錯', nEdit, setNEdit, 8], ['🔎 錯在哪裡', nDiag, setNDiag, 8]].map(([lb, v, set, max]) => /*#__PURE__*/React.createElement("div", {
      className: "field",
      key: lb
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, lb), /*#__PURE__*/React.createElement("select", {
      value: v,
      onChange: e => set(+e.target.value)
    }, Array.from({
      length: max + 1
    }, (_, n) => /*#__PURE__*/React.createElement("option", {
      key: n,
      value: n
    }, n ? n + ' 題' : '不要')))))), (nCircle > 0 || nSort > 0) && /*#__PURE__*/React.createElement("div", {
      className: "gn-count-grid"
    }, nCircle > 0 && /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\uD83D\uDC49 \u627E\u51FA\u4F86 \xB7 \u51FA\u5E7E\u7D44"), /*#__PURE__*/React.createElement("select", {
      value: cSets,
      onChange: e => setCSets(+e.target.value)
    }, [1, 2, 3].map(n => /*#__PURE__*/React.createElement("option", {
      key: n,
      value: n
    }, n, " \u7D44", n > 1 ? `（共 ${n * nCircle} 題）` : '')))), nSort > 0 && /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\uD83D\uDDC2 \u5206\u4E00\u5206 \xB7 \u51FA\u5E7E\u7D44"), /*#__PURE__*/React.createElement("select", {
      value: sSets,
      onChange: e => setSSets(+e.target.value)
    }, [1, 2, 3].map(n => /*#__PURE__*/React.createElement("option", {
      key: n,
      value: n
    }, n, " \u7D44", n > 1 ? `（共 ${n * nSort} 個字）` : ''))))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u6703\u5EFA\u7ACB\uFF1A", /*#__PURE__*/React.createElement("b", null, "\uD83D\uDCD8 \u4E92\u52D5\u6559\u5B78"), "\uFF08\u4E00\u6B65\u4E00\u500B\u5C0F\u91CD\u9EDE\uFF0C\u6BCF\u6B65\u90FD\u8981\u5B78\u751F\u52D5\u624B\uFF1A\u9078\u4E00\u9078\u3001\u627E\u51FA\u4F86\u3001\u5206\u4E00\u5206\u3001\u627E\u932F\u5B57\uFF09\u2192 \u5B78\u5B8C\u624D\u89E3\u9396", /*#__PURE__*/React.createElement("b", null, " \uD83D\uDC49 \u627E\u51FA\u4F86 \u2192 \uD83D\uDDC2 \u5206\u4E00\u5206 \u2192 \uD83D\uDCDD \u9078\u64C7 \u2192 \u270F\uFE0F \u586B\u7A7A \u2192 \u270D\uFE0F \u6539\u5BEB\u53E5\u5B50 \u2192 \uD83D\uDD24 \u4E2D\u7FFB\u82F1"), "\uFF08\u4E0D\u8981\u7684\u9078\u300C\u4E0D\u8981\u300D\uFF09\u3002", /*#__PURE__*/React.createElement("b", null, "\u627E\u51FA\u4F86"), "\uFF1D\u5728\u53E5\u5B50\u88E1\u5708\u51FA\u540D\u8A5E\uFF0F\u52D5\u8A5E\uFF08\u6703\u518D\u7528\u53E6\u4E00\u500B AI \u6AA2\u67E5\u300C\u53EA\u6709\u4E00\u500B\u7B54\u6848\u300D\uFF09\uFF1B", /*#__PURE__*/React.createElement("b", null, "\u5206\u4E00\u5206"), "\uFF1D\u628A\u5B57\u5206\u5230 2\u20134 \u500B\u7C43\u5B50\u3002 \u8001\u5E2B\u4F5C\u696D\u4E0A\u539F\u672C\u7684\u984C\u76EE\u6703\u512A\u5148\u6536\u9032\u53BB\uFF0C\u4E0D\u5920\u7684 AI \u518D\u4F9D\u6559\u5B78\u91CD\u9EDE\u88DC\u3002\u51FA\u5B8C\u5148\u6821\u7A3F\uFF0C\u78BA\u8A8D\u4E86\u624D\u5BEB\u9032\u984C\u5EAB\u3002"), /*#__PURE__*/React.createElement(AiNoteBox, {
      value: aiNote,
      onChange: setAiNote,
      examples: "\u9019\u4E00\u8AB2\u53EA\u8981\u5148\u8B1B\u89E3\uFF0C\u518D\u51FA\u5206\u985E\u548C\u5F9E\u53E5\u5B50\u627E\u51FA\u4F86\u7684\u7DF4\u7FD2\uFF5C\u8B1B\u89E3\u53EA\u8981 2 \u9801\uFF0C\u5176\u4ED6\u76F4\u63A5\u7DF4\u7FD2\uFF5C\u984C\u76EE\u90FD\u7528\u73ED\u4E0A\u540C\u5B78\u7684\u540D\u5B57\uFF5C\u4E0D\u8981\u8003\u4E0D\u53EF\u6578\u540D\u8A5E"
    }), assignBox(), err && /*#__PURE__*/React.createElement("div", {
      className: "notify-msg err",
      style: {
        marginTop: 10
      }
    }, "\u26A0\uFE0F ", err), busy && /*#__PURE__*/React.createElement("div", {
      className: "gr-busy"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gr-busy-bar"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: busy.done / busy.total * 100 + '%'
      }
    })), /*#__PURE__*/React.createElement("span", null, busy.label, "\u2026 ", Math.floor(busy.done), "/", busy.total))), /*#__PURE__*/React.createElement("div", {
      className: "modal-foot"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: onClose
    }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      disabled: !ready || !!busy,
      onClick: run
    }, busy ? '處理中…' : '✨ 讀作業並出題 →'))));
  }

  // ───────────────────────── 校稿畫面 ─────────────────────────
  var steps = res.lesson && res.lesson.steps || [];
  /* v461：找出來／分一分可能有 2~3 組。校稿畫面在同一個分頁裡加「第幾組」的切換，
     編輯的永遠是「現在選到的那一組」。第 0 組同時要寫回 res.circle／res.sort，
     舊的呼叫端（gnValidCircle 的提示、unitsN 計數）才不會失準。 */
  var ciSets = res.circleSets && res.circleSets.length ? res.circleSets : (res.circle || []).length ? [res.circle] : [];
  var soSets = res.sortSets && res.sortSets.length ? res.sortSets : res.sort ? [res.sort] : [];
  var [ciIx, setCiIx] = useS(0);
  var [soIx, setSoIx] = useS(0);
  var ciCur = ciSets[Math.min(ciIx, Math.max(0, ciSets.length - 1))] || [];
  var soCur = soSets[Math.min(soIx, Math.max(0, soSets.length - 1))] || null;
  // 改「第 k 組」：同步更新 circleSets[k]，k===0 時連 res.circle 一起更新
  var putCircleSet = (k, arr) => setRes(r => {
    var sets = r.circleSets && r.circleSets.length ? r.circleSets.slice() : [r.circle || []];
    sets[k] = arr;
    return {
      ...r,
      circleSets: sets,
      circle: k === 0 ? arr : r.circle || []
    };
  });
  var putSortSet = (k, obj) => setRes(r => {
    var sets = r.sortSets && r.sortSets.length ? r.sortSets.slice() : r.sort ? [r.sort] : [];
    sets[k] = obj;
    return {
      ...r,
      sortSets: sets,
      sort: k === 0 ? obj : r.sort
    };
  });
  var SetTabs = ({
    n,
    ix,
    set,
    zh
  }) => n <= 1 ? null : /*#__PURE__*/React.createElement("div", {
    className: "gn-setpick"
  }, /*#__PURE__*/React.createElement("span", null, zh, "\u5171 ", n, " \u7D44\uFF1A"), Array.from({
    length: n
  }, (_, k) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: k,
    className: 'gn-setpick-b' + (k === ix ? ' on' : ''),
    onClick: () => set(k)
  }, "\u7B2C ", k + 1, " \u7D44")));
  var sortSet = soCur && (soCur.words || []).length >= 4 ? soCur : null;
  var TABS = [['lesson', `📘 互動教學`, steps.length], ['circle', '👉 找出來', ciSets.reduce((a, x) => a + (x || []).length, 0)], ['sort', '🗂 分一分', soSets.reduce((a, x) => a + (x && x.words || []).length, 0)], ['mcq', '📝 選擇題', res.mcq.length], ['fill', '✏️ 填空題', res.fill.length], ['rw', '✍️ 改寫句子', (res.rw || []).length], ['tr', '🔤 中翻英', res.tr.length], ['ord', '🧩 排順序', (res.ord || []).length], ['tf', '🔄 句型轉換', (res.tf || []).length], ['write', '✍ 造句', (res.write || []).length], ['edit', '📝 整段改錯', res.edit ? (res.edit.errors || []).length : 0], ['diag', '🔎 錯在哪裡', (res.diag || []).length]].filter(t => t[0] === 'lesson' || t[2] > 0);
  // v461：每一組找出來／分一分各自是一個單元
  var unitsN = (steps.length ? 1 : 0) + soSets.filter(x => x && (x.words || []).length >= 4).length + ciSets.filter(x => (x || []).length).length + ['mcq', 'fill', 'rw', 'tr', 'ord', 'tf', 'write'].filter(k => (res[k] || []).length).length + (res.edit && (res.edit.errors || []).length >= 2 ? 2 : 0) // v467：找出錯誤＋改成正確的
  + ((res.diag || []).length ? 2 : 0); //      錯在哪裡＋改成正確的句子
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: nudge
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal wide" + nudgeCls,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\u6821\u7A3F \xB7 ", /*#__PURE__*/React.createElement("em", null, title || res.sheet.topic)), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-tabs"
  }, TABS.map(([k, name, n]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: tab === k ? 'active' : '',
    onClick: () => setTab(k)
  }, name, /*#__PURE__*/React.createElement("em", null, n)))), err && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg err",
    style: {
      marginBottom: 10
    }
  }, "\u26A0\uFE0F ", err), tab === 'lesson' && !steps.length && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gn-ls-miss"
  }, /*#__PURE__*/React.createElement("b", null, "\u26A0\uFE0F \u4E92\u52D5\u6559\u5B78\u9019\u6B21\u6C92\u6709\u7522\u751F\u6210\u529F"), /*#__PURE__*/React.createElement("span", null, "\u984C\u76EE\u90FD\u5DF2\u7D93\u51FA\u597D\u4E86\u3002\u6309\u4E0B\u9762\u91CD\u65B0\u7522\u751F\u4E00\u6B21\uFF08\u901A\u5E38\u7B2C\u4E8C\u6B21\u5C31\u6703\u6210\u529F\uFF09\uFF1B\u6C92\u6709\u4E92\u52D5\u6559\u5B78\u7684\u8A71\uFF0C\u7DF4\u7FD2\u5C31\u4E0D\u6703\u4E0A\u9396\u3002"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: lsBusy,
    onClick: redoLesson
  }, lsBusy ? '產生中…' : '🔄 重新產生互動教學'))), tab === 'lesson' && steps.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      marginBottom: 6,
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost",
    disabled: lsImg,
    onClick: autoLessonImages
  }, lsImg ? '找圖中…' : '🖼️ AI 自動配圖'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost",
    disabled: lsBusy,
    onClick: redoLesson
  }, lsBusy ? '產生中…' : '🔄 整份重新產生')), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u958B\u982D\u4E00\u53E5\u8A71"), /*#__PURE__*/React.createElement("input", {
    value: res.lesson.lead,
    onChange: e => setRes(r => ({
      ...r,
      lesson: {
        ...r.lesson,
        lead: e.target.value
      }
    }))
  })), steps.map((st, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'gn-step k-' + st.kind
  }, /*#__PURE__*/React.createElement("div", {
    className: "gn-step-head"
  }, /*#__PURE__*/React.createElement("b", null, i + 1, ". ", GN_KIND_ZH[st.kind]), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => delStep(i)
  }, "\u522A\u9664")), st.kind === 'learn' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: st.say,
    onChange: e => updStep(i, {
      say: e.target.value
    }),
    placeholder: "\u9019\u4E00\u6B65\u8981\u6559\u7684\u4E00\u4EF6\u4E8B\uFF08\u7E41\u4E2D\uFF09"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rc-bg-img"
  }, st.img ? /*#__PURE__*/React.createElement("img", {
    src: st.img,
    alt: "",
    className: "rc-bg-thumb"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "rc-bg-hint"
  }, "\u5EFA\u8B70\u7684\u60C5\u5883\u5716\uFF1A", /*#__PURE__*/React.createElement("b", null, st.imgHint || '（沒有建議）')), /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: st.img || '',
    onChange: e => updStep(i, {
      img: e.target.value
    }),
    placeholder: "\u5716\u7247\u7DB2\u5740\uFF08\u53EF\u7559\u767D\uFF09"
  }), /*#__PURE__*/React.createElement("label", {
    className: "rc-bg-up"
  }, "\uD83D\uDCF7 \u4E0A\u50B3", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    hidden: true,
    onChange: async e => {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f || !window.uploadFlashcardImage) return;
      try {
        updStep(i, {
          img: await window.uploadFlashcardImage(f)
        });
      } catch (err) {
        setErr('圖片上傳失敗');
      }
    }
  })), st.img && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-x",
    onClick: () => updStep(i, {
      img: ''
    })
  }, "\u79FB\u9664\u5716")), st.examples.map((ex, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("input", {
    value: ex.en,
    onChange: e => updStep(i, {
      examples: st.examples.map((x, j) => j === k ? {
        ...x,
        en: e.target.value
      } : x)
    }),
    placeholder: "English example"
  }), /*#__PURE__*/React.createElement("input", {
    value: csv(ex.hl),
    onChange: e => updStep(i, {
      examples: st.examples.map((x, j) => j === k ? {
        ...x,
        hl: uncsv(e.target.value)
      } : x)
    }),
    placeholder: "\u8981\u6A19\u91CD\u9EDE\u7684\u5B57\uFF08\u7528 / \u5206\u958B\uFF09"
  }), /*#__PURE__*/React.createElement("input", {
    value: ex.zh,
    onChange: e => updStep(i, {
      examples: st.examples.map((x, j) => j === k ? {
        ...x,
        zh: e.target.value
      } : x)
    }),
    placeholder: "\u4E2D\u6587\u610F\u601D"
  })))), st.kind === 'pick' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: st.q,
    onChange: e => updStep(i, {
      q: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("input", {
    value: csv(st.options),
    onChange: e => updStep(i, {
      options: uncsv(e.target.value)
    }),
    placeholder: "\u9078\u9805\uFF08\u7528 / \u5206\u958B\uFF09"
  }), /*#__PURE__*/React.createElement("select", {
    value: st.answer,
    onChange: e => updStep(i, {
      answer: +e.target.value
    })
  }, st.options.map((o, k) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, "\u6B63\u89E3\uFF1A", o))), /*#__PURE__*/React.createElement("input", {
    value: st.why,
    onChange: e => updStep(i, {
      why: e.target.value
    }),
    placeholder: "\u70BA\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF09"
  }))), st.kind === 'tap' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: st.q,
    onChange: e => updStep(i, {
      q: e.target.value
    }),
    placeholder: "\u8981\u5C0F\u670B\u53CB\u505A\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF0C\u4F8B\uFF1A\u9EDE\u51FA\u53E5\u5B50\u88E1\u7684\u540D\u8A5E\uFF09"
  }), /*#__PURE__*/React.createElement("input", {
    value: st.sentence,
    onChange: e => updStep(i, {
      sentence: e.target.value
    }),
    placeholder: "English sentence"
  }), /*#__PURE__*/React.createElement("div", {
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("input", {
    value: csv(st.answers || []),
    onChange: e => updStep(i, {
      answers: uncsv(e.target.value)
    }),
    placeholder: "\u7B54\u6848\u7684\u5B57\uFF08\u7528 / \u5206\u958B\uFF0C\u8981\u8DDF\u53E5\u5B50\u88E1\u4E00\u6A21\u4E00\u6A23\uFF09"
  }), /*#__PURE__*/React.createElement("input", {
    value: st.why,
    onChange: e => updStep(i, {
      why: e.target.value
    }),
    placeholder: "\u70BA\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF09"
  }))), st.kind === 'sort' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: st.q,
    onChange: e => updStep(i, {
      q: e.target.value
    }),
    placeholder: "\u8981\u5C0F\u670B\u53CB\u505A\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF0C\u4F8B\uFF1A\u9019\u4E9B\u5B57\u662F\u4EBA\u3001\u5730\u65B9\u9084\u662F\u6771\u897F\uFF1F\uFF09"
  }), (st.groups || []).map((g, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("input", {
    value: g.label,
    onChange: e => updStep(i, {
      groups: (st.groups || []).map((x, j) => j === k ? {
        ...x,
        label: e.target.value
      } : x)
    }),
    placeholder: "\u7C43\u5B50\u540D\u7A31\uFF08\u7E41\u4E2D\uFF09"
  }), /*#__PURE__*/React.createElement("input", {
    value: csv(g.items),
    onChange: e => updStep(i, {
      groups: (st.groups || []).map((x, j) => j === k ? {
        ...x,
        items: uncsv(e.target.value)
      } : x)
    }),
    placeholder: "\u9019\u4E00\u7C43\u7684\u5B57\uFF08\u7528 / \u5206\u958B\uFF09"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost",
    onClick: () => updStep(i, {
      groups: (st.groups || []).filter((_, j) => j !== k)
    })
  }, "\u522A\u6389\u9019\u4E00\u7C43"))), /*#__PURE__*/React.createElement("div", {
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("input", {
    value: st.why,
    onChange: e => updStep(i, {
      why: e.target.value
    }),
    placeholder: "\u70BA\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF09"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn ghost",
    disabled: (st.groups || []).length >= 3,
    onClick: () => updStep(i, {
      groups: (st.groups || []).concat([{
        label: '',
        items: []
      }])
    })
  }, "\uFF0B \u52A0\u4E00\u7C43"))), st.kind === 'order' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: st.zh,
    onChange: e => updStep(i, {
      zh: e.target.value
    }),
    placeholder: "\u4E2D\u6587\u53E5\u5B50"
  }), /*#__PURE__*/React.createElement("input", {
    value: st.words.join(' '),
    onChange: e => updStep(i, {
      words: e.target.value.split(/\s+/).filter(Boolean)
    }),
    placeholder: "\u6B63\u78BA\u7684\u82F1\u6587\u53E5\u5B50\uFF08\u7A7A\u683C\u5206\u958B\uFF0C\u5B78\u751F\u770B\u5230\u6703\u6253\u6563\uFF09"
  })), st.kind === 'timeline' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: st.q,
    onChange: e => updStep(i, {
      q: e.target.value
    }),
    placeholder: "\u9019\u4E00\u6B65\u5728\u8B1B\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF0C\u4F8B\uFF1A\u540C\u4E00\u4EF6\u4E8B\u4EC0\u9EBC\u6642\u5019\u600E\u9EBC\u8AAA\uFF09"
  }), (st.points || []).map((pt, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("select", {
    value: pt.when,
    onChange: e => updStep(i, {
      points: st.points.map((x, j) => j === k ? {
        ...x,
        when: e.target.value
      } : x)
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "past"
  }, "\u904E\u53BB"), /*#__PURE__*/React.createElement("option", {
    value: "now"
  }, "\u73FE\u5728"), /*#__PURE__*/React.createElement("option", {
    value: "future"
  }, "\u672A\u4F86")), /*#__PURE__*/React.createElement("input", {
    value: pt.en,
    onChange: e => updStep(i, {
      points: st.points.map((x, j) => j === k ? {
        ...x,
        en: e.target.value
      } : x)
    }),
    placeholder: "English sentence"
  }), /*#__PURE__*/React.createElement("input", {
    value: pt.zh,
    onChange: e => updStep(i, {
      points: st.points.map((x, j) => j === k ? {
        ...x,
        zh: e.target.value
      } : x)
    }),
    placeholder: "\u4E2D\u6587\u610F\u601D"
  }))), /*#__PURE__*/React.createElement("input", {
    value: st.why,
    onChange: e => updStep(i, {
      why: e.target.value
    }),
    placeholder: "\u770B\u5B8C\u8981\u8A18\u5F97\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF09"
  })), st.kind === 'forms' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: st.q,
    onChange: e => updStep(i, {
      q: e.target.value
    }),
    placeholder: "\u9019\u4E00\u6B65\u5728\u8B1B\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF0C\u4F8B\uFF1A\u540C\u4E00\u53E5\u8A71\u7684\u4E09\u7A2E\u9577\u76F8\uFF09"
  }), (st.forms || []).map((f, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("select", {
    value: f.type,
    onChange: e => updStep(i, {
      forms: st.forms.map((x, j) => j === k ? {
        ...x,
        type: e.target.value
      } : x)
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "affirmative"
  }, "\u80AF\u5B9A"), /*#__PURE__*/React.createElement("option", {
    value: "negative"
  }, "\u5426\u5B9A"), /*#__PURE__*/React.createElement("option", {
    value: "question"
  }, "\u7591\u554F")), /*#__PURE__*/React.createElement("input", {
    value: f.en,
    onChange: e => updStep(i, {
      forms: st.forms.map((x, j) => j === k ? {
        ...x,
        en: e.target.value
      } : x)
    }),
    placeholder: "English sentence\uFF08\u7591\u554F\u53E5\u8981\u6709 ?\uFF09"
  }), /*#__PURE__*/React.createElement("input", {
    value: f.zh,
    onChange: e => updStep(i, {
      forms: st.forms.map((x, j) => j === k ? {
        ...x,
        zh: e.target.value
      } : x)
    }),
    placeholder: "\u4E2D\u6587\u610F\u601D"
  }))), /*#__PURE__*/React.createElement("input", {
    value: st.why,
    onChange: e => updStep(i, {
      why: e.target.value
    }),
    placeholder: "\u770B\u5B8C\u8981\u8A18\u5F97\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF09"
  })), st.kind === 'degree' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: st.q,
    onChange: e => updStep(i, {
      q: e.target.value
    }),
    placeholder: "\u9019\u4E00\u6B65\u5728\u8B1B\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF0C\u4F8B\uFF1A\u4E00\u500B\u6BD4\u4E00\u500B\u66F4\u2026\uFF09"
  }), (st.levels || []).map((x0, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("input", {
    value: x0.form,
    onChange: e => updStep(i, {
      levels: st.levels.map((x, j) => j === k ? {
        ...x,
        form: e.target.value
      } : x)
    }),
    placeholder: ['原級（tall）', '比較級（taller）', '最高級（tallest）'][k] || '這一級的字'
  }), /*#__PURE__*/React.createElement("input", {
    value: x0.en,
    onChange: e => updStep(i, {
      levels: st.levels.map((x, j) => j === k ? {
        ...x,
        en: e.target.value
      } : x)
    }),
    placeholder: "\u4F8B\u53E5\uFF08\u4E00\u5B9A\u8981\u6709\u4E0A\u9762\u90A3\u500B\u5B57\uFF09"
  }), /*#__PURE__*/React.createElement("input", {
    value: x0.zh,
    onChange: e => updStep(i, {
      levels: st.levels.map((x, j) => j === k ? {
        ...x,
        zh: e.target.value
      } : x)
    }),
    placeholder: "\u4E2D\u6587"
  }))), /*#__PURE__*/React.createElement("input", {
    value: st.why,
    onChange: e => updStep(i, {
      why: e.target.value
    }),
    placeholder: "\u770B\u5B8C\u8981\u8A18\u5F97\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF09"
  })), st.kind === 'fix' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: st.sentence,
    onChange: e => updStep(i, {
      sentence: e.target.value
    }),
    placeholder: "\u6709\u4E00\u500B\u932F\u5B57\u7684\u53E5\u5B50"
  }), /*#__PURE__*/React.createElement("div", {
    className: "gn-row3"
  }, /*#__PURE__*/React.createElement("input", {
    value: st.wrong,
    onChange: e => updStep(i, {
      wrong: e.target.value
    }),
    placeholder: "\u932F\u7684\u5B57"
  }), /*#__PURE__*/React.createElement("input", {
    value: st.right,
    onChange: e => updStep(i, {
      right: e.target.value
    }),
    placeholder: "\u6539\u6210"
  }), /*#__PURE__*/React.createElement("input", {
    value: st.why,
    onChange: e => updStep(i, {
      why: e.target.value
    }),
    placeholder: "\u70BA\u4EC0\u9EBC\uFF08\u7E41\u4E2D\uFF09"
  }))), !window.gnValidStep(st) && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, "\u26A0 \u9019\u4E00\u6B65\u683C\u5F0F\u4E0D\u5C0D\uFF0C\u5B78\u751F\u7AEF\u6703\u81EA\u52D5\u7565\u904E\uFF08\u9078\u9805 2\u20134 \u500B\uFF0F\u6392\u53E5\u5B50 3\u20139 \u584A\uFF0F\u932F\u5B57\u8981\u525B\u597D\u51FA\u73FE\u4E00\u6B21\uFF0C\u800C\u4E14\u8981\u662F\u6587\u6CD5\u932F\u4E0D\u662F\u63DB\u500B\u5B57\uFF0F\u627E\u51FA\u4F86\u7684\u7B54\u6848\u8981\u662F\u53E5\u5B50\u88E1\u53EA\u51FA\u73FE\u4E00\u6B21\u7684\u5B57\uFF0F\u5206\u4E00\u5206\u8981 2\u20133 \u7C43\u3001\u6BCF\u500B\u5B57\u53EA\u80FD\u5C6C\u65BC\u4E00\u7C43\uFF09"))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u6700\u5F8C\u4E00\u53E5\u8A71"), /*#__PURE__*/React.createElement("input", {
    value: res.lesson.outro,
    onChange: e => setRes(r => ({
      ...r,
      lesson: {
        ...r.lesson,
        outro: e.target.value
      }
    }))
  })), /*#__PURE__*/React.createElement("details", {
    className: "gn-notes"
  }, /*#__PURE__*/React.createElement("summary", null, "\uD83D\uDCC4 AI \u5F9E\u4F5C\u696D\u8B80\u5230\u7684\u6559\u5B78\u91CD\u9EDE\uFF08\u51FA\u984C\u7684\u4F9D\u64DA\uFF09"), /*#__PURE__*/React.createElement("pre", null, res.sheet.notes || '（沒有讀到教學重點，題目是依貼上的文字出的）'))), tab === 'circle' && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement(SetTabs, {
    n: ciSets.length,
    ix: ciIx,
    set: setCiIx,
    zh: "\u627E\u51FA\u4F86"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 8
    }
  }, "\u5B78\u751F\u770B\u5230\u7684\u6307\u793A\u8A9E\uFF1A", /*#__PURE__*/React.createElement("b", null, "Tap every ", (ciCur[0] || {}).findZh || (ciCur[0] || {}).find || 'word', " in each sentence."), "\uFF08\u4E00\u7D44\u53EA\u6709\u4E00\u53E5\u6307\u793A\u8A9E\uFF0C\u6240\u4EE5\u540C\u4E00\u7D44\u7684\u6BCF\u4E00\u984C\u90FD\u8981\u554F\u540C\u4E00\u7A2E\u5B57\uFF1B\u4E0D\u540C\u7D44\u53EF\u4EE5\u554F\u4E0D\u540C\u7A2E\uFF09"), ciCur.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("input", {
    value: x.sentence,
    onChange: e => putCircleSet(ciIx, ciCur.map((y, j) => j === i ? {
      ...y,
      sentence: e.target.value
    } : y))
  }), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u8981\u5708\u7684\u5B57\uFF08/ \u5206\u958B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: csv(x.answers || [x.answer]),
    onChange: e => putCircleSet(ciIx, ciCur.map((y, j) => j === i ? {
      ...y,
      answers: uncsv(e.target.value)
    } : y))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u627E\u4EC0\u9EBC\uFF08\u82F1\u6587\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: x.findZh,
    onChange: e => putCircleSet(ciIx, ciCur.map((y, j) => j === i ? {
      ...y,
      findZh: e.target.value
    } : y))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u89E3\u8AAA"), /*#__PURE__*/React.createElement("input", {
    value: x.explain,
    onChange: e => putCircleSet(ciIx, ciCur.map((y, j) => j === i ? {
      ...y,
      explain: e.target.value
    } : y))
  }))), !window.gnValidCircle(x) && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, "\u26A0 \u9019\u4E00\u984C\u5B78\u751F\u7AEF\u6703\u7565\u904E\uFF1A\u8981\u5708\u7684\u5B57\u5FC5\u9808\u662F\u53E5\u5B50\u88E1\u300C\u53EA\u51FA\u73FE\u4E00\u6B21\u300D\u7684\u5B8C\u6574\u55AE\u5B57\uFF0C\u800C\u4E14\u53E5\u5B50\u88E1\u7B26\u5408\u7684\u5B57\u8981\u5168\u90E8\u5217\u51FA\u4F86")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => putCircleSet(ciIx, ciCur.filter((_, j) => j !== i))
  }, "\u522A")))), tab === 'sort' && sortSet && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement(SetTabs, {
    n: soSets.length,
    ix: soIx,
    set: setSoIx,
    zh: "\u5206\u4E00\u5206"
  }), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u8981\u5C0F\u670B\u53CB\u505A\u4EC0\u9EBC"), /*#__PURE__*/React.createElement("input", {
    value: sortSet.instruction,
    onChange: e => putSortSet(soIx, {
      ...sortSet,
      instruction: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u7C43\u5B50\uFF08\u7528 / \u5206\u958B\uFF0C2\u20134 \u500B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: csv(sortSet.categories),
    onChange: e => putSortSet(soIx, {
      ...sortSet,
      categories: uncsv(e.target.value)
    })
  })), sortSet.words.map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u55AE\u5B57"), /*#__PURE__*/React.createElement("input", {
    value: w.word,
    onChange: e => putSortSet(soIx, {
      ...sortSet,
      words: sortSet.words.map((x, j) => j === i ? {
        ...x,
        word: e.target.value
      } : x)
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u653E\u54EA\u4E00\u7C43"), /*#__PURE__*/React.createElement("select", {
    value: w.category,
    onChange: e => putSortSet(soIx, {
      ...sortSet,
      words: sortSet.words.map((x, j) => j === i ? {
        ...x,
        category: e.target.value
      } : x)
    })
  }, sortSet.categories.map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  }, c)), sortSet.categories.indexOf(w.category) < 0 && /*#__PURE__*/React.createElement("option", {
    value: w.category
  }, w.category, "\uFF08\u4E0D\u5728\u7C43\u5B50\u88E1\uFF09"))))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => putSortSet(soIx, {
      ...sortSet,
      words: sortSet.words.filter((_, j) => j !== i)
    })
  }, "\u522A"))), !window.gnValidSortSet(sortSet, sortSet.words.length) && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, "\u26A0 \u9019\u6A23\u5B78\u751F\u7AEF\u4E0D\u6703\u5EFA\u7ACB\uFF1A\u8981 2\u20134 \u500B\u7C43\u5B50\u3001\u6BCF\u7C43\u81F3\u5C11 2 \u500B\u5B57\u3001\u540C\u4E00\u500B\u5B57\u4E0D\u80FD\u51FA\u73FE\u5169\u6B21")), tab === 'mcq' && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, res.mcq.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("input", {
    value: x.q,
    onChange: e => upd('mcq', i, {
      q: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u9078\u9805\uFF08/ \u5206\u958B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: csv(x.options),
    onChange: e => upd('mcq', i, {
      options: uncsv(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u6B63\u89E3"), /*#__PURE__*/React.createElement("select", {
    value: x.answer,
    onChange: e => upd('mcq', i, {
      answer: +e.target.value
    })
  }, x.options.map((o, k) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, o)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u89E3\u8AAA"), /*#__PURE__*/React.createElement("input", {
    value: x.explain,
    onChange: e => upd('mcq', i, {
      explain: e.target.value
    })
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => del('mcq', i)
  }, "\u522A")))), tab === 'fill' && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, res.fill.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("input", {
    value: x.prompt,
    onChange: e => upd('fill', i, {
      prompt: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u7B54\u6848"), /*#__PURE__*/React.createElement("input", {
    value: x.answer,
    onChange: e => upd('fill', i, {
      answer: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u4E5F\u7B97\u5C0D\uFF08/ \u5206\u958B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: csv(x.accept),
    onChange: e => upd('fill', i, {
      accept: uncsv(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u89E3\u8AAA"), /*#__PURE__*/React.createElement("input", {
    value: x.explain,
    onChange: e => upd('fill', i, {
      explain: e.target.value
    })
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => del('fill', i)
  }, "\u522A")))), tab === 'rw' && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 8
    }
  }, "\u5B78\u751F\u770B\u5230\u7684\u662F\u300C\u6709\u932F\u7684\u53E5\u5B50\u300D\uFF0C\u5DF2\u7D93\u5E6B\u4ED6\u6253\u5728\u8F38\u5165\u6846\u88E1\uFF0C\u4ED6\u53EA\u8981\u6539\u932F\u7684\u5730\u65B9\u3002", res.caseMatters ? /*#__PURE__*/React.createElement("b", null, " \u9019\u500B\u55AE\u5143\u5927\u5C0F\u5BEB\u6703\u7B97\u5206\uFF08taipei \u2260 Taipei\uFF09\u3002") : null), (res.rw || []).map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u6709\u932F\u7684\u53E5\u5B50"), /*#__PURE__*/React.createElement("input", {
    value: x.wrong,
    onChange: e => upd('rw', i, {
      wrong: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u6539\u5C0D\u7684\u53E5\u5B50"), /*#__PURE__*/React.createElement("input", {
    value: x.answer,
    onChange: e => upd('rw', i, {
      answer: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u89E3\u8AAA"), /*#__PURE__*/React.createElement("input", {
    value: x.explain,
    onChange: e => upd('rw', i, {
      explain: e.target.value
    })
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => del('rw', i)
  }, "\u522A")))), tab === 'ord' && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 8
    }
  }, "\u5B78\u751F\u770B\u5230\u7684\u662F\u6253\u6563\u7684\u5B57\u584A\uFF0C\u8981\u6392\u56DE\u6B63\u78BA\u9806\u5E8F\u3002", /*#__PURE__*/React.createElement("b", null, "\u8ACB\u5538\u4E00\u904D\u78BA\u8A8D\u300C\u53EA\u6709\u9019\u4E00\u7A2E\u6392\u6CD5\u300D"), "\u2014\u2014 \u82F1\u6587\u5E38\u5E38\u5169\u7A2E\u90FD\u5C0D\uFF08I often play basketball\uFF0FOften I play basketball\uFF09\uFF0C\u90A3\u7A2E\u5C31\u522A\u6389\u3002"), (res.ord || []).map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u6B63\u78BA\u9806\u5E8F\uFF08\u7528\u7A7A\u767D\u5206\u958B\u6BCF\u4E00\u584A\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: (x.words || []).join(' '),
    onChange: e => upd('ord', i, {
      words: e.target.value.split(/\s+/).filter(Boolean)
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u63D0\u793A\uFF08\u53EF\u7A7A\u767D\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: x.hint || '',
    onChange: e => upd('ord', i, {
      hint: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u89E3\u8AAA"), /*#__PURE__*/React.createElement("input", {
    value: x.explain || '',
    onChange: e => upd('ord', i, {
      explain: e.target.value
    })
  }))), !window.gnValidOrder(x) && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, "\u26A0 \u9019\u4E00\u984C\u5B78\u751F\u7AEF\u6703\u7565\u904E\uFF1A\u8981 4\u201310 \u584A\u3001\u4E0D\u80FD\u6709\u4E2D\u6587\u3001\u4E00\u584A\u53EA\u80FD\u4E00\u500B\u5B57\uFF0C\u800C\u4E14\u4E0D\u80FD\u6709\u91CD\u8907\u7684\u5B57\u584A\uFF08\u91CD\u8907\uFF1D\u7B54\u6848\u4E0D\u53EA\u4E00\u7A2E\uFF09")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => del('ord', i)
  }, "\u522A")))), tab === 'edit' && res.edit && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 8
    }
  }, "\u5B78\u751F\u6703\u770B\u5230\u6574\u6BB5\u6587\u7AE0\uFF0C", /*#__PURE__*/React.createElement("b", null, "\u5148\u628A\u932F\u7684\u5730\u65B9\u5708\u51FA\u4F86"), "\uFF0C\u518D", /*#__PURE__*/React.createElement("b", null, "\u5BEB\u51FA\u6B63\u78BA\u7684"), "\uFF08\u8DDF\u5EB7\u6A4B\u8003\u5377\u4E00\u6A23\u5169\u6B65\uFF09\u3002 \u51FA\u984C\u6642\u5DF2\u7D93\u8B93\u7B2C\u4E8C\u500B AI \u91CD\u8B80\u4E00\u6B21\u6BB5\u843D\u3001\u81EA\u5DF1\u628A\u932F\u627E\u51FA\u4F86\u6BD4\u5C0D\u904E\uFF1B", /*#__PURE__*/React.createElement("b", null, "\u9084\u662F\u8ACB\u4F60\u5538\u4E00\u904D\uFF0C\u78BA\u8A8D\u6BB5\u843D\u88E1\u6C92\u6709\u300C\u6C92\u5217\u9032\u7B54\u6848\u7684\u932F\u300D"), "\u2014\u2014\u90A3\u6703\u8B93\u5B78\u751F\u627E\u5230\u537B\u88AB\u5224\u932F\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u6A19\u984C"), /*#__PURE__*/React.createElement("input", {
    value: res.edit.title || '',
    onChange: e => setRes(r => ({
      ...r,
      edit: {
        ...r.edit,
        title: e.target.value
      }
    }))
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u6BB5\u843D\uFF08\u5171 ", (res.edit.errors || []).length, " \u500B\u932F\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    rows: 5,
    value: res.edit.paragraph || '',
    onChange: e => setRes(r => ({
      ...r,
      edit: {
        ...r.edit,
        paragraph: e.target.value
      }
    }))
  })), (res.edit.errors || []).map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u932F\u7684\u5730\u65B9"), /*#__PURE__*/React.createElement("input", {
    value: e.wrong,
    onChange: ev => setRes(r => ({
      ...r,
      edit: {
        ...r.edit,
        errors: r.edit.errors.map((x, j) => j === i ? {
          ...x,
          wrong: ev.target.value
        } : x)
      }
    }))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u6539\u6210"), /*#__PURE__*/React.createElement("input", {
    value: e.right,
    onChange: ev => setRes(r => ({
      ...r,
      edit: {
        ...r.edit,
        errors: r.edit.errors.map((x, j) => j === i ? {
          ...x,
          right: ev.target.value
        } : x)
      }
    }))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u70BA\u4EC0\u9EBC"), /*#__PURE__*/React.createElement("input", {
    value: e.why || '',
    onChange: ev => setRes(r => ({
      ...r,
      edit: {
        ...r.edit,
        errors: r.edit.errors.map((x, j) => j === i ? {
          ...x,
          why: ev.target.value
        } : x)
      }
    }))
  }))), e.sentence && /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginTop: 4
    }
  }, "\u5728\u9019\u4E00\u53E5\uFF1A", e.sentence)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => setRes(r => ({
      ...r,
      edit: {
        ...r.edit,
        errors: r.edit.errors.filter((_, j) => j !== i)
      }
    }))
  }, "\u522A")))), tab === 'diag' && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 8
    }
  }, "\u5169\u6B65\uFF1A\u5148\u9078\u300C\u9019\u662F\u54EA\u4E00\u7A2E\u932F\u300D\uFF0C\u9078\u5C0D\u4E86\u624D\u89E3\u9396\u300C\u628A\u53E5\u5B50\u6539\u5C0D\u300D\uFF08\u8DDF\u5EB7\u6A4B G3 \u90A3\u4E00\u984C\u4E00\u6A23\uFF09\u3002", /*#__PURE__*/React.createElement("b", null, "\u6BCF\u4E00\u984C\u7684\u9078\u9805\u90FD\u8981\u662F\u9019\u4E00\u8AB2\u771F\u7684\u6703\u51FA\u73FE\u7684\u932F\u8AA4\u985E\u578B"), "\uFF0C\u4E0D\u8981\u6709\u660E\u986F\u4E82\u6E4A\u7684\u3002"), (res.diag || []).map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("input", {
    value: x.broken,
    onChange: e => upd('diag', i, {
      broken: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u932F\u8AA4\u985E\u578B\uFF08/ \u5206\u958B\uFF0C\u6B63\u89E3\u6253 \u2714 \u7684\u90A3\u4E00\u500B\u653E\u7B2C ", x.answer + 1, " \u500B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: csv(x.kinds),
    onChange: e => upd('diag', i, {
      kinds: uncsv(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u6B63\u89E3\u662F\u7B2C\u5E7E\u500B"), /*#__PURE__*/React.createElement("select", {
    value: x.answer,
    onChange: e => upd('diag', i, {
      answer: +e.target.value
    })
  }, x.kinds.map((k, j) => /*#__PURE__*/React.createElement("option", {
    key: j,
    value: j
  }, j + 1, ". ", k))))), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u6539\u5C0D\u7684\u53E5\u5B50"), /*#__PURE__*/React.createElement("input", {
    value: x.fixed,
    onChange: e => upd('diag', i, {
      fixed: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u70BA\u4EC0\u9EBC"), /*#__PURE__*/React.createElement("input", {
    value: x.why || '',
    onChange: e => upd('diag', i, {
      why: e.target.value
    })
  }))), !window.gnValidDiagnose(x) && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, "\u26A0 \u9019\u4E00\u984C\u5B78\u751F\u7AEF\u6703\u7565\u904E\uFF1A\u539F\u53E5\u8207\u6539\u5C0D\u7684\u53E5\u5B50\u8981\u4E0D\u4E00\u6A23\u30012\u20133 \u500B\u4E0D\u91CD\u8907\u7684\u9078\u9805\u3001\u90FD\u4E0D\u80FD\u6709\u4E2D\u6587")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => del('diag', i)
  }, "\u522A")))), tab === 'tf' && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 8
    }
  }, "\u5B78\u751F\u770B\u5230\u300C\u539F\u53E5 \u2192 \u8981\u6539\u6210\u4EC0\u9EBC\u300D\uFF0C\u81EA\u5DF1\u6253\u51FA\u8F49\u63DB\u5F8C\u7684\u53E5\u5B50\u3002 \u6BD4\u5C0D\u8DDF\u4E2D\u7FFB\u82F1\u4E00\u6A23\u5BEC\u9B06\uFF08\u5927\u5C0F\u5BEB\u3001\u53E5\u5C3E\u6A19\u9EDE\u3001isn't\uFF0Fis not \u90FD\u4E0D\u5F71\u97FF\uFF09\uFF0C\u6BD4\u4E0D\u4E0A\u7684\u518D\u7531 AI \u5224\u65B7\u3002"), (res.tf || []).map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u539F\u53E5\uFF08\u672C\u4F86\u5C31\u662F\u5C0D\u7684\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: x.prompt,
    onChange: e => upd('tf', i, {
      prompt: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u8981\u6539\u6210\u4EC0\u9EBC"), /*#__PURE__*/React.createElement("input", {
    value: x.task,
    onChange: e => upd('tf', i, {
      task: e.target.value
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u7B54\u6848"), /*#__PURE__*/React.createElement("input", {
    value: x.answer,
    onChange: e => upd('tf', i, {
      answer: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u89E3\u8AAA"), /*#__PURE__*/React.createElement("input", {
    value: x.explain || '',
    onChange: e => upd('tf', i, {
      explain: e.target.value
    })
  }))), !window.gnValidTransform(x) && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, "\u26A0 \u9019\u4E00\u984C\u5B78\u751F\u7AEF\u6703\u7565\u904E\uFF1A\u539F\u53E5\u8207\u7B54\u6848\u8981\u4E0D\u4E00\u6A23\u3001\u90FD\u4E0D\u80FD\u6709\u4E2D\u6587\u3001\u9577\u5EA6\u4E0D\u80FD\u5DEE\u592A\u591A")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => del('tf', i)
  }, "\u522A")))), tab === 'write' && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 8
    }
  }, "\u5B78\u751F\u81EA\u5DF1\u5BEB\u4E00\u53E5\u8A71\uFF0C\u7531 AI \u6279\u6539\uFF08\u6700\u9AD8 5 \u9846\u661F\uFF09\u3002 \u300C\u4E00\u5B9A\u8981\u7528\u5230\u300D\u90A3\u4E00\u6B04\u5C31\u662F AI \u7684\u6279\u6539\u4F9D\u64DA\u2014\u2014\u5BEB\u5F97\u6108\u5177\u9AD4\uFF0C\u6279\u6539\u6108\u6E96\u3002"), (res.write || []).map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u984C\u76EE\uFF08\u7D66\u5B78\u751F\u7684\u60C5\u5883\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: x.prompt,
    onChange: e => upd('write', i, {
      prompt: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u4E00\u5B9A\u8981\u7528\u5230"), /*#__PURE__*/React.createElement("input", {
    value: x.must,
    onChange: e => upd('write', i, {
      must: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u63D0\u793A\uFF08\u53EF\u7A7A\u767D\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: x.hint || '',
    onChange: e => upd('write', i, {
      hint: e.target.value
    })
  }))), !window.gnValidWrite(x) && /*#__PURE__*/React.createElement("div", {
    className: "gr-warn"
  }, "\u26A0 \u9019\u4E00\u984C\u5B78\u751F\u7AEF\u6703\u7565\u904E\uFF1A\u984C\u76EE\u8981 4\u201322 \u500B\u82F1\u6587\u5B57\u3001\u800C\u4E14\u300C\u4E00\u5B9A\u8981\u7528\u5230\u300D\u4E0D\u80FD\u7A7A\u767D")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => del('write', i)
  }, "\u522A")))), tab === 'tr' && /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-help",
    style: {
      marginBottom: 8
    }
  }, "\u5B78\u751F\u7684\u7B54\u6848\u6703\u5148\u7531\u7A0B\u5F0F\u6BD4\u5C0D\uFF08\u5927\u5C0F\u5BEB\u3001\u53E5\u5C3E\u6A19\u9EDE\u3001isn't\uFF0Fis not \u90FD\u4E0D\u5F71\u97FF\uFF09\uFF1B\u6BD4\u4E0D\u4E0A\u7684\uFF0C\u518D\u7531 AI \u5224\u65B7\u300C\u610F\u601D\u5C0D\u3001\u6587\u6CD5\u5C0D\u300D\u7684\u5176\u4ED6\u8AAA\u6CD5\u2014\u2014\u6240\u4EE5\u4E0D\u7528\u628A\u6BCF\u4E00\u7A2E\u8AAA\u6CD5\u90FD\u5217\u51FA\u4F86\u3002"), res.tr.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gq-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gq-row-n"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-f"
  }, /*#__PURE__*/React.createElement("input", {
    value: x.zh,
    onChange: e => upd('tr', i, {
      zh: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "gq-row-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u6A19\u6E96\u7B54\u6848"), /*#__PURE__*/React.createElement("input", {
    value: x.answer,
    onChange: e => upd('tr', i, {
      answer: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u5176\u4ED6\u6B63\u78BA\u8AAA\u6CD5\uFF08/ \u5206\u958B\uFF09"), /*#__PURE__*/React.createElement("input", {
    value: csv(x.accept),
    onChange: e => upd('tr', i, {
      accept: uncsv(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "\u63D0\u793A"), /*#__PURE__*/React.createElement("input", {
    value: x.hint,
    onChange: e => upd('tr', i, {
      hint: e.target.value
    })
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "gn-del",
    onClick: () => del('tr', i)
  }, "\u522A"))))), /*#__PURE__*/React.createElement("div", {
    className: "qs-split",
    style: {
      margin: '0 18px'
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "qs-split-l"
  }, "\u4E00\u500B\u7DF4\u7FD2\u6700\u591A"), /*#__PURE__*/React.createElement("input", {
    className: "qs-split-n",
    type: "number",
    min: "2",
    max: "40",
    value: gnMaxQ,
    onChange: e => setGnMaxQ(Math.max(2, Math.min(40, +e.target.value || 10)))
  }), /*#__PURE__*/React.createElement("span", {
    className: "qs-split-l"
  }, "\u984C"), /*#__PURE__*/React.createElement("span", {
    className: "qs-split-n2"
  }, (() => {
    var n4 = (list, zh) => {
      var L = (list || []).length;
      if (!L) return null;
      var g = window.qsChunkEven ? window.qsChunkEven(list, gnMaxQ) : [list];
      return g.length > 1 ? `${zh} ${g.length} 份（${g.map(x => x.length).join('+')} 題）` : null;
    };
    var bits = [n4(res.mcq, '選擇題'), n4(res.fill, '填空題'), n4(res.rw, '改寫句子'), n4(res.tf, '句型轉換'), n4(res.write, '造句')].filter(Boolean);
    return bits.length ? '會拆開：' + bits.join('　·　') : '這一份每種題型都在上限內，不會被拆開';
  })())), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => setRes(null)
  }, "\u2190 \u91CD\u65B0\u8A2D\u5B9A"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: lsBusy || !unitsN,
    onClick: () => {
      if (!steps.length && !confirm('這一份沒有互動教學，練習就不會上鎖（學生可以直接做題）。\n確定要先建立嗎？')) return;
      onCreate({
        maxQ: gnMaxQ,
        title: (title || res.sheet.topic || '文法練習').trim(),
        cat,
        grade,
        topic: res.sheet.topic,
        lesson: res.lesson,
        mcq: res.mcq,
        fill: res.fill,
        tr: res.tr,
        rw: res.rw || [],
        srcNotes: res.sheet ? res.sheet.notes : '',
        // v466：留著給「排複習」重出題目用
        write: res.write || [],
        tf: res.tf || [],
        ord: res.ord || [],
        // v462 ③②①
        edit: res.edit || null,
        diag: res.diag || [],
        // v467 康橋
        circle: res.circle || [],
        sort: soSets[0] || null,
        circleSets: ciSets,
        sortSets: soSets,
        // v461：每一組各建一個單元
        caseMatters: !!res.caseMatters,
        assign: assign ? perStudent ? {
          students: who
        } : {
          dueDate: due
        } : null
      });
    }
  }, "\u5EFA\u7ACB ", unitsN, " \u500B\u55AE\u5143 \u2192"))));
}

/* 校稿完 → 真正的單元。練習三份都帶 requires（教學 id）：沒學完的學生會看到鎖 */
function gnBuildItems({
  title,
  topic,
  srcNotes,
  lesson,
  mcq,
  fill,
  tr,
  rw,
  write,
  tf,
  ord,
  edit,
  diag,
  circle,
  sort,
  circleSets,
  sortSets,
  caseMatters,
  maxQ
}) {
  var stamp = Date.now();
  var rnd = () => Math.random().toString(36).slice(2, 5);
  var g = title;
  var out = [];
  /* ══ v542（Alan：「不然之後合併單字 或是文法 都全部出在一個練習 也太累」）══
     跟單字那邊用**同一個** qsChunkEven／qsPartTitle，不要各寫一份。
     ⚠ 只有一份時完全不加字尾——文法平常一種就 8 題，本來就不會被切到。 */
  var cap = Math.max(1, +maxQ || window.QS_MAX_Q || 10);
  var chunk = list => window.qsChunkEven ? window.qsChunkEven(list, cap) : list.length ? [list] : [];
  var partTitle = (t, i, n) => window.qsPartTitle ? window.qsPartTitle(t, i, n) : t;
  /* 一種題型切成好幾份：order 用小數排在一起，側欄順序不會亂掉 */
  var pushSplit = (list, order, make) => {
    var parts = chunk(list);
    parts.forEach((grp, k) => out.push({
      ...make(grp, k, parts.length),
      order: order + k * 0.001
    }));
  };
  var steps = (lesson && lesson.steps || []).map(window.gnValidStep).filter(Boolean);
  var lessonId = steps.length ? 'gn' + stamp + 'ls' + rnd() : null;
  if (lessonId) {
    /* v466：把「這一課在教什麼」存進教學單元。
       ⚠ 以前生成完就丟掉了——所以兩週後想重出一份不一樣的文法題，
         手上只剩互動教學的內容，沒有老師原本的教學重點。
       存了之後，複習就能用同一份教學重點重出題目（跟單字那邊一樣）。
       只存前 4000 字，照片讀出來的長作業不會把整份課程撐爆。 */
    out.push({
      id: lessonId,
      type: 'lesson',
      group: g,
      order: 0,
      title: `${g} · 先學一下`,
      zh: `互動教學 · ${steps.length} 步 · 學完才能開始練習`,
      srcTopic: topic || g,
      srcNotes: String(srcNotes || '').slice(0, 4000),
      lead: lesson.lead || '',
      steps,
      outro: lesson.outro || ''
    });
  }
  var req = lessonId ? {
    requires: lessonId
  } : {};
  var cs = caseMatters ? {
    caseSensitive: true
  } : {}; // v429：大小寫是考點的單元，打字題要分大小寫
  /* v444 找出來＝現成的「圈選題」；分一分＝現成的「單字分類」。
     沿用既有題型＝計分、星星（AUTO_STAR_KIND 的 pct）、只重做錯的、側欄歸戶全部自動有。 */
  /* v461（Alan：「只能出一組找出來、分一分，但有時候我想出兩組三組」）：
     circleSets／sortSets 是「每一組一個單元」；沒有就退回舊的單一 circle／sort，
     所以舊的呼叫端（校稿畫面、測試）完全不用改。
     ⚠ 每一組都要有自己的 id 與標題（找出來 1／找出來 2），不然側欄分不出誰是誰。 */
  var circleList = Array.isArray(circleSets) && circleSets.length ? circleSets : circle ? [circle] : [];
  circleList.forEach((set, k) => {
    var good = (set || []).filter(x => x && x.sentence && ((x.answers || []).length || x.answer));
    if (!good.length) return;
    var nth = circleList.length > 1 ? ` ${k + 1}` : '';
    var what = good[0].findZh || good[0].find || 'words';
    out.push({
      id: 'gn' + stamp + 'ci' + k + rnd(),
      type: 'circle-answer',
      group: g,
      order: 1 + k * 0.01,
      ...req,
      title: `${g} · 找出來${nth}`,
      zh: `${good.length} 題 · Find the ${what}`,
      circleInstruction: `Tap every ${what} in each sentence (there may be more than one).`,
      circleQuestions: good.map((x, i) => ({
        id: 'c' + stamp + k + i + rnd(),
        sentence: x.sentence,
        answers: (x.answers && x.answers.length ? x.answers : [x.answer]).filter(Boolean),
        answer: x.answers && x.answers[0] || x.answer,
        explain: x.explain || ''
      }))
    });
  });
  var sortList = Array.isArray(sortSets) && sortSets.length ? sortSets : sort ? [sort] : [];
  sortList.forEach((set, k) => {
    var good = set && (set.words || []).length >= 4 && (set.categories || []).length >= 2 ? set : null;
    if (!good) return;
    var nth = sortList.length > 1 ? ` ${k + 1}` : '';
    out.push({
      id: 'gn' + stamp + 'ws' + k + rnd(),
      type: 'word-sort',
      group: g,
      order: 2 + k * 0.01,
      ...req,
      title: `${g} · 分一分${nth}`,
      zh: `${good.words.length} 個字 · ${good.instruction}`,
      sortCategories: good.categories,
      sortWords: good.words.map((w, i) => ({
        id: 'w' + stamp + k + i + rnd(),
        word: w.word,
        category: w.category
      }))
    });
  });
  var goodMcq = (mcq || []).filter(x => x && x.q && (x.options || []).length >= 2);
  if (goodMcq.length) pushSplit(goodMcq, 3, (grp, k, n) => ({
    id: 'gn' + stamp + 'qz' + k + rnd(),
    type: 'quiz',
    group: g,
    ...req,
    title: partTitle(`${g} · 選擇題`, k, n),
    zh: `${grp.length} 題 · 選出正確的答案`,
    shuffle: true,
    questions: grp.map((x, i) => ({
      id: 'q' + stamp + k + '_' + i + rnd(),
      q: x.q,
      options: x.options,
      answer: x.answer,
      explain: x.explain || ''
    }))
  }));
  var goodFill = (fill || []).filter(x => x && x.prompt && x.answer);
  if (goodFill.length) pushSplit(goodFill, 4, (grp, k, n) => ({
    id: 'gn' + stamp + 'fb' + k + rnd(),
    type: 'type-answer',
    variant: 'fill',
    group: g,
    ...req,
    ...cs,
    title: partTitle(`${g} · 填空題`, k, n),
    zh: `${grp.length} 題 · 把空格填上正確的字`,
    instruction: '把 ________ 填上正確的字',
    pairs: grp.map((x, i) => ({
      id: 'p' + stamp + 'f' + k + '_' + i + rnd(),
      prompt: x.prompt,
      answer: x.answer,
      accept: x.accept || [],
      explain: x.explain || ''
    }))
  }));
  var goodRw = (rw || []).filter(x => x && x.wrong && x.answer && x.wrong !== x.answer);
  if (goodRw.length) pushSplit(goodRw, 5, (grp, k, n) => ({
    id: 'gn' + stamp + 'rw' + k + rnd(),
    type: 'type-answer',
    variant: 'rewrite',
    group: g,
    ...req,
    ...cs,
    title: partTitle(`${g} · 改寫句子`, k, n),
    zh: `${grp.length} 題 · 把整句重寫一次`,
    instruction: '把句子裡錯的地方改對，整句重寫一次',
    pairs: grp.map((x, i) => ({
      id: 'p' + stamp + 'r' + k + '_' + i + rnd(),
      prompt: x.wrong,
      answer: x.answer,
      accept: [],
      explain: x.explain || ''
    }))
  }));
  /* ══ v467：康橋的兩種招牌題型 ══
     ① 整段改錯 → 拆成兩個單元，跟康橋考卷一模一樣的兩步：
        （a）circle-answer：讀整段、把錯的字圈出來（v444 的圈選題本來就支援複選）
        （b）type-answer：把正確的字寫出來
        ⚠ 不新增題型——v414 的教訓：新題型要註冊 20 個地方，漏一個就沒星星。
     ② 先判斷再改正 → quiz（選錯誤類型）＋ type-answer（改寫），用 requires 串成兩步。 */
  if (edit && (edit.errors || []).length >= 2) {
    var n = edit.errors.length;
    var head = edit.title ? `${edit.title} — ` : '';
    // （a）圈出錯的地方：一句一題，答案＝那一句裡錯的那幾個字
    var rows = edit.errors.filter(e => e.sentence);
    if (rows.length) {
      out.push({
        id: 'gn' + stamp + 'ed' + rnd(),
        type: 'circle-answer',
        group: g,
        order: 10,
        ...req,
        title: `${g} · 找出錯誤`,
        zh: `${n} 個錯 · ${head}把寫錯的地方圈出來`,
        circleInstruction: `There are ${n} mistakes in this paragraph. Tap the words that are wrong.`,
        passage: edit.paragraph,
        /* 🔴 v479：只圈「真的改到的那幾個字」（e.mark）。
           本來是把整個詞組拆開全部當答案 → 「more crunchier」連沒錯的 crunchier
           也要圈、「good than」連 than 也要圈（Alan 回報）。 */
        circleQuestions: rows.map((e, i) => {
          var mk = (e.mark && e.mark.length ? e.mark : e.wrong.split(/\s+/)).filter(Boolean);
          return {
            id: 'e' + stamp + i + rnd(),
            sentence: e.sentence,
            answers: mk,
            answer: mk[0],
            explain: e.why || ''
          };
        })
      });
    }
    /* （b）寫出正確的字（康橋原卷：Write the corrected words in the boxes）
       🔴 v479（Alan：「改成正確的跟改寫句子有什麼差別？怎麼長一樣」「怎麼有三個一樣」）：
         本來要學生打**整句**，所以跟「改寫句子」「改成正確的句子」三個長得一模一樣，
         而且一個小框要塞一整句（Alan：「這麼小誰看得到」）。
         康橋原卷本來就只要寫**改好的那幾個字**——改回去，三種題型就真的不一樣了：
           · 改成正確的　　（這個）＝只寫改好的那幾個字
           · 改寫句子　　　　　　　＝照指示把整句重寫
           · 改成正確的句子（診斷）＝先看出錯在哪，再把整句寫對 */
    out.push({
      id: 'gn' + stamp + 'ec' + rnd(),
      type: 'type-answer',
      variant: 'word',
      group: g,
      order: 11,
      ...req,
      ...cs,
      title: `${g} · 改成正確的`,
      zh: `${n} 題 · 只要寫改對的那幾個字`,
      instruction: '把圈出來的地方改對——只要寫那幾個字，不用寫整句',
      pairs: edit.errors.map((e, i) => ({
        id: 'p' + stamp + 'e' + i + rnd(),
        prompt: e.sentence || edit.paragraph,
        wrongPart: e.wrong,
        answer: e.right,
        accept: [e.right],
        explain: e.why || ''
      }))
    });
  }

  /* ② 先判斷錯誤類型，再改正（康橋 G3 的 Subjects and Predicates） */
  var goodDiag = (diag || []).filter(x => x && x.broken && x.fixed && (x.kinds || []).length >= 2);
  if (goodDiag.length) {
    var dxId = 'gn' + stamp + 'dx' + rnd();
    out.push({
      id: dxId,
      type: 'quiz',
      group: g,
      order: 12,
      ...req,
      title: `${g} · 錯在哪裡`,
      zh: `${goodDiag.length} 題 · 先看出是哪一種錯`,
      shuffle: true,
      questions: goodDiag.map((x, i) => ({
        id: 'q' + stamp + 'd' + i + rnd(),
        q: `What is wrong with this sentence?\n"${x.broken}"`,
        options: x.kinds,
        answer: x.answer,
        explain: x.why || ''
      }))
    });
    // 看出錯在哪，才解鎖「改正」——跟康橋的兩段式一樣
    /* 🔴 v480：改寫那一步只收「從句子本身就改得回來」的題目。
       「ran across the line.」→「My dad ran across the line.」那種（Missing Subject）
       主詞要學生自己想，用標準答案比對一定誤判——判斷題照出，但不要叫他重寫。 */
    var rwDiag = goodDiag.filter(x => x.canRewrite !== false);
    if (rwDiag.length) out.push({
      id: 'gn' + stamp + 'df' + rnd(),
      type: 'type-answer',
      variant: 'rewrite',
      group: g,
      order: 13,
      requires: dxId,
      ...cs,
      title: `${g} · 改成正確的句子`,
      zh: `${rwDiag.length} 題 · 你剛剛看出錯在哪了——把整句寫對`,
      instruction: '把整句重寫一次（剛剛那一題已經告訴你錯在哪一類）',
      pairs: rwDiag.map((x, i) => ({
        id: 'p' + stamp + 'x' + i + rnd(),
        prompt: x.broken,
        answer: x.fixed,
        accept: [],
        explain: x.why || ''
      }))
    });
  }

  /* v462 ③ 造句 → 沿用 writing-practice（AI 批改、五星、星星規則都現成）。
     writingPrompts 的 word 欄位就是「要檢查什麼」，checkWriting 會拿它當批改依據，
     所以放「一定要用到的文法特徵」而不是單字。 */
  var goodWrite = (write || []).filter(x => x && x.prompt && x.must);
  if (goodWrite.length) pushSplit(goodWrite, 7, (grp, k, n) => ({
    id: 'gn' + stamp + 'wr' + k + rnd(),
    type: 'writing-practice',
    group: g,
    ...req,
    title: partTitle(`${g} · 造句`, k, n),
    zh: `${grp.length} 題 · 自己寫一句，AI 批改`,
    instruction: '每一題寫一個英文句子，一定要用到這一課的文法。',
    writingPrompts: grp.map((x, i) => ({
      id: 'w' + stamp + k + '_' + i + rnd(),
      word: x.must,
      zh: '',
      instruction: x.prompt + (x.hint ? `  (${x.hint})` : '')
    }))
  }));

  /* v462 ② 句型轉換 → type-answer 的新 variant 'transform'。
     題幹寫成「原句 → 要改成什麼」，學生打出轉換後的句子。 */
  var goodTf = (tf || []).filter(x => x && x.prompt && x.answer && x.task);
  if (goodTf.length) pushSplit(goodTf, 8, (grp, k, n) => ({
    id: 'gn' + stamp + 'tf' + k + rnd(),
    type: 'type-answer',
    variant: 'transform',
    group: g,
    ...req,
    ...cs,
    title: partTitle(`${g} · 句型轉換`, k, n),
    zh: `${grp.length} 題 · 把句子換一種說法`,
    instruction: 'Change each sentence as the task says.',
    pairs: grp.map((x, i) => ({
      id: 'p' + stamp + 'x' + k + '_' + i + rnd(),
      prompt: `${x.prompt}\n→ ${x.task}`,
      answer: x.answer,
      accept: x.accept || [],
      explain: x.explain || ''
    }))
  }));

  /* v462 ① 排順序 → 新題型 sentence-order（字塊排句子）。 */
  var goodOrd = (ord || []).filter(x => x && (x.words || []).length >= 4);
  if (goodOrd.length) out.push({
    id: 'gn' + stamp + 'so' + rnd(),
    type: 'sentence-order',
    group: g,
    order: 9,
    ...req,
    title: `${g} · 排順序`,
    zh: `${goodOrd.length} 句 · 把字排成正確的句子`,
    instruction: 'Put the words in the right order.',
    orderQuestions: goodOrd.map((x, i) => ({
      id: 'o' + stamp + i + rnd(),
      words: x.words,
      hint: x.hint || '',
      explain: x.explain || ''
    }))
  });
  var goodTr = (tr || []).filter(x => x && x.zh && x.answer);
  if (goodTr.length) out.push({
    id: 'gn' + stamp + 'tr' + rnd(),
    type: 'type-answer',
    variant: 'translate',
    group: g,
    order: 6,
    ...req,
    ...cs,
    topic: topic || g,
    title: `${g} · 中翻英`,
    zh: `${goodTr.length} 題 · 看中文，打出英文句子`,
    pairs: goodTr.map((x, i) => ({
      id: 'p' + stamp + 't' + i + rnd(),
      prompt: x.zh,
      answer: x.answer,
      accept: x.accept || [],
      hint: x.hint || '',
      explain: x.explain || ''
    }))
  });
  return out;
}

/* ── v437：「讀之前先知道」的步驟編輯器（📖 出閱讀理解 與 分段閱讀 共用）──────────
   v436 這段 JSX 本來寫死在 ReadingGenModal 裡；分段閱讀也要用，所以抽出來。
   兩邊的行為完全一樣（改字、換圖、上傳、刪一步、整份重出）。 */
function BgStepsEditor({
  bg,
  onChange,
  onRedo,
  busy,
  onErr
}) {
  var steps = bg && bg.steps || [];
  /* v442（Alan：「可以讓 AI 自己找給我？」）：用 AI 給的關鍵字去免費圖庫抓圖，
     只補「還沒有圖」的那幾步，老師自己放的不會被蓋掉。 */
  var [autoImg, setAutoImg] = useS(false);
  var autoFillImages = async () => {
    if (!window.autoFindImage) return;
    setAutoImg(true);
    var next = {
      ...bg,
      steps: steps.slice()
    };
    var got = 0;
    for (var i = 0; i < next.steps.length; i++) {
      var st = next.steps[i];
      if (st.kind !== 'learn' || st.img) continue;
      try {
        var url = await window.autoFindImage(st.imgHint || st.say);
        if (url) {
          next.steps[i] = {
            ...st,
            img: url
          };
          got++;
        }
      } catch (e) {/* 找不到就跳過這一步 */}
    }
    onChange(next);
    setAutoImg(false);
    if (!got && onErr) onErr('圖庫這次沒找到合適的圖——可以改一下「建議放的圖」的關鍵字，或自己上傳。');
  };
  var setStep = (i, k, v) => onChange({
    ...bg,
    steps: steps.map((x, j) => j === i ? {
      ...x,
      [k]: v
    } : x)
  });
  var setEx = (i, k, v) => onChange({
    ...bg,
    steps: steps.map((x, j) => j === i ? {
      ...x,
      examples: x.examples.map((e, m) => m === k ? {
        ...e,
        en: v
      } : e)
    } : x)
  });
  var setOpt = (i, k, v) => onChange({
    ...bg,
    steps: steps.map((x, j) => j === i ? {
      ...x,
      options: x.options.map((o, m) => m === k ? v : o)
    } : x)
  });
  var delStep = i => onChange({
    ...bg,
    steps: steps.filter((_, j) => j !== i)
  });
  var upload = async (i, file) => {
    if (!file || !window.uploadFlashcardImage) return;
    try {
      setStep(i, 'img', await window.uploadFlashcardImage(file));
    } catch (e) {
      if (onErr) onErr('圖片上傳失敗：' + (e && e.message || '請換一張'));
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "rc-bg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rc-bg-top"
  }, /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: bg && bg.lead || '',
    placeholder: "\u958B\u5834\u767D\uFF08\u4E00\u53E5\u4E2D\u6587\uFF0C\u4F8B\u5982\uFF1A\u9019\u7BC7\u5728\u8B1B\u5357\u6975\u7684\u4F01\u9D5D\uFF09",
    onChange: e => onChange({
      ...bg,
      lead: e.target.value
    })
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-bg-redo",
    disabled: autoImg,
    onClick: autoFillImages
  }, autoImg ? '找圖中…' : '🖼️ AI 自動配圖'), onRedo && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-bg-redo",
    disabled: busy,
    onClick: onRedo
  }, busy ? '重新產生中…' : '🔄 重新產生')), steps.map((st, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "rc-q"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rc-q-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rc-n"
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    className: "rc-skilltag"
  }, st.kind === 'learn' ? '📖 學一個重點' : '👆 選一選'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-x",
    onClick: () => delStep(i)
  }, "\u2715")), st.kind === 'learn' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: st.say,
    onChange: e => setStep(i, 'say', e.target.value),
    placeholder: "\u4E00\u53E5\u4E2D\u6587\u91CD\u9EDE\uFF08\u8D8A\u7C21\u55AE\u8D8A\u597D\uFF09"
  }), (st.examples || []).map((ex, k) => /*#__PURE__*/React.createElement("input", {
    key: k,
    className: "rc-in",
    value: ex.en,
    onChange: e => setEx(i, k, e.target.value),
    placeholder: "\u82F1\u6587\u4F8B\u53E5"
  })), /*#__PURE__*/React.createElement("div", {
    className: "rc-bg-img"
  }, st.img ? /*#__PURE__*/React.createElement("img", {
    src: st.img,
    alt: "",
    className: "rc-bg-thumb"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "rc-bg-hint"
  }, "\u5EFA\u8B70\u653E\u7684\u5716\uFF1A", /*#__PURE__*/React.createElement("b", null, st.imgHint || '（你自己決定）')), /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: st.img || '',
    onChange: e => setStep(i, 'img', e.target.value),
    placeholder: "\u5716\u7247\u7DB2\u5740\uFF08\u53EF\u7559\u767D\uFF09"
  }), /*#__PURE__*/React.createElement("label", {
    className: "rc-bg-up"
  }, "\uD83D\uDCF7 \u4E0A\u50B3", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    hidden: true,
    onChange: e => {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      upload(i, f);
    }
  })), st.img && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-x",
    onClick: () => setStep(i, 'img', '')
  }, "\u79FB\u9664\u5716"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: st.q,
    onChange: e => setStep(i, 'q', e.target.value),
    placeholder: "\u554F\u984C"
  }), (st.options || []).map((o, k) => /*#__PURE__*/React.createElement("label", {
    key: k,
    className: 'rc-opt' + (st.answer === k ? ' on' : '')
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    checked: st.answer === k,
    onChange: () => setStep(i, 'answer', k)
  }), /*#__PURE__*/React.createElement("span", {
    className: "rc-opt-l"
  }, 'ABCD'[k]), /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: o,
    onChange: e => setOpt(i, k, e.target.value)
  }))), /*#__PURE__*/React.createElement("input", {
    className: "rc-in rc-why",
    value: st.why || '',
    onChange: e => setStep(i, 'why', e.target.value),
    placeholder: "\u4E2D\u6587\u89E3\u8AAA\uFF08\u7B54\u5C0D\u5F8C\u7D66\u5B78\u751F\u770B\uFF09"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "rc-note"
  }, "\u5B78\u751F\u8981\u628A\u9019\u5E7E\u6B65\u505A\u5B8C\uFF0C\u624D\u6703\u89E3\u9396\u5F8C\u9762\u7684\u984C\u76EE\uFF08\u8DDF \u270F\uFE0F \u51FA\u6587\u6CD5\u4E00\u6A23\uFF09\u3002"));
}
function ReadingGenModal({
  open,
  categories,
  defaultCat,
  perStudent,
  roster,
  defaultTitle,
  defaultText,
  onClose,
  onCreate
}) {
  var [nudgeCls, nudge] = useModalNudge(); // v461：點背景不關閉，只晃一下
  var SK = window.RC_SKILLS || {};
  var [title, setTitle] = useS('');
  var [text, setText] = useS('');
  var [cat, setCat] = useS(defaultCat || 'reading');
  var [grade, setGrade] = useS('g4');
  var [nMcq, setNMcq] = useS(10);
  var [nSa, setNSa] = useS(5);
  var [skills, setSkills] = useS({
    'problem-solution': true,
    'cause-effect': true,
    'sequence': true,
    'compare-contrast': true
  });
  /* v415（Alan：「這個也幫我多加額外的 reading skill 題目」）：
     跟上面那組不一樣——上面是「拖卡片的活動」，這裡是「選擇題，只是問的角度指定技巧」。 */
  var [qSkills, setQSkills] = useS({});
  var [qsN, setQsN] = useS(2);
  var [keepPassage, setKeepPassage] = useS(true);
  var [aiNote, setAiNote] = useS(''); // v445：這次的特別要求（直接寫給 AI）
  /* v436（Alan：「還缺少了一開始的 background 給學生的背景知識…希望跟 grammar 一樣有互動式學習」） */
  var [bg, setBg] = useS(true); // 要不要先教背景知識
  var [bgBusy, setBgBusy] = useS(false); // 校稿頁按「重新產生」時
  var [busy, setBusy] = useS(null); // { done, total, label }
  var [err, setErr] = useS('');
  var [res, setRes] = useS(null); // { mcq, sa, blocks }
  var [tab, setTab] = useS(0);
  var [assign, setAssign] = useS(true);
  var [due, setDue] = useS('');
  var [who, setWho] = useS([]);
  useE(() => {
    if (!open) return;
    setTitle(defaultTitle || '');
    setText(defaultText || ''); /* v517：💬 直接貼一篇文章進來就能出 */
    setCat(defaultCat || 'reading');
    setGrade('g4'); // v454
    setNMcq(10);
    setNSa(5);
    setKeepPassage(true);
    setBg(true);
    setBgBusy(false);
    setSkills({
      'problem-solution': true,
      'cause-effect': true,
      'sequence': true,
      'compare-contrast': true
    });
    setQSkills({});
    setQsN(2);
    setBusy(null);
    setErr('');
    setRes(null);
    setTab(0);
    setAssign(true);
    setWho([]);
    var d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    setDue(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }, [open]);
  if (!open) return null;
  var kinds = Object.keys(SK).filter(k => skills[k]);
  var QSK = window.RC_QSKILLS || {};
  var qKinds = Object.keys(QSK).filter(k => qSkills[k]);
  var words = text.trim() ? text.trim().split(/\s+/).length : 0;
  var ready = title.trim() && words >= 40 && (nMcq > 0 || nSa > 0 || kinds.length > 0 || qKinds.length > 0 && qsN > 0);
  var run = async () => {
    setErr('');
    setBusy({
      done: 0,
      total: Math.ceil(nMcq / 5) + (nSa ? 1 : 0) + kinds.length + (qsN ? qKinds.length : 0),
      label: '讀文章中'
    });
    try {
      /* v436：背景知識跟題目同時產生，而且各自成敗——背景失敗不能把整批題目拖下水
         （v429 出文法踩過同一個坑：Promise.all 一個失敗全部丟掉）。 */
      var [r, bgR] = await Promise.all([window.aiMakeReadingSet({
        passage: text,
        title: title.trim(),
        grade,
        mcq: nMcq,
        sa: nSa,
        skills: kinds,
        qSkills: qKinds,
        qSkillN: qsN,
        teacherNote: aiNote,
        onProgress: (done, total, label) => setBusy({
          done,
          total,
          label
        })
      }), bg && window.aiMakeReadingBackground ? window.aiMakeReadingBackground({
        passage: text,
        title: title.trim(),
        grade,
        teacherNote: aiNote
      }).then(v => ({
        v
      }), e => ({
        e
      })) : Promise.resolve(null)]);
      setRes({
        ...r,
        background: bgR && bgR.v || null
      });
      setTab(0);
      if (bg && bgR && bgR.e) setErr('背景知識這次沒有產生成功——題目都好了，可以在校稿頁按「🔄 重新產生」，或直接建立（不會上鎖）。');
    } catch (e) {
      setErr(e && e.message || 'AI 出題失敗，請再試一次。');
    }
    setBusy(null);
  };

  /* v415：選擇題有兩份（一般的 mcq、閱讀技巧題 skillQs），編輯 UI 完全一樣 →
     處理函式改成吃「哪一份」，不要把整段 JSX 複製第二遍。 */
  var updMcqIn = (key, i, k, v) => setRes(r => ({
    ...r,
    [key]: r[key].map((x, j) => j === i ? {
      ...x,
      [k]: v
    } : x)
  }));
  var updOptIn = (key, i, oi, v) => setRes(r => ({
    ...r,
    [key]: r[key].map((x, j) => j === i ? {
      ...x,
      options: x.options.map((o, k) => k === oi ? v : o)
    } : x)
  }));
  var delMcqIn = (key, i) => setRes(r => {
    var n = r[key].filter((_, j) => j !== i);
    if (!n.length) setTab(0);
    return {
      ...r,
      [key]: n
    };
  });
  var updSa = (i, k, v) => setRes(r => ({
    ...r,
    sa: r.sa.map((x, j) => j === i ? {
      ...x,
      [k]: v
    } : x)
  }));
  var delSa = i => setRes(r => {
    var n = r.sa.filter((_, j) => j !== i);
    if (!n.length) setTab(0);
    return {
      ...r,
      sa: n
    };
  });
  var updBlk = (i, nb) => setRes(r => ({
    ...r,
    blocks: r.blocks.map((x, j) => j === i ? nb : x)
  }));
  /* v436 背景知識：步驟的編輯交給共用的 BgStepsEditor（分段閱讀也用同一個），這裡只管「重新產生」 */
  var redoBg = async () => {
    setBgBusy(true);
    setErr('');
    try {
      var l = await window.aiMakeReadingBackground({
        passage: text,
        title: title.trim(),
        grade,
        teacherNote: aiNote
      });
      setRes(r => ({
        ...r,
        background: l
      }));
    } catch (e) {
      setErr('背景知識還是沒有產生成功，請再按一次；或直接建立（練習就不會上鎖）。');
    }
    setBgBusy(false);
  };
  var delBlk = i => setRes(r => ({
    ...r,
    blocks: r.blocks.filter((_, j) => j !== i)
  }));

  /* ⚠ 不要寫成 const AssignBox = () => … 再 <AssignBox/>（v380 踩過）：
     每次重繪都是新的元件型別，React 會整段拆掉重掛，勾第二個學生時第一個就點不到。 */
  var assignBox = () => /*#__PURE__*/React.createElement("div", {
    className: 'qs-assign' + (assign ? ' on' : '')
  }, /*#__PURE__*/React.createElement("label", {
    className: "qs-assign-head"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: assign,
    onChange: e => setAssign(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, "\u5EFA\u7ACB\u5F8C", /*#__PURE__*/React.createElement("b", null, "\u6574\u7D44\u76F4\u63A5\u6307\u6D3E"), "\uFF08\u9019\u7BC7\u6587\u7AE0\u7684\u7DF4\u7FD2\u4E00\u6B21\u6D3E\u51FA\u53BB\uFF09")), assign && (perStudent ? /*#__PURE__*/React.createElement("div", {
    className: "qs-who"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qs-who-bar"
  }, /*#__PURE__*/React.createElement("span", null, "\u6307\u6D3E\u7D66\uFF08", who.length, "/", (roster || []).length, "\uFF09"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setWho((roster || []).map(r => r.email))
  }, "\u5168\u9078"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setWho([])
  }, "\u5168\u4E0D\u9078")), /*#__PURE__*/React.createElement("div", {
    className: "qs-who-list"
  }, (roster || []).map(r => /*#__PURE__*/React.createElement("label", {
    key: r.email,
    className: 'qs-who-item' + (who.indexOf(r.email) >= 0 ? ' on' : '')
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: who.indexOf(r.email) >= 0,
    onChange: e => setWho(w => e.target.checked ? w.concat(r.email) : w.filter(x => x !== r.email))
  }), r.name || r.email)), !(roster || []).length && /*#__PURE__*/React.createElement("span", {
    className: "qs-who-empty"
  }, "\u540D\u55AE\u9084\u6C92\u8F09\u5165"))) : /*#__PURE__*/React.createElement("div", {
    className: "qs-due"
  }, /*#__PURE__*/React.createElement("label", null, "\u622A\u6B62\u65E5"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: due,
    onChange: e => setDue(e.target.value)
  }), /*#__PURE__*/React.createElement("span", {
    className: "qs-due-n"
  }, "\u6574\u7D44\u6703\u51FA\u73FE\u5728\u5B78\u751F\u7684\u300C\u4ECA\u5929\u7684\u4EFB\u52D9\u300D"))));
  var payload = () => ({
    title: title.trim(),
    cat,
    passage: keepPassage ? text.trim() : '',
    mcq: res.mcq,
    sa: res.sa,
    blocks: res.blocks,
    skillQs: res.skillQs || [],
    background: res.background && (res.background.steps || []).length ? res.background : null,
    assign: assign ? perStudent ? {
      students: who
    } : {
      dueDate: due
    } : null
  });

  // ───────────────────────── 設定畫面 ─────────────────────────
  if (!res) {
    return /*#__PURE__*/ /* v261 的教訓：出到一半點到背景會全部不見。出題中／校稿中一律不讓背景關閉。 */React.createElement("div", {
      className: "modal-backdrop",
      onClick: nudge
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal wide" + nudgeCls,
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "modal-head"
    }, /*#__PURE__*/React.createElement("h3", null, "\uD83D\uDCD6 \u51FA\u95B1\u8B80\u7406\u89E3 ", /*#__PURE__*/React.createElement("em", null, "\u8CBC\u6587\u5B57\u7A3F\uFF0C\u4E00\u6B21\u51FA\u9078\u64C7\u984C\uFF0B\u7C21\u7B54\uFF0B\u95B1\u8B80\u6280\u5DE7")), /*#__PURE__*/React.createElement("button", {
      className: "modal-close",
      "aria-label": "\u95DC\u9589",
      onClick: onClose
    }, "\u2715")), /*#__PURE__*/React.createElement("div", {
      className: "modal-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rc-two"
    }, /*#__PURE__*/React.createElement("label", {
      className: "rc-lab"
    }, "\u6587\u7AE0\u6A19\u984C\uFF08\u6703\u8B8A\u6210\u9019\u4E00\u7D44\u7684\u540D\u5B57\uFF09", /*#__PURE__*/React.createElement("input", {
      value: title,
      onChange: e => setTitle(e.target.value),
      placeholder: "\u4F8B\uFF1AWolf Island"
    })), /*#__PURE__*/React.createElement("label", {
      className: "rc-lab"
    }, "\u653E\u5230\u54EA\u500B\u5206\u985E", /*#__PURE__*/React.createElement("select", {
      value: cat,
      onChange: e => setCat(e.target.value)
    }, (categories || []).map(c => /*#__PURE__*/React.createElement("option", {
      key: c.id,
      value: c.id
    }, c.label || c.name || c.id))))), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\uD83D\uDCC4 \u6587\u7AE0\uFF0F\u5F71\u7247\u6587\u5B57\u7A3F"), /*#__PURE__*/React.createElement("textarea", {
      className: "rc-ta",
      rows: 9,
      value: text,
      onChange: e => setText(e.target.value),
      placeholder: '把整篇文章或 YouTube 逐字稿貼進來（英文）。\n有時間碼（0:04 之類）也沒關係，AI 會自己忽略。'
    }), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u76EE\u524D ", /*#__PURE__*/React.createElement("b", null, words), " \u500B\u5B57", words > 0 && words < 40 ? '（太短了，至少要 40 字）' : '', "\u3002 AI \u53EA\u6703\u8003\u6587\u7AE0\u88E1\u6709\u7684\u6771\u897F\uFF0C\u4E0D\u6703\u81EA\u5DF1\u52A0\u6599\u3002")), /*#__PURE__*/React.createElement("div", {
      className: "rc-two"
    }, /*#__PURE__*/React.createElement("label", {
      className: "rc-lab"
    }, "\u5B78\u751F\u5E74\u7D1A\uFF08\u6C7A\u5B9A\u7528\u5B57\u96E3\u5EA6\uFF09", /*#__PURE__*/React.createElement("select", {
      value: grade,
      onChange: e => setGrade(e.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: "g1"
    }, "G1 \u4E00\u5E74\u7D1A"), /*#__PURE__*/React.createElement("option", {
      value: "g2"
    }, "G2 \u4E8C\u5E74\u7D1A"), /*#__PURE__*/React.createElement("option", {
      value: "g3"
    }, "G3 \u4E09\u5E74\u7D1A"), /*#__PURE__*/React.createElement("option", {
      value: "g4"
    }, "G4 \u56DB\u5E74\u7D1A"), /*#__PURE__*/React.createElement("option", {
      value: "g5"
    }, "G5 \u4E94\u5E74\u7D1A"), /*#__PURE__*/React.createElement("option", {
      value: "g6"
    }, "G6 \u516D\u5E74\u7D1A"))), /*#__PURE__*/React.createElement("label", {
      className: "rc-lab"
    }, "\uD83D\uDCDD \u9078\u64C7\u984C", /*#__PURE__*/React.createElement("select", {
      value: nMcq,
      onChange: e => setNMcq(+e.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: 0
    }, "\u4E0D\u8981"), /*#__PURE__*/React.createElement("option", {
      value: 5
    }, "5 \u984C"), /*#__PURE__*/React.createElement("option", {
      value: 10
    }, "10 \u984C"), /*#__PURE__*/React.createElement("option", {
      value: 15
    }, "15 \u984C"), /*#__PURE__*/React.createElement("option", {
      value: 20
    }, "20 \u984C"))), /*#__PURE__*/React.createElement("label", {
      className: "rc-lab"
    }, "\uD83D\uDCD6 \u95B1\u8B80\u7C21\u7B54\uFF08AI \u6279\u6539\uFF09", /*#__PURE__*/React.createElement("select", {
      value: nSa,
      onChange: e => setNSa(+e.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: 0
    }, "\u4E0D\u8981"), /*#__PURE__*/React.createElement("option", {
      value: 3
    }, "3 \u984C"), /*#__PURE__*/React.createElement("option", {
      value: 5
    }, "5 \u984C"), /*#__PURE__*/React.createElement("option", {
      value: 8
    }, "8 \u984C"), /*#__PURE__*/React.createElement("option", {
      value: 10
    }, "10 \u984C")))), /*#__PURE__*/React.createElement("label", {
      className: 'rc-bgbox' + (bg ? ' on' : '')
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: bg,
      onChange: e => setBg(e.target.checked)
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "\uD83E\uDDE0 \u5148\u6559\u80CC\u666F\u77E5\u8B58"), "\uFF08\u4E92\u52D5\u5F0F\uFF1A\u8B80\u4E4B\u524D\u5148\u8A8D\u8B58\u4EBA\u3001\u5730\u3001\u95DC\u9375\u5B57\uFF0C\u5B78\u5B8C\u624D\u89E3\u9396\u984C\u76EE\uFF09", /*#__PURE__*/React.createElement("em", null, "AI \u6703\u4F9D\u6587\u7AE0\u6311 3~4 \u500B\u91CD\u9EDE\uFF0B\u5C0F\u6E2C\u9A57\uFF1B\u6BCF\u4E00\u6B65\u90FD\u53EF\u4EE5\u653E\u4F60\u81EA\u5DF1\u627E\u7684\u5716\u7247\u3002"))), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rc-qs-head"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label",
      style: {
        margin: 0
      }
    }, "\uD83C\uDFAF \u95B1\u8B80\u6280\u5DE7\u984C\uFF08\u9078\u64C7\u984C\u5F62\u5F0F\uFF0C\u6BCF\u7A2E\u5404\u51FA\u5E7E\u984C\uFF09"), /*#__PURE__*/React.createElement("select", {
      value: qsN,
      onChange: e => setQsN(+e.target.value),
      className: "rc-qs-n"
    }, [1, 2, 3, 4, 5].map(n => /*#__PURE__*/React.createElement("option", {
      key: n,
      value: n
    }, "\u6BCF\u7A2E ", n, " \u984C")))), /*#__PURE__*/React.createElement("div", {
      className: "rc-skills"
    }, Object.keys(QSK).map(k => /*#__PURE__*/React.createElement("label", {
      key: k,
      className: 'rc-skill rc-skill-q' + (qSkills[k] ? ' on' : '')
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!qSkills[k],
      onChange: e => setQSkills(s2 => ({
        ...s2,
        [k]: e.target.checked
      }))
    }), /*#__PURE__*/React.createElement("span", {
      className: "rc-skill-ico"
    }, QSK[k].ico), /*#__PURE__*/React.createElement("span", {
      className: "rc-skill-tx"
    }, /*#__PURE__*/React.createElement("b", null, QSK[k].en), /*#__PURE__*/React.createElement("em", null, QSK[k].zh))))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u52FE\u8D77\u4F86\u7684\u6703\u5408\u6210", /*#__PURE__*/React.createElement("b", null, "\u4E00\u500B"), "\u300C\u95B1\u8B80\u6280\u5DE7\u984C\u300D\u55AE\u5143\uFF08", qKinds.length ? `${qKinds.length} 種 × ${qsN} 題 = ${qKinds.length * qsN} 題` : '還沒勾', "\uFF09\u3002 \u9019\u662F", /*#__PURE__*/React.createElement("b", null, "\u9078\u64C7\u984C"), "\uFF0C\u8DDF\u4E0B\u9762\u90A3\u4E00\u5340\u300C\u62D6\u5361\u7247\u300D\u7684\u6D3B\u52D5\u4E0D\u4E00\u6A23\uFF0C\u5169\u500B\u53EF\u4EE5\u540C\u6642\u51FA\u3002")), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\uD83D\uDD0D \u95B1\u8B80\u6280\u5DE7\u6D3B\u52D5 Reading Skills\uFF08\u62D6\u5361\u7247\uFF0C\u5B78\u6821\u6703\u8003\u7684\u90A3\u5E7E\u7A2E\uFF09"), /*#__PURE__*/React.createElement("div", {
      className: "rc-skills"
    }, Object.keys(SK).map(k => /*#__PURE__*/React.createElement("label", {
      key: k,
      className: 'rc-skill' + (skills[k] ? ' on' : '')
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!skills[k],
      onChange: e => setSkills(s => ({
        ...s,
        [k]: e.target.checked
      }))
    }), /*#__PURE__*/React.createElement("span", {
      className: "rc-skill-ico"
    }, SK[k].ico), /*#__PURE__*/React.createElement("span", {
      className: "rc-skill-tx"
    }, /*#__PURE__*/React.createElement("b", null, SK[k].en), /*#__PURE__*/React.createElement("em", null, SK[k].zh))))), /*#__PURE__*/React.createElement("div", {
      className: "field-help"
    }, "\u52FE\u8D77\u4F86\u7684\u6703\u5408\u6210", /*#__PURE__*/React.createElement("b", null, "\u4E00\u500B"), "\u300C\u95B1\u8B80\u6280\u5DE7\u300D\u55AE\u5143\uFF0C\u5B78\u751F\u628A\u5361\u7247\u4E00\u5F35\u4E00\u5F35\u653E\u9032\u6B63\u78BA\u7684\u683C\u5B50\u3002")), /*#__PURE__*/React.createElement("label", {
      className: "rc-check"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: keepPassage,
      onChange: e => setKeepPassage(e.target.checked)
    }), /*#__PURE__*/React.createElement("span", null, "\u628A\u6587\u7AE0\u4E00\u8D77\u5B58\u9032\u53BB\uFF08\u5B78\u751F\u7DF4\u7FD2\u6642\u53EF\u4EE5\u6309 \uD83D\uDCD6 \u518D\u770B\u4E00\u6B21\uFF09")), /*#__PURE__*/React.createElement(AiNoteBox, {
      value: aiNote,
      onChange: setAiNote,
      examples: "\u591A\u554F\u4EBA\u7269\u7684\u5FC3\u60C5\uFF5C\u80CC\u666F\u77E5\u8B58\u53EA\u8981\u8B1B\u4F5C\u8005\u662F\u8AB0\uFF5C\u7C21\u7B54\u984C\u8981\u5B78\u751F\u5F15\u7528\u6587\u7AE0\u7684\u53E5\u5B50\uFF5C\u4E0D\u8981\u8003\u5E74\u4EFD\u6578\u5B57"
    }), assignBox(), err && /*#__PURE__*/React.createElement("div", {
      className: "notify-msg err",
      style: {
        marginTop: 10
      }
    }, "\u26A0\uFE0F ", err), busy && /*#__PURE__*/React.createElement("div", {
      className: "gr-busy"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gr-busy-bar"
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: busy.done / Math.max(1, busy.total) * 100 + '%'
      }
    })), /*#__PURE__*/React.createElement("span", null, "\u51FA\u984C\u4E2D\u2026 ", busy.done, "/", busy.total, " \xB7 ", busy.label))), /*#__PURE__*/React.createElement("div", {
      className: "modal-foot"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: onClose,
      disabled: !!busy
    }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: run,
      disabled: !ready || !!busy
    }, busy ? '出題中…' : `✨ 開始出題（${(nMcq ? 1 : 0) + (nSa ? 1 : 0) + (kinds.length ? 1 : 0) + (qKinds.length && qsN ? 1 : 0)} 個單元）`))));
  }

  // ───────────────────────── 校稿畫面 ─────────────────────────
  var bgSteps = res.background && res.background.steps || [];
  var tabs = [].concat(bgSteps.length ? [{
    k: 'bg',
    name: '🧠 背景知識',
    n: bgSteps.length
  }] : []).concat(res.mcq.length ? [{
    k: 'mcq',
    name: '📝 選擇題',
    n: res.mcq.length
  }] : []).concat((res.skillQs || []).length ? [{
    k: 'qs',
    name: '🎯 閱讀技巧題',
    n: res.skillQs.length
  }] : []).concat(res.sa.length ? [{
    k: 'sa',
    name: '📖 閱讀簡答',
    n: res.sa.length
  }] : []).concat(res.blocks.map((b, i) => ({
    k: 'b',
    i,
    name: (window.RC_SKILLS[b.kind] || {}).ico + ' ' + (window.RC_SKILLS[b.kind] || {}).zh,
    n: (b.chips || []).length
  })));
  var cur = tabs[Math.min(tab, Math.max(0, tabs.length - 1))];
  var nUnits = (bgSteps.length ? 1 : 0) + (res.mcq.length ? 1 : 0) + ((res.skillQs || []).length ? 1 : 0) + (res.sa.length ? 1 : 0) + (res.blocks.length ? 1 : 0);
  /* ⚠ 以前紅色的題目會被 rcBuildItems 靜靜濾掉——老師按了「建立 3 個單元」，
     結果少了 4 題也不會知道。改成擋住按鈕、直接說是哪一頁有問題。 */
  var badTabs = tabs.filter(t => t.k === 'mcq' ? res.mcq.some(q => !rcMcqOk(q)) : t.k === 'qs' ? (res.skillQs || []).some(q => !rcMcqOk(q)) : t.k === 'sa' ? res.sa.some(q => !String(q.question || '').trim() || !String(q.keyPoints || '').trim()) : !window.rcValidBlock(res.blocks[t.i]));
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop"
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal wide",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("h3", null, "\uD83D\uDCD6 \u6821\u7A3F \xB7 ", title, " ", /*#__PURE__*/React.createElement("em", null, "\u6539\u5B8C\u518D\u5EFA\u7ACB\u2014\u2014\u9019\u662F\u984C\u5EAB\uFF0C\u5B78\u751F\u6BCF\u6B21\u770B\u5230\u7684\u90FD\u662F\u9019\u4E00\u4EFD")), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    "aria-label": "\u95DC\u9589",
    onClick: onClose
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gr-tabs"
  }, tabs.map((t, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: i === tab ? 'active' : '',
    onClick: () => setTab(i)
  }, t.name, /*#__PURE__*/React.createElement("em", null, t.n)))), /*#__PURE__*/React.createElement("div", {
    className: "gr-proof"
  }, !cur ? /*#__PURE__*/React.createElement("div", {
    className: "rc-note"
  }, "\u9019\u6B21\u4EC0\u9EBC\u90FD\u6C92\u751F\u51FA\u4F86\uFF0C\u56DE\u4E0A\u4E00\u6B65\u518D\u8A66\u4E00\u6B21\u3002") : cur.k === 'bg' ? /*#__PURE__*/React.createElement(BgStepsEditor, {
    bg: res.background,
    busy: bgBusy,
    onRedo: redoBg,
    onErr: setErr,
    onChange: next => setRes(r => ({
      ...r,
      background: next
    }))
  }) : cur.k === 'mcq' || cur.k === 'qs' ? (() => {
    var key = cur.k === 'qs' ? 'skillQs' : 'mcq';
    var QS = window.RC_QSKILLS || {};
    return (res[key] || []).map((q, i) => {
      var opts = (q.options || []).map(o => String(o || '').trim());
      var bad = !rcMcqOk(q);
      var sk = QS[q.skill];
      return /*#__PURE__*/React.createElement("div", {
        key: q.id || i,
        className: 'rc-q' + (bad ? ' bad' : '')
      }, /*#__PURE__*/React.createElement("div", {
        className: "rc-q-head"
      }, /*#__PURE__*/React.createElement("span", {
        className: "rc-n"
      }, i + 1), /*#__PURE__*/React.createElement("span", {
        className: "rc-skilltag"
      }, sk ? `${sk.ico} ${sk.zh}` : q.skill || 'detail'), /*#__PURE__*/React.createElement("button", {
        type: "button",
        className: "rc-x",
        onClick: () => delMcqIn(key, i)
      }, "\u2715")), /*#__PURE__*/React.createElement("textarea", {
        className: "rc-in",
        rows: 2,
        value: q.q,
        onChange: e => updMcqIn(key, i, 'q', e.target.value),
        placeholder: "\u984C\u76EE\uFF08\u82F1\u6587\uFF09"
      }), opts.map((o, oi) => /*#__PURE__*/React.createElement("label", {
        key: oi,
        className: 'rc-opt' + (q.answer === oi ? ' on' : '')
      }, /*#__PURE__*/React.createElement("input", {
        type: "radio",
        checked: q.answer === oi,
        onChange: () => updMcqIn(key, i, 'answer', oi)
      }), /*#__PURE__*/React.createElement("span", {
        className: "rc-opt-l"
      }, 'ABCD'[oi]), /*#__PURE__*/React.createElement("input", {
        className: "rc-in",
        value: q.options[oi],
        onChange: e => updOptIn(key, i, oi, e.target.value)
      }))), /*#__PURE__*/React.createElement("input", {
        className: "rc-in rc-why",
        value: q.explain || '',
        onChange: e => updMcqIn(key, i, 'explain', e.target.value),
        placeholder: "\u4E2D\u6587\u89E3\u8AAA\uFF08\u7B54\u5B8C\u6703\u7D66\u5B78\u751F\u770B\uFF09"
      }), bad && /*#__PURE__*/React.createElement("div", {
        className: "rc-warn"
      }, "\u26A0 \u984C\u76EE\u3001\u56DB\u500B\u9078\u9805\u90FD\u8981\u586B\uFF0C\u9078\u9805\u4E0D\u53EF\u91CD\u8907\uFF0C\u800C\u4E14\u8981\u9078\u4E00\u500B\u6B63\u78BA\u7B54\u6848\u3002"));
    });
  })() : cur.k === 'sa' ? res.sa.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: q.id || i,
    className: 'rc-q' + (!q.question.trim() || !q.keyPoints.trim() ? ' bad' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "rc-q-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rc-n"
  }, i + 1), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rc-x",
    onClick: () => delSa(i)
  }, "\u2715")), /*#__PURE__*/React.createElement("textarea", {
    className: "rc-in",
    rows: 2,
    value: q.question,
    onChange: e => updSa(i, 'question', e.target.value),
    placeholder: "\u554F\u984C\uFF08\u82F1\u6587\uFF09"
  }), /*#__PURE__*/React.createElement("input", {
    className: "rc-in",
    value: q.keyPoints,
    onChange: e => updSa(i, 'keyPoints', e.target.value),
    placeholder: "\u7B54\u6848\u8981\u9EDE\uFF0C\u7528 / \u5206\u9694\u2014\u2014AI \u4F9D\u9019\u500B\u6C7A\u5B9A\u7D66\u5E7E\u9846\u661F"
  }))) : /*#__PURE__*/React.createElement(RsBlockEditor, {
    block: res.blocks[cur.i],
    onChange: nb => updBlk(cur.i, nb),
    onDelete: () => {
      delBlk(cur.i);
      setTab(0);
    }
  })), badTabs.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rc-warn",
    style: {
      marginTop: 12
    }
  }, "\u26A0 \u9019\u5E7E\u9801\u9084\u6709\u7D05\u8272\u7684\u984C\u76EE\u8981\u6539\u5B8C\u624D\u80FD\u5EFA\u7ACB\uFF1A", badTabs.map(t => t.name).join('、'), "\uFF08\u4E0D\u60F3\u6539\u5C31\u6309\u8A72\u984C\u7684 \u2715 \u522A\u6389\uFF09"), assignBox()), /*#__PURE__*/React.createElement("div", {
    className: "modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => setRes(null)
  }, "\u2190 \u91CD\u65B0\u8A2D\u5B9A"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: () => onCreate(payload()),
    disabled: !nUnits || badTabs.length > 0
  }, "\u5EFA\u7ACB ", nUnits, " \u500B\u55AE\u5143", assign ? '並指派' : '', " \u2192"))));
}

/* 把校稿完的東西變成週次裡的單元。
   order 不特別指定，讓 QM_TYPE_ORDER 的預設順序生效：
   選擇題(1) → 閱讀技巧(3.5) → 閱讀簡答(6)，剛好就是「先讀懂 → 練技巧 → 自己寫」。 */
function rcBuildItems({
  title,
  passage,
  mcq,
  sa,
  blocks,
  skillQs,
  background
}) {
  var stamp = Date.now();
  var rnd = () => Math.random().toString(36).slice(2, 5);
  var out = [];
  var g = title;
  /* v436：讀之前先教「背景知識」——跟 ✏️ 出文法同一套 lesson.steps，
     學完才解鎖後面的題目（requires），學生端播放器完全不用改。 */
  var bgSteps = (background && background.steps || []).map(window.gnValidStep).filter(Boolean);
  var bgId = bgSteps.length ? 'rc' + stamp + 'bg' + rnd() : null;
  if (bgId) {
    out.push({
      id: bgId,
      type: 'lesson',
      group: g,
      order: 0,
      brief: true,
      // v440：簡報式（重點一次看完）
      title: `${g} · 讀之前先知道`,
      zh: `背景知識 · ${bgSteps.length} 個重點 · 看完才開始讀`,
      lead: background && background.lead || '',
      steps: bgSteps,
      outro: background && background.outro || ''
    });
  }
  var req = bgId ? {
    requires: bgId
  } : {};
  var good = (mcq || []).filter(rcMcqOk);
  if (good.length) {
    out.push({
      id: 'rc' + stamp + 'qz' + rnd(),
      type: 'quiz',
      group: g,
      ...req,
      title: `${g} · 選擇題`,
      zh: `${good.length} 題 · 讀完文章選出正確答案`,
      shuffle: true,
      passage: passage || '',
      // v386: 學生在選擇題畫面按 📖 就能看文章
      questions: good.map((q, i) => ({
        id: 'q' + stamp + i + rnd(),
        q: String(q.q).trim(),
        options: q.options.map(o => String(o).trim()),
        answer: q.answer,
        explain: String(q.explain || '').trim()
      }))
    });
  }
  /* v415：閱讀技巧題自成一個單元——跟一般選擇題分開，老師才點得出來
     「這一份是專門練技巧的」，學生做完也知道自己在練什麼。 */
  var goodQS = (skillQs || []).filter(rcMcqOk);
  if (goodQS.length) {
    var QS = window.RC_QSKILLS || {};
    var kindsUsed = Array.from(new Set(goodQS.map(q => q.skill).filter(k => QS[k])));
    out.push({
      id: 'rc' + stamp + 'qs' + rnd(),
      type: 'quiz',
      group: g,
      ...req,
      title: `${g} · 閱讀技巧題`,
      zh: `${goodQS.length} 題 · ${kindsUsed.map(k => QS[k].zh).join('、') || '閱讀技巧'}`,
      shuffle: true,
      passage: passage || '',
      questions: goodQS.map((q, i) => ({
        id: 'qs' + stamp + i + rnd(),
        q: String(q.q).trim(),
        options: q.options.map(o => String(o).trim()),
        answer: q.answer,
        explain: String(q.explain || '').trim(),
        skill: q.skill || ''
      }))
    });
  }
  var useBlocks = (blocks || []).filter(b => b && (b.chips || []).filter(c => c && String(c.text || '').trim()).length >= 2);
  if (useBlocks.length) {
    // ⚠ 一定要走 rcFilterChips：因果題的 zones 要跟著卡片一起丟，不然答案會錯位
    var clean = useBlocks.map(b => window.rcFilterChips({
      ...b,
      chips: (b.chips || []).map(c => ({
        ...c,
        text: String(c && c.text || '').trim()
      }))
    }, c => !!c.text));
    var nChips = clean.reduce((n, b) => n + b.chips.length, 0);
    out.push({
      id: 'rc' + stamp + 'rs' + rnd(),
      type: 'reading-skill',
      group: g,
      ...req,
      title: `${g} · 閱讀技巧`,
      zh: `${clean.length} 種技巧 · ${nChips} 張卡片`,
      rsPassage: passage || '',
      rsBlocks: clean
    });
  }
  var goodSa = (sa || []).filter(q => q && String(q.question || '').trim());
  if (goodSa.length) {
    out.push({
      id: 'rc' + stamp + 'sa' + rnd(),
      type: 'short-answer',
      group: g,
      ...req,
      title: `${g} · 閱讀簡答`,
      zh: `${goodSa.length} 題 · 自己寫出答案，AI 批改`,
      passage: passage || '',
      saShowPassage: !!passage,
      // v386: 有貼文章就讓學生看得到（舊單元的 passage 一向只給 AI）
      saQuestions: goodSa.map((q, i) => ({
        id: 'sa' + stamp + i + rnd(),
        question: String(q.question).trim(),
        keyPoints: String(q.keyPoints || '').trim()
      }))
    });
  }
  return out;
}

/* ══ 📝 v513：考前複習包 ═══════════════════════════════════════════════════
   Alan：外師每 3 週、中師每 4 週一次 formative。pacingNextFormative 早就知道
   下一次在第幾週——缺的只是「那次考試涵蓋哪幾週、那幾週教過哪些字」。

   ⭐ 這裡刻意**不新寫一套出題 AI**：撈完字之後直接交給 QuickSetModal
     （一鍵出單字 7 種題型，而且 v466 的 avoid 會讓題目跟原本那幾週不一樣）。
     AI 做不好、程式做得準的那一段（算範圍、把字撈齊）才是這個元件在做的事。 */
function ExamPrepModal({
  open,
  side,
  pace,
  weeks,
  weekOrder,
  weekId,
  categories,
  onClose,
  onGenerate
}) {
  var [drop, setDrop] = useS({}); // 取消勾選的字（有些字他不想再考）
  useE(() => {
    if (open) setDrop({});
  }, [open, side]);
  if (!open) return null;
  var range = window.examRange ? window.examRange(pace, weekId, side) : null;
  var src = range && window.examSource ? window.examSource(weeks, weekOrder, range, categories) : {
    words: [],
    topics: [],
    weeks: [],
    dup: 0
  };
  var sideZh = side === 'it' ? '外師' : '中師';
  var keep = src.words.filter(w => !drop[w.term.toLowerCase()]);
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop ep-top",
    onClick: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ep-panel",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "ep-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "ep-kicker"
  }, "Exam Prep"), /*#__PURE__*/React.createElement("h3", null, "\uD83D\uDCDD ", sideZh, range ? ` ${range.name}` : '', " \u8003\u524D\u8907\u7FD2")), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), !range ? /*#__PURE__*/React.createElement("div", {
    className: "ep-none"
  }, "\u9019\u500B\u5E74\u7D1A\u7684\u9032\u5EA6\u8868\u4E0A\uFF0C", sideZh, "\u5F8C\u9762\u6C92\u6709\u6392 formative \u4E86\u3002") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ep-range"
  }, /*#__PURE__*/React.createElement("b", null, "\u7B2C ", range.from, "\u2013", range.to, " \u9031"), /*#__PURE__*/React.createElement("span", null, range.in === 0 ? '就是這週考' : `還有 ${range.in} 週`)), src.weeks.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "ep-none"
  }, "\u9019\u500B\u7BC4\u570D\u88E1\u9084\u6C92\u6709\u5EFA\u4EFB\u4F55\u55AE\u5143\u2014\u2014\u5148\u628A\u90A3\u5E7E\u9031\u7684\u8AB2\u5EFA\u8D77\u4F86\uFF0C\u9019\u88E1\u624D\u6488\u5F97\u5230\u5B57\u3002") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ep-weeks"
  }, src.weeks.map(w => /*#__PURE__*/React.createElement("span", {
    key: w.wid,
    className: 'ep-wk' + (w.n_words ? '' : ' empty')
  }, w.label, /*#__PURE__*/React.createElement("i", null, w.n_words ? `${w.n_words} 字` : '沒有單字')))), src.topics.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ep-topics"
  }, /*#__PURE__*/React.createElement("em", null, "\u6DB5\u84CB\u7684\u8AB2"), src.topics.slice(0, 10).map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "ep-words"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ep-words-h"
  }, /*#__PURE__*/React.createElement("b", null, keep.length, " \u500B\u5B57"), src.dup > 0 && /*#__PURE__*/React.createElement("span", null, "\uFF08\u8DE8\u9031\u91CD\u8907\u7684 ", src.dup, " \u500B\u5DF2\u7D93\u5408\u4F75\uFF09"), /*#__PURE__*/React.createElement("button", {
    className: "ep-all",
    onClick: () => setDrop({})
  }, "\u5168\u9078")), /*#__PURE__*/React.createElement("div", {
    className: "ep-chips"
  }, src.words.map(w => {
    var k = w.term.toLowerCase();
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      className: 'ep-chip' + (drop[k] ? ' off' : ''),
      onClick: () => setDrop(d => ({
        ...d,
        [k]: !d[k]
      })),
      title: w.zh || ''
    }, w.term);
  }))), /*#__PURE__*/React.createElement("button", {
    className: "ep-go",
    disabled: keep.length < 2,
    onClick: () => onGenerate({
      words: keep,
      title: `考前複習 · ${sideZh} ${range.name}`
    })
  }, keep.length < 2 ? '至少要 2 個字' : `🪄 用這 ${keep.length} 個字出一份複習題`), /*#__PURE__*/React.createElement("p", {
    className: "ep-note"
  }, "\u984C\u76EE\u4EA4\u7D66\u300C\u4E00\u9375\u51FA\u55AE\u5B57\u300D\u751F\u6210\u2014\u2014\u5B83\u6703\u907F\u958B\u90A3\u5E7E\u9031\u539F\u672C\u51FA\u904E\u7684\u53E5\u5B50\uFF0C\u6240\u4EE5\u662F**\u65B0\u984C\u76EE**\u4E0D\u662F\u91CD\u64AD\u3002"))))), document.body);
}
Object.assign(window, {
  AskPanel,
  ExamPrepModal,
  ExamScanModal,
  PacingImportModal,
  GrammarNotesModal,
  gnBuildItems,
  ReadingGenModal,
  rcBuildItems,
  RsBlockEditor,
  ReadingSkillEditor,
  rsBlankBlock,
  EditorModal,
  Footer,
  WeekModal,
  ExportModal,
  TermSetupModal,
  termWeekPlan,
  QuickSetModal,
  qsBuildItems,
  qsParseWords,
  qsBlank,
  GrammarGenModal,
  grBuildItems,
  ReviewGroupModal,
  WordStudyModal,
  wsBuildItems,
  WS_KINDS
}); // v482：📘 一鍵出 Word Study