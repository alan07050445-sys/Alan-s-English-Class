// v638：沒有 onOk 的存檔路徑（AI 生成等）雲端沒準備好時先備份；單元卡例句＝主字 80%
import fs from 'fs';
const rd = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const app = rd('app.jsx'), fc = rd('styles-flashcard.css');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
ok('沒有 onOk 的呼叫端雲端沒準備好時備份整份', /if \(!onOk\) \{ try \{ localStorage\.setItem\('alan-unsaved-weeks'/.test(app));
const px = (re) => +(fc.match(re) || [])[1];
ok('預設 .fc-zh 36 / 例句 29（80%）', px(/^\.fc-zh \{ font-size: (\d+)px/m) * 0.8 === px(/^\.fc-example \{ font-size: (\d+)px/m) - 0.2 || Math.round(36 * 0.8) === px(/^\.fc-example \{ font-size: (\d+)px/m));
ok('寬螢幕 50 → 40', /\.fc-zh \{ font-size: 50px[^}]*\}\s*\n\s*\.fc-example \{ font-size: 40px/.test(fc));
ok('手機 30 → 24', /\.fc-zh \{ font-size: 30px; \}\s*\n\s*\.fc-example \{ font-size: 24px/.test(fc));
console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
