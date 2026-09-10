/* t-line-hw-layout — 作業提醒的排版：本週／前幾週還沒完成／可以先預習
 * Alan 回報（實機截圖）：14 行全部寫「新作業」，同一課的六種題型各佔一行，
 * 而且 Week4 / Week5 的作業在 Week2 就跳出來，家長看不懂。 */
import fs from 'fs';
const src = fs.readFileSync(new URL('../line-notify-worker.js', import.meta.url), 'utf8');
const W = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e).replace(/\n/g, '\n         ') : '')));
const has = (s, ...xs) => xs.every((x) => String(s).includes(x));

// ── 造一份跟 Alan 真實資料同形狀的 G4 課程文件 ─────────────
const S = (v) => ({ stringValue: v });
const B = (v) => ({ booleanValue: v });
// 一課出一整組題型（就是家長截圖裡「六行一樣的標題」）
const LESSON_TYPES = ['flashcard', 'quiz', 'spelling', 'fillblank', 'def-match'];
function lesson(title, cat, types) {
  return (types || LESSON_TYPES).map((t) => ({ mapValue: { fields: {
    id: S(title + '__' + t), title: S(title), type: S(t),
  } } }));
}
function week({ id, label, start, end, lessons, due, archived }) {
  const items = {}, hw = {};
  for (const L of lessons) {
    (items[L.cat] = items[L.cat] || []).push(...lesson(L.title, L.cat, L.types));
    for (const t of (L.types || LESSON_TYPES)) hw[L.title + '__' + t] = { mapValue: { fields: { dueDate: S(due) } } };
  }
  const f = {
    id: S(id), label: S(label), startISO: S(start), endISO: S(end),
    items: { mapValue: { fields: Object.fromEntries(Object.entries(items).map(([k, v]) => [k, { arrayValue: { values: v } }])) } },
    homework: { mapValue: { fields: hw } },
  };
  if (archived) f.archived = B(true);
  return [id, { mapValue: { fields: f } }];
}
// 今天 = 2026-09-10（星期四），本週 = 9/7 ~ 9/13
const G4 = { fields: { weeks: { mapValue: { fields: Object.fromEntries([
  week({ id: 'g4-2026F-W01', label: 'Week 1', start: '2026-08-31', end: '2026-09-06', due: '2026-09-06',
         lessons: [{ title: 'Reaching for the moon - week1', cat: 'vocab' }] }),
  week({ id: 'g4-2026F-W02', label: 'Week 2', start: '2026-09-07', end: '2026-09-13', due: '2026-09-06',
         lessons: [{ title: 'Feathers, Not just for flying - week2', cat: 'vocab' },
                   { title: '判斷 Compound Sentences ', cat: 'grammar', types: ['quiz'] }] }),
  week({ id: 'g4-2026F-W04', label: 'Week 4', start: '2026-09-21', end: '2026-09-27', due: '2026-09-27',
         lessons: [{ title: 'Rare Treasure - Part 1', cat: 'vocab' },
                   { title: 'Rare Treasure - Part 1 · 短文填空', cat: 'vocab', types: ['cloze'] }] }),
  week({ id: 'g4-2026F-W05', label: 'Week 5', start: '2026-09-28', end: '2026-10-04', due: '2026-10-04',
         lessons: [{ title: 'Rare Treasure - Part 2', cat: 'vocab' }] }),
  week({ id: 'g4-2026-W16', label: 'Week 16', start: '2026-05-24', end: '2026-05-30', due: '2026-05-30',
         archived: true, lessons: [{ title: '上學期的舊作業', cat: 'vocab' }] }),
]) } } } };

