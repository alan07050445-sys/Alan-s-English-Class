/* t-line-bind — LINE 家長綁定對話流程的端到端測試（純 Node，不碰網路） */
import fs from 'fs';
const src = fs.readFileSync(new URL('../line-notify-worker.js', import.meta.url), 'utf8');
const W = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

// ── 假的 Workers KV ──────────────────────────────────────
function makeEnv(roster) {
  const store = new Map([['roster', JSON.stringify(roster)]]);
  return {
    LINKS: {
      get: async (k) => (store.has(k) ? store.get(k) : null),
      put: async (k, v) => void store.set(k, v),
    },
    _store: store,
    _links: () => JSON.parse(store.get('links') || '{}'),
  };
}

const ROSTER = [
  { email: 'eric@kcbs.tw',    name: 'Eric',        grade: 'g4' },
  { email: 'tayler@kcbs.tw',  name: 'Tayler',      grade: 'g2' },
  { email: 'elaine@kcbs.tw',  name: 'Elaine',      grade: 'g5' },
  { email: 'kevin@kcbs.tw',   name: 'Kevin',       grade: 'g3' },
  { email: 'nick@kcbs.tw',    name: 'Nick',        grade: 'g6' },
  { email: 'lucas@kcbs.tw',   name: 'Lucas Chen',  grade: 'g4' },
  { email: 'eric2@kcbs.tw',   name: 'Eric',        grade: 'g1', active: false }, // 已停用的同名
  { email: 'amy@kcbs.tw',     name: 'Amy',         grade: 'g2' },
];
// Natalie 尚未加入名單（Alan 說的情況）

let pass = 0, fail = 0;
const log = [];
function ok(name, cond, extra) {
  if (cond) { pass++; log.push('  ✅ ' + name); }
  else { fail++; log.push('  ❌ ' + name + (extra ? '\n       ↳ ' + String(extra).replace(/\n/g, '\n         ') : '')); }
}
const has = (s, ...subs) => subs.every((x) => String(s).includes(x));

// ═══ 1. 名單全英文的判斷 ═══
log.push('\n【1】名單是不是全英文（決定要不要註明「請用英文名字」）');
ok('全英文名單 → true', W.rosterAllEnglish(ROSTER) === true);
ok('混中文名單 → false', W.rosterAllEnglish([...ROSTER, { email: 'x@x', name: '王小明', grade: 'g1' }]) === false);
ok('空名單 → false', W.rosterAllEnglish([]) === false);
ok('停用的中文名不影響', W.rosterAllEnglish([...ROSTER, { email: 'y@y', name: '王小美', active: false }]) === true);
ok('Lucas Chen 這種兩段英文名算英文', W.rosterAllEnglish([{ email: 'a@a', name: "Lucas Chen" }]) === true);

// ═══ 2. 歡迎訊息 ═══
log.push('\n【2】加好友後的歡迎訊息（問候＋請家長輸入孩子名字，一則講完）');
{
  const env = makeEnv(ROSTER);
  const w = await W.welcomeMessage(env);
  ok('第一句就是問候（不用再靠官方帳號的歡迎訊息）', w.startsWith("歡迎加入 Alan's English Class"), w);
  ok('有先說這裡會做什麼，再請家長輸入', w.indexOf('班級通知') < w.indexOf('回覆孩子的英文名字'), w);
  ok('有問孩子名字', has(w, '回覆孩子的英文名字'), w);
  ok('有註明是康橋帳號的英文名字', has(w, '康橋帳號'), w);
  ok('有示範兩位孩子怎麼打', /例如：\n[A-Za-z]+ & [A-Za-z]+/.test(w), w);
  ok('⭐ 舉例完全沒用到班上任何一位學生的名字',
     ROSTER.every((st) => !new RegExp('\\b' + st.name.split(' ')[0] + '\\b').test(w)), w);
  const ex = W.exampleNames(ROSTER, true);
  ok('舉例的兩個名字互不相同', ex.one !== ex.two.split(' & ')[1]);
  ok('名單裡若剛好有 Emma、Ryan → 自動換掉，不會拿學生當範例', (() => {
    const r2 = [{ email: 'a@a', name: 'Emma' }, { email: 'b@b', name: 'Ryan' }];
    const e2 = W.exampleNames(r2, true);
    return e2.one !== 'Emma' && !e2.two.includes('Emma') && !e2.two.includes('Ryan');
  })(), JSON.stringify(W.exampleNames([{ email: 'a@a', name: 'Emma' }, { email: 'b@b', name: 'Ryan' }], true)));
  const wc = await W.welcomeMessage(makeEnv([{ email: 'a@a', name: '王小明', grade: 'g1' }]));
  ok('名單若有中文名 → 改講「姓名」不講英文', has(wc, '孩子的姓名') && !wc.includes('英文名字'), wc);
}

