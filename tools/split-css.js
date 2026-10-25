/* tools/split-css.js — v600：把全站樣式表切成「學生看得到的」與「只有老師才用到的」兩份。
 *
 * 為什麼：11 張樣式表合計 886KB（壓縮後約 330KB），學生每次冷啟動都要下載、解析，
 * 而且瀏覽器每次重排都要拿元素去比對 8,000 多條規則。其中 34% 的規則（約 300KB）
 * 的選擇器裡有「學生那邊的程式從來沒有用過」的 class——老師後台、編輯視窗、出題工具的樣式。
 *
 * 做法（⚠ 原始 styles-*.css 一個字都沒動——測試與改樣式的方式照舊）：
 *   build 時逐張切成  dist/css/<名>.css（學生一定要載）＋ dist/css/<名>.teacher.css（老師才載）。
 *   index.html 載前者；loadTeacherBundle 把後者**插在前者的正後面**，所以老師看到的層疊順序跟以前幾乎一樣。
 *   ⚠ 用原文切片，不是重新產生——註解、順序、寫法都原封不動。
 *
 * 一條規則什麼時候算「老師專用」（寧可少搬，不可搬錯——搬錯＝學生畫面某處沒樣式，而且不報錯）：
 *   選擇器清單裡的**每一個**選擇器，都至少有一個 class：
 *     ① 在學生的程式（shell／quiz／flashcard／quiz-mode／mistakes／app／fx／data-core／data-g*／index.html）裡
 *        完全沒有出現過（連子字串都沒有）
 *     ② 也不是動態組出來的（'前綴-' + x、`前綴-${x}`、${x}-後綴 都算「出現過」）
 *     ③ 而且不在 :not() :is() :where() :has() 裡面（那些裡面的 class 是「或」或「排除」，不能當證人）
 *   有 [class…] 屬性選擇器、或根本沒有 class 的規則一律不搬。
 *   @media／@supports 裡面的規則照樣判斷，搬的時候外面的條件一起帶過去；@keyframes／@font-face 一律留在學生那份。
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist/css');
const CSS_FILES = ['styles.css', 'styles-part2.css', 'styles-quiz.css', 'styles-flashcard.css', 'styles-auth.css', 'styles-quiz-mode.css',
  'styles-mistakes.css', 'styles-home.css', 'styles-theme.css', 'styles-fx.css', 'styles-tune.css'];
/* 「學生那邊」的程式：只要這些裡面出現過的 class，就一律當學生會用到 */
const STUDENT_SRC = ['components-shell.jsx', 'components-quiz.jsx', 'components-flashcard.jsx', 'components-quiz-mode.jsx', 'components-mistakes.jsx',
  'app.jsx', 'components-fx.jsx', 'dist/data-core.js', 'data-g1.js', 'data-g2.js', 'data-g4.js', 'data-g5.js', 'data-g6.js', 'data-summer.js',
  'data-grammar.js', 'index.html'];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function makeSeen(studentText) {
  const cache = {};
  return (cls) => {
    if (cls in cache) return cache[cls];
    let seen = studentText.includes(cls);
    if (!seen) {
      const parts = cls.split('-');
      for (let k = parts.length - 1; k >= 1 && !seen; k--) {
        const pre = parts.slice(0, k).join('-') + '-', suf = '-' + parts.slice(k).join('-');
        if (new RegExp(esc(pre) + '(?:[\'"`]|\\$\\{)').test(studentText)) seen = true;           // 'qm-' + x ／ `qm-${x}`
        else if (new RegExp('(?:\\}|[\'"`])' + esc(suf) + '(?![\\w-])').test(studentText)) seen = true;   // ${x}-title ／ '-title'
      }
    }
    return (cache[cls] = seen);
  };
}

/* ───── CSS 掃描：字串與註解都認得（data URI 裡常有 { } ; ）───── */
function skipStr(s, i) { const q = s[i]; i++; while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; } return i + 1; }
function skipComment(s, i) { const e = s.indexOf('*/', i + 2); return e < 0 ? s.length : e + 2; }
/* 從 i 找到 depth 0 的下一個 { 或 ;（回傳位置與字元） */
function findDelim(s, i) {
  let paren = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'") { i = skipStr(s, i); continue; }
    if (c === '/' && s[i + 1] === '*') { i = skipComment(s, i); continue; }
    if (c === '(') paren++; else if (c === ')') paren--;
    else if (paren <= 0 && (c === '{' || c === ';')) return [i, c];
    else if (c === '}') return [i, c];
    i++;
  }
  return [s.length, ''];
}
function matchBrace(s, i) {   // s[i] === '{' → 對應的 } 位置
  let d = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'") { i = skipStr(s, i); continue; }
    if (c === '/' && s[i + 1] === '*') { i = skipComment(s, i); continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (d === 0) return i; }
    i++;
  }
  return -1;
}
/* 掃一層：[{ lead, prelude, body|null, kind }]，lead＝前面的註解與空白（跟著這一項走） */
function scanLevel(s) {
  const items = []; let i = 0, leadStart = 0;
  while (i < s.length) {
    // 吃掉空白與註解
    while (i < s.length) {
      if (/\s/.test(s[i])) i++;
      else if (s[i] === '/' && s[i + 1] === '*') i = skipComment(s, i);
      else break;
    }
    if (i >= s.length) break;
    const pStart = i;
    const [d, ch] = findDelim(s, i);
    if (ch === '{') {
      const end = matchBrace(s, d);
      if (end < 0) throw new Error('樣式表大括號對不上（位置 ' + d + '）');
      items.push({ lead: s.slice(leadStart, pStart), prelude: s.slice(pStart, d), body: s.slice(d + 1, end), kind: 'block' });
      i = end + 1;
    } else if (ch === ';') {
      items.push({ lead: s.slice(leadStart, pStart), prelude: s.slice(pStart, d + 1), body: null, kind: 'stmt' });
      i = d + 1;
    } else { // 沒有結尾（檔案尾巴的空白或殘字）
      items.push({ lead: s.slice(leadStart, pStart), prelude: s.slice(pStart), body: null, kind: 'tail' });
      i = s.length;
    }
    leadStart = i;
  }
  return { items, tail: s.slice(leadStart) };
}

