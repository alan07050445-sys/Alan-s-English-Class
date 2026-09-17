/* t-group-ops — v454 一整包一起改（Alan：「我只能一個一個去改日期…希望可以一整包一起去改」）
 * ① 整組設／取消截止日 ② 整組沿用到其他週（可順便設成作業）
 * ③ 在同一組底下再出一份題目（不要又變成新的一組）④ 校稿頁不要擠在一起 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const editor = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const css  = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const fnEnd = (src, a) => { const i = src.indexOf(a); const j = src.indexOf('\n  };\n', i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j + 5); };

/* 把兩個 handler 拆出來單獨跑（它們只吃 weeksRef / setWeeks / saveWeeksSafe / showToast） */
const mkEnv = () => {
  const weeks = {
    w1: { items: { vocab: [
      { id: 'a1', type: 'flashcard', group: 'Unit 5', title: 'Unit 5' },
      { id: 'a2', type: 'quiz', group: 'Unit 5', title: 'Unit 5', requires: 'a0', linkedFlashcardId: 'a1' },
      { id: 'a0', type: 'lesson', group: 'Unit 5', title: 'Unit 5 · 先學一下' },
      { id: 'b1', type: 'quiz', group: 'Unit 6', title: 'Unit 6' },
    ] }, homework: {} },
    w2: { items: { vocab: [] } },
    w3: { items: { vocab: [{ id: 'a1', type: 'quiz', group: '別人的', title: 'x' }] } },
  };
  const state = { weeks, saved: 0, toast: [] };
  const env = {
    weeksRef: { current: weeks },
    setWeeks: (w) => { state.weeks = w; env.weeksRef.current = w; },
    saveWeeksSafe: () => { state.saved++; return true; },
    showToast: (t) => state.toast.push(t),
    weekId: 'w1',
    state,
  };
  return env;
};
const runHandler = (name, env, args) => {
  const src = fnEnd(app, `const ${name} = `);
  const fn = new Function('weeksRef', 'setWeeks', 'saveWeeksSafe', 'showToast', 'weekId',
    src + `\nreturn ${name};`)(env.weeksRef, env.setWeeks, env.saveWeeksSafe, env.showToast, env.weekId);
  return fn.apply(null, args);
};

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);

console.log('\n【1】整組設／取消截止日');
let env = mkEnv();
runHandler('handleSetHomeworkMany', env, [['a0', 'a1', 'a2'], { dueDate: '2026-09-25' }]);
eq('三個都設成作業', Object.keys(env.state.weeks.w1.homework).length, 3);
eq('日期都一樣', env.state.weeks.w1.homework.a2.dueDate, '2026-09-25');
eq('⭐ 只存一次（一個一個設會存三次）', env.state.saved, 1);
ok('沒被設到的不受影響', !env.state.weeks.w1.homework.b1);
runHandler('handleSetHomeworkMany', env, [['a0', 'a1'], null]);
eq('取消兩個', Object.keys(env.state.weeks.w1.homework).join(), 'a2');
runHandler('handleSetHomeworkMany', env, [[], { dueDate: 'x' }]);
eq('空清單不動也不存', env.state.saved, 2);

console.log('\n【2】整組沿用到其他週');
env = mkEnv();
const grp = env.state.weeks.w1.items.vocab.filter(it => it.group === 'Unit 5');
runHandler('handleCopyGroupToWeeks', env, ['vocab', grp, ['w2'], '']);
eq('整組三個都複製過去', env.state.weeks.w2.items.vocab.length, 3);
ok('內容有帶過去', env.state.weeks.w2.items.vocab.some(x => x.type === 'lesson'));
eq('沒填日期就不設成作業', Object.keys(env.state.weeks.w2.homework || {}).length, 0);
eq('⭐ 一整包只存一次', env.state.saved, 1);

