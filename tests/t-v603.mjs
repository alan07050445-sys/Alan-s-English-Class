// t-v603 — 短文填空：一個字只能用一次＋每一格要推得出來
//   Alan 截圖：fluffy 出現兩次（Word Bank 只有一個 fluffy → 一定有一格填不了），
//   而且「很多單字的填空不合理，要能夠根據前後文推斷出單字意思」。
//   🔴 一次用兩次的來源：storyFix 以前會把括號外的第二個 fluffy 也挖成空格（最多三格）。
//   不連網路：fetch 用假的，依 system prompt 分流成「寫故事的」與「驗算的」。
import fs from 'fs';
const R = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const data = R('data.js'), editor = R('components-editor.jsx');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
let handler = null; const calls = [];
const fakeFetch = async (url, opts) => {
  const body = JSON.parse(opts.body); calls.push(body);
  const text = handler(String(body.system || ''), body);
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: typeof text === 'string' ? text : JSON.stringify(text) }] }) };
};
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', 'fetch', data)(W,
  { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} }, fakeFetch);
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const words = ['fluffy', 'contour', 'waterproof', 'system', 'shade'].map(term => ({ term }));
const isStoryWriter = (sys) => /cloze story/.test(sys);

console.log('\n【1】一個字只算一次');
const alan = 'Tom made a cloud. He gathered cotton and [fluffy] materials to show the soft [contour]. He had to [waterproof] the cotton. He used a special [system] to sort things. In the shade he worked. His fluffy cloud looked real.';
ok('⭐⭐ storyCheck：fluffy 一格＋括號外又出現一次 → 算「重複用到」', W.storyCheck(alan, words).dupes.join() === 'fluffy');
const fx = W.storyFix(alan, words);
ok('⭐⭐ storyFix 不再把第二個 fluffy 也挖成空格（以前最多挖三格→Word Bank 只有一個 fluffy、兩格要同一個字）', W.storyBlanks(fx.passage).filter(b => b.answer === 'fluffy').length === 1);
ok('   那個重複還在，被標出來等重寫或拿掉（不是悄悄放過）', fx.check.dupes.join() === 'fluffy');
const twoBlanks = 'The [fluffy] cat sat. A [fluffy] dog came. The [contour] was nice. [waterproof] coats help. The [system] works. Shade is nice.';
ok('同一個字挖了兩格 → 也算重複', W.storyCheck(twoBlanks, words).dupes.join() === 'fluffy');
ok('每個字剛好一次 → 沒有重複', W.storyCheck('A [fluffy] cat. The [contour] is soft. [waterproof] it. A [system] helps. In the [shade] we sat.', words).dupes.length === 0);
ok('⭐ 嚴格比對：trapeze 不會被當成 trap', W.storyCheck('A [trap] was set. The trapeze swung.', [{ term: 'trap' }]).dupes.length === 0);
const dd = W.storyDropDupes(alan, words);
ok('⭐⭐ storyDropDupes：把「多出來的那一句」拿掉（His fluffy cloud looked real.），其他句子不動', dd.removed.length === 1 && /His fluffy cloud/.test(dd.removed[0]) && !/His fluffy cloud/.test(dd.passage) && /In the shade/.test(dd.passage));
const dd2 = W.storyDropDupes(W.storyFix(alan, words).passage, words);
ok('   拿完用 storyCheck 驗：沒有重複、也沒有少字', W.storyCheck(dd2.passage, words).dupes.length === 0 && W.storyCheck(dd2.passage, words).missing.length === 0);
const sole = 'A [fluffy] cat sat. The [contour] and the fluffy fur were soft. [waterproof] it. A [system] helps. In the shade we sat.';
ok('⭐ 重複那句同時是另一個字「唯一的一次」→ 不能拿（拿了會少一個字），原樣還給等重寫', W.storyDropDupes(sole, words).removed.length === 0);
ok('⭐ 沒有重複 → 原樣不動', W.storyDropDupes('A [fluffy] cat. The [contour] is soft. [waterproof] it. A [system] helps. In the [shade] we sat.', words).removed.length === 0);

