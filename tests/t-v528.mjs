/* t-v528 — 🧛 吸血鬼吉祥物 ＋ 三處看不見的標題 ＋ 滑鼠特效擴到三頁
 *
 * Alan：「吉祥物幫我一律都改成 Vampire，結合成我的吉祥物風格，改成畫素的感覺」
 *       「圖1 圖2 圖4 標題完全看不到」「滑鼠特效也要加進選年級＋課程頁」
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const fx    = fs.readFileSync(new URL('components-fx.jsx', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const css   = fs.readFileSync(new URL('styles-holiday-hw.css', ROOT), 'utf8');
const fxcss = fs.readFileSync(new URL('styles-fx.css', ROOT), 'utf8');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const fn = (src, mark) => { const a = src.indexOf(mark);
  return a < 0 ? '' : src.slice(a, src.indexOf('\nfunction ', a + 10)); };
const VAMP = fn(fx, 'function VampireMascot(');

console.log('\n【1】🧛 換裝不可以把動畫弄壞');
ok('⭐⭐ 骨架一模一樣：.mx-torso ＋ 兩顆 .mx-eye ＋ 三個 .mx-leg', (() => {
   /* ⚠ 走路／跳／翻滾／打瞌睡那十幾支 CSS 動畫全掛在這些 class 上，
      少一個那隻就會「只有身體在動，腳不動」這種怪事。 */
   return /className="mx-torso"/.test(VAMP)
     && (VAMP.match(/className="mx-eye"/g) || []).length === 2
     && /mx-leg mx-leg-a/.test(VAMP) && /mx-leg mx-leg-b/.test(VAMP) && /mx-leg mx-leg-c/.test(VAMP); })());
ok('⭐ viewBox 跟其他夥伴一致（.mx-svg 的寬高算法是照這個比例來的）',
   /viewBox="0 -4 18 20"/.test(VAMP) && /size \* 10 \/ 9/.test(VAMP));
ok('⭐ 畫素感：shapeRendering="crispEdges"，而且整隻只用 <rect>', (() => {
   return /shapeRendering="crispEdges"/.test(VAMP)
     && !/<(circle|ellipse|path|polygon)/.test(VAMP); })());
ok('⭐⭐ 招牌道具兩個都要帶（打電腦／看書）', (() => {
   /* ⚠ CSS 是 `.act-type .mx-prop-type` 這樣控制顯示的。沒畫＝那隻的
      招牌動作變成空的（咕咕會「看書」但手上沒有書）。 */
   return /mx-prop mx-prop-type/.test(VAMP) && /mx-prop mx-prop-read/.test(VAMP); })());
ok('   帽子與配件照舊掛得上去（MxHat / MxAcc 都在，而且吃該隻的 MX_FIT）',
   /<MxHat id=\{hat\} fit=\{F\}\/>/.test(VAMP) && /layer="back"/.test(VAMP) && /layer="front"/.test(VAMP));
