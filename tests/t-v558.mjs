// v558 考卷新題型：事件排順序、共用圖片／文章、摘要評分表（每項滿分不同）
import fs from 'fs'; import vm from 'vm';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const qm = fs.readFileSync(new URL('../components-quiz-mode.jsx', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
const grab = (a, b) => data.slice(data.indexOf(a), data.indexOf(b, data.indexOf(a)));
const code = [
  grab('function examOrderShuffle', '/* 一大題算幾分'),
  grab('const EXAM_RUBRIC = [', '/* 一大題要用哪一套 rubric。'),
  grab('/* 一大題要用哪一套 rubric。', '/* 一題的 rubric 分數'),
  grab('function examRubricPoints', '/* 整個 short 大題'),
].join('\n');
const sb = {}; vm.createContext(sb);
vm.runInContext(code + '\nthis.sh=examOrderShuffle;this.pts=examRubricPoints;this.of=examRubricOf;this.bands=examBandsOf;', sb);
const ev = ['a1', 'b2', 'c3', 'd4', 'e5'];
console.log('\n【事件排順序】');
const s1 = sb.sh(ev);
ok('洗牌是固定的（重畫不會重洗）', sb.sh(ev).join() === s1.join());
ok('洗牌後不等於正確順序', s1.some((v, i) => v !== i));
ok('兩個事件也不會剛好等於正確順序', sb.sh(['x', 'y']).join() !== '0,1');
ok('洗牌只是重排，沒有掉事件', [...s1].sort().join() === '0,1,2,3,4');
ok('EXAM_KINDS 有 order 且自動計分', /order:\s*\{ zh: '事件排順序[^}]*auto: true/.test(data));
ok('計分：第 i 個事件要填 i+1', /good = got === i \+ 1/.test(data));
ok('提示詞教 AI 認得 order，並要求它自己排正確順序', /"order"\s+— "Number the events/.test(data) && /CORRECT\s+chronological order/.test(data));
ok('拍照讀進來的 order 少於兩個事件就丟掉', /events\.length < 2\) return null/.test(data));
ok('出卷端有 order 的說明', /order: '一行一個事件/.test(fs.readFileSync(new URL('../components-editor.jsx', import.meta.url), 'utf8')));
ok('學生端畫得出來', /pt\.kind === 'order'/.test(qm) && /ex-ord-n/.test(qm));
console.log('\n【共用圖片與文章】');
ok('圖片與文章顯示在題目上方', /pt\.img &&[\s\S]{0,60}ex-fig/.test(qm) && /pt\.readText &&/.test(qm));
ok('選擇題收得進共用文章', /\.\.\.\(rt \? \{ readText: rt \} : \{\}\)/.test(data));
console.log('\n【摘要評分表】');
const R = sb.of({ rubricSet: 'summary' });
ok('六項、合計 10 分', R.criteria.length === 6 && R.criteria.reduce((a, c) => a + (c.max || R.max), 0) === 10);
ok('滿分＝10', sb.pts({ begin: 2, middle: 2, end: 2, order: 2, sent: 1, own: 1 }, 10, R.max, R.criteria) === 10);
ok('2/1/0/2/1/0 ＝ 6 分', sb.pts({ begin: 2, middle: 1, end: 0, order: 2, sent: 1, own: 0 }, 10, R.max, R.criteria) === 6);
ok('給過頭會被夾回每一項的上限', sb.pts({ begin: 9, middle: 9, end: 9, order: 9, sent: 9, own: 9 }, 10, R.max, R.criteria) === 10);
ok('「還沒改」仍然是 null', sb.pts(null, 10, R.max, R.criteria) === null);
ok('每項的按鈕：開頭 2/1/0、自己的話 1/0',
   sb.bands(R, R.criteria[0]).map(b => b.n).join('') === '210' && sb.bands(R, R.criteria[5]).map(b => b.n).join('') === '10');
const W = sb.of({ rubricSet: 'writing' });
ok('寫作七項照舊是 7/5/3/0', sb.bands(W, W.criteria[0]).map(b => b.n).join('') === '7530');
const B = sb.of({});
ok('舊的三項照舊是 4~0，滿分算法沒變', sb.bands(B, B.criteria[0]).map(b => b.n).join('') === '43210'
   && sb.pts({ explain: 4, relevant: 4, effort: 4 }, 20, 4, B.criteria) === 20);
ok('提示詞教 AI 認得 summary', /"rubricSet":"summary"/.test(data));
console.log(fail ? `\n❌ t-v558：${pass} 過 / ${fail} 失敗` : `\n✅ t-v558：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
