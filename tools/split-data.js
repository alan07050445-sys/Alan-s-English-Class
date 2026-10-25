/* tools/split-data.js — v599：把 data.js 切成「學生一定要載的」與「只有老師才用的」兩包。
 *
 * 為什麼：data.js 壓縮後約 270KB，是整個網站最大的一個檔案；其中大半（AI 出題的提示詞與驗證、
 * 考卷草稿、聊天室判讀、報表）只有老師會用到。學生每次冷啟動都在下載與解析它們。
 *
 * 做法（⚠ 原始碼 data.js 一個字都沒動——測試、jsxcheck 都照舊讀它）：
 *   build 時照 tools/teacher-data.json 的名單，把頂層陳述式原文切到兩個檔案：
 *     dist/data-core.js     學生一定要載（index.html 的 <script>）
 *     dist/data-teacher.js  老師才載（loadTeacherBundle 第一個載，排在 editor 前面）
 *   ⚠ 用「原文切片」不是重新產生程式碼——不會改到任何一個字，連註解都在。
 *   ⚠ `Object.assign(window, {...})` 這種匯出陳述式會照屬性拆成兩半。
 *
 * 名單怎麼來（node tools/split-data.js --analyze，約 10 秒，只在需要時跑）：
 *   一個頂層宣告「只被老師檔案、其他已判定的老師專用宣告、以及 app.jsx 裡**只有老師才會觸發的處理函式**」
 *   引用，才算老師專用。bare 識別字與 window.X 兩種引用都算。
 *   ⚠ app.jsx 那份「只有老師才觸發」的函式名單（GATED_APP）是**人工認定**的——
 *     tests/t-v599.mjs 會重新跑一次分析，名單裡任何一個名字如果出現在不在名單內的位置被用到，就紅燈。
 *
 * 用法：
 *   node tools/split-data.js            切出 dist/data-core.js 與 dist/data-teacher.js（build-jsx.js 也會呼叫）
 *   node tools/split-data.js --analyze  重新分析並寫回 tools/teacher-data.json
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const Babel = require(path.join(__dirname, 'babel.min.js'));
const LIST = path.join(__dirname, 'teacher-data.json');

/* app.jsx 裡「只有老師操作才會走到」的處理函式（鏈上有這些名字之一的引用，算老師專用）。
   ⚠ 新增老師功能的處理函式要來這裡加；加錯（學生也會走到）會被 t-v599 的「學生流程」檢查擋下。 */
const GATED_APP = [
  'askGenerate', 'runAskPlan', 'askFindGroup', 'askMergeWords', 'askResolveUnit', 'askStudentMiss',
  'handleCompose', 'handleQuestionMove', 'handleRenameGroup', 'handleMoveGroupCat', 'handleDeleteItems',
  'handleDeleteWeek', 'keepInTrash', 'restoreFromTrash', 'openTrash', 'handleAddWeek', 'handleCreateTerm',
  'handleEditWeekSave', 'handleCreateReview', 'handleCopyGroupToWeeks', 'handleCopyWholeWeek',
];
const TEACHER_FILES = ['components-editor.jsx', 'components-dashboard.jsx'];
const OTHER_FILES = ['data-g1.js', 'data-g2.js', 'data-g4.js', 'data-g5.js', 'data-g6.js', 'data-summer.js', 'data-grammar.js',
  'components-shell.jsx', 'components-quiz.jsx', 'components-flashcard.jsx', 'components-quiz-mode.jsx',
  'components-mistakes.jsx', 'app.jsx', 'components-fx.jsx'];

