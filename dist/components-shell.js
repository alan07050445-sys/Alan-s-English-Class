function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// components.jsx — Building blocks for Alan's English Class

var {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;

/* ───────── Icons ───────── */
function Icon({
  name,
  size = 16
}) {
  var s = size;
  var stroke = {
    stroke: "currentColor",
    strokeWidth: 1.5,
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    'aria-hidden': 'true',
    focusable: 'false'
  };
  switch (name) {
    case "arrow-right":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M5 12h14M13 5l7 7-7 7"
      }));
    case "arrow-left":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M19 12H5M11 5l-7 7 7 7"
      }));
    case "chevron-down":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M6 9l6 6 6-6"
      }));
    case "check":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M5 12l4 4 10-10"
      }));
    case "plus":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M12 5v14M5 12h14"
      }));
    case "edit":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M16 3l5 5L8 21H3v-5L16 3z"
      }));
    case "trash":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14"
      }));
    case "copy":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("rect", {
        x: "9",
        y: "9",
        width: "12",
        height: "12",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
      }));
    case "external":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M14 4h6v6M20 4L10 14M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5"
      }));
    case "close":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M6 6l12 12M18 6L6 18"
      }));
    case "lock":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("rect", {
        x: "4",
        y: "11",
        width: "16",
        height: "10",
        rx: "1"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M8 11V7a4 4 0 018 0v4"
      }));
    case "play":
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s,
        viewBox: "0 0 24 24",
        fill: "currentColor",
        "aria-hidden": "true",
        focusable: "false"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M8 5v14l11-7L8 5z"
      }));
    case "download":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M12 3v12M7 10l5 5 5-5M5 21h14"
      }));
    case "users":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: "7",
        r: "4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
      }));
    case "list":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: s,
        height: s,
        viewBox: "0 0 24 24"
      }, stroke), /*#__PURE__*/React.createElement("path", {
        d: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"
      }));
    default:
      return null;
  }
}

/* ───────── Header ───────── */
/* v388（Alan：「我想要在用我的網頁的時候可以設定調整成全螢幕，不然上面的網址很礙眼」）
   ⚠ 平台差異很大，所以做成「能全螢幕就全螢幕，不能就教他加到主畫面」：
     · Chrome / Edge / Safari(Mac) / iPadOS Safari 16.4+ → Fullscreen API 可用
     · iPhone Safari 完全不支援元素全螢幕 → 只能靠 PWA（manifest 已經是 standalone）
   已經在主畫面 App 模式下開啟時，本來就沒有網址列 → 這顆鈕直接不顯示。 */
function FullscreenBtn() {
  var [on, setOn] = React.useState(false);
  var [tip, setTip] = React.useState('');
  var el = () => document.documentElement;
  // 有方法還不夠——iframe 內嵌或被政策擋住時 fullscreenEnabled 會是 false
  var can = !!(el().requestFullscreen || el().webkitRequestFullscreen) && document.fullscreenEnabled !== false && document.webkitFullscreenEnabled !== false;
  var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  React.useEffect(() => {
    var sync = () => setOn(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);
  if (standalone) return null; // 已經是 App 模式，沒有網址列可以擋

  var toggle = async () => {
    if (!can) {
      setTip('這台裝置的瀏覽器不支援全螢幕。請用分享選單的「加入主畫面」，開起來就沒有網址列了。');
      setTimeout(() => setTip(''), 6000);
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
      } else {
        await (el().requestFullscreen ? el().requestFullscreen() : el().webkitRequestFullscreen());
        /* ⚠ 有些環境（內嵌瀏覽器、部分平板）requestFullscreen 會「乖乖 resolve 但什麼都沒發生」——
           不補這一段的話，學生按了沒反應也不知道為什麼。實測過就是這種情況。 */
        setTimeout(() => {
          if (!(document.fullscreenElement || document.webkitFullscreenElement)) {
            setTip('這台裝置擋住了全螢幕。請用分享選單的「加入主畫面」，開起來就沒有網址列了。');
            setTimeout(() => setTip(''), 6000);
          }
        }, 400);
      }
    } catch (e) {
      setTip('全螢幕被瀏覽器擋住了。可以改用「加入主畫面」。');
      setTimeout(() => setTip(''), 6000);
    }
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: 'fs-btn' + (on ? ' on' : ''),
    onClick: toggle,
    title: on ? '離開全螢幕' : '全螢幕（把上面的網址列收起來）',
    "aria-label": "\u5168\u87A2\u5E55"
  }, on ? '⛶' : '⛶'), tip && /*#__PURE__*/React.createElement("div", {
    className: "fs-tip"
  }, tip));
}

/* v389（Alan：「上方列的 Alan English Class 暑假那一列也要可以縮起來，
   但我覺得可以用一個全螢幕的 button，只有在做練習的時候可以縮起來」）
   ── 專心模式 ──
   只在「正在做某一個練習」時才掛出來（由 QuizModeCategoryView 決定），
   按下去把整條 header 收起來，把那 72px 讓給題目與圖片。
   順便試一次全螢幕（成功更好，失敗也無所謂——收起上方列本身就有效果）。
   ⚠ 收起／展開不會改變視窗大小，useFitHeight 不會自己重算 →
      一定要補一個 resize 事件，卡片才會用新的可用高度重新量。 */
