// v579：iPad 橫式萬聖節封面／第二頁不再被擠壞
import fs from 'fs';
const css = fs.readFileSync(new URL('../styles-holiday-hw.css', import.meta.url), 'utf8');
let fail = 0; const ok = (m, c) => { console.log(c ? '  ✅' : '  ❌', m); if (!c) fail++; };
const i = css.indexOf('v579：iPad 橫式'); const b = css.slice(i);
ok('只在橫式平板高度（≤900）才縮', /@media \(min-width: 700px\) and \(max-height: 900px\)/.test(b));
ok('封面每個子元素不再被壓扁（扇形才不會蓋到按鈕）', /\.lc-cover > \* \{ flex-shrink: 0; \}/.test(b));
ok('扇形縮小、第二頁 logo／倒數鐘間距縮小', /\.lc-fan \{ transform: scale\(\.72\)/.test(b) && /grade-sel-logo-img/.test(b));
ok('每一條規則都以 html.fest-hw 開頭（只在萬聖節生效）', b.split('\n').filter(l => /^\s+[.a-z]/.test(l) && /\{/.test(l)).every(l => /^\s+html\.fest-hw /.test(l)));
process.exit(fail ? 1 : 0);
