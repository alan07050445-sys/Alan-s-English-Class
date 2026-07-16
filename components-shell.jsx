// components.jsx — Building blocks for Alan's English Class

const { useState, useEffect, useRef, useMemo } = React;

/* ───────── Icons ───────── */
function Icon({ name, size = 16 }) {
  const s = size;
  const stroke = { stroke: "currentColor", strokeWidth: 1.5, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "arrow-right":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case "arrow-left":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M19 12H5M11 5l-7 7 7 7" /></svg>;
    case "chevron-down":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M6 9l6 6 6-6" /></svg>;
    case "check":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M5 12l4 4 10-10" /></svg>;
    case "plus":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M12 5v14M5 12h14" /></svg>;
    case "edit":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M16 3l5 5L8 21H3v-5L16 3z" /></svg>;
    case "trash":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" /></svg>;
    case "external":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M14 4h6v6M20 4L10 14M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" /></svg>;
    case "close":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "lock":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><rect x="4" y="11" width="16" height="10" rx="1" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
    case "play":return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z" /></svg>;
    case "download":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>;
    case "users":return <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
    default:return null;
  }
}

/* ───────── Header ───────── */
function Header({
  week, weekOrder, weekIdx, onPrevWeek, onNextWeek,
  canEdit, editMode, onToggleEdit, onAddWeek, onDeleteWeek, onEditWeek,
  progress,
  // Auth props
  user, onLogin, onLogout, onShowDashboard, onHome,
  // Gamification
  streak, badges, onShowBadges, xp,
  // Mistakes
  mistakesCount, onShowMistakes,
  // Grade
  grade, onSwitchGrade,
  compactLobby,
}) {
  const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
  const atStart = weekIdx <= 0;
  const atEnd = weekIdx >= (weekOrder?.length || 1) - 1;

  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || '';

  return (
    <header className={'header' + (editMode && canEdit ? ' edit-mode' : '')}>
      <div className="shell">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mono">EST · 2026</span>
            {onHome
              ? <button className="brand-name brand-home" onClick={onHome} title="回首頁">Alan<em>'s</em> English Class</button>
              : <span className="brand-name">Alan<em>'s</em> English Class</span>}
            {grade && (
              <button className="grade-chip" onClick={onSwitchGrade} title="Switch grade">
                {window.isSummerTrack && window.isSummerTrack(grade) ? '☀️ 暑假' : grade.toUpperCase()}
              </button>
            )}
          </div>
          <div className="week-nav">
            <button onClick={onPrevWeek} aria-label="Previous week" disabled={atStart}><Icon name="arrow-left" size={14}/></button>
            <span className="label" style={{display:'flex',alignItems:'center',gap:6}}>
              {week.label}
              {editMode && canEdit && (
                <button
                  onClick={onEditWeek}
                  title="Edit week ID / label / dates"
                  style={{background:'none',border:'1px solid var(--border)',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontSize:10,color:'var(--ink-3)',lineHeight:1.4}}
                >✎</button>
              )}
            </span>
            <button onClick={onNextWeek} aria-label="Next week" disabled={atEnd}><Icon name="arrow-right" size={14}/></button>
          </div>
          <div className="header-right">
            {!compactLobby && (
              <div className="progress-pill">
                <span>{progress.done}/{progress.total} done</span>
                <div className="progress-track"><div className="progress-fill" style={{ width: pct + "%" }}/></div>
              </div>
            )}

            {/* Mistakes button (logged-in students) */}
            {user && onShowMistakes && !compactLobby && (
              <button
                className="mk-header-btn"
                onClick={onShowMistakes}
                title="我的錯題"
              >
                📕
                {mistakesCount > 0 && (
                  <span className="mk-header-badge">{mistakesCount}</span>
                )}
              </button>
            )}

            {/* Auth area */}
            <div className="header-auth">
              {canEdit && (
                <button
                  className={"icon-btn " + (editMode ? "active" : "")}
                  onClick={onToggleEdit}
                  title={editMode ? "Exit edit mode" : "Teacher edit mode"}>
                  <Icon name={editMode ? "lock" : "edit"} size={14}/>
                </button>
              )}
              {canEdit && (
                <button className="dashboard-btn" onClick={onShowDashboard} title="Class Report">
                  <Icon name="users" size={13}/> Report
                </button>
              )}
              {user ? (
                <div className="user-chip" onClick={onLogout} title={`Sign out — ${user.email}`}>
                  {user.photoURL
                    ? <img src={user.photoURL} className="user-avatar" referrerPolicy="no-referrer" alt=""/>
                    : <span className="user-initials">{(user.displayName || user.email || '?')[0].toUpperCase()}</span>
                  }
                  <span className="user-name">{firstName}</span>
                </div>
              ) : (
                <button className="signin-btn" onClick={onLogin}>登入</button>
              )}
            </div>
          </div>
        </div>
      </div>
      {editMode && canEdit &&
        <div className="edit-banner">
          <div className="shell edit-banner-inner">
            <span>● Teacher Edit Mode</span>
            <div className="edit-banner-tools">
              <button className="banner-btn" onClick={onAddWeek}><Icon name="plus" size={12}/> New Week</button>
              <button className="banner-btn danger" onClick={onDeleteWeek}><Icon name="trash" size={12}/> Delete this Week</button>
              <button className="banner-btn" onClick={onToggleEdit}>Done editing →</button>
            </div>
          </div>
        </div>
      }
    </header>
  );
}

/* ───────── Login Screen ───────── */
function LoginScreen({ onLogin, onSkip, onBack, loggedIn, userName, onLogout }) {
  const [loading, setLoading] = React.useState(false);
  const [acctOpen, setAcctOpen] = React.useState(false); // v249: 右上帳號下拉
  React.useEffect(() => {
    if (!acctOpen) return;
    const close = (e) => { if (!e.target.closest || !e.target.closest('.ll-acct')) setAcctOpen(false); };
    document.addEventListener('click', close, true);
    return () => document.removeEventListener('click', close, true);
  }, [acctOpen]);
  const [policyOpen, setPolicyOpen] = React.useState(false);
  const [teacherOpen, setTeacherOpen] = React.useState(false);
  const [shot, setShot] = React.useState(0);        // 產品畫面展示的分頁
  const [shotHover, setShotHover] = React.useState(false);
  const shotHoverRef = React.useRef(false);
  const [faqOpen, setFaqOpen] = React.useState(0);  // 展開中的 FAQ（-1 = 全收合）
  const [expCat, setExpCat] = React.useState('vocab'); // v241: hero 文具卡展開中的分類（預設第一張）
  const [asmRun, setAsmRun] = React.useState(false); // v245: 組裝段落是否已觸發
  const [asmKey, setAsmKey] = React.useState(0);     // v245: 「再看一次」重播 key

  // 題型展示自動輪播（hover 暫停；點分頁會重置計時；reduced-motion 不輪播）
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => { if (!shotHoverRef.current) setShot(s => (s + 1) % 4); }, 6500);
    return () => clearInterval(t);
  }, [shot, shotHover]);

  // v245: 組裝段落——捲進視野才開始編排，跑完靜止；reduced-motion / 無 IO 直接完成態
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.querySelector('.asm');
    const root = document.querySelector('.login-landing');
    if (!el || !root || reduce || !('IntersectionObserver' in window)) { setAsmRun(true); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => { if (en.isIntersecting) { setAsmRun(true); io.disconnect(); } });
    }, { root, threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [asmKey]);

  // Scroll-reveal motion (respects prefers-reduced-motion)
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.querySelector('.login-landing');
    const els = root ? root.querySelectorAll('.reveal, .reveal-group') : [];
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { root, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, []);

  // Pointer tilt + spotlight on all card tiles (mouse-only, skips touch/reduced-motion)
  React.useEffect(() => {
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    const cards = document.querySelectorAll('.ll-hm, .ll-hpc, .ll-pain, .ll-testi-card'); // v241: hpc 不再包在 .ll-results；.ll-feat 已拆
    if (!cards.length) return;
    const bound = [];
    cards.forEach(card => {
      const max = card.classList.contains('ll-hpc') ? [6, 8] : [4, 5]; // gentler tilt on small cards
      const onMove = (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--rx', ((0.5 - py) * max[0]).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((px - 0.5) * max[1]).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        card.classList.add('tilt-on');
      };
      const onLeave = () => {
        card.classList.remove('tilt-on');
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      bound.push([card, onMove, onLeave]);
    });
    return () => bound.forEach(([c, m, l]) => { c.removeEventListener('mousemove', m); c.removeEventListener('mouseleave', l); });
  }, []);

  // Count-up on the result stat numbers when they scroll into view
  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.querySelector('.login-landing');
    const nums = root ? root.querySelectorAll('.ll-pstat-num') : [];
    if (!nums.length || reduce || !('IntersectionObserver' in window)) return;

    const parse = (txt) => {
      let m;
      if ((m = txt.match(/^(\d+)→(\d+)$/))) return { type: 'range', a: +m[1], b: +m[2] };
      if ((m = txt.match(/^(\d+)(\D*)$/))) return { type: 'num', end: +m[1], suffix: m[2] };
      return null;
    };
    const infos = [];
    nums.forEach(el => {
      const p = parse(el.textContent.trim());
      if (!p) return;
      infos.push({ el, p });
      el.textContent = p.type === 'range' ? (p.a + '→' + p.a) : ('0' + p.suffix);
    });

    const run = ({ el, p }) => {
      const dur = 1100, t0 = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const from = p.type === 'range' ? p.a : 0;
      const to = p.type === 'range' ? p.b : p.end;
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const v = Math.round(from + (to - from) * ease(t));
        el.textContent = p.type === 'range' ? (p.a + '→' + v) : (v + p.suffix);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          const info = infos.find(i => i.el === en.target);
          if (info) run(info);
          io.unobserve(en.target);
        }
      });
    }, { root, threshold: 0.6 });
    infos.forEach(i => io.observe(i.el));
    return () => io.disconnect();
  }, []);

  // Hero ambient glow that slowly drifts toward the cursor (mouse-only)
  React.useEffect(() => {
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    const hero = document.querySelector('.ll-hero');
    const root = document.querySelector('.login-landing');
    if (!hero || !root) return;
    let tx = 50, ty = 38, cx = 50, cy = 38, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      hero.style.setProperty('--gx', cx.toFixed(2) + '%');
      hero.style.setProperty('--gy', cy.toFixed(2) + '%');
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      tx = Math.max(-15, Math.min(115, ((e.clientX - r.left) / r.width) * 100));
      ty = Math.max(-30, Math.min(130, ((e.clientY - r.top) / r.height) * 100));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    root.addEventListener('mousemove', onMove);
    return () => { root.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // 頂部閱讀進度條 + 輕視差（hero 插畫、各區角落色斑）
  React.useEffect(() => {
    const root = document.querySelector('.login-landing');
    if (!root) return;
    const bar = root.querySelector('.ll-nav-progress');
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heroImg = root.querySelector('.ll-hcards'); // v241: 視差作用在 hero 文具卡列（mockup 已移駐 Skills 區）
    const secs = Array.from(root.querySelectorAll('.ll-section'));
    // v223 背景色漸變：底色在各區顏色間隨捲動平滑內插（內容不動、不會暈）
    const BLEND = [
      ['#ll-top',     [249, 245, 236]],
      ['#ll-pains',   [255, 253, 248]],
      ['#ll-learn',   [246, 241, 230]],
      ['#ll-skills',  [244, 236, 221]],
      ['#ll-voices',  [251, 249, 243]],
      ['#ll-teacher', [246, 241, 230]],
      ['#ll-faq',     [255, 253, 248]],
      ['#ll-start',   [239, 230, 212]],
    ].map(([sel, c]) => ({ el: root.querySelector(sel), c })).filter(a => a.el);
    if (BLEND.length > 1) root.classList.add('ll-blend');
    const sun = root.querySelector('.ll-sun');
    // v246: 學期進度 HUD——捲動＝一個學期的進步（Week 1·59分 → Week 16·99分）
    const hud = root.querySelector('.ll-hud');
    const hudWeek = hud && hud.querySelector('.ll-hud-week');
    const hudZone = hud && hud.querySelector('.ll-hud-zone');
    const hudScore = hud && hud.querySelector('.ll-hud-score');
    const hudBar = hud && hud.querySelector('.ll-hud-bar-i');
    let hudLast = -1;
    // v248: 學習深海——幽靈字依景深速度漂過（near 快=近、far 慢=遠）
    const deepIts = Array.from(root.querySelectorAll('.ll-deep-it')).map(el => ({
      el,
      p: parseFloat(el.dataset.p),
      f: el.classList.contains('dp-near') ? 2.3 : el.classList.contains('dp-mid') ? 1.55 : 1.0,
    }));
    // v248: 內容「由遠至近」——各區隨捲動位置縮放/淡入（scrub；居中閱讀時＝原尺寸靜止）
    const dSecs = Array.from(root.querySelectorAll('.ll-hero, .ll-section, .ll-teacher, .ll-final'));
    let raf = 0;
    const apply = () => {
      raf = 0;
      const max = root.scrollHeight - root.clientHeight;
      root.classList.toggle('ll-off-top', root.scrollTop > 80); // v255: 捲離頂部 → 藏「往下看更多」
      // v257: 手機上 HUD 會壓到 hero／結尾的置中 CTA 與 footer——進入捲動敘事段才顯示
      // （結尾 scroll-snap 會停在離底 ~4% 處，門檻取 .93；CSS 只在 ≤640 生效）
      root.classList.toggle('ll-hud-quiet', root.scrollTop < root.clientHeight * 0.8 || (max > 0 && root.scrollTop / max > 0.93));
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? (root.scrollTop / max).toFixed(4) : 0) + ')';
      if (BLEND.length > 1) {
        // 以「視窗中線」落在哪兩個區塊中心之間來內插顏色
        const mid = root.clientHeight / 2;
        const pts = BLEND.map(a => { const r = a.el.getBoundingClientRect(); return { y: r.top + r.height / 2, c: a.c }; });
        let c = pts[0].c;
        if (mid <= pts[0].y) c = pts[0].c;
        else if (mid >= pts[pts.length - 1].y) c = pts[pts.length - 1].c;
        else for (let k = 0; k < pts.length - 1; k++) {
          if (mid >= pts[k].y && mid < pts[k + 1].y) {
            const t = (mid - pts[k].y) / (pts[k + 1].y - pts[k].y);
            c = pts[k].c.map((v, j) => Math.round(v + (pts[k + 1].c[j] - v) * t));
            break;
          }
        }
        root.style.backgroundColor = 'rgb(' + c.join(',') + ')';
      }
      if (sun && !reduce) {
        // 暖光從右上往左下慢慢漂（跟著底色一起變暖）
        const pr = max > 0 ? root.scrollTop / max : 0;
        sun.style.transform = 'translate(' + ((0.62 - pr * 0.45) * root.clientWidth).toFixed(0) + 'px, ' + ((0.06 + pr * 0.6) * root.clientHeight).toFixed(0) + 'px)';
      }
      if (deepIts.length) {
        // v248: 幽靈字漂過（位置映射；停止捲動就靜止）
        const p = max > 0 ? Math.min(1, root.scrollTop / max) : 0;
        const vh2 = root.clientHeight;
        deepIts.forEach(o => {
          const dy = (o.p - p) * o.f * vh2 * 4.5; // 係數大→字更專屬於自己的深度段，同屏 3-5 個
          if (Math.abs(dy) > vh2 * 0.85) {
            if (o.el.style.visibility !== 'hidden') o.el.style.visibility = 'hidden';
            return;
          }
          o.el.style.visibility = 'visible';
          o.el.style.transform = 'translate(-50%, ' + dy.toFixed(0) + 'px)';
        });
      }
      if (!reduce && dSecs.length) {
        // v248: 內容由遠至近——離視窗中心越遠越小越淡；置中＝1:1 靜止（不影響閱讀）
        const vh2 = root.clientHeight;
        dSecs.forEach(s => {
          const r2 = s.getBoundingClientRect();
          if (r2.bottom < -160 || r2.top > vh2 + 160) return;
          const c = (r2.top + r2.height / 2 - vh2 / 2) / vh2;
          const k = Math.min(1, Math.abs(c) / 0.6);
          s.style.transform = 'scale(' + (1 - k * 0.055).toFixed(4) + ')';
          s.style.opacity = (1 - k * 0.38).toFixed(3);
        });
      }
      if (hud) {
        // 位置映射（同 BLEND，不算動畫）：週次/分數/階段跟著捲動爬升
        const p = max > 0 ? Math.min(1, root.scrollTop / max) : 0;
        const step = Math.round(p * 200);
        if (step !== hudLast) {
          hudLast = step;
          const pb = Math.min(1, p * 1.04); // scroll-snap 會吸在離底一點點的位置——提前 4% 滿分
          const wk = Math.min(20, 1 + Math.floor(pb * 20));
          const sc = Math.round(pb * 100); // v248: Alan 選 0→100（可愛）
          const zone = p < .1 ? '開學' : p < .42 ? '每週練習' : p < .72 ? '穩定進步' : p < .93 ? '期末成果' : '換你的孩子了';
          if (hudWeek) hudWeek.textContent = 'WEEK ' + String(wk).padStart(2, '0');
          if (hudZone && hudZone.textContent !== zone) hudZone.textContent = zone;
          if (hudScore) hudScore.textContent = sc;
          if (hudBar) hudBar.style.width = (pb * 100).toFixed(1) + '%';
        }
      }
      if (fine && !reduce) {
        if (heroImg) heroImg.style.transform = 'translateY(' + Math.min(44, root.scrollTop * 0.08).toFixed(1) + 'px)';
        const vh = root.clientHeight;
        secs.forEach(s => {
          const r = s.getBoundingClientRect();
          if (r.bottom < -80 || r.top > vh + 80) return;
          const c = (r.top + r.height / 2 - vh / 2) / vh;
          s.style.setProperty('--par', (c * 26).toFixed(1));
        });
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    root.addEventListener('scroll', onScroll, { passive: true });
    apply();
    return () => { root.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const [loginSlow, setLoginSlow] = React.useState(false);
  const handleLogin = async () => {
    setLoading(true);
    setLoginSlow(false);
    // Chrome COOP 有時讓彈窗登入懸住不返回 —— 12 秒沒完成就給跳轉登入的備援
    const slowTimer = setTimeout(() => { setLoginSlow(true); setLoading(false); }, 12000);
    try { await onLogin(); } catch(e) { console.error(e); setLoading(false); }
    clearTimeout(slowTimer);
  };
  const handleLoginRedirect = () => {
    try { window.signInWithGoogleRedirect && window.signInWithGoogleRedirect(); } catch(e) { console.error(e); }
  };

  const NAV = [
    { id: 'll-top', label: '首頁' },
    { id: 'll-pains', label: '痛點' },
    { id: 'll-learn', label: '學什麼' },
    { id: 'll-skills', label: '能力' },
    { id: 'll-voices', label: '回饋' },
    { id: 'll-teacher', label: '老師' },
  ];
  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Scroll-spy: highlight the nav item for the section currently in view
  React.useEffect(() => {
    const links = Array.from(document.querySelectorAll('.ll-nav-link'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const secs = NAV.map(n => document.getElementById(n.id)).filter(Boolean);
    let active = null;
    const setActive = (id) => {
      if (id === active) return;
      active = id;
      links.forEach(l => l.classList.toggle('on', l.dataset.target === id));
    };
    const root = document.querySelector('.login-landing');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) setActive(en.target.id); });
    }, { root, rootMargin: '-8% 0px -84% 0px', threshold: 0 });
    secs.forEach(s => io.observe(s));
    // Last-section fix: when scrolled to the bottom, force the last nav item active
    const onScroll = () => {
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) setActive(NAV[NAV.length - 1].id);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); root.removeEventListener('scroll', onScroll); };
  }, []);
  // v243: CTA 改品牌主題按鈕「開始學習」（動作仍是 Google 登入，下方小字說明）
  const GoogleBtn = (
    <button className="google-btn ll-start-btn" onClick={handleLogin} disabled={loading}>
      {loading ? '登入中…' : '開始學習 →'}
    </button>
  );
  const GoogleBtnGroup = (
    <>
      {GoogleBtn}
      <span className="ll-login-hint">以 Google 帳號登入 · 免安裝</span>
      {loginSlow && (
        <button className="ll-login-alt" onClick={handleLoginRedirect}>
          登入視窗沒有回應？點此改用跳轉登入 →
        </button>
      )}
    </>
  );
  // 已登入的人從 app 內回來看首頁：CTA 變「回到學習」，不再出現登入按鈕
  const PrimaryCta = (loggedIn && onBack)
    ? <button className="google-btn ll-start-btn" onClick={onBack}>進入課程 →</button>
    : GoogleBtnGroup;

  const cats = [
    { key:'vocab',   zh:'單字',     en:'Vocabulary',   hero:'Words.',   desc:'外師單字 · 卡片、配對、拼寫',
      chips:['單字卡','配對','拼寫','選擇題'] },
    { key:'grammar', zh:'文法',     en:'Grammar',      hero:'Grammar.', desc:'句型與時態 · 選擇、填空、造句',
      chips:['選擇題','填空','造句','句型重組'] },
    { key:'word',    zh:'字根字首', en:'Word Study',   hero:'Roots.',   desc:'拆解構詞 · 字根、字首、字尾',
      chips:['字根拆解','音節切分','選擇題'] },
    { key:'reading', zh:'閱讀寫作', en:'Reading & Writing', hero:'Read.', desc:'閱讀理解 · 意見寫作（AI 批改）',
      chips:['閱讀理解','短文問答','意見寫作','AI 批改'] },
  ];

  // 展開區的迷你示範動畫（純 CSS 動畫，reduced-motion 時停在完成狀態）
  const catDemo = (key) => {
    if (key === 'vocab') return (
      <div className="lldm lldm-vocab" aria-hidden="true">
        <div className="lldm-flip">
          <div className="lldm-face lldm-front">apple</div>
          <div className="lldm-face lldm-back"><img className="lldm-apple" src="demo-apple.png" alt=""/>蘋果</div>
        </div>
        <div className="lldm-cap">單字卡 · 自動翻面複習</div>
      </div>
    );
    if (key === 'grammar') return (
      <div className="lldm lldm-grammar" aria-hidden="true">
        <div className="lldm-sent">
          She <span className="lldm-blank"><span className="lldm-fillin">goes</span></span> to school.
          <span className="lldm-tick">✓</span>
        </div>
        <div className="lldm-cap">填空 · 即時對錯回饋</div>
      </div>
    );
    if (key === 'word') return (
      <div className="lldm lldm-word" aria-hidden="true">
        <div className="lldm-segs">
          <span className="lldm-seg lldm-seg-pre">un<i>字首</i></span>
          <span className="lldm-seg lldm-seg-root">break<i>字根</i></span>
          <span className="lldm-seg lldm-seg-suf">able<i>字尾</i></span>
        </div>
        <div className="lldm-cap">一個字，拆給你看</div>
      </div>
    );
    return (
      <div className="lldm lldm-reading" aria-hidden="true">
        <div className="lldm-line"><span className="lldm-hl"/>The cat hides under the red car.</div>
        <div className="lldm-q">Where does the cat hide?</div>
        <div className="lldm-ai">AI 批改 · 答得很完整 ✓</div>
      </div>
    );
  };
  // 角色循環：老師出題 → 孩子每週練 → 家長看得到（→ 回到老師調整）
  const flow = [
    { img:'feat-mark.png',   role:'老師', rc:'t', title:'親自出題與批改', desc:'依康橋當週進度設計題目，寫作與造句結合 AI 輔助即時回饋。' },
    { img:'feat-week.png',   role:'孩子', rc:'k', title:'每週跟著練',     desc:'在家用自己的步調練當週內容，完成度、分數與錯題自動記錄。' },
    { img:'feat-record.png', role:'家長', rc:'p', title:'隨時看得到',     desc:'打開聯絡簿與成長報告，孩子練了什麼、進步多少一目了然。' },
  ];
  // v241: FlowArrow（放心設計橫向循環）與 shots（三端畫面展示）已隨區塊重組移除
  const faqs = [
    { q:'這個平台需要付費嗎？', a:'不用。這是 Alan 老師為學生與家長打造的練習平台，用 Google 帳號登入就能開始，不需要任何費用。' },
    { q:'需要準備什麼設備？', a:'有瀏覽器的電腦或平板就可以，不用安裝任何 App。建議使用電腦或平板，畫面較大、練習體驗最好。' },
    { q:'內容怎麼對齊康橋的進度？', a:'每週題目都由老師依康橋國際學校當週課程親自編寫——學校教到哪、就練到哪，考前不用再猜重點。' },
    { q:'家長怎麼掌握孩子的學習狀況？', a:'「本週聯絡簿」列出當週作業與完成狀況，「成長報告」呈現每週完成率與分數變化，老師每週也會提供學習報告。' },
    { q:'孩子的資料安全嗎？', a:'平台只記錄學習進度與成績，僅用於教學，不對外公開、不作其他用途。', privacy:true },
  ];

  const testi = [
    { q:'兩個孩子以前都比較怕英文，現在會主動打開練習，期末考也考得很穩定，真的進步很多！', who:'Eric & Tayler · G2' },
    { q:'Alan 老師很有耐心，會一步一步帶孩子練單字、文法和外師評量，孩子的分數和信心都有明顯提升。', who:'Elvis & Elroy · G4' },
    { q:'以前不知道孩子英文到底學到哪裡，現在每週都能清楚掌握重點和進度，考前複習也安心很多。', who:'Nick · G1' },
    { q:'孩子以前看到閱讀題就容易緊張，現在會慢慢找文章線索，也比較願意自己嘗試回答問題。', who:'Ryan · G3' },
    { q:'Alan 老師把文法整理得很清楚，孩子不只是背答案，而是真的慢慢理解句子的用法。', who:'Chloe · G2' },
    { q:'考前複習很有系統，從單字、文法到閱讀都有完整練到，孩子這次考試明顯穩定很多。', who:'Ethan · G5' },
    { q:'孩子一開始不太敢開口唸英文，現在上課會主動回答，也越來越喜歡英文課。', who:'Abby · G1' },
    { q:'以前孩子常常粗心看錯題目，現在會抓關鍵字，答題速度和準確度都有進步。', who:'Jason · G4' },
    { q:'每次上完課都知道孩子哪裡需要加強，回家練習也更有方向，不會只是盲目寫題目。', who:'Emma · G3' },
    { q:'老師設計的練習很有趣，孩子覺得像在闖關，不會覺得英文很無聊，學習意願也提高很多。', who:'Lucas · G2' },
  ];
  // v241: 見證改 Skillex 式箭頭輪播（wall of love 移除）

  return (
    <div className="login-screen login-landing">
      {onBack && (
        <button className="ll-back" onClick={onBack}>← 返回學習</button>
      )}

      <nav className="ll-nav" aria-label="頁面導覽">
        <button className="ll-nav-brand" onClick={() => scrollToId('ll-top')} aria-label="回到最上方">
          A<span className="ll-nav-brand-dot"/>
        </button>
        <div className="ll-nav-links">
          {NAV.map(n => (
            <button key={n.id} className="ll-nav-link" data-target={n.id} onClick={() => scrollToId(n.id)}>{n.label}</button>
          ))}
        </div>
        {(loggedIn && onBack)
          ? (
            <div className="ll-acct">
              <button className="ll-nav-cta ll-acct-btn" onClick={() => setAcctOpen(o => !o)} aria-haspopup="true" aria-expanded={acctOpen}>
                {userName || '我的帳號'}<i className="ll-acct-caret">▾</i>
              </button>
              {acctOpen && (
                <div className="ll-acct-menu" role="menu">
                  <button role="menuitem" onClick={() => { setAcctOpen(false); onBack(); }}>進入課程 →</button>
                  {onLogout && <button role="menuitem" className="ll-acct-out" onClick={() => { setAcctOpen(false); onLogout(); }}>登出</button>}
                </div>
              )}
            </div>
          )
          : <button className="ll-nav-cta" onClick={handleLogin} disabled={loading}>登入</button>}
        <span className="ll-nav-progress" aria-hidden="true"/>
      </nav>

      <div className="ll-sun" aria-hidden="true"/>{/* v225 暖陽光暈：隨捲動漂移 */}
      {/* v248: 學習深海——滿版幽靈字世界，捲動＝潛入學習深度（字母→單字→句子→成績），三種景深速度不同 */}
      <div className="ll-deep" aria-hidden="true">
        {[
          { t: 'A',                   p: .02, x: 10, d: 'far'  },
          { t: 'a b c',               p: .05, x: 76, d: 'mid'  },
          { t: 'Bb',                  p: .09, x: 20, d: 'near' },
          { t: 'ABC',                 p: .12, x: 64, d: 'far'  },
          { t: 'apple',               p: .17, x: 12, d: 'mid'  },
          { t: 'read',                p: .21, x: 72, d: 'near' },
          { t: 'c·a·t',               p: .25, x: 28, d: 'far'  },
          { t: 'study',               p: .29, x: 80, d: 'mid'  },
          { t: 'week',                p: .33, x: 10, d: 'near' },
          { t: 'spell',               p: .37, x: 56, d: 'far'  },
          { t: 'learn',               p: .41, x: 16, d: 'mid'  },
          { t: 'I can read.',         p: .46, x: 62, d: 'near' },
          { t: '✓',                   p: .50, x: 12, d: 'mid'  },
          { t: 'She goes to school.', p: .55, x: 34, d: 'far'  },
          { t: 'un·break·able',       p: .60, x: 68, d: 'mid'  },
          { t: '✓ ✓',                 p: .65, x: 14, d: 'near' },
          { t: '+10',                 p: .70, x: 76, d: 'mid'  },
          { t: '85',                  p: .76, x: 24, d: 'far'  },
          { t: 'Well done!',          p: .82, x: 64, d: 'near' },
          { t: 'A+',                  p: .87, x: 12, d: 'mid'  },
          { t: '★',                   p: .92, x: 78, d: 'far'  },
          { t: '100',                 p: .97, x: 42, d: 'near' },
        ].map((it, i) => (
          <span key={i} className={`ll-deep-it dp-${it.d}`} style={{ left: it.x + '%' }} data-p={it.p}>{it.t}</span>
        ))}
      </div>
      {/* v246: 學期進度 HUD——貫穿全頁的連串感：捲動＝一個學期 59→99 的進步 */}
      <div className="ll-hud" aria-hidden="true">
        <div className="ll-hud-top">
          <span className="ll-hud-week">WEEK 01</span>
          <span className="ll-hud-zone">開學</span>
        </div>
        <div className="ll-hud-scorerow"><b className="ll-hud-score">0</b><span className="ll-hud-unit">分</span></div>
        <div className="ll-hud-bar"><i className="ll-hud-bar-i"/></div>
        <div className="ll-hud-note">從 0 到 100 的一學期</div>
      </div>
      <div className="ll-wrap">

        <header className="ll-hero" id="ll-top">
          <div className="ll-hero-grid">
            <div className="ll-hero-text">
              <div className="ll-eyebrow">康橋國際學校 · 英文每週練習平台</div>
              <h1 className="ll-title">跟不上學校進度？<br/><em className="ll-title-em">每週對齊康橋，練得完、跟得上。</em></h1>
              <p className="ll-lead">
                學校教到哪，就練到哪——單字、文法、字根字首、閱讀寫作，
                老師依康橋當週課程親自出題，完成度與分數家長隨時看得到。
              </p>
              <div className="ll-cta">
                {PrimaryCta}
              </div>
            </div>
            <div className="ll-hero-art">
              {/* v241: 文具風直向卡片（RosyPosy 單字本質感）——hover/點按展開 */}
              <div className="ll-hcards" role="list" aria-label="四大學習項目">
                {cats.map(c => (
                  <div
                    role="listitem"
                    key={c.key}
                    className={`ll-hc${expCat === c.key ? ' exp' : ''}`}
                    style={{ '--cc': `var(--c-${c.key})` }}
                    onClick={() => setExpCat(c.key)}
                    onMouseEnter={() => setExpCat(c.key)}
                  >
                    <div className="ll-hc-rings" aria-hidden="true">
                      {Array.from({ length: 7 }, (_, i) => <span key={i}/>)}
                    </div>
                    <div className="ll-hc-spine" aria-hidden="true">{c.zh}</div>
                    <div className="ll-hc-open">
                      <div className="ll-hc-en">{c.hero}</div>
                      <div className="ll-hc-zh">{c.zh}</div>
                      <div className="ll-hc-desc">{c.desc}</div>
                      <div className="ll-hc-chips">
                        {c.chips.slice(0, 3).map(ch => <span key={ch}>{ch}</span>)}
                      </div>
                    </div>
                    <div className="ll-hc-clip" aria-hidden="true">
                      <span className="ll-hc-clip-neck"><i/></span>
                      <span className="ll-hc-clip-base"/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button className="ll-scrollcue" aria-label="往下捲動看更多" onClick={() => scrollToId('ll-pains')}>
            <span>往下看更多</span>
            <i aria-hidden="true">⌄</i>
          </button>

          <div className="ll-hero-decor" aria-hidden="true">
            <svg className="ll-doodle d-blob-a" viewBox="0 0 200 200"><path d="M40,-52C53,-43,65,-32,69,-19C73,-5,69,10,62,24C55,38,44,50,30,57C16,63,-2,64,-18,59C-34,53,-48,41,-57,26C-66,11,-70,-8,-64,-24C-58,-40,-42,-52,-26,-59C-10,-66,7,-67,23,-64C39,-61,27,-61,40,-52Z" transform="translate(100 100)"/></svg>
            <svg className="ll-doodle d-blob-b" viewBox="0 0 200 200"><path d="M44,-57C56,-47,64,-33,68,-18C72,-3,71,14,63,27C55,40,41,49,26,56C11,63,-6,68,-22,63C-38,58,-53,43,-60,26C-67,9,-66,-11,-58,-27C-50,-43,-35,-55,-19,-62C-3,-69,14,-71,44,-57Z" transform="translate(100 100)"/></svg>
            <svg className="ll-doodle d-squiggle" viewBox="0 0 90 16"><path d="M3 9 Q 13 1, 23 9 T 43 9 T 63 9 T 87 8" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/></svg>
            <svg className="ll-doodle d-spark s-1" viewBox="0 0 24 24"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
            <svg className="ll-doodle d-spark s-2" viewBox="0 0 24 24"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
            <span className="ll-dot dc-1"/>
            <span className="ll-dot dc-2"/>
            <span className="ll-dot dc-3"/>
            <span className="ll-dot dc-4"/>
          </div>
        </header>

        <section className="ll-section reveal-group" id="ll-pains">
          <div className="ll-kicker">家長的心聲</div>
          <h2 className="ll-h2">你的孩子，是不是也這樣？</h2>
          <p className="ll-sub">這些困擾，我們都陪著孩子一個一個解決。</p>
          <div className="ll-pain-grid reveal-group">
            {[
              { p:'在學校有聽沒有懂，整個跟不上。', s:'對齊學校每週進度，在家用自己的步調重練，聽不懂的地方反覆練到懂。' },
              { p:'進度太快，每週小考不知道重點在哪。', s:'老師每週標出重點與作業，孩子考前清楚知道要練什麼。' },
              { p:'學校沒評量、作業太少，根本無從準備考試。', s:'多元題型 ＋ 自動記錄 ＋ 錯題本，把練習量和評量一次補足。' },
              { p:'學校制度一直改，尤其寫作標準。', s:'老師持續跟著學校標準調整，寫作有 AI 即時回饋與老師親自批改。' },
            ].map((x, i) => (
              <div className="ll-pain llchat" key={i}>
                <div className="llchat-row q">
                  <span className="llchat-av q" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" fill="currentColor"/></svg>
                  </span>
                  <div className="llchat-col">
                    <span className="llchat-name">家長</span>
                    <div className="llchat-b q">{x.p}</div>
                  </div>
                </div>
                <div className="llchat-row a">
                  <div className="llchat-col a">
                    <span className="llchat-name">Alan 老師</span>
                    <div className="llchat-b a"><span className="ll-pain-tick">✓</span><span>{x.s}</span></div>
                  </div>
                  <span className="llchat-av a" aria-hidden="true">A</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ll-section reveal-group" id="ll-learn">
          <div className="ll-kicker">學什麼 · 怎麼練</div>
          <h2 className="ll-h2">多元題型，把一週的英文練透</h2>
          <p className="ll-sub">不是死背——每個項目都有好幾種練法，做錯了馬上知道為什麼。</p>
          <div className={`llp-zone${shotHover ? ' paused' : ''}`}
            onMouseEnter={() => { shotHoverRef.current = true; setShotHover(true); }}
            onMouseLeave={() => { shotHoverRef.current = false; setShotHover(false); }}>
          <div className="llp-tabs llx-tabs" role="tablist" aria-label="學習項目切換">
            {cats.map((c, i) => (
              <button key={c.key} role="tab" aria-selected={shot === i}
                className={`llp-tab${shot === i ? ' on' : ''}`}
                style={{ '--cc': `var(--c-${c.key})` }}
                onClick={() => setShot(i)}>
                <span className="llp-tab-who">{c.en}</span>
                <span className="llp-tab-t">{c.zh}</span>
              </button>
            ))}
          </div>
          <div className="llp-stagewrap">
            <div className="llp-frame">
              <div className="llp-chrome" aria-hidden="true">
                <span/><span/><span/>
                <div className="llp-url">Alan’s English Class</div>
              </div>
              <div className="llp-stage llx-stage">

                <div className={`llp-panel llx-panel${shot === 0 ? ' on' : ''}`} aria-hidden={shot !== 0} style={{ '--cc': 'var(--c-vocab)', '--ccbg': 'var(--c-vocab-bg)' }}>
                  <div className="llx-demo">{catDemo('vocab')}</div>
                  <div className="llx-demo">
                    <div className="lldm lldm-listen">
                      <button
                        type="button"
                        className="lldm-spk"
                        title="點我聽 apple 的發音"
                        aria-label="播放 apple 的發音"
                        onClick={() => window.speakText && window.speakText('apple', { lang: 'en-US' })}
                      >🔊</button>
                      <div className="lldm-opts" aria-hidden="true">
                        <span>ant</span>
                        <span className="lldm-opt-hit">apple<i>✓</i></span>
                        <span>act</span>
                        <span>add</span>
                      </div>
                      <div className="lldm-cap">聽音選字 · 點喇叭聽聽看</div>
                    </div>
                  </div>
                </div>

                <div className={`llp-panel llx-panel${shot === 1 ? ' on' : ''}`} aria-hidden={shot !== 1} style={{ '--cc': 'var(--c-grammar)', '--ccbg': 'var(--c-grammar-bg)' }}>
                  <div className="llx-demo">{catDemo('grammar')}</div>
                  <div className="llx-demo">
                    <div className="lldm lldm-mc" aria-hidden="true">
                      <div className="lldm-mc-q">Yesterday she ___ a book.</div>
                      <div className="lldm-mc-opts">
                        <span className="lldm-opt-hit">read<i>✓</i></span>
                        <span>reads</span>
                        <span>reading</span>
                        <span>to read</span>
                      </div>
                      <div className="lldm-cap">選擇題 · 時態一眼判斷</div>
                    </div>
                  </div>
                </div>

                <div className={`llp-panel llx-panel${shot === 2 ? ' on' : ''}`} aria-hidden={shot !== 2} style={{ '--cc': 'var(--c-word)', '--ccbg': 'var(--c-word-bg)' }}>
                  <div className="llx-demo">{catDemo('word')}</div>
                  <div className="llx-demo">
                    <div className="lldm lldm-syl" aria-hidden="true">
                      <div className="lldm-syl-w">won<i>·</i>der<i>·</i>ful</div>
                      <div className="lldm-syl-tags"><span>3 個音節</span><span>唸得出來</span></div>
                      <div className="lldm-cap">音節切分 · 長字不再卡住</div>
                    </div>
                  </div>
                </div>

                <div className={`llp-panel llx-panel${shot === 3 ? ' on' : ''}`} aria-hidden={shot !== 3} style={{ '--cc': 'var(--c-reading)', '--ccbg': 'var(--c-reading-bg)' }}>
                  <div className="llx-demo">{catDemo('reading')}</div>
                  <div className="llx-demo">
                    <div className="lldm lldm-write" aria-hidden="true">
                      <div className="lldm-wr-line">I think school lunch is great<span className="lldm-caret"/></div>
                      <div className="lldm-ai">AI 批改 · 再加一個理由會更有說服力 ✍️</div>
                      <div className="lldm-cap">意見寫作 · AI 即時回饋＋老師批改</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            <p className="llp-cap" key={shot}>{cats[shot].desc}</p>
          </div>
          </div>
          <p className="ll-proof-note">以上為示意畫面，實際題目依每週課程而定。</p>
        </section>

        <section className="ll-section reveal-group" id="ll-skills">
          <div className="ll-kicker">帶得走的能力</div>
          <h2 className="ll-h2">讓孩子帶得走的，不只是分數</h2>
          <p className="ll-sub">一個每週運轉的循環——老師出題、孩子練習、家長看見，成績自然跟上。</p>

          <div className="ll-sk-grid">
            <div className="ll-skb-col" aria-label="每週學習循環">
              {flow.map(f => (
                <div className="ll-skb" key={f.rc}>
                  <span className={`ll-skb-ic r-${f.rc}`}><img className="ll-feat-ic" src={f.img} alt=""/></span>
                  <div className="ll-skb-tx">
                    <b><em className={`ll-skb-role r-${f.rc}`}>{f.role}</em>{f.title}</b>
                    <span>{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="ll-hpc ll-hpc-lg">
              <div className="ll-hpc-head">
                <span className="ll-hpc-title">📈 一位學生的成績軌跡</span>
                <span className="ll-hpc-tag">真實 · 康橋校內評量</span>
              </div>
              <svg className="ll-hpc-chart" viewBox="0 0 320 110" preserveAspectRatio="none" aria-label="學生成績進步曲線">
                <line x1="8" y1="96" x2="312" y2="96" className="ll-hpc-base"/>
                <polygon points="14,92 70,78 126,66 182,46 238,32 304,16 304,96 14,96" className="ll-hpc-area"/>
                <polyline points="14,92 70,78 126,66 182,46 238,32 304,16" className="ll-hpc-line"/>
                <circle cx="14"  cy="92" r="3.5" className="ll-hpc-dot"/>
                <circle cx="70"  cy="78" r="3.5" className="ll-hpc-dot"/>
                <circle cx="126" cy="66" r="3.5" className="ll-hpc-dot"/>
                <circle cx="182" cy="46" r="3.5" className="ll-hpc-dot"/>
                <circle cx="238" cy="32" r="3.5" className="ll-hpc-dot"/>
                <circle cx="304" cy="16" r="5" className="ll-hpc-dot ll-hpc-dot-last"/>
              </svg>
              <div className="ll-hpc-foot">
                <span className="ll-hpc-jump">期中 <b>59</b> <span className="ll-hpc-arrow">→</span> 期末 <b>99</b></span>
                <span className="ll-hpc-plus">+40 分</span>
              </div>
            </div>
          </div>

          <div className="ll-statbar">
            <div className="ll-stat"><b>3 年</b><span>康橋教學</span></div>
            <div className="ll-stat"><b>50+</b><span>家教學生</span></div>
            <div className="ll-stat"><b>95+</b><span>E1 學生平均</span></div>
            <div className="ll-stat"><b>85+</b><span>E2 學生平均</span></div>
          </div>

          <div className="ll-sk-banner">
            {/* v245: 招牌組裝段落——捲到這裡元件依序飛入定位，成品＝真實產品畫面（之後可換真實上課影片） */}
            <h3 className="asm-title">一週的英文，是怎麼組起來的？</h3>
            <div className={`asm${asmRun ? ' run' : ''}`} key={asmKey}>
              <div className="asm-stage">
                <div className="asm-notes" aria-hidden="true">
                  <div className="asm-note n1"><b><i>1</i>老師親自出題</b><span>依康橋當週課程編寫</span></div>
                  <div className="asm-note n2"><b><i>2</i>每週對齊進度</b><span>學校教到哪，就練到哪</span></div>
                  <div className="asm-note n3"><b><i>3</i>10+ 種題型</b><span>單字卡到 AI 寫作批改</span></div>
                  <div className="asm-note n4"><b><i>4</i>自動記錄</b><span>完成度與分數，家長看得到</span></div>
                </div>
                <div className="ll-hm-wrap">
              <div className="ll-hm" role="img" aria-label="產品畫面示意：本週進度環與今天的任務清單">
                <div className="ll-hm-chrome" aria-hidden="true">
                  <span/><span/><span/>
                  <span className="ll-hm-url">alan's english class</span>
                  <span className="ll-hm-tag">示意畫面</span>
                </div>
                <div className="ll-hm-body" aria-hidden="true">
                  <div className="ll-hm-week">
                    <div className="ll-hm-week-l">
                      <span className="ll-hm-pill">WEEK 16</span>
                      <span className="ll-hm-theme">食物與料理</span>
                    </div>
                    <svg className="ll-hm-ring" viewBox="0 0 60 60">
                      <circle className="bg" cx="30" cy="30" r="24"/>
                      <circle className="fg" cx="30" cy="30" r="24" transform="rotate(-90 30 30)"/>
                      <text x="30" y="34.5">2/4</text>
                    </svg>
                  </div>
                  <div className="ll-hm-cap">📌 今天的任務</div>
                  <div className="ll-hm-tasks">
                    <div className="ll-hm-task done t1">
                      <span className="ll-hm-chk">✓</span>
                      <span className="ll-hm-tt">單字卡 · Food We Eat</span>
                      <b className="ll-hm-score">100 分</b>
                    </div>
                    <div className="ll-hm-task done t2">
                      <span className="ll-hm-chk">✓</span>
                      <span className="ll-hm-tt">選擇題 · Food We Eat</span>
                      <b className="ll-hm-score">85 分</b>
                    </div>
                    <div className="ll-hm-task next">
                      <span className="ll-hm-play">▶</span>
                      <span className="ll-hm-tt">填空練習 · Food We Eat</span>
                      <b className="ll-hm-cta">繼續 · 第 4 題</b>
                    </div>
                    <div className="ll-hm-task todo">
                      <span className="ll-hm-go">→</span>
                      <span className="ll-hm-tt">閱讀理解 · A Yummy Trip</span>
                      <b className="ll-hm-cta dim">開始</b>
                    </div>
                  </div>
                </div>
                <div className="ll-hm-toast" aria-hidden="true">
                  <span className="ll-hm-toast-ic">✓</span>
                  <span>選擇題完成 · <b>85 分</b></span>
                </div>
              </div>
            </div>
              </div>
            </div>
            <p className="ll-sk-banner-cap">
              孩子每週打開，看到的就是這個畫面——該練什麼、練到哪，一目了然。
              <button className="asm-replay" onClick={() => { setAsmRun(false); setAsmKey(k => k + 1); }}>↻ 再看一次</button>
            </p>
          </div>
          <p className="ll-proof-note">成績皆為康橋國際學校校內評量真實數據。</p>
        </section>

        <section className="ll-section reveal-group" id="ll-voices">
          <div className="ll-kicker">家長怎麼說</div>
          <h2 className="ll-h2">家長的真實回饋</h2>
          <p className="ll-sub">來自 30+ 個家庭，最真實的聲音。</p>
          <div className="ll-tcar-wrap">
            <div className="ll-tcar" id="ll-tcar">
              {testi.map((t, i) => (
                <div className="ll-testi-card" key={i}>
                  <div className="ll-testi-stars">★★★★★</div>
                  <p className="ll-testi-q">「{t.q}」</p>
                  <div className="ll-testi-who">{t.who}</div>
                </div>
              ))}
            </div>
            <div className="ll-tcar-nav">
              <button className="ll-tcar-btn" aria-label="上一頁"
                onClick={() => { const el = document.getElementById('ll-tcar'); if (el) el.scrollBy({ left: -el.clientWidth * 0.9, behavior: 'smooth' }); }}>←</button>
              <button className="ll-tcar-btn" aria-label="下一頁"
                onClick={() => { const el = document.getElementById('ll-tcar'); if (el) el.scrollBy({ left: el.clientWidth * 0.9, behavior: 'smooth' }); }}>→</button>
            </div>
          </div>
        </section>

        <section className="ll-teacher reveal-group" id="ll-teacher">
          <div className="ll-teacher-av">A</div>
          <div className="ll-teacher-info">
            <div className="ll-teacher-name">Alan 老師 · 康橋英文</div>
            <p className="ll-teacher-bio">
              專教康橋小學英語、可全英文授課。教學 3 年、家教 50+ 學生，活潑開朗又耐心細心，
              把每週課程拆解成孩子能一步步完成的練習，讓成績實際進步、家長看得到。
            </p>
            <div className="ll-teacher-stats">
              <div className="lt-stat"><b>3 年</b><span>教學經歷</span></div>
              <div className="lt-stat"><b>50+</b><span>家教學生</span></div>
              <div className="lt-stat"><b>95+</b><span>E1 平均分</span></div>
            </div>
            <button className="ll-teacher-more" onClick={() => setTeacherOpen(true)}>了解教學理念與成果 →</button>
          </div>
        </section>

        <section className="ll-section reveal-group" id="ll-faq">
          <div className="ll-kicker">常見問題</div>
          <h2 className="ll-h2">家長最常問的 5 個問題</h2>
          <div className="ll-faq-list reveal-group">
            {faqs.map((f, i) => (
              <div className={`ll-faq-item${faqOpen === i ? ' open' : ''}`} key={i}>
                <button className="ll-faq-q" aria-expanded={faqOpen === i}
                  onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>
                  <span>{f.q}</span>
                  <span className="ll-faq-x" aria-hidden="true">+</span>
                </button>
                <div className="ll-faq-a">
                  <div className="ll-faq-a-in">
                    {f.a}
                    {f.privacy && (
                      <> 詳細內容請見<button className="ll-faq-link" onClick={() => setPolicyOpen(true)}>隱私與資料保護</button>。</>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ll-final reveal-group" id="ll-start">
          <div className="ll-kicker">怎麼開始</div>
          <h2 className="ll-h2">準備好開始了嗎？三步驟就上手</h2>
          <div className="ll-steps reveal-group">
            <div className="ll-step">
              <div className="ll-step-num">1</div>
              <div className="ll-step-t">用 Google 登入</div>
              <div className="ll-step-d">免安裝、免填表單，電腦、平板打開就能用。</div>
            </div>
            <div className="ll-step">
              <div className="ll-step-num">2</div>
              <div className="ll-step-t">選擇孩子的年級</div>
              <div className="ll-step-d">自動對到該年級的每週課程，直接跳到本週進度。</div>
            </div>
            <div className="ll-step">
              <div className="ll-step-num">3</div>
              <div className="ll-step-t">每週跟著練</div>
              <div className="ll-step-d">進度與成績自動記錄，家長打開聯絡簿就看得到。</div>
            </div>
          </div>
          <div className="ll-cta ll-cta-center">
            {PrimaryCta}
          </div>
        </section>

        <footer className="ll-foot2">
          <div className="ll-foot2-top">
            <div className="ll-foot2-brand">
              <b>Alan’s English Class<i>.</i></b>
              <p>對齊康橋國際學校每週進度的英文練習平台——讓孩子跟得上、家長看得到。</p>
            </div>
            <div className="ll-foot2-cols">
              <div className="ll-foot2-col">
                <b>快速前往</b>
                <button onClick={() => scrollToId('ll-learn')}>學什麼</button>
                <button onClick={() => scrollToId('ll-skills')}>帶得走的能力</button>
                <button onClick={() => scrollToId('ll-voices')}>家長回饋</button>
              </div>
              <div className="ll-foot2-col">
                <b>了解更多</b>
                <button onClick={() => setTeacherOpen(true)}>關於 Alan 老師</button>
                <button onClick={() => scrollToId('ll-faq')}>常見問題</button>
                <button onClick={() => setPolicyOpen(true)}>隱私與資料保護</button>
              </div>
            </div>
            <div className="ll-foot2-contact">
              <b>聯絡 Alan 老師</b>
              <a className="ll-foot2-btn" href="mailto:alan07050445@gmail.com">✉️ Email 聯絡</a>
              <div className="ll-foot2-lineid"><span>LINE ID</span>9161791608</div>
            </div>
          </div>
          <div className="ll-foot2-bar">
            <span>© {new Date().getFullYear()} Alan’s English Class · All rights reserved</span>
            <span className="ll-foot2-mini">康橋國際學校 · 小學部英文</span>
          </div>
        </footer>

      </div>

      {policyOpen && <PrivacyOverlay onClose={() => setPolicyOpen(false)} />}
      {teacherOpen && <TeacherOverlay onClose={() => setTeacherOpen(false)} onOpenPrivacy={() => { setTeacherOpen(false); setPolicyOpen(true); }} />}
    </div>
  );
}

/* ───────── About the teacher ───────── */
function TeacherOverlay({ onClose, onOpenPrivacy }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="policy-overlay" onClick={onClose}>
      <div className="policy-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="關於老師">
        <header className="policy-head">
          <div>
            <div className="policy-kicker">關於老師</div>
            <h2 className="policy-title">Alan 老師 · 康橋英文</h2>
          </div>
          <button className="policy-x" onClick={onClose} aria-label="關閉">×</button>
        </header>

        <div className="policy-body">
          <div className="tabt-intro">
            <div className="tabt-av">A</div>
            <p className="tabt-lead">
              我是 Alan，<b>專教康橋小學英語、可全英文授課</b>。
              個性活潑開朗、耐心細心，深受孩子喜愛——
              我相信成績的進步，來自孩子願意一直練下去。
            </p>
          </div>

          <div className="tabt-facts">
            <div className="tabt-fact"><span className="tabt-fact-num">3 年</span><span className="tabt-fact-lbl">教學經歷</span></div>
            <div className="tabt-fact"><span className="tabt-fact-num">50+</span><span className="tabt-fact-lbl">家教學生</span></div>
            <div className="tabt-fact"><span className="tabt-fact-num">康橋</span><span className="tabt-fact-lbl">小學英語專業</span></div>
          </div>

          <section className="policy-sec">
            <h3>教學理念</h3>
            <p>
              我相信進步來自「持續、可完成的小步驟」。比起一次塞給孩子大量內容，
              不如每週對齊學校進度、把練習拆小，讓孩子每次都能完成、累積成就感，
              家長也能清楚看到一整學期的成長軌跡。
            </p>
          </section>

          <section className="policy-sec policy-sec-strong">
            <h3>教學成果（康橋校內評量）</h3>
            <ul>
              <li><b>E1 學生平均 95 分以上。</b></li>
              <li><b>E2 學生平均 85 分以上。</b></li>
              <li>不少學生明顯進步，例如從 60 分進步到 85 分。</li>
            </ul>
            <p style={{marginTop:'8px',fontSize:'12.5px'}}>以上為學生在康橋國際學校校內評量的整體表現。</p>
          </section>

          <section className="policy-sec">
            <h3>這個平台怎麼幫孩子</h3>
            <ul>
              <li><b>對齊康橋每週進度</b>：在家練的就是學校在教的，不脫節。</li>
              <li><b>四大學習項目</b>：單字、文法、字根字首、閱讀寫作，紮實打底。</li>
              <li><b>多元題型 + AI 輔助批改</b>：單字卡、配對、克漏字、造句到寫作，寫作與造句結合 AI 即時回饋。</li>
              <li><b>自動記錄與錯題本</b>：完成度、分數、答錯的題目自動存檔，弱點看得見、可加強。</li>
            </ul>
          </section>

          <section className="policy-sec policy-sec-strong">
            <h3>給家長的承諾</h3>
            <ul>
              <li>題目由老師依進度親自設計與批改，不是制式題庫。</li>
              <li>學習進度透明，每週聯絡簿與成長頁隨時可看。</li>
              <li>孩子的資料只用於記錄學習，<button className="tabt-inline-link" onClick={onOpenPrivacy}>詳見隱私與資料保護</button>。</li>
            </ul>
          </section>

          <section className="policy-sec">
            <h3>聯絡 Alan 老師</h3>
            <p>
              想了解課程或合作，歡迎聯絡：<br/>
              <a href="mailto:alan07050445@gmail.com">alan07050445@gmail.com</a>　·　LINE：9161791608
            </p>
          </section>
        </div>

        <footer className="policy-foot">
          <button className="policy-done" onClick={onClose}>我了解了</button>
        </footer>
      </div>
    </div>
  );
}

/* ───────── Privacy & data protection ───────── */
function PrivacyOverlay({ onClose }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updated = '2026 年 6 月';
  return (
    <div className="policy-overlay" onClick={onClose}>
      <div className="policy-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="隱私與資料保護">
        <header className="policy-head">
          <div>
            <div className="policy-kicker">隱私與資料保護</div>
            <h2 className="policy-title">我們如何保護孩子的資料</h2>
          </div>
          <button className="policy-x" onClick={onClose} aria-label="關閉">×</button>
        </header>

        <div className="policy-body">
          <p className="policy-intro">
            本平台（Alan’s English Class）是為康橋國際學校英文課程設計的學習練習工具。
            我們僅蒐集為了記錄學習進度所必需的資料，並以對待自己孩子的標準來保護它。
          </p>

          <section className="policy-sec">
            <h3>1 · 我們蒐集哪些資料</h3>
            <ul>
              <li><b>Google 帳號基本資料</b>：姓名、電子郵件、頭像（登入時由 Google 提供）。</li>
              <li><b>學習紀錄</b>：練習完成狀況、分數、答錯的題目、學習日期。</li>
            </ul>
          </section>

          <section className="policy-sec">
            <h3>2 · 為什麼蒐集</h3>
            <ul>
              <li>記錄並同步孩子的學習進度，換裝置也不會遺失。</li>
              <li>讓家長透過每週聯絡簿與週報，清楚看到孩子的學習狀況。</li>
              <li>讓老師掌握班級整體進度、針對弱點調整教學。</li>
            </ul>
          </section>

          <section className="policy-sec policy-sec-strong">
            <h3>3 · 我們絕對不會做的事</h3>
            <ul>
              <li>不販售、不出租孩子的任何資料。</li>
              <li>不對外公開、不用於廣告或行銷。</li>
              <li>不分享給與教學無關的第三方。</li>
            </ul>
          </section>

          <section className="policy-sec">
            <h3>4 · 資料如何儲存</h3>
            <p>
              資料儲存於 Google Firebase（Google Cloud）服務，傳輸過程全程加密（HTTPS），
              並透過權限規則限制：學生只能讀寫自己的紀錄，僅授課老師可檢視班級彙整資料。
            </p>
          </section>

          <section className="policy-sec">
            <h3>5 · 兒童隱私與家長權利</h3>
            <p>
              本平台服務對象為未成年學生，使用需經家長同意。家長可隨時來信要求
              <b>查詢、更正或刪除</b>孩子的帳號與學習資料，我們會在收到請求後盡快處理。
            </p>
          </section>

          <section className="policy-sec">
            <h3>6 · 聯絡我們</h3>
            <p>
              對資料保護有任何疑問，請聯絡：<br/>
              <a href="mailto:alan07050445@gmail.com">alan07050445@gmail.com</a>　·　LINE：9161791608
            </p>
          </section>

          <p className="policy-updated">最後更新：{updated}</p>
        </div>

        <footer className="policy-foot">
          <button className="policy-done" onClick={onClose}>我了解了</button>
        </footer>
      </div>
    </div>
  );
}

/* ───────── Hero ───────── */
function EditableText({ value, placeholder, onChange, className, multiline, editMode }) {
  // View mode  -> plain <span>
  // Edit mode  -> a real React-controlled <input> / <textarea> (no contentEditable).
  //               Standard form-field UX, no browser quirks, no duplication.
  const [draft, setDraft] = React.useState(value || "");
  React.useEffect(() => { setDraft(value || ""); }, [value, editMode]);

  const taRef = React.useRef(null);
  React.useEffect(() => {
    if (!multiline || !taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = taRef.current.scrollHeight + "px";
  }, [draft, editMode, multiline]);

  if (!editMode) {
    return <span className={className}>{value}</span>;
  }

  const commit = () => {
    const next = (draft || "").trim();
    if (next !== (value || "")) onChange(next);
  };

  const shared = {
    className: (className || "") + " editable-input",
    value: draft,
    placeholder,
    spellCheck: false,
    onChange: (e) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e) => {
      if (!multiline && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
      if (e.key === "Escape") { setDraft(value || ""); e.currentTarget.blur(); }
    },
  };

  return multiline
    ? <textarea ref={taRef} rows={1} {...shared}/>
    : <input type="text" {...shared}/>;
}

function Hero({ week, totalItems, totalDone, editMode, onUpdateWeek }) {
  const pct = totalItems > 0 ? Math.round(totalDone / totalItems * 100) : 0;
  return (
    <section className="hero">
      <div className="shell">
        <div className="hero-eyebrow">
          <span className="dot" />
          <span className="mono">This Week · 本週進度</span>
          <EditableText
            value={week.dateRange || ""}
            placeholder="May 17 – May 23"
            editMode={editMode}
            className="mono"
            onChange={(v) => onUpdateWeek({ dateRange: v })} />
        </div>
        <h1 className="hero-title">
          <EditableText
            value={week.theme || ""}
            placeholder="Week theme…"
            editMode={editMode}
            onChange={(v) => onUpdateWeek({ theme: v })} />
          
          {!editMode && <em></em>}
        </h1>
        <p className="hero-sub">
          <EditableText
            value={week.subtitle || ""}
            placeholder="English subtitle…"
            editMode={editMode}
            multiline
            onChange={(v) => onUpdateWeek({ subtitle: v })} />
          
          <span className="zh">
            <EditableText
              value={week.subtitleZh || ""}
              placeholder="中文副標…"
              editMode={editMode}
              multiline
              onChange={(v) => onUpdateWeek({ subtitleZh: v })} />
            
          </span>
        </p>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">Week</span>
            <span className="stat-value serif">{(week.label || "—").replace("Week ", "")}<span className="unit">/ 2026</span></span>
          </div>
          <div className="stat">
            <span className="stat-label">Items</span>
            <span className="stat-value serif">{totalItems}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Completed</span>
            <span className="stat-value serif">{totalDone}<span className="unit">/ {totalItems}</span></span>
          </div>
          <div className="stat">
            <span className="stat-label">Progress</span>
            <span className="stat-value serif">{pct}<span className="unit">%</span></span>
          </div>
        </div>
      </div>
    </section>);

}

/* ───────── Badges Modal ───────── */
function BadgesModal({ badges, onClose }) {
  const BADGES = window.BADGES || {};
  const ALL_IDS = Object.keys(BADGES);
  const got = ALL_IDS.filter(id => !!badges?.[id]).length;
  const total = ALL_IDS.length;
  const pct = total > 0 ? Math.round(got / total * 100) : 0;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal bdg-modal" onClick={e => e.stopPropagation()} style={{maxWidth:460}}>
        <button className="modal-close bdg-close" onClick={onClose}><Icon name="close" size={14}/></button>
        <div className="bdg-hero">
          <img src="trophy.png" alt="" className="bdg-hero-img"/>
          <h3 className="bdg-hero-title">我的成就</h3>
          <p className="bdg-hero-sub">已解鎖 <strong>{got}</strong> / {total} 個徽章</p>
          <div className="bdg-progress"><div className="bdg-progress-fill" style={{width: pct + '%'}}/></div>
        </div>
        <div className="bdg-grid">
          {ALL_IDS.map(id => {
            const b = BADGES[id];
            const unlocked = !!badges?.[id];
            return (
              <div key={id} className={`badge-card${unlocked ? ' unlocked' : ' locked'}`}>
                <span className="badge-emoji">{unlocked ? b.emoji : '🔒'}</span>
                <span className="badge-name">{b.name}</span>
                <span className="badge-desc">{b.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────── Badge Unlock Toast ───────── */
function BadgeToast({ badge, onDone }) {
  React.useEffect(() => {
    window.playSound && window.playSound('badge');
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="badge-toast" onClick={onDone}>
      <span className="badge-toast-emoji">{badge.emoji}</span>
      <div>
        <div className="badge-toast-title">成就解鎖！</div>
        <div className="badge-toast-name">{badge.name} — {badge.desc}</div>
      </div>
    </div>
  );
}

/* ───────── Grade Selector ───────── */
function GradeSelector({ onSelect, summer, homeGrade, who, onChangeGrade, onViewLanding, onOpenGuide, summerOnly, onOpenAdmin }) {
  const grades = [
    { id: 'g2', n: 'G2', zh: '二年級' },
    { id: 'g3', n: 'G3', zh: '三年級' },
    { id: 'g4', n: 'G4', zh: '四年級' },
    { id: 'g5', n: 'G5', zh: '五年級' },
    { id: 'g6', n: 'G6', zh: '六年級' },
  ];
  const home = grades.find(g => g.id === homeGrade) || null;
  const [showAll, setShowAll] = React.useState(!home); // 有專屬年級 → 門口模式；否則完整選單
  const doorMode = home && !showAll;

  // v257: 時段問候＋今天日期＋暑假第幾週
  const hourNow = new Date().getHours();
  const greet = hourNow < 5 ? '晚安' : hourNow < 11 ? '早安' : hourNow < 18 ? '午安' : '晚安';
  const dateLine = new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
  const sfxNow = window.summerCurrentSuffix ? window.summerCurrentSuffix() : null;
  const summerWeekNo = sfxNow ? parseInt(sfxNow.slice(2), 10) : null;

  // v257: 老師卡即時資訊——今天已有幾位學生練習過（只有老師會掛這個訂閱）
  const [todayActive, setTodayActive] = React.useState(null);
  React.useEffect(() => {
    if (!onOpenAdmin || !window.subscribeAllStudents) return;
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    try {
      return window.subscribeAllStudents(all => {
        setTodayActive(all.filter(s => (s.updatedAt || 0) >= t0.getTime()).length);
      });
    } catch(e) {}
  }, []);

  // v257: 暑假卡進度環——優先顯示本週任務，本週沒派任務就看整個暑假
  const prog = summer && summer.prog;
  const ringScope = prog && prog.wkTotal > 0
    ? { done: prog.wkDone, total: prog.wkTotal, label: '本週任務' }
    : (prog && prog.allTotal > 0 ? { done: prog.allDone, total: prog.allTotal, label: '暑假任務' } : null);
  const ringPct = ringScope ? ringScope.done / ringScope.total : 0;
  const RING_C = 2 * Math.PI * 17;

  // 游標暖光：緩慢漂向滑鼠位置（僅滑鼠裝置、尊重 reduced-motion）
  React.useEffect(() => {
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    const root = document.querySelector('.grade-selector');
    if (!root) return;
    let tx = 50, ty = 40, cx = 50, cy = 40, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      root.style.setProperty('--gsx', cx.toFixed(2) + '%');
      root.style.setProperty('--gsy', cy.toFixed(2) + '%');
      raf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e) => {
      tx = e.clientX / window.innerWidth * 100;
      ty = e.clientY / window.innerHeight * 100;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    root.addEventListener('mousemove', onMove);
    return () => { root.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="grade-selector">
      <div className="gs-decor" aria-hidden="true">
        <span className="gs-blob gs-blob-a"/>
        <span className="gs-blob gs-blob-b"/>
        <svg className="gs-spark gs-spark-1" viewBox="0 0 24 24"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
        <svg className="gs-spark gs-spark-2" viewBox="0 0 24 24"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
        {/* v249: 首頁「學習深海」幽靈字延伸到門口頁（靜態、更淡）——三頁同一片海 */}
        <span className="deep-lite dl-a">Aa</span>
        <span className="deep-lite dl-b">read</span>
        <span className="deep-lite dl-c">✓</span>
      </div>
      <div className="grade-selector-inner">
        <img src="icon.svg" alt="Alan's English Class" className="grade-sel-logo-img"/>
        <div className="gs-kicker">Alan’s English Class</div>
        <h1 className="grade-sel-title">{doorMode ? (who ? `${greet}，${who}！` : `${greet}！`) : '現在讀幾年級呢？'}</h1>
        <p className="grade-sel-sub">
          {doorMode
            ? <><span className="gs-date">{dateLine}</span><span className="gs-date-dot">·</span>今天要從哪裡開始呢？</>
            : '選好就直接帶你進入這一週的練習。'}
        </p>
        {onOpenAdmin && (
          <button className="gs-card gs-card-admin" onClick={onOpenAdmin}>
            <span className="gs-card-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/>
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>
              </svg>
            </span>
            <span className="gs-card-text">
              <b>老師後台</b>
              <span>{todayActive != null ? `今天已有 ${todayActive} 位學生練習過` : '總覽 · 學生 · 發派 · 報告'}</span>
            </span>
            <span className="gs-card-cta">進入 →</span>
          </button>
        )}
        {/* v261: 暑假期間題庫是老師的主要工作區——排在後台正下方、用暑假金黃主題 */}
        {summer && summer.lib && (
          <button className="gs-card gs-card-lib" onClick={() => onSelect(window.SUMMER_LIB || 'sl')}>
            <span className="gs-card-ico gs-card-ico-lib" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13H6.5A2.5 2.5 0 004 19.5z"/>
                <path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/>
                <path d="M9 8.5h7M9 12h4.5"/>
              </svg>
            </span>
            <span className="gs-card-text">
              <b>暑假題庫</b>
              <span>老師專用 · 出題後到後台發派給學生</span>
            </span>
            <span className="gs-card-cta">進入 →</span>
          </button>
        )}
        {summer && summer.mine && (
          <button className="gs-card gs-card-summer" onClick={() => onSelect(window.SUMMER_ME || 'sme')}>
            {ringScope ? (
              <span className="gs-card-ico gs-ring" aria-hidden="true">
                <svg viewBox="0 0 44 44">
                  <circle className="gs-ring-track" cx="22" cy="22" r="17"/>
                  <circle
                    className="gs-ring-fill"
                    cx="22" cy="22" r="17"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C * (1 - ringPct)}
                  />
                </svg>
                <em>{ringScope.done}/{ringScope.total}</em>
              </span>
            ) : (
              <span className="gs-card-ico gs-card-ico-sun" aria-hidden="true">☀️</span>
            )}
            <span className="gs-card-text">
              <b>{summer.who || '我'} 的暑假任務</b>
              <span>
                {ringScope
                  ? (ringScope.done >= ringScope.total
                      ? `${ringScope.label}全部完成，太棒了！🎉`
                      : `${ringScope.label}完成 ${ringScope.done}/${ringScope.total}${summerWeekNo ? ` · 暑假第 ${summerWeekNo} 週` : ''}`)
                  : 'Alan 老師為你安排的暑假練習 · 7/1 – 8/31'}
              </span>
            </span>
            <span className="gs-card-cta gs-card-cta-brand">{ringScope && ringScope.done > 0 && ringScope.done < ringScope.total ? '繼續 →' : '進入 →'}</span>
          </button>
        )}
        {summerOnly ? null : doorMode ? (
          <>
            <button className="gs-card gs-card-room" onClick={() => onSelect(home.id)}>
              <span className="gs-card-ico gs-card-badge">{home.n}</span>
              <span className="gs-card-text">
                <b>進入 {home.n} 教室</b>
                <span>{home.zh} · {summer && summer.mine ? '開學後再從這裡進教室' : '每週跟著學校進度練'}</span>
              </span>
              <span className="gs-card-cta gs-card-cta-brand">進入 →</span>
            </button>
            <button className="gs-switch" onClick={() => setShowAll(true)}>不是{home.zh}了嗎？改選其他年級</button>
          </>
        ) : (
          <>
            <div className="grade-sel-cards">
              {grades.map((g, i) => (
                <button key={g.id} className="grade-sel-card" style={{ '--i': i }} onClick={() => (home && onChangeGrade) ? onChangeGrade(g.id) : onSelect(g.id)}>
                  <span className="grade-sel-badge">{g.n}</span>
                  <span className="grade-sel-card-label">{g.zh}</span>
                </button>
              ))}
            </div>
            <p className="gs-hint">之後隨時可以從右上角的年級標籤切換</p>
          </>
        )}
        {(onViewLanding || onOpenGuide) && (
          <div className="gs-links">
            {onViewLanding && (
              <button className="gs-switch gs-landing-link" onClick={onViewLanding}>查看網站介紹頁</button>
            )}
            {onOpenGuide && !summerOnly && (
              <button className="gs-switch gs-landing-link" onClick={onOpenGuide}>新手教學</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Lock Screen（名單外 / 未授權） ───────── */
function LockScreen({ user, onLogin, onLogout }) {
  return (
    <div className="login-screen">
      <div className="login-card lock-card">
        <div className="lock-icon">🔒</div>
        <h1 className="login-title">需要授權才能使用</h1>
        {user ? (
          <>
            <p className="lock-msg">
              這個帳號（<strong>{user.email}</strong>）目前不在學生名單內。
            </p>
            <p className="lock-sub">
              請確認你用的是<strong>報名時提供的 Google 帳號</strong>。<br/>
              如果還沒報名，歡迎聯絡 Alan 老師！
            </p>
            <button className="google-btn lock-btn" onClick={onLogout}>
              換一個帳號登入
            </button>
          </>
        ) : (
          <>
            <p className="lock-msg">課程內容僅開放給已報名的學生。</p>
            <p className="lock-sub">請使用報名時提供的 Google 帳號登入。</p>
            <button className="google-btn lock-btn" onClick={onLogin}>
              使用 Google 登入
            </button>
          </>
        )}
        <p className="lock-contact">📩 聯絡 Alan 老師：alan07050445@gmail.com</p>
      </div>
    </div>
  );
}

/* ════ StarBurst — ⭐ celebration animation (Web Animations API) ════ */
function StarBurst({ count = 20, onDone }) {
  const containerRef = React.useRef(null);
  const cx = typeof window !== 'undefined' ? window.innerWidth  / 2 : 200;
  const cy = typeof window !== 'undefined' ? window.innerHeight * 0.38 : 150;

  // Generate star data once (random, no memo needed — rendered once then removed)
  const EMOJIS = ['⭐','✨','🌟','💫','⭐','🌟'];
  const stars = React.useRef(
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * 360 + (Math.random() - 0.5) * (360 / count);
      const dist  = 90 + Math.random() * 160;
      const rad   = angle * Math.PI / 180;
      return {
        id:    i,
        tx:    Math.round(Math.cos(rad) * dist),
        ty:    Math.round(Math.sin(rad) * dist),
        sz:    Math.round(14 + Math.random() * 14),
        delay: Math.round(Math.random() * 220),
        dur:   Math.round(700 + Math.random() * 500),
        tr:    Math.round((Math.random() - 0.5) * 240),
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      };
    })
  ).current;

  React.useEffect(() => {
    // Use Web Animations API — reliable across all browsers, no CSS var hack needed
    const els = containerRef.current?.querySelectorAll('.star-burst-particle');
    if (els) {
      stars.forEach((s, i) => {
        const el = els[i];
        if (!el) return;
        el.animate(
          [
            { transform: 'translate(-50%,-50%) scale(1.3) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${s.tx}px), calc(-50% + ${s.ty}px)) scale(0) rotate(${s.tr}deg)`, opacity: 0 },
          ],
          { duration: s.dur, delay: s.delay, easing: 'cubic-bezier(.25,.46,.45,.94)', fill: 'forwards' }
        );
      });
    }
    const t = setTimeout(() => onDone && onDone(), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={containerRef} className="star-burst-container">
      {stars.map(s => (
        <div
          key={s.id}
          className="star-burst-particle"
          style={{ left: cx + 'px', top: cy + 'px', fontSize: s.sz + 'px', opacity: 1 }}
        >{s.emoji}</div>
      ))}
    </div>
  );
}

/* ════ MobileNav — fixed bottom bar (mobile only) ════ */
function MobileNav({ week, weekIdx, weekOrder, onPrevWeek, onNextWeek, catView, onBackFromCat, onShowBadges, user }) {
  const atStart = weekIdx <= 0;
  const atEnd   = weekIdx >= (weekOrder?.length || 1) - 1;
  const inCat   = !!catView;
  const weekLabel = week?.label || (weekOrder?.[weekIdx] || `Week ${weekIdx + 1}`);

  // When inside a category: show Back | cat name | nothing
  // When on main screen: show ← Week | home dot | Week →
  return (
    <nav className="mobile-nav" aria-label="Navigation">
      {inCat ? (
        <>
          <button className="mobile-nav-btn active" onClick={onBackFromCat}>
            <span className="mobile-nav-icon">←</span>
            <span>返回</span>
          </button>
          <div className="mobile-nav-divider"/>
          <button className="mobile-nav-btn" style={{flex:2, fontSize:'10px', color:'var(--ink)', letterSpacing:'0.02em', textTransform:'none', fontFamily:'var(--sans)', fontWeight:700}} disabled>
            <span className="mobile-nav-icon">{catView?.id === 'vocab' ? '📚' : catView?.id === 'grammar' ? '✏️' : catView?.id === 'word' ? '🔤' : '📖'}</span>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{catView?.titleZh || catView?.title || ''}</span>
          </button>
          <div className="mobile-nav-divider"/>
          {user ? (
            <button className="mobile-nav-btn" onClick={onShowBadges}>
              <span className="mobile-nav-icon">🏆</span>
              <span>Badges</span>
            </button>
          ) : <div style={{flex:1}}/>}
        </>
      ) : (
        <>
          <button className="mobile-nav-btn" onClick={onPrevWeek} disabled={atStart}>
            <span className="mobile-nav-icon">←</span>
            <span>Prev</span>
          </button>
          <div className="mobile-nav-divider"/>
          <button className="mobile-nav-btn active" disabled>
            <span className="mobile-nav-icon">📅</span>
            <span>{weekLabel}</span>
          </button>
          <div className="mobile-nav-divider"/>
          <button className="mobile-nav-btn" onClick={onNextWeek} disabled={atEnd}>
            <span className="mobile-nav-icon">→</span>
            <span>Next</span>
          </button>
        </>
      )}
    </nav>
  );
}

/* ════ LoadingScreen — brand logo fade-in overlay ════ */
function LoadingScreen({ fading }) {
  return (
    <div className={`ls-screen${fading ? ' ls-fading' : ''}`} aria-label="Loading">
      {/* Subtle decorative radial glow */}
      <div className="ls-glow"/>
      <div className="ls-brand">
        <svg className="ls-spark ls-spark-1" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
        <svg className="ls-spark ls-spark-2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"/></svg>
        <img src="icon.svg" alt="Alan's English Class" className="ls-logo"/>
        <div className="ls-est">EST · 2026</div>
        <div className="ls-name">Alan<em>'s</em> English Class</div>
        <div className="ls-underline" aria-hidden="true"/>
      </div>
    </div>
  );
}

/* ───────── v252: 海綿寶寶泡泡轉場——純 DOM 直接生成（點擊下一幀就出現，不等 React render）───────── */
function spawnPageWave(ttl) {
  try {
    const B = [
      [4, 120, 0, 1.15, 'A'], [12, 54, .12, 1.0, ''], [18, 88, .05, 1.2, 'b'], [24, 140, .18, 1.3, 'C'],
      [30, 46, .02, .95, ''], [36, 96, .22, 1.15, 'd'], [42, 64, .08, 1.05, 'E'], [48, 150, .15, 1.35, ''],
      [54, 80, .03, 1.1, 'f'], [60, 110, .2, 1.25, 'G'], [66, 50, .1, .95, ''], [72, 132, .06, 1.3, 'h'],
      [78, 70, .25, 1.05, 'I'], [84, 100, .02, 1.2, ''], [90, 58, .16, 1.0, 'j'], [95, 86, .09, 1.15, 'K'],
      [8, 72, .3, 1.05, 'L'], [16, 118, .26, 1.3, ''], [26, 60, .33, 1.0, 'm'], [34, 90, .28, 1.2, 'N'],
      [44, 52, .35, .95, ''], [52, 124, .3, 1.35, 'o'], [62, 76, .27, 1.1, 'P'], [70, 98, .34, 1.25, ''],
      [80, 56, .29, 1.0, 'q'], [88, 136, .32, 1.35, 'R'], [94, 66, .26, 1.05, ''], [2, 94, .31, 1.2, 's'],
      [22, 48, .38, .9, ''], [38, 104, .4, 1.25, 'T'], [58, 62, .42, 1.0, 'u'], [76, 116, .38, 1.3, 'V'],
      [10, 44, .45, .9, ''], [46, 84, .44, 1.15, 'w'], [68, 58, .47, 1.0, 'X'], [86, 92, .42, 1.2, 'y'],
    ];
    const root = document.createElement('div');
    root.className = 'pw';
    root.setAttribute('aria-hidden', 'true');
    const veil = document.createElement('div');
    veil.className = 'pw-veil';
    root.appendChild(veil);
    B.forEach(b => {
      const sp = document.createElement('span');
      sp.className = 'pwb';
      sp.style.left = b[0] + '%';
      sp.style.width = b[1] + 'px';
      sp.style.height = b[1] + 'px';
      sp.style.animationDelay = b[2] + 's';
      sp.style.animationDuration = b[3] + 's';
      sp.style.fontSize = Math.round(b[1] * .42) + 'px';
      if (b[4]) sp.textContent = b[4];
      root.appendChild(sp);
    });
    document.body.appendChild(root);
    setTimeout(() => { try { root.remove(); } catch (e) {} }, ttl || 1900);
    return root;
  } catch (e) { return null; }
}

/* ───────── First-time welcome / onboarding ───────── */
function WelcomeGuide({ onClose }) {
  // v240: 首步改用品牌 logo（AI 插畫已移除），後三步沿用功能 icon
  const steps = [
    { img: 'icon.svg',        kick: '歡迎',      title: '歡迎來到 Alan’s English Class',
      body: '這裡的練習對齊康橋國際學校的每週進度——在家練的，就是學校正在教的。每週打開一次，跟著練就對了。' },
    { img: 'feat-week.png',   kick: '每週練習',   title: '每週一個目標，跟著練',
      body: '最上面是本週進度，點「開始練習」就會帶你到下一個該練的項目；也可以自己從單字、文法、字根字首、閱讀寫作挑一個開始。' },
    { img: 'feat-mark.png',   kick: '本週聯絡簿', title: '老師指定的作業，都在聯絡簿',
      body: '打開「本週聯絡簿」就能看到老師指定的作業、截止日與完成狀態；全部做完會亮起綠色的勾勾。' },
    { img: 'feat-record.png', kick: '家長看這裡', title: '每一週的進步，都看得到',
      body: '點「學習成長」可以看到每週完成率與平均分數的變化；答錯的題目會自動收進錯題本，複習最有效率。' },
  ];
  const [step, setStep] = React.useState({ i: 0, dir: 1 });
  const i = step.i;
  const last = i === steps.length - 1;
  const go = (k) => { if (k !== i) setStep({ i: k, dir: k > i ? 1 : -1 }); };

  const finish = () => { onClose(); };
  const next = () => { if (last) finish(); else go(i + 1); };

  // 預載後面幾步的插畫，切換時不閃白
  React.useEffect(() => {
    steps.forEach(s => { const im = new Image(); im.src = s.img; });
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft' && i > 0) go(i - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [i]);

  const s = steps[i];
  return (
    <div className="wg-overlay">
      <div className="wg-sheet" role="dialog" aria-modal="true" aria-label="新手教學">
        <span className="wg-blob" aria-hidden="true"/>
        <button className="wg-skip" onClick={finish}>略過</button>
        <div className="wg-count">新手教學 · {i + 1} / {steps.length}</div>
        <div className={`wg-stage${step.dir < 0 ? ' wg-rev' : ''}`} key={i}>
          <div className="wg-art"><img src={s.img} alt=""/></div>
          <div className="wg-kick">{s.kick}</div>
          <h2 className="wg-title">{s.title}</h2>
          <p className="wg-body">{s.body}</p>
        </div>
        <div className="wg-dots">
          {steps.map((_, k) => (
            <button key={k} className={`wg-dot${k === i ? ' on' : ''}`} onClick={() => go(k)} aria-label={`第 ${k + 1} 步`}/>
          ))}
        </div>
        <div className="wg-actions">
          {i > 0 && <button className="wg-back" onClick={() => go(i - 1)}>上一步</button>}
          <button className="wg-next" onClick={next}>{last ? '開始學習 →' : '下一步 →'}</button>
        </div>
      </div>
    </div>
  );
}

/* ───────── 實境導覽（spotlight tour）─────────
   小朋友版新手教學，四段式：
   ① tour：聚光燈圈大廳「真的」元素，一句大字，點哪都能下一站
   ② handoff 實際演練：聚光燈圈「真的」按鈕、只有它按得下去——
      點開始練習 → 看左側任務清單（info 站）→ 親手按開始測驗，
      真的測驗開始、導覽悄悄退場。（v224: 範例題移除，直接實戰）
   文字版 WelcomeGuide 只當 fallback（大廳空空時）。 */
function SpotlightTour({ onClose, onEmpty }) {
  const DEFS = [
    { sel: '.tt',           fb: '.wh',        t: '老師派的作業在這裡！', s: '點一條任務就開始，做完會打勾 ✓' },
    { sel: '.qm-blocks',    fb: null,         t: '想自己多練也可以',     s: '單字、文法、字根字首、閱讀寫作，都在這裡' },
    { sel: '.growth-entry', fb: null,         t: '爸媽看這裡',           s: '每一週的進步，都看得到' },
  ];
  // 實際演練：click 站＝只有被圈住的真元素點得動；info 站＝看說明按下一步
  const HDEFS = [
    { sel: '.tt-row:not(.tt-done)', fb: '.qm-block:not(.empty)', mode: 'click',
      t: '換你了！點這裡開始', s: '你的第一次練習，就從這裡開始' },
    { sel: '.qm-unit-list', fb: '.qm-sidebar', mode: 'info',
      t: '這一類的任務都在這裡', s: '由上往下一個一個完成。文法、字根字首、閱讀寫作，也是同樣的做法！' },
    { sel: '.qm-intro .qm-btn.primary', fb: null, mode: 'click',
      t: '就是這裡！', s: '點下去，開始今天的練習 💪' },
  ];
  // ⚠️ 元素一律「用的時候現查」（不能在 render 期間抓一次存起來——
  // .page 以 pageKey remount 時，render 期查到的是即將被拆掉的舊 DOM）
  const getEl = (d) => document.querySelector(d.sel) || (d.fb ? document.querySelector(d.fb) : null);
  const [stops, setStops] = React.useState([]);
  const [i, setI] = React.useState(0);
  const [phase, setPhase] = React.useState('tour'); // tour → handoff
  const [hi, setHi] = React.useState(0);            // handoff 第幾站
  const holeRef = React.useRef(null);
  const bubbleRef = React.useRef(null);
  const posRef = React.useRef(null);     // 聚光燈目前位置（JS lerp，換站時滑過去）
  const scrolledRef = React.useRef(false); // 這一站是否已找到目標並捲進畫面
  const last = i === stops.length - 1;

  const finish = () => onClose();
  const next = () => { if (last) setPhase('handoff'); else setI(i + 1); };
  const nextH = () => { if (hi < HDEFS.length - 1) setHi(hi + 1); else finish(); };

  // mount 後（DOM 已 commit）才決定有哪些站；大廳空空的（極少見）→ 退回文字版
  React.useEffect(() => {
    const found = DEFS.filter(d => getEl(d));
    if (!found.length) { if (onEmpty) onEmpty(); return; }
    setStops(found);
  }, []);

  // 每一幀跟著目標走（捲動、縮放、remount、換站都黏得住）。
  // handoff 的目標可能「等頁面切完才出現」→ 找到的那一幀才捲動置中。
  React.useEffect(() => {
    if (phase !== 'tour' && phase !== 'handoff') return;
    const stop = phase === 'handoff' ? HDEFS[hi] : stops[i];
    if (!stop) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PAD = 10;
    let raf = 0;
    scrolledRef.current = false;
    // handoff 站的目標一直沒出現 → info 站直接跳下一站（例如某版面沒有側欄）；
    // click 站則安靜收尾（例如第一個單元是特殊題型、沒有開始按鈕）——
    // 小朋友已經在正確的頁面上了
    const guard = phase === 'handoff'
      ? setTimeout(() => {
          if (scrolledRef.current) return;
          if (stop.mode === 'info' && hi < HDEFS.length - 1) setHi(hi + 1);
          else finish();
        }, stop.mode === 'info' ? 2500 : 8000)
      : null;
    const tick = () => {
      const hole = holeRef.current, b = bubbleRef.current;
      if (!hole || !b) return;
      const liveEl = getEl(stop);
      if (!liveEl) { raf = requestAnimationFrame(tick); return; }
      const r = liveEl.getBoundingClientRect();
      if (!r.width && !r.height) { raf = requestAnimationFrame(tick); return; }
      if (!scrolledRef.current) {
        scrolledRef.current = true;
        try { liveEl.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } catch(e) {}
      }
      const tgt = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
      let p = posRef.current;
      if (!p || reduce) { p = posRef.current = { ...tgt }; }
      else {
        p.x += (tgt.x - p.x) * 0.22; p.y += (tgt.y - p.y) * 0.22;
        p.w += (tgt.w - p.w) * 0.22; p.h += (tgt.h - p.h) * 0.22;
      }
      hole.style.transform = `translate(${p.x}px, ${p.y}px)`;
      hole.style.width = p.w + 'px';
      hole.style.height = p.h + 'px';
      // 泡泡：目標下方優先，放不下改上方；水平置中並夾在視窗內
      const bw = b.offsetWidth, bh = b.offsetHeight;
      const vw = window.innerWidth, vh = window.innerHeight;
      const below = p.y + p.h + 14 + bh < vh - 12;
      const by = below ? p.y + p.h + 14 : Math.max(12, p.y - bh - 14);
      const bx = Math.min(Math.max(12, p.x + p.w / 2 - bw / 2), vw - bw - 12);
      b.style.transform = `translate(${bx}px, ${by}px)`;
      b.style.opacity = '1';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (guard) clearTimeout(guard); };
  }, [i, stops, phase, hi]);

  // handoff：捕獲層全域過濾——click 站只有被圈住的真元素點得動；
  // info 站只是「看這裡」，連目標本身也不能點（按泡泡的下一步前進）
  React.useEffect(() => {
    if (phase !== 'handoff') return;
    const stop = HDEFS[hi];
    const onDocClick = (e) => {
      const el = stop.mode === 'click' ? getEl(stop) : null;
      if (el && (e.target === el || el.contains(e.target))) {
        // 真的點到了！讓 app 正常處理（進分類頁／開始測驗），我們再前進
        if (hi < HDEFS.length - 1) setTimeout(() => setHi(hi + 1), 60);
        else setTimeout(() => finish(), 350); // 測驗開始的轉場先跑，再悄悄收掉導覽
        return;
      }
      if (e.target.closest && (e.target.closest('.st-bubble') || e.target.closest('.st-skip'))) return;
      e.stopPropagation(); e.preventDefault();
      // 點錯地方 → 泡泡搖一下提示「點亮亮的地方」
      const b = bubbleRef.current;
      if (b && !b.classList.contains('st-deny')) {
        b.classList.add('st-deny');
        setTimeout(() => b.classList.remove('st-deny'), 450);
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [phase, hi]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { finish(); return; }
      if (phase !== 'tour') return; // 換你操作階段不能用鍵盤跳站
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [i, stops, phase]);

  if (!stops.length) return null;
  const s = stops[i];
  const h = HDEFS[hi];
  return (
    <div className={`st-root${phase === 'handoff' ? ' st-mode-handoff' : ''}`} role="dialog" aria-modal="true" aria-label="新手導覽">
      <div className="st-overlay" onClick={phase === 'tour' ? next : undefined}/>
      <div className="st-hole" ref={holeRef} aria-hidden="true">
        {phase === 'handoff' && h.mode === 'click' && <span className="st-point">👆</span>}
      </div>
      <button className="st-skip" onClick={finish}>略過導覽 ✕</button>
      {phase === 'tour' && (
        <div className="st-bubble" ref={bubbleRef} onClick={(e) => e.stopPropagation()}>
          <div className="st-inner" key={i}>
            <span className="st-count">{i + 1} / {stops.length}</span>
            <div className="st-title">{s.t}</div>
            <div className="st-sub">{s.s}</div>
            <button className="st-next" onClick={next}>{last ? '換你操作看看！' : '下一步 →'}</button>
          </div>
        </div>
      )}
      {phase === 'handoff' && (
        <div className="st-bubble" ref={bubbleRef} onClick={(e) => e.stopPropagation()}>
          <div className="st-inner" key={'h' + hi}>
            <span className="st-count">換你操作 · {hi + 1} / {HDEFS.length}</span>
            <div className="st-title">{h.t}</div>
            <div className="st-sub">{h.s}</div>
            {h.mode === 'info' && <button className="st-next" onClick={nextH}>下一步 →</button>}
            <button className="st-later" onClick={finish}>先跳過，我自己來</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Icon, Header, Hero, LoginScreen, LockScreen, EditableText, BadgesModal, BadgeToast, GradeSelector, StarBurst, MobileNav, LoadingScreen, WelcomeGuide, SpotlightTour, spawnPageWave });
