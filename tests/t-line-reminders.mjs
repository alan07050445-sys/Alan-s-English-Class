/* t-line-reminders — 作業提醒必須「照年級發」
 * Alan 回報：某個 LINE 只綁 G6 的孩子，卻連 G1~G5 的作業都收到。
 * 這支測試把 Firestore 與 LINE 全部假裝掉，直接驗證每位家長收到的內容。 */
import fs from 'fs';
const src = fs.readFileSync(new URL('../line-notify-worker.js', import.meta.url), 'utf8');
const W = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + e : '')));

// ── 假的 Firestore：每個年級一份課程文件，裡面各有一份有期限的作業 ──
const TODAY = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const DUE = new Date(Date.now() + 8 * 3600 * 1000 + 5 * 86400000).toISOString().slice(0, 10);

const fsStr = (v) => ({ stringValue: v });
function weekDoc(grade) {
  const wid = grade + '-2026F-W02';
  const itemId = grade + '-hw';
  return {
    fields: { weeks: { mapValue: { fields: { [wid]: { mapValue: { fields: {
      items: { mapValue: { fields: { vocab: { arrayValue: { values: [
        { mapValue: { fields: { id: fsStr(itemId), title: fsStr(grade.toUpperCase() + ' 的單字作業') } } },
      ] } } } } },
      homework: { mapValue: { fields: { [itemId]: { mapValue: { fields: { dueDate: fsStr(DUE) } } } } } },
    } } } } } } },
  };
}
const DOC_BY_PATH = {
  'class/data_g1': weekDoc('g1'), 'class/data_g2': weekDoc('g2'), 'class/data': weekDoc('g3'),
  'class/data_g4': weekDoc('g4'), 'class/data_g5': weekDoc('g5'), 'class/data_g6': weekDoc('g6'),
  'class/data_summer_lib': { fields: {} }, 'class/summer_meta': { fields: {} },
};
// 學號 → 年級：le15=G1 … le10=G6
const STUDENTS = [
  { email: 'le15001@kcbs.tw', name: 'Amy',    grade: 'g1' },
  { email: 'le14001@kcbs.tw', name: 'Ben',    grade: 'g2' },
  { email: 'le13001@kcbs.tw', name: 'Cindy',  grade: 'g3' },
  { email: 'le12001@kcbs.tw', name: 'Danny',  grade: 'g4' },
  { email: 'le11001@kcbs.tw', name: 'Ella',   grade: 'g5' },
  { email: 'le10001@kcbs.tw', name: 'Frank',  grade: 'g6' },
];

const pushed = [];   // { to:[uid], text }
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('oauth2.googleapis.com')) return new Response(JSON.stringify({ access_token: 'tk' }), { status: 200 });
  if (u.includes('/documents/progress')) {
    return new Response(JSON.stringify({ documents: STUDENTS.map((st) => ({
      name: 'projects/p/databases/(default)/documents/progress/' + st.email,
      fields: { email: fsStr(st.email), name: fsStr(st.name), items: { mapValue: { fields: {} } } },
    })) }), { status: 200 });
  }
  if (u.includes('/documents/roster')) {
    return new Response(JSON.stringify({ documents: STUDENTS.map((st) => ({
      name: 'projects/p/databases/(default)/documents/roster/' + st.email,
      fields: { name: fsStr(st.name), grade: fsStr(st.grade) },
    })) }), { status: 200 });
  }
  const m = u.match(/\/documents\/(class\/[A-Za-z0-9_]+)/);
  if (m) {
    const d = DOC_BY_PATH[m[1]];
    return d ? new Response(JSON.stringify(d), { status: 200 }) : new Response('{}', { status: 404 });
  }
  if (u.includes('/message/multicast')) {
    const b = JSON.parse(opts.body);
    pushed.push({ to: b.to, text: b.messages[0].text });
    return new Response('{}', { status: 200 });
  }
  return new Response('{}', { status: 200 });
};

