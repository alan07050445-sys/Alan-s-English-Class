/* t-v693 — 清理「看不到的種子週」（Alan 逐筆確認的名單）
 * 把 data.js 的 scanHiddenSeedWeeks / purgeHiddenSeedWeeks 放進假的 Firestore 真的跑：
 * ① 名單寫死（22 筆 + G3 兩筆＝24 筆，一筆不多）
 * ② 只刪「不在週次順序、而且 0 題」的
 * ③ 有內容的週（含 G3 的 2025-W15／W16／2026-W17／W14）絕不被刪
 * ④ 不在名單上的週，就算空白、不在順序，也不刪 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const i = data.indexOf('const SEED_CLEANUP_LIST');
const j = data.indexOf('Object.assign(window, { SEED_CLEANUP_LIST');
const src = data.slice(i, j);

/* 假的 Firestore：四個文件，記錄 update 呼叫 */
const mkDb = (docs) => {
  const log = { updates: [], reads: 0 };
  const db = {
    collection: () => ({ doc: (name) => ({ __name: name,
      get: async () => { log.reads++; return { exists: !!docs[name], data: () => JSON.parse(JSON.stringify(docs[name])) }; } }) }),
    runTransaction: async (fn) => fn({
      get: async (ref) => ({ exists: !!docs[ref.__name], data: () => JSON.parse(JSON.stringify(docs[ref.__name])) }),
      update: (ref, ...args) => { log.updates.push({ doc: ref.__name, ids: args.filter((_, k) => k % 2 === 0).map(fp => fp.path[1]) });
        args.forEach((v, k) => { if (k % 2 === 0) delete docs[ref.__name].weeks[v.path[1]]; }); },
    }),
  };
  return { db, log };
};
const firebase = { firestore: { FieldPath: class { constructor(...p) { this.path = p; } }, FieldValue: { delete: () => '__del__' } } };
const build = (db) => new Function('_db', 'firebase', src + '\nreturn { SEED_CLEANUP_LIST, scanHiddenSeedWeeks, purgeHiddenSeedWeeks };')(db, firebase);

const blank = (id) => ({ id, label: id, dateRange: '—', items: { vocab: [], grammar: [] } });
const full = (id, n = 8) => ({ id, label: id, dateRange: 'May 24', items: { vocab: Array.from({ length: n }, (_, k) => ({ id: 'v' + k })) } });
const mkDocs = () => ({
  data_g2: { weekOrder: ['g2-2026F-W01', 'g2-2026-W16'], weeks: { 'g2-2026F-W01': full('g2-2026F-W01'), 'g2-2026-W16': full('g2-2026-W16', 28),
    ...Object.fromEntries(['10', '11', '12', '13', '14', '15'].map(n => ['g2-2026-W' + n, blank('g2-2026-W' + n)])) } },
  data_g5: { weekOrder: ['g5-2026F-W01'], weeks: { 'g5-2026F-W01': full('g5-2026F-W01'),
    ...Object.fromEntries(['01', '02', '03', '04', '05', '06', '07', '08'].map(n => ['g5-2026-W' + n, blank('g5-2026-W' + n)])) } },
  data_g6: { weekOrder: ['g6-2026F-W01'], weeks: { 'g6-2026F-W01': full('g6-2026F-W01'),
    ...Object.fromEntries(['01', '02', '03', '04', '05', '06', '07', '08'].map(n => ['g6-2026-W' + n, blank('g6-2026-W' + n)])) } },
  data: { weekOrder: ['2026F-W01'], weeks: { '2026F-W01': full('2026F-W01'),
    '2025-W13': blank('2025-W13'), '2025-W17': blank('2025-W17'),
    '2025-W14': full('2025-W14', 11), '2025-W15': full('2025-W15'), '2025-W16': full('2025-W16'), '2026-W17': full('2026-W17', 4),
    'zzz-blank-not-on-list': blank('zzz-blank-not-on-list') } },
});

console.log('\n【1】名單寫死、一筆不多');
const docs0 = mkDocs(); const A = build(mkDb(docs0).db);
const L = A.SEED_CLEANUP_LIST;
ok('G2 6 筆、G5 8 筆、G6 8 筆、G3 2 筆（共 24）', L.g2.length === 6 && L.g5.length === 8 && L.g6.length === 8 && L.g3.length === 2
   && Object.values(L).flat().length === 24);
ok('G3 只有 2025-W13、2025-W17（W14／W15／W16／2026-W17 不在名單）', L.g3.join() === '2025-W13,2025-W17');
ok('G4、G1 不在名單裡', !('g4' in L) && !('g1' in L));

