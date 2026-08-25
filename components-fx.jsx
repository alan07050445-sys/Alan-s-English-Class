// components-fx.jsx — v375
// ① 吉祥物 Claudius（像素風小傢伙）：會走路、跳、翻滾、打瞌睡、答對時比讚
// ② 完成特效：彩帶 + 音效（QmCelebrate / window.spawnConfetti 都走這裡）
// 這一層是獨立掛載的（自己 append 一個 div 到 body），不動 App 的樹，
// 所以任何頁面都看得到，也不會影響原本的版面計算。

const { useState: useFx, useEffect: useFxE, useRef: useFxR } = React;

/* ── 像素風吉祥物 ────────────────────────────────────────────
   9×8 的格子：頭上兩個小角、兩顆方眼睛、三隻腳。
   腳分成三塊，走路時左右腳輪流抬起來。 */
/* v385（Alan）：帽子不再「自動解鎖」，改成商店裡用星星買的東西。
   有沒有買到＝看老師在集點裡扣過哪一筆（app.jsx 算好放在 window.__mxHats）。 */
const MX_HATS = [
  { id: 'party', zh: '派對帽', cost: 500 },
  { id: 'crown', zh: '皇冠',   cost: 1000 },
];
const MX_HAT_KEY = 'alan-mx-hat';
function mxOwnedHats() { return (window.__mxHats || []).filter(h => MX_HATS.some(x => x.id === h)); }
function mxGetHat() { try { return localStorage.getItem(MX_HAT_KEY) || ''; } catch (e) { return ''; } }
function mxSetHat(h) { try { localStorage.setItem(MX_HAT_KEY, h || ''); } catch (e) {} }
function MxHat({ id }) {
  if (id === 'party') return (
    <g className="mx-hat">
      <rect x="4" y="-2" width="1" height="1" fill="#E8C86A"/>
      <rect x="3" y="-1" width="3" height="1" fill="#D6533C"/>
    </g>
  );
  if (id === 'crown') return (
    <g className="mx-hat">
      <rect x="2" y="-2" width="1" height="1" fill="#E8C86A"/>
      <rect x="4" y="-2" width="1" height="1" fill="#E8C86A"/>
      <rect x="6" y="-2" width="1" height="1" fill="#E8C86A"/>
      <rect x="2" y="-1" width="5" height="1" fill="#E8C86A"/>
    </g>
  );
  return null;
}

function ClaudeMascot({ size = 46, hat = 'none' }) {
  const CLAY = '#C1785A', EYE = '#1A1A1A';
  return (
    <svg className="mx-svg" width={size} height={size * 10 / 9} viewBox="0 -2 9 10"
      shapeRendering="crispEdges" aria-hidden="true">
      <MxHat id={hat}/>
      <g className="mx-torso">
        {/* 頭上的兩個小角 */}
        <rect x="1" y="0" width="1" height="1" fill={CLAY}/>
        <rect x="7" y="0" width="1" height="1" fill={CLAY}/>
        {/* 身體（維持參考圖的平塗，不加陰影，才像素風） */}
        <rect x="0" y="1" width="9" height="5" fill={CLAY}/>
        {/* 眼睛（會眨） */}
        <rect className="mx-eye" x="1" y="2" width="2" height="2" fill={EYE}/>
        <rect className="mx-eye" x="6" y="2" width="2" height="2" fill={EYE}/>
      </g>
      <g className="mx-leg mx-leg-a"><rect x="0" y="6" width="2" height="2" fill={CLAY}/></g>
      <g className="mx-leg mx-leg-b"><rect x="3" y="6" width="3" height="2" fill={CLAY}/></g>
      <g className="mx-leg mx-leg-c"><rect x="7" y="6" width="2" height="2" fill={CLAY}/></g>
    </svg>
  );
}

/* ── 台詞（鼓勵為主，偶爾耍笨；不嘲諷小孩）────────────────── */
const MX_LINES = {
  hello:   ['嗨！我陪你唸書 📚', '今天也要加油喔！', '我又出現了 👀', '你在唸什麼？我也想學', '長按我可以幫我取名字 ✏️'],
  correct: ['答對了 🎉', '好強！', '就是這個！', '欸你很可以耶 😎', '再來再來！'],
  wrong:   ['沒關係，再試一次 💪', '差一點點！', '我剛剛也選錯 😅', '深呼吸，再看一次'],
  win:     ['全部做完啦 🎊', '太神啦！', '今天的你超棒 ⭐', '我要放鞭炮了 🎆'],
  idle:    ['我在散步 🚶', '腳有點酸…', '這裡風景不錯', '要不要摸摸我', '我在數格子 1、2、3…'],
  tap:     ['哇！你摸到我了', '嘿嘿 😆', '再點我會轉圈喔', '好癢好癢', '我可是很忙的（其實沒有）'],
  sleep:   ['💤', '呼…呼…', '睡一下下就好'],
};
const mxPick = (k) => { const a = MX_LINES[k] || MX_LINES.idle; return a[Math.floor(Math.random() * a.length)]; };
const MX_NAME_KEY = 'alan-mx-name';
function mxGetName() { try { return localStorage.getItem(MX_NAME_KEY) || ''; } catch (e) { return ''; } }
function mxSetName(n) { try { localStorage.setItem(MX_NAME_KEY, String(n || '').slice(0, 8)); } catch (e) {} }