const ERIC = 'le12777@kcbs.tw';
let doneItems = {};       // 測「完成了就不再列」
const pushed = [];
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('oauth2')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
  if (u.includes('/documents/progress')) return new Response(JSON.stringify({ documents: [{
    name: 'x/progress/' + ERIC,
    fields: { email: S(ERIC), name: S('王思淮 Eric WANG'), items: { mapValue: { fields: doneItems } } },
  }] }), { status: 200 });
  if (u.includes('/documents/roster')) return new Response(JSON.stringify({ documents: [] }), { status: 200 });
  const m = u.match(/\/documents\/(class\/[A-Za-z0-9_]+)/);
  if (m) return new Response(JSON.stringify(m[1] === 'class/data_g4' ? G4 : {}), { status: 200 });
  if (u.includes('multicast')) { pushed.push(JSON.parse(opts.body).messages[0].text); return new Response('{}', { status: 200 }); }
  return new Response('{}', { status: 200 });
};
const rImport = crypto.subtle.importKey.bind(crypto.subtle);
crypto.subtle.importKey = async (f, d, a, e, u) => (a && a.name === 'RSASSA-PKCS1-v1_5')
  ? rImport('raw', new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']) : rImport(f, d, a, e, u);
const rSign = crypto.subtle.sign.bind(crypto.subtle);
crypto.subtle.sign = async (a, k, d) => rSign(a === 'RSASSA-PKCS1-v1_5' ? 'HMAC' : a, k, d);

function makeEnv(seed) {
  const store = new Map(Object.entries(Object.assign({
    links: JSON.stringify({ U1: [{ email: ERIC, name: '王思淮 Eric WANG', grade: 'g4' }] }),
  }, seed || {})));
  return { LINE_TOKEN: 't', FIREBASE_SA: JSON.stringify({ project_id: 'p', client_email: 'x', private_key: 'AAAA' }),
    LINKS: { get: async (k) => (store.has(k) ? store.get(k) : null), put: async (k, v) => void store.set(k, v) }, _store: store };
}

// ═══ 1. 三個區塊 ═══
log.push('\n【L1】訊息分成三區，而且分對了');
let TEXT = '', RES = null;
{
  pushed.length = 0;
  const env = makeEnv();
  const R = await W.runReminders(env, false);
  RES = R.sends[0]; TEXT = pushed[0] || '';
  ok('有發出來', !!TEXT, JSON.stringify(R.errors));
  ok('三個標題都在', has(TEXT, '▍本週作業', '▍前幾週還沒完成', '▍可以先預習'), TEXT);
  ok('順序是 本週 → 前幾週 → 預習',
     TEXT.indexOf('▍本週作業') < TEXT.indexOf('▍前幾週還沒完成') &&
     TEXT.indexOf('▍前幾週還沒完成') < TEXT.indexOf('▍可以先預習'), TEXT);
  ok('本週標題有寫是第幾週和日期', /▍本週作業（Week 2・9\/7–9\/13）/.test(TEXT), TEXT);
  ok('分區數字對（本週 6・前幾週 5・預習 11）',
     RES.buckets.thisWeek === 6 && RES.buckets.overdue === 5 && RES.buckets.preview === 11,
     JSON.stringify(RES.buckets));
  log.push('\n───── 家長會收到 ─────\n' + TEXT + '\n──────────────────────');
}

// ═══ 2. Alan 指出的三個具體問題 ═══
log.push('\n【L2】Alan 指出的問題，逐項檢查');
{
  const sec = (name) => {
    const i = TEXT.indexOf('▍' + name);
    if (i < 0) return '';
    const rest = TEXT.slice(i + 1);
    const j = rest.indexOf('▍');
    return j < 0 ? rest : rest.slice(0, j);
  };
  ok('⭐ Week4/Week5 只出現在「可以先預習」，不會混進本週',
     !has(sec('本週作業'), 'Rare Treasure') && has(sec('可以先預習'), 'Rare Treasure - Part 1', 'Rare Treasure - Part 2'), sec('本週作業'));
  ok('⭐ 同一課的六種題型併成一行，不再六行一樣的標題',
     (TEXT.match(/Rare Treasure - Part 1/g) || []).length === 1, TEXT);
  ok('題型併行時有寫清楚是哪些', has(TEXT, '單字卡・選擇題・拼字・填空・配對（5 項）'), TEXT);
  ok('「· 短文填空」跟本體算同一課（所以 Part 1 是 6 項）', has(TEXT, 'Rare Treasure - Part 1（6 項）'), TEXT);
  ok('⭐ 不再滿篇「新作業」', !TEXT.includes('新作業'), TEXT);
  ok('前幾週那一區有標是第幾週', has(TEXT, '• Week 1：Reaching for the moon - week1'), TEXT);
  ok('預習那一區有寫哪一週、什麼時候', has(TEXT, '• Week 4・9/21–9/27：', '• Week 5・9/28–10/4：'), TEXT);
  ok('結尾告訴家長預習區不急', has(TEXT, '預習區不急'), TEXT);
  ok('⭐ 已封存（上學期）的作業完全不出現', !TEXT.includes('上學期的舊作業'), TEXT);
  ok('標題尾巴的空白有清掉', has(TEXT, '• 判斷 Compound Sentences（選擇題）'), TEXT);
  ok('沒有超過 LINE 單則 5000 字', TEXT.length < 5000, String(TEXT.length));
}

// ═══ 3. 排序穩定（Firestore 的 map 沒有順序）═══
log.push('\n【L3】同樣的資料跑兩次，訊息要一模一樣');
{
  pushed.length = 0;
  await W.runReminders(makeEnv(), false);
  await W.runReminders(makeEnv(), false);
  ok('兩次完全相同（有排序，不會每天長得不一樣）', pushed[0] === pushed[1],
     pushed[0] === pushed[1] ? '' : pushed[0] + '\n=== vs ===\n' + pushed[1]);
}

// ═══ 4. 完成了就不列 ═══
log.push('\n【L4】做完的不會再出現');
{
  doneItems = {};
  ['flashcard', 'quiz', 'spelling', 'fillblank', 'def-match'].forEach((t) => {
    doneItems['g4-2026F-W01_Reaching for the moon - week1__' + t] = { mapValue: { fields: { done: B(true) } } };
  });
  pushed.length = 0;
  const R = await W.runReminders(makeEnv(), false);
  const t = pushed[0] || '';
  ok('把 Week 1 補完之後，「前幾週還沒完成」整區消失', !t.includes('▍前幾週還沒完成'), t);
  ok('本週那一區不受影響', t.includes('▍本週作業'), t);
  doneItems = {};
}

// ═══ 5. 只剩預習就不要打擾 ═══
log.push('\n【L5】只剩「可以先預習」時，不發訊息');
{
  doneItems = {};
  for (const k of ['g4-2026F-W01_Reaching for the moon - week1', 'g4-2026F-W02_Feathers, Not just for flying - week2']) {
    LESSON_TYPES.forEach((t) => { doneItems[k + '__' + t] = { mapValue: { fields: { done: B(true) } } }; });
  }
  doneItems['g4-2026F-W02_判斷 Compound Sentences __quiz'] = { mapValue: { fields: { done: B(true) } } };
  pushed.length = 0;
  const R = await W.runReminders(makeEnv(), false);
  ok('⭐ 該做的都做完了 → 不會為了預習而發通知', pushed.length === 0, pushed[0]);
  doneItems = {};
}

// ═══ 6. 不要每天煩 ═══
log.push('\n【L6】發送頻率：新作業→發，之後只有週一與到期前一天');
{
  pushed.length = 0;
  const env = makeEnv();
  const R1 = await W.runReminders(env, false);
  ok('第一次看到 → 發（原因 new）', pushed.length === 1 && R1.sends[0].reason === 'new', JSON.stringify(R1.sends.map((x) => x.reason)));
  const R2 = await W.runReminders(env, false);   // 同一天再跑（沿用同一份 KV）
  ok('⭐ 同一批作業不會再發第二次', pushed.length === 1, JSON.stringify(pushed.length));
  ok('報告裡也不會重複列', R2.sends.length === 0, JSON.stringify(R2.sends.map((x) => x.reason)));
}

// ═══ 7. 星期一固定回報 ═══
log.push('\n【L7】mondayOf：週次是週一～週日');
{
  ok('9/10（四）→ 9/7（一）', W.mondayOf('2026-09-10') === '2026-09-07');
  ok('9/7（一）→ 自己', W.mondayOf('2026-09-07') === '2026-09-07');
  ok('9/13（日）→ 9/7', W.mondayOf('2026-09-13') === '2026-09-07');
  ok('9/14（一）→ 9/14', W.mondayOf('2026-09-14') === '2026-09-14');
}

// ═══ 8. 題型併行的細節 ═══
log.push('\n【L8】題型併行');
{
  const g = W.groupByLesson([
    { title: 'Unit 1', type: 'quiz' }, { title: 'Unit 1', type: 'flashcard' },
    { title: 'Unit 1 · 短文填空', type: 'cloze' }, { title: 'Unit 2', type: 'spelling' },
  ]);
  ok('「Unit 1」與「Unit 1 · 短文填空」併成同一課', g.length === 2 && g[0].items.length === 3, JSON.stringify(g.map((x) => [x.title, x.items.length])));
  ok('題型照固定順序排（單字卡在選擇題前面）', W.lessonLine(g[0]).includes('單字卡・選擇題・短文填空'), W.lessonLine(g[0]));
  ok('只有一項時就寫在括號裡，不換行', W.lessonLine(g[1]) === '• Unit 2（拼字）', W.lessonLine(g[1]));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
