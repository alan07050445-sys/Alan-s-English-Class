/* t-v529 — 🦇 點一下變蝙蝠／選單只留取名字／預設叫 little Vampire
 *
 * Alan：「吉祥物所有功能都關掉，只留下取名字！預設名字為 little Vampire，
 *        以及跟去讓他睡覺。點他的特效是會變身成 Bat，再點一次變回來，
 *        原本打電腦就改掉。」
 *
 * ⭐ 這一支最重要的一條：**收起來不等於刪掉**。11/01 之後裝扮室、換夥伴、
 *   每一隻自己的招牌動作都要原封不動回來，買過的東西一個都不能掉。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const fx    = fs.readFileSync(new URL('components-fx.jsx', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const css   = fs.readFileSync(new URL('styles-holiday-hw.css', ROOT), 'utf8');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const fn = (src, mark, end) => { const a = src.indexOf(mark);
  return a < 0 ? '' : src.slice(a, end ? src.indexOf(end, a + 10) : src.indexOf('\nfunction ', a + 10)); };
const BAT = fn(fx, 'function BatForm(');
const TAP = fn(fx, 'const onUp = (e) => {', '\n  const ');

console.log('\n【1】🦇 蝙蝠型態');
ok('⭐⭐ 骨架跟其他夥伴一樣（不然變身之後動畫全失效）',
   /className="mx-torso"/.test(BAT)
   && (BAT.match(/className="mx-eye"/g) || []).length === 2
   && /mx-leg-a/.test(BAT) && /mx-leg-b/.test(BAT) && /mx-leg-c/.test(BAT));
ok('⭐ 一樣是畫素（只有 <rect> ＋ crispEdges ＋ 同一個 viewBox）',
   /shapeRendering="crispEdges"/.test(BAT) && /viewBox="0 -4 18 20"/.test(BAT)
   && !/<(circle|ellipse|path|polygon)/.test(BAT));
ok('⭐ 翅膀要比身體寬、而且有鋸齒（不然只是「有耳朵的黑球」）', (() => {
   /* ⚠ v549 把翅膀從「兩塊寫死的方塊」改成資料列 + 鏡射（才能各自拍動）。
      本來數 `y="7" width="1"` 有幾個 → 現在翅膀由 ROWS 產生，要看資料列：
      下緣（y=7）有三個尖角、最寬那幾列涵蓋 x 0~4（比身體 x 5~12 的左右各多出 5 格）。 */
   const rows = [...BAT.matchAll(/\[(\d), (\d), (\d)\]/g)].map(m => ({ y: +m[1], x: +m[2], w: +m[3] }));
   const teeth = rows.filter(r => r.y === 7).length;
   const widest = Math.max(...rows.map(r => r.x + r.w));
   return /mirror \? 17 - x/.test(BAT) && teeth >= 3 && widest >= 5; })());
ok('⚠ 顏色不可以太深（頁面底是 #1E1333，太深就看不出剪影）', (() => {
   const m = /const WING = '#([0-9A-Fa-f]{6})'/.exec(BAT);
   if (!m) return false;
   const l = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
     .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
   return .2126 * l[0] + .7152 * l[1] + .0722 * l[2] > 0.045; })());
ok('   翅膀內側留著那一隻原本的顏色（變身了還認得出是誰）', /fill=\{tone\}/.test(BAT));

console.log('\n【2】點一下＝變身，而且只做變身');
ok('⭐⭐ 萬聖節期間點一下就切換 bat，並且**直接 return**', (() => {
   /* ⚠ 不 return 的話會接著跑下面的招牌動作抽籤 → 一邊變身一邊打電腦，
      兩個動畫疊在一起（v507 修過同一類問題）。 */
   const i = TAP.indexOf('if (hwOn)');
   if (i < 0) return false;
   const blk = TAP.slice(i, TAP.indexOf('}', TAP.indexOf('return;', i)));
   return /setBat\(toBat\)/.test(blk) && /return;/.test(blk); })());
