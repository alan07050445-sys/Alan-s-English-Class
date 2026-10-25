// t-v606 — Taiwan Biographies（一份 PDF、三篇文章）→ 三份模擬考卷，以及沒有解答頁時的答案驗算
//   🔴 實測：沒有解答頁時，選擇題答案是讀卷的模型邊讀邊猜的，Yang 那篇第 2 題它選錯了
//   （文章寫 Yang 跑跳強、Johnson 投擲強，它選「Yang 投擲強」）。答案錯的考卷最糟：學生答對還被扣分。
import fs from 'fs';
const R = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const data = R('data.js'), qm = R('components-quiz-mode.jsx'), css = R('styles-quiz-mode.css');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
let solver = null;
const fakeFetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  const text = JSON.stringify(solver ? solver(body) : { answer: 'A' });
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text }] }) };
};
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', 'fetch', data)(W,
  { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} }, fakeFetch);
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】三份卷子（docs/exam-g4-bio-*.json）用網站真正的「貼上整份考卷」載入');
const FILES = [['exam-g4-bio-1-chen.json', 'BDACBD', 4], ['exam-g4-bio-2-yang.json', 'CADBCA', 6], ['exam-g4-bio-3-chi.json', 'DBCADB', 8]];
FILES.forEach(([f, key, nParts]) => {
  const r = W.examPaperFromText(R('docs/' + f));
  const parts = r.item ? r.item.sections.flatMap(s => s.parts) : [];
  ok(`⭐ ${f}：讀得進來、${nParts} 大題、剛好 100 分、沒有任何警告`, !r.error && parts.length === nParts && W.examTotals(r.item).total === 100 && !(r.warnings || []).length && !(r.skipped || []).length);
  ok(`   第一大題的選擇題答案＝${key}（用獨立解題驗過兩次：正序、反序）`, parts[0].questions.map(q => 'ABCD'[q.answer]).join('') === key);
  ok('   文章只放在第一大題（其他大題靠同一個 Section 取用，畫面也不會重複貼）', !!parts[0].readText && parts.slice(1).every(p => !p.readText));
  ok('   問答題都帶參考答案（AI 批改建議會參考）', parts.filter(p => p.kind === 'short').every(p => p.questions.every(q => (q.keyPoints || '').length > 20)));
});
const yang = W.examPaperFromText(R('docs/exam-g4-bio-2-yang.json')).item.sections[0].parts;
ok('⭐⭐ Yang 第 2 題答案是 A（Yang 跑跳強、Johnson 投擲強）——就是讀卷模型猜錯的那一題', yang[0].questions[1].answer === 0 && /compares Yang and Johnson/.test(yang[0].questions[1].q));
ok('⭐ 摘要題用康橋 Summary 評分表；自己出問題用 genq 評分表', yang.some(p => p.rubricSet === 'summary') && W.examPaperFromText(R('docs/exam-g4-bio-1-chen.json')).item.sections[0].parts.some(p => p.rubricSet === 'genq'));
const chi = W.examPaperFromText(R('docs/exam-g4-bio-3-chi.json')).item.sections[0].parts;
ok('⭐ Chi 的事件排順序：照時間先後（高中學攝影 → 政府拍工程 → 離職拍紀錄片 → 電影上映 → 基金會繼續用）', (() => { const ev = chi.find(p => p.kind === 'order').events || []; const keys = ['learning photography', 'construction projects', 'left his government job', 'was released', 'foundation continued']; return ev.length === 5 && keys.every((k, i) => ev[i].includes(k)); })());
ok('⭐ 「作者目的」三題是四選一（Inform／Entertain／Persuade／Express Feelings），答案 Inform、Inform、Persuade', (() => { const q = chi.find(p => /Questions 1–3/.test(p.title)).questions; return q.length === 3 && q.every(x => x.options.join() === 'Inform,Entertain,Persuade,Express Feelings') && q.map(x => x.answer).join() === '0,0,2'; })());

console.log('\n【2】沒有解答頁：選擇題答案獨立驗算（examVerifyQuiz）');
const mkSecs = (ans) => [{ parts: [{ kind: 'quiz', readText: 'Yang was good at running. Johnson was good at throwing.', questions: [
  { q: 'Who threw better?', options: ['Yang', 'Johnson', 'Both', 'Neither'], answer: ans }] }] }];
