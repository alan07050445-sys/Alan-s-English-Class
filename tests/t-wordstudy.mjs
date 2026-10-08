/* t-wordstudy — v482 📘 一鍵出 Word Study
 * （Alan 2026-10-07 給了康橋課本 p5~p13＋他自己出的「短文找字」那一張）
 *
 * 康橋每一課的 Word Study 主題都不同（VCe 音節、後綴 -ty/-ity/-ic/-ment、
 * 母音組合 ai/ay/ea…），但**題型永遠是那幾種**，所以做成一個通用的一鍵生成。
 *
 * ⭐ 這個題型跟文法最大的差別：**答案程式驗得出來**（是不是 VCe、有沒有那個字尾、
 *   含不含那個母音組合都是拼字規則）。所以 AI 只負責想題材，對錯一律程式說了算。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data  = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed    = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const app   = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const tune  = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const qm    = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(W, stub, stub, stub);
const fnEnd = (s, a) => { const i = s.indexOf(a); const j = s.indexOf('\n}\n', i); return s.slice(i, j + 2); };
const build = new Function('window', fnEnd(ed, 'function wsBuildItems') + '\nreturn wsBuildItems;')({});

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const C = W.wsCheck;

console.log('\n【1】VCe：跟課本 p5 那張表的標準答案要完全一樣');
const TABLE = 'together imitate thirsty calendar emphasize outside contribute Internet sequence fascinate impose pause satisfied tissue survive cyclone teach evaporate advertise bathroom'.split(' ');
const got = TABLE.filter(w => C(w, { kind: 'vce' }));
ok('⭐ 挑出來的就是課本要的那 10 個',
   got.join(',') === 'imitate,emphasize,outside,contribute,fascinate,impose,survive,cyclone,evaporate,advertise');
ok('⭐ pause 不是 VCe（au 是母音組合，不是 V-C-e）', !C('pause', { kind: 'vce' }));
ok('⭐ tissue 不是（ue 不是子音＋e）', !C('tissue', { kind: 'vce' }));
ok('⭐ sequence 不是（-ence 的母音不長）', !C('sequence', { kind: 'vce' }));
ok('沒有字尾 e 的都不是', ['teach', 'together', 'Internet', 'bathroom'].every(w => !C(w, { kind: 'vce' })));

console.log('\n【2】其他三種規則');
ok('⭐ 字尾：-ment', ['enjoyment', 'payment', 'excitement'].every(w => C(w, { kind: 'suffix', args: ['-ment'] }))
   && !C('history', { kind: 'suffix', args: ['-ment'] }));
ok('   -ity 不會把 -ty 的字也算進去', C('community', { kind: 'suffix', args: ['-ity'] }) && !C('safety', { kind: 'suffix', args: ['-ity'] }));
ok('   字尾本身不算（"ment" 不是加了 -ment 的字）', !C('ment', { kind: 'suffix', args: ['-ment'] }));
ok('⭐ 母音組合：ea', ['meadow', 'increase', 'appeal'].every(w => C(w, { kind: 'team', args: ['ea'] }))
   && !C('betray', { kind: 'team', args: ['ea'] }));
ok('⭐ 字首：un-', C('unhappy', { kind: 'prefix', args: ['un-'] }) && !C('under', { kind: 'prefix', args: ['in-'] }));
ok('⭐ 不認得的規則回 null（＝程式不會判，整份退回）', C('x', { kind: 'nonsense' }) === null);

console.log('\n【3】AI 的產出整個被程式重驗一次');
const V = W.wsValidPack;
const good = { topic: 'VCe', rule: 'A VCe word ends with vowel, consonant, e.', ruleZh: 'VCe 結尾的母音唸長音，e 不發音',
  check: { kind: 'vce', args: [] },
  groups: [{ label: 'long a', words: ['imitate', 'evaporate', 'fascinate'] },
           { label: 'long i', words: ['survive', 'advertise', 'emphasize'] }],
  yes: ['impose', 'cyclone', 'outside', 'contribute', 'survive', 'advertise'],
  no: ['pause', 'teach', 'together', 'thirsty', 'tissue', 'bathroom'],
  mcq: [{ q: 'Which word has the VCe pattern?', options: ['impose', 'pause', 'teach', 'thirsty'], answer: 0 }],
  build: [], story: { title: 'The Kite', text: 'We went outside to fly a kite. The wind made it rise high above the trees. My sister said she would advertise our kite club at school. Then a cyclone of leaves spun past us. We did not impose on anyone. It was a fine day and we hope the club will survive until winter comes again.' } };
const p = V(good);
ok('⭐ 正常的收得下', !!p);
ok('⭐ 不符合規則的字會被踢出 yes', (() => {
  const r = V({ ...good, yes: good.yes.concat(['pause', 'teach']) });
  return r && r.yes.indexOf('pause') < 0 && r.yes.indexOf('teach') < 0; })());
ok('⭐ 分籃裡混進不符合的字也會被踢掉', (() => {
  const r = V({ ...good, groups: [{ label: 'x', words: ['imitate', 'pause', 'evaporate'] }, good.groups[1]] });
  return r && r.groups[0].words.indexOf('pause') < 0; })());
ok('⭐ 同一個字不可以出現在兩籃（分到哪都對）', (() => {
  const r = V({ ...good, groups: [{ label: 'a', words: ['imitate', 'survive', 'impose'] },
                                  { label: 'b', words: ['survive', 'advertise', 'cyclone'] }] });
  if (!r) return false;
  const all = r.groups.reduce((x, g) => x.concat(g.words.map(w => w.toLowerCase())), []);
  return new Set(all).size === all.length && all.filter(w => w === 'survive').length === 1; })());
ok('   去重之後不夠兩個字的那一籃就整籃不要（一個字的籃子不成題）', (() => {
  const r = V({ ...good, groups: [{ label: 'a', words: ['imitate', 'survive'] }, { label: 'b', words: ['survive', 'advertise'] }] });
  return !r || r.groups.every(g => g.words.length >= 2); })());
ok('⭐ 選擇題：四個選項裡有兩個符合規則 → 整題丟掉（不然兩個答案都對）',
   (V({ ...good, mcq: [{ q: 'x', options: ['impose', 'cyclone', 'teach', 'pause'], answer: 0 }] }) || {}).mcq.length === 0);
ok('⭐ 選擇題：一個符合的都沒有 → 也丟掉',
   (V({ ...good, mcq: [{ q: 'x', options: ['teach', 'pause', 'thirsty', 'together'], answer: 0 }] }) || {}).mcq.length === 0);
ok('⭐ 正解指錯了也會被改對（程式自己算答案）', (() => {
  const r = V({ ...good, mcq: [{ q: 'x', options: ['pause', 'impose', 'teach', 'thirsty'], answer: 0 }] });
  return r && r.mcq[0].answer === 1; })());
ok('⭐ 短文的答案是程式自己從文章裡找的，不是 AI 說的', p.story && p.story.answers.every(a => C(a, { kind: 'vce' })));
ok('⭐ 只收「整篇只出現一次」的字（出現兩次就不知道要點哪個）', (() => {
  const r = V({ ...good, story: { title: 't', text: good.story.text + ' We will survive the storm and survive the rain and have a good time outside today.' } });
  return !r || !r.story || r.story.answers.indexOf('survive') < 0; })());
ok('程式不會判的規則整份退回（寧可不出，也不要出錯的答案）', V({ ...good, check: { kind: 'magic' } }) === null);
ok('規則寫成中文也退回（學生看的是英文）', V({ ...good, rule: '母音子音 e' }) === null);
ok('加字尾題：答案不等於「base ＋ 詞綴」就丟掉', (() => {
  const r = V({ topic: 's', rule: 'Add -ment.', ruleZh: '加 -ment', check: { kind: 'suffix', args: ['-ment'] },
    groups: [], yes: ['enjoyment', 'payment', 'movement', 'agreement'], no: ['history', 'basic', 'safety', 'rarity'],
    mcq: [], build: [{ clue: 'the act of moving', base: 'move', answer: 'movement' },
                     { clue: 'the act of paying', base: 'pay', answer: 'payable' }], story: null });
  return r && r.build.length === 1 && r.build[0].answer === 'movement'; })());

console.log('\n【3.5】v484：一課可以有好幾個 pattern（康橋本來就是這樣出的）');
/* 🔴 真 AI 實測撈到的兩個問題：
   ① 主題是「-ty, -ity, -ic, -ment」四個，但只認 -ment
      → ability／basic／economic 全被當成「不符合」，但它們明明就是這一課的字
   ② 題目問「ea」，程式卻照「ai」算答案 → **正解是錯的**（straight 不是 ea） */
