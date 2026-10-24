// v583：自己出問題改由 AI 批改（合理、根據文章就給分；小錯 3 個扣 1 分）
import fs from 'fs'; import vm from 'vm';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const qm = fs.readFileSync(new URL('../components-quiz-mode.jsx', import.meta.url), 'utf8');
let fail = 0; const ok = (m, c) => { console.log(c ? '  ✅' : '  ❌', m); if (!c) fail++; };
const sb = {}; sb.window = sb; vm.createContext(sb);
const g = (a, b) => data.slice(data.indexOf(a), data.indexOf(b, data.indexOf(a)));
vm.runInContext(g('const EXAM_RUBRIC = [', 'const AI_RUBRIC_SYS') + '\nthis.pts = examRubricPoints; this.of = examRubricOf;', sb);
const R = sb.of({ rubricSet: 'genq' });
ok('genq 評分：一題一個等第，7／5／3／1／0', R.max === 7 && R.criteria.length === 1 && R.bands.map(b => b.n).join() === '7,5,3,1,0');
ok('7 分等第 ＝ 這題 7 分；5 ＝ 5 分', sb.pts({ story: 7 }, 7, 7, R.criteria, 'genq') === 7 && sb.pts({ story: 5 }, 7, 7, R.criteria, 'genq') === 5);
ok('小錯 3 個扣 1 分：7 分 − 1 ＝ 6', sb.pts({ story: 7, _errN: 3 }, 7, 7, R.criteria, 'genq') === 6 && sb.pts({ story: 7, _errN: 2 }, 7, 7, R.criteria, 'genq') === 7);
ok('genq 不再自動計分、AI 規則寬鬆', /genq:   \{ zh: '自己出問題（AI／老師改）', auto: false \}/.test(data) && /Give 7 whenever it is a real, sensible question/.test(data));
ok('交卷時 genq 會進 AI 批改（written，rubricSet genq）', /pp\.part\.kind === 'genq'/.test(qm) && /rubricMax: 7, rubricSet: 'genq'/.test(qm));
ok('學生端不再用死規則標紅綠，改顯示 AI 的批改', /examMarkBlock\(\{ \.\.\.pt, rubricSet: 'genq', rubricMax: 7 \}/.test(qm));
process.exit(fail ? 1 : 0);
