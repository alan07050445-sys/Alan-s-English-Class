// v641：11 吋平板頂欄觸控面積 44、單元列表浮動鈕不蓋返回鈕
import fs from 'fs';
const t = fs.readFileSync(new URL('../styles-tune.css', import.meta.url), 'utf8');
const i = t.indexOf('v641：11 吋平板'); const b = t.slice(i);
let pass = 0, fail = 0; const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
ok('週次箭頭 44×44', /\.week-nav button \{[^}]*width: 44px; height: 44px/.test(b));
ok('年級／全螢幕／登入 最小 44', /\.grade-chip, \.fs-btn, \.signin-btn \{ min-width: 44px; min-height: 44px/.test(b));
ok('有展開鈕時作答標頭讓開', /:has\(\.qm-sidebar-reopen\) \.qm-player-head \{ margin-top: 48px/.test(b));
ok('只在 641~1400 生效', /@media \(min-width: 641px\) and \(max-width: 1400px\)/.test(b));
const j = t.slice(t.indexOf('v642：平板橫式配對'));
ok('配對連線橫式緊湊規則', /min-height: 44px; padding: 4px 4px/.test(j) && /@media \(min-width: 761px\) and \(max-width: 1400px\) and \(max-height: 900px\)/.test(j));
ok('門口頁小連結 16px／44px', /\.grade-selector \.gs-switch, \.gs-links > \.gs-switch \{\s*font-size: 16px; padding: 12px 18px; min-height: 44px/.test(j));
const k = t.slice(t.indexOf('v643：平板橫式其他題型'));
ok('教學按鈕列釘底、圖縮 190', /\.ls-foot \{\s*position: sticky; bottom: 0/.test(k) && /\.gnl-img \{ max-height: 190px/.test(k));
ok('短文填空詞庫釘頂、填空格加大', /\.cloze-bank \{ position: sticky; top: 0/.test(k) && /\.cloze-input \{ width: 110px; font-size: 18px; min-height: 36px/.test(k));
ok('聽寫換聲音鈕 44px', /\.sp-voice-alt \{ font-size: 15px; padding: 10px 16px; min-height: 44px/.test(k));
console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