/* 選擇器清單（頂層逗號分開，括號裡的逗號不算） */
function splitSelectors(sel) {
  const out = []; let d = 0, st = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '"' || c === "'") { i = skipStr(sel, i) - 1; continue; }
    if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--;
    else if (c === ',' && d === 0) { out.push(sel.slice(st, i)); st = i + 1; }
  }
  out.push(sel.slice(st));
  return out.map(x => x.trim()).filter(Boolean);
}
/* 拿掉 :not(...) :is(...) :where(...) :has(...) :matches(...)（括號要配對） */
function stripFunctional(sel) {
  const re = /:(?:not|is|where|has|matches|-webkit-any|-moz-any)\(/g;
  let m, out = '', last = 0;
  while ((m = re.exec(sel))) {
    let d = 1, j = m.index + m[0].length;
    while (j < sel.length && d > 0) { if (sel[j] === '(') d++; else if (sel[j] === ')') d--; j++; }
    out += sel.slice(last, m.index); last = j; re.lastIndex = j;
  }
  return out + sel.slice(last);
}
const witnesses = (selector) => {
  if (/\[\s*class/i.test(selector)) return null;                     // 屬性選擇器可能對到任何 class
  return [...stripFunctional(selector).matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]);
};

function isTeacherRule(prelude, seen) {
  const sels = splitSelectors(prelude);
  if (!sels.length) return false;
  return sels.every(sel => { const w = witnesses(sel); return !!(w && w.some(c => !seen(c))); });
}

/* 切一張樣式表 → { core, teacher, moved, total }。teacher 為空字串＝這張沒有可搬的 */
function splitCss(css, seen) {
  let moved = 0, total = 0;
  const walk = (text) => {
    const { items, tail } = scanLevel(text);
    let core = '', teacher = '';
    items.forEach(it => {
      const raw = it.lead + it.prelude + (it.body === null ? '' : '{' + it.body + '}');
      if (it.kind !== 'block') { core += raw; return; }
      const head = it.prelude.trim();
      if (/^@(media|supports|container|layer)\b/i.test(head)) {
        const inner = walk(it.body);
        const wrap = (b) => it.lead + it.prelude + '{' + b + '}';
        if (inner.core.trim()) core += wrap(inner.core); else core += '';
        if (inner.teacher.trim()) teacher += wrap(inner.teacher);
        return;
      }
      if (head.startsWith('@')) { core += raw; return; }              // keyframes／font-face／page…：留在學生那份
      total++;
      if (isTeacherRule(it.prelude, seen)) { teacher += raw; moved++; } else core += raw;
    });
    return { core: core + tail, teacher };
  };
  const r = walk(css);
  return { core: r.core, teacher: r.teacher, moved, total };
}

function buildSeen() {
  const text = STUDENT_SRC.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  return makeSeen(text);
}
function splitAll() {
  const seen = buildSeen();
  const res = {};
  CSS_FILES.forEach(f => {
    const css = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (/url\(\s*(?!["']?(?:data:|https?:|#|%23))/.test(css.replace(/\/\*[\s\S]*?\*\//g, ''))) throw new Error(f + ' 有相對路徑的 url()，搬到 dist/css/ 之後會壞——要先改寫路徑');
    res[f] = { ...splitCss(css, seen), srcLen: css.length };
  });
  return res;
}
function writeDist() {
  const res = splitAll();
  fs.mkdirSync(OUT, { recursive: true });
  fs.readdirSync(OUT).forEach(f => fs.unlinkSync(path.join(OUT, f)));   // 名單縮小時不留舊檔
  Object.keys(res).forEach(f => {
    fs.writeFileSync(path.join(OUT, f), res[f].core);
    if (res[f].teacher.trim()) fs.writeFileSync(path.join(OUT, f.replace(/\.css$/, '.teacher.css')), res[f].teacher);
  });
  return res;
}
module.exports = { CSS_FILES, STUDENT_SRC, OUT, splitCss, splitAll, writeDist, buildSeen, makeSeen, isTeacherRule, splitSelectors, stripFunctional, scanLevel };

if (require.main === module) {
  const res = writeDist();
  let a = 0, c = 0, t = 0;
  Object.keys(res).forEach(f => { const r = res[f]; a += r.srcLen; c += r.core.length; t += r.teacher.length; console.log(`  ✅ ${f.padEnd(22)} ${String((r.srcLen / 1024) | 0).padStart(4)}KB → 學生 ${String((r.core.length / 1024) | 0).padStart(4)}KB ＋ 老師 ${String((r.teacher.length / 1024) | 0).padStart(4)}KB（搬了 ${r.moved}/${r.total} 條）`); });
  console.log(`  樣式表合計 ${(a / 1024) | 0}KB → 學生 ${(c / 1024) | 0}KB ＋ 老師 ${(t / 1024) | 0}KB`);
}
