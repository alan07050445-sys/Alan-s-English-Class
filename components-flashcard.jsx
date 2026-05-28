// components-flashcard.jsx — Flashcard system: Card / Learn / Test + image search

const { useState: useFC, useEffect: useFC_E } = React;

const PIXABAY_KEY = "55964296-48988fd7e26a6999ecaff6b95";
const PEXELS_KEY  = "ddCplPdhHd2AvScvkob1rxUHoz7UEoLk0yETCc6tdBZ3rlhR5Zwsjs4P";
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

// Split sentence around the term for fill-in-blank display
function splitSentence(sentence, term) {
  if (!sentence || !term) return null;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = sentence.match(new RegExp(escaped, 'i'));
  if (!m) return null;
  return [sentence.slice(0, m.index), sentence.slice(m.index + m[0].length)];
}

function fmtTime(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

const FILL_COLORS = ["#3b82f6", "#ef4444", "#f97316", "#22c55e"];

const THEMES = {
  classic:   { name: "🎨 Classic",    colors: ["#3b82f6","#ef4444","#f97316","#22c55e"] },
  classroom: { name: "📚 Classroom",  colors: ["#f59e0b","#eab308","#10b981","#38bdf8"] },
  game:      { name: "🎮 Video Game", colors: ["#92400e","#92400e","#92400e","#92400e"] },
  ocean:     { name: "🌊 Ocean",      colors: ["#0369a1","#0891b2","#0284c7","#1d4ed8"] },
  night:     { name: "🌙 Night",      colors: ["#7c3aed","#dc2626","#b45309","#15803d"] },
};

/* ══════════════════════════════════════════════════════
   IMAGE SEARCH  (Pixabay)
══════════════════════════════════════════════════════ */
function ImageSearch({ term: initialTerm, onSelect, onClose }) {
  const [q, setQ] = useFC(initialTerm || "");
  const [source, setSource] = useFC("pexels"); // 'pexels' | 'pixabay'
  const [results, setResults] = useFC([]);
  const [loading, setLoading] = useFC(false);
  const [page, setPage] = useFC(1);
  const [total, setTotal] = useFC(0);
  const [searched, setSearched] = useFC(false);
  const [error, setError] = useFC("");

  const PER_PAGE = 12;

  const searchPexels = async (searchQ, pg) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQ)}&per_page=${PER_PAGE}&page=${pg}&locale=en-US`;
    const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    // normalise to {id, thumb, full, title}
    return {
      items: (data.photos || []).map(p => ({ id: p.id, thumb: p.src.medium, full: p.src.large, title: p.alt || searchQ })),
      total: Math.min(data.total_results || 0, 500),
    };
  };

  const searchPixabay = async (searchQ, pg) => {
    const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(searchQ)}&image_type=all&safesearch=true&per_page=${PER_PAGE}&page=${pg}`;
    const data = await fetch(url).then(r => r.json());
    return {
      items: (data.hits || []).map(p => ({ id: p.id, thumb: p.previewURL, full: p.webformatURL, title: p.tags })),
      total: data.totalHits || 0,
    };
  };

  const search = async (searchQ, pg = 1, src = source) => {
    if (!searchQ.trim()) return;
    setLoading(true); setSearched(true); setError("");
    try {
      const { items, total: tot } = src === "pexels"
        ? await searchPexels(searchQ, pg)
        : await searchPixabay(searchQ, pg);
      setResults(items); setTotal(tot); setPage(pg);
    } catch (e) {
      setError("Search failed — try again."); setResults([]);
    } finally { setLoading(false); }
  };

  const switchSource = (src) => {
    setSource(src); setResults([]); setSearched(false); setError(""); setPage(1);
    if (q.trim()) search(q, 1, src);
  };

  useFC_E(() => { if (initialTerm) search(initialTerm, 1, "pexels"); }, []);

  const canPrev = page > 1;
  const canNext = page * PER_PAGE < total;

  const SOURCES = [
    { id: "pexels",   label: "Pexels",   sub: "高品質照片" },
    { id: "pixabay",  label: "Pixabay",  sub: "插圖 · 向量圖" },
  ];

  return (
    <div className="img-search-overlay" onClick={onClose}>
      <div className="img-search-panel" onClick={e => e.stopPropagation()}>
        <div className="img-search-head">
          <div className="serif" style={{fontSize: 22}}>Search <em>Images</em></div>
          <button className="modal-close" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        {/* Source tabs */}
        <div className="img-source-tabs">
          {SOURCES.map(s => (
            <button key={s.id}
              className={"img-source-tab" + (source === s.id ? " active" : "")}
              onClick={() => switchSource(s.id)}>
              <span>{s.label}</span>
              <span className="img-source-sub">{s.sub}</span>
            </button>
          ))}
        </div>

        <div className="img-search-bar">
          <input className="img-search-input" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search(q, 1)}
            placeholder="Search in English (e.g. escape, ancient Rome, bicycle)…" autoFocus/>
          <button className="btn primary" onClick={() => search(q, 1)} style={{flexShrink: 0}}>Search</button>
        </div>

        {loading && <div className="img-search-status mono">Searching…</div>}
        {error && <div className="img-search-status mono" style={{color:"var(--accent)"}}>{error}</div>}
        {!loading && !error && searched && results.length === 0 && (
          <div className="img-search-status mono">No results — try another keyword.</div>
        )}
        <div className="img-search-grid">
          {results.map(img => (
            <button key={img.id} className="img-search-item"
              onClick={() => { onSelect(img.full); onClose(); }}
              title={img.title}>
              <img src={img.thumb} alt={img.title} loading="lazy"/>
            </button>
          ))}
        </div>
        {total > PER_PAGE && (
          <div className="img-search-pages">
            <button className="btn ghost" onClick={() => search(q, page - 1)} disabled={!canPrev}>← Prev</button>
            <span className="mono" style={{fontSize: 10, color: "var(--ink-muted)"}}>
              Page {page} · {total} results
            </span>
            <button className="btn ghost" onClick={() => search(q, page + 1)} disabled={!canNext}>Next →</button>
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
  const [questionTypes, setQuestionTypes] = useFC({}); // cardId → "choice" | "written"
  const [testAnswers, setTestAnswers] = useFC({}); // cardId → chosen card id
  const [typedAnswers, setTypedAnswers] = useFC({}); // cardId → string
  const [testDone, setTestDone] = useFC(false);

  // Match mode
  const [matchTiles, setMatchTiles] = useFC([]);
  const [matchSelected, setMatchSelected] = useFC(null);
  const [matchMatched, setMatchMatched] = useFC(new Set());
  const [matchWrong, setMatchWrong] = useFC([]);
  const [matchElapsed, setMatchElapsed] = useFC(0);
  const [matchBest, setMatchBest] = useFC(null);
  const [matchDone, setMatchDone] = useFC(false);
  const [matchStarted, setMatchStarted] = useFC(false);
  const [isNewBest, setIsNewBest] = useFC(false);
  const matchStartRef = React.useRef(null);
  const matchTimerRef = React.useRef(null);

  // Fill-in-blank mode
  const [fillCards, setFillCards] = useFC([]);
  const [fillIdx, setFillIdx] = useFC(0);
  const [fillChoices, setFillChoices] = useFC([]);
  const [fillSelected, setFillSelected] = useFC(null);
  const [fillScore, setFillScore] = useFC(0);
  const [fillDone, setFillDone] = useFC(false);

  // Cleanup timer on unmount
  useFC_E(() => () => { if (matchTimerRef.current) clearInterval(matchTimerRef.current); }, []);

  const stopMatchTimer = () => { if (matchTimerRef.current) { clearInterval(matchTimerRef.current); matchTimerRef.current = null; } };

  const enterCard = () => { stopMatchTimer(); setMode("card"); setCardIdx(0); setFlipped(false); };

  const enterLearn = () => { stopMatchTimer();
    const order = shuffle([...cards]);
    const queue = order.map(card => ({ card, isRetry: false }));
    setLearnQueue(queue);
    setCorrectIds(new Set());
    setLearnChoice(null);
    setLearnChoices(queue.length > 0 ? makeChoices(queue[0].card, cards) : []);
    setMode("learn");
  };

  const enterTest = () => {
    stopMatchTimer();
    setTestSetup(true);
    setTestAnswers({});
    setTypedAnswers({});
    setTestDone(false);
    setMode("test");
  };

  const startTest = () => {
    const tc = {};
    const qt = {};
    if (testType === "both") {
      // Shuffle cards and alternate: first half → choice, second half → written
      const shuffled = shuffle([...cards]);
      const half = Math.ceil(shuffled.length / 2);
      shuffled.forEach((card, i) => { qt[card.id] = i < half ? "choice" : "written"; });
    }
    cards.forEach(card => {
      tc[card.id] = makeChoices(card, cards);
      if (testType !== "both") qt[card.id] = testType;
    });
    setTestChoices(tc);
    setQuestionTypes(qt);
    setTestSetup(false);
  };

  const enterMatch = () => {
    stopMatchTimer();
    let best = null;
    try { best = parseFloat(localStorage.getItem('fc-match-' + item.id)) || null; } catch {}
    setMatchBest(best);
    // Pick 6 random pairs each round (shuffle for variety)
    const picked = shuffle([...cards]).slice(0, Math.min(6, cards.length));
    const tiles = [];
    picked.forEach(card => {
      tiles.push({ id: 'en-' + card.id, text: card.term, pairId: card.id, isZh: false, imageUrl: '' });
      tiles.push({ id: 'zh-' + card.id, text: card.zh,  pairId: card.id, isZh: true,  imageUrl: card.imageUrl || '' });
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

  const startMatch = () => {
    setMatchStarted(true);
    matchStartRef.current = Date.now();
    matchTimerRef.current = setInterval(() => {
      setMatchElapsed(Math.round((Date.now() - matchStartRef.current) / 100) / 10);
    }, 100);
  };

  const handleMatchClick = (tile) => {
    if (matchWrong.length > 0) return;
    if (matchMatched.has(tile.pairId)) return;
    if (matchSelected === tile.id) { setMatchSelected(null); return; }
    if (!matchSelected) { setMatchSelected(tile.id); return; }
    const selTile = matchTiles.find(t => t.id === matchSelected);
    if (selTile && selTile.pairId === tile.pairId) {
      if (window.playSound) window.playSound('match');
      const newMatched = new Set([...matchMatched, tile.pairId]);
      setMatchMatched(newMatched);
      setMatchSelected(null);
      if (newMatched.size === matchTiles.length / 2) {
        stopMatchTimer();
        const elapsed = Math.round((Date.now() - matchStartRef.current) / 100) / 10;
        let prevBest = null;
        try { prevBest = parseFloat(localStorage.getItem('fc-match-' + item.id)) || null; } catch {}
        const nb = !prevBest || elapsed < prevBest;
        if (nb) { try { localStorage.setItem('fc-match-' + item.id, elapsed); } catch {} }
        setMatchElapsed(elapsed);
        setMatchBest(nb ? elapsed : prevBest);
        setIsNewBest(nb);
        setMatchDone(true);
        if (window.playSound) window.playSound('complete');
        // Speed match badge: finish under 20 seconds
        if (elapsed < 20) {
          const u = window._currentUser;
          if (u?.uid) window.unlockBadge && window.unlockBadge(u.uid, 'speed_match');
        }
      }
    } else {
      if (window.playSound) window.playSound('wrong');
      setMatchWrong([matchSelected, tile.id]);
      setTimeout(() => { setMatchWrong([]); setMatchSelected(null); }, 800);
    }
  };

  const enterFill = () => {
    stopMatchTimer();
    const eligible = cards.filter(c => c.example && c.example.trim());
    const pool = eligible.length >= 2 ? eligible : cards;
    const shuffled = shuffle([...pool]);
    setFillCards(shuffled);
    setFillIdx(0);
    setFillScore(0);
    setFillSelected(null);
    setFillDone(false);
    setFillChoices(makeChoices(shuffled[0], cards));
    setMode("fill");
  };

  const handleFillChoice = (chosen) => {
    if (fillSelected) return;
    const card = fillCards[fillIdx];
    const correct = chosen.id === card.id;
    setFillSelected(chosen.id);
    if (correct) setFillScore(s => s + 1);
    setTimeout(() => {
      const next = fillIdx + 1;
      if (next >= fillCards.length) { setFillDone(true); }
      else { setFillIdx(next); setFillChoices(makeChoices(fillCards[next], cards)); setFillSelected(null); }
    }, correct ? 800 : 1400);
  };

  const ModeTabs = ({ active }) => (
    <div className="fc-mode-tabs">
      <button className={"fc-tab" + (active === "card"  ? " active" : "")} onClick={enterCard}>🃏 單字卡</button>
      <button className={"fc-tab" + (active === "learn" ? " active" : "")} onClick={enterLearn}>📖 學習</button>
      <button className={"fc-tab" + (active === "match" ? " active" : "")} onClick={enterMatch}>⚡ 配對</button>
      <button className={"fc-tab" + (active === "fill"  ? " active" : "")} onClick={enterFill}>✏️ 填空</button>
      <button className={"fc-tab" + (active === "test"  ? " active" : "")} onClick={enterTest}>📝 測驗</button>
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
      if (window.playSound) window.playSound(correct ? 'correct' : 'wrong');

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
      const results = cards.map(card => {
        const qType = questionTypes[card.id] || "choice";
        let correct = true;
        let userAnswer = "";
        if (qType === "choice") {
          const ok = testAnswers[card.id] === card.id;
          if (!ok) {
            correct = false;
            const chosen = testChoices[card.id]?.find(c => c.id === testAnswers[card.id]);
            userAnswer = chosen?.term || "—";
          }
        } else {
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
                <button className="btn ghost" onClick={() => { setTestSetup(true); setTestAnswers({}); setTypedAnswers({}); setQuestionTypes({}); setTestDone(false); }}>Try Again</button>
                <button className="btn primary" onClick={enterLearn}>Study More →</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* Test questions */
    const answeredCards = new Set(
      cards.filter(card => {
        const qType = questionTypes[card.id] || "choice";
        if (qType === "choice") return !!testAnswers[card.id];
        return !!(typedAnswers[card.id] || "").trim();
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
              const qType     = questionTypes[card.id] || "choice";
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
                    <span className="mono" style={{fontSize: 9, color: "var(--ink-faint)", marginLeft: 6}}>
                      {qType === "choice" ? "選擇" : "手寫"}
                    </span>
                  </div>
                  {qType === "choice" && (
                    <div className="fc-test-choices">
                      {choices.map((ch, ci) => (
                        <button key={ci}
                          className={"fc-test-choice" + (selectedId === ch.id ? " selected" : "")}
                          onClick={() => setTestAnswers(prev => ({...prev, [card.id]: ch.id}))}
                        >{ch.term}</button>
                      ))}
                    </div>
                  )}
                  {qType === "written" && (
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

  /* ────────────────── MATCH MODE ────────────────── */
  if (mode === "match") {

    /* ── Ready screen ── */
    if (!matchStarted) {
      return (
        <div className="fc-wrap">
          <ModeTabs active="match"/>
          <div className="fc-player">
            <div className="fc-match-ready">
              <div style={{fontSize: 52, marginBottom: 12}}>⚡</div>
              <div className="serif" style={{fontSize: 32, marginBottom: 8}}>Ready to <em>Match?</em></div>
              <div className="mono" style={{fontSize: 11, color: "var(--ink-muted)", marginBottom: 4}}>
                {matchTiles.length / 2} 對配對 · {matchTiles.length} 張卡片
              </div>
              {matchBest && (
                <div className="mono" style={{fontSize: 11, color: "var(--ink-faint)", marginBottom: 24}}>
                  Best: {matchBest.toFixed(1)}s
                </div>
              )}
              {!matchBest && <div style={{marginBottom: 24}}/>}
              <button className="btn primary" style={{padding: "14px 48px", fontSize: 15, letterSpacing: "0.06em"}} onClick={startMatch}>
                開始 · Start
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (matchDone) {
      return (
        <div className="fc-wrap">
          <ModeTabs active="match"/>
          <div className="fc-player">
            <div className="fc-complete">
              <div className="fc-complete-icon">⚡</div>
              <div className="serif" style={{fontSize: 52, lineHeight: 1, marginBottom: 6}}>
                {matchElapsed.toFixed(1)}<span style={{fontSize: 24}}>s</span>
              </div>
              {isNewBest && (
                <div className="fc-match-best-badge mono">🏆 New Best!</div>
              )}
              {matchBest && !isNewBest && (
                <div className="mono" style={{color: "var(--ink-muted)", fontSize: 12, marginBottom: 4}}>
                  Best: {matchBest.toFixed(1)}s
                </div>
              )}
              <div className="mono" style={{color: "var(--ink-muted)", marginBottom: 24, marginTop: 8}}>
                All {matchTiles.length / 2} pairs matched!
              </div>
              <div style={{display: "flex", gap: 12}}>
                <button className="btn ghost" onClick={enterMatch}>Play Again</button>
                <button className="btn primary" onClick={enterLearn}>Study More →</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="fc-wrap">
        <ModeTabs active="match"/>
        <div className="fc-player">
          <div className="fc-match-topbar">
            <span className="fc-match-timer mono">{matchElapsed.toFixed(1)}<span style={{fontSize:14}}>s</span></span>
            <span className="mono" style={{fontSize: 11, color: "var(--ink-muted)"}}>
              {matchMatched.size} / {matchTiles.length / 2} matched
            </span>
            {matchBest && (
              <span className="mono" style={{fontSize: 10, color: "var(--ink-faint)"}}>
                Best {matchBest.toFixed(1)}s
              </span>
            )}
          </div>
          <div className="fc-match-grid">
            {matchTiles.map(tile => {
              const isMatched  = matchMatched.has(tile.pairId);
              const isSelected = matchSelected === tile.id;
              const isWrong    = matchWrong.includes(tile.id);
              let cls = "fc-match-tile";
              if (isMatched)       cls += " matched";
              else if (isSelected) cls += " selected";
              else if (isWrong)    cls += " wrong";
              else if (tile.isZh)  cls += " zh-tile";
              return (
                <button key={tile.id} className={cls}
                  onClick={() => !isMatched && handleMatchClick(tile)}>
                  {tile.imageUrl && (
                    <img src={tile.imageUrl} alt="" className="fc-match-tile-bg"/>
                  )}
                  <span className={`fc-match-tile-text${tile.imageUrl ? ' has-img' : ''}`}>
                    {tile.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────── FILL-IN-BLANK MODE ────────────────── */
  if (mode === "fill") {
    if (fillDone) {
      const pct = Math.round((fillScore / fillCards.length) * 100);
      return (
        <div className="fc-wrap">
          <ModeTabs active="fill"/>
          <div className="fc-player">
            <div className="fc-complete">
              <div className="fc-complete-icon">{pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪"}</div>
              <div className="serif" style={{fontSize: 48, lineHeight: 1, marginBottom: 4}}>
                {pct}<span style={{fontSize: 24}}>%</span>
              </div>
              <div className="mono" style={{color: "var(--ink-muted)", marginBottom: 24}}>
                {fillScore} / {fillCards.length} correct · 答對
              </div>
              <div style={{display: "flex", gap: 12}}>
                <button className="btn ghost" onClick={enterFill}>Try Again</button>
                <button className="btn primary" onClick={enterLearn}>Study More →</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    const card = fillCards[fillIdx];
    const parts = splitSentence(card.example, card.term);
    const blankLen = Math.max(6, (card.term || "").length);
    return (
      <div className="fc-wrap">
        <ModeTabs active="fill"/>
        <div className="fc-fill-player">
          <div className="fc-fill-topbar">
            <span className="mono" style={{fontSize: 11, color: "var(--ink-muted)"}}>
              {fillIdx + 1} / {fillCards.length}
            </span>
            <span className="mono" style={{fontSize: 11, color: "var(--ink-muted)"}}>✓ {fillScore}</span>
          </div>
          <div className="fc-fill-sentence">
            {parts ? (
              <div className="fc-fill-text">
                {parts[0]}<span className="fc-fill-blank">{"_".repeat(blankLen)}</span>{parts[1]}
              </div>
            ) : (
              <div className="fc-fill-text fc-fill-zh">{card.zh}</div>
            )}
          </div>
          <div className="fc-fill-choices">
            {fillChoices.map((ch, i) => {
              let cls = "fc-fill-btn";
              if (fillSelected) {
                if (ch.id === card.id)       cls += " correct";
                else if (ch.id === fillSelected) cls += " wrong";
                else                         cls += " dimmed";
              }
              return (
                <button key={ch.id} className={cls}
                  style={!fillSelected ? {background: FILL_COLORS[i % 4]} : undefined}
                  onClick={() => handleFillChoice(ch)}>
                  {ch.term}
                </button>
              );
            })}
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

/* ══════════════════════════════════════════════════════
   STANDALONE FILL-IN-BLANK PLAYER
══════════════════════════════════════════════════════ */
function FillBlankPlayer({ item, onComplete }) {
  const questions = item.questions || [];
  const [theme, setTheme] = useFC(item.theme || "classic");
  const [idx, setIdx] = useFC(0);
  const [choices, setFBChoices] = useFC([]);
  const [selected, setFBSelected] = useFC(null);
  const [score, setFBScore] = useFC(0);
  const [showTheme, setShowTheme] = useFC(false);

  // screen: 'play' | 'complete' | 'name-entry' | 'leaderboard' | 'show-answers'
  const [screen, setScreen] = useFC('play');
  const [elapsed, setElapsed] = useFC(0);
  const [userAnswers, setUserAnswers] = useFC([]); // [{sentence, answer, userAnswer, correct}]
  const [playerName, setPlayerName] = useFC('');
  const [leaderboard, setLeaderboard] = useFC([]);
  const [submitting, setSubmitting] = useFC(false);
  const [submitted, setSubmitted] = useFC(false); // Bug fix: track if already submitted this round

  const startTimeRef = React.useRef(null);
  const lbUnsubRef = React.useRef(null);

  const makeFBChoices = (qi) => {
    const q = questions[qi];
    const others = questions.filter((_, i) => i !== qi).map(o => o.answer).filter(Boolean);
    return shuffle([...shuffle(others).slice(0, Math.min(3, others.length)), q.answer]);
  };

  useFC_E(() => {
    if (questions.length > 0) {
      setFBChoices(makeFBChoices(0));
      startTimeRef.current = Date.now();
    }
  }, []);

  // Subscribe to leaderboard whenever we're on a post-game screen
  useFC_E(() => {
    if (screen === 'complete' || screen === 'name-entry' || screen === 'leaderboard') {
      if (lbUnsubRef.current) lbUnsubRef.current();
      lbUnsubRef.current = window.subscribeLeaderboard(item.id, setLeaderboard);
    }
    return () => { if (lbUnsubRef.current) { lbUnsubRef.current(); lbUnsubRef.current = null; } };
  }, [screen]);

  const handleFBChoice = (ch) => {
    if (selected) return;
    const q = questions[idx];
    const correct = ch === q.answer;
    setFBSelected(ch);
    const newAnswers = [...userAnswers, { sentence: q.sentence, answer: q.answer, userAnswer: ch, correct }];
    setUserAnswers(newAnswers);
    if (correct) setFBScore(s => s + 1);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= questions.length) {
        const t = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 100) / 10;
        setElapsed(t);
        setScreen('complete');
        if (onComplete) onComplete();
      } else {
        setIdx(next); setFBChoices(makeFBChoices(next)); setFBSelected(null);
      }
    }, correct ? 800 : 1400);
  };

  const handleSubmitName = async () => {
    const name = playerName.trim().slice(0, 16);
    if (!name || submitting) return;
    setSubmitting(true);
    try {
      await window.addLeaderboardEntry(item.id, {
        name, score, total: questions.length, time: elapsed, ts: Date.now(),
      });
      setSubmitted(true);
      // Save score to Firestore if user is logged in
      const _u = window._currentUser;
      if (_u && window.saveProgressItem) {
        const pct = questions.length > 0 ? Math.round(score / questions.length * 100) : 0;
        window.saveProgressItem(_u.uid, _u.displayName || '', _u.email || '', item.id, {
          done: Date.now(), score: pct, time: elapsed,
        });
      }
    } catch(e) { console.error('Leaderboard error:', e); }
    setSubmitting(false);
    setScreen('leaderboard');
  };

  const handleDelete = async (rawIdx) => {
    try { await window.deleteLeaderboardEntry(item.id, rawIdx); } catch(e) { console.error(e); }
  };

  const restart = () => {
    setIdx(0); setFBSelected(null); setFBScore(0);
    setUserAnswers([]); setElapsed(0); setPlayerName('');
    setSubmitted(false); setSubmitting(false);
    setScreen('play');
    setFBChoices(makeFBChoices(0));
    startTimeRef.current = Date.now();
  };

  if (questions.length === 0) {
    return <div className="fc-empty mono">No questions yet · 尚未新增題目</div>;
  }

  const themeColors = (THEMES[theme] || THEMES.classic).colors;
  const wrapCls = "fc-wrap fc-theme-" + theme;

  // ── GAME COMPLETE ──────────────────────────────────────
  if (screen === 'complete') {
    const elInt = Math.floor(elapsed);
    const elDec = Math.round((elapsed - elInt) * 10);
    const pct = Math.round((score / questions.length) * 100);
    const emoji = pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪";
    return (
      <div className={wrapCls}>
        <div className="fc-fill-player fc-gc-bg">
          <div className="fc-gc-card">
            <div className="fc-gc-emoji">{emoji}</div>
            <div className="fc-gc-heading serif-i">Game Complete</div>
            <div className="fc-gc-rule"/>
            <div className="fc-gc-stats">
              <div className="fc-gc-stat">
                <div className="fc-gc-label mono">Score</div>
                <div className="fc-gc-value serif">{score}<span className="fc-gc-sub">/{questions.length}</span></div>
              </div>
              <div className="fc-gc-stat-sep"/>
              <div className="fc-gc-stat">
                <div className="fc-gc-label mono">Time</div>
                <div className="fc-gc-value serif">{elInt}<span className="fc-gc-sub">.{elDec}s</span></div>
              </div>
            </div>
            <div className="fc-gc-rule"/>
            <div className="fc-gc-actions">
              <button className="fc-gc-btn accent"
                onClick={() => submitted ? setScreen('leaderboard') : setScreen('name-entry')}>
                Leaderboard
              </button>
              <button className="fc-gc-btn" onClick={() => setScreen('show-answers')}>Show answers</button>
              <button className="fc-gc-btn muted" onClick={restart}>Start again</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── NAME ENTRY ─────────────────────────────────────────
  if (screen === 'name-entry') {
    return (
      <div className={wrapCls}>
        <div className="fc-fill-player fc-gc-bg">
          <div className="fc-gc-card">
            <div className="fc-gc-heading serif-i">Enter your name</div>
            <div className="fc-gc-sub-heading mono">排行榜名稱 · max 16 chars</div>
            <div className="fc-gc-rule"/>
            <input
              className="fc-name-input"
              maxLength={16}
              placeholder="Your name · 你的名字"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmitName()}
              autoFocus
            />
            <div className="fc-name-count mono">{playerName.length} / 16</div>
            <div className="fc-gc-rule"/>
            <div className="fc-gc-actions">
              <button className="fc-gc-btn accent" onClick={handleSubmitName}
                disabled={!playerName.trim() || submitting}>
                {submitting ? 'Saving…' : 'Submit →'}
              </button>
              <button className="fc-gc-btn muted" onClick={() => setScreen('leaderboard')}>Skip</button>
              <button className="fc-gc-btn ghost" onClick={() => setScreen('complete')}>← Back</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ────────────────────────────────────────
  if (screen === 'leaderboard') {
    const indexed = leaderboard.map((e, i) => ({ ...e, _rawIdx: i }));
    indexed.sort((a, b) => b.score - a.score || a.time - b.time);
    const top10 = indexed.slice(0, 10);
    const rankLabel = i => i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i+1}th`;

    return (
      <div className={wrapCls}>
        <div className="fc-fill-player fc-lb-bg">
          <div className="fc-lb-head">
            <div>
              <div className="fc-lb-title serif-i">Leaderboard</div>
              <div className="mono" style={{color:"var(--ink-muted)", marginTop:2}}>排行榜 · Top 10</div>
            </div>
            <button className="fc-lb-back" onClick={() => setScreen('complete')}>← Back</button>
          </div>
          <div className="fc-lb-rule"/>
          <div className="fc-lb-cols mono">
            <span>Rank</span><span>Name</span><span>Score</span><span>Time</span><span></span>
          </div>
          <div className="fc-lb-rule"/>
          {Array.from({length: 10}).map((_, i) => {
            const e = top10[i];
            return (
              <div key={i} className={"fc-lb-row" + (i === 0 && e ? " gold" : i === 1 && e ? " silver" : i === 2 && e ? " bronze" : "")}>
                <span className="fc-lb-rank mono">{rankLabel(i)}</span>
                <span className="fc-lb-name">{e ? e.name : <span className="fc-lb-empty">—</span>}</span>
                <span className="fc-lb-num mono">{e ? `${e.score}/${e.total}` : <span className="fc-lb-empty">—</span>}</span>
                <span className="fc-lb-num mono">{e ? `${e.time}s` : <span className="fc-lb-empty">—</span>}</span>
                <span className="fc-lb-del">
                  {e && (
                    <button className="fc-lb-trash" onClick={() => handleDelete(e._rawIdx)} title="Delete">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
                </span>
              </div>
            );
          })}
          <div className="fc-lb-rule"/>
          <div className="fc-lb-footer">
            <button className="fc-lb-back" onClick={restart}>Start again</button>
          </div>
        </div>
      </div>
    );
  }

  // ── SHOW ANSWERS ───────────────────────────────────────
  if (screen === 'show-answers') {
    return (
      <div className={wrapCls}>
        <div className="fc-fill-player fc-lb-bg">
          <div className="fc-lb-head">
            <div>
              <div className="fc-lb-title serif-i">Answers</div>
              <div className="mono" style={{color:"var(--ink-muted)", marginTop:2}}>解答 · {userAnswers.filter(a=>a.correct).length}/{userAnswers.length} correct</div>
            </div>
            <button className="fc-lb-back" onClick={() => setScreen('complete')}>← Back</button>
          </div>
          <div className="fc-lb-rule"/>
          <div className="fc-answers-list">
            {userAnswers.map((ua, i) => (
              <div key={i} className={"fc-answer-row " + (ua.correct ? 'correct' : 'wrong')}>
                <span className="fc-answer-icon mono">{ua.correct ? '✓' : '✗'}</span>
                <div className="fc-answer-body">
                  <div className="fc-answer-sentence">
                    {ua.sentence.split('___').map((part, pi) =>
                      pi === 0
                        ? <span key={pi}>{part}<strong className="fc-answer-word">{ua.answer}</strong></span>
                        : <span key={pi}>{part}</span>
                    )}
                  </div>
                  {!ua.correct && (
                    <div className="fc-answer-yours mono">你的答案 · <em>{ua.userAnswer}</em></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── PLAY ───────────────────────────────────────────────
  const q = questions[idx];
  const parts = q.sentence.split('___');
  const blankLen = Math.max(6, (q.answer || "").length);

  return (
    <div className={wrapCls}>
      <div className="fc-fill-player">
        <div className="fc-fill-topbar">
          <span className="mono">{idx + 1} / {questions.length}</span>
          <div style={{display:"flex", alignItems:"center", gap:8, position:"relative"}}>
            <span className="mono">✓ {score}</span>
            <button className="fc-theme-btn" onClick={() => setShowTheme(v => !v)} title="更換主題 · Change theme">🎨</button>
            {showTheme && (
              <div className="fc-theme-picker">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button key={key} className={"fc-theme-opt" + (theme === key ? " active" : "")}
                    onClick={() => { setTheme(key); setShowTheme(false); }}>
                    <div className="fc-theme-dots">
                      {t.colors.map((c, i) => <span key={i} style={{background: c}}/>)}
                    </div>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="fc-fill-sentence">
          <div className="fc-fill-text">
            {parts[0]}<span className="fc-fill-blank">{"_".repeat(blankLen)}</span>{parts.slice(1).join('___')}
          </div>
        </div>
        <div className="fc-fill-choices">
          {choices.map((ch, i) => {
            let cls = "fc-fill-btn";
            if (selected) {
              if (ch === q.answer) cls += " correct";
              else if (ch === selected) cls += " wrong";
              else cls += " dimmed";
            }
            return (
              <button key={i} className={cls}
                style={!selected ? {background: themeColors[i % 4]} : undefined}
                onClick={() => handleFBChoice(ch)}>
                {ch}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   STANDALONE FILL-IN-BLANK EDITOR
══════════════════════════════════════════════════════ */
function FillBlankEditor({ questions, onChange }) {
  const [importing, setImporting] = useFC(false);
  const [importText, setImportText] = useFC("");

  const addQ = () => {
    const id = "q" + Date.now() + Math.random().toString(36).slice(2,5);
    onChange([...questions, { id, sentence: "", answer: "", explain: "" }]);
  };
  const updateQ = (id, patch) => onChange(questions.map(q => q.id === id ? {...q, ...patch} : q));
  const deleteQ = (id) => onChange(questions.filter(q => q.id !== id));
  const moveQ = (id, dir) => {
    const arr = [...questions];
    const i = arr.findIndex(q => q.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; onChange(arr);
  };
  const handleImport = () => {
    const parsed = importText.split('\n').filter(l => l.trim()).map(line => {
      let word = "", sentence = "";
      if (line.includes('\t')) {
        // Tab-separated: Word [TAB] Sentence (copy from spreadsheet/table)
        const [w, ...rest] = line.split('\t');
        word = w.trim();
        sentence = rest.join(' ').trim();
      } else if (line.includes('|')) {
        const p = line.split(/\s*\|\s*/);
        word = p[0].trim(); sentence = p[1]?.trim() || "";
      }
      if (!word || !sentence) return null;
      // Normalize multiple underscores (e.g. __________) to ___
      sentence = sentence.replace(/_+/g, '___');
      // If sentence has no blank but contains the word, auto-blank it
      if (!sentence.includes('___')) {
        const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        sentence = sentence.replace(new RegExp('\\b' + esc + '\\b', 'i'), '___');
      }
      return { id:"q"+Date.now()+Math.random().toString(36).slice(2,5), sentence, answer: word, explain: "" };
    }).filter(Boolean).filter(q => q.sentence && q.answer);
    if (!parsed.length) return;
    onChange([...questions, ...parsed]);
    setImportText(""); setImporting(false);
  };

  return (
    <div className="fc-editor">
      <div className="fc-editor-bar">
        <span className="mono" style={{fontSize:10, color:"var(--ink-muted)"}}>
          {questions.length} 題 · 句中用 <code style={{background:"var(--border-soft)",padding:"1px 4px",borderRadius:2}}>___</code> 代表空格
        </span>
        <div style={{display:"flex",gap:8}}>
          <button className={"btn ghost"+(importing?" active":"")} style={{padding:"6px 12px",fontSize:11}} onClick={() => setImporting(v=>!v)}>⬇ Import</button>
          <button className="btn primary" style={{padding:"6px 12px",fontSize:11}} onClick={addQ}>+ Add</button>
        </div>
      </div>
      {importing && (
        <div className="fc-import-box">
          <div className="mono" style={{fontSize:10,color:"var(--ink-muted)",marginBottom:8}}>
            從試算表複製貼上（兩欄）：<code style={{background:"var(--border-soft)",padding:"1px 4px",borderRadius:2}}>單字 [Tab] 句子</code>
            <span style={{color:"var(--ink-faint)",marginLeft:8}}>· 句子裡的 _________ 會自動變成空格</span>
          </div>
          <textarea className="fc-import-ta" value={importText} onChange={e=>setImportText(e.target.value)} rows={7}
            placeholder={"prepared\tBefore the typhoon came, our family was __________ with water, food, and flashlights.\nemergency\tWhen the kitchen started to fill with smoke, Dad knew it was an __________ and called for help.\nmemorize\tI had to __________ my home address so I could tell an adult if I got lost."}/>
          <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
            <button className="btn ghost" onClick={()=>{setImporting(false);setImportText("");}}>Cancel</button>
            <button className="btn primary" onClick={handleImport} disabled={!importText.trim()}>Import</button>
          </div>
        </div>
      )}
      <div className="fc-card-list">
        {questions.length === 0 && !importing && <div className="fc-card-empty mono">尚未新增題目 — 點選上方 Add</div>}
        {questions.map((q, i) => (
          <div key={q.id} className="fc-card-row open">
            <div className="fc-card-row-head" style={{cursor:"default"}}>
              <span className="mono" style={{color:"var(--ink-faint)",fontSize:10,minWidth:18,flexShrink:0}}>{i+1}</span>
              <span className="fc-row-term" style={{fontSize:13}}>{q.sentence||<em style={{color:"var(--ink-faint)"}}>未填寫</em>}</span>
              <span style={{fontWeight:700,fontSize:13,flexShrink:0,marginRight:8,color:"var(--ink)"}}>{q.answer}</span>
              <div className="fc-row-tools" onClick={e=>e.stopPropagation()}>
                <button onClick={()=>moveQ(q.id,-1)} disabled={i===0} style={{opacity:i===0?0.3:1}}>↑</button>
                <button onClick={()=>moveQ(q.id,1)} disabled={i===questions.length-1} style={{opacity:i===questions.length-1?0.3:1}}>↓</button>
                <button onClick={()=>{if(confirm("Delete?"))deleteQ(q.id);}} style={{color:"var(--accent)"}}>✕</button>
              </div>
            </div>
            <div className="fc-card-row-body" style={{gridTemplateColumns:"1fr"}}>
              <div className="fc-card-fields">
                <div className="field">
                  <label className="field-label">句子 Sentence <span style={{fontWeight:400,textTransform:"none"}}>(空格處輸入 ___)</span></label>
                  <input value={q.sentence} onChange={e=>updateQ(q.id,{sentence:e.target.value})} placeholder="The flood was a terrible ___."/>
                </div>
                <div className="field">
                  <label className="field-label">答案 Answer</label>
                  <input value={q.answer} onChange={e=>updateQ(q.id,{answer:e.target.value})} placeholder="disaster"/>
                </div>
                <div className="field">
                  <label className="field-label">解說 Explanation <span style={{fontWeight:400,textTransform:"none",color:"var(--ink-muted)"}}>(選填 · 答錯後顯示)</span></label>
                  <input value={q.explain||""} onChange={e=>updateQ(q.id,{explain:e.target.value})} placeholder="disaster = 災難🌊  The flood was a terrible disaster！大洪水造成了嚴重的災難。"/>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { FlashcardPlayer, FlashcardEditor, ImageSearch, FillBlankPlayer, FillBlankEditor });
