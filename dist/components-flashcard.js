// components-flashcard.jsx — Flashcard system: Card / Learn / Test + image search

var {
  useState: useFC,
  useEffect: useFC_E
} = React;
var PIXABAY_KEY = "55964296-48988fd7e26a6999ecaff6b95";
var PEXELS_KEY = "ddCplPdhHd2AvScvkob1rxUHoz7UEoLk0yETCc6tdBZ3rlhR5Zwsjs4P";
var RETRY_GAP = 4; // wrong cards reappear after this many cards

/* ── Text-to-speech (v326: 英文用 OpenAI 真人聲音 window.speakTTS；中文自動退回瀏覽器語音) ── */
function speak(text, lang = 'en-US') {
  (window.speakTTS || window.speakText)(text, {
    lang
  });
}
function SpeakerBtn({
  text,
  lang = 'en-US',
  className = ""
}) {
  var [busy, setBusy] = React.useState(false); // v326: 產生 OpenAI 語音時顯示載入中
  var onClick = async e => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await (window.speakTTS || window.speakText)(text, {
        lang
      });
    } catch (err) {} finally {
      setBusy(false);
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    className: "fc-speaker-btn " + className + (busy ? " loading" : ""),
    onClick: onClick,
    title: "Listen \xB7 \u8046\u807D",
    "aria-label": "\u64AD\u653E\u767C\u97F3"
  }, /*#__PURE__*/React.createElement("svg", {
    "aria-hidden": "true",
    width: "17",
    height: "17",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15.54 8.46a5 5 0 0 1 0 7.07"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.07 4.93a10 10 0 0 1 0 14.14"
  })));
}

/* ── Dual progress bar (Quizlet-style) ── */
function DualProgressBar({
  correct,
  total
}) {
  var remaining = Math.max(0, total - correct);
  return /*#__PURE__*/React.createElement("div", {
    className: "fc-dual-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-dual-circle" + (correct > 0 ? " green" : "")
  }, correct), /*#__PURE__*/React.createElement("div", {
    className: "fc-dual-track"
  }, correct > 0 && /*#__PURE__*/React.createElement("div", {
    className: "fc-dual-seg-green",
    style: {
      flex: correct
    }
  }), remaining > 0 && /*#__PURE__*/React.createElement("div", {
    className: "fc-dual-seg-gray",
    style: {
      flex: remaining
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "fc-dual-circle"
  }, total));
}

/* ── Helpers ── */
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// choices are English terms (show Chinese → pick English)
function makeChoices(card, allCards) {
  var others = allCards.filter(c => c.id !== card.id);
  return shuffle([...shuffle(others).slice(0, Math.min(3, others.length)), card]);
}

// Split sentence around the term for fill-in-blank display
function splitSentence(sentence, term) {
  if (!sentence || !term) return null;
  var escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var m = sentence.match(new RegExp(escaped, 'i'));
  if (!m) return null;
  return [sentence.slice(0, m.index), sentence.slice(m.index + m[0].length)];
}
function fmtTime(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
var FILL_COLORS = ["#3b82f6", "#ef4444", "#f97316", "#22c55e"];
var THEMES = {
  classic: {
    name: "🎨 Classic",
    colors: ["#3b82f6", "#ef4444", "#f97316", "#22c55e"]
  },
  classroom: {
    name: "📚 Classroom",
    colors: ["#f59e0b", "#eab308", "#10b981", "#38bdf8"]
  },
  game: {
    name: "🎮 Video Game",
    colors: ["#92400e", "#92400e", "#92400e", "#92400e"]
  },
  ocean: {
    name: "🌊 Ocean",
    colors: ["#0369a1", "#0891b2", "#0284c7", "#1d4ed8"]
  },
  night: {
    name: "🌙 Night",
    colors: ["#7c3aed", "#dc2626", "#b45309", "#15803d"]
  }
};

/* ══════════════════════════════════════════════════════
   IMAGE SEARCH  (Pixabay)
══════════════════════════════════════════════════════ */
/* v442（Alan：「可以讓 AI 自己找給我？」）：拿 AI 給的關鍵字直接去免費圖庫抓第一張。
   跟下面 ImageSearch 用同一組 key／同樣的來源（Pexels 優先、Pixabay 備援），
   老師還是可以在校稿頁換掉或自己上傳。找不到就回 null——寧可沒有圖，也不要放錯的圖。 */
async function autoFindImage(keywords) {
  var q = String(keywords || '').trim();
  if (!q) return null;
  try {
    var r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1&page=1&locale=en-US`, {
      headers: {
        Authorization: PEXELS_KEY
      }
    });
    var d = await r.json();
    var hit = (d.photos || [])[0];
    if (hit && hit.src) return hit.src.large || hit.src.medium;
  } catch (e) {/* 換下一個來源 */}
  try {
    var _d = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(q)}&image_type=photo&safesearch=true&per_page=3&page=1`).then(x => x.json());
    var _hit = (_d.hits || [])[0];
    if (_hit) return _hit.webformatURL || _hit.previewURL;
  } catch (e) {/* 找不到就算了 */}
  return null;
}
function ImageSearch({
  term: initialTerm,
  onSelect,
  onClose
}) {
  var [q, setQ] = useFC(initialTerm || "");
  var [source, setSource] = useFC("pexels"); // 'pexels' | 'pixabay'
  var [results, setResults] = useFC([]);
  var [loading, setLoading] = useFC(false);
  var [page, setPage] = useFC(1);
  var [total, setTotal] = useFC(0);
  var [searched, setSearched] = useFC(false);
  var [error, setError] = useFC("");

  // v336: 圖庫找不到合適的圖 → 自己上傳／貼上
  var [mode, setMode] = useFC("search"); // 'search' | 'upload'
  var [busy, setBusy] = useFC(false);
  var [upErr, setUpErr] = useFC("");
  var [dragOver, setDragOver] = useFC(false);
  var [urlInput, setUrlInput] = useFC("");
  var fileRef = React.useRef(null);
  var PER_PAGE = 12;

  // 收到一個圖片檔（上傳鈕／拖曳／貼上都走這裡）→ 壓縮上傳 → 回傳網址
  var handleFile = async file => {
    if (!file) return;
    if (!/^image\//.test(file.type || "")) {
      setUpErr("這不是圖片檔（支援 JPG / PNG / GIF / WebP）");
      return;
    }
    setBusy(true);
    setUpErr("");
    try {
      var url = await window.uploadFlashcardImage(file);
      onSelect(url);
      onClose();
    } catch (e) {
      setUpErr(e && e.message ? e.message : "上傳失敗，請再試一次");
      setBusy(false);
    }
  };

  // 貼上圖片網址（右鍵複製圖片網址 → 貼過來）
  var useImageUrl = () => {
    var u = urlInput.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      setUpErr("請貼完整網址（要以 http:// 或 https:// 開頭）");
      return;
    }
    onSelect(u);
    onClose();
  };

  // Cmd/Ctrl+V 直接貼上剪貼簿裡的圖（截圖、複製的圖片都可以）
  useFC_E(() => {
    if (mode !== "upload") return;
    var onPaste = e => {
      var items = e.clipboardData && e.clipboardData.items || [];
      for (var it of items) {
        if (it.type && it.type.indexOf("image") === 0) {
          var f = it.getAsFile();
          if (f) {
            e.preventDefault();
            handleFile(f);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [mode]);
  var searchPexels = async (searchQ, pg) => {
    var url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQ)}&per_page=${PER_PAGE}&page=${pg}&locale=en-US`;
    var res = await fetch(url, {
      headers: {
        Authorization: PEXELS_KEY
      }
    });
    var data = await res.json();
    if (data.error) throw new Error(data.error);
    // normalise to {id, thumb, full, title}
    return {
      items: (data.photos || []).map(p => ({
        id: p.id,
        thumb: p.src.medium,
        full: p.src.large,
        title: p.alt || searchQ
      })),
      total: Math.min(data.total_results || 0, 500)
    };
  };
  var searchPixabay = async (searchQ, pg) => {
    var url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(searchQ)}&image_type=all&safesearch=true&per_page=${PER_PAGE}&page=${pg}`;
    var data = await fetch(url).then(r => r.json());
    return {
      items: (data.hits || []).map(p => ({
        id: p.id,
        thumb: p.previewURL,
        full: p.webformatURL,
        title: p.tags
      })),
      total: data.totalHits || 0
    };
  };
  var search = async (searchQ, pg = 1, src = source) => {
    if (!searchQ.trim()) return;
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      var {
        items,
        total: tot
      } = src === "pexels" ? await searchPexels(searchQ, pg) : await searchPixabay(searchQ, pg);
      setResults(items);
      setTotal(tot);
      setPage(pg);
    } catch (e) {
      setError("Search failed — try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
  var switchSource = src => {
    setSource(src);
    setResults([]);
    setSearched(false);
    setError("");
    setPage(1);
    if (q.trim()) search(q, 1, src);
  };
  useFC_E(() => {
    if (initialTerm) search(initialTerm, 1, "pexels");
  }, []);
  var canPrev = page > 1;
  var canNext = page * PER_PAGE < total;
  var SOURCES = [{
    id: "pexels",
    label: "Pexels",
    sub: "高品質照片"
  }, {
    id: "pixabay",
    label: "Pixabay",
    sub: "插圖 · 向量圖"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "img-search-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "img-search-panel",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "img-search-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 22
    }
  }, mode === "upload" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Upload ", /*#__PURE__*/React.createElement("em", null, "Image")) : /*#__PURE__*/React.createElement(React.Fragment, null, "Search ", /*#__PURE__*/React.createElement("em", null, "Images"))), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "img-mode-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: "img-mode-tab" + (mode === "search" ? " on" : ""),
    onClick: () => setMode("search")
  }, "\uD83D\uDD0D \u5716\u5EAB\u641C\u5C0B"), /*#__PURE__*/React.createElement("button", {
    className: "img-mode-tab" + (mode === "upload" ? " on" : ""),
    onClick: () => {
      setMode("upload");
      setUpErr("");
    }
  }, "\u2B06\uFE0F \u4E0A\u50B3\uFF0F\u8CBC\u4E0A")), mode === "upload" ? /*#__PURE__*/React.createElement("div", {
    className: "img-up-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "img-up-drop" + (dragOver ? " over" : "") + (busy ? " busy" : ""),
    onClick: () => !busy && fileRef.current && fileRef.current.click(),
    onDragOver: e => {
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: e => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
    }
  }, busy ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "img-up-ico"
  }, "\u23F3"), /*#__PURE__*/React.createElement("b", null, "\u4E0A\u50B3\u4E2D\u2026"), /*#__PURE__*/React.createElement("span", null, "\u5716\u7247\u8655\u7406\u4E2D\uFF0C\u8ACB\u7A0D\u5019")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "img-up-ico"
  }, "\uD83D\uDDBC\uFE0F"), /*#__PURE__*/React.createElement("b", null, "\u9EDE\u9019\u88E1\u9078\u64C7\u5716\u7247\uFF0C\u6216\u628A\u5716\u7247\u62D6\u9032\u4F86"), /*#__PURE__*/React.createElement("span", null, "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u6309 ", /*#__PURE__*/React.createElement("kbd", null, "\u2318"), "+", /*#__PURE__*/React.createElement("kbd", null, "V"), " \u8CBC\u4E0A\u622A\u5716\u6216\u8907\u88FD\u7684\u5716\u7247"))), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    style: {
      display: "none"
    },
    onChange: e => {
      handleFile(e.target.files && e.target.files[0]);
      e.target.value = "";
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "img-up-or"
  }, /*#__PURE__*/React.createElement("span", null, "\u6216\u8CBC\u4E0A\u5716\u7247\u7DB2\u5740")), /*#__PURE__*/React.createElement("div", {
    className: "img-search-bar"
  }, /*#__PURE__*/React.createElement("input", {
    className: "img-search-input",
    value: urlInput,
    placeholder: "https://\u2026\uFF08\u5728\u5716\u7247\u4E0A\u6309\u53F3\u9375\u2192\u8907\u88FD\u5716\u7247\u7DB2\u5740\uFF09",
    onChange: e => setUrlInput(e.target.value),
    onKeyDown: e => e.key === "Enter" && useImageUrl()
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      flexShrink: 0
    },
    onClick: useImageUrl,
    disabled: busy
  }, "\u4F7F\u7528")), upErr && /*#__PURE__*/React.createElement("div", {
    className: "img-search-status mono",
    style: {
      color: "var(--accent)"
    }
  }, upErr), /*#__PURE__*/React.createElement("div", {
    className: "img-up-hint"
  }, "\u5716\u7247\u6703\u81EA\u52D5\u7E2E\u5716\u5F8C\u5B58\u5230\u4F60\u7684\u96F2\u7AEF\u7A7A\u9593\uFF0C\u5B78\u751F\u5C31\u80FD\u770B\u5230\u3002\u5EFA\u8B70\u7528\u6709\u7248\u6B0A\u7684\u81EA\u88FD\u5716\u6216\u5408\u6CD5\u6388\u6B0A\u5716\u7247\u3002")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "img-source-tabs"
  }, SOURCES.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.id,
    className: "img-source-tab" + (source === s.id ? " active" : ""),
    onClick: () => switchSource(s.id)
  }, /*#__PURE__*/React.createElement("span", null, s.label), /*#__PURE__*/React.createElement("span", {
    className: "img-source-sub"
  }, s.sub)))), /*#__PURE__*/React.createElement("div", {
    className: "img-search-bar"
  }, /*#__PURE__*/React.createElement("input", {
    className: "img-search-input",
    value: q,
    onChange: e => setQ(e.target.value),
    onKeyDown: e => e.key === 'Enter' && search(q, 1),
    placeholder: "Search in English (e.g. escape, ancient Rome, bicycle)\u2026",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: () => search(q, 1),
    style: {
      flexShrink: 0
    }
  }, "Search")), loading && /*#__PURE__*/React.createElement("div", {
    className: "img-search-status mono"
  }, "Searching\u2026"), error && /*#__PURE__*/React.createElement("div", {
    className: "img-search-status mono",
    style: {
      color: "var(--accent)"
    }
  }, error), !loading && !error && searched && results.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "img-search-status mono"
  }, "No results \u2014 try another keyword."), /*#__PURE__*/React.createElement("div", {
    className: "img-search-grid"
  }, results.map(img => /*#__PURE__*/React.createElement("button", {
    key: img.id,
    className: "img-search-item",
    onClick: () => {
      onSelect(img.full);
      onClose();
    },
    title: img.title
  }, /*#__PURE__*/React.createElement("img", {
    src: img.thumb,
    alt: img.title,
    loading: "lazy"
  })))), total > PER_PAGE && /*#__PURE__*/React.createElement("div", {
    className: "img-search-pages"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => search(q, page - 1),
    disabled: !canPrev
  }, "\u2190 Prev"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: "var(--ink-muted)"
    }
  }, "Page ", page, " \xB7 ", total, " results"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => search(q, page + 1),
    disabled: !canNext
  }, "Next \u2192")))));
}

