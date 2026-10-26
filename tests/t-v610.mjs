// v610 交卷後只重做答錯的選擇題
import fs from 'fs';
const qm = fs.readFileSync(new URL('../components-quiz-mode.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles-quiz-mode.css', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
ok('有重做狀態，且與交卷用的 ans 分開（不會動到成績）', /const \[redo, setRedo\]/.test(qm) && /const \[redoAns, setRedoAns\]/.test(qm));
ok('重做時答對的題目不顯示', /if \(redo && sent && d\.ok\) return null/.test(qm));
ok('重做的點選只寫 redoAns，不呼叫 put／saveQuizModeCompletion', (() => { const i = qm.indexOf('if (redo && sent) return ('); const seg = qm.slice(i, i + 1400); return /setRedoAns/.test(seg) && !/put\(key/.test(seg) && !/saveQuizModeCompletion/.test(seg); })());
ok('答對才揭曉解析（答錯讓他再試）', /rPick === q\.answer && q\.explain/.test(qm));
ok('題號保留原本的（value={i + 1}）', /<li key=\{i\} value=\{i \+ 1\}/.test(qm));
ok('成績單有按鈕，沒答錯就不出現', /if \(!nWrong\) return null/.test(qm) && /只重做答錯的/.test(qm));
ok('按鈕樣式走變數', /\.ex-redo button[^}]*var\(--ink/.test(css));
console.log(fail ? `\n❌ t-v610：${pass} 過 / ${fail} 失敗` : `\n✅ t-v610：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