const MULTI = { topic: 'Vowel Teams', rule: 'Two vowels make one sound.', ruleZh: '兩個母音發一個音',
  check: { kind: 'team', args: ['ai', 'ay', 'ea', 'ee', 'oa'] },
  groups: [{ label: 'ai words', arg: 'ai', words: ['straight', 'campaign', 'acquaint'] },
           { label: 'ea words', arg: 'ea', words: ['meadow', 'increase', 'appeal'] }],
  yes: ['straight', 'meadow', 'betray', 'proceed', 'reproach', 'increase', 'appeal', 'array'],
  no: ['virtue', 'continue', 'revenue', 'marrow', 'acquire', 'module', 'cyclone', 'envelope'],
  mcq: [{ q: 'Which word has the ea vowel team?', options: ['straight', 'meadow', 'display', 'always'], answer: 0 }],
  build: [], story: null };
const m = V(MULTI);
ok('⭐ 符合「任何一個」pattern 的字都算（本來只認第一個）', !!m && m.yes.length === 8);
ok('⭐ 題目問 ea 就照 ea 算答案（v482 會標成 straight，那是 ai）',
   m && m.mcq.length === 1 && m.mcq[0].options[m.mcq[0].answer] === 'meadow');
ok('⭐ 每一籃只收自己那一個 pattern 的字',
   m && m.groups[0].arg === 'ai' && m.groups[1].arg === 'ea'
   && m.groups[1].words.every(w => C(w, { kind: 'team', args: ['ea'] })));