// ═══ 3. 主線：一位孩子 ═══
log.push('\n【3】主線 A —— 只有一位孩子');
{
  const env = makeEnv(ROSTER);
  const U = 'U_one';
  const r1 = await W.handleNameBinding(env, U, 'Eric');
  ok('綁到 Eric（G4）', has(r1, '已綁定 Eric（G4）'), r1);
  ok('接著問有沒有第二位', has(r1, '還有第二位孩子嗎'), r1);
  ok('有教怎麼結束', has(r1, '沒有'), r1);
  const r2 = await W.handleNameBinding(env, U, '沒有');
  ok('回「沒有」→ 綁定完成', has(r2, '綁定完成'), r2);
  ok('完成訊息列出已綁的孩子', has(r2, '・Eric（G4）'), r2);
  ok('KV 只存 1 位', (env._links()[U] || []).length === 1, JSON.stringify(env._links()));
  ok('存的是 email 不是名字', env._links()[U][0].email === 'eric@kcbs.tw');
}

// ═══ 4. 主線：兩位孩子（分兩次講）═══
log.push('\n【4】主線 B —— 兩位孩子，分兩次輸入（Eric & Tayler）');
{
  const env = makeEnv(ROSTER);
  const U = 'U_two';
  const r1 = await W.handleNameBinding(env, U, 'Eric');
  ok('第一位綁好並追問', has(r1, '已綁定 Eric（G4）', '還有第二位'), r1);
  const r2 = await W.handleNameBinding(env, U, 'Tayler');
  ok('第二位也綁好', has(r2, '已綁定 Tayler（G2）'), r2);
  ok('綁滿 2 位 → 直接說完成，不再追問', has(r2, '綁定完成') && !r2.includes('還有第二位'), r2);
  ok('完成訊息兩位都列出', has(r2, '・Eric（G4）', '・Tayler（G2）'), r2);
  ok('KV 存 2 位', (env._links()[U] || []).length === 2);
  const r3 = await W.handleNameBinding(env, U, 'Kevin');
  ok('第三位被擋下並請聯絡老師', has(r3, '已經綁定 2 位', '聯絡 Alan 老師'), r3);
  ok('第三位沒被寫進 KV', (env._links()[U] || []).length === 2);
}

// ═══ 5. 一次輸入兩個名字 ═══
log.push('\n【5】主線 C —— 一次輸入兩個名字（各種寫法）');
for (const t of ['Eric & Tayler', 'Eric&Tayler', 'Eric, Tayler', 'Eric，Tayler', 'Eric、Tayler', 'Eric and Tayler', 'Eric 和 Tayler', 'Eric 跟 Tayler', 'eric & tayler', 'Eric Tayler']) {
  const env = makeEnv(ROSTER);
  const r = await W.handleNameBinding(env, 'U_' + t, t);
  const n = (env._links()['U_' + t] || []).length;
  ok(`「${t}」→ 兩位一起綁好`, n === 2 && has(r, '已綁定 Eric（G4）、Tayler（G2）') && has(r, '綁定完成'), r);
}
{
  const env = makeEnv(ROSTER);
  const r = await W.handleNameBinding(env, 'U_e3', 'Eric & Tayler & Kevin');
  ok('一次打三個 → 只收 2 位，第三位請聯絡老師', (env._links()['U_e3'] || []).length === 2 && has(r, '最多綁 2 位', 'Kevin'), r);
}

// ═══ 6. 大小寫 / 空白 / 姓名寫法 ═══
log.push('\n【6】家長打字的各種樣子');
for (const [t, want] of [['eric', 'Eric'], ['ERIC', 'Eric'], ['  Eric  ', 'Eric'], ['Eric.', 'Eric'], ['Eric!', 'Eric'], ['Lucas', 'Lucas Chen'], ['lucas chen', 'Lucas Chen'], ['Lucas-Chen', 'Lucas Chen']]) {
  const env = makeEnv(ROSTER);
  const r = await W.handleNameBinding(env, 'U_c' + t, t);
  ok(`「${t}」→ 綁到 ${want}`, has(r, '已綁定 ' + want), r);
}

// ═══ 7. 失敗情境 ═══
log.push('\n【7】配不到的時候，家長看得懂嗎');
{
  const env = makeEnv(ROSTER);
  const r = await W.handleNameBinding(env, 'U_na', 'Natalie');   // Alan 說 Natalie 還沒加入
  ok('沒在名單裡 → 說找不到 + 請聯絡老師', has(r, '找不到「Natalie」', 'Alan 老師'), r);
  ok('沒亂綁', !env._store.get('links'), env._store.get('links'));
  const r2 = await W.handleNameBinding(env, 'U_cn', '陳小明');
  ok('打中文 → 提醒名單是英文名字', has(r2, '英文名字'), r2);
  const r3 = await W.handleNameBinding(makeEnv([]), 'U_x', 'Eric');
  ok('名單還沒同步 → 不會誤判成找不到學生', has(r3, '名單尚未就緒'), r3);
  const amb = [...ROSTER, { email: 'eric3@kcbs.tw', name: 'Eric', grade: 'g2' }];
  const r4 = await W.handleNameBinding(makeEnv(amb), 'U_amb', 'Eric');
  ok('真的同名兩位 → 請老師處理，不亂猜', has(r4, '多位「Eric」', 'Alan 老師'), r4);
  const r5 = await W.handleNameBinding(makeEnv(ROSTER), 'U_off', 'Eric');
  ok('已停用的同名學生不算同名衝突', has(r5, '已綁定 Eric（G4）'), r5);
}

