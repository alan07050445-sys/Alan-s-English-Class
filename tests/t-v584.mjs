// v584：讀考卷時同一個 Section 不要重複／留空殼
import fs from 'fs';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const qm = fs.readFileSync(new URL('../components-quiz-mode.jsx', import.meta.url), 'utf8');
let fail = 0; const ok = (m, c) => { console.log(c ? '  ✅' : '  ❌', m); if (!c) fail++; };
ok('Section 有編號就用編號當身分（"Section 2: Vocabulary (32%)" 與 "Section 2: Vocabulary" 是同一個）', /const num = \/\^\\s\*section\\s\*\(\\d\+\)\/i\.exec\(sc\.name\)/.test(data) && /'section' \+ num\[1\]/.test(data));
ok('沒有編號時把括號裡的百分比拿掉再比', data.includes("replace(/\\([^)]*\\)/g, '')"));
ok('讀完把沒有任何大題的 Section 拿掉', /if \(!secs\[i\]\.parts\.length\) secs\.splice\(i, 1\)/.test(data));
ok('學生端：沒有大題的 Section 不畫標題（舊卷子也適用）', /!\(sec\.parts \|\| \[\]\)\.length \? null/.test(qm));
ok('名字已寫 (32%) 就不再顯示第二個百分比', /replace\(sec\.pct \?/.test(qm));
process.exit(fail ? 1 : 0);
