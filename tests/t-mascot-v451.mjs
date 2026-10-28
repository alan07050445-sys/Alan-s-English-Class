/* t-mascot-v451 — 語音包更多元、集點紀錄含購買、免費的只剩走路
 * Alan：① 語音要更明顯、整包更多元 ② 集點紀錄也要含扣點與買了什麼
 *       ③ 預設吉祥物不要免費轉圈圈，只會一般走路（不然小朋友就不買動作了） */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data  = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const fx    = fs.readFileSync(new URL('components-fx.jsx', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const dash  = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };
const W = new Function('_db', 'window',
  slice(data, 'const MX_KINDS = [', 'Object.assign(window, { mxPurchases') +
  '\nreturn { MX_SHOP, MX_BY_ID, mxStarRows, mxSpent, MX_RENAME_COST };')(
  { collection: () => ({ doc: () => ({ set: async () => {} }) }) }, {});
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);

/* 🔴 v505（Alan：「把特效跟語音都刪掉，沒有用的功能」）
   這一段本來守的是 v451「八包語音、八種場合都寫滿」。整組下架之後，
   改成守「真的拿乾淨了」——留一半在那裡的話，下次有人看到 mxLine 的第三個參數
   還會以為語音包還活著。 */
console.log('\n【1】語音包與答對特效已經整組下架');
ok('⭐ 商品表裡沒有 voice／fx 了', !W.MX_SHOP.some(x => x.kind === 'voice' || x.kind === 'fx'));
ok('⭐ 台詞表 MX_VOICE 整份拿掉（不是只把商品藏起來）', !/MX_VOICE/.test(fx));
ok('⭐ mxLine 不再吃「哪一包語音」這個參數', /const mxLine = \(k, pet\) => mxPick\(k, pet\);/.test(fx));
ok('   沒有任何呼叫端還在傳語音包進去', !/mxLine\([^()]*,[^()]*,/.test(fx));
ok('⭐ 答對特效的字元表 FX_CHARS 也拿掉了', !/FX_CHARS/.test(fx));
ok('   吉祥物還是會講話（退回牠自己的台詞）', /mxPick\(k, pet\)/.test(fx) && /const MX_LINES = \{/.test(fx));
ok('   答對還是會灑彩帶（只是不能換成星星雨了）', /function ConfettiBurst\(/.test(fx) && /fx-confetti/.test(fx));
ok('⭐ 身上穿的只剩頭飾與配件', /\['hat', 'item'(?:, 'costume')?\]\.forEach/.test(data));

console.log('\n【2】免費的只剩走路，把戲要用買的');
ok('⭐ 共用動作池只剩 walk', /const MX_ACTS = \['walk'\];/.test(fx));
const acts = [...fx.matchAll(/acts: \[([^\]]+)\]/g)].map(m => m[1].replace(/'/g, '').split(',').map(x => x.trim()));
ok('⭐ 沒有任何一隻還有免費的跳／轉圈／跳舞／翻滾',
  acts.every(a => !a.some(x => ['jump', 'spin', 'dance', 'roll'].indexOf(x) >= 0)));
ok('每一隻都還是會走路', acts.every(a => a.indexOf('walk') >= 0));
ok('招牌動作留著（打電腦／看書／衝刺／裝石頭／長高）',
  ['type', 'read', 'dash', 'hide', 'grow'].every(sig => acts.some(a => a.indexOf(sig) >= 0)));
ok('⭐ 買到的動作會自己加進池子裡', /\.concat\(bought\)/.test(fx) && /ownedActsRef/.test(fx));
/* v457（Alan：「按下兔子他只說了話卻沒跳起來」）：點一下改成「一定會表演」——
   招牌動作與買到的動作一起抽（招牌權重 2）；兩者都沒有才點頭。 */
ok('點一下一定會表演（招牌＋買到的動作一起抽）',
  /const picks = \(sigOk \? \[pet\.sig, pet\.sig\] : \[\]\)\.concat\(reduce\.current \? \[\] : boughtActs\)/.test(fx));
ok('招牌與買來的動作都沒有才點頭', /const t = reduce\.current \? 'think' : 'nod';/.test(fx));
ok('買來的動作也有停留時間（不會一閃而過）', /wave: 1600, twirl: 1500, party: 2800, flip: 1100, moon: 2800/.test(fx));
ok('⚠ ownedActsRef 的 effect 排在 owned 宣告之後（不然整隻吉祥物會壞掉）',
  fx.indexOf('const [owned, setOwned]') < fx.indexOf('const ownedActsRef'));

console.log('\n【3】集點紀錄要看得到「買了什麼」');
const HAT = W.MX_SHOP.find(x => x.kind === 'hat' && !x.free && x.cost).id;
const zhOf = (id) => W.MX_BY_ID[id].zh;
const mx = { owned: [HAT], renames: 2,
  log: [{ id: HAT, cost: W.MX_BY_ID[HAT].cost, at: Date.UTC(2026, 8, 14) },
        { id: '__rename', cost: W.MX_RENAME_COST, at: Date.UTC(2026, 8, 15) },
        { id: 'fx_star', cost: -200, at: Date.UTC(2026, 8, 16), refund: true }] };
const rows = W.mxStarRows(mx);
eq('三筆都列出來', rows.length, 3);
ok('⭐ 買東西記成負數', rows.filter(r => /買了/.test(r.note)).every(r => r.amount < 0));
ok('買的那筆寫得出是什麼', rows.some(r => r.note.indexOf(zhOf(HAT)) > 0));
ok('改名卡也列出來', rows.some(r => /改名卡/.test(r.note) && r.amount === -W.MX_RENAME_COST));
ok('⭐ 老師退掉的是正數、而且寫「老師把…退掉了」', rows.some(r => r.amount === 200 && /老師把/.test(r.note)));
ok('每一筆都有日期', rows.filter(r => r.date).length === 3);
ok('看得出是裝扮那一類（mx 旗標）', rows.every(r => r.mx));
const old = W.mxStarRows({ owned: [HAT] });     // v448 以前買的，沒有 log
eq('舊資料也列得出來', old.length, 1);
eq('只是沒有日期', old[0].date, '');
eq('沒買過就沒有紀錄', W.mxStarRows({}).length, 0);
ok('⭐ 買了又被退掉的東西不會重複列一筆（owned 已經沒有它）',
  W.mxStarRows({ owned: [], log: [{ id: HAT, cost: 100, at: 1 }, { id: HAT, cost: -100, at: 2, refund: true }] }).length === 2);

console.log('\n【4】兩邊畫面都要接上');
ok('學生端把三種紀錄併在一起', /\[\.\.\.data\.entries, \.\.\.auto\.entries, \.\.\.mxRows\]/.test(shell));
ok('學生端最上面有「賺到／花掉／現在有」', /sp-sum/.test(shell) && /現在有/.test(shell));
ok('老師端也併進同一張清單', /const mxRows = window\.mxStarRows \? window\.mxStarRows\(curMx\)/.test(dash));
ok('老師端買的那幾筆不給刪（要退請按「退掉」）', /學生自己買的/.test(dash));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
