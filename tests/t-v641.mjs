// v641：11 吋平板頂欄觸控面積 44、單元列表浮動鈕不蓋返回鈕
import fs from 'fs';
const t = fs.readFileSync(new URL('../styles-tune.css', import.meta.url), 'utf8');
const i = t.indexOf('v641：11 吋平板'); const b = t.slice(i);
let pass = 0, fail = 0; const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
ok('週次箭頭 44×44', /\.week-nav button \{[^}]*width: 44px; height: 44px/.test(b));
ok('年級／全螢幕／登入 最小 44', /\.grade-chip, \.fs-btn, \.signin-btn \{ min-width: 44px; min-height: 44px/.test(b));
ok('有展開鈕時作答標頭讓開', /:has\(\.qm-sidebar-reopen\) \.qm-player-head \{ margin-top: 48px/.test(b));
ok('只在 641~1400 生效', /@media \(min-width: 641px\) and \(max-width: 1400px\)/.test(b));
console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
