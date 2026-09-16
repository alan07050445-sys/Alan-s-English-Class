/* t-sort-ambiguous — v452 一個字只能放一個籃子
 * Alan：「先學一下才剛講到某些字既可以是 linking 也可以是 action，像是感官動詞就有兩種，
 *        那出這種題目也是應該有兩種選項而不是…這 AI 自己要分辨的出來？」
 * 實例：分一分把 smells 放進「連綴動詞」，孩子放「動作動詞」被判錯——但那正是前一頁剛教的。
 * 修法跟選擇題（v431）、找出來（v444）同一招：再問一個 AI「這個字可以放幾個籃子」。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };

let router = null; const calls = [];
const _aiAsk = async (body, pickFn) => {
  calls.push(body);
  const got = pickFn({ content: [{ type: 'text', text: JSON.stringify(router(String(body.system || ''), body)) }] });
  if (got == null) throw new Error('bad');
  return got;
};
const code = slice(data, 'let _aiLastUpstream', 'async function _aiAsk') + '\n' +
             slice(data, 'const VOCAB_BANDS = {', 'function _aiStripFence') + '\n' +
             slice(data, 'const GN_MODEL', 'function grCountBlanks');
const W = new Function('_aiAsk', '_aiStripFence', '_AI_MINIFY',
  code + '\nreturn { _gnCheckSort, aiMakeGrammarSortSet, aiMakeGrammarLesson, GN_SORT_SYS, GN_LESSON_SYS, gnValidSortSet };')(
  _aiAsk, (t) => String(t).replace(/^```(json)?/, '').replace(/```$/, '').trim(), '');

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);

/* Alan 螢幕上那一題 */
const CATS = ['be動詞', '連綴動詞', '動作動詞'];
const WORDS = [
  { word: 'are', category: 'be動詞' }, { word: 'is', category: 'be動詞' },
  { word: 'feels', category: '連綴動詞' }, { word: 'looks', category: '連綴動詞' },
  { word: 'tastes', category: '連綴動詞' }, { word: 'smells', category: '連綴動詞' },
  { word: 'grows', category: '動作動詞' }, { word: 'runs', category: '動作動詞' },
];
/* 交叉檢查的 AI 怎麼回：感官動詞給兩個籃子 */
const CHECK = WORDS.map(w => (['feels', 'looks', 'tastes', 'smells'].indexOf(w.word) >= 0
  ? ['連綴動詞', '動作動詞'] : [w.category]));

console.log('\n【1】交叉檢查抓得到「兩個籃子都可以」的字');
router = () => CHECK;
const bad = await W._gnCheckSort(CATS, WORDS, 'x');
eq('抓到四個感官動詞', bad.size, 4);
ok('⭐ smells 在裡面（Alan 截圖那個字）', bad.has(WORDS.findIndex(w => w.word === 'smells')));
ok('are／is／grows／runs 沒事', !bad.has(0) && !bad.has(1) && !bad.has(6) && !bad.has(7));
ok('檢查的 prompt 有點名感官動詞', /sense verbs \(smell, taste, feel, look, sound\)/.test(String(calls[0].system)));
ok('⭐ 被歸錯籃子的也會被抓出來', (await (async () => {
  router = () => [['動作動詞']];
  return W._gnCheckSort(CATS, [{ word: 'runs', category: '連綴動詞' }], 'x');
})()).size === 1);
router = () => 'not-an-array';
eq('檢查本身壞掉就不擋（不能因為檢查失敗就整份丟掉）', (await W._gnCheckSort(CATS, WORDS, 'x')).size, 0);

console.log('\n【2】一鍵出「分一分」會把那些字換掉');
const CLEAN = { instruction: '這些字是哪一種動詞？', categories: CATS,
  words: [{ word: 'are', category: 'be動詞' }, { word: 'is', category: 'be動詞' },
          { word: 'was', category: 'be動詞' }, { word: 'seems', category: '連綴動詞' },
          { word: 'becomes', category: '連綴動詞' }, { word: 'grows', category: '動作動詞' },
          { word: 'runs', category: '動作動詞' }, { word: 'jumps', category: '動作動詞' }] };
/* 假的檢查者：照著「收到的那一份清單順序」回答（跟真的 AI 一樣，不能用寫死的順序） */
const CAT_OF = {};
WORDS.concat(CLEAN.words).forEach(w => { CAT_OF[w.word] = w.category; });
const checkReply = (content, twoBaskets) =>
  [...content.matchAll(/^\d+\. (.+)$/gm)].map(m => m[1].trim())
    .map(w => (twoBaskets[w] || [CAT_OF[w] || '?']));