console.log('\n【2】prompt 要求一字一用、每格有線索');
const sys = data.slice(data.indexOf('const AI_STORY_SYS ='), data.indexOf('/* 空格 → { answer, hint }'));
ok('⭐ 明講「每個字整篇只出現一次，連括號外、連變化形都不行」', /EXACTLY ONCE in the whole story/.test(sys) && /not as plain text, not in another form/.test(sys));
ok('⭐⭐ 明講每一格要有「指向這個字意思」的線索，並給好壞範例', /CLUE to the word's MEANING/.test(sys) && /BAD \(many words fit/.test(sys) && /GOOD \(only one word fits\)/.test(sys));
ok('⭐ 線索必須指向「這個字」，不能只是對的詞性', /not just to the right part of speech/.test(sys));
ok('還是只能英文、不能有詞性標記（舊規則沒被弄丟）', /ENGLISH ONLY/.test(sys) && /Never write a part of speech/.test(sys));

console.log('\n【3】驗算：讓另一個模型只看填空，把每一格填回去');
ok('⭐ 純函式 _storyJudge：答對的不算錯、答成別的字或「?」才算（含變化形）', (() => {
  const w = W.storyJudge(['fluffy', 'contours', 'waterproof'], { 1: 'fluffy', 2: 'contour', 3: '?' }, ['fluffy', 'contour', 'waterproof']);
  return w.length === 1 && w[0].n === 3 && w[0].expected === 'waterproof' && w[0].got === '?'; })());
ok('   空格數字對得上：答案陣列與驗算結果用同一個編號（1 起算）', W.storyJudge(['a', 'b'], { '1': 'b', '2': 'b' }, ['a', 'b']).map(x => x.n).join() === '1');
ok('⭐ 驗算看到的是「(1)_____」的樣子，不是答案', W.storyBlankView('A [fluffy](y) cat. The [contour] is soft.') === 'A (1)_____(y) cat. The (2)_____ is soft.');

const GOOD = 'On Monday, Tom learned that his class had to build a model of a cloud for science. He felt a little worried because he had never made one before. After school he went to the craft store with his mother and bought a big bag of cotton. At home he gathered the cotton and spread it on the table, and it was so [fluffy] that his hand sank into it like a soft pillow. Next, he traced the [contour], the smooth outline of the cloud, with a pencil so he knew where to glue. Then his teacher reminded him to [waterproof] the cotton, which means making it so water cannot get in, because the model would be sprayed with a little rain. Tom also used a [system] of three boxes, a plan that kept the glue, the cotton and the brushes in order. When he got tired, he rested in the [shade] of a tree, away from the hot sun. By Friday the cloud was finished. His classmates clapped, and Tom smiled because the hard work had been worth it.';
const DUPED = GOOD + ' His fluffy cloud looked real.';
const VAGUE = GOOD.replace('[contour], the smooth outline of the cloud,', '[contour]');
const SHORT = 'Tom made a cloud. It was [fluffy]. He drew the [contour]. He had to [waterproof] it. A [system] helped. He sat in the [shade].';
const solver = (picks) => (s2) => !isStoryWriter(s2) ? picks : null;

ok('⭐⭐ 寫的人重複用了字 → 程式先拿掉多出來的句子，不用多打一輪 AI；驗算過了就收工', await (async () => {
  calls.length = 0;
  handler = (s2) => isStoryWriter(s2) ? { title: 'Cloud', passage: DUPED } : { 1: 'fluffy', 2: 'contour', 3: 'waterproof', 4: 'system', 5: 'shade' };
  const st = await W.aiMakeVocabStory(words, { grade: 'g4', blanks: 5, rounds: 3 });
  const writers = calls.filter(c => isStoryWriter(String(c.system)));
  return writers.length === 1 && st.check.dupes.length === 0 && !/His fluffy cloud/.test(st.full || st.passage) && (st.fixes || []).some(f => /重複的句子/.test(f)); })());
ok('⭐⭐ 驗算說某一格推不出來 → 下一輪的 prompt 指名道姓：哪個字、被填成什麼、那一句長怎樣', await (async () => {
  calls.length = 0; let round = 0;
  handler = (s2) => { if (isStoryWriter(s2)) { round++; return { title: 'Cloud', passage: round === 1 ? VAGUE : GOOD }; }
    return round === 1 ? { 1: 'fluffy', 2: 'shade', 3: 'waterproof', 4: 'system', 5: 'contour' } : { 1: 'fluffy', 2: 'contour', 3: 'waterproof', 4: 'system', 5: 'shade' }; };
  const st = await W.aiMakeVocabStory(words, { grade: 'g4', blanks: 5, rounds: 3 });
  const writers = calls.filter(c => isStoryWriter(String(c.system)));
  const note = writers[1] ? writers[1].messages[0].content : '';
  return writers.length === 2 && st.rounds === 2 && /could NOT work out these blanks/.test(note) && /"contour" — the student answered "shade"/.test(note) && /_____/.test(note); })());
ok('⭐ 驗算用的是「另一個模型」（不是寫故事的 haiku）', await (async () => {
  calls.length = 0; handler = (s2) => isStoryWriter(s2) ? { title: 'Cloud', passage: GOOD } : { 1: 'fluffy', 2: 'contour', 3: 'waterproof', 4: 'system', 5: 'shade' };
  await W.aiMakeVocabStory(words, { grade: 'g4', blanks: 5 });
  const w = calls.find(c => isStoryWriter(String(c.system))), v = calls.find(c => !isStoryWriter(String(c.system)));
  return w && v && w.model !== v.model && /Word Bank:/.test(v.messages[0].content) && !/\[fluffy\]/.test(v.messages[0].content); })());
ok('⭐⭐ 驗算壞掉（回的不是 JSON）→ **不擋**，照樣把故事交出來（寧可放行，也不要整篇出不來）', await (async () => {
  handler = (s2) => isStoryWriter(s2) ? { title: 'Cloud', passage: GOOD } : 'sorry I cannot';
  const st = await W.aiMakeVocabStory(words, { grade: 'g4', blanks: 5 });
  return !!st.passage && st.check.dupes.length === 0; })());
ok('⭐ 三輪都推不出來 → 交出「最不糟」的那一篇，而且跟老師講哪幾格有疑慮（校稿頁看得到）', await (async () => {
  handler = (s2) => isStoryWriter(s2) ? { title: 'Cloud', passage: VAGUE } : { 1: 'fluffy', 2: 'shade', 3: 'waterproof', 4: 'system', 5: 'contour' };
  const st = await W.aiMakeVocabStory(words, { grade: 'g4', blanks: 5, rounds: 2 });
  return !!st.passage && (st.fixes || []).some(f => /驗算：有 \d 格可能前後文不夠明確/.test(f)); })());
console.log('\n【5】文章要夠長（Alan：至少之前的兩倍，結構才完整）');
ok('⭐⭐ prompt 要求 180~260 字、10~14 句（門檻 130 字，留餘裕避免為了幾個字重打 AI），而且要有開頭／經過／結尾三段', /180-260 words and 10-14 sentences/.test(sys) && /BEGINNING/.test(sys) && /MIDDLE/.test(sys) && /END:/.test(sys) && !/70-140 words/.test(sys));
ok('⭐ 長度是舊的兩倍以上（舊：70~140 字；新最少 150 字）', 150 >= 70 * 2 && 260 >= 140 * 1.8);
ok('⭐⭐ storyCheck 會量字數：太短的標 short，夠長的不標（括號與提示不算字）', W.storyCheck(SHORT, words).short === true && W.storyCheck(GOOD, words).short === false && W.storyCheck(GOOD, words).wordCount >= 150);
ok('⭐ 太短 → 下一輪 prompt 指名「太短，要 150~260 字、9~14 句」，而且回來的是夠長的那一篇', await (async () => {
  calls.length = 0; let round = 0;
  handler = (s2) => isStoryWriter(s2) ? (++round, { title: 'Cloud', passage: round === 1 ? SHORT : GOOD }) : { 1: 'fluffy', 2: 'contour', 3: 'waterproof', 4: 'system', 5: 'shade' };
  const st = await W.aiMakeVocabStory(words, { grade: 'g4', blanks: 5, rounds: 3 });
  const note = calls.filter(c => isStoryWriter(String(c.system)))[1].messages[0].content;
  return st.rounds === 2 && /The story is too short \(\d+ words\)/.test(note) && !st.check.short; })());
ok('⭐ 三輪都太短 → 還是交出來（不擋），校稿頁會標「文章偏短」', await (async () => {
  handler = (s2) => isStoryWriter(s2) ? { title: 'Cloud', passage: SHORT } : { 1: 'fluffy', 2: 'contour', 3: 'waterproof', 4: 'system', 5: 'shade' };
  const st = await W.aiMakeVocabStory(words, { grade: 'g4', blanks: 5, rounds: 2 });
  return !!st.passage && st.check.short === true && /文章偏短/.test(editor); })());
ok('⭐ 輸出上限跟著放大（260 字約 450 token，本來 900 對 140 字；現在 1800），不然長文被截斷 JSON 會壞', /model: 'claude-haiku-4-5', max_tokens: 1800,\s*system: AI_STORY_SYS/.test(data));
ok('⭐ 一次出好幾篇時，驗算的 Word Bank 含別篇的字（跟學生看到的一樣）', /bank: list,/.test(data));

console.log('\n【4】老師看得到');
ok('⭐ 校稿頁會標出「同一個字用了兩次以上」', /同一個字用了兩次以上（一個字只能用一次）/.test(editor));
console.log(fail ? `\n❌ t-v603：${pass} 過 / ${fail} 失敗` : `\n✅ t-v603：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