/* 純走位／搞笑的動作（不含答題反應）*/
const MX_ACTS = ['walk', 'walk', 'walk', 'jump', 'spin', 'dance', 'roll', 'peek', 'sleep', 'think'];

function MascotLayer() {
  const [alive,  setAlive]  = useFx(false);   // 進站 2.5 秒後才出來，不跟載入畫面搶
  const [hidden, setHidden] = useFx(false);   // 長按＝這次先讓他去睡
  const [x,      setX]      = useFx(24);
  const [dir,    setDir]    = useFx(1);
  const [act,    setAct]    = useFx('idle');
  const [moveMs, setMoveMs] = useFx(0);
  const [bubble, setBubble] = useFx('');
  const [hat, setHat]     = useFx('none');       // v384: 完成越多，帽子越好
  const [name, setName]   = useFx(mxGetName());
  const [menu, setMenu]   = useFx(false);        // 長按叫出來的小選單
  const [drag, setDrag]   = useFx(null);         // 拖著走時的 {x,y}
  const timers  = useFxR([]);
  const bubbleT = useFxR(null);
  const reduce  = useFxR(false);

  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };

  const say = (text, ms) => {
    setBubble(text);
    if (bubbleT.current) clearTimeout(bubbleT.current);
    bubbleT.current = setTimeout(() => setBubble(''), ms || 2400);
  };

  /* app.jsx 會把 window.__mxAllow 設成「有沒有登入」——沒登入（門口／登入頁）就不出來。
     沒有這個旗標時（例如測試頁）預設出來。
     v376：小螢幕（手機／小平板）在「正在作答」的畫面也讓開——那裡每一格都是要點的，
     牠站上去會擋住。大螢幕有空間，照常出來玩。 */
  const BUSY_SEL = '.fc-p-learn, .fc-p-card, .fc-match-grid, .fc-test-list, .qm-options, .dm-wrap, .cloze-passage, .circle-question-list, .ws-player';
  const okNow = () => {
    if (window.__mxAllow === false) return false;
    if (window.innerWidth >= 900) return true;
    return !document.querySelector(BUSY_SEL);
  };
  const [allowed, setAllowed] = useFx(okNow());
  const [owned, setOwned] = useFx([]);
  useFxE(() => {
    const sync = () => {
      const own = mxOwnedHats();
      setOwned(own);
      const want = mxGetHat();
      setHat(own.indexOf(want) >= 0 ? want : (own[0] || 'none'));   // 買了就自動戴上
    };
    sync();
    const iv = setInterval(sync, 4000);
    return () => clearInterval(iv);
  }, []);

  useFxE(() => {
    try { reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    const t = setTimeout(() => setAlive(true), 2500);
    const iv = setInterval(() => setAllowed(okNow()), 1000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  /* 隨機動作循環 */
  useFxE(() => {
    if (!alive || hidden || !allowed) return;
    let stopped = false;

    // 右下角有「浮動頭像」等固定元件，留白不要走過去
    const maxX = () => Math.max(20, (window.innerWidth || 360) - 130);

    const doAct = () => {
      if (stopped) return;
      const pick = reduce.current
        ? (Math.random() < 0.5 ? 'think' : 'sleep')            // 減少動態＝只做原地的小動作
        : MX_ACTS[Math.floor(Math.random() * MX_ACTS.length)];

      if (pick === 'walk' || pick === 'roll') {
        const target = Math.round(Math.random() * maxX());
        const dist   = Math.abs(target - x);
        if (dist < 30) { setAct('idle'); later(doAct, 1200); return; }
        const speed  = pick === 'roll' ? 190 : 62;             // px / 秒
        const ms     = Math.round(dist / speed * 1000);
        setDir(target > x ? 1 : -1);
        setMoveMs(ms);
        setX(target);
        setAct(pick);
        if (Math.random() < 0.25) say(mxPick('idle'));
        later(() => { setAct('idle'); setMoveMs(0); later(doAct, 900 + Math.random() * 2200); }, ms + 120);
        return;
      }

      const HOLD = { jump: 1000, spin: 950, dance: 2000, peek: 1700, sleep: 4200, think: 2200 };
      setAct(pick);
      if (pick === 'sleep') say(mxPick('sleep'), 3800);
      else if (Math.random() < 0.45) say(mxPick('idle'));
      later(() => { setAct('idle'); later(doAct, 1200 + Math.random() * 3000); }, HOLD[pick] || 1200);
    };

    const first = later(() => { say(mxPick('hello')); later(doAct, 1600); }, 700);
    return () => { stopped = true; clearTimeout(first); clearAll(); };
  }, [alive, hidden, allowed]);

  /* 答題反應——攔 playSound，全站不用改任何一行就有反應 */
  useFxE(() => {
    if (!alive || hidden || !allowed) return;
    const orig = window.playSound;
    if (!orig || orig.__mx) return;
    const patched = function (type) {
      try { orig.apply(this, arguments); } catch (e) {}
      try {
        if (type === 'correct' && Math.random() < 0.45) { setAct('jump');  say(mxPick('correct'), 1600); later(() => setAct('idle'), 1000); }
        else if (type === 'wrong' && Math.random() < 0.45) { setAct('oops'); say(mxPick('wrong'), 1900); later(() => setAct('idle'), 900); }
        else if (type === 'complete' || type === 'fanfare') {
          setAct('cheer'); say(mxPick('win'), 3000); later(() => setAct('idle'), 2200);
        }
      } catch (e) {}
    };
    patched.__mx = true;
    window.playSound = patched;
    return () => { if (window.playSound === patched) window.playSound = orig; };
  }, [alive, hidden, allowed]);

  /* 給外面用的小 API */
  useFxE(() => {
    window.mascotSay = (t) => say(String(t || ''), 2600);
    window.mascotDo  = (a) => { setAct(a); later(() => setAct('idle'), 1600); };
    window.mascotCheer = () => { setAct('cheer'); say(mxPick('win'), 3000); later(() => setAct('idle'), 2200); };
  }, []);

  /* 點一下＝耍寶；長按＝去睡覺（這次不再出現）。
     ⚠ 牠會走到按鈕上面——所以點到牠的時候，先看看牠腳下是不是按鈕：
     是的話就把這一下讓給按鈕（吉祥物絕不會吃掉小朋友的作答）。 */
  const pressT = useFxR(null);
  const longRef = useFxR(false);
  const bodyRef = useFxR(null);
  const startRef = useFxR(null);
  const movedRef = useFxR(false);
  const pressedRef = useFxR(false);      // ⚠ 一定要有：不然放開之後滑鼠只是「移過去」也會被當成拖曳
  const onDown = (e) => {
    longRef.current = false; movedRef.current = false; pressedRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    // 長按＝叫出小選單（取名字／去睡覺）
    pressT.current = setTimeout(() => { if (!movedRef.current) { longRef.current = true; setMenu(true); } }, 650);
  };
  /* v384: 拖著走。小朋友最愛的就是這個，而且完全不吵——放開會掉回地上彈一下。 */
  const onMove = (e) => {
    if (!pressedRef.current || !startRef.current) return;   // 沒按著就不理它
    const dx = e.clientX - startRef.current.x, dy = e.clientY - startRef.current.y;
    if (!movedRef.current && Math.abs(dx) + Math.abs(dy) < 8) return;
    movedRef.current = true;
    clearTimeout(pressT.current);
    setDrag({ x: e.clientX, y: e.clientY });
  };
  const endDrag = () => {
    pressedRef.current = false;
    startRef.current = null;
    if (!movedRef.current) return;
    const d = drag;
    setDrag(null);
    if (d) {
      const maxX = Math.max(20, (window.innerWidth || 360) - 130);
      setX(Math.max(0, Math.min(maxX, Math.round(d.x - 23))));
      setMoveMs(0);
    }
    setAct('land'); later(() => setAct('idle'), 620);
    if (window.playSound) window.playSound('pop');
  };
  const onUp = (e) => {
    clearTimeout(pressT.current);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    const wasDrag = movedRef.current;
    pressedRef.current = false; startRef.current = null;
    if (wasDrag) { endDrag(); return; }
    if (longRef.current) return;
    const el = bodyRef.current;
    if (el && e && e.clientX != null) {
      const prev = el.style.pointerEvents;
      el.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      el.style.pointerEvents = prev;
      const hit = under && under.closest && under.closest('button, a, input, select, textarea, label, [role="button"]');
      if (hit) { hit.click(); return; }     // 腳下是按鈕 → 這一下算按鈕的，不耍寶
    }
    const tricks = reduce.current ? ['think'] : ['jump', 'spin', 'dance', 'roll'];
    const t = tricks[Math.floor(Math.random() * tricks.length)];
    setAct(t); say(mxPick('tap'), 2000);
    if (window.playSound) window.playSound('match');
    later(() => setAct('idle'), t === 'dance' ? 2000 : 1000);
  };

  if (!alive || hidden || !allowed) return null;

  const slotStyle = drag
    ? { transform: 'none', transition: 'none', left: (drag.x - 23) + 'px', bottom: 'auto',
        top: (drag.y - 20) + 'px', position: 'fixed' }
    : { transform: `translateX(${x}px)`, transition: moveMs ? `transform ${moveMs}ms linear` : 'none' };

  return (
    <div className={'mx-layer' + (drag ? ' dragging' : '')}>
      <div className="mx-slot" style={slotStyle}>
        {bubble && !menu && <div className="mx-bubble">{bubble}</div>}
        {menu && (
          <div className="mx-menu" onPointerDown={e => e.stopPropagation()}>
            <div className="mx-menu-name">{name || '還沒有名字'}</div>
            <button onClick={() => {
              const n = window.prompt('幫牠取個名字（最多 8 個字）', name || '');
              if (n !== null) { mxSetName(n.trim()); setName(n.trim()); say(n.trim() ? `我叫 ${n.trim()}！` : '好吧，我沒有名字', 2600); }
              setMenu(false);
            }}>✏️ 取名字</button>
            {owned.length > 0 && (
              <button onClick={() => {
                const cycle = ['none'].concat(owned);
                const next = cycle[(cycle.indexOf(hat) + 1) % cycle.length];
                setHat(next); mxSetHat(next === 'none' ? '' : next);
                const zh = (MX_HATS.find(h => h.id === next) || {}).zh;
                say(next === 'none' ? '帽子先收起來' : `戴上${zh}了！`, 2200);
                setMenu(false);
              }}>🎩 換帽子</button>
            )}
            <button onClick={() => { setMenu(false); setHidden(true); }}>💤 先去睡覺</button>
            <button className="mx-menu-x" onClick={() => setMenu(false)}>取消</button>
          </div>
        )}
        <div ref={bodyRef} className={'mx-body act-' + act} style={{ '--mx-dir': dir }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerCancel={() => { clearTimeout(pressT.current); endDrag(); }}
          role="img" aria-label={name ? `吉祥物 ${name}` : '吉祥物'}>
          <ClaudeMascot hat={hat}/>
        </div>
      </div>
    </div>
  );
}

/* ── 彩帶 ─────────────────────────────────────────────────── */
const FX_COLORS = ['#C1785A', '#C9A84C', '#2E7D5B', '#2E6F9E', '#8A5FA8', '#D6533C', '#E8C86A'];

function ConfettiBurst({ big, onDone }) {
  const pieces = useFxR(
    Array.from({ length: big ? 84 : 26 }, (_, i) => ({   // 沒達標時只放一點點（是「你做完了」不是「你贏了」）
      id: i,
      left:  Math.random() * 100,
      color: FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)],
      delay: Math.round(Math.random() * 420),
      dur:   Math.round(1500 + Math.random() * 1400),
      w:     Math.round(6 + Math.random() * 6),
      h:     Math.round(9 + Math.random() * 9),
      spin:  Math.round((Math.random() - 0.5) * 900),
      drift: Math.round((Math.random() - 0.5) * 180),
      round: Math.random() < 0.3,
    }))
  ).current;

  useFxE(() => {
    const t = setTimeout(() => onDone && onDone(), big ? 3400 : 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fx-confetti" aria-hidden="true">
      {pieces.map(p => (
        <span key={p.id} className="fx-cfp"
          style={{
            left: p.left + '%', background: p.color,
            width: p.w + 'px', height: p.h + 'px',
            borderRadius: p.round ? '50%' : '1px',
            animationDelay: p.delay + 'ms',
            animationDuration: p.dur + 'ms',
            '--fx-spin': p.spin + 'deg',
            '--fx-drift': p.drift + 'px',
          }}/>
      ))}
    </div>
  );
}

function FxLayer() {
  const [bursts, setBursts] = useFx([]);
  const seq = useFxR(0);
  useFxE(() => {
    window.spawnConfetti = (opts) => {
      const id = ++seq.current;
      setBursts(b => (b.length > 2 ? b : b.concat({ id, big: !!(opts && opts.big) })));
    };
  }, []);
  return (
    <React.Fragment>
      {bursts.map(b => (
        <ConfettiBurst key={b.id} big={b.big}
          onDone={() => setBursts(list => list.filter(x => x.id !== b.id))}/>
      ))}
      <MascotLayer/>
    </React.Fragment>
  );
}

Object.assign(window, { ClaudeMascot, MascotLayer, FxLayer, ConfettiBurst });

/* 自己掛載——不動 App 的樹，任何頁面都在 */
(function mountFx() {
  try {
    const host = document.createElement('div');
    host.id = '__fx-root';
    document.body.appendChild(host);
    ReactDOM.createRoot(host).render(<FxLayer/>);
  } catch (e) { /* 特效掛不上去也不能影響主程式 */ }
})();
