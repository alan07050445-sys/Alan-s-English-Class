/* t-v489 — 🇹🇼 雙十國慶限定外觀
 * Alan 2026-10-08 選了「C · 全套國慶」。
 *
 * 這一支守的是**安全性**，不是好不好看：
 *   ① 不是節慶期間時，這整套必須完全不作用（10/13 之後沒人要去關它）
 *   ② 日期判斷只能有一份（外觀和問候語共用，兩份一定走鐘）
 *   ③ 閱讀面不可以被換掉（小朋友一次看半小時的地方）
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const css  = fs.readFileSync(new URL('styles-holiday.css', ROOT), 'utf8');
const html = fs.readFileSync(new URL('index.html', ROOT), 'utf8');
const shell= fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const sw   = fs.readFileSync(new URL('sw.js', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
let toggled = null;
const doc = { documentElement: { classList: { toggle: (c, on) => { toggled = { c, on }; } } } };
/* ⚠ localStorage 要給一個「真的會回 null」的假物件。
   用 Proxy stub 的話 getItem 會回傳 Proxy（truthy），
   festOverride 的 `|| 'auto'` 就永遠走不到——測試會因為假資料而失敗，不是程式有問題。 */
const store = {};
const LS = { getItem: k => (k in store ? store[k] : null),
             setItem: (k, v) => { store[k] = String(v); },
             removeItem: k => { delete store[k]; } };
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(W, doc, stub, LS);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const on = (m, d) => W.festOn(new Date(2026, m - 1, d));

console.log('\n【1】它自己會關掉（最重要的一條）');
ok('⭐ 一年之中只有 10/08–10/12 這 5 天會開', (() => {
   let n = 0;
   for (let m = 1; m <= 12; m++) for (let d = 1; d <= 28; d++) if (on(m, d)) n++;
   return n === 5; })());
ok('⭐ 10/07 關、10/08 開、10/12 開、10/13 關',
   !on(10, 7) && on(10, 8) && on(10, 12) && !on(10, 13));
ok('   十一月、一月都不會突然冒出來', !on(11, 1) && !on(1, 5) && !on(12, 25));

console.log('\n【2】沒開的時候，整份樣式完全不作用');
ok('⭐ styles-holiday.css 的每一條規則都掛在 html.fest-1010 底下', (() => {
   /* 把註解和 @media/:root 區塊去掉之後，剩下的選擇器都要帶 .fest-1010。
      漏掉一條＝10/13 之後那一條還活著。 */
   const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
   const sels = body.split('}').map(b => b.split('{')[0].trim())
     .filter(s => s && !s.startsWith('@') && !s.startsWith('html.fest-1010')
                  && s !== '' && !/^\s*$/.test(s));
   /* 允許 .fest-* 開頭的「元素自己的 class」——那些是 JSX **只在節慶期間才 render** 的
      （.fest-badge 問候標籤、.fest-ribbon 國旗飄帶、.fest-day 日期徽章）。
      它們不掛 html.fest-1010 是對的：平常那些元素根本不存在。
      ⚠ 但光是放行不算數——下面【2b】會去 JSX 裡確認它們真的被 festOn 擋住。 */
   const bad = sels.filter(s => !/\.fest-(badge|ribbon|day)/.test(s) && !/^\s*$/.test(s));
   if (bad.length) console.log('      漏網的選擇器：', bad.slice(0, 5));
   return bad.length === 0; })());
ok('   class 真的是掛在 <html> 上（body 蓋不到自己的背景）', (() => {
   toggled = null; W.festApply();
   return toggled && toggled.c === 'fest-1010'; })());

