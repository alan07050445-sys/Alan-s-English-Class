// components-flashcard.jsx — Flashcard system: Card / Learn / Test + image search

const { useState: useFC, useEffect: useFC_E } = React;

const PIXABAY_KEY = "55964296-48988fd7e26a6999ecaff6b95";
const PEXELS_KEY  = "ddCplPdhHd2AvScvkob1rxUHoz7UEoLk0yETCc6tdBZ3rlhR5Zwsjs4P";
const RETRY_GAP = 4; // wrong cards reappear after this many cards

/* ── Text-to-speech (v326: 英文用 OpenAI 真人聲音 window.speakTTS；中文自動退回瀏覽器語音) ── */
function speak(text, lang = 'en-US') {
  (window.speakTTS || window.speakText)(text, { lang });
}

function SpeakerBtn({ text, lang = 'en-US', className = "" }) {
  const [busy, setBusy] = React.useState(false);  // v326: 產生 OpenAI 語音時顯示載入中
  const onClick = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try { await ((window.speakTTS || window.speakText)(text, { lang })); }
    catch (err) {}
    finally { setBusy(false); }
  };
  return (
    <button
      className={"fc-speaker-btn " + className + (busy ? " loading" : "")}
      onClick={onClick}
      title="Listen · 聆聽"
      aria-label="播放發音"
    >
      <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  // v336: 圖庫找不到合適的圖 → 自己上傳／貼上
  const [mode, setMode]         = useFC("search");  // 'search' | 'upload'
  const [busy, setBusy]         = useFC(false);
  const [upErr, setUpErr]       = useFC("");
  const [dragOver, setDragOver] = useFC(false);
  const [urlInput, setUrlInput] = useFC("");
  const fileRef = React.useRef(null);

  const PER_PAGE = 12;

  // 收到一個圖片檔（上傳鈕／拖曳／貼上都走這裡）→ 壓縮上傳 → 回傳網址
  const handleFile = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type || "")) { setUpErr("這不是圖片檔（支援 JPG / PNG / GIF / WebP）"); return; }
    setBusy(true); setUpErr("");
    try {
      const url = await window.uploadFlashcardImage(file);
      onSelect(url); onClose();
    } catch (e) {
      setUpErr(e && e.message ? e.message : "上傳失敗，請再試一次");
      setBusy(false);
    }
  };

  // 貼上圖片網址（右鍵複製圖片網址 → 貼過來）
  const useImageUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) { setUpErr("請貼完整網址（要以 http:// 或 https:// 開頭）"); return; }
    onSelect(u); onClose();
  };

  // Cmd/Ctrl+V 直接貼上剪貼簿裡的圖（截圖、複製的圖片都可以）
  useFC_E(() => {
    if (mode !== "upload") return;
    const onPaste = (e) => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      for (const it of items) {
        if (it.type && it.type.indexOf("image") === 0) {
          const f = it.getAsFile();
          if (f) { e.preventDefault(); handleFile(f); return; }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [mode]);

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
          <div className="serif" style={{fontSize: 22}}>{mode === "upload" ? <>Upload <em>Image</em></> : <>Search <em>Images</em></>}</div>
          <button className="modal-close" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        {/* v336: 圖庫搜尋 ↔ 自己上傳／貼上 */}
        <div className="img-mode-tabs">
          <button className={"img-mode-tab" + (mode === "search" ? " on" : "")} onClick={() => setMode("search")}>🔍 圖庫搜尋</button>
          <button className={"img-mode-tab" + (mode === "upload" ? " on" : "")} onClick={() => { setMode("upload"); setUpErr(""); }}>⬆️ 上傳／貼上</button>
        </div>

        {mode === "upload" ? (
          <div className="img-up-wrap">
            <div
              className={"img-up-drop" + (dragOver ? " over" : "") + (busy ? " busy" : "")}
              onClick={() => !busy && fileRef.current && fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
            >
              {busy ? (
                <><div className="img-up-ico">⏳</div><b>上傳中…</b><span>圖片處理中，請稍候</span></>
              ) : (
                <>
                  <div className="img-up-ico">🖼️</div>
                  <b>點這裡選擇圖片，或把圖片拖進來</b>
                  <span>也可以直接按 <kbd>⌘</kbd>+<kbd>V</kbd> 貼上截圖或複製的圖片</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
              onChange={e => { handleFile(e.target.files && e.target.files[0]); e.target.value = ""; }}/>

            <div className="img-up-or"><span>或貼上圖片網址</span></div>
            <div className="img-search-bar">
              <input className="img-search-input" value={urlInput} placeholder="https://…（在圖片上按右鍵→複製圖片網址）"
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && useImageUrl()}/>
              <button className="btn primary" style={{flexShrink:0}} onClick={useImageUrl} disabled={busy}>使用</button>
            </div>

            {upErr && <div className="img-search-status mono" style={{color:"var(--accent)"}}>{upErr}</div>}
            <div className="img-up-hint">圖片會自動縮圖後存到你的雲端空間，學生就能看到。建議用有版權的自製圖或合法授權圖片。</div>
          </div>
        ) : (
        <>
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
        </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FLASHCARD PLAYER
══════════════════════════════════════════════════════ */
/* v274: 星號（像 Quizlet）——不熟的字打 ★，可只練星號的；按帳號存本機 */
function fcStarStoreKey() {
  const u = window._currentUser;
  return 'alan-fc-stars' + (u && u.uid ? ':u:' + u.uid : ':anon');
}
function fcLoadStars(itemId) {
  try { return new Set((JSON.parse(localStorage.getItem(fcStarStoreKey()) || '{}'))[itemId] || []); }
  catch (e) { return new Set(); }
}
function fcSaveStars(itemId, set) {
  try {
    const all = JSON.parse(localStorage.getItem(fcStarStoreKey()) || '{}');
    all[itemId] = Array.from(set);
    localStorage.setItem(fcStarStoreKey(), JSON.stringify(all));
  } catch (e) {}
}

/* v313 (#3): 跨週收集「學生標星的單字」——大廳「複習」卡用。
   資料來自 alan-fc-stars（每個單字卡單元存了哪些卡被標星），把散在各週的星號字彙整成一副複習牌。 */
function collectStarredWords(weeks) {
  let starMap = {};
  try { starMap = JSON.parse(localStorage.getItem(fcStarStoreKey()) || '{}'); } catch (e) {}
  const itemById = {};
  Object.values(weeks || {}).forEach(w =>
    Object.values((w && w.items) || {}).forEach(arr =>
      (arr || []).forEach(it => { if (it && it.type === 'flashcard' && it.id) itemById[it.id] = it; })));
  const out = [], seen = new Set();
  Object.entries(starMap).forEach(([itemId, cardIds]) => {
    const it = itemById[itemId];
    if (!it || !Array.isArray(it.cards)) return;
    (cardIds || []).forEach(cid => {
      const card = it.cards.find(c => c.id === cid);
      if (!card) return;
      const key = (card.term || '') + '|' + (card.zh || '');
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ ...card });
    });
  });
  return out;
}

/* v313 (#3): 複習標星單字的全螢幕視窗——大廳「複習」卡打開，重用 FlashcardPlayer 的四種練習模式 */
function ReviewFlashcardModal({ words, onClose }) {
  const item = { id: '__review__', title: '複習 · 我標星的字', cards: words || [] };
  return (
    <div className="review-modal">
      <div className="review-modal-head">
        <button className="review-modal-close" onClick={onClose} aria-label="完成複習，回大廳">
          <window.Icon name="close" size={15}/> 完成複習
        </button>
        <span className="review-modal-title">⭐ 複習 · {(words || []).length} 個標星的字</span>
        <span style={{width:96}} aria-hidden="true"/>
      </div>
      <div className="review-modal-body">
        {(words || []).length > 0
          ? <FlashcardPlayer item={item} onComplete={onClose}/>
          : <div className="review-modal-empty">目前沒有標星的字。<br/>練單字卡時點一下 ★ 把不熟的字標起來，就會收進這裡複習。</div>}
      </div>
    </div>
  );
}

/* v274: 配對計時器獨立成小元件——原本每 100ms 重繪整個播放器，
   平板上點擊會被重繪吃掉（又 lag 又點不到離開鈕） */
function MatchTimer({ startRef }) {
  const [t, setT] = useFC(0);
  useFC_E(() => {
    const id = setInterval(() => {
      if (startRef.current) setT(Math.round((Date.now() - startRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(id);
  }, []);
  return <span className="fc-match-timer mono">{t.toFixed(1)}<span style={{fontSize:14}}>s</span></span>;
}

/* v345: 配對格子「剛好塞滿一畫面」——舊版用 calc(100vh - 280px) 猜高度，
   猜太少 → 最後一列被切掉、要自己往下捲；iPad/iPhone 的 Safari 工具列會伸縮，
   100vh 更不準（Alan 回報 iPad 更嚴重）。改成直接量「格子上緣到視窗底部還剩多少」，
   並在轉向／工具列伸縮／版面位移時重算。 */
function MatchFitGrid({ children }) {
  const ref = React.useRef(null);
  useFitHeight(ref, true, 200);   // v376: 跟單字卡／學習共用同一套（原本沒扣外層 padding，會多出一截）
  return <div className="fc-match-grid" ref={ref}>{children}</div>;
}

/* v376（Alan：iPad 做練習要一直往下滑）：把 v345 配對格子的做法變成共用的。
   「一次看一張」的模式（單字卡／學習）改成「量出上緣到視窗底部還剩多少 → 設成高度」，
   剩下的空間由 CSS flex 分給圖片。為什麼不用 100dvh 算：
   上面有多少東西（站台 header、完成練習列、分頁列）會隨頁面與裝置變，
   而且 iPad Safari 的工具列會伸縮——量的才準。 */
function _fcScrollHost(el) {
  let n = el.parentElement;
  while (n && n !== document.documentElement) {
    const o = getComputedStyle(n).overflowY;
    if (o === 'auto' || o === 'scroll') return n;
    n = n.parentElement;
  }
  return document.documentElement;
}
function useFitHeight(ref, enabled, min) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) { el.style.minHeight = ''; el.style.height = ''; return; }

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
    let lastW = 0, lastH = 0, measured = false;

    const apply = () => {
      const vv = window.visualViewport;
      const vh = Math.round((vv && vv.height) || window.innerHeight);
      const vw = Math.round(window.innerWidth);
      // 網址列伸縮＝高度小幅變動，不是換版面 → 不重算（這就是捲動會抖的元凶）
      if (measured && vw === lastW && Math.abs(vh - lastH) < 80) return;
      lastW = vw; lastH = vh; measured = true;

      const host = _fcScrollHost(el);
      el.style.minHeight = ''; el.style.height = '';   // 先還原，才量得到自然位置
      const rect = el.getBoundingClientRect();
      // 「這一塊在畫面上從哪裡開始」——換算成不受捲動影響的值
      let top;
      if (host === document.documentElement) {
        top = rect.top + (window.scrollY || window.pageYOffset || 0);
      } else {
        const hb = host.getBoundingClientRect();
        top = hb.top + (rect.top - hb.top + host.scrollTop);
      }
      // 手機橫著拿的時候整個視窗才 390px 高——底線也要跟著降，不然照樣要捲
      const floor = Math.min(min || 320, Math.round(vh * 0.55));
      const h = Math.max(floor, Math.round(vh - top - 10));
      // 差不到 8px 就不要動——避免進場那幾次補量被看成「卡片自己在跳」
      const curH = parseFloat(el.style.height) || 0;
      if (curH && Math.abs(curH - h) < 8) return;
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

      /* 外層通常還有 padding-bottom（例：.qm-quiz-area 手機是 84px）——
         光算「上緣到視窗底」還是會多出那一截，所以量一次剩下的溢出再扣掉。 */
      const over = host === document.documentElement
        ? document.documentElement.scrollHeight - vh
        : host.scrollHeight - host.clientHeight;
      if (over > 1) el.style.height = Math.max(floor, h - over) + 'px';
    };

    // 真的換版面才重量：轉向／改視窗大小
    const relayout = () => { measured = false; apply(); };

    /* ⚠ v392：圖片是「晚一點才載完」的——載完之後內容才變成最終高度。
       v389 為了止住抖動改成「只有真的換版面才重算」，副作用就是
       這種「載入後才長高」的情況沒有人再去量一次 → 卡片高度停在舊值、
       內容溢出、學生就得捲（Alan 回報 iPad 一直有捲動問題，這是最可能的原因）。
       解法：只針對「這一塊裡面的圖片」掛 load 事件，載完重量一次。
       這跟被拿掉的 ResizeObserver(document.body) 不一樣——
       它不會因為「卡片自己改高度」而再次觸發，所以不會形成迴圈。 */
    const imgs = Array.from(el.querySelectorAll('img'));
    const onImg = () => relayout();
    imgs.forEach(im => { if (!im.complete) im.addEventListener('load', onImg, { once: true }); });

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
    const raf = requestAnimationFrame(relayout);
    const t1 = setTimeout(relayout, 150), t2 = setTimeout(relayout, 600), t3 = null;
    window.addEventListener('resize', relayout);
    window.addEventListener('orientationchange', relayout);
    // visualViewport 的 resize 走 apply（不是 relayout）＝網址列伸縮會被上面的門檻擋掉
    if (window.visualViewport) window.visualViewport.addEventListener('resize', apply);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); if (t3) clearTimeout(t3);
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
let _fcZoomOpen = false;   // v394: 圖片燈箱是否開著

function FcImageZoom({ src, alt, onClose }) {
  const closeRef = React.useRef(null);
  /* onClose 每次 render 都是新函式；用 ref 帶進 effect，effect 才能只跑一次
     （否則每次父層 re-render 都會重新搶焦點）。 */
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  useFC_E(() => {
    _fcZoomOpen = true;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();   // capture 階段就攔下來，事件不會再往下傳給任何作答監聽
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey, true);   // true = capture，比既有的 bubble 監聽先跑
    /* ⚠ v395（Alan：「打開之後題目會往上或往下滑，而且每次位置不一致」）
       兩個原因，兩個都要修：
       ① focus() 預設會把目標捲進視野——燈箱是 fixed，但瀏覽器仍會捲背後那一頁，
          所以每次打開，底下的題目就被推走一段，看起來位置都不一樣。
          → 用 focus({ preventScroll: true })。
       ② 背景沒有鎖住捲動，手指在暗底上滑動會連帶把底下的頁面捲掉。
          → 開燈箱時把 body 鎖住，關掉時原樣還原（含捲動位置）。 */
    const sy = window.scrollY || window.pageYOffset || 0;
    const prev = { pos: document.body.style.position, top: document.body.style.top,
                   width: document.body.style.width, overflow: document.body.style.overflow };
    document.body.style.position = 'fixed';
    document.body.style.top = (-sy) + 'px';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    if (closeRef.current) {
      try { closeRef.current.focus({ preventScroll: true }); }
      catch (e2) { closeRef.current.focus(); }
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

  return (
    <div className="fc-zoom-back" role="dialog" aria-modal="true" aria-label="放大圖片"
         onClick={() => onCloseRef.current()}>
      {/* 點面板本身不關（只有點暗底才關） */}
      <div className="fc-zoom-panel" onClick={e => e.stopPropagation()}>
        <button ref={closeRef} className="fc-zoom-x" onClick={() => onCloseRef.current()} aria-label="關閉放大圖片">✕</button>
        <img className="fc-zoom-img" src={src} alt={alt || ""} decoding="async"/>
        {alt && <div className="fc-zoom-cap">{alt}</div>}
      </div>
    </div>
  );
}

function FlashcardPlayer({ item, onComplete, onModeDone }) {
  const cards = item.cards || [];
  const [mode, setMode] = useFC("card");

  /* v393：一進單元就把整份發音先抓好。
     實測（TTS 診斷）：Worker 每次都重新合成，一個字要等 0.9~2.3 秒，
     而且以前只有「聽寫」與「配對」會預抓，單字卡完全沒有 →
     學生每按一次小喇叭都在等。現在配合 data.js 的三層快取
     （記憶體 → Cache API → Worker），第二次之後幾乎是 0ms。
     ⚠ 這個 effect 一定要放在所有 hook 的中間、不能放在任何 early return 之後。 */
  React.useEffect(() => {
    if (!window.prefetchTts) return;
    const words = (item.cards || []).map(c => c && c.term).filter(Boolean);
    if (words.length) { try { window.prefetchTts(words); } catch (e) {} }
  }, [item.id]);

  // v376: 單字卡／學習兩個模式撐滿一畫面就好（見 useFitHeight）
  const cardFitRef  = React.useRef(null);
  const learnFitRef = React.useRef(null);
  useFitHeight(cardFitRef,  mode === 'card',  360);

  // v274: 星號標記＋「只練星號」
  const [stars, setStars] = useFC(() => fcLoadStars(item.id));
  const [starOnly, setStarOnly] = useFC(false);
  const [scopeStar, setScopeStar] = useFC(false);   // v374: 這一輪是不是「只練星號」——只練星號不算完成
  const [testCards, setTestCards] = useFC([]);      // v374: 這一輪測驗實際要考的字
  const toggleStar = (cardId) => setStars(prev => {
    const nx = new Set(prev);
    if (nx.has(cardId)) nx.delete(cardId); else nx.add(cardId);
    fcSaveStars(item.id, nx);
    return nx;
  });
  const pool = (flag = starOnly) => {
    const list = flag ? cards.filter(c => stars.has(c.id)) : cards;
    return list.length ? list : cards; // 星號被清空時退回全部
  };
  const [learnTotal, setLearnTotal] = useFC(cards.length);

  // v234: 學習模式鍵盤作答——1~4 選英文單字
  React.useEffect(() => {
    const onKey = (e) => {
      if (_fcZoomOpen) return;   // v394: 圖片燈箱開著時一律不作答（按 Enter 只是要關燈箱）
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Enter') {
        // v274: 填空答錯後 Enter＝下一題
        // v392: 學習模式答完也有「下一題」了，Enter 一起支援（不然兩個模式的鍵盤操作不一致）
        const nx = document.querySelector('.fc-fill-next-row .btn, .fc-learn-next-row .btn');
        if (nx) nx.click();
        return;
      }
      if (!/^[1-4]$/.test(e.key)) return;
      // v274: 學習與填空模式都支援 1-4 鍵盤作答
      const btns = document.querySelectorAll('.fc-choices .fc-choice, .fc-fill-choices .fc-fill-btn');
      const b = btns[parseInt(e.key, 10) - 1];
      if (b) b.click();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Card mode
  const [cardIdx, setCardIdx] = useFC(0);
  const [flipped, setFlipped] = useFC(false);

  // Learn mode — queue-based spaced repetition
  const [learnQueue, setLearnQueue] = useFC([]); // [{card, isRetry}]
  /* v376: 「作答中」才量高度——按「再練一次」會重新掛一個 .fc-player，
     只看 mode 的話 enabled 沒變、效果不會重跑，新的那個就會沒有高度。 */
  useFitHeight(learnFitRef, mode === 'learn' && learnQueue.length > 0, 340);
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
  /* v394: 只是「現在放大顯示哪張圖」的畫面狀態（{src, alt}｜null）——
     不進任何作答資料、不影響 answeredCards／交卷條件。 */
  const [zoomImg, setZoomImg] = useFC(null);
  // v394: 切換模式時順手收掉燈箱，避免離開測驗又回來時它還開著
  useFC_E(() => { setZoomImg(null); }, [mode]);

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

  /* v392: 「自動跳下一題」的 setTimeout 統一用一個 ref 管理。
     以前 learn／fill 兩處都是裸 setTimeout：學生在延遲期間按返回或切分頁，
     timer 還是會跑完 → 寫進度、放特效、甚至連跳兩題。
     現在只要在「按鈕 onClick」「切模式」「unmount」三個入口都先 clearAuto() 就不會了。 */
  const autoRef = React.useRef(null);
  const clearAuto = () => { if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; } };

  // Cleanup timer on unmount（v392: 連自動跳題的 timer 一起清）
  useFC_E(() => () => {
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    if (autoRef.current) clearTimeout(autoRef.current);
  }, []);

  const stopMatchTimer = () => { if (matchTimerRef.current) { clearInterval(matchTimerRef.current); matchTimerRef.current = null; } };

  // v318 (#1): 「星號單字」＝獨立分頁。進其他分頁一律 setStarOnly(false) 重置＝不會再卡在只剩星號的（Alan 回報的 bug）。
  const enterCard = () => { stopMatchTimer(); clearAuto(); setStarOnly(false); setMode("card"); setCardIdx(0); setFlipped(false); };

  const enterLearn = (flag = starOnly) => { stopMatchTimer(); clearAuto();
    const src = pool(flag);
    setLearnTotal(src.length);
    const order = shuffle([...src]);
    const queue = order.map(card => ({ card, isRetry: false }));
    setLearnQueue(queue);
    setCorrectIds(new Set());
    setLearnChoice(null);
    setLearnChoices(queue.length > 0 ? makeChoices(queue[0].card, cards) : []);
    setMode("learn");
  };

  const enterTest = (onlyStar = false) => {
    stopMatchTimer(); clearAuto();
    setScopeStar(onlyStar);
    setTestSetup(true);
    setTestAnswers({});
    setTypedAnswers({});
    setTestDone(false);
    setMode("test");
  };

  const startTest = () => {
    // v374(#3)(#4): 依剛才選的範圍決定要考哪些字（干擾選項仍從全部單字挑，才不會變簡單）
    const src = pool(scopeStar);
    const tc = {};
    const qt = {};
    if (testType === "both") {
      const shuffled = shuffle([...src]);
      const half = Math.ceil(shuffled.length / 2);
      shuffled.forEach((card, i) => { qt[card.id] = i < half ? "choice" : "written"; });
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

  const enterMatch = (flag = starOnly) => {
    stopMatchTimer(); clearAuto();
    let best = null;
    try { best = parseFloat(localStorage.getItem('fc-match-' + item.id)) || null; } catch {}
    setMatchBest(best);
    // Pick 6 random pairs each round (shuffle for variety)
    const src = pool(flag); // v274: 星號池
    const picked = shuffle([...src]).slice(0, Math.min(6, src.length));
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
    // v274: 計時顯示交給 <MatchTimer>（獨立元件自己 100ms 更新），
    // 父層不再每 0.1 秒重繪 → 點擊不再 lag、離開鈕一按就有反應
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
      setTimeout(() => { setMatchWrong([]); setMatchSelected(null); }, 450); // v274: 縮短鎖定，節奏更順
    }
  };

  const enterFill = (flag = starOnly) => {
    stopMatchTimer(); clearAuto();
    const src = pool(flag); // v274: 星號池
    const eligible = src.filter(c => c.example && c.example.trim());
    const fillPool = eligible.length >= 2 ? eligible : src;
    const shuffled = shuffle([...fillPool]);
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
    // v344: 填空模式本來沒有音效（其他模式都有）——補上答對/答錯提示音
    if (window.playSound) window.playSound(correct ? 'correct' : 'wrong');
    if (correct) setFillScore(s => s + 1);
    if (!correct) return;
    // v392: 650ms → 1000ms（對齊全站統一節奏），並改成 ref 管理，才清得掉
    autoRef.current = setTimeout(() => {
      autoRef.current = null;
      goNextFill();
    }, 1000);
  };

  const goNextFill = () => {
    clearAuto(); // v392: 學生自己按「下一題」時先收掉自動跳的 timer，避免連跳兩題
    const next = fillIdx + 1;
    if (next >= fillCards.length) { setFillDone(true); }
    else { setFillIdx(next); setFillChoices(makeChoices(fillCards[next], cards)); setFillSelected(null); }
  };

  /* v372(#1): 單字卡模式用鍵盤 ← → 換卡、空白鍵翻卡（學生要求，不用一直點按鈕） */
  useFC_E(() => {
    if (mode !== 'card') return;
    const onKey = (e) => {
      if (_fcZoomOpen) return;   // v394: 圖片燈箱開著時不換卡／不翻卡
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setCardIdx(i => Math.max(0, i - 1)); setFlipped(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setCardIdx(i => Math.min(i + 1, pool().length - 1)); setFlipped(false); }
      else if (e.key === ' ' || e.key === 'Enter') { if (t && t.closest && t.closest('input, textarea, button, a[href], [contenteditable="true"]')) return; e.preventDefault(); setFlipped(f => !f); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  /* v361: 「學習」與「填空」跑完各通知一次——集點用（兩個模式都完成才給星星） */
  useFC_E(() => {
    // v374(#4): 只練星號那一輪不算完成（避免用 2 個字就把整份刷掉）
    if (mode === "learn" && learnTotal > 0 && learnQueue.length === 0 && !scopeStar && onModeDone) onModeDone("learn");
  }, [mode, learnQueue.length, learnTotal, scopeStar]);
  useFC_E(() => {
    if (mode === "fill" && fillDone && onModeDone) onModeDone("fill");
  }, [mode, fillDone]);

  /* v374(#3)：改成「進學習／測驗時先問要練哪些」——有星號單字才問，沒有就直接開始。
     （v372 的「⭐ 當開關、預設帶進所有模式」Alan 說不要。⭐ 分頁回到只看星號卡片。） */
  const [pendingMode, setPendingMode] = useFC(null);   // 'learn' | 'test'
  const askScope = (target) => {
    clearAuto(); // v392: 從 learn/fill 中途切分頁時，先把待跑的自動跳題 timer 收掉
    if (stars.size === 0) { startScoped(target, false); return; }
    setPendingMode(target);
    setMode('scope');
  };
  const startScoped = (target, onlyStar) => {
    setPendingMode(null);
    setScopeStar(onlyStar);
    if (target === 'learn') enterLearn(onlyStar);
    else enterTest(onlyStar);
  };
  const enterStarred = () => { stopMatchTimer(); clearAuto(); setMode("card"); setStarOnly(true); setCardIdx(0); setFlipped(false); };

  // v318 (#1): 保留「星號單字」為獨立分頁（Alan 要回來、只改名）——只在有星號時出現；
  // 點它＝只看星號的單字卡，點其他分頁一律重置回全部（不再卡住）。
  const ModeTabs = ({ active }) => (
    <div className="fc-mode-tabs">
      <button className={"fc-tab" + (active === "card" ? " active" : "")} onClick={enterCard}>🃏 單字卡</button>
      <button className={"fc-tab" + (active === "learn" ? " active" : "")} onClick={() => askScope('learn')}>📖 學習</button>
      <button className={"fc-tab" + (active === "match" ? " active" : "")} onClick={() => enterMatch()}>⚡ 配對</button>
      <button className={"fc-tab" + (active === "test"  ? " active" : "")} onClick={() => askScope('test')}>📝 測驗</button>
      {stars.size > 0 && (
        <button
          className={"fc-tab fc-star-filter" + (active === "card" && starOnly ? " active" : "")}
          onClick={enterStarred}
          title="只看你打星號的單字卡"
        >⭐ 星號單字（{stars.size}）</button>
      )}
    </div>
  );

  /* v374(#3)：範圍選擇畫面——有星號單字時，進學習／測驗前先問要練哪些 */
  if (mode === 'scope') {
    const target = pendingMode === 'test' ? '測驗' : '學習';
    return (
      <div className="fc-wrap">
        <ModeTabs active={pendingMode}/>
        <div className="fc-player">
          <div className="fc-scope">
            <div className="fc-scope-title serif">{target}哪些單字？</div>
            <div className="fc-scope-sub mono">你標了 {stars.size} 個星號單字</div>
            <button className="fc-scope-btn" onClick={() => startScoped(pendingMode, false)}>
              <b>全部 {cards.length} 個</b>
              <span>完整跑一輪才算完成，也才拿得到星星</span>
            </button>
            <button className="fc-scope-btn ghost" onClick={() => startScoped(pendingMode, true)}>
              <b>只練星號的 {stars.size} 個</b>
              <span>快速複習不熟的字 · 這一輪不計入完成</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
    const deck = pool(); // v274: 星號濾鏡也作用在卡片模式
    const safeIdx = Math.min(cardIdx, deck.length - 1);
    const card = deck[safeIdx];
    return (
      <div className="fc-wrap">
        <ModeTabs active="card"/>
        <div className="fc-player fc-p-card" ref={cardFitRef}>
          <div className="fc-topbar">
            <span className="mono">{safeIdx + 1} / {deck.length}</span>
            <div className="fc-progress-bar">
              <div className="fc-progress-fill" style={{width: `${((safeIdx + 1) / deck.length) * 100}%`}}/>
            </div>
          </div>

          <div
            className={"fc-flip-card" + (flipped ? " flipped" : "")}
            onClick={() => setFlipped(f => !f)}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={flipped ? '看正面' : '翻到背面'}
          >
            {/* v317 (#3): 星號改放卡片角落（像 Quizlet，好找）；stopPropagation 才不會翻卡。 */}
            <button
              className={"fc-card-star" + (stars.has(card.id) ? " on" : "")}
              onClick={(e) => { e.stopPropagation(); toggleStar(card.id); }}
              aria-label={stars.has(card.id) ? '取消星號' : '標記為不熟'}
              title="不熟的字打星號，大廳可以複習所有標星的字"
            >{stars.has(card.id) ? '★' : '☆'}</button>
            <div className="fc-flip-inner">
              {/* FRONT — English only */}
              <div
                className={`fc-face fc-front ${flipped ? "is-hidden" : "is-visible"}`}
                style={{
                  opacity: flipped ? 0 : 1,
                  visibility: flipped ? 'hidden' : 'visible',
                  pointerEvents: flipped ? 'none' : 'auto',
                  transform: flipped ? 'translateY(-4px)' : 'translateY(0)',
                }}
              >
                <SpeakerBtn text={card.term} lang="en-US" className="fc-face-speaker"/>
                <div className="fc-term serif">{card.term}</div>
                <div className="fc-flip-hint mono">tap to reveal · 點擊顯示</div>
              </div>
              {/* BACK — Chinese + image */}
              <div
                className={`fc-face fc-back ${flipped ? "is-visible" : "is-hidden"}`}
                style={{
                  opacity: flipped ? 1 : 0,
                  visibility: flipped ? 'visible' : 'hidden',
                  pointerEvents: flipped ? 'auto' : 'none',
                  transform: flipped ? 'translateY(0)' : 'translateY(6px)',
                }}
              >
                <SpeakerBtn text={card.zh} lang="zh-TW" className="fc-face-speaker fc-face-speaker-dark"/>
                {card.imageUrl && (
                  <div className="fc-back-img-wrap">
                    <img src={card.imageUrl} alt={card.zh} decoding="async"/>
                  </div>
                )}
                <div className="fc-zh">{card.zh}</div>
                {card.example && <div className="fc-example serif-i">"{card.example}"</div>}
              </div>
            </div>
          </div>

          <div className="fc-nav">
            <button className="fc-nav-btn" onClick={() => { setCardIdx(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={safeIdx === 0}>← 上一張</button>
            <div className="fc-dots">
              {deck.map((_, i) => (
                <span key={i} className={"fc-dot" + (i === safeIdx ? " active" : "")} onClick={() => { setCardIdx(i); setFlipped(false); }}/>
              ))}
            </div>
            <button className="fc-nav-btn" onClick={() => { setCardIdx(i => i + 1); setFlipped(false); }} disabled={safeIdx === deck.length - 1}>下一張 →</button>
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
              <div className="fc-complete-title serif">All Learned!</div>
              <div className="fc-complete-meta mono">
                {correctIds.size} / {learnTotal} mastered
              </div>
              <div className="fc-complete-note">
                {onComplete ? 'Ready for quiz · 可以開始測驗了' : 'Nice work · 再複習一次會更熟'}
              </div>
              <div className="fc-complete-actions">
                <button className="btn ghost" onClick={() => enterLearn()}>Practice Again</button>
                <button className="btn primary" onClick={onComplete || enterTest}>
                  {onComplete ? '開始測驗 · Start Quiz →' : 'Take Test →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const { card, isRetry } = learnQueue[0];

    // 這一題答了沒？答對了沒？（給回饋區與「下一題」按鈕用）
    const answeredCorrect = learnChoice === card.id;

    /* v392: 原本 learnQueue 重排邏輯是寫在 setTimeout 裡的，答對答錯共用一條 timer。
       現在原封不動抽成 goNextLearn()——RETRY_GAP 與 correctIds 的寫入時機完全沒動，
       只是改成「由誰觸發」：答對＝1 秒後自動或學生自己按，答錯＝一定要學生自己按。 */
    const goNextLearn = (wasCorrect) => {
      clearAuto(); // 學生自己按「下一題」時先收掉待跑的 timer，否則會連跳兩題（v375 踩過的坑）
      const rest = learnQueue.slice(1);
      let newQueue;
      if (wasCorrect) {
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
    };

    const handleLearnChoice = (chosen) => {
      if (learnChoice) return;
      setLearnChoice(chosen.id);
      const correct = chosen.id === card.id;
      if (window.playSound) window.playSound(correct ? 'correct' : 'wrong');

      /* v392（全站唯一「答錯也自動跳」的地方，改掉）：
         答錯 → 完全不排 timer，停在原地把正確答案show出來，等學生自己按「下一題」。
         答對 → 還是自動跳，但 700ms 提到 1000ms 對齊全站節奏；同時也給按鈕讓快的學生先走。 */
      if (!correct) return;
      autoRef.current = setTimeout(() => {
        autoRef.current = null;
        goNextLearn(true);
      }, 1000);
    };

    return (
      <div className="fc-wrap">
        <ModeTabs active="learn"/>
        <div className="fc-player fc-p-learn" ref={learnFitRef}>
          <DualProgressBar correct={correctIds.size} total={learnTotal}/>

          <div className="fc-learn-q">
            <button
              className={"fc-star-btn fc-star-btn-corner" + (stars.has(card.id) ? " on" : "")}
              onClick={() => toggleStar(card.id)}
              aria-label={stars.has(card.id) ? '取消星號' : '標記為不熟'}
              title="不熟的字打 ★"
            >★</button>
            {isRetry && <div className="fc-retry-badge mono">再試一次吧 · Try again</div>}
            {card.imageUrl && <img src={card.imageUrl} alt={card.zh} className="fc-learn-img" decoding="async"/>}
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

            {/* v392: 答完的回饋區。答錯時這裡是唯一的出口（不再 1.2 秒自動跳），
                一定要先看到正確的英文＋中文，按了「下一題」才換題。
                ⚠ 為什麼放在 .fc-choices 裡面而不是它下面：iPad 橫式（styles-tune.css
                的 min-width:820 and max-height:950）會把 .fc-p-learn 變成 2×2 grid，
                而且每個子元素都有指定 grid-column/row；多一個沒被指定位置的子元素會被
                自動塞到第三列，把「一個畫面裝得下」（禁區 #4）弄壞。放在選項格子裡面
                跨滿兩欄，四種版面（手機直式／平板／桌機／iPad 橫式）都不會跑掉。
                樣式一律寫成 inline——styles-*.css 這次不歸我改。 */}
            {learnChoice && (
              <div className="fc-learn-next-row" style={{
                gridColumn: "1 / -1", display: "flex", alignItems: "center",
                justifyContent: "space-between", flexWrap: "wrap", gap: 10,
                marginTop: 2, padding: "10px 12px", borderRadius: 12,
                /* 顏色用全站「答對／答錯的唯一真相」那一組（styles-tune.css 的 --ok / --no），
                   不要自己調色，對比度是驗算過的 */
                border: "2px solid " + (answeredCorrect ? "var(--ok)" : "var(--no)"),
                background: answeredCorrect ? "var(--ok-bg)" : "var(--no-bg)"
              }}>
                <div style={{display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 8, minWidth: 0}}>
                  <span className="mono" style={{fontSize: 10, color: answeredCorrect ? "var(--ok-ink)" : "var(--no-ink)"}}>
                    {answeredCorrect ? '答對了' : '正確答案'}
                  </span>
                  <b style={{fontSize: 20, lineHeight: 1.15, overflowWrap: "anywhere",
                             color: answeredCorrect ? "var(--ok-ink)" : "var(--no-ink)"}}>{card.term}</b>
                  <span style={{fontSize: 14, color: "var(--ink-muted)", overflowWrap: "anywhere"}}>{card.zh}</span>
                </div>
                <button className="btn primary" style={{flex: "0 0 auto"}}
                  onClick={() => goNextLearn(answeredCorrect)}>下一題 →</button>
              </div>
            )}
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
              <div className="serif" style={{fontSize: 28, marginBottom: 4}}>設定你的<em>測驗</em></div>
              <div className="mono" style={{fontSize: 10, color: "var(--ink-muted)", marginBottom: 28}}>
                {pool(scopeStar).length} cards · 看中文，回答英文
              </div>
              <div className="fc-setup-options">
                <div className="fc-setup-row">
                  <div>
                    <div className="fc-setup-label">選擇題 Multiple Choice</div>
                    <div className="fc-setup-desc">看中文定義，從四個英文選項選出正確答案</div>
                  </div>
                  <button type="button" role="switch" aria-checked={hasChoice} aria-label="選擇題" className={"fc-toggle" + (hasChoice ? " on" : "")} onClick={toggleChoice}/>
                </div>
                <div className="fc-setup-row">
                  <div>
                    <div className="fc-setup-label">手寫題 Written</div>
                    <div className="fc-setup-desc">看中文定義，自己打出正確英文單字</div>
                  </div>
                  <button type="button" role="switch" aria-checked={hasWritten} aria-label="手寫題" className={"fc-toggle" + (hasWritten ? " on" : "")} onClick={toggleWritten}/>
                </div>
              </div>
              <button className="btn primary" style={{width: "100%", padding: 14, fontSize: 13}} onClick={startTest}>
                開始測驗 · Start Test
              </button>
            </div>
          </div>
        </div>
      );
    }

    // v374: 這一輪實際要考的字（沒設過＝全部，相容從學習完成頁直接進來的舊路徑）
    const tCards = (testCards && testCards.length) ? testCards : cards;

    /* Results screen */
    if (testDone) {
      const results = tCards.map(card => {
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
      const pct = Math.round((correctCount / tCards.length) * 100);
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
                {correctCount} / {tCards.length} correct · 答對
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
                <button className="btn ghost" onClick={() => { setTestSetup(true); setTestAnswers({}); setTypedAnswers({}); setQuestionTypes({}); setTestDone(false); }}>再試一次</button>
                <button className="btn primary" onClick={() => enterLearn()}>再多練一點 →</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* Test questions */
    const answeredCards = new Set(
      tCards.filter(card => {
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
            <span className="mono">{answeredCards.size} / {tCards.length} answered</span>
            <div className="fc-progress-bar">
              <div className="fc-progress-fill" style={{width: `${(answeredCards.size / tCards.length) * 100}%`}}/>
            </div>
          </div>

          <div className="fc-test-list">
            {tCards.map((card, qi) => {
              const qType     = questionTypes[card.id] || "choice";
              const choices   = testChoices[card.id] || [];
              const selectedId = testAnswers[card.id];
              const typedVal  = typedAnswers[card.id] || "";

              return (
                /* v373: 一題一張大卡片（Alan 指定「照參考圖的大小」）——
                   定義在上、圖片靠右、選項是 2×2 的大方框 */
                <div key={card.id} className="fc-test-q">
                  <div className="fc-test-qhead">
                    {/* v374: 這裡不能放發音鍵——唸出來就是答案了（Alan 回報） */}
                    <span className="fc-test-qlabel">{qType === "choice" ? "定義" : "定義 · 手寫"}</span>
                    <span className="fc-test-qnum mono">{qi + 1} / {tCards.length}</span>
                  </div>
                  <div className="fc-test-prompt">
                    <div className="fc-test-zh">{card.zh}</div>
                    {/* v394: 圖片可以點開放大。刻意「不」外包一層 <button>——
                        包起來會多一個 flex 子元素、版面與圖片尺寸都可能跑掉；
                        直接讓這張 <img> 變成可用鍵盤操作的按鈕，DOM 結構與尺寸完全不變。 */}
                    {card.imageUrl && (
                      <img src={card.imageUrl} alt={card.zh} className="fc-test-img fc-img-zoomable" decoding="async"
                        role="button" tabIndex={0}
                        aria-label={"放大圖片：" + card.zh}
                        title="點一下看大圖"
                        onClick={(e) => { e.stopPropagation(); setZoomImg({ src: card.imageUrl, alt: card.zh }); }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          // 不能讓 Enter／空白鍵傳出去（全站鍵盤作答監聽會收到）
                          e.preventDefault(); e.stopPropagation();
                          setZoomImg({ src: card.imageUrl, alt: card.zh });
                        }}/>
                    )}
                  </div>
                  {qType === "choice" && (
                    <>
                      <div className="fc-test-label">選擇答案</div>
                      <div className="fc-test-choices">
                        {choices.map((ch, ci) => (
                          <button key={ci}
                            className={"fc-test-choice" + (selectedId === ch.id ? " selected" : "")}
                            onClick={() => setTestAnswers(prev => ({...prev, [card.id]: ch.id}))}
                          >{ch.term}</button>
                        ))}
                      </div>
                    </>
                  )}
                  {qType === "written" && (
                    <>
                      <div className="fc-test-label">打出英文單字</div>
                      <div className="fc-test-written">
                        <input
                          className="fc-written-input"
                          value={typedVal}
                          onChange={e => setTypedAnswers(prev => ({...prev, [card.id]: e.target.value}))}
                          placeholder="Type the English word · 在此輸入英文單字"
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="fc-test-foot">
            <button
              className="btn primary"
              disabled={answeredCards.size < tCards.length}
              onClick={() => {
                setTestDone(true);
                // v374(#4): 只練星號不算完成；選擇題交卷就算「測驗完成」，
                //           手寫題不列入完成條件，但全部答完可以另外加分
                if (!scopeStar && onModeDone) {
                  onModeDone('test');
                  const written = tCards.filter(c => (questionTypes[c.id] || 'choice') === 'written');
                  if (written.length && written.every(c => (typedAnswers[c.id] || '').trim())) onModeDone('written');
                }
                if (onComplete) onComplete();
              }}
            >
              Submit · 交卷 ({answeredCards.size}/{cards.length})
            </button>
          </div>
        </div>
        {/* v394: 放大圖片的燈箱。放在 .fc-player 外面（still 在 .fc-wrap 內），
            position:fixed → 不佔版面、不會影響任何題目卡片的高度。 */}
        {zoomImg && <FcImageZoom src={zoomImg.src} alt={zoomImg.alt} onClose={() => setZoomImg(null)}/>}
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
                <button className="btn ghost" onClick={() => enterMatch()}>再玩一次</button>
                <button className="btn primary" onClick={() => enterLearn()}>再多練一點 →</button>
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
            <MatchTimer startRef={matchStartRef}/>
            <span className="mono" style={{fontSize: 11, color: "var(--ink-muted)"}}>
              {matchMatched.size} / {matchTiles.length / 2} matched
            </span>
            {matchBest && (
              <span className="mono" style={{fontSize: 10, color: "var(--ink-faint)"}}>
                Best {matchBest.toFixed(1)}s
              </span>
            )}
          </div>
          <MatchFitGrid>
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
          </MatchFitGrid>
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
                <button className="btn ghost" onClick={() => enterFill()}>再試一次</button>
                <button className="btn primary" onClick={() => enterLearn()}>再多練一點 →</button>
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
          <div className="fc-fill-label">選擇答案</div>
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
          {/* v392: 本來只有答錯才出現「下一題」，答對只能等 timer。
              改成兩種情況都給出口——快的學生不必等，慢的也不會被催。 */}
          {fillSelected && (
            <div className="fc-fill-next-row">
              <button className="btn primary" onClick={goNextFill}>下一題 →</button>
            </div>
          )}
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
    // v251: 統一分隔符——Tab（試算表/Quizlet 直貼）優先，其次「|」，再來「 - 」
    const parsed = importText.split('\n').filter(l => l.trim()).map(line => {
      const p = line.includes('\t') ? line.split('\t')
        : line.includes('|') ? line.split('|')
        : line.split(/\s+-\s+/);
      return { id: "c"+Date.now()+Math.random().toString(36).slice(2,5), term:(p[0]||"").trim(), zh:(p[1]||"").trim(), example:(p[2]||"").trim(), imageUrl:"" };
    }).filter(c => c.term);
    if (!parsed.length) return;
    onChange([...cards, ...parsed]);
    setImportText(""); setImporting(false);
  };
  // v251: 匯出成 Quizlet 可直接匯入的格式（英文[Tab]中文，每行一張）
  const handleExport = () => {
    const text = cards.filter(c => (c.term || '').trim())
      .map(c => `${(c.term || '').trim()}\t${(c.zh || '').trim()}`).join('\n');
    if (!text) { alert('還沒有卡片可以匯出。'); return; }
    const done = () => alert(`已複製 ${cards.length} 張卡（英文 Tab 中文）——到 Quizlet 選「匯入」直接貼上即可。`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => window.prompt('複製下面內容貼到 Quizlet：', text));
    } else {
      window.prompt('複製下面內容貼到 Quizlet：', text);
    }
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
          <button className="btn ghost" style={{padding:"6px 12px",fontSize:11}} onClick={handleExport} title="複製成 Quizlet 匯入格式（英文 Tab 中文）">⬆ 匯出 Quizlet</button>
          <button className="btn primary" style={{padding:"6px 12px",fontSize:11}} onClick={addCard}>+ Add Card</button>
        </div>
      </div>
      {importing && (
        <div className="fc-import-box">
          <div className="mono" style={{fontSize:10,color:"var(--ink-muted)",marginBottom:8}}>
            每行一張卡，欄位用 <code style={{background:"var(--border-soft)",padding:"1px 4px",borderRadius:2}}>Tab</code>（試算表／Quizlet 直貼）、<code style={{background:"var(--border-soft)",padding:"1px 4px",borderRadius:2}}>|</code> 或 <code style={{background:"var(--border-soft)",padding:"1px 4px",borderRadius:2}}> - </code> 分隔：英文／中文／例句（後兩欄可省略）
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
                        <span className="mono" style={{fontSize:10,marginTop:6,color:"var(--ink-muted)"}}>搜尋／上傳</span>
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

/* v392: 這裡本來有一個 FillBlankPlayer（約 335 行）——已整段刪除。
   它是 dead code：全專案沒有任何地方 render <FillBlankPlayer> 或 window.FillBlankPlayer，
   現行的 fillblank item 走的是 components-quiz-mode.jsx 的 QuizModePlayer。
   而且它本身還是舊寫法（答對才排 setTimeout、答錯回饋沒有 render q.explain，
   儘管下面的 FillBlankEditor 有讓老師輸入解說）——留著只會被誤當成現役程式碼去改。
   ⚠ 下面的 FillBlankEditor 是不同的東西（老師端出題用），有在用，不要刪。 */

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
      let word = "", sentence = "", explain = "";
      if (line.includes('\t')) {
        // Tab-separated: Answer [TAB] Sentence [TAB] Explanation (optional 3rd col)
        const parts = line.split('\t');
        word     = parts[0]?.trim() || "";
        sentence = parts[1]?.trim() || "";
        explain  = parts[2]?.trim() || "";
      } else if (line.includes('|')) {
        const p = line.split(/\s*\|\s*/);
        word = p[0]?.trim() || ""; sentence = p[1]?.trim() || ""; explain = p[2]?.trim() || "";
      }
      if (!word || !sentence) return null;
      // Normalize multiple underscores (e.g. __________) to ___
      sentence = sentence.replace(/_+/g, '___');
      // If sentence has no blank but contains the word, auto-blank it
      if (!sentence.includes('___')) {
        const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        sentence = sentence.replace(new RegExp('\\b' + esc + '\\b', 'i'), '___');
      }
      return { id:"q"+Date.now()+Math.random().toString(36).slice(2,5), sentence, answer: word, explain };
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
            從試算表複製貼上：<code style={{background:"var(--border-soft)",padding:"1px 4px",borderRadius:2}}>答案 [Tab] 句子 [Tab] 解說（選填）</code>
            <span style={{color:"var(--ink-faint)",marginLeft:8}}>· 句子裡的 _________ 會自動變成空格</span>
          </div>
          <textarea className="fc-import-ta" value={importText} onChange={e=>setImportText(e.target.value)} rows={7}
            placeholder={"prepared\tBefore the typhoon came, our family was __________ with water.\tprepared = 準備好的💪 事先做好準備很重要！\nemergency\tWhen the kitchen started to fill with smoke, Dad knew it was an __________.\nmemorize\tI had to __________ my home address so I could tell an adult if I got lost."}/>
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

// v392: 移除 FillBlankPlayer（dead code，見上面 FillBlankEditor 前的說明）
Object.assign(window, { FlashcardPlayer, FlashcardEditor, ImageSearch, FillBlankEditor, collectStarredWords, ReviewFlashcardModal });