ok('籃子沒寫 arg 就從名稱猜', (() => {
  const r = V({ ...MULTI, groups: [{ label: 'ai words', words: ['straight', 'campaign'] },
                                   { label: 'ea words', words: ['meadow', 'increase'] }] });
  return r && r.groups[0].arg === 'ai' && r.groups[1].arg === 'ea'; })());
ok('⭐ 一題問兩種 pattern 就丟掉（說不清楚要哪個）',
   (V({ ...MULTI, mcq: [{ q: 'Which word has the ea or oa vowel team?', options: ['straight', 'meadow', 'display', 'always'], answer: 0 }] }) || {}).mcq.length === 0);
ok('⭐ 除了 vce，沒講明是哪些詞綴／字母就整份退回',
   V({ ...MULTI, check: { kind: 'team', args: [] } }) === null);
ok('vce 不需要 args', !!V({ ...MULTI, check: { kind: 'vce', args: [] },
  groups: [{ label: 'long i', words: ['survive', 'advertise'] }, { label: 'long o', words: ['impose', 'cyclone'] }],
  yes: ['survive', 'advertise', 'impose', 'cyclone', 'outside', 'contribute'],
  no: ['pause', 'teach', 'together', 'thirsty', 'tissue', 'bathroom'],
  mcq: [{ q: 'Which word has the VCe pattern?', options: ['impose', 'pause', 'teach', 'thirsty'], answer: 0 }] }));
/* ⚠ 比對前要先把註解拿掉——說明裡本來就會引用那個錯誤寫法，不拿掉會自己打到自己。 */
const noComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
ok('⭐ 不可以寫 .filter(hit)——Array.filter 會把「索引」當第二個參數，第 2 個字以後全判錯',
   !/\.filter\(hit\)/.test(noComments(data)) && /不可以直接 `\.filter\(hit\)`/.test(data));

console.log('\n【4】組成單元（全部沿用既有題型，不新增）');
const items = build({ pack: p, title: 'Unit 1 · VCe', kinds: ['lesson', 'circle', 'sort', 'mcq', 'build', 'story'] });
ok('⭐ 建得出東西', items.length >= 3);
ok('⭐ 沒有新題型（v414 的教訓：新題型要補 AUTO_STAR_KIND、QM_TYPE_WORDS…）',
   items.every(i => ['lesson', 'circle-answer', 'word-sort', 'quiz', 'type-answer'].indexOf(i.type) >= 0));