/* ══════════════════════════════════════════════════════
   FLASHCARD PLAYER
══════════════════════════════════════════════════════ */
/* v274: 星號（像 Quizlet）——不熟的字打 ★，可只練星號的；按帳號存本機 */
function fcStarStoreKey() {
  var u = window._currentUser;
  return 'alan-fc-stars' + (u && u.uid ? ':u:' + u.uid : ':anon');
}
function fcLoadStars(itemId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(fcStarStoreKey()) || '{}')[itemId] || []);
  } catch (e) {
    return new Set();
  }
}
function fcSaveStars(itemId, set) {
  try {
    var all = JSON.parse(localStorage.getItem(fcStarStoreKey()) || '{}');
    all[itemId] = Array.from(set);
    localStorage.setItem(fcStarStoreKey(), JSON.stringify(all));
  } catch (e) {}
}

/* v313 (#3): 跨週收集「學生標星的單字」——大廳「複習」卡用。
   資料來自 alan-fc-stars（每個單字卡單元存了哪些卡被標星），把散在各週的星號字彙整成一副複習牌。 */
function collectStarredWords(weeks) {
  var starMap = {};
  try {
    starMap = JSON.parse(localStorage.getItem(fcStarStoreKey()) || '{}');
  } catch (e) {}
  var itemById = {};
  Object.values(weeks || {}).forEach(w => Object.values(w && w.items || {}).forEach(arr => (arr || []).forEach(it => {
    if (it && it.type === 'flashcard' && it.id) itemById[it.id] = it;
  })));
  var out = [],
    seen = new Set();
  Object.entries(starMap).forEach(([itemId, cardIds]) => {
    var it = itemById[itemId];
    if (!it || !Array.isArray(it.cards)) return;
    (cardIds || []).forEach(cid => {
      var card = it.cards.find(c => c.id === cid);
      if (!card) return;
      var key = (card.term || '') + '|' + (card.zh || '');
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        ...card
      });
    });
  });
  return out;
}

/* v313 (#3): 複習標星單字的全螢幕視窗——大廳「複習」卡打開，重用 FlashcardPlayer 的四種練習模式 */
function ReviewFlashcardModal({
  words,
  onClose
}) {
  var item = {
    id: '__review__',
    title: '複習 · 我標星的字',
    cards: words || []
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "review-modal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "review-modal-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "review-modal-close",
    onClick: onClose,
    "aria-label": "\u5B8C\u6210\u8907\u7FD2\uFF0C\u56DE\u5927\u5EF3"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 15
  }), " \u5B8C\u6210\u8907\u7FD2"), /*#__PURE__*/React.createElement("span", {
    className: "review-modal-title"
  }, "\u2B50 \u8907\u7FD2 \xB7 ", (words || []).length, " \u500B\u6A19\u661F\u7684\u5B57"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 96
    },
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "review-modal-body"
  }, (words || []).length > 0 ? /*#__PURE__*/React.createElement(FlashcardPlayer, {
    item: item,
    onComplete: onClose
  }) : /*#__PURE__*/React.createElement("div", {
    className: "review-modal-empty"
  }, "\u76EE\u524D\u6C92\u6709\u6A19\u661F\u7684\u5B57\u3002", /*#__PURE__*/React.createElement("br", null), "\u7DF4\u55AE\u5B57\u5361\u6642\u9EDE\u4E00\u4E0B \u2605 \u628A\u4E0D\u719F\u7684\u5B57\u6A19\u8D77\u4F86\uFF0C\u5C31\u6703\u6536\u9032\u9019\u88E1\u8907\u7FD2\u3002")));
}

/* v274: 配對計時器獨立成小元件——原本每 100ms 重繪整個播放器，
   平板上點擊會被重繪吃掉（又 lag 又點不到離開鈕） */
