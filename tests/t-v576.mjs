// v576：手寫題交卷時由 AI 先改（寬鬆規則）
import fs from 'fs';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const qm = fs.readFileSync(new URL('../components-quiz-mode.jsx', import.meta.url), 'utf8');
const dash = fs.readFileSync(new URL('../components-dashboard.jsx', import.meta.url), 'utf8');
let fail = 0; const ok = (m, c) => { console.log(c ? '  ✅' : '  ❌', m); if (!c) fail++; };
ok('表格題有 AI 規則：找對描述詞＋說得出想像到什麼就給滿分、不要求完美句子', /Each answer is ONE row of a table[\s\S]{0,900}Do not demand a perfect sentence/.test(data));
ok('摘要有 AI 規則：起因經過結果寫到就滿分、只有真的缺／抄／離題才扣', /This is a SUMMARY of the passage[\s\S]{0,700}Go low ONLY when a part is truly missing/.test(data));
ok('一般問答也有寬鬆規則', /Give FULL marks when the answer sensibly answers the question/.test(data));
ok('規則會接進給 AI 的提示詞', /SPECIAL RULE FOR THIS KIND OF ANSWER/.test(data) && /aiHint: set\.aiHint/.test(data));
ok('小錯 3 個扣 1 分的規則沒變（摘要最多扣 1）', /per: 3, cap: \{ summary: 1, default: 2 \}/.test(data));
ok('examAiMarkPart：畫圖不改、AI 引用不到會再問一次、都不行才留給老師', /w\.rubricSet === 'draw'\) return null/.test(data) && /\(await ask\(\)\) \|\| \(await ask\(\)\)/.test(data));
ok('表格答案：引用可以跨兩欄（按順序、每個字都要是孩子寫的）', /const inOrder = /.test(data) && /\/➜\/\.test\(ans\) && inOrder/.test(data));
ok('交卷時 AI 改手寫題，最多等 45 秒，失敗照舊交卷', /window\.examAiMarkPart/.test(qm) && /setTimeout\(\(\) => res\(null\), 45000\)/.test(qm));
ok('AI 的分數存在孩子的作答（aiMarks），學生端老師的優先，並標明是 AI', /written\[k\]\.aiMarks = got\[i\]/.test(qm) && /by = byTeacher \|\| aiMarks\[key\]/.test(qm));
ok('老師端：沒存過就把 AI 先改的帶進批改畫面', /cur\.written\[k\]\.aiMarks/.test(dash));
process.exit(fail ? 1 : 0);
