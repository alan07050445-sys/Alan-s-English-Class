// components-fx.jsx — v375
// ① 吉祥物 Claudius（像素風小傢伙）：會走路、跳、翻滾、打瞌睡、答對時比讚
// ② 完成特效：彩帶 + 音效（QmCelebrate / window.spawnConfetti 都走這裡）
// 這一層是獨立掛載的（自己 append 一個 div 到 body），不動 App 的樹，
// 所以任何頁面都看得到，也不會影響原本的版面計算。

const { useState: useFx, useEffect: useFxE, useRef: useFxR } = React;

/* ── 像素風吉祥物 ────────────────────────────────────────────
   9×8 的格子：頭上兩個小角、兩顆方眼睛、三隻腳。
   腳分成三塊，走路時左右腳輪流抬起來。 */
function ClaudeMascot({ size = 46 }) {
  const CLAY = '#C1785A', EYE = '#1A1A1A';
  return (
    <svg className="mx-svg" width={size} height={size * 8 / 9} viewBox="0 0 9 8"
      shapeRendering="crispEdges" aria-hidden="true">
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
  hello:   ['嗨！我陪你唸書 📚', '今天也要加油喔！', '我又出現了 👀', '你在唸什麼？我也想學'],
  correct: ['答對了 🎉', '好強！', '就是這個！', '欸你很可以耶 😎', '再來再來！'],
  wrong:   ['沒關係，再試一次 💪', '差一點點！', '我剛剛也選錯 😅', '深呼吸，再看一次'],
  win:     ['全部做完啦 🎊', '太神啦！', '今天的你超棒 ⭐', '我要放鞭炮了 🎆'],
  idle:    ['我在散步 🚶', '腳有點酸…', '這裡風景不錯', '要不要摸摸我', '我在數格子 1、2、3…'],
  tap:     ['哇！你摸到我了', '嘿嘿 😆', '再點我會轉圈喔', '好癢好癢', '我可是很忙的（其實沒有）'],
  sleep:   ['💤', '呼…呼…', '睡一下下就好'],
};
const mxPick = (k) => { const a = MX_LINES[k] || MX_LINES.idle; return a[Math.floor(Math.random() * a.length)]; };

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
        else if (type === 'complete' || type === 'fanfare') { setAct('cheer'); say(mxPick('win'), 3000); later(() => setAct('idle'), 2200); }
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
  const onDown = () => {
    longRef.current = false;
    pressT.current = setTimeout(() => { longRef.current = true; setHidden(true); }, 750);
  };
  const onUp = (e) => {
    clearTimeout(pressT.current);
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

  return (
    <div className="mx-layer">
      <div className="mx-slot" style={{ transform: `translateX(${x}px)`, transition: moveMs ? `transform ${moveMs}ms linear` : 'none' }}>
        {bubble && <div className="mx-bubble">{bubble}</div>}
        <div ref={bodyRef} className={'mx-body act-' + act} style={{ '--mx-dir': dir }}
          onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={() => clearTimeout(pressT.current)}
          role="img" aria-label="吉祥物">
          <ClaudeMascot/>
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