function MatchTimer({
  startRef
}) {
  var [t, setT] = useFC(0);
  useFC_E(() => {
    var id = setInterval(() => {
      if (startRef.current) setT(Math.round((Date.now() - startRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(id);
  }, []);
  return /*#__PURE__*/React.createElement("span", {
    className: "fc-match-timer mono"
  }, t.toFixed(1), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, "s"));
}

/* v345: 配對格子「剛好塞滿一畫面」——舊版用 calc(100vh - 280px) 猜高度，
   猜太少 → 最後一列被切掉、要自己往下捲；iPad/iPhone 的 Safari 工具列會伸縮，
   100vh 更不準（Alan 回報 iPad 更嚴重）。改成直接量「格子上緣到視窗底部還剩多少」，
   並在轉向／工具列伸縮／版面位移時重算。 */
function MatchFitGrid({
  children
}) {
  var ref = React.useRef(null);
  useFitHeight(ref, true, 200); // v376: 跟單字卡／學習共用同一套（原本沒扣外層 padding，會多出一截）
  return /*#__PURE__*/React.createElement("div", {
    className: "fc-match-grid",
    ref: ref
  }, children);
}

/* v376（Alan：iPad 做練習要一直往下滑）：把 v345 配對格子的做法變成共用的。
   「一次看一張」的模式（單字卡／學習）改成「量出上緣到視窗底部還剩多少 → 設成高度」，
   剩下的空間由 CSS flex 分給圖片。為什麼不用 100dvh 算：
   上面有多少東西（站台 header、完成練習列、分頁列）會隨頁面與裝置變，
   而且 iPad Safari 的工具列會伸縮——量的才準。 */
function _fcScrollHost(el) {
  var n = el.parentElement;
  while (n && n !== document.documentElement) {
    var o = getComputedStyle(n).overflowY;
    if (o === 'auto' || o === 'scroll') return n;
    n = n.parentElement;
  }
  return document.documentElement;
}
function useFitHeight(ref, enabled, min) {
  React.useEffect(() => {
    var el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.minHeight = '';
      el.style.height = '';
      return;
    }

    /* ⚠⚠ v387（Alan：「單字卡會因為我上下滑動變大變小」）——這裡踩過的坑寫清楚，不要再改回去：
       舊版拿 `getBoundingClientRect().top` 當基準。那是「相對視窗」的座標，
       捲一下就變 → 算出來的高度跟著變 → 卡片肉眼可見地忽大忽小。
       還有兩個推手讓它一直重算：
         ① ResizeObserver 盯著 document.body：卡片一改高度 → body 高度變 →
            又觸發量測 → 又改高度＝自己餵自己的迴圈（桌機的抖動主要來自這個）。
         ② 手機／平板捲動時網址列會收合，visualViewport 的 resize 就噴事件 →
            每捲一下重算一次（手機的抖動來自這個）。
       現在的做法：
         · 基準改成「文件座標」(top + 捲動量) → 不管捲到哪，量到的都一樣。
         · 只有「真的換版面」才重算（寬度變了，或高度變超過 80px ＝轉向），
           網址列那種幾十 px 的伸縮一律忽略。
         · 拿掉 body 的 ResizeObserver，改用進場後的幾次補量（圖片/字體載入）。
       結果＝進來量一次就固定住，捲動不會再改變大小。 */
    var lastW = 0,
      lastH = 0,
      lastTop = -1,
      measured = false;
    var apply = () => {
      var vv = window.visualViewport;
      /* ⚠⚠ v406（Alan：「我放大圖片，卡片反而跟著變小」——iPad 與桌機都有）：
         雙指放大時 visualViewport.height 會大幅變小（那是「看得到的範圍」，不是版面變了），
         而這個函式就掛在 visualViewport 的 resize 上 → 一放大就把卡片重算成很矮的高度，
         等於「越想看清楚，東西越小」。放大中一律不重算，維持放大前的樣子。 */
      if (vv && vv.scale > 1.01) return;
      var vh = Math.round(vv && vv.height || window.innerHeight);
      var vw = Math.round(window.innerWidth);
      // 網址列伸縮＝高度小幅變動，不是換版面 → 不重算（這就是捲動會抖的元凶）
      if (measured && vw === lastW && Math.abs(vh - lastH) < 80) return;
      lastW = vw;
      lastH = vh;
      measured = true;
      var host = _fcScrollHost(el);
      el.style.minHeight = '';
      el.style.height = ''; // 先還原，才量得到自然位置
      var rect = el.getBoundingClientRect();
      // 「這一塊在畫面上從哪裡開始」——換算成不受捲動影響的值
      var top;
      if (host === document.documentElement) {
        top = rect.top + (window.scrollY || window.pageYOffset || 0);
      } else {
        var hb = host.getBoundingClientRect();
        top = hb.top + (rect.top - hb.top + host.scrollTop);
      }
      lastTop = top;
      // 手機橫著拿的時候整個視窗才 390px 高——底線也要跟著降，不然照樣要捲
      var floor = Math.min(min || 320, Math.round(vh * 0.55));
      var h = Math.max(floor, Math.round(vh - top - 10));
      var curH = parseFloat(el.style.height) || 0;
      /* ⚠⚠ v394：這裡本來設的是 height（固定高度）。
         那正是 Alan 回報「白色框框在捲」的根因：
         .fc-p-card / .fc-p-learn 有 overflow-y:auto，一旦內容比這個固定高度高，
         框框就自己捲起來。而「測驗」模式沒有用 useFitHeight ＝ 沒有固定高度 ＝
         框框跟著內容長，所以他說只有測驗不會捲——三個會捲的正好就是
         用了 useFitHeight 的那三個（單字卡 553／學習 603／配對 380）。
         改成 minHeight：畫面有空間時照樣撐滿一整屏（v376 的目的保留），
         內容真的比較高時就讓框框長出去、由頁面捲，框框本身永遠不捲。 */
      /* ⚠⚠ v395：v394 曾把這裡改成 minHeight，想解決「白框自己捲」——結果整張卡片垮掉。
         原因：.fc-face 是 position:absolute; inset:0（styles-flashcard.css:99），
         所以 .fc-flip-card 的「內容高度」是 0，父層必須有**確定的高度**才撐得出來。
         min-height 在內容比它高的時候就不是確定高度 → 翻卡區塌成一條、字掉到卡片外面
         （Alan 的 iPad／iPhone／電腦三張截圖都是這個樣子）。
         → 一定要用 height。捲動的問題改用「讓內容縮得下」來解，不能靠放寬容器。 */
      el.style.height = h + 'px';

      /* 外層通常還有 padding-bottom（例：.qm-quiz-area 桌機 32px、手機 84px）——
         光算「上緣到視窗底」還是會多出那一截，所以量一次剩下的溢出再扣掉。
         ⚠⚠ v405（Alan：「flashcard 還是會跟著捲動」）：這裡本來只看「捲動容器」的溢出。
            但 .qm-quiz-area 自己就是 overflow-y:auto ＝ 它被 _fcScrollHost 當成捲動容器，
            而它其實是「跟著內容一起長高」的（scrollHeight === clientHeight）→ 量到的溢出永遠是 0，
            它那 32px 的 padding-bottom 從來沒被扣掉，於是整頁多出 20~30px 可以捲。
            實測 1440×900：卡片底 890、視窗 900，但 .qm-quiz-area 到 922 → 頁面可捲 22px。
            改成「容器溢出」與「整頁溢出」取大的那個；扣完可能又冒出一點點，最多修兩輪。 */
      /* ⚠⚠ v431（Alan：「iPad 橫式格子太小啦 圖片也很小」）：這個倒扣以前是「無條件扣」，
         但頁面會溢出不一定是卡片造成的——iPad 橫式（1194×834）左邊的單元清單就有 913px 高，
         整頁比視窗高 162px。卡片被扣 162 → 再量還是 162（清單又沒變短）→ 再扣…
         一路扣到下限 360px 為止，實測明明有 612px 可以用。畫面上就是「卡片小一截、下面空一大塊」。
         改成「扣完要真的有效才算數」：扣一次、再量一次，溢出沒有跟著變少就還原回去。
         v405 要修的那種（.qm-quiz-area 的 padding-bottom 讓整頁多捲 22px）扣下去溢出會變少，行為不變。 */
      var measureOver = () => {
        var overHost = host === document.documentElement ? 0 : host.scrollHeight - host.clientHeight;
        var overDoc = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        return Math.max(overHost, overDoc);
      };
      for (var i = 0; i < 2; i++) {
        var over = measureOver();
        if (over <= 1) break;
        var next = Math.max(floor, h - over);
        if (next === h) break;
        el.style.height = next + 'px';
        if (measureOver() >= over - 2) {
          el.style.height = h + 'px';
          break;
        } // 縮了也沒用＝不是卡片造成的
        h = next;
      }

      /* 差不到 8px 就維持原值——避免進場那幾次補量被看成「卡片自己在跳」。
         ⚠ 這個比較一定要放在「扣完溢出」之後：先比再扣的話，每次重量都會先跳回
           未扣的值再扣回來，等於自己製造抖動（v405 之前就是先比再扣）。 */
      if (curH && Math.abs(curH - h) < 8) el.style.height = curH + 'px';
    };

    // 真的換版面才重量：轉向／改視窗大小
    var relayout = () => {
      measured = false;
      apply();
    };

    /* ⚠ v392：圖片是「晚一點才載完」的——載完之後內容才變成最終高度。
       v389 為了止住抖動改成「只有真的換版面才重算」，副作用就是
       這種「載入後才長高」的情況沒有人再去量一次 → 卡片高度停在舊值、
       內容溢出、學生就得捲（Alan 回報 iPad 一直有捲動問題，這是最可能的原因）。
       解法：只針對「這一塊裡面的圖片」掛 load 事件，載完重量一次。
       這跟被拿掉的 ResizeObserver(document.body) 不一樣——
       它不會因為「卡片自己改高度」而再次觸發，所以不會形成迴圈。 */
    var imgs = Array.from(el.querySelectorAll('img'));
    var onImg = () => relayout();
    imgs.forEach(im => {
      if (!im.complete) im.addEventListener('load', onImg, {
        once: true
      });
    });
    apply();
    /* 圖片還沒載完、字體還沒換好時量到的可能不準 → 進場後補量幾次。
       這幾次會強制重量（measured=false），之後就固定住。 */
    /* ⚠ v397（Alan：「還是有捲動改變容器大小的問題，但只有一開始的 1、2 秒」）
       就是這幾個補量。原本是 rAF + 150 + 600 + 1500ms，每一次都強制重量一次，
       所以進頁面後的頭 1.5 秒內只要畫面有任何變化，卡片就會被看到「跳一下」。
       兩個改法：
         ① 拿掉 1500ms 那一次——圖片現在有自己的 load 監聽會重量，不需要再猜。
         ② 只有「新高度和現在差 8px 以上」才真的套用；差幾 px 的微調肉眼看不出來，
            但套下去就是一次可見的跳動。 */
    var raf = requestAnimationFrame(relayout);
    var t1 = setTimeout(relayout, 150),
      t2 = setTimeout(relayout, 600),
      t3 = null;

    /* ⚠⚠ v431（Alan：「如果我一開始先收（側欄）再開始練習，就一樣是之前的樣子」）：
       上面那三次補量都在進場後 0.6 秒內結束，之後「量一次就固定」（v387 為了止住抖動）。
       代價是**量完之後版面才變**的情況永遠不會被修正：收合／展開側欄、字體晚載入、
       iPad 工具列伸縮，卡片就停在舊高度——看起來就是「怎麼又變小了」。
       這裡多一個只看「上緣」的守望：上緣用的是**文件座標**，捲動不會改變它
       （這正是 v387 改座標基準的目的），所以它一變就代表版面真的動了 → 重量一次。
       ⚠ 卡片自己改高度不會改變自己的上緣（它是由上往下排的）→ 不會變成自己餵自己的迴圈；
         真的遇到意外的來回，最多修 6 次就收手。 */
    /* ⚠⚠ v459（Alan：「平板橫式底下還有空位」）：這個預算本來是「一輩子只有 6 次」。
       防迴圈是對的，但它也讓「量完之後才變的版面」在用完 6 次之後**永遠**不會再修
       ——一節課下來學生會收合側欄、進出全螢幕、翻很多張卡、上面那條
       「還要完成：學習、測驗」做完一項就會變矮，每一件都會用掉一次。
       用完之後卡片就停在舊高度，畫面上正是「卡片小一截、下面空一塊」。
       改成「滾動式預算」：連續 6 次才算可疑；只要安靜超過 5 秒就把次數還回來。
       真正的自己餵自己迴圈會在那 5 秒內連續觸發 → 照樣被擋下來（行為不變），
       而「過了一分鐘才收合側欄」這種真實操作就修得到了。 */
    var fixes = 0,
      lastFixAt = 0;
    var FIX_WINDOW = 5000;
    var topNow = () => {
      var node = ref.current;
      if (!node) return -1;
      var host2 = _fcScrollHost(node);
      var r2 = node.getBoundingClientRect();
      if (host2 === document.documentElement) return r2.top + (window.scrollY || window.pageYOffset || 0);
      var hb2 = host2.getBoundingClientRect();
      return hb2.top + (r2.top - hb2.top + host2.scrollTop);
    };
    /* 可以用的高度也要看：上緣沒動、但下面變高變矮了（進出全螢幕、鍵盤收起來）
       一樣是「版面真的變了」。只比上緣會漏掉這一種。 */
    var roomNow = () => {
      var node = ref.current;
      if (!node) return -1;
      var host4 = _fcScrollHost(node);
      return host4 === document.documentElement ? Math.round(window.visualViewport && window.visualViewport.height || window.innerHeight) : Math.round(host4.clientHeight);
    };
    var lastRoom = -1;
    var recheck = () => {
      if (lastTop < 0) return;
      var now = Date.now();
      if (now - lastFixAt > FIX_WINDOW) fixes = 0; // v459：安靜夠久就把預算還回來
      if (fixes >= 6) return;
      var t = topNow(),
        room = roomNow();
      if (lastRoom < 0) lastRoom = room;
      var moved = t >= 0 && Math.abs(t - lastTop) >= 8;
      var roomed = room > 0 && Math.abs(room - lastRoom) >= 8;
      if (!moved && !roomed) return; // 上緣沒動、空間也沒變＝版面沒動（捲動不會改變它們）
      lastRoom = room;
      fixes++;
      lastFixAt = now;
      measured = false;
      apply();
    };
    /* 版面一變就立刻重量：ResizeObserver 盯的是「裝著它的那一塊」，
       ⚠ 不是盯 document.body（v387 拿掉那個是因為卡片自己改高度會再觸發自己＝迴圈）。
       這裡即使被自己的高度變化觸發也不會迴圈——recheck 只看上緣，
       而卡片是由上往下排的，改自己的高度不會改變自己的上緣。 */
    var ro = null;
    try {
      ro = new ResizeObserver(recheck);
      var host3 = _fcScrollHost(el);
      ro.observe(host3 === document.documentElement ? document.documentElement : host3);
    } catch (e) {
      ro = null;
    }
    var watch = setInterval(recheck, 700); // 保險（有些變化不會讓容器改變大小）
    window.addEventListener('resize', relayout);
    window.addEventListener('orientationchange', relayout);
    // visualViewport 的 resize 走 apply（不是 relayout）＝網址列伸縮會被上面的門檻擋掉
    if (window.visualViewport) window.visualViewport.addEventListener('resize', apply);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      if (t3) clearTimeout(t3);
      clearInterval(watch);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', relayout);
      window.removeEventListener('orientationchange', relayout);
      imgs.forEach(im => im.removeEventListener('load', onImg));
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', apply);
    };
  }, [enabled]);
}

/* ══════════════════════════════════════════════════════════════════════════
   v394：測驗模式「點小圖看大圖」燈箱（Alan：iPad 上題目旁邊那張圖太小看不清楚）
   ──────────────────────────────────────────────────────────────────────────
   結構照 styles-quiz-mode.css 的 .rs-pass-back / .rs-pass：暗底 fixed 蓋滿 + 置中面板。
   關閉方式三種：點暗底、按 Esc、按 ✕。

   ⚠ 這個元件只負責「看圖」：不碰任何作答／計分／進度的 state，也不會換題。
   ⚠ 本檔案有兩個既有的鍵盤監聽（document 的 1~4 作答／Enter 下一題、
      單字卡模式 window 的 ← → 空白鍵翻卡）。燈箱開著時按 Esc／Enter／空白鍵
      不可以順手把題目答掉，所以用下面這個模組層級旗標讓那兩個監聽先讓路
      （比把 state 傳進去乾淨，也不用改它們的 deps）。 */
var _fcZoomOpen = false; // v394: 圖片燈箱是否開著

function FcImageZoom({
  src,
  alt,
  onClose
}) {
  var closeRef = React.useRef(null);
  /* onClose 每次 render 都是新函式；用 ref 帶進 effect，effect 才能只跑一次
     （否則每次父層 re-render 都會重新搶焦點）。 */
  var onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  useFC_E(() => {
    _fcZoomOpen = true;
    var onKey = e => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation(); // capture 階段就攔下來，事件不會再往下傳給任何作答監聽
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey, true); // true = capture，比既有的 bubble 監聽先跑
    /* ⚠ v395（Alan：「打開之後題目會往上或往下滑，而且每次位置不一致」）
       兩個原因，兩個都要修：
       ① focus() 預設會把目標捲進視野——燈箱是 fixed，但瀏覽器仍會捲背後那一頁，
          所以每次打開，底下的題目就被推走一段，看起來位置都不一樣。
          → 用 focus({ preventScroll: true })。
       ② 背景沒有鎖住捲動，手指在暗底上滑動會連帶把底下的頁面捲掉。
          → 開燈箱時把 body 鎖住，關掉時原樣還原（含捲動位置）。 */
    var sy = window.scrollY || window.pageYOffset || 0;
    var prev = {
      pos: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow
    };
    document.body.style.position = 'fixed';
    document.body.style.top = -sy + 'px';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    if (closeRef.current) {
      try {
        closeRef.current.focus({
          preventScroll: true
        });
      } catch (e2) {
        closeRef.current.focus();
      }
    }
    return () => {
      _fcZoomOpen = false;
      // 還原背景捲動（含原本的位置，不然關掉會跳回最上面）
      document.body.style.position = prev.pos;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      document.body.style.overflow = prev.overflow;
      window.scrollTo(0, sy);
      document.removeEventListener('keydown', onKey, true);
    };
  }, []);

  /* 🔴 v461（Alan：「測驗模式放大圖片，圖片卻沒有跟著往下，停在第一題圖片的位置」）：
     .fc-zoom-back 明明是 position:fixed，卻不是以螢幕為基準——因為祖先
     .qm-quiz-swap 殘留了進場動畫的 transform（實測 matrix(1,0,0,1,0,8)）。
     只要祖先有 transform / filter / perspective，position:fixed 就改以它為基準，
     燈箱因此被釘在「那一整串題目」的最上面，看起來就是停在第一題那裡。
     跟 v433 裝扮室按不到是同一類問題，解法也一樣：createPortal 掛到 document.body，
     以後不管上層誰加了 transform 都不會再被綁架。 */
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "fc-zoom-back",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "\u653E\u5927\u5716\u7247",
    onClick: () => onCloseRef.current()
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-zoom-panel",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    ref: closeRef,
    className: "fc-zoom-x",
    onClick: () => onCloseRef.current(),
    "aria-label": "\u95DC\u9589\u653E\u5927\u5716\u7247"
  }, "\u2715"), /*#__PURE__*/React.createElement("img", {
    className: "fc-zoom-img",
    src: src,
    alt: alt || "",
    decoding: "async"
  }), alt && /*#__PURE__*/React.createElement("div", {
    className: "fc-zoom-cap"
  }, alt))), document.body);
}
function FlashcardPlayer({
  item,
  onComplete,
  onModeDone
}) {
  var cards = item.cards || [];
  var [mode, setMode] = useFC("card");

  /* v393：一進單元就把整份發音先抓好。
     實測（TTS 診斷）：Worker 每次都重新合成，一個字要等 0.9~2.3 秒，
     而且以前只有「聽寫」與「配對」會預抓，單字卡完全沒有 →
     學生每按一次小喇叭都在等。現在配合 data.js 的三層快取
     （記憶體 → Cache API → Worker），第二次之後幾乎是 0ms。
     ⚠ 這個 effect 一定要放在所有 hook 的中間、不能放在任何 early return 之後。 */
  React.useEffect(() => {
    if (!window.prefetchTts) return;
    var words = (item.cards || []).map(c => c && c.term).filter(Boolean);
    if (words.length) {
      try {
        window.prefetchTts(words);
      } catch (e) {}
    }
  }, [item.id]);

  // v376: 單字卡／學習兩個模式撐滿一畫面就好（見 useFitHeight）
  var cardFitRef = React.useRef(null);
  var learnFitRef = React.useRef(null);
  useFitHeight(cardFitRef, mode === 'card', 360);

  // v274: 星號標記＋「只練星號」
  var [stars, setStars] = useFC(() => fcLoadStars(item.id));
  var [starOnly, setStarOnly] = useFC(false);
  var [scopeStar, setScopeStar] = useFC(false); // v374: 這一輪是不是「只練星號」——只練星號不算完成
  var [testCards, setTestCards] = useFC([]); // v374: 這一輪測驗實際要考的字
  var toggleStar = cardId => setStars(prev => {
    var nx = new Set(prev);
    if (nx.has(cardId)) nx.delete(cardId);else nx.add(cardId);
    fcSaveStars(item.id, nx);
    return nx;
  });
  var pool = (flag = starOnly) => {
    var list = flag ? cards.filter(c => stars.has(c.id)) : cards;
    return list.length ? list : cards; // 星號被清空時退回全部
  };
  var [learnTotal, setLearnTotal] = useFC(cards.length);

  // v234: 學習模式鍵盤作答——1~4 選英文單字
  React.useEffect(() => {
    var onKey = e => {
      if (_fcZoomOpen) return; // v394: 圖片燈箱開著時一律不作答（按 Enter 只是要關燈箱）
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Enter') {
        // v274: 填空答錯後 Enter＝下一題
        // v392: 學習模式答完也有「下一題」了，Enter 一起支援（不然兩個模式的鍵盤操作不一致）
        var nx = document.querySelector('.fc-fill-next-row .btn, .fc-learn-next-row .btn');
        if (nx) nx.click();
        return;
      }
      if (!/^[1-4]$/.test(e.key)) return;
      // v274: 學習與填空模式都支援 1-4 鍵盤作答
      var btns = document.querySelectorAll('.fc-choices .fc-choice, .fc-fill-choices .fc-fill-btn');
      var b = btns[parseInt(e.key, 10) - 1];
      if (b) b.click();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Card mode
  var [cardIdx, setCardIdx] = useFC(0);
  var [flipped, setFlipped] = useFC(false);

  // Learn mode — queue-based spaced repetition
  /* ⚠ v439（Alan：「換下一張的時候會停在上一張的圖片一秒左右」）：
     <img> 的 src 換掉之後，瀏覽器**會繼續畫舊的那張**，直到新的解碼完成——
     所以看起來就是「卡在上一張」。兩件事一起做才會順：
       ① 這裡先把接下來幾張的圖抓進快取（換頁時通常已經在本機，不用等網路）
       ② 圖片本身加 key（見下面的 <img key=…>）＝ 換卡就是一個新節點，
          舊的畫面不會留著；配上快取＝新的幾乎是立刻出現。
     圖片是 Firebase Storage 上的固定網址（上傳時就設了一年快取），抓過就不會再下載。 */
  var preloadedRef = React.useRef(new Set());
  var preloadFrom = (i, ahead = 3) => {
    var list = pool();
    for (var k = 0; k <= ahead; k++) {
      var c = list[i + k];
      var u = c && c.imageUrl;
      if (!u || preloadedRef.current.has(u)) continue;
      preloadedRef.current.add(u);
      var im = new Image();
      im.decoding = 'async';
      im.src = u;
    }
  };
  var [learnQueue, setLearnQueue] = useFC([]); // [{card, isRetry}]
  /* v376: 「作答中」才量高度——按「再練一次」會重新掛一個 .fc-player，
     只看 mode 的話 enabled 沒變、效果不會重跑，新的那個就會沒有高度。 */
  useFitHeight(learnFitRef, mode === 'learn' && learnQueue.length > 0, 340);
  var [correctIds, setCorrectIds] = useFC(new Set());
  var [learnChoice, setLearnChoice] = useFC(null); // chosen card id
  var [learnChoices, setLearnChoices] = useFC([]);

  // Test mode
  var [testSetup, setTestSetup] = useFC(true);
  var [testType, setTestType] = useFC("choice"); // "choice" | "written" | "both"
  var [testChoices, setTestChoices] = useFC({});
  var [questionTypes, setQuestionTypes] = useFC({}); // cardId → "choice" | "written"
  var [testAnswers, setTestAnswers] = useFC({}); // cardId → chosen card id
  var [typedAnswers, setTypedAnswers] = useFC({}); // cardId → string
  var [testDone, setTestDone] = useFC(false);
  /* v394: 只是「現在放大顯示哪張圖」的畫面狀態（{src, alt}｜null）——
     不進任何作答資料、不影響 answeredCards／交卷條件。 */
  var [zoomImg, setZoomImg] = useFC(null);
  // v394: 切換模式時順手收掉燈箱，避免離開測驗又回來時它還開著
  useFC_E(() => {
    setZoomImg(null);
  }, [mode]);

  // Match mode
  var [matchTiles, setMatchTiles] = useFC([]);
  var [matchSelected, setMatchSelected] = useFC(null);
  var [matchMatched, setMatchMatched] = useFC(new Set());
  var [matchWrong, setMatchWrong] = useFC([]);
  var [matchElapsed, setMatchElapsed] = useFC(0);
  var [matchBest, setMatchBest] = useFC(null);
  var [matchDone, setMatchDone] = useFC(false);
  var [matchStarted, setMatchStarted] = useFC(false);
  var [isNewBest, setIsNewBest] = useFC(false);
  var matchStartRef = React.useRef(null);
  var matchTimerRef = React.useRef(null);

  // Fill-in-blank mode
  var [fillCards, setFillCards] = useFC([]);
  var [fillIdx, setFillIdx] = useFC(0);
  var [fillChoices, setFillChoices] = useFC([]);
  var [fillSelected, setFillSelected] = useFC(null);
  var [fillScore, setFillScore] = useFC(0);
  var [fillDone, setFillDone] = useFC(false);

  /* v392: 「自動跳下一題」的 setTimeout 統一用一個 ref 管理。
     以前 learn／fill 兩處都是裸 setTimeout：學生在延遲期間按返回或切分頁，
     timer 還是會跑完 → 寫進度、放特效、甚至連跳兩題。
     現在只要在「按鈕 onClick」「切模式」「unmount」三個入口都先 clearAuto() 就不會了。 */
  var autoRef = React.useRef(null);
  var clearAuto = () => {
    if (autoRef.current) {
      clearTimeout(autoRef.current);
      autoRef.current = null;
    }
  };

  // Cleanup timer on unmount（v392: 連自動跳題的 timer 一起清）
  useFC_E(() => () => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    if (autoRef.current) clearTimeout(autoRef.current);
  }, []);
  var stopMatchTimer = () => {
    if (matchTimerRef.current) {
      clearInterval(matchTimerRef.current);
      matchTimerRef.current = null;
    }
  };

  // v318 (#1): 「星號單字」＝獨立分頁。進其他分頁一律 setStarOnly(false) 重置＝不會再卡在只剩星號的（Alan 回報的 bug）。
  var enterCard = () => {
    stopMatchTimer();
    clearAuto();
    setStarOnly(false);
    setMode("card");
    setCardIdx(0);
    setFlipped(false);
  };
  var enterLearn = (flag = starOnly) => {
    stopMatchTimer();
    clearAuto();
    /* v405：這一輪的範圍旗標也要跟著更新。
       以前只有 enterTest／startScoped 會設 scopeStar，但結果頁的
       「再多練一點 →」「Practice Again」是直接呼叫 enterLearn()——
       學生只要在測驗時選過一次「只練星號」，scopeStar 就一直是 true，
       之後練整份也不算完成（Alan 回報的「都測完了卻沒顯示完成練習」）。 */
    setScopeStar(flag);
    var src = pool(flag);
    setLearnTotal(src.length);
    var order = shuffle([...src]);
    var queue = order.map(card => ({
      card,
      isRetry: false
    }));
    setLearnQueue(queue);
    setCorrectIds(new Set());
    setLearnChoice(null);
    setLearnChoices(queue.length > 0 ? makeChoices(queue[0].card, cards) : []);
    setMode("learn");
  };
  var enterTest = (onlyStar = false) => {
    stopMatchTimer();
    clearAuto();
    setScopeStar(onlyStar);
    setTestSetup(true);
    setTestAnswers({});
    setTypedAnswers({});
    setTestDone(false);
    setMode("test");
  };
  var startTest = () => {
    /* v374(#3)(#4): 依剛才選的範圍決定要考哪些字（干擾選項仍從全部單字挑，才不會變簡單）
       v405（Alan：「測驗竟然跟 flashcard 順序一樣，小朋友都可以背答案」）：
       這裡本來直接用 pool() 的原始順序 ＝ 跟單字卡的排列一模一樣，
       小朋友翻幾次卡就記得「第 3 張是 desert」，考試等於在背位置。
       學習模式本來就有 shuffle（enterLearn），測驗漏掉了——補上，每一輪都重新洗。 */
    var src = shuffle(pool(scopeStar));
    var tc = {};
    var qt = {};
    if (testType === "both") {
      var shuffled = shuffle([...src]);
      var half = Math.ceil(shuffled.length / 2);
      shuffled.forEach((card, i) => {
        qt[card.id] = i < half ? "choice" : "written";
      });
    }
    src.forEach(card => {
      tc[card.id] = makeChoices(card, cards);
      if (testType !== "both") qt[card.id] = testType;
    });
    setTestCards(src);
    setTestChoices(tc);
    setQuestionTypes(qt);
    setTestSetup(false);
  };
  var enterMatch = (flag = starOnly) => {
    stopMatchTimer();
    clearAuto();
    var best = null;
    try {
      best = parseFloat(localStorage.getItem('fc-match-' + item.id)) || null;
    } catch {}
    setMatchBest(best);
    // Pick 6 random pairs each round (shuffle for variety)
    var src = pool(flag); // v274: 星號池
    var picked = shuffle([...src]).slice(0, Math.min(6, src.length));
    var tiles = [];
    picked.forEach(card => {
      tiles.push({
        id: 'en-' + card.id,
        text: card.term,
        pairId: card.id,
        isZh: false,
        imageUrl: ''
      });
      tiles.push({
        id: 'zh-' + card.id,
        text: card.zh,
        pairId: card.id,
        isZh: true,
        imageUrl: card.imageUrl || ''
      });
    });
    setMatchTiles(shuffle(tiles));
    setMatchSelected(null);
    setMatchMatched(new Set());
    setMatchWrong([]);
    setMatchElapsed(0);
    setMatchDone(false);
    setMatchStarted(false);
    setIsNewBest(false);
    setMode("match");
  };
  var startMatch = () => {
    setMatchStarted(true);
    matchStartRef.current = Date.now();
    // v274: 計時顯示交給 <MatchTimer>（獨立元件自己 100ms 更新），
    // 父層不再每 0.1 秒重繪 → 點擊不再 lag、離開鈕一按就有反應
  };
  var handleMatchClick = tile => {
    if (matchWrong.length > 0) return;
    if (matchMatched.has(tile.pairId)) return;
    if (matchSelected === tile.id) {
      setMatchSelected(null);
      return;
    }
    if (!matchSelected) {
      setMatchSelected(tile.id);
      return;
    }
    var selTile = matchTiles.find(t => t.id === matchSelected);
    if (selTile && selTile.pairId === tile.pairId) {
      if (window.playSound) window.playSound('match');
      var newMatched = new Set([...matchMatched, tile.pairId]);
      setMatchMatched(newMatched);
      setMatchSelected(null);
      if (newMatched.size === matchTiles.length / 2) {
        stopMatchTimer();
        var elapsed = Math.round((Date.now() - matchStartRef.current) / 100) / 10;
        var prevBest = null;
        try {
          prevBest = parseFloat(localStorage.getItem('fc-match-' + item.id)) || null;
        } catch {}
        var nb = !prevBest || elapsed < prevBest;
        if (nb) {
          try {
            localStorage.setItem('fc-match-' + item.id, elapsed);
          } catch {}
        }
        setMatchElapsed(elapsed);
        setMatchBest(nb ? elapsed : prevBest);
        setIsNewBest(nb);
        setMatchDone(true);
        if (window.playSound) window.playSound('complete');
        // Speed match badge: finish under 20 seconds
        if (elapsed < 20) {
          var u = window._currentUser;
          if (u?.uid) window.unlockBadge && window.unlockBadge(u.uid, 'speed_match');
        }
      }
    } else {
      if (window.playSound) window.playSound('wrong');
      setMatchWrong([matchSelected, tile.id]);
      setTimeout(() => {
        setMatchWrong([]);
        setMatchSelected(null);
      }, 450); // v274: 縮短鎖定，節奏更順
    }
  };
  var enterFill = (flag = starOnly) => {
    stopMatchTimer();
    clearAuto();
    var src = pool(flag); // v274: 星號池
    var eligible = src.filter(c => c.example && c.example.trim());
    var fillPool = eligible.length >= 2 ? eligible : src;
    var shuffled = shuffle([...fillPool]);
    setFillCards(shuffled);
    setFillIdx(0);
    setFillScore(0);
    setFillSelected(null);
    setFillDone(false);
    setFillChoices(makeChoices(shuffled[0], cards));
    setMode("fill");
  };
  var handleFillChoice = chosen => {
    if (fillSelected) return;
    var card = fillCards[fillIdx];
    var correct = chosen.id === card.id;
    setFillSelected(chosen.id);
    // v344: 填空模式本來沒有音效（其他模式都有）——補上答對/答錯提示音
    if (window.playSound) window.playSound(correct ? 'correct' : 'wrong');
    if (correct) setFillScore(s => s + 1);
    if (!correct) return;
    // v392: 650ms → 1000ms（對齊全站統一節奏），並改成 ref 管理，才清得掉
    autoRef.current = setTimeout(() => {
      autoRef.current = null;
      goNextFill();
    }, window.autoNextMs ? window.autoNextMs(1000) : 1000); // v549：快 20%
  };
  var goNextFill = () => {
    clearAuto(); // v392: 學生自己按「下一題」時先收掉自動跳的 timer，避免連跳兩題
    var next = fillIdx + 1;
    if (next >= fillCards.length) {
      setFillDone(true);
    } else {
      setFillIdx(next);
      setFillChoices(makeChoices(fillCards[next], cards));
      setFillSelected(null);
    }
  };

  /* v372(#1): 單字卡模式用鍵盤 ← → 換卡、空白鍵翻卡（學生要求，不用一直點按鈕） */
  useFC_E(() => {
    if (mode !== 'card') return;
    var onKey = e => {
      if (_fcZoomOpen) return; // v394: 圖片燈箱開著時不換卡／不翻卡
      if (_fcZoomOpen) return; // v406: 大圖開著時，空白／方向鍵只給燈箱用，不要在背後翻卡
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCardIdx(i => Math.max(0, i - 1));
        setFlipped(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCardIdx(i => Math.min(i + 1, pool().length - 1));
        setFlipped(false);
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (t && t.closest && t.closest('input, textarea, button, a[href], [contenteditable="true"]')) return;
        e.preventDefault();
        setFlipped(f => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  /* v361: 「學習」與「填空」跑完各通知一次——集點用（兩個模式都完成才給星星） */
  /* v374(#4) 的規則不變：只練星號那一輪不算完成（避免用 2 個字就把整份刷掉）。
     v405 改判斷方式：本來看 scopeStar 這個旗標，但旗標會殘留（見 enterLearn 的註解）。
     改成看「這一輪實際練了幾張 vs 整份有幾張」——這是當下算出來的事實，不會過期。
     ⚠ 全部單字都被加星號時 learnTotal === cards.length，照樣算完成（他確實練完整份了）。 */
  var fullRound = n => n > 0 && n >= cards.length;
  useFC_E(() => {
    if (mode === "learn" && learnQueue.length === 0 && fullRound(learnTotal) && onModeDone) onModeDone("learn");
  }, [mode, learnQueue.length, learnTotal, cards.length]);

  /* v439：卡片模式——目前這張的前後都先抓好（開場抓 0~3，之後永遠領先 3 張） */
  useFC_E(() => {
    if (mode === 'card') preloadFrom(cardIdx);
  }, [mode, cardIdx, cards.length, starOnly]);
  /* 學習模式是排隊的，抓「現在這張＋接下來兩張」 */
  useFC_E(() => {
    if (mode !== 'learn') return;
    (learnQueue || []).slice(0, 3).forEach(q => {
      var u = q && q.card && q.card.imageUrl;
      if (!u || preloadedRef.current.has(u)) return;
      preloadedRef.current.add(u);
      var im = new Image();
      im.decoding = 'async';
      im.src = u;
    });
  }, [mode, learnQueue]);
  useFC_E(() => {
    if (mode === "fill" && fillDone && onModeDone) onModeDone("fill");
  }, [mode, fillDone]);

  /* v374(#3)：改成「進學習／測驗時先問要練哪些」——有星號單字才問，沒有就直接開始。
     （v372 的「⭐ 當開關、預設帶進所有模式」Alan 說不要。⭐ 分頁回到只看星號卡片。） */
  var [pendingMode, setPendingMode] = useFC(null); // 'learn' | 'test'
  var askScope = target => {
    clearAuto(); // v392: 從 learn/fill 中途切分頁時，先把待跑的自動跳題 timer 收掉
    if (stars.size === 0) {
      startScoped(target, false);
      return;
    }
    setPendingMode(target);
    setMode('scope');
  };
  var startScoped = (target, onlyStar) => {
    setPendingMode(null);
    setScopeStar(onlyStar);
    if (target === 'learn') enterLearn(onlyStar);else enterTest(onlyStar);
  };
  var enterStarred = () => {
    stopMatchTimer();
    clearAuto();
    setMode("card");
    setStarOnly(true);
    setCardIdx(0);
    setFlipped(false);
  };

  // v318 (#1): 保留「星號單字」為獨立分頁（Alan 要回來、只改名）——只在有星號時出現；
  // 點它＝只看星號的單字卡，點其他分頁一律重置回全部（不再卡住）。
  var ModeTabs = ({
    active
  }) => /*#__PURE__*/React.createElement("div", {
    className: "fc-mode-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: "fc-tab" + (active === "card" ? " active" : ""),
    onClick: enterCard
  }, "\uD83C\uDCCF \u55AE\u5B57\u5361"), /*#__PURE__*/React.createElement("button", {
    className: "fc-tab" + (active === "learn" ? " active" : ""),
    onClick: () => askScope('learn')
  }, "\uD83D\uDCD6 \u5B78\u7FD2"), /*#__PURE__*/React.createElement("button", {
    className: "fc-tab" + (active === "match" ? " active" : ""),
    onClick: () => enterMatch()
  }, "\u26A1 \u914D\u5C0D"), /*#__PURE__*/React.createElement("button", {
    className: "fc-tab" + (active === "test" ? " active" : ""),
    onClick: () => askScope('test')
  }, "\uD83D\uDCDD \u6E2C\u9A57"), stars.size > 0 && /*#__PURE__*/React.createElement("button", {
    className: "fc-tab fc-star-filter" + (active === "card" && starOnly ? " active" : ""),
    onClick: enterStarred,
    title: "\u53EA\u770B\u4F60\u6253\u661F\u865F\u7684\u55AE\u5B57\u5361"
  }, "\u2B50 \u661F\u865F\u55AE\u5B57\uFF08", stars.size, "\uFF09"));

  /* v374(#3)：範圍選擇畫面——有星號單字時，進學習／測驗前先問要練哪些 */
  if (mode === 'scope') {
    var target = pendingMode === 'test' ? '測驗' : '學習';
    return /*#__PURE__*/React.createElement("div", {
      className: "fc-wrap"
    }, /*#__PURE__*/React.createElement(ModeTabs, {
      active: pendingMode
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-player"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-scope"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-scope-title serif"
    }, target, "\u54EA\u4E9B\u55AE\u5B57\uFF1F"), /*#__PURE__*/React.createElement("div", {
      className: "fc-scope-sub mono"
    }, "\u4F60\u6A19\u4E86 ", stars.size, " \u500B\u661F\u865F\u55AE\u5B57"), /*#__PURE__*/React.createElement("button", {
      className: "fc-scope-btn",
      onClick: () => startScoped(pendingMode, false)
    }, /*#__PURE__*/React.createElement("b", null, "\u5168\u90E8 ", cards.length, " \u500B"), /*#__PURE__*/React.createElement("span", null, "\u5B8C\u6574\u8DD1\u4E00\u8F2A\u624D\u7B97\u5B8C\u6210\uFF0C\u4E5F\u624D\u62FF\u5F97\u5230\u661F\u661F")), /*#__PURE__*/React.createElement("button", {
      className: "fc-scope-btn ghost",
      onClick: () => startScoped(pendingMode, true)
    }, /*#__PURE__*/React.createElement("b", null, "\u53EA\u7DF4\u661F\u865F\u7684 ", stars.size, " \u500B"), /*#__PURE__*/React.createElement("span", null, "\u5FEB\u901F\u8907\u7FD2\u4E0D\u719F\u7684\u5B57 \xB7 \u9019\u4E00\u8F2A\u4E0D\u8A08\u5165\u5B8C\u6210")))));
  }
  if (cards.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "fc-wrap"
    }, /*#__PURE__*/React.createElement(ModeTabs, {
      active: "card"
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-empty mono"
    }, "No cards in this set \xB7 \u5C1A\u672A\u65B0\u589E\u5361\u7247"));
  }

  /* ────────────────── CARD MODE ────────────────── */
  if (mode === "card") {
    var deck = pool(); // v274: 星號濾鏡也作用在卡片模式
    var safeIdx = Math.min(cardIdx, deck.length - 1);
    var card = deck[safeIdx];
    return /*#__PURE__*/React.createElement("div", {
      className: "fc-wrap"
    }, /*#__PURE__*/React.createElement(ModeTabs, {
      active: "card"
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-player fc-p-card",
      ref: cardFitRef
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-topbar"
    }, /*#__PURE__*/React.createElement("span", {
      className: "mono"
    }, safeIdx + 1, " / ", deck.length), /*#__PURE__*/React.createElement("div", {
      className: "fc-progress-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-progress-fill",
      style: {
        width: `${(safeIdx + 1) / deck.length * 100}%`
      }
    }))), /*#__PURE__*/React.createElement("div", {
      className: "fc-flip-card" + (flipped ? " flipped" : ""),
      onClick: () => setFlipped(f => !f),
      role: "button",
      tabIndex: 0,
      "aria-pressed": flipped,
      "aria-label": flipped ? '看正面' : '翻到背面'
    }, /*#__PURE__*/React.createElement("button", {
      className: "fc-card-star" + (stars.has(card.id) ? " on" : ""),
      onClick: e => {
        e.stopPropagation();
        toggleStar(card.id);
      },
      "aria-label": stars.has(card.id) ? '取消星號' : '標記為不熟',
      title: "\u4E0D\u719F\u7684\u5B57\u6253\u661F\u865F\uFF0C\u5927\u5EF3\u53EF\u4EE5\u8907\u7FD2\u6240\u6709\u6A19\u661F\u7684\u5B57"
    }, stars.has(card.id) ? '★' : '☆'), /*#__PURE__*/React.createElement("div", {
      className: "fc-flip-inner"
    }, /*#__PURE__*/React.createElement("div", {
      className: `fc-face fc-front ${flipped ? "is-hidden" : "is-visible"}`,
      style: {
        opacity: flipped ? 0 : 1,
        visibility: flipped ? 'hidden' : 'visible',
        pointerEvents: flipped ? 'none' : 'auto',
        transform: flipped ? 'translateY(-4px)' : 'translateY(0)'
      }
    }, /*#__PURE__*/React.createElement(SpeakerBtn, {
      text: card.term,
      lang: "en-US",
      className: "fc-face-speaker"
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-term serif"
    }, card.term), /*#__PURE__*/React.createElement("div", {
      className: "fc-flip-hint mono"
    }, "tap to reveal \xB7 \u9EDE\u64CA\u986F\u793A")), /*#__PURE__*/React.createElement("div", {
      className: `fc-face fc-back ${flipped ? "is-visible" : "is-hidden"}`,
      style: {
        opacity: flipped ? 1 : 0,
        visibility: flipped ? 'visible' : 'hidden',
        pointerEvents: flipped ? 'auto' : 'none',
        transform: flipped ? 'translateY(0)' : 'translateY(6px)'
      }
    }, /*#__PURE__*/React.createElement(SpeakerBtn, {
      text: card.zh,
      lang: "zh-TW",
      className: "fc-face-speaker fc-face-speaker-dark"
    }), card.imageUrl && /*#__PURE__*/React.createElement("div", {
      className: "fc-back-img-wrap"
    }, /*#__PURE__*/React.createElement("img", {
      key: card.imageUrl,
      src: card.imageUrl,
      alt: card.zh,
      decoding: "async",
      fetchpriority: "high",
      className: "fc-img-zoomable",
      role: "button",
      tabIndex: flipped ? 0 : -1,
      "aria-label": "放大圖片：" + card.zh,
      title: "\u9EDE\u4E00\u4E0B\u770B\u5927\u5716",
      onClick: e => {
        e.stopPropagation();
        setZoomImg({
          src: card.imageUrl,
          alt: card.zh
        });
      },
      onKeyDown: e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        setZoomImg({
          src: card.imageUrl,
          alt: card.zh
        });
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "fc-zh"
    }, card.zh), card.example && /*#__PURE__*/React.createElement("div", {
      className: "fc-example serif-i"
    }, "\"", card.example, "\"")))), /*#__PURE__*/React.createElement("div", {
      className: "fc-nav"
    }, /*#__PURE__*/React.createElement("button", {
      className: "fc-nav-btn",
      onClick: () => {
        setCardIdx(i => Math.max(0, i - 1));
        setFlipped(false);
      },
      disabled: safeIdx === 0
    }, "\u2190 \u4E0A\u4E00\u5F35"), /*#__PURE__*/React.createElement("div", {
      className: "fc-dots"
    }, deck.map((_, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "fc-dot" + (i === safeIdx ? " active" : ""),
      onClick: () => {
        setCardIdx(i);
        setFlipped(false);
      }
    }))), /*#__PURE__*/React.createElement("button", {
      className: "fc-nav-btn",
      onClick: () => {
        setCardIdx(i => i + 1);
        setFlipped(false);
      },
      disabled: safeIdx === deck.length - 1
    }, "\u4E0B\u4E00\u5F35 \u2192"))), zoomImg && /*#__PURE__*/React.createElement(FcImageZoom, {
      src: zoomImg.src,
      alt: zoomImg.alt,
      onClose: () => setZoomImg(null)
    }));
  }

  /* ────────────────── LEARN MODE ────────────────── */
  if (mode === "learn") {
    // Done
    if (learnQueue.length === 0) {
      return /*#__PURE__*/React.createElement("div", {
        className: "fc-wrap"
      }, /*#__PURE__*/React.createElement(ModeTabs, {
        active: "learn"
      }), /*#__PURE__*/React.createElement("div", {
        className: "fc-player"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-complete"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-complete-icon"
      }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("div", {
        className: "fc-complete-title serif"
      }, "All Learned!"), /*#__PURE__*/React.createElement("div", {
        className: "fc-complete-meta mono"
      }, correctIds.size, " / ", learnTotal, " mastered"), /*#__PURE__*/React.createElement("div", {
        className: "fc-complete-note"
      }, onComplete ? 'Ready for quiz · 可以開始測驗了' : 'Nice work · 再複習一次會更熟'), /*#__PURE__*/React.createElement("div", {
        className: "fc-complete-actions"
      }, /*#__PURE__*/React.createElement("button", {
        className: "btn ghost",
        onClick: () => enterLearn()
      }, "Practice Again"), /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        onClick: onComplete || enterTest
      }, onComplete ? '開始測驗 · Start Quiz →' : 'Take Test →')))));
    }
    var {
      card: _card,
      isRetry
    } = learnQueue[0];

    // 這一題答了沒？答對了沒？（給回饋區與「下一題」按鈕用）
    var answeredCorrect = learnChoice === _card.id;

    /* v392: 原本 learnQueue 重排邏輯是寫在 setTimeout 裡的，答對答錯共用一條 timer。
       現在原封不動抽成 goNextLearn()——RETRY_GAP 與 correctIds 的寫入時機完全沒動，
       只是改成「由誰觸發」：答對＝1 秒後自動或學生自己按，答錯＝一定要學生自己按。 */
    var goNextLearn = wasCorrect => {
      clearAuto(); // 學生自己按「下一題」時先收掉待跑的 timer，否則會連跳兩題（v375 踩過的坑）
      var rest = learnQueue.slice(1);
      var newQueue;
      if (wasCorrect) {
        newQueue = rest;
        setCorrectIds(prev => new Set([...prev, _card.id]));
      } else {
        newQueue = [...rest];
        var insertPos = Math.min(RETRY_GAP, newQueue.length);
        newQueue.splice(insertPos, 0, {
          card: _card,
          isRetry: true
        });
      }
      setLearnQueue(newQueue);
      if (newQueue.length > 0) setLearnChoices(makeChoices(newQueue[0].card, cards));
      setLearnChoice(null);
    };
    var handleLearnChoice = chosen => {
      if (learnChoice) return;
      setLearnChoice(chosen.id);
      var correct = chosen.id === _card.id;
      if (window.playSound) window.playSound(correct ? 'correct' : 'wrong');

      /* v392（全站唯一「答錯也自動跳」的地方，改掉）：
         答錯 → 完全不排 timer，停在原地把正確答案show出來，等學生自己按「下一題」。
         答對 → 還是自動跳，但 700ms 提到 1000ms 對齊全站節奏；同時也給按鈕讓快的學生先走。 */
      if (!correct) return;
      autoRef.current = setTimeout(() => {
        autoRef.current = null;
        goNextLearn(true);
      }, window.autoNextMs ? window.autoNextMs(1000) : 1000); // v549：快 20%
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "fc-wrap"
    }, /*#__PURE__*/React.createElement(ModeTabs, {
      active: "learn"
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-player fc-p-learn",
      ref: learnFitRef
    }, /*#__PURE__*/React.createElement(DualProgressBar, {
      correct: correctIds.size,
      total: learnTotal
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-learn-q"
    }, /*#__PURE__*/React.createElement("button", {
      className: "fc-star-btn fc-star-btn-corner" + (stars.has(_card.id) ? " on" : ""),
      onClick: () => toggleStar(_card.id),
      "aria-label": stars.has(_card.id) ? '取消星號' : '標記為不熟',
      title: "\u4E0D\u719F\u7684\u5B57\u6253 \u2605"
    }, "\u2605"), isRetry && /*#__PURE__*/React.createElement("div", {
      className: "fc-retry-badge mono"
    }, "\u518D\u8A66\u4E00\u6B21\u5427 \xB7 Try again"), _card.imageUrl && /*#__PURE__*/React.createElement("img", {
      key: _card.imageUrl,
      src: _card.imageUrl,
      alt: _card.zh,
      className: "fc-learn-img",
      decoding: "async",
      fetchpriority: "high"
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-learn-zh"
    }, _card.zh), /*#__PURE__*/React.createElement("div", {
      className: "mono",
      style: {
        fontSize: 10,
        color: "var(--ink-muted)",
        marginTop: 10
      }
    }, "Choose the English word \xB7 \u9078\u51FA\u6B63\u78BA\u82F1\u6587\u55AE\u5B57")), /*#__PURE__*/React.createElement("div", {
      className: "fc-choices"
    }, learnChoices.map((c, i) => {
      var cls = "fc-choice";
      if (learnChoice) {
        if (c.id === _card.id) cls += " correct";else if (c.id === learnChoice) cls += " wrong";else cls += " dimmed";
      }
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        className: cls,
        onClick: () => handleLearnChoice(c)
      }, c.term, learnChoice && c.id === _card.id && /*#__PURE__*/React.createElement("span", {
        className: "fc-choice-badge"
      }, "\u2713"), learnChoice && c.id === learnChoice && c.id !== _card.id && /*#__PURE__*/React.createElement("span", {
        className: "fc-choice-badge"
      }, "\u2717"));
    }), learnChoice && /*#__PURE__*/React.createElement("div", {
      className: "fc-learn-next-row",
      style: {
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 2,
        padding: "10px 12px",
        borderRadius: 12,
        /* 顏色用全站「答對／答錯的唯一真相」那一組（styles-tune.css 的 --ok / --no），
           不要自己調色，對比度是驗算過的 */
        border: "2px solid " + (answeredCorrect ? "var(--ok)" : "var(--no)"),
        background: answeredCorrect ? "var(--ok-bg)" : "var(--no-bg)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: 8,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 10,
        color: answeredCorrect ? "var(--ok-ink)" : "var(--no-ink)"
      }
    }, answeredCorrect ? '答對了' : '正確答案'), /*#__PURE__*/React.createElement("b", {
      style: {
        fontSize: 20,
        lineHeight: 1.15,
        overflowWrap: "anywhere",
        color: answeredCorrect ? "var(--ok-ink)" : "var(--no-ink)"
      }
    }, _card.term), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--ink-muted)",
        overflowWrap: "anywhere"
      }
    }, _card.zh)), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      style: {
        flex: "0 0 auto"
      },
      onClick: () => goNextLearn(answeredCorrect)
    }, "\u4E0B\u4E00\u984C \u2192")))));
  }

  /* ────────────────── TEST MODE ────────────────── */
  if (mode === "test") {
    /* Setup screen */
    if (testSetup) {
      var hasChoice = testType === "choice" || testType === "both";
      var hasWritten = testType === "written" || testType === "both";
      var toggleChoice = () => {
        if (hasChoice && !hasWritten) return; // keep at least one
        setTestType(hasChoice ? hasWritten ? "written" : "choice" : hasWritten ? "both" : "choice");
      };
      var toggleWritten = () => {
        if (hasWritten && !hasChoice) return;
        setTestType(hasWritten ? hasChoice ? "choice" : "written" : hasChoice ? "both" : "written");
      };
      return /*#__PURE__*/React.createElement("div", {
        className: "fc-wrap"
      }, /*#__PURE__*/React.createElement(ModeTabs, {
        active: "test"
      }), /*#__PURE__*/React.createElement("div", {
        className: "fc-player"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-test-setup"
      }, /*#__PURE__*/React.createElement("div", {
        className: "serif",
        style: {
          fontSize: 28,
          marginBottom: 4
        }
      }, "\u8A2D\u5B9A\u4F60\u7684", /*#__PURE__*/React.createElement("em", null, "\u6E2C\u9A57")), /*#__PURE__*/React.createElement("div", {
        className: "mono",
        style: {
          fontSize: 10,
          color: "var(--ink-muted)",
          marginBottom: 28
        }
      }, pool(scopeStar).length, " cards \xB7 \u770B\u4E2D\u6587\uFF0C\u56DE\u7B54\u82F1\u6587"), /*#__PURE__*/React.createElement("div", {
        className: "fc-setup-options"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-setup-row"
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "fc-setup-label"
      }, "\u9078\u64C7\u984C Multiple Choice"), /*#__PURE__*/React.createElement("div", {
        className: "fc-setup-desc"
      }, "\u770B\u4E2D\u6587\u5B9A\u7FA9\uFF0C\u5F9E\u56DB\u500B\u82F1\u6587\u9078\u9805\u9078\u51FA\u6B63\u78BA\u7B54\u6848")), /*#__PURE__*/React.createElement("button", {
        type: "button",
        role: "switch",
        "aria-checked": hasChoice,
        "aria-label": "\u9078\u64C7\u984C",
        className: "fc-toggle" + (hasChoice ? " on" : ""),
        onClick: toggleChoice
      })), /*#__PURE__*/React.createElement("div", {
        className: "fc-setup-row"
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "fc-setup-label"
      }, "\u624B\u5BEB\u984C Written"), /*#__PURE__*/React.createElement("div", {
        className: "fc-setup-desc"
      }, "\u770B\u4E2D\u6587\u5B9A\u7FA9\uFF0C\u81EA\u5DF1\u6253\u51FA\u6B63\u78BA\u82F1\u6587\u55AE\u5B57")), /*#__PURE__*/React.createElement("button", {
        type: "button",
        role: "switch",
        "aria-checked": hasWritten,
        "aria-label": "\u624B\u5BEB\u984C",
        className: "fc-toggle" + (hasWritten ? " on" : ""),
        onClick: toggleWritten
      }))), /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        style: {
          width: "100%",
          padding: 14,
          fontSize: 13
        },
        onClick: startTest
      }, "\u958B\u59CB\u6E2C\u9A57 \xB7 Start Test"))));
    }

    // v374: 這一輪實際要考的字（沒設過＝全部，相容從學習完成頁直接進來的舊路徑）
    var tCards = testCards && testCards.length ? testCards : cards;

    /* Results screen */
    if (testDone) {
      var results = tCards.map(card => {
        var qType = questionTypes[card.id] || "choice";
        var correct = true;
        var userAnswer = "";
        if (qType === "choice") {
          var ok = testAnswers[card.id] === card.id;
          if (!ok) {
            correct = false;
            var chosen = testChoices[card.id]?.find(c => c.id === testAnswers[card.id]);
            userAnswer = chosen?.term || "—";
          }
        } else {
          var typed = (typedAnswers[card.id] || "").trim();
          var _ok = typed.toLowerCase() === card.term.toLowerCase();
          if (!_ok) {
            correct = false;
            userAnswer = typed || "—";
          }
        }
        return {
          card,
          correct,
          userAnswer
        };
      });
      var correctCount = results.filter(r => r.correct).length;
      var pct = Math.round(correctCount / tCards.length * 100);
      return /*#__PURE__*/React.createElement("div", {
        className: "fc-wrap"
      }, /*#__PURE__*/React.createElement(ModeTabs, {
        active: "test"
      }), /*#__PURE__*/React.createElement("div", {
        className: "fc-player"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-complete"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-complete-icon"
      }, pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪"), /*#__PURE__*/React.createElement("div", {
        className: "serif",
        style: {
          fontSize: 48,
          lineHeight: 1,
          marginBottom: 4
        }
      }, pct, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 24
        }
      }, "%")), /*#__PURE__*/React.createElement("div", {
        className: "mono",
        style: {
          color: "var(--ink-muted)",
          marginBottom: 20
        }
      }, correctCount, " / ", tCards.length, " correct \xB7 \u7B54\u5C0D"), /*#__PURE__*/React.createElement("div", {
        className: "fc-review-list"
      }, results.map(({
        card,
        correct,
        userAnswer
      }) => /*#__PURE__*/React.createElement("div", {
        key: card.id,
        className: "fc-review-row " + (correct ? "ok" : "err")
      }, /*#__PURE__*/React.createElement("span", {
        className: "fc-review-icon"
      }, correct ? "✓" : "✗"), /*#__PURE__*/React.createElement("span", {
        className: "fc-review-term"
      }, card.zh), /*#__PURE__*/React.createElement("span", {
        className: "fc-review-ans"
      }, !correct && userAnswer && /*#__PURE__*/React.createElement("span", {
        className: "fc-review-wrong"
      }, userAnswer), /*#__PURE__*/React.createElement("span", {
        className: "fc-review-correct"
      }, card.term))))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 12,
          marginTop: 20
        }
      }, /*#__PURE__*/React.createElement("button", {
        className: "btn ghost",
        onClick: () => {
          setTestSetup(true);
          setTestAnswers({});
          setTypedAnswers({});
          setQuestionTypes({});
          setTestDone(false);
        }
      }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        onClick: () => enterLearn()
      }, "\u518D\u591A\u7DF4\u4E00\u9EDE \u2192")))));
    }

    /* Test questions */
    var answeredCards = new Set(tCards.filter(card => {
      var qType = questionTypes[card.id] || "choice";
      if (qType === "choice") return !!testAnswers[card.id];
      return !!(typedAnswers[card.id] || "").trim();
    }).map(c => c.id));
    return /*#__PURE__*/React.createElement("div", {
      className: "fc-wrap"
    }, /*#__PURE__*/React.createElement(ModeTabs, {
      active: "test"
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-player"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-topbar"
    }, /*#__PURE__*/React.createElement("span", {
      className: "mono"
    }, answeredCards.size, " / ", tCards.length, " answered"), /*#__PURE__*/React.createElement("div", {
      className: "fc-progress-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-progress-fill",
      style: {
        width: `${answeredCards.size / tCards.length * 100}%`
      }
    }))), /*#__PURE__*/React.createElement("div", {
      className: "fc-test-list"
    }, tCards.map((card, qi) => {
      var qType = questionTypes[card.id] || "choice";
      var choices = testChoices[card.id] || [];
      var selectedId = testAnswers[card.id];
      var typedVal = typedAnswers[card.id] || "";
      return (
        /*#__PURE__*/
        /* v373: 一題一張大卡片（Alan 指定「照參考圖的大小」）——
           定義在上、圖片靠右、選項是 2×2 的大方框 */
        React.createElement("div", {
          key: card.id,
          className: "fc-test-q"
        }, /*#__PURE__*/React.createElement("div", {
          className: "fc-test-qhead"
        }, /*#__PURE__*/React.createElement("span", {
          className: "fc-test-qlabel"
        }, qType === "choice" ? "定義" : "定義 · 手寫"), /*#__PURE__*/React.createElement("span", {
          className: "fc-test-qnum mono"
        }, qi + 1, " / ", tCards.length)), /*#__PURE__*/React.createElement("div", {
          className: "fc-test-prompt"
        }, /*#__PURE__*/React.createElement("div", {
          className: "fc-test-zh"
        }, card.zh), card.imageUrl && /*#__PURE__*/React.createElement("img", {
          key: card.imageUrl,
          src: card.imageUrl,
          alt: card.zh,
          className: "fc-test-img fc-img-zoomable",
          decoding: "async",
          fetchpriority: "high",
          role: "button",
          tabIndex: 0,
          "aria-label": "放大圖片：" + card.zh,
          title: "\u9EDE\u4E00\u4E0B\u770B\u5927\u5716",
          onClick: e => {
            e.stopPropagation();
            setZoomImg({
              src: card.imageUrl,
              alt: card.zh
            });
          },
          onKeyDown: e => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            // 不能讓 Enter／空白鍵傳出去（全站鍵盤作答監聽會收到）
            e.preventDefault();
            e.stopPropagation();
            setZoomImg({
              src: card.imageUrl,
              alt: card.zh
            });
          }
        })), qType === "choice" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
          className: "fc-test-label"
        }, "\u9078\u64C7\u7B54\u6848"), /*#__PURE__*/React.createElement("div", {
          className: "fc-test-choices"
        }, choices.map((ch, ci) => /*#__PURE__*/React.createElement("button", {
          key: ci,
          className: "fc-test-choice" + (selectedId === ch.id ? " selected" : ""),
          onClick: () => setTestAnswers(prev => ({
            ...prev,
            [card.id]: ch.id
          }))
        }, ch.term)))), qType === "written" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
          className: "fc-test-label"
        }, "\u6253\u51FA\u82F1\u6587\u55AE\u5B57"), /*#__PURE__*/React.createElement("div", {
          className: "fc-test-written"
        }, /*#__PURE__*/React.createElement("input", {
          className: "fc-written-input",
          value: typedVal,
          onChange: e => setTypedAnswers(prev => ({
            ...prev,
            [card.id]: e.target.value
          })),
          placeholder: "Type the English word \xB7 \u5728\u6B64\u8F38\u5165\u82F1\u6587\u55AE\u5B57"
        }))))
      );
    })), /*#__PURE__*/React.createElement("div", {
      className: "fc-test-foot"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      disabled: answeredCards.size < tCards.length,
      onClick: () => {
        setTestDone(true);
        // v374(#4): 只練星號不算完成；選擇題交卷就算「測驗完成」，
        //           手寫題不列入完成條件，但全部答完可以另外加分
        // v405: 同上——用「這一輪實際考了幾張」判斷，不看會殘留的 scopeStar
        if (fullRound(tCards.length) && onModeDone) {
          onModeDone('test');
          var written = tCards.filter(c => (questionTypes[c.id] || 'choice') === 'written');
          if (written.length && written.every(c => (typedAnswers[c.id] || '').trim())) onModeDone('written');
        }
        if (onComplete) onComplete();
      }
    }, "Submit \xB7 \u4EA4\u5377 (", answeredCards.size, "/", tCards.length, ")"))), zoomImg && /*#__PURE__*/React.createElement(FcImageZoom, {
      src: zoomImg.src,
      alt: zoomImg.alt,
      onClose: () => setZoomImg(null)
    }));
  }

  /* ────────────────── MATCH MODE ────────────────── */
  if (mode === "match") {
    /* ── Ready screen ── */
    if (!matchStarted) {
      return /*#__PURE__*/React.createElement("div", {
        className: "fc-wrap"
      }, /*#__PURE__*/React.createElement(ModeTabs, {
        active: "match"
      }), /*#__PURE__*/React.createElement("div", {
        className: "fc-player"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-match-ready"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 52,
          marginBottom: 12
        }
      }, "\u26A1"), /*#__PURE__*/React.createElement("div", {
        className: "serif",
        style: {
          fontSize: 32,
          marginBottom: 8
        }
      }, "Ready to ", /*#__PURE__*/React.createElement("em", null, "Match?")), /*#__PURE__*/React.createElement("div", {
        className: "mono",
        style: {
          fontSize: 11,
          color: "var(--ink-muted)",
          marginBottom: 4
        }
      }, matchTiles.length / 2, " \u5C0D\u914D\u5C0D \xB7 ", matchTiles.length, " \u5F35\u5361\u7247"), matchBest && /*#__PURE__*/React.createElement("div", {
        className: "mono",
        style: {
          fontSize: 11,
          color: "var(--ink-faint)",
          marginBottom: 24
        }
      }, "Best: ", matchBest.toFixed(1), "s"), !matchBest && /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 24
        }
      }), /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        style: {
          padding: "14px 48px",
          fontSize: 15,
          letterSpacing: "0.06em"
        },
        onClick: startMatch
      }, "\u958B\u59CB \xB7 Start"))));
    }
    if (matchDone) {
      return /*#__PURE__*/React.createElement("div", {
        className: "fc-wrap"
      }, /*#__PURE__*/React.createElement(ModeTabs, {
        active: "match"
      }), /*#__PURE__*/React.createElement("div", {
        className: "fc-player"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-complete"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-complete-icon"
      }, "\u26A1"), /*#__PURE__*/React.createElement("div", {
        className: "serif",
        style: {
          fontSize: 52,
          lineHeight: 1,
          marginBottom: 6
        }
      }, matchElapsed.toFixed(1), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 24
        }
      }, "s")), isNewBest && /*#__PURE__*/React.createElement("div", {
        className: "fc-match-best-badge mono"
      }, "\uD83C\uDFC6 New Best!"), matchBest && !isNewBest && /*#__PURE__*/React.createElement("div", {
        className: "mono",
        style: {
          color: "var(--ink-muted)",
          fontSize: 12,
          marginBottom: 4
        }
      }, "Best: ", matchBest.toFixed(1), "s"), /*#__PURE__*/React.createElement("div", {
        className: "mono",
        style: {
          color: "var(--ink-muted)",
          marginBottom: 24,
          marginTop: 8
        }
      }, "All ", matchTiles.length / 2, " pairs matched!"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 12
        }
      }, /*#__PURE__*/React.createElement("button", {
        className: "btn ghost",
        onClick: () => enterMatch()
      }, "\u518D\u73A9\u4E00\u6B21"), /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        onClick: () => enterLearn()
      }, "\u518D\u591A\u7DF4\u4E00\u9EDE \u2192")))));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "fc-wrap"
    }, /*#__PURE__*/React.createElement(ModeTabs, {
      active: "match"
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-player"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-match-topbar"
    }, /*#__PURE__*/React.createElement(MatchTimer, {
      startRef: matchStartRef
    }), /*#__PURE__*/React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 11,
        color: "var(--ink-muted)"
      }
    }, matchMatched.size, " / ", matchTiles.length / 2, " matched"), matchBest && /*#__PURE__*/React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 10,
        color: "var(--ink-faint)"
      }
    }, "Best ", matchBest.toFixed(1), "s")), /*#__PURE__*/React.createElement(MatchFitGrid, null, matchTiles.map(tile => {
      var isMatched = matchMatched.has(tile.pairId);
      var isSelected = matchSelected === tile.id;
      var isWrong = matchWrong.includes(tile.id);
      var cls = "fc-match-tile";
      if (isMatched) cls += " matched";else if (isSelected) cls += " selected";else if (isWrong) cls += " wrong";else if (tile.isZh) cls += " zh-tile";
      return /*#__PURE__*/React.createElement("button", {
        key: tile.id,
        className: cls,
        onClick: () => !isMatched && handleMatchClick(tile)
      }, tile.imageUrl && /*#__PURE__*/React.createElement("img", {
        src: tile.imageUrl,
        alt: "",
        className: "fc-match-tile-bg"
      }), /*#__PURE__*/React.createElement("span", {
        className: `fc-match-tile-text${tile.imageUrl ? ' has-img' : ''}`
      }, tile.text));
    }))));
  }

  /* ────────────────── FILL-IN-BLANK MODE ────────────────── */
  if (mode === "fill") {
    if (fillDone) {
      var _pct = Math.round(fillScore / fillCards.length * 100);
      return /*#__PURE__*/React.createElement("div", {
        className: "fc-wrap"
      }, /*#__PURE__*/React.createElement(ModeTabs, {
        active: "fill"
      }), /*#__PURE__*/React.createElement("div", {
        className: "fc-player"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-complete"
      }, /*#__PURE__*/React.createElement("div", {
        className: "fc-complete-icon"
      }, _pct >= 80 ? "🎉" : _pct >= 60 ? "👍" : "💪"), /*#__PURE__*/React.createElement("div", {
        className: "serif",
        style: {
          fontSize: 48,
          lineHeight: 1,
          marginBottom: 4
        }
      }, _pct, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 24
        }
      }, "%")), /*#__PURE__*/React.createElement("div", {
        className: "mono",
        style: {
          color: "var(--ink-muted)",
          marginBottom: 24
        }
      }, fillScore, " / ", fillCards.length, " correct \xB7 \u7B54\u5C0D"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 12
        }
      }, /*#__PURE__*/React.createElement("button", {
        className: "btn ghost",
        onClick: () => enterFill()
      }, "\u518D\u8A66\u4E00\u6B21"), /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        onClick: () => enterLearn()
      }, "\u518D\u591A\u7DF4\u4E00\u9EDE \u2192")))));
    }
    var _card2 = fillCards[fillIdx];
    var parts = splitSentence(_card2.example, _card2.term);
    var blankLen = Math.max(6, (_card2.term || "").length);
    return /*#__PURE__*/React.createElement("div", {
      className: "fc-wrap"
    }, /*#__PURE__*/React.createElement(ModeTabs, {
      active: "fill"
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-fill-player"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-fill-topbar"
    }, /*#__PURE__*/React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 11,
        color: "var(--ink-muted)"
      }
    }, fillIdx + 1, " / ", fillCards.length), /*#__PURE__*/React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 11,
        color: "var(--ink-muted)"
      }
    }, "\u2713 ", fillScore)), /*#__PURE__*/React.createElement("div", {
      className: "fc-fill-sentence"
    }, parts ? /*#__PURE__*/React.createElement("div", {
      className: "fc-fill-text"
    }, parts[0], /*#__PURE__*/React.createElement("span", {
      className: "fc-fill-blank"
    }, "_".repeat(blankLen)), parts[1]) : /*#__PURE__*/React.createElement("div", {
      className: "fc-fill-text fc-fill-zh"
    }, _card2.zh)), /*#__PURE__*/React.createElement("div", {
      className: "fc-fill-label"
    }, "\u9078\u64C7\u7B54\u6848"), /*#__PURE__*/React.createElement("div", {
      className: "fc-fill-choices"
    }, fillChoices.map((ch, i) => {
      var cls = "fc-fill-btn";
      if (fillSelected) {
        if (ch.id === _card2.id) cls += " correct";else if (ch.id === fillSelected) cls += " wrong";else cls += " dimmed";
      }
      return /*#__PURE__*/React.createElement("button", {
        key: ch.id,
        className: cls,
        style: !fillSelected ? {
          background: FILL_COLORS[i % 4]
        } : undefined,
        onClick: () => handleFillChoice(ch)
      }, ch.term);
    })), fillSelected && /*#__PURE__*/React.createElement("div", {
      className: "fc-fill-next-row"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: goNextFill
    }, "\u4E0B\u4E00\u984C \u2192"))));
  }
  return null;
}

