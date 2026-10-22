// t-v551 — 首頁（封面）的萬聖節滑鼠特效看不見
//
// 🔴 圖案「有生出來、但被封面蓋在下面」：封面 .lc-cover 是 position:fixed、z-index:300 的整頁蓋板，
//   圖案層只有 z-index:4。第二、三頁是一般版面所以看得到——所以 Alan 說「第二頁第三頁有，首頁沒有」。
// 🔴 v528／v529 我是用「數 DOM 節點」驗證的（生出 8 個），回報「有在跑」，其實肉眼看不見。
//    ⭐ 驗證特效要問「那個位置**最上面**的元素是誰」，不是「有沒有生出來」。
//
// ⚠ 不能把整層一起抬高：閱讀／單字卡的全螢幕層同樣 z-index:300，抬高會讓蝙蝠飛到小朋友正在讀的內容上。
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const R = (f) => fs.readFileSync(new URL(f, ROOT), 'utf8');
const noC = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
const hw = noC(R('styles-holiday-hw.css')), auth = noC(R('styles-auth.css')), fcard = noC(R('styles-flashcard.css'));
const shell = noC(R('components-shell.jsx'));
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const zOf = (css, sel) => { const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')); const z = m && /z-index:\s*(\d+)/.exec(m[1]); return z ? +z[1] : null; };

const cover = zOf(auth, '.login-screen');
const top = zOf(hw, '.hw-trail-layer.hw-trail-top');
const base = zOf(hw, '.hw-trail-layer');
ok('⭐⭐ 封面專用的圖案層比封面（z-index ' + cover + '）高', top != null && cover != null && top > cover);
ok('⭐⭐ 一般的圖案層**不可以**高過全螢幕閱讀／單字卡（300）——不然蝙蝠會飛到小朋友正在讀的內容上',
   base != null && base < 300);
ok('⭐ 封面的圖案放進高的那一層、其他頁放進一般那一層', /\(t\.closest\('\.lc-cover'\) \? hostTop : host\)\.appendChild\(sp\)/.test(shell));
ok('⭐ 兩層都有建（高的那一層也要 pointer-events:none，不然踩到自己留下的圖案登入鈕按不到）',
   /hostTop\.className = 'hw-trail-layer hw-trail-top'/.test(shell) && /\.hw-trail-layer \{[^}]*pointer-events:\s*none/.test(hw));
ok('⭐ 換頁時兩層的圖案都清掉', /querySelectorAll\('\.hw-trail-layer \.hw-trail'\)/.test(shell));
ok('   這個 300 是真的（改了封面層級這支測試要重新判斷）', cover === 300 && /z-index:\s*300/.test(fcard));
console.log(fail ? `\n❌ t-v551：${pass} 過 / ${fail} 失敗` : `\n✅ t-v551：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
