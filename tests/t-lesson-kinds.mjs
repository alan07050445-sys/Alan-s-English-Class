/* t-lesson-kinds — v443 互動教學的題型與短文的語言
 * Alan 回報：① 一鍵生成的短文出現中文（一定只能英文）② 教 noun 卻叫小朋友把 cat 改成 dog
 * ③ 例句跟圖片完全沒關係 ④ 教 noun 為什麼要組合句子 ⑤ 題型不夠多元（要能「找出來」與「分類」）
 * 不連網路：AI 的回答用假的，只測程式本身的把關。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data   = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const qm     = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const editor = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const css    = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };

let aiQueue = []; const calls = [];
const _aiAsk = async (body, pickFn) => {
  calls.push(body);
  for (let k = 0; k < 3; k++) {                      // 真的 _aiAsk 同一輪會重問三次
    const next = aiQueue.shift();
    if (next === undefined) throw new Error('mock 用完了');
    if (next instanceof Error) throw next;
    const got = pickFn({ content: [{ type: 'text', text: typeof next === 'string' ? next : JSON.stringify(next) }] });
    if (got != null) return got;
  }
  throw new Error('AI 出題失敗（回傳格式看不懂），請再試一次。');
};
const code = slice(data, 'const VOCAB_BANDS = {', 'function _aiStripFence') + '\n' +
             slice(data, 'const GN_MODEL', 'function grCountBlanks');
const W = new Function('_aiAsk', '_aiStripFence', '_AI_MINIFY',
  code + '\nreturn { gnValidStep, gnValidLesson, aiMakeGrammarLesson, _gnFixPairOk, _gnLessonPlan, _gnFixImgHint,' +
         ' storyCheck, storyFix, _storyScore, aiMakeVocabStory, AI_STORY_SYS, GN_LESSON_SYS };')(
  _aiAsk, (t) => String(t).replace(/^```(json)?/, '').replace(/```$/, '').trim(), '');

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('  ✅ ' + name); } else { fail++; console.log('  ❌ ' + name); } };
const eq = (name, a, b) => ok(name + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);

console.log('\n【1】👉 找出來（tap）：在句子裡點出目標字');
const tap = (o) => W.gnValidStep(Object.assign({ kind: 'tap', q: '點出句子裡的名詞', sentence: 'The dog runs in the park.', answers: ['dog', 'park'], why: '狗和公園都是名詞' }, o));
ok('正常的一步收下', !!tap({}) && tap({}).answers.length === 2);
ok('答案照原樣留著（大小寫不動）', tap({ sentence: 'Amy lives in Taipei.', answers: ['Amy', 'Taipei'] }).answers.join('/') === 'Amy/Taipei');
ok('⭐ 答案在句子裡出現兩次 → 丟掉（點哪一個都對，孩子會困惑）', !tap({ sentence: 'The dog sees the dog.', answers: ['dog'] }));
ok('答案根本不在句子裡 → 丟掉', !tap({ answers: ['cat'] }));
ok('沒有答案 → 丟掉', !tap({ answers: [] }));
ok('同一個答案寫兩次 → 丟掉', !tap({ answers: ['dog', 'dog'] }));
ok('句子太短 → 丟掉', !tap({ sentence: 'Go now.', answers: ['now'] }));
ok('答案帶標點也認得（park.）', !!tap({ answers: ['park.'] }));
ok('沒寫指示語時給預設的', tap({ q: '' }).q.length > 0);
ok('指示語會轉正體', tap({ q: '点出名词' }).q.indexOf('點出') === 0);

console.log('\n【2】🗂 分一分（sort）：把字分到 2-3 個籃子');
const G = [{ label: '人', items: ['teacher', 'doctor'] }, { label: '地方', items: ['park', 'school'] }];
const sort = (o) => W.gnValidStep(Object.assign({ kind: 'sort', q: '這些字是人還是地方？', groups: G, why: '' }, o));
ok('正常的一步收下', !!sort({}) && sort({}).groups.length === 2);
ok('三籃也可以', !!sort({ groups: G.concat([{ label: '東西', items: ['pencil', 'book'] }]) }));
ok('⭐ 同一個字出現在兩籃 → 丟掉（分到哪都算錯）', !sort({ groups: [{ label: '人', items: ['park'] }, { label: '地方', items: ['park', 'school'] }] }));
ok('只有一籃 → 丟掉', !sort({ groups: [G[0]] }));
ok('四籃 → 丟掉（小朋友選不完）', !sort({ groups: G.concat([{ label: '東西', items: ['pen'] }, { label: '動物', items: ['cat'] }]) }));
ok('籃子沒有名字 → 那一籃不算，剩一籃就丟掉', !sort({ groups: [{ label: '', items: ['a', 'b'] }, G[0]] }));
ok('兩籃同名 → 丟掉', !sort({ groups: [G[0], { label: '人', items: ['park'] }] }));
ok('籃子名稱會轉正體', sort({ groups: [{ label: '地方', items: ['park', 'school'] }, { label: '东西', items: ['pen'] }] }).groups[1].label === '東西');

console.log('\n【3】🔍 找錯字：錯的字一定要是「文法錯」，不是換一個字');
const pairOk = W._gnFixPairOk;
ok('⭐ cat → dog 不是錯字（Alan 圖2 的那一題）', !pairOk('cat', 'dog'));
ok('teacher → friend 也不是', !pairOk('teacher', 'friend'));
ok('taipei → Taipei（大小寫）是', pairOk('taipei', 'Taipei'));
ok('cat → cats（單複數）是', pairOk('cat', 'cats'));
ok('child → children（不規則）是', pairOk('child', 'children'));
ok('go → goes 是', pairOk('go', 'goes'));
ok('go → went 是', pairOk('go', 'went'));
ok('run → running 是', pairOk('run', 'running'));
ok('study → studies 是', pairOk('study', 'studies'));
ok('a → an 是', pairOk('a', 'an'));
ok('is → are 是', pairOk('is', 'are'));
ok('in → on（介系詞）是', pairOk('in', 'on'));
ok('much → many 是', pairOk('much', 'many'));
ok('big → bigger 是', pairOk('big', 'bigger'));
ok('一模一樣 → 不是（沒有改到）', !pairOk('cat', 'cat'));
const fix = (o) => W.gnValidStep(Object.assign({ kind: 'fix', sentence: 'I like my teacher and cat.', wrong: 'cat', right: 'dog', why: '' }, o));
ok('⭐ 整步一起驗：cat → dog 的那一步被丟掉', !fix({}));
ok('同一句換成 cat → cats 就收下', !!fix({ sentence: 'I have two cat.', wrong: 'cat', right: 'cats' }));

console.log('\n【4】這一課該不該出「排句子」（Alan：「為什麼要組合句子」）');
const planOf = (t, n) => W._gnLessonPlan(t, n || '');
eq('教 noun → 禁掉 order', planOf('Nouns', 'A noun is a person, place or thing.').ban.join(), 'order');
eq('教「名詞」（中文）→ 禁掉 order', planOf('名詞', '').ban.join(), 'order');
eq('教 adjectives → 禁掉 order', planOf('Adjectives', '').ban.join(), 'order');
eq('教 word order → 不禁（排句子正是重點）', planOf('Sentence structure and word order', '').ban.join(), '');
eq('教疑問句 → 不禁', planOf('名詞在疑問句裡的語序', '').ban.join(), '');
eq('教過去式 → 不禁', planOf('Past tense', 'Add -ed to the verb.').ban.join(), '');
eq('教名詞複數 → 不禁（cat→cats 這種錯字題很合適）', planOf('Plural nouns', 'Add -s to most nouns.').ban.join(), '');
eq('教專有名詞大寫 → 不禁', planOf('Proper nouns and capital letters', '').ban.join(), '');
ok('認出來型會叫 AI 用 tap／sort', /tap.*sort|sort.*tap/s.test(planOf('Nouns', '').text));
ok('認出來型會明講不要用 order', /Do NOT use "order"/.test(planOf('Nouns', '').text));

console.log('\n【5】例句跟圖片要有關係（Alan：「圖3 例句跟圖片完全沒關係」）');
const learn = (hint) => ({ kind: 'learn', say: '地方是名詞', imgHint: hint, examples: [{ en: 'The park is big.', hl: ['park'], zh: '公園很大' }] });
ok('⭐ 不相干的 imgHint（classroom）→ 換成例句自己的關鍵字', W._gnFixImgHint(learn('classroom students')).imgHint === 'park big');
ok('相干的 imgHint（big city park）→ 原封不動', W._gnFixImgHint(learn('big city park')).imgHint === 'big city park');
ok('沒有 imgHint → 補上例句的關鍵字', W._gnFixImgHint(learn('')).imgHint === 'park big');
ok('只抓實詞（the/is 不算）', W._gnFixImgHint({ kind: 'learn', say: 'x', imgHint: 'sofa', examples: [{ en: 'I have a pencil.', hl: [], zh: '' }] }).imgHint === 'pencil');
ok('不是 learn 的步驟不動它', W._gnFixImgHint({ kind: 'pick', q: 'a' }).kind === 'pick');

console.log('\n【6】整份互動教學：教 noun 出的是「找出來／分類」，不是「組合句子」');
const learnStep = (n) => ({ kind: 'learn', say: '名詞是人事物' + n, imgHint: 'park bench', examples: [{ en: 'The park is big.', hl: ['park'], zh: '公園很大' }] });
const goodLesson = {
  lead: '名詞就是人、地方和東西', outro: '換你練習！',
  steps: [learnStep(1), { kind: 'tap', q: '點出名詞', sentence: 'The dog runs in the park.', answers: ['dog', 'park'], why: '' },
          learnStep(2), { kind: 'sort', q: '人還是地方？', groups: G, why: '' }],
};
aiQueue = [goodLesson];
const L1 = await W.aiMakeGrammarLesson({ topic: 'Nouns', notes: 'A noun is a person, place or thing.' });
eq('一次過關', L1.steps.length, 4);
ok('題型就是 tap 與 sort', L1.steps.map(s => s.kind).join() === 'learn,tap,learn,sort');
ok('prompt 裡帶了這一課的 LESSON PLAN', /LESSON PLAN/.test(String(calls[0].messages[0].content)));

calls.length = 0;
const withOrder = { ...goodLesson, steps: [learnStep(1), { kind: 'order', zh: '狗在公園裡。', words: ['The', 'dog', 'is', 'in', 'the', 'park.'] }, learnStep(2), { kind: 'order', zh: '我有鉛筆。', words: ['I', 'have', 'a', 'pencil.'] }] };
aiQueue = [withOrder, goodLesson];
const L2 = await W.aiMakeGrammarLesson({ topic: 'Nouns', notes: 'A noun is a person, place or thing.' });
ok('⭐ 教 noun 的 order 步驟被擋下來、重問一次', L2.steps.map(s => s.kind).join() === 'learn,tap,learn,sort');
ok('回饋有講清楚是「這一課不適合這個題型」', /does not suit this grammar point/.test(String(calls[1].messages[0].content)));

calls.length = 0;
const withBadFix = { ...goodLesson, steps: [learnStep(1), { kind: 'fix', sentence: 'I like my teacher and cat.', wrong: 'cat', right: 'dog', why: '' }, learnStep(2), { kind: 'tap', q: '點出名詞', sentence: 'The dog runs in the park.', answers: ['dog'], why: '' }] };
aiQueue = [withBadFix, goodLesson];
const L3 = await W.aiMakeGrammarLesson({ topic: 'Nouns', notes: 'A noun is a person, place or thing.' });
ok('⭐ cat→dog 那一步被擋下來、重問一次', L3.steps.map(s => s.kind).join() === 'learn,tap,learn,sort');
ok('回饋有講是「不是文法錯」', /not a grammar mistake/.test(String(calls[1].messages[0].content)));

calls.length = 0;
aiQueue = [{ ...goodLesson, steps: [{ ...learnStep(1), imgHint: 'happy classroom' }, goodLesson.steps[1], { ...learnStep(2), imgHint: 'library books' }, goodLesson.steps[3]] }];
const L4 = await W.aiMakeGrammarLesson({ topic: 'Nouns', notes: 'A noun is a person, place or thing.' });
ok('⭐ 整份出來時，不相干的配圖關鍵字已經被換掉', L4.steps.filter(s => s.kind === 'learn').every(s => s.imgHint === 'park big'));

console.log('\n【7】最後一步不可以是「學」（學完沒得練就結束了）');
calls.length = 0;
const trailing = { ...goodLesson, steps: goodLesson.steps.concat([learnStep(3)]) };
aiQueue = [trailing];
const L6 = await W.aiMakeGrammarLesson({ topic: 'Nouns', notes: 'A noun is a person, place or thing.' });
ok('⭐ 結尾多出來的「學」被砍掉', L6.steps.map(s => s.kind).join() === 'learn,tap,learn,sort');
calls.length = 0;
aiQueue = [{ ...goodLesson, steps: [learnStep(1), goodLesson.steps[1], learnStep(2)] }, goodLesson];
const L7 = await W.aiMakeGrammarLesson({ topic: 'Nouns', notes: 'A noun is a person, place or thing.' });
ok('砍完不夠步數 → 重問一次，回饋講明原因', L7.steps.length === 4 && /ended with a "learn" step/.test(String(calls[1].messages[0].content)));

console.log('\n【8】教語序的單元照樣可以出「排句子」');
calls.length = 0;
aiQueue = [withOrder];
const L5 = await W.aiMakeGrammarLesson({ topic: 'Word order in a sentence', notes: 'Subject + verb + object.' });
ok('order 收下（沒有被擋）', L5.steps.map(s => s.kind).join() === 'learn,order,learn,order');

console.log('\n【9】一鍵生成的短文一定只能英文（Alan：「我不要中文的」）');
ok('prompt 有寫死 ENGLISH ONLY', /ENGLISH ONLY/.test(W.AI_STORY_SYS));
const zhStory = '一個晚上，媽媽和小明在家裡。所有的[lights]都關了。他們找到一個[flashlight]。';
const enStory = 'One night the [lights] went out. Mom found a [flashlight] in the drawer. They waited together.';
ok('storyCheck 抓得到中文', W.storyCheck(zhStory, ['lights', 'flashlight']).zh.length > 0);
ok('英文的短文 zh 是空的', W.storyCheck(enStory, ['lights', 'flashlight']).zh === '');
ok('⭐ 中文短文的分數比「漏了字的英文短文」還差', W._storyScore(W.storyCheck(zhStory, ['lights', 'flashlight'])) > W._storyScore({ missing: ['a', 'b', 'c'], leaked: [], extra: [], zh: '' }));

console.log('\n【9b】空格後面的 ( ) 只能是「字尾」，不能是詞性標記');
const fixed = W.storyFix('A big [storm](n) came. All the [lights](s) went out. We [check](v) it was [quiet](adj). The bird was [soaring](ing) away.',
  [{ term: 'storm' }, { term: 'light' }, { term: 'check' }, { term: 'quiet' }, { term: 'soar' }]);
ok('⭐ (n)(v)(adj) 這種詞性標記被拿掉', !/\((n|v|adj|adv)\)/.test(fixed.passage));
ok('真的字尾提示留著：light → lights 的 (s)', /\[lights\]\(s\)/.test(fixed.passage));
ok('真的字尾提示留著：soar → soaring 的 (ing)', /\[soaring\]\(ing\)/.test(fixed.passage));
ok('沒有變化的字就沒有提示（storm 不該有 (s)）', /\[storm\] came/.test(fixed.passage));
ok('有跟老師說改了什麼', (fixed.notes || []).some(n => /字尾提示/.test(n)));
ok('挖空的字一個都沒少', fixed.check.missing.length === 0 && fixed.check.blanks === 5);
ok('prompt 也叮嚀了不要寫詞性', /Never write a part of speech/.test(W.AI_STORY_SYS));

aiQueue = [{ title: '停電了', passage: zhStory }, { title: '停電了', passage: zhStory }, { title: '停電了', passage: zhStory },
           { title: 'The Blackout', passage: enStory }];
const st1 = await W.aiMakeVocabStory([{ term: 'lights' }, { term: 'flashlight' }], { grade: 'g2' });
ok('⭐ 中文那一篇不會被交出去，會再問到英文的為止', st1.passage === enStory);
eq('交出來的短文沒有中文', W.storyCheck(st1.passage, ['lights', 'flashlight']).zh, '');

console.log('\n【10】學生端與老師端都認得新題型');
ok('學生端有「找出來」的畫面', /cur\.kind === 'tap'/.test(qm));
ok('學生端有「分一分」的畫面', /cur\.kind === 'sort'/.test(qm));
ok('找出來：全部找到才算過關', /done2 = g\.length >= cur\.answers\.length/.test(qm));
ok('分一分：全部分完才算過關', /ok: n2 >= items\.length/.test(qm));
ok('分一分：中途錯過就不算「一次答對」', /markFirst\(!s0\.everBad\)/.test(qm));
ok('老師端校稿頁可以編輯 tap', /st\.kind === 'tap' &&/.test(editor));
ok('老師端校稿頁可以編輯 sort', /st\.kind === 'sort' &&/.test(editor));
ok('老師端的題型中文名有補上', /tap: '👉 找出來', sort: '🗂 分一分'/.test(editor));
ok('CSS 有新題型的樣式', /\.gnl-bins/.test(css) && /\.gnl-word\.got/.test(css) && /\.gnl-chip-now/.test(css));
ok('GN_LESSON_SYS 有教 AI 什麼時候用哪一種', /CHOOSING THE INTERACTION/.test(W.GN_LESSON_SYS));
ok('GN_LESSON_SYS 有叮嚀 imgHint 要跟例句有關', /WHAT THE FIRST EXAMPLE SENTENCE IS ABOUT/.test(W.GN_LESSON_SYS));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
