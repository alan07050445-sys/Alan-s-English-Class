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
const _aiAsk = async (body, pickFn) => {
  calls.push(body);
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
  code + '\nreturn { aiReadGrammarSheet, aiMakeGrammarPack, aiMakeGrammarLesson, aiJudgeTranslation, gnAnswerOk, gnNorm, gnValidStep, gnValidLesson, gnValidFill, gnValidRewrite, gnValidMcq, GN_READ_MODEL, GN_MODEL };')(
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
