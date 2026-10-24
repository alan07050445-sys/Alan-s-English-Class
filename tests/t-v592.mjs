// t-v592 — 聊天室打錯字也聽得懂（你是說…？）＋叫得動「搬題目」「組合複習」
// ⭐ 重點不是「會猜」而是「不替他選」：Elroy/Elory 只差一個字母位置，猜錯會把課記到別的孩子身上。
import fs from 'fs';
const R = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const data = R('data.js'), app = R('app.jsx'), ed = R('components-editor.jsx');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage', data)(W,
  { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} });
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const roster = [{ name: 'Nick', email: 'nick@x.com' }, { name: 'Nico', email: 'nico@x.com' }, { name: 'Elroy', email: 'elroy@x.com' },
                { name: 'Elory', email: 'elory@x.com' }, { name: 'Eric', email: 'eric@x.com' }, { name: '陳小明', email: 'ming@x.com' }];
const names = roster.map(r => r.name);

console.log('\n【1】askSuggest：找長得像的（只列候選，不替他選）');
ok('少打一個字：Nik → Nick', W.askSuggest('Nik', names).join() === 'Nick');
ok('多打／順序打錯：Nikc、nck、Erci', W.askSuggest('Nikc', names)[0] === 'Nick' && W.askSuggest('nck', names)[0] === 'Nick' && W.askSuggest('Erci', names)[0] === 'Eric');
ok('⭐ 兩個都像就兩個都列（Nic → Nick、Nico）——不挑一個', W.askSuggest('Nic', names).join() === 'Nick,Nico');
ok('⭐⭐ Elroy 與 Elory：打 Eloy（兩邊都只差一個字）→ 兩個都列出來，不自己選', (() => { const r = W.askSuggest('Eloy', names); return r.length === 2 && r.includes('Elroy') && r.includes('Elory'); })());
ok('完全一樣的不算打錯（不列）', !W.askSuggest('Nick', names).includes('Nick'));
ok('差太多的不列（Jack → 空）', W.askSuggest('Jack', names).length === 0);
ok('中文：小明 → 陳小明（包含）；期末複習 → 期中複習（差一字）', W.askSuggest('小明', names)[0] === '陳小明' && W.askSuggest('期末複習', ['期中複習', 'Unit 1'])[0] === '期中複習');
ok('只用名字裡的詞：Nik 也找得到 "Nick Chen"', W.askSuggest('Nik', ['Nick Chen', 'Amy'])[0] === 'Nick Chen');
ok('空字串／沒有候選不報錯', W.askSuggest('', names).length === 0 && W.askSuggest('Nik', []).length === 0 && W.askSuggest('Nik', null).length === 0);
ok('最多 4 個', W.askSuggest('Tim', ['Tom', 'Tam', 'Tin', 'Tip', 'Tia', 'Tid']).length === 4);

console.log('\n【2】askVerify：學生打錯字 → 問「你是說…？」而不是放棄');
const raw = { intent: 'lesson', student: 'Nik', text: '今天上了 unit 3', say: '好' };
let p = W.askVerify(raw, { roster });
ok('⭐ 沒有直接當成 Nick：intent 是 unknown、email 是空的（不替他選）', p.intent === 'unknown' && !p.email);
ok('⭐ 帶著候選與原始回答（點選後可以重新驗）', p.dym && p.dym.field === 'student' && p.dym.options.join() === 'Nick' && p.dym.raw === raw);
ok('問句有講清楚：「名單裡沒有「Nik」——你是說 Nick 嗎？」', /沒有「Nik」/.test(p.ask) && /Nick/.test(p.ask));
const p2 = W.askVerify({ ...p.dym.raw, student: 'Nick' }, { roster });
ok('⭐⭐ 點選 Nick 之後用同一份重新驗 → 回到原本的事（lesson）且帶著 Nick 的 email', p2.intent === 'lesson' && p2.email === 'nick@x.com' && p2.text === '今天上了 unit 3');
p = W.askVerify({ intent: 'lesson', student: 'Jack', text: 'x' }, { roster });
ok('完全不像的 → 老實說找不到、沒有按鈕', p.intent === 'unknown' && !p.dym && /找不到「Jack」/.test(p.ask));
p = W.askVerify({ intent: 'stars', student: 'Eloy', amount: 5 }, { roster });
ok('⭐ 給星星打錯名字（Eloy）→ 列 Elroy / Elory 讓他點，不會自己加給誰', p.intent === 'unknown' && p.dym.options.length === 2 && !p.email);

