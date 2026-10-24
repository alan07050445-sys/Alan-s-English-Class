// v575：萬聖節配色——選到的選項要有顏色
import fs from 'fs';
const css = fs.readFileSync(new URL('../styles-holiday-hw.css', import.meta.url), 'utf8');
const jsx = fs.readFileSync(new URL('../components-flashcard.jsx', import.meta.url), 'utf8');
let fail = 0; const ok = (m, c) => { console.log(c ? '  ✅' : '  ❌', m); if (!c) fail++; };
ok('程式按下去的 class 是 selected', /"fc-test-choice" \+ \(selectedId === ch\.id \? " selected"/.test(jsx));
ok('萬聖節有 .fc-test-choice.selected 的橘色選中樣式', /\.fc-test-choice\.selected,[\s\S]{0,120}background: rgba\(245,124,31/.test(css));
ok('單字排序池 selected 也有', /\.ws-word-chip\.pool\.selected \{ background: rgba\(245,124,31/.test(css));
process.exit(fail ? 1 : 0);
