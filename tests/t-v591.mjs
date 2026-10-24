// t-v591 — 搬單題到別的單元（qmoveApply）＋跨週挑單元組成新的一份（composeApply）
// ⭐ 不照程式長相寫：全部用真的資料跑 data.js 的函式，檢查結果。
import fs from 'fs';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(W,
  { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} });
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const Q = (id, t) => ({ id, q: t, options: ['a', 'b'], answer: 0 });
const mk = () => ({
  w1: { label: 'W1', items: { vocab: [
    { id: 'u1', type: 'quiz', title: 'U1', group: 'G', questions: [Q('q1', 'one'), Q('q2', 'two'), Q('q3', 'three')] },
    { id: 'fc', type: 'flashcard', title: 'FC', cards: [{ front: 'a', back: 'b' }] },
    { id: 'wp', type: 'writing-practice', title: 'WP', linkedFlashcardId: 'fc' },
    { id: 'ta1', type: 'type-answer', variant: 'fill', title: 'TA', pairs: [{ id: 'p1', prompt: 'x', answer: 'y' }] },
    { id: 'ta2', type: 'type-answer', variant: 'rewrite', title: 'TB', pairs: [{ id: 'p9', prompt: 'x', answer: 'y' }] },
  ], grammar: [
    { id: 'ls', type: 'lesson', title: 'LS', steps: [] },
    { id: 'pr', type: 'quiz', title: 'PR', requires: 'ls', questions: [Q('q1', 'dup id')] },
  ] }, homework: { u1: { dueDate: '2026-11-01' } } },
  w2: { label: 'W2', items: { vocab: [{ id: 'u2', type: 'quiz', title: 'U2', questions: [Q('q1', 'already here')] }], grammar: [] } },
  w3: { label: 'W3', items: { vocab: [], grammar: [] } },
});
const snap = x => JSON.stringify(x);

console.log('\n【1】搬單題（qmoveApply）');
let base = mk(), before = snap(base);
let r = W.qmoveApply(base, { src: { weekId: 'w1', itemId: 'u1' }, dst: { weekId: 'w2', itemId: 'u2' }, idx: [0, 2] });
ok('⭐ 搬兩題：目的地 1→3 題、來源 3→1 題', r.ok && r.weeks.w2.items.vocab[0].questions.length === 3 && r.weeks.w1.items.vocab[0].questions.length === 1);
ok('⭐ 來源留下的是沒被選的那一題（q2）', r.weeks.w1.items.vocab[0].questions[0].q === 'two');
ok('⭐⭐ id 撞到要換新的（目的地原本就有 q1）', new Set(r.weeks.w2.items.vocab[0].questions.map(q => q.id)).size === 3);
ok('⭐ 不改到傳進來的資料（深拷貝）', snap(base) === before);
ok('⭐ 搬過去的是複本：改目的地不影響來源', (() => { r.weeks.w2.items.vocab[0].questions[1].q = 'CHANGED'; return r.weeks.w1.items.vocab[0].questions[0].q === 'two'; })());
r = W.qmoveApply(mk(), { src: { weekId: 'w1', itemId: 'u1' }, dst: { weekId: 'w2', itemId: 'u2' }, idx: [1], copy: true });
ok('⭐ 複製：來源不變（3 題），目的地 +1', r.ok && r.weeks.w1.items.vocab[0].questions.length === 3 && r.weeks.w2.items.vocab[0].questions.length === 2);
r = W.qmoveApply(mk(), { src: { weekId: 'w1', itemId: 'u1' }, dst: { weekId: 'w2', itemId: 'u2' }, idx: [0, 1, 2] });
ok('⭐⭐ 會把來源搬空→先擋下來並講明（unplayable），不是安靜做完', !r.ok && r.error === 'unplayable' && r.need === 1 && r.left === 0);
r = W.qmoveApply(mk(), { src: { weekId: 'w1', itemId: 'u1' }, dst: { weekId: 'w2', itemId: 'u2' }, idx: [0, 1, 2], force: true });
ok('   老師確認後（force）才真的搬空', r.ok && r.weeks.w1.items.vocab[0].questions.length === 0);
r = W.qmoveApply(mk(), { src: { weekId: 'w1', itemId: 'ta1' }, dst: { weekId: 'w1', itemId: 'ta2' }, idx: [0] });
ok('⭐ 填空 → 改寫（同為 type-answer 但 variant 不同）不給搬', !r.ok && r.error === 'type');
r = W.qmoveApply(mk(), { src: { weekId: 'w1', itemId: 'u1' }, dst: { weekId: 'w1', itemId: 'fc' }, idx: [0] });
ok('⭐ 測驗 → 單字卡不給搬', !r.ok && r.error === 'type');
r = W.qmoveApply(mk(), { src: { weekId: 'w1', itemId: 'u1' }, dst: { weekId: 'w1', itemId: 'u1' }, idx: [0] });
ok('⭐ 搬給自己不做', !r.ok && r.error === 'same');
r = W.qmoveApply(mk(), { src: { weekId: 'w1', itemId: 'u1' }, dst: { weekId: 'w2', itemId: 'u2' }, idx: [] });
ok('   沒勾題目＝empty；位置超出範圍的忽略', !r.ok && r.error === 'empty' && !W.qmoveApply(mk(), { src: { weekId: 'w1', itemId: 'u1' }, dst: { weekId: 'w2', itemId: 'u2' }, idx: [99] }).ok);
const fb = () => ({ w: { items: { v: [
  { id: 'a', type: 'fillblank', questions: [{ id: '1', sentence: 'A ___', answer: 'a' }, { id: '2', sentence: 'B ___', answer: 'b' }, { id: '3', sentence: 'C ___', answer: 'c' }] },
  { id: 'b', type: 'fillblank', questions: [{ id: '9', sentence: 'Z ___', answer: 'z' }, { id: '8', sentence: 'Y ___', answer: 'y' }] }] } } });
