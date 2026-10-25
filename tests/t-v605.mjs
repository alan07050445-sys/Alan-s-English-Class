// t-v605 — Alan 自己出的 Unseen Reading 考卷（文章頁＋選擇題＋問答題＋最後一頁 Answer Key）也能變成模擬考卷
//   實測（真 AI 讀 3 份 PDF）：選擇題與文章都讀得進來，但 ① 問答題「Use evidence from the passage…」因為文章在另一頁被丟掉
//   ② 同一篇文章只接給一大題 ③ 最後一頁解答完全沒用（選擇題答案是模型自己讀文章猜的）④ 偶爾整頁讀成空的
//   不連網路：fetch 用假的，依「這是第幾張圖」回固定的 JSON。
import fs from 'fs';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const PASSAGE = 'Animal Adaptations: Octopuses\n\nA Soft Body with Many Uses\nOctopuses live in oceans around the world. They have eight arms lined with suckers that help them hold objects and catch food. Their soft bodies allow them to squeeze through narrow openings between rocks.\n\nMaking a Quick Escape\nMany octopuses can release a cloud of dark ink into the water. The ink can block a predator view, giving the octopus time to get away. An octopus can also push water out through a siphon.';
const Q = (q, opts, a) => ({ q, options: opts, answer: a });
const MC = [Q('Which heading would help a reader find information about how an octopus escapes?', ['Protecting the Next Generation', 'Disappearing into the Background', 'Making a Quick Escape', 'A Soft Body with Many Uses'], 0),
  Q('Why can an octopus enter narrow spaces between rocks?', ['Its soft body has no bones.', 'Its hard beak changes shape.', 'Its suckers make openings wider.', 'Its skin becomes smooth.'], 3),
  Q('What will most likely happen when an octopus releases ink?', ['The predator will follow the ink.', 'The octopus will become easier to see.', 'The predator may lose sight of the octopus.', 'The octopus will stay nearby.'], 1)];
let page3Calls = 0; const calls = [];
const respond = (pageTag) => {
  if (pageTag === 'P1') return { title: 'G4 CET Unseen Reading Practice', sections: [{ name: 'Animal Adaptations: Octopuses', pct: 0, passage: PASSAGE, parts: [] }] };
  if (pageTag === 'P2') return { sections: [{ name: '', pct: 0, parts: [{ kind: 'quiz', title: 'Part A. Multiple Choice', pts: 0, questions: MC }] }] };
  if (pageTag === 'P3') { page3Calls++; if (page3Calls === 1) return { sections: [] };       // 第一次整頁讀成空的
    return { sections: [{ name: '', pct: 0, parts: [
      { kind: 'evidence', title: 'Part B. Short Answer', question: 'Describe two different adaptations that help octopuses escape from predators. Explain how each works.', need: 2, passage: '' },
      { kind: 'evidence', title: '', question: 'Which two details best support the idea that a mother octopus helps her young survive?', need: 2, passage: '' }] }] }; }
  if (pageTag === 'P4') return { sections: [], answerKey: { mc: [{ n: 1, letter: 'C' }, { n: 2, letter: 'A' }, { n: 3, letter: 'C' }],
    written: [{ n: 4, sample: 'Octopuses can change their skin color to blend in.', others: ['hiding in small spaces', 'pushing water through a siphon'] }, { n: 5, sample: 'A mother guards her eggs.', others: [] }],
    note: 'Accept other accurate answers.' } };
  return { sections: [] };
};
const fakeFetch = async (url, opts) => {
  const body = JSON.parse(opts.body); calls.push(body);
  const img = body.messages[0].content.find(c => c.type === 'image');
  const text = JSON.stringify(respond(img ? img.source.data : ''));
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text }] }) };
};
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', 'fetch', data)(W,
  { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} }, fakeFetch);
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】解答頁清洗（examCleanKey）');
const ck = W.examCleanKey({ mc: [{ n: 1, letter: 'd' }, { n: '2', letter: 'B — text' }, { n: 0, letter: 'A' }, { n: 3, letter: 'Z' }], written: [{ n: 4, sample: ' s ', others: ['x', '', 'y'] }, { n: 5 }], note: ' n ' });
ok('⭐ 字母轉成 0 起算的位置（D→3、B→1），題號要是正整數、字母要在 A~H（不合格的丟掉）', ck.mc.map(x => x.n + ':' + x.idx).join() === '1:3,2:1');
ok('⭐ 問答題：沒有內容的丟掉，「其他可接受」去掉空的', ck.written.length === 1 && ck.written[0].others.join() === 'x,y' && ck.note === 'n');
ok('整份什麼都沒有 → null', W.examCleanKey({}) === null && W.examCleanKey(null) === null && W.examCleanKey({ mc: [{ n: 0, letter: 'Q' }] }) === null);