function FocusBtn() {
  var [on, setOn] = React.useState(false);

  // 離開練習（元件卸載）一定要還原，不然回到清單頁會沒有 header
  React.useEffect(() => () => {
    document.documentElement.classList.remove('focus-on');
    window.dispatchEvent(new Event('resize'));
  }, []);
  var toggle = () => {
    var next = !on;
    setOn(next);
    document.documentElement.classList.toggle('focus-on', next);
    try {
      var el = document.documentElement;
      if (next && !document.fullscreenElement && el.requestFullscreen && document.fullscreenEnabled) {
        el.requestFullscreen().catch(() => {});
      } else if (!next && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {/* 全螢幕失敗不影響收起上方列 */}
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  };
  return /*#__PURE__*/React.createElement("button", {
    className: 'focus-btn' + (on ? ' on' : ''),
    onClick: toggle,
    "aria-pressed": on,
    title: on ? '顯示上方列' : '收起上方列，專心練習',
    "aria-label": "\u5C08\u5FC3\u6A21\u5F0F"
  }, on ? '\u2921' : '\u26F6');
}

/* ══ v446（Alan：「我原本有製作 G3 living in the desert 的一鍵生成，但現在不見了」）══
   單元其實一直都在——在第 1 週，而網站開起來停在「今天這一週」，那一週是空的。
   這支是「用名字找單元」的純比對：整個年級的每一週、每一類都找，同名的併成一列。 */
function findUnitsIn(weekOrder, weeks, q) {
  var key = String(q || '').trim().toLowerCase();
  if (key.length < 2) return [];
  var seen = {},
    out = [];
  (weekOrder || []).forEach(id => {
    var w = (weeks || {})[id];
    if (!w) return;
    Object.keys(w.items || {}).forEach(cat => {
      (w.items[cat] || []).forEach(it => {
        var name = String(it && it.group || it && it.title || '');
        if (!name) return;
        if ((name + ' ' + String(it && it.title || '')).toLowerCase().indexOf(key) < 0) return;
        var k = id + '|' + cat + '|' + name;
        if (seen[k]) {
          seen[k].n++;
          return;
        }
        seen[k] = {
          id,
          cat,
          name,
          n: 1,
          label: w.label || id,
          range: w.dateRange || ''
        };
        out.push(seen[k]);
      });
    });
  });
  return out.slice(0, 12);
}
function Header({
  week,
  weekOrder,
  weekIdx,
  onPrevWeek,
  onNextWeek,
  onShowCheckin,
  checkinDone,
  checkinStreak,
  canEdit,
  editMode,
  onToggleEdit,
  onAsk,
  onAddWeek,
  onCompose,
  onTrash,
  onDeleteWeek,
  onArchiveWeek,
  weekArchived,
  onExport,
  onEditWeek,
  onTermSetup,
  onQuickSet,
  onGrammarGen,
  onReadingGen,
  onGrammarNotes,
  onWordStudy,
  onExamScan,
  onExamDraft,
  pace,
  nextF,
  onPacing,
  onExamPrep,
  progress,
  // Auth props
  user,
  onLogin,
  onLogout,
  onShowDashboard,
  onHome,
  // Mistakes
  mistakesCount,
  onShowMistakes,
  // Grade
  grade,
  onSwitchGrade,
  compactLobby,
  starBalance,
  onShowStars,
  // v342: 集點
  weeks,
  onGoWeek // v446：找單元／跳到有內容的那一週
}) {
  // v442：編輯列的「⋯ 更多」預設收起來（其他老師最常用的是三顆一鍵生成）
  var [moreOpen, setMoreOpen] = React.useState(false);
  /* v489：國慶外觀的開關是寫在 <html> 的 class 上（不是 React state），
     按完 React 不知道要重畫 → 用這個計數器逼它重畫一次按鈕文字。 */
  var [festTick, setFestTick] = React.useState(0);
  /* ══ v446（Alan：「我原本有製作 G3 living in the desert 的一鍵生成，但現在不見了」）══
     東西沒有不見——它在第 1 週，而網站開起來會停在「今天這一週」，那一週剛好是空的。
     所以補兩件事：① 空的一週直接告訴老師最近有內容的是哪一週 ② 用名字搜尋整個年級的單元。 */
  var [findQ, setFindQ] = React.useState('');
  var weekMap = weeks || {};
  var weekItems = React.useCallback(id => {
    var w = weekMap[id];
    return w ? [].concat.apply([], Object.keys(w.items || {}).map(c => (w.items[c] || []).map(it => ({
      it,
      cat: c
    })))) : [];
  }, [weekMap]);
  var curEmpty = !!(canEdit && week && week.id && weekMap[week.id] && weekItems(week.id).length === 0);
  // 最近一個「有內容」的週次（先往回找，沒有再往後找）
  var nearest = React.useMemo(() => {
    if (!curEmpty) return null;
    var ord = weekOrder || [];
    for (var d = 1; d < ord.length; d++) {
      for (var j of [weekIdx - d, weekIdx + d]) {
        if (j < 0 || j >= ord.length) continue;
        if (weekItems(ord[j]).length) return {
          id: ord[j],
          w: weekMap[ord[j]] || {}
        };
      }
    }
    return null;
  }, [curEmpty, weekIdx, weekOrder, weekMap]);
  var findHits = React.useMemo(() => findUnitsIn(weekOrder, weekMap, findQ), [findQ, weekOrder, weekMap]);
  var pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
  var atStart = weekIdx <= 0;
  var atEnd = weekIdx >= (weekOrder?.length || 1) - 1;
  var firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || '';
  return /*#__PURE__*/React.createElement("header", {
    className: 'header' + (editMode && canEdit ? ' edit-mode' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "header-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("span", {
    className: "brand-mono"
  }, "EST \xB7 2026"), onHome ? /*#__PURE__*/React.createElement("button", {
    className: "brand-name brand-home",
    onClick: onHome,
    title: "\u56DE\u9996\u9801",
    "aria-label": "\u56DE\u9996\u9801"
  }, "Alan", /*#__PURE__*/React.createElement("em", null, "'s"), " English Class") : /*#__PURE__*/React.createElement("span", {
    className: "brand-name"
  }, "Alan", /*#__PURE__*/React.createElement("em", null, "'s"), " English Class"), grade && (onSwitchGrade ? /*#__PURE__*/React.createElement("button", {
    className: "grade-chip",
    onClick: onSwitchGrade,
    title: "Switch grade",
    "aria-label": "\u5207\u63DB\u5E74\u7D1A"
  }, window.isSummerTrack && window.isSummerTrack(grade) ? '☀️ 暑假' : grade.toUpperCase()) : /*#__PURE__*/React.createElement("span", {
    className: "grade-chip grade-chip-fixed",
    "aria-label": `年級 ${grade.toUpperCase()}`
  }, window.isSummerTrack && window.isSummerTrack(grade) ? '☀️ 暑假' : grade.toUpperCase()))), /*#__PURE__*/React.createElement("div", {
    className: "week-nav"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onPrevWeek,
    "aria-label": "Previous week",
    disabled: atStart
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    className: "label",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, week.label, editMode && canEdit && /*#__PURE__*/React.createElement("button", {
    onClick: onEditWeek,
    title: "Edit week ID / label / dates",
    style: {
      background: 'none',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '2px 6px',
      cursor: 'pointer',
      fontSize: 10,
      color: 'var(--ink-3)',
      lineHeight: 1.4
    }
  }, "\u270E")), /*#__PURE__*/React.createElement("button", {
    onClick: onNextWeek,
    "aria-label": "Next week",
    disabled: atEnd
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "header-right"
  }, !compactLobby && /*#__PURE__*/React.createElement("div", {
    className: "progress-pill"
  }, /*#__PURE__*/React.createElement("span", null, progress.done, "/", progress.total, " done"), /*#__PURE__*/React.createElement("div", {
    className: "progress-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "progress-fill",
    style: {
      width: pct + "%"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "header-auth"
  }, /*#__PURE__*/React.createElement(FullscreenBtn, null), user && onShowMistakes && mistakesCount > 0 && /*#__PURE__*/React.createElement("button", {
    className: "mistakes-btn",
    onClick: onShowMistakes,
    title: `錯題本 · ${mistakesCount} 題等你複習`,
    "aria-label": "\u932F\u984C\u672C"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCD5"), /*#__PURE__*/React.createElement("span", {
    className: "mistakes-btn-num"
  }, mistakesCount)), user && onShowStars && /*#__PURE__*/React.createElement("button", {
    className: "stars-btn",
    onClick: onShowStars,
    title: "\u6211\u7684\u661F\u661F\u8207\u5546\u5E97",
    "aria-label": `我的星星與商店，目前 ${(starBalance || 0).toLocaleString()} 顆`
  }, /*#__PURE__*/React.createElement("span", {
    className: "stars-btn-ico",
    "aria-hidden": "true"
  }, "\u2B50"), /*#__PURE__*/React.createElement("span", {
    className: "stars-btn-num"
  }, (starBalance || 0).toLocaleString())), user && onShowCheckin && /*#__PURE__*/React.createElement("button", {
    className: 'checkin-btn' + (checkinDone ? ' done' : ''),
    onClick: onShowCheckin,
    title: checkinDone ? '今天已簽到' : '今天還沒簽到！',
    "aria-label": checkinDone ? `今天已簽到，連續 ${checkinStreak} 天` : '今天還沒簽到'
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCC5"), checkinStreak > 0 && /*#__PURE__*/React.createElement("span", {
    className: "checkin-btn-num"
  }, checkinStreak), !checkinDone && /*#__PURE__*/React.createElement("span", {
    className: "checkin-btn-dot",
    "aria-hidden": "true"
  })), canEdit && /*#__PURE__*/React.createElement("button", {
    className: "icon-btn " + (editMode ? "active" : ""),
    onClick: onToggleEdit,
    title: editMode ? "Exit edit mode" : "Teacher edit mode",
    "aria-pressed": !!editMode,
    "aria-label": editMode ? "離開老師編輯模式" : "進入老師編輯模式"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: editMode ? "lock" : "edit",
    size: 14
  })), canEdit && /*#__PURE__*/React.createElement("button", {
    className: "dashboard-btn",
    onClick: onShowDashboard,
    title: "Class Report",
    "aria-label": "\u73ED\u7D1A\u5B78\u7FD2\u5831\u8868"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 13
  }), " ", /*#__PURE__*/React.createElement("span", {
    className: "db-label"
  }, "Report")), user ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "user-chip",
    onClick: onLogout,
    "aria-label": `登出 ${user.email}`
  }, user.photoURL ? /*#__PURE__*/React.createElement("img", {
    src: user.photoURL,
    className: "user-avatar",
    referrerPolicy: "no-referrer",
    alt: ""
  }) : /*#__PURE__*/React.createElement("span", {
    className: "user-initials"
  }, (user.displayName || user.email || '?')[0].toUpperCase()), /*#__PURE__*/React.createElement("span", {
    className: "user-name"
  }, firstName)) : /*#__PURE__*/React.createElement("button", {
    className: "signin-btn",
    onClick: onLogin
  }, "\u767B\u5165"))))), editMode && canEdit &&
  /*#__PURE__*/
  /* ══ v442（Alan：「因為我要給其他老師用了，所以這個 edit 介面做清楚一點——
     主要就是一鍵生成單字／文法／閱讀理解，其他功能比較少用到」）══
     三顆一鍵生成放最上面、各自寫清楚「貼什麼進去、會生出什麼」；
     其餘（學期、新增一週、備份、封存、刪除）收在「⋯ 更多」裡，需要才打開。
     ⚠ 這個檔案裡有兩個 `{editMode && canEdit &&`（另一個在週次標題旁邊）——
       改這一段一定要從檔案後面找，不要用「第一個符合的」。 */
  React.createElement("div", {
    className: "edit-banner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shell edit-banner-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "edit-banner-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "edit-banner-tag"
  }, "\u25CF \u8001\u5E2B\u7DE8\u8F2F\u6A21\u5F0F"), weekArchived && /*#__PURE__*/React.createElement("span", {
    className: "edit-banner-archived"
  }, "\uD83D\uDCE6 \u9019\u4E00\u9031\u5DF2\u5C01\u5B58 \xB7 \u5B78\u751F\u770B\u4E0D\u5230"), /*#__PURE__*/React.createElement("span", {
    className: "edit-banner-gap"
  }), /*#__PURE__*/React.createElement("button", {
    className: "banner-btn",
    onClick: () => setMoreOpen(v => !v)
  }, moreOpen ? '收起其他功能' : '⋯ 更多（學期／備份／封存）'), /*#__PURE__*/React.createElement("button", {
    className: "banner-btn done",
    onClick: onToggleEdit
  }, "\u5B8C\u6210\u7DE8\u8F2F \u2192")), /*#__PURE__*/React.createElement("div", {
    className: "find-unit"
  }, /*#__PURE__*/React.createElement("input", {
    className: "find-unit-in",
    value: findQ,
    onChange: e => setFindQ(e.target.value),
    placeholder: "\uD83D\uDD0D \u627E\u55AE\u5143\uFF08\u6253\u540D\u5B57\u5C31\u597D\uFF0C\u4F8B\uFF1Adesert\uFF09"
  }), findQ.trim().length >= 2 && /*#__PURE__*/React.createElement("div", {
    className: "find-unit-res"
  }, findHits.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "find-unit-none"
  }, "\u9019\u500B\u5E74\u7D1A\u627E\u4E0D\u5230\u300C", findQ.trim(), "\u300D\u2014\u2014\u53EF\u80FD\u5728\u5225\u7684\u5E74\u7D1A\uFF08\u53F3\u4E0A\u89D2\u5207\u63DB\uFF09") : findHits.map((h, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "find-unit-row",
    onClick: () => {
      setFindQ('');
      if (onGoWeek) onGoWeek(h.id, h.cat);
    }
  }, /*#__PURE__*/React.createElement("b", null, h.name), /*#__PURE__*/React.createElement("span", null, h.label, h.range ? '（' + h.range + '）' : '', " \xB7 ", h.n, " \u500B\u55AE\u5143"))))), pace && (() => {
    /* v503：跟後台的上課紀錄用同一套顯示規則——
       拿掉 U1W5／Skill 1 這種編號前綴，頁數一律帶書名（書名來自 Excel 欄位標題）。
       ⚠ 兩邊顯示規則要一致，不然同一件事在兩個畫面長不一樣。 */
    var C = window.pacingClean || (x => x);
    var B = window.pacingBooks || (() => []);
    var books = side => B(side).map((x, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "sw-bk"
    }, /*#__PURE__*/React.createElement("em", null, x.book), x.pages));
    return /*#__PURE__*/React.createElement("div", {
      className: "sw-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "sw-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sw-tag it"
    }, "\u5916\u5E2B"), /*#__PURE__*/React.createElement("b", {
      className: "sw-main"
    }, pace.it.reading || '—'), pace.it.vocab && /*#__PURE__*/React.createElement("span", {
      className: "sw-part"
    }, pace.it.vocab), pace.it.wordStudy && /*#__PURE__*/React.createElement("span", {
      className: "sw-chip"
    }, C(pace.it.wordStudy)), pace.it.skill && /*#__PURE__*/React.createElement("span", {
      className: "sw-dim"
    }, C(pace.it.skill)), B(pace.it).length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "sw-hw"
    }, "\uD83D\uDCD5 ", books(pace.it))), /*#__PURE__*/React.createElement("div", {
      className: "sw-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sw-tag lt"
    }, "\u4E2D\u5E2B"), /*#__PURE__*/React.createElement("b", {
      className: "sw-main"
    }, C(pace.lt.grammar) || '—'), pace.lt._carry && pace.lt.grammarHw && /*#__PURE__*/React.createElement("span", {
      className: "sw-chip carry"
    }, "\u21A9 \u4F5C\u696D\u662F ", C(pace.lt.grammarHw)), pace.lt.grammarBold && /*#__PURE__*/React.createElement("span", {
      className: "sw-bold"
    }, "\u270F\uFE0F \u53EA\u6559 pp. ", pace.lt.grammarBold.join(', ')), B(pace.lt).length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "sw-hw"
    }, "\uD83D\uDCD5 ", books(pace.lt))), (pace.note || nextF) && /*#__PURE__*/React.createElement("div", {
      className: "sw-row sw-foot"
    }, nextF && nextF.it && /*#__PURE__*/React.createElement("button", {
      className: 'sw-f' + (nextF.it.in <= 1 ? ' near' : '') + (onExamPrep ? ' go' : ''),
      onClick: onExamPrep ? () => onExamPrep('it') : null,
      disabled: !onExamPrep,
      title: onExamPrep ? '把這次考試範圍的單字撈出來，一鍵出複習題' : ''
    }, "\uD83E\uDDEA \u5916\u5E2B ", nextF.it.name, "\uFF1A", nextF.it.in === 0 ? '就是這週' : `還有 ${nextF.it.in} 週`, onExamPrep && /*#__PURE__*/React.createElement("i", null, "\u3000\uD83D\uDCDD \u51FA\u8907\u7FD2")), nextF && nextF.lt && /*#__PURE__*/React.createElement("button", {
      className: 'sw-f' + (nextF.lt.in <= 1 ? ' near' : '') + (onExamPrep ? ' go' : ''),
      onClick: onExamPrep ? () => onExamPrep('lt') : null,
      disabled: !onExamPrep,
      title: onExamPrep ? '把這次考試範圍的單字撈出來，一鍵出複習題' : ''
    }, "\uD83E\uDDEA \u4E2D\u5E2B ", nextF.lt.name, "\uFF1A", nextF.lt.in === 0 ? '就是這週' : `還有 ${nextF.lt.in} 週`, onExamPrep && /*#__PURE__*/React.createElement("i", null, "\u3000\uD83D\uDCDD \u51FA\u8907\u7FD2")), pace.note && /*#__PURE__*/React.createElement("span", {
      className: "sw-note"
    }, "\uD83D\uDCC5 ", pace.note)));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "edit-make"
  }, onQuickSet && /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn quick",
    onClick: onQuickSet
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\uD83D\uDD24"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u4E00\u9375\u51FA\u55AE\u5B57"), /*#__PURE__*/React.createElement("em", null, "\u8CBC\u55AE\u5B57\u8868 \u2192 \u55AE\u5B57\u5361\u30FB\u6E2C\u9A57\u30FB\u914D\u5C0D\u30FB\u586B\u7A7A\u30FB\u807D\u5BEB"))), onGrammarNotes && /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn gn",
    onClick: onGrammarNotes
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u4E00\u9375\u51FA\u6587\u6CD5"), /*#__PURE__*/React.createElement("em", null, "\u4E0A\u50B3\u4F5C\u696D\u7167\u7247\uFF0F\u8CBC\u6587\u5B57 \u2192 \u4E92\u52D5\u6559\u5B78\u30FB\u9078\u64C7\u30FB\u586B\u7A7A\u30FB\u4E2D\u7FFB\u82F1"))), onAsk && /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn ask",
    onClick: onAsk
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\uD83D\uDCAC"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u7528\u8B1B\u7684\u5C31\u597D"), /*#__PURE__*/React.createElement("em", null, "\u8AAA\u4E00\u53E5\u8A71\u6216\u4E1F\u622A\u5716 \u2192 \u5B83\u5E6B\u4F60\u6253\u958B\u5C0D\u7684\u5DE5\u5177\u3001\u586B\u597D"))), onExamScan && /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn exs",
    onClick: onExamScan
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\uD83D\uDCF8"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u62CD\u8003\u5377"), /*#__PURE__*/React.createElement("em", null, "\u62CD\u5B78\u6821\u7684 Formative \u2192 \u4E00\u4EFD\u6709\u914D\u5206\u7684\u4E92\u52D5\u8003\u5377"))), onExamDraft && /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn exs",
    onClick: onExamDraft
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\uD83D\uDDE3"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u8DDF AI \u51FA\u5927\u8003\u8003\u5377"), /*#__PURE__*/React.createElement("em", null, "\u8AAA\u9019\u6B21\u8003\u4EC0\u9EBC \u2192 AI \u64EC\u8349\u7A3F \u2192 \u4F60\u8AAA\u54EA\u88E1\u8981\u6539 \u2192 \u6709\u914D\u5206\u7684\u8003\u5377"))), onWordStudy && /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn ws",
    onClick: onWordStudy
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\uD83D\uDCD8"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u4E00\u9375\u51FA Word Study"), /*#__PURE__*/React.createElement("em", null, "\u6253\u4E0A\u9019\u6B21\u7684\u898F\u5247 \u2192 \u5708\u51FA\u4F86\u30FB\u5206\u4E00\u5206\u30FB\u9078\u64C7\u30FB\u77ED\u6587\u627E\u5B57"))), onReadingGen && /*#__PURE__*/React.createElement("button", {
    className: "edit-make-btn rc",
    onClick: onReadingGen
  }, /*#__PURE__*/React.createElement("span", {
    className: "emk-ico"
  }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("span", {
    className: "emk-txt"
  }, /*#__PURE__*/React.createElement("b", null, "\u4E00\u9375\u51FA\u95B1\u8B80\u7406\u89E3"), /*#__PURE__*/React.createElement("em", null, "\u8CBC\u6587\u7AE0 \u2192 \u80CC\u666F\u77E5\u8B58\u30FB\u9078\u64C7\u30FB\u7C21\u7B54\u30FB\u95B1\u8B80\u6280\u5DE7")))), moreOpen && /*#__PURE__*/React.createElement("div", {
    className: "edit-banner-tools"
  }, onGrammarGen && /*#__PURE__*/React.createElement("button", {
    className: "banner-btn gr",
    onClick: onGrammarGen
  }, "\u2728 \u51FA\u6642\u614B\u984C\u76EE"), onTermSetup && /*#__PURE__*/React.createElement("button", {
    className: "banner-btn term",
    onClick: onTermSetup
  }, "\uD83D\uDCC5 \u5EFA\u7ACB\u4E00\u6574\u500B\u5B78\u671F"), /*#__PURE__*/React.createElement("button", {
    className: "banner-btn",
    onClick: onAddWeek
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 12
  }), " \u65B0\u589E\u4E00\u9031"), onCompose && /*#__PURE__*/React.createElement("button", {
    className: "banner-btn",
    onClick: onCompose
  }, "\uD83D\uDCDA \u7D44\u5408\u8907\u7FD2\uFF0F\u6A21\u64EC\u8003"), onTrash && /*#__PURE__*/React.createElement("button", {
    className: "banner-btn",
    onClick: onTrash
  }, "\uD83D\uDDD1 \u5783\u573E\u6876\uFF08\u6551\u56DE\u522A\u6389\u7684\uFF09"), onExport && /*#__PURE__*/React.createElement("button", {
    className: "banner-btn",
    onClick: onExport
  }, "\uD83D\uDCBE \u532F\u51FA\u5099\u4EFD"), onArchiveWeek && /*#__PURE__*/React.createElement("button", {
    className: "banner-btn arch",
    onClick: onArchiveWeek
  }, weekArchived ? '↩ 取消封存' : '📦 封存這一週'), window.festOn && (window.festOn() || window.festOverride && window.festOverride() !== 'auto') && (() => {
    var f = window.festNow && window.festNow();
    var season = f || (window.FESTS || []).find(x => {
      var d = new Date();
      var md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      return md >= x.from && md <= x.to;
    }) || (window.FESTS || [])[(window.FESTS || []).length - 1] || {
      emoji: '🎊',
      zh: '節慶外觀'
    };
    return /*#__PURE__*/React.createElement("button", {
      className: "banner-btn fest",
      onClick: () => {
        window.festSetOverride(f ? 'off' : 'on');
        setFestTick(t => t + 1);
      }
    }, season.emoji, " ", season.zh, "\uFF1A", f ? '開（按一下關掉）' : '關（按一下打開）');
  })(), onPacing && /*#__PURE__*/React.createElement("button", {
    className: "banner-btn pace",
    onClick: onPacing
  }, "\uD83C\uDFEB ", pace ? '學校進度表' : '匯入學校進度表'), /*#__PURE__*/React.createElement("button", {
    className: "banner-btn danger",
    onClick: onDeleteWeek
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash",
    size: 12
  }), " \u522A\u9664\u9019\u4E00\u9031")))), curEmpty && nearest && /*#__PURE__*/React.createElement("div", {
    className: "week-empty-bar"
  }, /*#__PURE__*/React.createElement("span", null, "\u9019\u4E00\u9031\uFF08", week.label, "\uFF09\u9084\u6C92\u6709\u5167\u5BB9\u3002"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onGoWeek && onGoWeek(nearest.id)
  }, "\u6700\u8FD1\u6709\u5167\u5BB9\u7684\u662F ", nearest.w.label || nearest.id, nearest.w.dateRange ? `（${nearest.w.dateRange}）` : '', " \u2192")));
}