r = W.qmoveApply(fb(), { src: { weekId: 'w', itemId: 'a' }, dst: { weekId: 'w', itemId: 'b' }, idx: [0, 1] });
ok('⭐ 填空題要 ≥2 題才玩得了：3 題搬走 2 題 → 擋下（need 2）', !r.ok && r.error === 'unplayable' && r.need === 2 && r.left === 1);
ok('   每種題型的欄位都有對照（10 種）', Object.keys(W.QMOVE_LISTS).length === 10);
ok('   一行文字：quiz / 填空 / 配對 / 排序 都讀得到', W.qmoveLabel({ q: ' hi  there ' }) === 'hi there' && W.qmoveLabel({ sentence: 'S ___' }) === 'S ___'
  && W.qmoveLabel({ word: 'cat', def: 'a pet' }) === 'cat = a pet' && W.qmoveLabel({ words: ['I', 'am'] }) === 'I am' && W.qmoveLabel({}) === '（空白）');

console.log('\n【2】跨週挑單元（composeApply）');
base = mk(); before = snap(base);
r = W.composeApply(base, { picks: [{ weekId: 'w1', itemId: 'u1' }], target: 'w3' });
ok('⭐ 複製一個單元到另一週；來源照樣留著', r.ok && r.copied === 1 && r.weeks.w3.items.vocab.length === 1 && r.weeks.w1.items.vocab.length === 5);
ok('⭐ 不改傳進來的資料', snap(base) === before);
r = W.composeApply(mk(), { picks: [{ weekId: 'w1', itemId: 'wp' }], target: 'w3' });
ok('⭐⭐ 勾「對應單字卡」的練習 → 單字卡自動一起帶（不然指向不存在的卡）', r.ok && r.copied === 2 && r.auto === 1 && r.weeks.w3.items.vocab.length === 2);
const nw = r.weeks.w3.items.vocab;
ok('⭐ 帶過去後 linkedFlashcardId 指向新的那張卡', nw.find(x => x.type === 'writing-practice').linkedFlashcardId === nw.find(x => x.type === 'flashcard').id);
r = W.composeApply(mk(), { picks: [{ weekId: 'w1', itemId: 'pr' }], target: 'w3' });
ok('⭐⭐ 勾被「教學卡鎖住」的練習 → 教學卡也跟著來，而且鎖指到新卡', r.ok && r.copied === 2 && (() => {
  const all = Object.values(r.weeks.w3.items).flat();
  const lesson = all.find(x => x.type === 'lesson'), prac = all.find(x => x.title === 'PR');
  return prac.requires === lesson.id; })());
r = W.composeApply(mk(), { picks: [{ weekId: 'w1', itemId: 'u1' }, { weekId: 'w2', itemId: 'u2' }], target: 'w3' });
ok('⭐ 兩個不同週的單元 id 都是 q1 沒關係，單元 id 不會撞：不同 id 都保留', r.ok && r.copied === 2);
r = W.composeApply(mk(), { picks: [{ weekId: 'w1', itemId: 'u1' }], target: 'w2' });
const clash = mk(); clash.w3.items.vocab.push({ id: 'u1', type: 'quiz', title: 'old', questions: [Q('a', 'a')] });
r = W.composeApply(clash, { picks: [{ weekId: 'w1', itemId: 'u1' }], target: 'w3' });
ok('⭐⭐ 目標週已經有同 id → 換新 id，原本那個完全不動（進度不會互蓋）', r.ok && r.weeks.w3.items.vocab.length === 2
  && r.weeks.w3.items.vocab[0].title === 'old' && r.weeks.w3.items.vocab[1].id !== 'u1');
