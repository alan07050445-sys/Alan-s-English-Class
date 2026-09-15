/* t-resume — v442 續做（做到一半離開再回來）
 * Alan 的學生回報：「答錯直接跳出去，再回來按繼續上一題，就會是剛剛錯的那一題」
 * ＝ 可以先去查答案再回來作答。聽寫則是整個不給續做。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const qm = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const slice = (a, b) => { const i = qm.indexOf(a), j = qm.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return qm.slice(i, j); };

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e) : '')));

log.push('\n【1】選擇題：一作答就記「下一題」');
{
  const p = slice('function QuizModePlayer(', 'function WritingPracticePlayer(');
  ok('⭐ 有 saveAfterAnswer，而且存的是 deckPos + 1', /const saveAfterAnswer = \(nextDeck, nextFirstRight, nextWrongList\)/.test(p) && /deckPos: deckPos \+ 1/.test(p));
  ok('答對、答錯兩條路都存', (p.match(/saveAfterAnswer\(/g) || []).length === 2);
  ok('⭐ 答錯那條存的是「已經插入補考題」的新牌堆（不然回來牌堆會不一樣）',
     /const nextDeck = \[\.\.\.deck\];[\s\S]{0,220}saveAfterAnswer\(nextDeck, firstRight, nextWrongList\)/.test(p));
  ok('最後一題不存（沒有下一題）', /if \(isLast\) return;[\s\S]{0,200}saveResume\(progressKey/.test(p));
  ok('原本「換題才存」的那一段還在（中途直接關掉也還原得回來）', /每前進一題就把進度存起來/.test(p));
}

log.push('\n【2】打字題（填空／改寫／中翻英）：同一個漏洞也補起來');
{
  const p = slice('function TypeAnswerPlayer(', 'function ShortAnswerPlayer(');
  ok('⭐ check() 一作答就存下一題', /setResult\(correct \? 'correct' : 'wrong'\);[\s\S]{0,320}deckPos: idx \+ 1/.test(p));
  ok('分數也一起存（答對要算進去）', /score: score \+ \(correct \? 1 : 0\)/.test(p));
}

log.push('\n【3】聽寫：整個不給續做（Alan 指定）');
{
  const p = slice('function SpellingPlayer(', 'function TypeAnswerIntro(');
  ok('⭐ 不再接續上次的進度', /const rz = null;/.test(p) && !/getResume\(progressKey/.test(p));
  ok('⭐ 換題時不存續做，而且把舊紀錄清掉', /clearResume\(progressKey\);\n      setIdx/.test(p) && !/saveResume\(progressKey/.test(p));
  ok('進來時也清一次（升版前存的不會被接回來）', /React\.useEffect\(\(\) => \{ clearResume\(progressKey\); \}, \[item\.id\]\)/.test(p));
  ok('⭐ 開始畫面不再出現「繼續上一次」', /resumeAt=\{null\}[\s\S]{0,80}onRestart=\{null\}/.test(qm));
  ok('做完照樣清紀錄（本來就有）', /clearResume\(progressKey\); \/\/ v265: 做完/.test(qm));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