console.log('\n【3】新的兩個 intent 的夾回');
const base = { roster };
ok('compose 沒講週也沒講組 → 問', W.askVerify({ intent: 'compose' }, base).intent === 'unknown');
p = W.askVerify({ intent: 'compose', weeks: [1, 2, 3, 99, 0, -4], title: '期中複習', toWeek: 0 }, base);
ok('compose：週次夾在 1~40 內、title 保留', p.intent === 'compose' && p.weeks.join() === '1,2,3' && p.title === '期中複習' && p.toWeek === 0);
ok('qmove 沒講目的地 → 問', W.askVerify({ intent: 'qmove', group: 'Unit 1', qnums: [1] }, base).intent === 'unknown');
ok('qmove 沒講題號也沒說全部 → 問「第幾題」', (() => { const q = W.askVerify({ intent: 'qmove', group: 'U1', toGroup: 'U2' }, base); return q.intent === 'unknown' && /第幾題/.test(q.ask); })());
p = W.askVerify({ intent: 'qmove', group: 'U1', toGroup: 'U2', qnums: [2, 3, 0, -1, 500, 'x', 2.4], copy: true }, base);
ok('⭐ qmove 題號夾回受控值（0、負數、500、文字都丟掉）；copy 只有 true 才算', p.intent === 'qmove' && p.qnums.join() === '2,3,2' && p.copy === true);
ok('   說全部（qall）可以不給題號；copy 預設 false', (() => { const q = W.askVerify({ intent: 'qmove', group: 'U1', toGroup: 'U2', qall: true }, base); return q.intent === 'qmove' && q.qall && q.copy === false; })());
ok('   聊天室列得出這兩件事（ASK_JOBS 與提示詞都有）', !!W.ASK_JOBS.compose && !!W.ASK_JOBS.qmove && /compose\s+—/.test(data) && /qmove\s+—/.test(data) && /unit compose qmove unknown/.test(data));

console.log('\n【4】接線（寫了沒人讀是最常見的坑）');
ok('⭐ AskPanel：按鈕點選 → 用 askVerify 重驗 → 走同一個 respond（查詢類也一樣）', /ask-dym/.test(ed) && /window\.askVerify\(raw,/.test(ed) && /await respond\(p2,/.test(ed) && /const respond = async \(plan, t, shots\)/.test(ed));
ok('⭐ 點選後保留原本那句話（查詢要看有沒有提到「提醒」）', /plan\.userText = t;/.test(ed) && /m\.plan\.userText \|\| ''/.test(ed));
ok('⭐ 學生對不到：5 個地方都改走 askStudentMiss（不再只丟一句找不到）', (app.match(/askStudentMiss\(/g) || []).length >= 5 && !/showToast\(f && f\.many/.test(app) && !/showToast\(found && found\.many/.test(app));
ok('⭐ 上課紀錄那條：跳出選項後不再同時把後台打開', /askStudentMiss\(found, plan\) === 'chooser'\) \{ setAskOpen\(false\); return; \}/.test(app));
ok('⭐ 改／刪單元、搬題目共用 askResolveUnit（多個／打錯字都能點選）', (app.match(/askResolveUnit\(/g) || []).length >= 3);
ok('⭐ 找組（review／group／merge）找不到 → 列相似的組讓他點', (app.match(/window\.askSuggest\(/g) || []).length >= 4);
ok('⭐ 選項點下去是「用那個名字重跑 runAskPlan」，不是直接動手', /runAskPlan\(\{ \.\.\.plan, student: o \}\)/.test(app) && /runAskPlan\(\{ \.\.\.plan, \[field\]: o \}\)/.test(app));
ok('⭐ compose／qmove 只「開視窗＋預選」，真正動手還是 handleCompose／handleQuestionMove（按鈕）', /plan\.intent === 'compose'[\s\S]{0,2500}setComposeOpen\(\{/.test(app) && /plan\.intent === 'qmove'[\s\S]{0,2500}setQMoveFor\(src\.item\)/.test(app));
ok('⭐ 兩個視窗真的有讀 initial（寫了沒人讀）', /initial=\{qMoveInit\}/.test(app) && /initial=\{composeOpen === true \? null : composeOpen\}/.test(app)
  && /const ini = initial \|\| \{\};\s*\/\/ v592：聊天室可以把週次/.test(ed) && /ini\.sel \|\| \[\]/.test(ed) && /ini\.picks/.test(ed));
ok('⭐ 題號超出範圍老實說，不是裁掉', /沒有第 \$\{bad\.join\('、'\)\} 題/.test(app));
ok('⭐ 「你是說…」視窗有「都不是」出口', /都不是/.test(app));
console.log(fail ? `\n❌ t-v592：${pass} 過 / ${fail} 失敗` : `\n✅ t-v592：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
