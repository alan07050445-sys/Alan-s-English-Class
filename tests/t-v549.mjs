// t-v549 — 四件事：小助手範例拿掉／答對跳題快 20%／蝙蝠變身的小點與變高／吸血鬼走路與蝙蝠飛行
//
// 🔴 最大的一件是圖3圖4：點一下吉祥物後，牠下面多出一個白點、整隻被頂高。
//   根因不在 JS：v459 把一段說明插在 `.mx-layer.dragging .mx-body { … }` 的中間，
//   吃掉那條規則，並把下一條的選擇器變成「拖曳中才有的 .mx-handle」
//   → ⋯ 按鈕**平常完全沒有樣式**（position: static），掉進版面多排一格。
//   不是只有蝙蝠——每一隻、每次點牠都會，只是 Alan 在萬聖節才每次都點。
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const R = (f) => fs.readFileSync(new URL(f, ROOT), 'utf8');
const noC = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
const fxcss = R('styles-fx.css'), fxC = noC(fxcss), fxjsx = R('components-fx.jsx'), fxjsxC = noC(fxjsx);
const hw = noC(R('styles-holiday-hw.css')), ed = R('components-editor.jsx'), edC = noC(ed);
const qm = R('components-quiz-mode.jsx'), fc = R('components-flashcard.jsx'), data = R('data.js');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】小助手不要再放建議句');
ok('⭐ 範例按鈕整塊拿掉（⚠ 輸入框的 placeholder 與查詢答案底下的引導句是不同的東西，不算）', (() => {
   const i = edC.indexOf('<div className="ask-hello">'), j = edC.indexOf('</details>', i);
   const hello = edC.slice(i, j);
   return i > 0 && !/ask-eg/.test(hello) && !/<button/.test(hello) && !/setText\(/.test(hello); })());
ok('   招呼語與「我現在會做這 N 件事」（預設收起）還在', /直接說你想做什麼/.test(edC) && /<details className="ask-can">/.test(edC));

console.log('\n【2】答對跳題快 20%（10 分 → 12 分）');
ok('⭐ 倍率只有一份：AUTO_NEXT_SPEED = 1.2，autoNextMs 除以它', /const AUTO_NEXT_SPEED = 1\.2;/.test(data) && W.autoNextMs(1000) === 833);
ok('⭐ 所有測驗（含字義選擇）：760 → 633、3050 → 2542', W.autoNextMs(760) === 633 && W.autoNextMs(3050) === 2542
   && /_qmFast\(760\)/.test(qm) && /_qmFast\(3050\)/.test(qm));
ok('⭐ 單字卡「學習模式」與「測驗模式」兩處都走它', (fc.match(/window\.autoNextMs \? window\.autoNextMs\(1000\) : 1000/g) || []).length === 2);
ok('⚠ 不會快到 0（再快的倍率也有下限，不會連答對的回饋都看不到）', W.autoNextMs(100) >= 200);
ok('⭐ 答錯停在原地等學生按的行為沒被動到', /if \(!correct\) return;/.test(fc));

console.log('\n【3】🔴 蝙蝠的點與變高：⋯ 按鈕要有自己的樣式');
ok('⭐⭐ .mx-handle 是獨立的一條規則，而且是 position: absolute（不在版面裡）', (() => {
   const m = fxC.match(/(^|\})\s*\.mx-handle\s*\{([^}]*)\}/);
   return !!m && /position:\s*absolute/.test(m[2]); })());
ok('⭐⭐ 被吃掉的那條規則補回來了（.mx-layer.dragging .mx-body → grabbing）',
   /\.mx-layer\.dragging \.mx-body\s*\{\s*cursor:\s*grabbing;\s*\}/.test(fxC));
