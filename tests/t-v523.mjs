/* t-v523 — 🎃 萬聖節限定外觀
 * Alan 2026-10-20：「上次是製作國慶日，現在一直到 halloween 結束幫我換成
 * halloween 的風格，我要跟之前一樣全部都要改變」。
 *
 * 這一支守的是**安全性**，不是好不好看（跟 t-v489 同一套標準）：
 *   ① 不是節慶期間時，這整套必須完全不作用（11/01 之後沒人要去關它）
 *   ② 兩套節慶不可以疊在一起，日期判斷只能有一份
 *   ③ 閱讀面不可以被換掉（小朋友一次看半小時的地方）
 *   ④ 圖案真的畫得出來——這次有兩個是「完全不報錯但畫不出來」的坑
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data  = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const css   = fs.readFileSync(new URL('styles-holiday-hw.css', ROOT), 'utf8');
const tw    = fs.readFileSync(new URL('styles-holiday.css', ROOT), 'utf8');
const html  = fs.readFileSync(new URL('index.html', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
/* 記錄每一次 classList.toggle，才驗得出「切換時不會兩套疊在一起」 */
let calls = [];
const doc = { documentElement: { classList: { toggle: (c, on) => { calls.push([c, on]); } } } };
/* ⚠ localStorage 要給一個「真的會回 null」的假物件（t-v489 踩過）：
   Proxy stub 的 getItem 會回傳 Proxy（truthy），festOverride 的 `|| 'auto'` 就永遠走不到。 */
const store = {};
const LS = { getItem: k => (k in store ? store[k] : null),
             setItem: (k, v) => { store[k] = String(v); },
             removeItem: k => { delete store[k]; } };
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(W, doc, stub, LS);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const D  = (m, d) => new Date(2026, m - 1, d);
const hw = (m, d) => W.festIs('hw', D(m, d));

console.log('\n【1】它自己會開，也自己會關（最重要的一條）');
ok('⭐ 一年之中只有 10/20–10/31 這 12 天是萬聖節', (() => {
   let n = 0;
   for (let m = 1; m <= 12; m++) for (let d = 1; d <= 31; d++) {
     const dt = D(m, d); if (dt.getMonth() !== m - 1) continue;   // 2/30 這種會跑到下個月
     if (W.festIs('hw', dt)) n++;
   }
   return n === 12; })());
ok('⭐ 10/19 關、10/20 開、10/31 開、11/01 關',
   !hw(10, 19) && hw(10, 20) && hw(10, 31) && !hw(11, 1));
ok('   十二月、一月都不會突然冒出南瓜', !hw(12, 25) && !hw(1, 5) && !hw(6, 1));
ok('⭐ 國慶那套沒被弄壞（還是只有 10/08–10/12）', (() => {
   let n = 0;
   for (let m = 1; m <= 12; m++) for (let d = 1; d <= 31; d++) {
     const dt = D(m, d); if (dt.getMonth() !== m - 1) continue;
     if (W.festIs('1010', dt)) n++;
   }
   return n === 5; })());
ok('⭐⭐ 兩個節慶的日期區間不可以重疊——重疊的話 find() 只拿第一個，另一個靜靜不見', (() => {
   const f = W.FESTS;
   for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++)
     if (f[i].from <= f[j].to && f[j].from <= f[i].to) return false;
   return true; })());
ok('   10/31 當天問候語講「今天」，其他天講「快樂」',
   W.festIsDay(D(10, 31)) && !W.festIsDay(D(10, 25)) && W.festNow(D(10, 25)).hi === '萬聖節快樂');

console.log('\n【2】兩套不可以疊在一起');
ok('⭐⭐ 掛萬聖節的同時要把國慶那個 class 拿掉（只加不減＝兩套疊著跑）', (() => {
   W.festSetOverride('hw'); calls = []; W.festApply();
   const on  = calls.filter(([, v]) => v).map(([c]) => c);
   const off = calls.filter(([, v]) => !v).map(([c]) => c);
   return on.join() === 'fest-hw' && off.includes('fest-1010'); })());
ok('   切回國慶也一樣', (() => {
   W.festSetOverride('1010'); calls = []; W.festApply();
   const on  = calls.filter(([, v]) => v).map(([c]) => c);
   return on.join() === 'fest-1010'; })());