r = W.composeApply(mk(), { picks: [{ weekId: 'w1', itemId: 'u1' }], target: 'w3', group: '期中複習', dueDate: '2026-12-01' });
const cp = r.weeks.w3.items.vocab[0];
ok('⭐ 填了組名 → 單元歸進那一組；填了日期 → 同時設成作業', cp.group === '期中複習' && r.weeks.w3.homework[cp.id].dueDate === '2026-12-01');
r = W.composeApply(mk(), { picks: [{ weekId: 'w1', itemId: 'u1' }], target: 'w3' });
ok('   沒填組名就保留原本的組；沒填日期不設作業', r.weeks.w3.items.vocab[0].group === 'G' && !r.weeks.w3.homework);
r = W.composeApply(mk(), { picks: [{ weekId: 'w1', itemId: 'u1' }], target: 'nope' });
ok('   目標週不存在／沒挑東西 → 回報錯誤，不動資料', !r.ok && r.error === 'notarget' && !W.composeApply(mk(), { picks: [], target: 'w3' }).ok);
const dang = mk(); dang.w1.items.vocab.push({ id: 'zz', type: 'quiz', title: 'ZZ', requires: 'gone', questions: [Q('a', 'a')] });
r = W.composeApply(dang, { picks: [{ weekId: 'w1', itemId: 'zz' }], target: 'w3' });
ok('⭐ 原本就指向不存在的單元 → 拿掉那個鎖（不然學生被鎖死），並回報 dropped', r.ok && !r.weeks.w3.items.vocab[0].requires && r.dropped === 1);
ok('⭐ 缺的分類自動補（目標週沒有 grammar 陣列也能放）', (() => { const m = mk(); delete m.w3.items.grammar; return W.composeApply(m, { picks: [{ weekId: 'w1', itemId: 'ls' }], target: 'w3' }).weeks.w3.items.grammar.length === 1; })());

console.log('\n【3】新一週的 id');
ok('尾巴數字 +1、保留位數', W.composeNextWeekId(['g4-2026F-W19', 'g4-2026F-W20']) === 'g4-2026F-W21' && W.composeNextWeekId(['a-01', 'a-09']) === 'a-10');
ok('撞到就一直往後', W.composeNextWeekId(['x-W06', 'x-W05']) === 'x-W07');
ok('沒有數字結尾就加 -2；空陣列也有值', W.composeNextWeekId(['alpha']) === 'alpha-2' && !!W.composeNextWeekId([]));

console.log('\n【4】接線（寫了沒人讀是這個專案最常見的坑：v531 __dashGoto）');
const R = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const app = R('app.jsx'), qm = R('components-quiz-mode.jsx'), shell = R('components-shell.jsx'), ed = R('components-editor.jsx');
const sig = qm.match(/function QuizModeCategoryView\(\{([^}]*)\}\)/)[1];
ok('⭐ 單元列的「↔」按鈕要的 onMoveQuestions，QuizModeCategoryView 真的有收這個 prop', /\bonMoveQuestions\b/.test(sig) && /onMoveQuestions\(item\)/.test(qm));
ok('⭐ app 有把 onMoveQuestions 傳進去，而且打開的是 QuestionMoveModal', /onMoveQuestions=\{/.test(app) && /<window\.QuestionMoveModal/.test(app) && /onApply=\{handleQuestionMove\}/.test(app));
ok('⭐ Header 有收 onCompose 並畫出按鈕；app 有傳、有渲染 ComposeModal', /onAddWeek, onCompose,/.test(shell) && /onClick=\{onCompose\}/.test(shell) && /onCompose=\{/.test(app) && /<window\.ComposeModal/.test(app) && /onApply=\{handleCompose\}/.test(app));
ok('⭐ 兩個 handler 都走 data.js 那份邏輯（同一件判斷只有一份）', /window\.qmoveApply\(weeksRef\.current/.test(app) && /window\.composeApply\(base/.test(app));
ok('⭐ 新增一週時，週次與內容一次存完（不是先 handleAddWeek 再複製）', (() => { const f = app.slice(app.indexOf('const handleCompose')); const body = f.slice(0, f.indexOf('\n  };')); return !/handleAddWeek\(/.test(body) && /saveWeekOrder\(nextOrder\)/.test(body) && (body.match(/saveWeeksSafe\(/g) || []).length === 1; })());
ok('⭐ 兩個視窗有匯出到 window', /Object\.assign\(window, \{[^}]*\bQuestionMoveModal\b[^}]*\bComposeModal\b/.test(ed));
ok('⭐ 把單題搬空前有 confirm（不是安靜搬空）', /error === 'unplayable'[\s\S]{0,300}confirm\(/.test(ed));
console.log(fail ? `\n❌ t-v591：${pass} 過 / ${fail} 失敗` : `\n✅ t-v591：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
