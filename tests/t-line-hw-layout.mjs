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
  if (u.includes('multicast')) { pushed.push(JSON.parse(opts.body).messages[0]); return new Response('{}', { status: 200 }); }
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

// ── Flex Message 結構檢查（LINE 會直接 400，所以自己先驗）──────
const SIZES = ['xxs','xs','sm','md','lg','xl','xxl','3xl','4xl','5xl'];
const SPACING = ['none','xs','sm','md','lg','xl','xxl'];
function flexErrors(node, path, out) {
  out = out || []; path = path || '$';
  if (!node || typeof node !== 'object') { out.push(path + ' 不是物件'); return out; }
  const t = node.type;
  if (t === 'text') {
    if (typeof node.text !== 'string' || !node.text.trim()) out.push(path + '.text 是空的（LINE 會 400）');
    if (node.size && SIZES.indexOf(node.size) < 0) out.push(path + '.size=' + node.size + ' 不合法');
    if (node.weight && ['regular','bold'].indexOf(node.weight) < 0) out.push(path + '.weight 不合法');
    if (node.color && !/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(node.color)) out.push(path + '.color=' + node.color + ' 不合法');
    if (node.align && ['start','end','center'].indexOf(node.align) < 0) out.push(path + '.align 不合法');
  } else if (t === 'box') {
    if (['vertical','horizontal','baseline'].indexOf(node.layout) < 0) out.push(path + '.layout 不合法');
    if (!Array.isArray(node.contents) || !node.contents.length) out.push(path + '.contents 是空的');
    (node.contents || []).forEach((c, i) => flexErrors(c, path + '.contents[' + i + ']', out));
  } else if (t === 'button') {
    if (!node.action || node.action.type !== 'uri') out.push(path + '.action 不是 uri');
    else if (!/^https:\/\//.test(node.action.uri)) out.push(path + '.action.uri 不是 https');
    else if (!node.action.label || node.action.label.length > 20) out.push(path + '.action.label 長度不對');
  } else if (t === 'separator') {
    if (node.color && !/^#[0-9A-Fa-f]{6}$/.test(node.color)) out.push(path + '.color 不合法');
  } else if (t === 'bubble') {
    if (node.size && ['nano','micro','deca','hecto','kilo','mega','giga'].indexOf(node.size) < 0) out.push(path + '.size 不合法');
    ['header','hero','body','footer'].forEach((k) => { if (node[k]) flexErrors(node[k], path + '.' + k, out); });
  } else out.push(path + '.type=' + t + ' 不認得');
  if (node.margin && SPACING.indexOf(node.margin) < 0) out.push(path + '.margin 不合法');
  return out;
}

// ═══ 1. 三個區塊 ═══
log.push('\n【L1】訊息分成三區，而且分對了');
let MSG = null, RES = null, TEXT = '';
{
  pushed.length = 0;
  const env = makeEnv();
  const R = await W.runReminders(env, false);
  RES = R.sends[0]; MSG = pushed[0] || null; TEXT = (RES || {}).text || '';
  ok('有發出來', !!MSG, JSON.stringify(R.errors));
  ok('送的是 Flex Message（純文字沒辦法粗體/上色）', MSG && MSG.type === 'flex', MSG && MSG.type);
  ok('Flex 結構合法', MSG && flexErrors(MSG.contents).length === 0, MSG && flexErrors(MSG.contents).join('\n'));
  ok('Flex JSON 沒有太大（< 10KB）', MSG && JSON.stringify(MSG.contents).length < 10000, MSG && String(JSON.stringify(MSG.contents).length));
  ok('altText 在 LINE 的 400 字上限內', MSG && MSG.altText.length <= 400, MSG && String(MSG.altText.length));
  ok('altText 一眼看得出重點', /本週 6 項/.test(MSG.altText) && /前幾週還沒完成 5 項/.test(MSG.altText), MSG.altText);
  const secs = RES.sections;
  ok('三區都在', secs.week.rows.length && secs.overdue.rows.length && secs.preview.rows.length, JSON.stringify(secs));
  ok('分區數字對（本週 6・前幾週 5・預習 11）',
     RES.buckets.thisWeek === 6 && RES.buckets.overdue === 5 && RES.buckets.preview === 11,
     JSON.stringify(RES.buckets));
  log.push('\n───── 純文字版（Flex 送不出去時的退路）─────\n' + TEXT + '\n──────────────────────');
  log.push('\n───── 三區資料（老師端就是照這個畫）─────\n' + JSON.stringify(secs, null, 1) + '\n──────────────────────');
}

// ═══ 2. Alan 指出的問題 ═══
log.push('\n【L2】Alan 指出的問題，逐項檢查');
{
  const secs = RES.sections;
  const labels = (k) => secs[k].rows.map((r) => r.label);
  ok('⭐ 本週只寫「哪一類・幾項」，不再列課名',
     labels('week').join() === '外師單字,文法', JSON.stringify(secs.week.rows));
  ok('⭐ 五種題型的單字作業合成一行「外師單字 5 項」',
     secs.week.rows[0].label === '外師單字' && secs.week.rows[0].n === 5, JSON.stringify(secs.week.rows[0]));
  ok('⭐ 訊息裡完全找不到課名（Feathers…／Rare Treasure）',
     !JSON.stringify(MSG).includes('Feathers') && !JSON.stringify(MSG).includes('Rare Treasure'), TEXT);
  ok('⭐ 每一行都很短（手機不會折行）：純文字版最長 ≤ 22 字',
     TEXT.split('\n').filter((l) => l.startsWith('　')).every((l) => l.length <= 22),
     TEXT.split('\n').filter((l) => l.startsWith('　')).map((l) => l.length + ':' + l).join(' | '));
  ok('前幾週那一區標了是第幾週＋哪一類', labels('overdue').join() === 'Week 1・外師單字', JSON.stringify(labels('overdue')));
  ok('預習那一區標了週次與日期', labels('preview').join() === 'Week 4（9/21–9/27）,Week 5（9/28–10/4）', JSON.stringify(labels('preview')));
  ok('本週標題有寫是第幾週和日期', secs.week.note === 'Week 2・9/7–9/13', secs.week.note);
  ok('⭐ Week4/Week5 只出現在預習區', !JSON.stringify(secs.week).includes('Week 4') && labels('preview').length === 2, JSON.stringify(secs));
  ok('⭐ 不再滿篇「新作業」', !TEXT.includes('新作業'), TEXT);
  ok('⭐ 已封存（上學期）的作業完全不出現', !JSON.stringify(MSG).includes('上學期的舊作業'), TEXT);
}

// ═══ 2b. 顏色與粗體（Alan：要更醒目）═══
log.push('\n【L2b】粗體與顏色（純文字的 LINE 訊息做不到，所以才改用 Flex）');
{
  const flat = [];
  (function walk(n) { if (!n || typeof n !== 'object') return; flat.push(n); (n.contents || []).forEach(walk);
    ['header','body','footer'].forEach((k) => n[k] && walk(n[k])); })(MSG.contents);
  const byText = (t) => flat.find((n) => n.type === 'text' && n.text === t);
  ok('學生名字是粗體', (byText('王思淮 Eric WANG') || {}).weight === 'bold');
  ok('「本週作業」是粗體＋綠色', (byText('▍本週作業') || {}).weight === 'bold' && (byText('▍本週作業') || {}).color === '#1B7A3E', JSON.stringify(byText('▍本週作業')));
  ok('「前幾週還沒完成」是粗體＋紅色（最醒目）', (byText('▍前幾週還沒完成') || {}).color === '#C62828', JSON.stringify(byText('▍前幾週還沒完成')));
  ok('「可以先預習」是灰色（不搶注意力）', (byText('▍可以先預習') || {}).color === '#9AA0A6', JSON.stringify(byText('▍可以先預習')));
  ok('件數是粗體、靠右對齊', flat.filter((n) => n.type === 'text' && / 項$/.test(n.text || '')).every((n) => n.weight === 'bold' && n.align === 'end'));
  ok('三區的顏色各不相同', new Set(['▍本週作業','▍前幾週還沒完成','▍可以先預習'].map((t) => (byText(t) || {}).color)).size === 3);
  ok('有一顆「打開練習」按鈕連到網站', flat.some((n) => n.type === 'button' && /github\.io/.test(n.action.uri)));
}

// ═══ 3. 排序穩定（Firestore 的 map 沒有順序）═══
log.push('\n【L3】同樣的資料跑兩次，訊息要一模一樣');
{
  pushed.length = 0;
  await W.runReminders(makeEnv(), false);
  await W.runReminders(makeEnv(), false);
  const a = JSON.stringify(pushed[0]), b = JSON.stringify(pushed[1]);
  ok('兩次完全相同（有排序，不會每天長得不一樣）', a === b, a === b ? '' : a + '\n=== vs ===\n' + b);
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
  const secs = (R.sends[0] || {}).sections || {};
  ok('把 Week 1 補完之後，「前幾週還沒完成」整區消失', (secs.overdue || {}).rows.length === 0, JSON.stringify(secs.overdue));
  ok('本週那一區不受影響', (secs.week || {}).rows.length > 0, JSON.stringify(secs.week));
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
  ok('⭐ 該做的都做完了 → 不會為了預習而發通知', pushed.length === 0, JSON.stringify(pushed[0]));
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
log.push('\n【L8】四大類的中文名要跟各年級的課表一致');
{
  ok('G4 的 word 是「字彙學習」', W.catZh('g4', 'word') === '字彙學習');
  ok('G4 的 reading 是「閱讀寫作」', W.catZh('g4', 'reading') === '閱讀寫作');
  ok('G1 的 vocab 是「中師單字」（跟 G4 不一樣）', W.catZh('g1', 'vocab') === '中師單字' && W.catZh('g4', 'vocab') === '外師單字');
  ok('G3 的 word 是「字根字首」', W.catZh('g3', 'word') === '字根字首');
  ok('六個年級都有四大類', ['g1','g2','g3','g4','g5','g6'].every((g) => Object.keys(W.CAT_ZH[g]).length === 4));
  ok('沒見過的分類 → 叫「其他練習」，不會變成 undefined', W.catZh('g4', 'zzz') === '其他練習');
  const rows = W.rowsByCat([
    { cat: 'reading' }, { cat: 'vocab' }, { cat: 'vocab' }, { cat: 'grammar' }, { cat: 'word' },
  ], 'g4');
  ok('四大類照固定順序排（單字→字彙→文法→閱讀）',
     rows.map((r) => r.label).join() === '外師單字,字彙學習,文法,閱讀寫作', JSON.stringify(rows));
  ok('件數算對', rows[0].n === 2 && rows[1].n === 1, JSON.stringify(rows));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