ok('⭐ 不可以有「.mx-layer.dragging .mx-handle」這種錯的選擇器', !/\.mx-layer\.dragging\s*\.mx-handle/.test(fxC));
ok('⭐ 萬聖節那層幫它換了夜色（白底圓鈕在夜色裡像破洞）', /html\.fest-hw \.mx-handle\s*\{[^}]*background:\s*rgba\(61,42,99/.test(hw));

console.log('\n【4】🧛 吸血鬼走路、🦇 蝙蝠飛行');
ok('⭐ 萬聖節時 .mx-body 多掛 is-vamp／is-bat（只在這時候才作用，平常的五隻不受影響）',
   /\(hwOn \? \(bat \? ' is-bat' : ' is-vamp'\) : ''\)/.test(fxjsxC));
ok('⭐ 吸血鬼走路是**自己的**動畫（不再用五隻共用的左右搖晃）',
   /\.is-vamp\.act-walk \.mx-svg\s*\{\s*animation:\s*mxVampStride 1\.05s/.test(fxC)
   && /\.is-vamp\.act-walk \.mx-leg-a/.test(fxC) && /\.is-vamp\.act-walk \.mx-cape/.test(fxC));
ok('⭐ 比原本慢（原本 .34s 一個週期；現在 1.05s＝兩步，一步 .52s）', /mxVampStride 1\.05s/.test(fxC));
ok('⭐ 披風下擺獨立成 .mx-cape，走路時往後飄', /<g className="mx-cape">/.test(fxjsxC) && /@keyframes mxVampCape/.test(fxC));
ok('⭐ 兩隻腳差半個週期（-.525s）', /mx-leg-c \{ animation: mxVampLeg 1\.05s ease-in-out infinite -\.525s/.test(fxC));
ok('⚠ 披風下擺與鞋子要有對比（近黑色在近黑的底上看不見＝走路再怎麼改都沒用）',
   /BOOT = '#5A5470'/.test(fxjsxC) && /<rect x="0" y="15" width="3" height="1" fill=\{tone\}\/>/.test(fxjsxC));
ok('⭐ 蝙蝠翅膀拆成左右兩個 <g>（才能各自從肩膀拍動）', /mx-wing mx-wing-l/.test(fxjsxC) && /mx-wing mx-wing-r/.test(fxjsxC));
ok('⭐ 翅膀有前緣骨架、翼膜、下緣三個尖角（不再是兩塊方塊）', /\[7, 0, 1\], \[7, 2, 1\], \[7, 4, 1\]/.test(fxjsxC) && /const bones =/.test(fxjsxC));
ok('⭐ 停著＝慢拍（懸停），走路＝快拍＋身體離地一上一下（飛）',
   /\.is-bat \.mx-wing-l \{ animation: mxWingL 1\.3s/.test(fxC) && /\.is-bat\.act-walk \.mx-wing-l[^{]*\{ animation: mxFlapL \.32s/.test(fxC)
   && /\.is-bat\.act-walk \.mx-svg \{ animation: mxBatFly \.32s/.test(fxC));
ok('⭐ 蝙蝠腳縮起來（不然會看到兩隻小腳在空中踏步）', /\.is-bat \.mx-leg \{ animation: none !important; \}/.test(fxC));
ok('⭐ transform-origin 用 view-box 座標（v408 小芽長高踩過：SVG 預設 transform-box 就是 view-box）',
   /\.mx-wing, \.mx-cape \{ transform-box: view-box; \}/.test(fxC) && /\.mx-wing-l \{ transform-origin: 5px 8px; \}/.test(fxC));
ok('⭐ 動態減少的人：翅膀與披風也要停', /\.mx-svg, \.mx-eye, \.mx-leg, \.mx-wing, \.mx-cape \{ animation: none !important; \}/.test(fxC));
ok('⭐ 骨架不能破：眼睛 class 還在（會眨）、三個 .mx-leg 還在（其他動畫靠它）', (() => {
   const i = fxjsxC.indexOf('function BatForm('), j = fxjsxC.indexOf('function VampireMascot(');
   const bat = fxjsxC.slice(i, j);
   return (bat.match(/className="mx-eye"/g) || []).length === 2 && /mx-leg mx-leg-a/.test(bat) && /mx-leg mx-leg-c/.test(bat); })());

console.log(fail ? `\n❌ t-v549：${pass} 過 / ${fail} 失敗` : `\n✅ t-v549：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