/* ══════════════════════════════════════════════════════
   FLASHCARD EDITOR
══════════════════════════════════════════════════════ */
function FlashcardEditor({
  cards,
  onChange
}) {
  var [importing, setImporting] = useFC(false);
  var [importText, setImportText] = useFC("");
  var [imgSearch, setImgSearch] = useFC(null);
  var [openCard, setOpenCard] = useFC(null);
  var addCard = () => {
    var id = "c" + Date.now() + Math.random().toString(36).slice(2, 5);
    onChange([...cards, {
      id,
      term: "",
      zh: "",
      example: "",
      imageUrl: ""
    }]);
    setOpenCard(id);
  };
  var updateCard = (id, patch) => onChange(cards.map(c => c.id === id ? {
    ...c,
    ...patch
  } : c));
  var deleteCard = id => {
    onChange(cards.filter(c => c.id !== id));
    if (openCard === id) setOpenCard(null);
  };
  var moveCard = (id, dir) => {
    var arr = [...cards],
      i = arr.findIndex(c => c.id === id),
      j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  var handleImport = () => {
    // v251: 統一分隔符——Tab（試算表/Quizlet 直貼）優先，其次「|」，再來「 - 」
    var parsed = importText.split('\n').filter(l => l.trim()).map(line => {
      var p = line.includes('\t') ? line.split('\t') : line.includes('|') ? line.split('|') : line.split(/\s+-\s+/);
      return {
        id: "c" + Date.now() + Math.random().toString(36).slice(2, 5),
        term: (p[0] || "").trim(),
        zh: (p[1] || "").trim(),
        example: (p[2] || "").trim(),
        imageUrl: ""
      };
    }).filter(c => c.term);
    if (!parsed.length) return;
    onChange([...cards, ...parsed]);
    setImportText("");
    setImporting(false);
  };
  // v251: 匯出成 Quizlet 可直接匯入的格式（英文[Tab]中文，每行一張）
  var handleExport = () => {
    var text = cards.filter(c => (c.term || '').trim()).map(c => `${(c.term || '').trim()}\t${(c.zh || '').trim()}`).join('\n');
    if (!text) {
      alert('還沒有卡片可以匯出。');
      return;
    }
    var done = () => alert(`已複製 ${cards.length} 張卡（英文 Tab 中文）——到 Quizlet 選「匯入」直接貼上即可。`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => window.prompt('複製下面內容貼到 Quizlet：', text));
    } else {
      window.prompt('複製下面內容貼到 Quizlet：', text);
    }
  };
  var importLineCount = importText.split('\n').filter(l => l.trim()).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "fc-editor"
  }, imgSearch && /*#__PURE__*/React.createElement(ImageSearch, {
    term: imgSearch.term,
    onSelect: url => updateCard(imgSearch.cardId, {
      imageUrl: url
    }),
    onClose: () => setImgSearch(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "fc-editor-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: "var(--ink-muted)"
    }
  }, cards.length, " \u5F35\u5361\u7247"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost" + (importing ? " active" : ""),
    style: {
      padding: "6px 12px",
      fontSize: 11
    },
    onClick: () => setImporting(v => !v)
  }, "\u2B07 Import"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    style: {
      padding: "6px 12px",
      fontSize: 11
    },
    onClick: handleExport,
    title: "\u8907\u88FD\u6210 Quizlet \u532F\u5165\u683C\u5F0F\uFF08\u82F1\u6587 Tab \u4E2D\u6587\uFF09"
  }, "\u2B06 \u532F\u51FA Quizlet"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      padding: "6px 12px",
      fontSize: 11
    },
    onClick: addCard
  }, "+ Add Card"))), importing && /*#__PURE__*/React.createElement("div", {
    className: "fc-import-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 10,
      color: "var(--ink-muted)",
      marginBottom: 8
    }
  }, "\u6BCF\u884C\u4E00\u5F35\u5361\uFF0C\u6B04\u4F4D\u7528 ", /*#__PURE__*/React.createElement("code", {
    style: {
      background: "var(--border-soft)",
      padding: "1px 4px",
      borderRadius: 2
    }
  }, "Tab"), "\uFF08\u8A66\u7B97\u8868\uFF0FQuizlet \u76F4\u8CBC\uFF09\u3001", /*#__PURE__*/React.createElement("code", {
    style: {
      background: "var(--border-soft)",
      padding: "1px 4px",
      borderRadius: 2
    }
  }, "|"), " \u6216 ", /*#__PURE__*/React.createElement("code", {
    style: {
      background: "var(--border-soft)",
      padding: "1px 4px",
      borderRadius: 2
    }
  }, " - "), " \u5206\u9694\uFF1A\u82F1\u6587\uFF0F\u4E2D\u6587\uFF0F\u4F8B\u53E5\uFF08\u5F8C\u5169\u6B04\u53EF\u7701\u7565\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    className: "fc-import-ta",
    value: importText,
    onChange: e => setImportText(e.target.value),
    rows: 7,
    placeholder: "queen - 女王 - The queen ruled the kingdom.\nfable - 寓言故事\ntrack (v.) - 追蹤"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 8,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => {
      setImporting(false);
      setImportText("");
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: handleImport,
    disabled: !importLineCount
  }, "Import ", importLineCount, " ", importLineCount === 1 ? "card" : "cards"))), /*#__PURE__*/React.createElement("div", {
    className: "fc-card-list"
  }, cards.length === 0 && !importing && /*#__PURE__*/React.createElement("div", {
    className: "fc-card-empty mono"
  }, "\u5C1A\u672A\u65B0\u589E\u5361\u7247 \u2014 \u9EDE\u9078\u4E0A\u65B9 Add Card \u6216 Import"), cards.map((card, idx) => {
    var isOpen = openCard === card.id;
    return /*#__PURE__*/React.createElement("div", {
      key: card.id,
      className: "fc-card-row" + (isOpen ? " open" : "")
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-card-row-head",
      onClick: () => setOpenCard(isOpen ? null : card.id)
    }, /*#__PURE__*/React.createElement("span", {
      className: "mono",
      style: {
        color: "var(--ink-faint)",
        fontSize: 10,
        minWidth: 18
      }
    }, idx + 1), /*#__PURE__*/React.createElement("span", {
      className: "fc-row-term"
    }, card.term || /*#__PURE__*/React.createElement("em", {
      style: {
        color: "var(--ink-faint)"
      }
    }, "untitled")), /*#__PURE__*/React.createElement("span", {
      className: "fc-row-zh"
    }, card.zh), card.imageUrl && /*#__PURE__*/React.createElement("img", {
      src: card.imageUrl,
      alt: "",
      className: "fc-row-thumb"
    }), /*#__PURE__*/React.createElement("div", {
      className: "fc-row-tools",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("button", {
      title: "Move up",
      onClick: () => moveCard(card.id, -1),
      disabled: idx === 0,
      style: {
        opacity: idx === 0 ? 0.3 : 1
      }
    }, "\u2191"), /*#__PURE__*/React.createElement("button", {
      title: "Move down",
      onClick: () => moveCard(card.id, 1),
      disabled: idx === cards.length - 1,
      style: {
        opacity: idx === cards.length - 1 ? 0.3 : 1
      }
    }, "\u2193"), /*#__PURE__*/React.createElement("button", {
      title: "Delete",
      onClick: () => {
        if (confirm("Delete this card?")) deleteCard(card.id);
      },
      style: {
        color: "var(--accent)"
      }
    }, "\u2715")), /*#__PURE__*/React.createElement("span", {
      className: "fc-row-chevron mono"
    }, isOpen ? "▲" : "▼")), isOpen && /*#__PURE__*/React.createElement("div", {
      className: "fc-card-row-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fc-card-fields"
    }, /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Term \xB7 \u82F1\u6587\u55AE\u5B57"), /*#__PURE__*/React.createElement("input", {
      value: card.term,
      onChange: e => updateCard(card.id, {
        term: e.target.value
      }),
      placeholder: "e.g. queen"
    })), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "\u4E2D\u6587\u5B9A\u7FA9"), /*#__PURE__*/React.createElement("input", {
      value: card.zh,
      onChange: e => updateCard(card.id, {
        zh: e.target.value
      }),
      placeholder: "\u4F8B\uFF1A\u5973\u738B"
    })), /*#__PURE__*/React.createElement("div", {
      className: "field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "field-label"
    }, "Example \xB7 \u4F8B\u53E5 ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        textTransform: "none"
      }
    }, "(optional)")), /*#__PURE__*/React.createElement("input", {
      value: card.example || "",
      onChange: e => updateCard(card.id, {
        example: e.target.value
      }),
      placeholder: "The queen ruled the kingdom."
    }))), /*#__PURE__*/React.createElement("div", {
      className: "fc-card-img-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "field-label",
      style: {
        marginBottom: 8
      }
    }, "Image \xB7 \u5716\u7247"), card.imageUrl ? /*#__PURE__*/React.createElement("div", {
      className: "fc-img-preview"
    }, /*#__PURE__*/React.createElement("img", {
      src: card.imageUrl,
      alt: card.term
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      style: {
        fontSize: 10,
        padding: "4px 10px"
      },
      onClick: () => setImgSearch({
        cardId: card.id,
        term: card.term || ""
      })
    }, "Change"), /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      style: {
        fontSize: 10,
        padding: "4px 10px"
      },
      onClick: () => updateCard(card.id, {
        imageUrl: ""
      })
    }, "Remove"))) : /*#__PURE__*/React.createElement("button", {
      className: "fc-img-add",
      onClick: () => setImgSearch({
        cardId: card.id,
        term: card.term || ""
      })
    }, /*#__PURE__*/React.createElement("svg", {
      width: "28",
      height: "28",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "18",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "8.5",
      cy: "8.5",
      r: "1.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 15l-5-5L5 21"
    })), /*#__PURE__*/React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 10,
        marginTop: 6,
        color: "var(--ink-muted)"
      }
    }, "\u641C\u5C0B\uFF0F\u4E0A\u50B3")))));
  })));
}