env = mkEnv();
runHandler('handleCopyGroupToWeeks', env, ['vocab', env.state.weeks.w1.items.vocab.filter(it => it.group === 'Unit 5'), ['w2'], '2026-10-01']);
eq('⭐ 填了日期就在那一週也設成作業', Object.keys(env.state.weeks.w2.homework).length, 3);
eq('日期就是填的那個', Object.values(env.state.weeks.w2.homework)[0].dueDate, '2026-10-01');

console.log('\n【3】id 撞到與組內互相指向');
env = mkEnv();
runHandler('handleCopyGroupToWeeks', env, ['vocab', env.state.weeks.w1.items.vocab.filter(it => it.group === 'Unit 5'), ['w3'], '']);
const w3 = env.state.weeks.w3.items.vocab;
eq('原本那一個還在，加三個', w3.length, 4);
ok('⭐ 撞到的 id 會換一個（a1 → a1-2）', w3.some(x => x.id === 'a1-2'));
const quiz = w3.find(x => x.type === 'quiz' && x.group === 'Unit 5');
ok('⭐ 教學卡的鎖指到新的 id（不會鎖著一個不存在的單元）', quiz.requires === w3.find(x => x.type === 'lesson').id);
ok('⭐ 單字卡的連結也跟著換', quiz.linkedFlashcardId === w3.find(x => x.type === 'flashcard' && x.group === 'Unit 5').id);
ok('暫存欄位清乾淨（不會被存進雲端）', w3.every(x => !('__oldId' in x)));
env = mkEnv();
runHandler('handleCopyGroupToWeeks', env, ['vocab', [], ['w2'], '']);
eq('沒東西就什麼都不做', env.state.saved, 0);
runHandler('handleCopyGroupToWeeks', env, ['vocab', [{ id: 'x', type: 'quiz' }], ['沒有這一週'], '']);
ok('目標週不存在時只提示、不寫入', env.state.toast.join().indexOf('沒有可沿用的週') >= 0);

console.log('\n【4】畫面接上了');
ok('群組標題列有「⋯ 整組」', /qm-ugroup-more/.test(qm) && /⋯ 整組/.test(qm));
ok('選單有整組設作業／取消作業', /整組設為作業/.test(qm) && /整組取消作業/.test(qm));
ok('選單有整組沿用到其他週', /整組沿用到其他週/.test(qm));
ok('沿用視窗認得「整組」', /copyItem\.__group/.test(qm));
ok('⭐ 整組沿用可以順便設成作業', /到了那一週也直接設成作業/.test(qm));
ok('app.jsx 有接上三個新 handler', /onSetHomeworkMany=\{handleSetHomeworkMany\}/.test(app) && /onCopyGroupToWeeks=\{\(items/.test(app) && /onRegenGroup=\{\(catId, name\)/.test(app));

console.log('\n【5】在同一組底下再出一份題目');
ok('有「在這一組再出一份題目」', /在這一組再出一份題目/.test(qm));
ok('⭐ 會先問要出哪一種', /再出一份題目 <em>加進/.test(app));
ok('⭐ 三個一鍵生成都收得到「標題先填好」', (editor.match(/defaultTitle/g) || []).length >= 6);
ok('標題就是那一組的名字（出來才會落在同一組）', /defaultTitle=\{regenFor \? regenFor\.name : ''\}/.test(app));
ok('分類也跟著那一組', /\(regenFor && regenFor\.catId\) \|\| openCat/.test(app));
ok('關掉視窗就把狀態清掉', /setRegenFor\(null\)/.test(app));

console.log('\n【6】校稿頁不要擠在一起');
const flat = css.replace(/\n/g, ' ');
ok('⭐ 每一題變成一張卡片', /\.gq-row \{[^}]*border-radius: 12px/.test(flat));
ok('欄位改成自動換行的網格', /\.gq-row-2 \{[^}]*auto-fit, minmax\(190px/.test(flat));
ok('分頁列釘在最上面', /\.gr-tabs \{[^}]*position: sticky/.test(flat));
ok('教學卡每一步也拉開', /\.gn-step \{[^}]*padding: 14px 16px/.test(flat));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