ok('⭐ 格子沒有畫出界（x 0~18、y -4~16）', (() => {
   const bad = [...VAMP.matchAll(/<rect x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)"/g)]
     .filter(m => +m[1] < 0 || +m[1] + +m[3] > 18 || +m[2] < -4 || +m[2] + +m[4] > 16);
   if (bad.length) console.log('      出界的：', bad.map(b => b[0]));
   return bad.length === 0; })());
ok('⭐ 頭比身體大（參考圖是大頭娃娃；第一版頭身各半，看起來是一塊黑磚）', (() => {
   /* 臉那一塊的高度要大於身體＋腳 */
   const face = /<rect x="2" y="4" width="14" height="(\d+)"/.exec(VAMP);
   return face && +face[1] >= 6; })());

console.log('\n【2】🧛 一律變吸血鬼，但看得出是哪一隻');
ok('⭐⭐ 全站只有一個地方決定「畫誰的美術」', (() => {
   /* 大夥伴、裝扮室試穿、商店清單、夥伴圖鑑——四個地方都走 mxArtOf，
      所以掛上去就整組跟著換，而且平常完全不作用。 */
   const uses = (fx.match(/mxArtOf\(/g) || []).length;
   return /function mxArtOf\(/.test(fx) && uses >= 4; })());
ok('⭐⭐ 不可以再有人直接用 pet.art（漏一個，那個地方就不會換）', (() => {
   let body = fx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
   /* ⚠ mxArtOf 自己那一行 `return p.art` 是合法的（沒過節就回原本的），
      要把它自己的函式本體先拿掉再掃，否則會自己打到自己。 */
   const a = body.indexOf('function mxArtOf(');
   if (a > 0) body = body.slice(0, a) + body.slice(body.indexOf('\nfunction ', a + 10));
   const direct = (body.match(/\b(?:pet|p|it)\.art\b/g) || []);
   /* MX_PETS 的定義裡那幾個 `art: XxxMascot` 不算（那是資料本身） */
   if (direct.length) console.log('      還有人直接用：', direct);
   return direct.length === 0; })());
ok('⭐ 沒過節就回原本的美術（這個函式等於不存在）',
   /if \(!\(window\.festIs && window\.festIs\('hw'\)\)\) return p\.art;/.test(fx));
ok('⭐⭐ 每一隻都有自己的披風內裡色（所以五隻都是吸血鬼，但認得出是誰）', (() => {
   const ids = [...fx.matchAll(/^\s*id: '([a-z]+)', speed:/gm)].map(m => m[1]);
   const tone = /const MX_TONE = \{([\s\S]*?)\};/.exec(fx);
   if (!tone || !ids.length) return false;
   const have = [...tone[1].matchAll(/([a-z]+):\s*'#/g)].map(m => m[1]);
   const missing = ids.filter(i => !have.includes(i));
   if (missing.length) console.log('      沒給色調的夥伴：', missing);
   return missing.length === 0; })());
ok('   速度／招牌動作／講的話都沒動（只換長相）', (() => {
   const f = fn(fx, 'function mxArtOf(');
   return !/speed|acts|lines|sig:/.test(f); })());

console.log('\n【3】🖱 滑鼠特效擴到三頁');
ok('⭐ 封面、選年級、大廳都吃得到',
   /FEST_CURSOR_ON = '\.lc-cover, \.grade-selector, \.page-lobby'/.test(shell));
ok('⭐⭐ 不做成 React hook（大廳是 app.jsx 畫的，拿不到同一個 ref）', (() => {
   const b = fn(shell, 'function installFestCursor(');
   return b && !/React\.useEffect/.test(b) && /document\.addEventListener\('pointermove'/.test(b)
     && /try \{ installFestCursor\(\); \} catch/.test(shell); })());
ok('⭐ 圖案放在自己的固定層：不用管那三個容器是不是 relative，也不會被 overflow 裁掉',
   /hw-trail-layer/.test(shell) && /\.hw-trail-layer \{[\s\S]{0,120}position: fixed/.test(css));
ok('   三個必擋的條件還在（沒過節／觸控裝置／reduced-motion）', (() => {
   const b = fn(shell, 'function installFestCursor(');
   return /window\.festOn\(\)/.test(b) && /pointer: fine/.test(b) && /prefers-reduced-motion/.test(b); })());

console.log('\n【4】三處「標題完全看不到」');
ok('⭐⭐ 門口頁的教室卡：整張進夜色，標題才看得到', (() => {
   /* 原本是「白卡放在夜色上」，但它的標題吃 --ink（已經翻亮）→ 白底白字。 */
   const i = css.indexOf('html.fest-hw .gs-card {');
   return i > 0 && /linear-gradient/.test(css.slice(i, css.indexOf('}', i)))
     && /html\.fest-hw \.gs-card-text b \{ color: #F4EFFF/.test(css); })());
ok('⭐⭐ 單元群組「展開後」的標題（收合時看起來是好的，所以很容易漏）', (() => {
   /* 🔴 `.qm-ugroup.open .qm-ugroup-head` 是三個 class，權重比
      `html.fest-hw .qm-ugroup-head`（兩個）大 → 一展開就變回奶油色。 */
   return /html\.fest-hw \.qm-ugroup\.open \.qm-ugroup-head \{/.test(css); })());
ok('⭐⭐ 長按吉祥物的小選單', (() => {
   const i = css.indexOf('html.fest-hw .mx-menu {');
   return i > 0 && /html\.fest-hw \.mx-menu button \{ color: #F4EFFF/.test(css); })());
ok('⚠ 這三個都要先「操作」才看得到——掃描只掃得到畫面上現有的東西',
   /展開/.test(css) && /長按/.test(css));
ok('   原本的確是淺色（確認不是我憑空擔心的）',
   /\.qm-ugroup\.open \.qm-ugroup-head \{ background: #f1e8d2/.test(
     fs.readFileSync(new URL('styles-auth.css', ROOT), 'utf8'))
   && /\.mx-menu \{[\s\S]{0,400}background: #fffdf6/.test(fxcss));

console.log(fail ? `\n❌ t-v528：${pass} 過 / ${fail} 失敗` : `\n✅ t-v528：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