/* ───────── Login Screen ───────── */
// v392: 舊版 8 段行銷長頁 LoginScreenLegacy 已整段刪除（連同它專用、刪後再無呼叫點的
//       TeacherOverlay／PrivacyOverlay）。原因：v296 起就改用下方 window.LoginScreen
//       （單頁卡片扇形封面），legacy 從此沒有任何呼叫點，卻仍佔整支檔案 56%（約 62KB）——
//       在這個沒有 build step、靠瀏覽器端 Babel 即時轉譯的專案裡，等於每次載入都白白
//       多轉譯 62KB，而且它內部還帶著每幀改寫捲動容器 backgroundColor 的捲動處理器、
//       滑鼠光暈 rAF 與 HUD。要找回舊版：git show legacy-landing-v391:components-shell.jsx
//       （styles-auth.css 的 .ll-* / .login-landing / .lldm-* 規則這次刻意保留，CSS 另外處理，
//         這樣萬一要回退只需要回退 JSX。）
/* ───────── Hero ───────── */
function EditableText({
  value,
  placeholder,
  onChange,
  className,
  multiline,
  editMode
}) {
  // View mode  -> plain <span>
  // Edit mode  -> a real React-controlled <input> / <textarea> (no contentEditable).
  //               Standard form-field UX, no browser quirks, no duplication.
  var [draft, setDraft] = React.useState(value || "");
  React.useEffect(() => {
    setDraft(value || "");
  }, [value, editMode]);
  var taRef = React.useRef(null);
  React.useEffect(() => {
    if (!multiline || !taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = taRef.current.scrollHeight + "px";
  }, [draft, editMode, multiline]);
  if (!editMode) {
    return /*#__PURE__*/React.createElement("span", {
      className: className
    }, value);
  }
  var commit = () => {
    var next = (draft || "").trim();
    if (next !== (value || "")) onChange(next);
  };
  var shared = {
    className: (className || "") + " editable-input",
    value: draft,
    placeholder,
    spellCheck: false,
    onChange: e => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: e => {
      if (!multiline && e.key === "Enter") {
        e.preventDefault();
        e.currentTarget.blur();
      }
      if (e.key === "Escape") {
        setDraft(value || "");
        e.currentTarget.blur();
      }
    }
  };
  return multiline ? /*#__PURE__*/React.createElement("textarea", _extends({
    ref: taRef,
    rows: 1
  }, shared)) : /*#__PURE__*/React.createElement("input", _extends({
    type: "text"
  }, shared));
}
function Hero({
  week,
  totalItems,
  totalDone,
  editMode,
  onUpdateWeek
}) {
  var pct = totalItems > 0 ? Math.round(totalDone / totalItems * 100) : 0;
  return /*#__PURE__*/React.createElement("section", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "This Week \xB7 \u672C\u9031\u9032\u5EA6"), /*#__PURE__*/React.createElement(EditableText, {
    value: week.dateRange || "",
    placeholder: "May 17 \u2013 May 23",
    editMode: editMode,
    className: "mono",
    onChange: v => onUpdateWeek({
      dateRange: v
    })
  })), /*#__PURE__*/React.createElement("h1", {
    className: "hero-title"
  }, /*#__PURE__*/React.createElement(EditableText, {
    value: week.theme || "",
    placeholder: "Week theme\u2026",
    editMode: editMode,
    onChange: v => onUpdateWeek({
      theme: v
    })
  }), !editMode && /*#__PURE__*/React.createElement("em", null)), /*#__PURE__*/React.createElement("p", {
    className: "hero-sub"
  }, /*#__PURE__*/React.createElement(EditableText, {
    value: week.subtitle || "",
    placeholder: "English subtitle\u2026",
    editMode: editMode,
    multiline: true,
    onChange: v => onUpdateWeek({
      subtitle: v
    })
  }), /*#__PURE__*/React.createElement("span", {
    className: "zh"
  }, /*#__PURE__*/React.createElement(EditableText, {
    value: week.subtitleZh || "",
    placeholder: "\u4E2D\u6587\u526F\u6A19\u2026",
    editMode: editMode,
    multiline: true,
    onChange: v => onUpdateWeek({
      subtitleZh: v
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "stat-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stat-label"
  }, "Week"), /*#__PURE__*/React.createElement("span", {
    className: "stat-value serif"
  }, (week.label || "—").replace("Week ", ""), /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "/ 2026"))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stat-label"
  }, "Items"), /*#__PURE__*/React.createElement("span", {
    className: "stat-value serif"
  }, totalItems)), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stat-label"
  }, "Completed"), /*#__PURE__*/React.createElement("span", {
    className: "stat-value serif"
  }, totalDone, /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "/ ", totalItems))), /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stat-label"
  }, "Progress"), /*#__PURE__*/React.createElement("span", {
    className: "stat-value serif"
  }, pct, /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "%"))))));
}

/* ───────── Grade Selector ───────── */
/* ══ 🛟 v502 不要整頁白掉 ═══════════════════════════════════════════════
   Alan：「匯入進去直接跑出這個 bug」——畫面整片空白，只剩左上角一點殘影。
   React 預設行為就是這樣：render 裡丟出例外 → **整棵樹卸載**＝全白，
   使用者什麼線索都沒有，只能截一張白畫面給我。

   ⭐ 這一層讓它改成：壞掉的那一塊顯示「哪裡壞了＋錯誤訊息＋怎麼繼續」，
     其他地方照常能用。錯誤訊息直接印在畫面上，Alan 截圖就等於把 console 給我了。 */
