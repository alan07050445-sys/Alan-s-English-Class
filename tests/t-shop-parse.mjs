/* t-shop-parse — 🔴 v472：商店後台「📋 批次貼上蝦皮連結」按下去會爆
 *
 * parseShopLines **從來沒有被寫出來**（v347 加了畫面與 bulkAdd，解析那一段漏掉了），
 * 按「加入商品」就 ReferenceError。畫面照常顯示，所以沒有人看得出來。
 * 是 v472 新的「用了但沒宣告」檢查（tools/jsxcheck.js）撈出來的。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const P = new Function(dash.slice(dash.indexOf('function shopNameFromUrl'), dash.indexOf('function ShopManager'))
  + '\nreturn { parseShopLines, shopNameFromUrl };')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const one = (line) => P.parseShopLines(line).items[0];

console.log('\n【1】畫面上提示的四種貼法都要認得');
const a = one('【日本百樂PILOT】Juice果汁筆 0.5mm $45 https://shopee.tw/aaa-i.1.2');
ok('⭐ 蝦皮分享的整段：名稱／價格／連結都抓出來',
   a && a.price === 45 && a.url === 'https://shopee.tw/aaa-i.1.2' && a.name === '【日本百樂PILOT】Juice果汁筆 0.5mm');
ok('⭐ 「0.5mm」裡的 0.5 不可以被當成價格（所以要優先認 $）', a && a.price === 45);

const b = one('https://shopee.tw/卡皮巴拉玩偶-i.789.012  450');
ok('⭐ 網址＋價格：價格對', b && b.price === 450);
ok('⭐ 沒打名稱就從網址推（-i.789.012 要去掉）', b && b.name === '卡皮巴拉玩偶');

const c = one('卡皮巴拉吊飾  150');
ok('⭐ 沒連結也可以', c && c.name === '卡皮巴拉吊飾' && c.price === 150 && c.url === '');

const d = one('https://shopee.tw/xxx-i.1.2 | 自己打名稱 | 380');
ok('⭐ 用 | 分開：自己打的名稱優先',
   d && d.name === '自己打名稱' && d.price === 380 && d.url === 'https://shopee.tw/xxx-i.1.2');

console.log('\n【2】老師會貼進來的雜訊');
const r = P.parseShopLines('卡皮巴拉吊飾 150\n\n   \n鉛筆盒 $90\n');
ok('空行略過，不會變成空商品', r.items.length === 2 && !r.bad.length);
/* ⚠ 「？？？」對解析器來說就是一個商品名稱，它無從分辨——
   真正看不懂的是「只有價格、沒有名稱也沒有連結」那種行。 */
ok('只有一個數字的行＝看不懂，要回報不是默默吃掉',
   P.parseShopLines('450').bad.length === 1 && P.parseShopLines('450').items.length === 0);
ok('只有 $ 價格也一樣', P.parseShopLines('$45').bad.length === 1);
ok('沒有價格 → price 是 null（bulkAdd 會提醒老師補）',
   one('卡皮巴拉吊飾').price === null && one('卡皮巴拉吊飾').name === '卡皮巴拉吊飾');
ok('價格 0 也當成沒填（星星設 0 沒意義）', one('東西 0') && one('東西 0').price === null);
ok('空字串不會爆', P.parseShopLines('').items.length === 0 && P.parseShopLines(null).items.length === 0);
ok('名稱太長會截掉（後台表格不會被撐爆）',
   one('x'.repeat(200) + ' 100').name.length === 60);

console.log('\n【3】bulkAdd 要的欄位都在（少一個就是另一種當掉）');
const it = one('鉛筆 $20 https://shopee.tw/p-i.1.2');
ok('name / price / url 三個都有', it && 'name' in it && 'price' in it && 'url' in it);
ok('星星＝價格×20（bulkAdd 自己算，這裡只給原價）', it.price === 20);
ok('回傳 { items, bad } 兩個都有',
   (() => { const o = P.parseShopLines('a 1'); return Array.isArray(o.items) && Array.isArray(o.bad); })());

console.log(`\n${fail ? '❌' : '✅'} t-shop-parse：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
