/* t-v692 — iPad 上面還是有種子
 * 根因：離線／連線卡住時 Firestore 先回「文件不存在（來自本機快取）」，訂閱函式把它當成「雲端回來了」→
 *   畫面換成空白種子週、「還沒連上雲端」警告也被收掉。
 * 修法：來自快取的「不存在」不算數；向伺服器問一次，伺服器真的說沒有才用種子；問不到就什麼都不做。
 * 這裡把 data-g1/g2/g4/g5/g6.js 的訂閱函式放進假的 Firestore 真的跑一遍。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const tick = () => new Promise(r => setTimeout(r, 10));

for (const g of ['G1', 'G2', 'G4', 'G5', 'G6']) {
  const src = fs.readFileSync(new URL(`data-${g.toLowerCase()}.js`, ROOT), 'utf8');
  const i = src.indexOf(`function subscribeToClassData${g}(`);
  const j = src.indexOf('\n}\n', i) + 2;
  const fnSrc = src.slice(i, j);
  const SEED = { [`${g.toLowerCase()}-2026-W01`]: { items: {} } };
  const mk = (serverReply) => {
    let listener = null, unsubbed = false;
    const doc = {
      onSnapshot: (fn) => { listener = fn; return () => { unsubbed = true; }; },
      get: (opt) => serverReply === 'offline' ? Promise.reject(new Error('unavailable'))
        : Promise.resolve({ exists: serverReply === 'exists' }),
      set: () => Promise.resolve(),
    };
    const calls = [];
    const f = new Function(`_classDoc${g}`, `${g}_SEED_WEEKS`, `${g}_DEFAULT_WEEK_ORDER`, `${g}_DATA_VERSION`, 'window', 'console',
      fnSrc + `\nreturn subscribeToClassData${g};`)(doc, SEED, ['s1'], 1, {}, { warn() {} });
    const unsub = f((w, o, isSeed) => calls.push({ w, o, isSeed }), () => {});
    return { calls, fire: (snap) => listener(snap), unsub, wasUnsubbed: () => unsubbed };
  };
  console.log(`\n【${g}】`);
  { const t = mk('offline'); t.fire({ exists: false, metadata: { fromCache: true } }); await tick();
    ok('⭐⭐ 離線：來自快取的「不存在」→ 不用種子、不當成雲端回來（callback 一次都沒被叫）', t.calls.length === 0); }
  { const t = mk('missing'); t.fire({ exists: false, metadata: { fromCache: true } }); await tick();
    ok('伺服器真的說沒有（新年級）→ 才用種子，並標 isSeed', t.calls.length === 1 && t.calls[0].isSeed === true); }
  { const t = mk('exists'); t.fire({ exists: false, metadata: { fromCache: true } }); await tick();
    ok('伺服器其實有文件（快取只是還沒同步）→ 不用種子，等真資料的 snapshot', t.calls.length === 0); }
  { const t = mk('missing'); t.fire({ exists: false, metadata: { fromCache: false } }); await tick();
    ok('不是快取、伺服器直接回「不存在」→ 用種子（isSeed）', t.calls.length === 1 && t.calls[0].isSeed === true); }
  { const t = mk('missing'); t.fire({ exists: false, metadata: { fromCache: true } }); t.unsub(); await tick();
    ok('等伺服器的途中已經取消訂閱（換年級）→ 不再回呼', t.calls.length === 0 && t.wasUnsubbed()); }
  { const t = mk('offline'); t.fire({ exists: true, metadata: { fromCache: false }, data: () => ({ _version: 1, weeks: { x: { items: { vocab: [{ id: 1 }] } } }, weekOrder: ['x'] }) }); await tick();
    ok('真的有雲端資料 → 照常回呼（不受影響）', t.calls.length === 1 && !t.calls[0].isSeed && t.calls[0].o[0] === 'x'); }
}

console.log('\n【G3（data.js）】');
{
  const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
  const i = data.indexOf('function subscribeToClassData(callback');
  const j = data.indexOf('\n}\n', i) + 2;
  const fnSrc = data.slice(i, j);
  const run = async (serverReply, snap) => {
    let listener = null;
    const doc = { onSnapshot: (fn) => { listener = fn; return () => {}; },
      get: () => serverReply === 'offline' ? Promise.reject(new Error('x')) : Promise.resolve({ exists: serverReply === 'exists' }) };
    const calls = [];
    const f = new Function('_classDoc', 'SEED_WEEKS', 'DEFAULT_WEEK_ORDER', 'noteCloudWeeks', 'cleanWeeks', 'console',
      fnSrc + '\nreturn subscribeToClassData;')(doc, { s: {} }, ['s'], () => {}, (w) => w, { warn() {} });
    f((w, o, isSeed) => calls.push({ isSeed }), () => {});
    listener(snap); await tick(); return calls;
  };
  ok('⭐⭐ G3 離線快取的「不存在」→ 不用種子', (await run('offline', { exists: false, metadata: { fromCache: true } })).length === 0);
  ok('G3 伺服器真的沒有 → 用種子且標 isSeed（以前沒標，會被寫進本機快取）', (await run('missing', { exists: false, metadata: { fromCache: true } }))[0].isSeed === true);
}

console.log('\n【畫面】');
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
ok('老師：雲端沒確認前、全部是空白種子週 → 當作還沒有週（不露出 8 個空白週）',
   /isTeacher && !cloudSeen && v\.length/.test(app) && /\[weekOrder, weeks, isTeacher, cloudSeen\]/.test(app));
ok('雲端確認過（真的新年級）就不擋', /!cloudSeen/.test(app));

console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