const isExportStmt = (src, n) => n.type === 'ExpressionStatement' && /^Object\.assign\(\s*window\s*,\s*\{/.test(src.slice(n.start, n.start + 40));

/* data.js 的頂層陳述式：{ start, end, node, declared:Set, refs:Set（bare＋window.X）, isExport } */
function parseStatements(src) {
  const out = [];
  Babel.transform(src, { presets: [], plugins: [() => ({ visitor: { Program(p) {
    const byStmt = new Map();
    Object.keys(p.scope.bindings).forEach(name => {
      const sp = p.scope.bindings[name].path.getStatementParent();
      if (!sp) return;
      (byStmt.get(sp.node) || byStmt.set(sp.node, new Set()).get(sp.node)).add(name);
    });
    p.get('body').forEach(sp => {
      const n = sp.node, refs = new Set();
      sp.traverse({
        ReferencedIdentifier(ip) { const nm = ip.node.name; const b = ip.scope.getBinding(nm); if (!b || b.scope.block === p.node) refs.add(nm); },
        MemberExpression(mp) { const o = mp.node.object; if (o.type === 'Identifier' && o.name === 'window' && !mp.node.computed && mp.node.property.type === 'Identifier') refs.add('window.' + mp.node.property.name); },
      });
      const isExp = isExportStmt(src, n);
      out.push({ start: n.start, end: n.end, node: n, declared: byStmt.get(n) || new Set(), refs, isExport: isExp });
      if (isExp) {
        /* 匯出時改名或寫運算式的屬性（`foo: () => _bar()`）：key 是另一個「名字」，值引用了別的東西。
           當成一個虛擬的宣告處理，這樣名單、引用分析、切分都用同一套規則。 */
        n.expression.arguments[1].properties.forEach(pr => {
          if (pr.shorthand || !pr.key) return;
          const key = pr.key.name || pr.key.value, prefs = new Set();
          sp.get('expression').get('arguments.1').get('properties').forEach(pp => {
            if (pp.node !== pr) return;
            pp.get('value').traverse({ ReferencedIdentifier(ip) { const nm = ip.node.name; const b = ip.scope.getBinding(nm); if (!b || b.scope.block === p.node) prefs.add(nm); } });
            if (pp.get('value').isIdentifier()) prefs.add(pp.node.value.name);
          });
          out.push({ start: pr.start, end: pr.end, node: pr, declared: new Set([key]), refs: prefs, isExport: false, virtual: true, parent: n });
        });
      }
    });
  } } })], filename: 'data.js', compact: false });
  return out;
}

/* 切分：teacherNames 裡的宣告 → 老師包；匯出陳述式照屬性拆。回傳 { core, teacher, problems } */
function partition(src, teacherNames) {
  const T = new Set(teacherNames);
  const all = parseStatements(src);
  const stmts = all.filter(s => !s.virtual);
  const virt = all.filter(s => s.virtual);
  const problems = [];
  const isTeacherStmt = (s) => !s.isExport && s.declared.size > 0 && [...s.declared].every(n => T.has(n));
  stmts.forEach(s => { if (!s.isExport && s.declared.size && [...s.declared].some(n => T.has(n)) && !isTeacherStmt(s)) problems.push(`一個陳述式同時宣告老師與非老師的名字：${[...s.declared].join(',')}`); });
  const tStmts = new Set(stmts.filter(isTeacherStmt));
  const tNames = new Set(); tStmts.forEach(s => s.declared.forEach(n => tNames.add(n)));
  const tAlias = new Set(virt.filter(v => T.has([...v.declared][0])).map(v => [...v.declared][0]));
  virt.forEach(v => { const k = [...v.declared][0]; if (!tAlias.has(k)) v.refs.forEach(r => { if (tNames.has(r)) problems.push(`匯出屬性「${k}」留在核心，但它用到老師專用的 ${r}`); }); });
  // 核心陳述式不可以引用老師名字（bare 或 window.X）——這是整件事最重要的檢查
  stmts.forEach(s => {
    if (tStmts.has(s) || s.isExport) return;
    s.refs.forEach(r => { const nm = r.replace(/^window\./, ''); if (tNames.has(nm)) problems.push(`核心陳述式「${src.slice(s.start, s.start + 50).replace(/\s+/g, ' ')}」用到老師專用的 ${nm}`); });
  });
  let core = '', teacher = '', prev = 0;
  const push = (to, text) => { if (to === 'core') core += text; else teacher += text; };
  stmts.forEach(s => {
    const lead = src.slice(prev, s.start);           // 前面的註解與空白跟著這個陳述式走
    const text = src.slice(s.start, s.end);
    if (s.isExport) {
      const obj = s.node.expression.arguments[1];
      const keep = [], move = [];
      obj.properties.forEach(pr => {
        const key = pr.key && (pr.key.name || pr.key.value);
        const isT = pr.shorthand ? tNames.has(key) : tAlias.has(key);
        (isT ? move : keep).push(src.slice(pr.start, pr.end));
      });
      const head = src.slice(s.start, obj.start + 1);
      const tail = src.slice(obj.end - 1, s.end);
      push('core', lead);
      if (keep.length) push('core', head + ' ' + keep.join(', ') + ' ' + tail);
      if (move.length) push('teacher', '\n' + head + ' ' + move.join(', ') + ' ' + tail + '\n');
    } else if (tStmts.has(s)) {
      push('teacher', lead + text);
    } else {
      push('core', lead + text);
    }
    prev = s.end;
  });
  core += src.slice(prev);
  return { core, teacher, problems, teacherNames: [...tNames].sort(), statements: stmts.length };
}

/* ───────── 分析（--analyze）：算出老師專用名單 ───────── */
function analyze() {
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const src = read('data.js');
  const stmts = parseStatements(src);   // 含虛擬的「匯出屬性」
  const owner = {}; stmts.forEach((s, i) => s.declared.forEach(n => { owner[n] = i; }));
  const dataNames = new Set(Object.keys(owner));
  // 其他檔案對 data.js 名字的引用位置（含外層函式名鏈）
  const sites = {};
  const scan = (f, jsx) => {
    Babel.transform(read(f), { presets: jsx ? ['react'] : [], plugins: ['transform-block-scoping', () => ({ visitor: {
      ReferencedIdentifier(p) { const n = p.node.name; if (p.scope.hasBinding(n, true) || !dataNames.has(n)) return; add(p, n, f); },
      MemberExpression(p) { const o = p.node.object; if (o.type === 'Identifier' && o.name === 'window' && !p.node.computed && p.node.property.type === 'Identifier' && dataNames.has(p.node.property.name)) add(p, p.node.property.name, f); },
    } })], filename: f });
    function add(p, n, file) {
      const chain = []; let q = p;
      while ((q = q.getFunctionParent())) {
        const nd = q.node; let nm = nd.id && nd.id.name;
        if (!nm && q.parent && q.parent.type === 'VariableDeclarator' && q.parent.id.name) nm = q.parent.id.name;
        if (!nm && q.parent && q.parent.type === 'AssignmentExpression' && q.parent.left.property) nm = q.parent.left.property.name;
        if (nm) chain.push(nm);
      }
      (sites[n] = sites[n] || []).push({ file, chain });
    }
  };
  TEACHER_FILES.forEach(f => scan(f, true));
  OTHER_FILES.forEach(f => scan(f, !/^data/.test(f)));
  const okSite = (x) => TEACHER_FILES.includes(x.file) || (x.file === 'app.jsx' && x.chain.some(c => GATED_APP.includes(c)));
  const refsBy = stmts.map(() => new Set());
  stmts.forEach((s, i) => { if (s.isExport) return; s.refs.forEach(r => { const o = owner[r.replace(/^window\./, '')]; if (o !== undefined && o !== i) refsBy[o].add(i); }); });
  const teacher = new Set();
  const declIdx = stmts.map((s, i) => i).filter(i => stmts[i].declared.size && !stmts[i].isExport);
  let changed = true;
  while (changed) {
    changed = false;
    for (const i of declIdx) {
      if (teacher.has(i)) continue;
      const s = stmts[i]; let bad = false, anyRef = false;
      s.declared.forEach(n => (sites[n] || []).forEach(x => { anyRef = true; if (!okSite(x)) bad = true; }));
      if (bad) continue;
      const refs = [...refsBy[i]];
      if (refs.some(r => !teacher.has(r))) continue;
      if (!anyRef && !refs.length && !s.virtual) continue;        // 誰都沒引用（只靠匯出）＝不確定，不動；匯出屬性本身沒人用就跟著老師走
      teacher.add(i); changed = true;
    }
  }
  // 一個陳述式宣告多個名字時，只有全部都是老師專用才搬（上面是逐陳述式判斷，所以天然成立）
  const names = [...teacher].flatMap(i => [...stmts[i].declared]).sort();
  return { names, sites };
}

if (require.main === module) {
  try {
  if (process.argv.includes('--analyze')) {
    const { names } = analyze();
    fs.writeFileSync(LIST, JSON.stringify({ note: '由 node tools/split-data.js --analyze 產生；不要手改。GATED_APP 見 tools/split-data.js', gated: GATED_APP, names }, null, 1) + '\n');
    console.log('老師專用名字', names.length, '個 → tools/teacher-data.json');
  } else {
    const r = writeDist();
    console.log(`  ✅ data.js ${(r.srcLen / 1024) | 0}KB → dist/data-core.js ${(r.core.length / 1024) | 0}KB ＋ dist/data-teacher.js ${(r.teacher.length / 1024) | 0}KB`);
  }
  } catch (e) { console.error(e.message); process.exit(1); }
}
/* 讀 data.js ＋ teacher-data.json → 切好、寫進 dist/。有問題（核心用到老師專用的東西）就丟錯，build 不會默默過關。 */
function splitFromDisk() {
  const src = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
  const names = JSON.parse(fs.readFileSync(LIST, 'utf8')).names;
  const r = partition(src, names);
  return { ...r, srcLen: src.length };
}
function writeDist() {
  const r = splitFromDisk();
  if (r.problems.length) throw new Error('data.js 切分有問題：\n' + r.problems.join('\n'));
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'dist/data-core.js'), r.core);
  fs.writeFileSync(path.join(ROOT, 'dist/data-teacher.js'), r.teacher);
  return r;
}
module.exports = { partition, analyze, parseStatements, splitFromDisk, writeDist, GATED_APP, TEACHER_FILES, LIST };
