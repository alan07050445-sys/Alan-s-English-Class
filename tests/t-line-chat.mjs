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
  for (const t of ['你好', '在嗎', '哈哈哈', '???', '老師好帥', '123456', 'ㄅㄨㄅㄨ']) {
    const r = await W.handleNameBinding(makeEnv(BOUND), 'U1', t);
    ok(`「${t}」→ 不再說「找不到這位學生」`, !String(r).includes('找不到'), r);
  }
  const r = await W.handleNameBinding(makeEnv(BOUND), 'U1', '你好');
  ok('改成一句有禮貌的回覆', W.POLITE.indexOf(r) >= 0, r);
}

// ═══ 2. 三件事：打字也認得（不是只有選單）═══
log.push('\n【C2】不用選單、直接打字也認得（Alan：有些家長不想用選單）');
{
  const say = (t) => W.handleNameBinding(makeEnv(BOUND), 'U1', t);
  const isHw = (r) => !!(r && r.hw);
  for (const t of ['作業', '查作業', '我要看作業', '功課寫完了嗎', '小孩還有什麼沒完成', '進度如何', 'homework']) {
    ok(`「${t}」→ 查作業`, isHw(await say(t)), JSON.stringify(await say(t)).slice(0, 80));
  }
  for (const t of ['練習', '網站', '網址', '連結', '網站在哪', '要去哪裡練習', '怎麼進去']) {
    ok(`「${t}」→ 給練習網站`, String(await say(t)).includes('github.io'), await say(t));
  }
  for (const t of ['孩子', '我的孩子', '新增', '新增孩子', '要加一個小孩', '弟弟也要收']) {
    ok(`「${t}」→ 新增/刪除孩子`, String(await say(t)).includes('➕ 新增'), await say(t));
  }
  ok('「小孩寫完了嗎」判成查作業，不是問綁定（順序很重要）', isHw(await say('小孩寫完了嗎')));
  ok('「我的孩子作業」判成查作業', isHw(await say('我的孩子作業')));
}

// ═══ 3. 新增／刪除孩子 ═══
log.push('\n【C3】家長可以自己新增與刪除孩子');
{
  const env = makeEnv(BOUND);
  const links = () => JSON.parse(env._store.get('links') || '{}');
  const r1 = await W.handleNameBinding(env, 'U1', '新增 Tayler');
  ok('「新增 Tayler」一句就綁好', has(r1, '已綁定 Tayler（G2）') && links().U1.length === 2, r1);
  const r2 = await W.handleNameBinding(env, 'U1', '刪除');
  ok('只打「刪除」→ 先問要刪哪一位，並列出名單', has(r2, '要刪除哪一位', '・Eric（G4）', '刪除 Eric'), r2);
  ok('只打「刪除」不會真的刪掉', links().U1.length === 2, JSON.stringify(links()));
  const r3 = await W.handleNameBinding(env, 'U1', '刪除 Tayler');
  ok('「刪除 Tayler」→ 刪掉並回報剩下誰', has(r3, '已刪除 Tayler（G2）', '目前還綁定', 'Eric'), r3);
  ok('KV 真的只剩一位', links().U1.length === 1 && links().U1[0].name === 'Eric', JSON.stringify(links()));
  const r4 = await W.handleNameBinding(env, 'U1', '刪掉Eric');
  ok('「刪掉Eric」（沒空格）也認得', has(r4, '已刪除 Eric（G4）'), r4);
  ok('全部刪光 → KV 不留空殼', !links().U1, JSON.stringify(links()));
  ok('刪光之後會教他怎麼加回來', has(r4, '重新加回來'), r4);
  const r5 = await W.handleNameBinding(env, 'U1', 'Eric');
  ok('刪掉之後還能重新綁回來', has(r5, '已綁定 Eric（G4）'), r5);
  const r6 = await W.handleNameBinding(makeEnv(), 'Uz', '刪除');
  ok('沒綁過的人打「刪除」→ 引導他先綁定', has(r6, '沒有綁定任何孩子'), r6);
}

// ═══ 4. 無關訊息 → 隨機有禮貌的回覆 ═══
log.push('\n【C4】跟三件事無關的訊息 → 隨機一句有禮貌的回覆');
{
  const seen = new Set();
  for (const t of ['你好', '今天天氣真好', '老師好帥', 'ㄏㄏ', '???', '123', '在嗎', '哈哈哈哈']) {
    const r = await W.handleNameBinding(makeEnv(BOUND), 'U1', t);
    ok(`「${t}」→ 有禮貌的回覆（不再說找不到學生）`,
       W.POLITE.indexOf(r) >= 0, r);
    seen.add(r);
  }
  ok('不是每次都同一句（不同人會拿到不同句）',
     new Set(['Ua','Ub','Uc','Ud','Ue','Uf','Ug'].map((u) => W.politeReply(u))).size > 1,
     JSON.stringify(['Ua','Ub','Uc','Ud','Ue','Uf','Ug'].map((u) => W.politeReply(u))));
  ok('每一句都有禮貌、也都短', W.POLITE.every((x) => x.length < 60 && /謝謝|收到|好的/.test(x)), JSON.stringify(W.POLITE.map((x) => x.length)));
  ok('至少有一句會提示可以查作業', W.POLITE.some((x) => x.includes('作業')));
  log.push('\n───── 六句備選 ─────\n' + W.POLITE.map((x, i) => (i + 1) + '. ' + x.replace(/\n/g, ' / ')).join('\n') + '\n────────────────────');
}

// ═══ 4b. 不洗版 ═══
log.push('\n【C4b】家長連打好幾句，不會被自動回覆洗版');
{
  const env = makeEnv(BOUND);
  const a = await W.handleNameBinding(env, 'U1', '老師我想請假');
  ok('第一句 → 有禮貌地回一次', W.POLITE.indexOf(a) >= 0, a);
  const b = await W.handleNameBinding(env, 'U1', '因為下禮拜要出國');
  const c = await W.handleNameBinding(env, 'U1', '大概兩個禮拜');
  ok('接下來 10 分鐘內完全不回話', b === '' && c === '', JSON.stringify([b, c]));
  ok('但「作業」還是叫得動', !!(await W.handleNameBinding(env, 'U1', '作業')).hw);
  const st = JSON.parse(env._store.get('chatstate'));
  st.U1.ts = Date.now() - 11 * 60 * 1000;
  env._store.set('chatstate', JSON.stringify(st));
  ok('過了 10 分鐘再開口 → 又會客氣回一次', W.POLITE.indexOf(await W.handleNameBinding(env, 'U1', '在嗎')) >= 0);
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
log.push('\n【C6】意圖判斷的邊界');
{
  ok('「刪除」排在「新增」前面（刪除 Eric 不會被當成新增）', W.INTENT.remove.test('刪除 Eric'));
  ok('「說明/選單」要整句吻合，不會誤傷別的句子', W.INTENT.help.test('說明') && !W.INTENT.help.test('說明一下作業'));
  ok('大小寫不影響（HW / homework）', W.INTENT.hw.test('HW') && W.INTENT.hw.test('Homework'));
  const menu = W.menuText();
  ok('功能表只講三件事', has(menu, '「練習」', '「作業」', '「孩子」') && !menu.includes('課表'), menu);
  log.push('\n───── 輸入「說明」會收到 ─────\n' + menu + '\n────────────────────────────');
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