ok('⭐ 先學一下是程式直接拼的，不是 AI 生的（所以不會教錯）',
   /互動教學是\*\*程式直接拼的\*\*/.test(ed) && (items.find(i => i.type === 'lesson') || {}).steps.length >= 2);
ok('⭐ 其他單元都被教學卡鎖住（學完才能練）',
   items.filter(i => i.type !== 'lesson').every(i => i.requires === items[0].id));
ok('⭐ 圈出來：每一列都有正確答案，而且答案真的符合規則', (() => {
  const ci = items.find(i => i.type === 'circle-answer' && !i.passage);
  return ci && ci.circleQuestions.every(q => q.answers.length && q.answers.every(a => C(a, { kind: 'vce' }))); })());
ok('   而且答案不會永遠排在前面（有洗過）', /洗一下，不然答案永遠在前面/.test(ed));
ok('⭐ 短文找字：一句一題，答案來自那一句', (() => {
  const st = items.find(i => i.type === 'circle-answer' && i.passage);
  return st && st.circleQuestions.every(q => q.answers.every(a => q.sentence.toLowerCase().indexOf(a.toLowerCase()) >= 0)); })());
ok('只勾一種就只出一種', build({ pack: p, title: 't', kinds: ['mcq'] }).every(i => i.type === 'quiz'));
ok('什麼都沒勾就不出東西', build({ pack: p, title: 't', kinds: [] }).length === 0);

console.log('\n【4.5】v485：Alan 回報的三件');
/* ① 短文找字要像一篇文章，不是一句一個框、每個字撐開
   ② 互動教學要把**每一種**都講到（他截到只講了 -ty 就結束）
   ③ 分籃名稱被切成「-ity (qu」 */
const SUF = { topic: 'Suffixes', rule: 'We add -ty, -ity, -ic, or -ment to base words.',
  ruleZh: '加 -ty、-ity、-ic、-ment 造新字', check: { kind: 'suffix', args: ['-ty', '-ity', '-ic', '-ment'] },
  groups: [{ label: '-ty', arg: '-ty', means: 'state of', zh: '-ty 是「狀態」', words: ['safety', 'loyalty', 'majesty'] },
           { label: '-ity', arg: '-ity', means: 'quality of', zh: '-ity 是「品質」', words: ['ability', 'community', 'creativity'] },
           { label: '-ic', arg: '-ic', means: 'relating to', zh: '-ic 是「跟…有關」', words: ['basic', 'economic', 'historic'] },
           { label: '-ment', arg: '-ment', means: 'act of', zh: '-ment 是「動作」', words: ['enjoyment', 'payment', 'management'] }],
  yes: ['safety', 'ability', 'basic', 'enjoyment', 'loyalty', 'economic'],
  no: ['microscope', 'envelope', 'acquire', 'module', 'cyclone', 'impose'],
  mcq: [], build: [],
  story: { title: 'A Day at School', text: 'Max had great creativity and ability to build things. His community school held a contest for the best invention. He created a basic microscopic camera to look at tiny bugs. His project showed economic thinking and excellent management skills. The judges gave him enjoyment by awarding first prize.' } };
/* ⚠ 一定要先過 wsValidPack——短文的答案是**驗證器自己從文章裡找出來**的，
   直接把生資料丟給 wsBuildItems 會因為沒有 answers 而不出短文單元。 */
const sufPack = V(SUF);
const sufItems = build({ pack: sufPack, title: 'Unit 2', kinds: ['lesson', 'story', 'sort'] });
const lesson = sufItems.find(i => i.type === 'lesson');

ok('⭐ ② 互動教學：一組一步，四種字尾全部講到',
   ['-ty', '-ity', '-ic', '-ment'].every(x => lesson.steps.some(st => st.kind === 'learn' && st.say.indexOf(x) >= 0)));
ok('⭐ ② 每一步都用那一組自己的字當例子（本來只有兩個例子就結束）',
   lesson.steps.filter(st => st.kind === 'learn').every(st => st.examples.length >= 2)
   && lesson.steps.filter(st => st.kind === 'learn').length === 4);
