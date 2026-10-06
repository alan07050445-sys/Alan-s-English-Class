/* t-undeclared — 🔴 v472：守住「用了但從來沒宣告的變數」這個關卡本身
 *
 * 為什麼需要它：jsxcheck 本來只轉一次語法，**語法完全正確但畫面一渲染就
 * ReferenceError** 的錯它抓不到。v462 的 `disabled={planBusy || !sheet}`
 * （sheet 只存在於另一個 async 函式裡）就這樣活了九個版本，一直到 Alan
 * 2026-10-07 按「一鍵生成文法」看到整個視窗是白的才被發現。
 * 同一輪還撈出 parseShopLines 根本沒被寫出來（商店的批次加入按鈕是死的）。
 *
 * ⚠ 這一支不只是「跑一次看過不過」——還要證明它**真的抓得到**那種錯，
 *   以及**不會亂報**（假警報一多就沒有人會理它，等於沒有這個關卡）。
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHECK = path.join(ROOT, 'tools', 'jsxcheck.js');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const run = (args) => {
  try { return { code: 0, out: execFileSync('node', [CHECK, ...args], { cwd: ROOT, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
};

console.log('\n【1】工具要在 repo 裡，不是臨時下載的');
ok('⭐ tools/jsxcheck.js 在', fs.existsSync(CHECK));
ok('⭐ tools/babel.min.js 也在（少了它，換一台電腦這個關卡就等於不存在）',
   fs.existsSync(path.join(ROOT, 'tools', 'babel.min.js')));
ok('工具不會被送給學生（index.html 與 sw.js 都沒提到）',
   !fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').includes('tools/') &&
   !fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes('tools/'));

console.log('\n【2】現在全站是乾淨的');
const SITE = ['app.jsx', 'data.js', 'sw.js']
  .concat(fs.readdirSync(ROOT).filter(f => /^components-.*\.jsx$/.test(f)))
  .concat(fs.readdirSync(ROOT).filter(f => /^data-.*\.js$/.test(f)));
const all = run(SITE);
ok(`⭐ ${SITE.length} 個檔案都沒有「用了沒宣告」的變數`, all.code === 0);
if (all.code !== 0) console.log(all.out);

console.log('\n【3】它真的抓得到（不是裝飾品）');
const tmp = path.join(ROOT, '_undeclared-probe.jsx');
const probe = (body) => { fs.writeFileSync(tmp, body); const r = run([tmp]); fs.unlinkSync(tmp); return r; };
const bug = probe(`function Foo() {\n  const go = async () => { const sheet = await load(); use(sheet); };\n` +
                  `  return <button disabled={!sheet} onClick={go}>x</button>;\n}\nfunction load(){} function use(){}\n`);
ok('⭐ 抓得到 v462 那種錯（sheet 只存在於巢狀 async 函式裡）',
   bug.code !== 0 && /\bsheet\b/.test(bug.out));
const missingFn = probe('function Foo() { return bar(1); }\n');
ok('⭐ 抓得到「函式根本沒被寫出來」（parseShopLines 那種）',
   missingFn.code !== 0 && /\bbar\b/.test(missingFn.out));

console.log('\n【4】不會亂報——假警報一多就沒有人會理它');
ok('瀏覽器內建的東西不算（caches／DOMMatrixReadOnly／self…）',
   probe('const a = caches; const b = new DOMMatrixReadOnly(); const c = localStorage;\n').code === 0);
ok('非箭頭函式裡的 arguments 不算', probe('function f() { return arguments.length; }\n').code === 0);
ok('同一檔案裡後面才宣告的函式不算（hoisting）',
   probe('function A() { return B(); }\nfunction B() { return 1; }\n').code === 0);
ok('⭐ 跨檔案的全域不算（這些是分開的 <script>，但共用同一個全域作用域）',
   (() => {
     const f1 = path.join(ROOT, '_probe-a.jsx'), f2 = path.join(ROOT, '_probe-b.jsx');
     fs.writeFileSync(f1, 'function SharedThing() { return 1; }\n');
     fs.writeFileSync(f2, 'function Uses() { return SharedThing(); }\n');
     const r = run([f1, f2]); fs.unlinkSync(f1); fs.unlinkSync(f2);
     return r.code === 0;
   })());
ok('JSX 元件名也照同一套規則（<Foo/> 沒定義就該報）',
   probe('function A() { return <NeverDefined/>; }\n').code !== 0);

console.log('\n【5】語法壞掉還是照樣擋（本來那件事沒有退步）');
ok('⭐ 壞掉的 JSX 擋得住', probe('function A() { return <div>;\n}\n').code !== 0);

console.log(`\n${fail ? '❌' : '✅'} t-undeclared：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
