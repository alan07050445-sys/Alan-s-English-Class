/* t-mascot-shop — v431 ④ 吉祥物裝扮：商品表、買賣規則、星星怎麼扣
 * 不連網路：Firestore 用假的，只測程式本身的把關。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const fx   = fs.readFileSync(new URL('components-fx.jsx', ROOT), 'utf8');
const shell= fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };

// 假的 Firestore：記下每一次寫入
const writes = [];
let failNext = false;
const _db = { collection: () => ({ doc: (uid) => ({
  set: async (obj, opt) => { if (failNext) { failNext = false; throw new Error('offline'); } writes.push({ uid, obj, opt }); },
}) }) };
globalThis.window = {};
const code = slice(data, '/* ══════════════════════════════════════════════════════════════════════════\n   v431 ④：吉祥物裝扮', 'function computeCheckin(checkin) {');
const W = new Function('_db', 'window', code + '\nreturn { MX_SHOP, MX_KINDS, mxItemOf, mxOwnedList, mxHasItem, mxSpent, mxWearOf, mxBuy, mxSetWear };')(_db, globalThis.window);

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e) : '')));

log.push('\n【1】商品表本身要乾淨（賣錯東西比沒得賣更糟）');
{
  const ids = W.MX_SHOP.map(i => i.id);
  ok('id 不重複', new Set(ids).size === ids.length);
  const kinds = W.MX_KINDS.map(k => k.kind);
  ok('每一件都屬於五大類之一', W.MX_SHOP.every(i => kinds.indexOf(i.kind) >= 0));
  ok('五大類都有東西可以買', kinds.every(k => W.MX_SHOP.some(i => i.kind === k && !i.free)));
  ok('每一件都有中文名字與圖示', W.MX_SHOP.every(i => i.zh && i.emoji));
  ok('要錢的都 > 0、免費的剛好是「彩帶」與「原音」',
     W.MX_SHOP.every(i => (i.free ? i.cost === 0 : i.cost > 0)) &&
     W.MX_SHOP.filter(i => i.free).map(i => i.id).join() === 'fx_confetti,vo_default');
  ok('特效與語音一定各有一個免費的（不然答對就沒反應、也不會講話）',
     ['fx', 'voice'].every(k => W.MX_SHOP.some(i => i.kind === k && i.free)));
  ok('最便宜的 100 顆、最貴的不超過 1000（小朋友存得到）',
     Math.min(...W.MX_SHOP.filter(i => !i.free).map(i => i.cost)) <= 150 &&
     Math.max(...W.MX_SHOP.map(i => i.cost)) <= 1000);
  ok('舊的兩頂帽子還在，而且對得回老師扣過點的名字',
     W.mxItemOf('hat_party').legacy === 'party' && W.mxItemOf('hat_crown').legacy === 'crown');
  ok('每一件都畫得出來（頭飾在 MX_HAT_ART、配件在 MX_ACC_ART、動作有動畫）',
     W.MX_SHOP.filter(i => i.kind === 'hat').every(i => fx.indexOf(i.id + ':') > 0) &&
     W.MX_SHOP.filter(i => i.kind === 'item').every(i => fx.indexOf(i.id + ':') > 0) &&
     W.MX_SHOP.filter(i => i.kind === 'dance').every(i => fx.indexOf(i.id + ':') > 0));
}

log.push('\n【2】買到什麼、花了多少（星星一定要算得剛剛好）');
{
  globalThis.window.__mxHats = [];
  ok('看不懂的 id 一律忽略（將來下架也不會算錯）', W.mxOwnedList({ owned: ['hat_cap', 'ghost', 'hat_cap'] }).join() === 'hat_cap');
  ok('花掉的星星＝買到的東西的價錢總和', W.mxSpent({ owned: ['hat_cap', 'it_scarf'] }) === 150 + 200);
  ok('⭐ 花掉的是「反算」出來的，不是存的數字（存數字＝可以改）', /mxSpent\(mx\) \{[\s\S]{0,200}reduce/.test(data));
  ok('免費的不用買就有', W.mxHasItem({}, 'fx_confetti') && W.mxHasItem({}, 'vo_default'));
  ok('沒買的就是沒有', !W.mxHasItem({ owned: [] }, 'hat_crown'));
  globalThis.window.__mxHats = ['crown'];
  ok('⭐ 以前老師扣點買的皇冠仍然算擁有（不會要小朋友再買一次）', W.mxHasItem({ owned: [] }, 'hat_crown'));
  ok('而且那頂不算在「花掉的星星」裡（老師已經扣過了）', W.mxSpent({ owned: [] }) === 0);
  globalThis.window.__mxHats = [];
}

log.push('\n【3】身上穿什麼');
{
  const mx = { owned: ['hat_cap'], wear: { hat: 'hat_cap', item: 'it_cape', fx: 'fx_stars' } };
  const w = W.mxWearOf(mx);
  ok('沒買到的披風不會穿在身上（資料怪怪的也不會壞掉）', w.item === '');
  ok('買到的帽子照戴', w.hat === 'hat_cap');
  ok('沒買的特效退回預設的彩帶', w.fx === 'fx_confetti');
  ok('語音沒設就是原音', w.voice === 'vo_default');
  ok('把帽子放到配件欄這種亂資料會被擋掉', W.mxWearOf({ owned: ['hat_cap'], wear: { item: 'hat_cap' } }).item === '');
}

log.push('\n【4】買東西的把關');
{
  const mx = { owned: ['hat_cap'], wear: {} };
  ok('沒登入不能買', (await W.mxBuy('', 'hat_crown', 9999, mx)).reason === 'no-user');
  ok('亂七八糟的 id 不能買', (await W.mxBuy('u1', 'nope', 9999, mx)).reason === 'bad-id');
  ok('免費的不用買（也不會白扣星星）', (await W.mxBuy('u1', 'fx_confetti', 9999, mx)).reason === 'bad-id');
  ok('⭐ 已經買過的不會再買一次（不會重複扣星星）', (await W.mxBuy('u1', 'hat_cap', 9999, mx)).reason === 'owned');
  const poor = await W.mxBuy('u1', 'hat_crown', 100, mx);
  ok('⭐ 星星不夠不能買，而且會說還差幾顆', poor.reason === 'poor' && poor.short === 500, JSON.stringify(poor));
  writes.length = 0;
  const good = await W.mxBuy('u1', 'hat_crown', 600, mx);
  ok('星星剛好夠 → 買得到', good.ok && good.owned.join() === 'hat_cap,hat_crown');
  ok('⭐ 寫進學生自己的 progress/{uid}（stars 是老師才寫得了的，見 firestore.rules）',
     writes.length === 1 && writes[0].uid === 'u1' && !!writes[0].obj.mx && writes[0].opt.merge === true);
  failNext = true;
  ok('存不進去（離線）→ 回報失敗，不會假裝買到', (await W.mxBuy('u1', 'it_bow', 9999, mx)).reason === 'save');
}

log.push('\n【5】換裝的把關');
{
  const mx = { owned: ['hat_cap'], wear: { hat: 'hat_cap' } };
  ok('沒買的不能穿', (await W.mxSetWear('u1', 'item', 'it_cape', mx)).reason === 'bad-id');
  ok('分類放錯不能穿', (await W.mxSetWear('u1', 'hat', 'it_scarf', mx)).reason === 'bad-id');
  writes.length = 0;
  const off = await W.mxSetWear('u1', 'hat', '', mx);
  ok('脫下來（空字串）可以', off.ok && off.wear.hat === '');
  ok('換裝只動 wear，買到的東西不會被蓋掉', writes[0].obj.mx.owned.join() === 'hat_cap');
  ok('沒登入不能換', (await W.mxSetWear('', 'hat', 'hat_cap', mx)).reason === 'no-user');
}

log.push('\n【6】三個地方的星星要用同一個算法');
{
  ok('header 的星星有扣掉裝扮（app.jsx）', /mxSpentStars/.test(app) && /starBalance \+ autoStarTotal - mxSpentStars/.test(app));
  ok('集點面板的餘額也扣掉（components-shell.jsx）', /auto\.total - spent/.test(shell));
  ok('兩邊都是呼叫 data.js 的 mxSpent，不是各算各的', /window\.mxSpent/.test(app) && /window\.mxSpent/.test(shell));
  ok('吉祥物那一層只透過 window.__mxBuy／__mxWear 寫資料（uid 與星星都在 app.jsx）',
     /window\.__mxBuy/.test(fx) && /window\.__mxWear/.test(fx) && fx.indexOf('_db.collection') < 0);
  ok('商店與長按選單都進得了裝扮室', /mxOpenDress/.test(app) && /mxOpenDress/.test(fx) && /onOpenDress/.test(shell));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
