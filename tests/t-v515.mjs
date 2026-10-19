/* t-v515 — 📄 模擬考卷
 *
 * Alan 給了兩張真的 G4 Formative（Nick 95/100、99/100），要做成互動版。
 *
 * ⭐ 他缺的不是題型——圈 -VCe 字、Word Bank 填空、閱讀選擇題站上本來就有。
 *   缺的是「一份考卷」這個容器：一次做完、分區加權、交卷才給分、一個 100 分。
 *
 * 🔴 這一版自己踩到的坑（實測才發現，不是想出來的）：
 *   連點五個字只留下最後一個、填空填到別格去、選擇題只記得最後一題——
 *   因為我用了「這一輪 render 拿到的值」去算下一個值，同一個 tick 裡的點擊互相蓋掉。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const mis  = fs.readFileSync(new URL('components-mistakes.jsx', ROOT), 'utf8');
const lw   = fs.readFileSync(new URL('line-notify-worker.js', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const paper = { type: 'exam', sections: [
  { name: 'S1', pct: 30, parts: [{ kind: 'circle', pts: 20, need: 5, check: 'vce',
      passage: 'Max made a plan to ride his bike to the lake and found a stone.' }] },
  { name: 'S2', pct: 32, parts: [{ kind: 'cloze', pts: 32, bank: ['a', 'b', 'c', 'd'],
      items: [{ text: 'one ___', answer: 'a' }, { text: 'two ___', answer: 'b' },
              { text: 'three ___', answer: 'c' }, { text: 'four ___', answer: 'd' }] }] },
  { name: 'S3', pct: 38, parts: [
      { kind: 'quiz', pts: 18, questions: [
        { q: 'q1', options: ['x', 'y'], answer: 0 }, { q: 'q2', options: ['x', 'y'], answer: 1 }] },
      { kind: 'short', pts: 20, questions: [{ q: 'why?', pts: 20 }] }] },
]};

console.log('\n【1】配分：老師要能把網站的分數跟紙本對起來');
const T = W.examTotals(paper);
ok('⭐ 自動計分與老師手改分開算', T.auto === 70 && T.manual === 20 && T.total === 90);
ok('   數得出幾個 Section、幾大題', T.sections === 3 && T.parts === 4);
ok('⭐ 加起來不是 100 分要講出來（老師最常犯的）',
   W.examWarnings(paper).some(w => /不是 100 分/.test(w)));

console.log('\n【2】算分');
const r = W.examScore(paper, { '0_0': ['made', 'ride', 'bike', 'lake', 'plan'],
  '1_0': ['a', 'b', 'c', 'WRONG'], '2_0': [0, 0], '2_1': ['隨便寫'] });
ok('⭐⭐ 圈錯要扣回來（不然整篇全部圈起來就滿分）', r.parts[0].right === 3 && r.parts[0].got === 12);
ok('   圈對的標對、圈錯的標錯', (() => {
   const d = r.parts[0].detail;
   return d.filter(x => x.ok === true).length === 4 && d.filter(x => x.ok === false).length === 1; })());
ok('⭐ 填空 3/4 → 24/32', r.parts[1].got === 24);
ok('   填錯的要看得到正解', r.parts[1].detail[3].text === 'd' && r.parts[1].detail[3].ok === false);
ok('⭐ 選擇題 1/2 → 9/18', r.parts[2].got === 9);
ok('⭐⭐ 申論不自動給分（學校是老師拿 rubric 手改的）',
   r.parts[3].auto === false && r.parts[3].got === 0 && r.manualMax === 20);
ok('⭐⭐ 百分比只算自動計分的部分——把老師還沒改的 20 分算成 0，每個孩子看起來都很慘',
   r.auto === 45 && r.autoMax === 70 && r.pct === Math.round(45 / 70 * 100));
ok('   各區分數分開列', r.bySection.length === 3 && r.bySection[2].manual === 20);

console.log('\n【3】出卷時的自我檢查（老師最常犯的三件事）');
ok('⭐⭐ 說要圈 10 個、但短文裡只有 N 個符合 → 學生永遠圈不滿', (() => {
   const bad = { sections: [{ parts: [{ kind: 'circle', pts: 100, need: 10, check: 'vce', passage: 'He saw a stone.' }] }] };
   return W.examWarnings(bad).some(w => /只有 1 個符合/.test(w)); })());
ok('⭐ 填空句子忘了放 ___', (() => {
   const bad = { sections: [{ parts: [{ kind: 'cloze', pts: 100, bank: ['a'], items: [{ text: 'no blank', answer: 'a' }] }] }] };
   return W.examWarnings(bad).some(w => /沒有 ___ 空格/.test(w)); })());
ok('⭐ 答案不在詞庫裡', (() => {
   const bad = { sections: [{ parts: [{ kind: 'cloze', pts: 100, bank: ['a'], items: [{ text: 'x ___', answer: 'zzz' }] }] }] };
   return W.examWarnings(bad).some(w => /不在詞庫裡/.test(w)); })());
ok('   「要圈什麼」程式看不懂也要講', (() => {
   const bad = { sections: [{ parts: [{ kind: 'circle', pts: 100, need: 1, check: 'nonsense', passage: 'x' }] }] };
   return W.examWarnings(bad).some(w => /程式看不懂/.test(w)); })());

console.log('\n【4】編輯器的文字格式（老師可以直接貼、直接改）');
ok('⭐ 選擇題：題目 | 選項… | 正解編號', (() => {
   const g = W.examParsePart('quiz', 'What is it? | a cat | a dog | a cow | 2');
   return g.questions[0].answer === 1 && g.questions[0].options.length === 3; })());
ok('   寫回去還原得回來（來回不掉東西）',
   W.examPartText({ kind: 'quiz', questions: [{ q: 'Q', options: ['a', 'b'], answer: 1 }] }) === 'Q | a | b | 2');
ok('⭐ 正解編號超出範圍的那一行直接丟掉（不要變成答案是 undefined）',
   W.examParsePart('quiz', 'Q | a | b | 9').questions.length === 0);
ok('⭐ 填空：第一行詞庫，之後 句子 | 答案', (() => {
   const g = W.examParsePart('cloze', 'apple, banana\nI ate an ___. | apple');
   return g.bank.length === 2 && g.items[0].answer === 'apple'; })());
ok('⚠ 用「|」分欄不是逗號——康橋的題目裡逗號很多', /一律用「\|」分欄/.test(data));
ok('   圈選：第一行是要圈什麼，其餘是短文', (() => {
   const g = W.examParsePart('circle', 'suffix:-ing\nHe is playing and running.');
   return g.check === 'suffix' && g.checkArg === '-ing' && /playing/.test(g.passage); })());

console.log('\n【5】切字：標點不可以被圈進去（v485 踩過）');
ok('⭐ 字與標點分開', (() => {
   const t = W.examTokens('He saw a stone, and rare white space.');
   return t.filter(x => x.w).map(x => x.t).join() === 'He,saw,a,stone,and,rare,white,space'; })());

console.log('\n【6】🔴 作答一律用函式版更新（實測踩到的坑）');
ok('⭐⭐ put 收得下函式', /const put = \(key, fn\) => setAns\(a => \(\{ \.\.\.a, \[key\]: typeof fn === 'function' \? fn\(a\[key\]\) : fn \}\)\)/.test(qm));
ok('⭐⭐ 圈字用 prev 算，不是用這一輪的 picked', /onClick=\{\(\) => put\(key, prev => \{\s*\n\s*const p = Array\.isArray\(prev\)/.test(qm));
ok('⭐⭐ 選擇題也是', /onClick=\{\(\) => put\(key, prev => \{\s*\n\s*const g = Array\.isArray\(prev\)/.test(qm));
ok('⭐ 填空的「現在在填哪一格」用 ref（點詞庫那顆按鈕拿到的 state 是舊的）',
   /const focusRef = React\.useRef\(null\)/.test(qm) && /const at = focusRef\.current;/.test(qm));
ok('   理由有寫下來（小朋友手快一點就會遇到）', /小朋友手快一點就會遇到/.test(qm));

console.log('\n【7】新題型的註冊清單（v414 的教訓：漏一個就沒星星）');
const reg = [
  ['算是一件可以做的事（getQuizItems）', /item\.type === 'exam'\s+&& \(item\.sections \|\| \[\]\)\.some/.test(qm)],
  ['星星對照表 AUTO_STAR_KIND', /exam: 'pct',/.test(data)],
  ['星星規則說明 AUTO_STAR_RULES', /exam: '自動計分的部分 80 分/.test(data)],
  ['中文名 QM_TYPE_ZH', /exam: '模擬考卷',\n\};/.test(qm)],
  ['圖示 QM_TYPE_ICO', /exam: '📄',/.test(qm)],
  ['排序 QM_TYPE_ORDER', /exam: 9,/.test(qm)],
  ['題數 getQuizItemTotal', /if \(item\.type === 'exam'\) return/.test(qm)],
  ['側欄歸戶 QM_TYPE_WORDS', /模擬考卷\|考卷\|/.test(qm)],
  ['單元列的型別旗標', /const isExam         = item\.type === 'exam';/.test(qm)],
  ['單元列算不算有題目', /isWordSort \|\| isSentOrder \|\| isExam \|\| isEssay/.test(qm)],
  ['單元列徽章', /isExam \? `📄 \$\{\(window\.examTotals/.test(qm)],
  ['學生端掛得上畫面', /selectedItem\?\.type === 'exam' \? \(/.test(qm) && /<ExamPlayer/.test(qm)],
  ['⭐ 考卷沒有 intro（真的考試不會先給你一頁「準備好了嗎」）', /考卷沒有 intro/.test(qm)],
  ['錯題本認得（不要湊成四選一重練）', /'exam'            \/\/ v515/.test(mis)],
  ['編輯器中文名', /exam: '模擬考卷',   \/\/ v515 📄/.test(ed)],
  ['編輯器題型清單', /id: "exam",/.test(ed)],
  ['編輯器有編輯畫面', /form\.type === "exam" \? \(/.test(ed)],
  ['存檔時保留 sections', /'sections', 'examMood', 'examKicker'\]/.test(ed)],
  ['LINE 作業提醒的中文名', /exam: '模擬考卷',   \/\/ v515 📄/.test(lw)],
  ['LINE 提醒的題型排序', /'exam',   \/\/ v515 📄/.test(lw)],
  ['⭐ LINE 的 playableItem（判不一樣＝網站看不到、LINE 一直催）',
   /if \(t === 'exam'\)             return \(\(it\.sections\) \|\| \[\]\)\.some/.test(lw)],
];
reg.forEach(([n, c]) => ok(n, c));
ok(`⭐ 註冊清單 ${reg.filter(r => r[1]).length}/${reg.length} 全到齊`, reg.every(r => r[1]));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
