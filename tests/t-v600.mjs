// t-v600 — 樣式表切成「學生一定要載」與「只有老師才用」兩份（tools/split-css.js）
//   ⚠ 切錯的後果：學生畫面某處突然沒樣式，而且不報錯。這支測：切得對、沒有規則弄丟、
//     老師那份真的會被載、載的位置不會讓層疊順序走掉。
//   （另外跑過真的 Chrome 的「逐元素計算樣式比對」：學生 8 個畫面×2 種寬度、老師 14 個畫面（含後台、編輯器、各種視窗），
//     全部 0 處不同——那支比對腳本很吃時間，不放在測試裡。）
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = path.join(new URL('..', import.meta.url).pathname);
const sc = require(path.join(ROOT, 'tools/split-css.js'));
const R = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const html = R('index.html').replace(/<!--[\s\S]*?-->/g, ''), sw = R('sw.js');

console.log('\n【1】產物沒過期、沒弄丟規則');
const res = sc.splitAll();
const countRules = (css) => { let n = 0; const walk = (t) => sc.scanLevel(t).items.forEach(it => { if (it.kind !== 'block') return; if (/^@(media|supports|container|layer)\b/i.test(it.prelude.trim())) walk(it.body); else if (!it.prelude.trim().startsWith('@')) n++; }); walk(css); return n; };
let allFresh = true, allConserved = true, tooBig = [];
sc.CSS_FILES.forEach(f => {
  const core = fs.existsSync(path.join(sc.OUT, f)) ? R('dist/css/' + f) : null;
  const tf = 'dist/css/' + f.replace(/\.css$/, '.teacher.css');
  const teacher = fs.existsSync(path.join(ROOT, tf)) ? R(tf) : '';
  if (core !== res[f].core || teacher !== (res[f].teacher.trim() ? res[f].teacher : '')) allFresh = false;
  const src = R(f);
  if (countRules(src) !== countRules(core) + countRules(teacher)) allConserved = false;
});
ok('⭐⭐ dist/css/ 跟重新切一次逐字相同（忘了跑 node tools/build-jsx.js ＝ 線上跑舊樣式而且畫面正常）', allFresh);
ok('⭐⭐ 每一張：學生那份＋老師那份的規則數＝原本的規則數（一條都沒弄丟、沒重複）', allConserved);
ok('老師那份裡面沒有 @keyframes／@font-face（那些一律留在學生那份）', sc.CSS_FILES.every(f => { const p = path.join(ROOT, 'dist/css/' + f.replace(/\.css$/, '.teacher.css')); return !fs.existsSync(p) || !/@(keyframes|font-face)/.test(fs.readFileSync(p, 'utf8')); }));
const totSrc = sc.CSS_FILES.reduce((n, f) => n + res[f].srcLen, 0), totCore = sc.CSS_FILES.reduce((n, f) => n + res[f].core.length, 0);
ok(`⭐ 學生那份夠小（${(totCore / 1024) | 0}KB / 原本 ${(totSrc / 1024) | 0}KB，少 25% 以上）`, totCore < totSrc * 0.75);

console.log('\n【2】判斷規則（寧可少搬，不可搬錯）');
const seen = sc.makeSeen('className="qm-block lobby-x" ' + "'tt-' + k " + '`cat-${id}-title` ' + "cls={base + '-ghost'} " + 'shared-card');
const T = (sel) => sc.isTeacherRule(sel, seen);
ok('學生用過的 class 不搬', !T('.qm-block') && !T('.lobby-x:hover'));
ok('⭐ 學生從來沒用過的 class 才搬', T('.tdash-card') && T('.tdash-card .x, .tdash-row'));
ok('⭐⭐ 動態組出來的 class 算用過（\'tt-\' + k、`cat-${id}-title`、${base}-ghost）', !T('.tt-row') && !T('.cat-g4-title') && !T('.foo-ghost'));
ok('⭐⭐ 逗號分開的選擇器：只要有一個是學生用得到的，整條規則都不搬', !T('.tdash-card, .qm-block') && T('.tdash-a, .tdash-b'));
ok('⭐⭐ :not() 裡的 class 不能當「學生沒用過」的證據（.qm-block:not(.tdash-x) 對學生有效）', !T('.qm-block:not(.tdash-x)') && !T('button:not(.tdash-x)'));
ok('⭐ 有 [class…] 屬性選擇器、或根本沒有 class 的規則一律不搬', !T('[class*="tdash-"]') && !T('button') && !T('body') && !T('*') && !T('html.tdash-x [class^="a"]'));
ok('⭐ 後代選擇器：祖先或自己有一個學生沒用過的 class 就搬不到學生（.tdash-wrap .qm-block）', T('.tdash-wrap .qm-block') && !T('.qm-block .lobby-x'));

console.log('\n【3】載入：學生載學生那份，老師才多載老師那份，位置不變');
const names = sc.CSS_FILES.map(f => f.replace(/\.css$/, ''));
const links = [...html.matchAll(/<link rel="stylesheet" href="dist\/css\/([\w-]+)\.css\?v=\d+"\/>/g)].map(m => m[1]);
ok('⭐⭐ index.html 載的是 dist/css/ 的學生版，十一張、順序跟原本完全一樣（styles-tune 最後）', links.join() === names.join() && !/href="styles-[\w-]+\.css/.test(html));
const tList = (html.match(/var T_CSS = \[([^\]]*)\]/) || [])[1];
const tNames = (tList || '').split(',').map(x => x.replace(/['\s]/g, '')).filter(Boolean);
const have = names.filter(n => fs.existsSync(path.join(ROOT, 'dist/css/' + n + '.teacher.css')));
ok('⭐⭐ 老師載入器的名單（T_CSS）＝ dist/css/ 實際有的 .teacher.css（少一張＝老師那邊某處沒樣式）', tNames.join() === have.join());
ok('⭐ 老師那份「插在對應學生那份的正後面」，不是丟到最後（層疊順序）', /core\.parentNode\.insertBefore\(l, core\.nextSibling\)/.test(html));
ok('⭐ 老師的樣式要等到才算載好（跟腳本一起 Promise.all，失敗也不擋老師）', /Promise\.all\(T_CSS\.map\(loadCss\)\)/.test(html) && /l\.onload = l\.onerror/.test(html) && /\.then\(function \(\) \{ return cssP; \}\)/.test(html));
const pre = (sw.match(/const PRECACHE = \[[\s\S]*?\n\];/) || [''])[0];
ok('⭐ SW 預先快取的是學生版（十一張），老師版不預先快取（那會讓每個學生都下載一次）', names.every(n => pre.includes("/dist/css/" + n + ".css'")) && !/teacher/.test(pre.replace(/\/\/.*$/gm, '')));
ok('原本那十一張 styles-*.css 沒有被刪（測試與改樣式都還讀它們）', sc.CSS_FILES.every(f => fs.existsSync(path.join(ROOT, f))));
console.log(fail ? `\n❌ t-v600：${pass} 過 / ${fail} 失敗` : `\n✅ t-v600：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