class Boom extends React.Component {
  constructor(p) {
    super(p);
    this.state = {
      err: null
    };
  }
  static getDerivedStateFromError(err) {
    return {
      err
    };
  }
  componentDidCatch(err, info) {
    try {
      console.error('[Boom]', this.props.where || '', err, info && info.componentStack);
    } catch (e) {}
  }
  render() {
    if (!this.state.err) return this.props.children;
    var msg = String(this.state.err && this.state.err.message || this.state.err);
    return /*#__PURE__*/React.createElement("div", {
      className: "boom"
    }, /*#__PURE__*/React.createElement("b", null, "\u26A0\uFE0F \u9019\u4E00\u584A\u58DE\u6389\u4E86", this.props.where ? `（${this.props.where}）` : ''), /*#__PURE__*/React.createElement("code", null, msg), /*#__PURE__*/React.createElement("span", null, "\u5176\u4ED6\u529F\u80FD\u9084\u80FD\u7528\u3002", /*#__PURE__*/React.createElement("b", null, "\u628A\u9019\u6BB5\u6587\u5B57\u622A\u5716\u7D66 Claude"), " \u5C31\u80FD\u76F4\u63A5\u4FEE\u3002"), /*#__PURE__*/React.createElement("button", {
      onClick: () => this.setState({
        err: null
      })
    }, "\u518D\u8A66\u4E00\u6B21"));
  }
}
function GradeSelector({
  onSelect,
  summer,
  homeGrade,
  who,
  onChangeGrade,
  onViewLanding,
  onOpenGuide,
  onLogout,
  summerOnly,
  onOpenAdmin,
  lockedGrade
}) {
  var grades = [{
    id: 'g1',
    n: 'G1',
    zh: '一年級'
  }, {
    id: 'g2',
    n: 'G2',
    zh: '二年級'
  }, {
    id: 'g3',
    n: 'G3',
    zh: '三年級'
  }, {
    id: 'g4',
    n: 'G4',
    zh: '四年級'
  }, {
    id: 'g5',
    n: 'G5',
    zh: '五年級'
  }, {
    id: 'g6',
    n: 'G6',
    zh: '六年級'
  }];
  var home = grades.find(g => g.id === homeGrade) || null;
  var [stashOpen, setStashOpen] = React.useState(false); // v402: 其他題庫抽屜（預設收起來）
  /* v399：lockedGrade ＝ 這個人的年級是學號算出來的，不給改。
     鎖定時 showAll 永遠是 false，「改選其他年級」那顆也不會出現。 */
  var [showAll, setShowAll] = React.useState(!home); // 有專屬年級 → 門口模式；否則完整選單
  var doorMode = home && (lockedGrade || !showAll);

  // v257: 時段問候＋今天日期＋暑假第幾週
  var hourNow = new Date().getHours();
  var greet = hourNow < 5 ? '晚安' : hourNow < 11 ? '早安' : hourNow < 18 ? '午安' : '晚安';
  var dateLine = new Date().toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  var sfxNow = window.summerCurrentSuffix ? window.summerCurrentSuffix() : null;
  var summerWeekNo = sfxNow ? parseInt(sfxNow.slice(2), 10) : null;

  // v257: 老師卡即時資訊——今天已有幾位學生練習過（只有老師會掛這個訂閱）
  // v268: 加上「⏳ N 份作業待批改」——開門就知道今天要不要改作業
  var [todayActive, setTodayActive] = React.useState(null);
  var [pendingGrade, setPendingGrade] = React.useState(0);
  React.useEffect(() => {
    if (!onOpenAdmin || !window.subscribeAllStudents) return;
    var t0 = new Date();
    t0.setHours(0, 0, 0, 0);
    try {
      return window.subscribeAllStudents(all => {
        setTodayActive(all.filter(s => (s.updatedAt || 0) >= t0.getTime()).length);
        var pg = 0;
        all.forEach(s => Object.values(s.items || {}).forEach(p => {
          if (p && p.files && p.files.length && p.score == null) pg++;
        }));
        setPendingGrade(pg);
      });
    } catch (e) {}
  }, []);

  // v257: 暑假卡進度環——優先顯示本週任務，本週沒派任務就看整個暑假
  var prog = summer && summer.prog;
  var ringScope = prog && prog.wkTotal > 0 ? {
    done: prog.wkDone,
    total: prog.wkTotal,
    label: '本週任務'
  } : prog && prog.allTotal > 0 ? {
    done: prog.allDone,
    total: prog.allTotal,
    label: '暑假任務'
  } : null;
  var ringPct = ringScope ? ringScope.done / ringScope.total : 0;
  var RING_C = 2 * Math.PI * 17;

  // 游標暖光：緩慢漂向滑鼠位置（僅滑鼠裝置、尊重 reduced-motion）
  React.useEffect(() => {
    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    var root = document.querySelector('.grade-selector');
    if (!root) return;
    var tx = 50,
      ty = 40,
      cx = 50,
      cy = 40,
      raf = 0;
    var tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      root.style.setProperty('--gsx', cx.toFixed(2) + '%');
      root.style.setProperty('--gsy', cy.toFixed(2) + '%');
      raf = Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    var onMove = e => {
      tx = e.clientX / window.innerWidth * 100;
      ty = e.clientY / window.innerHeight * 100;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    root.addEventListener('mousemove', onMove);
    return () => {
      root.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* v402：收進抽屜的卡片。維持原本的顯示條件，只是改成先收集起來再一起畫。 */
  var stashCards = [];
  var stashNames = [];
  if (summer && summer.lib) {
    stashNames.push('暑假題庫');
    stashCards.push(/*#__PURE__*/React.createElement("button", {
      key: "lib",
      className: "gs-card gs-card-lib",
      onClick: () => onSelect(window.SUMMER_LIB || 'sl')
    }, /*#__PURE__*/React.createElement("span", {
      className: "gs-card-ico gs-card-ico-lib",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 24 24",
      width: "22",
      height: "22",
      stroke: "currentColor",
      strokeWidth: "1.6",
      fill: "none",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13H6.5A2.5 2.5 0 004 19.5z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M4 19.5A2.5 2.5 0 006.5 22H20v-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 8.5h7M9 12h4.5"
    }))), /*#__PURE__*/React.createElement("span", {
      className: "gs-card-text"
    }, /*#__PURE__*/React.createElement("b", null, "\u6691\u5047\u984C\u5EAB"), /*#__PURE__*/React.createElement("span", null, "\u8001\u5E2B\u5C08\u7528 \xB7 \u51FA\u984C\u5F8C\u5230\u5F8C\u53F0\u767C\u6D3E\u7D66\u5B78\u751F")), /*#__PURE__*/React.createElement("span", {
      className: "gs-card-cta"
    }, "\u9032\u5165 \u2192")));
  }
  if (!summerOnly && onOpenAdmin) {
    stashNames.push('五大時態');
    stashCards.push(/*#__PURE__*/React.createElement("button", {
      key: "gr",
      className: "gs-card gs-card-gr",
      onClick: () => onSelect(window.GRAMMAR_TRACK || 'gr')
    }, /*#__PURE__*/React.createElement("span", {
      className: "gs-card-ico gs-card-ico-gr",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 24 24",
      width: "22",
      height: "22",
      stroke: "currentColor",
      strokeWidth: "1.6",
      fill: "none",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M12 3v18"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 7h14"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M7 12h10"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 17h6"
    }))), /*#__PURE__*/React.createElement("span", {
      className: "gs-card-text"
    }, /*#__PURE__*/React.createElement("b", null, "\u4E94\u5927\u6642\u614B \xB7 \u6838\u5FC3\u984C\u5EAB"), /*#__PURE__*/React.createElement("span", null, "\u73FE\u5728\uFF0F\u904E\u53BB\uFF0F\u672A\u4F86\uFF0F\u9032\u884C\uFF0F\u5B8C\u6210 \u2014 \u7DF4\u5230\u719F\u70BA\u6B62\uFF0C\u4E0D\u96A8\u9031\u6B21\u66F4\u63DB")), /*#__PURE__*/React.createElement("span", {
      className: "gs-card-cta"
    }, "\u9032\u5165 \u2192")));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "grade-selector"
  }, window.festOn && window.festOn() && /*#__PURE__*/React.createElement("div", {
    className: "fest-ribbon",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("div", {
    className: "gs-decor",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gs-blob gs-blob-a"
  }), /*#__PURE__*/React.createElement("span", {
    className: "gs-blob gs-blob-b"
  }), /*#__PURE__*/React.createElement("svg", {
    className: "gs-spark gs-spark-1",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
  })), /*#__PURE__*/React.createElement("svg", {
    className: "gs-spark gs-spark-2",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
  })), /*#__PURE__*/React.createElement("span", {
    className: "deep-lite dl-a"
  }, "Aa"), /*#__PURE__*/React.createElement("span", {
    className: "deep-lite dl-b"
  }, "read"), /*#__PURE__*/React.createElement("span", {
    className: "deep-lite dl-c"
  }, "\u2713")), /*#__PURE__*/React.createElement("div", {
    className: "grade-selector-inner"
  }, /*#__PURE__*/React.createElement("img", {
    src: "icon.svg",
    alt: "Alan's English Class",
    className: "grade-sel-logo-img"
  }), /*#__PURE__*/React.createElement("div", {
    className: "gs-kicker"
  }, "Alan\u2019s English Class"), /*#__PURE__*/React.createElement("h1", {
    className: "grade-sel-title"
  }, doorMode ? who ? `${greet}，${who}！` : `${greet}！` : '現在讀幾年級呢？'), /*#__PURE__*/React.createElement("p", {
    className: "grade-sel-sub"
  }, doorMode
  /* v489：國慶期間問候語換成節慶版（10/10 當天講「今天」，前後幾天講「快樂」）。
     ⚠ 這個標籤跟主題外觀綁同一個判斷（window.festOn），
       不要另外再寫一份日期判斷——兩份一定會走鐘。 */ ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "gs-date"
  }, dateLine), /*#__PURE__*/React.createElement("span", {
    className: "gs-date-dot"
  }, "\xB7"), "\u4ECA\u5929\u8981\u5F9E\u54EA\u88E1\u958B\u59CB\u5462\uFF1F") : '選好就直接帶你進入這一週的練習。'), window.festOn && window.festOn() && /*#__PURE__*/React.createElement("div", {
    className: "fest-day-wrap"
  }, /*#__PURE__*/React.createElement(FestCountdown, {
    big: true
  })), onOpenAdmin && /*#__PURE__*/React.createElement("button", {
    className: "gs-card gs-card-admin",
    onClick: onOpenAdmin
  }, /*#__PURE__*/React.createElement("span", {
    className: "gs-card-ico",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "22",
    height: "22",
    stroke: "currentColor",
    strokeWidth: "1.6",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7.5",
    height: "7.5",
    rx: "1.8"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "3",
    width: "7.5",
    height: "7.5",
    rx: "1.8"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "13.5",
    width: "7.5",
    height: "7.5",
    rx: "1.8"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "13.5",
    width: "7.5",
    height: "7.5",
    rx: "1.8"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "gs-card-text"
  }, /*#__PURE__*/React.createElement("b", null, "\u8001\u5E2B\u5F8C\u53F0"), /*#__PURE__*/React.createElement("span", null, todayActive != null ? `今天已有 ${todayActive} 位學生練習過` : '總覽 · 學生 · 發派 · 報告', pendingGrade > 0 && /*#__PURE__*/React.createElement("em", {
    className: "gs-admin-pending"
  }, " \xB7 \u23F3 ", pendingGrade, " \u4EFD\u4F5C\u696D\u5F85\u6279\u6539"))), /*#__PURE__*/React.createElement("span", {
    className: "gs-card-cta"
  }, "\u9032\u5165 \u2192")), summer && summer.mine && /*#__PURE__*/React.createElement("button", {
    className: "gs-card gs-card-summer",
    onClick: () => onSelect(window.SUMMER_ME || 'sme')
  }, ringScope ? /*#__PURE__*/React.createElement("span", {
    className: "gs-card-ico gs-ring",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 44 44"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "gs-ring-track",
    cx: "22",
    cy: "22",
    r: "17"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "gs-ring-fill",
    cx: "22",
    cy: "22",
    r: "17",
    strokeDasharray: RING_C,
    strokeDashoffset: RING_C * (1 - ringPct)
  })), /*#__PURE__*/React.createElement("em", null, ringScope.done, "/", ringScope.total)) : /*#__PURE__*/React.createElement("span", {
    className: "gs-card-ico gs-card-ico-sun",
    "aria-hidden": "true"
  }, "\u2600\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "gs-card-text"
  }, /*#__PURE__*/React.createElement("b", null, summer.who || '我', " \u7684\u6691\u5047\u4EFB\u52D9"), /*#__PURE__*/React.createElement("span", null, ringScope ? ringScope.done >= ringScope.total ? `${ringScope.label}全部完成，太棒了！🎉` : `${ringScope.label}完成 ${ringScope.done}/${ringScope.total}${summerWeekNo ? ` · 暑假第 ${summerWeekNo} 週` : ''}` : 'Alan 老師為你安排的暑假練習 · 7/1 – 8/31')), /*#__PURE__*/React.createElement("span", {
    className: "gs-card-cta gs-card-cta-brand"
  }, ringScope && ringScope.done > 0 && ringScope.done < ringScope.total ? '繼續 →' : '進入 →')), summerOnly ? null : doorMode ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "gs-card gs-card-room",
    onClick: () => onSelect(home.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "gs-card-ico gs-card-badge"
  }, home.n), /*#__PURE__*/React.createElement("span", {
    className: "gs-card-text"
  }, /*#__PURE__*/React.createElement("b", null, "\u9032\u5165 ", home.n, " \u6559\u5BA4"), /*#__PURE__*/React.createElement("span", null, home.zh, " \xB7 ", summer && summer.mine ? '開學後再從這裡進教室' : '每週跟著學校進度練')), /*#__PURE__*/React.createElement("span", {
    className: "gs-card-cta gs-card-cta-brand"
  }, "\u9032\u5165 \u2192")), !lockedGrade && /*#__PURE__*/React.createElement("button", {
    className: "gs-switch",
    onClick: () => setShowAll(true)
  }, "\u4E0D\u662F", home.zh, "\u4E86\u55CE\uFF1F\u6539\u9078\u5176\u4ED6\u5E74\u7D1A")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "grade-sel-cards"
  }, grades.map((g, i) => /*#__PURE__*/React.createElement("button", {
    key: g.id,
    className: "grade-sel-card",
    style: {
      '--i': i
    },
    onClick: () => home && onChangeGrade ? onChangeGrade(g.id) : onSelect(g.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "grade-sel-badge"
  }, g.n), /*#__PURE__*/React.createElement("span", {
    className: "grade-sel-card-label"
  }, g.zh)))), /*#__PURE__*/React.createElement("p", {
    className: "gs-hint"
  }, "\u4E4B\u5F8C\u96A8\u6642\u53EF\u4EE5\u5F9E\u53F3\u4E0A\u89D2\u7684\u5E74\u7D1A\u6A19\u7C64\u5207\u63DB")), stashCards.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: 'gs-stash' + (stashOpen ? ' open' : '')
  }, /*#__PURE__*/React.createElement("button", {
    className: "gs-stash-bar",
    onClick: () => setStashOpen(o => !o),
    "aria-expanded": stashOpen
  }, /*#__PURE__*/React.createElement("span", {
    className: "gs-stash-ico",
    "aria-hidden": "true"
  }, "\uD83D\uDDC4"), /*#__PURE__*/React.createElement("span", {
    className: "gs-stash-lbl"
  }, "\u5176\u4ED6\u984C\u5EAB", /*#__PURE__*/React.createElement("em", null, stashNames.join(' · '))), /*#__PURE__*/React.createElement("span", {
    className: "gs-stash-caret",
    "aria-hidden": "true"
  }, stashOpen ? '收起 ▴' : '展開 ▾')), stashOpen && /*#__PURE__*/React.createElement("div", {
    className: "gs-stash-body"
  }, stashCards)), !summerOnly && (onOpenGuide || onViewLanding || who && onLogout) && /*#__PURE__*/React.createElement("div", {
    className: "gs-links"
  }, onOpenGuide && /*#__PURE__*/React.createElement("button", {
    className: "gs-switch gs-landing-link",
    onClick: onOpenGuide
  }, "\u65B0\u624B\u6559\u5B78"), onViewLanding && /*#__PURE__*/React.createElement("button", {
    className: "gs-switch gs-landing-link",
    onClick: onViewLanding
  }, "\u56DE\u5230\u4E3B\u9801"), who && onLogout && /*#__PURE__*/React.createElement("button", {
    className: "gs-switch gs-landing-link",
    onClick: onLogout
  }, "\u4E0D\u662F", who, "\uFF1F\u63DB\u5E33\u865F"))));
}

/* ───────── Lock Screen（名單外 / 未授權） ───────── */
function LockScreen({
  user,
  onLogin,
  onLogout
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "login-screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-card lock-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lock-icon"
  }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("h1", {
    className: "login-title"
  }, "\u9700\u8981\u6388\u6B0A\u624D\u80FD\u4F7F\u7528"), user ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "lock-msg"
  }, "\u9019\u500B\u5E33\u865F\uFF08", /*#__PURE__*/React.createElement("strong", null, user.email), "\uFF09\u76EE\u524D\u4E0D\u5728\u5B78\u751F\u540D\u55AE\u5167\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "lock-sub"
  }, "\u8ACB\u78BA\u8A8D\u4F60\u7528\u7684\u662F", /*#__PURE__*/React.createElement("strong", null, "\u5831\u540D\u6642\u63D0\u4F9B\u7684 Google \u5E33\u865F"), "\u3002", /*#__PURE__*/React.createElement("br", null), "\u5982\u679C\u9084\u6C92\u5831\u540D\uFF0C\u6B61\u8FCE\u806F\u7D61 Alan \u8001\u5E2B\uFF01"), /*#__PURE__*/React.createElement("button", {
    className: "google-btn lock-btn",
    onClick: onLogout
  }, "\u63DB\u4E00\u500B\u5E33\u865F\u767B\u5165")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "lock-msg"
  }, "\u8AB2\u7A0B\u5167\u5BB9\u50C5\u958B\u653E\u7D66\u5DF2\u5831\u540D\u7684\u5B78\u751F\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "lock-sub"
  }, "\u8ACB\u4F7F\u7528\u5831\u540D\u6642\u63D0\u4F9B\u7684 Google \u5E33\u865F\u767B\u5165\u3002"), /*#__PURE__*/React.createElement("button", {
    className: "google-btn lock-btn",
    onClick: onLogin
  }, "\u4F7F\u7528 Google \u767B\u5165")), /*#__PURE__*/React.createElement("p", {
    className: "lock-contact"
  }, "\uD83D\uDCE9 \u806F\u7D61 Alan \u8001\u5E2B\uFF1Aalan07050445@gmail.com")));
}

/* ════ StarBurst — ⭐ celebration animation (Web Animations API) ════ */
function StarBurst({
  count = 20,
  onDone
}) {
  var containerRef = React.useRef(null);
  var cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
  var cy = typeof window !== 'undefined' ? window.innerHeight * 0.38 : 150;

  // Generate star data once (random, no memo needed — rendered once then removed)
  var EMOJIS = window.festIs && window.festIs('hw') ? ['🎃', '🎃', '🦇', '👻', '🎃', '✨'] : ['⭐', '✨', '🌟', '💫', '⭐', '🌟'];
  var stars = React.useRef(Array.from({
    length: count
  }, (_, i) => {
    var angle = i / count * 360 + (Math.random() - 0.5) * (360 / count);
    var dist = 90 + Math.random() * 160;
    var rad = angle * Math.PI / 180;
    return {
      id: i,
      tx: Math.round(Math.cos(rad) * dist),
      ty: Math.round(Math.sin(rad) * dist),
      sz: Math.round(14 + Math.random() * 14),
      delay: Math.round(Math.random() * 220),
      dur: Math.round(700 + Math.random() * 500),
      tr: Math.round((Math.random() - 0.5) * 240),
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
    };
  })).current;
  React.useEffect(() => {
    // Use Web Animations API — reliable across all browsers, no CSS var hack needed
    var els = containerRef.current?.querySelectorAll('.star-burst-particle');
    if (els) {
      stars.forEach((s, i) => {
        var el = els[i];
        if (!el) return;
        el.animate([{
          transform: 'translate(-50%,-50%) scale(1.3) rotate(0deg)',
          opacity: 1
        }, {
          transform: `translate(calc(-50% + ${s.tx}px), calc(-50% + ${s.ty}px)) scale(0) rotate(${s.tr}deg)`,
          opacity: 0
        }], {
          duration: s.dur,
          delay: s.delay,
          easing: 'cubic-bezier(.25,.46,.45,.94)',
          fill: 'forwards'
        });
      });
    }
    var t = setTimeout(() => onDone && onDone(), 1800);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    ref: containerRef,
    className: "star-burst-container"
  }, stars.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "star-burst-particle",
    style: {
      left: cx + 'px',
      top: cy + 'px',
      fontSize: s.sz + 'px',
      opacity: 1
    }
  }, s.emoji)));
}

