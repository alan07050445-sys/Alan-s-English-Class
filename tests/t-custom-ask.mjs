/* t-custom-ask — v445 老師的「特別要求」＋短文只挖 5 格＋講解變短變口語
 * Alan：① 短文只抽五個單字填空，但 word bank 還是全部 ② 講解要中英夾雜、口語化
 * ③ 不需要這麼多頁講解 ④ 一鍵生成都可以自己跟 AI 協調（客製化這次的要求）
 * 不連網路：AI 的回答用假的，只測程式本身的把關。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data   = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const editor = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const css    = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };
const fnEnd = (src, a) => { const i = src.indexOf(a); const j = src.indexOf('\n}\n', i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j + 2); };

let router = null; const calls = [];
const _aiAsk = async (body, pickFn) => {
  calls.push(body);
  const got = pickFn({ content: [{ type: 'text', text: JSON.stringify(router(String(body.system || ''), body)) }] });
  if (got == null) throw new Error('bad');
  return got;
};
const code = slice(data, 'const VOCAB_BANDS = {', 'function _aiStripFence') + '\n' +
             slice(data, 'async function pMap', 'const _AI_BACKOFF') + '\n' +
             slice(data, 'async function aiMakeVocabExercises', '// ── v382: AI 出時態題目') + '\n' +
             slice(data, 'const GN_MODEL', 'function grCountBlanks');
const W = new Function('_aiAsk', '_aiStripFence', '_AI_MINIFY',
  code + '\nreturn { storyPick, storyCheck, storyBlanks, aiMakeVocabStory, aiMakeVocabExercises, _aiTeacherNote,' +
         ' aiMakeGrammarLesson, aiMakeGrammarPack, GN_LESSON_SYS, _GN_BASE, AI_STORY_SYS };')(
  _aiAsk, (t) => String(t).replace(/^```(json)?/, '').replace(/```$/, '').trim(), '');
const parseWords = new Function(fnEnd(editor, 'function qsParseWords') + '\nreturn qsParseWords;')();

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);

const WORDS = ['lights', 'storm', 'during', 'everything', 'quiet', 'upstairs', 'check', 'flashlight'].map(t => ({ term: t }));
const FULL = 'One night the [lights] go off. A big [storm] is here. [everything] is dark [during] the night. ' +
             'It is very [quiet] now. Mom goes [upstairs] to [check] on us. Dad brings a [flashlight] to help.';

console.log('\n【1】短文只挖 5 格，Word Bank 還是全部單字');
const picked = W.storyPick(FULL, 5);
eq('挖 5 格', W.storyBlanks(picked).length, 5);
ok('⭐ 沒挖到的字還是留在文章裡（不是被刪掉）', ['lights', 'storm', 'during', 'everything', 'quiet', 'upstairs', 'check', 'flashlight']
  .every(w => new RegExp('\\b' + w + '\\b', 'i').test(picked)));
ok('⭐ 五格是分散的，不是全擠在前面', (() => {
  const idx = [...picked.matchAll(/\[[^\]]+\]/g)].map(m => m.index);
  return idx[idx.length - 1] > picked.length * 0.6;
})());
ok('本來就只有 3 格就不動它', W.storyBlanks(W.storyPick('a [x] b [y] c [z]', 5)).length === 3);
// 真 AI 第一次跑就踩到：同一個字挖了兩格，只留一格 → 另一格變回原文＝答案寫在文章裡
const dup = W.storyPick('The [lights] go off. A [storm] came. It was [quiet]. Dad has a [flashlight]. The [lights] came back.', 3);
ok('⭐ 同一個字的兩格要嘛都留、要嘛都還原（不然答案就寫在文章裡）',
  (dup.match(/\[lights\]/g) || []).length !== 1);
ok('⭐ 挑完不會洩漏答案', W.storyCheck(dup, ['lights', 'storm', 'quiet', 'flashlight'], { partial: true }).leaked.length === 0);
const c = W.storyCheck(picked, WORDS.map(w => w.term), { partial: true });
eq('partial：八個字都算「用到了」', c.missing.length, 0);
eq('partial：沒挖的字留在文章裡不算洩漏', c.leaked.length, 0);
ok('⭐ 挖了又在別處出現才算洩漏', W.storyCheck('The [storm] came. The storm was big.', ['storm'], { partial: true }).leaked.length === 1);
ok('真的漏掉的字還是抓得到', W.storyCheck(picked, ['pyramid'], { partial: true }).missing.join() === 'pyramid');

console.log('\n【2】整支 aiMakeVocabStory 交出來就是 5 格');
router = () => ({ title: 'No Lights', passage: FULL });
const st = await W.aiMakeVocabStory(WORDS, { grade: 'g2' });
eq('交出來 5 格', W.storyBlanks(st.passage).length, 5);
eq('沒有漏字警告', st.check.missing.length, 0);
ok('有跟老師說「只留 5 格」', (st.fixes || []).some(f => /只留 5 個空格/.test(f)));
ok('原本全挖的版本也留著（st.full）', W.storyBlanks(st.full).length === 8);
const st3 = await W.aiMakeVocabStory(WORDS, { grade: 'g2', blanks: 3 });
eq('可以指定挖幾格', W.storyBlanks(st3.passage).length, 3);

console.log('\n【3】老師的「特別要求」會原封不動送給 AI');
ok('沒寫就什麼都不加', W._aiTeacherNote('') === '' && W._aiTeacherNote('  ') === '');
const note = W._aiTeacherNote('短文用萬聖節當背景');
ok('有寫就帶上老師原文', /短文用萬聖節當背景/.test(note));
ok('⭐ 明講「只能改內容，不能改格式」', /never change the output FORMAT/i.test(note));
ok('太長會截掉（600 字上限）', W._aiTeacherNote('あ'.repeat(900)).indexOf('あ'.repeat(600)) > 0);

calls.length = 0;
router = () => ({ title: 'x', passage: FULL });
await W.aiMakeVocabStory(WORDS, { grade: 'g2', teacherNote: '用萬聖節當背景' });
ok('短文：老師的話有進 prompt', /用萬聖節當背景/.test(String(calls[0].messages[0].content)));

calls.length = 0;
router = () => ([{ word: 'lights', def: 'x', sentence: 'The ___ are on.', answer: 'lights', explain: '' }]);
await W.aiMakeVocabExercises([{ term: 'lights' }], { grade: 'g2', teacherNote: '例句都用學校生活' });
ok('單字題目：老師的話有進 prompt', /例句都用學校生活/.test(String(calls[0].messages[0].content)));

ok('出文法的 _GN_BASE 也吃得到', /只要講解，不要練習/.test(W._GN_BASE('g4', 'Nouns', 'notes', false, '只要講解，不要練習')));
ok('沒寫特別要求時 _GN_BASE 完全不變',
  W._GN_BASE('g4', 'Nouns', 'notes', false) === W._GN_BASE('g4', 'Nouns', 'notes', false, ''));

console.log('\n【4】講解要短、要中英夾雜、不要紙本活動');
ok('⭐ 固定 3 回合（不再一段一回合）', /EXACTLY 3 rounds/.test(W.GN_LESSON_SYS) && !/ONE round per section/.test(W.GN_LESSON_SYS));
ok('⭐ 明講「英文字留英文」', /KEEPS THE ENGLISH WORDS IN ENGLISH/.test(W.GN_LESSON_SYS));
ok('舉例就是 Alan 說的那種講法', /person、animal、place、thing/.test(W.GN_LESSON_SYS));
ok('⭐ 明講不要教「把地方塗藍色」這種紙本活動', /only works on paper/.test(W.GN_LESSON_SYS) && /places are blue/.test(W.GN_LESSON_SYS));

const learn = (n) => ({ kind: 'learn', say: '重點' + n, imgHint: 'park bench', examples: [{ en: 'The park is big.', hl: ['park'], zh: '公園很大' }] });
const act = (n) => ({ kind: 'pick', q: 'Which is a noun? ' + n, options: ['run', 'park'], answer: 1, why: '' });
const long = { lead: 'x', outro: 'y', steps: [] };
for (let i = 0; i < 6; i++) long.steps.push(learn(i), act(i));       // 6 回合＝12 步
router = () => long;
const L = await W.aiMakeGrammarLesson({ topic: 'Nouns', notes: 'n' });
ok('⭐ 12 步的教學被砍到 8 步（4 回合）', L.steps.length === 8);
ok('砍完最後一步不是「學」', L.steps[L.steps.length - 1].kind !== 'learn');

console.log('\n【5】老師可以自己貼英文定義（不用 AI 生）');
const rows = parseWords('pharaoh - 法老 - The pharaoh ruled Egypt. - a king in ancient Egypt\npyramid - 金字塔');
eq('第四欄讀成 def', rows[0].def, 'a king in ancient Egypt');
eq('沒寫的就是空的', rows[1].def, '');
eq('前三欄不受影響', rows[0].term + '|' + rows[0].zh + '|' + rows[0].example, 'pharaoh|法老|The pharaoh ruled Egypt.');
ok('⭐ 配對連線優先用老師寫的定義', /const def = w\.def \|\| \(a && a\.def\) \|\| w\.zh/.test(editor));
ok('畫面上有說明第四欄', /英文定義/.test(editor) && /有定義 \{withDef\.length\}/.test(editor));

console.log('\n【6】三個一鍵生成視窗都有「特別要求」欄');
ok('有共用元件', /function AiNoteBox/.test(editor));
eq('四個地方各放一個（單字／文法／閱讀理解／分段閱讀）', (editor.match(/<AiNoteBox/g) || []).length, 4);
ok('出文法有把它送出去', /teacherNote: aiNote,/.test(editor));
ok('閱讀理解的題目與背景知識都送', (editor.match(/teacherNote: aiNote/g) || []).length >= 5);
ok('CSS 有樣式', /\.ai-note-open/.test(css) && /\.ai-note-in/.test(css));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
