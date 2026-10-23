// v564 真正的字首／字尾：拿掉之後剩下的要是真的英文字（Alan：「要是真正的 prefix」）
import fs from 'fs'; import vm from 'vm';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const dictSrc = fs.readFileSync(new URL('../data-words.js', import.meta.url), 'utf8');
const qm = fs.readFileSync(new URL('../components-quiz-mode.jsx', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
const g = (a, b) => data.slice(data.indexOf(a), data.indexOf(b, data.indexOf(a)));
const load = (withDict) => {
  const sb = { window: {} }; sb.window = sb; vm.createContext(sb);
  if (withDict) { vm.runInContext(dictSrc, sb); sb.EN_DICT = new Set(sb.EN_WORDS_STR.split(' ')); }
  vm.runInContext(g('const WS_FALSE_PREFIX', '/* 🔴 v484') + '\n' + g('function examAffixZh', '\nfunction examUseWordOne')
    + '\nthis.pre = (w, a) => WS_CHECKS.prefix(w, a); this.suf = (w, a) => WS_CHECKS.suffix(w, a); this.one = examAffixOne; this.det = examAffixDetect;', sb);
  return sb;
};
const D = load(true), N = load(false);
const PRE = ['mis-', 'en-', 'em-'];
const hit = (sb, w) => !!sb.det(w, PRE);
console.log('\n【字首：拿掉之後要剩一個真的字】');
const realPre = ['empower', 'enlarge', 'encourage', 'endanger', 'embed', 'enclose', 'enable', 'enjoy', 'encode', 'enforce', 'mishandle', 'misplace',
  'misunderstand', 'misbehave', 'mislead', 'mistake', 'mismatch', 'misspell', 'misuse', 'misread', 'mislabel', 'embark', 'encounter'];
const fakePre = ['enemy', 'energy', 'empty', 'end', 'engine', 'enough', 'enter', 'entire', 'employ', 'emperor', 'empire', 'emotion', 'emphasis', 'emblem',
  'ember', 'mission', 'mist', 'misty', 'miss', 'mister', 'misery', 'mistress', 'mile', 'milk', 'mind', 'mine', 'minus', 'mint', 'minute', 'mirror', 'million'];
ok(`真的有字首的都過（${realPre.length} 個）`, realPre.every(w => hit(D, w)) || (console.log('      漏了：', realPre.filter(w => !hit(D, w))), false));
ok(`只是開頭一樣的都不算（${fakePre.length} 個）`, fakePre.every(w => !hit(D, w)) || (console.log('      誤判：', fakePre.filter(w => hit(D, w))), false));
ok('變化形也算：encouraged／misplaced／empowering／misunderstood', ['encouraged', 'misplaced', 'empowering', 'misunderstood', 'enlarged'].every(w => hit(D, w)));
ok('不靠例外清單也擋得住沒列過的假朋友（emu／embroidery 之類）', !hit(D, 'emu') && !hit(D, 'enzyme') && !hit(D, 'misc'));
console.log('\n【字尾：只管「加在原字後面」的變化字尾】');
const sfx = (w, a) => D.suf(w, a);
ok('playing／running／making／studying／hoped／stopped／tried／biggest／quickly 都過',
  [['playing', '-ing'], ['running', '-ing'], ['making', '-ing'], ['studying', '-ing'], ['hoped', '-ed'], ['stopped', '-ed'], ['tried', '-ed'], ['biggest', '-est'], ['quickly', '-ly'], ['cats', '-s'], ['teacher', '-er']].every(([w, a]) => sfx(w, a)));
ok('ring／king／sing／thing／bring／string／red／bed／only／best／west 都不算',
  [['ring', '-ing'], ['king', '-ing'], ['sing', '-ing'], ['thing', '-ing'], ['bring', '-ing'], ['string', '-ing'], ['red', '-ed'], ['bed', '-ed'], ['only', '-ly'], ['best', '-est'], ['west', '-est']].every(([w, a]) => !sfx(w, a)));
ok('會改字形的衍生字尾不用字典擋（ability／electricity 的 -ity 維持原規則，不能把真的字判錯）', sfx('ability', '-ity') && sfx('electricity', '-ity') && sfx('economic', '-ic') && sfx('enjoyment', '-ment'));
console.log('\n【Alan 那兩題與說明】');
const P = { affixes: PRE, minWords: 5 };
ok('empower（句子 empowers）、misunderstand 都對', D.one({ word: 'empower', sentence: 'The superpower empowers me to fly in the sky.' }, P).ok && D.one({ word: 'misunderstand', sentence: 'I misunderstand the instruction from my teachers.' }, P).ok);
ok('enemy 會說明為什麼：拿掉 en- 剩下「emy」不是英文字', (() => { const r = D.one({ word: 'enemy', sentence: 'The enemy was very strong in the game.' }, P); return !r.ok && /剩下「emy」/.test(r.why[0]); })());
console.log('\n【字表還沒載入時（網路慢）】');
ok('退回舊規則，不會整個壞掉：enlarge 過、enemy 靠例外清單擋', hit(N, 'enlarge') && !hit(N, 'enemy'));
console.log('\n【接線】');
ok('字表檔有著作權聲明（SCOWL 授權要求）', /Kevin Atkinson/.test(dictSrc) && /window\.EN_WORDS_STR=/.test(dictSrc));
ok('交卷前先等字表載好（最多 8 秒）', /examNeedsDict\(item\)[\s\S]{0,200}Promise\.race\(\[window\.examLoadDict\(\), new Promise\(r => setTimeout\(r, 8000\)\)\]\)/.test(qm));
ok('只有造字／圈字首字尾的考卷才載字表', /pt\.kind === 'affix' \|\| \(pt\.kind === 'circle'/.test(data));
ok('載入用跟網站同一個版本號（不吃舊快取）', /data-words\.js' \+ v/.test(data));
console.log(fail ? `\n❌ t-v564：${pass} 過 / ${fail} 失敗` : `\n✅ t-v564：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