/* v392: 這裡本來有一個 FillBlankPlayer（約 335 行）——已整段刪除。
   它是 dead code：全專案沒有任何地方 render <FillBlankPlayer> 或 window.FillBlankPlayer，
   現行的 fillblank item 走的是 components-quiz-mode.jsx 的 QuizModePlayer。
   而且它本身還是舊寫法（答對才排 setTimeout、答錯回饋沒有 render q.explain，
   儘管下面的 FillBlankEditor 有讓老師輸入解說）——留著只會被誤當成現役程式碼去改。
   ⚠ 下面的 FillBlankEditor 是不同的東西（老師端出題用），有在用，不要刪。 */

/* ══════════════════════════════════════════════════════
   STANDALONE FILL-IN-BLANK EDITOR
══════════════════════════════════════════════════════ */
function FillBlankEditor({
  questions,
  onChange
}) {
  var [importing, setImporting] = useFC(false);
  var [importText, setImportText] = useFC("");
  var addQ = () => {
    var id = "q" + Date.now() + Math.random().toString(36).slice(2, 5);
    onChange([...questions, {
      id,
      sentence: "",
      answer: "",
      explain: ""
    }]);
  };
  var updateQ = (id, patch) => onChange(questions.map(q => q.id === id ? {
    ...q,
    ...patch
  } : q));
  var deleteQ = id => onChange(questions.filter(q => q.id !== id));
  var moveQ = (id, dir) => {
    var arr = [...questions];
    var i = arr.findIndex(q => q.id === id),
      j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  var handleImport = () => {
    var parsed = importText.split('\n').filter(l => l.trim()).map(line => {
      var word = "",
        sentence = "",
        explain = "";
      if (line.includes('\t')) {
        // Tab-separated: Answer [TAB] Sentence [TAB] Explanation (optional 3rd col)
        var parts = line.split('\t');
        word = parts[0]?.trim() || "";
        sentence = parts[1]?.trim() || "";
        explain = parts[2]?.trim() || "";
      } else if (line.includes('|')) {
        var p = line.split(/\s*\|\s*/);
        word = p[0]?.trim() || "";
        sentence = p[1]?.trim() || "";
        explain = p[2]?.trim() || "";
      }
      if (!word || !sentence) return null;
      // Normalize multiple underscores (e.g. __________) to ___
      sentence = sentence.replace(/_+/g, '___');
      // If sentence has no blank but contains the word, auto-blank it
      if (!sentence.includes('___')) {
        var esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        sentence = sentence.replace(new RegExp('\\b' + esc + '\\b', 'i'), '___');
      }
      return {
        id: "q" + Date.now() + Math.random().toString(36).slice(2, 5),
        sentence,
        answer: word,
        explain
      };
    }).filter(Boolean).filter(q => q.sentence && q.answer);
    if (!parsed.length) return;
    onChange([...questions, ...parsed]);
    setImportText("");
    setImporting(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fc-editor"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-editor-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: "var(--ink-muted)"
    }
  }, questions.length, " \u984C \xB7 \u53E5\u4E2D\u7528 ", /*#__PURE__*/React.createElement("code", {
    style: {
      background: "var(--border-soft)",
      padding: "1px 4px",
      borderRadius: 2
    }
  }, "___"), " \u4EE3\u8868\u7A7A\u683C"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost" + (importing ? " active" : ""),
    style: {
      padding: "6px 12px",
      fontSize: 11
    },
    onClick: () => setImporting(v => !v)
  }, "\u2B07 Import"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    style: {
      padding: "6px 12px",
      fontSize: 11
    },
    onClick: addQ
  }, "+ Add"))), importing && /*#__PURE__*/React.createElement("div", {
    className: "fc-import-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 10,
      color: "var(--ink-muted)",
      marginBottom: 8
    }
  }, "\u5F9E\u8A66\u7B97\u8868\u8907\u88FD\u8CBC\u4E0A\uFF1A", /*#__PURE__*/React.createElement("code", {
    style: {
      background: "var(--border-soft)",
      padding: "1px 4px",
      borderRadius: 2
    }
  }, "\u7B54\u6848 [Tab] \u53E5\u5B50 [Tab] \u89E3\u8AAA\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-faint)",
      marginLeft: 8
    }
  }, "\xB7 \u53E5\u5B50\u88E1\u7684 _________ \u6703\u81EA\u52D5\u8B8A\u6210\u7A7A\u683C")), /*#__PURE__*/React.createElement("textarea", {
    className: "fc-import-ta",
    value: importText,
    onChange: e => setImportText(e.target.value),
    rows: 7,
    placeholder: "prepared\tBefore the typhoon came, our family was __________ with water.\tprepared = 準備好的💪 事先做好準備很重要！\nemergency\tWhen the kitchen started to fill with smoke, Dad knew it was an __________.\nmemorize\tI had to __________ my home address so I could tell an adult if I got lost."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 8,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => {
      setImporting(false);
      setImportText("");
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: handleImport,
    disabled: !importText.trim()
  }, "Import"))), /*#__PURE__*/React.createElement("div", {
    className: "fc-card-list"
  }, questions.length === 0 && !importing && /*#__PURE__*/React.createElement("div", {
    className: "fc-card-empty mono"
  }, "\u5C1A\u672A\u65B0\u589E\u984C\u76EE \u2014 \u9EDE\u9078\u4E0A\u65B9 Add"), questions.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: q.id,
    className: "fc-card-row open"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-card-row-head",
    style: {
      cursor: "default"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--ink-faint)",
      fontSize: 10,
      minWidth: 18,
      flexShrink: 0
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    className: "fc-row-term",
    style: {
      fontSize: 13
    }
  }, q.sentence || /*#__PURE__*/React.createElement("em", {
    style: {
      color: "var(--ink-faint)"
    }
  }, "\u672A\u586B\u5BEB")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      flexShrink: 0,
      marginRight: 8,
      color: "var(--ink)"
    }
  }, q.answer), /*#__PURE__*/React.createElement("div", {
    className: "fc-row-tools",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => moveQ(q.id, -1),
    disabled: i === 0,
    style: {
      opacity: i === 0 ? 0.3 : 1
    }
  }, "\u2191"), /*#__PURE__*/React.createElement("button", {
    onClick: () => moveQ(q.id, 1),
    disabled: i === questions.length - 1,
    style: {
      opacity: i === questions.length - 1 ? 0.3 : 1
    }
  }, "\u2193"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Delete?")) deleteQ(q.id);
    },
    style: {
      color: "var(--accent)"
    }
  }, "\u2715"))), /*#__PURE__*/React.createElement("div", {
    className: "fc-card-row-body",
    style: {
      gridTemplateColumns: "1fr"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-card-fields"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u53E5\u5B50 Sentence ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      textTransform: "none"
    }
  }, "(\u7A7A\u683C\u8655\u8F38\u5165 ___)")), /*#__PURE__*/React.createElement("input", {
    value: q.sentence,
    onChange: e => updateQ(q.id, {
      sentence: e.target.value
    }),
    placeholder: "The flood was a terrible ___."
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u7B54\u6848 Answer"), /*#__PURE__*/React.createElement("input", {
    value: q.answer,
    onChange: e => updateQ(q.id, {
      answer: e.target.value
    }),
    placeholder: "disaster"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field-label"
  }, "\u89E3\u8AAA Explanation ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      textTransform: "none",
      color: "var(--ink-muted)"
    }
  }, "(\u9078\u586B \xB7 \u7B54\u932F\u5F8C\u986F\u793A)")), /*#__PURE__*/React.createElement("input", {
    value: q.explain || "",
    onChange: e => updateQ(q.id, {
      explain: e.target.value
    }),
    placeholder: "disaster = \u707D\u96E3\uD83C\uDF0A  The flood was a terrible disaster\uFF01\u5927\u6D2A\u6C34\u9020\u6210\u4E86\u56B4\u91CD\u7684\u707D\u96E3\u3002"
  }))))))));
}

// v392: 移除 FillBlankPlayer（dead code，見上面 FillBlankEditor 前的說明）
Object.assign(window, {
  FlashcardPlayer,
  FlashcardEditor,
  ImageSearch,
  autoFindImage,
  FillBlankEditor,
  collectStarredWords,
  ReviewFlashcardModal
});