// t-v594 — 載入速度：老師專用的兩包改成「確認是老師才載」＋React/Firebase 自己放＋SW 預先快取修正
//
// 🔴 本來 SW 的預先快取清單寫死 ?v=521，頁面要的卻是 ?v=593——預先快取的全是沒人用的 URL，
//    第一次來的學生白白多下載一整份（約 1.9MB），還跟頁面搶頻寬。
// ⚠ 老師那包（editor 148KB＋dashboard 64KB，壓縮後）只要學生的程式不依賴它，就不該讓學生下載。
//   「不依賴」不能靠記憶——這支測試用 Babel 的作用域分析逐檔算：學生那七包有沒有用到
//   「只在老師那兩包裡定義」的名字。以後有人在學生頁面用了編輯器的函式，這裡會紅。
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import crypto from 'crypto';
const require = createRequire(import.meta.url);
const ROOT = path.join(new URL('..', import.meta.url).pathname);
const R = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const noC = (t) => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const html = noC(R('index.html')), sw = R('sw.js'), app = R('app.jsx'), shell = R('components-shell.jsx'), editor = R('components-editor.jsx');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】版本一致＋SW 預先快取清單對得上頁面真的要的檔案');
const vIdx = [...new Set([...html.matchAll(/\?v=(\d+)/g)].map(m => m[1]))];
const vSw = (sw.match(/const CACHE = 'alans-english-v(\d+)'/) || [])[1];
ok(`⭐ index.html 所有 ?v= 一致（${vIdx.join()}），而且跟 sw.js 的 CACHE 版本相同（${vSw}）`, vIdx.length === 1 && vIdx[0] === vSw);
ok('⭐⭐ SW 預先快取的版本號從 CACHE 名字取，不再寫死', /const V = CACHE\.replace\(/.test(sw) && !/\?v=\d{3}/.test(sw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
/* 把 PRECACHE 的內容真的算出來（用同一份程式碼） */
const pre = (() => { const src = sw.slice(sw.indexOf('const CACHE'), sw.indexOf('const STATIC_PRECACHE'));
  const f = new Function('self', 'URL', src.replace(/const SW_PATH[\s\S]*?\n/, "const SW_PATH='/Alan-s-English-Class/sw.js';\n") + '\nreturn { PRECACHE, V };');
  return f({ location: { href: 'https://x/Alan-s-English-Class/sw.js' } }, URL); })();
const want = new Set([...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|json)[^"]*)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u)));
const pc = pre.PRECACHE.map(u => u.replace('/Alan-s-English-Class/', '')).filter(u => u && u !== '/' && !/index\.html|summer/.test(u));
ok(`⭐⭐ 預先快取的每一個檔案，頁面真的有要（${pc.length} 個）——對不上就是白下載`, pc.every(u => want.has(u)));
const TEACHER = /components-(editor|dashboard)/;
ok('⭐ 頁面一開始就要的檔案都有預先快取（學生第二次開就是即時的）', [...want].filter(u => !TEACHER.test(u) && !/holiday|summer|\.json/.test(u)).every(u => pc.includes(u)));
ok('⭐ 老師那兩包不在預先快取裡（放了＝每個學生都下載一次）', !pc.some(u => TEACHER.test(u)));

console.log('\n【2】React / Firebase 自己放');
const vend = { 'vendor/react-18.3.1.production.min.js': 'sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z',
               'vendor/react-dom-18.3.1.production.min.js': 'sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1' };
Object.keys(vend).forEach(f => ok(`⭐⭐ ${f} 的雜湊跟原本 index.html 上的 SRI 逐字相同（內容沒被動過）`,
  'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(path.join(ROOT, f))).digest('base64') === vend[f]));
ok('⭐ 頁面不再從 unpkg／gstatic 載程式（只剩字型）', !/unpkg\.com|gstatic\.com\/firebasejs/.test(html));
ok('⭐ 六個 vendor 檔都存在、都在預先快取裡，而且載入順序 React → ReactDOM → firebase app → firestore → storage → auth（data-core 之前）', (() => {
  const order = [...html.matchAll(/<script src="(vendor\/[^"]+)"/g)].map(m => m[1].replace(/-\d[\d.]*(\.production\.min)?\.js$/, ''));
  const files = [...html.matchAll(/<script src="(vendor\/[^"]+)"/g)].map(m => m[1]);
  return files.length === 6 && files.every(f => fs.existsSync(path.join(ROOT, f)) && pre.PRECACHE.some(u => u.endsWith('/' + f)))
    && order.join() === 'vendor/react,vendor/react-dom,vendor/firebase-app-compat,vendor/firebase-firestore-compat,vendor/firebase-storage-compat,vendor/firebase-auth-compat'
    && html.indexOf('vendor/firebase-auth') < html.indexOf('dist/data-core.js'); })());

console.log('\n【3】老師那兩包：只有老師才載，而且學生頁不依賴它們');
ok('⭐ app.jsx 只在 isTeacher 才呼叫 loadTeacherBundle，載完 setTbReady 重畫，失敗最多重試 3 次', /if \(!isTeacher \|\| tbReady \|\| !window\.loadTeacherBundle\) return;/.test(noC(app)) && /setTbReady\(true\)/.test(app) && /n < 3/.test(app));
ok('⭐ 老師專用的視窗一律經過 Lazy（沒載進來就不畫）——不再直接 <window.EditorModal …>', !/<window\.(EditorModal|WeekModal|GrammarGenModal|ReadingGenModal|QuickSetModal|TermSetupModal|ExportModal|TeacherDashboard)\b/.test(noC(app))
  && /function Lazy\(\{ n, \.\.\.p \}\)/.test(app));
ok('⭐⭐ Footer 是學生頁也會畫的，已經搬到學生一定會載的 components-shell（editor 裡不再有）', /function Footer\(/.test(shell) && !/function Footer\(/.test(editor) && /Boom, Footer, findUnitsIn/.test(shell));
/* 用 Babel 作用域分析：學生那七包有沒有用到「只在老師那兩包定義」的名字 */
const Babel = require(path.join(ROOT, 'tools/babel.min.js'));
const files = ['data.js', 'data-g1.js', 'data-g2.js', 'data-g4.js', 'data-g5.js', 'data-g6.js', 'data-summer.js', 'data-grammar.js', 'components-shell.jsx', 'components-quiz.jsx', 'components-flashcard.jsx', 'components-editor.jsx', 'components-quiz-mode.jsx', 'components-dashboard.jsx', 'components-mistakes.jsx', 'app.jsx', 'components-fx.jsx'];
const decl = {}, refs = {};
files.forEach(f => { decl[f] = new Set(); refs[f] = new Map();
  Babel.transform(R(f), { presets: ['react'], plugins: ['transform-block-scoping', () => ({ visitor: {
    Program(p) { Object.keys(p.scope.bindings).forEach(n => decl[f].add(n)); },
    ReferencedIdentifier(p) { const n = p.node.name; if (!p.scope.hasBinding(n, true)) refs[f].set(n, (refs[f].get(n) || 0) + 1); } } })], filename: f }); });
const owner = {}; files.forEach(f => decl[f].forEach(n => { (owner[n] = owner[n] || []).push(f); }));
const T = ['components-editor.jsx', 'components-dashboard.jsx'];
const leaks = [];
files.filter(f => !T.includes(f)).forEach(f => T.forEach(t => [...decl[t]].filter(n => owner[n].length === 1 && refs[f].has(n)).forEach(n => leaks.push(`${f} → ${n}（${t}）`))));
ok('⭐⭐ 學生那些檔案沒有用到「只在老師那兩包裡定義」的全域名字' + (leaks.length ? '：' + leaks.join('、') : ''), leaks.length === 0);
/* window.X 的存取（字串）：app.jsx 以外的學生檔案不可以讀老師那兩包匯出的東西 */
const exp = (src) => { const s = new Set(); for (const m of src.matchAll(/Object\.assign\(window,\s*\{([\s\S]*?)\}\);/g)) m[1].split(/[,\n]/).map(x => x.split(':')[0].trim()).filter(x => /^[A-Za-z_$][\w$]*$/.test(x)).forEach(x => s.add(x)); return s; };
const tExports = new Set([...exp(R('components-editor.jsx').split('const dataJsSnippet')[0]), ...exp(R('components-dashboard.jsx'))]);
const dataExports = exp(R('data.js'));
const onlyTeacher = [...tExports].filter(n => !dataExports.has(n) && !exp(shell).has(n));
const winLeaks = [];
['components-shell.jsx', 'components-quiz.jsx', 'components-flashcard.jsx', 'components-quiz-mode.jsx', 'components-mistakes.jsx', 'components-fx.jsx', 'data.js'].forEach(f => {
  const src = noC(R(f)); onlyTeacher.forEach(n => { if (new RegExp('window\\.' + n.replace(/\$/g, '\\$') + '\\b').test(src)) winLeaks.push(`${f} → window.${n}`); }); });
ok('⭐⭐ 學生那些檔案也沒有透過 window.X 讀老師那兩包匯出的東西' + (winLeaks.length ? '：' + winLeaks.join('、') : ''), winLeaks.length === 0);
console.log(fail ? `\n❌ t-v594：${pass} 過 / ${fail} 失敗` : `\n✅ t-v594：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