console.log('\n【2】把解答套回考卷（examApplyKey）');
const mk = () => [{ parts: [{ kind: 'quiz', questions: [Q('a', ['1', '2', '3'], 0), Q('b', ['1', '2', '3'], 0)] }, { kind: 'evidence', question: 'w' }, { kind: 'short', questions: [{ q: 'x', pts: 1 }] }] }];
let secs = mk(); let notes = W.examApplyKey(secs, { mc: [{ n: 1, idx: 2 }, { n: 2, idx: 0 }], written: [{ n: 3, sample: 'S', others: ['o1'] }, { n: 4, sample: 'T', others: [] }], note: 'N' });
ok('⭐⭐ 選擇題答案以解答頁為準，被改掉的會講清楚（模型原本選什麼、現在改成什麼）', secs[0].parts[0].questions[0].answer === 2 && notes.some(n => /第 1 題：照解答頁把答案改成 C（模型讀文章時選的是 A）/.test(n)) && secs[0].parts[0].questions[1].answer === 0);
ok('⭐ 問答題的參考答案進 keyPoints（AI 批改建議本來就會吃），「其他可接受」變成項目', secs[0].parts[1].keyPoints === 'S\n• o1' && secs[0].parts[1].sample === 'S' && secs[0].parts[2].questions[0].keyPoints === 'T');
ok('老師備註跟著放', secs[0].parts[1].teacherNote === 'N');
ok('⭐ 題號對不到（問答題的號碼指到選擇題）→ 不套用並回報，不會亂改', (() => { const s2 = mk(); const n2 = W.examApplyKey(s2, { mc: [{ n: 3, idx: 1 }], written: [{ n: 1, sample: 'X' }] }); return s2[0].parts[0].questions.every(q => q.answer === 0) && !s2[0].parts[0].keyPoints && n2.filter(x => /對不到/.test(x)).length === 2; })());
ok('⭐ 答案超出選項（只有 3 個選項卻說 E）→ 不套用', (() => { const s2 = mk(); const n2 = W.examApplyKey(s2, { mc: [{ n: 1, idx: 4 }], written: [] }); return s2[0].parts[0].questions[0].answer === 0 && n2.some(x => /超出選項/.test(x)); })());
ok('沒有解答 → 什麼都不動', W.examApplyKey(mk(), null).length === 0);

console.log('\n【3】整份流程（假 AI，四張：文章頁／選擇題頁／問答題頁／解答頁）');
const imgs = ['P1', 'P2', 'P3', 'P4'].map(t => ({ media_type: 'image/jpeg', data: t }));
const r = await W.aiReadExamSheet({ images: imgs });
const parts = r.item.sections.flatMap(sc => sc.parts);
const quiz = parts.find(p => p.kind === 'quiz'), evs = parts.filter(p => p.kind === 'evidence');
ok('⭐⭐ 第三頁第一次讀成空的 → 自動再讀一次，問答題沒有消失（實測同一份卷子重跑有時有、有時沒有）', page3Calls === 2 && evs.length === 2 && r.missed.length === 0);
ok('⭐⭐ 問答題（evidence）文章在另一頁也不會被丟掉——文章接回來了', evs.every(e => e.passage && e.passage.includes('Making a Quick Escape')));
ok('⭐⭐ 同一篇文章選擇題與兩個問答題都拿到（以前只接給最像的那一大題）', !!quiz.readText && quiz.readText.includes('A Soft Body') && evs.every(e => e.passage === quiz.readText));
ok('⭐⭐ 選擇題答案照解答頁（C、A、C = 2、0、2），不是模型猜的（假 AI 故意給錯的 0、3、1）', quiz.questions.map(q => q.answer).join() === '2,0,2');
ok('⭐ 問答題帶著參考答案與「其他可接受」', evs[0].keyPoints.startsWith('Octopuses can change their skin color') && /• pushing water through a siphon/.test(evs[0].keyPoints) && evs[1].keyPoints === 'A mother guards her eggs.');
ok('解答頁那一張不算「讀不到」（沒有大題但有解答）', !r.missed.includes('第 4 張'));
ok('⭐ 告訴老師：解答頁套用了幾題、改了哪幾題', r.warnings.some(w => /解答頁已套用（5 題）/.test(w)) && r.warnings.some(w => /第 1 題：照解答頁把答案改成 C/.test(w)));
ok('⭐⭐ 整份沒印配分 → 補預設（選擇題每題 1 分、問答題每題 4 分），而且明講是預設', quiz.pts === 3 && evs.every(e => e.pts === 4) && r.warnings.some(w => /沒有印配分，先用預設/.test(w)));
ok('⭐ 提示詞教它認解答頁，而且要求原樣抄、不自己算', /ANSWER KEY PAGE/.test(data) && /never work answers out yourself/.test(data));

console.log('\n【4】有印配分就絕對不補預設');
const printed = { sections: [{ name: 'S', pct: 0, parts: [{ kind: 'quiz', title: 'Part A (4 pts. each)', pts: 8, questions: MC.slice(0, 2) }] }] };
const f2 = async (url, opts) => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: JSON.stringify(printed) }] }) });
const W2 = {}; new Function('window', 'document', 'firebase', 'localStorage', 'fetch', data)(W2, { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} }, f2);
const r2 = await W2.aiReadExamSheet({ images: [{ media_type: 'image/jpeg', data: 'X' }] });
ok('⭐ 卷子上有印的分數原樣保留，不補、不提示', r2.item.sections[0].parts[0].pts === 8 && !r2.warnings.some(w => /沒有印配分/.test(w)));
console.log(fail ? `\n❌ t-v605：${pass} 過 / ${fail} 失敗` : `\n✅ t-v605：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