ok('   關掉的時候兩個都要拿掉', (() => {
   W.festSetOverride('off'); calls = []; W.festApply();
   return calls.every(([, v]) => !v) && calls.length === W.FESTS.length; })());
W.festSetOverride('auto');
ok('   class 是掛在 <html> 上（body 蓋不到自己的背景）', (() => {
   calls = []; W.festApply(); return calls.length > 0; })());

console.log('\n【3】沒開的時候，整份樣式完全不作用');
ok('⭐ styles-holiday-hw.css 的每一條規則都掛在 html.fest-hw 底下', (() => {
   const body = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\("[^"]*"\)/g, 'URL');
   const sels = body.split('}').map(b => b.split('{')[0].trim()).filter(Boolean);
   const bad = sels.flatMap(s => s.split(',').map(x => x.trim()))
     .filter(s => s && !s.startsWith('@') && !s.startsWith('html.fest-hw')
               && !/^\d+%$/.test(s) && !/^(from|to)$/.test(s)
               /* .fest-ribbon／.fest-day／.fest-tick／.hw-trail 是裝飾元素本身，
                  平常根本不會被建出來（下面【3b】逐一確認），所以不用加前綴 */
               && !/^\.fest-(ribbon|day|tick)/.test(s) && !/^\.hw-trail/.test(s));
   if (bad.length) console.log('      漏網的選擇器：', bad.slice(0, 5));
   return bad.length === 0; })());