/* ════ MobileNav — fixed bottom bar (mobile only) ════ */
function MobileNav({
  week,
  weekIdx,
  weekOrder,
  onPrevWeek,
  onNextWeek,
  catView,
  onBackFromCat,
  user
}) {
  var atStart = weekIdx <= 0;
  var atEnd = weekIdx >= (weekOrder?.length || 1) - 1;
  var inCat = !!catView;
  var weekLabel = week?.label || weekOrder?.[weekIdx] || `Week ${weekIdx + 1}`;

  // When inside a category: show Back | cat name | nothing
  // When on main screen: show ← Week | home dot | Week →
  return /*#__PURE__*/React.createElement("nav", {
    className: "mobile-nav",
    "aria-label": "Navigation"
  }, inCat ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "mobile-nav-btn active",
    onClick: onBackFromCat
  }, /*#__PURE__*/React.createElement("span", {
    className: "mobile-nav-icon"
  }, "\u2190"), /*#__PURE__*/React.createElement("span", null, "\u8FD4\u56DE")), /*#__PURE__*/React.createElement("div", {
    className: "mobile-nav-divider"
  }), /*#__PURE__*/React.createElement("button", {
    className: "mobile-nav-btn",
    style: {
      flex: 2,
      fontSize: '10px',
      color: 'var(--ink)',
      letterSpacing: '0.02em',
      textTransform: 'none',
      fontFamily: 'var(--sans)',
      fontWeight: 700
    },
    disabled: true
  }, /*#__PURE__*/React.createElement("span", {
    className: "mobile-nav-icon"
  }, catView?.id === 'vocab' ? '📚' : catView?.id === 'grammar' ? '✏️' : catView?.id === 'word' ? '🔤' : catView?.id === 'ltvocab' ? '📕' : catView?.id === 'mock' ? '📝' : '📖'), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '100%'
    }
  }, catView?.titleZh || catView?.title || '')), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "mobile-nav-btn",
    onClick: onPrevWeek,
    disabled: atStart
  }, /*#__PURE__*/React.createElement("span", {
    className: "mobile-nav-icon"
  }, "\u2190"), /*#__PURE__*/React.createElement("span", null, "Prev")), /*#__PURE__*/React.createElement("div", {
    className: "mobile-nav-divider"
  }), /*#__PURE__*/React.createElement("button", {
    className: "mobile-nav-btn active",
    disabled: true
  }, /*#__PURE__*/React.createElement("span", {
    className: "mobile-nav-icon"
  }, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", null, weekLabel)), /*#__PURE__*/React.createElement("div", {
    className: "mobile-nav-divider"
  }), /*#__PURE__*/React.createElement("button", {
    className: "mobile-nav-btn",
    onClick: onNextWeek,
    disabled: atEnd
  }, /*#__PURE__*/React.createElement("span", {
    className: "mobile-nav-icon"
  }, "\u2192"), /*#__PURE__*/React.createElement("span", null, "Next"))));
}

/* ════ LoadingScreen — brand logo fade-in overlay ════ */
function LoadingScreen({
  fading
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `ls-screen${fading ? ' ls-fading' : ''}`,
    "aria-label": "Loading"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ls-glow"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ls-brand"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "ls-spark ls-spark-1",
    viewBox: "0 0 24 24",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
  })), /*#__PURE__*/React.createElement("svg", {
    className: "ls-spark ls-spark-2",
    viewBox: "0 0 24 24",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
  })), /*#__PURE__*/React.createElement("img", {
    src: "icon.svg",
    alt: "Alan's English Class",
    className: "ls-logo"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ls-est"
  }, "EST \xB7 2026"), /*#__PURE__*/React.createElement("div", {
    className: "ls-name"
  }, "Alan", /*#__PURE__*/React.createElement("em", null, "'s"), " English Class"), /*#__PURE__*/React.createElement("div", {
    className: "ls-underline",
    "aria-hidden": "true"
  })));
}

