// components-dashboard.jsx — Teacher class-report panel

var {
  useState: useDash,
  useEffect: useDashE,
  useMemo: useDashM
} = React;

/* ── Weekly Report Modal (single student) ─────────────── */
function WeeklyReportModal({
  student,
  weeks,
  weekOrder,
  initialWeekId,
  onClose
}) {
  var [selWeekId, setSelWeekId] = useDash(() => initialWeekId || (weekOrder && weekOrder.length > 0 ? weekOrder[weekOrder.length - 1] : null));
  var [copied, setCopied] = useDash(false);
  var [note, setNote] = useDash('');
  var report = useDashM(() => window.buildWeeklyReport(student, weeks, weekOrder, {
    weekId: selWeekId
  }), [student, weeks, weekOrder, selWeekId]);
  var name = friendlyName(student);
  var textReport = useDashM(() => window.formatReportAsText(report, name), [report, name]);
  var handleCopy = () => {
    navigator.clipboard.writeText(textReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  };
  var openVisual = () => {
    if (!window.buildReportHTML) return;
    var html = window.buildReportHTML(report, name, note);
    var w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "report-modal-overlay",
    onClick: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "report-modal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "report-modal-head"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "report-modal-title"
  }, "\uD83D\uDCCB \u5B78\u7FD2\u9031\u5831 \u2014 ", name), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "report-modal-controls"
  }, /*#__PURE__*/React.createElement("label", {
    className: "report-week-label"
  }, "\u9031\u6B21"), /*#__PURE__*/React.createElement("select", {
    className: "report-week-select",
    value: selWeekId || '',
    onChange: e => setSelWeekId(e.target.value)
  }, (weekOrder || []).slice().reverse().map(wid => /*#__PURE__*/React.createElement("option", {
    key: wid,
    value: wid
  }, weeks[wid]?.label || wid, weeks[wid]?.dateRange ? `  (${weeks[wid].dateRange})` : '')))), /*#__PURE__*/React.createElement("div", {
    className: "report-note-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "report-week-label"
  }, "\u8001\u5E2B\u7684\u8A71\uFF08\u6703\u51FA\u73FE\u5728\u5716\u6587\u9031\u5831\uFF0C\u53EF\u7559\u7A7A\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    className: "report-note-input",
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "\u4F8B\u5982\uFF1A\u8A9E\u6850\u9019\u9031\u55AE\u5B57\u9032\u6B65\u5F88\u591A\uFF0C\u6587\u6CD5\u7684\u7B2C\u4E09\u4EBA\u7A31\u55AE\u6578\u518D\u591A\u7DF4\u7FD2\u5C31\u66F4\u7A69\u4E86\uFF01",
    rows: 3
  })), /*#__PURE__*/React.createElement("button", {
    className: "report-visual-btn",
    onClick: openVisual
  }, "\uD83D\uDDBC\uFE0F \u958B\u555F\u5716\u6587\u9031\u5831\uFF08\u7D66\u5BB6\u9577 \xB7 \u622A\u5716\u50B3 LINE\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "report-preview"
  }, /*#__PURE__*/React.createElement("pre", {
    className: "report-preview-text"
  }, textReport)), /*#__PURE__*/React.createElement("button", {
    className: `report-copy-btn${copied ? ' copied' : ''}`,
    onClick: handleCopy
  }, copied ? '已複製 ✓' : '📋 複製文字版（貼到 LINE）')));
}

/* ── All-Class Report Modal ────────────────────────────── */
function AllClassReportModal({
  students,
  weeks,
  weekOrder,
  weeksFor,
  dataFor,
  initialWeekId,
  onClose
}) {
  var [selWeekId, setSelWeekId] = useDash(() => initialWeekId || (weekOrder && weekOrder.length > 0 ? weekOrder[weekOrder.length - 1] : null));
  var [copied, setCopied] = useDash(false);
  var allText = useDashM(() => {
    if (!selWeekId || !students.length) return '尚無學生資料。';
    return students.map(s => {
      // v434：各年級各一份作業——用這位學生自己年級的那一份（週次自動對應）
      var d = dataFor && dataFor(s) || {
        weeks: weeksFor ? weeksFor(s) : weeks,
        order: weekOrder,
        weekId: selWeekId
      };
      var r = window.buildWeeklyReport(s, d.weeks, d.order, {
        weekId: d.weekId || selWeekId
      });
      return window.formatReportAsText(r, friendlyName(s));
    }).join('\n\n' + '－'.repeat(28) + '\n\n');
  }, [students, weeks, weekOrder, selWeekId, weeksFor, dataFor]);
  var handleCopy = () => {
    navigator.clipboard.writeText(allText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "report-modal-overlay",
    onClick: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "report-modal report-modal-wide"
  }, /*#__PURE__*/React.createElement("div", {
    className: "report-modal-head"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "report-modal-title"
  }, "\uD83D\uDCCB \u5168\u73ED\u9031\u5831"), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "report-modal-controls"
  }, /*#__PURE__*/React.createElement("label", {
    className: "report-week-label"
  }, "\u9031\u6B21"), /*#__PURE__*/React.createElement("select", {
    className: "report-week-select",
    value: selWeekId || '',
    onChange: e => setSelWeekId(e.target.value)
  }, (weekOrder || []).slice().reverse().map(wid => /*#__PURE__*/React.createElement("option", {
    key: wid,
    value: wid
  }, weeks[wid]?.label || wid, weeks[wid]?.dateRange ? `  (${weeks[wid].dateRange})` : ''))), /*#__PURE__*/React.createElement("span", {
    className: "report-student-count"
  }, students.length, " \u4F4D\u5B78\u751F")), /*#__PURE__*/React.createElement("div", {
    className: "report-preview report-preview-tall"
  }, /*#__PURE__*/React.createElement("pre", {
    className: "report-preview-text"
  }, allText)), /*#__PURE__*/React.createElement("button", {
    className: `report-copy-btn${copied ? ' copied' : ''}`,
    onClick: handleCopy
  }, copied ? '已複製 ✓' : '📋 複製全班週報')));
}

/* ── Class week overview (traffic-light, at-a-glance) ──── */
var CWO_CATS = [{
  id: 'vocab',
  short: '單字'
}, {
  id: 'grammar',
  short: '文法'
}, {
  id: 'word',
  short: '字根'
}, {
  id: 'reading',
  short: '閱讀'
}];
function ClassWeekOverview({
  students,
  weeks,
  weekOrder,
  weeksFor,
  dataFor,
  currentGrade,
  onSelect,
  selWeekId,
  setSelWeekId
}) {
  // v251: selWeekId 由 TeacherDashboard 統一管理（進學生詳情返回不再重置、預設=今天所在週）
  // v307 (Finding 6): 預設篩選＝目前載入的年級——KPI 平均、燈號只算本年級，跨年級不再假紅字（可切「全部」看全校）
  var [gradeFilter, setGradeFilter] = useDash(currentGrade || 'all'); // v237: 年級篩選
  var [q, setQ] = useDash(''); // v237: 學生搜尋
  var [notifyOpen, setNotifyOpen] = useDash(false); // v294: 家長通知文字視窗
  var [notifyText, setNotifyText] = useDash('');
  var [notifyCopied, setNotifyCopied] = useDash(false);

  // v294: 一鍵產生「本週作業」LINE 通知文字——列出本週 📌 作業＋截止日＋練習連結
  var SITE_URL = 'https://alan07050445-sys.github.io/Alan-s-English-Class/';
  var buildNotifyText = () => {
    var wk = weeks[selWeekId];
    if (!wk) return '';
    var label = wk.label || selWeekId;
    var hw = wk.homework || {};
    var byId = {};
    Object.values(wk.items || {}).forEach(arr => (arr || []).forEach(it => {
      byId[it.id] = it;
    }));
    var fmtDue = d => {
      try {
        var x = new Date(d + 'T00:00:00');
        return `${x.getMonth() + 1}/${x.getDate()}`;
      } catch (e) {
        return d;
      }
    };
    var lines = Object.keys(hw).map(id => {
      var it = byId[id];
      var due = hw[id] && hw[id].dueDate ? `（截止 ${fmtDue(hw[id].dueDate)}）` : '';
      return `・${it && it.title || id}${due}`;
    });
    var head = `📚 ${label} 本週作業來囉！`;
    var body = lines.length ? lines.join('\n') : '本週練習已更新，快來看看！';
    var note = (wk.parentNote || '').trim();
    return [head, '', body, note ? '\n' + note : '', '', `👉 開始練習：${SITE_URL}`, '（登入後點「進入課程」就看得到囉～）'].filter(x => x !== undefined).join('\n');
  };
  var openNotify = () => {
    setNotifyText(buildNotifyText());
    setNotifyCopied(false);
    setNotifyOpen(true);
  };
  var copyNotify = () => {
    navigator.clipboard.writeText(notifyText).then(() => {
      setNotifyCopied(true);
      setTimeout(() => setNotifyCopied(false), 2200);
    }).catch(() => {});
  };
  var sendViaLine = () => {
    window.open('https://line.me/R/msg/text/?' + encodeURIComponent(notifyText), '_blank', 'noopener');
  };
  var rows = useDashM(() => {
    if (!selWeekId) return [];
    return students.map(s => {
      /* v434：用「這位學生自己年級」的作業與同一週（id 規則見 TeacherDashboard 的 weekIdForGrade） */
      var d = dataFor && dataFor(s) || {
        weeks: weeksFor ? weeksFor(s) : weeks,
        order: weekOrder,
        weekId: selWeekId,
        ok: true
      };
      /* ⚠ weekId 給 null 的話 buildWeeklyReport 會退回「那個年級的最後一週」（見 data.js），
         那是別週的資料——這裡改用一個一定不存在的 id，讓它乾乾淨淨回空的（那一列會灰掉）。 */
      var r = window.buildWeeklyReport(s, d.weeks, d.order, {
        weekId: d.weekId || '__no_week__'
      }); // v238: 暑假=只算派給他的
      var catMap = {};
      (window.CATEGORIES || []).forEach(c => {
        catMap[c.titleZh] = {
          done: 0,
          total: 0
        };
      });
      r.completed.forEach(x => {
        if (catMap[x.cat]) {
          catMap[x.cat].done++;
          catMap[x.cat].total++;
        }
      });
      r.pending.forEach(x => {
        if (catMap[x.cat]) {
          catMap[x.cat].total++;
        }
      });
      var done = r.completed.length,
        total = r.totalItems;
      // v266: 待批改——這週已交照片但還沒給分的上傳作業數；v307(F10): 也算「本週有沒有已過期的作業」
      var wk = d.weeks[d.weekId];
      var pendingGrade = 0,
        anyPastDue = false;
      if (wk) {
        var hw = wk.homework || {};
        var now = Date.now();
        anyPastDue = Object.keys(hw).some(id => {
          var dd = hw[id] && hw[id].dueDate;
          if (!dd) return false;
          var d = new Date(dd + 'T23:59:59');
          return !isNaN(d.getTime()) && d.getTime() < now;
        });
        (window.CATEGORIES || []).forEach(c => ((wk.items || {})[c.id] || []).forEach(it => {
          var its2 = s.items || {};
          var pr = its2[`${d.weekId}_${it.id}`] || its2[it.id] || its2[Object.keys(its2).find(k => k.endsWith('_' + it.id)) || ''] || null;
          if (pr && pr.files && pr.files.length && pr.score == null) pendingGrade++;
        }));
      }
      // v307 (F10): 燈號納入截止日——還沒到期又沒人開始＝中性 wait（不再每週一整面假紅）；過期未完成才紅
      var status = total === 0 ? 'none' : done === 0 ? anyPastDue ? 'red' : 'wait' : r.completionRate >= 80 ? 'green' : 'yellow';
      var cats = (window.CATEGORIES || []).map((c, i) => {
        var m = catMap[c.titleZh] || {
          done: 0,
          total: 0
        };
        var st = m.total === 0 ? 'none' : m.done === 0 ? anyPastDue ? 'red' : 'wait' : m.done >= m.total ? 'green' : 'yellow';
        return {
          short: (CWO_CATS[i] || {}).short || c.titleZh,
          ...m,
          st
        };
      });
      return {
        s,
        name: friendlyName(s),
        grade: window.gradeFromEmail(s.email),
        done,
        total,
        pct: r.completionRate,
        avg: r.avgScore,
        status,
        cats,
        last: s.updatedAt,
        late: r.lateCount || 0,
        pendingGrade,
        noData: !d.ok
      };
    });
  }, [students, weeks, weekOrder, selWeekId, weeksFor, dataFor]);
  var orderRank = {
    red: 0,
    yellow: 1,
    wait: 2,
    none: 3,
    green: 4
  };
  var sorted = useDashM(() => [...rows].sort((a, b) => orderRank[a.status] - orderRank[b.status] || a.pct - b.pct || a.name.localeCompare(b.name)), [rows]);

  // v237: 年級篩選 + 搜尋（KPI 跟著篩選後的名單計算）
  var gradeChips = useDashM(() => {
    var present = new Set(rows.map(r => r.grade).filter(Boolean));
    var chips = ['all', ...['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].filter(g => present.has(g))];
    if (rows.some(r => !r.grade)) chips.push('other');
    return chips;
  }, [rows]);
  var shown = useDashM(() => sorted.filter(r => (gradeFilter === 'all' || (gradeFilter === 'other' ? !r.grade : r.grade === gradeFilter)) && (!q.trim() || (r.name + ' ' + (r.s.email || '')).toLowerCase().includes(q.trim().toLowerCase()))), [sorted, gradeFilter, q]);

  /* v307 (F6) 當時是「不是目前這一班就灰掉、不算平均」——那時後台只載入一個年級，別班學生會假裝 0 完成。
     v434 之後每位學生都用自己年級的作業算，所以不用再灰；只有「那個年級這一週真的讀不到」才灰。 */
  var isOffGrade = r => !!r.noData;
  var sum = useDashM(() => {
    var green = 0,
      yellow = 0,
      red = 0,
      none = 0,
      sp = 0,
      n = 0;
    shown.forEach(r => {
      if (r.status === 'green') green++;else if (r.status === 'yellow') yellow++;else if (r.status === 'red') red++;else none++;
      if (r.total > 0 && !isOffGrade(r)) {
        sp += r.pct;
        n++;
      }
    });
    // v434：「本週 N 項練習」跟著現在篩選的名單走（切到 G6 就顯示 G6 這一週有幾項）
    return {
      green,
      yellow,
      red,
      none,
      avgPct: n ? Math.round(sp / n) : 0,
      items: (shown.length ? shown : rows).reduce((m, r) => Math.max(m, r.total), 0)
    };
  }, [shown, rows, gradeFilter, currentGrade]);
  var fmtLast = t => {
    if (!t) return '—';
    var days = Math.floor((Date.now() - t) / 86400000);
    return days <= 0 ? '今天' : days === 1 ? '昨天' : days < 7 ? `${days} 天前` : new Date(t).toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    });
  };
  var exportCsv = () => {
    var head = ['姓名', 'Email', '年級', '完成', '總數', '完成率%', '平均分', '補交', '最後活動'];
    var lines = shown.map(r => [r.name, r.s.email || '', r.grade ? r.grade.toUpperCase() : '', r.done, r.total, r.pct, r.avg != null ? r.avg : '', r.late || 0, r.last ? new Date(r.last).toLocaleDateString('zh-TW') : '']);
    var csv = '\uFEFF' + [head, ...lines].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    var aEl = document.createElement('a');
    aEl.href = URL.createObjectURL(new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    }));
    aEl.download = `班級總覽_${weeks[selWeekId] && weeks[selWeekId].label || selWeekId || ''}.csv`;
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "cwo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cwo-controls"
  }, /*#__PURE__*/React.createElement("label", {
    className: "report-week-label"
  }, "\u9031\u6B21"), /*#__PURE__*/React.createElement("select", {
    className: "report-week-select",
    value: selWeekId || '',
    onChange: e => setSelWeekId(e.target.value)
  }, (weekOrder || []).slice().reverse().map(wid => /*#__PURE__*/React.createElement("option", {
    key: wid,
    value: wid
  }, weeks[wid]?.label || wid, weeks[wid]?.dateRange ? `  (${weeks[wid].dateRange})` : ''))), /*#__PURE__*/React.createElement("span", {
    className: "cwo-itemcount"
  }, "\u672C\u9031 ", sum.items, " \u9805\u7DF4\u7FD2"), gradeChips.length > 2 && /*#__PURE__*/React.createElement("div", {
    className: "cwo-fchips"
  }, gradeChips.map(g => /*#__PURE__*/React.createElement("button", {
    key: g,
    className: `cwo-fchip${gradeFilter === g ? ' on' : ''}`,
    onClick: () => setGradeFilter(g)
  }, g === 'all' ? '全部' : g === 'other' ? '其他' : g.toUpperCase()))), /*#__PURE__*/React.createElement("input", {
    className: "cwo-search",
    placeholder: "\uD83D\uDD0D \u641C\u5C0B\u5B78\u751F\u2026",
    value: q,
    onChange: e => setQ(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "cwo-export",
    onClick: exportCsv,
    title: "\u4E0B\u8F09\u76EE\u524D\u540D\u55AE\u7684 CSV\uFF08Excel \u53EF\u958B\uFF09"
  }, "\u2B07 CSV"), /*#__PURE__*/React.createElement("button", {
    className: "cwo-notify",
    onClick: openNotify,
    title: "\u7522\u751F\u672C\u9031\u4F5C\u696D\u7684 LINE \u901A\u77E5\u6587\u5B57\uFF0C\u8CBC\u5230\u73ED\u7D1A\u7FA4\u7D44\u9001\u51FA"
  }, "\uD83D\uDCE3 \u901A\u77E5\u5BB6\u9577")), notifyOpen && /*#__PURE__*/React.createElement("div", {
    className: "nt-overlay",
    onClick: () => setNotifyOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "nt-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "nt-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nt-title"
  }, "\uD83D\uDCE3 \u672C\u9031\u4F5C\u696D\u901A\u77E5"), /*#__PURE__*/React.createElement("button", {
    className: "nt-x",
    onClick: () => setNotifyOpen(false),
    "aria-label": "\u95DC\u9589"
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "nt-sub"
  }, "\u8CBC\u5230\u73ED\u7D1A LINE \u7FA4\u7D44\u9001\u51FA\uFF0C\u5BB6\u9577\u5C0F\u5B69\u5C31\u6703\u770B\u5230\u3002\u5167\u5BB9\u53EF\u4EE5\u76F4\u63A5\u6539\u3002"), /*#__PURE__*/React.createElement("textarea", {
    className: "nt-text",
    value: notifyText,
    onChange: e => setNotifyText(e.target.value),
    rows: 10
  }), /*#__PURE__*/React.createElement("div", {
    className: "nt-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "nt-line",
    onClick: sendViaLine
  }, "\u7528 LINE \u50B3\u9001 \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "nt-copy",
    onClick: copyNotify
  }, notifyCopied ? '✓ 已複製' : '複製文字')), /*#__PURE__*/React.createElement("div", {
    className: "nt-hint"
  }, "\uD83D\uDCA1\u300C\u7528 LINE \u50B3\u9001\u300D\u6703\u6253\u958B LINE \u8B93\u4F60\u9078\u8981\u8CBC\u5230\u54EA\u500B\u7FA4\u7D44\uFF1B\u96FB\u8166\u4E0A\u82E5\u6C92\u53CD\u61C9\uFF0C\u6539\u7528\u300C\u8907\u88FD\u6587\u5B57\u300D\u518D\u81EA\u5DF1\u8CBC\u3002"))), /*#__PURE__*/React.createElement("div", {
    className: "cwo-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat cwo-stat-big"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat-num"
  }, sum.avgPct, "%"), /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat-label"
  }, "\u5168\u73ED\u5E73\u5747\u5B8C\u6210\u7387")), /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat st-green"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat-num"
  }, sum.green), /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat-label"
  }, "\uD83D\uDFE2 \u5B8C\u6210")), /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat st-yellow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat-num"
  }, sum.yellow), /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat-label"
  }, "\uD83D\uDFE1 \u9032\u884C\u4E2D")), /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat st-red"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat-num"
  }, sum.red), /*#__PURE__*/React.createElement("div", {
    className: "cwo-stat-label"
  }, "\uD83D\uDD34 \u672A\u958B\u59CB"))), students.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "dt-empty"
  }, /*#__PURE__*/React.createElement("p", null, "\u9084\u6C92\u6709\u5B78\u751F\u8CC7\u6599"), /*#__PURE__*/React.createElement("p", {
    className: "dt-empty-hint"
  }, "\u5B78\u751F\u7528 Google \u5E33\u865F\u767B\u5165\u4E26\u5B8C\u6210\u984C\u76EE\u5F8C\uFF0C\u5C31\u6703\u51FA\u73FE\u5728\u9019\u88E1\u3002")) : /*#__PURE__*/React.createElement("div", {
    className: "cwo-list"
  }, shown.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.s.uid,
    className: `cwo-row st-${r.status}${isOffGrade(r) ? ' cwo-off-grade' : ''}`,
    onClick: () => onSelect(r.s),
    title: isOffGrade(r) ? '此學生屬於其他年級，本頁未載入該年級課程，數據僅供參考' : '點擊查看詳情與週報'
  }, /*#__PURE__*/React.createElement("span", {
    className: `cwo-light st-${r.status}`
  }), /*#__PURE__*/React.createElement("div", {
    className: "cwo-name-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cwo-name"
  }, r.name, r.grade && /*#__PURE__*/React.createElement("span", {
    className: "dash-grade"
  }, r.grade.toUpperCase()), isOffGrade(r) && /*#__PURE__*/React.createElement("span", {
    className: "cwo-offgrade-note",
    title: "\u5207\u5230\u8A72\u5E74\u7D1A\u6559\u5BA4\u624D\u770B\u5F97\u5230\u771F\u5BE6\u9032\u5EA6"
  }, "\xB7 \u6B64\u5E74\u7D1A\u8AB2\u7A0B\u672A\u8F09\u5165"), r.late > 0 && /*#__PURE__*/React.createElement("span", {
    className: "cwo-late",
    title: "\u622A\u6B62\u65E5\u4E4B\u5F8C\u624D\u5B8C\u6210\u7684\u9805\u76EE\u6578"
  }, "\u23F0 ", r.late, " \u88DC\u4EA4"), r.pendingGrade > 0 && /*#__PURE__*/React.createElement("span", {
    className: "cwo-grading",
    title: "\u5DF2\u4EA4\u4F5C\u696D\u7167\u7247\u3001\u7B49\u4F60\u6279\u6539"
  }, "\u23F3 ", r.pendingGrade, " \u5F85\u6279\u6539")), /*#__PURE__*/React.createElement("span", {
    className: "cwo-email"
  }, r.s.email || '')), /*#__PURE__*/React.createElement("div", {
    className: "cwo-prog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cwo-prog-top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cwo-count"
  }, r.done, "/", r.total), /*#__PURE__*/React.createElement("span", {
    className: "cwo-pct"
  }, r.pct, "%")), /*#__PURE__*/React.createElement("div", {
    className: "cwo-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: `cwo-bar-fill st-${r.status}`,
    style: {
      width: r.pct + '%'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cwo-cats"
  }, r.cats.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `cwo-cat st-${c.st}`,
    title: `${c.short} ${c.done}/${c.total}`
  }, c.short))), /*#__PURE__*/React.createElement("span", {
    className: "cwo-avg"
  }, r.avg != null ? r.avg + '分' : '—'), /*#__PURE__*/React.createElement("span", {
    className: "cwo-last"
  }, fmtLast(r.last))))), /*#__PURE__*/React.createElement("p", {
    className: "cwo-hint"
  }, "\u4F9D\u300C\u9700\u8981\u95DC\u6CE8\u300D\u6392\u5E8F\uFF1A\u672A\u958B\u59CB \u2192 \u9032\u884C\u4E2D \u2192 \u5B8C\u6210\u3002\u9EDE\u4EFB\u4E00\u4F4D\u5B78\u751F\u53EF\u770B\u8A73\u60C5\u4E26\u7522\u751F\u5BB6\u9577\u9031\u5831\u3002"));
}

/* ── Detect Firebase-UID-like strings (28 chars [A-Za-z0-9]) ── */
function isUid(str) {
  return !str || /^[A-Za-z0-9]{20,}$/.test(str.trim());
}
function friendlyName(s) {
  if (!isUid(s.name)) return s.name;
  // Fall back to email prefix, then "未命名學生"
  return s.email ? s.email.split('@')[0] : '未命名學生';
}

