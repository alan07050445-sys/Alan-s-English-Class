// v581：提示依狀態顯示；每一大題可以寫「給 AI 的批改規則」
import fs from 'fs';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const qm = fs.readFileSync(new URL('../components-quiz-mode.jsx', import.meta.url), 'utf8');
const ed = fs.readFileSync(new URL('../components-editor.jsx', import.meta.url), 'utf8');
let fail = 0; const ok = (m, c) => { console.log(c ? '  ✅' : '  ❌', m); if (!c) fail++; };
ok('交卷前寫「交卷後 AI 會先幫你改」，不再寫等老師改', /交卷後 AI 會先幫你改這一題/.test(qm) && !/這一題等老師改，還沒有分數/.test(qm));
ok('AI 改的當下／AI 沒改成／畫圖三種狀態各有說明', /AI 正在改這一題/.test(qm) && /AI 這次沒改成，等老師改/.test(qm) && /畫圖題由老師看圖給分/.test(qm));
ok('編輯器：short／essay／table 有「給 AI 的批改規則」欄', /pt\.aiRule/.test(ed) && /給 AI 的批改規則/.test(ed));
ok('規則會跟著作答存起來並接進 AI 提示詞', (qm.match(/aiRule: String\(pp\.part\.aiRule/g) || []).length >= 3 && /THE TEACHER'S OWN RULE FOR THIS QUESTION/.test(data));
process.exit(fail ? 1 : 0);
