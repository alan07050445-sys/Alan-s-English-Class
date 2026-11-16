// v635 刻度排序 scale-line：解析整張表、範圍判分放寬、各處都有接上
import fs from 'fs';
const qm = fs.readFileSync(new URL('../components-quiz-mode.jsx', import.meta.url), 'utf8');
const ed = fs.readFileSync(new URL('../components-editor.jsx', import.meta.url), 'utf8');
const mk = fs.readFileSync(new URL('../components-mistakes.jsx', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
const grab = (src, start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a); if (a < 0 || b < 0) throw new Error('slice ' + start); return src.slice(a, b); };
const play = new Function(grab(qm, 'const SL_TOL', 'function ScaleLineIntro') + '; return { slWords, slRange, slOk, SL_TOL };')();
const parse = new Function(grab(ed, 'function slParseLine', 'function ScaleLineEditor') + '; return slParseLine;')();

console.log('\n【貼整張表】');
const table = `Always\t總是\t100%
Usually\t通常\t80–90%
Often\t經常\t60–80%
Frequently\t頻繁地\t60–80%
Sometimes\t有時候\t40–50%
Occasionally\t偶爾\t10–30%
Rarely\t很少\t5–10%
Never\t從不\t0%`;
const rows = table.split('\n').map(parse);
ok('八行都解析得出來', rows.every(Boolean) && rows.length === 8);
ok('Always 100~100、總是', rows[0].word === 'Always' && rows[0].zh === '總是' && rows[0].lo === 100 && rows[0].hi === 100);
ok('Usually 80~90', rows[1].lo === 80 && rows[1].hi === 90);
ok('Never 0~0', rows[7].word === 'Never' && rows[7].lo === 0 && rows[7].hi === 0);
const sp = parse('Often 經常 60-80%');
ok('空白＋半形連字號也行', sp && sp.word === 'Often' && sp.zh === '經常' && sp.lo === 60 && sp.hi === 80);
ok('沒有百分比的行不收', parse('Always 總是') === null);

console.log('\n【判分放寬 10%】');
const { slWords, slOk } = play;
const ws = slWords({ scaleWords: rows });
const W = Object.fromEntries(ws.map(w => [w.word, w]));
ok('Often 70 對', slOk(W.Often, 70));
ok('Often 52（超出下緣 8）仍算對', slOk(W.Often, 52));
ok('Often 45 不對', !slOk(W.Often, 45));
ok('Always 92 對、80 不對', slOk(W.Always, 92) && !slOk(W.Always, 80));
ok('Never 8 對、20 不對', slOk(W.Never, 8) && !slOk(W.Never, 20));
ok('lo>hi 自動對調、空字與壞數字被濾掉',
  slWords({ scaleWords: [{ word: 'X', lo: 90, hi: 10 }, { word: '', lo: 1, hi: 2 }, { word: 'Y', lo: 'a', hi: 2 }] }).length === 1);

console.log('\n【各處接線】');
ok('可玩判斷', /item\.type === 'scale-line'\s+&& slWords\(item\)\.length >= 2/.test(qm));
ok('題數', /scale-line'\)\s+return slWords\(item\)\.length/.test(qm));
ok('播放器與簡介都掛上', qm.includes("selectedItem?.type === 'scale-line' && phase === 'quiz'") && qm.includes("selectedItem?.type === 'scale-line' && phase === 'intro'"));
ok('錯題本不做成四選一', mk.includes("'scale-line'"));
ok('編輯器：選項＋表單＋草稿', ed.includes('id: "scale-line"') && ed.includes('<ScaleLineEditor') && ed.includes("'scaleWords'"));
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