// ── 綁定狀況：一個 LINE 只綁 G6 的 Frank（就是 Alan 回報的那個帳號）──
function makeEnv(links) {
  const store = new Map([['links', JSON.stringify(links)]]);
  return {
    LINE_TOKEN: 'tok',
    FIREBASE_SA: JSON.stringify({ project_id: 'p', client_email: 'x@y', private_key: 'PEM' }),
    LINKS: { get: async (k) => (store.has(k) ? store.get(k) : null), put: async (k, v) => void store.set(k, v) },
    _store: store,
  };
}
// 簽 JWT 要真的私鑰，測試裡不需要——直接讓 getAccessToken 走 fetch 那條（上面已假裝）
// importPrivateKey 會失敗 → runReminders 會回 auth_error，所以改用 crypto 的假實作：
const realImport = crypto.subtle.importKey.bind(crypto.subtle);
crypto.subtle.importKey = async (fmt, data, algo, ext, usages) => {
  if (algo && algo.name === 'RSASSA-PKCS1-v1_5') {
    return realImport('raw', new Uint8Array(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  }
  return realImport(fmt, data, algo, ext, usages);
};
const realSign = crypto.subtle.sign.bind(crypto.subtle);
crypto.subtle.sign = async (algo, key, data) =>
  realSign(typeof algo === 'string' && algo === 'RSASSA-PKCS1-v1_5' ? 'HMAC' : algo, key, data);

const G6_UID = 'U_only_g6';

log.push('\n【R1】只綁 G6 的家長，只能收到 G6 的作業（Alan 回報的 bug）');
{
  pushed.length = 0;
  const env = makeEnv({ [G6_UID]: [{ email: 'le10001@kcbs.tw', name: 'Frank', grade: 'g6' }] });
  const R = await W.runReminders(env, false);
  ok('跑得起來（沒有 auth / kv 錯誤）', R.ok && !R.errors.length, JSON.stringify(R.errors));
  ok('六個年級的作業都讀到了（各 1 份）',
     R.homeworkCount === 6 && Object.values(R.homeworkByGrade).every((n) => n === 1), JSON.stringify(R.homeworkByGrade));
  ok('只送出 1 則（只有 Frank 的家長有綁）', pushed.length === 1, JSON.stringify(pushed.map((p) => p.text)));
  const t = pushed[0] ? pushed[0].text : '';
  ok('⭐ 內容只有 G6 的作業', t.includes('G6 的單字作業'), t);
  ok('⭐ 完全沒有 G1~G5 的作業',
     ['G1', 'G2', 'G3', 'G4', 'G5'].every((g) => !t.includes(g + ' 的單字作業')), t);
  ok('只發給有綁的那個 LINE', pushed[0] && pushed[0].to.length === 1 && pushed[0].to[0] === G6_UID, JSON.stringify(pushed[0] && pushed[0].to));
  log.push('\n───── 這位家長實際會收到 ─────\n' + t + '\n──────────────────────────────');
}

log.push('\n【R2】每個年級各綁一位 → 每人只拿到自己那一份');
{
  pushed.length = 0;
  const links = {};
  STUDENTS.forEach((st) => { links['U_' + st.grade] = [{ email: st.email, name: st.name, grade: st.grade }]; });
  const env = makeEnv(links);
  await W.runReminders(env, false);
  ok('六位家長各收到一則', pushed.length === 6, String(pushed.length));
  let clean = true, why = '';
  for (const st of STUDENTS) {
    const p = pushed.find((x) => x.to[0] === 'U_' + st.grade);
    if (!p) { clean = false; why = st.grade + ' 沒收到'; break; }
    const mine = st.grade.toUpperCase() + ' 的單字作業';
    if (!p.text.includes(mine)) { clean = false; why = st.grade + ' 沒拿到自己的作業'; break; }
    const others = STUDENTS.filter((o) => o.grade !== st.grade).map((o) => o.grade.toUpperCase() + ' 的單字作業');
    const leak = others.find((o) => p.text.includes(o));
    if (leak) { clean = false; why = st.grade + ' 收到了別班的：' + leak; break; }
  }
  ok('⭐ 每個年級只收到自己的作業，沒有一則串到別班', clean, why);
}

log.push('\n【R3】年級是照學號算的（跟學生在網站上看到的教室同一套）');
{
  ok('le15… → G1', W.gradeFromEmail('le15001@kcbs.tw') === 'g1');
  ok('le10… → G6', W.gradeFromEmail('le10001@kcbs.tw') === 'g6');
  ok('不是學校帳號 → null（不亂分類）', W.gradeFromEmail('someone@gmail.com') === null);
  ok('算出界的學號 → null', W.gradeFromEmail('le99001@kcbs.tw') === null);
  ok('六份課程文件的路徑都對（G3 是最早那份 class/data）',
     W.GRADE_DOCS.g3 === 'class/data' && W.GRADE_DOCS.g1 === 'class/data_g1' && W.GRADE_DOCS.g6 === 'class/data_g6',
     JSON.stringify(W.GRADE_DOCS));
}

log.push('\n【R4】認不出年級的帳號 → 不亂發學期作業');
{
  pushed.length = 0;
  STUDENTS.push({ email: 'visitor@gmail.com', name: 'Guest', grade: '' });
  const env = makeEnv({ U_guest: [{ email: 'visitor@gmail.com', name: 'Guest', grade: '' }] });
  const R = await W.runReminders(env, false);
  ok('報告裡有標出來是誰', (R.skippedNoGrade || []).includes('Guest'), JSON.stringify(R.skippedNoGrade));
  ok('⭐ 沒有硬塞任何一班的作業給他', pushed.length === 0, JSON.stringify(pushed.map((p) => p.text)));
  STUDENTS.pop();
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
