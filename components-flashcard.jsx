// components-flashcard.jsx — Flashcard system: Card / Learn / Test + Pixabay image search

const { useState: useFC, useEffect: useFC_E } = React;

const PIXABAY_KEY = "55964296-48988fd7e26a6999ecaff6b95";
const RETRY_GAP = 4; // wrong cards reappear after this many cards

/* ── Text-to-speech ── */
function speak(text, lang = 'en-US') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = 0.88;
  window.speechSynthesis.speak(utt);
}

function SpeakerBtn({ text, lang = 'en-US', className = "" }) {
  return (
    <button
      className={"fc-speaker-btn " + className}
      onClick={e => { e.stopPropagation(); speak(text, lang); }}
      title="Listen · 聆聽"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      </svg>
    </button>
  );
}

/* ── Dual progress bar (Quizlet-style) ── */
function DualProgressBar({ correct, total }) {
  const remaining = Math.max(0, total - correct);
  return (
    <div className="fc-dual-bar">
      <div className={"fc-dual-circle" + (correct > 0 ? " green" : "")}>{correct}</div>
      <div className="fc-dual-track">
        {correct > 0 && <div className="fc-dual-seg-green" style={{flex: correct}}/>}
        {remaining > 0 && <div className="fc-dual-seg-gray" style={{flex: remaining}}/>}
      </div>
      <div className="fc-dual-circle">{total}</div>
    </div>
  );
}

/* ── Helpers ── */
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// choices are English terms (show Chinese → pick English)
function makeChoices(card, allCards) {
  const others = allCards.filter(c => c.id !== card.id);
  return shuffle([...shuffle(others).slice(0, Math.min(3, others.length)), card]);
}