ok('⭐⭐ 三個共用裝飾 class 的「本體」要在這個檔案裡自己寫一份', (() => {
   /* ⚠ 節慶期間只會載入當季那一個 CSS 檔——萬聖節時 styles-holiday.css
      根本沒載，不能靠它定義 .fest-badge／.fest-ribbon／.fest-day。 */
   return /^\.fest-tick \{/m.test(css) && /^\.fest-ribbon \{/m.test(css) && /^\.fest-day \{/m.test(css); })());

console.log('\n【3b】裝飾元素本身也要被擋住（不然 11/01 之後南瓜還掛在那）');
[['fest-ribbon', '飄帶'], ['fest-day-wrap', '倒數鐘']].forEach(([cls, zh]) => {
  ok(`⭐ ${zh} 只在節慶期間 render`, (() => {
     const i = shell.indexOf(cls);
     return i > 0 && /window\.festOn && window\.festOn\(\)/.test(shell.slice(Math.max(0, i - 400), i)); })());
});
ok('⭐ 滑鼠拖尾也一樣——沒過節就一個元素都不建', (() => {
   /* ⚠ 切到下一個 function 為止，不要用固定長度（t-lessons 踩過） */
   const i = shell.indexOf('function installFestCursor');
   const body = shell.slice(i, shell.indexOf('\nfunction ', i + 10));
   /* 第一行就要 return，而且還要擋觸控裝置與 prefers-reduced-motion
      （平板點一下也會送 pointermove，不擋等於一路噴圖案蓋住內容）。 */
   return i > 0
     && /if \(!\(window\.festOn && window\.festOn\(\)\)\) return;/.test(body)
     && /pointer: fine/.test(body) && /prefers-reduced-motion/.test(body); })());
ok('   拖尾不可以擋到點擊（會按不到登入鈕）', /\.hw-trail \{[\s\S]{0,220}pointer-events:\s*none/.test(css));
ok('   換頁時要把還在飄的清乾淨', (() => {
   const i = shell.indexOf('function installFestCursor');
   const b = shell.slice(i, shell.indexOf('\nfunction ', i + 10));
   return /pagehide/.test(b) && /querySelectorAll\('\.hw-trail'\)[\s\S]{0,80}remove\(\)/.test(b); })());

console.log('\n【4】圖案真的畫得出來（這次兩個坑都是「完全不報錯但畫不出來」）');
const uris = [...css.matchAll(/url\("(data:image\/svg\+xml,[^"]*)"\)/g)].map(m => m[1]);
ok('⭐ 全部是 SVG data URI，沒有多載入任何檔案（學生端不會變慢）',
   uris.length >= 6 && !/url\(['"]?(?!data:)[^)]*\.(png|jpg|jpeg|gif|svg|webp)/i.test(css));
ok('⭐ data URI 裡不可以有裸雙引號或 #（會把整條 background 靜默截斷成 none）',
   uris.length >= 6 && uris.every(u => u.indexOf('#') < 0));
ok('⭐⭐ 彎月不可以用「兩段 arc」做：內弧半徑小於弦長一半時，瀏覽器會把它放大成同一個圓＝零面積', (() => {
   /* 🔴 第一版就是這樣：月亮整個不見，console 一個錯都沒有，兩顆小星星照常出現
      （所以「有東西畫出來」不代表主體畫出來了）。改成兩個圓 + evenodd 挖洞。 */
   const moon = uris.find(u => u.indexOf('FFC95C') >= 0);
   if (!moon || moon.indexOf("fill-rule='evenodd'") < 0) return false;
   const cs = [...moon.matchAll(/M([\d.]+) ([\d.]+)m-([\d.]+) 0a([\d.]+) /g)]
     .map(m => ({ x: +m[1], y: +m[2], r: +m[4] }));
   if (cs.length !== 2) return false;
   const [a, b] = cs;
   const d = Math.hypot(a.x - b.x, a.y - b.y);
   return d > 0                 // 不同心（同心會變成圓環）
     && d < a.r + b.r           // 有重疊，挖得到東西
     && b.r < d + a.r           // 外圈沒有被整個吃掉
     && b.r + d > a.r;          // 內圈要穿出去，才是彎月不是圓環
   })());
ok('⭐ 頂欄的裝飾要用 px 定位，不可以用百分比', (() => {
   /* ⚠ 頂欄只有 64px 高，比圖還矮——容器比圖矮的時候背景的百分比定位會**反向**
      （58px 的圖放 64px 的框，128% 算出來是 -2.6px）。量過才知道。 */
   const blk = css.slice(css.indexOf('.header::after'), css.indexOf('.header,'));
   const imgLines = blk.split('\n').filter(l => /var\(--hw-(bat|moon|ghost|jack)\)/.test(l));
   return imgLines.length > 0 && imgLines.every(l => !/\d+%/.test(l)); })());

console.log('\n【5】日期判斷只能有一份');
ok('⭐⭐ <head> 裡那份節慶表要跟 data.js 的完全一致（id／區間／檔名都不可以走鐘）', (() => {
   const head = [...html.matchAll(/\{ id: '([^']+)',\s*from: '([\d-]+)',\s*to: '([\d-]+)',\s*css: '([^']+)' \}/g)]
     .map(m => m.slice(1, 5).join('|'));
   const js = W.FESTS.map(f => [f.id, f.from, f.to, f.css].join('|'));
   if (head.join() !== js.join()) console.log('      head:', head, '\n      data.js:', js);
   return head.length === js.length && head.join() === js.join(); })());
ok('⭐ 門口頁與封面都用同一個 window.festNow()，沒有自己再寫一次日期',
   /window\.festNow\(\)/.test(shell) && !/getMonth\(\) === 9/.test(shell));
ok('⭐⭐ 畫面上的節慶字樣不可以寫死', (() => {
   /* 🔴 v489 把「🇹🇼 雙十國慶快樂」「10.10」直接寫在 JSX 裡，換季就得改程式。
      ⚠ 比對前要把註解拿掉，否則「註解裡提到國慶」會自己打到自己（踩過兩次）。 */
   const code = shell.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
                     .replace(/^\s*\/\/.*$/gm, '');
   return !/['"][^'"]*雙十[^'"]*['"]/.test(code) && !/>\s*10\.10\s*</.test(code); })());

console.log('\n【6】閱讀面不可以被換掉（小朋友一次看半小時）');
ok('⭐⭐ v527 起作答面也跟著進夜色了（Alan：「整體都要協調」）——'
 + '但凡是碰到的地方，字色一律要是**亮的**，不可以留下深色的字', (() => {
   /* 這一條從「不准碰作答面」改成「碰了就要碰對」。
      Alan 明確要求整站翻夜色，所以舊的禁令不再成立；真正不能發生的是
      「底翻黑了、字還是深色」＝那一塊整個看不見（.fc-test-choice 就這樣壞過）。
      ⚠ 靜態比對只看得到寫死的顏色；真正的把關是開起來跑對比度掃描。 */
   const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
   const lum = (h) => {
     h = h.replace('#', '');
     if (h.length === 3) h = h.split('').map(c => c + c).join('');
     const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
       .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
     return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
   };
   const dark = [];
   body.split('}').forEach(blk => {
     const sel = (blk.split('{')[0] || '').trim();
     const decl = blk.split('{')[1] || '';
     if (!/fc-|qm-option|qm-question|gr-|cloze-|circle-|ws-|ex-|ta-/.test(sel)) return;
     /* ⚠ ::placeholder 刻意是低強度的灰，不算「深色的字」——
        它的對比在深色輸入框上是 4.5，開起來掃過。 */
     if (/::placeholder/.test(sel)) return;
     (decl.match(/(?<![-a-z])color:\s*(#[0-9A-Fa-f]{3,6})/g) || []).forEach(m => {
       const hx = m.split(':')[1].trim();
       if (lum(hx) < 0.33) dark.push(sel.slice(0, 40) + ' → ' + hx);
     });
   });
   if (dark.length) console.log('      作答面上留著深色的字：', dark.slice(0, 5));
   return dark.length === 0; })());
ok('⭐ 星星維持金色、金色箭頭提醒不動', (() => {
   const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
   return !/\.wh-task-cue|\.stars-btn-ico/.test(body); })());
ok('⭐⭐「之前還有 N 項沒完成」要維持是**警告色**（v526 Alan 要求這一塊也換，'
 + '但只准在琥珀↔南瓜橘這個色相裡挪，不可以換成主題紫）', (() => {
   /* 這一條從「不要碰」改成「碰了但角色不能變」——Alan 明確要求圖1 也要過節，
      而萬聖節本來就是橘色的節日，所以往南瓜橘挪一階兩邊都成立。
      ⚠ 真正不能發生的是它變成紫色／灰色＝看起來跟其他裝飾一樣＝不再是提醒。 */
   const i = css.indexOf('html.fest-hw .tt-past-head {');
   if (i < 0) return false;
   const blk = css.slice(i, css.indexOf('html.fest-hw .tt-group-title'));
   const hues = [...blk.matchAll(/#([0-9A-Fa-f]{6})/g)].map(m => {
     const h = m[1];
     const [r, g, b] = [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16) / 255);
     const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
     if (mx === mn) return -1;
     let hu = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
     hu *= 60; return hu < 0 ? hu + 360 : hu;
   }).filter(x => x >= 0);
   if (hues.length < 3) return false;
   return hues.every(h => h >= 18 && h <= 52);     // 琥珀～南瓜橘
   })());
ok('⚠ 會動的東西只給頂欄，而且要尊重 prefers-reduced-motion', (() => {
   const anim = [...css.matchAll(/animation:\s*hw[A-Za-z]+/g)].length;
   return anim >= 1 && /prefers-reduced-motion[\s\S]{0,160}animation:\s*none/.test(css); })());

console.log('\n【7】該蓋的地方一個都不能少（拿國慶那版當基準——那版是 Alan 連抓三次才補齊的）');
const selOf = (c, pre) => new Set([...c.matchAll(new RegExp('html\\.' + pre + '\\s+([.A-Za-z0-9_:*\\[\\]"=()-]+)', 'g'))]
  .map(m => m[1].split(':')[0]));
ok('⭐⭐ 國慶那版覆寫過的選擇器，萬聖節這版一個都不能漏', (() => {
   const missing = [...selOf(tw, 'fest-1010')].filter(s => !selOf(css, 'fest-hw').has(s));
   if (missing.length) console.log('      漏掉的：', missing);
   return missing.length === 0; })());
ok('⭐⭐ --g-c 要在根層定義一次（全站 112 處深棕都吃它的 fallback，一行換掉）',
   /html\.fest-hw \{ --g-c: #[0-9A-Fa-f]{6}; \}/.test(css));
ok('⭐ .page-lobby 要自己覆寫（它有不透明的暖色底，直接蓋在 body 上面）',
   /html\.fest-hw \.page-lobby \{/.test(css));
ok('⭐ 「進入 →」是實心按鈕，要換 background 不是只換 color',
   /html\.fest-hw \.gs-card-cta \{[\s\S]{0,140}background:/.test(css));
ok('⭐ 頂欄裡本來就白底的按鈕要指名還原，不然白底白字', (() => {
   const i = css.indexOf('.header .week-nav button,');
   return i > 0 && /background:\s*#fff/.test(css.slice(i, i + 420)); })());

console.log(fail ? `\n❌ t-v523：${pass} 過 / ${fail} 失敗` : `\n✅ t-v523：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