/* ───────── v252: 海綿寶寶泡泡轉場——純 DOM 直接生成（點擊下一幀就出現，不等 React render）───────── */
function spawnPageWave(ttl) {
  try {
    var B = [[4, 120, 0, 1.15, 'A'], [12, 54, .12, 1.0, ''], [18, 88, .05, 1.2, 'b'], [24, 140, .18, 1.3, 'C'], [30, 46, .02, .95, ''], [36, 96, .22, 1.15, 'd'], [42, 64, .08, 1.05, 'E'], [48, 150, .15, 1.35, ''], [54, 80, .03, 1.1, 'f'], [60, 110, .2, 1.25, 'G'], [66, 50, .1, .95, ''], [72, 132, .06, 1.3, 'h'], [78, 70, .25, 1.05, 'I'], [84, 100, .02, 1.2, ''], [90, 58, .16, 1.0, 'j'], [95, 86, .09, 1.15, 'K'], [8, 72, .3, 1.05, 'L'], [16, 118, .26, 1.3, ''], [26, 60, .33, 1.0, 'm'], [34, 90, .28, 1.2, 'N'], [44, 52, .35, .95, ''], [52, 124, .3, 1.35, 'o'], [62, 76, .27, 1.1, 'P'], [70, 98, .34, 1.25, ''], [80, 56, .29, 1.0, 'q'], [88, 136, .32, 1.35, 'R'], [94, 66, .26, 1.05, ''], [2, 94, .31, 1.2, 's'], [22, 48, .38, .9, ''], [38, 104, .4, 1.25, 'T'], [58, 62, .42, 1.0, 'u'], [76, 116, .38, 1.3, 'V'], [10, 44, .45, .9, ''], [46, 84, .44, 1.15, 'w'], [68, 58, .47, 1.0, 'X'], [86, 92, .42, 1.2, 'y']];
    var root = document.createElement('div');
    root.className = 'pw';
    root.setAttribute('aria-hidden', 'true');
    var veil = document.createElement('div');
    veil.className = 'pw-veil';
    root.appendChild(veil);
    B.forEach(b => {
      var sp = document.createElement('span');
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
    setTimeout(() => {
      try {
        root.remove();
      } catch (e) {}
    }, ttl || 1900);
    return root;
  } catch (e) {
    return null;
  }
}

/* ───────── First-time welcome / onboarding ───────── */
function WelcomeGuide({
  onClose
}) {
  // v240: 首步改用品牌 logo（AI 插畫已移除），後三步沿用功能 icon
  var steps = [{
    img: 'icon.svg',
    kick: '歡迎',
    title: '歡迎來到 Alan’s English Class',
    body: '這裡的練習對齊康橋國際學校的每週進度——在家練的，就是學校正在教的。每週打開一次，跟著練就對了。'
  }, {
    img: 'feat-week.png',
    kick: '每週練習',
    title: '每週一個目標，跟著練',
    body: '最上面是本週進度，點「開始練習」就會帶你到下一個該練的項目；也可以自己從單字、文法、字根字首、閱讀寫作挑一個開始。'
  }, {
    img: 'feat-mark.png',
    kick: '本週聯絡簿',
    title: '老師指定的作業，都在聯絡簿',
    body: '打開「本週聯絡簿」就能看到老師指定的作業、截止日與完成狀態；全部做完會亮起綠色的勾勾。'
  }, {
    img: 'feat-record.png',
    kick: '家長看這裡',
    title: '每一週的進步，都看得到',
    body: '點「學習成長」可以看到每週完成率與平均分數的變化；答錯的題目會自動收進錯題本，複習最有效率。'
  }];
  var [step, setStep] = React.useState({
    i: 0,
    dir: 1
  });
  var i = step.i;
  var last = i === steps.length - 1;
  var go = k => {
    if (k !== i) setStep({
      i: k,
      dir: k > i ? 1 : -1
    });
  };
  var finish = () => {
    onClose();
  };
  var next = () => {
    if (last) finish();else go(i + 1);
  };

  // 預載後面幾步的插畫，切換時不閃白
  React.useEffect(() => {
    steps.forEach(s => {
      var im = new Image();
      im.src = s.img;
    });
  }, []);
  React.useEffect(() => {
    var onKey = e => {
      if (e.key === 'Escape') finish();else if (e.key === 'ArrowRight') next();else if (e.key === 'ArrowLeft' && i > 0) go(i - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [i]);
  var s = steps[i];
  return /*#__PURE__*/React.createElement("div", {
    className: "wg-overlay"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wg-sheet",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "\u65B0\u624B\u6559\u5B78"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wg-blob",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("button", {
    className: "wg-skip",
    onClick: finish
  }, "\u7565\u904E"), /*#__PURE__*/React.createElement("div", {
    className: "wg-count"
  }, "\u65B0\u624B\u6559\u5B78 \xB7 ", i + 1, " / ", steps.length), /*#__PURE__*/React.createElement("div", {
    className: `wg-stage${step.dir < 0 ? ' wg-rev' : ''}`,
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "wg-art"
  }, /*#__PURE__*/React.createElement("img", {
    src: s.img,
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    className: "wg-kick"
  }, s.kick), /*#__PURE__*/React.createElement("h2", {
    className: "wg-title"
  }, s.title), /*#__PURE__*/React.createElement("p", {
    className: "wg-body"
  }, s.body)), /*#__PURE__*/React.createElement("div", {
    className: "wg-dots"
  }, steps.map((_, k) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: `wg-dot${k === i ? ' on' : ''}`,
    onClick: () => go(k),
    "aria-label": `第 ${k + 1} 步`
  }))), /*#__PURE__*/React.createElement("div", {
    className: "wg-actions"
  }, i > 0 && /*#__PURE__*/React.createElement("button", {
    className: "wg-back",
    onClick: () => go(i - 1)
  }, "\u4E0A\u4E00\u6B65"), /*#__PURE__*/React.createElement("button", {
    className: "wg-next",
    onClick: next
  }, last ? '開始學習 →' : '下一步 →'))));
}

/* ───────── 實境導覽（spotlight tour）─────────
   小朋友版新手教學，四段式：
   ① tour：聚光燈圈大廳「真的」元素，一句大字，點哪都能下一站
   ② handoff 實際演練：聚光燈圈「真的」按鈕、只有它按得下去——
      點開始練習 → 看左側任務清單（info 站）→ 親手按開始測驗，
      真的測驗開始、導覽悄悄退場。（v224: 範例題移除，直接實戰）
   文字版 WelcomeGuide 只當 fallback（大廳空空時）。 */
function SpotlightTour({
  onClose,
  onEmpty
}) {
  // v324: Alan 指定的 8 站亮燈導覽（照他的順序）——純聚光燈＋說明，走完就結束（不再接「換你操作」）。
  var DEFS = [{
    sel: '.tt',
    fb: '.wh',
    t: '① 老師出的作業在這裡',
    s: '這週老師派的作業都在這，點一條就開始，做完會打勾 ✓'
  }, {
    sel: '.qm-blocks',
    fb: null,
    t: '② 想自己多練？點這些卡片',
    s: '作業做完還想練，就點進這些卡片——單字、文法、字根字首、閱讀寫作，自己挑一個練'
  }, {
    sel: '.growth-inline',
    fb: '.growth-summary-row',
    t: '③ 你的成長曲線',
    s: '每一週的平均成績都在這，看得到自己的進步'
  }, {
    sel: '.wh',
    fb: null,
    t: '④ 本週完成度',
    s: '這裡看你完成多少、還有哪些作業沒做完'
  }, {
    sel: '.week-nav',
    fb: '.wh-weeknav',
    t: '⑤ 換到不同週',
    s: '用這裡的箭頭往前、往後，看不同週的作業'
  }, {
    sel: '.lobby-back',
    fb: null,
    t: '⑥ 回大廳',
    s: '想回到入口（換教室或暑假專區），就點這裡'
  }, {
    sel: '.user-chip',
    fb: '.signin-btn',
    t: '⑦ 登出',
    s: '要登出的話，點你的名字（頭像）就可以'
  }, {
    sel: '.ll-foot2-contact',
    fb: '.ll-foot2-btn-line',
    t: '⑧ 聯絡老師',
    s: '有問題想找 Alan 老師？從這裡加 LINE 或寄 Email'
  }];
  // 實際演練：click 站＝只有被圈住的真元素點得動；info 站＝看說明按下一步
  var HDEFS = [{
    sel: '.tt-row:not(.tt-done)',
    fb: '.qm-block:not(.empty)',
    mode: 'click',
    t: '換你了！點這裡開始',
    s: '你的第一次練習，就從這裡開始'
  }, {
    sel: '.qm-unit-list',
    fb: '.qm-sidebar',
    mode: 'info',
    t: '這一類的任務都在這裡',
    s: '由上往下一個一個完成。文法、字根字首、閱讀寫作，也是同樣的做法！'
  }, {
    sel: '.qm-intro .qm-btn.primary',
    fb: null,
    mode: 'click',
    t: '就是這裡！',
    s: '點下去，開始今天的練習 💪'
  }];
  // ⚠️ 元素一律「用的時候現查」（不能在 render 期間抓一次存起來——
  // .page 以 pageKey remount 時，render 期查到的是即將被拆掉的舊 DOM）
  // v324: 挑「看得見」的那個——mobile 的 .week-nav 是 display:none（但 DOM 還在），
  // 直接回它會讓聚光燈卡住等不到尺寸；改成沒尺寸就退回 fb（.wh-weeknav）。
  var pick = sel => {
    var el = sel && document.querySelector(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return r.width || r.height ? el : null;
  };
  var getEl = d => pick(d.sel) || pick(d.fb);
  var [stops, setStops] = React.useState([]);
  var [i, setI] = React.useState(0);
  var [phase, setPhase] = React.useState('tour'); // tour → handoff
  var [hi, setHi] = React.useState(0); // handoff 第幾站
  var holeRef = React.useRef(null);
  var bubbleRef = React.useRef(null);
  var posRef = React.useRef(null); // 聚光燈目前位置（JS lerp，換站時滑過去）
  var scrolledRef = React.useRef(false); // 這一站是否已找到目標並捲進畫面
  var last = i === stops.length - 1;
  var finish = () => onClose();
  // v324: Alan 版導覽＝純 8 站亮燈，走完直接結束（不再進「換你操作」handoff 階段）。
  var next = () => {
    if (last) finish();else setI(i + 1);
  };
  var nextH = () => {
    if (hi < HDEFS.length - 1) setHi(hi + 1);else finish();
  };

  // mount 後（DOM 已 commit）才決定有哪些站；大廳空空的（極少見）→ 退回文字版
  React.useEffect(() => {
    // v324: 8 站都「現在畫面上真的有」才留下（例如訪客沒有 .user-chip → 退回 .signin-btn；
    // 某元素完全不存在就跳過那站）。全空（極少見）→ 退回文字版。
    var found = DEFS.filter(d => getEl(d));
    if (!found.length) {
      if (onEmpty) onEmpty();
      return;
    }
    setStops(found);
  }, []);

  // 每一幀跟著目標走（捲動、縮放、remount、換站都黏得住）。
  // handoff 的目標可能「等頁面切完才出現」→ 找到的那一幀才捲動置中。
  React.useEffect(() => {
    if (phase !== 'tour' && phase !== 'handoff') return;
    var stop = phase === 'handoff' ? HDEFS[hi] : stops[i];
    if (!stop) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var PAD = 10;
    var raf = 0;
    scrolledRef.current = false;
    // handoff 站的目標一直沒出現 → info 站直接跳下一站（例如某版面沒有側欄）；
    // click 站則安靜收尾（例如第一個單元是特殊題型、沒有開始按鈕）——
    // 小朋友已經在正確的頁面上了
    var guard = phase === 'handoff' ? setTimeout(() => {
      if (scrolledRef.current) return;
      if (stop.mode === 'info' && hi < HDEFS.length - 1) setHi(hi + 1);else finish();
    }, stop.mode === 'info' ? 2500 : 8000) : null;
    var tick = () => {
      var hole = holeRef.current,
        b = bubbleRef.current;
      if (!hole || !b) return;
      var liveEl = getEl(stop);
      if (!liveEl) {
        raf = requestAnimationFrame(tick);
        return;
      }
      var r = liveEl.getBoundingClientRect();
      if (!r.width && !r.height) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!scrolledRef.current) {
        scrolledRef.current = true;
        try {
          liveEl.scrollIntoView({
            block: 'center',
            behavior: reduce ? 'auto' : 'smooth'
          });
        } catch (e) {}
      }
      var tgt = {
        x: r.left - PAD,
        y: r.top - PAD,
        w: r.width + PAD * 2,
        h: r.height + PAD * 2
      };
      var p = posRef.current;
      if (!p || reduce) {
        p = posRef.current = {
          ...tgt
        };
      } else {
        p.x += (tgt.x - p.x) * 0.22;
        p.y += (tgt.y - p.y) * 0.22;
        p.w += (tgt.w - p.w) * 0.22;
        p.h += (tgt.h - p.h) * 0.22;
      }
      hole.style.transform = `translate(${p.x}px, ${p.y}px)`;
      hole.style.width = p.w + 'px';
      hole.style.height = p.h + 'px';
      // 泡泡：目標下方優先，放不下改上方；水平置中並夾在視窗內
      var bw = b.offsetWidth,
        bh = b.offsetHeight;
      var vw = window.innerWidth,
        vh = window.innerHeight;
      var below = p.y + p.h + 14 + bh < vh - 12;
      var by = below ? p.y + p.h + 14 : Math.max(12, p.y - bh - 14);
      var bx = Math.min(Math.max(12, p.x + p.w / 2 - bw / 2), vw - bw - 12);
      b.style.transform = `translate(${bx}px, ${by}px)`;
      b.style.opacity = '1';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (guard) clearTimeout(guard);
    };
  }, [i, stops, phase, hi]);

  // handoff：捕獲層全域過濾——click 站只有被圈住的真元素點得動；
  // info 站只是「看這裡」，連目標本身也不能點（按泡泡的下一步前進）
  React.useEffect(() => {
    if (phase !== 'handoff') return;
    var stop = HDEFS[hi];
    var onDocClick = e => {
      var el = stop.mode === 'click' ? getEl(stop) : null;
      if (el && (e.target === el || el.contains(e.target))) {
        // 真的點到了！讓 app 正常處理（進分類頁／開始測驗），我們再前進
        if (hi < HDEFS.length - 1) setTimeout(() => setHi(hi + 1), 60);else setTimeout(() => finish(), 350); // 測驗開始的轉場先跑，再悄悄收掉導覽
        return;
      }
      if (e.target.closest && (e.target.closest('.st-bubble') || e.target.closest('.st-skip'))) return;
      e.stopPropagation();
      e.preventDefault();
      // 點錯地方 → 泡泡搖一下提示「點亮亮的地方」
      var b = bubbleRef.current;
      if (b && !b.classList.contains('st-deny')) {
        b.classList.add('st-deny');
        setTimeout(() => b.classList.remove('st-deny'), 450);
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [phase, hi]);
  React.useEffect(() => {
    var onKey = e => {
      if (e.key === 'Escape') {
        finish();
        return;
      }
      if (phase !== 'tour') return; // 換你操作階段不能用鍵盤跳站
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [i, stops, phase]);
  if (!stops.length) return null;
  var s = stops[i];
  var h = HDEFS[hi];
  return /*#__PURE__*/React.createElement("div", {
    className: `st-root${phase === 'handoff' ? ' st-mode-handoff' : ''}`,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "\u65B0\u624B\u5C0E\u89BD"
  }, /*#__PURE__*/React.createElement("div", {
    className: "st-overlay",
    onClick: phase === 'tour' ? next : undefined
  }), /*#__PURE__*/React.createElement("div", {
    className: "st-hole",
    ref: holeRef,
    "aria-hidden": "true"
  }, phase === 'handoff' && h.mode === 'click' && /*#__PURE__*/React.createElement("span", {
    className: "st-point"
  }, "\uD83D\uDC46")), /*#__PURE__*/React.createElement("button", {
    className: "st-skip",
    onClick: finish
  }, "\u7565\u904E\u5C0E\u89BD \u2715"), phase === 'tour' && /*#__PURE__*/React.createElement("div", {
    className: "st-bubble",
    ref: bubbleRef,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "st-inner",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "st-count"
  }, i + 1, " / ", stops.length), /*#__PURE__*/React.createElement("div", {
    className: "st-title"
  }, s.t), /*#__PURE__*/React.createElement("div", {
    className: "st-sub"
  }, s.s), /*#__PURE__*/React.createElement("button", {
    className: "st-next",
    onClick: next
  }, last ? '我知道了 ✓' : '下一步 →'))), phase === 'handoff' && /*#__PURE__*/React.createElement("div", {
    className: "st-bubble",
    ref: bubbleRef,
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "st-inner",
    key: 'h' + hi
  }, /*#__PURE__*/React.createElement("span", {
    className: "st-count"
  }, "\u63DB\u4F60\u64CD\u4F5C \xB7 ", hi + 1, " / ", HDEFS.length), /*#__PURE__*/React.createElement("div", {
    className: "st-title"
  }, h.t), /*#__PURE__*/React.createElement("div", {
    className: "st-sub"
  }, h.s), h.mode === 'info' && /*#__PURE__*/React.createElement("button", {
    className: "st-next",
    onClick: nextH
  }, "\u4E0B\u4E00\u6B65 \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "st-later",
    onClick: finish
  }, "\u5148\u8DF3\u904E\uFF0C\u6211\u81EA\u5DF1\u4F86"))));
}

// v296: 新首頁——單頁品牌封面＋登入（取代舊 8 段長頁）。登入後停在封面顯示「進入課程」。
/* ───────── v526 ⏳ 倒數鐘（Alan：「改成明確時間倒數，比較酷，並且放大顯示」）─────────
   ⚠ 每秒更新但**不重新 render**：數字直接寫進四個 ref 的 textContent。
     走 state 的話整個封面（含四張扇形卡、滑鼠拖尾那層）每秒都會被 React 重算一次，
     而且 useFestCursor 掛在同一個容器上、那些節點不是 React 建的，反覆 render 有風險。
   ⚠ 只有「倒數結束」才真的換畫面（一次 setState），之後 interval 自己停。 */
function FestCountdown({
  big
}) {
  var f = window.festNow && window.festNow();
  var dRef = React.useRef(null),
    hRef = React.useRef(null);
  var mRef = React.useRef(null),
    sRef = React.useRef(null);
  var first = React.useMemo(() => window.festCountParts ? window.festCountParts() : null, []);
  var [over, setOver] = React.useState(!first);
  React.useEffect(() => {
    if (over || !window.festCountParts) return;
    var pad = n => String(n).padStart(2, '0');
    var id = setInterval(() => {
      var p = window.festCountParts();
      if (!p) {
        setOver(true);
        return;
      }
      if (dRef.current) dRef.current.textContent = p.d;
      if (hRef.current) hRef.current.textContent = pad(p.h);
      if (mRef.current) mRef.current.textContent = pad(p.m);
      if (sRef.current) sRef.current.textContent = pad(p.s);
    }, 1000);
    return () => clearInterval(id);
  }, [over]);
  if (!f) return null;
  if (over) return /*#__PURE__*/React.createElement("span", {
    className: "fest-day"
  }, /*#__PURE__*/React.createElement("b", null, f.day), " ", f.hi);
  var pad = n => String(n).padStart(2, '0');
  var cells = [[dRef, String(first.d), '天'], [hRef, pad(first.h), '時'], [mRef, pad(first.m), '分'], [sRef, pad(first.s), '秒']];
  return /*#__PURE__*/React.createElement("div", {
    className: 'fest-tick' + (big ? ' fest-tick-big' : ''),
    role: "timer",
    "aria-label": `距離${f.name}的倒數`
  }, /*#__PURE__*/React.createElement("span", {
    className: "fest-tick-lab"
  }, f.emoji, " \u8DDD\u96E2", f.name), /*#__PURE__*/React.createElement("span", {
    className: "fest-tick-row"
  }, cells.map(([ref, v, lab], i) => /*#__PURE__*/React.createElement("span", {
    className: "fest-tick-c",
    key: lab
  }, /*#__PURE__*/React.createElement("b", {
    ref: ref
  }, v), /*#__PURE__*/React.createElement("i", null, lab)))));
}

/* ───────── v525 ④ 滑鼠特效（v528 擴到門口頁與大廳）─────────
   滑過去會留下一串小蝙蝠／小鬼／月亮，自己飄走。

   ⚠ 三個條件都要擋，不然會變成「幫倒忙」：
     ① 只在節慶期間（平常這個 effect 等於不存在）
     ② `pointer: fine`＝有滑鼠才做。平板點一下會送一個 pointermove，
        手指移動也會——在觸控裝置上等於一路噴圖案蓋住內容。
     ③ prefers-reduced-motion 一律不做。
   ⚠ 用節流**距離**不是節流時間：慢慢移動時時間節流一樣會一直噴，
     但視覺上根本沒移動，結果是在原地疊一坨。
   ⚠ 直接操作 DOM，不走 React state——這是每秒幾十次的事件，
     進 state 會讓整個畫面重新 render。

   ⭐ v528 改成「裝在 document 上、圖案放進自己的固定層」：
     本來是綁在封面那個容器上（useFestCursor(ref)），要擴到門口頁與大廳
     就得三個地方各掛一次，而大廳是 app.jsx 畫的、拿不到同一個 ref。
     改成一個全域監聽 ＋ 用 closest() 判斷滑鼠在不在這三頁上，
     而且圖案用 position:fixed 放進自己的層 → **不用管那三個容器是不是
     position:relative，也不會被 overflow:hidden 裁掉**。 */
/* v529：加上作答頁；而且把「要移動多遠才生一個」從 46 調到 30
   ——Alan 回報封面「鼠標沒了」，實測其實有在跑，只是慢慢移動時太稀疏，
   看起來就像沒反應。密一點才看得出來是一串跟著走的東西。 */
var FEST_CURSOR_ON = '.lc-cover, .grade-selector, .page-lobby, .page-mission';
/* ⚠ 不做成 React hook：封面、門口頁、大廳是三個不同的元件，而且大廳是
   app.jsx 畫的——做成 hook 就要在三個地方各掛一次，而且元件一卸載就失效。
   它本來就不需要 React（只監聽 document ＋ 自己管 DOM），所以改成
   「載入時裝一次」，剩下的交給 closest() 判斷滑鼠在不在這三頁上。 */
function installFestCursor() {
  {
    if (!(window.festOn && window.festOn())) return;
    var fine = false,
      calm = true;
    try {
      fine = window.matchMedia('(pointer: fine)').matches;
      calm = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    if (!fine || !calm) return;
    var host = document.createElement('div');
    host.className = 'hw-trail-layer';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
    /* 🔴 v551（Alan：「第二頁、第三頁的鼠標都有萬聖節主題，但我的首頁怎麼沒有變」）
       封面（.lc-cover）是 position:fixed、z-index:300 的整頁蓋板，
       而上面那一層只有 z-index:4 → 圖案**有生出來，但整個被封面蓋在底下**。
       第二、三頁是一般版面（沒有蓋板）所以看得到。
       v528／v529 我是用「數 DOM 節點」驗證的（生出 8 個），所以當時回報「有在跑」，
       其實肉眼看不見——⭐ 驗證特效要問「那個位置最上面的元素是誰」，不是「有沒有生出來」。
       ⚠ 不能把整層一起抬高：閱讀與單字卡的全螢幕層同樣是 z-index:300，
         抬高會讓蝙蝠飛到小朋友正在讀的內容上（v528 刻意不做）。
         所以**只有封面**用一層比它高一點的（.hw-trail-top）。 */
    var hostTop = document.createElement('div');
    hostTop.className = 'hw-trail-layer hw-trail-top';
    hostTop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hostTop);
    var KINDS = ['bat', 'ghost', 'star', 'bat', 'star'];
    var last = null,
      i = 0;
    var timers = new Set();
    var onMove = e => {
      var t = e.target;
      if (!(t && t.closest && t.closest(FEST_CURSOR_ON))) {
        last = null;
        return;
      }
      var x = e.clientX,
        y = e.clientY;
      if (last && Math.hypot(x - last[0], y - last[1]) < 30) return;
      last = [x, y];
      var sp = document.createElement('span');
      sp.className = 'hw-trail hw-trail-' + KINDS[i++ % KINDS.length];
      sp.style.left = x + 'px';
      sp.style.top = y + 'px';
      sp.style.setProperty('--dx', (Math.random() * 36 - 18).toFixed(1) + 'px');
      sp.style.setProperty('--rot', (Math.random() * 50 - 25).toFixed(1) + 'deg');
      (t.closest('.lc-cover') ? hostTop : host).appendChild(sp);
      var tm = setTimeout(() => {
        try {
          sp.remove();
        } catch (er) {}
        timers.delete(tm);
      }, 1200);
      timers.add(tm);
    };
    document.addEventListener('pointermove', onMove, {
      passive: true
    });
    /* 換頁時把還在飄的清掉，免得它們留在 DOM 上 */
    window.addEventListener('pagehide', () => {
      try {
        document.querySelectorAll('.hw-trail-layer .hw-trail').forEach(n => n.remove());
      } catch (er) {}
      timers.forEach(clearTimeout);
    });
  }
}
try {
  installFestCursor();
} catch (e) {}

/* ══ v555 🎃 萬聖節：全站的「星星」都換成南瓜（Alan：「所有的星星也都改成這個特效，包括商店、完成獲得的特效星星」）
   做法是在 DOM 層把文字裡的 ⭐ 🌟 換成 🎃——商店、星星餘額、結算、老師後台一次全包，
   不用逐一去改 100 多個地方，而且之後新加的星星也自動變南瓜。
   ⚠ 只在萬聖節外觀開著的時候做（festIs('hw')）；節慶一過就不裝，什麼都不會變。
   ⚠ 只改「顯示」：input／textarea／可編輯區不碰，資料裡存的字一個都沒動。
   ⚠ 只換 ⭐🌟 兩個 emoji。★☆（5 星評分的實心／空心）換了會對不上，不動。 */
function installFestStars() {
  if (typeof document === 'undefined' || window.__festStars) return;
  if (!(window.festIs && window.festIs('hw'))) return;
  window.__festStars = true;
  var RE = /[\u2B50\u{1F31F}]\uFE0F?/gu;
  var SKIP = 'script,style,textarea,input,select,[contenteditable="true"]';
  var fix = n => {
    if (n.nodeType === 3) {
      var v = n.nodeValue;
      if (v && RE.test(v)) {
        RE.lastIndex = 0;
        var p = n.parentElement;
        if (p && p.closest(SKIP)) return;
        n.nodeValue = v.replace(RE, '🎃');
      }
      RE.lastIndex = 0;
    } else if (n.nodeType === 1 && !n.matches(SKIP)) {
      var w = document.createTreeWalker(n, window.NodeFilter.SHOW_TEXT);
      var t;
      while (t = w.nextNode()) fix(t);
    }
  };
  var busy = false;
  var mo = new MutationObserver(muts => {
    if (busy) return;
    busy = true;
    try {
      muts.forEach(m => {
        if (m.type === 'characterData') fix(m.target);else m.addedNodes.forEach(fix);
      });
    } finally {
      busy = false;
    }
  });
  var start = () => {
    fix(document.body);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };
  if (document.body) start();else document.addEventListener('DOMContentLoaded', start);
}
try {
  installFestStars();
} catch (e) {}
function LoginScreen({
  onLogin,
  onSkip,
  onBack,
  loggedIn,
  userName,
  onLogout
}) {
  var [loading, setLoading] = React.useState(false);
  var [slow, setSlow] = React.useState(false);
  var enterMode = loggedIn && onBack; // 已登入且在封面 → 顯示「進入課程」
  var handleLogin = async () => {
    setLoading(true);
    setTimeout(() => {
      setSlow(true);
      setLoading(false);
    }, 12000); // 卡住的備援（unmount 換頁即消失）
    try {
      await onLogin();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "login-screen lc-cover lc-hero"
  }, window.festOn && window.festOn() && /*#__PURE__*/React.createElement("div", {
    className: "fest-ribbon",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("i", null)), onBack && !enterMode && /*#__PURE__*/React.createElement("button", {
    className: "lc-back",
    onClick: onBack
  }, "\u2190 \u8FD4\u56DE\u8AB2\u7A0B"), /*#__PURE__*/React.createElement("h1", {
    className: "lc-title"
  }, "Alan's English Class"), /*#__PURE__*/React.createElement("div", {
    className: "lc-under2",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "lc-subtitle"
  }, "\u5EB7\u6A4B\u6BCF\u9031\u9032\u5EA6"), window.festOn && window.festOn() && /*#__PURE__*/React.createElement("div", {
    className: "fest-day-wrap"
  }, /*#__PURE__*/React.createElement(FestCountdown, {
    big: true
  })), window.hwDoubleOn && window.hwDoubleOn() && /*#__PURE__*/React.createElement("div", {
    className: "hw-x2-banner",
    "aria-label": "\u842C\u8056\u7BC0\u9650\u6642\u661F\u661F\u96D9\u500D"
  }, /*#__PURE__*/React.createElement("i", {
    className: "hw-x2-sp s1"
  }, "\u2726"), /*#__PURE__*/React.createElement("i", {
    className: "hw-x2-sp s2"
  }, "\uD83E\uDD87"), /*#__PURE__*/React.createElement("i", {
    className: "hw-x2-sp s3"
  }, "\u2726"), /*#__PURE__*/React.createElement("i", {
    className: "hw-x2-sp s4"
  }, "\uD83C\uDF83"), /*#__PURE__*/React.createElement("span", {
    className: "hw-x2-tag"
  }, "LIMITED EVENT \xB7 \u9650\u6642\u6D3B\u52D5"), /*#__PURE__*/React.createElement("span", {
    className: "hw-x2-main"
  }, "\uD83C\uDF83 \u842C\u8056\u7BC0 ", /*#__PURE__*/React.createElement("b", null, "\u661F\u661F \xD72"), " \uD83C\uDF83")), /*#__PURE__*/React.createElement("div", {
    className: "lc-fan",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lc-card",
    style: {
      '--x': '-243px',
      '--y': '30px',
      '--r': '-15deg',
      '--d': '.62s'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "cards/vocab.jpg",
    alt: "",
    loading: "eager"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lc-ov"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lc-lab"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lc-k"
  }, "VOCABULARY"), /*#__PURE__*/React.createElement("div", {
    className: "lc-zh"
  }, "\u55AE\u5B57"))), /*#__PURE__*/React.createElement("div", {
    className: "lc-card",
    style: {
      '--x': '-82px',
      '--y': '-8px',
      '--r': '-5deg',
      '--d': '.71s'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "cards/grammar.jpg",
    alt: "",
    loading: "lazy"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lc-ov"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lc-lab"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lc-k"
  }, "GRAMMAR"), /*#__PURE__*/React.createElement("div", {
    className: "lc-zh"
  }, "\u6587\u6CD5"))), /*#__PURE__*/React.createElement("div", {
    className: "lc-card",
    style: {
      '--x': '82px',
      '--y': '-8px',
      '--r': '5deg',
      '--d': '.8s'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "cards/word.jpg",
    alt: "",
    loading: "lazy"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lc-ov"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lc-lab"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lc-k"
  }, "WORD STUDY"), /*#__PURE__*/React.createElement("div", {
    className: "lc-zh"
  }, "\u5B57\u6839\u5B57\u9996"))), /*#__PURE__*/React.createElement("div", {
    className: "lc-card",
    style: {
      '--x': '243px',
      '--y': '30px',
      '--r': '15deg',
      '--d': '.89s'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "cards/reading.jpg",
    alt: "",
    loading: "lazy"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lc-ov"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lc-lab"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lc-k"
  }, "READING"), /*#__PURE__*/React.createElement("div", {
    className: "lc-zh"
  }, "\u95B1\u8B80\u5BEB\u4F5C")))), enterMode ? /*#__PURE__*/React.createElement("div", {
    className: "lc-cta-wrap"
  }, userName && /*#__PURE__*/React.createElement("p", {
    className: "lc-welcome"
  }, "\u6B61\u8FCE\u56DE\u4F86\uFF0C", userName, " \uD83D\uDC4B"), /*#__PURE__*/React.createElement("button", {
    className: "lc-cta",
    onClick: onBack
  }, "\u9032\u5165\u8AB2\u7A0B \u2192"), onLogout && /*#__PURE__*/React.createElement("button", {
    className: "lc-logout",
    onClick: onLogout
  }, "\u767B\u51FA")) : /*#__PURE__*/React.createElement("div", {
    className: "lc-cta-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "lc-cta",
    onClick: handleLogin,
    disabled: loading
  }, /*#__PURE__*/React.createElement("span", {
    className: "lc-gg"
  }, "G"), " ", loading ? '登入中…' : '使用 Google 登入'), slow && /*#__PURE__*/React.createElement("button", {
    className: "lc-slow",
    onClick: () => {
      try {
        window.signInWithGoogleRedirect && window.signInWithGoogleRedirect();
      } catch (e) {}
    }
  }, "\u767B\u5165\u5361\u4F4F\u4E86\uFF1F\u6539\u7528\u9019\u500B\u65B9\u5F0F \u2192")));
}