let gen = 0;
router = (sys, body) => {
  const content = String(body.messages[0].content);
  if (/checking a sorting exercise/.test(sys)) {
    // 第一次：四個感官動詞全部兩個籃子都對 → 連綴動詞那一籃被清空 → 一定要重出一輪
    return checkReply(content, gen === 1
      ? { smells: ['連綴動詞', '動作動詞'], feels: ['連綴動詞', '動作動詞'],
          looks: ['連綴動詞', '動作動詞'], tastes: ['連綴動詞', '動作動詞'] }
      : {});
  }
  gen++;
  return gen === 1 ? { instruction: 'x', categories: CATS, words: WORDS } : CLEAN;
};
calls.length = 0;
const set = await W.aiMakeGrammarSortSet({ base: 'Linking verbs and action verbs', n: 6 });
ok('⭐ 交出來的那一組沒有 smells', !set.words.some(w => w.word === 'smells'));
ok('每一籃都還有至少兩個字', CATS.every(c => set.words.filter(w => w.category === c).length >= 2 || set.words.filter(w => w.category === c).length === 0));
ok('⭐ 重出時有告訴 AI 是哪幾個字害的', calls.some(c => /fit TWO baskets at once/.test(String(c.messages[0].content)) && /smells/.test(String(c.messages[0].content))));
ok('出題 prompt 本身也先叮嚀過一次', /sense verbs \(smell, taste, feel, look, sound\)\s*\n?\s*are BOTH linking verbs AND action verbs/.test(W.GN_SORT_SYS));
ok('會多要兩個字當備胎（丟掉還夠用）', calls.some(c => /Make 8 words in total/.test(String(c.messages[0].content))));

console.log('\n【3】互動教學裡的「分一分」也要過同一關');
const learn = (n) => ({ kind: 'learn', say: '動詞有三種' + n, imgHint: 'boy running', examples: [{ en: 'The dog runs fast.', hl: ['runs'], zh: '狗跑很快' }] });
const badLesson = { lead: 'x', outro: 'y', steps: [
  learn(1), { kind: 'tap', q: '點出動詞', sentence: 'The dog runs in the park.', answers: ['runs'], why: '' },
  learn(2), { kind: 'sort', q: '哪一種動詞？', why: '',
    groups: [{ label: '連綴動詞', items: ['seems', 'smells'] }, { label: '動作動詞', items: ['runs', 'jumps'] }] },
] };
const goodLesson = { lead: 'x', outro: 'y', steps: [
  learn(1), { kind: 'tap', q: '點出動詞', sentence: 'The dog runs in the park.', answers: ['runs'], why: '' },
  learn(2), { kind: 'sort', q: '哪一種動詞？', why: '',
    groups: [{ label: '連綴動詞', items: ['seems', 'becomes'] }, { label: '動作動詞', items: ['runs', 'jumps'] }] },
] };
let n2 = 0;
router = (sys, body) => {
  const content = String(body.messages[0].content);
  if (/checking a sorting exercise/.test(sys)) {
    const two = n2 === 1 ? { smells: ['連綴動詞', '動作動詞'] } : {};
    const cat = { seems: '連綴動詞', smells: '連綴動詞', becomes: '連綴動詞', runs: '動作動詞', jumps: '動作動詞' };
    return [...content.matchAll(/^\d+\. (.+)$/gm)].map(m => m[1].trim()).map(w => two[w] || [cat[w]]);
  }
  if (/INTERACTIVE warm-up/.test(sys)) { n2++; return n2 === 1 ? badLesson : goodLesson; }
  return [];
};
calls.length = 0;
const L = await W.aiMakeGrammarLesson({ topic: 'Linking verbs and action verbs', notes: 'Linking verbs connect...' });
ok('⭐ 有 smells 的那一版被退回、重出一次', L.steps.filter(s => s.kind === 'sort')[0].groups[0].items.join() === 'seems,becomes');
ok('⭐ 回饋有講「那個字兩個籃子都對」', calls.some(c => /belong to TWO groups at once/.test(String(c.messages[0].content)) && /smells/.test(String(c.messages[0].content))));
ok('教學的 prompt 也先叮嚀過', /Never use a word that belongs to two groups/.test(W.GN_LESSON_SYS));

console.log('\n【4】丟掉之後如果剩不夠，寧可不要那一步');
const thin = { lead: 'x', outro: 'y', steps: [
  learn(1), { kind: 'pick', q: 'Which is a verb?', options: ['run', 'red'], answer: 0, why: '' },
  learn(2), { kind: 'sort', q: '哪一種動詞？', why: '',
    groups: [{ label: '連綴動詞', items: ['smells', 'tastes'] }, { label: '動作動詞', items: ['runs', 'jumps'] }] },
] };
let n3 = 0;
router = (sys, body) => {
  const content = String(body.messages[0].content);
  if (/checking a sorting exercise/.test(sys)) {
    const cat = { seems: '連綴動詞', becomes: '連綴動詞', runs: '動作動詞', jumps: '動作動詞' };
    return [...content.matchAll(/^\d+\. (.+)$/gm)].map(m => m[1].trim())
      .map(w => (w === 'smells' || w === 'tastes') ? ['連綴動詞', '動作動詞'] : [cat[w]]);
  }
  if (/INTERACTIVE warm-up/.test(sys)) { n3++; return n3 === 1 ? thin : goodLesson; }
  return [];
};
const L2 = await W.aiMakeGrammarLesson({ topic: 'Linking verbs', notes: 'x' });
ok('⭐ 剩不到兩個字的那一籃 → 整步不要，重出一份乾淨的', L2.steps.filter(s => s.kind === 'sort').every(s => !s.groups.some(g => g.items.indexOf('smells') >= 0)));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