ok('⭐ 變身有過場動作，不是瞬間換圖', /startAct\('twirl'/.test(TAP));
ok('⭐⭐ 變身狀態不寫 localStorage（重新整理要變回吸血鬼）', (() => {
   /* 小朋友哪天忘了自己按過，會以為吉祥物壞掉了。 */
   const i = fx.indexOf('const [bat, setBat]');
   return i > 0 && !/mxSetBat|localStorage/.test(fx.slice(i, i + 400)); })());
ok('⭐ 變身時帽子與配件要收起來（蝙蝠沒有頭頂也沒有脖子）', (() => {
   /* v530 之後整個萬聖節期間都不戴（Alan：「所有額外裝扮都要脫掉」），
      所以條件從 `bat` 變成 `hwOn || bat`——要守的事沒變：變成蝙蝠時不可以還戴著帽子。 */
   const m = /<Art hat=\{([^}]*)\}[\s\S]{0,80}acc=\{([^}]*)\} bat=\{bat\}/.exec(fx);
   return !!m && /bat/.test(m[1]) && /bat/.test(m[2])
     && /'none'/.test(m[1]) && /''/.test(m[2]); })());
ok('⭐⭐ 原本的打電腦拿掉：萬聖節期間自動循環只剩走路', (() => {
   const i = fx.indexOf('const pool = hwOnRef.current');
   return i > 0 && /\['walk'\]/.test(fx.slice(i, i + 160)); })());
ok('⚠ 那個 effect 不會因為節慶重建 → 要用 ref 帶（跟 petRef 同一個理由）',
   /const hwOnRef = useFxR\(hwOn\)/.test(fx));

console.log('\n【3】選單只留取名字與睡覺');
['裝扮室', '換夥伴'].forEach(z => {
  ok(`⭐ ${z} 在萬聖節期間收起來`, new RegExp("\\{!hwOn && [\\s\\S]{0,160}" + z).test(fx));
});
ok('⭐ 表演一個也收起來', /\{!hwOn && myDances\.length > 0 &&/.test(fx));
ok('⭐⭐ 取名字與睡覺**不可以**被收起來（Alan 指名要留）', (() => {
   const menu = fx.slice(fx.indexOf('<div className="mx-menu"'), fx.indexOf('mx-menu-x'));
   /* 這三顆前面都不可以有 !hwOn 的條件 */
   return !/\{!hwOn && [\s\S]{0,200}取名字/.test(menu)
       && !/\{!hwOn && [\s\S]{0,200}休息一下/.test(menu)
       && /休息一下（今天）/.test(menu) && /明天也不要/.test(menu); })());
ok('⭐⭐ 是「收起來」不是「刪掉」——11/01 之後原封不動回來', (() => {
   /* 資料層一個字都不能動：商店、夥伴表、買過的東西都還在。 */
   return /setDress\(true\)/.test(fx) && /setPetPick\(true\)/.test(fx)
       && /const MX_PETS = \[/.test(fx); })());

console.log('\n【4】預設名字 little Vampire');
ok('⭐ 沒取名字時顯示 little Vampire', /const MX_HW_NAME = 'little Vampire';/.test(fx)
   && /\{name \|\| \(hwOn \? MX_HW_NAME : '還沒有名字'\)\}/.test(fx));
ok('⭐⭐ 只是顯示，不可以寫進 localStorage', (() => {
   /* 寫進去＝等於幫他取好名字了：第一次取名的免費額度會被吃掉，
      而且 11/01 之後還會留著一個英文名字。 */
   const i = fx.indexOf("const MX_HW_NAME");
   return !/mxSetName\(MX_HW_NAME\)/.test(fx) && i > 0; })());
ok('   讀螢幕的人也聽得到這個名字', /aria-label=\{`吉祥物 \$\{name \|\| \(hwOn \? MX_HW_NAME : pet\.zh\)\}`\}/.test(fx));

console.log('\n【5】滑鼠特效：密一點＋多一頁');
ok('⭐ 作答頁也加進來了', /\.page-mission/.test(/FEST_CURSOR_ON = '([^']+)'/.exec(shell)[1]));
ok('⭐ 門檻從 46 調到 30（Alan 說「鼠標沒了」，實測有在跑，只是太稀疏）',
   /Math\.hypot\(x - last\[0\], y - last\[1\]\) < 30\) return;/.test(shell));
ok('   圖案也放大一點', /\.hw-trail \{[\s\S]{0,120}width: 30px/.test(css));

console.log('\n【6】門口頁：倒數鐘與教室卡的距離');
ok('⭐ 兩者之間要留得開（Alan 圖1：G4 的按鈕太靠近倒數）',
   /\.grade-selector-inner \.fest-day-wrap \{ margin: 18px 0 30px; \}/.test(css));

console.log(fail ? `\n❌ t-v529：${pass} 過 / ${fail} 失敗` : `\n✅ t-v529：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