/* ══════════════════════════════════════════════════════
   v342: 我的星星 + 商店（學生端）
   星星由老師在後台給／扣；商店先放範例商品（娃娃、文具），
   兌換＝送出申請給老師（老師確認後在後台扣點）。
══════════════════════════════════════════════════════ */
var SHOP_ITEMS = [
/* v385 的兩頂帽子已經搬到 v431 的「吉祥物裝扮」區（data.js MX_SHOP）——
   那邊是按了就買到、馬上換上，不用再麻煩老師扣點。以前老師扣過點的人仍然算擁有。 */
{
  id: 'labubu',
  emoji: '🧸',
  name: 'Labubu 公仔',
  cost: 3000,
  tag: '娃娃'
}, {
  id: 'capy_big',
  emoji: '🦫',
  name: '50 公分大卡皮巴拉',
  cost: 3000,
  tag: '娃娃'
}, {
  id: 'capy_sm',
  emoji: '🧸',
  name: '小卡皮巴拉吊飾',
  cost: 800,
  tag: '娃娃'
}, {
  id: 'turtle',
  emoji: '🐢',
  name: '烏龜後背包',
  cost: 5000,
  tag: '娃娃'
}, {
  id: 'beyblade',
  emoji: '🌀',
  name: '戰鬥陀螺',
  cost: 7000,
  tag: '玩具'
}, {
  id: 'watch',
  emoji: '⌚',
  name: '極巨腕戴',
  cost: 8000,
  tag: '玩具'
}, {
  id: 'pen',
  emoji: '🖊️',
  name: '酷炫中性筆',
  cost: 300,
  tag: '文具'
}, {
  id: 'pencase',
  emoji: '🎒',
  name: '筆袋',
  cost: 1200,
  tag: '文具'
}, {
  id: 'notebook',
  emoji: '📒',
  name: '筆記本',
  cost: 500,
  tag: '文具'
}, {
  id: 'sticker',
  emoji: '✨',
  name: '貼紙包',
  cost: 200,
  tag: '文具'
}, {
  id: 'eraser',
  emoji: '🧽',
  name: '造型橡皮擦',
  cost: 150,
  tag: '文具'
}, {
  id: 'ruler',
  emoji: '📏',
  name: '尺組',
  cost: 250,
  tag: '文具'
}];

/* ── v362: 每日簽到 ───────────────────────────────────────
   Alan 指定的規則：每天 +5；一輪 28 天內累積 7/14/21/28 天各再 +10/20/30/40；
   整輪一天不漏再 +50 全勤獎。視覺沿用站上的暖色卡片風（不是參考圖那種鮮黃色）。 */
