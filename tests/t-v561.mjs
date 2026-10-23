// v561 跟 AI 一來一往出大考考卷：程式把關（examDraftChecks）與接線
import fs from 'fs'; import vm from 'vm';
const R = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const data = R('data.js'), ed = R('components-editor.jsx'), app = R('app.jsx'), shell = R('components-shell.jsx');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
const grab = (a, b) => data.slice(data.indexOf(a), data.indexOf(b, data.indexOf(a)));
const sb = { examWarnings: () => ['配分加起來是 90 分，不是 100 分。', 'X 的第 1 大題第 2 句的答案「a」不在詞庫裡。'] };
vm.createContext(sb);
vm.runInContext(grab('function examDraftChecks', '/* 一輪對話') + '\nthis.chk = examDraftChecks;', sb);
const bad = {
  type: 'exam', title: 't', sections: [{ name: 'S2', pct: 60, parts: [
    { kind: 'cloze', title: 'Part 1', pts: 60, bank: ['frail', 'managed', 'descent'],
      items: [{ text: 'He was too ___ to lift it.', answer: 'frail' }, { text: 'She ___ the team.', answer: 'coached' },
              { text: 'No blank here.', answer: 'descent' }, { text: 'The man was ___ and weak.', answer: 'frail' }] },
    { kind: 'quiz', title: 'Part 2', pts: 30, questions: [1, 2, 3, 4].map(() => ({ q: 'q?', options: ['x', 'y', 'z', 'w'], answer: 1 })) },
  ] }],
};
const c = sb.chk(bad, ['frail', 'sagebrush'], [{ at: 'S2', why: 'AI 說要看' }]);
const has = (lv, re) => c.some(x => x.level === lv && re.test(x.why));
console.log('\n【程式把關】');
ok('答案不在詞庫裡 → 🔴', has('bad', /「coached」不在詞庫/));
ok('同一個字用兩次 → 🔴', has('bad', /「frail」被用了兩次/));
ok('句子沒有空格 → 🔴', has('bad', /沒有空格/));
ok('詞庫有字沒被用到 → 🔴', has('bad', /「managed」沒有任何一句用到/));
ok('選擇題答案全部同一個選項 → 🔴', has('bad', /同一個選項/));
ok('他指定要考的字沒出現 → 🔴', has('bad', /sagebrush/));
ok('有出現的字不會被誤報', !has('bad', /「frail」，但草稿裡找不到/));
ok('AI 自己提醒的事 → 🟡', has('check', /AI 說要看/));
ok('選擇題答案是 AI 判斷的 → 🟡 提醒老師看', has('check', /AI 讀文章判斷/));
ok('examWarnings 裡「第幾大題第幾句」的重複訊息被去掉', !c.some(x => /大題第 \d+ 句/.test(x.why)) && c.some(x => /不是 100 分/.test(x.why)));
console.log('\n【接線】');
ok('提示詞要求逐字照老師說的字、不准換字', /Never swap in other words/.test(data) && /EXACTLY those/.test(data));
ok('提示詞要求每輪整份草稿重送、只改他要求的', /output the whole thing again, changing only what he asks/.test(data));
ok('聊天室認得 examdraft，並教它跟 exampaper 分開', /examdraft —/.test(data) && /not "exampaper"/.test(data) && /guided exampaper examdraft tense/.test(data));
ok('examdraft 開的是對話視窗', /plan\.intent === 'examdraft'/.test(app) && /window\.ExamDraftModal/.test(app));
ok('編輯面板有入口按鈕', /onExamDraft/.test(shell) && /跟 AI 出大考考卷/.test(shell));
ok('不會自己存：按「存成考卷」才建立，還有一定要改的會先問', /還有 \$\{bad\.length\} 個「一定要改」/.test(ed) && /onCreate\(\{ \.\.\.draft/.test(ed));
ok('每輪標出「新／這輪改過」', /changed\[key\]/.test(ed) && /JSON\.stringify\(before\) !== JSON\.stringify\(pt\)/.test(ed));
ok('可以自己改（跟編輯單元同一個格式）', /examParsePart\(pt\.kind/.test(ed));
console.log(fail ? `\n❌ t-v561：${pass} 過 / ${fail} 失敗` : `\n✅ t-v561：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