/* ══════════════════════════════════════════════════════
   IMAGE SEARCH  (Pixabay)
══════════════════════════════════════════════════════ */
function ImageSearch({ term: initialTerm, onSelect, onClose }) {
  const [q, setQ] = useFC(initialTerm || "");
  const [results, setResults] = useFC([]);
  const [loading, setLoading] = useFC(false);
  const [page, setPage] = useFC(1);
  const [total, setTotal] = useFC(0);
  const [searched, setSearched] = useFC(false);

  const search = async (searchQ, pg = 1) => {
    if (!searchQ.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(searchQ)}&image_type=all&safesearch=true&per_page=12&page=${pg}`;
      const data = await fetch(url).then(r => r.json());
      setResults(data.hits || []); setTotal(data.totalHits || 0); setPage(pg);
    } catch (e) { setResults([]); } finally { setLoading(false); }
  };

  useFC_E(() => { if (initialTerm) search(initialTerm); }, []);

  return (
    <div className="img-search-overlay" onClick={onClose}>
      <div className="img-search-panel" onClick={e => e.stopPropagation()}>
        <div className="img-search-head">
          <div>
            <div className="serif" style={{fontSize: 22}}>Search <em>Images</em></div>
            <div className="mono" style={{fontSize: 9, color: "var(--ink-muted)", marginTop: 2}}>Powered by Pixabay · 安全搜尋已開啟</div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>
        <div className="img-search-bar">
          <input className="img-search-input" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search(q)}
            placeholder="Search in English (e.g. queen, lion, ancient Rome)…" autoFocus/>
          <button className="btn primary" onClick={() => search(q)} style={{flexShrink: 0}}>Search</button>
        </div>
        {loading && <div className="img-search-status mono">Searching…</div>}
        {!loading && searched && results.length === 0 && <div className="img-search-status mono">No results — try another keyword.</div>}
        <div className="img-search-grid">
          {results.map(img => (
            <button key={img.id} className="img-search-item" onClick={() => { onSelect(img.webformatURL); onClose(); }} title={img.tags}>
              <img src={img.previewURL} alt={img.tags} loading="lazy"/>
            </button>
          ))}
        </div>
        {total > 12 && (
          <div className="img-search-pages">
            <button className="btn ghost" onClick={() => search(q, page - 1)} disabled={page <= 1}>← Prev</button>
            <span className="mono" style={{fontSize: 10, color: "var(--ink-muted)"}}>Page {page} · {total} results</span>
            <button className="btn ghost" onClick={() => search(q, page + 1)} disabled={page * 12 >= total}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FLASHCARD PLAYER
══════════════════════════════════════════════════════ */
function FlashcardPlayer({ item, onComplete }) {
  const cards = item.cards || [];
  const [mode, setMode] = useFC("card");

  // Card mode
  const [cardIdx, setCardIdx] = useFC(0);
  const [flipped, setFlipped] = useFC(false);

  // Learn mode — queue-based spaced repetition
  const [learnQueue, setLearnQueue] = useFC([]); // [{card, isRetry}]
  const [correctIds, setCorrectIds] = useFC(new Set());
  const [learnChoice, setLearnChoice] = useFC(null); // chosen card id
  const [learnChoices, setLearnChoices] = useFC([]);

  // Test mode
  const [testSetup, setTestSetup] = useFC(true);
  const [testType, setTestType] = useFC("choice"); // "choice" | "written" | "both"
  const [testChoices, setTestChoices] = useFC({});
  const [testAnswers, setTestAnswers] = useFC({}); // cardId → chosen card id
  const [typedAnswers, setTypedAnswers] = useFC({}); // cardId → string
  const [testDone, setTestDone] = useFC(false);

  const enterCard = () => { setMode("card"); setCardIdx(0); setFlipped(false); };

  const enterLearn = () => {
    const order = shuffle([...cards]);
    const queue = order.map(card => ({ card, isRetry: false }));
    setLearnQueue(queue);
    setCorrectIds(new Set());
    setLearnChoice(null);
    setLearnChoices(queue.length > 0 ? makeChoices(queue[0].card, cards) : []);
    setMode("learn");
  };

  const enterTest = () => {
    setTestSetup(true);
    setTestAnswers({});
    setTypedAnswers({});
    setTestDone(false);
    setMode("test");
  };

  const startTest = () => {
    const tc = {};
    cards.forEach(card => { tc[card.id] = makeChoices(card, cards); });
    setTestChoices(tc);
    setTestSetup(false);
  };

  const ModeTabs = ({ active }) => (
    <div className="fc-mode-tabs">
      <button className={"fc-tab" + (active === "card"  ? " active" : "")} onClick={enterCard}>🃏 Flashcards · 單字卡</button>
      <button className={"fc-tab" + (active === "learn" ? " active" : "")} onClick={enterLearn}>📖 Learn · 學習</button>
      <button className={"fc-tab" + (active === "test"  ? " active" : "")} onClick={enterTest}>📝 Test · 測驗</button>
    </div>
  );

  if (cards.length === 0) {
    return (
      <div className="fc-wrap">
        <ModeTabs active="card"/>
        <div className="fc-empty mono">No cards in this set · 尚未新增卡片</div>
      </div>
    );
  }

  /* ────────────────── CARD MODE ────────────────── */
  if (mode === "card") {
    const card = cards[cardIdx];
    return (
      <div className="fc-wrap">
        <ModeTabs active="card"/>
        <div className="fc-player">
          <div className="fc-topbar">
            <span className="mono">{cardIdx + 1} / {cards.length}</span>
            <div className="fc-progress-bar">
              <div className="fc-progress-fill" style={{width: `${((cardIdx + 1) / cards.length) * 100}%`}}/>
            </div>
          </div>

          <div className={"fc-flip-card" + (flipped ? " flipped" : "")} onClick={() => setFlipped(f => !f)}>
            <div className="fc-flip-inner">
              {/* FRONT — English only */}
              <div className="fc-face fc-front">
                <SpeakerBtn text={card.term} lang="en-US" className="fc-face-speaker"/>
                <div className="fc-term serif">{card.term}</div>
                <div className="fc-flip-hint mono">tap to flip · 點擊翻面</div>
              </div>
              {/* BACK — Chinese + image */}
              <div className="fc-face fc-back">
                <SpeakerBtn text={card.zh} lang="zh-TW" className="fc-face-speaker fc-face-speaker-dark"/>
                {card.imageUrl && (
                  <div className="fc-back-img-wrap">
                    <img src={card.imageUrl} alt={card.zh}/>
                  </div>
                )}
                <div className="fc-zh">{card.zh}</div>
                {card.example && <div className="fc-example serif-i">"{card.example}"</div>}
              </div>
            </div>
          </div>

          <div className="fc-nav">
            <button className="fc-nav-btn" onClick={() => { setCardIdx(i => i - 1); setFlipped(false); }} disabled={cardIdx === 0}>← Prev</button>
            <div className="fc-dots">
              {cards.map((_, i) => (
                <span key={i} className={"fc-dot" + (i === cardIdx ? " active" : "")} onClick={() => { setCardIdx(i); setFlipped(false); }}/>
              ))}
            </div>
            <button className="fc-nav-btn" onClick={() => { setCardIdx(i => i + 1); setFlipped(false); }} disabled={cardIdx === cards.length - 1}>Next →</button>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────── LEARN MODE ────────────────── */
  if (mode === "learn") {
    // Done
    if (learnQueue.length === 0) {
      return (
        <div className="fc-wrap">
          <ModeTabs active="learn"/>
          <div className="fc-player">
            <div className="fc-complete">
              <div className="fc-complete-icon">🎉</div>
              <div className="serif" style={{fontSize: 36, marginBottom: 8}}>All Learned!</div>
              <div className="mono" style={{color: "var(--ink-muted)", marginBottom: 24}}>
                {correctIds.size} / {cards.length} mastered
              </div>
              <div style={{display: "flex", gap: 12}}>
                <button className="btn ghost" onClick={enterLearn}>Practice Again</button>
                <button className="btn primary" onClick={enterTest}>Take Test →</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const { card, isRetry } = learnQueue[0];

    const handleLearnChoice = (chosen) => {
      if (learnChoice) return;
      setLearnChoice(chosen.id);
      const correct = chosen.id === card.id;

      setTimeout(() => {
        const rest = learnQueue.slice(1);
        let newQueue;
        if (correct) {
          newQueue = rest;
          setCorrectIds(prev => new Set([...prev, card.id]));
        } else {
          newQueue = [...rest];
          const insertPos = Math.min(RETRY_GAP, newQueue.length);
          newQueue.splice(insertPos, 0, { card, isRetry: true });
        }
        setLearnQueue(newQueue);
        if (newQueue.length > 0) setLearnChoices(makeChoices(newQueue[0].card, cards));
        setLearnChoice(null);
      }, correct ? 700 : 1200);
    };

    return (
      <div className="fc-wrap">
        <ModeTabs active="learn"/>
        <div className="fc-player">
          <DualProgressBar correct={correctIds.size} total={cards.length}/>

          <div className="fc-learn-q">
            {isRetry && <div className="fc-retry-badge mono">再試一次吧 · Try again</div>}
            {card.imageUrl && <img src={card.imageUrl} alt={card.zh} className="fc-learn-img"/>}
            <div className="fc-learn-zh">{card.zh}</div>
            <div className="mono" style={{fontSize: 10, color: "var(--ink-muted)", marginTop: 10}}>
              Choose the English word · 選出正確英文單字
            </div>
          </div>

          <div className="fc-choices">
            {learnChoices.map((c, i) => {
              let cls = "fc-choice";
              if (learnChoice) {
                if (c.id === card.id)     cls += " correct";
                else if (c.id === learnChoice) cls += " wrong";
                else                      cls += " dimmed";
              }
              return (
                <button key={i} className={cls} onClick={() => handleLearnChoice(c)}>
                  {c.term}
                  {learnChoice && c.id === card.id        && <span className="fc-choice-badge">✓</span>}
                  {learnChoice && c.id === learnChoice && c.id !== card.id && <span className="fc-choice-badge">✗</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────── TEST MODE ────────────────── */
  if (mode === "test") {

    /* Setup screen */
    if (testSetup) {
      const hasChoice  = testType === "choice" || testType === "both";
      const hasWritten = testType === "written" || testType === "both";
      const toggleChoice = () => {
        if (hasChoice && !hasWritten) return; // keep at least one
        setTestType(hasChoice ? (hasWritten ? "written" : "choice") : (hasWritten ? "both" : "choice"));
      };
      const toggleWritten = () => {
        if (hasWritten && !hasChoice) return;
        setTestType(hasWritten ? (hasChoice ? "choice" : "written") : (hasChoice ? "both" : "written"));
      };
      return (
        <div className="fc-wrap">
          <ModeTabs active="test"/>
          <div className="fc-player">
            <div className="fc-test-setup">
              <div className="serif" style={{fontSize: 28, marginBottom: 4}}>設置你的<em>測驗</em></div>
              <div className="mono" style={{fontSize: 10, color: "var(--ink-muted)", marginBottom: 28}}>
                {cards.length} cards · 看中文，回答英文
              </div>
              <div className="fc-setup-options">
                <label className="fc-setup-row">
                  <div>
                    <div className="fc-setup-label">選擇題 Multiple Choice</div>
                    <div className="fc-setup-desc">看中文定義，從四個英文選項選出正確答案</div>
                  </div>
                  <div className={"fc-toggle" + (hasChoice ? " on" : "")} onClick={toggleChoice}/>
                </label>
                <label className="fc-setup-row">
                  <div>
                    <div className="fc-setup-label">手寫題 Written</div>
                    <div className="fc-setup-desc">看中文定義，自己打出正確英文單字</div>
                  </div>
                  <div className={"fc-toggle" + (hasWritten ? " on" : "")} onClick={toggleWritten}/>
                </label>
              </div>
              <button className="btn primary" style={{width: "100%", padding: 14, fontSize: 13}} onClick={startTest}>
                開始測驗 · Start Test
              </button>
            </div>
          </div>
        </div>
      );
    }

    /* Results screen */
    if (testDone) {
      const hasChoice  = testType === "choice" || testType === "both";
      const hasWritten = testType === "written" || testType === "both";

      const results = cards.map(card => {
        let correct = true;
        let userAnswer = "";
        if (hasChoice) {
          const ok = testAnswers[card.id] === card.id;
          if (!ok) {
            correct = false;
            const chosen = testChoices[card.id]?.find(c => c.id === testAnswers[card.id]);
            userAnswer = chosen?.term || "—";
          }
        }
        if (hasWritten) {
          const typed = (typedAnswers[card.id] || "").trim();
          const ok = typed.toLowerCase() === card.term.toLowerCase();
          if (!ok) { correct = false; userAnswer = typed || "—"; }
        }
        return { card, correct, userAnswer };
      });

      const correctCount = results.filter(r => r.correct).length;
      const pct = Math.round((correctCount / cards.length) * 100);
      return (
        <div className="fc-wrap">
          <ModeTabs active="test"/>
          <div className="fc-player">
            <div className="fc-complete">
              <div className="fc-complete-icon">{pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪"}</div>
              <div className="serif" style={{fontSize: 48, lineHeight: 1, marginBottom: 4}}>
                {pct}<span style={{fontSize: 24}}>%</span>
              </div>
              <div className="mono" style={{color: "var(--ink-muted)", marginBottom: 20}}>
                {correctCount} / {cards.length} correct · 答對
              </div>
              <div className="fc-review-list">
                {results.map(({card, correct, userAnswer}) => (
                  <div key={card.id} className={"fc-review-row " + (correct ? "ok" : "err")}>
                    <span className="fc-review-icon">{correct ? "✓" : "✗"}</span>
                    <span className="fc-review-term">{card.zh}</span>
                    <span className="fc-review-ans">
                      {!correct && userAnswer && <span className="fc-review-wrong">{userAnswer}</span>}
                      <span className="fc-review-correct">{card.term}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div style={{display: "flex", gap: 12, marginTop: 20}}>
                <button className="btn ghost" onClick={() => { setTestSetup(true); setTestAnswers({}); setTypedAnswers({}); setTestDone(false); }}>Try Again</button>
                <button className="btn primary" onClick={enterLearn}>Study More →</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* Test questions */
    const hasChoice  = testType === "choice" || testType === "both";
    const hasWritten = testType === "written" || testType === "both";

    const answeredCards = new Set(
      cards.filter(card => {
        const okChoice  = !hasChoice  || testAnswers[card.id];
        const okWritten = !hasWritten || (typedAnswers[card.id] || "").trim();
        return okChoice && okWritten;
      }).map(c => c.id)
    );

    return (
      <div className="fc-wrap">
        <ModeTabs active="test"/>
        <div className="fc-player">
          <div className="fc-topbar">
            <span className="mono">{answeredCards.size} / {cards.length} answered</span>
            <div className="fc-progress-bar">
              <div className="fc-progress-fill" style={{width: `${(answeredCards.size / cards.length) * 100}%`}}/>
            </div>
          </div>

          <div className="fc-test-list">
            {cards.map((card, qi) => {
              const choices   = testChoices[card.id] || [];
              const selectedId = testAnswers[card.id];
              const typedVal  = typedAnswers[card.id] || "";

              return (
                <div key={card.id} className="fc-test-q">
                  <div className="fc-test-qrow">
                    <span className="fc-test-num mono">{qi + 1}.</span>
                    <div className="fc-test-term">
                      {card.imageUrl && <img src={card.imageUrl} alt={card.zh} className="fc-test-img"/>}
                      <span style={{fontSize: 18, fontFamily: "var(--sans)"}}>{card.zh}</span>
                    </div>
                  </div>
                  {hasChoice && (
                    <div className="fc-test-choices">
                      {choices.map((ch, ci) => (
                        <button key={ci}
                          className={"fc-test-choice" + (selectedId === ch.id ? " selected" : "")}
                          onClick={() => setTestAnswers(prev => ({...prev, [card.id]: ch.id}))}
                        >{ch.term}</button>
                      ))}
                    </div>
                  )}
                  {hasWritten && (
                    <div className="fc-test-written">
                      <input
                        className="fc-written-input"
                        value={typedVal}
                        onChange={e => setTypedAnswers(prev => ({...prev, [card.id]: e.target.value}))}
                        placeholder="Type the English word · 在此輸入英文單字"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="fc-test-foot">
            <button
              className="btn primary"
              disabled={answeredCards.size < cards.length}
              onClick={() => { setTestDone(true); if (onComplete) onComplete(); }}
            >
              Submit · 交卷 ({answeredCards.size}/{cards.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ══════════════════════════════════════════════════════
   FLASHCARD EDITOR
══════════════════════════════════════════════════════ */
function FlashcardEditor({ cards, onChange }) {
  const [importing, setImporting] = useFC(false);
  const [importText, setImportText] = useFC("");
  const [imgSearch, setImgSearch] = useFC(null);
  const [openCard, setOpenCard] = useFC(null);

  const addCard = () => {
    const id = "c" + Date.now() + Math.random().toString(36).slice(2, 5);
    onChange([...cards, { id, term: "", zh: "", example: "", imageUrl: "" }]);
    setOpenCard(id);
  };
  const updateCard = (id, patch) => onChange(cards.map(c => c.id === id ? {...c, ...patch} : c));
  const deleteCard = (id) => { onChange(cards.filter(c => c.id !== id)); if (openCard === id) setOpenCard(null); };
  const moveCard = (id, dir) => {
    const arr = [...cards], i = arr.findIndex(c => c.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; onChange(arr);
  };
  const handleImport = () => {
    const parsed = importText.split('\n').filter(l => l.trim()).map(line => {
      const p = line.split(/\s*-\s*/);
      return { id: "c"+Date.now()+Math.random().toString(36).slice(2,5), term:(p[0]||"").trim(), zh:(p[1]||"").trim(), example:(p[2]||"").trim(), imageUrl:"" };
    }).filter(c => c.term);
    if (!parsed.length) return;
    onChange([...cards, ...parsed]);
    setImportText(""); setImporting(false);
  };
  const importLineCount = importText.split('\n').filter(l => l.trim()).length;

  return (
    <div className="fc-editor">
      {imgSearch && (
        <ImageSearch term={imgSearch.term} onSelect={url => updateCard(imgSearch.cardId, {imageUrl: url})} onClose={() => setImgSearch(null)}/>
      )}
      <div className="fc-editor-bar">
        <span className="mono" style={{fontSize:10, color:"var(--ink-muted)"}}>{cards.length} 張卡片</span>
        <div style={{display:"flex", gap:8}}>
          <button className={"btn ghost"+(importing?" active":"")} style={{padding:"6px 12px",fontSize:11}} onClick={() => setImporting(v=>!v)}>⬇ Import</button>
          <button className="btn primary" style={{padding:"6px 12px",fontSize:11}} onClick={addCard}>+ Add Card</button>
        </div>
      </div>
      {importing && (
        <div className="fc-import-box">
          <div className="mono" style={{fontSize:10,color:"var(--ink-muted)",marginBottom:8}}>
            每行一張卡：<code style={{background:"var(--border-soft)",padding:"1px 4px",borderRadius:2}}>英文 - 中文 - 例句</code>（例句可省略）
          </div>
          <textarea className="fc-import-ta" value={importText} onChange={e=>setImportText(e.target.value)} rows={7}
            placeholder={"queen - 女王 - The queen ruled the kingdom.\nfable - 寓言故事\ntrack (v.) - 追蹤"}/>
          <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
            <button className="btn ghost" onClick={()=>{setImporting(false);setImportText("");}}>Cancel</button>
            <button className="btn primary" onClick={handleImport} disabled={!importLineCount}>Import {importLineCount} {importLineCount===1?"card":"cards"}</button>
          </div>
        </div>
      )}
      <div className="fc-card-list">
        {cards.length===0 && !importing && <div className="fc-card-empty mono">尚未新增卡片 — 點選上方 Add Card 或 Import</div>}
        {cards.map((card, idx) => {
          const isOpen = openCard === card.id;
          return (
            <div key={card.id} className={"fc-card-row"+(isOpen?" open":"")}>
              <div className="fc-card-row-head" onClick={()=>setOpenCard(isOpen?null:card.id)}>
                <span className="mono" style={{color:"var(--ink-faint)",fontSize:10,minWidth:18}}>{idx+1}</span>
                <span className="fc-row-term">{card.term||<em style={{color:"var(--ink-faint)"}}>untitled</em>}</span>
                <span className="fc-row-zh">{card.zh}</span>
                {card.imageUrl && <img src={card.imageUrl} alt="" className="fc-row-thumb"/>}
                <div className="fc-row-tools" onClick={e=>e.stopPropagation()}>
                  <button title="Move up" onClick={()=>moveCard(card.id,-1)} disabled={idx===0} style={{opacity:idx===0?0.3:1}}>↑</button>
                  <button title="Move down" onClick={()=>moveCard(card.id,1)} disabled={idx===cards.length-1} style={{opacity:idx===cards.length-1?0.3:1}}>↓</button>
                  <button title="Delete" onClick={()=>{if(confirm("Delete this card?"))deleteCard(card.id);}} style={{color:"var(--accent)"}}>✕</button>
                </div>
                <span className="fc-row-chevron mono">{isOpen?"▲":"▼"}</span>
              </div>
              {isOpen && (
                <div className="fc-card-row-body">
                  <div className="fc-card-fields">
                    <div className="field"><label className="field-label">Term · 英文單字</label><input value={card.term} onChange={e=>updateCard(card.id,{term:e.target.value})} placeholder="e.g. queen"/></div>
                    <div className="field"><label className="field-label">中文定義</label><input value={card.zh} onChange={e=>updateCard(card.id,{zh:e.target.value})} placeholder="例：女王"/></div>
                    <div className="field"><label className="field-label">Example · 例句 <span style={{fontWeight:400,textTransform:"none"}}>(optional)</span></label><input value={card.example||""} onChange={e=>updateCard(card.id,{example:e.target.value})} placeholder="The queen ruled the kingdom."/></div>
                  </div>
                  <div className="fc-card-img-col">
                    <div className="field-label" style={{marginBottom:8}}>Image · 圖片</div>
                    {card.imageUrl ? (
                      <div className="fc-img-preview">
                        <img src={card.imageUrl} alt={card.term}/>
                        <div style={{display:"flex",gap:6,marginTop:6}}>
                          <button className="btn ghost" style={{fontSize:10,padding:"4px 10px"}} onClick={()=>setImgSearch({cardId:card.id,term:card.term||""})}>Change</button>
                          <button className="btn ghost" style={{fontSize:10,padding:"4px 10px"}} onClick={()=>updateCard(card.id,{imageUrl:""})}>Remove</button>
                        </div>
                      </div>
                    ) : (
                      <button className="fc-img-add" onClick={()=>setImgSearch({cardId:card.id,term:card.term||""})}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        <span className="mono" style={{fontSize:10,marginTop:6,color:"var(--ink-muted)"}}>Search Image</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { FlashcardPlayer, FlashcardEditor, ImageSearch });