function CheckinPanel({
  user,
  checkin,
  onClose,
  onDone
}) {
  var [busy, setBusy] = React.useState(false);
  var [err, setErr] = React.useState(null);
  var [burst, setBurst] = React.useState(0);
  // v362: 樂觀更新——按下去就先當作簽到了，不必等雲端快照繞回來（離線也看得到反應）
  var [justSigned, setJustSigned] = React.useState(false);
  var info = React.useMemo(() => {
    if (!window.computeCheckin) return {
      days: 0,
      streak: 0,
      signedToday: false,
      total: 0,
      cycleDay: 0,
      cycleDates: []
    };
    var base = {
      ...(checkin || {})
    };
    if (justSigned) base.dates = {
      ...(base.dates || {}),
      [window.checkinToday()]: true
    };
    return window.computeCheckin(base);
  }, [checkin, justSigned]);
  var CYCLE = window.CHECKIN_CYCLE || 28;
  var MILES = window.CHECKIN_MILESTONES || [[7, 10], [14, 20], [21, 30], [28, 40]];
  var milestoneAt = n => (MILES.find(m => m[0] === n) || [])[1] || 0;
  var doCheckIn = async () => {
    if (!user || info.signedToday || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await window.checkInToday(user.uid, user.displayName || '', user.email || '');
      setJustSigned(true);
      setBurst(b => b + 1);
      if (window.playSound) window.playSound('complete');
      if (onDone) onDone();
    } catch (e) {
      setErr('簽到失敗，請檢查網路後再試一次');
    }
    setBusy(false);
  };

  // 這一輪的 28 格：已簽到的打勾，今天那一格可以按
  var cells = [];
  for (var i = 1; i <= CYCLE; i++) {
    var bonus = milestoneAt(i);
    var done = i <= info.cycleDay;
    var isToday = info.signedToday ? i === info.cycleDay : i === info.cycleDay + 1;
    cells.push({
      i,
      bonus,
      done,
      isToday
    });
  }
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "ci-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "ci-panel",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "ci-x",
    onClick: onClose,
    "aria-label": "\u95DC\u9589"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "ci-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ci-kicker"
  }, "DAILY CHECK-IN"), /*#__PURE__*/React.createElement("h2", {
    className: "ci-title"
  }, "\u6BCF\u65E5\u7C3D\u5230"), /*#__PURE__*/React.createElement("p", {
    className: "ci-sub"
  }, info.streak > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, "\u5DF2\u7D93\u9023\u7E8C ", /*#__PURE__*/React.createElement("b", null, info.streak), " \u5929\u6C92\u65B7\u904E", info.streak >= 3 ? '，很厲害！' : '，繼續保持') : '今天簽到，開始累積連續天數吧')), /*#__PURE__*/React.createElement("div", {
    className: "ci-rail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ci-rail-line"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: Math.min(100, info.cycleDay / CYCLE * 100) + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "ci-rail-marks"
  }, MILES.map(([need, bonus]) => /*#__PURE__*/React.createElement("div", {
    key: need,
    className: 'ci-mark' + (info.cycleDay >= need ? ' on' : ''),
    style: {
      left: need / CYCLE * 100 + '%'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ci-mark-dot"
  }), /*#__PURE__*/React.createElement("span", {
    className: "ci-mark-lab"
  }, need, " \u5929", /*#__PURE__*/React.createElement("em", null, "+", bonus)))))), /*#__PURE__*/React.createElement("div", {
    className: "ci-grid"
  }, cells.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.i,
    className: 'ci-cell' + (c.done ? ' done' : '') + (c.isToday ? ' today' : '') + (c.bonus ? ' bonus' : '')
  }, /*#__PURE__*/React.createElement("span", {
    className: "ci-cell-n"
  }, c.i), /*#__PURE__*/React.createElement("span", {
    className: "ci-cell-ico"
  }, c.done ? '✓' : c.bonus ? '🎁' : '⭐'), /*#__PURE__*/React.createElement("span", {
    className: "ci-cell-amt"
  }, "+", c.bonus ? c.bonus + (window.CHECKIN_DAILY || 5) : window.CHECKIN_DAILY || 5)))), /*#__PURE__*/React.createElement("div", {
    className: "ci-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ci-foot-info"
  }, "\u5171\u7C3D\u5230 ", /*#__PURE__*/React.createElement("b", null, info.days), " \u5929 \xB7 \u5DF2\u7D2F\u7A4D ", /*#__PURE__*/React.createElement("b", null, info.total.toLocaleString()), "\u2B50", /*#__PURE__*/React.createElement("span", {
    className: "ci-foot-hint"
  }, "\u6574\u8F2A 28 \u5929\u4E00\u5929\u90FD\u6C92\u6F0F\uFF0C\u518D\u52A0 50\u2B50 \u5168\u52E4\u734E \uD83C\uDFC5")), /*#__PURE__*/React.createElement("button", {
    className: 'ci-btn' + (info.signedToday ? ' done' : ''),
    onClick: doCheckIn,
    disabled: info.signedToday || busy || !user
  }, info.signedToday ? '✓ 今天已簽到' : busy ? '簽到中…' : `簽到領 ${window.CHECKIN_DAILY || 5}⭐`)), err && /*#__PURE__*/React.createElement("div", {
    className: "ci-err"
  }, err), burst > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ci-burst",
    key: burst
  }, "+", window.CHECKIN_DAILY || 5, "\u2B50"))), document.body);
}
function StarsPanel({
  user,
  onClose,
  weeks,
  weekOrder,
  progItems,
  checkin,
  fixed,
  mx,
  onOpenDress
}) {
  var [tab, setTab] = React.useState('me'); // 'me' | 'shop'
  var [data, setData] = React.useState({
    balance: 0,
    entries: []
  });
  var [filter, setFilter] = React.useState('全部');
  var [shopItems, setShopItems] = React.useState(null); // null＝還沒載到／老師沒設定 → 用內建範例

  React.useEffect(() => {
    if (!user || !user.email || !window.subscribeMyStars) return;
    return window.subscribeMyStars(user.email, setData, () => {});
  }, [user && user.email]);

  // v343: 商品改由老師在後台維護（含蝦皮截圖與連結）；還沒設定就先用內建範例
  React.useEffect(() => {
    if (!window.subscribeShop) return;
    return window.subscribeShop(setShopItems, () => {});
  }, []);

  // v361: 完成練習自動集點——跟老師後台用同一個函式，兩邊數字一定一致
  var auto = React.useMemo(() => {
    var a = window.computeAutoStars ? window.computeAutoStars(weeks || {}, weekOrder || [], progItems || {}) : {
      total: 0,
      entries: []
    };
    // v362: 每日簽到的星星也算進來
    var c = window.computeCheckin ? window.computeCheckin(checkin) : {
      total: 0,
      entries: []
    };
    // v465：訂正錯題的星星也算進來（跟 header 右上角那顆 ⭐ 用同一組函式）
    var f = window.computeFixedStars ? window.computeFixedStars(fixed) : {
      total: 0,
      entries: []
    };
    return {
      total: a.total + c.total + f.total,
      entries: [...a.entries, ...c.entries, ...f.entries]
    };
  }, [weeks, weekOrder, progItems, checkin, fixed]);
  /* v431 ④：買吉祥物裝扮花掉的星星要扣掉。花了多少由「買到哪幾件」反算（data.js mxSpent），
     跟 header 右上角那顆 ⭐ 用的是同一個算法，兩邊不可能對不起來。 */
  var spent = window.mxSpent ? window.mxSpent(mx) : 0;
  var bal = Math.max(0, (data.balance || 0) + auto.total - spent); // v361: 手動 + 自動 − 裝扮
  /* v451（Alan：「集點紀錄除了集點也要包含扣點或是買了什麼東西，全部都標示上去」）：
     買裝扮／改名卡／老師退費也排進同一張清單（data.js mxStarRows，跟餘額同一份資料算出來）。 */
  var mxRows = React.useMemo(() => window.mxStarRows ? window.mxStarRows(mx) : [], [mx]);
  var allRows = React.useMemo(() => [...data.entries, ...auto.entries, ...mxRows].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), [data.entries, auto.entries, mxRows]);
  var items = shopItems && shopItems.length ? shopItems : SHOP_ITEMS;
  var tags = ['全部', '吉祥物', ...Array.from(new Set(items.map(i => i.tag).filter(Boolean)))];
  var shown = filter === '全部' ? items : filter === '吉祥物' ? [] : items.filter(i => i.tag === filter);
  // v431：吉祥物的裝扮是「按了就買到、馬上換上」的虛擬商品，跟實體商品分開一區
  var cosmetics = filter === '全部' || filter === '吉祥物' ? (window.MX_SHOP || []).filter(it => !it.free) : [];
  var buyCosmetic = async it => {
    if (window.mxHasItem && window.mxHasItem(mx, it.id)) {
      if (onOpenDress) onOpenDress();
      return;
    }
    if (bal < it.cost) {
      alert(`還差 ${(it.cost - bal).toLocaleString()} 顆星星才能買「${it.zh}」，繼續加油！⭐`);
      return;
    }
    if (!window.confirm(`要用 ${it.cost.toLocaleString()} 顆星星買「${it.zh}」嗎？\n買了馬上就可以換上，之後也能隨時換。`)) return;
    var r = await (window.__mxBuy ? window.__mxBuy(it.id) : Promise.resolve({
      ok: false,
      reason: 'no-user'
    }));
    if (!r.ok) {
      alert(r.reason === 'poor' ? `還差 ${(r.short || 0).toLocaleString()} 顆星星` : '沒買成功，等一下再試一次。');
      return;
    }
    if (window.__mxWear && it.kind !== 'dance') window.__mxWear(it.kind, it.id);
    alert(`買到「${it.zh}」了！🎉\n長按吉祥物 → 👕 裝扮室，隨時可以換。`);
  };
  var redeem = it => {
    if (bal < it.cost) {
      alert(`還差 ${(it.cost - bal).toLocaleString()} 顆星星才能換「${it.name}」，繼續加油！⭐`);
      return;
    }
    // v392: 文案改成誠實的說法。這個函式從頭到尾只跳 alert，沒有任何 Firestore 寫入，
    //       老師端 ShopManager 也看不到任何待兌換清單——原本開頭寫「已記下你想換…」，
    //       學生按完會以為申請已經送出去、老師那邊看得到，其實沒有，只能靠學生自己去講。
    //       所以改成不會誤導的問句，後面「跟 Alan 老師說一聲」才是真正生效的那一步。
    //       （要真的送出申請是新功能，需要 data.js 的儲存函式＋老師端清單，另外議。）
    alert(it.virtual ? `想換「${it.name}」（${it.cost.toLocaleString()}🌟）嗎？\n\n跟 Alan 老師說一聲，老師扣點之後，你的吉祥物就會戴上它 🎩\n（長按吉祥物可以換帽子）` : `想換「${it.name}」（${it.cost.toLocaleString()}🌟）嗎？\n\n下次上課跟 Alan 老師說一聲，老師確認後就會幫你扣點、把東西給你 🎁`);
  };
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "sp-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sp-panel",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sp-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sp-bal"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sp-bal-label"
  }, "\u6211\u7684\u661F\u661F"), /*#__PURE__*/React.createElement("span", {
    className: "sp-bal-num"
  }, bal.toLocaleString(), /*#__PURE__*/React.createElement("em", null, "\u2B50"))), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    onClick: onClose,
    "aria-label": "\u95DC\u9589"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "sp-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: tab === 'me' ? 'on' : '',
    onClick: () => setTab('me')
  }, "\u2B50 \u96C6\u9EDE\u7D00\u9304"), /*#__PURE__*/React.createElement("button", {
    className: tab === 'shop' ? 'on' : '',
    onClick: () => setTab('shop')
  }, "\uD83D\uDECD\uFE0F \u5546\u5E97")), tab === 'me' ? /*#__PURE__*/React.createElement("div", {
    className: "sp-body"
  }, allRows.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "sp-empty"
  }, "\u9084\u6C92\u6709\u96C6\u9EDE\u7D00\u9304\u2014\u2014\u4E0A\u8AB2\u8A8D\u771F\u8868\u73FE\u3001\u628A\u7DF4\u7FD2\u505A\u5B8C\u5C31\u6703\u62FF\u5230\u661F\u661F\u5594\uFF01\u2B50") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sp-sum"
  }, "\u8CFA\u5230 ", ((data.entries || []).filter(e => e.amount > 0).reduce((n, e) => n + e.amount, 0) + auto.total).toLocaleString(), "\u2B50 \u30FB\u82B1\u6389 ", (spent + (data.entries || []).filter(e => e.amount < 0).reduce((n, e) => n - e.amount, 0)).toLocaleString(), "\u2B50 \uFF1D \u73FE\u5728\u6709 ", /*#__PURE__*/React.createElement("b", null, bal.toLocaleString(), "\u2B50")), /*#__PURE__*/React.createElement("div", {
    className: "sp-list"
  }, allRows.map(en => /*#__PURE__*/React.createElement("div", {
    key: en.id,
    className: 'sp-row' + (en.amount < 0 ? ' minus' : '') + (en.auto ? ' auto' : '') + (en.mx ? ' mx' : '')
  }, /*#__PURE__*/React.createElement("span", {
    className: "sp-row-date"
  }, en.date || '—'), /*#__PURE__*/React.createElement("span", {
    className: "sp-row-amt"
  }, en.amount > 0 ? '+' : '', en.amount.toLocaleString(), "\u2B50"), /*#__PURE__*/React.createElement("span", {
    className: "sp-row-note"
  }, en.auto ? '⚡ ' : '', en.note || (en.amount < 0 ? '兌換' : '集點'))))))) : /*#__PURE__*/React.createElement("div", {
    className: "sp-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sp-filter"
  }, tags.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: filter === t ? 'on' : '',
    onClick: () => setFilter(t)
  }, t))), cosmetics.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sp-shop-head"
  }, "\uD83E\uDDF8 \u5409\u7965\u7269\u88DD\u626E \xB7 \u8CB7\u4E86\u99AC\u4E0A\u63DB\u4E0A\uFF08\u9577\u6309\u5409\u7965\u7269\u53EF\u4EE5\u518D\u63DB\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "sp-shop sp-shop-mx"
  }, cosmetics.map(it => {
    var have = !!(window.mxHasItem && window.mxHasItem(mx, it.id));
    var ok2 = have || bal >= (it.cost || 0);
    /* v505（Alan：「圖片要是本人的照片啦」）：夥伴畫牠本人，不要用 emoji 代打 */
    var PetArt = it.kind === 'pet' ? ((window.MX_PETS || []).find(p => p.id === it.pet) || {}).art || null : null;
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      className: 'sp-item' + (ok2 ? '' : ' locked')
    }, /*#__PURE__*/React.createElement("div", {
      className: "sp-item-img",
      "aria-hidden": "true"
    }, PetArt ? /*#__PURE__*/React.createElement(PetArt, {
      size: 46
    }) : it.emoji), /*#__PURE__*/React.createElement("div", {
      className: "sp-item-name"
    }, it.zh), /*#__PURE__*/React.createElement("div", {
      className: "sp-item-cost"
    }, have ? '已擁有' : Number(it.cost || 0).toLocaleString() + '⭐'), /*#__PURE__*/React.createElement("button", {
      className: "sp-item-btn",
      onClick: () => buyCosmetic(it)
    }, have ? '去換上' : ok2 ? '買下來' : `還差 ${((it.cost || 0) - bal).toLocaleString()}`));
  })), shown.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "sp-shop-head"
  }, "\uD83C\uDF81 \u8DDF\u8001\u5E2B\u63DB\u7684\u79AE\u7269")), /*#__PURE__*/React.createElement("div", {
    className: "sp-shop"
  }, shown.map(it => {
    var ok = bal >= (it.cost || 0);
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      className: 'sp-item' + (ok ? '' : ' locked')
    }, /*#__PURE__*/React.createElement("div", {
      className: "sp-item-img",
      "aria-hidden": !it.img
    }, it.img ? /*#__PURE__*/React.createElement("img", {
      src: it.img,
      alt: it.name,
      loading: "lazy"
    }) : it.emoji || '🎁'), /*#__PURE__*/React.createElement("div", {
      className: "sp-item-name"
    }, it.name), /*#__PURE__*/React.createElement("div", {
      className: "sp-item-cost"
    }, Number(it.cost || 0).toLocaleString(), "\u2B50"), it.url && /*#__PURE__*/React.createElement("a", {
      className: "sp-item-link",
      href: it.url,
      target: "_blank",
      rel: "noopener noreferrer",
      onClick: e => e.stopPropagation()
    }, "\u770B\u5546\u54C1 \u2197"), /*#__PURE__*/React.createElement("button", {
      className: "sp-item-btn",
      onClick: () => redeem(it)
    }, ok ? '兌換' : `還差 ${((it.cost || 0) - bal).toLocaleString()}`));
  })), /*#__PURE__*/React.createElement("p", {
    className: "sp-shop-note"
  }, "\u5546\u54C1\u6703\u4E0D\u5B9A\u671F\u66F4\u65B0\u3002\u60F3\u63DB\u7684\u8A71\u6309\u300C\u514C\u63DB\u300D\uFF0C\u4E0B\u6B21\u4E0A\u8AB2\u8DDF\u8001\u5E2B\u8AAA\u4E00\u8072\u5C31\u53EF\u4EE5\u56C9 \uD83C\uDF81")))), document.body);
}

// v392: 舊版行銷長頁的元件已從這份匯出名單移除（函式本體同時刪除，見檔案上方 v392 註解）
Object.assign(window, {
  Boom,
  findUnitsIn,
  FullscreenBtn,
  FocusBtn,
  Icon,
  Header,
  Hero,
  LoginScreen,
  LockScreen,
  EditableText,
  GradeSelector,
  StarBurst,
  MobileNav,
  LoadingScreen,
  WelcomeGuide,
  SpotlightTour,
  spawnPageWave,
  StarsPanel,
  CheckinPanel,
  SHOP_ITEMS
});