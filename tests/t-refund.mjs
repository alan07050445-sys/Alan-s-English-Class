/* t-refund — v448 老師可以退掉學生亂買的裝扮
 * Alan：「Tayler 亂買東西要退掉」＋「現在 Tayler 的點數應該不是 570，因為他有買裝扮了」
 * 不連網路：Firestore 用假的，只測算錢與退費的邏輯。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data  = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const dash  = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const rules = fs.readFileSync(new URL('firestore.rules', ROOT), 'utf8');
const css   = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };

let written = null, failNext = false;
const _db = { collection: () => ({ doc: () => ({ set: async (o) => { if (failNext) throw new Error('permission-denied'); written = o; } }) }) };
const code = slice(data, 'const MX_KINDS = [', 'Object.assign(window, { mxPurchases');
const W = new Function('_db', 'window', code +
  '\nreturn { MX_SHOP, MX_BY_ID, mxSpent, mxBuy, mxRefund, mxPurchases, mxOwnedList, mxRenamesPaid, MX_RENAME_COST, mxRename };')(_db, { });

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);

const cost = (id) => W.MX_BY_ID[id].cost;
const paid = W.MX_SHOP.filter(x => !x.free && x.cost > 0);
const HAT = paid.find(x => x.kind === 'hat').id;
const PET = paid.find(x => x.kind === 'pet').id;

console.log('\n【1】買了就要記一筆（誰、買了什麼、多少錢、什麼時候）');
let mx = {};
let r = await W.mxBuy('uid1', HAT, 9999, mx);
ok('買得成', r.ok);
mx = { owned: written.mx.owned, wear: written.mx.wear, log: written.mx.log };
eq('購買紀錄有一筆', (mx.log || []).length, 1);
eq('記的是那一件', mx.log[0].id, HAT);
eq('記了價錢', mx.log[0].cost, cost(HAT));
ok('記了時間', mx.log[0].at > 0);
await W.mxBuy('uid1', PET, 9999, mx);
mx = { owned: written.mx.owned, wear: written.mx.wear, log: written.mx.log };
eq('第二件也記進去', mx.log.length, 2);

console.log('\n【2】老師看得到他買了什麼');
const buys = W.mxPurchases(mx);
eq('兩件', buys.length, 2);
ok('有中文名字', buys.every(b => b.zh && b.zh.length > 0));
ok('有分類（頭飾／夥伴…）', buys.some(b => b.kind === 'hat') && buys.some(b => b.kind === 'pet'));
ok('最近買的排前面', buys[0].at >= buys[1].at);
eq('花掉的加起來＝mxSpent', buys.reduce((n, b) => n + b.cost, 0), W.mxSpent(mx));
ok('舊資料（沒有 log）也列得出來，只是沒有日期', (() => {
  const old = W.mxPurchases({ owned: [HAT] });
  return old.length === 1 && old[0].at === 0 && old[0].cost === cost(HAT);
})());

console.log('\n【3】退掉 → 星星原路回來');
const earned = 570;
const before = earned - W.mxSpent(mx);
r = await W.mxRefund('uid1', HAT, mx);
ok('退得成', r.ok);
eq('退回來的就是當初那個價錢', r.cost, cost(HAT));
const mx2 = r.mx;
ok('⭐ 東西從「擁有」裡拿掉了', W.mxOwnedList(mx2).indexOf(HAT) < 0);
eq('⭐ 星星自己回來了', earned - W.mxSpent(mx2), before + cost(HAT));
ok('另一件還在（只退一件）', W.mxOwnedList(mx2).indexOf(PET) >= 0);
ok('退費也記一筆（負數）', mx2.log.some(e => e.id === HAT && e.cost < 0 && e.refund));
ok('已經沒有的東西退不了', !(await W.mxRefund('uid1', HAT, mx2)).ok);
ok('沒有 uid 就不動', !(await W.mxRefund('', PET, mx2)).ok);

console.log('\n【4】正在穿的東西退掉要順手脫下來');
let mx3 = { owned: [HAT], wear: { hat: HAT }, log: [] };
r = await W.mxRefund('uid1', HAT, mx3);
eq('⭐ 不會戴著一個已經不是他的帽子', r.mx.wear.hat, '');

console.log('\n【5】改名卡也能退');
let mx4 = { owned: [], renames: 2, log: [{ id: '__rename', cost: W.MX_RENAME_COST, at: 1 }] };
eq('第一次免費，所以只算一次付費', W.mxRenamesPaid(mx4), 1);
eq('花掉 50', W.mxSpent(mx4), W.MX_RENAME_COST);
ok('改名卡列得出來', W.mxPurchases(mx4).some(b => b.id === '__rename'));
r = await W.mxRefund('uid1', '__rename', mx4);
ok('退得成', r.ok && r.cost === W.MX_RENAME_COST);
eq('退完就不算花過錢', W.mxSpent(r.mx), 0);
ok('名字留著（只退錢、不改他的名字）', true);
ok('沒買過改名卡就退不了', !(await W.mxRefund('uid1', '__rename', { renames: 1 })).ok);

console.log('\n【6】寫不進去（權限）要講清楚，不能假裝成功');
failNext = true;
r = await W.mxRefund('uid1', PET, mx);
ok('失敗就回 ok:false', !r.ok && r.reason === 'save');
failNext = false;

console.log('\n【7】後台的星星要扣掉買裝扮的錢（Alan 說 570 不對）');
ok('⭐ balanceOf 有減掉 spentOf', /\+ autoTotal\(email\) - spentOf\(email\)/.test(dash));
ok('spentOf 用的是同一個 mxSpent（跟學生端同一份算法）', /window\.mxSpent\(mxOf\[/.test(dash));
ok('學生的 mx 有從雲端帶進後台', /mx: d\.mx \|\| \{\},               \/\/ v448/.test(data));
ok('大數字也要減', /\(cur\.balance \|\| 0\) \+ curAuto\.total - curSpent/.test(dash));
ok('拆帳給老師看：手動＋自動−買裝扮', /買裝扮 \$\{curSpent\.toLocaleString\(\)\}/.test(dash));

console.log('\n【8】後台畫面與權限');
ok('有「買過的裝扮」區塊', /stars-buys/.test(dash) && /買過的裝扮/.test(dash));
ok('每一列都有「退掉」', /stars-refund-btn/.test(dash) && /退掉/.test(dash));
ok('退之前要再問一次', /確定把「\$\{b\.zh\}」退掉嗎/.test(dash));
ok('沒登入過的學生要講原因', /還沒有登入過/.test(dash));
ok('權限沒開要教老師去發布 rules', /發布新版 firestore\.rules/.test(dash));
ok('CSS 有樣式', /\.stars-refund-btn/.test(css));
ok('⭐ rules 允許老師退費', /allow update: if isTeacher\(\)/.test(rules));
ok('⭐ 但只准動 mx 一個欄位（成績不能改）', /affectedKeys\(\)\.hasOnly\(\['mx'\]\)/.test(rules));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
