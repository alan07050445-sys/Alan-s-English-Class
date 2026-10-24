// v586：G4 Formative 1——跨頁的「Read the text below」＋兩題手寫、評分標準表、文章掛對題
import fs from 'fs';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
let fail = 0; const ok = (m, c) => { console.log(c ? '  ✅' : '  ❌', m); if (!c) fail++; };
ok('只有標題與文章的 short 不再把標題當成一題（標成 _cont:questions）', /isHeadShort/.test(data) && /_cont: 'questions'/.test(data));
ok('續頁的手寫題併回去，總分照每題配分相加（5＋15＝20）', /const headed = last\._cont === 'questions'/.test(data) && /qp\.every\(v => v > 0\)/.test(data));
ok('評分標準表那一頁（只有 Criteria 表）讀出 rubricMax，套到手寫題上', /printedRubricMax/.test(data) && /pt\.rubricSet = 'basic'; pt\.rubricMax = printedRubricMax/.test(data));
ok('文章掛在「題目跟它共用實詞最多」的那一題，不是第一個遇到的', /const score = \(pt\) =>/.test(data) && /_examContentWords\(txt\)\.filter\(w => srcW\.has\(w\)\)/.test(data));
ok('後面沒等到題目的標題＋文章 → 改當 Section 的文章', /pt\._cont !== 'questions'/.test(data) && /if \(rt && !sc\.passage\) sc\.passage = rt/.test(data));
ok('short 的文章也存成 readText（學生端才看得到）', /\.\.\.\(rtShort \? \{ readText: rtShort \} : \{\}\)/.test(data));
ok('題目在問 the text 卻整個 Section 都沒文章 → 提醒', /在問一篇文章（the text／the author）/.test(data) && /!\(sec\.parts \|\| \[\]\)\.some\(x => String\(x\.readText/.test(data));
ok('v588：Part 5 這類手寫題（作者目的／舉一個細節並解釋）寬鬆規則：有基礎就給分、短答案不扣用心', /naming the purpose[\s\S]{0,200}full-mark answer/.test(data) && /A short answer to a short question is NOT low effort/.test(data) && /6: \['TOP: the basic requirement is met/.test(data));
process.exit(fail ? 1 : 0);