ok('   講完每一種才動手（分一分排在所有講解後面）', (() => {
   const lastLearn = lesson.steps.map(st => st.kind).lastIndexOf('learn');
   const sortAt = lesson.steps.map(st => st.kind).indexOf('sort');
   return sortAt > lastLearn; })());
ok('   最後有一題小試身手', lesson.steps[lesson.steps.length - 1].kind === 'pick');
ok('只有一組時也要能出（退回用整條規則講一次）', (() => {
   const one = build({ pack: { ...SUF, groups: [SUF.groups[0]] }, title: 't', kinds: ['lesson'] })[0];
   return one && one.steps.filter(st => st.kind === 'learn').length >= 1; })());

const st2 = sufItems.find(i => i.type === 'circle-answer' && i.passage);
ok('⭐ ① 短文找字標成「整篇文章」模式', !!st2 && st2.circleProse === true);
ok('   文章標題帶過去（學生要知道在讀什麼）', st2.storyTitle === 'A Day at School');
ok('⭐ ① 學生端真的有一條「整篇文章」的畫面，不是一句一個框',
   /item\.circleProse \? \(/.test(qm) && /className="circle-prose"/.test(qm));
ok('   點字的邏輯沿用同一套（沒有另寫一份判分）',
   (qm.match(/setSelectedWords\(prev => \{/g) || []).length === 2);
ok('   排版是正常文章（不是每個字一個框）',
   /\.circle-prose \.circle-word \{[\s\S]{0,160}display: inline;/.test(tune)
   && /margin: 0 -3px/.test(tune));

ok('⭐ ③ 籃子名稱只放詞綴，括號裡的意思被拆到 means', (() => {
   const r = V({ ...SUF, groups: [{ label: '-ity (quality of)', arg: '-ity', words: ['ability', 'community'] },
                                  { label: '-ment', arg: '-ment', means: 'act of', words: ['payment', 'enjoyment'] }] });
   return r && r.groups[0].label === '-ity' && r.groups[0].means === 'quality of'; })());
ok('   中文括號也拆得掉', (() => {
   const r = V({ ...SUF, groups: [{ label: '-ity（品質）', arg: '-ity', words: ['ability', 'community'] },
                                  { label: '-ment', arg: '-ment', words: ['payment', 'enjoyment'] }] });
   return r && r.groups[0].label === '-ity'; })());
ok('   名稱再長也不會被切（畫面會折行，不裁切）',
   /\.ws-col-head \{[^}]*overflow-wrap: anywhere/.test(tune)
   && !/\.ws-col-head \{[^}]*text-overflow: ellipsis/.test(tune));
/* ⚠ 拆掉括號只做一半——意思被抽出來卻沒人顯示，等於「quality of 還是不見了」，
   那正是 Alan 抱怨的事。所以要一路驗到學生端畫得出來。 */
ok('⭐ ③ 拆出來的意思要真的出現在畫面上（不是被丟掉）', (() => {
   const it = build({ pack: sufPack, title: 'u', kinds: ['sort'] }).find(i => i.type === 'word-sort');
   return it && it.sortHints && it.sortHints['-ity'] === 'quality of' && it.sortHints['-ic'] === 'relating to'; })());
ok('   學生端三個地方（作答／你的答案／正確答案）都畫小字',
   (qm.match(/className="ws-col-hint"/g) || []).length === 3
   && /\.ws-col-hint \{/.test(tune));

console.log('\n【4.6】三種主題都要能用（Alan：「確認是用在每一個 word study 主題上面」）');
/* ⚠ 測試資料要跟真 AI 的量級一樣（8~12 個字、短文 60~110 字）。
   給太少的話「圈出來」排不出兩列、短文也會因為太短被擋掉——
   那是我的 fixture 太薄，不是程式有問題（第一次寫就踩到了）。 */
[['VCe', { kind: 'vce', args: [] },
  [{ label: 'long a', words: ['imitate', 'evaporate', 'fascinate'] }, { label: 'long i', words: ['survive', 'advertise', 'emphasize'] }],
  ['impose', 'cyclone', 'outside', 'contribute', 'escape', 'complete', 'invite', 'decide'],
  ['pause', 'teach', 'together', 'tissue', 'thirsty', 'calendar', 'bathroom', 'sequence'],
  'We went outside to ride a bike beside the lake. The water was fine and the sun made the whole place shine. Jake did not want to impose on anyone, so he took a rope and tied it to a pine tree. Later we had to escape a sudden storm and drive home. It was a fine day and nobody wanted it to come to an end so soon.'],
 ['後綴', { kind: 'suffix', args: ['-ty', '-ity', '-ic', '-ment'] }, SUF.groups, SUF.yes, SUF.no, SUF.story.text],
 ['母音組合', { kind: 'team', args: ['ai', 'ay', 'ea', 'ee', 'oa'] },
  [{ label: 'ai', arg: 'ai', words: ['rain', 'paint', 'trail'] }, { label: 'ea', arg: 'ea', words: ['meadow', 'beach', 'dream'] }],
  ['betray', 'proceed', 'increase', 'array', 'reproach', 'appeal', 'yesterday', 'straight'],
  ['virtue', 'module', 'cyclone', 'acquire', 'continue', 'revenue', 'impose', 'envelope'],
  'The team walked down a long road to reach the green meadow. Light rain fell on the trail, so they had to wait under an oak tree and play a quiet game. Later the sun came out and they could see a boat sail past on the deep blue sea. On the way home they found a coin in the sand and agreed to keep it safe until the next day.'],
].forEach(([name, chk, gs, yes, no, text]) => {
  const pk = V({ topic: name, rule: 'Follow the pattern.', ruleZh: '照規則找字', check: chk,
    groups: gs, yes, no, mcq: [], build: [], story: { title: 'T', text } });
  const items = pk ? build({ pack: pk, title: name, kinds: ['lesson', 'circle', 'sort', 'mcq', 'build', 'story'] }) : [];
  ok(`⭐ ${name}：驗得過、而且建得出單元`, !!pk && items.length >= 3);
  ok(`   ${name}：互動教學每一組都講到`, (() => {
    const l = items.find(i => i.type === 'lesson');
    return l && l.steps.filter(x => x.kind === 'learn').length === Math.min(5, pk.groups.length); })());
  ok(`   ${name}：短文是整篇文章模式`, (() => {
    const t = items.find(i => i.type === 'circle-answer' && i.passage);
    return !pk.story || (t && t.circleProse === true); })());
  ok(`   ${name}：短文的答案都真的符合規則`, (() => {
    const t = items.find(i => i.type === 'circle-answer' && i.passage);
    return !t || t.circleQuestions.every(q => q.answers.every(a => C(a, chk))); })());
});

console.log('\n【5】整條路有接起來');
ok('⭐ data.js 掛出去了', typeof W.aiMakeWordStudy === 'function' && typeof W.wsValidPack === 'function' && typeof W.wsCheck === 'function');
ok('⭐ 老師端有視窗', /function WordStudyModal\(/.test(ed) && /WordStudyModal, wsBuildItems, WS_KINDS \}\)/.test(ed));
ok('⭐ 編輯列有第四顆按鈕', /一鍵出 Word Study/.test(shell) && /onWordStudy/.test(shell));
ok('⭐ app.jsx 有接上', /const handleWordStudy = /.test(app) && /onWordStudy=\{/.test(app) && /window\.WordStudyModal/.test(app));
ok('⭐ 指派走跟一鍵出單字同一套（學期設作業／暑假派給學生）',
   /不要另寫一份——那兩段邏輯一分家就會有一邊忘了更新/.test(app)
   && /items\.forEach\(it => \{ w\[weekId\]\.homework\[it\.id\] = \{ dueDate: assign\.dueDate \}; \}\);/.test(app.slice(app.indexOf('const handleWordStudy'))));
ok('⭐ 指派那一段用函式不是元件（v380 踩過：用元件會每次重掛，勾第二個學生時第一個點不到）',
   /const assignBox = \(\) => \(/.test(ed.slice(ed.indexOf('function WordStudyModal'))));
ok('被擋掉會告訴 AI 原因（v480 的教訓）', /Your previous answer was REJECTED by a checker/.test(data.slice(data.indexOf('async function aiMakeWordStudy'))));

console.log(`\n${fail ? '❌' : '✅'} t-wordstudy：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