// ═══ 8. 重複與查詢 ═══
log.push('\n【8】重複輸入、查詢綁定狀態');
{
  const env = makeEnv(ROSTER);
  const U = 'U_dup';
  await W.handleNameBinding(env, U, 'Eric');
  const r = await W.handleNameBinding(env, U, 'Eric');
  ok('同一位再打一次 → 不重複綁', (env._links()[U] || []).length === 1 && has(r, '之前就綁好了'), r);
  const q = await W.handleNameBinding(env, U, '查詢');
  ok('「查詢」→ 列出已綁的孩子（並教他怎麼新增/刪除）', has(q, '・Eric（G4）', '➕ 新增'), q);
  ok('「查詢」不會被當成名字', (env._links()[U] || []).length === 1);
  const q2 = await W.handleNameBinding(makeEnv(ROSTER), 'U_q0', '查詢');
  ok('還沒綁的人查詢 → 引導他輸入名字', has(q2, '還沒有綁定', '英文名字'), q2);
}

// ═══ 9. 「沒有」的各種說法 ═══
log.push('\n【9】回答「沒有第二位」的各種說法');
for (const t of ['沒有', '沒', '無', '不用', 'no', 'NO', 'n', '只有一位', '1', '沒有了', '就這樣']) {
  const env = makeEnv(ROSTER);
  const U = 'U_n' + t;
  await W.handleNameBinding(env, U, 'Eric');
  const r = await W.handleNameBinding(env, U, t);
  ok(`「${t}」→ 收尾說完成`, has(r, '綁定完成') && !r.includes('找不到'), r);
}
{
  const env = makeEnv(ROSTER);
  const r = await W.handleNameBinding(env, 'U_neg0', '沒有');   // 一開始就講「沒有」
  ok('還沒綁就講「沒有」→ 不會誤判成完成', !has(r, '綁定完成'), r);
}

// ═══ 10. 綁定後隨時新增 ═══
log.push('\n【10】說完「沒有」之後又想加第二位');
{
  const env = makeEnv(ROSTER);
  const U = 'U_later';
  await W.handleNameBinding(env, U, 'Elaine');
  await W.handleNameBinding(env, U, '沒有');
  const r = await W.handleNameBinding(env, U, 'Kevin');
  ok('之後再打名字 → 還是能綁第二位', has(r, '已綁定 Kevin（G3）') && (env._links()[U] || []).length === 2, r);
}

// ═══ 11. 資料形狀沒被改壞（/push、作業提醒都靠它）═══
log.push('\n【11】links 的資料形狀（/push 與作業提醒會讀）');
{
  const env = makeEnv(ROSTER);
  await W.handleNameBinding(env, 'U_shape', 'Eric & Tayler');
  const arr = env._links()['U_shape'];
  ok('是陣列', Array.isArray(arr));
  ok('每筆都有 email/name/grade 三欄', arr.every((x) => typeof x.email === 'string' && typeof x.name === 'string' && typeof x.grade === 'string'), JSON.stringify(arr));
  ok('grade 維持小寫（/push 用 toLowerCase 比對）', arr.every((x) => x.grade === x.grade.toLowerCase()), JSON.stringify(arr));
  ok('沒有多餘欄位', arr.every((x) => Object.keys(x).sort().join() === 'email,grade,name'), JSON.stringify(arr));
}

// ═══ 12. 訊息長度（LINE 單則上限 5000 字）═══
log.push('\n【12】每一則訊息都在 LINE 的 5000 字上限內');
{
  const env = makeEnv(ROSTER);
  const msgs = [await W.welcomeMessage(env)];
  const U = 'U_len';
  msgs.push(await W.handleNameBinding(env, U, 'Eric'));
  msgs.push(await W.handleNameBinding(env, U, 'Tayler'));
  msgs.push(await W.handleNameBinding(env, U, 'Kevin'));
  ok('全部 < 5000 字', msgs.every((m) => m.length < 5000), msgs.map((m) => m.length).join(','));
  ok('沒有空訊息（LINE 會 400）', msgs.every((m) => m && m.trim().length > 0));
}

// ═══ 13. 名單來源退路（Firestore 讀不到時不能整組掛掉）═══
log.push('\n【13】名單來源的退路');
{
  const env = makeEnv(ROSTER); env.FIREBASE_SA = '{ 壞掉的 JSON';
  const r = await W.handleNameBinding(env, 'U_fb', 'Eric');
  ok('服務帳號壞掉 → 自動退回後台同步的名單，照樣綁得起來', has(r, '已綁定 Eric（G4）'), r);
  const env2 = makeEnv(ROSTER);
  env2.FIREBASE_SA = JSON.stringify({ project_id: 'p', client_email: 'x', private_key: 'bad' });
  const r2 = await W.handleNameBinding(env2, 'U_fb2', 'Tayler');
  ok('金鑰簽不出來 → 一樣退回 KV 名單', has(r2, '已綁定 Tayler（G2）'), r2);
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
