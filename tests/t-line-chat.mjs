/* t-line-chat — 聊天室的固定回覆（Alan：「不管我問什麼他都會回答綁定學生的訊息」
 * 「怕小朋友亂問問題」「只需要固定回答幾個回應就好」） */
import fs from 'fs';
const src = fs.readFileSync(new URL('../line-notify-worker.js', import.meta.url), 'utf8');
const W = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e).replace(/\n/g, '\n         ') : '')));
const has = (s, ...xs) => xs.every((x) => String(s).includes(x));

const ROSTER = [
  { email: 'le12777@kcbs.tw', name: 'Eric', grade: 'g4' },
  { email: 'le14001@kcbs.tw', name: 'Tayler', grade: 'g2' },
];
function makeEnv(links) {
  const store = new Map([['roster', JSON.stringify(ROSTER)]]);
  if (links) store.set('links', JSON.stringify(links));
  return { LINE_TOKEN: 't', LINKS: { get: async (k) => (store.has(k) ? store.get(k) : null), put: async (k, v) => void store.set(k, v) }, _store: store };
}
const BOUND = { U1: [{ email: 'le12777@kcbs.tw', name: 'Eric', grade: 'g4' }] };

// ═══ 1. 已綁定的人亂打 → 不再回「找不到這位學生」═══
log.push('\n【C1】已經綁好的人隨口打字（Alan 回報的困擾）');
{
  const env = makeEnv(BOUND);
  for (const t of ['你好', '在嗎', '哈哈哈', '???', '老師好帥', '123456', 'ㄅㄨㄅㄨ']) {
    const r = await W.handleNameBinding(env, 'U1', t);
    ok(`「${t}」→ 不再說「找不到這位學生」`, !String(r).includes('找不到'), r);
  }
  const r = await W.handleNameBinding(env, 'U1', '你好');
  ok('改成給一份看得懂的功能表', has(r, '看不懂這句話', '「作業」', '「綁定」', '「網站」', '「課表」', '「老師」'), r);
  log.push('\n───── 亂打時會收到 ─────\n' + r + '\n────────────────────────');
}

// ═══ 2. 固定指令 ═══
log.push('\n【C2】固定指令');
{
  const env = makeEnv(BOUND);
  const say = (t) => W.handleNameBinding(env, 'U1', t);
  ok('「說明」→ 功能表', has(await say('說明'), '自動回覆的小幫手'), await say('說明'));
  ok('「選單」「help」「？」都通', [await say('選單'), await say('help'), await say('？')].every((x) => has(x, '自動回覆的小幫手')));
  const site = await say('網站');
  ok('「網站」→ 給網址', has(site, 'https://alan07050445-sys.github.io/Alan-s-English-Class/', '學校帳號登入'), site);
  ok('「連結」「練習」「登入」都通', [await say('連結'), await say('練習'), await say('登入')].every((x) => x.includes('github.io')));
  const cls = await say('課表');
  ok('「課表」→ 固定回覆，並告訴他怎麼找老師', has(cls, '上課時間', '輸入「老師」'), cls);
  const bind = await say('綁定');
  ok('「綁定」→ 列出綁了誰', has(bind, '已綁定', 'Eric'), bind);
}

// ═══ 3. 「作業」＝交給 webhook 現查 ═══
log.push('\n【C3】「作業」會去現場查（不是回一句話）');
{
  const env = makeEnv(BOUND);
  for (const t of ['作業', '查作業', '功課', '進度', 'hw']) {
    const r = await W.handleNameBinding(env, 'U1', t);
    ok(`「${t}」→ 交給現查流程`, r && r.hw && r.hw.length === 1 && r.hw[0].email === 'le12777@kcbs.tw', JSON.stringify(r));
  }
  const r0 = await W.handleNameBinding(makeEnv(), 'Uzz', '作業');
  ok('還沒綁的人問作業 → 先請他綁定', r0 && r0.hw && r0.hw.length === 0, JSON.stringify(r0));
  const msgs = await W.hwReplyMessages(makeEnv(), []);
  ok('回覆會請他輸入孩子的英文名字', has(msgs[0].text, '還沒綁定', '英文名字'), JSON.stringify(msgs));
}

// ═══ 4. 轉人工：一小時內完全不自動回覆 ═══
log.push('\n【C4】「老師」→ 轉人工，之後安靜（讓家長好好留言）');
{
  const env = makeEnv(BOUND);
  const r = await W.handleNameBinding(env, 'U1', '老師');
  ok('先說明接下來不會自動回覆', has(r, '不會自動回覆', '親自回覆'), r);
  for (const t of ['我想請假', '禮拜三可以嗎', '小孩最近很累']) {
    const q = await W.handleNameBinding(env, 'U1', t);
    ok(`「${t}」→ 完全不回話（空字串）`, q === '', JSON.stringify(q));
  }
  ok('但「作業」還是叫得動', (await W.handleNameBinding(env, 'U1', '作業')).hw !== undefined);
  ok('「說明」也叫得動', has(await W.handleNameBinding(env, 'U1', '說明'), '小幫手'));
  log.push('\n───── 輸入「老師」會收到 ─────\n' + r + '\n────────────────────────────');
  // 一小時後恢復
  const st = JSON.parse(env._store.get('chatstate'));
  st.U1.ts = Date.now() - 61 * 60 * 1000;
  env._store.set('chatstate', JSON.stringify(st));
  ok('一小時後恢復自動回覆', has(await W.handleNameBinding(env, 'U1', '你好'), '看不懂這句話'));
}

// ═══ 5. 綁定流程沒有被指令弄壞 ═══
log.push('\n【C5】綁定流程不受影響');
{
  const env = makeEnv();
  const r1 = await W.handleNameBinding(env, 'Unew', 'Eric');
  ok('還沒綁的人打名字 → 照樣綁得起來', has(r1, '已綁定 Eric（G4）'), r1);
  const r2 = await W.handleNameBinding(env, 'Unew', 'Tayler');
  ok('第二位也綁得起來', has(r2, '已綁定 Tayler（G2）'), r2);
  ok('綁完會告訴家長可以輸入「作業」', has(r2, '輸入「作業」'), r2);
  const env2 = makeEnv();
  const r3 = await W.handleNameBinding(env2, 'Ux', 'Natalie');
  ok('還沒綁的人打錯名字 → 還是要說找不到（這時候才有幫助）', has(r3, '找不到「Natalie」'), r3);
  // 已綁一位的人再打第二個名字
  const env3 = makeEnv(BOUND);
  const r4 = await W.handleNameBinding(env3, 'U1', 'Tayler');
  ok('已綁一位的人打名單上的名字 → 還是能加第二位', has(r4, '已綁定 Tayler（G2）'), r4);
}

// ═══ 6. 指令要「整句吻合」才算，不能誤判成名字 ═══
log.push('\n【C6】指令只認整句，不會誤傷');
{
  ok('「作業」是指令', W.CMD.hw.test('作業'));
  ok('「我的作業寫完了」不是指令（交給一般流程）', !W.CMD.hw.test('我的作業寫完了'));
  ok('「老師」是指令', W.CMD.human.test('老師'));
  ok('「老師好」不是指令', !W.CMD.human.test('老師好'));
  ok('大小寫不影響（HW / Help）', W.CMD.hw.test('HW') && W.CMD.help.test('Help'));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