/* 假的解題者：不管選項怎麼排，都選「文字是 Johnson」那個，回它在當下順序裡的字母 */
const pickByText = (want) => (body) => { const lines = body.messages[0].content.split('\n').filter(l => /^[A-F]\. /.test(l)); const k = lines.findIndex(l => l.slice(3) === want); return { answer: 'ABCDEF'[k] }; };
solver = pickByText('Johnson');
let secs = mkSecs(0), notes = await W.examVerifyQuiz(secs);
ok('⭐⭐ 讀卷時選 A（Yang），獨立解題正序、反序都選 Johnson → 改成 Johnson，而且明講請老師確認', secs[0].parts[0].questions[0].answer === 1 && notes.length === 1 && /讀考卷時選的是 A/.test(notes[0]) && /都選 B/.test(notes[0]) && /請你確認/.test(notes[0]));
secs = mkSecs(1); notes = await W.examVerifyQuiz(secs);
ok('⭐ 一致 → 不動，只說「驗算過、一致」', secs[0].parts[0].questions[0].answer === 1 && notes.length === 1 && /驗算過（1 題），跟讀卷時一致/.test(notes[0]));
let flip = 0; solver = (body) => { const lines = body.messages[0].content.split('\n').filter(l => /^[A-F]\. /.test(l)); return { answer: flip++ % 2 ? 'B' : 'A' }; };
secs = mkSecs(2); notes = await W.examVerifyQuiz(secs);
ok('⭐ 兩次不一致（正序選 X、反序選 Y）→ **不動**，只提醒老師（不拿不確定的東西蓋掉原答案）', secs[0].parts[0].questions[0].answer === 2 && notes.length === 1 && /不太確定/.test(notes[0]));
solver = () => { throw new Error('boom'); };
secs = mkSecs(3); notes = await W.examVerifyQuiz(secs);
ok('⭐ 驗算壞掉 → 跳過，不讓整份卷子讀不出來', secs[0].parts[0].questions[0].answer === 3);
solver = pickByText('Johnson');
secs = mkSecs(0); secs[0].parts[0].questions[0]._keyed = true; await W.examVerifyQuiz(secs);
ok('⭐⭐ 解答頁給的答案（_keyed）不驗算、也不會被改（老師的話最大）；旗標用完拿掉不外洩到存檔', secs[0].parts[0].questions[0].answer === 0 && !('_keyed' in secs[0].parts[0].questions[0]));
secs = [{ parts: [{ kind: 'quiz', questions: [{ q: 'No passage', options: ['a', 'b'], answer: 0 }] }] }];
ok('沒有文章的選擇題（詞彙題之類）不驗算——不花錢、也不亂改', (await W.examVerifyQuiz(secs)).length === 0 && secs[0].parts[0].questions[0].answer === 0);
ok('⭐ 驗算是「獨立」的：只給文章與題目，不給原本的答案', !/answer.*now/.test(data.slice(data.indexOf('async function _examSolveMC'), data.indexOf('async function examVerifyQuiz'))) && /Use ONLY the passage/.test(data));
ok('⭐ 讀考卷的流程真的會呼叫它（寫了沒人用是最常見的坑）', /examApplyKey\(secs, answerKey\)\.concat\(await examVerifyQuiz\(secs\)\)/.test(data));

console.log('\n【3】同一篇文章在一份卷子裡只完整顯示一次');
ok('⭐ ExamPlayer 的每個放文章的地方都走 readBlock（沒有漏的直接 {pt.passage && …}）', !/\{pt\.(readText|passage) && <div className="ex-read/.test(qm) && (qm.match(/readBlock\(pt\.(readText|passage)/g) || []).length === 6);
ok('⭐ 第一次照常顯示，之後同一篇收進「再看一次」（details）；Set 每次 render 重建、依出現順序判斷', /const seenReads = new Set\(\);/.test(qm) && /seenReads\.has\(k\)[\s\S]{0,200}<details className="ex-read-dup">/.test(qm) && /seenReads\.add\(k\)/.test(qm));
ok('只動畫面：AI 批改用的文章（pp.part.readText／passage）沒被動到', /const own = pp\.part\.readText \|\| pp\.part\.passage;/.test(qm));
ok('樣式有寫', /\.ex-read-dup > summary/.test(css));
console.log(fail ? `\n❌ t-v606：${pass} 過 / ${fail} 失敗` : `\n✅ t-v606：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