console.log('\n【2】掃描（只讀）');
{ const { db, log } = mkDb(mkDocs()); const r = await build(db).scanHiddenSeedWeeks();
  ok('找到 22 + 2 = 24 筆、全部可刪', Object.values(r).flat().length === 24 && Object.values(r).flat().every(x => x.ok));
  ok('不在名單上的空白週（zzz）不會出現', !Object.values(r).flat().some(x => x.id.startsWith('zzz')));
  ok('掃描沒有寫任何東西', log.updates.length === 0); }

console.log('\n【3】刪除');
{ const docs = mkDocs(); const { db, log } = mkDb(docs); const B = build(db);
  const r = await B.scanHiddenSeedWeeks();
  const sel = {}; Object.keys(r).forEach(g => { sel[g] = r[g].filter(x => x.ok).map(x => x.id); });
  const out = await B.purgeHiddenSeedWeeks(sel);
  ok('24 筆都刪掉', Object.values(out.deleted).flat().length === 24 && out.skipped.length === 0);
  ok('⭐⭐ 有內容的週一個都沒動（G2 W16、G3 W14／W15／W16／2026-W17、各年級真週次）',
     ['g2-2026F-W01', 'g2-2026-W16'].every(k => docs.data_g2.weeks[k]) && ['2026F-W01', '2025-W14', '2025-W15', '2025-W16', '2026-W17'].every(k => docs.data.weeks[k])
     && docs.data_g5.weeks['g5-2026F-W01'] && docs.data_g6.weeks['g6-2026F-W01']);
  ok('⭐ 不在名單上的空白週（zzz）沒被刪', !!docs.data.weeks['zzz-blank-not-on-list']);
  ok('每個文件只有一次交易 update（不是一筆一筆）', log.updates.length === 4); }

console.log('\n【4】交易裡再驗一次（掃描之後、刪除之前資料變了）');
{ const docs = mkDocs(); const { db } = mkDb(docs); const B = build(db);
  docs.data_g5.weeks['g5-2026-W03'].items.vocab = [{ id: 'new1' }, { id: 'new2' }];        // 這段時間你在 G5 W03 加了 2 題
  docs.data_g6.weekOrder.push('g6-2026-W05');                                              // G6 W05 被排進週次順序
  delete docs.data_g2.weeks['g2-2026-W10'];                                                // G2 W10 已經不見了
  const out = await B.purgeHiddenSeedWeeks({ g2: ['g2-2026-W10', 'g2-2026-W11'], g5: ['g5-2026-W03', 'g5-2026-W04'], g6: ['g6-2026-W05', 'g6-2026-W06'] });
  ok('⭐⭐ 剛加了題目的 G5 W03 不刪（有 2 題）', !!docs.data_g5.weeks['g5-2026-W03'] && out.skipped.some(x => x.id === 'g5-2026-W03' && /2 題/.test(x.why)));
  ok('⭐ 剛被排進週次順序的 G6 W05 不刪', !!docs.data_g6.weeks['g6-2026-W05'] && out.skipped.some(x => x.id === 'g6-2026-W05' && /週次順序/.test(x.why)));
  ok('已經不存在的不報錯、只記下來', out.skipped.some(x => x.id === 'g2-2026-W10'));
  ok('其餘的照刪（G2 W11、G5 W04、G6 W06）', !docs.data_g2.weeks['g2-2026-W11'] && !docs.data_g5.weeks['g5-2026-W04'] && !docs.data_g6.weeks['g6-2026-W06']); }

console.log('\n【5】不在名單上的 id，就算被塞進選取也不刪');
{ const docs = mkDocs(); const { db, log } = mkDb(docs); const B = build(db);
  const out = await B.purgeHiddenSeedWeeks({ g3: ['zzz-blank-not-on-list', '2025-W15', '2025-W14'], g4: ['g4-2026F-W03'] });
  ok('⭐⭐ zzz／W15／W14（不在名單）→ 一個都沒刪、也沒有任何 update', !!docs.data.weeks['zzz-blank-not-on-list'] && !!docs.data.weeks['2025-W15'] && !!docs.data.weeks['2025-W14'] && log.updates.length === 0); }

console.log('\n【6】後台');
ok('只有擁有者看得到「清理種子週」', /isOwnerUser[\s\S]{0,400}id: 'seedclean'/.test(dash));
ok('刪除前先備份（localStorage＋下載），備份寫不進去就不刪', /localStorage\.setItem\('alans-english-seedclean-backup-'/.test(dash) && /await window\.purgeHiddenSeedWeeks/.test(dash)
   && dash.indexOf("alans-english-seedclean-backup-") < dash.indexOf('await window.purgeHiddenSeedWeeks'));
ok('刪除前一定 confirm 列出清單', /window\.confirm\(`要刪掉這 \$\{chosen\.length\} 個/.test(dash));
ok('有內容的週 checkbox 是 disabled（不能勾）', /disabled=\{!x\.ok \|\| busy\}/.test(dash));

console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
