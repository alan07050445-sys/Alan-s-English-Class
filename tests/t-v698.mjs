/* t-v698 — 修正單字卡資料錯誤（Alan 確認過 A/B/C/D/E/F）
 * 把 data.js 的 cardFixCompute／scanCardFixes／applyCardFixes 放進假 Firestore 真的跑：
 * ① 每一組都改成 Alan 確認的文字 ② 舊文字對不上（Alan 之後自己改過）就不動 ③ 只動 term/zh/example 三個欄位
 * ④ 改完再掃描＝0 處（可重複執行）⑤ 一個文件一次交易、只寫有改的單元陣列 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const i = data.indexOf('const CARD_FIX_RULES');
const j = data.indexOf('Object.assign(window, { CARD_FIX_RULES');
const src = data.slice(i, j);
const mkDb = (docs) => {
  const log = { updates: [] };
  const db = {
    collection: () => ({ doc: (name) => ({ __n: name,
      get: async () => ({ exists: !!docs[name], data: () => JSON.parse(JSON.stringify(docs[name])) }) }) }),
    runTransaction: async (fn) => fn({
      get: async (ref) => ({ exists: !!docs[ref.__n], data: () => JSON.parse(JSON.stringify(docs[ref.__n])) }),
      update: (ref, ...args) => { for (let k = 0; k < args.length; k += 2) { const p = args[k].path; log.updates.push({ doc: ref.__n, path: p.join('.') });
        let o = docs[ref.__n]; for (let q = 0; q < p.length - 1; q++) o = o[p[q]]; o[p[p.length - 1]] = args[k + 1]; } },
    }),
  };
  return { db, log };
};
const firebase = { firestore: { FieldPath: class { constructor(...p) { this.path = p; } } } };
const build = (db) => new Function('_db', 'firebase', src + '\nreturn { CARD_FIX_RULES, CARD_FIX_DOCS, cardFixCompute, scanCardFixes, applyCardFixes };')(db, firebase);

let _cid = 0;
const card = (term, zh, example) => ({ id: 'c' + (++_cid), term, zh, example, imageUrl: 'u' });
const unit = (title, cards) => ({ id: 'u_' + title, type: 'flashcard', title, cards, group: 'g' });
const mkDocs = () => ({
  data_g4: { weekOrder: ['w8'], weeks: { w8: { items: { vocab: [ unit('期中考單字總複習', [
    card('desolate', 'adj. 荒涼的', 'The desolate__ desert had no trees.'),
    card('sagebrush', 'n. 山艾', 'Cowboys rode through the sagebrush__ plants that covered the dry land.'),
    card('clotted', 'adj. 凝固的', 'When blood clotteded at the wound, it stopped flowing.'),
    card('bleachers ', 'n. 看台', "The team's bleachers  were packed with fans."),
    card('adaptation', 'n. 適應', "The echidna's long adaptation is an ___ that helps it dig for food in the ground."),
    card('adaptation', 'n. 適應特徵；適應性改變', ''),
    card('plesiosaur', 'n. 蛇頸龍；', 'Scientists found bones of a plesiosaur in the rock.'),
    card('brittle', 'adj. 脆脆的 容易碎的；', 'The old feather was dry and brittle.'),
    card('rendezvous', 'n. 會合；（朋友會合） (飛船會合)', 'The spacecraft made a rendezvous.'),
    card('managed ', 'v. 管理球隊 管理員工', 'The coach managed the team.'),
    card('internment', 'n. 因為戰爭 所以困住犯人的營區', 'Many families were placed in internment camps.'),
    card('safety', '安全', 'Wearing a helmet gives us safety when we ride our bikes'),
    card('difficulty', '困難', 'Math problems are easy for Tom, but they are a difficulty for me'),
    card('Always', 'adv. 總是', '100%'),                                 // 頻率表：例句欄是百分比，不是句子，不能被補句號
    card('brooded', 'v. 苦思 擔憂', 'She brooded all day.'),            // 中文詞之間單一空白是慣用寫法，不動
  ]), unit('同一張卡在別的單元', [card('desolate', 'adj. 荒涼的', 'The desolate__ desert had no trees.')]) ] } } } },
  data: { weekOrder: ['w3'], weeks: { w3: { items: { vocab: [ unit('Grace & Grandma', [
    card('immigrant\t', 'n. 移民', 'My grandmother is an immigrant.'), card('guess ', ' v. 猜', 'I guess so.'),
    card('strand', 'v. 受困；', 'The storm will strand the travelers.'),
    card('nature', 'n. 大自然', 'We can see many beautiful things in nature, like trees, flowers, and animals outside'),
    card('poke  &  prob', 'v. 戳', 'x'),
  ]) ] } } } },
  data_g6: { weekOrder: ['w9'], weeks: { w9: { items: { vocab: [ unit('E1 Latin Root', [
    card('circumspect', 'adj. 謹慎的', 'The team captain was circumspect__ before the big game.'),
    card('disrespect', 'n. 不尊重', 'you show disrespect__ by not listening.'),
    card('longevity', 'n. 長壽', 'good health and longevity  means she can enjoy more years'),
  ]) ] } } } },
});
const fieldOf = (docs, doc, wid, title, term, field, nth = 0) => {
  const hits = []; Object.values(docs[doc].weeks[wid].items).forEach(arr => arr.forEach(it => { if (!title || it.title === title) (it.cards || []).forEach(c => { if (c.term.trim() === term) hits.push(c); }); }));
  return hits[nth][field];
};

console.log('\n【1】掃描（只讀）');
const docs0 = mkDocs(); const A = build(mkDb(docs0).db);
const all = A.cardFixCompute(docs0.data_g4.weeks, ['A', 'B', 'C', 'D', 'E', 'F']);
ok('G4 假資料：A 3 處（desolate×2 含別的單元、sagebrush、clotted＝4？）— 逐組數', (() => {
  const by = {}; all.changes.forEach(c => { by[c.grp] = (by[c.grp] || 0) + 1; }); return by.A === 4 && by.B === 1 && by.D === 2 && by.E === 3 && by.F === 2 && by.C >= 2; })());
ok('掃描不寫任何東西（compute 不改傳進去的資料）', JSON.stringify(docs0.data_g4.weeks).includes('desolate__'));

console.log('\n【2】套用：每一組都改成 Alan 確認的文字');
const docs = mkDocs(); const { db, log } = mkDb(docs); const B = build(db);
const out = await B.applyCardFixes(['A', 'B', 'C', 'D', 'E', 'F']);
const g4 = (title, term, field, nth) => fieldOf(docs, 'data_g4', 'w8', title, term, field, nth);
ok('A：desolate／sagebrush／clotted 例句修好（兩個單元的 desolate 都修）', g4('期中考單字總複習', 'desolate', 'example') === 'The desolate desert had no trees.' && g4('同一張卡在別的單元', 'desolate', 'example') === 'The desolate desert had no trees.'
   && /sagebrush plants/.test(g4(null, 'sagebrush', 'example')) && /blood clotted at/.test(g4(null, 'clotted', 'example')));
ok('A（G6）：circumspect／disrespect 底線拿掉', fieldOf(docs, 'data_g6', 'w9', null, 'circumspect', 'example') === 'The team captain was circumspect before the big game.' && /show disrespect by/.test(fieldOf(docs, 'data_g6', 'w9', null, 'disrespect', 'example')));
ok('B：adaptation 用新寫的句子', g4(null, 'adaptation', 'example', 0) === "The echidna's long claws are an adaptation that helps it dig for food in the ground.");
ok('B：另一張 adaptation（zh 不同、例句是空的）沒被動', g4(null, 'adaptation', 'zh', 1) === 'n. 適應特徵；適應性改變' && g4(null, 'adaptation', 'example', 1) === '');
ok('D：strand／plesiosaur／brittle', fieldOf(docs, 'data', 'w3', null, 'strand', 'zh') === 'v. 受困' && g4(null, 'plesiosaur', 'zh') === 'n. 蛇頸龍' && g4(null, 'brittle', 'zh') === 'adj. 脆脆的；容易碎的');
ok('E：rendezvous／managed／internment', g4(null, 'rendezvous', 'zh') === 'n. 會合；（朋友會合）（飛船會合）' && g4(null, 'managed', 'zh') === 'v. 管理球隊；管理員工' && g4(null, 'internment', 'zh') === 'n. 因戰爭而拘禁人的營區');
ok('F：nature／safety／difficulty 補句號', /outside\.$/.test(fieldOf(docs, 'data', 'w3', null, 'nature', 'example')) && /bikes\.$/.test(g4(null, 'safety', 'example')) && /for me\.$/.test(g4(null, 'difficulty', 'example')));
ok('C：頭尾空白／tab 去掉、連續空白縮成一個', docs.data.weeks.w3.items.vocab[0].cards[0].term === 'immigrant' && docs.data.weeks.w3.items.vocab[0].cards[1].term === 'guess' && docs.data.weeks.w3.items.vocab[0].cards[1].zh === 'v. 猜'
   && docs.data.weeks.w3.items.vocab[0].cards[4].term === 'poke & prob' && g4(null, 'bleachers', 'term') === 'bleachers' && /bleachers were packed/.test(g4(null, 'bleachers', 'example')) && /longevity means/.test(fieldOf(docs, 'data_g6', 'w9', null, 'longevity', 'example')));
ok('C 之後規則仍能對上（managed 的 term 有尾空白，zh 還是被改對）', g4(null, 'managed', 'zh') === 'v. 管理球隊；管理員工');

console.log('\n【3】不該動的');
ok('⭐ 頻率表（例句是 100%）不補句號', g4(null, 'Always', 'example') === '100%');
ok('⭐ 中文詞之間單一空白（慣用寫法）不動', g4(null, 'brooded', 'zh') === 'v. 苦思 擔憂');
ok('只寫有改的單元陣列（每個文件一次交易、路徑是 weeks.<週>.items.<類別>）', log.updates.every(u => /^weeks\.\w+\.items\.vocab$/.test(u.path)) && out.g4 > 0 && out.g3 > 0 && out.g6 > 0 && out.g1 === 0);
ok('其他欄位（id、imageUrl、type、group）一個字沒動', docs.data_g4.weeks.w8.items.vocab[0].cards[0].imageUrl === 'u' && docs.data_g4.weeks.w8.items.vocab[0].type === 'flashcard' && docs.data_g4.weeks.w8.items.vocab[0].group === 'g');

console.log('\n【4】可重複執行、舊文字對不上就不動');
{ const r2 = await B.scanCardFixes(['A', 'B', 'C', 'D', 'E', 'F']); ok('⭐ 改完再掃描＝0 處', Object.values(r2).every(a => a.length === 0)); }
{ const d = mkDocs();
  d.data_g4.weeks.w8.items.vocab[0].cards[0].example = 'The desolate land (Alan 自己改過).';    // Alan 之後自己改了 desolate 的例句
  d.data_g4.weeks.w8.items.vocab[0].cards[4].example = "My own new sentence about adaptation.";     // Alan 自己重寫了 adaptation
  const { db: db2 } = mkDb(d); const C = build(db2); await C.applyCardFixes(['A', 'B']);
  ok('⭐⭐ Alan 自己改過的 desolate／adaptation 例句不會被蓋掉', d.data_g4.weeks.w8.items.vocab[0].cards[0].example === 'The desolate land (Alan 自己改過).' && d.data_g4.weeks.w8.items.vocab[0].cards[4].example === 'My own new sentence about adaptation.');
  ok('同一個文件裡其他對得上的照改（別的單元的 desolate）', d.data_g4.weeks.w8.items.vocab[1].cards[0].example === 'The desolate desert had no trees.'); }
{ const d = mkDocs(); const { db: db3 } = mkDb(d); const E = build(db3); await E.applyCardFixes(['D']);
  ok('只選 D 就只動 D（A 的底線還在）', d.data_g4.weeks.w8.items.vocab[0].cards[0].example.includes('__') && d.data_g4.weeks.w8.items.vocab[0].cards[6].zh === 'n. 蛇頸龍'); }

console.log('\n【5】後台');
ok('只有擁有者看得到「修正單字卡」', /isOwnerUser[\s\S]{0,700}id: 'cardfix'/.test(dash));
ok('套用前先備份（備份寫不進去就不改）、先 confirm', dash.indexOf("alans-english-cardfix-backup-") < dash.indexOf('await window.applyCardFixes') && /window\.confirm\(`要修正這/.test(dash));

console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