/* ── v251 週次工具：解析 "Jul 1 – Jul 5" 日期區間、找「今天所在的週」 ── */
function _dashParseRange(dr) {
  if (!dr) return null;
  var parts = String(dr).split(/[–—]|-(?= )/).map(x => x.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  var yr = new Date().getFullYear();
  var start = new Date(parts[0] + ' ' + yr);
  var end = new Date(parts[1] + ' ' + yr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);
  return {
    start,
    end
  };
}
/* v434：同一週在各年級的 id 只差前綴（G3「2026F-W02」、G4「g4-2026F-W02」）。
   先照規則猜，猜不到就用「日期區間一樣」的那一週，再不行就回 null＝這個年級沒有這一週
   （後台會把那一列灰掉，而不是假裝他一題都沒做）。 */
function dashWeekIdForGrade(gd, srcWeeks, g, wid) {
  if (!gd || !gd.order || !gd.order.length || !wid) return null;
  var bare = String(wid).replace(/^g\d-/, '');
  var guess = g === 'g3' ? bare : `${g}-${bare}`;
  if (gd.order.indexOf(guess) >= 0) return guess;
  if (gd.order.indexOf(wid) >= 0) return wid;
  var src = (srcWeeks || {})[wid];
  var dr = src && src.dateRange;
  if (dr && dr !== '—') {
    var hit = gd.order.find(id => gd.weeks[id] && gd.weeks[id].dateRange === dr);
    if (hit) return hit;
  }
  return null;
}
function dashCurrentWeekId(weeks, order) {
  var now = new Date();
  var lastStarted = null;
  for (var wid of order || []) {
    var r = _dashParseRange(weeks[wid] && weeks[wid].dateRange);
    if (!r) continue;
    if (now >= r.start && now <= r.end) return wid;
    if (r.start <= now) lastStarted = wid;
  }
  return lastStarted || (order && order.length ? order[order.length - 1] : null);
}

/* ── 暑假發派（v251：週次 × 單元×學生 勾選矩陣——一眼看全班、整列批次發派）──── */
function SummerAdmin() {
  var [roster, setRoster] = useDash([]);
  var [meta, setMeta] = useDash({
    students: {}
  });
  var [lib, setLib] = useDash({
    weeks: null,
    order: []
  });
  var [sfx, setSfx] = useDash(null); // 當前週 suffix（SW01…）
  var [err, setErr] = useDash(null);
  var [busy, setBusy] = useDash(false);
  useDashE(() => window.subscribeRoster(setRoster, () => setErr('讀取名單失敗')), []);
  useDashE(() => window.subscribeSummerMeta ? window.subscribeSummerMeta(setMeta, () => setErr('讀取暑假設定失敗')) : undefined, []);
  useDashE(() => {
    if (!window.summerApi) return;
    return window.summerApi(window.SUMMER_LIB || 'sl').subscribe((w, o) => setLib({
      weeks: w,
      order: o
    }), () => setErr('讀取題庫失敗'));
  }, []);

  // v358: 存檔紀錄（誰／什麼時候／幾題）——這次事故查不出是誰寫的，以後查得到
  var [audit, setAudit] = useDash([]);
  var [auditOpen, setAuditOpen] = useDash(false);
  useDashE(() => window.subscribeSummerLibAudit ? window.subscribeSummerLibAudit(setAudit, () => {}) : undefined, []);

  // v355: 這台裝置開機當下的題庫快照——雲端被寫空時可以從這裡還原
  var boot = window.summerLibBoot ? window.summerLibBoot() : {
    count: 0
  };
  var cloudN = lib.weeks ? Object.values(lib.weeks).reduce((n, wk) => n + Object.values((wk || {}).items || {}).reduce((m, a) => m + (a && a.length || 0), 0), 0) : null;
  // v356: 這台裝置能補回幾個「雲端沒有的」單元（老師機／學生機都算，可以一台一台累積）
  var merged = lib.weeks && window.mergeSummerLibFromBoot ? window.mergeSummerLibFromBoot(lib.weeks) : {
    added: 0
  };
  var canRestore = merged.added > 0;
  var doRestore = async () => {
    if (!confirm(`這台裝置上找到 ${merged.added} 個雲端沒有的單元，要加回題庫嗎？\n\n` + `雲端目前：${cloudN} 個單元 → 還原後：${cloudN + merged.added} 個\n` + (boot.meCount > 0 ? `（其中 ${boot.meCount} 個來自這台裝置的學生帳號快取）\n` : '') + `\n只會「新增」缺少的單元，不會刪掉雲端已經有的。發派清單不受影響。\n` + `可以在不同裝置重複做，一台一台把內容補齊。`)) return;
    setBusy(true);
    try {
      await window.summerApi(window.SUMMER_LIB || 'sl').forceSaveWeeks(merged.weeks);
      alert(`✅ 已加回 ${merged.added} 個單元。請重新整理看看。`);
    } catch (e) {
      alert('還原失敗：' + (e && e.message || e));
    }
    setBusy(false);
  };
  var suffixes = window.SUMMER_WEEK_SUFFIXES || [];
  var cats = window.SUMMER_CATEGORIES || [];
  var active = roster.filter(st => st.active !== false).slice().sort((a, b) => {
    var ga = window.gradeFromEmail(a.email) || a.grade || 'zz';
    var gb = window.gradeFromEmail(b.email) || b.grade || 'zz';
    return String(ga).localeCompare(String(gb)) || String(a.name || a.email).localeCompare(String(b.name || b.email), 'zh-Hant');
  });
  var libWeekOf = suffix => {
    var wid = (lib.order || []).find(id => String(id).endsWith(suffix));
    return wid && lib.weeks && lib.weeks[wid] || null;
  };

  // 預設選「今天所在的暑假週」
  useDashE(() => {
    if (sfx || !lib.order || !lib.order.length) return;
    var wid = dashCurrentWeekId(lib.weeks || {}, lib.order);
    var suf = wid ? suffixes.find(x => String(wid).endsWith(x)) : null;
    setSfx(suf || suffixes[0] || null);
  }, [lib.order]);
  var groups = useDashM(() => {
    if (!sfx) return [];
    var w = libWeekOf(sfx);
    if (!w) return [];
    return cats.map(c => ({
      cat: c,
      items: (w.items || {})[c.id] || []
    })).filter(g => g.items.length > 0);
  }, [lib, sfx]);
  var allIds = groups.flatMap(g => g.items.map(it => it.id));

  // v251b: 樂觀更新——連續快速勾選時不等 Firestore 快照回來，避免互相蓋寫
  var [optimistic, setOptimistic] = useDash({}); // email → weeks map（本地最新意圖）
  var planOf = email => (meta.students || {})[String(email || '').toLowerCase()] || null;
  var weeksOf = stu => optimistic[String(stu.email).toLowerCase()] || (planOf(stu.email) || {}).weeks || {};
  var setOf = stu => new Set((weeksOf(stu) || {})[sfx] || []);
  var shortName = stu => {
    var m = String(stu.name || '').match(/[A-Za-z]+/);
    return m ? m[0] : String(stu.name || stu.email).slice(0, 4);
  };

  // 寫回這位學生「本週」的完整清單（其他週保留原樣）
  var writePlan = async (stu, ids) => {
    var base = weeksOf(stu);
    var full = {};
    suffixes.forEach(x => {
      full[x] = base[x] || [];
    });
    full[sfx] = ids;
    setOptimistic(prev => ({
      ...prev,
      [String(stu.email).toLowerCase()]: full
    }));
    try {
      await window.saveSummerStudent(stu.email, {
        name: stu.name || String(stu.email).split('@')[0],
        weeks: full
      });
    } catch (e) {
      alert('儲存失敗：' + (e && e.message || e));
    }
  };
  var toggleCell = (stu, itemId) => {
    var cur = setOf(stu);
    if (cur.has(itemId)) cur.delete(itemId);else cur.add(itemId);
    writePlan(stu, Array.from(cur));
  };
  var toggleRow = async itemId => {
    // 整列：這個單元 → 全班發派／全班取消
    var everyone = active.length > 0 && active.every(stu => setOf(stu).has(itemId));
    setBusy(true);
    await Promise.all(active.map(stu => {
      var cur = setOf(stu);
      if (everyone) cur.delete(itemId);else cur.add(itemId);
      return writePlan(stu, Array.from(cur));
    }));
    setBusy(false);
  };
  // v323: 整組（一篇文章的全部單元）→ 全班一鍵發派／取消
  var toggleGroup = async items => {
    var ids = (items || []).map(it => it.id);
    if (!ids.length) return;
    var everyone = active.length > 0 && active.every(stu => {
      var s = setOf(stu);
      return ids.every(id => s.has(id));
    });
    setBusy(true);
    await Promise.all(active.map(stu => {
      var cur = setOf(stu);
      ids.forEach(id => {
        if (everyone) cur.delete(id);else cur.add(id);
      });
      return writePlan(stu, Array.from(cur));
    }));
    setBusy(false);
  };
  var toggleCol = stu => {
    // 整欄：這位學生本週 全選／清空
    var cur = setOf(stu);
    writePlan(stu, cur.size >= allIds.length ? [] : allIds.slice());
  };

  // v253: 「＋出題給他」——從學生視角直接出題：存進題庫＋自動發派給這位學生
  var [compose, setCompose] = useDash(null); // { stu, catId?, draft? }
  var startCompose = catId => setCompose(prev => ({
    ...prev,
    catId,
    draft: {
      id: catId[0] + Date.now() + Math.random().toString(36).slice(2, 6),
      _isNew: true,
      type: 'flashcard',
      title: '',
      zh: '',
      duration: '',
      url: '',
      embed: '',
      body: ''
    }
  }));
  var saveCompose = async form => {
    var {
      _isNew,
      ...clean
    } = form;
    var wid = (lib.order || []).find(id => String(id).endsWith(sfx));
    if (!wid || !lib.weeks) {
      alert('題庫還沒載入，稍等再試。');
      return;
    }
    var w = JSON.parse(JSON.stringify(lib.weeks));
    if (!w[wid].items) w[wid].items = {};
    var list = w[wid].items[compose.catId] || [];
    w[wid].items[compose.catId] = [...list, clean];
    try {
      await window.summerApi(window.SUMMER_LIB || 'sl').saveWeeks(w);
    } catch (e) {
      alert('儲存失敗：' + (e && e.message || e));
      return;
    }
    setLib(prev => ({
      ...prev,
      weeks: w
    })); // 樂觀更新（快照回來會覆蓋成一致）
    var cur = setOf(compose.stu);
    cur.add(clean.id);
    await writePlan(compose.stu, Array.from(cur));
    setCompose(null);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "sa"
  }, err && /*#__PURE__*/React.createElement("div", {
    className: "sa-err"
  }, err), /*#__PURE__*/React.createElement("div", {
    className: "sa-status"
  }, "\u96F2\u7AEF\u984C\u5EAB\uFF1A", /*#__PURE__*/React.createElement("b", null, cloudN === null ? '讀取中…' : `${cloudN} 個單元`), /*#__PURE__*/React.createElement("span", {
    className: "sa-status-sep"
  }, "\xB7"), "\u9019\u53F0\u88DD\u7F6E\u7684\u5099\u4EFD\uFF1A", /*#__PURE__*/React.createElement("b", null, boot.count, " \u500B\u55AE\u5143"), boot.count > 0 && /*#__PURE__*/React.createElement("span", {
    className: "sa-status-src"
  }, "\uFF08\u984C\u5EAB ", boot.libCount, "\uFF0F\u5B78\u751F\u7AEF ", boot.meCount, "\uFF09"), audit.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "sa-status-log",
    onClick: () => setAuditOpen(o => !o)
  }, "\u6700\u5F8C\u5B58\u6A94\uFF1A", audit[0].by, " \xB7 ", new Date(audit[0].at).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }), " \xB7 ", audit[0].n, " \u984C ", auditOpen ? '▴' : '▾')), auditOpen && /*#__PURE__*/React.createElement("div", {
    className: "sa-auditlog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sa-auditlog-head"
  }, "\u6700\u8FD1\u7684\u5B58\u6A94\u7D00\u9304\uFF08\u8AB0\u3001\u4EC0\u9EBC\u6642\u5019\u3001\u5B58\u5B8C\u5269\u5E7E\u984C\uFF09"), audit.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'sa-auditlog-row' + (a.n === 0 ? ' danger' : '')
  }, /*#__PURE__*/React.createElement("span", null, new Date(a.at).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })), /*#__PURE__*/React.createElement("b", null, a.by), /*#__PURE__*/React.createElement("span", null, a.dev || ''), /*#__PURE__*/React.createElement("span", null, a.kind === 'restore' ? '還原' : '存檔'), /*#__PURE__*/React.createElement("span", null, a.n, " \u984C")))), canRestore && /*#__PURE__*/React.createElement("div", {
    className: "sa-restore"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "\uD83E\uDE79 \u9019\u53F0\u88DD\u7F6E\u53EF\u4EE5\u88DC\u56DE ", merged.added, " \u500B\u984C\u5EAB\u88E1\u6C92\u6709\u7684\u55AE\u5143"), /*#__PURE__*/React.createElement("span", null, "\u96F2\u7AEF\u76EE\u524D ", /*#__PURE__*/React.createElement("b", null, cloudN), " \u500B\u55AE\u5143", boot.at ? `，本機快取時間 ${new Date(boot.at).toLocaleString('zh-TW')}` : '', "\u3002 \u53EA\u6703\u65B0\u589E\u7F3A\u5C11\u7684\uFF0C\u4E0D\u6703\u522A\u6389\u73FE\u6709\u7684\u2014\u2014\u53EF\u4EE5\u5230\u4E0D\u540C\u88DD\u7F6E\u91CD\u8907\u6309\uFF0C\u4E00\u53F0\u4E00\u53F0\u628A\u5167\u5BB9\u88DC\u9F4A\u3002")), /*#__PURE__*/React.createElement("button", {
    className: "sa-restore-btn",
    onClick: doRestore,
    disabled: busy
  }, busy ? '還原中…' : `🩹 加回 ${merged.added} 個單元`)), /*#__PURE__*/React.createElement("div", {
    className: "sa-hint"
  }, "\u5148\u5230\u300C\u6691\u5047\u984C\u5EAB\u300D\u51FA\u984C\uFF0C\u518D\u56DE\u9019\u88E1\u52FE\u9078\u767C\u6D3E\u3002\u540C\u4E00\u55AE\u5143\u767C\u7D66\u591A\u4F4D\u5B78\u751F\u6642", /*#__PURE__*/React.createElement("b", null, "\u5171\u7528\u540C\u4E00\u4EFD\u5167\u5BB9"), "\u2014\u2014\u984C\u5EAB\u6539\u4E86\uFF0C\u6240\u6709\u4EBA\u540C\u6B65\u66F4\u65B0\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "sa-weeks"
  }, suffixes.map((x, i) => {
    var w = libWeekOf(x);
    if (!w) return null;
    var has = cats.some(c => ((w.items || {})[c.id] || []).length > 0);
    if (!has) return null;
    return /*#__PURE__*/React.createElement("button", {
      key: x,
      className: `sa-wchip${sfx === x ? ' on' : ''}`,
      onClick: () => setSfx(x)
    }, /*#__PURE__*/React.createElement("b", null, "Week ", i + 1), w.dateRange ? /*#__PURE__*/React.createElement("span", null, w.dateRange) : null);
  })), groups.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "sa-empty"
  }, "\u9019\u4E00\u9031\u984C\u5EAB\u9084\u6C92\u6709\u5167\u5BB9\u2014\u2014\u5148\u5230\u6691\u5047\u984C\u5EAB\u51FA\u984C\uFF0C\u9019\u88E1\u5C31\u6703\u51FA\u73FE\u53EF\u52FE\u9078\u7684\u55AE\u5143\u3002") : active.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "sa-empty"
  }, "\u540D\u55AE\u662F\u7A7A\u7684\u2014\u2014\u5148\u5230\u300C\u5B78\u751F\u540D\u55AE\u300D\u65B0\u589E\u5B78\u751F\u3002") : /*#__PURE__*/React.createElement("div", {
    className: "sa-mx-wrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "sa-mx"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "sa-mx-unitcol"
  }, "\u55AE\u5143 \xD7 \u5B78\u751F"), active.map(stu => /*#__PURE__*/React.createElement("th", {
    key: stu.email
  }, /*#__PURE__*/React.createElement("div", {
    className: "sa-mx-stuwrap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "sa-mx-stu",
    onClick: () => toggleCol(stu),
    title: `${stu.name || stu.email}：點一下＝本週全選／清空`
  }, /*#__PURE__*/React.createElement("b", null, shortName(stu)), /*#__PURE__*/React.createElement("span", {
    className: setOf(stu).size > 0 ? 'on' : ''
  }, setOf(stu).size, "/", allIds.length)), /*#__PURE__*/React.createElement("button", {
    className: "sa-mx-add",
    title: `出題給 ${shortName(stu)}：新單元存進題庫並直接發派給他`,
    onClick: () => setCompose({
      stu
    })
  }, "\uFF0B")))))), /*#__PURE__*/React.createElement("tbody", null, groups.map(g => {
    var ags = window.qmGroupByArticle ? window.qmGroupByArticle(g.items) : (g.items || []).map(it => ({
      single: it
    }));
    var itemRow = it => /*#__PURE__*/React.createElement("tr", {
      key: it.id
    }, /*#__PURE__*/React.createElement("td", {
      className: "sa-mx-unitcol"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sa-mx-title"
    }, it.title), window.getQuizItems && window.getQuizItems([it]).length === 0 && /*#__PURE__*/React.createElement("span", {
      className: "sa-mx-empty",
      title: "\u9019\u500B\u55AE\u5143\u9084\u6C92\u6709\u984C\u76EE\uFF0C\u5B78\u751F\u9801\u4E0D\u6703\u986F\u793A\u3002\u5230\u984C\u5EAB\u9EDE\u925B\u7B46\u88DC\u984C\u76EE\u3002"
    }, "\u26A0 \u6C92\u6709\u984C\u76EE"), /*#__PURE__*/React.createElement("button", {
      className: "sa-mx-all",
      disabled: busy,
      onClick: () => toggleRow(it.id),
      title: "\u9019\u500B\u55AE\u5143\uFF1A\u5168\u73ED\u4E00\u9375\u767C\u6D3E\uFF0F\u53D6\u6D88"
    }, "\u5168\u73ED")), active.map(stu => {
      var onIt = setOf(stu).has(it.id);
      return /*#__PURE__*/React.createElement("td", {
        key: stu.email,
        className: "sa-mx-cell"
      }, /*#__PURE__*/React.createElement("button", {
        className: `sa-mx-chk${onIt ? ' on' : ''}`,
        onClick: () => toggleCell(stu, it.id),
        "aria-label": `${stu.name || stu.email} · ${it.title}${onIt ? '（已發派）' : ''}`
      }, onIt ? '✓' : ''));
    }));
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: g.cat.id
    }, /*#__PURE__*/React.createElement("tr", {
      className: "sa-mx-cat"
    }, /*#__PURE__*/React.createElement("td", {
      colSpan: active.length + 1
    }, /*#__PURE__*/React.createElement("span", {
      className: "sa-mx-cat-name"
    }, g.cat.titleZh))), ags.map((ag, agi) => ag.items ? /*#__PURE__*/React.createElement(React.Fragment, {
      key: ag.key || 'g' + agi
    }, /*#__PURE__*/React.createElement("tr", {
      className: "sa-mx-agroup"
    }, /*#__PURE__*/React.createElement("td", {
      colSpan: active.length + 1
    }, /*#__PURE__*/React.createElement("span", {
      className: "sa-mx-agroup-name"
    }, "\uD83D\uDCC4 ", ag.name || '（未分組）'), /*#__PURE__*/React.createElement("span", {
      className: "sa-mx-agroup-n"
    }, ag.items.length, " \u500B\u55AE\u5143"), /*#__PURE__*/React.createElement("button", {
      className: "sa-mx-agroup-all",
      disabled: busy,
      onClick: () => toggleGroup(ag.items),
      title: "\u9019\u4E00\u6574\u7D44\uFF08\u6574\u7BC7\uFF09\uFF1A\u5168\u73ED\u4E00\u9375\u767C\u6D3E\uFF0F\u53D6\u6D88"
    }, "\u6574\u7D44\u5168\u73ED"))), ag.items.map(itemRow)) : itemRow(ag.single)));
  })))), /*#__PURE__*/React.createElement("p", {
    className: "cwo-hint"
  }, "\u683C\u5B50\u6253\u52FE\uFF1D\u767C\u6D3E\u7D66\u8A72\u5B78\u751F\uFF1B\u300C\u5168\u73ED\u300D\uFF1D\u6574\u5217\u4E00\u9375\u767C\u6D3E\uFF0F\u53D6\u6D88\uFF1B\u9EDE\u5B78\u751F\u540D\u5B57\uFF1D\u8A72\u751F\u672C\u9031\u5168\u9078\uFF0F\u6E05\u7A7A\uFF1B\u6B04\u982D\u300C\uFF0B\u300D\uFF1D\u76F4\u63A5\u51FA\u984C\u7D66\u4ED6\u3002"), compose && !compose.catId && /*#__PURE__*/React.createElement("div", {
    className: "report-modal-overlay",
    onClick: e => {
      if (e.target === e.currentTarget) setCompose(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "report-modal sa-compose"
  }, /*#__PURE__*/React.createElement("div", {
    className: "report-modal-head"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "report-modal-title"
  }, "\uFF0B \u51FA\u984C\u7D66 ", shortName(compose.stu)), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => setCompose(null)
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("p", {
    className: "sa-compose-hint"
  }, "\u9078\u64C7\u5206\u985E\u5F8C\u958B\u555F\u51FA\u984C\u7DE8\u8F2F\u5668\u2014\u2014\u5132\u5B58\u5F8C\u6703\u5B58\u9032\u984C\u5EAB\uFF0C\u4E26", /*#__PURE__*/React.createElement("b", null, "\u81EA\u52D5\u767C\u6D3E\u7D66 ", shortName(compose.stu)), "\uFF08\u4E4B\u5F8C\u4E5F\u80FD\u5728\u77E9\u9663\u52FE\u7D66\u5176\u4ED6\u5B78\u751F\uFF09\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "sa-compose-cats"
  }, cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    onClick: () => startCompose(c.id)
  }, c.titleZh))))), compose && compose.catId && compose.draft && window.EditorModal && /*#__PURE__*/React.createElement(window.EditorModal, {
    open: true,
    draft: compose.draft,
    weekId: (lib.order || []).find(id => String(id).endsWith(sfx)) || '',
    catItems: libWeekOf(sfx) && libWeekOf(sfx).items && libWeekOf(sfx).items[compose.catId] || [],
    onClose: () => setCompose(null),
    onSave: saveCompose,
    onDelete: () => setCompose(null)
  }));
}

/* ── Roster management tab (學生名單) ──────────────────── */
/* ══ 📅 v497 固定課表 ═══════════════════════════════════════════════════
   Alan 2026-10-13 給了整份課表，連著兩次更正打掉我的假設：
     ① 他先說「我是一對一」→ 實際上 Elvis & Elory、Joyce & Lydia 是**兩人一起上**
     ② 我以為同一行就是一起上 → 「Eric & Tayler 只是兄弟我寫在一起，時間是分開的」
   所以：**同一個時段寫兩個名字，不代表一起上**。
   每個時段都能切「一起上／分開上」，而且整列都能直接改（含把一個時段拆成兩堂），
   我不去猜他怎麼切時間。 */
function TimetableCard({
  roster,
  tt,
  onSave
}) {
  var [open, setOpen] = useDash(false);
  var [paste, setPaste] = useDash('');
  var [msg, setMsg] = useDash('');
  var [twins, setTwins] = useDash([]); // 名單裡長得很像的名字，要人工確認
  var [lost, setLost] = useDash([]); // 貼上時沒對到人的名字（v500：這個一定要留在畫面上）
  var slots = tt && tt.slots || [];
  var nameOf = e => {
    var s = (roster || []).find(x => x.email === e);
    return s && s.name || e;
  };
  /* ⚠ Alan 的名單裡有 Elroy（G6）跟 Elory（G4）——只差一個字母的位置。
     名字旁邊一律標年級，才看得出來那一格對到的是哪一個。 */
  /* ⚠ v499：名單的 grade 欄常常是空的——康橋學號 email（le12…＝G4）才是唯一依據
     （data.js 的 gradeFromEmail，v399 之後學生端就是靠它分班）。
     不回退的話，進度表會對不到年級而整個不顯示，而且**不會報錯**。 */
  var gradeOf = e => {
    var s = (roster || []).find(x => x.email === e);
    var g = s && s.grade || window.gradeFromEmail && window.gradeFromEmail(e) || '';
    return g ? String(g).toUpperCase() : '';
  };
  var put = next => onSave({
    slots: next
  });
  var upd = (id, patch) => put(slots.map(s => s.id === id ? {
    ...s,
    ...patch
  } : s));
  var del = id => put(slots.filter(s => s.id !== id));
  var add = () => put(slots.concat([{
    id: 's' + Date.now().toString(36),
    day: 1,
    start: '18:00',
    end: '20:00',
    students: [],
    together: false
  }]));
  /* 把一個時段切成前後兩堂——Eric & Tayler 那種「同一個區塊但分開上」用得到。
     ⚠ 平分只是起點，Alan 自己再把時間調成實際的。 */
  var split = s => {
    var mins = t => {
      var [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    var fmt = v => String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0');
    var mid = fmt(Math.round((mins(s.start) + mins(s.end)) / 2 / 5) * 5);
    var a = {
      ...s,
      end: mid,
      students: s.students.slice(0, 1),
      together: false
    };
    var b = {
      ...s,
      id: s.id + 'b',
      start: mid,
      students: s.students.slice(1),
      together: false
    };
    put(slots.flatMap(x => x.id === s.id ? [a, b] : [x]));
  };
  var doPaste = () => {
    var r = window.timetableParse(paste, roster);
    if (!r) {
      setMsg('讀不出來——格式像這樣：「星期一」換行「Elroy：18:00–20:00」');
      return;
    }
    put(r.slots);
    /* 🔴 v500：本來只用一行 setMsg 帶過，Alan 整個滑過去——
       結果 12 個時段裡有 10 位學生沒對上，而畫面看起來一切正常。
       沒對到的名字要**留在畫面上**，而且要看得出來少了幾位。 */
    setMsg(`建好 ${r.slots.length} 個時段 ✓`);
    setLost(r.unknown || []);
    setTwins(r.twins || []);
    setPaste('');
  };
  var hrs = window.timetableHours ? window.timetableHours(tt) : 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "tt"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tt-bar",
    onClick: () => setOpen(v => !v)
  }, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDCC5 \u56FA\u5B9A\u8AB2\u8868"), /*#__PURE__*/React.createElement("span", {
    className: "tt-sum"
  }, slots.length, " \u500B\u6642\u6BB5 \xB7 \u4E00\u9031 ", hrs.toFixed(1), " \u5C0F\u6642"), /*#__PURE__*/React.createElement("span", {
    className: "tt-chev"
  }, open ? '收起 ⌃' : '展開 ⌄')), open && /*#__PURE__*/React.createElement("div", {
    className: "tt-body"
  }, msg && /*#__PURE__*/React.createElement("div", {
    className: "tt-msg"
  }, msg), lost.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "tt-lost"
  }, /*#__PURE__*/React.createElement("b", null, "\u26A0\uFE0F \u6709 ", lost.length, " \u500B\u540D\u5B57\u5728\u5B78\u751F\u540D\u55AE\u88E1\u627E\u4E0D\u5230\uFF1A", lost.join('、')), /*#__PURE__*/React.createElement("span", null, "\u90A3\u5E7E\u5802\u73FE\u5728\u6C92\u6709\u5B78\u751F\u3002\u8981\u561B\u5230\u300C\u5B78\u751F\u540D\u55AE\u300D\u78BA\u8A8D\u62FC\u6CD5\uFF0C \u8981\u561B\u5728\u4E0B\u9762\u90A3\u4E00\u683C\u76F4\u63A5\u7528\u300C\uFF0B \u52A0\u5B78\u751F\u300D\u9078\u3002"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setLost([])
  }, "\u6211\u8655\u7406\u597D\u4E86")), (() => {
    var empty = slots.filter(x => !(x.students || []).length).length;
    return empty > 0 ? /*#__PURE__*/React.createElement("div", {
      className: "tt-lost soft"
    }, "\u9084\u6709 ", /*#__PURE__*/React.createElement("b", null, empty), " \u500B\u6642\u6BB5\u6C92\u6709\u5B78\u751F\u2014\u2014\u90A3\u5E7E\u5802\u8A18\u4E0D\u4E86\u8AB2\u3002") : null;
  })(), twins.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "tt-twin"
  }, "\u26A0\uFE0F \u540D\u55AE\u88E1\u6709\u9577\u5F97\u5F88\u50CF\u7684\u540D\u5B57\uFF1A", /*#__PURE__*/React.createElement("b", null, twins.join('、')), "\u2014\u2014 \u8ACB\u4E00\u683C\u4E00\u683C\u78BA\u8A8D\u5C0D\u5230\u7684\u662F\u6B63\u78BA\u7684\u4EBA\uFF08\u540D\u5B57\u65C1\u908A\u6709\u5E74\u7D1A\u53EF\u4EE5\u5C0D\u7167\uFF09\u3002", /*#__PURE__*/React.createElement("button", {
    onClick: () => setTwins([])
  }, "\u6211\u78BA\u8A8D\u904E\u4E86")), /*#__PURE__*/React.createElement("div", {
    className: "tt-grid"
  }, window.TT_DAYS.map((d, i) => {
    var day = window.timetableOfDay(tt, i);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "tt-day"
    }, /*#__PURE__*/React.createElement("div", {
      className: "tt-day-h"
    }, "\u9031", d, day.length === 0 && /*#__PURE__*/React.createElement("em", null, "\u6C92\u6709\u8AB2")), day.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.id,
      className: 'tt-slot' + ((s.students || []).length ? '' : ' empty')
    }, /*#__PURE__*/React.createElement("div", {
      className: "tt-slot-t"
    }, /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: s.start,
      onChange: e => upd(s.id, {
        start: e.target.value
      })
    }), /*#__PURE__*/React.createElement("span", null, "\u2013"), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: s.end,
      onChange: e => upd(s.id, {
        end: e.target.value
      })
    }), /*#__PURE__*/React.createElement("select", {
      value: s.day,
      onChange: e => upd(s.id, {
        day: Number(e.target.value)
      })
    }, window.TT_DAYS.map((x, k) => /*#__PURE__*/React.createElement("option", {
      key: k,
      value: k
    }, "\u9031", x)))), /*#__PURE__*/React.createElement("div", {
      className: "tt-slot-s"
    }, (s.students || []).map(e => /*#__PURE__*/React.createElement("span", {
      key: e,
      className: "tt-chip"
    }, nameOf(e), gradeOf(e) && /*#__PURE__*/React.createElement("i", null, gradeOf(e)), /*#__PURE__*/React.createElement("button", {
      onClick: () => upd(s.id, {
        students: s.students.filter(x => x !== e)
      })
    }, "\u2715"))), /*#__PURE__*/React.createElement("select", {
      value: "",
      onChange: e => {
        var v = e.target.value;
        if (!v) return;
        upd(s.id, {
          students: (s.students || []).concat([v])
        });
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\uFF0B \u52A0\u5B78\u751F"), (roster || []).filter(x => x.active !== false && (s.students || []).indexOf(x.email) < 0).map(x => /*#__PURE__*/React.createElement("option", {
      key: x.email,
      value: x.email
    }, x.name || x.email, x.grade ? `（${String(x.grade).toUpperCase()}）` : '')))), /*#__PURE__*/React.createElement("div", {
      className: "tt-slot-f"
    }, (s.students || []).length > 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
      className: "tt-tog"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!s.together,
      onChange: e => upd(s.id, {
        together: e.target.checked
      })
    }), "\u4E00\u8D77\u4E0A\uFF08\u8A18\u4E00\u6B21\u3001\u5169\u4EBA\u5171\u7528\u5167\u5BB9\uFF09"), !s.together && /*#__PURE__*/React.createElement("button", {
      className: "tt-mini",
      onClick: () => split(s)
    }, "\u62C6\u6210\u5169\u5802")), /*#__PURE__*/React.createElement("span", {
      className: "tt-gap"
    }), /*#__PURE__*/React.createElement("button", {
      className: "tt-mini del",
      onClick: () => del(s.id)
    }, "\u522A\u6389")))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "tt-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: add
  }, "\uFF0B \u65B0\u589E\u6642\u6BB5"), /*#__PURE__*/React.createElement("details", {
    className: "tt-paste"
  }, /*#__PURE__*/React.createElement("summary", null, "\u6574\u4EFD\u8CBC\u4E0A\uFF08\u6BCF\u5B78\u671F\u8ABF\u6574\u6642\u6700\u5FEB\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    value: paste,
    onChange: e => setPaste(e.target.value),
    placeholder: '星期一\nElroy：18:00–20:00\nElvis & Elory：20:00–22:00\n\n星期二\n…'
  }), /*#__PURE__*/React.createElement("div", {
    className: "tt-paste-f"
  }, /*#__PURE__*/React.createElement("span", null, "\u26A0 \u6703\u6574\u4EFD\u53D6\u4EE3\u73FE\u6709\u8AB2\u8868\u3002\u540C\u4E00\u884C\u5BEB\u5169\u500B\u540D\u5B57\u6642\uFF0C\u9810\u8A2D\u7576\u6210\u300C\u4E00\u8D77\u4E0A\u300D\uFF0C\u8CBC\u5B8C\u518D\u81EA\u5DF1\u5207\u6389\u3002"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: !paste.trim(),
    onClick: doPaste
  }, "\u5EFA\u7ACB\u8AB2\u8868"))))));
}

/* ══ 🏫 v501 三個年級的進度表狀態 ═══════════════════════════════════
   Alan：「哪邊可以匯入三個年級進度表？」
   本來只在網站的編輯模式裡（切年級→進編輯→⋯更多→🏫，三個年級要切三次）。
   他的學生橫跨 G3／G4／G6，所以直接在這裡把三個年級的狀態一次列出來，
   哪個沒匯就點哪個。 */
function PacingStrip({
  grades,
  onOpen
}) {
  var [map, setMap] = useDash({});
  useDashE(() => {
    if (!window.subscribePacing || !grades.length) return;
    var offs = grades.map(g => window.subscribePacing(g, p => setMap(m => ({
      ...m,
      [g]: p ? p.length : 0
    }))));
    return () => offs.forEach(f => {
      try {
        f && f();
      } catch (e) {}
    });
  }, [grades.join()]);
  if (!grades.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "pstrip"
  }, /*#__PURE__*/React.createElement("b", null, "\uD83C\uDFEB \u5B78\u6821\u9032\u5EA6\u8868"), grades.map(g => {
    var n = map[g];
    return /*#__PURE__*/React.createElement("button", {
      key: g,
      className: 'pstrip-g' + (n ? ' ok' : ' no'),
      onClick: () => onOpen(g)
    }, g.toUpperCase(), /*#__PURE__*/React.createElement("em", null, n == null ? '讀取中…' : n ? `${n} 週 ✓` : '未匯入'));
  }), /*#__PURE__*/React.createElement("span", {
    className: "pstrip-tip"
  }, "\u6C92\u532F\u5165\u7684\u8A71\uFF0C\u4E0A\u8AB2\u7D00\u9304\u88E1\u5C31\u770B\u4E0D\u5230\u300C\u5B78\u6821\u9019\u9031\u5728\u6559\u4EC0\u9EBC\u300D"));
}

/* ══ 📒 v496 上課紀錄 ═══════════════════════════════════════════════════
   Alan 一對一教學，每個學生固定時段上課。他要記的是：
   這次上了什麼／掌握度幾 %／功課／下次進度。

   ⭐ 這個畫面的重點是**少打字**，不是欄位多：
     · 日期自動帶下一個固定時段
     · **上一堂寫的「下次進度」自動填進這一堂的「這次上了什麼」**
     · 學校那一週在教什麼自動顯示（接 v493 的進度表，照學生的年級抓）
   ⚠ 老師私人備註（note）跟其他欄位分開——之後要給家長看時不給看。 */
