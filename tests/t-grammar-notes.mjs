/* t-grammar-notes — v428 ✏️ 出文法：驗證器、答案比對、老師題目優先、建出來的單元
 * 不連網路：AI 的回答用假的（mock），只測程式本身的把關。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const editor = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };

let aiQueue = [];            // 沒指定題型時，依序回給 _aiAsk 的假答案（物件＝JSON 文字）
const byKind = {};           // v429：依 system prompt 分流（lesson/mcq/fill/translate/rewrite），平行請求順序不固定
const kindOf = (sys) => /INTERACTIVE mini-lesson/.test(sys) ? 'lesson' : /multiple-choice/.test(sys) ? 'mcq'
  : /fill-in-the-blank/.test(sys) ? 'fill' : /correct the sentence/.test(sys) ? 'rewrite' : /Chinese-to-English translation questions/.test(sys) ? 'translate' : null;
const calls = [];
const _aiAskImpl = {};
const _aiAsk = (body, pickFn) => _aiAskImpl.fn(body, pickFn);
_aiAskImpl.fn = async (body, pickFn) => {
  calls.push(body);
  // v430：選擇題交叉檢查——沒指定答案就當作「檢查失敗」（程式照收），不吃掉其他題型排好的假答案
  if (/checking a quiz/.test(String(body.system || ''))) {
    const c = byKind.check && byKind.check.shift();
    if (!c) throw new Error('no check');
    return pickFn({ content: [{ type: 'text', text: JSON.stringify(c) }] });
  }
  const k = kindOf(String(body.system || ''));
  const next = (k && byKind[k] && byKind[k].length) ? byKind[k].shift() : aiQueue.shift();
  if (next instanceof Error) throw next;
  const txt = typeof next === 'string' ? next : JSON.stringify(next);
  const got = pickFn({ content: [{ type: 'text', text: txt }] });
  if (got == null) throw new Error('bad');
  return got;
};
const code = slice(data, 'const GN_MODEL', 'function grCountBlanks');
const W = new Function('_aiAsk', '_aiStripFence', '_AI_MINIFY',
  code + '\nreturn { aiReadGrammarSheet, aiMakeGrammarPack, aiMakeGrammarLesson, aiJudgeTranslation, gnAnswerOk, gnNorm, gnValidStep, gnValidLesson, gnValidFill, gnValidRewrite, gnValidMcq, gnCleanStem, gnSplitText, _gnSalvageJson, _gnSpread, GN_READ_MODEL, GN_MODEL };')(
  _aiAsk, (t) => String(t).replace(/^```(json)?/, '').replace(/```$/, '').trim(), '');
// gnBuildItems 在 JSX 檔裡，但本身是純 JS
globalThis.window = { gnValidStep: W.gnValidStep };
const fnEnd = (src, a) => { const i = src.indexOf(a); const j = src.indexOf('\n}\n', i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j + 2); };
const B = new Function('window', fnEnd(editor, 'function gnBuildItems') + '\nreturn gnBuildItems;')(globalThis.window);

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e).replace(/\n/g, '\n         ') : '')));

log.push('\n【1】答案比對（孩子打字常見的樣子都要算對）');
for (const [u, a, acc, want] of [
  ['There is not a pen', "There isn't a pen.", [], true], ['there are two cats', 'There are two cats.', [], true],
  ['Is there a park near here', 'Is there a park near here?', [], true], ['I cant swim', "I can't swim.", [], true],
  ["There's a pencil on the desk", 'There is a pencil on the desk.', [], true], ['Theres a pencil on the desk', 'There is a pencil on the desk.', [], true],
  ['  isnt  ', "isn't", [], true], ['are', 'are', [], true], ['A pencil is on the desk.', 'There is a pencil on the desk.', ['A pencil is on the desk.'], true],
  ['There are two cat.', 'There are two cats.', [], false], ['There is two pencils.', 'There are two pencils.', [], false], ['', 'is', [], false],
]) ok(`「${u}」vs「${a}」→ ${want ? '對' : '錯'}`, W.gnAnswerOk(u, a, acc) === want);

log.push('\n【2】互動教學的每一步都要驗');
ok('pick：答案寫成文字也修回索引', W.gnValidStep({ kind: 'pick', q: 'There ___ a cat.', options: ['is', 'are'], answer: 'is' }).answer === 0);
ok('pick：空格統一成 ________', W.gnValidStep({ kind: 'pick', q: 'There ___ a cat.', options: ['is', 'are'], answer: 0 }).q === 'There ________ a cat.');
ok('pick：選項重複 → 丟掉', W.gnValidStep({ kind: 'pick', q: 'There ___ a cat.', options: ['is', 'is'], answer: 0 }) === null);
ok('（v429）pick：問句沒有空格也收（「Which one is a proper noun?」）', !!W.gnValidStep({ kind: 'pick', q: 'Which one is a proper noun?', options: ['city', 'Taipei'], answer: 1 }));
ok('（v429）pick：選項只差大小寫也算不同（taipei／Taipei 就是在考這個）', !!W.gnValidStep({ kind: 'pick', q: 'Which is correct?', options: ['taipei', 'Taipei'], answer: 1 }));
ok('⭐（v429）fix：只改大小寫（john → John）也收——Alan 的「專有名詞」作業就是卡在這裡', !!W.gnValidStep({ kind: 'fix', sentence: 'I go to school with my friend john.', wrong: 'john', right: 'John' }));
ok('fix：改前改後完全一樣 → 丟掉', W.gnValidStep({ kind: 'fix', sentence: 'I like Taipei.', wrong: 'Taipei', right: 'Taipei' }) === null);
ok('order：3–9 塊才收', !!W.gnValidStep({ kind: 'order', zh: '有一隻貓。', words: ['There', 'is', 'a', 'cat.'] }) && !W.gnValidStep({ kind: 'order', zh: '貓', words: ['cat'] }));
ok('order：中文要有中文', W.gnValidStep({ kind: 'order', zh: 'a cat', words: ['There', 'is', 'a', 'cat.'] }) === null);
ok('fix：錯的字要剛好出現一次', !!W.gnValidStep({ kind: 'fix', sentence: 'There is two dogs.', wrong: 'is', right: 'are' }) &&
   !W.gnValidStep({ kind: 'fix', sentence: 'There is two dogs.', wrong: 'cat', right: 'dog' }));
ok('fix：句尾標點不影響找字', !!W.gnValidStep({ kind: 'fix', sentence: 'Is there two dogs?', wrong: 'Is', right: 'Are' }));
ok('learn：要標重點的字不在句子裡 → 那個標記拿掉', W.gnValidStep({ kind: 'learn', say: '一個用 is', examples: [{ en: 'There is a cat.', hl: ['There is', 'banana'], zh: '' }] }).examples[0].hl.join() === 'There is');
ok('整份教學至少 2 個學習＋2 個互動，不然不收', W.gnValidLesson({ steps: [{ kind: 'learn', say: 'x', examples: [{ en: 'a b' }] }] }) === null);

log.push('\n【3】讀照片：圈選題「(is / are)」自動變成空格＋選項');
{
  aiQueue = [{ topic: 'There is / There are', topicZh: '有', notes: 'rule', questions: [
    { kind: 'mcq', q: 'There (is / are) a book on the desk.' }, { kind: 'other', q: '（Is／Are） there any milk?' },
    { kind: 'fill', q: 'There ______ a clock.' }, { kind: 'translate', q: '桌上有一支鉛筆。' }, { kind: 'mcq', q: '' } ] }];
  const r = await W.aiReadGrammarSheet({ images: [{ media_type: 'image/jpeg', data: 'AAAA' }] });
  ok('「There (is / are) a book」→ 空格＋[is, are]', r.questions[0].q === 'There ________ a book on the desk.' && r.questions[0].options.join() === 'is,are', JSON.stringify(r.questions[0]));
  ok('全形括號斜線也認得，而且 other 改成 mcq', r.questions[1].kind === 'mcq' && r.questions[1].options.join() === 'Is,Are', JSON.stringify(r.questions[1]));
  ok('空白題目丟掉', r.questions.length === 4);
  ok('看照片用 Sonnet（實測比較不會讀錯中文字）', calls[calls.length - 1].model === 'claude-sonnet-5' && W.GN_READ_MODEL === 'claude-sonnet-5');
  ok('照片真的有送出去（image 區塊）', calls[calls.length - 1].messages[0].content[0].type === 'image');
}

log.push('\n【1b】（v429）大小寫是考點的單元：答案要分大小寫');
{
  const cs = { caseSensitive: true };
  ok('分大小寫：「my cousin junie lives in hsinchu」≠「My cousin Junie lives in Hsinchu.」', !W.gnAnswerOk('my cousin junie lives in hsinchu', 'My cousin Junie lives in Hsinchu.', [], cs));
  ok('分大小寫：大小寫都對、只差句點 → 對', W.gnAnswerOk('My cousin Junie lives in Hsinchu', 'My cousin Junie lives in Hsinchu.', [], cs));
  ok('分大小寫：多打空格不算錯', W.gnAnswerOk('My  cousin Junie  lives in Hsinchu.', 'My cousin Junie lives in Hsinchu.', [], cs));
  ok('一般單元還是不分大小寫（There is 那種）', W.gnAnswerOk('there is a cat', 'There is a cat.', []));
}

log.push('\n【4】出題：老師的題目優先、驗不過的丟掉、不夠再出一輪');
{
  const lesson = { lead: 'L', outro: 'O', steps: [
    { kind: 'learn', say: '一個 is', examples: [{ en: 'There is a cat.', hl: ['There is'], zh: '一隻貓' }] },
    { kind: 'pick', q: 'There ___ a dog.', options: ['is', 'are'], answer: 0, why: 'w' },
    { kind: 'learn', say: '很多 are', examples: [{ en: 'There are two cats.', hl: ['There are'], zh: '兩隻' }] },
    { kind: 'order', zh: '有兩隻狗。', words: ['There', 'are', 'two', 'dogs.'] },
    { kind: 'pick', q: 'bad no blank', options: ['a'], answer: 0 } ] };
  const mcq1 = [{ q: 'There ___ a book on the desk.', options: ['is', 'are', 'am'], answer: 0, explain: 'e' }, { q: 'x', options: ['a', 'a'], answer: 0 }];
  const mcq2 = [{ q: 'There ___ cats.', options: ['is', 'are'], answer: 1 }, { q: 'There ___ a pen.', options: ['is', 'are'], answer: 0 }];
  const fill = [{ prompt: 'There ______ a clock.', answer: 'is' }, { prompt: 'no blank here', answer: 'is' }, { prompt: 'There ___ two ___.', answer: 'are' }];
  const tr = [{ zh: '桌上有一支鉛筆。', answer: 'There is a pencil on the desk.', accept: ["There's a pencil on the desk.", '桌上'], hint: 'There is' }];
  // 呼叫順序：lesson、mcq、fill、translate 同時開始 → 假答案照「送出」的順序排
  aiQueue = [lesson, mcq1, fill, tr, mcq2, [], []];
  const teacherQs = [{ kind: 'mcq', q: 'There ________ a book on the desk.', options: ['is', 'are'], answer: '' }];
  const p = await W.aiMakeGrammarPack({ topic: 'There is', notes: 'rule', teacherQs, nMcq: 3, nFill: 1, nTr: 1 });
  ok('教學：不合格的那一步被丟掉，其他保留', p.lesson.steps.length === 4, JSON.stringify(p.lesson.steps.map(x => x.kind)));
  ok('⭐ 選擇題：第一輪把老師的題目交給 AI、並標明要照原文', calls.some(c => /FIRST include these 1 questions from the teacher/.test(c.messages[0].content)));
  ok('選擇題：重複選項的那題丟掉，不夠 → 自動再出一輪補滿', p.mcq.length === 3, JSON.stringify(p.mcq.map(x => x.q)));
  ok('填空：沒空格、兩個空格的都丟掉', p.fill.length === 1 && p.fill[0].prompt === 'There ________ a clock.');
  ok('中翻英：「其他正確說法」裡混進中文的丟掉', p.tr[0].accept.length === 1 && p.tr[0].accept[0] === "There's a pencil on the desk.");
  ok('出題用 Haiku（快又便宜）', calls.filter(c => c.model === 'claude-haiku-4-5').length >= 4);
}

log.push('\n【4b】實測 AI 出過的兩個小毛病，由程式擋掉');
{
  aiQueue = [{ ok: false, tip: 'Traditional Chinese: 「two pencils」應該用「There are」' }];
  const j = await W.aiJudgeTranslation({ zh: '桌上有兩支鉛筆。', answer: 'There are two pencils on the desk.', user: 'There is two pencils.' });
  ok('AI 把欄位說明抄進回饋（「Traditional Chinese: …」）→ 拿掉', j.tip === '「two pencils」應該用「There are」', j.tip);
  ok('AI 判斷壞掉 → 回 null（播放器會照程式的結果算錯，不會卡住）', await (async () => { aiQueue = [new Error('x')]; return (await W.aiJudgeTranslation({ zh: 'a', answer: 'b', user: 'c' })) === null; })());
  const f = W.gnValidFill({ prompt: 'Is there ________ cat in your home? (a)', answer: 'a' });
  ok('填空的括號提示就是答案（「(a)」答案 a）→ 拿掉提示，免得送分', f.prompt === 'Is there ________ cat in your home?', f.prompt);
  ok('括號提示不是答案（「(walk)」答案 walks）→ 留著', W.gnValidFill({ prompt: 'She ________ to school. (walk)', answer: 'walks' }).prompt.endsWith('(walk)'));
}

log.push('\n【4c】（v429）讀照片：改寫題、無題幹的選擇題、大小寫');
{
  aiQueue = [{ topic: 'Common Noun & Proper Noun', topicZh: '一般名詞與專有名詞', notes: 'Proper nouns begin with a capital letter.', caseMatters: false, questions: [
    { kind: 'mcq', q: 'Circle the sentence with the correct capital letters.', options: ['My family visited taipei zoo.', 'My family visited Taipei Zoo.'] },
    { kind: 'other', q: 'Rewrite with the correct capital letters: my cousin junie lives in hsinchu.' },
    { kind: 'rewrite', q: 'we visited yangmingshan park on saturday.' } ] }];
  const r = await W.aiReadGrammarSheet({ text: 'x' });
  ok('⭐「Rewrite …: my cousin junie…」→ 改寫題（只留要改的句子）', r.questions[1].kind === 'rewrite' && r.questions[1].q === 'my cousin junie lives in hsinchu.', JSON.stringify(r.questions[1]));
  ok('沒有題幹的選擇題（Circle the correct sentence）照樣收', r.questions[0].kind === 'mcq' && r.questions[0].options.length === 2);
  ok('⭐ notes 講到 capital letter → 就算 AI 忘了標，也判定「大小寫是考點」', r.caseMatters === true);
  ok('改寫題驗證：改前改後要不一樣、不能有中文', !!W.gnValidRewrite({ wrong: 'my dog lucky', answer: 'My dog Lucky' }) && !W.gnValidRewrite({ wrong: 'a', answer: 'a' }) && !W.gnValidRewrite({ wrong: '我', answer: 'I' }));
}

log.push('\n【4e】（v429）大寫單元的選擇題與填空（Alan 的 Part B 就是這種）');
{
  aiQueue = [{ topic: 'Proper nouns', notes: 'Proper nouns begin with a capital letter.', questions: [
    { kind: 'mcq', q: 'Circle the sentence with the correct capital letters.', options: ['A. My family visited taipei zoo on sunday.', 'B. My family visited Taipei Zoo on Sunday.'] } ] }];
  const r = await W.aiReadGrammarSheet({ text: 'x' });
  ok('選項前面的「A. 」「B. 」標號拿掉', r.questions[0].options[1] === 'My family visited Taipei Zoo on Sunday.', JSON.stringify(r.questions[0].options));
  byKind.mcq = [[
    { q: 'Circle the sentence with the correct capital letters.', options: ['My family visited taipei zoo.', 'My family visited Taipei Zoo.'], answer: 'B' },
    { q: 'Circle the sentence with the correct capital letters.', options: ['kevin goes to school.', 'Kevin goes to school.'], answer: 'Kevin goes to school.' },
    { q: 'Circle the sentence with the correct capital letters.', options: ['we like christmas.', 'We like Christmas.'], answer: 1 } ]];
  byKind.fill = [[
    { prompt: 'We live in ________. (taipei)', answer: 'Taipei' },
    { prompt: 'My friend ________ lives in Taipei.', answer: 'teacher' } ]];
  const p = await W.aiMakeGrammarPack({ topic: 'Proper nouns', notes: 'capital letters', nMcq: 3, nFill: 1, nTr: 0, nRw: 0, caseMatters: true });
  ok('⭐ 選項只差大小寫的三題選擇題全部收下（以前全被當成重複丟掉）', p.mcq.length === 3, JSON.stringify(p.mcq.map(q => q.options)));
  ok('⭐ 題幹一模一樣（Circle the…）也不會被當成重複', new Set(p.mcq.map(q => q.q)).size === 1 && p.mcq.length === 3);
  ok('答案寫成「B」、寫成整句、寫成數字都認得', p.mcq[0].answer === 1 && p.mcq[1].answer === 1 && p.mcq[2].answer === 1, JSON.stringify(p.mcq.map(q => q.answer)));
  ok('⭐ 大寫單元的填空：「(taipei) → Taipei」這種留著、提示也留著', p.fill.length === 1 && p.fill[0].prompt === 'We live in ________. (taipei)' && p.fill[0].answer === 'Taipei', JSON.stringify(p.fill));
  ok('大寫單元的填空：答案沒有大寫字母的（→ teacher）丟掉', !p.fill.some(f => f.answer === 'teacher'));
  for (const k of Object.keys(byKind)) delete byKind[k];
}

log.push('\n【4d】（v429）互動教學失敗，不能把整份都丟掉');
{
  const good = { lead: 'L', outro: 'O', steps: [
    { kind: 'learn', say: '人名要大寫', examples: [{ en: 'My friend is Amy.', hl: ['Amy'], zh: '' }] },
    { kind: 'fix', sentence: 'My friend is amy.', wrong: 'amy', right: 'Amy', why: '人名要大寫' },
    { kind: 'learn', say: '地名要大寫', examples: [{ en: 'I live in Taipei.', hl: ['Taipei'], zh: '' }] },
    { kind: 'pick', q: 'Which one is a proper noun?', options: ['city', 'Taipei'], answer: 1 } ] };
  const bad = { steps: [{ kind: 'learn', say: 'x', examples: [{ en: 'a b' }] }, { kind: 'pick', q: 'no', options: ['a'], answer: 0 }] };
  // ① 第一次不合格 → 帶著「哪一步錯」重出 → 第二次合格
  calls.length = 0; aiQueue = [];
  byKind.lesson = [bad, good];
  const l = await W.aiMakeGrammarLesson({ topic: 'Proper nouns', notes: 'capital letters', caseMatters: true });
  ok('第一次被擋 → 自動重出一次就成功', l && l.steps.length === 4);
  const lessonCalls = calls.filter(c => kindOf(c.system) === 'lesson');
  ok('⭐ 重出時有告訴 AI「上一次哪一步不合格」', lessonCalls.length === 2 && /REJECTED/.test(lessonCalls[1].messages[0].content) && /step 2/.test(lessonCalls[1].messages[0].content));
  ok('大小寫單元：出題時有提醒 AI「這課在考大寫」', /CAPITAL LETTERS/.test(lessonCalls[0].messages[0].content));
  // ② 三次都不合格 → 教學給 null，但題目照樣回來、不會整個失敗
  byKind.lesson = [bad, bad, bad];
  byKind.mcq = [[{ q: 'Circle the correct sentence.', options: ['i like taipei.', 'I like Taipei.'], answer: 1 }]];
  byKind.rewrite = [[{ wrong: 'my dog lucky is cute.', answer: 'My dog Lucky is cute.' }]];
  const p = await W.aiMakeGrammarPack({ topic: 'Proper nouns', notes: 'capital letters', nMcq: 1, nFill: 0, nTr: 0, nRw: 1, caseMatters: true });
  ok('⭐ 互動教學三次都失敗 → 不會整個失敗，選擇題、改寫題照樣回來', p.lesson === null && p.mcq.length === 1 && p.rw.length === 1, JSON.stringify({ lesson: p.lesson, mcq: p.mcq.length, rw: p.rw.length }));
  ok('並且告訴老師是哪一部分沒成功', p.errors.join() === '互動教學');
  ok('大小寫是考點這件事有傳回來（建單元時用）', p.caseMatters === true);
  // ③ 全部都失敗才算失敗
  byKind.lesson = [new Error('x'), new Error('x'), new Error('x')]; byKind.mcq = [new Error('x'), new Error('x')];
  let threw = false;
  try { await W.aiMakeGrammarPack({ topic: 'x', notes: 'y', nMcq: 1, nFill: 0, nTr: 0, nRw: 0 }); } catch (e) { threw = /全部都沒有/.test(e.message); }
  ok('全部都沒出來 → 才整個失敗，訊息講清楚', threw);
  for (const k of Object.keys(byKind)) delete byKind[k];
}

log.push('\n【5】建出來的單元');
{
  const items = B({ title: 'There is / are', topic: 'There is / are',
    lesson: { lead: 'L', outro: 'O', steps: [
      { kind: 'learn', say: 'x', examples: [{ en: 'There is a cat.', hl: [], zh: '' }] }, { kind: 'pick', q: 'There ________ a dog.', options: ['is', 'are'], answer: 0 },
      { kind: 'learn', say: 'y', examples: [{ en: 'There are cats.', hl: [], zh: '' }] }, { kind: 'fix', sentence: 'There is two dogs.', wrong: 'is', right: 'are' } ] },
    mcq: [{ q: 'There ________ a pen.', options: ['is', 'are'], answer: 0, explain: '' }],
    fill: [{ prompt: 'There ________ a clock.', answer: 'is', accept: ['is'], explain: '' }],
    tr: [{ zh: '有一支筆。', answer: 'There is a pen.', accept: [], hint: 'There is', explain: '' }] });
  ok('四個單元：教學、選擇、填空、中翻英', items.map(x => x.type + (x.variant ? '/' + x.variant : '')).join() === 'lesson,quiz,type-answer/fill,type-answer/translate', items.map(x => x.type).join());
  const ls = items[0];
  ok('⭐ 三份練習都鎖在教學後面（requires＝教學 id）', items.slice(1).every(x => x.requires === ls.id));
  ok('同一組（側欄會排在一起）', items.every(x => x.group === 'There is / are'));
  ok('教學排第一個', ls.order === 0 && items.slice(1).every(x => x.order > 0));
  ok('中翻英的題目欄位是中文、答案是英文', items[3].pairs[0].prompt === '有一支筆。' && items[3].pairs[0].answer === 'There is a pen.');
  ok('中翻英帶文法名稱（給 AI 判斷用）', items[3].topic === 'There is / are');
  const capItems = B({ title: 'Proper nouns', topic: 'Proper nouns', caseMatters: true,
    lesson: { steps: [{ kind: 'learn', say: 'x', examples: [{ en: 'I like Taipei.', hl: [], zh: '' }] }, { kind: 'fix', sentence: 'I like taipei.', wrong: 'taipei', right: 'Taipei' },
                      { kind: 'learn', say: 'y', examples: [{ en: 'Amy is here.', hl: [], zh: '' }] }, { kind: 'pick', q: 'Which one?', options: ['amy', 'Amy'], answer: 1 }] },
    mcq: [], fill: [{ prompt: 'I live in ________.', answer: 'Taipei', accept: [], explain: '' }], tr: [],
    rw: [{ wrong: 'my dog lucky is cute.', answer: 'My dog Lucky is cute.', explain: '' }, { wrong: 'same', answer: 'same' }] });
  const rwItem = capItems.find(x => x.variant === 'rewrite');
  ok('⭐（v429）改寫題變成一個單元：題目＝有錯的句子、答案＝改對的句子', rwItem && rwItem.pairs.length === 1 && rwItem.pairs[0].prompt === 'my dog lucky is cute.' && rwItem.pairs[0].answer === 'My dog Lucky is cute.');
  ok('⭐ 大小寫是考點 → 填空、改寫都標成分大小寫', rwItem.caseSensitive === true && capItems.find(x => x.variant === 'fill').caseSensitive === true);
  ok('改寫題也鎖在教學後面', rwItem.requires === capItems[0].id);
  ok('一般單元不會被標成分大小寫', !items.some(x => x.caseSensitive));
  const noLesson = B({ title: 'T', lesson: { steps: [] }, mcq: [{ q: 'a ________', options: ['x', 'y'], answer: 0 }], fill: [], tr: [] });
  ok('教學全部被刪光 → 練習就不鎖（不然永遠打不開）', noLesson.length === 1 && !noLesson[0].requires);
}

// ═══ 7. v430：一份很長的作業（Alan 的 Nouns 五大類：5 頁照片／5800 字）═══
// 以前一次讀，AI 寫到 3000 token 上限被切斷 → JSON 不完整 → 「讀不到」（照片、文字都一樣）。
log.push('\n【7】（v430）長作業：拆段同時讀、被切斷也救得回來、題目各段都有');
{
  const nouns = `老師把Nouns 分成五大類
1. A Noun: People, Places, Things, and Ideas
A noun names a person, a place, a thing, or an idea.
Type	Examples
People	Kelis, sister, skateboarder, Senator Kaur
Practice A: Identifying Nouns
Read each sentence. Then underline the nouns.
Luna is a smart cat.
My brother plays the drums.
${'Chris eats blueberries in the morning.\n'.repeat(8)}2. Collective Nouns
A collective noun names a group of people, animals, or things.
Practice A: Finding Collective Nouns
fans, audience, viewers ____________________
${'uncle, aunt, family ____________________\n'.repeat(8)}3. Count Nouns and Non-Count Nouns
Count nouns name things that can be counted.
${'Dad added too much sugar to the cake.\n'.repeat(8)}4. Common Nouns and Proper Nouns
Proper nouns are always capitalized.
${'Mary Cassatt was a well-known painter who lived in France.\n'.repeat(5)}5. Possessive Nouns: Using Apostrophes
Rule 1: Most Singular Nouns and Irregular Plural Nouns
Add an apostrophe and -s to most singular nouns.
${'the (dog) barking ____________________\n'.repeat(8)}`;
  const parts = W.gnSplitText(nouns);
  ok('⭐ 依大標題切成 5 段（「1. A Noun…」到「5. Possessive…」）', parts.length === 5, parts.map(p => p.split('\n')[0]).join(' ｜ '));
  ok('標題前的「老師把Nouns 分成五大類」併到第一段，不自己成一段', parts[0].startsWith('老師把Nouns') && /1\. A Noun/.test(parts[0]));
  ok('題目句（以句號結尾、小寫開頭）不會被當成標題', !parts.some(p => /^(Luna is|the \(dog\))/.test(p)));
  ok('「Rule 1: …」「Practice A」不會把段落切碎', parts[4].indexOf('Rule 1') > 0 && parts[1].indexOf('Practice A') > 0);
  const huge = Array.from({ length: 300 }, (_, i) => `Sentence number ${i} is here.`).join('\n');
  const hp = W.gnSplitText(huge);
  ok('沒有標題的一大段 → 照長度切，每段都不超過上限，而且不超過 8 段', hp.length > 1 && hp.length <= 8 && hp.join('\n').split('\n').filter(l => /^Sentence/.test(l)).length === 300, hp.map(p => p.length).join(','));
  ok('短文字 → 一段就好（不要多花請求）', W.gnSplitText('There is a cat.\nThere are two dogs.').length === 1);

  const cut = '{"unit":"Nouns","topic":"Collective Nouns","notes":"A collective noun names a group.","questions":[{"kind":"mcq","q":"Which one is a collective noun?","options":["fans","audience"]},{"kind":"mcq","q":"Which one is a coll';
  const sv = W._gnSalvageJson(cut);
  ok('⭐ AI 被 max_tokens 切斷的 JSON → 救回 notes 和已經寫完的題目', sv && sv.notes === 'A collective noun names a group.' && sv.questions.length === 1, JSON.stringify(sv));
  ok('完全不是 JSON → null', W._gnSalvageJson('sorry I cannot') === null);

  // 平行讀：5 段各自回答（依內容分流，因為同時送出、順序不固定）
  const reply = {
    'A Noun': { unit: 'Nouns', topic: 'Nouns: People, Places, Things, Ideas', notes: 'A noun names a person.', questions: [{ kind: 'identify', q: 'Luna is a smart cat.', find: 'noun' }, { kind: 'identify', q: 'My brother plays the drums.', find: 'noun' }] },
    'Collective': { unit: 'Nouns', topic: 'Collective Nouns', notes: 'A collective noun names a group.', questions: [{ kind: 'mcq', q: 'Which one is a collective noun?', options: ['fans', 'audience', 'viewers'] }] },
    'Count Nouns': new Error('timeout'),
    'Common Nouns': { unit: '', topic: 'Common and Proper Nouns', notes: 'Proper nouns are always capitalized. Use a capital letter.', caseMatters: true, questions: [{ kind: 'identify', q: 'Mary Cassatt was a painter.', find: 'proper noun' }] },
    'Possessive': { unit: 'Nouns', topic: 'Possessive Nouns', notes: "Add 's.", questions: [{ kind: 'fill', q: 'the ________ barking (dog)' }] },
  };
  const realAsk = _aiAskImpl.fn;
  _aiAskImpl.fn = async (body, pickFn) => {
    calls.push(body);
    const t = JSON.stringify(body.messages[0].content);
    const k = Object.keys(reply).find(x => t.indexOf(x) >= 0);
    const r = reply[k];
    if (r instanceof Error) throw r;
    return pickFn({ content: [{ type: 'text', text: JSON.stringify(r) }] });
  };
  const n0 = calls.length, prog = [];
  const sh = await W.aiReadGrammarSheet({ text: nouns, onProgress: (d, t) => prog.push(`${d}/${t}`) });
  const mine = calls.slice(n0);
  ok('⭐ 5 段同時送出（5 個請求，不是一個大請求）', mine.length === 5 && mine.every(c => c.max_tokens >= 4000), mine.length + ' 個');
  ok('進度回報 0/5 → 5/5', prog[0] === '0/5' && prog[prog.length - 1] === '5/5', prog.join(' '));
  ok('⭐ 一段讀不到（第 3 段逾時）→ 其他 4 段照樣可以用，missed 說是哪一段', sh.sections.length === 4 && sh.missed.join() === '文字第 3 段', JSON.stringify(sh.missed));
  ok('單元名稱取大家都說的「Nouns」', sh.topic === 'Nouns' && sh.unit === 'Nouns', sh.topic);
  ok('notes 每段都有【主題】標頭', (sh.notes.match(/^【/gm) || []).length === 4 && sh.notes.indexOf('【Collective Nouns】') >= 0);
  ok('題目帶著段落編號（出題時才能各段輪流挑）', sh.questions.map(q => q.sec).join() === '0,0,1,2,3', sh.questions.map(q => q.sec).join());
  ok('⭐ 只有一段在教大寫 → 整份不算大寫單元（不然每題都變成考大寫）', sh.caseMatters === false);
  ok('identify（底線畫出名詞）有保留要找什麼', sh.questions[0].kind === 'identify' && sh.questions[0].find === 'noun');

  const n1 = calls.length;
  const one = await W.aiReadGrammarSheet({ images: [1, 2, 3].map(() => ({ media_type: 'image/jpeg', data: 'A' })) }).catch(e => e);
  ok('三張照片 → 三個請求，每個請求只有自己那張', calls.length - n1 === 3 && calls.slice(n1).every(c => c.messages[0].content.filter(b => b.type === 'image').length === 1));
  ok('每張都讀不到 → 才整份失敗，訊息照舊', one instanceof Error && /讀不懂|太久/.test(one.message));

  // 出題：老師題目各段輪流挑、identify 轉選擇題
  const spread = W._gnSpread([{ sec: 0, q: 'a1' }, { sec: 0, q: 'a2' }, { sec: 0, q: 'a3' }, { sec: 1, q: 'b1' }, { sec: 2, q: 'c1' }, { sec: 2, q: 'c2' }], 4);
  ok('⭐ 各段輪流挑（不是前 4 題全出自第 1 段）', spread.map(x => x.q).join() === 'a1,b1,c1,a2', spread.map(x => x.q).join());
  _aiAskImpl.fn = realAsk;
  byKind.mcq = [[{ q: 'Which word is a noun? "Luna is a smart cat."', options: ['smart', 'cat', 'is'], answer: 1 }]];
  const n2 = calls.length;
  await W.aiMakeGrammarPack({ topic: 'Nouns', notes: sh.notes, teacherQs: sh.questions, nMcq: 1, nFill: 0, nTr: 0, nRw: 0 }).catch(() => {});
  const mq = calls.slice(n2).find(c => /multiple-choice/.test(c.system));
  ok('⭐ 「底線畫出名詞」的老師題目交給選擇題，並說明要改成 Which word is a …?', mq && /\[identify: find the noun\] Luna is a smart cat\./.test(mq.messages[0].content) && /Which word is a <X>\?/.test(mq.messages[0].content));
  ok('notes 有好幾段 → 提醒 AI 每一段都要照顧到', mq && /Cover EVERY section/.test(mq.messages[0].content));
  const ls = calls.slice(n2).find(c => /INTERACTIVE mini-lesson/.test(c.system));
  ok('多段的互動教學：一段一回合、字數上限放寬', ls && ls.max_tokens >= 3800 && /ONE round per section/.test(ls.system));
  ok('notes 不再只給前 4000 字', /slice\(0, 9000\)/.test(data));
}

log.push('\n【8】（v430）選擇題題目只要「Choose the correct answer.」（Alan：不然太亂了）');
{
  const opts = ['My family visited taipei zoo.', 'My family visited Taipei Zoo.', 'my family visited Taipei zoo.'];
  ok('⭐ 題目＝指示＋四個句子全部擠在一起 → Choose the correct answer.',
     W.gnCleanStem('Circle the sentence with the correct capital letters. A. My family visited taipei zoo. B. My family visited Taipei Zoo. C. my family visited Taipei zoo.', opts) === 'Choose the correct answer.');
  ok('選項是整句 → 題目一律 Choose the correct answer.', W.gnCleanStem('Which sentence uses capital letters correctly?', opts) === 'Choose the correct answer.');
  ok('有空格的題目不動', W.gnCleanStem('There ________ a book.', ['is', 'are']) === 'There ________ a book.');
  ok('「Which word is a noun? "…"」選項是單字 → 不動（句子是題目的一部分）',
     W.gnCleanStem('Which word is a proper noun? "Mary Cassatt was a well-known painter."', ['Mary Cassatt', 'painter', 'well-known']) === 'Which word is a proper noun? "Mary Cassatt was a well-known painter."');
  ok('Which one is a collective noun?（選項是單字）→ 不動', W.gnCleanStem('Which one is a collective noun?', ['fans', 'audience', 'viewers']) === 'Which one is a collective noun?');
  ok('新出的選擇題經過驗證器就整理好', W.gnValidMcq({ q: 'Circle the correct sentence.', options: opts, answer: 1 }).q === 'Choose the correct answer.');
  const qm = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
  const player = qm.slice(qm.indexOf('function QuizModePlayer('), qm.indexOf('function WritingPracticePlayer('));
  ok('⭐ 已經建好的 ✏️ 出文法單元，播放時也顯示乾淨的題目（不用重出）', /\/\^gn\/\.test\(String\(item\.id[^)]*\)\)[^?]*\?\s*window\.gnCleanStem\(q\.q, q\.options\)/.test(player));
  ok('只套在 gn 單元（其他題型的題目不動）', (qm.match(/gnCleanStem/g) || []).length === 2 && player.indexOf('gnCleanStem') > 0);
  ok('gnCleanStem 有掛到 window', /aiJudgeTranslation, gnAnswerOk, gnNorm, gnValidLesson, gnValidStep, gnValidRewrite, gnCleanStem,/.test(data));
}

log.push('\n【9】（v430）選擇題答案要對：另一個 AI 自己作答交叉檢查＋選項要出自句子');
{
  const sent = 'Which word is a noun? "Luna is a smart cat."';
  ok('⭐ 選項不在句子裡（woman）→ 丟掉', W.gnValidMcq({ q: 'Which word is a proper noun? "Mary Cassatt was a well-known painter."', options: ['painter', 'Mary Cassatt', 'woman'], answer: 1 }) === null);
  ok('組合選項「park(common), Elm Street(proper)」→ 丟掉', W.gnValidMcq({ q: 'Which words are common and proper nouns? "We walked to the park on Elm Street."', options: ['park(common), Elm Street(proper)', 'We(common), walked(proper)'], answer: 0 }) === null);
  ok('選項都出自句子 → 收', !!W.gnValidMcq({ q: sent, options: ['smart', 'Luna', 'is'], answer: 1 }));
  ok('「is」不會被當成「this」的一部分（整個字比對）', W.gnValidMcq({ q: 'Which word is a noun? "This cat sleeps."', options: ['is', 'cat', 'sleeps'], answer: 1 }) === null);
  byKind.mcq = [[{ q: sent, options: ['smart', 'is', 'Luna'], answer: 1 }, { q: 'Which one is a collective noun?', options: ['fans', 'audience', 'viewers'], answer: 1 }],
                [{ q: 'Which word is a noun? "My brother plays the drums."', options: ['plays', 'the', 'brother'], answer: 2 }, { q: 'Which one is a collective noun?', options: ['uncle', 'family', 'aunt'], answer: 1 }]];
  byKind.check = [[[2], [1]], [[2], [1]]];   // 檢查者：第一題只有 Luna（2）對，不是出題說的 is（1）
  const n0 = calls.length;
  const p = await W.aiMakeGrammarPack({ topic: 'Nouns', notes: 'A noun names a person.', nMcq: 3, nFill: 0, nTr: 0, nRw: 0 });
  ok('⭐ 出題 AI 把名詞標成「is」→ 檢查者答 Luna → 這題丟掉', !p.mcq.some(q => q.q === sent), JSON.stringify(p.mcq.map(q => q.q)));
  ok('丟掉之後自動再出一輪補回來', p.mcq.length === 3, p.mcq.length + ' 題');
  const chk = calls.slice(n0).filter(c => /checking a quiz/.test(c.system));
  ok('檢查者看不到答案（只看題目和選項）', chk.length === 2 && !/answer/i.test(chk[0].messages[0].content.split('QUESTIONS')[1]), chk.length + ' 次');
  // v431（Alan 圖1）：「Rex, lie down and relax.」的 lie 和 relax 都是不及物動詞 → 兩個答案都對，要丟掉
  const twoOk = 'Which word is an intransitive verb? "Rex, lie down and relax."';
  byKind.mcq = [[{ q: twoOk, options: ['down', 'relax', 'lie'], answer: 2 }],
                [{ q: 'Which word is an intransitive verb? "The baby smiled at me."', options: ['baby', 'smiled', 'me'], answer: 1 }]];
  byKind.check = [[[1, 2]], [[1]]];          // 檢查者：第一題 relax 和 lie 都對 → 丟掉
  const p3 = await W.aiMakeGrammarPack({ topic: 'Verbs', notes: 'x', nMcq: 1, nFill: 0, nTr: 0, nRw: 0 });
  ok('⭐（v431）兩個選項都說得通（lie／relax 都是不及物動詞）→ 丟掉重出', !p3.mcq.some(q => q.q === twoOk), JSON.stringify(p3.mcq.map(q => q.q)));
  ok('（v431）重出的那一題只有一個答案 → 收下', p3.mcq.length === 1);
  ok('（v431）出題 prompt 也先叮嚀「不能有兩個選項都對」', /never let two options be acceptable/.test(data));
  byKind.check = [];
  byKind.mcq = [[{ q: 'There ________ a cat.', options: ['is', 'are'], answer: 0 }]];
  const p2 = await W.aiMakeGrammarPack({ topic: 'x', notes: 'x', nMcq: 1, nFill: 0, nTr: 0, nRw: 0 });
  ok('檢查本身失敗（網路）→ 不擋，照收', p2.mcq.length === 1);
}

// ═══ 6. 守門：新變數不能跑到別的播放器裡 ═══
// v428 踩到：同樣的「確認 · Check →」按鈕在聽寫（SpellingPlayer）和打字作答各有一個，
// 用「取代第一個符合的」把 judging 塞進了聽寫 → 學生一打開聽寫單元就 ReferenceError。
log.push('\n【6】守門：每個新變數只准出現在它所屬的函式裡（防「取代到別的播放器」）');
{
  const qm = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
  const starts = [...qm.matchAll(/^function ([A-Za-z0-9_]+)\s*\(/gm)].map(m => [m.index, m[1]]);
  const owner = (pos) => { let n = null; for (const [st, name] of starts) { if (st <= pos) n = name; else break; } return n; };
  const owners = (re) => new Set([...qm.matchAll(re)].map(m => owner(m.index)));
  const only = (label, re, allowed) => {
    const got = [...owners(re)];
    ok(`${label} 只出現在 ${allowed.join('／')}`, got.length > 0 && got.every(o => allowed.indexOf(o) >= 0), '實際出現在：' + got.join('、'));
  };
  only('judging（AI 判斷中）', /\bjudging\b|\bsetJudging\b/g, ['TypeAnswerPlayer']);
  only('isTr（中翻英模式）', /\bisTr\b/g, ['TypeAnswerPlayer']);
  only('showHint／setTip', /\bshowHint\b|\bsetShowHint\b|\bsetTip\b/g, ['TypeAnswerPlayer']);
  ok('⭐ 聽寫（SpellingPlayer）完全沒有被改到任何 v428 的東西',
     !/judging|isTr|showHint|setTip|gnAnswerOk|aiJudgeTranslation/.test(qm.slice(qm.indexOf('function SpellingPlayer('), qm.indexOf('function TypeAnswerIntro('))));
  const lockOwners = [...owners(/\blockLs\b|\blessonOf\b|\blessonGate\b/g)];
  ok('練習鎖（lessonOf／lockLs／lessonGate）都在同一個元件裡', lockOwners.length === 1, lockOwners.join('、'));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