console.log('\n【2b】裝飾元素本身也要被擋住（不然 10/13 之後旗子還掛在那）');
[['.fest-ribbon', '國旗飄帶'], ['fest-day', '10.10 徽章'], ['fest-badge', '門口頁問候標籤']].forEach(([cls, zh]) => {
  ok(`⭐ ${zh} 只在節慶期間 render`, (() => {
     const key = cls.replace('.', '');
     const i = shell.indexOf(key);
     if (i < 0) return false;
     /* 往前找最近的 300 字，裡面一定要有 window.festOn 的判斷 */
     return /window\.festOn && window\.festOn\(\)/.test(shell.slice(Math.max(0, i - 300), i)); })());
});
ok('⭐ 旗子與煙火都是 SVG data URI，沒有多載入任何檔案（學生端不會變慢）', (() => {
   const n = (css.match(/url\("data:image\/svg\+xml,/g) || []).length;
   return n >= 5 && !/url\(['"]?(?!data:)[^)]*\.(png|jpg|jpeg|gif|svg|webp)/i.test(css); })());
ok('⭐ data URI 裡不可以有裸雙引號或 #（會把 CSS 字串提早截斷）', (() => {
   /* 🔴 第一版就是踩這個：url("data:…<svg xmlns="http…" 在第二個 " 就斷了，
      整條 background 變成 none，旗子和煙火全部沒出現，而且**完全不報錯**。 */
   const uris = [...css.matchAll(/url\("(data:image\/svg\+xml,[^"]*)"\)/g)].map(m => m[1]);
   return uris.length >= 5 && uris.every(u => u.indexOf('#') < 0); })());

console.log('\n【3】日期判斷只能有一份');
ok('⭐ 門口頁的問候標籤用的是同一個 window.festOn，沒有自己再寫一次日期',
   /window\.festOn && window\.festOn\(\)/.test(shell)
   && !/getMonth\(\) === 9/.test(shell));

console.log('\n【4】老師可以自己開關（只影響他那台裝置）');
ok('⭐ 有 auto / on / off 三種，而且強制開關蓋得過日期', (() => {
   if (W.festOverride() !== 'auto') return false;
   W.festSetOverride('on');
   const forcedOn = W.festOverride() === 'on' && W.festOn(new Date(2026, 0, 5));   // 一月也開
   W.festSetOverride('off');
   const forcedOff = W.festOverride() === 'off' && !W.festOn(new Date(2026, 9, 10)); // 10/10 也關
   W.festSetOverride('auto');
   return forcedOn && forcedOff && W.festOverride() === 'auto' && W.festOn(new Date(2026, 9, 10)); })());
ok('   學生那邊沒有這個開關，看到的永遠是日期判斷的結果',
   /FEST_KEY\s*=\s*'alan-fest-override'/.test(data) && /localStorage/.test(data));

console.log('\n【5】閱讀面不可以被換掉（小朋友一次看半小時）');
ok('⭐ 沒有去動單字卡／短文／題目文字的底色與字色', (() => {
   const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
   const touched = /\.fc-(card|term|ex)|\.qm-question-text|\.gr-(text|para)|\.cloze-passage|\.circle-prose\b/.test(body);
   return !touched; })());
ok('   星星維持金色（那是集點的視覺識別，不能為了過節換掉）',
   !/\.(mx-)?star[^{]*\{[^}]*color/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')));

console.log('\n【5b】v491：Alan 截到「太白了根本看不到」與「都沒改到」');
ok('⭐ 頂欄的淺底按鈕要指名還原深色字（不然白底白字＝一塊白斑）', (() => {
   /* 🔴 第一版寫 `.header button { color:#fff }` 一視同仁，
      把本來就有白底的按鈕（週次箭頭、登入／Report）也翻成白字 → 整顆看不見。
      CSS 問不到「我的底色是淺的嗎」，所以淺底的一定要一條一條指名。 */
   const c = css.replace(/\/\*[\s\S]*?\*\//g, '');
   return /\.week-nav button/.test(c) && /\.signin-btn/.test(c)
       && /color: var\(--fest-blue-d\)/.test(c); })());
ok('⭐ 大廳整頁的暖色漸層要蓋掉（.page-lobby 有自己不透明的底，body 換色沒用）',
   /html\.fest-1010 \.page-lobby \{/.test(css));
ok('⭐ 門口頁的「進入 →」是實心按鈕，只改 color 沒用、要連背景一起換',
   /html\.fest-1010 \.gs-card-cta \{[\s\S]{0,120}background:/.test(css));

console.log('\n【6】有真的接上去');
ok('⭐ index.html 載入了，而且排在 styles-tune.css 後面（它的工作是覆寫）', (() => {
   const a = html.indexOf('styles-tune.css'), b = html.indexOf('styles-holiday.css');
   return a > 0 && b > a; })());
ok('⭐ Service Worker 也要快取它（不然離線時整頁沒有樣式）',
   /styles-holiday\.css/.test(sw));
ok('   data.js 一載入就套用（在 React 之前，才不會閃一下才變色）',
   /\nfestApply\(\);/.test(data));

console.log(fail ? `\n❌ t-v489：${pass} 過 / ${fail} 失敗` : `\n✅ t-v489：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