function LessonLog({
  roster,
  myEmail
}) {
  /* 🔴 v500（Alan 截到「為什麼我的畫面只有這些學生？而且有些不是我的學生」）：
     v496 用 roster 的 `teacher` 欄位篩「我的學生」——**那個欄位記的是「誰把他加進名單的」**
     （addRosterStudent 寫的是 owner），不是「誰在教他」。
     結果：別的老師加的學生跑進來、他自己真正的學生反而被擋掉。
     ⭐ 改用**課表**判斷：排在課表裡的就是他在教的，這個訊號自己會維護
       （加一個學生到課表，他就出現；不用再去維護一個欄位）。
     課表還沒建時退回「全部在用中的學生」，不然第一次進來是空的。 */
  var all = (roster || []).filter(st => st.active !== false);
  var [showAll, setShowAll] = useDash(false);
  var [who, setWho] = useDash(null);
  var [doc, setDoc] = useDash(null);
  var [pace, setPace] = useDash(null);
  var [editing, setEditing] = useDash(null); // 正在編的那一堂（date）
  var [draft, setDraft] = useDash(null);
  var [msg, setMsg] = useDash('');
  var [tt, setTt] = useDash(null); // v497 固定課表
  var [paceFor, setPaceFor] = useDash(null); // v501：在這裡就能匯入學校進度表
  var [aiBusy, setAiBusy] = useDash(false); // v512：AI 擬草稿
  var [aiWarn, setAiWarn] = useDash(null); // v512：草稿裡對不上學校進度表的頁碼
  var [aiUndo, setAiUndo] = useDash(null); // v512：套用前的內容（按錯了可以還原）
  useDashE(() => {
    if (!window.subscribeTimetable) return;
    return window.subscribeTimetable(setTt);
  }, []);
  var inTT = useDashM(() => {
    var ids = new Set((tt && tt.slots || []).flatMap(s => s.students || []));
    return all.filter(st => ids.has(st.email));
  }, [tt, roster]);
  var list = showAll || !inTT.length ? all : inTT;
  var stu = list.find(x => x.email === who) || null;
  useDashE(() => {
    setDoc(null);
    setEditing(null);
    setDraft(null);
    if (!who || !window.subscribeLessons) return;
    return window.subscribeLessons(who, setDoc);
  }, [who]);
  /* 年級：名單沒填就用學號 email 算（見 TimetableCard 的 gradeOf 說明）。 */
  var gradeKey = stu ? stu.grade || window.gradeFromEmail && window.gradeFromEmail(stu.email) || '' || '' : '';
  useDashE(() => {
    setPace(null);
    if (!gradeKey || !window.subscribePacing) return;
    return window.subscribePacing(gradeKey, setPace);
  }, [gradeKey]);
  var rows = window.lessonRows ? window.lessonRows(doc) : [];
  var avg = window.lessonAvgPct ? window.lessonAvgPct(doc, 5) : null;
  var slot = doc && doc.slot || null;
  var DAYS = ['日', '一', '二', '三', '四', '五', '六'];
  var paceOf = dateISO => {
    if (!pace || !window.lessonWeekOf) return null;
    var n = window.lessonWeekOf(dateISO);
    return pace.find(w => w.n === n) || null;
  };
  var openNew = () => {
    setAiWarn(null);
    setAiUndo(null);
    /* ⚠ v497：本來用 lessonNextDate(單一固定時段)，但 Alan 多數學生**一週兩堂**
       （Eric 二＋四、Nick 三＋日…）→ 要在他所有時段裡挑最近的那一個。 */
    var date = tt && window.timetableNextDate ? window.timetableNextDate(tt, who) : window.lessonNextDate(slot);
    var prev = window.lessonPrev(doc, date);
    setEditing(date);
    /* ⭐ 上一堂的「下次進度」自動變成這一堂的「這次上了什麼」——
       課堂之間自己接起來，Alan 不用再翻上一次寫了什麼。 */
    setDraft({
      kind: 'normal',
      pct: 80,
      did: prev && prev.next || '',
      hw: '',
      next: '',
      note: ''
    });
  };
  var openEdit = r => {
    setEditing(r.date);
    setDraft({
      ...r
    });
  };
  /* ══ v543 聊天室交下來的一堂 ═══════════════════════════════════════
     Alan：「今天 Nick 我的上課內容是：中師 … 外師 …」
     以前只是把後台開到這一頁（學生沒選、欄位全空），他還要整段重打一次。
     ⭐ 現在：選好學生 → 開一堂新的 → 把他打的字直接放進「這次上了什麼」。
     ⚠ 功課與下次進度**刻意留空**：那兩欄要照學校進度表擬（頁碼要把關），
       按「🪄 幫我擬草稿」才生——AI 不可以憑空編頁碼給家長。 */
  var fromAsk = React.useRef(null);
  useDashE(() => {
    var g = null;
    try {
      g = window.__lessonDraft;
      window.__lessonDraft = null;
    } catch (e) {}
    if (!g || !g.email) return;
    fromAsk.current = g;
    setShowAll(true); // ⚠ 不在固定課表裡的孩子也要選得到
    setWho(g.email);
  }, []);
  useDashE(() => {
    var g = fromAsk.current;
    if (!g || who !== g.email) return;
    /* ⚠ 等課表或這個孩子的紀錄其中一邊回來再開——日期是從課表算的，
       太早開會抓到預設時段（記到錯的日期比沒填還糟）。 */
    if (tt === null && doc === null) return;
    fromAsk.current = null;
    openNew();
    if (g.did) setDraft(x => x ? {
      ...x,
      did: g.did
    } : x);
    setMsg('已經把你說的內容填進「這次上了什麼」——功課與下次進度按 🪄 擬草稿，或自己打。');
  }, [who, tt, doc]);

  /* 🪄 v512：擬草稿。材料全都是系統裡現成的——學校這週／下週的進度、上一堂寫了什麼、
     上次交代的功課做了沒。AI 只負責寫成他會寫的句子，以及把功課與下次進度一起擬出來
     （那兩欄本來每次都要重打）。
     🔴 頁碼一定要跟學校進度表對過：編出來的頁碼看起來完全正常，但小孩會整份寫錯。 */
  var aiDraft = async () => {
    if (!editing || !draft || !window.aiDraftLesson) return;
    setAiBusy(true);
    setAiWarn(null);
    setMsg('');
    try {
      var n = window.lessonWeekOf(editing);
      var cur = paceOf(editing);
      var nextWk = pace ? pace.find(w => w.n === n + 1) || null : null;
      var pv = window.lessonPrev(doc, editing);
      var rv = (window.REVIEW_STATES || []).find(x => x.id === draft.review);
      var got = await window.aiDraftLesson({
        name: stu && stu.name || '',
        grade: gradeKey,
        dateISO: editing,
        weekNo: n,
        cur,
        nextWk,
        prev: pv,
        review: rv ? rv.zh : ''
      });
      if (!got) {
        setMsg('擬不出來——通常是這一週還沒有學校進度表，或網路不穩。');
        setAiBusy(false);
        return;
      }
      setAiUndo({
        did: draft.did || '',
        hw: draft.hw || '',
        next: draft.next || ''
      });
      setDraft(x => ({
        ...x,
        did: got.did || x.did,
        hw: got.hw || x.hw,
        next: got.next || x.next
      }));
      if ((got.badPages || []).length) setAiWarn(got.badPages);
    } catch (e) {
      setMsg('擬不出來，等一下再試一次。');
    }
    setAiBusy(false);
  };
  /* 這一堂跟誰一起上（只有課表標記「一起上」的才算）。 */
  var buddiesOf = dateISO => {
    if (!tt || !window.timetableSlotOn) return [];
    var sl = window.timetableSlotOn(tt, who, dateISO);
    return sl && sl.together ? (sl.students || []).filter(e => e !== who) : [];
  };
  var save = async () => {
    if (!editing || !draft) return;
    try {
      var base = {
        wk: window.lessonWeekOf(editing),
        kind: draft.kind,
        pct: draft.kind === 'off' ? null : Number(draft.pct),
        review: draft.review || '',
        did: draft.did || '',
        prev: draft.prev || '',
        hw: draft.hw || '',
        next: draft.next || '',
        note: draft.note || ''
      };
      await window.saveLesson(who, editing, base);
      /* ⭐ v497（Alan：「只有 Elvis & Elory、Joyce & Lydia 一起上課」）：
         一起上的那一堂，**共用的內容複製給同伴**（上了什麼／功課／下次進度），
         但 **掌握度與備註不複製**——那是每個孩子各自的，要分別填。 */
      var mates = buddiesOf(editing);
      for (var m of mates) {
        await window.saveLesson(m, editing, {
          wk: base.wk,
          kind: base.kind,
          did: base.did,
          prev: base.prev,
          hw: base.hw,
          next: base.next,
          pct: null,
          review: '',
          note: ''
        });
      }
      setEditing(null);
      setDraft(null);
      setMsg(mates.length ? `已儲存 ✓ 共用內容也記給了 ${mates.map(e => {
        var st = list.find(x => x.email === e);
        return st && st.name || e;
      }).join('、')}（掌握度與備註請各自填）` : '已儲存 ✓');
      setTimeout(() => setMsg(''), 4200);
    } catch (e) {
      setMsg('存檔失敗：' + (e && e.message || ''));
    }
  };
  var copyParent = r => {
    var t = window.lessonParentText(r, stu && stu.name, paceOf(r.date));
    try {
      navigator.clipboard.writeText(t);
      setMsg('已複製給家長的摘要 ✓');
      setTimeout(() => setMsg(''), 2200);
    } catch (e) {
      setMsg('複製失敗，請手動選取');
    }
  };
  var pctCls = p => p >= 85 ? 'hi' : p >= 60 ? 'mid' : 'lo';

  /* 學生實際橫跨哪幾個年級（Alan 現在是 G3／G4／G6）——只訂閱這幾個，不要全部六個。 */
  var gradesInUse = useDashM(() => {
    var g = new Set();
    list.forEach(st => {
      var k = (st.grade || window.gradeFromEmail && window.gradeFromEmail(st.email) || '').toLowerCase();
      if (/^g[1-6]$/.test(k)) g.add(k);
    });
    return [...g].sort();
  }, [list]);
  var todayISO = window.lessonISO(new Date());
  var todaySlots = tt && window.timetableOfDay ? window.timetableOfDay(tt, new Date().getDay()) : [];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TimetableCard, {
    roster: all,
    tt: tt,
    onSave: x => window.saveTimetable(x)
  }), /*#__PURE__*/React.createElement(PacingStrip, {
    grades: gradesInUse,
    onOpen: setPaceFor
  }), window.PacingImportModal && /*#__PURE__*/React.createElement(window.PacingImportModal, {
    open: !!paceFor,
    gradeKey: paceFor || '',
    gradeName: String(paceFor || '').toUpperCase(),
    existing: paceFor === gradeKey ? pace : null,
    onClose: () => setPaceFor(null),
    onSave: async (g, weeks) => {
      await window.savePacing(g, weeks);
      setMsg(`🏫 ${String(g).toUpperCase()} 進度表已存（${weeks.length} 週）`);
      setTimeout(() => setMsg(''), 3000);
    }
  }), todaySlots.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ll2-today"
  }, /*#__PURE__*/React.createElement("b", null, "\u4ECA\u5929\uFF08\u9031", window.TT_DAYS[new Date().getDay()], "\uFF09\u6709 ", todaySlots.length, " \u5802"), todaySlots.map(sl => /*#__PURE__*/React.createElement("span", {
    key: sl.id,
    className: "ll2-today-s"
  }, sl.start, "\u2013", sl.end, (sl.students || []).map(e => {
    var st = list.find(x => x.email === e);
    return /*#__PURE__*/React.createElement("button", {
      key: e,
      className: 'll2-today-b' + (who === e ? ' on' : ''),
      onClick: () => setWho(e)
    }, st && st.name || e);
  }), sl.together && /*#__PURE__*/React.createElement("em", null, "\u4E00\u8D77")))), /*#__PURE__*/React.createElement("div", {
    className: "ll2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ll2-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ll2-side-h"
  }, "\u5B78\u751F\uFF08", list.length, "\uFF09", inTT.length > 0 && inTT.length < all.length && /*#__PURE__*/React.createElement("button", {
    className: "ll2-all",
    onClick: () => setShowAll(v => !v)
  }, showAll ? '只看課表上的' : `全部 ${all.length}`)), list.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "ll2-empty"
  }, "\u540D\u55AE\u88E1\u9084\u6C92\u6709\u5B78\u751F\u2014\u2014\u5148\u5230\u300C\u5B78\u751F\u540D\u55AE\u300D\u52A0\u3002"), list.map(st => /*#__PURE__*/React.createElement("button", {
    key: st.email,
    className: 'll2-stu' + (who === st.email ? ' on' : ''),
    onClick: () => setWho(st.email)
  }, /*#__PURE__*/React.createElement("b", null, st.name || st.email), /*#__PURE__*/React.createElement("em", null, String(st.grade || '').toUpperCase(), (() => {
    var n = tt && window.timetableOfStudent ? window.timetableOfStudent(tt, st.email).length : 0;
    return n ? ` · 週${n}堂` : '';
  })())))), /*#__PURE__*/React.createElement("div", {
    className: "ll2-main"
  }, !stu ? /*#__PURE__*/React.createElement("div", {
    className: "ll2-pick"
  }, "\u2190 \u5DE6\u908A\u9078\u4E00\u4F4D\u5B78\u751F") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ll2-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ll2-head-l"
  }, /*#__PURE__*/React.createElement("h3", null, stu.name || stu.email), /*#__PURE__*/React.createElement("span", {
    className: "ll2-grade"
  }, gradeKey.toUpperCase() || '沒有年級'), avg != null && /*#__PURE__*/React.createElement("span", {
    className: 'll2-avg ' + pctCls(avg)
  }, "\u8FD1 5 \u5802\u5E73\u5747 ", avg, "%"), gradeKey && (pace ? /*#__PURE__*/React.createElement("button", {
    className: "ll2-pace-ok",
    onClick: () => setPaceFor(gradeKey)
  }, "\uD83C\uDFEB ", gradeKey.toUpperCase(), " \u9032\u5EA6\u8868 ", pace.length, " \u9031 \xB7 \u91CD\u65B0\u532F\u5165") : /*#__PURE__*/React.createElement("button", {
    className: "ll2-nopace",
    onClick: () => setPaceFor(gradeKey)
  }, "\uD83C\uDFEB ", gradeKey.toUpperCase(), " \u9084\u6C92\u532F\u5165\u5B78\u6821\u9032\u5EA6\u8868 \u2014 \u9EDE\u9019\u88E1\u532F\u5165"))), /*#__PURE__*/React.createElement("div", {
    className: "ll2-head-r"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ll2-slot"
  }, "\u56FA\u5B9A\u6642\u6BB5", /*#__PURE__*/React.createElement("select", {
    value: slot ? slot.day : '',
    onChange: e => {
      var v = e.target.value;
      window.saveLessonSlot(who, v === '' ? null : {
        day: Number(v),
        time: slot && slot.time || ''
      });
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u672A\u8A2D\u5B9A"), DAYS.map((d, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, "\u9031", d))), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: slot && slot.time || '',
    disabled: !slot,
    onChange: e => window.saveLessonSlot(who, {
      day: slot.day,
      time: e.target.value
    })
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: openNew
  }, "\uFF0B \u65B0\u589E\u4E00\u5802"))), msg && /*#__PURE__*/React.createElement("div", {
    className: "ll2-msg"
  }, msg), editing && draft && (() => {
    var p = paceOf(editing);
    return /*#__PURE__*/React.createElement("div", {
      className: "ll2-form"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ll2-form-h"
    }, /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: editing,
      onChange: e => {
        var d = e.target.value;
        if (!d) return;
        var prev = window.lessonPrev(doc, d);
        setEditing(d);
        setDraft(x => ({
          ...x,
          did: x.did || prev && prev.next || ''
        }));
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "ll2-wk"
    }, "\u7B2C ", window.lessonWeekOf(editing), " \u9031"), /*#__PURE__*/React.createElement("span", {
      className: "ll2-gap"
    }), window.LESSON_KINDS.map(k => /*#__PURE__*/React.createElement("button", {
      key: k.id,
      className: 'll2-kind' + (draft.kind === k.id ? ' on' : ''),
      onClick: () => setDraft(x => ({
        ...x,
        kind: k.id
      }))
    }, k.ico, " ", k.zh))), p && (() => {
      var C = window.pacingClean,
        B = window.pacingBooks;
      var books = side => B(side).map((x, i) => /*#__PURE__*/React.createElement("span", {
        key: i,
        className: "ll2-bk"
      }, /*#__PURE__*/React.createElement("em", null, x.book), x.pages));
      return /*#__PURE__*/React.createElement("div", {
        className: "ll2-pace"
      }, /*#__PURE__*/React.createElement("div", {
        className: "ll2-pl"
      }, /*#__PURE__*/React.createElement("b", null, "\u5916\u5E2B"), /*#__PURE__*/React.createElement("span", {
        className: "ll2-main2"
      }, p.it.reading || '—'), p.it.vocab && /*#__PURE__*/React.createElement("span", {
        className: "ll2-part"
      }, p.it.vocab), p.it.wordStudy && /*#__PURE__*/React.createElement("span", {
        className: "ll2-tp"
      }, C(p.it.wordStudy)), p.it.skill && /*#__PURE__*/React.createElement("span", {
        className: "ll2-tp"
      }, C(p.it.skill))), B(p.it).length > 0 && /*#__PURE__*/React.createElement("div", {
        className: "ll2-pl bk"
      }, "\uD83D\uDCD5 ", books(p.it)), /*#__PURE__*/React.createElement("div", {
        className: "ll2-pl"
      }, /*#__PURE__*/React.createElement("b", null, "\u4E2D\u5E2B"), /*#__PURE__*/React.createElement("span", {
        className: "ll2-main2"
      }, C(p.lt.grammar) || '—'), p.lt._carry && p.lt.grammarHw && /*#__PURE__*/React.createElement("span", {
        className: "ll2-tp carry"
      }, "\u21A9 \u4F5C\u696D\u662F ", C(p.lt.grammarHw)), p.lt.grammarBold && /*#__PURE__*/React.createElement("span", {
        className: "ll2-bold"
      }, "\u53EA\u6559 pp. ", p.lt.grammarBold.join(', '))), B(p.lt).length > 0 && /*#__PURE__*/React.createElement("div", {
        className: "ll2-pl bk"
      }, "\uD83D\uDCD5 ", books(p.lt)), p.note && /*#__PURE__*/React.createElement("div", {
        className: "ll2-note"
      }, "\uD83D\uDCC5 ", p.note), /*#__PURE__*/React.createElement("button", {
        className: "ll2-use",
        onClick: () => setDraft(x => ({
          ...x,
          did: (x.did ? x.did + '\n' : '') + [p.it.reading && `${p.it.reading}${p.it.vocab ? ' ' + p.it.vocab : ''}`, C(p.it.wordStudy), C(p.it.skill), C(p.lt.grammarHw)].filter(Boolean).join('、')
        }))
      }, "\u2193 \u5E36\u9032\u300C\u9019\u6B21\u4E0A\u4E86\u4EC0\u9EBC\u300D"));
    })(), (() => {
      var mates = buddiesOf(editing);
      if (!mates.length) return null;
      var nm = mates.map(e => {
        var st = list.find(x => x.email === e);
        return st && st.name || e;
      });
      return /*#__PURE__*/React.createElement("div", {
        className: "ll2-mate"
      }, "\uD83D\uDC65 \u9019\u4E00\u5802\u8DDF ", /*#__PURE__*/React.createElement("b", null, nm.join('、')), " \u4E00\u8D77\u4E0A\u2014\u2014 \u5B58\u6A94\u6642\u300C\u4E0A\u4E86\u4EC0\u9EBC\uFF0F\u529F\u8AB2\uFF0F\u4E0B\u6B21\u9032\u5EA6\u300D\u6703\u4E00\u8D77\u8A18\u7D66\u4ED6\uFF0C", /*#__PURE__*/React.createElement("b", null, "\u638C\u63E1\u5EA6\u8207\u5099\u8A3B\u4E0D\u6703"), "\uFF08\u90A3\u8981\u5404\u81EA\u586B\uFF09\u3002");
    })(), draft.kind !== 'off' && /*#__PURE__*/React.createElement("div", {
      className: "ll2-pct"
    }, /*#__PURE__*/React.createElement("label", null, "\u638C\u63E1\u5EA6"), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: draft.pct,
      onChange: e => setDraft(x => ({
        ...x,
        pct: Number(e.target.value)
      }))
    }), /*#__PURE__*/React.createElement("b", {
      className: pctCls(draft.pct)
    }, draft.pct, "%"), /*#__PURE__*/React.createElement("span", {
      className: "ll2-quick"
    }, [50, 70, 85, 95].map(v => /*#__PURE__*/React.createElement("button", {
      key: v,
      onClick: () => setDraft(x => ({
        ...x,
        pct: v
      }))
    }, v)))), draft.kind !== 'off' && /*#__PURE__*/React.createElement("div", {
      className: "ll2-rev"
    }, /*#__PURE__*/React.createElement("label", null, "\u4E0A\u6B21\u7684\u8907\u7FD2\uFF0F\u529F\u8AB2"), window.REVIEW_STATES.map(r => /*#__PURE__*/React.createElement("button", {
      key: r.id,
      className: 'll2-rv' + (draft.review === r.id ? ' on ' + r.id : ''),
      onClick: () => setDraft(x => ({
        ...x,
        review: x.review === r.id ? '' : r.id
      }))
    }, r.ico, " ", r.zh)), (() => {
      var pv = window.lessonPrev(doc, editing);
      return pv && pv.hw ? /*#__PURE__*/React.createElement("em", {
        className: "ll2-rev-hw"
      }, "\u4E0A\u6B21\u4EA4\u4EE3\uFF1A", pv.hw) : null;
    })()), draft.kind !== 'off' && window.aiDraftLesson && /*#__PURE__*/React.createElement("div", {
      className: "ll2-ai"
    }, /*#__PURE__*/React.createElement("button", {
      className: "ll2-ai-go",
      disabled: aiBusy,
      onClick: aiDraft
    }, aiBusy ? '擬草稿中…' : '🪄 幫我擬草稿'), aiUndo && !aiBusy && /*#__PURE__*/React.createElement("button", {
      className: "ll2-ai-undo",
      onClick: () => {
        setDraft(x => ({
          ...x,
          ...aiUndo
        }));
        setAiUndo(null);
        setAiWarn(null);
      }
    }, "\u21A9 \u9084\u539F"), /*#__PURE__*/React.createElement("em", null, "\u4E0A\u4E86\u4EC0\u9EBC\uFF0F\u529F\u8AB2\uFF0F\u4E0B\u6B21\u9032\u5EA6\u4E00\u8D77\u64EC\uFF0C\u638C\u63E1\u5EA6\u8207\u5099\u8A3B\u4E0D\u78B0")), aiWarn && aiWarn.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "ll2-ai-warn"
    }, "\u26A0 \u8349\u7A3F\u88E1\u7684 ", /*#__PURE__*/React.createElement("b", null, "p.", aiWarn.join('、p.')), " \u4E0D\u5728\u9019\u4E00\u9031\u7684\u5B78\u6821\u9032\u5EA6\u8868\u4E0A\u2014\u2014 AI \u53EF\u80FD\u81EA\u5DF1\u7DE8\u4E86\u9801\u78BC\uFF0C\u5B58\u6A94\u524D\u8ACB\u5C0D\u4E00\u4E0B\u3002"), [['did', '📘 這次上了什麼', '上一堂的「下次進度」會自動帶進來'], ['prev', '🔭 先預習了什麼', '有時候會超前——寫在這裡，家長也看得到'], ['hw', '📕 回家功課', '例：LAW p20-23、單字卡 8 個字'], ['next', '➡️ 下次進度', '寫在這裡，下一堂會自動帶進「這次上了什麼」'], ['note', '🔒 我的備註（只有我看得到）', '例：prefix 跟 suffix 還是會搞混']].map(([k, lab, ph]) => /*#__PURE__*/React.createElement("label", {
      key: k,
      className: "ll2-f"
    }, /*#__PURE__*/React.createElement("span", null, lab), /*#__PURE__*/React.createElement("textarea", {
      value: draft[k] || '',
      placeholder: ph,
      rows: Math.min(10, Math.max(2, String(draft[k] || '').split('\n').length + 1)),
      onChange: e => setDraft(x => ({
        ...x,
        [k]: e.target.value
      }))
    }))), /*#__PURE__*/React.createElement("div", {
      className: "ll2-form-foot"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: () => {
        setEditing(null);
        setDraft(null);
      }
    }, "\u53D6\u6D88"), doc && doc.log && doc.log[editing] && /*#__PURE__*/React.createElement("button", {
      className: "btn danger",
      onClick: async () => {
        if (!confirm(`刪掉 ${editing} 這一堂？`)) return;
        await window.deleteLesson(who, editing);
        setEditing(null);
        setDraft(null);
      }
    }, "\u522A\u6389\u9019\u4E00\u5802"), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: save
    }, "\u5132\u5B58")));
  })(), rows.length === 0 && !editing && /*#__PURE__*/React.createElement("div", {
    className: "ll2-empty2"
  }, "\u9084\u6C92\u6709\u4EFB\u4F55\u7D00\u9304\u2014\u2014\u6309\u300C\uFF0B \u65B0\u589E\u4E00\u5802\u300D\u958B\u59CB\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "ll2-rows"
  }, rows.map(r => {
    var k = window.LESSON_KINDS.find(x => x.id === r.kind) || window.LESSON_KINDS[0];
    return /*#__PURE__*/React.createElement("div", {
      key: r.date,
      className: 'll2-row' + (r.kind === 'off' ? ' off' : '')
    }, /*#__PURE__*/React.createElement("div", {
      className: "ll2-row-h"
    }, /*#__PURE__*/React.createElement("b", null, r.date), /*#__PURE__*/React.createElement("span", {
      className: "ll2-wk2"
    }, "\u7B2C ", r.wk || window.lessonWeekOf(r.date), " \u9031"), /*#__PURE__*/React.createElement("span", {
      className: "ll2-kind2"
    }, k.ico, " ", k.zh), typeof r.pct === 'number' && /*#__PURE__*/React.createElement("span", {
      className: 'll2-p ' + pctCls(r.pct)
    }, r.pct, "%"), /*#__PURE__*/React.createElement("span", {
      className: "ll2-gap"
    }), /*#__PURE__*/React.createElement("button", {
      className: "ll2-mini",
      onClick: () => copyParent(r)
    }, "\uD83D\uDCCB \u8907\u88FD\u7D66\u5BB6\u9577"), /*#__PURE__*/React.createElement("button", {
      className: "ll2-mini",
      onClick: () => openEdit(r)
    }, "\u4FEE\u6539")), r.review && (() => {
      var rv = window.REVIEW_STATES.find(x => x.id === r.review);
      return rv ? /*#__PURE__*/React.createElement("div", {
        className: 'll2-row-f rv ' + r.review
      }, /*#__PURE__*/React.createElement("em", null, "\uD83D\uDD01 \u4E0A\u6B21\u8907\u7FD2"), rv.ico, " ", rv.zh) : null;
    })(), r.did && /*#__PURE__*/React.createElement("div", {
      className: "ll2-row-f"
    }, /*#__PURE__*/React.createElement("em", null, "\uD83D\uDCD8 \u4E0A\u4E86"), r.did), r.prev && /*#__PURE__*/React.createElement("div", {
      className: "ll2-row-f"
    }, /*#__PURE__*/React.createElement("em", null, "\uD83D\uDD2D \u9810\u7FD2"), r.prev), r.hw && /*#__PURE__*/React.createElement("div", {
      className: "ll2-row-f"
    }, /*#__PURE__*/React.createElement("em", null, "\uD83D\uDCD5 \u529F\u8AB2"), r.hw), r.next && /*#__PURE__*/React.createElement("div", {
      className: "ll2-row-f"
    }, /*#__PURE__*/React.createElement("em", null, "\u27A1\uFE0F \u4E0B\u6B21"), r.next), r.note && /*#__PURE__*/React.createElement("div", {
      className: "ll2-row-f priv"
    }, /*#__PURE__*/React.createElement("em", null, "\uD83D\uDD12 \u5099\u8A3B"), r.note));
  }))))));
}
function RosterManager() {
  var [rosterAll, setRoster] = useDash([]);
  var [email, setEmail] = useDash('');
  var [name, setName] = useDash('');
  var [grade, setGrade] = useDash('g3');
  var [err, setErr] = useDash(null);
  var [busy, setBusy] = useDash(false);
  // v339: 多位老師各帶各的——預設只看自己帶的學生；擁有者可切「全部」
  var [scope, setScope] = useDash('mine'); // 'mine' | 'all'

  useDashE(() => window.subscribeRoster(setRoster, () => setErr('讀取名單失敗 — 請先到 Firebase Console 部署新版 firestore.rules')), []);
  var myEmail = String(window._currentUser && window._currentUser.email || '').toLowerCase();
  var isOwner = !!(window.isOwnerUser && window.isOwnerUser(window._currentUser));
  var ownerEmail = String((window.OWNER_EMAILS || [])[0] || '').toLowerCase();
  // 舊資料沒 teacher 欄位 → 視為擁有者(Alan)帶的
  var teacherOf = s => String(s.teacher || ownerEmail).toLowerCase();
  var roster = scope === 'all' ? rosterAll : rosterAll.filter(s => teacherOf(s) === myEmail);
  var othersN = rosterAll.length - rosterAll.filter(s => teacherOf(s) === myEmail).length;
  var handleAdd = async () => {
    setErr(null);
    if (!email.trim().includes('@')) {
      setErr('請輸入有效的 email');
      return;
    }
    setBusy(true);
    try {
      await window.addRosterStudent(email, name, grade);
      setEmail('');
      setName('');
    } catch (e) {
      setErr('新增失敗：' + (e.code || e.message));
    }
    setBusy(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "roster-wrap"
  }, othersN > 0 && /*#__PURE__*/React.createElement("div", {
    className: "qm-ownerfilter roster-scope"
  }, /*#__PURE__*/React.createElement("button", {
    className: scope === 'mine' ? 'on' : '',
    onClick: () => setScope('mine')
  }, "\u6211\u5E36\u7684\u5B78\u751F"), /*#__PURE__*/React.createElement("button", {
    className: scope === 'all' ? 'on' : '',
    onClick: () => setScope('all')
  }, "\u5168\u90E8\uFF08", rosterAll.length, "\uFF09")), /*#__PURE__*/React.createElement("div", {
    className: "roster-form"
  }, /*#__PURE__*/React.createElement("input", {
    className: "roster-input",
    placeholder: "\u5B78\u751F Google email\uFF08\u5B78\u6821\u5E33\u865F\u6703\u81EA\u52D5\u5E36\u5E74\u7D1A\uFF09",
    value: email,
    onChange: e => {
      var v = e.target.value;
      setEmail(v);
      var g = window.gradeFromEmail(v);
      if (g) setGrade(g); // leNN 開頭 → 自動選對年級
    },
    onKeyDown: e => e.key === 'Enter' && handleAdd()
  }), /*#__PURE__*/React.createElement("input", {
    className: "roster-input roster-input-name",
    placeholder: "\u59D3\u540D",
    value: name,
    onChange: e => setName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && handleAdd()
  }), /*#__PURE__*/React.createElement("select", {
    className: "roster-input roster-input-grade",
    value: grade,
    onChange: e => setGrade(e.target.value)
  }, ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map(g => /*#__PURE__*/React.createElement("option", {
    key: g,
    value: g
  }, g.toUpperCase()))), /*#__PURE__*/React.createElement("button", {
    className: "roster-add-btn",
    onClick: handleAdd,
    disabled: busy
  }, "\uFF0B \u65B0\u589E")), err && /*#__PURE__*/React.createElement("div", {
    className: "roster-err"
  }, "\u26A0\uFE0F ", err), /*#__PURE__*/React.createElement("div", {
    className: "roster-hint"
  }, "\u540D\u55AE\u5728\u300C\u90E8\u7F72\u65B0\u7248 firestore.rules\u300D\u5F8C\u624D\u6703\u751F\u6548 \u2014 \u5C46\u6642\u53EA\u6709\u540D\u55AE\u5167\uFF08\u555F\u7528\u4E2D\uFF09\u7684\u5B78\u751F\u80FD\u770B\u5230\u8AB2\u7A0B\u5167\u5BB9\u3002"), roster.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "dt-empty"
  }, /*#__PURE__*/React.createElement("p", null, "\u540D\u55AE\u662F\u7A7A\u7684"), /*#__PURE__*/React.createElement("p", {
    className: "dt-empty-hint"
  }, "\u628A\u5B78\u751F\u7684 Google email \u52A0\u9032\u4F86\uFF0C\u90E8\u7F72\u898F\u5247\u5F8C\u5C31\u53EA\u6709\u4ED6\u5011\u80FD\u4F7F\u7528\u3002")) : /*#__PURE__*/React.createElement("div", {
    className: "roster-list"
  }, roster.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.email,
    className: `roster-row${s.active === false ? ' inactive' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "roster-row-info"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roster-row-name"
  }, s.name || '—'), /*#__PURE__*/React.createElement("span", {
    className: "roster-row-email"
  }, s.email)), scope === 'all' && teacherOf(s) !== myEmail && /*#__PURE__*/React.createElement("span", {
    className: "roster-row-teacher",
    title: teacherOf(s)
  }, teacherOf(s).split('@')[0], " \u5E36"), /*#__PURE__*/React.createElement("span", {
    className: "roster-row-grade"
  }, (s.grade || '').toUpperCase()), /*#__PURE__*/React.createElement("button", {
    className: "roster-toggle-btn",
    onClick: () => window.setRosterStudentActive(s.email, s.active === false),
    title: s.active === false ? '重新啟用' : '停用（保留資料）'
  }, s.active === false ? '已停用' : '啟用中'), /*#__PURE__*/React.createElement("button", {
    className: "roster-del-btn",
    onClick: () => {
      if (confirm(`確定刪除 ${s.email}？`)) window.deleteRosterStudent(s.email);
    },
    title: "\u522A\u9664"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "trash",
    size: 13
  }))))));
}

/* ── LINE 通知（發公告）分頁 ───────────────────────────── */
function LineNotify() {
  /* v534：聊天室擬好的稿子（app.jsx 放的字條）。讀完要清掉，
     不然他下次自己開這一頁，上次那篇又會跑出來。 */
  var draft = (() => {
    try {
      var d = window.__notifyDraft;
      window.__notifyDraft = null;
      return d || null;
    } catch (e) {
      return null;
    }
  })();
  var [text, setText] = useDash(draft ? draft.text || '' : '');
  var [pass, setPass] = useDash(() => {
    try {
      return localStorage.getItem('lineAdminPass') || '';
    } catch (e) {
      return '';
    }
  });
  var [busy, setBusy] = useDash(false);
  var [msg, setMsg] = useDash(null); // { type:'ok'|'err', text }
  var [target, setTarget] = useDash(draft ? draft.target || 'all' : 'all'); // 'all' | 'grade' | 'students'
  var [grade, setGrade] = useDash(draft ? draft.grade || '' : ''); // 選定年級
  var [picked, setPicked] = useDash([]); // 選定學生 email
  var [roster, setRoster] = useDash([]);
  useDashE(() => window.subscribeRoster(setRoster, () => {}), []);
  var activeStudents = roster.filter(s => s.active !== false);
  var grades = Array.from(new Set(activeStudents.map(s => s.grade).filter(Boolean))).sort();
  var targetLabel = target === 'all' ? '全班（所有好友）' : target === 'grade' ? grade ? grade.toUpperCase() + ' 年級' : '（尚未選年級）' : picked.length ? `指定 ${picked.length} 位學生` : '（尚未選學生）';
  var send = async () => {
    setMsg(null);
    var t = text.trim();
    if (!t) {
      setMsg({
        type: 'err',
        text: '請先輸入公告內容'
      });
      return;
    }
    if (!pass.trim()) {
      setMsg({
        type: 'err',
        text: '請先輸入管理密碼'
      });
      return;
    }
    if (target === 'grade' && !grade) {
      setMsg({
        type: 'err',
        text: '請先選一個年級'
      });
      return;
    }
    if (target === 'students' && !picked.length) {
      setMsg({
        type: 'err',
        text: '請先選至少一位學生'
      });
      return;
    }
    if (!confirm(`確定發送給「${targetLabel}」嗎？\n\n${t.slice(0, 80)}${t.length > 80 ? '…' : ''}`)) return;
    setBusy(true);
    try {
      try {
        localStorage.setItem('lineAdminPass', pass);
      } catch (e) {}
      var result;
      if (target === 'all') result = await window.lineBroadcast(t, pass);else if (target === 'grade') result = await window.linePush({
        type: 'grade',
        grade
      }, t, pass);else result = await window.linePush({
        type: 'students',
        emails: picked
      }, t, pass);
      var n = result && result.count;
      setMsg({
        type: 'ok',
        text: `✅ 已送出${n ? `給 ${n} 位家長` : ''}！`
      });
      setText('');
    } catch (e) {
      var m = e.message === 'unauthorized' ? '管理密碼錯誤，請確認和 Worker 設定的 ADMIN_PASS 一致' : e.message === 'no_recipients' ? '這個對象目前沒有已綁定的家長 — 請先請他們加好友＋回覆姓名綁定' : e.message === 'empty' ? '內容是空的' : e.message === 'too_long' ? '內容太長了（上限 4900 字）' : 'LINE 發送失敗（' + (e.message || '') + '）' + (e.detail ? '：' + e.detail : '');
      setMsg({
        type: 'err',
        text: '⚠️ ' + m
      });
    }
    setBusy(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "notify-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "notify-card"
  }, /*#__PURE__*/React.createElement("label", {
    className: "notify-label"
  }, "\u767C\u9001\u5C0D\u8C61"), /*#__PURE__*/React.createElement("div", {
    className: "notify-target"
  }, /*#__PURE__*/React.createElement("button", {
    className: target === 'all' ? 'on' : '',
    onClick: () => setTarget('all')
  }, "\u5168\u73ED"), /*#__PURE__*/React.createElement("button", {
    className: target === 'grade' ? 'on' : '',
    onClick: () => setTarget('grade')
  }, "\u5E74\u7D1A"), /*#__PURE__*/React.createElement("button", {
    className: target === 'students' ? 'on' : '',
    onClick: () => setTarget('students')
  }, "\u500B\u5225")), target === 'grade' && /*#__PURE__*/React.createElement("div", {
    className: "notify-picker"
  }, grades.length === 0 ? /*#__PURE__*/React.createElement("span", {
    className: "notify-hint"
  }, "\u540D\u55AE\u88E1\u9084\u6C92\u6709\u5E74\u7D1A\u8CC7\u6599") : grades.map(g => /*#__PURE__*/React.createElement("button", {
    key: g,
    className: `notify-chip${grade === g ? ' on' : ''}`,
    onClick: () => setGrade(g)
  }, g.toUpperCase()))), target === 'students' && /*#__PURE__*/React.createElement("div", {
    className: "notify-picker notify-picker-list"
  }, activeStudents.length === 0 ? /*#__PURE__*/React.createElement("span", {
    className: "notify-hint"
  }, "\u540D\u55AE\u662F\u7A7A\u7684\uFF08\u5148\u5230\u300C\u5B78\u751F\u540D\u55AE\u300D\u65B0\u589E\uFF09") : activeStudents.map(s => {
    var on = picked.includes(s.email);
    return /*#__PURE__*/React.createElement("button", {
      key: s.email,
      className: `notify-chip${on ? ' on' : ''}`,
      onClick: () => setPicked(on ? picked.filter(e => e !== s.email) : [...picked, s.email])
    }, s.name || s.email, /*#__PURE__*/React.createElement("em", null, (s.grade || '').toUpperCase()));
  })), target !== 'all' && /*#__PURE__*/React.createElement("div", {
    className: "notify-hint"
  }, "\u5E74\u7D1A\uFF0F\u500B\u5225\u53EA\u6703\u767C\u7D66\u300C\u5DF2\u7D81\u5B9A\u300D\u7684\u5BB6\u9577\uFF08\u672A\u7D81\u5B9A\u6536\u4E0D\u5230\uFF09\u3002"), /*#__PURE__*/React.createElement("label", {
    className: "notify-label"
  }, "\u516C\u544A\u5167\u5BB9"), /*#__PURE__*/React.createElement("textarea", {
    className: "notify-textarea",
    placeholder: "\u4F8B\u5982\uFF1A\u9019\u9031\u4F5C\u696D\u8ACB\u5728\u9031\u4E94\u524D\u5B8C\u6210\uFF0C\u6709\u554F\u984C\u96A8\u6642\u554F\u8001\u5E2B \uD83D\uDCDA",
    value: text,
    maxLength: 4900,
    rows: 5,
    onChange: e => setText(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "notify-count"
  }, text.length, " / 4900"), /*#__PURE__*/React.createElement("label", {
    className: "notify-label"
  }, "\u7BA1\u7406\u5BC6\u78BC"), /*#__PURE__*/React.createElement("input", {
    className: "notify-pass",
    type: "password",
    placeholder: "\u4F60\u5728 Worker \u8A2D\u5B9A\u7684 ADMIN_PASS",
    value: pass,
    onChange: e => setPass(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "notify-hint"
  }, "\u5BC6\u78BC\u53EA\u5B58\u5728\u4F60\u9019\u53F0\u88DD\u7F6E\u7684\u700F\u89BD\u5668\uFF0C\u4E0D\u6703\u4E0A\u50B3\u3001\u4E5F\u4E0D\u5BEB\u9032\u7A0B\u5F0F\u78BC\u3002"), /*#__PURE__*/React.createElement("button", {
    className: "notify-send",
    onClick: send,
    disabled: busy
  }, busy ? '發送中…' : `📢 發送給${target === 'all' ? '全班' : target === 'grade' ? grade ? grade.toUpperCase() : '年級' : picked.length ? picked.length + '位學生' : '個別'}`), msg && /*#__PURE__*/React.createElement("div", {
    className: `notify-msg ${msg.type}`
  }, msg.text)), /*#__PURE__*/React.createElement("aside", {
    className: "notify-side"
  }, /*#__PURE__*/React.createElement("h4", null, "\u4E09\u7A2E\u5C0D\u8C61"), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "\u5168\u73ED"), "\uFF1A\u767C\u7D66\u6240\u6709\u52A0\u597D\u53CB\u7684\u4EBA\uFF08\u542B\u672A\u7D81\u5B9A\uFF09"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "\u5E74\u7D1A"), "\uFF1A\u53EA\u767C\u67D0\u5E74\u7D1A\uFF08\u8981\u5DF2\u7D81\u5B9A\uFF09"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "\u500B\u5225"), "\uFF1A\u53EA\u767C\u9078\u5B9A\u7684\u5B78\u751F\uFF08\u8981\u5DF2\u7D81\u5B9A\uFF09")), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, "\u300C\u5E74\u7D1A\uFF0F\u500B\u5225\u300D\u9760\u5BB6\u9577\u7D81\u5B9A\u624D\u77E5\u9053\u767C\u7D66\u8AB0 \u2192 \u898B\u300C\uD83D\uDD17 LINE \u7D81\u5B9A\u300D\u5206\u9801\u3002")));
}

/* ── LINE 綁定管理分頁 ─────────────────────────────────── */
function LineLink() {
  var [roster, setRoster] = useDash([]);
  var [links, setLinks] = useDash(null); // { lineUserId: [{email,name,grade}] }
  var [busy, setBusy] = useDash(false);
  var [msg, setMsg] = useDash(null);
  var [pass, setPass] = useDash(() => {
    try {
      return localStorage.getItem('lineAdminPass') || '';
    } catch (e) {
      return '';
    }
  });
  var [diag, setDiag] = useDash(null); // v425：最近 30 則 LINE 訊息的處理紀錄

  useDashE(() => window.subscribeRoster(setRoster, () => {}), []);
  var load = async (r, p) => {
    var rr = r || roster;
    var pp = (p != null ? p : pass).trim();
    if (!pp) {
      setMsg({
        type: 'err',
        text: '請先輸入管理密碼（和發公告用的同一組）'
      });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      try {
        localStorage.setItem('lineAdminPass', pp);
      } catch (e) {}
      await window.lineSyncRoster(rr, pp); // 先把最新名單推上 Worker
      var data = await window.lineGetLinks(pp); // 再讀綁定狀態
      setLinks(data.links || {});
      // 診斷紀錄讀不到（Worker 還沒更新）也不影響綁定狀態
      try {
        var d = await window.lineDiag(pp);
        setDiag(d.list || []);
      } catch (e) {
        setDiag(null);
      }
    } catch (e) {
      setMsg({
        type: 'err',
        text: e.message === 'unauthorized' ? '⚠️ 管理密碼錯誤' : '⚠️ 讀取失敗：' + (e.message || '')
      });
    }
    setBusy(false);
  };

  // 名單到齊且已有密碼 → 自動同步並讀綁定（只跑一次）
  useDashE(() => {
    if (roster.length && pass.trim() && links === null) load(roster, pass);
  }, [roster]);
  var doUnlink = async (uid, email, name) => {
    if (!confirm(`確定解除「${name}」的綁定嗎？之後這位家長就收不到與 ${name} 有關的提醒。`)) return;
    try {
      await window.lineUnlink(uid, email, pass);
      await load();
    } catch (e) {
      setMsg({
        type: 'err',
        text: '⚠️ 解除失敗：' + (e.message || '')
      });
    }
  };
  var boundEmails = new Set();
  Object.values(links || {}).forEach(arr => (arr || []).forEach(x => boundEmails.add(String(x.email).toLowerCase())));
  var activeStudents = roster.filter(s => s.active !== false);
  // v418：家長是用「名字」綁定的，所以名單本身要先體檢。
  // 康橋帳號綁的是英文名字 → 只要全是英文，LINE 就會直接叫家長「回覆英文名字」。
  // v425：沒填名字的（例如老師自己的測試帳號）Worker 本來就不會拿來比對，
  //       這裡以前卻把它算成「不是英文名字」→ 跳出一個假警告。分開算。
  var noName = activeStudents.filter(s => !String(s.name || '').trim());
  var named = activeStudents.filter(s => String(s.name || '').trim());
  var badNames = named.filter(s => !/^[A-Za-z][A-Za-z .'\u2019-]*$/.test(String(s.name || '').trim()));
  var dupNames = (() => {
    var seen = {},
      out = [];
    activeStudents.forEach(s => {
      var k = String(s.name || '').toLowerCase().replace(/[\s.'\u2019_-]/g, '');
      if (!k) return;
      if (seen[k]) {
        if (out.indexOf(seen[k].name) < 0) out.push(seen[k].name);
      } else seen[k] = s;
    });
    return out;
  })();
  var allEnglish = named.length > 0 && badNames.length === 0;
  var unbound = activeStudents.filter(s => !boundEmails.has(String(s.email).toLowerCase()));
  var linkEntries = Object.entries(links || {});
  return /*#__PURE__*/React.createElement("div", {
    className: "notify-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "notify-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "linkbind-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "\u5BB6\u9577\u7D81\u5B9A\u72C0\u614B"), links !== null && /*#__PURE__*/React.createElement("span", {
    className: "linkbind-summary"
  }, linkEntries.length, " \u500B LINE \u5DF2\u7D81 \xB7 ", boundEmails.size, "/", activeStudents.length, " \u4F4D\u5B78\u751F\u5DF2\u9023\u7D50")), /*#__PURE__*/React.createElement("button", {
    className: "roster-toggle-btn",
    onClick: () => load(),
    disabled: busy
  }, busy ? '更新中…' : '↻ 重新整理')), true && /*#__PURE__*/React.createElement("div", {
    className: "linkbind-passrow"
  }, /*#__PURE__*/React.createElement("input", {
    className: "notify-pass",
    type: "password",
    placeholder: "\u7BA1\u7406\u5BC6\u78BC\uFF08ADMIN_PASS\uFF09",
    value: pass,
    onChange: e => setPass(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "notify-send linkbind-passbtn",
    onClick: () => load(roster, pass),
    disabled: busy
  }, "\u78BA\u8A8D")), msg && /*#__PURE__*/React.createElement("div", {
    className: `notify-msg ${msg.type}`
  }, msg.text), activeStudents.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: 'linkbind-check' + (badNames.length || dupNames.length ? ' warn' : '')
  }, allEnglish ? /*#__PURE__*/React.createElement("p", null, "\u2705 \u540D\u55AE ", named.length, " \u4F4D", /*#__PURE__*/React.createElement("b", null, "\u5168\u90E8\u90FD\u662F\u82F1\u6587\u540D\u5B57"), "\u2014\u2014LINE \u6703\u76F4\u63A5\u8ACB\u5BB6\u9577\u300C\u56DE\u8986\u5B69\u5B50\u7684\u82F1\u6587\u540D\u5B57\u300D\u3002") : /*#__PURE__*/React.createElement("p", null, "\u26A0\uFE0F \u6709 ", badNames.length, " \u4F4D", /*#__PURE__*/React.createElement("b", null, "\u4E0D\u662F\u7D14\u82F1\u6587\u540D\u5B57"), "\uFF0CLINE \u6703\u6539\u7528\u300C\u8ACB\u56DE\u8986\u5B69\u5B50\u7684\u59D3\u540D\u300D\u9019\u7A2E\u8AAA\u6CD5\uFF1A", ' ', badNames.slice(0, 8).map(s => s.name || s.email).join('、'), badNames.length > 8 ? ' …' : ''), dupNames.length > 0 && /*#__PURE__*/React.createElement("p", null, "\u26A0\uFE0F \u540D\u55AE\u88E1\u6709", /*#__PURE__*/React.createElement("b", null, "\u540C\u540D"), "\u7684\u5B78\u751F\uFF08", dupNames.join('、'), "\uFF09\u2014\u2014\u5BB6\u9577\u6253\u9019\u500B\u540D\u5B57\u6642\u7CFB\u7D71\u4E0D\u6703\u4E82\u731C\uFF0C\u6703\u8ACB\u4ED6\u806F\u7D61\u4F60\uFF0C\u4F60\u518D\u624B\u52D5\u8655\u7406\u3002"), noName.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "soft"
  }, "\u2139\uFE0F \u6709 ", noName.length, " \u4F4D", /*#__PURE__*/React.createElement("b", null, "\u6C92\u6709\u586B\u540D\u5B57"), "\uFF08", noName.map(s => s.email).join('、'), "\uFF09\uFF0C\u5BB6\u9577\u6C92\u8FA6\u6CD5\u7528\u540D\u5B57\u7D81\u5B9A\u2014\u2014\u662F\u6E2C\u8A66\u5E33\u865F\u7684\u8A71\u4E0D\u7528\u7406\u5B83\u3002")), links === null ? !busy && pass.trim() && /*#__PURE__*/React.createElement("div", {
    className: "roster-hint"
  }, "\u8F09\u5165\u4E2D\u2026\uFF08\u82E5\u4E00\u76F4\u6C92\u53CD\u61C9\uFF0C\u6309\u300C\u91CD\u65B0\u6574\u7406\u300D\uFF09") : /*#__PURE__*/React.createElement(React.Fragment, null, linkEntries.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "dt-empty"
  }, /*#__PURE__*/React.createElement("p", null, "\u9084\u6C92\u6709\u4EBA\u7D81\u5B9A"), /*#__PURE__*/React.createElement("p", {
    className: "dt-empty-hint"
  }, "\u8ACB\u5BB6\u9577\u52A0\u5B98\u65B9\u5E33\u865F\u597D\u53CB\u5F8C\uFF0C\u4F9D\u7167\u5C0D\u8A71\u56DE\u8986\u5B69\u5B50\u7684\u540D\u5B57\u5373\u53EF\u7D81\u5B9A\uFF08\u4E00\u500B LINE \u6700\u591A 2 \u4F4D\u5B69\u5B50\uFF09\u3002")) : /*#__PURE__*/React.createElement("div", {
    className: "roster-list"
  }, linkEntries.map(([uid, arr]) => /*#__PURE__*/React.createElement("div", {
    key: uid,
    className: "linkbind-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "linkbind-kids"
  }, (arr || []).map(x => /*#__PURE__*/React.createElement("span", {
    key: x.email,
    className: "linkbind-kid"
  }, x.name, /*#__PURE__*/React.createElement("em", null, (x.grade || '').toUpperCase()), /*#__PURE__*/React.createElement("button", {
    className: "linkbind-x",
    title: "\u89E3\u9664\u7D81\u5B9A",
    onClick: () => doUnlink(uid, x.email, x.name)
  }, "\xD7")))), /*#__PURE__*/React.createElement("span", {
    className: "linkbind-uid",
    title: uid
  }, "LINE \u2026", String(uid).slice(-6))))), unbound.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "linkbind-unbound"
  }, /*#__PURE__*/React.createElement("b", null, "\u5C1A\u672A\u7D81\u5B9A\uFF08", unbound.length, "\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "linkbind-unbound-list"
  }, unbound.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.email,
    className: "linkbind-chip"
  }, s.name || s.email, /*#__PURE__*/React.createElement("em", null, (s.grade || '').toUpperCase())))), /*#__PURE__*/React.createElement("p", {
    className: "linkbind-note"
  }, "\u63D0\u9192\u9019\u4E9B\u5B69\u5B50\u7684\u5BB6\u9577\uFF1A\u52A0\u5B98\u65B9\u5E33\u865F\u597D\u53CB ", /*#__PURE__*/React.createElement("b", null, "@247igfhl"), " \u2192 \u4F9D\u7167\u5C0D\u8A71\u56DE\u8986\u5B69\u5B50\u7684\u540D\u5B57\u5373\u53EF\u3002")), diag && /*#__PURE__*/React.createElement("details", {
    className: "diag-box"
  }, /*#__PURE__*/React.createElement("summary", null, "\uD83E\uDE7A \u6700\u8FD1\u7684 LINE \u5C0D\u8A71\u7D00\u9304\uFF08", diag.length, " \u5247\uFF09\u2014\u2014 \u5BB6\u9577\u8AAA\u300C\u6C92\u56DE\u61C9\u300D\u6642\u770B\u9019\u88E1"), diag.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "linkbind-note"
  }, "\u9084\u6C92\u6709\u7D00\u9304\uFF08Worker \u66F4\u65B0\u4E4B\u5F8C\u7684\u8A0A\u606F\u624D\u6703\u8A18\uFF09\u3002") : /*#__PURE__*/React.createElement("div", {
    className: "diag-list"
  }, diag.map((d, i) => {
    var okReply = d.reply === 200 || d.push === 200 || d.kind === 'quiet' || d.kind === 'ignored';
    var kindZh = {
      welcome: '加好友',
      homework: '查作業',
      text: '文字回覆',
      contact: '請私訊老師本人',
      quiet: '沒有回覆',
      ignored: '貼圖/其他'
    }[d.kind] || d.kind || '—';
    // v427：看得出這一則是走哪條路——⚡ 關鍵字秒回、🤖 問了 AI、📋 AI 沒回退回規則、🧮 今天 AI 次數用完
    var p = String(d.path || '');
    var pathZh = !p ? '' : p === 'fast' ? '⚡ 秒回' : p === 'rules' ? '📋 規則（AI 沒回）' : p === 'quota' ? '🧮 今天 AI 次數用完' : p.indexOf('ai:') === 0 ? '🤖 AI' + (typeof d.aiMs === 'number' ? ` ${(d.aiMs / 1000).toFixed(1)}s` : '') : p;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: 'diag-row' + (okReply && !d.err ? '' : ' bad')
    }, /*#__PURE__*/React.createElement("span", {
      className: "diag-at"
    }, d.at), /*#__PURE__*/React.createElement("span", {
      className: "diag-u"
    }, d.u), /*#__PURE__*/React.createElement("span", {
      className: "diag-t"
    }, d.text || '（' + (d.type || '') + '）'), /*#__PURE__*/React.createElement("span", {
      className: "diag-k"
    }, kindZh, d.kids ? `・${d.kids} 位孩子` : '', pathZh ? `・${pathZh}` : ''), /*#__PURE__*/React.createElement("span", {
      className: "diag-r"
    }, d.err ? '❌ 程式錯誤' : d.reply === 200 ? '✅ 已回覆' : d.push === 200 ? '⚠️ 回覆失敗，已改用推播補送' : d.reply ? '❌ 回覆失敗 ' + d.reply : '—', typeof d.ms === 'number' ? `（${(d.ms / 1000).toFixed(1)} 秒）` : ''), (d.err || d.replyErr || d.pushErr) && /*#__PURE__*/React.createElement("code", {
      className: "diag-e"
    }, d.err || d.pushErr || d.replyErr));
  }))))), /*#__PURE__*/React.createElement("aside", {
    className: "notify-side"
  }, /*#__PURE__*/React.createElement("h4", null, "\u5BB6\u9577\u600E\u9EBC\u7D81\u5B9A\uFF1F"), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "\u52A0\u5B98\u65B9\u5E33\u865F\u597D\u53CB ", /*#__PURE__*/React.createElement("b", null, "@247igfhl")), /*#__PURE__*/React.createElement("li", null, "\u5B98\u65B9\u5E33\u865F\u7684\u6B61\u8FCE\u8A0A\u606F\u4E4B\u5F8C\uFF0C\u6703\u518D\u554F\u4E00\u6B21\u5B69\u5B50\u7684\u540D\u5B57"), /*#__PURE__*/React.createElement("li", null, "\u56DE\u8986", allEnglish ? '孩子的英文名字（例：Emma）' : '孩子的姓名', "\uFF0C\u7CFB\u7D71\u81EA\u52D5\u914D\u5C0D\u540D\u55AE"), /*#__PURE__*/React.createElement("li", null, "\u7D81\u597D\u7B2C\u4E00\u4F4D\u5F8C\u6703\u554F\u300C\u9084\u6709\u7B2C\u4E8C\u4F4D\u55CE\uFF1F\u300D", /*#__PURE__*/React.createElement("br", null), "\u6709\u5C31\u518D\u6253\u4E00\u500B\u540D\u5B57\uFF0C\u6C92\u6709\u5C31\u56DE\u300C\u6C92\u6709\u300D")), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, "\u5169\u4F4D\u5B69\u5B50\u4E5F\u53EF\u4EE5", /*#__PURE__*/React.createElement("b", null, "\u4E00\u6B21\u6253\u5B8C"), "\uFF1A", /*#__PURE__*/React.createElement("code", null, "Emma & Ryan"), "\uFF08\u9017\u865F\u3001\u9813\u865F\u3001and\u3001\u548C\u3001\u8DDF \u90FD\u901A\uFF09\u3002 \u5927\u5C0F\u5BEB\u3001\u7A7A\u683C\u90FD\u6C92\u95DC\u4FC2\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, "\u4E00\u500B LINE ", /*#__PURE__*/React.createElement("b", null, "\u6700\u591A\u7D81 2 \u4F4D"), "\u5B69\u5B50\uFF1B\u7B2C\u4E09\u4F4D\u4EE5\u4E0A\u8ACB\u5BB6\u9577\u806F\u7D61\u4F60\uFF0C\u7531\u4F60\u5728\u4E0A\u9762\u624B\u52D5\u8655\u7406\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, "\u7D81\u5B9A\u5F8C\u624D\u6536\u5F97\u5230\u300C\u6309\u5E74\u7D1A\uFF0F\u500B\u5225\u300D\u901A\u77E5\u8207\u4F5C\u696D\u63D0\u9192\u3002\u914D\u4E0D\u5230\u540D\u5B57\u6642\u7CFB\u7D71\u4E0D\u6703\u4E82\u731C\uFF0C\u6703\u8ACB\u5BB6\u9577\u806F\u7D61\u4F60\u3002"), /*#__PURE__*/React.createElement("h4", null, "\u5BB6\u9577\u5728\u804A\u5929\u5BA4\u80FD\u505A\u7684\u4E09\u4EF6\u4E8B"), /*#__PURE__*/React.createElement("ol", {
    className: "notify-cmds"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("code", null, "\u7DF4\u7FD2"), "\u3000\u62FF\u5230\u7DF4\u7FD2\u7DB2\u7AD9\u9023\u7D50"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("code", null, "\u4F5C\u696D"), "\u3000\u73FE\u5834\u67E5\u5B69\u5B50\u9084\u6709\u54EA\u4E9B\u6C92\u5B8C\u6210"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("code", null, "\u5B69\u5B50"), "\u3000\u65B0\u589E\u6216\u522A\u9664\u8981\u6536\u901A\u77E5\u7684\u5B69\u5B50", /*#__PURE__*/React.createElement("br", null), "\uFF08", /*#__PURE__*/React.createElement("code", null, "\u65B0\u589E Eric"), "\uFF0F", /*#__PURE__*/React.createElement("code", null, "\u522A\u9664 Eric"), " \u4E00\u53E5\u5C31\u5B8C\u6210\uFF09")), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, "\u4E0D\u4E00\u5B9A\u8981\u7528\u9078\u55AE\u2014\u2014\u300C\u7DB2\u7AD9\u5728\u54EA\u300D\u300C\u529F\u8AB2\u5BEB\u5B8C\u4E86\u55CE\u300D\u300C\u5F1F\u5F1F\u4E5F\u8981\u6536\u300D\u9019\u7A2E\u8A71\u90FD\u807D\u5F97\u61C2\u3002 \u5176\u4ED6\u7121\u95DC\u7684\u8A0A\u606F\u6703\u96A8\u6A5F\u56DE\u4E00\u53E5\u6709\u79AE\u8C8C\u7684\u8A71\uFF0C", /*#__PURE__*/React.createElement("b", null, "\u540C\u4E00\u500B\u4EBA 10 \u5206\u9418\u5167\u53EA\u56DE\u4E00\u6B21"), "\uFF0C \u5BB6\u9577\u9023\u6253\u597D\u5E7E\u53E5\u4E0D\u6703\u88AB\u6D17\u7248\uFF1B\u90A3\u4E9B\u8A71\u8ACB\u5230 ", /*#__PURE__*/React.createElement("b", null, "LINE \u5B98\u65B9\u5E33\u865F\u7BA1\u7406\u5F8C\u53F0 \u2192 \u804A\u5929"), " \u770B\u3002")));
}

/* ── 集點（星星）v342 ──────────────────────────────────── */
var MX_KIND_ZH = {
  hat: '頭飾',
  item: '配件',
  fx: '特效',
  voice: '聲音',
  dance: '動作',
  pet: '夥伴'
}; // rename 不標（名字本身就是「改名卡」）

function StarsManager({
  roster,
  myEmail,
  ownerEmail,
  stuScope,
  students,
  weeksFor,
  weekOrder,
  dataFor
}) {
  var [stars, setStars] = useDash({});
  var [sel, setSel] = useDash(null); // 選中的學生 email
  var [amount, setAmount] = useDash('');
  var [note, setNote] = useDash('');
  var [date, setDate] = useDash(() => new Date().toISOString().slice(0, 10));
  var [err, setErr] = useDash(null);
  var [busy, setBusy] = useDash(false);
  useDashE(() => window.subscribeAllStars(setStars, () => setErr('讀取失敗 — 請先在 Firebase Console 發布新版 firestore.rules')), []);

  // 只列自己帶的學生（跟後台其他分頁一致）
  var teacherOf = s => String(s.teacher || ownerEmail).toLowerCase();
  var list = (roster || []).filter(s => s.active !== false).filter(s => stuScope === 'all' || teacherOf(s) === myEmail);

  // v361: 自動集點（完成練習給的星星）——跟學生端用同一個函式算，兩邊數字才會一致
  var autoOf = useDashM(() => {
    var m = {};
    if (!window.computeAutoStars) return m;
    (students || []).forEach(st => {
      var em = String(st.email || '').toLowerCase();
      if (!em) return;
      // v434：自動集點也要用這位學生自己年級的課程，不然別班的星星算不出來
      var d = dataFor ? dataFor(st) : null;
      var wk = d ? d.weeks : weeksFor ? weeksFor(st) : null;
      if (!wk) return;
      var a = window.computeAutoStars(wk, d && d.order || weekOrder, st.items || {}, {
        cloudShape: true
      });
      // v362: 每日簽到
      var c = window.computeCheckin ? window.computeCheckin(st.checkin) : {
        total: 0,
        entries: []
      };
      // v612：訂正錯題與 Trick or Treat——學生端早就算進去了，後台以前少了訂正這一塊，兩邊對不起來
      var f = window.computeFixedStars ? window.computeFixedStars(st.fixed) : {
        total: 0,
        entries: []
      };
      var tr = window.computeTreatStars ? window.computeTreatStars(st.treat, st.uid) : {
        total: 0,
        entries: []
      };
      m[em] = {
        total: a.total + c.total + f.total + tr.total,
        entries: [...a.entries, ...c.entries, ...f.entries, ...tr.entries]
      };
    });
    return m;
  }, [students, weeksFor, weekOrder, dataFor]);
  var autoTotal = email => (autoOf[String(email || '').toLowerCase()] || {}).total || 0;
  /* v448（Alan：「Tayler 的點數應該不是 570，因為他有買裝扮了」）——
     學生端的星星本來就是「賺到的 − 花掉的」（v442），老師端卻只加不減 → 兩邊對不起來。
     花掉的＝買吉祥物裝扮（記在 progress/{uid}.mx），所以這裡用同一個 mxSpent 算。 */
  var mxOf = useDashM(() => {
    var m = {};
    (students || []).forEach(st => {
      var em = String(st.email || '').toLowerCase();
      if (em) m[em] = st.mx || {};
    });
    return m;
  }, [students]);
  var uidOf = useDashM(() => {
    var m = {};
    (students || []).forEach(st => {
      var em = String(st.email || '').toLowerCase();
      if (em) m[em] = st.uid;
    });
    return m;
  }, [students]);
  var spentOf = email => window.mxSpent ? window.mxSpent(mxOf[String(email || '').toLowerCase()] || {}) : 0;
  var balanceOf = email => ((stars[String(email || '').toLowerCase()] || {}).balance || 0) + autoTotal(email) - spentOf(email);
  var cur = sel ? stars[String(sel).toLowerCase()] || {
    balance: 0,
    entries: []
  } : null;
  var curAuto = sel ? autoOf[String(sel).toLowerCase()] || {
    total: 0,
    entries: []
  } : {
    total: 0,
    entries: []
  };
  var curMx = sel ? mxOf[String(sel).toLowerCase()] || {} : {};
  var curSpent = sel ? spentOf(sel) : 0;
  var curBuys = sel && window.mxPurchases ? window.mxPurchases(curMx) : [];
  var curStudent = list.find(s => String(s.email).toLowerCase() === String(sel).toLowerCase());

  /* v448：退掉一件裝扮。星星是算出來的——東西一拿掉，點數自己就回去了。 */
  var refund = async b => {
    var uid = uidOf[String(sel).toLowerCase()];
    if (!uid) {
      setErr('這位學生還沒有登入過（找不到他的進度資料），沒辦法退。');
      return;
    }
    if (!confirm(`確定把「${b.zh}」退掉嗎？\n${b.cost} 顆星星會退回給他。`)) return;
    setBusy(true);
    setErr(null);
    var r = await window.mxRefund(uid, b.id, curMx);
    if (!r.ok) {
      setErr(r.reason === 'save' ? '退費失敗（權限）——請先到 Firebase Console 發布新版 firestore.rules（v448 加了「老師可以退學生的裝扮」那一條）。' : '退費失敗：' + r.reason);
    }
    setBusy(false);
  };
  var add = async signedAmount => {
    setErr(null);
    var n = Number(signedAmount != null ? signedAmount : amount);
    if (!sel) {
      setErr('請先選一位學生');
      return;
    }
    if (!n || !isFinite(n)) {
      setErr('請輸入星星數（扣點請加負號，例如 -3000）');
      return;
    }
    setBusy(true);
    try {
      await window.addStarEntry(sel, {
        amount: n,
        note,
        date,
        name: curStudent && curStudent.name || ''
      });
      setAmount('');
      setNote('');
    } catch (e) {
      setErr(e.message === 'invalid-amount' ? '星星數不正確' : '寫入失敗：' + (e.code || e.message));
    }
    setBusy(false);
  };

  /* v385: 吉祥物帽子是虛擬商品——扣點的註記必須含帽子名稱，學生端才認得出來買到了。
     所以給老師一鍵按鈕，不用自己打字（打錯就不會生效）。 */
  var buyHat = async (zh, cost) => {
    if (!sel) {
      setErr('請先選一位學生');
      return;
    }
    if (!confirm(`確定幫這位學生扣 ${cost} 顆星星，換「${zh}」嗎？`)) return;
    setBusy(true);
    try {
      await window.addStarEntry(sel, {
        amount: -cost,
        note: `兌換：${zh}`,
        date,
        name: curStudent && curStudent.name || ''
      });
    } catch (e) {
      setErr('寫入失敗：' + (e.code || e.message));
    }
    setBusy(false);
  };
  var del = async entry => {
    if (!confirm(`確定刪除這筆嗎？\n${entry.date}　${entry.amount > 0 ? '+' : ''}${entry.amount}🌟　${entry.note || ''}`)) return;
    try {
      await window.deleteStarEntry(sel, entry.id);
    } catch (e) {
      setErr('刪除失敗：' + (e.code || e.message));
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "stars-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stars-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stars-side-head"
  }, "\u5B78\u751F\uFF08", list.length, "\uFF09"), list.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "roster-hint"
  }, "\u540D\u55AE\u662F\u7A7A\u7684\u2014\u2014\u5148\u5230\u300C\u5B78\u751F\u540D\u55AE\u300D\u65B0\u589E\u3002") : list.map(s => {
    var e = String(s.email).toLowerCase();
    var b = balanceOf(e);
    return /*#__PURE__*/React.createElement("button", {
      key: e,
      className: 'stars-stu' + (String(sel).toLowerCase() === e ? ' on' : ''),
      onClick: () => setSel(s.email)
    }, /*#__PURE__*/React.createElement("span", {
      className: "stars-stu-name"
    }, s.name || s.email), /*#__PURE__*/React.createElement("span", {
      className: "stars-stu-bal"
    }, b.toLocaleString(), "\uD83C\uDF1F"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "stars-main"
  }, !sel ? /*#__PURE__*/React.createElement("div", {
    className: "dt-empty"
  }, /*#__PURE__*/React.createElement("p", null, "\u9078\u4E00\u4F4D\u5B78\u751F"), /*#__PURE__*/React.createElement("p", {
    className: "dt-empty-hint"
  }, "\u5728\u540D\u55AE\u4E0A\u9EDE\u4E00\u4E0B\uFF0C\u5C31\u80FD\u7D66\u661F\u661F\u6216\u6263\u9EDE\u3002")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "stars-bal-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stars-bal-name"
  }, curStudent && curStudent.name || sel), /*#__PURE__*/React.createElement("span", {
    className: "stars-bal-num"
  }, ((cur.balance || 0) + curAuto.total - curSpent).toLocaleString(), /*#__PURE__*/React.createElement("em", null, "\uD83C\uDF1F")), (curAuto.total > 0 || curSpent > 0) && /*#__PURE__*/React.createElement("span", {
    className: "stars-bal-split"
  }, "\u624B\u52D5 ", (cur.balance || 0).toLocaleString(), " \uFF0B \u81EA\u52D5 ", curAuto.total.toLocaleString(), curSpent > 0 ? ` − 買裝扮 ${curSpent.toLocaleString()}` : '')), curAuto.entries.length > 0 && /*#__PURE__*/React.createElement("details", {
    className: "stars-auto"
  }, /*#__PURE__*/React.createElement("summary", null, "\u26A1 \u81EA\u52D5\u96C6\u9EDE ", curAuto.total.toLocaleString(), "\uD83C\uDF1F\uFF08", curAuto.entries.length, " \u7B46\xB7\u5B8C\u6210\u7DF4\u7FD2\u7D66\u7684\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "stars-list"
  }, curAuto.entries.map(en => /*#__PURE__*/React.createElement("div", {
    key: en.id,
    className: "stars-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stars-row-date"
  }, en.date || '—'), /*#__PURE__*/React.createElement("span", {
    className: "stars-row-amt"
  }, "+", en.amount, "\u2B50"), /*#__PURE__*/React.createElement("span", {
    className: "stars-row-note"
  }, en.note))))), curBuys.length > 0 && /*#__PURE__*/React.createElement("details", {
    className: "stars-buys",
    open: true
  }, /*#__PURE__*/React.createElement("summary", null, "\uD83E\uDDF8 \u8CB7\u904E\u7684\u88DD\u626E ", curBuys.length, " \u4EF6 \xB7 \u5171\u82B1\u6389 ", curSpent.toLocaleString(), "\uD83C\uDF1F\uFF08\u9000\u6389\u661F\u661F\u5C31\u56DE\u53BB\uFF09"), /*#__PURE__*/React.createElement("div", {
    className: "stars-list"
  }, curBuys.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: b.id + i,
    className: "stars-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stars-row-date"
  }, b.at ? new Date(b.at).toISOString().slice(0, 10) : '—'), /*#__PURE__*/React.createElement("span", {
    className: "stars-row-amt minus"
  }, "\u2212", b.cost.toLocaleString(), "\uD83C\uDF1F"), /*#__PURE__*/React.createElement("span", {
    className: "stars-row-note"
  }, b.zh, MX_KIND_ZH[b.kind] ? `（${MX_KIND_ZH[b.kind]}）` : ''), /*#__PURE__*/React.createElement("button", {
    className: "stars-refund-btn",
    disabled: busy,
    onClick: () => refund(b)
  }, "\u9000\u6389"))))), /*#__PURE__*/React.createElement("div", {
    className: "stars-form"
  }, /*#__PURE__*/React.createElement("input", {
    className: "roster-input stars-in-date",
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "roster-input stars-in-amt",
    type: "number",
    placeholder: "\u661F\u661F\u6578\uFF08\u6263\u9EDE\u7528\u8CA0\u6578\uFF09",
    value: amount,
    onChange: e => setAmount(e.target.value),
    onKeyDown: e => e.key === 'Enter' && add()
  }), /*#__PURE__*/React.createElement("input", {
    className: "roster-input",
    placeholder: "\u5099\u8A3B\uFF08\u4F8B\uFF1A\u4E0A\u8AB2\u96C6\u9EDE\u3001\u671F\u672B\u8003 99\uFF09",
    value: note,
    onChange: e => setNote(e.target.value),
    onKeyDown: e => e.key === 'Enter' && add()
  }), /*#__PURE__*/React.createElement("button", {
    className: "roster-add-btn",
    onClick: () => add(),
    disabled: busy
  }, "\uFF0B \u8A18\u4E00\u7B46")), /*#__PURE__*/React.createElement("div", {
    className: "stars-quick"
  }, "\u5FEB\u901F\u7D66\u9EDE\uFF1A", [100, 300, 500, 800, 1000].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => add(v),
    disabled: busy
  }, "+", v))), /*#__PURE__*/React.createElement("div", {
    className: "stars-quick stars-quick-hat"
  }, "\u514C\u63DB\u5409\u7965\u7269\u5E3D\u5B50\uFF1A", /*#__PURE__*/React.createElement("button", {
    onClick: () => buyHat('派對帽', 500),
    disabled: busy
  }, "\uD83C\uDF89 \u6D3E\u5C0D\u5E3D \u2212500"), /*#__PURE__*/React.createElement("button", {
    onClick: () => buyHat('皇冠', 1000),
    disabled: busy
  }, "\uD83D\uDC51 \u7687\u51A0 \u22121000"), /*#__PURE__*/React.createElement("span", null, "\u6263\u4E86\u4E4B\u5F8C\u5B78\u751F\u7684\u5409\u7965\u7269\u5C31\u6703\u6234\u4E0A\uFF08\u9577\u6309\u5409\u7965\u7269\u53EF\u4EE5\u63DB\uFF09")), err && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg err"
  }, "\u26A0\uFE0F ", err), (() => {
    var mxRows = window.mxStarRows ? window.mxStarRows(curMx) : [];
    var rows = (cur.entries || []).concat(mxRows).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    if (!rows.length) return /*#__PURE__*/React.createElement("div", {
      className: "roster-hint"
    }, "\u9084\u6C92\u6709\u7D00\u9304\u2014\u2014\u4E0A\u9762\u8A18\u7B2C\u4E00\u7B46\u5427\uFF01");
    return /*#__PURE__*/React.createElement("div", {
      className: "stars-list"
    }, rows.map(en => /*#__PURE__*/React.createElement("div", {
      key: en.id,
      className: 'stars-row' + (en.amount < 0 ? ' minus' : '') + (en.mx ? ' mx' : '')
    }, /*#__PURE__*/React.createElement("span", {
      className: "stars-row-date"
    }, en.date || '—'), /*#__PURE__*/React.createElement("span", {
      className: "stars-row-amt"
    }, en.amount > 0 ? '+' : '', en.amount.toLocaleString(), "\uD83C\uDF1F"), /*#__PURE__*/React.createElement("span", {
      className: "stars-row-note"
    }, en.note || ''), en.mx ? /*#__PURE__*/React.createElement("span", {
      className: "stars-row-tag"
    }, "\u5B78\u751F\u81EA\u5DF1\u8CB7\u7684") : /*#__PURE__*/React.createElement("button", {
      className: "roster-del-btn",
      title: "\u522A\u9664\u9019\u7B46",
      onClick: () => del(en)
    }, /*#__PURE__*/React.createElement(window.Icon, {
      name: "trash",
      size: 13
    })))));
  })())));
}

/* ── v346: 建議商品清單（一鍵載入）────────────────────────
   ⚠ 價格是「台灣行情的估價」，不是即時報價——蝦皮擋機器人抓取（API 403、
     搜尋頁是 JS 才渲染），拿不到即時價格與商品網址，所以不編造商品連結。
     每樣附的是「蝦皮搜尋連結」＝真實有效、永遠不會壞；老師要換成特定商品連結隨時可改。
   星星 = 估價 NT$ × 20（Alan 訂的換算）。 */
/* ── 商店商品維護（v343）──────────────────────────────── */
/* 🔴 v472：這個函式**從來沒有被寫出來**（v347 加了「批次貼上蝦皮連結」的畫面與
   bulkAdd，但解析那一段漏掉了）——按「加入商品」就 ReferenceError，按鈕等於是死的。
   是 v472 新的「用了但沒宣告」檢查撈出來的。

   四種貼法都要認得（畫面上的提示就是這樣寫的）：
     【日本百樂PILOT】Juice果汁筆 0.5mm $45 https://shopee.tw/aaa-i.1.2   蝦皮分享的整段
     https://shopee.tw/卡皮巴拉玩偶-i.789.012  450                        網址＋價格
     卡皮巴拉吊飾  150                                                    沒連結也可以
     https://shopee.tw/xxx-i.1.2 | 自己打名稱 | 380                       用 | 分開
   ⚠ 價格優先認 "$45"；沒有 $ 才認「結尾一個獨立的數字」——
     不然「0.5mm」裡的 0.5 會被當成價格。 */
function shopNameFromUrl(url) {
  try {
    var seg = String(url).split('?')[0].replace(/\/+$/, '').split('/').pop() || '';
    return decodeURIComponent(seg).replace(/-i\.[\d.]+$/i, '').replace(/[-_]+/g, ' ').trim();
  } catch (e) {
    return '';
  }
}
function parseShopLines(text) {
  var items = [],
    bad = [];
  String(text || '').split(/\r?\n/).forEach(raw => {
    var line = raw.trim();
    if (!line) return;
    var name = '',
      url = '',
      price = null;
    if (line.indexOf('|') >= 0) {
      line.split('|').map(x => x.trim()).filter(Boolean).forEach(part => {
        if (/^https?:\/\//i.test(part)) url = url || part;else if (/^\$?\s*\d+(?:\.\d+)?$/.test(part)) price = parseFloat(part.replace(/[^\d.]/g, ''));else name = name || part;
      });
    } else {
      var rest = line;
      var u = rest.match(/https?:\/\/\S+/i);
      if (u) {
        url = u[0];
        rest = (rest.slice(0, u.index) + ' ' + rest.slice(u.index + u[0].length)).trim();
      }
      var d = rest.match(/\$\s*(\d+(?:\.\d+)?)/);
      if (d) {
        price = parseFloat(d[1]);
        rest = (rest.slice(0, d.index) + ' ' + rest.slice(d.index + d[0].length)).trim();
      } else {
        var t = rest.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*$/);
        if (t) {
          price = parseFloat(t[1]);
          rest = rest.slice(0, t.index).trim();
        }
      }
      name = rest.replace(/\s+/g, ' ').trim();
    }
    if (!name && url) name = shopNameFromUrl(url);
    if (!name) {
      bad.push(line);
      return;
    } // 看不懂的行會回報給老師，不是默默吃掉
    items.push({
      name: name.slice(0, 60),
      price: price != null && price > 0 ? price : null,
      url
    });
  });
  return {
    items,
    bad
  };
}
function ShopManager() {
  var [items, setItems] = useDash(null); // null = 還沒載到
  var [err, setErr] = useDash(null);
  var [ok, setOk] = useDash(null);
  var [busyId, setBusyId] = useDash(null);
  var fileRef = React.useRef(null);
  var pickFor = React.useRef(null); // 正在換圖片的商品 id
  // v347: 批次貼上蝦皮連結
  var [bulkOpen, setBulkOpen] = useDash(false);
  var [bulkText, setBulkText] = useDash('');
  var [bulkTag, setBulkTag] = useDash('文具');
  useDashE(() => window.subscribeShop(list => setItems(list || (window.SHOP_ITEMS || []).map(x => ({
    ...x
  }))), () => setErr('讀取失敗——請確認已發布新版 firestore.rules')), []);
  var save = async next => {
    setItems(next);
    setErr(null);
    setOk(null);
    try {
      await window.saveShopItems(next);
      setOk('已儲存');
      setTimeout(() => setOk(null), 1500);
    } catch (e) {
      setErr('儲存失敗：' + (e.code || e.message));
    }
  };
  var upd = (id, patch) => save((items || []).map(x => x.id === id ? {
    ...x,
    ...patch
  } : x));
  var add = () => save([...(items || []), {
    id: 'p' + Date.now().toString(36),
    name: '新商品',
    cost: 500,
    tag: '文具',
    emoji: '🎁',
    img: '',
    url: ''
  }]);
  var del = it => {
    if (confirm(`確定刪除「${it.name}」？`)) save((items || []).filter(x => x.id !== it.id));
  };
  var move = (it, dir) => {
    var arr = (items || []).slice();
    var i = arr.findIndex(x => x.id === it.id),
      j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    save(arr);
  };
  // v347: 把貼上的連結批次變成商品
  var bulkAdd = () => {
    var {
      items: parsed,
      bad
    } = parseShopLines(bulkText);
    if (!parsed.length) {
      setErr('沒有解析到商品——請每行貼一個蝦皮商品連結（後面可加價格）');
      return;
    }
    var noPrice = parsed.filter(p => p.price == null).length;
    if (!confirm(`解析到 ${parsed.length} 樣商品，要加入嗎？\n` + `分類：${bulkTag}\n` + (noPrice ? `⚠️ 其中 ${noPrice} 樣沒填價格，星星會先設 0，記得之後補\n` : '') + (bad.length ? `⚠️ 有 ${bad.length} 行看不懂會略過\n` : ''))) return;
    var add = parsed.map(p => ({
      id: 'b' + Math.random().toString(36).slice(2, 8),
      name: p.name,
      cost: p.price != null ? Math.round(p.price * 20) : 0,
      // 星星＝價格×20
      tag: bulkTag,
      emoji: '🎁',
      img: '',
      url: p.url || ''
    }));
    save([...(items || []), ...add]);
    setBulkText('');
    setBulkOpen(false);
    setOk(`已加入 ${add.length} 樣商品`);
    setTimeout(() => setOk(null), 2500);
  };
  var pickImage = id => {
    pickFor.current = id;
    if (fileRef.current) fileRef.current.click();
  };
  var onFile = async e => {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    var id = pickFor.current;
    if (!f || !id) return;
    setBusyId(id);
    setErr(null);
    try {
      var url = await window.uploadFlashcardImage(f); // 沿用單字卡的圖片上傳（自動縮圖）
      upd(id, {
        img: url
      });
    } catch (ex) {
      setErr('圖片上傳失敗：' + (ex.message || ''));
    }
    setBusyId(null);
  };
  if (items === null) return /*#__PURE__*/React.createElement("div", {
    className: "roster-hint"
  }, "\u8F09\u5165\u4E2D\u2026");
  return /*#__PURE__*/React.createElement("div", {
    className: "shopm-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shopm-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "\u514C\u63DB\u5546\u54C1\uFF08", items.length, "\uFF09"), /*#__PURE__*/React.createElement("span", {
    className: "linkbind-summary"
  }, "\u5B78\u751F\u5728\u300C\u2B50 \u661F\u661F \u2192 \uD83D\uDECD\uFE0F \u5546\u5E97\u300D\u770B\u5230\u7684\u5C31\u662F\u9019\u4E9B")), /*#__PURE__*/React.createElement("div", {
    className: "shopm-head-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "roster-toggle-btn",
    onClick: () => setBulkOpen(o => !o)
  }, "\uD83D\uDCCB \u6279\u6B21\u8CBC\u4E0A\u8766\u76AE\u9023\u7D50"), /*#__PURE__*/React.createElement("button", {
    className: "roster-add-btn",
    onClick: add
  }, "\uFF0B \u65B0\u589E\u5546\u54C1"))), bulkOpen && /*#__PURE__*/React.createElement("div", {
    className: "shopm-bulk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shopm-bulk-head"
  }, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDCCB \u6279\u6B21\u8CBC\u4E0A\u8766\u76AE\u9023\u7D50"), /*#__PURE__*/React.createElement("span", null, "\u5728\u8766\u76AE\u5546\u54C1\u9801\u6309\u300C\u5206\u4EAB \u2192 \u8907\u88FD\u9023\u7D50\u300D\uFF0C\u4E00\u884C\u8CBC\u4E00\u500B\uFF0C\u661F\u661F\u81EA\u52D5 \xD720\u3002", /*#__PURE__*/React.createElement("b", null, "\u76F4\u63A5\u8CBC\u8766\u76AE\u5206\u4EAB\u7684\u6574\u6BB5\u6587\u5B57\u4E5F\u53EF\u4EE5"), "\uFF08\u5B83\u672C\u4F86\u5C31\u542B\u5546\u54C1\u540D\u548C $\u50F9\u683C\uFF09\uFF0C\u4E0D\u7528\u81EA\u5DF1\u6253\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "shopm-bulk-row"
  }, /*#__PURE__*/React.createElement("label", null, "\u9019\u6279\u7684\u5206\u985E"), ['文具', '娃娃', '休閒娛樂'].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: 'notify-chip' + (bulkTag === t ? ' on' : ''),
    onClick: () => setBulkTag(t)
  }, t)), /*#__PURE__*/React.createElement("input", {
    className: "roster-input shopm-bulk-tag",
    placeholder: "\u6216\u81EA\u8A02\u5206\u985E",
    value: bulkTag,
    onChange: e => setBulkTag(e.target.value)
  })), /*#__PURE__*/React.createElement("textarea", {
    className: "notify-textarea",
    rows: 7,
    value: bulkText,
    onChange: e => setBulkText(e.target.value),
    placeholder: '【日本百樂PILOT】Juice果汁筆 0.5mm $45 https://shopee.tw/aaa-i.1.2\n' + '   ↑ 蝦皮分享的整段文字直接貼，名稱和價格都會自動抓出來\n\n' + 'https://shopee.tw/卡皮巴拉玩偶-i.789.012  450   ← 網址＋空兩格＋價格\n' + '卡皮巴拉吊飾  150                              ← 沒連結也可以\n' + 'https://shopee.tw/xxx-i.1.2 | 自己打名稱 | 380'
  }), /*#__PURE__*/React.createElement("div", {
    className: "shopm-bulk-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "roster-add-btn",
    onClick: bulkAdd
  }, "\u52A0\u5165\u5546\u54C1"), /*#__PURE__*/React.createElement("button", {
    className: "roster-toggle-btn",
    onClick: () => {
      setBulkText('');
      setBulkOpen(false);
    }
  }, "\u53D6\u6D88"))), err && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg err"
  }, "\u26A0\uFE0F ", err), ok && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg ok"
  }, "\u2705 ", ok), /*#__PURE__*/React.createElement("div", {
    className: "roster-hint"
  }, "\uD83D\uDCA1 \u60F3\u653E\u8766\u76AE\u5546\u54C1\uFF1A\u5728\u8766\u76AE\u628A\u5546\u54C1\u5716", /*#__PURE__*/React.createElement("b", null, "\u622A\u5716"), "\u4E0B\u4F86\uFF0C\u7528\u4E0B\u9762\u7684\u300C\u63DB\u5716\u7247\u300D\u4E0A\u50B3\uFF08\u6700\u7A69\u3001\u4E0D\u6703\u8B8A\u7834\u5716\uFF09\uFF0C \u518D\u628A\u8766\u76AE\u5546\u54C1\u7DB2\u5740\u8CBC\u5230\u300C\u9023\u7D50\u300D\u2014\u2014\u5B78\u751F\u5C31\u80FD\u9EDE\u300C\u770B\u5546\u54C1 \u2197\u300D\u958B\u8766\u76AE\u770B\u7D30\u7BC0\u3002"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    style: {
      display: 'none'
    },
    onChange: onFile
  }), /*#__PURE__*/React.createElement("div", {
    className: "shopm-list"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: it.id,
    className: "shopm-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "shopm-img",
    onClick: () => pickImage(it.id),
    title: "\u63DB\u5716\u7247"
  }, busyId === it.id ? /*#__PURE__*/React.createElement("span", {
    className: "shopm-img-busy"
  }, "\u4E0A\u50B3\u4E2D\u2026") : it.img ? /*#__PURE__*/React.createElement("img", {
    src: it.img,
    alt: it.name
  }) : /*#__PURE__*/React.createElement("span", {
    className: "shopm-img-emoji"
  }, it.emoji || '🎁'), /*#__PURE__*/React.createElement("span", {
    className: "shopm-img-edit"
  }, "\u63DB\u5716\u7247")), /*#__PURE__*/React.createElement("div", {
    className: "shopm-fields"
  }, /*#__PURE__*/React.createElement("input", {
    className: "roster-input",
    value: it.name,
    placeholder: "\u5546\u54C1\u540D\u7A31",
    onChange: e => setItems(items.map(x => x.id === it.id ? {
      ...x,
      name: e.target.value
    } : x)),
    onBlur: e => upd(it.id, {
      name: e.target.value
    })
  }), /*#__PURE__*/React.createElement("div", {
    className: "shopm-row2"
  }, /*#__PURE__*/React.createElement("input", {
    className: "roster-input shopm-cost",
    type: "number",
    value: it.cost,
    placeholder: "\u661F\u661F",
    onChange: e => setItems(items.map(x => x.id === it.id ? {
      ...x,
      cost: e.target.value
    } : x)),
    onBlur: e => upd(it.id, {
      cost: Math.max(0, Math.round(Number(e.target.value) || 0))
    })
  }), /*#__PURE__*/React.createElement("input", {
    className: "roster-input shopm-tag",
    value: it.tag || '',
    placeholder: "\u5206\u985E\uFF08\u5A03\u5A03/\u73A9\u5177/\u6587\u5177\uFF09",
    onChange: e => setItems(items.map(x => x.id === it.id ? {
      ...x,
      tag: e.target.value
    } : x)),
    onBlur: e => upd(it.id, {
      tag: e.target.value.trim()
    })
  })), /*#__PURE__*/React.createElement("input", {
    className: "roster-input",
    value: it.url || '',
    placeholder: "\u8766\u76AE\u5546\u54C1\u9023\u7D50\uFF08\u9078\u586B\uFF0C\u8CBC\u4E0A\u7DB2\u5740\uFF09",
    onChange: e => setItems(items.map(x => x.id === it.id ? {
      ...x,
      url: e.target.value
    } : x)),
    onBlur: e => upd(it.id, {
      url: e.target.value.trim()
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "shopm-tools"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => move(it, -1),
    disabled: i === 0,
    title: "\u4E0A\u79FB"
  }, "\u2191"), /*#__PURE__*/React.createElement("button", {
    onClick: () => move(it, 1),
    disabled: i === items.length - 1,
    title: "\u4E0B\u79FB"
  }, "\u2193"), /*#__PURE__*/React.createElement("button", {
    className: "roster-del-btn",
    onClick: () => del(it),
    title: "\u522A\u9664"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "trash",
    size: 13
  })))))));
}

/* ── 作業自動提醒（功能B）分頁 ─────────────────────────── */
/* v421：老師端把「家長在 LINE 上看到的那顆泡泡」照著畫一次。
   資料來自 Worker 回傳的 sections，跟真的 Flex Message 是同一份，不會走鐘。 */
function HwBubble({
  name,
  secs,
  title,
  note
}) {
  // v422：三區長相統一——【週次小標】＋【四大類各幾項】
  var SEC = [['week', '▍本週作業', '', 'now'], ['overdue', '▍前幾週還沒完成', '請盡快補完', 'old'], ['preview', '▍可以先預習', '還沒開始，不用急', 'soon']];
  return /*#__PURE__*/React.createElement("div", {
    className: "lnb"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnb-head"
  }, /*#__PURE__*/React.createElement("span", null, title || '📚 作業提醒'), /*#__PURE__*/React.createElement("b", null, name || '同學')), /*#__PURE__*/React.createElement("div", {
    className: "lnb-body"
  }, note ? /*#__PURE__*/React.createElement("div", {
    className: "lnb-note"
  }, note) : null, SEC.map(([k, title, note, tone]) => {
    var groups = (secs[k] || {}).groups || [];
    if (!groups.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      className: 'lnb-sec ' + tone
    }, /*#__PURE__*/React.createElement("div", {
      className: "lnb-t"
    }, title, note ? /*#__PURE__*/React.createElement("em", null, note) : null), groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
      key: gi,
      className: "lnb-g"
    }, g.head ? /*#__PURE__*/React.createElement("div", {
      className: "lnb-h"
    }, g.head) : null, (g.rows || []).map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "lnb-r"
    }, /*#__PURE__*/React.createElement("span", null, r.label), /*#__PURE__*/React.createElement("b", null, r.n, " \u9805"))))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "lnb-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lnb-btn"
  }, "\u6253\u958B\u7DF4\u7FD2"), /*#__PURE__*/React.createElement("small", null, "Alan \u8001\u5E2B")));
}
function HwRemind() {
  // v426：Alan「自動提醒是自動提醒 但我主動提醒是主動提醒 不要混在一起」
  // 🔴 v514（Alan：「固定自動提醒幫我關閉，現在全部改成我手動提醒，家長覺得很吵」）：
  //   每天 18:00 的自動提醒已經停掉（Worker 的 scheduled() 不再發送）。
  //   這一區沒有整個拿掉，是因為「誰還沒完成」這份清單本身很有用——
  //   改成老師自己決定要不要照它發，按下去才會發。
  var [pass, setPass] = useDash(() => {
    try {
      return localStorage.getItem('lineAdminPass') || '';
    } catch (e) {
      return '';
    }
  });
  var [roster, setRoster] = useDash([]);
  useDashE(() => window.subscribeRoster(setRoster, () => {}), []);
  var [aBusy, setABusy] = useDash(false);
  var [aRes, setARes] = useDash(null);
  /* v460（Alan：「自動推播怎麼不會出現在官方 LINE 的聊天裡？家長卻有收到」）：
     用 Messaging API 推出去的訊息不會進 LINE 官方帳號後台的聊天室
     ——那裡只留「從聊天室手動打的」與「家長傳進來的」。
     所以老師本來完全沒有紀錄可看。Worker 現在會把每天 18:00 跑的結果留下來，
     這裡就能看到「幾點發的、發給誰、內容一字不差是什麼」。 */
  var [logs, setLogs] = useDash(null);
  var [lBusy, setLBusy] = useDash(false);
  var [lOpen, setLOpen] = useDash({});
  var [aMsg, setAMsg] = useDash(null);

  /* v548 聊天室「提醒這週沒做完的人」留下的字條：人選與附話先填好。
     ⚠ 讀完要清掉；⚠ 只是選好——預覽與送出都還是他自己按（那是會響在家長手機上的東西）。 */
  var draft0 = (() => {
    var g = null;
    try {
      g = window.__remindDraft;
      window.__remindDraft = null;
    } catch (e) {}
    return g;
  })();
  var [target, setTarget] = useDash(draft0 ? 'students' : 'all');
  var [grade, setGrade] = useDash('');
  var [picked, setPicked] = useDash(draft0 ? draft0.emails || [] : []);
  var [note, setNote] = useDash(draft0 ? draft0.note || '' : '');
  var [mBusy, setMBusy] = useDash(false);
  var [mRes, setMRes] = useDash(null);
  var [mMsg, setMMsg] = useDash(null);
  var students = roster.filter(s => s.active !== false && String(s.name || '').trim());
  var grades = Array.from(new Set(students.map(s => String(s.grade || '').toLowerCase()).filter(Boolean))).sort();
  var nameOf = em => (students.find(s => String(s.email).toLowerCase() === String(em).toLowerCase()) || {}).name || em;
  var errText = e => e.message === 'unauthorized' ? '管理密碼錯誤' : e.message === 'no_firebase_sa' ? 'Firebase 服務金鑰還沒設定' : String(e.message || '').indexOf('no_access_token') >= 0 ? 'Firebase 金鑰無效或權限不足，請重新產生金鑰' : e.message === 'not_found' ? 'Worker 還是舊版——請先到 Cloudflare 貼上新的 line-notify-worker.js' : e.message || '執行失敗';
  var usePass = () => {
    var p = pass.trim();
    if (p) {
      try {
        localStorage.setItem('lineAdminPass', p);
      } catch (e) {}
    }
    return p;
  };
  var previewAuto = async () => {
    var p = usePass();
    if (!p) {
      setAMsg({
        type: 'err',
        text: '請先輸入管理密碼'
      });
      return;
    }
    setABusy(true);
    setAMsg(null);
    setARes(null);
    try {
      setARes(await window.lineRunReminders(true, p));
    } catch (e) {
      setAMsg({
        type: 'err',
        text: '⚠️ ' + errText(e)
      });
    }
    setABusy(false);
  };

  /* v514：本來這份清單只有系統自己會發。自動提醒停掉之後，
     改成老師看完預覽、自己決定要不要發——按下去才會送出去。 */
  var [aSendBusy, setASendBusy] = useDash(false);
  var sendAuto = async () => {
    var p = usePass();
    if (!p) {
      setAMsg({
        type: 'err',
        text: '請先輸入管理密碼'
      });
      return;
    }
    var n = aRes && (aRes.sent || []).length || 0;
    if (!confirm(`確定現在發出去嗎？\n\n會傳給 ${n} 位家長，內容就是上面預覽的那些。`)) return;
    setASendBusy(true);
    setAMsg(null);
    try {
      var d = await window.lineRunReminders(false, p);
      setARes(d);
      setAMsg({
        type: 'ok',
        text: `✅ 發出去了：${(d.sent || []).length} 位家長`
      });
    } catch (e) {
      setAMsg({
        type: 'err',
        text: '⚠️ ' + errText(e)
      });
    }
    setASendBusy(false);
  };
  var loadLogs = async () => {
    var p = usePass();
    if (!p) {
      setAMsg({
        type: 'err',
        text: '請先輸入管理密碼'
      });
      return;
    }
    setLBusy(true);
    setAMsg(null);
    try {
      var d = await window.lineRunLog(p);
      setLogs(d.runs || []);
    } catch (e) {
      setAMsg({
        type: 'err',
        text: '⚠️ ' + errText(e)
      });
      setLogs(null);
    }
    setLBusy(false);
  };
  var tgtLabel = target === 'all' ? '所有已綁定的家長' : target === 'grade' ? grade ? grade.toUpperCase() + ' 的家長' : '（還沒選年級）' : picked.length ? picked.map(nameOf).join('、') + ' 的家長' : '（還沒選孩子）';
  var runManual = async dry => {
    var p = usePass();
    if (!p) {
      setMMsg({
        type: 'err',
        text: '請先輸入管理密碼'
      });
      return;
    }
    if (target === 'grade' && !grade) {
      setMMsg({
        type: 'err',
        text: '請先選一個年級'
      });
      return;
    }
    if (target === 'students' && !picked.length) {
      setMMsg({
        type: 'err',
        text: '請先選至少一位孩子'
      });
      return;
    }
    var tgt = target === 'all' ? {
      type: 'all'
    } : target === 'grade' ? {
      type: 'grade',
      grade
    } : {
      type: 'students',
      emails: picked
    };
    if (!dry && !confirm(`確定現在發送主動提醒給「${tgtLabel}」嗎？\n\n只會發給還有作業沒完成的孩子的家長。${note.trim() ? '\n\n附上的話：' + note.trim().slice(0, 60) : ''}`)) return;
    setMBusy(true);
    setMMsg(null);
    setMRes(null);
    try {
      var R = await window.lineManual(tgt, note.trim(), dry, p);
      setMRes(R);
      var lines = (R.sends || []).reduce((a, x) => a + (x.to || 0), 0);
      setMMsg({
        type: 'ok',
        text: dry ? '✅ 預覽完成（還沒發出去）' : `✅ 已發送：${R.sends.length} 位孩子、共 ${lines} 個 LINE`
      });
    } catch (e) {
      setMMsg({
        type: 'err',
        text: '⚠️ ' + errText(e)
      });
    }
    setMBusy(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "notify-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "notify-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "linkbind-passrow"
  }, /*#__PURE__*/React.createElement("input", {
    className: "notify-pass",
    type: "password",
    placeholder: "\u7BA1\u7406\u5BC6\u78BC\uFF08ADMIN_PASS\uFF09",
    value: pass,
    onChange: e => setPass(e.target.value)
  })), /*#__PURE__*/React.createElement("section", {
    className: "hwr-sec auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hwr-sec-head"
  }, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDCCB \u8AB0\u9084\u6C92\u5B8C\u6210"), /*#__PURE__*/React.createElement("span", null, "\u6BCF\u5929 18:00 \u7684\u81EA\u52D5\u63D0\u9192", /*#__PURE__*/React.createElement("b", {
    className: "hwr-off"
  }, "\u5DF2\u7D93\u95DC\u6389"), "\u4E86\u3002\u9019\u4EFD\u6E05\u55AE\u9084\u5728\uFF0C\u4F46\u8981\u4F60\u6309\u624D\u6703\u767C\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "hwr-offnote"
  }, "\u5BB6\u9577\u60F3\u77E5\u9053\u529F\u8AB2\uFF0C\u8ACB\u4ED6\u5011\u5728\u5B98\u65B9 LINE \u8F38\u5165\u300C", /*#__PURE__*/React.createElement("b", null, "\u4F5C\u696D"), "\u300D\u5C31\u67E5\u5F97\u5230\u2014\u2014\u90A3\u689D\u8DEF\u6C92\u6709\u95DC\u3002"), /*#__PURE__*/React.createElement("button", {
    className: "notify-send hwr-preview",
    onClick: previewAuto,
    disabled: aBusy
  }, aBusy ? '讀取中…' : '🔍 看現在誰還沒完成'), aRes && (aRes.sent || []).length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "notify-send hwr-sendnow",
    onClick: sendAuto,
    disabled: aSendBusy,
    style: {
      marginTop: 8
    }
  }, aSendBusy ? '發送中…' : `📤 就照這份發出去（${(aRes.sent || []).length} 位家長）`), /*#__PURE__*/React.createElement("button", {
    className: "notify-send hwr-preview",
    onClick: loadLogs,
    disabled: lBusy,
    style: {
      marginTop: 8
    }
  }, lBusy ? '讀取中…' : '📜 看實際發出去的紀錄'), aMsg && /*#__PURE__*/React.createElement("div", {
    className: `notify-msg ${aMsg.type}`
  }, aMsg.text), aRes && /*#__PURE__*/React.createElement(HwResult, {
    R: aRes,
    mode: "auto"
  }), logs && /*#__PURE__*/React.createElement("div", {
    className: "hwlog"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hwlog-note"
  }, "LINE \u5B98\u65B9\u5E33\u865F\u5F8C\u53F0\u7684\u804A\u5929\u5BA4", /*#__PURE__*/React.createElement("b", null, "\u4E0D\u6703"), "\u986F\u793A\u7CFB\u7D71\u63A8\u64AD\uFF08\u90A3\u88E1\u53EA\u7559\u4F60\u624B\u52D5\u6253\u7684\u3001\u548C\u5BB6\u9577\u50B3\u9032\u4F86\u7684\uFF09\uFF0C \u6240\u4EE5\u8981\u770B\u7CFB\u7D71\u767C\u4E86\u4EC0\u9EBC\uFF0C\u770B\u9019\u88E1\u3002"), logs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "hwlog-empty"
  }, "\u9084\u6C92\u6709\u7D00\u9304\u3002\u4ECA\u5929 18:00 \u8DD1\u904E\u4E4B\u5F8C\u5C31\u6703\u51FA\u73FE\uFF08\u4E5F\u8981\u5148\u628A\u65B0\u7248 Worker \u8CBC\u4E0A\u53BB\uFF09\u3002") : logs.map((r, i) => {
    var when = (() => {
      try {
        return new Date(r.at).toLocaleString('zh-TW', {
          hour12: false
        });
      } catch (e) {
        return r.at;
      }
    })();
    var open = !!lOpen[i];
    return /*#__PURE__*/React.createElement("div", {
      className: 'hwlog-run' + (r.ok ? '' : ' bad'),
      key: r.at + i
    }, /*#__PURE__*/React.createElement("button", {
      className: "hwlog-head",
      onClick: () => setLOpen(o => ({
        ...o,
        [i]: !o[i]
      }))
    }, /*#__PURE__*/React.createElement("span", {
      className: "hwlog-chev"
    }, open ? '▾' : '▸'), /*#__PURE__*/React.createElement("b", null, when), /*#__PURE__*/React.createElement("span", {
      className: "hwlog-tag"
    }, r.how === 'manual' ? '手動跑的' : '每天 18:00'), /*#__PURE__*/React.createElement("span", {
      className: "hwlog-n"
    }, "\u767C\u51FA ", (r.sends || []).length, " \u4F4D"), /*#__PURE__*/React.createElement("span", {
      className: "hwlog-sub"
    }, "\u5168\u90E8\u505A\u5B8C ", r.allDone, " \xB7 \u5DF2\u901A\u77E5\u904E ", r.quiet, " \xB7 \u5BB6\u9577\u6C92\u7D81 ", r.noBind)), !!(r.errors || []).length && /*#__PURE__*/React.createElement("div", {
      className: "hwlog-err"
    }, "\u26A0\uFE0F ", r.errors.join('；')), open && ((r.sends || []).length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "hwlog-empty"
    }, "\u9019\u4E00\u6B21\u6C92\u6709\u767C\u7D66\u4EFB\u4F55\u4EBA\u3002") : /*#__PURE__*/React.createElement("div", {
      className: "hwlog-list"
    }, r.sends.map(x => /*#__PURE__*/React.createElement("div", {
      className: "hwlog-item",
      key: x.email
    }, /*#__PURE__*/React.createElement("div", {
      className: "hwlog-who"
    }, /*#__PURE__*/React.createElement("b", null, x.name || x.email), /*#__PURE__*/React.createElement("span", null, x.count, " \u9805\u672A\u5B8C\u6210 \xB7 \u9001\u5230 ", x.to, " \u500B LINE"), x.buckets && /*#__PURE__*/React.createElement("span", null, "\u672C\u9031 ", x.buckets.thisWeek, " \xB7 \u524D\u5E7E\u9031 ", x.buckets.overdue)), /*#__PURE__*/React.createElement("pre", {
      className: "hwlog-text"
    }, x.text))))));
  }))), /*#__PURE__*/React.createElement("section", {
    className: "hwr-sec manual"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hwr-sec-head"
  }, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDCE3 \u4E3B\u52D5\u63D0\u9192"), /*#__PURE__*/React.createElement("span", null, "\u8001\u5E2B\u81EA\u5DF1\u6C7A\u5B9A\u73FE\u5728\u63D0\u9192\u8AB0\u3002\u6A19\u984C\u662F\u300CAlan \u8001\u5E2B\u63D0\u9192\u300D\uFF0C\u8DDF\u81EA\u52D5\u63D0\u9192\u5206\u958B\uFF0C\u4E92\u4E0D\u5F71\u97FF\u3002")), /*#__PURE__*/React.createElement("label", {
    className: "notify-label"
  }, "\u8981\u63D0\u9192\u8AB0"), /*#__PURE__*/React.createElement("div", {
    className: "notify-target"
  }, /*#__PURE__*/React.createElement("button", {
    className: target === 'all' ? 'on' : '',
    onClick: () => setTarget('all')
  }, "\u5168\u90E8"), /*#__PURE__*/React.createElement("button", {
    className: target === 'grade' ? 'on' : '',
    onClick: () => setTarget('grade')
  }, "\u5E74\u7D1A"), /*#__PURE__*/React.createElement("button", {
    className: target === 'students' ? 'on' : '',
    onClick: () => setTarget('students')
  }, "\u500B\u5225\u5B69\u5B50")), target === 'grade' && /*#__PURE__*/React.createElement("div", {
    className: "notify-picker"
  }, grades.length === 0 ? /*#__PURE__*/React.createElement("span", {
    className: "notify-hint"
  }, "\u540D\u55AE\u88E1\u9084\u6C92\u6709\u5E74\u7D1A\u8CC7\u6599") : grades.map(g => /*#__PURE__*/React.createElement("button", {
    key: g,
    className: `notify-chip${grade === g ? ' on' : ''}`,
    onClick: () => setGrade(g)
  }, g.toUpperCase()))), target === 'students' && /*#__PURE__*/React.createElement("div", {
    className: "notify-picker notify-picker-list"
  }, students.map(s => {
    var on = picked.includes(s.email);
    return /*#__PURE__*/React.createElement("button", {
      key: s.email,
      className: `notify-chip${on ? ' on' : ''}`,
      onClick: () => setPicked(on ? picked.filter(e => e !== s.email) : [...picked, s.email])
    }, s.name, /*#__PURE__*/React.createElement("em", null, (s.grade || '').toUpperCase()));
  })), /*#__PURE__*/React.createElement("label", {
    className: "notify-label"
  }, "\u60F3\u5C0D\u5BB6\u9577\u8AAA\u7684\u8A71\uFF08\u9078\u586B\uFF09"), /*#__PURE__*/React.createElement("textarea", {
    className: "notify-textarea",
    rows: 3,
    maxLength: 200,
    placeholder: "\u4F8B\u5982\uFF1A\u9019\u9031\u4E94\u8981\u5C0F\u8003\uFF0C\u8ACB\u63D0\u9192\u5B69\u5B50\u628A\u55AE\u5B57\u7DF4\u5B8C \uD83D\uDCAA",
    value: note,
    onChange: e => setNote(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "notify-count"
  }, note.length, " / 200"), /*#__PURE__*/React.createElement("div", {
    className: "hwr-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "notify-send hwr-preview",
    onClick: () => runManual(true),
    disabled: mBusy
  }, mBusy ? '處理中…' : '🔍 預覽'), /*#__PURE__*/React.createElement("button", {
    className: "notify-send",
    onClick: () => runManual(false),
    disabled: mBusy
  }, "\uD83D\uDCE4 \u767C\u9001\u4E3B\u52D5\u63D0\u9192")), mMsg && /*#__PURE__*/React.createElement("div", {
    className: `notify-msg ${mMsg.type}`
  }, mMsg.text), mRes && /*#__PURE__*/React.createElement(HwResult, {
    R: mRes,
    mode: "manual",
    nameOf: nameOf
  }))), /*#__PURE__*/React.createElement("aside", {
    className: "notify-side"
  }, /*#__PURE__*/React.createElement("h4", null, "\uD83D\uDCCB \u4F5C\u696D\u63D0\u9192\u7D00\u9304\uFF08v514 \u8D77\u53EA\u6709\u624B\u52D5\u767C\u7684\uFF09"), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "\u51FA\u73FE", /*#__PURE__*/React.createElement("b", null, "\u6C92\u88AB\u901A\u77E5\u904E\u7684\u65B0\u4F5C\u696D")), /*#__PURE__*/React.createElement("li", null, "\u6709\u5BB6\u9577", /*#__PURE__*/React.createElement("b", null, "\u525B\u7D81\u5B9A"), "\u3001\u9084\u6C92\u6536\u904E\u9019\u4F4D\u5B69\u5B50\u7684\u63D0\u9192"), /*#__PURE__*/React.createElement("li", null, "\u6BCF\u9031", /*#__PURE__*/React.createElement("b", null, "\u661F\u671F\u4E00"), "\u56FA\u5B9A\u56DE\u5831\u4E00\u6B21"), /*#__PURE__*/React.createElement("li", null, "\u672C\u9031\u6709\u4F5C\u696D", /*#__PURE__*/React.createElement("b", null, "\u660E\u5929\u5230\u671F"))), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, "\u540C\u4E00\u500B\u5B69\u5B50\u4E00\u5929\u6700\u591A\u4E00\u5247\u3002\u53EA\u5269\u300C\u53EF\u4EE5\u5148\u9810\u7FD2\u300D\u6642\u4E0D\u767C\u3002"), /*#__PURE__*/React.createElement("h4", null, "\uD83D\uDCE3 \u4E3B\u52D5\u63D0\u9192"), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, "\u4F60\u60F3\u63D0\u9192\u7684\u6642\u5019\u518D\u7528\u3002\u53EF\u4EE5\u53EA\u6311\u4E00\u500B\u5E74\u7D1A\u6216\u5E7E\u4F4D\u5B69\u5B50\uFF0C\u4E5F\u53EF\u4EE5\u9644\u4E00\u53E5\u8A71\uFF08\u4F8B\u5982\u5C0F\u8003\u3001\u88DC\u4EA4\uFF09\u3002 \u5BB6\u9577\u770B\u5230\u7684\u6A19\u984C\u662F\u300C\uD83D\uDCE3 Alan \u8001\u5E2B\u63D0\u9192\u300D\uFF0C\u4E00\u773C\u5C31\u5206\u5F97\u51FA\u4E0D\u662F\u7CFB\u7D71\u81EA\u52D5\u767C\u7684\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, /*#__PURE__*/React.createElement("b", null, "\u5169\u908A\u7684\u7D00\u9304\u5B8C\u5168\u5206\u958B"), "\uFF1A\u4F60\u4E3B\u52D5\u767C\u904E\uFF0C\u4E0D\u6703\u8B93\u4ECA\u665A\u7684\u81EA\u52D5\u63D0\u9192\u5C11\u767C\uFF1B\u81EA\u52D5\u767C\u904E\uFF0C\u4E5F\u4E0D\u6703\u64CB\u4F4F\u4F60\u4E3B\u52D5\u767C\u3002"), /*#__PURE__*/React.createElement("h4", null, "\u8A0A\u606F\u9577\u4EC0\u9EBC\u6A23"), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, "\u4E09\u5340\uFF1A\u672C\u9031", /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#1B7A3E'
    }
  }, "\u7DA0"), "\u3001\u524D\u5E7E\u9031\u9084\u6C92\u5B8C\u6210", /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#C62828'
    }
  }, "\u7D05"), "\u3001\u53EF\u4EE5\u5148\u9810\u7FD2\u7070\u3002 \u6BCF\u884C\u53EA\u5BEB\u300C\u54EA\u4E00\u985E\u30FB\u5E7E\u9805\u300D\uFF0C\u624B\u6A5F\u770B\u4E0D\u6703\u6298\u884C\u3002")));
}

/* v426：自動／主動共用的結果區（預覽時一定講清楚誰會收到、誰不會、為什麼） */
function HwResult({
  R,
  mode,
  nameOf
}) {
  var REASON = {
    new: '有新作業',
    weekly: '每週一回報',
    due1: '明天到期',
    bind: '剛綁定、還沒收過'
  };
  var sends = R.sends || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "hwr-result"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hwr-meta"
  }, "\u4ECA\u5929 ", R.today, mode === 'auto' ? /*#__PURE__*/React.createElement(React.Fragment, null, " \uFF5C \u5B78\u671F\u4F5C\u696D ", R.homeworkCount, " \u4EFD \uFF5C \u4ECA\u665A\u6703\u767C ", sends.length, " \u4F4D") : /*#__PURE__*/React.createElement(React.Fragment, null, " \uFF5C ", R.dryRun ? '預覽' : '已發送', " ", sends.length, " \u4F4D\u5B69\u5B50")), mode === 'auto' && R.homeworkByGrade && /*#__PURE__*/React.createElement("div", {
    className: "hwr-grades"
  }, Object.keys(R.homeworkByGrade).sort().map(g => /*#__PURE__*/React.createElement("span", {
    key: g,
    className: 'hwr-grade' + (R.homeworkByGrade[g] ? '' : ' zero')
  }, g.toUpperCase(), /*#__PURE__*/React.createElement("em", null, R.homeworkByGrade[g])))), sends.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "roster-hint"
  }, mode === 'auto' ? '今晚 18:00 沒有要自動發的。' : '這個對象目前沒有要提醒的（見下方原因）。') : /*#__PURE__*/React.createElement("div", {
    className: "hwr-list"
  }, sends.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.email,
    className: "hwr-row"
  }, /*#__PURE__*/React.createElement("b", null, s.name || s.email), /*#__PURE__*/React.createElement("div", {
    className: "hwr-buckets"
  }, s.buckets && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\u672C\u9031 ", /*#__PURE__*/React.createElement("em", null, s.buckets.thisWeek)), /*#__PURE__*/React.createElement("span", null, "\u524D\u5E7E\u9031\u6C92\u5B8C\u6210 ", /*#__PURE__*/React.createElement("em", null, s.buckets.overdue)), /*#__PURE__*/React.createElement("span", {
    className: "soft"
  }, "\u53EF\u4EE5\u5148\u9810\u7FD2 ", /*#__PURE__*/React.createElement("em", null, s.buckets.preview))), mode === 'auto' && s.reason && /*#__PURE__*/React.createElement("span", {
    className: "soft"
  }, "\u539F\u56E0\uFF1A", REASON[s.reason] || s.reason), s.to > 1 && /*#__PURE__*/React.createElement("span", {
    className: "soft"
  }, s.to, " \u500B LINE")), s.sections ? /*#__PURE__*/React.createElement(HwBubble, {
    name: s.name,
    secs: s.sections,
    title: mode === 'manual' ? '📣 Alan 老師提醒' : null,
    note: mode === 'manual' ? R.note : null
  }) : s.text ? /*#__PURE__*/React.createElement("pre", {
    className: "hwr-msg"
  }, s.text) : null))), (R.skippedQuiet || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "hwr-warn soft"
  }, "\uD83D\uDD15 \u4ECA\u665A\u4E0D\u767C\uFF08\u907F\u514D\u6BCF\u5929\u6D17\u7248\uFF09\uFF1A", R.skippedQuiet.map(x => x.name).join('、'), "\u2014\u2014", R.skippedQuiet[0].why, "\u3002\u8981\u73FE\u5728\u63D0\u9192\u4ED6\u5011\uFF0C\u7528\u4E0B\u9762\u7684\u300C\uD83D\uDCE3 \u4E3B\u52D5\u63D0\u9192\u300D\u3002"), (R.skippedDone || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "hwr-warn soft"
  }, "\uD83C\uDF89 \u90FD\u505A\u5B8C\u4E86\uFF08\u53EA\u5269\u9810\u7FD2\u6216\u5168\u90E8\u5B8C\u6210\uFF09\uFF1A", R.skippedDone.join('、')), (R.noBind || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "hwr-warn"
  }, "\u26A0\uFE0F \u5BB6\u9577\u9084\u6C92\u7D81\u5B9A\uFF0C\u6536\u4E0D\u5230\uFF1A", R.noBind.map(e => nameOf ? nameOf(e) : e).join('、')), (R.skippedNoBind || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "hwr-warn"
  }, "\u26A0\uFE0F \u6709\u4F5C\u696D\u4F46\u5BB6\u9577\u9084\u6C92\u7D81\u5B9A\uFF08\u6536\u4E0D\u5230\uFF09\uFF1A", R.skippedNoBind.join('、')), (R.skippedNoGrade || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "hwr-warn soft"
  }, "\u2139\uFE0F \u4E0D\u662F\u5B78\u6821\u5E33\u865F\uFF08\u5B78\u865F\u4E0D\u662F le\u25CB\u25CB \u958B\u982D\uFF09\uFF0C\u4E0D\u767C\u5B78\u671F\u4F5C\u696D\uFF1A", R.skippedNoGrade.join('、')), (R.errors || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg err"
  }, "\u767C\u9001\u932F\u8AA4\uFF1A", R.errors.join('；')));
}

/* ── 管理者維護（v337）— 只有擁有者看得到 ───────────────── */
function AdminManager() {
  var [admins, setAdmins] = useDash([]);
  var [email, setEmail] = useDash('');
  var [name, setName] = useDash('');
  var [err, setErr] = useDash(null);
  var [ok, setOk] = useDash(null);
  var [busy, setBusy] = useDash(false);
  useDashE(() => window.subscribeAdmins(setAdmins, () => setErr('讀取失敗 — 請確認已在 Firebase Console 發布新版 firestore.rules')), []);
  var owner = (window.OWNER_EMAILS || [])[0] || '';
  var handleAdd = async () => {
    setErr(null);
    setOk(null);
    var e = email.trim().toLowerCase();
    if (!e.includes('@')) {
      setErr('請輸入有效的 Google email');
      return;
    }
    if (!confirm(`確定把「${e}」設為管理者嗎？\n\n` + `他將可以：\n` + `・編輯／刪除所有課程內容\n` + `・看到全班學生的成績、完成度與錯題\n` + `・看到暑假報名的家長資料\n\n` + `請確認這是你信任的老師本人帳號。`)) return;
    setBusy(true);
    try {
      await window.addAdmin(e, name);
      setEmail('');
      setName('');
      setOk(`已將 ${e} 設為管理者。請他重新整理網頁即可看到後台。`);
    } catch (ex) {
      setErr(ex.message === 'invalid-email' ? 'email 格式不正確' : ex.message === 'owner-already' ? '這已經是擁有者帳號了' : '新增失敗：' + (ex.code || ex.message));
    }
    setBusy(false);
  };
  var handleRemove = async a => {
    if (!confirm(`確定移除「${a.email}」的管理者權限嗎？\n他將立刻失去後台與學生資料的存取權。`)) return;
    setErr(null);
    setOk(null);
    try {
      await window.removeAdmin(a.email);
      setOk(`已移除 ${a.email}`);
    } catch (ex) {
      setErr('移除失敗：' + (ex.code || ex.message));
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "notify-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "notify-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "linkbind-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "\u7BA1\u7406\u8005\uFF08\u8001\u5E2B\u5E33\u865F\uFF09"), /*#__PURE__*/React.createElement("span", {
    className: "linkbind-summary"
  }, "\u64C1\u6709\u8005 1 \u4F4D \xB7 \u5176\u4ED6\u7BA1\u7406\u8005 ", admins.length, " \u4F4D"))), /*#__PURE__*/React.createElement("div", {
    className: "roster-form"
  }, /*#__PURE__*/React.createElement("input", {
    className: "roster-input",
    placeholder: "\u8001\u5E2B\u7684 Google email",
    value: email,
    onChange: e => setEmail(e.target.value),
    onKeyDown: e => e.key === 'Enter' && handleAdd()
  }), /*#__PURE__*/React.createElement("input", {
    className: "roster-input roster-input-name",
    placeholder: "\u59D3\u540D\uFF08\u9078\u586B\uFF09",
    value: name,
    onChange: e => setName(e.target.value),
    onKeyDown: e => e.key === 'Enter' && handleAdd()
  }), /*#__PURE__*/React.createElement("button", {
    className: "roster-add-btn",
    onClick: handleAdd,
    disabled: busy
  }, "\uFF0B \u8A2D\u70BA\u7BA1\u7406\u8005")), err && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg err"
  }, "\u26A0\uFE0F ", err), ok && /*#__PURE__*/React.createElement("div", {
    className: "notify-msg ok"
  }, "\u2705 ", ok), /*#__PURE__*/React.createElement("div", {
    className: "roster-list"
  }, /*#__PURE__*/React.createElement("div", {
    className: "roster-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "roster-row-info"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roster-row-name"
  }, "\uD83D\uDC51 ", owner), /*#__PURE__*/React.createElement("span", {
    className: "roster-row-email"
  }, "\u64C1\u6709\u8005 \u2014 \u6C38\u4E45\u6B0A\u9650\uFF0C\u7121\u6CD5\u88AB\u79FB\u9664"))), admins.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.email,
    className: "roster-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "roster-row-info"
  }, /*#__PURE__*/React.createElement("span", {
    className: "roster-row-name"
  }, a.name || '（未填姓名）'), /*#__PURE__*/React.createElement("span", {
    className: "roster-row-email"
  }, a.email)), /*#__PURE__*/React.createElement("button", {
    className: "roster-del-btn",
    title: "\u79FB\u9664\u7BA1\u7406\u8005",
    onClick: () => handleRemove(a)
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "trash",
    size: 13
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "roster-hint"
  }, "\u65B0\u589E\u5F8C\u5C0D\u65B9", /*#__PURE__*/React.createElement("b", null, "\u91CD\u65B0\u6574\u7406\u7DB2\u9801"), "\u5C31\u6703\u770B\u5230\u5F8C\u53F0\u3002\u82E5\u4ED6\u9084\u9700\u8981\u300C\u4E0A\u50B3 PDF\uFF0F\u55AE\u5B57\u5361\u5716\u7247\u300D\uFF0C \u8981\u53E6\u5916\u628A\u4ED6\u7684\u4FE1\u7BB1\u52A0\u9032 ", /*#__PURE__*/React.createElement("code", null, "storage.rules"), " \u518D\u767C\u5E03\u4E00\u6B21\uFF08Firebase \u5E73\u53F0\u9650\u5236\uFF0CStorage \u8B80\u4E0D\u5230\u9019\u4EFD\u540D\u55AE\uFF09\u3002")), /*#__PURE__*/React.createElement("aside", {
    className: "notify-side"
  }, /*#__PURE__*/React.createElement("h4", null, "\u26A0\uFE0F \u7D66\u7BA1\u7406\u8005\u6B0A\u9650\uFF1D"), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, "\u7DE8\u8F2F\uFF0F\u522A\u9664\u6240\u6709\u8AB2\u7A0B\u5167\u5BB9"), /*#__PURE__*/React.createElement("li", null, "\u770B\u5230\u5168\u73ED\u6210\u7E3E\u3001\u5B8C\u6210\u5EA6\u3001\u932F\u984C"), /*#__PURE__*/React.createElement("li", null, "\u770B\u5230\u6691\u5047\u5831\u540D\u7684\u5BB6\u9577\u8CC7\u6599")), /*#__PURE__*/React.createElement("p", {
    className: "notify-note"
  }, "\u53EA\u6709\u4F60\uFF08\u64C1\u6709\u8005\uFF09\u80FD\u589E\u6E1B\u7BA1\u7406\u8005\u2014\u2014\u5176\u4ED6\u8001\u5E2B\u7121\u6CD5\u81EA\u5DF1\u52A0\u4EBA\u3001\u4E5F\u7121\u6CD5\u628A\u4F60\u79FB\u9664\u3002 \u96E2\u8077\u6216\u4E0D\u518D\u5408\u4F5C\u6642\uFF0C\u8A18\u5F97\u56DE\u4F86\u79FB\u9664\u3002")));
}

/* ── Student list overview ─────────────────────────────── */
function TeacherDashboard({
  onClose,
  weeks,
  weekOrder,
  grade
}) {
  var [students, setAllStudents] = useDash([]);
  var [selected, setSelected] = useDash(null);
  var [refreshKey, setRefreshKey] = useDash(0);
  var [allReportOpen, setAllReportOpen] = useDash(false);
  var [tab, setTab] = useDash('overview'); // 'overview' | 'report' | 'roster'
  /* 🔴 v531：聊天室說「幫 Eric 擬紀錄」「我要改申論」時，app.jsx 會先放一張字條
     （window.__dashGoto）再把後台打開。**這張字條從 v517 起就沒有人讀**——
     後台只是開起來，停在「總覽」，他還要自己再點一次。
     ⚠ 讀完要清掉，不然下次自己開後台又會被帶走。 */
  useDashE(() => {
    var g = null;
    try {
      g = window.__dashGoto;
      window.__dashGoto = null;
    } catch (e) {}
    if (g && g.tab) setTab(g.tab);
    /* 🔴 v543：`window.__dashEmail` 從 v531 寫到現在**沒有任何人讀**——
       跟 v531 的 __dashGoto 是同一個坑（寫 window.__xxx 當字條一定要確認有人讀）。
       → 這裡不再轉存一個沒人要的欄位；📒 上課紀錄那一頁自己去讀 __lessonDraft。 */
    /* v534：公告的稿子先打好（LineNotify 自己會讀這張字條）。
       ⚠ 只是填好——**送出那一下還是老師自己按**，這是會直接送到家長手機的東西。 */
    if (g && g.notify) {
      try {
        window.__notifyDraft = g.notify;
      } catch (e) {}
    }
    /* v548：提醒那一頁的人選也先選好（HwRemind 自己會讀）。⚠ 一樣只是選好，送出是他按。 */
    if (g && g.remind) {
      try {
        window.__remindDraft = g.remind;
      } catch (e) {}
    }
  }, []);
  var [hotOpen, setHotOpen] = useDash(null); // v307 (F11): 展開哪一列常錯題看「哪些孩子錯」

  useDashE(() => window.subscribeAllStudents(setAllStudents), [refreshKey]);

  // v339: 多位老師各帶各的——後台（總覽/成績/常錯題/週報）只看自己帶的學生。
  // 名單裡沒指定老師的舊資料 → 算擁有者(Alan)的。看得到「全部」的只有擁有者。
  var [rosterAll, setRosterAll] = useDash([]);
  var [stuScope, setStuScope] = useDash('mine'); // 'mine' | 'all'
  useDashE(() => window.subscribeRoster(setRosterAll, () => {}), []);
  var myEmailD = String(window._currentUser && window._currentUser.email || '').toLowerCase();
  var isOwnerD = !!(window.isOwnerUser && window.isOwnerUser(window._currentUser));
  var ownerEmailD = String((window.OWNER_EMAILS || [])[0] || '').toLowerCase();
  var myStudentEmails = useDashM(() => new Set(rosterAll.filter(s => String(s.teacher || ownerEmailD).toLowerCase() === myEmailD).map(s => String(s.email).toLowerCase())), [rosterAll, myEmailD, ownerEmailD]);
  var otherStudentsN = useDashM(() => students.filter(s => !myStudentEmails.has(String(s.email || '').toLowerCase())).length, [students, myStudentEmails]);
  var visibleStudents = useDashM(() => stuScope === 'all' ? students : students.filter(s => myStudentEmails.has(String(s.email || '').toLowerCase())), [students, myStudentEmails, stuScope]);

  /* v435（Alan：「我怎麼看不到有新的學生？」）：學生要「在名單裡而且是我帶的」才會出現在
     「我的學生」。新同學第一次用 Google 登入時只會產生進度資料，名單裡還沒有他 →
     舊版是什麼都不說、他就這樣被藏起來。這裡把這種人抓出來，一鍵加進我的名單。
     ⚠ 完全沒登入的「訪客」不會在這裡：他沒有帳號，紀錄只留在那台裝置上（下面那行字有寫）。 */
  var rosterEmails = useDashM(() => new Set(rosterAll.map(s => String(s.email || '').toLowerCase()).filter(Boolean)), [rosterAll]);
  var newcomers = useDashM(() => students.filter(s => {
    var em = String(s.email || '').toLowerCase();
    if (!em || rosterEmails.has(em)) return false;
    if (em === myEmailD || em === ownerEmailD) return false; // 老師自己的帳號不算
    return true;
  }), [students, rosterEmails, myEmailD, ownerEmailD]);
  var [addingNew, setAddingNew] = useDash('');
  var addNewcomer = async s => {
    var em = String(s.email || '').toLowerCase();
    setAddingNew(em);
    try {
      await window.addRosterStudent(em, friendlyName(s), window.gradeFromEmail && window.gradeFromEmail(em) || 'g3');
    } catch (e) {
      alert('加入名單失敗：' + (e.code || e.message));
    }
    setAddingNew('');
  };

  // v251: 範圍切換——「教室（目前年級）」／「☀️ 暑假」，後台自己訂閱暑假題庫，不必出去繞一圈
  var appIsSummer = useDashM(() => (weekOrder || []).some(wid => window.isSummerTrack && window.isSummerTrack(String(wid).split('-')[0])), [weekOrder]);
  var [scope, setScope] = useDash('app'); // 'app' | 'summer'
  var [sumLib, setSumLib] = useDash({
    weeks: null,
    order: []
  });
  useDashE(() => {
    if (!window.summerApi) return;
    return window.summerApi(window.SUMMER_LIB || 'sl').subscribe((w, o) => setSumLib({
      weeks: w,
      order: o
    }), () => {});
  }, []);
  var useSummerScope = scope === 'summer' && !appIsSummer;
  var dWeeks = useSummerScope ? sumLib.weeks || {} : weeks;
  var dOrder = useSummerScope ? sumLib.order || [] : weekOrder || [];

  // v251: 選中的週統一管理——進學生詳情按 Back 不再重置；預設＝今天所在的週
  var [selWeekId, setSelWeekId] = useDash(null);
  useDashE(() => {
    if (!dOrder.length) return;
    if (selWeekId && dOrder.indexOf(selWeekId) !== -1) return;
    setSelWeekId(dashCurrentWeekId(dWeeks, dOrder));
  }, [dOrder, scope]);

  // v238: 暑假發派名單——暑假模式下，每個學生的總數只算「發派給他」的單元
  var [summerMeta, setSummerMeta] = useDash({
    students: {}
  });
  useDashE(() => window.subscribeSummerMeta ? window.subscribeSummerMeta(setSummerMeta, () => {}) : undefined, []);
  var isSummerData = useSummerScope || appIsSummer;

  // v307 (Finding 6): 目前載入的是哪個年級的週次——用來標示＆預設篩選，避免跨年級假紅字。
  // grade prop 缺時由 dOrder[0] 前綴推導（gN-…）；G3 週次無前綴 → 預設 g3；暑假模式不套用。
  var currentGrade = useDashM(() => {
    if (isSummerData) return null;
    if (grade) return grade;
    var m = String(dOrder && dOrder[0] || '').match(/^g(\d)/);
    return m ? 'g' + m[1] : 'g3';
  }, [grade, dOrder, isSummerData]);

  /* ══ v434（Alan：「我進 G4 只能看 G4；切到 G6 只會看到 G6 有沒有做 G4 的作業，
        但 G6 只會有 G6 的作業」）══════════════════════════════════════════════
     每個年級的作業各存一份（class/data、class/data_g1…data_g6），後台以前只載入
     「目前打開的那間教室」那一份 → 別班學生一律被拿去對這一份算，當然全是 0/20。
     （這跟 v419 LINE 提醒發到別班是同一個坑：一份資料當成全部。）
     改成六個年級全部訂閱，每位學生用**他自己年級**的那一份算。 */
  var [gradeData, setGradeData] = useDash({}); // { g3: { weeks, order }, g4: {...} … }
  useDashE(() => {
    var subs = [];
    var add = (g, fn) => {
      if (typeof fn !== 'function') return;
      try {
        subs.push(fn((w, o) => setGradeData(prev => Object.assign({}, prev, {
          [g]: {
            weeks: w || {},
            order: (o || []).slice()
          }
        })), () => {}));
      } catch (e) {/* 某個年級讀不到就少那一個年級，其他照常 */}
    };
    add('g1', window.subscribeToClassDataG1);
    add('g2', window.subscribeToClassDataG2);
    add('g3', window.subscribeToClassData);
    add('g4', window.subscribeToClassDataG4);
    add('g5', window.subscribeToClassDataG5);
    add('g6', window.subscribeToClassDataG6);
    return () => subs.forEach(u => {
      try {
        u && u();
      } catch (e) {}
    });
  }, []);
  var gradeOfStu = s => (window.gradeFromEmail ? window.gradeFromEmail(s && s.email || '') : null) || null;
  var weekIdForGrade = (g, wid) => dashWeekIdForGrade(gradeData[g], dWeeks, g, wid);
  /* 一位學生要用「哪一份作業、哪一週」——暑假照舊（暑假題庫是全校共用一份）。 */
  var dataForStudent = s => {
    if (isSummerData) return {
      weeks: weeksForStudent(s),
      order: dOrder,
      weekId: selWeekId,
      ok: true
    };
    var g = gradeOfStu(s);
    var gd = g && gradeData[g];
    if (!gd || !gd.order.length) return {
      weeks: dWeeks,
      order: dOrder,
      weekId: selWeekId,
      ok: !g || g === currentGrade
    };
    var wid = weekIdForGrade(g, selWeekId);
    return {
      weeks: gd.weeks,
      order: gd.order,
      weekId: wid,
      ok: !!wid
    };
  };
  var weeksForStudent = s => {
    if (isSummerData) {
      if (!window.filterWeeksForPlan) return dWeeks;
      var plan = (summerMeta.students || {})[String(s && s.email || '').toLowerCase()] || null;
      return window.filterWeeksForPlan(dWeeks, dOrder, plan);
    }
    var g = gradeOfStu(s);
    var gd = g && gradeData[g];
    return gd && gd.order.length ? gd.weeks : dWeeks;
  };
  var orderForStudent = s => {
    if (isSummerData) return dOrder;
    var g = gradeOfStu(s);
    var gd = g && gradeData[g];
    return gd && gd.order.length ? gd.order : dOrder;
  };
  var allItemsFor = s => {
    var w = weeksForStudent(s);
    var sharedIds = window.sharedItemIds ? window.sharedItemIds(w, orderForStudent(s)) : new Set(); // v596
    return orderForStudent(s).flatMap(wid => {
      var wk = w[wid];
      if (!wk) return [];
      return window.CATEGORIES.flatMap(c => (wk.items[c.id] || []).map(it => ({
        id: it.id,
        progressId: `${wid}_${it.id}`,
        shared: sharedIds.has(it.id),
        // v596：這個 id 出現在好幾週 → 進度只認自己這一週
        title: it.title || it.id,
        weekId: wid,
        // v307 (F8): 用來把「當前這週」置頂＋標示
        weekLabel: wk.label,
        cat: c.title,
        dueDate: ((wk.homework || {})[it.id] || {}).dueDate || null // v257: 遲交判定用
      })));
    });
  };
  useDashE(() => {
    if (!selected) return;
    var fresh = visibleStudents.find(s => s.uid === selected.uid);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [visibleStudents, selected?.uid]);

  // Flatten all items across every week (for "X / total" calculation)
  var allItems = useDashM(() => {
    var sharedIds = window.sharedItemIds ? window.sharedItemIds(dWeeks, dOrder) : new Set(); // v596
    return dOrder.flatMap(wid => {
      var w = dWeeks[wid];
      if (!w) return [];
      return window.CATEGORIES.flatMap(c => (w.items[c.id] || []).map(it => ({
        id: it.id,
        progressId: `${wid}_${it.id}`,
        shared: sharedIds.has(it.id),
        title: it.title || it.id,
        weekLabel: w.label,
        cat: c.title
      })));
    });
  }, [dWeeks, dOrder]);
  var total = allItems.length;

  // v239: 常錯題只統計「目前範圍」的項目（暑假模式=暑假題庫），不再混到學期舊紀錄
  var currentIds = useDashM(() => new Set(allItems.map(it => it.id)), [allItems]);
  // v307 (F11): itemId → 單元標題，讓常錯題標出「出自哪個單元」
  var titleById = useDashM(() => {
    var m = {};
    allItems.forEach(it => {
      m[it.id] = it.title;
    });
    return m;
  }, [allItems]);
  var questionStats = useDashM(() => {
    var map = {};
    visibleStudents.forEach(s => {
      Object.entries(s.items || {}).forEach(([itemId, prog]) => {
        var bare = itemId.includes('_') ? itemId.slice(itemId.lastIndexOf('_') + 1) : itemId;
        if (!currentIds.has(bare) && !currentIds.has(itemId)) return;
        (prog?.wrongQuestions || []).forEach(w => {
          var key = `${itemId}::${w.q}::${w.answer}`;
          if (!map[key]) map[key] = {
            itemId,
            unit: titleById[bare] || titleById[itemId] || '',
            q: w.q,
            answer: w.answer,
            count: 0,
            students: new Set()
          };
          map[key].count += 1;
          map[key].students.add(friendlyName(s));
        });
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8).map(x => ({
      ...x,
      students: Array.from(x.students)
    }));
  }, [visibleStudents, currentIds, titleById]);

  // v287: 分段閱讀各段答對率——「哪一段全班最卡」一眼看到（資料來自 progress.grStats）
  var grSegRates = useDashM(() => {
    var map = {};
    visibleStudents.forEach(s => {
      Object.entries(s.items || {}).forEach(([itemId, prog]) => {
        var bare = itemId.includes('_') ? itemId.slice(itemId.lastIndexOf('_') + 1) : itemId;
        if (!currentIds.has(bare) && !currentIds.has(itemId)) return;
        var g = prog && prog.grStats;
        if (!g || !Array.isArray(g.segs)) return;
        var key = prog.itemTitle || bare;
        if (!map[key]) map[key] = {
          title: key,
          segs: [],
          final: {
            ok: 0,
            total: 0
          },
          n: 0
        };
        var m = map[key];
        m.n += 1;
        g.segs.forEach((st, i) => {
          if (!m.segs[i]) m.segs[i] = {
            ok: 0,
            total: 0
          };
          m.segs[i].ok += st.ok || 0;
          m.segs[i].total += st.total || 0;
        });
        if (g.final) {
          m.final.ok += g.final.ok || 0;
          m.final.total += g.final.total || 0;
        }
      });
    });
    return Object.values(map).filter(m => m.segs.some(st => st && st.total > 0) || m.final.total > 0);
  }, [visibleStudents, currentIds]);
  var stats = s => {
    var its = s.items || {};
    var list = allItemsFor(s); // v238: 暑假模式只算發派給這位學生的

    // Match by progressId (weekId_itemId), bare itemId, OR any key ending in _itemId
    // — handles cases where weekId changed (week rebuilt / grade switched)
    var isDone = it => window.progKeysFor(its, it).some(k => its[k]?.done); // v596：重複 id 只認自己這一週
    var done = list.filter(isDone).length;

    // Score: only count items that also have 'done' (avoids ghost scores from deleted items)
    // and cap at 100 to prevent impossible percentages from data corruption
    // v239: 平均分只算目前範圍內（且派給他）的項目——學期舊成績不會混進暑假報告
    var progFor = it => {
      var k = window.progKeysFor(its, it)[0];
      return k ? its[k] : null;
    };
    var scores = list.map(progFor).filter(pr => pr && pr.done && pr.score != null).map(pr => Math.min(100, pr.score || 0));
    var avg = scores.length ? Math.round(scores.reduce((acc, v) => acc + v, 0) / scores.length) : null;
    var last = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    }) : '—';
    return {
      done,
      avg,
      last,
      total: list.length
    };
  };

  // v236: 專業後台外殼——側欄導覽 + 頂列，內容元件不變
  // v257: 「學習報告」分頁與總覽重複（同樣是學生×完成度×平均分）——合併：
  // 總覽＝紅黃綠燈＋全班常錯題；個人成績細節在學生詳情、家長版在週報。
  /* v377（Alan：「太多沒什麼用的功能、也很亂」）：一個都不刪，只分成
     「每天會用的」和「偶爾設定一次的」兩區——8 個平起平坐的分頁很難掃。 */
  var NAV = [{
    id: 'overview',
    ico: '🚦',
    label: '總覽',
    sub: '完成度與常錯題',
    sec: '每天用'
  }, {
    id: 'roster',
    ico: '👥',
    label: '學生名單',
    sub: '帳號管理',
    sec: '每天用'
  },
  /* v496（Alan：「我是一對一…要寫這次上課這位小朋友掌握度幾 percentage、
     以及有什麼功課、以及下次上課進度」）*/
  {
    id: 'lessons',
    ico: '📒',
    label: '上課紀錄',
    sub: '掌握度／功課／下次進度',
    sec: '每天用'
  }, {
    id: 'stars',
    ico: '⭐',
    label: '集點',
    sub: '給星星／兌換扣點',
    sec: '每天用'
  }, /* v530（Alan：「Rubri's 加上去吧」）——康橋 Formative 的申論題照 rubric 三項手改 */
  {
    id: 'marking',
    ico: '📋',
    label: '申論批改',
    sub: '三項評分（AI 先給建議）',
    sec: '每天用'
  }, {
    id: 'notify',
    ico: '📢',
    label: 'LINE 通知',
    sub: '發送公告',
    sec: '每天用'
  }, {
    id: 'hwremind',
    ico: '🔔',
    label: '作業提醒',
    sub: '手動發（自動已關）',
    sec: '每天用'
  }, {
    id: 'linelink',
    ico: '🔗',
    label: 'LINE 綁定',
    sub: '家長綁定狀態',
    sec: '設定一次'
  }, {
    id: 'shop',
    ico: '🛍️',
    label: '商店',
    sub: '兌換商品維護',
    sec: '設定一次'
  }, {
    id: 'summer',
    ico: '☀️',
    label: '暑假發派',
    sub: '每人任務清單',
    sec: '設定一次'
  },
  // v337: 只有「擁有者」看得到管理者維護（規則同樣只允許擁有者寫）
  ...(window.isOwnerUser && window.isOwnerUser(window._currentUser) ? [{
    id: 'admins',
    ico: '👑',
    label: '管理者',
    sub: '老師帳號權限',
    sec: '設定一次'
  }] : [])];
  var cur = NAV.find(n => n.id === tab) || NAV[0];

  // v352: 手機的分頁列是一條可左右滑的膠囊列——換分頁後把目前這顆捲進畫面，
  //       不然切到後面幾個分頁時看不到自己站在哪裡。
  useDashE(() => {
    var el = document.querySelector('.tdash-nav-item.on');
    if (el && el.scrollIntoView) el.scrollIntoView({
      block: 'nearest',
      inline: 'center'
    });
  }, [tab]);
  return /*#__PURE__*/React.createElement("div", {
    className: "dash-overlay tdash"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tdash-shell"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "tdash-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tdash-brand"
  }, /*#__PURE__*/React.createElement("span", {
    className: "tdash-brand-a"
  }, "A", /*#__PURE__*/React.createElement("i", null, ".")), /*#__PURE__*/React.createElement("span", {
    className: "tdash-brand-t"
  }, "\u8001\u5E2B\u5F8C\u53F0", /*#__PURE__*/React.createElement("em", null, "Admin Console"))), /*#__PURE__*/React.createElement("nav", {
    className: "tdash-nav"
  }, NAV.map((n, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: n.id
  }, (i === 0 || NAV[i - 1].sec !== n.sec) && /*#__PURE__*/React.createElement("div", {
    className: "tdash-nav-sec"
  }, n.sec), /*#__PURE__*/React.createElement("button", {
    className: `tdash-nav-item${tab === n.id ? ' on' : ''}`,
    onClick: () => {
      setTab(n.id);
      setSelected(null);
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tdash-nav-ico"
  }, n.ico), /*#__PURE__*/React.createElement("span", {
    className: "tdash-nav-txt"
  }, n.label, /*#__PURE__*/React.createElement("em", null, n.sub)))))), /*#__PURE__*/React.createElement("div", {
    className: "tdash-side-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tdash-side-btn",
    onClick: () => setAllReportOpen(true)
  }, "\uD83D\uDCCB \u5168\u73ED\u9031\u5831"), /*#__PURE__*/React.createElement("button", {
    className: "tdash-side-btn",
    onClick: () => setRefreshKey(k => k + 1)
  }, "\u21BB \u91CD\u65B0\u6574\u7406"), /*#__PURE__*/React.createElement("button", {
    className: "tdash-side-btn tdash-exit",
    onClick: onClose
  }, "\u2190 \u56DE\u5230\u7DB2\u7AD9"))), /*#__PURE__*/React.createElement("main", {
    className: "tdash-main"
  }, /*#__PURE__*/React.createElement("header", {
    className: "tdash-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tdash-top-title"
  }, /*#__PURE__*/React.createElement("h2", null, selected ? `${selected.name || '學生'} 的學習紀錄` : cur.label, !selected && !isSummerData && currentGrade && /*#__PURE__*/React.createElement("span", {
    className: "tdash-grade-label"
  }, "\u76EE\u524D\uFF1A", currentGrade.toUpperCase(), " \u6559\u5BA4")), /*#__PURE__*/React.createElement("span", {
    className: "tdash-top-meta"
  }, selected ? '個人完成度、分數與錯題' : cur.sub)), window.summerApi && !appIsSummer && /*#__PURE__*/React.createElement("div", {
    className: "tdash-scope",
    role: "tablist",
    "aria-label": "\u8CC7\u6599\u7BC4\u570D"
  }, /*#__PURE__*/React.createElement("button", {
    role: "tab",
    "aria-selected": scope === 'app',
    className: scope === 'app' ? 'on' : '',
    onClick: () => setScope('app')
  }, "\u6559\u5BA4"), /*#__PURE__*/React.createElement("button", {
    role: "tab",
    "aria-selected": scope === 'summer',
    className: scope === 'summer' ? 'on' : '',
    onClick: () => setScope('summer')
  }, "\u2600\uFE0F \u6691\u5047")), otherStudentsN > 0 && /*#__PURE__*/React.createElement("div", {
    className: "tdash-scope",
    role: "tablist",
    "aria-label": "\u5B78\u751F\u7BC4\u570D"
  }, /*#__PURE__*/React.createElement("button", {
    role: "tab",
    "aria-selected": stuScope === 'mine',
    className: stuScope === 'mine' ? 'on' : '',
    onClick: () => setStuScope('mine')
  }, "\u6211\u7684\u5B78\u751F"), /*#__PURE__*/React.createElement("button", {
    role: "tab",
    "aria-selected": stuScope === 'all',
    className: stuScope === 'all' ? 'on' : '',
    onClick: () => setStuScope('all')
  }, "\u5168\u90E8")), /*#__PURE__*/React.createElement("button", {
    className: "tdash-close",
    onClick: onClose,
    title: "\u95DC\u9589\u5F8C\u53F0"
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dash-body tdash-content"
  }, tab === 'roster' ? /*#__PURE__*/React.createElement(RosterManager, null) : tab === 'lessons' ?
  /*#__PURE__*/
  /* v502：包一層，壞掉時顯示錯誤而不是整頁白掉 */
  React.createElement(window.Boom, {
    where: "\u4E0A\u8AB2\u7D00\u9304"
  }, /*#__PURE__*/React.createElement(LessonLog, {
    roster: rosterAll,
    myEmail: myEmailD
  })) : tab === 'notify' ? /*#__PURE__*/React.createElement(LineNotify, null) : tab === 'linelink' ? /*#__PURE__*/React.createElement(LineLink, null) : tab === 'marking' ? /*#__PURE__*/React.createElement(ExamMarking, {
    students: visibleStudents
  }) : tab === 'stars' ? /*#__PURE__*/React.createElement(StarsManager, {
    roster: rosterAll,
    myEmail: myEmailD,
    ownerEmail: ownerEmailD,
    stuScope: stuScope,
    students: students,
    weeksFor: weeksForStudent,
    weekOrder: dOrder,
    dataFor: dataForStudent
  }) : tab === 'shop' ? /*#__PURE__*/React.createElement(ShopManager, null) : tab === 'hwremind' ? /*#__PURE__*/React.createElement(HwRemind, null) : tab === 'admins' ? /*#__PURE__*/React.createElement(AdminManager, null) : tab === 'summer' ? /*#__PURE__*/React.createElement(SummerAdmin, null) : selected ?
  /*#__PURE__*/
  /* ── Individual student detail ── */
  React.createElement(StudentDetail, {
    student: selected,
    allItems: allItemsFor(selected),
    weeks: weeksForStudent(selected),
    weekOrder: orderForStudent(selected),
    selWeekId: (dataForStudent(selected) || {}).weekId || selWeekId,
    onBack: () => setSelected(null)
  }) :
  /*#__PURE__*/
  /* ── 總覽（v257: 併入原「學習報告」的全班常錯題）── */
  React.createElement(React.Fragment, null, newcomers.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "dash-newcomers"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dash-nc-head"
  }, "\uD83D\uDC4B \u6709 ", newcomers.length, " \u4F4D\u5B78\u751F\u767B\u5165\u904E\uFF0C\u4F46\u9084\u4E0D\u5728\u4F60\u7684\u540D\u55AE\u88E1\u2014\u2014\u52A0\u9032\u4F86\u624D\u6703\u51FA\u73FE\u5728\u300C\u6211\u7684\u5B78\u751F\u300D"), /*#__PURE__*/React.createElement("div", {
    className: "dash-nc-list"
  }, newcomers.map(s => {
    var em = String(s.email || '').toLowerCase();
    var g = window.gradeFromEmail && window.gradeFromEmail(em) || null;
    return /*#__PURE__*/React.createElement("div", {
      key: s.uid,
      className: "dash-nc-row"
    }, /*#__PURE__*/React.createElement("b", null, friendlyName(s)), g && /*#__PURE__*/React.createElement("span", {
      className: "dash-nc-grade"
    }, g.toUpperCase()), /*#__PURE__*/React.createElement("span", {
      className: "dash-nc-mail"
    }, s.email), /*#__PURE__*/React.createElement("button", {
      className: "dash-nc-add",
      disabled: addingNew === em,
      onClick: () => addNewcomer(s)
    }, addingNew === em ? '加入中…' : '＋ 加入我的名單'));
  })), /*#__PURE__*/React.createElement("div", {
    className: "dash-nc-hint"
  }, "\u6C92\u6709\u767B\u5165\u7684\u300C\u8A2A\u5BA2\u300D\u4E0D\u6703\u51FA\u73FE\u5728\u9019\u88E1\u2014\u2014\u4ED6\u5011\u6C92\u6709\u5E33\u865F\uFF0C\u7DF4\u7FD2\u7D00\u9304\u53EA\u7559\u5728\u90A3\u53F0\u88DD\u7F6E\u4E0A\u3002")), /*#__PURE__*/React.createElement(ClassWeekOverview, {
    students: visibleStudents,
    weeks: dWeeks,
    weekOrder: dOrder,
    weeksFor: weeksForStudent,
    dataFor: dataForStudent,
    currentGrade: currentGrade,
    onSelect: setSelected,
    selWeekId: selWeekId,
    setSelWeekId: setSelWeekId
  }), /*#__PURE__*/React.createElement("div", {
    className: "dash-hot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dash-section-title"
  }, "\u5168\u73ED\u5E38\u932F\u984C \xB7 Most Missed"), questionStats.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "dash-hot-empty"
  }, "\u5B78\u751F\u5B8C\u6210\u6E2C\u9A57\u5F8C\uFF0C\u9019\u88E1\u6703\u986F\u793A\u5168\u73ED\u6700\u5E38\u932F\u7684\u984C\u76EE\u3002") : questionStats.map((q, i) => {
    var hasKids = q.students && q.students.length > 0;
    return /*#__PURE__*/React.createElement("div", {
      key: `${q.itemId}-${i}`,
      className: "dash-hot-rowwrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: `dash-hot-row${hasKids ? ' clickable' : ''}`,
      onClick: hasKids ? () => setHotOpen(hotOpen === i ? null : i) : undefined
    }, /*#__PURE__*/React.createElement("span", {
      className: "dash-hot-rank"
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      className: "dash-hot-q"
    }, q.q, q.unit && /*#__PURE__*/React.createElement("span", {
      className: "dash-hot-unit"
    }, " \xB7 ", q.unit)), /*#__PURE__*/React.createElement("span", {
      className: "dash-hot-a"
    }, q.answer), /*#__PURE__*/React.createElement("span", {
      className: "dash-hot-count"
    }, q.count, "x", hasKids && /*#__PURE__*/React.createElement("span", {
      className: "dash-hot-caret"
    }, hotOpen === i ? ' ⌃' : ' ⌄'))), hotOpen === i && hasKids && /*#__PURE__*/React.createElement("div", {
      className: "dash-hot-students"
    }, /*#__PURE__*/React.createElement("b", null, "\u932F\u7684\u5B69\u5B50\uFF1A"), q.students.join('、')));
  })), grSegRates.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "dash-hot dash-grseg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dash-section-title"
  }, "\u5206\u6BB5\u95B1\u8B80 \xB7 \u5404\u6BB5\u7B54\u5C0D\u7387"), grSegRates.map(m => {
    var rows = m.segs.map((st, i) => ({
      label: `第 ${i + 1} 段`,
      ...(st || {
        ok: 0,
        total: 0
      })
    })).filter(r => r.total > 0);
    if (m.final.total > 0) rows.push({
      label: '📚 綜合題',
      ok: m.final.ok,
      total: m.final.total
    });
    var rates = rows.map(r => Math.round(r.ok / r.total * 100));
    var minRate = Math.min(...rates);
    var markLow = rate => rows.length > 1 && rate === minRate && rate < 100;
    return /*#__PURE__*/React.createElement("div", {
      key: m.title,
      className: "dash-grseg-item"
    }, /*#__PURE__*/React.createElement("div", {
      className: "dash-grseg-title"
    }, "\uD83D\uDCD6 ", m.title, " ", /*#__PURE__*/React.createElement("span", null, "\xB7 ", m.n, " \u4EBA\u6B21")), rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "dash-grseg-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "dash-grseg-label"
    }, r.label), /*#__PURE__*/React.createElement("span", {
      className: "dash-grseg-bar"
    }, /*#__PURE__*/React.createElement("i", {
      className: markLow(rates[i]) ? 'low' : '',
      style: {
        width: Math.max(4, rates[i]) + '%'
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: 'dash-grseg-rate' + (markLow(rates[i]) ? ' low' : '')
    }, rates[i], "%"))));
  }))))), allReportOpen && /*#__PURE__*/React.createElement(AllClassReportModal, {
    students: visibleStudents,
    weeks: dWeeks,
    weekOrder: dOrder,
    weeksFor: weeksForStudent,
    dataFor: dataForStudent,
    initialWeekId: selWeekId,
    onClose: () => setAllReportOpen(false)
  })));
}

/* ── Per-student detail view ───────────────────────────── */

/* ══ 🎯 v511：這孩子的弱點 → 針對性練習 ════════════════════════════════════
   Alan：「有哪些也可以使用到 AI 的地方 可以幫助學習」→ 這是第一順位。
   網站本來 13 個 AI 功能全部在「出題」那一端，沒有一個在看「這個小孩做得怎麼樣」。

   三層，由便宜到貴：
     ① 程式分群（免費、即時）——先給老師看得到的東西，不用等 AI
     ② AI 診斷「他為什麼錯」——⭐ 舉的例子必須真的在他的錯題裡，否則整條丟掉
     ③ 針對那個毛病出 5 題——程式驗 ＋ 第二個 AI 交叉檢查
   存進 practice/{email}（個人收件匣），不碰整個年級共用的週次內容。 */
/* ══ v530 📋 申論批改（Rubri：Explanation / Relevant / Effort）══════════
   Alan 的康橋 Formative 最後一大題是申論，照 rubric 三項手改。

   ⭐ 三方分工（這一版最重要的設計）：
     · **學生**寫的字存在 progress（他自己寫的，老師只能讀）
     · **AI** 只給「建議分數」，而且**老師按下存檔之前學生一個字都看不到**
     · **老師**是最後一關，改幾分都可以，AI 的建議只是先把格子填好
   ⚠ 申論題的分數是會被拿去跟家長討論的，不能讓沒有人看過的機器分數
     直接變成成績——所以這裡刻意**沒有**「全部自動改完」這顆按鈕。
   ⚠ 分數寫進 practice/{email}（老師寫、學生讀自己的），跟加強練習同一條路，
     **不用再加 Firestore 規則**。 */
function ExamMarking({
  students
}) {
  var [sel, setSel] = useDash(null); // 選到的學生 email
  var [mark, setMark] = useDash({}); // progressKey → { [partKey]: [ {explain,relevant,effort,note} ] }
  var [busy, setBusy] = useDash('');
  var [msg, setMsg] = useDash('');
  var [saved, setSaved] = useDash({});

  /* 哪些孩子有申論等著改——從他們的 progress 撈 examWritten */
  var pending = useDashM(() => {
    var out = [];
    (students || []).forEach(st => {
      var items = st.items || {};
      Object.keys(items).forEach(k => {
        var it = items[k];
        if (!it || !it.examWritten) return;
        out.push({
          email: String(st.email || '').toLowerCase(),
          name: st.name || st.email,
          key: k,
          title: it.examTitle || '考卷',
          at: it.done || it.ts || 0,
          written: it.examWritten
        });
      });
    });
    return out.sort((a, b) => (b.at || 0) - (a.at || 0));
  }, [students]);

  /* 老師已經改過哪些——讀 practice/{email}.marks */
  useDashE(() => {
    var emails = [...new Set(pending.map(p => p.email))];
    if (!emails.length || !window.subscribePractice) return;
    var offs = emails.map(em => window.subscribePractice(em, doc => {
      setSaved(s => ({
        ...s,
        [em]: doc && doc.marks || {}
      }));
    }));
    return () => offs.forEach(f => {
      try {
        f();
      } catch (e) {}
    });
  }, [pending.map(p => p.email).join()]);
  var cur = pending.find(p => p.email + '|' + p.key === sel) || null;
  /* v536：準則與等第照那一大題自己的設定——康橋寫作卷是七項、只有 7/5/3/0 四個等第。
     ⚠ 等第不是 0~max 的連續分，硬排成一排 0~7 的按鈕老師很容易點錯。 */
  var rubOf = w => window.examRubricOf ? window.examRubricOf(w) : {
    criteria: window.EXAM_RUBRIC || [],
    max: 4,
    bands: []
  };
  var maxOf = w => rubOf(w).max;
  var cell = (partKey, qi) => ((mark[sel] || {})[partKey] || [])[qi] || {};
  var setCell = (partKey, qi, patch) => setMark(m => {
    var one = {
      ...(m[sel] || {})
    };
    var arr = (one[partKey] || []).slice();
    arr[qi] = {
      ...(arr[qi] || {}),
      ...patch
    };
    one[partKey] = arr;
    return {
      ...m,
      [sel]: one
    };
  });

  /* 把老師已經存過的分數帶回畫面（不然每次點進來都是空的） */
  useDashE(() => {
    if (!cur) return;
    var had = ((saved[cur.email] || {})[cur.key] || {}).byPart;
    if (had && !mark[sel]) setMark(m => ({
      ...m,
      [sel]: had
    }));
    /* v575：老師還沒存過 → 把學生交卷時 AI 先改好的帶進來（老師確認或改完按「存檔」才算數） */else if (!had && !mark[sel] && cur.written) {
      var pre = {};
      Object.keys(cur.written).forEach(k => {
        if (cur.written[k].aiMarks) pre[k] = cur.written[k].aiMarks;
      });
      if (Object.keys(pre).length) setMark(m => ({
        ...m,
        [sel]: pre
      }));
    }
  }, [sel, saved]);
  var aiOne = async (partKey, qi, q, max, w) => {
    setMsg('');
    setBusy(partKey + qi);
    try {
      var got = await window.aiGradeRubric(q.q, q.a, {
        max,
        keyPoints: q.keyPoints,
        part: w,
        passage: w.passage || ''
      });
      if (!got) {
        setMsg('這一題 AI 沒有給出可靠的建議（它引用不到孩子真的寫過的字）——請直接自己改。');
      } else {
        var R2 = rubOf(w).criteria;
        var patch = {
          note: got.next || '',
          _ai: true
        };
        R2.forEach(c => {
          patch[c.id] = got[c.id] ? got[c.id].n : 0;
        });
        patch._why = R2.map(c => `${c.zh}：${(got[c.id] || {}).why || ''}`).join('　');
        patch._quote = got.quote || '';
        /* v565：小錯（拼字／文法）另外數——每 3 個扣 1 分，個數老師可以改 */
        patch._errN = got._errN || 0;
        patch._errList = got._errList || [];
        setCell(partKey, qi, patch);
      }
    } catch (e) {
      setMsg('AI 現在叫不動，等一下再試，或直接自己改。');
    }
    setBusy('');
  };
  var save = async () => {
    if (!cur) return;
    setMsg('');
    setBusy('save');
    try {
      await window.saveExamMarks(cur.email, cur.key, {
        byPart: mark[sel] || {},
        title: cur.title
      });
      setMsg('存好了，學生那邊就看得到分數與評語了。');
    } catch (e) {
      setMsg('存不進去——可能是 Firestore 規則還沒更新。');
    }
    setBusy('');
  };
  var doneCount = p => {
    var by = ((saved[p.email] || {})[p.key] || {}).byPart || {};
    var n = 0,
      t = 0;
    Object.keys(p.written).forEach(pk => {
      var cs = rubOf(p.written[pk]).criteria;
      (p.written[pk].qs || []).forEach((_, i) => {
        t++;
        var m = (by[pk] || [])[i];
        if (m && cs.some(c => m[c.id] != null)) n++;
      });
    });
    return {
      n,
      t
    };
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-side-h"
  }, "\u5F85\u6279\u6539 ", /*#__PURE__*/React.createElement("b", null, pending.filter(p => {
    var d = doneCount(p);
    return d.n < d.t;
  }).length)), pending.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "mk-empty"
  }, "\u9084\u6C92\u6709\u4EBA\u4EA4\u7533\u8AD6\u984C\u3002\u8003\u5377\u88E1\u6709\u300C\u554F\u7B54\uFF08\u8001\u5E2B\u6539\uFF09\u300D\u90A3\u4E00\u5927\u984C\uFF0C\u5B78\u751F\u4EA4\u5377\u4E4B\u5F8C\u5C31\u6703\u51FA\u73FE\u5728\u9019\u88E1\u3002"), pending.map(p => {
    var d = doneCount(p);
    var k = p.email + '|' + p.key;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      className: 'mk-stu' + (sel === k ? ' on' : '') + (d.n >= d.t ? ' done' : ''),
      onClick: () => setSel(k)
    }, /*#__PURE__*/React.createElement("b", null, p.name), /*#__PURE__*/React.createElement("span", null, p.title), /*#__PURE__*/React.createElement("em", null, d.n >= d.t ? '已改完' : d.n === 0 && Object.keys(p.written).some(k => p.written[k].aiMarks) ? '🤖 AI 已先改・待確認' : `${d.n} / ${d.t}`));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mk-main"
  }, !cur ? /*#__PURE__*/React.createElement("p", {
    className: "mk-empty"
  }, "\u5DE6\u908A\u9078\u4E00\u4F4D\u5B78\u751F\u958B\u59CB\u6539\u3002") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mk-head"
  }, /*#__PURE__*/React.createElement("b", null, cur.name), /*#__PURE__*/React.createElement("span", null, cur.title)), Object.keys(cur.written).map(pk => {
    var w = cur.written[pk];
    var RB = rubOf(w);
    var max = RB.max;
    var rp = window.examRubricPart ? window.examRubricPart({
      pts: w.pts,
      questions: w.qs,
      rubricMax: max,
      rubricSet: w.rubricSet
    }, (mark[sel] || {})[pk]) : {
      got: 0,
      max: w.pts
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "mk-part",
      key: pk
    }, /*#__PURE__*/React.createElement("div", {
      className: "mk-part-h"
    }, /*#__PURE__*/React.createElement("b", null, w.title || '申論'), /*#__PURE__*/React.createElement("button", {
      className: "btn ghost mk-allai",
      disabled: !!busy,
      title: "\u9019\u4E00\u5927\u984C\u6BCF\u4E00\u5C0F\u984C\u90FD\u8ACB AI \u5148\u7D66\u5EFA\u8B70\uFF08\u4E0D\u6703\u5B58\u6A94\uFF0C\u4F60\u9084\u662F\u8981\u6309\u4E0B\u9762\u7684\u5B58\u6A94\uFF09",
      onClick: async () => {
        for (var k = 0; k < (w.qs || []).length; k++) {
          await aiOne(pk, k, w.qs[k], max, w);
        }
      }
    }, "\uD83E\uDD16 \u9019\u4E00\u5927\u984C\u5168\u90E8 AI \u5148\u6539"), /*#__PURE__*/React.createElement("span", null, rp.got, " / ", w.pts, " \u5206")), (w.qs || []).map((q, i) => {
      var c = cell(pk, i);
      return /*#__PURE__*/React.createElement("div", {
        className: "mk-q",
        key: i
      }, /*#__PURE__*/React.createElement("p", {
        className: "mk-qt"
      }, i + 1, ". ", q.q), /*#__PURE__*/React.createElement("div", {
        className: "mk-ans"
      }, q.a || /*#__PURE__*/React.createElement("i", null, "\uFF08\u7A7A\u767D\uFF09")), q.img && /*#__PURE__*/React.createElement("a", {
        href: q.img,
        target: "_blank",
        rel: "noopener",
        className: "mk-img"
      }, /*#__PURE__*/React.createElement("img", {
        src: q.img,
        alt: "\u5B78\u751F\u756B\u7684\u5716"
      })), /*#__PURE__*/React.createElement("div", {
        className: "mk-rub"
      }, RB.criteria.map(cr => /*#__PURE__*/React.createElement("label", {
        className: "mk-cr",
        key: cr.id
      }, /*#__PURE__*/React.createElement("span", {
        className: "mk-cr-n"
      }, cr.zh, /*#__PURE__*/React.createElement("i", null, cr.en)), /*#__PURE__*/React.createElement("span", {
        className: "mk-cr-btns"
      }, (window.examBandsOf ? window.examBandsOf(RB, cr) : RB.bands).map(b => /*#__PURE__*/React.createElement("button", {
        key: b.n,
        className: c[cr.id] === b.n ? 'on' : '',
        title: b.zh ? `${b.zh}（${cr.tip}）` : cr.tip,
        onClick: () => setCell(pk, i, {
          [cr.id]: b.n,
          _ai: false
        })
      }, b.n)))))), c._why && /*#__PURE__*/React.createElement("p", {
        className: "mk-ai-why"
      }, "\uD83E\uDD16 ", c._why, c._quote ? `　引用：「${c._quote}」` : ''), /*#__PURE__*/React.createElement("div", {
        className: "mk-err"
      }, /*#__PURE__*/React.createElement("label", null, "\u5C0F\u932F", /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: "0",
        max: "30",
        value: c._errN == null ? '' : c._errN,
        placeholder: "0",
        onChange: e => setCell(pk, i, {
          _errN: Math.max(0, parseInt(e.target.value, 10) || 0),
          _ai: false
        })
      }), "\u500B"), /*#__PURE__*/React.createElement("span", null, "\u2192 \u6263 ", /*#__PURE__*/React.createElement("b", null, window.examErrDeduct ? window.examErrDeduct(c._errN, w.rubricSet) : 0), " \u5206", /*#__PURE__*/React.createElement("i", null, "\uFF08\u6BCF ", (window.EXAM_ERR_RULE || {}).per || 3, " \u500B\u6263 1 \u5206\uFF0C\u6700\u591A\u6263 ", ((window.EXAM_ERR_RULE || {
        cap: {}
      }).cap[w.rubricSet] != null ? window.EXAM_ERR_RULE.cap[w.rubricSet] : (window.EXAM_ERR_RULE || {
        cap: {}
      }).cap.default) || 2, " \u5206\uFF09")), (c._errList || []).length > 0 && /*#__PURE__*/React.createElement("em", null, c._errList.map(x => `${x.w} → ${x.fix}`).join('　·　'))), /*#__PURE__*/React.createElement("div", {
        className: "mk-q-foot"
      }, /*#__PURE__*/React.createElement("input", {
        className: "mk-note",
        placeholder: "\u7D66\u4ED6\u7684\u4E00\u53E5\u8A71\uFF08\u5B78\u751F\u770B\u5F97\u5230\uFF09",
        value: c.note || '',
        onChange: e => setCell(pk, i, {
          note: e.target.value
        })
      }), /*#__PURE__*/React.createElement("button", {
        className: "btn ghost",
        disabled: !!busy || !!q.img,
        title: q.img ? '畫圖由老師直接看圖給分' : undefined,
        onClick: () => aiOne(pk, i, q, max, w)
      }, busy === pk + i ? '看一下…' : '🤖 AI 先改')));
    }));
  }), msg && /*#__PURE__*/React.createElement("p", {
    className: "mk-msg"
  }, msg), /*#__PURE__*/React.createElement("div", {
    className: "mk-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-foot-hint"
  }, "\u5B78\u751F\u4EA4\u5377\u6642 AI \u5DF2\u5148\u6539\u597D\uFF0C\u5B78\u751F\u6703\u5148\u770B\u5230 AI \u7684\u5206\u6578\uFF08\u6A19\u660E\u300C\u8001\u5E2B\u9084\u6703\u518D\u770B\u904E\u300D\uFF09\uFF1B\u4F60\u78BA\u8A8D\u6216\u8ABF\u6574\u5F8C\u6309\u5B58\u6A94\uFF0C\u5C31\u63DB\u6210\u8001\u5E2B\u7684\u5206\u6578\u3002"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: save,
    disabled: busy === 'save'
  }, busy === 'save' ? '存檔中…' : '存檔並讓學生看到')))));
}
function WeakSpotModal({
  student,
  weeks,
  weekOrder,
  onClose
}) {
  var [rows, setRows] = useDash([]);
  var [pats, setPats] = useDash(null); // null = 還沒診斷
  var [busy, setBusy] = useDash('');
  var [err, setErr] = useDash('');
  var [made, setMade] = useDash({}); // patternIdx → 出好的題目
  var [sent, setSent] = useDash({}); // patternIdx → 已送出
  var email = String(student.email || '').toLowerCase();
  var grade = window.gradeFromEmail && window.gradeFromEmail(email) || 'g4';
  useDashE(() => {
    var cats = window.CATEGORIES || [];
    var r = window.collectWrongQuestions ? window.collectWrongQuestions(student.items || {}, weeks, weekOrder, cats) : [];
    setRows(r);
  }, [student, weeks, weekOrder]);
  var stats = window.mkStats ? window.mkStats(rows) : {
    n: 0,
    byCat: {},
    repeats: []
  };
  var catName = id => ((window.CATEGORIES || []).find(c => c.id === id) || {}).titleZh || '其他';
  var diagnose = async () => {
    setErr('');
    setBusy('diag');
    try {
      var got = await window.aiDiagnoseMistakes(rows, {
        grade
      });
      setPats(got);
      if (!got.length) setErr('看不出固定的毛病——可能是錯得太散，或錯題還不夠多（至少要 3 題）。');
    } catch (e) {
      setErr('診斷失敗，等一下再試一次。');
    }
    setBusy('');
  };
  var makeSet = async (p, i) => {
    setErr('');
    setBusy('fix' + i);
    try {
      var qs = await window.aiMakeFixSet(p, {
        grade,
        n: 5
      });
      if (!qs.length) setErr('這一輪出的題目都沒通過檢查（答案不只一個、或正解一看就太長）。再按一次試試。');
      setMade(m => ({
        ...m,
        [i]: qs
      }));
    } catch (e) {
      setErr('出題失敗，等一下再試一次。');
    }
    setBusy('');
  };
  var send = async (p, i) => {
    setBusy('send' + i);
    try {
      var ok = await window.savePracticeSet(email, {
        zh: p.zh,
        why: p.why,
        catId: p.catId || '',
        cat: p.cat || '',
        questions: (made[i] || []).map((q, k) => ({
          id: 'fx' + k,
          ...q
        }))
      });
      if (ok) setSent(x => ({
        ...x,
        [i]: true
      }));else setErr('沒存成功。');
    } catch (e) {
      setErr('沒存成功——如果一直失敗，多半是 firestore.rules 還沒貼新版（practice 那一段）。');
    }
    setBusy('');
  };
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop ws-top",
    onClick: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ws-panel",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "ws-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "ws-kicker"
  }, "Weak Spots"), /*#__PURE__*/React.createElement("h3", null, "\uD83C\uDFAF ", friendlyName(student), " \u7684\u5F31\u9EDE")), /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "close",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ws-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ws-stat"
  }, /*#__PURE__*/React.createElement("b", null, stats.n), /*#__PURE__*/React.createElement("span", null, "\u7D2F\u7A4D\u932F\u984C")), Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => /*#__PURE__*/React.createElement("div", {
    className: "ws-stat",
    key: c
  }, /*#__PURE__*/React.createElement("b", null, n), /*#__PURE__*/React.createElement("span", null, catName(c))))), stats.repeats.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "ws-rep"
  }, /*#__PURE__*/React.createElement("em", null, "\u4E00\u932F\u518D\u932F"), stats.repeats.slice(0, 8).map((r, i) => /*#__PURE__*/React.createElement("span", {
    className: "ws-rep-w",
    key: i
  }, r.answer, /*#__PURE__*/React.createElement("i", null, "\xD7", r.n), r.picked.length > 0 && /*#__PURE__*/React.createElement("u", null, "\u4ED6\u5BEB\u6210 ", r.picked.slice(0, 2).join('、'))))), err && /*#__PURE__*/React.createElement("div", {
    className: "ws-err"
  }, err), pats === null ? /*#__PURE__*/React.createElement("button", {
    className: "ws-go",
    disabled: stats.n < 3 || busy === 'diag',
    onClick: diagnose
  }, busy === 'diag' ? '讀他的錯題中…' : stats.n < 3 ? '錯題還太少（至少 3 題）' : '🔍 找出他的毛病') : /*#__PURE__*/React.createElement("div", {
    className: "ws-pats"
  }, pats.map((p, i) => /*#__PURE__*/React.createElement("div", {
    className: "ws-pat",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "ws-pat-h"
  }, /*#__PURE__*/React.createElement("b", null, p.zh), p.cat && /*#__PURE__*/React.createElement("span", null, p.cat)), p.why && /*#__PURE__*/React.createElement("p", {
    className: "ws-pat-why"
  }, p.why), /*#__PURE__*/React.createElement("div", {
    className: "ws-pat-ex"
  }, p.examples.map((e, k) => /*#__PURE__*/React.createElement("span", {
    key: k
  }, e)), /*#__PURE__*/React.createElement("i", null, "\u2190 \u9019\u4E9B\u662F\u4ED6\u771F\u7684\u932F\u904E\u7684")), !made[i] ? /*#__PURE__*/React.createElement("button", {
    className: "ws-make",
    disabled: busy === 'fix' + i,
    onClick: () => makeSet(p, i)
  }, busy === 'fix' + i ? '出題中…' : '🎯 針對這個出 5 題') : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("ol", {
    className: "ws-qs"
  }, made[i].map((q, k) => /*#__PURE__*/React.createElement("li", {
    key: k
  }, /*#__PURE__*/React.createElement("b", null, q.q), /*#__PURE__*/React.createElement("span", {
    className: "ws-opts"
  }, q.options.map((o, oi) => /*#__PURE__*/React.createElement("em", {
    key: oi,
    className: oi === q.answer ? 'ok' : ''
  }, o)))))), sent[i] ? /*#__PURE__*/React.createElement("div", {
    className: "ws-sent"
  }, "\u2705 \u5DF2\u7D93\u9001\u5230 ", friendlyName(student), " \u7684\u300C\u6211\u7684\u932F\u984C\u300D\u88E1\u4E86") : /*#__PURE__*/React.createElement("button", {
    className: "ws-send",
    disabled: busy === 'send' + i,
    onClick: () => send(p, i)
  }, busy === 'send' + i ? '送出中…' : `📤 送給 ${friendlyName(student)}（${made[i].length} 題）`), /*#__PURE__*/React.createElement("button", {
    className: "ws-again",
    onClick: () => makeSet(p, i),
    disabled: busy === 'fix' + i
  }, "\u21BB \u518D\u51FA\u4E00\u4EFD")))), !pats.length && /*#__PURE__*/React.createElement("div", {
    className: "ws-none"
  }, "\u9019\u6B21\u770B\u4E0D\u51FA\u56FA\u5B9A\u7684\u6BDB\u75C5\u3002")), /*#__PURE__*/React.createElement("p", {
    className: "ws-note"
  }, "AI \u53EA\u8CA0\u8CAC\u300C\u770B\u51FA\u4ED6\u932F\u5728\u54EA\u300D\u8207\u300C\u60F3\u984C\u6750\u300D\uFF1B\u7B54\u6848\u662F\u7A0B\u5F0F\u9A57\u7684\uFF0C\u800C\u4E14\u53E6\u4E00\u500B AI \u6703\u91CD\u8B80\u4E00\u6B21\u78BA\u8A8D\u53EA\u6709\u4E00\u500B\u9078\u9805\u5C0D\u3002"))), document.body);
}
function StudentDetail({
  student,
  allItems,
  weeks,
  weekOrder,
  selWeekId,
  onBack
}) {
  var [reportOpen, setReportOpen] = useDash(false);
  var [wrongOpen, setWrongOpen] = useDash(null); // v251: 展開中的錯題單元 id
  var [filesOpen, setFilesOpen] = useDash(null); // v263: 展開中的作業照片單元 id
  var [gradeDraft, setGradeDraft] = useDash({}); // v263: 打分數的輸入框草稿 { itemId: '85' }
  var [commentDraft, setCommentDraft] = useDash({}); // v266: 評語草稿
  var [growthOpen, setGrowthOpen] = useDash(false); // v307 (F7): 成長曲線 modal
  var [weakOpen, setWeakOpen] = useDash(false); // v511: 弱點分析 → 針對性練習

  var its = student.items || {};
  var progFor = it => {
    var pk = window.progKeysFor(its, it)[0]; // v596
    return pk ? its[pk] : null;
  };
  var done = allItems.filter(it => progFor(it)?.done).length;

  // v307 (F7): 把老師端 items（score 已是百分比）轉成 computeGrowthData 吃的格式（total 設 100 → score/100*100 保留原百分比）
  var qmForGrowth = {};
  Object.entries(its).forEach(([k, p]) => {
    if (!p || !p.done) return;
    qmForGrowth[k] = {
      done: p.done,
      score: p.score,
      total: p.score != null ? 100 : p.total || 1
    };
  });
  // v307 (F9): 本週有幾件待批改（已交照片、還沒給分）
  var needsGradingCount = allItems.filter(it => {
    var p = progFor(it);
    return !!(p && p.files && p.files.length && p.score == null);
  }).length;

  // Group items by week (v307 F8: key by weekId; current week pinned first + highlighted)
  var byWeek = {};
  allItems.forEach(it => {
    var wid = it.weekId || it.weekLabel;
    if (!byWeek[wid]) byWeek[wid] = {
      label: weeks[wid] && weeks[wid].label || it.weekLabel || wid,
      items: []
    };
    byWeek[wid].items.push(it);
  });
  var allWids = Object.keys(byWeek); // dOrder 順序＝舊→新
  var orderedWids = selWeekId && byWeek[selWeekId] ? [selWeekId, ...allWids.filter(w => w !== selWeekId).reverse()] : [...allWids].reverse();
  // v307 (F8): 本週摘要
  var curItems = byWeek[selWeekId] && byWeek[selWeekId].items || [];
  var curDone = curItems.filter(it => progFor(it)?.done).length;
  var curScored = curItems.map(it => {
    var p = progFor(it);
    return p && p.score != null ? Math.min(100, p.score) : null;
  }).filter(s => s != null);
  var curAvg = curScored.length ? Math.round(curScored.reduce((a, b) => a + b, 0) / curScored.length) : null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "dash-back",
    onClick: onBack,
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "arrow-left",
    size: 14
  }), " Back"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, window.aiDiagnoseMistakes && /*#__PURE__*/React.createElement("button", {
    className: "report-gen-btn ws-btn",
    onClick: () => setWeakOpen(true),
    title: "\u8B80\u4ED6\u7D2F\u7A4D\u7684\u932F\u984C\uFF0C\u627E\u51FA\u56FA\u5B9A\u7684\u6BDB\u75C5\uFF0C\u91DD\u5C0D\u90A3\u500B\u6BDB\u75C5\u51FA\u984C\u7D66\u4ED6"
  }, "\uD83C\uDFAF \u5F31\u9EDE\u5206\u6790"), window.GrowthReport && /*#__PURE__*/React.createElement("button", {
    className: "report-gen-btn",
    onClick: () => setGrowthOpen(true),
    title: "\u770B\u9019\u4F4D\u5B78\u751F\u7684\u6BCF\u9031\u5206\u6578\u8DA8\u52E2"
  }, "\uD83D\uDCC8 \u6210\u9577\u66F2\u7DDA"), /*#__PURE__*/React.createElement("button", {
    className: "report-gen-btn",
    onClick: () => setReportOpen(true),
    title: "\u7522\u751F\u5B78\u7FD2\u9031\u5831"
  }, "\uD83D\uDCCB \u7522\u751F\u9031\u5831"))), /*#__PURE__*/React.createElement("div", {
    className: "sdetail-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "sdetail-name"
  }, friendlyName(student)), /*#__PURE__*/React.createElement("p", {
    className: "sdetail-email"
  }, student.email)), /*#__PURE__*/React.createElement("div", {
    className: "sdetail-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sdetail-count"
  }, done, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '14px',
      fontFamily: 'var(--mono)',
      color: 'var(--ink-3)'
    }
  }, " / ", allItems.length)), /*#__PURE__*/React.createElement("span", {
    className: "sdetail-count-label"
  }, "items done"))), byWeek[selWeekId] && /*#__PURE__*/React.createElement("div", {
    className: "sdetail-thisweek"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sdetail-tw-label"
  }, "\u672C\u9031 ", byWeek[selWeekId].label), /*#__PURE__*/React.createElement("span", {
    className: "sdetail-tw-stat"
  }, "\u5B8C\u6210 ", curDone, "/", curItems.length, curAvg != null ? ` · 平均 ${curAvg} 分` : ''), needsGradingCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "sdetail-tw-grade"
  }, "\u23F3 ", needsGradingCount, " \u4EF6\u5F85\u6279\u6539")), reportOpen && /*#__PURE__*/React.createElement(WeeklyReportModal, {
    student: student,
    weeks: weeks,
    weekOrder: weekOrder,
    initialWeekId: selWeekId,
    onClose: () => setReportOpen(false)
  }), weakOpen && /*#__PURE__*/React.createElement(WeakSpotModal, {
    student: student,
    weeks: weeks,
    weekOrder: weekOrder,
    onClose: () => setWeakOpen(false)
  }), growthOpen && window.GrowthReport && /*#__PURE__*/React.createElement(window.GrowthReport, {
    weeks: weeks,
    weekOrder: weekOrder,
    qmProg: qmForGrowth,
    categories: window.CATEGORIES,
    studentName: friendlyName(student),
    onClose: () => setGrowthOpen(false)
  }), orderedWids.map(wid => {
    var wk = byWeek[wid];
    var items = wk.items;
    var isCurWeek = wid === selWeekId;
    return /*#__PURE__*/React.createElement("div", {
      key: wid,
      className: `sdetail-week${isCurWeek ? ' sdetail-week-cur' : ''}`
    }, /*#__PURE__*/React.createElement("p", {
      className: "sdetail-wlabel"
    }, wk.label, isCurWeek && /*#__PURE__*/React.createElement("span", {
      className: "sdetail-wcur-tag"
    }, "\u672C\u9031")), /*#__PURE__*/React.createElement("div", {
      className: "sdetail-items"
    }, items.map(it => {
      // Fuzzy match: try progressId, bare id, or any key ending in _itemId
      // v257: 把「所有」對得上的 key 都找出來——刪除單筆成績時要整組刪乾淨
      var progKeys = [...new Set([its[it.progressId] ? it.progressId : null, its[it.id] ? it.id : null, ...(it.shared ? [] : Object.keys(its).filter(k => k.endsWith('_' + it.id))) // v596：重複 id 不連別週一起刪
      ].filter(Boolean))];
      var prog = progKeys.length ? its[progKeys[0]] : null;
      var isDone = !!prog?.done;
      var score = prog?.score != null ? Math.min(100, prog.score) : null;
      var wrongs = prog?.wrongQuestions || [];
      var wOpen = wrongOpen === it.id;
      // v263: 上傳作業——照片與批改
      var files = prog?.files || [];
      var fOpen = filesOpen === it.id;
      var needsGrading = files.length > 0 && prog?.score == null;
      // v257: 遲交——截止日 23:59 之後才完成
      var dueEnd = it.dueDate ? new Date(it.dueDate + 'T23:59:59').getTime() : null;
      var isLate = !!(isDone && dueEnd && typeof prog.done === 'number' && prog.done > dueEnd);
      var doneDay = isDone && typeof prog.done === 'number' ? new Date(prog.done).toLocaleDateString('zh-TW', {
        month: 'numeric',
        day: 'numeric'
      }) : null;
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: it.id
      }, /*#__PURE__*/React.createElement("div", {
        className: `sdetail-item${isDone ? ' done' : ''}`
      }, /*#__PURE__*/React.createElement("span", {
        className: `sdetail-check${isDone ? ' done' : ''}`
      }, isDone ? '✓' : '○'), /*#__PURE__*/React.createElement("span", {
        className: "sdetail-iname"
      }, it.title, isLate && /*#__PURE__*/React.createElement("span", {
        className: "sdetail-late",
        title: `截止 ${it.dueDate}，${doneDay} 才完成`
      }, "\u23F0 \u88DC\u4EA4 \xB7 ", doneDay), wrongs.length > 0 && /*#__PURE__*/React.createElement("button", {
        className: `sdetail-wrongbtn${wOpen ? ' on' : ''}`,
        onClick: () => setWrongOpen(wOpen ? null : it.id),
        title: "\u770B\u9019\u500B\u55AE\u5143\u932F\u4E86\u54EA\u4E9B\u984C"
      }, "\u2717 \u932F ", wrongs.length, " \u984C ", wOpen ? '⌃' : '⌄'), files.length > 0 && /*#__PURE__*/React.createElement("button", {
        className: `sdetail-filesbtn${fOpen ? ' on' : ''}${needsGrading ? ' grading' : ''}`,
        onClick: () => setFilesOpen(fOpen ? null : it.id),
        title: "\u770B\u5B78\u751F\u4EA4\u7684\u4F5C\u696D\u7167\u7247\u3001\u6253\u5206\u6578"
      }, "\uD83D\uDCCE ", files.length, " \u5F35", needsGrading ? ' · ⏳ 待批改' : '', " ", fOpen ? '⌃' : '⌄')), /*#__PURE__*/React.createElement("span", {
        className: "sdetail-cat"
      }, it.cat), /*#__PURE__*/React.createElement("span", {
        className: "sdetail-score"
      }, score != null ? score + '%' : ''), prog ? /*#__PURE__*/React.createElement("button", {
        className: "sdetail-del",
        title: "\u522A\u9664\u9019\u7B46\u6210\u7E3E\uFF08\u6E05\u9664\u8AA4\u767B\u5165\uFF0F\u5171\u7528\u96FB\u8166\u9020\u6210\u7684\u932F\u8AA4\u7D00\u9304\uFF09",
        onClick: e => {
          e.stopPropagation();
          if (!window.confirm(`確定刪除 ${friendlyName(student)} 的「${it.title}」這筆成績？\n\n刪除後無法復原（用來清掉共用電腦誤登入造成的錯誤紀錄）。`)) return;
          progKeys.forEach(k => window.saveProgressItem(student.uid, '', '', k, null));
        }
      }, "\u2715") : /*#__PURE__*/React.createElement("span", null)), wOpen && /*#__PURE__*/React.createElement("div", {
        className: "sdetail-wrongs"
      }, wrongs.map((w, wi) => /*#__PURE__*/React.createElement("div", {
        className: "sdetail-wrong-row",
        key: wi
      }, /*#__PURE__*/React.createElement("span", {
        className: "sdetail-wrong-q"
      }, w.q), /*#__PURE__*/React.createElement("span", {
        className: "sdetail-wrong-a"
      }, "\u6B63\u89E3\uFF1A", w.answer)))), (fOpen || needsGrading) &&
      /*#__PURE__*/
      /* v263: 作業照片＋打分數；v307(F9): 待批改的自動展開，不用逐一點開找 */
      React.createElement("div", {
        className: `sdetail-files${needsGrading && !fOpen ? ' sdetail-files-auto' : ''}`
      }, /*#__PURE__*/React.createElement("div", {
        className: "sdetail-files-grid"
      }, files.map((url, fi) => /*#__PURE__*/React.createElement("a", {
        key: fi,
        href: url,
        target: "_blank",
        rel: "noreferrer",
        title: "\u9EDE\u958B\u770B\u5927\u5716"
      }, /*#__PURE__*/React.createElement("img", {
        src: url,
        alt: `作業照片 ${fi + 1}`,
        loading: "lazy"
      })))), /*#__PURE__*/React.createElement("div", {
        className: "sdetail-grade-row"
      }, /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: "0",
        max: "100",
        className: "sdetail-grade-input",
        placeholder: "\u5206\u6578 0\u2013100",
        value: gradeDraft[it.id] !== undefined ? gradeDraft[it.id] : prog.score != null ? prog.score : '',
        onChange: e => setGradeDraft(d => ({
          ...d,
          [it.id]: e.target.value
        }))
      }), /*#__PURE__*/React.createElement("input", {
        type: "text",
        className: "sdetail-comment-input",
        placeholder: "\u8A55\u8A9E\uFF08\u9078\u586B\uFF09\uFF1A\u4F8B\uFF1A\u5B57\u518D\u5DE5\u6574\u4E00\u9EDE",
        maxLength: 120,
        value: commentDraft[it.id] !== undefined ? commentDraft[it.id] : prog.comment || '',
        onChange: e => setCommentDraft(d => ({
          ...d,
          [it.id]: e.target.value
        }))
      }), /*#__PURE__*/React.createElement("button", {
        className: "sdetail-grade-btn",
        onClick: () => {
          var raw = gradeDraft[it.id] !== undefined ? gradeDraft[it.id] : prog.score;
          var n = Math.round(Number(raw));
          if (raw === '' || raw == null || Number.isNaN(n) || n < 0 || n > 100) {
            alert('請輸入 0–100 的分數');
            return;
          }
          var comment = String(commentDraft[it.id] !== undefined ? commentDraft[it.id] : prog.comment || '').trim();
          window.saveProgressItem(student.uid, '', '', progKeys[0], {
            ...prog,
            score: n,
            comment,
            graded: true,
            gradedAt: Date.now()
          });
        }
      }, "\u2713 \u7D66\u5206"), prog.graded && prog.score != null && /*#__PURE__*/React.createElement("span", {
        className: "sdetail-graded-note"
      }, "\u5DF2\u6279\u6539 \xB7 \u5B78\u751F\u6703\u770B\u5230 ", prog.score, " \u5206", prog.comment ? '＋評語' : ''), prog.submittedAt && /*#__PURE__*/React.createElement("span", {
        className: "sdetail-submitted-at"
      }, "\u4EA4\u65BC ", new Date(prog.submittedAt).toLocaleDateString('zh-TW', {
        month: 'numeric',
        day: 'numeric'
      })))));
    })));
  }));
}
Object.assign(window, {
  TeacherDashboard,
  ExamMarking,
  LessonLog,
  HwRemind,
  dashCurrentWeekId
}); // 後兩個匯出給對照頁單獨跑